/**
 * Greater-Than Sudoku (design.md sections 5.3, 8.3 and 9.1): a 9x9 Sudoku with inequality signs between
 * neighbouring cells. The signs are part of the model (`model.inequalities`, value[a] < value[b]), and
 * models are immutable, so the variant works in three steps that fit the generator's hooks:
 *
 *   build         the empty board: the classic 9x9 geometry, no signs yet (a sign needs a solution). It is
 *                 what `SG.techHelper.model('greaterThan')` and the full grid step see, and it stays a plain
 *                 Sudoku for them.
 *   postGenerate  step 4 'extraStructure': once the full grid exists, a sign is put on EVERY pair of
 *                 neighbouring cells of one box (option `futoshiki`: of the whole grid), and the model is
 *                 replaced by one that carries them.
 *   digStrategy   step 5 'dig': the registered strategy 'signs' (`digSigns`) digs SIGNS, not cells.
 *
 * The sign dig (design.md section 8.3, one sample):
 *   1. All numeric clues are removed; a few are revealed again so the puzzle can be solved at all, never
 *      fewer than the level's `minClues` (invariant I6) and with the symmetry of the configuration.
 *   2. The signs are shuffled and removed one by one, with the technique-bounded oracle of section 6.8 (4):
 *      a sign stays removed while the puzzle can still be solved by the techniques of the level.
 *   3. Every sign that is still redundant for uniqueness is removed too, with a plain uniqueness check
 *      ("until the uniqueness threshold"). The sign set is then minimal: removing any sign that is left
 *      would give the puzzle a second solution.
 *   4. A puzzle that the techniques of the level cannot finish, or that is rated above the level, is too
 *      hard: one more group of clues is revealed and steps 2 and 3 run again on the signs that are left.
 *
 * The numeric clues follow the symmetry of the configuration; the signs do not (a sign is placed by the
 * solution, so it has no mirror image to keep in step).
 *
 * What a renderer needs (see `signEdges`): per sign `{ a, b }` with value[a] < value[b], a and b being
 * orthogonal neighbours on the canvas. The sign is drawn on their shared edge, at the midpoint of the two
 * cell centres; its apex (the point of the `<`) is on the side of the SMALLER cell a and it opens towards b.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first registration on repeated loads.
  if (SG.greaterThan) return;

  const VARIANT_ID = 'greaterThan';
  const STRATEGY_ID = 'signs';
  const SCOPE_BOX = 'box';
  const SCOPE_GRID = 'grid';
  const SIZE = 9;
  const BOX = 3;

  /** Rounds of "reveal a group of clues, dig the signs again" before a sample gives up on its level. */
  const MAX_TUNE_ROUNDS = 8;

  /** Scope of the signs per model: `postGenerate` only gets the model, so it reads the option from here. */
  const scopes = new WeakMap();

  // ---------------------------------------------------------------------------------------------
  // The board and its signs
  // ---------------------------------------------------------------------------------------------

  /**
   * The classic 9x9 geometry under the id 'greaterThan': rows, columns and 3x3 boxes (27 units in that
   * order, like `classic9`), no inequalities.
   * @returns {PuzzleModel}
   */
  function buildBoard() {
    SG.ineq.ensureExtension();
    const n = SIZE * SIZE;
    const cellRow = new Int32Array(n);
    const cellCol = new Int32Array(n);
    const cellRegion = new Int32Array(n);
    const units = [];
    const unitMeta = [];
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
      const top = Math.floor(b / BOX) * BOX;
      const left = (b % BOX) * BOX;
      const cells = [];
      for (r = 0; r < BOX; r++) {
        for (c = 0; c < BOX; c++) cells.push((top + r) * SIZE + left + c);
      }
      units.push(cells);
      unitMeta.push({ kind: 'box', gridIndex: 0, label: 'B' + (b + 1) });
    }
    return SG.model.create({
      variantId: VARIANT_ID,
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
        subGrids: [{ gridIndex: 0, originRow: 0, originCol: 0 }]
      }
    });
  }

  /**
   * A copy of `model` with another set of signs (models are immutable). Everything else is shared.
   * @param {PuzzleModel} model
   * @param {Array<{a: number, b: number}>} signs  value[a] < value[b] for each.
   * @returns {PuzzleModel}
   */
  function withSigns(model, signs) {
    SG.ineq.ensureExtension();
    const next = SG.model.create({
      variantId: model.variantId,
      digits: model.digits,
      cellCount: model.cellCount,
      units: model.units,
      unitMeta: model.unitMeta,
      layout: model.layout,
      cages: model.cages,
      inequalities: signs,
      symbols: model.symbols,
      fixedCells: model.fixedCells
    });
    const scope = scopes.get(model);
    if (scope !== undefined) scopes.set(next, scope);
    return next;
  }

  /**
   * Signs for a solved grid: one for every pair of orthogonal neighbours inside the same box (scope 'box'),
   * or for every pair of neighbours of the grid (scope 'grid', the Futoshiki rule). Each sign is oriented by
   * the solution: `{ a, b }` with solution[a] < solution[b]. Order: row by row, the right neighbour before
   * the one below.
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} solution
   * @param {string} [scope='box']  'box' or 'grid'.
   * @returns {Array<{a: number, b: number}>}
   */
  function placeSigns(model, solution, scope) {
    const layout = model.layout;
    const C = layout.cols;
    const at = new Int32Array(layout.rows * C).fill(-1);
    for (let c = 0; c < model.cellCount; c++) at[layout.cellRow[c] * C + layout.cellCol[c]] = c;
    const wholeGrid = scope === SCOPE_GRID;
    const signs = [];
    function link(i, j) {
      if (j === -1) return;
      if (!wholeGrid && layout.cellRegion[i] !== layout.cellRegion[j]) return;
      signs.push(solution[i] < solution[j] ? { a: i, b: j } : { a: j, b: i });
    }
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < C; c++) {
        const i = at[r * C + c];
        if (i === -1) continue;
        if (c + 1 < C) link(i, at[r * C + c + 1]);
        if (r + 1 < layout.rows) link(i, at[(r + 1) * C + c]);
      }
    }
    return signs;
  }

  /**
   * Where and how to draw each sign of a model. Cells are on the canvas grid, so `(midRow, midCol)` is the
   * midpoint of the two cell centres, in cell units (a cell centre has integer coordinates).
   *
   * `direction` runs from the smaller cell a to the greater cell b: 'right', 'left', 'down' or 'up'. The
   * glyph is the sign as it reads in that direction: '<' when a is left of b, '>' when a is right of b, and
   * for the vertical case the apex points at the smaller cell, '∧' when a is above b and '∨' when below.
   * @param {PuzzleModel} model
   * @returns {Array<{index: number, a: number, b: number, midRow: number, midCol: number,
   *          direction: string, glyph: string}>}
   */
  function signEdges(model) {
    const row = model.layout.cellRow;
    const col = model.layout.cellCol;
    return model.inequalities.map(function (q, index) {
      const dr = row[q.b] - row[q.a];
      const dc = col[q.b] - col[q.a];
      let direction = 'right';
      let glyph = '<';
      if (dc === -1 && dr === 0) {
        direction = 'left';
        glyph = '>';
      } else if (dr === 1 && dc === 0) {
        direction = 'down';
        glyph = '\u2227';
      } else if (dr === -1 && dc === 0) {
        direction = 'up';
        glyph = '\u2228';
      }
      return {
        index: index,
        a: q.a,
        b: q.b,
        midRow: (row[q.a] + row[q.b]) / 2,
        midCol: (col[q.a] + col[q.b]) / 2,
        direction: direction,
        glyph: glyph
      };
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Variant hooks
  // ---------------------------------------------------------------------------------------------

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  function readScope(opts) {
    const flag = opts ? opts.futoshiki : undefined;
    if (flag === undefined || flag === null || flag === false) return SCOPE_BOX;
    if (flag === true) return SCOPE_GRID;
    throw fail('pipeline.invalidOption', { option: 'futoshiki', value: String(flag) });
  }

  /**
   * @param {{futoshiki?: boolean}} opts  `futoshiki`: signs on every neighbouring pair of the grid instead
   *        of the pairs inside a box.
   * @param {?Rng} rng  Not used: the board has nothing random in it.
   * @returns {PuzzleModel}
   */
  function build(opts) {
    const scope = readScope(opts);
    const model = buildBoard();
    scopes.set(model, scope);
    return model;
  }

  /**
   * Pipeline hook of step 4: puts the signs on the solved grid and returns the model that carries them.
   * @param {Object} ctx  `{ model, solution, ... }` as given by `SG.digger.generate`.
   * @returns {PuzzleModel}
   */
  function postGenerate(ctx) {
    const scope = scopes.get(ctx.model) || SCOPE_BOX;
    const next = withSigns(ctx.model, placeSigns(ctx.model, ctx.solution, scope));
    scopes.set(next, scope);
    return next;
  }

  // ---------------------------------------------------------------------------------------------
  // The sign dig
  // ---------------------------------------------------------------------------------------------

  /** Solves with the given technique ids only; a solved report also proves that the puzzle is unique. */
  function solveWithin(model, givens, allowed, budget) {
    return SG.logicalSolver.solve(model, givens, {
      allowedTechniques: allowed,
      collectSteps: false,
      assumeUniqueness: false,
      budget: budget
    });
  }

  /**
   * Dig strategy 'signs' (design.md section 8.3): starts from the model with every sign and no clue and
   * returns the puzzle with a minimal sign set. Registered with `SG.digger.registerStrategy`; it has the
   * contract of `SG.digger.digStage` and returns the thinned model.
   *
   * Events: only keys of the shared vocabulary are used. `dig.try` / `dig.accept` / `dig.reject` carry the
   * two cells that the sign joins in `cells` (the sign sits between them) and highlight them; the board of
   * the replay shows the clues, which are cleared first and revealed with `dig.restore`.
   *
   * Dig log (`options.log`, see `SG.digger`): `{ op: 'signs', signs: [[a, b], ...] }` (every sign, value[a] <
   * value[b]), `{ op: 'clear' }` (the board is emptied), `{ op: 'reveal', cells }` (clues shown since the
   * last reveal), `{ op: 'pass', pass, clues }`, and `accept` / `reject` entries whose `cells` are the two
   * cells of the sign and `sign` its index in the `signs` list.
   *
   * @param {PuzzleModel} model  With every sign (see `postGenerate`).
   * @param {ArrayLike<number>} solution
   * @param {string} level
   * @param {Rng} rng
   * @param {Object} [options]  The resolved options of `SG.digger.digLevel` (`spec`, `symmetry`,
   *        `minClues`, `minCluesPerUnit`, `budget`, `emit`, `cooperative`).
   * @param {boolean} [options.cooperative=false]  The caller can run the dig in slices: the function then
   *        returns a generator of the `DugPuzzle` instead of the result, which yields between the sign
   *        candidates and the other pieces of the work (a solve, a rating); see `digSignsSteps`.
   * @returns {DugPuzzle|Generator<undefined, DugPuzzle>}
   */
  function digSigns(model, solution, level, rng, options) {
    const steps = digSignsSteps(model, solution, level, rng, options);
    return options && options.cooperative === true ? steps : SG.budget.drive(steps);
  }

  /**
   * The resumable form of `digSigns`: a generator that returns the `DugPuzzle`. It yields after every sign
   * candidate that was tried (one oracle call, the unit of the work) and after the solves and the rating of
   * the other pieces, never inside the search. `digSigns` without `cooperative` is this generator driven to
   * its end, so the events, the random draws and the puzzle are the same.
   * @param {PuzzleModel} model  With every sign.
   * @param {ArrayLike<number>} solution
   * @param {string} level
   * @param {Rng} rng
   * @param {Object} [options]  Those of `digSigns`.
   * @returns {Generator<undefined, DugPuzzle>}
   */
  function* digSignsSteps(model, solution, level, rng, options) {
    options = options || {};
    const spec = options.spec || SG.difficulty.spec(level, model);
    const n = model.cellCount;
    const budget = options.budget || null;
    const em = SG.events.toEmitter(options.emit);
    const symmetry = options.symmetry !== undefined ? options.symmetry : spec.symmetryDefault;
    const minClues = options.minClues !== undefined ? options.minClues : spec.minClues;
    const minPerUnit = options.minCluesPerUnit !== undefined ? options.minCluesPerUnit
      : spec.minCluesPerUnit;
    const levelIndex = SG.difficulty.levelIndex(level);
    const allowed = spec.oracle === 'techniques' ? spec.allowedTechniques : null;

    const signs = model.inequalities;
    const total = signs.length;
    const alive = new Uint8Array(total).fill(1);
    const givens = new Int32Array(n);
    const unitClues = new Int32Array(model.units.length);
    const groups = SG.symmetry.groups(model, symmetry);
    const groupOf = new Int32Array(n);
    groups.forEach(function (g, index) {
      for (let i = 0; i < g.length; i++) groupOf[g[i]] = index;
    });
    const stats = { groups: total, tried: 0, accepted: 0, rejected: 0, skipped: 0, oracleCalls: 0 };
    // The dig log (see SG.digger): the signs, the clues revealed since the board was last shown, verdicts.
    const log = Array.isArray(options.log) ? options.log : null;
    const pending = [];
    let clues = 0;

    function metrics() {
      return { clues: clues, accepted: stats.accepted, rejected: stats.rejected, attempts: stats.tried };
    }

    function aliveSigns() {
      const list = [];
      for (let i = 0; i < total; i++) if (alive[i] === 1) list.push(signs[i]);
      return list;
    }

    function revealGroup(g) {
      const cells = groups[g];
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (givens[c] !== 0) continue;
        givens[c] = solution[c];
        clues++;
        pending.push(c);
        const us = model.cellUnits[c];
        for (let k = 0; k < us.length; k++) unitClues[us[k]]++;
      }
    }

    function showClues() {
      if (log !== null && pending.length > 0) log.push({ op: 'reveal', cells: pending.slice() });
      pending.length = 0;
      if (em.wantsMicro) em.syncBoard('dig', 'dig.restore', {}, givens);
    }

    function tracePass(phase, name) {
      if (log !== null && phase === 'start') log.push({ op: 'pass', pass: name, clues: clues });
      if (em.wantsMicro) em.micro('dig', 'dig.pass.' + phase, { pass: name, clues: clues });
    }

    // --- the oracles: null = the sign may go, otherwise the reason it has to stay -------------------

    function uniqueOracle(trial) {
      stats.oracleCalls++;
      return SG.dfs.countSolutions(trial, givens, 2, budget) === 1 ? null : 'ambiguous';
    }

    function techniqueOracle(trial) {
      const reason = uniqueOracle(trial);
      if (reason !== null || allowed === null) return reason;
      return solveWithin(trial, givens, allowed, budget).solved ? null : 'techniques';
    }

    /** One pass over the signs in `order`: each one is tried once and stays out when the oracle agrees. */
    function* digPass(order, oracle, name) {
      tracePass('start', name);
      for (let k = 0; k < order.length; k++) {
        const idx = order[k];
        if (alive[idx] === 0) continue;
        const pair = [signs[idx].a, signs[idx].b];
        stats.tried++;
        if (em.wantsMicro) {
          em.micro('dig', 'dig.try', { cells: pair.slice(), pass: name }, { highlight: pair.slice() });
        }
        alive[idx] = 0;
        const reason = oracle(withSigns(model, aliveSigns()));
        if (reason === null) {
          stats.accepted++;
          if (log !== null) log.push({ op: 'accept', cells: pair.slice(), sign: idx });
          if (em.wantsMicro) {
            em.micro('dig', 'dig.accept', { cells: pair.slice() }, { unhighlight: pair.slice() }, metrics());
          }
        } else {
          alive[idx] = 1;
          stats.rejected++;
          if (log !== null) log.push({ op: 'reject', cells: pair.slice(), sign: idx, reason: reason });
          if (em.wantsMicro) {
            em.micro('dig', 'dig.reject', { cells: pair.slice(), reason: reason },
              { unhighlight: pair.slice() }, metrics());
          }
        }
        if (em.wantsMetrics) em.metric('dig', metrics);
        yield;
      }
      tracePass('end', name);
    }

    // --- 1. no clues, then as few as the level and the techniques need ------------------------------

    if (log !== null) {
      log.push({ op: 'signs', signs: signs.map(function (s) { return [s.a, s.b]; }) });
      log.push({ op: 'clear' });
    }
    if (em.wantsMicro) em.syncBoard('dig', 'dig.restore', {}, givens);

    const groupOrder = rng.shuffle(groups.map(function (g, index) { return index; }));
    for (let k = 0; k < groupOrder.length && clues < minClues; k++) revealGroup(groupOrder[k]);

    // Every unit keeps its minimum of clues (the cells are picked at random).
    for (let u = 0; u < model.units.length && minPerUnit > 0; u++) {
      const open = Array.from(model.units[u]).filter(function (c) { return givens[c] === 0; });
      rng.shuffle(open);
      for (let k = 0; k < open.length && unitClues[u] < minPerUnit; k++) revealGroup(groupOf[open[k]]);
    }
    showClues();

    // The puzzle with every sign must be solvable by the techniques of the level (which also makes it
    // unique); a position where they get stuck is helped with a clue from the cells still open.
    if (allowed !== null) {
      for (let guard = 0; guard < n; guard++) {
        const report = solveWithin(model, givens, allowed, budget);
        stats.oracleCalls++;
        if (report.solved) break;
        const open = [];
        for (let c = 0; c < n; c++) if (givens[c] === 0 && report.state.value[c] === 0) open.push(c);
        if (open.length === 0) break;
        revealGroup(groupOf[open[rng.int(open.length)]]);
        yield;
      }
      showClues();
    }

    // --- 2.-4. dig the signs, rate, and reveal clues while the puzzle is too hard -------------------

    const order = rng.shuffle(signs.map(function (s, index) { return index; }));
    for (let round = 0; round <= MAX_TUNE_ROUNDS; round++) {
      if (allowed !== null) yield* digPass(order, techniqueOracle, 'signs');
      yield* digPass(order, uniqueOracle, 'signs.minimal');

      const current = withSigns(model, aliveSigns());
      let tooHard = false;
      let stuck = null;
      if (allowed !== null) {
        const report = solveWithin(current, givens, allowed, budget);
        yield;
        if (!report.solved) {
          tooHard = true;
          stuck = report;
        }
      }
      if (!tooHard) {
        const rating = SG.difficulty.rate(current, givens, { budget: budget });
        yield;
        tooHard = SG.difficulty.levelIndex(rating.level) > levelIndex;
      }
      if (!tooHard || round === MAX_TUNE_ROUNDS) break;

      const open = [];
      for (let c = 0; c < n; c++) {
        if (givens[c] === 0 && (stuck === null || stuck.state.value[c] === 0)) open.push(c);
      }
      if (open.length === 0) break;
      revealGroup(groupOf[open[rng.int(open.length)]]);
      showClues();
    }

    return { givens: givens, clues: clues, stats: stats, model: withSigns(model, aliveSigns()) };
  }

  // ---------------------------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------------------------

  /** Adds the sign dig to the digger unless an earlier load of this file did. */
  function registerStrategy() {
    try {
      SG.digger.getStrategy(STRATEGY_ID);
    } catch (err) {
      if (!(err instanceof SG.errors.GenerationError) || err.code !== 'digger.unknownStrategy') throw err;
      SG.digger.registerStrategy(STRATEGY_ID, digSigns);
    }
  }

  const DEFINITION = {
    id: VARIANT_ID,
    i18nKey: 'variant.greaterThan',
    group: 'inequality',
    digits: SIZE,
    difficultySupport: ['veryEasy', 'easy', 'medium', 'hard', 'expert'],
    // The signs do part of the work of the clues, so the classic9 floors (29 / 25 / 22) kept the dig from
    // reaching the level (49 %, 13 % and 11 % of the dug puzzles for medium, hard, expert); 83 % / 80 % /
    // 80 % of them (24 / 20 / 17) give 76 %, 44 % and 16 % (js/core/difficulty.js, "Calibration log").
    clueFloorScale: Object.freeze({ medium: 0.83, hard: 0.8, expert: 0.8 }),
    defaultSymbolMode: 'digits',
    symbolModes: ['digits', 'letters', 'colors', 'shapes'],
    options: [{
      id: 'futoshiki',
      type: 'boolean',
      default: false,
      i18nKey: 'option.futoshiki',
      hintI18nKey: 'option.futoshiki.hint'
    }],
    build: build,
    postGenerate: postGenerate,
    digStrategy: STRATEGY_ID
  };

  registerStrategy();
  if (!SG.variants.has(DEFINITION.id)) SG.variants.register(DEFINITION);

  /**
   * Greater-Than tools, exposed for tests and tooling.
   * @namespace SG.greaterThan
   */
  SG.greaterThan = {
    VARIANT_ID: VARIANT_ID,
    STRATEGY_ID: STRATEGY_ID,
    SCOPES: [SCOPE_BOX, SCOPE_GRID],
    buildBoard: buildBoard,
    withSigns: withSigns,
    placeSigns: placeSigns,
    signEdges: signEdges,
    digSigns: digSigns,
    digSignsSteps: digSignsSteps
  };

  // Locale strings, merged into the language packs by the UI layer.
  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'variant.greaterThan': 'Greater-Than Sudoku',
      'option.futoshiki': 'Signs across the whole grid (Futoshiki)',
      'option.futoshiki.hint': 'Off: signs only between neighbouring cells of the same box. On: between ' +
        'every pair of neighbouring cells, which also links the boxes.'
    },
    vi: {
      'variant.greaterThan': 'Sudoku So sánh',
      'option.futoshiki': 'Dấu so sánh trên toàn lưới (Futoshiki)',
      'option.futoshiki.hint': 'Tắt: chỉ có dấu giữa các ô kề nhau trong cùng một khối. Bật: dấu giữa mọi ' +
        'cặp ô kề nhau, kể cả giữa các khối.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
