// The resumable pipeline, the generation worker and the generation client (task T-6.1; design.md 9.3):
//
//  - core: `SG.pipeline.runSteps` / `SG.digger.generateSteps` give the same events and the same puzzle as the
//    synchronous `run` / `generate`, whatever the size of the slices; the active clock; the wire format that
//    carries a result across `postMessage` (the model is rebuilt and the lazy extensions are switched on)
//  - the Killer cage layout (`postGenerate.steps`) and the Greater-Than sign dig (`digSigns` with
//    `cooperative`) are sliced: same events and results, and no slice longer than one layout search / a few
//    thousand nodes (counted with the budget, not timed)
//  - the client against fake workers: handshake, protocol, batching, cancellation, overlapping runs, session
//    isolation, errors, fallback to the main thread, dispose
//  - the real js/worker/gen.worker.js in a vm context behind a fake Worker (Node only): the same files in the
//    same order as SOURCE_FILES, batching, cancellation, results identical to the main thread mode
//  - the main thread mode with a fake scheduler: slices, cancellation at a slice boundary, active time
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var P = SG.pipeline;
  var D = SG.digger;
  var node = SG.test.node;
  var SLOW = 120000;
  var CLIENT = SG.workerClient;

  // ---------------------------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------------------------

  function tick() {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /** Resolves when `predicate()` holds; rejects after `ms` (default 4 s). */
  function until(predicate, ms) {
    var limit = Date.now() + (ms || 4000);
    return new Promise(function (resolve, reject) {
      (function poll() {
        if (predicate()) resolve();
        else if (Date.now() > limit) reject(new Error('condition not reached: ' + predicate));
        else setTimeout(poll, 1);
      })();
    });
  }

  /** The error of a promise that must reject (a handler is attached at once: no unhandled rejection). */
  function failure(promise) {
    return promise.then(function () {
      throw new Error('expected a rejection');
    }, function (err) { return err; });
  }

  function expectCode(err, code) {
    expect(err instanceof SG.errors.GenerationError).toBe(true);
    expect(err.code).toBe(code);
    return err;
  }

  function tickingClock(step) {
    var t = 0;
    return function () { t += step; return t; };
  }

  function cfg(extra) {
    return Object.assign({ variantId: 'classic9', difficulty: 'medium', seed: 1, trace: 'summary' }, extra);
  }

  /** Events without time stamps, sequence numbers, time throttled `metric` events and the elapsed time. */
  function shape(events) {
    return events.filter(function (e) { return e.type !== 'metric'; }).map(function (e) {
      var copy = Object.assign({}, e);
      delete copy.t;
      delete copy.seq;
      if (copy.metrics && copy.metrics.elapsedMs !== undefined) {
        copy.metrics = Object.assign({}, copy.metrics, { elapsedMs: 0 });
      }
      return copy;
    });
  }

  function runSync(config) {
    var events = [];
    var result = P.run(config, function (e) { events.push(e); });
    return { result: result, events: events };
  }

  /** Runs the stepper `size` steps per slice; returns { result, events, yields }. */
  function runSliced(config, size, extra) {
    var events = [];
    var options = Object.assign({ cooperative: true }, extra);
    var steps = P.runSteps(config, function (e) { events.push(e); }, null, options);
    var yields = 0;
    var step;
    for (;;) {
      for (var i = 0; i < size; i++) {
        step = steps.next();
        if (step.done) break;
        yields++;
      }
      if (step.done) break;
    }
    return { result: step.value, events: events, yields: yields };
  }

  function expectSameResult(a, b) {
    expect(a.givens).toEqual(b.givens);
    expect(a.solution).toEqual(b.solution);
    expect(a.rating).toEqual(b.rating);
    expect(a.seed).toBe(b.seed);
    expect(a.config).toEqual(b.config);
    expect(a.attempts).toBe(b.attempts);
    expect(a.warnings).toEqual(b.warnings);
    expect(a.model).toEqual(b.model);
    expect(Object.keys(a.timings)).toEqual(Object.keys(b.timings));
  }

  var CASES = [
    { variantId: 'classic4', difficulty: 'veryEasy', seed: 1, trace: 'full' },
    { variantId: 'classic9', difficulty: 'medium', seed: 7, trace: 'summary' },
    { variantId: 'classic9', difficulty: 'hard', seed: 3, trace: 'off' },
    { variantId: 'classic9', difficulty: 'expert', seed: 11, trace: 'summary', maxAttempts: 1 },
    { variantId: 'killer', difficulty: 'easy', seed: 2, trace: 'summary' },
    { variantId: 'greaterThan', difficulty: 'easy', seed: 5, trace: 'summary' },
    { variantId: 'jigsaw9', difficulty: 'medium', seed: 4, trace: 'summary' },
    { variantId: 'mega12', difficulty: 'medium', seed: 1, trace: 'summary' },
    { variantId: 'wordoku', difficulty: 'easy', seed: 9, trace: 'summary',
      variantOptions: { language: 'vi' } },
    { variantId: 'samurai', difficulty: 'veryEasy', seed: 2, trace: 'full' },
    { variantId: 'diagonalX', difficulty: 'expert', seed: 6, trace: 'summary' }
  ];

  function caseName(c) {
    return c.variantId + '/' + c.difficulty + ' seed ' + c.seed + ' trace ' + c.trace;
  }

  // ---------------------------------------------------------------------------------------------
  // Core: run control
  // ---------------------------------------------------------------------------------------------

  describe('SG.budget: active clock and stepper helpers', function () {
    it('createClock counts only while it runs', function () {
      var raw = 100;
      var clock = SG.budget.createClock(function () { return raw; });
      expect(clock.now()).toBe(0);
      expect(clock.running).toBe(false);
      raw = 150;
      expect(clock.now()).toBe(0);
      clock.resume();
      raw = 170;
      expect(clock.now()).toBe(20);
      expect(clock.running).toBe(true);
      clock.resume();
      raw = 180;
      clock.pause();
      expect(clock.now()).toBe(30);
      raw = 100000;
      expect(clock.now()).toBe(30);
      clock.pause();
      clock.resume();
      raw = 100005;
      expect(clock.now()).toBe(35);
    });

    it('drive runs a stepper to its end and returns its value; other values pass through', function () {
      function* three() {
        yield 1;
        yield 2;
        return 'end';
      }
      expect(SG.budget.drive(three())).toBe('end');
      expect(SG.budget.drive(7)).toBe(7);
      expect(SG.budget.isSteps(three())).toBe(true);
      expect(SG.budget.isSteps({ givens: [] })).toBe(false);
      expect(SG.budget.isSteps(null)).toBe(false);
      expect(SG.budget.isSteps([1, 2])).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Core: stepper against the synchronous API
  // ---------------------------------------------------------------------------------------------

  describe('SG.pipeline.runSteps: the same run as SG.pipeline.run', function () {
    CASES.forEach(function (c) {
      it(caseName(c) + ': slices of 1 step, of 25 steps and run() give one puzzle and trace', function () {
        var sync = runSync(c);
        var one = runSliced(c, 1);
        var many = runSliced(c, 25);
        expectSameResult(one.result, sync.result);
        expectSameResult(many.result, sync.result);
        expect(shape(one.events)).toEqual(shape(sync.events));
        expect(shape(many.events)).toEqual(shape(sync.events));
        // It really was sliced: more yields than the seven steps.
        expect(one.yields).toBeGreaterThan(6);
      }, SLOW);
    });

    it('with a deterministic clock even the time stamps and the metric events are identical', function () {
      ['classic9', 'killer', 'jigsaw9'].forEach(function (variantId) {
        var c = cfg({ variantId: variantId, difficulty: 'medium', seed: 21 });
        var straight = runSliced(c, 1e9, { now: tickingClock(1), cooperative: false });
        var sliced = runSliced(c, 1, { now: tickingClock(1) });
        expect(sliced.events).toEqual(straight.events);
        expect(sliced.result.timings).toEqual(straight.result.timings);
        expect(straight.events.filter(function (e) { return e.type === 'metric'; }).length)
          .toBeGreaterThan(0);
      });
    }, SLOW);

    it('cooperative: false never yields', function () {
      var steps = P.runSteps(cfg({ variantId: 'classic4', difficulty: 'veryEasy' }), null, null,
        { cooperative: false });
      var first = steps.next();
      expect(first.done).toBe(true);
      expect(first.value.givens.length).toBe(16);
    });

    it('abandoning a run with return() stops it quietly: no error event, nothing more happens', function () {
      var events = [];
      var steps = P.runSteps(cfg(), function (e) { events.push(e); }, null, {});
      for (var i = 0; i < 40; i++) steps.next();
      var seen = events.length;
      expect(seen).toBeGreaterThan(3);
      expect(steps.return('stop').done).toBe(true);
      expect(steps.next().done).toBe(true);
      expect(events.length).toBe(seen);
      expect(events.some(function (e) { return e.type === 'error' || e.type === 'done'; })).toBe(false);
    });

    it('an error comes out of the next() that reaches it, after its error event, as from run()', function () {
      var events = [];
      var budget = SG.budget.create({ nodes: 30 });
      var steps = P.runSteps(cfg({ difficulty: 'evil', seed: 5 }), function (e) { events.push(e); }, budget);
      var thrown = null;
      try {
        for (var i = 0; i < 1e6; i++) if (steps.next().done) break;
      } catch (err) {
        thrown = err;
      }
      expectCode(thrown, 'budget.exceeded');
      expect(events[events.length - 1].type).toBe('error');
      expect(events[events.length - 1].i18nKey).toBe('error.budget.exceeded');
      var plain = null;
      try {
        P.run(cfg({ difficulty: 'evil', seed: 5 }), null, SG.budget.create({ nodes: 30 }));
      } catch (err) {
        plain = err;
      }
      expectCode(plain, 'budget.exceeded');
    });

    it('an invalid configuration throws from the first next(), with its error event', function () {
      var events = [];
      var steps = P.runSteps({ variantId: 'nope' }, function (e) { events.push(e); });
      var thrown = null;
      try {
        steps.next();
      } catch (err) {
        thrown = err;
      }
      expectCode(thrown, 'variant.unknown');
      expect(events.filter(function (e) { return e.type === 'error'; })).toHaveLength(1);
    });

    it('time given away between slices is charged to nothing: timings, event times, time limit', function () {
      var offset = 0;
      var clock = SG.budget.createClock(function () { return performance.now() + offset; });
      var budget = SG.budget.create({ ms: 5000, now: clock.now });
      var events = [];
      var steps = P.runSteps(cfg({ variantId: 'killer', difficulty: 'medium', seed: 2 }),
        function (e) { events.push(e); }, budget, { now: clock.now });
      var step;
      var slices = 0;
      for (;;) {
        clock.resume();
        step = steps.next();
        clock.pause();
        if (step.done) break;
        slices++;
        offset += 1e6;
      }
      expect(slices).toBeGreaterThan(50);
      var total = 0;
      Object.keys(step.value.timings).forEach(function (id) { total += step.value.timings[id]; });
      expect(total).toBeLessThan(5000);
      var last = events[events.length - 1];
      expect(last.type).toBe('done');
      expect(last.t).toBeLessThan(5000);
      expect(budget.isCancelled).toBe(false);
    }, SLOW);
  });

  describe('SG.digger: resumable forms', function () {
    it('generate(), generateSteps() and a plain stage runner (the old `stage` option) agree', function () {
      var model = SG.variants.get('classic9').build({}, null);
      var spec = { cooperative: false };
      function options(extra) {
        return Object.assign({ maxAttempts: 3 }, spec, extra);
      }
      var plainEvents = [];
      var plainEmitter = SG.events.createEmitter('summary', function (e) { plainEvents.push(e); },
        { now: tickingClock(1) });
      var viaStage = D.generate(model, 'medium', SG.rng.create(31), options({
        emit: plainEmitter, stage: SG.events.createStageRunner(plainEmitter, { now: tickingClock(1) })
      }));
      var direct = D.generate(model, 'medium', SG.rng.create(31), options({}));
      var stepped = SG.budget.drive(D.generateSteps(model, 'medium', SG.rng.create(31),
        options({ cooperative: true })));
      expect(viaStage.givens).toEqual(direct.givens);
      expect(stepped.givens).toEqual(direct.givens);
      expect(stepped.rating).toEqual(direct.rating);
      expect(stepped.samples).toBe(direct.samples);
      expect(plainEvents.length).toBeGreaterThan(10);
    });

    it('digStage returns the result, and with `cooperative` the generator of it', function () {
      var model = SG.variants.get('classic9').build({}, null);
      var solution = SG.fullGrid.generate(model, SG.rng.create(3), null);
      var plain = D.digStage(model, solution, 'medium', SG.rng.create(4), {});
      expect(SG.budget.isSteps(plain)).toBe(false);
      expect(plain.givens.length).toBe(81);
      var steps = D.digStage(model, solution, 'medium', SG.rng.create(4), { cooperative: true });
      expect(SG.budget.isSteps(steps)).toBe(true);
      var yields = 0;
      var step;
      while (!(step = steps.next()).done) yields++;
      expect(yields).toBeGreaterThan(20);
      expect(step.value.givens).toEqual(plain.givens);
      expect(step.value.clues).toBe(plain.clues);
    });

    it('a variant hook with a resumable twin (hook.steps) is sliced when cooperating', function () {
      var model = SG.variants.get('classic9').build({}, null);
      var calls = { steps: 0, plain: 0 };
      function hook() {
        calls.plain++;
        return undefined;
      }
      hook.steps = function* () {
        calls.steps++;
        for (var i = 0; i < 5; i++) yield;
        return undefined;
      };
      function run(cooperative) {
        var steps = D.generateSteps(model, 'easy', SG.rng.create(17),
          { cooperative: cooperative, postGenerate: hook, maxAttempts: 2 });
        var yields = 0;
        var step;
        while (!(step = steps.next()).done) yields++;
        return { puzzle: step.value, yields: yields };
      }
      var sliced = run(true);
      var whole = run(false);
      expect(calls.steps).toBeGreaterThan(0);
      expect(calls.plain).toBeGreaterThan(0);
      expect(whole.yields).toBe(0);
      expect(sliced.yields).toBeGreaterThan(5 * calls.steps);
      expect(sliced.puzzle.givens).toEqual(whole.puzzle.givens);
    });

    it('a strategy that wraps digStage (the Killer one) is sliced inside the dig; one that does not is not',
      function () {
        var killer = runSliced(cfg({ variantId: 'killer', difficulty: 'hard', seed: 3 }), 1);
        // One sample of a Killer dig is hundreds of oracle calls and candidates, not a handful of steps.
        expect(killer.yields).toBeGreaterThan(100);
        var model = SG.variants.get('classic9').build({}, null);
        var solution = SG.fullGrid.generate(model, SG.rng.create(3), null);
        function atOnce(m, s, level, rng, options) {
          return D.digStage(m, s, level, rng, Object.assign({}, options, { cooperative: false }));
        }
        var steps = D.digLevelSteps(model, solution, 'medium', SG.rng.create(9),
          { cooperative: true, strategy: atOnce });
        var yields = 0;
        while (!steps.next().done) yields++;
        // Only the boundaries of its three steps are left.
        expect(yields).toBeLessThan(6);
      }, SLOW);
  });

  // ---------------------------------------------------------------------------------------------
  // Variant work that used to be one piece: the Killer cage layout, the Greater-Than sign dig
  // ---------------------------------------------------------------------------------------------

  describe('Resumable variant work: Killer layout and Greater-Than sign dig', function () {
    // Seeds picked for the work they need: the Killer ones repair the layout (split / merge / reveal),
    // the Greater-Than ones run several rounds of the sign dig.
    var SLICED = [
      { variantId: 'killer', difficulty: 'hard', seed: 5, trace: 'full' },
      { variantId: 'killer', difficulty: 'expert', seed: 2, trace: 'summary' },
      { variantId: 'greaterThan', difficulty: 'hard', seed: 3, trace: 'full' },
      { variantId: 'greaterThan', difficulty: 'expert', seed: 2, trace: 'summary' }
    ];
    /** A search of the layout check is cut off at this many nodes (ANALYSIS_NODES of killer.js). */
    var ANALYSIS_NODES = 30000;

    /** What the pipeline hands the hooks of a variant on its first attempt (same streams, same grid). */
    function firstAttempt(variantId, level, seed) {
      var def = SG.variants.get(variantId);
      var master = SG.rng.create(seed);
      var model = def.build({}, master.fork('model'));
      var solution = SG.fullGrid.generate(model, master.fork('grid#1'), null);
      return {
        model: model,
        solution: solution,
        rng: master.fork('extra#1'),
        level: level,
        spec: SG.difficulty.spec(level, model),
        attempt: 1,
        budget: null,
        emit: null,
        variantId: variantId
      };
    }

    function count(steps) {
      var yields = 0;
      var step;
      while (!(step = steps.next()).done) yields++;
      return { value: step.value, yields: yields };
    }

    /**
     * Runs the stepper with a counting budget and returns, per pipeline step, the most budget nodes (search
     * nodes, propagation and solver steps) that one slice spent, and how many slices there were. The slice
     * belongs to the step that is current when it ends. Nodes are the proxy for time: deterministic, and
     * about 2.5 microseconds each in the layout searches.
     */
    function sliceWork(config) {
      var budget = SG.budget.create({});
      var current = null;
      var steps = P.runSteps(config, function (e) {
        if (e.stepId) current = e.stepId;
      }, budget, { cooperative: true });
      var longest = {};
      var slices = {};
      var spent = 0;
      var step;
      do {
        step = steps.next();
        var used = budget.nodes - spent;
        spent = budget.nodes;
        longest[current] = Math.max(longest[current] || 0, used);
        slices[current] = (slices[current] || 0) + 1;
      } while (!step.done);
      return { longest: longest, slices: slices };
    }

    SLICED.forEach(function (c) {
      it(caseName(c) + ': slices of 1 step, of 25 steps and run() give one puzzle and trace', function () {
        var sync = runSync(c);
        var one = runSliced(c, 1);
        var many = runSliced(c, 25);
        expectSameResult(one.result, sync.result);
        expectSameResult(many.result, sync.result);
        expect(shape(one.events)).toEqual(shape(sync.events));
        expect(shape(many.events)).toEqual(shape(sync.events));
        if (c.variantId === 'killer') {
          var info = SG.killer.layoutInfo(sync.result.model);
          expect(info.repairs.length).toBeGreaterThan(0);
          expect(SG.killer.layoutInfo(one.result.model)).toEqual(info);
          expect(SG.killer.layoutInfo(many.result.model)).toEqual(info);
        }
      }, SLOW);
    });

    it('the Killer hook has a resumable twin: same layout, same repair record, many yields', function () {
      var hook = SG.variants.get('killer').postGenerate;
      expect(typeof hook.steps).toBe('function');
      var plain = hook(firstAttempt('killer', 'hard', 5));
      var stepped = count(hook.steps(firstAttempt('killer', 'hard', 5)));
      expect(stepped.value.cages).toEqual(plain.cages);
      expect(stepped.value.layout.overlays).toEqual(plain.layout.overlays);
      expect(SG.killer.layoutInfo(stepped.value)).toEqual(SG.killer.layoutInfo(plain));
      expect(SG.killer.layoutInfo(plain).repairs.length).toBeGreaterThan(5);
      expect(stepped.yields).toBeGreaterThan(20);
    }, SLOW);

    it('the Killer layout of a level that skips the check is one piece with a single yield', function () {
      var hook = SG.variants.get('killer').postGenerate;
      var plain = hook(firstAttempt('killer', 'medium', 5));
      var stepped = count(hook.steps(firstAttempt('killer', 'medium', 5)));
      expect(stepped.value.cages).toEqual(plain.cages);
      expect(stepped.yields).toBeLessThan(3);
    });

    it('the sign dig returns the result, and with `cooperative` the generator of it', function () {
      var ctx = firstAttempt('greaterThan', 'hard', 3);
      var model = SG.variants.get('greaterThan').postGenerate(ctx);
      function dig(extra) {
        return SG.greaterThan.digSigns(model, ctx.solution, 'hard', SG.rng.create(8),
          Object.assign({ spec: ctx.spec }, extra));
      }
      var plain = dig({});
      expect(SG.budget.isSteps(plain)).toBe(false);
      var steps = dig({ cooperative: true });
      expect(SG.budget.isSteps(steps)).toBe(true);
      var stepped = count(steps);
      expect(stepped.yields).toBeGreaterThan(50);
      expect(stepped.value.givens).toEqual(plain.givens);
      expect(stepped.value.clues).toBe(plain.clues);
      expect(stepped.value.stats).toEqual(plain.stats);
      expect(stepped.value.model.inequalities).toEqual(plain.model.inequalities);
    }, SLOW);

    it('one slice of the Killer layout never exceeds one search of its check (it was the whole layout)',
      function () {
        [SLICED[0], SLICED[1]].forEach(function (c) {
          var work = sliceWork(c);
          // Before: the whole layout of an attempt, 80 000 to 160 000 nodes, in one slice.
          expect(work.longest.extraStructure).toBeLessThan(ANALYSIS_NODES + 1000);
          expect(work.slices.extraStructure).toBeGreaterThan(20);
        });
      }, SLOW);

    it('one slice of the Greater-Than sign dig is a few thousand nodes at most (it was a whole sample)',
      function () {
        [SLICED[2], SLICED[3]].forEach(function (c) {
          var work = sliceWork(c);
          // Before: the whole dig of a sample, 100 000 to 230 000 nodes, in one slice. Now one sign candidate:
          // its uniqueness check and its solve with the techniques of the level (since rating v2 the expert
          // set has forcing chains, which makes a solve a few thousand nodes longer).
          expect(work.longest.dig).toBeLessThan(16000);
          expect(work.slices.dig).toBeGreaterThan(100);
        });
      }, SLOW);
  });

  // ---------------------------------------------------------------------------------------------
  // Core: the wire format
  // ---------------------------------------------------------------------------------------------

  describe('SG.pipeline.toWire / fromWire: a result across postMessage', function () {
    var WIRE_CASES = [
      ['classic4', 'veryEasy'], ['classic6', 'veryEasy'], ['classic9', 'easy'], ['diagonalX', 'easy'],
      ['hyper', 'easy'], ['jigsaw9', 'easy'], ['killer', 'easy'], ['greaterThan', 'easy'],
      ['mega12', 'veryEasy'], ['mega16', 'veryEasy'], ['samurai', 'veryEasy'], ['sohei', 'veryEasy'],
      ['butterfly', 'veryEasy'], ['flower', 'veryEasy'], ['wordoku', 'easy']
    ];

    /** Switches the lazy extensions off, as in a page that never built a Killer or a Greater-Than model. */
    function withoutExtensions(fn) {
      var hadIneq = SG.constraints.listExtensions().indexOf(SG.ineq.EXTENSION_ID) !== -1;
      var hadKiller = SG.constraints.listExtensions().indexOf(SG.comboTable.extension.id) !== -1;
      SG.comboTable.disablePropagation();
      SG.constraints.unregisterExtension(SG.ineq.EXTENSION_ID);
      try {
        fn();
      } finally {
        if (hadKiller) SG.comboTable.enablePropagation('killer');
        if (hadIneq) SG.ineq.ensureExtension();
      }
    }

    WIRE_CASES.forEach(function (pair) {
      it(pair[0] + ': a cloned wire result gives an equal, frozen, valid model with exactly one solution',
        function () {
          var made = P.run({ variantId: pair[0], difficulty: pair[1], seed: 13, trace: 'off' }, null);
          var wire = structuredClone(P.toWire(made));
          withoutExtensions(function () {
            var back = P.fromWire(wire);
            expectSameResult(back, made);
            expect(back.model).not.toBe(made.model);
            expect(Object.isFrozen(back.model)).toBe(true);
            expect(SG.model.validate(back.model).ok).toBe(true);
            expect(SG.dfs.countSolutions(back.model, back.givens, 2)).toBe(1);
            expect(SG.model.isSolution(back.model, back.solution)).toBe(true);
            if (back.model.cages.length > 0) {
              expect(SG.constraints.listExtensions()).toContain(SG.comboTable.extension.id);
            }
            if (back.model.inequalities.length > 0) {
              expect(SG.constraints.listExtensions()).toContain(SG.ineq.EXTENSION_ID);
            }
          });
        }, SLOW);
    });

    it('without the extensions a Killer model would be solved without its cages: that is why they are set',
      function () {
        var made = P.run({ variantId: 'killer', difficulty: 'easy', seed: 13, trace: 'off' }, null);
        var wire = structuredClone(P.toWire(made));
        withoutExtensions(function () {
          var rebuilt = SG.model.create(wire.model);
          // Nothing registered: the cage sums are not enforced.
          expect(SG.dfs.countSolutions(rebuilt, made.givens, 2)).toBe(2);
          var back = P.fromWire(wire);
          expect(SG.dfs.countSolutions(back.model, back.givens, 2)).toBe(1);
        });
      });

    it('wordoku in its Vietnamese fallback keeps its word, its letters and its fallback warning-free result',
      function () {
        var fellBack = SG.wordoku.resolveWordList('vi').fellBack;
        var made = P.run({ variantId: 'wordoku', difficulty: 'easy', seed: 4, trace: 'off',
          variantOptions: { language: 'vi' } }, null);
        var back = P.fromWire(structuredClone(P.toWire(made)));
        expect(SG.wordoku.describe(back.model)).toEqual(SG.wordoku.describe(made.model));
        expect(back.model.symbols).toEqual(made.model.symbols);
        expect(back.model.symbols.mode).toBe('word');
        expect(typeof fellBack).toBe('boolean');
        expect(SG.dfs.countSolutions(back.model, back.givens, 2)).toBe(1);
      });

    it('the wire object is plain data: structured cloning keeps every field', function () {
      var made = P.run({ variantId: 'greaterThan', difficulty: 'easy', seed: 2, trace: 'off' }, null);
      var wire = P.toWire(made);
      expect(wire.model.cellUnits).toBeUndefined();
      expect(wire.model.peers).toBeUndefined();
      expect(typeof wire.v).toBe('number');
      expect(structuredClone(wire)).toEqual(wire);
    });

    it('refuses data that is not of its version', function () {
      expectCode((function () { try { P.fromWire({ v: 99 }); } catch (e) { return e; } })(), 'unexpected');
      expectCode((function () { try { P.fromWire(null); } catch (e) { return e; } })(), 'unexpected');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The client against a scripted fake worker
  // ---------------------------------------------------------------------------------------------

  /** A Worker stand-in that records what the page posts and lets the test say what the worker answers. */
  function createFakeWorker(options) {
    var opts = options || {};
    var w = {
      onmessage: null,
      onerror: null,
      onmessageerror: null,
      posted: [],
      terminated: false,
      postMessage: function (message) {
        if (opts.failPost && opts.failPost(message)) throw new Error('DataCloneError');
        var copy = structuredClone(message);
        w.posted.push(copy);
        if (copy.type === 'ping' && opts.pong !== false) {
          Promise.resolve().then(function () {
            w.say({ type: 'pong', id: copy.id, ok: opts.pongOk !== false });
          });
        }
        if (copy.type === 'cancel' && opts.ack) {
          Promise.resolve().then(function () { w.say({ type: 'cancelled', session: copy.session }); });
        }
      },
      terminate: function () { w.terminated = true; },
      say: function (message) {
        if (w.onmessage) w.onmessage({ data: structuredClone(message) });
      },
      ofType: function (type) {
        return w.posted.filter(function (m) { return m.type === type; });
      }
    };
    return w;
  }

  /** A factory that hands out fake workers and records them (and the URLs asked for). */
  function createFactory(options) {
    var made = [];
    var urls = [];
    function factory(url) {
      urls.push(url);
      if (options && options.throws) throw new Error('SecurityError');
      var w = createFakeWorker(options && options.workers ? options.workers[made.length] : options);
      made.push(w);
      return w;
    }
    factory.made = made;
    factory.urls = urls;
    return factory;
  }

  var wireClassic4 = null;
  function classic4Wire() {
    if (wireClassic4 === null) {
      wireClassic4 = P.toWire(P.run({ variantId: 'classic4', difficulty: 'veryEasy', seed: 5, trace: 'off' },
        null));
    }
    return wireClassic4;
  }

  function makeClient(extra) {
    var factory = createFactory(extra && extra.factory);
    var client = CLIENT.create(Object.assign({
      workerFactory: factory, readyTimeoutMs: 40, killAfterMs: 30
    }, extra));
    client.factory = factory;
    return client;
  }

  describe('SG.workerClient: handshake and mode', function () {
    it('creates the worker once, pings it, and reports mode worker after the pong', function () {
      var client = makeClient({ workerUrl: 'x/gen.worker.js' });
      expect(client.mode).toBe('worker');
      return client.ready().then(function (mode) {
        expect(mode).toBe('worker');
        expect(client.mode).toBe('worker');
        expect(client.factory.made).toHaveLength(1);
        expect(client.factory.urls).toEqual(['x/gen.worker.js']);
        expect(client.factory.made[0].posted.map(function (m) { return m.type; })).toEqual(['ping']);
        return client.ready();
      }).then(function () {
        expect(client.factory.made).toHaveLength(1);
        client.dispose();
      });
    });

    it('falls back to the main thread when the worker cannot be constructed (file://, CSP, old browser)',
      function () {
        var client = makeClient({ factory: { throws: true } });
        return client.ready().then(function (mode) {
          expect(mode).toBe('main');
          expect(client.mode).toBe('main');
          client.dispose();
        });
      });

    it('falls back when the worker never answers the handshake, and terminates it', function () {
      var client = makeClient({ factory: { pong: false }, readyTimeoutMs: 20 });
      var started = Date.now();
      return client.ready().then(function (mode) {
        expect(mode).toBe('main');
        expect(Date.now() - started).toBeLessThan(1000);
        expect(client.factory.made[0].terminated).toBe(true);
        expect(client.factory.made[0].onmessage).toBeNull();
      });
    });

    it('falls back when the worker answers that its scripts failed to load, or raises an error', function () {
      var loadFailed = makeClient({ factory: { pongOk: false } });
      var errored = makeClient({ factory: { pong: false } });
      var pending = errored.ready();
      errored.factory.made[0].onerror({ message: 'blocked' });
      return Promise.all([loadFailed.ready(), pending]).then(function (modes) {
        expect(modes).toEqual(['main', 'main']);
        expect(loadFailed.factory.made[0].terminated).toBe(true);
        expect(errored.factory.made[0].terminated).toBe(true);
      });
    });

    it('forceMode main never creates a worker; forceMode worker does not fall back', function () {
      var forcedMain = makeClient({ forceMode: 'main' });
      expect(forcedMain.mode).toBe('main');
      var forcedWorker = makeClient({ forceMode: 'worker', factory: { throws: true } });
      return forcedMain.ready().then(function (mode) {
        expect(mode).toBe('main');
        expect(forcedMain.factory.made).toHaveLength(0);
        return failure(forcedWorker.ready());
      }).then(function (err) {
        expect(err instanceof Error).toBe(true);
        return failure(forcedWorker.generate(cfg()));
      }).then(function (err) {
        expectCode(err, 'unexpected');
      });
    });

    it('guesses before the detection, then settles; without Worker support it is the main thread',
      function () {
        var bare = CLIENT.create({ yieldFn: function () { return Promise.resolve(); } });
        expect(['worker', 'main']).toContain(bare.mode);
        return bare.ready().then(function (mode) {
          expect(['worker', 'main']).toContain(mode);
          expect(bare.mode).toBe(mode);
          if (typeof root.Worker !== 'function') expect(mode).toBe('main');
          bare.dispose();
        });
      });

    it('the shared client has the whole interface', function () {
      ['generate', 'cancel', 'ready', 'dispose', 'create'].forEach(function (name) {
        expect(typeof CLIENT[name]).toBe('function');
      });
      expect(['worker', 'main']).toContain(CLIENT.mode);
      CLIENT.dispose();
    });
  });

  describe('SG.workerClient: protocol, sessions and cancellation (fake worker)', function () {
    function start(client, extra) {
      var events = [];
      var promise = client.generate(cfg(extra), function (e) { events.push(e); });
      var guarded = promise.then(function (r) { return { ok: true, value: r }; },
        function (err) { return { ok: false, value: err }; });
      return { events: events, promise: promise, settled: guarded };
    }

    function sent(client) {
      return client.factory.made[0].ofType('generate');
    }

    /** The first worker answers its first run with a finished classic4 result. */
    function answerDone(client) {
      client.factory.made[0].say({ type: 'done', session: sent(client)[0].session, result: classic4Wire() });
    }

    it('posts generate with the session, the config and the options; forwards events; rehydrates done',
      function () {
        var client = makeClient({ chunkMs: 7, batchMs: 9, maxBatch: 11, budgetMs: 1234 });
        var run = start(client, { seed: 3 });
        return until(function () { return sent(client).length === 1; }).then(function () {
          var message = sent(client)[0];
          expect(message.config).toEqual(cfg({ seed: 3 }));
          expect(message.options).toEqual({ chunkMs: 7, batchMs: 9, maxBatch: 11, budgetMs: 1234 });
          var w = client.factory.made[0];
          w.say({ type: 'events', session: message.session, events: [{ seq: 0 }, { seq: 1 }] });
          w.say({ type: 'events', session: message.session, events: [{ seq: 2 }] });
          expect(run.events.map(function (e) { return e.seq; })).toEqual([0, 1, 2]);
          w.say({ type: 'done', session: message.session, result: classic4Wire() });
          return run.promise;
        }).then(function (result) {
          expect(result.givens).toEqual(classic4Wire().givens);
          expect(Object.isFrozen(result.model)).toBe(true);
          expect(client.cancel()).toBe(false);
          client.dispose();
        });
      });

    it('an error message rejects with a GenerationError carrying code and arguments', function () {
      var client = makeClient();
      var run = start(client);
      return until(function () { return sent(client).length === 1; }).then(function () {
        client.factory.made[0].say({
          type: 'error',
          session: sent(client)[0].session,
          error: {
            code: 'budget.exceeded', i18nArgs: { reason: 'time', limitMs: 5 }, name: 'GenerationError'
          }
        });
        return run.settled;
      }).then(function (outcome) {
        expect(outcome.ok).toBe(false);
        expectCode(outcome.value, 'budget.exceeded');
        expect(outcome.value.i18nArgs).toEqual({ reason: 'time', limitMs: 5 });
        client.dispose();
      });
    });

    it('a result that cannot be rebuilt rejects the run', function () {
      var client = makeClient();
      var run = start(client);
      return until(function () { return sent(client).length === 1; }).then(function () {
        client.factory.made[0].say({ type: 'done', session: sent(client)[0].session, result: { v: 0 } });
        return run.settled;
      }).then(function (outcome) {
        expect(outcome.ok).toBe(false);
        expectCode(outcome.value, 'unexpected');
        client.dispose();
      });
    });

    it('cancel() rejects at once with budget.cancelled, tells the worker, and drops what comes after',
      function () {
        var client = makeClient({ factory: { ack: false } });
        var run = start(client);
        var began;
        return until(function () { return sent(client).length === 1; }).then(function () {
          var w = client.factory.made[0];
          var session = sent(client)[0].session;
          w.say({ type: 'events', session: session, events: [{ seq: 0 }] });
          began = performance.now();
          expect(client.cancel()).toBe(true);
          return run.settled.then(function (outcome) {
            expect(performance.now() - began).toBeLessThan(200);
            expect(outcome.ok).toBe(false);
            expectCode(outcome.value, 'budget.cancelled');
            expect(w.ofType('cancel')).toEqual([{ type: 'cancel', session: session }]);
            // The worker is still running it for a while: whatever it sends is ignored.
            w.say({ type: 'events', session: session, events: [{ seq: 1 }, { seq: 2 }] });
            w.say({ type: 'done', session: session, result: classic4Wire() });
            expect(run.events).toHaveLength(1);
            expect(client.cancel()).toBe(false);
            client.dispose();
          });
        });
      });

    it('an overlapping generate cancels the old run cleanly and starts the new one only when the worker ' +
      'has answered the cancel', function () {
      var client = makeClient({ factory: { ack: false } });
      var first = start(client, { seed: 1 });
      var second;
      var w;
      return until(function () { return sent(client).length === 1; }).then(function () {
        w = client.factory.made[0];
        var oldSession = sent(client)[0].session;
        w.say({ type: 'events', session: oldSession, events: [{ seq: 0, from: 'old' }] });
        second = start(client, { seed: 2 });
        return first.settled.then(function (outcome) {
          expectCode(outcome.value, 'budget.cancelled');
          return tick();
        }).then(function () {
          // The new run waits: the worker has not said that it is free.
          expect(sent(client)).toHaveLength(1);
          expect(w.ofType('cancel')).toHaveLength(1);
          w.say({ type: 'events', session: oldSession, events: [{ seq: 1, from: 'old' }] });
          w.say({ type: 'cancelled', session: oldSession });
          return until(function () { return sent(client).length === 2; });
        }).then(function () {
          var newSession = sent(client)[1].session;
          expect(newSession).not.toBe(oldSession);
          expect(sent(client)[1].config.seed).toBe(2);
          // A late message of the old run: nobody gets it.
          w.say({ type: 'events', session: oldSession, events: [{ seq: 2, from: 'old' }] });
          w.say({ type: 'events', session: newSession, events: [{ seq: 0, from: 'new' }] });
          w.say({ type: 'done', session: oldSession, result: classic4Wire() });
          w.say({ type: 'done', session: newSession, result: classic4Wire() });
          return second.settled;
        }).then(function (outcome) {
          expect(outcome.ok).toBe(true);
          expect(first.events.map(function (e) { return e.from; })).toEqual(['old']);
          expect(second.events.map(function (e) { return e.from; })).toEqual(['new']);
          client.dispose();
        });
      });
    });

    it('a worker that does not answer the cancel in time is terminated and replaced, and the waiting run ' +
      'goes to the new one', function () {
      var client = makeClient({ factory: { ack: false }, killAfterMs: 15 });
      var first = start(client, { seed: 1 });
      var second;
      return until(function () { return sent(client).length === 1; }).then(function () {
        second = start(client, { seed: 2 });
        return first.settled;
      }).then(function () {
        return until(function () { return client.factory.made.length === 2; });
      }).then(function () {
        expect(client.factory.made[0].terminated).toBe(true);
        return until(function () { return client.factory.made[1].ofType('generate').length === 1; });
      }).then(function () {
        var fresh = client.factory.made[1];
        expect(fresh.ofType('ping')).toHaveLength(1);
        expect(fresh.ofType('generate')[0].config.seed).toBe(2);
        fresh.say({ type: 'done', session: fresh.ofType('generate')[0].session, result: classic4Wire() });
        return second.settled;
      }).then(function (outcome) {
        expect(outcome.ok).toBe(true);
        client.dispose();
      });
    });

    it('an answer to the cancel in time keeps the worker (no terminate, no new worker)', function () {
      var client = makeClient({ factory: { ack: true }, killAfterMs: 25 });
      var first = start(client, { seed: 1 });
      return until(function () { return sent(client).length === 1; }).then(function () {
        client.cancel();
        return first.settled;
      }).then(function () {
        return sleep(60);
      }).then(function () {
        expect(client.factory.made).toHaveLength(1);
        expect(client.factory.made[0].terminated).toBe(false);
        client.dispose();
      });
    });

    it('the worker dying mid-run rejects that run, and the next run gets a new worker', function () {
      var client = makeClient();
      var first = start(client, { seed: 1 });
      return until(function () { return sent(client).length === 1; }).then(function () {
        client.factory.made[0].onerror({ message: 'out of memory', preventDefault: function () {} });
        return first.settled;
      }).then(function (outcome) {
        expectCode(outcome.value, 'unexpected');
        expect(outcome.value.i18nArgs.message).toBe('out of memory');
        expect(client.factory.made[0].terminated).toBe(true);
        var second = start(client, { seed: 2 });
        return until(function () { return client.factory.made.length === 2; }).then(function () {
          return until(function () { return client.factory.made[1].ofType('generate').length === 1; });
        }).then(function () {
          expect(client.mode).toBe('worker');
          client.cancel();
          return second.settled;
        });
      }).then(function () {
        client.dispose();
      });
    });

    it('a config that cannot be cloned rejects the run and leaves the worker usable', function () {
      var client = makeClient({ factory: { failPost: function (m) { return m.type === 'generate' &&
        typeof m.config.variantOptions === 'function'; } } });
      var bad = start(client, { variantOptions: function () {} });
      return bad.settled.then(function (outcome) {
        expect(outcome.ok).toBe(false);
        expectCode(outcome.value, 'unexpected');
        var good = start(client, { seed: 2 });
        return until(function () { return sent(client).length === 1; }).then(function () {
          answerDone(client);
          return good.settled;
        });
      }).then(function (outcome) {
        expect(outcome.ok).toBe(true);
        client.dispose();
      });
    });

    it('a consumer that throws does not lose the other events; one that cancels ends the batch', function () {
      var client = makeClient();
      var seen = [];
      var logged = [];
      var realError = console.error;
      console.error = function (err) { logged.push(err); };
      var promise = client.generate(cfg(), function (e) {
        seen.push(e.seq);
        if (e.seq === 1) throw new Error('consumer bug');
        if (e.seq === 3) client.cancel();
      });
      var guarded = failure(promise);
      return until(function () { return sent(client).length === 1; }).then(function () {
        client.factory.made[0].say({ type: 'events', session: sent(client)[0].session,
          events: [{ seq: 0 }, { seq: 1 }, { seq: 2 }, { seq: 3 }, { seq: 4 }, { seq: 5 }] });
        return guarded;
      }).then(function (err) {
        console.error = realError;
        expectCode(err, 'budget.cancelled');
        expect(seen).toEqual([0, 1, 2, 3]);
        expect(logged).toHaveLength(1);
        client.dispose();
      }, function (err) {
        console.error = realError;
        throw err;
      });
    });

    it('dispose() rejects the run, terminates the worker, clears the timers, and the client starts over',
      function () {
        var client = makeClient({ factory: { ack: false }, killAfterMs: 20 });
        var run = start(client, { seed: 1 });
        var w;
        return until(function () { return sent(client).length === 1; }).then(function () {
          w = client.factory.made[0];
          client.dispose();
          return run.settled;
        }).then(function (outcome) {
          expectCode(outcome.value, 'budget.cancelled');
          expect(w.terminated).toBe(true);
          expect(w.onmessage).toBeNull();
          expect(w.onerror).toBeNull();
          // A late message into the void is harmless, and the kill timer does not fire on the new worker.
          w.say({ type: 'events', session: 1, events: [{ seq: 0 }] });
          var again = start(client, { seed: 2 });
          return until(function () { return client.factory.made.length === 2; }).then(function () {
            return sleep(40);
          }).then(function () {
            expect(client.factory.made[1].terminated).toBe(false);
            client.cancel();
            return again.settled;
          });
        }).then(function () {
          client.dispose();
          expect(client.factory.made[1].terminated).toBe(true);
        });
      });

    it('independent clients do not disturb each other', function () {
      var a = makeClient();
      var b = makeClient();
      var runA = start(a, { seed: 1 });
      var runB = start(b, { seed: 2 });
      return Promise.all([
        until(function () { return sent(a).length === 1; }),
        until(function () { return b.factory.made[0] && b.factory.made[0].ofType('generate').length === 1; })
      ]).then(function () {
        expect(a.cancel()).toBe(true);
        expect(b.cancel()).toBe(true);
        return Promise.all([runA.settled, runB.settled]);
      }).then(function (outcomes) {
        outcomes.forEach(function (o) { expectCode(o.value, 'budget.cancelled'); });
        a.dispose();
        b.dispose();
      });
    });

    it('a second generate while the first still waits for the handshake runs only the second', function () {
      var client = makeClient();
      var first = start(client, { seed: 1 });
      var second = start(client, { seed: 2 });
      return first.settled.then(function (outcome) {
        expectCode(outcome.value, 'budget.cancelled');
        return until(function () { return sent(client).length === 1; });
      }).then(function () {
        expect(sent(client)[0].config.seed).toBe(2);
        answerDone(client);
        return second.settled;
      }).then(function (outcome) {
        expect(outcome.ok).toBe(true);
        client.dispose();
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The main thread mode (real engine, fake scheduler)
  // ---------------------------------------------------------------------------------------------

  describe('SG.workerClient: main thread mode (cooperative slices)', function () {
    function mainClient(extra) {
      var yields = { count: 0 };
      var client = CLIENT.create(Object.assign({
        forceMode: 'main',
        chunkMs: 0,
        yieldFn: function () {
          yields.count++;
          return Promise.resolve();
        }
      }, extra));
      client.yields = yields;
      return client;
    }

    it('works in slices: many turns for the page, batches of events, the very puzzle of SG.pipeline.run',
      function () {
        var client = mainClient();
        var events = [];
        var batches = 0;
        var c = cfg({ variantId: 'killer', difficulty: 'medium', seed: 8 });
        return client.generate(c, function (e) { events.push(e); batches++; }).then(function (result) {
          var sync = runSync(c);
          expectSameResult(result, sync.result);
          expect(shape(events)).toEqual(shape(sync.events));
          expect(client.yields.count).toBeGreaterThan(100);
          expect(client.mode).toBe('main');
          client.dispose();
        });
      }, SLOW);

    it('the slice is as long as chunkMs says: a frozen clock means one slice, a slow one one step',
      function () {
      var frozen = mainClient({ chunkMs: 12, now: function () { return 5; } });
      var c = cfg({ variantId: 'classic4', difficulty: 'veryEasy' });
      return frozen.generate(c).then(function () {
        expect(frozen.yields.count).toBe(0);
        var coarse = 0;
        var slow = mainClient({ chunkMs: 12, now: function () { coarse += 100; return coarse; } });
        return slow.generate(c).then(function () {
          var steps = runSliced(c, 1);
          expect(slow.yields.count).toBe(steps.yields);
        });
      });
    });

    it('cancel() at a slice boundary rejects at once, stops the work, and no event follows', function () {
      var gates = [];
      var client = mainClient({
        yieldFn: function () { return new Promise(function (resolve) { gates.push(resolve); }); }
      });
      var events = [];
      var run = failure(client.generate(cfg(), function (e) { events.push(e); }));
      return until(function () { return gates.length === 1; }).then(function () {
        var seen = events.length;
        expect(seen).toBeGreaterThan(0);
        var began = performance.now();
        expect(client.cancel()).toBe(true);
        return run.then(function (err) {
          expect(performance.now() - began).toBeLessThan(200);
          expectCode(err, 'budget.cancelled');
          gates[0]();
          return tick();
        }).then(function () {
          expect(gates).toHaveLength(1);
          expect(events).toHaveLength(seen);
          client.dispose();
        });
      });
    });

    it('overlapping generates: the old one is cancelled, the new one sees only its own events', function () {
      var gates = [];
      var hold = true;
      var client = mainClient({
        yieldFn: function () {
          if (!hold) return Promise.resolve();
          return new Promise(function (resolve) { gates.push(resolve); });
        }
      });
      var firstEvents = [];
      var secondEvents = [];
      var first = failure(client.generate(cfg({ seed: 1 }), function (e) { firstEvents.push(e); }));
      return until(function () { return gates.length === 1; }).then(function () {
        var heard = firstEvents.length;
        hold = false;
        var second = client.generate(cfg({ seed: 2, difficulty: 'easy' }), function (e) {
          secondEvents.push(e);
        });
        return first.then(function (err) {
          expectCode(err, 'budget.cancelled');
          gates[0]();
          return second;
        }).then(function (result) {
          expect(firstEvents).toHaveLength(heard);
          expect(gates).toHaveLength(1);
          expect(result.seed).toBe(2);
          var seeds = secondEvents.filter(function (e) { return e.i18nKey === 'configure.config'; })
            .map(function (e) { return e.i18nArgs.seed; });
          expect(seeds).toEqual([2]);
          expect(secondEvents[secondEvents.length - 1].type).toBe('done');
          client.dispose();
        });
      });
    }, SLOW);

    it('an error of the pipeline rejects with it, after its events were delivered', function () {
      var client = mainClient();
      var events = [];
      var run = failure(client.generate({ variantId: 'nope' }, function (e) { events.push(e); }));
      return run.then(function (err) {
        expectCode(err, 'variant.unknown');
        expect(events.map(function (e) { return e.type; })).toContain('error');
        client.dispose();
      });
    });

    it('the time limit counts active time only: a long wait between slices is not charged', function () {
      var offset = 0;
      var client = mainClient({
        budgetMs: 5000,
        now: function () { return performance.now() + offset; },
        yieldFn: function () {
          offset += 1e6;
          return Promise.resolve();
        }
      });
      return client.generate(cfg({ variantId: 'jigsaw9', seed: 3 })).then(function (result) {
        var total = 0;
        Object.keys(result.timings).forEach(function (id) { total += result.timings[id]; });
        expect(total).toBeLessThan(5000);
        expect(offset).toBeGreaterThan(1e8);
        client.dispose();
      });
    }, SLOW);

    it('the budget still stops a run that is too slow (active time)', function () {
      var clock = 0;
      // Every read of the clock moves it 10 ms: the budget of 50 ms is gone after a few steps.
      var client = CLIENT.create({
        forceMode: 'main',
        budgetMs: 50,
        chunkMs: 0,
        now: function () { clock += 10; return clock; },
        yieldFn: function () { return Promise.resolve(); }
      });
      return failure(client.generate(cfg({ difficulty: 'evil', seed: 5 }))).then(function (err) {
        expectCode(err, 'budget.exceeded');
        client.dispose();
      });
    }, SLOW);

    it('with no stepper-friendly yield function it still uses MessageChannel or timers without leaking',
      function () {
        var client = CLIENT.create({ forceMode: 'main', chunkMs: 1 });
        var events = 0;
        return client.generate(cfg({ variantId: 'classic4', difficulty: 'veryEasy' }), function () { events++; })
          .then(function (result) {
            expect(result.givens.length).toBe(16);
            expect(events).toBeGreaterThan(5);
            client.dispose();
          });
      });
  });

  // ---------------------------------------------------------------------------------------------
  // The real worker script in a vm context behind a fake Worker (Node only)
  // ---------------------------------------------------------------------------------------------

  describe('js/worker/gen.worker.js', function () {
    if (!node) {
      it('needs Node (vm) to run the worker script outside a browser', function () {
        SG.test.skip('browser: the worker is checked in a real Worker');
      });
      return;
    }

    var workerPath = node.path.join(node.root, 'js', 'worker', 'gen.worker.js');
    var workerSource = node.fs.readFileSync(workerPath, 'utf8');
    var sources = {};

    function readSource(abs) {
      if (sources[abs] === undefined) sources[abs] = node.fs.readFileSync(abs, 'utf8');
      return sources[abs];
    }

    function scriptsOf(text) {
      var block = /const SCRIPTS = \[([\s\S]*?)\];/.exec(text)[1];
      return block.split('\n').map(function (line) { return /'([^']+)'/.exec(line); })
        .filter(Boolean).map(function (m) { return m[1]; });
    }

    function sourceFiles() {
      var runner = node.fs.readFileSync(node.path.join(node.root, 'tests', 'node-runner.js'), 'utf8');
      var block = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1];
      return block.split('\n').map(function (line) { return /'([^']+)'/.exec(line); })
        .filter(Boolean).map(function (m) { return m[1]; });
    }

    /**
     * Runs gen.worker.js in its own global scope, with an `importScripts` that reads the files the way a
     * worker would (relative to js/worker/), and a Worker stand-in in front of it. The worker's event loop is
     * a list of tasks that the test runs, so the order of messages and slices is under its control.
     */
    function createLoopback(options) {
      var opts = options || {};
      var tasks = [];
      var ctx = node.vm.createContext({});
      var toWorkerRealm = node.vm.runInContext('(function (text) { return JSON.parse(text); })', ctx);
      var w = {
        onmessage: null,
        onerror: null,
        terminated: false,
        fromWorker: [],
        toWorker: [],
        loaded: [],
        tasks: tasks,
        postMessage: function (message) {
          // Strict like a real postMessage, then rebuilt in the realm of the worker (its own prototypes).
          var copy = toWorkerRealm(JSON.stringify(structuredClone(message)));
          w.toWorker.push(copy);
          tasks.push(function () { ctx.onmessage({ data: copy }); });
        },
        terminate: function () {
          w.terminated = true;
          tasks.length = 0;
        },
        ofType: function (type) {
          return w.fromWorker.filter(function (m) { return m.type === type; });
        },
        /** Runs up to `n` tasks of the worker (all when omitted); returns how many ran. */
        run: function (n) {
          var ran = 0;
          while (tasks.length > 0 && (n === undefined || ran < n)) {
            tasks.shift()();
            ran++;
          }
          return ran;
        }
      };
      ctx.self = ctx;
      ctx.setTimeout = function (fn) { tasks.push(fn); return tasks.length; };
      ctx.structuredClone = structuredClone;
      ctx.performance = performance;
      ctx.console = console;
      ctx.importScripts = function () {
        if (opts.failLoad) throw new Error('NetworkError: ' + opts.failLoad);
        for (var i = 0; i < arguments.length; i++) {
          var abs = node.path.resolve(node.root, 'js', 'worker', arguments[i]);
          w.loaded.push(node.path.relative(node.root, abs).split('\\').join('/'));
          node.vm.runInContext(readSource(abs), ctx, { filename: abs });
        }
      };
      ctx.postMessage = function (message) {
        var copy = structuredClone(message);
        w.fromWorker.push(copy);
        if (w.onmessage && !w.holdReplies) w.onmessage({ data: copy });
      };
      node.vm.runInContext(workerSource, ctx, { filename: workerPath });
      w.context = ctx;
      return w;
    }

    /** A client whose worker is a loopback and whose event loop runs by itself, one task at a time. */
    function loopClient(options) {
      var loop = createLoopback(options);
      var timer = null;
      var running = true;
      function pump() {
        if (!running) return;
        loop.run(1);
        timer = setImmediate(pump);
      }
      var client = CLIENT.create(Object.assign({ workerFactory: function () { return loop; } }, options));
      var originalDispose = client.dispose;
      client.dispose = function () {
        running = false;
        if (timer !== null) clearImmediate(timer);
        originalDispose();
      };
      client.loop = loop;
      if (!options || !options.manual) timer = setImmediate(pump);
      else running = false;
      return client;
    }

    it('imports exactly the core, the variants and the word lists of SOURCE_FILES, in order', function () {
      var listed = scriptsOf(workerSource).map(function (rel) {
        return node.path.relative(node.root, node.path.resolve(node.root, 'js', 'worker', rel))
          .split('\\').join('/');
      });
      var all = sourceFiles();
      var upTo = all.indexOf('js/worker/worker-client.js');
      expect(upTo).toBeGreaterThan(30);
      expect(listed).toEqual(all.slice(0, upTo));
      listed.forEach(function (rel) {
        expect(rel.indexOf('js/ui/')).toBe(-1);
        expect(node.fs.existsSync(node.path.join(node.root, rel))).toBe(true);
      });
      expect(listed[listed.length - 1]).toBe('assets/wordlists/isograms.vi.js');
    });

    it('loads in a bare global scope, loads exactly that list, and answers the handshake', function () {
      var w = createLoopback();
      expect(w.loaded).toEqual(scriptsOf(workerSource).map(function (rel) {
        return node.path.relative(node.root, node.path.resolve(node.root, 'js', 'worker', rel))
          .split('\\').join('/');
      }));
      expect(typeof w.context.SG.pipeline.runSteps).toBe('function');
      expect(w.context.SG.workerClient).toBeUndefined();
      expect(w.context.SG.app).toBeUndefined();
      w.postMessage({ type: 'ping', id: 4 });
      w.run();
      expect(w.fromWorker).toEqual([{ type: 'pong', id: 4, ok: true }]);
    });

    it('a failed import is reported by the handshake and by every generate', function () {
      var w = createLoopback({ failLoad: 'blocked' });
      w.postMessage({ type: 'ping', id: 1 });
      w.postMessage({ type: 'generate', session: 3, config: cfg() });
      w.run();
      expect(w.fromWorker[0].ok).toBe(false);
      expect(w.fromWorker[0].error.code).toBe('unexpected');
      expect(w.fromWorker[1].type).toBe('error');
      expect(w.fromWorker[1].session).toBe(3);
      var fallback = loopClient({ failLoad: 'blocked', readyTimeoutMs: 500 });
      return fallback.ready().then(function (mode) {
        expect(mode).toBe('main');
        expect(fallback.loop.terminated).toBe(true);
        fallback.dispose();
      });
    });

    it('runs a generation in slices and speaks the protocol: batches of events, then done', function () {
      var w = createLoopback();
      var c = cfg({ variantId: 'classic9', difficulty: 'medium', seed: 12 });
      w.postMessage({ type: 'generate', session: 7, config: c,
        options: { chunkMs: 0, batchMs: 1e9, maxBatch: 6 } });
      var slices = w.run();
      expect(slices).toBeGreaterThan(50);
      var types = w.fromWorker.map(function (m) { return m.type; });
      expect(types[types.length - 1]).toBe('done');
      expect(types.slice(0, -1).every(function (t) { return t === 'events'; })).toBe(true);
      var events = [];
      w.ofType('events').forEach(function (m, i, list) {
        expect(m.session).toBe(7);
        expect(m.events.length).toBeGreaterThan(0);
        expect(m.events.length).toBeLessThan(7);
        if (i < list.length - 1) expect(m.events).toHaveLength(6);
        events = events.concat(m.events);
      });
      var sync = runSync(c);
      expect(shape(events)).toEqual(shape(sync.events));
      var done = w.ofType('done')[0];
      expect(done.session).toBe(7);
      expectSameResult(P.fromWire(done.result), sync.result);
    }, SLOW);

    it('flushes by time at the slice boundaries when batchMs is small', function () {
      var w = createLoopback();
      var c = cfg({ seed: 3 });
      w.postMessage({ type: 'generate', session: 1, config: c,
        options: { chunkMs: 0, batchMs: 0, maxBatch: 100000 } });
      w.run();
      var batches = w.ofType('events');
      expect(batches.length).toBeGreaterThan(20);
      var events = [];
      batches.forEach(function (m) { events = events.concat(m.events); });
      expect(shape(events)).toEqual(shape(runSync(c).events));
    }, SLOW);

    it('a cancel between slices stops the run at the next boundary, and is answered', function () {
      var w = createLoopback();
      w.postMessage({ type: 'generate', session: 2, config: cfg({ variantId: 'samurai', difficulty: 'medium',
        seed: 3 }), options: { chunkMs: 0 } });
      w.run(8);
      expect(w.fromWorker.filter(function (m) { return m.type === 'done'; })).toHaveLength(0);
      w.postMessage({ type: 'cancel', session: 2 });
      var before = w.tasks.length;
      expect(before).toBeGreaterThan(1);
      // One more slice may run before the message is read; after the message nothing runs.
      var ran = w.run();
      expect(ran).toBeLessThan(4);
      expect(w.ofType('cancelled')).toEqual([{ type: 'cancelled', session: 2 }]);
      expect(w.ofType('done')).toHaveLength(0);
      expect(w.ofType('error')).toHaveLength(0);
      // The worker is free: the next generate runs to its end.
      w.postMessage({ type: 'generate', session: 3,
        config: cfg({ variantId: 'classic4', difficulty: 'veryEasy' }) });
      w.run();
      expect(w.ofType('done').map(function (m) { return m.session; })).toEqual([3]);
    }, SLOW);

    it('a new generate replaces a run in progress; a cancel for another session changes nothing',
      function () {
      var w = createLoopback();
      w.postMessage({ type: 'generate', session: 1, config: cfg({ seed: 1 }), options: { chunkMs: 0 } });
      w.run(5);
      w.postMessage({ type: 'cancel', session: 99 });
      w.run(3);
      w.postMessage({ type: 'generate', session: 2, config: cfg({ seed: 2 }), options: { chunkMs: 0 } });
      w.run();
      expect(w.ofType('done').map(function (m) { return m.session; })).toEqual([2]);
      var sessions = w.ofType('events').map(function (m) { return m.session; });
      expect(sessions.every(function (s) { return s === 1 || s === 2; })).toBe(true);
      expect(w.ofType('cancelled').map(function (m) { return m.session; })).toEqual([99]);
    }, SLOW);

    it('reports an error of the pipeline as plain data after its events', function () {
      var w = createLoopback();
      w.postMessage({ type: 'generate', session: 5, config: { variantId: 'nope' } });
      w.run();
      var types = w.fromWorker.map(function (m) { return m.type; });
      expect(types).toEqual(['events', 'error']);
      var error = w.ofType('error')[0].error;
      expect(error.code).toBe('variant.unknown');
      expect(error.i18nArgs).toBeTruthy();
      expect(w.ofType('events')[0].events[w.ofType('events')[0].events.length - 1].type).toBe('error');
      var err = SG.i18n && SG.i18n.tError ? SG.i18n.tError(error) : '';
      expect(typeof err).toBe('string');
    });

    it('stops a run that exceeds its time limit (active time) with budget.exceeded', function () {
      var w = createLoopback();
      w.postMessage({ type: 'generate', session: 6, config: cfg({ difficulty: 'evil', seed: 5 }),
        options: { budgetMs: 0.000001, chunkMs: 0 } });
      w.run();
      var error = w.ofType('error')[0];
      expect(error).toBeTruthy();
      expect(['budget.exceeded']).toContain(error.error.code);
    }, SLOW);

    it('ignores messages it does not know', function () {
      var w = createLoopback();
      w.postMessage(null);
      w.postMessage({ type: 'what' });
      w.postMessage('text');
      w.run();
      expect(w.fromWorker).toEqual([]);
    });

    var SAME_CASES = [
      { variantId: 'classic9', difficulty: 'medium', seed: 5, trace: 'summary' },
      { variantId: 'classic6', difficulty: 'veryEasy', seed: 2, trace: 'full' },
      { variantId: 'killer', difficulty: 'easy', seed: 3, trace: 'summary' },
      { variantId: 'greaterThan', difficulty: 'easy', seed: 4, trace: 'summary' },
      { variantId: 'jigsaw9', difficulty: 'easy', seed: 2, trace: 'summary' },
      { variantId: 'wordoku', difficulty: 'easy', seed: 6, trace: 'summary',
        variantOptions: { language: 'vi' } },
      { variantId: 'samurai', difficulty: 'veryEasy', seed: 1, trace: 'summary' },
      { variantId: 'flower', difficulty: 'veryEasy', seed: 1, trace: 'full' },
      { variantId: 'mega16', difficulty: 'veryEasy', seed: 1, trace: 'summary' }
    ];

    SAME_CASES.forEach(function (c) {
      it(caseName(c) + ': worker mode and main thread mode give identical results and traces', function () {
        var worker = loopClient();
        var main = CLIENT.create({
          forceMode: 'main', chunkMs: 0, yieldFn: function () { return Promise.resolve(); }
        });
        var workerEvents = [];
        var mainEvents = [];
        var sync = runSync(c);
        return worker.generate(c, function (e) { workerEvents.push(e); }).then(function (viaWorker) {
          expect(worker.mode).toBe('worker');
          return main.generate(c, function (e) { mainEvents.push(e); }).then(function (viaMain) {
            expect(main.mode).toBe('main');
            expectSameResult(viaWorker, viaMain);
            expectSameResult(viaWorker, sync.result);
            expect(shape(workerEvents)).toEqual(shape(mainEvents));
            expect(shape(workerEvents)).toEqual(shape(sync.events));
            expect(workerEvents.length).toBeGreaterThan(5);
            expect(SG.model.validate(viaWorker.model).ok).toBe(true);
            expect(SG.dfs.countSolutions(viaWorker.model, viaWorker.givens, 2)).toBe(1);
            worker.dispose();
            main.dispose();
          });
        });
      }, SLOW);
    });

    it('cancel through the client in worker mode: rejected at once, the worker stops within a slice',
      function () {
        var client = loopClient({ manual: true, killAfterMs: 5000, chunkMs: 0, batchMs: 0 });
        var loop = client.loop;
        var events = [];
        var run = failure(client.generate(cfg({ variantId: 'samurai', difficulty: 'medium', seed: 4 }),
          function (e) { events.push(e); }));
        // The page's turn: run the worker's tasks one at a time until the generate message was sent.
        return until(function () {
          loop.run(1);
          return loop.toWorker.some(function (m) { return m.type === 'generate'; });
        }).then(function () {
          loop.run(40);
          expect(events.length).toBeGreaterThan(0);
          expect(loop.ofType('done')).toHaveLength(0);
          var began = performance.now();
          expect(client.cancel()).toBe(true);
          return run.then(function (err) {
            expect(performance.now() - began).toBeLessThan(200);
            expectCode(err, 'budget.cancelled');
            var seen = events.length;
            // The worker reads the cancel before its next slice and stops.
            expect(loop.run()).toBeLessThan(4);
            expect(loop.ofType('done')).toHaveLength(0);
            expect(loop.ofType('cancelled')).toHaveLength(1);
            expect(loop.terminated).toBe(false);
            expect(events).toHaveLength(seen);
            client.dispose();
          });
        });
      }, SLOW);

    it('overlapping generates through the client in worker mode: only the second finishes, no events mix',
      function () {
        var client = loopClient({ chunkMs: 0, batchMs: 0 });
        var first = [];
        var second = [];
        var firstRun = failure(client.generate(cfg({ variantId: 'samurai', difficulty: 'medium', seed: 1 }),
          function (e) { first.push(e); }));
        return until(function () { return first.length > 0; }).then(function () {
          var secondRun = client.generate(cfg({ variantId: 'jigsaw9', difficulty: 'easy', seed: 2 }),
            function (e) { second.push(e); });
          return firstRun.then(function (err) {
            expectCode(err, 'budget.cancelled');
            return secondRun;
          });
        }).then(function (result) {
          expect(result.config.variantId).toBe('jigsaw9');
          var heard = first.length;
          return tick().then(function () {
            expect(first).toHaveLength(heard);
            second.forEach(function (e) {
              if (e.i18nKey === 'configure.config') expect(e.i18nArgs.variantId).toBe('jigsaw9');
              if (e.i18nKey === 'buildModel.model') expect(e.i18nArgs.variantId).toBe('jigsaw9');
            });
            expect(second[second.length - 1].type).toBe('done');
            expect(client.loop.terminated).toBe(false);
            client.dispose();
          });
        });
      }, SLOW);
  });
})();
