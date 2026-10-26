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
})();
