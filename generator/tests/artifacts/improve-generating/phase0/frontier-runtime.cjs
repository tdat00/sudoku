'use strict';

/*
 * Engine-side runtime of the frontier prototype (IG-S04, test side, provisional (pre-freeze)). It is created inside a
 * worker's private engine instance by the adapter `frontier-hooks` (the factory is published on the worker's global when
 * the adapter module is loaded, so the transformed sources never need a `require`). Without it the patched code is the
 * native code: every addition is guarded by `SG.__igRt !== undefined`.
 *
 * What it does, and nothing else:
 *  - counts: logical solves, applied deductions (one per applied Finding), logical budget checks, DFS calls, DFS entries
 *    (a real `search(ws, depth)` entry, apart from the budget checks, which include propagation) and DFS checks, in total
 *    and per purpose (the frontier code names the purpose before each call: floor, fu, dfs, allowed, canonical, deepen);
 *  - the enforced fitted limits (floor deductions, logical checks, DFS entries, DFS checks): the first count that would
 *    exceed one throws a BudgetStop, which stays thrown at every later check (a swallowed stop resurfaces);
 *  - S2, the re-derivation early exit: while armed with the cells of a removed group and the true solution, every applied
 *    deduction checks whether each cell of the group holds its original value again. All of them (and the grid not yet
 *    complete): a `Rederived` signal with the deduction ordinal, never a forged solved report or rating. A cell that gets
 *    a different value is an unsound deduction (`Unsound`), a correctness stop;
 *  - the private exposure of the native helpers and constants of digger.js (`digger`), set by the digger transform.
 *
 * The solver, the DFS and the digger are the reference ones: the hooks only observe, and throw their own sentinel errors
 * (not GenerationErrors, so no native catch mistakes them for a native guard).
 */
const SB = require('./sample-budget.cjs');

const FLOOR_PURPOSES = Object.freeze(['floor', 'fu']);

class Rederived extends Error {
  constructor(info) {
    super('rederived');
    this.name = 'Rederived';
    this.code = 'ig.rederived';
    this.info = info;
  }
}

class Unsound extends Error {
  constructor(info) {
    super('unsound deduction: cell ' + info.cell + ' got ' + info.value + ', expected ' + info.expected);
    this.name = 'Unsound';
    this.code = 'ig.unsound';
    this.info = info;
  }
}

function zeroBucket() {
  return { solves: 0, deductions: 0, logicalChecks: 0, dfsCalls: 0, dfsEntries: 0, dfsChecks: 0 };
}

function copyBucket(b) {
  return Object.assign({}, b);
}

function addBucket(into, b) {
  Object.keys(b).forEach(function (k) { into[k] = (into[k] || 0) + b[k]; });
  return into;
}

function subBucket(after, before) {
  const out = {};
  Object.keys(after).forEach(function (k) { out[k] = after[k] - (before && before[k] ? before[k] : 0); });
  return out;
}

function create(SG, options) {
  const opts = options || {};
  const rt = {
    BudgetStop: SB.BudgetStop,
    Rederived: Rederived,
    Unsound: Unsound,
    totals: zeroBucket(),
    by: {},
    floorDeductions: 0,
    solveDeductions: 0,
    purpose: 'other',
    limits: null,
    stopped: null,
    s2: null,
    digger: null,
    clock: typeof opts.clock === 'function' ? opts.clock : null
  };

  function bucket() {
    let b = rt.by[rt.purpose];
    if (b === undefined) {
      b = zeroBucket();
      rt.by[rt.purpose] = b;
    }
    return b;
  }

  function stop(dimension, used) {
    const err = new SB.BudgetStop(dimension, rt.limits[dimension], used, rt.purpose);
    rt.stopped = err;
    throw err;
  }

  rt.reset = function reset() {
    rt.totals = zeroBucket();
    rt.by = {};
    rt.floorDeductions = 0;
    rt.solveDeductions = 0;
    rt.stopped = null;
    rt.s2 = null;
    rt.purpose = 'other';
  };

  rt.setLimits = function setLimits(limits) {
    rt.limits = limits === null || limits === undefined ? null : Object.assign({}, limits);
  };

  rt.setPurpose = function setPurpose(purpose) {
    const previous = rt.purpose;
    rt.purpose = purpose;
    return previous;
  };

  rt.armS2 = function armS2(cells, solution) {
    rt.s2 = { cells: Array.from(cells), solution: solution, hit: null };
  };

  rt.disarmS2 = function disarmS2() {
    const s = rt.s2;
    rt.s2 = null;
    return s;
  };

  rt.snapshot = function snapshot() {
    const by = {};
    Object.keys(rt.by).forEach(function (k) { by[k] = copyBucket(rt.by[k]); });
    return { totals: copyBucket(rt.totals), by: by, floorDeductions: rt.floorDeductions };
  };

  /** The counts between two snapshots (after - before), in total and per purpose. */
  rt.diff = function diff(after, before) {
    const by = {};
    Object.keys(after.by).forEach(function (k) {
      by[k] = subBucket(after.by[k], before.by[k]);
    });
    return { totals: subBucket(after.totals, before.totals), by: by,
      floorDeductions: after.floorDeductions - before.floorDeductions };
  };

  /** Hooks called by the patched engine ------------------------------------------------------------------------ */

  // logical-solver.js `solve`: one logical solve; its budget (when there is one) is wrapped so its checks are counted.
  rt.solveOptions = function solveOptions(options) {
    if (rt.stopped !== null) throw rt.stopped;
    rt.totals.solves++;
    bucket().solves++;
    rt.solveDeductions = 0;
    if (options && options.budget) {
      return Object.assign({}, options, { budget: rt.logicalBudget(options.budget) });
    }
    return options;
  };

  rt.logicalBudget = function logicalBudget(inner) {
    return {
      tick: function tick(n) { if (typeof inner.tick === 'function') inner.tick(n); },
      check: function check() {
        if (rt.stopped !== null) throw rt.stopped;
        rt.totals.logicalChecks++;
        bucket().logicalChecks++;
        if (rt.limits !== null && rt.totals.logicalChecks > rt.limits.solverChecks) {
          stop('solverChecks', rt.totals.logicalChecks);
        }
        inner.check();
      }
    };
  };

  // logical-solver.js `iterate`: after a Finding was applied (and before it is counted into the solve's own counts).
  rt.step = function step(model, state) {
    if (rt.stopped !== null) throw rt.stopped;
    rt.totals.deductions++;
    bucket().deductions++;
    rt.solveDeductions++;
    if (FLOOR_PURPOSES.indexOf(rt.purpose) >= 0) {
      rt.floorDeductions++;
      if (rt.limits !== null && rt.floorDeductions > rt.limits.floorDeductions) stop('floorDeductions', rt.floorDeductions);
    }
    const s = rt.s2;
    if (s === null || !(state.unsolvedCount > 0)) return;
    const value = state.value;
    let all = true;
    for (let i = 0; i < s.cells.length; i++) {
      const cell = s.cells[i];
      const v = value[cell];
      if (v === 0) all = false;
      else if (v !== s.solution[cell]) {
        throw new Unsound({ cell: cell, value: v, expected: s.solution[cell], ordinal: rt.solveDeductions });
      }
    }
    if (all) {
      s.hit = { ordinal: rt.solveDeductions };
      throw new Rederived(s.hit);
    }
  };

  // dfs-solver.js `begin`: one DFS call, and its budget (when there is one) is wrapped so its checks are counted.
  rt.dfsCall = function dfsCall() {
    rt.totals.dfsCalls++;
    bucket().dfsCalls++;
  };

  rt.dfsBudget = function dfsBudget(inner) {
    return {
      tick: function tick(n) { if (typeof inner.tick === 'function') inner.tick(n); },
      check: function check() {
        if (rt.stopped !== null) throw rt.stopped;
        rt.totals.dfsChecks++;
        bucket().dfsChecks++;
        if (rt.limits !== null && rt.totals.dfsChecks > rt.limits.dfsChecks) stop('dfsChecks', rt.totals.dfsChecks);
        inner.check();
      }
    };
  };

  // dfs-solver.js `search`: one real search entry (budget checks, which include propagation, are not entries).
  rt.dfsEntry = function dfsEntry() {
    if (rt.stopped !== null) throw rt.stopped;
    rt.totals.dfsEntries++;
    bucket().dfsEntries++;
    if (rt.limits !== null && rt.totals.dfsEntries > rt.limits.dfsEntries) stop('dfsEntries', rt.totals.dfsEntries);
  };

  /** The counters in the vocabulary of the record (floor-type deductions only for floorDeductions). */
  rt.countersOf = function countersOf(snapshotValue) {
    const s = snapshotValue || rt.snapshot();
    return {
      logicalSolves: s.totals.solves,
      deductions: s.totals.deductions,
      floorDeductions: s.floorDeductions,
      solverChecks: s.totals.logicalChecks,
      dfsCalls: s.totals.dfsCalls,
      dfsEntries: s.totals.dfsEntries,
      dfsChecks: s.totals.dfsChecks
    };
  };

  return rt;
}

module.exports = { create, Rederived, Unsound, FLOOR_PURPOSES, zeroBucket, addBucket, subBucket };
