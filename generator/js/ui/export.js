/**
 * Print / PDF export (task T-7.1; design.md sections 10.6 and 14.1) and the hand-off of a puzzle to the
 * sudoku-player web app (task T-7.8; design.md section 10.9): `SG.exportUi`. The Print button of the page
 * opens one small dialog with a single card, Print / PDF, for the puzzle on screen (optionally with the
 * solution on a page of its own). The "Export" button opens a dialog with the text code of the puzzle, to
 * paste into the player. The "Play" button of the page calls `playOnline()`, which opens the puzzle
 * on screen in the player in a new tab.
 *
 * Two layers, so that what matters runs in Node:
 *  - PURE (no DOM): `toJson`, `buildPrintLayout`, `boardSvg`, `printTokens`, `buildPlayLink`,
 *    `buildExportCode`.
 *  - DOM: the dialogs, the print path and the page's `<meta name="sg-player-url">` (`pagePlayerBase`).
 *
 * ---------------------------------------------------------------------------------------------------------
 * PUBLIC API (`SG.exportUi`)
 * ---------------------------------------------------------------------------------------------------------
 *   init(app)            Idempotent. Listens to the 'action' event of `SG.app`: `{ id: 'export' }` (the Print
 *                        button) opens the dialog, `{ id: 'exportCode' }` (the Export button) calls
 *                        `openCode()`, `{ id: 'play' }` (the Play button) calls `playOnline()`.
 *   open()               Opens the dialog (or focuses the open one). Returns the modal handle, null without a
 *                        DOM or an app.
 *   openCode()           Opens the dialog of the text code: the code in a read-only box and a Copy button.
 *                        Null without a DOM, an app or a puzzle.
 *   buildExportCode(result, opts?)  -> Promise<{ code, length, long }>. The token of the player link without
 *                        the address (`z.…` / `j.…`); the player's "Open puzzle" box takes it as it is.
 *                        `opts`: `{ generatedAt?, locale?, compress? }`.
 *   close()              Closes it.
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
 *   playerBase(content?) The player's address: `content` (the `content` of the page's
 *                        `<meta name="sg-player-url">`) when it is not blank, else `PLAYER_URL_DEFAULT`.
 *                        `pagePlayerBase()` reads that tag from the page.
 *   openPlayLink(url)    `window.open(url, '_blank', 'noopener')`: the player opens in a new tab.
 *   playOnline()         -> Promise. Builds the link of the puzzle on screen, opens it and tells a failure
 *                        or a very long link in a toast. No dialog.
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
    ['rawScore', 'hardestGroup', 'confidence', 'solved', 'empties'].forEach(function (key) {
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
   * The text code of a puzzle: the token of the player link without the address (`z.…` compressed or `j.…`
   * plain). The player's "Open puzzle" box accepts it as it is, so it can be copied and pasted across.
   * @param {Object} result  A `PuzzleResult`.
   * @param {{generatedAt?: string, locale?: string, compress?: boolean}} [options]
   * @returns {Promise<{code: string, length: number, long: boolean}>}  `long`: more than `LONG_LINK_CHARS`.
   */
  function buildExportCode(result, options) {
    const o = options || {};
    return Promise.resolve().then(function () {
      const doc = toJson(result, { generatedAt: o.generatedAt, locale: o.locale });
      return SG.exchange.encode(doc, { compress: o.compress }).then(function (token) {
        return { code: token, length: token.length, long: token.length > LONG_LINK_CHARS };
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

  /** Settings that stay while the page is open. */
  const prefs = { solutionPage: true };

  let appRef = null;
  let initialised = false;
  let openDialog = null;
  let openCodeDialog = null;

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

  function summaryText(result) {
    const s = summarize(result);
    const clues = t('unit.clue', { count: s.clues });
    const args = { variant: s.variantName, level: s.levelName, clues: clues, seed: s.seed };
    return t(s.seed === '' ? 'export.summary' : 'export.summary.seed', args);
  }

  /**
   * Builds the dialog: a paper preview of the puzzle, what will be printed, the solution switch (body), and
   * Cancel / Print (footer).
   * @param {Element} container  `modal.body`.
   * @returns {{mountFooter: function(Element): void, refresh: function(): void, destroy: function(): void}}
   */
  function createDialog(container) {
    const app = appRef;
    const refs = {};

    function toast(kind, key, args) {
      app.toast(kind, key, args);
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

    function printOne() {
      const result = currentResult();
      if (result === null) return;
      const item = { result: result, number: null, symbolMode: screenSymbolMode(result) };
      printItems([item], { perPage: 1, solutions: prefs.solutionPage && hasSolution(result.solution) })
        .then(close, function (err) {
          logError(err);
          toast('danger', 'export.toast.failed', { message: err && err.message ? err.message : String(err) });
        });
    }

    const sol = switchRow('export.print.solutionPage', 'print-solution', prefs.solutionPage, function (on) {
      prefs.solutionPage = on;
    });
    refs.printSolution = sol.input;
    refs.preview = el('img', { class: 'print-dialog__preview', 'data-role': 'preview', hidden: true,
      alt: '' });
    refs.summary = el('p', { class: 'print-dialog__summary', 'data-role': 'summary' });
    container.appendChild(el('div', { class: 'print-dialog', 'data-role': 'export-body' }, [
      refs.preview,
      el('div', { class: 'print-dialog__side' }, [
        refs.summary,
        tx('p', { class: 'field__hint' }, 'export.print.hint'),
        sol.row
      ])
    ]));

    function mountFooter(footer) {
      const cancel = button('common.cancel', { 'data-role': 'cancel' });
      cancel.addEventListener('click', close);
      refs.printButton = button('export.print.button', { class: 'btn btn--primary', 'data-role': 'print' },
        'print');
      refs.printButton.addEventListener('click', printOne);
      footer.appendChild(cancel);
      footer.appendChild(refs.printButton);
      refresh();
    }

    function refresh() {
      const result = currentResult();
      const has = result !== null;
      if (has) {
        refs.summary.removeAttribute('data-i18n');
        refs.summary.textContent = summaryText(result);
        try {
          refs.preview.src = svgDataUrl(boardSvg(result, { print: true, symbolMode: screenSymbolMode(result) }));
          refs.preview.alt = t('export.print.alt', {
            variant: summarize(result).variantName, level: summarize(result).levelName });
          refs.preview.hidden = false;
        } catch (err) {
          logError(err);
          refs.preview.hidden = true;
        }
      } else {
        setKey(refs.summary, 'export.summary.none');
        refs.preview.hidden = true;
      }
      refs.printSolution.disabled = !has;
      if (refs.printButton) refs.printButton.disabled = !has;
    }

    const stop = [app.on('result', refresh), app.on('locale', refresh)];
    refresh();

    return {
      mountFooter: mountFooter,
      refresh: refresh,
      destroy: function destroy() {
        stop.forEach(function (off) { off(); });
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

  /**
   * "Play online" without a dialog (the Play button of the page): makes the link of the puzzle on screen
   * and opens it in a new tab. A very long link and a failure are told in a toast.
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
   * Opens the dialog of the text code (the Export button of the page): the code of the puzzle on screen in
   * a read-only box with a Copy button. Returns the open one when there is one.
   * @returns {?Object} The modal handle of `SG.app.openModal`; null without a DOM, an app or a puzzle.
   */
  function openCode() {
    if (appRef === null || typeof document === 'undefined') return null;
    if (openCodeDialog !== null) return openCodeDialog;
    const result = currentResult();
    if (result === null) return null;
    let box = null;
    let copyBtn = null;
    let code = '';
    const modal = appRef.openModal({
      titleKey: 'export.code.title',
      body: function (container) {
        box = el('textarea', { class: 'textarea', readonly: true, rows: 6, spellcheck: 'false',
          autocomplete: 'off', autocapitalize: 'off', 'data-role': 'code', id: nextId('export-code'),
          'aria-describedby': 'export-code-hint' });
        const status = tx('p', { class: 'field__hint', id: 'export-code-hint' }, 'export.code.hint');
        copyBtn = button('export.code.copy', { class: 'btn btn--primary', 'data-role': 'copy', disabled: true },
          'copy');
        box.addEventListener('focus', function () { box.select(); });
        copyBtn.addEventListener('click', function () {
          const copy = SG.controls && typeof SG.controls.copyText === 'function' ? SG.controls.copyText : null;
          Promise.resolve(copy ? copy(code) : false).then(function (ok) {
            appRef.toast(ok ? 'success' : 'danger', ok ? 'export.code.copied' : 'export.code.copyFailed');
          });
        });
        container.appendChild(el('div', { class: 'stack', 'data-role': 'code-body' }, [
          tx('p', { class: 'export-summary' }, 'export.code.intro'), box, status, copyBtn
        ]));
        box.value = t('export.code.working');
        buildExportCode(result).then(function (info) {
          code = info.code;
          box.value = code;
          copyBtn.disabled = false;
          if (info.long) appRef.toast('warning', 'export.code.long', longLinkArgs({ length: info.length }));
        }, function (err) {
          logError(err);
          box.value = '';
          const message = SG.i18n && typeof SG.i18n.tError === 'function' ? SG.i18n.tError(err) : String(err);
          appRef.toast('danger', 'export.code.error', { message: message });
        });
      },
      onClose: function () {
        openCodeDialog = null;
      }
    });
    openCodeDialog = modal;
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
      else if (payload.id === 'exportCode') openCode();
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
    openCode: openCode,
    close: close,
    toJson: toJson,
    playerBase: playerBase,
    pagePlayerBase: pagePlayerBase,
    buildPlayLink: buildPlayLink,
    buildExportCode: buildExportCode,
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
      'export.summary.none': 'No puzzle is on screen yet. Generate one first.',
      'export.print.hint': 'Opens the print dialog of your browser. To make a PDF file, choose \u201cSave as ' +
        'PDF\u201d there. Lines stay sharp because the puzzle is printed as vector graphics.',
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
      'export.playOnline.opened': 'Opening the player in a new tab. If nothing happens, allow pop-ups for ' +
        'this page.',
      'export.playOnline.long': 'This link is very long (about {size} kB), and some apps and servers cut ' +
        'long links. If the player does not open this puzzle, try a smaller puzzle.',
      'export.playOnline.error': 'The link could not be made: {message}',
      'export.code.title': 'Export a text code',
      'export.code.intro': 'A text code of the puzzle on screen. Copy it, then in sudoku-player press ' +
        '\u201cOpen puzzle\u201d and paste it to play.',
      'export.code.hint': 'The code holds the whole puzzle, so you can keep it in a note or send it in a ' +
        'message.',
      'export.code.working': 'Making the code\u2026',
      'export.code.copy': 'Copy code',
      'export.code.copied': 'Code copied to the clipboard.',
      'export.code.copyFailed': 'Could not copy the code. Select it and copy it by hand.',
      'export.code.long': 'This code is very long (about {size} kB), and some apps cut long texts. If the ' +
        'player does not open this puzzle, try a smaller puzzle.',
      'export.code.error': 'The code could not be made: {message}',
      'export.toast.failed': 'Could not export: {message}'
    },
    vi: {
      'export.title': 'In đề',
      'export.summary': '{variant} \u00b7 mức {level} \u00b7 {clues}',
      'export.summary.seed': '{variant} \u00b7 mức {level} \u00b7 {clues} \u00b7 seed {seed}',
      'export.summary.none': 'Chưa có đề nào trên màn hình. Hãy tạo một đề trước.',
      'export.print.hint': 'Mở hộp thoại in của trình duyệt. Để tạo tệp PDF, hãy chọn \u201cLưu dưới dạng ' +
        'PDF\u201d ở đó. Nét kẻ luôn sắc vì đề được in dưới dạng đồ họa vector.',
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
      'export.playOnline.opened': 'Đang mở trình chơi trong thẻ mới. Nếu không thấy gì, hãy cho phép cửa sổ ' +
        'bật lên của trang này.',
      'export.playOnline.long': 'Liên kết này rất dài (khoảng {size} kB), và một số ứng dụng, máy chủ sẽ ' +
        'cắt bớt liên kết dài. Nếu trình chơi không mở được đề này, hãy thử một đề nhỏ hơn.',
      'export.playOnline.error': 'Không tạo được liên kết: {message}',
      'export.code.title': 'Xuất mã văn bản',
      'export.code.intro': 'Mã văn bản của đề đang hiển thị. Hãy sao chép nó, rồi trong sudoku-player bấm ' +
        '\u201cMở đề\u201d và dán vào để chơi.',
      'export.code.hint': 'Mã chứa toàn bộ đề, nên bạn có thể lưu vào ghi chú hoặc gửi trong tin nhắn.',
      'export.code.working': 'Đang tạo mã…',
      'export.code.copy': 'Sao chép mã',
      'export.code.copied': 'Đã sao chép mã vào bộ nhớ tạm.',
      'export.code.copyFailed': 'Không sao chép được mã. Hãy chọn và sao chép thủ công.',
      'export.code.long': 'Mã này rất dài (khoảng {size} kB), và một số ứng dụng sẽ cắt bớt văn bản dài. ' +
        'Nếu trình chơi không mở được đề này, hãy thử một đề nhỏ hơn.',
      'export.code.error': 'Không tạo được mã: {message}',
      'export.toast.failed': 'Không xuất được: {message}'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
