/**
 * Extra-region variants: `diagonalX` (Sudoku X) and `hyper` (Hyper Sudoku / Windoku).
 *
 * Both are classic9 plus additional all-different units (design.md sections 4.1 and 8.7), so they share one
 * builder and no solver, technique or digger needs to know about them:
 *   - diagonalX adds the two diagonals (2 units, 29 in all);
 *   - hyper adds four 3x3 windows whose top-left corners are (1,1), (1,5), (5,1) and (5,5) (4 units, 31);
 *   - both together (`diagonalX` with `withHyper`, or `hyper` with `withDiagonals`) give the same hybrid
 *     board of 33 units, the unit order and the layout being identical whichever variant it was asked for.
 *
 * Unit order: 9 rows, 9 columns, 9 boxes (exactly as classic9), then the diagonals, then the windows.
 *
 * Renderer note (`model.layout.overlays`): one entry `{ kind, cells }` per extra unit, in the order of the
 * extra units, so `overlays[i]` describes `units[27 + i]`. `kind` is 'diag' for a diagonal (the main one,
 * then the anti-diagonal) and 'window' for a hyper window (reading order of the window corners); `cells` is
 * an Int32Array of cell indices (row-major index r * 9 + c). Shade those cells with a translucent fill:
 * overlays overlap each other (both diagonals share the centre cell, a diagonal crosses windows), so the
 * fills must blend instead of replacing each other. `layout.cellRow` / `cellCol` give each cell's position.
 *
 * Both variants use `unitMeta.kind` 'diag' / 'window' and the labels D1, D2 / W1 .. W4.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const SIZE = 9;
  const BOX = 3;

  /** Top-left (row, column) of the four hyper windows. */
  const WINDOW_ORIGINS = Object.freeze([[1, 1], [1, 5], [5, 1], [5, 5]].map(Object.freeze));

  const KIND_DIAG = 'diag';
  const KIND_WINDOW = 'window';

  /**
   * Levels both boards offer: every one of the nine, nightmare2 included (measured: `node tests/qualify.js`,
   * docs/report-v2/qualification.md).
   */
  const LEVELS = ['veryEasy', 'easy', 'medium', 'hard', 'veryHard', 'expert', 'evil', 'nightmare1',
    'nightmare2'];

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  /** Cells of the main diagonal, then of the anti-diagonal, as row-major indices. */
  function diagonalCells() {
    const main = [];
    const anti = [];
    for (let i = 0; i < SIZE; i++) {
      main.push(i * SIZE + i);
      anti.push(i * SIZE + (SIZE - 1 - i));
    }
    return [main, anti];
  }

  /** Cells of the 3x3 window whose top-left corner is (top, left), in reading order. */
  function windowCells(top, left) {
    const cells = [];
    for (let r = 0; r < BOX; r++) {
      for (let c = 0; c < BOX; c++) cells.push((top + r) * SIZE + left + c);
    }
    return cells;
  }

  /**
   * Builds a 9x9 board with the standard rows, columns and boxes plus the chosen extra units.
   * @param {string} variantId  Id the model carries; use the id of the registered variant.
   * @param {{diagonals: boolean, windows: boolean}} extras  Which extra units to add.
   * @returns {PuzzleModel}
   */
  function buildBoard(variantId, extras) {
    const n = SIZE * SIZE;
    const cellRow = new Int32Array(n);
    const cellCol = new Int32Array(n);
    const cellRegion = new Int32Array(n);
    const units = [];
    const unitMeta = [];
    const overlays = [];
    let r;
    let c;

    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        const cell = r * SIZE + c;
        cellRow[cell] = r;
        cellCol[cell] = c;
        cellRegion[cell] = Math.floor(r / BOX) * BOX + Math.floor(c / BOX);
      }
    }

    for (r = 0; r < SIZE; r++) {
      const cells = [];
      for (c = 0; c < SIZE; c++) cells.push(r * SIZE + c);
      units.push(cells);
      unitMeta.push({ kind: 'row', gridIndex: 0, label: 'R' + (r + 1) });
    }
    for (c = 0; c < SIZE; c++) {
      const cells = [];
      for (r = 0; r < SIZE; r++) cells.push(r * SIZE + c);
      units.push(cells);
      unitMeta.push({ kind: 'col', gridIndex: 0, label: 'C' + (c + 1) });
    }
    for (let b = 0; b < SIZE; b++) {
      units.push(windowCells(Math.floor(b / BOX) * BOX, (b % BOX) * BOX));
      unitMeta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
    }

    function addExtra(cells, kind, label) {
      units.push(cells);
      unitMeta.push({ kind: kind, gridIndex: 0, label: label });
      overlays.push({ kind: kind, cells: cells });
    }
    if (extras.diagonals) {
      diagonalCells().forEach(function (cells, i) { addExtra(cells, KIND_DIAG, 'D' + (i + 1)); });
    }
    if (extras.windows) {
      WINDOW_ORIGINS.forEach(function (origin, i) {
        addExtra(windowCells(origin[0], origin[1]), KIND_WINDOW, 'W' + (i + 1));
      });
    }

    return SG.model.create({
      variantId: variantId,
      digits: SIZE,
      cellCount: n,
      units: units,
      unitMeta: unitMeta,
      layout: {
        rows: SIZE,
        cols: SIZE,
        cellRow: cellRow,
        cellCol: cellCol,
        cellRegion: cellRegion,
        overlays: overlays,
        subGrids: [{ gridIndex: 0, originRow: 0, originCol: 0 }]
      }
    });
  }

  /** Reads a boolean option; a missing value (undefined or null) means false. */
  function readFlag(opts, id) {
    const value = opts ? opts[id] : undefined;
    if (value === undefined || value === null) return false;
    if (typeof value !== 'boolean') {
      throw fail('pipeline.invalidOption', { option: id, value: String(value) });
    }
    return value;
  }

  /**
   * Builds a Diagonal (X) board: 29 units, or 33 with the option `withHyper`.
   * @param {{withHyper?: boolean}} [opts]
   * @returns {PuzzleModel}
   * @throws {SG.errors.GenerationError} 'pipeline.invalidOption' when `withHyper` is not a boolean.
   */
  function buildDiagonalX(opts) {
    return buildBoard('diagonalX', { diagonals: true, windows: readFlag(opts, 'withHyper') });
  }

  /**
   * Builds a Hyper (Windoku) board: 31 units, or 33 with the option `withDiagonals`.
   * @param {{withDiagonals?: boolean}} [opts]
   * @returns {PuzzleModel}
   * @throws {SG.errors.GenerationError} 'pipeline.invalidOption' when `withDiagonals` is not a boolean.
   */
  function buildHyper(opts) {
    return buildBoard('hyper', { diagonals: readFlag(opts, 'withDiagonals'), windows: true });
  }

  /**
   * Calibration of the clue floor (`clueFloorScale`, see "Clue floor per variant" in js/core/difficulty.js).
   * The two hybrids are 9x9 boards with more rules than classic9. With the classic9 floors (29 / 25 / 22
   * clues) the digger stopped at the floor before the puzzle needed a pair technique: medium was hit by 14 %
   * (diagonalX) and 1 % (hyper) of the dug puzzles, so the generator had to dig 7 and 38 puzzles per medium
   * puzzle and missed the level for 11 % of the hyper ones. Where the techniques stop the dig by themselves
   * (21-24 clues, whatever the level) there is no floor to speak of, but the means of the clue counts must
   * still fall with the level, so the floors stay just above that: 24 / 20 / 17 (83 % / 80 % / 80 %) give
   * medium 32..36 %, hard 31..73 % and expert 39..89 % of the dug puzzles. veryHard takes the factor of hard
   * (rating v2; nightmare1/2 take that of evil, which has none).
   */
  const CLUE_FLOOR_SCALE = Object.freeze({ medium: 0.83, hard: 0.8, veryHard: 0.8, expert: 0.8 });

  function definition(id, optionId, build) {
    return {
      id: id,
      i18nKey: 'variant.' + id,
      group: 'extraRegions',
      digits: SIZE,
      difficultySupport: LEVELS.slice(),
      clueFloorScale: CLUE_FLOOR_SCALE,
      defaultSymbolMode: 'digits',
      symbolModes: ['digits', 'letters', 'colors', 'shapes'],
      options: Object.freeze([Object.freeze({
        id: optionId,
        type: 'boolean',
        default: false,
        advanced: true,
        i18nKey: 'variant.' + id + '.' + optionId,
        hintKey: 'variant.' + id + '.' + optionId + '.hint'
      })]),
      build: build
    };
  }

  const DEFINITIONS = [
    definition('diagonalX', 'withHyper', buildDiagonalX),
    definition('hyper', 'withDiagonals', buildHyper)
  ];

  // Skipping known ids keeps a second load of this file harmless (no second set of locale strings either).
  let registered = false;
  DEFINITIONS.forEach(function (def) {
    if (!SG.variants.has(def.id)) {
      SG.variants.register(def);
      registered = true;
    }
  });

  // Locale strings, merged into the language packs by the UI layer.
  if (registered) {
    SG.localeFragments = SG.localeFragments || [];
    SG.localeFragments.push({
      en: {
        'variant.diagonalX': 'Diagonal Sudoku (X)',
        'variant.diagonalX.withHyper': 'Also add the four Hyper windows',
        'variant.diagonalX.withHyper.hint': 'Besides the two diagonals, the four shaded 3×3 windows of ' +
          'Hyper Sudoku must hold each digit from 1 to 9 exactly once. The result is a hybrid with more ' +
          'constraints.',
        'variant.hyper': 'Hyper Sudoku (Windoku)',
        'variant.hyper.withDiagonals': 'Also add the two diagonals',
        'variant.hyper.withDiagonals.hint': 'Besides the four shaded 3×3 windows, both long diagonals ' +
          'must hold each digit from 1 to 9 exactly once. The result is a hybrid with more constraints.'
      },
      vi: {
        'variant.diagonalX': 'Sudoku Đường chéo (X)',
        'variant.diagonalX.withHyper': 'Thêm cả bốn vùng siêu',
        'variant.diagonalX.withHyper.hint': 'Ngoài hai đường chéo, bốn vùng 3×3 được tô màu của Sudoku ' +
          'Siêu vùng cũng phải chứa mỗi chữ số từ 1 đến 9 đúng một lần. Đây là biến thể lai với nhiều ' +
          'ràng buộc hơn.',
        'variant.hyper': 'Sudoku Siêu vùng',
        'variant.hyper.withDiagonals': 'Thêm cả hai đường chéo',
        'variant.hyper.withDiagonals.hint': 'Ngoài bốn vùng 3×3 được tô màu, cả hai đường chéo chính ' +
          'cũng phải chứa mỗi chữ số từ 1 đến 9 đúng một lần. Đây là biến thể lai với nhiều ràng buộc hơn.'
      }
    });
  }

  /**
   * Extra-region tools, exposed for tests and tooling.
   * @namespace SG.extraRegions
   */
  SG.extraRegions = SG.extraRegions || {
    WINDOW_ORIGINS: WINDOW_ORIGINS,
    KIND_DIAG: KIND_DIAG,
    KIND_WINDOW: KIND_WINDOW,
    buildBoard: buildBoard
  };
})(typeof self !== 'undefined' ? self : globalThis);
