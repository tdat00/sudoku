'use strict';

/*
 * The analysis of the SM2 grid screen (IG-S05, test side, provisional (pre-freeze)): pure functions over the trial records
 * (no engine, no file, nothing timed), so the reporting cases are tested on synthetic records and the aggregator reads
 * evidence only.
 *
 * One record = one grid-mode trial (one grid, at most two native-fork samples). The numerator of every rate is the number of
 * VERIFIED delivered grid hits (an independently verified exact return that the generation also claimed; a claimed hit that
 * the verifier rejected, an unverified one, a censored or budget-stopped trial and a second copy of one return never count);
 * the denominator is ALL generation work of the started trials of that mode (completed, censored, budget-stopped, errored)
 * from engine-ready to the end of cleanup, grid build included. A started trial with unknown spend makes the rate unknown
 * (null), never a smaller denominator; an unresolved CPU sum is null, never infinity. Uncertainty resamples WHOLE grid
 * clusters (all modes of one grid together), 2,000 draws, fixed analysis seed 20261114, no pseudo-count: zero hits give a zero
 * lower bound. The intervals are descriptive provisional ones with poor small-sample coverage, never reliable guarantees.
 */
const C = require('./common.cjs');
const R = require('./records.cjs');
const F = require('./frontier.cjs');

const MODES = F.MODE_ORDER;
const CONTROLS = Object.freeze(['proposal-only', 'ordinary-only']);
const FRONTIER = F.FRONTIER_IDS;
const SELECTION_ORDER = Object.freeze(['F1', 'FC', 'FM', 'FU', 'FS', 'F0']);
const FIELDS = Object.freeze({ cpu: 'cpuMs', wall: 'wallMs' });
const RESAMPLES = 2000;

function isNumber(x) {
  return typeof x === 'number' && Number.isFinite(x);
}

function sum(values) {
  return values.reduce(function (a, b) { return a + b; }, 0);
}

function mean(values) {
  const v = values.filter(isNumber);
  return v.length === 0 ? null : sum(v) / v.length;
}

function round(x, digits) {
  if (!isNumber(x)) return null;
  const k = Math.pow(10, digits === undefined ? 3 : digits);
  return Math.round(x * k) / k;
}

// --- one record as an analysis row -------------------------------------------------------------------------------------

/**
 * The analysis row of a record. `hit` is the strict numerator: outcome complete, claimed by the generation AND independently
 * verified exact. A verified-exact return that the generation did not claim is an anomaly for review, not a hit.
 */
function viewOf(rec) {
  const started = rec.outcome !== 'unstarted';
  const g = rec.generation || {};
  const iv = rec.intervals || {};
  const samples = Array.isArray(rec.samples) ? rec.samples : [];
  const hit = started && rec.outcome === 'complete' && rec.verifiedExact === true && rec.claimedExact === true;
  return {
    key: rec.key, cell: rec.puzzleVariant, seed: rec.requestSeed, cluster: rec.gridCluster, mode: rec.mode,
    kind: F.MODES[rec.mode] ? F.MODES[rec.mode].kind : null, started: started, outcome: rec.outcome,
    hit: hit,
    claimedExact: rec.claimedExact === true,
    falseExact: started && rec.claimedExact === true && rec.verifiedExact === false,
    unclaimedVerified: started && rec.verifiedExact === true && rec.claimedExact !== true,
    censored: rec.outcome === 'request-timeout',
    budgetEnded: rec.outcome === 'sample-budget',
    errored: rec.outcome === 'error' || rec.outcome === 'validation-unknown',
    cpuMs: isNumber(g.cpuReadyTotalMs) ? g.cpuReadyTotalMs : null,
    wallMs: isNumber(g.readyOccupiedWallMs) ? g.readyOccupiedWallMs : null,
    cpuColdMs: isNumber(g.cpuTotalMs) ? g.cpuTotalMs : null,
    wallColdMs: isNumber(g.occupiedWallMs) ? g.occupiedWallMs : null,
    startupWallMs: isNumber(g.startupMs) ? g.startupMs : null,
    startupCpuMs: isNumber(g.startupCpuMs) ? g.startupCpuMs : null,
    gridCpuMs: isNumber(iv.gridBuildCpuMs) ? iv.gridBuildCpuMs : (isNumber(g.gridBuildCpuMs) ? g.gridBuildCpuMs : null),
    gridWallMs: isNumber(iv.gridBuildWallMs) ? iv.gridBuildWallMs : (isNumber(g.gridBuildWallMs) ? g.gridBuildWallMs : null),
    samplesCpuMs: isNumber(iv.samplesCpuMs) ? iv.samplesCpuMs : null,
    samplesWallMs: isNumber(iv.samplesWallMs) ? iv.samplesWallMs : null,
    cleanupCpuMs: isNumber(iv.cleanupCpuMs) ? iv.cleanupCpuMs : (isNumber(g.cleanupCpuMs) ? g.cleanupCpuMs : null),
    cleanupWallMs: isNumber(iv.cleanupWallMs) ? iv.cleanupWallMs : (isNumber(g.cleanupMs) ? g.cleanupMs : null),
    digTries: isNumber(rec.digTries) ? rec.digTries : null,
    // m of the amortised sensitivity: the samples that STARTED (a censored sample counts, a skipped ordinal does not)
    samplesStarted: isNumber(rec.samplesStarted) ? rec.samplesStarted : (samples.length > 0 ? samples.length :
      (Array.isArray(rec.hostSamples) && started ? rec.hostSamples.length : null)),
    samples: samples, hostSamples: Array.isArray(rec.hostSamples) ? rec.hostSamples : [],
    sampleStates: Array.isArray(rec.sampleStates) ? rec.sampleStates.map(function (s) { return s.state; }) : null,
    skipped: Array.isArray(rec.skippedOrdinals) ? rec.skippedOrdinals : [],
    firstExactOrdinal: isNumber(rec.firstExactOrdinal) ? rec.firstExactOrdinal : null,
    puzzleHash: rec.puzzleHash === undefined ? null : rec.puzzleHash,
    gridHash: rec.gridHash === undefined ? null : rec.gridHash,
    parents: rec.parents && Array.isArray(rec.parents.rows) ? rec.parents.rows : [],
    parentsStatus: rec.parents ? rec.parents.status : null,
    budgetStops: Array.isArray(rec.budgetStops) ? rec.budgetStops : [],
    counts: rec.counts || {}
  };
}

/** One row per planned trial: the record when it exists, an unstarted row otherwise (a missing mode is never dropped). */
function rowsOf(records, jobs) {
  const byKey = new Map(records.map(function (r) { return [r.key, r]; }));
  if (!jobs) return records.map(viewOf);
  return jobs.map(function (j) {
    const rec = byKey.get(j.key);
    if (rec) return viewOf(rec);
    return viewOf({ key: j.key, puzzleVariant: j.puzzleVariant, requestSeed: j.requestSeed, gridCluster: j.gridCluster,
      mode: j.mode, outcome: 'unstarted' });
  });
}

// --- rates -----------------------------------------------------------------------------------------------------------------

/** The started rows of a set; a row with unknown spend makes the sum unknown (null). */
function spend(rows, field) {
  let total = 0;
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].started) continue;
    if (!isNumber(rows[i][field])) return null;
    total += rows[i][field];
  }
  return total;
}

function startedRows(rows) {
  return rows.filter(function (r) { return r.started; });
}

/** Verified hits per second over the started rows: null for an unknown or unresolved denominator, never infinity. */
function rateOf(rows, field, quantumMs, countOf) {
  const started = startedRows(rows);
  const hits = started.filter(countOf || function (r) { return r.hit; }).length;
  const ms = spend(started, field);
  if (started.length === 0 || ms === null) return { trials: started.length, hits: hits, ms: ms, perSecond: null, status: 'unknown' };
  const isCpu = field === 'cpuMs' || field === 'cpuColdMs';
  const status = isCpu ? R.classifyCpu(ms, quantumMs) : (ms > 0 ? 'resolved' : 'unresolved');
  return { trials: started.length, hits: hits, ms: round(ms, 3), perSecond: R.ratePerSecond(hits, ms, status),
    status: status };
}

/**
 * The setup-amortised sensitivity (derived, never the primary denominator): per started trial `readyTotal - gridCost +
 * m x gridCost / N`, where m is the number of samples that STARTED in the trial and N the native sample count (12 for
 * rotational180): the grid build is shared by m samples, so each sample carries gridCost / N and an early stop after one
 * sample carries one share, two samples two. `basis` 'one-per-trial' is the superseded r1 formula (one share whatever m was),
 * kept only to show the size of the correction.
 */
function amortised(rows, cpuOrWall, basis) {
  const started = startedRows(rows);
  let total = 0;
  for (let i = 0; i < started.length; i++) {
    const r = started[i];
    const whole = cpuOrWall === 'cpu' ? r.cpuMs : r.wallMs;
    const grid = cpuOrWall === 'cpu' ? r.gridCpuMs : r.gridWallMs;
    const m = basis === 'one-per-trial' ? 1 : r.samplesStarted;
    if (!isNumber(whole) || !isNumber(grid) || !isNumber(m) || !isNumber(r.digTries) || r.digTries <= 0) return null;
    total += (whole - grid) + m * grid / r.digTries;
  }
  return started.length === 0 ? null : total;
}

// --- clusters and the bootstrap ---------------------------------------------------------------------------------------------

/** Whole grid clusters of a cell: { seed, rows: { mode: row } }, in the preregistered seed order. */
function clustersOf(rows, cell, seeds) {
  return seeds.map(function (seed) {
    const out = { seed: seed, rows: {} };
    rows.filter(function (r) { return r.cell === cell && r.seed === seed; }).forEach(function (r) { out.rows[r.mode] = r; });
    return out;
  });
}

function rowsOfMode(clusters, mode) {
  return clusters.map(function (c) { return c.rows[mode]; }).filter(function (r) { return r !== undefined; });
}

function ratePerSecondOf(rows, field, quantumMs) {
  return rateOf(rows, field, quantumMs).perSecond;
}

/** The paired clusters (the mode and the control both started) and a verdict on coverage. */
function pairedClusters(clusters, mode, control) {
  const both = clusters.filter(function (c) {
    return c.rows[mode] && c.rows[mode].started && c.rows[control] && c.rows[control].started;
  });
  return { clusters: both, complete: both.length === clusters.length && clusters.length > 0 };
}

function ratesFor(cluster, mode, field, quantumMs) {
  return rateOf(cluster.map(function (c) { return c.rows[mode]; }).filter(Boolean), field, quantumMs).perSecond;
}

const DEGENERATE_NOTE = 'degenerate: every resample gave the same value (all-zero [0, 0] when neither arm has a hit); not ' +
  'evidence of equivalence or non-inferiority';

function intervalOf(clusters, statistic) {
  const b = R.bootstrapClusters(clusters, statistic, { resamples: RESAMPLES });
  const degenerate = b.ci95[0] !== null && b.ci95[0] === b.ci95[1] && b.lowerBound95OneSided === b.ci95[0];
  return { clusters: b.clusters, resamples: b.resamples, seed: b.seed, point: b.point, ci95: b.ci95,
    lowerBound95OneSided: b.lowerBound95OneSided, unresolvedResamples: b.unresolvedResamples,
    degenerate: degenerate, interpretation: degenerate ? DEGENERATE_NOTE : null,
    descriptive: true, note: 'descriptive provisional interval; poor small-sample coverage' };
}

// --- coverage ------------------------------------------------------------------------------------------------------------------

function coverageOf(rows, cells, seeds) {
  const out = [];
  cells.forEach(function (cell) {
    MODES.forEach(function (mode) {
      const rs = rows.filter(function (r) { return r.cell === cell && r.mode === mode; });
      const started = startedRows(rs);
      const states = { returned: 0, 'sample-budget': 0, censored: 0, error: 0, 'not-reached': 0, unstarted: 0 };
      const skips = {};
      rs.forEach(function (r) {
        if (!r.started) {
          states.unstarted += 2;
          return;
        }
        (r.sampleStates || []).forEach(function (s) {
          if (s.indexOf('skipped-') === 0) skips[s] = (skips[s] || 0) + 1;
          else if (states[s] !== undefined) states[s]++;
        });
      });
      out.push({ cell: cell, mode: mode, planned: seeds.length, rows: rs.length, started: started.length,
        complete: rs.filter(function (r) { return r.outcome === 'complete'; }).length,
        censored: rs.filter(function (r) { return r.censored; }).length,
        budgetEnded: rs.filter(function (r) { return r.budgetEnded; }).length,
        errors: rs.filter(function (r) { return r.errored; }).length,
        unstarted: rs.filter(function (r) { return !r.started; }).length,
        sampleOrdinals: Object.assign({}, states, skips),
        complete8: started.length === seeds.length });
    });
  });
  return out;
}

// --- the funnel --------------------------------------------------------------------------------------------------------------------

function levelClass(levels, level, requested, quality) {
  if (quality === 0) return 'exact';
  if (quality === 0.5) return 'shallow';
  if (level === null || level === undefined) return 'unrated';
  const a = levels.indexOf(level);
  const b = levels.indexOf(requested);
  if (a < 0 || b < 0) return 'unrated';
  return a < b ? 'below' : (a > b ? 'above' : 'shallow');
}

function zeroFunnel() {
  return { samples: 0, completeSamples: 0, emptyFrontierSamples: 0, budgetStopSamples: 0, budgetStopsByDimension: {},
    floorTests: 0, acceptedByFullProof: 0,
    acceptedByRederivation: 0, refusedStuckUnique: 0, refusedStuckUnknown: 0, refusedAmbiguous: 0, floorSkipped: 0,
    entriesAtEnd: 0, phaseBTries: 0, proofUnique: 0, proofAmbiguousAtReference: 0, proofUnknown: 0, fuFiltered: 0,
    allowedSolves: 0, allowedSolved: 0, canonicalRated: 0, canonicalComplete: 0, candidateExact: 0, candidateShallow: 0,
    candidateBelow: 0, candidateAbove: 0, deepenRuns: 0, deepenProposals: 0, deepenCommitted: 0, deepenRefused: 0,
    deepenReachedBand: 0, deepenRated: 0, deepenExact: 0, deepenShallow: 0, deepenBelow: 0, deepenAbove: 0,
    sampleClass: { exact: 0, shallow: 0, below: 0, above: 0, fallback: 0, unrated: 0, none: 0 },
    phaseWallMs: { init: 0, phaseA: 0, phaseB: 0, deepen: 0 }, purposeChecks: {}, purposeDfsEntries: {},
    purposeSolves: {}, logicalChecks: 0, dfsEntries: 0, dfsChecks: 0 };
}

/** The frontier -> uniqueness -> canonical -> deepen funnel of a set of frontier trials (every sample of every trial). */
function frontierFunnel(rows, levels, requested) {
  const f = zeroFunnel();
  rows.filter(function (r) { return r.started; }).forEach(function (r) {
    r.samples.forEach(function (s) {
      f.samples++;
      if (s.status === 'sample-budget') {
        f.budgetStopSamples++;
        const dim = s.budgetStop && s.budgetStop.dimension ? s.budgetStop.dimension : 'unknown';
        f.budgetStopsByDimension[dim] = (f.budgetStopsByDimension[dim] || 0) + 1;
      }
      const cls = s.class === null || s.class === undefined ? 'none' : s.class;
      f.sampleClass[cls] = (f.sampleClass[cls] || 0) + 1;
      const d = s.frontier;
      if (!d) return;
      // a sample that finished phase A (no budget stop) and left no frontier entry: the frontier list is empty
      if (s.status === 'complete') {
        f.completeSamples++;
        if ((d.entries || []).length === 0) f.emptyFrontierSamples++;
      }
      (d.passes || []).forEach(function (p) {
        f.floorTests += p.tests;
        f.acceptedByFullProof += p.solved;
        f.acceptedByRederivation += p.rederived;
        f.refusedStuckUnique += p.stuckUnique;
        f.refusedStuckUnknown += p.stuckUnknown;
        f.refusedAmbiguous += p.ambiguous;
        f.floorSkipped += p.skippedAmbiguous + p.skippedMinClues + p.skippedUnitMinimum;
      });
      f.entriesAtEnd += (d.entries || []).length;
      (d.phaseB || []).forEach(function (row) {
        f.phaseBTries++;
        if (row.proof === 1) f.proofUnique++;
        else if (row.outcome === 'ambiguous-at-reference') f.proofAmbiguousAtReference++;
        else f.proofUnknown++;
        if (row.outcome === 'fu-filtered-shallow') f.fuFiltered++;
        if (row.allowedStatus !== undefined) {
          f.allowedSolves++;
          if (row.allowedStatus === 'solved') f.allowedSolved++;
        }
        if (row.rating) {
          f.canonicalRated++;
          if (row.rating.solved === true) {
            f.canonicalComplete++;
            const c = levelClass(levels, row.rating.level, requested, row.quality);
            if (c === 'exact') f.candidateExact++;
            else if (c === 'shallow') f.candidateShallow++;
            else if (c === 'below') f.candidateBelow++;
            else if (c === 'above') f.candidateAbove++;
          }
        }
      });
      ((d.deepen && d.deepen.runs) || []).forEach(function (run) {
        f.deepenRuns++;
        f.deepenProposals += run.proposals;
        f.deepenCommitted += run.committed;
        f.deepenRefused += run.refused;
        if (run.reachedBand) f.deepenReachedBand++;
        if (run.result && run.result.solved === true) {
          f.deepenRated++;
          const c = levelClass(levels, run.result.level, requested, run.result.quality);
          if (c === 'exact') f.deepenExact++;
          else if (c === 'shallow') f.deepenShallow++;
          else if (c === 'below') f.deepenBelow++;
          else if (c === 'above') f.deepenAbove++;
        }
      });
      const costs = d.phaseCosts || {};
      ['init', 'phaseA', 'deepen'].forEach(function (name) {
        if (costs[name]) f.phaseWallMs[name] += costs[name].wallMs;
      });
      if (costs.phaseB) f.phaseWallMs.phaseB += costs.phaseB.wallMs - (costs.deepen ? costs.deepen.wallMs : 0);
      const purposes = s.purposes || {};
      Object.keys(purposes).forEach(function (p) {
        f.purposeChecks[p] = (f.purposeChecks[p] || 0) + purposes[p].logicalChecks;
        f.purposeDfsEntries[p] = (f.purposeDfsEntries[p] || 0) + purposes[p].dfsEntries;
        f.purposeSolves[p] = (f.purposeSolves[p] || 0) + purposes[p].solves;
      });
      const e = s.engine || {};
      f.logicalChecks += e.solverChecks || 0;
      f.dfsEntries += e.dfsEntries || 0;
      f.dfsChecks += e.dfsChecks || 0;
    });
  });
  const wall = f.phaseWallMs.init + f.phaseWallMs.phaseA + f.phaseWallMs.phaseB + f.phaseWallMs.deepen;
  f.shares = {
    wall: wall > 0 ? { init: f.phaseWallMs.init / wall, phaseA: f.phaseWallMs.phaseA / wall,
      phaseB: f.phaseWallMs.phaseB / wall, deepen: f.phaseWallMs.deepen / wall } : null,
    logicalChecksByPurpose: shareMap(f.purposeChecks, ['grid']),
    dfsEntriesByPurpose: shareMap(f.purposeDfsEntries, ['grid']),
    note: 'phase A holds every floor test and the DFS after each stuck one; phase B excludes the nested deepen; the shares are ' +
      'of the sample work after the grid, by the engine purposes the frontier code names'
  };
  return f;
}

function shareMap(map, skip) {
  const keys = Object.keys(map).filter(function (k) { return skip.indexOf(k) < 0; });
  const total = sum(keys.map(function (k) { return map[k]; }));
  if (!(total > 0)) return null;
  const out = {};
  keys.forEach(function (k) { out[k] = map[k] / total; });
  return out;
}

/** What the native samples of a kind did: classes, the dig statistics, ratings and proposals, keeper, caps. */
function nativeSummary(rows) {
  const out = { samples: 0, class: { exact: 0, shallow: 0, below: 0, above: 0, unrated: 0 }, groupsTried: 0, accepted: 0,
    rejected: 0, skipped: 0, oracleCalls: 0, canonicalRatings: 0, proposals: 0, keeperHeld: 0, keptReturned: 0 };
  rows.filter(function (r) { return r.started; }).forEach(function (r) {
    r.samples.forEach(function (s) {
      out.samples++;
      out.class[s.class] = (out.class[s.class] || 0) + 1;
      const st = s.stats || {};
      out.groupsTried += st.tried || 0;
      out.accepted += st.accepted || 0;
      out.rejected += st.rejected || 0;
      out.skipped += st.skipped || 0;
      out.oracleCalls += st.oracleCalls || 0;
      out.canonicalRatings += s.counts && isNumber(s.counts.canonicalRatings) ? s.counts.canonicalRatings : 0;
      out.proposals += s.counts && isNumber(s.counts.proposals) ? s.counts.proposals : 0;
      if (s.keeper && s.keeper.held) out.keeperHeld++;
    });
  });
  return out;
}

// --- sample-level detail -----------------------------------------------------------------------------------------------------------

function sampleDetail(rows) {
  const started = startedRows(rows);
  const samples = [];
  started.forEach(function (r) {
    r.samples.forEach(function (s) { samples.push({ row: r, s: s }); });
  });
  const marks = [];
  started.forEach(function (r) { r.hostSamples.forEach(function (m) { marks.push(m); }); });
  const exact = samples.filter(function (x) { return x.s.claimedExact === true; });
  const hashes = [];
  rows.filter(function (r) { return r.hit; }).forEach(function (r) {
    if (r.puzzleHash !== null && hashes.indexOf(r.puzzleHash) < 0) hashes.push(r.puzzleHash);
  });
  const ordinals = {};
  rows.filter(function (r) { return r.hit; }).forEach(function (r) {
    const k = r.firstExactOrdinal === null ? 'unknown' : String(r.firstExactOrdinal);
    ordinals[k] = (ordinals[k] || 0) + 1;
  });
  const skipped = {};
  started.forEach(function (r) {
    r.skipped.forEach(function (s) { const k = s.ordinal + ':' + s.reason; skipped[k] = (skipped[k] || 0) + 1; });
  });
  const count = function (field) {
    const v = samples.map(function (x) { return x.s.counts ? x.s.counts[field] : null; });
    return v.length > 0 && v.every(isNumber) ? mean(v) : null;
  };
  return {
    samplesObserved: samples.length, claimedExactSamples: exact.length,
    rawExactSampleRate: samples.length > 0 ? exact.length / samples.length : null,
    distinctHitHashes: hashes.length, firstHitOrdinal: ordinals, skippedFirstExact: skipped,
    meanSampleWallMs: round(mean(marks.filter(function (m) { return !m.censored; }).map(function (m) { return m.wallMs; })), 2),
    meanSampleCpuMs: round(mean(marks.filter(function (m) { return !m.censored; }).map(function (m) { return m.cpuMs; })), 2),
    censoredSamples: marks.filter(function (m) { return m.censored; }).length,
    meanCountsPerSample: { floorTests: round(count('floorTests'), 2), floorDeductions: round(count('floorDeductions'), 1),
      solverChecks: round(count('solverChecks'), 0), dfsEntries: round(count('dfsEntries'), 1),
      dfsChecks: round(count('dfsChecks'), 1), canonicalRatings: round(count('canonicalRatings'), 2),
      phaseBSolves: round(count('phaseBSolves'), 2), deepenProposals: round(count('deepenProposals'), 2) }
  };
}

// --- parents ---------------------------------------------------------------------------------------------------------------------------

const PARENT_CLASSES = ['exact', 'shallow', 'below', 'above', 'incomplete', 'ambiguous', 'unknown'];

/** Canonical classes of the final phase A parents of a set of frontier trials: per sample, and per distinct parent hash. */
function parentSummary(rows) {
  const perSample = {};
  PARENT_CLASSES.concat(['unclassified']).forEach(function (c) { perSample[c] = 0; });
  const distinct = new Map();
  let samplesWithParent = 0;
  rows.filter(function (r) { return r.started; }).forEach(function (r) {
    r.samples.forEach(function (s) {
      if (!s.parent) return;
      samplesWithParent++;
      const row = r.parents.find(function (p) { return p.ordinal === s.ordinal; });
      const cls = row && row.status === 'classified' && row.class ? row.class : 'unclassified';
      perSample[cls]++;
      if (row && row.status === 'classified') distinct.set(r.cell + ':' + r.seed + ':' + row.hash, row.class);
    });
  });
  const perDistinct = {};
  PARENT_CLASSES.forEach(function (c) { perDistinct[c] = 0; });
  distinct.forEach(function (cls) { perDistinct[cls] = (perDistinct[cls] || 0) + 1; });
  return { samplesWithParent: samplesWithParent, perSample: perSample, distinctParents: distinct.size, perDistinct: perDistinct,
    note: 'a diagnostic of what the omitted final parent would have rated: never steered generation, never a hit' };
}

// --- the diagnostic selection ----------------------------------------------------------------------------------------------------------

/**
 * The deterministic per-cell diagnostic selection: among frontier variants with every planned grid trial observed, paired
 * control coverage and at least one verified grid hit, rank by verified hits per ready CPU second, then per ready wall second,
 * then the fixed order F1, FC, FM, FU, FS, F0. With no such variant F1 is an explicitly non-winning diagnostic default.
 * `stats[mode] = { complete, hits, perCpu, perWall }`, `controlsComplete` whether both controls were observed everywhere.
 */
function selectFor(stats, controlsComplete) {
  const candidates = SELECTION_ORDER.filter(function (m) {
    return stats[m] && stats[m].complete === true && stats[m].hits >= 1;
  });
  const anyComplete = SELECTION_ORDER.some(function (m) { return stats[m] && stats[m].complete === true; });
  if (!controlsComplete || candidates.length === 0) {
    const reason = !controlsComplete || !anyComplete ? 'no-complete-comparable-coverage' : 'all-zero-verified-hits';
    return { selected: 'F1', winner: false, reason: reason,
      label: 'explicitly non-winning diagnostic default: ' + (reason === 'all-zero-verified-hits' ?
        'every variant with complete coverage has zero verified grid hits' : 'no variant has complete comparable coverage ' +
        '(all planned trials and both controls observed)') };
  }
  const key = function (m) {
    return [stats[m].perCpu === null ? -Infinity : stats[m].perCpu, stats[m].perWall === null ? -Infinity :
      stats[m].perWall];
  };
  const ranked = candidates.slice().sort(function (a, b) {
    const ka = key(a);
    const kb = key(b);
    if (ka[0] !== kb[0]) return kb[0] - ka[0];
    if (ka[1] !== kb[1]) return kb[1] - ka[1];
    return SELECTION_ORDER.indexOf(a) - SELECTION_ORDER.indexOf(b);
  });
  return { selected: ranked[0], winner: true, reason: 'ranked', ranking: ranked,
    label: 'diagnostic selection for IG-S06 (not an adopted algorithm, not a gate result)' };
}

function modeStats(clusters, mode, quantumMs) {
  const rows = rowsOfMode(clusters, mode);
  const rc = rateOf(rows, 'cpuMs', quantumMs);
  const rw = rateOf(rows, 'wallMs', quantumMs);
  const started = startedRows(rows);
  return { complete: started.length === clusters.length && clusters.length > 0, hits: rc.hits, perCpu: rc.perSecond,
    perWall: rw.perSecond, trials: started.length };
}

function controlsComplete(clusters, quantumMs) {
  return CONTROLS.every(function (m) { return modeStats(clusters, m, quantumMs).complete; });
}

/** How often each outcome of the rule would be chosen over the resampled clusters (the selection uncertainty). */
function selectionStability(clusters, quantumMs) {
  const n = clusters.length;
  const freq = {};
  SELECTION_ORDER.concat(['default']).forEach(function (m) { freq[m] = 0; });
  if (n === 0) return { resamples: 0, frequency: freq };
  const rng = R.mulberry32(R.ANALYSIS_SEED);
  // coverage is a property of the whole cohort: a resample inherits it from the observed clusters
  const complete = {};
  SELECTION_ORDER.forEach(function (m) { complete[m] = modeStats(clusters, m, quantumMs).complete; });
  const controls = controlsComplete(clusters, quantumMs);
  for (let b = 0; b < RESAMPLES; b++) {
    const drawn = new Array(n);
    for (let i = 0; i < n; i++) drawn[i] = clusters[Math.floor(rng() * n)];
    const stats = {};
    SELECTION_ORDER.forEach(function (m) {
      stats[m] = modeStats(drawn, m, quantumMs);
      stats[m].complete = complete[m];
    });
    const pick = selectFor(stats, controls);
    freq[pick.winner ? pick.selected : 'default']++;
  }
  Object.keys(freq).forEach(function (k) { freq[k] = freq[k] / RESAMPLES; });
  return { resamples: RESAMPLES, seed: 20261114, frequency: freq,
    note: 'share of the cluster resamples in which the same rule picks that variant (default: the non-winning F1 default); ' +
      'descriptive, not a probability that a variant is best' };
}

// --- the distinct problems, kept apart ------------------------------------------------------------------------------------------------

/**
 * Three problems that a zero yield can come from, never merged: the frontier list is empty (every refused group proved
 * ambiguous), the candidates that reach the canonical rating are shallow or above the band (or below it), and the search is
 * cut by its count budget; plus what the native samples did on the same grids. Per frontier variant and native kind.
 */
function problemsOf(modeOut) {
  const frontier = FRONTIER.map(function (m) {
    const x = modeOut[m];
    const f = x.funnel;
    return { variant: m, trials: x.trials, samples: f.samples, completeSamples: f.completeSamples,
      emptyFrontierSamples: f.emptyFrontierSamples, entriesAtEnd: f.entriesAtEnd, phaseBTries: f.phaseBTries,
      proofUnique: f.proofUnique, proofAmbiguousAtReference: f.proofAmbiguousAtReference, canonicalRated: f.canonicalRated,
      candidateExact: f.candidateExact, candidateShallow: f.candidateShallow, candidateBelow: f.candidateBelow,
      candidateAbove: f.candidateAbove, budgetEndedTrials: x.outcomes.budgetEnded, budgetEndedShare: x.budgetEndedShare,
      budgetStopsByDimension: f.budgetStopsByDimension };
  });
  const native = CONTROLS.map(function (m) {
    const n = modeOut[m].native;
    return { kind: m, samples: n.samples, exact: n.class.exact, shallow: n.class.shallow, below: n.class.below,
      above: n.class.above, unrated: n.class.unrated };
  });
  return { frontier: frontier, native: native };
}

// --- the whole analysis ----------------------------------------------------------------------------------------------------------------

/**
 * input: { records, jobs (planned jobs, optional), cells, seeds, levels (the catalogue's level order), requested ('nightmare'),
 * quantumMs (the CPU API's probed step) }.
 */
function analyse(input) {
  const cells = input.cells;
  const seeds = input.seeds;
  const levels = input.levels || [];
  const requested = input.requested || 'nightmare';
  const quantumMs = input.quantumMs === undefined ? null : input.quantumMs;
  const rows = rowsOf(input.records, input.jobs);
  const out = { cells: {}, coverage: coverageOf(rows, cells, seeds), anomalies: [], seeds: seeds.slice(), resamples: RESAMPLES,
    analysisSeed: 20261114 };
  cells.forEach(function (cell) {
    const clusters = clustersOf(rows, cell, seeds);
    const cellRows = rows.filter(function (r) { return r.cell === cell; });
    const modeOut = {};
    MODES.forEach(function (mode) {
      const mrows = rowsOfMode(clusters, mode);
      const started = startedRows(mrows);
      const conditional = started.filter(function (r) { return !r.budgetEnded; });
      const cpu = rateOf(mrows, 'cpuMs', quantumMs);
      const wall = rateOf(mrows, 'wallMs', quantumMs);
      modeOut[mode] = {
        mode: mode, kind: F.MODES[mode].kind, trials: started.length, planned: seeds.length,
        complete: started.length === seeds.length,
        hits: cpu.hits, claimedExact: started.filter(function (r) { return r.claimedExact; }).length,
        primary: { perCpuSecond: cpu.perSecond, perWallSecond: wall.perSecond, cpuMs: cpu.ms, wallMs: wall.ms,
          cpuStatus: cpu.status, wallStatus: wall.status },
        coldInclusive: { perCpuSecond: rateOf(mrows, 'cpuColdMs', quantumMs).perSecond,
          perWallSecond: rateOf(mrows, 'wallColdMs', quantumMs).perSecond, cpuMs: round(spend(started, 'cpuColdMs'), 3),
          wallMs: round(spend(started, 'wallColdMs'), 3) },
        conditionalExcludingBudgetEnded: { trials: conditional.length, hits: conditional.filter(function (r) { return r.hit; }).length,
          perCpuSecond: rateOf(conditional, 'cpuMs', quantumMs).perSecond,
          perWallSecond: rateOf(conditional, 'wallMs', quantumMs).perSecond,
          note: 'conditional and secondary: it may select no winner and pass no gate' },
        setupAmortised: (function () {
          const cpuD = amortised(mrows, 'cpu');
          const wallD = amortised(mrows, 'wall');
          const cpuOld = amortised(mrows, 'cpu', 'one-per-trial');
          const wallOld = amortised(mrows, 'wall', 'one-per-trial');
          return { divisor: 'the native sample count N (12 for rotational180)',
            formula: 'per started trial: readyTotal - gridCost + m x gridCost / N, m = the samples that started',
            samplesStarted: started.reduce(function (a, r) { return a + (isNumber(r.samplesStarted) ? r.samplesStarted : 0); }, 0),
            cpuMs: round(cpuD, 3), wallMs: round(wallD, 3),
            perCpuSecond: cpuD === null ? null : R.ratePerSecond(cpu.hits, cpuD, R.classifyCpu(cpuD, quantumMs)),
            perWallSecond: wallD === null ? null : R.ratePerSecond(cpu.hits, wallD, wallD > 0 ? 'resolved' : 'unresolved'),
            r1OnePerTrial: { cpuMs: round(cpuOld, 3), wallMs: round(wallOld, 3),
              note: 'the superseded r1 formula (one grid share per trial whatever m was); shown only for the size of the correction' },
            note: 'derived sensitivity: not measured request throughput, no extra observation, never the primary denominator' };
        })(),
        intervals: {
          startupCpuMs: round(spend(started, 'startupCpuMs'), 3), startupWallMs: round(spend(started, 'startupWallMs'), 3),
          gridBuildCpuMs: round(spend(started, 'gridCpuMs'), 3), gridBuildWallMs: round(spend(started, 'gridWallMs'), 3),
          samplesCpuMs: round(spend(started, 'samplesCpuMs'), 3), samplesWallMs: round(spend(started, 'samplesWallMs'), 3),
          cleanupCpuMs: round(spend(started, 'cleanupCpuMs'), 3), cleanupWallMs: round(spend(started, 'cleanupWallMs'), 3) },
        outcomes: { complete: mrows.filter(function (r) { return r.outcome === 'complete'; }).length,
          censored: mrows.filter(function (r) { return r.censored; }).length,
          budgetEnded: mrows.filter(function (r) { return r.budgetEnded; }).length,
          errors: mrows.filter(function (r) { return r.errored; }).length,
          unstarted: mrows.filter(function (r) { return !r.started; }).length },
        budgetEndedShare: started.length > 0 ? mrows.filter(function (r) { return r.budgetEnded; }).length / started.length : null,
        samples: sampleDetail(mrows),
        funnel: F.MODES[mode].kind === 'frontier' ? frontierFunnel(mrows, levels, requested) : null,
        native: F.MODES[mode].kind === 'native' ? nativeSummary(mrows) : null,
        parents: F.MODES[mode].kind === 'frontier' ? parentSummary(mrows) : null
      };
    });
    // paired rate differences against both native controls, whole clusters resampled together
    const paired = [];
    const compare = function (mode, control, per) {
      const field = FIELDS[per];
      const pc = pairedClusters(clusters, mode, control);
      const stat = function (drawn) {
        const a = ratesFor(drawn, mode, field, quantumMs);
        const b = ratesFor(drawn, control, field, quantumMs);
        return a === null || b === null ? null : a - b;
      };
      const rateA = ratesFor(pc.clusters, mode, field, quantumMs);
      const rateB = ratesFor(pc.clusters, control, field, quantumMs);
      const iv = intervalOf(pc.clusters, stat);
      const hitsOf = function (m) { return pc.clusters.filter(function (c) { return c.rows[m] && c.rows[m].hit; }).length; };
      paired.push({ cell: cell, mode: mode, control: control, per: per, status: pc.complete ? 'complete-coverage' :
        'incomplete-coverage', pairedClusters: pc.clusters.length, planned: clusters.length, hitsMode: hitsOf(mode),
      hitsControl: hitsOf(control), rateMode: rateA,
      rateControl: rateB, difference: iv.point, ci95: iv.ci95, lowerBound95OneSided: iv.lowerBound95OneSided,
      degenerate: iv.degenerate, interpretation: iv.interpretation,
      unresolvedResamples: iv.unresolvedResamples, resamples: iv.resamples, seed: iv.seed,
      note: pc.complete ? 'descriptive provisional interval over whole grid clusters; zero hits give a zero lower bound, no ' +
        'pseudo-count' : 'PARTIAL: only the clusters where both arms were observed enter the difference; a missing arm is ' +
        'never dropped silently and this row selects nothing' });
    };
    FRONTIER.concat(['ordinary-only']).forEach(function (mode) {
      ['cpu', 'wall'].forEach(function (per) { compare(mode, 'proposal-only', per); });
    });
    FRONTIER.forEach(function (mode) {
      ['cpu', 'wall'].forEach(function (per) { compare(mode, 'ordinary-only', per); });
    });
    const own = MODES.map(function (mode) {
      const entry = { cell: cell, mode: mode };
      ['cpu', 'wall'].forEach(function (per) {
        const field = FIELDS[per];
        const mc = clusters.filter(function (c) { return c.rows[mode] && c.rows[mode].started; });
        const iv = intervalOf(mc, function (drawn) { return ratesFor(drawn, mode, field, quantumMs); });
        entry[per] = { point: iv.point, ci95: iv.ci95, lowerBound95OneSided: iv.lowerBound95OneSided,
          clusters: iv.clusters, unresolvedResamples: iv.unresolvedResamples, degenerate: iv.degenerate,
          interpretation: iv.interpretation };
      });
      return entry;
    });
    // the diagnostic selection
    const stats = {};
    MODES.forEach(function (m) { stats[m] = modeStats(clusters, m, quantumMs); });
    const cc = controlsComplete(clusters, quantumMs);
    const selection = Object.assign(selectFor(stats, cc), { controlsComplete: cc, variantStats: stats,
      stability: selectionStability(clusters, quantumMs) });
    // the screen finding of the cell: never a go, never a gate
    const allCoverage = MODES.every(function (m) { return stats[m].complete; });
    const hitsByMode = {};
    MODES.forEach(function (m) { hitsByMode[m] = stats[m].hits; });
    const anyHit = MODES.some(function (m) { return hitsByMode[m] > 0; });
    const frontierHit = FRONTIER.some(function (m) { return hitsByMode[m] > 0; });
    let finding;
    if (!allCoverage) finding = 'inconclusive (incomplete coverage: unstarted keys remain)';
    else if (!anyHit) finding = 'inconclusive (every rate is zero in this cell: no verified hit in any mode)';
    else if (!frontierHit) finding = 'no frontier hit observed while a native control had hits (descriptive only)';
    else finding = 'frontier hits observed (descriptive only; the formal gate is not evaluable before the freeze)';
    out.cells[cell] = { cell: cell, modes: modeOut, paired: paired, own: own, selection: selection, problems: problemsOf(modeOut),
      formalGate: 'not-evaluable-pre-freeze', finding: finding, allCoverage: allCoverage, anyHit: anyHit,
      zeroBaselineFeasibility: 'projection-awaits-author-review',
      clusters: clusters.map(function (c) { return { seed: c.seed, modesObserved: Object.keys(c.rows).filter(function (m) {
        return c.rows[m].started; }).length }; }) };
    // anomalies
    cellRows.forEach(function (r) {
      if (r.falseExact) out.anomalies.push({ key: r.key, kind: 'false-exact-flag' });
      if (r.unclaimedVerified) out.anomalies.push({ key: r.key, kind: 'verified-exact-not-claimed' });
      r.parents.forEach(function (p) {
        if (p.status === 'hash-mismatch') out.anomalies.push({ key: r.key, kind: 'parent-hash-mismatch', ordinal: p.ordinal });
      });
    });
    const seen = new Map();
    cellRows.filter(function (r) { return r.hit; }).forEach(function (r) {
      const k = r.cell + ':' + r.seed + ':' + r.puzzleHash;
      if (seen.has(k)) out.anomalies.push({ key: r.key, kind: 'duplicate-hit-hash', other: seen.get(k) });
      else seen.set(k, r.key);
    });
    // identity: one grid per cluster, whatever the mode
    clusters.forEach(function (c) {
      const hashes = Array.from(new Set(Object.keys(c.rows).map(function (m) { return c.rows[m]; }).filter(function (r) {
        return r.started && r.gridHash !== null; }).map(function (r) { return r.gridHash; })));
      if (hashes.length > 1) out.anomalies.push({ key: cell + ':' + c.seed, kind: 'grid-hash-differs-inside-cluster',
        hashes: hashes });
    });
  });
  out.allRatesZero = cells.every(function (cell) { return !out.cells[cell].anyHit; });
  out.allCovered = cells.every(function (cell) { return out.cells[cell].allCoverage; });
  out.verdict = out.allRatesZero ? (out.allCovered ? 'inconclusive (all verified-hit rates are zero in every cell): stop for ' +
    'review before IG-S06' : 'inconclusive (incomplete coverage and no verified hit): stop for review before IG-S06') :
    (out.allCovered ? 'descriptive rates observed; formalGate not-evaluable-pre-freeze' : 'inconclusive (incomplete coverage)');
  return out;
}

module.exports = {
  MODES, CONTROLS, FRONTIER, SELECTION_ORDER, PARENT_CLASSES, RESAMPLES, DEGENERATE_NOTE, viewOf, rowsOf, spend, rateOf, amortised,
  clustersOf, pairedClusters, coverageOf, frontierFunnel, nativeSummary, sampleDetail, parentSummary, selectFor,
  selectionStability, modeStats, controlsComplete, levelClass, problemsOf, analyse, round, mean
};
