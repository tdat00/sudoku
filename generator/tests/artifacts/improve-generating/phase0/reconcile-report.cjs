'use strict';

/*
 * IG-S10 reconciliation (part 2): the estimate-versus-measured report. It reads the accepted evidence of IG-S01 to IG-S09
 * (IG-S02 summary-r2 with the Killer audit overlay, IG-S03 summary-r3, IG-S04 summary-r2, IG-S05 summary-r2, IG-S07
 * summary-r2, IG-S08 summary-r3, IG-S09 summary-r2) and the raw records behind the headline and Greater-Than rows, recomputes
 * what the raw records can give (per-seed rows, cohort summaries, paired seed-cluster intervals, on-time lower bounds,
 * cross-checks against the accepted summaries) and builds report.json. Rendering is `reconcile-render.cjs`.
 *
 * Provisional (pre-freeze), pre-MS07. Cohorts and traces are never mixed: the trace-off headline pairs (IG-S02/S03), the
 * two-sample grid trials (IG-S04/S05), the profiled requests (IG-S07), the censored attribution (IG-S08) and the trace-summary
 * Greater-Than cohort (IG-S09) are separate sections. Nothing here is a formal gate, an adoption or a catch-up run.
 */
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const RUN = require('./run.cjs');
const G = require('./gate.cjs');
const RC = require('./reconcile.cjs');

const get = RC.get;
const HARNESS_BEFORE_IG_S10 = 'bbd5db2da6cd55bb1cbb93aab2d76777e855a8b5ece6b2ade9b33f0f9cf103b4';

// The joint report's anchors, labelled P (Measured today where the report says so; Derived or Projection otherwise).
const CELLS = Object.freeze(['mega16', 'mega12', 'samurai', 'classic9', 'killer', 'greaterThan']);
const ANCHORS = Object.freeze({
  mega16: { label: 'mega16 Nightmare', attempts: 2, today: { value: 104.11, p95: 116.95, statistic: 'median / p95',
    basis: 'deep requests, MS05r5m, n = 7' }, first: { median: 39, p95: 50 },
  all: { median: 11, p95: 14, envelope: [3.3, 44] }, s5a: [1.7, 1.8], checklist: 'Today 104/117; all-phase scenarios roughly 10-12 s median' },
  mega12: { label: 'mega12 Nightmare', attempts: 4, today: { value: 23.72, p95: 25.24, statistic: 'median / p95',
    basis: 'deep requests, MS05r5m, n = 7' }, first: { median: 5.4, p95: 7.2 },
  all: { median: 4.6, p95: 5.9, envelope: [1.0, 15] }, s5a: [2.8, 3.0], checklist: 'Today 24/25; after roughly 4-5 s' },
  samurai: { label: 'samurai Nightmare', attempts: 2, today: { value: 26.74, p95: null, statistic: 'maximum of two requests',
    basis: 'CV3, MS05b3: the larger of two requests, not a median' }, first: { median: 10.3, p95: 11.6 },
  all: { median: 5.6, p95: 6.5, envelope: [1.9, 19] }, s5a: [1.7, 1.8], checklist: 'Today 27; after roughly 5-6 s' },
  classic9: { label: 'classic9 Nightmare', attempts: 8, today: { value: 4.91, p95: 5.72, statistic: 'median / p95',
    basis: 'R5 cell, MS05r4, n = 12' }, first: { median: 1.17, p95: 1.7 },
  all: { median: 1.2, p95: 1.7, envelope: [0.38, 3.2] }, s5a: [2.8, 3.0], checklist: 'Today 4.9/5.7; after roughly 1.2 s' },
  killer: { label: 'Killer Nightmare', attempts: 8, today: { value: 17.82, p95: 29.98, statistic: 'median / p95',
    basis: 'I5 per-request results, MS05b3' }, first: { median: 4.5, p95: 9.8 },
  all: { median: 4.5, p95: 9.8, envelope: [2.8, 17.9] }, s5a: [2.8, 3.0], checklist: 'Today 17.8/30; roughly 4-5 s, no S1' },
  greaterThan: { label: 'Greater-Than Nightmare', attempts: 8, today: { value: 9.30, p95: 19.19, statistic: 'median / p95',
    basis: 'I5 per-request results, MS05b3' }, first: { median: 2.2, p95: 6.0 },
  all: { median: 2.2, p95: 6.0, envelope: [1.2, 9.4] }, s5a: [2.8, 3.0], checklist: 'Today 9.3/19.2; roughly 2-3 s, no cell frontier' }
});
const S3_RANGE = [1.3, 1.65];
const SM2_CELLS = Object.freeze(['classic9', 'mega12', 'mega16', 'samurai']);
const MODE_ORDER = Object.freeze(['proposal-only', 'ordinary-only', 'F0', 'F1', 'FC', 'FM', 'FU', 'FS']);

const num = function (x) { return typeof x === 'number' && Number.isFinite(x) ? x : null; };
const secs = function (ms) { return num(ms) === null ? null : ms / 1000; };
const round = function (x, d) {
  if (num(x) === null) return null;
  const k = Math.pow(10, d === undefined ? 3 : d);
  return Math.round(x * k) / k;
};
const ratio = R.ratio;

function sortedCopy(list) { return list.slice().sort(function (a, b) { return a - b; }); }

function describeX(values) {
  const d = R.describe(values);
  const sorted = sortedCopy(values.filter(num));
  d.min = sorted.length ? sorted[0] : null;
  return d;
}

// --- cross-checks against the accepted summaries --------------------------------------------------------------------------------

function newChecks() {
  const list = [];
  return {
    list: list,
    add: function (id, expected, actual, tolerance) {
      const tol = tolerance === undefined ? 1e-6 : tolerance;
      let ok;
      if (expected === null || actual === null || expected === undefined || actual === undefined) ok = expected === actual;
      else if (typeof expected === 'number' && typeof actual === 'number') {
        ok = Math.abs(expected - actual) <= tol * Math.max(1, Math.abs(expected), Math.abs(actual));
      } else ok = C.canonicalJson(expected) === C.canonicalJson(actual);
      list.push({ id: id, accepted: expected === undefined ? null : expected, recomputed: actual === undefined ? null : actual,
        ok: ok });
    }
  };
}

// --- the headline cohort (IG-S02, IG-S03): trace off, Nightmare, H3 -------------------------------------------------------

function briefOf(r) {
  if (!r) return null;
  const g = r.generation || {};
  return {
    outcome: r.outcome, readyWallS: secs(g.readyWallMs), coldWallS: secs(g.coldWallMs), cpuTotalS: secs(g.cpuTotalMs),
    startupMs: round(g.startupMs, 1), cleanupMs: round(g.cleanupMs, 1), cpuStatus: g.cpuResolutionStatus,
    verifiedExact: r.verifiedExact === true, claimedExact: r.claimedExact === true, attemptsUsed: r.attemptsUsed,
    firstExactOrdinal: r.firstExactOrdinal, firstExactOrigin: r.firstExactOrigin
  };
}

function arrayOf(rows, pick) { return rows.map(pick).filter(num); }

/**
 * The paired per-seed rows and cohort summaries of the six headline cells, recomputed from the raw records (the IG-S02
 * records with the Killer overlay, the IG-S03 timing records) and checked against the accepted summaries.
 */
function headlineCells(ctx) {
  const s02 = ctx.s02Records;
  const s03 = ctx.s03Records.filter(function (r) { return r.variantId === 'scoped-attempts-w4' || r.variantId === 'scoped-native-w1'; });
  const sum2 = ctx.evidence.s02Summary.doc;
  const sum3 = ctx.evidence.s03Summary.doc;
  const quantum = ctx.quantumMs;
  const checks = ctx.checks;
  return CELLS.map(function (cell) {
    const anchor = ANCHORS[cell];
    const byVariant = function (list, id) { return list.filter(function (r) { return r.puzzleVariant === cell && r.variantId === id; }); };
    const native = byVariant(s02, 'native-w1');
    const pool = byVariant(s02, 'attempts-w4');
    const scopedPool = byVariant(s03, 'scoped-attempts-w4');
    const scopedSerial = byVariant(s03, 'scoped-native-w1');
    const seeds = sortedCopy(native.map(function (r) { return r.requestSeed; }));
    const pick = function (list, seed) { return list.find(function (r) { return r.requestSeed === seed; }) || null; };
    const rows = seeds.map(function (seed) {
      const n = pick(native, seed);
      const p = pick(pool, seed);
      const sp = pick(scopedPool, seed);
      const ss = pick(scopedSerial, seed);
      const ok = function (r) { return r && r.outcome === 'complete'; };
      const rr = function (a, b, field) { return ok(a) && ok(b) ? ratio(a.generation[field], b.generation[field]) : null; };
      return {
        pairId: n.pairId, seed: seed, nativeW1: briefOf(n), attemptsW4: briefOf(p), scopedAttemptsW4: briefOf(sp),
        scopedNativeW1: briefOf(ss),
        ratios: { s5aReady: rr(n, p, 'readyWallMs'), s5aCold: rr(n, p, 'coldWallMs'), s5aCpu: rr(p, n, 'cpuTotalMs'),
          partialS3Serial: ss ? rr(n, ss, 'readyWallMs') : null, partialS3Incremental: rr(p, sp, 'readyWallMs'),
          combinedReady: rr(n, sp, 'readyWallMs'), combinedCpu: rr(sp, n, 'cpuTotalMs') }
      };
    });
    const ratioArray = function (key) { return rows.map(function (r) { return r.ratios[key]; }).filter(num); };
    const factors = {};
    ['s5aReady', 's5aCold', 's5aCpu', 'partialS3Serial', 'partialS3Incremental', 'combinedReady', 'combinedCpu']
      .forEach(function (k) { factors[k] = describeX(ratioArray(k)); });
    const arms = {};
    [['native-w1', native], ['attempts-w4', pool], ['scoped-attempts-w4', scopedPool], ['scoped-native-w1', scopedSerial]]
      .forEach(function (pair) {
        const recs = pair[1];
        const a = R.armSummary(recs, quantum);
        const done = recs.filter(function (r) { return r.outcome === 'complete'; });
        arms[pair[0]] = {
          requests: recs.length, complete: a.complete, censored: a.censored, errors: a.errors, unstarted: a.unstarted,
          verifiedExact: a.verifiedHits,
          readyWallS: describeX(arrayOf(done, function (r) { return secs(r.generation.readyWallMs); })),
          coldWallS: describeX(arrayOf(done, function (r) { return secs(r.generation.coldWallMs); })),
          cpuTotalS: describeX(arrayOf(done, function (r) { return secs(r.generation.cpuTotalMs); })),
          startupMs: describeX(arrayOf(done, function (r) { return r.generation.startupMs; })),
          cleanupMs: describeX(arrayOf(done, function (r) { return r.generation.cleanupMs; })),
          spentCpuS: secs(a.cpuTotalAggregateMs), spentColdWallPlusCleanupS: secs(a.wallChargedMs),
          hitsPerCpuSecond: a.hitsPerCpuSecond, hitsPerColdWallSecond: a.hitsPerColdWallSecond,
          rateBasis: 'verified exact requests over ALL spent CPU (startup, speculation and cleanup included) and over cold wall ' +
            'plus cleanup; unknown stays null' };
      });
    // paired seed-cluster intervals (descriptive, 2,000 resamples, fixed analysis seed 20261114): ratio of cohort totals
    const complete = rows.filter(function (r) { return r.nativeW1 && r.attemptsW4 && r.nativeW1.outcome === 'complete' &&
      r.attemptsW4.outcome === 'complete'; });
    const totalsRatio = function (key1, key2, field) {
      return function (drawn) {
        const a = drawn.reduce(function (n, r) { return n + r[key1][field]; }, 0);
        const b = drawn.reduce(function (n, r) { return n + r[key2][field]; }, 0);
        return b > 0 ? a / b : null;
      };
    };
    const intervals = {
      s5aReadyWallRatioOfTotals: R.bootstrapClusters(complete, totalsRatio('nativeW1', 'attemptsW4', 'readyWallS')),
      s5aCpuRatioOfTotals: R.bootstrapClusters(complete, totalsRatio('attemptsW4', 'nativeW1', 'cpuTotalS')),
      note: 'whole seed clusters resampled together (a pair is never split); n = 3 clusters: descriptive provisional ' +
        'intervals with poor small-sample coverage, not confidence guarantees and not a gate input'
    };
    // the direct full-request on-time exact lower bound beside the rates (cold wall to decision; seeds assumed independent)
    const budgetMs = G.onTimeBudgetMs(cell);
    const onTimeOf = function (recs) {
      const k = recs.filter(function (r) {
        return r.outcome === 'complete' && r.verifiedExact === true && r.generation.coldWallMs <= budgetMs;
      }).length;
      const n = recs.length;
      return { onTimeVerifiedExact: k, started: n, lowerBound95OneSided: n > 0 ? R.binomialLowerBound(k, n, 0.05) : null,
        maximumPossibleLowerBound: n > 0 ? R.binomialLowerBound(n, n, 0.05) : null };
    };
    const onTime = { budgetS: budgetMs / 1000, basis: 'verified exact AND cold wall to decision within the budget; request seeds ' +
      'assumed independent; exact one-sided 95 % binomial lower bound',
    nativeW1: onTimeOf(native), attemptsW4: onTimeOf(pool), scopedAttemptsW4: onTimeOf(scopedPool),
    reading: 'with n = 3 the largest attainable lower bound is ' + round(R.binomialLowerBound(3, 3, 0.05), 3) +
      ': this statistic cannot approach 0.5 on this cohort and corroborates nothing about feasibility' };

    // cross-checks against the accepted summaries
    const c2 = sum2.cells.find(function (c) { return c.cell === cell; });
    checks.add('IG-S02 ' + cell + ' s5a ready p50', get(c2, 'readySpeedup.p50'), factors.s5aReady.p50);
    checks.add('IG-S02 ' + cell + ' s5a cpu ratio p50', get(c2, 'cpuRatio.p50'), factors.s5aCpu.p50);
    checks.add('IG-S02 ' + cell + ' native ready p50 s', get(c2, 'native.readyWallS.p50'), round(arms['native-w1'].readyWallS.p50, 2), 0.011);
    checks.add('IG-S02 ' + cell + ' verified exact native', get(c2, 'native.verifiedExact'), arms['native-w1'].verifiedExact);
    checks.add('IG-S02 ' + cell + ' verified exact pooled', get(c2, 'pooled.verifiedExact'), arms['attempts-w4'].verifiedExact);
    const c3 = sum3.cells.find(function (c) { return c.cell === cell; });
    checks.add('IG-S03 ' + cell + ' combined ready p50', get(c3, 'combined.factor.p50'), factors.combinedReady.p50);
    checks.add('IG-S03 ' + cell + ' incremental ready p50', get(c3, 'incremental.factor.p50'), factors.partialS3Incremental.p50);
    checks.add('IG-S03 ' + cell + ' serial n', get(c3, 'serial.factor.n'), factors.partialS3Serial.n);
    return {
      cell: cell, label: anchor.label, attempts: anchor.attempts, anchors: anchor, pairs: rows, arms: arms, factors: factors,
      intervals: intervals, onTime: onTime,
      pool: get(c2, 'pool'), above120s: get(c2, 'above120s'), acceptedS5aVerdict: get(c2, 'verdict'),
      acceptedPartialS3: { serial: get(c3, 'serial.verdict'), incremental: get(c3, 'incremental.verdict'),
        combined: get(c3, 'combined.verdict'), earlyExactRegressions: get(c3, 'earlyExactRegressions') },
      speculation: get(c3, 'speculation')
    };
  });
}

/**
 * A descriptive difference to a report anchor: no threshold, no verdict (the pack names none). The numbers are shown, the
 * reader decides.
 */
function descriptiveDifference(measured, anchor) {
  if (num(measured) === null || num(anchor) === null || anchor === 0) return { measured: measured, anchor: anchor, absolute: null, relative: null };
  return { measured: measured, anchor: anchor, absolute: measured - anchor, relative: (measured - anchor) / anchor };
}

/** The IG-S02 rule (accepted by the pack author) for the report's S5a planning range; a planning-factor reading, nothing more. */
function s5aVerdict(factors, low) {
  const f = factors.s5aReady;
  if (f.n === 0) return 'inconclusive';
  if (f.p50 >= low) return 'supported';
  return f.max < low ? 'below-planning-range-on-all-observed-pairs' : 'inconclusive';
}

/** Percentage-point difference of a measured share to the report's share (descriptive; no threshold). */
function pointsDifference(measuredShare, anchorShare) {
  return num(measuredShare) === null ? null : (measuredShare - anchorShare) * 100;
}

// --- SM2: the frontier screen (IG-S05, grid trials) and the pilot (IG-S04) ----------------------------------------------------

/** The ordinary / proposal sample counts and the mean solves per ordinary sample of the profiled headline requests (IG-S07). */
function sm1SampleMix(ctx) {
  const four = /classic9:nightmare:3|mega16:nightmare:3|mega12:nightmare:3|samurai:nightmare:42/;
  return get(ctx.evidence.s07Summary.doc, 'cells', []).filter(function (c) {
    return c.kind === 'headline' && get(c, 'sampleKinds.ordinary');
  }).map(function (c) {
    const o = c.sampleKinds.ordinary;
    const p = c.sampleKinds.proposal || null;
    return { key: c.key, fourSm1Request: four.test(c.key), ordinarySamples: o.samples, proposalSamples: p ? p.samples : null,
      equalCounts: p ? p.samples === o.samples : false, ordinaryMeanSolves: o.solves.mean, ordinaryMedianSolves: o.solves.median };
  });
}

function sm2Section(ctx) {
  const rates = ctx.evidence.s05Rates.doc;
  const sel = ctx.evidence.s05Selection.doc;
  const intervals = ctx.evidence.s05Intervals.doc;
  const sum4 = ctx.evidence.s04Summary.doc;
  const checks = ctx.checks;
  const recs = ctx.s05Records;
  const cells = SM2_CELLS.map(function (cell) {
    const modes = MODE_ORDER.map(function (mode) {
      const m = get(rates, 'cells.' + cell + '.modes.' + mode);
      const f = m.funnel;
      const mine = recs.filter(function (r) { return r.puzzleVariant === cell && r.mode === mode; });
      checks.add('IG-S05 ' + cell + ' ' + mode + ' hits', m.hits, mine.filter(function (r) {
        return r.outcome === 'complete' && r.claimedExact === true && r.verifiedExact === true; }).length);
      checks.add('IG-S05 ' + cell + ' ' + mode + ' trials', m.trials, mine.filter(function (r) {
        return r.outcome !== 'unstarted'; }).length);
      return {
        mode: mode, kind: m.kind, trials: m.trials, verifiedHits: m.hits, claimedExact: m.claimedExact,
        readyCpuS: secs(m.primary.cpuMs), readyWallS: secs(m.primary.wallMs), coldCpuS: secs(m.coldInclusive.cpuMs),
        coldWallS: secs(m.coldInclusive.wallMs), hitsPerCpuSecond: m.primary.perCpuSecond, hitsPerWallSecond: m.primary.perWallSecond,
        outcomes: m.outcomes, budgetEndedShare: m.budgetEndedShare,
        setupMs: { gridBuildCpu: m.intervals.gridBuildCpuMs, gridBuildWall: m.intervals.gridBuildWallMs,
          samplesCpu: m.intervals.samplesCpuMs, samplesWall: m.intervals.samplesWallMs,
          cleanupCpu: m.intervals.cleanupCpuMs, cleanupWall: m.intervals.cleanupWallMs, startupWall: m.intervals.startupWallMs },
        meanSampleWallMs: m.samples.meanSampleWallMs, meanSampleCpuMs: m.samples.meanSampleCpuMs,
        samplesObserved: m.samples.samplesObserved, rawExactSamples: m.samples.claimedExactSamples,
        funnel: f ? { samples: f.samples, emptyFrontierSamples: f.emptyFrontierSamples, floorTests: f.floorTests,
          acceptedByFullProof: f.acceptedByFullProof, acceptedByRederivation: f.acceptedByRederivation,
          refusedStuckUnique: f.refusedStuckUnique, refusedAmbiguous: f.refusedAmbiguous, floorSkipped: f.floorSkipped,
          phaseBTries: f.phaseBTries, canonicalRated: f.canonicalRated,
          candidates: { exact: f.candidateExact, shallow: f.candidateShallow, below: f.candidateBelow, above: f.candidateAbove },
          deepenProposals: f.deepenProposals, dfsEntries: f.dfsEntries, dfsChecks: f.dfsChecks, logicalChecks: f.logicalChecks,
          budgetStopSamples: f.budgetStopSamples, budgetStopsByDimension: f.budgetStopsByDimension,
          phaseWallShare: get(f, 'shares.wall') } : null,
        native: m.native ? { class: m.native.class, groupsTried: m.native.groupsTried, oracleCalls: m.native.oracleCalls,
          canonicalRatings: m.native.canonicalRatings } : null
      };
    });
    const selection = get(sel, 'cells.' + cell);
    const f1 = modes.find(function (m) { return m.mode === 'F1'; });
    const prop = modes.find(function (m) { return m.mode === 'proposal-only'; });
    const ord = modes.find(function (m) { return m.mode === 'ordinary-only'; });
    const meanMix = (prop.meanSampleCpuMs + ord.meanSampleCpuMs) / 2;
    const f0 = modes.find(function (m) { return m.mode === 'F0'; });
    // S2 isolated: F0 (frontier without the re-derivation) against F1 (with it), the same grids and the same samples
    const cpuByCluster = function (mode) {
      const map = new Map();
      recs.filter(function (r) { return r.puzzleVariant === cell && r.mode === mode && r.generation &&
        num(r.generation.cpuReadyTotalMs) !== null; }).forEach(function (r) { map.set(r.requestSeed, r.generation.cpuReadyTotalMs); });
      return map;
    };
    const c0 = cpuByCluster('F0');
    const c1 = cpuByCluster('F1');
    const pairedSeeds = Array.from(c1.keys()).filter(function (s) { return c0.has(s); }).sort(function (a, b) { return a - b; });
    const pairedRatios = pairedSeeds.map(function (s) { return ratio(c1.get(s), c0.get(s)); }).filter(num);
    const tot0 = pairedSeeds.reduce(function (n, s) { return n + c0.get(s); }, 0);
    const tot1 = pairedSeeds.reduce(function (n, s) { return n + c1.get(s); }, 0);
    const sameJson = function (a, b) { return C.canonicalJson(a) === C.canonicalJson(b); };
    const accepted = f1.funnel.acceptedByFullProof + f1.funnel.acceptedByRederivation;
    const planningDivisor = { classic9: '1 (81 cells)', mega12: '1.2 (144 cells)', samurai: '1.5-2 (multigrids)', mega16: '3 (mega16)' }[cell];
    return {
      cell: cell, clusters: 8, modes: modes,
      selection: { selected: selection.selected, winner: selection.winner, reason: selection.reason },
      f1SampleCostVsNative: { f1MeanSampleCpuMs: f1.meanSampleCpuMs, proposalMeanSampleCpuMs: prop.meanSampleCpuMs,
        ordinaryMeanSampleCpuMs: ord.meanSampleCpuMs, f1OverOrdinary: ratio(f1.meanSampleCpuMs, ord.meanSampleCpuMs),
        f1OverProposal: ratio(f1.meanSampleCpuMs, prop.meanSampleCpuMs), f1OverEqualWeightMix: ratio(f1.meanSampleCpuMs, meanMix),
        label: 'Derived: ratios of the mean sample CPU of the same grids. Equal weighting of the ordinary and the proposal sample ' +
          'matches the observed ordinary/proposal counts of the four SM1 requests (IG-S07/summary-r2.md lines 78-88); it remains a ' +
          'sample-cost comparator, not whole-request throughput, and early stopping can change the realised mix' },
      s1CostVsYield: {
        cost: { f1MeanSampleCpuMs: f1.meanSampleCpuMs, equalWeightMixMeanSampleCpuMs: meanMix, f1OverEqualWeightMix: ratio(f1.meanSampleCpuMs, meanMix),
          planningExpectation: 'a near-constant per-sample cost: time per sample divided by about ' + planningDivisor +
            ' (report.md:35-36, 108)', planningDivisor: planningDivisor,
          observed: 'F1 costs ' + round(ratio(f1.meanSampleCpuMs, meanMix), 2) + ' of the equal-weight native mix' },
        outcomesOfTheCheapWork: { samples: f1.funnel.samples, emptyUniqueFrontier: f1.funnel.emptyFrontierSamples,
          candidatesExact: f1.funnel.candidates.exact, candidatesShallow: f1.funnel.candidates.shallow, candidatesBelow: f1.funnel.candidates.below,
          candidatesAboveBand: f1.funnel.candidates.above, budgetStopSamples: f1.funnel.budgetStopSamples },
        yield: { f1VerifiedHits: f1.verifiedHits, allModesVerifiedHits: modes.reduce(function (n, m) { return n + m.verifiedHits; }, 0),
          costPerVerifiedExactPuzzle: null, status: 'unestablished: no verified hit in any mode, native controls included; yield inconclusive' }
      },
      s2Isolated: {
        pairedPopulation: '8 grid clusters (grid seeds 101-108), at most two samples per grid, the same grids and samples in F0 and F1, ' +
          'reference solver, width 1 (n = ' + f1.samplesObserved + ' samples per mode)',
        f0MeanSampleCpuMs: f0.meanSampleCpuMs, f1MeanSampleCpuMs: f1.meanSampleCpuMs,
        f1OverF0MeanSampleCpu: ratio(f1.meanSampleCpuMs, f0.meanSampleCpuMs),
        f1OverF0ReadyCpuOfClusterTotals: ratio(tot1, tot0),
        pairedClusterReadyCpuRatio: Object.assign({ n: pairedRatios.length }, (function () {
          const sorted = sortedCopy(pairedRatios);
          const mid = sorted.length >> 1;
          return { median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2, min: sorted[0], max: sorted[sorted.length - 1] };
        })()),
        sameDecisions: sameJson({ ft: f0.funnel.floorTests, c: f0.funnel.candidates, o: f0.outcomes, e: f0.funnel.emptyFrontierSamples },
          { ft: f1.funnel.floorTests, c: f1.funnel.candidates, o: f1.outcomes, e: f1.funnel.emptyFrontierSamples }),
        deductionSaving: { f0AcceptedByFullProof: f0.funnel.acceptedByFullProof, f0AcceptedByRederivation: f0.funnel.acceptedByRederivation,
          f1AcceptedByFullProof: f1.funnel.acceptedByFullProof, f1AcceptedByRederivation: f1.funnel.acceptedByRederivation,
          rederivationShareOfF1Accepted: accepted > 0 ? f1.funnel.acceptedByRederivation / accepted : null }
      },
      finding: get(ctx.evidence.s05Summary.doc, 'cells', []).filter(function (x) { return x.cell === cell; }).map(function (x) {
        return x.finding; })[0] || null
    };
  });
  // the cluster rows (raw, compact): the paired unit of the intervals
  const clusterRows = recs.map(function (r) {
    return { cell: r.puzzleVariant, cluster: r.requestSeed, mode: r.mode, outcome: r.outcome,
      verifiedHit: r.outcome === 'complete' && r.claimedExact === true && r.verifiedExact === true,
      readyCpuMs: r.generation ? r.generation.cpuReadyTotalMs : null, readyWallMs: r.generation ? r.generation.readyOccupiedWallMs : null };
  });
  const pilot = get(sum4, 'perCellMode', []).map(function (p) {
    return { cell: p.cell, mode: p.mode, trials: p.started, complete: p.complete, verifiedHits: p.verifiedHits,
      readyWallMsMean: p.readyOccupiedWallMsMean, cpuReadyTotalMsMean: p.cpuReadyTotalMsMean };
  });
  const totalHits = cells.reduce(function (n, c) { return n + c.modes.reduce(function (m, x) { return m + x.verifiedHits; }, 0); }, 0);
  const totalTrials = cells.reduce(function (n, c) { return n + c.modes.reduce(function (m, x) { return m + x.trials; }, 0); }, 0);
  return {
    scope: 'two-sample grid trials (grid seeds 101-108, at most two native-fork samples per grid, no local continuation, ' +
      'reference solver, width 1); NOT a whole request; per-sample cost and yield only',
    cells: cells, clusterRows: clusterRows, trialsObserved: totalTrials, verifiedHits: totalHits,
    outcomes: { complete: get(ctx.evidence.s05Summary.doc, 'coverage.complete'), budgetEnded: get(ctx.evidence.s05Summary.doc, 'coverage.budgetEnded'),
      censored: get(ctx.evidence.s05Summary.doc, 'coverage.censored'), errors: get(ctx.evidence.s05Summary.doc, 'coverage.errors') },
    intervals: { rows: get(intervals, 'degenerateRows.rows'), degenerate: get(intervals, 'degenerateRows.degenerate'),
      reading: 'all paired intervals are 0 [0, 0] over whole grid clusters: degenerate, not evidence of equivalence or ' +
        'non-inferiority' },
    verdict: get(ctx.evidence.s05Summary.doc, 'verdict'),
    selection: { rule: sel.rule, handoff: sel.handoff, perCell: cells.map(function (c) { return { cell: c.cell, ...c.selection }; }) },
    heldOut: 'unmeasured: IG-S06 (held-out request seeds 201/202, native versus the selected frontier) is deferred',
    sampleMixInSm1: sm1SampleMix(ctx),
    s2Audit: get(sum4, 's2Audit'), pilot: { scope: 'IG-S04 pilot: grid seeds 11 and 12, one sample per trial, 64 trials, the dataset that ' +
      'fitted the count budgets; kept apart from the screen', trials: get(sum4, 'coverage.planned'), rows: pilot,
    budgets: get(sum4, 'budgets', []).map(function (b) { return { cell: b.cell, status: b.status, limits: b.limits }; }),
    budgetsHash: get(sum4, 'budgetsHash') },
    problems: get(ctx.evidence.s05Summary.doc, 'interpretationNotes', [])
  };
}

// --- SM1: stage and finder profiles (IG-S07) -------------------------------------------------------------------------------------

function sm1Section(ctx) {
  const sum7 = ctx.evidence.s07Summary.doc;
  const cells = get(sum7, 'cells', []).map(function (c) {
    return {
      key: c.key, kind: c.kind, outcome: c.outcome, verifiedExact: c.verifiedExact, readyWallMs: get(c, 'timing.hostReadyWallMs'),
      sampleShare: get(c, 'sampleVsLocal.sampleShare'), localShare: get(c, 'sampleVsLocal.localShare'),
      otherShare: get(c, 'sampleVsLocal.otherShare'), solverShareOfRoot: get(c, 'solver.solverMs') / get(c, 'timing.rootMs'),
      finderCoveredShareOfRoot: get(c, 'partitionShareOfRoot.finderCovered'),
      finderRemainingShareOfRoot: get(c, 'partitionShareOfRoot.finderRemaining'), dfsShareOfRoot: get(c, 'partitionShareOfRoot.dfs'),
      stageSelfShareOfRoot: get(c, 'partitionShareOfRoot.stageSelf'),
      chainGroupShareOfRoot: get(c, 'scenarios.chainGroup.shareOfRoot'),
      scenarios: { noCoveredFinderTime: get(c, 'scenarios.scenarioNoCoveredFinderTime'),
        noNegativeCallsCovered: get(c, 'scenarios.scenarioNoNegativeCallsCoveredFinders'),
        noNegativeCallsRemaining: get(c, 'scenarios.scenarioNoNegativeCallsRemainingFinders'),
        noNegativeCallsRemainingNonChain: get(c, 'scenarios.scenarioNoNegativeCallsRemainingNonChain'),
        measuredPartialS3SerialFactor: get(c, 'scenarios.measuredPartialS3SerialFactor') },
      overhead: get(c, 'overhead'), topFinders: get(c, 'topFinders', []).slice(0, 3)
    };
  });
  return {
    scope: 'nine profiled native requests (n = 1 per cell, instrumented wall) and three unprofiled controls; attribution, not ' +
      'the before/after figure; the zero-cost scenarios are CONDITIONAL, not full-S3 ceilings (a cache costs lookups and ' +
      'invalidation; neither is measured)',
    cells: cells, registry: get(sum7, 'registry'), frontierPhaseA: get(sum7, 'frontier'),
    counterLimitation: 'solver-check totals are inexact (loop-check boundaries; chain propagation checks bypass ctx.check); ' +
      'the loop check on the real engine passed 13/13', loopCheck: get(sum7, 'loopCheck'),
    solvesPerOrdinarySample: (function () {
      const mix = sm1SampleMix(ctx);
      const four = mix.filter(function (m) { return m.fourSm1Request; }).map(function (m) { return Math.round(m.ordinaryMeanSolves); });
      return { rows: mix, fourSm1RequestsRounded: four, min: Math.min.apply(null, four), max: Math.max.apply(null, four),
        source: 'IG-S07/summary-r2.md lines 78-88 (mean solves per ordinary sample, the four SM1 requests)' };
    })(),
    reading: get(sum7, 'scenarioReading', [])
  };
}

// --- SM3: the bounded Jigsaw attribution (IG-S08) ---------------------------------------------------------------------------------

function sm3Section(ctx) {
  const sum8 = ctx.evidence.s08Summary.doc;
  const t = sum8.thisRun;
  const stages = {};
  get(sum8, 'stageLowerBounds', []).forEach(function (s) { stages[s.stage] = { wallMsLowerBound: s.wallMsLowerBound, share: s.share }; });
  return {
    scope: 'Jigsaw Expert seed 1111, one instrumented request under the 240 s Jigsaw guard: a CENSORED lower bound, not a ' +
      'completed latency, not an uncensored 325 s rerun, and no evidence that any S7 ceiling is safe',
    historical: { totalSeconds: get(sum8, 'historical.totalSeconds'), population: get(sum8, 'historical.population') },
    thisRun: { key: t.key, outcome: t.outcome, censored: t.censored, completedRequest: t.completedRequest,
      censoredLowerBoundWallS: secs(t.censoredLowerBoundWallMs), censoredLowerBoundCpuS: secs(t.censoredLowerBoundCpuToTimeoutMs),
      guardS: secs(t.guardMs), guardScope: t.guardScope, commandDeadlineMs: t.commandDeadlineMs },
    stageLowerBounds: stages, fullGridScope: get(sum8, 'fullGridScope'), counters: get(sum8, 'counters'),
    unknownCounters: get(sum8, 'unknownCounters', []).map(function (u) { return u.counter + ': ' + u.why; }),
    control: { key: get(sum8, 'control.native.key'), identity: get(sum8, 'control.identity'),
      readyWallFactor: get(sum8, 'control.overhead.readyWallFactor'), n: get(sum8, 'control.overhead.n'),
      engineChecks: get(sum8, 'control.engineChecks.passed') + '/' + get(sum8, 'control.engineChecks.total') },
    impliesForS7: get(sum8, 'impliesForS7', []),
    reading: 'the tail points at the full-grid search (Q07 option (b): versioned total-work or restart limits and an explicit ' +
      '"unknown" outcome), not at buildJigsaw, the safety count, rating or local search; consistent with, not proof of, ' +
      'the historical 325 s being the same stage; no ceiling is sized from one censored request'
  };
}

// --- Greater-Than (IG-S09): raw per-pair rows, cohort summaries and the accepted split --------------------------------------------

function gtSection(ctx) {
  const sum9 = ctx.evidence.s09Summary.doc;
  const checks = ctx.checks;
  const recs = ctx.s09Records.filter(function (r) { return r.variantId === 'g0' || r.variantId === 'g1'; });
  const levels = ['normal', 'nightmare'];
  const cohorts = {};
  levels.forEach(function (level) {
    const seeds = sortedCopy(Array.from(new Set(recs.filter(function (r) { return r.level === level; }).map(function (r) {
      return r.requestSeed; }))));
    const rows = [];
    seeds.forEach(function (seed) {
      const g0 = recs.find(function (r) { return r.level === level && r.requestSeed === seed && r.variantId === 'g0'; });
      const g1 = recs.find(function (r) { return r.level === level && r.requestSeed === seed && r.variantId === 'g1'; });
      if (!g0 || !g1 || g0.outcome !== 'complete' || g1.outcome !== 'complete') return;
      rows.push({ seed: seed, g0ReadyS: secs(g0.generation.readyWallMs), g1ReadyS: secs(g1.generation.readyWallMs),
        g0CpuS: secs(g0.generation.cpuTotalMs), g1CpuS: secs(g1.generation.cpuTotalMs),
        g0VerifiedExact: g0.verifiedExact === true, g1VerifiedExact: g1.verifiedExact === true,
        readyRatioG0OverG1: ratio(g0.generation.readyWallMs, g1.generation.readyWallMs),
        cpuRatioG0OverG1: ratio(g0.generation.cpuTotalMs, g1.generation.cpuTotalMs) });
    });
    const tot = function (key) { return function (drawn) { return drawn.reduce(function (n, r) { return n + r[key]; }, 0); }; };
    const stat = function (a, b) {
      return function (drawn) { const d = tot(b)(drawn); return d > 0 ? tot(a)(drawn) / d : null; };
    };
    const readyIv = R.bootstrapClusters(rows, stat('g0ReadyS', 'g1ReadyS'));
    const cpuIv = R.bootstrapClusters(rows, stat('g0CpuS', 'g1CpuS'));
    const sums = { g0ReadyS: tot('g0ReadyS')(rows), g1ReadyS: tot('g1ReadyS')(rows), g0CpuS: tot('g0CpuS')(rows), g1CpuS: tot('g1CpuS')(rows) };
    const acc = get(sum9, 'generationTime.' + level);
    checks.add('IG-S09 ' + level + ' pairs', acc.pairsCompleted, rows.length);
    checks.add('IG-S09 ' + level + ' ready totals ratio G0/G1', acc.ratioOfCohortTotals.readyWallSumG0OverSumG1, ratio(sums.g0ReadyS, sums.g1ReadyS));
    checks.add('IG-S09 ' + level + ' CPU totals ratio G0/G1', acc.ratioOfCohortTotals.cpuSumG0OverSumG1, ratio(sums.g0CpuS, sums.g1CpuS));
    const split = get(sum9, 'missSplit.' + level);
    cohorts[level] = {
      level: level, pairs: rows.length, pairsPlanned: level === 'normal' ? 20 : 10, rows: rows, sums: sums,
      readyRatioOfTotalsG0OverG1: ratio(sums.g0ReadyS, sums.g1ReadyS), cpuRatioOfTotalsG0OverG1: ratio(sums.g0CpuS, sums.g1CpuS),
      pairedMedianReadyRatio: get(acc, 'paired.perPairReadyWallRatioG0OverG1.p50'),
      intervals: { readyRatioOfTotals: readyIv, cpuRatioOfTotals: cpuIv, note: 'whole pairs resampled together; descriptive, ' +
        'poor small-sample coverage' },
      missSplit: { g0: get(split, 'g0.split'), g1: get(split, 'g1.split'), sharesOfMisses: get(split, 'g0.sharesOfMisses'),
        setupOrigins: get(split, 'g0.setupOrigins'), minimalityCoverage: get(split, 'g0.split.minimalityCoverage') },
      localStage: get(sum9, 'localStage.' + level)
    };
  });
  return {
    scope: 'Greater-Than, TRACE SUMMARY (the historical diagnostic population), not the trace-off headline: Normal seeds ' +
      '300-319 (20 pairs) and Nightmare seeds 700-709 (6 of 10 pairs; 706-709 UNSTARTED); G0 native first-allowed sign pass, ' +
      'G1 sound-solve-first in the first technique pass only; separate cohorts; no global G1 winner; no production adoption',
    cohorts: cohorts,
    pairsIdentical: get(sum9, 'parity'), physicalWork: get(sum9, 'physicalWork'),
    physicalDifference: get(sum9, 'physicalDifference'), g1Results: get(sum9, 'g1Results'),
    counterErratum: { units: get(sum9, 'counterInterpretation.units'), check: get(sum9, 'counterInterpretation.recordedFieldCheck'),
      applied: 'The recorded `counts.dfsEntries` of the 52 IG-S09 request records are countSolutions CALLS (capture.totals.dfsCalls), ' +
        'not depth-first node entries; this report calls them `dfsCalls`, never node entries; node entries and the solver\'s ' +
        'own budget checks are not instrumented (null, never zero); the records are not rewritten' },
    probes: { executedGroupChecks: get(sum9, 'probes.groupRowsExecuted'), reusedRows: get(sum9, 'probes.groupRowsReusedCopies'),
      listedRows: get(sum9, 'probes.groupRowsListed'), requestsThatExecuted: get(sum9, 'probes.requestsThatExecutedAProbe'),
      requestsThatReused: get(sum9, 'probes.requestsThatReusedAProbe'), note: get(sum9, 'probes.note') },
    cpuBasis: 'cpuTotalMs is the CPU of the whole request from the start of the worker to its cleanup (startup and cleanup ' +
      'included); the ready wall excludes startup; the two are never interchanged',
    observerControls: get(sum9, 'observerOverhead', []).map(function (o) { return { control: o.control, g0: o.g0, level: o.level,
      seed: o.seed, status: o.status, compatible: o.compatible, readyWallRatioG0OverControl: o.readyWallRatioG0OverControl,
      cpuRatioG0OverControl: o.cpuRatioG0OverControl }; }),
    unstarted: get(sum9, 'coverage.population.unstartedRows', []).map(function (r) { return r.key; }),
    namedTrap: { predicate: 'complete canonical rating below the requested band AND finalClues <= spec.minClues + 1 AND ' +
      'independently proved minimal sign set',
    normal: get(sum9, 'missSplit.normal.g0.split.trapLowerShareOfMisses'),
    nightmare: get(sum9, 'missSplit.nightmare.g0.split.trapLowerShareOfMisses'),
    note: 'an end-state classification, not intervention coverage; no causal "only 22 % can benefit" follows' },
    waits: { known: get(sum9, 'machine.priorityWaitKnownMs'), reading: 'see the budget summary: eight known shard/control waits, the dev-check wait unknown' }
  };
}

// --- machine, decisions ---------------------------------------------------------------------------------------------------

function decisionsForAuthor(ctx) {
  const FA = 'plan author (Fable) with the pack author (Astra)';
  return [
    { id: 'D1', to: FA, text: 'Approve (or change) the frozen-rerun order, populations and the budget receipt amount; this ' +
      'report only projects the cost (the frozen-rerun plan) and grants nothing.' },
    { id: 'D2', to: FA, text: 'IG-S06 (held-out requests and ordered composition): implement and run only after the frozen SM2 ' +
      'review and a separate budget approval; the first-round deferral is not a pass or a refutation. Decide whether the ' +
      'composition should still be attempted if the frozen SM2 screen has no verified hits in any mode.' },
    { id: 'D3', to: 'plan author (Fable)', text: 'Approve the assumption set that converts a verified-hit rate lower bound into a request ' +
      'fraction (the gate\'s projection stays `projection-awaits-author-review` until then) and the non-inferiority margin for ' +
      'positive-baseline cells (the evaluator defaults to zero tolerance, pending your review).' },
    { id: 'D4', to: 'plan author (Fable), design review by the pack author (Astra)', text: 'The four Nightmare extensions (wordoku, ' +
      'sohei, flower, butterfly) are listed as UNAPPROVED separate populations with proxy-based planning scenarios; decide whether ' +
      'any joins the frozen round.' },
    { id: 'D5', to: 'pack author (Astra)', text: 'IG-S09 Nightmare 706-709 (eight unstarted rows): the frozen rerun covers all ten shards; ' +
      'decide whether the Nightmare regression of G1 (0.170x ready wall on six pairs) justifies completing them or whether ' +
      'the frozen scope should drop the arm; no catch-up run is authorised here.' },
    { id: 'D6', to: 'pack author (Astra)', text: 'IG-S07 shows legacy `nishio`/`forcingChain` at about 81 % / 77 % of the single mega16 / ' +
      'mega12 profiles; frozen attribution must distinguish MS07b\'s new chain families (`forcingChainLong`, `nishioDeep`). ' +
      'Decide whether a per-finder frontier profile (unmeasured here) is wanted.' },
    { id: 'D7', to: 'plan author (Fable)', text: 'S7 (Q07 option (b)): the censored 240.015 s Jigsaw 1111 observation points at the ' +
      'full-grid search; the versioned total-work/restart limit is a design question for phase 2; no ceiling is inferred from ' +
      'this run.' },
    { id: 'D8', to: FA, text: 'Adapter, guard and footprint points carried forward: scoped S3 skipped scopes charging two or more ' +
      'virtual node checks are covered only by engine-free tests; the 120 s application guard is not what the research guards ' +
      '(180/45/240 s) measure; solver-check totals are inexact in IG-S07; Killer needed a Killer-only verifier rule.' },
    { id: 'D9', to: FA, text: 'Two measurements the first round never made (explicit unmeasured rows of the estimate table, no run ' +
      'authorised): the SM5 sweep of the pool at width 1, 2 and 4 on classic9 and mega12 Nightmare (plan.md:366; the IG-S02 ' +
      'width-4 pool and the effective two-worker operation on two-attempt boards are not that sweep) and the restricted-floor ' +
      'performance probes (an accepted floor test, a refused floor test at each floor level, a DFS uniqueness check, a full ' +
      'solve; the existing floor parity is not that experiment). Decide whether they join the frozen scope and with what ' +
      'budget.' },
    { id: 'D10', to: FA, text: 'Source preparation for the frozen rerun (prerequisite of every frozen command): a dedicated worktree ' +
      'at the attested frozen commit, a pinned harness installed and fingerprinted there, a capability inventory. Adapter repairs and ' +
      'their reproof and any recalibration are uncosted, approval-dependent work that no runtime projection in this report ' +
      'includes; the harness never falls back to the old engine.' }
  ];
}

module.exports = { CELLS, ANCHORS, S3_RANGE, SM2_CELLS, MODE_ORDER, HARNESS_BEFORE_IG_S10, newChecks, headlineCells, descriptiveDifference,
  s5aVerdict, pointsDifference, sm2Section, sm1Section, sm3Section, gtSection, decisionsForAuthor, describeX, briefOf, secs, round, num };
