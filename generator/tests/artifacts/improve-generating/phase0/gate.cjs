'use strict';

/*
 * The frozen-gate evaluator of the phase-0 harness (IG-S10). It turns the collected records of a frozen round into the
 * inputs of IG-S-Q05's gate and states what they allow: it NEVER emits a go or a no-go. The plan author decides the
 * feasibility; this module reports the verified hit rates per CPU and wall second (paired whole-cluster bootstrap), the
 * non-inferiority lower bounds on cells that already have hits, the full-request on-time exact fraction beside them, and
 * whether the evidence is attested, complete, valid and request-level.
 *
 * Rules it enforces (check-list section 6):
 *  - the provisional round is `not-evaluable-pre-freeze` whatever the numbers say; a frozen flag is not proof of a freeze;
 *    only a valid freeze receipt and budget receipt fingerprinting the loaded runtime enable it;
 *  - the limits and defaults a run used must equal those the freeze receipt attests;
 *  - 40 grid clusters per decision cell with all eight modes (both native controls included); a missing arm makes the cell
 *    inconclusive and is never dropped; budget-ended and censored trials stay in every denominator;
 *  - a claimed exact hit that the independent audit did not verify makes the evidence invalid;
 *  - zero hits give a zero lower bound, never a pseudo-count; an interval of identical resamples is labelled degenerate;
 *  - the conversion of rates into a request fraction needs an author-approved assumption set: without it the projection is
 *    `projection-awaits-author-review`; with it the inputs are published, still without a verdict;
 *  - sample-only evidence cannot establish a request-level qualification; the direct on-time fraction is published beside
 *    the rates (an exact one-sided 95 % binomial lower bound, request seeds assumed independent) and is never a substitute.
 * No engine, no file, no clock: a pure function of its input.
 */
const C = require('./common.cjs');
const R = require('./records.cjs');
const S = require('./ig05-stats.cjs');

const SCHEMA = 'ig-s-gate/1';
const MIN_CLUSTERS = 40;
const MIN_REQUESTS = 40;
const POOL_WIDTH = 4;
const REQUEST_ARMS = Object.freeze(['native-mixed', 'selected-frontier']);
const ON_TIME_MS = Object.freeze({ small: 10000, large: 30000 });
const CELL_CLASS = Object.freeze({ classic9: 'small', wordoku: 'small', killer: 'small', greaterThan: 'small',
  jigsaw9: 'small', mega12: 'large', mega16: 'large', samurai: 'large', sohei: 'large', flower: 'large',
  butterfly: 'large' });
const DECISION_OWNER = 'the plan author (Fable), advised by the pack author (Astra): this evaluator publishes inputs and never a ' +
  'go or a no-go';
const FIELD = Object.freeze({ cpu: 'cpuMs', wall: 'wallMs' });

function onTimeBudgetMs(cell) {
  return Object.prototype.hasOwnProperty.call(CELL_CLASS, cell) ? ON_TIME_MS[CELL_CLASS[cell]] : ON_TIME_MS.large;
}

/** The limits and defaults a run used against those the freeze receipt attests: equal, or a named reason why not. */
function compareLimits(receiptLimits, observed) {
  if (!receiptLimits || typeof receiptLimits !== 'object') {
    return { ok: false, state: 'frozen-limits-unverified', problems: ['the freeze receipt has no limitsAndDefaults'] };
  }
  if (!observed || typeof observed !== 'object') {
    return { ok: false, state: 'frozen-limits-unverified', problems: ['the collected run reports no limits and defaults'] };
  }
  const problems = [];
  Object.keys(receiptLimits).sort().forEach(function (key) {
    if (!Object.prototype.hasOwnProperty.call(observed, key)) problems.push(key + ': attested by the receipt, not observed');
    else if (C.canonicalJson(receiptLimits[key]) !== C.canonicalJson(observed[key])) {
      problems.push(key + ': the receipt attests ' + C.canonicalJson(receiptLimits[key]) + ', the run used ' +
        C.canonicalJson(observed[key]));
    }
  });
  return { ok: problems.length === 0, state: problems.length === 0 ? 'frozen-limits-match' : 'frozen-limits-mismatch',
    problems: problems };
}

function ratesFor(clusters, mode, field, quantumMs) {
  return S.rateOf(modeRows(clusters, mode), field, quantumMs).perSecond;
}

function modeRows(clusters, mode) {
  return clusters.map(function (c) { return c.rows[mode]; }).filter(Boolean);
}

function intervalOf(clusters, statistic) {
  const b = R.bootstrapClusters(clusters, statistic, { resamples: S.RESAMPLES });
  const degenerate = b.ci95[0] !== null && b.ci95[0] === b.ci95[1] && b.lowerBound95OneSided === b.ci95[0];
  return { clusters: b.clusters, resamples: b.resamples, seed: b.seed, point: b.point, ci95: b.ci95,
    lowerBound95OneSided: b.lowerBound95OneSided, unresolvedResamples: b.unresolvedResamples, degenerate: degenerate,
    interpretation: degenerate ? S.DEGENERATE_NOTE : null };
}

function pairedDifference(clusters, mode, control, per, quantumMs) {
  const field = FIELD[per];
  const pc = S.pairedClusters(clusters, mode, control);
  const stat = function (drawn) {
    const a = ratesFor(drawn, mode, field, quantumMs);
    const b = ratesFor(drawn, control, field, quantumMs);
    return a === null || b === null ? null : a - b;
  };
  const iv = intervalOf(pc.clusters, stat);
  return Object.assign({ mode: mode, control: control, per: per, pairedClusters: pc.clusters.length,
    planned: clusters.length, complete: pc.complete }, iv);
}

function planRows(cell, seeds, records, problems) {
  const byKey = new Map();
  records.forEach(function (r) {
    const k = r.requestSeed + '|' + r.mode;
    if (byKey.has(k)) problems.push('duplicate row for seed ' + r.requestSeed + ' and mode ' + r.mode);
    else byKey.set(k, r);
  });
  const planned = new Set();
  const rows = [];
  seeds.forEach(function (seed) {
    S.MODES.forEach(function (mode) {
      planned.add(seed + '|' + mode);
      const rec = byKey.get(seed + '|' + mode);
      rows.push(S.viewOf(rec || { key: cell + ':' + seed + ':' + mode, puzzleVariant: cell, requestSeed: seed,
        gridCluster: seed, mode: mode, outcome: 'unstarted' }));
    });
  });
  const unplanned = Array.from(byKey.keys()).filter(function (k) { return !planned.has(k); });
  if (unplanned.length > 0) problems.push(unplanned.length + ' row(s) outside the planned seeds and modes');
  return rows;
}

/** A planned seed list must be a set of distinct seeds: copies of one seed are one cluster counted many times. */
function distinctProblem(label, seeds) {
  const distinct = new Set(seeds).size;
  return distinct === seeds.length ? null : label + ' are not distinct: ' + seeds.length + ' planned, ' + distinct + ' distinct';
}

/** The full-request evidence of one cell: the direct on-time exact fraction per arm, beside the rates, never instead. */
function evaluateRequests(cell, input) {
  const budgetMs = onTimeBudgetMs(cell);
  const given = input.requestSeeds || [];
  const seeds = Array.from(new Set(given));
  const records = (input.requestRecords || []).filter(function (r) {
    return r.puzzleVariant === cell && REQUEST_ARMS.indexOf(r.mode) >= 0;
  });
  if (records.length === 0) {
    return { established: false, status: 'not-established-sample-only',
      reason: 'no full-request records (the held-out requests of IG-S06 were not collected): grid-sample evidence cannot ' +
        'establish a request-level qualification', budgetMs: budgetMs, arms: {}, falseExact: [], populationProblems: [] };
  }
  const arms = {};
  const problems = [];
  const populationProblems = [];
  const dup = distinctProblem('planned request seeds', given);
  if (dup) populationProblems.push(dup);
  // a claimed-exact request whose independent verification failed is invalid evidence, not merely "not on time"
  const falseExact = records.filter(function (r) { return r.claimedExact === true && r.verifiedExact === false; })
    .map(function (r) { return r.key || (r.mode + ':' + r.requestSeed); });
  REQUEST_ARMS.forEach(function (arm) {
    const rows = records.filter(function (r) { return r.mode === arm; });
    const seen = new Set();
    rows.forEach(function (r) {
      if (seen.has(r.requestSeed)) problems.push('duplicate ' + arm + ' request for seed ' + r.requestSeed);
      seen.add(r.requestSeed);
    });
    const outside = rows.filter(function (r) { return seeds.indexOf(r.requestSeed) < 0; }).length;
    if (outside > 0) problems.push(outside + ' ' + arm + ' request(s) outside the planned seeds');
    const started = seeds.filter(function (seed) {
      const r = rows.find(function (x) { return x.requestSeed === seed; });
      return r && r.outcome !== 'unstarted';
    });
    const rowOf = function (seed) { return rows.find(function (x) { return x.requestSeed === seed; }); };
    const ok = function (r) {
      return r && r.outcome === 'complete' && r.claimedExact === true && r.verifiedExact === true &&
        r.generation && typeof r.generation.coldWallMs === 'number' && r.generation.coldWallMs <= budgetMs;
    };
    const hits = started.filter(function (seed) { return ok(rowOf(seed)); });
    const origin = { sample: 0, local: 0, unknown: 0 };
    hits.forEach(function (seed) {
      const o = rowOf(seed).firstExactOrigin;
      origin[o === 'sample' || o === 'local' ? o : 'unknown']++;
    });
    const n = started.length;
    arms[arm] = { planned: seeds.length, started: n, unstarted: seeds.length - n, onTimeVerifiedExact: hits.length,
      completeCoverage: n === seeds.length && seeds.length >= MIN_REQUESTS,
      censoredOrFailed: started.filter(function (seed) { return rowOf(seed).outcome !== 'complete'; }).length,
      firstExactOrigin: origin,
      lowerBound95OneSided: n > 0 ? R.binomialLowerBound(hits.length, n, 0.05) : null,
      meetsHalf: n > 0 ? R.binomialLowerBound(hits.length, n, 0.05) >= 0.5 : false,
      independence: 'request seeds are assumed independent (a recorded assumption, not a finding)',
      note: 'exact one-sided 95 % binomial lower bound of the fraction that is independently verified exact AND returned ' +
        'within ' + (budgetMs / 1000) + ' s cold wall to decision; a corroborating statistic beside the rate-based ' +
        'projection, never a substitute for it' };
  });
  const complete = REQUEST_ARMS.every(function (a) { return arms[a].completeCoverage; });
  const clean = problems.length === 0 && populationProblems.length === 0 && falseExact.length === 0;
  return { established: complete && clean,
    status: complete && clean ? 'request-evidence-collected' : 'incomplete-request-coverage',
    reason: complete ? null : 'fewer than ' + MIN_REQUESTS + ' started requests in at least one arm', budgetMs: budgetMs,
    arms: arms, problems: problems, populationProblems: populationProblems, falseExact: falseExact };
}

function evaluateCell(cell, input) {
  const given = input.seeds || [];
  const seeds = Array.from(new Set(given));
  const quantumMs = input.quantumMs === undefined ? null : input.quantumMs;
  const problems = [];
  const populationProblems = [];
  const dupSeeds = distinctProblem('planned grid seeds', given);
  if (dupSeeds) populationProblems.push(dupSeeds);
  const records = (input.sm2Records || []).filter(function (r) { return r.puzzleVariant === cell; });
  records.forEach(function (r) {
    if (r.gridCluster !== undefined && r.gridCluster !== null && r.gridCluster !== r.requestSeed) {
      populationProblems.push('a grid trial of seed ' + r.requestSeed + ' belongs to cluster ' + r.gridCluster);
    }
  });
  const rows = planRows(cell, seeds, records, problems);
  const clusters = S.clustersOf(rows, cell, seeds);
  const stats = {};
  S.MODES.forEach(function (m) { stats[m] = S.modeStats(clusters, m, quantumMs); });
  const controlsComplete = S.controlsComplete(clusters, quantumMs);
  const modesComplete = S.MODES.every(function (m) { return stats[m].complete; });
  const falseExact = rows.filter(function (r) { return r.falseExact; }).map(function (r) { return r.key; });
  const unclaimed = rows.filter(function (r) { return r.unclaimedVerified; }).map(function (r) { return r.key; });
  const missingModes = S.MODES.filter(function (m) { return !stats[m].complete; });
  const coverage = { clustersPlanned: given.length, distinctClusters: seeds.length, minimumClusters: MIN_CLUSTERS,
    enoughClusters: seeds.length >= MIN_CLUSTERS, modesComplete: modesComplete, controlsComplete: controlsComplete,
    unstarted: rows.filter(function (r) { return !r.started; }).length, modesWithMissingTrials: missingModes };

  const perMode = {};
  S.MODES.forEach(function (mode) {
    const mrows = modeRows(clusters, mode);
    const cpu = S.rateOf(mrows, 'cpuMs', quantumMs);
    const wall = S.rateOf(mrows, 'wallMs', quantumMs);
    const started = mrows.filter(function (r) { return r.started; });
    const conditional = started.filter(function (r) { return !r.budgetEnded; });
    perMode[mode] = { trials: started.length, hits: cpu.hits, perCpuSecond: cpu.perSecond, perWallSecond: wall.perSecond,
      cpuStatus: cpu.status, wallStatus: wall.status, cpuMs: cpu.ms, wallMs: wall.ms,
      budgetEnded: mrows.filter(function (r) { return r.budgetEnded; }).length,
      censored: mrows.filter(function (r) { return r.censored; }).length,
      errors: mrows.filter(function (r) { return r.errored; }).length,
      conditionalExcludingBudgetEnded: { trials: conditional.length,
        perCpuSecond: S.rateOf(conditional, 'cpuMs', quantumMs).perSecond,
        note: 'secondary: survivors only; it selects no winner and passes no gate' } };
  });
  const selection = S.selectFor(stats, controlsComplete);
  const selected = selection.selected;
  const comparisons = [];
  S.CONTROLS.forEach(function (control) {
    ['cpu', 'wall'].forEach(function (per) { comparisons.push(pairedDifference(clusters, selected, control, per, quantumMs)); });
  });
  const own = {};
  ['cpu', 'wall'].forEach(function (per) {
    const mine = clusters.filter(function (c) { return c.rows[selected] && c.rows[selected].started; });
    own[per] = intervalOf(mine, function (drawn) { return ratesFor(drawn, selected, FIELD[per], quantumMs); });
  });
  const baselineHits = S.CONTROLS.reduce(function (sum, m) { return sum + stats[m].hits; }, 0);
  const baselineClass = baselineHits > 0 ? 'positive-baseline' : 'zero-baseline';

  const approvedMargin = input.assumptions && input.assumptions.nonInferiorityMargin &&
    typeof input.assumptions.nonInferiorityMargin.approvedBy === 'string' &&
    Number.isFinite(input.assumptions.nonInferiorityMargin.value) ? input.assumptions.nonInferiorityMargin : null;
  const margin = approvedMargin ? approvedMargin.value : 0;
  let nonInferiority = null;
  if (baselineClass === 'positive-baseline') {
    const failing = [];
    comparisons.forEach(function (c) {
      if (stats[c.control].hits === 0) return;
      if (c.lowerBound95OneSided === null || c.lowerBound95OneSided < -margin) failing.push(c.control + ' per ' + c.per);
    });
    nonInferiority = { margin: margin, marginSource: approvedMargin ? 'author-approved (' + approvedMargin.approvedBy + ')' :
      'default zero tolerance, pending the author\'s review', status: failing.length === 0 ? 'lower-bound-meets-margin' :
      'fails', failing: failing,
    note: 'on hits per CPU and per wall second against each native kind that has hits; a lower-bound reading, never a pass ' +
      'by itself (S1 stays off on a cell that fails)' };
  }
  const projectionApproved = !!(input.assumptions && input.assumptions.projection &&
    typeof input.assumptions.projection.approvedBy === 'string' && typeof input.assumptions.projection.id === 'string');
  const projection = baselineClass === 'zero-baseline' ? {
    status: projectionApproved ? 'projection-inputs-ready' : 'projection-awaits-author-review',
    assumptionSet: projectionApproved ? { id: input.assumptions.projection.id, approvedBy: input.assumptions.projection.approvedBy }
      : null,
    inputs: { selectedRateLowerBoundPerCpuSecond: own.cpu.lowerBound95OneSided,
      selectedRateLowerBoundPerWallSecond: own.wall.lowerBound95OneSided, poolWidth: POOL_WIDTH,
      budgetMs: onTimeBudgetMs(cell), measuredPoolEfficiency: input.poolEfficiency && input.poolEfficiency[cell] !== undefined ?
        input.poolEfficiency[cell] : null, workCounts: input.workCounts && input.workCounts[cell] !== undefined ?
        input.workCounts[cell] : null },
    note: 'the conversion from rates to a request fraction is the author\'s: no automatic go/no-go, no Poisson or hazard ' +
      'model, no extrapolation of unlimited attempts, the 26/40 criterion is not substituted' } : null;
  const requestLevel = evaluateRequests(cell, input);
  const requestFalse = requestLevel.falseExact || [];
  const populationInvalid = populationProblems.concat(requestLevel.populationProblems || []);

  const cpuUsable = ['resolved', 'coarse'].indexOf(perMode[selected].cpuStatus) >= 0;
  let verdict = 'inputs-collected-awaits-author-decision';
  const reasons = [];
  if (falseExact.length > 0 || requestFalse.length > 0 || populationInvalid.length > 0) {
    verdict = 'invalid-evidence';
    if (falseExact.length > 0) reasons.push('claimed exact grid hit(s) not verified by the independent audit: ' + falseExact.join(', '));
    if (requestFalse.length > 0) reasons.push('claimed exact full request(s) whose verification failed: ' + requestFalse.join(', '));
    populationInvalid.forEach(function (p) { reasons.push('invalid population: ' + p); });
  } else {
    if (!coverage.enoughClusters) reasons.push('fewer than ' + MIN_CLUSTERS + ' grid clusters planned');
    if (!modesComplete) reasons.push('incomplete paired controls or variants: ' + missingModes.join(', '));
    if (!cpuUsable) reasons.push('the selected variant\'s CPU denominator is ' + perMode[selected].cpuStatus);
    if (problems.length > 0) reasons.push.apply(reasons, problems);
    if (requestLevel.status === 'incomplete-request-coverage') reasons.push('incomplete full-request coverage');
    if (reasons.length > 0) verdict = 'inconclusive';
  }
  return {
    cell: cell, verdict: verdict, reasons: reasons, coverage: coverage, baselineClass: baselineClass,
    selection: { selected: selected, winner: selection.winner, reason: selection.reason },
    perMode: perMode, comparisons: comparisons, selectedOwn: own, nonInferiority: nonInferiority, projection: projection,
    requestLevel: requestLevel, directRequestFractionBesideRates: requestLevel.established ? requestLevel.arms : null,
    requestLevelQualification: 'not-established',
    anomalies: { falseExact: falseExact, falseExactRequests: requestFalse, populationProblems: populationInvalid,
      verifiedButNotClaimed: unclaimed },
    decision: 'plan-author-decision-pending'
  };
}

/**
 * input: { round, freezeReceipt, budgetReceipt, runtimeFingerprint, catalogueFingerprint, supportOk, observedLimits,
 * cells, seeds, requestSeeds, sm2Records, requestRecords, quantumMs, assumptions: { projection, nonInferiorityMargin },
 * poolEfficiency, workCounts }.
 */
function evaluateFrozenGate(input) {
  const base = R.evaluateGate({ round: input.round, freezeReceipt: input.freezeReceipt, budgetReceipt: input.budgetReceipt,
    runtimeFingerprint: input.runtimeFingerprint, catalogueFingerprint: input.catalogueFingerprint,
    supportOk: input.supportOk });
  const out = {
    schema: SCHEMA, round: input.round,
    evidenceStatus: input.round === C.ROUND_FROZEN ? C.EVIDENCE_FROZEN : C.EVIDENCE_PROVISIONAL,
    state: base.state, formalGateEnabled: false, formalVerdict: null, decisionOwner: DECISION_OWNER,
    projection: 'projection-awaits-author-review', requestLevel: 'not-established', reasons: base.reasons.slice(),
    limits: null, cells: {},
    notes: ['no automatic go or no-go: the plan author decides the feasibility from the published inputs']
  };
  if (input.round !== C.ROUND_FROZEN || !base.formalGateEnabled) return out;
  const limits = compareLimits(input.freezeReceipt.limitsAndDefaults, input.observedLimits);
  out.limits = limits;
  if (!limits.ok) {
    out.state = limits.state;
    out.reasons = limits.problems.slice();
    return out;
  }
  (input.cells || []).forEach(function (cell) { out.cells[cell] = evaluateCell(cell, input); });
  out.requestLevel = Object.keys(out.cells).length > 0 && Object.keys(out.cells).every(function (c) {
    return out.cells[c].requestLevel.established;
  }) ? 'request-evidence-collected' : 'not-established';
  const verdicts = Object.keys(out.cells).map(function (c) { return out.cells[c].verdict; });
  if (verdicts.length === 0) {
    out.state = 'frozen-inconclusive';
    out.reasons = ['no decision cell was supplied'];
  } else if (verdicts.indexOf('invalid-evidence') >= 0) {
    out.state = 'frozen-invalid-evidence';
    out.reasons = ['invalid evidence in at least one decision cell (a claimed exact hit or request that the audit did not verify, or ' +
      'a planned seed population that is not distinct): stop and report'];
  } else if (verdicts.indexOf('inconclusive') >= 0) {
    out.state = 'frozen-inconclusive';
    out.reasons = ['coverage, CPU accounting or the evidence is insufficient in at least one decision cell'];
  } else {
    out.state = 'frozen-inputs-collected';
    out.formalGateEnabled = true;
    out.reasons = [];
  }
  const anyAwaiting = Object.keys(out.cells).some(function (c) {
    const p = out.cells[c].projection;
    return p && p.status === 'projection-awaits-author-review';
  });
  out.projection = anyAwaiting || Object.keys(out.cells).length === 0 ? 'projection-awaits-author-review' :
    'projection-inputs-ready';
  return out;
}

/** The gate of a provisional round: not evaluable, whatever the numbers or flags say; the real gate.json comes from here. */
function provisionalGate(input) {
  const gate = evaluateFrozenGate(Object.assign({}, input, { round: input.round || 'provisional-r1' }));
  gate.usedAsFormalGate = false;
  gate.notes.push('pre-freeze observations are descriptive only: they cannot enable a cell, select an allowance, change a ' +
    'default or authorise the bank route');
  return gate;
}

module.exports = { SCHEMA, MIN_CLUSTERS, MIN_REQUESTS, POOL_WIDTH, REQUEST_ARMS, ON_TIME_MS, CELL_CLASS, DECISION_OWNER,
  onTimeBudgetMs, compareLimits, pairedDifference, evaluateRequests, evaluateCell, evaluateFrozenGate, provisionalGate };
