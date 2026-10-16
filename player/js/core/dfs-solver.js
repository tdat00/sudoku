/**
 * Depth-first solver that finds and counts solutions (design.md sections 6.4 and 6.5).
 *
 * The search branches on the cell with the fewest candidates (MRV) and propagates after every guess with
 * the shared engine in `SG.constraints`, so it works unchanged for every variant and for the registered
 * constraint extensions. Search positions live in a pool of preallocated states, one per depth, owned by
 * the model; a branch copies its parent with `TypedArray.set`, so a search allocates nothing per node.
 *
 * The pool is shared by all calls for one model, which makes the functions non re-entrant for the same
 * model; nothing in here calls back into user code, so that never matters in practice.
 *
 * Allocation review (task T-6.2, rules R1-R7 of design.md section 9.2): `search` and `stillUnique` allocate
 * nothing per node. The state of a depth is created the first time that depth is reached and then reused
 * (`ensureDepth`); a branch is a `TypedArray.set` of its parent, the value order is a per-depth `Int32Array`,
 * the MRV loop uses the branch-free `bits.popcount`, and there is no try/catch, console call or `.slice()`
 * on the search path (`solve` and `searchFrom` copy the solution once, when they return it). Measured with
 * a heap probe (`node tests/perf.js --alloc`; a plain 9x9 board, killer, greaterThan, samurai): under 50
 * bytes per call of `countSolutions` and 5 of `stillUnique`, which is the one-time depth buffers spread over
 * the calls.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};
  const bits = SG.bits;

  /** Stand-in used when the caller passes no budget, so the search loop never tests for null. */
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

  /**
   * Writes the givens into pool state 0 and propagates.
   * @returns {boolean} false when the givens already contradict each other.
   */
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
   * Explores the position in `ws.states[depth]` (already propagated). Returns true when the search should
   * stop: enough solutions were found, or the backtrack limit was hit (`ws.aborted`).
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
   * Finds one solution.
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} givens  One entry per cell, 0 for an empty cell.
   * @param {Rng} [rng]  When given, values are tried in random order (a random solution); else ascending.
   * @param {Object} [budget]
   * @returns {Int32Array|null} A complete assignment, or null when the givens have no solution.
   * @throws {SG.errors.GenerationError} 'dfs.invalidGivens' for a wrong length or a value outside 1..D,
   *         'budget.exceeded' / 'budget.cancelled' from the budget.
   */
  function solve(model, givens, rng, budget) {
    const ws = getWorkspace(model);
    begin(ws, 1, rng, budget, true);
    if (!load(ws, givens)) return null;
    search(ws, 0);
    return ws.found > 0 ? ws.solution.slice() : null;
  }

  /**
   * Counts solutions, stopping as soon as `limit` of them are found.
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} givens
   * @param {number} [limit=2]  With the default, 2 means "two or more".
   * @param {Object} [budget]
   * @returns {number} 0 .. limit
   */
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

  /** Rejects givens of the wrong length or with a value outside 1..D (0 marks an empty cell). */
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
   * Records the givens (the clue at `skip` ignored) in `ws.baseVal` and the values used in each unit in
   * `ws.baseMask`. One pass over the cells; no peer is touched.
   * @returns {boolean} false when two givens clash inside a unit.
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

  /** Candidates of a cell after peer elimination only: the values no given in its units uses. */
  function baseCandidates(ws, cell) {
    const v = ws.baseVal[cell];
    if (v !== 0) return 1 << (v - 1);
    const us = ws.model.cellUnits[cell];
    let used = 0;
    for (let i = 0; i < us.length; i++) used |= ws.baseMask[us[i]];
    return ws.fullMask & ~used;
  }

  /**
   * Second stage: fills `ws.baseCand` for every cell, which makes the base a peer-consistent state.
   * @returns {boolean} false when an open cell has no candidate left.
   */
  function completeBase(ws) {
    for (let c = 0; c < ws.n; c++) {
      const m = baseCandidates(ws, c);
      if (m === 0) return false;
      ws.baseCand[c] = m;
    }
    return true;
  }

  /** True when `bit` fits in no other cell of some complete unit of `cell`, so `cell` must take it. */
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
   * Unique-solution check after removing one clue (design.md section 6.5). Instead of re-solving the whole
   * puzzle, it propagates the puzzle without the clue once, and then asks for each alternative value w of
   * the cell whether forcing cell = w leaves any solution. The puzzle stays unique exactly when none does.
   *
   * It also skips work the general solver cannot skip. Cheap tests come first: if the removed cell is a
   * naked single (its peers' givens rule out every other value) or a hidden single of the peer-consistent
   * puzzle, the clue was redundant and the answer is true at once, with no propagation or search; that is
   * the common case early in digging. Only then is the puzzle loaded from per-unit value masks (instead of
   * one peer sweep per given) and propagated, and that propagation stops as soon as the cell is decided.
   * `solve` and `countSolutions` keep the plain loader because nothing about them is time critical.
   *
   * Precondition: the puzzle that still has the clue (cell = trueValue) has exactly one solution. The cheap
   * tests rely on it and do not look for clashes between givens elsewhere in the grid.
   * `givens` may or may not still contain the clue at `cell`; it is ignored either way.
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} givens
   * @param {number} cell
   * @param {number} trueValue  The value of the cell in the unique solution.
   * @param {Object} [budget]
   * @returns {boolean} true when the puzzle without the clue still has exactly one solution.
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
   * A bounded or randomised completion of an already propagated state (the tests use it for random solved
   * grids). Not part of the section 13.5 contract. The state is copied; `state` itself is left untouched.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {Object} [options]
   * @param {Rng} [options.rng]
   * @param {Object} [options.budget]
   * @param {number} [options.limit=1]            Stop after this many solutions.
   * @param {number} [options.maxBacktracks=Infinity]  Give up (aborted: true) after this many failed guesses.
   * @returns {{found: number, solution: Int32Array|null, backtracks: number, aborted: boolean}}
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
