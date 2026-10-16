/**
 * Import and validation (task T-7.2; design.md sections 14.1 and 11): `SG.importUi`. Reads a puzzle from the
 * JSON of design.md 14.1 (a file, a drop, or pasted text) or from a plain line of digits, checks it, rebuilds
 * a REAL `PuzzleModel` of the variant, checks that the puzzle has one solution and shows it on the board
 * through `SG.app.showResult`. A file that is corrupted, of another version or not supported gives a
 * translated message (`import.error.*`), never an exception. "Analyse difficulty" rates the imported puzzle
 * with the same scorer the generator uses.
 *
 * Two layers, so that what matters runs in Node:
 *  - PURE (no DOM): `parseJson`, `parseText`, `validate`, `buildModel`, `importText`, `toResult`, `analyse`.
 *  - DOM: `mount` (the import section, hosted by the Export dialog), `open` (the section in a dialog of its
 *    own) and the page-wide drop of a file.
 *
 * ---------------------------------------------------------------------------------------------------------
 * PUBLIC API (`SG.importUi`)
 * ---------------------------------------------------------------------------------------------------------
 *   init(app)               Idempotent. Remembers the app and lets a file be dropped anywhere on the page.
 *   mount(container, opts?) Builds the import section into `container`. `opts.app` (default: the app of
 *                           `init`). Returns `{ destroy(), run(text) }`.
 *   open()                  The import section in a dialog of its own (null without a DOM or an app).
 *   parseJson(text)         -> `{ ok, data, errors }`; never throws.
 *   parseText(text, opts?)  A plain line of digits -> `{ ok, data, errors }` where `data` has the shape of
 *                           the JSON. Whitespace is ignored; '.', '0', '-' and '_' are empty cells; 16, 36,
 *                           81, 144 and 256 characters identify classic4, classic6, classic9, mega12 and
 *                           mega16 (`opts.variantId` names the rules of an 81 character line: classic9,
 *                           diagonalX or hyper). Values above 9 are written A, B, C...
 *   validate(data)          Checks the form of a JSON document -> `{ ok, errors, warnings, variantId }`.
 *   buildModel(data, opts?) Validates, rebuilds the model of the variant from the stored structure (nothing
 *                           is randomised), checks givens, solution and uniqueness -> `{ ok, errors,
 *                           warnings, variantId, model, givens, solution, uniqueness, solutionSource,
 *                           rating, data }`. `uniqueness`: 'unique' | 'multiple' | 'none' | 'unknown'.
 *                           A puzzle with no or several solutions is still `ok` (with a warning).
 *   importText(text, opts?) `parseJson` or `parseText` (a text that starts with '{' or '[' is JSON), then
 *                           `buildModel`; adds `kind: 'json' | 'text'`.
 *   toResult(built, opts?)  A `PuzzleResult` (`source: 'import'`) from `buildModel`; `opts.rating` replaces
 *                           the stored one.
 *   analyse(model, givens, opts?)  -> `{ ok, rating, errors }` with `SG.difficulty.rate`.
 *   importAndShow(app, text, opts?) -> Promise<outcome>: `importText`, then `app.showResult`, then the
 *                           analysis for a puzzle that came without a rating.
 *   issueText(issue)        The translated text of an error or warning `{ key, args }`.
 *   ERROR_KEYS / WARNING_KEYS  Every translation key of the messages.
 * An issue is `{ key, args }`: the key of a `import.error.*` / `import.warn.*` text and its arguments.
 * Strings: the `import.*` fragment at the bottom of this file.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first definition on repeated loads.
  if (SG.importUi && typeof SG.importUi.parseJson === 'function') return;

  const FORMAT = 'sudoku-generator/v1';
  const FORMAT_PREFIX = /^sudoku-generator\/v(\d+)/;
  const MAX_CHARS = 4000000;
  const MAX_TEXT_CHARS = 1024;
  const EMPTY_CHARS = '.0-_';
  const TEXT_VARIANTS = Object.freeze({ 16: 'classic4', 36: 'classic6', 81: 'classic9', 144: 'mega12',
    256: 'mega16' });
  /** The rule sets that a line of 81 digits can mean, in the order of the choice list. */
  const TEXT_CHOICES = Object.freeze(['classic9', 'diagonalX', 'hyper']);
  const SOLVE_BUDGET_MS = 8000;
  const ANALYSE_BUDGET_MS = 60000;
  const STEP_IDS = Object.freeze(['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate',
    'tune']);
  const PAINT_FALLBACK_MS = 150;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const ERROR_KEYS = Object.freeze([
    'import.error.empty', 'import.error.tooLarge', 'import.error.badJson', 'import.error.notObject',
    'import.error.noFormat', 'import.error.wrongFormat', 'import.error.wrongVersion',
    'import.error.missingField', 'import.error.badType', 'import.error.unknownVariant',
    'import.error.buildFailed', 'import.error.badStructure', 'import.error.badDigits',
    'import.error.badCellCount', 'import.error.badLength', 'import.error.badDigit',
    'import.error.givenMismatch', 'import.error.solutionUnit', 'import.error.solutionCage',
    'import.error.solutionSign', 'import.error.solutionWord', 'import.error.badLayout',
    'import.error.badSymbols', 'import.error.badRegions', 'import.error.cageBadCells',
    'import.error.cageOverlap', 'import.error.cageNotCovered', 'import.error.cageBadSum',
    'import.error.cageDistinct', 'import.error.ineqBadIndex', 'import.error.ineqSelf',
    'import.error.ineqDuplicate', 'import.error.ineqNotAdjacent', 'import.error.ineqCycle',
    'import.error.badWord', 'import.error.unsupportedText', 'import.error.textChars',
    'import.error.textLength', 'import.error.analyseTooLong', 'import.error.analyseFailed',
    'import.error.readFailed', 'import.error.cannotShow'
  ]);

  const WARNING_KEYS = Object.freeze([
    'import.warn.noSolution', 'import.warn.severalSolutions', 'import.warn.unverified',
    'import.warn.ignoredStructure'
  ]);

  // ---------------------------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------------------------

  function t(key, args) {
    return SG.i18n && typeof SG.i18n.t === 'function' ? SG.i18n.t(key, args) : key;
  }

  function hasText(key) {
    return !!(SG.i18n && typeof SG.i18n.has === 'function' && SG.i18n.has(key));
  }

  function nameOf(prefix, id) {
    return hasText(prefix + id) ? t(prefix + id) : String(id === null || id === undefined ? '' : id);
  }

  function logError(err) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
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

  function cellName(model, cell) {
    if (SG.model && typeof SG.model.cellLabel === 'function') return SG.model.cellLabel(model, cell);
    return '#' + (cell + 1);
  }

  /**
   * The translated text of an error or a warning.
   * @param {{key: string, args: Object}} item
   * @returns {string}
   */
  function issueText(item) {
    const args = Object.assign({}, item.args);
    if (typeof args.variantId === 'string') args.variantId = nameOf('variant.', args.variantId);
    if (typeof args.expected === 'string' && hasText('import.type.' + args.expected)) {
      args.expected = t('import.type.' + args.expected);
    }
    return t(item.key, args);
  }

  // ---------------------------------------------------------------------------------------------
  // Parsing
  // ---------------------------------------------------------------------------------------------

  function failed(key, args) {
    return { ok: false, data: null, errors: [issue(key, args)] };
  }

  /**
   * Parses the text of a JSON file.
   * @param {string} text
   * @returns {{ok: boolean, data: *, errors: Array<{key: string, args: Object}>}} Never throws.
   */
  function parseJson(text) {
    if (typeof text !== 'string') return failed('import.error.empty');
    const body = text.replace(/^\uFEFF/, '').trim();
    if (body === '') return failed('import.error.empty');
    if (body.length > MAX_CHARS) return failed('import.error.tooLarge');
    try {
      return { ok: true, data: JSON.parse(body), errors: [] };
    } catch (err) {
      return failed('import.error.badJson');
    }
  }

  function textValue(ch) {
    if (ch >= '1' && ch <= '9') return ch.charCodeAt(0) - 48;
    const up = ch.toUpperCase();
    if (up >= 'A' && up <= 'Z') return up.charCodeAt(0) - 55;
    return -1;
  }

  /**
   * Parses a puzzle written as one line of digits (see the file header).
   * @param {string} text
   * @param {{variantId?: string}} [options]  The rules of the line (needed only to choose between the
   *   variants of the same size: classic9, diagonalX, hyper).
   * @returns {{ok: boolean, data: ?Object, errors: Array<{key: string, args: Object}>}} `data` has the shape
   *   of the JSON document (`format`, `variantId`, `digits`, `cellCount`, `givens`, ...).
   */
  function parseText(text, options) {
    if (typeof text !== 'string') return failed('import.error.empty');
    const line = text.replace(/\s+/g, '');
    if (line === '') return failed('import.error.empty');
    if (line.length > MAX_TEXT_CHARS) return failed('import.error.unsupportedText', { length: line.length });
    const wanted = options && options.variantId;
    let variantId = TEXT_VARIANTS[line.length];
    const unsupported = function () {
      return failed('import.error.unsupportedText', { length: line.length });
    };
    if (wanted !== undefined && wanted !== null && wanted !== '') {
      const listed = Object.keys(TEXT_VARIANTS).map(function (k) { return TEXT_VARIANTS[k]; })
        .concat(TEXT_CHOICES);
      if (listed.indexOf(wanted) === -1) return unsupported();
      variantId = wanted;
    }
    if (variantId === undefined || !SG.variants || !SG.variants.has(variantId)) return unsupported();
    const def = SG.variants.get(variantId);
    const expected = def.digits * def.digits;
    if (line.length !== expected) {
      return failed('import.error.textLength', { length: line.length, expected: expected,
        variantId: variantId });
    }
    const givens = new Array(line.length);
    for (let i = 0; i < line.length; i++) {
      const ch = line.charAt(i);
      if (EMPTY_CHARS.indexOf(ch) !== -1) {
        givens[i] = 0;
        continue;
      }
      const v = textValue(ch);
      if (v < 0) return failed('import.error.textChars', { char: ch, position: i + 1 });
      if (v > def.digits) {
        return failed('import.error.badDigit', { field: 'givens', cell: i + 1, value: ch, min: 0,
          max: def.digits });
      }
      givens[i] = v;
    }
    return { ok: true, data: { format: FORMAT, variantId: variantId, variantOptions: {}, digits: def.digits,
      cellCount: expected, givens: givens, solution: null, source: 'text' }, errors: [] };
  }

  // ---------------------------------------------------------------------------------------------
  // Validation of the JSON document
  // ---------------------------------------------------------------------------------------------

  /** Pushes `badDigit` for the first entry of a list that is not a whole number in min..max. */
  function checkValues(list, field, min, max, errors) {
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      if (!(isInt(v) && v >= min && v <= max)) {
        errors.push(issue('import.error.badDigit', { field: field, cell: i + 1, value: String(v), min: min,
          max: max }));
        return false;
      }
    }
    return true;
  }

  function checkCages(cages, n, digits, mustCover, errors) {
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
        if (!(isInt(c) && c >= 0 && c < n) || seen.has(c)) valid = false;
        seen.add(c);
      }
      if (!valid) {
        errors.push(issue('import.error.cageBadCells', { cage: number }));
        ok = false;
        continue;
      }
      if (cage.distinct !== undefined && cage.distinct !== true) {
        errors.push(issue('import.error.cageDistinct', { cage: number }));
        ok = false;
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
      if (!(isInt(cage.sum) && cage.sum >= min && cage.sum <= max)) {
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

  function checkInequalities(list, n, errors) {
    const out = [];
    for (let c = 0; c < n; c++) out.push([]);
    const indegree = new Int32Array(n);
    const seen = new Set();
    let ok = true;
    for (let k = 0; k < list.length; k++) {
      const q = list[k];
      const index = k + 1;
      if (!isObject(q) || !(isInt(q.a) && q.a >= 0 && q.a < n && isInt(q.b) && q.b >= 0 && q.b < n)) {
        errors.push(issue('import.error.ineqBadIndex', { index: index }));
        ok = false;
      } else if (q.a === q.b) {
        errors.push(issue('import.error.ineqSelf', { index: index }));
        ok = false;
      } else if (seen.has(q.a + ',' + q.b)) {
        errors.push(issue('import.error.ineqDuplicate', { index: index }));
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

  /** The key word, placement and line of a Wordoku document (from `wordoku`, else `variantOptions.word`). */
  function readWordoku(data) {
    const w = isObject(data.wordoku) ? data.wordoku : {};
    const opts = isObject(data.variantOptions) ? data.variantOptions : {};
    const raw = typeof w.word === 'string' ? w.word : (typeof opts.word === 'string' ? opts.word : '');
    const word = SG.wordoku && raw !== '' ? SG.wordoku.normalizeWord(raw) : '';
    const placement = typeof w.placement === 'string' ? w.placement : 'diagonal';
    const line = w.line === null || w.line === undefined ? null : w.line;
    const placements = SG.wordoku ? SG.wordoku.PLACEMENTS : ['diagonal', 'row', 'column'];
    const valid = word.length === 9 && SG.wordoku.isIsogram(word) && placements.indexOf(placement) !== -1 &&
      (placement === 'diagonal' || (isInt(line) && line >= 1 && line <= 9));
    return { word: word, placement: placement, line: line, valid: valid, raw: raw };
  }

  /**
   * Checks the form of a JSON document: the format and its version, the variant, the types and ranges of
   * every list, the cages and the inequalities. It does not build a model (see `buildModel`).
   * @param {*} data  The parsed JSON.
   * @returns {{ok: boolean, errors: Array<{key: string, args: Object}>,
   *   warnings: Array<{key: string, args: Object}>, variantId: ?string}}
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
    if (!SG.variants || !SG.variants.has(data.variantId)) {
      errors.push(issue('import.error.unknownVariant', { variantId: data.variantId }));
      return done();
    }
    const variantId = data.variantId;
    const def = SG.variants.get(variantId);
    const digits = def.digits;

    if (data.digits !== undefined && data.digits !== digits) {
      errors.push(issue('import.error.badDigits', { digits: String(data.digits), expected: digits,
        variantId: variantId }));
    }
    if (data.variantOptions !== undefined && !isObject(data.variantOptions)) {
      wrongType('variantOptions', 'object');
    }

    let n = -1;
    if (data.givens === undefined) {
      missing('givens');
    } else if (!Array.isArray(data.givens)) {
      wrongType('givens', 'array');
    } else {
      n = data.givens.length;
      if (data.cellCount !== undefined && data.cellCount !== n) {
        errors.push(issue('import.error.badCellCount', { cellCount: String(data.cellCount), expected: n }));
      }
      checkValues(data.givens, 'givens', 0, digits, errors);
    }

    if (data.solution !== undefined && data.solution !== null) {
      if (!Array.isArray(data.solution)) {
        wrongType('solution', 'array');
      } else if (n >= 0 && data.solution.length !== n) {
        errors.push(issue('import.error.badLength', { field: 'solution', length: data.solution.length,
          expected: n }));
      } else {
        checkValues(data.solution, 'solution', 1, digits, errors);
      }
    }

    if (data.layout !== undefined && !isObject(data.layout)) {
      wrongType('layout', 'object');
    } else if (isObject(data.layout)) {
      ['cellRow', 'cellCol', 'cellRegion'].forEach(function (name) {
        const list = data.layout[name];
        if (list === undefined) return;
        if (!Array.isArray(list)) wrongType('layout.' + name, 'array');
        else if (n >= 0 && list.length !== n) {
          errors.push(issue('import.error.badLength', { field: 'layout.' + name, length: list.length,
            expected: n }));
        } else {
          checkValues(list, 'layout.' + name, 0, 4095, errors);
        }
      });
    }

    const usesCages = variantId === 'killer';
    const usesSigns = variantId === 'greaterThan';
    if (data.cages !== undefined && !Array.isArray(data.cages)) {
      wrongType('cages', 'array');
    } else if (usesCages) {
      if (data.cages === undefined) missing('cages');
      else if (n >= 0) checkCages(data.cages, n, digits, true, errors);
    } else if (Array.isArray(data.cages) && data.cages.length > 0) {
      warnings.push(issue('import.warn.ignoredStructure', { field: 'cages', variantId: variantId }));
    }
    if (data.inequalities !== undefined && !Array.isArray(data.inequalities)) {
      wrongType('inequalities', 'array');
    } else if (usesSigns) {
      if (data.inequalities === undefined) missing('inequalities');
      else if (n >= 0) checkInequalities(data.inequalities, n, errors);
    } else if (Array.isArray(data.inequalities) && data.inequalities.length > 0) {
      warnings.push(issue('import.warn.ignoredStructure', { field: 'inequalities', variantId: variantId }));
    }

    if (variantId === 'jigsaw9') {
      const regions = isObject(data.layout) ? data.layout.cellRegion : undefined;
      if (regions === undefined) {
        missing('layout.cellRegion');
      } else if (Array.isArray(regions) && SG.jigsaw && typeof SG.jigsaw.checkRegions === 'function' &&
          errors.length === 0) {
        const problems = SG.jigsaw.checkRegions(regions, digits);
        if (problems.length > 0) errors.push(issue('import.error.badRegions', { count: problems.length }));
      }
    }
    if (variantId === 'wordoku') {
      const info = readWordoku(data);
      if (!info.valid) errors.push(issue('import.error.badWord', { word: info.raw.slice(0, 24) }));
    }
    return done(variantId);
  }

  // ---------------------------------------------------------------------------------------------
  // Building the model
  // ---------------------------------------------------------------------------------------------

  /**
   * The model of the stored puzzle. Nothing is random: the structure that the generator made (regions,
   * cages, signs, the key word) comes from the document, everything else is the fixed geometry of the
   * variant. Killer and Greater-Than switch their lazy propagation on (memory.md 6.5).
   */
  function createModel(data, def) {
    const options = SG.variants.sanitizeOptions(def, data.variantOptions || {});
    let model;
    if (def.id === 'jigsaw9') {
      model = SG.jigsaw.modelFromRegions('jigsaw9', def.digits, Int32Array.from(data.layout.cellRegion));
    } else if (def.id === 'killer') {
      model = SG.killer.modelFromCages(data.cages);
    } else if (def.id === 'greaterThan') {
      model = SG.greaterThan.withSigns(def.build(options, SG.rng.create(1)), data.inequalities);
    } else if (def.id === 'wordoku') {
      const info = readWordoku(data);
      model = SG.wordoku.buildBoard(info.word, info.placement, info.line === null ? 0 : info.line - 1);
    } else {
      model = def.build(options, SG.rng.create(1).fork('model'));
    }
    if (model.cages.length > 0 && SG.comboTable) SG.comboTable.enablePropagation(model.variantId);
    if (model.inequalities.length > 0 && SG.ineq) SG.ineq.ensureExtension();
    return model;
  }

  function sameSubGrids(stored, model) {
    const own = model.layout.subGrids;
    if (!Array.isArray(stored) || stored.length !== own.length) return false;
    return stored.every(function (g, i) {
      return isObject(g) && g.gridIndex === own[i].gridIndex && g.originRow === own[i].originRow &&
        g.originCol === own[i].originCol;
    });
  }

  /** The stored layout must be the one of the rebuilt model; returns the first field that is not. */
  function layoutMismatch(layout, model) {
    if (!isObject(layout)) return null;
    const own = model.layout;
    if (layout.rows !== undefined && layout.rows !== own.rows) return 'rows';
    if (layout.cols !== undefined && layout.cols !== own.cols) return 'cols';
    const lists = ['cellRow', 'cellCol', 'cellRegion'];
    for (let i = 0; i < lists.length; i++) {
      const stored = layout[lists[i]];
      if (stored !== undefined && !sameList(stored, own[lists[i]])) return lists[i];
    }
    if (layout.subGrids !== undefined && !sameSubGrids(layout.subGrids, model)) return 'subGrids';
    return null;
  }

  function signsAreAdjacent(model) {
    const row = model.layout.cellRow;
    const col = model.layout.cellCol;
    for (let k = 0; k < model.inequalities.length; k++) {
      const q = model.inequalities[k];
      if (Math.abs(row[q.a] - row[q.b]) + Math.abs(col[q.a] - col[q.b]) !== 1) return k + 1;
    }
    return 0;
  }

  /** The first rule that a complete grid breaks, as an issue; null for a valid solution. */
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

  /** The stored rating, or null when the document has none that is usable. */
  function readRating(difficulty, givens) {
    if (!isObject(difficulty)) return null;
    const level = difficulty.achieved;
    const levels = SG.difficulty ? SG.difficulty.LEVELS : [];
    if (typeof level !== 'string' || levels.indexOf(level) === -1) return null;
    if (typeof difficulty.score !== 'number' || !isFinite(difficulty.score)) return null;
    const counts = {};
    if (isObject(difficulty.techniqueCounts)) {
      Object.keys(difficulty.techniqueCounts).forEach(function (id) {
        const n = difficulty.techniqueCounts[id];
        if (isInt(n) && n >= 0) counts[id] = n;
      });
    }
    const num = function (x, fallback) { return typeof x === 'number' && isFinite(x) ? x : fallback; };
    return {
      level: level,
      score: difficulty.score,
      rawScore: num(difficulty.rawScore, difficulty.score),
      hardestTechnique: typeof difficulty.hardestTechnique === 'string' ? difficulty.hardestTechnique : null,
      hardestGroup: typeof difficulty.hardestGroup === 'string' ? difficulty.hardestGroup : null,
      confidence: num(difficulty.confidence, 0),
      solved: typeof difficulty.solved === 'boolean' ? difficulty.solved : true,
      empties: isInt(difficulty.empties) ? difficulty.empties : givens.length - countClues(givens),
      techniqueCounts: counts
    };
  }

  function isBudgetError(err) {
    return !!err && err.code === 'budget.exceeded';
  }

  /**
   * Rebuilds the puzzle of a JSON document and checks it: the model of the variant from the stored
   * structure, the layout against it, the givens against the solution, the solution against the rules,
   * and the number of solutions of the givens. A puzzle with no or with several solutions is not an error
   * (it can still be looked at): it gets a warning and `uniqueness` 'none' / 'multiple'.
   * @param {Object} data  A parsed JSON document, or the data of `parseText`.
   * @param {{budgetMs?: number}} [options]  Time limit of the search for solutions.
   * @returns {{ok: boolean, errors: Array<Object>, warnings: Array<Object>, variantId: ?string,
   *   model: ?Object, givens: ?Int32Array, solution: ?Int32Array, uniqueness: string,
   *   solutionSource: string, rating: ?Object, data: ?Object}}
   */
  function buildModel(data, options) {
    const o = options || {};
    const checked = validate(data);
    const out = { ok: false, errors: checked.errors.slice(), warnings: checked.warnings.slice(),
      variantId: checked.variantId, model: null, givens: null, solution: null, uniqueness: 'unknown',
      solutionSource: 'none', rating: null, data: null };
    if (!checked.ok) return out;
    const def = SG.variants.get(checked.variantId);
    const fail = function (key, args) {
      out.errors.push(issue(key, args));
      return out;
    };

    let model;
    try {
      model = createModel(data, def);
    } catch (err) {
      return fail('import.error.buildFailed', { variantId: def.id });
    }
    if (model.cellCount !== data.givens.length) {
      return fail('import.error.badLength', { field: 'givens', length: data.givens.length,
        expected: model.cellCount });
    }
    const structure = SG.model.validate(model, { solve: false });
    if (!structure.ok) return fail('import.error.badStructure', { variantId: def.id });
    const mismatch = layoutMismatch(data.layout, model);
    if (mismatch !== null) return fail('import.error.badLayout', { field: mismatch, variantId: def.id });
    if (isObject(data.symbols) && Array.isArray(data.symbols.labels) &&
        !sameList(data.symbols.labels.map(String), model.symbols.labels)) {
      return fail('import.error.badSymbols', { variantId: def.id });
    }
    const adjacent = signsAreAdjacent(model);
    if (adjacent > 0) return fail('import.error.ineqNotAdjacent', { index: adjacent });

    const givens = Int32Array.from(data.givens);
    let solution = null;
    let source = 'none';
    if (Array.isArray(data.solution)) {
      solution = Int32Array.from(data.solution);
      const problem = solutionProblem(model, solution);
      if (problem !== null) {
        out.errors.push(problem);
        return out;
      }
      for (let c = 0; c < givens.length; c++) {
        if (givens[c] > 0 && givens[c] !== solution[c]) {
          return fail('import.error.givenMismatch', { cell: cellName(model, c), given: givens[c],
            solution: solution[c] });
        }
      }
      source = 'stored';
    }

    let uniqueness = 'unknown';
    const budget = function () { return SG.budget.create({ ms: o.budgetMs || SOLVE_BUDGET_MS }); };
    try {
      const count = SG.dfs.countSolutions(model, givens, 2, budget());
      uniqueness = count === 1 ? 'unique' : (count === 0 ? 'none' : 'multiple');
    } catch (err) {
      if (!isBudgetError(err)) return fail('import.error.buildFailed', { variantId: def.id });
    }
    if (solution === null && uniqueness !== 'none') {
      try {
        solution = SG.dfs.solve(model, givens, null, budget());
        if (solution !== null) source = 'computed';
      } catch (err) {
        if (!isBudgetError(err)) return fail('import.error.buildFailed', { variantId: def.id });
      }
    }
    if (uniqueness === 'none') out.warnings.push(issue('import.warn.noSolution'));
    else if (uniqueness === 'multiple') out.warnings.push(issue('import.warn.severalSolutions'));
    else if (uniqueness === 'unknown') out.warnings.push(issue('import.warn.unverified'));

    out.ok = true;
    out.model = model;
    out.givens = givens;
    out.solution = solution === null ? new Int32Array(model.cellCount) : solution;
    out.uniqueness = uniqueness;
    out.solutionSource = solution === null ? 'none' : source;
    out.rating = readRating(data.difficulty, givens);
    out.data = data;
    return out;
  }

  /**
   * Parses and builds in one go.
   * @param {string} text  The content of a JSON file, or a line of digits.
   * @param {{variantId?: string, budgetMs?: number}} [options]  See `parseText`, `buildModel`.
   * @returns {Object} Like `buildModel`, plus `kind` ('json' | 'text').
   */
  function importText(text, options) {
    const body = typeof text === 'string' ? text.replace(/^\uFEFF/, '').trim() : '';
    const kind = body.charAt(0) === '{' || body.charAt(0) === '[' ? 'json' : 'text';
    const parsed = kind === 'json' ? parseJson(text) : parseText(text, options);
    if (!parsed.ok) {
      return { ok: false, errors: parsed.errors, warnings: [], variantId: null, model: null, givens: null,
        solution: null, uniqueness: 'unknown', solutionSource: 'none', rating: null, data: null, kind: kind };
    }
    const built = buildModel(parsed.data, options);
    built.kind = kind;
    return built;
  }

  // ---------------------------------------------------------------------------------------------
  // The result
  // ---------------------------------------------------------------------------------------------

  function placeholderRating(model, givens) {
    return { level: '', score: 0, rawScore: 0, hardestTechnique: null, hardestGroup: null, confidence: 0,
      solved: false, empties: model.cellCount - countClues(givens), techniqueCounts: {}, unrated: true };
  }

  function pick(list, value, fallback) {
    return typeof value === 'string' && list.indexOf(value) !== -1 ? value : fallback;
  }

  /**
   * A `PuzzleResult` for the shown puzzle of an import (see `SG.app.showResult`). `source` is 'import'; the
   * seed is the stored one or null; the time per step is the stored one or zero.
   * @param {Object} built  From `buildModel` / `importText` (`ok` must be true).
   * @param {{rating?: Object}} [options]  `rating` replaces the stored rating (the analysis).
   * @returns {Object}
   */
  function toResult(built, options) {
    const o = options || {};
    const data = built.data || {};
    const model = built.model;
    const def = SG.variants.get(model.variantId);
    const rating = o.rating || built.rating || placeholderRating(model, built.givens);
    const stored = isObject(data.difficulty) ? data.difficulty : {};
    const levels = SG.difficulty ? SG.difficulty.LEVELS : [];
    const requested = pick(levels, stored.requested, rating.level);
    const timings = {};
    const source = isObject(data.stats) && isObject(data.stats.timings) ? data.stats.timings : {};
    STEP_IDS.forEach(function (id) {
      timings[id] = typeof source[id] === 'number' && isFinite(source[id]) ? source[id] : 0;
    });
    const seed = isInt(data.seed) && data.seed >= 0 ? data.seed >>> 0 : null;
    const attempts = isObject(data.stats) && isInt(data.stats.attempts) && data.stats.attempts >= 1
      ? data.stats.attempts : 1;
    const warnings = Array.isArray(data.warnings)
      ? data.warnings.filter(function (key) { return typeof key === 'string'; }) : [];
    return {
      model: model,
      givens: built.givens,
      solution: built.solution,
      rating: rating,
      seed: seed,
      config: {
        variantId: model.variantId,
        difficulty: requested,
        seed: seed,
        symbolMode: pick(def.symbolModes, data.symbolMode, def.defaultSymbolMode),
        symmetry: pick(SG.symmetry ? SG.symmetry.KINDS : [], data.symmetry, 'rotational180'),
        digOrder: pick(SG.digger ? SG.digger.ORDERS : [], data.digOrder, 'random'),
        maxAttempts: isInt(data.maxAttempts) && data.maxAttempts >= 1 ? data.maxAttempts : 8,
        trace: 'off',
        variantOptions: isObject(data.variantOptions) ? JSON.parse(JSON.stringify(data.variantOptions)) : {}
      },
      timings: timings,
      attempts: attempts,
      warnings: warnings,
      source: 'import'
    };
  }

  /**
   * Rates a puzzle with the scorer of the generator (every technique, `SG.difficulty.rate`).
   * @param {Object} model
   * @param {ArrayLike<number>} givens
   * @param {{budgetMs?: number}} [options]
   * @returns {{ok: boolean, rating: ?Object, errors: Array<Object>}}
   */
  function analyse(model, givens, options) {
    const o = options || {};
    try {
      const budget = SG.budget.create({ ms: o.budgetMs || ANALYSE_BUDGET_MS });
      return { ok: true, rating: SG.difficulty.rate(model, givens, { budget: budget }), errors: [] };
    } catch (err) {
      return { ok: false, rating: null,
        errors: [issue(isBudgetError(err) ? 'import.error.analyseTooLong' : 'import.error.analyseFailed')] };
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Showing an import
  // ---------------------------------------------------------------------------------------------

  /** Calls `fn` after the browser has painted (two frames, with a timer for a tab that paints nothing). */
  function afterPaint(fn) {
    let fired = false;
    function fire() {
      if (fired) return;
      fired = true;
      fn();
    }
    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(function () {
        root.requestAnimationFrame(function () { root.setTimeout(fire, 0); });
      });
      root.setTimeout(fire, PAINT_FALLBACK_MS);
    } else {
      root.setTimeout(fire, 0);
    }
  }

  function analyseLater(model, givens, options) {
    return new Promise(function (resolve) {
      afterPaint(function () { resolve(analyse(model, givens, options)); });
    });
  }

  function statusFor(result) {
    return function status() {
      const clues = countClues(result.givens);
      return t('import.status.shown', { variant: nameOf('variant.', result.model.variantId),
        clues: t('unit.clue', { count: clues }) });
    };
  }

  /**
   * Imports a text and shows the puzzle: `importText`, then `app.showResult`, then - for a puzzle that came
   * without a rating - the analysis, after which the result panel is updated.
   * @param {Object} app  `SG.app`.
   * @param {string} text
   * @param {{variantId?: string, onAnalyse?: function(): void}} [options]
   * @returns {Promise<Object>} `{ ok, errors, warnings, built, result, analysis }`: `result` is the shown
   *   `PuzzleResult`, `analysis` the outcome of `analyse` (null when the document had a rating).
   */
  function importAndShow(app, text, options) {
    const o = options || {};
    const built = importText(text, { variantId: o.variantId });
    const outcome = { ok: built.ok, errors: built.errors, warnings: built.warnings, built: built,
      result: null, analysis: null };
    if (!built.ok) return Promise.resolve(outcome);
    function show(rating) {
      const result = toResult(built, rating ? { rating: rating } : undefined);
      const shown = !!app && typeof app.showResult === 'function' &&
        app.showResult(result, { trace: [], status: statusFor(result) }) === true;
      return shown ? result : null;
    }
    const first = show(null);
    if (first === null) {
      outcome.ok = false;
      outcome.errors = [issue('import.error.cannotShow')];
      return Promise.resolve(outcome);
    }
    outcome.result = first;
    if (built.rating !== null) return Promise.resolve(outcome);
    if (typeof o.onAnalyse === 'function') o.onAnalyse();
    return analyseLater(built.model, built.givens).then(function (analysis) {
      outcome.analysis = analysis;
      if (analysis.ok) {
        built.rating = analysis.rating;
        outcome.result = show(analysis.rating) || first;
      } else {
        outcome.warnings = outcome.warnings.concat(analysis.errors);
      }
      return outcome;
    });
  }

  // ---------------------------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------------------------

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else node.setAttribute(name, value === true ? '' : String(value));
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function setKey(node, key, args) {
    node.setAttribute('data-i18n', key);
    if (args) node.setAttribute('data-i18n-args', JSON.stringify(args));
    else node.removeAttribute('data-i18n-args');
    node.textContent = t(key, args);
  }

  function tx(tag, attrs, key, args) {
    const node = el(tag, attrs);
    setKey(node, key, args);
    return node;
  }

  function attrKey(node, name, key) {
    const list = (node.getAttribute('data-i18n-attr') || '').split(',').filter(function (pair) {
      return pair !== '' && pair.indexOf(name + ':') !== 0;
    });
    list.push(name + ':' + key);
    node.setAttribute('data-i18n-attr', list.join(','));
    node.setAttribute(name, t(key));
  }

  function icon(name) {
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#ic-' + name);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.appendChild(use);
    return svg;
  }

  let counter = 0;
  function nextId(prefix) {
    counter++;
    return prefix + '-' + counter;
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      if (file.size > MAX_CHARS * 2) {
        reject(issue('import.error.tooLarge'));
        return;
      }
      const reader = new root.FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(issue('import.error.readFailed')); };
      reader.readAsText(file);
    });
  }

  function hasFiles(event) {
    const types = event.dataTransfer && event.dataTransfer.types;
    return !!types && Array.prototype.indexOf.call(types, 'Files') !== -1;
  }

  // ---------------------------------------------------------------------------------------------
  // The import section
  // ---------------------------------------------------------------------------------------------

  let appRef = null;
  let initialised = false;

  /**
   * Builds the import section into a container (a dialog body or the section of the Export dialog).
   * @param {Element} container
   * @param {{app?: Object}} [options]
   * @returns {{destroy: function(): void, run: function(string): void}}
   */
  function mount(container, options) {
    const app = (options && options.app) || appRef;
    const refs = {};
    let busyKey = null;
    let shown = null;
    let notes = [];
    let analysisNote = null;
    let unsubscribe = null;

    // ---- rendering of what happened ------------------------------------------------------------

    function alertBox(kind, role, lines) {
      const list = el('ul', { class: 'stack' });
      lines.forEach(function (line) { list.appendChild(el('li', { text: line })); });
      return el('div', { class: 'alert alert--' + kind, role: role }, [
        icon(kind === 'success' ? 'check' : 'alert'), list
      ]);
    }

    function techniqueLine(rating) {
      const ids = Object.keys(rating.techniqueCounts);
      if (ids.length === 0) return t('result.techniques.none');
      return ids.map(function (id) {
        return nameOf('technique.', id) + ' \u00d7 ' + rating.techniqueCounts[id];
      }).join(', ');
    }

    function analysisBlock() {
      if (analysisNote === null) return null;
      const box = el('dl', { class: 'stat-grid', 'data-role': 'analysis' });
      const rating = analysisNote.rating;
      function stat(label, value) {
        return el('div', { class: 'stat' }, [el('dt', { class: 'stat__label', text: label }),
          el('dd', { class: 'stat__value', text: value })]);
      }
      const hardest = rating.hardestTechnique === null ? t('result.hardest.none')
        : nameOf('technique.', rating.hardestTechnique);
      box.appendChild(stat(t('result.stat.level'), nameOf('difficulty.', rating.level)));
      box.appendChild(stat(t('result.stat.score'), SG.i18n.formatNumber(Math.round(rating.score))));
      box.appendChild(stat(t('result.stat.hardest'), hardest));
      const wrap = el('div', { class: 'stack', 'data-role': 'analysis-box' }, [
        tx('h4', { class: 'card__title' }, 'import.analysis.title'), box,
        el('p', { class: 'field__hint', text: t('result.techniques.title') + ': ' + techniqueLine(rating) })
      ]);
      if (!rating.solved) wrap.appendChild(tx('p', { class: 'field__hint' }, 'import.analyse.unsolved'));
      const stored = analysisNote.stored;
      if (stored !== null && (stored.level !== rating.level || Math.abs(stored.score - rating.score) > 0.5)) {
        wrap.appendChild(el('p', { class: 'field__hint', 'data-role': 'analysis-differs',
          text: t('import.analyse.differs', {
            stored: nameOf('difficulty.', stored.level), found: nameOf('difficulty.', rating.level)
          }) }));
      }
      return wrap;
    }

    function render() {
      refs.messages.textContent = '';
      notes.forEach(function (note) {
        const lines = note.items.map(function (item) { return item.text ? item.text : issueText(item); });
        refs.messages.appendChild(alertBox(note.kind, note.kind === 'danger' ? 'alert' : 'status', lines));
      });
      refs.result.textContent = '';
      refs.result.hidden = shown === null;
      if (shown !== null) {
        const unique = shown.built.uniqueness === 'unique';
        refs.result.appendChild(el('p', { 'data-role': 'imported', text: t('import.success', {
          variant: nameOf('variant.', shown.built.model.variantId),
          clues: t('unit.clue', { count: countClues(shown.built.givens) })
        }) + (unique ? ' ' + t('import.success.unique') : '') }));
        const block = analysisBlock();
        if (block !== null) refs.result.appendChild(block);
      }
      const busy = busyKey !== null;
      refs.busy.hidden = !busy;
      if (busy) setKey(refs.busyText, busyKey);
      refs.importButton.disabled = busy;
      refs.analyse.disabled = busy || shown === null;
      refs.analyse.hidden = shown === null;
      refs.panel.setAttribute('aria-busy', busy ? 'true' : 'false');
    }

    function setNotes(errors, warnings) {
      notes = [];
      if (errors.length > 0) notes.push({ kind: 'danger', items: errors });
      if (warnings.length > 0) notes.push({ kind: 'warning', items: warnings });
    }

    // ---- actions -------------------------------------------------------------------------------

    function selectedVariant() {
      return refs.variantField.hidden ? undefined : refs.variant.value;
    }

    function run(text) {
      if (busyKey !== null || !app) return;
      busyKey = 'import.busy.importing';
      notes = [];
      analysisNote = null;
      render();
      importAndShow(app, text, {
        variantId: selectedVariant(),
        onAnalyse: function () {
          busyKey = 'import.analyse.busy';
          render();
        }
      }).then(function (outcome) {
        busyKey = null;
        shown = outcome.ok ? outcome : null;
        if (outcome.ok && outcome.analysis && outcome.analysis.ok) {
          analysisNote = { rating: outcome.analysis.rating, stored: null };
        }
        setNotes(outcome.errors, outcome.warnings);
        if (outcome.ok) {
          const model = outcome.built.model;
          app.announce(t('import.success', { variant: nameOf('variant.', model.variantId),
            clues: t('unit.clue', { count: countClues(outcome.built.givens) }) }));
        }
        render();
      }).catch(function (err) {
        logError(err);
        busyKey = null;
        shown = null;
        setNotes([issue('import.error.cannotShow')], []);
        render();
      });
    }

    function analyseNow() {
      if (busyKey !== null || shown === null) return;
      const built = shown.built;
      busyKey = 'import.analyse.busy';
      render();
      analyseLater(built.model, built.givens).then(function (analysis) {
        busyKey = null;
        if (analysis.ok) {
          const stored = built.rating;
          built.rating = analysis.rating;
          analysisNote = { rating: analysis.rating, stored: stored };
          const result = toResult(built, { rating: analysis.rating });
          app.showResult(result, { trace: [], status: statusFor(result) });
          shown.result = result;
          setNotes([], shown.warnings);
        } else {
          setNotes(analysis.errors, shown.warnings);
        }
        render();
      });
    }

    function load(file) {
      if (!file) return;
      readFile(file).then(function (text) {
        refs.paste.value = text;
        updateVariantField();
        run(text);
      }, function (problem) {
        setNotes([problem], []);
        shown = null;
        render();
      });
    }

    function updateVariantField() {
      const text = refs.paste.value;
      const body = text.trim();
      const compact = text.replace(/\s+/g, '');
      const json = body.charAt(0) === '{' || body.charAt(0) === '[';
      refs.variantField.hidden = json || compact.length !== 81;
    }

    // ---- build ---------------------------------------------------------------------------------

    refs.messages = el('div', { class: 'stack', 'data-role': 'messages' });
    refs.result = el('div', { class: 'stack', 'data-role': 'result', hidden: true });
    refs.file = el('input', { type: 'file', hidden: true, accept: '.json,.txt,application/json,text/plain',
      'data-role': 'file' });
    refs.fileButton = el('button', { type: 'button', class: 'btn btn--secondary', 'data-role': 'choose' }, [
      icon('download'), tx('span', { class: 'btn__label' }, 'import.file.choose')
    ]);
    refs.fileButton.addEventListener('click', function () { refs.file.click(); });
    refs.file.addEventListener('change', function () {
      load(refs.file.files && refs.file.files[0]);
      refs.file.value = '';
    });
    refs.drop = el('div', { class: 'stack', 'data-role': 'drop' }, [
      el('div', { class: 'cluster' }, [
        refs.fileButton, tx('span', { class: 'field__hint' }, 'import.file.drop')
      ]),
      refs.file
    ]);
    refs.drop.style.setProperty('padding', 'var(--sg-space-3)');
    refs.drop.style.setProperty('border', '2px dashed var(--sg-color-border)');
    refs.drop.style.setProperty('border-radius', 'var(--sg-radius-2)');
    function dragState(on) {
      refs.drop.style.setProperty('border-color', on ? 'var(--sg-color-accent)' : 'var(--sg-color-border)');
      refs.drop.style.setProperty('background', on ? 'var(--sg-color-surface-2)' : 'transparent');
    }
    refs.drop.addEventListener('dragover', function (event) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragState(true);
    });
    refs.drop.addEventListener('dragleave', function () { dragState(false); });
    refs.drop.addEventListener('drop', function (event) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      dragState(false);
      load(event.dataTransfer.files[0]);
    });

    refs.paste = el('textarea', { class: 'textarea mono', rows: '4', spellcheck: 'false',
      id: nextId('import-text'), 'data-role': 'paste' });
    attrKey(refs.paste, 'placeholder', 'import.paste.placeholder');
    refs.paste.addEventListener('input', updateVariantField);
    refs.variant = el('select', { class: 'select', id: nextId('import-variant'), 'data-role': 'variant' });
    TEXT_CHOICES.forEach(function (id) {
      refs.variant.appendChild(el('option', { value: id }));
    });
    refs.variantField = el('div', { class: 'field', hidden: true }, [
      tx('label', { class: 'field__label', for: refs.variant.id }, 'import.variant.label'), refs.variant,
      tx('p', { class: 'field__hint' }, 'import.variant.hint')
    ]);
    function fillVariantNames() {
      Array.prototype.forEach.call(refs.variant.options, function (option) {
        option.textContent = nameOf('variant.', option.value);
      });
    }
    fillVariantNames();

    refs.importButton = tx('button', { type: 'button', class: 'btn btn--primary', 'data-role': 'import' },
      'import.button');
    refs.importButton.addEventListener('click', function () { run(refs.paste.value); });
    refs.analyse = tx('button', { type: 'button', class: 'btn btn--secondary', 'data-role': 'analyse',
      hidden: true }, 'import.analyse');
    refs.analyse.addEventListener('click', analyseNow);
    refs.busyText = el('span', { 'data-role': 'busy-text' });
    refs.busy = el('div', { class: 'stack', hidden: true, role: 'status', 'data-role': 'busy' }, [
      el('div', { class: 'progress progress--indeterminate', 'aria-hidden': 'true' }, [
        el('span', { class: 'progress__bar' })
      ]),
      refs.busyText
    ]);

    refs.panel = el('div', { class: 'stack', 'data-role': 'import-panel' }, [
      tx('p', { class: 'field__hint' }, 'import.intro'),
      refs.drop,
      el('div', { class: 'field' }, [
        tx('label', { class: 'field__label', for: refs.paste.id }, 'import.paste.label'), refs.paste
      ]),
      refs.variantField,
      el('div', { class: 'cluster' }, [refs.importButton, refs.analyse]),
      refs.busy, refs.messages, refs.result
    ]);
    container.appendChild(refs.panel);

    if (SG.i18n && typeof SG.i18n.onChange === 'function') {
      unsubscribe = SG.i18n.onChange(function () {
        fillVariantNames();
        render();
      });
    }
    render();

    return {
      run: run,
      destroy: function destroy() {
        if (unsubscribe !== null) unsubscribe();
        unsubscribe = null;
        if (refs.panel.parentNode) refs.panel.parentNode.removeChild(refs.panel);
      }
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Entry points
  // ---------------------------------------------------------------------------------------------

  /**
   * The import section in a dialog of its own.
   * @returns {?Object} The modal handle of `SG.app.openModal`; null without a DOM or an app.
   */
  function open() {
    if (appRef === null || typeof document === 'undefined') return null;
    let section = null;
    return appRef.openModal({
      titleKey: 'import.title',
      wide: true,
      body: function (container) { section = mount(container, { app: appRef }); },
      onClose: function () { if (section !== null) section.destroy(); }
    });
  }

  /** A file dropped anywhere on the page is imported (the browser would otherwise open it). */
  function onPageDrop(event) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (appRef === null || document.body.classList.contains('is-modal-open')) return;
    const file = event.dataTransfer.files[0];
    if (!file) return;
    readFile(file).then(function (text) {
      return importAndShow(appRef, text, {});
    }).then(function (outcome) {
      if (outcome.ok) {
        const variant = nameOf('variant.', outcome.built.model.variantId);
        appRef.toast('success', 'import.toast.imported', { variant: variant });
      } else {
        appRef.toast('danger', 'import.toast.failed', { message: issueText(outcome.errors[0]) });
      }
    }, function (problem) {
      appRef.toast('danger', 'import.toast.failed', { message: issueText(problem) });
    });
  }

  /**
   * Connects the module to the application. Idempotent.
   * @param {Object} app  `SG.app`.
   */
  function init(app) {
    if (!app || typeof app.on !== 'function') return;
    appRef = app;
    if (initialised || typeof document === 'undefined') return;
    initialised = true;
    root.addEventListener('dragover', function (event) {
      if (hasFiles(event)) event.preventDefault();
    });
    root.addEventListener('drop', onPageDrop);
  }

  SG.importUi = {
    FORMAT: FORMAT,
    TEXT_VARIANTS: TEXT_VARIANTS,
    TEXT_CHOICES: TEXT_CHOICES,
    ERROR_KEYS: ERROR_KEYS,
    WARNING_KEYS: WARNING_KEYS,
    init: init,
    mount: mount,
    open: open,
    parseJson: parseJson,
    parseText: parseText,
    validate: validate,
    buildModel: buildModel,
    importText: importText,
    toResult: toResult,
    analyse: analyse,
    importAndShow: importAndShow,
    issueText: issueText
  };

  // ---------------------------------------------------------------------------------------------
  // Strings of the import section
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'import.title': 'Import a puzzle',
      'import.intro': 'Open a puzzle that was exported as JSON, or paste a puzzle written as one line of ' +
        'digits (81 characters for a classic 9\u00d79, 36 for 6\u00d76, 16 for 4\u00d74).',
      'import.file.choose': 'Choose a file\u2026',
      'import.file.drop': 'or drop a .json or .txt file here',
      'import.paste.label': 'Or paste the JSON or the line of digits here',
      'import.paste.placeholder':
        '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
      'import.variant.label': 'Rules of this line of digits',
      'import.variant.hint': 'A line of 81 digits does not say which rules apply, so choose them here.',
      'import.button': 'Import',
      'import.analyse': 'Analyse difficulty',
      'import.analyse.busy': 'Analysing the puzzle\u2026',
      'import.analyse.unsolved': 'The solving techniques of the generator cannot finish this puzzle, so ' +
        'it is rated as hard as it gets.',
      'import.analyse.differs': 'The stored rating said {stored}; the analysis says {found}.',
      'import.analysis.title': 'Difficulty analysis',
      'import.busy.importing': 'Importing the puzzle\u2026',
      'import.status.shown': 'Imported puzzle: {variant}, {clues}.',
      'import.success': 'Imported {variant}: {clues}.',
      'import.success.unique': 'It has exactly one solution.',
      'import.toast.imported': 'Imported {variant}.',
      'import.toast.failed': 'Could not import: {message}',
      'import.type.array': 'a list',
      'import.type.object': 'an object',
      'import.error.empty': 'There is nothing to import: choose a file or paste a puzzle.',
      'import.error.tooLarge': 'This is too large to be a puzzle file.',
      'import.error.badJson': 'This is not valid JSON and not a line of digits either. Check that the ' +
        'file is complete.',
      'import.error.notObject': 'The JSON must be one object that describes a puzzle.',
      'import.error.noFormat': 'This JSON has no \u201cformat\u201d field, so it was not exported by this ' +
        'generator.',
      'import.error.wrongFormat': 'The format \u201c{format}\u201d is not a puzzle of this generator.',
      'import.error.wrongVersion': 'The file has the version \u201c{found}\u201d, but this generator reads ' +
        'only \u201c{supported}\u201d. Export it again with a matching version.',
      'import.error.missingField': 'The field \u201c{field}\u201d is missing.',
      'import.error.badType': 'The field \u201c{field}\u201d must be {expected}.',
      'import.error.unknownVariant': 'The variant \u201c{variantId}\u201d is not known to this generator.',
      'import.error.buildFailed': 'The puzzle could not be rebuilt for {variantId}: its options or its ' +
        'structure are not valid.',
      'import.error.badStructure': 'The rebuilt puzzle breaks the rules of {variantId}.',
      'import.error.badDigits': 'The file says {digits} digits, but {variantId} uses {expected}.',
      'import.error.badCellCount': 'The file says {cellCount} cells, but its grid has {expected}.',
      'import.error.badLength': 'The list \u201c{field}\u201d has {length} entries, but this puzzle has ' +
        '{expected} cells.',
      'import.error.badDigit': 'Entry {cell} of \u201c{field}\u201d is {value}; allowed are whole numbers ' +
        'from {min} to {max}.',
      'import.error.givenMismatch': 'The clue in {cell} ({given}) differs from the solution ({solution}).',
      'import.error.solutionUnit': 'The stored solution repeats a value in {unit}.',
      'import.error.solutionCage': 'The stored solution does not add up to the sum of cage {cage}.',
      'import.error.solutionSign': 'The stored solution breaks inequality sign {index}.',
      'import.error.solutionWord': 'The stored solution does not spell the key word on its word line.',
      'import.error.badLayout': 'The stored layout ({field}) does not match the layout of {variantId}.',
      'import.error.badSymbols': 'The stored symbols do not match the symbol set of {variantId}.',
      'import.error.badRegions': 'The Jigsaw regions are not valid: they must be nine connected regions of ' +
        'nine cells, and none may be a whole row or column.',
      'import.error.cageBadCells': 'Cage {cage} has cells that are missing, repeated or outside the grid.',
      'import.error.cageOverlap': 'Cell {cell} belongs to more than one cage (cage {cage}).',
      'import.error.cageNotCovered': '{count} cells belong to no cage; every cell of a Killer puzzle needs ' +
        'one.',
      'import.error.cageBadSum': 'Cage {cage} has the sum {sum}, which is impossible for its size (it must ' +
        'be between {min} and {max}).',
      'import.error.cageDistinct': 'Cage {cage} must hold different digits.',
      'import.error.ineqBadIndex': 'Inequality sign {index} points at a cell that does not exist.',
      'import.error.ineqSelf': 'Inequality sign {index} compares a cell with itself.',
      'import.error.ineqDuplicate': 'Inequality sign {index} is listed twice.',
      'import.error.ineqNotAdjacent': 'Inequality sign {index} must sit between two neighbouring cells.',
      'import.error.ineqCycle': 'The inequality signs contradict each other: a chain of them leads back to ' +
        'its start.',
      'import.error.badWord': 'The key word \u201c{word}\u201d is not valid: it needs nine different ' +
        'letters.',
      'import.error.unsupportedText': 'A line of {length} characters does not match a known puzzle size. ' +
        'Use 16, 36, 81, 144 or 256 characters, or import JSON.',
      'import.error.textChars': 'The character \u201c{char}\u201d at position {position} is not allowed. ' +
        'Use digits, letters from A for 10 and above, and . 0 - or _ for an empty cell.',
      'import.error.textLength': 'The line has {length} characters, but {variantId} needs {expected}.',
      'import.error.analyseTooLong': 'The analysis took longer than allowed and was stopped.',
      'import.error.analyseFailed': 'The analysis could not be completed.',
      'import.error.readFailed': 'The file could not be read.',
      'import.error.cannotShow': 'The page could not show the puzzle.',
      'import.warn.noSolution': 'This puzzle has no solution: its clues contradict each other. It is shown ' +
        'as it is.',
      'import.warn.severalSolutions': 'This puzzle has more than one solution, so it is not a proper ' +
        'Sudoku. The solution shown is only one of them.',
      'import.warn.unverified': 'Checking the number of solutions took too long, so it is not known ' +
        'whether the puzzle has exactly one.',
      'import.warn.ignoredStructure': 'The file lists {field}, which {variantId} does not use. They were ' +
        'ignored.'
    },
    vi: {
      'import.title': 'Nhập một đề',
      'import.intro': 'Mở một đề đã xuất ra JSON, hoặc dán một đề viết thành một dòng chữ số (81 ký tự cho ' +
        'Sudoku cổ điển 9\u00d79, 36 cho 6\u00d76, 16 cho 4\u00d74).',
      'import.file.choose': 'Chọn tệp…',
      'import.file.drop': 'hoặc kéo thả tệp .json hay .txt vào đây',
      'import.paste.label': 'Hoặc dán JSON hay dòng chữ số vào đây',
      'import.paste.placeholder':
        '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
      'import.variant.label': 'Luật của dòng chữ số này',
      'import.variant.hint': 'Dòng 81 chữ số không cho biết luật nào được áp dụng, nên hãy chọn ở đây.',
      'import.button': 'Nhập đề',
      'import.analyse': 'Phân tích độ khó',
      'import.analyse.busy': 'Đang phân tích đề…',
      'import.analyse.unsolved': 'Các kỹ thuật giải của bộ tạo không giải hết được đề này, nên nó được ' +
        'xếp vào mức khó nhất.',
      'import.analyse.differs': 'Mức độ đã lưu là {stored}; kết quả phân tích là {found}.',
      'import.analysis.title': 'Phân tích độ khó',
      'import.busy.importing': 'Đang nhập đề…',
      'import.status.shown': 'Đề đã nhập: {variant}, {clues}.',
      'import.success': 'Đã nhập {variant}: {clues}.',
      'import.success.unique': 'Đề có đúng một lời giải.',
      'import.toast.imported': 'Đã nhập {variant}.',
      'import.toast.failed': 'Không nhập được: {message}',
      'import.type.array': 'một danh sách',
      'import.type.object': 'một đối tượng',
      'import.error.empty': 'Chưa có gì để nhập: hãy chọn một tệp hoặc dán một đề.',
      'import.error.tooLarge': 'Nội dung quá lớn nên không thể là tệp đề.',
      'import.error.badJson': 'Đây không phải JSON hợp lệ và cũng không phải một dòng chữ số. Hãy kiểm ' +
        'tra tệp có đầy đủ không.',
      'import.error.notObject': 'JSON phải là một đối tượng mô tả đề.',
      'import.error.noFormat': 'JSON này không có trường \u201cformat\u201d nên không phải do bộ tạo này ' +
        'xuất ra.',
      'import.error.wrongFormat': 'Định dạng \u201c{format}\u201d không phải là đề của bộ tạo này.',
      'import.error.wrongVersion': 'Tệp có phiên bản \u201c{found}\u201d, nhưng bộ tạo này chỉ đọc ' +
        '\u201c{supported}\u201d. Hãy xuất lại tệp bằng phiên bản phù hợp.',
      'import.error.missingField': 'Thiếu trường \u201c{field}\u201d.',
      'import.error.badType': 'Trường \u201c{field}\u201d phải là {expected}.',
      'import.error.unknownVariant': 'Bộ tạo này không biết biến thể \u201c{variantId}\u201d.',
      'import.error.buildFailed': 'Không dựng lại được đề cho {variantId}: các tùy chọn hoặc cấu trúc ' +
        'của nó không hợp lệ.',
      'import.error.badStructure': 'Đề dựng lại vi phạm luật của {variantId}.',
      'import.error.badDigits': 'Tệp ghi {digits} chữ số, nhưng {variantId} dùng {expected}.',
      'import.error.badCellCount': 'Tệp ghi {cellCount} ô, nhưng lưới của nó có {expected} ô.',
      'import.error.badLength': 'Danh sách \u201c{field}\u201d có {length} phần tử, nhưng đề này có ' +
        '{expected} ô.',
      'import.error.badDigit': 'Phần tử {cell} của \u201c{field}\u201d là {value}; chỉ chấp nhận số ' +
        'nguyên từ {min} đến {max}.',
      'import.error.givenMismatch': 'Số cho sẵn ở {cell} ({given}) khác với lời giải ({solution}).',
      'import.error.solutionUnit': 'Lời giải đã lưu bị lặp giá trị trong {unit}.',
      'import.error.solutionCage': 'Lời giải đã lưu không khớp với tổng của nhóm ô {cage}.',
      'import.error.solutionSign': 'Lời giải đã lưu vi phạm dấu so sánh {index}.',
      'import.error.solutionWord': 'Lời giải đã lưu không viết ra từ khóa trên hàng chữ của nó.',
      'import.error.badLayout': 'Bố cục đã lưu ({field}) không khớp với bố cục của {variantId}.',
      'import.error.badSymbols': 'Các ký hiệu đã lưu không khớp với bộ ký hiệu của {variantId}.',
      'import.error.badRegions': 'Các vùng Ghép hình không hợp lệ: phải có chín vùng liền nhau, mỗi vùng ' +
        'chín ô, và không vùng nào là cả một hàng hay một cột.',
      'import.error.cageBadCells': 'Nhóm ô {cage} có ô bị thiếu, bị lặp hoặc nằm ngoài lưới.',
      'import.error.cageOverlap': 'Ô {cell} thuộc nhiều hơn một nhóm ô (nhóm {cage}).',
      'import.error.cageNotCovered': 'Có {count} ô không thuộc nhóm nào; mọi ô của đề Sát thủ đều cần ' +
        'một nhóm.',
      'import.error.cageBadSum': 'Nhóm ô {cage} có tổng {sum}, không thể xảy ra với kích thước của nó ' +
        '(phải nằm giữa {min} và {max}).',
      'import.error.cageDistinct': 'Nhóm ô {cage} phải gồm các chữ số khác nhau.',
      'import.error.ineqBadIndex': 'Dấu so sánh {index} trỏ tới một ô không tồn tại.',
      'import.error.ineqSelf': 'Dấu so sánh {index} so sánh một ô với chính nó.',
      'import.error.ineqDuplicate': 'Dấu so sánh {index} bị liệt kê hai lần.',
      'import.error.ineqNotAdjacent': 'Dấu so sánh {index} phải nằm giữa hai ô cạnh nhau.',
      'import.error.ineqCycle': 'Các dấu so sánh mâu thuẫn nhau: một chuỗi trong số đó quay về điểm xuất ' +
        'phát.',
      'import.error.badWord': 'Từ khóa \u201c{word}\u201d không hợp lệ: cần chín chữ cái khác nhau.',
      'import.error.unsupportedText': 'Dòng {length} ký tự không khớp với kích thước đề nào đã biết. Hãy ' +
        'dùng 16, 36, 81, 144 hoặc 256 ký tự, hoặc nhập JSON.',
      'import.error.textChars': 'Ký tự \u201c{char}\u201d ở vị trí {position} không được phép. Hãy dùng ' +
        'chữ số, chữ cái từ A cho giá trị 10 trở lên, và . 0 - hoặc _ cho ô trống.',
      'import.error.textLength': 'Dòng có {length} ký tự, nhưng {variantId} cần {expected}.',
      'import.error.analyseTooLong': 'Việc phân tích mất nhiều thời gian hơn mức cho phép nên đã bị dừng.',
      'import.error.analyseFailed': 'Không hoàn thành được việc phân tích.',
      'import.error.readFailed': 'Không đọc được tệp.',
      'import.error.cannotShow': 'Trang không hiển thị được đề này.',
      'import.warn.noSolution': 'Đề này không có lời giải: các số cho sẵn mâu thuẫn nhau. Đề vẫn được ' +
        'hiển thị nguyên trạng.',
      'import.warn.severalSolutions': 'Đề này có nhiều hơn một lời giải nên chưa phải là một đề Sudoku ' +
        'chuẩn. Lời giải đang hiện chỉ là một trong số đó.',
      'import.warn.unverified': 'Việc đếm số lời giải mất quá nhiều thời gian nên chưa biết đề có đúng ' +
        'một lời giải hay không.',
      'import.warn.ignoredStructure': 'Tệp có liệt kê {field}, nhưng {variantId} không dùng đến. Phần ' +
        'này đã bị bỏ qua.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
