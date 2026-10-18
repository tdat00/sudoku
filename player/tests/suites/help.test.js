// Help: the static rules of the 15 variants, the technique ladder, the shortcuts, the storage
// the About tab lists, and the claims of the README, all checked against the code they
// describe.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.help;
  var NODE = SG.test.node;

  function ready() {
    if (!H || !SG.i18n || !SG.importer || !SG.techniques) SG.test.skip('SG.help is not loaded here');
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

  describe('help: the 15 variants', function () {
    it('has an entry for exactly the variants the importer opens, in the order of the importer', function () {
      ready();
      var ids = H.VARIANT_RULES.map(function (entry) { return entry.id; });
      expect(ids.slice().sort()).toEqual(Object.keys(SG.importer.VARIANTS).sort());
      expect(ids.length).toBe(15);
    });

    it('every entry has a name, a description, the rules and a tip in English and Vietnamese', function () {
      ready();
      H.VARIANT_RULES.forEach(function (entry) {
        [entry.nameKey, entry.descKey, entry.rulesKey, entry.tipKey].forEach(bothLanguages);
      });
    });

    it('the rules are all different texts, and the Vietnamese ones are not the English ones', function () {
      ready();
      var seen = {};
      H.VARIANT_RULES.forEach(function (entry) {
        var en = SG.locales.en[entry.rulesKey];
        expect(seen[en]).toBeUndefined();
        seen[en] = true;
        expect(SG.locales.vi[entry.rulesKey]).not.toBe(en);
        expect(SG.locales.vi[entry.tipKey]).not.toBe(SG.locales.en[entry.tipKey]);
      });
    });

    it('the rules say what is special: cages, signs, overlaps, the word', function () {
      ready();
      var rules = function (id) { return SG.locales.en['help.variant.' + id + '.rules'].toLowerCase(); };
      expect(rules('killer')).toContain('sum');
      expect(rules('greaterThan')).toContain('sign');
      expect(rules('samurai')).toContain('369');
      expect(rules('sohei')).toContain('288');
      expect(rules('butterfly')).toContain('144');
      expect(rules('flower')).toContain('189');
      expect(rules('wordoku')).toContain('word');
      expect(rules('diagonalX')).toContain('diagonal');
      expect(rules('hyper')).toContain('window');
      expect(rules('jigsaw9')).toContain('region');
    });

    it('has no text about generating puzzles: the player does not generate', function () {
      ready();
      H.VARIANT_RULES.forEach(function (entry) {
        ['en', 'vi'].forEach(function (code) {
          [entry.rulesKey, entry.tipKey].forEach(function (key) {
            expect(/generat|tạo ra đề|symmetry|seed/i.test(SG.locales[code][key])).toBe(false);
          });
        });
      });
    });
  });

  describe('help: the technique ladder and the keyboard', function () {
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

    it('lists the tabs and the shortcuts with texts in both languages', function () {
      ready();
      expect(H.TAB_IDS).toEqual(['how', 'variants', 'hints', 'keys', 'about']);
      H.TAB_IDS.forEach(function (id) { bothLanguages('help.tab.' + id); });
      H.SHORTCUTS.forEach(function (row) {
        bothLanguages('help.keys.' + row.id);
        expect(row.keys.length).toBeGreaterThan(0);
      });
    });

    it('the keys it names are the keys the play module handles', function () {
      ready();
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

  describe('help: the storage it describes', function () {
    it('the About tab lists exactly the keys the code writes, with a text for each', function () {
      ready();
      var written = {};
      [SG.store.KEY].concat(Object.keys(SG.progress.KEYS).map(function (name) {
        return SG.progress.KEYS[name];
      })).forEach(function (key) { written[key] = true; });
      expect(Object.keys(written).length).toBe(4);
      ['prefs', 'progress', 'puzzles', 'last'].forEach(function (name) {
        bothLanguages('help.about.key.' + name);
      });
      var code = read('js/ui/help.js');
      expect(code).toContain('SG.store.KEY');
      expect(code).toContain('SG.progress.KEYS.progress');
      expect(code).toContain('SG.progress.KEYS.puzzles');
      expect(code).toContain('SG.progress.KEYS.last');
    });

    it('the numbers in the About texts match the limits of the progress store', function () {
      ready();
      expect(SG.progress.LIMITS.progressEntries).toBe(100);
      expect(SG.progress.LIMITS.puzzleEntries).toBe(100);
      expect(SG.locales.en['help.about.key.progress']).toContain('100');
      expect(SG.locales.en['help.about.key.puzzles']).toContain('100');
      expect(SG.locales.vi['help.about.key.progress']).toContain('100');
      expect(SG.locales.vi['help.about.key.puzzles']).toContain('100');
    });

    it('does not claim a screen reader test that was not done', function () {
      ready();
      expect(SG.locales.en['help.about.a11y.text']).toContain('not yet with a real screen reader');
    });
  });

  describe('help: what the README claims', function () {
    it('has an English and a Vietnamese part', function () {
      ready();
      var text = read('README.md');
      expect(text).toContain('## English');
      expect(text).toContain('## Tiếng Việt');
      expect(text.indexOf('## English')).toBeLessThan(text.indexOf('## Tiếng Việt'));
    });

    it('names the 15 variants in both parts, as the app does', function () {
      ready();
      var text = read('README.md');
      var en = text.slice(text.indexOf('## English'), text.indexOf('## Tiếng Việt'));
      var vi = text.slice(text.indexOf('## Tiếng Việt'));
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
      expect(text).toContain('https://tdat00.github.io/sudoku-generator/');
    });

    it('says how to run, test and deploy it, and every file it links to exists', function () {
      ready();
      var env = needNode();
      var text = read('README.md');
      ['node tests/node-runner.js', 'file://', 'python -m http.server', 'GitHub Pages', 'GitHub Actions']
        .forEach(function (part) { expect(text).toContain(part); });
      (text.match(/\]\(\.\/([\w./-]+)\)/g) || []).forEach(function (link) {
        var rel = /\(\.\/([\w./-]+)\)/.exec(link)[1];
        expect(env.fs.existsSync(env.path.join(env.root, rel))).toBe(true);
      });
    });

    it('promises no feature the player does not have: no export, no print, no generation', function () {
      ready();
      // The Import takes the text of the generator's Export box; the player has no export of its own.
      var text = read('README.md').toLowerCase().replace(/\*\*export\*\* box/g, '').replace(/\*\*xuất\*\*/g, '');
      expect(/\bexport\b|\bprint\b|generate a puzzle here|in-browser generation/.test(text)).toBe(false);
    });
  });
})();
