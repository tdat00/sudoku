/**
 * Technique registry: the human solving techniques the logical solver (logical-solver.js) can use. Every technique
 * lives in its own file (tech-basic.js, tech-subset.js, ...) and registers itself here, so adding one never touches
 * the solver.
 *
 * CONTRACT FOR TECHNIQUE AUTHORS
 *
 * Registering (at load time, in your own tech-*.js file):
 *
 *   SG.techniques.register({
 *     id: 'xWing',                  // unique, camelCase (/^[A-Za-z][A-Za-z0-9_]*$/), key in techniqueCounts
 *     group: 'fish',                // one of SG.techniques.GROUPS
 *     baseCost: 32,                 // score of one application (ladder table below), finite number > 0
 *     order: 110,                   // position in the loop, cheap -> expensive (ladder table below)
 *     i18nKey: 'technique.xWing',   // translation key of the technique NAME
 *     variantScope: null,           // null = every variant; or ['killer'] = only models with that variantId
 *     assumesUniqueness: false,     // true ONLY when the deduction relies on "the puzzle has one solution"
 *     find: function (model, state, ctx) { return finding || null; }
 *   });
 *
 * `variantScope` and `assumesUniqueness` may be left out (defaults null / false). Any other missing or invalid field,
 * and any key that is not listed above (a typo such as `assumeUniqueness` is the classic one), throws
 * SG.errors.GenerationError 'technique.invalidDef'; a duplicate id throws 'technique.duplicate'.
 * `assumesUniqueness: true` techniques (Unique Rectangle) are skipped when the solver is called with
 * `assumeUniqueness: false`, which is how uniqueness is verified without circular reasoning.
 *
 * What find(model, state, ctx) must do:
 *   - READ `state`, never write to it (no SG.constraints.eliminate/assign/place/propagate on `state`). The solver
 *     applies the Finding itself, which is what keeps attribution and scoring correct. With SG.DEBUG on, the solver
 *     throws 'solver.stateMutated' when a technique changes the state. A technique that needs a trial (Nishio, chains)
 *     works on its OWN copy, `SG.model.cloneState(state)`; running SG.constraints.propagate or SG.dfs.* on that copy is
 *     fine, because the solver never has an engine call open while find runs (the engine keeps per-model scratch
 *     buffers, so it is not re-entrant), and this is covered by tests. Never do it from inside a SG.constraints
 *     extension.
 *   - Return null when the technique does not apply. Otherwise return ONE deduction (one pattern instance, the first
 *     one found in a deterministic scan order; no randomness): the solver applies it, records one step and asks the
 *     whole ladder again from its first technique (ascending `order`).
 *   - Work on any unit shape: use model.units / model.cellUnits / model.peers, never assume rows, columns or 3x3
 *     boxes. A unit is "complete" (a digit must appear in it exactly once) only when `ctx.completeUnits[u] === 1`
 *     (size === digits and not `partial`); hidden-single style reasoning is only valid on those.
 *   - A cell is solved when `state.value[c] !== 0`; its candidates are then just its own value.
 *   - Return a Finding that CHANGES the state: at least one placement into a still open cell or one elimination of a
 *     candidate that is currently present. List only real eliminations. A Finding with no placements and no
 *     eliminations, or one that changes nothing, would loop forever, so the solver throws 'solver.emptyFinding' /
 *     'solver.noEffect' naming the technique.
 *   - Call `ctx.check()` inside long loops (budget). An expensive technique may catch the
 *     'budget.exceeded' error and return null; it must not swallow any other error.
 *
 * Finding (the return value of find):
 *
 *   {
 *     technique: 'xWing',                  // MUST equal the id of the technique returning it
 *     cells: [12, 14, 48, 50],             // cells that justify the deduction, for highlighting (indices)
 *     placements: [[cell, value], ...],    // values to fix; [] when there are none
 *     eliminations: [[cell, value], ...],  // candidates to remove; [] when there are none
 *     i18nKey: 'technique.xWing.step',     // translation key of the explanation of THIS step
 *     i18nArgs: { digit: 5, unit: 'R4' }   // plain JSON data for the translation (no functions)
 *   }
 *
 * `cell` is a 0-based cell index, `value` a 1-based digit. `placements`, `eliminations` and `cells` must be
 * arrays (the solver copies them before storing a step, so a technique may reuse its own buffers).
 *
 * ctx (the same object for every find call of one solve; frozen):
 *   ctx.check()              budget check, a no-op when the caller gave no budget
 *   ctx.budget               the budget object or null
 *   ctx.assumeUniqueness     the option of the solver call (only matters to a technique that cares)
 *   ctx.digits, ctx.fullMask D and the mask of all digits
 *   ctx.completeUnits        Uint8Array over units: 1 = complete unit (see above)
 *   ctx.options              the (normalised) options of the solver call; unknown keys pass through, so
 *                            solve(model, givens, { maxChainLength: 8 }) shows as ctx.options.maxChainLength
 *
 * Ladder: `order` follows the cost, so a cheaper deduction is never skipped for a dearer one. Ties are broken by
 * baseCost, then id.
 *
 *   id                 group    baseCost  order | id                 group    baseCost  order
 *   nakedSingle        basic        1       10  | xWing              fish        32      110
 *   hiddenSingleBox    basic        2       20  | simpleColouring    fish        36      120
 *   hiddenSingleLine   basic        3       30  | swordfish          fish        42      130
 *   pointing           locked       7       40  | xyWing             wing        48      140
 *   boxLine            locked       7       50  | xyzWing            wing        54      150
 *   nakedPair          subset       9       60  | jellyfish          fish        56      160
 *   hiddenPair         subset      11       70  | wWing              wing        60      170
 *   nakedTriple        subset      15       80  | uniqueRectangle*   wing        66      180
 *   hiddenTriple       subset      18       90  | forcingChain       chain       90      190
 *   nakedQuad          subset      24      100  | nishio             chain      140      200
 *   hiddenQuad         subset      24      105  |      (* assumesUniqueness: true)
 * The variant specific techniques (cage, ineq groups) are interleaved by cost; see their tech-*.js headers.
 *
 * hiddenSingleBox covers every unit that is not a row or a column (box, region, diagonal, window: 2 points),
 * hiddenSingleLine covers rows and columns (3 points), which is how the ladder scores them apart.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first registry on repeated loads: the techniques registered so far must survive.
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

  // Adds a technique; the stored definition is a frozen, normalised copy (`variantScope` is null or a frozen array,
  // `assumesUniqueness` is always a boolean). Throws 'technique.invalidDef' for a missing, invalid or unknown field,
  // 'technique.duplicate' when the id is already registered.
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

  // For tests and tooling that register temporary techniques.
  function unregister(id) {
    const removed = byId.delete(id);
    if (removed) resort();
    return removed;
  }

  function has(id) {
    return byId.has(id);
  }

  // Throws 'technique.unknown' when nothing is registered under `id`.
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

  // Builds the `ctx` argument of `find` (see the file header); the logical solver creates one per solve, tests that call
  // a technique directly create their own. Only `budget` and `assumeUniqueness` (default true) of `options` are read
  // here; the whole object is exposed as `ctx.options`.
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
