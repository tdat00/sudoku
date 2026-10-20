/**
 * Techniques of the `basic` and `locked` groups:
 *
 *   id                 group    baseCost  order
 *   nakedSingle        basic        1       10   a cell with one candidate left
 *   hiddenSingleBox    basic        2       20   a digit with one possible cell in a unit that is no line
 *   hiddenSingleLine   basic        3       30   the same in a row or a column
 *   pointing           locked       7       40   Pointing Pair/Triple (box-like unit -> line)
 *   boxLine            locked       7       50   Box/Line Reduction (line -> box-like unit)
 *
 * Nothing here knows about 3x3 boxes: a "line" is a unit whose `unitMeta.kind` is 'row' or 'col'; every other unit
 * (box, Jigsaw region, diagonal, hyper window, ...) is "box-like". Which units meet is derived from `model.units` and
 * `model.cellUnits` once per model (`geometryOf`), so the techniques work for any digit count and on overlapping
 * multi-grid boards.
 *
 * Soundness rules shared by all five:
 *   - A digit is only forced into a unit when `ctx.completeUnits[u] === 1` (the unit has `digits` cells and is not
 *     `partial`); the unit that receives the eliminations only has to be all-different, which every unit is.
 *   - `state` is only read. It is peer consistent but singles may be pending, so no propagation fixpoint is assumed;
 *     solved cells are skipped and their digits count as already placed.
 *   - One deduction per call, the first in a fixed scan order (unit index, then digit, or pair index). Pointing and
 *     Box/Line need the digit in at least two cells of the intersection; a single possible cell is a hidden single,
 *     which the ladder takes first.
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

  // Geometry (static, in typed arrays so scans allocate nothing): boxUnits (box-like units), lineUnits (rows and
  // columns), pairCount (number of (box-like unit, line) pairs sharing at least 2 cells), pairBox / pairLine (per pair),
  // segEnd (3 * pairCount + 1 offsets into `cells`; pair p owns three consecutive segments from 3p: the shared cells,
  // the box-like unit outside the line, the line outside the box-like unit), cells (the segments back to back).


  const geometries = new WeakMap();

  function isLine(meta) {
    return meta !== undefined && meta !== null && (meta.kind === 'row' || meta.kind === 'col');
  }

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

  function geometryOf(model) {
    let geometry = geometries.get(model);
    if (geometry === undefined) {
      geometry = buildGeometry(model);
      geometries.set(model, geometry);
    }
    return geometry;
  }

  function digitOf(bit) {
    return 32 - Math.clz32(bit);
  }

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

  // Hidden Single over a list of units: in a complete unit a digit that is not placed yet and fits only one open cell goes there.
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

  function findHiddenSingleBox(model, state, ctx) {
    return findHiddenSingle(model, state, ctx, geometryOf(model).boxUnits, 'hiddenSingleBox');
  }

  function findHiddenSingleLine(model, state, ctx) {
    return findHiddenSingle(model, state, ctx, geometryOf(model).lineUnits, 'hiddenSingleLine');
  }

  // Shared scan of Pointing and Box/Line. For a (box-like unit B, line L) pair let X = B and L together, "forced" the
  // unit whose digit must be placed and "target" the unit that loses candidates:
  //   Pointing  forced = B, target = L. All candidates of d in B lie in X, so d sits in X and leaves L \ B.
  //   Box/Line  forced = L, target = B. All candidates of d in L lie in X, so d sits in X and leaves B \ L.
  // The forced unit must be complete; the target only has to be all-different. `mode` is POINTING or BOX_LINE.
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

  function findPointing(model, state, ctx) {
    return findLocked(model, state, ctx, POINTING);
  }

  function findBoxLine(model, state, ctx) {
    return findLocked(model, state, ctx, BOX_LINE);
  }

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
