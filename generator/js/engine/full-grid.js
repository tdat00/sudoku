/**
 * Full grid generation: randomised DFS (`SG.dfs.searchFrom`) with MRV branching and propagation, inside a Las
 * Vegas restart: after `restartThreshold` failed guesses the attempt is dropped and a new one starts from a
 * child rng stream (one unlucky early guess can trap plain DFS on large or overlapping boards).
 * A variant may register `fastSeed(model, state, rng)` and `restartThreshold` in `SG.variants`; they are used
 * unless the caller passes the option explicitly.
 * Events: with `options.emit` at verbosity 'full', `searchTraced` runs instead of the plain search. It is a
 * line-for-line copy that draws the same random numbers in the same order (tests assert the same grid) and
 * reports every placement, conflict, backtrack and restart as delta patches of at most 8 cells.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Failed guesses allowed per cell and attempt before a restart.
  const RESTART_FACTOR = 50;

  // Restarts before the last attempt runs without a backtrack limit.
  const DEFAULT_MAX_RESTARTS = 50;

  const pools = new WeakMap();

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  function variantDef(model) {
    return SG.variants && SG.variants.has(model.variantId) ? SG.variants.get(model.variantId) : null;
  }

  function variantFastSeed(model) {
    const def = variantDef(model);
    return def !== null && typeof def.fastSeed === 'function' ? def.fastSeed : null;
  }

  function variantRestartThreshold(model) {
    const def = variantDef(model);
    return def !== null && Number.isInteger(def.restartThreshold) && def.restartThreshold >= 1
      ? def.restartThreshold : null;
  }

  function createGridTracer(em, placedAtStart) {
    let placed = placedAtStart;
    let backtracks = 0;

    function metrics() {
      return { placed: placed, backtracks: backtracks };
    }

    return {
      place: function place(depth, guess, value, cells, k, values) {
        const changes = new Array(k);
        for (let j = 0; j < k; j++) changes[j] = { i: cells[j], value: values[cells[j]], state: 'placed' };
        placed += k;
        em.microChunks('fullGrid', 'fullGrid.place',
          { cell: guess, value: value, depth: depth, forced: k - 1 }, changes, metrics());
      },
      conflict: function conflict(depth, guess, value) {
        backtracks++;
        em.micro('fullGrid', 'fullGrid.conflict', { cell: guess, value: value, depth: depth },
          { cells: [{ i: guess, value: 0, state: 'backtracked' }] }, metrics());
      },
      backtrack: function backtrack(depth, guess, value, cells, k) {
        const changes = new Array(k);
        for (let j = 0; j < k; j++) changes[j] = { i: cells[j], value: 0, state: 'backtracked' };
        placed -= k;
        backtracks++;
        em.microChunks('fullGrid', 'fullGrid.backtrack',
          { cell: guess, value: value, depth: depth, cleared: k }, changes, metrics());
      }
    };
  }

  // The search of `SG.dfs.searchFrom` (limit 1) with `tr` called at every move. Must stay in step with it:
  // same branching cell, candidate order, random draws and backtrack count. `state` is left untouched. Not
  // re-entrant for one model (one buffer pool per model, like the DFS).
  function searchTraced(model, state, options, tr) {
    const n = model.cellCount;
    const digits = model.digits;
    const popcount = SG.bits.popcount;
    const rng = options.rng || null;
    const budget = options.budget || null;
    const maxBacktracks = options.maxBacktracks === undefined ? Infinity : options.maxBacktracks;
    let pool = pools.get(model);
    if (pool === undefined) {
      pool = { states: [], orders: [], placedCells: [] };
      pools.set(model, pool);
    }
    const states = pool.states;
    const orders = pool.orders;
    const placedCells = pool.placedCells;
    let backtracks = 0;
    let aborted = false;
    let solution = null;

    function ensureDepth(depth) {
      while (states.length <= depth) {
        states.push({ candidates: new Int32Array(n), value: new Int32Array(n), unsolvedCount: 0 });
        orders.push(new Int32Array(digits));
        placedCells.push(new Int32Array(n));
      }
    }

    ensureDepth(0);
    states[0].candidates.set(state.candidates);
    states[0].value.set(state.value);
    states[0].unsolvedCount = state.unsolvedCount;

    function search(depth) {
      const st = states[depth];
      const val = st.value;
      if (st.unsolvedCount === 0) {
        solution = val.slice();
        return true;
      }
      if (budget !== null) budget.check();

      const cand = st.candidates;
      let best = -1;
      let bestCount = 99;
      for (let c = 0; c < n; c++) {
        if (val[c] === 0) {
          const k = popcount(cand[c]);
          if (k < bestCount) {
            bestCount = k;
            best = c;
            if (k <= 2) break;
          }
        }
      }

      const order = orders[depth];
      let count = 0;
      let m = cand[best];
      while (m !== 0) {
        const low = m & -m;
        order[count++] = 32 - Math.clz32(low);
        m ^= low;
      }
      if (rng !== null) {
        for (let i = count - 1; i > 0; i--) {
          const j = Math.floor(rng.next() * (i + 1));
          const tmp = order[i];
          order[i] = order[j];
          order[j] = tmp;
        }
      }

      ensureDepth(depth + 1);
      const next = states[depth + 1];
      const cells = placedCells[depth + 1];
      for (let i = 0; i < count; i++) {
        next.candidates.set(cand);
        next.value.set(val);
        next.unsolvedCount = st.unsolvedCount;
        const value = order[i];
        if (SG.constraints.place(model, next, best, value, budget)) {
          // The cells this guess filled: the guess itself first, then what propagation forced.
          const after = next.value;
          let k = 1;
          cells[0] = best;
          if (st.unsolvedCount - next.unsolvedCount > 1) {
            for (let c = 0; c < n; c++) if (after[c] !== 0 && val[c] === 0 && c !== best) cells[k++] = c;
          }
          tr.place(depth, best, value, cells, k, after);
          if (search(depth + 1)) return true;
          tr.backtrack(depth, best, value, cells, k);
        } else {
          tr.conflict(depth, best, value);
        }
        if (++backtracks > maxBacktracks) {
          aborted = true;
          return true;
        }
      }
      return false;
    }

    search(0);
    return { found: solution !== null ? 1 : 0, solution: solution, backtracks: backtracks, aborted: aborted };
  }

  // Generates a complete valid grid (Int32Array, values 1..D). Cells in `fixedCells` (option, else
  // model.fixedCells; 0 = free) are forced first. Same model, seed and options give the same grid, whatever
  // `emit` does. Options: fastSeed (use the variant hook, default true), restartThreshold (default: the
  // variant's, else cellCount * 50), maxRestarts (default 50, then the last attempt runs unlimited),
  // fixedCells, stats ({ attempts, restarts, backtracks, fastSeed }), emit, stepEvents (false when the
  // pipeline emits the 'fullGrid' step events itself), where ({ attempt, maxAttempts }).
  // Throws 'fullGrid.invalidFixedCells', 'fullGrid.unsatisfiable' or a budget error.
  function generate(model, rng, budget, options) {
    options = options || {};
    rng = rng || SG.rng.create();
    const n = model.cellCount;
    const em = SG.events.toEmitter(options.emit);
    const tracing = em.wantsMicro;
    if (options.stepEvents !== false) {
      const where = options.where || {};
      em.step('fullGrid', 'start', 'fullGrid.start',
        { attempt: where.attempt || 1, maxAttempts: where.maxAttempts || 1 });
    }
    const fixed = options.fixedCells || model.fixedCells;
    let threshold = options.restartThreshold;
    if (threshold === undefined) {
      const declared = variantRestartThreshold(model);
      threshold = declared !== null ? declared : n * RESTART_FACTOR;
    }
    const maxRestarts = options.maxRestarts !== undefined ? options.maxRestarts : DEFAULT_MAX_RESTARTS;
    const stats = options.stats || {};
    let fastSeed = options.fastSeed === false ? null : variantFastSeed(model);

    if (fixed.length !== n) throw fail('fullGrid.invalidFixedCells', { cell: -1, value: fixed.length });
    const base = SG.model.initState(model);
    let anyFixed = false;
    for (let c = 0; c < n; c++) {
      const v = fixed[c];
      if (v === 0) continue;
      anyFixed = true;
      const valid = Number.isInteger(v) && v >= 1 && v <= model.digits;
      if (!valid || !SG.constraints.assign(model, base, c, v)) {
        throw fail('fullGrid.invalidFixedCells', { cell: c, value: v });
      }
    }
    if (!SG.constraints.propagate(model, base, budget)) {
      throw anyFixed ? fail('fullGrid.invalidFixedCells', { cell: -1, value: 0 })
        : fail('fullGrid.unsatisfiable', { variantId: model.variantId });
    }

    const work = SG.model.cloneState(base);
    const snapshot = fastSeed !== null ? SG.model.cloneState(base) : null;
    stats.attempts = 0;
    stats.restarts = 0;
    stats.backtracks = 0;
    stats.fastSeed = false;

    // The replayed board starts empty (a later attempt of the pipeline finds the leftovers of the last grid).
    if (tracing) {
      em.bindBoard(n);
      em.clearBoard('fullGrid', 'fullGrid.clear', {});
      em.syncBoard('fullGrid', 'fullGrid.fixed', {}, base.value);
    }

    for (let attempt = 0; ; attempt++) {
      const unlimited = attempt >= maxRestarts;
      const attemptRng = rng.fork('attempt#' + attempt);
      SG.model.cloneState(base, work);

      let seeded = false;
      if (fastSeed !== null) {
        seeded = fastSeed(model, work, attemptRng) && SG.constraints.propagate(model, work, budget);
        if (!seeded) SG.model.cloneState(snapshot, work);
      }
      if (tracing && seeded) em.syncBoard('fullGrid', 'fullGrid.seed', {}, work.value);

      const searchOptions = {
        rng: attemptRng,
        budget: budget,
        limit: 1,
        maxBacktracks: unlimited ? Infinity : threshold
      };
      const result = tracing
        ? searchTraced(model, work, searchOptions, createGridTracer(em, n - work.unsolvedCount))
        : SG.dfs.searchFrom(model, work, searchOptions);
      stats.attempts++;
      stats.backtracks += result.backtracks;

      if (result.found > 0) {
        stats.fastSeed = seeded;
        if (options.stepEvents !== false) {
          em.step('fullGrid', 'end', 'fullGrid.end', undefined,
            { placed: n, backtracks: stats.backtracks, restarts: stats.restarts });
        }
        return result.solution;
      }
      if (result.aborted) {
        stats.restarts++;
        if (tracing) {
          em.syncBoard('fullGrid', 'fullGrid.restart',
            { restart: stats.restarts, backtracks: result.backtracks, limit: threshold }, base.value);
        }
        continue;
      }
      // The search space is exhausted without a solution. A pre-fill may be the cause, so retry once without.
      if (seeded) {
        fastSeed = null;
        if (tracing) {
          em.syncBoard('fullGrid', 'fullGrid.restart',
            { restart: stats.restarts, backtracks: result.backtracks, limit: threshold }, base.value);
        }
        continue;
      }
      throw fail('fullGrid.unsatisfiable', { variantId: model.variantId });
    }
  }

  SG.fullGrid = { generate: generate };
})(typeof self !== 'undefined' ? self : globalThis);
