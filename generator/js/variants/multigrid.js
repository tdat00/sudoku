/**
 * Overlapping multi-grid variants: samurai, sohei, butterfly and flower.
 *
 * Every board is a set of ordinary 9x9 sub-grids on one shared canvas. Cells at the same canvas position
 * are the SAME cell (one index), so an overlap needs no special solver: the units of both grids simply list
 * that index and the board is one larger constraint satisfaction problem.
 *
 * Geometry. Sub-grid origins and the canvas are multiples of 3, so every overlap is made of whole 3x3 boxes
 * and a box of one grid is a box of every other grid that covers it. Each geometry carries the number of
 * unique cells it must produce; `buildModel` checks both and throws on any mismatch. The checked counts are
 * arithmetic: samurai 369, sohei 288 (4 x 81 - 4 x 9 shared boxes), butterfly 144, flower 189 (the 15x15
 * canvas minus four empty 3x3 corners). The origins are the real layouts (Sudopedia, Gattai); the 324 and 225
 * once quoted for sohei and flower are not unique cell counts of those layouts.
 *
 * Layout data for the renderer (`model.layout`):
 *   rows, cols        canvas size in cells
 *   cellRow, cellCol  canvas position of every cell
 *   cellRegion        canvas box slot: floor(row / 3) * (cols / 3) + floor(col / 3). One id per 3x3 box
 *                     position, so an overlapped box has ONE id although two grids own it
 *   subGrids          [{ gridIndex, originRow, originCol }], each a 9x9 square on the canvas
 *   overlays          one { kind: 'overlap', cells } per 3x3 box that belongs to two or more sub-grids
 * Units come grid by grid: rows, columns, boxes of grid 0, then of grid 1, ... (27 per grid;
 * unitMeta.gridIndex names the grid), so the boxes of an overlap appear once per grid.
 *
 * Generation. The generic engine needs no multi-grid code; the only hook is `fastSeed`, which decides the
 * cells several grids share before the search starts (`fastSeedOverlaps`). Hole digging is the default
 * 'cells' strategy; symmetry works on canvas positions, so it mirrors about the centre of the whole canvas
 * and a group simply shrinks where the mirrored position holds no cell.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const DIGITS = 9;
  const BOX = 3;

  /**
   * @typedef {Object} MultigridGeometry
   * @property {number} rows      Canvas height, a multiple of 3.
   * @property {number} cols      Canvas width, a multiple of 3.
   * @property {Array<Array<number>>} origins  [row, col] of every 9x9 sub-grid, multiples of 3.
   * @property {number} cells     Number of unique cells the geometry must produce.
   */

  function freezeGeometry(g) {
    g.origins.forEach(function (o) { Object.freeze(o); });
    Object.freeze(g.origins);
    return Object.freeze(g);
  }

  /** The four boards (see the file header for the cell counts). */
  const GEOMETRIES = Object.freeze({
    samurai: freezeGeometry({
      rows: 21, cols: 21, cells: 369,
      origins: [[0, 0], [0, 12], [12, 0], [12, 12], [6, 6]]
    }),
    sohei: freezeGeometry({
      rows: 21, cols: 21, cells: 288,
      origins: [[0, 6], [6, 0], [6, 12], [12, 6]]
    }),
    butterfly: freezeGeometry({
      rows: 12, cols: 12, cells: 144,
      origins: [[0, 0], [0, 3], [3, 0], [3, 3]]
    }),
    flower: freezeGeometry({
      rows: 15, cols: 15, cells: 189,
      origins: [[3, 3], [0, 3], [6, 3], [3, 0], [3, 6]]
    })
  });

  function invalidGeometry(variantId, reason) {
    const err = new SG.errors.GenerationError('multigrid.invalidGeometry',
      { variantId: String(variantId), reason: reason });
    err.message = 'multigrid.invalidGeometry: ' + variantId + ': ' + reason;
    return err;
  }

  function isMultipleOfBox(x) {
    return Number.isInteger(x) && x % BOX === 0;
  }

  /**
   * Checks a geometry and returns how often each canvas position is covered by a sub-grid.
   * @returns {{coverage: Uint8Array, cells: number}}  Coverage per canvas position (row * cols + col) and
   *          the number of positions covered at least once.
   * @throws {SG.errors.GenerationError} 'multigrid.invalidGeometry' when the canvas or an origin is not a
   *         multiple of 3, a sub-grid leaves the canvas, an origin repeats, or the unique cell count differs
   *         from `geometry.cells`.
   */
  function measure(variantId, geometry) {
    if (!geometry || typeof geometry !== 'object') throw invalidGeometry(variantId, 'geometry is missing');
    const rows = geometry.rows;
    const cols = geometry.cols;
    if (!(isMultipleOfBox(rows) && rows > 0 && isMultipleOfBox(cols) && cols > 0)) {
      throw invalidGeometry(variantId, 'the canvas ' + rows + 'x' + cols +
        ' is not a positive multiple of ' + BOX + ' in both directions');
    }
    if (!Array.isArray(geometry.origins) || geometry.origins.length === 0) {
      throw invalidGeometry(variantId, 'origins must list at least one sub-grid');
    }
    const coverage = new Uint8Array(rows * cols);
    const seen = new Set();
    geometry.origins.forEach(function (origin, g) {
      if (!Array.isArray(origin) || origin.length !== 2) {
        throw invalidGeometry(variantId, 'origin ' + g + ' must be a [row, col] pair');
      }
      const r0 = origin[0];
      const c0 = origin[1];
      if (!(isMultipleOfBox(r0) && isMultipleOfBox(c0))) {
        throw invalidGeometry(variantId, 'origin ' + g + ' (' + r0 + ',' + c0 + ') is not a multiple of ' +
          BOX + ', so its boxes would not line up with the overlapping grid');
      }
      if (r0 < 0 || c0 < 0 || r0 + DIGITS > rows || c0 + DIGITS > cols) {
        throw invalidGeometry(variantId, 'sub-grid ' + g + ' at (' + r0 + ',' + c0 +
          ') does not fit on the ' + rows + 'x' + cols + ' canvas');
      }
      const key = r0 + ',' + c0;
      if (seen.has(key)) throw invalidGeometry(variantId, 'origin (' + key + ') is listed twice');
      seen.add(key);
      for (let r = 0; r < DIGITS; r++) {
        for (let c = 0; c < DIGITS; c++) coverage[(r0 + r) * cols + c0 + c]++;
      }
    });
    let cells = 0;
    for (let i = 0; i < coverage.length; i++) if (coverage[i] > 0) cells++;
    if (cells !== geometry.cells) {
      throw invalidGeometry(variantId, 'the sub-grids cover ' + cells + ' unique cells, expected ' +
        geometry.cells);
    }
    return { coverage: coverage, cells: cells };
  }

  /**
   * Builds the model of a multi-grid board (`geometry` defaults to `SG.multigrid.GEOMETRIES[variantId]`).
   *
   * Cell numbering: sub-grid 0 owns the indices 0..80 in its own row-major order; every later sub-grid adds
   * only the canvas positions no earlier grid covers, again row-major. Cells on one canvas position share one
   * index, which is the whole multi-grid mechanism.
   * @throws {SG.errors.GenerationError} 'multigrid.invalidGeometry', see `measure`.
   */
  function buildModel(variantId, geometry) {
    const geo = geometry !== undefined ? geometry : GEOMETRIES[variantId];
    const measured = measure(variantId, geo);
    const rows = geo.rows;
    const cols = geo.cols;
    const slotsAcross = cols / BOX;

    const at = new Int32Array(rows * cols).fill(-1);
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
      for (r = 0; r < DIGITS; r++) {
        for (c = 0; c < DIGITS; c++) {
          const pos = (r0 + r) * cols + c0 + c;
          if (at[pos] === -1) {
            at[pos] = cellRow.length;
            cellRow.push(r0 + r);
            cellCol.push(c0 + c);
            cellRegion.push(Math.floor((r0 + r) / BOX) * slotsAcross + Math.floor((c0 + c) / BOX));
          }
        }
      }
      subGrids.push({ gridIndex: g, originRow: r0, originCol: c0 });

      const prefix = 'G' + (g + 1) + '-';
      for (r = 0; r < DIGITS; r++) {
        const cells = [];
        for (c = 0; c < DIGITS; c++) cells.push(at[(r0 + r) * cols + c0 + c]);
        units.push(cells);
        unitMeta.push({ kind: 'row', gridIndex: g, label: prefix + 'R' + (r + 1) });
      }
      for (c = 0; c < DIGITS; c++) {
        const cells = [];
        for (r = 0; r < DIGITS; r++) cells.push(at[(r0 + r) * cols + c0 + c]);
        units.push(cells);
        unitMeta.push({ kind: 'col', gridIndex: g, label: prefix + 'C' + (c + 1) });
      }
      for (let b = 0; b < DIGITS; b++) {
        const top = r0 + Math.floor(b / BOX) * BOX;
        const left = c0 + (b % BOX) * BOX;
        const cells = [];
        for (r = 0; r < BOX; r++) {
          for (c = 0; c < BOX; c++) cells.push(at[(top + r) * cols + left + c]);
        }
        units.push(cells);
        unitMeta.push({ kind: 'box', gridIndex: g, label: prefix + 'B' + (b + 1) });
      }
    });

    if (cellRow.length !== measured.cells) {
      throw invalidGeometry(variantId, 'built ' + cellRow.length + ' cells but measured ' + measured.cells);
    }

    // One overlay per 3x3 box position that two or more sub-grids share.
    const overlays = [];
    for (let sr = 0; sr < rows / BOX; sr++) {
      for (let sc = 0; sc < slotsAcross; sc++) {
        if (measured.coverage[sr * BOX * cols + sc * BOX] < 2) continue;
        const cells = [];
        for (let r = 0; r < BOX; r++) {
          for (let c = 0; c < BOX; c++) cells.push(at[(sr * BOX + r) * cols + sc * BOX + c]);
        }
        overlays.push({ kind: 'overlap', cells: cells });
      }
    }

    return SG.model.create({
      variantId: variantId,
      digits: DIGITS,
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

  /** Per model: the cells that belong to two or more sub-grids, grouped by how many grids share them. */
  const seedPlans = new WeakMap();

  function seedPlan(model) {
    let plan = seedPlans.get(model);
    if (plan === undefined) {
      const tiers = [];
      for (let c = 0; c < model.cellCount; c++) {
        const grids = model.cellUnits[c].length / 3;
        if (grids < 2) continue;
        while (tiers.length < grids + 1) tiers.push([]);
        tiers[grids].push(c);
      }
      plan = { tiers: tiers.reverse(), scratch: SG.model.initState(model) };
      seedPlans.set(model, plan);
    }
    return plan;
  }

  /**
   * Pre-fill of the full grid generator (the `fastSeed` hook): decides the cells that several sub-grids share
   * first, most shared first, each with a random value that survives propagation. Shared cells are the most
   * constrained ones and tie the grids together, so the search then starts from a board in which the grids
   * no longer disagree about them.
   * @returns {boolean} False when some shared cell had no value left (the generator then drops the seed).
   */
  function fastSeedOverlaps(model, state, rng) {
    const plan = seedPlan(model);
    const scratch = plan.scratch;
    for (let t = 0; t < plan.tiers.length; t++) {
      const cells = plan.tiers[t].slice();
      rng.shuffle(cells);
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (state.value[cell] !== 0) continue;
        const values = rng.shuffle(SG.bits.toArray(state.candidates[cell]));
        let placed = false;
        for (let k = 0; k < values.length && !placed; k++) {
          SG.model.cloneState(state, scratch);
          if (SG.constraints.place(model, state, cell, values[k])) placed = true;
          else SG.model.cloneState(scratch, state);
        }
        if (!placed) return false;
      }
    }
    return true;
  }

  SG.multigrid = {
    DIGITS: DIGITS,
    GEOMETRIES: GEOMETRIES,
    measure: measure,
    buildModel: buildModel,
    fastSeedOverlaps: fastSeedOverlaps
  };

  /**
   * Calibration of the clue floor (`clueFloorScale`, see "Clue floor per variant" in js/engine/difficulty.js).
   * The derived floor (classic9 numbers x cellCount / 81) stops the digger before the techniques of the
   * level do: every shared box carries the clues of two grids, so the puzzle stays solvable with singles and
   * normal was hit by only 2..9 % of the dug puzzles. With 60 % of the floor the dig ends where the
   * techniques end and 38..49 % of the dug puzzles are normal. The floor of veryEasy stays: its score band
   * is so low that the puzzle needs the clues. Flower additionally keeps 80 % for easy. expert takes the
   * factor of hard.
   */
  const CLUE_FLOOR_SCALE = Object.freeze({ normal: 0.6, hard: 0.6, expert: 0.6 });
  const FLOWER_CLUE_FLOOR_SCALE = Object.freeze({ easy: 0.8, normal: 0.6, hard: 0.6, expert: 0.6 });

  function definition(id, levels, extra) {
    return Object.assign({
      id: id,
      i18nKey: 'variant.' + id,
      group: 'multigrid',
      digits: DIGITS,
      difficultySupport: levels,
      clueFloorScale: CLUE_FLOOR_SCALE,
      defaultSymbolMode: 'digits',
      symbolModes: ['digits', 'letters', 'colors', 'shapes'],
      options: [],
      build: function build() { return buildModel(id); },
      fastSeed: fastSeedOverlaps
    }, extra);
  }

  /**
   * Levels each board is offered: all nine, hell2 included (measured: `node tests/qualify.js`; the top tiers
   * come from the fast proposal dig refined into the band). A missed level still returns a valid puzzle,
   * flagged 'difficulty.approximate'.
   */
  const STANDARD_LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1',
    'hell2'];

  const DEFINITIONS = [
    definition('samurai', STANDARD_LEVELS),
    definition('sohei', STANDARD_LEVELS),
    definition('butterfly', STANDARD_LEVELS),
    definition('flower', STANDARD_LEVELS, { clueFloorScale: FLOWER_CLUE_FLOOR_SCALE })
  ];

  /** Locale strings in the shape the locale packs merge; both languages carry exactly the same keys. */
  const LOCALE_FRAGMENT = {
    en: {
      'variant.samurai': 'Samurai Sudoku',
      'variant.samurai.desc':
        'Five overlapping 9×9 grids: the centre grid shares one 3×3 box with each corner grid (369 cells).',
      'variant.sohei': 'Sohei Sudoku',
      'variant.sohei.desc':
        'Four 9×9 grids in a ring: each grid shares a 3×3 box with the two grids beside it (288 cells).',
      'variant.butterfly': 'Butterfly Sudoku',
      'variant.butterfly.desc':
        'Four 9×9 grids, each shifted by one box, overlapping in a central 6×6 area (144 cells).',
      'variant.flower': 'Flower Sudoku',
      'variant.flower.desc':
        'Five 9×9 grids: four petals around a centre grid, overlapping very densely (189 cells).',
      'error.multigrid.invalidGeometry': 'The layout of the {variantId} board is invalid: {reason}'
    },
    vi: {
      'variant.samurai': 'Sudoku Samurai',
      'variant.samurai.desc':
        'Năm lưới 9×9 chồng lên nhau: lưới giữa dùng chung một khối 3×3 với mỗi lưới ở góc (369 ô).',
      'variant.sohei': 'Sudoku Sohei',
      'variant.sohei.desc':
        'Bốn lưới 9×9 xếp thành vòng: mỗi lưới dùng chung một khối 3×3 với hai lưới kề bên (288 ô).',
      'variant.butterfly': 'Sudoku Cánh bướm',
      'variant.butterfly.desc':
        'Bốn lưới 9×9 lệch nhau một khối, chồng lên vùng trung tâm 6×6 (144 ô).',
      'variant.flower': 'Sudoku Bông hoa',
      'variant.flower.desc':
        'Năm lưới 9×9: bốn cánh hoa quanh một lưới trung tâm, chồng lên nhau rất dày (189 ô).',
      'error.multigrid.invalidGeometry': 'Bố cục của bàn {variantId} không hợp lệ: {reason}'
    }
  };

  // Skipping known ids keeps a second load harmless.
  let registered = 0;
  DEFINITIONS.forEach(function (def) {
    if (!SG.variants.has(def.id)) {
      SG.variants.register(def);
      registered++;
    }
  });
  if (registered > 0) {
    SG.localeFragments = SG.localeFragments || [];
    SG.localeFragments.push(LOCALE_FRAGMENT);
  }
})(typeof self !== 'undefined' ? self : globalThis);
