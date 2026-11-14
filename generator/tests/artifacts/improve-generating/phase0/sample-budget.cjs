'use strict';

/*
 * Count budget of one frontier sample (IG-S04, test side, provisional (pre-freeze)) and the fixed fitting rule.
 *
 * A budget is a vector of counts, never a time. The structural limits (floor tests, ladder passes, phaseB solves, deepen
 * proposals, canonical ratings) stay as they are; the four fitted limits (floor deductions, logical checks, DFS entries,
 * DFS checks) are the pilot ceilings until a cell is fitted: min(ceiling, next power of two >= 2 x the largest count
 * observed by a completed pilot variant). A cell with a censored, budget-stopped, errored or missing planned variant is
 * unfitted and keeps every pilot ceiling; a dimension that was never observed (or only observed as zero) keeps its
 * ceiling and is marked unfitted. A zero budget is never fitted, a slow pilot is never discarded.
 *
 * The constants come from the loaded engine (`SG.digger`, read through the private exposure of the frontier hooks);
 * nothing here knows a native value.
 */
const C = require('./common.cjs');

const HarnessError = C.HarnessError;

const STRUCTURAL = Object.freeze(['floorTests', 'ladderPasses', 'phaseBSolves', 'deepenProposals', 'canonicalRatings']);
const FITTED = Object.freeze(['floorDeductions', 'solverChecks', 'dfsEntries', 'dfsChecks']);
const DIMENSIONS = Object.freeze(STRUCTURAL.concat(FITTED));

// Fixed structural controls of the pack (not adopted production defaults).
const K_F = 12;
const DEEPEN_MAX = 16;
const LADDER_MAX = 3;
const CANONICAL_MAX = 64;

const FORMULAS = Object.freeze({
  floorTests: '3 * G',
  ladderPasses: '3',
  phaseBSolves: 'K_F = 12',
  deepenProposals: '16',
  canonicalRatings: '64 (canonical ratings / verification solves of the sample, the initial fallback rating included)',
  floorDeductions: '3 * G * N * (D + 1)',
  solverChecks: 'CAP_RATINGS * OBJECTIVE_STEPS',
  dfsEntries: '(3 * G + K_F + 16 + 64) * UNIQUE_NODES',
  dfsChecks: '(3 * G + K_F + 16 + 64) * UNIQUE_NODES',
  fit: 'min(pilot ceiling, next power of two >= 2 * largest observed count over the completed pilot variants)'
});

/** Why a sample stopped: the dimension, its limit, the count that would have exceeded it and the phase. */
class BudgetStop extends Error {
  constructor(dimension, limit, used, phase) {
    super('sample budget: ' + dimension + ' limit ' + limit + ' would be exceeded (' + used + ') in ' + phase);
    this.name = 'BudgetStop';
    this.code = 'ig.sample-budget';
    this.dimension = dimension;
    this.limit = limit;
    this.used = used;
    this.phase = phase;
  }

  describe() {
    return { dimension: this.dimension, limit: this.limit, used: this.used, phase: this.phase };
  }
}

function isCount(x) {
  return Number.isInteger(x) && x >= 1;
}

/** The pilot ceilings of one cell: G symmetry groups, N cells, D digits, the engine's constants. */
function pilotCeilings(consts, board) {
  ['CAP_RATINGS', 'OBJECTIVE_STEPS', 'UNIQUE_NODES'].forEach(function (name) {
    if (!isCount(consts && consts[name])) {
      throw new HarnessError('capability-missing', 'the engine does not expose the native constant ' + name);
    }
  });
  const G = board.groups;
  const N = board.cells;
  const D = board.digits;
  if (!isCount(G) || !isCount(N) || !isCount(D)) throw new HarnessError('plan-missing', 'bad board dimensions');
  const dfs = (3 * G + K_F + DEEPEN_MAX + CANONICAL_MAX) * consts.UNIQUE_NODES;
  return {
    floorTests: 3 * G,
    ladderPasses: LADDER_MAX,
    phaseBSolves: K_F,
    deepenProposals: DEEPEN_MAX,
    canonicalRatings: CANONICAL_MAX,
    floorDeductions: 3 * G * N * (D + 1),
    solverChecks: consts.CAP_RATINGS * consts.OBJECTIVE_STEPS,
    dfsEntries: dfs,
    dfsChecks: dfs
  };
}

function zeroVector() {
  const out = {};
  DIMENSIONS.forEach(function (d) { out[d] = 0; });
  return out;
}

/**
 * The structural part of the meter. `need(dim, n, phase)` charges n and throws BudgetStop when the limit would be
 * exceeded (a null limit vector is unlimited: the native control arms). The four fitted dimensions are enforced inside
 * the engine hooks (frontier-runtime.cjs) and are copied in here at the end with `absorb`.
 */
class SampleBudget {
  constructor(limits) {
    this.limits = limits === null || limits === undefined ? null : Object.assign({}, limits);
    this.used = zeroVector();
  }

  need(dimension, n, phase) {
    const amount = n === undefined ? 1 : n;
    const next = this.used[dimension] + amount;
    if (this.limits !== null && next > this.limits[dimension]) {
      throw new BudgetStop(dimension, this.limits[dimension], next, phase || 'unknown');
    }
    this.used[dimension] = next;
    return next;
  }

  absorb(counters) {
    FITTED.forEach(function (d) { if (counters[d] !== undefined) this.used[d] = counters[d]; }, this);
  }
}

// --- the fitting rule -----------------------------------------------------------------------------------------------

function nextPowerOfTwoAtLeast(x) {
  let p = 1;
  while (p < x) p *= 2;
  return p;
}

/** One fitted dimension from the observed counts of the completed variants. */
function fitDimension(ceiling, observed) {
  const values = observed.filter(function (v) { return typeof v === 'number' && Number.isFinite(v); });
  if (values.length === 0) {
    return { limit: ceiling, fitted: false, reason: 'never-observed', observedMax: null, candidate: null, ceiling: ceiling };
  }
  const max = Math.max.apply(null, values);
  if (!(max > 0)) {
    return { limit: ceiling, fitted: false, reason: 'observed-only-zero', observedMax: max, candidate: null,
      ceiling: ceiling };
  }
  const candidate = nextPowerOfTwoAtLeast(2 * max);
  return { limit: Math.min(ceiling, candidate), fitted: true, reason: candidate < ceiling ? 'fitted' :
    'fitted-capped-at-ceiling', observedMax: max, candidate: candidate, ceiling: ceiling };
}

/**
 * The budget of one cell. `plannedKeys` are the frontier variants planned for it (every variant on every pilot grid);
 * `trials` the records that exist. The cell is fitted only when every planned key completed (no censoring, no
 * sample-budget stop, no error, no missing key); otherwise it keeps the pilot ceilings and says why.
 */
function fitCell(input) {
  const ceilings = input.ceilings;
  const byKey = new Map(input.trials.map(function (t) { return [t.key, t]; }));
  const problems = [];
  const used = [];
  input.plannedKeys.forEach(function (key) {
    const t = byKey.get(key);
    if (!t) problems.push({ key: key, problem: 'not-run' });
    else if (t.outcome !== 'complete') problems.push({ key: key, problem: t.outcome });
    else used.push(t);
  });
  const cellFitted = problems.length === 0 && used.length > 0;
  const limits = {};
  const dims = {};
  STRUCTURAL.forEach(function (d) {
    limits[d] = ceilings[d];
    dims[d] = { kind: 'structural', limit: ceilings[d], fitted: false, reason: 'structural-fixed', ceiling: ceilings[d] };
  });
  FITTED.forEach(function (d) {
    if (!cellFitted) {
      limits[d] = ceilings[d];
      dims[d] = { kind: 'fitted', limit: ceilings[d], fitted: false, reason: 'cell-unfitted', ceiling: ceilings[d],
        observedMax: null, candidate: null };
      return;
    }
    const fit = fitDimension(ceilings[d], used.map(function (t) { return t.counts ? t.counts[d] : null; }));
    limits[d] = fit.limit;
    dims[d] = Object.assign({ kind: 'fitted' }, fit);
  });
  return {
    cell: input.cell,
    status: cellFitted ? 'fitted' : 'unfitted',
    plannedKeys: input.plannedKeys.slice(),
    completedKeys: used.map(function (t) { return t.key; }),
    problems: problems,
    unfittedReasons: cellFitted ? [] : ['planned variant coverage incomplete or censored: the pilot ceilings are kept ' +
      '(never a survivor-only fit); the explicit unfitted status needs the author\'s acceptance before the screen'],
    ceilings: ceilings,
    limits: limits,
    dimensions: dims
  };
}

/** budgets.json: exact input ids, the formulas, the limits, the fitted/unfitted flags and a hash of all of it. */
function buildBudgetsDoc(input) {
  const doc = {
    schema: 'ig-s04-budgets/1',
    task: 'IG-S04',
    round: input.round,
    evidenceStatus: input.evidenceStatus,
    provisionalNotice: 'provisional (pre-freeze): diagnostic safety envelopes and a first-round fit; not production values',
    formulas: FORMULAS,
    structural: { K_F: K_F, deepenMax: DEEPEN_MAX, ladderMax: LADDER_MAX, canonicalMax: CANONICAL_MAX },
    nativeConstants: input.nativeConstants,
    runtimeFingerprint: input.runtimeFingerprint,
    harnessFingerprint: input.harnessFingerprint,
    inputs: input.inputs,
    cells: input.cells,
    rule: 'one budget vector per cell, shared by every arm of that cell\'s frontier screen; no per-seed adaptive cap, ' +
      'no retuning after IG-S05'
  };
  doc.hash = C.digestOf(doc);
  return doc;
}

module.exports = {
  STRUCTURAL, FITTED, DIMENSIONS, K_F, DEEPEN_MAX, LADDER_MAX, CANONICAL_MAX, FORMULAS, BudgetStop, SampleBudget,
  pilotCeilings, zeroVector, nextPowerOfTwoAtLeast, fitDimension, fitCell, buildBudgetsDoc
};
