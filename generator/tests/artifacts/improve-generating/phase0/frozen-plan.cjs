'use strict';

/*
 * IG-S10: the frozen-rerun handoff. frozen-rerun-plan.json lists, in dependency order, the exact one-command rerun of every
 * task against the frozen catalogue, the populations and their 40-seed expansions, the adapter capability dry runs against the
 * CURRENT source, the cost projections from this round's measured timings, the four unapproved Nightmare extensions and the
 * approvals a later run needs. It is a PROPOSAL: it grants no execution authority, spends nothing and claims no adapter has
 * passed on an unknown future source (the capability checks are a dry run on today's runtime). Every cost is a Projection:
 * its formula, its proxy, its grace (45 s per wrapper command) and its unknown or censored bounds are stated, never priced
 * at zero.
 */
const C = require('./common.cjs');
const M = require('./manifest.cjs');
const L = require('./loader.cjs');
const RUN = require('./run.cjs');
const RC = require('./reconcile.cjs');

const get = RC.get;
const GRACE = C.GUARDS.graceMs;
const WINDOW = M.commandWindowMs(C.GUARDS.commandMs);
const FROZEN = C.ROUND_FROZEN;
const FREEZE_REL = '.\\docs\\improve-generating\\evidence\\phase0\\freeze.json';
const BUDGET_REL = '.\\docs\\improve-generating\\evidence\\phase0\\frozen-budget.json';
const DISPATCHER = '.\\generator\\tests\\artifacts\\improve-generating\\phase0\\Invoke-IgTask.ps1';

const ORDER = Object.freeze(['IG-S01', 'IG-S02', 'IG-S03', 'IG-S04', 'IG-S05', 'IG-S06', 'IG-S07', 'IG-S08', 'IG-S09', 'IG-S10']);
const DEPENDS = Object.freeze({
  'IG-S01': [], 'IG-S02': ['IG-S01'], 'IG-S03': ['IG-S02'],
  'IG-S04': ['IG-S03'], 'IG-S05': ['IG-S04 (its budgets are recomputed on the frozen pilot first)'],
  'IG-S06': ['IG-S05 (frozen SM2 review and its selection)', 'a separate budget approval', 'implementation of ig-s06 (not written)'],
  'IG-S07': ['IG-S05 (frozen reporting)', 'IG-S02/IG-S03 frozen baselines'], 'IG-S08': ['IG-S07'], 'IG-S09': ['IG-S08'],
  'IG-S10': ['IG-S09', 'IG-S06 when it was run']
});
const POPULATION = Object.freeze({
  'IG-S01': 'loader parity on classic4/veryEasy/1 and classic9/hard/1 plus the synthetic self-test',
  'IG-S02': 'H3: Nightmare on mega16[1,2,3], mega12[1,2,3], samurai[1,2,42], classic9[1,2,3], killer[1,2,3], greaterThan[1,2,3]; ' +
    'native-w1 against attempts-w4 (36 requests)',
  'IG-S03': 'the 18 saved H3 puzzles audited (four solver sets, injected failures) plus scoped-attempts-w4 on H3 (18) and ' +
    'scoped-native-w1 on six seeds (6)',
  'IG-S04': 'pilot grid seeds 11 and 12, classic9/mega12/mega16/samurai Nightmare, eight modes (64 trials); recomputes the budgets',
  'IG-S05': 'SM2 grid seeds 101-140 (40 clusters per cell), the same four cells and eight modes, at most two samples per trial ' +
    '(1,280 trials) - the decision population of IG-S-Q05',
  'IG-S06': 'held-out request seeds 201-240 on the four frontier cells, native-mixed and the selected frontier only (two modes x ' +
    '40 = 320 requests, NOT four modes), plus the six-cell two-seed (201, 202) diagnostic population N1/CA4/CQ1/CQ4 (40 primary ' +
    '+ 4 optional)',
  'IG-S07': 'the nine profiled requests and three controls of this round (same cells and seeds)',
  'IG-S08': 'Jigsaw Expert seed 1111 (240 s guard) and the control seed 1100',
  'IG-S09': 'Greater-Than Normal 300-319 and Nightmare 700-709 (all ten shards, including the eight rows left unstarted in ' +
    'the first round), trace summary, G0/G1 plus two observer-free controls',
  'IG-S10': 'reconciliation of the frozen evidence, the frozen gate inputs (gate.cjs) and the closure report'
});

function commandOf(task, planOnly) {
  return '& \'' + DISPATCHER + '\' -Task ' + task + ' -Round ' + FROZEN + (planOnly ? ' -PlanOnly' :
    ' -FreezeReceipt \'' + FREEZE_REL + '\' -BudgetReceipt \'' + BUDGET_REL + '\'');
}

function ceilDiv(a, b) { return Math.ceil(a / b); }

/** The final-chain occupied time and command count of a task's measured commands in this round. */
function measuredOf(entry) {
  let occupiedMs = 0;
  let commands = 0;
  entry.shards.forEach(function (s) {
    s.attempts.filter(function (a) { return a.inFinalChain; }).forEach(function (a) {
      occupiedMs += typeof a.occupiedMs === 'number' ? a.occupiedMs : 0;
      commands++;
    });
  });
  return { occupiedMs: occupiedMs, finalChainCommands: commands };
}

function adapterDryRun(set, manifest) {
  const sets = new Map();
  manifest.jobs.forEach(function (j) { sets.set(JSON.stringify(j.adapterIds || []), j.adapterIds || []); });
  const out = [];
  sets.forEach(function (ids) {
    if (ids.length === 0) return;
    try {
      const plan = L.describePlan(L.buildLoadPlan(set, ids.map(L.getAdapter)));
      out.push({ adapterIds: ids, adapterHashes: plan.adapterHashes, transforms: plan.transforms.length,
        patchedFiles: plan.patchedFiles, dryRun: 'ok on the current runtime (unique anchors, the patch compiles as text)' });
    } catch (err) {
      out.push({ adapterIds: ids, dryRun: 'FAILED on the current runtime: ' + (err.code || err.name) + ': ' + err.message,
        unsupportedSource: true });
    }
  });
  return out;
}

function band(valueMs) { return { lowMs: Math.round(valueMs * 0.5), highMs: Math.round(valueMs * 2) }; }

/**
 * ctx: { repoRoot, set (loaded source set), coverage, evidence, headline, sm2, sm1, runtimeFingerprint }.
 */
function buildFrozenPlan(ctx) {
  const repoRoot = ctx.repoRoot;
  const coverage = ctx.coverage;
  const byTask = {};
  coverage.tasks.forEach(function (t) { byTask[t.task] = t; });

  // --- the nine tasks with a harness ----------------------------------------------------------------------------------------
  const steps = ORDER.map(function (task) {
    const base = { task: task, order: ORDER.indexOf(task) + 1, dependsOn: DEPENDS[task], population: POPULATION[task],
      planOnlyCommand: commandOf(task, true), command: commandOf(task, false) };
    if (task === 'IG-S06') {
      return Object.assign(base, { implemented: false, frozenManifest: null,
        status: 'NOT IMPLEMENTED: deferred in the first round; no plan, no manifest, no adapter, no command that runs yet',
        note: 'the command above is the documented form; it fails closed with plan-missing until plans/ig-s06.cjs exists' });
    }
    const manifest = M.buildManifest(task, FROZEN);
    const plan = RUN.planOnly({ task: task, round: FROZEN, freezeReceipt: null, budgetReceipt: null, runtimeLabel: null }, repoRoot);
    const adapters = adapterDryRun(ctx.set, manifest);
    return Object.assign(base, {
      implemented: true,
      frozenManifest: { jobs: manifest.jobs.length, shards: manifest.shards.length, manifestHash: manifest.manifestHash,
        shardNames: manifest.shards.map(function (s) { return s.shard + ' (' + s.kind + ', ' + s.jobKeys.length + ' keys)'; }) },
      adapters: { used: plan.adapters, dryRunOnCurrentRuntime: adapters,
        reading: 'a dry run on the runtime loaded today; the rerun repeats it on the frozen source and stops with ' +
          'unsupported-source (exit 2) for the author if a hook contract changed; never a fallback to the old engine' },
      planOnlyProjection: { projectedMachineMs: plan.projectedMachineMs,
        commands: plan.shards.reduce(function (n, s) { return n + (s.physicalPlan ? s.physicalPlan.commands.length : 1); }, 0),
        basis: 'admission estimates plus 45 s per command (the dispatcher\'s -PlanOnly figure; a PLANNING figure, not a guaranteed ' +
          'upper bound: validation, cleanup, diagnostics and retries are not all in the admission estimates)',
        gateBeforeApproval: plan.gate.state, budgetBeforeApproval: 'canAdmit false until a budget receipt' }
    });
  });

  // --- the projections from this round's measured timings ------------------------------------------------------------------------
  const measured = {};
  ORDER.filter(function (t) { return byTask[t]; }).forEach(function (t) { measured[t] = measuredOf(byTask[t]); });
  const project = function (task, scale, extraOccupiedMs, notes) {
    const step = steps.find(function (s) { return s.task === task; });
    const m = measured[task];
    const occupied = Math.round(m.occupiedMs * scale + extraOccupiedMs);
    const shardCommands = step.frozenManifest.shards;
    const commandsLow = Math.max(shardCommands, ceilDiv(occupied, WINDOW));
    return { basis: scale === 1 && extraOccupiedMs === 0 ? 'measured occupied time of the final run chain of this round' :
      'measured occupied time scaled (x' + scale + ') plus the stated additions',
    measuredOccupiedMs: m.occupiedMs, measuredFinalChainCommands: m.finalChainCommands, scale: scale,
    firstRoundChargedMs: ctx.budget && ctx.budget.tasks[task] ? ctx.budget.tasks[task].chargedMs : null,
    additionsMs: Math.round(extraOccupiedMs), projectedOccupiedMs: occupied,
    graceFormula: '45 s per wrapper command; commandsLow = max(shards, ceil(occupied / ' + (WINDOW / 1000) + ' s window))',
    commandsLow: commandsLow, commandsAdmissionPlan: Math.max(commandsLow, step.planOnlyProjection.commands),
    lowChargedMs: occupied + GRACE * commandsLow, admissionPlanChargedMs: Math.max(step.planOnlyProjection.projectedMachineMs,
      occupied + GRACE * commandsLow),
    admissionPlanReading: 'the dispatcher\'s admission-estimate plan (a planning figure; not a guaranteed upper bound)',
    notes: notes || [] };
  };

  // IG-S09: the eight unstarted rows are priced from the six Nightmare pairs, never at zero
  const s09 = byTask['IG-S09'];
  const nightmare = s09.shards.filter(function (s) { return /^nightmare-/.test(s.shard) && s.status === 'recorded'; });
  const perPair = nightmare.map(function (s) {
    const occ = s.attempts.filter(function (a) { return a.inFinalChain; }).reduce(function (n, a) { return n + a.occupiedMs; }, 0);
    return occ / 2;
  });
  const sum = function (xs) { return xs.reduce(function (n, x) { return n + x; }, 0); };
  const pairMean = sum(perPair) / perPair.length;
  const unstartedPairs = 4;
  const s09Add = pairMean * unstartedPairs;
  const projections = {};
  ['IG-S01', 'IG-S02', 'IG-S03', 'IG-S04', 'IG-S07', 'IG-S08'].forEach(function (t) { projections[t] = project(t, 1, 0); });
  projections['IG-S05'] = project('IG-S05', 5, 0, ['40 clusters instead of 8: the per-trial cost of each cell is unchanged, the ' +
    'trial count is x5 (1,280 trials); the mega16 ordinary-only and frontier budget stops dominate']);
  projections['IG-S09'] = project('IG-S09', 1, s09Add, ['the eight unstarted Nightmare rows (4 pairs, 706-709) are priced from the ' +
    'three completed Nightmare shards: mean ' + Math.round(pairMean / 1000) + ' s occupied per pair (range ' +
    Math.round(Math.min.apply(null, perPair) / 1000) + '-' + Math.round(Math.max.apply(null, perPair) / 1000) + ' s), x4 pairs; ' +
    'the cost of the unstarted rows is UNKNOWN and priced between the lowest and the highest observed pair, not at zero']);
  projections['IG-S09'].unstartedRowsCostBoundsMs = { low: Math.round(Math.min.apply(null, perPair) * unstartedPairs),
    mean: Math.round(s09Add), high: Math.round(Math.max.apply(null, perPair) * unstartedPairs) };
  const s08 = byTask['IG-S08'];
  projections['IG-S08'].censoredBound = { lowerBoundMs: 240015, guardLimitedPlanningMs: C.GUARDS.jigsawMs + 5000,
    reading: 'a censored run costs at least its 240.015 s lower bound; its 240 s guard (plus a 5 s cleanup allowance) is a planning ' +
      'limit, not a measured or guaranteed upper bound and no safe ceiling is inferred; a tail that disappears costs less',
    observedCensored: s08.censored.length };
  projections['IG-S10'] = { basis: 'the task\'s own allocation (analysis only)', projectedOccupiedMs: 20000, commandsLow: 1,
    commandsAdmissionPlan: 1, firstRoundChargedMs: ctx.budget && ctx.budget.tasks['IG-S10'] ? ctx.budget.tasks['IG-S10'].chargedMs : null,
    lowChargedMs: 20000 + GRACE, admissionPlanChargedMs: M.ALLOCATIONS_MS['IG-S10'], notes: [] };
  steps.forEach(function (s) { if (projections[s.task]) s.projection = projections[s.task]; });

  // --- IG-S06 (not implemented): the formula, never an invented measurement ------------------------------------------------------
  const cells = {};
  ctx.headline.forEach(function (h) { cells[h.cell] = h; });
  const share = {};
  ctx.sm1.cells.forEach(function (c) {
    const m = /:(?:nightmare):/.exec(c.key);
    if (!m) return;
    ['mega16', 'mega12', 'samurai', 'classic9'].forEach(function (cell) { if (c.key.indexOf('/' + cell + ':') > 0) share[cell] = c.sampleShare; });
  });
  const f1Ratio = {};
  ctx.sm2.cells.forEach(function (c) { f1Ratio[c.cell] = c.f1SampleCostVsNative.f1OverEqualWeightMix; });
  const seconds = function (x) { return x * 1000; };
  const poolMs = function (cell) { return seconds(cells[cell].arms['attempts-w4'].coldWallS.p50); };
  const serialMs = function (cell) { return seconds(cells[cell].arms['native-w1'].coldWallS.p50); };
  const FRONTIER_CELLS = ['classic9', 'mega12', 'mega16', 'samurai'];
  const confirmatory = FRONTIER_CELLS.map(function (cell) {
    const native = poolMs(cell);
    const frontierLow = native * (1 - share[cell] + share[cell] * f1Ratio[cell]);
    return { cell: cell, requests: 80, modes: ['native-mixed', 'selected-frontier'],
      nativeMixedMsPerRequest: Math.round(native), frontierMsPerRequestCentral: Math.round(native),
      frontierMsPerRequestLow: Math.round(frontierLow), requestGuardMs: C.GUARDS.requestMs,
      centralOccupiedMs: Math.round(native * 80), lowOccupiedMs: Math.round(native * 40 + frontierLow * 40),
      guardOnlyOccupiedMs: C.GUARDS.requestMs * 80, sampleShare: share[cell], f1SampleCostOverEqualWeightMix: f1Ratio[cell] };
  });
  const diag = ['classic9', 'mega12', 'mega16', 'samurai', 'killer', 'greaterThan'].map(function (cell) {
    const n1 = serialMs(cell);
    const pool = poolMs(cell);
    const requiredCq1 = cell !== 'mega16' && cell !== 'samurai';
    // N1 serial + CA4 pooled + CQ4 pooled (CA4 = CQ4 on Killer and Greater-Than: one observation) + CQ1 where required
    const aliasOnce = cell === 'killer' || cell === 'greaterThan';
    const perSeed = n1 + pool + (aliasOnce ? 0 : pool) + (requiredCq1 ? n1 : 0);
    return { cell: cell, seeds: [201, 202], perSeedMs: Math.round(perSeed), occupiedMs: Math.round(perSeed * 2),
      optionalCq1Ms: requiredCq1 ? 0 : Math.round(n1 * 2) };
  });
  const confCentral = sum(confirmatory.map(function (c) { return c.centralOccupiedMs; }));
  const confLow = sum(confirmatory.map(function (c) { return c.lowOccupiedMs; }));
  const diagOcc = sum(diag.map(function (c) { return c.occupiedMs; }));
  const diagOptional = sum(diag.map(function (c) { return c.optionalCq1Ms; }));
  // the phases are separate commands (the diagnostic runs on the six-cell seeds, the confirmatory on the selected frontier)
  const s06Scenario = function (confirmatoryMs, diagnosticMs) {
    const c1 = Math.max(1, ceilDiv(confirmatoryMs, WINDOW));
    const c2 = Math.max(1, ceilDiv(diagnosticMs, WINDOW));
    return { occupiedMs: confirmatoryMs + diagnosticMs, commands: { confirmatory: c1, diagnostic: c2, total: c1 + c2 },
      chargedMs: confirmatoryMs + diagnosticMs + GRACE * (c1 + c2) };
  };
  const s06Low = s06Scenario(confLow, diagOcc);
  const s06Central = s06Scenario(confCentral, diagOcc);
  const s06Occupied = s06Central.occupiedMs;
  // the guard-only scenario: every observation a request of its own at the 180 s request guard plus the 60 s validation guard
  const guardObservations = 320 + 40 + 4;
  const guardPerRequestMs = C.GUARDS.requestMs + C.GUARDS.validationMs;
  const s06Guard = { observations: guardObservations, perRequestMs: guardPerRequestMs, commands: guardObservations,
    occupiedMs: guardObservations * guardPerRequestMs, chargedMs: guardObservations * (guardPerRequestMs + GRACE) };
  const s06 = {
    implemented: false,
    status: 'DEFERRED in the first round (not passed, not refuted); this is a proposal for when to implement and run it',
    proposal: {
      implementWhen: 'after the frozen IG-S05 screen has been reviewed by the plan author (Fable) and the pack author (Astra), and ' +
        'after a separate budget approval for IG-S06 itself; the pre-freeze result (0 verified hits in 256 trials, native kinds ' +
        'included) is not the reason to compose anything',
      conditionalOnFrozenScreen: 'if the frozen screen still finds no variant with verified hits, IG-S06 composes a non-winning ' +
        'F1 default: ask the author whether to run it at all (a full-request frontier with zero grid yield is a cost measurement ' +
        'only)',
      developmentEstimate: '90-150 min of development by the pack author\'s estimate (check-list), separate from machine time',
      keepsFromTheFirstRound: 'the unchanged selection and budget hashes (selection.json 67420e10..., budgets f0a0c422...); both ' +
        'are re-derived on the frozen pilot first'
    },
    populations: { confirmatory: { seeds: '201-240', cells: FRONTIER_CELLS, modes: ['native-mixed', 'selected-frontier'],
      requests: 320, note: 'two modes x 40 requests on each of the four frontier cells, NOT four modes x 40 (the controls and ' +
        'the frontier are the only confirmatory modes; native kinds and proposal-only are compared on the 40 SM2 grid clusters)',
      perCell: confirmatory },
    diagnostic: { seeds: [201, 202], cells: 6, modes: 'N1, CA4, CQ1, CQ4 (CA4 = CQ4 on Killer and Greater-Than, one observation)',
      primaryObservations: 40, optionalLargeBoardCq1: 4, perCell: diag } },
    projection: {
      label: 'PLANNING SCENARIOS with an INCOMPLETE upper bound: none of the three is a guaranteed ceiling of a whole IG-S06 run',
      formula: 'confirmatory: for each cell and mode, requests x the cold wall of the IG-S02 attempts-w4 arm (native-mixed measured; ' +
        'selected frontier UNMEASURED, so priced at the native cost as the central figure); low: the frontier request priced ' +
        'native x (1 - s + s x r), s the IG-S07 sample share, r the F1/equal-weight-mix sample CPU ratio of IG-S05 (a Derived ' +
        'lower figure that credits the unmeasured saving); diagnostic: N1 and CQ1 at the IG-S02 serial wall, CA4 and CQ4 at the ' +
        'pooled wall; commands per phase: max(1, ceil(phase occupied / ' + (WINDOW / 1000) + ' s window)) for the confirmatory and ' +
        'the diagnostic phase separately; grace 45 s per command; guard scenario: ' + guardObservations + ' observations (320 ' +
        'confirmatory + 40 primary and 4 optional diagnostic), each its own command at the 180 s request guard plus the 60 s ' +
        'validation guard, plus the grace',
      scenarios: { low: s06Low, central: s06Central, guardScenario: s06Guard },
      confirmatoryOccupiedMs: { low: confLow, central: confCentral },
      diagnosticOccupiedMs: { central: diagOcc, optionalLargeBoardCq1: diagOptional },
      occupiedMs: { low: s06Low.occupiedMs, central: s06Central.occupiedMs, guardScenario: s06Guard.occupiedMs },
      commands: { low: s06Low.commands.total, central: s06Central.commands.total, guardScenario: s06Guard.commands },
      chargedMs: { low: s06Low.chargedMs, central: s06Central.chargedMs, guardScenario: s06Guard.chargedMs },
      omittedFromTheGuardScenario: ['the engine-free scheduler and composition tests (unwrapped, no machine charge expected)',
        'request re-projection and pool-invariance checks', 'startup, validation and cleanup beyond the two named guards',
        'retries, resumed and failed attempts (each a command with its own grace)', 'dev checks and diagnostics outside the shard ' +
        'plan', 'the frontier phase-A work of a request that the 180 s guard does not bound separately'],
      uncertainty: 'the frontier request cost is unmeasured: the central figure assumes no saving, the low figure the formula; ' +
        'the guard scenario prices every observation at both guards but omits the components listed; a request that reaches the ' +
        '180 s guard needs its own physical command',
      firstRoundAllocation: '24 minutes (not run, not transferable)' }
  };
  const s06step = steps.find(function (s) { return s.task === 'IG-S06'; });
  s06step.projection = { lowChargedMs: s06.projection.chargedMs.low, centralChargedMs: s06.projection.chargedMs.central,
    guardScenarioChargedMs: s06.projection.chargedMs.guardScenario, commandsLow: s06.projection.commands.low,
    commandsCentral: s06.projection.commands.central, commandsGuardScenario: s06.projection.commands.guardScenario,
    firstRoundChargedMs: 0, basis: 'formula (see ig06.projection); the guard scenario is a planning scenario with an incomplete upper bound' };

  // --- the four unapproved Nightmare extensions -------------------------------------------------------------------------------------
  // cost per SM2 trial of a proxy cell: the cold wall of its eight clusters (all modes) times the overhead factor of the screen
  const rates = ctx.evidence.s05Rates.doc;
  const coldWall = {};
  let coldWallAll = 0;
  ['classic9', 'mega12', 'mega16', 'samurai'].forEach(function (cell) {
    let w = 0;
    Object.keys(rates.cells[cell].modes).forEach(function (m) { w += rates.cells[cell].modes[m].coldInclusive.wallMs; });
    coldWall[cell] = w;
    coldWallAll += w;
  });
  const overhead = measured['IG-S05'].occupiedMs / coldWallAll;
  const trialMs = {};
  Object.keys(coldWall).forEach(function (cell) { trialMs[cell] = coldWall[cell] * overhead / 64; });
  const proxyOf = {
    wordoku: { proxy: 'classic9', scale: 4.96 / 4.91, basis: 'same 81-cell geometry and 8 attempts; historical Nightmare I5 4.96 s ' +
      'against classic9 R5 4.91 s' },
    sohei: { proxy: 'samurai', scale: 27.49 / 26.74, basis: 'two-attempt multigrid; CV3 Nightmare 27.49 s against samurai 26.74 s ' +
      '(288 against 369 cells)' },
    flower: { proxy: 'samurai', scale: 23.07 / 26.74, basis: 'two-attempt multigrid; CV3 Nightmare 23.07 s against samurai 26.74 s ' +
      '(189 against 369 cells)' },
    butterfly: { proxy: 'mega12', scale: 32.82 / 23.72, basis: 'four attempts and 144 cells like mega12; CV3 Nightmare 32.82 s ' +
      'against mega12 deep 23.72 s' }
  };
  const extensions = Object.keys(proxyOf).map(function (cell) {
    const p = proxyOf[cell];
    const trial = trialMs[p.proxy] * p.scale;
    const phases = { pilot: trial * 16, sm2: trial * 320, requests: poolMs(p.proxy) * p.scale * 80 };
    const scenarios = { low: phasePlan(phases, 0.5), central: phasePlan(phases, 1), high: phasePlan(phases, 2) };
    const central = scenarios.central;
    return {
      cell: cell, status: 'UNAPPROVED: a separate Nightmare extension; no execution authority; not covered by classic9 or samurai',
      cells: { variantId: cell },
      populations: { pilot: { gridSeeds: [11, 12], modes: 8, trials: 16 }, sm2: { gridSeeds: '101-140', modes: 8, trials: 320 },
        requests: { seeds: '201-240', modes: ['native-mixed', 'selected-frontier'], requests: 80 } },
      proxy: p.proxy, proxyScale: Math.round(p.scale * 1000) / 1000, proxyBasis: p.basis,
      confidence: 'very low (the report: no measurement of this cell\'s frontier or request exists in this pack)',
      projection: {
        label: 'PLANNING SCENARIOS with an incomplete upper bound (validation, cleanup, diagnostics and retries are not all included)',
        formula: 'per phase: trials x (proxy cell cold wall per trial x screen overhead factor ' + Math.round(overhead * 1000) / 1000 + ' x proxy ' +
          'scale), requests x (proxy pooled cold wall x proxy scale); frontier requests priced at the native cost; commands per ' +
          'phase = max(1, ceil(phase occupied / ' + (WINDOW / 1000) + ' s window)) because the pilot, the screen and the requests ' +
          'cannot share an invocation across their dependency boundaries (each phase reads the previous phase\'s frozen ' +
          'result); grace 45 s per command; recomputed separately for each scenario',
        pilotOccupiedMs: central.phases.pilot.occupiedMs, sm2OccupiedMs: central.phases.sm2.occupiedMs,
        requestsOccupiedMs: central.phases.requests.occupiedMs, occupiedMs: central.occupiedMs, commands: central.commands,
        commandsByPhase: { pilot: central.phases.pilot.commands, sm2: central.phases.sm2.commands, requests: central.phases.requests.commands },
        chargedMs: central.chargedMs, scenarios: scenarios,
        scenarioBand: { lowChargedMs: scenarios.low.chargedMs, highChargedMs: scenarios.high.chargedMs,
          note: 'x0.5 to x2 on the occupied time, commands recomputed per scenario: a planning band for a proxy of very low ' +
            'confidence, not a statistical interval and not a guaranteed bound' },
        unknownOrCensored: 'the frontier behaviour of these boards is unmeasured: a frontier trial that reaches its 45 s sample guard ' +
          'or the 180 s request guard costs up to that guard; none is priced at zero'
      }
    };
  });
  const extCharged = sum(extensions.map(function (e) { return e.projection.chargedMs; }));
  const extLow = sum(extensions.map(function (e) { return e.projection.scenarios.low.chargedMs; }));
  const extHigh = sum(extensions.map(function (e) { return e.projection.scenarios.high.chargedMs; }));

  // --- totals and the approvals a later run needs ----------------------------------------------------------------------------------
  const base = ORDER.filter(function (t) { return t !== 'IG-S06'; }).map(function (t) { return steps.find(function (s) { return s.task === t; }); });
  const baseLow = sum(base.map(function (s) { return s.projection.lowChargedMs; }));
  const baseAdmission = sum(base.map(function (s) { return s.projection.admissionPlanChargedMs; }));
  const approvals = [
    { id: 'A1', who: 'orchestrator', what: 'the freeze receipt (ig-s-freeze/1): accepted MS17b/MS18e labels, the runtime and catalogue ' +
      'fingerprints, the accepted limits and defaults, an attestation; a ratingVersion 3 flag or a round name alone is not proof ' +
      'of a freeze' },
    { id: 'A2', who: 'orchestrator with the plan author (Fable)', what: 'the budget receipt (ig-s-budget/1): the authorised total, ' +
      'per-task figures and source; no frozen run is charged silently to the first round' },
    { id: 'A3', who: 'plan author (Fable)', what: 'the projection assumption set and the non-inferiority margin that gate.cjs needs before ' +
      'it presents a numeric request-fraction projection; without them it reports projection-awaits-author-review' },
    { id: 'A4', who: 'plan author (Fable) with the pack author (Astra)', what: 'IG-S06: its implementation, its populations and its own ' +
      'budget (a separate approval; the first-round allocation was not run and does not transfer)' },
    { id: 'A5', who: 'plan author (Fable) with the pack author (Astra)', what: 'each of the four Nightmare extensions separately ' +
      '(wordoku, sohei, flower, butterfly); none is covered by classic9 or samurai' },
    { id: 'A6', who: 'pack author (Astra)', what: 'IG-S09 Nightmare 706-709 (eight rows unstarted in the first round): whether the frozen ' +
      'run includes them; no catch-up run is authorised before the freeze' }
  ];
  return {
    schema: 'ig-s-frozen-plan/1', task: 'IG-S10', round: RC.ROUND, evidenceStatus: C.EVIDENCE_PROVISIONAL,
    provisionalNotice: RC.NOTE_PROVISIONAL,
    status: 'PROPOSAL - grants no execution authority. Every frozen run needs the receipts and approvals below, and its own ' +
      'budget; nothing here is charged to the first round. Every cost figure is a planning scenario: none is a guaranteed upper bound.',
    runtimeFingerprintToday: ctx.runtimeFingerprint,
    receipts: { freeze: { path: FREEZE_REL, schema: 'ig-s-freeze/1' }, budget: { path: BUDGET_REL, schema: 'ig-s-budget/1' },
      note: 'both receipts must fingerprint the runtime that is loaded at rerun time; the fingerprint above is only today\'s ' +
        'pre-freeze reference. The orchestrator supplies them.' },
    window: { commandMs: C.GUARDS.commandMs, windowMs: WINDOW, graceMsPerCommand: GRACE,
      note: 'the same low-priority wrapper, 45 s quiet period charged per command, 300 s backstop, difficulty-v3 priority' },
    steps: steps,
    ig06: s06,
    extensions: { status: 'four UNAPPROVED Nightmare extensions; none is allowlisted by this pack', cells: extensions,
      combinedChargedMs: extCharged, combinedScenarioBandMs: { low: extLow, high: extHigh },
      minimumCommandsCentral: { total: sum(extensions.map(function (e) { return e.projection.commands; })),
        byCell: extensions.reduce(function (o, e) { o[e.cell] = e.projection.commands; return o; }, {}) } },
    totals: { frozenTasksWithAHarnessLowChargedMs: baseLow, frozenTasksWithAHarnessAdmissionPlanChargedMs: baseAdmission,
      ig06CentralChargedMs: s06.projection.chargedMs.central, ig06LowChargedMs: s06.projection.chargedMs.low,
      ig06GuardScenarioChargedMs: s06.projection.chargedMs.guardScenario, extensionsCentralChargedMs: extCharged,
      note: 'low: measured occupied time scaled plus the minimum grace; admission plan: the dispatcher\'s plan-only figure ' +
        '(admission estimates plus grace; a planning figure, NOT a guaranteed upper bound); the IG-S06 guard scenario is a ' +
        'planning scenario with an incomplete upper bound; IG-S06 and the extensions are separate lines with their own approvals' },
    approvalsNeeded: approvals,
    unmeasured: ['the frontier request cost (IG-S06)', 'the cost of the eight IG-S09 rows left unstarted (priced from the ' +
      'observed pairs, not measured)', 'frontier phase-A per-finder wall time', 'wordoku, sohei, flower and butterfly in every population'],
    assumptions: ['the frozen catalogue may change the window, floors and search (MS07): every projection is from the pre-MS07 ' +
      'catalogue; the 270 s window, 45 s grace and the 258 s packing window are the harness\'s', 'a frozen run that exceeds its ' +
      'receipt stops; none is retried automatically']
  };
}

/** Occupied time and command count of phases that cannot share an invocation: max(1, ceil(occupied / window)) each. */
function phasePlan(phases, scale) {
  const out = {};
  let occupied = 0;
  let commands = 0;
  Object.keys(phases).forEach(function (k) {
    const occ = Math.round(phases[k] * scale);
    const c = Math.max(1, ceilDiv(occ, WINDOW));
    out[k] = { occupiedMs: occ, commands: c };
    occupied += occ;
    commands += c;
  });
  return { scale: scale, phases: out, occupiedMs: occupied, commands: commands, chargedMs: occupied + GRACE * commands };
}

module.exports = { ORDER, DEPENDS, POPULATION, commandOf, measuredOf, adapterDryRun, phasePlan, buildFrozenPlan };
