/**
 * Techniques of the `basic` and `locked` groups (design.md section 6.6, ladder rows 1-5):
 *
 *   id                 group    baseCost  order
 *   nakedSingle        basic        1       10   a cell with one candidate left
 *   hiddenSingleBox    basic        2       20   a digit with one possible cell in a unit that is no line
 *   hiddenSingleLine   basic        3       30   the same in a row or a column
 *   pointing           locked       7       40   Pointing Pair/Triple (box-like unit -> line)
 *   boxLine            locked       7       50   Box/Line Reduction (line -> box-like unit)
 *
 * Nothing here knows about 3x3 boxes or rectangles. A "line" is a unit whose `unitMeta.kind` is 'row' or
 * 'col'; every other unit (box, Jigsaw region, diagonal, hyper window, ...) is "box-like". Which units meet
 * is read from `model.units` and `model.cellUnits` once per model (see `geometryOf`), so the techniques work
 * on every digit count and on overlapping multi-grid boards, where a cell belongs to many units.
 *
 * Soundness rules shared by all five:
 *   - A digit is only forced into a unit when `ctx.completeUnits[u] === 1` (the unit has `digits` cells and
 *     is not `partial`), so a hidden single or a "this digit must stay in the intersection" argument never
 *     uses a unit that may legitimately miss the digit. The unit that receives the eliminations only has to
 *     be all-different, which every unit is.
 *   - `state` is only read. It is peer consistent, but singles may still be pending, so nothing here assumes
 *     a propagation fixpoint; solved cells are skipped and their digits are treated as already placed.
 *   - One deduction per call, the first one in a fixed scan order (unit index, then digit, or pair index).
 *     Pointing and Box/Line need a digit in at least two cells of the intersection; a digit with a single
 *     possible cell is a hidden single, which the ladder takes first.
 *
 * i18nArgs of the Findings (plain data; `unit`, `box` and `line` are the `unitMeta.label` texts):
 *   nakedSingle                     { cell, digit }
 *   hiddenSingleBox / ...Line       { cell, digit, unit, unitKind, unitIndex }
 *   pointing / boxLine              { digit, count, box, line, boxIndex, lineIndex }
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first registration on repeated loads.
  if (SG.techniques.has('nakedSingle')) return;

  const POINTING = 1;
  const BOX_LINE = 2;

  /**
   * Static geometry of a model, in typed arrays so the scans allocate nothing.
   * @typedef {Object} Geometry
   * @property {Int32Array} boxUnits   Indices of the box-like units (kind is neither 'row' nor 'col').
   * @property {Int32Array} lineUnits  Indices of the row and column units.
   * @property {number} pairCount      Number of (box-like unit, line) pairs that share at least 2 cells.
   * @property {Int32Array} pairBox    Per pair: the box-like unit.
   * @property {Int32Array} pairLine   Per pair: the line.
   * @property {Int32Array} segEnd     3 * pairCount + 1 offsets into `cells`. Pair p owns three consecutive
   *           segments starting at 3p: the shared cells, the cells of the box-like unit outside the line and
   *           the cells of the line outside the box-like unit.
   * @property {Int32Array} cells      The segments, back to back.
   */

  /** Models are immutable, so what is derived from one never goes stale. */
  const geometries = new WeakMap();

  function isLine(meta) {
    return meta !== undefined && meta !== null && (meta.kind === 'row' || meta.kind === 'col');
  }

  /**
   * @param {PuzzleModel} model
   * @returns {Geometry}
   */
  function buildGeometry(model) {
    const units = model.units;
    const unitCount = units.length;
    const cellUnits = model.cellUnits;
    const lineFlag = new Uint8Array(unitCount);
    let lineTotal = 0;
    let u;
    for (u = 0; u < unitCount; u++) {
      lineFlag[u] = isLine(model.unitMeta[u]) ? 1 : 0;
      lineTotal += lineFlag[u];
    }
    const boxUnits = new Int32Array(unitCount - lineTotal);
    const lineUnits = new Int32Array(lineTotal);
    let nb = 0;
    let nl = 0;
    for (u = 0; u < unitCount; u++) {
      if (lineFlag[u] === 1) lineUnits[nl++] = u;
      else boxUnits[nb++] = u;
    }

    const pairBox = [];
    const pairLine = [];
    const data = [];
    const ends = [0];
    const common = new Int32Array(unitCount);
    const boxMark = new Int32Array(model.cellCount);
    const lineMark = new Int32Array(model.cellCount);
    let stamp = 0;
    for (let b = 0; b < boxUnits.length; b++) {
      const box = units[boxUnits[b]];
      common.fill(0);
      let i;
      for (i = 0; i < box.length; i++) {
        const us = cellUnits[box[i]];
        for (let k = 0; k < us.length; k++) common[us[k]] += lineFlag[us[k]];
      }
      for (let l = 0; l < lineUnits.length; l++) {
        if (common[lineUnits[l]] < 2) continue;
        const line = units[lineUnits[l]];
        stamp++;
        for (i = 0; i < box.length; i++) boxMark[box[i]] = stamp;
        for (i = 0; i < line.length; i++) lineMark[line[i]] = stamp;
        const shared = [];
        const boxOnly = [];
        const lineOnly = [];
        for (i = 0; i < box.length; i++) (lineMark[box[i]] === stamp ? shared : boxOnly).push(box[i]);
        for (i = 0; i < line.length; i++) if (boxMark[line[i]] !== stamp) lineOnly.push(line[i]);
        if (boxOnly.length === 0 || lineOnly.length === 0) continue;
        pairBox.push(boxUnits[b]);
        pairLine.push(lineUnits[l]);
        [shared, boxOnly, lineOnly].forEach(function (segment) {
          for (let s = 0; s < segment.length; s++) data.push(segment[s]);
          ends.push(data.length);
        });
      }
    }

    return {
      boxUnits: boxUnits,
      lineUnits: lineUnits,
      pairCount: pairBox.length,
      pairBox: Int32Array.from(pairBox),
      pairLine: Int32Array.from(pairLine),
      segEnd: Int32Array.from(ends),
      cells: Int32Array.from(data)
    };
  }

  /**
   * @param {PuzzleModel} model
   * @returns {Geometry}
   */
  function geometryOf(model) {
    let geometry = geometries.get(model);
    if (geometry === undefined) {
      geometry = buildGeometry(model);
      geometries.set(model, geometry);
    }
    return geometry;
  }

  /** @returns {number} The 1-based digit of a mask that has exactly one bit set. */
  function digitOf(bit) {
    return 32 - Math.clz32(bit);
  }

  // ---------------------------------------------------------------------------------------------
  // Naked single
  // ---------------------------------------------------------------------------------------------

  /**
   * Naked Single: an open cell with exactly one candidate left takes that value.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @returns {?Finding}
   */
  function findNakedSingle(model, state) {
    const cand = state.candidates;
    const val = state.value;
    const n = model.cellCount;
    for (let c = 0; c < n; c++) {
      const m = cand[c];
      if (val[c] === 0 && m !== 0 && (m & (m - 1)) === 0) {
        const digit = digitOf(m);
        return {
          technique: 'nakedSingle',
          cells: [c],
          placements: [[c, digit]],
          eliminations: [],
          i18nKey: 'technique.nakedSingle.step',
          i18nArgs: { cell: SG.model.cellLabel(model, c), digit: digit }
        };
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------------------------
  // Hidden singles
  // ---------------------------------------------------------------------------------------------

  /**
   * Hidden Single over a list of units: in a complete unit a digit that is not placed yet and fits only one
   * open cell goes there.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {Object} ctx
   * @param {Int32Array} unitList  The units to scan, ascending.
   * @param {string} id            Technique id of the Finding.
   * @returns {?Finding}
   */
  function findHiddenSingle(model, state, ctx, unitList, id) {
    const cand = state.candidates;
    const val = state.value;
    const complete = ctx.completeUnits;
    const units = model.units;
    for (let k = 0; k < unitList.length; k++) {
      const u = unitList[k];
      if (complete[u] !== 1) continue;
      const cells = units[u];
      let once = 0;
      let twice = 0;
      let placed = 0;
      let i;
      for (i = 0; i < cells.length; i++) {
        const c = cells[i];
        const v = val[c];
        if (v !== 0) {
          placed |= 1 << (v - 1);
        } else {
          const m = cand[c];
          twice |= once & m;
          once |= m;
        }
      }
      const hidden = once & ~twice & ~placed;
      if (hidden === 0) continue;
      const bit = hidden & -hidden;
      for (i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (val[c] === 0 && (cand[c] & bit) !== 0) {
          const meta = model.unitMeta[u];
          const digit = digitOf(bit);
          return {
            technique: id,
            cells: [c],
            placements: [[c, digit]],
            eliminations: [],
            i18nKey: 'technique.' + id + '.step',
            i18nArgs: {
              cell: SG.model.cellLabel(model, c),
              digit: digit,
              unit: meta.label,
              unitKind: meta.kind,
              unitIndex: u
            }
          };
        }
      }
    }
    return null;
  }

  /**
   * Hidden Single (box / region): every unit that is not a row or a column.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {Object} ctx
   * @returns {?Finding}
   */
  function findHiddenSingleBox(model, state, ctx) {
    return findHiddenSingle(model, state, ctx, geometryOf(model).boxUnits, 'hiddenSingleBox');
  }

  /**
   * Hidden Single (row / column).
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {Object} ctx
   * @returns {?Finding}
   */
  function findHiddenSingleLine(model, state, ctx) {
    return findHiddenSingle(model, state, ctx, geometryOf(model).lineUnits, 'hiddenSingleLine');
  }

  // ---------------------------------------------------------------------------------------------
  // Locked candidates: pointing and box/line reduction
  // ---------------------------------------------------------------------------------------------

  /**
   * Shared scan of Pointing and Box/Line. For a (box-like unit B, line L) pair let X = B and L together,
   * "forced" the unit whose digit must be placed and "target" the unit that loses candidates:
   *   Pointing  forced = B, target = L. All candidates of d in B lie in X, so d sits in X and leaves L \ B.
   *   Box/Line  forced = L, target = B. All candidates of d in L lie in X, so d sits in X and leaves B \ L.
   * The forced unit must be complete; the target only has to be all-different.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {Object} ctx
   * @param {number} mode  POINTING or BOX_LINE.
   * @returns {?Finding}
   */
  function findLocked(model, state, ctx, mode) {
    const g = geometryOf(model);
    const cand = state.candidates;
    const val = state.value;
    const complete = ctx.completeUnits;
    const cells = g.cells;
    const segEnd = g.segEnd;
    const forcedOf = mode === POINTING ? g.pairBox : g.pairLine;
    // Segment numbers inside a pair: 0 = shared, 1 = box-like only, 2 = line only.
    const restSeg = mode === POINTING ? 1 : 2;
    const targetSeg = mode === POINTING ? 2 : 1;

    for (let p = 0; p < g.pairCount; p++) {
      if (complete[forcedOf[p]] !== 1) continue;
      const base = 3 * p;
      let once = 0;
      let twice = 0;
      let placed = 0;
      let i;
      let c;
      for (i = segEnd[base]; i < segEnd[base + 1]; i++) {
        c = cells[i];
        if (val[c] !== 0) {
          placed |= 1 << (val[c] - 1);
        } else {
          twice |= once & cand[c];
          once |= cand[c];
        }
      }
      if (twice === 0) continue;

      let outside = 0;
      for (i = segEnd[base + restSeg]; i < segEnd[base + restSeg + 1]; i++) {
        c = cells[i];
        if (val[c] !== 0) placed |= 1 << (val[c] - 1);
        else outside |= cand[c];
      }
      let digits = twice & ~outside & ~placed;
      if (digits === 0) continue;

      let reachable = 0;
      for (i = segEnd[base + targetSeg]; i < segEnd[base + targetSeg + 1]; i++) {
        c = cells[i];
        if (val[c] === 0) reachable |= cand[c];
      }
      digits &= reachable;
      if (digits === 0) continue;

      return lockedFinding(model, state, g, p, mode, digitOf(digits & -digits));
    }
    return null;
  }

  /** Builds the Finding of `findLocked` for pair `p` and the 1-based `digit`. */
  function lockedFinding(model, state, g, p, mode, digit) {
    const cand = state.candidates;
    const val = state.value;
    const bit = 1 << (digit - 1);
    const base = 3 * p;
    const targetSeg = mode === POINTING ? 2 : 1;
    const shared = [];
    const eliminations = [];
    let i;
    for (i = g.segEnd[base]; i < g.segEnd[base + 1]; i++) {
      const c = g.cells[i];
      if (val[c] === 0 && (cand[c] & bit) !== 0) shared.push(c);
    }
    for (i = g.segEnd[base + targetSeg]; i < g.segEnd[base + targetSeg + 1]; i++) {
      const c = g.cells[i];
      if (val[c] === 0 && (cand[c] & bit) !== 0) eliminations.push([c, digit]);
    }
    const id = mode === POINTING ? 'pointing' : 'boxLine';
    return {
      technique: id,
      cells: shared,
      placements: [],
      eliminations: eliminations,
      i18nKey: 'technique.' + id + '.step',
      i18nArgs: {
        digit: digit,
        count: shared.length,
        box: model.unitMeta[g.pairBox[p]].label,
        line: model.unitMeta[g.pairLine[p]].label,
        boxIndex: g.pairBox[p],
        lineIndex: g.pairLine[p]
      }
    };
  }

  /**
   * Pointing Pair/Triple: all candidates of a digit in a box-like unit lie in one row or column, so the digit
   * is removed from the rest of that line.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {Object} ctx
   * @returns {?Finding}
   */
  function findPointing(model, state, ctx) {
    return findLocked(model, state, ctx, POINTING);
  }

  /**
   * Box/Line Reduction: all candidates of a digit in a row or column lie in one box-like unit, so the digit
   * is removed from the rest of that unit.
   * @param {PuzzleModel} model
   * @param {SolveState} state
   * @param {Object} ctx
   * @returns {?Finding}
   */
  function findBoxLine(model, state, ctx) {
    return findLocked(model, state, ctx, BOX_LINE);
  }

  // ---------------------------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------------------------

  [
    { id: 'nakedSingle', group: 'basic', baseCost: 1, order: 10, find: findNakedSingle },
    { id: 'hiddenSingleBox', group: 'basic', baseCost: 2, order: 20, find: findHiddenSingleBox },
    { id: 'hiddenSingleLine', group: 'basic', baseCost: 3, order: 30, find: findHiddenSingleLine },
    { id: 'pointing', group: 'locked', baseCost: 7, order: 40, find: findPointing },
    { id: 'boxLine', group: 'locked', baseCost: 7, order: 50, find: findBoxLine }
  ].forEach(function (def) {
    SG.techniques.register({
      id: def.id,
      group: def.group,
      baseCost: def.baseCost,
      order: def.order,
      i18nKey: 'technique.' + def.id,
      variantScope: null,
      assumesUniqueness: false,
      find: def.find
    });
  });
})(typeof self !== 'undefined' ? self : globalThis);
