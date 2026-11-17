/**
 * Almost-locked sets (difficulty v3, R18, MS15a): the bounded enumerator `SG.alsPatterns.enumerate`. It is an
 * INACTIVE helper: no technique, weight or help text is registered here, nothing in the solver, the rating or
 * the hints reads it, and the registered finders share no state with it. MS15b (alsXz) and MS16 (sueDeCoq)
 * are its first readers.
 *
 * An almost-locked set (ALS) is k open cells (1 <= k <= LIMITS.cells = 4) of ONE all-different unit whose
 * candidates together are exactly k + 1 digits. The k cells hold k different digits (they all see each
 * other through the unit), and every one of them is among the k + 1 candidates, so exactly one of those
 * digits is missing from the set. Nothing else is needed: the unit does not have to be complete (a partial
 * unit such as a Killer cage is an all-different unit too, so are diagonals, windows and regions, in any
 * grid of a multi-grid board). A bivalue cell is a 1-cell ALS. Solved cells are not part of any ALS; a cell
 * is open while `state.value[c] === 0`. The candidates are read as they are: no propagation, no check that
 * the position is consistent (an open cell without candidates simply adds no digit to a set).
 *
 *   SG.alsPatterns.enumerate(model, state, ctx, work[, limits]) -> { records, complete, capHit }
 *   SG.alsPatterns.createWork([limit]) -> work
 *   SG.alsPatterns.spend(work, ctx) -> boolean
 *   SG.alsPatterns.LIMITS = { cells: 4, records: 4096, work: 50000 } (frozen)
 *
 * A record is plain data, one per distinct cell set:
 *
 *   { cells: number[], digits: number[], occurrences: { [digit]: number[] } }
 *
 * `cells` ascending cell indexes, `digits` ascending 1-based digits (k + 1 of them), `occurrences[d]` the
 * cells of the set that still hold the candidate d, ascending (never empty). Every record is complete and
 * valid on its own: its digits are the union of the candidates of its cells, nothing is left to be added
 * later. The same cell set found in several units (two cells of a row-box intersection, a bivalue cell
 * that is in a row, a column and a box) is ONE record: the candidates are fixed within a call, so the
 * records of one set are identical. Unions and counts use masks of digits only, never a mask of board cells.
 *
 * Order: by cell count (1 cell first), then lexicographically by the ascending cell indexes. The records
 * kept are always a prefix of that order, the first `LIMITS.records` = 4096 at most.
 *
 * The result. `complete` is true when every ALS of at most `LIMITS.cells` cells of the supplied state was
 * enumerated and kept (a set of more cells is outside the definition, not missing). Otherwise `capHit` says
 * why the enumeration stopped, and NO case asserts that another ALS does not exist:
 *   'records'  4096 records were kept and a further one exists. The records are the first 4096 of the
 *              order, each valid: a consumer may build a constructive witness from them, with work left in
 *              its guard, but never reads "no ALS" or "no pattern" from the prefix. Exactly 4096 sets
 *              are allowed: the limit refuses the next distinct set, not the 4096th.
 *   'work'     the guard refused a unit (`work.capped`, `work.used === work.limit`). The records are those of
 *              the sizes finished before the cut (possibly none), still a prefix of the order: a size that
 *              was cut is dropped whole, because a part of it is not a prefix. The guard has no unit left,
 *              so an enclosing finder has no allowance for a pair scan it did not count.
 *   null       with `complete` false: the parent budget was spent (a 'budget.exceeded' error of the
 *              context, answered as "nothing found" as the registered finders do, with the same prefix
 *              of finished sizes). The caller checks its own budget after the call. Cancellation
 *              ('budget.cancelled') and every other error propagate and nothing is returned.
 * `enumerate` publishes no `ctx.options.onPatternWork` record: the enclosing finder is the one call of the
 * solver and publishes one record for the whole of it (its guard's `used` and `limit`, its own `capHit`,
 * `retained` the number of records).
 *
 * Work (R10). The guard `work = { limit, used, checkedAt, capped }`, made by `createWork`, is the one counter
 * of an enclosing finder's call: the enumeration and the later pair scan spend from it and nothing resets it
 * at a change of phase (`enumerate` checks the parent budget at entry and records that as `checkedAt`; it
 * only adds to `used`, and never lowers `used` or `limit` or clears `capped`). `createWork()` gives the
 * starting limit `LIMITS.work` = 50000, a whole number of at least 0 replaces it (floored, anything else is
 * `solver.invalidOption`; no unbounded guard). `enumerate` needs the guard: a missing or hand-made invalid
 * one is `solver.invalidOption`, so a lost shared guard is never replaced by a fresh one. `spend(work, ctx)`
 * charges one unit and returns true; a spent limit returns false (sets `capped`, charges nothing). The
 * parent budget is checked before the unit that would carry the gap since the last check over 256 units,
 * so no more than 256 units pass between two checks (`ctx.check()` may throw: that is the budget or
 * cancellation). The later pair scan spends the same way.
 *
 * One unit is one tested extension: a cell of a unit tried as the next member of a combination of its open
 * cells (ascending), whether the union bound then rejects it or not. For each size k = 1 ... 4 and each unit
 * in index order the search extends the combination cell by cell and abandons it as soon as its union holds
 * more than k + 1 digits, so every tested cell of every level costs one unit. A size with k + 1 more than the
 * digits of the board has no possible set and is not searched (a 4 x 4 board stops at 3 cells; the units of
 * a board are all-different, so such a set would need more different digits than exist). A set that two
 * units share is tested in both (only its record is deduplicated). Sizes are searched one after the other
 * so that a cut leaves a prefix; the probe that tells whether a record beyond the limit exists stops at the
 * first one.
 *
 * The seam of the tests: `limits = { cells, records }` replaces either limit with a whole number of at least
 * 0 (floored, else `solver.invalidOption`). Nothing in the solver passes it.
 *
 * Ownership. Every call allocates its own tables and its records are the caller's: the model, the state and
 * the context are only read, nothing is shared between calls or kept after one, and no candidate-dependent
 * list is cached, so a state object that was changed between two calls is simply read again. There is no
 * cache at all, so no geometry can go stale either.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const popcount = SG.bits.popcount;

  const LIMITS = Object.freeze({ cells: 4, records: 4096, work: 50000 });
  const CHECK_UNITS = 256;
  // Thrown inside a call when the guard refuses a unit; it never leaves enumerate.
  const WORK_CAP = Object.freeze({ capHit: 'work' });

  function numeric(a, b) { return a - b; }

  function invalidOption(key, reason) {
    const err = new SG.errors.GenerationError('solver.invalidOption', { option: 'alsPatterns.' + key });
    err.message = 'solver.invalidOption: alsPatterns ' + key + ' ' + reason;
    return err;
  }

  function wholeLimit(value, key) {
    if (!Number.isFinite(value) || value < 0) {
      throw invalidOption(key, 'must be a number of at least 0');
    }
    return Math.floor(value);
  }

  function isCount(x) { return Number.isInteger(x) && x >= 0; }

  function createWork(limit) {
    return {
      limit: limit === undefined ? LIMITS.work : wholeLimit(limit, 'workLimit'),
      used: 0,
      checkedAt: 0,
      capped: false
    };
  }

  // One unit of work: refused once the limit is spent, and the parent budget is asked before the unit that
  // would carry the gap since the last check over CHECK_UNITS.
  function spend(work, ctx) {
    if (work.used >= work.limit) {
      work.capped = true;
      return false;
    }
    if (work.used + 1 - work.checkedAt > CHECK_UNITS) {
      ctx.check();
      work.checkedAt = work.used;
    }
    work.used++;
    return true;
  }

  function checkedWork(work) {
    if (work === null || typeof work !== 'object' || !isCount(work.limit) || !isCount(work.used) ||
        !isCount(work.checkedAt) || work.used > work.limit || work.checkedAt > work.used ||
        typeof work.capped !== 'boolean') {
      throw invalidOption('work', 'must be a work guard made by createWork');
    }
    return work;
  }

  function resolveLimits(limits) {
    const out = { cells: LIMITS.cells, records: LIMITS.records };
    if (limits === undefined) return out;
    if (limits === null || typeof limits !== 'object') throw invalidOption('limits', 'must be an object');
    ['cells', 'records'].forEach(function (key) {
      if (limits[key] !== undefined) out[key] = wholeLimit(limits[key], key);
    });
    return out;
  }

  // The open cells of every unit (ascending) and their candidate masks, read from this call's state alone.
  function openTables(model, state) {
    const tables = [];
    for (let u = 0; u < model.units.length; u++) {
      const cells = model.units[u];
      const open = [];
      for (let i = 0; i < cells.length; i++) {
        if (state.value[cells[i]] === 0) open.push(cells[i]);
      }
      open.sort(numeric);
      tables.push({
        cells: open,
        masks: open.map(function (c) { return state.candidates[c]; })
      });
    }
    return tables;
  }

  // Extends the combination in frame.picked[0..depth) by one more open cell of frame.table, from index
  // `from`, with `union` the digits of the combination so far. Returns true to stop (the probe found one).
  function extend(frame, depth, from, union) {
    const table = frame.table;
    const size = frame.size;
    const last = table.cells.length - (size - depth);
    for (let i = from; i <= last; i++) {
      if (!spend(frame.work, frame.ctx)) throw WORK_CAP;
      const merged = union | table.masks[i];
      const digits = popcount(merged);
      if (digits > size + 1) continue;
      frame.picked[depth] = table.cells[i];
      if (depth + 1 === size) {
        if (digits === size + 1) {
          frame.found.push(frame.picked.slice());
          if (frame.first) return true;
        }
      } else if (extend(frame, depth + 1, i + 1, merged)) {
        return true;
      }
    }
    return false;
  }

  // Every ALS of `size` cells in every unit, as ascending cell lists in unit order (duplicates included).
  function collectLevel(tables, size, work, ctx, first) {
    const frame = { table: null, size: size, work: work, ctx: ctx, picked: new Array(size), found: [],
      first: first };
    for (let t = 0; t < tables.length; t++) {
      frame.table = tables[t];
      if (extend(frame, 0, 0, 0)) break;
    }
    return frame.found;
  }

  function compareSets(a, b) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  }

  // The cell lists of one size, in lexicographic order, each once.
  function distinctSets(found) {
    found.sort(compareSets);
    const out = [];
    for (let i = 0; i < found.length; i++) {
      if (i === 0 || compareSets(found[i - 1], found[i]) !== 0) out.push(found[i]);
    }
    return out;
  }

  function recordOf(cells, candidates) {
    let union = 0;
    for (let i = 0; i < cells.length; i++) union |= candidates[cells[i]];
    const digits = SG.bits.toArray(union);
    const occurrences = {};
    digits.forEach(function (d) {
      const bit = 1 << (d - 1);
      occurrences[d] = cells.filter(function (c) { return (candidates[c] & bit) !== 0; });
    });
    return { cells: cells, digits: digits, occurrences: occurrences };
  }

  function enumerate(model, state, ctx, work, limits) {
    const guard = checkedWork(work);
    const limit = resolveLimits(limits);
    const records = [];
    let complete = false;
    let capHit = null;
    try {
      ctx.check();
      guard.checkedAt = guard.used;
      const tables = openTables(model, state);
      // k cells need k + 1 different digits: a larger size has no possible set and is not searched
      const top = Math.min(limit.cells, model.digits - 1);
      for (let size = 1; size <= top && capHit === null; size++) {
        const room = limit.records - records.length;
        const sets = distinctSets(collectLevel(tables, size, guard, ctx, room === 0));
        for (let i = 0; i < sets.length && i < room; i++) records.push(recordOf(sets[i], state.candidates));
        if (sets.length > room) capHit = 'records';
      }
      complete = capHit === null;
    } catch (err) {
      if (err === WORK_CAP) capHit = 'work';
      else if (!(err && err.code === 'budget.exceeded')) throw err;
    }
    return { records: records, complete: complete, capHit: capHit };
  }

  SG.alsPatterns = {
    enumerate: enumerate,
    createWork: createWork,
    spend: spend,
    LIMITS: LIMITS
  };
})(typeof self !== 'undefined' ? self : globalThis);
