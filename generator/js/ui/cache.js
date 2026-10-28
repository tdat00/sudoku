/**
 * `SG.cache`: puzzle cache and background pre-generation (design.md 6.8, item 7; storage: 14.3).
 *  - RESULT CACHE. Generation is deterministic, so a configuration with the same seed is served from
 *    `localStorage` at once (LRU of 20 puzzles).
 *  - REPLAY. Only the puzzle is stored, never the trace or the dig log: a served puzzle is regenerated from
 *    its seed in the background (an independent client) and must come out equal (givens, solution, rating),
 *    else the entry is dropped and the puzzle generated again. Its trace and dig log then go to
 *    `SG.app.attachTrace`. Generating anything else cancels the regeneration (identity check).
 *  - POOL. After 1 s of quiet (no run, no form change, no key or pointer press, tab visible) one or two
 *    puzzles of the SAME configuration with random seeds are pre-generated (at most 2 per configuration, 4 in
 *    all); "Generate" with an empty seed and "Regenerate" hand them out. An explicit seed is never answered
 *    from the pool. Never during a run, cancelled by any user change, paused while the tab is hidden, one job
 *    at a time, a job that takes too long is abandoned (`COSTS` skips slow configurations). Not in
 *    main-thread mode: slices on the UI thread would compete with the user.
 *
 * `init(SG.app)` wraps the generation client of the app (`SG.app.setClient`, same interface). A cached result
 * is flagged `result.fromCache = true`. A puzzle `SG.app.showResult` puts on screen (an import) is never
 * cached, gets no regeneration and disarms the pre-generator until the next generation.
 * Storage never throws: blocked storage means an in-memory LRU, a full one evicts and retries, a corrupt
 * item or another schema version is purged; every change re-reads the stored list (several tabs).
 *
 * API: init(app) -> boolean (idempotent; false when `app` has no `setClient`), configKey(config) -> ?string
 * (normalised: `trace` and option order ignored; a missing seed gives `*`, the key of the pool; null for an
 * invalid configuration), get(key, { trace? }) -> ?PuzzleResult (touches the LRU order; `trace` re-applies
 * the verbosity of the request, see `deserialize`; a corrupt entry is dropped, null returned), put(result, {
 * pool? }), remove(key), has(key), clear(), stats(), setEnabled(on) / isEnabled() (the pre-generation
 * preference; the cache itself always works; not persisted), createStore(...) and createController(...)
 * (injectable storage, clocks and timers, for tests), serialize(result) (JSON-safe copy; typed arrays become
 * `{ $t, d }`), deserialize(data, { trace? }) (the inverse), estimateCost(config) (ms; Infinity: unknown),
 * VERSION, STORAGE_KEY, LIMIT.
 *
 * Loads in Node without a DOM; the DOM and `localStorage` are touched only inside functions.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.cache && typeof SG.cache.createStore === 'function') return;

  /** Schema version of the stored list; changing it purges every older cache. */
  const SCHEMA_VERSION = 2;
  const STORAGE_KEY = 'sg.cache.v1';
  const LIMIT = 20;
  const POOL_PER_CONFIG = 2;
  const POOL_TOTAL = 4;

  const IDLE_MS = 1000;
  const MAX_PREGEN_COST_MS = 3000;
  const PREGEN_LIMIT_MS = 8000;
  const STORAGE_RETRY_MS = 30000;
  const WORKER_IDLE_MS = 30000;

  const NOTE_ID = 'cache-note';

  const CONFIG_STATE_KEYS = Object.freeze(['variantId', 'difficulty', 'symbolMode', 'symmetry', 'digOrder',
    'maxAttempts', 'variantOptions']);

  /**
   * Expected generation time in milliseconds per variant and level: the slowest of the 40 requests of the
   * qualification (`node tests/qualify.js`; Node, `trace: 'off'`), rounded up (to 10 ms below 100 ms, to 50
   * ms below 1 s, to 500 ms above) and at least 20 ms. A configuration above `MAX_PREGEN_COST_MS` is not
   * pre-generated; an unlisted level is unknown (Infinity), not pre-generated either.
   */
  const COSTS = Object.freeze({
    classic4: { veryEasy: 20 },
    classic6: { veryEasy: 20, hard: 150 },
    classic9: { veryEasy: 20, easy: 20, normal: 250, hard: 100, expert: 250, master: 200, nightmare: 250,
      hell1: 650 },
    mega12: { veryEasy: 20, easy: 20, normal: 30, hard: 70, expert: 250, master: 250, nightmare: 350,
      hell1: 1500, hell2: 4000 },
    mega16: { veryEasy: 20, easy: 20, normal: 30, hard: 150, expert: 3500, master: 1500, nightmare: 700,
      hell1: 600, hell2: 8500 },
    diagonalX: { veryEasy: 20, easy: 20, normal: 50, hard: 20, expert: 60, master: 70, nightmare: 70,
      hell1: 250, hell2: 1500 },
    hyper: { veryEasy: 20, easy: 20, normal: 150, hard: 20, expert: 300, master: 250, nightmare: 90,
      hell1: 150, hell2: 1500 },
    jigsaw9: { veryEasy: 40, easy: 20, normal: 70, hard: 30, expert: 150, master: 100, nightmare: 100,
      hell1: 150, hell2: 2000 },
    killer: { veryEasy: 20, easy: 30, normal: 1500, hard: 1500, expert: 11500, master: 7000, nightmare: 4500,
      hell1: 2000, hell2: 6500 },
    greaterThan: { veryEasy: 20, easy: 40, normal: 150, hard: 8000, expert: 7500, master: 3500, nightmare: 1500,
      hell1: 400, hell2: 5000 },
    samurai: { veryEasy: 20, easy: 20, normal: 200, hard: 350, expert: 600, master: 500, nightmare: 950,
      hell1: 3000, hell2: 5500 },
    sohei: { veryEasy: 20, easy: 20, normal: 200, hard: 400, expert: 450, master: 350, nightmare: 1500,
      hell1: 2500, hell2: 4000 },
    butterfly: { veryEasy: 20, easy: 20, normal: 80, hard: 150, expert: 600, master: 300, nightmare: 950,
      hell1: 2500, hell2: 3500 },
    flower: { veryEasy: 20, easy: 20, normal: 200, hard: 950, expert: 500, master: 450, nightmare: 250,
      hell1: 2000, hell2: 4000 },
    wordoku: { veryEasy: 20, easy: 20, normal: 150, hard: 200, expert: 150, master: 200, nightmare: 300,
      hell1: 850 }
  });

  function noop() {}

  function positiveInt(value, fallback) {
    return typeof value === 'number' && isFinite(value) && value >= 1 ? Math.floor(value) : fallback;
  }

  function invalidData(what) {
    return new SG.errors.GenerationError('unexpected', { message: 'invalid cached puzzle: ' + what });
  }

  /** `JSON.stringify` with the keys of every object sorted, so that equal data gives equal text. */
  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (k) {
      return JSON.stringify(k) + ':' + stableStringify(value[k]);
    }).join(',') + '}';
  }

  function buildKey(norm, seedText) {
    return [norm.variantId, norm.difficulty, seedText, norm.symbolMode, norm.symmetry, norm.digOrder,
      norm.maxAttempts, stableStringify(norm.variantOptions)].join('|');
  }

  /**
   * Normalises a configuration and derives its keys. `key` is the key of the puzzle (`*` stands for a missing
   * seed), `cfg` the key of the configuration with any seed (what the pool is keyed by).
   * @returns {?{norm: Object, hasSeed: boolean, key: string, cfg: string}} null for an invalid configuration.
   */
  function keyInfo(config) {
    if (config === null || typeof config !== 'object') return null;
    const hasSeed = config.seed !== undefined && config.seed !== null;
    let norm;
    try {
      norm = SG.pipeline.normalizeConfig(hasSeed ? config : Object.assign({}, config, { seed: 0 }));
    } catch (err) {
      return null;
    }
    return { norm: norm, hasSeed: hasSeed, key: buildKey(norm, hasSeed ? String(norm.seed) : '*'),
      cfg: buildKey(norm, '*') };
  }

  /** Normalised like the pipeline does; trace verbosity and option order are ignored. See the file header. */
  function configKey(config) {
    const info = keyInfo(config);
    return info === null ? null : info.key;
  }

  function estimateCost(config) {
    const levels = config && Object.prototype.hasOwnProperty.call(COSTS, config.variantId)
      ? COSTS[config.variantId] : null;
    if (levels === null || !Object.prototype.hasOwnProperty.call(levels, config.difficulty)) return Infinity;
    return levels[config.difficulty];
  }

  const TYPED_ARRAYS = Object.freeze({
    Int8Array: Int8Array, Uint8Array: Uint8Array, Int16Array: Int16Array, Uint16Array: Uint16Array,
    Int32Array: Int32Array, Uint32Array: Uint32Array, Float32Array: Float32Array,
    Float64Array: Float64Array
  });

  /** Plain JSON-safe copy: typed arrays as `{ $t, d }`, a non-finite number as `{ $n }`. */
  function encode(value) {
    if (typeof value === 'number') return isFinite(value) ? value : { $n: String(value) };
    if (value === null || typeof value !== 'object') return value;
    if (ArrayBuffer.isView(value)) {
      const name = value.constructor.name;
      if (!Object.prototype.hasOwnProperty.call(TYPED_ARRAYS, name)) throw invalidData('array type ' + name);
      return { $t: name, d: Array.from(value) };
    }
    if (Array.isArray(value)) return value.map(encode);
    const out = {};
    Object.keys(value).forEach(function (k) { out[k] = encode(value[k]); });
    return out;
  }

  function decode(value) {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(decode);
    if (typeof value.$t === 'string' && Array.isArray(value.d)) {
      if (!Object.prototype.hasOwnProperty.call(TYPED_ARRAYS, value.$t)) throw invalidData(value.$t);
      return TYPED_ARRAYS[value.$t].from(value.d);
    }
    if (typeof value.$n === 'string' && Object.keys(value).length === 1) return Number(value.$n);
    const out = {};
    Object.keys(value).forEach(function (k) { out[k] = decode(value[k]); });
    return out;
  }

  /** FNV-1a over the givens and the solution: a cheap guard against a silently damaged entry. */
  function checksum(givens, solution) {
    let h = 0x811c9dc5;
    for (let pass = 0; pass < 2; pass++) {
      const values = pass === 0 ? givens : solution;
      for (let i = 0; i < values.length; i++) {
        h ^= (values[i] + 1) & 0xffff;
        h = Math.imul(h, 0x01000193);
      }
    }
    return h >>> 0;
  }

  /**
   * A PuzzleResult as JSON-safe data (`SG.pipeline.toWire` with typed arrays wrapped) plus a checksum. Extra
   * fields (`fromCache`) and the dig log are not stored: the replay comes back from the regeneration
   * ("REPLAY").
   */
  function serialize(result) {
    const wire = encode(SG.pipeline.toWire(result));
    delete wire.digLog;
    wire.sum = checksum(result.givens, result.solution);
    return wire;
  }

  /**
   * Makes the trace-dependent parts of a result what a fresh run with `trace` would give: `config.trace` and
   * the 'trace.downgraded' warning (a 'full' trace is downgraded above `SG.pipeline.FULL_TRACE_MAX_CELLS`).
   */
  function retrace(result, trace) {
    const limit = SG.pipeline.FULL_TRACE_MAX_CELLS;
    const downgrade = trace === 'full' && result.model.cellCount > limit;
    const warnings = result.warnings.filter(function (w) { return w !== 'trace.downgraded'; });
    result.config = Object.assign({}, result.config, { trace: downgrade ? 'summary' : trace });
    result.warnings = downgrade ? ['trace.downgraded'].concat(warnings) : warnings;
    return result;
  }

  function verify(result, sum) {
    const model = result.model;
    const n = model.cellCount;
    if (!result.givens || !result.solution || result.givens.length !== n || result.solution.length !== n) {
      throw invalidData('size');
    }
    if (sum !== checksum(result.givens, result.solution)) throw invalidData('checksum');
    for (let i = 0; i < n; i++) {
      if (result.givens[i] !== 0 && result.givens[i] !== result.solution[i]) throw invalidData('givens');
    }
    const report = SG.model.validate(model, { solve: false });
    if (!report.ok) throw invalidData('model');
    if (!SG.model.isSolution(model, result.solution)) throw invalidData('solution');
    const rating = result.rating;
    if (rating === null || typeof rating !== 'object' || !isFinite(rating.score) ||
        typeof rating.level !== 'string') {
      throw invalidData('rating');
    }
    const cfg = result.config;
    if (cfg === null || typeof cfg !== 'object' || cfg.variantId !== model.variantId ||
        cfg.seed !== result.seed || !Array.isArray(result.warnings)) {
      throw invalidData('config');
    }
  }

  /**
   * Rebuilds a PuzzleResult from `serialize` data (or its JSON text) and checks the model, solution, givens
   * and checksum. `options.trace`: see `retrace`. Throws GenerationError 'unexpected' for data that is not a
   * valid puzzle.
   */
  function deserialize(data, options) {
    let wire;
    try {
      wire = decode(typeof data === 'string' ? JSON.parse(data) : data);
    } catch (err) {
      throw err instanceof SG.errors.GenerationError ? err : invalidData('format');
    }
    if (wire === null || typeof wire !== 'object') throw invalidData('format');
    let result;
    try {
      result = SG.pipeline.fromWire(wire);
      verify(result, wire.sum);
    } catch (err) {
      throw err instanceof SG.errors.GenerationError && err.code === 'unexpected' ? err : invalidData('data');
    }
    if (options && typeof options.trace === 'string') retrace(result, options.trace);
    return result;
  }

  function sameResult(a, b) {
    if (!a || !b || a.givens.length !== b.givens.length || a.solution.length !== b.solution.length) {
      return false;
    }
    for (let i = 0; i < a.givens.length; i++) {
      if (a.givens[i] !== b.givens[i] || a.solution[i] !== b.solution[i]) return false;
    }
    return a.rating.level === b.rating.level && a.rating.score === b.rating.score;
  }

  function isQuota(err) {
    return Boolean(err) && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 || err.code === 1014);
  }

  function validEntry(e) {
    return e !== null && typeof e === 'object' && typeof e.key === 'string' && typeof e.cfg === 'string' &&
      typeof e.at === 'number' && e.data !== null && typeof e.data === 'object';
  }

  /**
   * @typedef {Object} CacheEntry
   * @property {string} key   Key of the puzzle (see `configKey`).
   * @property {string} cfg   Key of its configuration with any seed (the pool key).
   * @property {number} at    Time of the last use (ms).
   * @property {boolean} pool Pre-generated and not handed out yet.
   * @property {Object} data  `serialize(result)`.
   */

  /**
   * An LRU list of puzzles, persisted as `{ version, entries }` under one key, newest first. Entries are
   * immutable. Every operation re-reads the stored list first (another tab may have changed it). Nothing
   * throws. Options: `storage` (`localStorage`-like; null or a throwing getter = memory only), `now`,
   * `version` (another stored version is purged), `limit` (20), `key` (`sg.cache.v1`), `poolPerConfig` (2),
   * `poolTotal` (4).
   */
  function createStore(options) {
    const o = options || {};
    const version = o.version !== undefined ? o.version : SCHEMA_VERSION;
    const limit = positiveInt(o.limit, LIMIT);
    const poolPerConfig = positiveInt(o.poolPerConfig, POOL_PER_CONFIG);
    const poolTotal = positiveInt(o.poolTotal, POOL_TOTAL);
    const storageKey = typeof o.key === 'string' ? o.key : STORAGE_KEY;
    const now = typeof o.now === 'function' ? o.now : function () { return Date.now(); };

    let mem = [];
    let dirty = false;
    let retryAt = 0;
    let persistent = false;
    let bytes = 0;
    let lastText = null;
    let lastEntries = null;
    const gone = new Set();

    function storage() {
      if (o.storage !== undefined) return o.storage;
      try {
        return root.localStorage || null;
      } catch (err) {
        return null;
      }
    }

    function parse(text) {
      let value;
      try {
        value = JSON.parse(text);
      } catch (err) {
        return null;
      }
      if (value === null || typeof value !== 'object' || value.version !== version ||
          !Array.isArray(value.entries)) {
        return null;
      }
      const seen = new Set();
      return value.entries.filter(function (e) {
        if (!validEntry(e) || seen.has(e.key)) return false;
        seen.add(e.key);
        return true;
      });
    }

    /** The stored list: { state: 'ok', entries } | { state: 'empty' } | { state: 'unavailable' }. */
    function readDisk() {
      const st = storage();
      if (st === null || st === undefined) return { state: 'unavailable' };
      let text;
      try {
        text = st.getItem(storageKey);
      } catch (err) {
        return { state: 'unavailable' };
      }
      if (typeof text !== 'string') return { state: 'empty' };
      if (text === lastText && lastEntries !== null) return { state: 'ok', entries: lastEntries.slice() };
      const entries = parse(text);
      if (entries === null) {
        try {
          st.removeItem(storageKey);
        } catch (err) {
          // A corrupt item that cannot be removed is overwritten by the next write.
        }
        lastText = null;
        lastEntries = null;
        return { state: 'empty' };
      }
      lastText = text;
      lastEntries = entries;
      bytes = text.length;
      return { state: 'ok', entries: entries.slice() };
    }

    /** Union by key; the more recent copy wins; a puzzle that either side handed out leaves the pool. */
    function merge(a, b) {
      const byKey = new Map();
      a.concat(b).forEach(function (e) {
        const old = byKey.get(e.key);
        if (old === undefined) {
          byKey.set(e.key, e);
        } else {
          byKey.set(e.key, Object.assign({}, e.at > old.at ? e : old, { pool: Boolean(e.pool && old.pool) }));
        }
      });
      return Array.from(byKey.values()).filter(function (e) { return !gone.has(e.key); })
        .sort(function (x, y) { return y.at - x.at; });
    }

    /** The current list, newest first: the storage when it is the truth, else what this tab holds. */
    function snapshot() {
      const disk = readDisk();
      persistent = disk.state !== 'unavailable';
      if (disk.state === 'ok') return dirty ? merge(disk.entries, mem) : disk.entries;
      if (disk.state === 'empty') return dirty ? mem.slice() : [];
      return mem.slice();
    }

    function normalize(list) {
      const seen = new Set();
      const perConfig = new Map();
      let pooled = 0;
      const out = [];
      for (let i = 0; i < list.length && out.length < limit; i++) {
        const e = list[i];
        if (seen.has(e.key)) continue;
        seen.add(e.key);
        if (e.pool) {
          const n = perConfig.get(e.cfg) || 0;
          if (n >= poolPerConfig || pooled >= poolTotal) continue;
          perConfig.set(e.cfg, n + 1);
          pooled++;
        }
        out.push(e);
      }
      return out;
    }

    /** Writes the list; on a full storage the least recently used entries go until it fits. */
    function commit(list) {
      const next = normalize(list);
      mem = next;
      const st = storage();
      if (st === null || st === undefined || now() < retryAt) {
        dirty = true;
        persistent = false;
        return;
      }
      let attempt = next;
      for (;;) {
        let text = null;
        let failure = null;
        try {
          text = JSON.stringify({ version: version, entries: attempt });
          st.setItem(storageKey, text);
        } catch (err) {
          failure = err || new Error('storage');
        }
        if (failure === null) {
          mem = attempt;
          dirty = false;
          persistent = true;
          bytes = text.length;
          lastText = text;
          lastEntries = attempt;
          gone.clear();
          return;
        }
        if (!isQuota(failure) || attempt.length <= 1) {
          dirty = true;
          persistent = false;
          retryAt = now() + STORAGE_RETRY_MS;
          return;
        }
        attempt = attempt.slice(0, -1);
      }
    }

    function indexOfKey(list, key) {
      for (let i = 0; i < list.length; i++) if (list[i].key === key) return i;
      return -1;
    }

    function guarded(fn, fallback) {
      try {
        return fn();
      } catch (err) {
        return fallback;
      }
    }

    return {
      list: function list(filter) {
        return guarded(function () {
          const all = snapshot();
          return typeof filter === 'function' ? all.filter(filter) : all;
        }, []);
      },

      /** An entry, or null; it becomes the most recently used one unless `options.touch` is false. */
      get: function get(key, opts) {
        return guarded(function () {
          const list = snapshot();
          const at = indexOfKey(list, key);
          if (at === -1) return null;
          if (opts && opts.touch === false) return list[at];
          const entry = Object.assign({}, list[at], { at: now() });
          list.splice(at, 1);
          list.unshift(entry);
          commit(list);
          return entry;
        }, null);
      },

      /**
       * Stores an entry as the most recently used one; an entry that exists and is not in the pool stays out
       * of it.
       */
      put: function put(entry) {
        return guarded(function () {
          if (!entry || typeof entry.key !== 'string' || typeof entry.cfg !== 'string' ||
              entry.data === null || typeof entry.data !== 'object') {
            return false;
          }
          const list = snapshot();
          const at = indexOfKey(list, entry.key);
          const pool = Boolean(entry.pool) && (at === -1 || list[at].pool);
          if (at !== -1) list.splice(at, 1);
          list.unshift({ key: entry.key, cfg: entry.cfg, at: now(), pool: pool, data: entry.data });
          gone.delete(entry.key);
          commit(list);
          return true;
        }, false);
      },

      /** Marks an entry as pre-generated or handed out; it becomes the most recently used one. */
      setPool: function setPool(key, pool) {
        return guarded(function () {
          const list = snapshot();
          const at = indexOfKey(list, key);
          if (at === -1) return false;
          const entry = Object.assign({}, list[at], { pool: Boolean(pool), at: now() });
          list.splice(at, 1);
          list.unshift(entry);
          commit(list);
          return true;
        }, false);
      },

      remove: function remove(key) {
        return guarded(function () {
          const list = snapshot();
          const at = indexOfKey(list, key);
          gone.add(key);
          if (at === -1) return false;
          list.splice(at, 1);
          commit(list);
          return true;
        }, false);
      },

      clear: function clear() {
        guarded(function () {
          mem = [];
          dirty = false;
          bytes = 0;
          lastText = null;
          lastEntries = null;
          gone.clear();
          const st = storage();
          if (st !== null && st !== undefined) st.removeItem(storageKey);
        }, undefined);
      },

      stats: function stats() {
        return guarded(function () {
          const list = snapshot();
          return {
            count: list.length,
            pool: list.filter(function (e) { return e.pool; }).length,
            limit: limit,
            version: version,
            persistent: persistent && !dirty,
            dirty: dirty,
            bytes: bytes
          };
        }, { count: 0, pool: 0, limit: limit, version: version, persistent: false, dirty: true, bytes: 0 });
      }
    };
  }

  let shared = null;

  function sharedStore() {
    if (shared === null) shared = createStore({});
    return shared;
  }

  function putResult(store, result, pool) {
    try {
      const info = keyInfo(result.config);
      if (info === null || !info.hasSeed) return false;
      return store.put({ key: info.key, cfg: info.cfg, pool: Boolean(pool), data: serialize(result) });
    } catch (err) {
      return false;
    }
  }

  /** A puzzle of an entry, or null (a damaged entry is removed). */
  function entryResult(store, entry, trace) {
    try {
      const result = deserialize(entry.data, trace === undefined ? undefined : { trace: trace });
      const info = keyInfo(result.config);
      if (info !== null && info.key === entry.key) return result;
    } catch (err) {
      // Dropped below.
    }
    store.remove(entry.key);
    return null;
  }

  function createNote() {
    let el = null;
    let key = null;

    function ensure() {
      if (typeof document === 'undefined') return null;
      if (el !== null && el.isConnected) return el;
      const host = document.getElementById('player-root');
      if (host === null) return null;
      el = document.createElement('p');
      el.id = NOTE_ID;
      el.className = 'cache-note';
      el.hidden = true;
      host.appendChild(el);
      return el;
    }

    function render() {
      const node = ensure();
      if (node === null) return;
      node.textContent = key === null ? '' : SG.i18n.t(key);
      node.hidden = key === null;
    }

    return {
      show: function show(k) { key = k; render(); },
      hide: function hide() { key = null; render(); },
      refresh: render,
      destroy: function destroy() {
        key = null;
        if (el !== null && el.parentNode) el.parentNode.removeChild(el);
        el = null;
      }
    };
  }

  function documentHidden() {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden';
  }

  function watchVisibility(fn) {
    if (typeof document === 'undefined') return noop;
    const listener = function () { fn(documentHidden()); };
    document.addEventListener('visibilitychange', listener);
    return function () { document.removeEventListener('visibilitychange', listener); };
  }

  function watchActivity(fn) {
    if (typeof document === 'undefined') return noop;
    const names = ['keydown', 'pointerdown'];
    const listener = function () { fn(); };
    names.forEach(function (name) { document.addEventListener(name, listener, true); });
    return function () {
      names.forEach(function (name) { document.removeEventListener(name, listener, true); });
    };
  }

  /**
   * Builds the wrapper client and the schedulers around it; everything outside is injectable. `options.app`:
   * `SG.app` or a stand-in (`on`, `getStore`, `getResult`, `getBoard`, `attachTrace`, `generate`, `toast`,
   * `announce`, `getClient`, `setClient`). Other options: `store` (the shared LRU), `inner` (the client to
   * wrap: `app.getClient()`, else `SG.workerClient`), `createClient` (the background client,
   * `SG.workerClient.create()`; without one nothing is served from the cache), `timers` `{ set, clear }`,
   * `now`, `isHidden`, `watchVisibility(fn(hidden))`, `watchActivity(fn())` (both return unsubscribe),
   * `random` (uint32, seeds of the pool), `note` `{ show(key), hide(), refresh(), destroy() }`, `idleMs`
   * (1000), `maxCostMs` (3000, dearer configurations are not pre-generated), `limitMs` (8000, a longer job is
   * abandoned), `poolTarget` (2), `pregen` (true).
   */
  function createController(options) {
    const o = options || {};
    const app = o.app;
    if (!app || typeof app.on !== 'function') throw new TypeError('SG.cache: an app is required');
    const cache = o.store || sharedStore();
    const inner = o.inner || (typeof app.getClient === 'function' ? app.getClient() : null) ||
      SG.workerClient;
    if (!inner || typeof inner.generate !== 'function') throw new TypeError('SG.cache: no generation client');
    const makeBackground = typeof o.createClient === 'function' ? o.createClient
      : (SG.workerClient && typeof SG.workerClient.create === 'function'
        ? function () { return SG.workerClient.create({}); } : null);
    const timers = o.timers || {
      set: function (fn, ms) { return root.setTimeout(fn, ms); },
      clear: function (handle) { root.clearTimeout(handle); }
    };
    const now = typeof o.now === 'function' ? o.now : function () { return Date.now(); };
    const isHidden = typeof o.isHidden === 'function' ? o.isHidden : documentHidden;
    const visibility = typeof o.watchVisibility === 'function' ? o.watchVisibility : watchVisibility;
    const activity = typeof o.watchActivity === 'function' ? o.watchActivity : watchActivity;
    const random = typeof o.random === 'function' ? o.random : function () { return SG.rng.randomSeed(); };
    const note = o.note || createNote();
    const idleMs = typeof o.idleMs === 'number' ? o.idleMs : IDLE_MS;
    const maxCostMs = typeof o.maxCostMs === 'number' ? o.maxCostMs : MAX_PREGEN_COST_MS;
    const limitMs = typeof o.limitMs === 'number' ? o.limitMs : PREGEN_LIMIT_MS;
    const poolTarget = positiveInt(o.poolTarget, POOL_PER_CONFIG);

    let enabled = o.pregen !== false;
    let armed = false;
    let running = 0;
    let hidden = false;
    let destroyed = false;
    let started = false;
    let lastActivity = 0;
    let idleTimer = null;
    let workerTimer = null;
    let background = null;
    let verified = null;
    let verifying = false;
    let job = null;
    let served = null;
    const blocked = new Set();
    const subscriptions = [];

    function attempt(fn) {
      try {
        return fn();
      } catch (err) {
        return undefined;
      }
    }

    function innerMode() {
      return attempt(function () { return inner.mode; });
    }

    function defer(fn) {
      timers.set(function () { if (!destroyed) attempt(fn); }, 0);
    }

    function clearWorkerTimer() {
      if (workerTimer !== null) {
        timers.clear(workerTimer);
        workerTimer = null;
      }
    }

    function disposeBackground() {
      clearWorkerTimer();
      const bg = background;
      background = null;
      verified = null;
      verifying = false;
      if (bg !== null && typeof bg.dispose === 'function') attempt(function () { bg.dispose(); });
    }

    /** Frees the worker of the background client after a while without a job. */
    function armWorkerTimer() {
      clearWorkerTimer();
      if (background === null) return;
      workerTimer = timers.set(function () {
        workerTimer = null;
        if (job === null) disposeBackground();
      }, WORKER_IDLE_MS);
    }

    function backgroundClient() {
      clearWorkerTimer();
      if (background === null && makeBackground !== null) background = attempt(makeBackground) || null;
      return background;
    }

    function cancelJob() {
      const current = job;
      job = null;
      if (current === null) return;
      if (current.timer !== null) timers.clear(current.timer);
      if (current.client !== null) attempt(function () { current.client.cancel(); });
    }

    function clearIdle() {
      if (idleTimer !== null) {
        timers.clear(idleTimer);
        idleTimer = null;
      }
    }

    function pregenAllowed() {
      return enabled && armed && !destroyed && running === 0 && job === null && !hidden;
    }

    function desiredConfig() {
      const store = attempt(function () { return app.getStore(); });
      if (!store) return null;
      return attempt(function () {
        const config = SG.store.toConfig(store.get());
        delete config.seed;
        config.trace = 'off';
        return config;
      }) || null;
    }

    /** What a pre-generation would produce now, or null when nothing should be pre-generated. */
    function pregenPlan() {
      if (!pregenAllowed() || innerMode() !== 'worker') return null;
      const config = desiredConfig();
      const info = config === null ? null : keyInfo(config);
      if (info === null || blocked.has(info.cfg) || estimateCost(info.norm) > maxCostMs) return null;
      const pooled = cache.list(function (e) { return e.pool && e.cfg === info.cfg; }).length;
      return pooled >= poolTarget ? null : { config: config, info: info };
    }

    /**
     * Finds out whether the background client really runs in a worker (the worker is booted while the page
     * is quiet, so that the job can start at once). Main-thread mode switches pre-generation off.
     */
    function verifyBackground(client) {
      if (verified !== null || verifying) return;
      verifying = true;
      function settle(ok) {
        verifying = false;
        if (client !== background) return;
        verified = ok;
        armWorkerTimer();
        if (ok) scheduleIdle();
        else enabled = false;
      }
      let ready;
      try {
        ready = typeof client.ready === 'function' ? client.ready() : client.mode;
      } catch (err) {
        settle(false);
        return;
      }
      Promise.resolve(ready).then(function (mode) { settle(mode === 'worker'); },
        function () { settle(false); });
    }

    function scheduleIdle() {
      clearIdle();
      if (pregenPlan() === null) return;
      const client = backgroundClient();
      if (client !== null) verifyBackground(client);
      idleTimer = timers.set(onIdle, idleMs);
    }

    function onIdle() {
      idleTimer = null;
      const quiet = now() - lastActivity;
      if (quiet < idleMs) {
        if (pregenPlan() !== null) idleTimer = timers.set(onIdle, idleMs - quiet);
        return;
      }
      const plan = pregenPlan();
      if (plan === null) return;
      const client = backgroundClient();
      if (client === null) return;
      if (verified !== true) {
        verifyBackground(client);
        return;
      }
      const mine = { kind: 'pregen', cfg: plan.info.cfg, client: client, timer: null };
      job = mine;
      runPregen(mine, plan.config);
    }

    function finishPregen(mine, result) {
      if (job !== mine) return;
      job = null;
      if (mine.timer !== null) timers.clear(mine.timer);
      if (result !== null) putResult(cache, result, true);
      else blocked.add(mine.cfg);
      armWorkerTimer();
      scheduleIdle();
    }

    function runPregen(mine, config) {
      const seeded = Object.assign({}, config, { seed: random() >>> 0, trace: 'off' });
      mine.timer = timers.set(function () {
        mine.timer = null;
        if (job !== mine) return;
        blocked.add(mine.cfg);
        cancelJob();
        armWorkerTimer();
        scheduleIdle();
      }, limitMs);
      let promise;
      try {
        promise = mine.client.generate(seeded, null);
      } catch (err) {
        promise = Promise.reject(err);
      }
      promise.then(function (result) { finishPregen(mine, result); },
        function () { finishPregen(mine, null); });
    }

    function foregroundStarted() {
      clearIdle();
      cancelJob();
      served = null;
      note.hide();
    }

    function syncSeed(seed) {
      attempt(function () {
        const store = app.getStore();
        if (store && String(store.get().seed) !== String(seed)) {
          store.set({ seed: String(seed) }, { source: 'cache' });
        }
      });
    }

    function lookup(info, trace) {
      const entry = cache.get(info.key);
      if (entry === null) return null;
      const result = entryResult(cache, entry, trace);
      if (result !== null && entry.pool) cache.setPool(info.key, false);
      return result;
    }

    /** A pre-generated puzzle of the same configuration, or null. */
    function takeFromPool(info, trace) {
      const entries = cache.list(function (e) { return e.pool && e.cfg === info.cfg; });
      for (let i = 0; i < entries.length; i++) {
        const result = entryResult(cache, entries[i], trace);
        if (result !== null) {
          cache.setPool(entries[i].key, false);
          return result;
        }
      }
      return null;
    }

    function serve(config, hints) {
      if (makeBackground === null) return null;
      const info = keyInfo(config);
      if (info === null) return null;
      const anySeed = !info.hasSeed || Boolean(hints && hints.random === true);
      const result = anySeed ? takeFromPool(info, info.norm.trace) : lookup(info, info.norm.trace);
      if (result === null) return null;
      result.fromCache = true;
      if (info.hasSeed && anySeed) syncSeed(result.seed);
      served = { result: result, trace: info.norm.trace, key: info.key };
      return result;
    }

    function generate(config, onEvent, hints) {
      foregroundStarted();
      running++;
      const hit = attempt(function () { return serve(config, hints); });
      if (hit) {
        running--;
        return Promise.resolve(hit);
      }
      let promise;
      try {
        promise = inner.generate(config, onEvent, hints);
      } catch (err) {
        promise = Promise.reject(err);
      }
      return promise.then(function (result) {
        running--;
        defer(function () { putResult(cache, result, false); });
        return result;
      }, function (err) {
        running--;
        throw err;
      });
    }

    function cancel() {
      return typeof inner.cancel === 'function' ? inner.cancel() : false;
    }

    function overrides(config) {
      return {
        variantId: config.variantId,
        difficulty: config.difficulty,
        seed: String(config.seed),
        symbolMode: config.symbolMode,
        symmetry: config.symmetry,
        digOrder: config.digOrder,
        maxAttempts: config.maxAttempts,
        variantOptions: config.variantOptions
      };
    }

    function finishTrace(s, fresh, trace) {
      const shown = attempt(function () { return app.getResult(); });
      if (!shown || shown.result !== s.result) {
        note.hide();
        return;
      }
      if (!sameResult(fresh, s.result)) {
        cache.remove(s.key);
        note.hide();
        attempt(function () { app.toast('warning', 'cache.stale'); });
        const again = attempt(function () { return app.generate(overrides(s.result.config)); });
        if (again && typeof again.catch === 'function') again.catch(noop);
        return;
      }
      const attached = attempt(function () { return app.attachTrace(trace, fresh.digLog); }) === true;
      if (attached) {
        note.hide();
        attempt(function () { app.announce(SG.i18n.t('cache.ready')); });
      } else {
        note.show('cache.failed');
      }
    }

    function startTrace(s) {
      const client = backgroundClient();
      if (client === null) return;
      cancelJob();
      clearIdle();
      const mine = { kind: 'trace', cfg: null, client: client, timer: null };
      job = mine;
      note.show('cache.preparing');
      const buffer = SG.events.createTraceBuffer();
      const config = Object.assign({}, s.result.config, { trace: s.trace });
      let promise;
      try {
        promise = client.generate(config, function (event) { if (job === mine) buffer.push(event); });
      } catch (err) {
        promise = Promise.reject(err);
      }
      promise.then(function (fresh) {
        if (job !== mine) return;
        job = null;
        armWorkerTimer();
        if (served === s) attempt(function () { finishTrace(s, fresh, buffer.events()); });
        else note.hide();
        scheduleIdle();
      }, function () {
        if (job !== mine) return;
        job = null;
        armWorkerTimer();
        if (served === s) note.show('cache.failed');
        scheduleIdle();
      });
    }

    function drawServed() {
      const board = attempt(function () { return app.getBoard(); });
      const shown = attempt(function () { return app.getResult(); });
      if (!board || !shown) return;
      attempt(function () {
        const givens = Int32Array.from(shown.result.givens);
        // The player of an empty trace shows no layers (cages, signs, outlines) and an empty grid.
        if (typeof board.setLayerVisible === 'function' && SG.player && SG.player.LAYER_NAMES) {
          SG.player.LAYER_NAMES.forEach(function (name) { board.setLayerVisible(name, true); });
        }
        board.setValues(givens);
        board.setGivens(givens);
        if (typeof board.refreshText === 'function') board.refreshText();
      });
    }

    /** Something other than the served puzzle is on screen: the regeneration is of no use any more. */
    function forget() {
      if (job !== null && job.kind === 'trace') cancelJob();
      served = null;
      note.hide();
    }

    function onResult(payload) {
      const result = payload && payload.result;
      if (!result) return;
      if (payload.imported === true) {
        // An imported puzzle was not generated here: it has no cache entry, maybe no seed or configuration
        // to regenerate from, and is no reason to pre-generate anything (until something is generated).
        forget();
        armed = false;
        clearIdle();
        if (job !== null && job.kind === 'pregen') cancelJob();
        return;
      }
      if (result.fromCache !== true || served === null || served.result !== result) {
        forget();
        return;
      }
      drawServed();
      startTrace(served);
    }

    function touch() {
      lastActivity = now();
    }

    function onSettings(payload) {
      touch();
      const keys = payload && payload.keys ? payload.keys : [];
      if (job !== null && job.kind === 'pregen' &&
          keys.some(function (k) { return CONFIG_STATE_KEYS.indexOf(k) !== -1; })) {
        cancelJob();
      }
      scheduleIdle();
    }

    function setHidden(flag) {
      hidden = Boolean(flag);
      if (hidden) {
        clearIdle();
        if (job !== null && job.kind === 'pregen') cancelJob();
      } else {
        touch();
        scheduleIdle();
      }
    }

    function start() {
      if (started || destroyed) return;
      started = true;
      hidden = Boolean(attempt(isHidden));
      touch();
      subscriptions.push(
        app.on('result', onResult),
        app.on('settings', onSettings),
        app.on('generate:end', function () {
          armed = true;
          touch();
          scheduleIdle();
        }),
        app.on('generate:error', function () { scheduleIdle(); }),
        app.on('generate:cancel', function () { scheduleIdle(); }),
        app.on('locale', function () { note.refresh(); }),
        visibility(setHidden),
        activity(touch)
      );
      if (typeof app.setClient === 'function') app.setClient(client);
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      clearIdle();
      cancelJob();
      subscriptions.splice(0).forEach(function (off) { if (typeof off === 'function') attempt(off); });
      disposeBackground();
      note.destroy();
      if (typeof app.getClient === 'function' && typeof app.setClient === 'function' &&
          app.getClient() === client) {
        app.setClient(inner);
      }
    }

    function setEnabled(on) {
      enabled = Boolean(on);
      if (!enabled) {
        clearIdle();
        if (job !== null && job.kind === 'pregen') cancelJob();
      } else {
        scheduleIdle();
      }
    }

    const client = {
      generate: generate,
      cancel: cancel,
      replay: function replay(result, options) {
        if (typeof inner.replay !== 'function') {
          return Promise.reject(new SG.errors.GenerationError('unexpected', { message: 'replay' }));
        }
        return inner.replay(result, options);
      },
      cancelReplay: function cancelReplay() {
        return typeof inner.cancelReplay === 'function' ? inner.cancelReplay() : false;
      },
      ready: function ready() {
        return typeof inner.ready === 'function' ? inner.ready() : Promise.resolve(innerMode());
      },
      get mode() { return innerMode(); },
      get inner() { return inner; }
    };

    return {
      client: client,
      start: start,
      destroy: destroy,
      setEnabled: setEnabled,
      isEnabled: function isEnabled() { return enabled; },
      state: function state() {
        return {
          enabled: enabled,
          armed: armed,
          hidden: hidden,
          running: running,
          job: job === null ? null : job.kind,
          idleTimer: idleTimer !== null,
          blocked: Array.from(blocked)
        };
      }
    };
  }

  let controller = null;
  let controllerApp = null;
  let enabledPreference = true;

  /** Idempotent; false when `app` cannot take a wrapper client (no `setClient`) or has no client. */
  function init(app) {
    if (controller !== null && controllerApp === app) {
      // An app that was destroyed and started again has forgotten the wrapper.
      if (typeof app.getClient === 'function' && app.getClient() !== controller.client) {
        app.setClient(controller.client);
      }
      return true;
    }
    if (!app || typeof app.setClient !== 'function') return false;
    if (controller !== null) controller.destroy();
    try {
      controller = createController({ app: app, pregen: enabledPreference });
      controllerApp = app;
      controller.start();
      return true;
    } catch (err) {
      controller = null;
      controllerApp = null;
      return false;
    }
  }

  function setEnabled(on) {
    enabledPreference = Boolean(on);
    if (controller !== null) controller.setEnabled(enabledPreference);
  }

  /** Hands the original client back (tests, hot reloads). */
  function destroy() {
    if (controller !== null) controller.destroy();
    controller = null;
    controllerApp = null;
  }

  function stats() {
    const out = sharedStore().stats();
    out.enabled = enabledPreference;
    out.pregen = controller === null ? null : controller.state();
    return out;
  }

  SG.cache = {
    VERSION: SCHEMA_VERSION,
    STORAGE_KEY: STORAGE_KEY,
    LIMIT: LIMIT,
    COSTS: COSTS,
    init: init,
    destroy: destroy,
    configKey: configKey,
    estimateCost: estimateCost,
    serialize: serialize,
    deserialize: deserialize,
    createStore: createStore,
    createController: createController,
    get: function get(key, opts) {
      const store = sharedStore();
      const entry = store.get(key);
      return entry === null ? null : entryResult(store, entry, opts ? opts.trace : undefined);
    },
    put: function put(result, opts) { return putResult(sharedStore(), result, Boolean(opts && opts.pool)); },
    has: function has(key) { return sharedStore().list(function (e) { return e.key === key; }).length > 0; },
    remove: function remove(key) { return sharedStore().remove(key); },
    clear: function clear() { sharedStore().clear(); },
    stats: stats,
    setEnabled: setEnabled,
    isEnabled: function isEnabled() { return enabledPreference; }
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'cache.preparing': 'Loaded from the cache. Preparing the step-by-step replay\u2026',
      'cache.ready': 'The step-by-step replay is ready.',
      'cache.failed': 'The replay could not be prepared. Press Generate to create the puzzle again with ' +
        'its steps.',
      'cache.stale': 'The saved copy of this puzzle was out of date, so it was generated again.'
    },
    vi: {
      'cache.preparing': 'Đề được lấy từ bộ nhớ đệm. Đang chuẩn bị phần phát lại từng bước\u2026',
      'cache.ready': 'Phần phát lại từng bước đã sẵn sàng.',
      'cache.failed': 'Không chuẩn bị được phần phát lại. Bấm Tạo đề để tạo lại đề cùng các bước của nó.',
      'cache.stale': 'Bản đã lưu của đề này đã cũ nên đề được tạo lại.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
