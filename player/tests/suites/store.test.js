// SG.store (js/ui/store.js): the preferences of the player and the safe storage under them. Nothing may throw,
// whatever the browser does with localStorage.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var S = SG.store;

  /** A Storage-like object over a Map; `fail` makes every call throw the given error. */
  function fakeBackend(fail) {
    var map = new Map();
    var self = {
      map: map,
      get length() { return map.size; },
      key: function (i) { return Array.from(map.keys())[i] || null; },
      getItem: function (k) {
        if (fail && fail.read) throw fail.read;
        return map.has(k) ? map.get(k) : null;
      },
      setItem: function (k, v) {
        if (fail && fail.write) throw fail.write;
        map.set(k, String(v));
      },
      removeItem: function (k) {
        if (fail && fail.write) throw fail.write;
        map.delete(k);
      }
    };
    return self;
  }

  function quotaError() {
    var err = new Error('full');
    err.name = 'QuotaExceededError';
    return err;
  }

  function securityError() {
    var err = new Error('blocked');
    err.name = 'SecurityError';
    return err;
  }

  describe('store: preferences', function () {
    it('has complete defaults and hands out copies', function () {
      var d = S.defaults();
      expect(d).toEqual({ lang: 'en', theme: 'auto', fontSize: 'normal', reducedMotion: false,
        colorAuxSymbol: true, check: 'conflicts', autoNotes: true, showCoords: false });
      d.theme = 'dark';
      expect(S.defaults().theme).toBe('auto');
      expect(Object.isFrozen(S.DEFAULTS)).toBe(true);
    });

    it('sanitize keeps what fits, drops the rest and falls back field by field', function () {
      expect(S.sanitize({ theme: 'dark', fontSize: 'large', check: 'live', autoNotes: false }))
        .toEqual(Object.assign(S.defaults(), { theme: 'dark', fontSize: 'large', check: 'live', autoNotes: false }));
      expect(S.sanitize({ theme: 'neon', fontSize: 3, reducedMotion: 'yes', check: 'always', lang: 'de' }))
        .toEqual(S.defaults());
      expect(S.sanitize(null)).toEqual(S.defaults());
      expect(S.sanitize('x')).toEqual(S.defaults());
      expect(S.sanitize({ theme: 'bogus' }, { theme: 'dark' }).theme).toBe('dark');
      var polluted = JSON.parse('{"__proto__": {"theme": "dark"}, "unknown": 1}');
      expect(S.sanitize(polluted)).toEqual(S.defaults());
      expect(S.sanitize(polluted).unknown).toBeUndefined();
    });

    it('reads ?lang= from the address, and nothing else', function () {
      expect(S.parseUrl('?lang=vi')).toEqual({ lang: 'vi' });
      expect(S.parseUrl('?a=1&lang=EN-us&b=2')).toEqual({ lang: 'en' });
      expect(S.parseUrl('?lang=vi_VN')).toEqual({ lang: 'vi' });
      expect(S.parseUrl('?lang=de')).toEqual({ lang: null });
      expect(S.parseUrl('?language=vi')).toEqual({ lang: null });
      expect(S.parseUrl('')).toEqual({ lang: null });
      expect(S.parseUrl(undefined)).toEqual({ lang: null });
      expect(S.parseUrl('?lang=')).toEqual({ lang: null });
    });

    it('uses a key of its own, because the generator shares the origin', function () {
      expect(S.KEY).toBe('sg.player.prefs.v1');
      expect(S.KEY.indexOf('sg.player.')).toBe(0);
    });
  });

  describe('store: safe storage', function () {
    it('reads and writes through a working backend', function () {
      var backend = fakeBackend();
      var st = S.createStorage(backend);
      expect(st.setItem('a', '1')).toBe('ok');
      expect(backend.map.get('a')).toBe('1');
      expect(st.getItem('a')).toBe('1');
      expect(st.getItem('missing')).toBeNull();
      expect(st.persistent()).toBe(true);
      expect(st.keys()).toEqual(['a']);
      st.removeItem('a');
      expect(st.getItem('a')).toBeNull();
      expect(backend.map.has('a')).toBe(false);
    });

    it('keeps working in memory when the backend is blocked, never throwing', function () {
      var st = S.createStorage(fakeBackend({ read: securityError(), write: securityError() }));
      expect(st.setItem('a', '1')).toBe('blocked');
      expect(st.getItem('a')).toBe('1');
      expect(st.persistent()).toBe(false);
      expect(st.keys()).toEqual(['a']);
      st.removeItem('a');
      expect(st.getItem('a')).toBeNull();
      var none = S.createStorage(null);
      expect(none.setItem('b', '2')).toBe('blocked');
      expect(none.getItem('b')).toBe('2');
      expect(none.persistent()).toBe(false);
    });

    it('survives a window whose localStorage getter throws', function () {
      var saved = Object.getOwnPropertyDescriptor(root, 'localStorage');
      Object.defineProperty(root, 'localStorage', { configurable: true, get: function () { throw securityError(); } });
      try {
        var st = S.createStorage();
        expect(st.setItem('a', '1')).toBe('blocked');
        expect(st.getItem('a')).toBe('1');
      } finally {
        if (saved) Object.defineProperty(root, 'localStorage', saved);
        else delete root.localStorage;
      }
    });

    it('says "quota" when the storage is full, so the caller can free space and retry', function () {
      var backend = fakeBackend({ write: quotaError() });
      var st = S.createStorage(backend);
      expect(st.setItem('a', '1')).toBe('quota');
      expect(st.getItem('a')).toBe('1');
      backend.map.clear();
      var failing = true;
      var flaky = {
        getItem: function (k) { return backend.map.get(k) || null; },
        setItem: function (k, v) { if (failing) throw quotaError(); backend.map.set(k, v); },
        removeItem: function (k) { backend.map.delete(k); },
        length: 0,
        key: function () { return null; }
      };
      var again = S.createStorage(flaky);
      expect(again.setItem('b', '2')).toBe('quota');
      failing = false;
      expect(again.setItem('b', '2')).toBe('ok');
      expect(again.persistent()).toBe(true);
      expect(backend.map.get('b')).toBe('2');
    });

    it('also reads a value another tab stored after this storage was made', function () {
      var backend = fakeBackend();
      var st = S.createStorage(backend);
      backend.map.set('late', 'x');
      expect(st.getItem('late')).toBe('x');
    });
  });

  describe('store: the preferences store', function () {
    function make(initial, fail) {
      var backend = fakeBackend(fail);
      if (initial !== undefined) backend.map.set(S.KEY, initial);
      var storage = S.createStorage(backend);
      return { backend: backend, store: S.createStore(storage), storage: storage };
    }

    it('starts from the defaults and follows the language order: URL, stored, browser, English', function () {
      var m = make();
      expect(m.store.load({ search: '', navigator: { languages: ['fr', 'de'] } })).toEqual(S.defaults());
      expect(m.store.load({ search: '', navigator: { languages: ['vi-VN', 'en'] } }).lang).toBe('vi');
      var stored = make(JSON.stringify({ v: 1, lang: 'vi', theme: 'dark' }));
      var state = stored.store.load({ search: '', navigator: { languages: ['en'] } });
      expect(state.lang).toBe('vi');
      expect(state.theme).toBe('dark');
      expect(stored.store.load({ search: '?lang=en', navigator: { languages: ['vi'] } }).lang).toBe('en');
    });

    it('refuses a corrupt value, another version and values of the wrong type', function () {
      ['not json', '42', 'null', '[]', JSON.stringify({ v: 2, theme: 'dark' }), JSON.stringify({ theme: 'dark' })]
        .forEach(function (raw) {
          expect(make(raw).store.load({ search: '' }).theme).toBe('auto');
        });
      var partly = make(JSON.stringify({ v: 1, theme: 'neon', fontSize: 'large', check: 7, reducedMotion: true }));
      var state = partly.store.load({ search: '' });
      expect(state.theme).toBe('auto');
      expect(state.fontSize).toBe('large');
      expect(state.check).toBe('conflicts');
      expect(state.reducedMotion).toBe(true);
    });

    it('persists a change with its version and tells the listeners what changed and who did it', function () {
      var m = make();
      m.store.load({ search: '' });
      var seen = [];
      var off = m.store.subscribe(function (state, keys, meta) { seen.push({ state: state, keys: keys, meta: meta }); });
      var state = m.store.set({ theme: 'dark', fontSize: 'large' }, { source: 'test' });
      expect(state.theme).toBe('dark');
      expect(seen).toHaveLength(1);
      expect(seen[0].keys.sort()).toEqual(['fontSize', 'theme']);
      expect(seen[0].meta.source).toBe('test');
      expect(seen[0].state.theme).toBe('dark');
      var saved = JSON.parse(m.backend.map.get(S.KEY));
      expect(saved.v).toBe(1);
      expect(saved.theme).toBe('dark');
      expect(saved.fontSize).toBe('large');
      m.store.set({ theme: 'dark' });
      expect(seen).toHaveLength(1);
      m.store.set({ theme: 'bogus' });
      expect(m.store.get().theme).toBe('dark');
      expect(seen).toHaveLength(1);
      off();
      m.store.set({ theme: 'light' });
      expect(seen).toHaveLength(1);
    });

    it('does not store the language of a ?lang= link, only a language somebody chose', function () {
      var m = make();
      m.store.load({ search: '?lang=vi' });
      expect(m.store.get().lang).toBe('vi');
      m.store.set({ theme: 'dark' });
      expect(JSON.parse(m.backend.map.get(S.KEY)).lang).toBeUndefined();
      m.store.set({ lang: 'en' });
      expect(JSON.parse(m.backend.map.get(S.KEY)).lang).toBe('en');
      var other = make();
      other.store.load({ search: '' });
      other.store.set({ lang: 'vi' }, { persist: false });
      expect(other.backend.map.has(S.KEY)).toBe(false);
      expect(other.store.get().lang).toBe('vi');
    });

    it('keeps working when the storage is blocked or full', function () {
      var blocked = make(undefined, { read: securityError(), write: securityError() });
      blocked.store.load({ search: '' });
      expect(function () { blocked.store.set({ theme: 'dark' }); }).not.toThrow();
      expect(blocked.store.get().theme).toBe('dark');
      var full = make(undefined, { write: quotaError() });
      full.store.load({ search: '' });
      full.store.set({ check: 'off' });
      expect(full.store.get().check).toBe('off');
      expect(full.store.save()).toBe(false);
    });

    it('survives a listener that throws and rejects a listener that is not a function', function () {
      var m = make();
      var calls = 0;
      var logged = 0;
      var original = console.error;
      console.error = function () { logged++; };
      try {
        m.store.subscribe(function () { throw new Error('boom'); });
        m.store.subscribe(function () { calls++; });
        m.store.set({ theme: 'dark' });
      } finally {
        console.error = original;
      }
      expect(calls).toBe(1);
      expect(logged).toBe(1);
      expect(function () { m.store.subscribe(null); }).toThrow();
    });

    it('resets every preference but the language', function () {
      var m = make();
      m.store.load({ search: '?lang=vi' });
      m.store.set({ theme: 'dark', check: 'live', autoNotes: false });
      var changed = [];
      m.store.subscribe(function (state, keys) { changed = keys; });
      var state = m.store.reset();
      expect(state).toEqual(Object.assign(S.defaults(), { lang: 'vi' }));
      expect(changed.sort()).toEqual(['autoNotes', 'check', 'theme']);
    });

    it('shares one instance of the page', function () {
      expect(S.instance()).toBe(S.instance());
      expect(typeof S.storage().getItem).toBe('function');
    });
  });
})();
