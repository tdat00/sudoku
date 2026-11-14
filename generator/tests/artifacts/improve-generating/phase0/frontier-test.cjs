'use strict';

/*
 * Tests of IG-S04 (test side, provisional (pre-freeze)).
 *
 * Pure cases (no engine, no worker, no timing, nothing written): the real control flow of frontier.cjs, the real runtime of
 * frontier-runtime.cjs and the real budget rules run on a scripted fake of the engine pieces they touch (a model of cells
 * and groups, a solver that applies scripted placements and calls the same runtime hooks the patched engine calls, a
 * scripted DFS count, canonical rating and native objective). They cover the cases of the task file: multi-cell
 * re-derivation, an already-derived cell, a wrong value, no re-derivation, the uniqueness-assuming finder excluded from
 * phase A, a floor-budget stop versus a true stuck floor, unique versus two solutions versus unknown, a stale snapshot,
 * an empty tier, coarse symmetry and clue/unit floors, exact/shallow/off-band keeper ties, the typed/numeric objective
 * adapter and a budget stop in every phase; plus the fitting rule, the plan, the reprojection and the adapter anchors
 * (source text only, nothing is executed).
 *
 * Engine cases (`engineSynthetic`) run on the real engine in a patched worker of the first command of the round, under the
 * low-priority wrapper: the same hooks, the S2 re-derivation against an independent full solve, the worker trial path on a
 * small board for every mode, and a budget stop per dimension with the state restored.
 *
 *   node frontier-test.cjs [--only=pure]      development only: no engine, no timing, nothing written
 */
const C = require('./common.cjs');
const R = require('./records.cjs');
const SB = require('./sample-budget.cjs');
const RT = require('./frontier-runtime.cjs');
const F = require('./frontier.cjs');

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

// --- a scripted fake of the engine pieces frontier.cjs touches ------------------------------------------------------------

function fakeRng(seed) {
  let s = seed >>> 0;
  function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next: next,
    int: function (n) { return Math.floor(next() * n); },
    shuffle: function (arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    },
    fork: function (tag) {
      let h = 2166136261;
      String(tag).split('').forEach(function (ch) { h = Math.imul(h ^ ch.charCodeAt(0), 16777619); });
      return fakeRng((seed ^ h) >>> 0);
    }
  };
}

const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];

const TECHNIQUES = {
  nakedSingle: { group: 'basic' }, hiddenSingleBox: { group: 'basic' }, pointing: { group: 'locked' },
  nakedPair: { group: 'subset' }, xWing: { group: 'fish' }, simpleColouring: { group: 'fish' },
  xyWing: { group: 'wing' }, uniqueRectangle: { group: 'wing', assumesUniqueness: true },
  forcingChain: { group: 'chain' }, nishio: { group: 'chain' }
};

/**
 * A fake world: n cells in groups of `group` cells, units of two groups, a solution, the scripted behaviours (`onSolve`,
 * `onCount`, `onRate`, `onObjective`, `onFu`) and the log of every call. `rt` is the real runtime of frontier-runtime.cjs.
 */
function makeWorld(options) {
  const o = Object.assign({ n: 16, group: 2, digits: 4, minClues: 2, minPerUnit: 0, level: 'nightmare',
    tier: ['nishio'], minScore: 1500, maxScore: 2400 }, options || {});
  const groups = [];
  for (let i = 0; i < o.n; i += o.group) {
    groups.push(Int32Array.from(Array.from({ length: Math.min(o.group, o.n - i) }, function (_x, k) { return i + k; })));
  }
  const unitSize = o.group * 2;
  const unitCount = Math.ceil(o.n / unitSize);
  const units = [];
  for (let u = 0; u < unitCount; u++) {
    units.push(Array.from({ length: Math.min(unitSize, o.n - u * unitSize) }, function (_x, k) { return u * unitSize + k; }));
  }
  const cellUnits = Array.from({ length: o.n }, function (_x, c) { return Int32Array.from([Math.floor(c / unitSize)]); });
  const model = { cellCount: o.n, digits: o.digits, variantId: 'fake', units: units, cellUnits: cellUnits };
  const solution = Int32Array.from(Array.from({ length: o.n }, function (_x, i) { return (i % o.digits) + 1; }));
  const ids = Object.keys(TECHNIQUES);
  const floorIds = ids.filter(function (id) { return o.tier.indexOf(id) < 0; });
  const spec = { level: o.level, min: o.minScore, max: o.maxScore, minClues: o.minClues, minCluesPerUnit: o.minPerUnit,
    floorTechniques: floorIds, tierTechniques: o.tier.slice(), allowedTechniques: ids.slice() };
  const world = { o: o, groups: groups, model: model, solution: solution, spec: spec, baseZeros: new Set(),
    log: { solves: [], counts: [], rates: [], objectives: [], fu: [] } };

  const rungOf = function (allowed) {
    const key = allowed.join(',');
    const sets = F.floorSets(SG, spec);
    const hit = ['cheap', 'middle', 'full'].find(function (name) { return sets.byName[name].ids.join(',') === key; });
    return hit || (key === ids.join(',') ? 'allowed' : 'other');
  };
  const groupIndexOf = function (cells) {
    return groups.findIndex(function (g) { return cells.length > 0 && g[0] === cells[0]; });
  };

  world.stuck = function () { return false; };
  world.onSolve = function (info) {
    const order = info.zeroed.slice();
    if (info.s2cells !== null) {
      order.sort(function (a, b) { return (info.s2cells.indexOf(b) >= 0) - (info.s2cells.indexOf(a) >= 0); });
    }
    if (info.purpose === 'floor' && world.stuck(info.groupIndex, info.rung, info)) {
      return { steps: [], end: 'stuck', unsolved: world.stuckUnsolved(info) };
    }
    return { steps: order.map(function (c) { return [c]; }), end: 'solved' };
  };
  world.stuckUnsolved = function (info) { return info.zeroed.length; };
  world.onCount = function () { return 1; };
  world.onRate = function (givens, index) {
    if (index === 0) return { solved: true, level: 'veryEasy', score: 0, hardestTechnique: null, techniqueCounts: {} };
    return { solved: true, level: o.level, score: 1700, hardestTechnique: 'nishio', techniqueCounts: { nishio: 1 } };
  };
  world.onObjective = function () { return -1; };
  world.onFu = function () { return { required: true, vacuous: false, unsolvedCount: 3 }; };

  const SG = {
    techniques: { GROUPS: ['basic', 'locked', 'subset', 'fish', 'wing', 'chain', 'cage', 'ineq'],
      get: function (id) { return TECHNIQUES[id]; } },
    symmetry: { groups: function () { return groups; } },
    difficulty: {
      levelIndex: function (l) { return LEVELS.indexOf(l); },
      certifyFloor: function (m, givens) {
        const info = { zeroed: zerosOf(givens), purpose: rt.purpose };
        world.log.fu.push(info);
        SG.logicalSolver.solve(m, givens, { allowedTechniques: floorIds, collectSteps: false, assumeUniqueness: true,
          stopOnStuck: true, budget: { tick: function () {}, check: function () {} } });
        return world.onFu(info);
      }
    },
    logicalSolver: {
      solve: function (m, givens, opts) {
        const options2 = rt.solveOptions(opts);
        const zeroed = zerosOf(givens);
        const info = { purpose: rt.purpose, options: opts, zeroed: zeroed, givens: Int32Array.from(givens),
          s2cells: rt.s2 === null ? null : rt.s2.cells.slice(), rung: opts.allowedTechniques ? rungOf(opts.allowedTechniques) : null,
          group: zeroed.filter(function (c) { return !world.baseZeros.has(c); }) };
        info.groupIndex = groupIndexOf(info.group);
        world.log.solves.push(info);
        const plan = world.onSolve(info);
        const state = { value: Int32Array.from(givens), unsolvedCount: zeroed.length };
        let accepted = false;
        try {
          for (let s = 0; s < plan.steps.length; s++) {
            if (options2 && options2.budget) options2.budget.check();
            plan.steps[s].forEach(function (cell) {
              const v = plan.wrong && plan.wrong[cell] ? plan.wrong[cell] : solution[cell];
              if (state.value[cell] === 0) state.unsolvedCount--;
              state.value[cell] = v;
            });
            rt.step(m, state, {});
          }
          if (options2 && options2.budget) options2.budget.check();
          if (plan.end === 'throw') throw new Error('engine bug');
          accepted = plan.end === 'solved';
        } catch (err) {
          if (err instanceof rt.Rederived) accepted = true;
          throw err;
        } finally {
          if (info.purpose === 'floor' && accepted) zeroed.forEach(function (c) { world.baseZeros.add(c); });
        }
        return { solved: plan.end === 'solved', status: plan.end,
          state: { unsolvedCount: plan.end === 'solved' ? 0 : (plan.unsolved === undefined ? state.unsolvedCount : plan.unsolved),
            value: state.value }, techniqueCounts: {}, steps: [] };
      }
    }
  };

  function zerosOf(givens) {
    const out = [];
    for (let c = 0; c < givens.length; c++) if (givens[c] === 0) out.push(c);
    return out;
  }

  const rt = RT.create(SG);
  SG.__igRt = rt;
  const qualityOf = function (rating) {
    if (!rating || rating.solved !== true || rating.level === null) return Infinity;
    if (rating.level === o.level) return rating.techniqueCounts && rating.techniqueCounts.nishio > 0 ? 0 : 0.5;
    return 1000 + Math.abs(LEVELS.indexOf(rating.level) - LEVELS.indexOf(o.level)) * 100 +
      (rating.score < o.minScore ? (o.minScore - rating.score) / o.minScore : 0);
  };
  rt.digger = {
    CAP_RATINGS: 1024, CAP_PROPOSALS: 32768, REFINE_RATINGS: 64, UNIQUE_NODES: 200000, UNIQUE_GUARD_CODE: 'digger.uniqueGuard',
    OBJECTIVE_STEPS: 100000, OBJECTIVE_GUARD_CODE: 'digger.objectiveGuard', GUIDED_CANDIDATES: 32, GUIDED_MIN_CANDIDATES: 4,
    GUIDED_START: 0.47, STUCK_SCORE: 1e9, REFUSED_TECHNIQUES: -1, REFUSED_TOO_HARD: -2, REFUSED_AMBIGUOUS: -3,
    SHALLOW_QUALITY: 0.5, DEFAULT_DIG_TRIES: 12, DEFAULT_DIG_TRIES_COARSE: 30,
    refusalReason: function (v) { return v === -1 ? 'techniques' : v === -2 ? 'tooHard' : 'ambiguous'; },
    newCaps: function () {
      return { ratings: 0, proposals: 0, maxRatings: 1024, maxProposals: 32768, localSearches: [], local: null };
    },
    copyWork: function (caps) {
      return caps.map(function (c) {
        return { ratings: c.ratings, proposals: c.proposals, maxRatings: c.maxRatings, maxProposals: c.maxProposals,
          localSearches: [] };
      });
    },
    qualityOf: qualityOf,
    isExact: function (rating) { return qualityOf(rating) === 0; },
    rateCounted: function (m, givens, budget, caps) {
      caps.ratings++;
      world.log.rates.push({ givens: Int32Array.from(givens), purpose: rt.purpose });
      return world.onRate(Int32Array.from(givens), world.log.rates.length - 1);
    },
    countWithin: function (m, givens, parent) {
      const info = { givens: Int32Array.from(givens), zeroed: zerosOf(givens), purpose: rt.purpose };
      world.log.counts.push(info);
      rt.dfsCall();
      const b = rt.dfsBudget({ tick: function () {}, check: function () { if (parent) parent.check(); } });
      const checks = world.dfsChecks === undefined ? 3 : world.dfsChecks;
      for (let i = 0; i < checks; i++) b.check();
      rt.dfsEntry();
      return world.onCount(info, world.log.counts.length - 1);
    },
    unitsStayFilled: function (m, unitClues, group, minPerUnit) {
      const copy = Int32Array.from(unitClues);
      group.forEach(function (c) { m.cellUnits[c].forEach(function (u) { copy[u]--; }); });
      return copy.every(function (v) { return v >= minPerUnit; });
    },
    cellSequence: function (m, order, rng) {
      const cells = [];
      for (let c = 0; c < m.cellCount; c++) cells.push(c);
      return rng.shuffle(cells);
    },
    groupSequence: function (sequence, gs, n) {
      const groupOf = new Int32Array(n);
      gs.forEach(function (g, i) { for (let k = 0; k < g.length; k++) groupOf[g[k]] = i; });
      const seen = new Uint8Array(gs.length);
      const out = [];
      sequence.forEach(function (c) {
        if (seen[groupOf[c]] === 0) {
          seen[groupOf[c]] = 1;
          out.push(gs[groupOf[c]]);
        }
      });
      return out;
    },
    removalObjective: function () {
      return function (givens, sol, group, budget, stats) {
        stats.oracleCalls++;
        world.log.objectives.push({ group: Array.from(group), givens: Int32Array.from(givens) });
        return world.onObjective(givens, group, world.log.objectives.length - 1);
      };
    }
  };
  world.SG = SG;
  world.rt = rt;
  world.cfg = { symmetry: 'rotational180', digOrder: 'random' };
  world.pass = { tick: function () {}, check: function () {} };
  world.run = function (variantId, extra) {
    const progress = [];
    const ctx = Object.assign({ SG: SG, rt: rt, model: model, solution: solution, spec: spec, level: o.level,
      cfg: world.cfg, rng: fakeRng(7), variant: F.MODES[variantId], budget: world.pass, limits: null,
      progress: function (m) { progress.push(m); } }, extra || {});
    const result = F.runFrontier(ctx);
    result.progressLog = progress;
    return result;
  };
  return world;
}

// --- floor sets ---------------------------------------------------------------------------------------------------------

add('floor.sets', 'frontier', 'cheap/middle/full sets come from the actual floor and the registry groups', function () {
  const w = makeWorld();
  const sets = F.floorSets(w.SG, w.spec);
  equal(sets.byName.cheap.ids, ['nakedSingle', 'hiddenSingleBox', 'pointing', 'nakedPair', 'xyWing', 'uniqueRectangle'],
    'cheap set (basic, locked, subset, wing) in registry order');
  equal(sets.byName.middle.ids, ['nakedSingle', 'hiddenSingleBox', 'pointing', 'nakedPair', 'xWing', 'simpleColouring',
    'xyWing', 'uniqueRectangle'], 'middle adds fish and the single-digit patterns');
  equal(sets.byName.full.ids, w.spec.floorTechniques, 'full is the whole actual floor');
  equal(sets.byName.cheap.effectiveIds.indexOf('uniqueRectangle'), -1, 'a uniqueness-assuming finder is not effective');
  equal(sets.ladder.map(function (r) { return r.id; }), ['cheap', 'middle', 'full'], 'three distinct rungs');
  equal(sets.singleDigitPatterns, ['xWing', 'simpleColouring'], 'the fish group holds the registered patterns');
});

add('floor.dedupe', 'frontier', 'equal rungs are removed from the ladder; a missing family stops for the author', function () {
  const w = makeWorld();
  w.spec.floorTechniques = ['nakedSingle', 'pointing', 'nakedPair'];
  const sets = F.floorSets(w.SG, w.spec);
  equal(sets.ladder.map(function (r) { return r.id; }), ['cheap'], 'cheap = middle = full: one rung');
  equal(F.rungsOf(F.MODES.FM, sets).map(function (r) { return r.id; }), ['middle'], 'FM still runs its own set');
  w.spec.floorTechniques = ['xWing'];
  throws(function () { F.floorSets(w.SG, w.spec); }, function (e) { return e.code === 'unsupported-source'; },
    'no cheap basic technique');
  const w2 = makeWorld();
  w2.SG.techniques.GROUPS = ['basic', 'locked', 'subset', 'wing', 'chain'];
  throws(function () { F.floorSets(w2.SG, w2.spec); }, function (e) { return e.code === 'unsupported-source'; },
    'a registry without the fish group');
});

// --- the runtime: counters, limits, S2 ---------------------------------------------------------------------------------------

function state(values, unsolved) {
  return { value: Int32Array.from(values), unsolvedCount: unsolved };
}

add('runtime.counters', 'runtime', 'solves, deductions, logical checks, DFS calls/entries/checks are counted per purpose', function () {
  const rt = RT.create({});
  rt.setPurpose('floor');
  const opts = rt.solveOptions({ budget: { check: function () {}, tick: function () {} } });
  opts.budget.check();
  opts.budget.check();
  rt.step({}, state([0], 1));
  rt.step({}, state([0], 1));
  rt.setPurpose('canonical');
  rt.step({}, state([0], 1));
  rt.setPurpose('dfs');
  rt.dfsCall();
  const b = rt.dfsBudget({ check: function () {}, tick: function () {} });
  b.check();
  rt.dfsEntry();
  rt.dfsEntry();
  const c = rt.countersOf();
  equal(c, { logicalSolves: 1, deductions: 3, floorDeductions: 2, solverChecks: 2, dfsCalls: 1, dfsEntries: 2, dfsChecks: 1 },
    'counters');
  equal(rt.snapshot().by.floor.deductions, 2, 'per purpose');
  rt.reset();
  equal(rt.countersOf().deductions, 0, 'reset');
});

add('runtime.limits', 'runtime', 'a limit stops at the first count that would exceed it and stays thrown', function () {
  const rt = RT.create({});
  rt.setLimits({ floorDeductions: 2, solverChecks: 3, dfsEntries: 1, dfsChecks: 2 });
  rt.setPurpose('floor');
  rt.step({}, state([0], 1));
  rt.step({}, state([0], 1));
  const e1 = throws(function () { rt.step({}, state([0], 1)); }, function (e) { return e instanceof SB.BudgetStop; }, 'deductions');
  equal(e1.describe(), { dimension: 'floorDeductions', limit: 2, used: 3, phase: 'floor' }, 'stop record');
  throws(function () { rt.step({}, state([0], 1)); }, function (e) { return e === e1; }, 'sticky stop');
  rt.reset();
  rt.setPurpose('canonical');
  rt.step({}, state([0], 1));
  equal(rt.floorDeductions, 0, 'a canonical deduction is not a floor deduction');
  const opts = rt.solveOptions({ budget: { check: function () {}, tick: function () {} } });
  opts.budget.check();
  opts.budget.check();
  opts.budget.check();
  const e2 = throws(function () { opts.budget.check(); }, function (e) { return e.dimension === 'solverChecks'; }, 'checks');
  equal(e2.used, 4, 'the check that would exceed');
  rt.reset();
  rt.dfsEntry();
  throws(function () { rt.dfsEntry(); }, function (e) { return e.dimension === 'dfsEntries'; }, 'entries');
  rt.reset();
  const b = rt.dfsBudget({ check: function () {}, tick: function () {} });
  b.check();
  b.check();
  throws(function () { b.check(); }, function (e) { return e.dimension === 'dfsChecks'; }, 'dfs checks');
  rt.setLimits(null);
  rt.reset();
  rt.dfsEntry();
  equal(rt.stopped, null, 'a null limit vector is unlimited');
});

add('s2.multi-cell', 's2', 'S2 re-derives a group of two cells: the signal comes when the last one holds its value again', function () {
  const rt = RT.create({});
  const solution = Int32Array.from([1, 2, 3, 4, 1, 2]);
  rt.armS2([2, 3], solution);
  rt.solveOptions(undefined);
  rt.step({}, state([0, 0, 3, 0, 0, 0], 4));
  const e = throws(function () { rt.step({}, state([0, 0, 3, 4, 0, 0], 3)); }, function (x) { return x instanceof rt.Rederived; },
    'both cells');
  equal(e.info, { ordinal: 2 }, 'the deduction ordinal of the re-derivation');
  equal(rt.s2.hit, { ordinal: 2 }, 'recorded on the armed session');
  equal(rt.disarmS2().hit, { ordinal: 2 }, 'disarm returns it');
  equal(rt.s2, null, 'disarmed');
});

add('s2.already-derived', 's2', 'a cell already holding its value counts at once; a complete grid is a proof, not a signal', function () {
  const rt = RT.create({});
  const solution = Int32Array.from([1, 2, 3, 4]);
  rt.armS2([0, 1], solution);
  rt.solveOptions(undefined);
  throws(function () { rt.step({}, state([1, 2, 0, 0], 2)); }, function (x) { return x instanceof rt.Rederived && x.info.ordinal === 1; },
    'both cells placed by one deduction');
  rt.armS2([0, 1], solution);
  rt.solveOptions(undefined);
  rt.step({}, state([1, 2, 3, 4], 0));
  equal(rt.s2.hit, null, 'no signal when nothing is left to solve: the solve completes as a proof');
});

add('s2.wrong-value', 's2', 'a removed cell that gets another value is an unsound deduction (a correctness stop)', function () {
  const rt = RT.create({});
  rt.armS2([1], Int32Array.from([1, 2, 3]));
  rt.solveOptions(undefined);
  const e = throws(function () { rt.step({}, state([0, 3, 0], 2)); }, function (x) { return x instanceof rt.Unsound; }, 'wrong value');
  equal(e.info, { cell: 1, value: 3, expected: 2, ordinal: 1 }, 'details');
});

add('s2.no-rederivation', 's2', 'no re-derivation: the solve runs to its fixpoint and no signal is forged', function () {
  const w = makeWorld();
  w.stuck = function () { return true; };
  const r = w.run('F1', { testOnly: { kF: 0 } });
  check(r.detail.s2.rederived === 0 && r.detail.removalsCount === 0, 'nothing accepted');
  check(w.log.solves.every(function (s) { return s.purpose === 'floor'; }), 'only floor solves');
  check(r.counts.floorDeductions === 0, 'no deduction was applied by the scripted stuck solves');
});

// --- phase A -------------------------------------------------------------------------------------------------------------

add('phaseA.s2-accept', 'frontier', 'F1 accepts by a complete proof or by re-derivation; F0 (S2 off) only by a complete proof', function () {
  const a = makeWorld({ minClues: 0 });
  const r1 = a.run('F1', { testOnly: { kF: 0 } });
  check(r1.detail.removalsCount === a.groups.length, 'every group is removable');
  check(r1.detail.s2.solved >= 1 && r1.detail.s2.rederived >= 1, 'the first test is a proof (nothing else empty), later ones re-derive');
  const b = makeWorld({ minClues: 0 });
  const r0 = b.run('F0', { testOnly: { kF: 0 } });
  equal(r0.detail.s2.rederived, 0, 'S2 off: no re-derivation');
  equal(r0.detail.s2.solved, b.groups.length, 'every accepted test is a complete solve');
  check(r1.counts.floorDeductions < r0.counts.floorDeductions, 'S2 shortens the accepted tests (fewer deductions)');
  check(r1.detail.removals.every(function (x) { return x[2] === 0 || x[3] >= 1; }), 'a re-derivation records its deduction ordinal');
});

add('phaseA.ladder-passes', 'frontier', 'a ladder revisits remaining groups once per distinct rung; FC and FM run one pass', function () {
  const w = makeWorld({ n: 8, minClues: 0 });
  w.stuck = function (gi, rung) { return gi === 1 && rung !== 'full'; };
  const r = w.run('F1', { testOnly: { kF: 0 } });
  equal(r.detail.passes.map(function (p) { return p.rung; }), ['cheap', 'middle', 'full'], 'three passes');
  equal(r.detail.passes[0].stuckUnique, 1, 'refused at cheap');
  equal(r.detail.passes[1].stuckUnique, 1, 'refused again at middle');
  equal(r.detail.passes[2].accepted, 1, 'accepted at the full rung');
  equal(r.counts.ladderPasses, 3, 'passes charged');
  const c = makeWorld({ n: 8 });
  equal(c.run('FC', { testOnly: { kF: 0 } }).counts.ladderPasses, 1, 'FC one pass');
  const m = makeWorld({ n: 8 });
  const mr = m.run('FM', { testOnly: { kF: 0 } });
  equal(mr.detail.rungs.map(function (x) { return x.id; }), ['middle'], 'FM rung');
});

add('phaseA.never-assumes-uniqueness', 'frontier', 'phase A never assumes uniqueness; FU enables it only after the fresh proof of that reference', function () {
  const w = makeWorld({ n: 8, minClues: 0 });
  w.stuck = function (gi) { return gi === 2; };
  const r = w.run('FU', { testOnly: { kF: 2 } });
  w.log.solves.filter(function (s) { return s.purpose === 'floor'; }).forEach(function (s) {
    check(s.options.assumeUniqueness === false, 'a floor solve assumed uniqueness');
  });
  check(w.log.counts.some(function (c) { return c.purpose === 'dfs'; }), 'a DFS count ran');
  check(w.log.fu.length >= 1, 'the FU filter ran');
  check(w.log.fu.every(function (f) { return f.purpose === 'fu'; }), 'the filter is a floor-type solve');
  check(r.detail.phaseB.length >= 1 && r.detail.phaseB[0].proof === 1, 'proof before the filter');
  const row = r.detail.phaseB[0];
  check(row.fu !== undefined, 'filter result recorded after the proof');
  const allowed = w.log.solves.filter(function (s) { return s.purpose === 'allowed'; });
  check(allowed.length >= 1, 'an allowed-set solve ran');
  allowed.forEach(function (s) { check(s.options.assumeUniqueness === true, 'the allowed-set solve runs after the proof'); });
  const other = makeWorld({ n: 8, minClues: 0 });
  other.stuck = function (gi) { return gi === 2; };
  other.run('F1', { testOnly: { kF: 2 } });
  equal(other.log.fu.length, 0, 'the other variants do not perform the extra filter');
});

add('phaseA.fu-filter', 'frontier', 'FU records a floor-solvable entry as a filtered shallow frontier and spends no phase-B solve on it', function () {
  const w = makeWorld({ n: 8, minClues: 0 });
  w.stuck = function (gi) { return gi === 2; };
  w.onFu = function () { return { required: false, vacuous: false, unsolvedCount: 0 }; };
  const r = w.run('FU', { testOnly: { kF: 3 } });
  equal(r.detail.phaseB[0].outcome, 'fu-filtered-shallow', 'filtered');
  equal(r.counts.phaseBSolves, 0, 'no allowed-set solve');
  equal(r.counts.fuFilterSolves, 1, 'the filter solve is counted');
  equal(r.best.source, 'fallback', 'the fallback stays the result');
});

add('phaseA.dfs-proof', 'frontier', 'unique versus two solutions versus unknown: ambiguity is permanent, unknown is not', function () {
  const w = makeWorld({ n: 8, minClues: 0 });
  w.stuck = function (gi, rung) { return (gi === 1 || gi === 2 || gi === 3) && rung !== 'full'; };
  w.onCount = function (info) {
    const g = info.zeroed.filter(function (c) { return !w.baseZeros.has(c); });
    const gi = g.length > 0 ? Math.floor(g[0] / 2) : -1;
    if (gi === 1) return 2;
    if (gi === 2) return null;
    return 1;
  };
  const r = w.run('F1', { testOnly: { kF: 0 } });
  equal(r.detail.refusals.ambiguous, 1, 'one group proved ambiguous');
  const tested = function (gi) {
    return w.log.solves.filter(function (s) { return s.purpose === 'floor' && s.groupIndex === gi; }).length;
  };
  equal(tested(1), 1, 'the ambiguous group is never tested at a later rung');
  check(tested(2) >= 2, 'an unknown count is not a permanent rejection');
  const entry = r.detail.entries.find(function (e) { return e.group === 2; });
  equal(entry === undefined ? 'accepted-later' : entry.proof, 'accepted-later', 'accepted at the full rung, so no entry remains');
  const w2 = makeWorld({ n: 8, minClues: 0 });
  w2.stuck = function (gi) { return gi === 2; };
  w2.onCount = function () { return null; };
  const r2 = w2.run('FC', { testOnly: { kF: 0 } });
  equal(r2.detail.entries[0].proof, 'unknown', 'an unknown count is kept as an entry with that proof');
});

add('phaseA.floor-budget-vs-stuck', 'frontier', 'a floor budget stop is a sample-budget outcome, not a floor-stuck refusal', function () {
  const w = makeWorld({ n: 8 });
  const lim = SB.pilotCeilings({ CAP_RATINGS: 1024, OBJECTIVE_STEPS: 100000, UNIQUE_NODES: 200000 }, { groups: 4, cells: 8, digits: 4 });
  lim.floorDeductions = 1;
  const r = w.run('F1', { limits: lim });
  equal(r.status, 'sample-budget', 'status');
  equal(r.budgetStop.dimension, 'floorDeductions', 'dimension');
  check(r.detail.refusals.stuckUnique === 0 && r.detail.entries.length === 0, 'no refusal or entry was invented');
  equal(w.rt.s2, null, 'S2 disarmed');
  equal(w.rt.limits, null, 'limits cleared');
  const s = makeWorld({ n: 8 });
  s.stuck = function (gi) { return gi === 1; };
  const rs = s.run('F1', { testOnly: { kF: 0 } });
  equal(rs.status, 'complete', 'a true stuck floor is an ordinary refusal');
});

add('phaseA.contradiction', 'frontier', 'a contradiction or an engine error is not "floor stuck"', function () {
  const w = makeWorld({ n: 8 });
  w.onSolve = function (info) { return info.purpose === 'floor' ? { steps: [], end: 'contradiction' } : { steps: [], end: 'solved' }; };
  throws(function () { w.run('F1'); }, function (e) { return e.code === 'floor-contradiction'; }, 'contradiction');
  equal(w.rt.s2, null, 'S2 disarmed after the error');
  const t = makeWorld({ n: 8 });
  t.onSolve = function () { return { steps: [], end: 'throw' }; };
  throws(function () { t.run('F1'); }, function (e) { return e.message === 'engine bug'; }, 'a production error is not swallowed as budget');
});

add('phaseA.floors', 'frontier', 'coarse symmetry groups and the clue/unit floors skip groups without a test', function () {
  const w = makeWorld({ n: 16, group: 4, minClues: 10, minPerUnit: 3 });
  const r = w.run('FC', { testOnly: { kF: 0 } });
  check(r.detail.passes[0].skippedMinClues + r.detail.passes[0].skippedUnitMinimum >= 1, 'some group was skipped');
  check(r.counts.floorTests === r.detail.passes[0].tests, 'tests charged');
  const clues = r.detail.finalClues;
  check(clues >= 10, 'the clue floor holds (' + clues + ')');
  check(r.detail.passes[0].tests < w.groups.length, 'fewer tests than groups');
  const unitClues = new Int32Array(w.model.units.length);
  w.groups.forEach(function (g, i) {
    if (!r.detail.removals.some(function (x) { return x[0] === i; })) {
      g.forEach(function (c) { w.model.cellUnits[c].forEach(function (u) { unitClues[u]++; }); });
    }
  });
  check(Array.from(unitClues).every(function (v) { return v >= 3; }), 'the unit floor holds');
});

add('phaseA.empty-tier', 'frontier', 'an empty actual tier is vacuous: not searched as a frontier', function () {
  const w = makeWorld({ tier: [] });
  throws(function () { w.run('F1'); }, function (e) { return e.code === 'unsupported-source' && /vacuous/.test(e.message); },
    'empty tier');
  equal(w.log.solves.length, 0, 'no solve ran');
});

// --- phase B ---------------------------------------------------------------------------------------------------------------

add('phaseB.order-and-kf', 'frontier', 'phase B orders by (floor unsolved cells, discovery ordinal) and tries at most K_F', function () {
  const w = makeWorld({ n: 40 });
  w.stuck = function (gi) { return gi % 4 !== 0; };
  w.stuckUnsolved = function (info) { return 40 - info.zeroed.length + (info.groupIndex % 5); };
  w.onRate = function () { return { solved: true, level: 'master', score: 1400, hardestTechnique: 'xyWing', techniqueCounts: { xyWing: 1 } }; };
  const r = w.run('FC');
  check(r.detail.entries.length >= 13, 'more entries than K_F (' + r.detail.entries.length + ')');
  equal(r.counts.phaseBTries, 12, 'K_F tries');
  equal(r.counts.phaseBSolves, 12, 'solves');
  const keys = r.detail.phaseB.map(function (row) { return [row.unsolved, row.ordinal]; });
  const sorted = keys.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  equal(keys, sorted, 'tried in (unsolved, ordinal) order');
  const all = r.detail.entries.slice().sort(function (a, b) { return a.unsolved - b.unsolved || a.ordinal - b.ordinal; });
  equal(r.detail.phaseB.map(function (row) { return row.group; }), all.slice(0, 12).map(function (e) { return e.group; }),
    'the first twelve of the recorded order');
});

add('phaseB.dedupe-rungs', 'frontier', 'one group is one entry: the last rung\'s failure counts, earlier rungs stay diagnostics', function () {
  const w = makeWorld({ n: 8, minClues: 0 });
  w.stuck = function (gi) { return gi === 1; };
  const r = w.run('F1', { testOnly: { kF: 0 } });
  const mine = r.detail.entries.filter(function (e) { return e.group === 1; });
  equal(mine.length, 1, 'a single entry for three rungs');
  equal(mine[0].rung, 'full', 'the last rung');
  const diag = r.detail.diagnostics.filter(function (d) { return d.group === 1; });
  equal(diag.map(function (d) { return d.rung; }), ['cheap', 'middle'], 'earlier rungs are diagnostics');
  check(mine[0].ordinal > diag[1].ordinal, 'a new discovery ordinal');
  const later = makeWorld({ n: 8, minClues: 0 });
  later.stuck = function (gi, rung) { return gi === 1 && rung === 'cheap'; };
  const rl = later.run('F1', { testOnly: { kF: 0 } });
  equal(rl.detail.entries.length, 0, 'an entry whose group was later removed is dropped');
  equal(rl.detail.diagnostics[0].fate, 'removed-later', 'and kept as a diagnostic');
});

const IDENTITY_RNG = { fork: function () { return { shuffle: function (a) { return a; } }; } };

add('phaseB.final-vs-snapshot', 'frontier', 'final-parent variants use the final parent, FS the immutable snapshot, with fresh proofs', function () {
  const mk = function () {
    const w = makeWorld({ n: 8, minClues: 0 });
    // g0 is stuck at every rung and is tested first; the others only fall at the full rung, after g0's last failure.
    w.stuck = function (gi, rung) { return gi === 0 || rung !== 'full'; };
    return w;
  };
  const a = mk();
  const rf = a.run('F1', { testOnly: { kF: 3 }, rng: IDENTITY_RNG });
  const b = mk();
  const rs = b.run('FS', { testOnly: { kF: 3 }, rng: IDENTITY_RNG });
  const checkF = rf.detail.referenceChecks[0];
  equal(checkF.mode, 'final', 'final');
  check(checkF.equalsFinal === true, 'the reference is the final parent');
  const checkS = rs.detail.referenceChecks[0];
  equal(checkS.mode, 'snapshot', 'snapshot');
  check(checkS.equalsRecordedSnapshot === true && checkS.equalsFinal === false, 'the reference is the recorded snapshot, not the final parent');
  check(a.log.counts.filter(function (c) { return c.purpose === 'dfs'; }).length >= 2, 'a fresh count at the reference (besides the one at discovery)');
  check(b.log.counts.filter(function (c) { return c.purpose === 'dfs'; }).length >= 2, 'a fresh count for the snapshot too');
  const cf = a.log.counts[a.log.counts.length - 1].zeroed.length;
  const cs = b.log.counts[b.log.counts.length - 1].zeroed.length;
  check(cf > cs, 'the final-parent candidate has fewer clues than the snapshot candidate (' + cf + ' vs ' + cs + ')');
});

add('phaseB.stale', 'frontier', 'a changed snapshot or final parent is a correctness stop', function () {
  const w = makeWorld({ n: 8, minClues: 0 });
  w.stuck = function (gi) { return gi === 1; };
  throws(function () {
    w.run('FS', { testOnly: { kF: 3, beforePhaseB: function (entries) {
      entries.forEach(function (e) { e.snapshot[0] = e.snapshot[0] === 0 ? 3 : 0; });
    } } });
  }, function (e) { return e.code === 'stale-snapshot'; }, 'stale snapshot');
  const v = makeWorld({ n: 8, minClues: 0 });
  v.stuck = function (gi) { return gi === 1; };
  throws(function () {
    v.run('F1', { testOnly: { kF: 3, beforePhaseB: function (entries, parent) { parent[7] = 5; } }, rng: IDENTITY_RNG });
  }, function (e) { return e.code === 'stale-final-parent'; }, 'stale final parent');
});

add('phaseB.infeasible-at-final', 'frontier', 'an entry that no longer fits the clue floor at the final parent is not tried', function () {
  const w = makeWorld({ n: 8, minClues: 2 });
  w.stuck = function (gi) { return gi === 0; };
  const r = w.run('FC', { testOnly: { kF: 3 }, rng: IDENTITY_RNG });
  equal(r.counts.phaseBTries, 0, 'no try');
  equal(r.detail.phaseB.length, 0, 'no phase-B row');
  check(r.detail.diagnostics.some(function (d) { return d.fate === 'infeasible-at-final-parent'; }), 'kept as a diagnostic');
  equal(r.detail.finalClues, 2, 'the final parent holds the clue floor');
});

add('phaseB.last-rung-only', 'frontier', 'only an entry of the last executed rung is tried: an earlier-rung entry cannot survive a later feasibility skip', function () {
  const mk = function () {
    // g0..g5 are refused at the cheap rung and become entries; g6 and g7 fall at the cheap rung, so the clue floor (12)
    // then skips every other group in the middle and full passes
    const w = makeWorld({ n: 16, minClues: 12 });
    w.stuck = function (gi, rung) { return gi < 6 && rung === 'cheap'; };
    return w;
  };
  ['FS', 'F1'].forEach(function (id) {
    const w = mk();
    const r = w.run(id, { testOnly: { kF: 3 }, rng: IDENTITY_RNG });
    equal(r.detail.passes.map(function (p) { return p.skippedMinClues; }), [0, 6, 6], id + ': the later passes skip the six groups');
    equal(r.counts.phaseBTries, 0, id + ': no entry of an earlier rung is tried');
    equal(r.detail.phaseB.length, 0, id + ': no phase-B row');
    equal(r.detail.entries.length, 0, id + ': the earlier-rung entries are not candidates');
    const gone = r.detail.diagnostics.filter(function (d) { return d.fate === 'earlier-than-last-rung'; });
    equal(gone.map(function (d) { return d.rung; }), ['cheap', 'cheap', 'cheap', 'cheap', 'cheap', 'cheap'], id + ': six diagnostics');
    equal(r.best.source, 'fallback', id + ': only the fully given fallback remains');
  });
  const control = makeWorld({ n: 8, minClues: 0 });
  control.stuck = function (gi) { return gi === 1; };
  const rc = control.run('FS', { testOnly: { kF: 3 }, rng: IDENTITY_RNG });
  equal(rc.detail.entries.map(function (e) { return e.rung; }), ['full'], 'an entry of the last rung stays a candidate');
  equal(rc.counts.phaseBTries, 1, 'and is tried');
});

add('phaseB.allowed-contradiction', 'frontier', 'a contradiction after the proved uniqueness is an error; a stuck allowed-set solve is the ordinary miss', function () {
  const mk = function (end) {
    const w = makeWorld({ n: 8, minClues: 0 });
    w.stuck = function (gi) { return gi === 1; };
    const base = w.onSolve;
    w.onSolve = function (info) {
      return info.purpose === 'allowed' ? { steps: [], end: end, unsolved: 3 } : base(info);
    };
    return w;
  };
  const bad = mk('contradiction');
  const thrown = throws(function () { bad.run('F1', { testOnly: { kF: 3 }, rng: IDENTITY_RNG }); },
    function (e) { return e.code === 'allowed-contradiction'; }, 'a contradiction on a proved-unique candidate');
  check(/ended contradiction/.test(thrown.message), 'the status is named');
  equal(bad.log.counts.length >= 2, true, 'the uniqueness was proved first');
  const miss = mk('stuck');
  const r = miss.run('F1', { testOnly: { kF: 3 }, rng: IDENTITY_RNG });
  equal(r.status, 'complete', 'a stuck solve ends the sample normally');
  equal(r.detail.phaseB.map(function (row) { return [row.allowedStatus, row.outcome]; }), [['stuck', 'allowed-set-not-solved']],
    'recorded as the ordinary miss');
});

add('phaseB.keeper-ties', 'frontier', 'exact / shallow / off-band candidates follow the native quality and tie rule', function () {
  const w = makeWorld({ n: 40 });
  w.stuck = function (gi) { return gi === 3 || gi === 5 || gi === 7 || gi === 9; };
  const seq = [
    { solved: true, level: 'nightmare', score: 1600, techniqueCounts: { xyWing: 1 } },
    { solved: true, level: 'master', score: 1300, techniqueCounts: { xyWing: 1 } },
    { solved: true, level: 'nightmare', score: 1650, techniqueCounts: { forcingChain: 1 } },
    { solved: true, level: 'nightmare', score: 1700, techniqueCounts: { nishio: 1 } }
  ];
  let k = 0;
  w.onRate = function (givens, index) {
    if (index === 0) return { solved: true, level: 'veryEasy', score: 0, techniqueCounts: {} };
    const rating = seq[k++ % seq.length];
    return Object.assign({ hardestTechnique: 'x' }, rating);
  };
  const r = w.run('FC');
  const outcomes = r.detail.phaseB.map(function (row) { return row.outcome; });
  equal(outcomes[0], 'shallow', 'in band without the tier is shallow');
  equal(outcomes[1], 'rated', 'an off-band level is a plain distance');
  const kept = r.detail.phaseB.map(function (row) { return row.kept; });
  equal(kept.slice(0, 3), [true, false, false], 'a better one replaces, a worse one and an equal one do not');
  equal(r.best.exact, true, 'the exact candidate is retained');
  equal(r.best.source, 'phaseB', 'from phase B');
  equal(outcomes.indexOf('exact'), outcomes.length - 1, 'phase B stops at the first exact');
});

add('phaseB.fallback', 'frontier', 'the fully given grid is rated first, charged, and stays the valid fallback', function () {
  const w = makeWorld({ n: 8, minClues: 0 });
  w.onRate = function (givens, index) {
    return index === 0 ? { solved: true, level: 'veryEasy', score: 0, techniqueCounts: {} } :
      { solved: false, level: null, score: null, techniqueCounts: {} };
  };
  w.stuck = function (gi) { return gi === 2; };
  const r = w.run('FC');
  equal(w.log.rates[0].givens.every(function (v, i) { return v === w.solution[i]; }), true, 'the first rating is the full grid');
  equal(r.best.source, 'fallback', 'nothing better: the fallback');
  equal(r.fallback.level, 'veryEasy', 'recorded');
  check(r.counts.canonicalRatings >= 1, 'charged');
});

// --- deepen -----------------------------------------------------------------------------------------------------------------

function belowBandWorld(options) {
  const o = Object.assign({ n: 24, stuck: [3, 4, 5, 6] }, options || {});
  const w = makeWorld({ n: o.n, minClues: 0 });
  w.stuck = function (gi) { return o.stuck.indexOf(gi) >= 0; };
  w.onRate = function (givens, index) {
    if (index === 0) return { solved: true, level: 'veryEasy', score: 0, techniqueCounts: {} };
    const empties = givens.filter(function (v) { return v === 0; }).length;
    const score = 1000 + empties * 8;
    return score >= 1500 ? { solved: true, level: 'nightmare', score: score, techniqueCounts: { nishio: 1 } } :
      { solved: true, level: 'master', score: score, techniqueCounts: { xyWing: 1 } };
  };
  return w;
}

add('deepen.numeric', 'frontier', 'deepen uses the native bounded objective in a seeded order, at most 16 proposals, and rates its result', function () {
  const w = belowBandWorld();
  let calls = 0;
  w.onObjective = function (givens, group) {
    calls++;
    return 1000 + givens.filter(function (v) { return v === 0; }).length * 25 + group.length;
  };
  const r = w.run('FC');
  const run = r.detail.deepen.runs[0];
  check(run !== undefined, 'a deepen ran from the below-band candidate');
  check(r.counts.deepenProposals <= 16 && r.counts.deepenProposals === calls, 'proposals counted (' + calls + ')');
  check(run.committed >= 1, 'a committed removal');
  check(run.result && run.result.hash.length === 64, 'rated canonically before it is offered');
  equal(r.detail.phaseCosts.deepen !== undefined, true, 'attributed to its own phase');
  const again = belowBandWorld();
  again.onObjective = w.onObjective;
  const r2 = again.run('FC');
  equal(r2.detail.deepen.runs[0].from, run.from, 'seeded order: the same sample gives the same deepen');
  equal(r2.detail.deepen.proposals, r.detail.deepen.proposals, 'deterministic proposals');
});

add('deepen.cap', 'frontier', 'deepen never exceeds 16 proposals across the whole sample', function () {
  const w = belowBandWorld({ n: 60, stuck: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] });
  w.onObjective = function () { return 1100; };
  const r = w.run('FC');
  equal(r.counts.deepenProposals, 16, 'the whole allowance is used when the target is never reached');
  equal(r.status, 'complete', 'the structural cap is a normal end, not a budget stop');
  check(r.detail.deepen.runs.length >= 1, 'a deepen ran');
});

add('deepen.typed-objective', 'frontier', 'a typed objective result is never given an invented number and stops the sample as unsupported', function () {
  equal(F.objectiveOutcome(1234, w0().rt.digger), { kind: 'score', score: 1234 }, 'a number');
  equal(F.objectiveOutcome(-2, w0().rt.digger), { kind: 'refused', reason: 'tooHard' }, 'a refusal');
  equal(F.objectiveOutcome({ kind: 'score', value: 5 }, w0().rt.digger).kind, 'unsupported', 'an object');
  equal(F.objectiveOutcome(NaN, w0().rt.digger).kind, 'unsupported', 'NaN');
  equal(F.objectiveOutcome(null, w0().rt.digger).type, 'null', 'null');
  const w = belowBandWorld();
  w.onObjective = function () { return { typed: true }; };
  const thrown = throws(function () { w.run('FC'); }, function (e) { return e.code === 'unsupported-source'; },
    'a typed objective stops the sample as unsupported');
  check(/non-numeric value \(unsupported:object\)/.test(thrown.message), 'the stop names the unsupported type');
  equal(w.log.objectives.length, 1, 'stopped at the first proposal: nothing was ranked');
  const numeric = belowBandWorld();
  numeric.onObjective = function () { return 1100; };
  equal(numeric.run('FC').status, 'complete', 'a numeric objective is unaffected');
});

function w0() {
  return makeWorld();
}

// --- budget stops, each phase --------------------------------------------------------------------------------------------------

add('budget.each-phase', 'budget', 'a budget stop in every phase is explicit and leaves the source state restored', function () {
  const ceilings = SB.pilotCeilings({ CAP_RATINGS: 1024, OBJECTIVE_STEPS: 100000, UNIQUE_NODES: 200000 },
    { groups: 12, cells: 24, digits: 4 });
  const cases = [
    { dimension: 'canonicalRatings', value: 0, phase: 'init', world: function () { return belowBandWorld(); } },
    { dimension: 'ladderPasses', value: 0, phase: 'phaseA', world: function () { return belowBandWorld(); } },
    { dimension: 'floorTests', value: 2, phase: 'phaseA', world: function () { return belowBandWorld(); } },
    { dimension: 'floorDeductions', value: 2, phase: 'phaseA', world: function () { return belowBandWorld(); } },
    { dimension: 'solverChecks', value: 2, phase: 'phaseA', world: function () { return belowBandWorld(); } },
    { dimension: 'dfsChecks', value: 2, phase: 'phaseA', world: function () { return belowBandWorld(); } },
    { dimension: 'dfsEntries', value: 0, phase: 'phaseA', world: function () { return belowBandWorld(); } },
    { dimension: 'phaseBSolves', value: 0, phase: 'phaseB', world: function () { return belowBandWorld(); } },
    { dimension: 'canonicalRatings', value: 1, phase: 'phaseB', world: function () { return belowBandWorld(); } },
    { dimension: 'deepenProposals', value: 0, phase: 'deepen', world: function () {
      const w = belowBandWorld();
      w.onObjective = function () { return 1100; };
      return w;
    } }
  ];
  cases.forEach(function (c) {
    const w = c.world();
    const lim = Object.assign({}, ceilings);
    lim[c.dimension] = c.value;
    const before = Array.from(w.solution);
    const r = w.run('FC', { limits: lim });
    const where = c.dimension + '=' + c.value;
    equal(r.status, 'sample-budget', where + ' status');
    equal(r.budgetStop.dimension, c.dimension, where + ' dimension');
    equal(r.budgetStop.limit, c.value, where + ' limit');
    check(r.best !== null && r.best.givens.length === 24 || r.best === null, where + ' a candidate or none');
    equal(w.rt.s2, null, where + ' S2 disarmed');
    equal(w.rt.limits, null, where + ' limits cleared');
    equal(Array.from(w.solution), before, where + ' solution untouched');
    const phase = c.phase;
    check(r.budgetStop.atPhase === phase || (phase === 'deepen' && r.budgetStop.atPhase === 'phaseB'),
      where + ' stopped in ' + phase + ' (got ' + r.budgetStop.atPhase + ')');
  });
  const w = belowBandWorld();
  w.run('FC', { limits: Object.assign({}, ceilings, { floorTests: 1 }) });
  w.rt.reset();
  equal(w.rt.stopped, null, 'a reset clears the sticky stop for the next trial');
});

add('budget.fallback-visible', 'budget', 'sample-budget stays the outcome even when a valid fallback exists', function () {
  const w = belowBandWorld();
  const lim = SB.pilotCeilings({ CAP_RATINGS: 1024, OBJECTIVE_STEPS: 100000, UNIQUE_NODES: 200000 }, { groups: 12, cells: 24, digits: 4 });
  lim.floorTests = 1;
  const r = w.run('FC', { limits: lim });
  equal(r.status, 'sample-budget', 'status');
  equal(r.best.source, 'fallback', 'the fallback exists');
  equal(r.best.exact, false, 'and is not an exact hit');
  equal(r.fallback.level, 'veryEasy', 'it was rated and charged first');
});

add('budget.pilot-ceilings', 'budget', 'pilot ceilings follow the task formulas and the engine constants', function () {
  const c = SB.pilotCeilings({ CAP_RATINGS: 1024, OBJECTIVE_STEPS: 100000, UNIQUE_NODES: 200000 }, { groups: 128, cells: 256, digits: 16 });
  equal(c.floorTests, 384, '3G');
  equal(c.ladderPasses, 3, 'ladder');
  equal(c.phaseBSolves, 12, 'K_F');
  equal(c.deepenProposals, 16, 'deepen');
  equal(c.canonicalRatings, 64, 'canonical');
  equal(c.floorDeductions, 3 * 128 * 256 * 17, '3G*N*(D+1)');
  equal(c.solverChecks, 1024 * 100000, 'CAP_RATINGS * OBJECTIVE_STEPS');
  equal(c.dfsEntries, (3 * 128 + 12 + 16 + 64) * 200000, 'DFS entries');
  equal(c.dfsChecks, c.dfsEntries, 'DFS checks');
  throws(function () { SB.pilotCeilings({ CAP_RATINGS: 1024 }, { groups: 1, cells: 1, digits: 1 }); },
    function (e) { return e.code === 'capability-missing'; }, 'a constant the engine does not expose');
});

add('budget.fit-rule', 'budget', 'the fit is min(ceiling, next power of two >= 2 x the largest observed count); incomplete cells stay unfitted', function () {
  equal(SB.nextPowerOfTwoAtLeast(1), 1, '1');
  equal(SB.nextPowerOfTwoAtLeast(5), 8, '5');
  equal(SB.nextPowerOfTwoAtLeast(1024), 1024, '1024');
  const ceilings = { floorTests: 100, ladderPasses: 3, phaseBSolves: 12, deepenProposals: 16, canonicalRatings: 64,
    floorDeductions: 5000, solverChecks: 1000000, dfsEntries: 3000, dfsChecks: 4000 };
  const planned = ['a', 'b'];
  const trial = function (key, counts, outcome) { return { key: key, outcome: outcome || 'complete', counts: counts }; };
  const cell = SB.fitCell({ cell: 'x', ceilings: ceilings, plannedKeys: planned, trials: [
    trial('a', { floorDeductions: 300, solverChecks: 9000, dfsEntries: 0, dfsChecks: 1200 }),
    trial('b', { floorDeductions: 700, solverChecks: 4000, dfsEntries: 0, dfsChecks: 1000 })] });
  equal(cell.status, 'fitted', 'fitted');
  equal(cell.limits.floorDeductions, 1500 > 5000 ? 5000 : 2048, 'next power of two of 2 x 700 = 1400 -> 2048');
  equal(cell.limits.solverChecks, 32768, '2 x 9000 -> 32768');
  equal(cell.limits.dfsChecks, 4000, 'capped at the ceiling (4096 > 4000)');
  equal(cell.limits.dfsEntries, 3000, 'zero observed: the ceiling stays, never a zero budget');
  equal(cell.dimensions.dfsEntries.fitted, false, 'and is marked unfitted');
  equal(cell.dimensions.dfsEntries.reason, 'observed-only-zero', 'with the reason');
  equal(cell.limits.floorTests, 100, 'structural limits stay fixed');
  const censored = SB.fitCell({ cell: 'x', ceilings: ceilings, plannedKeys: planned, trials: [
    trial('a', { floorDeductions: 300, solverChecks: 9000, dfsEntries: 1, dfsChecks: 1200 }),
    trial('b', null, 'request-timeout')] });
  equal(censored.status, 'unfitted', 'a censored variant makes the cell unfitted');
  FITTED_ALL(censored, ceilings);
  const missing = SB.fitCell({ cell: 'x', ceilings: ceilings, plannedKeys: planned, trials: [
    trial('a', { floorDeductions: 300, solverChecks: 9000, dfsEntries: 1, dfsChecks: 1200 })] });
  equal(missing.status, 'unfitted', 'incomplete coverage');
  equal(missing.problems[0], { key: 'b', problem: 'not-run' }, 'the missing key is named');
  const doc = SB.buildBudgetsDoc({ round: 'r', evidenceStatus: 'provisional (pre-freeze)', nativeConstants: {},
    runtimeFingerprint: 'x', harnessFingerprint: 'y', inputs: [], cells: { x: cell } });
  check(/^[0-9a-f]{64}$/.test(doc.hash), 'hash');
  equal(SB.buildBudgetsDoc({ round: 'r', evidenceStatus: 'provisional (pre-freeze)', nativeConstants: {},
    runtimeFingerprint: 'x', harnessFingerprint: 'y', inputs: [], cells: { x: cell } }).hash, doc.hash, 'deterministic');
});

function FITTED_ALL(cell, ceilings) {
  SB.FITTED.forEach(function (d) { equal(cell.limits[d], ceilings[d], 'unfitted keeps the ceiling of ' + d); });
}

// --- native comparison control flow, plan, manifest -----------------------------------------------------------------------------

add('plan.population', 'plan', 'the plan is the 64 preregistered keys in the fixed priority order, arms rotated by grid index', function () {
  const M = require('./manifest.cjs');
  const manifest = M.buildManifest('IG-S04', 'provisional-r1');
  equal(manifest.jobs.length, 64, 'at most 64 trials');
  equal(manifest.shards.map(function (s) { return s.shard; }),
    ['s1-large-controls', 's2-small-all', 's3-large-native-f1', 's4-large-floors', 's5-large-reference', 's6-large-s2-control'],
    'priority order');
  const s1 = manifest.jobs.filter(function (j) { return j.shard === 's1-large-controls'; });
  equal(s1.map(function (j) { return j.gridCluster + '/' + j.mode; }),
    ['mega16:11/proposal-only', 'mega16:11/ordinary-only', 'mega16:11/F1', 'samurai:11/proposal-only',
      'samurai:11/ordinary-only', 'samurai:11/F1'], 'the controls and F1 first, one grid per block');
  const s3 = manifest.jobs.filter(function (j) { return j.shard === 's3-large-native-f1'; });
  equal(s3.slice(0, 3).map(function (j) { return j.mode; }), ['ordinary-only', 'F1', 'proposal-only'], 'rotation by the grid index');
  const s2 = manifest.jobs.filter(function (j) { return j.shard === 's2-small-all'; });
  equal(Array.from(new Set(s2.map(function (j) { return j.puzzleVariant; }))), ['classic9', 'mega12'], 'small cells');
  equal(s2.length, 32, '2 cells x 2 seeds x 8 modes');
  const cells = {};
  manifest.jobs.forEach(function (j) { cells[j.puzzleVariant] = (cells[j.puzzleVariant] || 0) + 1; });
  equal(cells, { classic9: 16, mega12: 16, mega16: 16, samurai: 16 }, 'sixteen per cell');
  check(manifest.jobs.every(function (j) { return j.requestSeed === 11 || j.requestSeed === 12; }), 'literal pilot seeds');
  check(manifest.jobs.every(function (j) { return j.level === 'nightmare' && j.guardScope === 'sample' && j.solverMode === 'reference'; }),
    'nightmare, 45 s trial guard, reference solver');
  check(manifest.jobs.every(function (j) { return j.trial.sample === 1 && j.trial.attempt === 1; }), 'sample ordinal 1, attempt 1');
  equal(new Set(manifest.jobs.map(function (j) { return j.key; })).size, 64, 'unique keys');
  check(!C.hasKeyDeep(manifest, 'testOnly'), 'no test-only setting in a manifest');
  const again = M.buildManifest('IG-S04', 'provisional-r1');
  equal(again.manifestHash, manifest.manifestHash, 'the manifest never changes with an outcome');
});

add('plan.packing', 'plan', 'whole trials pack into the 270 s window by their admission estimates, never splitting a trial', function () {
  const M = require('./manifest.cjs');
  const manifest = M.buildManifest('IG-S04', 'provisional-r1');
  const window = M.commandWindowMs(270000);
  const s1 = M.shardOf(manifest, 's1-large-controls');
  const packed = M.packCommands(M.blocksFor(manifest, s1.jobKeys), window);
  equal(packed.commands.length, 1, 'the large-board probes fit one command');
  equal(packed.oversize, [], 'no oversize trial');
  const all = M.packCommands(M.blocksFor(manifest, manifest.jobs.map(function (j) { return j.key; })), window);
  check(all.commands.length >= 5, 'the whole population needs several commands');
  check(M.ALLOCATIONS_MS['IG-S04'] === 12 * 60000, 'twelve minutes');
});

// --- adapter anchors (source text only; nothing is executed) -----------------------------------------------------------------------

add('adapter.anchors', 'adapter', 'every hook anchor is a unique function header of the current source and the patched text compiles', function () {
  const L = require('./loader.cjs');
  const set = L.loadSourceSet({ repoRoot: C.DEFAULT_REPO_ROOT });
  const plan = L.buildLoadPlan(set, [L.getAdapter('frontier-hooks')]);
  equal(plan.transforms.length, 5, 'five transforms');
  plan.transforms.forEach(function (t) { check(t.beforeTextHash !== t.afterTextHash, t.id + ' changed its source'); });
  const patched = plan.items.filter(function (i) { return i.patched; }).map(function (i) { return i.rel; }).sort();
  equal(patched, ['../core/js/engine/dfs-solver.js', '../core/js/engine/logical-solver.js', 'js/engine/digger.js'],
    'exactly the solver, the DFS and the digger');
  const digger = plan.items.find(function (i) { return i.rel === 'js/engine/digger.js'; }).code;
  const hooks = L.getAdapter('frontier-hooks');
  hooks.exposed.forEach(function (name) {
    check(new RegExp('\\b' + name + '\\b').test(set.files.find(function (e) { return e.rel === 'js/engine/digger.js'; }).text),
      'digger.js declares ' + name);
  });
  check(digger.indexOf('SG.__igRt.digger = {') >= 0, 'the exposure is in the patched digger');
  const solver = plan.items.find(function (i) { return i.rel === '../core/js/engine/logical-solver.js'; }).code;
  check(solver.indexOf('SG.__igRt.step(model, state, tech);') >= 0 && solver.indexOf('SG.__igRt.solveOptions(options)') >= 0,
    'solver hooks');
  const dfs = plan.items.find(function (i) { return i.rel === '../core/js/engine/dfs-solver.js'; }).code;
  check(dfs.indexOf('SG.__igRt.dfsEntry()') >= 0 && dfs.indexOf('SG.__igRt.dfsBudget(budget)') >= 0, 'dfs hooks');
  const native = set.files.find(function (e) { return e.rel === '../core/js/engine/logical-solver.js'; }).text;
  check(native.indexOf('__igRt') < 0, 'the native source is untouched');
});

add('records.shape', 'records', 'trial records keep unknown as null and carry every common field', function () {
  const base = R.blankRecord({ key: 'k' });
  equal(R.checkRecord(base), [], 'a blank record is well formed');
  equal(base.counts.floorTests, null, 'unknown counters are null, never zero');
  R.COUNT_FIELDS.forEach(function (f) { check(f in base.counts, f); });
});

function fakeTrialRecord(manifest, key, over) {
  const job = manifest.jobs.find(function (j) { return j.key === key; });
  const rec = R.recordBase(job);
  rec.outcome = 'complete';
  rec.generation = Object.assign(rec.generation, { readyOccupiedWallMs: 12000, readyWallMs: 11000, coldWallMs: 12500,
    occupiedWallMs: 13000, cpuReadyTotalMs: 11800, gridBuildWallMs: 900 });
  rec.counts = Object.assign(rec.counts, { floorTests: 100, floorDeductions: 2000, solverChecks: 9000, dfsEntries: 40,
    dfsChecks: 800, ladderPasses: 3, phaseBSolves: 5, deepenProposals: 0, verificationSolves: 7 });
  rec.validation = Object.assign(rec.validation, { wallMs: 1500 });
  rec.claimedExact = false;
  rec.verifiedExact = false;
  rec.groupCount = 128;
  rec.cellCount = 256;
  rec.digits = 16;
  rec.nativeConstants = { CAP_RATINGS: 1024, CAP_PROPOSALS: 32768, OBJECTIVE_STEPS: 100000, UNIQUE_NODES: 200000 };
  return Object.assign(rec, over || {});
}

add('reprojection.shape', 'records', 'the mandatory reprojection is a projection with explicit unknowns, never zero or infinity', function () {
  const AGG = require('./ig04-aggregate.cjs');
  const M = require('./manifest.cjs');
  const manifest = M.buildManifest('IG-S04', 'provisional-r1');
  const s1 = manifest.shards[0].jobKeys;
  const records = s1.map(function (k, i) {
    if (i === 2) {
      return fakeTrialRecord(manifest, k, { outcome: 'request-timeout', timeoutScope: 'sample', counts: R.blankRecord({}).counts,
        generation: Object.assign(R.blankRecord({}).generation, { readyOccupiedWallMs: 45500, cpuReadyTotalMs: 45000 }),
        censoredProgress: { phase: 'rung-start', floorTests: 190, ladderPasses: 2, rung: 'middle' } });
    }
    return fakeTrialRecord(manifest, k);
  });
  const doc = AGG.buildReprojection({ round: 'provisional-r1', records: records, command: { timing: { occupiedMs: 150000 } },
    chargedBeforeMs: 0, approvedExtraMs: 0 });
  equal(doc.stage.planned, 6, 'six stage keys');
  equal(doc.stage.censored, 1, 'one censored');
  equal(doc.stage.completed, 5, 'five completed');
  equal(doc.censoredWork.length, 1, 'censored work listed');
  equal(doc.stage.commandChargedMs, 150000 + 45000, 'occupied time plus the grace');
  equal(doc.allocation.remainingMs, 720000 - 195000, 'the remaining allocation of 12 minutes');
  equal(doc.remainingPopulation.keys, 58, 'the remaining keys of the 64');
  const s2 = doc.remainingPopulation.shards.find(function (s) { return s.shard === 's2-small-all'; });
  equal(s2.observedScenarioComplete, false, 'unmeasured cells have no observation-based cost');
  equal(s2.observedScenarioMs, null, 'null, not zero');
  check(s2.ceilingScenarioChargedMs > 0, 'the guard ceiling is always known');
  const s3 = doc.remainingPopulation.shards.find(function (s) { return s.shard === 's3-large-native-f1'; });
  check(s3.observedScenarioComplete === true, 'the same cells and modes were observed');
  equal(doc.igS05PrimaryTier.cells.classic9.observedScenarioMs, null, 'an unmeasured cell');
  check(doc.igS05PrimaryTier.cells.mega16.observedScenarioMs > 0, 'a measured cell is projected');
  check(/^[0-9a-f]{64}$/.test(doc.hash), 'hash');
  check(!/Infinity|NaN/.test(JSON.stringify(doc)), 'no infinity or NaN');
  const again = AGG.buildReprojection({ round: 'provisional-r1', records: records, command: { timing: { occupiedMs: 150000 } },
    chargedBeforeMs: 0, approvedExtraMs: 0 });
  equal(again.hash, doc.hash, 'deterministic');
});

add('aggregate.shape', 'records', 'the budget, audit and variant documents are built from records with explicit status', function () {
  const AGG = require('./ig04-aggregate.cjs');
  const M = require('./manifest.cjs');
  const manifest = M.buildManifest('IG-S04', 'provisional-r1');
  const data = { manifest: manifest, got: { shards: [] }, catalogue: null, catalogueFingerprint: null, records: [] };
  manifest.jobs.filter(function (j) { return j.puzzleVariant === 'mega16'; }).forEach(function (j) {
    const censored = j.mode === 'F1' && j.requestSeed === 11;
    data.records.push(fakeTrialRecord(manifest, j.key, censored ? { outcome: 'request-timeout', timeoutScope: 'sample',
      counts: R.blankRecord({}).counts } : {}));
  });
  const budgets = AGG.budgetsDoc(data, 'provisional-r1', 'x');
  equal(budgets.cells.mega16.status, 'unfitted', 'a censored variant leaves the cell unfitted');
  equal(budgets.cells.mega16.limits.floorDeductions, 3 * 128 * 256 * 17, 'the pilot ceiling is kept');
  equal(budgets.cells.classic9.status, 'unfitted', 'an unstarted cell is unfitted and says so');
  check(budgets.cells.classic9.limits === null, 'no invented ceiling for an unstarted cell');
  check(/^[0-9a-f]{64}$/.test(budgets.hash), 'hash');
  const rows = AGG.modeRows(data);
  const f1 = rows.find(function (r) { return r.cell === 'mega16' && r.mode === 'F1'; });
  equal([f1.started, f1.censored, f1.unstarted], [2, 1, 0], 'coverage per cell and mode');
  const audit = AGG.s2AuditDoc(data, 'provisional-r1');
  equal(audit.trialsAudited, 0, 'no audit yet');
  const variants = AGG.variantManifest(data, 'provisional-r1');
  equal(variants.modes.length, 8, 'eight explicit identities');
  check(variants.interpretations.length >= 8, 'the interpretations are listed for review');
  const cat = { floors: { mega16: { nightmare: { floor: ['nakedSingle', 'xWing', 'xyWing', 'uniqueRectangle', 'forcingChain'],
    tier: ['nishio'] } } }, techniques: [{ id: 'nakedSingle', group: 'basic' }, { id: 'xWing', group: 'fish' },
    { id: 'xyWing', group: 'wing' }, { id: 'uniqueRectangle', group: 'wing', assumesUniqueness: true },
    { id: 'forcingChain', group: 'chain' }, { id: 'nishio', group: 'chain' }] };
  const sets = AGG.setsFromCatalogue(cat, 'mega16');
  equal(sets.cheap, ['nakedSingle', 'xyWing', 'uniqueRectangle'], 'cheap from the catalogue');
  equal(sets.middle, ['nakedSingle', 'xWing', 'xyWing', 'uniqueRectangle'], 'middle adds fish');
  equal(sets.ladder.map(function (r) { return r.id; }), ['cheap', 'middle', 'full'], 'ladder');
  equal(sets.ladder[0].effectiveIds, ['nakedSingle', 'xyWing'], 'the uniqueness-assuming finder is not effective');
});

// --- the real-engine suite -----------------------------------------------------------------------------------------------------------

function engineSynthetic(io) {
  const SG = io.SG;
  const rt = SG.__igRt;
  const results = [];
  const started = Date.now();
  const run = function (id, title, fn) {
    const t0 = Date.now();
    let ok = true;
    let detail = null;
    try {
      detail = fn() || null;
    } catch (err) {
      ok = false;
      detail = { error: String(err && err.stack ? err.stack.split('\n').slice(0, 4).join(' | ') : err) };
    }
    results.push({ id: id, group: 'engine', ok: ok, title: title, ms: Date.now() - t0, detail: detail });
  };
  const PASS = { tick: function () {}, check: function () {} };
  const SEED = 9001;
  const cfgOf = function (variantId) {
    return SG.pipeline.normalizeConfig({ variantId: variantId, difficulty: 'nightmare', seed: SEED, trace: 'off',
      symmetry: 'rotational180', digOrder: 'random' });
  };
  let ctx = null;
  const world = function () {
    if (ctx !== null) return ctx;
    const cfg = cfgOf('classic9');
    const rng = SG.rng.create(cfg.seed);
    const model = SG.variants.get('classic9').build(cfg.variantOptions, rng.fork('model'));
    rt.reset();
    const solution = SG.fullGrid.generate(model, rng.fork('grid#1'), PASS, { emit: SG.events.toEmitter(null), stepEvents: false });
    const spec = SG.difficulty.spec('nightmare', model);
    ctx = { cfg: cfg, rng: rng, model: model, solution: solution, spec: spec, groups: SG.symmetry.groups(model, 'rotational180') };
    rt.reset();
    return ctx;
  };
  const trialOf = function (mode, testOnly, seed) {
    const messages = [];
    require('./ig04-worker.cjs').runTrial({ SG: SG, job: { config: { variantId: 'classic9', difficulty: 'nightmare',
      seed: seed === undefined ? SEED : seed, trace: 'off', symmetry: 'rotational180', digOrder: 'random' },
    trial: { mode: mode, testOnly: testOnly || null } },
    post: function (m) { messages.push(m); }, failure: function (e) { return { code: e.code || null, message: String(e.message) }; } });
    const last = messages[messages.length - 1];
    if (!last || last.type !== 'decision') {
      throw new Error('the trial of ' + mode + ' did not decide: ' + (last ? last.type + ' ' + JSON.stringify(last.error) : 'nothing'));
    }
    return { trial: last.trial, wire: last.wire, messages: messages };
  };
  const puzzleOf = function () {
    const w = world();
    const dug = SG.digger.dig(w.model, w.solution, SG.rng.create(SEED).fork('synthetic-dig'), { minClues: 40, order: 'random',
      budget: PASS });
    return dug.givens;
  };
  const singles = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine'];

  run('engine.hooks-counters', 'the patched engine counts solves, deductions, logical checks and DFS work', function () {
    const w = world();
    const givens = puzzleOf();
    rt.reset();
    rt.setPurpose('floor');
    const report = SG.logicalSolver.solve(w.model, givens, { allowedTechniques: w.spec.floorTechniques, collectSteps: false,
      assumeUniqueness: false, budget: PASS });
    const c = rt.countersOf();
    const applied = Object.keys(report.techniqueCounts).reduce(function (s, k) { return s + report.techniqueCounts[k]; }, 0);
    if (c.logicalSolves !== 1) throw new Error('solves ' + c.logicalSolves);
    if (c.deductions !== applied) throw new Error('deductions ' + c.deductions + ' vs applied ' + applied);
    if (c.floorDeductions !== applied) throw new Error('floor deductions ' + c.floorDeductions);
    if (!(c.solverChecks >= applied)) throw new Error('checks ' + c.solverChecks);
    rt.reset();
    SG.dfs.countSolutions(w.model, givens, 2, PASS);
    const d = rt.countersOf();
    if (d.dfsCalls !== 1 || d.dfsEntries < 1) throw new Error('dfs ' + JSON.stringify(d));
    rt.reset();
    return { applied: applied, solved: report.solved, checks: c.solverChecks, dfs: d };
  });

  let rederived = null;
  run('engine.s2-rederivation', 'S2 re-derives removed cells; the ordinal equals an independent full solve', function () {
    const w = world();
    const givens = puzzleOf();
    const tried = [];
    for (let i = 0; i < w.groups.length && rederived === null; i++) {
      const g = w.groups[i];
      if (!Array.from(g).every(function (c) { return givens[c] !== 0; })) continue;
      const weak = Int32Array.from(givens);
      g.forEach(function (c) { weak[c] = 0; });
      rt.reset();
      rt.setPurpose('floor');
      rt.armS2(g, w.solution);
      let outcome = 'stuck';
      let ordinal = null;
      try {
        const rep = SG.logicalSolver.solve(w.model, weak, { allowedTechniques: singles, collectSteps: false,
          assumeUniqueness: false, budget: PASS });
        outcome = rep.status;
      } catch (err) {
        if (err instanceof rt.Rederived) {
          outcome = 'rederived';
          ordinal = err.info.ordinal;
        } else {
          throw err;
        }
      } finally {
        rt.disarmS2();
      }
      tried.push(outcome);
      if (outcome === 'rederived') rederived = { group: i, weak: weak, ordinal: ordinal, givens: givens };
    }
    if (rederived === null) throw new Error('no group of a 40-clue puzzle was re-derived by singles: ' + tried.join(','));
    const full = SG.logicalSolver.solve(w.model, rederived.weak, { allowedTechniques: singles, collectSteps: true,
      assumeUniqueness: false, budget: PASS });
    const group = new Set(Array.from(w.groups[rederived.group]));
    let at = null;
    for (let i = 0; i < full.steps.length && at === null; i++) {
      (full.steps[i].placements || []).forEach(function (p) {
        if (group.has(p[0])) {
          if (p[1] !== w.solution[p[0]]) throw new Error('an independent solve placed a wrong value');
          group.delete(p[0]);
        }
      });
      if (group.size === 0) at = i + 1;
    }
    if (at !== rederived.ordinal) throw new Error('the ordinal ' + rederived.ordinal + ' differs from the independent ' + at);
    if (!(full.steps.length >= at)) throw new Error('the full solve is shorter than the re-derivation');
    rt.reset();
    return { tried: tried.length, ordinal: at, fullSteps: full.steps.length, fullStatus: full.status };
  });

  run('engine.s2-wrong-value', 'an S2 session with a wrong expected value stops with an unsound deduction', function () {
    const w = world();
    if (rederived === null) throw new Error('no re-derivable group to corrupt');
    const g = w.groups[rederived.group];
    const wrong = Int32Array.from(w.solution);
    wrong[g[0]] = wrong[g[0]] === 1 ? 2 : 1;
    rt.reset();
    rt.setPurpose('floor');
    rt.armS2(g, wrong);
    let seen = null;
    try {
      SG.logicalSolver.solve(w.model, rederived.weak, { allowedTechniques: singles, collectSteps: false, assumeUniqueness: false,
        budget: PASS });
    } catch (err) {
      seen = err;
    } finally {
      rt.disarmS2();
    }
    rt.reset();
    if (!(seen instanceof rt.Unsound)) throw new Error('expected Unsound, got ' + (seen && seen.name));
    return { info: seen.info };
  });

  run('engine.no-uniqueness-in-phase-a', 'a uniqueness-assuming finder is excluded when uniqueness is not assumed', function () {
    const w = world();
    const givens = puzzleOf();
    const ur = SG.techniques.get('uniqueRectangle');
    if (ur.assumesUniqueness !== true) throw new Error('uniqueRectangle no longer assumes uniqueness: stop for the author');
    const rep = SG.logicalSolver.solve(w.model, givens, { allowedTechniques: ['uniqueRectangle'], collectSteps: false,
      assumeUniqueness: false, budget: PASS });
    if (Object.keys(rep.techniqueCounts).length !== 0 || rep.status !== 'stuck') throw new Error('the finder ran: ' + JSON.stringify(rep.techniqueCounts));
    const sets = F.floorSets(SG, w.spec);
    if (sets.byName.cheap.effectiveIds.indexOf('uniqueRectangle') >= 0) throw new Error('effective cheap set holds it');
    rt.reset();
    return { cheap: sets.byName.cheap.ids.length, effective: sets.byName.cheap.effectiveIds.length };
  });

  const checkTrial = function (mode, out, testOnly) {
    const w = world();
    const t = out.trial;
    if (t.status !== 'complete') throw new Error(mode + ' status ' + t.status);
    if (t.counts.floorTests > 3 * w.groups.length) throw new Error('floor tests above 3G');
    const wire = out.wire;
    const fromWire = SG.pipeline.fromWire(wire);
    if (SG.dfs.countSolutions(fromWire.model, fromWire.givens, 2, null) !== 1) throw new Error(mode + ': the returned puzzle is not unique');
    const fresh = SG.difficulty.rate(fromWire.model, fromWire.givens, {});
    if (C.canonicalJson(fresh) !== C.canonicalJson(fromWire.rating)) throw new Error(mode + ': the canonical rating differs');
    const verdict = SG.difficulty.requiredOf(fresh, 'nightmare', fromWire.model);
    const exactNow = fresh.solved === true && fresh.level === 'nightmare' && verdict !== null && verdict.required === true;
    if (exactNow !== (wire.exact === true)) throw new Error(mode + ': the exact flag differs from an independent check');
    return { exact: exactNow, level: fresh.level, score: fresh.score, counts: t.counts, entries: t.frontier ? t.frontier.entries.length : null };
  };

  const audited = function (mode, out, seed) {
    const t = out.trial;
    if (!t.audit) return null;
    const a = F.auditS2(SG, { config: { variantId: 'classic9', difficulty: 'nightmare', seed: seed === undefined ? SEED : seed,
      trace: 'off', symmetry: 'rotational180', digOrder: 'random' }, solution: Array.from(out.wire.solution), audit: t.audit,
    checkLimit: 2000000 });
    if (a.correctnessProblems !== 0) throw new Error(mode + ': audit correctness problems ' + JSON.stringify(a.removals));
    if (!a.finalParent.hashMatches) throw new Error(mode + ': the audit rebuilt another final parent');
    return { accepted: a.acceptedRemovals, rederived: a.rederivedRemovals, audited: a.audited, disagreements: a.operationalDisagreements,
      ordinalMatches: a.removals.map(function (r) { return r.ordinalMatches; }) };
  };

  run('engine.trial-FC', 'FC (one cheap pass, S2) on classic9: counts, final parent, audit, restored state', function () {
    const w = world();
    const before = F.hashGivens(w.solution);
    const out = trialOf('FC');
    const detail = checkTrial('FC', out);
    if (out.trial.counts.ladderPasses !== 1) throw new Error('FC passes ' + out.trial.counts.ladderPasses);
    if (out.trial.frontier.rungs[0].id !== 'cheap') throw new Error('FC rung');
    const a = audited('FC', out);
    if (rt.s2 !== null || rt.limits !== null) throw new Error('the hooks were not restored');
    if (F.hashGivens(w.solution) !== before) throw new Error('the solution changed');
    return Object.assign({ audit: a }, detail);
  });

  ['F1', 'F0', 'FM', 'FU', 'FS'].forEach(function (mode) {
    run('engine.trial-' + mode, mode + ' on classic9 (K_F 1): complete, consistent, audited', function () {
      const out = trialOf(mode, { kF: 1 });
      const detail = checkTrial(mode, out);
      const t = out.trial;
      if (mode === 'F0' && t.frontier.s2.rederived !== 0) throw new Error('F0 re-derived');
      if (mode === 'F1' && t.counts.ladderPasses !== t.frontier.rungs.length) throw new Error('ladder passes');
      if (mode === 'FS' && !t.frontier.referenceChecks.every(function (r) { return r.equalsRecordedSnapshot === true; })) {
        throw new Error('FS did not use its snapshot');
      }
      if (mode === 'FU' && t.counts.fuFilterSolves > t.counts.phaseBTries) throw new Error('FU filter count');
      const a = audited(mode, out);
      return Object.assign({ audit: a }, detail);
    });
  });

  ['proposal-only', 'ordinary-only'].forEach(function (mode) {
    run('engine.native-' + mode, mode + ' on classic9: the native sample with its native caps, counted', function () {
      const out = trialOf(mode);
      const detail = checkTrial(mode, out);
      const t = out.trial;
      if (t.counts.floorTests !== null || t.limits !== null) throw new Error('a native arm has no frontier budget');
      if (!(t.counts.dfsChecks >= 0 && t.counts.solverChecks > 0)) throw new Error('native counters missing');
      return detail;
    });
  });

  // Phase B, the FU filter, the snapshot reference and deepen need a frontier: many cheap classic9 grids until each path ran.
  run('engine.phaseB-coverage', 'phase B, FU filter, FS snapshot and deepen on real classic9 grids: consistent, independently checked',
    function () {
      const seen = { seeds: 0, trials: 0, entries: 0, phaseBSolves: 0, fuFilterSolves: 0, fuFiltered: 0, snapshotChecks: 0,
        deepenRuns: 0, deepenCommitted: 0, exact: 0, shallow: 0, ambiguousAtReference: 0, kept: 0 };
      const full = function () {
        return seen.phaseBSolves > 0 && seen.fuFilterSolves > 0 && seen.snapshotChecks > 0 && seen.deepenRuns > 0;
      };
      const startMs = Date.now();
      for (let s = 0; s < 60 && !(full() && seen.seeds >= 6) && Date.now() - startMs < 12000; s++) {
        const seed = 9100 + s;
        seen.seeds++;
        ['F1', 'FU', 'FS'].forEach(function (mode) {
          const out = trialOf(mode, null, seed);
          checkTrial(mode, out);
          audited(mode, out, seed);
          const t = out.trial;
          seen.trials++;
          seen.entries += t.frontier.entries.length;
          seen.phaseBSolves += t.counts.phaseBSolves;
          seen.fuFilterSolves += t.counts.fuFilterSolves;
          seen.snapshotChecks += mode === 'FS' ? t.frontier.referenceChecks.length : 0;
          seen.deepenRuns += t.frontier.deepen.runs.length;
          seen.deepenCommitted += t.frontier.deepen.runs.reduce(function (n, r) { return n + r.committed; }, 0);
          if (t.best && t.best.exact) seen.exact++;
          t.frontier.phaseB.forEach(function (row) {
            if (row.outcome === 'shallow') seen.shallow++;
            if (row.outcome === 'ambiguous-at-reference') seen.ambiguousAtReference++;
            if (row.outcome === 'fu-filtered-shallow') seen.fuFiltered++;
            if (row.kept) seen.kept++;
          });
          if (mode === 'FS' && !t.frontier.referenceChecks.every(function (r) { return r.equalsRecordedSnapshot === true; })) {
            throw new Error('FS did not use its snapshot (seed ' + seed + ')');
          }
          if (rt.s2 !== null || rt.limits !== null) throw new Error('the hooks were not restored');
        });
      }
      seen.coverage = full() ? 'all paths ran' : 'some paths never ran on these grids';
      return seen;
    });

  run('engine.budget-stops', 'a tiny limit per dimension stops explicitly and restores the hooks', function () {
    const w = world();
    const out = {};
    const probe = trialOf('FC');
    const hasEntries = probe.trial.counts.phaseBSolves > 0;
    const dims = [['canonicalRatings', 0], ['floorTests', 2], ['floorDeductions', 3], ['solverChecks', 10], ['dfsChecks', 1],
      ['dfsEntries', 0], ['ladderPasses', 0]];
    if (hasEntries) dims.push(['phaseBSolves', 0]);
    dims.forEach(function (d) {
      const limits = {};
      limits[d[0]] = d[1];
      const r = trialOf('FC', { limits: limits });
      if (r.trial.status !== 'sample-budget') throw new Error(d[0] + ': status ' + r.trial.status);
      if (!r.trial.budgetStop || r.trial.budgetStop.dimension !== d[0]) throw new Error(d[0] + ': stop ' + JSON.stringify(r.trial.budgetStop));
      if (rt.s2 !== null || rt.limits !== null) throw new Error(d[0] + ': hooks not restored');
      out[d[0]] = r.trial.budgetStop.atPhase;
    });
    if (F.hashGivens(w.solution) !== F.hashGivens(world().solution)) throw new Error('the solution changed');
    return { stoppedIn: out, phaseBChecked: hasEntries };
  });

  results.push({ id: 'engine.suite', group: 'engine', ok: results.every(function (r) { return r.ok; }),
    title: 'the engine suite finished', ms: Date.now() - started, detail: { cases: results.length } });
  return results;
}

// --- the host-side executor on a scripted fake worker (no engine) ---------------------------------------------------------------------

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

function fakeWire() {
  return { v: 1, model: { variantId: 'mega16', cellCount: 4, digits: 4, units: [], unitMeta: [], cages: [], inequalities: [],
    layout: {}, symbols: {}, fixedCells: [] }, givens: [1, 0, 0, 4], solution: [1, 2, 3, 4], rating: { level: 'nightmare',
    score: 1700, solved: true }, exact: true, seed: 11, config: { variantId: 'mega16', difficulty: 'nightmare', seed: 11 },
  timings: {}, attempts: 1, warnings: [], digLog: [], work: [{ ratings: 3, proposals: 0, maxRatings: 1024, maxProposals: 32768,
    localSearches: [] }] };
}

function fakeTrialPayload(status) {
  const info = { groups: 128, cells: 256, digits: 16, gridHash: 'h', nativeConstants: { CAP_RATINGS: 1024,
    CAP_PROPOSALS: 32768, OBJECTIVE_STEPS: 100000, UNIQUE_NODES: 200000 } };
  return Object.assign({ mode: 'F1', kind: 'frontier', cell: 'mega16', seed: 11, forkLabels: ['model', 'grid#1', 'dig#1.1'],
    status: status, budgetStop: status === 'sample-budget' ? { dimension: 'floorDeductions', limit: 5, used: 6, phase: 'floor',
      atPhase: 'phaseA' } : null, limits: { floorTests: 384 }, ceilings: { floorTests: 384 }, limitOrigin: 'pilot ceilings',
  counts: { floorTests: 50, floorDeductions: 900, solverChecks: 4000, dfsEntries: 12, dfsChecks: 300, ladderPasses: 3,
    phaseBSolves: 2, deepenProposals: 0, verificationSolves: 4, canonicalRatings: 4, phaseBTries: 3, fuFilterSolves: 0 },
  frontier: { rungs: [{ id: 'cheap', ids: ['nakedSingle'], effectiveIds: ['nakedSingle'] }], entries: [], passes: [] },
  best: { source: 'phaseB', exact: true, quality: 0, uniqueness: 'dfs-count', level: 'nightmare', score: 1700 },
  fallback: { level: 'veryEasy', score: 0 }, engine: {}, enginePurposes: {}, engineMs: 12, gridBuild: { wallMs: 5 },
  performanceScope: 'minimal S2 early-exit prototype', audit: { removals: [], rungSets: [['nakedSingle']], rungIds: ['cheap'],
    fullFloorIds: ['nakedSingle'], selected: [], finalParentHash: 'x' } }, info);
}

add('host.trial-executor', 'host', 'the trial executor, record and audit plumbing on a scripted fake worker (no engine)', async function () {
  const H = require('./host.cjs');
  const IG04 = require('./ig04-run.cjs');
  const RUN = require('./run.cjs');
  const M = require('./manifest.cjs');
  const manifest = M.buildManifest('IG-S04', 'provisional-r1');
  const job = manifest.jobs.find(function (j) { return j.key.endsWith('mega16:nightmare:11/F1'); });
  const catalogue = { snapshot: { floors: { mega16: { nightmare: { floor: ['nakedSingle'], tier: ['nishio'] } } } } };
  const io = { repoRoot: C.DEFAULT_REPO_ROOT, attemptDir: null, catalogue: catalogue, evidenceRoot: null };
  const seen = [];
  const mk = function (status, guards) {
    const script = { onJob: function (w, j) {
      seen.push(j.kind);
      if (j.kind === 'ig04-trial') {
        const info = fakeTrialPayload(status);
        w.emit('message', { type: 'grid-built', wallMs: 5, counters: {}, stats: {}, info: { groups: info.groups,
          cells: info.cells, digits: info.digits, gridHash: info.gridHash, nativeConstants: info.nativeConstants } });
        w.emit('message', { type: 'progress', phase: 'rung-start', floorTests: 0, ladderPasses: 1, removals: 0, entries: 0,
          phaseBSolves: 0, canonicalRatings: 1, counters: {}, rung: 'cheap' });
        if (status === 'hang') return;
        if (status === 'fatal') {
          w.emit('message', { type: 'fatal', error: { code: 'capability-missing', name: null, message: 'no hooks' } });
          return;
        }
        w.emit('message', { type: 'decision', wire: fakeWire(), engineElapsedMs: 7, trial: info });
      } else if (j.kind === 'ig04-audit') {
        w.emit('message', { type: 'audit-result', audit: { acceptedRemovals: 3, rederivedRemovals: 2, audited: 2, removals: [],
          finalParent: { hashMatches: true }, operationalDisagreements: 0, correctnessProblems: 0 } });
      }
    } };
    return new H.Host({ repoRoot: C.DEFAULT_REPO_ROOT, workerFactory: fakeWorkerFactory(script), testOnly: true,
      guards: Object.assign({}, C.GUARDS, guards || {}) });
  };

  // a decided trial: grid-build marks, progress, the audit after the timed interval, a well-formed record
  const host1 = mk('complete');
  const obs1 = await IG04.execute({ host: host1, job: job, catalogue: null, readyCheck: null });
  equal(obs1.outcome, 'complete', 'decided');
  check(typeof obs1.generation.gridBuildWallMs === 'number' && obs1.generation.gridBuildWallMs >= 0, 'grid build wall');
  check(typeof obs1.generation.readyOccupiedWallMs === 'number', 'the primary interval is ready to cleanup');
  equal(obs1.progress.length, 1, 'progress kept');
  equal(obs1.audit.status, 'audited', 'the S2 audit ran after the trial');
  equal(seen.filter(function (k) { return k === 'ig04-audit'; }).length, 1, 'one audit job');
  const rec1 = RUN.recordOfRequest(job, obs1, null, { deadlineMs: 270000 });
  IG04.augmentRecord(rec1, job, obs1, io);
  equal(R.checkRecord(rec1), [], 'a well-formed record');
  equal(rec1.counts.floorTests, 50, 'counts reach the record');
  equal(rec1.sampleMode, 'frontier', 'sample mode');
  equal(rec1.parentMode, 'final', 'parent mode');
  equal(rec1.groupCount, 128, 'geometry');
  equal(rec1.tierIds, ['nishio'], 'tier ids from the catalogue');
  equal(rec1.s2Audit.acceptedRemovals, 3, 'audit in the record');
  equal(rec1.attempt + '/' + rec1.sample, '1/1', 'attempt 1 sample 1');

  // a trial the guard cuts: the progress it had posted stays, never a result
  const host2 = mk('hang', { sampleMs: 300 });
  const obs2 = await IG04.execute({ host: host2, job: job, catalogue: null, readyCheck: null });
  equal(obs2.outcome, 'request-timeout', 'timeout');
  equal(obs2.timeoutScope, 'sample', 'scope');
  check(obs2.progress.length === 1 && obs2.gridInfo !== null, 'progress and geometry kept');
  const rec2 = RUN.recordOfRequest(job, obs2, null, { deadlineMs: 270000 });
  IG04.augmentRecord(rec2, job, obs2, io);
  equal(R.checkRecord(rec2), [], 'a censored record is well formed');
  equal(rec2.censoredProgress.floorTests, 0, 'the last progress is the censored work');
  equal(rec2.groupCount, 128, 'geometry survives a censored trial');
  equal(rec2.counts.floorTests, null, 'unknown counts stay null, never zero');

  // a budget stop: its own outcome, not a hit, not an error
  const host3 = mk('sample-budget');
  const obs3 = await IG04.execute({ host: host3, job: job, catalogue: null, readyCheck: null });
  equal(obs3.outcome, 'sample-budget', 'distinct outcome');
  const rec3 = RUN.recordOfRequest(job, obs3, null, { deadlineMs: 270000 });
  IG04.augmentRecord(rec3, job, obs3, io);
  equal(R.checkRecord(rec3), [], 'well formed');
  equal(rec3.verifiedExact, null, 'never an exact hit');
  equal(rec3.budgetStop.dimension, 'floorDeductions', 'the stop is recorded');

  // an unsupported worker stops the command: fatal, not a silent skip
  const host4 = mk('fatal');
  const obs4 = await IG04.execute({ host: host4, job: job, catalogue: null, readyCheck: null });
  equal(obs4.fatal, 'capability-missing', 'fatal code');
});

add('host.identity', 'host', 'a cluster whose modes disagree on the grid is an identity failure', function () {
  const IG04 = require('./ig04-run.cjs');
  const rows = [{ outcome: 'complete', gridHash: 'a', gridCluster: 'mega16:11' }, { outcome: 'complete', gridHash: 'a', gridCluster: 'mega16:11' },
    { outcome: 'complete', gridHash: 'b', gridCluster: 'samurai:11' }, { outcome: 'complete', gridHash: 'c', gridCluster: 'samurai:11' },
    { outcome: 'unstarted', gridHash: null, gridCluster: 'classic9:11' }];
  const out = IG04.identity(rows);
  equal([out.ok, out.failed], [1, 1], 'one cluster agrees, one differs; an unstarted row is not compared');
});

// --- the runner --------------------------------------------------------------------------------------------------------------------

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

module.exports = { registry, runPure, engineSynthetic, makeWorld, fakeRng };

if (require.main === module) {
  runPure().then(function (out) {
    out.results.forEach(function (r) {
      process.stdout.write((r.ok ? 'ok   ' : 'FAIL ') + r.id + ' (' + r.ms + ' ms)' + (r.ok ? '' : '\n     ' + r.detail.error) + '\n');
    });
    process.stdout.write(out.results.filter(function (r) { return r.ok; }).length + '/' + out.results.length + ' passed\n');
    process.exitCode = out.ok ? 0 : 1;
  });
}
