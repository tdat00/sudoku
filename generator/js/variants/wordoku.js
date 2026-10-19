/**
 * Wordoku: `wordoku`, a 9x9 Sudoku whose nine symbols are the nine distinct letters of a key word, and where
 * one line of the finished grid (the main diagonal by default, or a row or a column) spells that word
 * (design.md section 8.5).
 *
 * The core never sees a letter. It works with the integers 1..9, and the letters are only the symbol set of
 * the model: `model.symbols.labels[v - 1]` is the letter of value v. The word enters the pipeline in exactly
 * one place, `model.fixedCells`: the nine cells of the chosen line are forced to the values of the word's
 * letters, and `SG.fullGrid.generate` honours them when it draws the solution. From there on the puzzle is
 * dug like `classic9`. Solvers work from `givens` alone and never see `fixedCells`, so the word is not a
 * clue: the line is dug like any other cells, the puzzle is unique without knowing the word, and the word
 * shows up by solving.
 *
 * Value <-> letter mapping: the letters of the word in alphabetical order (value 1 = the smallest letter).
 * The order is a function of the word alone, the keypad of a renderer comes out sorted, and the digits view
 * of a puzzle does not read 1, 2, ..., 9 down the word line.
 *
 * Word lists (assets/wordlists): `SG.wordlists.en` and `SG.wordlists.vi`, plain arrays of 9-letter isograms
 * in upper-case A-Z, read lazily at build time. The Vietnamese list may be empty or short (see
 * `SG.wordoku.MIN_WORDS`); then the English list is used and step 4 of the pipeline says so with the event
 * 'extraStructure.wordFallback'. A word of the user's own can be given through the `word` option.
 *
 * Renderer note (CV9):
 *  - symbols: with symbol mode 'word' (the default) draw `model.symbols.labels[value - 1]`; with 'digits'
 *    draw the value itself.
 *  - highlight: `model.layout.overlays` holds one entry `{ kind: 'wordLine', cells }`, the nine cells of the
 *    line in reading order. `SG.wordoku.describe(model)` returns the same cells with the placement.
 *  - reveal: `SG.wordoku.readWord(model, values)` spells the line of a board (the solution, or what the
 *    player has filled in, '_' for an empty cell); `SG.wordoku.isWordSolved` says whether it is the key
 *    word. `describe(model).word` is the key word itself and must stay hidden until the puzzle is solved.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const ID = 'wordoku';
  const SIZE = 9;
  const BOX = 3;
  const PLACEMENTS = Object.freeze(['diagonal', 'row', 'column']);
  const LANGUAGES = Object.freeze(['en', 'vi']);
  const DEFAULT_LANGUAGE = 'en';

  /** A list with fewer valid words than this is "too short" and the English list takes its place. */
  const MIN_WORDS = 5;

  /** `kind` of the layout overlay that marks the word line. */
  const OVERLAY_KIND = 'wordLine';

  /** Rng used when `build` gets none, so that a bare `build({})` is reproducible. */
  const FALLBACK_SEED = 0x70d0;

  const EVENT_FALLBACK = 'extraStructure.wordFallback';
  const EVENT_BY_PLACEMENT = Object.freeze({
    diagonal: 'extraStructure.wordDiagonal',
    row: 'extraStructure.wordRow',
    column: 'extraStructure.wordColumn'
  });

  /** What `build` decided per model: `postGenerate` only gets the model, so it reads this to explain it. */
  const buildInfo = new WeakMap();

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  function invalidOption(option, value) {
    return fail('pipeline.invalidOption', { option: option, value: String(value) });
  }

  // ---------------------------------------------------------------------------------------------
  // Words and word lists
  // ---------------------------------------------------------------------------------------------

  /**
   * Turns what a person types into the form of the word lists: diacritics dropped ('đ' becomes D), upper
   * case, everything that is not a letter A-Z removed. "Bạch Dương" gives BACHDUONG.
   * @param {string} text
   * @returns {string}
   */
  function normalizeWord(text) {
    return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd')
      .replace(/\u0110/g, 'D').toUpperCase().replace(/[^A-Z]/g, '');
  }

  /**
   * @param {*} word
   * @returns {boolean} True for a string of exactly 9 characters, upper-case letters A-Z, all distinct.
   */
  function isIsogram(word) {
    return typeof word === 'string' && /^[A-Z]{9}$/.test(word) && new Set(word).size === SIZE;
  }

  /**
   * The usable entries of a word list: those that are isograms, each once. Entries that are not are ignored
   * here (a list of unknown origin must not break a generation run); tests check that the shipped lists have
   * none.
   * @param {?ArrayLike<string>} list
   * @returns {string[]}
   */
  function validWords(list) {
    const out = [];
    if (list === undefined || list === null || typeof list.length !== 'number') return out;
    for (let i = 0; i < list.length; i++) {
      if (isIsogram(list[i]) && out.indexOf(list[i]) === -1) out.push(list[i]);
    }
    return out;
  }

  /**
   * @typedef {Object} WordList
   * @property {string[]} words    Usable words of the list that is used.
   * @property {string} language    Language of that list.
   * @property {string} requested   Language that was asked for.
   * @property {boolean} fellBack   True when `requested` was empty or too short and English is used instead.
   */

  /**
   * Picks the word list for a language: the list itself, or the English one when it is empty or has fewer
   * than `MIN_WORDS` usable words. The English list has nothing to fall back to and is used as long as it
   * has a single word.
   * @param {string} language  'en' or 'vi'.
   * @param {Object<string, string[]>} [lists]  Defaults to `SG.wordlists`; tests pass their own.
   * @returns {WordList}
   * @throws {SG.errors.GenerationError} 'wordoku.noWordList' when no usable word exists at all.
   */
  function resolveWordList(language, lists) {
    const source = lists || SG.wordlists || {};
    const wanted = validWords(source[language]);
    if (wanted.length >= MIN_WORDS || (language === DEFAULT_LANGUAGE && wanted.length > 0)) {
      return { words: wanted, language: language, requested: language, fellBack: false };
    }
    if (language !== DEFAULT_LANGUAGE) {
      const fallback = validWords(source[DEFAULT_LANGUAGE]);
      if (fallback.length > 0) {
        return { words: fallback, language: DEFAULT_LANGUAGE, requested: language, fellBack: true };
      }
      if (wanted.length > 0) {
        return { words: wanted, language: language, requested: language, fellBack: false };
      }
    }
    throw fail('wordoku.noWordList', { language: String(language) });
  }

  // ---------------------------------------------------------------------------------------------
  // Options
  // ---------------------------------------------------------------------------------------------

  /**
   * @typedef {Object} WordokuOptions
   * @property {string} placement  'diagonal' | 'row' | 'column'.
   * @property {number} line       0 = a random row or column, else the 1-based number of it.
   * @property {string} language   'en' | 'vi'.
   * @property {?string} word      A normalised word of the user's own, or null for a word from the list.
   */

  /**
   * Reads and checks the variant options; missing values mean the defaults.
   * @param {?Object} opts  { placement, line, language, word }.
   * @returns {WordokuOptions}
   * @throws {SG.errors.GenerationError} 'pipeline.invalidOption' naming the offending option.
   */
  function normalizeOptions(opts) {
    const o = opts !== null && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};
    const none = function none(v) { return v === undefined || v === null; };

    const placement = none(o.placement) ? PLACEMENTS[0] : o.placement;
    if (PLACEMENTS.indexOf(placement) === -1) throw invalidOption('placement', placement);

    let line = 0;
    if (!none(o.line)) {
      if (!(Number.isInteger(o.line) && o.line >= 0 && o.line <= SIZE)) throw invalidOption('line', o.line);
      line = o.line;
    }

    const language = none(o.language) ? DEFAULT_LANGUAGE : o.language;
    if (LANGUAGES.indexOf(language) === -1) throw invalidOption('language', language);

    let word = null;
    if (!none(o.word)) {
      if (typeof o.word !== 'string') throw invalidOption('word', o.word);
      if (o.word.trim() !== '') {
        word = normalizeWord(o.word);
        if (!isIsogram(word)) throw invalidOption('word', o.word);
      }
    }
    return { placement: placement, line: line, language: language, word: word };
  }

  // ---------------------------------------------------------------------------------------------
  // The board
  // ---------------------------------------------------------------------------------------------

  /**
   * The cells of a line, in reading order.
   * @param {string} placement  'diagonal' | 'row' | 'column'.
   * @param {number} line       0-based row or column; ignored for the diagonal.
   * @returns {number[]}
   */
  function lineCells(placement, line) {
    const cells = [];
    for (let i = 0; i < SIZE; i++) {
      if (placement === 'row') cells.push(line * SIZE + i);
      else if (placement === 'column') cells.push(i * SIZE + line);
      else cells.push(i * SIZE + i);
    }
    return cells;
  }

  /**
   * Builds the model: the classic 9x9 geometry (27 units: rows, columns, boxes) under the id 'wordoku', with
   * the nine letters of `word` as the symbol set and the word forced onto the line through `fixedCells`.
   * @param {string} word       An isogram, see `isIsogram`.
   * @param {string} placement  'diagonal' | 'row' | 'column'.
   * @param {number} line       0-based row or column; ignored for the diagonal.
   * @returns {PuzzleModel}
   */
  function buildBoard(word, placement, line) {
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

    const labels = word.split('').sort();
    const cells = lineCells(placement, line);
    const fixedCells = new Int32Array(n);
    for (let i = 0; i < SIZE; i++) fixedCells[cells[i]] = labels.indexOf(word[i]) + 1;

    return SG.model.create({
      variantId: ID,
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
        overlays: [{ kind: OVERLAY_KIND, cells: cells }],
        subGrids: [{ gridIndex: 0, originRow: 0, originCol: 0 }]
      },
      symbols: { mode: 'word', labels: labels },
      fixedCells: fixedCells
    });
  }

  /**
   * Builds a wordoku model: picks the key word, the line and the symbol mapping.
   * @param {?Object} opts  The variant options, see `normalizeOptions`.
   * @param {?Rng} rng  Source of all randomness (word and line); without one a fixed seed is used.
   * @returns {PuzzleModel}
   * @throws {SG.errors.GenerationError} 'pipeline.invalidOption', or 'wordoku.noWordList' when there is no
   *         word to draw.
   */
  function buildWordoku(opts, rng) {
    const options = normalizeOptions(opts);
    const source = rng || SG.rng.create(FALLBACK_SEED);

    let word = options.word;
    let list = null;
    if (word === null) {
      list = resolveWordList(options.language);
      word = source.fork('word').pick(list.words);
    }
    const line = options.line > 0 ? options.line - 1 : source.fork('line').int(SIZE);

    const model = buildBoard(word, options.placement, line);
    buildInfo.set(model, { fellBack: list !== null && list.fellBack });
    return model;
  }

  // ---------------------------------------------------------------------------------------------
  // Helpers for the renderer and the tests
  // ---------------------------------------------------------------------------------------------

  /**
   * @typedef {Object} WordLine
   * @property {string} placement  'diagonal' | 'row' | 'column'.
   * @property {?number} line      1-based number of the row or column; null for the diagonal.
   * @property {number[]} cells    The nine cells of the line in reading order (top to bottom for a column).
   * @property {string[]} letters  The letter of each of those cells.
   * @property {string} word       The key word: `letters` joined. Keep it hidden until the puzzle is solved.
   */

  /**
   * Describes the word line of a wordoku model. Everything is derived from the model itself (`fixedCells`
   * and the symbol labels), so it works on a model that has crossed a worker boundary.
   * @param {PuzzleModel} model
   * @returns {?WordLine}  null when the model has no complete word line.
   */
  function describe(model) {
    if (model === null || typeof model !== 'object' || !model.fixedCells || !model.symbols) return null;
    const cells = [];
    for (let c = 0; c < model.fixedCells.length; c++) if (model.fixedCells[c] !== 0) cells.push(c);
    if (cells.length !== SIZE) return null;

    const row = model.layout.cellRow;
    const col = model.layout.cellCol;
    const sameRow = cells.every(function (c) { return row[c] === row[cells[0]]; });
    const sameCol = cells.every(function (c) { return col[c] === col[cells[0]]; });
    let placement = 'diagonal';
    let line = null;
    if (sameRow) {
      placement = 'row';
      line = row[cells[0]] + 1;
      cells.sort(function (a, b) { return col[a] - col[b]; });
    } else if (sameCol) {
      placement = 'column';
      line = col[cells[0]] + 1;
      cells.sort(function (a, b) { return row[a] - row[b]; });
    } else {
      cells.sort(function (a, b) { return row[a] - row[b]; });
    }
    const letters = cells.map(function (c) { return model.symbols.labels[model.fixedCells[c] - 1]; });
    return { placement: placement, line: line, cells: cells, letters: letters, word: letters.join('') };
  }

  /**
   * Spells the word line of a board.
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} values  One value per cell, 0 = empty (a solution, or the player's board).
   * @param {string} [blank='_']  What stands for an empty cell.
   * @returns {?string}  Nine characters, or null when the model has no word line.
   */
  function readWord(model, values, blank) {
    const info = describe(model);
    if (info === null) return null;
    const fill = blank === undefined ? '_' : blank;
    return info.cells.map(function (c) {
      const v = values[c];
      return v >= 1 && v <= SIZE ? model.symbols.labels[v - 1] : fill;
    }).join('');
  }

  /**
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} values  One value per cell, 0 = empty.
   * @returns {boolean} True when the word line of the board spells the key word.
   */
  function isWordSolved(model, values) {
    const info = describe(model);
    return info !== null && readWord(model, values) === info.word;
  }

  // ---------------------------------------------------------------------------------------------
  // Pipeline hook
  // ---------------------------------------------------------------------------------------------

  /**
   * Pipeline hook (step 4, 'extraStructure'): reports where the key word lies and, when it applies, that the
   * Vietnamese list was too short. It names the line but never the word. The model is not changed.
   * @param {Object} ctx  `{ model, solution, rng, level, spec, attempt, budget, emit, variantId }`.
   */
  function postGenerate(ctx) {
    const info = describe(ctx.model);
    if (info === null) return;
    const em = SG.events.toEmitter(ctx.emit);
    const made = buildInfo.get(ctx.model);
    if (made !== undefined && made.fellBack) em.step('extraStructure', 'progress', EVENT_FALLBACK);
    const args = info.placement === 'diagonal' ? { length: SIZE } : { length: SIZE, line: info.line };
    em.step('extraStructure', 'progress', EVENT_BY_PLACEMENT[info.placement], args);
  }

  // ---------------------------------------------------------------------------------------------
  // Registration: event vocabulary, translations, variant
  // ---------------------------------------------------------------------------------------------

  /** Schema of the variant options, for the generated control panel. */
  const OPTIONS = Object.freeze([
    Object.freeze({
      id: 'placement',
      type: 'select',
      default: PLACEMENTS[0],
      choices: Object.freeze(PLACEMENTS.map(function (p) {
        return Object.freeze({ value: p, i18nKey: 'variant.wordoku.placement.' + p });
      })),
      i18nKey: 'variant.wordoku.placement',
      hintKey: 'variant.wordoku.placement.hint'
    }),
    Object.freeze({
      id: 'line',
      type: 'slider',
      min: 0,
      max: SIZE,
      step: 1,
      default: 0,
      advanced: true,
      visibleWhen: Object.freeze({ placement: Object.freeze(['row', 'column']) }),
      i18nKey: 'variant.wordoku.line',
      hintKey: 'variant.wordoku.line.hint',
      defaultLabelKey: 'variant.wordoku.line.random'
    }),
    Object.freeze({
      id: 'language',
      type: 'select',
      default: DEFAULT_LANGUAGE,
      choices: Object.freeze(LANGUAGES.map(function (l) {
        return Object.freeze({ value: l, i18nKey: 'variant.wordoku.language.' + l });
      })),
      i18nKey: 'variant.wordoku.language',
      hintKey: 'variant.wordoku.language.hint'
    }),
    Object.freeze({
      id: 'word',
      type: 'text',
      default: '',
      maxLength: 24,
      advanced: true,
      i18nKey: 'variant.wordoku.word',
      hintKey: 'variant.wordoku.word.hint',
      placeholderKey: 'variant.wordoku.word.placeholder'
    })
  ]);

  // A second load keeps the first object, so that it stays the one that the first load's hooks belong to.
  SG.wordoku = SG.wordoku || {
    ID: ID,
    PLACEMENTS: PLACEMENTS,
    LANGUAGES: LANGUAGES,
    MIN_WORDS: MIN_WORDS,
    OVERLAY_KIND: OVERLAY_KIND,
    OPTIONS: OPTIONS,
    normalizeWord: normalizeWord,
    isIsogram: isIsogram,
    validWords: validWords,
    resolveWordList: resolveWordList,
    normalizeOptions: normalizeOptions,
    lineCells: lineCells,
    buildBoard: buildBoard,
    describe: describe,
    readWord: readWord,
    isWordSolved: isWordSolved
  };

  // Skipping a known id keeps a second load of this file harmless (no second set of locale strings either).
  if (!SG.variants.has(ID)) {
    // The variant adds events of its own to step 4. The core keeps the list of valid events in
    // SG.events.VOCABULARY, plain data read by the UI and the tests, so they are listed there.
    [
      [EVENT_BY_PLACEMENT.diagonal, ['length']],
      [EVENT_BY_PLACEMENT.row, ['length', 'line']],
      [EVENT_BY_PLACEMENT.column, ['length', 'line']],
      [EVENT_FALLBACK, []]
    ].forEach(function (row) {
      const vocabulary = SG.events && SG.events.VOCABULARY;
      if (Array.isArray(vocabulary) && !vocabulary.some(function (v) { return v.key === row[0]; })) {
        vocabulary.push({
          type: 'step', stepId: 'extraStructure', phase: 'progress', key: row[0], level: 'summary',
          args: row[1], patch: []
        });
      }
    });

    // Locale strings, merged into the language packs by the UI layer.
    SG.localeFragments = SG.localeFragments || [];
    SG.localeFragments.push({
      en: {
        'variant.wordoku': 'Wordoku',
        'variant.wordoku.placement': 'Where the word goes',
        'variant.wordoku.placement.hint':
          'The key word is hidden along this line of the solution. Its cells are dug like any other, ' +
          'so the word only shows up once the puzzle is solved.',
        'variant.wordoku.placement.diagonal': 'Main diagonal',
        'variant.wordoku.placement.row': 'A row',
        'variant.wordoku.placement.column': 'A column',
        'variant.wordoku.line': 'Row or column number',
        'variant.wordoku.line.hint':
          'Which row or column carries the word, counted from 1. Only used when the word goes on ' +
          '**A row** or **A column**.',
        'variant.wordoku.line.random': 'Random',
        'variant.wordoku.language': 'Word list',
        'variant.wordoku.language.hint':
          'The language of the key words to draw from.\n\n**English**: English words.\n\n**Vietnamese**: ' +
          'Vietnamese words, written without diacritics. If this list is too short, English words are ' +
          'used instead.',
        'variant.wordoku.language.en': 'English',
        'variant.wordoku.language.vi': 'Vietnamese',
        'variant.wordoku.word': 'Your own word',
        'variant.wordoku.word.hint':
          'Leave empty for a random word. A word of your own needs exactly nine different letters; ' +
          'diacritics and spaces are ignored.',
        'variant.wordoku.word.placeholder': 'Random word',
        'extraStructure.wordDiagonal':
          'Key word of {length} letters, written along the main diagonal of the solution. Its cells are ' +
          'dug like any other, so the word only appears once the puzzle is solved.',
        'extraStructure.wordRow':
          'Key word of {length} letters, written along row {line} of the solution. Its cells are dug like ' +
          'any other, so the word only appears once the puzzle is solved.',
        'extraStructure.wordColumn':
          'Key word of {length} letters, written down column {line} of the solution. Its cells are dug ' +
          'like any other, so the word only appears once the puzzle is solved.',
        'extraStructure.wordFallback':
          'The Vietnamese word list is too short, so the key word comes from the English list instead.',
        'error.wordoku.noWordList':
          'No key word is available: the word list for "{language}" is empty and so is the English one.'
      },
      vi: {
        'variant.wordoku': 'Sudoku Chữ',
        'variant.wordoku.placement': 'Vị trí đặt từ',
        'variant.wordoku.placement.hint':
          'Từ khóa được giấu dọc theo đường này của lời giải. Các ô của nó được đào như mọi ô khác, ' +
          'nên từ chỉ hiện ra khi bạn giải xong.',
        'variant.wordoku.placement.diagonal': 'Đường chéo chính',
        'variant.wordoku.placement.row': 'Một hàng',
        'variant.wordoku.placement.column': 'Một cột',
        'variant.wordoku.line': 'Số thứ tự hàng hoặc cột',
        'variant.wordoku.line.hint':
          'Hàng hoặc cột nào mang từ khóa, đếm từ 1. Chỉ dùng khi từ được đặt trên **Một hàng** hoặc ' +
          '**Một cột**.',
        'variant.wordoku.line.random': 'Ngẫu nhiên',
        'variant.wordoku.language': 'Kho từ',
        'variant.wordoku.language.hint':
          'Ngôn ngữ của các từ khóa được rút ra.\n\n**Tiếng Anh**: các từ tiếng Anh.\n\n**Tiếng Việt**: ' +
          'các từ tiếng Việt, viết không dấu. Nếu kho từ này còn quá ít từ, trò chơi sẽ dùng từ tiếng Anh.',
        'variant.wordoku.language.en': 'Tiếng Anh',
        'variant.wordoku.language.vi': 'Tiếng Việt',
        'variant.wordoku.word': 'Từ của riêng bạn',
        'variant.wordoku.word.hint':
          'Để trống để lấy từ ngẫu nhiên. Từ của bạn phải có đúng chín chữ cái khác nhau; dấu và khoảng ' +
          'trắng sẽ được bỏ qua.',
        'variant.wordoku.word.placeholder': 'Từ ngẫu nhiên',
        'extraStructure.wordDiagonal':
          'Từ khóa gồm {length} chữ cái, nằm trên đường chéo chính của lời giải. Các ô của nó được đào ' +
          'như mọi ô khác, nên từ chỉ hiện ra khi bạn giải xong.',
        'extraStructure.wordRow':
          'Từ khóa gồm {length} chữ cái, nằm trên hàng {line} của lời giải. Các ô của nó được đào như ' +
          'mọi ô khác, nên từ chỉ hiện ra khi bạn giải xong.',
        'extraStructure.wordColumn':
          'Từ khóa gồm {length} chữ cái, nằm trên cột {line} của lời giải. Các ô của nó được đào như ' +
          'mọi ô khác, nên từ chỉ hiện ra khi bạn giải xong.',
        'extraStructure.wordFallback':
          'Kho từ tiếng Việt còn quá ít từ, nên từ khóa được lấy từ kho từ tiếng Anh.',
        'error.wordoku.noWordList':
          'Không có từ khóa nào để chọn: kho từ "{language}" đang trống, kho từ tiếng Anh cũng vậy.'
      }
    });

    SG.variants.register({
      id: ID,
      i18nKey: 'variant.wordoku',
      group: 'wordoku',
      digits: SIZE,
      // Measured (`node tests/qualify.js`, docs/report-v2/qualification.md): up to hell1, like classic9.
      difficultySupport: ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1'],
      defaultSymbolMode: 'word',
      symbolModes: ['word', 'digits'],
      options: OPTIONS,
      build: buildWordoku,
      postGenerate: postGenerate
    });
  }
})(typeof self !== 'undefined' ? self : globalThis);
