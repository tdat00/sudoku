/**
 * Generation pipeline: `SG.pipeline.run(config, emit, budget)` turns a GenerateConfig into a PuzzleResult
 * through seven steps, reported as events: configure, buildModel, fullGrid, extraStructure
 * (`variant.postGenerate`), dig, rate, tune. fullGrid..tune repeat per attempt (a new grid after
 * `retry.difficulty`), dig..tune per dig sample. dig = every removal plus the uniqueness check, rate = rating
 * of the finished puzzle, tune = band check: accept or retry.
 *
 * The restart loop (which grid, which dig sample, which puzzle is closest) lives in `SG.digger.generate`, so
 * the puzzle is the same through the pipeline or by direct calls; `generate` forks the random streams by
 * fixed names ('grid#A', 'extra#A', 'dig#A.T'; this file only adds 'model'). The pipeline owns config, model,
 * step events and timings, variant hooks, warnings, budget and result. The emitter never feeds back into the
 * algorithm, so the puzzle does not depend on `config.trace`.
 *
 * `run` is `runSteps` (a generator that yields at natural boundaries, for schedulers running it in slices:
 * the `SG.workerClient` fallback and the worker) driven to its end, so events, puzzle and budget accounting
 * cannot differ. `toWire` / `fromWire` carry a result across `postMessage`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const STEPS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];

  const DEFAULT_DIFFICULTY = 'normal';
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

  // GenerateConfig: variantId, difficulty (default 'normal'; a level the variant supports), seed (default
  // random; uint32 once normalised), symbolMode (default: the variant's), symmetry (SG.symmetry.KINDS,
  // default 'rotational180'), digOrder (SG.digger.ORDERS, default 'random'), maxAttempts (default 8: full
  // grids tried before settling for the closest puzzle), trace ('off' | 'summary' | 'full', default
  // 'summary'), variantOptions (plain data for variant.build).

  // Normalises and validates a configuration (defaults filled, seed fixed) into plain data that goes into
  // PuzzleResult.config and survives postMessage. Throws GenerationError ('variant.unknown',
  // 'difficulty.unknownLevel', 'difficulty.unsupportedLevel', 'rng.invalidSeed', 'symmetry.unknownKind',
  // 'digger.invalidOption', 'events.invalidVerbosity', 'pipeline.invalidOption').
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

  // PuzzleResult: model (with the structure `postGenerate` added), givens (0 = empty; a subset of solution),
  // solution, rating (SG.difficulty.rate; rating.level is the achieved level, config.difficulty the requested
  // one), seed, config (normalised; `trace` as applied), timings (ms per step id, all seven keys, summed over
  // attempts and samples), attempts (full grids generated), warnings (i18n keys: 'difficulty.approximate' =
  // closest puzzle returned, 'digger.unsoundTechnique', 'trace.downgraded'), digLog (dig log of
  // SG.digger.generate for the sample that became the puzzle; the UI builds its replay from it, whatever
  // `config.trace` was).

  // `emit` is a sink function, an `SG.events` emitter (which decides the verbosity) or null; a sink gets an
  // emitter with verbosity `config.trace`. At 'off' only step start/end, `done` and `error` events are sent.
  // On failure an `error` event is sent and the error rethrown; an unreachable level is not a failure: the
  // closest puzzle is returned with warning 'difficulty.approximate'. This is `runSteps` driven to its end
  // without yielding. Throws the errors of `normalizeConfig`, 'digger.unknownStrategy', 'budget.exceeded',
  // 'budget.cancelled'.
  function run(config, emit, budget) {
    return SG.budget.drive(runSteps(config, emit, budget, { cooperative: false }));
  }

  // Resumable form of `run`: a generator returning the PuzzleResult, so a scheduler can run generation in
  // slices:
  //     const steps = SG.pipeline.runSteps(config, sink, budget, { now: clock.now });
  //     for (let s = steps.next(); !s.done; s = steps.next()) { ... if (timeIsUp) await yieldToUI(); }
  // Yields (a bare `yield`) after every pipeline step and, inside the dig, after each oracle call or rated
  // candidate (see `SG.digger.generateSteps` for the granularity limits). Events, random draws, budget
  // accounting and result are those of `run`. Errors are thrown from the `.next()` that reaches them, after
  // the `error` event. To give up, stop calling `.next()` (and call `.return()`): no event is sent. Do not
  // resume it from two callers; the engine is not re-entrant per model, so nothing may solve the model being
  // generated between slices (the sink should only collect events).
  // To keep the time between slices out of the run, pass `budget` and `now` from an active clock
  // (`SG.budget.createClock`) that the scheduler resumes before and pauses after each slice. options: now
  // (clock of event times, step timings and elapsed time; default performance.now), cooperative (default
  // true; false = never yield), metricIntervalMs (throttle of `metric` events, default 50 ms of `now`).
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
      // A full trace of a huge board (Samurai) would be hundreds of thousands of events.
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
      warnings: warnings.concat(puzzle.warnings),
      digLog: puzzle.log
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

  // The PuzzleResult as data that survives postMessage and nothing else: the model is reduced to what
  // `SG.model.create` needs (`cellUnits` and `peers` are derived and stay behind). Typed arrays are shared,
  // not copied; the clone `postMessage` makes is the copy.
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
      warnings: result.warnings,
      digLog: result.digLog
    };
  }

  // Rebuilds a PuzzleResult from `toWire` data on the receiving thread. The model is created anew with
  // `SG.model.create` and the lazy propagation extensions are switched on (`SG.comboTable.enablePropagation`
  // for cages, `SG.ineq.ensureExtension` for signs): without them `SG.dfs` would ignore cage sums and signs
  // and count solutions of a different puzzle. Per-model side data the variants keep in WeakMaps (layout
  // report, sign scope, build notes) does not cross; the UI does not read it. Throws 'unexpected' for data of
  // another wire version.
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
      warnings: wire.warnings,
      digLog: Array.isArray(wire.digLog) ? wire.digLog : undefined
    };
  }

  const pipeline = {
    STEPS: STEPS,
    DEFAULT_MAX_ATTEMPTS: DEFAULT_MAX_ATTEMPTS,
    /** A 'full' trace is downgraded to 'summary' for boards with more cells than this. */
    FULL_TRACE_MAX_CELLS: 300,
    normalizeConfig: normalizeConfig,
    run: run,
    runSteps: runSteps,
    toWire: toWire,
    fromWire: fromWire
  };

  SG.pipeline = pipeline;
})(typeof self !== 'undefined' ? self : globalThis);
