/**
 * Logical solver: solves a puzzle the way a person does, one named technique at a time, and reports which
 * techniques were needed. In the player it is the engine behind the hints (the next step it finds, checked
 * against the solution, is what a hint explains); `score` is the plain design score and nothing is classified.
 *
 * Loop: try the registered techniques (techniques.js) in ascending `order`, apply the first Finding, record a
 * step and restart from the cheapest technique, until the grid is full, nothing applies ("stuck", a normal
 * result, never an error) or the budget runs out.
 *
 * Singles and the propagation engine (decision, please keep): `SG.constraints.propagate` places naked and hidden
 * singles on its own. Running it after every step would consume singles silently (neither attributed nor scored,
 * and `allowedTechniques: ['nakedSingle']` would still solve puzzles that need hidden singles). So the solver
 * never calls `propagate`: it starts from a peer-consistent grid (givens entered with `SG.constraints.assign`)
 * and applies every Finding with `assign` / `eliminate`, which only do peer elimination. Singles are then
 * ordinary techniques (tech-basic.js); rules that are not all-different (cage sums, inequalities) are likewise
 * left to their techniques. No propagate, place or dfs call is open while a technique runs, so the solver can be
 * used from anywhere, including recursively.
 *
 * `budget.check()` runs once per applied step and once before a puzzle is declared stuck; its errors propagate.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.logicalSolver && typeof SG.logicalSolver.solve === 'function') return;

  // score = sum over applications of baseCost x (first use of that technique ? firstUseMultiplier : 1)
  //         + (cells empty at the start) x emptyCellBonus
  const SCORING = Object.freeze({ firstUseMultiplier: 1.5, emptyCellBonus: 0.6 });

  const STUCK = 0;
  const SOLVED = 1;
  const CONTRADICTION = 2;
  const STATUS_NAMES = ['stuck', 'solved', 'contradiction'];

  function fail(code, args, text) {
    const err = new SG.errors.GenerationError(code, args);
    err.message = code + ': ' + text;
    return err;
  }

  function badFinding(tech, reason) {
    return fail('solver.invalidFinding', { technique: tech.id, reason: reason },
      'technique "' + tech.id + '" returned an invalid Finding: ' + reason);
  }

  /**
   * @typedef {Object} SolveOptions
   * @property {?string[]} [allowedTechniques=null]  Ids to use; null = every registered technique that
   *           applies. Ids that are registered but excluded by `variantScope` or `assumeUniqueness` are
   *           skipped; an id that is not registered throws 'solver.unknownTechnique'.
   * @property {boolean} [collectSteps=true]   Record `steps`. With false no step objects are built.
   * @property {Object} [budget]               A `SG.budget`; see the file header.
   * @property {boolean} [stopOnStuck=true]    When false and the loop is stuck, the remaining cells are
   *           completed with the DFS solver into `report.solution` (the stuck `state` is kept as it is).
   * @property {boolean} [assumeUniqueness=true]  When false, techniques that rely on a unique solution are
   *           skipped, which is how the solver can be used to verify uniqueness.
   * Any other key is passed through to the techniques as `ctx.options`.
   */

  /**
   * @typedef {Object} SolveReport
   * `status` is 'solved' | 'stuck' | 'contradiction' (the givens or a technique lead to an impossible grid; reported,
   * not thrown). `state` is the final state (for a stuck puzzle, where it got stuck). `steps` is empty unless
   * `collectSteps`. `hardestTechnique` is the used technique with the highest baseCost (ties: later in the ladder).
   * `solution` is a DFS solution when `stopOnStuck` is false and the loop got stuck, else null.
   */

  function normalizeOptions(options) {
    const src = options === undefined || options === null ? {} : options;
    if (typeof src !== 'object') {
      throw fail('solver.invalidOption', { option: 'options', reason: 'not an object' },
        'options must be an object, got ' + typeof src);
    }
    const opts = Object.assign({}, src);
    const allowed = src.allowedTechniques;
    if (allowed === undefined || allowed === null) {
      opts.allowedTechniques = null;
    } else if (!Array.isArray(allowed) || allowed.some(function (id) { return typeof id !== 'string'; })) {
      throw fail('solver.invalidOption', { option: 'allowedTechniques', reason: 'not an array of ids' },
        'allowedTechniques must be null or an array of technique ids');
    }
    opts.collectSteps = src.collectSteps === undefined ? true : !!src.collectSteps;
    opts.stopOnStuck = src.stopOnStuck === undefined ? true : !!src.stopOnStuck;
    opts.assumeUniqueness = src.assumeUniqueness === undefined ? true : !!src.assumeUniqueness;
    if (src.budget === undefined || src.budget === null) {
      opts.budget = null;
    } else if (typeof src.budget.check !== 'function') {
      throw fail('solver.invalidOption', { option: 'budget', reason: 'no check()' },
        'budget must provide a check() function (see SG.budget.create)');
    }
    return opts;
  }

  function buildLadder(model, opts) {
    let allowed = null;
    if (opts.allowedTechniques !== null) {
      allowed = new Set(opts.allowedTechniques);
      allowed.forEach(function (id) {
        if (!SG.techniques.has(id)) {
          throw fail('solver.unknownTechnique', { id: id }, 'allowedTechniques lists "' + id +
            '", which is not a registered technique');
        }
      });
    }
    return SG.techniques.list().filter(function (tech) {
      return (allowed === null || allowed.has(tech.id)) &&
        (opts.assumeUniqueness || !tech.assumesUniqueness) &&
        SG.techniques.appliesTo(tech, model.variantId);
    });
  }

  function loadGivens(model, state, givens) {
    const n = model.cellCount;
    if (!givens || givens.length !== n) {
      throw fail('solver.invalidGivens',
        { reason: 'length', expected: n, actual: givens ? givens.length : -1 },
        'givens must have one entry per cell (' + n + '), got ' + (givens ? givens.length : 'none'));
    }
    let ok = true;
    let empty = 0;
    for (let c = 0; c < n; c++) {
      const g = givens[c];
      if (g === 0) {
        empty++;
        continue;
      }
      if (!(Number.isInteger(g) && g >= 1 && g <= model.digits)) {
        throw fail('solver.invalidGivens', { reason: 'value', cell: c, value: String(g) },
          'givens[' + c + '] = ' + String(g) + ' is not 0 or a digit in 1..' + model.digits);
      }
      if (ok && !SG.constraints.assign(model, state, c, g)) ok = false;
    }
    return { ok: ok, empty: empty };
  }

  function checkFinding(tech, finding) {
    if (finding === null || typeof finding !== 'object') {
      throw badFinding(tech, 'a Finding must be an object or null, got ' + typeof finding);
    }
    if (finding.technique !== tech.id) {
      throw badFinding(tech, 'finding.technique is ' + JSON.stringify(finding.technique) + ', expected "' +
        tech.id + '"');
    }
    if (!Array.isArray(finding.placements) || !Array.isArray(finding.eliminations)) {
      throw badFinding(tech, 'placements and eliminations must both be arrays (use [] when there are none)');
    }
    if (!Array.isArray(finding.cells)) throw badFinding(tech, 'cells must be an array of cell indices');
    if (typeof finding.i18nKey !== 'string' || finding.i18nKey === '') {
      throw badFinding(tech, 'i18nKey must be a non-empty string');
    }
    if (finding.i18nArgs !== undefined &&
        (finding.i18nArgs === null || typeof finding.i18nArgs !== 'object')) {
      throw badFinding(tech, 'i18nArgs must be an object');
    }
    if (finding.placements.length === 0 && finding.eliminations.length === 0) {
      throw fail('solver.emptyFinding', { technique: tech.id },
        'technique "' + tech.id + '" returned a Finding with no placements and no eliminations; ' +
        'find() must return null when it has nothing to do');
    }
  }

  function checkCells(tech, cells, n) {
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (!(Number.isInteger(c) && c >= 0 && c < n)) {
        throw badFinding(tech, 'cells[' + i + '] = ' + String(c) + ' is not a cell index in 0..' + (n - 1));
      }
    }
  }

  function checkPair(tech, field, i, pair, n, digits) {
    if (!(Array.isArray(pair) && pair.length === 2 && Number.isInteger(pair[0]) && pair[0] >= 0 &&
          pair[0] < n && Number.isInteger(pair[1]) && pair[1] >= 1 && pair[1] <= digits)) {
      throw badFinding(tech, field + '[' + i + '] = ' + JSON.stringify(pair) +
        ' is not a [cell, value] pair with a cell in 0..' + (n - 1) + ' and a value in 1..' + digits);
    }
  }

  /**
   * Applies a validated Finding with `assign` / `eliminate`, ignoring placements and eliminations already in effect.
   * Returns the number of changes made, or -1 when the Finding leads to a contradiction.
   */
  function applyFinding(model, state, tech, finding, collect, effect) {
    const n = model.cellCount;
    const digits = model.digits;
    const cand = state.candidates;
    const val = state.value;
    const placements = finding.placements;
    const eliminations = finding.eliminations;
    const effP = collect ? [] : null;
    const effE = collect ? [] : null;
    let changed = 0;
    let i;
    for (i = 0; i < placements.length; i++) {
      const pair = placements[i];
      checkPair(tech, 'placements', i, pair, n, digits);
      const cell = pair[0];
      const value = pair[1];
      if (val[cell] === value) continue;
      if (!SG.constraints.assign(model, state, cell, value)) return -1;
      changed++;
      if (collect) effP.push([cell, value]);
    }
    for (i = 0; i < eliminations.length; i++) {
      const pair = eliminations[i];
      checkPair(tech, 'eliminations', i, pair, n, digits);
      const cell = pair[0];
      const value = pair[1];
      if ((cand[cell] & (1 << (value - 1))) === 0) continue;
      if (!SG.constraints.eliminate(model, state, cell, value)) return -1;
      changed++;
      if (collect) effE.push([cell, value]);
    }
    if (collect) {
      effect.placements = effP;
      effect.eliminations = effE;
    }
    return changed;
  }

  function sameState(a, b) {
    if (a.unsolvedCount !== b.unsolvedCount) return false;
    for (let i = 0; i < a.candidates.length; i++) {
      if (a.candidates[i] !== b.candidates[i] || a.value[i] !== b.value[i]) return false;
    }
    return true;
  }

  /** Runs the ladder until the grid is full or no technique applies; returns STUCK, SOLVED or CONTRADICTION. */
  function iterate(model, state, ladder, ctx, run) {
    const budget = ctx.budget;
    const collect = run.steps !== null;
    const debug = SG.DEBUG === true;
    const count = ladder.length;
    const counts = run.counts;
    const n = model.cellCount;
    const effect = { placements: null, eliminations: null };

    while (state.unsolvedCount > 0) {
      if (budget !== null) budget.check();

      let index = -1;
      let finding = null;
      for (let i = 0; i < count; i++) {
        const tech = ladder[i];
        const before = debug ? SG.model.cloneState(state) : null;
        const found = tech.find(model, state, ctx);
        if (debug && !sameState(before, state)) {
          throw fail('solver.stateMutated', { technique: tech.id }, 'technique "' + tech.id +
            '" modified the state inside find(); it must only read it and return a Finding');
        }
        if (found !== null && found !== undefined) {
          finding = found;
          index = i;
          break;
        }
      }
      if (finding === null) {
        // A technique that swallowed a budget error looks like "nothing found"; make it visible here.
        if (budget !== null) budget.check();
        return STUCK;
      }

      const tech = ladder[index];
      checkFinding(tech, finding);
      if (collect || debug) checkCells(tech, finding.cells, n);
      const changed = applyFinding(model, state, tech, finding, collect, effect);
      if (changed < 0) return CONTRADICTION;
      if (changed === 0) {
        throw fail('solver.noEffect', { technique: tech.id }, 'technique "' + tech.id +
          '" returned a Finding that changes nothing (every placement is already in place and every ' +
          'eliminated candidate is already gone); the solver would loop forever');
      }

      const first = counts[index]++ === 0;
      run.score += first ? tech.baseCost * SCORING.firstUseMultiplier : tech.baseCost;
      const hardest = run.hardest === -1 ? null : ladder[run.hardest];
      if (hardest === null || tech.baseCost > hardest.baseCost ||
          (tech.baseCost === hardest.baseCost && tech.order > hardest.order)) {
        run.hardest = index;
      }

      if (collect) {
        run.steps.push({
          technique: tech.id,
          i18nKey: finding.i18nKey,
          i18nArgs: finding.i18nArgs ? Object.assign({}, finding.i18nArgs) : {},
          cells: finding.cells.slice(),
          eliminations: effect.eliminations,
          placements: effect.placements
        });
      }
    }
    return SG.model.isSolution(model, state.value) ? SOLVED : CONTRADICTION;
  }

  function completeByDfs(model, state, budget) {
    const copy = SG.model.cloneState(state);
    if (!SG.constraints.propagate(model, copy, budget)) return null;
    return SG.dfs.searchFrom(model, copy, { limit: 1, budget: budget }).solution;
  }

  /**
   * Solves a puzzle with the registered human techniques. Throws 'solver.invalidGivens', 'solver.invalidOption',
   * 'solver.unknownTechnique', the bug guards 'solver.emptyFinding', 'solver.noEffect', 'solver.invalidFinding'
   * (and 'solver.stateMutated' with SG.DEBUG) naming the technique, and the budget's errors; never for a merely
   * stuck puzzle.
   */
  function solve(model, givens, options) {
    const opts = normalizeOptions(options);
    const ladder = buildLadder(model, opts);
    const state = SG.model.initState(model);
    const loaded = loadGivens(model, state, givens);
    const run = {
      counts: new Int32Array(ladder.length),
      score: loaded.empty * SCORING.emptyCellBonus,
      hardest: -1,
      steps: opts.collectSteps ? [] : null
    };

    const outcome = loaded.ok ? iterate(model, state, ladder, SG.techniques.createContext(model, opts), run)
      : CONTRADICTION;

    const techniqueCounts = {};
    for (let i = 0; i < ladder.length; i++) {
      if (run.counts[i] > 0) techniqueCounts[ladder[i].id] = run.counts[i];
    }
    return {
      solved: outcome === SOLVED,
      status: STATUS_NAMES[outcome],
      state: state,
      steps: run.steps === null ? [] : run.steps,
      techniqueCounts: techniqueCounts,
      hardestTechnique: run.hardest === -1 ? null : ladder[run.hardest].id,
      score: Math.round(run.score * 1e6) / 1e6,
      solution: outcome === STUCK && !opts.stopOnStuck ? completeByDfs(model, state, opts.budget) : null
    };
  }

  SG.logicalSolver = { solve: solve, SCORING: SCORING };
})(typeof self !== 'undefined' ? self : globalThis);
