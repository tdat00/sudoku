/**
 * Constraint propagation (design.md section 6.3).
 *
 * Built in rules, all variant independent because they only look at units and peers:
 *   P1 peer elimination      fixing c = v clears v from every peer of c
 *   P2 naked single          a cell with one candidate left is fixed
 *   P3 hidden single         a value that fits only one cell of a unit is placed there
 *   P6 contradiction         a cell without candidates, or a unit with no room for some value, fails
 * They run on a work queue of changed cells and of units to rescan, until nothing is left (a fixpoint).
 *
 * EXTENSION POINT for rules that are not all-different (cage sums P4, inequalities P5, ...):
 *
 *   SG.constraints.registerExtension({
 *     id: 'cage',
 *     prepare: function (model) { return dataOrNull; },              // optional, once per model
 *     propagate: function (model, state, data, ctx) { return true; } // required, false = contradiction
 *   });
 *
 * - `prepare` returns the per-model data the extension needs (lookup tables, cell -> cage maps) or
 *   null/undefined/false when the model has nothing for it; the extension is then skipped for that model.
 *   It is called once per model and cached, and again whenever extensions are (un)registered.
 * - `propagate` runs every time the built in rules reach a fixpoint. `ctx.changed[0 .. ctx.changedCount)`
 *   lists the cells whose candidates changed since the previous extension round (on a full `propagate` call
 *   that is every cell), so an extension can limit its work to the affected cages. The array is scratch
 *   memory that is only valid during the call.
 * - It changes the state only through `ctx.restrict(cell, mask)`, `ctx.eliminate(cell, value)` and
 *   `ctx.assign(cell, value)`. Each returns false on a contradiction (and the extension should then return
 *   false), and each queues the cell, so the built in rules react to the change and the extensions run
 *   again until a round changes nothing.
 * - An extension is stateless: everything it knows about a position is in `state` and `data`, so states can
 *   still be cloned freely. It must not call `propagate` or `place` for the same model (no re-entrance).
 * Cage and inequality propagators register from their own files; this file does not need to change.
 *
 * Allocation review (task T-6.2, rules R1-R7 of design.md section 9.2): `runCore`, `run`, `pushCell`,
 * `popCell`, `markUnits` and `popUnit` touch only the typed arrays of the per-model plan (queues, flags,
 * log), contain no try/catch (it lives in `runExtensions`, once per extension round) and no console call.
 * Measured with a heap probe (`node tests/perf.js --alloc`: 20000 calls on a 9x9 puzzle, state refilled
 * with `set`): `propagate`, `place` and `propagateSwept` allocate under 5 bytes per call, the noise of the
 * probe.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads so that extensions registered earlier survive.
  if (SG.constraints && typeof SG.constraints.registerExtension === 'function') return;

  /** Per model scratch: queues, flags, resolved extensions. Models are immutable, so it never goes stale. */
  const plans = new WeakMap();

  const extensions = [];
  let extensionVersion = 0;

  // ---------------------------------------------------------------------------------------------
  // Plans: reusable scratch buffers (rule R2, no allocation while propagating)
  // ---------------------------------------------------------------------------------------------

  function createPlan(model) {
    const n = model.cellCount;
    const nu = model.units.length;
    const unitFull = new Uint8Array(nu);
    for (let u = 0; u < nu; u++) {
      const meta = model.unitMeta[u];
      unitFull[u] = model.units[u].length === model.digits && !(meta && meta.partial) ? 1 : 0;
    }
    const plan = {
      model: model,
      n: n,
      fullMask: SG.bits.full(model.digits),
      unitFull: unitFull,
      queue: new Int32Array(n),
      inQueue: new Uint8Array(n),
      qHead: 0,
      qCount: 0,
      uQueue: new Int32Array(nu),
      inUQueue: new Uint8Array(nu),
      uHead: 0,
      uCount: 0,
      log: new Int32Array(n),
      inLog: new Uint8Array(n),
      logCount: 0,
      state: null,
      budget: null,
      watch: -1,
      stopped: false,
      version: -1,
      active: [],
      ctx: null
    };
    plan.ctx = createContext(plan);
    return plan;
  }

  function createContext(plan) {
    function restrict(cell, mask) {
      const cand = plan.state.candidates;
      const old = cand[cell];
      const next = old & mask;
      if (next === old) return true;
      if (next === 0) return false;
      cand[cell] = next;
      pushCell(plan, cell);
      return true;
    }
    return {
      changed: plan.log,
      changedCount: 0,
      budget: null,
      restrict: restrict,
      eliminate: function eliminate(cell, value) { return restrict(cell, ~(1 << (value - 1))); },
      assign: function assign(cell, value) { return restrict(cell, 1 << (value - 1)); }
    };
  }

  function getPlan(model) {
    let plan = plans.get(model);
    if (plan === undefined) {
      plan = createPlan(model);
      plans.set(model, plan);
    }
    if (plan.version !== extensionVersion) {
      plan.active = [];
      for (let i = 0; i < extensions.length; i++) {
        const ext = extensions[i];
        const data = typeof ext.prepare === 'function' ? ext.prepare(model) : true;
        if (data !== null && data !== undefined && data !== false) {
          plan.active.push({ ext: ext, data: data });
        }
      }
      plan.version = extensionVersion;
    }
    return plan;
  }

  function pushCell(plan, c) {
    if (plan.inQueue[c] === 0) {
      plan.inQueue[c] = 1;
      let tail = plan.qHead + plan.qCount;
      if (tail >= plan.n) tail -= plan.n;
      plan.queue[tail] = c;
      plan.qCount++;
    }
  }

  function popCell(plan) {
    const c = plan.queue[plan.qHead];
    if (++plan.qHead === plan.n) plan.qHead = 0;
    plan.qCount--;
    plan.inQueue[c] = 0;
    return c;
  }

  function markUnits(plan, c) {
    const us = plan.model.cellUnits[c];
    for (let i = 0; i < us.length; i++) {
      const u = us[i];
      if (plan.inUQueue[u] === 0) {
        plan.inUQueue[u] = 1;
        let tail = plan.uHead + plan.uCount;
        if (tail >= plan.uQueue.length) tail -= plan.uQueue.length;
        plan.uQueue[tail] = u;
        plan.uCount++;
      }
    }
  }

  function popUnit(plan) {
    const u = plan.uQueue[plan.uHead];
    if (++plan.uHead === plan.uQueue.length) plan.uHead = 0;
    plan.uCount--;
    plan.inUQueue[u] = 0;
    return u;
  }

  function clearQueues(plan) {
    while (plan.qCount > 0) popCell(plan);
    while (plan.uCount > 0) popUnit(plan);
    clearLog(plan);
  }

  function clearLog(plan) {
    for (let i = 0; i < plan.logCount; i++) plan.inLog[plan.log[i]] = 0;
    plan.logCount = 0;
  }

  // ---------------------------------------------------------------------------------------------
  // The propagation loop
  // ---------------------------------------------------------------------------------------------

  /**
   * Runs the extensions once. Kept apart from `runCore` so the hot loop stays free of try/catch (rule R4);
   * if an extension or the budget throws, the queues are cleaned before the error moves on.
   */
  function runExtensions(plan, state) {
    const ctx = plan.ctx;
    const active = plan.active;
    try {
      if (plan.budget !== null) plan.budget.check();
      ctx.changedCount = plan.logCount;
      ctx.budget = plan.budget;
      for (let e = 0; e < active.length; e++) {
        if (!active[e].ext.propagate(plan.model, state, active[e].data, ctx)) {
          clearQueues(plan);
          return false;
        }
      }
      clearLog(plan);
      return true;
    } catch (err) {
      clearQueues(plan);
      throw err;
    }
  }

  /** Drains the cell and unit queues with the built in rules. Returns false on a contradiction. */
  function runCore(plan, state, track) {
    const model = plan.model;
    const cand = state.candidates;
    const val = state.value;
    const peers = model.peers;
    const units = model.units;
    const unitFull = plan.unitFull;
    const full = plan.fullMask;
    const watch = plan.watch;

    for (;;) {
      if (watch >= 0 && (cand[watch] & (cand[watch] - 1)) === 0) {
        plan.stopped = true;
        return true;
      }
      if (plan.qCount > 0) {
        const c = popCell(plan);
        if (track && plan.inLog[c] === 0) {
          plan.inLog[c] = 1;
          plan.log[plan.logCount++] = c;
        }
        const m = cand[c];
        if (m === 0) return false;
        if (val[c] === 0) {
          if ((m & (m - 1)) !== 0) {
            markUnits(plan, c);
            continue;
          }
          // P2: a single candidate is the value of the cell.
          val[c] = 32 - Math.clz32(m);
          state.unsolvedCount--;
        }
        // P1: a fixed value leaves every peer.
        const ps = peers[c];
        for (let i = 0; i < ps.length; i++) {
          const p = ps[i];
          const pm = cand[p];
          if ((pm & m) !== 0) {
            const next = pm & ~m;
            if (next === 0) return false;
            cand[p] = next;
            pushCell(plan, p);
          }
        }
        markUnits(plan, c);
      } else if (plan.uCount > 0) {
        const u = popUnit(plan);
        if (unitFull[u] === 0) continue;
        const cells = units[u];
        let once = 0;
        let twice = 0;
        let i;
        for (i = 0; i < cells.length; i++) {
          const m = cand[cells[i]];
          twice |= once & m;
          once |= m;
        }
        // P6: some value has no cell left in this unit.
        if (once !== full) return false;
        // P3: values with exactly one possible cell.
        const hidden = once & ~twice;
        if (hidden !== 0) {
          for (i = 0; i < cells.length; i++) {
            const cc = cells[i];
            const cm = cand[cc];
            const h = cm & hidden;
            if (h !== 0) {
              if ((h & (h - 1)) !== 0) return false;
              if (cm !== h) {
                cand[cc] = h;
                pushCell(plan, cc);
              }
            }
          }
        }
      } else {
        return true;
      }
    }
  }

  /** Core rules, then extension rounds until a round changes nothing. */
  function run(plan, state, budget) {
    const track = plan.active.length > 0;
    plan.state = state;
    plan.budget = budget || null;
    let ok;
    for (;;) {
      ok = runCore(plan, state, track);
      if (!ok) {
        clearQueues(plan);
        break;
      }
      if (plan.stopped) {
        plan.stopped = false;
        clearQueues(plan);
        break;
      }
      if (!track) break;
      ok = runExtensions(plan, state);
      if (!ok || (plan.qCount === 0 && plan.uCount === 0)) break;
    }
    plan.state = null;
    plan.budget = null;
    plan.watch = -1;
    return ok;
  }

  // ---------------------------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------------------------

  /**
   * Like `propagate`, for a state that is already peer-consistent: every fixed value has been removed from
   * the candidates of its peers (a state built from per-unit masks, as the unique-solution check does). Only
   * the cells with a single candidate and the units are scanned, which is several times cheaper than a full
   * rescan. With constraint extensions registered it falls back to the full `propagate`, since an extension
   * must see every cell once.
   *
   * With `watchCell` the run also ends as soon as that cell is down to one candidate, even though the state
   * is then not at a fixpoint (the result is still sound: it is only less propagated). Callers use it when
   * all they need to know is what the watched cell must be. Not part of the section 13.4 contract.
   * @param {PuzzleModel} model
   * @param {SolveState} state  Modified in place.
   * @param {Object} [budget]
   * @param {number} [watchCell]
   * @returns {boolean} false when the state is contradictory.
   */
  function propagateSwept(model, state, budget, watchCell) {
    const plan = getPlan(model);
    if (plan.active.length > 0) return propagate(model, state, budget);
    const cand = state.candidates;
    const val = state.value;
    for (let c = 0; c < plan.n; c++) {
      if (val[c] === 0) {
        const m = cand[c];
        if (m === 0) {
          clearQueues(plan);
          return false;
        }
        if ((m & (m - 1)) === 0) pushCell(plan, c);
      }
    }
    for (let u = 0; u < model.units.length; u++) {
      if (plan.inUQueue[u] === 0) {
        plan.inUQueue[u] = 1;
        plan.uQueue[(plan.uHead + plan.uCount) % plan.uQueue.length] = u;
        plan.uCount++;
      }
    }
    plan.watch = watchCell === undefined ? -1 : watchCell;
    return run(plan, state, budget);
  }

  /**
   * Propagates a state to a fixpoint (P1, P2, P3, P6 plus the registered extensions). It rescans the whole
   * state, so it also works on a state that was edited from outside.
   * @param {PuzzleModel} model
   * @param {SolveState} state  Modified in place.
   * @param {Object} [budget]   Checked once per extension round.
   * @returns {boolean} false when the state is contradictory (it never throws for that).
   */
  function propagate(model, state, budget) {
    const plan = getPlan(model);
    for (let c = 0; c < plan.n; c++) pushCell(plan, c);
    for (let u = 0; u < model.units.length; u++) {
      if (plan.inUQueue[u] === 0) {
        plan.inUQueue[u] = 1;
        plan.uQueue[(plan.uHead + plan.uCount) % plan.uQueue.length] = u;
        plan.uCount++;
      }
    }
    return run(plan, state, budget);
  }

  /**
   * Removes `value` from the candidates of `cell`. Nothing is propagated; call `propagate` afterwards.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {number} cell
   * @param {number} value  1-based.
   * @returns {boolean} false when the cell is left without candidates.
   */
  function eliminate(model, state, cell, value) {
    const cand = state.candidates;
    const old = cand[cell];
    const next = old & ~(1 << (value - 1));
    if (next === old) return true;
    if (next === 0) return false;
    cand[cell] = next;
    return true;
  }

  /**
   * Fixes `cell` to `value` and applies P1 to its peers. Follow-up deductions (naked and hidden singles)
   * are left to `propagate`.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {number} cell
   * @param {number} value  1-based.
   * @returns {boolean} false when the value is no longer possible in the cell or a peer loses its last
   *          candidate.
   */
  function assign(model, state, cell, value) {
    const cand = state.candidates;
    const bit = 1 << (value - 1);
    if ((cand[cell] & bit) === 0) return false;
    if (state.value[cell] === 0) {
      state.value[cell] = value;
      state.unsolvedCount--;
    } else if (state.value[cell] !== value) {
      return false;
    }
    cand[cell] = bit;
    const ps = model.peers[cell];
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const pm = cand[p];
      if ((pm & bit) !== 0) {
        const next = pm & ~bit;
        if (next === 0) return false;
        cand[p] = next;
      }
    }
    return true;
  }

  /**
   * `assign` plus incremental propagation: only the consequences of this one placement are followed, which
   * is what a search needs at every node. The state must already be at a fixpoint (for example the result
   * of `propagate`). Not part of the section 13.4 contract; it is an addition for the solvers.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {number} cell
   * @param {number} value  1-based.
   * @param {Object} [budget]
   * @returns {boolean} false on a contradiction.
   */
  function place(model, state, cell, value, budget) {
    const bit = 1 << (value - 1);
    if ((state.candidates[cell] & bit) === 0) return false;
    if (state.value[cell] === 0) {
      state.value[cell] = value;
      state.unsolvedCount--;
    } else if (state.value[cell] !== value) {
      return false;
    }
    state.candidates[cell] = bit;
    const plan = getPlan(model);
    pushCell(plan, cell);
    return run(plan, state, budget);
  }

  /**
   * @typedef {Object} ConstraintExtension
   * @property {string} id
   * @property {function(PuzzleModel): *} [prepare]
   * @property {function(PuzzleModel, SolveState, *, Object): boolean} propagate
   *
   * Registers a propagation extension (see the file header for the protocol).
   * @param {ConstraintExtension} ext
   * @throws {SG.errors.GenerationError} 'constraints.invalidExtension' or 'constraints.duplicateExtension'.
   */
  function registerExtension(ext) {
    if (!ext || typeof ext.id !== 'string' || ext.id === '' || typeof ext.propagate !== 'function' ||
        (ext.prepare !== undefined && typeof ext.prepare !== 'function')) {
      throw new SG.errors.GenerationError('constraints.invalidExtension', { id: ext && String(ext.id) });
    }
    if (extensions.some(function (e) { return e.id === ext.id; })) {
      throw new SG.errors.GenerationError('constraints.duplicateExtension', { id: ext.id });
    }
    extensions.push(ext);
    extensionVersion++;
  }

  /**
   * @param {string} id
   * @returns {boolean} True when an extension was removed.
   */
  function unregisterExtension(id) {
    const index = extensions.findIndex(function (e) { return e.id === id; });
    if (index === -1) return false;
    extensions.splice(index, 1);
    extensionVersion++;
    return true;
  }

  /**
   * @returns {string[]} Ids of the registered extensions, in the order they run.
   */
  function listExtensions() {
    return extensions.map(function (e) { return e.id; });
  }

  /**
   * Test support: the registered extension objects, and a way to put such a list back. Lazy extensions
   * (cage sums, inequalities) register once per page and never again, so a suite that wants a pristine
   * registry must restore what it found instead of unregistering it for good.
   * @returns {ConstraintExtension[]} A copy of the registered extensions, in run order.
   */
  function extensionSnapshot() {
    return extensions.slice();
  }

  /**
   * @param {ConstraintExtension[]} list  Replaces the registered extensions (see `extensionSnapshot`).
   */
  function extensionRestore(list) {
    extensions.length = 0;
    for (let i = 0; i < list.length; i++) extensions.push(list[i]);
    extensionVersion++;
  }

  SG.constraints = {
    propagate: propagate,
    assign: assign,
    eliminate: eliminate,
    place: place,
    propagateSwept: propagateSwept,
    registerExtension: registerExtension,
    unregisterExtension: unregisterExtension,
    listExtensions: listExtensions,
    extensionSnapshot: extensionSnapshot,
    extensionRestore: extensionRestore
  };
})(typeof self !== 'undefined' ? self : globalThis);
