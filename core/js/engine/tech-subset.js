/**
 * Subset techniques: Naked and Hidden Pair / Triple / Quad (nakedPair, hiddenPair, nakedTriple, hiddenTriple, nakedQuad,
 * hiddenQuad). All six share ONE engine: a subset of size k is a group of k "items" whose combined mask has exactly k bits.
 *
 *   naked   items are the open cells of a unit; an item's mask is its candidate digits. The k cells must hold those k
 *           digits, so every other cell of the unit loses them. Valid in any all-different unit.
 *   hidden  items are the digits still to be placed in a unit; an item's mask is the set of unit positions where the
 *           digit can go. Those k digits must fill those k cells, so the cells lose every other digit. Valid only in a
 *           complete unit (ctx.completeUnits[u] === 1), where each digit occurs exactly once.
 *
 * Degenerate subsets are rejected: a k-subset is reported only when NO proper part of it is already a smaller subset (j
 * items with at most j bits). Otherwise a known naked pair would come back as a naked triple "pair + a cell that is now
 * a naked single"; this also keeps the scoring honest (the cheapest technique that explains a deduction gets the
 * credit). An item with a single bit is such a part of size 1, so naked and hidden singles never take part.
 *
 * Scan order is fixed: units by index, then item combinations ascending (cells by unit position, digits ascending); the
 * first combination that removes a candidate is returned. Works on any unit shape and digit count; state is only read.
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
  let nodes = 0;       // search nodes, only used to space the budget checks
  let openMask = 0;    // positions of the unsolved cells of the unit being scanned

  // Naked mode: collects the open cells with 2..size candidates. Returns the number of items, or 0 when the unit has too
  // few open cells to eliminate anything.
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

  // Hidden mode: collects the digits with 2..size places left in the unit. Returns the number of items, or 0 when the
  // unit has too few open cells to eliminate anything.
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

  // Fixes item `idx` as member `lvl` of the combination and updates the subset unions. False when no combination that
  // starts like this can be valid: the bits of some part exceed `size`, or a proper part is a smaller subset (degenerate).
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

  // Advances `picked` to the next valid combination (depth first, ascending). Call startSearch() first; call again to
  // continue after a combination that led nowhere. False when the combinations are used up.
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

  // Builds the Finding for the combination in `picked`, or null when it would remove nothing. With P the unit positions
  // of the subset cells and D its digits: naked removes D from the other open cells, hidden removes every digit but D
  // from the cells in P.
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
})(typeof self !== 'undefined' ? self : globalThis);
