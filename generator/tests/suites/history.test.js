// Puzzle history (js/ui/history.js): the entry of a result, the key that tells two puzzles apart, the
// configuration that rebuilds a puzzle, and the persisted list (localStorage with a memory fallback), run on
// Node with real pipeline results and a fake storage. The panel (`init`) is run on a private copy of the file
// with a small fake document and an app double (MS17a), for what the user is shown about the rating version.
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

  /** A result as the pipeline hands it over, with the rating version it states (none when `undefined`). */
  function resultWith(version, seed, extra) {
    var rating = { level: 'hard', score: 1500 };
    if (version !== undefined) rating.ratingVersion = version;
    return Object.assign({
      seed: seed === undefined ? 71 : seed, givens: [0, 1], rating: rating,
      config: { variantId: 'classic9', difficulty: 'hard', symmetry: 'rotational180', digOrder: 'random',
        maxAttempts: 8, variantOptions: {} }
    }, extra);
  }

  /** A recipe as a version before MS17a stored it: written by hand, with no `ratingVersion` key at all. */
  function legacy(seed) {
    return { variantId: 'classic9', requested: 'hard', level: 'hard', seed: seed, clues: 28, score: 1500,
      symmetry: 'rotational180', digOrder: 'random', maxAttempts: 8, variantOptions: {} };
  }

  function marked(e, version) {
    return Object.assign({}, e, { ratingVersion: version });
  }

  function versionsOf(entries) {
    return entries.map(function (e) { return e.ratingVersion; });
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
      expect(Object.keys(stored).sort()).toEqual(['clues', 'digOrder', 'level', 'maxAttempts',
        'ratingVersion', 'requested', 'score', 'seed', 'symbolMode', 'symmetry', 'variantId',
        'variantOptions']);
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

  // The producer's marker (MS17a, R22): an optional `ratingVersion`, copied from the result that made the
  // entry and never made up; the envelope stays version 1 and the marker is not part of the recipe.
  describe('history: the rating version of an entry (MS17a)', function () {
    it('copies the version the result states: the real producer, an older one and a future one', function () {
      ready();
      var real = realResult('classic9', 'easy', 3);
      expect(real.rating.ratingVersion).toBe(SG.difficulty.RATING_VERSION);
      expect(H.entryOf(real).ratingVersion).toBe(SG.difficulty.RATING_VERSION);
      [1, 7, 4096].forEach(function (version) {
        expect(H.entryOf(resultWith(version)).ratingVersion).toBe(version);
      });
    });

    it('has no marker for a result that states none or a malformed one, and never makes one up', function () {
      ready();
      var plain = H.entryOf(resultWith(undefined));
      expect('ratingVersion' in plain).toBe(false);
      [null, '2', '', 2.5, 0, -1, NaN, Infinity, true, [2], { v: 2 }].forEach(function (bad) {
        var e = H.entryOf(resultWith(bad));
        expect('ratingVersion' in e).toBe(false);
        expect(e).toEqual(plain);
      });
      var elsewhere = resultWith(undefined, 71, { ratingVersion: 2, rating: { level: 'hard', version: 2 } });
      expect('ratingVersion' in H.entryOf(elsewhere)).toBe(false);
      expect('ratingVersion' in H.entryOf(resultWith(undefined, 71, { rating: null }))).toBe(false);
    });

    it('writes the marker with the recipe and reads it back, an older and a future one too', function () {
      ready();
      var storage = fakeStorage();
      var list = H.createList({ storage: storage });
      list.add(marked(entry('a'), 2));
      list.add(marked(entry('b'), 1));
      list.add(marked(entry('c'), 99));
      var written = JSON.parse(storage.map.get(H.STORAGE_KEY));
      expect([written.version, H.VERSION, H.STORAGE_KEY]).toEqual([1, 1, 'sg.history.v1']);
      expect(versionsOf(written.entries)).toEqual([99, 1, 2]);
      expect(versionsOf(H.createList({ storage: storage }).list())).toEqual([99, 1, 2]);
      var real = H.entryOf(realResult('classic9', 'easy', 3));
      list.add(real);
      var back = H.createList({ storage: storage }).list()[0];
      expect(back.ratingVersion).toBe(SG.difficulty.RATING_VERSION);
      expect(back).toEqual(JSON.parse(JSON.stringify(real)));
    });

    it('reads a saved envelope with no marker: recipes stay readable, unmarked and selectable', function () {
      ready();
      var storage = fakeStorage();
      var saved = { version: 1, entries: [legacy('5'), legacy('4')] };
      saved.entries.forEach(function (e) { expect('ratingVersion' in e).toBe(false); });
      storage.map.set(H.STORAGE_KEY, JSON.stringify(saved));
      var list = H.createList({ storage: storage });
      var read = list.list();
      expect(seeds(read)).toEqual(['5', '4']);
      expect(read.some(function (e) { return 'ratingVersion' in e; })).toBe(false);
      expect(H.overridesOf(read[0])).toEqual({ variantId: 'classic9', difficulty: 'hard', seed: '5',
        variantOptions: {}, symmetry: 'rotational180', digOrder: 'random', maxAttempts: 8 });
      list.add(marked(legacy('6'), SG.difficulty.RATING_VERSION));
      var written = JSON.parse(storage.map.get(H.STORAGE_KEY)).entries;
      expect(seeds(written)).toEqual(['6', '5', '4']);
      expect(written.map(function (e) { return 'ratingVersion' in e; })).toEqual([true, false, false]);
    });

    it('keeps the recipe of an entry whose stored marker is malformed and leaves only the marker out',
      function () {
        ready();
        var storage = fakeStorage();
        var bad = ['2', 2.5, 0, -3, null, true, [2], { v: 2 }, ''];
        var entries = bad.map(function (value, i) { return marked(legacy('m' + i), value); });
        entries.push(marked(legacy('ok'), 3));
        storage.map.set(H.STORAGE_KEY, JSON.stringify({ version: 1, entries: entries }));
        var list = H.createList({ storage: storage });
        var read = list.list();
        expect(read.length).toBe(bad.length + 1);
        expect(read.filter(function (e) { return 'ratingVersion' in e; })).toHaveLength(1);
        expect(read[bad.length].ratingVersion).toBe(3);
        list.add(entry('new'));
        var written = JSON.parse(storage.map.get(H.STORAGE_KEY)).entries;
        expect(written.length).toBe(bad.length + 2);
        expect(written.filter(function (e) { return 'ratingVersion' in e; })).toHaveLength(1);
        var kept = list.add(marked(entry('typed'), '2'));
        expect(kept[0].seed).toBe('typed');
        expect('ratingVersion' in kept[0]).toBe(false);
        expect(kept.length).toBe(bad.length + 3);
      });

    it('is not part of the recipe: id, key, overrides and the generation config ignore it', function () {
      ready();
      var ids = [1, 2, 5, undefined].map(function (version) { return H.entryOf(resultWith(version)).id; });
      expect(ids.every(function (id) { return id === ids[0]; })).toBe(true);
      expect(ids[0]).toBe(H.keyOf(resultWith(2).config, 71));
      var config = resultWith(2).config;
      expect(H.keyOf(Object.assign({ ratingVersion: 5 }, config), 71)).toBe(H.keyOf(config, 71));
      var withVersion = H.entryOf(resultWith(1));
      expect(H.overridesOf(withVersion)).toEqual(H.overridesOf(H.entryOf(resultWith(undefined))));
      expect('ratingVersion' in H.overridesOf(withVersion)).toBe(false);
      var made = SG.store.toConfig(Object.assign(SG.store.defaults(), H.overridesOf(withVersion)));
      expect('ratingVersion' in made).toBe(false);
      var list = H.createList({ storage: fakeStorage() });
      list.add(marked(entry('a'), 1));
      list.add(entry('b'));
      list.add(marked(entry('a'), 2));
      expect(seeds(list.list())).toEqual(['a', 'b']);
      expect(versionsOf(list.list())).toEqual([2, undefined]);
    });

    it('is replaced by the marker of the new result only: never inherited, never made up', function () {
      ready();
      var list = H.createList({ storage: fakeStorage() });
      list.add(legacy('a'));
      list.add(legacy('b'));
      // opened (touch: false): replaced in place, with the producer the new result states
      list.add(marked(legacy('a'), 2), { touch: false });
      expect(seeds(list.list())).toEqual(['b', 'a']);
      expect(versionsOf(list.list())).toEqual([undefined, 2]);
      list.add(legacy('a'), { touch: false });
      expect(versionsOf(list.list())).toEqual([undefined, undefined]);
      list.add(marked(legacy('a'), 4), { touch: false });
      expect(versionsOf(list.list())).toEqual([undefined, 4]);
      list.add(marked(legacy('a'), '4'), { touch: false });
      expect(versionsOf(list.list())).toEqual([undefined, undefined]);
      // generated again (moved to the top): the same rule
      list.add(marked(legacy('b'), 5));
      expect(seeds(list.list())).toEqual(['b', 'a']);
      expect(versionsOf(list.list())).toEqual([5, undefined]);
      list.add(legacy('b'));
      expect(versionsOf(list.list())).toEqual([undefined, undefined]);
    });

    it('still ignores an envelope of another version and keeps markers when the list lives in memory',
      function () {
        ready();
        var entries = [marked(legacy('a'), 2)];
        [0, 2, 99].forEach(function (version) {
          var storage = fakeStorage();
          storage.map.set(H.STORAGE_KEY, JSON.stringify({ version: version, entries: entries }));
          expect(H.createList({ storage: storage }).list()).toEqual([]);
        });
        var none = H.createList({ storage: null });
        none.add(marked(entry('a'), 6));
        none.add(marked(entry('b'), 'x'));
        expect(versionsOf(none.list())).toEqual([undefined, 6]);
        expect(none.persistent()).toBe(false);
      });
  });

  // What the user is shown (MS17a): the panel on a private copy of js/ui/history.js, a small fake document,
  // an app double and the real language packs. The copy gets its own SG object and fragment list, so the
  // host's `SG.history`, its locale fragments and its list stay as they were.
  describe('history: the panel says which entries were made by an earlier version (MS17a)', function () {
    var EN_NOTE = 'Made by an earlier version; selecting this entry regenerates the puzzle using the ' +
      'current rating model.';
    var EN_TITLE = 'History stores the seed and settings, not the puzzle. Regeneration uses the current ' +
      'rating model, so the puzzle, difficulty level or score may change. A compatible cached result may ' +
      'be reused.';
    var VI_NOTE = 'Do phiên bản cũ hơn tạo; chọn mục này sẽ tạo lại đề bằng mô hình tính điểm hiện tại.';
    var VI_TITLE = 'Lịch sử lưu seed và các tùy chọn, không lưu đề. Khi tạo lại, đề, mức độ khó hoặc ' +
      'điểm có thể thay đổi theo mô hình tính điểm hiện tại. Có thể dùng lại kết quả trong bộ nhớ đệm ' +
      'nếu còn phù hợp.';

    function fakeDom() {
      function text(value) {
        return { nodeType: 3, textContent: String(value), children: [] };
      }
      function descendants(node) {
        var out = [];
        node.children.forEach(function (child) {
          out.push(child);
          out.push.apply(out, descendants(child));
        });
        return out;
      }
      function element(tag) {
        var el = { nodeType: 1, tag: tag, attrs: {}, children: [], listeners: {}, hidden: false,
          disabled: false, className: '' };
        Object.defineProperty(el, 'textContent', {
          get: function () { return el.children.map(function (c) { return c.textContent; }).join(''); },
          set: function (value) { el.children = value === '' ? [] : [text(value)]; }
        });
        el.setAttribute = function (name, value) { el.attrs[name] = String(value); };
        el.getAttribute = function (name) { return name in el.attrs ? el.attrs[name] : null; };
        el.appendChild = function (child) { el.children.push(child); return child; };
        el.addEventListener = function (type, fn) {
          (el.listeners[type] = el.listeners[type] || []).push(fn);
        };
        el.removeEventListener = function (type, fn) {
          el.listeners[type] = (el.listeners[type] || []).filter(function (f) { return f !== fn; });
        };
        el.querySelectorAll = function (selector) {
          var m = /^\[data-role="([a-z-]+)"\]$/.exec(selector);
          return descendants(el).filter(function (n) {
            return m !== null && n.attrs && n.attrs['data-role'] === m[1];
          });
        };
        el.focus = function () {};
        el.click = function () { (el.listeners.click || []).slice().forEach(function (fn) { fn(); }); };
        return el;
      }
      var byId = {};
      ['history-root', 'history-list', 'history-empty', 'history-clear'].forEach(function (id) {
        byId[id] = element('div');
      });
      return {
        byId: byId,
        descendants: descendants,
        doc: {
          getElementById: function (id) { return byId[id] || null; }, createElement: element,
          createElementNS: function (ns, tag) { return element(tag); }, createTextNode: text
        }
      };
    }

    /** The panel of a private copy of history.js: the `saved` entries and the `current` rating version. */
    function startPanel(options) {
      var node = SG.test.node;
      if (!node) SG.test.skip('needs the file system (Node only)');
      var dom = fakeDom();
      var initial = {};
      if (options.saved) initial[H.STORAGE_KEY] = JSON.stringify({ version: 1, entries: options.saved });
      var storage = fakeStorage(initial);
      var sg = Object.assign({}, SG);
      delete sg.history;
      sg.localeFragments = [];
      if (options.noDifficulty) delete sg.difficulty;
      else sg.difficulty = { RATING_VERSION: options.current };
      var source = node.fs.readFileSync(node.path.join(node.root, 'js/ui/history.js'), 'utf8');
      new Function('self', 'document', source)({ SG: sg, document: dom.doc, localStorage: storage }, dom.doc);
      expect(sg.localeFragments.length).toBe(1);
      var handlers = {};
      var generated = [];
      var app = {
        on: function (name, fn) { handlers[name] = fn; return function () { delete handlers[name]; }; },
        generate: function (overrides) { generated.push(overrides); },
        toast: function () {}
      };
      expect(sg.history.init(app)).toBe(true);
      var list = dom.byId['history-list'];
      return {
        handlers: handlers,
        generated: generated,
        rows: function () { return list.children; },
        openOf: function (row) { return row.children[0]; },
        removeOf: function (row) { return row.children[1]; },
        noteOf: function (row) {
          return dom.descendants(row).filter(function (n) {
            return n.attrs && n.attrs['data-role'] === 'earlier';
          })[0] || null;
        },
        stored: function () { return JSON.parse(storage.map.get(H.STORAGE_KEY)).entries; },
        destroy: function () { sg.history.destroy(); }
      };
    }

    function withPanel(options, fn) {
      var panel = startPanel(options);
      try {
        return fn(panel);
      } finally {
        panel.destroy();
        SG.i18n.setLocale('en');
      }
    }

    function notes(panel) {
      return panel.rows().map(function (row) { return panel.noteOf(row) !== null; });
    }

    it('MS17a-T02: an entry without a version or below the current one shows the note and the explanation; ' +
      'an equal or a future one shows neither', function () {
      ready();
      var saved = [legacy('1'), marked(legacy('2'), 1), marked(legacy('3'), 2), marked(legacy('4'), 3),
        marked(legacy('5'), 4), marked(legacy('6'), 99)];
      withPanel({ current: 3, saved: saved }, function (panel) {
        var rows = panel.rows();
        expect(rows.length).toBe(6);
        expect(notes(panel)).toEqual([true, true, true, false, false, false]);
        expect(rows[0].textContent).toContain(': score 1500, seed 1');
        rows.forEach(function (row, i) {
          if (i < 3) {
            expect(panel.noteOf(row).textContent).toBe(EN_NOTE);
            expect(panel.openOf(row).attrs.title).toBe(EN_TITLE);
            expect(row.textContent).toContain(EN_NOTE);
          } else {
            expect(panel.openOf(row).attrs.title).toBe('Generate this puzzle again');
            expect(row.textContent).not.toContain('earlier');
          }
        });
      });
    });

    it('MS17a-T02: the note and the explanation follow the language when the app announces a change',
      function () {
        ready();
        withPanel({ current: 2, saved: [legacy('1'), marked(legacy('2'), 2)] }, function (panel) {
          expect(panel.noteOf(panel.rows()[0]).textContent).toBe(EN_NOTE);
          SG.i18n.setLocale('vi');
          panel.handlers.locale();
          var rows = panel.rows();
          expect(panel.noteOf(rows[0]).textContent).toBe(VI_NOTE);
          expect(panel.openOf(rows[0]).attrs.title).toBe(VI_TITLE);
          expect(panel.noteOf(rows[1])).toBeNull();
          expect(panel.openOf(rows[1]).attrs.title).toBe('Tạo lại đề này');
          SG.i18n.setLocale('en');
          panel.handlers.locale();
          expect(panel.noteOf(panel.rows()[0]).textContent).toBe(EN_NOTE);
        });
      });

    it('MS17a-T02: the current version is validated: an unusable one gives a marked entry no note, a ' +
      'missing marker still gets it', function () {
      ready();
      var saved = [legacy('1'), marked(legacy('2'), 1), marked(legacy('3'), 2)];
      function shown(options) {
        return withPanel(Object.assign({ saved: saved }, options), notes);
      }
      expect(shown({ current: 2 })).toEqual([true, true, false]);
      expect(shown({ current: 3 })).toEqual([true, true, true]);
      expect(shown({ current: 1 })).toEqual([true, false, false]);
      ['3', 2.5, 0, -1, NaN, Infinity, null, undefined].forEach(function (bad) {
        expect(shown({ current: bad })).toEqual([true, false, false]);
      });
      expect(shown({ noDifficulty: true })).toEqual([true, false, false]);
    });

    it('MS17a-T02: opening a legacy recipe regenerates it as before; the new result replaces it in place',
      function () {
        ready();
        withPanel({ current: 2, saved: [legacy('9'), legacy('71'), legacy('8')] }, function (panel) {
          panel.openOf(panel.rows()[1]).click();
          expect(panel.generated.length).toBe(1);
          expect(panel.generated[0]).toEqual({ variantId: 'classic9', difficulty: 'hard', seed: '71',
            variantOptions: {}, symmetry: 'rotational180', digOrder: 'random', maxAttempts: 8 });
          // the regeneration brings its result: an opened entry keeps its place, with the producer it states
          panel.handlers.result({ result: resultWith(2, 71) });
          expect(seeds(panel.stored())).toEqual(['9', '71', '8']);
          expect(versionsOf(panel.stored())).toEqual([undefined, 2, undefined]);
          expect(notes(panel)).toEqual([true, false, true]);
          // a result that states no version does not inherit the old marker either
          panel.openOf(panel.rows()[1]).click();
          expect(panel.generated.length).toBe(2);
          expect(panel.generated[1]).toEqual(panel.generated[0]);
          expect('ratingVersion' in panel.generated[1]).toBe(false);
          panel.handlers.result({ result: resultWith(undefined, 71) });
          expect(versionsOf(panel.stored())).toEqual([undefined, undefined, undefined]);
          expect(notes(panel)).toEqual([true, true, true]);
        });
      });

    it('MS17a-T02: a new result is listed first with the producer it states; an imported one is not listed',
      function () {
        ready();
        withPanel({ current: 2, saved: [legacy('1')] }, function (panel) {
          panel.handlers.result({ result: resultWith(2, 500) });
          expect(seeds(panel.stored())).toEqual(['500', '1']);
          expect(versionsOf(panel.stored())).toEqual([2, undefined]);
          expect(notes(panel)).toEqual([false, true]);
          expect(panel.openOf(panel.rows()[0]).attrs['aria-current']).toBe('true');
          panel.handlers.result({ result: resultWith(2, 600), imported: true });
          expect(seeds(panel.stored())).toEqual(['500', '1']);
          expect(panel.rows().length).toBe(2);
          panel.handlers.result({ result: resultWith(undefined, 700) });
          expect(versionsOf(panel.stored())).toEqual([undefined, 2, undefined]);
          expect(notes(panel)).toEqual([true, false, true]);
        });
      });

    it('MS17a-T02: a legacy entry can be removed like any other', function () {
      ready();
      var saved = [legacy('1'), marked(legacy('2'), 2), legacy('3')];
      withPanel({ current: 2, saved: saved }, function (panel) {
        expect(notes(panel)).toEqual([true, false, true]);
        panel.removeOf(panel.rows()[0]).click();
        expect(seeds(panel.stored())).toEqual(['2', '3']);
        expect(notes(panel)).toEqual([false, true]);
      });
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
