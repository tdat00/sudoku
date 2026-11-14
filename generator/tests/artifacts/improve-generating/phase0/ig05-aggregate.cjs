'use strict';

/*
 * Task documents of IG-S05 from evidence only (no engine, nothing timed): the screen manifest (written BEFORE any run, with the
 * planned keys, the frozen budget and variant identities and the logical order) and, after the runs, `rates.json`,
 * `paired-intervals.json`, `selection.json` and `summary.json/md`. Everything is provisional (pre-freeze): it enables no cell,
 * selects no allowance and decides no default; the selection is a labelled diagnostic for IG-S06, never an adopted algorithm.
 *
 *   node ig05-aggregate.cjs --task=IG-S05 --round=provisional-r1 --stage=manifest
 *   node ig05-aggregate.cjs --task=IG-S05 --round=provisional-r1 [--stage=summary] [--suffix=-r2]
 *
 * A written file is never overwritten (an existing name fails closed); a later revision uses --suffix.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const L = require('./loader.cjs');
const F = require('./frontier.cjs');
const AG = require('./aggregate.cjs');
const RUN = require('./run.cjs');
const ST = require('./ig05-stats.cjs');
const IG05 = require('./ig05-run.cjs');
const PLAN = require('./plans/ig-s05.cjs');

const HarnessError = C.HarnessError;
const TASK = 'IG-S05';
const NOTICE = 'provisional (pre-freeze): eight grid clusters per cell, at most two native-fork samples per grid; descriptive rates ' +
  'and intervals only; no S1 allowlisting, no bank decision, no formal gate (not-evaluable-pre-freeze)';

function parseArgs(argv) {
  const opts = { task: TASK, round: null, stage: 'summary', suffix: '' };
  argv.forEach(function (arg) {
    const m = /^--(task|round|stage|suffix)=(.*)$/.exec(arg);
    if (!m) throw new HarnessError('args', 'unknown argument ' + arg);
    opts[m[1]] = m[2];
  });
  if (opts.task !== TASK) throw new HarnessError('args', 'ig05-aggregate.cjs summarises --task=' + TASK);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.round || '')) throw new HarnessError('args', 'missing or bad --round');
  if (['manifest', 'summary'].indexOf(opts.stage) < 0) throw new HarnessError('args', 'bad --stage');
  if (!/^(-[a-z0-9]+)?$/.test(opts.suffix)) throw new HarnessError('args', 'bad --suffix');
  return opts;
}

function evidenceDir(repoRoot, round) {
  return path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round, TASK);
}

function fmt(v, digits) {
  if (v === null || v === undefined) return 'n/a';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v);
    return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(digits === undefined ? 3 : digits);
  }
  return String(v);
}

function pct(x) {
  return x === null || x === undefined ? 'n/a' : (x * 100).toFixed(0) + '%';
}

/** Seconds with one decimal: machine time is quoted exactly, never rounded to whole seconds. */
function secs(ms) {
  return (ms / 1000).toFixed(1);
}

function table(headers, body) {
  const lines = ['| ' + headers.join(' | ') + ' |', '|' + headers.map(function () { return '---'; }).join('|') + '|'];
  body.forEach(function (row) { lines.push('| ' + row.map(function (v) { return fmt(v); }).join(' | ') + ' |'); });
  return lines.join('\n');
}

// --- the screen manifest (before any run) -------------------------------------------------------------------------------------

function screenManifest(repoRoot, round) {
  const manifest = M.buildManifest(TASK, round);
  const budgets = PLAN.loadBudgets(round, repoRoot);
  const variant = C.readJson(path.join(repoRoot, ...PLAN.VARIANT_REL.split('/')));
  const set = L.loadSourceSet({ repoRoot: repoRoot });
  const harness = C.harnessFingerprint();
  const seeds = PLAN.seedsOf(round);
  const keys = manifest.jobs.map(function (j) { return j.key; });
  const blocks = manifest.blocks.map(function (b) {
    const first = manifest.jobs.find(function (j) { return j.key === b.jobKeys[0]; });
    return { blockKey: b.blockKey, tier: first.tier, cell: first.puzzleVariant, seeds: Array.from(new Set(b.jobKeys.map(
      function (k) { return manifest.jobs.find(function (j) { return j.key === k; }).requestSeed; }))), keys: b.jobKeys,
    estimateMs: b.estimateMs };
  });
  const window = M.commandWindowMs(C.GUARDS.commandMs);
  const physical = M.packCommands(M.blocksFor(manifest, keys), window);
  const doc = {
    schema: 'ig-s05-screen-manifest/1',
    task: TASK,
    round: round,
    evidenceStatus: manifest.evidenceStatus,
    provisionalNotice: NOTICE,
    runtimeFingerprint: set.fingerprint,
    harnessFingerprint: harness.fingerprint,
    manifestHash: manifest.manifestHash,
    logicalHash: C.digestOf({ keys: keys, blocks: blocks.map(function (b) { return [b.blockKey, b.keys]; }) }),
    population: {
      cells: PLAN.CELLS.slice(), level: PLAN.LEVEL, seeds: seeds.slice(), clusters: seeds.length * PLAN.CELLS.length,
      modes: F.MODE_ORDER.slice(), tiers: PLAN.TIERS.map(function (t) { return { id: t.id, priority: t.priority,
        modes: t.modes.slice() }; }),
      samplesPerGrid: PLAN.SAMPLES, sampleForks: ['dig#1.1', 'dig#1.2'], gridForks: ['model', 'grid#1'],
      trials: keys.length, sampleObservationsMax: keys.length * PLAN.SAMPLES, request: { difficulty: PLAN.LEVEL,
        trace: 'off', symmetry: 'rotational180', digOrder: 'random' },
      solver: 'reference solver, pool width 1; the S3 prototype is not loaded',
      stopping: 'the first exact sample (or an exact keeper candidate) ends the trial; the skipped ordinals are recorded; a ' +
        'failed independent check is a correctness stop, never permission for a replacement sample; no local continuation',
      guard: 'the 45 s research guard of one sample observation (from the start of the trial to the start of sample 1, then from ' +
        'each sample start to its end); the 270 s command window',
      rotation: 'arms rotate inside a block by the cluster index (the index of the seed in the preregistered list)' },
    order: 'tier-major: primary, floors, reference, s2-control; inside a tier the seed block 101-104 across classic9, mega12, ' +
      'mega16, samurai, then 105-108; one shard (screen) so that packing flows across blocks and tiers',
    budget: { file: budgets.rel, hash: budgets.hash, source: budgets.source, projection: budgets.projection,
      perCellLimits: PLAN.CELLS.reduce(function (o, c) { o[c] = budgets.doc.cells[c].limits; return o; }, {}),
      rule: 'one vector per cell for every frontier arm, fresh for every sample; the native-kind controls keep their native ' +
        'guards and caps; no retuning' },
    variantManifest: { file: PLAN.VARIANT_REL, hash: variant.hash, runtimeFingerprint: variant.runtimeFingerprint,
      catalogueFingerprint: variant.catalogueFingerprint },
    allocation: { taskMs: M.ALLOCATIONS_MS[TASK], note: 'including the quiet-admission grace of every command, tests, audits ' +
      'and reporting' },
    estimates: { basis: 'IG-S04 pilot records (grids 11 and 12), the larger of the two per cell and mode, in ms: [cold wall of ' +
      'a one-sample trial, independent verification]', pilotMs: PLAN.PILOT_MS, startupMs: PLAN.STARTUP_MS,
      parentReserveMs: PLAN.PARENT_RESERVE_MS, formula: 'ceil((2 x cold - startup + verification + parent reserve) x ' +
        PLAN.MARGIN_FACTOR + ' + ' + PLAN.MARGIN_MS + ' ms) to 100 ms; a frontier mode uses the largest cold and verification ' +
        'figure of any frontier mode of its cell and never less than the floor', frontierFloorMs: PLAN.FRONTIER_FLOOR_MS,
      byKey: manifest.jobs.reduce(function (o, j) { o[j.key] = j.estimateMs; return o; }, {}) },
    blocks: blocks,
    plannedKeys: keys,
    projectedPhysicalPlan: { note: 'a projection of the separate physical layer (never part of the logical hash); each command ' +
      'is a separately admitted wrapper invocation', windowMs: physical.windowMs, hash: physical.hash,
    commands: physical.commands.length, projectedMachineMs: M.projectedMachineMs(physical),
    perCommand: physical.commands.map(function (c) { return { jobs: c.jobKeys.length, blocks: c.blockKeys.length,
      estimateMs: c.estimateMs }; }) }
  };
  doc.hash = C.digestOf(doc);
  return doc;
}

// --- loading ---------------------------------------------------------------------------------------------------------------------

function load(repoRoot, round) {
  const got = AG.collect(repoRoot, TASK, round);
  const records = [];
  got.shards.forEach(function (sh) { sh.records.forEach(function (r) { records.push(r); }); });
  const commands = [];
  got.shards.forEach(function (sh) { sh.commands.forEach(function (c) { commands.push(c); }); });
  const withCatalogue = commands.find(function (c) { return c.catalogueSnapshot; });
  const quantum = commands.map(function (c) { return c.cpu && c.cpu.quantumMs; }).filter(function (q) {
    return typeof q === 'number'; });
  return { got: got, manifest: got.manifest, records: records, commands: commands,
    catalogue: withCatalogue ? withCatalogue.catalogueSnapshot : null,
    catalogueFingerprint: withCatalogue ? withCatalogue.catalogueFingerprint : null,
    quantumMs: quantum.length === 0 ? null : Math.max.apply(null, quantum) };
}

function machineOf(repoRoot, round) {
  const m = AG.machineTime(repoRoot, TASK, round);
  const approvals = RUN.readLedger(path.join(RUN.evidenceRootOf(repoRoot), round)).approvals.filter(function (a) {
    return a.task === TASK && Number.isFinite(a.extraMs);
  });
  m.approvedExtraMs = approvals.reduce(function (n, a) { return n + a.extraMs; }, 0);
  m.approvals = approvals;
  m.effectiveCapMs = m.allocationMs + m.approvedExtraMs;
  m.remainingMs = m.effectiveCapMs - m.chargedMs;
  return m;
}

// --- the r2 closure: dev-check disclosure, proof that r1's numbers stand, interpretation ---------------------------------------------

function stopsOf(list) {
  return (list || []).map(function (b) { return [b.ordinal, b.dimension, b.limit, b.used, b.phase]; });
}

/**
 * The wrapped development checks of the task: observations made BEFORE the screen, under an earlier harness and manifest, that are
 * NOT screen records and enter no count, rate, interval or selection. Each is compared, read-only, with the screen's own trial of
 * the same key (the grids and samples are deterministic, so only the clock differs).
 */
function devChecksOf(repoRoot, round, data, machine) {
  const dir = evidenceDir(repoRoot, round);
  const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter(function (n) { return /^dev-check.*\.json$/.test(n); }).sort() : [];
  const byKey = new Map(data.records.map(function (r) { return [r.key, r]; }));
  return names.map(function (name) {
    const file = path.join(dir, name);
    const rep = C.readJson(file);
    const rows = rep.jobs.map(function (j) {
      const s = byKey.get(j.key);
      const same = s ? {
        gridHash: s.gridHash === j.gridHash,
        outcome: s.outcome === j.outcome,
        claimedExact: s.claimedExact === j.claimedExact,
        sampleClasses: C.canonicalJson(Array.isArray(s.samples) ? s.samples.map(function (x) { return x.class; }) : null) ===
          C.canonicalJson(j.sampleClasses),
        budgetStops: C.canonicalJson(stopsOf(s.budgetStops)) === C.canonicalJson(stopsOf(j.budgetStops))
      } : null;
      return { key: j.key, mode: j.mode, devOutcome: j.outcome, screenOutcome: s ? s.outcome : null, same: same,
        equal: same !== null && Object.keys(same).every(function (k) { return same[k]; }) };
    });
    const ledger = (machine.entries || []).filter(function (e) { return e.shard === 'dev-check'; });
    return { file: name, sha256: C.sha256(fs.readFileSync(file)), startedAt: rep.startedAt, endedAt: rep.endedAt,
      occupiedMs: rep.occupiedMs, harnessFingerprint: rep.harnessFingerprint, manifestHash: rep.manifestHash,
      runtimeFingerprint: rep.runtimeFingerprint, catalogueFingerprint: rep.catalogueFingerprint,
      synthetic: rep.synthetic.passed + '/' + rep.synthetic.total, keys: rep.jobs.length, jobs: rows,
      identical: rows.filter(function (r) { return r.equal; }).length, different: rows.filter(function (r) { return !r.equal; }).length,
      charge: ledger.length === 0 ? null : { occupiedMs: ledger[0].occupiedMs, chargedMs: ledger[0].chargedMs,
        shard: ledger[0].shard, attemptId: ledger[0].attemptId } };
  });
}

/**
 * Proof that r2 changed nothing of what r1 reported as a result: the hit counts, the primary, cold-inclusive and conditional
 * rates, the interval sums and outcome counts of every cell and mode, and the verdict. A difference stops the revision.
 */
function unchangedFromR1(analysis, r1) {
  const differing = [];
  const pick = function (x) {
    return { hits: x.hits, trials: x.trials, primary: x.primary, coldInclusive: x.coldInclusive,
      conditional: x.conditionalExcludingBudgetEnded, intervals: x.intervals, outcomes: x.outcomes };
  };
  Object.keys(analysis.cells).forEach(function (cell) {
    ST.MODES.forEach(function (m) {
      const before = r1.rates.cells[cell] ? r1.rates.cells[cell].modes[m] : null;
      if (!before || C.canonicalJson(pick(before)) !== C.canonicalJson(pick(analysis.cells[cell].modes[m]))) {
        differing.push(cell + '/' + m);
      }
    });
  });
  return { primaryRatesEqual: differing.length === 0, differing: differing, verdictEqual: r1.summary.verdict === analysis.verdict,
    r1Verdict: r1.summary.verdict, r1Files: { rates: r1.rates.hash, summary: r1.summary.hash, selection: r1.selection.hash } };
}

function readR1(repoRoot, round) {
  const dir = evidenceDir(repoRoot, round);
  const read = function (n) {
    const f = path.join(dir, n);
    if (!fs.existsSync(f)) throw new HarnessError('summary-refused', 'a revision needs the r1 file ' + n);
    return C.readJson(f);
  };
  return { rates: read('rates.json'), summary: read('summary.json'), selection: read('selection.json'),
    paired: read('paired-intervals.json') };
}

/** The author's interpretation of the null result, with the numbers of this screen. */
function interpretationOf(analysis, started) {
  const cells = Object.keys(analysis.cells);
  let nativeSamples = 0;
  let nativeExact = 0;
  let nativeShallow = 0;
  let frontierExact = 0;
  cells.forEach(function (cell) {
    ST.CONTROLS.forEach(function (m) {
      const n = analysis.cells[cell].modes[m].native;
      nativeSamples += n.samples;
      nativeExact += n.class.exact;
      nativeShallow += n.class.shallow;
    });
    ST.FRONTIER.forEach(function (m) { frontierExact += analysis.cells[cell].modes[m].hits; });
  });
  let degenerate = 0;
  let rows = 0;
  cells.forEach(function (cell) {
    analysis.cells[cell].paired.forEach(function (p) {
      rows++;
      if (p.degenerate) degenerate++;
    });
  });
  return [
    'No demonstrated exact-yield benefit on this pre-MS07 cohort: 0 verified exact hits in ' + started + ' grid trials (up to two ' +
      'samples each), the two native kinds included. This is not a finding that S1 must be dropped and it implies no S9 (bank) ' +
      'routing decision.',
    'Three distinct problems are kept apart (the "Separate problems" table) and are not merged into one verdict: (a) empty ' +
      'frontiers: samples that finished phase A with no frontier entry because every refused group proved ambiguous; (b) shallow, ' +
      'above-band or below-band candidates among those that did reach the canonical rating; (c) searches cut by the count budget.',
    'The native samples also had zero hits: ' + nativeExact + ' exact of ' + nativeSamples + ' native samples (' + nativeShallow +
      ' of them shallow, in band without needing the tier); the frontier variants had ' + frontierExact + ' verified hits.',
    'These two-sample grid trials exclude whole-request recovery (up to 8, 4 or 2 attempts by board size, up to 12 samples per grid) ' +
      'and the local-search continuation (IG-S-Q05 records that the one historical mega16 hit came from local search): a zero here ' +
      'is not a request-level yield and says nothing about the frozen catalogue.',
    degenerate + ' of the ' + rows + ' paired intervals are degenerate (every resample identical, the all-zero [0, 0] ones): ' +
      'they are not evidence of equivalence or non-inferiority.',
    'Two-grid budget fits are experimental limits, not tail guarantees; the screen is rerun on the frozen catalogue before any ' +
      'decision.'
  ];
}

// --- identity and acceptance -------------------------------------------------------------------------------------------------------

function identityOf(data, sm, budgets) {
  const problems = [];
  const fp = function (name) { return Array.from(new Set(data.commands.map(function (c) { return c[name]; }))); };
  if (!sm) problems.push('screen-manifest.json is missing');
  else {
    if (sm.manifestHash !== data.manifest.manifestHash) problems.push('the saved screen manifest does not match the manifest');
    if (sm.budget.hash !== budgets.hash) problems.push('the saved budget hash differs from the plan\'s');
  }
  if (budgets.hash !== PLAN.BUDGET_HASH && data.manifest.round !== C.ROUND_FROZEN) {
    problems.push('the budget hash is not the frozen IG-S04 one');
  }
  const manifestHashes = fp('manifestHash');
  const runtimes = fp('runtimeFingerprint');
  const harnesses = fp('harnessFingerprint');
  if (manifestHashes.length > 1) problems.push('the commands name different manifest hashes');
  if (runtimes.length > 1) problems.push('the commands name different runtime fingerprints');
  if (sm && runtimes.length === 1 && sm.runtimeFingerprint !== runtimes[0]) {
    problems.push('the runtime of the commands differs from the one of the screen manifest');
  }
  // budget identity per cell: every frontier trial carries the same vector and hash
  const perCell = {};
  data.records.filter(function (r) { return r.outcome !== 'unstarted' && r.limits && r.limits.budgetHash; }).forEach(function (r) {
    perCell[r.puzzleVariant] = perCell[r.puzzleVariant] || new Set();
    perCell[r.puzzleVariant].add(C.digestOf({ hash: r.limits.budgetHash, vector: r.limits.budget }));
  });
  const budgetIdentity = {};
  PLAN.CELLS.forEach(function (cell) {
    const s = perCell[cell] ? Array.from(perCell[cell]) : [];
    const frozen = budgets.doc.cells[cell].limits;
    const expected = C.digestOf({ hash: budgets.hash, vector: frozen });
    budgetIdentity[cell] = { vectors: s.length, equalsFrozen: s.length > 0 && s.every(function (x) { return x === expected; }) };
    if (s.length > 0 && !budgetIdentity[cell].equalsFrozen) problems.push('budget identity violated in ' + cell);
  });
  return { problems: problems, manifestHashes: manifestHashes, runtimeFingerprints: runtimes, harnessFingerprints: harnesses,
    budgetIdentity: budgetIdentity };
}

function acceptance(analysis, identity, data, options) {
  const reviewed = options && options.b03Reviewed === true;
  const rows = data.records.filter(function (r) { return r.outcome !== 'unstarted'; });
  const started = rows.length;
  const planned = data.manifest.jobs.length;
  const falseFlags = analysis.anomalies.filter(function (a) { return a.kind === 'false-exact-flag'; }).length;
  const errors = rows.filter(function (r) { return r.outcome === 'error'; }).length;
  const stateOf = function (ok) { return ok ? 'met' : 'NOT met'; };
  const ordinalsOk = rows.every(function (r) { return Array.isArray(r.sampleStates) && r.sampleStates.length === 2; });
  const gridClusters = analysis.anomalies.filter(function (a) { return a.kind === 'grid-hash-differs-inside-cluster'; }).length;
  return [
    { id: 'B01', status: stateOf(true), evidence: 'rates.json and paired-intervals.json: verified hits per ready CPU and wall second ' +
      'of every mode, the two native kinds included, with the paired difference of each frontier variant against each' },
    { id: 'B02', status: stateOf(analysis.anomalies.filter(function (a) { return a.kind === 'duplicate-hit-hash'; }).length === 0),
      evidence: 'zero-hit rates are shown with their trial counts, the budget-ended share and the unstarted keys; a hit counts ' +
        'once per grid trial; censored and budget-ended trials stay in the denominators (' + started + ' of ' + planned +
        ' keys started)' },
    { id: 'B03', status: reviewed ? 'met' : 'pending', evidence: reviewed ? 'selection.json (r1, unchanged, hash recomputed ' +
      'equal) is a labelled diagnostic written before the held-out cohort: F1 as an explicitly non-winning default in every cell; ' +
      'the pack author reviewed the raw paired coverage and passed it (closure of 2026-11-15)' :
      'selection.json is a labelled diagnostic written before the held-out cohort; the orchestrator reviews the raw paired coverage' },
    { id: 'T01', status: stateOf(ordinalsOk), evidence: 'every started trial lists the state of ordinals 1 and 2 (returned, ' +
      'sample-budget, skipped-first-exact, censored, not-reached); unstarted keys are listed as unstarted (' + (planned - started) +
      ')' },
    { id: 'T02', status: stateOf(gridClusters === 0), evidence: 'one grid per mode built afresh; the grid hashes of the modes of a ' +
      'cluster are equal (' + gridClusters + ' clusters differ); the forks are model, grid#1, dig#1.1, dig#1.2' },
    { id: 'T03', status: stateOf(identity.problems.filter(function (p) { return p.indexOf('budget') >= 0; }).length === 0),
      evidence: 'the frozen IG-S04 budget vector of each cell is used by every frontier arm of that cell (hash ' +
        Object.keys(identity.budgetIdentity).map(function (c) { return c + ' ' + (identity.budgetIdentity[c].equalsFrozen ? 'equal' :
          'no trial'); }).join(', ') + ')' },
    { id: 'T04', status: stateOf(true), evidence: 'whole grid clusters are resampled together (2,000 draws, seed 20261114); zero hits ' +
      'give a zero lower bound; no pseudo-count' },
    { id: 'T05', status: stateOf(falseFlags === 0 && errors === 0), evidence: falseFlags + ' false exact flags, ' + errors +
      ' error records; every numerator is a claimed AND independently verified exact return; the denominator is all ' +
      'engine-ready-to-cleanup CPU/wall of the started trials' }
  ];
}

// --- documents ---------------------------------------------------------------------------------------------------------------------

function ratesDoc(analysis, round, evidenceStatus, quantumMs, revision) {
  const cells = {};
  Object.keys(analysis.cells).forEach(function (cell) {
    cells[cell] = { modes: analysis.cells[cell].modes, problems: analysis.cells[cell].problems };
  });
  const doc = { schema: 'ig-s05-rates/1', task: TASK, round: round, revision: revision || 'r1', evidenceStatus: evidenceStatus,
    provisionalNotice: NOTICE,
    cpuQuantumMs: quantumMs, definition: 'verified delivered grid hits divided by all engine-ready-to-cleanup generation CPU (wall) ' +
      'of the started trials of that mode; grid build and cleanup included; the cold start is reported apart', coverage:
      analysis.coverage, cells: cells };
  if (revision && revision !== 'r1') {
    doc.supersedes = 'rates.json (r1)';
    doc.revisionNote = 'r2: setupAmortised uses readyTotal - gridCost + m x gridCost / N per trial (m = started samples) and shows ' +
      'the superseded r1 formula beside it; the funnel gains the empty-frontier counts and every cell the separate problems; the ' +
      'primary rates, the cold-inclusive and conditional rates and the hit counts are those of r1';
  }
  doc.hash = C.digestOf(doc);
  return doc;
}

function pairedDoc(analysis, round, evidenceStatus, revision) {
  const cells = {};
  Object.keys(analysis.cells).forEach(function (cell) {
    cells[cell] = { paired: analysis.cells[cell].paired, own: analysis.cells[cell].own };
  });
  let degenerate = 0;
  let rows = 0;
  Object.keys(cells).forEach(function (cell) {
    cells[cell].paired.forEach(function (p) {
      rows++;
      if (p.degenerate) degenerate++;
    });
  });
  const doc = { schema: 'ig-s05-paired-intervals/1', task: TASK, round: round, revision: revision || 'r1',
    evidenceStatus: evidenceStatus,
    provisionalNotice: NOTICE, method: 'whole paired grid clusters resampled with replacement, 2,000 draws, fixed analysis seed ' +
      '20261114; rate differences; the one-sided 95% lower bound is the 5th percentile; zero hits give a zero lower bound and ' +
      'no pseudo-count; descriptive provisional intervals with poor small-sample coverage, never reliable guarantees',
    degenerateRows: { rows: rows, degenerate: degenerate, interpretation: ST.DEGENERATE_NOTE },
    cells: cells };
  if (revision && revision !== 'r1') {
    doc.supersedes = 'paired-intervals.json (r1)';
    doc.revisionNote = 'r2: every interval whose resamples are all identical (here the all-zero [0, 0] ones) is labelled degenerate ' +
      '(not evidence of equivalence or non-inferiority); rows also carry the hits of each arm; the numbers are those of r1';
  }
  doc.hash = C.digestOf(doc);
  return doc;
}

function selectionDoc(analysis, round, evidenceStatus, sm, budgets) {
  const cells = {};
  Object.keys(analysis.cells).forEach(function (cell) {
    const s = analysis.cells[cell].selection;
    cells[cell] = { selected: s.selected, winner: s.winner, reason: s.reason, label: s.label, ranking: s.ranking || null,
      controlsComplete: s.controlsComplete, variantStats: s.variantStats, stability: s.stability,
      formalGate: 'not-evaluable-pre-freeze', finding: analysis.cells[cell].finding };
  });
  const doc = { schema: 'ig-s05-selection/1', task: TASK, round: round, evidenceStatus: evidenceStatus, provisionalNotice: NOTICE,
    rule: 'among variants with every planned grid trial observed, paired control coverage and at least one verified grid hit: ' +
      'hits per ready CPU second, then per ready wall second, then the fixed order F1, FC, FM, FU, FS, F0; with no such variant F1 ' +
      'is an explicitly non-winning diagnostic default; the fastest zero-hit mode is never a winner',
    handoff: { budgetHash: budgets.hash, screenManifestHash: sm ? sm.hash : null, manifestHash: sm ? sm.manifestHash : null,
      note: 'IG-S06 receives this selection and these hashes unchanged' },
    cells: cells };
  doc.hash = C.digestOf(doc);
  return doc;
}

function summaryDoc(ctx) {
  const a = ctx.analysis;
  const planned = ctx.data.manifest.jobs.length;
  const started = ctx.data.records.filter(function (r) { return r.outcome !== 'unstarted'; }).length;
  const doc = {
    schema: 'ig-s05-summary/1', task: TASK, round: ctx.round, revision: ctx.suffix ? ctx.suffix.slice(1) : 'r1',
    evidenceStatus: ctx.evidenceStatus, provisionalNotice: NOTICE, formalGate: 'not-evaluable-pre-freeze',
    verdict: a.verdict, allRatesZero: a.allRatesZero, allCovered: a.allCovered,
    coverage: { plannedTrials: planned, started: started, unstarted: planned - started,
      complete: ctx.data.records.filter(function (r) { return r.outcome === 'complete'; }).length,
      censored: ctx.data.records.filter(function (r) { return r.outcome === 'request-timeout'; }).length,
      budgetEnded: ctx.data.records.filter(function (r) { return r.outcome === 'sample-budget'; }).length,
      errors: ctx.data.records.filter(function (r) { return r.outcome === 'error' || r.outcome === 'validation-unknown'; }).length,
      byShard: ctx.data.got.shards.map(function (sh) { return { shard: sh.shard, status: sh.status, attempts: sh.chain,
        unstartedKeys: sh.unstartedKeys.length }; }) },
    cells: Object.keys(a.cells).map(function (cell) {
      const c = a.cells[cell];
      return { cell: cell, formalGate: c.formalGate, finding: c.finding, selection: { selected: c.selection.selected,
        winner: c.selection.winner, reason: c.selection.reason }, zeroBaselineFeasibility: c.zeroBaselineFeasibility,
      hits: ST.MODES.reduce(function (o, m) { o[m] = c.modes[m].hits; return o; }, {}) };
    }),
    anomalies: a.anomalies,
    identity: ctx.identity,
    machine: ctx.machine,
    screenManifestHash: ctx.sm ? ctx.sm.hash : null,
    budgetHash: ctx.budgets.hash,
    harness: { fingerprints: ctx.identity.harnessFingerprints, summaryWrittenBy: C.harnessFingerprint().fingerprint },
    files: ctx.files,
    closure: ctx.closure || null,
    interpretationNotes: [
      'the intervals come from eight whole grid clusters per cell and are descriptive provisional ones with poor small-sample ' +
        'coverage, not lower-confidence guarantees',
      'a per-sample rate is not extrapolated to an unqualified 90% request claim; two-grid budget fits are experimental limits, not ' +
        'tail guarantees',
      'the zero-baseline feasibility threshold (the lower-bound rate projecting to half of the requests inside the budget at width ' +
        '4) is projection-awaits-author-review, never evaluated here',
      'F0/F1 is the isolated S2 comparison, FC/FM/F1 the floor choices, FU/F1 the uniqueness filter, FS/F1 the reference-parent ' +
        'choice; the gains are correlated and are not multiplied',
      'the final phase A parent classification is a post-timing diagnostic: it never steers generation and never enters a hit count',
      'unreached keys are unstarted/inconclusive: they are not zero-cost trials and not censored observations'
    ],
    acceptance: ctx.acceptance
  };
  doc.hash = C.digestOf(doc);
  return doc;
}

function renderSummary(doc, analysis, ctx) {
  const out = ['# IG-S05 summary (' + doc.round + (doc.revision !== 'r1' ? ', revision ' + doc.revision : '') + ')', '',
    '**' + doc.provisionalNotice + '**', '',
    'Formal gate: **' + doc.formalGate + '**. Evidence status: **' + doc.evidenceStatus + '**.', '',
    'Verdict: **' + doc.verdict + '**.', ''];
  const cl = doc.closure;
  if (cl) {
    out.push('## Revision ' + doc.revision + ': what changed since r1 (r1 is kept unchanged)', '');
    cl.corrections.forEach(function (x) { out.push('- ' + x); });
    out.push('', '## Interpretation', '');
    cl.interpretation.forEach(function (x) { out.push('- ' + x); });
    out.push('');
  }
  out.push('## Coverage', '');
  const c = doc.coverage;
  out.push(table(['planned trials', 'started', 'complete', 'censored (45 s guard)', 'budget-ended', 'errors', 'unstarted'],
    [[c.plannedTrials, c.started, c.complete, c.censored, c.budgetEnded, c.errors, c.unstarted]]), '');
  out.push('Unstarted keys are inconclusive: they are not zero-cost trials and not censored observations. Shards: ' +
    c.byShard.map(function (s) { return s.shard + ' ' + s.status + ' (attempts ' + (s.attempts || []).join(', ') + ')'; }).join('; ') +
    '.', '');
  out.push('### Per cell and mode: trials, outcomes and the state of the sample ordinals', '');
  out.push(table(['cell', 'mode', 'planned', 'started', 'complete', 'censored', 'budget-ended', 'errors', 'unstarted',
    'ordinals returned', 'skipped (first exact)', 'ordinals censored/not reached'],
  analysis.coverage.map(function (x) {
    const skipped = Object.keys(x.sampleOrdinals).filter(function (k) { return k.indexOf('skipped-') === 0; }).reduce(
      function (n, k) { return n + x.sampleOrdinals[k]; }, 0);
    return [x.cell, x.mode, x.planned, x.started, x.complete, x.censored, x.budgetEnded, x.errors, x.unstarted,
      x.sampleOrdinals.returned + x.sampleOrdinals['sample-budget'], skipped,
      x.sampleOrdinals.censored + x.sampleOrdinals['not-reached']];
  })), '');

  out.push('## Primary rates: verified delivered grid hits per ready-interval CPU and wall second', '',
    'The denominator is all generation work of the started trials of the mode from engine-ready to the end of cleanup, the actual ' +
    'grid build included (censored, budget-ended and errored trials stay in). Cold-inclusive rates add the worker start. The ' +
    'conditional rate excludes trials that ended on the sample budget: it is secondary and can select no winner and pass no gate. ' +
    'The setup-amortised columns are a derived sensitivity (readyTotal - gridCost + m x gridCost / N per trial, m the samples that ' +
    'started, N the native sample count; corrected in r2, see below): not measured request throughput, never the primary ' +
    'denominator.', '');
  out.push(table(['cell', 'mode', 'trials', 'verified hits', 'ready CPU s', 'ready wall s', 'hits / CPU s', 'hits / wall s',
    'cold hits / CPU s', 'cold hits / wall s', 'cond. hits / CPU s', 'cond. trials', 'amortised hits / CPU s',
    'amortised hits / wall s'],
  [].concat.apply([], Object.keys(analysis.cells).map(function (cell) {
    return ST.MODES.map(function (m) {
      const x = analysis.cells[cell].modes[m];
      return [cell, m, x.trials, x.hits, x.primary.cpuMs === null ? null : x.primary.cpuMs / 1000,
        x.primary.wallMs === null ? null : x.primary.wallMs / 1000, x.primary.perCpuSecond, x.primary.perWallSecond,
        x.coldInclusive.perCpuSecond, x.coldInclusive.perWallSecond, x.conditionalExcludingBudgetEnded.perCpuSecond,
        x.conditionalExcludingBudgetEnded.trials, x.setupAmortised.perCpuSecond, x.setupAmortised.perWallSecond];
    });
  }))), '');

  out.push('## Setup, sample and cleanup apart (sums over the started trials of a mode, ms)', '');
  out.push(table(['cell', 'mode', 'startup CPU', 'startup wall', 'grid build CPU', 'grid build wall', 'samples CPU',
    'samples wall', 'cleanup CPU', 'cleanup wall'],
  [].concat.apply([], Object.keys(analysis.cells).map(function (cell) {
    return ST.MODES.map(function (m) {
      const i = analysis.cells[cell].modes[m].intervals;
      return [cell, m, i.startupCpuMs, i.startupWallMs, i.gridBuildCpuMs, i.gridBuildWallMs, i.samplesCpuMs, i.samplesWallMs,
        i.cleanupCpuMs, i.cleanupWallMs];
    });
  }))), '', 'CPU is the process total read at the host (worker threads included); its quantum is ' + fmt(ctx.quantumMs) +
    ' ms, so a short interval is resolved only in the sum. The sample columns are the host stamps of the worker\'s messages: ' +
    'attribution only.', '');

  if (cl) {
    out.push('## Setup-amortised sensitivity, corrected (derived; never the primary denominator)', '',
      'Per started trial: `readyTotal - gridCost + m x gridCost / N`, with m the samples that started in the trial (a trial that ' +
      'stopped after one sample carries one share of the grid build, a two-sample trial two) and N = 12, the native sample count ' +
      'of rotational180. r1 charged one share per trial whatever m was: its denominators are shown beside the corrected ones. ' +
      'Every verified-hit count is 0, so every rate is 0 under either formula; the numbers that change are the denominators.', '');
    out.push(table(['cell', 'mode', 'trials', 'samples started (m total)', 'grid CPU ms', 'ready CPU s', 'amortised CPU s (r2)',
      'r1 formula CPU s', 'ready wall s', 'amortised wall s (r2)', 'r1 formula wall s', 'hits / amortised CPU s',
      'hits / amortised wall s'],
    [].concat.apply([], Object.keys(analysis.cells).map(function (cell) {
      return ST.MODES.map(function (mode) {
        const x = analysis.cells[cell].modes[mode];
        const a = x.setupAmortised;
        return [cell, mode, x.trials, a.samplesStarted, x.intervals.gridBuildCpuMs, x.primary.cpuMs === null ? null :
          x.primary.cpuMs / 1000, a.cpuMs === null ? null : a.cpuMs / 1000, a.r1OnePerTrial.cpuMs === null ? null :
          a.r1OnePerTrial.cpuMs / 1000, x.primary.wallMs === null ? null : x.primary.wallMs / 1000, a.wallMs === null ? null :
          a.wallMs / 1000, a.r1OnePerTrial.wallMs === null ? null : a.r1OnePerTrial.wallMs / 1000, a.perCpuSecond, a.perWallSecond];
      });
    }))), '');
  }

  out.push('## Paired rate differences against the native kinds (whole grid clusters resampled together)', '',
    'Difference = rate of the variant minus rate of the control, per second; one-sided 95% lower bound (5th percentile), ordinary ' +
    '95% interval; zero hits give a zero lower bound and no pseudo-count. Descriptive provisional intervals from eight clusters ' +
    'with poor small-sample coverage: not reliable confidence guarantees and not a gate. "proposal-only" is both the current ' +
    'proposal kind and the proposal-only control. An interval marked **degenerate** has the same value in every resample (here the ' +
    'all-zero [0, 0] ones, with no hit in either arm): it is not evidence of equivalence or non-inferiority.', '');
  out.push(table(['cell', 'mode', 'control', 'per', 'coverage', 'paired clusters', 'hits (mode/control)', 'rate (mode)',
    'rate (control)', 'difference', '95% CI low', '95% CI high', 'lower bound (1-sided)', 'interval'],
  [].concat.apply([], Object.keys(analysis.cells).map(function (cell) {
    return analysis.cells[cell].paired.map(function (p) {
      return [cell, p.mode, p.control, p.per, p.status, p.pairedClusters + '/' + p.planned, p.hitsMode + '/' + p.hitsControl,
        p.rateMode, p.rateControl, p.difference, p.ci95[0], p.ci95[1], p.lowerBound95OneSided,
        p.degenerate ? 'degenerate' : 'resampled'];
    });
  }))), '');

  out.push('## The funnel of the frontier variants: frontier, uniqueness, canonical, deepen (all samples)', '',
    'Floor tests are accepted (a complete floor proof or the S2 re-derivation) or refused: stuck with a unique, an unknown or an ' +
    'ambiguous DFS verdict. "Entries" are the frontier groups left after phase A; phase-B tries are the attempted entries ' +
    '(at most K_F = 12), whose fresh DFS proof is unique, ambiguous at the reference or unknown; allowed-set solves, canonical ' +
    'ratings and their exact/shallow/below/above outcomes follow, then the deepen proposals. Budget stops are the samples that ' +
    'ended on the count budget.', '');
  const fr = [];
  Object.keys(analysis.cells).forEach(function (cell) {
    ST.FRONTIER.forEach(function (m) {
      const f = analysis.cells[cell].modes[m].funnel;
      fr.push([cell, m, f.samples, f.floorTests, f.acceptedByFullProof + '/' + f.acceptedByRederivation,
        f.refusedStuckUnique + '/' + f.refusedStuckUnknown + '/' + f.refusedAmbiguous, f.entriesAtEnd, f.phaseBTries,
        f.proofUnique + '/' + f.proofAmbiguousAtReference + '/' + f.proofUnknown, f.allowedSolves, f.canonicalRated,
        f.candidateExact + '/' + f.candidateShallow + '/' + f.candidateBelow + '/' + f.candidateAbove, f.deepenRuns,
        f.deepenProposals, f.deepenCommitted, f.deepenReachedBand,
        f.deepenExact + '/' + f.deepenShallow + '/' + f.deepenBelow + '/' + f.deepenAbove, f.budgetStopSamples,
        Object.keys(f.budgetStopsByDimension).map(function (k) { return k + ' ' +
          f.budgetStopsByDimension[k]; }).join(', ') || 'none']);
    });
  });
  out.push(table(['cell', 'mode', 'samples', 'floor tests', 'accepted full/S2', 'refused stuck-unique/unknown/ambiguous',
    'entries at end', 'phase-B tries', 'proof unique/ambiguous/unknown', 'allowed solves', 'canonical ratings',
    'exact/shallow/below/above', 'deepen runs', 'deepen proposals', 'deepen commits', 'deepen in band',
    'deepen exact/shallow/below/above', 'budget stops', 'by dimension'], fr), '');

  if (cl) {
    out.push('## Separate problems: empty frontiers, shallow or off-band candidates, budget-limited searches', '',
      'Three different reasons for a zero yield, never merged. (a) "Empty frontier samples": complete samples (no budget stop) that ' +
      'left no frontier entry, because every refused group proved ambiguous. (b) "Candidates": the allowed-set solutions that were ' +
      'rated canonically, as exact / shallow (in band, tier not needed) / below / above the band. (c) "Budget-ended trials": ' +
      'searches cut by the frozen count budget (an experimental limit fitted on two grids, not a tail guarantee). The native ' +
      'samples of the same grids are listed below the table. Variants that share their phase A (F0, F1, FU, FS) repeat the same ' +
      'entries.', '');
    const sp = [];
    Object.keys(analysis.cells).forEach(function (cell) {
      analysis.cells[cell].problems.frontier.forEach(function (p) {
        sp.push([cell, p.variant, p.completeSamples + '/' + p.samples, p.emptyFrontierSamples, p.entriesAtEnd, p.phaseBTries,
          p.proofUnique + '/' + p.proofAmbiguousAtReference, p.canonicalRated,
          p.candidateExact + '/' + p.candidateShallow + '/' + p.candidateBelow + '/' + p.candidateAbove,
          p.budgetEndedTrials + '/' + p.trials, p.budgetEndedShare === null ? null : pct(p.budgetEndedShare),
          Object.keys(p.budgetStopsByDimension).map(function (k) { return k + ' ' + p.budgetStopsByDimension[k]; }).join(', ') ||
            'none']);
      });
    });
    out.push(table(['cell', 'variant', 'complete samples / samples (the rest stopped on the budget)', '(a) empty frontier samples',
      'entries at end',
      'phase-B tries', 'fresh proof unique / ambiguous', 'canonical ratings', '(b) candidates exact/shallow/below/above',
      '(c) budget-ended trials', 'share', 'stopped on'], sp), '');
    const nr = [];
    Object.keys(analysis.cells).forEach(function (cell) {
      analysis.cells[cell].problems.native.forEach(function (n) {
        nr.push([cell, n.kind, n.samples, n.exact, n.shallow, n.below, n.above, n.unrated]);
      });
    });
    out.push(table(['cell', 'native kind', 'samples', 'exact', 'shallow', 'below', 'above', 'unrated'], nr), '');
  }

  out.push('## How much of a frontier sample is floor and DFS work (shares of the sample work after the grid)', '',
    'Wall shares are the phase wall times (phase A holds every floor test and the DFS after each stuck one; phase B excludes the ' +
    'nested deepen). Check shares are by the engine purposes: floor tests, the DFS (refused-test uniqueness and the phase-B ' +
    'proofs), the allowed-set and canonical solves (the plan\'s "few solves"), the deepen objective and the FU filter.', '');
  const sh = [];
  Object.keys(analysis.cells).forEach(function (cell) {
    ST.FRONTIER.forEach(function (m) {
      const f = analysis.cells[cell].modes[m].funnel;
      const w = f.shares.wall;
      const k = f.shares.logicalChecksByPurpose || {};
      const few = (k.allowed || 0) + (k.canonical || 0);
      sh.push([cell, m, w ? pct(w.phaseA) : 'n/a', w ? pct(w.phaseB) : 'n/a', w ? pct(w.deepen) : 'n/a', w ? pct(w.init) : 'n/a',
        f.shares.logicalChecksByPurpose ? pct(k.floor || 0) : 'n/a', f.shares.logicalChecksByPurpose ? pct(few) : 'n/a',
        f.shares.logicalChecksByPurpose ? pct(k.deepen || 0) : 'n/a', f.shares.logicalChecksByPurpose ? pct(k.fu || 0) : 'n/a',
        f.dfsEntries, f.dfsChecks, f.logicalChecks]);
    });
  });
  out.push(table(['cell', 'mode', 'wall: phase A', 'wall: phase B', 'wall: deepen', 'wall: init', 'checks: floor tests',
    'checks: allowed + canonical', 'checks: deepen', 'checks: FU filter', 'DFS entries', 'DFS checks', 'logical checks'], sh), '');

  out.push('## The native samples (both samples of one kind on one grid, native caps and keeper)', '');
  const nr = [];
  Object.keys(analysis.cells).forEach(function (cell) {
    ST.CONTROLS.forEach(function (m) {
      const n = analysis.cells[cell].modes[m].native;
      nr.push([cell, m, n.samples, n.class.exact, n.class.shallow, n.class.below, n.class.above, n.class.unrated, n.groupsTried,
        n.accepted, n.rejected, n.skipped, n.oracleCalls, n.canonicalRatings, n.proposals]);
    });
  });
  out.push(table(['cell', 'mode', 'samples', 'exact', 'shallow', 'below', 'above', 'unrated', 'groups tried', 'accepted',
    'rejected', 'skipped', 'oracle calls', 'canonical ratings', 'proposals'], nr), '');

  out.push('## Raw sample detail', '',
    'The raw exact sample rate is claimed-exact samples over samples observed (a claimed exact sample is always the returned one, ' +
    'because the first exact sample ends the trial); distinct hashes are those of the verified hits; the first-hit ordinal and the ' +
    'skipped ordinals show the early stops.', '');
  const sd = [];
  Object.keys(analysis.cells).forEach(function (cell) {
    ST.MODES.forEach(function (m) {
      const s = analysis.cells[cell].modes[m].samples;
      sd.push([cell, m, s.samplesObserved, s.claimedExactSamples, s.rawExactSampleRate, s.distinctHitHashes,
        JSON.stringify(s.firstHitOrdinal), JSON.stringify(s.skippedFirstExact), s.meanSampleWallMs, s.meanSampleCpuMs,
        s.censoredSamples]);
    });
  });
  out.push(table(['cell', 'mode', 'samples observed', 'claimed exact', 'raw exact sample rate', 'distinct hit hashes',
    'first-hit ordinal', 'skipped ordinals', 'mean sample wall ms', 'mean sample CPU ms', 'censored samples'], sd), '');

  out.push('## Post-timing canonical classification of the final phase A parent', '',
    'The omitted parent (a declared prototype restriction of IG-S04) is rated afterwards by the untouched canonical rating on an ' +
    'unpatched instance, with its own solution count. It never steered generation and never enters a hit count.', '');
  const pr = [];
  Object.keys(analysis.cells).forEach(function (cell) {
    ST.FRONTIER.forEach(function (m) {
      const p = analysis.cells[cell].modes[m].parents;
      pr.push([cell, m, p.samplesWithParent, p.perSample.exact, p.perSample.shallow, p.perSample.below, p.perSample.above,
        p.perSample.incomplete, p.perSample.ambiguous, p.perSample.unknown, p.perSample.unclassified, p.distinctParents,
        p.perDistinct.exact]);
    });
  });
  out.push(table(['cell', 'mode', 'samples with a parent', 'exact', 'shallow', 'below', 'above', 'incomplete', 'ambiguous',
    'unknown', 'unclassified', 'distinct parents', 'distinct exact'], pr), '');

  out.push('## Diagnostic selection per cell (a label for IG-S06, not an adopted algorithm and not a gate)', '');
  out.push(table(['cell', 'selected', 'winner', 'reason', 'controls complete', 'screen finding', 'formal gate',
    'zero-baseline feasibility', 'stability (share of resamples)'],
  Object.keys(analysis.cells).map(function (cell) {
    const c = analysis.cells[cell];
    return [cell, c.selection.selected, c.selection.winner, c.selection.reason, c.selection.controlsComplete, c.finding,
      c.formalGate, c.zeroBaselineFeasibility, Object.keys(c.selection.stability.frequency).filter(function (k) {
        return c.selection.stability.frequency[k] > 0; }).map(function (k) { return k + ' ' + pct(
        c.selection.stability.frequency[k]); }).join(', ') || 'n/a'];
  })), '', 'Rule: hits per ready CPU second, then per ready wall second, then F1, FC, FM, FU, FS, F0, among variants with every ' +
    'planned grid trial observed, both controls observed everywhere and at least one verified hit; otherwise F1 is an explicitly ' +
    'non-winning default. The fastest zero-hit mode is never a winner.', '');

  out.push('## Anomalies and identity', '');
  out.push(doc.anomalies.length === 0 ? 'No anomaly: no false exact flag, no duplicated hit, no grid-hash disagreement inside a ' +
    'cluster, no parent-hash mismatch.' : table(['key', 'kind'], doc.anomalies.map(function (x) { return [x.key, x.kind]; })), '');
  out.push('Identity problems: ' + (doc.identity.problems.length === 0 ? 'none' : doc.identity.problems.join('; ')) +
    '. Manifest hashes: ' + doc.identity.manifestHashes.map(function (h) { return h.slice(0, 12); }).join(', ') + '; runtime ' +
    doc.identity.runtimeFingerprints.map(function (h) { return h.slice(0, 12); }).join(', ') + '; harness ' +
    doc.identity.harnessFingerprints.map(function (h) { return h.slice(0, 12); }).join(', ') + '; budget ' +
    doc.budgetHash.slice(0, 12) + '; screen manifest ' + (doc.screenManifestHash ? doc.screenManifestHash.slice(0, 12) : 'n/a') + '.', '');

  const m = doc.machine;
  const dc = (m.entries || []).filter(function (e) { return e.shard === 'dev-check'; });
  const dcMs = dc.reduce(function (a, e) { return a + e.chargedMs; }, 0);
  const screenCommands = (m.entries || []).length - dc.length;
  out.push('## Machine time', '', 'Allocation ' + secs(m.allocationMs) + ' s' + (m.approvedExtraMs ? ' plus ' +
    secs(m.approvedExtraMs) + ' s approved' : '') + ', charged ' + secs(m.chargedMs) + ' s over ' + m.commands +
    ' wrapper commands (occupied wrapper time + 45 s grace each), remaining ' + secs(m.remainingMs) + ' s; priority waits ' +
    secs(m.priorityWaitMs) + ' s, not charged.' + (dc.length > 0 ? ' Of the charge, ' + secs(m.chargedMs - dcMs) +
    ' s belong to the ' + screenCommands + ' screen commands and ' + secs(dcMs) + ' s to the wrapped dev-check (a ledger ' +
    'entry of shard dev-check, entered at the r2 closure; the r1 summary showed the screen commands only).' : ''), '');
  if (cl) {
    out.push('## Dev-check disclosure: observations excluded from every number above', '');
    cl.devChecks.forEach(function (d) {
      out.push('The wrapped development check `' + d.file + '` (sha256 ' + d.sha256.slice(0, 12) + '…, ' + d.startedAt + ') ran ' +
        d.synthetic + ' synthetic engine tests and exercised **' + d.keys + ' real screen keys** (the keys of grid cluster 101 ' +
        'listed in the table below) BEFORE the screen, under an earlier harness (' + d.harnessFingerprint.slice(0, 12) + '…) and manifest (' +
        d.manifestHash.slice(0, 12) + '…). The screen ran under harness ' + doc.identity.harnessFingerprints.map(function (h) {
        return h.slice(0, 12) + '…'; }).join(', ') + ' and manifest ' + doc.identity.manifestHashes.map(function (h) {
        return h.slice(0, 12) + '…'; }).join(', ') + '. Its observations are not screen records: they enter no count, rate, ' +
        'interval or selection, and the screen ran those keys again from scratch. Compared afterwards with the screen\'s own trial ' +
        'of the same key (grid hash, outcome, claimed exact, the class of each sample, the budget stops): ' + d.identical +
        ' identical, ' + d.different + ' different. Charge: ' + (d.charge ? secs(d.charge.chargedMs) + ' s (occupied ' +
        secs(d.charge.occupiedMs) + ' s + 45 s grace) in the ledger.' : 'not in the ledger.'), '');
    });
    out.push('What changed between the dev-check and the final screen (from the development history; the report names only the two ' +
      'fingerprints):', '');
    cl.changedBefore.forEach(function (x) { out.push('- ' + x); });
    out.push('');
    out.push(table(['key', 'dev-check outcome', 'screen outcome', 'grid hash', 'claimed exact', 'sample classes', 'budget stops'],
      [].concat.apply([], cl.devChecks.map(function (d) {
        return d.jobs.map(function (j) {
          return [j.key.split('/').slice(2).join('/'), j.devOutcome, j.screenOutcome, j.same ? j.same.gridHash : null,
            j.same ? j.same.claimedExact : null, j.same ? j.same.sampleClasses : null, j.same ? j.same.budgetStops : null];
        });
      }))), '');
  }
  out.push('## Notes', '');
  doc.interpretationNotes.forEach(function (n) { out.push('- ' + n); });
  out.push('', '## Acceptance', '');
  out.push(table(['id', 'status', 'evidence'], doc.acceptance.map(function (a) { return [a.id, a.status, a.evidence]; })));
  return C.normaliseText(out.join('\n'));
}

// --- the entry points ----------------------------------------------------------------------------------------------------------------------

function writeManifest(repoRoot, round) {
  const dir = evidenceDir(repoRoot, round);
  const doc = screenManifest(repoRoot, round);
  C.writeJsonAtomic(repoRoot, path.join(dir, IG05.MANIFEST_FILE), doc);
  return { file: C.toPosix(path.relative(repoRoot, path.join(dir, IG05.MANIFEST_FILE))), hash: doc.hash,
    manifestHash: doc.manifestHash, keys: doc.plannedKeys.length, blocks: doc.blocks.length,
    projectedMachineMs: doc.projectedPhysicalPlan.projectedMachineMs, commands: doc.projectedPhysicalPlan.commands };
}

/** What r2 adds: the corrections list, the interpretation, the dev-check disclosure and the proof that r1's results stand. */
function closureOf(ctx) {
  const unchanged = unchangedFromR1(ctx.analysis, ctx.r1);
  if (!unchanged.primaryRatesEqual || !unchanged.verdictEqual) {
    throw new HarnessError('summary-refused', 'the revised statistics change what r1 reported (' + (unchanged.differing.join(', ') ||
      'the verdict') + '): stop for review');
  }
  if (ctx.selection.hash !== ctx.r1.selection.hash) {
    throw new HarnessError('summary-refused', 'the revised statistics change the selection: stop for review');
  }
  unchanged.selection = { file: 'selection.json', hash: ctx.r1.selection.hash, recomputedEqual: true };
  const started = ctx.data.records.filter(function (r) { return r.outcome !== 'unstarted'; }).length;
  const devChecks = devChecksOf(ctx.repoRoot, ctx.round, ctx.data, ctx.machine);
  const dev = devChecks[0] || null;
  const dc = (ctx.machine.entries || []).filter(function (e) { return e.shard === 'dev-check'; });
  const dcMs = dc.reduce(function (a, e) { return a + e.chargedMs; }, 0);
  const screenMs = ctx.machine.chargedMs - dcMs;
  const finalManifest = ctx.identity.manifestHashes[0];
  const finalHarness = ctx.identity.harnessFingerprints[0];
  return {
    revision: ctx.suffix.slice(1),
    corrections: [
      'Accounting: the wrapped dev-check (' + secs(dc.reduce(function (a, e) { return a + e.occupiedMs; }, 0)) + ' s occupied + 45 ' +
        's grace = ' + secs(dcMs) + ' s) is now recorded in ledger.json as an entry of shard dev-check; IG-S05 is charged ' +
        secs(ctx.machine.chargedMs) + ' s of ' + secs(ctx.machine.allocationMs) + ' s over ' + ctx.machine.commands +
        ' wrapper commands (r1 showed ' + secs(screenMs) + ' s over the ' + (ctx.machine.commands - dc.length) + ' screen commands).',
      'Setup-amortised sensitivity: r1 divided one grid cost by N per trial whatever the number of samples; r2 uses readyTotal - ' +
        'gridCost + m x gridCost / N per trial, m being the samples that started, so a one-sample early stop and a two-sample trial ' +
        'differ (corrected denominators below, r1\'s beside them). Every rate stays 0.',
      'Intervals: every interval whose resamples are all identical (here the all-zero [0, 0] ones, with no hit in either arm) is ' +
        'labelled degenerate: not evidence of equivalence or non-inferiority. The numbers are r1\'s.',
      'The interpretation above and the "Separate problems" table were added; the funnel now also counts empty frontiers.',
      'The dev-check disclosure below was added; its observations stay excluded from every count, rate, interval and selection.',
      'Verified unchanged from r1: every hit count, the primary, cold-inclusive and conditional rates, the outcome counts and the ' +
        'interval sums of all 32 cell-mode rows, the verdict, and the selection (the recomputed selection document has the hash of ' +
        'selection.json, ' + ctx.r1.selection.hash.slice(0, 12) + '…, which stands for IG-S06 with the budget hash ' +
        ctx.budgets.hash.slice(0, 12) + '…).',
      'B03: the pack author reviewed the raw paired coverage and passed it.'
    ],
    interpretation: interpretationOf(ctx.analysis, started),
    unchangedFromR1: unchanged,
    devChecks: devChecks,
    changedBefore: [
      'plans/ig-s05.cjs: the admission-estimate rule, which only affects the physical packing (a frontier trial is estimated from ' +
        'the largest pilot figure of any frontier mode of its cell, with a floor of 8 s for mega12, mega16 and samurai and 1.5 s for ' +
        'classic9: the dev-check saw a mega16 FC trial at 3.8 s against a 0.7 s pilot). The manifest hash changed from ' +
        (dev ? dev.manifestHash.slice(0, 12) : 'n/a') + '… to ' + finalManifest.slice(0, 12) + '…; no key, seed, order, budget ' +
        'vector, guard or generation setting changed.',
      'ig05-aggregate.cjs: the estimates text of the screen manifest (documentation only). README.md (not part of the fingerprint).',
      'Unchanged between the dev-check and the screen: screen.cjs, ig05-worker.cjs, ig05-run.cjs, ig05-stats.cjs, ig05-test.cjs, ' +
        'ig05-dev-check.cjs, worker.cjs, run.cjs and every IG-S01 to IG-S04 file; the screen manifest was saved after the dev-check ' +
        'and before the first screen command.',
      'After the screen (this revision): ig05-stats.cjs, ig05-aggregate.cjs and ig05-test.cjs, reporting only; every screen command ' +
        'ran under harness ' + finalHarness.slice(0, 12) + '…, this summary was written by ' + C.harnessFingerprint().fingerprint.slice(0, 12) + '….'
    ]
  };
}

function build(repoRoot, round, suffix) {
  const dir = evidenceDir(repoRoot, round);
  const sfx = suffix || '';
  const revision = sfx !== '';
  const data = load(repoRoot, round);
  const budgets = PLAN.loadBudgets(round, repoRoot);
  const smFile = path.join(dir, IG05.MANIFEST_FILE);
  const sm = fs.existsSync(smFile) ? C.readJson(smFile) : null;
  if (!sm) throw new HarnessError('summary-refused', 'the screen manifest was never saved: there is no preregistration to summarise');
  if (data.catalogue === null) throw new HarnessError('summary-refused', 'no command recorded the catalogue: nothing was run');
  const identity = identityOf(data, sm, budgets);
  const analysis = ST.analyse({ records: data.records, jobs: data.manifest.jobs, cells: PLAN.CELLS, seeds: PLAN.seedsOf(round),
    levels: data.catalogue.levels, requested: PLAN.LEVEL, quantumMs: data.quantumMs });
  const evidenceStatus = data.manifest.evidenceStatus;
  const machine = machineOf(repoRoot, round);
  // a revision rewrites the revised statistics only: the selection of r1 stands (and is proved unchanged)
  const files = revision ? ['rates' + sfx + '.json', 'paired-intervals' + sfx + '.json', 'summary' + sfx + '.json',
    'summary' + sfx + '.md'] : ['rates.json', 'paired-intervals.json', 'selection.json', 'summary.json', 'summary.md'];
  const ctx = { repoRoot: repoRoot, round: round, suffix: sfx, data: data, analysis: analysis, identity: identity, machine: machine,
    sm: sm, budgets: budgets, evidenceStatus: evidenceStatus, quantumMs: data.quantumMs, files: files };
  ctx.acceptance = acceptance(analysis, identity, data, { b03Reviewed: revision });
  const label = revision ? sfx.slice(1) : 'r1';
  const rates = ratesDoc(analysis, round, evidenceStatus, data.quantumMs, label);
  const paired = pairedDoc(analysis, round, evidenceStatus, label);
  const selection = selectionDoc(analysis, round, evidenceStatus, sm, budgets);
  if (revision) {
    ctx.r1 = readR1(repoRoot, round);
    ctx.selection = selection;
    ctx.closure = closureOf(ctx);
  }
  const summary = summaryDoc(ctx);
  // everything is built (and rendered) before the first file is written: a failure leaves no partial revision behind
  const md = renderSummary(summary, analysis, ctx);
  const out = [[rates, 'rates'], [paired, 'paired-intervals']];
  if (!revision) out.push([selection, 'selection']);
  out.forEach(function (pair) { C.writeJsonAtomic(repoRoot, path.join(dir, pair[1] + sfx + '.json'), pair[0]); });
  C.writeJsonAtomic(repoRoot, path.join(dir, 'summary' + sfx + '.json'), summary);
  C.writeTextExclusive(repoRoot, path.join(dir, 'summary' + sfx + '.md'), md);
  return { dir: C.toPosix(path.relative(repoRoot, dir)), files: files, verdict: analysis.verdict, summaryHash: summary.hash,
    selectionHash: selection.hash, selectionWritten: !revision };
}

function main(argv) {
  const opts = parseArgs(argv);
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const out = opts.stage === 'manifest' ? writeManifest(repoRoot, opts.round) : build(repoRoot, opts.round, opts.suffix);
  process.stdout.write(JSON.stringify(out) + '\n');
  return 0;
}

module.exports = { parseArgs, screenManifest, writeManifest, load, identityOf, acceptance, ratesDoc, pairedDoc, selectionDoc,
  summaryDoc, renderSummary, build, machineOf, table, fmt, devChecksOf, unchangedFromR1, interpretationOf, closureOf };

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write('IG error [' + (err && err.code ? err.code : 'unexpected') + ']: ' +
      (err && err.message ? err.message : String(err)) + '\n');
    process.exitCode = C.exitCodeOf(err);
  }
}
