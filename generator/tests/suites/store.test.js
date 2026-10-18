// Application state (task T-4.4, design.md 10.4 / 14.2 / 14.3): SG.store. The pure part (defaults, sanitize,
// URL parse / serialise, toConfig) and the stateful part (create / get / set / subscribe / load / save /
// syncUrl), all on Node with fake storage, location and history. `SG.i18n` is switched by `lang`, so every
// test that can change the language puts English back.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var S = SG.store;

  function ready() {
    if (!S || !SG.i18n) SG.test.skip('SG.store / SG.i18n are not loaded here');
  }

  var NAV = { languages: [] };

  function memoryStorage(initial) {
    var data = Object.assign({}, initial);
    return {
      data: data,
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
      setItem: function (key, value) { data[key] = String(value); },
      removeItem: function (key) { delete data[key]; }
    };
  }

  function blockedStorage() {
    function boom() { throw new Error('SecurityError: storage is blocked'); }
    return { getItem: boom, setItem: boom, removeItem: boom };
  }

  function env(search) {
    var e = { urls: [] };
    e.location = { search: search || '', pathname: '/index.html', hash: '#top' };
    e.history = { state: null, replaceState: function (state, title, url) { e.urls.push(url); } };
    return e;
  }

  function makeStore(options) {
    var e = options && options.env ? options.env : env('');
    var opts = Object.assign({ storage: memoryStorage(), location: e.location, history: e.history,
      navigator: NAV }, options);
    delete opts.env;
    return S.create(opts);
  }

  function withEnglish(fn) {
    try {
      return fn();
    } finally {
      SG.i18n.setLocale('en');
    }
  }

  function ids() {
    return SG.variants.list().map(function (def) { return def.id; });
  }

  describe('store: defaults and sanitising', function () {
    it('has the documented defaults', function () {
      ready();
      var d = S.defaults();
      expect(d.variantId).toBe('classic9');
      expect(d.difficulty).toBe('medium');
      expect(d.seed).toBe('');
      expect(d.symmetry).toBe('rotational180');
      expect(d.symbolMode).toBe('digits');
      expect(d.digOrder).toBe('random');
      expect(d.maxAttempts).toBe(8);
      expect(d.showSolution).toBe(false);
      expect(d.variantOptions).toEqual({});
      expect(d.auto).toBe(false);
      expect(d.lang).toBe('en');
      expect(d.theme).toBe('auto');
      expect(d.fontSize).toBe('normal');
      expect(d.reducedMotion).toBe(false);
      expect(d.colorAuxSymbol).toBe(true);
    });

    it('has no replay detail (trace) and no replay speed any more', function () {
      ready();
      var d = S.defaults();
      expect('trace' in d).toBe(false);
      expect('speed' in d).toBe(false);
      expect('trace' in S.sanitize({ trace: 'full', speed: 'manual' })).toBe(false);
      expect('speed' in S.sanitize({ trace: 'full', speed: 'manual' })).toBe(false);
      expect(S.TRACE_LEVELS).toBeUndefined();
      expect(S.SPEEDS).toBeUndefined();
    });

    it('returns a new object every time and sanitising the defaults changes nothing', function () {
      ready();
      var a = S.defaults();
      a.difficulty = 'evil';
      expect(S.defaults().difficulty).toBe('medium');
      expect(S.sanitize(S.defaults())).toEqual(S.defaults());
    });

    it('turns junk into a complete valid state', function () {
      ready();
      [null, undefined, 5, 'x', [], {}, {
        variantId: 7, difficulty: {}, seed: [], maxAttempts: 'many', variantOptions: 'nope', symmetry: null,
        trace: 3, lang: 'xx', theme: 'neon'
      }].forEach(function (junk) {
        expect(S.sanitize(junk)).toEqual(S.defaults());
      });
    });

    it('is idempotent and does not touch its input', function () {
      ready();
      var input = Object.freeze({ variantId: 'classic4', difficulty: 'evil', maxAttempts: 99, seed: ' 12 ' });
      var once = S.sanitize(input);
      expect(S.sanitize(once)).toEqual(once);
      expect(input.difficulty).toBe('evil');
    });

    it('falls back to the closest supported difficulty of the variant', function () {
      ready();
      expect(S.sanitize({ variantId: 'classic4', difficulty: 'evil' }).difficulty).toBe('easy');
      expect(S.sanitize({ variantId: 'classic4', difficulty: 'medium' }).difficulty).toBe('easy');
      expect(S.sanitize({ variantId: 'killer', difficulty: 'evil' }).difficulty).toBe('expert');
      expect(S.sanitize({ variantId: 'samurai', difficulty: 'evil' }).difficulty).toBe('hard');
      expect(S.sanitize({ variantId: 'samurai', difficulty: 'easy' }).difficulty).toBe('easy');
      expect(S.sanitize({ variantId: 'classic9', difficulty: 'evil' }).difficulty).toBe('evil');
      expect(S.sanitize({ variantId: 'classic9', difficulty: 'bogus' }).difficulty).toBe('medium');
    });

    it('keeps the symbol set inside the variant symbolModes', function () {
      ready();
      expect(S.sanitize({ variantId: 'wordoku' }).symbolMode).toBe('word');
      expect(S.sanitize({ variantId: 'wordoku', symbolMode: 'digits' }).symbolMode).toBe('digits');
      expect(S.sanitize({ variantId: 'wordoku', symbolMode: 'colors' }).symbolMode).toBe('word');
      expect(S.sanitize({ variantId: 'classic9', symbolMode: 'word' }).symbolMode).toBe('digits');
      expect(S.sanitize({ variantId: 'mega16', symbolMode: 'shapes' }).symbolMode).toBe('digits');
      expect(S.sanitize({ variantId: 'classic9', symbolMode: 'shapes' }).symbolMode).toBe('shapes');
    });

    it('clamps the maximum attempts to 1..20', function () {
      ready();
      expect(S.sanitize({ maxAttempts: 0 }).maxAttempts).toBe(1);
      expect(S.sanitize({ maxAttempts: -4 }).maxAttempts).toBe(1);
      expect(S.sanitize({ maxAttempts: 21 }).maxAttempts).toBe(20);
      expect(S.sanitize({ maxAttempts: '7' }).maxAttempts).toBe(7);
      expect(S.sanitize({ maxAttempts: 5.6 }).maxAttempts).toBe(6);
      expect(S.sanitize({ maxAttempts: 'x' }).maxAttempts).toBe(8);
      expect(S.sanitize({ maxAttempts: NaN }).maxAttempts).toBe(8);
    });

    it('sanitises the variant options and resets the ones that are hidden', function () {
      ready();
      var killer = S.sanitize({ variantId: 'killer', variantOptions: { cageSize: 99, other: 1 } });
      expect(killer.variantOptions).toEqual({ cageSize: 2 });
      var cage = S.sanitize({ variantId: 'classic9', variantOptions: { cageSize: 1 } });
      expect(cage.variantOptions).toEqual({});
      expect(S.sanitize({ variantId: 'jigsaw9' }).variantOptions).toEqual({ compactness: 0.6 });
      var row = S.sanitize({ variantId: 'wordoku', variantOptions: { placement: 'row', line: 4 } });
      expect(row.variantOptions.line).toBe(4);
      var diagonal = S.sanitize({ variantId: 'wordoku', variantOptions: { placement: 'diagonal', line: 4 } });
      expect(diagonal.variantOptions.line).toBe(0);
    });

    it('cleans the seed text without trimming what is still being typed', function () {
      ready();
      expect(S.sanitize({ seed: 'ab\u0000c\n' }).seed).toBe('abc');
      expect(S.sanitize({ seed: 'my seed ' }).seed).toBe('my seed ');
      expect(S.sanitize({ seed: 42 }).seed).toBe('42');
      expect(S.sanitize({ seed: new Array(100).join('x') }).seed.length).toBe(S.SEED_MAX_LENGTH);
    });

    it('reports the cross-option corrections', function () {
      ready();
      var r = S.sanitizeWithNotes({ variantId: 'classic4', difficulty: 'evil', symbolMode: 'word' });
      expect(r.state.difficulty).toBe('easy');
      expect(r.adjustments).toEqual([
        { key: 'difficulty', from: 'evil', to: 'easy', reason: 'unsupportedDifficulty' },
        { key: 'symbolMode', from: 'word', to: 'digits', reason: 'unsupportedSymbolMode' }
      ]);
      expect(S.sanitizeWithNotes({ variantId: 'classic9', difficulty: 'evil' }).adjustments).toEqual([]);
    });

    it('evaluates visibleWhen like the variants declare it', function () {
      ready();
      var line = SG.variants.optionsOf('wordoku').filter(function (o) { return o.id === 'line'; })[0];
      expect(S.isOptionVisible(line, { placement: 'row' })).toBe(true);
      expect(S.isOptionVisible(line, { placement: 'column' })).toBe(true);
      expect(S.isOptionVisible(line, { placement: 'diagonal' })).toBe(false);
      expect(S.isOptionVisible({ visibleWhen: null }, {})).toBe(true);
    });
  });

  describe('store: seeds', function () {
    it('tells random, number and text seeds apart', function () {
      ready();
      expect(S.seedInfo('')).toEqual({ kind: 'random', value: null });
      expect(S.seedInfo('   ')).toEqual({ kind: 'random', value: null });
      expect(S.seedInfo(undefined)).toEqual({ kind: 'random', value: null });
      expect(S.seedInfo('42')).toEqual({ kind: 'number', value: 42 });
      expect(S.seedInfo(' 007 ')).toEqual({ kind: 'number', value: 7 });
      expect(S.seedInfo('0')).toEqual({ kind: 'number', value: 0 });
      expect(S.seedInfo('4294967295')).toEqual({ kind: 'number', value: 4294967295 });
      expect(S.seedInfo(1734567890)).toEqual({ kind: 'number', value: 1734567890 });
    });

    it('hashes anything that is not a uint32 to a stable uint32', function () {
      ready();
      ['4294967296', '-5', '3.5', '1e3', 'hello', 'xin chào'].forEach(function (text) {
        var info = S.seedInfo(text);
        var v = info.value;
        expect(info.kind).toBe('text');
        expect(v >= 0 && v <= 4294967295 && Math.floor(v) === v).toBe(true);
        expect(S.seedInfo(text).value).toBe(info.value);
      });
      expect(S.seedInfo('hello').value).not.toBe(S.seedInfo('hellp').value);
      expect(S.seedInfo('  hello ').value).toBe(S.seedInfo('hello').value);
    });

    it('hashes composed and decomposed Vietnamese text alike', function () {
      ready();
      expect(S.seedInfo('chào').value).toBe(S.seedInfo('cha\u0300o').value);
    });
  });

  describe('store: URL parameters', function () {
    it('parses the example link of design.md 14.2', function () {
      ready();
      var s = S.parseUrl('?v=classic9&d=expert&seed=42&lang=vi&auto=1');
      expect(s.variantId).toBe('classic9');
      expect(s.difficulty).toBe('expert');
      expect(s.seed).toBe('42');
      expect(s.lang).toBe('vi');
      expect(s.auto).toBe(true);
      expect(S.toConfig(s).seed).toBe(42);
      expect(S.toSearchString(s)).toBe('?d=expert&seed=42&lang=vi&auto=1');
      expect(S.toSearchString(s, { full: true })).toBe(
        '?v=classic9&d=expert&seed=42&sym=rotational180&mode=digits&lang=vi&auto=1');
    });

    it('writes nothing for the defaults', function () {
      ready();
      expect(S.toSearchString(S.defaults())).toBe('');
      expect(S.toUrlParams(S.defaults())).toEqual({});
    });

    it('ignores trace and speed of older links and drops them from the canonical URL', function () {
      ready();
      ['?trace=summary', '?trace=full', '?trace=off', '?speed=manual', '?speed=instant&trace=off']
        .forEach(function (search) {
          expect(S.parseUrl(search)).toEqual(S.defaults());
          expect(S.toSearchString(S.parseUrl(search))).toBe('');
        });
      expect(S.readUrl('?trace=off&speed=fast')).toEqual({ patch: {}, hasConfig: false });
      var link = S.parseUrl('?v=killer&trace=full&d=hard&speed=step&seed=5');
      expect(S.toSearchString(link)).toBe('?v=killer&d=hard&seed=5');
      expect('trace' in S.toConfig(link)).toBe(false);
    });

    it('accepts a bare query, a full URL, a fragment and encoded text', function () {
      ready();
      expect(S.parseUrl('v=killer&d=hard').variantId).toBe('killer');
      expect(S.parseUrl('https://example.org/app/index.html?v=killer&d=hard#x=1').difficulty).toBe('hard');
      expect(S.parseUrl('?seed=hello%20world').seed).toBe('hello world');
      expect(S.parseUrl('?seed=hello+world').seed).toBe('hello world');
      expect(S.parseUrl('?seed=%E0%A4%A').seed).toBe('%E0%A4%A');
      expect(S.parseUrl('').variantId).toBe('classic9');
      expect(S.parseUrl(null).variantId).toBe('classic9');
      expect(S.parseUrl('https://example.org/index.html').variantId).toBe('classic9');
    });

    it('ignores invalid values and keeps the valid ones', function () {
      ready();
      var s = S.parseUrl('?v=nope&d=nope&sym=nope&mode=nope&order=nope&attempts=abc&sol=maybe' +
        '&lang=xx&d=hard');
      var d = S.defaults();
      expect(s.variantId).toBe(d.variantId);
      expect(s.difficulty).toBe('hard');
      expect(s.symmetry).toBe(d.symmetry);
      expect(s.symbolMode).toBe(d.symbolMode);
      expect(s.digOrder).toBe(d.digOrder);
      expect(s.maxAttempts).toBe(d.maxAttempts);
      expect(s.showSolution).toBe(false);
      expect(s.lang).toBe('en');
    });

    it('clamps attempts and applies the cross-option constraints', function () {
      ready();
      expect(S.parseUrl('?attempts=99').maxAttempts).toBe(20);
      expect(S.parseUrl('?attempts=0').maxAttempts).toBe(1);
      expect(S.parseUrl('?v=classic4&d=evil').difficulty).toBe('easy');
      expect(S.parseUrl('?v=wordoku').symbolMode).toBe('word');
      expect(S.parseUrl('?v=classic9&mode=word').symbolMode).toBe('digits');
      expect(S.parseUrl('?o.cageSize=1').variantOptions).toEqual({});
    });

    it('reads variant options as o.<id> and only writes the non-default ones', function () {
      ready();
      var killer = S.parseUrl('?v=killer&o.cageSize=-1');
      expect(killer.variantOptions).toEqual({ cageSize: -1 });
      expect(S.toSearchString(killer)).toBe('?v=killer&o.cageSize=-1');
      expect(S.toSearchString(S.parseUrl('?v=killer&o.cageSize=0'))).toBe('?v=killer');
      var jigsaw = S.parseUrl('?v=jigsaw9&o.compactness=0.85');
      expect(jigsaw.variantOptions.compactness).toBe(0.85);
      var gt = S.parseUrl('?v=greaterThan&o.futoshiki=1');
      expect(gt.variantOptions.futoshiki).toBe(true);
      expect(S.toSearchString(gt)).toBe('?v=greaterThan&o.futoshiki=1');
      expect(S.parseUrl('?v=diagonalX&o.withHyper=true').variantOptions.withHyper).toBe(true);
      expect(S.parseUrl('?v=jigsaw9&o.compactness=huge').variantOptions.compactness).toBe(0.6);
    });

    it('writes a boolean option that is on by default as =0', function () {
      ready();
      var fake = {
        id: 'fakeOn', i18nKey: 'variant.fakeOn', group: 'classic', digits: 4, difficultySupport: ['easy'],
        defaultSymbolMode: 'digits', symbolModes: ['digits'],
        options: [{ id: 'flag', type: 'boolean', default: true, i18nKey: 'x' }],
        build: function () { throw new Error('not built'); }
      };
      SG.variants.register(fake);
      try {
        var state = S.sanitize({ variantId: 'fakeOn', difficulty: 'easy', variantOptions: { flag: false } });
        expect(S.toSearchString(state)).toBe('?v=fakeOn&d=easy&o.flag=0');
        expect(S.parseUrl('?v=fakeOn&d=easy&o.flag=0').variantOptions.flag).toBe(false);
      } finally {
        SG.variants.unregister('fakeOn');
      }
    });

    it('round-trips a state of every variant through the URL', function () {
      ready();
      ids().forEach(function (id) {
        var def = SG.variants.get(id);
        var levels = def.difficultySupport;
        var state = S.sanitize({
          variantId: id, difficulty: levels[levels.length - 1], seed: '1234', symmetry: 'mirrorH',
          symbolMode: def.symbolModes[def.symbolModes.length - 1], digOrder: 'spiral', maxAttempts: 3,
          showSolution: true, lang: 'vi', auto: true,
          variantOptions: SG.variants.optionsOf(def).reduce(function (acc, item) {
            if (item.type === 'slider') acc[item.id] = item.max;
            else if (item.type === 'select') acc[item.id] = item.choices[item.choices.length - 1].value;
            else if (item.type === 'boolean') acc[item.id] = !item.default;
            else acc[item.id] = 'abc';
            return acc;
          }, {})
        });
        expect(S.parseUrl(S.toSearchString(state))).toEqual(state);
        expect(S.parseUrl(S.toSearchString(state, { full: true }))).toEqual(state);
      });
    });

    it('round-trips awkward seed text', function () {
      ready();
      ['hello world', 'a&b=c', 'xin chào', '100%', 'a+b', '#1?'].forEach(function (seed) {
        var state = S.sanitize({ seed: seed });
        expect(S.parseUrl(S.toSearchString(state)).seed).toBe(seed);
      });
    });

    it('builds share links that always name the puzzle', function () {
      ready();
      var state = S.sanitize({ variantId: 'killer', difficulty: 'hard', seed: '77' });
      expect(S.shareUrl(state, 'https://example.org/app/?old=1#frag')).toBe(
        'https://example.org/app/?v=killer&d=hard&seed=77&sym=rotational180&mode=digits');
      expect(S.shareUrl(state, 'https://example.org/app/', { auto: true })).toBe(
        'https://example.org/app/?v=killer&d=hard&seed=77&sym=rotational180&mode=digits&auto=1');
      expect(S.parseUrl(S.shareUrl(state, 'x')).seed).toBe('77');
    });

    it('lists the parameters in a fixed order', function () {
      ready();
      var state = S.sanitize({ variantId: 'wordoku', difficulty: 'easy', seed: '5', symmetry: 'none',
        symbolMode: 'digits', digOrder: 'snake', maxAttempts: 2, showSolution: true,
        variantOptions: { placement: 'row' }, lang: 'vi', auto: true });
      expect(Object.keys(S.toUrlParams(state))).toEqual(['v', 'd', 'seed', 'sym', 'mode', 'order', 'attempts',
        'sol', 'o.placement', 'lang', 'auto']);
    });
  });

  describe('store: toConfig', function () {
    it('gives the same config for the same state', function () {
      ready();
      var a = S.sanitize({ variantId: 'jigsaw9', difficulty: 'hard', seed: '9',
        variantOptions: { compactness: 0.3 } });
      expect(S.toConfig(a)).toEqual(S.toConfig(Object.assign({}, a)));
      expect(S.toConfig(a)).toEqual(S.toConfig(JSON.parse(JSON.stringify(a))));
      expect(S.toConfig(S.parseUrl(S.toSearchString(a)))).toEqual(S.toConfig(a));
    });

    it('leaves the seed out when it is blank and uses uint32 numbers as they are', function () {
      ready();
      var blank = S.toConfig(S.defaults());
      expect('seed' in blank).toBe(false);
      expect(blank.seed).toBeUndefined();
      expect(S.toConfig({ seed: '42' }).seed).toBe(42);
      expect(S.toConfig({ seed: '0' }).seed).toBe(0);
      expect(S.toConfig({ seed: 'abc' }).seed).toBe(S.seedInfo('abc').value);
      expect(S.toConfig({ seed: 'abc' }).seed).toBe(S.toConfig({ seed: ' abc ' }).seed);
    });

    it('contains exactly the fields of a GenerateConfig and no UI state', function () {
      ready();
      var c = S.toConfig(S.sanitize({ seed: '1', lang: 'vi', theme: 'dark', auto: true,
        showSolution: true }));
      expect(Object.keys(c).sort()).toEqual(['difficulty', 'digOrder', 'maxAttempts', 'seed', 'symbolMode',
        'symmetry', 'variantId', 'variantOptions']);
    });

    it('is a valid pipeline configuration for every variant and every level it supports', function () {
      ready();
      ids().forEach(function (id) {
        SG.variants.get(id).difficultySupport.forEach(function (level) {
          var config = S.toConfig({ variantId: id, difficulty: level, seed: '5' });
          var normal = SG.pipeline.normalizeConfig(config);
          expect(normal.variantId).toBe(id);
          expect(normal.difficulty).toBe(level);
          expect(normal.seed).toBe(5);
        });
      });
    });

    it('is accepted by SG.pipeline.run and reproduces the puzzle', function () {
      ready();
      var state = S.parseUrl('?v=classic4&d=easy&seed=42');
      var first = SG.pipeline.run(S.toConfig(state), function () {}, null);
      var again = S.toConfig(S.parseUrl('?v=classic4&d=easy&seed=42'));
      var second = SG.pipeline.run(again, function () {}, null);
      expect(first.seed).toBe(42);
      expect(first.config.variantId).toBe('classic4');
      expect(Array.from(first.givens)).toEqual(Array.from(second.givens));
      var text = SG.pipeline.run(S.toConfig({ variantId: 'classic4', difficulty: 'easy', seed: 'my puzzle' }),
        function () {}, null);
      expect(text.seed).toBe(S.seedInfo('my puzzle').value);
    });

    it('is accepted by SG.pipeline.run with variant options, which applies its default trace', function () {
      ready();
      var config = S.toConfig(S.parseUrl('?v=jigsaw9&d=veryEasy&seed=3&o.compactness=0.9&trace=off'));
      expect('trace' in config).toBe(false);
      var result = SG.pipeline.run(config, function () {}, null);
      expect(result.config.variantOptions.compactness).toBe(0.9);
      expect(result.config.trace).toBe('summary');
    });
  });

  describe('store: the stateful store', function () {
    it('starts with the defaults and hands out a frozen state', function () {
      ready();
      var store = makeStore();
      expect(store.get()).toEqual(S.defaults());
      expect(Object.isFrozen(store.get())).toBe(true);
      expect(Object.isFrozen(store.get().variantOptions)).toBe(true);
    });

    it('merges a patch, sanitises it and keeps the previous value for an invalid one', function () {
      ready();
      var store = makeStore();
      store.set({ difficulty: 'hard', seed: '5' });
      expect(store.get().difficulty).toBe('hard');
      expect(store.get().seed).toBe('5');
      store.set({ difficulty: 'bogus', symmetry: 'nope', maxAttempts: 'x', unknownKey: 1 });
      expect(store.get().difficulty).toBe('hard');
      expect(store.get().symmetry).toBe('rotational180');
      expect(store.get().maxAttempts).toBe(8);
      expect('unknownKey' in store.get()).toBe(false);
      store.set({ maxAttempts: 99 });
      expect(store.get().maxAttempts).toBe(20);
      expect(store.set(null)).toBe(store.get());
    });

    it('keeps the difficulty and symbol set when the new variant allows them', function () {
      ready();
      var store = makeStore();
      store.set({ difficulty: 'hard', symbolMode: 'letters' });
      store.set({ variantId: 'hyper' });
      expect(store.get().difficulty).toBe('hard');
      expect(store.get().symbolMode).toBe('letters');
      store.set({ variantId: 'samurai' });
      expect(store.get().difficulty).toBe('hard');
    });

    it('falls back and reports it when the new variant does not allow them', function () {
      ready();
      var store = makeStore();
      var seen = [];
      store.subscribe(function (state, keys, meta) { seen.push(meta.adjustments); });
      store.set({ difficulty: 'evil', symbolMode: 'letters' });
      store.set({ variantId: 'classic4' });
      expect(store.get().difficulty).toBe('easy');
      store.set({ variantId: 'wordoku' });
      expect(store.get().symbolMode).toBe('word');
      expect(seen[1]).toEqual([
        { key: 'difficulty', from: 'evil', to: 'easy', reason: 'unsupportedDifficulty' }
      ]);
    });

    it('lets the symbol set follow the default of the variant, but not a choice of the user', function () {
      ready();
      var store = makeStore();
      store.set({ variantId: 'wordoku' });
      expect(store.get().symbolMode).toBe('word');
      store.set({ variantId: 'classic9' });
      expect(store.get().symbolMode).toBe('digits');
      store.set({ variantId: 'wordoku', symbolMode: 'digits' });
      expect(store.get().symbolMode).toBe('digits');
      store.set({ variantId: 'hyper' });
      expect(store.get().symbolMode).toBe('digits');
    });

    it('resets the options on a variant change and merges option patches otherwise', function () {
      ready();
      var store = makeStore();
      store.set({ variantId: 'killer', variantOptions: { cageSize: 2 } });
      expect(store.get().variantOptions).toEqual({ cageSize: 2 });
      store.set({ variantOptions: { cageSize: -2 } });
      expect(store.get().variantOptions).toEqual({ cageSize: -2 });
      store.set({ variantOptions: { cageSize: 50, bogus: 1 } });
      expect(store.get().variantOptions).toEqual({ cageSize: 2 });
      store.set({ variantId: 'classic9' });
      expect(store.get().variantOptions).toEqual({});
      store.set({ variantId: 'killer' });
      expect(store.get().variantOptions).toEqual({ cageSize: 0 });
    });

    it('subscribes and unsubscribes, with the changed keys and the meta', function () {
      ready();
      var store = makeStore();
      var calls = [];
      var off = store.subscribe(function (state, keys, meta) {
        calls.push([state.seed, keys, meta.source]);
      });
      store.set({ seed: '1' }, { source: 'test' });
      store.set({ seed: '1' }, { source: 'test' });
      store.set({ difficulty: 'easy', digOrder: 'snake' });
      expect(calls.length).toBe(2);
      expect(calls[0]).toEqual(['1', ['seed'], 'test']);
      expect(calls[1][1]).toEqual(['difficulty', 'digOrder']);
      off();
      off();
      store.set({ seed: '2' });
      expect(calls.length).toBe(2);
      expect(function () { store.subscribe('nope'); }).toThrow();
    });

    it('ignores trace and speed in a patch: they are not part of the state', function () {
      ready();
      var store = makeStore();
      var calls = 0;
      store.subscribe(function () { calls++; });
      expect(store.set({ trace: 'off', speed: 'manual' })).toBe(store.get());
      expect(calls).toBe(0);
      expect('trace' in store.get()).toBe(false);
      expect('speed' in store.get()).toBe(false);
    });

    it('notifies in order when a subscriber sets state, and survives a throwing subscriber', function () {
      ready();
      var store = makeStore();
      var log = [];
      var realError = console.error;
      console.error = function () {};
      try {
        store.subscribe(function () { throw new Error('boom'); });
        store.subscribe(function (state, keys) {
          if (keys.indexOf('variantId') !== -1) store.set({ seed: 'follow-up' });
        });
        store.subscribe(function (state, keys) { log.push(keys[0] + ':' + state.seed); });
        store.set({ variantId: 'hyper' });
      } finally {
        console.error = realError;
      }
      expect(log).toEqual(['variantId:', 'seed:follow-up']);
    });

    it('switches the i18n language when lang is set', function () {
      ready();
      withEnglish(function () {
        var store = makeStore();
        var heard = [];
        var off = SG.i18n.onChange(function (code) { heard.push(code); });
        store.set({ lang: 'vi' });
        expect(SG.i18n.current).toBe('vi');
        expect(heard).toEqual(['vi']);
        store.set({ lang: 'xx' });
        expect(SG.i18n.current).toBe('vi');
        store.set({ lang: 'en' });
        expect(SG.i18n.current).toBe('en');
        off();
      });
    });

    it('rolls a new random seed into the state', function () {
      ready();
      var store = makeStore({ random: function () { return 4000000000; } });
      expect(store.newSeed()).toBe(4000000000);
      expect(store.get().seed).toBe('4000000000');
      var real = makeStore();
      var seed = real.newSeed();
      expect(seed >= 0 && seed <= 4294967295 && Math.floor(seed) === seed).toBe(true);
      expect(real.get().seed).toBe(String(seed));
    });

    it('resets the puzzle configuration but keeps the preferences', function () {
      ready();
      withEnglish(function () {
        var store = makeStore();
        store.set({ variantId: 'killer', difficulty: 'hard', seed: '9', theme: 'dark', fontSize: 'large',
          auto: true });
        store.reset();
        expect(store.get().variantId).toBe('classic9');
        expect(store.get().difficulty).toBe('medium');
        expect(store.get().seed).toBe('');
        expect(store.get().auto).toBe(false);
        expect(store.get().theme).toBe('dark');
        expect(store.get().fontSize).toBe('large');
      });
    });

    it('shares one browser-less instance', function () {
      ready();
      expect(S.instance()).toBe(S.instance());
      expect(typeof S.instance().get().variantId).toBe('string');
    });
  });

  describe('store: URL synchronisation', function () {
    it('replaces the URL with the non-default values and keeps path and fragment', function () {
      ready();
      var e = env('');
      var store = makeStore({ env: e });
      store.set({ difficulty: 'hard' });
      store.set({ variantId: 'killer', seed: '5' });
      store.set({ difficulty: 'medium', variantId: 'classic9', seed: '' });
      expect(e.urls).toEqual(['/index.html?d=hard#top', '/index.html?v=killer&d=hard&seed=5#top',
        '/index.html#top']);
      expect(store.syncUrl()).toBe(true);
    });

    it('does not touch the URL when asked not to persist, nor when nothing changed', function () {
      ready();
      var e = env('');
      var store = makeStore({ env: e });
      store.set({ seed: '1' }, { persist: false });
      store.set({ seed: '1' });
      expect(e.urls.length).toBe(0);
    });

    it('survives a history that throws and a missing history or location', function () {
      ready();
      var store = makeStore({ history: { replaceState: function () { throw new Error('SecurityError'); } } });
      store.set({ seed: '1' });
      expect(store.syncUrl()).toBe(false);
      expect(store.get().seed).toBe('1');
      var bare = S.create({ storage: null, location: null, history: null, navigator: NAV });
      bare.set({ seed: '2' });
      expect(bare.syncUrl()).toBe(false);
      expect(bare.get().seed).toBe('2');
    });

    it('restores the exact state from the URL that it wrote', function () {
      ready();
      var e = env('');
      var store = makeStore({ env: e, storage: null });
      store.set({ variantId: 'wordoku', difficulty: 'hard', seed: 'abc', symmetry: 'mirrorV',
        variantOptions: { placement: 'column', line: 2, word: 'plane' }, maxAttempts: 4 });
      var written = e.urls[e.urls.length - 1];
      var search = written.slice(written.indexOf('?'), written.indexOf('#'));
      var other = makeStore({ env: env(search), storage: null });
      other.load();
      expect(other.get()).toEqual(store.get());
    });
  });

  describe('store: load, save and storage', function () {
    it('prefers the URL over the stored values over the defaults', function () {
      ready();
      withEnglish(function () {
        var storage = memoryStorage({
          'sg.lastConfig.v1': JSON.stringify({ v: 1, variantId: 'killer', difficulty: 'expert', seed: '11' }),
          'sg.prefs.v1': JSON.stringify({ v: 1, lang: 'vi', theme: 'dark', fontSize: 'large' })
        });
        var fromStorage = makeStore({ storage: storage });
        fromStorage.load();
        expect(fromStorage.get().variantId).toBe('killer');
        expect(fromStorage.get().difficulty).toBe('expert');
        expect(fromStorage.get().lang).toBe('vi');
        expect(fromStorage.get().theme).toBe('dark');
        SG.i18n.setLocale('en');

        var fromUrl = makeStore({ storage: storage, env: env('?v=hyper&lang=en') });
        fromUrl.load();
        expect(fromUrl.get().variantId).toBe('hyper');
        expect(fromUrl.get().difficulty).toBe('medium');
        expect(fromUrl.get().seed).toBe('');
        expect(fromUrl.get().lang).toBe('en');
        expect(fromUrl.get().fontSize).toBe('large');
        expect(fromUrl.get().theme).toBe('dark');
      });
    });

    it('keeps the stored configuration when the URL only carries language, auto or old replay settings',
      function () {
        ready();
        withEnglish(function () {
          var storage = memoryStorage({
            'sg.lastConfig.v1': JSON.stringify({ v: 1, variantId: 'jigsaw9', seed: '8',
              variantOptions: { compactness: 0.2 } })
          });
          var store = makeStore({ storage: storage, env: env('?lang=vi&auto=1&speed=step&trace=full') });
          store.load();
          expect(store.get().variantId).toBe('jigsaw9');
          expect(store.get().variantOptions.compactness).toBe(0.2);
          expect(store.get().lang).toBe('vi');
          expect(store.get().auto).toBe(true);
          expect('speed' in store.get()).toBe(false);
          expect('trace' in store.get()).toBe(false);
        });
      });

    it('ignores the trace and speed an older version stored, and stops writing them', function () {
      ready();
      withEnglish(function () {
        var storage = memoryStorage({
          'sg.lastConfig.v1': JSON.stringify({ v: 1, variantId: 'killer', trace: 'off' }),
          'sg.prefs.v1': JSON.stringify({ v: 1, lang: 'en', theme: 'dark', speed: 'manual' })
        });
        var store = makeStore({ storage: storage });
        store.load();
        expect(store.get().variantId).toBe('killer');
        expect(store.get().theme).toBe('dark');
        expect('trace' in store.get()).toBe(false);
        expect('speed' in store.get()).toBe(false);
        store.set({ difficulty: 'hard' });
        expect('trace' in JSON.parse(storage.data['sg.lastConfig.v1'])).toBe(false);
        expect('speed' in JSON.parse(storage.data['sg.prefs.v1'])).toBe(false);
      });
    });

    it('does not let the receiver last configuration bend a shared link', function () {
      ready();
      var storage = memoryStorage({
        'sg.lastConfig.v1': JSON.stringify({ v: 1, variantId: 'killer', difficulty: 'expert',
          symmetry: 'none', maxAttempts: 3, seed: '1' })
      });
      var store = makeStore({ storage: storage, env: env('?v=classic9&seed=42') });
      store.load();
      var d = S.defaults();
      expect(store.get().seed).toBe('42');
      expect(store.get().difficulty).toBe(d.difficulty);
      expect(store.get().symmetry).toBe(d.symmetry);
      expect(store.get().maxAttempts).toBe(d.maxAttempts);
    });

    it('detects the start language: URL, stored preference, browser, English', function () {
      ready();
      withEnglish(function () {
        var viBrowser = { languages: ['fr-FR', 'vi-VN'] };
        var a = makeStore({ navigator: viBrowser });
        a.load();
        expect(a.get().lang).toBe('vi');
        SG.i18n.setLocale('en');
        var b = makeStore({ navigator: viBrowser, env: env('?lang=en') });
        b.load();
        expect(b.get().lang).toBe('en');
        var c = makeStore({ navigator: { languages: ['de'] } });
        c.load();
        expect(c.get().lang).toBe('en');
        expect(SG.i18n.current).toBe('en');
      });
    });

    it('tells the subscribers about the loaded state', function () {
      ready();
      var store = makeStore({ env: env('?v=hyper&d=hard') });
      var heard = [];
      store.subscribe(function (state, keys, meta) {
        heard.push([state.variantId, keys.length > 5, meta.source]);
      });
      store.load();
      expect(heard).toEqual([['hyper', true, 'load']]);
    });

    it('rewrites the URL to its canonical form after loading (old replay settings disappear)', function () {
      ready();
      var e = env('?v=classic4&d=evil&junk=1&seed=7&trace=full&speed=manual');
      var store = makeStore({ env: e, storage: null });
      store.load();
      expect(e.urls).toEqual(['/index.html?v=classic4&d=easy&seed=7#top']);
    });

    it('writes preferences and the last configuration under the documented keys', function () {
      ready();
      var storage = memoryStorage();
      var store = makeStore({ storage: storage });
      store.set({ variantId: 'killer', difficulty: 'hard', seed: '31', theme: 'high-contrast',
        fontSize: 'large',
        reducedMotion: true, colorAuxSymbol: false, auto: true });
      expect(S.PREFS_KEY).toBe('sg.prefs.v1');
      expect(S.LAST_CONFIG_KEY).toBe('sg.lastConfig.v1');
      var prefs = JSON.parse(storage.data['sg.prefs.v1']);
      expect(prefs).toEqual({ v: 1, lang: 'en', theme: 'high-contrast', fontSize: 'large',
        reducedMotion: true, colorAuxSymbol: false });
      var last = JSON.parse(storage.data['sg.lastConfig.v1']);
      expect(last.variantId).toBe('killer');
      expect(last.difficulty).toBe('hard');
      expect(last.seed).toBe('31');
      expect('auto' in last).toBe(false);
      expect('trace' in last).toBe(false);
      expect(store.save()).toBe(true);
    });

    it('persists across stores that share a storage', function () {
      ready();
      withEnglish(function () {
        var storage = memoryStorage();
        var first = makeStore({ storage: storage });
        first.set({ variantId: 'wordoku', difficulty: 'easy', seed: 'word seed', symmetry: 'diagonal',
          variantOptions: { placement: 'row', line: 6 }, lang: 'vi', theme: 'dark', fontSize: 'small' });
        SG.i18n.setLocale('en');
        var second = makeStore({ storage: storage });
        second.load();
        var expected = Object.assign({}, first.get(), { auto: false });
        expect(second.get()).toEqual(expected);
        expect(SG.i18n.current).toBe('vi');
      });
    });

    it('ignores corrupt or invalid stored data', function () {
      ready();
      [{ 'sg.prefs.v1': '{not json', 'sg.lastConfig.v1': 'null' },
        { 'sg.prefs.v1': '[1,2]', 'sg.lastConfig.v1': '"text"' },
        { 'sg.prefs.v1': JSON.stringify({ lang: 'xx', theme: 'neon', fontSize: 9,
          reducedMotion: 'yes', colorAuxSymbol: 3 }),
          'sg.lastConfig.v1': JSON.stringify({ variantId: 'nope', difficulty: 'x', maxAttempts: 'many',
            variantOptions: 7 }) }].forEach(function (data) {
        var store = makeStore({ storage: memoryStorage(data) });
        store.load();
        expect(store.get()).toEqual(S.defaults());
      });
    });

    it('keeps working when the storage is blocked', function () {
      ready();
      var store = makeStore({ storage: blockedStorage() });
      expect(function () { store.load(); }).not.toThrow();
      store.set({ difficulty: 'hard', seed: '5', theme: 'dark' });
      expect(store.get().difficulty).toBe('hard');
      expect(store.save()).toBe(false);
      expect(store.persistent()).toBe(false);
      expect(function () { store.set({ fontSize: 'large' }); }).not.toThrow();
      expect(store.get().fontSize).toBe('large');
    });

    it('keeps working when reading the storage object itself throws', function () {
      ready();
      var store = S.create({ storage: undefined, location: null, history: null, navigator: NAV });
      store.set({ seed: '3' });
      expect(store.get().seed).toBe('3');
      var getterThrows = {};
      Object.defineProperty(getterThrows, 'getItem', { get: function () { throw new Error('denied'); } });
      Object.defineProperty(getterThrows, 'setItem', { get: function () { throw new Error('denied'); } });
      var guarded = S.create({ storage: getterThrows, location: null, history: null, navigator: NAV });
      expect(function () { guarded.load(); guarded.set({ seed: '4' }); }).not.toThrow();
      expect(guarded.get().seed).toBe('4');
    });

    it('works without any storage', function () {
      ready();
      var store = S.create({ storage: null, location: null, history: null, navigator: NAV });
      store.set({ seed: '6' });
      store.load();
      expect(store.persistent()).toBe(false);
      expect(store.get().seed).toBe('6');
    });

    it('does not save when persist is false', function () {
      ready();
      var storage = memoryStorage();
      var store = makeStore({ storage: storage });
      store.set({ seed: '1' }, { persist: false });
      expect(Object.keys(storage.data)).toEqual([]);
    });
  });
})();
