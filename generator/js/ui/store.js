/**
 * Application state (design.md 10.4, 14.2, 14.3): `SG.store`.
 *
 * Two layers:
 *  - PURE functions (no DOM, no storage): `defaults`, `sanitize`, `parseUrl`, `toUrlParams`,
 *    `toSearchString`, `toConfig`, `seedInfo`, ... They are what the tests and the controls rely on.
 *  - `create({ storage, location, history, navigator })`: a stateful store with `get / set / subscribe /
 *    load / save / syncUrl / newSeed / reset`. Everything it touches is injected, so it runs in Node; the
 *    shared browser instance is `SG.store.instance()`.
 *
 * The state is plain data (frozen when read):
 *   puzzle configuration   variantId, difficulty, seed (text, '' = random), symmetry, symbolMode, digOrder,
 *                          maxAttempts (1..20), showSolution,
 *                          variantOptions ({ optionId: value }, always complete for the variant)
 *   session                auto (URL only: generate on load)
 *   preferences            lang, theme ('auto'|'light'|'dark'|'high-contrast'), fontSize
 *                          ('small'|'normal'|'large'), reducedMotion, colorAuxSymbol
 * There is no trace verbosity and no replay speed: the replay is built from the dig log of the result and
 * moved by hand, so `toConfig` leaves `trace` out and the pipeline applies its default ('summary').
 * The store never touches the DOM: `data-theme` and friends are applied by theme.js / app.js.
 * Changing the state never triggers a generation.
 *
 * URL (design.md 14.2): `v d seed sym mode lang auto`, plus `order attempts sol` and the options of the
 * variant as `o.<optionId>`. Only values that differ from the defaults are written, except for share links
 * (`toSearchString(state, { full: true })`) which always carry `v d sym mode`. Same link => same puzzle.
 * Any other parameter is ignored and left out of the canonical URL, `trace` and `speed` of older links
 * included; the `trace` / `speed` fields that an older version stored are ignored the same way.
 *
 * Seeds: the state keeps the seed as the text the user typed. A decimal integer in 0..4294967295 is used as
 * it is; anything else (letters, a negative number, a number beyond uint32) is HASHED to a uint32 with
 * FNV-1a 32 bit over the UTF-16 code units of the NFC-normalised, trimmed text (the hash `SG.rng` itself
 * uses to derive its child streams). A blank seed means "random" (`config.seed` is left out).
 *
 * Storage (design.md 14.3): `sg.prefs.v1` (preferences) and `sg.lastConfig.v1` (the last configuration).
 * Every access is wrapped in try/catch; when the storage is missing or blocked the values live in memory.
 * Priority at start-up (`load`): URL > stored values > defaults; when the URL carries any puzzle parameter,
 * the URL is the whole puzzle configuration and the stored configuration is ignored (a shared link must not
 * be bent by the receiver's last settings).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first definition on repeated loads: the shared instance must survive.
  if (SG.store && typeof SG.store.create === 'function') return;

  const PREFS_KEY = 'sg.prefs.v1';
  const LAST_CONFIG_KEY = 'sg.lastConfig.v1';
  const STORAGE_VERSION = 1;

  const DEFAULT_VARIANT = 'classic9';
  const DEFAULT_DIFFICULTY = 'medium';
  const MAX_ATTEMPTS = Object.freeze({ min: 1, max: 20, default: 8 });
  const SEED_MAX_LENGTH = 64;
  const UINT32_MAX = 4294967295;

  const LANGS = Object.freeze(['en', 'vi']);
  const THEMES = Object.freeze(['auto', 'light', 'dark', 'high-contrast']);
  const FONT_SIZES = Object.freeze(['small', 'normal', 'large']);

  const CONFIG_KEYS = Object.freeze(['variantId', 'difficulty', 'seed', 'symmetry', 'symbolMode', 'digOrder',
    'maxAttempts', 'showSolution', 'variantOptions']);
  const PREF_KEYS = Object.freeze(['lang', 'theme', 'fontSize', 'reducedMotion', 'colorAuxSymbol']);
  const STATE_KEYS = Object.freeze(CONFIG_KEYS.concat(['auto'], PREF_KEYS));

  const hasOwn = Object.prototype.hasOwnProperty;

  // ---------------------------------------------------------------------------------------------
  // Small value helpers
  // ---------------------------------------------------------------------------------------------

  function isPlainObject(x) {
    return x !== null && typeof x === 'object' && !Array.isArray(x);
  }

  function oneOf(value, list, fallback) {
    return typeof value === 'string' && list.indexOf(value) !== -1 ? value : fallback;
  }

  function toBool(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
    if (typeof value === 'string') {
      const text = value.trim().toLowerCase();
      if (text === 'true' || text === '1' || text === 'on' || text === 'yes') return true;
      if (text === 'false' || text === '0' || text === 'off' || text === 'no' || text === '') return false;
    }
    return fallback;
  }

  function toIntInRange(value, min, max, fallback) {
    let n = value;
    if (typeof n === 'string' && n.trim() !== '') n = Number(n);
    if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function normalizeLang(code) {
    if (SG.i18n && typeof SG.i18n.normalize === 'function') return SG.i18n.normalize(code);
    if (typeof code !== 'string') return null;
    const base = code.trim().toLowerCase().split(/[-_]/)[0];
    return LANGS.indexOf(base) === -1 ? null : base;
  }

  function levels() {
    return SG.difficulty.LEVELS;
  }

  function defaultVariantId() {
    if (SG.variants.has(DEFAULT_VARIANT)) return DEFAULT_VARIANT;
    const first = SG.variants.list()[0];
    return first ? first.id : DEFAULT_VARIANT;
  }

  // ---------------------------------------------------------------------------------------------
  // Seeds
  // ---------------------------------------------------------------------------------------------

  /** Control characters out, at most `SEED_MAX_LENGTH` characters; NOT trimmed (the user is still typing). */
  function cleanSeedText(value) {
    let text = value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, SEED_MAX_LENGTH);
    if (/[\ud800-\udbff]$/.test(text)) text = text.slice(0, -1);
    return text;
  }

  /** FNV-1a 32 bit over the UTF-16 code units of `text`. */
  function hashText(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /**
   * What a seed text means.
   * @param {*} text  The seed as typed.
   * @returns {{kind: ('random'|'number'|'text'), value: ?number}}  `random`: blank (value null);
   *          `number`: a decimal integer in 0..4294967295 (value = that number); `text`: anything else,
   *          value = its FNV-1a hash (see the file header).
   */
  function seedInfo(text) {
    const source = typeof text === 'number' && Number.isFinite(text) ? String(text) : text;
    if (typeof source !== 'string') return { kind: 'random', value: null };
    let trimmed = source.trim();
    if (trimmed === '') return { kind: 'random', value: null };
    if (/^\d{1,10}$/.test(trimmed) && Number(trimmed) <= UINT32_MAX) {
      return { kind: 'number', value: Number(trimmed) };
    }
    if (typeof trimmed.normalize === 'function') trimmed = trimmed.normalize('NFC');
    return { kind: 'text', value: hashText(trimmed) };
  }

  // ---------------------------------------------------------------------------------------------
  // Variant options
  // ---------------------------------------------------------------------------------------------

  /**
   * Whether an option is shown, given the current option values. `visibleWhen` is the variant's own
   * descriptor `{ otherOptionId: [values] }`: visible while every named option holds one of its values.
   * @param {NormalizedOption} item  From `SG.variants.optionsOf`.
   * @param {Object<string, *>} values
   * @returns {boolean}
   */
  function isOptionVisible(item, values) {
    const when = item ? item.visibleWhen : null;
    if (when === null || when === undefined || typeof when !== 'object') return true;
    return Object.keys(when).every(function (id) {
      const allowed = when[id];
      const actual = values ? values[id] : undefined;
      return Array.isArray(allowed) ? allowed.indexOf(actual) !== -1 : allowed === actual;
    });
  }

  /** Complete, valid option values of a variant; an option that is hidden by `visibleWhen` is reset. */
  function normalizeOptions(def, rawOptions) {
    const values = Object.assign(SG.variants.defaultOptions(def),
      SG.variants.sanitizeOptions(def, rawOptions));
    SG.variants.optionsOf(def).forEach(function (item) {
      if (!isOptionVisible(item, values)) values[item.id] = item.default;
    });
    return values;
  }

  // ---------------------------------------------------------------------------------------------
  // Defaults and sanitising
  // ---------------------------------------------------------------------------------------------

  /**
   * The state of a fresh start.
   * @returns {Object} A new, complete state.
   */
  function defaults() {
    const variantId = defaultVariantId();
    const def = SG.variants.get(variantId);
    return {
      variantId: variantId,
      difficulty: DEFAULT_DIFFICULTY,
      seed: '',
      symmetry: 'rotational180',
      symbolMode: def.defaultSymbolMode,
      digOrder: 'random',
      maxAttempts: MAX_ATTEMPTS.default,
      showSolution: false,
      variantOptions: SG.variants.defaultOptions(def),
      auto: false,
      lang: 'en',
      theme: 'auto',
      fontSize: 'normal',
      reducedMotion: false,
      colorAuxSymbol: true
    };
  }

  /** The supported level closest to `wanted` (on the ladder); the easier one when two are equally close. */
  function closestSupportedLevel(def, wanted) {
    const ladder = levels();
    const supported = ladder.filter(function (level) {
      return SG.difficulty.isSupported(level, { variantId: def.id });
    });
    if (supported.length === 0) return ladder[0];
    if (supported.indexOf(wanted) !== -1) return wanted;
    const wantedIndex = ladder.indexOf(wanted);
    const target = wantedIndex !== -1 ? wantedIndex : ladder.indexOf(DEFAULT_DIFFICULTY);
    let best = supported[0];
    supported.forEach(function (level) {
      if (Math.abs(ladder.indexOf(level) - target) < Math.abs(ladder.indexOf(best) - target)) best = level;
    });
    return best;
  }

  /**
   * The workhorse behind `sanitize`: builds a complete, valid state from anything. Values that are invalid
   * by themselves become the ones of `fallback`; cross-option constraints are enforced (the difficulty must
   * be one the variant supports, the symbol set one of its `symbolModes`, hidden options are reset). When
   * `notes` is an array, every cross-option correction of a value that was valid on its own is pushed on it
   * as `{ key, from, to, reason }` (reason: 'unsupportedDifficulty' | 'unsupportedSymbolMode').
   */
  function normalize(input, notes, fallback) {
    const raw = isPlainObject(input) ? input : {};
    const fb = fallback || defaults();
    const out = {};

    out.variantId = typeof raw.variantId === 'string' && SG.variants.has(raw.variantId) ? raw.variantId
      : fb.variantId;
    const def = SG.variants.get(out.variantId);

    const wantedLevel = oneOf(raw.difficulty, levels(), fb.difficulty);
    out.difficulty = closestSupportedLevel(def, wantedLevel);
    if (notes && out.difficulty !== wantedLevel && raw.difficulty === wantedLevel) {
      notes.push({
        key: 'difficulty', from: wantedLevel, to: out.difficulty, reason: 'unsupportedDifficulty'
      });
    }

    const wantedMode = typeof raw.symbolMode === 'string' ? raw.symbolMode : null;
    if (wantedMode !== null && def.symbolModes.indexOf(wantedMode) !== -1) {
      out.symbolMode = wantedMode;
    } else {
      out.symbolMode = def.defaultSymbolMode;
      if (notes && wantedMode !== null && wantedMode !== '') {
        notes.push({
          key: 'symbolMode', from: wantedMode, to: out.symbolMode, reason: 'unsupportedSymbolMode'
        });
      }
    }

    out.symmetry = oneOf(raw.symmetry, SG.symmetry.KINDS, fb.symmetry);
    if (typeof raw.seed === 'string') out.seed = cleanSeedText(raw.seed);
    else if (typeof raw.seed === 'number' && Number.isFinite(raw.seed)) {
      out.seed = cleanSeedText(String(raw.seed));
    } else out.seed = typeof fb.seed === 'string' ? fb.seed : '';
    out.digOrder = oneOf(raw.digOrder, SG.digger.ORDERS, fb.digOrder);
    out.maxAttempts = toIntInRange(raw.maxAttempts, MAX_ATTEMPTS.min, MAX_ATTEMPTS.max,
      toIntInRange(fb.maxAttempts, MAX_ATTEMPTS.min, MAX_ATTEMPTS.max, MAX_ATTEMPTS.default));
    out.showSolution = toBool(raw.showSolution, fb.showSolution === true);
    out.variantOptions = normalizeOptions(def, raw.variantOptions);

    out.auto = toBool(raw.auto, fb.auto === true);
    const lang = normalizeLang(raw.lang);
    out.lang = lang !== null ? lang : (normalizeLang(fb.lang) || 'en');
    out.theme = oneOf(raw.theme, THEMES, fb.theme);
    out.fontSize = oneOf(raw.fontSize, FONT_SIZES, fb.fontSize);
    out.reducedMotion = toBool(raw.reducedMotion, fb.reducedMotion === true);
    out.colorAuxSymbol = toBool(raw.colorAuxSymbol, fb.colorAuxSymbol !== false);
    return out;
  }

  /**
   * A complete, valid state from any input (a partial object, junk, null). Unknown or invalid values become
   * the defaults; the cross-option constraints hold: the difficulty is one the variant supports (otherwise
   * the closest supported level), the symbol set one of its `symbolModes` (otherwise its default), the
   * options are sanitised by `SG.variants.sanitizeOptions`, `maxAttempts` is clamped to 1..20. Idempotent.
   * @param {*} state
   * @returns {Object} A new state; the input is not modified.
   */
  function sanitize(state) {
    return normalize(state, null, defaults());
  }

  /**
   * `sanitize` that also reports the cross-option corrections, for a polite note in the UI.
   * @param {*} state
   * @returns {{state: Object, adjustments: Array<{key: string, from: string, to: string, reason: string}>}}
   */
  function sanitizeWithNotes(state) {
    const adjustments = [];
    return { state: normalize(state, adjustments, defaults()), adjustments: adjustments };
  }

  // ---------------------------------------------------------------------------------------------
  // Generation configuration
  // ---------------------------------------------------------------------------------------------

  /**
   * The `GenerateConfig` of `SG.pipeline` for a state (sanitised first, so the result is always valid).
   * Pure: the same state gives the same config. A blank seed leaves `seed` out (the pipeline then picks a
   * random one); see the file header for how a seed text becomes a uint32. `trace` is always left out: the
   * pipeline applies its default verbosity ('summary'), the replay does not depend on it.
   * @param {Object} state
   * @returns {{variantId: string, difficulty: string, seed: (number|undefined), symbolMode: string,
   *   symmetry: string, digOrder: string, maxAttempts: number, variantOptions: Object}}
   */
  function toConfig(state) {
    const s = sanitize(state);
    const config = {
      variantId: s.variantId,
      difficulty: s.difficulty,
      symbolMode: s.symbolMode,
      symmetry: s.symmetry,
      digOrder: s.digOrder,
      maxAttempts: s.maxAttempts,
      variantOptions: Object.assign({}, s.variantOptions)
    };
    const seed = seedInfo(s.seed);
    if (seed.value !== null) config.seed = seed.value;
    return config;
  }

  // ---------------------------------------------------------------------------------------------
  // URL
  // ---------------------------------------------------------------------------------------------

  function decode(text) {
    const spaced = text.replace(/\+/g, ' ');
    try {
      return decodeURIComponent(spaced);
    } catch (err) {
      return spaced;
    }
  }

  /** Query parameters of a search string, a URL or a bare query, as a plain object (the last value wins). */
  function parseQuery(search) {
    let text = typeof search === 'string' ? search : '';
    const hash = text.indexOf('#');
    if (hash !== -1) text = text.slice(0, hash);
    const mark = text.indexOf('?');
    if (mark !== -1) text = text.slice(mark + 1);
    else if (/^[a-z][a-z0-9+.-]*:|\//i.test(text)) text = '';
    const params = Object.create(null);
    text.split('&').forEach(function (pair) {
      if (pair === '') return;
      const eq = pair.indexOf('=');
      const key = decode(eq === -1 ? pair : pair.slice(0, eq));
      if (key !== '') params[key] = eq === -1 ? '' : decode(pair.slice(eq + 1));
    });
    return params;
  }

  /** URL parameters that make a link a puzzle configuration (not just a language or `auto`). */
  const CONFIG_PARAMS = ['v', 'd', 'seed', 'sym', 'mode', 'order', 'attempts', 'sol'];

  /**
   * Reads a search string into a PARTIAL state: only the parameters that were present and valid by
   * themselves. `variantOptions` holds the raw `o.<id>` values (they are sanitised against the variant by
   * `sanitize`). `hasConfig` tells whether the link names a puzzle parameter.
   * @param {string} search  '?v=killer&d=hard', a full URL or a bare query.
   * @returns {{patch: Object, hasConfig: boolean}}
   */
  function readUrl(search) {
    const q = parseQuery(search);
    const patch = {};
    if (typeof q.v === 'string' && SG.variants.has(q.v)) patch.variantId = q.v;
    if (typeof q.d === 'string' && levels().indexOf(q.d) !== -1) patch.difficulty = q.d;
    if (typeof q.seed === 'string' && q.seed.trim() !== '') patch.seed = cleanSeedText(q.seed.trim());
    if (typeof q.sym === 'string' && SG.symmetry.KINDS.indexOf(q.sym) !== -1) patch.symmetry = q.sym;
    if (typeof q.mode === 'string' && q.mode !== '') patch.symbolMode = q.mode;
    if (typeof q.order === 'string' && SG.digger.ORDERS.indexOf(q.order) !== -1) patch.digOrder = q.order;
    const attempts = toIntInRange(q.attempts, MAX_ATTEMPTS.min, MAX_ATTEMPTS.max, null);
    if (attempts !== null) patch.maxAttempts = attempts;
    const sol = toBool(q.sol, null);
    if (sol !== null) patch.showSolution = sol;
    const options = {};
    Object.keys(q).forEach(function (key) {
      if (key.indexOf('o.') === 0 && key.length > 2) options[key.slice(2)] = q[key];
    });
    if (Object.keys(options).length > 0) patch.variantOptions = options;
    const lang = normalizeLang(q.lang);
    if (lang !== null) patch.lang = lang;
    const auto = toBool(q.auto, null);
    if (auto !== null) patch.auto = auto;
    return {
      patch: patch,
      hasConfig: CONFIG_PARAMS.some(function (name) { return hasOwn.call(q, name); }) ||
        Object.keys(q).some(function (key) { return key.indexOf('o.') === 0; })
    };
  }

  /** A state from a URL patch on top of `base`; without `mode` the symbol set is the variant's default. */
  function applyUrlPatch(base, patch) {
    const draft = Object.assign({}, base, patch);
    if (patch.variantId !== undefined && patch.symbolMode === undefined) {
      draft.symbolMode = SG.variants.get(patch.variantId).defaultSymbolMode;
    }
    return draft;
  }

  /**
   * The complete state that a search string describes (defaults for everything it does not name).
   * @param {string} search  '?v=classic9&d=expert&seed=42&lang=vi&auto=1', a full URL or a bare query.
   * @returns {Object} A sanitised state.
   */
  function parseUrl(search) {
    return sanitize(applyUrlPatch(defaults(), readUrl(search).patch));
  }

  function optionToParam(item, value) {
    if (item.type === 'boolean') return value ? '1' : '0';
    return String(value);
  }

  /**
   * The URL parameters of a state, in a fixed order, as an object of strings. Only values that differ from
   * the defaults are included (the default symbol set is the one of the variant); `full` adds `v d sym mode`
   * always, for share links.
   * @param {Object} state
   * @param {{full: (boolean|undefined), auto: (boolean|undefined)}} [options]  `auto` overrides `state.auto`.
   * @returns {Object<string, string>}
   */
  function toUrlParams(state, options) {
    const opts = options || {};
    const full = opts.full === true;
    const s = sanitize(state);
    const d = defaults();
    const def = SG.variants.get(s.variantId);
    const p = {};
    if (full || s.variantId !== d.variantId) p.v = s.variantId;
    if (full || s.difficulty !== d.difficulty) p.d = s.difficulty;
    const seed = s.seed.trim();
    if (seed !== '') p.seed = seed;
    if (full || s.symmetry !== d.symmetry) p.sym = s.symmetry;
    if (full || s.symbolMode !== def.defaultSymbolMode) p.mode = s.symbolMode;
    if (s.digOrder !== d.digOrder) p.order = s.digOrder;
    if (s.maxAttempts !== d.maxAttempts) p.attempts = String(s.maxAttempts);
    if (s.showSolution) p.sol = '1';
    SG.variants.optionsOf(def).forEach(function (item) {
      const value = s.variantOptions[item.id];
      if (value !== item.default) p['o.' + item.id] = optionToParam(item, value);
    });
    if (s.lang !== d.lang) p.lang = s.lang;
    if ((opts.auto !== undefined ? opts.auto === true : s.auto)) p.auto = '1';
    return p;
  }

  /**
   * `toUrlParams` as a query string.
   * @param {Object} state
   * @param {{full: (boolean|undefined), auto: (boolean|undefined)}} [options]
   * @returns {string} '?v=killer&d=hard' or '' when nothing differs from the defaults.
   */
  function toSearchString(state, options) {
    const params = toUrlParams(state, options);
    const pairs = Object.keys(params).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    });
    return pairs.length === 0 ? '' : '?' + pairs.join('&');
  }

  /**
   * A share link: `base` (query and fragment removed) + the full parameters of the state.
   * @param {Object} state
   * @param {string} [base]  Usually `location.href`.
   * @param {{auto: (boolean|undefined)}} [options]  `auto: true` makes the link generate on load.
   * @returns {string}
   */
  function shareUrl(state, base, options) {
    const origin = String(base === undefined || base === null ? '' : base).replace(/[?#].*$/, '');
    return origin + toSearchString(state, { full: true, auto: options ? options.auto : undefined });
  }

  // ---------------------------------------------------------------------------------------------
  // Storage with a memory fallback
  // ---------------------------------------------------------------------------------------------

  /**
   * Wraps a `localStorage`-like object: every access is guarded and a failure (blocked storage, private
   * mode, quota) makes the values live in memory instead.
   * @param {?Object} raw  { getItem, setItem, removeItem } or null.
   */
  function guardedStorage(raw) {
    const memory = new Map();
    const guard = { persistent: raw !== null && raw !== undefined };
    function fail() {
      guard.persistent = false;
    }
    guard.read = function (key) {
      if (guard.persistent) {
        try {
          const value = raw.getItem(key);
          if (typeof value === 'string') return value;
        } catch (err) {
          fail();
        }
      }
      return memory.has(key) ? memory.get(key) : null;
    };
    guard.write = function (key, value) {
      memory.set(key, value);
      if (!guard.persistent) return false;
      try {
        raw.setItem(key, value);
        return true;
      } catch (err) {
        fail();
        return false;
      }
    };
    guard.remove = function (key) {
      memory.delete(key);
      if (!guard.persistent) return;
      try {
        raw.removeItem(key);
      } catch (err) {
        fail();
      }
    };
    return guard;
  }

  function readJson(guard, key) {
    const text = guard.read(key);
    if (text === null) return null;
    try {
      const value = JSON.parse(text);
      return isPlainObject(value) ? value : null;
    } catch (err) {
      return null;
    }
  }

  function pick(source, keys) {
    const out = {};
    keys.forEach(function (key) {
      if (hasOwn.call(source, key)) out[key] = source[key];
    });
    return out;
  }

  /** Stored preferences, keeping only the fields that are valid by themselves. */
  function validPrefs(stored) {
    const out = {};
    if (!stored) return out;
    const lang = normalizeLang(stored.lang);
    if (lang !== null) out.lang = lang;
    if (oneOf(stored.theme, THEMES, null) !== null) out.theme = stored.theme;
    if (oneOf(stored.fontSize, FONT_SIZES, null) !== null) out.fontSize = stored.fontSize;
    if (typeof stored.reducedMotion === 'boolean') out.reducedMotion = stored.reducedMotion;
    if (typeof stored.colorAuxSymbol === 'boolean') out.colorAuxSymbol = stored.colorAuxSymbol;
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // The stateful store
  // ---------------------------------------------------------------------------------------------

  function sameValue(a, b) {
    if (a === b) return true;
    if (isPlainObject(a) && isPlainObject(b)) {
      const keys = Object.keys(a);
      return keys.length === Object.keys(b).length &&
        keys.every(function (key) { return a[key] === b[key]; });
    }
    return false;
  }

  function changedKeys(prev, next) {
    return STATE_KEYS.filter(function (key) { return !sameValue(prev[key], next[key]); });
  }

  function freezeState(state) {
    Object.freeze(state.variantOptions);
    return Object.freeze(state);
  }

  function browserValue(read) {
    if (typeof window === 'undefined') return null;
    try {
      const value = read(window);
      return value === undefined ? null : value;
    } catch (err) {
      return null;
    }
  }

  /**
   * @typedef {Object} Store
   * @property {function(): Object} get  The current state (frozen).
   * @property {function(Object, Object=): Object} set  `set(patch, meta)`: merges a partial state, sanitises
   *   it (an invalid value keeps the previous one; the cross-option constraints are enforced), saves it and
   *   updates the URL unless `meta.persist === false`, switches `SG.i18n` when `lang` changed, and tells
   *   the subscribers. `variantOptions` in a patch is merged into the current options; a new `variantId`
   *   resets the options (to the patch's, else to the defaults) and keeps the difficulty / symbol set when
   *   the new variant allows them (a symbol set that was the default follows the variant's default).
   * @property {function(function(Object, string[], Object): void): function(): void} subscribe  Callbacks get
   *   `(state, changedKeys, meta)`; `meta` is the caller's object plus `adjustments` (the cross-option
   *   corrections of `sanitizeWithNotes`). Returns the unsubscribe function.
   * @property {function(): Object} load  Start-up: URL > stored values > defaults; sets the language through
   *   `SG.i18n`; notifies with `meta.source === 'load'`; rewrites the URL to its canonical form.
   * @property {function(): boolean} save  Writes preferences and last configuration.
   * @property {function(): boolean} syncUrl  `history.replaceState` with the non-default parameters.
   * @property {function(): number} newSeed  A random uint32, written into the state (as text) and returned.
   * @property {function(): Object} reset  Puzzle configuration back to the defaults (preferences kept).
   * @property {function(): boolean} persistent  False once the storage turned out to be unavailable.
   */

  /**
   * Creates a store. Everything is injectable so that it can run without a browser.
   * @param {Object} [options]
   * @param {?Object} [options.storage]    `localStorage`-like; null: memory only. Default:
   *        `window.localStorage` when there is a window.
   * @param {?Object} [options.location]   `{ search, pathname, hash }`. Default: `window.location`.
   * @param {?Object} [options.history]    `{ replaceState }`. Default: `window.history`.
   * @param {?Object} [options.navigator]  `{ languages, language }`, for the start language.
   * @param {function(): number} [options.random]  Returns a uint32 (default `SG.rng.randomSeed`).
   * @returns {Store}
   */
  function create(options) {
    const opts = options || {};
    const rawStorage = opts.storage !== undefined ? opts.storage
      : browserValue(function (w) { return w.localStorage; });
    const location = opts.location !== undefined ? opts.location
      : browserValue(function (w) { return w.location; });
    const history = opts.history !== undefined ? opts.history
      : browserValue(function (w) { return w.history; });
    const navigatorLike = opts.navigator !== undefined ? opts.navigator
      : (typeof navigator !== 'undefined' ? navigator : null);
    const random = typeof opts.random === 'function' ? opts.random
      : function () { return SG.rng.randomSeed(); };

    const storage = guardedStorage(rawStorage);
    let state = freezeState(defaults());
    let listeners = [];
    const queue = [];
    let notifying = false;

    function get() {
      return state;
    }

    function drain() {
      if (notifying) return;
      notifying = true;
      try {
        while (queue.length > 0) {
          const job = queue.shift();
          listeners.slice().forEach(function (fn) {
            try {
              fn(job.state, job.keys, job.meta);
            } catch (err) {
              if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
            }
          });
        }
      } finally {
        notifying = false;
      }
    }

    function subscribe(fn) {
      if (typeof fn !== 'function') throw new TypeError('SG.store: subscribe needs a function');
      listeners.push(fn);
      return function unsubscribe() {
        listeners = listeners.filter(function (other) { return other !== fn; });
      };
    }

    function save() {
      const prefs = Object.assign({ v: STORAGE_VERSION }, pick(state, PREF_KEYS));
      const last = Object.assign({ v: STORAGE_VERSION }, pick(state, CONFIG_KEYS));
      const a = storage.write(PREFS_KEY, JSON.stringify(prefs));
      const b = storage.write(LAST_CONFIG_KEY, JSON.stringify(last));
      return a && b;
    }

    function syncUrl() {
      if (!location || !history || typeof history.replaceState !== 'function') return false;
      const search = toSearchString(state);
      try {
        const url = String(location.pathname || '') + search + String(location.hash || '');
        history.replaceState(history.state === undefined ? null : history.state, '', url);
        return true;
      } catch (err) {
        return false;
      }
    }

    function applyLanguage(lang) {
      if (SG.i18n && typeof SG.i18n.setLocale === 'function' && SG.i18n.current !== lang) {
        SG.i18n.setLocale(lang);
      }
    }

    function commit(next, meta, persist) {
      const prev = state;
      const keys = changedKeys(prev, next);
      if (keys.length === 0) return state;
      state = freezeState(next);
      if (keys.indexOf('lang') !== -1) applyLanguage(state.lang);
      if (persist) {
        save();
        syncUrl();
      }
      queue.push({ state: state, keys: keys, meta: meta });
      drain();
      return state;
    }

    function set(patch, meta) {
      if (!isPlainObject(patch)) return state;
      const prev = state;
      const draft = Object.assign({}, prev);
      STATE_KEYS.forEach(function (key) {
        if (key !== 'variantOptions' && hasOwn.call(patch, key)) draft[key] = patch[key];
      });
      const variantChanged = typeof patch.variantId === 'string' && patch.variantId !== prev.variantId &&
        SG.variants.has(patch.variantId);
      if (variantChanged) {
        const before = SG.variants.get(prev.variantId);
        const after = SG.variants.get(patch.variantId);
        if (!hasOwn.call(patch, 'symbolMode') && prev.symbolMode === before.defaultSymbolMode) {
          draft.symbolMode = after.defaultSymbolMode;
        }
        draft.variantOptions = {};
      }
      if (isPlainObject(patch.variantOptions)) {
        const base = variantChanged ? {} : prev.variantOptions;
        draft.variantOptions = Object.assign({}, base, patch.variantOptions);
      }
      const adjustments = [];
      const next = normalize(draft, adjustments, prev);
      const info = Object.assign({}, meta, { adjustments: adjustments });
      return commit(next, info, !(meta && meta.persist === false));
    }

    function readStored() {
      return {
        prefs: validPrefs(readJson(storage, PREFS_KEY)),
        last: readJson(storage, LAST_CONFIG_KEY)
      };
    }

    function load() {
      const stored = readStored();
      const url = readUrl(location ? location.search : '');
      let draft = defaults();
      if (!url.hasConfig && stored.last) draft = Object.assign(draft, pick(stored.last, CONFIG_KEYS));
      draft = Object.assign(draft, stored.prefs);
      draft = applyUrlPatch(draft, url.patch);
      draft.auto = url.patch.auto === true;
      draft.lang = SG.i18n && typeof SG.i18n.detect === 'function'
        ? SG.i18n.detect({ urlLang: url.patch.lang, stored: stored.prefs.lang, navigator: navigatorLike })
        : (url.patch.lang || stored.prefs.lang || 'en');
      const next = normalize(draft, null, defaults());
      state = freezeState(next);
      applyLanguage(state.lang);
      syncUrl();
      queue.push({ state: state, keys: STATE_KEYS.slice(), meta: { source: 'load', adjustments: [] } });
      drain();
      return state;
    }

    function newSeed() {
      const seed = random() >>> 0;
      set({ seed: String(seed) }, { source: 'newSeed' });
      return seed;
    }

    function reset() {
      const fresh = defaults();
      const patch = pick(fresh, CONFIG_KEYS);
      patch.auto = false;
      return set(patch, { source: 'reset' });
    }

    return {
      get: get,
      set: set,
      subscribe: subscribe,
      load: load,
      save: save,
      syncUrl: syncUrl,
      newSeed: newSeed,
      reset: reset,
      persistent: function () { return storage.persistent; }
    };
  }

  let shared = null;

  /**
   * The shared browser store, created on first use. It does not load anything by itself: app.js calls
   * `SG.store.instance().load()` once at start-up.
   * @returns {Store}
   */
  function instance() {
    if (shared === null) shared = create({});
    return shared;
  }

  /**
   * @namespace SG.store
   */
  SG.store = {
    PREFS_KEY: PREFS_KEY,
    LAST_CONFIG_KEY: LAST_CONFIG_KEY,
    MAX_ATTEMPTS: MAX_ATTEMPTS,
    THEMES: THEMES,
    FONT_SIZES: FONT_SIZES,
    SEED_MAX_LENGTH: SEED_MAX_LENGTH,
    defaults: defaults,
    sanitize: sanitize,
    sanitizeWithNotes: sanitizeWithNotes,
    isOptionVisible: isOptionVisible,
    seedInfo: seedInfo,
    toConfig: toConfig,
    parseUrl: parseUrl,
    readUrl: readUrl,
    toUrlParams: toUrlParams,
    toSearchString: toSearchString,
    shareUrl: shareUrl,
    create: create,
    instance: instance
  };
})(typeof self !== 'undefined' ? self : globalThis);
