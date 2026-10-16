/**
 * Full grid generation (design.md section 6.2): a randomised depth-first search with MRV branching and
 * constraint propagation, wrapped in a Las Vegas restart.
 *
 * The search itself is `SG.dfs.searchFrom`. When it needs more than `restartThreshold` failed guesses the
 * attempt is dropped and a new one starts from an independent child stream of the rng. This pays off on
 * large and overlapping boards, where one unlucky early guess can trap plain DFS for a very long time.
 *
 * Variant specific speed-ups are not special cased here: a variant may register `fastSeed(model, state,
 * rng)` and a `restartThreshold` in `SG.variants`, and this module simply uses them when the model's
 * variant has them (an explicit option of the caller wins over the variant's value).
 *
 * Events (design.md section 7): with `options.emit` the generator reports the step and, when the emitter
 * wants `micro` events (verbosity 'full'), every placement, conflict, backtrack and restart as delta patches
 * of at most 8 cells; applying them in order rebuilds the finished grid exactly. The plain search is
 * `SG.dfs.searchFrom`, which has no hooks. At 'off' and 'summary' (and without an emitter) that search runs
 * unchanged, so instrumentation costs nothing there. At 'full' the same search runs as `searchTraced`, a
 * line-for-line copy of `SG.dfs` search that draws the same random numbers in the same order and therefore
 * finds the same grid; the tests assert that.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  /** Failed guesses allowed per attempt, per cell, before the attempt is restarted. */
  const RESTART_FACTOR = 50;

  /** Restarted attempts before the final attempt runs without a backtrack limit. */
  const DEFAULT_MAX_RESTARTS = 50;

  /** Buffers of the traced search, one set per model. */
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

  /** The `restartThreshold` the variant declares, or null when it declares none (or an unusable one). */
  function variantRestartThreshold(model) {
    const def = variantDef(model);
    return def !== null && Number.isInteger(def.restartThreshold) && def.restartThreshold >= 1
      ? def.restartThreshold : null;
  }

  // ---------------------------------------------------------------------------------------------
  // Traced search (used only when the emitter wants micro events)
  // ---------------------------------------------------------------------------------------------

  /** Reports the moves of the search as `micro` events and keeps the counters of their metrics. */
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

  /**
   * The search of `SG.dfs.searchFrom` (limit 1) with calls to `tr` at every move. It must stay in step with
   * that search: the same branching cell, the same candidate order, the same random draws, the same
   * backtrack count. `state` itself is left untouched. Like the DFS, it keeps one pool of buffers per model
   * and is therefore not re-entrant for the same model.
   * @returns {{found: number, solution: ?Int32Array, backtracks: number, aborted: boolean}}
   */
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

  /**
   * Generates a complete, valid grid for the model.
   *
   * Cells listed in `fixedCells` (the option, or else `model.fixedCells`) are forced to their value first.
   * Same model, same rng seed and same options always give the same grid, whatever `emit` does.
   *
   * @param {PuzzleModel} model
   * @param {Rng} rng
   * @param {Object} [budget]
   * @param {Object} [options]
   * @param {boolean} [options.fastSeed=true]   Use the variant's `fastSeed` hook when it has one.
   * @param {number} [options.restartThreshold] Failed guesses per attempt. Default: the `restartThreshold`
   *        of the model's variant definition when it declares one (mega12 / mega16), else cellCount * 50.
   * @param {number} [options.maxRestarts=50]   Restarts before the last attempt runs unlimited.
   * @param {ArrayLike<number>} [options.fixedCells]  Overrides `model.fixedCells` (0 = free).
   * @param {Object} [options.stats]  Filled with { attempts, restarts, backtracks, fastSeed }.
   * @param {?(Emitter|function(Object): void)} [options.emit]  Receives the events, see the file header.
   * @param {boolean} [options.stepEvents=true]  Emit the 'fullGrid' step start and end events; the pipeline
   *        passes false because it emits them itself.
   * @param {{attempt: number, maxAttempts: number}} [options.where]  Goes into the step start event.
   * @returns {Int32Array} Values 1..D, one per cell.
   * @throws {SG.errors.GenerationError} 'fullGrid.invalidFixedCells' when the fixed cells contradict each
   *         other, 'fullGrid.unsatisfiable' when the model has no solution at all, or a budget error.
   */
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
