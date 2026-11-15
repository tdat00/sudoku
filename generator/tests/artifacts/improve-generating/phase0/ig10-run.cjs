'use strict';

/*
 * IG-S10 glue for run.cjs: the one reconciliation shard. `runAnalysis` runs inside the supplied low-priority wrapper (the
 * dispatcher launches it like every other shard), runs the synthetic reporting and gate tests, reads the accepted evidence
 * of IG-S01 to IG-S09 and writes the round-level documents: coverage.json, budget-summary.json, gate.json,
 * frozen-rerun-plan.json, report.json and report.md. No engine is loaded, no worker is started, no puzzle is generated, no
 * production file is read for execution. Everything is provisional (pre-freeze); the real gate stays not-evaluable-pre-freeze.
 *
 *   node ig10-run.cjs --dry-run            builds everything in memory and prints a digest (no engine, nothing written)
 *   node ig10-run.cjs --dry-run --out=<dir> writes the documents under <dir> (inside the harness folder) for inspection
 *
 * Frozen closure (round frozen-gate): validates both receipts first, then reads the frozen IG-S05 grid records (and the IG-S06
 * request records when they exist), evaluates the frozen gate with gate.cjs (inputs, never a go or no-go) and writes gate.json,
 * coverage.json and budget-summary.json of the frozen round.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const L = require('./loader.cjs');
const RUN = require('./run.cjs');
const G = require('./gate.cjs');
const S = require('./ig05-stats.cjs');
const RC = require('./reconcile.cjs');
const RP = require('./reconcile-report.cjs');
const RB = require('./reconcile-build.cjs');
const FP = require('./frozen-plan.cjs');
const RR = require('./reconcile-render.cjs');
const ER = require('./reconcile-errata.cjs');
const PLAN = require('./plans/ig-s10.cjs');

const HarnessError = C.HarnessError;
const TASK = 'IG-S10';
const OUTPUTS = Object.freeze(['coverage.json', 'budget-summary.json', 'gate.json', 'frozen-rerun-plan.json', 'report.json', 'report.md']);

const VERDICT_RULES = 'Verdict rules (r2; no invented numeric threshold): a "Today" anchor and an SM1 share are shown with their ' +
  'DESCRIPTIVE difference to the report and carry no verdict. An S5a factor follows the IG-S02 rule (accepted by the pack author) ' +
  'against the report\'s planning range: **supported** when the median ready-wall speed-up reaches the low end of the range, ' +
  '**inconclusive** when it does not but at least one pair does, and when no pair reaches it the label is "planning-factor estimate ' +
  'refuted on these pairs" (this does not refute the usefulness of the measured improvement). Partial S3 had no assigned gain ' +
  'forecast: its result is "no material net gain demonstrated" (the median of the paired incremental ratios) and the full-S3 ' +
  'forecast is **untested/inconclusive**. A first-phase or all-phase estimate whose components are not all implemented is ' +
  '**inconclusive**, never decided by a partial implementation. Verdicts concern the IMPLEMENTED scope of each prototype on this ' +
  'pre-MS07 catalogue; n = 3 (or 8 clusters) is descriptive.';

function latestCommandOf(task, evidenceRoot) {
  const got = RC.collectTask(evidenceRoot, RC.ROUND, task);
  const cmds = [];
  got.shards.forEach(function (s) { s.commands.forEach(function (c) { cmds.push(c); }); });
  return { got: got, commands: cmds };
}

function mergedRecords(got) {
  const out = [];
  got.shards.forEach(function (s) { out.push.apply(out, s.records); });
  return out;
}

function s3Section(ctx) {
  const sum3 = ctx.evidence.s03Summary.doc;
  const cov = ctx.evidence.s03Coverage.doc;
  const perSet = RC.get(sum3, 'parity.perSet') || {};
  const setText = Object.keys(perSet).map(function (k) {
    const s = perSet[k];
    return k + ': ' + s.puzzles + ' puzzles, unlimited runs equal ' + s.unlimitedEqual + ', ' + s.checks + ' checks audited, ' +
      s.failuresEqual + ' of ' + s.failuresTested + ' injected failures equal';
  }).join('; ');
  return {
    scope: 'PARTIAL S3 (naked/hidden singles and the six naked/hidden pair/triple/quad finders; ' + cov.nativeFullScan.length +
      ' other techniques stay native full scans: ' + cov.nativeFullScan.map(function (x) { return x.id || x; }).join(', ') + '). ' +
      'Implemented finder coverage: ' + cov.implemented.join(', ') + '.',
    finders: cov.families.map(function (f) {
      return { id: f.id, status: f.status, skippedAudit: RC.get(f, 'audit.skippedScopes'),
        virtualNodeChecksAudit: RC.get(f, 'audit.virtualNodeChecks') };
    }),
    nativeFullScan: cov.nativeFullScan.length,
    parity: 'Parity: ' + RC.get(sum3, 'parity.verdicts.ok') + ' of 18 saved puzzles parity-ok (' + RC.get(sum3, 'parity.verdicts.failed') +
      ' failed) in four solver sets (' + setText + '); synthetic cadence states ' + RC.get(sum3, 'parity.synthetic.verdict') + ' (' +
      RC.get(sum3, 'parity.synthetic.coverage.scenarios') + ' scenarios, ' + RC.get(sum3, 'parity.synthetic.coverage.crossingScopes') +
      ' scopes crossing the cadence); four deliberate mutations detected; scope audit violations 0; request identity 24 of 24 digest-equal ' +
      'to IG-S02; SM4 sufficient for these families on this runtime, not a certification of the frozen source; multi-check skipped scopes ' +
      'are covered by engine-free tests only.'
  };
}

function descriptiveInputs(sm2) {
  const out = {};
  sm2.cells.forEach(function (c) {
    const hits = {};
    c.modes.forEach(function (m) { hits[m.mode] = m.verifiedHits; });
    out[c.cell] = { clusters: 8, modesWithAllTrials: c.modes.filter(function (m) { return m.trials === 8; }).length,
      verifiedHitsByMode: hits, ratesPerCpuAndWallSecond: 'all zero', paired: 'all intervals degenerate [0, 0]',
      selection: c.selection };
  });
  return out;
}

/**
 * Everything of the provisional round in memory: the documents, their rendered report and the problems found. `tests`
 * carries the results of the synthetic cases run in the same command; `firewall` the production-firewall summary.
 */
function buildAll(opts) {
  const repoRoot = opts.repoRoot || C.DEFAULT_REPO_ROOT;
  const evidenceRoot = opts.evidenceRoot || RUN.evidenceRootOf(repoRoot);
  const sfx = opts.suffix || '';
  const revision = opts.revision || null;
  const docName = function (base) { return base + sfx + '.json'; };
  const roundDir = path.join(evidenceRoot, RC.ROUND);
  const evidence = RC.loadEvidence(roundDir);
  const set = L.loadSourceSet({ repoRoot: repoRoot });
  const harness = opts.harnessFingerprint || C.harnessFingerprint().fingerprint;
  const coverage = RC.buildCoverage({ repoRoot: repoRoot, evidenceRoot: evidenceRoot, evidence: evidence,
    runtimeFingerprint: set.fingerprint });
  const budget = RC.buildBudgetSummary({ evidenceRoot: evidenceRoot });

  // raw records of the rows the report recomputes
  const g02 = RC.collectTask(evidenceRoot, RC.ROUND, 'IG-S02');
  const overlay = RC.applyKillerOverlay(repoRoot, evidenceRoot, mergedRecords(g02));
  const g03 = RC.collectTask(evidenceRoot, RC.ROUND, 'IG-S03');
  const g05 = RC.collectTask(evidenceRoot, RC.ROUND, 'IG-S05');
  const g09 = RC.collectTask(evidenceRoot, RC.ROUND, 'IG-S09');
  const s05cmd = latestCommandOf('IG-S05', evidenceRoot);
  const lastCmd = s05cmd.commands[s05cmd.commands.length - 1];
  const snap = lastCmd.catalogueSnapshot;
  const catalogue = { fingerprint: lastCmd.catalogueFingerprint, ratingVersion: snap.ratingVersion, variants: snap.variants.length,
    techniques: Object.keys(snap.weights).length };
  const quantumMs = lastCmd.cpu && typeof lastCmd.cpu.quantumMs === 'number' ? lastCmd.cpu.quantumMs : null;
  const checks = RP.newChecks();
  const ctx = { repoRoot: repoRoot, evidence: evidence, checks: checks, quantumMs: quantumMs, coverage: coverage,
    s02Records: overlay.records, s03Records: mergedRecords(g03), s05Records: mergedRecords(g05), s09Records: mergedRecords(g09),
    runtimeFingerprint: set.fingerprint, runtimeFileCount: L.describeSourceSet(set).files.length, catalogue: catalogue,
    harnessAtRun: harness, set: set };
  ctx.headline = RP.headlineCells(ctx);
  ctx.sm2 = RP.sm2Section(ctx);
  ctx.sm1 = RP.sm1Section(ctx);
  ctx.sm3 = RP.sm3Section(ctx);
  ctx.gt = RP.gtSection(ctx);
  ctx.s3 = s3Section(ctx);

  const frozenPlan = FP.buildFrozenPlan({ repoRoot: repoRoot, set: set, coverage: coverage, evidence: evidence, budget: budget,
    headline: ctx.headline, sm2: ctx.sm2, sm1: ctx.sm1, runtimeFingerprint: set.fingerprint });
  const gate = G.provisionalGate({ round: RC.ROUND, runtimeFingerprint: set.fingerprint, catalogueFingerprint: catalogue.fingerprint });
  gate.schema = G.SCHEMA;
  gate.task = TASK;
  gate.descriptiveInputs = descriptiveInputs(ctx.sm2);
  gate.coverageOfTheInputs = { sm2: 'eight grid clusters per cell, all eight modes, 256 trials, 0 verified hits in every mode; descriptive only',
    requests: 'no full-request evidence: IG-S06 deferred (sample-only evidence cannot establish a request-level qualification)',
    headline: 'three paired seeds per cell: the on-time lower bound cannot exceed 0.368 (not a gate input)' };
  gate.provisionalNotice = RC.NOTE_PROVISIONAL;
  gate.zeroBaselineFeasibility = 'projection-awaits-author-review';
  gate.syntheticTests = opts.tests ? { passed: opts.tests.gate.passed, total: opts.tests.gate.total, note: 'synthetic 40-cluster ' +
    'fixtures only; not a real frozen decision' } : null;

  const tests = opts.tests || { reconcile: { passed: 0, total: 0 }, gate: { passed: 0, total: 0 }, results: [] };
  const crossBad = checks.list.filter(function (c) { return !c.ok; });
  const problems = coverage.problems.slice();
  crossBad.forEach(function (c) { problems.push('cross-check: ' + c.id); });
  const sourceSummary = 'every command of the nine tasks reports sourceStable and firewallClean; the runtime fingerprint loaded now equals the ' +
    'one every measurement command recorded' + (opts.firewall ? '; ' + opts.firewall : '');

  const report = {
    schema: 'ig-s-report/1', task: TASK, round: RC.ROUND, evidenceStatus: C.EVIDENCE_PROVISIONAL, provisionalNotice: RC.NOTE_PROVISIONAL,
    formalGate: gate.state, preMs07: true, verdictRules: VERDICT_RULES,
    provenance: RB.provenance({ evidence: evidence, coverage: coverage, runtimeFingerprint: set.fingerprint,
      runtimeFileCount: ctx.runtimeFileCount, catalogue: catalogue, harnessAtRun: harness }),
    sourceChecks: { summary: sourceSummary, firewall: opts.firewall || null },
    coverage: { summary: coverage.summary, tasks: coverage.tasks, deferred: coverage.deferred, auxiliaryCommands: coverage.auxiliaryCommands,
      ownCommands: coverage.ownCommands, excludedObservations: coverage.excludedObservations, problems: coverage.problems },
    headline: ctx.headline, s3: ctx.s3, sm2: ctx.sm2, sm1: ctx.sm1, sm3: ctx.sm3, gt: ctx.gt,
    composition: { status: 'deferred', lines: [
      'IG-S06 (held-out requests 201/202, N1/CA4/CQ1/CQ4, the ordered quota protocol) is DEFERRED for this pre-freeze round: not implemented, ' +
        'not run, no records. It is neither passed nor refuted.',
      'Why: IG-S05 found 0 verified exact hits in every mode (native controls included) on eight grid clusters per cell; F1 is an ' +
        'explicitly non-winning diagnostic default (selection.json), not a selected strategy to compose; the catalogue, floors and ' +
        'search may change when difficulty-v3 freezes (MS07).',
      'Unmeasured as a result: the full-request composition of S1/S2 with S5b; the frontier request cost; local-origin hits of the ' +
        'frontier; the quota protocol; large-board CQ1 equality.',
      'The 24-minute allocation was not run and is not an automatic transfer or a spending target; the 180-minute ceiling and ' +
        'difficulty-v3 priority stay.',
      'Proposal: implement and run IG-S06 only after the frozen IG-S05 review by the plan author (Fable) and the pack author (Astra) ' +
        'and after a separate budget approval (the frozen-rerun plan, section ig06: populations, formula and planning scenarios).'] },
    gate: { state: gate.state, formalGateEnabled: gate.formalGateEnabled, formalVerdict: gate.formalVerdict, projection: gate.projection,
      decisionOwner: gate.decisionOwner, reasons: gate.reasons, descriptiveInputs: gate.descriptiveInputs, reference: docName('gate') },
    machine: Object.assign(RB.machineBlock(budget), { reference: docName('budget-summary') }),
    frozen: null,
    decisions: RP.decisionsForAuthor(ctx),
    errata: opts.errata === false ? null : ER.locateErrata(repoRoot),
    staleness: ER.staleness(),
    withdrawnPremises: null,
    crossChecks: checks.list,
    tests: { reconcile: tests.reconcile, gate: tests.gate, cases: tests.results },
    deviations: [],
    acceptance: [],
    outputs: []
  };
  report.estimateTable = RB.estimateTable(ctx);
  report.withdrawnPremises = {
    status: 'withdrawn as representative costing and speed-up premises',
    premises: ['the plan\'s "about 1,296 solves per sample for every board" (G x B(N), plan.md:67)', 'the plan\'s "10x fewer solves per sample" from S1 ' +
      '(plan.md:98) and the 10 / 2 / 3 factors of the mega16 projection (plan.md:350)'],
    observed: ctx.sm1.solvesPerOrdinarySample,
    boundReading: 'A lower observed count does not refute a mathematical upper bound: G x B(N) may be kept only as a separately justified loose bound, not ' +
      'as typical work and not as an empirical 10x prediction.',
    passages: (report.errata ? report.errata.find(function (e) { return e.id === 'E6'; }).passages : [])
  };
  report.frozen = frozenBlock(frozenPlan);
  report.frozen.reference = docName('frozen-rerun-plan');
  report.deviations = revision ? [
    'Revision ' + revision.id + ' (after r1 and r2): the r1 command ran through the supplied low-priority wrapper once (one analysis shard, ledger ' +
      'entry 71); the r2 and ' + revision.id + ' documents were written by unwrapped, read-only aggregations (`ig10-run.cjs --write-r2`, `--write-' +
      revision.id + '`: no engine, no worker, no generation, no wrapper, no second wrapped command, local CPU only, not charged). The pure tests, ' +
      'the source-only dry runs and -PlanOnly ran directly during development and are disclosed in ' + docName('budget-summary') + '.',
    'The r1 and r2 documents stay unchanged beside the ' + revision.id + ' ones (hashes in `revision.supersedes`). Three identities are kept ' +
      'apart: the wrapped r1 command\'s harness fingerprint, the ' + revision.id + ' writer\'s harness fingerprint (the corrected ' +
      'reporting code; not engine-run, there is nothing to run) and the measurement fingerprints of the nine tasks.',
    'Revision ' + revision.id + ' applies the pack author\'s report-only rulings (errata table, section 0): no measured record, coverage figure, ' +
      'accounting figure or gate state changed; statistic labels, wording, three new rows (the isolated S2 comparison and two unmeasured ' +
      'measurements), the frozen-rerun prerequisites and the staleness section did.',
    docName('budget-summary') + ' includes IG-S10\'s own wrapped charge (ledger entry 71, occupied time plus 45 s grace) and the 0.470 s ' +
      'IG-S07 pre-check debit, once, without admission grace, listed apart from the wrapped command counts (as in r2).',
    'No numeric verdict threshold is used (the r1 thresholds were the report writer\'s and are removed); the pack names none.',
    'IG-S02 Killer rows are counted as completed by the hash-linked audit overlay; the stored records stay `error` and the harness shard ' +
      'status stays `failed` (historical).',
    'IG-S09 recorded `counts.dfsEntries` are countSolutions calls (erratum applied everywhere in this report); node entries are not instrumented.',
    'The frozen closure (round frozen-gate) is implemented and tested on synthetic inputs only: no frozen evidence exists, so its readers have ' +
      'never run on real frozen records. It rejects a claimed-exact request whose verification failed and non-distinct seed populations.',
    'The corrections after the measurements (IG-S04 98016f2c, IG-S05 f297ca31, IG-S07 r2, IG-S08 r3, IG-S09 r2 and the F2 follow-up) were not ' +
      'engine-rerun; their report-writer and corrected-harness fingerprints are listed beside the measurement fingerprints.'
  ] : [
    'The commands of this task ran through the supplied low-priority wrapper once (one analysis shard); the pure tests, the source-only ' +
      'dry runs and -PlanOnly ran directly during development (no engine, no worker, no generation) and are disclosed in budget-summary.json.',
    'budget-summary.json is written while the command runs: IG-S10\'s own charge (occupied time plus 45 s, allocation 240 s) is entered ' +
      'in ledger.json by the dispatcher afterwards and is therefore not in its totals.',
    'No numeric verdict threshold is used; the pack names none.',
    'IG-S02 Killer rows are counted as completed by the hash-linked audit overlay; the stored records stay `error` and the harness shard ' +
      'status stays `failed` (historical).',
    'IG-S09 recorded `counts.dfsEntries` are countSolutions calls (erratum applied everywhere in this report); node entries are not instrumented.',
    'The frozen closure (round frozen-gate) is implemented and tested on synthetic inputs only: no frozen evidence exists, so its readers have ' +
      'never run on real frozen records.',
    'The corrections after the measurements (IG-S04 98016f2c, IG-S05 f297ca31, IG-S07 r2, IG-S08 r3, IG-S09 r2 and the F2 follow-up) were not ' +
      'engine-rerun; their report-writer and corrected-harness fingerprints are listed beside the measurement fingerprints.'
  ];
  report.acceptance = acceptanceOf(report, coverage, gate, frozenPlan, tests, problems);

  // the other documents first: the report carries their hashes
  if (revision) {
    [coverage, budget, gate, frozenPlan, report].forEach(function (d) { d.revision = revision; });
  }
  const docs = {};
  docs[docName('coverage')] = coverage;
  docs[docName('budget-summary')] = budget;
  docs[docName('gate')] = gate;
  docs[docName('frozen-rerun-plan')] = frozenPlan;
  Object.keys(docs).forEach(function (name) {
    report.outputs.push({ file: name, sha256: C.sha256(C.jsonText(docs[name])) });
  });
  const markdown = RR.renderReport(report);
  report.outputs.push({ file: 'report' + sfx + '.md', sha256: C.sha256(markdown), note: 'rendered from ' + docName('report') +
    ' (without this outputs list)' });
  return { report: report, coverage: coverage, budget: budget, gate: gate, frozenPlan: frozenPlan, markdown: markdown, problems: problems,
    checks: checks.list };
}

function frozenBlock(plan) {
  const sec = function (ms) { return Math.round(ms / 1000); };
  return {
    status: plan.status,
    exampleCommand: FP.commandOf('IG-S0N', false),
    steps: plan.steps.map(function (s) {
      const pj = s.projection || {};
      const upper = pj.admissionPlanChargedMs !== undefined ? pj.admissionPlanChargedMs : pj.guardScenarioChargedMs;
      const upperCommands = pj.commandsAdmissionPlan !== undefined ? pj.commandsAdmissionPlan : pj.commandsGuardScenario;
      return { order: s.order, task: s.task, dependsOn: s.dependsOn, population: s.population,
        frozenKeys: s.frozenManifest ? s.frozenManifest.jobs + ' keys, ' + s.frozenManifest.shards + ' shard(s)' : 'not implemented',
        firstRound: pj.firstRoundChargedMs === null || pj.firstRoundChargedMs === undefined ? 'n/a' : sec(pj.firstRoundChargedMs),
        charged: pj.lowChargedMs !== undefined ? sec(pj.lowChargedMs) + ' - ' + sec(upper) : 'n/a',
        commands: pj.commandsLow !== undefined ? pj.commandsLow + ' - ' + upperCommands : 'n/a' };
    }),
    totals: { low: plan.totals.frozenTasksWithAHarnessLowChargedMs, admissionPlan: plan.totals.frozenTasksWithAHarnessAdmissionPlanChargedMs,
      reading: 'low: measured occupied time scaled plus the minimum grace; admission plan: the dispatcher\'s admission estimates plus ' +
        'grace, a planning figure and NOT a guaranteed upper bound' },
    ig06: { low: plan.ig06.projection.chargedMs.low, central: plan.ig06.projection.chargedMs.central,
      guardScenario: plan.ig06.projection.chargedMs.guardScenario, commands: plan.ig06.projection.commands,
      commandsByPhase: { low: plan.ig06.projection.scenarios.low.commands, central: plan.ig06.projection.scenarios.central.commands },
      label: plan.ig06.projection.label,
      proposal: plan.ig06.proposal.implementWhen + ' ' + plan.ig06.proposal.conditionalOnFrozenScreen },
    extensions: { combined: plan.extensions.combinedChargedMs, combinedBand: plan.extensions.combinedScenarioBandMs,
      minimumCommandsCentral: plan.extensions.minimumCommandsCentral, rows: plan.extensions.cells.map(function (e) {
        const sc = e.projection.scenarios;
        return { cell: e.cell, proxy: e.proxy, proxyScale: e.proxyScale, proxyStatistics: e.proxyStatistics, chargedMs: e.projection.chargedMs,
          band: { low: e.projection.scenarioBand.lowChargedMs, high: e.projection.scenarioBand.highChargedMs },
          commands: { low: sc.low.commands, central: sc.central.commands, high: sc.high.commands },
          commandsByPhase: e.projection.commandsByPhase };
      }) },
    prerequisites: plan.prerequisites, gaps: plan.gaps,
    approvals: plan.approvalsNeeded, reference: 'frozen-rerun-plan.json'
  };
}

function acceptanceOf(report, coverage, gate, plan, tests, problems) {
  const rowsOk = report.estimateTable.length === 16 && report.estimateTable.every(function (r) { return r.verdict && r.scope; });
  const t = tests;
  const pass = function (b) { return b ? 'pass' : 'FAIL'; };
  return [
    { id: 'B01', status: pass(rowsOk), evidence: 'the report, section 3: 16 rows (the check-list\'s 13, the isolated S2 comparison and the two unmeasured rows), each with a verdict and an explicit scope (measured, partial or named unanswered: IG-S06 composition, SM5 sweep, restricted-floor probes)' },
    { id: 'B02', status: pass(gate.state === 'not-evaluable-pre-freeze' && gate.formalGateEnabled === false), evidence: 'the gate document: state ' + gate.state +
      '; formalVerdict null; no production, default or offer change' },
    { id: 'B03', status: pass(plan.steps.length === 10 && plan.approvalsNeeded.length >= 5), evidence: 'the frozen-rerun plan: ' + plan.steps.length +
      ' ordered commands, populations, 40-seed expansions, planning-scenario cost, ' + plan.approvalsNeeded.length + ' approvals, four unapproved extensions' },
    { id: 'T01', status: pass(coverage.ok && t.reconcile.failed === 0), evidence: 'the coverage document: ' + coverage.summary.problems + ' problems; synthetic cases reject duplicates, ' +
      'silent exclusions and incompatible identities (' + t.reconcile.passed + '/' + t.reconcile.total + ')' },
    { id: 'T02', status: pass(t.reconcile.failed === 0), evidence: 'paired whole-cluster bootstrap, all-spent CPU/wall denominators, censored and budget-ended trials kept (reconcile tests)' },
    { id: 'T03', status: pass(gate.state === 'not-evaluable-pre-freeze' && t.gate.failed === 0), evidence: 'provisional records cannot produce a formal go; sample-only evidence reports not-established-sample-only; claimed-exact requests whose verification failed and repeated seeds are rejected (gate tests)' },
    { id: 'T04', status: pass(t.gate.failed === 0 && t.gate.total >= 10), evidence: t.gate.passed + '/' + t.gate.total + ' gate cases run the real analysis on synthetic 40-cluster fixtures' },
    { id: 'T05', status: pass(problems.length === 0), evidence: 'no engine, no worker, no generation; budget summary ' + 'from the common reader; firewall and formats checked by the runner' }
  ];
}

// --- the tests run in the same command ----------------------------------------------------------------------------------------

function runTests() {
  const T = require('./ig10-test.cjs');
  const results = T.runPure();
  const bucket = function (group) {
    const rs = results.filter(function (r) { return r.group === group; });
    return { total: rs.length, passed: rs.filter(function (r) { return r.ok; }).length, failed: rs.filter(function (r) { return !r.ok; }).length };
  };
  return { reconcile: bucket('reconcile'), gate: bucket('gate'), results: results.map(function (r) {
    return { id: r.id, group: r.group, ok: r.ok, ms: r.ms, error: r.error || null };
  }) };
}

function formatProblems(files) {
  const bad = [];
  files.forEach(function (f) {
    const text = fs.readFileSync(f, 'utf8');
    if (text.charCodeAt(0) === 0xFEFF) bad.push(f + ': BOM');
    if (/(^|[^\r])\n/.test(text)) bad.push(f + ': a line ending that is not CRLF');
    if (/[ \t]+\r\n/.test(text)) bad.push(f + ': trailing whitespace');
    if (!text.endsWith('\r\n') || text.endsWith('\r\n\r\n')) bad.push(f + ': not exactly one final newline');
  });
  return bad;
}

// --- the runner ---------------------------------------------------------------------------------------------------------------

async function runAnalysis(input) {
  const opts = input.opts;
  const repoRoot = input.repoRoot;
  const manifest = input.manifest;
  const shard = input.shard;
  const processStartedAt = input.host.processStartedAt;
  const expectedTask = opts.task + '/' + shard.shard;
  const lock = RUN.observeLock(expectedTask);
  RUN.assertLockOwned(lock, expectedTask);
  const evidenceRoot = RUN.evidenceRootOf(repoRoot);
  const roundDir = path.join(evidenceRoot, opts.round);
  const shardDir = R.shardDirOf(evidenceRoot, opts.round, opts.task, shard.shard);

  const before = L.loadSourceSet({ repoRoot: repoRoot });
  const harness = C.harnessFingerprint();
  const freezeReceipt = opts.freezeReceipt ? C.readJson(opts.freezeReceipt) : null;
  const budgetReceipt = opts.budgetReceipt ? C.readJson(opts.budgetReceipt) : null;
  RUN.assertFrozenReceipts({ round: opts.round, freezeReceipt: freezeReceipt, budgetReceipt: budgetReceipt,
    runtimeFingerprint: before.fingerprint });

  const existing = R.listAttempts(shardDir);
  if (existing.length > 0 && !opts.attempt) {
    throw new HarnessError('attempt-exists', 'the shard already has evidence; a new attempt needs --attempt=aN');
  }
  const attemptId = opts.attempt || 'a1';
  const ledger = RUN.readLedger(roundDir);
  const budget = M.budgetState({ task: opts.task, round: opts.round, charges: R.collectCharges(ledger, R.scanRoundCommands(roundDir)),
    approvals: ledger.approvals, receipt: budgetReceipt });
  const deadlineMs = Math.min(opts.deadlineMs === null ? C.GUARDS.commandMs : opts.deadlineMs, budget.effectiveDeadlineMs);
  if (!(deadlineMs >= C.GUARDS.minWindowMs + C.GUARDS.finalizeReserveMs)) {
    throw new HarnessError('budget-exhausted', 'the remaining task/round budget does not admit a command');
  }
  const jobs = M.jobsOf(manifest, shard.jobKeys);
  const att = R.openAttempt(repoRoot, shardDir, attemptId);
  const fwBefore = L.takeFirewall({ repoRoot: repoRoot });
  const journal = new R.Journal(repoRoot, att.files.journal, shard.jobKeys);
  journal.append('command-start', { task: opts.task, shard: shard.shard, attemptId: attemptId, keys: shard.jobKeys,
    manifestHash: manifest.manifestHash, round: opts.round });
  C.writeJsonAtomic(repoRoot, att.files.manifest, { manifest: manifest, attemptKeys: shard.jobKeys, runKeys: shard.jobKeys,
    physicalPlan: { windowMs: M.commandWindowMs(deadlineMs), commands: 1 } });
  C.writeJsonAtomic(repoRoot, att.files.sourceManifest, { schema: C.SCHEMA, evidenceStatus: manifest.evidenceStatus,
    source: L.describeSourceSet(before), harness: harness, loadPlans: [] });
  C.writeJsonAtomic(repoRoot, att.files.firewallBefore, fwBefore.snapshot);

  const job = jobs[0];
  journal.start(job.key);
  const rec = R.recordBase(job);
  rec.recordKind = 'analysis';
  rec.outcome = 'complete';
  rec.solverMode = 'analysis';
  rec.poolWidth = 0;
  let status = 'complete';
  let errorInfo = null;
  let produced = null;
  const written = [];
  try {
    if (opts.round === C.ROUND_FROZEN) produced = runFrozenClosure({ repoRoot: repoRoot, evidenceRoot: evidenceRoot, roundDir: roundDir,
      opts: opts, freezeReceipt: freezeReceipt, budgetReceipt: budgetReceipt, runtimeFingerprint: before.fingerprint, deadlineMs: deadlineMs,
      written: written });
    else produced = runProvisional({ repoRoot: repoRoot, evidenceRoot: evidenceRoot, roundDir: roundDir, deadlineMs: deadlineMs,
      harness: harness.fingerprint, written: written, fwBefore: fwBefore });
    if (produced.status) status = produced.status;
    errorInfo = produced.error || null;
  } catch (err) {
    status = C.exitCodeOf(err) === 2 ? 'unsupported-source' : 'error';
    errorInfo = { code: err.code || null, message: String(err.message) };
  }
  rec.analysis = produced ? produced.analysis : null;
  if (status !== 'complete') {
    rec.outcome = 'error';
    rec.error = errorInfo || { code: status, name: null, message: status };
  }
  journal.finish(job.key, rec);

  const after = L.loadSourceSet({ repoRoot: repoRoot });
  const stable = L.compareSourceSets(before, after);
  const harnessAfter = C.harnessFingerprint();
  const fwAfter = L.takeFirewall({ repoRoot: repoRoot });
  const fwDiff = L.diffFirewall(fwBefore, fwAfter);
  const sourceStable = stable.stable && harness.fingerprint === harnessAfter.fingerprint;
  if (status === 'complete') {
    if (!sourceStable) status = 'source-changed';
    else if (!fwDiff.clean) status = 'firewall-violation';
  }
  const recon = R.reconcile(shard.jobKeys, C.readJsonl(att.files.journal));
  const records = R.buildRecords(jobs, recon);
  const recordProblems = [];
  records.forEach(function (r) { R.checkRecord(r).forEach(function (p) { recordProblems.push(r.key + ': ' + p); }); });
  if (status === 'complete' && recordProblems.length > 0) status = 'error';
  const gate = R.evaluateGate({ round: opts.round, freezeReceipt: freezeReceipt, budgetReceipt: budgetReceipt,
    runtimeFingerprint: before.fingerprint, catalogueFingerprint: null });
  const timing = RUN.timingOf(processStartedAt, opts.requestedAt);
  const cpuUsage = process.cpuUsage();
  const command = RUN.assembleCommand({
    task: opts.task, shard: shard.shard, round: opts.round, attemptId: attemptId, status: status,
    runtimeLabel: opts.runtimeLabel || RUN.DEFAULT_RUNTIME_LABEL, runtimeFingerprint: before.fingerprint,
    runtimeFiles: L.describeSourceSet(before).files, sourceStable: sourceStable, harnessFingerprint: harness.fingerprint, adapterIds: [],
    adapterHashes: [], catalogue: null, manifestHash: manifest.manifestHash, pairOrder: manifest.pairOrder, plannedKeys: shard.jobKeys,
    records: records, startedUnfinished: recon.startedUnfinished, logicalBlockKeys: [job.blockKey], physicalPlanHash: null,
    physicalPlan: { windowMs: M.commandWindowMs(deadlineMs), commands: 1, thisCommandKeys: shard.jobKeys, oversize: [] }, guards: C.GUARDS,
    lock: { wrapperPath: opts.lockHelper, ownerText: 'IG ' + expectedTask, expectedTask: expectedTask, observed: lock }, timing: timing,
    error: errorInfo, budgetLedgerReference: { ledger: C.toPosix(path.relative(repoRoot, path.join(roundDir, 'ledger.json'))),
      stateBefore: budget }, gate: gate,
    cpu: { api: 'process.cpuUsage of the analysis process (no request, no worker, no generation); informational only', quantumMs: null,
      commandCpuMs: Math.round((cpuUsage.user + cpuUsage.system) / 1000), probe: null },
    firewallClean: fwDiff.clean, firewallDiff: { added: fwDiff.added, removed: fwDiff.removed, changed: fwDiff.changed },
    resumeOf: null, chain: null, pause: null, parity: null, selfTestPassed: null,
    notes: ['analysis shard: evidence is read and documents are written; no engine, no worker, no puzzle'].concat(
      recordProblems, stable.stable ? [] : ['sources changed: ' + stable.changed.concat(stable.added, stable.removed).join(', ')],
      written.map(function (w) { return 'wrote ' + w.rel + ' (sha-256 ' + w.sha256.slice(0, 16) + ')'; }))
  });
  const summary = R.buildSummary({ command: command, records: records,
    extra: { documents: written, tests: produced ? produced.tests : null, coverage: produced ? produced.coverageSummary : null,
      gate: produced ? produced.gateState : null }, estimateVerdict: 'see report.md: the check-list estimate table, per row',
    exclusions: ['analysis only: no puzzle was generated, nothing was timed'] });
  RUN.writeFinalEvidence(repoRoot, att, { recordsDoc: { schema: C.SCHEMA, task: opts.task, shard: shard.shard, round: opts.round,
    attemptId: attemptId, evidenceStatus: command.evidenceStatus, manifestHash: manifest.manifestHash, records: records },
  firewallAfter: Object.assign({}, fwAfter.snapshot, { diff: { clean: fwDiff.clean, added: fwDiff.added, removed: fwDiff.removed,
    changed: fwDiff.changed } }), command: command, summary: summary });
  journal.append('command-end', { status: status, exit: command.exit });
  return { command: command, dir: att.dir };
}

function writeOnce(repoRoot, dir, name, value, written, evidenceRoot) {
  const abs = path.join(dir, name);
  if (fs.existsSync(abs)) throw new HarnessError('output-exists', 'output already exists: ' + C.toPosix(path.relative(repoRoot, abs)));
  let sha;
  if (typeof value === 'string') {
    C.writeTextExclusive(repoRoot, abs, value);
    sha = C.sha256(value);
  } else {
    sha = C.writeJsonAtomic(repoRoot, abs, value);
  }
  written.push({ rel: C.toPosix(path.relative(evidenceRoot, abs)), sha256: sha });
}

function runProvisional(input) {
  const tests = runTests();
  if (tests.reconcile.failed > 0 || tests.gate.failed > 0) {
    return { status: 'error', error: { code: 'selftest-failed', message: 'the synthetic reporting or gate tests failed: ' +
      tests.results.filter(function (r) { return !r.ok; }).map(function (r) { return r.id + ': ' + r.error; }).join('; ') },
    analysis: { tests: tests }, tests: tests };
  }
  const firewall = 'the production firewall is checked before and after this command by the runner (see command.json firewallClean)';
  const built = buildAll({ repoRoot: input.repoRoot, evidenceRoot: input.evidenceRoot, harnessFingerprint: input.harness, tests: tests,
    firewall: firewall });
  if (built.problems.length > 0) {
    return { status: 'error', error: { code: 'reconciliation-problems', message: built.problems.join('; ') },
      analysis: { problems: built.problems }, tests: tests };
  }
  if (C.processAgeMs() > input.deadlineMs - C.GUARDS.finalizeReserveMs) {
    return { status: 'error', error: { code: 'deadline', message: 'the command deadline would be exceeded before writing' },
      analysis: { problems: ['deadline'] }, tests: tests };
  }
  OUTPUTS.forEach(function (name) {
    if (fs.existsSync(path.join(input.roundDir, name))) throw new HarnessError('output-exists', name + ' already exists in the round folder');
  });
  writeOnce(input.repoRoot, input.roundDir, 'coverage.json', built.coverage, input.written, input.evidenceRoot);
  writeOnce(input.repoRoot, input.roundDir, 'budget-summary.json', built.budget, input.written, input.evidenceRoot);
  writeOnce(input.repoRoot, input.roundDir, 'gate.json', built.gate, input.written, input.evidenceRoot);
  writeOnce(input.repoRoot, input.roundDir, 'frozen-rerun-plan.json', built.frozenPlan, input.written, input.evidenceRoot);
  writeOnce(input.repoRoot, input.roundDir, 'report.json', built.report, input.written, input.evidenceRoot);
  writeOnce(input.repoRoot, input.roundDir, 'report.md', built.markdown, input.written, input.evidenceRoot);
  const bad = formatProblems(OUTPUTS.map(function (n) { return path.join(input.roundDir, n); }));
  if (bad.length > 0) return { status: 'error', error: { code: 'format', message: bad.join('; ') }, analysis: { problems: bad }, tests: tests };
  return { status: 'complete', tests: tests, coverageSummary: built.coverage.summary, gateState: built.gate.state,
    analysis: { documents: input.written, tests: { reconcile: tests.reconcile, gate: tests.gate }, coverage: built.coverage.summary,
      gate: built.gate.state, crossChecks: built.checks.length, engineLoaded: false, workersStarted: 0, puzzlesGenerated: 0 } };
}

// --- the frozen closure --------------------------------------------------------------------------------------------------------

/** The limits and defaults a frozen run used, as the freeze receipt names them: catalogue defaults, guards, budget hash. */
function observedLimitsOf(commands, budgetHash) {
  const first = commands[0] || {};
  return { defaults: first.catalogueSnapshot ? first.catalogueSnapshot.defaults : undefined, guards: first.guards,
    budgetHash: budgetHash === undefined ? undefined : budgetHash };
}

function runFrozenClosure(input) {
  const tests = runTests();
  if (tests.reconcile.failed > 0 || tests.gate.failed > 0) {
    return { status: 'error', error: { code: 'selftest-failed', message: 'the synthetic tests failed' }, analysis: { tests: tests }, tests: tests };
  }
  const round = C.ROUND_FROZEN;
  const got05 = RC.collectTask(input.evidenceRoot, round, 'IG-S05');
  const sm2 = mergedRecords(got05);
  const commands = [];
  got05.shards.forEach(function (s) { s.commands.forEach(function (c) { commands.push(c); }); });
  let requests = [];
  try {
    requests = mergedRecords(RC.collectTask(input.evidenceRoot, round, 'IG-S06'));
  } catch (err) {
    requests = [];
  }
  const budgetFile = path.join(input.evidenceRoot, round, 'IG-S04', 'budgets.json');
  const budgetHash = fs.existsSync(budgetFile) ? C.readJson(budgetFile).hash : undefined;
  const cells = ['classic9', 'mega12', 'mega16', 'samurai'];
  const gate = G.evaluateFrozenGate({ round: round, freezeReceipt: input.freezeReceipt, budgetReceipt: input.budgetReceipt,
    runtimeFingerprint: input.runtimeFingerprint, catalogueFingerprint: commands.length ? commands[0].catalogueFingerprint : null,
    observedLimits: observedLimitsOf(commands, budgetHash), cells: cells, seeds: Array.from({ length: 40 }, function (_x, i) { return 101 + i; }),
    requestSeeds: Array.from({ length: 40 }, function (_x, i) { return 201 + i; }), sm2Records: sm2, requestRecords: requests,
    quantumMs: commands.length && commands[0].cpu ? commands[0].cpu.quantumMs : null,
    assumptions: input.freezeReceipt && input.freezeReceipt.assumptions ? input.freezeReceipt.assumptions : null });
  gate.task = TASK;
  const frozenCoverage = { schema: 'ig-s-coverage/1', task: TASK, round: round, evidenceStatus: C.EVIDENCE_FROZEN,
    tasks: RC.TASKS.map(function (t) {
      try {
        const got = RC.collectTask(input.evidenceRoot, round, t);
        const counts = { completed: 0, completedByAuditOverlay: 0, budgetEnded: 0, censored: 0, error: 0, validationUnknown: 0, unstarted: 0 };
        got.shards.forEach(function (s) {
          const by = new Map(s.records.map(function (r) { return [r.key, r]; }));
          s.keys.forEach(function (k) { counts[RC.classOf(by.get(k))]++; });
        });
        return { task: t, planned: got.manifest.jobs.length, observed: counts };
      } catch (err) {
        return { task: t, planned: null, observed: null, note: 'not collectable: ' + err.message };
      }
    }) };
  const ledger = RUN.readLedger(input.roundDir);
  const charges = R.collectCharges(ledger, R.scanRoundCommands(input.roundDir));
  const budget = { schema: 'ig-s-budget-summary/1', task: TASK, round: round, evidenceStatus: C.EVIDENCE_FROZEN,
    chargedMs: charges.reduce(function (n, c) { return n + c.chargedMs; }, 0), commands: charges.length,
    receiptAuthorisedMs: input.budgetReceipt ? input.budgetReceipt.authorisedTotalMs : null };
  writeOnce(input.repoRoot, input.roundDir, 'gate.json', gate, input.written, input.evidenceRoot);
  writeOnce(input.repoRoot, input.roundDir, 'coverage.json', frozenCoverage, input.written, input.evidenceRoot);
  writeOnce(input.repoRoot, input.roundDir, 'budget-summary.json', budget, input.written, input.evidenceRoot);
  return { status: 'complete', tests: tests, gateState: gate.state, coverageSummary: null,
    analysis: { documents: input.written, gate: gate.state, frozen: true, formalVerdict: null } };
}

const R1_FILES = Object.freeze(['report.json', 'report.md', 'coverage.json', 'budget-summary.json', 'gate.json', 'frozen-rerun-plan.json']);
const R2_FILES = Object.freeze(['coverage-r2.json', 'budget-summary-r2.json', 'gate-r2.json', 'frozen-rerun-plan-r2.json', 'report-r2.json', 'report-r2.md']);
const REVISIONS = Object.freeze({
  r3: { suffix: '-r3', reason: 'pack-author report-only rulings after the owner\'s audit (statistic labels, S1/S2 cost and yield, first-phase formula, ' +
    'withdrawn costing premises, two unmeasured rows, source preparation, Killer and Greater-Than wording, staleness)' }
});

function revisionOutputs(suffix) {
  return ['coverage', 'budget-summary', 'gate', 'frozen-rerun-plan', 'report'].map(function (b) { return b + suffix + '.json'; })
    .concat(['report' + suffix + '.md']);
}

function hashFiles(roundDir, entries, revisionTag) {
  return entries.map(function (f) {
    const bytes = fs.readFileSync(f.path);
    const out = { revision: revisionTag, file: f.file, sha256: C.sha256(bytes), bytes: bytes.length };
    if (f.command) {
      out.status = f.command.status;
      out.harnessFingerprint = f.command.harnessFingerprint;
    }
    return out;
  });
}

/** The r1 files a revision supersedes, by hash: the six round documents and the r1 command that wrote them. */
function r1Snapshot(roundDir) {
  const files = R1_FILES.map(function (n) { return { file: n, path: path.join(roundDir, n) }; });
  const attempt = R.listAttempts(R.shardDirOf(path.dirname(roundDir), RC.ROUND, TASK, 'reconcile'))[0];
  if (attempt) {
    files.push({ file: C.toPosix(path.relative(roundDir, path.join(attempt.dir, 'command.json'))), path: path.join(attempt.dir, 'command.json'),
      command: attempt.command });
  }
  return hashFiles(roundDir, files, 'r1');
}

/** The r2 files a later revision supersedes, by hash, and the harness fingerprint of the r2 writer (read from report-r2.json). */
function r2Snapshot(roundDir) {
  const hashes = hashFiles(roundDir, R2_FILES.map(function (n) { return { file: n, path: path.join(roundDir, n) }; }), 'r2');
  const report = C.readJson(path.join(roundDir, 'report-r2.json'));
  return { files: hashes, writerHarnessFingerprint: report.revision ? report.revision.writerHarnessFingerprint : null };
}

/** A document without the fields that legitimately differ between revisions (the revision header, test counts, disclosures). */
function comparable(name, doc) {
  const d = JSON.parse(JSON.stringify(doc));
  delete d.revision;
  if (name === 'gate') delete d.syntheticTests;
  if (name === 'budget-summary') { delete d.disclosures; delete d.ig10; }
  if (name === 'coverage') delete d.ownCommands;
  return C.canonicalJson(d);
}

/**
 * A later revision of the round documents (a pack-author ruling): an unwrapped, read-only aggregation. No engine, no worker, no
 * generation, no ledger entry; the six files of the revision are written once beside the unchanged r1 and r2 files.
 */
function writeRevision(repoRoot, id) {
  const spec = REVISIONS[id];
  if (!spec) throw new HarnessError('unknown-revision', 'no such revision: ' + id);
  const evidenceRoot = RUN.evidenceRootOf(repoRoot);
  const roundDir = path.join(evidenceRoot, RC.ROUND);
  const outputs = revisionOutputs(spec.suffix);
  outputs.forEach(function (n) {
    if (fs.existsSync(path.join(roundDir, n))) throw new HarnessError('output-exists', n + ' already exists in the round folder');
  });
  const tests = runTests();
  if (tests.reconcile.failed > 0 || tests.gate.failed > 0) {
    throw new HarnessError('selftest-failed', tests.results.filter(function (r) { return !r.ok; }).map(function (r) {
      return r.id + ': ' + r.error; }).join('; '));
  }
  const r1 = r1Snapshot(roundDir);
  const r2 = r2Snapshot(roundDir);
  const r1Command = r1.find(function (s) { return s.harnessFingerprint !== undefined; });
  const writer = C.harnessFingerprint().fingerprint;
  const revision = { id: id, reason: spec.reason, supersedes: r1.concat(r2.files),
    r1CommandHarnessFingerprint: r1Command ? r1Command.harnessFingerprint : null, r2WriterHarnessFingerprint: r2.writerHarnessFingerprint,
    writerHarnessFingerprint: writer,
    writerRole: 'the ' + id + ' aggregation (ig10-run.cjs --write-' + id + '): unwrapped, read-only, no engine, no worker, no generation, not charged' };
  const firewall = 'the r1 command checked the production firewall (command.json firewallClean); the ' + id + ' aggregation reads the evidence and ' +
    'writes only the six ' + id + ' files in the round folder';
  const opts = { repoRoot: repoRoot, evidenceRoot: evidenceRoot, harnessFingerprint: writer, tests: tests, suffix: spec.suffix, revision: revision,
    firewall: firewall };
  // a first build to compare each document with its r2 counterpart, a second one that carries the comparison
  const first = buildAll(opts);
  const pairs = [['coverage', first.coverage], ['budget-summary', first.budget], ['gate', first.gate], ['frozen-rerun-plan', first.frozenPlan]];
  revision.comparisonToR2 = pairs.map(function (p) {
    const before = C.readJson(path.join(roundDir, p[0] + '-r2.json'));
    return { file: p[0] + spec.suffix + '.json', comparedWith: p[0] + '-r2.json', materiallyEqual: comparable(p[0], before) === comparable(p[0], p[1]),
      ignoredFields: { coverage: ['revision', 'ownCommands'], 'budget-summary': ['revision', 'disclosures', 'ig10'], gate: ['revision', 'syntheticTests'],
        'frozen-rerun-plan': ['revision'] }[p[0]] };
  });
  const built = buildAll(opts);
  if (built.problems.length > 0) throw new HarnessError('reconciliation-problems', built.problems.join('; '));
  const written = [];
  writeOnce(repoRoot, roundDir, 'coverage' + spec.suffix + '.json', built.coverage, written, evidenceRoot);
  writeOnce(repoRoot, roundDir, 'budget-summary' + spec.suffix + '.json', built.budget, written, evidenceRoot);
  writeOnce(repoRoot, roundDir, 'gate' + spec.suffix + '.json', built.gate, written, evidenceRoot);
  writeOnce(repoRoot, roundDir, 'frozen-rerun-plan' + spec.suffix + '.json', built.frozenPlan, written, evidenceRoot);
  writeOnce(repoRoot, roundDir, 'report' + spec.suffix + '.json', built.report, written, evidenceRoot);
  writeOnce(repoRoot, roundDir, 'report' + spec.suffix + '.md', built.markdown, written, evidenceRoot);
  const bad = formatProblems(outputs.map(function (n) { return path.join(roundDir, n); }));
  return { written: written, writer: writer, formatProblems: bad, tests: { reconcile: tests.reconcile, gate: tests.gate },
    coverage: built.coverage.summary, gate: built.gate.state, charged: built.budget.roundTotals, comparisonToR2: revision.comparisonToR2,
    errataLocated: built.report.errata.map(function (e) { return e.id + ':' + (e.located ? 'ok' : 'MISSING'); }) };
}

module.exports = { TASK, OUTPUTS, REVISIONS, VERDICT_RULES, buildAll, runAnalysis, runTests, observedLimitsOf, runFrozenClosure, formatProblems,
  s3Section, frozenBlock, acceptanceOf, r1Snapshot, r2Snapshot, revisionOutputs, comparable, writeRevision };

if (require.main === module) {
  const args = process.argv.slice(2);
  const writeArg = args.find(function (a) { return /^--write-r\d+$/.test(a); });
  if (writeArg) {
    const out = writeRevision(C.DEFAULT_REPO_ROOT, writeArg.slice('--write-'.length));
    process.stdout.write(JSON.stringify(out, null, 1) + '\n');
    process.exit(out.formatProblems.length === 0 ? 0 : 1);
  }
  if (args.indexOf('--dry-run') < 0) {
    process.stderr.write('ig10-run.cjs is run by run.cjs inside the wrapper; --dry-run builds everything in memory; --write-r3 writes the r3 revision\n');
    process.exit(2);
  }
  const t0 = Date.now();
  const outArg = args.find(function (a) { return /^--out=/.test(a); });
  const noTests = args.indexOf('--no-tests') >= 0;
  const tests = noTests ? undefined : runTests();
  const built = buildAll({ tests: tests });
  const summary = { ms: Date.now() - t0, problems: built.problems, coverage: built.coverage.summary, gate: built.gate.state,
    reportBytes: built.markdown.length, crossChecks: built.checks.length,
    crossBad: built.checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.id + ' ' + c.accepted + ' vs ' + c.recomputed; }),
    tests: tests ? { reconcile: tests.reconcile, gate: tests.gate } : null };
  if (outArg) {
    const dir = path.resolve(C.DEFAULT_REPO_ROOT, outArg.slice('--out='.length));
    C.assertAuthorised(C.DEFAULT_REPO_ROOT, dir);
    fs.mkdirSync(dir, { recursive: true });
    const docs = { 'coverage.json': built.coverage, 'budget-summary.json': built.budget, 'gate.json': built.gate,
      'frozen-rerun-plan.json': built.frozenPlan, 'report.json': built.report };
    Object.keys(docs).forEach(function (n) { C.writeJsonAtomic(C.DEFAULT_REPO_ROOT, path.join(dir, n), docs[n], { overwrite: true }); });
    fs.writeFileSync(path.join(dir, 'report.md'), built.markdown, 'utf8');
    summary.out = dir;
  }
  process.stdout.write(JSON.stringify(summary, null, 1) + '\n');
}
