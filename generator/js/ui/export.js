/**
 * Export, print and batch print (task T-7.1; design.md sections 10.6 and 14.1) and the hand-off of a puzzle
 * to the sudoku-player web app (task T-7.8; design.md section 10.9): `SG.exportUi`. The Export button of the
 * page opens one dialog with four sections: the six export formats of the puzzle on screen (Print / PDF,
 * PNG, SVG, JSON, Text, Link), "Play online" (a link that opens the puzzle in the player), batch printing
 * (N puzzles with the settings of the puzzle on screen, 1 / 2 / 4 / 6 per page, optional pages with the
 * solutions), and the import of a puzzle, which is hosted here (`SG.importUi.mount`, js/ui/import.js).
 *
 * Two layers, so that what matters runs in Node:
 *  - PURE (no DOM): `toJson`, `formatJson`, `toText`, `textSupport`, `fileName`, `buildPrintLayout`,
 *    `batchSeeds`, `boardSvg`, `printTokens`, `makeFile` (all but the PNG), `createBatch`, `buildPlayLink`.
 *  - DOM: the dialog, the downloads (`Blob` + `URL.createObjectURL` + `<a download>`), the print path and
 *    the page's `<meta name="sg-player-url">` (`pagePlayerBase`).
 *
 * ---------------------------------------------------------------------------------------------------------
 * PUBLIC API (`SG.exportUi`)
 * ---------------------------------------------------------------------------------------------------------
 *   init(app)            Idempotent. Listens to the 'action' event `{ id: 'export' }` of `SG.app` (the Export
 *                        button) and opens the dialog.
 *   open()               Opens the dialog (or focuses the open one). Returns the modal handle, null without a
 *                        DOM or an app.
 *   close()              Closes it (a running batch is cancelled).
 *   toJson(result, ctx?) The JSON document of design.md 14.1 as plain data: `format`, `generatedAt`,
 *                        `variantId`, `variantOptions`, `difficulty`, `seed`, `symmetry`, `symbolMode`,
 *                        `digits`, `cellCount`, `layout`, `givens`, `solution`, `cages`, `inequalities`,
 *                        `stats`, plus the additive fields `locale`, `labels` (the names of the variant, the
 *                        level and the hardest technique in the language of the export, rule L6),
 *                        `symbols`, `wordoku` (Wordoku only), `digOrder`, `maxAttempts`, `warnings` and
 *                        `model` (the plain-data ModelSpec of `SG.model.create`, so that the player rebuilds
 *                        the board without any variant code; `SG.importUi` ignores it).
 *                        `ctx`: `{ generatedAt?: string, locale?: string }`.
 *   formatJson(data)     The text of a JSON document: indented, the grid arrays one row per line.
 *   toText(result, opts?) The puzzle as one line, row by row: '.' = empty, values 1..9 then A, B, C... for
 *                        10 and above. `opts.solution` writes the solution. null when the variant has
 *                        structure that the line cannot carry. `textSupport(result)` says why / what is lost.
 *   fileName(result, ext, opts?)  'sudoku-<variant>-<level>-<seed>.<ext>' in the current language
 *                        (accents removed); `opts.suffix` adds '-<suffix>'.
 *   buildPlayLink(result, opts?) -> Promise<{ url, token, base, length, long }>. The link that opens the
 *                        puzzle in the player: `SG.exchange.playerUrl(base, SG.exchange.encode(toJson(...)))`.
 *                        `opts`: `{ base?, generatedAt?, locale?, compress? }`; `base` defaults to
 *                        `playerBase()`. Rejects with the `exchange.*` errors (`exchange.invalidUrl` for a
 *                        bad `base`). `long` is true above `LONG_LINK_CHARS` characters.
 *   playerBase(content?) The player's address: `content` (the `content` of the page's
 *                        `<meta name="sg-player-url">`) when it is not blank, else `PLAYER_URL_DEFAULT`.
 *                        `pagePlayerBase()` reads that tag from the page.
 *   openPlayLink(url)    `window.open(url, '_blank', 'noopener')`: the player opens in a new tab.
 *   playOnline()         -> Promise. The dialog-less form (the result panel's button): builds the link of the
 *                        puzzle on screen, opens it and tells a failure or a very long link in a toast.
 *   buildPrintLayout(count, perPage, includeSolutions)  The page plan of a print job.
 *   batchSeeds(baseSeed, n)  n distinct seeds derived from a seed; the first one is the seed itself.
 *   boardSvg(result, opts?)  A standalone SVG document of the puzzle (givens) or its solution, drawn from the
 *                        result itself, whatever the replay of the board shows right now.
 *   makeFile(result, format, opts?) -> Promise<{ name, blob }> for 'json' | 'text' | 'svg' | 'png'.
 *   download(blob, name) Saves a blob through an `<a download>` link.
 *   printItems(items, opts?) -> Promise<layout>. Builds `#print-root`, waits for its pictures and calls
 *                        `window.print()` (`opts.print` replaces it). `items` = `[{ result, number }]`.
 *   buildPrintRoot / clearPrint  The print container itself (css/print.css hides everything else).
 *   createBatch(opts)    Generates a batch with an independent generation client; the puzzle on screen is
 *                        never replaced. Returns `{ promise, cancel }`.
 * Strings: the `export.*` fragment at the bottom of this file.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first definition on repeated loads.
  if (SG.exportUi && typeof SG.exportUi.toJson === 'function') return;

  const FORMAT = 'sudoku-generator/v1';
  const PER_PAGE_CHOICES = Object.freeze([1, 2, 4, 6]);
  /** Columns and rows of the puzzles on a page, per number of puzzles per page. */
  const PAGE_GRID = Object.freeze({ 1: [1, 1], 2: [1, 2], 4: [2, 2], 6: [2, 3] });
  const MAX_BATCH = 60;
  const PNG_SCALES = Object.freeze([1, 2, 3, 4]);
  const DEFAULT_PNG_SCALE = 2;
  const TEXT_DIGITS = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const EMPTY_CHAR = '.';
  const PRINT_ROOT_ID = 'print-root';
  const IMAGE_WAIT_MS = 4000;
  const BATCH_BUDGET_MS = 120000;
  const GRID_ARRAYS = Object.freeze(['givens', 'solution', 'cellRegion', 'cellRow', 'cellCol', 'fixedCells']);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CAPTION_ID = 'sgx-title';
  /** Where the sudoku-player web app lives, unless the page says otherwise (`<meta name="sg-player-url">`). */
  const PLAYER_URL_DEFAULT = 'https://tdat00.github.io/sudoku-player/';
  const PLAYER_META_NAME = 'sg-player-url';
  /** A player link longer than this many characters may be cut by chat apps and servers: offer the file. */
  const LONG_LINK_CHARS = 100000;

  /** The variants whose puzzle fits one line of text, and what that line leaves out. */
  const TEXT_NOTES = Object.freeze({
    classic4: [],
    classic6: [],
    classic9: [],
    mega12: ['export.text.note.symbols'],
    mega16: ['export.text.note.symbols'],
    diagonalX: ['export.text.note.rules'],
    hyper: ['export.text.note.rules'],
    wordoku: ['export.text.note.symbols']
  });

  /** The variants that cannot be written as text, with the translated reason. */
  const TEXT_REASONS = Object.freeze({
    jigsaw9: 'export.text.reason.regions',
    killer: 'export.text.reason.cages',
    greaterThan: 'export.text.reason.signs',
    samurai: 'export.text.reason.grids',
    sohei: 'export.text.reason.grids',
    butterfly: 'export.text.reason.grids',
    flower: 'export.text.reason.grids'
  });

  // ---------------------------------------------------------------------------------------------
  // Texts and small helpers
  // ---------------------------------------------------------------------------------------------

  function t(key, args) {
    return SG.i18n && typeof SG.i18n.t === 'function' ? SG.i18n.t(key, args) : key;
  }

  function hasText(key) {
    return !!(SG.i18n && typeof SG.i18n.has === 'function' && SG.i18n.has(key));
  }

  /** The translated name of an id (`variant.killer`, `difficulty.hard`), the id itself when unknown. */
  function nameOf(prefix, id) {
    return hasText(prefix + id) ? t(prefix + id) : String(id === null || id === undefined ? '' : id);
  }

  function formatNumber(n) {
    return SG.i18n && typeof SG.i18n.formatNumber === 'function' ? SG.i18n.formatNumber(n) : String(n);
  }

  function logError(err) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function countClues(givens) {
    let n = 0;
    if (givens) for (let i = 0; i < givens.length; i++) if (givens[i] > 0) n++;
    return n;
  }

  function hasSolution(solution) {
    if (!solution) return false;
    for (let i = 0; i < solution.length; i++) if (solution[i] > 0) return true;
    return false;
  }

  function seedText(seed) {
    return seed === null || seed === undefined || seed === '' ? '' : String(seed);
  }

  /** An imported puzzle was not made by the generator: it has no seed that reproduces it. */
  function isImported(result) {
    return !!result && result.source === 'import';
  }

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  /**
   * What the headers, file names and captions say about a result.
   * @param {Object} result  A `PuzzleResult`.
   * @returns {{variantId: string, variantName: string, level: string, levelName: string, seed: string,
   *   clues: number, cells: number}}
   */
  function summarize(result) {
    const config = result.config || {};
    const rating = result.rating || {};
    const model = result.model;
    const variantId = model ? model.variantId : String(config.variantId || '');
    const level = rating.level || config.difficulty || '';
    return {
      variantId: variantId,
      variantName: nameOf('variant.', variantId),
      level: level,
      levelName: level === '' ? '' : nameOf('difficulty.', level),
      seed: seedText(result.seed),
      clues: countClues(result.givens),
      cells: model ? model.cellCount : result.givens.length
    };
  }

  // ---------------------------------------------------------------------------------------------
  // File names
  // ---------------------------------------------------------------------------------------------

  /** Lower-case ASCII words joined by '-': accents are removed ('Rất dễ' -> 'rat-de'). */
  function slug(text) {
    return String(text)
      .replace(/\u00d7/g, 'x').replace(/\u0111/g, 'd').replace(/\u0110/g, 'D')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function variantSlug(variantId) {
    const words = slug(nameOf('variant.', variantId)).split('-').filter(function (word) {
      return word !== '' && word !== 'sudoku';
    });
    return words.length > 0 ? words.join('-') : slug(variantId);
  }

  /**
   * A file name for an export: 'sudoku-<variant>-<level>-<seed>.<ext>', with the variant and the level in
   * the current language, without accents or spaces.
   * @param {Object} result
   * @param {string} ext  'json' | 'png' | 'svg' | 'txt' (any lower-case letters or digits).
   * @param {{suffix?: string}} [options]  `suffix`: a word added before the extension ('solution').
   * @returns {string}
   */
  function fileName(result, ext, options) {
    const s = summarize(result);
    const parts = ['sudoku', variantSlug(s.variantId)];
    if (s.level !== '') parts.push(slug(s.levelName) || slug(s.level));
    if (s.seed !== '') parts.push(slug(s.seed));
    const suffix = options && options.suffix ? slug(options.suffix) : '';
    if (suffix !== '') parts.push(suffix);
    return parts.filter(function (part) { return part !== ''; }).join('-') + '.' +
      String(ext).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // ---------------------------------------------------------------------------------------------
  // JSON (design.md 14.1)
  // ---------------------------------------------------------------------------------------------

  function numbers(list) {
    return Array.from(list || []);
  }

  /** Whether cell i sits at row i / cols, column i % cols: a plain rectangle that needs no coordinates. */
  function isRowMajor(layout, n) {
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / layout.cols);
      if (layout.cellRow[i] !== row || layout.cellCol[i] !== i % layout.cols) return false;
    }
    return layout.rows * layout.cols === n;
  }

  function ratingFields(result) {
    const rating = result.rating || {};
    const config = result.config || {};
    const out = {
      requested: config.difficulty === undefined ? null : config.difficulty,
      achieved: rating.level === undefined ? null : rating.level,
      score: typeof rating.score === 'number' ? rating.score : 0,
      hardestTechnique: rating.hardestTechnique === undefined ? null : rating.hardestTechnique,
      techniqueCounts: Object.assign({}, rating.techniqueCounts)
    };
    ['rawScore', 'hardestGroup', 'confidence', 'solved', 'empties'].forEach(function (key) {
      if (rating[key] !== undefined) out[key] = rating[key];
    });
    return out;
  }

  /**
   * The JSON document of a puzzle (design.md section 14.1), as plain data. Everything needed to rebuild the
   * puzzle is in it, so a re-import loses nothing (`SG.importUi`).
   * @param {Object} result  A `PuzzleResult`.
   * @param {{generatedAt?: string, locale?: string}} [ctx]
   * @returns {Object}
   */
  function toJson(result, ctx) {
    const c = ctx || {};
    const model = result.model;
    const config = result.config || {};
    const layout = model.layout;
    const rating = result.rating || {};
    const s = summarize(result);
    const timings = result.timings && typeof result.timings === 'object' ? clone(result.timings) : {};
    let elapsed = 0;
    Object.keys(timings).forEach(function (key) {
      if (typeof timings[key] === 'number' && isFinite(timings[key])) elapsed += timings[key];
    });
    const data = {
      format: FORMAT,
      generatedAt: typeof c.generatedAt === 'string' ? c.generatedAt : new Date().toISOString(),
      variantId: model.variantId,
      variantOptions: clone(config.variantOptions || {}),
      difficulty: ratingFields(result),
      seed: result.seed === undefined ? null : result.seed,
      symmetry: config.symmetry === undefined ? null : config.symmetry,
      symbolMode: config.symbolMode === undefined ? null : config.symbolMode,
      digits: model.digits,
      cellCount: model.cellCount,
      layout: {
        rows: layout.rows,
        cols: layout.cols,
        cellRegion: numbers(layout.cellRegion),
        subGrids: Array.from(layout.subGrids, function (g) {
          return { gridIndex: g.gridIndex, originRow: g.originRow, originCol: g.originCol };
        })
      },
      givens: numbers(result.givens),
      solution: hasSolution(result.solution) ? numbers(result.solution) : null,
      cages: Array.from(model.cages, function (cage) {
        return { cells: numbers(cage.cells), sum: cage.sum, distinct: cage.distinct !== false };
      }),
      inequalities: Array.from(model.inequalities, function (q) { return { a: q.a, b: q.b }; }),
      stats: { clues: countClues(result.givens), elapsedMs: Math.round(elapsed * 1000) / 1000,
        attempts: typeof result.attempts === 'number' ? result.attempts : 1, timings: timings },
      symbols: { mode: model.symbols.mode, labels: Array.from(model.symbols.labels) },
      digOrder: config.digOrder === undefined ? null : config.digOrder,
      maxAttempts: config.maxAttempts === undefined ? null : config.maxAttempts,
      warnings: Array.isArray(result.warnings) ? result.warnings.slice() : [],
      locale: c.locale || (SG.i18n ? SG.i18n.current : 'en'),
      labels: {
        variant: s.variantName,
        requested: config.difficulty ? nameOf('difficulty.', config.difficulty) : null,
        achieved: rating.level ? nameOf('difficulty.', rating.level) : null,
        hardestTechnique: rating.hardestTechnique ? nameOf('technique.', rating.hardestTechnique) : null
      }
    };
    if (!isRowMajor(layout, model.cellCount)) {
      // A board with holes (multi-grid) needs the canvas position of every cell.
      data.layout = {
        rows: layout.rows,
        cols: layout.cols,
        cellRow: numbers(layout.cellRow),
        cellCol: numbers(layout.cellCol),
        cellRegion: data.layout.cellRegion,
        subGrids: data.layout.subGrids
      };
    }
    if (model.variantId === 'wordoku' && SG.wordoku && typeof SG.wordoku.describe === 'function') {
      const info = SG.wordoku.describe(model);
      if (info !== null) data.wordoku = { word: info.word, placement: info.placement, line: info.line };
    }
    data.model = SG.exchange.plain(SG.pipeline.toWire(result).model);
    return data;
  }

  // ---------------------------------------------------------------------------------------------
  // Play online: the hand-off to sudoku-player (design.md section 10.9)
  // ---------------------------------------------------------------------------------------------

  /**
   * The address of the player.
   * @param {string} [content]  The `content` of `<meta name="sg-player-url">`; blank or missing = the default.
   * @returns {string}
   */
  function playerBase(content) {
    return typeof content === 'string' && content.trim() !== '' ? content.trim() : PLAYER_URL_DEFAULT;
  }

  /** The player's address as the page states it (DOM); the default without a page or a meta tag. */
  function pagePlayerBase() {
    const meta = typeof document !== 'undefined' && document.querySelector
      ? document.querySelector('meta[name="' + PLAYER_META_NAME + '"]') : null;
    return playerBase(meta ? meta.getAttribute('content') : null);
  }

  /**
   * The link that opens a puzzle in the player: the puzzle document (`toJson`, with its `model`) in the
   * fragment of the player's address.
   * @param {Object} result  A `PuzzleResult`, generated or imported (only the document matters).
   * @param {{base?: string, generatedAt?: string, locale?: string, compress?: boolean}} [options]
   *        `base`: the player's address (default `pagePlayerBase()`); `compress: false` forces the plain token.
   * @returns {Promise<{url: string, token: string, base: string, length: number, long: boolean}>}
   *          `long`: the link is longer than `LONG_LINK_CHARS`. Rejects with the `exchange.*` errors.
   */
  function buildPlayLink(result, options) {
    const o = options || {};
    return Promise.resolve().then(function () {
      const base = playerBase(o.base === undefined ? pagePlayerBase() : o.base);
      const doc = toJson(result, { generatedAt: o.generatedAt, locale: o.locale });
      return SG.exchange.encode(doc, { compress: o.compress }).then(function (token) {
        const url = SG.exchange.playerUrl(base, token);
        return { url: url, token: token, base: base, length: url.length, long: url.length > LONG_LINK_CHARS };
      });
    });
  }

  /**
   * Opens a player link in a new tab; the new page gets no handle on this one.
   * @param {string} url
   */
  function openPlayLink(url) {
    if (typeof root.open === 'function') root.open(url, '_blank', 'noopener');
  }

  /** The long-link notice of the Play-online section, as arguments of `export.playOnline.long`. */
  function longLinkArgs(info) {
    return { size: formatNumber(Math.round(info.length / 1000)) };
  }

  function isPrimitive(x) {
    return x === null || typeof x !== 'object';
  }

  /**
   * The text of a JSON document: indented by two spaces, short arrays and small objects of an array on one
   * line, the arrays that hold one value per cell one row of the board per line.
   * @param {Object} data  From `toJson`.
   * @returns {string}
   */
  function formatJson(data) {
    const width = data && data.layout && data.layout.cols > 0 ? data.layout.cols : 0;
    const one = function (x) { return JSON.stringify(x); };

    function write(value, indent, key) {
      if (isPrimitive(value)) return one(value);
      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        if (value.every(isPrimitive)) {
          if (width > 0 && value.length > width && GRID_ARRAYS.indexOf(key) !== -1) {
            const pad = indent + '  ';
            const lines = [];
            for (let i = 0; i < value.length; i += width) {
              lines.push(pad + value.slice(i, i + width).map(one).join(', '));
            }
            return '[\n' + lines.join(',\n') + '\n' + indent + ']';
          }
          return '[' + value.map(one).join(', ') + ']';
        }
        const pad = indent + '  ';
        return '[\n' + value.map(function (x) { return pad + one(x); }).join(',\n') + '\n' + indent + ']';
      }
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      const pad = indent + '  ';
      return '{\n' + keys.map(function (k) {
        return pad + one(k) + ': ' + write(value[k], pad, k);
      }).join(',\n') + '\n' + indent + '}';
    }

    return write(data, '', '') + '\n';
  }

  // ---------------------------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------------------------

  /**
   * Whether the puzzle fits one line of text, and what that line leaves out.
   * @param {Object} result  A `PuzzleResult` (or anything with a `model`).
   * @returns {{ok: boolean, notes: string[], reason: ?string}} `notes`: keys of what the text does not
   *   carry although the puzzle needs it (`ok` is still true); `reason`: key of why `ok` is false.
   */
  function textSupport(result) {
    const model = result.model;
    const id = model.variantId;
    if (Object.prototype.hasOwnProperty.call(TEXT_NOTES, id) && model.cages.length === 0 &&
        model.inequalities.length === 0 && model.cellCount === model.digits * model.digits) {
      return { ok: true, notes: TEXT_NOTES[id].slice(), reason: null };
    }
    const reason = Object.prototype.hasOwnProperty.call(TEXT_REASONS, id) ? TEXT_REASONS[id]
      : 'export.text.reason.other';
    return { ok: false, notes: [], reason: reason };
  }

  /**
   * The puzzle as one line of text, row by row ('.' = empty; 1..9, then A, B, C... for 10 and above).
   * @param {Object} result
   * @param {{solution?: boolean}} [options]  Write the solution instead of the givens.
   * @returns {?string} null when `textSupport(result).ok` is false (or the solution is unknown).
   */
  function toText(result, options) {
    if (!textSupport(result).ok) return null;
    const wantSolution = !!(options && options.solution);
    const values = wantSolution ? result.solution : result.givens;
    if (wantSolution && !hasSolution(values)) return null;
    let out = '';
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      out += v > 0 ? TEXT_DIGITS.charAt(v - 1) : EMPTY_CHAR;
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // Print layout and batch seeds
  // ---------------------------------------------------------------------------------------------

  /**
   * The page plan of a print job: which puzzle goes where. Puzzles come first, `perPage` to a page in
   * reading order; with `includeSolutions` the solutions follow on pages of their own, in the same order.
   * @param {number} count  Number of puzzles.
   * @param {number} perPage  1, 2, 4 or 6 (anything else counts as 1).
   * @param {boolean} [includeSolutions=false]
   * @returns {{count: number, perPage: number, columns: number, rows: number, puzzlePages: number,
   *   solutionPages: number, pageCount: number, pages: Array<{kind: string, number: number,
   *   items: Array<{index: number, slot: number, row: number, column: number}>}>}}
   */
  function buildPrintLayout(count, perPage, includeSolutions) {
    const n = Math.max(0, Math.floor(Number(count)) || 0);
    const per = PER_PAGE_CHOICES.indexOf(perPage) === -1 ? 1 : perPage;
    const columns = PAGE_GRID[per][0];
    const rows = PAGE_GRID[per][1];
    const pages = [];
    function add(kind) {
      for (let start = 0; start < n; start += per) {
        const items = [];
        for (let slot = 0; slot < per && start + slot < n; slot++) {
          items.push({ index: start + slot, slot: slot, row: Math.floor(slot / columns),
            column: slot % columns });
        }
        pages.push({ kind: kind, number: pages.length + 1, items: items });
      }
    }
    add('puzzles');
    const puzzlePages = pages.length;
    if (includeSolutions === true) add('solutions');
    return {
      count: n, perPage: per, columns: columns, rows: rows, puzzlePages: puzzlePages,
      solutionPages: pages.length - puzzlePages, pageCount: pages.length, pages: pages
    };
  }

  /**
   * Seeds for a batch: n distinct uint32 values derived from `baseSeed`. The first is the base seed itself
   * (so the puzzle on screen is the first of its batch); the others are streams of `SG.rng` forked from it,
   * so the same base always gives the same batch.
   * @param {number} baseSeed
   * @param {number} n
   * @returns {number[]}
   */
  function batchSeeds(baseSeed, n) {
    const base = (Number(baseSeed) >>> 0);
    const count = Math.max(0, Math.floor(Number(n)) || 0);
    const seeds = [];
    const used = new Set();
    for (let k = 0; k < count; k++) {
      let seed = k === 0 ? base : SG.rng.create(base).fork('batch#' + k).seed;
      while (used.has(seed)) seed = (seed + 1) >>> 0;
      used.add(seed);
      seeds.push(seed);
    }
    return seeds;
  }

  // ---------------------------------------------------------------------------------------------
  // SVG of a puzzle
  // ---------------------------------------------------------------------------------------------

  function escapeXml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * The board tokens for paper: no tint behind the regions and the cages (the thick lines and the dashed
   * outlines say it), one dark ink for everything that is written or drawn, a dark thin line. The tints
   * that carry a meaning (diagonals, windows, shared cells, the word line) stay.
   * @param {Object<string, string>} base  Light-theme values of `SG.boardView.TOKEN_NAMES`.
   * @returns {Object<string, string>} A new map.
   */
  function printTokens(base) {
    const out = Object.assign({}, base);
    const ink = base['--sg-board-ink-given'];
    const line = base['--sg-board-line-thick'];
    let k;
    for (k = 1; k <= 9; k++) out['--sg-board-region-' + k] = 'transparent';
    for (k = 0; k < 5; k++) out['--sg-board-cage-' + k] = 'transparent';
    if (line) out['--sg-board-line-thin'] = line;
    if (ink) {
      ['--sg-board-ink-solution', '--sg-board-ink-placed', '--sg-board-ink-sum', '--sg-board-sign',
        '--sg-board-cage-line'].forEach(function (name) { out[name] = ink; });
    }
    return out;
  }

  function lightTokens() {
    return SG.boardView && typeof SG.boardView.resolveTokens === 'function'
      ? SG.boardView.resolveTokens('light') : {};
  }

  /** The symbol mode a puzzle is shown in: the one of the form for the same variant, else its own. */
  function symbolModeOf(result, preferred) {
    const def = SG.variants && SG.variants.has(result.model.variantId)
      ? SG.variants.get(result.model.variantId) : null;
    const modes = def && SG.symbols && typeof SG.symbols.modesFor === 'function' ? SG.symbols.modesFor(def)
      : (def ? def.symbolModes : []);
    if (preferred && modes.indexOf(preferred) !== -1) return preferred;
    const own = result.config && result.config.symbolMode;
    if (own && modes.indexOf(own) !== -1) return own;
    return def ? def.defaultSymbolMode : 'digits';
  }

  function boardDescription(model, shown) {
    let filled = 0;
    for (let i = 0; i < shown.length; i++) if (shown[i] > 0) filled++;
    let desc = t('board.desc', {
      rows: model.layout.rows, cols: model.layout.cols, filled: filled, total: model.cellCount
    });
    if (model.cages.length > 0) desc += ' ' + t('board.desc.cages', { count: model.cages.length });
    if (model.inequalities.length > 0) {
      desc += ' ' + t('board.desc.signs', { count: model.inequalities.length });
    }
    return desc;
  }

  /**
   * A standalone SVG document of the puzzle (its givens) or of the solution drawn into the empty cells,
   * built from the result itself: it does not depend on what the board shows during a replay.
   * @param {Object} result  A `PuzzleResult`.
   * @param {Object} [options]
   * @param {boolean} [options.solution=false]  Draw the solution too (the givens stay bold).
   * @param {boolean} [options.print=false]  Paper look: `printTokens` and no region tint.
   * @param {boolean} [options.caption=false]  Add two lines above the board: variant and level, seed and
   *        clues (rule L6: translated).
   * @param {string} [options.symbolMode]  Preferred symbol mode.
   * @param {boolean} [options.colorAuxSymbol=true]
   * @param {Object} [options.tokens]  Resolved light-theme tokens (default: read from the page).
   * @returns {string}
   */
  function boardSvg(result, options) {
    const o = options || {};
    const model = result.model;
    const givens = Int32Array.from(result.givens);
    const solution = o.solution === true && hasSolution(result.solution) ? Int32Array.from(result.solution)
      : null;
    const base = o.tokens || lightTokens();
    const tokens = o.print === true ? printTokens(base) : base;
    const mode = symbolModeOf(result, o.symbolMode);
    const shown = solution === null ? givens : solution;
    const markup = { symbolMode: mode, colorAuxSymbol: o.colorAuxSymbol !== false,
      title: t('board.title', { variant: nameOf('variant.', model.variantId) }),
      desc: boardDescription(model, shown) };
    if (o.print === true) markup.regionTint = false;
    const svg = SG.boardView.exportSvg(model, { values: givens, states: null, givens: givens,
      solution: solution }, markup, tokens);
    return o.caption === true ? withCaption(svg, captionLines(result, o.solution === true), tokens) : svg;
  }

  /** Two caption lines: variant and level (with the page kind for a solution), seed and clues. */
  function captionLines(result, solution) {
    const s = summarize(result);
    const first = t('export.print.heading', { variant: s.variantName, level: s.levelName });
    const head = solution ? t('export.print.solutionOnly') + ' \u00b7 ' + first : first;
    const clues = t('unit.clue', { count: s.clues });
    const second = s.seed === '' ? clues : t('export.print.meta', { seed: s.seed, clues: clues });
    return [head, second];
  }

  function svgBox(svg) {
    const m = /<svg\b[^>]*\bviewBox="0 0 ([\d.]+) ([\d.]+)"[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"/
      .exec(svg);
    if (m === null) return null;
    return { viewWidth: Number(m[1]), viewHeight: Number(m[2]), width: Number(m[3]), height: Number(m[4]) };
  }

  /**
   * Puts a caption above a standalone board SVG: a new document that nests the board.
   * @param {string} svg  From `SG.boardView.exportSvg`.
   * @param {string[]} lines  One or two lines of text.
   * @param {Object<string, string>} tokens
   * @returns {string}
   */
  function withCaption(svg, lines, tokens) {
    const box = svgBox(svg);
    if (box === null) return svg;
    const ink = tokens['--sg-board-ink-given'] || 'currentColor';
    const paper = tokens['--sg-board-paper'] || 'transparent';
    const font = tokens['--sg-font-family'] || 'sans-serif';
    const longest = Math.max.apply(null, lines.map(function (line) { return line.length; }));
    const size = Math.max(7, Math.min(14, Math.floor((box.viewWidth - 12) / (Math.max(longest, 1) * 0.56))));
    const gap = Math.round(size * 0.35);
    const head = Math.round(size * lines.length + gap * (lines.length + 1));
    const scale = box.viewWidth > 0 ? box.width / box.viewWidth : 1;
    const totalView = box.viewHeight + head;
    const texts = lines.map(function (line, i) {
      const y = Math.round((gap + size) * (i + 1) - gap * 0.2);
      const cls = 'cap' + (i === 0 ? ' cap--first' : '');
      return '<text class="' + cls + '" x="' + (box.viewWidth / 2) + '" y="' + y + '" font-size="' + size +
        '" text-anchor="middle">' + escapeXml(line) + '</text>';
    }).join('\n');
    const inner = svg.replace(/^<\?xml[^>]*\?>\s*/, '').replace(/^<svg\b[^>]*>/,
      '<svg x="0" y="' + head + '" width="' + box.viewWidth + '" height="' + box.viewHeight +
      '" viewBox="0 0 ' + box.viewWidth + ' ' + box.viewHeight + '">');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="' + SVG_NS + '" role="img" aria-labelledby="' + CAPTION_ID + '" viewBox="0 0 ' +
      box.viewWidth + ' ' + totalView + '" width="' + (Math.round(box.viewWidth * scale * 100) / 100) +
      '" height="' + (Math.round(totalView * scale * 100) / 100) + '">\n' +
      '<title id="' + CAPTION_ID + '">' + escapeXml(lines.join(' - ')) + '</title>\n' +
      '<style>.cap{fill:' + ink + ';font-family:' + font + '}.cap--first{font-weight:600}</style>\n' +
      '<rect x="0" y="0" width="' + box.viewWidth + '" height="' + totalView + '" fill="' + paper + '"/>\n' +
      texts + '\n' + inner + '\n</svg>\n';
  }

  /**
   * Size of a standalone SVG in board units.
   * @param {string} svg
   * @returns {?{width: number, height: number}}
   */
  function svgSize(svg) {
    const box = svgBox(svg);
    return box === null ? null : { width: box.viewWidth, height: box.viewHeight };
  }

  function svgDataUrl(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // ---------------------------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------------------------

  function svgToPngBlob(svg, width, height) {
    return new Promise(function (resolve, reject) {
      if (typeof document === 'undefined' || typeof root.Image !== 'function') {
        reject(new Error('no canvas'));
        return;
      }
      const img = new root.Image();
      img.onload = function () {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          canvas.toBlob(function (blob) {
            if (blob === null) reject(new Error('PNG export failed'));
            else resolve(blob);
          }, 'image/png');
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = function () { reject(new Error('SVG could not be rendered')); };
      img.src = svgDataUrl(svg);
    });
  }

  /**
   * Builds the file of one export format.
   * @param {Object} result
   * @param {string} format  'json' | 'text' | 'svg' | 'png'.
   * @param {Object} [options]  `solution` (text, svg, png: the solution instead of the puzzle), `caption`
   *        (svg, png), `scale` (png: pixels per board unit, 1..4), `symbolMode`, `colorAuxSymbol`,
   *        `generatedAt` (json).
   * @returns {Promise<{name: string, blob: Blob}>}
   */
  function makeFile(result, format, options) {
    const o = options || {};
    const suffix = o.solution === true ? t('export.file.solution') : '';
    try {
      if (format === 'json') {
        const text = formatJson(toJson(result, { generatedAt: o.generatedAt }));
        return Promise.resolve({ name: fileName(result, 'json'),
          blob: new Blob([text], { type: 'application/json' }) });
      }
      if (format === 'text') {
        const text = toText(result, { solution: o.solution === true });
        if (text === null) return Promise.reject(new Error('text format not available'));
        return Promise.resolve({ name: fileName(result, 'txt', { suffix: suffix }),
          blob: new Blob([text + '\n'], { type: 'text/plain' }) });
      }
      const svg = boardSvg(result, { solution: o.solution === true, caption: o.caption === true,
        symbolMode: o.symbolMode, colorAuxSymbol: o.colorAuxSymbol });
      if (format === 'svg') {
        return Promise.resolve({ name: fileName(result, 'svg', { suffix: suffix }),
          blob: new Blob([svg], { type: 'image/svg+xml' }) });
      }
      if (format === 'png') {
        const size = svgSize(svg);
        const k = PNG_SCALES.indexOf(o.scale) === -1 ? DEFAULT_PNG_SCALE : o.scale;
        const box = svgBox(svg);
        const height = box === null ? size.height : box.viewHeight;
        return svgToPngBlob(svg, Math.round(size.width * k), Math.round(height * k)).then(function (blob) {
          return { name: fileName(result, 'png', { suffix: suffix }), blob: blob };
        });
      }
      return Promise.reject(new Error('unknown export format: ' + format));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Saves a blob: a temporary `<a download>` link, clicked, then released.
   * @param {Blob} blob
   * @param {string} name
   */
  function download(blob, name) {
    const url = root.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.rel = 'noopener';
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    root.setTimeout(function () {
      root.URL.revokeObjectURL(url);
      if (link.parentNode) link.parentNode.removeChild(link);
    }, 1000);
  }

  // ---------------------------------------------------------------------------------------------
  // Batch generation
  // ---------------------------------------------------------------------------------------------

  function cancelledError() {
    return new SG.errors.GenerationError('budget.cancelled', {});
  }

  /** Whether an error is the cancellation of a batch (not a failure to report). */
  function isCancel(err) {
    return !!err && err.code === 'budget.cancelled';
  }

  /**
   * Generates `count` puzzles with the configuration of a puzzle, seed by seed (`batchSeeds`). It uses a
   * generation client of its own (`SG.workerClient.create()`; without it the pipeline runs on the main
   * thread, one puzzle per timer tick), so the puzzle on screen is never touched.
   * @param {Object} options
   * @param {Object} options.config  A normalised `GenerateConfig` (`result.config`).
   * @param {number} options.count
   * @param {Object} [options.first]  A finished result that stands for the first puzzle (the one on screen).
   * @param {function(number, number): void} [options.onProgress]  `(done, total)`.
   * @param {Object} [options.client]  A generation client (tests); default: an independent one.
   * @param {Object} [options.clientOptions]  Options of `SG.workerClient.create` (tests).
   * @param {boolean} [options.forceLocal]  Run `SG.pipeline.run` on the main thread, whatever the page has.
   * @returns {{promise: Promise<Object[]>, cancel: function(): void}} The promise resolves with the results
   *   and rejects with a `GenerationError` ('budget.cancelled' after `cancel()`).
   */
  function createBatch(options) {
    const o = options || {};
    const total = Math.max(1, Math.floor(Number(o.count)) || 1);
    const seeds = batchSeeds(o.config.seed, total);
    const results = [];
    let cancelled = false;
    let finished = false;
    let client = null;
    let timer = null;
    let reject = null;

    function configFor(k) {
      return Object.assign({}, o.config, {
        seed: seeds[k], trace: 'off', variantOptions: clone(o.config.variantOptions || {})
      });
    }

    function dispose() {
      finished = true;
      if (timer !== null) root.clearTimeout(timer);
      timer = null;
      if (client !== null && typeof client.dispose === 'function' && client !== o.client) {
        try {
          client.dispose();
        } catch (err) {
          logError(err);
        }
      }
    }

    function generateOne(config) {
      if (o.client) return o.client.generate(config, function () {});
      if (o.forceLocal !== true && SG.workerClient && typeof SG.workerClient.create === 'function') {
        if (client === null) client = SG.workerClient.create(o.clientOptions || {});
        return client.generate(config, function () {});
      }
      return new Promise(function (resolve, fail) {
        timer = root.setTimeout(function () {
          timer = null;
          try {
            resolve(SG.pipeline.run(config, null, SG.budget.create({ ms: BATCH_BUDGET_MS })));
          } catch (err) {
            fail(err);
          }
        }, 0);
      });
    }

    const promise = new Promise(function (resolve, fail) {
      reject = fail;
      let k = 0;
      function progress() {
        if (typeof o.onProgress === 'function') o.onProgress(results.length, total);
      }
      if (o.first) {
        results.push(o.first);
        k = 1;
      }
      progress();
      function next() {
        if (cancelled || finished) return;
        if (k >= total) {
          dispose();
          resolve(results);
          return;
        }
        let run;
        try {
          run = generateOne(configFor(k));
        } catch (err) {
          dispose();
          fail(err);
          return;
        }
        run.then(function (result) {
          if (cancelled || finished) return;
          results.push(result);
          k++;
          progress();
          next();
        }, function (err) {
          if (cancelled || finished) return;
          dispose();
          fail(err);
        });
      }
      next();
    });

    return {
      promise: promise,
      cancel: function cancel() {
        if (cancelled || finished) return;
        cancelled = true;
        if (client !== null && typeof client.cancel === 'function') {
          try {
            client.cancel();
          } catch (err) {
            logError(err);
          }
        }
        if (o.client && typeof o.client.cancel === 'function') o.client.cancel();
        dispose();
        reject(cancelledError());
      }
    };
  }

  // ---------------------------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------------------------

  /** Creates an element; attribute values of null / undefined / false are skipped, `true` gives ''. */
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

  /** An element with a translated text; `SG.i18n.applyTo` keeps it in step with the language. */
  function tx(tag, attrs, key, args) {
    const node = el(tag, Object.assign({}, attrs, { 'data-i18n': key }));
    setKey(node, key, args);
    return node;
  }

  function setKey(node, key, args) {
    node.setAttribute('data-i18n', key);
    if (args) node.setAttribute('data-i18n-args', JSON.stringify(args));
    else node.removeAttribute('data-i18n-args');
    node.textContent = t(key, args);
  }

  /** Makes an attribute (title, aria-label, placeholder) follow the language. */
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

  /** A button with an optional icon and a translated label. */
  function button(key, attrs, iconName) {
    const label = tx('span', { class: 'btn__label' }, key);
    const kids = iconName ? [icon(iconName), label] : [label];
    return el('button', Object.assign({ type: 'button', class: 'btn btn--secondary' }, attrs), kids);
  }

  let idCounter = 0;
  function nextId(prefix) {
    idCounter++;
    return prefix + '-' + idCounter;
  }

  // ---------------------------------------------------------------------------------------------
  // Print
  // ---------------------------------------------------------------------------------------------

  function printHost() {
    let host = document.getElementById(PRINT_ROOT_ID);
    if (host === null) {
      host = el('div', { id: PRINT_ROOT_ID, hidden: true, 'aria-hidden': 'true' });
      document.body.appendChild(host);
    }
    return host;
  }

  /** Empties `#print-root` (after printing, or before the next job). */
  function clearPrint() {
    if (typeof document === 'undefined') return;
    const host = document.getElementById(PRINT_ROOT_ID);
    if (host !== null) host.textContent = '';
  }

  function printItem(item, solution, tokens, images) {
    const result = item.result;
    const s = summarize(result);
    const heading = t('export.print.heading', { variant: s.variantName, level: s.levelName });
    const parts = [];
    if (solution) {
      parts.push(item.number ? t('export.print.solutionNumber', { n: item.number })
        : t('export.print.solutionOnly'));
    } else if (item.number) {
      parts.push(t('export.print.puzzleNumber', { n: item.number }));
    }
    parts.push(heading);
    const clues = t('unit.clue', { count: s.clues });
    const meta = s.seed === '' ? clues : t('export.print.meta', { seed: s.seed, clues: clues });
    const svg = boardSvg(result, { solution: solution, print: true, tokens: tokens,
      symbolMode: item.symbolMode });
    const img = el('img', {
      class: 'print-item__board', src: svgDataUrl(svg), decoding: 'sync',
      alt: t(solution ? 'export.print.altSolution' : 'export.print.alt',
        { variant: s.variantName, level: s.levelName })
    });
    images.push(img);
    return el('article', { class: 'print-item', 'data-kind': solution ? 'solution' : 'puzzle' }, [
      el('header', { class: 'print-item__head' }, [
        el('h2', { class: 'print-item__title', text: parts.join(' \u00b7 ') }),
        el('p', { class: 'print-item__meta', text: meta })
      ]),
      img
    ]);
  }

  /**
   * Builds the print container: one `<section class="print-page">` per page of `buildPrintLayout`, each
   * puzzle a header (variant, level, seed, clues; translated) above its vector picture. css/print.css shows
   * only this container while printing.
   * @param {Array<{result: Object, number: ?number, symbolMode: ?string}>} items
   * @param {{perPage?: number, solutions?: boolean}} [options]
   * @returns {{root: Element, images: HTMLImageElement[], layout: Object}}
   */
  function buildPrintRoot(items, options) {
    const o = options || {};
    const layout = buildPrintLayout(items.length, o.perPage || 1, o.solutions === true);
    const host = printHost();
    host.textContent = '';
    const tokens = printTokens(lightTokens());
    const images = [];
    layout.pages.forEach(function (page) {
      const solution = page.kind === 'solutions';
      const grid = el('div', { class: 'print-page__grid' });
      page.items.forEach(function (slot) {
        grid.appendChild(printItem(items[slot.index], solution, tokens, images));
      });
      const section = el('section', {
        class: 'print-page', 'data-kind': page.kind, 'data-per-page': layout.perPage,
        'data-columns': layout.columns, 'data-rows': layout.rows, 'data-page': page.number
      });
      if (solution && items.length > 1) {
        section.appendChild(tx('h2', { class: 'print-page__title' }, 'export.print.solutionsPage'));
      }
      section.appendChild(grid);
      host.appendChild(section);
    });
    return { root: host, images: images, layout: layout };
  }

  function waitForImages(images) {
    const pending = images.map(function (img) {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      if (typeof img.decode === 'function') return img.decode().catch(function () {});
      return new Promise(function (resolve) {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });
    return Promise.race([
      Promise.all(pending),
      new Promise(function (resolve) { root.setTimeout(resolve, IMAGE_WAIT_MS); })
    ]);
  }

  /**
   * Prints puzzles: builds `#print-root`, waits until its pictures are ready, then opens the print dialog.
   * The container is emptied again after printing.
   * @param {Array<{result: Object, number: ?number}>} items
   * @param {{perPage?: number, solutions?: boolean, print?: function(): void}} [options]
   * @returns {Promise<Object>} The page plan.
   */
  function printItems(items, options) {
    const o = options || {};
    return new Promise(function (resolve, reject) {
      let built;
      try {
        built = buildPrintRoot(items, o);
      } catch (err) {
        reject(err);
        return;
      }
      waitForImages(built.images).then(function () {
        const run = typeof o.print === 'function' ? o.print : function () { root.print(); };
        root.addEventListener('afterprint', clearPrint, { once: true });
        try {
          run();
        } catch (err) {
          clearPrint();
          reject(err);
          return;
        }
        resolve(built.layout);
      });
    });
  }

  // ---------------------------------------------------------------------------------------------
  // The dialog
  // ---------------------------------------------------------------------------------------------

  /** Settings that stay while the page is open. */
  const prefs = { content: 'puzzle', caption: true, scale: DEFAULT_PNG_SCALE, solutionPage: true,
    count: 6, perPage: 4, batchSolutions: true };

  let appRef = null;
  let initialised = false;
  let openDialog = null;

  function currentResult() {
    const current = appRef ? appRef.getResult() : null;
    return current ? current.result : null;
  }

  function formState() {
    return appRef && typeof appRef.getStore === 'function' ? appRef.getStore().get() : null;
  }

  /** The symbol mode of the puzzle on screen (the board's mode for the same variant). */
  function screenSymbolMode(result) {
    const state = formState();
    return state && state.variantId === result.model.variantId ? state.symbolMode : null;
  }

  function shareUrlOf(result) {
    if (!SG.resultView || typeof SG.resultView.shareLink !== 'function') return '';
    return SG.resultView.shareLink(result, { state: formState() || {},
      baseUrl: root.location ? root.location.href : '' });
  }

  function summaryText(result) {
    const s = summarize(result);
    const clues = t('unit.clue', { count: s.clues });
    const args = { variant: s.variantName, level: s.levelName, clues: clues, seed: s.seed };
    return t(s.seed === '' ? 'export.summary' : 'export.summary.seed', args);
  }

  function clampCount(value) {
    const n = Math.floor(Number(value));
    if (!isFinite(n) || n < 1) return 1;
    return Math.min(n, MAX_BATCH);
  }

  /**
   * Builds the dialog body.
   * @param {Element} container  `modal.body`.
   * @returns {{refresh: function(): void, destroy: function(): void}}
   */
  function createDialog(container) {
    const app = appRef;
    const refs = {};
    const cleanups = [];
    let batch = null;
    let busyFile = false;
    let playInfo = null;
    let playFor = null;
    let playSeq = 0;

    function toast(kind, key, args) {
      app.toast(kind, key, args);
    }

    // ---- helpers ----------------------------------------------------------------------------

    function card(titleKey, hintKey, children) {
      const kids = [];
      if (titleKey !== null) kids.push(tx('h4', { class: 'card__title' }, titleKey));
      if (hintKey) kids.push(tx('p', { class: 'field__hint' }, hintKey));
      return el('div', { class: 'card card--flat stack', 'data-card': (titleKey || hintKey).split('.')[1] },
        kids.concat(children));
    }

    function note(role) {
      return el('p', { class: 'field__hint', 'data-role': role, hidden: true });
    }

    function switchRow(key, role, checked, onChange) {
      const id = nextId('export-sw');
      const input = el('input', { class: 'switch__input', type: 'checkbox', role: 'switch', id: id,
        'data-role': role });
      input.checked = checked;
      input.addEventListener('change', function () { onChange(input.checked); });
      return { input: input, row: el('label', { class: 'switch', for: id }, [
        input,
        el('span', { class: 'switch__track', 'aria-hidden': 'true' }),
        tx('span', { class: 'switch__text' }, key)
      ]) };
    }

    function disable(node, flag) {
      if (node) node.disabled = !!flag;
    }

    // ---- actions ----------------------------------------------------------------------------

    function fileOptions() {
      const result = currentResult();
      return { solution: prefs.content === 'solution', caption: prefs.caption, scale: prefs.scale,
        symbolMode: result ? screenSymbolMode(result) : null };
    }

    function saveFile(format) {
      const result = currentResult();
      if (result === null || busyFile) return;
      busyFile = true;
      makeFile(result, format, fileOptions()).then(function (file) {
        download(file.blob, file.name);
        toast('success', 'export.toast.saved', { name: file.name });
      }).catch(function (err) {
        logError(err);
        toast('danger', 'export.toast.failed', { message: err && err.message ? err.message : String(err) });
      }).then(function () { busyFile = false; });
    }

    function copy(text) {
      const write = SG.controls && typeof SG.controls.copyText === 'function' ? SG.controls.copyText : null;
      const done = function (ok) {
        toast(ok ? 'success' : 'danger', ok ? 'export.toast.copied' : 'export.toast.copyFailed');
      };
      if (write === null) {
        done(false);
        return;
      }
      Promise.resolve(write(text, document)).then(done, function () { done(false); });
    }

    function copyJson() {
      const result = currentResult();
      if (result !== null) copy(formatJson(toJson(result)));
    }

    function openPlay() {
      if (playInfo === null) return;
      openPlayLink(playInfo.url);
      toast('info', 'export.playOnline.opened');
    }

    function printOne() {
      const result = currentResult();
      if (result === null) return;
      const item = { result: result, number: null, symbolMode: screenSymbolMode(result) };
      printItems([item], { perPage: 1, solutions: prefs.solutionPage && hasSolution(result.solution) })
        .catch(function (err) {
          logError(err);
          toast('danger', 'export.toast.failed', { message: err && err.message ? err.message : String(err) });
        });
    }

    // ---- batch ------------------------------------------------------------------------------

    function batchMessage(kind, key, args) {
      refs.batchMessage.hidden = false;
      refs.batchMessage.className = 'alert alert--' + kind;
      setKey(refs.batchMessageText, key, args);
    }

    function setBatchBusy(flag) {
      refs.batchBusy.hidden = !flag;
      refs.batchRun.hidden = flag;
      refs.batchCancel.hidden = !flag;
      [refs.count, refs.perPage, refs.batchSolutions].forEach(function (node) { disable(node, flag); });
      refs.batchCard.setAttribute('aria-busy', flag ? 'true' : 'false');
    }

    function setProgress(done, total) {
      refs.progress.max = total;
      refs.progress.value = done;
      setKey(refs.progressText, 'export.batch.progress', { done: Math.min(done + 1, total), total: total });
    }

    function runBatch() {
      const result = currentResult();
      if (result === null || batch !== null) return;
      const count = clampCount(refs.count.value);
      const perPage = Number(refs.perPage.value);
      const withSolutions = refs.batchSolutions.checked;
      refs.count.value = String(count);
      refs.batchMessage.hidden = true;
      setBatchBusy(true);
      setProgress(1, count);
      batch = createBatch({ config: result.config, count: count, first: result,
        onProgress: function (done, total) { setProgress(done, total); } });
      const mine = batch;
      mine.promise.then(function (results) {
        if (batch !== mine) return null;
        batch = null;
        setBatchBusy(false);
        const approx = results.filter(function (r) {
          return Array.isArray(r.warnings) && r.warnings.indexOf('difficulty.approximate') !== -1;
        }).length;
        const items = results.map(function (r, i) {
          return { result: r, number: i + 1, symbolMode: screenSymbolMode(r) };
        });
        return printItems(items, { perPage: perPage, solutions: withSolutions }).then(function () {
          if (approx > 0) batchMessage('warning', 'export.batch.approximate', { count: approx });
          else batchMessage('success', 'export.batch.done', { count: results.length });
        });
      }).catch(function (err) {
        if (batch === mine) {
          batch = null;
          setBatchBusy(false);
        }
        if (isCancel(err)) {
          batchMessage('warning', 'export.batch.cancelled');
          return;
        }
        logError(err);
        batchMessage('danger', 'export.batch.failed', {
          message: SG.i18n && typeof SG.i18n.tError === 'function' ? SG.i18n.tError(err) : String(err)
        });
      });
    }

    function cancelBatch() {
      if (batch !== null) batch.cancel();
    }

    // ---- build ------------------------------------------------------------------------------

    function buildContentRow() {
      const segmented = el('div', { class: 'segmented', role: 'group', 'data-role': 'content' });
      attrKey(segmented, 'aria-label', 'export.content.label');
      [['puzzle', 'export.content.puzzle'], ['solution', 'export.content.solution']].forEach(function (pair) {
        const b = tx('button', { type: 'button', class: 'segmented__btn', 'data-content': pair[0],
          'aria-pressed': prefs.content === pair[0] ? 'true' : 'false' }, pair[1]);
        b.addEventListener('click', function () {
          prefs.content = pair[0];
          toArray(segmented.children).forEach(function (other) {
            other.setAttribute('aria-pressed', other === b ? 'true' : 'false');
          });
          refresh();
        });
        segmented.appendChild(b);
      });
      const caption = switchRow('export.content.caption', 'caption', prefs.caption, function (on) {
        prefs.caption = on;
      });
      refs.caption = caption.input;
      return el('div', { class: 'cluster', 'data-role': 'content-row' }, [
        tx('span', { class: 'field__label' }, 'export.content.label'), segmented, caption.row
      ]);
    }

    function buildPrintCard() {
      const sol = switchRow('export.print.solutionPage', 'print-solution', prefs.solutionPage, function (on) {
        prefs.solutionPage = on;
      });
      refs.printSolution = sol.input;
      refs.printButton = button('export.print.button', { class: 'btn btn--primary', 'data-role': 'print' });
      refs.printButton.addEventListener('click', printOne);
      return card('export.print.title', 'export.print.hint', [sol.row, refs.printButton]);
    }

    function buildPngCard() {
      const id = nextId('export-png-size');
      refs.pngSize = el('select', { class: 'select', id: id, 'data-role': 'png-size' });
      PNG_SCALES.forEach(function (k) {
        const option = el('option', { value: String(k) });
        if (k === prefs.scale) option.selected = true;
        refs.pngSize.appendChild(option);
      });
      refs.pngSize.addEventListener('change', function () {
        prefs.scale = Number(refs.pngSize.value);
      });
      refs.pngButton = button('export.png.button', { 'data-role': 'png' }, 'download');
      refs.pngButton.addEventListener('click', function () { saveFile('png'); });
      return card('export.png.title', 'export.png.hint', [
        el('div', { class: 'field' }, [
          tx('label', { class: 'field__label', for: id }, 'export.png.size'), refs.pngSize
        ]),
        refs.pngButton
      ]);
    }

    function buildSvgCard() {
      refs.svgButton = button('export.svg.button', { 'data-role': 'svg' }, 'download');
      refs.svgButton.addEventListener('click', function () { saveFile('svg'); });
      return card('export.svg.title', 'export.svg.hint', [refs.svgButton]);
    }

    function buildJsonCard() {
      refs.jsonButton = button('export.json.button', { 'data-role': 'json' }, 'download');
      refs.jsonButton.addEventListener('click', function () { saveFile('json'); });
      refs.jsonCopy = button('export.json.copy', { 'data-role': 'json-copy' }, 'copy');
      refs.jsonCopy.addEventListener('click', copyJson);
      return card('export.json.title', 'export.json.hint', [
        el('div', { class: 'cluster' }, [refs.jsonButton, refs.jsonCopy])
      ]);
    }

    function buildTextCard() {
      refs.textArea = el('textarea', { class: 'textarea mono', rows: '3', readonly: true, spellcheck: 'false',
        'data-role': 'text' });
      attrKey(refs.textArea, 'aria-label', 'export.text.label');
      refs.textArea.addEventListener('focus', function () { refs.textArea.select(); });
      refs.textNote = note('text-note');
      refs.textReason = el('div', { class: 'alert alert--warning', role: 'status', 'data-role': 'text-reason',
        hidden: true }, [icon('alert'), tx('p', {}, 'export.text.reason.other')]);
      refs.textButton = button('export.text.button', { 'data-role': 'text-download' }, 'download');
      refs.textButton.addEventListener('click', function () { saveFile('text'); });
      refs.textCopy = button('export.text.copy', { 'data-role': 'text-copy' }, 'copy');
      refs.textCopy.addEventListener('click', function () {
        if (refs.textArea.value !== '') copy(refs.textArea.value);
      });
      return card('export.text.title', 'export.text.hint', [
        refs.textArea, refs.textNote, refs.textReason,
        el('div', { class: 'cluster' }, [refs.textButton, refs.textCopy])
      ]);
    }

    function buildLinkCard() {
      refs.link = el('input', { class: 'input', type: 'text', readonly: true, 'data-role': 'link' });
      attrKey(refs.link, 'aria-label', 'export.link.label');
      refs.link.addEventListener('focus', function () { refs.link.select(); });
      refs.linkCopy = button('export.link.copy', { 'data-role': 'link-copy' }, 'copy');
      refs.linkCopy.addEventListener('click', function () {
        if (refs.link.value !== '') copy(refs.link.value);
      });
      refs.linkReason = note('link-reason');
      return card('export.link.title', 'export.link.hint', [refs.link, refs.linkCopy, refs.linkReason]);
    }

    function buildPlayCard() {
      refs.playLink = el('input', { class: 'input', type: 'text', readonly: true, 'data-role': 'play-link' });
      attrKey(refs.playLink, 'aria-label', 'export.playOnline.label');
      refs.playLink.addEventListener('focus', function () { refs.playLink.select(); });
      refs.playOpen = button('export.playOnline.open', { class: 'btn btn--primary', 'data-role': 'play-open' },
        'play');
      refs.playOpen.addEventListener('click', openPlay);
      refs.playCopy = button('export.playOnline.copy', { 'data-role': 'play-copy' }, 'copy');
      refs.playCopy.addEventListener('click', function () {
        if (refs.playLink.value !== '') copy(refs.playLink.value);
      });
      refs.playStatus = note('play-status');
      refs.playError = el('div', { class: 'alert alert--danger', role: 'alert', hidden: true,
        'data-role': 'play-error' }, [icon('alert'), refs.playErrorText = el('p', { 'data-role': 'play-error-text' })]);
      refs.playLongText = el('p', { 'data-role': 'play-long-text' });
      refs.playJson = button('export.json.button', { 'data-role': 'play-json' }, 'download');
      refs.playJson.addEventListener('click', function () { saveFile('json'); });
      refs.playLong = el('div', { class: 'alert alert--warning', role: 'status', hidden: true,
        'data-role': 'play-long' }, [icon('alert'), el('div', { class: 'stack' }, [refs.playLongText,
        refs.playJson])]);
      return card(null, 'export.playOnline.hint', [
        refs.playLink,
        el('div', { class: 'cluster' }, [refs.playOpen, refs.playCopy]),
        refs.playStatus, refs.playError, refs.playLong
      ]);
    }

    function buildBatch() {
      refs.count = el('input', { class: 'input', type: 'number', id: nextId('export-count'), min: '1',
        max: String(MAX_BATCH), step: '1', value: String(prefs.count), inputmode: 'numeric',
        'data-role': 'batch-count' });
      refs.perPage = el('select', { class: 'select', id: nextId('export-per-page'),
        'data-role': 'batch-per-page' });
      PER_PAGE_CHOICES.forEach(function (k) {
        const option = el('option', { value: String(k) });
        if (k === prefs.perPage) option.selected = true;
        refs.perPage.appendChild(option);
      });
      refs.countField = el('div', { class: 'field' }, [
        tx('label', { class: 'field__label', for: refs.count.id }, 'export.batch.count'), refs.count
      ]);
      refs.perPageField = el('div', { class: 'field' }, [
        tx('label', { class: 'field__label', for: refs.perPage.id }, 'export.batch.perPage'), refs.perPage
      ]);
      const sol = switchRow('export.batch.solutions', 'batch-solutions', prefs.batchSolutions, function (on) {
        prefs.batchSolutions = on;
        refreshBatch();
      });
      refs.batchSolutions = sol.input;
      refs.count.addEventListener('input', function () {
        prefs.count = clampCount(refs.count.value);
        refreshBatch();
      });
      refs.count.addEventListener('change', function () {
        refs.count.value = String(clampCount(refs.count.value));
        refreshBatch();
      });
      refs.perPage.addEventListener('change', function () {
        prefs.perPage = Number(refs.perPage.value);
        refreshBatch();
      });
      refs.plan = el('p', { class: 'field__hint', 'data-role': 'batch-plan' });
      refs.batchRun = button('export.batch.run', { class: 'btn btn--primary', 'data-role': 'batch-run' });
      refs.batchRun.addEventListener('click', runBatch);
      refs.batchCancel = button('common.cancel', { 'data-role': 'batch-cancel', hidden: true }, 'x');
      refs.batchCancel.addEventListener('click', cancelBatch);
      refs.progress = el('progress', { class: 'progress', max: '1', value: '0',
        'data-role': 'batch-progress' });
      attrKey(refs.progress, 'aria-label', 'export.batch.progressLabel');
      refs.progressText = el('p', { class: 'field__hint', 'data-role': 'batch-progress-text',
        role: 'status' });
      refs.batchBusy = el('div', { class: 'stack', hidden: true }, [refs.progress, refs.progressText]);
      refs.batchMessageText = el('p', { 'data-role': 'batch-message-text' });
      refs.batchMessage = el('div', { class: 'alert alert--success', role: 'status', hidden: true,
        'data-role': 'batch-message' }, [icon('alert'), refs.batchMessageText]);
      refs.batchReason = el('div', { class: 'alert alert--warning', role: 'status', hidden: true,
        'data-role': 'batch-reason' }, [icon('alert'), tx('p', {}, 'export.batch.unavailable')]);
      refs.batchCard = card(null, 'export.batch.hint', [
        el('div', { class: 'field-row' }, [refs.countField, refs.perPageField]),
        sol.row, refs.plan, refs.batchReason,
        el('div', { class: 'cluster' }, [refs.batchRun, refs.batchCancel]),
        refs.batchBusy, refs.batchMessage
      ]);
      return refs.batchCard;
    }

    function section(key, children) {
      return el('section', { class: 'stack', 'data-section': key.split('.')[2] },
        [tx('h3', { class: 'panel__subtitle' }, key)].concat(children));
    }

    refs.summary = el('p', { class: 'export-summary', 'data-role': 'summary' });
    refs.importHost = el('div', { class: 'stack', 'data-role': 'import-host' });
    const formats = el('div', { class: 'stack', 'data-role': 'formats' }, [
      buildPrintCard(), buildPngCard(), buildSvgCard(), buildJsonCard(), buildTextCard(), buildLinkCard()
    ]);
    formats.style.setProperty('display', 'grid');
    formats.style.setProperty('grid-template-columns', 'repeat(auto-fit, minmax(15rem, 1fr))');
    formats.style.setProperty('gap', 'var(--sg-space-3)');
    container.appendChild(el('div', { class: 'stack', 'data-role': 'export-body' }, [
      refs.summary,
      section('export.section.export', [buildContentRow(), formats]),
      section('export.section.play', [buildPlayCard()]),
      section('export.section.batch', [buildBatch()]),
      section('export.section.import', [refs.importHost])
    ]));

    let importer = null;
    if (SG.importUi && typeof SG.importUi.mount === 'function') {
      importer = SG.importUi.mount(refs.importHost, { app: app });
    } else {
      refs.importHost.appendChild(tx('p', { class: 'field__hint' }, 'export.import.unavailable'));
    }

    // ---- refresh ----------------------------------------------------------------------------

    function refreshBatch() {
      const result = currentResult();
      const count = clampCount(refs.count.value);
      const perPage = Number(refs.perPage.value);
      const layout = buildPrintLayout(count, perPage, refs.batchSolutions.checked);
      const puzzles = t('export.unit.puzzle', { count: count });
      const pages = t('export.unit.page', { count: layout.puzzlePages });
      if (layout.solutionPages > 0) {
        refs.plan.textContent = t('export.batch.plan.solutions', { puzzles: puzzles, pages: pages,
          answers: t('export.unit.page', { count: layout.solutionPages }) });
      } else {
        refs.plan.textContent = t('export.batch.plan', { puzzles: puzzles, pages: pages });
      }
      let reason = false;
      if (result !== null) reason = isImported(result);
      refs.batchReason.hidden = !reason;
      const off = result === null || reason || batch !== null;
      disable(refs.batchRun, off);
      if (batch === null) {
        [refs.count, refs.perPage, refs.batchSolutions].forEach(function (node) { disable(node, off); });
      }
    }

    /** Shows the player link (`info`), or nothing, or `err` instead of it. */
    function showPlay(info, err) {
      refs.playLink.value = info === null ? '' : info.url;
      [refs.playLink, refs.playOpen, refs.playCopy].forEach(function (node) { disable(node, info === null); });
      refs.playLong.hidden = info === null || !info.long;
      if (info !== null && info.long) setKey(refs.playLongText, 'export.playOnline.long', longLinkArgs(info));
      refs.playError.hidden = err === null;
      if (err !== null) {
        const message = SG.i18n && typeof SG.i18n.tError === 'function' ? SG.i18n.tError(err) : String(err);
        refs.playErrorText.textContent = t('export.playOnline.error', { message: message });
      }
    }

    /**
     * Builds the player link of the puzzle on screen. It is made as soon as the puzzle or the language
     * changes, so that the "Play online" click can open the tab at once (a popup needs the click itself); a
     * newer call, or closing the dialog, drops a link that is still being made.
     */
    function refreshPlay(result) {
      const locale = SG.i18n ? SG.i18n.current : 'en';
      if (result !== null && playFor !== null && playFor.result === result && playFor.locale === locale) return;
      const mine = ++playSeq;
      playInfo = null;
      playFor = result === null ? null : { result: result, locale: locale };
      showPlay(null, null);
      refs.playStatus.hidden = result === null;
      if (result === null) return;
      setKey(refs.playStatus, 'export.playOnline.preparing');
      buildPlayLink(result, { locale: locale }).then(function (info) {
        if (mine !== playSeq) return;
        playInfo = info;
        refs.playStatus.hidden = true;
        showPlay(info, null);
      }, function (err) {
        if (mine !== playSeq) return;
        logError(err);
        refs.playStatus.hidden = true;
        showPlay(null, err);
      });
    }

    function refresh() {
      const result = currentResult();
      const has = result !== null;
      if (has) {
        refs.summary.removeAttribute('data-i18n');
        refs.summary.textContent = summaryText(result);
      } else {
        setKey(refs.summary, 'export.summary.none');
      }
      [refs.printButton, refs.printSolution, refs.pngSize, refs.pngButton, refs.svgButton, refs.jsonButton,
        refs.jsonCopy, refs.caption].forEach(function (node) { disable(node, !has); });
      const size = has ? svgSize(boardSvg(result, { caption: prefs.caption, tokens: {} })) : null;
      toArray(refs.pngSize.options).forEach(function (option) {
        const k = Number(option.value);
        option.textContent = size === null ? k + '\u00d7' : t('export.png.sizeOption', {
          scale: k,
          width: formatNumber(Math.round(size.width * k)),
          height: formatNumber(Math.round(size.height * k))
        });
      });
      refs.pngSize.value = String(prefs.scale);
      toArray(refs.perPage.options).forEach(function (option) {
        option.textContent = t('export.batch.perPageOption', { count: Number(option.value) });
      });
      refs.perPage.value = String(prefs.perPage);

      // Text
      let support = null;
      if (has) support = textSupport(result);
      const textOk = support !== null && support.ok;
      const solutionText = prefs.content === 'solution';
      const line = has && textOk ? toText(result, { solution: solutionText }) : null;
      refs.textArea.value = line === null ? '' : line;
      refs.textArea.hidden = !textOk;
      refs.textReason.hidden = !(has && !textOk);
      if (has && !textOk) setKey(refs.textReason.lastChild, support.reason);
      refs.textNote.hidden = !(textOk && support.notes.length > 0);
      if (textOk) refs.textNote.textContent = support.notes.map(function (key) { return t(key); }).join(' ');
      disable(refs.textButton, line === null);
      disable(refs.textCopy, line === null);

      // Link
      const imported = has && isImported(result);
      const url = has && !imported ? shareUrlOf(result) : '';
      refs.link.value = url;
      disable(refs.link, url === '');
      disable(refs.linkCopy, url === '');
      refs.linkReason.hidden = !imported;
      if (imported) setKey(refs.linkReason, 'export.link.unavailable');

      refreshPlay(has ? result : null);

      // The puzzle formats follow the choice "solution" only when a solution is known.
      refreshBatch();
    }

    const stop = [];
    stop.push(app.on('result', function () {
      cancelBatch();
      refresh();
    }));
    stop.push(app.on('locale', refresh));
    cleanups.push(function () { stop.forEach(function (off) { off(); }); });
    refresh();

    return {
      refresh: refresh,
      destroy: function destroy() {
        playSeq++;
        cancelBatch();
        cleanups.splice(0).forEach(function (fn) { fn(); });
        if (importer && typeof importer.destroy === 'function') importer.destroy();
      }
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Entry points
  // ---------------------------------------------------------------------------------------------

  /**
   * Opens the export dialog (or returns the one that is open).
   * @returns {?Object} The modal handle of `SG.app.openModal`; null without a DOM or an app.
   */
  function open() {
    if (appRef === null || typeof document === 'undefined') return null;
    if (openDialog !== null) return openDialog.modal;
    let dialog = null;
    const modal = appRef.openModal({
      titleKey: 'export.title',
      wide: true,
      body: function (container) {
        dialog = createDialog(container);
      },
      onClose: function () {
        if (dialog !== null) dialog.destroy();
        openDialog = null;
      }
    });
    if (modal === null) return null;
    openDialog = { modal: modal, dialog: dialog };
    return modal;
  }

  /** Closes the dialog if it is open (a running batch is cancelled). */
  function close() {
    if (openDialog !== null) openDialog.modal.close();
  }

  /**
   * "Play online" without the dialog (the button of the result panel): makes the link of the puzzle on
   * screen and opens it in a new tab. A very long link and a failure are told in a toast.
   * @returns {Promise<?{url: string}>} The link that was opened; null when there is no puzzle or it failed.
   */
  function playOnline() {
    const result = currentResult();
    if (result === null) return Promise.resolve(null);
    return buildPlayLink(result).then(function (info) {
      openPlayLink(info.url);
      appRef.toast('info', 'export.playOnline.opened');
      if (info.long) appRef.toast('warning', 'export.playOnline.long', longLinkArgs(info));
      return info;
    }, function (err) {
      logError(err);
      const message = SG.i18n && typeof SG.i18n.tError === 'function' ? SG.i18n.tError(err) : String(err);
      appRef.toast('danger', 'export.playOnline.error', { message: message });
      return null;
    });
  }

  /**
   * Connects the module to the application: the Export button opens the dialog. Idempotent.
   * @param {Object} app  `SG.app`.
   */
  function init(app) {
    if (!app || typeof app.on !== 'function') return;
    appRef = app;
    if (initialised) return;
    initialised = true;
    app.on('action', function (payload) {
      if (payload && payload.id === 'export') open();
    });
  }

  SG.exportUi = {
    FORMAT: FORMAT,
    PER_PAGE_CHOICES: PER_PAGE_CHOICES,
    MAX_BATCH: MAX_BATCH,
    PNG_SCALES: PNG_SCALES,
    PLAYER_URL_DEFAULT: PLAYER_URL_DEFAULT,
    LONG_LINK_CHARS: LONG_LINK_CHARS,
    init: init,
    open: open,
    close: close,
    toJson: toJson,
    formatJson: formatJson,
    toText: toText,
    textSupport: textSupport,
    fileName: fileName,
    playerBase: playerBase,
    pagePlayerBase: pagePlayerBase,
    buildPlayLink: buildPlayLink,
    openPlayLink: openPlayLink,
    playOnline: playOnline,
    buildPrintLayout: buildPrintLayout,
    batchSeeds: batchSeeds,
    boardSvg: boardSvg,
    printTokens: printTokens,
    svgSize: svgSize,
    makeFile: makeFile,
    download: download,
    printItems: printItems,
    buildPrintRoot: buildPrintRoot,
    clearPrint: clearPrint,
    createBatch: createBatch,
    summarize: summarize
  };

  // ---------------------------------------------------------------------------------------------
  // Strings of the export dialog and of the printed pages
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'export.title': 'Export, print and import',
      'export.summary': '{variant} \u00b7 {level} \u00b7 {clues}',
      'export.summary.seed': '{variant} \u00b7 {level} \u00b7 {clues} \u00b7 seed {seed}',
      'export.summary.none': 'No puzzle is on screen yet. Generate one, or import a puzzle below.',
      'export.section.export': 'Export the puzzle on screen',
      'export.section.play': 'Play online',
      'export.section.batch': 'Print several puzzles',
      'export.section.import': 'Import a puzzle',
      'export.content.label': 'What to export',
      'export.content.puzzle': 'Puzzle',
      'export.content.solution': 'Solution',
      'export.content.caption': 'Add a caption (variant, level, seed)',
      'export.file.solution': 'solution',
      'export.print.title': 'Print / PDF',
      'export.print.hint': 'Opens the print dialog of your browser; choose \u201cSave as PDF\u201d to make ' +
        'a PDF file. Lines stay sharp because the puzzle is printed as vector graphics.',
      'export.print.solutionPage': 'Add the solution on a separate page',
      'export.print.button': 'Print\u2026',
      'export.print.heading': '{variant} \u00b7 {level}',
      'export.print.meta': 'Seed {seed} \u00b7 {clues}',
      'export.print.puzzleNumber': 'Puzzle {n}',
      'export.print.solutionNumber': 'Solution {n}',
      'export.print.solutionOnly': 'Solution',
      'export.print.solutionsPage': 'Solutions',
      'export.print.alt': 'Sudoku puzzle: {variant}, {level}',
      'export.print.altSolution': 'Solution of the Sudoku puzzle: {variant}, {level}',
      'export.png.title': 'PNG image',
      'export.png.hint': 'A picture of the grid, good for chats and documents.',
      'export.png.size': 'Image size',
      'export.png.sizeOption': '{scale}\u00d7 \u2014 {width} \u00d7 {height} px',
      'export.png.button': 'Download PNG',
      'export.svg.title': 'SVG image',
      'export.svg.hint': 'A vector picture that stays sharp at any size and opens in any browser or editor.',
      'export.svg.button': 'Download SVG',
      'export.json.title': 'JSON file',
      'export.json.hint': 'Everything needed to open this exact puzzle again, here or in another tool.',
      'export.json.button': 'Download JSON',
      'export.json.copy': 'Copy JSON',
      'export.text.title': 'Text',
      'export.text.hint': 'One line, row by row. A dot is an empty cell; values above 9 are written ' +
        'A, B, C\u2026',
      'export.text.label': 'The puzzle as a line of text',
      'export.text.button': 'Download text',
      'export.text.copy': 'Copy text',
      'export.text.note.symbols': 'Only the numbers are saved, not the symbol set (letters, the Wordoku ' +
        'word).',
      'export.text.note.rules': 'The extra rule of this variant (diagonals or windows) is not part of the ' +
        'text: choose it again when you import.',
      'export.text.reason.regions': 'Not available: a Jigsaw puzzle also needs its irregular regions, ' +
        'which a line of digits cannot hold. Use JSON.',
      'export.text.reason.cages': 'Not available: a Killer puzzle also needs its cages and their sums, ' +
        'which a line of digits cannot hold. Use JSON.',
      'export.text.reason.signs': 'Not available: a Greater-Than puzzle also needs its inequality signs, ' +
        'which a line of digits cannot hold. Use JSON.',
      'export.text.reason.grids': 'Not available: overlapping grids need their layout, which a line of ' +
        'digits cannot hold. Use JSON.',
      'export.text.reason.other': 'Not available for this variant: its structure does not fit one line of ' +
        'text. Use JSON.',
      'export.link.title': 'Link',
      'export.link.hint': 'Opens the same puzzle again: the link carries the seed and the options.',
      'export.link.label': 'Share link',
      'export.link.copy': 'Copy link',
      'export.link.unavailable': 'Not available for an imported puzzle: a link rebuilds a puzzle from its ' +
        'seed, which may not give this one. Use JSON.',
      'export.playOnline.hint': 'Opens this puzzle in sudoku-player, a separate page where you solve it ' +
        'with notes, undo, hints and a timer. The puzzle travels inside the link, after the \u201c#\u201d, ' +
        'so it is not sent to any server.',
      'export.playOnline.label': 'Link that opens the puzzle in the player',
      'export.playOnline.open': 'Play online',
      'export.playOnline.copy': 'Copy link',
      'export.playOnline.preparing': 'Preparing the link\u2026',
      'export.playOnline.opened': 'Opening the player in a new tab. If nothing happens, allow pop-ups for this ' +
        'page, or copy the link from Export \u2192 Play online.',
      'export.playOnline.long': 'This link is very long (about {size} kB), and some apps and servers cut ' +
        'long links. If it does not work, download the JSON file and open it in the player instead.',
      'export.playOnline.error': 'The link could not be made: {message}',
      'export.toast.saved': 'Saved {name}.',
      'export.toast.copied': 'Copied.',
      'export.toast.copyFailed': 'Could not copy. Select the text and copy it by hand.',
      'export.toast.failed': 'Could not export: {message}',
      'export.batch.hint': 'Generates new puzzles with the settings of the puzzle on screen and prints ' +
        'them together. The first one is the puzzle on screen, the others use seeds derived from its seed. ' +
        'The puzzle on screen is not replaced.',
      'export.batch.count': 'Number of puzzles',
      'export.batch.perPage': 'Puzzles per page',
      'export.batch.perPageOption': '{count} per page',
      'export.batch.solutions': 'Add pages with the solutions at the end',
      'export.batch.plan': '{puzzles} on {pages}.',
      'export.batch.plan.solutions': '{puzzles} on {pages}, plus {answers} of solutions.',
      'export.batch.run': 'Generate and print',
      'export.batch.progress': 'Generating puzzle {done} of {total}\u2026',
      'export.batch.progressLabel': 'Progress of the batch',
      'export.batch.done': 'Sent {count} puzzles to the print dialog.',
      'export.batch.approximate': 'Sent to the print dialog. {count} of the puzzles are the closest the ' +
        'generator found to the requested level.',
      'export.batch.cancelled': 'The batch was cancelled.',
      'export.batch.failed': 'The batch stopped: {message}',
      'export.batch.unavailable': 'Not available for an imported puzzle: batch printing needs the settings ' +
        'that the generator used to make it.',
      'export.import.unavailable': 'Import is not available in this build.',
      'export.unit.puzzle_one': '{count} puzzle',
      'export.unit.puzzle_other': '{count} puzzles',
      'export.unit.page_one': '{count} page',
      'export.unit.page_other': '{count} pages'
    },
    vi: {
      'export.title': 'Xuất đề, in đề và nhập đề',
      'export.summary': '{variant} \u00b7 mức {level} \u00b7 {clues}',
      'export.summary.seed': '{variant} \u00b7 mức {level} \u00b7 {clues} \u00b7 seed {seed}',
      'export.summary.none': 'Chưa có đề nào trên màn hình. Hãy tạo một đề, hoặc nhập đề ở bên dưới.',
      'export.section.export': 'Xuất đề đang hiển thị',
      'export.section.play': 'Chơi trực tuyến',
      'export.section.batch': 'In nhiều đề cùng lúc',
      'export.section.import': 'Nhập một đề',
      'export.content.label': 'Nội dung cần xuất',
      'export.content.puzzle': 'Đề bài',
      'export.content.solution': 'Lời giải',
      'export.content.caption': 'Thêm chú thích (biến thể, mức độ, seed)',
      'export.file.solution': 'loi-giai',
      'export.print.title': 'In / PDF',
      'export.print.hint': 'Mở hộp thoại in của trình duyệt; chọn \u201cLưu dưới dạng PDF\u201d để tạo tệp ' +
        'PDF. Nét kẻ luôn sắc vì đề được in dưới dạng đồ họa vector.',
      'export.print.solutionPage': 'Thêm lời giải ở một trang riêng',
      'export.print.button': 'In…',
      'export.print.heading': '{variant} \u00b7 mức {level}',
      'export.print.meta': 'Seed: {seed} \u00b7 {clues}',
      'export.print.puzzleNumber': 'Đề {n}',
      'export.print.solutionNumber': 'Lời giải {n}',
      'export.print.solutionOnly': 'Lời giải',
      'export.print.solutionsPage': 'Lời giải',
      'export.print.alt': 'Đề Sudoku: {variant}, {level}',
      'export.print.altSolution': 'Lời giải của đề Sudoku: {variant}, {level}',
      'export.png.title': 'Ảnh PNG',
      'export.png.hint': 'Ảnh chụp lưới số, tiện để gửi qua tin nhắn hoặc chèn vào tài liệu.',
      'export.png.size': 'Kích thước ảnh',
      'export.png.sizeOption': '{scale}\u00d7 \u2014 {width}\u00d7{height} px',
      'export.png.button': 'Tải ảnh PNG',
      'export.svg.title': 'Ảnh SVG',
      'export.svg.hint': 'Ảnh vector luôn sắc nét ở mọi kích thước, mở được bằng mọi trình duyệt hoặc phần ' +
        'mềm đồ họa.',
      'export.svg.button': 'Tải ảnh SVG',
      'export.json.title': 'Tệp JSON',
      'export.json.hint': 'Chứa đủ mọi thứ để mở lại đúng đề này, tại đây hoặc ở một công cụ khác.',
      'export.json.button': 'Tải tệp JSON',
      'export.json.copy': 'Sao chép JSON',
      'export.text.title': 'Văn bản',
      'export.text.hint': 'Một dòng, đi hết hàng này đến hàng khác. Dấu chấm là ô trống; giá trị lớn hơn 9 ' +
        'viết là A, B, C…',
      'export.text.label': 'Đề dưới dạng một dòng văn bản',
      'export.text.button': 'Tải tệp văn bản',
      'export.text.copy': 'Sao chép văn bản',
      'export.text.note.symbols': 'Chỉ lưu các con số, không lưu bộ ký hiệu (chữ cái, từ khóa của Wordoku).',
      'export.text.note.rules': 'Luật bổ sung của biến thể này (đường chéo hoặc ô cửa sổ) không nằm trong ' +
        'văn bản: hãy chọn lại khi nhập đề.',
      'export.text.reason.regions': 'Không dùng được: đề Ghép hình còn cần các vùng không đều, mà một ' +
        'dòng chữ số không chứa nổi. Hãy dùng JSON.',
      'export.text.reason.cages': 'Không dùng được: đề Sát thủ còn cần các nhóm ô cùng tổng của chúng, ' +
        'mà một dòng chữ số không chứa nổi. Hãy dùng JSON.',
      'export.text.reason.signs': 'Không dùng được: đề So sánh còn cần các dấu lớn hơn, nhỏ hơn, mà ' +
        'một dòng chữ số không chứa nổi. Hãy dùng JSON.',
      'export.text.reason.grids': 'Không dùng được: các lưới chồng lên nhau cần có bố cục, mà một dòng ' +
        'chữ số không chứa nổi. Hãy dùng JSON.',
      'export.text.reason.other': 'Không dùng được với biến thể này: cấu trúc của nó không vừa trong ' +
        'một dòng văn bản. Hãy dùng JSON.',
      'export.link.title': 'Liên kết',
      'export.link.hint': 'Mở lại đúng đề này: liên kết mang theo seed và các tùy chọn.',
      'export.link.label': 'Liên kết chia sẻ',
      'export.link.copy': 'Sao chép liên kết',
      'export.link.unavailable': 'Không dùng được cho đề nhập vào: liên kết dựng lại đề từ seed, nên có ' +
        'thể không ra đúng đề này. Hãy dùng JSON.',
      'export.playOnline.hint': 'Mở đề này trong sudoku-player, một trang riêng để bạn giải đề với ghi chú, ' +
        'hoàn tác, gợi ý và đồng hồ. Đề nằm ngay trong liên kết, sau dấu \u201c#\u201d, nên không được ' +
        'gửi đến máy chủ nào.',
      'export.playOnline.label': 'Liên kết mở đề trong trình chơi',
      'export.playOnline.open': 'Chơi trực tuyến',
      'export.playOnline.copy': 'Sao chép liên kết',
      'export.playOnline.preparing': 'Đang tạo liên kết\u2026',
      'export.playOnline.opened': 'Đang mở trình chơi trong thẻ mới. Nếu không thấy gì, hãy cho phép cửa sổ ' +
        'bật lên của trang này, hoặc sao chép liên kết trong Xuất đề \u2192 Chơi trực tuyến.',
      'export.playOnline.long': 'Liên kết này rất dài (khoảng {size} kB), và một số ứng dụng, máy chủ sẽ ' +
        'cắt bớt liên kết dài. Nếu không mở được, hãy tải tệp JSON và mở nó trong trình chơi.',
      'export.playOnline.error': 'Không tạo được liên kết: {message}',
      'export.toast.saved': 'Đã lưu {name}.',
      'export.toast.copied': 'Đã sao chép.',
      'export.toast.copyFailed': 'Không sao chép được. Hãy bôi đen văn bản và sao chép thủ công.',
      'export.toast.failed': 'Không xuất được: {message}',
      'export.batch.hint': 'Tạo thêm các đề mới với thiết lập của đề đang hiển thị rồi in chung một ' +
        'lượt. Đề đầu tiên chính là đề trên màn hình, các đề còn lại dùng seed suy ra từ seed của nó. Đề ' +
        'trên màn hình không bị thay thế.',
      'export.batch.count': 'Số lượng đề',
      'export.batch.perPage': 'Số đề mỗi trang',
      'export.batch.perPageOption': '{count} đề mỗi trang',
      'export.batch.solutions': 'Thêm các trang lời giải ở cuối',
      'export.batch.plan': '{puzzles} trên {pages}.',
      'export.batch.plan.solutions': '{puzzles} trên {pages}, cộng thêm {answers} lời giải.',
      'export.batch.run': 'Tạo và in',
      'export.batch.progress': 'Đang tạo đề {done} trên {total}…',
      'export.batch.progressLabel': 'Tiến độ của lượt in hàng loạt',
      'export.batch.done': 'Đã gửi {count} đề tới hộp thoại in.',
      'export.batch.approximate': 'Đã gửi tới hộp thoại in. Có {count} đề là đề gần nhất mà bộ tạo tìm ' +
        'được so với mức độ đã chọn.',
      'export.batch.cancelled': 'Đã hủy lượt in hàng loạt.',
      'export.batch.failed': 'Lượt in hàng loạt đã dừng: {message}',
      'export.batch.unavailable': 'Không dùng được cho đề nhập vào: in hàng loạt cần đúng thiết lập mà ' +
        'bộ tạo đã dùng để tạo ra đề.',
      'export.import.unavailable': 'Bản này không có chức năng nhập đề.',
      'export.unit.puzzle_one': '{count} đề',
      'export.unit.puzzle_other': '{count} đề',
      'export.unit.page_one': '{count} trang',
      'export.unit.page_other': '{count} trang'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
