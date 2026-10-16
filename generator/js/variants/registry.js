/**
 * Variant registry. Every variant registers one definition here; the generator never asks "which variant
 * is this" with an if-chain, it asks the registry (design.md section 5.3).
 *
 * Registering validates the definition, so a typo shows up when the variant file loads and not in the
 * middle of a generation run.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first registry on repeated loads: the variants registered so far must survive.
  if (SG.variants && typeof SG.variants.register === 'function') return;

  /** Difficulty ids a variant may declare. Mirrors SG.difficulty.LEVELS (which loads later). */
  const LEVELS = ['veryEasy', 'easy', 'medium', 'hard', 'expert', 'evil'];

  /**
   * @typedef {Object} VariantDef
   * @property {string} id                  Unique id, e.g. 'classic9'.
   * @property {string} i18nKey             Translation key of the variant name.
   * @property {string} group               Family used to group variants in the UI, e.g. 'classic'.
   * @property {number} digits              D, the number of values.
   * @property {string[]} difficultySupport Levels this variant can generate.
   * @property {string} defaultSymbolMode   One of `symbolModes`.
   * @property {string[]} symbolModes       Symbol sets the UI may offer.
   * @property {Object[]} options           Schema of the variant specific options (may be empty). Variants
   *     declare them in slightly different shapes (`i18nKey` or `labelKey`, `hintKey` or `hintI18nKey`,
   *     `choices[].i18nKey` or `.labelKey`); the UI never reads them directly but asks `optionsOf`.
   * @property {function(Object, Object): PuzzleModel} build  `build(opts, rng)` returns a model.
   * @property {function(Object): void} [postGenerate]  Pipeline hook, runs once the full grid exists.
   * @property {string} [digStrategy]       Alternative digging strategy id, e.g. 'signs'.
   * @property {function(PuzzleModel, SolveState, Rng): boolean} [fastSeed]
   *     Optional pre-fill used by the full grid generator. It assigns a few cells of a fresh state through
   *     `SG.constraints.assign` and returns false when it could not, in which case the state is discarded.
   * @property {number} [restartThreshold]  Optional positive integer: failed guesses per attempt of the full
   *     grid search before it restarts. `SG.fullGrid.generate` uses it unless its caller passes the option;
   *     without either the default is cellCount * 50.
   * @property {(Object<string, number>|function(string, PuzzleModel, number): number)} [clueFloor]
   *     Optional own clue floor (invariant I6) in place of the one `SG.difficulty.spec` derives from the
   *     classic9 numbers (cellCount / 81): a table { level: clues } (a missing level: no floor) or a
   *     function (level, model, derivedFloor) => clues. See "Clue floor per variant" in
   *     js/core/difficulty.js.
   * @property {Object<string, number>} [clueFloorScale]
   *     Optional calibration of the derived floor: { level: factor } with a finite factor >= 0; the derived
   *     floor of that level is multiplied by it (missing level: 1). It is applied before `clueFloor`.
   */

  /**
   * One option of a variant as the UI sees it (the result of `optionsOf`). Every field is always present.
   * @typedef {Object} NormalizedOption
   * @property {string} id              Key of the option in the `variantOptions` of a configuration.
   * @property {('slider'|'select'|'boolean'|'text')} type
   * @property {string} labelKey        Translation key of the control's label.
   * @property {?string} hintKey        Translation key of the help text.
   * @property {(number|string|boolean)} default  Value used when the option is not set; a number for a
   *           slider, one of the choice values for a select, a boolean, a string for a text.
   * @property {?number} min            Slider only (else null).
   * @property {?number} max            Slider only.
   * @property {?number} step           Slider only; 1 when the variant declares none.
   * @property {?string} minLabelKey    Slider caption of the minimum, when declared.
   * @property {?string} maxLabelKey    Slider caption of the maximum, when declared.
   * @property {?string} defaultLabelKey  Caption shown instead of the number at the default value (an
   *           "auto" or "random" setting), when declared.
   * @property {Array<{value: (string|number), labelKey: ?string}>} choices  Select only (else []).
   * @property {boolean} advanced       Show under "advanced" settings.
   * @property {?Object} visibleWhen    The variant's own descriptor, unchanged: { otherOptionId: [values] }
   *           means "visible while that option has one of these values"; null means always visible.
   * @property {?number} maxLength      Text only: the longest accepted string.
   * @property {?string} placeholderKey Text only: translation key of the placeholder.
   */

  const OPTION_TYPES = ['slider', 'select', 'boolean', 'text'];

  const definitions = new Map();

  function invalid(id, reason) {
    return new SG.errors.GenerationError('variant.invalidDef', { id: String(id), reason: reason });
  }

  function requireString(def, field) {
    if (typeof def[field] !== 'string' || def[field] === '') {
      throw invalid(def.id, field + ' must be a non-empty string');
    }
  }

  function requireStringArray(def, field) {
    if (!Array.isArray(def[field]) || def[field].some(function (s) { return typeof s !== 'string'; })) {
      throw invalid(def.id, field + ' must be an array of strings');
    }
  }

  function checkClueFields(def) {
    if (def.restartThreshold !== undefined && !(Number.isInteger(def.restartThreshold) &&
        def.restartThreshold >= 1)) {
      throw invalid(def.id, 'restartThreshold must be a positive integer when present');
    }
    const scale = def.clueFloorScale;
    if (scale !== undefined) {
      if (scale === null || typeof scale !== 'object' || Array.isArray(scale)) {
        throw invalid(def.id, 'clueFloorScale must be a { level: factor } table when present');
      }
      Object.keys(scale).forEach(function (level) {
        if (LEVELS.indexOf(level) === -1) {
          throw invalid(def.id, 'clueFloorScale has the unknown level "' + level + '"');
        }
        if (!(typeof scale[level] === 'number' && Number.isFinite(scale[level]) && scale[level] >= 0)) {
          throw invalid(def.id, 'clueFloorScale.' + level + ' must be a finite number >= 0');
        }
      });
    }
    const floor = def.clueFloor;
    if (floor === undefined || typeof floor === 'function') return;
    if (floor === null || typeof floor !== 'object' || Array.isArray(floor)) {
      throw invalid(def.id, 'clueFloor must be a function or a { level: clues } table when present');
    }
    Object.keys(floor).forEach(function (level) {
      if (LEVELS.indexOf(level) === -1) {
        throw invalid(def.id, 'clueFloor has the unknown level "' + level + '"');
      }
      if (!(Number.isInteger(floor[level]) && floor[level] >= 0)) {
        throw invalid(def.id, 'clueFloor.' + level + ' must be a non-negative integer');
      }
    });
  }

  function checkDefinition(def) {
    if (!def || typeof def !== 'object') throw invalid(undefined, 'definition must be an object');
    requireString(def, 'id');
    requireString(def, 'i18nKey');
    requireString(def, 'group');
    requireString(def, 'defaultSymbolMode');
    if (!(Number.isInteger(def.digits) && def.digits >= 1 && def.digits <= SG.MAX_DIGITS)) {
      throw invalid(def.id, 'digits must be an integer in 1..' + SG.MAX_DIGITS);
    }
    requireStringArray(def, 'difficultySupport');
    requireStringArray(def, 'symbolModes');
    if (def.difficultySupport.length === 0) throw invalid(def.id, 'difficultySupport must not be empty');
    def.difficultySupport.forEach(function (level) {
      if (LEVELS.indexOf(level) === -1) throw invalid(def.id, 'unknown difficulty level "' + level + '"');
    });
    if (def.symbolModes.indexOf(def.defaultSymbolMode) === -1) {
      throw invalid(def.id, 'defaultSymbolMode must be one of symbolModes');
    }
    if (!Array.isArray(def.options)) throw invalid(def.id, 'options must be an array');
    optionsOf(def);
    if (typeof def.build !== 'function') throw invalid(def.id, 'build must be a function');
    ['postGenerate', 'fastSeed'].forEach(function (hook) {
      if (def[hook] !== undefined && def[hook] !== null && typeof def[hook] !== 'function') {
        throw invalid(def.id, hook + ' must be a function when present');
      }
    });
    if (def.digStrategy !== undefined && def.digStrategy !== null && typeof def.digStrategy !== 'string') {
      throw invalid(def.id, 'digStrategy must be a string when present');
    }
    checkClueFields(def);
  }

  /**
   * Adds a variant.
   * @param {VariantDef} def
   * @throws {SG.errors.GenerationError} 'variant.invalidDef' for a malformed definition,
   *         'variant.duplicate' when the id is already registered.
   */
  function register(def) {
    checkDefinition(def);
    if (definitions.has(def.id)) throw new SG.errors.GenerationError('variant.duplicate', { id: def.id });
    definitions.set(def.id, def);
  }

  /**
   * @param {string} id
   * @returns {VariantDef}
   * @throws {SG.errors.GenerationError} 'variant.unknown' when nothing is registered under `id`.
   */
  function get(id) {
    const def = definitions.get(id);
    if (def === undefined) throw new SG.errors.GenerationError('variant.unknown', { id: String(id) });
    return def;
  }

  /**
   * @param {string} id
   * @returns {boolean} Whether a variant with this id is registered.
   */
  function has(id) {
    return definitions.has(id);
  }

  /**
   * @returns {VariantDef[]} Every registered variant, in registration order (a fresh array).
   */
  function list() {
    return Array.from(definitions.values());
  }

  /**
   * Removes a variant. Meant for tests and tooling that register temporary variants.
   * @param {string} id
   * @returns {boolean} True when something was removed.
   */
  function unregister(id) {
    return definitions.delete(id);
  }

  // ---------------------------------------------------------------------------------------------
  // Options: one normalised schema for the UI, and the sanitiser that stands between the UI / URL and
  // `variant.build`.
  // ---------------------------------------------------------------------------------------------

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function stringOrNull() {
    for (let i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] === 'string' && arguments[i] !== '') return arguments[i];
    }
    return null;
  }

  function resolveDefinition(idOrDef) {
    if (typeof idOrDef === 'string') return get(idOrDef);
    if (idOrDef === null || typeof idOrDef !== 'object') {
      throw invalid(idOrDef, 'not a variant id or definition');
    }
    return idOrDef;
  }

  function normalizeChoice(def, id, choice) {
    if (choice !== null && typeof choice === 'object') {
      if (choice.value === undefined) throw invalid(def.id, 'option "' + id + '": a choice has no value');
      return { value: choice.value, labelKey: stringOrNull(choice.labelKey, choice.i18nKey) };
    }
    return { value: choice, labelKey: null };
  }

  function normalizeOption(def, raw) {
    if (raw === null || typeof raw !== 'object') throw invalid(def.id, 'an option must be an object');
    const id = raw.id;
    if (typeof id !== 'string' || id === '') throw invalid(def.id, 'an option needs a string id');
    const fail = function (reason) { return invalid(def.id, 'option "' + id + '": ' + reason); };
    if (OPTION_TYPES.indexOf(raw.type) === -1) {
      throw fail('type must be one of ' + OPTION_TYPES.join(', '));
    }
    const type = raw.type;
    const labelKey = stringOrNull(raw.labelKey, raw.i18nKey);
    if (labelKey === null) throw fail('it has no label key (i18nKey)');

    const item = {
      id: id,
      type: type,
      labelKey: labelKey,
      hintKey: stringOrNull(raw.hintKey, raw.hintI18nKey),
      default: raw.default,
      min: null,
      max: null,
      step: null,
      minLabelKey: stringOrNull(raw.minLabelKey),
      maxLabelKey: stringOrNull(raw.maxLabelKey),
      defaultLabelKey: stringOrNull(raw.defaultLabelKey),
      choices: [],
      advanced: raw.advanced === true,
      visibleWhen: raw.visibleWhen === undefined ? null : raw.visibleWhen,
      maxLength: null,
      placeholderKey: stringOrNull(raw.placeholderKey)
    };

    if (type === 'slider') {
      if (!(Number.isFinite(raw.min) && Number.isFinite(raw.max) && raw.min <= raw.max)) {
        throw fail('a slider needs finite min <= max');
      }
      item.min = raw.min;
      item.max = raw.max;
      item.step = Number.isFinite(raw.step) && raw.step > 0 ? raw.step : 1;
      if (item.default === undefined) item.default = item.min;
      if (!(Number.isFinite(item.default) && item.default >= item.min && item.default <= item.max)) {
        throw fail('the default must be a number between min and max');
      }
    } else if (type === 'select') {
      if (!Array.isArray(raw.choices) || raw.choices.length === 0) throw fail('a select needs choices');
      item.choices = raw.choices.map(function (c) { return normalizeChoice(def, id, c); });
      if (item.default === undefined) item.default = item.choices[0].value;
      if (!item.choices.some(function (c) { return c.value === item.default; })) {
        throw fail('the default must be one of the choices');
      }
    } else if (type === 'boolean') {
      if (item.default === undefined) item.default = false;
      if (typeof item.default !== 'boolean') throw fail('the default must be a boolean');
    } else {
      if (item.default === undefined) item.default = '';
      if (typeof item.default !== 'string') throw fail('the default must be a string');
      item.maxLength = Number.isInteger(raw.maxLength) && raw.maxLength > 0 ? raw.maxLength : null;
      if (item.maxLength !== null && item.default.length > item.maxLength) {
        throw fail('the default is longer than maxLength');
      }
    }
    return item;
  }

  /**
   * The options of a variant in ONE shape, whatever the variant declares: see `NormalizedOption`. Pure;
   * every call returns fresh objects (only `visibleWhen`, which passes through, is shared with the
   * definition). The UI builds its controls from this and never reads `def.options`.
   * @param {(string|VariantDef)} idOrDef  A registered variant id, or a definition (it need not be
   *        registered).
   * @returns {NormalizedOption[]}  In declaration order; [] for a variant without options.
   * @throws {SG.errors.GenerationError} 'variant.unknown' for an unknown id, 'variant.invalidDef' for an
   *         option that is malformed (no id, unknown type, a default outside min..max or the choices, ...).
   */
  function optionsOf(idOrDef) {
    const def = resolveDefinition(idOrDef);
    if (!Array.isArray(def.options)) throw invalid(def.id, 'options must be an array');
    const seen = new Set();
    return def.options.map(function (raw) {
      const item = normalizeOption(def, raw);
      if (seen.has(item.id)) throw invalid(def.id, 'option "' + item.id + '" is declared twice');
      seen.add(item.id);
      return item;
    });
  }

  /**
   * @param {(string|VariantDef)} idOrDef
   * @returns {Object<string, (number|string|boolean)>}  { optionId: default } for every option.
   */
  function defaultOptions(idOrDef) {
    const out = {};
    optionsOf(idOrDef).forEach(function (item) { out[item.id] = item.default; });
    return out;
  }

  function decimalsOf(x) {
    const text = String(x);
    const dot = text.indexOf('.');
    return dot === -1 || text.indexOf('e') !== -1 ? 0 : text.length - dot - 1;
  }

  function sanitizeSlider(item, value) {
    let v = value;
    if (typeof v === 'string' && v.trim() !== '') v = Number(v);
    if (typeof v !== 'number' || !Number.isFinite(v)) return item.default;
    v = Math.min(item.max, Math.max(item.min, v));
    const places = Math.min(12, decimalsOf(item.step) + decimalsOf(item.min));
    v = Number((item.min + Math.round((v - item.min) / item.step) * item.step).toFixed(places));
    return Math.min(item.max, Math.max(item.min, v));
  }

  function sanitizeBoolean(item, value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
    if (typeof value === 'string') {
      const text = value.trim().toLowerCase();
      if (text === 'true' || text === '1' || text === 'on' || text === 'yes') return true;
      if (text === 'false' || text === '0' || text === 'off' || text === 'no' || text === '') return false;
    }
    return item.default;
  }

  function sanitizeSelect(item, value) {
    for (let i = 0; i < item.choices.length; i++) {
      if (item.choices[i].value === value) return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      for (let i = 0; i < item.choices.length; i++) {
        if (String(item.choices[i].value) === String(value)) return item.choices[i].value;
      }
    }
    return item.default;
  }

  function sanitizeText(item, value) {
    if (typeof value === 'number' && Number.isFinite(value)) value = String(value);
    if (typeof value !== 'string') return item.default;
    let text = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (item.maxLength !== null) {
      text = text.slice(0, item.maxLength);
      if (/[\ud800-\udbff]$/.test(text)) text = text.slice(0, -1);
      text = text.trim();
    }
    return text;
  }

  /**
   * Turns whatever the UI or the URL layer holds into values `variant.build` can take: numbers are made
   * finite, clamped to min..max and snapped to the step, a select must name one of its choices, a boolean
   * is coerced ('true', 'false', 0, 1, ...), a text loses control characters, is trimmed and cut to
   * `maxLength`. A value that cannot be coerced becomes the option's default; a key that is not an option
   * of the variant is dropped. Keys that are absent stay absent (merge with `defaultOptions` for a complete
   * set): `Object.assign(defaultOptions(id), sanitizeOptions(id, raw))`. Idempotent. Never throws for bad
   * values.
   * @param {(string|VariantDef)} idOrDef
   * @param {*} raw  Normally a plain object { optionId: value }; anything else gives {}.
   * @returns {Object<string, (number|string|boolean)>}
   */
  function sanitizeOptions(idOrDef, raw) {
    const items = optionsOf(idOrDef);
    const out = {};
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return out;
    items.forEach(function (item) {
      if (!hasOwn(raw, item.id)) return;
      const value = raw[item.id];
      if (item.type === 'slider') out[item.id] = sanitizeSlider(item, value);
      else if (item.type === 'select') out[item.id] = sanitizeSelect(item, value);
      else if (item.type === 'boolean') out[item.id] = sanitizeBoolean(item, value);
      else out[item.id] = sanitizeText(item, value);
    });
    return out;
  }

  SG.variants = {
    register: register,
    get: get,
    has: has,
    list: list,
    unregister: unregister,
    optionsOf: optionsOf,
    defaultOptions: defaultOptions,
    sanitizeOptions: sanitizeOptions
  };
})(typeof self !== 'undefined' ? self : globalThis);
