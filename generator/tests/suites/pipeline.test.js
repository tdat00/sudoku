// The instrumented generators and the pipeline: the seven steps and their events,
// replaying the patches, the cost of the instrumentation, determinism, hooks, retries and cancellation.
// The event system itself is tested in events.test.js.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var E = SG.events;
  var P = SG.pipeline;
  var D = SG.difficulty;
  var model9 = SG.variants.get('classic9').build({}, null);
  var model6 = SG.variants.get('classic6').build({}, null);
  var model4 = SG.variants.get('classic4').build({}, null);

  var STEPS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];

  function now() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
    return thrown;
  }

  function config(extra) {
    return Object.assign({ variantId: 'classic9', difficulty: 'normal', seed: 1, trace: 'summary' }, extra);
  }

  /** Runs the pipeline and collects its events. */
  function run(extra, trace, budget) {
    var events = [];
    var cfg = config(extra);
    if (trace !== undefined) cfg.trace = trace;
    var result = P.run(cfg, function (e) { events.push(e); }, budget);
    return { result: result, events: events };
  }

  function replay(events, cellCount) {
    var view = E.createView(cellCount);
    events.forEach(function (e) { if (e.patch) E.applyPatch(view, e.patch); });
    return view;
  }

  function stepStarts(events) {
    return events.filter(function (e) { return e.type === 'step' && e.phase === 'start'; })
      .map(function (e) { return e.stepId; });
  }

  function keysOf(events) {
    return events.map(function (e) { return e.i18nKey; });
  }

  /** The start and end key of every step, in order: configure.start, configure.end, buildModel.start ... */
  function startEndKeys() {
    return STEPS.reduce(function (list, id) { return list.concat([id + '.start', id + '.end']); }, []);
  }

  function count(events, key) {
    return events.filter(function (e) { return e.i18nKey === key; }).length;
  }

  function clueCount(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] !== 0) n++;
    return n;
  }

  /**
   * Checks every event against the contract: valid shape, plain data, listed in the vocabulary with only
   * declared arguments and patch fields, patches of at most 8 cells, seq = index, t never decreasing.
   */
  function checkEvents(events) {
    events.forEach(function (e, i) {
      var problems = E.eventProblems(e);
      if (problems.length > 0) throw new Error('event ' + i + ' (' + e.i18nKey + '): ' + problems.join('; '));
      if (e.seq !== i) throw new Error('seq ' + e.seq + ' at index ' + i);
      if (i > 0 && e.t < events[i - 1].t) throw new Error('t decreases at ' + i);
      var v = E.lookup(e);
      if (v === null) {
        throw new Error('not in the vocabulary: ' + [e.type, e.stepId, e.phase, e.i18nKey].join(' '));
      }
      if (e.i18nArgs && v.key !== 'error.*') {
        Object.keys(e.i18nArgs).forEach(function (a) {
          if (v.args.indexOf(a) === -1 && a !== 'part' && a !== 'parts') {
            throw new Error(e.i18nKey + ' has the undeclared argument "' + a + '"');
          }
        });
      }
      if (e.patch) {
        Object.keys(e.patch).forEach(function (f) {
          if (v.patch.indexOf(f) === -1) {
            throw new Error(e.i18nKey + ' has the undeclared patch field "' + f + '"');
          }
        });
      }
    });
  }

  /** Every step event lies inside the start / end pair of its own step; steps never overlap. */
  function checkNesting(events) {
    var open = null;
    events.forEach(function (e, i) {
      if (e.type === 'step' && e.phase === 'start') {
        if (open !== null) throw new Error('step ' + e.stepId + ' starts inside ' + open + ' at ' + i);
        open = e.stepId;
      } else if (e.type === 'step' && e.phase === 'end') {
        if (open !== e.stepId) {
          throw new Error('step ' + e.stepId + ' ends while ' + open + ' is open at ' + i);
        }
        open = null;
      } else if (e.type === 'micro' || e.type === 'metric' || (e.type === 'step' && e.phase === 'progress')) {
        if (open !== e.stepId) throw new Error(e.i18nKey + ' (' + e.stepId + ') outside its step at ' + i);
      }
    });
    if (open !== null) throw new Error('step ' + open + ' never ends');
  }

  /** Runs fn with weight overrides of SG.difficulty.WEIGHTS and always restores the table. */
  function withWeights(overrides, fn) {
    var saved = {};
    Object.keys(overrides).forEach(function (id) {
      saved[id] = Object.prototype.hasOwnProperty.call(D.WEIGHTS, id) ? D.WEIGHTS[id] : undefined;
      D.WEIGHTS[id] = overrides[id];
    });
    try {
      return fn();
    } finally {
      Object.keys(saved).forEach(function (id) {
        if (saved[id] === undefined) delete D.WEIGHTS[id];
        else D.WEIGHTS[id] = saved[id];
      });
    }
  }

  /**
   * Runs fn with a registered 4x4 test variant that offers every level: a 4x4 board never needs more than
   * singles, so every level from easy up is out of reach and the retry loop runs to its end. `extra` adds
   * hooks. The board has 16 cells.
   */
  var UNREACHABLE = 'reachProbe';
  function withUnreachable(fn, extra, id) {
    var vid = id || UNREACHABLE;
    var def = Object.assign({
      id: vid,
      i18nKey: 'variant.' + vid,
      group: 'classic',
      digits: 4,
      difficultySupport: SG.difficulty.LEVELS.slice(),
      defaultSymbolMode: 'digits',
      symbolModes: ['digits'],
      options: [],
      build: function () { return SG.fixtures.models.boxGrid(vid, 2, 2); }
    }, extra);
    return withVariant(def, fn);
  }

  /** A model like `model` with another variant id (models are immutable, so a new one is built). */
  function reModel(model, id) {
    return SG.model.create({
      variantId: id, digits: model.digits, units: model.units, unitMeta: model.unitMeta, layout: model.layout
    });
  }

  /** A variant that behaves like classic9, plus whatever `extra` adds (hooks). */
  function hookVariant(id, extra) {
    var base = SG.variants.get('classic9');
    return Object.assign({
      id: id,
      i18nKey: 'variant.' + id,
      group: 'classic',
      digits: 9,
      difficultySupport: base.difficultySupport.slice(),
      defaultSymbolMode: 'digits',
      symbolModes: base.symbolModes.slice(),
      options: [],
      fastSeed: base.fastSeed,
      build: function () { return reModel(model9, id); }
    }, extra);
  }

  function withVariant(def, fn) {
    SG.variants.register(def);
    try {
      return fn();
    } finally {
      SG.variants.unregister(def.id);
    }
  }

  /** The direct call that the pipeline must agree with. */
  function direct(model, level, seed, options) {
    return SG.digger.generate(model, level, SG.rng.create(seed), options || {});
  }

  /** Seed of the first run of `level` on `variantId` that needs exactly one grid and one dig sample. */
  function singleSampleSeed(variantId, level) {
    for (var s = 1; s <= 80; s++) {
      var out = run({ variantId: variantId, difficulty: level, seed: s }, 'summary');
      if (stepStarts(out.events).length === 7) return s;
    }
    throw new Error('no single-sample seed found');
  }

  describe('pipeline: the seven steps and their events', function () {
    var seed9 = singleSampleSeed('classic9', 'veryEasy');
    var seed4 = singleSampleSeed('classic4', 'veryEasy');

    it('lists the seven steps in the order of design.md 7.1, the same as the event system', function () {
      expect(P.STEPS).toEqual(STEPS);
      expect(E.STEP_IDS).toEqual(STEPS);
      expect(SG.explain.STEP_IDS).toEqual(STEPS);
    });

    it('emits the seven steps in order, each with one start and one end', function () {
      [['classic9', 'veryEasy', seed9], ['classic4', 'veryEasy', seed4]].forEach(function (c) {
        ['summary', 'full'].forEach(function (trace) {
          var out = run({ variantId: c[0], difficulty: c[1], seed: c[2] }, trace);
          expect(stepStarts(out.events)).toEqual(STEPS);
          var ends = out.events.filter(function (e) { return e.type === 'step' && e.phase === 'end'; });
          expect(ends.map(function (e) { return e.stepId; })).toEqual(STEPS);
          checkNesting(out.events);
          // Start and end sit next to their step's own events: start before end, steps back to back.
          var order = out.events.filter(function (e) {
            return e.type === 'step' && e.phase !== 'progress';
          }).map(function (e) { return e.i18nKey; });
          expect(order).toEqual(startEndKeys());
        });
      });
    });

    it("at verbosity 'off' only the 14 step start / end events and the done event are emitted", function () {
      var out = run({ seed: seed9, difficulty: 'veryEasy' }, 'off');
      expect(keysOf(out.events)).toEqual(startEndKeys().concat(['done']));
      expect(out.events[out.events.length - 1].type).toBe('done');
    });

    it('the first event is configure.start (seq 0) and done is the last one', function () {
      var out = run({ seed: seed9, difficulty: 'veryEasy' }, 'full');
      expect(out.events[0].i18nKey).toBe('configure.start');
      expect(out.events[0].seq).toBe(0);
      expect(out.events[out.events.length - 1].type).toBe('done');
      expect(out.events.filter(function (e) { return e.type === 'done'; })).toHaveLength(1);
    });

    it('every event is valid, in the vocabulary, with seq = index and t never decreasing', function () {
      ['off', 'summary', 'full'].forEach(function (trace) {
        var out = run({ seed: seed9, difficulty: 'veryEasy' }, trace);
        checkEvents(out.events);
      });
    });

    it('every event survives structuredClone and JSON unchanged (a worker can send it)', function () {
      var out = run({ seed: seed9, difficulty: 'veryEasy' }, 'full');
      out.events.forEach(function (e) {
        expect(JSON.parse(JSON.stringify(e))).toEqual(e);
        if (typeof structuredClone === 'function') expect(structuredClone(e)).toEqual(e);
      });
    });

    it('summary adds step progress and metric-level events; full adds the micro events', function () {
      var off = run({ seed: seed9, difficulty: 'veryEasy' }, 'off').events;
      var summary = run({ seed: seed9, difficulty: 'veryEasy' }, 'summary').events;
      var full = run({ seed: seed9, difficulty: 'veryEasy' }, 'full').events;
      expect(summary.length).toBeGreaterThan(off.length);
      expect(full.length).toBeGreaterThan(summary.length);
      expect(summary.some(function (e) { return e.type === 'micro'; })).toBe(false);
      expect(full.some(function (e) { return e.type === 'micro'; })).toBe(true);
      expect(off.some(function (e) { return e.phase === 'progress'; })).toBe(false);
      ['configure.config', 'buildModel.model', 'buildModel.spec', 'extraStructure.none', 'dig.verify',
        'rate.technique', 'rate.result', 'tune.hit'].forEach(function (k) {
        expect(count(summary, k)).toBeGreaterThan(0);
      });
    });

    it('describes each step with the arguments the UI needs', function () {
      var out = run({ seed: seed9, difficulty: 'veryEasy', symmetry: 'mirrorH', digOrder: 'snake' },
        'summary');
      var byKey = {};
      out.events.forEach(function (e) { if (e.i18nKey) byKey[e.i18nKey] = e; });
      expect(byKey['configure.config'].i18nArgs).toEqual({
        variantId: 'classic9', difficulty: 'veryEasy', seed: seed9, symbolMode: 'digits',
        symmetry: 'mirrorH', digOrder: 'snake', maxAttempts: 8, trace: 'summary'
      });
      expect(byKey['buildModel.model'].i18nArgs).toEqual({
        variantId: 'classic9', cellCount: 81, digits: 9, rows: 9, cols: 9, units: 27, cages: 0,
        inequalities: 0
      });
      var spec = D.spec('veryEasy', model9);
      expect(byKey['buildModel.spec'].i18nArgs.scoreMin).toBe(spec.min);
      expect(byKey['buildModel.spec'].i18nArgs.minClues).toBe(spec.minClues);
      expect(byKey['fullGrid.start'].i18nArgs).toEqual({ attempt: 1, maxAttempts: 8 });
      expect(byKey['dig.start'].i18nArgs).toEqual({
        attempt: 1, maxAttempts: 8, sample: 1, maxSamples: 12, level: 'veryEasy', symmetry: 'mirrorH',
        order: 'snake', strategy: 'cells', minClues: spec.minClues
      });
      expect(byKey['rate.result'].i18nArgs.requested).toBe('veryEasy');
      expect(byKey['rate.result'].metrics.score).toBe(out.result.rating.score);
      expect(byKey['tune.hit'].i18nArgs.achieved).toBe('veryEasy');
      expect(byKey['tune.hit'].i18nArgs.scoreMax).toBe(spec.max);
      expect(byKey['dig.verify'].i18nArgs).toEqual({ unique: true });
      expect(byKey['extraStructure.end'].i18nArgs).toEqual({ skipped: true });
      var last = out.events[out.events.length - 1];
      expect(last.i18nArgs.exact).toBe(true);
      expect(last.i18nArgs.seed).toBe(seed9);
      expect(last.metrics.clues).toBe(clueCount(out.result.givens));
    });

    it('rate.technique lists the techniques of the rating with their counts, then rate.result', function () {
      var out = run({ seed: 3, difficulty: 'hard' }, 'summary');
      var from = 0;
      out.events.forEach(function (e, i) { if (e.i18nKey === 'rate.start') from = i; });
      var ofLastRating = out.events.slice(from);
      var seen = {};
      ofLastRating.filter(function (e) { return e.i18nKey === 'rate.technique'; }).forEach(function (e) {
        seen[e.i18nArgs.technique] = e.i18nArgs.count;
        expect(e.i18nArgs.group).toBe(SG.techniques.get(e.i18nArgs.technique).group);
      });
      expect(seen).toEqual(out.result.rating.techniqueCounts);
      var order = ofLastRating.filter(function (e) { return e.i18nKey === 'rate.technique'; })
        .map(function (e) { return e.i18nArgs.technique; });
      var ladder = SG.techniques.list().map(function (t) { return t.id; });
      expect(order).toEqual(ladder.filter(function (id) { return order.indexOf(id) !== -1; }));
      var result = ofLastRating.filter(function (e) { return e.i18nKey === 'rate.result'; })[0];
      expect(result.i18nArgs.level).toBe(out.result.rating.level);
      expect(result.i18nArgs.hardestTechnique).toBe(out.result.rating.hardestTechnique);
    });

    it('step end events carry the metrics of the step (clues, tries, placements)', function () {
      var out = run({ seed: seed9, difficulty: 'veryEasy' }, 'summary');
      var end = {};
      out.events.forEach(function (e) { if (e.type === 'step' && e.phase === 'end') end[e.stepId] = e; });
      expect(end.fullGrid.metrics.placed).toBe(81);
      expect(end.fullGrid.metrics.backtracks).toBeGreaterThanOrEqual(0);
      expect(end.dig.metrics.clues).toBe(clueCount(out.result.givens));
      expect(end.dig.metrics.accepted + end.dig.metrics.rejected).toBe(end.dig.metrics.attempts);
      expect(end.rate.metrics.score).toBe(out.result.rating.score);
      expect(end.buildModel.metrics).toEqual({ cells: 81, units: 27 });
    });

    it('is valid for every level, symmetry and dig order (full trace, all contracts)', function () {
      var cases = [
        { difficulty: 'veryEasy', seed: 11 }, { difficulty: 'easy', seed: 12 },
        { difficulty: 'normal', seed: 13 }, { difficulty: 'hard', seed: 14 },
        { difficulty: 'master', seed: 15 }, { difficulty: 'nightmare', seed: 16 },
        { difficulty: 'easy', seed: 17, symmetry: 'mirrorBoth' },
        { difficulty: 'easy', seed: 18, symmetry: 'rotational90' },
        { difficulty: 'easy', seed: 19, symmetry: 'none', digOrder: 'spiral' },
        { difficulty: 'normal', seed: 20, symmetry: 'diagonal', digOrder: 'jumpOne' },
        { difficulty: 'easy', seed: 21, digOrder: 'rowByRow' },
        { variantId: 'classic4', difficulty: 'veryEasy', seed: 22 },
        { variantId: 'classic6', difficulty: 'veryEasy', seed: 23 }
      ];
      cases.forEach(function (c) {
        var out = run(c, 'full');
        checkEvents(out.events);
        checkNesting(out.events);
        out.events.forEach(function (e) {
          if (e.patch) expect(E.patchProblems(e.patch)).toEqual([]);
        });
        var n = out.result.model.cellCount;
        expect(Array.from(replay(out.events, n).value)).toEqual(Array.from(out.result.givens));
      });
    }, 60000);
  });

  describe('instrumented generators: applying every patch in order rebuilds the board exactly', function () {
    function gridWithEvents(model, seed, options) {
      var events = [];
      var emitter = E.createEmitter('full', function (e) { events.push(e); });
      var options2 = Object.assign({ emit: emitter }, options);
      var grid = SG.fullGrid.generate(model, SG.rng.create(seed), null, options2);
      return { grid: grid, events: events };
    }

    it('full grid: the patches rebuild the finished grid on classic4, 6 and 9 (300 grids)', function () {
      [[model4, 60], [model6, 60], [model9, 180]].forEach(function (c) {
        for (var s = 1; s <= c[1]; s++) {
          var out = gridWithEvents(c[0], s);
          expect(Array.from(replay(out.events, c[0].cellCount).value)).toEqual(Array.from(out.grid));
          checkEvents(out.events);
        }
      });
    });

    it('full grid: the same holds for plain searches without the pre-fill, and with restarts', function () {
      var restarts = 0;
      var backtracks = 0;
      for (var s = 1; s <= 60; s++) {
        var stats = {};
        var out = gridWithEvents(model9, s, { fastSeed: false, restartThreshold: 0, stats: stats });
        expect(Array.from(replay(out.events, 81).value)).toEqual(Array.from(out.grid));
        checkEvents(out.events);
        restarts += count(out.events, 'fullGrid.restart');
        backtracks += count(out.events, 'fullGrid.backtrack') + count(out.events, 'fullGrid.conflict');
        // A restart that clears many cells is sent as several events; part 0 (or no part) opens each one.
        var openings = out.events.filter(function (e) {
          return e.i18nKey === 'fullGrid.restart' && !e.i18nArgs.part;
        });
        expect(openings).toHaveLength(stats.restarts);
        openings.forEach(function (e, i) { expect(e.i18nArgs.restart).toBe(i + 1); });
      }
      expect(restarts).toBeGreaterThan(0);
      expect(backtracks).toBeGreaterThan(0);
    });

    it('full grid: no patch changes more than 8 cells (so no event is a snapshot)', function () {
      var out = gridWithEvents(model9, 5, { fastSeed: false, restartThreshold: 3 });
      var seen = 0;
      out.events.forEach(function (e) {
        if (!e.patch) return;
        seen++;
        expect(E.patchProblems(e.patch)).toEqual([]);
        expect((e.patch.cells || []).length).toBeLessThan(9);
      });
      expect(seen).toBeGreaterThan(10);
    });

    it('full grid: backtracking is visible, with the digit that was tried', function () {
      var found = false;
      for (var s = 1; s <= 60 && !found; s++) {
        var out = gridWithEvents(model9, s, { fastSeed: false, restartThreshold: 1000 });
        out.events.forEach(function (e) {
          if (e.i18nKey === 'fullGrid.conflict') {
            found = true;
            expect(e.patch.cells).toHaveLength(1);
            expect(e.patch.cells[0].state).toBe('backtracked');
            expect(e.patch.cells[0].value).toBe(0);
            expect(e.patch.cells[0].i).toBe(e.i18nArgs.cell);
            expect(e.i18nArgs.value).toBeGreaterThan(0);
          }
          if (e.i18nKey === 'fullGrid.backtrack') {
            expect(e.patch.cells.every(function (c) {
              return c.value === 0 && c.state === 'backtracked';
            })).toBe(true);
            expect(e.patch.cells[0].i).toBe(e.i18nArgs.cell);
          }
        });
      }
      expect(found).toBe(true);
    });

    it('full grid: the fixed cells and the variant pre-fill are shown before the search', function () {
      var fixed = new Int32Array(81);
      fixed[0] = 5;
      fixed[40] = 9;
      var out = gridWithEvents(model9, 7, { fixedCells: fixed });
      expect(count(out.events, 'fullGrid.fixed')).toBeGreaterThan(0);
      expect(count(out.events, 'fullGrid.seed')).toBe(0);
      expect(out.grid[0]).toBe(5);
      expect(Array.from(replay(out.events, 81).value)).toEqual(Array.from(out.grid));
      var seeded = gridWithEvents(model9, 7);
      expect(count(seeded.events, 'fullGrid.seed')).toBeGreaterThan(0);
      var cells = seeded.events.filter(function (e) { return e.i18nKey === 'fullGrid.seed'; })
        .reduce(function (n, e) { return n + e.patch.cells.length; }, 0);
      expect(cells).toBe(27);
    });

    it('full grid: the events do not change the grid (the traced search draws the same numbers)',
      function () {
        var options = { fastSeed: false, restartThreshold: 2 };
        for (var s = 1; s <= 80; s++) {
          var plain = SG.fullGrid.generate(model9, SG.rng.create(s), null);
          expect(Array.from(gridWithEvents(model9, s).grid)).toEqual(Array.from(plain));
          var hard = SG.fullGrid.generate(model9, SG.rng.create(s), null, options);
          expect(Array.from(gridWithEvents(model9, s, options).grid)).toEqual(Array.from(hard));
        }
      });

    it('full grid: only verbosity full builds events; other emitters and a null one run the plain search',
      function () {
        ['off', 'summary'].forEach(function (v) {
          var seen = [];
          var emitter = E.createEmitter(v, function (e) { seen.push(e); });
          var grid = SG.fullGrid.generate(model9, SG.rng.create(3), null, { emit: emitter });
          expect(seen.filter(function (e) { return e.type === 'micro'; })).toHaveLength(0);
          expect(Array.from(grid)).toEqual(Array.from(SG.fullGrid.generate(model9, SG.rng.create(3), null)));
          expect(seen.map(function (e) { return e.i18nKey; })).toEqual(['fullGrid.start', 'fullGrid.end']);
        });
        expect(function () {
          SG.fullGrid.generate(model9, SG.rng.create(3), null, { emit: null });
        }).not.toThrow();
      });

    it('full grid: stepEvents false leaves the step start and end to the caller', function () {
      var events = [];
      SG.fullGrid.generate(model9, SG.rng.create(2), null,
        { emit: E.createEmitter('full', function (e) { events.push(e); }), stepEvents: false });
      expect(events.some(function (e) { return e.type === 'step'; })).toBe(false);
    });

    it('digger: the dig patches rebuild the puzzle from the full grid shown at the start', function () {
      var levels = ['veryEasy', 'normal', 'nightmare'];
      levels.forEach(function (level, i) {
        var rng = SG.rng.create(40 + i);
        var solution = SG.fullGrid.generate(model9, rng.fork('g'), null);
        var events = [];
        var emitter = E.createEmitter('full', function (e) { events.push(e); });
        var puzzle = SG.digger.digLevel(model9, solution, level, rng.fork('d'), { emit: emitter });
        checkEvents(events);
        expect(Array.from(replay(events, 81).value)).toEqual(Array.from(puzzle.givens));
        expect(count(events, 'dig.restore')).toBeGreaterThan(0);
        expect(replay(events, 81).highlight.reduce(function (a, b) { return a + b; }, 0)).toBe(0);
      });
    });

    it('digger: dig() alone shows its starting board first and ends on the dug puzzle', function () {
      var rng = SG.rng.create(8);
      var solution = SG.fullGrid.generate(model9, rng.fork('g'), null);
      var events = [];
      var puzzle = SG.digger.dig(model9, solution, rng.fork('d'), {
        symmetry: 'mirrorBoth', emit: E.createEmitter('full', function (e) { events.push(e); })
      });
      expect(events[0].i18nKey).toBe('dig.start');
      expect(events[1].i18nKey).toBe('dig.restore');
      expect(Array.from(replay(events, 81).value)).toEqual(Array.from(puzzle.givens));
      checkEvents(events);
    });

    it('digger: a continued dig (startGivens) shows the puzzle it starts from', function () {
      var rng = SG.rng.create(9);
      var solution = SG.fullGrid.generate(model9, rng.fork('g'), null);
      var first = SG.digger.dig(model9, solution, rng.fork('a'), { minClues: 45 });
      var events = [];
      var second = SG.digger.dig(model9, solution, rng.fork('b'), {
        startGivens: first.givens, emit: E.createEmitter('full', function (e) { events.push(e); })
      });
      expect(Array.from(replay(events, 81).value)).toEqual(Array.from(second.givens));
    });

    it('digger: guided candidates are try, then reject or keep; the winner is accept', function () {
      var rng = SG.rng.create(12);
      var solution = SG.fullGrid.generate(model9, rng.fork('g'), null);
      var events = [];
      SG.digger.digLevel(model9, solution, 'hard', rng.fork('d'), {
        emit: E.createEmitter('full', function (e) { events.push(e); })
      });
      var guided = false;
      for (var i = 0; i < events.length; i++) {
        if (events[i].i18nKey === 'dig.try' && events[i].i18nArgs.pass === 'guided') {
          guided = true;
          expect(['dig.reject', 'dig.keep']).toContain(events[i + 1].i18nKey);
          expect(events[i + 1].i18nArgs.cells).toEqual(events[i].i18nArgs.cells);
        }
      }
      expect(guided).toBe(true);
      var passes = events.filter(function (e) { return e.i18nKey === 'dig.pass.start'; })
        .map(function (e) { return e.i18nArgs.pass; });
      expect(passes).toEqual(['random', 'guided']);
      expect(count(events, 'dig.pass.end')).toBe(2);
      var reasons = {};
      events.forEach(function (e) { if (e.i18nKey === 'dig.reject') reasons[e.i18nArgs.reason] = true; });
      Object.keys(reasons).forEach(function (r) {
        expect(['techniques', 'tooHard', 'ambiguous']).toContain(r);
      });
    });

    it('digger: the cells of a dig step are reported with symmetry groups of up to four cells', function () {
      var rng = SG.rng.create(13);
      var solution = SG.fullGrid.generate(model9, rng.fork('g'), null);
      var events = [];
      SG.digger.dig(model9, solution, rng.fork('d'), {
        symmetry: 'rotational90', emit: E.createEmitter('full', function (e) { events.push(e); })
      });
      var biggest = 0;
      events.forEach(function (e) {
        if (e.i18nKey === 'dig.try') biggest = Math.max(biggest, e.i18nArgs.cells.length);
      });
      expect(biggest).toBe(4);
    });

    it('the retry path: the replay ends on the closest puzzle, not on the last dig', function () {
      withUnreachable(function () {
        var finals = 0;
        for (var s = 9000; s < 9012; s++) {
          var out = run({ variantId: UNREACHABLE, difficulty: 'nightmare', seed: s, maxAttempts: 3 }, 'full');
          checkEvents(out.events);
          expect(Array.from(replay(out.events, 16).value)).toEqual(Array.from(out.result.givens));
          finals += count(out.events, 'tune.final');
        }
        expect(finals).toBeGreaterThan(0);
      });
    }, 60000);

    it('a real trace, capped to 2000 events, replays to the same board (step events all kept)', function () {
      var out = run({ difficulty: 'hell1', seed: 21 }, 'full');
      expect(out.events.length).toBeGreaterThan(2000);
      var capped = E.capTrace(out.events, 2000);
      expect(capped.length).toBeLessThan(2001);
      expect(capped.filter(function (e) { return e.type !== 'micro'; }))
        .toEqual(out.events.filter(function (e) { return e.type !== 'micro'; }));
      expect(Array.from(replay(capped, 81).value)).toEqual(Array.from(out.result.givens));
    });
  });

  describe('instrumented generators: what the events cost', function () {
    /** The workload of one measurement: `work(emit)` runs it, `emit` is undefined, or an emitter. */
    function emitFor(mode, log) {
      if (mode === 'none') return undefined;
      return E.createEmitter(mode, function (e) { log.push(e); });
    }

    /** Best time of `work` per mode over interleaved rounds (the minimum is the least noisy statistic). */
    function bestTimes(work, modes, rounds) {
      var best = {};
      var log = [];
      modes.forEach(function (m) { best[m] = Infinity; });
      work(undefined);
      for (var r = 0; r < rounds; r++) {
        for (var k = 0; k < modes.length; k++) {
          var mode = modes[(k + r) % modes.length];
          log.length = 0;
          var emit = emitFor(mode, log);
          var t0 = now();
          work(emit);
          var dt = now() - t0;
          if (dt < best[mode]) best[mode] = dt;
        }
      }
      return best;
    }

    /**
     * The cost of `mode` relative to no emitter, as the smallest ratio seen over up to `attempts`
     * measurements, stopping at the first one under `limit`. Timing on a busy machine is noisy by a few
     * percent in either direction; a real overhead above the limit shows in every attempt, noise does not.
     */
    function costRatio(work, mode, limit, attempts) {
      var smallest = Infinity;
      for (var a = 0; a < attempts && smallest >= limit; a++) {
        var t = bestTimes(work, ['none', mode], 6);
        smallest = Math.min(smallest, t[mode] / t.none);
      }
      return smallest;
    }

    function generateWork(emit) {
      var opts = emit === undefined ? {} : { emit: emit };
      for (var s = 1; s <= 24; s++) SG.digger.generate(model9, 'easy', SG.rng.create(s), opts);
      for (var m = 1; m <= 2; m++) SG.digger.generate(model9, 'normal', SG.rng.create(m), opts);
    }

    it("generating puzzles: verbosity 'off' costs less than 2%", function () {
      expect(costRatio(generateWork, 'off', 1.02, 5)).toBeLessThan(1.02);
    }, 120000);

    it("generating puzzles: verbosity 'summary' costs less than 10%", function () {
      expect(costRatio(generateWork, 'summary', 1.10, 4)).toBeLessThan(1.10);
    }, 120000);

    it("generating puzzles: verbosity 'full' costs less than 35%", function () {
      expect(costRatio(generateWork, 'full', 1.35, 4)).toBeLessThan(1.35);
    }, 120000);

    it("digging a grid: 'off' costs less than 2%, 'full' less than 35%", function () {
      var rng = SG.rng.create(5);
      var solution = SG.fullGrid.generate(model9, rng.fork('g'), null);
      function work(emit) {
        for (var i = 0; i < 60; i++) {
          SG.digger.dig(model9, solution, SG.rng.create(100 + i), emit === undefined ? {} : { emit: emit });
        }
      }
      expect(costRatio(work, 'off', 1.02, 5)).toBeLessThan(1.02);
      expect(costRatio(work, 'full', 1.35, 4)).toBeLessThan(1.35);
    }, 120000);

    it("full grids: 'off' and 'summary' cost almost nothing; 'full' under 40 us a grid", function () {
      var grids = 400;
      function work(emit) {
        var opts = emit === undefined ? {} : { emit: emit };
        for (var s = 1; s <= grids; s++) SG.fullGrid.generate(model9, SG.rng.create(s), null, opts);
      }
      // A grid takes about 20 microseconds, so this workload is short and its noise larger: 5%, not 2%. The
      // exact guarantee for 'off' is the structural test below.
      expect(costRatio(work, 'off', 1.05, 6)).toBeLessThan(1.05);
      expect(costRatio(work, 'summary', 1.05, 6)).toBeLessThan(1.05);
      // A grid is far too small for a rich event stream to cost under 35% of it; what matters is the cost
      // per grid against the dig that follows (milliseconds).
      var best = Infinity;
      for (var attempt = 0; attempt < 4 && best >= 40; attempt++) {
        var t = bestTimes(work, ['none', 'full'], 6);
        best = Math.min(best, (t.full - t.none) / grids * 1000);
      }
      expect(best).toBeLessThan(40);
    }, 120000);

    /** An emitter whose event-building entry points count their calls. */
    function spiedEmitter(verbosity, sink) {
      var emitter = E.createEmitter(verbosity, sink || function () {});
      var calls = { micro: 0, microChunks: 0, syncBoard: 0, clearBoard: 0, bindBoard: 0, metric: 0 };
      Object.keys(calls).forEach(function (name) {
        var original = emitter[name];
        emitter[name] = function () {
          calls[name]++;
          return original.apply(emitter, arguments);
        };
      });
      return { emitter: emitter, calls: calls };
    }

    it("verbosity 'off' builds no event in the loops: only step events and done reach the sink", function () {
      var seen = [];
      var spy = spiedEmitter('off', function (e) { seen.push(e); });
      SG.digger.generate(model9, 'hard', SG.rng.create(5), { emit: spy.emitter });
      var none = { micro: 0, microChunks: 0, syncBoard: 0, clearBoard: 0, bindBoard: 0, metric: 0 };
      expect(spy.calls).toEqual(none);
      expect(seen.every(function (e) { return e.type === 'step' && e.phase !== 'progress'; })).toBe(true);
      // The cost is the step events: a handful per dig sample, not one per group.
      expect(seen.length).toBeLessThan(200);
      var viaPipeline = spiedEmitter('off');
      P.run(config({ difficulty: 'hard', seed: 5 }), viaPipeline.emitter);
      expect(viaPipeline.calls.micro + viaPipeline.calls.microChunks + viaPipeline.calls.syncBoard).toBe(0);
    });

    it("verbosity 'summary' builds metric events only (one per 50 ms at most), no micro event", function () {
      var seen = [];
      var spy = spiedEmitter('summary', function (e) { seen.push(e); });
      SG.digger.generate(model9, 'normal', SG.rng.create(5), { emit: spy.emitter });
      expect(spy.calls.micro + spy.calls.microChunks + spy.calls.syncBoard + spy.calls.clearBoard).toBe(0);
      expect(spy.calls.metric).toBeGreaterThan(10);
      var metrics = seen.filter(function (e) { return e.type === 'metric'; });
      for (var i = 1; i < metrics.length; i++) expect(metrics[i].t - metrics[i - 1].t).toBeGreaterThan(49.9);
    });

    it('only verbosity full takes the traced search; the others run SG.dfs.searchFrom', function () {
      var original = SG.dfs.searchFrom;
      var calls = 0;
      SG.dfs.searchFrom = function () {
        calls++;
        return original.apply(SG.dfs, arguments);
      };
      try {
        var seen = {};
        ['none', 'off', 'summary', 'full'].forEach(function (mode) {
          calls = 0;
          var opts = mode === 'none' ? {} : { emit: E.createEmitter(mode, function () {}) };
          SG.fullGrid.generate(model9, SG.rng.create(8), null, opts);
          seen[mode] = calls;
        });
        expect(seen).toEqual({ none: 1, off: 1, summary: 1, full: 0 });
      } finally {
        SG.dfs.searchFrom = original;
      }
      expect(SG.dfs.searchFrom).toBe(original);
    });

    it('a null sink costs nothing: no event is built and the plain code runs', function () {
      var emitter = E.createEmitter('full', null);
      expect(emitter.wantsMicro).toBe(false);
      var out = SG.digger.generate(model9, 'easy', SG.rng.create(4), { emit: emitter });
      expect(Array.from(out.givens)).toEqual(Array.from(direct(model9, 'easy', 4).givens));
      expect(emitter.count).toBe(0);
    });

    bench('full grid classic9, no emitter', function () {
      SG.fullGrid.generate(model9, SG.rng.create(1), null);
    }, 300);

    bench("full grid classic9, verbosity 'off'", (function () {
      var emitter = E.createEmitter('off', function () {});
      return function () { SG.fullGrid.generate(model9, SG.rng.create(1), null, { emit: emitter }); };
    })(), 300);

    bench("full grid classic9, verbosity 'full'", (function () {
      var emitter = E.createEmitter('full', function () {});
      return function () { SG.fullGrid.generate(model9, SG.rng.create(1), null, { emit: emitter }); };
    })(), 300);

    bench('generate classic9 easy, no emitter', function () {
      SG.digger.generate(model9, 'easy', SG.rng.create(2), {});
    }, 30);

    bench("generate classic9 easy, verbosity 'full'", (function () {
      var log = [];
      var emitter = E.createEmitter('full', function (e) {
        log.push(e);
        if (log.length > 5000) log.length = 0;
      });
      return function () { SG.digger.generate(model9, 'easy', SG.rng.create(2), { emit: emitter }); };
    })(), 30);
  });

  describe('pipeline: configuration', function () {
    it('fills in the defaults and fixes the seed', function () {
      var cfg = P.normalizeConfig({ variantId: 'classic9', seed: 5 });
      expect(cfg).toEqual({
        variantId: 'classic9', difficulty: 'normal', seed: 5, symbolMode: 'digits', symmetry: 'rotational180',
        digOrder: 'random', maxAttempts: 8, trace: 'summary', variantOptions: {}
      });
      expect(P.normalizeConfig({ variantId: 'classic9', seed: -1 }).seed).toBe(4294967295);
      expect(P.normalizeConfig({ variantId: 'classic9', seed: 2 * 4294967296 + 7 }).seed).toBe(7);
      var random = P.normalizeConfig({ variantId: 'classic9' }).seed;
      expect(Number.isInteger(random) && random >= 0 && random <= 4294967295).toBe(true);
    });

    it('keeps what the caller chose, and does not change the object it was given', function () {
      var given = {
        variantId: 'classic6', difficulty: 'veryEasy', seed: 9, symbolMode: 'letters', symmetry: 'mirrorV',
        digOrder: 'spiral', maxAttempts: 3, trace: 'off', variantOptions: { a: [1, 2], b: { c: 'x' } }
      };
      var before = JSON.parse(JSON.stringify(given));
      var cfg = P.normalizeConfig(given);
      expect(cfg).toEqual(before);
      expect(cfg.variantOptions).not.toBe(given.variantOptions);
      run(Object.assign({}, given, { trace: 'summary' }));
      expect(given).toEqual(before);
    });

    it('rejects every kind of bad option with a GenerationError code', function () {
      function bad(extra, code) {
        expectCode(function () { P.normalizeConfig(Object.assign({ variantId: 'classic9' }, extra)); }, code);
      }
      expectCode(function () { P.normalizeConfig(null); }, 'pipeline.invalidOption');
      expectCode(function () { P.normalizeConfig({ variantId: 'nope' }); }, 'variant.unknown');
      expectCode(function () { P.normalizeConfig({}); }, 'variant.unknown');
      bad({ difficulty: 'hell' }, 'difficulty.unknownLevel');
      expectCode(function () { P.normalizeConfig({ variantId: 'classic4', difficulty: 'nightmare' }); },
        'difficulty.unsupportedLevel');
      bad({ seed: 'abc' }, 'rng.invalidSeed');
      bad({ seed: Infinity }, 'rng.invalidSeed');
      bad({ symmetry: 'zigzag' }, 'symmetry.unknownKind');
      bad({ digOrder: 'diagonal' }, 'digger.invalidOption');
      bad({ maxAttempts: 0 }, 'digger.invalidOption');
      bad({ maxAttempts: 2.5 }, 'digger.invalidOption');
      bad({ trace: 'loud' }, 'events.invalidVerbosity');
      bad({ symbolMode: 'klingon' }, 'pipeline.invalidOption');
      bad({ variantOptions: [] }, 'pipeline.invalidOption');
      bad({ variantOptions: null }, 'pipeline.invalidOption');
      bad({ variantOptions: { f: function () {} } }, 'pipeline.invalidOption');
    });

    it('a bad configuration is an error event in the configure step, whatever the verbosity', function () {
      ['off', 'summary', 'full'].forEach(function (trace) {
        var events = [];
        var thrown = expectCode(function () {
          P.run({ variantId: 'classic9', difficulty: 'hell', trace: trace },
            function (e) { events.push(e); });
        }, 'difficulty.unknownLevel');
        var last = events[events.length - 1];
        expect(last.type).toBe('error');
        expect(last.stepId).toBe('configure');
        expect(last.i18nKey).toBe('error.difficulty.unknownLevel');
        expect(last.i18nArgs.level).toBe('hell');
        expect(thrown.i18nArgs.level).toBe('hell');
        expect(keysOf(events)).toEqual(['configure.start', 'error.difficulty.unknownLevel']);
        checkEvents(events);
      });
    });

    it('works without a sink, with a sink function and with a ready-made emitter', function () {
      var plain = P.run(config({ difficulty: 'easy', seed: 6 }), null);
      var seen = [];
      var emitter = E.createEmitter('off', function (e) { seen.push(e); });
      var viaEmitter = P.run(config({ difficulty: 'easy', seed: 6, trace: 'full' }), emitter);
      expect(Array.from(viaEmitter.givens)).toEqual(Array.from(plain.givens));
      // The emitter decides the verbosity: it is 'off', whatever config.trace says.
      expect(seen.some(function (e) { return e.type === 'micro' || e.phase === 'progress'; })).toBe(false);
      expect(seen[seen.length - 1].type).toBe('done');
      expect(viaEmitter.config.trace).toBe('full');
    });
  });

  describe('pipeline: the PuzzleResult (design.md 13.9)', function () {
    it('has exactly the fields of the contract', function () {
      var out = run({ difficulty: 'easy', seed: 4 });
      expect(Object.keys(out.result).sort()).toEqual(['attempts', 'config', 'digLog', 'givens', 'model',
        'rating', 'seed', 'solution', 'timings', 'warnings']);
    });

    it('holds a valid puzzle: invariants I1, I2, I3 and I6, and the model and rating', function () {
      ['veryEasy', 'easy', 'normal', 'hard', 'master', 'nightmare'].forEach(function (level, i) {
        var out = run({ difficulty: level, seed: 30 + i });
        var r = out.result;
        var spec = D.spec(level, r.model);
        expect(r.model.cellCount).toBe(81);
        expect(r.givens).toHaveLength(81);
        expect(SG.model.isSolution(r.model, r.solution)).toBe(true);
        expect(SG.dfs.countSolutions(r.model, r.givens, 2)).toBe(1);
        for (var c = 0; c < 81; c++) if (r.givens[c] !== 0) expect(r.givens[c]).toBe(r.solution[c]);
        expect(clueCount(r.givens)).toBeGreaterThanOrEqual(spec.minClues);
        expect(r.rating.level).toBe(D.rate(r.model, r.givens).level);
        expect(r.config.difficulty).toBe(level);
        expect(r.seed).toBe(30 + i);
        expect(r.attempts).toBeGreaterThanOrEqual(1);
        if (r.rating.level === level) {
          expect(r.rating.score).toBeGreaterThanOrEqual(spec.min);
          expect(r.rating.score).toBeLessThan(spec.max);
          expect(r.warnings).toEqual([]);
        }
      });
    }, 60000);

    it('returns the normalised configuration with the seed, and a random seed if none given', function () {
      var out = run({ seed: undefined, difficulty: 'veryEasy' });
      expect(out.result.config.seed).toBe(out.result.seed);
      expect(out.result.config.variantId).toBe('classic9');
      expect(out.result.config.maxAttempts).toBe(8);
      // Running again with the reported seed reproduces the puzzle (invariant I4).
      var again = run({ seed: out.result.seed, difficulty: 'veryEasy' });
      expect(Array.from(again.result.givens)).toEqual(Array.from(out.result.givens));
    });

    it('the result is plain enough to be sent to the main thread (structuredClone)', function () {
      if (typeof structuredClone !== 'function') SG.test.skip('no structuredClone here');
      var out = run({ difficulty: 'easy', seed: 4 });
      var copy = structuredClone(out.result);
      expect(Array.from(copy.givens)).toEqual(Array.from(out.result.givens));
      expect(copy.config).toEqual(out.result.config);
      expect(copy.timings).toEqual(out.result.timings);
      expect(copy.model.cellCount).toBe(81);
    });

    it('timings has the seven step keys and sums to the elapsed time within 5% (median of 7)', function () {
      var errors = [];
      for (var r = 0; r < 7; r++) {
        var t0 = now();
        var result = P.run(config({ difficulty: 'hard', seed: 50 + r }), function () {});
        var elapsed = now() - t0;
        expect(Object.keys(result.timings)).toEqual(STEPS);
        var sum = 0;
        STEPS.forEach(function (id) {
          expect(typeof result.timings[id]).toBe('number');
          expect(result.timings[id]).toBeGreaterThanOrEqual(0);
          sum += result.timings[id];
        });
        errors.push(Math.abs(sum - elapsed) / elapsed);
      }
      errors.sort(function (a, b) { return a - b; });
      expect(errors[3]).toBeLessThan(0.05);
      expect(errors[6]).toBeLessThan(0.25);
    }, 60000);

    it('dig is where the time goes on classic9, and every step was timed', function () {
      var result = run({ difficulty: 'hard', seed: 51 }).result;
      STEPS.forEach(function (id) { expect(result.timings[id]).toBeGreaterThan(0); });
      expect(result.timings.dig).toBeGreaterThan(result.timings.fullGrid);
      expect(result.timings.dig).toBeGreaterThan(result.timings.rate);
    });
  });

  var DIG_OPS = ['pass', 'accept', 'reject', 'keep', 'restart', 'signs', 'clear', 'reveal'];

  /** Applies a dig log to the solution: the board and, for Greater-Than, the signs it ends with. */
  function replayDigLog(result) {
    var values = Int32Array.from(result.solution);
    var signs = null;
    var alive = null;
    result.digLog.forEach(function (e) {
      if (e.op === 'signs') {
        signs = e.signs;
        alive = signs.map(function () { return 1; });
      } else if (e.op === 'clear') {
        values.fill(0);
      } else if (e.op === 'reveal') {
        e.cells.forEach(function (c) { values[c] = result.solution[c]; });
      } else if (e.op === 'restart') {
        values = Int32Array.from(result.solution);
      } else if (e.op === 'accept') {
        if (typeof e.sign === 'number') alive[e.sign] = 0;
        else e.cells.forEach(function (c) { values[c] = 0; });
      }
    });
    return {
      values: values,
      signs: signs === null ? null : signs.filter(function (s, i) { return alive[i] === 1; })
    };
  }

  function checkDigLog(result) {
    expect(Array.isArray(result.digLog)).toBe(true);
    expect(result.digLog.length).toBeGreaterThan(0);
    result.digLog.forEach(function (e) {
      expect(DIG_OPS.indexOf(e.op)).not.toBe(-1);
      if (e.op === 'accept' || e.op === 'reject' || e.op === 'keep' || e.op === 'reveal') {
        expect(e.cells.length).toBeGreaterThan(0);
        e.cells.forEach(function (c) { expect(c >= 0 && c < result.model.cellCount).toBe(true); });
      }
      if (e.op === 'reject') expect(typeof e.reason).toBe('string');
      if (e.op === 'pass') expect(typeof e.pass).toBe('string');
    });
    var end = replayDigLog(result);
    expect(Array.from(end.values)).toEqual(Array.from(result.givens));
    if (end.signs !== null) {
      expect(end.signs).toEqual(result.model.inequalities.map(function (q) { return [q.a, q.b]; }));
    }
  }

  describe('pipeline: the dig log (the data of the replay)', function () {
    [['classic4', 'veryEasy'], ['classic9', 'veryEasy'], ['classic9', 'normal'], ['classic9', 'nightmare'],
      ['killer', 'easy'], ['greaterThan', 'easy'], ['greaterThan', 'normal'], ['wordoku', 'easy'],
      ['jigsaw9', 'easy']].forEach(function (pair) {
      it(pair[0] + ' ' + pair[1] + ': applied to the solution, it ends exactly on the puzzle', function () {
        var out = run({ variantId: pair[0], difficulty: pair[1], seed: 21 }, 'off');
        checkDigLog(out.result);
        var ops = out.result.digLog.map(function (e) { return e.op; });
        expect(ops).toContain('pass');
        expect(ops).toContain('accept');
        if (pair[0] === 'greaterThan') {
          expect(ops[0]).toBe('signs');
          expect(ops).toContain('clear');
        }
      }, 60000);
    });

    it('records the guided pass from normal on: candidates kept or refused, then the hardest removed',
      function () {
        var log = run({ difficulty: 'hard', seed: 8 }, 'off').result.digLog;
        var passes = log.filter(function (e) { return e.op === 'pass'; })
          .map(function (e) { return e.pass; });
        expect(passes).toEqual(['random', 'guided']);
        var guided = log.slice(log.map(function (e) { return e.pass; }).indexOf('guided'));
        expect(guided.some(function (e) { return e.op === 'keep'; })).toBe(true);
        expect(guided.some(function (e) { return e.op === 'accept'; })).toBe(true);
      });

    it('does not depend on the trace verbosity, and is plain data that crosses the wire', function () {
      var off = run({ difficulty: 'normal', seed: 12 }, 'off').result;
      var full = run({ difficulty: 'normal', seed: 12 }, 'full').result;
      expect(full.digLog).toEqual(off.digLog);
      expect(JSON.parse(JSON.stringify(off.digLog))).toEqual(off.digLog);
      expect(P.fromWire(P.toWire(off)).digLog).toEqual(off.digLog);
      expect(P.fromWire(Object.assign({}, P.toWire(off), { digLog: undefined })).digLog).toBeUndefined();
    });
  });

  describe('pipeline: identical to calling the functions directly with the same seed', function () {
    it('classic9, every level, several seeds', function () {
      var levels = ['veryEasy', 'easy', 'normal', 'hard', 'master', 'nightmare'];
      levels.forEach(function (level, i) {
        [3, 77 + i].forEach(function (seed) {
          var viaPipeline = run({ difficulty: level, seed: seed }).result;
          var byHand = direct(model9, level, seed);
          expect(Array.from(viaPipeline.givens)).toEqual(Array.from(byHand.givens));
          expect(Array.from(viaPipeline.solution)).toEqual(Array.from(byHand.solution));
          expect(viaPipeline.rating.score).toBe(byHand.rating.score);
          expect(viaPipeline.rating.level).toBe(byHand.achieved);
          expect(viaPipeline.attempts).toBe(byHand.attempts);
        });
      });
    }, 60000);

    it('with other symmetries, dig orders and attempt limits, and on the smaller boards', function () {
      var cases = [
        { difficulty: 'normal', seed: 5, symmetry: 'mirrorBoth' },
        { difficulty: 'easy', seed: 6, symmetry: 'rotational90', digOrder: 'spiral' },
        { difficulty: 'easy', seed: 7, symmetry: 'none', digOrder: 'snake' },
        { difficulty: 'hard', seed: 8, symmetry: 'diagonal', digOrder: 'jumpOne' },
        { difficulty: 'easy', seed: 9, digOrder: 'rowByRow', maxAttempts: 2 },
        { variantId: 'classic4', difficulty: 'veryEasy', seed: 10 },
        { variantId: 'classic6', difficulty: 'veryEasy', seed: 11, maxAttempts: 2 }
      ];
      cases.forEach(function (c) {
        var cfg = config(c);
        var model = SG.variants.get(cfg.variantId).build({}, null);
        var byHand = direct(model, cfg.difficulty, cfg.seed, {
          symmetry: c.symmetry, order: c.digOrder, maxAttempts: c.maxAttempts
        });
        var viaPipeline = P.run(cfg, null);
        expect(Array.from(viaPipeline.givens)).toEqual(Array.from(byHand.givens));
        expect(viaPipeline.rating.score).toBe(byHand.rating.score);
      });
    }, 60000);

    it('does not depend on the trace level, the sink or whether anyone listens (I4)', function () {
      var cfg = config({ difficulty: 'hard', seed: 123 });
      var reference = P.run(Object.assign({}, cfg, { trace: 'off' }), null);
      ['off', 'summary', 'full'].forEach(function (trace) {
        var withSink = P.run(Object.assign({}, cfg, { trace: trace }), function () {});
        var withoutSink = P.run(Object.assign({}, cfg, { trace: trace }), null);
        expect(Array.from(withSink.givens)).toEqual(Array.from(reference.givens));
        expect(Array.from(withoutSink.givens)).toEqual(Array.from(reference.givens));
        expect(withSink.rating.score).toBe(reference.rating.score);
      });
    });

    it('the same seed gives the same puzzle, another seed another one', function () {
      var a = P.run(config({ difficulty: 'normal', seed: 1000 }), null);
      var b = P.run(config({ difficulty: 'normal', seed: 1000 }), null);
      var c = P.run(config({ difficulty: 'normal', seed: 1001 }), null);
      expect(Array.from(b.givens)).toEqual(Array.from(a.givens));
      expect(Array.from(c.givens)).not.toEqual(Array.from(a.givens));
    });

    it('an unreachable level gives the same closest puzzle both ways, with the same warning', function () {
      withUnreachable(function () {
        var model = SG.variants.get(UNREACHABLE).build({}, null);
        var byHand = direct(model, 'nightmare', 9000, { maxAttempts: 3 });
        var viaPipeline = P.run(
          config({ variantId: UNREACHABLE, difficulty: 'nightmare', seed: 9000, maxAttempts: 3 }), null);
        expect(Array.from(viaPipeline.givens)).toEqual(Array.from(byHand.givens));
        expect(viaPipeline.warnings).toEqual(byHand.warnings);
        expect(viaPipeline.warnings).toContain('difficulty.approximate');
        expect(viaPipeline.attempts).toBe(3);
      });
    }, 60000);
  });

  describe('pipeline: the retry loop', function () {
    it('after each missed attempt it emits retry.difficulty with the reason, then a new grid', function () {
      withUnreachable(function () {
        var out = run({ variantId: UNREACHABLE, difficulty: 'nightmare', seed: 9000, maxAttempts: 3 },
          'summary');
        var retries = out.events.filter(function (e) { return e.type === 'retry'; });
        expect(retries).toHaveLength(3);
        expect(retries.map(function (e) { return e.i18nArgs.attempt; })).toEqual([1, 2, 3]);
        expect(retries.map(function (e) { return e.i18nArgs.willRetry; })).toEqual([true, true, false]);
        retries.forEach(function (e) {
          expect(e.i18nKey).toBe('retry.difficulty');
          expect(e.i18nArgs.reason).toBe('difficulty');
          expect(e.i18nArgs.maxAttempts).toBe(3);
          expect(e.i18nArgs.requested).toBe('nightmare');
          expect(e.i18nArgs.achieved).toBe('veryEasy');
          expect(e.stepId).toBe('tune');
        });
        // Step 3 starts again for every attempt, numbered "attempt n of m".
        var grids = out.events.filter(function (e) { return e.i18nKey === 'fullGrid.start'; });
        expect(grids.map(function (e) { return e.i18nArgs.attempt; })).toEqual([1, 2, 3]);
        expect(grids.every(function (e) { return e.i18nArgs.maxAttempts === 3; })).toBe(true);
        expect(out.result.attempts).toBe(3);
        checkEvents(out.events);
        checkNesting(out.events);
      });
    }, 60000);

    it('gives up with the closest puzzle, the warning difficulty.approximate and no exception', function () {
      withUnreachable(function () {
        var out = run({ variantId: UNREACHABLE, difficulty: 'nightmare', seed: 9001, maxAttempts: 2 },
          'summary');
        expect(out.result.warnings).toEqual(['difficulty.approximate']);
        expect(out.result.rating.level).not.toBe('nightmare');
        expect(out.result.rating.solved).toBe(true);
        expect(SG.dfs.countSolutions(out.result.model, out.result.givens, 2)).toBe(1);
        expect(count(out.events, 'tune.best')).toBe(1);
        var finalize = out.events.filter(function (e) {
          return e.i18nKey === 'tune.start' && e.i18nArgs.finalize;
        });
        expect(finalize).toHaveLength(1);
        var done = out.events[out.events.length - 1];
        expect(done.i18nArgs.exact).toBe(false);
        expect(done.i18nArgs.warnings).toEqual(['difficulty.approximate']);
      });
    }, 60000);

    it('a missed dig sample is tune.miss; a reached level is tune.hit and ends the loop', function () {
      withUnreachable(function () {
        var out = run({ variantId: UNREACHABLE, difficulty: 'nightmare', seed: 9002, maxAttempts: 1 },
          'summary');
        var miss = out.events.filter(function (e) { return e.i18nKey === 'tune.miss'; });
        // Twelve dig samples, and the local search of the attempt (section 5.7 (6)) at the end.
        expect(miss).toHaveLength(13);
        expect(count(out.events, 'tune.hit')).toBe(0);
        expect(miss.map(function (e) { return e.i18nArgs.sample; })).toEqual(
          Array.from({ length: 13 }, function (v, i) { return Math.min(12, i + 1); }));
        expect(miss[0].i18nArgs.maxSamples).toBe(12);
      });
      var hit = run({ difficulty: 'easy', seed: 9003 }, 'summary');
      expect(count(hit.events, 'tune.hit')).toBe(1);
      expect(hit.events.filter(function (e) { return e.type === 'retry'; })).toHaveLength(0);
    }, 60000);

    it('no retry events at verbosity off', function () {
      withUnreachable(function () {
        var out = run({ variantId: UNREACHABLE, difficulty: 'nightmare', seed: 9000, maxAttempts: 2 }, 'off');
        expect(out.events.filter(function (e) { return e.type === 'retry'; })).toHaveLength(0);
        expect(out.result.warnings).toContain('difficulty.approximate');
      });
    }, 60000);
  });

  describe('pipeline: variant hooks', function () {
    it('a variant without postGenerate still passes step 4 and says there is nothing to do', function () {
      var out = run({ difficulty: 'easy', seed: 2 }, 'summary');
      var extra = out.events.filter(function (e) { return e.stepId === 'extraStructure'; });
      expect(keysOf(extra)).toEqual(['extraStructure.start', 'extraStructure.none', 'extraStructure.end']);
      expect(extra[1].i18nArgs).toEqual({ variantId: 'classic9' });
      expect(extra[2].i18nArgs).toEqual({ skipped: true });
      // Even at 'off' the step is there, and its end event says it was skipped.
      var quiet = run({ difficulty: 'easy', seed: 2 }, 'off').events.filter(function (e) {
        return e.stepId === 'extraStructure';
      });
      expect(keysOf(quiet)).toEqual(['extraStructure.start', 'extraStructure.end']);
      expect(quiet[1].i18nArgs.skipped).toBe(true);
    });

    it('calls postGenerate once per attempt after the full grid, with the contract context', function () {
      var calls = [];
      var events = [];
      var def = hookVariant('hookCtx', {
        postGenerate: function (ctx) {
          calls.push({ ctx: ctx, seen: events.length });
        }
      });
      withVariant(def, function () {
        var result = P.run({ variantId: 'hookCtx', difficulty: 'easy', seed: 6, trace: 'full' },
          function (e) { events.push(e); });
        expect(calls).toHaveLength(1);
        var ctx = calls[0].ctx;
        expect(Object.keys(ctx).sort()).toEqual(['attempt', 'budget', 'caps', 'emit', 'keeper', 'level',
          'model', 'rng', 'solution', 'spec', 'symmetry', 'variantId']);
        expect(ctx.symmetry).toBe('rotational180');
        expect(typeof ctx.keeper.offer).toBe('function');
        expect(typeof ctx.keeper.closer).toBe('function');
        expect(ctx.caps.maxRatings).toBe(1024);
        expect(ctx.caps.maxProposals).toBe(32768);
        expect(typeof ctx.caps.ratings).toBe('number');
        expect(typeof ctx.caps.proposals).toBe('number');
        expect(ctx.variantId).toBe('hookCtx');
        expect(ctx.model.variantId).toBe('hookCtx');
        expect(ctx.level).toBe('easy');
        expect(ctx.attempt).toBe(1);
        expect(ctx.spec.level).toBe('easy');
        expect(ctx.budget).toBe(null);
        expect(ctx.emit.isEmitter).toBe(true);
        expect(SG.model.isSolution(ctx.model, ctx.solution)).toBe(true);
        expect(ctx.rng.seed).toBe(SG.rng.create(6).fork('extra#1').seed);
        // It ran between the end of the full grid and the dig.
        var before = events.slice(0, calls[0].seen).map(function (e) { return e.i18nKey; });
        expect(before.slice(-2)).toEqual(['fullGrid.end', 'extraStructure.start']);
        var after = events.filter(function (e) { return e.stepId === 'extraStructure'; });
        expect(keysOf(after)).toEqual(['extraStructure.start', 'extraStructure.built', 'extraStructure.end']);
        expect(after[2].i18nArgs).toEqual({ skipped: false });
        expect(Array.from(result.solution)).toEqual(Array.from(ctx.solution));
      });
    });

    it('postGenerate runs once per attempt with the grid of that attempt, and may emit events', function () {
      var attempts = [];
      withUnreachable(function () {
        var out = run({ variantId: 'hookEach', difficulty: 'nightmare', seed: 9000, maxAttempts: 3 }, 'full');
        expect(attempts.map(function (a) { return a.attempt; })).toEqual([1, 2, 3]);
        expect(new Set(attempts.map(function (a) { return a.solution; })).size).toBe(3);
        expect(count(out.events, 'extraStructure.built')).toBe(6);
        checkNesting(out.events);
      }, {
        postGenerate: function (ctx) {
          attempts.push({ attempt: ctx.attempt, solution: Array.from(ctx.solution).join('') });
          ctx.emit.micro('extraStructure', 'extraStructure.built', { variantId: ctx.variantId });
        }
      }, 'hookEach');
    }, 60000);

    it('adopts the model that postGenerate returns, for the dig, the rating and the result', function () {
      var replacement = null;
      var seenByDig = [];
      var def = hookVariant('hookModel', {
        postGenerate: function (ctx) {
          replacement = replacement || reModel(ctx.model, 'hookModel');
          return replacement;
        }
      });
      SG.digger.registerStrategy('probeModel', function (model, solution, level, rng, options) {
        seenByDig.push(model);
        return SG.digger.digStage(model, solution, level, rng, options);
      });
      try {
        withVariant(Object.assign(def, { digStrategy: 'probeModel' }), function () {
          var result = P.run({ variantId: 'hookModel', difficulty: 'easy', seed: 8 }, null);
          expect(result.model).toBe(replacement);
          expect(seenByDig.length).toBeGreaterThan(0);
          seenByDig.forEach(function (m) { expect(m).toBe(replacement); });
        });
      } finally {
        SG.digger.unregisterStrategy('probeModel');
      }
    });

    it('refuses a postGenerate model that does not fit the board, in the extraStructure step', function () {
      var def = hookVariant('hookBad', {
        postGenerate: function () { return { cellCount: 5, digits: 9 }; }
      });
      withVariant(def, function () {
        var events = [];
        expectCode(function () {
          P.run({ variantId: 'hookBad', difficulty: 'easy', seed: 1, trace: 'off' },
            function (e) { events.push(e); });
        }, 'digger.invalidPostGenerate');
        expect(events[events.length - 1].stepId).toBe('extraStructure');
        expect(events[events.length - 1].i18nKey).toBe('error.digger.invalidPostGenerate');
      });
    });

    it('an exception in a hook is reported with the step it happened in and thrown again', function () {
      var def = hookVariant('hookThrows', {
        postGenerate: function () { throw new RangeError('hook failed'); }
      });
      withVariant(def, function () {
        var events = [];
        var thrown = null;
        try {
          P.run({ variantId: 'hookThrows', difficulty: 'easy', seed: 1, trace: 'off' },
            function (e) { events.push(e); });
        } catch (e) {
          thrown = e;
        }
        expect(thrown instanceof RangeError).toBe(true);
        var last = events[events.length - 1];
        expect(last.type).toBe('error');
        expect(last.stepId).toBe('extraStructure');
        expect(last.i18nKey).toBe('error.unexpected');
        expect(last.i18nArgs.message).toBe('hook failed');
      });
    });

    it('digStrategy selects the dig of step 5 by id; the strategy gets the resolved options', function () {
      var received = [];
      SG.digger.registerStrategy('probe', function (model, solution, level, rng, options) {
        received.push(options);
        return SG.digger.digStage(model, solution, level, rng, options);
      });
      try {
        var def = hookVariant('hookStrategy', { digStrategy: 'probe' });
        withVariant(def, function () {
          var out = run({ variantId: 'hookStrategy', difficulty: 'easy', seed: 4, symmetry: 'mirrorH' },
            'summary');
          expect(received.length).toBeGreaterThan(0);
          var o = received[0];
          expect(o.symmetry).toBe('mirrorH');
          expect(o.order).toBe('random');
          expect(o.spec.level).toBe('easy');
          expect(o.minClues).toBe(o.spec.minClues);
          expect(o.emit.isEmitter).toBe(true);
          expect(o.budget).toBe(null);
          var start = out.events.filter(function (e) { return e.i18nKey === 'dig.start'; })[0];
          expect(start.i18nArgs.strategy).toBe('probe');
          // This strategy delegates, so the puzzle is the one of a classic9 run.
          var classic = P.run(config({ difficulty: 'easy', seed: 4, symmetry: 'mirrorH' }), null);
          expect(Array.from(out.result.givens)).toEqual(Array.from(classic.givens));
        });
      } finally {
        SG.digger.unregisterStrategy('probe');
      }
    });

    it('a strategy that digs differently is used: the puzzle comes from it', function () {
      SG.digger.registerStrategy('fixedPuzzle', function (model, solution, level, rng, options) {
        var limited = Object.assign({}, options, { minClues: 81 });
        return SG.digger.digStage(model, solution, level, rng, limited);
      });
      try {
        withVariant(hookVariant('hookFixed', { digStrategy: 'fixedPuzzle' }), function () {
          var result = P.run({ variantId: 'hookFixed', difficulty: 'veryEasy', seed: 3, maxAttempts: 1 },
            null);
          expect(clueCount(result.givens)).toBe(81);
        });
      } finally {
        SG.digger.unregisterStrategy('fixedPuzzle');
      }
    });

    it('a strategy that digs structure returns the thinned model; rating and result use it', function () {
      var thinned = null;
      SG.digger.registerStrategy('thinModel', function (model, solution, level, rng, options) {
        thinned = thinned || reModel(model, 'hookThin');
        var dug = SG.digger.digStage(model, solution, level, rng, options);
        return { givens: dug.givens, clues: dug.clues, stats: dug.stats, model: thinned };
      });
      try {
        withVariant(hookVariant('hookThin', { digStrategy: 'thinModel' }), function () {
          var result = P.run({ variantId: 'hookThin', difficulty: 'easy', seed: 6 }, null);
          expect(result.model).toBe(thinned);
          expect(SG.dfs.countSolutions(result.model, result.givens, 2)).toBe(1);
        });
      } finally {
        SG.digger.unregisterStrategy('thinModel');
      }
    });

    it('an unknown digStrategy fails early, in the configure step', function () {
      withVariant(hookVariant('hookUnknown', { digStrategy: 'noSuchStrategy' }), function () {
        var events = [];
        expectCode(function () {
          P.run({ variantId: 'hookUnknown', difficulty: 'easy', seed: 1 }, function (e) { events.push(e); });
        }, 'digger.unknownStrategy');
        expect(events[events.length - 1].stepId).toBe('configure');
      });
    });

    it('the strategy registry rejects bad and duplicate ids and keeps the built-in', function () {
      expectCode(function () { SG.digger.registerStrategy('cells', function () {}); },
        'digger.invalidStrategy');
      expectCode(function () { SG.digger.registerStrategy('', function () {}); }, 'digger.invalidStrategy');
      expectCode(function () { SG.digger.registerStrategy('x', 'not a function'); },
        'digger.invalidStrategy');
      expectCode(function () { SG.digger.getStrategy('missing'); }, 'digger.unknownStrategy');
      expect(SG.digger.getStrategy('cells')).toBe(SG.digger.digStage);
      expect(SG.digger.unregisterStrategy('cells')).toBe(false);
      expect(SG.digger.unregisterStrategy('never registered')).toBe(false);
      SG.digger.registerStrategy('temporary', function () {});
      expect(SG.digger.unregisterStrategy('temporary')).toBe(true);
      expect(function () { SG.digger.getStrategy('temporary'); }).toThrow();
    });

    it('a variant that behaves like classic9 gives the classic9 puzzle (the id is no seed)', function () {
      withVariant(hookVariant('hookClone'), function () {
        var clone = P.run({ variantId: 'hookClone', difficulty: 'normal', seed: 31 }, null);
        var classic = P.run(config({ difficulty: 'normal', seed: 31 }), null);
        expect(Array.from(clone.givens)).toEqual(Array.from(classic.givens));
      });
    });

    it('variantOptions reach variant.build, with the rng fork named "model"', function () {
      var received = null;
      var def = hookVariant('hookBuild', {
        build: function (opts, rng) {
          received = { opts: opts, seed: rng.seed };
          return reModel(model9, 'hookBuild');
        }
      });
      withVariant(def, function () {
        P.run({ variantId: 'hookBuild', difficulty: 'easy', seed: 12, variantOptions: { compactness: 0.6 } },
          null);
        expect(received.opts).toEqual({ compactness: 0.6 });
        expect(received.seed).toBe(SG.rng.create(12).fork('model').seed);
      });
    });

    it('a full trace is downgraded to summary for a board with too many cells (design.md 9.4)', function () {
      var saved = P.FULL_TRACE_MAX_CELLS;
      P.FULL_TRACE_MAX_CELLS = 50;
      try {
        var out = run({ difficulty: 'easy', seed: 2 }, 'full');
        expect(out.result.warnings).toContain('trace.downgraded');
        expect(out.result.config.trace).toBe('summary');
        expect(out.events.some(function (e) { return e.type === 'micro'; })).toBe(false);
        var note = out.events.filter(function (e) { return e.i18nKey === 'buildModel.traceDowngraded'; });
        expect(note).toHaveLength(1);
        expect(note[0].i18nArgs).toEqual({ requested: 'full', applied: 'summary', cellCount: 81 });
        // A summary trace is left alone.
        var quiet = run({ difficulty: 'easy', seed: 2 }, 'summary');
        expect(quiet.result.warnings).toEqual([]);
        // And a ready-made emitter is never touched.
        var emitter = E.createEmitter('full', function () {});
        P.run(config({ difficulty: 'easy', seed: 2 }), emitter);
        expect(emitter.verbosity).toBe('full');
      } finally {
        P.FULL_TRACE_MAX_CELLS = saved;
      }
      expect(P.FULL_TRACE_MAX_CELLS).toBe(300);
      expect(run({ difficulty: 'easy', seed: 2 }, 'full').result.warnings).toEqual([]);
    });
  });

  describe('pipeline: the safety net against a technique bug', function () {
    /** A technique that guesses, so the technique-bounded dig produces ambiguous puzzles. */
    function withGuesser(fn) {
      SG.techniques.register({
        id: 'testGuesser',
        group: 'basic',
        baseCost: 1,
        order: 5,
        i18nKey: 'technique.testGuesser',
        find: function (model, state) {
          for (var c = 0; c < model.cellCount; c++) {
            if (state.value[c] === 0) {
              var mask = state.candidates[c];
              var v = 1;
              while ((mask & (1 << (v - 1))) === 0) v++;
              return {
                technique: 'testGuesser', cells: [c], placements: [[c, v]], eliminations: [],
                i18nKey: 'technique.testGuesser.step', i18nArgs: {}
              };
            }
          }
          return null;
        }
      });
      try {
        return withWeights({ testGuesser: 1 }, fn);
      } finally {
        SG.techniques.unregister('testGuesser');
      }
    }

    it('an ambiguous puzzle is reported, replaced, and the replay shows the result', function () {
      withGuesser(function () {
        var sawUnsound = false;
        for (var s = 9300; s < 9306; s++) {
          var out = run({ difficulty: 'veryEasy', seed: s, maxAttempts: 1 }, 'full');
          checkEvents(out.events);
          checkNesting(out.events);
          expect(SG.dfs.countSolutions(out.result.model, out.result.givens, 2)).toBe(1);
          expect(Array.from(replay(out.events, 81).value)).toEqual(Array.from(out.result.givens));
          checkDigLog(out.result);
          var restart = out.result.digLog.map(function (e) { return e.op; }).indexOf('restart');
          if (restart !== -1) {
            // The puzzle comes from a replaced sample: its log digs again from the full grid.
            expect(out.result.digLog[restart + 1].op).toBe('pass');
            expect(out.result.digLog[restart + 1].pass).toBe('fallback');
          }
          if (count(out.events, 'dig.unsound') > 0) {
            sawUnsound = true;
            expect(out.result.warnings).toContain('digger.unsoundTechnique');
            var verdicts = out.events.filter(function (e) { return e.i18nKey === 'dig.verify'; })
              .map(function (e) { return e.i18nArgs.unique; });
            expect(verdicts).toContain(false);
            var passes = out.events.filter(function (e) { return e.i18nKey === 'dig.pass.start'; })
              .map(function (e) { return e.i18nArgs.pass; });
            expect(passes).toContain('fallback');
          }
        }
        expect(sawUnsound).toBe(true);
      });
    }, 60000);

    it('with a sound technique set no sample is reported unsound', function () {
      var out = run({ difficulty: 'normal', seed: 5 }, 'summary');
      expect(count(out.events, 'dig.unsound')).toBe(0);
      out.events.filter(function (e) { return e.i18nKey === 'dig.verify'; }).forEach(function (e) {
        expect(e.i18nArgs.unique).toBe(true);
      });
      expect(out.result.warnings).toEqual([]);
    });
  });

  describe('pipeline: budget and cancellation', function () {
    it('cancelling mid-dig stops the run in under 100 ms with budget.cancelled', function () {
      var budget = SG.budget.create({});
      var events = [];
      var cancelledAt = -1;
      var thrown = null;
      var started = now();
      try {
        P.run(config({ difficulty: 'nightmare', seed: 61, trace: 'full' }), function (e) {
          events.push(e);
          if (cancelledAt < 0 && e.i18nKey === 'dig.try') {
            cancelledAt = now();
            budget.cancel();
          }
        }, budget);
      } catch (e) {
        thrown = e;
      }
      var stopped = now();
      expect(cancelledAt).toBeGreaterThan(-1);
      expect(thrown instanceof SG.errors.GenerationError).toBe(true);
      expect(thrown.code).toBe('budget.cancelled');
      expect(stopped - cancelledAt).toBeLessThan(100);
      expect(cancelledAt - started).toBeLessThan(2000);
      var last = events[events.length - 1];
      expect(last.type).toBe('error');
      expect(last.stepId).toBe('dig');
      expect(last.i18nKey).toBe('error.budget.cancelled');
      expect(events.some(function (e) { return e.type === 'done'; })).toBe(false);
    }, 20000);

    it('a cancel is noticed at the next step boundary, even in a step that never checks it', function () {
      var budget = SG.budget.create({});
      var events = [];
      var thrown = null;
      try {
        P.run(config({ difficulty: 'easy', seed: 3, trace: 'off' }), function (e) {
          events.push(e);
          if (e.i18nKey === 'extraStructure.start') budget.cancel();
        }, budget);
      } catch (e) {
        thrown = e;
      }
      expect(thrown.code).toBe('budget.cancelled');
      expect(events[events.length - 1].stepId).toBe('extraStructure');
      expect(keysOf(events)).not.toContain('dig.start');
    });

    it('a run that was cancelled before it began never starts a step beyond the first check', function () {
      var budget = SG.budget.create({});
      budget.cancel();
      var events = [];
      expectCode(function () {
        P.run(config({ difficulty: 'easy', seed: 3 }), function (e) { events.push(e); }, budget);
      }, 'budget.cancelled');
      expect(keysOf(events)).toEqual(['configure.start', 'error.budget.cancelled']);
    });

    it('a node limit ends the run with budget.exceeded and an error event', function () {
      var events = [];
      var thrown = expectCode(function () {
        P.run(config({ difficulty: 'hard', seed: 8 }), function (e) { events.push(e); },
          SG.budget.create({ nodes: 30 }));
      }, 'budget.exceeded');
      expect(thrown.i18nArgs.reason).toBe('nodes');
      var last = events[events.length - 1];
      expect(last.i18nKey).toBe('error.budget.exceeded');
      expect(last.i18nArgs.reason).toBe('nodes');
      expect(last.i18nArgs.code).toBe('budget.exceeded');
      expect(E.eventProblems(last)).toEqual([]);
    });

    it('a time limit stops a long run', function () {
      var started = now();
      var thrown = null;
      try {
        P.run(config({ difficulty: 'nightmare', seed: 5, maxAttempts: 8 }), null,
          SG.budget.create({ ms: 1 }));
      } catch (e) {
        thrown = e;
      }
      expect(thrown && thrown.code).toBe('budget.exceeded');
      expect(now() - started).toBeLessThan(500);
    });

    it('leaves nothing behind: after a cancel the next run equals the run of a fresh process', function () {
      var expected = direct(model9, 'hard', 77);
      for (var round = 0; round < 3; round++) {
        var budget = SG.budget.create({});
        var tries = 0;
        try {
          P.run(config({ difficulty: 'hard', seed: 90 + round, trace: 'full' }), function (e) {
            if (e.i18nKey === 'dig.try' && ++tries === 20 + round) budget.cancel();
          }, budget);
        } catch (e) {
          expect(e.code).toBe('budget.cancelled');
        }
        expect(budget.isCancelled).toBe(true);
        var again = P.run(config({ difficulty: 'hard', seed: 77 }), null);
        expect(Array.from(again.givens)).toEqual(Array.from(expected.givens));
      }
      expect(E.NULL_EMITTER.count).toBe(0);
    }, 60000);

    it('cancelling in the middle of the full grid search also stops the traced search', function () {
      var budget = SG.budget.create({});
      var thrown = null;
      var seen = 0;
      try {
        SG.fullGrid.generate(model9, SG.rng.create(4), budget, {
          fastSeed: false,
          emit: E.createEmitter('full', function (e) {
            if (e.i18nKey === 'fullGrid.place' && ++seen === 3) budget.cancel();
          })
        });
      } catch (e) {
        thrown = e;
      }
      expect(thrown && thrown.code).toBe('budget.cancelled');
      expect(seen).toBeLessThan(10);
    });
  });
})();
