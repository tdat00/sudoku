/**
 * The boards the player can rebuild without a `model` block: the classic 4x4 (2x2 boxes), 6x6 (boxes of 2 rows
 * x 3 columns) and 9x9 (3x3 boxes), and the four overlapping boards (Samurai, Sohei, Butterfly, Flower).
 *
 * The player has no variant registry. These builders are what a plain text puzzle (a line of 16, 36 or
 * 81 characters), the text export of the generator (clues only) and a classic document without a `model`
 * block are played on. They build the same boards as the generator's variants (cell (r, c) of a classic board
 * is index r * D + c; units are rows, then columns, then boxes, labelled R1.., C1.., B1.. - or G1-R1.. on an
 * overlapping board), so a puzzle has the same cells and the same hint texts whichever way it arrived.
 *
 * Pure data, no DOM, no randomness.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first definition on repeated loads.
  if (SG.classicModel && typeof SG.classicModel.build === 'function') return;

  /** Box shape (rows x columns) of each supported size, and the variant id the board is known by. */
  const SIZES = Object.freeze({
    4: Object.freeze({ variantId: 'classic4', boxRows: 2, boxCols: 2 }),
    6: Object.freeze({ variantId: 'classic6', boxRows: 2, boxCols: 3 }),
    9: Object.freeze({ variantId: 'classic9', boxRows: 3, boxCols: 3 })
  });

  /** The side lengths that have a classic board. */
  const DIGITS = Object.freeze([4, 6, 9]);

  /**
   * @param {number} digits  4, 6 or 9.
   * @returns {?string} The variant id of that size ('classic4' ...), null for any other number.
   */
  function variantIdOf(digits) {
    return Object.prototype.hasOwnProperty.call(SIZES, digits) ? SIZES[digits].variantId : null;
  }

  /**
   * Builds the classic model of a side length.
   * @param {number} digits  4, 6 or 9.
   * @returns {PuzzleModel}
   * @throws {SG.errors.GenerationError} 'model.invalidSpec' for any other size.
   */
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

  /**
   * The overlapping boards (design.md sections 4 and 5.2 of the generator): the canvas size and the [row, col]
   * of every 9x9 sub-grid. They are fixed per variant, so the board of a puzzle that arrives as clues only
   * (the generator's text export) can be rebuilt from the variant alone.
   */
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

  /** @returns {boolean} Whether `variantId` is one of the overlapping boards (samurai, sohei, ...). */
  function isMultigrid(variantId) {
    return typeof variantId === 'string' && hasOwn(MULTIGRID, variantId);
  }

  /** @returns {boolean} Whether the player can build the board of `variantId` without a `model` block. */
  function buildable(variantId) {
    return isMultigrid(variantId) || Object.keys(SIZES).some(function (d) {
      return SIZES[d].variantId === variantId;
    });
  }

  /** @returns {?Object} `{ rows, cols, cells, origins }` of an overlapping board, null for any other id. */
  function geometryOf(variantId) {
    return isMultigrid(variantId) ? MULTIGRID[variantId] : null;
  }

  /**
   * Builds an overlapping board, the way the generator does: sub-grid 0 owns the indices 0..80 in its own
   * row-major order, every later sub-grid adds only the canvas positions no earlier grid covers (row-major),
   * and cells on one canvas position share one index. Units are rows, columns and boxes of each sub-grid
   * (labelled G1-R1 ...); every 3x3 box position that two or more sub-grids share is an `overlap` overlay.
   * @param {string} variantId  'samurai' | 'sohei' | 'butterfly' | 'flower'.
   * @returns {PuzzleModel}
   * @throws {SG.errors.GenerationError} 'model.invalidSpec' for any other id.
   */
  function buildMultigrid(variantId) {
    if (!isMultigrid(variantId)) {
      throw new SG.errors.GenerationError('model.invalidSpec', { reason: 'no overlapping board ' + variantId });
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

  /** Builds the board of a variant that needs no `model` block: classic 4 / 6 / 9 or an overlapping board. */
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
