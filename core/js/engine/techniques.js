/**
 * Technique registry: the human solving techniques the logical solver (logical-solver.js) can use. Every
 * technique lives in its own tech-*.js file and registers itself here, so adding one never touches the
 * solver.
 *
 * CONTRACT FOR TECHNIQUE AUTHORS
 *
 *   SG.techniques.register({
 *     id: 'xWing',                  // unique, /^[A-Za-z][A-Za-z0-9_]*$/, key in techniqueCounts
 *     group: 'fish',                // one of SG.techniques.GROUPS
 *     baseCost: 32,                 // score of one application, finite number > 0
 *     order: 110,                   // position in the loop, cheap -> expensive (ties: baseCost, then id)
 *     i18nKey: 'technique.xWing',   // translation key of the technique NAME
 *     variantScope: null,           // null = every variant; or ['killer'] = only models with that variantId
 *     assumesUniqueness: false,     // true ONLY when the deduction relies on "the puzzle has one solution"
 *     find: function (model, state, ctx) { return finding || null; }
 *   });
 *
 * `variantScope` and `assumesUniqueness` may be left out. Any other missing or invalid field, and any unknown
 * key (a typo such as `assumeUniqueness` is the classic one), throws GenerationError 'technique.invalidDef';
 * a duplicate id throws 'technique.duplicate'. `assumesUniqueness: true` techniques (Unique Rectangle) are
 * skipped when the solver runs with `assumeUniqueness: false`, which verifies uniqueness without circular
 * reasoning. `order` follows the cost so a cheaper deduction is never skipped for a dearer one.
 * hiddenSingleBox covers every unit that is not a row or column (2 points), hiddenSingleLine rows and columns
 * (3 points).
 *
 * What find(model, state, ctx) must do:
 *   - READ `state`, never write to it (no SG.constraints.eliminate/assign/place/propagate on it): the solver
 *     applies the Finding itself, which keeps attribution and scoring correct. With SG.DEBUG on, a changed
 *     state throws 'solver.stateMutated'. A technique that needs a trial (Nishio, chains) works on its OWN
 *     copy, `SG.model.cloneState(state)`; propagate or SG.dfs.* on that copy is fine because the solver never
 *     has an engine call open while find runs (the engine keeps per-model scratch buffers and is not
 *     re-entrant). Never do it from inside a SG.constraints extension.
 *   - Return null when the technique does not apply; otherwise ONE deduction (one pattern instance, the first
 *     in a deterministic scan order, no randomness). The solver applies it, records one step and asks the
 *     whole ladder again from the cheapest technique.
 *   - Work on any unit shape (model.units / cellUnits / peers); never assume rows, columns or 3x3 boxes. A
 *     unit is "complete" (a digit appears exactly once) only when `ctx.completeUnits[u] === 1` (size ===
 *     digits and not `partial`); hidden-single style reasoning is only valid on those.
 *   - A cell is solved when `state.value[c] !== 0`; its candidates are then just its own value.
 *   - Return a Finding that CHANGES the state: a placement into a still open cell or an elimination of a
 *     present candidate; list only real ones. Otherwise the loop would never end, so the solver throws
 *     'solver.emptyFinding' / 'solver.noEffect' naming the technique.
 *   - Call `ctx.check()` inside long loops. An expensive technique may catch 'budget.exceeded' and return
 *     null; it must not swallow any other error.
 *
 * Finding:
 *   {
 *     technique: 'xWing',                  // MUST equal the id of the technique returning it
 *     cells: [12, 14, 48, 50],             // cells that justify the deduction, for highlighting
 *     placements: [[cell, value], ...],    // values to fix; [] when none
 *     eliminations: [[cell, value], ...],  // candidates to remove; [] when none
 *     i18nKey: 'technique.xWing.step',     // translation key of the explanation of THIS step
 *     i18nArgs: { digit: 5, unit: 'R4' }   // plain JSON data for the translation (no functions)
 *   }
 * `cell` is a 0-based index, `value` a 1-based digit. The solver copies the arrays before storing a step, so
 * a technique may reuse its own buffers.
 *
 * ctx (one frozen object per solve):
 *   ctx.check()              budget check, a no-op without a budget
 *   ctx.budget               the budget object or null
 *   ctx.assumeUniqueness     the option of the solver call
 *   ctx.digits, ctx.fullMask D and the mask of all digits
 *   ctx.completeUnits        Uint8Array over units: 1 = complete unit
 *   ctx.options              the normalised solver options; unknown keys pass through, so
 *                            solve(model, givens, { maxChainLength: 8 }) shows as ctx.options.maxChainLength
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.techniques && typeof SG.techniques.register === 'function') return;

  const GROUPS = Object.freeze(['basic', 'locked', 'subset', 'fish', 'wing', 'chain', 'cage', 'ineq']);

  const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
  const ALLOWED_KEYS = ['id', 'group', 'baseCost', 'order', 'i18nKey', 'variantScope', 'assumesUniqueness',
    'find'];

  const byId = new Map();
  let sorted = [];

  const modelInfo = new WeakMap();

  function noop() {}

  function invalid(id, reason) {
    const err = new SG.errors.GenerationError('technique.invalidDef', { id: String(id), reason: reason });
    err.message = 'technique.invalidDef: technique "' + String(id) + '": ' + reason;
    return err;
  }

  function isNonEmptyString(x) {
    return typeof x === 'string' && x !== '';
  }

  function validate(def) {
    if (def === null || typeof def !== 'object') throw invalid(undefined, 'definition must be an object');
    const id = def.id;
    if (!isNonEmptyString(id) || !ID_PATTERN.test(id)) {
      throw invalid(id, 'id must be a string matching ' + ID_PATTERN);
    }
    Object.keys(def).forEach(function (key) {
      if (ALLOWED_KEYS.indexOf(key) === -1) {
        throw invalid(id, 'unknown field "' + key + '" (allowed: ' + ALLOWED_KEYS.join(', ') + ')');
      }
    });
    if (GROUPS.indexOf(def.group) === -1) {
      throw invalid(id, 'group must be one of ' + GROUPS.join(', ') + ', got ' + String(def.group));
    }
    if (!(typeof def.baseCost === 'number' && isFinite(def.baseCost) && def.baseCost > 0)) {
      throw invalid(id, 'baseCost must be a finite number > 0, got ' + String(def.baseCost));
    }
    if (!(typeof def.order === 'number' && isFinite(def.order))) {
      throw invalid(id, 'order must be a finite number, got ' + String(def.order));
    }
    if (!isNonEmptyString(def.i18nKey)) throw invalid(id, 'i18nKey must be a non-empty string');
    if (def.variantScope !== undefined && def.variantScope !== null &&
        !(Array.isArray(def.variantScope) && def.variantScope.length > 0 &&
          def.variantScope.every(isNonEmptyString))) {
      throw invalid(id, 'variantScope must be null or a non-empty array of variant ids');
    }
    if (def.assumesUniqueness !== undefined && typeof def.assumesUniqueness !== 'boolean') {
      throw invalid(id, 'assumesUniqueness must be a boolean, got ' + String(def.assumesUniqueness));
    }
    if (typeof def.find !== 'function') throw invalid(id, 'find must be a function');
  }

  function compare(a, b) {
    if (a.order !== b.order) return a.order - b.order;
    if (a.baseCost !== b.baseCost) return a.baseCost - b.baseCost;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }

  function resort() {
    sorted = Array.from(byId.values()).sort(compare);
  }

  /**
   * Adds a technique; the stored definition is a frozen, normalised copy (`variantScope` null or a frozen
   * array, `assumesUniqueness` always a boolean). Throws 'technique.invalidDef' / 'technique.duplicate'.
   */
  function register(def) {
    validate(def);
    if (byId.has(def.id)) {
      const err = new SG.errors.GenerationError('technique.duplicate', { id: def.id });
      err.message = 'technique.duplicate: technique "' + def.id + '" is already registered';
      throw err;
    }
    const stored = Object.freeze({
      id: def.id,
      group: def.group,
      baseCost: def.baseCost,
      order: def.order,
      i18nKey: def.i18nKey,
      variantScope: def.variantScope ? Object.freeze(def.variantScope.slice()) : null,
      assumesUniqueness: def.assumesUniqueness === true,
      find: def.find
    });
    byId.set(stored.id, stored);
    resort();
    return stored;
  }

  function unregister(id) {
    const removed = byId.delete(id);
    if (removed) resort();
    return removed;
  }

  function has(id) {
    return byId.has(id);
  }

  function get(id) {
    const def = byId.get(id);
    if (def === undefined) {
      const err = new SG.errors.GenerationError('technique.unknown', { id: String(id) });
      err.message = 'technique.unknown: no technique "' + String(id) + '" is registered';
      throw err;
    }
    return def;
  }

  function list() {
    return sorted.slice();
  }

  function appliesTo(def, variantId) {
    return def.variantScope === null || def.variantScope.indexOf(variantId) !== -1;
  }

  function infoFor(model) {
    let info = modelInfo.get(model);
    if (info === undefined) {
      const completeUnits = new Uint8Array(model.units.length);
      for (let u = 0; u < completeUnits.length; u++) {
        const meta = model.unitMeta[u];
        completeUnits[u] = model.units[u].length === model.digits && !(meta && meta.partial) ? 1 : 0;
      }
      info = { completeUnits: completeUnits, fullMask: SG.bits.full(model.digits) };
      modelInfo.set(model, info);
    }
    return info;
  }

  /**
   * Builds the `ctx` argument of `find` (the logical solver creates one per solve; tests that call a
   * technique directly create their own). Only `budget` and `assumeUniqueness` (default true) are read from
   * `options`; the whole object is exposed as `ctx.options`.
   */
  function createContext(model, options) {
    const opts = options || {};
    const info = infoFor(model);
    const budget = opts.budget || null;
    return Object.freeze({
      options: opts,
      budget: budget,
      check: budget === null ? noop : function check() { budget.check(); },
      assumeUniqueness: opts.assumeUniqueness !== false,
      digits: model.digits,
      fullMask: info.fullMask,
      completeUnits: info.completeUnits
    });
  }

  SG.techniques = {
    GROUPS: GROUPS,
    register: register,
    unregister: unregister,
    has: has,
    get: get,
    list: list,
    appliesTo: appliesTo,
    createContext: createContext
  };
})(typeof self !== 'undefined' ? self : globalThis);
