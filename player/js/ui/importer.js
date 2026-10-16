/**
 * Opening a puzzle (the player's import): `SG.importer`. A puzzle arrives as the JSON document of the
 * generator (`format: 'sudoku-generator/v1'`, plus the `model` block), as a link token, as a whole player
 * link, or as a plain text line of a classic board. This module recognises which, decodes the token, checks
 * the document, rebuilds a REAL `PuzzleModel` from its `model` block (no variant code is involved), checks
 * givens, solution and uniqueness, and hands back a playable puzzle. Whatever is wrong with the input comes
 * back as translatable issues (`import.error.*`, `error.exchange.*`); nothing here throws.
 *
 * Pure: no DOM, no storage. The one asynchronous step is the decoding of a token (`SG.exchange.decode`).
 *
 * ---------------------------------------------------------------------------------------------------------
 * PUBLIC API (`SG.importer`)
 * ---------------------------------------------------------------------------------------------------------
 *   open(input, options?)   -> Promise<Outcome>. `input` is a string: the JSON document, a bare token
 *                           (`z.` / `j.`), a player link or a bare fragment (`...#puzzle=<token>`), or a
 *                           line of 16 / 36 / 81 characters ('.', '0', '-', '_' = empty). The recognised
 *                           kind is in `Outcome.kind`: 'json' | 'token' | 'link' | 'text'.
 *   openDocument(data, options?) -> Outcome. A document that is already parsed (a stored one).
 *   openText(text, options?)     -> Outcome. A line of classic digits.
 *   detect(input)           -> { kind, value }. What a string is, without decoding it: kind 'empty' |
 *                           'json' | 'link' | 'token' | 'text' | 'unknown'; `value` is the token for 'link'
 *                           and 'token', the trimmed text otherwise.
 *   validate(data)          -> { ok, errors, warnings, variantId }. The form of a document, no model built.
 *   parseText(text)         -> { ok, data, errors }. `data` has the shape of a document (no `model`).
 *   puzzleId(model, givens) -> string. The identity of a puzzle (variant + structure + givens); the same
 *                           puzzle gets the same id whichever way it arrived.
 *   issueText(issue)        -> the translated text of an error or warning `{ key, args }`.
 *   VARIANTS, FORMAT, TEXT_CHARS, ERROR_KEYS, WARNING_KEYS, LEVELS.
 *
 * Outcome: `{ ok, kind, errors, warnings, puzzle }`. `errors` / `warnings` are lists of issues
 * `{ key, args }`; `puzzle` is null unless `ok`:
 *   { id, variantId, model, givens, solution, uniqueness, solutionSource, symbolMode, info, document }
 *   - givens / solution: Int32Array, one entry per cell (the solution is all zeros only for a puzzle with
 *     no solution, which is refused, so a playable puzzle always has one).
 *   - uniqueness: 'unique' | 'multiple' | 'unknown' (the search ran out of time).
 *   - solutionSource: 'stored' (the document's own) | 'computed' (found with the DFS solver).
 *   - info: { source, seed, generatedAt, locale, difficulty, clues, cellCount, digits, wordoku } for the
 *     info card; `difficulty` is { requested, achieved, score, hardestTechnique } or null; `wordoku` is
 *     { placement, line } or null (the key word is never part of it).
 *   - document: the plain, size-bounded document the puzzle can be rebuilt from (what is stored for the
 *     "recent puzzles" list; `openDocument(puzzle.document)` gives the same puzzle).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first definition on repeated loads.
  if (SG.importer && typeof SG.importer.open === 'function') return;

  const FORMAT = 'sudoku-generator/v1';
  const FORMAT_PREFIX = /^sudoku-generator\/v(\d+)/;
  const MAX_TEXT_CHARS = 2048;
  const EMPTY_CHARS = '.0-_';
  const SOLVE_BUDGET_MS = 6000;
  const LEVELS = Object.freeze(['veryEasy', 'easy', 'medium', 'hard', 'expert', 'evil']);

  /** The 15 variants the player can open: the digit count and cell count each one must have. */
  const VARIANTS = Object.freeze({
    classic4: Object.freeze({ digits: 4, cells: 16 }),
    classic6: Object.freeze({ digits: 6, cells: 36 }),
    classic9: Object.freeze({ digits: 9, cells: 81 }),
    mega12: Object.freeze({ digits: 12, cells: 144 }),
    mega16: Object.freeze({ digits: 16, cells: 256 }),
    diagonalX: Object.freeze({ digits: 9, cells: 81 }),
    hyper: Object.freeze({ digits: 9, cells: 81 }),
    jigsaw9: Object.freeze({ digits: 9, cells: 81 }),
    killer: Object.freeze({ digits: 9, cells: 81 }),
    greaterThan: Object.freeze({ digits: 9, cells: 81 }),
    samurai: Object.freeze({ digits: 9, cells: 369 }),
    sohei: Object.freeze({ digits: 9, cells: 288 }),
    butterfly: Object.freeze({ digits: 9, cells: 144 }),
    flower: Object.freeze({ digits: 9, cells: 189 }),
    wordoku: Object.freeze({ digits: 9, cells: 81 })
  });

  /** The lengths of a classic text line and the board each stands for. */
  const TEXT_CHARS = Object.freeze({ 16: 4, 36: 6, 81: 9 });

  const MAX_UNITS = 600;
  const MAX_UNIT_CELLS = 16;
  const MAX_CAGES = 400;
  const MAX_SIGNS = 1000;
  const MAX_OVERLAYS = 64;
  const MAX_SUBGRIDS = 8;
  const MAX_CANVAS = 64;
  const MAX_REGION = 4095;
  const MAX_LABEL_CHARS = 16;

  const ERROR_KEYS = Object.freeze([
    'import.error.empty', 'import.error.tooLarge', 'import.error.badJson', 'import.error.notObject',
    'import.error.noFormat', 'import.error.wrongFormat', 'import.error.wrongVersion',
    'import.error.missingField', 'import.error.badType', 'import.error.unknownVariant',
    'import.error.noModel', 'import.error.badModel', 'import.error.buildFailed', 'import.error.badStructure',
    'import.error.badDigits', 'import.error.badCellCount', 'import.error.badLength', 'import.error.badDigit',
    'import.error.givenMismatch', 'import.error.solutionUnit', 'import.error.solutionCage',
    'import.error.solutionSign', 'import.error.solutionWord', 'import.error.badLayout',
    'import.error.cageBadCells', 'import.error.cageOverlap',
    'import.error.cageNotCovered', 'import.error.cageBadSum', 'import.error.ineqBadIndex',
    'import.error.ineqSelf', 'import.error.ineqDuplicate', 'import.error.ineqNotAdjacent',
    'import.error.ineqCycle', 'import.error.textChars', 'import.error.textLength',
    'import.error.unrecognised', 'import.error.noSolution', 'import.error.readFailed',
    'error.exchange.invalidToken', 'error.exchange.tooLarge', 'error.exchange.unsupportedEncoding',
    'error.exchange.invalidJson', 'error.exchange.invalidUrl'
  ]);

  const WARNING_KEYS = Object.freeze(['import.warn.severalSolutions', 'import.warn.unverified']);

  // ---------------------------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------------------------

  function t(key, args) {
    return SG.i18n && typeof SG.i18n.t === 'function' ? SG.i18n.t(key, args) : key;
  }

  function hasText(key) {
    return !!(SG.i18n && typeof SG.i18n.has === 'function' && SG.i18n.has(key));
  }

  function issue(key, args) {
    return { key: key, args: args || {} };
  }

  function isObject(x) {
    return x !== null && typeof x === 'object' && !Array.isArray(x);
  }

  function isInt(x) {
    return typeof x === 'number' && Number.isInteger(x);
  }

  function isIntIn(x, min, max) {
    return isInt(x) && x >= min && x <= max;
  }

  function sameList(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function countClues(givens) {
    let n = 0;
    for (let i = 0; i < givens.length; i++) if (givens[i] > 0) n++;
    return n;
  }

  function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  /**
   * The translated text of an issue.
   * @param {{key: string, args: Object}} item
   * @returns {string}
   */
  function issueText(item) {
    const args = Object.assign({}, item.args);
    if (typeof args.variantId === 'string') {
      args.variant = hasText('variant.' + args.variantId) ? t('variant.' + args.variantId) : args.variantId;
    }
    if (typeof args.expected === 'string' && hasText('import.type.' + args.expected)) {
      args.expected = t('import.type.' + args.expected);
    }
    return t(item.key, args);
  }

  function failure(kind, errors) {
    return { ok: false, kind: kind, errors: errors, warnings: [], puzzle: null };
  }

  function failed(key, args) {
    return { ok: false, data: null, errors: [issue(key, args)] };
  }

  // ---------------------------------------------------------------------------------------------
  // Recognising the input
  // ---------------------------------------------------------------------------------------------

  /**
   * A line of clues: the characters of a board, and either one of the lengths of a board (a typo in a letter
   * is then reported by position) or nothing but digits and empty marks (a wrong length is reported).
   */
  function looksLikeText(compact) {
    if (/^[0-9._-]+$/.test(compact)) return true;
    return has(TEXT_CHARS, compact.length) && /^[0-9._\-A-Za-z]+$/.test(compact);
  }

  /**
   * What a string is, without decoding it.
   * @param {*} input
   * @returns {{kind: string, value: string}} kind: 'empty' | 'json' | 'link' | 'token' | 'text' | 'unknown'.
   */
  function detect(input) {
    const body = typeof input === 'string' ? input.replace(/^\uFEFF/, '').trim() : '';
    if (body === '') return { kind: 'empty', value: '' };
    const first = body.charAt(0);
    if (first === '{' || first === '[') return { kind: 'json', value: body };
    const squeezed = body.replace(/\s+/g, '');
    if (/^[jz]\.[A-Za-z0-9_-]+$/.test(squeezed)) return { kind: 'token', value: squeezed };
    if (/puzzle=/.test(body) && SG.exchange) {
      const at = body.indexOf('#');
      const fragment = at === -1 ? body : body.slice(at + 1);
      const token = SG.exchange.tokenFromHash(fragment);
      if (token !== null) return { kind: 'link', value: token };
    }
    const compact = squeezed;
    if (compact.length <= MAX_TEXT_CHARS && looksLikeText(compact)) return { kind: 'text', value: compact };
    return { kind: 'unknown', value: body.slice(0, 80) };
  }

  // ---------------------------------------------------------------------------------------------
  // Text lines
  // ---------------------------------------------------------------------------------------------

  /**
   * Parses a classic board written as one line (16, 36 or 81 characters).
   * @param {string} text
   * @returns {{ok: boolean, data: ?Object, errors: Array<{key: string, args: Object}>}} `data` has the
   *   shape of a document: `format`, `variantId`, `digits`, `cellCount`, `givens`, `solution: null`.
   */
  function parseText(text) {
    if (typeof text !== 'string') return failed('import.error.empty');
    const line = text.replace(/\s+/g, '');
    if (line === '') return failed('import.error.empty');
    if (line.length > MAX_TEXT_CHARS || !has(TEXT_CHARS, line.length)) {
      return failed('import.error.textLength', { length: Math.min(line.length, MAX_TEXT_CHARS) });
    }
    const digits = TEXT_CHARS[line.length];
    const givens = new Array(line.length);
    for (let i = 0; i < line.length; i++) {
      const ch = line.charAt(i);
      if (EMPTY_CHARS.indexOf(ch) !== -1) {
        givens[i] = 0;
      } else if (ch >= '1' && ch <= '9' && ch.charCodeAt(0) - 48 <= digits) {
        givens[i] = ch.charCodeAt(0) - 48;
      } else {
        return failed('import.error.textChars', { char: ch, position: i + 1 });
      }
    }
    return { ok: true, errors: [], data: { format: FORMAT, variantId: SG.classicModel.variantIdOf(digits),
      digits: digits, cellCount: line.length, givens: givens, solution: null } };
  }

  // ---------------------------------------------------------------------------------------------
  // The document
  // ---------------------------------------------------------------------------------------------

  function checkValues(list, field, min, max, errors) {
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      if (!isIntIn(v, min, max)) {
        errors.push(issue('import.error.badDigit', { field: field, cell: i + 1, value: String(v), min: min,
          max: max }));
        return false;
      }
    }
    return true;
  }

  function checkCages(cages, n, digits, mustCover, errors) {
    if (cages.length > MAX_CAGES) {
      errors.push(issue('import.error.badModel', { field: 'cages' }));
      return false;
    }
    const owner = new Int32Array(n).fill(-1);
    let ok = true;
    for (let k = 0; k < cages.length; k++) {
      const cage = cages[k];
      const number = k + 1;
      const shape = isObject(cage) && Array.isArray(cage.cells) && cage.cells.length > 0 &&
        cage.cells.length <= digits;
      if (!shape) {
        errors.push(issue('import.error.cageBadCells', { cage: number }));
        ok = false;
        continue;
      }
      const cells = cage.cells;
      const seen = new Set();
      let valid = true;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (!isIntIn(c, 0, n - 1) || seen.has(c)) valid = false;
        seen.add(c);
      }
      if (!valid) {
        errors.push(issue('import.error.cageBadCells', { cage: number }));
        ok = false;
        continue;
      }
      for (let i = 0; i < cells.length; i++) {
        if (owner[cells[i]] !== -1) {
          errors.push(issue('import.error.cageOverlap', { cell: cells[i] + 1, cage: number }));
          ok = false;
        } else {
          owner[cells[i]] = k;
        }
      }
      const size = cells.length;
      const min = size * (size + 1) / 2;
      const max = size * digits - size * (size - 1) / 2;
      if (!isIntIn(cage.sum, min, max)) {
        errors.push(issue('import.error.cageBadSum', { cage: number, sum: String(cage.sum), min: min,
          max: max }));
        ok = false;
      }
    }
    if (ok && mustCover) {
      let missing = 0;
      for (let c = 0; c < n; c++) if (owner[c] === -1) missing++;
      if (missing > 0) {
        errors.push(issue('import.error.cageNotCovered', { count: missing }));
        ok = false;
      }
    }
    return ok;
  }

  function checkInequalities(list, n, row, col, errors) {
    if (list.length > MAX_SIGNS) {
      errors.push(issue('import.error.badModel', { field: 'inequalities' }));
      return false;
    }
    const out = [];
    for (let c = 0; c < n; c++) out.push([]);
    const indegree = new Int32Array(n);
    const seen = new Set();
    let ok = true;
    for (let k = 0; k < list.length; k++) {
      const q = list[k];
      const index = k + 1;
      if (!isObject(q) || !isIntIn(q.a, 0, n - 1) || !isIntIn(q.b, 0, n - 1)) {
        errors.push(issue('import.error.ineqBadIndex', { index: index }));
        ok = false;
      } else if (q.a === q.b) {
        errors.push(issue('import.error.ineqSelf', { index: index }));
        ok = false;
      } else if (seen.has(q.a + ',' + q.b)) {
        errors.push(issue('import.error.ineqDuplicate', { index: index }));
        ok = false;
      } else if (row && Math.abs(row[q.a] - row[q.b]) + Math.abs(col[q.a] - col[q.b]) !== 1) {
        errors.push(issue('import.error.ineqNotAdjacent', { index: index }));
        ok = false;
      } else {
        seen.add(q.a + ',' + q.b);
        out[q.a].push(q.b);
        indegree[q.b]++;
      }
    }
    if (!ok) return false;
    const queue = [];
    for (let c = 0; c < n; c++) if (indegree[c] === 0) queue.push(c);
    let done = 0;
    for (let head = 0; head < queue.length; head++) {
      done++;
      const next = out[queue[head]];
      for (let i = 0; i < next.length; i++) if (--indegree[next[i]] === 0) queue.push(next[i]);
    }
    if (done < n) {
      errors.push(issue('import.error.ineqCycle'));
      return false;
    }
    return true;
  }

  function isCellOf(n) {
    return function (c) { return isIntIn(c, 0, n - 1); };
  }

  /** Checks the shape of an array of integers: length and range; pushes `badModel` for the field. */
  function intArray(list, field, length, min, max, errors) {
    const listed = Array.isArray(list) && list.length === length;
    if (!listed || !list.every(function (v) { return isIntIn(v, min, max); })) {
      errors.push(issue('import.error.badModel', { field: field }));
      return false;
    }
    return true;
  }

  /**
   * The shape of the `model` block (a plain ModelSpec) against what the document says about itself. Only
   * data that `SG.model.create` can take without a surprise gets through: every list is bounded, every index
   * in range, every string short. The rules of the board are then checked on the built model.
   */
  function checkModelSpec(spec, variantId, n, digits, errors) {
    const bad = function (field) {
      errors.push(issue('import.error.badModel', { field: field }));
      return false;
    };
    if (!isObject(spec)) return bad('model');
    if (spec.variantId !== variantId) return bad('model.variantId');
    if (spec.digits !== digits) return bad('model.digits');
    if (spec.cellCount !== undefined && spec.cellCount !== n) return bad('model.cellCount');

    if (!Array.isArray(spec.units) || spec.units.length < 1 || spec.units.length > MAX_UNITS) {
      return bad('model.units');
    }
    for (let u = 0; u < spec.units.length; u++) {
      const unit = spec.units[u];
      if (!Array.isArray(unit) || unit.length < 1 || unit.length > MAX_UNIT_CELLS ||
          !unit.every(function (c) { return isIntIn(c, 0, n - 1); })) {
        return bad('model.units');
      }
    }
    if (!Array.isArray(spec.unitMeta) || spec.unitMeta.length !== spec.units.length) {
      return bad('model.unitMeta');
    }
    for (let u = 0; u < spec.unitMeta.length; u++) {
      const m = spec.unitMeta[u];
      const ok = isObject(m) && typeof m.kind === 'string' && m.kind.length <= MAX_LABEL_CHARS &&
        isIntIn(m.gridIndex, 0, MAX_SUBGRIDS) && typeof m.label === 'string' &&
        m.label.length >= 1 && m.label.length <= MAX_LABEL_CHARS &&
        (m.partial === undefined || typeof m.partial === 'boolean');
      if (!ok) return bad('model.unitMeta');
    }

    const layout = spec.layout;
    if (!isObject(layout)) return bad('model.layout');
    if (!isIntIn(layout.rows, 1, MAX_CANVAS) || !isIntIn(layout.cols, 1, MAX_CANVAS)) {
      return bad('model.layout');
    }
    if (!intArray(layout.cellRow, 'model.layout.cellRow', n, 0, layout.rows - 1, errors)) return false;
    if (!intArray(layout.cellCol, 'model.layout.cellCol', n, 0, layout.cols - 1, errors)) return false;
    if (!intArray(layout.cellRegion, 'model.layout.cellRegion', n, 0, MAX_REGION, errors)) return false;
    if (layout.overlays !== undefined) {
      const listed = Array.isArray(layout.overlays) && layout.overlays.length <= MAX_OVERLAYS;
      if (!listed) return bad('model.layout.overlays');
      for (let k = 0; k < layout.overlays.length; k++) {
        const o = layout.overlays[k];
        const ok = isObject(o) && typeof o.kind === 'string' && o.kind.length <= MAX_LABEL_CHARS &&
          Array.isArray(o.cells) && o.cells.length <= n && o.cells.every(isCellOf(n));
        if (!ok) return bad('model.layout.overlays');
      }
    }
    if (layout.subGrids !== undefined) {
      const listed = Array.isArray(layout.subGrids) && layout.subGrids.length <= MAX_SUBGRIDS;
      if (!listed) return bad('model.layout.subGrids');
      for (let k = 0; k < layout.subGrids.length; k++) {
        const g = layout.subGrids[k];
        const ok = isObject(g) && isIntIn(g.gridIndex, 0, MAX_SUBGRIDS) &&
          isIntIn(g.originRow, 0, MAX_CANVAS) && isIntIn(g.originCol, 0, MAX_CANVAS);
        if (!ok) return bad('model.layout.subGrids');
      }
    }

    const symbols = spec.symbols;
    const isLabel = function (s) { return typeof s === 'string' && s.length >= 1 && s.length <= 3; };
    if (!isObject(symbols) || typeof symbols.mode !== 'string' || symbols.mode.length > MAX_LABEL_CHARS ||
        !Array.isArray(symbols.labels) || symbols.labels.length !== digits ||
        !symbols.labels.every(isLabel) || new Set(symbols.labels).size !== digits) {
      return bad('model.symbols');
    }
    if (spec.fixedCells !== undefined) {
      if (!intArray(spec.fixedCells, 'model.fixedCells', n, 0, digits, errors)) return false;
    }
    if (spec.cages !== undefined) {
      if (!Array.isArray(spec.cages)) return bad('model.cages');
      if (!checkCages(spec.cages, n, digits, variantId === 'killer', errors)) return false;
    } else if (variantId === 'killer') {
      return bad('model.cages');
    }
    if (spec.inequalities !== undefined) {
      if (!Array.isArray(spec.inequalities)) return bad('model.inequalities');
      const row = layout.cellRow;
      if (!checkInequalities(spec.inequalities, n, row, layout.cellCol, errors)) return false;
    }
    return true;
  }

  /**
   * Checks the form of a document: the format and its version, the variant, the types and ranges of the
   * lists, and the `model` block. It does not build a model (see `openDocument`).
   * @param {*} data  The parsed JSON.
   * @returns {{ok: boolean, errors: Array<Object>, warnings: Array<Object>, variantId: ?string}}
   */
  function validate(data) {
    const errors = [];
    const warnings = [];
    function done(variantId) {
      return { ok: errors.length === 0, errors: errors, warnings: warnings, variantId: variantId || null };
    }
    function missing(field) {
      errors.push(issue('import.error.missingField', { field: field }));
    }
    function wrongType(field, expected) {
      errors.push(issue('import.error.badType', { field: field, expected: expected }));
    }

    if (!isObject(data)) {
      errors.push(issue('import.error.notObject'));
      return done();
    }
    if (data.format === undefined) {
      errors.push(issue('import.error.noFormat'));
      return done();
    }
    if (data.format !== FORMAT) {
      const shown = String(data.format).slice(0, 40);
      if (typeof data.format === 'string' && FORMAT_PREFIX.test(data.format)) {
        errors.push(issue('import.error.wrongVersion', { found: shown, supported: FORMAT }));
      } else {
        errors.push(issue('import.error.wrongFormat', { format: shown }));
      }
      return done();
    }
    if (typeof data.variantId !== 'string' || data.variantId === '') {
      missing('variantId');
      return done();
    }
    if (!has(VARIANTS, data.variantId)) {
      errors.push(issue('import.error.unknownVariant', { variantId: data.variantId.slice(0, 40) }));
      return done();
    }
    const variantId = data.variantId;
    const digits = VARIANTS[variantId].digits;
    const n = VARIANTS[variantId].cells;

    if (data.digits !== undefined && data.digits !== digits) {
      errors.push(issue('import.error.badDigits', { digits: String(data.digits), expected: digits,
        variantId: variantId }));
    }
    if (data.cellCount !== undefined && data.cellCount !== n) {
      errors.push(issue('import.error.badCellCount', { cellCount: String(data.cellCount), expected: n }));
    }
    if (data.givens === undefined) {
      missing('givens');
    } else if (!Array.isArray(data.givens)) {
      wrongType('givens', 'array');
    } else if (data.givens.length !== n) {
      errors.push(issue('import.error.badLength', { field: 'givens', length: data.givens.length,
        expected: n }));
    } else {
      checkValues(data.givens, 'givens', 0, digits, errors);
    }
    if (data.solution !== undefined && data.solution !== null) {
      if (!Array.isArray(data.solution)) {
        wrongType('solution', 'array');
      } else if (data.solution.length !== n) {
        errors.push(issue('import.error.badLength', { field: 'solution', length: data.solution.length,
          expected: n }));
      } else {
        checkValues(data.solution, 'solution', 1, digits, errors);
      }
    }
    if (data.model !== undefined && data.model !== null) {
      if (errors.length === 0) checkModelSpec(data.model, variantId, n, digits, errors);
    } else if (variantId !== SG.classicModel.variantIdOf(digits)) {
      errors.push(issue('import.error.noModel', { variantId: variantId }));
    }
    return done(variantId);
  }

  // ---------------------------------------------------------------------------------------------
  // Building the model
  // ---------------------------------------------------------------------------------------------

  /** Switches the lazy propagation of the rules a model carries on (without it the solver ignores them). */
  function enableExtensions(model) {
    if (model.cages.length > 0 && SG.comboTable) SG.comboTable.enablePropagation(model.variantId);
    if (model.inequalities.length > 0 && SG.ineq) SG.ineq.ensureExtension();
  }

  function modelFromDocument(data, variantId, digits) {
    if (data.model !== undefined && data.model !== null) return SG.model.create(data.model);
    return SG.classicModel.build(digits);
  }

  /** The stored fields that must say what the model says: a document whose parts disagree is damaged. */
  function mismatch(data, model) {
    const own = model.layout;
    if (isObject(data.layout)) {
      const stored = data.layout;
      if (stored.rows !== undefined && stored.rows !== own.rows) return 'layout.rows';
      if (stored.cols !== undefined && stored.cols !== own.cols) return 'layout.cols';
      const lists = ['cellRow', 'cellCol', 'cellRegion'];
      for (let i = 0; i < lists.length; i++) {
        const list = stored[lists[i]];
        if (list !== undefined && (!Array.isArray(list) || !sameList(list, own[lists[i]]))) {
          return 'layout.' + lists[i];
        }
      }
    }
    if (isObject(data.symbols) && Array.isArray(data.symbols.labels) &&
        !sameList(data.symbols.labels.map(String), model.symbols.labels)) {
      return 'symbols';
    }
    if (Array.isArray(data.cages) && data.cages.length > 0) {
      const same = data.cages.length === model.cages.length && data.cages.every(function (c, k) {
        return isObject(c) && Array.isArray(c.cells) && c.sum === model.cages[k].sum &&
          sameList(c.cells, model.cages[k].cells);
      });
      if (!same) return 'cages';
    }
    if (Array.isArray(data.inequalities) && data.inequalities.length > 0) {
      const own = model.inequalities;
      const same = data.inequalities.length === own.length && data.inequalities.every(function (q, k) {
        return isObject(q) && q.a === own[k].a && q.b === own[k].b;
      });
      if (!same) return 'inequalities';
    }
    return null;
  }

  /** The first rule a complete grid breaks, as an issue; null for a valid solution. */
  function solutionProblem(model, solution) {
    for (let u = 0; u < model.units.length; u++) {
      const unit = model.units[u];
      let seen = 0;
      for (let i = 0; i < unit.length; i++) {
        const bit = 1 << (solution[unit[i]] - 1);
        if ((seen & bit) !== 0) return issue('import.error.solutionUnit', { unit: model.unitMeta[u].label });
        seen |= bit;
      }
    }
    for (let k = 0; k < model.cages.length; k++) {
      let sum = 0;
      for (let i = 0; i < model.cages[k].cells.length; i++) sum += solution[model.cages[k].cells[i]];
      if (sum !== model.cages[k].sum) return issue('import.error.solutionCage', { cage: k + 1 });
    }
    for (let k = 0; k < model.inequalities.length; k++) {
      const q = model.inequalities[k];
      if (!(solution[q.a] < solution[q.b])) return issue('import.error.solutionSign', { index: k + 1 });
    }
    for (let c = 0; c < model.cellCount; c++) {
      if (model.fixedCells[c] > 0 && solution[c] !== model.fixedCells[c]) {
        return issue('import.error.solutionWord');
      }
    }
    return null;
  }

  function isBudgetError(err) {
    return !!err && (err.code === 'budget.exceeded' || err.code === 'budget.cancelled');
  }

  // ---------------------------------------------------------------------------------------------
  // Identity
  // ---------------------------------------------------------------------------------------------

  function fnv(text, seed) {
    let h = (0x811c9dc5 ^ seed) >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  function hex8(n) {
    return ('00000000' + n.toString(16)).slice(-8);
  }

  /**
   * The identity of a puzzle: its variant, its structure (regions, cages, signs, key-word line, symbols) and
   * its givens. Two documents of the same puzzle, and a text line of the same classic board, have one id.
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} givens
   * @returns {string} `<variantId>-<16 hex digits>`
   */
  function puzzleId(model, givens) {
    const parts = [model.variantId, model.digits, model.cellCount, Array.from(givens).join(','),
      Array.from(model.layout.cellRegion).join(','), Array.from(model.fixedCells).join(','),
      model.symbols.labels.join(','),
      model.cages.map(function (c) { return Array.from(c.cells).join('.') + '=' + c.sum; }).join(';'),
      model.inequalities.map(function (q) { return q.a + '<' + q.b; }).join(';')];
    const text = parts.join('|');
    return model.variantId + '-' + hex8(fnv(text, 0)) + hex8(fnv(text, 0x9e3779b9));
  }

  // ---------------------------------------------------------------------------------------------
  // Opening a document
  // ---------------------------------------------------------------------------------------------

  function readDifficulty(difficulty) {
    if (!isObject(difficulty)) return null;
    const level = function (x) { return typeof x === 'string' && LEVELS.indexOf(x) !== -1 ? x : null; };
    const requested = level(difficulty.requested);
    const achieved = level(difficulty.achieved);
    if (requested === null && achieved === null) return null;
    const rawScore = difficulty.score;
    const score = typeof rawScore === 'number' && isFinite(rawScore) ? rawScore : null;
    const name = difficulty.hardestTechnique;
    const hardest = typeof name === 'string' && name.length <= 40 ? name : null;
    return { requested: requested, achieved: achieved, score: score, hardestTechnique: hardest };
  }

  function readDate(text) {
    if (typeof text !== 'string' || text.length > 40 || isNaN(Date.parse(text))) return null;
    return text;
  }

  /** The plain document a puzzle is stored as: the fields the player reads, nothing else. */
  function storedDocument(data, model, givens, solution, info) {
    const doc = {
      format: FORMAT,
      generatedAt: info.generatedAt,
      variantId: model.variantId,
      difficulty: info.difficulty === null ? null : {
        requested: info.difficulty.requested, achieved: info.difficulty.achieved,
        score: info.difficulty.score, hardestTechnique: info.difficulty.hardestTechnique
      },
      seed: info.seed,
      symbolMode: info.symbolMode,
      digits: model.digits,
      cellCount: model.cellCount,
      givens: Array.from(givens),
      solution: Array.from(solution),
      stats: { clues: info.clues },
      locale: info.locale
    };
    if (info.wordoku !== null && isObject(data.wordoku)) {
      doc.wordoku = { placement: info.wordoku.placement, line: info.wordoku.line };
    }
    if (data.model !== undefined && data.model !== null) doc.model = SG.exchange.plain(data.model);
    return doc;
  }

  /**
   * Opens a parsed document.
   * @param {*} data  A document, or the data of `parseText`.
   * @param {{source?: string, budgetMs?: number}} [options]  `source` is the way it arrived ('link', 'file',
   *   'paste', 'text', 'recent', ...) and ends up in `puzzle.info.source`.
   * @returns {Object} The outcome, see the file header (`kind` is 'json').
   */
  function openDocument(data, options) {
    const o = options || {};
    const kind = o.kind || 'json';
    try {
      return buildPuzzle(data, kind, o);
    } catch (err) {
      return failure(kind, [issue('import.error.buildFailed')]);
    }
  }

  function buildPuzzle(data, kind, o) {
    const checked = validate(data);
    if (!checked.ok) {
      return { ok: false, kind: kind, errors: checked.errors, warnings: checked.warnings, puzzle: null };
    }
    const variantId = checked.variantId;
    const digits = VARIANTS[variantId].digits;
    const errors = [];
    const warnings = checked.warnings.slice();
    const out = function () {
      return { ok: false, kind: kind, errors: errors, warnings: warnings, puzzle: null };
    };

    let model;
    try {
      model = modelFromDocument(data, variantId, digits);
    } catch (err) {
      errors.push(issue('import.error.buildFailed', { variantId: variantId }));
      return out();
    }
    if (data.model !== undefined && data.model !== null) {
      const own = SG.model.validate(model, { solve: false });
      if (!own.ok) {
        errors.push(issue('import.error.badStructure', { variantId: variantId }));
        return out();
      }
    }
    const different = mismatch(data, model);
    if (different !== null) {
      errors.push(issue('import.error.badLayout', { field: different, variantId: variantId }));
      return out();
    }
    enableExtensions(model);

    const givens = Int32Array.from(data.givens);
    let solution = null;
    let source = 'computed';
    if (Array.isArray(data.solution)) {
      solution = Int32Array.from(data.solution);
      const problem = solutionProblem(model, solution);
      if (problem !== null) {
        errors.push(problem);
        return out();
      }
      for (let c = 0; c < givens.length; c++) {
        if (givens[c] > 0 && givens[c] !== solution[c]) {
          errors.push(issue('import.error.givenMismatch', {
            cell: SG.model.cellLabel(model, c), given: givens[c], solution: solution[c]
          }));
          return out();
        }
      }
      source = 'stored';
    }

    const budget = function () { return SG.budget.create({ ms: o.budgetMs || SOLVE_BUDGET_MS }); };
    let uniqueness = 'unknown';
    try {
      const count = SG.dfs.countSolutions(model, givens, 2, budget());
      if (count === 0) {
        errors.push(issue('import.error.noSolution'));
        return out();
      }
      uniqueness = count === 1 ? 'unique' : 'multiple';
    } catch (err) {
      if (!isBudgetError(err)) {
        errors.push(issue('import.error.buildFailed', { variantId: variantId }));
        return out();
      }
    }
    if (solution === null) {
      try {
        solution = SG.dfs.solve(model, givens, null, budget());
      } catch (err) {
        solution = null;
      }
      if (solution === null) {
        errors.push(issue(uniqueness === 'unknown' ? 'import.error.buildFailed' : 'import.error.noSolution',
          { variantId: variantId }));
        return out();
      }
    }
    if (uniqueness === 'multiple') warnings.push(issue('import.warn.severalSolutions'));
    else if (uniqueness === 'unknown') warnings.push(issue('import.warn.unverified'));

    const modes = SG.modelAids.symbolModes(model);
    const word = SG.modelAids.describeWord(model);
    const info = {
      source: typeof o.source === 'string' ? o.source : 'paste',
      seed: isInt(data.seed) && data.seed >= 0 ? data.seed >>> 0 : null,
      generatedAt: readDate(data.generatedAt),
      locale: data.locale === 'en' || data.locale === 'vi' ? data.locale : null,
      difficulty: readDifficulty(data.difficulty),
      clues: countClues(givens),
      cellCount: model.cellCount,
      digits: model.digits,
      symbolMode: typeof data.symbolMode === 'string' && modes.indexOf(data.symbolMode) !== -1
        ? data.symbolMode : modes[0],
      wordoku: word === null ? null : { placement: word.placement, line: word.line }
    };
    const puzzleInfo = Object.assign({}, info);
    delete puzzleInfo.symbolMode;
    return {
      ok: true,
      kind: kind,
      errors: [],
      warnings: warnings,
      puzzle: {
        id: puzzleId(model, givens),
        variantId: variantId,
        model: model,
        givens: givens,
        solution: solution,
        uniqueness: uniqueness,
        solutionSource: source,
        symbolMode: info.symbolMode,
        info: puzzleInfo,
        document: storedDocument(data, model, givens, solution, info)
      }
    };
  }

  /**
   * Opens a classic board written as a line of characters.
   * @param {string} text
   * @param {{source?: string, budgetMs?: number}} [options]
   * @returns {Object} The outcome (`kind` is 'text').
   */
  function openText(text, options) {
    const parsed = parseText(text);
    if (!parsed.ok) return failure('text', parsed.errors);
    return openDocument(parsed.data, Object.assign({ source: 'text' }, options || {}, { kind: 'text' }));
  }

  function tokenIssue(err) {
    const code = err && typeof err.code === 'string' && /^exchange\./.test(err.code) ? err.code : null;
    return code !== null ? issue('error.' + code) : issue('import.error.buildFailed');
  }

  /**
   * Opens whatever the user gave: see the file header.
   * @param {string} input
   * @param {{source?: string, budgetMs?: number}} [options]
   * @returns {Promise<Object>} The outcome; never rejects.
   */
  function open(input, options) {
    const o = options || {};
    let seen;
    try {
      seen = detect(input);
    } catch (err) {
      return Promise.resolve(failure('unknown', [issue('import.error.unrecognised')]));
    }
    if (seen.kind === 'empty') return Promise.resolve(failure('unknown', [issue('import.error.empty')]));
    if (seen.kind === 'text') return Promise.resolve(openText(seen.value, o));
    if (seen.kind === 'json') {
      let data;
      try {
        data = JSON.parse(seen.value);
      } catch (err) {
        return Promise.resolve(failure('json', [issue('import.error.badJson')]));
      }
      return Promise.resolve(openDocument(data, Object.assign({}, o, { kind: 'json' })));
    }
    if (seen.kind === 'token' || seen.kind === 'link') {
      if (!SG.exchange) return Promise.resolve(failure(seen.kind, [issue('import.error.unrecognised')]));
      return SG.exchange.decode(seen.value).then(function (data) {
        return openDocument(data, Object.assign({}, o, { kind: seen.kind }));
      }, function (err) {
        return failure(seen.kind, [tokenIssue(err)]);
      });
    }
    return Promise.resolve(failure('unknown', [issue('import.error.unrecognised')]));
  }

  SG.importer = {
    FORMAT: FORMAT,
    LEVELS: LEVELS,
    VARIANTS: VARIANTS,
    TEXT_CHARS: TEXT_CHARS,
    ERROR_KEYS: ERROR_KEYS,
    WARNING_KEYS: WARNING_KEYS,
    detect: detect,
    parseText: parseText,
    validate: validate,
    puzzleId: puzzleId,
    issueText: issueText,
    open: open,
    openDocument: openDocument,
    openText: openText
  };

  // ---------------------------------------------------------------------------------------------
  // Strings
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'import.type.array': 'a list',
      'import.type.object': 'an object',
      'import.type.number': 'a number',
      'import.type.string': 'text',
      'import.error.empty': 'There is nothing to open: the text is empty.',
      'import.error.tooLarge': 'This is too large to be a puzzle.',
      'import.error.badJson': 'This is not valid JSON, so it cannot be a puzzle file.',
      'import.error.notObject': 'A puzzle file must hold one JSON object.',
      'import.error.noFormat': 'This file has no "format" field, so it is not a Sudoku puzzle file.',
      'import.error.wrongFormat': 'Unknown file format "{format}". The player opens sudoku-generator/v1 ' +
        'files.',
      'import.error.wrongVersion': 'This puzzle uses the format {found}, but this player understands ' +
        '{supported}. Update the player, or export the puzzle again.',
      'import.error.missingField': 'The field "{field}" is missing.',
      'import.error.badType': 'The field "{field}" must be {expected}.',
      'import.error.unknownVariant': 'This player cannot open the variant "{variant}".',
      'import.error.noModel': 'This {variant} puzzle has no description of its board. Generate it again ' +
        'with the current Sudoku Generator and use its "Play online" button.',
      'import.error.badModel': 'The board description of this puzzle is damaged (field "{field}").',
      'import.error.buildFailed': 'The board of this puzzle could not be built.',
      'import.error.badStructure': 'The board of this {variant} puzzle is not valid.',
      'import.error.badDigits': '{variant} puzzles use the values 1 to {expected}, but this file says ' +
        '{digits}.',
      'import.error.badCellCount': 'The file says {cellCount} cells, but this variant has {expected}.',
      'import.error.badLength': 'The list "{field}" has {length} entries, but {expected} are needed.',
      'import.error.badDigit': 'The list "{field}" has the value {value} at position {cell}, which is not ' +
        'between {min} and {max}.',
      'import.error.givenMismatch': 'The clue in {cell} ({given}) disagrees with the solution ({solution}).',
      'import.error.solutionUnit': 'The stored solution repeats a value in {unit}.',
      'import.error.solutionCage': 'The stored solution does not add up in cage {cage}.',
      'import.error.solutionSign': 'The stored solution breaks the sign number {index}.',
      'import.error.solutionWord': 'The stored solution does not spell the key word.',
      'import.error.badLayout': 'The part "{field}" of this file does not match the board of the puzzle.',
      'import.error.cageBadCells': 'Cage {cage} lists cells that do not exist or repeat.',
      'import.error.cageOverlap': 'Cell {cell} is in more than one cage (cage {cage}).',
      'import.error.cageNotCovered': 'Some cells are not in any cage ({count}).',
      'import.error.cageBadSum': 'Cage {cage} has the sum {sum}, which its cells cannot make ({min} to ' +
        '{max}).',
      'import.error.ineqBadIndex': 'Sign {index} points at a cell that does not exist.',
      'import.error.ineqSelf': 'Sign {index} compares a cell with itself.',
      'import.error.ineqDuplicate': 'Sign {index} appears twice.',
      'import.error.ineqNotAdjacent': 'Sign {index} is not between two neighbouring cells.',
      'import.error.ineqCycle': 'The signs contradict each other (a cycle of "less than").',
      'import.error.textChars': 'The character "{char}" at position {position} is not a clue. Use 1-9 for ' +
        'clues and . 0 - _ for empty cells.',
      'import.error.textLength': 'A line of {length} characters is not a board. Use 16 (4×4), 36 (6×6) or ' +
        '81 (9×9) characters.',
      'import.error.unrecognised': 'This is not a puzzle. Paste a puzzle file, a link from Sudoku ' +
        'Generator, or a line of 16, 36 or 81 characters.',
      'import.error.noSolution': 'This puzzle has no solution, so it cannot be played.',
      'import.error.readFailed': 'The file could not be read.',
      'import.warn.severalSolutions': 'This puzzle has more than one solution. Any complete valid grid ' +
        'counts as solved; hints follow one of them.',
      'import.warn.unverified': 'Checking whether this puzzle has a single solution took too long, so it ' +
        'was not checked.'
    },
    vi: {
      'import.type.array': 'một danh sách',
      'import.type.object': 'một đối tượng',
      'import.type.number': 'một con số',
      'import.type.string': 'một đoạn chữ',
      'import.error.empty': 'Chưa có gì để mở: nội dung đang trống.',
      'import.error.tooLarge': 'Nội dung quá lớn, không thể là một đề Sudoku.',
      'import.error.badJson': 'Đây không phải JSON hợp lệ nên không thể là tệp đề.',
      'import.error.notObject': 'Tệp đề phải chứa đúng một đối tượng JSON.',
      'import.error.noFormat': 'Tệp này không có trường "format" nên không phải tệp đề Sudoku.',
      'import.error.wrongFormat': 'Định dạng tệp "{format}" không rõ. Trình chơi mở được tệp ' +
        'sudoku-generator/v1.',
      'import.error.wrongVersion': 'Đề này dùng định dạng {found}, còn trình chơi hiểu {supported}. Hãy ' +
        'cập nhật trình chơi hoặc xuất lại đề.',
      'import.error.missingField': 'Thiếu trường "{field}".',
      'import.error.badType': 'Trường "{field}" phải là {expected}.',
      'import.error.unknownVariant': 'Trình chơi này không mở được biến thể "{variant}".',
      'import.error.noModel': 'Đề {variant} này không kèm mô tả bàn cờ. Hãy tạo lại bằng Trình sinh đề ' +
        'Sudoku bản mới rồi dùng nút "Chơi trực tuyến".',
      'import.error.badModel': 'Phần mô tả bàn cờ của đề này bị hỏng (trường "{field}").',
      'import.error.buildFailed': 'Không dựng được bàn cờ của đề này.',
      'import.error.badStructure': 'Bàn cờ của đề {variant} này không hợp lệ.',
      'import.error.badDigits': 'Đề {variant} dùng các giá trị từ 1 đến {expected}, nhưng tệp ghi {digits}.',
      'import.error.badCellCount': 'Tệp ghi {cellCount} ô, nhưng biến thể này có {expected} ô.',
      'import.error.badLength': 'Danh sách "{field}" có {length} phần tử, trong khi cần {expected}.',
      'import.error.badDigit': 'Danh sách "{field}" có giá trị {value} ở vị trí {cell}, nằm ngoài khoảng ' +
        'từ {min} đến {max}.',
      'import.error.givenMismatch': 'Ô cho sẵn {cell} ({given}) không khớp với đáp án ({solution}).',
      'import.error.solutionUnit': 'Đáp án kèm theo bị trùng giá trị trong {unit}.',
      'import.error.solutionCage': 'Đáp án kèm theo không đúng tổng ở lồng {cage}.',
      'import.error.solutionSign': 'Đáp án kèm theo vi phạm dấu so sánh số {index}.',
      'import.error.solutionWord': 'Đáp án kèm theo không ghép thành từ khóa.',
      'import.error.badLayout': 'Phần "{field}" của tệp không khớp với bàn cờ của đề.',
      'import.error.cageBadCells': 'Lồng {cage} liệt kê ô không tồn tại hoặc bị lặp.',
      'import.error.cageOverlap': 'Ô {cell} nằm trong nhiều lồng (lồng {cage}).',
      'import.error.cageNotCovered': 'Có ô không thuộc lồng nào ({count}).',
      'import.error.cageBadSum': 'Lồng {cage} có tổng {sum} mà các ô của nó không thể tạo ra (từ {min} đến ' +
        '{max}).',
      'import.error.ineqBadIndex': 'Dấu số {index} trỏ tới ô không tồn tại.',
      'import.error.ineqSelf': 'Dấu số {index} so sánh một ô với chính nó.',
      'import.error.ineqDuplicate': 'Dấu số {index} xuất hiện hai lần.',
      'import.error.ineqNotAdjacent': 'Dấu số {index} không nằm giữa hai ô kề nhau.',
      'import.error.ineqCycle': 'Các dấu so sánh mâu thuẫn nhau (một vòng "nhỏ hơn").',
      'import.error.textChars': 'Ký tự "{char}" ở vị trí {position} không phải ô cho sẵn. Dùng 1-9 cho ô ' +
        'cho sẵn và . 0 - _ cho ô trống.',
      'import.error.textLength': 'Dòng {length} ký tự không phải một bàn cờ. Hãy dùng 16 (4×4), 36 (6×6) ' +
        'hoặc 81 (9×9) ký tự.',
      'import.error.unrecognised': 'Đây không phải một đề. Hãy dán tệp đề, liên kết từ Trình sinh đề ' +
        'Sudoku hoặc một dòng 16, 36 hay 81 ký tự.',
      'import.error.noSolution': 'Đề này không có lời giải nên không thể chơi.',
      'import.error.readFailed': 'Không đọc được tệp.',
      'import.warn.severalSolutions': 'Đề này có nhiều hơn một lời giải. Mọi lưới đầy đủ hợp lệ đều được ' +
        'tính là đã giải; gợi ý đi theo một trong các lời giải đó.',
      'import.warn.unverified': 'Việc kiểm tra đề có duy nhất một lời giải mất quá nhiều thời gian nên đã ' +
        'bỏ qua.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
