/**
 * Preferences and safe storage: `SG.store`.
 *   - `createStorage(backend?)` wraps `localStorage` so that nothing ever throws into the app (even reading
 *     `window.localStorage` can throw when storage is blocked). An in-memory map backs it: a value that could not
 *     be persisted is still read back for the rest of the session. `setItem` returns 'ok', 'quota' (the caller may
 *     free space and retry) or 'blocked'.
 *   - `createStore(storage)` keeps the player's preferences. The stored value is versioned (`{ v: 1, ... }`);
 *     anything else (corrupt JSON, another version, a wrong type) falls back to the defaults field by field.
 *   - `parseUrl(search)` reads `?lang=`, the only URL parameter of the player (the puzzle travels in the fragment,
 *     see exchange.js).
 * Keys are prefixed `sg.player.` on purpose: GitHub Pages serves the generator and the player from one origin,
 * which shares `localStorage`.
 *
 * store: get() -> state, set(patch, meta?) -> state, subscribe(fn) -> off, load(sources?) -> state, reset() -> state
 * (every preference but the language back to its default). `fn(state, changedKeys, meta)`; `meta.persist === false`
 * keeps a change out of the storage; `meta.source` says who changed it.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.store && typeof SG.store.createStore === 'function') return;

  const KEY = 'sg.player.prefs.v1';
  const VERSION = 1;
  const LANGS = Object.freeze(['en', 'vi']);
  const THEMES = Object.freeze(['auto', 'light', 'dark', 'high-contrast']);
  const FONT_SIZES = Object.freeze(['small', 'normal', 'large']);
  const CHECK_MODES = Object.freeze(['off', 'conflicts', 'live']);

  const DEFAULTS = Object.freeze({
    lang: 'en',
    theme: 'auto',
    fontSize: 'normal',
    reducedMotion: false,
    colorAuxSymbol: true,
    check: 'conflicts',
    autoNotes: true,
    showCoords: false
  });

  const VALID = {
    lang: function (v) { return LANGS.indexOf(v) !== -1; },
    theme: function (v) { return THEMES.indexOf(v) !== -1; },
    fontSize: function (v) { return FONT_SIZES.indexOf(v) !== -1; },
    reducedMotion: function (v) { return typeof v === 'boolean'; },
    colorAuxSymbol: function (v) { return typeof v === 'boolean'; },
    check: function (v) { return CHECK_MODES.indexOf(v) !== -1; },
    autoNotes: function (v) { return typeof v === 'boolean'; },
    showCoords: function (v) { return typeof v === 'boolean'; }
  };
  const FIELDS = Object.freeze(Object.keys(DEFAULTS));

  function defaults() {
    return Object.assign({}, DEFAULTS);
  }

  function sanitize(input, base) {
    const out = Object.assign({}, base || DEFAULTS);
    if (input === null || typeof input !== 'object') return out;
    FIELDS.forEach(function (name) {
      if (Object.prototype.hasOwnProperty.call(input, name) && VALID[name](input[name])) {
        out[name] = input[name];
      }
    });
    return out;
  }

  function parseUrl(search) {
    let lang = null;
    if (typeof search === 'string') {
      const m = /[?&]lang=([A-Za-z_-]+)/.exec(search);
      if (m) {
        const code = m[1].toLowerCase().split(/[-_]/)[0];
        if (LANGS.indexOf(code) !== -1) lang = code;
      }
    }
    return { lang: lang };
  }

  function isQuota(err) {
    return !!err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 || err.code === 1014);
  }

  function defaultBackend() {
    try {
      return typeof root.localStorage !== 'undefined' ? root.localStorage : null;
    } catch (err) {
      return null;
    }
  }

  function createStorage(backend) {
    const memory = new Map();
    let store = backend === undefined ? defaultBackend() : backend;
    let works = store !== null;

    function attempt(fn) {
      if (store === null) return { ok: false, err: null };
      try {
        return { ok: true, value: fn(store) };
      } catch (err) {
        return { ok: false, err: err };
      }
    }

    return {
      getItem: function getItem(key) {
        const read = attempt(function (s) { return s.getItem(key); });
        if (read.ok && typeof read.value === 'string') return read.value;
        return memory.has(key) ? memory.get(key) : null;
      },
      setItem: function setItem(key, value) {
        memory.set(key, value);
        const wrote = attempt(function (s) { s.setItem(key, value); });
        if (wrote.ok) {
          works = true;
          return 'ok';
        }
        works = false;
        return isQuota(wrote.err) ? 'quota' : 'blocked';
      },
      removeItem: function removeItem(key) {
        memory.delete(key);
        attempt(function (s) { s.removeItem(key); });
      },
      keys: function keys() {
        const names = new Set(memory.keys());
        const listed = attempt(function (s) {
          const out = [];
          for (let i = 0; i < s.length; i++) out.push(s.key(i));
          return out;
        });
        if (listed.ok) listed.value.forEach(function (name) { names.add(name); });
        return Array.from(names);
      },
      persistent: function persistent() { return works; }
    };
  }

  let sharedStorage = null;

  function storage() {
    if (sharedStorage === null) sharedStorage = createStorage();
    return sharedStorage;
  }

  function readStored(backend) {
    const raw = backend.getItem(KEY);
    if (raw === null) return null;
    try {
      const data = JSON.parse(raw);
      return data !== null && typeof data === 'object' && data.v === VERSION ? data : null;
    } catch (err) {
      return null;
    }
  }

  function createStore(backend) {
    const disk = backend || storage();
    let state = defaults();
    let listeners = [];
    // The language is written only once somebody chose it: a `?lang=` link must not become a preference.
    let langChosen = null;

    function save() {
      const out = Object.assign({ v: VERSION }, state);
      if (langChosen === null) delete out.lang;
      else out.lang = langChosen;
      const status = disk.setItem(KEY, JSON.stringify(out));
      return status === 'ok';
    }

    function notify(keys, meta) {
      listeners.slice().forEach(function (fn) {
        try {
          fn(Object.assign({}, state), keys, meta || {});
        } catch (err) {
          if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
        }
      });
    }

    return {
      get: function get() { return Object.assign({}, state); },
      set: function set(patch, meta) {
        const next = sanitize(patch, state);
        const changed = FIELDS.filter(function (name) {
          const given = patch !== null && typeof patch === 'object' &&
            Object.prototype.hasOwnProperty.call(patch, name);
          return given && next[name] !== state[name];
        });
        if (changed.length === 0) return Object.assign({}, state);
        state = next;
        if (changed.indexOf('lang') !== -1 && (!meta || meta.persist !== false)) langChosen = next.lang;
        if (!meta || meta.persist !== false) save();
        notify(changed, meta);
        return Object.assign({}, state);
      },
      subscribe: function subscribe(fn) {
        if (typeof fn !== 'function') throw new TypeError('SG.store.subscribe needs a function');
        listeners.push(fn);
        return function off() { listeners = listeners.filter(function (other) { return other !== fn; }); };
      },
      /** Reads the stored preferences; the language is chosen like every start-up language (URL `lang`, stored, browser, English) and is not stored by this call. */
      load: function load(sources) {
        const s = sources || {};
        const stored = readStored(disk);
        state = sanitize(stored, defaults());
        const storedLang = stored !== null && VALID.lang(stored.lang) ? stored.lang : null;
        langChosen = storedLang;
        const urlLang = parseUrl(s.search).lang;
        if (SG.i18n && typeof SG.i18n.detect === 'function') {
          state.lang = SG.i18n.detect({ urlLang: urlLang, stored: storedLang, navigator: s.navigator });
        } else {
          state.lang = urlLang || storedLang || DEFAULTS.lang;
        }
        return Object.assign({}, state);
      },
      reset: function reset() {
        const keys = FIELDS.filter(function (name) {
          return name !== 'lang' && state[name] !== DEFAULTS[name];
        });
        state = Object.assign(defaults(), { lang: state.lang });
        save();
        if (keys.length > 0) notify(keys, { source: 'reset' });
        return Object.assign({}, state);
      },
      save: save
    };
  }

  let sharedStore = null;

  function instance() {
    if (sharedStore === null) sharedStore = createStore(storage());
    return sharedStore;
  }

  SG.store = {
    KEY: KEY,
    VERSION: VERSION,
    DEFAULTS: DEFAULTS,
    LANGS: LANGS,
    THEMES: THEMES,
    FONT_SIZES: FONT_SIZES,
    CHECK_MODES: CHECK_MODES,
    defaults: defaults,
    sanitize: sanitize,
    parseUrl: parseUrl,
    createStorage: createStorage,
    storage: storage,
    createStore: createStore,
    instance: instance
  };
})(typeof self !== 'undefined' ? self : globalThis);
