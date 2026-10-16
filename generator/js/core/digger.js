/**
 * Hole digger (design.md section 6.8): starting from a full solution, clues are removed one symmetry group
 * at a time, and a removal is kept only while an oracle says the puzzle is still acceptable.
 *
 * Stage A, `dig` (the engine, also usable on its own):
 *  1. The cells are put into a fixed digging sequence once, so each cell is considered exactly once.
 *  2. Symmetric cells (see SG.symmetry) are dug and restored together as one group.
 *  3. Cheap filters run before any solver call: the `minClues` floor, the `minCluesPerUnit` floor and the
 *     `rejected` map of cells that already failed.
 *  4. The oracle is one of two functions. `oracleKeepsUnique` (the default) is `SG.dfs.stillUnique`, which
 *     tests only the alternative values of the removed cell. `techniqueOracle` is the technique-bounded
 *     oracle of section 6.8 (4): the removal is kept only while the logical solver still finishes the puzzle
 *     with the techniques of the requested level, which keeps the puzzle unique AND inside the level.
 *
 * Stage B, `digLevel` (one attempt at a level) and `generate` (the restart loop):
 *  - `digLevel` runs stage A down to about half the clues, then `digGuided`, which repeatedly takes the
 *    removal that makes the puzzle hardest (never past the band of the level), rates the result once and
 *    re-verifies it with `SG.dfs.countSolutions` (safety net against technique bugs, risk R3).
 *  - `generate` repeats that over fresh grids and several dig samples per grid until a puzzle is rated
 *    exactly the requested level; if every attempt is used it returns the closest puzzle and the warning
 *    'difficulty.approximate'. It never throws for that and never loops without bound.
 *
 * Why stage B is guided and not "dig further with a relaxed oracle" as design.md sketches: a puzzle that
 * stage A has finished is minimal (every remaining clue is needed for uniqueness itself), so a relaxed
 * oracle finds nothing more to remove. And random minimal puzzles need nothing beyond singles about three
 * times in four, so the hardest levels would be hit far too rarely. See digGuided.
 *
 * Pipeline seams (design.md section 7.1). `digLevel` runs three steps, each one a pipeline step of its own:
 *  - 'dig'   a dig strategy (default `digStage`: stage A, then stage B, the guided dig), then the safety net:
 *            the puzzle is re-verified with `SG.dfs.countSolutions` and replaced by a plain DFS dig if a
 *            technique bug made it ambiguous. This is "dig holes with validation".
 *  - 'rate'  one full rating of the finished puzzle (the deferred rating of design.md section 6.8 (5)).
 *  - 'tune'  the band check: does the rating hit the requested level? (`tune.hit` / `tune.miss`.)
 * `generate` is the restart loop around them: per attempt a full grid ('fullGrid'), the variant's
 * `postGenerate` ('extraStructure'), then up to `digTries` runs of dig, rate, tune. Each step goes through
 * `options.stage(stepId, args, fn)`. A caller that owns the step events (the pipeline) passes its own stage
 * runner and the variant hooks; called directly, the digger uses a plain runner. Either way the random
 * streams are forked by the same names, so the puzzle never depends on who calls.
 *
 * Resumable form. `dig`, `digStage`, `digLevel` and `generate` each have a generator twin (`digSteps`,
 * `digStageSteps`, `digLevelSteps`, `generateSteps`) that yields at the natural boundaries of the work when
 * `options.cooperative` is set; the synchronous function is its twin driven to the end (`SG.budget.drive`),
 * so events, random draws, budget accounting and results are the same. This is what lets a scheduler run a
 * generation in slices (see `SG.pipeline.runSteps`, `SG.workerClient`). A dig strategy takes part by
 * returning an iterator instead of its result when it is called with `cooperative: true` (Killer's wraps
 * `digStage`, Greater-Than's `digSigns` has its own twin); one that does not is a single piece of work for
 * the scheduler. A variant hook (`postGenerate`) takes part through a twin `postGenerate.steps` (Killer's
 * cage layout).
 *
 * Events (design.md section 7): `options.emit` takes an emitter from `SG.events` or a plain function. The
 * dig functions pick their instrumentation once, at entry: with a quiet emitter (no sink, 'off') they use
 * `NO_TRACE`, whose methods do nothing, so the loops carry no event code; 'summary' adds a throttled
 * `metric` per group, 'full' adds the `dig.*` micro events.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  /** Supported dig sequences. */
  const ORDERS = ['random', 'rowByRow', 'snake', 'spiral', 'jumpOne'];

  function noop() {}

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  /** Runs a stepper (the generator of a `*Steps` function) to its end, see `SG.budget.drive`. */
  function drive(steps) {
    return SG.budget.drive(steps);
  }

  function defaultNow() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now() : Date.now();
  }

  // ---------------------------------------------------------------------------------------------
  // Steps: the resumable form of the restart loop
  // ---------------------------------------------------------------------------------------------

  /**
   * Creates the stage runner of a stepper: the generator version of `SG.events.createStageRunner`, with the
   * same events, budget check, timings and `current`. Used as `yield* stage(stepId, args, body)`;
   * `body(scope)` returns a value or an iterator (which is run inside the step), and the value of the step is
   * returned. With `options.cooperative` it yields after every step, a boundary where the caller may give the
   * thread away (a step is the smallest piece of the work that is not itself resumable).
   *
   * @param {Emitter} emitter
   * @param {Object} [options]
   * @param {Object} [options.budget]   A `SG.budget`; checked at every step start.
   * @param {Object} [options.timings]  Collects milliseconds per step id (default: a new object).
   * @param {function(): number} [options.now]  Clock of the timings; pass an active clock (`SG.budget
   *        .createClock`) so that time given away between slices is not counted.
   * @param {boolean} [options.cooperative=false]
   * @returns {function(string, Object, function(Object): *): Generator} The stage runner; `.current` is the
   *          id of the step that is running (or failed), `.timings` the milliseconds per step id, and
   *          `.isStepStage` is true.
   */
  function createStageSteps(emitter, options) {
    options = options || {};
    const budget = options.budget || null;
    const now = typeof options.now === 'function' ? options.now : defaultNow;
    const coop = options.cooperative === true;
    const timings = options.timings || {};
    SG.events.STEP_IDS.forEach(function (id) { if (timings[id] === undefined) timings[id] = 0; });

    function* stage(stepId, args, body) {
      const t0 = now();
      stage.current = stepId;
      try {
        emitter.step(stepId, 'start', stepId + '.start', args);
        if (budget !== null) budget.check();
        const scope = { args: undefined, metrics: undefined };
        let result = body(scope);
        if (SG.budget.isSteps(result)) result = yield* result;
        emitter.step(stepId, 'end', stepId + '.end', scope.args, scope.metrics);
        stage.current = null;
        if (coop) yield;
        return result;
      } finally {
        timings[stepId] = (timings[stepId] || 0) + (now() - t0);
      }
    }
    stage.current = null;
    stage.timings = timings;
    stage.isStepStage = true;
    return stage;
  }

  /**
   * The stage runner of a call: the one in `options.stage` when it is a stepper stage, a plain runner of
   * `SG.events.createStageRunner` wrapped so that it can be used with `yield*` (its steps then run to the end
   * without yielding), or a new stepper stage.
   */
  function resolveStage(options, em, budget) {
    const given = options.stage;
    if (given === undefined || given === null) {
      return createStageSteps(em, { budget: budget, cooperative: options.cooperative === true });
    }
    if (given.isStepStage === true) return given;
    const plain = function* plainStage(stepId, args, body) {
      return given(stepId, args, function (scope) { return drive(body(scope)); });
    };
    plain.isStepStage = true;
    return plain;
  }

  // ---------------------------------------------------------------------------------------------
  // Dig sequences. Rows and columns are canvas coordinates, so they also work for overlapping grids.
  // ---------------------------------------------------------------------------------------------

  function rowMajor(model) {
    const layout = model.layout;
    const cells = [];
    for (let c = 0; c < model.cellCount; c++) cells.push(c);
    return cells.sort(function (a, b) {
      return layout.cellRow[a] - layout.cellRow[b] || layout.cellCol[a] - layout.cellCol[b];
    });
  }

  function snakeOrder(model) {
    const layout = model.layout;
    return rowMajor(model).sort(function (a, b) {
      const ra = layout.cellRow[a];
      const rb = layout.cellRow[b];
      if (ra !== rb) return ra - rb;
      return ra % 2 === 0 ? layout.cellCol[a] - layout.cellCol[b] : layout.cellCol[b] - layout.cellCol[a];
    });
  }

  /** Clockwise spiral from the top-left corner towards the centre of the canvas. */
  function spiralOrder(model) {
    const layout = model.layout;
    const R = layout.rows;
    const C = layout.cols;
    const at = new Int32Array(R * C).fill(-1);
    for (let c = 0; c < model.cellCount; c++) at[layout.cellRow[c] * C + layout.cellCol[c]] = c;
    const cells = [];
    let top = 0;
    let bottom = R - 1;
    let left = 0;
    let right = C - 1;
    function visit(r, c) {
      if (at[r * C + c] !== -1) cells.push(at[r * C + c]);
    }
    while (top <= bottom && left <= right) {
      let i;
      for (i = left; i <= right; i++) visit(top, i);
      for (i = top + 1; i <= bottom; i++) visit(i, right);
      if (top < bottom) for (i = right - 1; i >= left; i--) visit(bottom, i);
      if (left < right) for (i = bottom - 1; i > top; i--) visit(i, left);
      top++;
      bottom--;
      left++;
      right--;
    }
    return cells;
  }

  /** Row-major positions 0, 2, 4, ... first, then 1, 3, 5, ... (jumping over one cell each time). */
  function jumpOneOrder(model) {
    const ordered = rowMajor(model);
    const out = [];
    let i;
    for (i = 0; i < ordered.length; i += 2) out.push(ordered[i]);
    for (i = 1; i < ordered.length; i += 2) out.push(ordered[i]);
    return out;
  }

  /**
   * Cell sequence for a dig order.
   * @param {PuzzleModel} model
   * @param {string} order  One of `SG.digger.ORDERS`.
   * @param {Rng} rng       Only used by 'random'.
   * @returns {number[]}
   */
  function cellSequence(model, order, rng) {
    switch (order) {
      case 'random': {
        const cells = [];
        for (let c = 0; c < model.cellCount; c++) cells.push(c);
        return rng.shuffle(cells);
      }
      case 'rowByRow': return rowMajor(model);
      case 'snake': return snakeOrder(model);
      case 'spiral': return spiralOrder(model);
      case 'jumpOne': return jumpOneOrder(model);
      default: throw fail('digger.invalidOption', { option: 'order', value: String(order) });
    }
  }

  /** Orders the symmetry groups by the first time the sequence reaches one of their cells. */
  function groupSequence(sequence, groups, n) {
    const groupOf = new Int32Array(n);
    groups.forEach(function (g, index) {
      for (let i = 0; i < g.length; i++) groupOf[g[i]] = index;
    });
    const seen = new Uint8Array(groups.length);
    const out = [];
    for (let i = 0; i < sequence.length; i++) {
      const gi = groupOf[sequence[i]];
      if (seen[gi] === 0) {
        seen[gi] = 1;
        out.push(groups[gi]);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // Oracle
  // ---------------------------------------------------------------------------------------------

  /**
   * Oracle of stage A for 'evil' and for plain digging: does the puzzle still have exactly one solution
   * after the cells of `group` were removed from `givens`? The cells are checked one after the other, each
   * with the unique-solution check of section 6.5. That is exact: removing more clues never removes
   * solutions, so if the whole group can go, every prefix of it can.
   * On entry the cells of `group` are already cleared in `givens`; `solution` holds their true values.
   */
  function oracleKeepsUnique(model, givens, solution, group, budget, stats) {
    for (let i = 0; i < group.length; i++) {
      const cell = group[i];
      // The clues of group cells that come later are still present while this one is checked.
      for (let j = i + 1; j < group.length; j++) givens[group[j]] = solution[group[j]];
      stats.oracleCalls++;
      const ok = SG.dfs.stillUnique(model, givens, cell, solution[cell], budget);
      for (let j = i + 1; j < group.length; j++) givens[group[j]] = 0;
      if (!ok) return false;
    }
    return true;
  }

  /**
   * Oracle of stage A for the levels 'veryEasy' .. 'expert' (design.md section 6.8 (4)): can the puzzle still
   * be solved completely using only the allowed techniques? One question answers both "still unique" and
   * "still inside the difficulty band": every technique is sound, so a puzzle that a sequence of sound
   * deductions solves entirely has exactly one solution. Techniques that rely on uniqueness are switched off
   * (`assumeUniqueness: false`), otherwise the reasoning would be circular.
   * @param {string[]} allowed  Technique ids.
   * @returns {function(PuzzleModel, Int32Array, ArrayLike<number>, Int32Array, ?Object, Object): boolean}
   */
  function techniqueOracle(allowed) {
    const options = {
      allowedTechniques: allowed,
      collectSteps: false,
      assumeUniqueness: false,
      budget: null
    };
    return function oracleSolvesWithin(model, givens, solution, group, budget, stats) {
      stats.oracleCalls++;
      options.budget = budget;
      return SG.logicalSolver.solve(model, givens, options).solved;
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------------------------

  /**
   * Would every unit that a group touches keep at least `minPerUnit` clues after the group is removed?
   * `unitClues` (clues per unit) is left unchanged.
   */
  function unitsStayFilled(model, unitClues, group, minPerUnit) {
    let ok = true;
    let i;
    let j;
    for (i = 0; i < group.length; i++) {
      const us = model.cellUnits[group[i]];
      for (j = 0; j < us.length; j++) unitClues[us[j]]--;
    }
    for (i = 0; i < group.length && ok; i++) {
      const us = model.cellUnits[group[i]];
      for (j = 0; j < us.length; j++) {
        if (unitClues[us[j]] < minPerUnit) {
          ok = false;
          break;
        }
      }
    }
    for (i = 0; i < group.length; i++) {
      const us = model.cellUnits[group[i]];
      for (j = 0; j < us.length; j++) unitClues[us[j]]++;
    }
    return ok;
  }

  /**
   * Instrumentation of the dig loops. `NO_TRACE` is what a quiet emitter gets: every method does nothing, so
   * the loops call it unconditionally and pay one empty call per group.
   */
  const NO_TRACE = {
    skip: noop, tryGroup: noop, accept: noop, reject: noop, keep: noop, pass: noop, tick: noop
  };

  /**
   * Picks the instrumentation for one run of a dig loop from what the emitter wants.
   * @param {Emitter} em
   * @param {function(): Object} metrics  Current { clues, accepted, rejected, attempts }.
   * @returns {Object} `NO_TRACE`, a metric-only tracer ('summary') or the full tracer ('full').
   */
  function createTracer(em, metrics) {
    if (!em.wantsMetrics) return NO_TRACE;
    function tick() {
      em.metric('dig', metrics);
    }
    if (!em.wantsMicro) {
      return { skip: tick, tryGroup: noop, accept: tick, reject: tick, keep: noop, pass: noop, tick: tick };
    }
    return {
      skip: function skip(group, reason) {
        em.micro('dig', 'dig.skip', { cells: Array.from(group), reason: reason }, undefined, metrics());
        tick();
      },
      tryGroup: function tryGroup(cells, pass) {
        em.micro('dig', 'dig.try', { cells: cells.slice(), pass: pass }, { highlight: cells.slice() },
          metrics());
      },
      accept: function accept(cells) {
        em.micro('dig', 'dig.accept', { cells: cells.slice() }, {
          cells: cells.map(function (c) { return { i: c, value: 0, state: 'empty' }; }),
          unhighlight: cells.slice()
        }, metrics());
        tick();
      },
      reject: function reject(cells, reason) {
        em.micro('dig', 'dig.reject', { cells: cells.slice(), reason: reason },
          { unhighlight: cells.slice() }, metrics());
        tick();
      },
      keep: function keep(cells, score) {
        const shown = score >= STUCK_SCORE ? null : Math.round(score);
        em.micro('dig', 'dig.keep', { cells: cells.slice(), score: shown },
          { unhighlight: cells.slice() }, metrics());
      },
      pass: function pass(kind, phase, clues) {
        em.micro('dig', 'dig.pass.' + phase, { pass: kind, clues: clues }, undefined, metrics());
      },
      tick: tick
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Digging
  // ---------------------------------------------------------------------------------------------

  /**
   * @typedef {Object} DigResult
   * @property {Int32Array} givens    The puzzle: solution values on the kept cells, 0 elsewhere.
   * @property {Int32Array} solution  The array that was passed in.
   * @property {number} clues         Number of givens.
   * @property {number} removed       Number of emptied cells.
   * @property {Uint8Array} rejected  1 for every cell whose removal was tried and refused.
   * @property {number[][]} removedGroups  The cell groups that were removed, in the order they were dug.
   * @property {Object} stats         { groups, tried, accepted, rejected, skipped, oracleCalls }
   */

  /**
   * Digs holes into a full solution while keeping the solution unique (stage A of design.md section 6.8).
   * Deterministic: the same solution, rng seed and options give the same givens.
   *
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} solution  A complete, valid grid.
   * @param {Rng} rng
   * @param {Object} [options]
   * @param {string} [options.symmetry='rotational180']  One of `SG.symmetry.KINDS`.
   * @param {string} [options.order='random']            One of `SG.digger.ORDERS`.
   * @param {number} [options.minClues=0]         Never dig below this many givens.
   * @param {number} [options.minCluesPerUnit=0]  Every unit keeps at least this many givens.
   * @param {?string[]} [options.allowedTechniques]  Technique ids of the oracle. Missing or null: the oracle
   *        is the DFS unique-solution check. An array: the technique-bounded oracle of section 6.8 (4), a
   *        removal is kept only when the logical solver still finishes the puzzle with just these techniques,
   *        which proves uniqueness as well. Uniqueness-assuming techniques (uniqueRectangle) are never used
   *        there.
   * @param {ArrayLike<number>} [options.startGivens]  Continue digging a puzzle that was dug before (its
   *        givens must be a subset of `solution`) instead of starting from the full grid.
   * @param {Object} [options.budget]
   * @param {Uint8Array} [options.rejected]  Cells already known not to be removable (1 = skip); lets a later
   *        pass reuse what an earlier one learned.
   * @param {?(Emitter|function(Object): void)} [options.emit]  An emitter of `SG.events` or a plain function
   *        that receives every event; null or missing: no events.
   * @param {boolean} [options.stepEvents=true]  Emit the 'dig' step start and end; `digLevel` passes false
   *        because the pipeline's stage runner does it.
   * @param {string} [options.pass='random']  Name of this pass in the `dig.pass.*` events.
   * @param {boolean} [options.verify=true]  Re-check the finished puzzle with `SG.dfs.countSolutions`.
   * @returns {DigResult}
   * @throws {SG.errors.GenerationError} 'digger.invalidSolution', 'digger.invalidOption',
   *         'digger.notUnique' (a bug guard that should never fire), or a budget error.
   */
  function dig(model, solution, rng, options) {
    return drive(digSteps(model, solution, rng, options));
  }

  /**
   * The resumable form of `dig`: a generator that returns the `DigResult`. It yields after every group
   * whose removal was tried (one oracle call, the natural unit of the work) when `options.cooperative` is
   * true, and never otherwise, so `dig` (this driven to its end) costs nothing extra. Same options, same
   * events, same random draws as `dig`.
   *
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} solution
   * @param {Rng} rng
   * @param {Object} [options]  Those of `dig`, and:
   * @param {boolean} [options.cooperative=false]  Yield at the boundaries above.
   * @returns {Generator<undefined, DigResult>}
   */
  function* digSteps(model, solution, rng, options) {
    options = options || {};
    const coop = options.cooperative === true;
    const n = model.cellCount;
    const em = SG.events.toEmitter(options.emit);
    const budget = options.budget || null;
    const symmetry = options.symmetry !== undefined ? options.symmetry : 'rotational180';
    const order = options.order !== undefined ? options.order : 'random';
    const minClues = options.minClues !== undefined ? options.minClues : 0;
    const minPerUnit = options.minCluesPerUnit !== undefined ? options.minCluesPerUnit : 0;
    const passName = options.pass !== undefined ? options.pass : 'random';
    if (!(minClues >= 0)) throw fail('digger.invalidOption', { option: 'minClues', value: String(minClues) });
    if (!(minPerUnit >= 0)) {
      throw fail('digger.invalidOption', { option: 'minCluesPerUnit', value: String(minPerUnit) });
    }
    if (!SG.model.isSolution(model, solution)) throw fail('digger.invalidSolution', {});
    const allowed = options.allowedTechniques === undefined ? null : options.allowedTechniques;
    if (allowed !== null && !Array.isArray(allowed)) {
      throw fail('digger.invalidOption', { option: 'allowedTechniques', value: String(allowed) });
    }
    const oracle = allowed === null ? oracleKeepsUnique : techniqueOracle(allowed);
    const refusal = allowed === null ? 'ambiguous' : 'techniques';

    const groups = SG.symmetry.groups(model, symmetry);
    const sequence = groupSequence(cellSequence(model, order, rng), groups, n);

    const givens = Int32Array.from(solution);
    const start = options.startGivens;
    if (start !== undefined && start !== null) {
      if (start.length !== n) {
        throw fail('digger.invalidOption', { option: 'startGivens', value: 'length ' + start.length });
      }
      for (let c = 0; c < n; c++) {
        if (start[c] !== 0 && start[c] !== solution[c]) {
          throw fail('digger.invalidOption', { option: 'startGivens', value: 'cell ' + c });
        }
        givens[c] = start[c];
      }
    }
    if (options.rejected !== undefined && options.rejected !== null && options.rejected.length !== n) {
      throw fail('digger.invalidOption', { option: 'rejected', value: 'length ' + options.rejected.length });
    }
    const rejected = options.rejected ? Uint8Array.from(options.rejected) : new Uint8Array(n);
    const unitClues = new Int32Array(model.units.length);
    let clues = 0;
    for (let c = 0; c < n; c++) {
      if (givens[c] === 0) continue;
      clues++;
      const us = model.cellUnits[c];
      for (let k = 0; k < us.length; k++) unitClues[us[k]]++;
    }
    const stats = { groups: sequence.length, tried: 0, accepted: 0, rejected: 0, skipped: 0, oracleCalls: 0 };
    const removedGroups = [];

    function metrics() {
      return { clues: clues, accepted: stats.accepted, rejected: stats.rejected, attempts: stats.tried };
    }

    const trace = createTracer(em, metrics);
    const steps = options.stepEvents !== false;

    function skip(group, reason) {
      stats.skipped++;
      trace.skip(group, reason);
    }

    if (steps) {
      em.step('dig', 'start', 'dig.start',
        { symmetry: symmetry, order: order, minClues: minClues }, metrics());
    }
    if (em.wantsMicro) {
      // The replayed board must show the puzzle this pass starts from.
      em.bindBoard(n);
      em.syncBoard('dig', 'dig.restore', {}, givens);
    }
    trace.pass(passName, 'start', clues);

    for (let g = 0; g < sequence.length; g++) {
      let group = sequence[g];
      let i;
      let j;

      // A continued dig only looks at the cells of the group that still hold a clue.
      if (start !== undefined && start !== null) {
        group = group.filter(function (c) { return givens[c] !== 0; });
        if (group.length === 0) continue;
      }

      // Cheap pre-filters, in order of cost.
      let anyRejected = false;
      for (i = 0; i < group.length; i++) if (rejected[group[i]] === 1) anyRejected = true;
      if (anyRejected) {
        skip(group, 'rejected');
        continue;
      }
      if (clues - group.length < minClues) {
        skip(group, 'minClues');
        continue;
      }
      if (minPerUnit > 0 && !unitsStayFilled(model, unitClues, group, minPerUnit)) {
        skip(group, 'unitMinimum');
        continue;
      }

      const cells = Array.from(group);
      stats.tried++;
      trace.tryGroup(cells, passName);
      for (i = 0; i < group.length; i++) givens[group[i]] = 0;

      if (oracle(model, givens, solution, group, budget, stats)) {
        for (i = 0; i < group.length; i++) {
          const us = model.cellUnits[group[i]];
          for (j = 0; j < us.length; j++) unitClues[us[j]]--;
        }
        clues -= group.length;
        stats.accepted++;
        removedGroups.push(cells);
        trace.accept(cells);
      } else {
        for (i = 0; i < group.length; i++) {
          givens[group[i]] = solution[group[i]];
          rejected[group[i]] = 1;
        }
        stats.rejected++;
        trace.reject(cells, refusal);
      }
      if (coop) yield;
    }

    if (options.verify !== false && SG.dfs.countSolutions(model, givens, 2, budget) !== 1) {
      throw fail('digger.notUnique', { variantId: model.variantId });
    }
    trace.pass(passName, 'end', clues);
    if (steps) em.step('dig', 'end', 'dig.end', undefined, metrics());

    return {
      givens: givens,
      solution: solution,
      clues: clues,
      removed: n - clues,
      rejected: rejected,
      removedGroups: removedGroups,
      stats: stats
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Difficulty-bounded generation (design.md sections 6.6, 6.7 and 6.8)
  // ---------------------------------------------------------------------------------------------

  /** Levels from this index on (medium) get the guided stage; below it a plain random dig is enough. */
  const GUIDED_FROM_LEVEL = 2;

  /** Share of the cells that are still clues when the guided stage takes over from the random dig. */
  const GUIDED_START = 0.47;

  /** Removal candidates the guided stage rates per step on a 9x9 board; larger boards get fewer. */
  const GUIDED_CANDIDATES = 32;
  const GUIDED_MIN_CANDIDATES = 4;

  /** Objective of a removal that leaves a puzzle the techniques below 'evil' cannot finish. */
  const STUCK_SCORE = 1e9;

  /** Objective values below zero refuse the removal; the value says why (scores are never negative). */
  const REFUSED_TECHNIQUES = -1;
  const REFUSED_TOO_HARD = -2;
  const REFUSED_AMBIGUOUS = -3;

  function refusalReason(value) {
    if (value === REFUSED_TECHNIQUES) return 'techniques';
    return value === REFUSED_TOO_HARD ? 'tooHard' : 'ambiguous';
  }

  const DEFAULT_MAX_ATTEMPTS = 8;
  const DEFAULT_DIG_TRIES = 12;
  /** Symmetries with groups of more than two cells dig in coarser steps and miss a level more often. */
  const DEFAULT_DIG_TRIES_COARSE = 30;

  /**
   * Stage B objective: how hard is the puzzle after the cells of `group` were removed? Returns a negative
   * `REFUSED_*` value when the removal must be refused, else a number where more is harder; the guided stage
   * keeps the highest. The function has the contract of the oracles above (the group cells are cleared in
   * `givens` on entry).
   *
   * Levels below 'evil': the bounded logical solve is the oracle (stuck = refused) and the objective at
   * once, namely the calibrated score; a score at or above the band's upper bound is refused, so digging
   * never overshoots the band. 'evil': the removal must keep the solution unique (DFS); the objective is the
   * score when the techniques below the chain group finish the puzzle, and above everything when they do
   * not, the more cells they leave open the better. Uniqueness is proven by the DFS here, so the solver may
   * use the techniques that assume it.
   */
  function removalObjective(model, spec) {
    if (spec.oracle === 'unique') {
      const below = spec.allowedTechniques.filter(function (id) {
        return SG.techniques.get(id).group !== 'chain';
      });
      const evilOptions = {
        allowedTechniques: below,
        collectSteps: false,
        assumeUniqueness: true,
        budget: null
      };
      return function evilObjective(givens, solution, group, budget, stats) {
        if (!oracleKeepsUnique(model, givens, solution, group, budget, stats)) return REFUSED_AMBIGUOUS;
        evilOptions.budget = budget;
        const report = SG.logicalSolver.solve(model, givens, evilOptions);
        return report.solved ? SG.difficulty.classify(report, model).score
          : STUCK_SCORE + report.state.unsolvedCount;
      };
    }
    const options = {
      allowedTechniques: spec.allowedTechniques,
      collectSteps: false,
      assumeUniqueness: false,
      budget: null
    };
    return function boundedObjective(givens, solution, group, budget, stats) {
      stats.oracleCalls++;
      options.budget = budget;
      const report = SG.logicalSolver.solve(model, givens, options);
      if (!report.solved) return REFUSED_TECHNIQUES;
      const score = SG.difficulty.classify(report, model).score;
      return score < spec.max ? score : REFUSED_TOO_HARD;
    };
  }

  /**
   * Stage B, "dig deeper" (design.md section 6.8, phase B): continues a dug puzzle by always taking the
   * removal that makes it hardest. Each step rates the removal of every remaining group with
   * `removalObjective` and applies the best one; a refused removal stays refused for the rest of the pass
   * (more clues gone never makes a puzzle easier). It stops when nothing can be removed any more, which is
   * the level's own minimal puzzle.
   *
   * Why not just keep digging in random order: random minimal puzzles need nothing beyond singles about
   * three times out of four, whatever technique set the oracle allows, because the clues left are the ones
   * that uniqueness itself needs. Choosing the hardest removal each step finds the puzzles that need more.
   *
   * Events: each rated candidate is reported as `dig.try`, then `dig.reject` (refused) or `dig.keep` (fine,
   * not the best); the removal that wins the step is reported as `dig.accept`. With `ctx.cooperative` the
   * generator yields after every rated candidate (one solve, the unit of the work).
   * @returns {Generator<undefined, {givens: Int32Array, clues: number}>}
   */
  function* digGuidedSteps(model, solution, startGivens, rejected, spec, rng, ctx) {
    const coop = ctx.cooperative === true;
    const n = model.cellCount;
    const givens = Int32Array.from(startGivens);
    const objective = removalObjective(model, spec);
    const groups = SG.symmetry.groups(model, ctx.symmetry);
    const unitClues = new Int32Array(model.units.length);
    const stats = ctx.stats;
    let clues = 0;
    for (let c = 0; c < n; c++) {
      if (givens[c] === 0) continue;
      clues++;
      const us = model.cellUnits[c];
      for (let k = 0; k < us.length; k++) unitClues[us[k]]++;
    }

    function metrics() {
      return { clues: clues, accepted: stats.accepted, rejected: stats.rejected, attempts: stats.tried };
    }

    const trace = createTracer(ctx.emit, metrics);
    trace.pass('guided', 'start', clues);

    for (;;) {
      const candidates = [];
      for (let g = 0; g < groups.length; g++) {
        const present = Array.from(groups[g]).filter(function (c) { return givens[c] !== 0; });
        if (present.length === 0 || clues - present.length < ctx.minClues) continue;
        if (present.some(function (c) { return rejected[c] === 1; })) continue;
        if (ctx.minPerUnit > 0 && !unitsStayFilled(model, unitClues, present, ctx.minPerUnit)) continue;
        candidates.push(present);
      }
      if (candidates.length === 0) break;
      rng.shuffle(candidates);
      // A solve costs about as much as the board is large, so the number of rated candidates shrinks with it.
      const limit = Math.max(GUIDED_MIN_CANDIDATES, Math.min(GUIDED_CANDIDATES, Math.round(
        GUIDED_CANDIDATES * 81 / n)));
      const pool = candidates.length > limit ? candidates.slice(0, limit) : candidates;

      let best = null;
      let bestObjective = -Infinity;
      for (let p = 0; p < pool.length; p++) {
        const group = pool[p];
        let i;
        stats.tried++;
        trace.tryGroup(group, 'guided');
        for (i = 0; i < group.length; i++) givens[group[i]] = 0;
        const value = objective(givens, solution, group, ctx.budget, stats);
        for (i = 0; i < group.length; i++) givens[group[i]] = solution[group[i]];
        if (value < 0) {
          for (i = 0; i < group.length; i++) rejected[group[i]] = 1;
          stats.rejected++;
          trace.reject(group, refusalReason(value));
        } else {
          if (best === null || value > bestObjective) {
            bestObjective = value;
            best = group;
          }
          trace.keep(group, value);
        }
        if (coop) yield;
      }
      if (best === null) continue;

      for (let i = 0; i < best.length; i++) {
        givens[best[i]] = 0;
        const us = model.cellUnits[best[i]];
        for (let k = 0; k < us.length; k++) unitClues[us[k]]--;
      }
      clues -= best.length;
      stats.accepted++;
      trace.accept(best);
    }
    trace.pass('guided', 'end', clues);
    return { givens: givens, clues: clues };
  }

  /**
   * @typedef {Object} DugPuzzle
   * @property {Int32Array} givens  Solution values on the kept cells, 0 elsewhere.
   * @property {number} clues
   * @property {Object} stats       { groups, tried, accepted, rejected, skipped, oracleCalls }
   * @property {PuzzleModel} [model]  Only for a strategy that digs structure instead of cells (the signs of
   *           Greater-Than): the model with the removed structure left out. It then replaces the model for
   *           the check, the rating and the result.
   */

  /**
   * The default dig strategy ('cells'): stage A (random dig with the technique-bounded oracle), then stage B
   * (guided dig deeper) for the levels that use it. Other strategies (a variant's `digStrategy`, see
   * `registerStrategy`) have this signature and return value.
   *
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} solution  A complete, valid grid.
   * @param {string} level
   * @param {Rng} rng
   * @param {Object} [options]
   * @param {string} [options.symmetry]  Default: the spec's `symmetryDefault` ('rotational180').
   * @param {string} [options.order='random']  Dig order of stage A, one of `SG.digger.ORDERS`.
   * @param {number} [options.minClues]  Default: the spec's `minClues`.
   * @param {number} [options.minCluesPerUnit]  Default: the spec's value.
   * @param {boolean} [options.guided]  Run stage B. Default: for 'medium' and above.
   * @param {DifficultySpec} [options.spec]
   * @param {Object} [options.budget]
   * @param {?(Emitter|function(Object): void)} [options.emit]
   * @param {boolean} [options.cooperative=false]  The caller can run the strategy in slices (see
   *        `digStageSteps`). Then the function returns the generator instead of the result, and a strategy
   *        that wraps `digStage` (Killer) and forwards its options gets the same treatment without knowing
   *        it. Every other caller gets the `DugPuzzle` and no generator.
   * @returns {DugPuzzle|Generator<undefined, DugPuzzle>}
   */
  function digStage(model, solution, level, rng, options) {
    const steps = digStageSteps(model, solution, level, rng, options);
    return options && options.cooperative === true ? steps : drive(steps);
  }

  /**
   * The resumable form of `digStage`: a generator that returns the `DugPuzzle`. With `options.cooperative` it
   * yields after every oracle call of stage A and after every candidate rated by stage B, so a caller can
   * slice the dig, which is nearly all the time of a Samurai or Killer sample, at about the cost of one
   * solve (a fraction of a millisecond to a few milliseconds on large boards). Same events and random draws
   * as `digStage`.
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} solution
   * @param {string} level
   * @param {Rng} rng
   * @param {Object} [options]  Those of `digStage`.
   * @returns {Generator<undefined, DugPuzzle>}
   */
  function* digStageSteps(model, solution, level, rng, options) {
    options = options || {};
    const coop = options.cooperative === true;
    const spec = options.spec || SG.difficulty.spec(level, model);
    const n = model.cellCount;
    const budget = options.budget || null;
    const em = SG.events.toEmitter(options.emit);
    const symmetry = options.symmetry !== undefined ? options.symmetry : spec.symmetryDefault;
    const order = options.order !== undefined ? options.order : 'random';
    const minClues = options.minClues !== undefined ? options.minClues : spec.minClues;
    const minPerUnit = options.minCluesPerUnit !== undefined ? options.minCluesPerUnit : spec.minCluesPerUnit;
    const guided = options.guided !== undefined ? options.guided === true
      : SG.difficulty.levelIndex(level) >= GUIDED_FROM_LEVEL;
    const techniques = spec.oracle === 'techniques' ? spec.allowedTechniques : null;

    // Stage A. The guided stage needs room to choose, so the random dig hands over at GUIDED_START.
    const handOver = guided ? Math.max(minClues, Math.round(GUIDED_START * n)) : minClues;
    const first = yield* digSteps(model, solution, rng.fork('random'), {
      symmetry: symmetry,
      order: order,
      minClues: handOver,
      minCluesPerUnit: minPerUnit,
      allowedTechniques: techniques,
      budget: budget,
      emit: em,
      stepEvents: false,
      pass: 'random',
      verify: false,
      cooperative: coop
    });
    const stats = first.stats;
    let givens = first.givens;
    let clues = first.clues;

    if (guided) {
      const second = yield* digGuidedSteps(model, solution, givens, first.rejected, spec,
        rng.fork('guided'), {
          symmetry: symmetry,
          minClues: minClues,
          minPerUnit: minPerUnit,
          budget: budget,
          emit: em,
          stats: stats,
          cooperative: coop
        });
      givens = second.givens;
      clues = second.clues;
    }
    return { givens: givens, clues: clues, stats: stats };
  }

  /** Dig strategies by id. A variant selects one with `VariantDef.digStrategy`; 'cells' is the default. */
  const strategies = { cells: digStage };

  /**
   * Registers a dig strategy, for example 'signs' for Greater-Than (design.md section 8.3). The function has
   * the signature of `digStage`; the options it receives are the resolved ones (`spec`, `symmetry`, `order`,
   * `minClues`, `minCluesPerUnit`, `guided`, `budget`, `emit`, `cooperative`). It should emit its events
   * through `emit` (a `SG.events` emitter) with `stepId` 'dig', keep the board of the replay in step (patches
   * of at most 8 cells) and return `{ givens, clues, stats }`, plus `model` when it removed structure from
   * the model. It may ignore `cooperative` and return the result at once (then the whole dig of a sample is
   * one piece of work for a scheduler); or, when `options.cooperative === true`, return an iterator that
   * yields at boundaries it chooses and returns that value (`digStageSteps` is the example).
   * @param {string} id
   * @param {function(PuzzleModel, ArrayLike<number>, string, Rng, Object): DugPuzzle} fn
   * @throws {SG.errors.GenerationError} 'digger.invalidStrategy' for a bad id or function, or a duplicate id.
   */
  function registerStrategy(id, fn) {
    if (typeof id !== 'string' || id === '' || typeof fn !== 'function' ||
        Object.prototype.hasOwnProperty.call(strategies, id)) {
      throw fail('digger.invalidStrategy', { id: String(id) });
    }
    strategies[id] = fn;
  }

  /**
   * Removes a registered strategy. Meant for tests and tooling; the built-in 'cells' stays.
   * @param {string} id
   * @returns {boolean} True when something was removed.
   */
  function unregisterStrategy(id) {
    if (id === 'cells' || !Object.prototype.hasOwnProperty.call(strategies, id)) return false;
    delete strategies[id];
    return true;
  }

  /**
   * @param {string} id
   * @returns {function} The strategy function.
   * @throws {SG.errors.GenerationError} 'digger.unknownStrategy'.
   */
  function getStrategy(id) {
    if (!Object.prototype.hasOwnProperty.call(strategies, id)) {
      throw fail('digger.unknownStrategy', { id: String(id) });
    }
    return strategies[id];
  }

  /**
   * Safety net of the 'dig' step (risk R3): a technique that deduces something wrong could make a puzzle
   * ambiguous. The puzzle is always re-verified with `SG.dfs.countSolutions`, whatever oracle dug it, and
   * replaced by a plain DFS-dug puzzle when the check fails.
   * @returns {{givens: Int32Array, clues: number, unsound: boolean}}
   */
  function secureUniqueness(model, solution, dug, rng, ctx) {
    const unique = SG.dfs.countSolutions(model, dug.givens, 2, ctx.budget) === 1;
    ctx.emit.step('dig', 'progress', 'dig.verify', { unique: unique });
    if (unique) return { givens: dug.givens, clues: dug.clues, unsound: false };
    ctx.emit.step('dig', 'progress', 'dig.unsound', {});
    const safe = dig(model, solution, rng.fork('fallback'), {
      symmetry: ctx.symmetry,
      order: ctx.order,
      minClues: ctx.minClues,
      minCluesPerUnit: ctx.minCluesPerUnit,
      budget: ctx.budget,
      emit: ctx.emit,
      stepEvents: false,
      pass: 'fallback'
    });
    return { givens: safe.givens, clues: safe.clues, unsound: true };
  }

  /** Reports a rating: one `rate.technique` per technique used (ladder order), then `rate.result`. */
  function reportRating(em, rating, level, clues) {
    if (!em.wantsMetrics) return;
    SG.techniques.list().forEach(function (def) {
      const count = rating.techniqueCounts[def.id];
      if (count > 0) {
        em.step('rate', 'progress', 'rate.technique', { technique: def.id, count: count, group: def.group });
      }
    });
    em.step('rate', 'progress', 'rate.result', {
      level: rating.level,
      score: rating.score,
      hardestTechnique: rating.hardestTechnique,
      requested: level,
      solved: rating.solved
    }, { clues: clues, score: rating.score });
  }

  /**
   * @typedef {Object} LevelPuzzle
   * @property {PuzzleModel} model  The model the puzzle belongs to.
   * @property {Int32Array} givens
   * @property {Int32Array} solution
   * @property {number} clues
   * @property {number} removed
   * @property {string} requested   The level that was asked for.
   * @property {string} achieved    The level the puzzle was rated as (`rating.level`).
   * @property {Rating} rating      See `SG.difficulty.classify`.
   * @property {boolean} exact      achieved === requested. Then the score lies in the band of the level and
   *           the hardest technique belongs to its groups (invariant I5).
   * @property {boolean} unsound    The technique-bounded dig produced a puzzle that was not unique, so a
   *           technique has a bug. The returned puzzle comes from the DFS fallback and is unique.
   * @property {Object} stats       { groups, tried, accepted, rejected, skipped, oracleCalls }
   */

  /**
   * One attempt at a puzzle of the requested level from a given solution, as the three pipeline steps of
   * design.md section 7.1: 'dig' (the dig strategy, default `digStage`, then the safety net of
   * `secureUniqueness`), 'rate' (one deferred rating, section 6.8 (5)) and 'tune' (does the rating hit the
   * band of the level?). It never throws for a puzzle that misses the level; look at `exact`.
   *
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} solution  A complete, valid grid.
   * @param {string} level  One of `SG.difficulty.LEVELS` that the variant supports.
   * @param {Rng} rng
   * @param {Object} [options]  Those of `digStage`, and:
   * @param {Function} [options.stage]  The step runner: a stepper stage (`createStageSteps`, what the
   *        pipeline passes) or a plain runner of `SG.events.createStageRunner` (its steps then never yield).
   *        Default: a stepper stage that emits the step events.
   * @param {function} [options.strategy]  Dig strategy, default `digStage`.
   * @param {string} [options.strategyId='cells']  Its id, for the 'dig.start' event.
   * @param {{attempt: number, maxAttempts: number, sample: number, maxSamples: number}} [options.where]
   *        Where in the restart loop this call is; goes into the step start events.
   * @returns {LevelPuzzle}
   * @throws {SG.errors.GenerationError} 'difficulty.unknownLevel', 'difficulty.unsupportedLevel',
   *         'digger.invalidSolution', 'digger.invalidOption', or a budget error.
   */
  function digLevel(model, solution, level, rng, options) {
    return drive(digLevelSteps(model, solution, level, rng, options));
  }

  /**
   * The resumable form of `digLevel`: a generator that returns the `LevelPuzzle`. It yields where its dig
   * strategy does (see `digStageSteps`; a strategy that does not know `cooperative` is one piece of work) and
   * after each of its three steps, when `options.cooperative` is true. Same events and random draws.
   *
   * @param {PuzzleModel} model
   * @param {ArrayLike<number>} solution
   * @param {string} level
   * @param {Rng} rng
   * @param {Object} [options]  Those of `digLevel`, and:
   * @param {boolean} [options.cooperative=false]  Yield at the boundaries above.
   * @returns {Generator<undefined, LevelPuzzle>}
   */
  function* digLevelSteps(model, solution, level, rng, options) {
    options = options || {};
    const coop = options.cooperative === true;
    const spec = options.spec || SG.difficulty.spec(level, model);
    const n = model.cellCount;
    const budget = options.budget || null;
    const em = SG.events.toEmitter(options.emit);
    const stage = resolveStage(options, em, budget);
    const strategy = options.strategy || digStage;
    const where = options.where || {};
    const symmetry = options.symmetry !== undefined ? options.symmetry : spec.symmetryDefault;
    const order = options.order !== undefined ? options.order : 'random';
    const minClues = options.minClues !== undefined ? options.minClues : spec.minClues;
    const minPerUnit = options.minCluesPerUnit !== undefined ? options.minCluesPerUnit : spec.minCluesPerUnit;
    const guided = options.guided !== undefined ? options.guided === true
      : SG.difficulty.levelIndex(level) >= GUIDED_FROM_LEVEL;
    const resolved = {
      spec: spec,
      symmetry: symmetry,
      order: order,
      minClues: minClues,
      minCluesPerUnit: minPerUnit,
      guided: guided,
      budget: budget,
      emit: em,
      cooperative: coop
    };

    const dug = yield* stage('dig', Object.assign({}, where, {
      level: level,
      symmetry: symmetry,
      order: order,
      strategy: options.strategyId || 'cells',
      minClues: minClues
    }), function* digStep(scope) {
      // A later sample starts from the full grid again; the first one finds it on the board already.
      if (em.wantsMicro) em.syncBoard('dig', 'dig.restore', {}, solution);
      let found = strategy(model, solution, level, rng, resolved);
      if (SG.budget.isSteps(found)) found = yield* found;
      // A strategy that digs structure instead of cells (signs) hands back the thinned model.
      const dugModel = found.model || model;
      const checked = secureUniqueness(dugModel, solution, found, rng, resolved);
      const stats = found.stats;
      scope.metrics = {
        clues: checked.clues, accepted: stats.accepted, rejected: stats.rejected, attempts: stats.tried
      };
      return {
        model: dugModel, givens: checked.givens, clues: checked.clues, unsound: checked.unsound, stats: stats
      };
    });

    const rating = yield* stage('rate', Object.assign({}, where), function rateStep(scope) {
      const rated = SG.difficulty.rate(dug.model, dug.givens, { budget: budget });
      reportRating(em, rated, level, dug.clues);
      scope.metrics = { clues: dug.clues, score: rated.score };
      return rated;
    });

    const exact = rating.level === level;
    yield* stage('tune', Object.assign({}, where), function tuneStep(scope) {
      const band = {
        requested: level,
        achieved: rating.level,
        score: rating.score,
        scoreMin: spec.min,
        scoreMax: spec.max === Infinity ? null : spec.max
      };
      if (exact) {
        band.hardestTechnique = rating.hardestTechnique;
        em.step('tune', 'progress', 'tune.hit', band);
      } else {
        band.sample = where.sample || 1;
        band.maxSamples = where.maxSamples || 1;
        em.step('tune', 'progress', 'tune.miss', band);
      }
      scope.metrics = { clues: dug.clues, score: rating.score };
    });

    return {
      model: dug.model,
      givens: dug.givens,
      solution: solution,
      clues: dug.clues,
      removed: n - dug.clues,
      requested: level,
      achieved: rating.level,
      rating: rating,
      exact: exact,
      unsound: dug.unsound,
      stats: dug.stats
    };
  }

  /** How far a rating is from a level: whole levels first, then the distance of the score from the band. */
  function distanceToLevel(rating, spec, level) {
    const gap = Math.abs(SG.difficulty.levelIndex(rating.level) - SG.difficulty.levelIndex(level));
    let off = 0;
    if (rating.score < spec.min) off = (spec.min - rating.score) / Math.max(spec.min, 1);
    else if (rating.score >= spec.max) off = (rating.score - spec.max) / spec.max;
    return gap * 1000 + off;
  }

  /**
   * @typedef {Object} GeneratedPuzzle
   * @property {PuzzleModel} model   The model of the returned puzzle: the one that was passed in, or the one
   *           that the variant's `postGenerate` returned for the attempt the puzzle comes from.
   * @property {Int32Array} givens
   * @property {Int32Array} solution
   * @property {number} clues
   * @property {string} requested
   * @property {string} achieved
   * @property {Rating} rating
   * @property {boolean} exact       achieved === requested.
   * @property {number} attempts     Full grids generated.
   * @property {number} samples      Dug puzzles rated (at most maxAttempts x digTries).
   * @property {string[]} warnings   'difficulty.approximate' when the level was not reached exactly;
   *           'digger.unsoundTechnique' when a technique produced an ambiguous puzzle (a bug).
   * @property {Object} stats        The statistics of the returned puzzle's dig.
   */

  /**
   * Generates a puzzle of the requested difficulty: the outer restart loop of design.md section 6.8 (6).
   * Each attempt draws a fresh full grid and digs up to `digTries` puzzles from it (a dig costs about a
   * millisecond, a grid more, and one dig in a few misses the level, so the grid is reused); the first puzzle
   * that is rated exactly the requested level is returned. When every attempt is used up, the closest puzzle
   * seen is returned with 'difficulty.approximate' in `warnings`. It neither throws for that nor loops
   * longer than maxAttempts x digTries digs. Every returned puzzle has exactly one solution.
   * Deterministic: the same model, level, rng seed and options give the same puzzle (invariant I4), whatever
   * the emitter and the stage runner do. The random streams are `rng.fork('grid#A')` for the grid of
   * attempt A, `rng.fork('extra#A')` for the variant hook and `rng.fork('dig#A.T')` for dig sample T of
   * attempt A.
   *
   * Each attempt runs the steps 'fullGrid' and 'extraStructure', then per sample 'dig', 'rate' and 'tune'
   * (see `digLevel`), all through `options.stage`. After a missed attempt it emits `retry.difficulty`.
   *
   * @param {PuzzleModel} model
   * @param {string} level
   * @param {Rng} rng
   * @param {Object} [options]  Those of `digLevel`, and:
   * @param {number} [options.maxAttempts=8]  Full grids to try.
   * @param {number} [options.digTries]  Dig samples per grid. Default 12, or 30 when the symmetry has groups
   *        of more than two cells (four-fold symmetries miss the level more often).
   * @param {function(Object): (PuzzleModel|void)} [options.postGenerate]  The variant's hook, called once
   *        per attempt after the full grid with `{ model, solution, rng, level, spec, attempt, budget,
   *        emit, variantId }`. Models are immutable, so a hook that adds structure (cages, signs) returns
   *        the new model, which then replaces `model` for that attempt; returning nothing keeps it. A long
   *        hook can be sliced by giving the function a resumable twin: `hook.steps`, a generator function
   *        with the same argument and result, used instead of the hook when `options.cooperative` is set.
   * @returns {GeneratedPuzzle}
   * @throws {SG.errors.GenerationError} 'difficulty.unsupportedLevel', option errors,
   *         'digger.invalidPostGenerate', or a budget error.
   */
  function generate(model, level, rng, options) {
    return drive(generateSteps(model, level, rng, options));
  }

  /**
   * The resumable form of `generate`, the restart loop as a generator that returns the `GeneratedPuzzle`.
   *
   * With `options.cooperative` it yields at the natural boundaries of the work, so that a scheduler can run
   * the generation in slices and give the thread away between them: after each oracle call of a dig and each
   * candidate of the guided dig (see `digStageSteps`), and after every pipeline step ('fullGrid',
   * 'extraStructure', 'dig', 'rate', 'tune', see `createStageSteps`). The pieces in between are NOT
   * resumable: one full grid, the uniqueness check of a dug puzzle, one rating, a single search of the
   * variant's `postGenerate` twin (one Killer layout search, cut off at 30000 nodes, up to ~90 ms) and a dig
   * strategy or hook that does not support `cooperative`. That is the granularity limit of
   * cooperative scheduling: a slice is never shorter than the longest of those pieces (a few milliseconds
   * on 9x9 boards, tens of milliseconds for a Killer layout search or a Samurai uniqueness check).
   *
   * Everything that is observable is the same as for `generate`: the events, the random draws, the budget
   * accounting and the result; yielding changes none of it. `generate` is this generator driven to its end.
   * The generator may be abandoned at any yield (`.return()` runs the `finally` blocks and nothing else).
   *
   * @param {PuzzleModel} model
   * @param {string} level
   * @param {Rng} rng
   * @param {Object} [options]  Those of `generate`, and:
   * @param {boolean} [options.cooperative=false]  Yield at the boundaries above.
   * @returns {Generator<undefined, GeneratedPuzzle>}
   */
  function* generateSteps(model, level, rng, options) {
    options = options || {};
    const coop = options.cooperative === true;
    const spec = SG.difficulty.spec(level, model);
    const symmetry = options.symmetry !== undefined ? options.symmetry : spec.symmetryDefault;
    const maxAttempts = options.maxAttempts !== undefined ? options.maxAttempts : DEFAULT_MAX_ATTEMPTS;
    let digTries = options.digTries;
    if (digTries === undefined) {
      const coarse = SG.symmetry.groups(model, symmetry).some(function (g) { return g.length > 2; });
      digTries = coarse ? DEFAULT_DIG_TRIES_COARSE : DEFAULT_DIG_TRIES;
    }
    if (!(Number.isInteger(maxAttempts) && maxAttempts >= 1)) {
      throw fail('digger.invalidOption', { option: 'maxAttempts', value: String(maxAttempts) });
    }
    if (!(Number.isInteger(digTries) && digTries >= 1)) {
      throw fail('digger.invalidOption', { option: 'digTries', value: String(digTries) });
    }
    const budget = options.budget || null;
    const em = SG.events.toEmitter(options.emit);
    const stage = resolveStage(options, em, budget);
    const postGenerate = typeof options.postGenerate === 'function' ? options.postGenerate : null;
    const digOptions = Object.assign({}, options, { spec: spec, emit: em, stage: stage, cooperative: coop });

    let best = null;
    let bestDistance = Infinity;
    let attempts = 0;
    let samples = 0;
    let unsound = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const solution = yield* stage('fullGrid', { attempt: attempt, maxAttempts: maxAttempts },
        function gridStep(scope) {
          const gridStats = {};
          // fullGrid reads the variant's own fastSeed and restartThreshold from its definition.
          const grid = SG.fullGrid.generate(model, rng.fork('grid#' + attempt), budget, {
            emit: em,
            stepEvents: false,
            stats: gridStats
          });
          scope.metrics = {
            placed: model.cellCount, backtracks: gridStats.backtracks, restarts: gridStats.restarts
          };
          return grid;
        });
      attempts++;

      const attemptModel = yield* stage('extraStructure', { attempt: attempt, variantId: model.variantId },
        function* extraStep(scope) {
          if (postGenerate === null) {
            em.step('extraStructure', 'progress', 'extraStructure.none', { variantId: model.variantId });
            scope.args = { skipped: true };
            return model;
          }
          const hookContext = {
            model: model,
            solution: solution,
            rng: rng.fork('extra#' + attempt),
            level: level,
            spec: spec,
            attempt: attempt,
            budget: budget,
            emit: em,
            variantId: model.variantId
          };
          // A hook with a resumable twin (`hook.steps`, a generator function) is sliced when cooperating.
          let made = coop && typeof postGenerate.steps === 'function'
            ? yield* postGenerate.steps(hookContext) : postGenerate(hookContext);
          let adopted = model;
          if (made !== undefined && made !== null) {
            const fits = typeof made === 'object' && made.cellCount === model.cellCount &&
              made.digits === model.digits;
            if (!fits) throw fail('digger.invalidPostGenerate', { variantId: model.variantId });
            adopted = made;
          }
          em.step('extraStructure', 'progress', 'extraStructure.built', { variantId: model.variantId });
          scope.args = { skipped: false };
          return adopted;
        });

      for (let t = 1; t <= digTries; t++) {
        const where = { attempt: attempt, maxAttempts: maxAttempts, sample: t, maxSamples: digTries };
        const puzzle = yield* digLevelSteps(attemptModel, solution, level,
          rng.fork('dig#' + attempt + '.' + t), Object.assign({}, digOptions, { where: where }));
        samples++;
        unsound = unsound || puzzle.unsound;
        const distance = distanceToLevel(puzzle.rating, spec, level);
        if (best === null || distance < bestDistance) {
          best = puzzle;
          bestDistance = distance;
        }
        if (puzzle.exact) break;
      }
      if (best.exact) break;
      em.retry('tune', 'retry.difficulty', {
        attempt: attempt,
        maxAttempts: maxAttempts,
        requested: level,
        achieved: best.achieved,
        reason: 'difficulty',
        willRetry: attempt < maxAttempts
      }, { clues: best.clues, score: best.rating.score });
    }

    if (!best.exact) {
      // Out of attempts: the closest puzzle seen is the result, and the replayed board has to show it.
      yield* stage('tune', { attempt: attempts, maxAttempts: maxAttempts, finalize: true },
        function finalizeStep(scope) {
          em.step('tune', 'progress', 'tune.best',
            { requested: level, achieved: best.achieved, score: best.rating.score });
          if (em.wantsMicro) em.syncBoard('tune', 'tune.final', {}, best.givens);
          scope.metrics = { clues: best.clues, score: best.rating.score };
        });
    }

    const warnings = [];
    if (!best.exact) warnings.push('difficulty.approximate');
    if (unsound) warnings.push('digger.unsoundTechnique');
    return {
      model: best.model,
      givens: best.givens,
      solution: best.solution,
      clues: best.clues,
      requested: level,
      achieved: best.achieved,
      rating: best.rating,
      exact: best.exact,
      attempts: attempts,
      samples: samples,
      warnings: warnings,
      stats: best.stats
    };
  }

  SG.digger = {
    ORDERS: ORDERS,
    dig: dig,
    digSteps: digSteps,
    digStage: digStage,
    digStageSteps: digStageSteps,
    digLevel: digLevel,
    digLevelSteps: digLevelSteps,
    generate: generate,
    generateSteps: generateSteps,
    createStageSteps: createStageSteps,
    registerStrategy: registerStrategy,
    unregisterStrategy: unregisterStrategy,
    getStrategy: getStrategy
  };
})(typeof self !== 'undefined' ? self : globalThis);
