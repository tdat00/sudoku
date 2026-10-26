// Wordoku: the word lists (every entry is exactly 9 distinct characters, a build-breaking check), the
// fallback from an empty or short Vietnamese list to the English one, the variant options, the model with its
// word line, the common variant criteria CV1-CV9 of task.md phase P5, and the events of step 4. Every
// generated puzzle is checked against its own solution: the word has to read correctly on the chosen line,
// the puzzle has to be unique from its givens alone, and the word line has to be dug like any other cells.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var E = SG.events;
  var W = SG.wordoku;
  var def = SG.variants.get('wordoku');

  var LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1'];
  /** design.md 9.1, wordoku row, p95 in ms. */
  var BUDGET_MS = {
    veryEasy: 100, easy: 250, normal: 250, hard: 600, expert: 600, master: 1500, nightmare: 1500, hell1: 2500
  };
  var PUZZLES_PER_LEVEL = 20;
  var STEPS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];
  /** The options of puzzle i of a level: half on the diagonal, the rest on a random row or column. */
  var PLACEMENT_CYCLE = [{ placement: 'diagonal' }, { placement: 'diagonal' }, { placement: 'row' },
    { placement: 'column' }];

  /** Just enough valid Vietnamese words for the list not to count as "too short". */
  var VI_ENOUGH = ['BACHDUONG', 'CHATLUONG', 'DIAPHUONG', 'QUYETDINH', 'THUONGMAI', 'KHUYENMAI', 'CHUYENGIA',
    'CHUYENDOI', 'TRANGDIEM', 'XOAYCHIEU'].slice(0, SG.wordoku.MIN_WORDS);

  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  /** Fails with a message that names the puzzle, which a bare expect() would not. */
  function check(ok, message) {
    if (!ok) throw new Error(message);
  }

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
    return thrown;
  }

  /** Nearest-rank percentile: the p95 of 20 runs is the 19th of them. */
  function percentile(values, p) {
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
  }

  function clueCount(givens) {
    var k = 0;
    for (var c = 0; c < givens.length; c++) if (givens[c] !== 0) k++;
    return k;
  }

  /** Independent of SG.wordoku: exactly 9 characters, all upper-case letters A-Z, all different. */
  function nineDistinct(word) {
    if (typeof word !== 'string' || word.length !== 9 || !/^[A-Z]+$/.test(word)) return false;
    var seen = {};
    for (var i = 0; i < word.length; i++) {
      if (seen[word.charAt(i)]) return false;
      seen[word.charAt(i)] = true;
    }
    return true;
  }

  function sortedLetters(word) { return word.split('').sort().join(''); }

  function expectedCells(placement, line) {
    var cells = [];
    for (var i = 0; i < 9; i++) {
      if (placement === 'row') cells.push(line * 9 + i);
      else if (placement === 'column') cells.push(i * 9 + line);
      else cells.push(i * 9 + i);
    }
    return cells;
  }

  /** Runs fn with the shipped word lists replaced, then puts them back. */
  function withLists(lists, fn) {
    var saved = { en: SG.wordlists.en, vi: SG.wordlists.vi };
    Object.keys(lists).forEach(function (k) { SG.wordlists[k] = lists[k]; });
    try {
      return fn();
    } finally {
      SG.wordlists.en = saved.en;
      SG.wordlists.vi = saved.vi;
    }
  }

  function build(opts, seed) { return def.build(opts, SG.rng.create(seed)); }

  function equalArrays(a, b) { return JSON.stringify(Array.from(a)) === JSON.stringify(Array.from(b)); }

  // Generated puzzles, shared by the suites below (generated once, on first use)

  function generate(level, seed, extra) {
    var events = 0;
    var cfg = Object.assign({ variantId: 'wordoku', difficulty: level, seed: seed, trace: 'summary' }, extra);
    var t0 = now();
    var result = SG.pipeline.run(cfg, function () { events++; });
    result.elapsedMs = now() - t0;
    result.eventCount = events;
    return result;
  }

  var runCache = null;
  function puzzleRun() {
    if (runCache === null) {
      runCache = {};
      LEVELS.forEach(function (level, li) {
        runCache[level] = [];
        for (var i = 0; i < PUZZLES_PER_LEVEL; i++) {
          runCache[level].push(generate(level, 100 * (li + 1) + i,
            { variantOptions: PLACEMENT_CYCLE[i % PLACEMENT_CYCLE.length] }));
        }
      });
    }
    return runCache;
  }

  function allPuzzles() {
    var out = [];
    LEVELS.forEach(function (level) { out = out.concat(puzzleRun()[level]); });
    return out;
  }

  describe('wordoku: word lists (every entry is exactly 9 distinct characters)', function () {
    it('loads both lists as plain arrays of strings on SG.wordlists', function () {
      expect(typeof SG.wordlists).toBe('object');
      ['en', 'vi'].forEach(function (lang) {
        expect(Array.isArray(SG.wordlists[lang])).toBe(true);
        SG.wordlists[lang].forEach(function (w) { expect(typeof w).toBe('string'); });
      });
    });

    ['en', 'vi'].forEach(function (lang) {
      describe(lang + ' list', function () {
        it('every entry is exactly 9 characters, upper-case letters A-Z, all distinct (build-breaking)',
          function () {
            var broken = SG.wordlists[lang].filter(function (w) { return !nineDistinct(w); });
            expect(broken).toEqual([]);
          });

        it('agrees with SG.wordoku.isIsogram on every entry, and the words need no normalising', function () {
          SG.wordlists[lang].forEach(function (w) {
            expect(W.isIsogram(w)).toBe(true);
            expect(W.normalizeWord(w)).toBe(w);
          });
          expect(W.validWords(SG.wordlists[lang])).toEqual(SG.wordlists[lang].slice());
        });

        it('has no entry twice', function () {
          var list = SG.wordlists[lang];
          var seen = {};
          var twice = list.filter(function (w) {
            var dup = seen[w] === true;
            seen[w] = true;
            return dup;
          });
          expect(twice).toEqual([]);
        });

        it('is frozen, so a stray write cannot corrupt it', function () {
          expect(Object.isFrozen(SG.wordlists[lang])).toBe(true);
        });
      });
    });

    it('the English list has at least 40 words', function () {
      expect(SG.wordlists.en.length).toBeGreaterThanOrEqual(40);
    });

    it('the Vietnamese list is much shorter than the English one but still has a word to draw from',
      function () {
        expect(SG.wordlists.vi.length).toBeGreaterThanOrEqual(W.MIN_WORDS);
        SG.wordlists.vi.forEach(function (w) { expect(nineDistinct(w)).toBe(true); });
        // "Bạch Tuyết" without diacritics repeats its T, which is why it cannot be an entry.
        expect(nineDistinct('BACHTUYET')).toBe(false);
        expect(SG.wordlists.vi).not.toContain('BACHTUYET');
      });

    it('every word of both lists has an entry in the word book (core/assets/wordbook), and every entry ' +
      'a word',
      function () {
        var env = SG.test.node;
        if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
        ['en', 'vi'].forEach(function (lang) {
          var book = env.path.join(env.root, '../core/assets/wordbook/words.' + lang + '.js');
          var text = env.fs.readFileSync(book, 'utf8');
          var sandbox = {};
          env.vm.runInNewContext(text, sandbox);
          var book = sandbox.SG.wordbookData[lang];
          var keys = Object.keys(book).sort();
          expect(keys).toEqual(SG.wordlists[lang].slice().sort());
          keys.forEach(function (key) {
            var row = book[key];
            expect('nvado'.indexOf(row[1]) !== -1 && row[1].length === 1).toBe(true);
            // The spelling is the key word with its diacritics put back; a Vietnamese one has at most 3
            // syllables.
            expect(W.normalizeWord(row[0])).toBe(key);
            expect(row.slice(2).every(function (t) { return typeof t === 'string' && t.length > 5; }))
              .toBe(true);
            if (lang === 'vi') expect(row[0].split(' ').length).toBeLessThanOrEqual(3);
            expect(row.length).toBe(lang === 'en' ? 4 : 3);
          });
        });
      });

    it('the check itself rejects every way an entry can go wrong', function () {
      var bad = ['ABCDEFGHA', 'ABCDEFGH', 'ABCDEFGHIJ', 'abcdefghi', 'ABCDEFGH1', 'ABCDEFGH ', 'BACHTUYET',
        '', 'HOANKIEM', 'BÁCHTUYEN'];
      bad.forEach(function (w) {
        expect(nineDistinct(w)).toBe(false);
        expect(W.isIsogram(w)).toBe(false);
      });
      [null, undefined, 123456789, ['A', 'B'], {}].forEach(function (w) {
        expect(nineDistinct(w)).toBe(false);
        expect(W.isIsogram(w)).toBe(false);
      });
      ['ALGORITHM', 'HOANGKIEM', 'BACHTUYEN', 'TRUNGBACH'].forEach(function (w) {
        expect(nineDistinct(w)).toBe(true);
        expect(W.isIsogram(w)).toBe(true);
      });
    });

    it('validWords drops bad entries and repeats and keeps the order of the rest', function () {
      var list = ['DANGEROUS', 'ABCDEFGHA', 'ALGORITHM', 'DANGEROUS', 'SHORT', 'abcdefghi', 42, null,
        'BACHDUONG'];
      expect(W.validWords(list)).toEqual(['DANGEROUS', 'ALGORITHM', 'BACHDUONG']);
      expect(W.validWords(null)).toEqual([]);
      expect(W.validWords(undefined)).toEqual([]);
      expect(W.validWords([])).toEqual([]);
    });

    it('normalizeWord turns typed text into the form of the lists', function () {
      expect(W.normalizeWord('Bạch Dương')).toBe('BACHDUONG');
      expect(W.normalizeWord('Đồng Tháp')).toBe('DONGTHAP');
      expect(W.normalizeWord(' hoàng-kiếm ')).toBe('HOANGKIEM');
      expect(W.normalizeWord('algorithm')).toBe('ALGORITHM');
      expect(W.normalizeWord('123 !?')).toBe('');
    });

    it('the files load on their own, in a fresh context, without the rest of the code', function () {
      var env = SG.test.node;
      if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
      ['en', 'vi'].forEach(function (lang) {
        var text = env.fs.readFileSync(env.path.join(env.root, 'assets/wordlists/isograms.' + lang + '.js'),
          'utf8');
        var sandbox = {};
        env.vm.runInNewContext(text, sandbox);
        expect(Array.from(sandbox.SG.wordlists[lang])).toEqual(Array.from(SG.wordlists[lang]));
      });
    });
  });

  describe('wordoku: word list choice and the fallback to English', function () {
    var EN = ['ALGORITHM', 'DANGEROUS', 'NIGHTMARE', 'BLUEPRINT', 'SUNFLOWER', 'DRAGONFLY'];

    it('English is the list of the English language, never a fallback', function () {
      var list = W.resolveWordList('en');
      expect(list.language).toBe('en');
      expect(list.requested).toBe('en');
      expect(list.fellBack).toBe(false);
      expect(list.words).toEqual(SG.wordlists.en.slice());
    });

    it('Vietnamese is used when its list has enough words, and falls back with a flag when it has not',
      function () {
        var list = W.resolveWordList('vi');
        expect(list.requested).toBe('vi');
        if (W.validWords(SG.wordlists.vi).length >= W.MIN_WORDS) {
          expect([list.language, list.fellBack]).toEqual(['vi', false]);
          expect(list.words).toEqual(W.validWords(SG.wordlists.vi));
        } else {
          expect([list.language, list.fellBack]).toEqual(['en', true]);
        }
      });

    it('an empty Vietnamese list falls back to the English list, with the flag', function () {
      var list = W.resolveWordList('vi', { en: EN, vi: [] });
      expect(list.fellBack).toBe(true);
      expect(list.language).toBe('en');
      expect(list.requested).toBe('vi');
      expect(list.words).toEqual(EN);
    });

    it('a missing, too short or all-invalid Vietnamese list falls back as well', function () {
      var cases = [undefined, VI_ENOUGH.slice(0, W.MIN_WORDS - 1),
        ['ABCDEFGHA', 'SHORT', 'abcdefghi', 'BACHTUYET'],
        VI_ENOUGH.slice(0, W.MIN_WORDS - 1).concat(['TOOLONGWORD'])];
      cases.forEach(function (vi) {
        var list = W.resolveWordList('vi', { en: EN, vi: vi });
        expect(list.fellBack).toBe(true);
        expect(list.words).toEqual(EN);
      });
    });

    it('a Vietnamese list of exactly MIN_WORDS valid words is long enough', function () {
      expect(W.MIN_WORDS).toBeGreaterThan(0);
      var list = W.resolveWordList('vi', { en: EN, vi: VI_ENOUGH });
      expect([list.language, list.fellBack]).toEqual(['vi', false]);
      expect(list.words).toEqual(VI_ENOUGH);
    });

    it('invalid entries and repeats never reach the words that can be drawn', function () {
      var junk = VI_ENOUGH.concat(['ABCDEFGHA', 'SHORT', VI_ENOUGH[0]]);
      expect(W.resolveWordList('vi', { en: EN, vi: junk }).words).toEqual(VI_ENOUGH);
    });

    it('English has nothing to fall back to: a short list is used, an empty one is an error', function () {
      var list = W.resolveWordList('en', { en: EN.slice(0, 2), vi: [] });
      expect([list.language, list.fellBack, list.words.length]).toEqual(['en', false, 2]);
      expectCode(function () { W.resolveWordList('en', { en: [], vi: VI_ENOUGH }); }, 'wordoku.noWordList');
    });

    it('when both lists are empty it is an error with the language in its arguments', function () {
      var err = expectCode(function () { W.resolveWordList('vi', { en: [], vi: [] }); },
        'wordoku.noWordList');
      expect(err.i18nArgs).toEqual({ language: 'vi' });
      expectCode(function () { W.resolveWordList('vi', {}); }, 'wordoku.noWordList');
    });

    it('a short Vietnamese list is still used when the English one is empty', function () {
      var list = W.resolveWordList('vi', { en: [], vi: VI_ENOUGH.slice(0, 2) });
      expect([list.language, list.fellBack]).toEqual(['vi', false]);
    });

    it('building with language "vi" and an empty Vietnamese list gives an English word instead', function () {
      withLists({ vi: [] }, function () {
        for (var seed = 1; seed <= 12; seed++) {
          var model = build({ language: 'vi' }, seed);
          expect(SG.model.validate(model).ok).toBe(true);
          expect(SG.wordlists.en).toContain(W.describe(model).word);
        }
      });
    });

    it('building with language "vi" draws from the Vietnamese list when it is long enough', function () {
      withLists({ vi: VI_ENOUGH }, function () {
        var seen = {};
        for (var seed = 1; seed <= 40; seed++) {
          var word = W.describe(build({ language: 'vi' }, seed)).word;
          expect(VI_ENOUGH).toContain(word);
          seen[word] = true;
        }
        expect(Object.keys(seen).length).toBeGreaterThan(2);
      });
    });

    it('building with no word at all is an error and not a crash', function () {
      withLists({ en: [], vi: [] }, function () {
        expectCode(function () { build({}, 1); }, 'wordoku.noWordList');
        expectCode(function () { build({ language: 'vi' }, 1); }, 'wordoku.noWordList');
        // A word of the user's own needs no list.
        expect(W.describe(build({ word: 'Bạch Dương' }, 1)).word).toBe('BACHDUONG');
      });
    });

    it('restores the shipped lists after these experiments', function () {
      expect(SG.wordlists.en.length).toBeGreaterThanOrEqual(40);
      expect(Object.isFrozen(SG.wordlists.en)).toBe(true);
    });
  });

  describe('wordoku: variant options (placement, row or column number, language, own word)', function () {
    function option(id) {
      return def.options.filter(function (o) { return o.id === id; })[0];
    }

    it('declares the four options, frozen, in the order the control panel shows them', function () {
      expect(def.options.map(function (o) { return o.id; }))
        .toEqual(['placement', 'line', 'language', 'word']);
      expect(Object.isFrozen(def.options)).toBe(true);
      def.options.forEach(function (o) { expect(Object.isFrozen(o)).toBe(true); });
      expect(def.options).toBe(W.OPTIONS);
    });

    it('every option has the Killer / Jigsaw shape: id, type, default, i18nKey and hintKey', function () {
      def.options.forEach(function (o) {
        expect(typeof o.id).toBe('string');
        expect(['slider', 'select', 'text']).toContain(o.type);
        expect(o.default).toBeDefined();
        expect(o.i18nKey).toBe('variant.wordoku.' + o.id);
        expect(o.hintKey).toBe('variant.wordoku.' + o.id + '.hint');
        expect(o.hintI18nKey).toBeUndefined();
      });
    });

    it('placement is a select between the diagonal (default), a row and a column', function () {
      var o = option('placement');
      expect(o.type).toBe('select');
      expect(o.default).toBe('diagonal');
      expect(o.choices.map(function (c) { return c.value; })).toEqual(['diagonal', 'row', 'column']);
      expect(W.PLACEMENTS).toEqual(['diagonal', 'row', 'column']);
      o.choices.forEach(function (c) { expect(c.i18nKey).toBe('variant.wordoku.placement.' + c.value); });
    });

    it('line is a slider 0..9 (0 = random) that only matters for a row or a column', function () {
      var o = option('line');
      expect([o.type, o.min, o.max, o.step, o.default]).toEqual(['slider', 0, 9, 1, 0]);
      expect(o.defaultLabelKey).toBe('variant.wordoku.line.random');
      expect(o.visibleWhen).toEqual({ placement: ['row', 'column'] });
    });

    it('language is a select between English (default) and Vietnamese', function () {
      var o = option('language');
      expect(o.type).toBe('select');
      expect(o.default).toBe('en');
      expect(o.choices.map(function (c) { return c.value; })).toEqual(['en', 'vi']);
      expect(W.LANGUAGES).toEqual(['en', 'vi']);
    });

    it('word is a text option, empty by default (a random word)', function () {
      var o = option('word');
      expect(o.type).toBe('text');
      expect(o.default).toBe('');
      expect(o.placeholderKey).toBe('variant.wordoku.word.placeholder');
      expect(o.maxLength).toBeGreaterThan(8);
    });

    it('the defaults of the schema are the defaults of the builder', function () {
      var defaults = {};
      def.options.forEach(function (o) { defaults[o.id] = o.default; });
      expect(W.normalizeOptions(defaults))
        .toEqual({ placement: 'diagonal', line: 0, language: 'en', word: null });
      expect(W.normalizeOptions({})).toEqual(W.normalizeOptions(defaults));
      expect(W.normalizeOptions(null)).toEqual(W.normalizeOptions(defaults));
      expect(W.normalizeOptions(undefined)).toEqual(W.normalizeOptions(defaults));
      expect(W.normalizeOptions({ placement: null, line: null, language: null, word: null }))
        .toEqual(W.normalizeOptions(defaults));
    });

    it('accepts every legal value', function () {
      W.PLACEMENTS.forEach(function (p) { expect(W.normalizeOptions({ placement: p }).placement).toBe(p); });
      for (var line = 0; line <= 9; line++) expect(W.normalizeOptions({ line: line }).line).toBe(line);
      W.LANGUAGES.forEach(function (l) { expect(W.normalizeOptions({ language: l }).language).toBe(l); });
      expect(W.normalizeOptions({ word: 'Bạch Dương' }).word).toBe('BACHDUONG');
      expect(W.normalizeOptions({ word: 'algorithm' }).word).toBe('ALGORITHM');
    });

    it('an empty or blank word means "pick one for me"', function () {
      expect(W.normalizeOptions({ word: '' }).word).toBeNull();
      expect(W.normalizeOptions({ word: '   ' }).word).toBeNull();
    });

    it('rejects an illegal value with pipeline.invalidOption, naming the option', function () {
      var cases = [
        ['placement', 'antiDiagonal'], ['placement', 7], ['placement', ''],
        ['line', 10], ['line', -1], ['line', 1.5], ['line', '3'], ['line', NaN],
        ['language', 'fr'], ['language', 'EN'], ['language', 3],
        ['word', 'SHORT'], ['word', 'ABCDEFGHA'], ['word', 'ABCDEFGHIJ'], ['word', 'Tuyết Bạch'],
        ['word', '123456789'], ['word', 42], ['word', ['ALGORITHM']]
      ];
      cases.forEach(function (c) {
        var opts = {};
        opts[c[0]] = c[1];
        var err = expectCode(function () { W.normalizeOptions(opts); }, 'pipeline.invalidOption');
        expect(err.i18nArgs.option).toBe(c[0]);
        expectCode(function () { def.build(opts, SG.rng.create(1)); }, 'pipeline.invalidOption');
      });
    });

    it('the pipeline refuses a bad option before it generates anything', function () {
      expectCode(function () {
        SG.pipeline.run({ variantId: 'wordoku', difficulty: 'easy', seed: 1, trace: 'off',
          variantOptions: { placement: 'diagonal', line: 12 } }, null);
      }, 'pipeline.invalidOption');
    });
  });

  describe('wordoku: variant definition and model (CV1, CV2)', function () {
    it('is registered with the fields of the contract (design.md 5.3 / 13.8)', function () {
      expect(SG.variants.has('wordoku')).toBe(true);
      expect(def.id).toBe('wordoku');
      expect(def.i18nKey).toBe('variant.wordoku');
      expect(def.group).toBe('wordoku');
      expect(def.digits).toBe(9);
      expect(def.difficultySupport).toEqual(LEVELS);
      expect(def.symbolModes).toContain(def.defaultSymbolMode);
      expect(def.defaultSymbolMode).toBe('word');
      expect(def.symbolModes).toEqual(['word', 'digits']);
      expect(typeof def.build).toBe('function');
      expect(typeof def.postGenerate).toBe('function');
      expect(def.digStrategy === undefined || def.digStrategy === null).toBe(true);
    });

    it('does not support hell2 (it missed the qualification): asking for it is refused', function () {
      expectCode(function () {
        SG.pipeline.run({ variantId: 'wordoku', difficulty: 'hell2', seed: 1, trace: 'off' }, null);
      }, 'difficulty.unsupportedLevel');
    });

    it('is loaded once: running the file again registers nothing and adds no second set of strings',
      function () {
        var env = SG.test.node;
        if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
        var count = SG.variants.list().length;
        var fragments = SG.localeFragments.length;
        var vocabulary = E.VOCABULARY.length;
        var text = env.fs.readFileSync(env.path.join(env.root, 'js/variants/wordoku.js'), 'utf8');
        env.vm.runInThisContext(text, { filename: 'js/variants/wordoku.js' });
        expect(SG.variants.list().length).toBe(count);
        expect(SG.localeFragments.length).toBe(fragments);
        expect(E.VOCABULARY.length).toBe(vocabulary);
        expect(SG.variants.get('wordoku')).toBe(def);
        expect(SG.wordoku).toBe(W);
      });

    it('builds the plain 9x9 board: the geometry of classic9 under the id "wordoku" (27 units)', function () {
      var model = build({}, 1);
      var classic = SG.variants.get('classic9').build({}, null);
      expect(model.variantId).toBe('wordoku');
      expect(model.cellCount).toBe(81);
      expect(model.digits).toBe(9);
      expect(model.units).toHaveLength(27);
      expect(model.cages).toHaveLength(0);
      expect(model.inequalities).toHaveLength(0);
      model.units.forEach(function (u, i) { expect(equalArrays(u, classic.units[i])).toBe(true); });
      expect(model.unitMeta.map(function (m) { return m.kind; }))
        .toEqual(classic.unitMeta.map(function (m) { return m.kind; }));
      ['cellRow', 'cellCol', 'cellRegion'].forEach(function (k) {
        expect(equalArrays(model.layout[k], classic.layout[k])).toBe(true);
      });
      expect([model.layout.rows, model.layout.cols]).toEqual([9, 9]);
      expect(Object.isFrozen(model)).toBe(true);
    });

    it('passes SG.model.validate (V1-V8) for every placement, every row and column, and 30 seeds (CV1)',
      function () {
        W.PLACEMENTS.forEach(function (placement) {
          for (var line = 1; line <= 9; line++) {
            var res = SG.model.validate(build({ placement: placement, line: line }, line));
            if (!res.ok) throw new Error(placement + ' ' + line + ': ' + res.errors.join('; '));
            expect(res.warnings).toEqual([]);
          }
        });
        for (var seed = 1; seed <= 30; seed++) expect(SG.model.validate(build({}, seed)).ok).toBe(true);
        expect(SG.model.validate(def.build({}, null)).ok).toBe(true);
      });

    it('puts the word on the main diagonal by default, as fixedCells with the values of its letters',
      function () {
        for (var seed = 1; seed <= 20; seed++) {
          var model = build({}, seed);
          var info = W.describe(model);
          expect(info.placement).toBe('diagonal');
          expect(info.line).toBeNull();
          expect(info.cells).toEqual(expectedCells('diagonal', 0));
          for (var c = 0; c < 81; c++) {
            expect(model.fixedCells[c] !== 0).toBe(info.cells.indexOf(c) !== -1);
          }
          info.cells.forEach(function (cell, i) {
            var value = model.fixedCells[cell];
            expect(value).toBeGreaterThan(0);
            expect(value).toBeLessThan(10);
            expect(model.symbols.labels[value - 1]).toBe(info.word.charAt(i));
          });
        }
      });

    it('puts the word on the chosen row or column: all 9 rows, all 9 columns', function () {
      for (var line = 1; line <= 9; line++) {
        ['row', 'column'].forEach(function (placement) {
          var model = build({ placement: placement, line: line }, 40 + line);
          var info = W.describe(model);
          expect(info.placement).toBe(placement);
          expect(info.line).toBe(line);
          expect(info.cells).toEqual(expectedCells(placement, line - 1));
          expect(clueCount(model.fixedCells)).toBe(9);
          info.cells.forEach(function (cell, i) {
            expect(model.symbols.labels[model.fixedCells[cell] - 1]).toBe(info.word.charAt(i));
          });
        });
      }
    });

    it('the values on the line are a permutation of 1..9 (the 9 letters are all different)', function () {
      for (var seed = 1; seed <= 20; seed++) {
        W.PLACEMENTS.forEach(function (placement) {
          var model = build({ placement: placement }, seed);
          var values = W.describe(model).cells.map(function (c) { return model.fixedCells[c]; });
          expect(values.slice().sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });
      }
    });

    it('the symbol set is the letters of the word in alphabetical order, mode "word"', function () {
      for (var seed = 1; seed <= 20; seed++) {
        var model = build({ placement: W.PLACEMENTS[seed % 3] }, seed);
        var word = W.describe(model).word;
        expect(model.symbols.mode).toBe('word');
        expect(model.symbols.labels).toHaveLength(9);
        expect(model.symbols.labels.join('')).toBe(sortedLetters(word));
        expect(nineDistinct(model.symbols.labels.join(''))).toBe(true);
        expect(SG.wordlists.en).toContain(word);
      }
    });

    it('the word line is marked by one layout overlay of kind "wordLine", in reading order', function () {
      W.PLACEMENTS.forEach(function (placement) {
        var model = build({ placement: placement, line: 4 }, 3);
        expect(model.layout.overlays).toHaveLength(1);
        expect(model.layout.overlays[0].kind).toBe(W.OVERLAY_KIND);
        expect(W.OVERLAY_KIND).toBe('wordLine');
        expect(Array.from(model.layout.overlays[0].cells)).toEqual(W.describe(model).cells);
      });
    });

    it('line 0 draws a random row or column from the rng: the same for a seed, varied over seeds',
      function () {
        var lines = {};
        for (var seed = 1; seed <= 60; seed++) {
          var a = W.describe(build({ placement: 'row' }, seed));
          var b = W.describe(build({ placement: 'row', line: 0 }, seed));
          expect(a.line).toBe(b.line);
          expect(a.line).toBeGreaterThan(0);
          expect(a.line).toBeLessThan(10);
          lines[a.line] = true;
        }
        expect(Object.keys(lines).length).toBeGreaterThanOrEqual(7);
      });

    it('the row or column number is ignored for the diagonal', function () {
      for (var line = 0; line <= 9; line++) {
        expect(W.describe(build({ placement: 'diagonal', line: line }, 5)).cells)
          .toEqual(expectedCells('diagonal', 0));
      }
      expect(W.describe(build({ placement: 'diagonal', line: 7 }, 5)).word)
        .toBe(W.describe(build({ placement: 'diagonal' }, 5)).word);
    });

    it('a word of the user\'s own is used as it is, with diacritics and spaces ignored', function () {
      var model = build({ word: 'Bạch Dương', placement: 'column', line: 2 }, 1);
      var info = W.describe(model);
      expect(info.word).toBe('BACHDUONG');
      expect(info.placement).toBe('column');
      expect(info.line).toBe(2);
      expect(model.symbols.labels.join('')).toBe('ABCDGHNOU');
      expect(W.describe(build({ word: 'algorithm' }, 9)).word).toBe('ALGORITHM');
      // It overrides the language, and it does not have to be in a list.
      expect(W.describe(build({ word: 'jackdowns', language: 'vi' }, 9)).word).toBe('JACKDOWNS');
    });

    it('the same seed and options give the same model, another seed another word (CV5 at model level)',
      function () {
        var words = {};
        for (var seed = 1; seed <= 40; seed++) {
          var a = build({ placement: 'row' }, seed);
          var b = build({ placement: 'row' }, seed);
          expect(equalArrays(a.fixedCells, b.fixedCells)).toBe(true);
          expect(a.symbols.labels).toEqual(b.symbols.labels);
          expect(Array.from(a.layout.overlays[0].cells)).toEqual(Array.from(b.layout.overlays[0].cells));
          words[W.describe(a).word] = true;
        }
        expect(Object.keys(words).length).toBeGreaterThanOrEqual(20);
        expect(equalArrays(def.build({}, null).fixedCells, def.build({}, null).fixedCells)).toBe(true);
      });

    it('the word is not a clue: solvers work from givens alone, so the empty grid still has many solutions',
      function () {
        var model = build({}, 7);
        expect(SG.dfs.countSolutions(model, new Int32Array(81), 2)).toBe(2);
        // ...whereas validation does solve the board with the word forced onto its line.
        var solution = SG.dfs.solve(model, model.fixedCells);
        expect(solution).toBeTruthy();
        expect(W.readWord(model, solution)).toBe(W.describe(model).word);
        // With the word as givens the board has many solutions: nine clues do not make a puzzle.
        expect(SG.dfs.countSolutions(model, model.fixedCells, 2)).toBe(2);
      });

    it('generates a valid full grid for 50 seeds (CV2) with the word on its line in every one', function () {
      var seen = {};
      for (var seed = 1; seed <= 50; seed++) {
        var opts = { placement: W.PLACEMENTS[seed % 3] };
        var model = build(opts, seed);
        var grid = SG.fullGrid.generate(model, SG.rng.create(1000 + seed), null);
        check(SG.model.isSolution(model, grid), 'seed ' + seed + ': not a valid grid');
        var info = W.describe(model);
        info.cells.forEach(function (cell) {
          check(grid[cell] === model.fixedCells[cell], 'seed ' + seed + ': fixed cell ' + cell + ' not ' +
            'honoured');
        });
        check(W.readWord(model, grid) === info.word, 'seed ' + seed + ': the line spells ' +
          W.readWord(model, grid) + ' and not ' + info.word);
        check(W.isWordSolved(model, grid), 'seed ' + seed + ': isWordSolved');
        seen[Array.from(grid).join('')] = true;
      }
      expect(Object.keys(seen).length).toBeGreaterThanOrEqual(48);
    });

    it('the same seeds give the same grid, with and without the event emitter (I4)', function () {
      var model = build({ placement: 'column', line: 3 }, 11);
      var a = SG.fullGrid.generate(model, SG.rng.create(77), null);
      var b = SG.fullGrid.generate(model, SG.rng.create(77), null, { emit: function () {} });
      expect(equalArrays(a, b)).toBe(true);
    });

    it('a full grid is quick: 200 grids on every placement take well under a second each', function () {
      var t0 = now();
      for (var seed = 1; seed <= 200; seed++) {
        var model = build({ placement: W.PLACEMENTS[seed % 3] }, seed);
        SG.fullGrid.generate(model, SG.rng.create(seed), null);
      }
      expect((now() - t0) / 200).toBeLessThan(25);
    });
  });

  describe('wordoku: puzzles at every level (CV3, CV4: invariants I1-I7)', function () {
    LEVELS.forEach(function (level) {
      describe(level + ': ' + PUZZLES_PER_LEVEL + ' puzzles', function () {
        it('I1: exactly one solution (from the givens alone); I2: givens are part of the solution; ' +
          'I3: it satisfies every unit', function () {
          puzzleRun()[level].forEach(function (p, i) {
            check(SG.dfs.countSolutions(p.model, p.givens, 2) === 1, 'puzzle ' + i + ': not unique');
            for (var c = 0; c < 81; c++) {
              check(p.givens[c] === 0 || p.givens[c] === p.solution[c], 'puzzle ' + i + ': I2');
            }
            check(SG.model.isSolution(p.model, p.solution), 'puzzle ' + i + ': I3');
            check(SG.model.validate(p.model).ok, 'puzzle ' + i + ': model does not validate');
            expect(Array.from(SG.dfs.solve(p.model, p.givens))).toEqual(Array.from(p.solution));
          });
        });

        it('the word appears on the chosen line of the solution, letter by letter', function () {
          puzzleRun()[level].forEach(function (p, i) {
            var info = W.describe(p.model);
            var want = PLACEMENT_CYCLE[i % PLACEMENT_CYCLE.length].placement;
            check(info.placement === want, 'puzzle ' + i + ': placement ' + info.placement);
            check(SG.wordlists.en.indexOf(info.word) !== -1, 'puzzle ' + i + ': ' + info.word + ' is not ' +
              'listed');
            check(W.readWord(p.model, p.solution) === info.word, 'puzzle ' + i + ': the line spells ' +
              W.readWord(p.model, p.solution) + ', the word is ' + info.word);
            check(W.isWordSolved(p.model, p.solution), 'puzzle ' + i + ': isWordSolved');
            info.cells.forEach(function (cell, k) {
              check(p.model.symbols.labels[p.solution[cell] - 1] === info.word.charAt(k),
                'puzzle ' + i + ': cell ' + cell);
              check(p.solution[cell] === p.model.fixedCells[cell], 'puzzle ' + i + ': fixed cell ' + cell);
            });
          });
        });

        it('solving it reveals the word: the solver, from the givens alone, ends with the word on its line',
          function () {
            puzzleRun()[level].forEach(function (p, i) {
              var info = W.describe(p.model);
              var solved = SG.dfs.solve(p.model, p.givens);
              check(W.readWord(p.model, solved) === info.word, 'puzzle ' + i + ': dfs');
              if (i < 4) {
                var report = SG.logicalSolver.solve(p.model, p.givens, { collectSteps: false });
                check(report.solved === true, 'puzzle ' + i + ': the logical solver is stuck');
                check(W.readWord(p.model, report.state.value) === info.word, 'puzzle ' + i + ': logic');
              }
            });
          });

        it('I5: every puzzle has a complete proof, and one that reached the level has its score in the ' +
          'band; I6: at least minClues givens, every unit its minimum', function () {
          var exact = 0;
          puzzleRun()[level].forEach(function (p, i) {
            var spec = SG.difficulty.spec(level, p.model);
            if (clueCount(p.givens) < spec.minClues) throw new Error('puzzle ' + i + ': too few clues');
            p.model.units.forEach(function (u) {
              var inUnit = 0;
              for (var k = 0; k < u.length; k++) if (p.givens[u[k]] !== 0) inUnit++;
              if (inUnit < spec.minCluesPerUnit) throw new Error('puzzle ' + i + ': a unit has ' + inUnit);
            });
            expect(p.config.difficulty).toBe(level);
            if (p.rating.level === level) {
              exact++;
              expect(p.rating.score).toBeGreaterThanOrEqual(spec.min);
              expect(p.rating.score).toBeLessThan(spec.max);
              expect(p.warnings).toEqual([]);
            }
            expect(SG.difficulty.rate(p.model, p.givens).level).toBe(p.rating.level);
            expect(p.rating.solved).toBe(true);
          });
          expect(exact / PUZZLES_PER_LEVEL).toBeGreaterThanOrEqual(0.9);
        });

        it('the clues follow the symmetry of the configuration (rotational180), the word line included',
          function () {
            puzzleRun()[level].forEach(function (p, i) {
              for (var c = 0; c < 81; c++) {
                if ((p.givens[c] !== 0) !== (p.givens[80 - c] !== 0)) throw new Error('puzzle ' + i + ': ' +
                  'cell ' + c);
              }
            });
          });

        it('CV6: p95 of the generation time is within the design.md 9.1 budget of ' + BUDGET_MS[level] +
          ' ms',
          function () {
            var times = puzzleRun()[level].map(function (p) { return p.elapsedMs; });
            expect(percentile(times, 0.95)).toBeLessThan(SG.test.timeLimit(BUDGET_MS[level]));
          });
      });
    });

    it('the word line is dug like any other cells: the word is not given away', function () {
      var lineGiven = 0;
      var lineCells = 0;
      var givens = 0;
      var cells = 0;
      allPuzzles().forEach(function (p, i) {
        var info = W.describe(p.model);
        var onLine = info.cells.filter(function (c) { return p.givens[c] !== 0; }).length;
        lineGiven += onLine;
        lineCells += 9;
        givens += clueCount(p.givens);
        cells += 81;
        // The word is not a given of the puzzle: the nine fixed cells are not simply handed out.
        if (p.config.difficulty === 'hard' || p.config.difficulty === 'master') {
          check(onLine < 9, 'puzzle ' + i + ' (' + p.config.difficulty + '): the whole word is a clue');
          check(W.readWord(p.model, p.givens).indexOf('_') !== -1, 'puzzle ' + i + ': no blank on the line');
        }
      });
      // The line carries about as many clues as the rest of the grid, not all of them and not none.
      expect(lineGiven).toBeGreaterThan(0);
      expect(lineGiven / lineCells).toBeGreaterThan(givens / cells - 0.12);
      expect(lineGiven / lineCells).toBeLessThan(givens / cells + 0.12);
    });

    it('Vietnamese words work too: puzzles of every level keep all the invariants', function () {
      LEVELS.forEach(function (level, li) {
        for (var i = 0; i < 3; i++) {
          var p = generate(level, 8000 + 10 * li + i, {
            variantOptions: { language: 'vi', placement: W.PLACEMENTS[i % 3] }
          });
          var info = W.describe(p.model);
          var list = W.validWords(SG.wordlists.vi).length >= W.MIN_WORDS ? SG.wordlists.vi : SG.wordlists.en;
          check(list.indexOf(info.word) !== -1, level + ' ' + i + ': ' + info.word + ' is not in the list');
          check(SG.dfs.countSolutions(p.model, p.givens, 2) === 1, level + ' ' + i + ': not unique');
          check(W.isWordSolved(p.model, p.solution), level + ' ' + i + ': the word is not on its line');
        }
      });
    });

    it('a word of the user\'s own works end to end, on a column', function () {
      var p = generate('normal', 4242,
        { variantOptions: { word: 'Bạch Dương', placement: 'column', line: 5 } });
      var info = W.describe(p.model);
      expect([info.word, info.placement, info.line]).toEqual(['BACHDUONG', 'column', 5]);
      expect(p.model.symbols.labels.join('')).toBe('ABCDGHNOU');
      expect(SG.dfs.countSolutions(p.model, p.givens, 2)).toBe(1);
      expect(W.isWordSolved(p.model, p.solution)).toBe(true);
      expect(p.config.variantOptions).toEqual({ word: 'Bạch Dương', placement: 'column', line: 5 });
    });

    it('the default configuration of the pipeline is the main diagonal with an English word', function () {
      var p = generate('veryEasy', 5);
      var info = W.describe(p.model);
      expect(info.placement).toBe('diagonal');
      expect(info.cells).toEqual(expectedCells('diagonal', 0));
      expect(SG.wordlists.en).toContain(info.word);
      expect(p.config.symbolMode).toBe('word');
    });

    it('clue counts fall over the first levels and scores rise with every level (means over a level)',
      function () {
        function mean(values) { return values.reduce(function (a, b) { return a + b; }, 0) / values.length; }
        var clues = LEVELS.map(function (l) {
          return mean(puzzleRun()[l].map(function (p) { return clueCount(p.givens); }));
        });
        var scores = LEVELS.map(function (l) {
          return mean(puzzleRun()[l].map(function (p) { return p.rating.score; }));
        });
        // Rating v2: the score, not the clue count, sets the level. Past 'normal' the clue counts sit on a
        // plateau (the top tiers refine their proposals by showing clues again), as on classic9.
        expect(clues[0]).toBeGreaterThan(clues[1]);
        expect(clues[1]).toBeGreaterThan(clues[2]);
        for (var k = 3; k < LEVELS.length; k++) expect(clues[k]).toBeLessThan(clues[1]);
        for (var i = 1; i < LEVELS.length; i++) expect(scores[i]).toBeGreaterThan(scores[i - 1]);
      });
  });

  describe('wordoku: same seed, same puzzle (CV5 / I4)', function () {
    it('every level, every placement: two runs give the same givens, solution, word and symbols',
      function () {
        LEVELS.forEach(function (level, li) {
          for (var i = 0; i < PLACEMENT_CYCLE.length; i++) {
            var seed = 100 * (li + 1) + i;
            var a = puzzleRun()[level][i];
            var b = generate(level, seed, { variantOptions: PLACEMENT_CYCLE[i] });
            expect(equalArrays(a.givens, b.givens)).toBe(true);
            expect(equalArrays(a.solution, b.solution)).toBe(true);
            expect(W.describe(a.model)).toEqual(W.describe(b.model));
            expect(a.model.symbols.labels).toEqual(b.model.symbols.labels);
            expect(a.rating.level).toBe(b.rating.level);
          }
        });
      });

    it('the result does not depend on the trace level or on a listening sink', function () {
      var base = generate('normal', 31, { trace: 'summary' });
      ['off', 'full'].forEach(function (trace) {
        var other = SG.pipeline.run({ variantId: 'wordoku', difficulty: 'normal', seed: 31, trace: trace },
          function () {});
        expect(equalArrays(base.givens, other.givens)).toBe(true);
        expect(equalArrays(base.solution, other.solution)).toBe(true);
      });
      var silent = SG.pipeline.run(
        { variantId: 'wordoku', difficulty: 'normal', seed: 31, trace: 'summary' }, null);
      expect(equalArrays(base.givens, silent.givens)).toBe(true);
    });

    it('another seed gives another puzzle, and other options another one again', function () {
      var a = generate('hard', 600, {});
      var b = generate('hard', 601, {});
      var c = generate('hard', 600, { variantOptions: { placement: 'row', line: 1 } });
      expect(equalArrays(a.givens, b.givens)).toBe(false);
      expect(equalArrays(a.givens, c.givens)).toBe(false);
      expect(equalArrays(c.model.fixedCells, a.model.fixedCells)).toBe(false);
    });
  });

  describe('wordoku: the pipeline and its events', function () {
    function trace(level, seed, traceLevel, extra) {
      var events = [];
      var result = SG.pipeline.run(Object.assign({ variantId: 'wordoku', difficulty: level, seed: seed,
        trace: traceLevel }, extra), function (e) { events.push(e); });
      return { result: result, events: events };
    }

    /** Every event is valid, in the shared vocabulary, with only its declared arguments and patch fields. */
    function checkEvents(events) {
      events.forEach(function (e, i) {
        var problems = E.eventProblems(e);
        if (problems.length > 0) {
          throw new Error('event ' + i + ' (' + e.i18nKey + '): ' + problems.join('; '));
        }
        if (e.seq !== i) throw new Error('seq ' + e.seq + ' at index ' + i);
        var v = E.lookup(e);
        if (v === null) {
          throw new Error('not in the vocabulary: ' + [e.type, e.stepId, e.phase, e.i18nKey].join(' '));
        }
        if (e.i18nArgs && v.key !== 'error.*') {
          Object.keys(e.i18nArgs).forEach(function (a) {
            if (v.args.indexOf(a) === -1 && a !== 'part' && a !== 'parts') {
              throw new Error(e.i18nKey + ' has the undeclared argument "' + a + '"');
            }
          });
        }
      });
    }

    function stepFour(events, keyPrefix) {
      return events.filter(function (e) {
        return e.stepId === 'extraStructure' && e.i18nKey && e.i18nKey.indexOf(keyPrefix) === 0;
      });
    }

    it('runs the seven steps in order and reports the word line in step 4, once per full grid', function () {
      var out = trace('normal', 11, 'summary');
      var starts = out.events.filter(function (e) { return e.type === 'step' && e.phase === 'start'; });
      expect(starts.map(function (e) { return e.stepId; }).slice(0, 7)).toEqual(STEPS);
      var found = stepFour(out.events, 'extraStructure.word');
      expect(found).toHaveLength(out.result.attempts);
      found.forEach(function (e) {
        expect(e.i18nKey).toBe('extraStructure.wordDiagonal');
        expect(e.i18nArgs).toEqual({ length: 9 });
      });
      var built = out.events.filter(function (e) { return e.i18nKey === 'extraStructure.built'; });
      expect(built).toHaveLength(out.result.attempts);
      expect(out.events.filter(function (e) { return e.i18nKey === 'extraStructure.none'; })).toHaveLength(0);
    });

    it('names the row or the column of the word, counted from 1', function () {
      var row = trace('veryEasy', 12, 'summary', { variantOptions: { placement: 'row', line: 7 } });
      var col = trace('veryEasy', 13, 'summary', { variantOptions: { placement: 'column', line: 3 } });
      stepFour(row.events, 'extraStructure.word').forEach(function (e) {
        expect(e.i18nKey).toBe('extraStructure.wordRow');
        expect(e.i18nArgs).toEqual({ length: 9, line: 7 });
      });
      stepFour(col.events, 'extraStructure.word').forEach(function (e) {
        expect(e.i18nKey).toBe('extraStructure.wordColumn');
        expect(e.i18nArgs).toEqual({ length: 9, line: 3 });
      });
      expect(stepFour(row.events, 'extraStructure.word').length).toBeGreaterThan(0);
      expect(stepFour(col.events, 'extraStructure.word').length).toBeGreaterThan(0);
    });

    it('lists its events in the vocabulary of the core, each once, at the summary level', function () {
      ['extraStructure.wordDiagonal', 'extraStructure.wordRow', 'extraStructure.wordColumn',
        'extraStructure.wordFallback'].forEach(function (key) {
        var entries = E.VOCABULARY.filter(function (v) { return v.key === key; });
        expect(entries).toHaveLength(1);
        expect(entries[0].type).toBe('step');
        expect(entries[0].stepId).toBe('extraStructure');
        expect(entries[0].phase).toBe('progress');
        expect(entries[0].level).toBe('summary');
        expect(E.vocabularyKeys()).toContain(key);
      });
    });

    it('every event of a full trace is valid and in the vocabulary, and the replayed board is the puzzle',
      function () {
        ['veryEasy', 'normal', 'master'].forEach(function (level, i) {
          var out = trace(level, 20 + i, 'full', { variantOptions: PLACEMENT_CYCLE[i + 1] });
          checkEvents(out.events);
          var view = E.createView(81);
          out.events.forEach(function (e) { if (e.patch) E.applyPatch(view, e.patch); });
          expect(Array.from(view.value)).toEqual(Array.from(out.result.givens));
        });
      });

    it('the full grid step shows the word forced onto the empty board before anything else is placed',
      function () {
        var out = trace('easy', 4, 'full');
        var firstPlace = out.events.findIndex(function (e) { return e.i18nKey === 'fullGrid.place'; });
        var fixed = out.events.slice(0, firstPlace).filter(function (e) {
          return e.i18nKey === 'fullGrid.fixed';
        });
        expect(fixed.length).toBeGreaterThan(0);
        var shown = {};
        fixed.forEach(function (e) { e.patch.cells.forEach(function (c) { shown[c.i] = c.value; }); });
        expectedCells('diagonal', 0).forEach(function (cell) {
          expect(shown[cell]).toBe(out.result.model.fixedCells[cell]);
        });
      });

    it('no event, at any trace level, ever contains the word', function () {
      ['off', 'summary', 'full'].forEach(function (level, i) {
        var out = trace('hard', 50 + i, level, { variantOptions: PLACEMENT_CYCLE[i] });
        var word = W.describe(out.result.model).word;
        expect(JSON.stringify(out.events).indexOf(word)).toBe(-1);
      });
    });

    it('with trace off, step 4 sends only its start and its end', function () {
      var out = trace('hard', 3, 'off');
      var own = out.events.filter(function (e) { return e.stepId === 'extraStructure'; });
      expect(own.map(function (e) { return e.i18nKey; }))
        .toEqual(['extraStructure.start', 'extraStructure.end']);
    });

    it('an empty Vietnamese list: the puzzle gets an English word and step 4 says so', function () {
      withLists({ vi: [] }, function () {
        var out = trace('easy', 14, 'summary', { variantOptions: { language: 'vi' } });
        var notice = stepFour(out.events, 'extraStructure.wordFallback');
        expect(notice).toHaveLength(out.result.attempts);
        expect(notice[0].i18nArgs).toBeUndefined();
        expect(SG.wordlists.en).toContain(W.describe(out.result.model).word);
        expect(SG.dfs.countSolutions(out.result.model, out.result.givens, 2)).toBe(1);
        expect(W.isWordSolved(out.result.model, out.result.solution)).toBe(true);
        checkEvents(out.events);
        // The notice comes before the line of the word.
        var keys = stepFour(out.events, 'extraStructure.word').map(function (e) { return e.i18nKey; });
        expect(keys[0]).toBe('extraStructure.wordFallback');
      });
    });

    it('a usable Vietnamese list, or the English one, gives no notice', function () {
      withLists({ vi: VI_ENOUGH }, function () {
        var out = trace('easy', 15, 'summary', { variantOptions: { language: 'vi' } });
        expect(stepFour(out.events, 'extraStructure.wordFallback')).toHaveLength(0);
        expect(VI_ENOUGH).toContain(W.describe(out.result.model).word);
      });
      var en = trace('easy', 16, 'summary', { variantOptions: { language: 'en' } });
      expect(stepFour(en.events, 'extraStructure.wordFallback')).toHaveLength(0);
    });

    it('the hook leaves the model alone and copes with a bare context and with a foreign model', function () {
      var model = build({}, 8);
      var solution = SG.fullGrid.generate(model, SG.rng.create(8), null);
      expect(def.postGenerate({ model: model, solution: solution })).toBeUndefined();
      var classic = SG.variants.get('classic9').build({}, null);
      var events = [];
      expect(def.postGenerate({ model: classic, solution: solution, emit: function (e) { events.push(e); } }))
        .toBeUndefined();
      expect(events).toHaveLength(0);
    });
  });

  describe('wordoku: strings in both languages (CV7)', function () {
    function fragments() {
      return SG.localeFragments.filter(function (f) {
        return f.en && f.en['variant.wordoku'] !== undefined;
      });
    }

    function fragment() {
      expect(fragments()).toHaveLength(1);
      return fragments()[0];
    }

    function placeholders(text) {
      return (text.match(/\{[A-Za-z]+\}/g) || []).sort();
    }

    it('declares one fragment with en and vi, as SG.localeFragments entries', function () {
      expect(Array.isArray(SG.localeFragments)).toBe(true);
      var f = fragment();
      expect(typeof f.en).toBe('object');
      expect(typeof f.vi).toBe('object');
    });

    it('names the variant in both languages', function () {
      var f = fragment();
      expect(f.en['variant.wordoku']).toBe('Wordoku');
      expect(f.vi['variant.wordoku']).toBe('Sudoku Chữ');
    });

    it('has a label and a hint for every option, a name for every choice and for the special slider and ' +
      'text values', function () {
      var f = fragment();
      var keys = [def.i18nKey];
      def.options.forEach(function (o) {
        keys.push(o.i18nKey, o.hintKey);
        if (o.choices) o.choices.forEach(function (c) { keys.push(c.i18nKey); });
        if (o.defaultLabelKey) keys.push(o.defaultLabelKey);
        if (o.placeholderKey) keys.push(o.placeholderKey);
      });
      expect(keys.length).toBeGreaterThanOrEqual(16);
      keys.forEach(function (key) {
        expect(f.en[key]).toBeDefined();
        expect(f.vi[key]).toBeDefined();
      });
    });

    it('translates the empty-Vietnamese-list notice, the events of step 4 and the error it can throw',
      function () {
        var f = fragment();
        var own = E.VOCABULARY.filter(function (v) {
          return v.stepId === 'extraStructure' && v.key !== null && f.en[v.key] !== undefined;
        });
        expect(own.map(function (v) { return v.key; }).sort()).toEqual(['extraStructure.wordColumn',
          'extraStructure.wordDiagonal', 'extraStructure.wordFallback', 'extraStructure.wordRow']);
        own.forEach(function (v) {
          [f.en, f.vi].forEach(function (pack) {
            placeholders(pack[v.key]).forEach(function (p) { expect(v.args).toContain(p.slice(1, -1)); });
          });
        });
        // The fallback notice names English, the Vietnamese text says "tiếng Anh".
        expect(f.en['extraStructure.wordFallback']).toContain('English');
        expect(f.vi['extraStructure.wordFallback']).toContain('tiếng Anh');
        expect(placeholders(f.en['error.wordoku.noWordList'])).toEqual(['{language}']);
        expect(placeholders(f.vi['error.wordoku.noWordList'])).toEqual(['{language}']);
      });

    it('writes Vietnamese with diacritics (natural text, not the English words)', function () {
      var f = fragment();
      Object.keys(f.vi).forEach(function (key) {
        expect(/[^\x00-\x7f]/.test(f.vi[key])).toBe(true);
      });
    });
  });

  describe('wordoku: data for the board view (CV9)', function () {
    /**
     * Draws a board as text the way a renderer would: the symbol of the value in every cell, a dot for an
     * empty one, and square brackets around the cells of the word line.
     */
    function draw(model, values) {
      var onLine = {};
      W.describe(model).cells.forEach(function (c) { onLine[c] = true; });
      var lines = [];
      for (var r = 0; r < 9; r++) {
        var text = '';
        for (var c = 0; c < 9; c++) {
          var v = values[r * 9 + c];
          var ch = v === 0 ? '.' : model.symbols.labels[v - 1];
          text += onLine[r * 9 + c] ? '[' + ch + ']' : ' ' + ch + ' ';
        }
        lines.push(text);
      }
      return lines;
    }

    /** Reads the highlighted letters of a drawing back, top to bottom and left to right. */
    function bracketed(lines) {
      var out = '';
      lines.forEach(function (line) {
        for (var c = 0; c < 9; c++) if (line.charAt(3 * c) === '[') out += line.charAt(3 * c + 1);
      });
      return out;
    }

    it('describe gives the placement, the number of the line, the cells in reading order and the word',
      function () {
        var cases = [['diagonal', 0, null], ['row', 6, 6], ['column', 2, 2]];
        cases.forEach(function (c) {
          var model = build({ placement: c[0], line: c[1], word: 'algorithm' }, 1);
          var info = W.describe(model);
          expect(info.placement).toBe(c[0]);
          expect(info.line).toBe(c[2]);
          expect(info.cells).toEqual(expectedCells(c[0], Math.max(c[1] - 1, 0)));
          expect(info.letters).toEqual('ALGORITHM'.split(''));
          expect(info.word).toBe('ALGORITHM');
        });
      });

    it('describe is null for a model that has no word line, and for things that are not models', function () {
      expect(W.describe(SG.variants.get('classic9').build({}, null))).toBeNull();
      expect(W.describe(null)).toBeNull();
      expect(W.describe(undefined)).toBeNull();
      expect(W.describe({})).toBeNull();
      expect(W.readWord(SG.variants.get('classic9').build({}, null), new Int32Array(81))).toBeNull();
      expect(W.isWordSolved(SG.variants.get('classic9').build({}, null), new Int32Array(81))).toBe(false);
    });

    it('describe only needs the model, so it works on a copy that crossed a worker boundary', function () {
      if (typeof structuredClone !== 'function') SG.test.skip('structuredClone is not available here');
      W.PLACEMENTS.forEach(function (placement) {
        var model = build({ placement: placement }, 9);
        expect(W.describe(structuredClone(model))).toEqual(W.describe(model));
      });
    });

    it('readWord spells the line of a board, with a blank for every empty cell', function () {
      var p = puzzleRun().hard[0];
      var info = W.describe(p.model);
      expect(W.readWord(p.model, p.solution)).toBe(info.word);
      var partial = W.readWord(p.model, p.givens);
      expect(partial).toHaveLength(9);
      for (var i = 0; i < 9; i++) {
        var given = p.givens[info.cells[i]];
        expect(partial.charAt(i)).toBe(given === 0 ? '_' : info.word.charAt(i));
      }
      expect(W.readWord(p.model, new Int32Array(81))).toBe('_________');
      expect(W.readWord(p.model, new Int32Array(81), '.')).toBe('.........');
    });

    it('isWordSolved is true for the solution and false for anything that does not spell the word',
      function () {
        var p = puzzleRun().normal[2];
        var info = W.describe(p.model);
        expect(W.isWordSolved(p.model, p.solution)).toBe(true);
        expect(W.isWordSolved(p.model, p.givens)).toBe(info.cells.filter(function (c) {
          return p.givens[c] !== 0;
        }).length === 9);
        var swapped = Int32Array.from(p.solution);
        var a = info.cells[0];
        var b = info.cells[1];
        swapped[a] = p.solution[b];
        swapped[b] = p.solution[a];
        expect(W.isWordSolved(p.model, swapped)).toBe(false);
        expect(W.isWordSolved(p.model, new Int32Array(81))).toBe(false);
      });

    it('drawn as text and read back, the highlighted cells spell the word for every placement and puzzle',
      function () {
        var checked = 0;
        allPuzzles().forEach(function (p, i) {
          var info = W.describe(p.model);
          var lines = draw(p.model, p.solution);
          expect(lines).toHaveLength(9);
          check(bracketed(lines) === info.word, 'puzzle ' + i + ': the brackets spell ' + bracketed(lines));
          // The letters of the line are 9 different symbols, and every symbol of the board is one of them.
          var all = lines.join('').replace(/[\[\] ]/g, '');
          check(all.split('').every(function (ch) { return p.model.symbols.labels.indexOf(ch) !== -1; }),
            'puzzle ' + i + ': a symbol outside the label set');
          checked++;
        });
        expect(checked).toBe(LEVELS.length * PUZZLES_PER_LEVEL);
      });

    it('the letters make a real Sudoku: each row, column and box of the drawing holds the 9 symbols once',
      function () {
        var p = puzzleRun().veryEasy[2];
        var lines = draw(p.model, p.solution).map(function (l) { return l.replace(/[\[\] ]/g, ''); });
        var labels = sortedLetters(p.model.symbols.labels.join(''));
        for (var i = 0; i < 9; i++) {
          expect(sortedLetters(lines[i])).toBe(labels);
          var col = '';
          var box = '';
          for (var k = 0; k < 9; k++) {
            col += lines[k].charAt(i);
            box += lines[Math.floor(i / 3) * 3 + Math.floor(k / 3)].charAt((i % 3) * 3 + (k % 3));
          }
          expect(sortedLetters(col)).toBe(labels);
          expect(sortedLetters(box)).toBe(labels);
        }
      });

    it('the digits view: the values of the word line are the ranks of its letters, not 1..9 in order',
      function () {
        var inOrder = 0;
        for (var seed = 1; seed <= 40; seed++) {
          var model = build({}, seed);
          var values = W.describe(model).cells.map(function (c) { return model.fixedCells[c]; });
          if (values.join('') === '123456789') inOrder++;
        }
        // A word whose letters are already in alphabetical order would read 1..9, but no list word is.
        expect(inOrder).toBe(0);
      });
  });

  describe('wordoku: code hygiene', function () {
    var OWN_FILES = ['js/variants/wordoku.js', 'assets/wordlists/isograms.en.js',
      'assets/wordlists/isograms.vi.js'];

    it('has no mention of wordoku in the engines: it reaches the core only through the registry and the ' +
      'hooks',
      function () {
        var env = SG.test.node;
        if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
        ['../core/js/engine', 'js/engine'].forEach(function (rel) {
          var dir = env.path.join(env.root, rel);
          env.fs.readdirSync(dir).filter(function (n) { return n.endsWith('.js'); }).forEach(function (name) {
            var text = env.fs.readFileSync(env.path.join(dir, name), 'utf8');
            text.split(/\r?\n/).forEach(function (line, i) {
              if (/wordoku/i.test(line)) {
                throw new Error(rel + '/' + name + ':' + (i + 1) + ' mentions wordoku: ' + line.trim());
              }
            });
          });
        });
      });

    it('keeps its files free of DOM access and module syntax, with lines of at most 110 characters',
      function () {
        var env = SG.test.node;
        if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
        OWN_FILES.forEach(function (rel) {
          var text = env.fs.readFileSync(env.path.join(env.root, rel), 'utf8');
          var forbidden = ['document.', 'window.', 'localStorage', 'alert(', 'import ', 'export ',
            'require('];
          forbidden.forEach(function (token) {
            if (text.indexOf(token) !== -1) throw new Error(rel + ' contains "' + token + '"');
          });
          text.split(/\r?\n/).forEach(function (line, i) {
            if (line.length > 110) {
              throw new Error(rel + ':' + (i + 1) + ' is ' + line.length + ' characters long');
            }
          });
          expect(/^\s*'use strict';/m.test(text)).toBe(true);
        });
      });

    it('adds the variant through the registry only: no hook the registry does not know', function () {
      var known = ['id', 'i18nKey', 'group', 'digits', 'difficultySupport', 'defaultSymbolMode',
        'symbolModes', 'options', 'build', 'postGenerate', 'digStrategy', 'fastSeed'];
      Object.keys(def).forEach(function (k) { expect(known).toContain(k); });
    });
  });
})();
