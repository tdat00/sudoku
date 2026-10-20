// Help: the guide (help.html, js/ui/help.js): its sections and texts in both languages, the examples of the
// techniques (every one replayed with the player's own hint code), the shortcuts it names, and the claims of the
// README, all checked against the code they describe.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.help;
  var NODE = SG.test.node;

  function ready() {
    if (!H || !SG.i18n || !SG.importer || !SG.techniques || !SG.play || !SG.helpExamples) {
      SG.test.skip('SG.help is not loaded here');
    }
  }

  function needNode() {
    if (!NODE || !NODE.fs) SG.test.skip('needs the Node file system; skipped in the browser');
    return NODE;
  }

  function read(rel) {
    var env = needNode();
    return env.fs.readFileSync(env.path.join(env.root, rel), 'utf8').replace(/^\uFEFF/, '');
  }

  function placeholders(text) {
    var found = {};
    String(text).replace(/\{(\w+)\}/g, function (m, name) { found[name] = true; return m; });
    return Object.keys(found).sort();
  }

  function bothLanguages(key) {
    ['en', 'vi'].forEach(function (code) {
      expect(typeof SG.locales[code][key]).toBe('string');
      expect(SG.locales[code][key].trim().length).toBeGreaterThan(0);
    });
    expect(placeholders(SG.locales.vi[key])).toEqual(placeholders(SG.locales.en[key]));
  }

  function inLocale(code, fn) {
    SG.i18n.setLocale(code);
    try {
      return fn();
    } finally {
      SG.i18n.setLocale('en');
    }
  }

  describe('help: the sections of the guide', function () {
    it('has the basics, the hints, the techniques and the keyboard, and no About or Variants', function () {
      ready();
      expect(H.SECTION_IDS).toEqual(['how', 'hints', 'techniques', 'keys']);
      H.SECTION_IDS.forEach(function (id) { bothLanguages('help.section.' + id); });
      ['help.page.title', 'help.page.lead', 'help.page.back', 'help.page.toc', 'help.page.skip']
        .forEach(bothLanguages);
      Object.keys(SG.locales.en).forEach(function (key) {
        expect(/^help\.(tab|about|variants?)\b/.test(key)).toBe(false);
      });
    });

    it('every step of the basics, every level of the hints and the technique texts exist in both languages', function () {
      ready();
      H.BASIC_STEPS.forEach(function (id) {
        bothLanguages('help.how.' + id + '.title');
        bothLanguages('help.how.' + id + '.text');
      });
      ['help.how.intro', 'help.how.checkModes', 'help.hints.intro', 'help.hints.sound', 'help.techniques.intro',
        'help.example.source', 'help.example.region', 'help.example.cells',
        'help.example.move', 'help.example.unavailable', 'help.example.legend.region', 'help.example.legend.cells',
        'help.example.legend.target', 'help.example.legend.elim', 'help.example.legend.keep'].forEach(bothLanguages);
      ['level1', 'level2', 'level3'].forEach(function (id) {
        bothLanguages('help.hints.' + id + '.title');
        bothLanguages('help.hints.' + id + '.text');
      });
    });

    it('the basics tell about the play controls of the page: Play, Pause, Reset, More actions, Options', function () {
      ready();
      var how = SG.locales.en;
      expect(how['help.how.play.text']).toContain('Reset');
      expect(how['help.how.notes.text']).toContain('More actions');
      expect(how['help.how.check.text']).toContain('Options');
      expect(how['help.how.get.text']).toContain('Play');
      expect(how['help.how.get.text']).toContain('Import');
      expect(SG.locales.vi['help.how.get.text']).toContain('Nhập đề');
    });

    it('every technique has a translated name and description, and so has its group', function () {
      ready();
      var list = SG.techniques.list();
      expect(list.length).toBe(26);
      list.forEach(function (tech) {
        bothLanguages('technique.' + tech.id);
        bothLanguages('technique.' + tech.id + '.desc');
      });
      SG.techniques.GROUPS.forEach(function (group) { bothLanguages('techniqueGroup.' + group); });
    });

    it('lists the shortcuts with texts in both languages, and they are the keys the play module handles', function () {
      ready();
      H.SHORTCUTS.forEach(function (row) {
        bothLanguages('help.keys.' + row.id);
        expect(row.keys.length).toBeGreaterThan(0);
      });
      var play = read('js/ui/play.js');
      expect(play).toMatch(/lower === 'n'/);
      expect(play).toMatch(/lower === 'h'/);
      expect(play).toContain("key === '`'");
      expect(play).toContain("'Backspace'");
      expect(play).toContain("'Delete'");
      expect(play).toContain("key === 'Escape'");
      expect(play).toMatch(/lower === 'z'/);
      expect(play).toMatch(/lower === 'y'/);
      var named = H.SHORTCUTS.map(function (row) { return row.id; });
      ['move', 'enter', 'erase', 'notes', 'hint', 'undo', 'redo', 'escape'].forEach(function (id) {
        expect(named).toContain(id);
      });
    });
  });

  describe('help: an example for every technique', function () {
    it('has an example for exactly the techniques of the registry, as a fixed snapshot', function () {
      ready();
      var ids = SG.techniques.list().map(function (tech) { return tech.id; }).sort();
      expect(Object.keys(SG.helpExamples).sort()).toEqual(ids);
      ids.forEach(function (id) {
        var ex = SG.helpExamples[id];
        expect(typeof ex.variant).toBe('string');
        expect(ex.givens.length).toBe(ex.values.length);
        expect(ex.hint.technique).toBe(id);
        expect(ex.source.puzzle.indexOf('#1,')).toBe(0);
        expect(Number.isInteger(ex.source.step) && ex.source.step >= 0).toBe(true);
      });
    });

    it('builds every example without playing: the board, the notes of the cells shown and the hint', function () {
      ready();
      SG.techniques.list().forEach(function (tech) {
        var ex = H.buildExample(tech.id);
        expect(ex === null ? 'no example for ' + tech.id : '').toBe('');
        expect(ex.hint.ok).toBe(true);
        expect(ex.hint.technique).toBe(tech.id);
        expect(ex.values.length).toBe(ex.model.cellCount);
        expect(ex.notes.length).toBe(ex.model.cellCount);
        expect(ex.hint.placements.length + ex.hint.eliminations.length).toBeGreaterThan(0);
        // The move is a real one: the digit to place and the notes to remove are still among the notes shown.
        ex.hint.placements.forEach(function (p) { expect((ex.notes[p[0]] >> (p[1] - 1)) & 1).toBe(1); });
        // (a hint can name a candidate that an earlier hint already took out of the notes, but not all of them).
        if (ex.hint.eliminations.length > 0) {
          expect(ex.hint.eliminations.some(function (e) { return ((ex.notes[e[0]] >> (e[1] - 1)) & 1) === 1; })).toBe(true);
        }
        ex.hint.targets.forEach(function (c) { expect(ex.values[c]).toBe(0); });
      });
    });

    it('replaying the puzzle of an example with the hint code of the player gives the same hint', function () {
      ready();
      SG.techniques.list().forEach(function (tech) {
        var ex = SG.helpExamples[tech.id];
        var block = SG.importer.exportBlocks(ex.source.puzzle);
        var parsed = SG.importer.parseExportBlock(block[0], 1);
        expect(parsed.ok).toBe(true);
        var puzzle = SG.importer.openDocument(parsed.data, { kind: 'export' }).puzzle;
        var game = SG.play.createGame(puzzle.model, puzzle.givens, puzzle.solution, { now: function () { return 0; } });
        game.fillNotes();
        for (var k = 0; k < ex.source.step; k++) {
          game.clearHint();
          expect(game.hint().ok).toBe(true);
          game.applyHint();
        }
        game.clearHint();
        var hint = game.hint();
        expect(hint.technique).toBe(tech.id);
        ['cells', 'targets', 'placements', 'eliminations'].forEach(function (field) {
          expect(JSON.stringify(hint[field])).toBe(JSON.stringify(ex.hint[field]));
        });
        var built = H.buildExample(tech.id);
        for (var c = 0; c < built.values.length; c++) expect(game.userValue(c)).toBe(built.values[c]);
        Object.keys(ex.notes).forEach(function (cell) { expect(game.getNotes(Number(cell))).toBe(ex.notes[cell]); });
      });
    });

    it('a technique that only some variants have is shown on such a variant', function () {
      ready();
      SG.techniques.list().forEach(function (tech) {
        if (!tech.variantScope) return;
        var ex = H.buildExample(tech.id);
        expect(tech.variantScope).toContain(ex.variantId);
      });
    });

    it('the hint of each example reads in both languages, with the cells and the move named', function () {
      ready();
      SG.techniques.list().forEach(function (tech) {
        var ex = H.buildExample(tech.id);
        ['en', 'vi'].forEach(function (code) {
          inLocale(code, function () {
            var said = SG.play.describeHint(ex.model, ex.hint, { mode: 'digits' });
            expect(said.ok).toBe(true);
            expect(said.title).toBe(SG.i18n.t('technique.' + tech.id));
            ['explanation', 'cells', 'action', 'region'].forEach(function (field) {
              expect(said[field].trim().length).toBeGreaterThan(0);
              expect(said[field]).not.toMatch(/\{\w+\}/);
            });
          });
        });
      });
    });

    it('an unknown technique has no example, and a damaged one is not an exception', function () {
      ready();
      expect(H.buildExample('nope')).toBe(null);
      expect(H.buildExample('')).toBe(null);
    });

    it('the examples come from the tool that makes them, and the page draws them with the player code', function () {
      ready();
      var examples = read('js/ui/help-examples.js');
      expect(examples).toContain('GENERATED by tests/tools/make-technique-examples.js');
      expect(read('tests/tools/make-technique-examples.js')).toContain('help-examples.js');
      var code = read('js/ui/help.js');
      expect(code).not.toContain('createGame');
      expect(code).toContain('SG.play.describeHint');
      expect(code).toContain('SG.play.renderSnapshot');
    });
  });

  describe('help: the page and the Help button', function () {
    it('the page markup has the mount points, and the player links to it in a new tab', function () {
      ready();
      var page = read('help.html');
      ['id="help-root"', 'id="help-toc"', 'data-lang="en"', 'data-lang="vi"', 'data-theme-value="dark"']
        .forEach(function (part) { expect(page).toContain(part); });
      var index = read('index.html');
      expect(index).toMatch(/<a id="btn-help"[^>]*href="help\.html"[^>]*target="_blank"[^>]*rel="noopener"/);
      expect(index).not.toContain('js/ui/help.js');
    });

    it('does not start on a page without #help-root (a Node run, or the page of the player)', function () {
      ready();
      expect(H.start()).toBe(false);
    });
  });

  describe('help: what the README claims', function () {
    it('has an English and a Vietnamese part', function () {
      ready();
      var text = read('README.md');
      expect(text).toContain('\n# English');
      expect(text).toContain('\n# Tiếng Việt');
      expect(text.indexOf('\n# English')).toBeLessThan(text.indexOf('\n# Tiếng Việt'));
    });

    it('has a table of contents in both languages, the links to the live apps, and every #anchor it uses exists', function () {
      ready();
      var text = read('README.md');
      expect(text).toContain('- [Table of Contents](#english)');
      expect(text).toContain('- [Mục lục](#tiếng-việt)');
      expect(text).toContain('https://tdat00.github.io/sudoku/player/');
      expect(text).toContain('https://tdat00.github.io/sudoku/generator/');
      // GitHub's slug of a heading: lower case, spaces to hyphens, punctuation dropped.
      var anchors = { top: true };
      (text.match(/<a id="([\w-]+)"><\/a>/g) || []).forEach(function (a) { anchors[/id="([\w-]+)"/.exec(a)[1]] = true; });
      (text.match(/^#{1,6} .+$/gm) || []).forEach(function (line) {
        anchors[line.replace(/^#+ /, '').toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').replace(/ /g, '-')] = true;
      });
      (text.match(/\]\(#([^)]+)\)/g) || []).forEach(function (link) {
        var id = /\(#([^)]+)\)/.exec(link)[1];
        expect(anchors[id] ? '' : '#' + id + ' has no target').toBe('');
      });
    });

    it('names the 15 variants in both parts, as the app does', function () {
      ready();
      var text = read('README.md');
      var en = text.slice(text.indexOf('\n# English'), text.indexOf('\n# Tiếng Việt'));
      var vi = text.slice(text.indexOf('\n# Tiếng Việt'));
      expect(en).toContain('15 variants');
      expect(vi).toContain('15 biến thể');
      // The README uses the short names; every variant has one word of its English name in the list.
      ['Classic', 'Mega', 'Monster', 'Diagonal', 'Hyper', 'Windoku', 'Jigsaw', 'Killer', 'Greater-Than',
        'Samurai', 'Sohei', 'Butterfly', 'Flower', 'Wordoku'].forEach(function (name) {
        expect(en).toContain(name);
      });
      ['Cổ điển', 'Khổng lồ', 'Quái vật', 'Đường chéo', 'Siêu vùng', 'Ghép hình', 'Sát thủ', 'So sánh',
        'Samurai', 'Sohei', 'Cánh bướm', 'Bông hoa', 'Wordoku'].forEach(function (name) {
        expect(vi).toContain(name);
      });
      expect(SG.importer.VARIANTS).toBeDefined();
      expect(Object.keys(SG.importer.VARIANTS).length).toBe(15);
    });

    it('its numbers are the numbers of the code: 26 techniques, 100 + 100 puzzles, 8 MB files', function () {
      ready();
      var text = read('README.md');
      expect(text).toContain('one of 26 techniques');
      expect(text).toContain('một trong 26 kỹ thuật');
      expect(SG.techniques.list().length).toBe(26);
      expect(text).toContain('the last 100 puzzles');
      expect(text).toContain('the last 100 imported puzzles');
      expect(text).toContain('100 đề gần nhất');
      expect(text).toContain('100 đề đã nhập gần nhất');
      expect(read('js/ui/app.js')).toContain('MAX_FILE_BYTES = 8 * 1024 * 1024');
    });

    it('lists the storage keys of the code and the address format of the link', function () {
      ready();
      var text = read('README.md');
      var K = SG.progress.KEYS;
      [SG.store.KEY, K.progress, K.puzzles, K.last].forEach(function (key) {
        expect(text.split(key).length - 1).toBe(2);
      });
      expect(text).toContain('#puzzle=<token>');
      expect(text).toContain('#puzzle=<mã>');
      expect(text).toContain('sg-generator-url');
      expect(text).toContain('../generator/index.html');
    });

    it('says how to run, test and deploy it, and every file it links to exists', function () {
      ready();
      var env = needNode();
      var text = read('README.md');
      ['node tests/node-runner.js', 'file://', 'python -m http.server', 'GitHub Pages', 'GitHub Actions']
        .forEach(function (part) { expect(text).toContain(part); });
      (text.match(/\]\(\.{1,2}\/([\w./-]+)\)/g) || []).forEach(function (link) {
        var rel = /\((\.{1,2}\/[\w./-]+)\)/.exec(link)[1];
        expect(env.fs.existsSync(env.path.join(env.root, rel))).toBe(true);
      });
    });

    it('describes the guide: a page in a new tab, with an example for every technique', function () {
      ready();
      var text = read('README.md');
      expect(text).toContain('help.html');
      expect(text).toContain('example');
    });

    it('promises no feature the player does not have: no export, no print, no generation', function () {
      ready();
      // The Import takes the text of the generator's Export box; the player has no export of its own.
      var text = read('README.md').toLowerCase().replace(/\*\*export\*\* box/g, '').replace(/\*\*xuất\*\*/g, '');
      expect(/\bexport\b|\bprint\b|generate a puzzle here|in-browser generation/.test(text)).toBe(false);
    });
  });
})();
