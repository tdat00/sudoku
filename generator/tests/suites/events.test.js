// Generation event system, the per-step explanation data and the trace limit of design.md section 9.4.
// The pipeline and the instrumented generators are tested in pipeline.test.js.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var E = SG.events;

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
  }

  /** A clock that the test moves by hand. */
  function fakeClock() {
    var t = 0;
    var clock = function () { return t; };
    clock.set = function (ms) { t = ms; };
    return clock;
  }

  function collector(verbosity, options) {
    var log = [];
    var emitter = E.createEmitter(verbosity, function (e) { log.push(e); }, options);
    return { emitter: emitter, log: log };
  }

  /** One event of every kind the emitter knows, in a fixed order. */
  function emitSampleOf(em) {
    em.step('dig', 'start', 'dig.start', { level: 'easy' });
    em.step('dig', 'progress', 'dig.verify', { unique: true });
    em.micro('dig', 'dig.try', { cells: [4] }, { highlight: [4] }, { clues: 30 });
    em.metric('dig', { clues: 30 });
    em.retry('tune', 'retry.difficulty', { attempt: 1 }, { clues: 30 });
    em.step('dig', 'end', 'dig.end', undefined, { clues: 30 });
    em.done({ attempts: 1 }, { clues: 30 });
    em.error('dig', new SG.errors.GenerationError('budget.cancelled', { reason: 'cancelled' }));
  }

  function describeEvent(e) {
    return e.type + ':' + e.phase;
  }

  /** The view that replaying every patch of the events (in order) leaves behind. */
  function replay(events, cellCount) {
    var view = E.createView(cellCount);
    events.forEach(function (e) { if (e.patch) E.applyPatch(view, e.patch); });
    return view;
  }

  function sameView(a, b) {
    expect(Array.from(a.value)).toEqual(Array.from(b.value));
    expect(a.state).toEqual(b.state);
    expect(Array.from(a.highlight)).toEqual(Array.from(b.highlight));
  }

  describe('events: plain data and the event factory', function () {
    it('isPlainData accepts JSON-like data and refuses everything else', function () {
      [null, true, 0, -3.5, 'x', [], {}, [1, [2, { a: 'b' }]], { a: { b: [null] } }].forEach(function (ok) {
        expect(E.isPlainData(ok)).toBe(true);
      });
      function Klass() { this.a = 1; }
      [undefined, NaN, Infinity, function () {}, new Int32Array(2), new Klass(), new Map(), new Date(0),
        { f: function () {} }, [undefined], Symbol('s')].forEach(function (bad) {
        expect(E.isPlainData(bad)).toBe(false);
      });
    });

    it('createEvent builds the schema of design.md 7.2 and leaves out missing parts', function () {
      var bare = E.createEvent('step', 'dig', 'start', 3, 12.5);
      expect(bare).toEqual({ type: 'step', stepId: 'dig', phase: 'start', t: 12.5, seq: 3 });
      var full = E.createEvent('micro', 'dig', 'progress', 4, 13, {
        i18nKey: 'dig.try', i18nArgs: { cells: [1] }, patch: { highlight: [1] }, metrics: { clues: 40 }
      });
      expect(Object.keys(full)).toEqual(['type', 'stepId', 'phase', 't', 'seq', 'i18nKey', 'i18nArgs',
        'patch', 'metrics']);
      expect(E.eventProblems(bare)).toEqual([]);
      expect(E.eventProblems(full)).toEqual([]);
    });

    it('eventProblems names every kind of defect', function () {
      function problems(patch) {
        var e = Object.assign({ type: 'micro', stepId: 'dig', phase: 'progress', t: 1, seq: 0 }, patch);
        return E.eventProblems(e);
      }
      expect(problems({})).toEqual([]);
      expect(problems({ type: 'bogus' })).toHaveLength(1);
      expect(problems({ phase: 'middle' })).toHaveLength(1);
      expect(problems({ stepId: '' })).toHaveLength(1);
      expect(problems({ seq: -1 })).toHaveLength(1);
      expect(problems({ seq: 1.5 })).toHaveLength(1);
      expect(problems({ t: NaN })).toHaveLength(1);
      expect(problems({ extra: 1 })).toHaveLength(1);
      expect(problems({ i18nKey: '' })).toHaveLength(1);
      expect(problems({ i18nArgs: { f: function () {} } })).toHaveLength(1);
      expect(problems({ i18nArgs: { typed: new Int32Array(2) } })).toHaveLength(1);
      expect(problems({ i18nArgs: { n: Infinity } })).toHaveLength(1);
      expect(problems({ i18nArgs: [1] })).toHaveLength(1);
      expect(problems({ metrics: { clues: 'many' } })).toHaveLength(1);
      expect(problems({ patch: { cells: new Array(9).fill({ i: 1, value: 1, state: 'placed' }) } }).length)
        .toBeGreaterThan(0);
      expect(problems({ patch: { cells: [{ i: 1, value: 1, state: 'gold' }] } }).length).toBeGreaterThan(0);
      expect(problems({ patch: { cells: [new Int32Array(3)] } }).length).toBeGreaterThan(0);
      expect(E.eventProblems(null)).toHaveLength(1);
    });

    it('lists the verbosity levels, event types, phases and the seven step ids', function () {
      expect(E.VERBOSITIES).toEqual(['off', 'summary', 'full']);
      expect(E.TYPES).toEqual(['step', 'micro', 'metric', 'retry', 'done', 'error']);
      expect(E.PHASES).toEqual(['start', 'progress', 'end']);
      expect(E.STEP_IDS).toEqual(['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate',
        'tune']);
      expect(E.MAX_PATCH_CELLS).toBe(8);
      expect(E.METRIC_INTERVAL_MS).toBe(50);
      expect(E.DEFAULT_MAX_TRACE_EVENTS).toBe(20000);
    });
  });

  describe('events: emitter and verbosity', function () {
    it("verbosity 'off' emits only step start/end, done and error", function () {
      var c = collector('off');
      emitSampleOf(c.emitter);
      expect(c.log.map(describeEvent)).toEqual(['step:start', 'step:end', 'done:end', 'error:end']);
    });

    it("verbosity 'summary' adds step progress, retry and metric, but no micro events", function () {
      var c = collector('summary');
      emitSampleOf(c.emitter);
      expect(c.log.map(describeEvent)).toEqual(['step:start', 'step:progress', 'metric:progress',
        'retry:progress', 'step:end', 'done:end', 'error:end']);
    });

    it("verbosity 'full' emits everything", function () {
      var c = collector('full');
      emitSampleOf(c.emitter);
      expect(c.log.map(describeEvent)).toEqual(['step:start', 'step:progress', 'micro:progress',
        'metric:progress', 'retry:progress', 'step:end', 'done:end', 'error:end']);
    });

    it('wantsMicro and wantsMetrics tell the hot paths what is worth building', function () {
      var off = E.createEmitter('off', function () {});
      var summary = E.createEmitter('summary', function () {});
      var full = E.createEmitter('full', function () {});
      expect([off.wantsMicro, off.wantsMetrics]).toEqual([false, false]);
      expect([summary.wantsMicro, summary.wantsMetrics]).toEqual([false, true]);
      expect([full.wantsMicro, full.wantsMetrics]).toEqual([true, true]);
      // Without a sink nothing is wanted, whatever the verbosity.
      var silent = E.createEmitter('full', null);
      expect([silent.wantsMicro, silent.wantsMetrics, silent.verbosity]).toEqual([false, false, 'full']);
    });

    it('seq increases by one from 0, with no duplicates, and equals the index in the trace', function () {
      var c = collector('full');
      emitSampleOf(c.emitter);
      emitSampleOf(c.emitter);
      expect(c.log.map(function (e) { return e.seq; })).toEqual(c.log.map(function (e, i) { return i; }));
      expect(c.emitter.count).toBe(c.log.length);
    });

    it('filtered events do not use up sequence numbers', function () {
      var c = collector('off');
      emitSampleOf(c.emitter);
      expect(c.log.map(function (e) { return e.seq; })).toEqual([0, 1, 2, 3]);
    });

    it('t is the time since the emitter was created, never decreasing', function () {
      var clock = fakeClock();
      clock.set(1000);
      var c = collector('full', { now: clock });
      clock.set(1000);
      c.emitter.step('dig', 'start', 'dig.start');
      clock.set(1012.346);
      c.emitter.step('dig', 'end', 'dig.end');
      clock.set(1012.346);
      c.emitter.done();
      expect(c.log.map(function (e) { return e.t; })).toEqual([0, 12.35, 12.35]);
      var real = collector('full');
      emitSampleOf(real.emitter);
      real.log.forEach(function (e, i) {
        expect(typeof e.t).toBe('number');
        if (i > 0) expect(e.t).toBeGreaterThanOrEqual(real.log[i - 1].t);
      });
    });

    it('throttles metric events to one per 50 ms', function () {
      var clock = fakeClock();
      var c = collector('summary', { now: clock });
      var sent = [];
      [0, 10, 49.9, 50, 70, 99, 100, 160, 161].forEach(function (ms) {
        clock.set(ms);
        var before = c.log.length;
        c.emitter.metric('dig', { clues: ms });
        if (c.log.length > before) sent.push(ms);
      });
      expect(sent).toEqual([0, 50, 100, 160]);
      expect(c.log.every(function (e) { return e.type === 'metric' && e.phase === 'progress'; })).toBe(true);
    });

    it('metrics given as a function are only built when the event is sent', function () {
      var clock = fakeClock();
      var c = collector('summary', { now: clock });
      var built = 0;
      function make() {
        built++;
        return { clues: 1 };
      }
      c.emitter.metric('dig', make);
      clock.set(10);
      c.emitter.metric('dig', make);
      clock.set(60);
      c.emitter.metric('dig', make);
      expect(built).toBe(2);
      var off = collector('off', { now: clock });
      off.emitter.metric('dig', make);
      expect(built).toBe(2);
      expect(off.log).toHaveLength(0);
    });

    it('an emitter with a null sink does not throw and sends nothing', function () {
      ['off', 'summary', 'full'].forEach(function (v) {
        [null, undefined].forEach(function (sink) {
          var em = E.createEmitter(v, sink);
          expect(function () {
            emitSampleOf(em);
            em.microChunks('dig', 'dig.restore', {}, [{ i: 0, value: 1, state: 'placed' }]);
            em.syncBoard('dig', 'dig.restore', {}, new Int32Array(4));
            em.clearBoard('dig', 'dig.restore', {});
            em.emit({ type: 'step', stepId: 'dig', phase: 'start' });
            em.bindBoard(4);
            em.setVerbosity('full');
          }).not.toThrow();
          expect(em.count).toBe(0);
          expect(em.view).toBe(null);
        });
      });
    });

    it('rejects an unknown verbosity and a sink that is not a function', function () {
      expectCode(function () { E.createEmitter('loud', function () {}); }, 'events.invalidVerbosity');
      expectCode(function () { E.createEmitter('off', 'sink'); }, 'events.invalidSink');
      expectCode(function () { E.createEmitter('off', {}); }, 'events.invalidSink');
      expectCode(function () { E.createEmitter('full', null).setVerbosity('x'); }, 'events.invalidVerbosity');
    });

    it('the generic emit() filters like the specific methods and refuses an unknown type', function () {
      var c = collector('summary');
      expect(c.emitter.emit({ type: 'micro', stepId: 'dig', phase: 'progress' })).toBe(false);
      var started = { type: 'step', stepId: 'dig', phase: 'start', i18nKey: 'dig.start' };
      expect(c.emitter.emit(started)).toBe(true);
      expect(c.log).toHaveLength(1);
      expect(c.log[0].i18nKey).toBe('dig.start');
      expectCode(function () { c.emitter.emit({ type: 'bogus', stepId: 'dig', phase: 'start' }); },
        'events.invalidEvent');
    });

    it('setVerbosity changes what is let through from then on', function () {
      var c = collector('off');
      c.emitter.micro('dig', 'dig.try', {}, { highlight: [1] });
      c.emitter.setVerbosity('full');
      expect(c.emitter.wantsMicro).toBe(true);
      c.emitter.micro('dig', 'dig.try', {}, { highlight: [1] });
      c.emitter.setVerbosity('summary');
      expect(c.emitter.wantsMicro).toBe(false);
      c.emitter.micro('dig', 'dig.try', {}, { highlight: [1] });
      expect(c.log).toHaveLength(1);
      expect(c.emitter.verbosity).toBe('summary');
    });

    it('done and error use the pipeline step and the error code as key', function () {
      var c = collector('off');
      c.emitter.done({ attempts: 2 }, { clues: 24 });
      var exceeded = new SG.errors.GenerationError('budget.exceeded', { reason: 'time', limitMs: 5 });
      c.emitter.error('dig', exceeded);
      c.emitter.error('rate', new TypeError('boom'));
      expect(c.log[0].stepId).toBe('pipeline');
      expect(c.log[0].i18nKey).toBe('done');
      expect(c.log[1].stepId).toBe('dig');
      expect(c.log[1].i18nKey).toBe('error.budget.exceeded');
      expect(c.log[1].i18nArgs).toEqual({ reason: 'time', limitMs: 5, code: 'budget.exceeded' });
      expect(c.log[2].i18nKey).toBe('error.unexpected');
      expect(c.log[2].i18nArgs).toEqual({ code: 'unexpected', message: 'boom' });
      c.log.forEach(function (e) { expect(E.eventProblems(e)).toEqual([]); });
    });

    it('every event is plain data: structuredClone and JSON round trips change nothing', function () {
      var c = collector('full');
      emitSampleOf(c.emitter);
      c.emitter.syncBoard('dig', 'dig.restore', {}, Int32Array.from([1, 2, 0, 4]));
      c.log.forEach(function (e) {
        expect(E.eventProblems(e)).toEqual([]);
        expect(JSON.parse(JSON.stringify(e))).toEqual(e);
        if (typeof structuredClone === 'function') expect(structuredClone(e)).toEqual(e);
      });
    });

    it('toEmitter keeps an emitter, wraps a function, and maps nothing to a null emitter', function () {
      var c = collector('summary');
      expect(E.toEmitter(c.emitter)).toBe(c.emitter);
      var seen = [];
      var wrapped = E.toEmitter(function (e) { seen.push(e); });
      expect(wrapped.verbosity).toBe('full');
      wrapped.micro('dig', 'dig.try', {}, { highlight: [2] });
      expect(seen).toHaveLength(1);
      expect(seen[0].seq).toBe(0);
      [null, undefined].forEach(function (nothing) {
        var em = E.toEmitter(nothing);
        expect(em.isEmitter).toBe(true);
        expect(em.wantsMicro).toBe(false);
        expect(function () { em.step('dig', 'start', 'dig.start'); }).not.toThrow();
        expect(em.count).toBe(0);
      });
      expect(E.toEmitter(null)).toBe(E.NULL_EMITTER);
    });

    it('sink errors are not swallowed', function () {
      var em = E.createEmitter('full', function () { throw new RangeError('sink broke'); });
      expect(function () { em.step('dig', 'start', 'dig.start'); }).toThrow(RangeError);
    });
  });

  describe('events: the stage runner', function () {
    it('emits start and end around the step, times it and returns the result', function () {
      var c = collector('off');
      var stage = E.createStageRunner(c.emitter);
      var out = stage('dig', { level: 'easy' }, function (scope) {
        scope.args = { skipped: false };
        scope.metrics = { clues: 30 };
        return 42;
      });
      expect(out).toBe(42);
      expect(c.log.map(function (e) { return e.i18nKey + ':' + e.phase; }))
        .toEqual(['dig.start:start', 'dig.end:end']);
      expect(c.log[0].i18nArgs).toEqual({ level: 'easy' });
      expect(c.log[1].i18nArgs).toEqual({ skipped: false });
      expect(c.log[1].metrics).toEqual({ clues: 30 });
      expect(Object.keys(stage.timings)).toEqual(E.STEP_IDS);
      expect(stage.timings.dig).toBeGreaterThanOrEqual(0);
      expect(stage.current).toBe(null);
    });

    it('adds up the time of a step that runs several times, and keeps the id of a failed step', function () {
      var clock = fakeClock();
      var stage = E.createStageRunner(E.createEmitter('off', null), { now: clock });
      stage('rate', {}, function () { clock.set(clock() + 5); });
      stage('rate', {}, function () { clock.set(clock() + 7); });
      expect(stage.timings.rate).toBe(12);
      expect(function () {
        stage('tune', {}, function () { throw new Error('x'); });
      }).toThrow('x');
      expect(stage.current).toBe('tune');
    });

    it('checks the budget at every step start, so a cancel is noticed at once', function () {
      var budget = SG.budget.create({});
      var stage = E.createStageRunner(E.createEmitter('off', null), { budget: budget });
      var ran = 0;
      stage('configure', {}, function () { ran++; });
      budget.cancel();
      expectCode(function () { stage('buildModel', {}, function () { ran++; }); }, 'budget.cancelled');
      expect(ran).toBe(1);
    });
  });

  describe('events: patches', function () {
    it('makePatch builds a validated delta and defaults the cell state from the value', function () {
      var p = E.makePatch({
        cells: [{ i: 34, value: 7 }, { i: 3, value: 0 }, { i: 5, value: 2, state: 'given' }],
        highlight: [34],
        unhighlight: [12]
      });
      expect(p).toEqual({
        cells: [{ i: 34, value: 7, state: 'placed' }, { i: 3, value: 0, state: 'empty' },
          { i: 5, value: 2, state: 'given' }],
        highlight: [34],
        unhighlight: [12]
      });
      expect(E.makePatch({})).toEqual({});
      expect(E.makePatch({ cells: [], highlight: [] })).toEqual({});
      expect(E.makePatch({ highlight: Int32Array.from([1, 2]) }).highlight).toEqual([1, 2]);
      expect(E.isPlainData(p)).toBe(true);
    });

    it('makePatch enforces the limits that force deltas: at most 8 cells', function () {
      var cells = [];
      for (var i = 0; i < 9; i++) cells.push({ i: i, value: 1 });
      expectCode(function () { E.makePatch({ cells: cells }); }, 'events.invalidPatch');
      expect(E.makePatch({ cells: cells.slice(0, 8) }).cells).toHaveLength(8);
      expectCode(function () { E.makePatch({ highlight: [1, 2, 3, 4, 5], unhighlight: [6, 7, 8, 9] }); },
        'events.invalidPatch');
      expect(function () {
        E.makePatch({ highlight: [1, 2, 3, 4], unhighlight: [5, 6, 7, 8] });
      }).not.toThrow();
    });

    it('makePatch refuses a bad cell index, value or state', function () {
      expectCode(function () { E.makePatch({ cells: [{ i: -1, value: 1 }] }); }, 'events.invalidPatch');
      expectCode(function () { E.makePatch({ cells: [{ i: 1.5, value: 1 }] }); }, 'events.invalidPatch');
      expectCode(function () { E.makePatch({ cells: [{ i: 1, value: -1 }] }); }, 'events.invalidPatch');
      expectCode(function () { E.makePatch({ cells: [{ i: 1, value: 1, state: 'purple' }] }); },
        'events.invalidPatch');
      expectCode(function () { E.makePatch({ highlight: ['a'] }); }, 'events.invalidPatch');
      expectCode(function () { E.makePatch(null); }, 'events.invalidPatch');
    });

    it('applyPatch applies cells, then unhighlight, then highlight', function () {
      var view = E.createView(5);
      E.applyPatch(view, { cells: [{ i: 1, value: 4, state: 'placed' }], highlight: [1, 2] });
      expect(Array.from(view.value)).toEqual([0, 4, 0, 0, 0]);
      expect(view.state[1]).toBe('placed');
      expect(Array.from(view.highlight)).toEqual([0, 1, 1, 0, 0]);
      // A cell in both lists ends up highlighted.
      E.applyPatch(view, { unhighlight: [1, 2], highlight: [2] });
      expect(Array.from(view.highlight)).toEqual([0, 0, 1, 0, 0]);
      expectCode(function () { E.applyPatch(view, { cells: [{ i: 5, value: 1, state: 'placed' }] }); },
        'events.invalidPatch');
      expectCode(function () { E.applyPatch(view, { highlight: [-1] }); }, 'events.invalidPatch');
    });

    /** A random but valid patch over `n` cells. */
    function randomPatch(rng, n) {
      var patch = {};
      var count = rng.int(9);
      if (count > 0) {
        patch.cells = [];
        for (var k = 0; k < count; k++) {
          var value = rng.int(10);
          var state = E.CELL_STATES[rng.int(E.CELL_STATES.length)];
          patch.cells.push({ i: rng.int(n), value: value, state: state });
        }
      }
      var on = rng.int(5);
      var off = rng.int(5);
      if (on > 0) patch.highlight = Array.from({ length: on }, function () { return rng.int(n); });
      if (off > 0) patch.unhighlight = Array.from({ length: off }, function () { return rng.int(n); });
      return patch;
    }

    function randomView(rng, n) {
      var view = E.createView(n);
      for (var c = 0; c < n; c++) {
        view.value[c] = rng.int(10);
        view.state[c] = E.CELL_STATES[rng.int(E.CELL_STATES.length)];
        view.highlight[c] = rng.int(2);
      }
      return view;
    }

    it('invertPatch applied to the post-state restores the pre-state exactly (100 random patches)',
      function () {
        var rng = SG.rng.create(31415);
        for (var round = 0; round < 100; round++) {
          var n = 12 + rng.int(40);
          var before = randomView(rng, n);
          var patch = randomPatch(rng, n);
          expect(E.patchProblems(patch)).toEqual([]);
          var inverse = E.invertPatch(patch, before);
          expect(E.patchProblems(inverse)).toEqual([]);
          var after = E.applyPatch(E.cloneView(before), patch);
          sameView(E.applyPatch(E.cloneView(after), inverse), before);
          // And forwards again: the inverse of the inverse, taken at the post-state, redoes the patch.
          var redo = E.invertPatch(inverse, after);
          sameView(E.applyPatch(E.cloneView(before), redo), after);
        }
      });

    it('invertPatch reads missing state and highlight arrays as empty / placed / not highlighted',
      function () {
        var prev = { value: Int32Array.from([0, 3, 0]) };
        var inverse = E.invertPatch({
          cells: [{ i: 0, value: 5, state: 'placed' }, { i: 1, value: 0, state: 'empty' }],
          highlight: [2]
        }, prev);
        expect(inverse.cells).toEqual([
          { i: 0, value: 0, state: 'empty' }, { i: 1, value: 3, state: 'placed' }
        ]);
        expect(inverse.unhighlight).toEqual([2]);
        expect(inverse.highlight).toBeUndefined();
      });

    it('mergePatches has the net effect of applying the patches one after the other', function () {
      var rng = SG.rng.create(2718);
      for (var round = 0; round < 40; round++) {
        var n = 20;
        var start = randomView(rng, n);
        var patches = [];
        var count = 1 + rng.int(8);
        for (var k = 0; k < count; k++) patches.push(randomPatch(rng, n));
        var one = start;
        patches.forEach(function (p) { one = E.applyPatch(E.cloneView(one), p); });
        sameView(E.applyPatch(E.cloneView(start), E.mergePatches(patches)), one);
      }
    });

    it('splitPatch cuts a large patch into patches within the limits, with the same effect', function () {
      var rng = SG.rng.create(99);
      var n = 60;
      var cells = [];
      for (var i = 0; i < 37; i++) cells.push({ i: i, value: 1 + (i % 9), state: 'placed' });
      var big = {
        cells: cells,
        highlight: Array.from({ length: 20 }, function (v, k) { return k; }),
        unhighlight: [50, 51]
      };
      var pieces = E.splitPatch(big);
      expect(pieces.length).toBeGreaterThan(1);
      pieces.forEach(function (p) { expect(E.patchProblems(p)).toEqual([]); });
      var start = randomView(rng, n);
      var sequential = start;
      pieces.forEach(function (p) { sequential = E.applyPatch(E.cloneView(sequential), p); });
      sameView(sequential, E.applyPatch(E.cloneView(start), big));
      expect(E.splitPatch({})).toEqual([{}]);
    });

    it('cloneView is independent of the original', function () {
      var a = E.createView(3);
      var b = E.cloneView(a);
      E.applyPatch(b, { cells: [{ i: 0, value: 9, state: 'placed' }], highlight: [1] });
      expect(a.value[0]).toBe(0);
      expect(a.highlight[1]).toBe(0);
      expect(a.state[0]).toBe('empty');
    });
  });

  describe('events: board bookkeeping of the emitter', function () {
    it('microChunks sends one event per 8 cells, all with the same key and part / parts', function () {
      var c = collector('full');
      c.emitter.bindBoard(30);
      var changes = [];
      for (var i = 0; i < 19; i++) changes.push({ i: i, value: 1 + (i % 9), state: 'placed' });
      expect(c.emitter.microChunks('fullGrid', 'fullGrid.seed', { count: 19 }, changes)).toBe(3);
      expect(c.log.map(function (e) { return e.patch.cells.length; })).toEqual([8, 8, 3]);
      expect(c.log.map(function (e) { return e.i18nArgs.part; })).toEqual([0, 1, 2]);
      c.log.forEach(function (e) {
        expect(e.i18nKey).toBe('fullGrid.seed');
        expect(e.i18nArgs.parts).toBe(3);
        expect(e.i18nArgs.count).toBe(19);
      });
      // A single chunk carries no part numbers.
      var one = collector('full');
      one.emitter.microChunks('fullGrid', 'fullGrid.place', { cell: 1 }, changes.slice(0, 5));
      expect(one.log[0].i18nArgs).toEqual({ cell: 1 });
      expect(c.emitter.microChunks('dig', 'dig.restore', {}, [])).toBe(0);
    });

    it('the emitter tracks the board that the emitted patches build', function () {
      var c = collector('full');
      c.emitter.bindBoard(10);
      c.emitter.micro('fullGrid', 'fullGrid.place', {}, { cells: [{ i: 2, value: 5, state: 'placed' }] });
      c.emitter.micro('dig', 'dig.try', {}, { highlight: [2] });
      sameView(c.emitter.view, replay(c.log, 10));
      expect(c.emitter.view.value[2]).toBe(5);
      expect(c.emitter.view.highlight[2]).toBe(1);
    });

    it('syncBoard brings the replayed board to the target by patches, or does nothing', function () {
      var c = collector('full');
      var target = new Int32Array(40);
      for (var i = 0; i < 40; i += 2) target[i] = 1 + (i % 9);
      var events = c.emitter.syncBoard('dig', 'dig.restore', { why: 1 }, target);
      expect(events).toBe(3);
      expect(c.log[0].i18nArgs).toEqual({ count: 20, why: 1, part: 0, parts: 3 });
      c.log.forEach(function (e) { expect(E.patchProblems(e.patch)).toEqual([]); });
      expect(Array.from(replay(c.log, 40).value)).toEqual(Array.from(target));
      expect(c.emitter.syncBoard('dig', 'dig.restore', {}, target)).toBe(0);
      var again = target.slice();
      again[0] = 0;
      again[1] = 7;
      expect(c.emitter.syncBoard('dig', 'dig.restore', {}, again)).toBe(1);
      expect(Array.from(replay(c.log, 40).value)).toEqual(Array.from(again));
    });

    it('clearBoard empties what the board still shows', function () {
      var c = collector('full');
      c.emitter.syncBoard('dig', 'dig.restore', {}, Int32Array.from([1, 2, 3, 0, 5]));
      var before = c.log.length;
      expect(c.emitter.clearBoard('fullGrid', 'fullGrid.clear', {})).toBe(1);
      expect(Array.from(replay(c.log, 5).value)).toEqual([0, 0, 0, 0, 0]);
      expect(c.log.length).toBe(before + 1);
      expect(c.emitter.clearBoard('fullGrid', 'fullGrid.clear', {})).toBe(0);
    });

    it('does nothing below verbosity full', function () {
      var c = collector('summary');
      expect(c.emitter.syncBoard('dig', 'dig.restore', {}, Int32Array.from([1, 2]))).toBe(0);
      expect(c.emitter.microChunks('dig', 'dig.restore', {}, [{ i: 0, value: 1, state: 'placed' }])).toBe(0);
      expect(c.log).toHaveLength(0);
    });
  });

  describe('events: trace size limit (design.md 9.4)', function () {
    /** A synthetic trace: steps, many micro events with cell patches and highlights, metrics, a retry. */
    function syntheticTrace(microCount, cells, seed) {
      var rng = SG.rng.create(seed);
      var emitter;
      var log = [];
      emitter = E.createEmitter('full', function (e) { log.push(e); });
      emitter.bindBoard(cells);
      emitter.step('fullGrid', 'start', 'fullGrid.start', {});
      for (var k = 0; k < microCount; k++) {
        if (k === Math.floor(microCount / 3)) {
          emitter.step('fullGrid', 'end', 'fullGrid.end');
          emitter.step('dig', 'start', 'dig.start', {});
        }
        if (k === Math.floor(microCount / 2)) emitter.retry('tune', 'retry.difficulty', { attempt: 1 });
        if (k % 97 === 0) emitter.metric('dig', { clues: k });
        var cell = rng.int(cells);
        var kind = rng.int(3);
        if (kind === 0) {
          emitter.micro('dig', 'dig.try', {}, { highlight: [cell] });
        } else if (kind === 1) {
          var value = rng.int(2) * (1 + rng.int(9));
          emitter.micro('dig', 'dig.accept', {}, {
            cells: [{ i: cell, value: value, state: 'placed' }], unhighlight: [cell]
          });
        } else {
          emitter.micro('dig', 'dig.reject', {}, { unhighlight: [cell] });
        }
      }
      emitter.step('dig', 'end', 'dig.end');
      emitter.done({});
      return log;
    }

    function nonMicro(events) {
      return events.filter(function (e) { return e.type !== 'micro'; });
    }

    it('keeps every step event (and metric, retry, done, error) and thins out the micro events', function () {
      var trace = syntheticTrace(3000, 50, 1);
      var capped = E.capTrace(trace, 500);
      expect(capped.length).toBeLessThan(trace.length);
      expect(capped.length).toBeLessThan(501);
      expect(nonMicro(capped)).toEqual(nonMicro(trace));
      expect(capped.filter(function (e) { return e.type === 'micro'; }).length).toBeGreaterThan(100);
    });

    it('replaying the capped trace ends on exactly the same board as the full one', function () {
      [[3000, 50, 2, 500], [3000, 12, 3, 300], [5000, 81, 4, 1000], [800, 30, 5, 100]].forEach(function (c) {
        var trace = syntheticTrace(c[0], c[1], c[2]);
        var capped = E.capTrace(trace, c[3]);
        sameView(replay(capped, c[1]), replay(trace, c[1]));
        capped.forEach(function (e) { expect(E.eventProblems(e)).toEqual([]); });
      });
    });

    it('keeps the order: seq never decreases and kept events keep their relative order', function () {
      var trace = syntheticTrace(4000, 40, 6);
      var capped = E.capTrace(trace, 400);
      for (var i = 1; i < capped.length; i++) expect(capped[i].seq).toBeGreaterThanOrEqual(capped[i - 1].seq);
      var original = capped.filter(function (e) { return e.i18nKey !== 'trace.coalesced'; });
      for (var k = 1; k < original.length; k++) expect(original[k].seq).toBeGreaterThan(original[k - 1].seq);
    });

    it('spreads the kept micro events evenly over the trace', function () {
      var trace = syntheticTrace(6000, 30, 7);
      var capped = E.capTrace(trace, 600);
      var seqs = capped.filter(function (e) { return e.type === 'micro' && e.i18nKey !== 'trace.coalesced'; })
        .map(function (e) { return e.seq; });
      var total = trace.length;
      var thirds = [0, 0, 0];
      seqs.forEach(function (s) { thirds[Math.min(2, Math.floor(3 * s / total))]++; });
      var most = Math.max.apply(null, thirds);
      var least = Math.min.apply(null, thirds);
      expect(most - least).toBeLessThan(0.15 * seqs.length);
    });

    it('does not touch a trace that fits, and returns a copy', function () {
      var trace = syntheticTrace(200, 20, 8);
      var capped = E.capTrace(trace, 5000);
      expect(capped).toEqual(trace);
      expect(capped).not.toBe(trace);
      expect(E.capTrace(trace, trace.length)).toHaveLength(trace.length);
    });

    it('limits to 20000 events by default and keeps all step events', function () {
      var trace = syntheticTrace(24000, 81, 9);
      expect(trace.length).toBeGreaterThan(20000);
      var capped = E.capTrace(trace);
      expect(capped.length).toBeLessThan(20001);
      expect(nonMicro(capped)).toEqual(nonMicro(trace));
      sameView(replay(capped, 81), replay(trace, 81));
    });

    it('drops every micro event when the step events fill the limit, yet the board is right', function () {
      var trace = syntheticTrace(500, 20, 10);
      var steps = nonMicro(trace).length;
      var capped = E.capTrace(trace, steps);
      expect(nonMicro(capped)).toEqual(nonMicro(trace));
      capped.filter(function (e) { return e.type === 'micro'; }).forEach(function (e) {
        expect(e.i18nKey).toBe('trace.coalesced');
        expect(E.patchProblems(e.patch)).toEqual([]);
      });
      sameView(replay(capped, 20), replay(trace, 20));
    });

    it('capping twice gives a trace that still replays to the same board', function () {
      var trace = syntheticTrace(4000, 36, 11);
      var once = E.capTrace(trace, 800);
      var twice = E.capTrace(once, 200);
      expect(twice.length).toBeLessThan(once.length);
      sameView(replay(twice, 36), replay(trace, 36));
      expect(nonMicro(twice)).toEqual(nonMicro(trace));
    });

    it('synthesized events respect the patch limits and name how many events they replace', function () {
      var trace = syntheticTrace(3000, 60, 12);
      var capped = E.capTrace(trace, 300);
      var folded = capped.filter(function (e) { return e.i18nKey === 'trace.coalesced'; });
      expect(folded.length).toBeGreaterThan(0);
      folded.forEach(function (e) {
        expect(E.patchProblems(e.patch)).toEqual([]);
        expect(e.i18nArgs.dropped).toBeGreaterThan(0);
        expect(e.type).toBe('micro');
      });
    });

    it('rejects a limit below 1', function () {
      expectCode(function () { E.capTrace([], 0); }, 'events.invalidLimit');
      expectCode(function () { E.createTraceBuffer({ maxTraceEvents: 0 }); }, 'events.invalidLimit');
    });

    it('createTraceBuffer keeps a growing trace near the limit, and its replay stays exact', function () {
      var trace = syntheticTrace(8000, 40, 13);
      var buffer = E.createTraceBuffer({ maxTraceEvents: 1000 });
      var biggest = 0;
      trace.forEach(function (e) {
        buffer.push(e);
        biggest = Math.max(biggest, buffer.size);
      });
      expect(biggest).toBeLessThan(1000 + Math.max(64, 250) + 1);
      var kept = buffer.events();
      expect(kept.length).toBeLessThan(1001);
      expect(nonMicro(kept)).toEqual(nonMicro(trace));
      sameView(replay(kept, 40), replay(trace, 40));
      expect(buffer.dropped).toBeGreaterThan(0);
      buffer.clear();
      expect(buffer.size).toBe(0);
      expect(buffer.events()).toEqual([]);
    });

    it('createTraceBuffer defaults to 20000 events', function () {
      var buffer = E.createTraceBuffer();
      var trace = syntheticTrace(21000, 30, 14);
      trace.forEach(function (e) { buffer.push(e); });
      expect(buffer.events().length).toBeLessThan(20001);
      expect(nonMicro(buffer.events())).toEqual(nonMicro(trace));
    });
  });

  describe('events: the vocabulary', function () {
    var V = E.VOCABULARY;

    function sampleEvent(v) {
      var key = v.key === 'error.*' ? 'error.budget.cancelled' : v.key;
      var e = { type: v.type, stepId: v.stepId === '*' ? 'dig' : v.stepId, phase: v.phase };
      if (key !== null) e.i18nKey = key;
      return e;
    }

    it('has no duplicates, valid types, phases, levels and dotted keys', function () {
      var seen = {};
      V.forEach(function (v) {
        var id = [v.type, v.stepId, v.phase, v.key].join('|');
        expect(seen[id]).toBeUndefined();
        seen[id] = true;
        expect(E.TYPES).toContain(v.type);
        expect(E.PHASES).toContain(v.phase);
        expect(E.VERBOSITIES).toContain(v.level);
        expect(v.stepId === '*' || v.stepId === 'pipeline' || E.STEP_IDS.indexOf(v.stepId) !== -1).toBe(true);
        if (v.key !== null) expect(/^[a-z][A-Za-z]*(\.[A-Za-z*]+)+$|^done$/.test(v.key)).toBe(true);
        v.patch.forEach(function (f) { expect(['cells', 'highlight', 'unhighlight']).toContain(f); });
      });
    });

    it('gives every one of the seven steps a start and an end', function () {
      E.STEP_IDS.forEach(function (id) {
        var own = V.filter(function (v) { return v.stepId === id && v.type === 'step'; });
        expect(own.some(function (v) { return v.phase === 'start' && v.key === id + '.start'; })).toBe(true);
        expect(own.some(function (v) { return v.phase === 'end' && v.key === id + '.end'; })).toBe(true);
      });
    });

    it('the level of each entry is what the emitter really does at that verbosity', function () {
      var rank = { off: 0, summary: 1, full: 2 };
      V.forEach(function (v) {
        E.VERBOSITIES.forEach(function (verbosity) {
          var c = collector(verbosity);
          var passed = c.emitter.emit(sampleEvent(v));
          expect(passed).toBe(rank[verbosity] >= rank[v.level]);
        });
      });
    });

    it('the only events at level off are step start / end, done and error', function () {
      V.filter(function (v) { return v.level === 'off'; }).forEach(function (v) {
        var ok = (v.type === 'step' && v.phase !== 'progress') || v.type === 'done' || v.type === 'error';
        expect(ok).toBe(true);
      });
    });

    it('lookup finds the entry of an event, including error codes, and null for strangers', function () {
      function ev(type, stepId, key) {
        return { type: type, stepId: stepId, phase: type === 'error' ? 'end' : 'progress', i18nKey: key };
      }
      expect(E.lookup(ev('micro', 'dig', 'dig.accept')).key).toBe('dig.accept');
      expect(E.lookup(ev('error', 'fullGrid', 'error.fullGrid.unsatisfiable')).key).toBe('error.*');
      expect(E.lookup({ type: 'metric', stepId: 'dig', phase: 'progress' }).level).toBe('summary');
      expect(E.lookup(ev('micro', 'dig', 'dig.nope'))).toBe(null);
      expect(E.lookup(ev('micro', 'rate', 'dig.accept'))).toBe(null);
    });

    it('vocabularyKeys lists each key once, sorted', function () {
      var keys = E.vocabularyKeys();
      expect(keys).toEqual(keys.slice().sort());
      expect(new Set(keys).size).toBe(keys.length);
      ['dig.try', 'dig.accept', 'dig.reject', 'fullGrid.place', 'fullGrid.backtrack', 'retry.difficulty',
        'extraStructure.none', 'trace.coalesced', 'done', 'error.*'].forEach(function (k) {
        expect(keys).toContain(k);
      });
    });
  });

  describe('explain-data: one explanation per pipeline step', function () {
    var X = SG.explain;
    var KEY = /^[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$/;

    it('has all seven steps, each with what / why / how / pseudocode / live', function () {
      expect(X).toBeTruthy();
      expect(Object.keys(X)).toEqual(E.STEP_IDS);
      expect(X.STEP_IDS).toEqual(E.STEP_IDS);
      E.STEP_IDS.forEach(function (id, i) {
        var step = X[id];
        expect(step.stepId).toBe(id);
        expect(step.index).toBe(i + 1);
        expect(step.name).toBe('step.' + id + '.name');
        expect(step.what).toBe('explain.' + id + '.what');
        expect(step.why).toBe('explain.' + id + '.why');
        expect(step.how).toBe('explain.' + id + '.how');
        expect(Array.isArray(step.pseudocode)).toBe(true);
        expect(step.pseudocode.length).toBeGreaterThan(2);
        expect(typeof step.live).toBe('function');
        expect(step.liveKey).toBe('explain.' + id + '.live');
      });
    });

    it('is data only: every string in it is a translation key or a line label, never text', function () {
      E.STEP_IDS.forEach(function (id) {
        var step = X[id];
        var strings = [step.stepId, step.name, step.what, step.why, step.how, step.liveKey];
        step.pseudocode.forEach(function (line) { strings.push(line.label, line.key); });
        Object.keys(step.highlight).forEach(function (k) { strings.push(k, step.highlight[k]); });
        step.liveArgs.forEach(function (a) { strings.push(a); });
        strings.forEach(function (s) {
          expect(typeof s).toBe('string');
          expect(/^[A-Za-z0-9.]+$/.test(s)).toBe(true);
        });
        step.pseudocode.forEach(function (line) { expect(KEY.test(line.key)).toBe(true); });
        [step.name, step.what, step.why, step.how, step.liveKey].forEach(function (k) {
          expect(KEY.test(k)).toBe(true);
        });
      });
    });

    it('the source has no display strings: every string literal is an identifier or a key', function () {
      var env = SG.test.node;
      if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
      var text = env.fs.readFileSync(env.path.join(env.root, 'js/engine/explain-data.js'), 'utf8');
      var code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      var literals = code.match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`[^`]*`/g) || [];
      expect(literals.length).toBeGreaterThan(50);
      literals.forEach(function (lit) {
        var body = lit.slice(1, -1);
        if (body === 'use strict') return;
        if (!/^[A-Za-z0-9._]*$/.test(body)) throw new Error('not a key or identifier: ' + lit);
      });
      // Not a single non-ASCII character: the Vietnamese and English texts belong in the locale packs.
      expect(/[^\x00-\x7f]/.test(text)).toBe(false);
    });

    it('has a pseudocode of uniquely labelled, indented lines whose keys follow the step', function () {
      E.STEP_IDS.forEach(function (id) {
        var labels = {};
        X[id].pseudocode.forEach(function (line) {
          expect(typeof line.label).toBe('string');
          expect(labels[line.label]).toBeUndefined();
          labels[line.label] = true;
          expect(Number.isInteger(line.indent) && line.indent >= 0 && line.indent < 4).toBe(true);
          expect(line.key).toBe('explain.' + id + '.code.' + line.label);
        });
        expect(X[id].pseudocode[0].indent).toBe(0);
      });
    });

    it('highlights real pseudocode lines for real events of its own step', function () {
      var vocabularyKeys = E.vocabularyKeys();
      E.STEP_IDS.forEach(function (id) {
        var labels = X[id].pseudocode.map(function (line) { return line.label; });
        Object.keys(X[id].highlight).forEach(function (eventKey) {
          expect(labels).toContain(X[id].highlight[eventKey]);
          expect(vocabularyKeys).toContain(eventKey);
          expect(X.lineFor(id, eventKey)).toBe(X[id].highlight[eventKey]);
        });
        // Every step highlights at least one line; the lines that no event reaches only explain.
        var used = Object.keys(X[id].highlight).map(function (k) { return X[id].highlight[k]; });
        expect(used.length).toBeGreaterThan(0);
      });
      expect(X.lineFor('dig', 'dig.try')).toBe('try');
      expect(X.lineFor('dig', 'fullGrid.place')).toBe(null);
      expect(X.lineFor('nope', 'dig.try')).toBe(null);
    });

    it('live(metrics) returns the status line key and its arguments', function () {
      var zero = { attempts: 0, accepted: 0, rejected: 0, clues: 0 };
      var r = X.dig.live({ attempts: 41, accepted: 20, rejected: 9, clues: 31, ignored: 5 });
      expect(r).toEqual({
        key: 'explain.dig.live', args: { attempts: 41, accepted: 20, rejected: 9, clues: 31 }
      });
      expect(X.dig.live({}).args).toEqual(zero);
      expect(X.dig.live(undefined).args.clues).toBe(0);
      expect(X.dig.live({ clues: 'x', accepted: NaN }).args).toEqual(zero);
      expect(X.dig.live({ clues: 3 }, 1234).key).toBe('explain.dig.live');
      var sample = { placed: 10, backtracks: 2, restarts: 1, cells: 81, units: 27, clues: 30, score: 120 };
      E.STEP_IDS.forEach(function (id) {
        var out = X[id].live(sample);
        expect(out.key).toBe(X[id].liveKey);
        expect(Object.keys(out.args)).toEqual(X[id].liveArgs);
        expect(E.isPlainData(out)).toBe(true);
      });
      expect(X.fullGrid.live({ placed: 12, backtracks: 3 }).args)
        .toEqual({ placed: 12, backtracks: 3, restarts: 0 });
    });

    it('keys() lists every key once, sorted, and covers names, texts, code lines, status lines', function () {
      var keys = X.keys();
      expect(keys).toEqual(keys.slice().sort());
      expect(new Set(keys).size).toBe(keys.length);
      keys.forEach(function (k) { expect(KEY.test(k)).toBe(true); });
      E.STEP_IDS.forEach(function (id) {
        [X[id].name, X[id].what, X[id].why, X[id].how, X[id].liveKey].forEach(function (k) {
          expect(keys).toContain(k);
        });
        X[id].pseudocode.forEach(function (line) { expect(keys).toContain(line.key); });
      });
      expect(keys.length).toBe(E.STEP_IDS.length * 5 + E.STEP_IDS.reduce(function (n, id) {
        return n + X[id].pseudocode.length;
      }, 0));
    });

    it('get() returns a step, or null for an unknown id', function () {
      expect(X.get('dig')).toBe(X.dig);
      expect(X.get('bogus')).toBe(null);
    });
  });
})();
