/**
 * Puzzle cache and background pre-generation (task T-6.3; design.md 3.3, 9.3, 9.4 and 14.3): `SG.cache`.
 *
 * What it does
 *  - RESULT CACHE. Every puzzle that is generated is stored in `localStorage` (key `sg.cache.v1`, at most 20
 *    puzzles, least recently used first out, schema version checked). Asking for the same configuration with
 *    the same seed again is served from it at once (a few milliseconds, no worker), because a generation is
 *    deterministic: the cached puzzle is the one a new run would produce.
 *  - REPLAY. The cache stores the puzzle only, never the trace nor the dig log (the replay data). A puzzle
 *    served from the cache is therefore shown first, with the steps panel and the replay controls idle and a
 *    small note "preparing the replay", while it is regenerated from the seed in the background (an
 *    independent client; the same worker the pre-generator uses). The regenerated puzzle must equal the
 *    cached one (givens, solution, rating); if it does not, the cache entry is dropped and the puzzle is
 *    generated again. When the regeneration is done its trace and dig log go to the app
 *    (`SG.app.attachTrace(trace, digLog)`), so the steps panel, the explanation card and the replay controls
 *    work as after a normal run, showing the finished puzzle.
 *    Generating anything else meanwhile cancels the regeneration; nothing of it can reach the new run (it is
 *    guarded by an identity check).
 *  - POOL. After a puzzle is shown and the page has been quiet for a moment (1 s: no generation, no change of
 *    the form, no key or pointer press, tab visible), the cache quietly pre-generates one or two puzzles with
 *    the SAME configuration and random seeds in a Web Worker. They are marked `pool` in the same store (at
 *    most 2 per configuration, 4 in all) and are what "Generate" with an empty seed field, and "Regenerate",
 *    hand out instantly. Handing one out turns it into an ordinary cached puzzle. An explicit seed is never
 *    answered from the pool. The pre-generator never runs while a generation is in progress, is cancelled at
 *    once when the user generates or changes the configuration, pauses while the tab is hidden, runs only one
 *    job at a time, and gives up on a job that takes too long (a cost table skips the configurations that are
 *    known to be slow). It does NOT exist in main-thread mode (`file://`, no Worker): slices on the UI thread
 *    would compete with the user. Serving from the cache and regenerating traces still work there.
 *
 * How it plugs in: `SG.cache.init(SG.app)` (called by app.js at start-up) replaces the generation client of
 * the app with a wrapper (`SG.app.setClient`) that has the same interface (`generate(config, onEvent,
 * hints)`, `cancel()`, `mode`, `ready()`), and listens to the events of the app. A cached result is flagged
 * `result.fromCache = true` (plain data; the wire format, exports and share links ignore it).
 * A puzzle that `SG.app.showResult` puts on screen (an import: the 'result' event with `imported: true`, no
 * 'generate:end') is ignored: it is never cached, never gets a trace regeneration, and it disarms the
 * pre-generator until the next generation; it may have no seed or configuration at all.
 *
 * Storage rules (design.md 14.3): every access is wrapped in try/catch; a blocked or missing `localStorage`
 * (a getter that throws, Safari private mode) means an in-memory LRU for the session; a `QuotaExceededError`
 * evicts least recently used entries and retries, and finally keeps the entries in memory only; a corrupt
 * item or another schema version is purged. Every change re-reads the stored list first, so several tabs can
 * share it. Nothing here throws into the application or writes to the console.
 *
 * Public API (`SG.cache`)
 *   init(app) -> boolean              Starts the wrapper for `app` (idempotent; false when `app` has no
 *                                     `setClient`).
 *   configKey(config) -> ?string      The normalised key of a configuration (`trace` ignored, option order
 *                                     ignored). A config without a seed gives a key with `*` for the seed
 *                                     (the key of the pool); null for an invalid configuration.
 *   get(key, { trace? }) -> ?PuzzleResult   A cached puzzle (touches the LRU order); `trace` re-applies the
 *                                     trace verbosity of the request (see `deserialize`). A corrupt entry is
 *                                     dropped and null returned.
 *   put(result, { pool? }) -> boolean Stores a puzzle (`pool: true` marks it as pre-generated).
 *   remove(key) / has(key)            Delete / test an entry.
 *   clear()                           Empties the cache (storage and memory).
 *   stats() -> { count, pool, limit, version, persistent, dirty, bytes, enabled, pregen }.
 *   setEnabled(on) / isEnabled()      The pre-generation preference (the cache itself always works). Not
 *                                     persisted: `SG.store` has no generic preference facility.
 *   createStore({ storage, now, version, limit, key, poolPerConfig, poolTotal }) -> LRU store (injectable
 *                                     storage and clock, for tests).
 *   createController({ app, store, inner, createClient, timers, now, ... }) -> controller (the wrapper and
 *                                     the schedulers with everything injectable, for tests).
 *   serialize(result) -> Object       JSON-safe copy of a PuzzleResult (typed arrays become `{ $t, d }`).
 *   deserialize(data, { trace? }) -> PuzzleResult   The inverse; the model is rebuilt (and checked, lazy
 *                                     extensions of Killer / Greater-Than switched on). Throws
 *                                     `SG.errors.GenerationError('unexpected')` for data that is not a valid
 *                                     puzzle.
 *   estimateCost(config) -> number    Milliseconds a generation is expected to take (Infinity: unknown).
 *   VERSION, STORAGE_KEY, LIMIT       Schema version, storage key, size of the LRU.
 *
 * The file loads in Node without a DOM; the DOM and `localStorage` are only touched inside functions.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads: the running application holds it.
  if (SG.cache && typeof SG.cache.createStore === 'function') return;

  /** Schema version of the stored list. Changing it purges every older cache. */
  const SCHEMA_VERSION = 1;
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

  /** The configuration keys of the store state that decide which puzzle a pool entry is. */
  const CONFIG_STATE_KEYS = Object.freeze(['variantId', 'difficulty', 'symbolMode', 'symmetry', 'digOrder',
    'maxAttempts', 'variantOptions']);

  /**
   * Expected generation time in milliseconds per variant and level (the worst of several seeds measured in
   * Node with `trace: 'off'`, with a margin for slow tails). A configuration above `MAX_PREGEN_COST_MS` is
   * not pre-generated. A level that is not listed is unknown (Infinity): not pre-generated either.
   */
  const COSTS = Object.freeze({
    classic4: { veryEasy: 20, easy: 20 },
    classic6: { veryEasy: 20, easy: 20, medium: 60 },
    classic9: { veryEasy: 20, easy: 20, medium: 150, hard: 120, expert: 80, evil: 80 },
    mega12: { veryEasy: 20, easy: 20, medium: 80, hard: 120 },
    mega16: { veryEasy: 30, easy: 50, medium: 200, hard: 400 },
    diagonalX: { veryEasy: 10, easy: 10, medium: 80, hard: 60, expert: 80, evil: 100 },
    hyper: { veryEasy: 10, easy: 10, medium: 80, hard: 60, expert: 60, evil: 60 },
    jigsaw9: { veryEasy: 100, easy: 100, medium: 100, hard: 100, expert: 100, evil: 120 },
    killer: { veryEasy: 30, easy: 40, medium: 80, hard: 1000, expert: 2500 },
    greaterThan: { veryEasy: 80, easy: 80, medium: 150, hard: 800, expert: 2000 },
    samurai: { veryEasy: 80, easy: 40, medium: 600, hard: 700 },
    sohei: { veryEasy: 20, easy: 20, medium: 150, hard: 400 },
    butterfly: { veryEasy: 10, easy: 10, medium: 150, hard: 350 },
    flower: { veryEasy: 15, easy: 15, medium: 200, hard: 400 },
    wordoku: { veryEasy: 10, easy: 10, medium: 60, hard: 100, expert: 60 }
  });

  // ---------------------------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------------------------
  // Configuration keys
  // ---------------------------------------------------------------------------------------------

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

  /**
   * The key of a configuration: variant, level, seed, symbol set, symmetry, dig order, attempts and variant
   * options, normalised like the pipeline does. The trace verbosity is not part of it (it does not change the
   * puzzle), and neither is the order of the variant options.
   * @param {Object} config  A `GenerateConfig`.
   * @returns {?string} null for an invalid configuration; a missing seed shows as `*`.
   */
  function configKey(config) {
    const info = keyInfo(config);
    return info === null ? null : info.key;
  }

  /**
   * Expected generation time of a configuration.
   * @param {Object} config  A `GenerateConfig` (or the normalised form of one).
   * @returns {number} Milliseconds; Infinity when the variant or the level is not in the cost table.
   */
  function estimateCost(config) {
    const levels = config && Object.prototype.hasOwnProperty.call(COSTS, config.variantId)
      ? COSTS[config.variantId] : null;
    if (levels === null || !Object.prototype.hasOwnProperty.call(levels, config.difficulty)) return Infinity;
    return levels[config.difficulty];
  }

  // ---------------------------------------------------------------------------------------------
  // Serialisation of a PuzzleResult
  // ---------------------------------------------------------------------------------------------

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
   * A PuzzleResult as JSON-safe data (the wire format of `SG.pipeline.toWire`, with typed arrays wrapped),
   * plus a checksum. Fields that are not part of a PuzzleResult (for example `fromCache`) are not stored, nor
   * is the dig log: like the trace it only serves the replay, which a served puzzle gets back from the
   * background regeneration (see "REPLAY" above).
   * @param {PuzzleResult} result
   * @returns {Object}
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
   * Rebuilds a PuzzleResult from `serialize` data (or its JSON text) and checks it: the model is valid and
   * solved by the solution, the givens are part of the solution, the checksum matches. For Killer and
   * Greater-Than the lazy propagation extensions are switched on (`SG.pipeline.fromWire`).
   * @param {(Object|string)} data
   * @param {{trace?: string}} [options]  `trace`: the verbosity of the request; `config.trace` and the
   *        'trace.downgraded' warning are made to match what a run with it would give (see `retrace`).
   * @returns {PuzzleResult}
   * @throws {SG.errors.GenerationError} 'unexpected' for data that is not a valid puzzle.
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

  /** Whether two results are the same puzzle with the same rating. */
  function sameResult(a, b) {
    if (!a || !b || a.givens.length !== b.givens.length || a.solution.length !== b.solution.length) {
      return false;
    }
    for (let i = 0; i < a.givens.length; i++) {
      if (a.givens[i] !== b.givens[i] || a.solution[i] !== b.solution[i]) return false;
    }
    return a.rating.level === b.rating.level && a.rating.score === b.rating.score;
  }

  // ---------------------------------------------------------------------------------------------
  // The LRU store
  // ---------------------------------------------------------------------------------------------

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
   * An LRU list of puzzles, persisted as `{ version, entries }` under one storage key. The newest entry is
   * first. Entries are immutable objects (a change makes a new one). Every operation re-reads the stored list
   * first (another tab may have changed it); when the storage cannot be used the list lives in memory.
   * Nothing throws.
   * @param {Object} [options]
   * @param {?Object} [options.storage]  `localStorage`-like; null: memory only. Default: `localStorage`
   *        (guarded: a getter that throws means memory only).
   * @param {function(): number} [options.now]  Clock in ms (default `Date.now`).
   * @param {*} [options.version]  Schema version (default `SCHEMA_VERSION`); a stored list of another version
   *        is purged.
   * @param {number} [options.limit=20]  Entries kept.
   * @param {string} [options.key]  Storage key (default `sg.cache.v1`).
   * @param {number} [options.poolPerConfig=2]  Pre-generated entries kept per configuration.
   * @param {number} [options.poolTotal=4]  Pre-generated entries kept in all.
   * @returns {{list: function(function(CacheEntry): boolean=): CacheEntry[], get: function(string,
   *   Object=): ?CacheEntry, put: function(Object): boolean, setPool: function(string, boolean): boolean,
   *   remove: function(string): boolean, clear: function(): void, stats: function(): Object}}
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
      /** The entries, newest first, optionally filtered. */
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
       * Stores an entry as the most recently used one. An entry that exists and is not in the pool stays out
       * of it.
       * @param {{key: string, cfg: string, data: Object, pool?: boolean}} entry
       * @returns {boolean} Whether it was accepted.
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

      /** `{ count, pool, limit, version, persistent, dirty, bytes }`. */
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

  /** The store of the page, created on first use. */
  function sharedStore() {
    if (shared === null) shared = createStore({});
    return shared;
  }

  // ---------------------------------------------------------------------------------------------
  // Store + results
  // ---------------------------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------------------------
  // The note "preparing the replay"
  // ---------------------------------------------------------------------------------------------

  /** A one-line note under the replay controls (`#cache-note`); a no-op without a DOM. */
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

  /** Subscribes to visibility changes of the tab; returns the unsubscribe function. */
  function watchVisibility(fn) {
    if (typeof document === 'undefined') return noop;
    const listener = function () { fn(documentHidden()); };
    document.addEventListener('visibilitychange', listener);
    return function () { document.removeEventListener('visibilitychange', listener); };
  }

  /** Subscribes to key and pointer presses (the user is not idle); returns the unsubscribe function. */
  function watchActivity(fn) {
    if (typeof document === 'undefined') return noop;
    const names = ['keydown', 'pointerdown'];
    const listener = function () { fn(); };
    names.forEach(function (name) { document.addEventListener(name, listener, true); });
    return function () {
      names.forEach(function (name) { document.removeEventListener(name, listener, true); });
    };
  }

  // ---------------------------------------------------------------------------------------------
  // The controller: the client wrapper, the trace regeneration and the pre-generator
  // ---------------------------------------------------------------------------------------------

  /**
   * Builds the wrapper client and the schedulers around it. Everything outside is injectable.
   * @param {Object} options
   * @param {Object} options.app  `SG.app` (or a stand-in): `on`, `getStore`, `getResult`, `getBoard`,
   *        `attachTrace`, `generate`, `toast`, `announce`, `getClient`, `setClient`.
   * @param {Object} [options.store]  The LRU store (default the shared one).
   * @param {Object} [options.inner]  The client to wrap (default `app.getClient()`, else `SG.workerClient`).
   * @param {function(): Object} [options.createClient]  Makes the independent background client (default
   *        `SG.workerClient.create()`); without one nothing is served from the cache.
   * @param {{set: function, clear: function}} [options.timers]  `set(fn, ms) -> handle` / `clear(handle)`.
   * @param {function(): number} [options.now]  Clock in ms (shared with `timers` in tests).
   * @param {function(): boolean} [options.isHidden]
   * @param {function(function): function} [options.watchVisibility]  `(fn(hidden)) -> unsubscribe`.
   * @param {function(function): function} [options.watchActivity]  `(fn()) -> unsubscribe`.
   * @param {function(): number} [options.random]  A random uint32 (seeds of the pool).
   * @param {Object} [options.note]  `{ show(key), hide(), refresh(), destroy() }`.
   * @param {number} [options.idleMs=1000]  Quiet time before a pre-generation starts.
   * @param {number} [options.maxCostMs=3000]  Configurations that cost more are not pre-generated.
   * @param {number} [options.limitMs=8000]  A pre-generation job that runs longer is abandoned.
   * @param {number} [options.poolTarget=2]  Pre-generated puzzles to keep per configuration.
   * @param {boolean} [options.pregen=true]  The pre-generation preference.
   * @returns {{client: Object, start: function, destroy: function, setEnabled: function, isEnabled:
   *   function, state: function}}
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

    // -- background client ------------------------------------------------------------------------

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

    // -- pre-generation -----------------------------------------------------------------------------

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

    // -- the foreground ---------------------------------------------------------------------------

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

    /** The cached puzzle with this exact key, or null. */
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

    // -- the trace of a served puzzle -------------------------------------------------------------

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

    // -- events of the app --------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------------------------
  // The shared instance
  // ---------------------------------------------------------------------------------------------

  let controller = null;
  let controllerApp = null;
  let enabledPreference = true;

  /**
   * Starts the cache for the application (see the file header). Idempotent.
   * @param {Object} app  `SG.app`.
   * @returns {boolean} False when `app` cannot take a wrapper client (no `setClient`) or has no client.
   */
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

  /** Stops the cache for the application and hands the original client back (for tests and hot reloads). */
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
    POOL_PER_CONFIG: POOL_PER_CONFIG,
    POOL_TOTAL: POOL_TOTAL,
    IDLE_MS: IDLE_MS,
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

  // ---------------------------------------------------------------------------------------------
  // Strings
  // ---------------------------------------------------------------------------------------------

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
