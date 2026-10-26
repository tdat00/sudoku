/**
 * The boards that can be rebuilt without a `model` block: classic 4x4, 6x6 (2x3 boxes) and 9x9, and the
 * overlapping boards (Samurai, Sohei, Butterfly, Flower). The generator builds its classic variants from this
 * and its overlapping ones the same way (cell (r, c) is index r * D + c; units are rows, columns, boxes,
 * labelled R1.., C1.., B1.. or G1-R1.. when overlapping), so a puzzle has the same cells and hint texts
 * whichever way it arrived.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.classicModel && typeof SG.classicModel.build === 'function') return;

  const SIZES = Object.freeze({
    4: Object.freeze({ variantId: 'classic4', boxRows: 2, boxCols: 2 }),
    6: Object.freeze({ variantId: 'classic6', boxRows: 2, boxCols: 3 }),
    9: Object.freeze({ variantId: 'classic9', boxRows: 3, boxCols: 3 })
  });

  const DIGITS = Object.freeze([4, 6, 9]);

  function variantIdOf(digits) {
    return Object.prototype.hasOwnProperty.call(SIZES, digits) ? SIZES[digits].variantId : null;
  }

  function build(digits) {
    if (variantIdOf(digits) === null) {
      throw new SG.errors.GenerationError('model.invalidSpec',
        { reason: 'no classic board of size ' + digits });
    }
    const size = SIZES[digits];
    const boxRows = size.boxRows;
    const boxCols = size.boxCols;
    const D = digits;
    const n = D * D;
    const boxesAcross = D / boxCols;
    const cellRow = new Int32Array(n);
    const cellCol = new Int32Array(n);
    const cellRegion = new Int32Array(n);
    const units = [];
    const unitMeta = [];
    let r;
    let c;

    for (r = 0; r < D; r++) {
      for (c = 0; c < D; c++) {
        const cell = r * D + c;
        cellRow[cell] = r;
        cellCol[cell] = c;
        cellRegion[cell] = Math.floor(r / boxRows) * boxesAcross + Math.floor(c / boxCols);
      }
    }
    for (r = 0; r < D; r++) {
      const cells = [];
      for (c = 0; c < D; c++) cells.push(r * D + c);
      units.push(cells);
      unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
    }
    for (c = 0; c < D; c++) {
      const cells = [];
      for (r = 0; r < D; r++) cells.push(r * D + c);
      units.push(cells);
      unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
    }
    for (let b = 0; b < D; b++) {
      const top = Math.floor(b / boxesAcross) * boxRows;
      const left = (b % boxesAcross) * boxCols;
      const cells = [];
      for (r = 0; r < boxRows; r++) {
        for (c = 0; c < boxCols; c++) cells.push((top + r) * D + left + c);
      }
      units.push(cells);
      unitMeta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
    }

    return SG.model.create({
      variantId: size.variantId,
      digits: D,
      cellCount: n,
      units: units,
      unitMeta: unitMeta,
      layout: {
        rows: D,
        cols: D,
        cellRow: cellRow,
        cellCol: cellCol,
        cellRegion: cellRegion,
        subGrids: [{ gridIndex: 0, originRow: 0, originCol: 0 }]
      }
    });
  }

  // Canvas size and [row, col] of every 9x9 sub-grid; fixed per variant so a clues-only text of the Export
  // box can be rebuilt.
  const MULTIGRID = Object.freeze({
    samurai: Object.freeze({ rows: 21, cols: 21, cells: 369,
      origins: Object.freeze([[0, 0], [0, 12], [12, 0], [12, 12], [6, 6]]) }),
    sohei: Object.freeze({ rows: 21, cols: 21, cells: 288,
      origins: Object.freeze([[0, 6], [6, 0], [6, 12], [12, 6]]) }),
    butterfly: Object.freeze({ rows: 12, cols: 12, cells: 144,
      origins: Object.freeze([[0, 0], [0, 3], [3, 0], [3, 3]]) }),
    flower: Object.freeze({ rows: 15, cols: 15, cells: 189,
      origins: Object.freeze([[3, 3], [0, 3], [6, 3], [3, 0], [3, 6]]) })
  });

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function isMultigrid(variantId) {
    return typeof variantId === 'string' && hasOwn(MULTIGRID, variantId);
  }

  function buildable(variantId) {
    return isMultigrid(variantId) || Object.keys(SIZES).some(function (d) {
      return SIZES[d].variantId === variantId;
    });
  }

  function geometryOf(variantId) {
    return isMultigrid(variantId) ? MULTIGRID[variantId] : null;
  }

  /**
   * Same construction as the generator: sub-grid 0 owns indices 0..80 in row-major order, each later sub-grid
   * adds only the canvas positions no earlier grid covers, and cells on one canvas position share one index.
   * A 3x3 box position shared by two or more sub-grids is an `overlap` overlay.
   */
  function buildMultigrid(variantId) {
    if (!isMultigrid(variantId)) {
      throw new SG.errors.GenerationError('model.invalidSpec',
        { reason: 'no overlapping board ' + variantId });
    }
    const geo = MULTIGRID[variantId];
    const D = 9;
    const B = 3;
    const rows = geo.rows;
    const cols = geo.cols;
    const slotsAcross = cols / B;
    const at = new Int32Array(rows * cols).fill(-1);
    const coverage = new Uint8Array(rows * cols);
    const cellRow = [];
    const cellCol = [];
    const cellRegion = [];
    const subGrids = [];
    const units = [];
    const unitMeta = [];

    geo.origins.forEach(function (origin, g) {
      const r0 = origin[0];
      const c0 = origin[1];
      let r;
      let c;
      for (r = 0; r < D; r++) {
        for (c = 0; c < D; c++) {
          const pos = (r0 + r) * cols + c0 + c;
          coverage[pos]++;
          if (at[pos] === -1) {
            at[pos] = cellRow.length;
            cellRow.push(r0 + r);
            cellCol.push(c0 + c);
            cellRegion.push(Math.floor((r0 + r) / B) * slotsAcross + Math.floor((c0 + c) / B));
          }
        }
      }
      subGrids.push({ gridIndex: g, originRow: r0, originCol: c0 });
      const prefix = 'G' + (g + 1) + '-';
      for (r = 0; r < D; r++) {
        const cells = [];
        for (c = 0; c < D; c++) cells.push(at[(r0 + r) * cols + c0 + c]);
        units.push(cells);
        unitMeta.push({ kind: 'row', gridIndex: g, label: prefix + 'R' + (r + 1) });
      }
      for (c = 0; c < D; c++) {
        const cells = [];
        for (r = 0; r < D; r++) cells.push(at[(r0 + r) * cols + c0 + c]);
        units.push(cells);
        unitMeta.push({ kind: 'col', gridIndex: g, label: prefix + 'C' + (c + 1) });
      }
      for (let b = 0; b < D; b++) {
        const top = r0 + Math.floor(b / B) * B;
        const left = c0 + (b % B) * B;
        const cells = [];
        for (r = 0; r < B; r++) {
          for (c = 0; c < B; c++) cells.push(at[(top + r) * cols + left + c]);
        }
        units.push(cells);
        unitMeta.push({ kind: 'box', gridIndex: g, label: prefix + 'B' + (b + 1) });
      }
    });

    const overlays = [];
    for (let sr = 0; sr < rows / B; sr++) {
      for (let sc = 0; sc < slotsAcross; sc++) {
        if (coverage[sr * B * cols + sc * B] < 2) continue;
        const cells = [];
        for (let r = 0; r < B; r++) {
          for (let c = 0; c < B; c++) cells.push(at[(sr * B + r) * cols + sc * B + c]);
        }
        overlays.push({ kind: 'overlap', cells: cells });
      }
    }

    return SG.model.create({
      variantId: variantId,
      digits: D,
      cellCount: cellRow.length,
      units: units,
      unitMeta: unitMeta,
      layout: {
        rows: rows,
        cols: cols,
        cellRow: cellRow,
        cellCol: cellCol,
        cellRegion: cellRegion,
        overlays: overlays,
        subGrids: subGrids
      }
    });
  }

  function buildVariant(variantId) {
    if (isMultigrid(variantId)) return buildMultigrid(variantId);
    for (const digits of DIGITS) {
      if (SIZES[digits].variantId === variantId) return build(digits);
    }
    throw new SG.errors.GenerationError('model.invalidSpec', { reason: 'no board for ' + variantId });
  }

  SG.classicModel = {
    DIGITS: DIGITS,
    MULTIGRID: MULTIGRID,
    variantIdOf: variantIdOf,
    build: build,
    buildable: buildable,
    isMultigrid: isMultigrid,
    geometryOf: geometryOf,
    buildMultigrid: buildMultigrid,
    buildVariant: buildVariant
  };
})(typeof self !== 'undefined' ? self : globalThis);
