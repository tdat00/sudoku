/**
 * Greater-Than Sudoku: a 9x9 Sudoku with inequality signs between neighbouring cells. The signs are part of
 * the model (`model.inequalities`, value[a] < value[b]) and models are immutable, so the variant works in
 * three steps that fit the generator's hooks:
 *   build         the empty board (classic 9x9 geometry, no signs: a sign needs a solution);
 *   postGenerate  step 4 'extraStructure': a sign goes on EVERY pair of neighbouring cells of one box (option
 *                 `futoshiki`: of the whole grid) and the model is replaced by one that carries them;
 *   digStrategy   step 5 'dig': the strategy 'signs' (`digSigns`) digs SIGNS, not cells.
 *
 * Sign dig, one sample:
 *   1. All clues are removed; a few are revealed again so the puzzle can be solved at all (never fewer than
 *      the level's `minClues`, with the configured symmetry).
 *   2. Signs are shuffled and removed one by one with the technique-bounded oracle: a sign stays removed
 *      while the techniques of the level can still solve the puzzle.
 *   3. Every sign still redundant for uniqueness is removed with a plain uniqueness check, so the sign set
 *      ends minimal.
 *   4. A puzzle the level's techniques cannot finish, or that is rated above the level, is too hard: one more
 *      group of clues is revealed and steps 2 and 3 run again on the signs that are left.
 * Clues follow the configured symmetry; signs do not (they are placed by the solution).
 *
 * Renderer contract (see `signEdges`): a sign is `{ a, b }`, value[a] < value[b], a and b orthogonal
 * neighbours; it is drawn at the midpoint of their centres with its apex on the SMALLER cell a.
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

  /** The classic 9x9 geometry under the id 'greaterThan' (27 units like `classic9`), no inequalities. */
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

  /** A copy of `model` with another set of signs (`{a, b}`: value[a] < value[b]); everything else is shared. */
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
   * or of the whole grid (scope 'grid', the Futoshiki rule), oriented by the solution. Order: row by row,
   * the right neighbour before the one below.
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
   * Where and how to draw each sign. `(midRow, midCol)` is the midpoint of the two cell centres in cell
   * units. `direction` runs from the smaller cell a to the greater cell b ('right', 'left', 'down', 'up');
   * the glyph is '<' / '>' horizontally and, vertically, '∧' when a is above b and '∨' when below (the apex
   * points at the smaller cell).
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

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  function readScope(opts) {
    const flag = opts ? opts.futoshiki : undefined;
    if (flag === undefined || flag === null || flag === false) return SCOPE_BOX;
    if (flag === true) return SCOPE_GRID;
    throw fail('pipeline.invalidOption', { option: 'futoshiki', value: String(flag) });
  }

  /** `opts.futoshiki`: signs on every neighbouring pair of the grid instead of the pairs inside a box. */
  function build(opts) {
    const scope = readScope(opts);
    const model = buildBoard();
    scopes.set(model, scope);
    return model;
  }

  /** Pipeline hook of step 4: puts the signs on the solved grid and returns the model that carries them. */
  function postGenerate(ctx) {
    const scope = scopes.get(ctx.model) || SCOPE_BOX;
    const next = withSigns(ctx.model, placeSigns(ctx.model, ctx.solution, scope));
    scopes.set(next, scope);
    return next;
  }

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
   * Dig strategy 'signs': starts from the model with every sign and no clue and returns the puzzle with a
   * minimal sign set. Registered with `SG.digger.registerStrategy`; same contract as `SG.digger.digStage`.
   * With `options.cooperative` it returns the generator of `digSignsSteps` instead of the result.
   *
   * Events use the shared vocabulary only: `dig.try` / `dig.accept` / `dig.reject` carry the two cells the
   * sign joins; the clues are cleared first and revealed with `dig.restore`.
   *
   * Dig log (`options.log`): `{ op: 'signs', signs: [[a, b], ...] }`, `{ op: 'clear' }`,
   * `{ op: 'reveal', cells }` (clues shown since the last reveal), `{ op: 'pass', pass, clues }`, and
   * `accept` / `reject` entries whose `cells` are the sign's two cells and `sign` its index in `signs`.
   * @returns {DugPuzzle|Generator<undefined, DugPuzzle>}
   */
  function digSigns(model, solution, level, rng, options) {
    const steps = digSignsSteps(model, solution, level, rng, options);
    return options && options.cooperative === true ? steps : SG.budget.drive(steps);
  }

  /**
   * The resumable form of `digSigns`: yields after every sign candidate tried (one oracle call) and after
   * the solves and ratings of the other pieces, never inside the search. `digSigns` without `cooperative`
   * drives it to the end, so events, random draws and the puzzle are identical.
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

    // Oracles: null = the sign may go, otherwise the reason it has to stay.

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

    // 1. no clues, then as few as the level and the techniques need

    if (log !== null) {
      log.push({ op: 'signs', signs: signs.map(function (s) { return [s.a, s.b]; }) });
      log.push({ op: 'clear' });
    }
    if (em.wantsMicro) em.syncBoard('dig', 'dig.restore', {}, givens);

    const groupOrder = rng.shuffle(groups.map(function (g, index) { return index; }));
    for (let k = 0; k < groupOrder.length && clues < minClues; k++) revealGroup(groupOrder[k]);

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

    // 2.-4. dig the signs, rate, and reveal clues while the puzzle is too hard

    const caps = options.caps || null;
    const keeper = options.keeper || null;
    // The full rating of the state the loop ends on, when it has one: handed on instead of rated again.
    let finalRating = null;
    let finalModel = null;
    const order = rng.shuffle(signs.map(function (s, index) { return index; }));
    for (let round = 0; round <= MAX_TUNE_ROUNDS; round++) {
      finalRating = null;
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
        // Counted toward the full-rating cap of the attempt; null once it is used up (the tuning ends).
        const rating = SG.digger.rateCounted(current, givens, budget, caps);
        yield;
        if (rating === null) break;
        finalRating = rating;
        finalModel = current;
        // A unique, completely rated position: the run may fall back on it if it is the closest one.
        if (keeper !== null && log !== null && rating.solved) {
          keeper.offer({
            model: current, givens: givens, solution: solution, rating: rating, stats: stats,
            logOf: function () { return log.slice(); }
          });
        }
        // A rating without a complete proof has no level; it counts as too hard.
        tooHard = rating.level === null || SG.difficulty.levelIndex(rating.level) > levelIndex;
      }
      if (!tooHard || round === MAX_TUNE_ROUNDS) break;

      const open = [];
      for (let c = 0; c < n; c++) {
        if (givens[c] === 0 && (stuck === null || stuck.state.value[c] === 0)) open.push(c);
      }
      if (open.length === 0) break;
      finalRating = null;
      revealGroup(groupOf[open[rng.int(open.length)]]);
      showClues();
    }

    if (finalRating !== null) {
      return { givens: givens, clues: clues, stats: stats, model: finalModel, rating: finalRating };
    }
    return { givens: givens, clues: clues, stats: stats, model: withSigns(model, aliveSigns()) };
  }

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
    difficultySupport: ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1',
      'hell2'],
    // The signs do part of the work of the clues, so the classic9 floors (29 / 25 / 22) kept the dig from
    // reaching the level; 83 % / 80 % / 80 % of them fit better (js/engine/difficulty.js, "Calibration log").
    // expert takes the factor of hard.
    clueFloorScale: Object.freeze({ normal: 0.83, hard: 0.8, expert: 0.8, master: 0.8 }),
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

  /** Greater-Than tools, exposed for tests and tooling. */
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
      'option.futoshiki.hint': 'Where the comparison signs go.\n\n**Off**: signs only between neighbouring ' +
        'cells of the same box.\n\n**On**: signs between every pair of neighbouring cells, which also ' +
        'links the boxes.'
    },
    vi: {
      'variant.greaterThan': 'Sudoku So sánh',
      'option.futoshiki': 'Dấu so sánh trên toàn lưới (Futoshiki)',
      'option.futoshiki.hint': 'Nơi đặt các dấu so sánh.\n\n**Tắt**: chỉ có dấu giữa các ô kề nhau trong ' +
        'cùng một khối.\n\n**Bật**: dấu giữa mọi cặp ô kề nhau, kể cả giữa các khối.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
