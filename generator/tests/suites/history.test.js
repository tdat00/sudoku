// Puzzle history (js/ui/history.js): the entry of a result, the key that tells two puzzles apart, the
// configuration that rebuilds a puzzle, and the persisted list (localStorage with a memory fallback), run on
// Node with real pipeline results and a fake storage. The panel (`init`) needs a DOM and is not tested here.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.history;

  function ready() {
    if (!H || !SG.pipeline || !SG.store) SG.test.skip('SG.history is not loaded here');
  }

  var cache = {};

  function realResult(variantId, difficulty, seed) {
    var key = variantId + '/' + difficulty + '/' + seed;
    if (!cache[key]) {
      cache[key] = SG.pipeline.run(
        { variantId: variantId, difficulty: difficulty, seed: seed, trace: 'off' }, null);
    }
    return cache[key];
  }

  /** A localStorage-like object over a Map; `failing` makes every write throw (a full quota). */
  function fakeStorage(initial) {
    var map = new Map(Object.keys(initial || {}).map(function (k) { return [k, initial[k]]; }));
    return {
      map: map,
      failing: false,
      getItem: function (k) { return map.has(k) ? map.get(k) : null; },
      setItem: function (k, v) {
        if (this.failing) throw new Error('QuotaExceededError');
        map.set(k, String(v));
      },
      removeItem: function (k) { map.delete(k); }
    };
  }

  function entry(seed, score) {
    return { variantId: 'classic9', requested: 'easy', level: 'easy', seed: seed, clues: 30,
      score: score === undefined ? 100 : score, variantOptions: {} };
  }

  function seeds(entries) {
    return entries.map(function (e) { return e.seed; });
  }

  describe('history: the entry of a result', function () {
    it('keeps what the list shows and what rebuilds the puzzle', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      var e = H.entryOf(r);
      expect(e.id).toBe(H.keyOf(r.config, r.seed));
      expect(e.variantId).toBe('classic9');
      expect(e.requested).toBe('easy');
      expect(e.level).toBe(r.rating.level);
      expect(e.seed).toBe('3');
      expect('at' in e).toBe(false);
      expect('cells' in e).toBe(false);
      expect(e.score).toBe(Math.round(r.rating.score));
      var clues = 0;
      for (var i = 0; i < r.givens.length; i++) if (r.givens[i] > 0) clues++;
      expect(e.clues).toBe(clues);
      expect(JSON.parse(JSON.stringify(e))).toEqual(e);
    });

    it('has no entry for a result that cannot be rebuilt', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      expect(H.entryOf(null)).toBeNull();
      expect(H.entryOf({})).toBeNull();
      expect(H.entryOf(Object.assign({}, r, { seed: null }))).toBeNull();
      expect(H.entryOf(Object.assign({}, r, { config: undefined }))).toBeNull();
    });

    it('tells two puzzles apart by variant, level, seed, dig settings and options, not by symbol set',
      function () {
        ready();
        var base = realResult('classic9', 'easy', 3).config;
        var key = H.keyOf(base, 3);
        expect(H.keyOf(base, 4)).not.toBe(key);
        expect(H.keyOf(Object.assign({}, base, { difficulty: 'hard' }), 3)).not.toBe(key);
        expect(H.keyOf(Object.assign({}, base, { variantId: 'killer' }), 3)).not.toBe(key);
        expect(H.keyOf(Object.assign({}, base, { symmetry: 'none' }), 3)).not.toBe(key);
        expect(H.keyOf(Object.assign({}, base, { variantOptions: { x: 1 } }), 3)).not.toBe(key);
        expect(H.keyOf(Object.assign({}, base, { symbolMode: 'letters' }), 3)).toBe(key);
      });

    it('gives the store state that generates the same puzzle again', function () {
      ready();
      ['classic9', 'killer'].forEach(function (variantId) {
        var r = realResult(variantId, 'easy', 3);
        var overrides = H.overridesOf(H.entryOf(r));
        var config = SG.store.toConfig(Object.assign(SG.store.defaults(), overrides));
        ['variantId', 'difficulty', 'seed', 'symmetry', 'digOrder', 'maxAttempts'].forEach(function (name) {
          expect(config[name]).toEqual(r.config[name]);
        });
        var again = SG.pipeline.run(Object.assign({}, config, { trace: 'off' }), null);
        expect(Array.from(again.givens)).toEqual(Array.from(r.givens));
        // What the panel does with an entry it opened: the new result has the same id.
        var e1 = H.entryOf(again);
        var third = SG.pipeline.run(Object.assign({}, SG.store.toConfig(Object.assign(SG.store.defaults(),
          H.overridesOf(e1))), { trace: 'off' }), null);
        expect(H.entryOf(third).id).toBe(e1.id);
      });
    });
  });

  describe('history: the persisted list', function () {
    it('lists the newest first and keeps the list in the storage', function () {
      ready();
      var storage = fakeStorage();
      var list = H.createList({ storage: storage });
      expect(list.list()).toEqual([]);
      list.add(entry('a'));
      list.add(entry('b'));
      expect(seeds(list.list())).toEqual(['b', 'a']);
      expect(list.persistent()).toBe(true);
      var again = H.createList({ storage: storage });
      expect(seeds(again.list())).toEqual(['b', 'a']);
      var bare = { variantId: 'classic9', difficulty: 'easy', variantOptions: {} };
      expect(again.list()[0].id).toBe(H.keyOf(bare, 'b'));
      expect(JSON.parse(storage.map.get(H.STORAGE_KEY)).version).toBe(H.VERSION);
    });

    it('stores an entry without its id, which is derived again when the list is read', function () {
      ready();
      var storage = fakeStorage();
      var list = H.createList({ storage: storage });
      var r = realResult('classic9', 'easy', 3);
      var e = H.entryOf(r);
      list.add(e);
      var stored = JSON.parse(storage.map.get(H.STORAGE_KEY)).entries[0];
      expect(Object.keys(stored).sort()).toEqual(['clues', 'digOrder', 'level', 'maxAttempts', 'requested',
        'score', 'seed', 'symbolMode', 'symmetry', 'variantId', 'variantOptions']);
      var back = H.createList({ storage: storage }).list()[0];
      expect(back).toEqual(JSON.parse(JSON.stringify(e)));
      expect(back.id).toBe(H.keyOf(r.config, r.seed));
    });

    it('reads the entries an older version stored with id, at and cells, and drops those at the next write',
      function () {
        ready();
        var storage = fakeStorage();
        var r = realResult('classic9', 'easy', 3);
        var e = H.entryOf(r);
        var old = Object.assign({}, JSON.parse(JSON.stringify(e)), { at: 1234, cells: 81 });
        var other = Object.assign(entry('9'), { id: 'an old id', at: 99, cells: 81 });
        storage.map.set(H.STORAGE_KEY, JSON.stringify({ version: 1, entries: [old, other] }));
        var list = H.createList({ storage: storage });
        var read = list.list();
        expect(seeds(read)).toEqual(['3', '9']);
        expect(read[0].id).toBe(e.id);
        var bare = { variantId: 'classic9', difficulty: 'easy', variantOptions: {} };
        expect(read[1].id).toBe(H.keyOf(bare, '9'));
        expect('at' in read[0]).toBe(false);
        expect(H.overridesOf(read[0])).toEqual(H.overridesOf(e));
        list.add(e, { touch: false });
        expect(seeds(list.list())).toEqual(['3', '9']);
        JSON.parse(storage.map.get(H.STORAGE_KEY)).entries.forEach(function (stored) {
          expect('id' in stored || 'at' in stored || 'cells' in stored).toBe(false);
        });
      });

    it('moves a puzzle that is generated again to the top, or leaves it in place when it was opened',
      function () {
        ready();
        var list = H.createList({ storage: fakeStorage() });
        list.add(entry('a'));
        list.add(entry('b'));
        list.add(entry('c'));
        list.add(entry('a', 10));
        expect(seeds(list.list())).toEqual(['a', 'c', 'b']);
        expect(list.list()[0].score).toBe(10);
        list.add(entry('b', 20), { touch: false });
        expect(seeds(list.list())).toEqual(['a', 'c', 'b']);
        expect(list.list()[2].score).toBe(20);
      });

    it('keeps at most `limit` entries and removes or clears on request', function () {
      ready();
      var list = H.createList({ storage: fakeStorage(), limit: 3 });
      ['a', 'b', 'c', 'd', 'e'].forEach(function (seed) { list.add(entry(seed)); });
      expect(seeds(list.list())).toEqual(['e', 'd', 'c']);
      expect(seeds(list.remove(list.list()[1].id))).toEqual(['e', 'c']);
      expect(list.remove('missing').length).toBe(2);
      expect(list.clear()).toEqual([]);
      expect(list.list()).toEqual([]);
    });

    it('ignores what is not a list of entries and never throws', function () {
      ready();
      [
        'not json',
        '{"version":99,"entries":[]}',
        '{"version":1,"entries":"x"}',
        JSON.stringify({ version: 1, entries: [{ id: 5 }, null, entry('ok'), entry('ok', 2)] })
      ].forEach(function (text, i) {
        var storage = fakeStorage();
        storage.map.set(H.STORAGE_KEY, text);
        var list = H.createList({ storage: storage });
        expect(seeds(list.list())).toEqual(i === 3 ? ['ok'] : []);
      });
      var list = H.createList({ storage: fakeStorage() });
      expect(list.add({ nope: true }).length).toBe(0);
    });

    it('lives in memory when the storage is missing, blocked or full', function () {
      ready();
      var none = H.createList({ storage: null });
      none.add(entry('a'));
      expect(none.list().length).toBe(1);
      expect(none.persistent()).toBe(false);

      var full = fakeStorage();
      var list = H.createList({ storage: full });
      list.add(entry('a'));
      full.failing = true;
      list.add(entry('b'));
      expect(seeds(list.list())).toEqual(['b', 'a']);
      expect(list.persistent()).toBe(false);

      var blocked = {
        getItem: function () { throw new Error('SecurityError'); },
        setItem: function () { throw new Error('SecurityError'); },
        removeItem: function () { throw new Error('SecurityError'); }
      };
      var guarded = H.createList({ storage: blocked });
      guarded.add(entry('a'));
      expect(guarded.list().length).toBe(1);
    });
  });

  // A recorded recipe is generated again through the store as a replay (source 'app'), with the number of
  // attempts it recorded, and the replay is not a new choice of the user (MS05r5p, CV6-03 (c2)). The tests run
  // the real `SG.app.generate(overrides)`, which is what the history panel calls for an entry it opens
  // (`app.generate(overridesOf(entry))`): a private copy of js/ui/app.js on a minimal fake document, with the
  // real store, stand-ins for the views and a scripted client that records the configurations it is asked for.
  describe('history: restoring a recorded recipe keeps its attempts (MS05r5p)', function () {
    function recipe(variantId, level, seed, maxAttempts) {
      return H.entryOf({
        seed: seed, givens: [0, 1], rating: { level: level, score: 1500 },
        config: { variantId: variantId, difficulty: level, symmetry: 'rotational180', digOrder: 'random',
          maxAttempts: maxAttempts, variantOptions: {} }
      });
    }

    /** `{ app, store, configs }`: the started private app; `destroy()` when done. */
    function startApp() {
      var node = SG.test.node;
      if (!node) SG.test.skip('needs the file system (Node only)');
      var noop = function () {};
      function element() {
        return {
          nodeType: 1, hidden: false, disabled: false, textContent: '', className: '',
          style: { setProperty: noop },
          classList: { toggle: noop, contains: function () { return false; }, add: noop, remove: noop },
          setAttribute: noop, getAttribute: function () { return null; }, removeAttribute: noop,
          addEventListener: noop, removeEventListener: noop, appendChild: function (c) { return c; },
          removeChild: noop, contains: function () { return false; }, querySelector: function () { return null; },
          focus: noop
        };
      }
      var byId = {};
      ['board-svg', 'board-root', 'controls-root', 'controls-form', 'btn-generate', 'btn-regenerate',
        'btn-cancel', 'btn-export', 'btn-drawer', 'steps-root', 'player-root', 'result-root', 'main']
        .forEach(function (id) { byId[id] = element(); });
      var doc = {
        readyState: 'loading', title: '', body: element(), documentElement: element(), activeElement: null,
        getElementById: function (id) { return byId[id] || null; },
        querySelector: function () { return null; }, querySelectorAll: function () { return []; },
        createElement: element, createElementNS: element, addEventListener: noop, removeEventListener: noop
      };
      var sg = Object.assign({}, SG);
      // Its own fragment list: app.js registers its strings in it, and the host's list (read by the i18n suite,
      // which allows no key defined twice) stays as it was.
      sg.localeFragments = [];
      var hostFragments = (SG.localeFragments || []).slice();
      ['app', 'exportUi', 'a11y', 'theme', 'help', 'cache', 'history'].forEach(function (name) { delete sg[name]; });
      var store = SG.store.create({ storage: null, location: null, history: null, navigator: { languages: [] } });
      sg.store = Object.assign({}, SG.store, { instance: function () { return store; } });
      sg.boardView = { create: function () { return new Proxy({}, { get: function () { return noop; } }); } };
      sg.stepView = {
        create: function () { return { clear: noop, setSteps: noop, setPosition: noop, destroy: noop }; }
      };
      sg.resultView = { create: function () { return { clear: noop, show: noop, refresh: noop, destroy: noop }; } };
      sg.controls = { mount: function () { return { destroy: noop }; } };
      sg.player = {
        LAYER_NAMES: [],
        create: function () {
          return { reset: noop, load: noop, bindControls: noop, setPreparation: noop, setAnalysis: noop,
            destroy: noop, state: function () { return { finished: false, loaded: false, position: 0, length: 0 }; } };
        },
        createPreparation: function () { return { start: noop, cancel: noop, press: noop }; }
      };
      var source = node.fs.readFileSync(node.path.join(node.root, 'js/ui/app.js'), 'utf8');
      new Function('self', 'document', source)({ SG: sg, setTimeout: setTimeout, clearTimeout: clearTimeout }, doc);
      // The private app registered its strings in its own list, and the host's list is untouched.
      expect(sg.localeFragments.length).toBe(1);
      var host = SG.localeFragments || [];
      expect(host.length).toBe(hostFragments.length);
      expect(host.every(function (f, i) { return f === hostFragments[i]; })).toBe(true);
      var configs = [];
      var client = {
        mode: 'main', cancel: noop, cancelReplay: noop,
        generate: function (config) { configs.push(config); return new Promise(noop); }
      };
      expect(sg.app.start()).toBe(true);
      sg.app.setClient(client);
      return { app: sg.app, store: store, configs: configs, destroy: function () { sg.app.destroy(); } };
    }

    function shown(store) {
      var s = store.get();
      return [s.variantId, s.maxAttempts, s.attemptsExplicit];
    }

    function restore(page, entry) {
      page.app.generate(H.overridesOf(entry));
      return page.configs[page.configs.length - 1];
    }

    function withPage(fn) {
      var page = startApp();
      try {
        return fn(page);
      } finally {
        page.destroy();
        SG.i18n.setLocale('en');
      }
    }

    it('MS05r5p-T04: in default mode a classic9 entry at 8 replays with 8; the next mega16 request is back to ' +
      'its default 2', function () {
      ready();
      withPage(function (page) {
        expect(shown(page.store)).toEqual(['classic9', 8, false]);
        var config = restore(page, recipe('classic9', 'hard', '71', 8));
        expect([config.variantId, config.seed, config.maxAttempts]).toEqual(['classic9', 71, 8]);
        expect(shown(page.store)).toEqual(['classic9', 8, false]);
        page.store.set({ variantId: 'mega16' }, { source: 'controls' });
        expect(shown(page.store)).toEqual(['mega16', 2, false]);
        page.app.generate();
        expect(page.configs).toHaveLength(2);
        expect([page.configs[1].variantId, page.configs[1].maxAttempts]).toEqual(['mega16', 2]);
      });
    });

    it('MS05r5p-T04: an older mega16 entry at 8 replays with 8, which the control shows as a chosen 8', function () {
      ready();
      withPage(function (page) {
        var config = restore(page, recipe('mega16', 'nightmare', '3', 8));
        expect([config.variantId, config.maxAttempts]).toEqual(['mega16', 8]);
        expect(shown(page.store)).toEqual(['mega16', 8, true]);
        var model = SG.controls.describe(page.store.get());
        var field = model.fields.filter(function (f) { return f.id === 'maxAttempts'; })[0];
        expect([field.value, field.defaultValue]).toEqual([8, 2]);
        expect(Object.keys(config).indexOf('attemptsExplicit')).toBe(-1);
      });
      // An entry made with the new default is not a choice either: default mode stays default.
      withPage(function (page) {
        expect(restore(page, recipe('mega16', 'nightmare', '3', 2)).maxAttempts).toBe(2);
        expect(shown(page.store)).toEqual(['mega16', 2, false]);
      });
    });

    it('MS05r5p-T04: a number equal to the default of the replayed board keeps an explicit setting explicit, ' +
      'and a replay never makes it a default', function () {
      ready();
      withPage(function (page) {
        page.store.set({ maxAttempts: 5 }, { source: 'controls' });
        expect(restore(page, recipe('mega16', 'hard', '12', 2)).maxAttempts).toBe(2);
        expect(shown(page.store)).toEqual(['mega16', 2, true]);
        page.store.set({ variantId: 'butterfly' }, { source: 'controls' });
        expect(shown(page.store)).toEqual(['butterfly', 2, true]);
        expect(restore(page, recipe('classic9', 'hard', '13', 8)).maxAttempts).toBe(8);
        expect(shown(page.store)).toEqual(['classic9', 8, true]);
        page.store.set({ variantId: 'mega16' }, { source: 'controls' });
        expect(shown(page.store)).toEqual(['mega16', 8, true]);
        page.app.generate();
        expect(page.configs.map(function (c) { return c.maxAttempts; })).toEqual([2, 8, 8]);
      });
    });

    it('MS05r5p-T04: a number that is not the default of its board is replayed and becomes a chosen one',
      function () {
        ready();
        withPage(function (page) {
          var config = restore(page, recipe('mega12', 'expert', '14', 3));
          expect(config.maxAttempts).toBe(3);
          expect(shown(page.store)).toEqual(['mega12', 3, true]);
          expect(Object.keys(config).sort()).toEqual(['difficulty', 'digOrder', 'maxAttempts', 'seed',
            'symbolMode', 'symmetry', 'variantId', 'variantOptions']);
        });
        // What a real result recorded is what the entry carries.
        var r = realResult('classic4', 'veryEasy', 3);
        var entry = H.entryOf(r);
        expect(entry.maxAttempts).toBe(r.config.maxAttempts);
        expect(H.overridesOf(entry).maxAttempts).toBe(8);
      });
  });
})();
