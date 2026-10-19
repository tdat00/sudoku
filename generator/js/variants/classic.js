/**
 * Classic variants: classic4 (2x2 boxes), classic6 (boxes of 2 rows x 3 columns) and classic9 (3x3 boxes).
 * One builder, parameterised by the box size, serves all three.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  /**
   * Builds a square grid whose boxes are `boxRows` rows by `boxCols` columns.
   * Cell (r, c) has index r * D + c; units are listed rows, then columns, then boxes (27 units for 9x9).
   */
  function buildClassic(variantId, boxRows, boxCols) {
    const D = boxRows * boxCols;
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
      variantId: variantId,
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
   * Full grid pre-fill for classic9: the three boxes on the main diagonal share no row or column, so each
   * can take an independent random permutation. Any such filling extends to a complete grid.
   * @returns {boolean} False when a cell could not be assigned (for example it clashes with a fixed cell).
   */
  function fastSeedDiagonalBoxes(model, state, rng) {
    const D = model.digits;
    const region = model.layout.cellRegion;
    const values = new Array(D);
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < D; i++) values[i] = i + 1;
      rng.shuffle(values);
      let slot = 0;
      for (let cell = 0; cell < model.cellCount; cell++) {
        if (region[cell] === k * 4) {
          if (!SG.constraints.assign(model, state, cell, values[slot++])) return false;
        }
      }
    }
    return true;
  }

  function definition(id, boxRows, boxCols, levels, fastSeed) {
    const def = {
      id: id,
      i18nKey: 'variant.' + id,
      group: 'classic',
      digits: boxRows * boxCols,
      difficultySupport: levels,
      defaultSymbolMode: 'digits',
      symbolModes: ['digits', 'letters', 'colors', 'shapes'],
      options: [],
      build: function build() { return buildClassic(id, boxRows, boxCols); }
    };
    if (fastSeed) def.fastSeed = fastSeed;
    return def;
  }

  /**
   * The levels each board offers are measured, not assumed (`node tests/qualify.js`, docs/report-v2/qualification.md).
   * classic4: a 4x4 board never needs more than singles. classic6: puzzles either need singles only or jump
   * straight to a fish or subset worth a hard score. classic9: everything up to hell1 (hell2 was reached in 7 of 23).
   */
  const DEFINITIONS = [
    definition('classic4', 2, 2, ['veryEasy']),
    definition('classic6', 2, 3, ['veryEasy', 'hard']),
    definition('classic9', 3, 3, ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare',
      'hell1'], fastSeedDiagonalBoxes)
  ];

  // Skipping known ids keeps a second load of this file harmless.
  DEFINITIONS.forEach(function (def) {
    if (!SG.variants.has(def.id)) SG.variants.register(def);
  });
})(typeof self !== 'undefined' ? self : globalThis);
