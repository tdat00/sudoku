'use strict';

/*
 * Tests of IG-S05 (test side, provisional (pre-freeze)).
 *
 * Pure cases (no engine, no worker thread, no timing, nothing written): the reporting and selection rules on synthetic trial
 * records (zero hits in both controls, one positive cluster, duplicate hashes, early-exact skips, a timeout's CPU, a missing mode,
 * the tie order, a source/budget mismatch, an unverified claimed hit), the two-sample control flow of screen.cjs on a scripted
 * fake of the engine (native loop and the frontier loop of frontier-test.cjs's fake world), the host-side executor and its
 * per-sample guard on a fake worker, the plan and its packing, and the aggregator documents. They never regenerate a puzzle.
 *
 * Engine cases (`engineSynthetic`, `engineSyntheticVerify`) run on the real engine on a small board in the first command of the
 * round, under the low-priority wrapper: the native path of the screen against the IG-S04 path, the trial of every mode, a budget
 * stop per sample, determinism and the parent classifier on an unpatched instance.
 *
 *   node ig05-test.cjs [--only=pure]      development only: no engine, no timing, nothing written
 */
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const F = require('./frontier.cjs');
const S = require('./screen.cjs');
const ST = require('./ig05-stats.cjs');
const PLAN = require('./plans/ig-s05.cjs');
const FT = require('./frontier-test.cjs');

const registry = [];

function add(id, group, title, fn) {
  registry.push({ id: id, group: group, title: title, fn: fn });
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (C.canonicalJson(actual) !== C.canonicalJson(expected)) {
    throw new Error(message + ': expected ' + C.canonicalJson(expected) + ', got ' + C.canonicalJson(actual));
  }
}

function throws(fn, test, message) {
  let thrown = null;
  try {
    fn();
  } catch (err) {
    thrown = err;
  }
  if (thrown === null) throw new Error(message + ': nothing was thrown');
  if (!test(thrown)) throw new Error(message + ': unexpected error ' + (thrown && thrown.code ? thrown.code : thrown));
  return thrown;
}

// --- synthetic records ---------------------------------------------------------------------------------------------------------

const SEEDS = PLAN.SEEDS_PROVISIONAL;
const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];

function sampleRow(ordinal, over) {
  return Object.assign({ ordinal: ordinal, fork: 'dig#1.' + ordinal, kind: 'frontier', status: 'complete', engineMs: 10,
    claimedExact: false, class: 'fallback', counts: { floorTests: 20, floorDeductions: 100, solverChecks: 500, dfsEntries: 10,
      dfsChecks: 20, canonicalRatings: 1, phaseBSolves: 0, deepenProposals: 0 }, best: null, budgetStop: null,
    parent: { hash: 'ph' + ordinal, clues: 30, removedGroups: 5 }, frontier: null, purposes: {}, engine: { solverChecks: 500,
      dfsEntries: 10, dfsChecks: 20 } }, over || {});
}

/** One record of the screen: `over` fills any field; cpu/wall are the primary interval in ms. */
function rec(cell, seed, mode, over) {
  const o = over || {};
  const hit = o.hit === true;
  const base = {
    key: 'IG-S05/screen/' + cell + ':nightmare:' + seed + '/' + mode, puzzleVariant: cell, requestSeed: seed,
    gridCluster: cell + ':' + seed, mode: mode, tier: 'primary', outcome: 'complete', claimedExact: hit, verifiedExact: hit,
    generation: { cpuReadyTotalMs: o.cpu === undefined ? 100 : o.cpu, readyOccupiedWallMs: o.wall === undefined ? 120 : o.wall,
      cpuTotalMs: 190, occupiedWallMs: 220, startupMs: 90, startupCpuMs: 90, cleanupMs: 5, cleanupCpuMs: 0, gridBuildWallMs: 10,
      gridBuildCpuMs: 10 },
    intervals: { gridBuildCpuMs: 10, gridBuildWallMs: 10, samplesCpuMs: 80, samplesWallMs: 100, cleanupCpuMs: 0, cleanupWallMs: 5 },
    digTries: 12, gridHash: 'g' + cell + seed, puzzleHash: hit ? 'p' + cell + seed + mode : null,
    firstExactOrdinal: hit ? 1 : null, skippedOrdinals: hit ? [{ ordinal: 2, fork: 'dig#1.2', status: 'skipped',
      reason: 'first-exact' }] : [], sampleStates: hit ? [{ state: 'returned' }, { state: 'skipped-first-exact' }] :
      [{ state: 'returned' }, { state: 'returned' }],
    samples: hit ? [sampleRow(1, { claimedExact: true, class: 'exact' })] : [sampleRow(1), sampleRow(2)],
    samplesStarted: hit ? 1 : 2,
    hostSamples: [{ ordinal: 1, wallMs: 50, cpuMs: 40, censored: false }], parents: { status: 'classified', rows: [] },
    budgetStops: [], counts: {} };
  return Object.assign(base, o.fields || {});
}

function matrix(cells, fn) {
  const out = [];
  cells.forEach(function (cell) {
    SEEDS.forEach(function (seed) {
      F.MODE_ORDER.forEach(function (mode) { out.push(rec(cell, seed, mode, fn ? fn(cell, seed, mode) : undefined)); });
    });
  });
  return out;
}

function analyseOf(records, cells) {
  return ST.analyse({ records: records, jobs: null, cells: cells || ['mega16'], seeds: SEEDS, levels: LEVELS,
    requested: 'nightmare', quantumMs: 15.6 });
}

// --- reporting: the cases of the task file -------------------------------------------------------------------------------------------

add('stats.zero-hits-both-controls', 'stats', 'zero verified hits everywhere: zero rates, zero lower bounds, inconclusive, F1 as a non-winning default', function () {
  const a = analyseOf(matrix(['mega16']));
  const c = a.cells.mega16;
  F.MODE_ORDER.forEach(function (m) {
    equal(c.modes[m].hits, 0, m + ' hits');
    equal(c.modes[m].primary.perCpuSecond, 0, m + ' rate is a finite zero, not null');
  });
  c.paired.forEach(function (p) {
    equal(p.lowerBound95OneSided, 0, 'zero hits give a zero lower bound (no pseudo-count) in ' + p.mode + '/' + p.control);
    equal(p.difference, 0, 'difference');
  });
  equal([c.selection.selected, c.selection.winner, c.selection.reason], ['F1', false, 'all-zero-verified-hits'],
    'F1 is only a non-winning diagnostic default');
  check(c.finding.indexOf('inconclusive') === 0, 'the cell finding is inconclusive: ' + c.finding);
  equal(c.formalGate, 'not-evaluable-pre-freeze', 'formal gate');
  equal(a.allRatesZero, true, 'all rates zero');
  check(a.verdict.indexOf('inconclusive') === 0 && a.verdict.indexOf('stop for review before IG-S06') > 0, 'verdict: ' + a.verdict);
  check(c.selection.stability.frequency.default === 1, 'the default is chosen in every resample');
});

add('stats.one-positive-cluster', 'stats', 'one positive cluster: the hit counts once, the interval resamples whole clusters, the selection is F1 (a real hit)', function () {
  const recs = matrix(['mega16'], function (cell, seed, mode) { return mode === 'F1' && seed === 103 ? { hit: true } : {}; });
  const a = analyseOf(recs);
  const c = a.cells.mega16;
  equal(c.modes.F1.hits, 1, 'one hit');
  equal(c.modes.F1.primary.cpuMs, 800, 'the denominator is all eight clusters\' CPU');
  check(Math.abs(c.modes.F1.primary.perCpuSecond - 1 / 0.8) < 1e-9, 'rate = 1 hit / 0.8 CPU s = 1.25');
  const p = c.paired.find(function (x) { return x.mode === 'F1' && x.control === 'proposal-only' && x.per === 'cpu'; });
  check(Math.abs(p.difference - 1.25) < 1e-9, 'paired difference over the control (zero hits): ' + p.difference);
  equal(p.status, 'complete-coverage', 'complete coverage');
  check(p.ci95[1] > 0, 'a draw with the positive cluster has a positive rate');
  check(p.lowerBound95OneSided === 0, 'one cluster in eight is absent from many resamples: the lower bound is 0, not a pseudo-count');
  equal([c.selection.selected, c.selection.winner], ['F1', true], 'a variant with a hit and complete coverage wins');
  check(c.selection.stability.frequency.F1 > 0.5 && c.selection.stability.frequency.default > 0, 'the stability shows both outcomes');
  check(c.finding.indexOf('frontier hits observed') === 0, c.finding);
});

add('stats.duplicate-hashes', 'stats', 'one grid return is one delivered hit; a second copy of the same return is an anomaly, not a second hit', function () {
  const two = rec('mega16', 101, 'F1', { hit: true, fields: { samples: [sampleRow(1, { claimedExact: true, class: 'exact' }),
    sampleRow(2, { claimedExact: true, class: 'exact' })] } });
  const recs = matrix(['mega16']).filter(function (r) { return r.key !== two.key; }).concat([two]);
  const a = analyseOf(recs);
  equal(a.cells.mega16.modes.F1.hits, 1, 'two exact samples of one trial are one hit');
  equal(a.cells.mega16.modes.F1.samples.claimedExactSamples, 2, 'raw exact samples are reported apart');
  equal(a.cells.mega16.modes.F1.samples.distinctHitHashes, 1, 'one distinct hash');
  // two trials of ONE grid returning the same puzzle hash (FU and FS): both rows are hits of their own mode but the duplicate is flagged per mode only
  const same = recs.filter(function (r) { return r.key !== two.key; }).concat([rec('mega16', 101, 'F1', { hit: true,
    fields: { puzzleHash: 'dup' } }), rec('mega16', 101, 'F1', { hit: true, fields: { puzzleHash: 'dup', key: 'second-copy' } })]);
  const b = analyseOf(same.filter(function (r, i, all) { return all.findIndex(function (x) { return x.key === r.key; }) === i; }));
  check(b.anomalies.some(function (x) { return x.kind === 'duplicate-hit-hash'; }), 'the repeated hash is flagged');
});

add('stats.early-exact-skips', 'stats', 'a skipped second ordinal after the first exact is recorded as such, with the first-hit ordinal', function () {
  const recs = matrix(['mega16'], function (cell, seed, mode) { return mode === 'ordinary-only' && seed <= 102 ? { hit: true } : {}; });
  const a = analyseOf(recs);
  const row = a.coverage.find(function (x) { return x.cell === 'mega16' && x.mode === 'ordinary-only'; });
  equal(row.sampleOrdinals['skipped-first-exact'], 2, 'two skipped ordinals');
  equal(row.sampleOrdinals.returned, 14, 'the other ordinals were returned');
  equal(a.cells.mega16.modes['ordinary-only'].samples.firstHitOrdinal, { 1: 2 }, 'first hit at ordinal 1 twice');
  equal(a.cells.mega16.modes['ordinary-only'].samples.skippedFirstExact, { '2:first-exact': 2 }, 'skipped ordinals recorded');
});

add('stats.timeout-cpu-retained', 'stats', 'a timed-out trial keeps its CPU in the denominator; unknown spend makes the rate unknown, never a smaller denominator', function () {
  const recs = matrix(['mega16'], function (cell, seed, mode) {
    if (mode !== 'F1') return {};
    if (seed === 101) return { hit: true };
    return seed === 102 ? { cpu: 5000, wall: 45000, fields: { outcome: 'request-timeout', claimedExact: false,
      verifiedExact: null, sampleStates: [{ state: 'censored' }, { state: 'not-reached' }] } } : {};
  });
  const a = analyseOf(recs);
  const f1 = a.cells.mega16.modes.F1;
  equal(f1.primary.cpuMs, 100 * 6 + 5000 + 100, 'the timeout\'s 5 s of CPU stays in the denominator');
  equal(f1.outcomes.censored, 1, 'one censored');
  const lost = analyseOf(matrix(['mega16'], function (cell, seed, mode) {
    return mode === 'F1' && seed === 104 ? { cpu: null } : (mode === 'F1' && seed === 101 ? { hit: true } : {});
  }));
  equal(lost.cells.mega16.modes.F1.primary.perCpuSecond, null, 'an unknown CPU makes the rate null');
  equal(lost.cells.mega16.modes.F1.primary.perWallSecond > 0, true, 'the wall rate is still known');
  const tiny = analyseOf(matrix(['mega16'], function (cell, seed, mode) { return mode === 'F1' ? { cpu: 0 } : {}; }));
  equal(tiny.cells.mega16.modes.F1.primary.perCpuSecond, null, 'an unresolved CPU sum is null, never infinity');
});

add('stats.missing-mode-cannot-be-dropped', 'stats', 'a mode missing in a cluster keeps its coverage visible and cannot win by a partial cohort', function () {
  const recs = matrix(['mega16'], function (cell, seed, mode) { return mode === 'FC' && seed >= 105 ? { hit: true } : {}; })
    .map(function (r) { return r.mode === 'FC' && r.requestSeed === 108 ? Object.assign({}, r, { outcome: 'unstarted' }) : r; });
  const a = analyseOf(recs);
  const cov = a.coverage.find(function (x) { return x.mode === 'FC'; });
  equal([cov.started, cov.unstarted, cov.complete8], [7, 1, false], 'coverage');
  const p = a.cells.mega16.paired.find(function (x) { return x.mode === 'FC' && x.control === 'ordinary-only' && x.per === 'cpu'; });
  equal([p.status, p.pairedClusters, p.planned], ['incomplete-coverage', 7, 8], 'the paired row says it is partial');
  check(p.note.indexOf('PARTIAL') === 0, 'and carries the warning');
  equal(a.cells.mega16.selection.selected, 'F1', 'the partial cohort cannot win');
  equal(a.cells.mega16.selection.winner, false, 'F1 is a default, not a winner');
  check(a.cells.mega16.finding.indexOf('inconclusive (incomplete coverage') === 0, a.cells.mega16.finding);
});

add('stats.selection-tie-order', 'stats', 'the selection ranks by hits per CPU second, then per wall second, then the fixed order F1, FC, FM, FU, FS, F0', function () {
  const stats = function (over) {
    const base = {};
    ST.SELECTION_ORDER.forEach(function (m) { base[m] = { complete: true, hits: 1, perCpu: 1, perWall: 1 }; });
    return Object.assign(base, over || {});
  };
  equal(ST.selectFor(stats(), true).selected, 'F1', 'all equal: F1 first');
  equal(ST.selectFor(stats({ F1: { complete: true, hits: 0, perCpu: 0, perWall: 0 } }), true).selected, 'FC', 'no hit for F1: FC');
  equal(ST.selectFor(stats({ FS: { complete: true, hits: 1, perCpu: 2, perWall: 1 } }), true).selected, 'FS', 'CPU rate decides first');
  equal(ST.selectFor(stats({ FU: { complete: true, hits: 1, perCpu: 1, perWall: 3 }, F0: { complete: true, hits: 1, perCpu: 1,
    perWall: 2 } }), true).selected, 'FU', 'then the wall rate');
  equal(ST.selectFor(stats({ F0: { complete: true, hits: 1, perCpu: 1, perWall: 1 }, F1: { complete: false, hits: 5, perCpu: 9,
    perWall: 9 } }), true).selected, 'FC', 'an incomplete variant is not a candidate, however good its partial rate');
  equal(ST.selectFor(stats(), false).winner, false, 'a missing control makes the default non-winning');
  equal(ST.selectFor(stats({ FM: { complete: true, hits: 0, perCpu: 0, perWall: 0 } }), true).ranking.indexOf('FM'), -1,
    'zero hits is never ranked, however fast');
});

add('stats.unverified-claimed-hit', 'stats', 'a claimed hit the verifier did not confirm (or that was never verified) cannot enter the numerator', function () {
  const recs = matrix(['mega16'], function (cell, seed, mode) {
    if (mode !== 'F1') return {};
    if (seed === 101) return { fields: { claimedExact: true, verifiedExact: false, outcome: 'error' } };
    if (seed === 102) return { fields: { claimedExact: true, verifiedExact: null, outcome: 'validation-unknown' } };
    if (seed === 103) return { fields: { claimedExact: false, verifiedExact: true } };
    return {};
  });
  const a = analyseOf(recs);
  equal(a.cells.mega16.modes.F1.hits, 0, 'none of the three is a hit');
  const kinds = a.anomalies.map(function (x) { return x.kind; }).sort();
  equal(kinds, ['false-exact-flag', 'verified-exact-not-claimed'], 'a false flag and an unclaimed verification are reported for review');
});

add('stats.conditional-and-amortised', 'stats', 'the conditional rate excludes budget-ended trials; the amortised sensitivity is derived and never the primary rate', function () {
  const recs = matrix(['mega16'], function (cell, seed, mode) {
    if (mode !== 'F1') return {};
    if (seed === 101) return { hit: true };
    return seed >= 107 ? { fields: { outcome: 'sample-budget', claimedExact: false, verifiedExact: null, budgetStops: [{ ordinal: 1,
      dimension: 'floorTests', limit: 384, used: 385, phase: 'phaseA' }] } } : {};
  });
  const f1 = analyseOf(recs).cells.mega16.modes.F1;
  equal(f1.outcomes.budgetEnded, 2, 'two budget-ended trials');
  equal(f1.budgetEndedShare, 0.25, 'the share ending sample-budget');
  equal(f1.primary.cpuMs, 800, 'primary: all eight trials');
  equal(f1.conditionalExcludingBudgetEnded.trials, 6, 'conditional: six');
  check(Math.abs(f1.conditionalExcludingBudgetEnded.perCpuSecond - 1 / 0.6) < 1e-9, 'conditional rate 1/0.6 s');
  // derived, per started trial: (100 - 10) + m x 10 / 12; the hit stopped after one sample (m = 1), the other seven started two
  const expected = (90 + 1 * 10 / 12) + 7 * (90 + 2 * 10 / 12);
  check(Math.abs(f1.setupAmortised.cpuMs - expected) < 1e-6, 'amortised denominator ' + f1.setupAmortised.cpuMs);
  check(Math.abs(f1.setupAmortised.perCpuSecond - 1 / (expected / 1000)) < 1e-9, 'amortised rate');
  check(f1.setupAmortised.note.indexOf('not measured request throughput') >= 0, 'labelled as derived');
});

add('stats.amortised-started-samples', 'stats', 'setup-amortised sensitivity: readyTotal - gridCost + m x gridCost / N, so a one-sample early stop and a two-sample trial differ', function () {
  const one = rec('mega16', 101, 'F1', { hit: true });
  const two = rec('mega16', 102, 'F1', {});
  const zero = rec('mega16', 103, 'F1', { fields: { samplesStarted: 0, samples: [], hostSamples: [] } });
  const view = function (r) { return ST.rowsOf([r], null); };
  const cpu = function (r, basis) { return ST.amortised(view(r), 'cpu', basis); };
  // ready 100 ms, grid 10 ms, N = 12 for the three trials alike
  check(Math.abs(cpu(one) - (90 + 10 / 12)) < 1e-9, 'one sample: one share of the grid build');
  check(Math.abs(cpu(two) - (90 + 2 * 10 / 12)) < 1e-9, 'two samples: two shares');
  check(Math.abs(cpu(zero) - 90) < 1e-9, 'no sample started: the grid build is charged to nothing');
  check(cpu(two) > cpu(one), 'the two-sample trial is dearer than the early stop');
  check(Math.abs(cpu(two, 'one-per-trial') - cpu(one, 'one-per-trial')) < 1e-9, 'the superseded r1 formula could not tell them apart');
  check(Math.abs(ST.amortised(ST.rowsOf([one, two], null), 'wall') - ((120 - 10) + 10 / 12 + (120 - 10) + 2 * 10 / 12)) < 1e-9, 'wall, summed');
  equal(ST.amortised(view(rec('mega16', 101, 'F1', { fields: { digTries: null } })), 'cpu'), null, 'an unknown native sample count gives null');
  const censored = rec('mega16', 101, 'F1', { fields: { outcome: 'request-timeout', samplesStarted: undefined, samples: [],
    hostSamples: [{ ordinal: 1, wallMs: 300, cpuMs: 250, censored: true }] } });
  check(Math.abs(cpu(censored) - (90 + 10 / 12)) < 1e-9, 'a censored sample counts as started (host stamps)');
});

add('stats.degenerate-labels', 'stats', 'an all-zero [0, 0] interval is labelled degenerate; a resampled interval is not', function () {
  const zero = analyseOf(matrix(['mega16'])).cells.mega16;
  check(zero.paired.every(function (p) { return p.degenerate === true && p.interpretation === ST.DEGENERATE_NOTE; }),
    'every paired interval of a zero-hit cell is degenerate');
  check(ST.DEGENERATE_NOTE.indexOf('not evidence of equivalence or non-inferiority') > 0, 'the label says what it is not');
  check(zero.own.every(function (o) { return o.cpu.degenerate === true && o.wall.degenerate === true; }), 'own-rate intervals too');
  equal(zero.paired[0].hitsMode + '/' + zero.paired[0].hitsControl, '0/0', 'the hits of each arm are shown');
  const some = analyseOf(matrix(['mega16'], function (cell, seed, mode) { return mode === 'F1' && seed === 103 ? { hit: true } : {}; })).cells.mega16;
  const f1 = some.paired.find(function (p) { return p.mode === 'F1' && p.control === 'proposal-only' && p.per === 'cpu'; });
  equal([f1.degenerate, f1.interpretation, f1.hitsMode], [false, null, 1], 'a resampled interval is not labelled');
  const fc = some.paired.find(function (p) { return p.mode === 'FC' && p.control === 'proposal-only' && p.per === 'cpu'; });
  equal(fc.degenerate, true, 'an arm pair without a hit stays degenerate beside a variant that has one');
});

add('stats.separate-problems', 'stats', 'empty frontiers, off-band candidates and budget-ended trials are counted apart', function () {
  const frontier = { entries: [], phaseB: [], passes: [{ tests: 10, solved: 1, rederived: 2, stuckUnique: 0, stuckUnknown: 0, ambiguous: 3,
    skippedAmbiguous: 0, skippedMinClues: 0, skippedUnitMinimum: 0 }], deepen: { runs: [] }, phaseCosts: {} };
  const withEntry = { entries: [{ group: 1 }], phaseB: [{ proof: 1, outcome: 'rated', allowedStatus: 'solved', quality: 1100,
    rating: { solved: true, level: 'hell1' } }, { proof: 2, outcome: 'ambiguous-at-reference' }], passes: [], deepen: { runs: [] },
  phaseCosts: {} };
  const recs = matrix(['mega16'], function (cell, seed, mode) {
    if (mode !== 'F1') return {};
    if (seed === 101) return { fields: { samples: [sampleRow(1, { frontier: frontier }), sampleRow(2, { frontier: withEntry })] } };
    if (seed === 102) return { fields: { outcome: 'sample-budget', claimedExact: false, verifiedExact: null,
      samples: [sampleRow(1, { status: 'sample-budget', budgetStop: { dimension: 'dfsEntries' }, frontier: frontier })] } };
    return {};
  });
  const p = analyseOf(recs).cells.mega16.problems.frontier.find(function (x) { return x.variant === 'F1'; });
  equal([p.emptyFrontierSamples, p.completeSamples], [1, 2], 'a complete sample without entries is an empty frontier; a budget-stopped one is not');
  equal([p.phaseBTries, p.proofUnique, p.proofAmbiguousAtReference, p.candidateAbove, p.candidateShallow], [2, 1, 1, 1, 0], 'candidates apart');
  equal([p.budgetEndedTrials, p.trials, p.budgetEndedShare], [1, 8, 0.125], 'budget-limited trials apart');
  equal(p.budgetStopsByDimension, { dfsEntries: 1 }, 'by dimension');
});

add('stats.bootstrap-whole-clusters', 'stats', 'resampling keeps a cluster\'s modes together and is deterministic', function () {
  const mk = function () {
    return analyseOf(matrix(['mega16'], function (cell, seed, mode) {
      return (mode === 'F1' || mode === 'proposal-only') && seed === 101 ? { hit: true } : {};
    }));
  };
  const a = mk();
  const b = mk();
  equal(a.cells.mega16.paired, b.cells.mega16.paired, 'the fixed analysis seed gives the same intervals');
  const p = a.cells.mega16.paired.find(function (x) { return x.mode === 'F1' && x.control === 'proposal-only' && x.per === 'cpu'; });
  // both arms hit in the same cluster: every resample has equal numerators and denominators, so the difference is 0 everywhere
  equal([p.difference, p.ci95[0], p.ci95[1]], [0, 0, 0], 'a shared hit cluster cancels exactly in every resample (whole clusters kept together)');
});

add('stats.coverage-and-parents', 'stats', 'coverage counts unstarted keys; parent classes are counted per sample and per distinct parent, never as hits', function () {
  const recs = matrix(['mega16'], function (cell, seed, mode) {
    if (mode !== 'F1') return {};
    return { fields: { parents: { status: 'classified', rows: [{ ordinal: 1, hash: 'ph1', status: 'classified', class: seed % 2 ? 'exact' : 'below' },
      { ordinal: 2, hash: 'ph2', status: 'classified', class: 'below' }] } } };
  });
  const a = analyseOf(recs);
  const p = a.cells.mega16.modes.F1.parents;
  equal([p.samplesWithParent, p.perSample.exact, p.perSample.below], [16, 4, 12], 'per sample');
  equal(a.cells.mega16.modes.F1.hits, 0, 'an exact parent is no hit');
  equal(a.cells.mega16.modes.F1.funnel.sampleClass.fallback, 16, 'sample classes in the funnel');
  equal(a.cells.mega16.modes['ordinary-only'].parents, null, 'native modes have no parent');
});

// --- the screen: native loop on a scripted fake ------------------------------------------------------------------------------------------

function fakeNative(script) {
  const calls = [];
  const events = [];
  const D = {
    DEFAULT_DIG_TRIES: 12, DEFAULT_DIG_TRIES_COARSE: 30, SHALLOW_QUALITY: 0.5,
    newCaps: function () { return { ratings: 0, proposals: 0, maxRatings: 1024, maxProposals: 32768, localSearches: [] }; },
    capsExhausted: function (c) { return c.ratings >= c.maxRatings || c.proposals >= c.maxProposals; },
    createKeeper: function () { return { best: null, distance: Infinity }; },
    qualityOf: function (rating) { return rating.q; },
    keptPuzzle: function (kept) { return { model: kept.model, givens: kept.givens, rating: kept.rating, exact: kept.rating.q === 0, log: [] }; },
    copyWork: function (caps) { return caps.map(function (c) { return { ratings: c.ratings, proposals: c.proposals }; }); }
  };
  const rt = { digger: D, reset: function () {}, setPurpose: function () { return 'other'; },
    countersOf: function () { return { solverChecks: 7, dfsEntries: 3, dfsChecks: 5 }; }, snapshot: function () { return { by: {} }; } };
  const SG = {
    events: { toEmitter: function () { return {}; } },
    symmetry: { groups: function () { return [[0, 1]]; } },
    difficulty: { levelIndex: function (l) { return LEVELS.indexOf(l); } },
    digger: { createStageSteps: function () { return {}; }, getStrategy: function () { return 'cells'; },
      digLevel: function (model, solution, level, rng, options) {
        calls.push({ fork: rng.label, options: options });
        return script(calls.length, options);
      } }
  };
  const rng = { label: 'root', fork: function (l) { return { label: l }; } };
  const model = { cellCount: 4 };
  return { calls: calls, events: events, run: function (modeId, extra) {
    return S.runScreenTrial(Object.assign({ SG: SG, rt: rt, model: model, solution: Int32Array.from([1, 2, 3, 4]), spec: { min: 1500 },
      level: 'nightmare', cfg: { symmetry: 'rotational180', digOrder: 'random', maxAttempts: 2 }, rng: rng, mode: F.MODES[modeId],
      budget: { tick: function () {}, check: function () {} }, limits: null, progress: function () {},
      onSampleStart: function (s) { events.push(['start', s.ordinal, s.fork, s.kind]); },
      onSampleEnd: function (r) { events.push(['end', r.ordinal, r.class]); } }, extra || {}));
  } };
}

function puzzle(q, level, over) {
  return Object.assign({ model: { cellCount: 4 }, givens: Int32Array.from([1, 0, 0, q === 0 ? 4 : 3]), rating: { q: q, solved: true,
    level: level || 'master', score: 1000, hardestTechnique: 'xyWing' }, exact: q === 0, unsound: false, clues: 2,
  stats: { tried: 5, accepted: 3, rejected: 2, skipped: 1, oracleCalls: 5 }, log: [] }, over || {});
}

add('screen.native-two-samples', 'screen', 'both native samples use the kind forced, forks dig#1.1 and dig#1.2, one caps object and one keeper', function () {
  const f = fakeNative(function (n, options) {
    options.caps.ratings += 2;
    return puzzle(1000 + n, 'master');
  });
  const r = f.run('proposal-only');
  equal(f.calls.map(function (c) { return c.fork; }), ['dig#1.1', 'dig#1.2'], 'the named native forks');
  equal(f.calls.map(function (c) { return c.options.proposal; }), [true, true], 'the proposal kind for both samples');
  check(f.calls[0].options.caps === f.calls[1].options.caps && f.calls[0].options.keeper === f.calls[1].options.keeper,
    'one caps object and one keeper for the attempt (native semantics)');
  equal(f.calls.map(function (c) { return c.options.where.sample; }), [1, 2], 'the native position in the restart loop');
  equal(r.samples.map(function (s) { return s.counts.canonicalRatings; }), [2, 2], 'per-sample ratings are deltas of the shared caps');
  equal(r.samples.map(function (s) { return s.capsAfter.ratings; }), [2, 4], 'the caps are cumulative');
  equal(r.skipped, [], 'nothing skipped');
  equal(r.status, 'complete', 'native trials never end on a count budget');
  equal(r.bestOrdinal, 1, 'the first of equal quality is kept: a strict improvement is needed');
  const o = fakeNative(function () { return puzzle(1001, 'master'); });
  equal(o.run('ordinary-only') && o.calls.map(function (c) { return c.options.proposal; }), [false, false], 'ordinary kind');
});

add('screen.native-first-exact', 'screen', 'the first exact sample ends the trial and the later ordinal is recorded as skipped', function () {
  const f = fakeNative(function () { return puzzle(0, 'nightmare'); });
  const r = f.run('ordinary-only');
  equal(f.calls.length, 1, 'one sample');
  equal(r.skipped, [{ ordinal: 2, fork: 'dig#1.2', status: 'skipped', reason: 'first-exact' }], 'skipped-first-exact');
  equal(r.firstExact, { ordinal: 1, origin: 'sample', source: 'sample' }, 'first exact');
  equal(r.best.exact, true, 'the candidate is exact');
});

add('screen.native-keeper-and-caps', 'screen', 'an exact keeper candidate or used-up caps end the trial before sample 2; the keeper wins only when strictly closer', function () {
  const k = fakeNative(function (n, options) {
    options.keeper.best = { model: { cellCount: 4 }, givens: Int32Array.from([1, 2, 0, 4]), rating: { q: 0, solved: true, level: 'nightmare' } };
    options.keeper.distance = 0;
    return puzzle(1001, 'master');
  });
  const rk = k.run('proposal-only');
  equal(k.calls.length, 1, 'no second sample once the keeper is exact');
  equal(rk.skipped[0].reason, 'first-exact-keeper', 'recorded');
  equal([rk.best.source, rk.best.exact, rk.firstExact.source], ['keeper', true, 'keeper'], 'the kept candidate is returned');
  const c = fakeNative(function (n, options) {
    options.caps.ratings = options.caps.maxRatings;
    return puzzle(1001, 'master');
  });
  const rc = c.run('ordinary-only');
  equal(c.calls.length, 1, 'no second sample once the caps are used up');
  equal(rc.skipped[0].reason, 'caps-exhausted', 'recorded');
  const w = fakeNative(function (n, options) {
    if (n === 1) {
      options.keeper.best = { model: { cellCount: 4 }, givens: Int32Array.from([1, 2, 0, 0]), rating: { q: 1002, solved: true, level: 'master' } };
      options.keeper.distance = 1002;
      return puzzle(1005, 'master');
    }
    return puzzle(1003, 'master');
  });
  const rw = w.run('proposal-only');
  equal([rw.best.source, rw.bestOrdinal], ['keeper', 2], 'the keeper (1002) beats the best sample (1003) only because it is strictly closer');
  check(rw.best.quality === 1002, 'quality');
  equal(ST.levelClass(LEVELS, 'master', 'nightmare', 1002), 'below', 'below / above classes use the level order');
});

add('screen.max-samples', 'screen', 'at most two samples per grid', function () {
  const f = fakeNative(function () { return puzzle(1001, 'master'); });
  throws(function () { f.run('proposal-only', { samplesMax: 3 }); }, function (e) { return e.code === 'plan-missing'; }, 'three samples');
  equal(f.run('proposal-only', { samplesMax: 1 }).samples.length, 1, 'one sample when asked');
});

// --- the screen: frontier loop on the fake world ---------------------------------------------------------------------------------------------

function screenOnWorld(w, modeId, extra) {
  const events = [];
  const ctx = Object.assign({ SG: w.SG, rt: w.rt, model: w.model, solution: w.solution, spec: w.spec, level: w.o.level, cfg: w.cfg,
    rng: FT.fakeRng(7), mode: F.MODES[modeId], budget: w.pass, limits: null, progress: function () {}, samplesMax: 2,
    onSampleStart: function (s) {
      events.push(['start', s.ordinal, s.fork]);
      w.baseZeros.clear();
    },
    onSampleEnd: function (r) { events.push(['end', r.ordinal, r.status]); } }, extra || {});
  const result = S.runScreenTrial(ctx);
  result.events = events;
  return result;
}

add('screen.frontier-two-samples', 'screen', 'a frontier trial runs both samples with fresh counters and the same frozen vector; the parent is described per sample', function () {
  const w = FT.makeWorld({ n: 40 });
  w.stuck = function (gi) { return gi % 4 !== 0; };
  w.onRate = function (givens, index) {
    return index === 0 ? { solved: true, level: 'veryEasy', score: 0, hardestTechnique: null, techniqueCounts: {} } :
      { solved: true, level: 'master', score: 1400, hardestTechnique: 'xyWing', techniqueCounts: { xyWing: 1 } };
  };
  const r = screenOnWorld(w, 'FC');
  equal(r.samples.map(function (s) { return s.fork; }), ['dig#1.1', 'dig#1.2'], 'two native forks');
  equal(r.events.map(function (e) { return e[0] + e[1]; }), ['start1', 'end1', 'start2', 'end2'], 'start and end around every sample');
  equal(r.samples[0].counts.floorTests, r.samples[1].counts.floorTests, 'each sample starts from fresh counters and does the same work');
  check(r.samples[0].counts.floorTests > 0, 'work was counted');
  equal(r.parentInputs.length, 2, 'a parent descriptor per sample');
  equal(r.parentInputs.map(function (p) { return p.ordinal; }), [1, 2], 'ordinals');
  check(typeof r.parentInputs[0].hash === 'string' && r.parentInputs[0].removedGroups.length > 0, 'hash and removed groups');
  equal(r.status, 'complete', 'complete');
  check(r.best !== null && r.best.exact === false && r.firstExact === null, 'no exact candidate');
  equal(r.samples[0].class, 'below', 'the best of each sample is classified');
  const w2 = FT.makeWorld({ n: 40 });
  w2.stuck = function (gi) { return gi % 4 !== 0; };
  const x = screenOnWorld(w2, 'F1');
  equal(x.samples.length, 1, 'an exact first sample ends the trial');
  equal(x.skipped, [{ ordinal: 2, fork: 'dig#1.2', status: 'skipped', reason: 'first-exact' }], 'ordinal 2 skipped');
  equal(x.firstExact.ordinal, 1, 'first exact at ordinal 1');
  equal(x.status, 'complete', 'complete');
});

add('screen.frontier-budget-per-sample', 'screen', 'each sample has its own count budget: both can stop, the trial ends sample-budget with a valid fallback; an exact later sample still completes the trial', function () {
  const SB = require('./sample-budget.cjs');
  const w = FT.makeWorld({ n: 40 });
  w.onRate = function () { return { solved: true, level: 'veryEasy', score: 0, hardestTechnique: null, techniqueCounts: {} }; };
  const lim = SB.pilotCeilings({ CAP_RATINGS: 1024, OBJECTIVE_STEPS: 100000, UNIQUE_NODES: 200000 }, { groups: w.groups.length,
    cells: 40, digits: 4 });
  lim.floorTests = 3;
  const r = screenOnWorld(w, 'F1', { limits: lim });
  equal(r.samples.map(function (s) { return s.status; }), ['sample-budget', 'sample-budget'], 'both samples stopped on their own count');
  equal(r.samples.map(function (s) { return s.counts.floorTests; }), [3, 3], 'each at its own limit, not at a cumulative one');
  equal(r.status, 'sample-budget', 'the trial ends sample-budget');
  equal(r.best.source, 'fallback', 'a valid fallback exists');
  equal(r.samples[0].budgetStop.dimension, 'floorTests', 'the stop is recorded per sample');
  check(S.trialStatus([{ status: 'sample-budget' }, { status: 'complete' }], { exact: true }) === 'complete',
    'a hit after a budget-stopped sample completes the trial');
  check(S.trialStatus([{ status: 'sample-budget' }], { exact: false }) === 'sample-budget', 'no hit: sample-budget');
});

// --- the classifier ---------------------------------------------------------------------------------------------------------------------------

add('screen.parent-classes', 'screen', 'the parent class rules: exact needs unique, complete, in band and required; the rest follow the level order', function () {
  const SG = { difficulty: { levelIndex: function (l) { return LEVELS.indexOf(l); } } };
  const row = function (o) { return Object.assign({ unique: true, rating: { solved: true, level: 'nightmare' }, required: true }, o); };
  equal(S.classOfParent(row(), SG, 'nightmare'), 'exact', 'exact');
  equal(S.classOfParent(row({ required: false }), SG, 'nightmare'), 'shallow', 'shallow');
  equal(S.classOfParent(row({ required: null }), SG, 'nightmare'), 'unknown', 'requiredness unknown');
  equal(S.classOfParent(row({ rating: { solved: true, level: 'master' } }), SG, 'nightmare'), 'below', 'below');
  equal(S.classOfParent(row({ rating: { solved: true, level: 'hell1' } }), SG, 'nightmare'), 'above', 'above');
  equal(S.classOfParent(row({ rating: { solved: false, level: null } }), SG, 'nightmare'), 'incomplete', 'incomplete');
  equal(S.classOfParent(row({ unique: false }), SG, 'nightmare'), 'ambiguous', 'ambiguous');
  equal(S.classOfParent(row({ unique: null }), SG, 'nightmare'), 'unknown', 'unknown uniqueness is never exact');
  equal(S.classOfParent(row({ rating: null }), SG, 'nightmare'), 'unknown', 'unknown rating');
});

add('screen.parent-rebuild', 'screen', 'the classifier rebuilds the parent from the grid and the removed groups, checks the recorded hash and refuses an unknown group', function () {
  const solution = [1, 2, 3, 4, 5, 6];
  const groups = [[0, 3], [1, 4], [2, 5]];
  const SG = {
    pipeline: { normalizeConfig: function (c) { return Object.assign({ variantOptions: {}, symmetry: 'rotational180' }, c); } },
    variants: { get: function () { return { build: function () { return { cellCount: 6 }; } }; } },
    rng: { create: function () { return { fork: function () { return {}; } }; } },
    symmetry: { groups: function () { return groups; } },
    budget: { create: function () { return {}; } },
    dfs: { countSolutions: function () { return 1; } },
    difficulty: { levelIndex: function (l) { return LEVELS.indexOf(l); }, rate: function () {
      return { solved: true, level: 'master', score: 1300, hardestTechnique: 'xyWing' }; },
    requiredOf: function () { return { required: false, vacuous: false }; } }
  };
  const parent = Int32Array.from(solution);
  [0, 3, 1, 4].forEach(function (c) { parent[c] = 0; });
  const good = S.classifyParents(SG, { config: { variantId: 'x', difficulty: 'nightmare', seed: 1 }, solution: solution,
    parents: [{ ordinal: 1, hash: F.hashGivens(parent), clues: 2, removedGroups: [0, 1] }] });
  equal([good[0].status, good[0].hashMatches, good[0].class, good[0].clues], ['classified', true, 'below', 2], 'rebuilt and classified');
  const bad = S.classifyParents(SG, { config: { variantId: 'x', difficulty: 'nightmare', seed: 1 }, solution: solution,
    parents: [{ ordinal: 1, hash: 'wrong', clues: 2, removedGroups: [0, 1] }] });
  equal([bad[0].status, bad[0].class], ['hash-mismatch', null], 'a hash mismatch is reported, never classified');
  throws(function () {
    S.classifyParents(SG, { config: { variantId: 'x', difficulty: 'nightmare', seed: 1 }, solution: solution,
      parents: [{ ordinal: 1, hash: 'x', clues: 0, removedGroups: [9] }] });
  }, function (e) { return e.code === 'parent-mismatch'; }, 'an unknown group stops');
});

// --- the host-side executor on a scripted fake worker -------------------------------------------------------------------------------------------

function fakeWorkerFactory(script) {
  const EventEmitter = require('events');
  return function (file, data) {
    const w = new EventEmitter();
    w.postMessage = function (msg) {
      if (msg && msg.type === 'job') setImmediate(function () { script.onJob(w, msg.job, data); });
    };
    w.terminate = function () {
      setImmediate(function () { w.emit('exit', 0); });
      return Promise.resolve(0);
    };
    setImmediate(function () {
      w.emit('message', { type: 'ready', loadMs: 5, runtimeFingerprint: 'fake', adapterIds: data.adapterIds || [],
        adapterHashes: [], transforms: [], patchedFiles: [], proof: null, catalogue: null });
    });
    return w;
  };
}

function fakeWire(exact) {
  return { v: 1, model: { variantId: 'mega16', cellCount: 4, digits: 4, units: [], unitMeta: [], cages: [], inequalities: [],
    layout: {}, symbols: {}, fixedCells: [] }, givens: [1, 0, 0, 4], solution: [1, 2, 3, 4], rating: { level: 'nightmare',
    score: 1700, solved: true }, exact: exact, seed: 101, config: { variantId: 'mega16', difficulty: 'nightmare', seed: 101 },
  timings: {}, attempts: 1, warnings: [], digLog: [], work: [{ ratings: 3, proposals: 0, maxRatings: 1024, maxProposals: 32768,
    localSearches: [] }] };
}

function fakeTrial(status) {
  const info = { groups: 128, cells: 256, digits: 16, gridHash: 'h', nativeConstants: { CAP_RATINGS: 1024, CAP_PROPOSALS: 32768,
    OBJECTIVE_STEPS: 100000, UNIQUE_NODES: 200000, DEFAULT_DIG_TRIES: 12, DEFAULT_DIG_TRIES_COARSE: 30 } };
  const s1 = sampleRow(1, { frontier: { rungs: [{ id: 'cheap', ids: ['nakedSingle'], effectiveIds: ['nakedSingle'] }] } });
  return Object.assign({ mode: 'F1', kind: 'frontier', cell: 'mega16', seed: 101, status: status, limits: { floorTests: 384 },
    ceilings: { floorTests: 384 }, limitOrigin: 'supplied', samplesPlanned: 2, samples: [s1, sampleRow(2)], skipped: [],
    firstExact: null, bestOrdinal: 1, digTries: 12, nativeCaps: null, forkLabels: ['model', 'grid#1', 'dig#1.1', 'dig#1.2'],
    best: { source: 'fallback', exact: false, quality: 1000, level: 'veryEasy', score: 0 }, bestSource: 'fallback',
    gridBuild: { wallMs: 5 }, performanceScope: 'x', engineMs: 12 }, info);
}

add('host.trial-executor-guard', 'host', 'the executor stamps every sample, re-opens the 45 s guard at each sample start and keeps a censored sample\'s progress and CPU', async function () {
  const H = require('./host.cjs');
  const IG05 = require('./ig05-run.cjs');
  const RUN = require('./run.cjs');
  const manifest = M.buildManifest('IG-S05', 'provisional-r1');
  const job = manifest.jobs.find(function (j) { return j.key.endsWith('mega16:nightmare:101/F1'); });
  const seen = [];
  const mk = function (mode, guards) {
    const script = { onJob: function (w, j) {
      seen.push(j.kind);
      if (j.kind === 'ig05-parent') {
        w.emit('message', { type: 'parent-result', parents: j.parents.map(function (p) {
          return { ordinal: p.ordinal, hash: p.hash, expectedHash: p.hash, hashMatches: true, status: 'classified', class: 'below',
            unique: true, rating: { solved: true, level: 'master' }, clues: 30, errors: [] }; }) });
        return;
      }
      const t = fakeTrial(mode === 'budget' ? 'sample-budget' : 'complete');
      w.emit('message', { type: 'grid-built', wallMs: 5, counters: {}, stats: {}, info: { groups: 128, cells: 256, digits: 16,
        gridHash: 'h', nativeConstants: t.nativeConstants } });
      w.emit('message', { type: 'sample-start', ordinal: 1, fork: 'dig#1.1', kind: 'frontier' });
      w.emit('message', { type: 'progress', phase: 'rung-start', floorTests: 0, ladderPasses: 1, removals: 0, entries: 0,
        phaseBSolves: 0, canonicalRatings: 1, counters: {}, rung: 'cheap' });
      if (mode === 'hang1') return;
      w.emit('message', { type: 'sample-end', ordinal: 1, status: 'complete', claimedExact: false, engineMs: 3, class: 'fallback' });
      w.emit('message', { type: 'sample-start', ordinal: 2, fork: 'dig#1.2', kind: 'frontier' });
      if (mode === 'hang2') return;
      w.emit('message', { type: 'sample-end', ordinal: 2, status: 'complete', claimedExact: false, engineMs: 3, class: 'fallback' });
      w.emit('message', { type: 'decision', wire: fakeWire(false), engineElapsedMs: 7, trial: t, solution: [1, 2, 3, 4],
        parentInputs: [{ ordinal: 1, hash: 'ph1', clues: 30, removedGroups: [1, 2] }, { ordinal: 2, hash: 'ph2', clues: 30,
          removedGroups: [1] }] });
    } };
    return new H.Host({ repoRoot: C.DEFAULT_REPO_ROOT, workerFactory: fakeWorkerFactory(script), testOnly: true,
      guards: Object.assign({}, C.GUARDS, guards || {}) });
  };
  const io = { repoRoot: C.DEFAULT_REPO_ROOT, attemptDir: null, catalogue: null, evidenceRoot: null };

  // a decided trial: two sample marks, grid build marks, the parent classification after the timed interval
  IG05.parentCache.clear();
  const host1 = mk('ok');
  const obs1 = await IG05.execute({ host: host1, job: job, catalogue: null, readyCheck: null });
  equal(obs1.outcome, 'complete', 'decided');
  equal(obs1.hostSamples.map(function (s) { return [s.ordinal, s.censored]; }), [[1, false], [2, false]], 'both samples stamped');
  check(obs1.hostSamples.every(function (s) { return s.wallMs >= 0 && s.cpuMs >= 0; }), 'per-sample wall and CPU');
  check(typeof obs1.generation.gridBuildWallMs === 'number', 'grid build marks');
  equal(obs1.parents.status, 'classified', 'the parents were classified after the timed interval');
  equal(obs1.parents.rows.map(function (p) { return p.class; }), ['below', 'below'], 'classes');
  equal(seen.filter(function (k) { return k === 'ig05-parent'; }).length, 1, 'one classification job for both parents');
  const rec1 = RUN.recordOfRequest(job, obs1, null, { deadlineMs: 270000 });
  IG05.augmentRecord(rec1, job, obs1, io);
  equal(R.checkRecord(rec1), [], 'a well-formed record');
  equal(rec1.samplesUsed, 2, 'two samples used');
  equal(rec1.sampleStates.map(function (s) { return s.state; }), ['returned', 'returned'], 'both ordinals returned');
  equal(rec1.intervals.gridBuildWallMs === rec1.generation.gridBuildWallMs, true, 'setup, sample and cleanup are recorded apart');
  check(rec1.limits.budget.floorTests === 384 && rec1.limits.budgetHash === job.trial.budgetHash, 'the frozen budget identity is recorded');
  equal(rec1.parents.rows.length, 2, 'parents in the record');
  // the cache: equal parents of a second trial of the same grid are not classified again
  const before = seen.length;
  const obs1b = await IG05.execute({ host: mk('ok'), job: job, catalogue: null, readyCheck: null });
  equal(obs1b.parents.rows.every(function (p) { return p.fromCache === true; }), true, 'equal parents of one grid are classified once');
  equal(seen.slice(before).filter(function (k) { return k === 'ig05-parent'; }).length, 0, 'no second classification job');

  // sample 1 never ends: the guard opened at its start cuts it; the progress posted stays
  const host2 = mk('hang1', { sampleMs: 300 });
  const obs2 = await IG05.execute({ host: host2, job: job, catalogue: null, readyCheck: null });
  equal([obs2.outcome, obs2.timeoutScope], ['request-timeout', 'sample'], 'timeout at the sample guard');
  equal(obs2.hostSamples.map(function (s) { return s.censored; }), [true], 'the open sample is censored, its wall and CPU kept');
  check(obs2.progress.length === 1 && obs2.gridInfo !== null, 'progress and geometry kept');
  const rec2 = RUN.recordOfRequest(job, obs2, null, { deadlineMs: 270000 });
  IG05.augmentRecord(rec2, job, obs2, io);
  equal(R.checkRecord(rec2), [], 'a censored record is well formed');
  equal(rec2.sampleStates.map(function (s) { return s.state; }), ['censored', 'not-reached'], 'ordinal 1 censored, ordinal 2 never reached');
  equal(rec2.counts.floorTests, null, 'unknown counts stay null, never zero');
  check(rec2.generation.cpuReadyTotalMs !== null && rec2.generation.readyOccupiedWallMs >= 250, 'the CPU and wall spent stay recorded');

  // sample 2 hangs: sample 1 is complete and stamped, the guard of sample 2 starts at ITS start
  const host3 = mk('hang2', { sampleMs: 300 });
  const obs3 = await IG05.execute({ host: host3, job: job, catalogue: null, readyCheck: null });
  equal(obs3.outcome, 'request-timeout', 'timeout in sample 2');
  equal(obs3.hostSamples.map(function (s) { return [s.ordinal, s.censored]; }), [[1, false], [2, true]], 'sample 1 complete, sample 2 censored');
  const rec3 = RUN.recordOfRequest(job, obs3, null, { deadlineMs: 270000 });
  IG05.augmentRecord(rec3, job, obs3, io);
  equal(rec3.sampleStates.map(function (s) { return s.state; }), ['returned', 'censored'], 'sample 1 returned, sample 2 censored');
  equal(rec3.samplesObserved.map(function (s) { return s.ordinal; }), [1], 'the finished sample of a censored trial is listed');

  // a budget-ended trial: its own outcome, never a hit, never validated
  const obs4 = await IG05.execute({ host: mk('budget'), job: job, catalogue: null, readyCheck: null });
  equal(obs4.outcome, 'sample-budget', 'distinct outcome');
  const rec4 = RUN.recordOfRequest(job, obs4, null, { deadlineMs: 270000 });
  IG05.augmentRecord(rec4, job, obs4, io);
  equal([rec4.outcome, rec4.claimedExact, rec4.verifiedExact], ['sample-budget', false, null], 'never an exact hit');
  equal(R.checkRecord(rec4), [], 'well formed');
});

add('host.identity', 'host', 'a cluster whose modes disagree on the grid is an identity failure', function () {
  const IG05 = require('./ig05-run.cjs');
  const rows = [{ outcome: 'complete', gridHash: 'a', gridCluster: 'mega16:101' }, { outcome: 'complete', gridHash: 'a', gridCluster: 'mega16:101' },
    { outcome: 'complete', gridHash: 'b', gridCluster: 'samurai:101' }, { outcome: 'complete', gridHash: 'c', gridCluster: 'samurai:101' },
    { outcome: 'unstarted', gridHash: null, gridCluster: 'classic9:101' }];
  const out = IG05.identity(rows);
  equal([out.ok, out.failed], [1, 1], 'one cluster agrees, one differs');
  const a = analyseOf(matrix(['mega16']).map(function (r) { return r.mode === 'F0' && r.requestSeed === 101 ? Object.assign({}, r,
    { gridHash: 'other' }) : r; }));
  check(a.anomalies.some(function (x) { return x.kind === 'grid-hash-differs-inside-cluster'; }), 'the analysis flags it too');
});

// --- the plan, the packing and the pre-registration ------------------------------------------------------------------------------------------------

add('plan.population', 'plan', 'the preregistered design: 256 trials, 32 logical blocks, tier-major, seed block 101-104 across the cells, arms rotated by cluster index', function () {
  const manifest = M.buildManifest('IG-S05', 'provisional-r1');
  equal([manifest.jobs.length, manifest.blocks.length, manifest.shards.length], [256, 32, 1], 'keys, blocks, shards');
  equal(Array.from(new Set(manifest.jobs.map(function (j) { return j.requestSeed; }))), SEEDS, 'literal seeds 101-108');
  const tiers = manifest.blocks.map(function (b) { return manifest.jobs.find(function (j) { return j.blockKey === b.blockKey; }).tier; });
  equal(Array.from(new Set(tiers)), ['primary', 'floors', 'reference', 's2-control'], 'tier order');
  const first = manifest.blocks.slice(0, 8).map(function (b) { return b.blockKey.split('/').slice(3).join('/'); });
  equal(first, ['classic9:101-104', 'mega12:101-104', 'mega16:101-104', 'samurai:101-104', 'classic9:105-108', 'mega12:105-108',
    'mega16:105-108', 'samurai:105-108'], 'seed block 101-104 across the four cells, then 105-108');
  const block = manifest.jobs.filter(function (j) { return j.blockKey === manifest.blocks[0].blockKey; });
  equal(block.map(function (j) { return j.requestSeed + j.mode.slice(0, 3); }), ['101pro', '101ord', '101F1', '102ord', '102F1', '102pro',
    '103F1', '103pro', '103ord', '104pro', '104ord', '104F1'], 'rotated by the cluster index inside the block');
  F.MODE_ORDER.forEach(function (mode) {
    equal(manifest.jobs.filter(function (j) { return j.mode === mode; }).length, 32, mode + ' 32 trials');
  });
  PLAN.CELLS.forEach(function (cell) {
    const vecs = Array.from(new Set(manifest.jobs.filter(function (j) { return j.puzzleVariant === cell && j.trial.limits; }).map(
      function (j) { return C.canonicalJson(j.trial.limits) + j.trial.budgetHash; })));
    equal(vecs.length, 1, 'one budget identity in ' + cell);
  });
  equal(manifest.jobs.filter(function (j) { return F.MODES[j.mode].kind === 'native'; }).every(function (j) { return j.trial.limits === null; }),
    true, 'native controls keep their native guards: no count budget');
  check(manifest.jobs.every(function (j) { return j.trial.samples === 2 && j.guardScope === 'sample' && j.solverMode === 'reference'; }),
    'two samples, the sample guard, the reference solver');
  check(manifest.jobs.every(function (j) { return j.estimateMs > 0 && j.estimateMs < 60000; }), 'pilot-based estimates, never the old 62 s');
  equal(PLAN.loadBudgets('provisional-r1').hash, PLAN.BUDGET_HASH, 'the frozen IG-S04 budget hash');
  const frozen = M.buildManifest('IG-S05', 'frozen-gate');
  equal([frozen.jobs.length, frozen.blocks.length], [1280, 160], 'the frozen design expands to 40 clusters per cell');
  check(PLAN.loadBudgets('frozen-gate').projection === true, 'before the frozen pilot is recomputed the budget is a labelled projection');
});

add('plan.packing', 'plan', 'whole trials pack into the 258 s window by pilot estimates in key order; a logical block may span commands and a trial is never split', function () {
  const manifest = M.buildManifest('IG-S05', 'provisional-r1');
  const keys = manifest.jobs.map(function (j) { return j.key; });
  const window = M.commandWindowMs(C.GUARDS.commandMs);
  const p = M.packCommands(M.blocksFor(manifest, keys), window);
  equal(p.oversize, [], 'no trial exceeds the window');
  equal(p.commands.reduce(function (a, c) { return a + c.jobKeys.length; }, 0), 256, 'every trial once');
  equal(p.commands.reduce(function (a, c) { return a.concat(c.jobKeys); }, []), keys, 'the physical plan keeps the logical order');
  check(p.commands.every(function (c) { return c.estimateMs <= window; }), 'every command fits the window');
  const projected = M.projectedMachineMs(p);
  check(projected < M.ALLOCATIONS_MS['IG-S05'], 'the projection (' + projected / 1000 + ' s) fits the 2,880 s allocation');
  equal(manifest.manifestHash === M.buildManifest('IG-S05', 'provisional-r1').manifestHash, true, 'the manifest hash is stable');
  check(p.hash !== manifest.manifestHash, 'the physical plan has its own hash');
});

add('plan.preregistration', 'plan', 'a missing or mismatching screen manifest, budget, runtime or catalogue stops before any trial', function () {
  const IG05 = require('./ig05-run.cjs');
  const manifest = M.buildManifest('IG-S05', 'provisional-r1');
  const budgets = PLAN.loadBudgets('provisional-r1');
  const sm = { manifestHash: manifest.manifestHash, budget: { hash: budgets.hash } };
  const ok = function (over) {
    return IG05.preregistrationProblems(Object.assign({ screenManifest: sm, manifest: manifest, budgets: budgets,
      variantManifest: null, round: 'provisional-r1' }, over || {}));
  };
  equal(ok(), [], 'a saved and matching manifest passes');
  check(ok({ screenManifest: null })[0].indexOf('missing') > 0, 'no saved manifest');
  check(ok({ screenManifest: { manifestHash: 'x', budget: { hash: budgets.hash } } })[0].indexOf('the planned keys changed') === 0, 'changed keys');
  check(ok({ screenManifest: { manifestHash: manifest.manifestHash, budget: { hash: 'y' } } })[0].indexOf('budget mismatch') === 0,
    'a different budget hash');
  check(ok({ budgets: Object.assign({}, budgets, { hash: 'z' }), screenManifest: { manifestHash: manifest.manifestHash, budget: { hash: 'z' } } })
    .some(function (p) { return p.indexOf('frozen IG-S04 budget hash') > 0; }), 'a budget that is not the frozen one');
  check(ok({ variantManifest: { hash: 'other', catalogueFingerprint: 'c', runtimeFingerprint: 'r' } }).some(function (p) {
    return p.indexOf('source mismatch') === 0; }), 'a different variant manifest');
  check(ok({ variantManifest: { hash: PLAN.VARIANT_HASH, catalogueFingerprint: 'c', runtimeFingerprint: 'r' }, catalogue: {
    fingerprint: 'other' } }).some(function (p) { return p.indexOf('source/catalogue mismatch') === 0; }), 'a different catalogue');
  check(ok({ variantManifest: { hash: PLAN.VARIANT_HASH, catalogueFingerprint: 'c', runtimeFingerprint: 'r' }, runtimeFingerprint: 'q' })
    .some(function (p) { return p.indexOf('the runtime') > 0; }), 'a different runtime');
  const frozenProblems = IG05.preregistrationProblems({ screenManifest: { manifestHash: 'm', budget: { hash: 'b' } },
    manifest: { manifestHash: 'm' }, budgets: { hash: 'b', projection: true }, round: 'frozen-gate' });
  check(frozenProblems.some(function (p) { return p.indexOf('never starts on a projection') > 0; }), 'a frozen run never starts on a projection');
  const tampered = JSON.parse(JSON.stringify(budgets.doc));
  tampered.cells.mega16.limits.floorTests = 385;
  check(PLAN.digestOfBudgets(tampered) !== tampered.hash, 'a retuned vector no longer matches its hash');
});

// --- the documents --------------------------------------------------------------------------------------------------------------------------------------

add('aggregate.documents', 'aggregate', 'the documents are built from records with explicit status; the markdown is CRLF text without NaN or undefined', function () {
  const AGG = require('./ig05-aggregate.cjs');
  const cells = PLAN.CELLS;
  const records = matrix(cells, function (cell, seed, mode) { return mode === 'F1' && seed === 101 && cell === 'mega12' ? { hit: true } : {}; });
  const manifest = M.buildManifest('IG-S05', 'provisional-r1');
  const analysis = ST.analyse({ records: records, jobs: manifest.jobs.slice(0, 0).concat(records.map(function (r) { return { key: r.key,
    puzzleVariant: r.puzzleVariant, requestSeed: r.requestSeed, gridCluster: r.gridCluster, mode: r.mode }; })), cells: cells, seeds: SEEDS,
  levels: LEVELS, requested: 'nightmare', quantumMs: 15.6 });
  const budgets = PLAN.loadBudgets('provisional-r1');
  const sm = { hash: 'smhash', manifestHash: manifest.manifestHash, budget: { hash: budgets.hash }, runtimeFingerprint: 'r' };
  const data = { manifest: Object.assign({}, manifest, { jobs: records.map(function (r) { return { key: r.key }; }) }), records: records,
    commands: [{ manifestHash: manifest.manifestHash, runtimeFingerprint: 'r', harnessFingerprint: 'h' }],
    got: { shards: [{ shard: 'screen', status: 'recorded', chain: ['a1'], unstartedKeys: [] }] } };
  const identity = AGG.identityOf(data, sm, budgets);
  equal(identity.problems, [], 'identity');
  const machine = { allocationMs: 2880000, approvedExtraMs: 0, chargedMs: 1000000, commands: 4, remainingMs: 1880000, priorityWaitMs: 5000 };
  const ctx = { round: 'provisional-r1', suffix: '', data: data, analysis: analysis, identity: identity, machine: machine, sm: sm,
    budgets: budgets, evidenceStatus: 'provisional (pre-freeze)', quantumMs: 15.6, files: ['a'] };
  ctx.acceptance = AGG.acceptance(analysis, identity, data);
  const summary = AGG.summaryDoc(ctx);
  const md = AGG.renderSummary(summary, analysis, ctx);
  check(md.indexOf('\r\n') > 0 && md.indexOf('\n') === md.indexOf('\r\n') + 1, 'CRLF text');
  check(!/NaN|undefined|Infinity/.test(md), 'no NaN, undefined or Infinity in the markdown');
  check(md.indexOf('Formal gate: **not-evaluable-pre-freeze**') > 0, 'the formal gate line');
  check(/provisional \(pre-freeze\)/.test(md), 'provisional notice');
  equal(ctx.acceptance.map(function (a) { return a.id; }), ['B01', 'B02', 'B03', 'T01', 'T02', 'T03', 'T04', 'T05'], 'acceptance rows');
  const rates = AGG.ratesDoc(analysis, 'provisional-r1', 'provisional (pre-freeze)', 15.6);
  const paired = AGG.pairedDoc(analysis, 'provisional-r1', 'provisional (pre-freeze)');
  const selection = AGG.selectionDoc(analysis, 'provisional-r1', 'provisional (pre-freeze)', sm, budgets);
  equal([typeof rates.hash, typeof paired.hash, typeof selection.hash], ['string', 'string', 'string'], 'hashes');
  equal(selection.handoff.budgetHash, PLAN.BUDGET_HASH, 'the unchanged budget hash is handed on');
  equal(selection.cells.mega12.selected, 'F1', 'the cell with a hit selects its variant');
  equal(selection.cells.mega16.winner, false, 'a cell without a hit has the non-winning default');
  const tampered = JSON.parse(JSON.stringify(data));
  tampered.commands.push({ manifestHash: 'other', runtimeFingerprint: 'r', harnessFingerprint: 'h' });
  check(AGG.identityOf(tampered, sm, budgets).problems.some(function (p) { return p.indexOf('different manifest hashes') > 0; }),
    'commands with different manifests stop the summary');
  const retuned = JSON.parse(JSON.stringify(data));
  retuned.records[8].limits = { budgetHash: budgets.hash, budget: Object.assign({}, budgets.doc.cells.mega16.limits, { floorTests: 1 }) };
  check(AGG.identityOf(retuned, sm, budgets).problems.some(function (p) { return p.indexOf('budget identity violated') >= 0; }),
    'a retuned vector breaks the budget identity');
});

add('aggregate.revision-r2', 'aggregate', 'a revision proves that r1 stands, carries the interpretation, the corrected sensitivity and the dev-check disclosure, and renders without NaN', function () {
  const AGG = require('./ig05-aggregate.cjs');
  const cells = PLAN.CELLS;
  const records = matrix(cells);
  const analysis = ST.analyse({ records: records, jobs: null, cells: cells, seeds: SEEDS, levels: LEVELS, requested: 'nightmare',
    quantumMs: 15.6 });
  const manifest = M.buildManifest('IG-S05', 'provisional-r1');
  const budgets = PLAN.loadBudgets('provisional-r1');
  const sm = { hash: 'smhash', manifestHash: manifest.manifestHash, budget: { hash: budgets.hash }, runtimeFingerprint: 'r' };
  const r1rates = AGG.ratesDoc(analysis, 'provisional-r1', 'provisional (pre-freeze)', 15.6);
  const r1 = { rates: r1rates, summary: { verdict: analysis.verdict, hash: 'sumhash' }, selection: AGG.selectionDoc(analysis,
    'provisional-r1', 'provisional (pre-freeze)', sm, budgets), paired: {} };
  const same = AGG.unchangedFromR1(analysis, r1);
  equal([same.primaryRatesEqual, same.verdictEqual, same.differing], [true, true, []], 'the same analysis changes nothing');
  const moved = JSON.parse(JSON.stringify(r1));
  moved.rates.cells.mega16.modes.F1.hits = 1;
  const diff = AGG.unchangedFromR1(analysis, moved);
  equal([diff.primaryRatesEqual, diff.differing], [false, ['mega16/F1']], 'a changed hit count stops the revision');
  moved.summary.verdict = 'other';
  equal(AGG.unchangedFromR1(analysis, moved).verdictEqual, false, 'a changed verdict stops the revision');
  const text = AGG.interpretationOf(analysis, 256).join('\n');
  check(text.indexOf('No demonstrated exact-yield benefit on this pre-MS07 cohort') === 0, 'the interpretation opens with the finding');
  check(text.indexOf('not a finding that S1 must be dropped') > 0 && text.indexOf('no S9 (bank) routing decision') > 0, 'no S1 drop, no S9 routing');
  check(text.indexOf('empty frontiers') > 0 && text.indexOf('shallow') > 0 && text.indexOf('budget') > 0, 'the three problems are named apart');
  check(text.indexOf('native samples also had zero hits') > 0, 'native samples');
  check(text.indexOf('whole-request recovery') > 0 && text.indexOf('local-search continuation') > 0, 'what the two-sample trials exclude');
  check(text.indexOf('not evidence of equivalence or non-inferiority') > 0, 'degenerate intervals');
  const dev = { file: 'dev-check-a1.json', sha256: 'a'.repeat(64), startedAt: '2026-11-14T21:11:03Z', synthetic: '7/7', keys: 1,
    harnessFingerprint: 'h'.repeat(64), manifestHash: 'm'.repeat(64), identical: 1, different: 0, charge: { chargedMs: 60029,
      occupiedMs: 15029 }, jobs: [{ key: 'IG-S05/screen/mega16:nightmare:101/F1', devOutcome: 'complete', screenOutcome: 'complete',
      same: { gridHash: true, outcome: true, claimedExact: true, sampleClasses: true, budgetStops: true }, equal: true }] };
  const data = { manifest: Object.assign({}, manifest, { jobs: records.map(function (r) { return { key: r.key }; }) }), records: records,
    commands: [{ manifestHash: manifest.manifestHash, runtimeFingerprint: 'r', harnessFingerprint: 'h' }],
    got: { shards: [{ shard: 'screen', status: 'recorded', chain: ['a1', 'a2'], unstartedKeys: [] }] } };
  const identity = AGG.identityOf(data, sm, budgets);
  const machine = { allocationMs: 2880000, approvedExtraMs: 0, chargedMs: 841285, commands: 3, remainingMs: 2038715, priorityWaitMs: 5000,
    entries: [{ shard: 'screen', chargedMs: 390000, occupiedMs: 300000 }, { shard: 'screen', chargedMs: 391256, occupiedMs: 301256 },
      { shard: 'dev-check', chargedMs: 60029, occupiedMs: 15029 }] };
  const ctx = { round: 'provisional-r1', suffix: '-r2', data: data, analysis: analysis, identity: identity, machine: machine, sm: sm,
    budgets: budgets, evidenceStatus: 'provisional (pre-freeze)', quantumMs: 15.6, files: ['a'] };
  ctx.acceptance = AGG.acceptance(analysis, identity, data, { b03Reviewed: true });
  ctx.closure = { revision: 'r2', corrections: ['a correction'], interpretation: AGG.interpretationOf(analysis, 256),
    unchangedFromR1: same, devChecks: [dev], changedBefore: ['a change'] };
  const summary = AGG.summaryDoc(ctx);
  equal(summary.revision, 'r2', 'revision label');
  const md = AGG.renderSummary(summary, analysis, ctx);
  check(!/NaN|undefined|Infinity/.test(md), 'no NaN, undefined or Infinity');
  ['## Revision r2', '## Interpretation', '## Setup-amortised sensitivity, corrected', '## Separate problems', '## Dev-check disclosure',
    'degenerate', 'wrapped dev-check', '| B03 | met |'].forEach(function (s) { check(md.indexOf(s) >= 0, 'the markdown has ' + s); });
  check(md.indexOf('Of the charge, 781.3 s belong to the 2 screen commands and 60.0 s to the wrapped dev-check') >= 0,
    'the machine section splits the dev-check charge');
  equal(AGG.ratesDoc(analysis, 'provisional-r1', 'x', 15.6, 'r2').supersedes, 'rates.json (r1)', 'the revised rates name what they supersede');
  equal(AGG.pairedDoc(analysis, 'provisional-r1', 'x', 'r2').degenerateRows.degenerate > 0, true, 'degenerate rows counted');
});

// --- engine cases (the real engine, run in the first command under the wrapper) -----------------------------------------------------------------------------

const PASS = { tick: function () {}, check: function () {} };

function gridOf(SG, cell, seed, level) {
  const cfg = SG.pipeline.normalizeConfig({ variantId: cell, difficulty: level, seed: seed, trace: 'off', symmetry: 'rotational180',
    digOrder: 'random' });
  const def = SG.variants.get(cfg.variantId);
  const rng = SG.rng.create(cfg.seed);
  const model = def.build(cfg.variantOptions, rng.fork('model'));
  const spec = SG.difficulty.spec(level, model);
  const solution = SG.fullGrid.generate(model, rng.fork('grid#1'), PASS, { emit: SG.events.toEmitter(null), stepEvents: false, stats: {} });
  return { cfg: cfg, model: model, spec: spec, rng: rng, solution: solution, level: level };
}

function engineSynthetic(io) {
  const SG = io.SG;
  const rt = SG.__igRt;
  const results = [];
  const run = function (id, title, fn) {
    try {
      fn();
      results.push({ id: id, group: 'engine', ok: true, title: title });
    } catch (err) {
      results.push({ id: id, group: 'engine', ok: false, title: title, detail: { error: String(err && err.message ? err.message : err) } });
    }
  };
  const W04 = require('./ig04-worker.cjs');
  const level = 'nightmare';
  const trialOf = function (g, modeId, limits, samplesMax) {
    rt.reset();
    return S.runScreenTrial({ SG: SG, rt: rt, model: g.model, solution: g.solution, spec: g.spec, level: level, cfg: g.cfg, rng: g.rng,
      mode: F.MODES[modeId], budget: PASS, limits: limits, progress: function () {}, samplesMax: samplesMax === undefined ? 2 : samplesMax });
  };
  const ceilingsOf = function (g) {
    return W04.limitsFor(rt, g.model, SG.symmetry.groups(g.model, g.cfg.symmetry).length, {}).limits;
  };
  run('engine.native-first-sample-equals-s04', 'the first native sample of the screen is the IG-S04 sample (both kinds, classic9)', function () {
    ['proposal-only', 'ordinary-only'].forEach(function (m) {
      const g = gridOf(SG, 'classic9', 101, level);
      rt.reset();
      const old = F.runNative({ SG: SG, rt: rt, model: g.model, solution: g.solution, spec: g.spec, level: level, cfg: g.cfg,
        rng: g.rng.fork('dig#1.1'), budget: PASS, kind: F.MODES[m] });
      const g2 = gridOf(SG, 'classic9', 101, level);
      const mine = trialOf(g2, m, null, 1);
      equal([F.hashGivens(old.best.givens), old.best.exact], [F.hashGivens(mine.best.givens), mine.best.exact], m + ' sample 1');
      equal(old.best.source, mine.best.source, m + ' source');
    });
  });
  run('engine.trial-all-modes', 'the trial of every mode on classic9: forks, early stop, wire, parent hash and classification', function () {
    const g0 = gridOf(SG, 'classic9', 101, level);
    const limits = ceilingsOf(g0);
    F.MODE_ORDER.forEach(function (m) {
      const g = gridOf(SG, 'classic9', 101, level);
      const r = trialOf(g, m, F.MODES[m].kind === 'frontier' ? limits : null);
      check(r.samples.length >= 1 && r.samples.length <= 2, m + ': one or two samples');
      equal(r.samples.map(function (s) { return s.fork; }), ['dig#1.1', 'dig#1.2'].slice(0, r.samples.length), m + ': forks');
      equal(r.samples.length + r.skipped.length <= 2, true, m + ': ordinals are within two');
      const exactAt = r.samples.findIndex(function (s) { return s.claimedExact === true; });
      if (exactAt >= 0) equal(r.samples.length, exactAt + 1, m + ': an exact sample is the last one');
      if (r.skipped.length > 0) check(S.SKIP_REASONS.indexOf(r.skipped[0].reason) >= 0, m + ': a known skip reason');
      check(r.best !== null, m + ': a candidate');
      const wire = W04.wireOf(SG, g.cfg, g.solution, g.model, r.best, r.caps);
      SG.pipeline.fromWire(wire);
      if (F.MODES[m].kind === 'frontier') {
        equal(r.parentInputs.length, r.samples.length, m + ': one parent per sample');
        const rows = S.classifyParents(SG, { config: { variantId: 'classic9', difficulty: level, seed: 101, trace: 'off',
          symmetry: 'rotational180', digOrder: 'random' }, solution: Array.from(g.solution), parents: r.parentInputs, ms: 10000 });
        rows.forEach(function (p) {
          check(p.hashMatches === true && p.status === 'classified' && S.CLASSES.indexOf(p.class) >= 0, m + ': parent classified (' + p.status + ' ' + p.class + ')');
        });
      }
    });
  });
  run('engine.determinism', 'the same trial twice gives the same samples (forks never depend on scheduling)', function () {
    const sig = function (r) {
      return r.samples.map(function (s) { return [s.puzzleHash || (s.best && s.best.puzzleHash) || null, s.quality === undefined ? null :
        s.quality, s.claimedExact]; });
    };
    ['F1', 'ordinary-only'].forEach(function (m) {
      const limits = F.MODES[m].kind === 'frontier' ? ceilingsOf(gridOf(SG, 'classic9', 102, level)) : null;
      equal(sig(trialOf(gridOf(SG, 'classic9', 102, level), m, limits)), sig(trialOf(gridOf(SG, 'classic9', 102, level), m, limits)),
        m + ': identical samples');
    });
  });
  run('engine.second-fork-differs', 'sample 2 of a frontier trial uses another dig order than sample 1', function () {
    const g = gridOf(SG, 'classic9', 103, level);
    const r = trialOf(g, 'F0', ceilingsOf(g));
    if (r.samples.length < 2) return;
    const a = r.samples[0].frontier.removals.map(function (x) { return x[0]; }).join(',');
    const b = r.samples[1].frontier.removals.map(function (x) { return x[0]; }).join(',');
    check(a !== b, 'the two samples removed groups in the same order');
  });
  run('engine.frontier-budget-per-sample', 'a count budget stops each frontier sample separately and the trial ends sample-budget', function () {
    const g = gridOf(SG, 'classic9', 101, level);
    const limits = Object.assign({}, ceilingsOf(g), { floorTests: 3 });
    const r = trialOf(g, 'F1', limits);
    equal(r.samples.map(function (s) { return s.status; }), ['sample-budget', 'sample-budget'], 'both stop');
    equal(r.samples.map(function (s) { return s.counts.floorTests; }), [3, 3], 'at their own limit');
    equal(r.status, 'sample-budget', 'trial status');
    equal(r.best.source, 'fallback', 'valid fallback');
    equal(rt.limits, null, 'limits cleared');
  });
  return results;
}

function engineSyntheticVerify(io) {
  const SG = io.SG;
  const results = [];
  const run = function (id, title, fn) {
    try {
      fn();
      results.push({ id: id, group: 'engine', ok: true, title: title });
    } catch (err) {
      results.push({ id: id, group: 'engine', ok: false, title: title, detail: { error: String(err && err.message ? err.message : err) } });
    }
  };
  const level = 'nightmare';
  const cfgOf = { variantId: 'classic9', difficulty: level, seed: 101, trace: 'off', symmetry: 'rotational180', digOrder: 'random' };
  run('verify.classifier-unpatched', 'the classifier runs on an unpatched instance', function () {
    check(SG.__igHooks === undefined && SG.__igRt === undefined, 'the instance is native');
  });
  run('verify.classifier-cases', 'a fully given grid is unique and below the band, an empty grid is ambiguous, a wrong hash is refused', function () {
    const g = gridOf(SG, 'classic9', 101, level);
    const none = S.classifyParents(SG, { config: cfgOf, solution: Array.from(g.solution), parents: [{ ordinal: 1,
      hash: F.hashGivens(g.solution), clues: 81, removedGroups: [] }], ms: 10000 })[0];
    equal([none.status, none.unique, none.class], ['classified', true, 'below'], 'fully given');
    const groups = SG.symmetry.groups(g.model, 'rotational180');
    const all = groups.map(function (x, i) { return i; });
    const empty = Int32Array.from(g.solution);
    groups.forEach(function (grp) { for (let k = 0; k < grp.length; k++) empty[grp[k]] = 0; });
    const amb = S.classifyParents(SG, { config: cfgOf, solution: Array.from(g.solution), parents: [{ ordinal: 1, hash: F.hashGivens(empty),
      clues: 0, removedGroups: all }], ms: 10000 })[0];
    equal([amb.status, amb.unique, amb.class], ['classified', false, 'ambiguous'], 'empty grid');
    const wrong = S.classifyParents(SG, { config: cfgOf, solution: Array.from(g.solution), parents: [{ ordinal: 1, hash: 'wrong', clues: 81,
      removedGroups: [] }], ms: 10000 })[0];
    equal([wrong.status, wrong.class], ['hash-mismatch', null], 'wrong hash');
  });
  return results;
}

// --- the runner --------------------------------------------------------------------------------------------------------------------------------------------------

async function runPure(filter) {
  const results = [];
  for (let i = 0; i < registry.length; i++) {
    const t = registry[i];
    if (filter && t.id.indexOf(filter) < 0) continue;
    const t0 = Date.now();
    try {
      await t.fn();
      results.push({ id: t.id, group: t.group, ok: true, title: t.title, ms: Date.now() - t0 });
    } catch (err) {
      results.push({ id: t.id, group: t.group, ok: false, title: t.title, ms: Date.now() - t0,
        detail: { error: String(err && err.stack ? err.stack.split('\n').slice(0, 5).join(' | ') : err) } });
    }
  }
  return { ok: results.every(function (r) { return r.ok; }), results: results };
}

module.exports = { registry, runPure, engineSynthetic, engineSyntheticVerify };

if (require.main === module) {
  const only = process.argv.slice(2).filter(function (a) { return /^--filter=/.test(a); }).map(function (a) { return a.slice(9); })[0];
  runPure(only).then(function (out) {
    out.results.forEach(function (r) {
      process.stdout.write((r.ok ? 'ok   ' : 'FAIL ') + r.id + ' (' + r.ms + ' ms)' + (r.ok ? '' : '\n     ' + r.detail.error) + '\n');
    });
    process.stdout.write(out.results.filter(function (r) { return r.ok; }).length + '/' + out.results.length + ' passed\n');
    process.exitCode = out.ok ? 0 : 1;
  });
}
