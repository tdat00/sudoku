/**
 * Print / PDF and text export (task T-7.1; design.md sections 10.6 and 14.1) and the hand-off of a puzzle to
 * the sudoku-player web app (task T-7.8; design.md section 10.9): `SG.exportUi`. The Print button of the page
 * opens one dialog: the saved puzzles (`SG.history`) to choose from, 1, 2 or 4 puzzles per page and an
 * optional solution page for each (the puzzle on screen is ticked at first; a puzzle that is not on screen
 * is generated again from its saved settings). The "Export" button opens a dialog with the same list and
 * the readable text of the ticked puzzles, to copy. The "Play" button of the page calls `playOnline()`,
 * which opens every puzzle of the list in the player in a new tab (the one on screen is shown first).
 *
 * Two layers, so that what matters runs in Node:
 *  - PURE (no DOM): `toJson`, `buildPrintLayout`, `boardSvg`, `printTokens`, `buildPlayLink`,
 *    `buildExportText`.
 *  - DOM: the dialogs, the print path and the page's `<meta name="sg-player-url">` (`pagePlayerBase`).
 *
 * ---------------------------------------------------------------------------------------------------------
 * PUBLIC API (`SG.exportUi`)
 * ---------------------------------------------------------------------------------------------------------
 *   init(app)            Idempotent. Listens to the 'action' event of `SG.app`: `{ id: 'export' }` (the Print
 *                        button) opens the dialog, `{ id: 'exportCode' }` (the Export button) calls
 *                        `openText()`, `{ id: 'play' }` (the Play button) calls `playOnline()`.
 *   open()               Opens the dialog (or focuses the open one). Returns the modal handle, null without a
 *                        DOM or an app.
 *   openText()           Opens the Export dialog: the list of saved puzzles and, in a read-only box, the text
 *                        of the ticked ones with a Copy button. Null without a DOM or an app.
 *   buildExportText(items)  -> string. The readable text of puzzles, `items` = `[{ result }]`. Each puzzle is
 *                        a header line `#number,variant,level,seed` (names in the language of the page, `x`
 *                        for the times sign) and its grid, one board row per line: a digit is a clue (10 is
 *                        `A`, 11 `B`, ...), `.` an empty cell and `_` a place of the canvas without a cell
 *                        (Samurai and the like). Puzzles are separated by a blank line. Only the clues are
 *                        written, plus, for Jigsaw, Killer, Greater-Than and Wordoku, the structure lines
 *                        of `structureLines` that Sudoku Player needs to rebuild the board.
 *   gridLines(result)    -> string[]. The grid lines of one puzzle, as above.
 *   structureLines(result) -> string[]. `regions:`, `cages:`, `signs:`, or `letters:` + `word-line:` of a
 *                        puzzle whose board the clues do not fix; [] for every other variant.
 *   close() / closeText()  Close the dialogs.
 *   toJson(result, ctx?) The JSON document of design.md 14.1 as plain data: `format`, `generatedAt`,
 *                        `variantId`, `variantOptions`, `difficulty`, `seed`, `symmetry`, `symbolMode`,
 *                        `digits`, `cellCount`, `layout`, `givens`, `solution`, `cages`, `inequalities`,
 *                        `stats`, plus the additive fields `locale`, `labels` (the names of the variant, the
 *                        level and the hardest technique in the language of the export, rule L6),
 *                        `symbols`, `wordoku` (Wordoku only), `digOrder`, `maxAttempts`, `warnings` and
 *                        `model` (the plain-data ModelSpec of `SG.model.create`, so that the player rebuilds
 *                        the board without any variant code). It is the document of the player link.
 *                        `ctx`: `{ generatedAt?: string, locale?: string }`.
 *   buildPlayLink(result, opts?) -> Promise<{ url, token, base, length, long }>. The link that opens the
 *                        puzzle in the player: `SG.exchange.playerUrl(base, SG.exchange.encode(toJson(...)))`.
 *                        `opts`: `{ base?, generatedAt?, locale?, compress? }`; `base` defaults to
 *                        `playerBase()`. Rejects with the `exchange.*` errors (`exchange.invalidUrl` for a
 *                        bad `base`). `long` is true above `LONG_LINK_CHARS` characters.
 *   buildPlayBundle(results, opts?) -> Promise<{ url, token, base, count, active, length, long }>. The link
 *                        that opens several puzzles in the player: the text of `buildExportText(results)` as
 *                        one compressed base64url text token (`SG.exchange.encodeText`), then `&active=<n>`
 *                        (the 1-based number of the puzzle to show first). `opts`: `{ base?, active?
 *                        (0-based index), compress? }`. Rejects like `buildPlayLink`.
 *   playerBase(content?) The player's address: `content` (the `content` of the page's
 *                        `<meta name="sg-player-url">`) when it is not blank, else `PLAYER_URL_DEFAULT`.
 *                        `pagePlayerBase()` reads that tag from the page.
 *   openPlayLink(url)    `window.open(url, '_blank', 'noopener')`: the player opens in a new tab.
 *   playOnline()         -> Promise. The Play button: builds the link of every puzzle of the saved list (and
 *                        the one on screen) with the one on screen active, opens it and tells a failure or a
 *                        very long link in a toast. Puzzles that are not at hand are generated again first
 *                        in a small dialog that ends with an "Open the player" button.
 *   buildPrintLayout(count, perPage, includeSolutions)  The page plan of a print job.
 *   boardSvg(result, opts?)  A standalone SVG document of the puzzle (givens) or its solution, drawn from the
 *                        result itself, whatever the replay of the board shows right now.
 *   printItems(items, opts?) -> Promise<layout>. Builds `#print-root`, waits for its pictures and calls
 *                        `window.print()` (`opts.print` replaces it). `items` = `[{ result, number }]`.
 *   buildPrintRoot / clearPrint  The print container itself (css/print.css hides everything else).
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
  const PRINT_ROOT_ID = 'print-root';
  const IMAGE_WAIT_MS = 4000;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  /** Where the sudoku-player web app lives, unless the page says otherwise (`<meta name="sg-player-url">`). */
  const PLAYER_URL_DEFAULT = 'https://tdat00.github.io/sudoku-player/';
  const PLAYER_META_NAME = 'sg-player-url';
  /** A player link longer than this many characters may be cut by chat apps and servers. */
  const LONG_LINK_CHARS = 100000;

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

  /**
   * What the headers and captions say about a result.
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
    ['rawScore', 'hardestGroup', 'confidence', 'solved', 'empties', 'ratingVersion'].forEach(function (key) {
      if (rating[key] !== undefined) out[key] = rating[key];
    });
    return out;
  }

  /**
   * The JSON document of a puzzle (design.md section 14.1), as plain data. Everything needed to rebuild the
   * puzzle is in it; it is the document of the player link (`buildPlayLink`).
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
   * @param {Object} result  A `PuzzleResult` (only the document matters).
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
   * The link that opens several puzzles in the player: their readable text (`buildExportText`, which the
   * player imports) as one compressed base64url token in the fragment of the player's address, and the
   * number of the puzzle to show first.
   * @param {Object[]} results  `PuzzleResult`s, in the order of the list.
   * @param {{base?: string, active?: number, compress?: boolean}} [options]  `active`: the index (0-based) of
   *        the puzzle to show first (default 0); `base`: the player's address (default `pagePlayerBase()`);
   *        `compress: false` forces the plain token.
   * @returns {Promise<{url: string, token: string, base: string, count: number, active: number,
   *   length: number, long: boolean}>} Rejects with the `exchange.*` errors.
   */
  function buildPlayBundle(results, options) {
    const o = options || {};
    return Promise.resolve().then(function () {
      if (!Array.isArray(results) || results.length === 0) throw new TypeError('buildPlayBundle: no puzzle');
      const base = playerBase(o.base === undefined ? pagePlayerBase() : o.base);
      const active = Number.isInteger(o.active) && o.active >= 0 && o.active < results.length ? o.active : 0;
      const text = buildExportText(results.map(function (result) { return { result: result }; }));
      return SG.exchange.encodeText(text, { compress: o.compress }).then(function (token) {
        const url = SG.exchange.playerUrl(base, token, { active: active + 1 });
        return { url: url, token: token, base: base, count: results.length, active: active,
          length: url.length, long: url.length > LONG_LINK_CHARS };
      });
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Export as readable text
  // ---------------------------------------------------------------------------------------------

  const EMPTY_CELL = '.';
  const OFF_BOARD = '_';

  /** One character for a value: a digit up to 9, then A, B, C... (10 is A). An empty cell is a dot. */
  function cellChar(value) {
    if (!(value > 0)) return EMPTY_CELL;
    return value <= 9 ? String(value) : String.fromCharCode(55 + value);
  }

  /** A name for the header line of a puzzle: plain letters (`x` for the times sign) and no commas. */
  function plainName(text) {
    return String(text).replace(/\u00d7/g, 'x').replace(/[,\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * The grid of a puzzle as text lines, one board row per line: a digit is a clue, `.` an empty cell and `_`
   * a place of the canvas that belongs to no cell (the corners between the grids of Samurai and the like).
   * @param {Object} result  A `PuzzleResult`.
   * @returns {string[]}
   */
  function gridLines(result) {
    const model = result.model;
    const layout = model.layout;
    const canvas = [];
    for (let r = 0; r < layout.rows; r++) canvas.push(new Array(layout.cols).fill(OFF_BOARD));
    for (let i = 0; i < model.cellCount; i++) canvas[layout.cellRow[i]][layout.cellCol[i]] = cellChar(result.givens[i]);
    return canvas.map(function (row) { return row.join(''); });
  }

  /** `r3c7`: the cell at row 3, column 7 of the canvas (1-based), the way the structure lines name a cell. */
  function cellToken(layout, cell) {
    return 'r' + (layout.cellRow[cell] + 1) + 'c' + (layout.cellCol[cell] + 1);
  }

  /**
   * The lines under the grid of a puzzle whose board the clues do not fix, so that the player can rebuild it
   * (a `key: value` line each; no grid row has a colon):
   *   regions: 111222333 111222333 ...   Jigsaw: the region (1-9) of every cell, one group per board row
   *   cages: 13=r1c1,r1c2; 7=r1c3,r2c3   Killer: `sum=cells` of every cage, in the order of the model
   *   signs: r1c1<r1c2; r2c2<r2c1        Greater-Than: the value of the first cell is less than the second
   *   letters: A D F G L N O R Y         Wordoku: the letter of the values 1..9
   *   word-line: diagonal | row 3 | column 5   Wordoku: where the key word sits (not the word itself)
   * Every other variant is fixed by its name and the grid alone, so it gets no line.
   * @param {Object} result  A `PuzzleResult`.
   * @returns {string[]}
   */
  function structureLines(result) {
    const model = result.model;
    const layout = model.layout;
    const lines = [];
    if (model.variantId === 'jigsaw9') {
      const groups = [];
      for (let r = 0; r < layout.rows; r++) {
        let group = '';
        for (let cell = r * layout.cols; cell < (r + 1) * layout.cols; cell++) group += String(layout.cellRegion[cell] + 1);
        groups.push(group);
      }
      lines.push('regions: ' + groups.join(' '));
    } else if (model.variantId === 'killer' && model.cages.length > 0) {
      lines.push('cages: ' + model.cages.map(function (cage) {
        return cage.sum + '=' + Array.from(cage.cells).map(function (cell) { return cellToken(layout, cell); }).join(',');
      }).join('; '));
    } else if (model.variantId === 'greaterThan' && model.inequalities.length > 0) {
      lines.push('signs: ' + model.inequalities.map(function (q) {
        return cellToken(layout, q.a) + '<' + cellToken(layout, q.b);
      }).join('; '));
    } else if (model.variantId === 'wordoku' && SG.wordoku && typeof SG.wordoku.describe === 'function') {
      const word = SG.wordoku.describe(model);
      if (word !== null) {
        lines.push('letters: ' + model.symbols.labels.join(' '));
        lines.push('word-line: ' + (word.placement === 'diagonal' ? 'diagonal' : word.placement + ' ' + word.line));
      }
    }
    return lines;
  }

  /**
   * The readable text of puzzles. Every puzzle starts with a header line `#number,variant,level,seed` (the
   * names in the language of the page, the level reached) and is followed by its grid, one row per line, and,
   * for the variants whose board is not fixed by the grid (Jigsaw, Killer, Greater-Than, Wordoku), the
   * structure lines of `structureLines`; puzzles are separated by a blank line. The seed rebuilds the rest.
   * @param {Array<{result: Object}>} items  The puzzles, in the order they are written.
   * @returns {string} '' for no puzzle, else the text with a final line break.
   */
  function buildExportText(items) {
    const blocks = items.map(function (item, i) {
      const s = summarize(item.result);
      const header = ['#' + (i + 1), plainName(s.variantName), plainName(s.levelName), s.seed].join(',');
      return [header].concat(gridLines(item.result), structureLines(item.result)).join('\n');
    });
    return blocks.length === 0 ? '' : blocks.join('\n\n') + '\n';
  }

  // ---------------------------------------------------------------------------------------------
  // Play online: opening the link
  // ---------------------------------------------------------------------------------------------

  /**
   * Opens a player link in a new tab; the new page gets no handle on this one.
   * @param {string} url
   */
  function openPlayLink(url) {
    if (typeof root.open === 'function') root.open(url, '_blank', 'noopener');
  }

  /** The long-link notice, as arguments of `export.playOnline.long`. */
  function longLinkArgs(info) {
    return { size: formatNumber(Math.round(info.length / 1000)) };
  }

  // ---------------------------------------------------------------------------------------------
  // Print layout
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

  // ---------------------------------------------------------------------------------------------
  // SVG of a puzzle
  // ---------------------------------------------------------------------------------------------

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
    return SG.boardView.exportSvg(model, { values: givens, states: null, givens: givens,
      solution: solution }, markup, tokens);
  }

  function svgDataUrl(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
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

  /**
   * Settings that stay while the page is open: the solution pages and the puzzles per page of the Print
   * dialog, and which puzzles each dialog had ticked (`null`: never chosen yet, so the puzzle on screen is
   * ticked).
   */
  const prefs = { solutionPage: true, perPage: 4, selected: null };
  const textPrefs = { selected: null };

  /** Puzzles per page that the dialog offers (`buildPrintLayout` also knows 6). */
  const DIALOG_PER_PAGE = Object.freeze([1, 2, 4]);

  /** Thrown into the chain of a job that the user cancelled. */
  const ABORTED = { aborted: true };

  /** Puzzles that were generated again for a dialog, by id: the next dialog does not need to wait. */
  const resultCache = new Map();
  const RESULT_CACHE_MAX = 40;

  let appRef = null;
  let initialised = false;
  let openDialog = null;
  let openTextDialog = null;

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

  /** The text of one puzzle in the list: variant, level, clues and, when it has one, the seed. */
  function choiceText(choice) {
    const e = choice.entry;
    const args = { variant: nameOf('variant.', e.variantId), level: nameOf('difficulty.', e.level),
      clues: t('unit.clue', { count: e.clues }), seed: e.seed };
    return t(e.seed === '' ? 'export.summary' : 'export.summary.seed', args);
  }

  /**
   * The puzzles the dialog offers, in the order of the saved list (newest first): `{ id, entry, result }`,
   * where `result` is set for the puzzle on screen (no need to generate it again). A puzzle on screen that is
   * not in the list (an imported one) comes first.
   * @returns {{choices: Object[], currentId: ?string}}
   */
  function pickChoices() {
    const history = SG.history;
    const list = history && typeof history.list === 'function' ? history.list() : [];
    const result = currentResult();
    let currentId = null;
    let own = null;
    if (result !== null) {
      own = history && typeof history.entryOf === 'function' ? history.entryOf(result) : null;
      if (own === null) {
        own = { id: 'screen', variantId: result.model.variantId,
          level: result.rating ? result.rating.level : '', clues: countClues(result.givens), seed: '' };
      }
      currentId = own.id;
    }
    const choices = list.map(function (entry) {
      return { id: entry.id, entry: entry, result: entry.id === currentId ? result : null };
    });
    if (own !== null && !choices.some(function (c) { return c.id === currentId; })) {
      choices.unshift({ id: currentId, entry: own, result: result });
    }
    return { choices: choices, currentId: currentId };
  }

  /**
   * The list of saved puzzles to choose from, shared by the Print and the Export dialogs: a count, Select
   * all / Select none and one tick box per puzzle. What was ticked is remembered in `memory.selected`.
   * @param {{selected: ?string[]}} memory
   * @param {function(): void} onChange  Called after the user changed what is ticked.
   * @returns {{element: Element, choices: Object[], picked: function(): Object[],
   *   setBusy: function(boolean): void, refresh: function(): void}}
   */
  function createPicker(memory, onChange) {
    const offered = pickChoices();
    const selected = new Set();
    const refs = {};
    let busy = false;

    const ids = new Set(offered.choices.map(function (c) { return c.id; }));
    if (memory.selected !== null) {
      // What was ticked last time, for the puzzles that are still there; if none is left, the puzzle on screen.
      memory.selected.forEach(function (id) { if (ids.has(id)) selected.add(id); });
    }
    if (memory.selected === null || (selected.size === 0 && memory.selected.length > 0)) {
      offered.choices.forEach(function (c) { if (c.id === offered.currentId) selected.add(c.id); });
    }

    function remember() {
      memory.selected = Array.from(selected);
    }

    function picked() {
      return offered.choices.filter(function (c) { return selected.has(c.id); });
    }

    function update() {
      const total = offered.choices.length;
      const count = picked().length;
      setKey(refs.count, 'export.pick.count', { selected: count, total: total });
      refs.empty.hidden = total > 0;
      refs.list.hidden = total === 0;
      refs.selectAll.disabled = busy || total === 0;
      refs.selectNone.disabled = busy || count === 0;
      refs.list.querySelectorAll('input').forEach(function (input) { input.disabled = busy; });
    }

    function render() {
      refs.list.textContent = '';
      offered.choices.forEach(function (choice) {
        const input = el('input', { type: 'checkbox', 'data-role': 'pick', 'data-id': choice.id });
        input.checked = selected.has(choice.id);
        input.disabled = busy;
        input.addEventListener('change', function () {
          if (input.checked) selected.add(choice.id);
          else selected.delete(choice.id);
          remember();
          update();
          onChange();
        });
        refs.list.appendChild(el('li', { class: 'print-list__item' }, [
          el('label', { class: 'print-pick' }, [input, el('span', { text: choiceText(choice) })])
        ]));
      });
    }

    function setAll(on) {
      selected.clear();
      if (on) offered.choices.forEach(function (c) { selected.add(c.id); });
      remember();
      render();
      update();
      onChange();
    }

    refs.count = el('p', { class: 'print-dialog__count', 'data-role': 'count' });
    refs.selectAll = button('export.pick.selectAll', { class: 'btn btn--ghost btn--sm',
      'data-role': 'select-all' });
    refs.selectNone = button('export.pick.selectNone', { class: 'btn btn--ghost btn--sm',
      'data-role': 'select-none' });
    refs.selectAll.addEventListener('click', function () { setAll(true); });
    refs.selectNone.addEventListener('click', function () { setAll(false); });
    refs.list = el('ul', { class: 'print-list', 'data-role': 'list' });
    refs.empty = tx('p', { class: 'empty-hint', 'data-role': 'empty' }, 'export.pick.empty');
    const element = el('fieldset', { class: 'field-group' }, [
      tx('legend', { class: 'field-group__legend' }, 'export.pick.title'),
      el('div', { class: 'print-dialog__bar' }, [refs.count,
        el('div', { class: 'cluster' }, [refs.selectAll, refs.selectNone])]),
      refs.empty,
      refs.list
    ]);
    render();
    update();

    return {
      element: element,
      choices: offered.choices,
      picked: picked,
      setBusy: function setBusy(flag) {
        busy = flag;
        update();
      },
      refresh: function refresh() {
        render();
        update();
      }
    };
  }

  /**
   * Gets the puzzles of some choices, in order: the puzzle on screen as it is, the others generated again
   * from their saved settings (the same seed gives the same puzzle) and remembered in `resultCache`.
   * @param {Object[]} picks  Choices of `pickChoices`.
   * @param {{progress?: function(number, number): void}} [hooks]  `progress(k, n)`: puzzle k of n is being
   *        generated.
   * @returns {{promise: Promise<Object[]>, cancel: function(): void}} The promise rejects with `ABORTED`
   *          after `cancel()`.
   */
  function startFetch(picks, hooks) {
    const h = hooks || {};
    const results = [];
    let client = null;
    let cancelled = false;

    function release() {
      if (client !== null && typeof client.dispose === 'function') client.dispose();
      client = null;
    }

    function generate(choice) {
      const config = Object.assign(
        SG.store.toConfig(Object.assign(SG.store.defaults(), SG.history.overridesOf(choice.entry))),
        { trace: 'off' });
      if (client === null && SG.workerClient && typeof SG.workerClient.create === 'function') {
        try {
          client = SG.workerClient.create();
        } catch (err) {
          client = null;
        }
      }
      if (client !== null) return client.generate(config, null);
      return new Promise(function (resolve) { root.setTimeout(resolve, 0); }).then(function () {
        return SG.pipeline.run(config, null);
      });
    }

    function one(choice, k) {
      if (choice.result !== null) return Promise.resolve(choice.result);
      if (resultCache.has(choice.id)) return Promise.resolve(resultCache.get(choice.id));
      if (typeof h.progress === 'function') h.progress(k, picks.length);
      return generate(choice).then(function (result) {
        resultCache.set(choice.id, result);
        if (resultCache.size > RESULT_CACHE_MAX) resultCache.delete(resultCache.keys().next().value);
        return result;
      });
    }

    function next(i) {
      if (cancelled) return Promise.reject(ABORTED);
      if (i === picks.length) return Promise.resolve(results);
      return one(picks[i], i + 1).then(function (result) {
        results.push(result);
        return next(i + 1);
      });
    }

    const promise = next(0).then(function (list) {
      release();
      return list;
    }, function (err) {
      release();
      throw cancelled ? ABORTED : err;
    });
    return { promise: promise, cancel: function cancel() {
      cancelled = true;
      release();
    } };
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

  /** A status line (`role="status"`) that is set with a translated text and emptied again. */
  function statusLine() {
    const node = el('p', { class: 'print-dialog__status', 'data-role': 'status', role: 'status',
      'aria-live': 'polite' });
    return {
      node: node,
      preparing: function preparing(done, total) {
        setKey(node, 'export.pick.preparing', { done: done, total: total });
      },
      clear: function clear() {
        node.textContent = '';
        node.removeAttribute('data-i18n');
        node.removeAttribute('data-i18n-args');
      }
    };
  }

  function failureToast(err) {
    logError(err);
    appRef.toast('danger', 'export.toast.failed', { message: err && err.message ? err.message : String(err) });
  }

  /**
   * Builds the Print dialog: how many puzzles go on a page, the solutions switch and the list of saved
   * puzzles to choose from (body), and Cancel / Print (footer). The puzzles that are not on screen are
   * generated again before the print dialog of the browser opens.
   * @param {Element} container  `modal.body`.
   * @returns {{mountFooter: function(Element): void, refresh: function(): void, destroy: function(): void}}
   */
  function createDialog(container) {
    const app = appRef;
    const refs = {};
    let busy = false;
    let closed = false;
    let job = null;

    const picker = createPicker(prefs, updateState);
    const status = statusLine();

    function updateState() {
      picker.setBusy(busy);
      refs.perPage.forEach(function (input) { input.disabled = busy; });
      refs.printSolution.disabled = busy;
      if (refs.printButton) refs.printButton.disabled = busy || picker.picked().length === 0;
    }

    /** "Puzzles per page": a label and one button for each choice (1, 2 or 4), no frame. */
    function perPageField() {
      const labelId = nextId('export-per-page');
      const group = el('div', { class: 'choice-group', role: 'radiogroup', 'aria-labelledby': labelId });
      const inputs = [];
      DIALOG_PER_PAGE.forEach(function (n) {
        const input = el('input', { type: 'radio', name: 'sg-print-per-page', value: n,
          'data-role': 'per-page' });
        input.checked = prefs.perPage === n;
        input.addEventListener('change', function () { if (input.checked) prefs.perPage = n; });
        inputs.push(input);
        group.appendChild(el('label', { class: 'choice' }, [input,
          el('span', { class: 'choice__text', text: String(n) })]));
      });
      return { inputs: inputs, row: el('div', { class: 'print-dialog__row' }, [
        tx('span', { class: 'field__label', id: labelId }, 'export.print.perPage'),
        group
      ]) };
    }

    function printSelected() {
      const picks = picker.picked();
      if (busy || picks.length === 0) return;
      busy = true;
      updateState();
      job = startFetch(picks, { progress: status.preparing });
      job.promise.then(function (results) {
        status.clear();
        const items = results.map(function (result, i) {
          return { result: result, number: results.length > 1 ? i + 1 : null,
            symbolMode: picks[i].result !== null ? screenSymbolMode(result) : null };
        });
        return printItems(items, { perPage: prefs.perPage, solutions: prefs.solutionPage &&
          items.some(function (item) { return hasSolution(item.result.solution); }) });
      }).then(function () {
        busy = false;
        close();
      }, function (err) {
        busy = false;
        if (err === ABORTED || closed) return;
        status.clear();
        failureToast(err);
        updateState();
      });
    }

    const sol = switchRow('export.print.solutionPage', 'print-solution', prefs.solutionPage, function (on) {
      prefs.solutionPage = on;
    });
    refs.printSolution = sol.input;
    const perPage = perPageField();
    refs.perPage = perPage.inputs;
    // The settings come first and the list of puzzles, which grows with every generation, comes last.
    container.appendChild(el('div', { class: 'print-dialog', 'data-role': 'export-body' }, [
      perPage.row,
      sol.row,
      tx('p', { class: 'field__hint' }, 'export.print.hint'),
      picker.element,
      status.node
    ]));

    function mountFooter(footer) {
      const cancel = button('common.cancel', { 'data-role': 'cancel' });
      cancel.addEventListener('click', close);
      refs.printButton = button('export.print.button', { class: 'btn btn--primary', 'data-role': 'print' },
        'print');
      refs.printButton.addEventListener('click', printSelected);
      footer.appendChild(cancel);
      footer.appendChild(refs.printButton);
      updateState();
    }

    function refresh() {
      picker.refresh();
      updateState();
    }

    const stop = [app.on('locale', refresh)];
    updateState();

    return {
      mountFooter: mountFooter,
      refresh: refresh,
      destroy: function destroy() {
        closed = true;
        stop.forEach(function (off) { off(); });
        if (job !== null) job.cancel();
      }
    };
  }

  /**
   * Builds the Export dialog: a read-only box with the text of the puzzles that are ticked in the list below
   * it (it follows the list), and Close / Copy text (footer).
   * @param {Element} container  `modal.body`.
   * @returns {{mountFooter: function(Element): void, refresh: function(): void, destroy: function(): void}}
   */
  function createTextDialog(container) {
    const app = appRef;
    const refs = {};
    let closed = false;
    let job = null;
    let text = '';

    const picker = createPicker(textPrefs, rebuild);
    const status = statusLine();

    function updateCopy() {
      if (refs.copyButton) refs.copyButton.disabled = text === '';
    }

    /** Writes the text of what is ticked; puzzles that have to be generated again are waited for. */
    function rebuild() {
      if (job !== null) job.cancel();
      job = null;
      text = '';
      refs.box.value = '';
      status.clear();
      updateCopy();
      const picks = picker.picked();
      if (picks.length === 0) return;
      const mine = startFetch(picks, { progress: status.preparing });
      job = mine;
      mine.promise.then(function (results) {
        if (job !== mine || closed) return;
        status.clear();
        text = buildExportText(results.map(function (result) { return { result: result }; }));
        refs.box.value = text;
        updateCopy();
      }, function (err) {
        if (err === ABORTED || job !== mine || closed) return;
        status.clear();
        failureToast(err);
      });
    }

    function copy() {
      const write = SG.controls && typeof SG.controls.copyText === 'function' ? SG.controls.copyText : null;
      Promise.resolve(write ? write(text) : false).then(function (ok) {
        app.toast(ok ? 'success' : 'danger', ok ? 'export.text.copied' : 'export.text.copyFailed');
      });
    }

    refs.box = el('textarea', { class: 'textarea mono', readonly: true, rows: 10, wrap: 'off',
      spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'data-role': 'text' });
    refs.box.addEventListener('focus', function () { refs.box.select(); });
    function labelBox() {
      refs.box.setAttribute('aria-label', t('export.text.label'));
      refs.box.setAttribute('placeholder', t('export.text.placeholder'));
    }
    labelBox();
    container.appendChild(el('div', { class: 'print-dialog', 'data-role': 'export-body' }, [
      tx('p', { class: 'field__hint' }, 'export.text.intro'),
      refs.box,
      picker.element,
      status.node
    ]));

    function mountFooter(footer) {
      const cancel = button('common.close', { 'data-role': 'cancel' });
      cancel.addEventListener('click', closeText);
      refs.copyButton = button('export.text.copy', { class: 'btn btn--primary', 'data-role': 'copy',
        disabled: true }, 'copy');
      refs.copyButton.addEventListener('click', copy);
      footer.appendChild(cancel);
      footer.appendChild(refs.copyButton);
      updateCopy();
    }

    // The names in the text follow the language of the page.
    function refresh() {
      picker.refresh();
      labelBox();
      rebuild();
    }

    const stop = [app.on('locale', refresh)];
    rebuild();

    return {
      mountFooter: mountFooter,
      refresh: refresh,
      destroy: function destroy() {
        closed = true;
        stop.forEach(function (off) { off(); });
        if (job !== null) job.cancel();
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
      body: function (container) {
        dialog = createDialog(container);
      },
      footer: function (container) {
        if (dialog !== null) dialog.mountFooter(container);
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

  /** Closes the dialog if it is open. */
  function close() {
    if (openDialog !== null) openDialog.modal.close();
  }

  /** Opens the link of a bundle in a new tab and tells so (and about a very long link) in toasts. */
  function openedPlayer(info) {
    openPlayLink(info.url);
    appRef.toast('info', 'export.playOnline.opened');
    if (info.long) appRef.toast('warning', 'export.playOnline.long', longLinkArgs(info));
  }

  function playFailed(err) {
    logError(err);
    const message = SG.i18n && typeof SG.i18n.tError === 'function' ? SG.i18n.tError(err) : String(err);
    appRef.toast('danger', 'export.playOnline.error', { message: message });
    return null;
  }

  /**
   * The Play button, when some puzzles of the list have to be generated again first: a dialog that tells the
   * progress and ends with an "Open the player" button (a tab opened after a long wait would be taken for a
   * pop-up, a click opens it).
   * @returns {Promise<?Object>} The bundle that was opened, null when it was cancelled or failed.
   */
  function playAfterPreparing(choices, active) {
    return new Promise(function (resolve) {
      const refs = {};
      let job = null;
      let info = null;
      let finished = false;
      let modal = null;

      function finish(value) {
        if (finished) return;
        finished = true;
        resolve(value);
      }

      function launch() {
        if (info === null) return;
        openedPlayer(info);
        finish(info);
        modal.close();
      }

      modal = appRef.openModal({
        titleKey: 'export.playOnline.title',
        body: function (container) {
          refs.status = el('p', { class: 'print-dialog__status', 'data-role': 'status', role: 'status',
            'aria-live': 'polite' });
          container.appendChild(el('div', { class: 'print-dialog' }, [
            tx('p', { class: 'field__hint' }, 'export.playOnline.intro'),
            refs.status
          ]));
        },
        footer: function (footer) {
          const cancel = button('common.cancel', { 'data-role': 'cancel' });
          cancel.addEventListener('click', function () { modal.close(); });
          refs.open = button('export.playOnline.open', { class: 'btn btn--primary', 'data-role': 'open',
            disabled: true });
          refs.open.addEventListener('click', launch);
          footer.appendChild(cancel);
          footer.appendChild(refs.open);
        },
        onClose: function () {
          if (job !== null) job.cancel();
          finish(null);
        }
      });
      if (modal === null) {
        resolve(null);
        return;
      }
      job = startFetch(choices, {
        progress: function (done, total) { setKey(refs.status, 'export.pick.preparing', { done: done, total: total }); }
      });
      job.promise.then(function (results) {
        return buildPlayBundle(results, { active: active });
      }).then(function (made) {
        info = made;
        setKey(refs.status, 'export.playOnline.ready', { count: made.count });
        refs.open.disabled = false;
        refs.open.focus();
      }, function (err) {
        if (err === ABORTED) return;
        modal.close();
        playFailed(err);
      });
    });
  }

  /**
   * "Play online" (the Play button of the page): every puzzle of the list of saved puzzles, and the puzzle on
   * screen, go to the player in a new tab, and the puzzle on screen is the one that is shown first. Puzzles
   * that are not at hand are generated again first (a dialog tells the progress). A very long link and a
   * failure are told in a toast.
   * @returns {Promise<?{url: string}>} The link that was opened; null when there is no puzzle, the user
   *          cancelled, or it failed.
   */
  function playOnline() {
    const offered = pickChoices();
    const choices = offered.choices;
    if (choices.length === 0) return Promise.resolve(null);
    let active = 0;
    choices.forEach(function (choice, i) { if (choice.id === offered.currentId) active = i; });
    const missing = choices.some(function (c) { return c.result === null && !resultCache.has(c.id); });
    if (missing && typeof document !== 'undefined' && typeof appRef.openModal === 'function') {
      return playAfterPreparing(choices, active);
    }
    return startFetch(choices).promise.then(function (results) {
      return buildPlayBundle(results, { active: active });
    }).then(function (info) {
      openedPlayer(info);
      return info;
    }, playFailed);
  }

  /** Closes the Export dialog if it is open. */
  function closeText() {
    if (openTextDialog !== null) openTextDialog.modal.close();
  }

  /**
   * Opens the Export dialog (the Export button of the page): the text of the puzzles that are ticked in the
   * list of saved puzzles, in a read-only box with a Copy button. Returns the open one when there is one.
   * @returns {?Object} The modal handle of `SG.app.openModal`; null without a DOM or an app.
   */
  function openText() {
    if (appRef === null || typeof document === 'undefined') return null;
    if (openTextDialog !== null) return openTextDialog.modal;
    let dialog = null;
    const modal = appRef.openModal({
      titleKey: 'export.text.title',
      wide: true,
      body: function (container) {
        dialog = createTextDialog(container);
      },
      footer: function (container) {
        if (dialog !== null) dialog.mountFooter(container);
      },
      onClose: function () {
        if (dialog !== null) dialog.destroy();
        openTextDialog = null;
      }
    });
    if (modal === null) return null;
    openTextDialog = { modal: modal, dialog: dialog };
    return modal;
  }

  /**
   * Connects the module to the application: the Print button opens the dialog, the Export button the text
   * code, the Play button opens the puzzle in the player. Idempotent.
   * @param {Object} app  `SG.app`.
   */
  function init(app) {
    if (!app || typeof app.on !== 'function') return;
    appRef = app;
    if (initialised) return;
    initialised = true;
    app.on('action', function (payload) {
      if (!payload) return;
      if (payload.id === 'export') open();
      else if (payload.id === 'exportCode') openText();
      else if (payload.id === 'play') playOnline();
    });
  }

  SG.exportUi = {
    FORMAT: FORMAT,
    PER_PAGE_CHOICES: PER_PAGE_CHOICES,
    PLAYER_URL_DEFAULT: PLAYER_URL_DEFAULT,
    LONG_LINK_CHARS: LONG_LINK_CHARS,
    init: init,
    open: open,
    openText: openText,
    closeText: closeText,
    close: close,
    toJson: toJson,
    playerBase: playerBase,
    pagePlayerBase: pagePlayerBase,
    buildPlayLink: buildPlayLink,
    buildPlayBundle: buildPlayBundle,
    buildExportText: buildExportText,
    gridLines: gridLines,
    structureLines: structureLines,
    openPlayLink: openPlayLink,
    playOnline: playOnline,
    buildPrintLayout: buildPrintLayout,
    boardSvg: boardSvg,
    printTokens: printTokens,
    printItems: printItems,
    buildPrintRoot: buildPrintRoot,
    clearPrint: clearPrint,
    summarize: summarize
  };

  // ---------------------------------------------------------------------------------------------
  // Strings of the export dialog, of the printed pages and of the Play button
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'export.title': 'Print',
      'export.summary': '{variant} \u00b7 {level} \u00b7 {clues}',
      'export.summary.seed': '{variant} \u00b7 {level} \u00b7 {clues} \u00b7 seed {seed}',
      'export.pick.title': 'Puzzles to choose from',
      'export.pick.selectAll': 'Select all',
      'export.pick.selectNone': 'Select none',
      'export.pick.count': '{selected} of {total} selected',
      'export.pick.empty': 'No puzzles yet. Generate one first.',
      'export.pick.preparing': 'Preparing puzzle {done} of {total}\u2026',
      'export.print.perPage': 'Puzzles per page',
      'export.print.hint': 'Opens the print dialog of your browser. To make a PDF file, choose \u201cSave as ' +
        'PDF\u201d there. Lines stay sharp because the puzzle is printed as vector graphics.',
      'export.print.solutionPage': 'Add the solutions on separate pages',
      'export.print.button': 'Print\u2026',
      'export.print.heading': '{variant} \u00b7 {level}',
      'export.print.meta': 'Seed {seed} \u00b7 {clues}',
      'export.print.puzzleNumber': 'Puzzle {n}',
      'export.print.solutionNumber': 'Solution {n}',
      'export.print.solutionOnly': 'Solution',
      'export.print.solutionsPage': 'Solutions',
      'export.print.alt': 'Sudoku puzzle: {variant}, {level}',
      'export.print.altSolution': 'Solution of the Sudoku puzzle: {variant}, {level}',
      'export.playOnline.opened': 'Opening the player in a new tab with all your saved puzzles; the one on ' +
        'screen opens first. If nothing happens, allow pop-ups for this page.',
      'export.playOnline.long': 'This link is very long (about {size} kB), and some apps and servers cut ' +
        'long links. If the player does not open every puzzle, remove some puzzles from the list and try again.',
      'export.playOnline.error': 'The link could not be made: {message}',
      'export.playOnline.title': 'Play in Sudoku Player',
      'export.playOnline.intro': 'The player gets every puzzle of the list. Puzzles that are not at hand are ' +
        'generated again first; it can take a moment.',
      'export.playOnline.ready': 'Everything is ready. Puzzles to send: {count}. The one on screen opens first.',
      'export.playOnline.open': 'Open the player',
      'export.text.title': 'Export puzzles as text',
      'export.text.intro': 'Choose the puzzles to export. Each one starts with a line \u201c#number,variant,' +
        'level,seed\u201d, and its grid follows, one row per line: a digit is a clue and \u201c.\u201d an ' +
        'empty cell. Jigsaw, Killer, Greater-Than and Wordoku puzzles add lines under the grid (regions, ' +
        'cages, signs, letters) so that Sudoku Player can rebuild the board.',
      'export.text.label': 'Text of the chosen puzzles',
      'export.text.placeholder': 'Choose at least one puzzle below to see its text.',
      'export.text.copy': 'Copy text',
      'export.text.copied': 'Text copied to the clipboard.',
      'export.text.copyFailed': 'Could not copy the text. Select it and copy it by hand.',
      'export.toast.failed': 'Could not export: {message}'
    },
    vi: {
      'export.title': 'In đề',
      'export.summary': '{variant} \u00b7 mức {level} \u00b7 {clues}',
      'export.summary.seed': '{variant} \u00b7 mức {level} \u00b7 {clues} \u00b7 seed {seed}',
      'export.pick.title': 'Các đề để chọn',
      'export.pick.selectAll': 'Chọn tất cả',
      'export.pick.selectNone': 'Bỏ chọn',
      'export.pick.count': 'Đã chọn {selected}/{total} đề',
      'export.pick.empty': 'Chưa có đề nào. Hãy tạo một đề trước.',
      'export.pick.preparing': 'Đang chuẩn bị đề {done}/{total}\u2026',
      'export.print.perPage': 'Số đề mỗi trang',
      'export.print.hint': 'Mở hộp thoại in của trình duyệt. Để tạo tệp PDF, hãy chọn \u201cLưu dưới dạng ' +
        'PDF\u201d ở đó. Nét kẻ luôn sắc vì đề được in dưới dạng đồ họa vector.',
      'export.print.solutionPage': 'Thêm lời giải ở các trang riêng',
      'export.print.button': 'In…',
      'export.print.heading': '{variant} \u00b7 mức {level}',
      'export.print.meta': 'Seed: {seed} \u00b7 {clues}',
      'export.print.puzzleNumber': 'Đề {n}',
      'export.print.solutionNumber': 'Lời giải {n}',
      'export.print.solutionOnly': 'Lời giải',
      'export.print.solutionsPage': 'Lời giải',
      'export.print.alt': 'Đề Sudoku: {variant}, {level}',
      'export.print.altSolution': 'Lời giải của đề Sudoku: {variant}, {level}',
      'export.playOnline.opened': 'Đang mở trình chơi trong thẻ mới cùng tất cả đề đã lưu; đề đang xem sẽ ' +
        'được mở trước. Nếu không thấy gì, hãy cho phép cửa sổ bật lên của trang này.',
      'export.playOnline.long': 'Liên kết này rất dài (khoảng {size} kB), và một số ứng dụng, máy chủ sẽ ' +
        'cắt bớt liên kết dài. Nếu trình chơi không mở hết các đề, hãy xóa bớt đề khỏi danh sách rồi thử lại.',
      'export.playOnline.error': 'Không tạo được liên kết: {message}',
      'export.playOnline.title': 'Chơi trong Trình chơi Sudoku',
      'export.playOnline.intro': 'Trình chơi nhận mọi đề trong danh sách. Đề nào chưa có sẵn sẽ được tạo ' +
        'lại trước, việc này có thể mất một lúc.',
      'export.playOnline.ready': 'Đã sẵn sàng. Số đề sẽ gửi: {count}. Đề đang xem sẽ được mở trước.',
      'export.playOnline.open': 'Mở trình chơi',
      'export.text.title': 'Xuất các đề dạng văn bản',
      'export.text.intro': 'Chọn các đề cần xuất. Mỗi đề bắt đầu bằng một dòng \u201c#số thứ tự,biến thể,' +
        'mức độ,seed\u201d, rồi đến lưới của đề, mỗi hàng một dòng: chữ số là ô cho sẵn, dấu \u201c.\u201d ' +
        'là ô trống. Đề Ghép hình, Sát thủ, So sánh và Wordoku có thêm các dòng dưới lưới (vùng, lồng, dấu, ' +
        'chữ cái) để Trình chơi Sudoku dựng lại được bàn cờ.',
      'export.text.label': 'Văn bản của các đề đã chọn',
      'export.text.placeholder': 'Hãy chọn ít nhất một đề bên dưới để xem văn bản của nó.',
      'export.text.copy': 'Sao chép văn bản',
      'export.text.copied': 'Đã sao chép văn bản vào bộ nhớ tạm.',
      'export.text.copyFailed': 'Không sao chép được văn bản. Hãy chọn và sao chép thủ công.',
      'export.toast.failed': 'Không xuất được: {message}'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
