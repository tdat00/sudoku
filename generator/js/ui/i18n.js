/**
 * `SG.i18n`. Language packs are flat objects `SG.locales.en|vi` (dotted key -> text) from js/ui/locale.*.js.
 * Modules that own their strings push `{ en: {...}, vi: {...} }` fragments into `SG.localeFragments`;
 * `mergeFragments()` adds them to the packs. The base packs win: a fragment that redefines an existing key is
 * reported in `conflicts`.
 *
 * Texts use `{name}` placeholders. Plural forms are keys with the suffix `_one` / `_other` (the category
 * comes from `Intl.PluralRules` and `args.count`; a missing form falls back to `_other`, then to the plain
 * key). `args.rule` makes the key `<key>.<rule>` win when it exists. A missing key returns the key itself
 * (and warns when `SG.DEBUG` is on), after trying the English pack.
 *
 * DOM: `data-i18n="key"` sets the text, `data-i18n-attr="title:key,aria-label:key2"` sets attributes,
 * `data-i18n-args='{"n":3}'` gives both arguments. DOM access is inside guarded functions, so the file loads
 * (and works, except for the DOM part) in Node.
 *
 * Cells: events carry cell indexes; `setCellLabeler(fn)` says how to label an index for the current puzzle
 * (e.g. 'R4C7'); `eventText` also accepts a label function or a model per call.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads: listeners and the current locale must survive.
  if (SG.i18n && typeof SG.i18n.t === 'function') return;

  const AVAILABLE = Object.freeze(['en', 'vi']);
  const DEFAULT_LOCALE = 'en';

  const INTL_TAGS = { en: 'en-US', vi: 'vi-VN' };

  const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  const hasOwn = Object.prototype.hasOwnProperty;

  let current = DEFAULT_LOCALE;
  let listeners = [];
  let cellLabeler = null;

  const mergedCount = { en: 0, vi: 0 };
  let conflictList = [];
  let watched = null;

  const formatters = {};
  const pluralRules = {};

  /** Turns 'vi', 'VI', 'vi-VN' or 'vi_VN' into a supported code, else null. */
  function normalize(code) {
    if (typeof code !== 'string') return null;
    const base = code.trim().toLowerCase().split(/[-_]/)[0];
    return AVAILABLE.indexOf(base) === -1 ? null : base;
  }

  function languageList(source) {
    if (typeof source === 'string') return [source];
    if (Array.isArray(source)) return source;
    if (source === null || typeof source !== 'object') return [];
    const list = Array.isArray(source.languages) ? source.languages.slice() : [];
    if (typeof source.language === 'string') list.push(source.language);
    return list;
  }

  /**
   * Picks the start language: the `lang` URL parameter, then the stored preference, then the browser
   * languages (`sources.navigator`: `navigator`, a tag or a list of tags), then English. Pure: the caller
   * reads the URL, the storage and `navigator`.
   */
  function detect(sources) {
    const s = sources || {};
    const fromUrl = normalize(s.urlLang);
    if (fromUrl !== null) return fromUrl;
    const fromStore = normalize(s.stored);
    if (fromStore !== null) return fromStore;
    const list = languageList(s.navigator);
    for (let i = 0; i < list.length; i++) {
      const fromBrowser = normalize(list[i]);
      if (fromBrowser !== null) return fromBrowser;
    }
    return DEFAULT_LOCALE;
  }

  /** Adds `fragments[from ..]` key by key; an existing key is never replaced but returned as a conflict. */
  function mergeInto(locales, fragments, from) {
    const conflicts = [];
    let count = 0;
    for (let i = from || 0; i < fragments.length; i++) {
      count++;
      AVAILABLE.forEach(function (code) {
        const text = fragments[i] && fragments[i][code];
        const pack = locales[code];
        if (!pack || !text || typeof text !== 'object') return;
        Object.keys(text).forEach(function (key) {
          if (hasOwn.call(pack, key)) conflicts.push({ locale: code, key: key, fragment: i });
          else pack[key] = text[key];
        });
      });
    }
    return { count: count, conflicts: conflicts };
  }

  /**
   * Merges the fragments added since the last call. Cheap when nothing is new, so safe before every lookup.
   */
  function mergeFragments() {
    if (Array.isArray(SG.localeFragments) && watched !== SG.localeFragments) watchFragments();
    const fragments = SG.localeFragments;
    const locales = SG.locales;
    if (!Array.isArray(fragments) || !locales || typeof locales !== 'object') return 0;
    if (mergedCount.en === fragments.length && mergedCount.vi === fragments.length) return 0;
    let merged = 0;
    AVAILABLE.forEach(function (code) {
      if (!locales[code] || typeof locales[code] !== 'object') return;
      if (mergedCount[code] > fragments.length) mergedCount[code] = fragments.length;
      if (mergedCount[code] === fragments.length) return;
      const scope = {};
      scope[code] = locales[code];
      const report = mergeInto(scope, fragments, mergedCount[code]);
      merged = Math.max(merged, report.count);
      mergedCount[code] = fragments.length;
      conflictList = conflictList.concat(report.conflicts);
    });
    return merged;
  }

  /** Merges fragments as they are pushed, so direct reads of `SG.locales.en[key]` see them too. */
  function watchFragments() {
    if (!Array.isArray(SG.localeFragments)) SG.localeFragments = [];
    const list = SG.localeFragments;
    if (watched === list) return;
    watched = list;
    const push = list.push;
    list.push = function pushAndMerge() {
      const length = push.apply(list, arguments);
      mergeFragments();
      return length;
    };
  }

  function packFor(code) {
    mergeFragments();
    const locales = SG.locales;
    return locales && typeof locales === 'object' && locales[code] && typeof locales[code] === 'object'
      ? locales[code] : null;
  }

  function pluralCategory(code, count) {
    try {
      if (!pluralRules[code]) pluralRules[code] = new Intl.PluralRules(INTL_TAGS[code]);
      return pluralRules[code].select(count);
    } catch (err) {
      return count === 1 ? 'one' : 'other';
    }
  }

  function templateFor(code, key, args) {
    const pack = packFor(code);
    if (pack === null) return undefined;
    if (args && typeof args.rule === 'string' && hasOwn.call(pack, key + '.' + args.rule)) {
      return pack[key + '.' + args.rule];
    }
    if (args && typeof args.count === 'number' && isFinite(args.count)) {
      const exact = key + '_' + pluralCategory(code, args.count);
      if (hasOwn.call(pack, exact)) return pack[exact];
      if (hasOwn.call(pack, key + '_other')) return pack[key + '_other'];
    }
    return hasOwn.call(pack, key) ? pack[key] : undefined;
  }

  function debugWarn(message) {
    if (SG.DEBUG && typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[i18n] ' + message);
    }
  }

  function has(key) {
    const pack = packFor(current);
    return pack !== null && typeof key === 'string' &&
      (hasOwn.call(pack, key) || hasOwn.call(pack, key + '_other') || hasOwn.call(pack, key + '_one'));
  }

  function keys(locale) {
    const pack = packFor(normalize(locale === undefined ? current : locale) || DEFAULT_LOCALE);
    return pack === null ? [] : Object.keys(pack).sort();
  }

  function numberFormat(options) {
    const id = current + JSON.stringify(options || {});
    if (!formatters[id]) formatters[id] = new Intl.NumberFormat(INTL_TAGS[current], options);
    return formatters[id];
  }

  function formatNumber(n, options) {
    const value = Number(n);
    if (!isFinite(value)) return String(n);
    try {
      return numberFormat(options).format(value);
    } catch (err) {
      return String(value);
    }
  }

  function unitText(key, fallback, args) {
    const template = templateFor(current, key, args) || templateFor(DEFAULT_LOCALE, key, args) || fallback;
    return interpolate(template, args);
  }

  /** '412 ms', '2.5 s', '1 min 5 s', '1 h 2 min'; numbers follow the language. */
  function formatDuration(ms) {
    const value = Number(ms);
    if (!isFinite(value) || value < 0) return '\u2013';
    if (Math.round(value) < 1000) {
      return unitText('duration.ms', '{value} ms', { value: formatNumber(Math.round(value)) });
    }
    const tenths = Math.round(value / 100);
    if (tenths < 600) {
      const shown = formatNumber(tenths / 10, { maximumFractionDigits: 1 });
      return unitText('duration.s', '{value} s', { value: shown });
    }
    const total = Math.round(value / 1000);
    const h = formatNumber(Math.floor(total / 3600));
    const min = formatNumber(Math.floor((total % 3600) / 60));
    const sec = formatNumber(total % 60);
    if (total >= 3600) {
      return total % 3600 < 60 ? unitText('duration.h', '{h} h', { h: h })
        : unitText('duration.hMin', '{h} h {min} min', { h: h, min: min });
    }
    return total % 60 === 0 ? unitText('duration.min', '{min} min', { min: min })
      : unitText('duration.minSec', '{min} min {sec} s', { min: min, sec: sec });
  }

  /** `fn(cellIndex) -> 'R4C7'` names the cells of the puzzle on screen; null restores the default ('#12'). */
  function setCellLabeler(fn) {
    cellLabeler = typeof fn === 'function' ? fn : null;
  }

  function cellLabel(cell, labeler) {
    if (typeof cell !== 'number') return String(cell);
    const fn = typeof labeler === 'function' ? labeler : cellLabeler;
    if (fn !== null) {
      try {
        return String(fn(cell));
      } catch (err) {
        debugWarn('cell labeler failed for ' + cell);
      }
    }
    return '#' + (cell + 1);
  }

  /**
   * `R1C1\u22605 \u21d2 R1C4=5 | ...` (`=` true, `\u2260` false, `|` separates the chains of a
   * contradiction).
   */
  function formatChains(chains, labeler) {
    return chains.map(function (chain) {
      return chain.map(function (lit) {
        return cellLabel(lit[0], labeler) + (lit[2] === 1 ? '=' : '\u2260') + lit[1];
      }).join(' \u21d2 ');
    }).join(' | ');
  }

  const UNIT_KIND_ARGS = { unitKind: true, orientation: true };

  function localizedWord(prefix, value) {
    const pack = packFor(current);
    const own = pack !== null && hasOwn.call(pack, prefix + value);
    if (own) return pack[prefix + value];
    const fallback = packFor(DEFAULT_LOCALE);
    if (fallback !== null && hasOwn.call(fallback, prefix + value)) return fallback[prefix + value];
    return String(value);
  }

  function formatValue(name, value) {
    if (value === null || value === undefined) return '';
    if (name === 'chains' && Array.isArray(value)) return formatChains(value);
    if (UNIT_KIND_ARGS[name] === true && typeof value === 'string') return localizedWord('unitKind.', value);
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return localizedWord('common.', value ? 'yes' : 'no');
    if (typeof value === 'number') {
      if (isFinite(value)) return String(value);
      return Number.isNaN(value) ? '?' : (value > 0 ? '\u221e' : '-\u221e');
    }
    if (Array.isArray(value)) return value.map(function (item) { return formatValue('', item); }).join(', ');
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  }

  function interpolate(template, args) {
    const text = typeof template === 'string' ? template : String(template);
    if (!args || text.indexOf('{') === -1) return text;
    return text.replace(PLACEHOLDER, function (whole, name) {
      if (!hasOwn.call(args, name)) {
        debugWarn('no value for {' + name + '} in "' + text + '"');
        return whole;
      }
      return formatValue(name, args[name]);
    });
  }

  /**
   * Arrays are joined with ', ', booleans become yes / no, `unitKind` and `orientation` are translated;
   * `count` picks the plural form, `rule` a `<key>.<rule>` variant. Returns the key itself when no language
   * has it.
   */
  function t(key, args) {
    if (typeof key !== 'string') return '';
    let template = templateFor(current, key, args);
    if (template === undefined && current !== DEFAULT_LOCALE) {
      template = templateFor(DEFAULT_LOCALE, key, args);
      if (template !== undefined) debugWarn('missing key "' + key + '" in "' + current + '"');
    }
    if (template === undefined) {
      debugWarn('missing key "' + key + '"');
      return key;
    }
    return interpolate(template, args);
  }

  /** Error arguments that hold an id with a translated name. */
  const ERROR_ENUMS = { level: 'difficulty.', variantId: 'variant.', technique: 'technique.' };

  function errorParts(source, extra) {
    let code = null;
    let args = {};
    if (typeof source === 'string') {
      code = source;
    } else if (source && typeof source === 'object') {
      if (typeof source.code === 'string') code = source.code;
      args = Object.assign({}, source.i18nArgs || source.args || {});
      if (code === null && typeof source.message === 'string') args.message = source.message;
    }
    return { code: code, args: Object.assign(args, extra || {}) };
  }

  /**
   * `errOrCode`: a `SG.errors.GenerationError`, its plain copy `{ code, i18nArgs }` (what crosses
   * `postMessage`) or a code such as 'budget.exceeded'. An unknown code gets a generic text.
   */
  function tError(errOrCode, args) {
    const parts = errorParts(errOrCode, args);
    const code = parts.code;
    const shown = {};
    Object.keys(parts.args).forEach(function (name) {
      const value = parts.args[name];
      shown[name] = ERROR_ENUMS[name] && typeof value === 'string' && has(ERROR_ENUMS[name] + value)
        ? t(ERROR_ENUMS[name] + value) : value;
    });
    if (code === null) {
      if (shown.message === undefined) shown.message = '';
      return t('error.unexpected', shown);
    }
    if (shown.code === undefined) shown.code = code;
    if (code === 'unexpected' && shown.message === undefined) shown.message = code;
    return has('error.' + code) ? t('error.' + code, shown) : t('error.unknown', shown);
  }

  /** Event arguments whose value is the id of a translated enumeration: name -> key prefix. */
  const EVENT_ENUMS = {
    variantId: 'variant.', difficulty: 'difficulty.', level: 'difficulty.', requested: 'difficulty.',
    achieved: 'difficulty.', symbolMode: 'symbolMode.', symmetry: 'symmetry.', digOrder: 'digOrder.',
    order: 'digOrder.', technique: 'technique.', hardestTechnique: 'technique.', group: 'techniqueGroup.',
    pass: 'digPass.', trace: 'traceLevel.'
  };

  /** The same for single events whose argument names mean something else. */
  const EVENT_ENUMS_BY_KEY = {
    'buildModel.traceDowngraded': { requested: 'traceLevel.', applied: 'traceLevel.' },
    'dig.skip': { reason: 'dig.reason.' },
    'dig.reject': { reason: 'dig.reason.' },
    'retry.difficulty': { reason: 'retry.reason.' }
  };

  /** Events with two texts, chosen by a boolean argument (`<key>.yes` / `<key>.no`). */
  const EVENT_SWITCH = { 'dig.verify': 'unique', done: 'exact', 'retry.difficulty': 'willRetry' };

  /** Events whose plural form follows an argument other than `count`. */
  const EVENT_PLURAL = { 'trace.coalesced': 'dropped' };

  function eventLabeler(options) {
    if (options && typeof options.cellLabel === 'function') return options.cellLabel;
    if (options && options.model && SG.model && typeof SG.model.cellLabel === 'function') {
      return function labelOf(cell) { return SG.model.cellLabel(options.model, cell); };
    }
    return null;
  }

  function eventArgs(key, source, labeler) {
    const own = EVENT_ENUMS_BY_KEY[key] || {};
    const args = {};
    Object.keys(source).forEach(function (name) {
      const value = source[name];
      const prefix = own[name] || EVENT_ENUMS[name];
      if (name === 'cell' || name === 'cells') {
        args[name] = Array.isArray(value) ? value.map(function (c) { return cellLabel(c, labeler); })
          : cellLabel(value, labeler);
      } else if (name === 'chains' && Array.isArray(value)) {
        args[name] = formatChains(value, labeler || undefined);
      } else if (name === 'warnings' && Array.isArray(value)) {
        args[name] = value.map(function (w) { return t(w); });
      } else if (value === null || value === undefined) {
        args[name] = name === 'scoreMax' ? '\u221e' : '\u2013';
      } else if (prefix && typeof value === 'string') {
        args[name] = localizedWord(prefix, value);
      } else {
        args[name] = value;
      }
    });
    if (EVENT_PLURAL[key] && args.count === undefined) args.count = source[EVENT_PLURAL[key]];
    return args;
  }

  /**
   * Cells as labels (`options.cellLabel`, or `options.model` via `SG.model.cellLabel`), ids as translated
   * names. '' for an event without a key (a `metric`).
   */
  function eventText(event, options) {
    if (!event || typeof event.i18nKey !== 'string' || event.i18nKey === '') return '';
    const key = event.i18nKey;
    const source = event.i18nArgs && typeof event.i18nArgs === 'object' ? event.i18nArgs : {};
    if (key.indexOf('error.') === 0) {
      return tError(typeof source.code === 'string' ? source.code : key.slice(6), source);
    }
    const args = eventArgs(key, source, eventLabeler(options));
    let chosen = key;
    const flag = EVENT_SWITCH[key];
    if (flag !== undefined && typeof source[flag] === 'boolean') {
      const variant = key + (source[flag] ? '.yes' : '.no');
      if (has(variant)) chosen = variant;
    }
    return t(chosen, args);
  }

  function parseArgs(text) {
    if (typeof text !== 'string' || text === '') return undefined;
    try {
      const value = JSON.parse(text);
      return value !== null && typeof value === 'object' ? value : undefined;
    } catch (err) {
      debugWarn('data-i18n-args is not valid JSON: ' + text);
      return undefined;
    }
  }

  function applyElement(el) {
    const key = el.getAttribute('data-i18n');
    const attrs = el.getAttribute('data-i18n-attr');
    if (!key && !attrs) return 0;
    const args = parseArgs(el.getAttribute('data-i18n-args'));
    if (key) el.textContent = t(key, args);
    if (attrs) {
      attrs.split(',').forEach(function (pair) {
        const cut = pair.lastIndexOf(':');
        if (cut < 1) return;
        const name = pair.slice(0, cut).trim();
        const attrKey = pair.slice(cut + 1).trim();
        if (name !== '' && attrKey !== '') el.setAttribute(name, t(attrKey, args));
      });
    }
    return 1;
  }

  function applyTo(rootEl) {
    if (!rootEl) return 0;
    let count = 0;
    if (typeof rootEl.getAttribute === 'function') count += applyElement(rootEl);
    if (typeof rootEl.querySelectorAll === 'function') {
      const nodes = rootEl.querySelectorAll('[data-i18n],[data-i18n-attr]');
      for (let i = 0; i < nodes.length; i++) count += applyElement(nodes[i]);
    }
    return count;
  }

  function updateDocument(code) {
    if (typeof document === 'undefined' || !document || !document.documentElement) return;
    document.documentElement.setAttribute('lang', code);
    applyTo(document);
    try {
      document.dispatchEvent(new CustomEvent('localechange', { detail: { locale: code } }));
    } catch (err) {
      debugWarn('could not dispatch localechange');
    }
  }

  /**
   * Only when the language really changes: updates `<html lang>`, translates the document, calls the
   * listeners.
   */
  function setLocale(code) {
    const next = normalize(code);
    if (next === null) {
      debugWarn('unsupported locale "' + code + '"');
      return current;
    }
    const previous = current;
    current = next;
    mergeFragments();
    updateDocument(next);
    if (next !== previous) {
      listeners.slice().forEach(function (fn) {
        try {
          fn(next, previous);
        } catch (err) {
          if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
        }
      });
    }
    return current;
  }

  /** The listener gets `(newLocale, oldLocale)`; returns a function that removes it. */
  function onChange(fn) {
    if (typeof fn !== 'function') throw new TypeError('SG.i18n.onChange needs a function');
    listeners.push(fn);
    return function unsubscribe() {
      listeners = listeners.filter(function (other) { return other !== fn; });
    };
  }

  watchFragments();

  const i18n = {
    available: AVAILABLE,
    t: t,
    tError: tError,
    eventText: eventText,
    has: has,
    keys: keys,
    setLocale: setLocale,
    onChange: onChange,
    applyTo: applyTo,
    detect: detect,
    normalize: normalize,
    formatNumber: formatNumber,
    formatDuration: formatDuration,
    formatChains: formatChains,
    setCellLabeler: setCellLabeler,
    cellLabel: cellLabel,
    mergeFragments: mergeFragments,
    mergeInto: mergeInto
  };

  Object.defineProperties(i18n, {
    current: { enumerable: true, get: function () { return current; } },
    conflicts: {
      enumerable: true,
      get: function () {
        mergeFragments();
        return conflictList.slice();
      }
    }
  });

  SG.i18n = i18n;
})(typeof self !== 'undefined' ? self : globalThis);
