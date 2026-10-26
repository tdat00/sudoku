// Print / PDF export and the hand-off to the player: the pure parts of SG.exportUi that run on Node: the
// page plan of a print job, the JSON document of design.md 14.1 (with its `model` block), the "Play online"
// link to sudoku-player (and the 'play' action of the app), the standalone SVG of a puzzle (and its paper
// look), and the strings of the dialog. The dialog and the print path need a DOM and are not tested here.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var E = SG.exportUi;
  var NODE = SG.test.node;

  function ready() {
    if (!E || !SG.pipeline || !SG.i18n || !SG.boardView) SG.test.skip('SG.exportUi is not loaded here');
  }

  var cache = {};

  function realResult(variantId, difficulty, seed, options) {
    var key = variantId + '/' + difficulty + '/' + seed + '/' + JSON.stringify(options || {});
    if (!cache[key]) {
      cache[key] = SG.pipeline.run({ variantId: variantId, difficulty: difficulty, seed: seed, trace: 'off',
        variantOptions: options || {} }, null);
    }
    return cache[key];
  }

  function inLocale(code, fn) {
    SG.i18n.setLocale(code);
    try {
      return fn();
    } finally {
      SG.i18n.setLocale('en');
    }
  }

  function arr(list) {
    return Array.from(list);
  }

  function count(text, part) {
    return text.split(part).length - 1;
  }

  /** Fake board tokens: every value names its token, so a test can see which one an SVG used. */
  function fakeTokens() {
    var out = {};
    SG.boardView.TOKEN_NAMES.forEach(function (name) {
      out[name] = 'T<' + name.replace('--sg-board-', '') + '>';
    });
    return out;
  }

  describe('export: print layout', function () {
    var GRIDS = { 1: [1, 1], 2: [1, 2], 4: [2, 2], 6: [2, 3] };

    [0, 1, 2, 5, 6, 7, 12, 13, 60].forEach(function (n) {
      [1, 2, 4, 6].forEach(function (per) {
        it(n + ' puzzles, ' + per + ' per page: the right number of pages and no puzzle twice', function () {
          ready();
          var plan = E.buildPrintLayout(n, per, false);
          var pages = Math.ceil(n / per);
          expect(plan.count).toBe(n);
          expect(plan.perPage).toBe(per);
          expect(plan.columns).toBe(GRIDS[per][0]);
          expect(plan.rows).toBe(GRIDS[per][1]);
          expect(plan.puzzlePages).toBe(pages);
          expect(plan.solutionPages).toBe(0);
          expect(plan.pageCount).toBe(pages);
          var seen = [];
          plan.pages.forEach(function (page, k) {
            expect(page.kind).toBe('puzzles');
            expect(page.number).toBe(k + 1);
            expect(page.items.length).toBeLessThanOrEqual(per);
            expect(page.items.length).toBeGreaterThan(0);
            page.items.forEach(function (item, slot) {
              expect(item.slot).toBe(slot);
              expect(item.index).toBe(k * per + slot);
              expect(item.row).toBe(Math.floor(slot / plan.columns));
              expect(item.column).toBe(slot % plan.columns);
              expect(item.row).toBeLessThan(plan.rows);
              seen.push(item.index);
            });
          });
          expect(seen).toEqual(Array.from({ length: n }, function (_, i) { return i; }));
        });
      });
    });

    it('solutions follow on pages of their own, in the same order and with the same arrangement',
      function () {
        ready();
        var plan = E.buildPrintLayout(5, 2, true);
        expect(plan.puzzlePages).toBe(3);
        expect(plan.solutionPages).toBe(3);
        expect(plan.pageCount).toBe(6);
        expect(plan.pages.map(function (p) { return p.kind; })).toEqual(
          ['puzzles', 'puzzles', 'puzzles', 'solutions', 'solutions', 'solutions']);
        expect(plan.pages.map(function (p) { return p.items.length; })).toEqual([2, 2, 1, 2, 2, 1]);
        expect(plan.pages.map(function (p) { return p.number; })).toEqual([1, 2, 3, 4, 5, 6]);
        expect(plan.pages[3].items.map(function (i) { return i.index; })).toEqual([0, 1]);
        expect(plan.pages[5].items.map(function (i) { return i.index; })).toEqual([4]);
        // a single puzzle with its solution: two pages
        expect(E.buildPrintLayout(1, 1, true).pageCount).toBe(2);
        expect(E.buildPrintLayout(6, 6, true).pageCount).toBe(2);
        expect(E.buildPrintLayout(7, 6, true).pageCount).toBe(4);
      });

    it('anything other than 1, 2, 4 or 6 per page counts as 1; a negative or odd count is safe', function () {
      ready();
      [3, 5, 0, -2, NaN, undefined, '4x'].forEach(function (bad) {
        expect(E.buildPrintLayout(3, bad, false).perPage).toBe(1);
      });
      expect(E.buildPrintLayout(-4, 2, true).pageCount).toBe(0);
      expect(E.buildPrintLayout('4', 2, false).pageCount).toBe(2);
      expect(E.buildPrintLayout(2.9, 6, false).count).toBe(2);
      expect(E.PER_PAGE_CHOICES).toEqual([1, 2, 4, 6]);
    });
  });

  describe('export: the API of the print path and the player link', function () {
    it('has every function the player and the print path need', function () {
      ready();
      ['init', 'open', 'openText', 'close', 'closeText', 'toJson', 'buildPlayLink', 'buildPlayBundle',
        'buildExportText',
        'gridLines', 'structureLines', 'playerBase',
        'pagePlayerBase', 'openPlayLink',
        'playOnline', 'buildPrintLayout', 'boardSvg', 'printTokens', 'printItems', 'buildPrintRoot',
        'clearPrint'].forEach(function (name) {
        expect(typeof E[name]).toBe('function');
      });
    });
  });

  describe('export: JSON (design.md 14.1)', function () {
    var FIXED = { generatedAt: '2026-10-15T11:00:00.000Z' };

    it('has every field of the schema, with the types of the schema', function () {
      ready();
      var r = realResult('classic9', 'hard', 24);
      var d = E.toJson(r, FIXED);
      expect(d.format).toBe('sudoku-generator/v1');
      expect(d.generatedAt).toBe('2026-10-15T11:00:00.000Z');
      expect(d.variantId).toBe('classic9');
      expect(d.variantOptions).toEqual({});
      expect(d.difficulty.requested).toBe('hard');
      expect(d.difficulty.achieved).toBe(r.rating.level);
      expect(d.difficulty.score).toBe(r.rating.score);
      expect(d.difficulty.hardestTechnique).toBe(r.rating.hardestTechnique);
      expect(d.difficulty.techniqueCounts).toEqual(r.rating.techniqueCounts);
      expect(d.seed).toBe(24);
      expect(d.symmetry).toBe(r.config.symmetry);
      expect(d.symbolMode).toBe('digits');
      expect(d.digits).toBe(9);
      expect(d.cellCount).toBe(81);
      expect(d.layout.rows).toBe(9);
      expect(d.layout.cols).toBe(9);
      expect(d.layout.cellRegion.length).toBe(81);
      expect(d.layout.subGrids).toEqual([{ gridIndex: 0, originRow: 0, originCol: 0 }]);
      expect(d.givens).toEqual(arr(r.givens));
      expect(d.solution).toEqual(arr(r.solution));
      expect(d.cages).toEqual([]);
      expect(d.inequalities).toEqual([]);
      expect(d.stats.clues).toBe(arr(r.givens).filter(function (v) { return v > 0; }).length);
      expect(d.stats.attempts).toBe(r.attempts);
      expect(typeof d.stats.elapsedMs).toBe('number');
      expect(Array.isArray(d.warnings)).toBe(true);
      expect(Object.keys(d).slice(0, 15)).toEqual(['format', 'generatedAt', 'variantId', 'variantOptions',
        'difficulty', 'seed', 'symmetry', 'symbolMode', 'digits', 'cellCount', 'layout', 'givens', 'solution',
        'cages', 'inequalities']);
    });

    it('is plain data that survives JSON.stringify exactly', function () {
      ready();
      SG.variants.list().forEach(function (def) {
        var r = realResult(def.id, def.difficultySupport[0], 11);
        var d = E.toJson(r, FIXED);
        expect(JSON.parse(JSON.stringify(d))).toEqual(d);
        expect(d.generatedAt).toBe(FIXED.generatedAt);
      });
      expect(typeof E.toJson(realResult('classic4', 'veryEasy', 1)).generatedAt).toBe('string');
      var generatedAt = E.toJson(realResult('classic4', 'veryEasy', 1)).generatedAt;
      expect(new Date(generatedAt).getTime()).toBeGreaterThan(0);
    });

    it('carries the extra structure of each variant', function () {
      ready();
      var killer = E.toJson(realResult('killer', 'easy', 11), FIXED);
      expect(killer.cages.length).toBeGreaterThan(10);
      killer.cages.forEach(function (c) {
        expect(c.cells.length).toBeGreaterThan(0);
        expect(typeof c.sum).toBe('number');
        expect(c.distinct).toBe(true);
      });
      var gt = E.toJson(realResult('greaterThan', 'easy', 11), FIXED);
      expect(gt.inequalities.length).toBeGreaterThan(0);
      expect(Object.keys(gt.inequalities[0]).sort()).toEqual(['a', 'b']);
      var samurai = E.toJson(realResult('samurai', 'veryEasy', 11), FIXED);
      expect(samurai.cellCount).toBe(369);
      expect(samurai.layout.subGrids.length).toBe(5);
      expect(samurai.layout.cellRow.length).toBe(369);
      expect(samurai.layout.cellCol.length).toBe(369);
      var jigsaw = E.toJson(realResult('jigsaw9', 'easy', 11), FIXED);
      expect(new Set(jigsaw.layout.cellRegion).size).toBe(9);
      var word = E.toJson(realResult('wordoku', 'easy', 11), FIXED);
      expect(word.wordoku.word).toMatch(/^[A-Z]{9}$/);
      expect(word.symbols.mode).toBe('word');
      expect(word.symbols.labels.join('')).toBe(word.wordoku.word.split('').sort().join(''));
      expect(E.toJson(realResult('classic9', 'easy', 1), FIXED).wordoku).toBeUndefined();
      var opts = E.toJson(realResult('greaterThan', 'easy', 4, { futoshiki: true }), FIXED);
      expect(opts.variantOptions).toEqual({ futoshiki: true });
    });

    it('names the variant, the levels and the technique in the language of the export (rule L6)',
      function () {
        ready();
        var r = realResult('killer', 'normal', 25);
        var en = inLocale('en', function () { return E.toJson(r, FIXED); });
        var vi = inLocale('vi', function () { return E.toJson(r, FIXED); });
        expect(en.locale).toBe('en');
        expect(vi.locale).toBe('vi');
        expect(en.labels.variant).toBe('Killer Sudoku');
        expect(vi.labels.variant).toBe('Sudoku Sát thủ');
        expect(vi.labels.achieved).not.toBe(en.labels.achieved);
        expect(vi.labels.requested).toBe('Trung bình');
        expect(en.labels.requested).toBe('Normal');
        expect(vi.labels.hardestTechnique).not.toBeNull();
        expect(vi.difficulty.requested).toBe('normal');
        expect(vi.givens).toEqual(en.givens);
        expect(E.toJson(r, { generatedAt: FIXED.generatedAt, locale: 'vi' }).locale).toBe('vi');
      });

    it('a puzzle without a known solution writes "solution": null', function () {
      ready();
      var r = Object.assign({}, realResult('classic9', 'easy', 5), { solution: new Int32Array(81) });
      expect(E.toJson(r, FIXED).solution).toBeNull();
    });
  });

  describe('export: readable text', function () {
    function lines(text) {
      return text.split('\n');
    }

    it('writes the header line #number,variant,level,seed and the grid, one row per line', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      var text = inLocale('en', function () { return E.buildExportText([{ result: r }]); });
      var rows = lines(text);
      expect(rows[0]).toBe('#1,Classic Sudoku 9x9,' + SG.i18n.t('difficulty.' + r.rating.level) + ',3');
      expect(rows.slice(1, 10).every(function (row) { return /^[1-9.]{9}$/.test(row); })).toBe(true);
      expect(rows[10]).toBe('');
      expect(rows.length).toBe(11);
      // The grid is the givens, row by row: a digit for a clue and a dot for an empty cell.
      var expected = [];
      for (var row = 0; row < 9; row++) {
        var line = '';
        for (var col = 0; col < 9; col++) {
          var v = r.givens[row * 9 + col];
          line += v > 0 ? String(v) : '.';
        }
        expected.push(line);
      }
      expect(rows.slice(1, 10)).toEqual(expected);
      expect(E.gridLines(r)).toEqual(expected);
    });

    it('numbers several puzzles from 1 and separates them by a blank line', function () {
      ready();
      var a = realResult('classic9', 'easy', 3);
      var b = realResult('classic4', 'veryEasy', 2);
      var c = realResult('killer', 'easy', 5);
      var text = inLocale('en', function () {
        return E.buildExportText([{ result: a }, { result: b }, { result: c }]);
      });
      var headers = lines(text).filter(function (line) { return line.charAt(0) === '#'; });
      expect(headers.length).toBe(3);
      expect(headers.map(function (h) { return h.split(',')[0]; })).toEqual(['#1', '#2', '#3']);
      expect(headers[1].split(',')[1]).toBe('Classic Sudoku 4x4');
      expect(headers[2].split(',')[3]).toBe('5');
      expect(text.split('\n\n').length).toBe(3);
      expect(text.slice(-1)).toBe('\n');
      expect(text.slice(-2)).not.toBe('\n\n');
    });

    it('writes nothing for no puzzle, and keeps the seed field empty for a puzzle without a seed',
      function () {
        ready();
        expect(E.buildExportText([])).toBe('');
        var r = Object.assign({}, realResult('classic9', 'easy', 5), { seed: null });
        expect(lines(E.buildExportText([{ result: r }]))[0].split(',')[3]).toBe('');
      });

    it('uses the language of the page for the names, with no comma and no times sign in a header',
      function () {
        ready();
        var r = realResult('classic9', 'hard', 4);
        var en = inLocale('en', function () { return E.buildExportText([{ result: r }]); }).split('\n')[0];
        var vi = inLocale('vi', function () { return E.buildExportText([{ result: r }]); }).split('\n')[0];
        expect(en).not.toBe(vi);
        [en, vi].forEach(function (header) {
          expect(header.split(',').length).toBe(4);
          expect(header.indexOf('\u00d7')).toBe(-1);
        });
      });

    it('draws a board with holes on its canvas: _ where no cell is, and every cell once', function () {
      ready();
      var r = realResult('samurai', 'easy', 2);
      var rows = E.gridLines(r);
      expect(rows.length).toBe(r.model.layout.rows);
      rows.forEach(function (row) { expect(row.length).toBe(r.model.layout.cols); });
      var cells = rows.join('').replace(/_/g, '').length;
      expect(cells).toBe(r.model.cellCount);
      expect(rows.join('').indexOf('_')).not.toBe(-1);
    });

    it('writes the values above 9 as letters: 10 is A, 11 is B, and so on', function () {
      ready();
      var r = realResult('mega16', 'easy', 2);
      var rows = E.gridLines(r);
      expect(rows.length).toBe(16);
      var letters = rows.join('').replace(/[1-9.]/g, '');
      expect(/^[A-G]*$/.test(letters)).toBe(true);
      var max = 0;
      for (var i = 0; i < r.givens.length; i++) max = Math.max(max, r.givens[i]);
      expect(max).toBeGreaterThan(9);
      expect(letters.length).toBeGreaterThan(0);
    });

    it('adds no structure line for a variant the grid alone fixes', function () {
      ready();
      ['classic9', 'diagonalX', 'hyper', 'mega12', 'samurai'].forEach(function (id) {
        expect(E.structureLines(realResult(id, 'easy', 2))).toEqual([]);
      });
    });

    it('writes the regions of a jigsaw puzzle: nine groups of nine region numbers', function () {
      ready();
      var r = realResult('jigsaw9', 'easy', 3);
      var lines = E.structureLines(r);
      expect(lines.length).toBe(1);
      var groups = lines[0].replace(/^regions: /, '').split(' ');
      expect(lines[0].indexOf('regions: ')).toBe(0);
      expect(groups.length).toBe(9);
      groups.forEach(function (g) { expect(/^[1-9]{9}$/.test(g)).toBe(true); });
      var counts = {};
      groups.join('').split('').forEach(function (d) { counts[d] = (counts[d] || 0) + 1; });
      Object.keys(counts).forEach(function (d) { expect(counts[d]).toBe(9); });
      var regions = arr(r.model.layout.cellRegion).map(function (v) { return v + 1; });
      expect(groups.join('')).toBe(regions.join(''));
    });

    it('writes the cages of a killer puzzle in the order of the model, with 1-based row and column',
      function () {
        ready();
        var r = realResult('killer', 'easy', 5);
        var lines = E.structureLines(r);
        expect(lines.length).toBe(1);
        var cages = lines[0].replace(/^cages: /, '').split('; ');
        expect(cages.length).toBe(r.model.cages.length);
        cages.forEach(function (text, k) {
          var parts = text.split('=');
          expect(Number(parts[0])).toBe(r.model.cages[k].sum);
          var cells = parts[1].split(',').map(function (token) {
            var m = /^r(\d+)c(\d+)$/.exec(token);
            return (Number(m[1]) - 1) * 9 + Number(m[2]) - 1;
          });
          expect(cells).toEqual(arr(r.model.cages[k].cells));
        });
      });

    it('writes the signs of a greater-than puzzle: the first cell is less than the second', function () {
      ready();
      var r = realResult('greaterThan', 'easy', 4);
      var lines = E.structureLines(r);
      expect(lines.length).toBe(1);
      var signs = lines[0].replace(/^signs: /, '').split('; ');
      expect(signs.length).toBe(r.model.inequalities.length);
      expect(signs.every(function (s) { return /^r\dc\d<r\dc\d$/.test(s); })).toBe(true);
    });

    it('writes the letters and the line of a wordoku puzzle, but not the word', function () {
      ready();
      var r = realResult('wordoku', 'easy', 6);
      var lines = E.structureLines(r);
      expect(lines.length).toBe(2);
      expect(lines[0]).toBe('letters: ' + r.model.symbols.labels.join(' '));
      expect(/^word-line: (diagonal|row [1-9]|column [1-9])$/.test(lines[1])).toBe(true);
      var word = SG.wordoku.describe(r.model).word;
      expect(lines.join('\n').indexOf(word)).toBe(-1);
    });

    it('keeps a puzzle in one block: structure lines follow the grid with no blank line', function () {
      ready();
      var a = realResult('killer', 'easy', 5);
      var b = realResult('classic9', 'easy', 3);
      var text = inLocale('en', function () { return E.buildExportText([{ result: a }, { result: b }]); });
      var blocks = text.trim().split('\n\n');
      expect(blocks.length).toBe(2);
      var first = blocks[0].split('\n');
      expect(first.length).toBe(1 + 9 + 1);
      expect(first[10].indexOf('cages: ')).toBe(0);
      expect(blocks[1].split('\n').length).toBe(10);
    });
  });

  describe('export: Play online (the link to sudoku-player)', function () {
    var FIXED = { generatedAt: '2026-10-15T11:00:00.000Z' };
    var BASE = '../player/index.html';

    function codeOf(promise) {
      return promise.then(function () { return null; }, function (err) { return err && err.code; });
    }

    it('the player address is the default unless the page says otherwise', function () {
      ready();
      expect(E.PLAYER_URL_DEFAULT).toBe(BASE);
      expect(E.playerBase()).toBe(BASE);
      expect(E.playerBase('')).toBe(BASE);
      expect(E.playerBase('   ')).toBe(BASE);
      expect(E.playerBase(null)).toBe(BASE);
      expect(E.playerBase('  http://localhost:8080/player/ ')).toBe('http://localhost:8080/player/');
      expect(E.pagePlayerBase()).toBe(BASE);
    });

    it('index.html names the player in <meta name="sg-player-url">, with the default address', function () {
      if (!NODE) SG.test.skip('needs the file system (Node only)');
      var html = NODE.fs.readFileSync(NODE.path.join(NODE.root, 'index.html'), 'utf8');
      var meta = /<meta name="sg-player-url" content="([^"]*)">/.exec(html);
      expect(meta).not.toBe(null);
      expect(meta[1]).toBe(E.PLAYER_URL_DEFAULT);
      expect(SG.exchange.isAllowedBase(meta[1])).toBe(true);
      // A page, not a folder: opened from a disk a folder shows a file listing instead of the player.
      expect(NODE.fs.statSync(NODE.path.join(NODE.root, meta[1])).isFile()).toBe(true);
    });

    it('builds the link: the base, then #puzzle= and a token that decodes to the document of toJson',
      async function () {
        ready();
        var r = realResult('killer', 'easy', 11);
        var link = await E.buildPlayLink(r, { generatedAt: FIXED.generatedAt, locale: 'en' });
        expect(link.base).toBe(BASE);
        expect(link.url).toBe(BASE + '#puzzle=' + link.token);
        expect(link.length).toBe(link.url.length);
        expect(link.long).toBe(false);
        expect(SG.exchange.tokenFromHash(link.url.slice(link.url.indexOf('#')))).toBe(link.token);
        var doc = await SG.exchange.decode(link.token);
        expect(doc).toEqual(E.toJson(r, { generatedAt: FIXED.generatedAt, locale: 'en' }));
        expect(doc.model.cages.length).toBe(r.model.cages.length);
        var other = await E.buildPlayLink(r, { base: 'http://localhost:8080/player/', compress: false,
          generatedAt: FIXED.generatedAt });
        expect(other.url.indexOf('http://localhost:8080/player/#puzzle=j.')).toBe(0);
        expect((await SG.exchange.decode(other.token)).seed).toBe(11);
      });

    it('works for a puzzle without a seed (only the document matters)', async function () {
      ready();
      var r = Object.assign({}, realResult('classic9', 'easy', 5), { seed: null });
      var link = await E.buildPlayLink(r, { generatedAt: FIXED.generatedAt });
      var doc = await SG.exchange.decode(link.token);
      expect(doc.variantId).toBe('classic9');
      expect(doc.seed).toBeNull();
      expect(doc.givens).toEqual(arr(r.givens));
      expect(SG.model.create(doc.model).cellCount).toBe(81);
    });

    it('warns about a very long link: above the limit the flag is set, a compressed link stays short',
      async function () {
        ready();
        var base = realResult('classic9', 'easy', 5);
        var heavy = Object.assign({}, base, { warnings: ['x'.repeat(E.LONG_LINK_CHARS + 1000)] });
        var plain = await E.buildPlayLink(heavy, { compress: false });
        expect(plain.length).toBeGreaterThan(E.LONG_LINK_CHARS);
        expect(plain.long).toBe(true);
        var packed = await E.buildPlayLink(heavy);
        expect(packed.long).toBe(false);
        expect(packed.token.slice(0, 2)).toBe('z.');
      });

    it('a bad player address is a translated error, not an exception or a javascript: link',
      async function () {
        ready();
        var r = realResult('classic4', 'veryEasy', 1);
        expect(await codeOf(E.buildPlayLink(r, { base: 'javascript:alert(1)' }))).toBe('exchange.invalidUrl');
        expect(await codeOf(E.buildPlayLink(r, { base: 'https://a b/' }))).toBe('exchange.invalidUrl');
        var err = await E.buildPlayLink(r, { base: 'data:text/html,x' }).then(function () { return null; },
          function (e) { return e; });
        expect(err.code).toBe('exchange.invalidUrl');
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () {
            expect(SG.i18n.tError(err)).not.toBe('exchange.invalidUrl');
            expect(SG.i18n.has('error.exchange.invalidUrl')).toBe(true);
          });
        });
        expect(SG.i18n.tError(err)).not.toBe(inLocale('vi', function () { return SG.i18n.tError(err); }));
      });

    it('opens the link in a new tab with noopener', function () {
      var calls = [];
      var saved = root.open;
      root.open = function () { calls.push(Array.prototype.slice.call(arguments)); return null; };
      try {
        E.openPlayLink(BASE + '#puzzle=j.abc');
      } finally {
        if (saved === undefined) delete root.open;
        else root.open = saved;
      }
      expect(calls).toEqual([[BASE + '#puzzle=j.abc', '_blank', 'noopener']]);
    });

    it('does nothing where there is no window.open', function () {
      var saved = root.open;
      delete root.open;
      try {
        E.openPlayLink(BASE + '#puzzle=j.abc');
      } finally {
        if (saved !== undefined) root.open = saved;
      }
    });

    it('playOnline (the Play button) opens the link of the puzzle on screen and says so', async function () {
      ready();
      var shown = null;
      var toasts = [];
      var fakeApp = {
        on: function () { return function () {}; },
        getResult: function () { return shown; },
        toast: function (kind, key) { toasts.push(kind + ':' + key); }
      };
      var calls = [];
      var saved = root.open;
      root.open = function () { calls.push(Array.prototype.slice.call(arguments)); return null; };
      try {
        E.init(fakeApp);
        expect(await E.playOnline()).toBe(null);
        expect(calls).toEqual([]);
        shown = { result: realResult('classic4', 'veryEasy', 1), trace: [] };
        var info = await E.playOnline();
        expect(calls.length).toBe(1);
        expect(calls[0][0]).toBe(info.url);
        expect(info.url.indexOf(BASE + '#puzzle=')).toBe(0);
        expect(SG.exchange.isTextToken(info.token)).toBe(true);
        expect(info.url.slice(-'&active=1'.length)).toBe('&active=1');
        expect(calls[0].slice(1)).toEqual(['_blank', 'noopener']);
        expect(toasts).toEqual(['info:export.playOnline.opened']);
        expect(info.count).toBe(1);
        var text = await SG.exchange.decodeText(info.token);
        expect(text).toBe(E.buildExportText([{ result: shown.result }]));
        expect(text.indexOf('#1,')).toBe(0);
      } finally {
        if (saved === undefined) delete root.open;
        else root.open = saved;
        E.init({ on: function () {}, getResult: function () { return null; }, toast: function () {} });
      }
    });

    it('buildPlayBundle: the text of every puzzle in one compressed token, the active one by number',
      async function () {
        ready();
        var list = [realResult('classic4', 'veryEasy', 1), realResult('classic6', 'veryEasy', 2),
          realResult('killer', 'easy', 11)];
        var link = await E.buildPlayBundle(list, { active: 2 });
        expect(link.count).toBe(3);
        expect(link.active).toBe(2);
        expect(link.base).toBe(BASE);
        expect(link.token.slice(0, 2)).toBe('t.');
        expect(link.url).toBe(BASE + '#puzzle=' + link.token + '&active=3');
        expect(link.length).toBe(link.url.length);
        expect(link.long).toBe(false);
        var hash = link.url.slice(link.url.indexOf('#'));
        expect(SG.exchange.tokenFromHash(hash)).toBe(link.token);
        expect(SG.exchange.activeFromHash(hash)).toBe(3);
        var text = await SG.exchange.decodeText(link.token);
        expect(text).toBe(E.buildExportText(list.map(function (result) { return { result: result }; })));
        expect(count(text, '#')).toBeGreaterThan(2);
        expect(text).toContain('cages:');
        // the order of the list is the order of the text
        expect(text.indexOf('#1,')).toBe(0);
        expect(text.indexOf('#2,')).toBeGreaterThan(0);
        expect(text.indexOf('#3,')).toBeGreaterThan(text.indexOf('#2,'));
        var plain = await E.buildPlayBundle(list, { compress: false, base: 'http://localhost:8080/player/' });
        expect(plain.url.indexOf('http://localhost:8080/player/#puzzle=s.')).toBe(0);
        expect(plain.active).toBe(0);
        expect(plain.url.slice(-'&active=1'.length)).toBe('&active=1');
      });

    it('buildPlayBundle: an active index that is not in the list falls back to the first puzzle',
      async function () {
        ready();
        var list = [realResult('classic4', 'veryEasy', 1), realResult('classic4', 'veryEasy', 2)];
        for (var bad of [-1, 2, 5, 1.5, null, 'x']) {
          var link = await E.buildPlayBundle(list, { active: bad });
          expect(link.active).toBe(0);
          expect(link.url.slice(-'&active=1'.length)).toBe('&active=1');
        }
      });

    it('buildPlayBundle: 100 puzzles stay far below the limit of a link, and a bad address is an error',
      async function () {
        ready();
        var one = realResult('classic9', 'easy', 5);
        var many = [];
        for (var i = 0; i < 100; i++) many.push(one);
        var link = await E.buildPlayBundle(many, { active: 99 });
        expect(link.count).toBe(100);
        expect(link.long).toBe(false);
        expect(link.length).toBeLessThan(E.LONG_LINK_CHARS);
        expect(link.url.slice(-'&active=100'.length)).toBe('&active=100');
        var bad = E.buildPlayBundle([one], { base: 'javascript:alert(1)' });
        expect(await codeOf(bad)).toBe('exchange.invalidUrl');
        var none = await E.buildPlayBundle([]).then(function () { return null; }, function (e) { return e; });
        expect(none).not.toBe(null);
      });

    it('playOnline sends the whole list, generating again what is not at hand, and the puzzle on screen is ' +
      'active',
      async function () {
        ready();
        var screen = realResult('classic4', 'veryEasy', 1);
        var older = realResult('classic4', 'veryEasy', 2);
        var oldest = realResult('classic6', 'veryEasy', 3);
        // Saved list, newest first: the puzzle on screen is the second one.
        var entries = [older, screen, oldest].map(function (r, i) {
          return SG.history.entryOf(r, 3000 - i);
        });
        var savedList = SG.history.list;
        SG.history.list = function () { return entries; };
        var toasts = [];
        var fakeApp = {
          on: function () { return function () {}; },
          getResult: function () { return { result: screen, trace: [] }; },
          toast: function (kind, key) { toasts.push(kind + ':' + key); }
        };
        var calls = [];
        var savedOpen = root.open;
        root.open = function () { calls.push(Array.prototype.slice.call(arguments)); return null; };
        try {
          E.init(fakeApp);
          var info = await E.playOnline();
          expect(info.count).toBe(3);
          expect(info.active).toBe(1);
          expect(info.url.slice(-'&active=2'.length)).toBe('&active=2');
          expect(calls.length).toBe(1);
          var text = await SG.exchange.decodeText(info.token);
          var expected = E.buildExportText([older, screen, oldest].map(function (result) {
            return { result: result };
          }));
          expect(text).toBe(expected);
          expect(count(text, '\n#')).toBe(2);
          expect(toasts).toEqual(['info:export.playOnline.opened']);
        } finally {
          SG.history.list = savedList;
          if (savedOpen === undefined) delete root.open;
          else root.open = savedOpen;
          E.init({ on: function () {}, getResult: function () { return null; }, toast: function () {} });
        }
      });

    it('init: the action { id: "play" } calls playOnline, other actions do not open the player',
      async function () {
        ready();
        if (!NODE) SG.test.skip('needs the file system (Node only)');
        // A private copy of the module, so that its one-time listener is registered on a fake app.
        var fresh = { SG: Object.assign({}, SG) };
        delete fresh.SG.exportUi;
        fresh.SG.localeFragments = [];
        var source = NODE.fs.readFileSync(NODE.path.join(NODE.root, 'js/ui/export.js'), 'utf8');
        var opened = [];
        fresh.open = function () { opened.push(Array.prototype.slice.call(arguments)); return null; };
        new Function('self', source)(fresh);
        var module = fresh.SG.exportUi;
        expect(typeof module.init).toBe('function');
        var handlers = {};
        var toasts = [];
        var shown = { result: realResult('classic4', 'veryEasy', 1), trace: [] };
        module.init({
          on: function (name, fn) { handlers[name] = fn; return function () {}; },
          getResult: function () { return shown; },
          toast: function (kind, key) { toasts.push(kind + ':' + key); },
          openModal: function () { throw new Error('the dialog must not open for a play action'); }
        });
        expect(typeof handlers.action).toBe('function');
        handlers.action({ id: 'settings' });
        handlers.action(null);
        handlers.action({ id: 'play' });
        for (var wait = 0; wait < 100 && opened.length === 0; wait++) {
          await new Promise(function (resolve) { setTimeout(resolve, 20); });
        }
        expect(opened.length).toBe(1);
        expect(opened[0][0].indexOf(BASE + '#puzzle=')).toBe(0);
        expect(/#puzzle=[ts]\./.test(opened[0][0])).toBe(true);
        expect(opened[0].slice(1)).toEqual(['_blank', 'noopener']);
        expect(toasts).toEqual(['info:export.playOnline.opened']);
      });
  });

  describe('export: SVG of a puzzle', function () {
    it('a standalone SVG document with the viewBox of the board and nothing of the replay in it',
      function () {
        ready();
        var r = realResult('classic9', 'easy', 5);
        var svg = E.boardSvg(r, { tokens: {} });
        expect(svg.indexOf('<?xml')).toBe(0);
        expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(svg).toMatch(/viewBox="0 0 372 372" width="372" height="372"/);
        expect(svg).toContain('<title id="sgb-title">Sudoku board: Classic Sudoku 9\u00d79</title>');
        // the clues and nothing else: one <text> per clue
        var clues = arr(r.givens).filter(function (v) { return v > 0; }).length;
        expect(count(svg, 'class="val val--given"')).toBe(clues);
        expect(count(svg, 'class="val val--solution"')).toBe(0);
        expect(count(svg, 'class="val val--placed"')).toBe(0);
      });

    it('the solution version fills the empty cells in the solution style and keeps the clues bold',
      function () {
        ready();
        var r = realResult('classic9', 'easy', 5);
        var svg = E.boardSvg(r, { solution: true, tokens: {} });
        var clues = arr(r.givens).filter(function (v) { return v > 0; }).length;
        expect(count(svg, 'class="val val--given"')).toBe(clues);
        expect(count(svg, 'class="val val--solution"')).toBe(81 - clues);
      });

    it('the paper look: no tint behind regions and cages, one dark ink, the meaningful tints kept',
      function () {
        ready();
        var tokens = fakeTokens();
        var jigsaw = realResult('jigsaw9', 'easy', 5);
        var screen = E.boardSvg(jigsaw, { tokens: tokens });
        var paper = E.boardSvg(jigsaw, { tokens: tokens, print: true });
        expect(screen).toContain('class="reg reg--');
        expect(paper).not.toContain('class="reg reg--');
        expect(paper).toContain('stroke:T<line-thick>');
        expect(paper).not.toContain('T<line-thin>');
        expect(paper).toContain('.val--given{fill:T<ink-given>');
        expect(paper).toContain('.val--solution{fill:T<ink-given>');
        var killer = realResult('killer', 'easy', 5);
        var kPaper = E.boardSvg(killer, { tokens: tokens, print: true });
        expect(kPaper).toContain('.ov--cage0{fill:transparent}');
        expect(kPaper).not.toContain('T<cage-0>');
        expect(kPaper).toContain('.cage-line{fill:none;stroke:T<ink-given>');
        expect(kPaper).toContain('.cage-sum{fill:T<ink-given>');
        expect(count(kPaper, 'class="cage-line"')).toBe(killer.model.cages.length);
        var diag = E.boardSvg(realResult('diagonalX', 'easy', 5), { tokens: tokens, print: true });
        expect(diag).toContain('.ov--diag{fill:T<overlay-diag>');
        var gt = E.boardSvg(realResult('greaterThan', 'easy', 5), { tokens: tokens, print: true });
        expect(gt).toContain('.sign{fill:none;stroke:T<ink-given>');
      });

    it('printTokens is pure: the input is untouched and a missing ink leaves the lines alone', function () {
      ready();
      var base = fakeTokens();
      var before = JSON.stringify(base);
      var out = E.printTokens(base);
      expect(JSON.stringify(base)).toBe(before);
      expect(out['--sg-board-region-3']).toBe('transparent');
      expect(out['--sg-board-cage-4']).toBe('transparent');
      expect(out['--sg-board-line-thin']).toBe(base['--sg-board-line-thick']);
      expect(E.printTokens({})['--sg-board-region-1']).toBe('transparent');
      expect(E.printTokens({})['--sg-board-sign']).toBeUndefined();
    });
  });

  describe('export: strings', function () {
    function fragments(prefix) {
      return (SG.localeFragments || []).filter(function (f) {
        return Object.keys(f.en).some(function (key) { return key.indexOf(prefix) === 0; });
      });
    }

    it('every key that the code asks for exists, and every export.* key is used', function () {
      ready();
      if (!NODE) SG.test.skip('needs the file system (Node only)');
      var env = NODE;
      var source = env.fs.readFileSync(env.path.join(env.root, 'js/ui/export.js'), 'utf8');
      var used = {};
      (source.match(/'export\.[A-Za-z0-9.]+'/g) || []).forEach(function (q) { used[q.slice(1, -1)] = true; });
      var f = fragments('export.')[0];
      var defined = {};
      Object.keys(f.en).forEach(function (key) { defined[key] = true; });
      var missing = Object.keys(used).filter(function (key) { return !defined[key]; });
      expect(missing).toEqual([]);
      var unused = Object.keys(defined).filter(function (key) { return !used[key]; });
      expect(unused).toEqual([]);
    });
  });

  describe('export: css/print.css', function () {
    function css() {
      if (!NODE) SG.test.skip('needs the file system (Node only)');
      return NODE.fs.readFileSync(NODE.path.join(NODE.root, 'css/print.css'), 'utf8');
    }

    it('hides everything but #print-root, sets the page, breaks pages and lays out 1, 2, 4 and 6 per page',
      function () {
        var text = css();
        expect(text).toContain('@page');
        expect(text).toMatch(/margin:\s*12mm/);
        expect(text).toContain('body > *:not(#print-root)');
        expect(text).toMatch(/#print-root\[hidden\][\s\S]*display:\s*block\s*!important/);
        expect(text).toContain('break-after: page');
        expect(text).toContain('page-break-after: always');
        expect(text).toContain('break-inside: avoid');
        expect(text).toContain('[data-columns="2"]');
        expect(text).toContain('[data-rows="2"]');
        expect(text).toContain('[data-rows="3"]');
        expect(text).toContain('object-fit: contain');
      });

    it('the index page links it for print only', function () {
      if (!NODE) SG.test.skip('needs the file system (Node only)');
      var html = NODE.fs.readFileSync(NODE.path.join(NODE.root, 'index.html'), 'utf8');
      expect(html).toContain('<link rel="stylesheet" href="css/print.css" media="print">');
    });
  });
})();
