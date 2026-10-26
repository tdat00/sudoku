/**
 * Depth-first solver that finds and counts solutions. Branches on the cell with the fewest candidates (MRV)
 * and propagates after every guess with `SG.constraints`, so it works for every variant and constraint
 * extension. Search positions live in a pool of preallocated states, one per depth, owned by the model; a
 * branch copies its parent with `TypedArray.set`. The pool is shared by all calls for one model, so the
 * functions are not re-entrant for the same model (nothing here calls back into user code).
 *
 * `search` and `stillUnique` allocate nothing per node: depth states are created once (`ensureDepth`), the
 * value order is a per-depth `Int32Array`, the MRV loop uses `bits.popcount`, and the search path has no
 * try/catch, console call or `.slice()`. Keep it that way (`node tests/perf.js --alloc` measures it).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};
  const bits = SG.bits;

  const NO_BUDGET = { check: function () {}, tick: function () {} };

  const workspaces = new WeakMap();

  function createState(n) {
    return { candidates: new Int32Array(n), value: new Int32Array(n), unsolvedCount: 0 };
  }

  function getWorkspace(model) {
    let ws = workspaces.get(model);
    if (ws === undefined) {
      const n = model.cellCount;
      const unitFull = new Uint8Array(model.units.length);
      for (let u = 0; u < unitFull.length; u++) {
        const meta = model.unitMeta[u];
        unitFull[u] = model.units[u].length === model.digits && !(meta && meta.partial) ? 1 : 0;
      }
      ws = {
        model: model,
        n: n,
        digits: model.digits,
        fullMask: bits.full(model.digits),
        unitFull: unitFull,
        baseMask: new Int32Array(model.units.length),
        baseCand: new Int32Array(n),
        baseVal: new Int32Array(n),
        states: [createState(n)],
        orders: [new Int32Array(model.digits)],
        altValues: new Int32Array(model.digits),
        altScores: new Int32Array(model.digits),
        solution: new Int32Array(n),
        rng: null,
        budget: NO_BUDGET,
        limit: 1,
        found: 0,
        wantSolution: false,
        backtracks: 0,
        maxBacktracks: Infinity,
        aborted: false
      };
      workspaces.set(model, ws);
    }
    return ws;
  }

  function ensureDepth(ws, depth) {
    while (ws.states.length <= depth) {
      ws.states.push(createState(ws.n));
      ws.orders.push(new Int32Array(ws.digits));
    }
  }

  function begin(ws, limit, rng, budget, wantSolution) {
    ws.limit = limit;
    ws.rng = rng || null;
    ws.budget = budget || NO_BUDGET;
    ws.wantSolution = wantSolution;
    ws.found = 0;
    ws.backtracks = 0;
    ws.maxBacktracks = Infinity;
    ws.aborted = false;
  }

  function invalidGivens(reason, details) {
    return new SG.errors.GenerationError('dfs.invalidGivens', Object.assign({ reason: reason }, details));
  }

  function load(ws, givens) {
    const model = ws.model;
    const n = ws.n;
    if (!givens || givens.length !== n) {
      throw invalidGivens('length', { expected: n, actual: givens ? givens.length : -1 });
    }
    const st = ws.states[0];
    st.candidates.fill(ws.fullMask);
    st.value.fill(0);
    st.unsolvedCount = n;
    let ok = true;
    for (let c = 0; c < n; c++) {
      const g = givens[c];
      if (g === 0) continue;
      if (!(Number.isInteger(g) && g >= 1 && g <= ws.digits)) {
        throw invalidGivens('value', { cell: c, value: g });
      }
      if (ok && !SG.constraints.assign(model, st, c, g)) ok = false;
    }
    if (!ok) return false;
    return SG.constraints.propagate(model, st, ws.budget === NO_BUDGET ? null : ws.budget);
  }

  /**
   * Explores the (already propagated) position in `ws.states[depth]`; true when the search should stop
   * (enough solutions or `ws.aborted`).
   */
  function search(ws, depth) {
    const st = ws.states[depth];
    const val = st.value;
    if (st.unsolvedCount === 0) {
      ws.found++;
      if (ws.wantSolution && ws.found === 1) ws.solution.set(val);
      return ws.found >= ws.limit;
    }
    ws.budget.check();

    // MRV: after propagation every open cell has at least two candidates, so a pair cannot be beaten.
    const cand = st.candidates;
    const n = ws.n;
    let best = -1;
    let bestCount = 99;
    for (let c = 0; c < n; c++) {
      if (val[c] === 0) {
        const k = bits.popcount(cand[c]);
        if (k < bestCount) {
          bestCount = k;
          best = c;
          if (k <= 2) break;
        }
      }
    }

    const order = ws.orders[depth];
    let count = 0;
    let m = cand[best];
    while (m !== 0) {
      const low = m & -m;
      order[count++] = 32 - Math.clz32(low);
      m ^= low;
    }
    const rng = ws.rng;
    if (rng !== null) {
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        const tmp = order[i];
        order[i] = order[j];
        order[j] = tmp;
      }
    }

    ensureDepth(ws, depth + 1);
    const next = ws.states[depth + 1];
    const model = ws.model;
    const budget = ws.budget === NO_BUDGET ? null : ws.budget;
    for (let i = 0; i < count; i++) {
      next.candidates.set(cand);
      next.value.set(val);
      next.unsolvedCount = st.unsolvedCount;
      if (SG.constraints.place(model, next, best, order[i], budget) && search(ws, depth + 1)) return true;
      if (++ws.backtracks > ws.maxBacktracks) {
        ws.aborted = true;
        return true;
      }
    }
    return false;
  }

  /**
   * Finds one solution (random value order when `rng` is given, else ascending); null when the givens have
   * none. Throws 'dfs.invalidGivens' for a wrong length or value outside 1..D, and the budget's errors.
   */
  function solve(model, givens, rng, budget) {
    const ws = getWorkspace(model);
    begin(ws, 1, rng, budget, true);
    if (!load(ws, givens)) return null;
    search(ws, 0);
    return ws.found > 0 ? ws.solution.slice() : null;
  }

  /** Counts solutions, stopping at `limit` (default 2, i.e. "two or more"). */
  function countSolutions(model, givens, limit, budget) {
    const cap = limit === undefined ? 2 : limit;
    if (!(Number.isInteger(cap) && cap >= 1)) {
      throw new SG.errors.GenerationError('dfs.invalidLimit', { limit: String(limit) });
    }
    const ws = getWorkspace(model);
    begin(ws, cap, null, budget, false);
    if (!load(ws, givens)) return 0;
    search(ws, 0);
    return ws.found;
  }

  function checkGivens(ws, givens) {
    const n = ws.n;
    if (!givens || givens.length !== n) {
      throw invalidGivens('length', { expected: n, actual: givens ? givens.length : -1 });
    }
    const digits = ws.digits;
    for (let c = 0; c < n; c++) {
      const g = givens[c];
      if (g !== 0 && !(g >= 1 && g <= digits && g === (g | 0))) {
        throw invalidGivens('value', { cell: c, value: g });
      }
    }
  }

  /**
   * Records the givens (except the clue at `skip`) in `ws.baseVal` and the values used per unit in
   * `ws.baseMask`; false when two givens clash.
   */
  function buildMasks(ws, givens, skip) {
    const n = ws.n;
    const cellUnits = ws.model.cellUnits;
    const mask = ws.baseMask;
    const baseVal = ws.baseVal;
    mask.fill(0);
    for (let c = 0; c < n; c++) {
      const g = c === skip ? 0 : givens[c];
      baseVal[c] = g;
      if (g === 0) continue;
      const bit = 1 << (g - 1);
      const us = cellUnits[c];
      for (let i = 0; i < us.length; i++) {
        if ((mask[us[i]] & bit) !== 0) return false;
        mask[us[i]] |= bit;
      }
    }
    return true;
  }

  function baseCandidates(ws, cell) {
    const v = ws.baseVal[cell];
    if (v !== 0) return 1 << (v - 1);
    const us = ws.model.cellUnits[cell];
    let used = 0;
    for (let i = 0; i < us.length; i++) used |= ws.baseMask[us[i]];
    return ws.fullMask & ~used;
  }

  function completeBase(ws) {
    for (let c = 0; c < ws.n; c++) {
      const m = baseCandidates(ws, c);
      if (m === 0) return false;
      ws.baseCand[c] = m;
    }
    return true;
  }

  function isHiddenSingle(ws, cell, bit) {
    const model = ws.model;
    const us = model.cellUnits[cell];
    for (let k = 0; k < us.length; k++) {
      if (ws.unitFull[us[k]] === 0) continue;
      const cells = model.units[us[k]];
      let alone = true;
      for (let i = 0; i < cells.length; i++) {
        if (cells[i] !== cell && (baseCandidates(ws, cells[i]) & bit) !== 0) {
          alone = false;
          break;
        }
      }
      if (alone) return true;
    }
    return false;
  }

  /**
   * Unique-solution check after removing one clue. It propagates the puzzle without the clue once, then asks
   * for each alternative value w of the cell whether forcing cell = w leaves any solution; unique iff none
   * does.
   *
   * Cheap tests come first: if the cell is a naked single or a hidden single of the peer-consistent puzzle,
   * the clue was redundant and the answer is true at once (the common case early in digging). Only then is
   * the puzzle loaded from per-unit value masks and propagated, stopping as soon as the cell is decided.
   *
   * Precondition: the puzzle that still has the clue (cell = trueValue) has exactly one solution; the cheap
   * tests rely on it and do not look for clashes elsewhere. `givens` may or may not contain the clue at
   * `cell`.
   */
  function stillUnique(model, givens, cell, trueValue, budget) {
    const ws = getWorkspace(model);
    begin(ws, 1, null, budget, false);
    checkGivens(ws, givens);

    const trueBit = 1 << (trueValue - 1);
    const peers = model.peers[cell];
    let used = 0;
    for (let i = 0; i < peers.length; i++) {
      const g = givens[peers[i]];
      if (g !== 0) used |= 1 << (g - 1);
    }
    const nakedMask = ws.fullMask & ~used;
    if ((nakedMask & trueBit) === 0) return false;
    if (nakedMask === trueBit) return true;

    if (!buildMasks(ws, givens, cell)) return false;
    if (isHiddenSingle(ws, cell, trueBit)) return true;
    if (!completeBase(ws)) return false;

    ensureDepth(ws, 1);
    const root0 = ws.states[0];
    root0.candidates.set(ws.baseCand);
    root0.value.set(ws.baseVal);
    let open = 0;
    for (let c = 0; c < ws.n; c++) if (ws.baseVal[c] === 0) open++;
    root0.unsolvedCount = open;
    const searchBudget = ws.budget === NO_BUDGET ? null : ws.budget;
    // Propagation may stop early once the cell is known: one candidate left means the clue was redundant.
    if (!SG.constraints.propagateSwept(model, root0, searchBudget, cell)) return false;

    const cm = root0.candidates[cell];
    if ((cm & trueBit) === 0) return false;
    if (cm === trueBit) return true;
    // Order the alternatives by support: how many peers could still take the value (fewest first).
    const values = ws.altValues;
    const scores = ws.altScores;
    let count = 0;
    let rest = cm & ~trueBit;
    while (rest !== 0) {
      const low = rest & -rest;
      const w = 32 - Math.clz32(low);
      let support = 0;
      for (let i = 0; i < peers.length; i++) {
        if ((root0.candidates[peers[i]] & low) !== 0) support++;
      }
      let slot = count++;
      while (slot > 0 && scores[slot - 1] > support) {
        scores[slot] = scores[slot - 1];
        values[slot] = values[slot - 1];
        slot--;
      }
      scores[slot] = support;
      values[slot] = w;
      rest ^= low;
    }

    const branch = ws.states[1];
    for (let i = 0; i < count; i++) {
      branch.candidates.set(root0.candidates);
      branch.value.set(root0.value);
      branch.unsolvedCount = root0.unsolvedCount;
      if (SG.constraints.place(model, branch, cell, values[i], searchBudget)) {
        search(ws, 1);
        if (ws.found > 0) return false;
      }
    }
    return true;
  }

  /**
   * A bounded or randomised completion of an already propagated state (tests use it for random solved grids);
   * `state` is copied, not modified.
   */
  function searchFrom(model, state, options) {
    options = options || {};
    const ws = getWorkspace(model);
    begin(ws, options.limit === undefined ? 1 : options.limit, options.rng, options.budget, true);
    if (options.maxBacktracks !== undefined) ws.maxBacktracks = options.maxBacktracks;
    const st = ws.states[0];
    st.candidates.set(state.candidates);
    st.value.set(state.value);
    st.unsolvedCount = state.unsolvedCount;
    search(ws, 0);
    return {
      found: ws.found,
      solution: ws.found > 0 ? ws.solution.slice() : null,
      backtracks: ws.backtracks,
      aborted: ws.aborted
    };
  }

  SG.dfs = {
    solve: solve,
    countSolutions: countSolutions,
    stillUnique: stillUnique,
    searchFrom: searchFrom
  };
})(typeof self !== 'undefined' ? self : globalThis);
