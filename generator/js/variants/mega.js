/**
 * Mega variants: mega12 (12x12, boxes of 3 rows x 4 columns) and mega16 (16x16, 4x4 boxes) - design.md 8.6.
 *
 * Both boards are classic grids with bigger boxes, so the generic engine runs unchanged: a candidate mask
 * of 16 digits still fits in the low 16 bits of an int32 (digit 16 is bit 15, which keeps it positive).
 * Everything that differs from classic9 is data: the box shape, the symbol set and the generator tuning.
 *
 * Symbols are a presentation concern. The core only ever sees the integers 1..D, and
 * `model.symbols.labels[v - 1]` is the text a renderer draws for value v. The set is the `symbolSet`
 * option of the variant:
 *   mega12  'letters' (default)  1-9, A, B, C      'numbers'  1-12
 *   mega16  'hex' (default)      0-9, A-F          'letters'  1-9, A-G
 * Mind the 'hex' set: its first label is '0' and it belongs to the value 1. The value 0 of a solve state
 * still means "empty", and the givens array still uses 0 for an empty cell.
 *
 * Layout data for the renderer (`model.layout`): rows = cols = D, cellRow / cellCol, and `cellRegion` = the
 * box index, boxes numbered row-major (mega12: 4 box rows x 3 box columns, mega16: 4 x 4). Units come as
 * the D rows, the D columns and the D boxes: 36 units for mega12, 48 for mega16. A 16x16 board is 256
 * cells, so a 'full' trace is still allowed (the pipeline downgrades it above 300 cells).
 *
 * Generation tuning (measured on 5000 seeds per board, see the task report):
 *  - `fastSeed` fills the boxes on the diagonal of the box grid with random permutations. They share no
 *    row and no column, so the fill cannot fail; it fixes a quarter of the board before the search starts
 *    and cuts the mean time of a full grid by about 30 %.
 *  - `restartThreshold` is the number of failed guesses after which the search of the full grid starts
 *    over with a fresh random stream. Backtracking on a 16x16 board has a heavy tail (a few seeds in a
 *    thousand need thousands of guesses), and a restart is cheap, so the threshold is far below the
 *    generic default of cellCount * 50. It is a field of the variant definition for the generator to
 *    read; `SG.fullGrid.generate` takes the same number as its `restartThreshold` option.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  function digitsThenLetters(count) {
    const labels = [];
    for (let v = 1; v <= count; v++) labels.push(v <= 9 ? String(v) : String.fromCharCode(55 + v));
    return labels;
  }

  function hexadecimal(count) {
    const labels = [];
    for (let v = 0; v < count; v++) labels.push(v.toString(16).toUpperCase());
    return labels;
  }

  function plainNumbers(count) {
    const labels = [];
    for (let v = 1; v <= count; v++) labels.push(String(v));
    return labels;
  }

  /**
   * @typedef {Object} MegaSpec
   * @property {string} id
   * @property {number} boxRows   Rows of one box.
   * @property {number} boxCols   Columns of one box; boxRows * boxCols = D.
   * @property {string[]} difficultySupport
   * @property {number} restartThreshold  Failed guesses per attempt of the full grid search.
   * @property {Array<{value: string, make: function(number): string[]}>} symbolSets
   *           The first is the default; `make(D)` returns the labels of the values 1..D.
   */

  /**
   * Levels: design.md section 9.1 gives mega12 and mega16 budgets up to 'hard' only. Measured with the
   * pipeline (100 seeds per level and board), every one of them is hit exactly, far inside those budgets.
   */
  const LEVELS = Object.freeze(['veryEasy', 'easy', 'medium', 'hard']);

  /** @type {Object<string, MegaSpec>} */
  const SPECS = Object.freeze({
    mega12: Object.freeze({
      id: 'mega12',
      boxRows: 3,
      boxCols: 4,
      difficultySupport: LEVELS,
      restartThreshold: 300,
      symbolSets: Object.freeze([
        Object.freeze({ value: 'letters', make: digitsThenLetters }),
        Object.freeze({ value: 'numbers', make: plainNumbers })
      ])
    }),
    mega16: Object.freeze({
      id: 'mega16',
      boxRows: 4,
      boxCols: 4,
      difficultySupport: LEVELS,
      restartThreshold: 400,
      symbolSets: Object.freeze([
        Object.freeze({ value: 'hex', make: hexadecimal }),
        Object.freeze({ value: 'letters', make: digitsThenLetters })
      ])
    })
  });

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  function labelsOf(spec, setId) {
    const id = setId === undefined || setId === null ? spec.symbolSets[0].value : setId;
    const found = spec.symbolSets.filter(function (s) { return s.value === id; })[0];
    if (found === undefined) throw fail('pipeline.invalidOption', { option: 'symbolSet', value: String(id) });
    return found.make(spec.boxRows * spec.boxCols);
  }

  /**
   * Labels of a symbol set of a mega variant.
   * @param {string} variantId  'mega12' or 'mega16'.
   * @param {string} [setId]    A symbol set of that variant; missing: its default.
   * @returns {string[]} labels[v - 1] is the symbol of value v.
   * @throws {SG.errors.GenerationError} 'pipeline.invalidOption' for an unknown set.
   */
  function symbolLabels(variantId, setId) {
    return labelsOf(SPECS[variantId], setId);
  }

  /**
   * Builds a square board whose boxes are `boxRows` rows by `boxCols` columns, like the classic builder.
   * Cell (r, c) has index r * D + c; units are listed rows, then columns, then boxes.
   * @param {MegaSpec} spec
   * @param {Object} [opts]  Variant options: `symbolSet`, one of the ids of the spec.
   * @returns {PuzzleModel}
   * @throws {SG.errors.GenerationError} 'pipeline.invalidOption' for an unknown symbol set.
   */
  function buildMega(spec, opts) {
    const boxRows = spec.boxRows;
    const boxCols = spec.boxCols;
    const D = boxRows * boxCols;
    const n = D * D;
    const boxesAcross = D / boxCols;
    const labels = labelsOf(spec, opts ? opts.symbolSet : undefined);
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
      variantId: spec.id,
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
      },
      symbols: { mode: 'digits', labels: labels }
    });
  }

  /**
   * Makes the pre-fill of a box shape. The boxes on the diagonal of the box grid (box k down and k across)
   * share no row and no column, so each takes its own random permutation of 1..D and any such fill extends
   * to a complete grid.
   * @param {number} boxRows
   * @param {number} boxCols
   * @returns {function(PuzzleModel, SolveState, Rng): boolean} The `fastSeed` hook of the registry; it
   *          returns false when a cell could not be assigned (it clashes with a fixed cell).
   */
  function makeFastSeed(boxRows, boxCols) {
    const D = boxRows * boxCols;
    const boxesAcross = D / boxCols;
    const diagonal = Math.min(boxesAcross, D / boxRows);
    return function fastSeedDiagonalBoxes(model, state, rng) {
      const region = model.layout.cellRegion;
      const values = new Array(D);
      for (let k = 0; k < diagonal; k++) {
        for (let i = 0; i < D; i++) values[i] = i + 1;
        rng.shuffle(values);
        let slot = 0;
        for (let cell = 0; cell < model.cellCount; cell++) {
          if (region[cell] === k * boxesAcross + k) {
            if (!SG.constraints.assign(model, state, cell, values[slot++])) return false;
          }
        }
      }
      return true;
    };
  }

  /**
   * Option schema of the symbol set. `choices[i].i18nKey` names a choice; `i18nKey` and `hintKey` name the
   * control itself.
   */
  function symbolSetOption(spec) {
    return Object.freeze({
      id: 'symbolSet',
      type: 'select',
      default: spec.symbolSets[0].value,
      choices: Object.freeze(spec.symbolSets.map(function (s) {
        return Object.freeze({ value: s.value, i18nKey: 'option.symbolSet.' + spec.id + '.' + s.value });
      })),
      i18nKey: 'option.symbolSet',
      hintKey: 'option.symbolSet.hint'
    });
  }

  function definition(spec) {
    return {
      id: spec.id,
      i18nKey: 'variant.' + spec.id,
      group: 'mega',
      digits: spec.boxRows * spec.boxCols,
      difficultySupport: spec.difficultySupport,
      defaultSymbolMode: 'digits',
      // Colours and shapes cannot tell 12 or 16 values apart; the symbol set is the `symbolSet` option.
      symbolModes: ['digits'],
      options: Object.freeze([symbolSetOption(spec)]),
      build: function build(opts) { return buildMega(spec, opts); },
      fastSeed: makeFastSeed(spec.boxRows, spec.boxCols),
      restartThreshold: spec.restartThreshold
    };
  }

  /**
   * Strings of this file, in the shape the locale packs merge: `SG.localeFragments` is a list of
   * { en: {key: text}, vi: {key: text} } objects. Both languages carry exactly the same keys.
   */
  const LOCALE_FRAGMENT = {
    en: {
      'variant.mega12': 'Mega Sudoku 12×12',
      'variant.mega12.desc':
        'A 12×12 grid with boxes of 3 rows × 4 columns. Each row, column and box holds all 12 symbols once.',
      'variant.mega16': 'Monster Sudoku 16×16',
      'variant.mega16.desc':
        'A 16×16 grid with 4×4 boxes. Each row, column and box holds all 16 symbols once.',
      'option.symbolSet': 'Symbol set',
      'option.symbolSet.hint':
        'Only changes how the values are drawn. The puzzle and its solution stay the same.',
      'option.symbolSet.mega12.letters': 'Digits and letters (1–9, A, B, C)',
      'option.symbolSet.mega12.numbers': 'Numbers (1–12)',
      'option.symbolSet.mega16.hex': 'Hexadecimal (0–9, A–F)',
      'option.symbolSet.mega16.letters': 'Digits and letters (1–9, A–G)'
    },
    vi: {
      'variant.mega12': 'Sudoku Khổng lồ 12×12',
      'variant.mega12.desc':
        'Lưới 12×12 với các khối 3 hàng × 4 cột. Mỗi hàng, mỗi cột và mỗi khối chứa đủ 12 ký hiệu, mỗi ký ' +
        'hiệu đúng một lần.',
      'variant.mega16': 'Sudoku Quái vật 16×16',
      'variant.mega16.desc':
        'Lưới 16×16 với các khối 4×4. Mỗi hàng, mỗi cột và mỗi khối chứa đủ 16 ký hiệu, mỗi ký hiệu đúng ' +
        'một lần.',
      'option.symbolSet': 'Bộ ký hiệu',
      'option.symbolSet.hint':
        'Chỉ thay đổi cách hiển thị các giá trị. Câu đố và đáp án vẫn giữ nguyên.',
      'option.symbolSet.mega12.letters': 'Chữ số và chữ cái (1–9, A, B, C)',
      'option.symbolSet.mega12.numbers': 'Số (1–12)',
      'option.symbolSet.mega16.hex': 'Thập lục phân (0–9, A–F)',
      'option.symbolSet.mega16.letters': 'Chữ số và chữ cái (1–9, A–G)'
    }
  };

  /**
   * Mega board tools, exposed for tests and tooling.
   * @namespace SG.mega
   */
  SG.mega = SG.mega || {
    SPECS: SPECS,
    symbolLabels: symbolLabels,
    buildMega: buildMega,
    makeFastSeed: makeFastSeed
  };

  // Skipping known ids keeps a second load of this file harmless (no second set of locale strings either).
  let registered = 0;
  [SPECS.mega12, SPECS.mega16].forEach(function (spec) {
    if (!SG.variants.has(spec.id)) {
      SG.variants.register(definition(spec));
      registered++;
    }
  });
  if (registered > 0) {
    SG.localeFragments = SG.localeFragments || [];
    SG.localeFragments.push(LOCALE_FRAGMENT);
  }
})(typeof self !== 'undefined' ? self : globalThis);
