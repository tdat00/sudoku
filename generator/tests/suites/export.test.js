// Export and print (tasks T-7.1 and T-7.8): the pure parts of SG.exportUi that run on Node: file names, the page plan of a
// print job, the seeds of a batch, the text line, the JSON document of design.md 14.1 (with its `model` block),
// the "Play online" link to sudoku-player, the standalone SVG of a
// puzzle (and its paper look), the batch generation with an independent client, and the strings of the dialog.
// The dialog, the downloads and the print path need a DOM and are verified in the browser.
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
    SG.boardView.TOKEN_NAMES.forEach(function (name) { out[name] = 'T<' + name.replace('--sg-board-', '') + '>'; });
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // File names
  // ---------------------------------------------------------------------------------------------

  describe('export: file names', function () {
    it('sudoku-<variant>-<level>-<seed>.<ext> in English', function () {
      ready();
      var r = realResult('classic9', 'easy', 5);
      expect(E.fileName(r, 'json')).toBe('sudoku-classic-9x9-' + r.rating.level.toLowerCase() + '-5.json');
      expect(E.fileName(r, 'PNG')).toMatch(/\.png$/);
      expect(E.fileName(r, 'txt')).toMatch(/^sudoku-[a-z0-9-]+\.txt$/);
      expect(E.fileName(realResult('killer', 'easy', 5), 'svg')).toMatch(/^sudoku-killer-[a-z-]+-5\.svg$/);
      expect(E.fileName(realResult('jigsaw9', 'easy', 5), 'svg')).toMatch(/^sudoku-jigsaw-/);
    });

    it('in Vietnamese the words are translated and have no accents, spaces or odd characters', function () {
      ready();
      inLocale('vi', function () {
        var r = realResult('classic9', 'easy', 5);
        var name = E.fileName(r, 'json');
        expect(name).toMatch(/^sudoku-co-dien-9x9-[a-z-]+-5\.json$/);
        expect(name).not.toBe(inLocale('en', function () { return E.fileName(r, 'json'); }));
        ['killer', 'greaterThan', 'jigsaw9', 'wordoku', 'mega16', 'diagonalX', 'hyper', 'samurai', 'flower']
          .forEach(function (id) {
            var other = SG.variants.get(id).difficultySupport[0];
            expect(E.fileName(realResult(id, other, 5), 'png')).toMatch(/^sudoku-[a-z0-9]+(-[a-z0-9]+)*-5\.png$/);
          });
      });
    });

    it('adds a suffix before the extension, and leaves the seed out when the puzzle has none', function () {
      ready();
      var r = realResult('classic4', 'veryEasy', 9);
      expect(E.fileName(r, 'png', { suffix: 'solution' })).toMatch(/-9-solution\.png$/);
      var imported = Object.assign({}, r, { seed: null });
      expect(E.fileName(imported, 'txt')).toMatch(/^sudoku-classic-4x4-[a-z-]+\.txt$/);
      expect(E.fileName(imported, 'txt')).not.toMatch(/-null/);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The page plan
  // ---------------------------------------------------------------------------------------------

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

    it('solutions follow on pages of their own, in the same order and with the same arrangement', function () {
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

  // ---------------------------------------------------------------------------------------------
  // Batch seeds
  // ---------------------------------------------------------------------------------------------

  describe('export: batch seeds', function () {
    it('n distinct uint32 seeds; the first is the base seed; the same base gives the same batch', function () {
      ready();
      [0, 1, 42, 123456789, 4294967295].forEach(function (base) {
        var seeds = E.batchSeeds(base, E.MAX_BATCH);
        expect(seeds.length).toBe(E.MAX_BATCH);
        expect(seeds[0]).toBe(base);
        expect(new Set(seeds).size).toBe(E.MAX_BATCH);
        seeds.forEach(function (s) {
          expect(Number.isInteger(s) && s >= 0 && s <= 4294967295).toBe(true);
        });
        expect(E.batchSeeds(base, E.MAX_BATCH)).toEqual(seeds);
        expect(E.batchSeeds(base, 6)).toEqual(seeds.slice(0, 6));
      });
    });

    it('different bases give different batches; zero or a nonsense count gives nothing', function () {
      ready();
      expect(E.batchSeeds(1, 6).slice(1)).not.toEqual(E.batchSeeds(2, 6).slice(1));
      expect(E.batchSeeds(7, 0)).toEqual([]);
      expect(E.batchSeeds(7, -3)).toEqual([]);
      expect(E.batchSeeds(7, NaN)).toEqual([]);
      expect(E.batchSeeds(-1, 2)[0]).toBe(4294967295);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------------------------

  describe('export: text', function () {
    it('a classic 9x9 is 81 characters, "." for empty, the digits otherwise', function () {
      ready();
      var r = realResult('classic9', 'easy', 5);
      var line = E.toText(r);
      expect(line.length).toBe(81);
      expect(/^[1-9.]{81}$/.test(line)).toBe(true);
      expect(81 - count(line, '.')).toBe(arr(r.givens).filter(function (v) { return v > 0; }).length);
      for (var i = 0; i < 81; i++) expect(line[i] === '.' ? 0 : Number(line[i])).toBe(r.givens[i]);
      var solution = E.toText(r, { solution: true });
      expect(/^[1-9]{81}$/.test(solution)).toBe(true);
      expect(E.textSupport(r)).toEqual({ ok: true, notes: [], reason: null });
    });

    it('4x4 and 6x6 give 16 and 36 characters; 12x12 and 16x16 write 10 and above as A, B, C', function () {
      ready();
      expect(E.toText(realResult('classic4', 'easy', 1)).length).toBe(16);
      expect(E.toText(realResult('classic6', 'easy', 1)).length).toBe(36);
      var m12 = realResult('mega12', 'veryEasy', 1);
      var m16 = realResult('mega16', 'veryEasy', 1);
      expect(E.toText(m12, { solution: true })).toMatch(/^[1-9ABC]{144}$/);
      expect(E.toText(m16, { solution: true })).toMatch(/^[1-9A-G]{256}$/);
      expect(E.toText(m16, { solution: true })).toContain('G');
    });

    it('says what a line leaves out: the extra rule, the symbol set', function () {
      ready();
      expect(E.textSupport(realResult('diagonalX', 'easy', 1)).notes).toEqual(['export.text.note.rules']);
      expect(E.textSupport(realResult('hyper', 'easy', 1)).notes).toEqual(['export.text.note.rules']);
      expect(E.textSupport(realResult('wordoku', 'easy', 1)).notes).toEqual(['export.text.note.symbols']);
      expect(E.textSupport(realResult('mega12', 'veryEasy', 1)).notes).toEqual(['export.text.note.symbols']);
      expect(E.toText(realResult('diagonalX', 'easy', 1)).length).toBe(81);
    });

    it('is not offered, with a reason, where a line would lose data: Jigsaw, Killer, Greater-Than, multi-grid', function () {
      ready();
      var expected = { jigsaw9: 'export.text.reason.regions', killer: 'export.text.reason.cages',
        greaterThan: 'export.text.reason.signs', samurai: 'export.text.reason.grids',
        sohei: 'export.text.reason.grids', butterfly: 'export.text.reason.grids',
        flower: 'export.text.reason.grids' };
      Object.keys(expected).forEach(function (id) {
        var level = SG.variants.get(id).difficultySupport[0];
        var r = realResult(id, level, 1);
        var support = E.textSupport(r);
        expect(support.ok).toBe(false);
        expect(support.reason).toBe(expected[id]);
        expect(E.toText(r)).toBeNull();
        expect(E.toText(r, { solution: true })).toBeNull();
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () {
            expect(SG.i18n.has(support.reason)).toBe(true);
            expect(SG.i18n.t(support.reason)).not.toBe(support.reason);
          });
        });
      });
    });

    it('no solution known: no solution text', function () {
      ready();
      var r = Object.assign({}, realResult('classic9', 'easy', 5), { solution: new Int32Array(81) });
      expect(E.toText(r, { solution: true })).toBeNull();
      expect(E.toText(r)).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // JSON
  // ---------------------------------------------------------------------------------------------

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
      expect(typeof E.toJson(realResult('classic4', 'easy', 1)).generatedAt).toBe('string');
      expect(new Date(E.toJson(realResult('classic4', 'easy', 1)).generatedAt).getTime()).toBeGreaterThan(0);
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

    it('names the variant, the levels and the technique in the language of the export (rule L6)', function () {
      ready();
      var r = realResult('killer', 'medium', 25);
      var en = inLocale('en', function () { return E.toJson(r, FIXED); });
      var vi = inLocale('vi', function () { return E.toJson(r, FIXED); });
      expect(en.locale).toBe('en');
      expect(vi.locale).toBe('vi');
      expect(en.labels.variant).toBe('Killer Sudoku');
      expect(vi.labels.variant).toBe('Sudoku Sát thủ');
      expect(vi.labels.achieved).not.toBe(en.labels.achieved);
      expect(vi.labels.requested).toBe('Trung bình');
      expect(en.labels.requested).toBe('Medium');
      expect(vi.labels.hardestTechnique).not.toBeNull();
      expect(vi.difficulty.requested).toBe('medium');
      expect(vi.givens).toEqual(en.givens);
      expect(E.toJson(r, { generatedAt: FIXED.generatedAt, locale: 'vi' }).locale).toBe('vi');
    });

    it('formatJson: two-space indent, one board row per line for the grids, a final newline', function () {
      ready();
      var d = E.toJson(realResult('classic9', 'easy', 5), FIXED);
      var text = E.formatJson(d);
      expect(text.charAt(0)).toBe('{');
      expect(text.slice(-2)).toBe('}\n');
      var lines = text.split('\n');
      var start = lines.indexOf('  "givens": [');
      expect(start).toBeGreaterThan(0);
      for (var r = 0; r < 9; r++) {
        expect(lines[start + 1 + r]).toMatch(/^ {4}[0-9](, [0-9]){8},?$/);
      }
      expect(lines[start + 10]).toBe('  ],');
      expect(JSON.parse(text)).toEqual(d);
      var killer = E.toJson(realResult('killer', 'easy', 11), FIXED);
      var kText = E.formatJson(killer);
      expect(kText).toMatch(/\n {4}\{"cells":\[\d+(,\d+)*\],"sum":\d+,"distinct":true\}/);
      expect(JSON.parse(kText)).toEqual(killer);
    });

    it('a puzzle without a known solution writes "solution": null', function () {
      ready();
      var r = Object.assign({}, realResult('classic9', 'easy', 5), { solution: new Int32Array(81) });
      expect(E.toJson(r, FIXED).solution).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Play online (hand-off to sudoku-player)
  // ---------------------------------------------------------------------------------------------

  describe('export: Play online (the link to sudoku-player)', function () {
    var FIXED = { generatedAt: '2026-10-15T11:00:00.000Z' };
    var BASE = 'https://tdat00.github.io/sudoku-player/';

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
    });

    it('builds the link: the base, then #puzzle= and a token that decodes to the document of toJson', async function () {
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

    it('works for an imported puzzle (only the document matters), with no seed', async function () {
      ready();
      var imported = SG.importUi.toResult(SG.importUi.importText(
        E.formatJson(E.toJson(realResult('classic9', 'easy', 5), FIXED))));
      var link = await E.buildPlayLink(imported, { generatedAt: FIXED.generatedAt });
      var doc = await SG.exchange.decode(link.token);
      expect(doc.variantId).toBe('classic9');
      expect(doc.givens).toEqual(arr(imported.givens));
      expect(SG.model.create(doc.model).cellCount).toBe(81);
    });

    it('warns about a very long link: above the limit the flag is set, a compressed link stays short', async function () {
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

    it('a bad player address is a translated error, not an exception or a javascript: link', async function () {
      ready();
      var r = realResult('classic4', 'easy', 1);
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

    it('playOnline (the result panel button) opens the link of the puzzle on screen and says so', async function () {
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
        shown = { result: realResult('classic4', 'easy', 1), trace: [] };
        var info = await E.playOnline();
        expect(calls.length).toBe(1);
        expect(calls[0][0]).toBe(info.url);
        expect(info.url.indexOf(BASE + '#puzzle=')).toBe(0);
        expect(calls[0].slice(1)).toEqual(['_blank', 'noopener']);
        expect(toasts).toEqual(['info:export.playOnline.opened']);
        var doc = await SG.exchange.decode(info.token);
        expect(doc.variantId).toBe('classic4');
        expect(SG.model.create(doc.model).cellCount).toBe(16);
      } finally {
        if (saved === undefined) delete root.open;
        else root.open = saved;
        E.init({ on: function () {}, getResult: function () { return null; }, toast: function () {} });
      }
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The picture
  // ---------------------------------------------------------------------------------------------

  describe('export: SVG of a puzzle', function () {
    it('a standalone SVG document with the viewBox of the board and nothing of the replay in it', function () {
      ready();
      var r = realResult('classic9', 'easy', 5);
      var svg = E.boardSvg(r, { tokens: {} });
      expect(svg.indexOf('<?xml')).toBe(0);
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toMatch(/viewBox="0 0 372 372" width="372" height="372"/);
      expect(svg).toContain('<title id="sgb-title">Sudoku board: Classic Sudoku 9\u00d79</title>');
      expect(E.svgSize(svg)).toEqual({ width: 372, height: 372 });
      // the clues and nothing else: one <text> per clue
      var clues = arr(r.givens).filter(function (v) { return v > 0; }).length;
      expect(count(svg, 'class="val val--given"')).toBe(clues);
      expect(count(svg, 'class="val val--solution"')).toBe(0);
      expect(count(svg, 'class="val val--placed"')).toBe(0);
    });

    it('the solution version fills the empty cells in the solution style and keeps the clues bold', function () {
      ready();
      var r = realResult('classic9', 'easy', 5);
      var svg = E.boardSvg(r, { solution: true, tokens: {} });
      var clues = arr(r.givens).filter(function (v) { return v > 0; }).length;
      expect(count(svg, 'class="val val--given"')).toBe(clues);
      expect(count(svg, 'class="val val--solution"')).toBe(81 - clues);
    });

    it('the paper look: no tint behind regions and cages, one dark ink, the meaningful tints kept', function () {
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

    it('a caption names the variant, the level, the seed and the clues, in the current language', function () {
      ready();
      var r = realResult('classic9', 'easy', 5);
      var plain = E.boardSvg(r, { tokens: {} });
      var en = inLocale('en', function () { return E.boardSvg(r, { tokens: {}, caption: true }); });
      var vi = inLocale('vi', function () { return E.boardSvg(r, { tokens: {}, caption: true }); });
      expect(count(en, 'class="cap')).toBe(2);
      expect(en).toContain('Classic Sudoku 9\u00d79');
      expect(en).toContain('Seed: 5'.replace('Seed: ', 'Seed '));
      expect(vi).toContain('Sudoku cổ điển 9\u00d79');
      expect(vi).toContain('Seed: 5');
      expect(vi).not.toContain('Classic Sudoku');
      var size = E.svgSize(en);
      expect(size.width).toBe(372);
      expect(size.height).toBeGreaterThan(372);
      expect(en).toContain('<svg x="0" y="');
      expect(count(en, '<svg ')).toBe(2);
      expect(en.indexOf('<?xml')).toBe(0);
      expect(en).toContain(plain.slice(plain.indexOf('<style>'), plain.indexOf('</style>')));
      var solution = E.boardSvg(r, { tokens: {}, caption: true, solution: true });
      expect(solution).toContain('Solution');
      expect(E.boardSvg(r, { tokens: {}, caption: true })).not.toContain('Solution \u00b7');
    });

    it('a caption survives a very long name on a small board', function () {
      ready();
      var r = realResult('classic4', 'easy', 123456);
      var svg = E.boardSvg(r, { tokens: {}, caption: true });
      var size = E.svgSize(svg);
      expect(size.width).toBe(172);
      var m = /font-size="(\d+)"/.exec(svg);
      expect(Number(m[1])).toBeGreaterThanOrEqual(7);
      expect(Number(m[1])).toBeLessThanOrEqual(14);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------------------------

  describe('export: files', function () {
    function readBlob(blob) {
      return blob.text();
    }

    it('makeFile builds the JSON, the text and the SVG file with their names and types', function () {
      ready();
      var r = realResult('classic9', 'easy', 5);
      return E.makeFile(r, 'json', { generatedAt: '2026-01-01T00:00:00.000Z' }).then(function (file) {
        expect(file.name).toBe(E.fileName(r, 'json'));
        expect(file.blob.type).toBe('application/json');
        return readBlob(file.blob);
      }).then(function (text) {
        expect(JSON.parse(text).variantId).toBe('classic9');
        return E.makeFile(r, 'text', { solution: true });
      }).then(function (file) {
        expect(file.name).toBe(E.fileName(r, 'txt', { suffix: 'solution' }));
        return readBlob(file.blob);
      }).then(function (text) {
        expect(text).toBe(E.toText(r, { solution: true }) + '\n');
        return E.makeFile(r, 'svg', { caption: true });
      }).then(function (file) {
        expect(file.name).toBe(E.fileName(r, 'svg'));
        expect(file.blob.type).toBe('image/svg+xml');
        return readBlob(file.blob);
      }).then(function (text) {
        expect(text.indexOf('<?xml')).toBe(0);
        expect(count(text, '<svg ')).toBe(2);
      });
    });

    it('makeFile refuses what it cannot make, with a rejection and not an exception', function () {
      ready();
      var killer = realResult('killer', 'easy', 5);
      return E.makeFile(killer, 'text').then(function () {
        throw new Error('the text of a Killer puzzle must be refused');
      }, function (err) {
        expect(err instanceof Error).toBe(true);
        return E.makeFile(killer, 'pdf');
      }).then(function () {
        throw new Error('an unknown format must be refused');
      }, function (err) {
        expect(err instanceof Error).toBe(true);
        if (typeof document !== 'undefined') return null;
        return E.makeFile(killer, 'png').then(function () {
          throw new Error('without a canvas there is no PNG');
        }, function (pngErr) {
          expect(pngErr instanceof Error).toBe(true);
        });
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Batch generation
  // ---------------------------------------------------------------------------------------------

  describe('export: batch generation', function () {
    function fakeClient(log, options) {
      var o = options || {};
      return {
        generate: function (config) {
          log.requests.push(config);
          if (o.failAt !== undefined && log.requests.length === o.failAt) {
            return Promise.reject(new SG.errors.GenerationError('budget.exceeded', {}));
          }
          return Promise.resolve({ config: config, seed: config.seed, marker: log.requests.length });
        },
        cancel: function () { log.cancelled++; }
      };
    }

    it('asks for one puzzle per derived seed, trace off, the same configuration, and reuses the first result', function () {
      ready();
      var first = realResult('classic9', 'easy', 5);
      var log = { requests: [], cancelled: 0, progress: [] };
      var batch = E.createBatch({ config: first.config, count: 4, first: first, client: fakeClient(log),
        onProgress: function (done, total) { log.progress.push([done, total]); } });
      return batch.promise.then(function (results) {
        expect(results.length).toBe(4);
        expect(results[0]).toBe(first);
        var seeds = E.batchSeeds(5, 4);
        expect(log.requests.map(function (c) { return c.seed; })).toEqual(seeds.slice(1));
        log.requests.forEach(function (c) {
          expect(c.trace).toBe('off');
          expect(c.variantId).toBe('classic9');
          expect(c.difficulty).toBe(first.config.difficulty);
          expect(c.symmetry).toBe(first.config.symmetry);
          expect(c.variantOptions).toEqual(first.config.variantOptions);
        });
        expect(results.map(function (r) { return r.seed; }).slice(1)).toEqual(seeds.slice(1));
        expect(log.progress).toEqual([[1, 4], [2, 4], [3, 4], [4, 4]]);
        expect(first.config.trace).not.toBe(undefined);
        expect(first.config.seed).toBe(5);
      });
    });

    it('without a first result it generates all of them, starting with the base seed', function () {
      ready();
      var config = realResult('classic4', 'easy', 8).config;
      var log = { requests: [], cancelled: 0 };
      return E.createBatch({ config: config, count: 3, client: fakeClient(log) }).promise.then(function (results) {
        expect(results.length).toBe(3);
        expect(log.requests.map(function (c) { return c.seed; })).toEqual(E.batchSeeds(8, 3));
      });
    });

    it('cancel stops the run, cancels the client and rejects with budget.cancelled (translated)', function () {
      ready();
      var config = realResult('classic4', 'easy', 8).config;
      var log = { requests: [], cancelled: 0 };
      var batch = E.createBatch({ config: config, count: 5, client: fakeClient(log) });
      batch.cancel();
      batch.cancel();
      return batch.promise.then(function () {
        throw new Error('a cancelled batch must not resolve');
      }, function (err) {
        expect(err.code).toBe('budget.cancelled');
        expect(log.cancelled).toBe(1);
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () { expect(SG.i18n.tError(err)).not.toBe('error.budget.cancelled'); });
        });
        return new Promise(function (resolve) { setTimeout(resolve, 20); });
      }).then(function () {
        expect(log.requests.length).toBeLessThanOrEqual(1);
      });
    });

    it('a failing puzzle ends the batch with that error (translatable), later puzzles are not requested', function () {
      ready();
      var config = realResult('classic4', 'easy', 8).config;
      var log = { requests: [], cancelled: 0 };
      var batch = E.createBatch({ config: config, count: 6, client: fakeClient(log, { failAt: 2 }) });
      return batch.promise.then(function () {
        throw new Error('must reject');
      }, function (err) {
        expect(err.code).toBe('budget.exceeded');
        expect(log.requests.length).toBe(2);
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () { expect(SG.i18n.tError(err)).not.toBe('error.budget.exceeded'); });
        });
        batch.cancel();
      });
    });

    it('the local fallback runs SG.pipeline.run on the main thread and gives real, different puzzles', function () {
      ready();
      var first = realResult('classic4', 'easy', 8);
      var progress = [];
      return E.createBatch({ config: first.config, count: 3, first: first, forceLocal: true,
        onProgress: function (done) { progress.push(done); } }).promise.then(function (results) {
        expect(results.length).toBe(3);
        expect(progress).toEqual([1, 2, 3]);
        var seeds = E.batchSeeds(8, 3);
        results.forEach(function (r, i) {
          expect(r.seed).toBe(seeds[i]);
          expect(arr(SG.dfs.solve(r.model, r.givens))).toEqual(arr(r.solution));
        });
        var texts = results.map(function (r) { return E.toText(r); });
        expect(new Set(texts).size).toBe(3);
        // the same seeds give the same puzzles as a direct run
        var direct = SG.pipeline.run(Object.assign({}, first.config, { seed: seeds[2], trace: 'off' }), null);
        expect(arr(results[2].givens)).toEqual(arr(direct.givens));
      });
    });

    it('an independent SG.workerClient (main-thread mode) does the same and is disposed afterwards', function () {
      ready();
      if (!SG.workerClient || typeof SG.workerClient.create !== 'function') SG.test.skip('no SG.workerClient.create');
      var first = realResult('classic4', 'easy', 8);
      return E.createBatch({ config: first.config, count: 3, first: first, clientOptions: {
        forceMode: 'main', yieldFn: function () { return Promise.resolve(); },
        paintFn: function () { return Promise.resolve(); } } }).promise.then(function (results) {
        expect(results.length).toBe(3);
        var seeds = E.batchSeeds(8, 3);
        expect(results.map(function (r) { return r.seed; })).toEqual(seeds);
        expect(arr(results[0].givens)).toEqual(arr(first.givens));
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Strings and the print style sheet
  // ---------------------------------------------------------------------------------------------

  describe('export: strings', function () {
    function fragments(prefix) {
      return (SG.localeFragments || []).filter(function (f) {
        return Object.keys(f.en).some(function (key) { return key.indexOf(prefix) === 0; });
      });
    }

    function placeholders(text) {
      return (text.match(/\{(\w+)\}/g) || []).sort().join(',');
    }

    ['export.', 'import.'].forEach(function (prefix) {
      it('the ' + prefix + '* fragment has the same keys in English and Vietnamese, none empty, same placeholders',
        function () {
          ready();
          var list = fragments(prefix);
          expect(list.length).toBe(1);
          var f = list[0];
          expect(Object.keys(f.en).sort()).toEqual(Object.keys(f.vi).sort());
          Object.keys(f.en).forEach(function (key) {
            expect(key.indexOf(prefix)).toBe(0);
            expect(typeof f.en[key] === 'string' && f.en[key].trim() !== '').toBe(true);
            expect(typeof f.vi[key] === 'string' && f.vi[key].trim() !== '').toBe(true);
            expect(placeholders(f.vi[key])).toBe(placeholders(f.en[key]));
          });
        });

      it('every ' + prefix + '* key is live in both packs and Vietnamese is not a copy of English', function () {
        ready();
        var f = fragments(prefix)[0];
        Object.keys(f.en).forEach(function (key) {
          var plural = /_(one|other)$/.test(key) ? key.replace(/_(one|other)$/, '') : key;
          ['en', 'vi'].forEach(function (code) {
            inLocale(code, function () { expect(SG.i18n.has(plural)).toBe(true); });
          });
          var words = f.en[key].replace(/\{\w+\}/g, '').trim().split(/\s+/);
          if (words.length > 1) expect(f.vi[key]).not.toBe(f.en[key]);
        });
      });
    });

    it('every key that the code asks for exists (a typo would show the bare key)', function () {
      ready();
      if (!NODE) SG.test.skip('needs the file system (Node only)');
      var env = NODE;
      var source = env.fs.readFileSync(env.path.join(env.root, 'js/ui/export.js'), 'utf8');
      var used = {};
      (source.match(/'export\.[A-Za-z0-9.]+'/g) || []).forEach(function (q) { used[q.slice(1, -1)] = true; });
      var f = fragments('export.')[0];
      var defined = {};
      Object.keys(f.en).forEach(function (key) { defined[key.replace(/_(one|other)$/, '')] = true; });
      var missing = Object.keys(used).filter(function (key) { return !defined[key]; });
      expect(missing).toEqual([]);
    });
  });

  describe('export: css/print.css', function () {
    function css() {
      if (!NODE) SG.test.skip('needs the file system (Node only)');
      return NODE.fs.readFileSync(NODE.path.join(NODE.root, 'css/print.css'), 'utf8');
    }

    it('hides everything but #print-root, sets the page, breaks pages and lays out 1, 2, 4 and 6 per page', function () {
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
