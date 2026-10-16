/**
 * Generation pipeline (design.md sections 7.1 and 13.9): `SG.pipeline.run(config, emit, budget)` turns a
 * `GenerateConfig` into a `PuzzleResult` through the seven canonical steps, and reports them as events.
 *
 *  1 configure       normalise and check the options, fix the seed
 *  2 buildModel      `variant.build`, then the difficulty spec of the board
 *  3 fullGrid        a complete valid grid                                   } repeated per attempt
 *  4 extraStructure  `variant.postGenerate`, or "nothing to do"              } (a new grid after
 *  5 dig             `variant.digStrategy` (default: cells), then the check  }  `retry.difficulty`)
 *  6 rate            one full rating of the puzzle                           } steps 5 to 7 repeat per
 *  7 tune            does the rating hit the level? accept or try again      } dig sample of a grid
 *
 * Who does what. The restart loop (which grid, which dig sample, which puzzle is closest) lives in
 * `SG.digger.generate`, so that the puzzle is the same whether it is generated through the pipeline or by
 * calling the functions directly: the pipeline calls `generate` with `SG.rng.create(seed)` and the same
 * options a direct caller would pass, and `generate` forks the random streams by fixed names ('grid#A',
 * 'extra#A', 'dig#A.T'; this file adds only 'model' for `variant.build`). The pipeline owns everything around
 * it: the configuration and the model (steps 1 and 2), the step events and their timings (through the stage
 * runner it hands to `generate`), the variant hooks, the warnings, the budget and cancellation, and the
 * result. The emitter never feeds back into the algorithm, so the puzzle does not depend on `config.trace`.
 *
 * Steps 5 to 7 are three steps although the digger's guided dig (stage B of design.md section 6.8) shares
 * its rating objective with the rater: dig = every removal plus the uniqueness check, rate = the rating of
 * the finished puzzle, tune = the band check that decides between accept and retry. See `SG.digger`.
 *
 * Two forms, one algorithm. `run` is synchronous. `runSteps` is the same pipeline as a generator that yields
 * at the natural boundaries of the work (between steps, between dig oracle calls), for a scheduler that
 * runs it in slices (the main-thread fallback of `SG.workerClient`, and the worker, which has to look at its
 * message queue). `run` is `runSteps` driven to its end, so the events, the puzzle and the budget accounting
 * cannot differ. `toWire` / `fromWire` carry a result across `postMessage`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  /** The seven steps in order; the same list as `SG.events.STEP_IDS`. */
  const STEPS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];

  const DEFAULT_DIFFICULTY = 'medium';
  const DEFAULT_MAX_ATTEMPTS = 8;
  const DEFAULT_TRACE = 'summary';

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  function now() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now() : Date.now();
  }

  function finiteOrNull(x) {
    return x === Infinity ? null : x;
  }

  /**
   * @typedef {Object} GenerateConfig
   * @property {string} variantId
   * @property {string} [difficulty='medium']  One of `SG.difficulty.LEVELS` that the variant supports.
   * @property {number} [seed]                 Missing: a random seed. Always a uint32 after normalisation.
   * @property {string} [symbolMode]           One of the variant's `symbolModes`; default: its default.
   * @property {string} [symmetry]             One of `SG.symmetry.KINDS`; default 'rotational180'.
   * @property {string} [digOrder='random']    One of `SG.digger.ORDERS`.
   * @property {number} [maxAttempts=8]        Full grids to try before settling for the closest puzzle.
   * @property {string} [trace='summary']      'off' | 'summary' | 'full', see `SG.events`.
   * @property {Object} [variantOptions]       Plain data for `variant.build`; default {}.
   */

  /**
   * Normalises and checks a configuration: defaults filled in, the seed fixed, everything validated. The
   * result is plain data (it goes into `PuzzleResult.config` and survives `postMessage`).
   * @param {GenerateConfig} config
   * @returns {GenerateConfig} A new object with every field set.
   * @throws {SG.errors.GenerationError} 'variant.unknown', 'difficulty.unknownLevel',
   *         'difficulty.unsupportedLevel', 'rng.invalidSeed', 'symmetry.unknownKind',
   *         'digger.invalidOption', 'events.invalidVerbosity' or 'pipeline.invalidOption'.
   */
  function normalizeConfig(config) {
    if (config === null || typeof config !== 'object') {
      throw fail('pipeline.invalidOption', { option: 'config' });
    }
    const def = SG.variants.get(config.variantId);
    const difficulty = config.difficulty !== undefined ? config.difficulty : DEFAULT_DIFFICULTY;
    if (!SG.difficulty.isSupported(difficulty, { variantId: def.id })) {
      throw fail('difficulty.unsupportedLevel', { level: difficulty, variantId: def.id });
    }
    const seed = SG.rng.create(config.seed).seed;

    const symmetry = config.symmetry !== undefined ? config.symmetry
      : SG.difficulty.spec(difficulty, null).symmetryDefault;
    if (SG.symmetry.KINDS.indexOf(symmetry) === -1) {
      throw fail('symmetry.unknownKind', { kind: String(symmetry) });
    }

    const digOrder = config.digOrder !== undefined ? config.digOrder : 'random';
    if (SG.digger.ORDERS.indexOf(digOrder) === -1) {
      throw fail('digger.invalidOption', { option: 'digOrder', value: String(digOrder) });
    }
    const maxAttempts = config.maxAttempts !== undefined ? config.maxAttempts : DEFAULT_MAX_ATTEMPTS;
    if (!(Number.isInteger(maxAttempts) && maxAttempts >= 1)) {
      throw fail('digger.invalidOption', { option: 'maxAttempts', value: String(maxAttempts) });
    }
    const trace = config.trace !== undefined ? config.trace : DEFAULT_TRACE;
    if (SG.events.VERBOSITIES.indexOf(trace) === -1) {
      throw fail('events.invalidVerbosity', { verbosity: String(trace) });
    }

    const symbolMode = config.symbolMode !== undefined ? config.symbolMode : def.defaultSymbolMode;
    if (def.symbolModes.indexOf(symbolMode) === -1) {
      throw fail('pipeline.invalidOption', { option: 'symbolMode', value: String(symbolMode) });
    }
    const variantOptions = config.variantOptions !== undefined ? config.variantOptions : {};
    if (variantOptions === null || typeof variantOptions !== 'object' || Array.isArray(variantOptions) ||
        !SG.events.isPlainData(variantOptions)) {
      throw fail('pipeline.invalidOption', { option: 'variantOptions' });
    }

    return {
      variantId: def.id,
      difficulty: difficulty,
      seed: seed,
      symbolMode: symbolMode,
      symmetry: symmetry,
      digOrder: digOrder,
      maxAttempts: maxAttempts,
      trace: trace,
      variantOptions: JSON.parse(JSON.stringify(variantOptions))
    };
  }

  /**
   * @typedef {Object} PuzzleResult
   * @property {PuzzleModel} model        The model of the puzzle (with the structure `postGenerate` added).
   * @property {Int32Array} givens        One entry per cell, 0 = empty.
   * @property {Int32Array} solution      The complete grid; `givens` is a subset of it.
   * @property {Rating} rating            `SG.difficulty.rate` of the puzzle; `rating.level` is the achieved
   *           level, `config.difficulty` the requested one.
   * @property {number} seed              The seed that was used (a given one, or the random one).
   * @property {GenerateConfig} config    The normalised configuration (`trace` is the one that was applied).
   * @property {Object<string, number>} timings  Milliseconds per step id, all seven keys, summed over
   *           attempts and samples; their sum is the elapsed time.
   * @property {number} attempts          Full grids generated.
   * @property {string[]} warnings        i18n keys: 'difficulty.approximate' (the closest puzzle was
   *           returned), 'digger.unsoundTechnique', 'trace.downgraded'.
   */

  /**
   * Runs the pipeline.
   *
   * `emit` is a sink function, an emitter from `SG.events` (which then decides the verbosity), or null.
   * With a sink, an emitter is created with the verbosity `config.trace`. Events are sent while the
   * pipeline runs; at 'off' only the step start and end events, `done` and `error` are sent. On failure
   * (invalid options, a variant error, an exhausted or cancelled budget) an `error` event is sent and the
   * error is thrown again. A level that cannot be reached is not a failure: the closest puzzle is returned
   * with the warning 'difficulty.approximate'.
   *
   * This is `runSteps` driven to its end without ever yielding: same events, same puzzle.
   *
   * @param {GenerateConfig} config
   * @param {?(function(GenerationEvent): void|Emitter)} emit
   * @param {Object} [budget]  A `SG.budget`; its limits and `cancel()` stop the run through the next check.
   * @returns {PuzzleResult}
   * @throws {SG.errors.GenerationError} For the reasons of `normalizeConfig`, 'digger.unknownStrategy',
   *         'budget.exceeded' and 'budget.cancelled'.
   */
  function run(config, emit, budget) {
    return SG.budget.drive(runSteps(config, emit, budget, { cooperative: false }));
  }

  /**
   * The resumable form of `run`: a generator that returns the `PuzzleResult` (the value of its last
   * `.next()`), so that a scheduler can run the generation in slices and give the thread away between them.
   *
   *     const steps = SG.pipeline.runSteps(config, sink, budget, { now: clock.now });
   *     for (let s = steps.next(); !s.done; s = steps.next()) { ... if (timeIsUp) await yieldToUI(); }
   *
   * It yields (a bare `yield`, no value) at the natural boundaries of the work: after every pipeline step and
   * inside the dig, after each oracle call or rated candidate (see `SG.digger.generateSteps` for the list
   * and for the pieces that are not resumable: the granularity limit). Whoever drives it decides when a
   * slice is long enough; resuming at once costs next to nothing.
   *
   * The events, the random draws, the budget accounting, the puzzle and the result are those of `run`;
   * yielding changes none of them. Errors are thrown from the `.next()` that reaches them, after the `error`
   * event was sent, exactly as `run` throws. To give up, stop calling `.next()` (and call `.return()`): no
   * event is sent for that, the caller reports the cancellation. The generator must not be resumed by two
   * callers, and the engine is not re-entrant per model: nothing may solve the model being generated between
   * two slices (the sink should only collect the events).
   *
   * Time spent between slices should not be charged to the run: create the `budget` and pass `now` from an
   * active clock (`SG.budget.createClock`) that the scheduler resumes before and pauses after each slice;
   * then the time limit, the event times and the step timings count active time only.
   *
   * @param {GenerateConfig} config
   * @param {?(function(GenerationEvent): void|Emitter)} emit
   * @param {Object} [budget]
   * @param {Object} [options]
   * @param {function(): number} [options.now]  Clock of the event times, the step timings and the elapsed
   *        time; default `performance.now`.
   * @param {boolean} [options.cooperative=true]  False: never yield (what `run` does).
   * @param {number} [options.metricIntervalMs]  Throttle of the `metric` events (default 50 ms of `now`).
   * @returns {Generator<undefined, PuzzleResult>}
   */
  function* runSteps(config, emit, budget, options) {
    options = options || {};
    const clock = typeof options.now === 'function' ? options.now : now;
    const coop = options.cooperative !== false;
    const startedAt = clock();
    const owned = !(emit && emit.isEmitter === true);
    const known = config && SG.events.VERBOSITIES.indexOf(config.trace) !== -1;
    const wanted = known ? config.trace : DEFAULT_TRACE;
    const em = owned ? SG.events.createEmitter(wanted, typeof emit === 'function' ? emit : null, {
      now: clock,
      metricIntervalMs: options.metricIntervalMs
    }) : emit;
    const limit = budget || null;
    const stage = SG.digger.createStageSteps(em, { budget: limit, now: clock, cooperative: coop });
    try {
      return yield* executeSteps(config, em, owned, limit, stage, startedAt, clock, coop);
    } catch (err) {
      em.error(stage.current || 'pipeline', err);
      throw err;
    }
  }

  function* executeSteps(config, em, owned, budget, stage, startedAt, clock, coop) {
    const warnings = [];
    let cfg = null;
    let def = null;
    let strategy = null;

    yield* stage('configure', {}, function configureStep() {
      cfg = normalizeConfig(config);
      def = SG.variants.get(cfg.variantId);
      strategy = SG.digger.getStrategy(def.digStrategy || 'cells');
      em.step('configure', 'progress', 'configure.config', {
        variantId: cfg.variantId,
        difficulty: cfg.difficulty,
        seed: cfg.seed,
        symbolMode: cfg.symbolMode,
        symmetry: cfg.symmetry,
        digOrder: cfg.digOrder,
        maxAttempts: cfg.maxAttempts,
        trace: cfg.trace
      });
    });

    const rng = SG.rng.create(cfg.seed);
    let model = null;

    yield* stage('buildModel', { variantId: cfg.variantId }, function buildStep(scope) {
      model = def.build(cfg.variantOptions, rng.fork('model'));
      if (model === null || typeof model !== 'object' || !(model.cellCount >= 1)) {
        throw fail('pipeline.invalidModel', { variantId: cfg.variantId });
      }
      em.step('buildModel', 'progress', 'buildModel.model', {
        variantId: cfg.variantId,
        cellCount: model.cellCount,
        digits: model.digits,
        rows: model.layout.rows,
        cols: model.layout.cols,
        units: model.units.length,
        cages: model.cages.length,
        inequalities: model.inequalities.length
      });
      const spec = SG.difficulty.spec(cfg.difficulty, model);
      em.step('buildModel', 'progress', 'buildModel.spec', {
        level: cfg.difficulty,
        scoreMin: spec.min,
        scoreMax: finiteOrNull(spec.max),
        minClues: spec.minClues,
        maxClues: spec.maxClues,
        minCluesPerUnit: spec.minCluesPerUnit,
        techniques: spec.allowedTechniques.length
      });
      // A full trace of a huge board (Samurai) would be hundreds of thousands of events (design.md 9.4).
      if (owned && em.verbosity === 'full' && model.cellCount > pipeline.FULL_TRACE_MAX_CELLS) {
        em.step('buildModel', 'progress', 'buildModel.traceDowngraded',
          { requested: 'full', applied: 'summary', cellCount: model.cellCount });
        em.setVerbosity('summary');
        cfg.trace = 'summary';
        warnings.push('trace.downgraded');
      }
      scope.metrics = { cells: model.cellCount, units: model.units.length };
    });

    const puzzle = yield* SG.digger.generateSteps(model, cfg.difficulty, rng, {
      symmetry: cfg.symmetry,
      order: cfg.digOrder,
      maxAttempts: cfg.maxAttempts,
      budget: budget,
      emit: em,
      stage: stage,
      cooperative: coop,
      postGenerate: typeof def.postGenerate === 'function' ? def.postGenerate : null,
      strategy: strategy,
      strategyId: def.digStrategy || 'cells'
    });

    const elapsedMs = clock() - startedAt;
    const result = {
      model: puzzle.model,
      givens: puzzle.givens,
      solution: puzzle.solution,
      rating: puzzle.rating,
      seed: cfg.seed,
      config: cfg,
      timings: Object.assign({}, stage.timings),
      attempts: puzzle.attempts,
      warnings: warnings.concat(puzzle.warnings)
    };
    em.done({
      requested: cfg.difficulty,
      achieved: puzzle.achieved,
      exact: puzzle.exact,
      attempts: puzzle.attempts,
      clues: puzzle.clues,
      seed: cfg.seed,
      warnings: result.warnings.slice()
    }, { clues: puzzle.clues, attempts: puzzle.attempts, score: puzzle.rating.score, elapsedMs: elapsedMs });
    return result;
  }

  // ---------------------------------------------------------------------------------------------
  // Crossing a thread boundary (Web Worker)
  // ---------------------------------------------------------------------------------------------

  /** Version of the wire format of `toWire`; `fromWire` refuses any other. */
  const WIRE_VERSION = 1;

  function modelToWire(model) {
    const layout = model.layout;
    return {
      variantId: model.variantId,
      cellCount: model.cellCount,
      digits: model.digits,
      units: Array.from(model.units),
      unitMeta: Array.from(model.unitMeta, function (meta) { return Object.assign({}, meta); }),
      cages: Array.from(model.cages, function (cage) {
        return { cells: cage.cells, sum: cage.sum, distinct: cage.distinct };
      }),
      inequalities: Array.from(model.inequalities, function (sign) { return { a: sign.a, b: sign.b }; }),
      layout: {
        rows: layout.rows,
        cols: layout.cols,
        cellRow: layout.cellRow,
        cellCol: layout.cellCol,
        cellRegion: layout.cellRegion,
        overlays: Array.from(layout.overlays, function (o) { return { kind: o.kind, cells: o.cells }; }),
        subGrids: Array.from(layout.subGrids, function (g) {
          return { gridIndex: g.gridIndex, originRow: g.originRow, originCol: g.originCol };
        })
      },
      symbols: { mode: model.symbols.mode, labels: Array.from(model.symbols.labels) },
      fixedCells: model.fixedCells
    };
  }

  /**
   * The `PuzzleResult` as data that survives `postMessage` (structured cloning) and nothing else: the model
   * is reduced to what `SG.model.create` needs (its units, cages, signs, layout, symbols and fixed cells;
   * `cellUnits` and `peers` are derived data and stay behind), everything else of the result is already
   * plain data and typed arrays. Typed arrays are shared, not copied; the clone that `postMessage` makes is
   * the copy. See `fromWire`.
   * @param {PuzzleResult} result
   * @returns {Object} `{ v, model, givens, solution, rating, seed, config, timings, attempts, warnings }`.
   */
  function toWire(result) {
    return {
      v: WIRE_VERSION,
      model: modelToWire(result.model),
      givens: result.givens,
      solution: result.solution,
      rating: result.rating,
      seed: result.seed,
      config: result.config,
      timings: result.timings,
      attempts: result.attempts,
      warnings: result.warnings
    };
  }

  /**
   * Rebuilds a `PuzzleResult` from `toWire` data, on the thread that receives it. The model is created anew
   * with `SG.model.create` (so it is frozen and has its derived `cellUnits` / `peers`, like the model the
   * generator made), and the lazy propagation extensions of the variants that need them are switched on:
   * `SG.comboTable.enablePropagation` for a model with cages (Killer) and `SG.ineq.ensureExtension` for a
   * model with signs (Greater-Than). Without them `SG.dfs` on the model would ignore the cage sums and the
   * signs and count solutions of a different puzzle. See memory.md 6.5.
   *
   * What does not cross: the side data that the variants keep per model object in WeakMaps (a layout report,
   * the scope of the signs, build notes); nothing in the UI reads them. Everything a renderer needs is in the
   * model itself.
   *
   * @param {Object} wire  What `toWire` made (after any number of structured clones).
   * @returns {PuzzleResult}
   * @throws {SG.errors.GenerationError} 'unexpected' for data that is not of this wire version.
   */
  function fromWire(wire) {
    if (wire === null || typeof wire !== 'object' || wire.v !== WIRE_VERSION || !wire.model) {
      throw fail('unexpected', { message: 'unsupported result format' });
    }
    const model = SG.model.create(wire.model);
    if (model.cages.length > 0 && SG.comboTable) SG.comboTable.enablePropagation(model.variantId);
    if (model.inequalities.length > 0 && SG.ineq) SG.ineq.ensureExtension();
    return {
      model: model,
      givens: wire.givens,
      solution: wire.solution,
      rating: wire.rating,
      seed: wire.seed,
      config: wire.config,
      timings: wire.timings,
      attempts: wire.attempts,
      warnings: wire.warnings
    };
  }

  const pipeline = {
    STEPS: STEPS,
    DEFAULT_MAX_ATTEMPTS: DEFAULT_MAX_ATTEMPTS,
    /** A 'full' trace is downgraded to 'summary' for boards with more cells than this (design.md 9.4). */
    FULL_TRACE_MAX_CELLS: 300,
    normalizeConfig: normalizeConfig,
    run: run,
    runSteps: runSteps,
    toWire: toWire,
    fromWire: fromWire
  };

  SG.pipeline = pipeline;
})(typeof self !== 'undefined' ? self : globalThis);
