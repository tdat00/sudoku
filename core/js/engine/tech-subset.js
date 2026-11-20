/**
 * Subset techniques: Naked and Hidden Pair / Triple / Quad (nakedPair, hiddenPair, nakedTriple, hiddenTriple,
 * nakedQuad, hiddenQuad). All six share ONE engine: a subset of size k is a group of k "items" whose combined
 * mask has exactly k bits.
 *
 *   naked   items are the open cells of a unit; an item's mask is its candidate digits. The k cells must hold
 *           those k digits, so every other cell of the unit loses them. Valid in any all-different unit.
 *   hidden  items are the digits still to be placed in a unit; an item's mask is the set of unit positions
 *           where the digit can go. Those k digits must fill those k cells, so the cells lose every other
 *           digit. Valid only in a complete unit (ctx.completeUnits[u] === 1), where each digit occurs
 *           exactly once.
 *
 * Degenerate subsets are rejected: a k-subset is reported only when NO proper part of it is already a smaller
 * subset (j items with at most j bits). Otherwise a known naked pair would come back as a naked triple "pair
 * + a cell that is now a naked single"; this also keeps the scoring honest (the cheapest technique that
 * explains a deduction gets the credit). An item with a single bit is such a part of size 1, so naked and
 * hidden singles never take part.
 *
 * Scan order is fixed: units by index, then item combinations ascending (cells by unit position, digits
 * ascending); the first combination that removes a candidate is returned. Works on any unit shape and digit
 * count; state is only read.
 *
 * The law-of-leftovers finder at the end of the file (SG.leftoverPatterns, Jigsaw only) is a separate engine
 * with its own tables; it is registered as `lawOfLeftovers` (group locked, order 87, scope jigsaw9).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const popcount = SG.bits.popcount;
  const lowestBitIndex = SG.bits.lowestBitIndex;

  const MAX_SIZE = 4;
  /** Unit positions are kept in an int32 mask, so a longer unit (never valid: D <= 16) is not scanned. */
  const MAX_UNIT = 30;
  // The enumeration asks the budget once per this many search nodes (a power of two).
  const CHECK_EVERY = 256;

  const BIT_COUNT = new Uint8Array(1 << MAX_SIZE);
  for (let s = 1; s < BIT_COUNT.length; s++) BIT_COUNT[s] = BIT_COUNT[s >> 1] + (s & 1);

  // Scratch shared by every call. find() is synchronous and never re-entered, so one set is enough and the
  // scan allocates nothing until it has something to report.
  const itemMask = new Int32Array(32);   // mask of each eligible item
  const itemRef = new Int32Array(32);    // naked: position of the cell in the unit; hidden: 0-based digit
  const digitPositions = new Int32Array(32); // hidden: unit positions where each digit can still go
  const picked = new Int32Array(MAX_SIZE);   // indices into the item list: the combination being tried
  const unionOf = new Int32Array(1 << MAX_SIZE); // unionOf[s] = OR of the masks of the picked items in s
  let level = 0;       // index in `picked` of the item being advanced
  let nodes = 0;       // search nodes of the current find(), only used to space the budget checks
  let openMask = 0;    // positions of the unsolved cells of the unit being scanned

  // Naked mode: collects the open cells with 2..size candidates. Returns the number of items, or 0 when the
  // unit has too few open cells to eliminate anything.
  function collectCells(cells, value, cand, size) {
    let open = 0;
    let count = 0;
    openMask = 0;
    for (let p = 0; p < cells.length; p++) {
      const c = cells[p];
      if (value[c] !== 0) continue;
      open++;
      openMask |= 1 << p;
      const mask = cand[c];
      const bits = popcount(mask);
      if (bits >= 2 && bits <= size) {
        itemMask[count] = mask;
        itemRef[count] = p;
        count++;
      }
    }
    return open > size ? count : 0;
  }

  // Hidden mode: collects the digits with 2..size places left in the unit. Returns the number of items, or 0
  // when the unit has too few open cells to eliminate anything.
  function collectDigits(cells, value, cand, digits, size) {
    let open = 0;
    let count = 0;
    let placed = 0;
    openMask = 0;
    digitPositions.fill(0, 0, digits);
    for (let p = 0; p < cells.length; p++) {
      const c = cells[p];
      if (value[c] !== 0) {
        placed |= 1 << (value[c] - 1);
        continue;
      }
      open++;
      openMask |= 1 << p;
      const here = 1 << p;
      for (let rest = cand[c]; rest !== 0; rest &= rest - 1) digitPositions[lowestBitIndex(rest)] |= here;
    }
    if (open <= size) return 0;
    for (let d = 0; d < digits; d++) {
      if ((placed & (1 << d)) !== 0) continue;
      const mask = digitPositions[d];
      const bits = popcount(mask);
      if (bits >= 2 && bits <= size) {
        itemMask[count] = mask;
        itemRef[count] = d;
        count++;
      }
    }
    return count;
  }

  // Fixes item `idx` as member `lvl` of the combination and updates the subset unions. False when no
  // combination that starts like this can be valid: the bits of some part exceed `size`, or a proper part is
  // a smaller subset (degenerate).
  function extend(lvl, idx, size) {
    const mask = itemMask[idx];
    const base = 1 << lvl;
    for (let s = 0; s < base; s++) {
      const union = unionOf[s] | mask;
      unionOf[s | base] = union;
      const members = BIT_COUNT[s] + 1;
      const bits = popcount(union);
      if (bits > size || (members < size ? bits <= members : bits !== size)) return false;
    }
    return true;
  }

  function startSearch() {
    level = 0;
    picked[0] = -1;
  }

  // Advances `picked` to the next valid combination (depth first, ascending). Call startSearch() first; call
  // again to continue after a combination that led nowhere. False when the combinations are used up.
  function nextCombination(count, size, ctx) {
    while (level >= 0) {
      const idx = ++picked[level];
      if (idx > count - (size - level)) {
        level--;
        continue;
      }
      if ((++nodes & (CHECK_EVERY - 1)) === 0) ctx.check();
      if (!extend(level, idx, size)) continue;
      if (level === size - 1) return true;
      level++;
      picked[level] = idx;
    }
    return false;
  }

  // Builds the Finding for the combination in `picked`, or null when it would remove nothing. With P the unit
  // positions of the subset cells and D its digits: naked removes D from the other open cells, hidden removes
  // every digit but D from the cells in P.
  function conclude(model, u, cand, def) {
    const size = def.size;
    const hidden = def.hidden;
    const cells = model.units[u];
    const merged = unionOf[(1 << size) - 1];
    let ref = 0;
    for (let i = 0; i < size; i++) ref |= 1 << itemRef[picked[i]];
    const positions = hidden ? merged : ref;
    const digitMask = hidden ? ref : merged;
    const targets = hidden ? positions : openMask & ~positions;
    const drop = hidden ? ~digitMask : digitMask;

    let rest = targets;
    while (rest !== 0 && (cand[cells[lowestBitIndex(rest)]] & drop) === 0) rest &= rest - 1;
    if (rest === 0) return null;

    const subsetCells = [];
    const labels = [];
    for (rest = positions; rest !== 0; rest &= rest - 1) {
      const c = cells[lowestBitIndex(rest)];
      subsetCells.push(c);
      labels.push(SG.model.cellLabel(model, c));
    }
    const eliminations = [];
    for (rest = targets; rest !== 0; rest &= rest - 1) {
      const c = cells[lowestBitIndex(rest)];
      for (let extra = cand[c] & drop; extra !== 0; extra &= extra - 1) {
        eliminations.push([c, lowestBitIndex(extra) + 1]);
      }
    }
    const meta = model.unitMeta[u];
    return {
      technique: def.id,
      cells: subsetCells,
      placements: [],
      eliminations: eliminations,
      i18nKey: def.stepKey,
      i18nArgs: {
        size: size,
        unit: meta.label,
        unitKind: meta.kind,
        digits: SG.bits.toArray(digitMask),
        cells: labels
      }
    };
  }

  function findSubset(model, state, ctx, def) {
    const size = def.size;
    const hidden = def.hidden;
    const units = model.units;
    const complete = ctx.completeUnits;
    const cand = state.candidates;
    const value = state.value;
    nodes = 0;
    for (let u = 0; u < units.length; u++) {
      ctx.check();
      const cells = units[u];
      if (cells.length > MAX_UNIT || (hidden && complete[u] !== 1)) continue;
      const count = hidden ? collectDigits(cells, value, cand, model.digits, size)
        : collectCells(cells, value, cand, size);
      if (count < size) continue;
      startSearch();
      while (nextCombination(count, size, ctx)) {
        const finding = conclude(model, u, cand, def);
        if (finding !== null) return finding;
      }
    }
    return null;
  }

  // id, subset size, hidden?, base cost, order (see techniques.js).
  const LADDER = [
    ['nakedPair', 2, false, 9, 60],
    ['hiddenPair', 2, true, 11, 70],
    ['nakedTriple', 3, false, 15, 80],
    ['hiddenTriple', 3, true, 18, 90],
    ['nakedQuad', 4, false, 24, 100],
    ['hiddenQuad', 4, true, 24, 105]
  ];

  LADDER.forEach(function (row) {
    const def = {
      id: row[0],
      size: row[1],
      hidden: row[2],
      stepKey: 'technique.' + row[0] + '.step'
    };
    if (SG.techniques.has(def.id)) return;
    SG.techniques.register({
      id: def.id,
      group: 'subset',
      baseCost: row[3],
      order: row[4],
      i18nKey: 'technique.' + def.id,
      variantScope: null,
      assumesUniqueness: false,
      find: function (model, state, ctx) { return findSubset(model, state, ctx, def); }
    });
  });

  // ---------------------------------------------------------------------------------------------------------
  // Law of leftovers (rating v3, R17): the complete-support finder, registered as `lawOfLeftovers` (MS14b:
  // group locked, order 87, base cost 20, scope jigsaw9, no uniqueness assumption; the weight is in
  // difficulty.js). SG.leftoverPatterns.find is the same finder with the work-limit seam of the tests. It
  // shares no scratch with the subset scan above: every call allocates its own small tables.
  //
  // In a Jigsaw, n complete rows (or columns) that share no cell hold every digit exactly n times, and so
  // do n complete regions that share no cell. Take both with the same n and set aside the cells they share:
  // the cells each choice has left over (the difference sets A, on the line side, and B, on the region side)
  // hold the same MULTISET of digits, with repeated and fixed digits counted, not just the same digits.
  //
  // For one choice of units, every assignment of digits to the cells of a side is enumerated: a fixed cell
  // takes its value, an open cell one of its candidates, and cells of the side that see each other take
  // different digits. Ignoring the other cells and the cross-side rules only adds assignments, so the
  // support found is an over-approximation of the real one. A signature is the digit-count vector of an
  // assignment (one count per digit; a bitset of the digits present would lose the repeats). For each
  // signature the digits each cell takes are kept. Only when BOTH enumerations are complete are the
  // signatures intersected; a candidate of an open cell that is not taken in any assignment whose signature
  // both sides have is removed, and only such a candidate. Both complete tables over-approximate every
  // completion, so an empty intersection proves the SUPPLIED candidate state inconsistent (not that the
  // givens are): the whole call declines with no Finding at the first such evaluated choice, it never reads
  // as "no candidate has support", and an enumeration cut short proves nothing of the kind.
  //
  // Choices and their order: n = 1, then 2; rows, then columns, as the line side; the units of a side by
  // unit index, every combination once; for each line side every region side. Only complete units of kind
  // 'row', 'col' (line side) and 'region' (region side) take part, the units of a side share no cell, and
  // each side leaves 1 to 4 cells over (the two sizes are equal: 9n minus the shared cells). A choice with
  // no open cell left over is skipped. The first choice that removes something gives the Finding.
  //
  // Work (R10): a work unit is one tested extension, either a unit tried as the next of a side or a digit
  // tried for the next cell of a side (rejected or not). The limit is 50000 for the whole call and the
  // counter is local to it. A spent limit ends the call with null and capHit 'work': an incomplete
  // enumeration is never read as "no support". The parent budget is checked at entry and before the unit
  // that would carry the work since the last check over 256; a spent budget is "nothing found" (the
  // caller re-checks its own budget), cancellation and every other error propagate. The observer
  // ctx.options.onPatternWork gets { id, work, limit, capHit, retained } of every call that returns.
  //
  // Finding: technique 'lawOfLeftovers', key technique.lawOfLeftovers.step, no placements; cells = the
  // distinct cells left over on both sides (fixed ones and ones with no removal included, the cancelled
  // shared cells not), ascending by cell index; eliminations ascending by cell, then digit; i18nArgs
  // { lines, regions, cells, digits }: the labels of the chosen lines and of the chosen regions (each list
  // by unit index, never by label text), of the cells left over (the same order) and the DISTINCT REMOVED
  // digits (ascending; not a shared signature, and not removed from every listed cell). Every array is the
  // caller's own; the model, the state and the context are only read.
  const LEFTOVER_ID = 'lawOfLeftovers';
  const LEFTOVER_VARIANT = 'jigsaw9';
  const LEFTOVER_LIMITS = Object.freeze({ units: 2, cells: 4, work: 50000 });
  const LEFTOVER_CHECK_UNITS = 256;
  // Counts per digit are packed in one number, digit d at weight RADIX^d: a side has at most
  // LEFTOVER_LIMITS.cells cells, so no count reaches RADIX.
  const SIGNATURE_RADIX = LEFTOVER_LIMITS.cells + 1;
  const LEFTOVER_CAP = Object.freeze({ capHit: 'work' });
  // What a choice returns to end the whole scan with no Finding (an inconsistent position).
  const LEFTOVER_DECLINED = Object.freeze({ declined: true });

  function numeric(a, b) { return a - b; }

  // One work unit; a spent limit throws LEFTOVER_CAP before the unit that would pass it.
  function spendLeftover(run) {
    if (run.work >= run.limit) throw LEFTOVER_CAP;
    if (run.work + 1 - run.checkedAt > LEFTOVER_CHECK_UNITS) {
      run.ctx.check();
      run.checkedAt = run.work;
    }
    run.work++;
  }

  // A difference side: its cells (ascending), the digits each can take (a fixed cell its value, an open cell
  // its candidates) and for each cell a bit per earlier cell of the side that sees it.
  function leftoverSide(model, state, cells) {
    const count = cells.length;
    const masks = new Int32Array(count);
    const seen = new Int32Array(count);
    let open = 0;
    for (let i = 0; i < count; i++) {
      const c = cells[i];
      if (state.value[c] !== 0) {
        masks[i] = 1 << (state.value[c] - 1);
      } else {
        masks[i] = state.candidates[c];
        open++;
      }
      for (let q = 0; q < i; q++) {
        if (model.peers[c].indexOf(cells[q]) !== -1) seen[i] |= 1 << q;
      }
    }
    return { cells: cells, masks: masks, seen: seen, open: open };
  }

  // Every assignment of the side, depth first. Returns a Map: signature -> Int32Array with, per cell of the
  // side, the mask of the digits the cell takes in some assignment of that signature.
  function enumerateLeftoverSide(side, weights, run) {
    const count = side.cells.length;
    const chosen = new Int32Array(count);
    const table = new Map();
    function walk(position, key) {
      if (position === count) {
        let support = table.get(key);
        if (support === undefined) {
          support = new Int32Array(count);
          table.set(key, support);
        }
        for (let i = 0; i < count; i++) support[i] |= 1 << chosen[i];
        return;
      }
      for (let rest = side.masks[position]; rest !== 0; rest &= rest - 1) {
        const digit = lowestBitIndex(rest);
        spendLeftover(run);
        let clash = false;
        for (let q = 0; q < position && !clash; q++) {
          clash = (side.seen[position] & (1 << q)) !== 0 && chosen[q] === digit;
        }
        if (clash) continue;
        chosen[position] = digit;
        walk(position + 1, key + weights[digit]);
      }
    }
    walk(0, 0);
    return table;
  }

  // The removals of one choice of units (the sides A and B, cell lists ascending): a Finding, null when
  // nothing is removed, LEFTOVER_DECLINED when no signature is shared.
  function leftoverConclusion(frame, cellsA, cellsB) {
    const model = frame.model;
    const state = frame.state;
    const sideA = leftoverSide(model, state, cellsA);
    const sideB = leftoverSide(model, state, cellsB);
    if (sideA.open + sideB.open === 0) return null;
    const tableA = enumerateLeftoverSide(sideA, frame.weights, frame.run);
    const tableB = enumerateLeftoverSide(sideB, frame.weights, frame.run);
    const supportA = new Int32Array(cellsA.length);
    const supportB = new Int32Array(cellsB.length);
    let shared = 0;
    tableA.forEach(function (takenA, key) {
      const takenB = tableB.get(key);
      if (takenB === undefined) return;
      shared++;
      for (let i = 0; i < takenA.length; i++) supportA[i] |= takenA[i];
      for (let j = 0; j < takenB.length; j++) supportB[j] |= takenB[j];
    });
    if (shared === 0) return LEFTOVER_DECLINED;

    const eliminations = [];
    [[sideA, supportA], [sideB, supportB]].forEach(function (pair) {
      const side = pair[0];
      for (let i = 0; i < side.cells.length; i++) {
        const c = side.cells[i];
        if (state.value[c] !== 0) continue;
        for (let lost = state.candidates[c] & ~pair[1][i]; lost !== 0; lost &= lost - 1) {
          eliminations.push([c, lowestBitIndex(lost) + 1]);
        }
      }
    });
    if (eliminations.length === 0) return null;
    eliminations.sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; });

    const cells = cellsA.concat(cellsB).sort(numeric);
    const digits = [];
    eliminations.forEach(function (e) {
      if (digits.indexOf(e[1]) === -1) digits.push(e[1]);
    });
    return {
      technique: LEFTOVER_ID,
      cells: cells,
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.' + LEFTOVER_ID + '.step',
      i18nArgs: {
        lines: frame.lineUnits.map(function (u) { return model.unitMeta[u].label; }),
        regions: frame.regionUnits.map(function (u) { return model.unitMeta[u].label; }),
        cells: cells.map(function (c) { return SG.model.cellLabel(model, c); }),
        digits: digits.sort(numeric)
      }
    };
  }

  // Both sides are chosen: the cells each leaves over, when there are 1 to 4 of them.
  function leftoverChoice(frame) {
    const model = frame.model;
    const cellsA = [];
    const cellsB = [];
    let i;
    let k;
    for (i = 0; i < frame.n; i++) {
      const line = model.units[frame.lineUnits[i]];
      for (k = 0; k < line.length; k++) if (frame.inRegion[line[k]] === 0) cellsA.push(line[k]);
      const region = model.units[frame.regionUnits[i]];
      for (k = 0; k < region.length; k++) if (frame.inLine[region[k]] === 0) cellsB.push(region[k]);
    }
    if (cellsA.length > LEFTOVER_LIMITS.cells) return null;
    return leftoverConclusion(frame, cellsA.sort(numeric), cellsB.sort(numeric));
  }

  // Chooses frame.n units of `pool` (ascending, every combination once, none sharing a cell with another one
  // chosen: `mark` holds the cells taken) and calls `then` for each complete choice, until it returns
  // something else than null.
  function chooseLeftoverUnits(frame, pool, mark, chosen, depth, from, then) {
    const last = pool.length - (frame.n - depth);
    for (let i = from; i <= last; i++) {
      spendLeftover(frame.run);
      const cells = frame.model.units[pool[i]];
      let free = true;
      let k;
      for (k = 0; k < cells.length && free; k++) free = mark[cells[k]] === 0;
      if (!free) continue;
      for (k = 0; k < cells.length; k++) mark[cells[k]] = 1;
      chosen[depth] = pool[i];
      const result = depth + 1 < frame.n
        ? chooseLeftoverUnits(frame, pool, mark, chosen, depth + 1, i + 1, then) : then(frame);
      for (k = 0; k < cells.length; k++) mark[cells[k]] = 0;
      if (result !== null) return result;
    }
    return null;
  }

  function chooseLeftoverRegions(frame) {
    return chooseLeftoverUnits(frame, frame.regions, frame.inRegion, frame.regionUnits, 0, 0, leftoverChoice);
  }

  function scanLeftovers(model, state, ctx, run) {
    const rows = [];
    const cols = [];
    const regions = [];
    for (let u = 0; u < model.units.length; u++) {
      if (ctx.completeUnits[u] !== 1) continue;
      const kind = model.unitMeta[u].kind;
      if (kind === 'row') rows.push(u);
      else if (kind === 'col') cols.push(u);
      else if (kind === 'region') regions.push(u);
    }
    const weights = [];
    for (let d = 0; d < model.digits; d++) weights.push(Math.pow(SIGNATURE_RADIX, d));
    const frame = {
      model: model, state: state, run: run, weights: weights, regions: regions, n: 0,
      lineUnits: [], regionUnits: [],
      inLine: new Uint8Array(model.cellCount), inRegion: new Uint8Array(model.cellCount)
    };
    for (let n = 1; n <= LEFTOVER_LIMITS.units; n++) {
      frame.n = n;
      for (let orientation = 0; orientation < 2; orientation++) {
        const found = chooseLeftoverUnits(frame, orientation === 0 ? rows : cols, frame.inLine,
          frame.lineUnits, 0, 0, chooseLeftoverRegions);
        if (found !== null) return found === LEFTOVER_DECLINED ? null : found;
      }
    }
    return null;
  }

  // The seam of the tests: an explicit work limit (absent = LEFTOVER_LIMITS.work, a finite number of at
  // least 0 is floored, anything else is solver.invalidOption). Out of scope the call costs nothing.
  function findLeftovers(model, state, ctx, opts) {
    let limit = LEFTOVER_LIMITS.work;
    const given = opts === undefined || opts === null ? undefined : opts.workLimit;
    if (given !== undefined) {
      if (typeof given !== 'number' || !Number.isFinite(given) || given < 0) {
        const err = new SG.errors.GenerationError('solver.invalidOption',
          { option: 'leftoverPatterns.workLimit' });
        err.message = 'solver.invalidOption: leftoverPatterns workLimit must be a number of at least 0';
        throw err;
      }
      limit = Math.floor(given);
    }
    const run = { ctx: ctx, limit: limit, work: 0, checkedAt: 0, capped: false };
    let found = null;
    try {
      ctx.check();
      if (model.variantId === LEFTOVER_VARIANT) found = scanLeftovers(model, state, ctx, run);
    } catch (err) {
      if (err === LEFTOVER_CAP) run.capped = true;
      else if (!(err && err.code === 'budget.exceeded')) throw err;
    }
    const observer = ctx.options ? ctx.options.onPatternWork : undefined;
    if (typeof observer === 'function') {
      observer({
        id: LEFTOVER_ID,
        work: run.work,
        limit: limit,
        capHit: run.capped ? 'work' : null,
        retained: null
      });
    }
    return found;
  }

  SG.leftoverPatterns = { find: findLeftovers, LIMITS: LEFTOVER_LIMITS };

  // The registered finder takes no options: it always runs with the default work limit.
  if (!SG.techniques.has(LEFTOVER_ID)) {
    SG.techniques.register({
      id: LEFTOVER_ID,
      group: 'locked',
      baseCost: 20,
      order: 87,
      i18nKey: 'technique.' + LEFTOVER_ID,
      variantScope: [LEFTOVER_VARIANT],
      assumesUniqueness: false,
      find: function (model, state, ctx) { return findLeftovers(model, state, ctx); }
    });
  }
})(typeof self !== 'undefined' ? self : globalThis);
