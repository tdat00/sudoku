/**
 * The classic board of the player: 4x4 (2x2 boxes), 6x6 (boxes of 2 rows x 3 columns) and 9x9 (3x3 boxes).
 *
 * The player has no variant registry. This one builder is what a plain text puzzle (a line of 16, 36 or
 * 81 characters) and a classic document without a `model` block are played on. It builds the same board as
 * the generator's classic variants (cell (r, c) is index r * D + c; units are rows, then columns, then
 * boxes, labelled R1.., C1.., B1..), so a puzzle has the same cells and the same hint texts whichever way
 * it arrived.
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
      throw new SG.errors.GenerationError('model.invalidSpec', { reason: 'no classic board of size ' + digits });
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

  SG.classicModel = { DIGITS: DIGITS, variantIdOf: variantIdOf, build: build };
})(typeof self !== 'undefined' ? self : globalThis);
