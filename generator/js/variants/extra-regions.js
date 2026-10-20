/**
 * Extra-region variants: `diagonalX` (Sudoku X) and `hyper` (Hyper Sudoku / Windoku).
 *
 * Both are classic9 plus additional all-different units, so they share one builder and no solver, technique
 * or digger needs to know about them: diagonalX adds the two diagonals (29 units), hyper adds four 3x3
 * windows with top-left corners (1,1), (1,5), (5,1), (5,5) (31 units); both together give the same 33-unit
 * hybrid whichever variant it was asked for. Unit order: rows, columns, boxes, diagonals, windows.
 *
 * `model.layout.overlays[i]` is `{ kind: 'diag' | 'window', cells: Int32Array }` and describes `units[27 + i]`.
 * Overlays overlap each other (the diagonals share the centre cell, a diagonal crosses windows), so the
 * renderer must shade them with translucent fills that blend.
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

  /** Both boards offer every level, hell2 included (measured: `node tests/qualify.js`). */
  const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1',
    'hell2'];

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  /** Main diagonal, then anti-diagonal, as row-major indices. */
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

  /** Builds a 9x9 board with the standard rows, columns and boxes plus the chosen extra units. */
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
   * @throws {SG.errors.GenerationError} 'pipeline.invalidOption' when `withHyper` is not a boolean.
   */
  function buildDiagonalX(opts) {
    return buildBoard('diagonalX', { diagonals: true, windows: readFlag(opts, 'withHyper') });
  }

  /**
   * Builds a Hyper (Windoku) board: 31 units, or 33 with the option `withDiagonals`.
   * @throws {SG.errors.GenerationError} 'pipeline.invalidOption' when `withDiagonals` is not a boolean.
   */
  function buildHyper(opts) {
    return buildBoard('hyper', { diagonals: readFlag(opts, 'withDiagonals'), windows: true });
  }

  /**
   * Calibration of the clue floor (`clueFloorScale`, see "Clue floor per variant" in js/engine/difficulty.js).
   * With the classic9 floors (29 / 25 / 22 clues) the digger stopped at the floor before these harder 9x9
   * boards needed a pair technique, so normal was rarely reached. Floors of 24 / 20 / 17 (83 % / 80 % / 80 %)
   * sit just above where the techniques stop the dig by themselves, which keeps the mean clue count falling
   * with the level. expert takes the factor of hard; hell1/2 take that of nightmare, which has none.
   */
  const CLUE_FLOOR_SCALE = Object.freeze({ normal: 0.83, hard: 0.8, expert: 0.8, master: 0.8 });

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

  // Skipping known ids keeps a second load harmless (no second set of locale strings either).
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

  /** Extra-region tools, exposed for tests and tooling. */
  SG.extraRegions = SG.extraRegions || {
    WINDOW_ORIGINS: WINDOW_ORIGINS,
    KIND_DIAG: KIND_DIAG,
    KIND_WINDOW: KIND_WINDOW,
    buildBoard: buildBoard
  };
})(typeof self !== 'undefined' ? self : globalThis);
