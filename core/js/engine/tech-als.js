/**
 * Almost-locked sets (difficulty v3, R18, R19): the bounded enumerator `SG.alsPatterns.enumerate` (MS15a), a
 * helper that has no observer of its own, ALS-XZ (MS15b), the registered technique `alsXz`, which reads it
 * through `SG.alsPatterns.findXz`, and Sue de Coq (MS16), the registered technique `sueDeCoq`, which reads it
 * through `SG.alsPatterns.findSueDeCoq`. These are the only techniques registered here, and every other
 * registered finder shares no state with this module.
 *
 * An almost-locked set (ALS) is k open cells of ONE all-different unit whose candidates together are
 * exactly k + 1 digits. The k cells hold k different digits (they all see each other through the unit),
 * and every one of them is among the k + 1 candidates, so exactly one of those
 * digits is missing from the set. Nothing else is needed: the unit does not have to be complete (a partial
 * unit such as a Killer cage is an all-different unit too, so are diagonals, windows and regions, in any
 * grid of a multi-grid board). A bivalue cell is a 1-cell ALS. Solved cells are not part of any ALS; a cell
 * is open while `state.value[c] === 0`. The candidates are read as they are: no propagation, no check that
 * the position is consistent (an open cell without candidates simply adds no digit to a set).
 *
 *   SG.alsPatterns.enumerate(model, state, ctx, work[, limits]) -> { records, complete, capHit }
 *   SG.alsPatterns.createWork([limit]) -> work
 *   SG.alsPatterns.spend(work, ctx) -> boolean
 *   SG.alsPatterns.findXz(model, state, ctx[, opts]) -> Finding | null  (opts: the tests' seam, see ALS-XZ)
 *   SG.alsPatterns.findSueDeCoq(model, state, ctx[, opts]) -> Finding | null  (the same seam, see Sue de Coq)
 *   SG.alsPatterns.LIMITS = { cells: 4, records: 4096, work: 50000 } (frozen): the production defaults
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
 * The cell bound. The enumerator searches within the call's effective cell bound: `LIMITS.cells` (4) in
 * production, or the test-only `limits.cells` of the call, clipped by `model.digits - 1` (k cells need
 * k + 1 different digits, so a 4 x 4 board stops at 3 cells). The bound belongs to the search, not to the
 * concept: a set of five cells is an ALS too, it is just not searched at four.
 *
 * The result. `complete: true` means every eligible structural ALS within the effective bound was
 * enumerated and retained. It does not certify that the position is feasible, that no larger ALS exists or
 * that the later pair/target search is complete. `complete: false` is not an exhaustion proof: `capHit`
 * says why the enumeration stopped, and NO case asserts that another ALS does not exist:
 *   'records'  4096 records were kept and a further one exists. The records are the first 4096 of the
 *              order, each valid: a consumer may build a constructive witness from them, with work left in
 *              its guard, but never reads "no ALS" or "no pattern" from the prefix. Exactly 4096 sets
 *              are allowed: the limit refuses the next distinct set, not the 4096th.
 *   'work'     the guard refused a unit (`work.capped`, `work.used === work.limit`). The records are those of
 *              the sizes finished before the cut (possibly none), still a prefix of the order: a size that
 *              was cut is dropped whole, because a part of it is not a prefix. The guard has no unit left,
 *              so an enclosing finder has no allowance for a pair scan it did not count.
 *   null       with `complete` false: the parent budget was spent (a 'budget.exceeded' error of the
 *              context, answered with no Finding as the registered finders do, with the same prefix of
 *              finished sizes, which is no exhaustion proof). The caller checks its own budget after the
 *              call. Cancellation ('budget.cancelled') and every other error propagate and nothing is
 *              returned.
 * `enumerate` publishes no `ctx.options.onPatternWork` record: the enclosing finder (`findXz`, below) is
 * the one call of the solver and publishes one record for the whole of it (its guard's `used` and
 * `limit`, its own `capHit`, `retained` the number of records).
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
 * The seam of the tests: `limits = { cells, records }` replaces either limit with a whole number of at
 * least 0 (floored, else `solver.invalidOption`). Nothing in the solver passes it (`findXz` forwards
 * `opts.limits`).
 *
 * ALS-XZ (R18, MS15b). Take two ALSs A and B of the retained records that share no cell, and a digit x
 * that both hold and that is RESTRICTED COMMON: every cell of A that holds x sees every cell of B that
 * holds x (a `model.peers` relation, tested for every pair of cells; disjointness is no shortcut). Two
 * cells that see each other cannot both hold x, so one of the two sets holds no x, and a set of k cells
 * with k + 1 digits that holds no x holds each of its other k digits exactly once. So for every other
 * digit z that both sets hold, at least one cell of A or B holds z, and a candidate z of any other open
 * cell that sees EVERY cell of A and B that holds z is removed. The sets may lie in different units,
 * grids or partial units (a Killer cage): the proof needs only that each set lies in one all-different
 * unit and that the sets are disjoint. No uniqueness is assumed, and the technique is not scoped to a
 * variant.
 *
 * Order. The retained records in their order, A before B by record index (A < B); for a pair, x ascending
 * (restricted common only), then z ascending over the other common digits (another restricted common digit
 * may be z). The first (A, B, x, z) that has a target gives the Finding, whatever a later one would remove.
 * The pivot is the first cell of A that holds z (`A.occurrences[z][0]`): its peers are visited in ascending
 * order, and an open cell of them that holds z and sees every cell of A and B that holds z is a target (a
 * cell of A or B never is: it does not see itself). The scan of one (x, z) is finished before its Finding
 * is made, and a stop discards it.
 *
 * Finding: technique 'alsXz', key technique.alsXz.step, no placements; `cells` the cells of A and B,
 * ascending; `eliminations` [target, z] ascending by cell; i18nArgs { digitX: x, digitY: z, cells } with
 * the labels of `cells` in the same order. Every array is the caller's own.
 *
 * Work. The call has ONE guard, the enumeration's: one unit is charged before each pair of records tested
 * (disjointness, the common digits and the restricted-common test of every x are inside it), before each
 * (x, z) whose target scan is opened and before each cell of the pivot's peers that is visited, rejected or
 * not. Nothing else is charged and nothing is free: no prefilter, no rejection scan outside the guard. The
 * parent budget is checked as for the enumeration (every 256 units), after the enumeration before its
 * records are used, and after the pair phase before anything is published: a spent budget there drops the
 * Finding.
 *
 * Stops. A unit the guard refuses gives no Finding, in the enumeration or in the pair phase, and the work
 * is not continued. A stop of the parent budget gives no Finding either, even if it was seen once only and
 * the budget answers again. One observer record { id: 'alsXz', work, limit, capHit, retained } is published
 * for each call that returns (none for an error or a cancellation, which propagate), after the search and
 * outside its error handling. `capHit` is 'work' when the guard refused a unit, otherwise 'records' when
 * the record quota really cut the enumeration (the pairs of the retained prefix are still searched: a
 * Finding is a constructive proof, and no absence is claimed), otherwise null. A parent-only stop is null, as
 * for every registered finder (the caller's budget stays spent), and it never erases a cap reported
 * before it. `retained` is the number of records the enumeration kept.
 *
 * The seam of the tests: `findXz(model, state, ctx, opts)` with `opts = { workLimit, limits }` (a whole
 * number of at least 0 each, `limits` as for `enumerate`, anything else is `solver.invalidOption`). The
 * registered finder passes no `opts`, so production runs with `LIMITS`. `opts` itself is undefined (no
 * options) or an object that is neither null nor an array; both finders check it with the same private
 * validator.
 *
 * Sue de Coq (R19, MS16). A LINE is a unit whose `unitMeta.kind` is 'row' or 'col', a BOX a unit of kind
 * 'box' or 'region'; no diagonal, window or cage is either, and no completeness of the unit is asked: the
 * proof below uses all-different units only. Take a line U and a box V that share at least two open cells
 * (S, ascending) and I, two or three of the cells of S (every 2-subset and every 3-subset, not only S
 * itself; the other cells of S are ordinary cells of U and V). C is the union of the candidates of I. A is
 * an ALS of p cells in U minus V, B an ALS of q cells in V minus U, the digits of A and of B are subsets of
 * C and disjoint, and |C| = |I| + p + q. Z is C without the digits of A and of B (|Z| = |I| - 2, so
 * one digit of Z for a 3-cell I, none for a 2-cell I).
 * The cells of A and I lie in U (all different) and A holds p of its p + 1 digits, so I holds none of those
 * p; likewise for B in V. The |I| cells of I hold |I| different digits of C that are none of the p digits of
 * A and the q digits of B, so they hold exactly the |C| - p - q = |I| digits left: Z, the digit of A that A
 * misses and the digit of B that B misses. Every digit of A is therefore held by a cell of A or of I, in U;
 * every digit of B by a cell of B or of I, in V; every digit of Z by a cell of I, in U and in V. So a
 * candidate of a digit of A is removed from the cells of U outside I and A, one of B from the cells of V
 * outside I and B, one of Z from the cells of U and of V outside I, A and B (A and B hold no Z digit anyway);
 * nothing is ever removed from a cell of I, A or B, and nothing outside U and V. No uniqueness is assumed and
 * the technique is not scoped to a variant. The membership of every cell is read from `model.units` and
 * `model.cellUnits`: a record has no unit of its own (it was found in some unit, which says nothing about
 * this pair), so it is classified by its cells.
 *
 * Order. Pairs by line index, then box index; in a pair, I of 2 cells before 3, the tuples in ascending
 * lexicographic order of their cells; then A, then B, in the order of the retained records. The first (I,
 * A, B) whose finished target scan finds a target gives the Finding; no later witness is looked at and the
 * largest set is not chosen. A valid (I, A, B) without target is charged and skipped.
 *
 * Finding: technique 'sueDeCoq', no placements; `cells` the cells of I, A and B, ascending; `eliminations`
 * [cell, digit] ascending by cell, then digit, each once, all the targets of that witness;
 * i18nArgs { digits: the digits of A, partDigits: the digits of B, forced: the digits of Z (all ascending
 * lists), line: the label of U, box: the label of V }; i18nKey technique.sueDeCoq.step when Z is empty and
 * technique.sueDeCoq.step.extra otherwise. Every array is the caller's own.
 *
 * Work. The call has ONE guard of its own, `SDC_WORK_LIMIT` (50000): not the spent guard of an earlier call
 * and not `LIMITS.work`. One unit is charged BEFORE each of these operations, and nothing else is charged or
 * free (fixed-size tuples, mask tests, ordering and copies of the Finding are bookkeeping): (1) a cell of a
 * box visited in the geometry, in ascending unit and cell order, solved cells included, the lines that meet
 * the box being read from `model.cellUnits` on the way; (2) an extension of the enumeration (the enumerator's
 * own units, the same guard); (3) a retained record classified, once, in record order (the lines and the
 * boxes that hold all its cells, kept in lists in record order); (4) a pair (U, V) opened; (5) a record of
 * the line's list, then of the box's list, tested for lying wholly outside the other unit; (6) a tuple I
 * opened; (7) a record of the side of A, then of B, tested for having its digits inside C, once per I;
 * (8) a pair (A, B) tested, with the overlap, the cardinality and Z inside it; (9) a cell of U and V
 * (ascending, each once) visited for the targets of a valid witness. A pair without an A or without a B is
 * left once its lists are built (no tuple is opened). The geometry is never cached: no table survives a
 * call. If the geometry finds no pair with two open shared cells, the call ends there: no enumeration,
 * `retained` 0, no cap. The parent budget is checked at entry, every 256 units, at the end of the geometry,
 * of the enumeration and of the classification, and before the observer record is published: a spent
 * budget there drops the Finding.
 *
 * Stops are as for ALS-XZ. A unit the guard refuses gives no Finding (the whole partial scan of the targets
 * is dropped too) and the work is not continued; spending exactly the limit without a refused unit is no
 * cap. A stop of the parent budget gives no Finding, even if it was seen once only and the budget answers
 * again. One record { id: 'sueDeCoq', work, limit, capHit, retained } is published for each call that
 * returns, outside the error handling; `capHit` is 'work' when the guard refused a unit, otherwise
 * 'records' when the record quota really cut the enumeration (the witnesses of the retained prefix are still
 * searched), otherwise null; a parent-only stop is null and never erases a cap reported before it;
 * `retained` is 0 when no enumeration ran. A record never claims that no pattern exists.
 *
 * The seam of the tests: `findSueDeCoq(model, state, ctx, opts)` with `opts = { workLimit, limits }` as for
 * ALS-XZ, except that an absent `workLimit` is `SDC_WORK_LIMIT`. `limits` only changes the enumeration; the
 * sizes of I and the roles of the units are the rule's, not a knob. The registered finder passes no `opts`
 * and never reads `limits` from the context. An explicit `limits` is checked even when the geometry ends the
 * call early.
 *
 * Ownership. Every call allocates its own tables and its records are the caller's: the model, the state and
 * the context are only read, nothing is shared between calls or kept after one, and no candidate-dependent
 * list is cached, so a state object that was changed between two calls is simply read again. There is no
 * cache at all, so no geometry can go stale either. A Finding is built from copies.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const popcount = SG.bits.popcount;

  const LIMITS = Object.freeze({ cells: 4, records: 4096, work: 50000 });
  const CHECK_UNITS = 256;
  // Thrown inside a call when the guard refuses a unit; it never leaves enumerate.
  const WORK_CAP = Object.freeze({ capHit: 'work' });
  // The same inside findXz, in the pair phase; it never leaves findXz.
  const XZ_CAP = Object.freeze({ capHit: 'work' });
  const XZ_ID = 'alsXz';
  // The work allowance of Sue de Coq's own guard (R10): the one value this finder may adjust, never
  // LIMITS.work.
  const SDC_WORK_LIMIT = 50000;
  // The same inside findSueDeCoq, in any charged phase; it never leaves findSueDeCoq.
  const SDC_CAP = Object.freeze({ capHit: 'work' });
  const SDC_ID = 'sueDeCoq';

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

  // One unit of the pair phase, from the call's own guard; a refused unit ends the phase.
  function chargeUnit(work, ctx) {
    if (!spend(work, ctx)) throw XZ_CAP;
  }

  // The digits that both ascending lists hold, ascending.
  function commonDigits(a, b) {
    const out = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        out.push(a[i]);
        i++;
        j++;
      } else if (a[i] < b[j]) {
        i++;
      } else {
        j++;
      }
    }
    return out;
  }

  function sharesCell(a, b) {
    for (let k = 0; k < a.length; k++) {
      if (b.indexOf(a[k]) !== -1) return true;
    }
    return false;
  }

  function sees(model, a, b) { return model.peers[a].indexOf(b) !== -1; }

  // Restricted common: every cell of A that holds x sees every cell of B that holds x.
  function restrictedCommon(model, a, b, x) {
    const inA = a.occurrences[x];
    const inB = b.occurrences[x];
    for (let i = 0; i < inA.length; i++) {
      for (let j = 0; j < inB.length; j++) {
        if (!sees(model, inA[i], inB[j])) return false;
      }
    }
    return true;
  }

  // The targets of z: the open cells of the pivot's peers (ascending) that hold z and see every cell of A
  // and B that holds z. Every visited peer is charged, rejected or not; a refused unit discards the list.
  function xzTargets(model, state, ctx, work, a, b, z) {
    const zCells = a.occurrences[z].concat(b.occurrences[z]);
    const bit = 1 << (z - 1);
    const pivot = model.peers[a.occurrences[z][0]];
    const targets = [];
    for (let i = 0; i < pivot.length; i++) {
      chargeUnit(work, ctx);
      const c = pivot[i];
      if (state.value[c] !== 0 || (state.candidates[c] & bit) === 0) continue;
      let all = true;
      for (let q = 0; q < zCells.length && all; q++) all = sees(model, c, zCells[q]);
      if (all) targets.push(c);
    }
    return targets;
  }

  function xzFinding(model, a, b, x, z, targets) {
    const cells = a.cells.concat(b.cells).sort(numeric);
    return {
      technique: XZ_ID,
      cells: cells,
      placements: [],
      eliminations: targets.map(function (c) { return [c, z]; }),
      i18nKey: 'technique.' + XZ_ID + '.step',
      i18nArgs: {
        digitX: x,
        digitY: z,
        cells: cells.map(function (c) { return SG.model.cellLabel(model, c); })
      }
    };
  }

  // The first Finding of the pair (A, B): x ascending among the restricted common digits, z ascending among
  // the other common digits.
  function xzOfPair(model, state, ctx, work, a, b) {
    if (sharesCell(a.cells, b.cells)) return null;
    const common = commonDigits(a.digits, b.digits);
    if (common.length < 2) return null;
    for (let i = 0; i < common.length; i++) {
      if (!restrictedCommon(model, a, b, common[i])) continue;
      for (let k = 0; k < common.length; k++) {
        if (k === i) continue;
        chargeUnit(work, ctx);
        const targets = xzTargets(model, state, ctx, work, a, b, common[k]);
        if (targets.length > 0) return xzFinding(model, a, b, common[i], common[k], targets);
      }
    }
    return null;
  }

  // Every pair of records, A before B by record index; one unit is charged before each pair.
  function xzSearch(model, state, ctx, work, records) {
    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        chargeUnit(work, ctx);
        const found = xzOfPair(model, state, ctx, work, records[i], records[j]);
        if (found !== null) return found;
      }
    }
    return null;
  }

  // The seam of the tests, shared by both finders: no options, or a plain object.
  function finderSeam(opts) {
    if (opts === undefined) return {};
    if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
      throw invalidOption('opts', 'must be an object');
    }
    return opts;
  }

  function findXz(model, state, ctx, opts) {
    const seam = finderSeam(opts);
    const work = createWork(seam.workLimit);
    let found = null;
    let retained = 0;
    let recordsCut = false;
    try {
      const enumerated = enumerate(model, state, ctx, work, seam.limits);
      retained = enumerated.records.length;
      recordsCut = enumerated.capHit === 'records';
      if (enumerated.capHit === null && !enumerated.complete) {
        // The parent budget ended the enumeration: no Finding, even if a recheck now passes.
        ctx.check();
      } else if (enumerated.capHit !== 'work') {
        ctx.check();
        found = xzSearch(model, state, ctx, work, enumerated.records);
        ctx.check();
      }
    } catch (err) {
      found = null;
      if (err !== XZ_CAP && !(err && err.code === 'budget.exceeded')) throw err;
    }
    const observer = ctx.options ? ctx.options.onPatternWork : undefined;
    if (typeof observer === 'function') {
      observer({
        id: XZ_ID,
        work: work.used,
        limit: work.limit,
        capHit: work.capped ? 'work' : recordsCut ? 'records' : null,
        retained: retained
      });
    }
    return found;
  }

  // The roles of the units of a model (metadata only): a line is a row or a column, a box a box or a region.
  const SDC_LINE = 1;
  const SDC_BOX = 2;

  function sdcRoles(model) {
    const roles = new Uint8Array(model.units.length);
    for (let u = 0; u < roles.length; u++) {
      const meta = model.unitMeta[u];
      const kind = meta ? meta.kind : undefined;
      if (kind === 'row' || kind === 'col') roles[u] = SDC_LINE;
      else if (kind === 'box' || kind === 'region') roles[u] = SDC_BOX;
    }
    return roles;
  }

  // One unit of Sue de Coq's guard; a refused unit ends the call.
  function chargeSdc(work, ctx) {
    if (!spend(work, ctx)) throw SDC_CAP;
  }

  // Asks the parent budget now and counts that as a check, so the next 256 units run from here.
  function checkpoint(ctx, work) {
    ctx.check();
    work.checkedAt = work.used;
  }

  // Phase 1. The (line, box) pairs that share at least two open cells, by line index then box index, each
  // with its open shared cells ascending. One unit per cell of each box visited (ascending), solved cells
  // included; the lines that meet the box come from model.cellUnits on the way.
  function sdcGeometry(model, state, ctx, work, roles) {
    const pairs = [];
    for (let v = 0; v < roles.length; v++) {
      if (roles[v] !== SDC_BOX) continue;
      const cells = Array.from(model.units[v]).sort(numeric);
      const shared = new Map();
      for (let i = 0; i < cells.length; i++) {
        chargeSdc(work, ctx);
        const c = cells[i];
        if (state.value[c] !== 0) continue;
        const us = model.cellUnits[c];
        for (let k = 0; k < us.length; k++) {
          if (roles[us[k]] !== SDC_LINE) continue;
          const list = shared.get(us[k]);
          if (list === undefined) shared.set(us[k], [c]);
          else list.push(c);
        }
      }
      shared.forEach(function (list, line) {
        if (list.length >= 2) pairs.push({ line: line, box: v, shared: list });
      });
    }
    return pairs.sort(function (a, b) { return a.line - b.line || a.box - b.box; });
  }

  function holdsAll(model, unit, cells) {
    for (let k = 1; k < cells.length; k++) {
      if (model.cellUnits[cells[k]].indexOf(unit) === -1) return false;
    }
    return true;
  }

  // Phase 3. One unit per retained record, in record order: its digit mask, and the lines and the boxes that
  // hold all its cells (lists of record indexes, in record order). A record has no unit of its own.
  function sdcClassify(model, ctx, work, roles, records) {
    const info = [];
    const lineHomes = new Map();
    const boxHomes = new Map();
    for (let i = 0; i < records.length; i++) {
      chargeSdc(work, ctx);
      const record = records[i];
      let mask = 0;
      for (let k = 0; k < record.digits.length; k++) mask |= 1 << (record.digits[k] - 1);
      info.push({ record: record, mask: mask, size: record.cells.length });
      const first = model.cellUnits[record.cells[0]];
      for (let k = 0; k < first.length; k++) {
        const u = first[k];
        if (roles[u] === 0 || !holdsAll(model, u, record.cells)) continue;
        const homes = roles[u] === SDC_LINE ? lineHomes : boxHomes;
        const list = homes.get(u);
        if (list === undefined) homes.set(u, [i]);
        else list.push(i);
      }
    }
    return { info: info, lineHomes: lineHomes, boxHomes: boxHomes };
  }

  // The records of a home list that lie wholly outside the other unit, in list order; one unit per record
  // tested, rejected or not.
  function sdcOutside(ctx, work, classes, homes, other) {
    const out = [];
    if (homes === undefined) return out;
    for (let i = 0; i < homes.length; i++) {
      chargeSdc(work, ctx);
      const cells = classes.info[homes[i]].record.cells;
      let outside = true;
      for (let k = 0; k < cells.length && outside; k++) outside = !other.has(cells[k]);
      if (outside) out.push(homes[i]);
    }
    return out;
  }

  // The targets of a valid witness: one unit per distinct cell of U and V (ascending), then the cell is read.
  function sdcTargets(state, ctx, work, scope, proving, aMask, bMask, zMask) {
    const out = [];
    for (let i = 0; i < scope.cells.length; i++) {
      chargeSdc(work, ctx);
      const c = scope.cells[i];
      if (state.value[c] !== 0 || proving.has(c)) continue;
      let mask = 0;
      if (scope.inLine.has(c)) mask |= aMask | zMask;
      if (scope.inBox.has(c)) mask |= bMask | zMask;
      SG.bits.forEach(mask & state.candidates[c], function (d) { out.push([c, d]); });
    }
    return out;
  }

  function sdcFinding(model, pair, tuple, a, b, zMask, targets) {
    return {
      technique: SDC_ID,
      cells: tuple.concat(a.record.cells, b.record.cells).sort(numeric),
      placements: [],
      eliminations: targets,
      i18nKey: 'technique.' + SDC_ID + (zMask === 0 ? '.step' : '.step.extra'),
      i18nArgs: {
        digits: a.record.digits.slice(),
        partDigits: b.record.digits.slice(),
        forced: SG.bits.toArray(zMask),
        line: model.unitMeta[pair.line].label,
        box: model.unitMeta[pair.box].label
      }
    };
  }

  // The first Finding of one I (a tuple of the pair's shared cells): the A side, then the B side, filtered
  // once for the digits inside C, then every (A, B) in that order.
  function sdcTuple(model, state, ctx, work, classes, pair, scope, sides, tuple) {
    chargeSdc(work, ctx);
    let union = 0;
    for (let k = 0; k < tuple.length; k++) union |= state.candidates[tuple[k]];
    const candidates = [[], []];
    [sides.a, sides.b].forEach(function (side, which) {
      for (let i = 0; i < side.length; i++) {
        chargeSdc(work, ctx);
        if ((classes.info[side[i]].mask & ~union) === 0) candidates[which].push(classes.info[side[i]]);
      }
    });
    const total = popcount(union);
    for (let i = 0; i < candidates[0].length; i++) {
      for (let j = 0; j < candidates[1].length; j++) {
        chargeSdc(work, ctx);
        const a = candidates[0][i];
        const b = candidates[1][j];
        if ((a.mask & b.mask) !== 0 || total !== tuple.length + a.size + b.size) continue;
        const zMask = union & ~a.mask & ~b.mask;
        const proving = new Set(tuple.concat(a.record.cells, b.record.cells));
        const targets = sdcTargets(state, ctx, work, scope, proving, a.mask, b.mask, zMask);
        if (targets.length > 0) return sdcFinding(model, pair, tuple, a, b, zMask, targets);
      }
    }
    return null;
  }

  // The tuples of `size` cells of `cells`, in ascending lexicographic order, streamed (one reused array); the
  // first visit that returns a Finding ends the walk.
  function sdcEachTuple(cells, size, visit) {
    const picked = new Array(size);
    function walk(depth, from) {
      for (let i = from; i <= cells.length - (size - depth); i++) {
        picked[depth] = cells[i];
        const out = depth + 1 === size ? visit(picked) : walk(depth + 1, i + 1);
        if (out !== null) return out;
      }
      return null;
    }
    return walk(0, 0);
  }

  // Phases 4 to 9: the pairs in order; for each, the two lists of outside records, then I of 2 cells before
  // 3.
  function sdcSearch(model, state, ctx, work, pairs, classes) {
    const sets = new Map();
    const setOf = function (u) {
      let set = sets.get(u);
      if (set === undefined) {
        set = new Set(model.units[u]);
        sets.set(u, set);
      }
      return set;
    };
    for (let p = 0; p < pairs.length; p++) {
      const pair = pairs[p];
      chargeSdc(work, ctx);
      const inLine = setOf(pair.line);
      const inBox = setOf(pair.box);
      const scope = {
        cells: Array.from(new Set(Array.from(inLine).concat(Array.from(inBox)))).sort(numeric),
        inLine: inLine,
        inBox: inBox
      };
      const sides = {
        a: sdcOutside(ctx, work, classes, classes.lineHomes.get(pair.line), scope.inBox),
        b: sdcOutside(ctx, work, classes, classes.boxHomes.get(pair.box), scope.inLine)
      };
      if (sides.a.length === 0 || sides.b.length === 0) continue;
      for (let size = 2; size <= 3 && size <= pair.shared.length; size++) {
        const found = sdcEachTuple(pair.shared, size, function (tuple) {
          return sdcTuple(model, state, ctx, work, classes, pair, scope, sides, tuple);
        });
        if (found !== null) return found;
      }
    }
    return null;
  }

  function findSueDeCoq(model, state, ctx, opts) {
    const seam = finderSeam(opts);
    const work = createWork(seam.workLimit === undefined ? SDC_WORK_LIMIT : seam.workLimit);
    // an invalid override is refused even when the geometry ends the call before the enumeration
    resolveLimits(seam.limits);
    let found = null;
    let retained = 0;
    let recordsCut = false;
    try {
      checkpoint(ctx, work);
      const roles = sdcRoles(model);
      const pairs = sdcGeometry(model, state, ctx, work, roles);
      checkpoint(ctx, work);
      if (pairs.length > 0) {
        const enumerated = enumerate(model, state, ctx, work, seam.limits);
        retained = enumerated.records.length;
        recordsCut = enumerated.capHit === 'records';
        if (enumerated.capHit === null && !enumerated.complete) {
          // The parent budget ended the enumeration: no Finding, even if a recheck now passes.
          ctx.check();
        } else if (enumerated.capHit !== 'work') {
          checkpoint(ctx, work);
          const classes = sdcClassify(model, ctx, work, roles, enumerated.records);
          checkpoint(ctx, work);
          found = sdcSearch(model, state, ctx, work, pairs, classes);
          ctx.check();
        }
      }
    } catch (err) {
      found = null;
      if (err !== SDC_CAP && !(err && err.code === 'budget.exceeded')) throw err;
    }
    const observer = ctx.options ? ctx.options.onPatternWork : undefined;
    if (typeof observer === 'function') {
      observer({
        id: SDC_ID,
        work: work.used,
        limit: work.limit,
        capHit: work.capped ? 'work' : recordsCut ? 'records' : null,
        retained: retained
      });
    }
    return found;
  }

  SG.alsPatterns = {
    enumerate: enumerate,
    createWork: createWork,
    spend: spend,
    findXz: findXz,
    findSueDeCoq: findSueDeCoq,
    LIMITS: LIMITS
  };

  // The registered finders take no options: they always run with the production limits.
  if (!SG.techniques.has(XZ_ID)) {
    SG.techniques.register({
      id: XZ_ID,
      group: 'chain',
      baseCost: 106,
      order: 194,
      i18nKey: 'technique.' + XZ_ID,
      variantScope: null,
      assumesUniqueness: false,
      find: function (model, state, ctx) { return findXz(model, state, ctx); }
    });
  }
  if (!SG.techniques.has(SDC_ID)) {
    SG.techniques.register({
      id: SDC_ID,
      group: 'chain',
      baseCost: 112,
      order: 196,
      i18nKey: 'technique.' + SDC_ID,
      variantScope: null,
      assumesUniqueness: false,
      find: function (model, state, ctx) { return findSueDeCoq(model, state, ctx); }
    });
  }
})(typeof self !== 'undefined' ? self : globalThis);
