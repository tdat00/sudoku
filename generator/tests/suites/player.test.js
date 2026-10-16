// Replay player (task T-4.6, design.md sections 7.3 and 9.4): the pure engine (checkpoints, inverse patches,
// manual stepping, layers) and the thin layer (rAF pacing, board sync, controls) with a fake board, a fake
// clock and a tiny fake DOM, so everything runs on Node. Real traces come from the pipeline.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var E = SG.events;
  var P = SG.player;

  // ---------------------------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------------------------

  var traceCache = {};

  /** A real trace (memoised): `{ events, result }`. */
  function realTrace(variantId, mode, difficulty, seed) {
    var key = [variantId, mode, difficulty, seed].join('/');
    if (!traceCache[key]) {
      var events = [];
      var result = SG.pipeline.run(
        { variantId: variantId, difficulty: difficulty, seed: seed, trace: mode },
        function (e) { events.push(e); });
      traceCache[key] = { events: events, result: result };
    }
    return traceCache[key];
  }

  /** A trace with retries (a second attempt), rejected digs and more events than one checkpoint interval. */
  function hardClassic() {
    return realTrace('classic9', 'full', 'hard', 7);
  }

  function lcg(seed) {
    var s = seed;
    return function () {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /** A synthetic trace of `n` micro events, every one with a patch (so every one is meaningful). */
  function syntheticTrace(n, cells, seed) {
    var rnd = lcg(seed || 1);
    var events = [];
    for (var k = 0; k < n; k++) {
      var r = rnd();
      var cell = Math.floor(rnd() * cells);
      var patch;
      if (r < 0.5) patch = { cells: [{ i: cell, value: 1 + Math.floor(rnd() * 9), state: 'placed' }] };
      else if (r < 0.7) patch = { cells: [{ i: cell, value: 0, state: 'backtracked' }] };
      else if (r < 0.85) patch = { highlight: [cell] };
      else patch = { unhighlight: [cell], cells: [{ i: (cell + 1) % cells, value: 0, state: 'empty' }] };
      events.push({
        type: 'micro', stepId: 'fullGrid', phase: 'progress', t: k, seq: k, i18nKey: 'fullGrid.place',
        patch: patch
      });
    }
    return events;
  }

  function ev(type, stepId, phase, extra, k) {
    var e = { type: type, stepId: stepId, phase: phase, t: k, seq: k };
    Object.keys(extra || {}).forEach(function (key) { e[key] = extra[key]; });
    return e;
  }

  /** The view that applying the first `p` events from scratch gives. */
  function scratch(events, p, cells) {
    var view = E.createView(cells);
    for (var k = 0; k < p; k++) if (events[k].patch) E.applyPatch(view, events[k].patch);
    return view;
  }

  function expectSameView(a, b) {
    expect(Array.from(a.value)).toEqual(Array.from(b.value));
    expect(a.state).toEqual(b.state);
    expect(Array.from(a.highlight)).toEqual(Array.from(b.highlight));
  }

  function median(list) {
    var sorted = list.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.floor(sorted.length / 2)];
  }

  function indexOfStep(events, stepId) {
    for (var k = 0; k < events.length; k++) if (events[k].stepId === stepId) return k;
    return -1;
  }

  /** Fake board: keeps what the real one would show, and logs every call. */
  function fakeBoard(n) {
    var board = {
      n: n,
      values: new Int32Array(n),
      states: new Array(n).fill('empty'),
      probes: new Set(),
      flashes: [],
      layers: {},
      animate: true,
      animateCalls: [],
      givens: null,
      pulses: 0,
      calls: [],
      patchAnimate: [],
      applyPatch: function (patch, opts) {
        board.calls.push('applyPatch');
        board.patchAnimate.push(opts ? opts.animate : undefined);
        (patch.cells || []).forEach(function (c) {
          board.values[c.i] = c.value;
          board.states[c.i] = c.state || (c.value ? 'placed' : 'empty');
        });
        (patch.unhighlight || []).forEach(function (i) { board.probes.delete(i); });
        (patch.highlight || []).forEach(function (i) { board.probes.add(i); });
      },
      setValues: function (values, states) {
        board.calls.push('setValues');
        for (var i = 0; i < n; i++) {
          board.values[i] = values[i] | 0;
          board.states[i] = states ? states[i] : board.values[i] ? 'placed' : 'empty';
        }
      },
      setGivens: function (givens) {
        board.calls.push('setGivens');
        board.givens = givens ? Array.from(givens) : null;
      },
      highlight: function (cells, cls) {
        board.calls.push('highlight');
        Array.prototype.forEach.call(cells, function (i) {
          if (cls === 'cell--probing') board.probes.add(i);
          else board.flashes.push({ cell: i, cls: cls });
        });
      },
      unhighlight: function (cells) {
        Array.prototype.forEach.call(cells, function (i) { board.probes.delete(i); });
      },
      clearHighlights: function () {
        board.calls.push('clearHighlights');
        board.probes.clear();
      },
      setLayerVisible: function (name, flag) { board.layers[name] = flag; },
      isLayerVisible: function (name) { return board.layers[name] !== false; },
      setAnimate: function (flag) {
        board.animate = flag;
        board.animateCalls.push(flag);
      },
      pulseDone: function () { board.pulses++; },
      getState: function () {
        return { values: Int32Array.from(board.values), states: board.states.slice() };
      },
      shows: function (view) {
        expect(Array.from(board.values)).toEqual(Array.from(view.value));
        expect(board.states).toEqual(view.state);
        var lit = [];
        for (var i = 0; i < n; i++) if (view.highlight[i] === 1) lit.push(i);
        expect(Array.from(board.probes).sort(function (a, b) { return a - b; })).toEqual(lit);
      },
      shownLayers: function () {
        return P.LAYER_NAMES.filter(function (name) { return board.layers[name] === true; });
      }
    };
    return board;
  }

  /** A clock and a requestAnimationFrame that the test drives by hand. */
  function fakeLoop() {
    var t = 0;
    var nextId = 0;
    var pending = {};
    var loop = {
      now: function () { return t; },
      raf: function (cb) {
        nextId++;
        pending[nextId] = cb;
        return nextId;
      },
      caf: function (id) { delete pending[id]; },
      pendingCount: function () { return Object.keys(pending).length; },
      pendingCallbacks: function () {
        return Object.keys(pending).map(function (id) { return pending[id]; });
      },
      frame: function (dt) {
        t += dt;
        Object.keys(pending).forEach(function (id) {
          var cb = pending[id];
          delete pending[id];
          if (cb) cb(t);
        });
      },
      run: function (ms, period) {
        var frames = Math.round(ms / period);
        for (var k = 0; k < frames; k++) loop.frame(period);
        return frames * period;
      }
    };
    return loop;
  }

  /** The player with a fake board and clock, and logs of both callbacks. */
  function rig(cells, options) {
    var o = options || {};
    var loop = fakeLoop();
    var board = fakeBoard(cells);
    var positions = [];
    var states = [];
    var player = P.create({
      board: board, now: loop.now, raf: loop.raf, caf: loop.caf, speed: o.speed,
      model: o.model, manageAnimation: o.manageAnimation,
      onPosition: function (info) { positions.push(info); },
      onStateChange: function (s) { states.push(s); }
    });
    return { player: player, board: board, loop: loop, positions: positions, states: states };
  }

  /** Just enough DOM for `bindControls`: elements with attributes, properties and listeners. */
  function fakeEl(name, attrs) {
    var el = {
      name: name,
      attrs: Object.assign({}, attrs || {}),
      listeners: {},
      disabled: false,
      textContent: '',
      value: '0',
      max: '0',
      setAttribute: function (key, value) { el.attrs[key] = String(value); },
      getAttribute: function (key) { return el.attrs[key] === undefined ? null : el.attrs[key]; },
      addEventListener: function (type, fn) { (el.listeners[type] = el.listeners[type] || []).push(fn); },
      removeEventListener: function (type, fn) {
        el.listeners[type] = (el.listeners[type] || []).filter(function (other) { return other !== fn; });
      },
      fire: function (type) {
        (el.listeners[type] || []).slice().forEach(function (fn) { fn({ type: type }); });
      },
      listenerCount: function () {
        return Object.keys(el.listeners).reduce(function (sum, type) {
          return sum + el.listeners[type].length;
        }, 0);
      }
    };
    return el;
  }

  function fakeControls() {
    var els = {
      '#btn-first': fakeEl('first'), '#btn-prev': fakeEl('prev'),
      '#btn-play': fakeEl('play', { 'data-state': 'paused' }), '#btn-next': fakeEl('next'),
      '#btn-last': fakeEl('last'), '#scrubber': fakeEl('scrubber'), '#player-time': fakeEl('time')
    };
    var speeds = P.SPEEDS.map(function (s) {
      return fakeEl('speed-' + s, { 'data-speed': s, 'aria-pressed': 'false' });
    });
    var rootEl = {
      querySelector: function (sel) { return els[sel] || null; },
      querySelectorAll: function (sel) { return sel === '[data-speed]' ? speeds : []; }
    };
    Object.keys(els).forEach(function (sel) { els[sel].disabled = true; });
    var all = Object.keys(els).map(function (k) { return els[k]; }).concat(speeds);
    return { root: rootEl, els: els, speeds: speeds, all: all };
  }

  function inLocale(code, fn) {
    var before = SG.i18n.current;
    SG.i18n.setLocale(code);
    try {
      fn();
    } finally {
      SG.i18n.setLocale(before);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // The meaningful-event rule
  // ---------------------------------------------------------------------------------------------

  describe('player: meaningful events', function () {
    it('skips metrics and micro events without a board change, keeps everything else', function () {
      expect(P.isMeaningful(ev('metric', 'dig', 'progress', { metrics: { clues: 30 } }, 0))).toBe(false);
      expect(P.isMeaningful(ev('micro', 'dig', 'progress', { i18nKey: 'dig.skip' }, 0))).toBe(false);
      expect(P.isMeaningful(ev('micro', 'dig', 'progress', { i18nKey: 'dig.pass.start' }, 0))).toBe(false);
      expect(P.isMeaningful(ev('micro', 'dig', 'progress', { patch: {} }, 0))).toBe(false);
      expect(P.isMeaningful(ev('micro', 'dig', 'progress', { patch: { cells: [] } }, 0))).toBe(false);
      expect(P.isMeaningful(ev('micro', 'dig', 'progress', { patch: { highlight: [3] } }, 0))).toBe(true);
      expect(P.isMeaningful(ev('micro', 'dig', 'progress', { patch: { unhighlight: [3] } }, 0))).toBe(true);
      expect(P.isMeaningful(ev('micro', 'fullGrid', 'progress',
        { patch: { cells: [{ i: 1, value: 4, state: 'placed' }] } }, 0))).toBe(true);
      ['start', 'progress', 'end'].forEach(function (phase) {
        expect(P.isMeaningful(ev('step', 'rate', phase, {}, 0))).toBe(true);
      });
      expect(P.isMeaningful(ev('retry', 'tune', 'progress', {}, 0))).toBe(true);
      expect(P.isMeaningful(ev('done', 'pipeline', 'end', {}, 0))).toBe(true);
      expect(P.isMeaningful(ev('error', 'dig', 'end', {}, 0))).toBe(true);
      expect(P.isMeaningful(null)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Engine: seeking
  // ---------------------------------------------------------------------------------------------

  describe('player engine: seek', function () {
    it('equals applying the first i events from scratch at random positions', function () {
      var t = hardClassic();
      expect(t.events.length).toBeGreaterThan(1500);
      [undefined, 7, 64].forEach(function (every) {
        var engine = P.createEngine(t.events, { cellCount: 81, checkpointEvery: every });
        var rnd = lcg(11);
        for (var k = 0; k < 160; k++) {
          var target = Math.floor(rnd() * (t.events.length + 1));
          expect(engine.seek(target)).toBe(target);
          expect(engine.position).toBe(target);
          expectSameView(engine.view(), scratch(t.events, target, 81));
        }
      });
    });

    it('equals the from-scratch view after short random walks (inverse patches)', function () {
      var t = hardClassic();
      var engine = P.createEngine(t.events, { cellCount: 81 });
      var rnd = lcg(5);
      engine.seek(900);
      for (var k = 0; k < 250; k++) {
        var delta = Math.floor(rnd() * 41) - 20;
        engine.advance(delta);
        expectSameView(engine.view(), scratch(t.events, engine.position, 81));
      }
    });

    it('goes back N and forward N again to exactly where it was', function () {
      var t = hardClassic();
      var engine = P.createEngine(t.events, { cellCount: 81 });
      [3, 50, 499, 500, 501, 1200].forEach(function (n) {
        engine.seek(1700);
        var before = E.cloneView(engine.view());
        engine.advance(-n);
        expect(engine.position).toBe(1700 - n);
        engine.advance(n);
        expect(engine.position).toBe(1700);
        expectSameView(engine.view(), before);
      });
    });

    it('clamps to the trace and ignores a position that is not a number', function () {
      var events = syntheticTrace(30, 81);
      var engine = P.createEngine(events, { cellCount: 81 });
      expect(engine.seek(-5)).toBe(0);
      expect(engine.seek(1e9)).toBe(30);
      expect(engine.seek(NaN)).toBe(30);
      expect(engine.seek(12.9)).toBe(12);
      expect(engine.advance(-100)).toBe(0);
    });

    it('keeps one checkpoint per checkpointEvery events', function () {
      var events = syntheticTrace(1234, 81);
      expect(P.createEngine(events, { cellCount: 81 }).checkpointPositions()).toEqual([0, 500, 1000]);
      expect(P.createEngine(events, { cellCount: 81, checkpointEvery: 250 }).checkpointPositions())
        .toEqual([0, 250, 500, 750, 1000]);
      expect(P.createEngine(events.slice(0, 499), { cellCount: 81 }).checkpointPositions()).toEqual([0]);
      expect(P.createEngine(events.slice(0, 500), { cellCount: 81 }).checkpointPositions()).toEqual([0, 500]);
    });

    it('seeks a 20,000-event trace in well under 100 ms (median) and still equals from scratch', function () {
      var cells = 369;
      var events = syntheticTrace(20000, cells, 3);
      var engine = P.createEngine(events, { cellCount: cells });
      var rnd = lcg(9);
      var times = [];
      for (var k = 0; k < 120; k++) {
        var target = Math.floor(rnd() * (events.length + 1));
        var t0 = Date.now();
        engine.seek(target);
        times.push(Date.now() - t0);
      }
      expect(median(times)).toBeLessThan(100);
      expect(Math.max.apply(null, times)).toBeLessThan(500);
      [0, 1, 499, 500, 9999, 10000, 19999, 20000].forEach(function (target) {
        engine.seek(target);
        expectSameView(engine.view(), scratch(events, target, cells));
      });
    });

    it('ends on exactly the puzzle of the pipeline (result.givens) for full traces', function () {
      [['classic9', 'medium', 7], ['classic6', 'easy', 2], ['killer', 'easy', 3], ['mega12', 'easy', 3],
        ['jigsaw9', 'easy', 3], ['greaterThan', 'easy', 3]].forEach(function (c) {
        var t = realTrace(c[0], 'full', c[1], c[2]);
        var engine = P.createEngine(t.events, { cellCount: t.result.model.cellCount });
        engine.seek(engine.length);
        expect(Array.from(engine.view().value)).toEqual(Array.from(t.result.givens));
        expect(engine.litCells()).toEqual([]);
      });
    });

    it('infers the cell count from the patches when it is not given', function () {
      var events = syntheticTrace(100, 40, 4);
      var engine = P.createEngine(events);
      engine.seek(100);
      expectSameView(engine.view(), scratch(events, 100, engine.cellCount));
      expect(engine.cellCount).toBeLessThan(41);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Engine: manual stepping
  // ---------------------------------------------------------------------------------------------

  describe('player engine: step', function () {
    var cellPatch = { cells: [{ i: 0, value: 3, state: 'placed' }] };
    var small = [
      ev('step', 'dig', 'start', {}, 0),
      ev('metric', 'dig', 'progress', { metrics: { clues: 40 } }, 1),
      ev('micro', 'dig', 'progress', { i18nKey: 'dig.skip' }, 2),
      ev('micro', 'dig', 'progress', { i18nKey: 'dig.try', patch: { highlight: [4] } }, 3),
      ev('metric', 'dig', 'progress', { metrics: { clues: 40 } }, 4),
      ev('metric', 'dig', 'progress', { metrics: { clues: 40 } }, 5),
      ev('micro', 'dig', 'progress', { i18nKey: 'dig.accept', patch: cellPatch }, 6),
      ev('step', 'dig', 'end', {}, 7),
      ev('done', 'pipeline', 'end', {}, 8)
    ];

    it('moves to the position after the next meaningful event, skipping metrics', function () {
      var engine = P.createEngine(small, { cellCount: 9 });
      var visited = [];
      while (engine.position < engine.length) {
        engine.step(1);
        visited.push(engine.position);
      }
      expect(visited).toEqual([1, 4, 7, 8, 9]);
      expect(engine.step(1)).toBe(9);
    });

    it('steps back through the same stops in reverse', function () {
      var engine = P.createEngine(small, { cellCount: 9 });
      engine.seek(9);
      var visited = [];
      while (engine.position > 0) {
        engine.step(-1);
        visited.push(engine.position);
      }
      expect(visited).toEqual([8, 7, 4, 1, 0]);
      expect(engine.step(-1)).toBe(0);
    });

    it('stops at the end even when the trace ends with a metric', function () {
      var events = small.slice(0, 7).concat([ev('metric', 'dig', 'progress', { metrics: {} }, 7)]);
      var engine = P.createEngine(events, { cellCount: 9 });
      engine.seek(4);
      expect(engine.step(1)).toBe(7);
      expect(engine.step(1)).toBe(8);
      expect(engine.step(1)).toBe(8);
    });

    it('steps(count) equals count single steps; a real trace is walked by meaningful events', function () {
      var t = hardClassic();
      var a = P.createEngine(t.events, { cellCount: 81 });
      var b = P.createEngine(t.events, { cellCount: 81 });
      var stops = [0];
      while (a.position < a.length) stops.push(a.step(1));
      var meaningfulCount = t.events.filter(P.isMeaningful).length;
      expect(P.isMeaningful(t.events[t.events.length - 1])).toBe(true);
      expect(stops.length - 1).toBe(meaningfulCount);
      stops.slice(1, -1).forEach(function (p) { expect(P.isMeaningful(t.events[p - 1])).toBe(true); });
      // no metric is ever a landing event, and everything skipped over is not meaningful
      for (var k = 1; k < stops.length; k++) {
        for (var j = stops[k - 1]; j < stops[k] - 1; j++) expect(P.isMeaningful(t.events[j])).toBe(false);
      }
      expect(b.step(1, 37)).toBe(stops[37]);
      expect(b.step(1, 100)).toBe(stops[137]);
    });

    it('back N stops then forward N stops is the identity (position and view)', function () {
      var t = hardClassic();
      var engine = P.createEngine(t.events, { cellCount: 81 });
      engine.step(1, 400);
      var here = engine.position;
      var before = E.cloneView(engine.view());
      for (var n = 0; n < 150; n++) engine.step(-1);
      expectSameView(engine.view(), scratch(t.events, engine.position, 81));
      for (var m = 0; m < 150; m++) engine.step(1);
      expect(engine.position).toBe(here);
      expectSameView(engine.view(), before);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Engine: steps, layers, flashes, metrics
  // ---------------------------------------------------------------------------------------------

  describe('player engine: steps and layers', function () {
    var ALL = P.LAYER_NAMES.slice();
    var BASE = ['regions', 'overlays', 'grid', 'cells'];

    it('finds the first event of each step (full classic9 trace) and the step of a position', function () {
      var t = hardClassic();
      var engine = P.createEngine(t.events, { cellCount: 81 });
      var last = -1;
      E.STEP_IDS.forEach(function (id) {
        var index = engine.stepIndex(id);
        expect(index).toBe(indexOfStep(t.events, id));
        expect(index).toBeGreaterThan(last);
        expect(t.events[index].phase).toBe('start');
        last = index;
      });
      expect(engine.stepIndex('nope')).toBe(-1);
      expect(engine.stepAt(0)).toBeNull();
      for (var p = 1; p <= t.events.length; p += 37) expect(engine.stepAt(p)).toBe(t.events[p - 1].stepId);
      expect(engine.stepAt(t.events.length)).toBe('pipeline');
    });

    it('knows the later runs of a step (a retry starts fullGrid again)', function () {
      var t = hardClassic();
      var engine = P.createEngine(t.events, { cellCount: 81 });
      var starts = [];
      t.events.forEach(function (e, k) {
        if (e.stepId === 'fullGrid' && e.phase === 'start') starts.push(k);
      });
      expect(starts.length).toBeGreaterThan(1);
      expect(engine.stepIndex('fullGrid', 0)).toBe(starts[0]);
      expect(engine.stepIndex('fullGrid', 1)).toBe(starts[1]);
      expect(engine.stepIndex('fullGrid', starts.length)).toBe(-1);
    });

    it('shows no layer before step 2, the base layers from step 2, the extras from step 4', function () {
      var t = hardClassic();
      var engine = P.createEngine(t.events, { cellCount: 81 });
      var build = engine.stepIndex('buildModel');
      var extra = engine.stepIndex('extraStructure');
      expect(engine.layersAt(0)).toEqual([]);
      expect(engine.layersAt(build)).toEqual([]);
      expect(engine.layersAt(build + 1)).toEqual(BASE);
      expect(engine.layersAt(extra)).toEqual(BASE);
      expect(engine.layersAt(extra + 1)).toEqual(ALL);
      expect(engine.layersAt(engine.length)).toEqual(ALL);
    });

    it('draws the cages of a Killer trace only from step 4 on (summary trace)', function () {
      var t = realTrace('killer', 'summary', 'easy', 3);
      var engine = P.createEngine(t.events, { cellCount: t.result.model.cellCount });
      var extra = engine.stepIndex('extraStructure');
      expect(extra).toBeGreaterThan(0);
      expect(engine.layersAt(extra)).not.toContain('cages');
      expect(engine.layersAt(extra)).toContain('cells');
      ['cages', 'ineq', 'word'].forEach(function (name) {
        expect(engine.layersAt(extra + 1)).toContain(name);
        expect(engine.layersAt(extra - 1)).not.toContain(name);
      });
      expect(t.events.some(function (e) { return e.i18nKey === 'extraStructure.built'; })).toBe(true);
    });

    it('works on a Samurai summary trace: steps in order, no patches, everything at the end', function () {
      var t = realTrace('samurai', 'summary', 'easy', 3);
      expect(t.result.config.trace).toBe('summary');
      var engine = P.createEngine(t.events, { cellCount: t.result.model.cellCount });
      var last = -1;
      E.STEP_IDS.forEach(function (id) {
        var index = engine.stepIndex(id);
        expect(index).toBeGreaterThan(last);
        last = index;
      });
      engine.seek(engine.length);
      expect(Array.from(engine.view().value).every(function (v) { return v === 0; })).toBe(true);
      expect(engine.layersAt(engine.length)).toEqual(ALL);
      expect(engine.layersAt(engine.stepIndex('buildModel') + 1)).toEqual(BASE);
    });

    it('waits for the steps of an open trace; a complete one that lacks them shows all', function () {
      var open = P.createEngine([], { cellCount: 9, complete: false });
      open.push(ev('step', 'configure', 'start', {}, 0));
      expect(open.layersAt(1)).toEqual([]);
      open.push(ev('step', 'buildModel', 'start', {}, 1));
      expect(open.layersAt(2)).toEqual(BASE);
      expect(open.layersAt(open.length)).toEqual(BASE);
      open.finish();
      expect(open.layersAt(open.length)).toEqual(ALL);
      var bare = P.createEngine(syntheticTrace(10, 9), { cellCount: 9 });
      expect(bare.layersAt(3)).toEqual(ALL);
      expect(P.createEngine([], { cellCount: 9 }).layersAt(0)).toEqual([]);
    });

    it('describes the one-shot effect of an event (done by the board or by the player)', function () {
      var t = realTrace('classic9', 'full', 'medium', 7);
      var engine = P.createEngine(t.events, { cellCount: 81 });
      function first(key) {
        for (var k = 0; k < t.events.length; k++) if (t.events[k].i18nKey === key) return k;
        return -1;
      }
      var reject = engine.highlightFlash(first('dig.reject'));
      expect(reject.cls).toBe('cell--restored');
      expect(reject.auto).toBe(false);
      expect(reject.cells).toEqual(t.events[first('dig.reject')].i18nArgs.cells);
      var accept = engine.highlightFlash(first('dig.accept'));
      expect(accept.cls).toBe('cell--removed');
      expect(accept.auto).toBe(true);
      expect(accept.cells).toEqual(t.events[first('dig.accept')].i18nArgs.cells);
      expect(engine.highlightFlash(first('dig.try')).cls).toBe('cell--probing');
      expect(engine.highlightFlash(first('fullGrid.place'))).toBeNull();
      expect(engine.highlightFlash(-1)).toBeNull();
      var back = P.createEngine([
        ev('micro', 'fullGrid', 'progress', { i18nKey: 'fullGrid.conflict',
          patch: { cells: [{ i: 5, value: 0, state: 'backtracked' }] } }, 0),
        ev('micro', 'fullGrid', 'progress', { i18nKey: 'fullGrid.backtrack',
          patch: { cells: [{ i: 6, value: 0, state: 'backtracked' },
            { i: 7, value: 0, state: 'backtracked' }] } }, 1)
      ], { cellCount: 9 });
      expect(back.highlightFlash(0)).toEqual({ cls: 'cell--backtrack', cells: [5], auto: true });
      expect(back.highlightFlash(1)).toEqual({ cls: 'cell--backtrack', cells: [6, 7], auto: true });
    });

    it('carries the latest metrics of the current step, never those of an earlier step', function () {
      var t = hardClassic();
      var engine = P.createEngine(t.events, { cellCount: 81 });
      for (var p = 0; p <= t.events.length; p++) {
        var expected = null;
        for (var k = p - 1; k >= 0 && t.events[k].stepId === t.events[p - 1].stepId; k--) {
          if (t.events[k].metrics) {
            expected = t.events[k].metrics;
            break;
          }
        }
        expect(engine.metricsAt(p)).toBe(expected);
      }
    });

    it('maps a seq to a position, also in a capped trace that repeats a seq', function () {
      var t = hardClassic();
      var capped = E.capTrace(t.events, 400);
      [t.events, capped].forEach(function (events) {
        var engine = P.createEngine(events, { cellCount: 81 });
        [-1, 0, 1, 57, 120, 399, 1000, 1e9].forEach(function (seq) {
          var expected = events.filter(function (e) { return e.seq <= seq; }).length;
          expect(engine.positionOfSeq(seq)).toBe(expected);
        });
      });
    });

    it('reports the time of the current event and of the whole trace', function () {
      var t = hardClassic();
      var engine = P.createEngine(t.events, { cellCount: 81 });
      expect(engine.timeAt(0)).toBe(0);
      expect(engine.timeAt(100)).toBe(t.events[99].t);
      expect(engine.totalTime()).toBe(t.events[t.events.length - 1].t);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Engine: streaming
  // ---------------------------------------------------------------------------------------------

  describe('player engine: streaming', function () {
    it('builds the same engine by push as by loading the whole trace', function () {
      var t = hardClassic();
      var loaded = P.createEngine(t.events, { cellCount: 81 });
      var streamed = P.createEngine([], { cellCount: 81, complete: false });
      expect(streamed.complete).toBe(false);
      t.events.forEach(function (e) { streamed.push(e); });
      expect(streamed.length).toBe(t.events.length);
      streamed.finish();
      expect(streamed.complete).toBe(true);
      expect(streamed.checkpointPositions()).toEqual(loaded.checkpointPositions());
      var rnd = lcg(21);
      for (var k = 0; k < 60; k++) {
        var target = Math.floor(rnd() * (t.events.length + 1));
        streamed.seek(target);
        loaded.seek(target);
        expectSameView(streamed.view(), loaded.view());
        expect(streamed.layersAt(target)).toEqual(loaded.layersAt(target));
        expect(streamed.metricsAt(target)).toBe(loaded.metricsAt(target));
      }
      E.STEP_IDS.forEach(function (id) { expect(streamed.stepIndex(id)).toBe(loaded.stepIndex(id)); });
      streamed.step(-1, 3);
      loaded.step(-1, 3);
      expect(streamed.position).toBe(loaded.position);
    });

    it('can be moved while it is still receiving events, and refuses events once complete', function () {
      var events = syntheticTrace(1200, 81, 8);
      var engine = P.createEngine([], { cellCount: 81, complete: false });
      events.slice(0, 700).forEach(function (e) { engine.push(e); });
      engine.seek(650);
      expectSameView(engine.view(), scratch(events, 650, 81));
      events.slice(700).forEach(function (e) { engine.push(e); });
      engine.seek(1100);
      expectSameView(engine.view(), scratch(events, 1100, 81));
      engine.finish();
      expect(function () { engine.push(events[0]); }).toThrow();
      expect(function () { P.createEngine(events, { cellCount: 81 }).push(events[0]); }).toThrow();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Player: pacing, speeds, control flow
  // ---------------------------------------------------------------------------------------------

  describe('player: pacing', function () {
    it('plays fast at about 200 events per second whatever the frame rate', function () {
      var events = syntheticTrace(5000, 81, 2);
      [4, 16, 33, 100].forEach(function (period) {
        var r = rig(81, { speed: 'fast' });
        r.player.load(events, { autoplay: false });
        r.player.play();
        var ms = r.loop.run(2000, period);
        var expected = Math.floor(ms * 200 / 1000);
        expect(Math.abs(r.player.state().position - expected)).toBeLessThanOrEqual(1);
        r.board.shows(scratch(events, r.player.state().position, 81));
        r.player.destroy();
      });
    });

    it('plays step at about 8 events per second whatever the frame rate', function () {
      var events = syntheticTrace(500, 81, 2);
      [16, 50, 125, 250].forEach(function (period) {
        var r = rig(81, { speed: 'step' });
        r.player.load(events, { autoplay: false });
        r.player.play();
        var ms = r.loop.run(5000, period);
        var expected = Math.floor(ms * 8 / 1000);
        expect(Math.abs(r.player.state().position - expected)).toBeLessThanOrEqual(1);
        r.player.destroy();
      });
    });

    it('counts meaningful events, so a metric does not cost a tick', function () {
      var t = hardClassic();
      var r = rig(81, { speed: 'step' });
      r.player.load(t.events, { autoplay: false });
      var reference = P.createEngine(t.events, { cellCount: 81 });
      var stops = [0];
      for (var k = 0; k < 40; k++) stops.push(reference.step(1));
      r.player.play();
      r.loop.run(3000, 20);
      var ticks = stops.indexOf(r.player.state().position);
      expect(ticks).toBeGreaterThanOrEqual(23);
      expect(ticks).toBeLessThanOrEqual(25);
      r.board.shows(scratch(t.events, r.player.state().position, 81));
      r.player.destroy();
    });

    it('caps the events per frame, and a long gap counts as one second', function () {
      var events = syntheticTrace(3000, 81, 2);
      var r = rig(81, { speed: 'fast' });
      r.player.load(events, { autoplay: false });
      r.player.play();
      r.loop.frame(60 * 1000);
      expect(r.player.state().position).toBeLessThanOrEqual(P.MAX_TICKS_PER_FRAME);
      expect(r.player.state().position).toBeGreaterThan(0);
      var before = r.player.state().position;
      r.loop.frame(16);
      expect(r.player.state().position - before).toBeLessThanOrEqual(4);
      r.player.destroy();
    });

    it('jumps to the end at once in instant mode, without animation; buttons still work', function () {
      var t = realTrace('classic9', 'full', 'medium', 7);
      var r = rig(81, { speed: 'instant' });
      r.player.load(t.events, { givens: t.result.givens });
      var s = r.player.state();
      expect(s.position).toBe(t.events.length);
      expect(s.playing).toBe(false);
      expect(s.finished).toBe(true);
      expect(r.loop.pendingCount()).toBe(0);
      expect(Array.from(r.board.values)).toEqual(Array.from(t.result.givens));
      expect(r.board.givens).toEqual(Array.from(t.result.givens));
      expect(r.board.pulses).toBe(0);
      expect(r.board.patchAnimate.every(function (a) { return a === false; })).toBe(true);
      r.player.prev();
      expect(r.player.state().position).toBeLessThan(t.events.length);
      expect(r.board.givens).toBeNull();
      r.board.shows(scratch(t.events, r.player.state().position, 81));
      r.player.first();
      expect(r.player.state().position).toBe(0);
      r.board.shows(scratch(t.events, 0, 81));
      r.player.last();
      expect(r.player.state().position).toBe(t.events.length);
      expect(Array.from(r.board.values)).toEqual(Array.from(t.result.givens));
      r.player.play();
      expect(r.player.state().position).toBe(t.events.length);
      expect(r.loop.pendingCount()).toBe(0);
    });

    it('waits in manual mode and advances exactly one meaningful event per next', function () {
      var t = hardClassic();
      var r = rig(81, { speed: 'manual' });
      r.player.load(t.events);
      expect(r.player.state().position).toBe(0);
      expect(r.player.state().playing).toBe(false);
      expect(r.loop.pendingCount()).toBe(0);
      r.loop.frame(5000);
      expect(r.player.state().position).toBe(0);
      var reference = P.createEngine(t.events, { cellCount: 81 });
      for (var k = 0; k < 120; k++) {
        var before = r.player.state().position;
        r.player.next();
        var after = r.player.state().position;
        expect(after).toBe(reference.step(1));
        expect(P.isMeaningful(t.events[after - 1])).toBe(true);
        for (var j = before; j < after - 1; j++) expect(P.isMeaningful(t.events[j])).toBe(false);
        r.board.shows(scratch(t.events, after, 81));
        expect(r.positions[r.positions.length - 1].direction).toBe('forward');
      }
      for (var b = 0; b < 60; b++) {
        r.player.prev();
        expect(r.player.state().position).toBe(reference.step(-1));
        r.board.shows(scratch(t.events, r.player.state().position, 81));
        expect(r.positions[r.positions.length - 1].direction).toBe('backward');
      }
      r.player.play();
      expect(r.player.state().playing).toBe(false);
      expect(r.player.state().position).toBe(reference.step(1));
    });

    it('pauses at the end, pulses the board once and replays from the start on the next play', function () {
      var events = syntheticTrace(60, 81, 6);
      events.push(ev('done', 'pipeline', 'end', {}, 60));
      var r = rig(81, { speed: 'fast' });
      r.player.load(events);
      expect(r.player.state().playing).toBe(true);
      r.loop.run(1000, 16);
      var s = r.player.state();
      expect(s.position).toBe(61);
      expect(s.playing).toBe(false);
      expect(s.finished).toBe(true);
      expect(r.board.pulses).toBe(1);
      expect(r.loop.pendingCount()).toBe(0);
      expect(r.states[r.states.length - 1].playing).toBe(false);
      expect(r.positions[r.positions.length - 1].event.type).toBe('done');
      r.player.play();
      expect(r.player.state().position).toBe(0);
      expect(r.player.state().playing).toBe(true);
      r.board.shows(scratch(events, 0, 81));
      r.player.destroy();
    });

    it('pauses and resumes where it stopped, without catching up on the pause', function () {
      var events = syntheticTrace(3000, 81, 2);
      var r = rig(81, { speed: 'fast' });
      r.player.load(events);
      r.loop.run(500, 16);
      r.player.pause();
      var stopped = r.player.state().position;
      expect(r.player.state().playing).toBe(false);
      expect(r.loop.pendingCount()).toBe(0);
      r.loop.frame(10000);
      expect(r.player.state().position).toBe(stopped);
      r.player.play();
      r.loop.frame(16);
      expect(r.player.state().position - stopped).toBeLessThanOrEqual(5);
      r.player.toggle();
      expect(r.player.state().playing).toBe(false);
      r.player.toggle();
      expect(r.player.state().playing).toBe(true);
      r.player.destroy();
    });

    it('seeks anywhere and the board matches the from-scratch view, also after stepping back', function () {
      var t = hardClassic();
      var r = rig(81, { speed: 'manual' });
      r.player.load(t.events);
      var rnd = lcg(31);
      for (var k = 0; k < 80; k++) {
        var target = Math.floor(rnd() * (t.events.length + 1));
        r.player.seek(target);
        expect(r.player.state().position).toBe(target);
        r.board.shows(scratch(t.events, target, 81));
        if (k % 3 === 0) {
          r.player.prev();
          r.board.shows(scratch(t.events, r.player.state().position, 81));
        }
      }
      r.player.seek(5);
      expect(r.positions[r.positions.length - 1].direction).toBe('seek');
    });

    it('flashes a rejected dig red, which the board does not do by itself', function () {
      var t = realTrace('classic9', 'full', 'medium', 7);
      var r = rig(81, { speed: 'manual' });
      r.player.load(t.events);
      var rejectAt = -1;
      t.events.forEach(function (e, k) { if (rejectAt < 0 && e.i18nKey === 'dig.reject') rejectAt = k; });
      r.player.seek(rejectAt);
      expect(r.board.flashes).toEqual([]);
      r.player.next();
      expect(r.player.state().position).toBe(rejectAt + 1);
      expect(r.board.flashes.map(function (f) { return f.cls; }))
        .toEqual(['cell--restored', 'cell--restored']);
      expect(r.board.flashes.map(function (f) { return f.cell; })).toEqual(t.events[rejectAt].i18nArgs.cells);
    });

    it('reports each change of the position with event, step, phase, direction, metrics', function () {
      var t = hardClassic();
      var r = rig(81, { speed: 'manual' });
      r.player.load(t.events);
      var first = r.positions[r.positions.length - 1];
      expect(first.position).toBe(0);
      expect(first.event).toBeNull();
      expect(first.stepId).toBeNull();
      expect(first.length).toBe(t.events.length);
      r.positions.length = 0;
      r.player.seek(300);
      expect(r.positions).toHaveLength(1);
      var info = r.positions[0];
      expect(info.position).toBe(300);
      expect(info.event).toBe(t.events[299]);
      expect(info.stepId).toBe(t.events[299].stepId);
      expect(info.phase).toBe(t.events[299].phase);
      expect(info.direction).toBe('seek');
      expect(info.metrics).toBe(r.player.engine.metricsAt(300));
      r.player.seek(300);
      expect(r.positions).toHaveLength(1);
    });

    it('applies the layers of the position to the board (cages from step 4 on)', function () {
      var t = realTrace('killer', 'summary', 'easy', 3);
      var r = rig(t.result.model.cellCount, { speed: 'manual' });
      r.player.load(t.events);
      expect(r.board.shownLayers()).toEqual([]);
      r.player.seekToStep('buildModel');
      expect(r.board.shownLayers()).toEqual(['regions', 'overlays', 'grid', 'cells']);
      r.player.seekToStep('extraStructure');
      expect(r.board.shownLayers()).toEqual(P.LAYER_NAMES);
      expect(r.positions[r.positions.length - 1].stepId).toBe('extraStructure');
      r.player.seek(r.player.engine.stepIndex('extraStructure'));
      expect(r.board.layers.cages).toBe(false);
      r.player.last();
      expect(r.board.shownLayers()).toEqual(P.LAYER_NAMES);
      r.player.first();
      expect(r.board.shownLayers()).toEqual([]);
    });

    it('seeks to a step and to a seq', function () {
      var t = hardClassic();
      var r = rig(81, { speed: 'manual' });
      r.player.load(t.events);
      expect(r.player.seekToStep('dig')).toBe(true);
      expect(r.player.state().position).toBe(indexOfStep(t.events, 'dig') + 1);
      expect(r.player.engine.stepAt(r.player.state().position)).toBe('dig');
      r.board.shows(scratch(t.events, r.player.state().position, 81));
      expect(r.player.seekToStep('dig', 1)).toBe(true);
      expect(r.player.state().position).toBe(r.player.engine.stepIndex('dig', 1) + 1);
      expect(r.player.seekToStep('nope')).toBe(false);
      r.player.seekToSeq(120);
      expect(r.player.state().position).toBe(121);
    });

    it('changes the speed: instant jumps to the end, manual pauses, unknown is ignored', function () {
      var events = syntheticTrace(2000, 81, 2);
      var r = rig(81, { speed: 'fast' });
      r.player.load(events);
      r.loop.run(200, 16);
      expect(r.player.state().playing).toBe(true);
      expect(r.board.animate).toBe(false);
      r.player.setSpeed('step');
      expect(r.player.getSpeed()).toBe('step');
      expect(r.player.state().playing).toBe(true);
      expect(r.board.animate).toBe(true);
      r.player.setSpeed('manual');
      expect(r.player.state().playing).toBe(false);
      expect(r.loop.pendingCount()).toBe(0);
      expect(r.player.setSpeed('warp')).toBe('manual');
      r.player.setSpeed('instant');
      expect(r.player.state().position).toBe(2000);
      expect(r.player.state().playing).toBe(false);
      expect(r.board.pulses).toBe(0);
      r.board.shows(scratch(events, 2000, 81));
      expect(r.states[r.states.length - 1].speed).toBe('instant');
    });

    it('switches the board animation off only while playing fast, and not at all on request', function () {
      var events = syntheticTrace(2000, 81, 2);
      var r = rig(81, { speed: 'manual' });
      r.player.load(events);
      r.player.next();
      r.player.setSpeed('fast');
      r.player.play();
      expect(r.board.animateCalls).toEqual([false]);
      r.player.pause();
      expect(r.board.animateCalls).toEqual([false, true]);
      r.player.destroy();
      expect(r.board.animateCalls).toEqual([false, true]);
      var quiet = rig(81, { speed: 'fast', manageAnimation: false });
      quiet.player.load(events);
      quiet.loop.run(200, 16);
      quiet.player.pause();
      quiet.player.destroy();
      expect(quiet.board.animateCalls).toEqual([]);
    });

    it('does not stay "playing" when the board throws inside a frame', function () {
      var events = syntheticTrace(500, 81, 2);
      var r = rig(81, { speed: 'fast' });
      r.player.load(events);
      r.board.applyPatch = function () { throw new Error('board is broken'); };
      expect(function () { r.loop.frame(100); }).toThrow('board is broken');
      expect(r.player.state().playing).toBe(false);
      expect(r.loop.pendingCount()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Player: sessions
  // ---------------------------------------------------------------------------------------------

  describe('player: sessions', function () {
    it('cancels the old replay cleanly on load: no stale frame ever fires again', function () {
      var a = syntheticTrace(3000, 81, 1);
      var b = syntheticTrace(40, 81, 2);
      var r = rig(81, { speed: 'fast' });
      r.player.load(a);
      r.loop.run(300, 16);
      var stale = r.loop.pendingCallbacks();
      expect(stale).toHaveLength(1);
      var oldPosition = r.player.state().position;
      expect(oldPosition).toBeGreaterThan(20);
      r.player.load(b, { autoplay: false });
      expect(r.loop.pendingCount()).toBe(0);
      var count = r.positions.length;
      var calls = r.board.calls.length;
      stale.forEach(function (cb) { cb(99999); });
      expect(r.positions.length).toBe(count);
      expect(r.board.calls.length).toBe(calls);
      expect(r.player.state()).toEqual({
        position: 0, length: 40, playing: false, speed: 'fast', finished: false, complete: true
      });
      r.board.shows(scratch(b, 0, 81));
      expect(r.positions[r.positions.length - 1].length).toBe(40);
      r.player.play();
      r.loop.run(1000, 16);
      expect(r.player.state().position).toBe(40);
      r.board.shows(scratch(b, 40, 81));
      r.player.destroy();
    });

    it('applies nothing of the old trace when a load comes inside a frame callback', function () {
      var a = syntheticTrace(3000, 81, 1);
      var b = syntheticTrace(30, 81, 2);
      var loop = fakeLoop();
      var board = fakeBoard(81);
      var player = null;
      var reloaded = false;
      player = P.create({
        board: board, now: loop.now, raf: loop.raf, caf: loop.caf, speed: 'fast',
        onPosition: function (info) {
          if (info.position > 10 && !reloaded) {
            reloaded = true;
            player.load(b, { autoplay: false });
          }
        }
      });
      player.load(a);
      loop.run(300, 16);
      expect(reloaded).toBe(true);
      expect(player.state().length).toBe(30);
      expect(player.state().playing).toBe(false);
      expect(loop.pendingCount()).toBe(0);
      board.shows(scratch(b, player.state().position, 81));
      player.destroy();
    });

    it('resets: loop cancelled, buffer dropped, board blank with the layers of position 0', function () {
      var t = realTrace('killer', 'full', 'easy', 3);
      var r = rig(t.result.model.cellCount, { speed: 'fast' });
      r.player.load(t.events, { givens: t.result.givens });
      r.loop.run(2000, 16);
      expect(r.player.state().position).toBeGreaterThan(30);
      r.player.reset();
      expect(r.loop.pendingCount()).toBe(0);
      expect(r.player.state()).toEqual({
        position: 0, length: 0, playing: false, speed: 'fast', finished: false, complete: false
      });
      expect(Array.from(r.board.values).every(function (v) { return v === 0; })).toBe(true);
      expect(r.board.probes.size).toBe(0);
      expect(r.board.shownLayers()).toEqual([]);
      expect(r.board.givens).toBeNull();
      var last = r.positions[r.positions.length - 1];
      expect(last.position).toBe(0);
      expect(last.event).toBeNull();
      expect(last.length).toBe(0);
      r.loop.frame(5000);
      expect(r.player.state().position).toBe(0);
      r.player.next();
      r.player.seek(10);
      expect(r.player.state().position).toBe(0);
      expect(r.player.engine).toBeNull();
    });

    it('destroys: nothing runs any more, the board is given back with every layer visible', function () {
      var events = syntheticTrace(3000, 81, 1);
      var r = rig(81, { speed: 'fast' });
      r.player.load(events);
      r.loop.run(100, 16);
      var stale = r.loop.pendingCallbacks();
      r.player.destroy();
      expect(r.loop.pendingCount()).toBe(0);
      var count = r.positions.length;
      stale.forEach(function (cb) { cb(1); });
      r.player.load(events);
      r.player.play();
      r.player.next();
      expect(r.positions.length).toBe(count);
      expect(r.loop.pendingCount()).toBe(0);
      expect(r.board.shownLayers()).toEqual(P.LAYER_NAMES);
      expect(r.board.animate).toBe(true);
      r.player.destroy();
    });

    it('buffers pushed events silently and replays from the start on finish', function () {
      var t = realTrace('classic9', 'full', 'medium', 7);
      var r = rig(81, { speed: 'instant' });
      t.events.forEach(function (e) { r.player.push(e); });
      expect(r.positions.filter(function (p) { return p.position > 0; })).toHaveLength(0);
      expect(r.player.state().position).toBe(0);
      expect(r.player.state().complete).toBe(false);
      expect(r.board.shownLayers()).toEqual([]);
      expect(Array.from(r.board.values).every(function (v) { return v === 0; })).toBe(true);
      r.player.finish({ givens: t.result.givens });
      expect(r.player.state().position).toBe(t.events.length);
      expect(r.player.state().complete).toBe(true);
      var loaded = rig(81, { speed: 'instant' });
      loaded.player.load(t.events, { givens: t.result.givens });
      expect(Array.from(r.board.values)).toEqual(Array.from(loaded.board.values));
      expect(r.board.shownLayers()).toEqual(loaded.board.shownLayers());
      expect(Array.from(r.board.values)).toEqual(Array.from(t.result.givens));
    });

    it('follows the buffer live when play comes before finish, and ends with the trace', function () {
      var events = syntheticTrace(400, 81, 5);
      var r = rig(81, { speed: 'fast' });
      events.slice(0, 100).forEach(function (e) { r.player.push(e); });
      r.player.play();
      r.loop.run(2000, 16);
      expect(r.player.state().position).toBe(100);
      expect(r.player.state().playing).toBe(true);
      expect(r.player.state().finished).toBe(false);
      expect(r.board.pulses).toBe(0);
      events.slice(100).forEach(function (e) { r.player.push(e); });
      r.player.finish();
      r.loop.run(3000, 16);
      expect(r.player.state().position).toBe(400);
      expect(r.player.state().finished).toBe(true);
      expect(r.player.state().playing).toBe(false);
      expect(r.board.pulses).toBe(1);
      r.board.shows(scratch(events, 400, 81));
    });

    it('works without a board when it is told the cell count', function () {
      var events = syntheticTrace(120, 81, 3);
      var positions = [];
      var player = P.create({
        cellCount: 81, speed: 'instant', onPosition: function (info) { positions.push(info.position); }
      });
      events.forEach(function (e) { player.push(e); });
      player.finish();
      expect(player.state().position).toBe(120);
      expectSameView(player.engine.view(), scratch(events, 120, 81));
      expect(positions[positions.length - 1]).toBe(120);
      player.destroy();
    });

    it('follows the buffer in instant mode and ends on the finished trace without a pulse', function () {
      var events = syntheticTrace(150, 81, 9);
      var r = rig(81, { speed: 'instant' });
      events.slice(0, 100).forEach(function (e) { r.player.push(e); });
      r.player.play();
      expect(r.player.state().position).toBe(100);
      expect(r.player.state().playing).toBe(true);
      events.slice(100).forEach(function (e) { r.player.push(e); });
      r.loop.frame(16);
      expect(r.player.state().position).toBe(150);
      r.player.finish();
      r.loop.frame(16);
      expect(r.player.state().playing).toBe(false);
      expect(r.player.state().finished).toBe(true);
      expect(r.board.pulses).toBe(0);
      r.board.shows(scratch(events, 150, 81));
    });

    it('starts a new session when an event arrives after the trace was completed', function () {
      var events = syntheticTrace(50, 81, 7);
      var r = rig(81, { speed: 'manual' });
      r.player.load(events);
      r.player.last();
      expect(r.player.state().position).toBe(50);
      r.player.push(events[0]);
      expect(r.player.state().length).toBe(1);
      expect(r.player.state().position).toBe(0);
      expect(r.player.state().complete).toBe(false);
      expect(Array.from(r.board.values).every(function (v) { return v === 0; })).toBe(true);
      r.player.finish();
      expect(r.player.state().complete).toBe(true);
      expect(r.player.state().length).toBe(1);
    });

    it('shows the result at the end of a trace without digits, the replayed view elsewhere', function () {
      var t = realTrace('killer', 'summary', 'easy', 3);
      var cells = t.result.model.cellCount;
      var r = rig(cells, { speed: 'manual' });
      r.player.load(t.events, { givens: t.result.givens });
      r.player.last();
      expect(Array.from(r.board.values)).toEqual(Array.from(t.result.givens));
      expect(r.board.givens).toEqual(Array.from(t.result.givens));
      r.player.prev();
      expect(r.board.givens).toBeNull();
      expect(Array.from(r.board.values).every(function (v) { return v === 0; })).toBe(true);
      r.player.first();
      expect(Array.from(r.board.values).every(function (v) { return v === 0; })).toBe(true);
    });

    it('rejects a trace with a patch outside the board and leaves the player reset', function () {
      var r = rig(9, { speed: 'manual' });
      var bad = syntheticTrace(5, 81, 3);
      bad.push(ev('micro', 'dig', 'progress',
        { patch: { cells: [{ i: 80, value: 1, state: 'placed' }] } }, 5));
      expect(function () { r.player.load(bad); }).toThrow();
      expect(r.player.state().length).toBe(0);
      expect(r.loop.pendingCount()).toBe(0);
    });

    it('describes the current event in the current language, naming cells with the model', function () {
      var t = realTrace('classic9', 'full', 'medium', 7);
      var r = rig(81, { speed: 'manual', model: t.result.model });
      r.player.load(t.events);
      expect(r.player.describe()).toEqual({ text: '', key: null, args: {} });
      var tryAt = -1;
      t.events.forEach(function (e, k) { if (tryAt < 0 && e.i18nKey === 'dig.try') tryAt = k; });
      var d = r.player.describe(tryAt + 1);
      expect(d.key).toBe('dig.try');
      expect(d.args).toBe(t.events[tryAt].i18nArgs);
      expect(d.text).toMatch(/R\d+C\d+/);
      var vi = '';
      inLocale('vi', function () { vi = r.player.describe(tryAt + 1).text; });
      expect(vi).not.toBe(d.text);
      var metricAt = -1;
      t.events.forEach(function (e, k) { if (metricAt < 0 && e.type === 'metric') metricAt = k; });
      expect(r.player.describe(metricAt + 1).key).toBe(t.events[metricAt - 1].i18nKey);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Player: the controls (fake DOM)
  // ---------------------------------------------------------------------------------------------

  describe('player: controls', function () {
    it('is disabled while nothing is loaded, with the default speed pressed', function () {
      var r = rig(81);
      var dom = fakeControls();
      r.player.bindControls(dom.root);
      ['#btn-first', '#btn-prev', '#btn-play', '#btn-next', '#btn-last', '#scrubber'].forEach(function (sel) {
        expect(dom.els[sel].disabled).toBe(true);
      });
      expect(dom.speeds.map(function (el) { return el.attrs['aria-pressed']; }))
        .toEqual(['false', 'true', 'false', 'false']);
      expect(dom.els['#player-time'].textContent).toBe('');
      expect(dom.els['#btn-play'].attrs['aria-label']).toBe('Play');
      r.player.destroy();
    });

    it('enables itself on load and shows the position, the step, the time and the play state', function () {
      var t = hardClassic();
      var r = rig(81, { speed: 'fast' });
      var dom = fakeControls();
      r.player.bindControls(dom.root);
      r.player.load(t.events, { autoplay: false });
      var scrub = dom.els['#scrubber'];
      expect(scrub.disabled).toBe(false);
      expect(scrub.max).toBe(String(t.events.length));
      expect(scrub.value).toBe('0');
      expect(scrub.attrs['aria-valuetext']).toMatch(/^At the start: event 0 of /);
      expect(dom.els['#btn-play'].disabled).toBe(false);
      expect(dom.els['#btn-play'].attrs['data-state']).toBe('paused');
      expect(dom.els['#player-time'].textContent).toMatch(/^0 ms \/ /);
      dom.els['#btn-play'].fire('click');
      expect(dom.els['#btn-play'].attrs['data-state']).toBe('playing');
      expect(dom.els['#btn-play'].attrs['aria-label']).toBe('Pause');
      expect(dom.els['#btn-play'].attrs.title).toBe('Pause');
      r.loop.run(1500, 16);
      var position = r.player.state().position;
      expect(position).toBeGreaterThan(100);
      expect(scrub.value).toBe(String(position));
      expect(scrub.attrs['aria-valuetext']).toBe(
        SG.i18n.t('player.position', {
          step: SG.i18n.t('step.' + t.events[position - 1].stepId + '.name'),
          position: position, length: t.events.length
        }));
      expect(dom.els['#player-time'].textContent).not.toMatch(/^0 ms/);
      dom.els['#btn-play'].fire('click');
      expect(dom.els['#btn-play'].attrs['data-state']).toBe('paused');
      expect(dom.els['#btn-play'].attrs['aria-label']).toBe('Play');
      r.player.destroy();
    });

    it('drives the player from the buttons, the scrubber and the speed buttons', function () {
      var t = hardClassic();
      var r = rig(81, { speed: 'fast' });
      var dom = fakeControls();
      r.player.bindControls(dom.root);
      r.player.load(t.events, { autoplay: false });
      dom.els['#btn-next'].fire('click');
      expect(r.player.state().position).toBe(1);
      dom.els['#btn-last'].fire('click');
      expect(r.player.state().position).toBe(t.events.length);
      expect(r.player.state().finished).toBe(true);
      dom.els['#btn-prev'].fire('click');
      expect(r.player.state().position).toBeLessThan(t.events.length);
      dom.els['#btn-first'].fire('click');
      expect(r.player.state().position).toBe(0);
      dom.els['#btn-play'].fire('click');
      expect(r.player.state().playing).toBe(true);
      dom.els['#scrubber'].value = '700';
      dom.els['#scrubber'].fire('input');
      expect(r.player.state().playing).toBe(false);
      expect(r.player.state().position).toBe(700);
      r.board.shows(scratch(t.events, 700, 81));
      dom.speeds[2].fire('click');
      expect(r.player.getSpeed()).toBe('step');
      expect(dom.speeds.map(function (el) { return el.attrs['aria-pressed']; }))
        .toEqual(['false', 'false', 'true', 'false']);
      dom.speeds[3].fire('click');
      expect(r.player.getSpeed()).toBe('manual');
      dom.els['#btn-play'].fire('click');
      expect(r.player.state().playing).toBe(false);
      expect(r.player.state().position).toBeGreaterThan(700);
      dom.speeds[0].fire('click');
      expect(r.player.state().position).toBe(t.events.length);
      r.player.destroy();
    });

    it('re-translates what it wrote on a language change', function () {
      var t = hardClassic();
      var r = rig(81, { speed: 'manual' });
      var dom = fakeControls();
      r.player.bindControls(dom.root);
      r.player.load(t.events);
      r.player.seekToStep('dig');
      var english = dom.els['#scrubber'].attrs['aria-valuetext'];
      expect(english).toMatch(/event \d+ of /);
      inLocale('vi', function () {
        expect(dom.els['#btn-play'].attrs['aria-label']).toBe(SG.i18n.t('player.play'));
        expect(dom.els['#btn-play'].attrs['aria-label']).not.toBe('Play');
        expect(dom.els['#scrubber'].attrs['aria-valuetext']).not.toBe(english);
        expect(dom.els['#scrubber'].attrs['aria-valuetext']).toMatch(/sự kiện \d+ trên /);
        expect(dom.els['#player-time'].textContent).toMatch(/ \/ /);
      });
      expect(dom.els['#btn-play'].attrs['aria-label']).toBe('Play');
      expect(dom.els['#scrubber'].attrs['aria-valuetext']).toBe(english);
      r.player.destroy();
    });

    it('puts a label right that someone else re-translated, at the next update', function () {
      var events = syntheticTrace(3000, 81, 2);
      var r = rig(81, { speed: 'fast' });
      var dom = fakeControls();
      r.player.bindControls(dom.root);
      r.player.load(events);
      expect(dom.els['#btn-play'].attrs['aria-label']).toBe('Pause');
      dom.els['#btn-play'].attrs['aria-label'] = 'Play';
      dom.els['#scrubber'].value = '0';
      r.loop.frame(100);
      expect(dom.els['#btn-play'].attrs['aria-label']).toBe('Pause');
      expect(dom.els['#scrubber'].value).toBe(String(r.player.state().position));
      r.player.destroy();
    });

    it('lets go of every listener on unbind and on destroy, also of the language listener', function () {
      var r = rig(81, { speed: 'manual' });
      var dom = fakeControls();
      var unbind = r.player.bindControls(dom.root);
      expect(dom.all.some(function (el) { return el.listenerCount() > 0; })).toBe(true);
      unbind();
      expect(dom.all.every(function (el) { return el.listenerCount() === 0; })).toBe(true);
      var dom2 = fakeControls();
      r.player.bindControls(dom2.root);
      r.player.bindControls(dom.root);
      expect(dom2.all.every(function (el) { return el.listenerCount() === 0; })).toBe(true);
      r.player.destroy();
      expect(dom.all.every(function (el) { return el.listenerCount() === 0; })).toBe(true);
      var play = dom.els['#btn-play'];
      var before = play.attrs['aria-label'];
      inLocale('vi', function () {});
      expect(play.attrs['aria-label']).toBe(before);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Strings
  // ---------------------------------------------------------------------------------------------

  describe('player: strings', function () {
    var KEYS = ['player.position', 'player.position.start', 'player.position.done', 'player.time'];

    it('has its own keys in English and Vietnamese with the same placeholders', function () {
      function holders(text) {
        var found = [];
        String(text).replace(/\{(\w+)\}/g, function (whole, name) { found.push(name); return whole; });
        return found.sort();
      }
      ['en', 'vi'].forEach(function (code) {
        KEYS.forEach(function (key) { expect(typeof SG.locales[code][key]).toBe('string'); });
      });
      KEYS.forEach(function (key) {
        expect(holders(SG.locales.vi[key])).toEqual(holders(SG.locales.en[key]));
      });
      expect(SG.i18n.conflicts.filter(function (c) { return c.key.indexOf('player.') === 0; })).toEqual([]);
      ['player.play', 'player.pause', 'player.scrubber', 'player.speed.fast'].forEach(function (key) {
        expect(SG.i18n.has(key)).toBe(true);
      });
    });
  });
})();
