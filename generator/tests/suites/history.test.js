// Puzzle history (js/ui/history.js): the entry of a result, the key that tells two puzzles apart, the
// configuration that rebuilds a puzzle, and the persisted list (localStorage with a memory fallback), run on
// Node with real pipeline results and a fake storage. The panel (`init`) needs a DOM and is covered by the
// browser run.
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
      cache[key] = SG.pipeline.run({ variantId: variantId, difficulty: difficulty, seed: seed, trace: 'off' }, null);
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

  function entry(id, at) {
    return { id: id, at: at, variantId: 'classic9', requested: 'easy', level: 'easy', seed: id, clues: 30,
      cells: 81, score: 100, variantOptions: {} };
  }

  describe('history: the entry of a result', function () {
    it('keeps what the list shows and what rebuilds the puzzle', function () {
      ready();
      var r = realResult('classic9', 'easy', 3);
      var e = H.entryOf(r, 1234);
      expect(e.id).toBe(H.keyOf(r.config, r.seed));
      expect(e.at).toBe(1234);
      expect(e.variantId).toBe('classic9');
      expect(e.requested).toBe('easy');
      expect(e.level).toBe(r.rating.level);
      expect(e.seed).toBe('3');
      expect(e.cells).toBe(81);
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

    it('tells two puzzles apart by variant, level, seed, dig settings and options, not by symbol set', function () {
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
      list.add(entry('a', 1));
      list.add(entry('b', 2));
      expect(list.list().map(function (e) { return e.id; })).toEqual(['b', 'a']);
      expect(list.persistent()).toBe(true);
      var again = H.createList({ storage: storage });
      expect(again.list().map(function (e) { return e.id; })).toEqual(['b', 'a']);
      expect(JSON.parse(storage.map.get(H.STORAGE_KEY)).version).toBe(H.VERSION);
    });

    it('moves a puzzle that is generated again to the top, or leaves it in place when it was opened', function () {
      ready();
      var list = H.createList({ storage: fakeStorage() });
      list.add(entry('a', 1));
      list.add(entry('b', 2));
      list.add(entry('c', 3));
      list.add(entry('a', 10));
      expect(list.list().map(function (e) { return e.id + e.at; })).toEqual(['a10', 'c3', 'b2']);
      list.add(entry('b', 20), { touch: false });
      expect(list.list().map(function (e) { return e.id + e.at; })).toEqual(['a10', 'c3', 'b2']);
    });

    it('keeps at most `limit` entries and removes or clears on request', function () {
      ready();
      var list = H.createList({ storage: fakeStorage(), limit: 3 });
      ['a', 'b', 'c', 'd', 'e'].forEach(function (id, i) { list.add(entry(id, i)); });
      expect(list.list().map(function (e) { return e.id; })).toEqual(['e', 'd', 'c']);
      expect(list.remove('d').map(function (e) { return e.id; })).toEqual(['e', 'c']);
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
        JSON.stringify({ version: 1, entries: [{ id: 5 }, null, entry('ok', 1), entry('ok', 2)] })
      ].forEach(function (text, i) {
        var storage = fakeStorage();
        storage.map.set(H.STORAGE_KEY, text);
        var list = H.createList({ storage: storage });
        expect(list.list().map(function (e) { return e.id; })).toEqual(i === 3 ? ['ok'] : []);
      });
      var list = H.createList({ storage: fakeStorage() });
      expect(list.add({ nope: true }).length).toBe(0);
    });

    it('lives in memory when the storage is missing, blocked or full', function () {
      ready();
      var none = H.createList({ storage: null });
      none.add(entry('a', 1));
      expect(none.list().length).toBe(1);
      expect(none.persistent()).toBe(false);

      var full = fakeStorage();
      var list = H.createList({ storage: full });
      list.add(entry('a', 1));
      full.failing = true;
      list.add(entry('b', 2));
      expect(list.list().map(function (e) { return e.id; })).toEqual(['b', 'a']);
      expect(list.persistent()).toBe(false);

      var blocked = {
        getItem: function () { throw new Error('SecurityError'); },
        setItem: function () { throw new Error('SecurityError'); },
        removeItem: function () { throw new Error('SecurityError'); }
      };
      var guarded = H.createList({ storage: blocked });
      guarded.add(entry('a', 1));
      expect(guarded.list().length).toBe(1);
    });
  });

  describe('history: language', function () {
    function holes(text) {
      return (String(text).match(/\{[A-Za-z]+\}/g) || []).sort().join();
    }

    it('has the same keys and placeholders in en and vi, and no empty text', function () {
      ready();
      var fragment = (SG.localeFragments || []).filter(function (f) { return f.en && f.en['history.title']; })[0];
      expect(fragment).toBeTruthy();
      var keys = Object.keys(fragment.en).sort();
      expect(Object.keys(fragment.vi).sort()).toEqual(keys);
      keys.forEach(function (key) {
        expect(key.indexOf('history.')).toBe(0);
        expect(String(fragment.en[key]).trim()).not.toBe('');
        expect(String(fragment.vi[key]).trim()).not.toBe('');
        expect(holes(fragment.vi[key])).toBe(holes(fragment.en[key]));
      });
      expect(SG.i18n.conflicts.filter(function (c) { return c.key.indexOf('history.') === 0; })).toEqual([]);
    });
  });
})();
