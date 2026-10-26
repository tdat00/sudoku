/**
 * Generation event system: the generator records a trace of `GenerationEvent`s. Transport agnostic: an event
 * is plain data (numbers, strings, booleans, null, arrays, plain objects), so it survives `postMessage` /
 * `structuredClone`; it never carries a function, typed array or class instance.
 *
 * Contents
 *  - `createEmitter(verbosity, sink)`  stamps `t` and `seq`, filters by verbosity, throttles `metric`.
 *  - `makePatch`, `applyPatch`, `invertPatch`, `mergePatches`, `splitPatch`  deltas for the grid view.
 *  - `createView`, `cloneView`  the plain state a patch is applied to (replay engine, tests).
 *  - `capTrace`, `createTraceBuffer`  trace size limit.
 *  - `createStageRunner`  runs one pipeline step: start/end events, timing, budget check.
 *  - `VOCABULARY`  every event key with its arguments: the contract between the producers (core, pipeline,
 *    variants) and the consumers (UI, locale packs, tests).
 *
 * Every event has `type`, `stepId`, `phase`, `t` (ms since the emitter was created) and `seq` (0, 1, 2, ...
 * in emission order, so it equals the array index of an uncapped trace), optionally `i18nKey`, `i18nArgs`,
 * `patch`, `metrics`. `stepId` is one of the seven step ids, or 'pipeline' for `done` and for errors outside
 * a step.
 *
 * Verbosity: 'off' passes only `step` start/end, `done` and `error`. 'summary' adds `step` progress, `retry`
 * and `metric` (at most one every 50 ms). 'full' adds every `micro` event (each placement, backtrack and
 * dig).
 *
 * Patch: `{ cells?: [{i, value, state}], highlight?: [i], unhighlight?: [i] }`, a delta of at most 8 cells
 * (`MAX_PATCH_CELLS`); `highlight` plus `unhighlight` name at most 8 cells together. Applied in this order:
 * `cells`, then `unhighlight`, then `highlight`. Cell states: 'empty', 'placed' (a digit of the grid or
 * puzzle), 'given' (reserved for the UI), 'backtracked' (emptied again by the search; the digit tried is in
 * the event arguments, the UI flashes it red).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const VERBOSITIES = ['off', 'summary', 'full'];
  const LEVEL_OF = { off: 0, summary: 1, full: 2 };

  const TYPES = ['step', 'micro', 'metric', 'retry', 'done', 'error'];

  const PHASES = ['start', 'progress', 'end'];

  const STEP_IDS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];

  const CELL_STATES = ['empty', 'placed', 'given', 'backtracked'];

  const MAX_PATCH_CELLS = 8;

  const METRIC_INTERVAL_MS = 50;

  const DEFAULT_MAX_TRACE_EVENTS = 20000;

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  /** Milliseconds from a monotonic clock where there is one (resolved once, not on every call). */
  const defaultNow = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? function defaultNow() { return performance.now(); }
    : Date.now;

  function isPlainData(value) {
    if (value === null) return true;
    switch (typeof value) {
      case 'string':
      case 'boolean':
        return true;
      case 'number':
        return isFinite(value);
      case 'object': {
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) if (!isPlainData(value[i])) return false;
          return true;
        }
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null) return false;
        const keys = Object.keys(value);
        for (let i = 0; i < keys.length; i++) if (!isPlainData(value[keys[i]])) return false;
        return true;
      }
      default:
        return false;
    }
  }

  /** Copies a value into plain data: functions and undefined are dropped, other objects become strings. */
  function toPlain(value, depth) {
    if (value === null) return null;
    switch (typeof value) {
      case 'string':
      case 'boolean':
        return value;
      case 'number':
        return isFinite(value) ? value : null;
      case 'object': {
        if (depth > 4) return null;
        if (Array.isArray(value)) return value.map(function (v) { return toPlain(v, depth + 1); });
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null) {
          return ArrayBuffer.isView(value) ? Array.from(value) : String(value);
        }
        const out = {};
        Object.keys(value).forEach(function (k) {
          if (typeof value[k] !== 'function' && value[k] !== undefined) {
            out[k] = toPlain(value[k], depth + 1);
          }
        });
        return out;
      }
      default:
        return null;
    }
  }

  // BoardView (the state a patch is applied to; not sent anywhere): { value: Int32Array, state: string[],
  // highlight: Uint8Array (1 while highlighted) }

  function invalidPatch(reason) {
    return fail('events.invalidPatch', { reason: reason });
  }

  function isIndex(x) {
    return Number.isInteger(x) && x >= 0;
  }

  function patchProblems(patch) {
    const problems = [];
    if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
      return ['patch must be an object'];
    }
    Object.keys(patch).forEach(function (k) {
      if (k !== 'cells' && k !== 'highlight' && k !== 'unhighlight') {
        problems.push('unknown field "' + k + '"');
      }
    });
    if (patch.cells !== undefined) {
      if (!Array.isArray(patch.cells)) problems.push('cells must be an array');
      else {
        if (patch.cells.length > MAX_PATCH_CELLS) problems.push('more than ' + MAX_PATCH_CELLS + ' cells');
        patch.cells.forEach(function (c) {
          if (!c || !isIndex(c.i) || !isIndex(c.value) || CELL_STATES.indexOf(c.state) === -1 ||
              Object.keys(c).length !== 3) {
            problems.push('malformed cell ' + JSON.stringify(c));
          }
        });
      }
    }
    let lit = 0;
    ['highlight', 'unhighlight'].forEach(function (key) {
      if (patch[key] === undefined) return;
      if (!Array.isArray(patch[key]) || !patch[key].every(isIndex)) {
        problems.push(key + ' must list cell indices');
      } else lit += patch[key].length;
    });
    if (lit > MAX_PATCH_CELLS) problems.push('more than ' + MAX_PATCH_CELLS + ' highlighted cells');
    return problems;
  }

  // Builds a validated patch from loose changes. Cells may omit `state` ('empty' for value 0, else 'placed').
  // Empty fields are left out, so the patch of "no change" is `{}`. Throws 'events.invalidPatch' when
  // malformed or too large.
  function makePatch(changes) {
    if (changes === null || typeof changes !== 'object') throw invalidPatch('changes must be an object');
    const patch = {};
    if (changes.cells !== undefined && changes.cells.length > 0) {
      patch.cells = Array.prototype.map.call(changes.cells, function (c) {
        const value = c.value;
        const state = c.state !== undefined ? c.state : value === 0 ? 'empty' : 'placed';
        return { i: c.i, value: value, state: state };
      });
    }
    ['highlight', 'unhighlight'].forEach(function (key) {
      if (changes[key] !== undefined && changes[key].length > 0) patch[key] = Array.from(changes[key]);
    });
    const problems = patchProblems(patch);
    if (problems.length > 0) throw invalidPatch(problems[0]);
    return patch;
  }

  function createView(cellCount) {
    return {
      value: new Int32Array(cellCount),
      state: new Array(cellCount).fill('empty'),
      highlight: new Uint8Array(cellCount)
    };
  }

  function cloneView(view) {
    return {
      value: Int32Array.from(view.value),
      state: view.state.slice(),
      highlight: Uint8Array.from(view.highlight)
    };
  }

  // Applies a patch to a view in place (`cells`, then `unhighlight`, then `highlight`). Throws
  // 'events.invalidPatch' for a cell outside the view.
  function applyPatch(view, patch) {
    const n = view.value.length;
    const cells = patch.cells;
    let k;
    if (cells !== undefined) {
      for (k = 0; k < cells.length; k++) {
        const c = cells[k];
        if (!(c.i >= 0 && c.i < n)) throw invalidPatch('cell ' + c.i + ' is outside the view');
        view.value[c.i] = c.value;
        view.state[c.i] = c.state;
      }
    }
    const off = patch.unhighlight;
    if (off !== undefined) {
      for (k = 0; k < off.length; k++) {
        if (!(off[k] >= 0 && off[k] < n)) throw invalidPatch('cell ' + off[k] + ' is outside the view');
        view.highlight[off[k]] = 0;
      }
    }
    const on = patch.highlight;
    if (on !== undefined) {
      for (k = 0; k < on.length; k++) {
        if (!(on[k] >= 0 && on[k] < n)) throw invalidPatch('cell ' + on[k] + ' is outside the view');
        view.highlight[on[k]] = 1;
      }
    }
    return view;
  }

  function stateOf(prev, i) {
    if (prev.state !== undefined && prev.state !== null && prev.state[i] !== undefined) return prev.state[i];
    return prev.value[i] === 0 ? 'empty' : 'placed';
  }

  // The inverse of a patch: applied to the state AFTER the patch it restores the state BEFORE it, for every
  // cell and highlight the patch touched; the replay engine stores it next to each patch to step backwards
  // without recomputation. `prevState` is the state before the patch (a BoardView); missing `state` entries
  // read as 'empty' / 'placed' by value, a missing `highlight` as "nothing highlighted".
  function invertPatch(patch, prevState) {
    const inverse = {};
    if (patch.cells !== undefined && patch.cells.length > 0) {
      inverse.cells = patch.cells.map(function (c) {
        return { i: c.i, value: prevState.value[c.i], state: stateOf(prevState, c.i) };
      });
    }
    const touched = [];
    const seen = new Set();
    [patch.unhighlight, patch.highlight].forEach(function (list) {
      if (list === undefined) return;
      list.forEach(function (i) {
        if (!seen.has(i)) {
          seen.add(i);
          touched.push(i);
        }
      });
    });
    const on = [];
    const off = [];
    touched.forEach(function (i) {
      const lit = prevState.highlight !== undefined && prevState.highlight !== null &&
        prevState.highlight[i] === 1;
      (lit ? on : off).push(i);
    });
    if (off.length > 0) inverse.unhighlight = off;
    if (on.length > 0) inverse.highlight = on;
    return inverse;
  }

  // Folds patches into one with the same net effect: the last write to a cell, and the last highlight or
  // unhighlight of a cell, wins. The result can exceed the 8-cell limit; `splitPatch` cuts it up again.
  function mergePatches(patches) {
    const cells = new Map();
    const lights = new Map();
    patches.forEach(function (patch) {
      let k;
      if (patch.cells !== undefined) {
        for (k = 0; k < patch.cells.length; k++) cells.set(patch.cells[k].i, patch.cells[k]);
      }
      if (patch.unhighlight !== undefined) {
        for (k = 0; k < patch.unhighlight.length; k++) lights.set(patch.unhighlight[k], false);
      }
      if (patch.highlight !== undefined) {
        for (k = 0; k < patch.highlight.length; k++) lights.set(patch.highlight[k], true);
      }
    });
    const merged = {};
    if (cells.size > 0) {
      merged.cells = Array.from(cells.values()).map(function (c) {
        return { i: c.i, value: c.value, state: c.state };
      });
    }
    const on = [];
    const off = [];
    lights.forEach(function (lit, i) { (lit ? on : off).push(i); });
    if (off.length > 0) merged.unhighlight = off;
    if (on.length > 0) merged.highlight = on;
    return merged;
  }

  // Cuts a patch into patches that respect the limits; applying them in sequence equals applying the
  // original. The empty patch stays one empty patch.
  function splitPatch(patch) {
    const out = [];
    const cells = patch.cells || [];
    const off = patch.unhighlight || [];
    const on = patch.highlight || [];
    const step = MAX_PATCH_CELLS;
    for (let k = 0; k < cells.length; k += step) out.push({ cells: cells.slice(k, k + step) });
    for (let k = 0; k < off.length; k += step) out.push({ unhighlight: off.slice(k, k + step) });
    for (let k = 0; k < on.length; k += step) out.push({ highlight: on.slice(k, k + step) });
    if (out.length === 0) out.push({});
    return out;
  }

  // GenerationEvent metrics: { clues, accepted, rejected, attempts, placed, backtracks, restarts, score },
  // whichever apply to the step.

  // Optional parts that are undefined or null are left out of the event.
  function createEvent(type, stepId, phase, seq, t, fields) {
    const ev = { type: type, stepId: stepId, phase: phase, t: t, seq: seq };
    const f = fields || {};
    if (f.i18nKey !== undefined && f.i18nKey !== null) ev.i18nKey = f.i18nKey;
    if (f.i18nArgs !== undefined && f.i18nArgs !== null) ev.i18nArgs = f.i18nArgs;
    if (f.patch !== undefined && f.patch !== null) ev.patch = f.patch;
    if (f.metrics !== undefined && f.metrics !== null) ev.metrics = f.metrics;
    return ev;
  }

  function eventProblems(event) {
    const problems = [];
    if (event === null || typeof event !== 'object') return ['event must be an object'];
    const allowed = ['type', 'stepId', 'phase', 't', 'seq', 'i18nKey', 'i18nArgs', 'patch', 'metrics'];
    Object.keys(event).forEach(function (k) {
      if (allowed.indexOf(k) === -1) problems.push('unknown field "' + k + '"');
    });
    if (TYPES.indexOf(event.type) === -1) problems.push('bad type ' + String(event.type));
    if (typeof event.stepId !== 'string' || event.stepId === '') problems.push('stepId must be a string');
    if (PHASES.indexOf(event.phase) === -1) problems.push('bad phase ' + String(event.phase));
    if (!(typeof event.t === 'number' && isFinite(event.t) && event.t >= 0)) {
      problems.push('t must be a number');
    }
    if (!isIndex(event.seq)) problems.push('seq must be a non-negative integer');
    if (event.i18nKey !== undefined && (typeof event.i18nKey !== 'string' || event.i18nKey === '')) {
      problems.push('i18nKey must be a string');
    }
    if (event.i18nArgs !== undefined && !(isPlainData(event.i18nArgs) && !Array.isArray(event.i18nArgs) &&
        event.i18nArgs !== null)) {
      problems.push('i18nArgs must be a plain object');
    }
    if (event.metrics !== undefined) {
      const m = event.metrics;
      if (!(m !== null && typeof m === 'object' && Object.keys(m).every(function (k) {
        return typeof m[k] === 'number' && isFinite(m[k]);
      }))) problems.push('metrics must be an object of finite numbers');
    }
    if (event.patch !== undefined) {
      patchProblems(event.patch).forEach(function (p) { problems.push('patch: ' + p); });
    }
    return problems;
  }

  // Emitter: { isEmitter, verbosity, wantsMicro, wantsMetrics, count (events handed to the sink), view (what
  // the replay of the emitted events would show; null until bound), setVerbosity(v),
  //   emit(partialEvent) -> whether the sink got it, step(stepId, phase, i18nKey, i18nArgs, metrics),
  //   micro(stepId, i18nKey, i18nArgs, patch, metrics), retry(stepId, i18nKey, i18nArgs, metrics),
  //   metric(stepId, metrics) (throttled to one per 50 ms; `metrics` may be a function that is only called
  //   when the event is sent), done(i18nArgs, metrics) (stepId 'pipeline', key 'done'), error(stepId, error)
  //   (key 'error.' + error.code), bindBoard(cellCount) (starts tracking the view), syncBoard(stepId,
  //   i18nKey, i18nArgs, values) (emits chunked patches that bring the replayed board to the values),
  //   clearBoard(stepId, i18nKey, i18nArgs) (syncBoard to an empty board), microChunks(stepId, i18nKey,
  //   i18nArgs, cellChanges, metrics) (one `micro` event per 8 cells with the same key; `part` and `parts`
  //   are added to the arguments when it takes more than one); the last three return the number of events }
  // `wantsMicro` is true when `micro` events reach a sink: the hot paths of the core pick their instrumented
  // variant once, at entry, from this flag, so a quiet emitter runs the plain code and instrumentation costs
  // nothing.

  // Creates an emitter. The sink receives each event the verbosity lets through, in order, with `t` and `seq`
  // stamped on. A null sink is allowed: nothing is built or sent, and every method does nothing. Options: now
  // (ms clock, default `performance.now`), metricIntervalMs (default 50). Throws 'events.invalidVerbosity',
  // 'events.invalidSink'.
  function createEmitter(verbosity, sink, options) {
    options = options || {};
    if (LEVEL_OF[verbosity] === undefined) {
      throw fail('events.invalidVerbosity', { verbosity: String(verbosity) });
    }
    if (sink !== null && sink !== undefined && typeof sink !== 'function') {
      throw fail('events.invalidSink', { sink: typeof sink });
    }
    const out = typeof sink === 'function' ? sink : null;
    const now = typeof options.now === 'function' ? options.now : defaultNow;
    const interval = options.metricIntervalMs !== undefined ? options.metricIntervalMs : METRIC_INTERVAL_MS;
    const startedAt = now();
    let level = LEVEL_OF[verbosity];
    let seq = 0;
    let lastMetricAt = -Infinity;
    let view = null;

    const em = {
      isEmitter: true,
      verbosity: verbosity,
      wantsMicro: false,
      wantsMetrics: false,
      count: 0,
      get view() { return view; }
    };

    function refresh() {
      em.wantsMetrics = out !== null && level >= 1;
      em.wantsMicro = out !== null && level >= 2;
    }

    function elapsed() {
      return Math.round((now() - startedAt) * 100) / 100;
    }

    function send(type, stepId, phase, key, args, patch, metrics, t) {
      const ev = {
        type: type, stepId: stepId, phase: phase, t: t === undefined ? elapsed() : t, seq: seq++
      };
      if (key !== undefined && key !== null) ev.i18nKey = key;
      if (args !== undefined && args !== null) ev.i18nArgs = args;
      if (patch !== undefined && patch !== null) {
        ev.patch = patch;
        if (view !== null) applyPatch(view, patch);
      }
      if (metrics !== undefined && metrics !== null) ev.metrics = metrics;
      em.count++;
      out(ev);
    }

    function allows(type, phase) {
      if (out === null) return false;
      switch (type) {
        case 'step': return phase !== 'progress' || level >= 1;
        case 'done':
        case 'error': return true;
        case 'metric':
        case 'retry': return level >= 1;
        case 'micro': return level >= 2;
        default: return false;
      }
    }

    em.emit = function emit(event) {
      if (event === null || typeof event !== 'object' || TYPES.indexOf(event.type) === -1) {
        throw fail('events.invalidEvent', { reason: 'unknown type' });
      }
      if (!allows(event.type, event.phase)) return false;
      send(event.type, event.stepId, event.phase, event.i18nKey, event.i18nArgs, event.patch, event.metrics);
      return true;
    };

    em.step = function step(stepId, phase, key, args, metrics) {
      if (!allows('step', phase)) return;
      send('step', stepId, phase, key, args, null, metrics);
    };

    em.micro = function micro(stepId, key, args, patch, metrics) {
      if (out === null || level < 2) return;
      send('micro', stepId, 'progress', key, args, patch, metrics);
    };

    em.metric = function metric(stepId, metrics) {
      if (out === null || level < 1) return;
      const t = now();
      if (t - lastMetricAt < interval) return;
      lastMetricAt = t;
      const built = typeof metrics === 'function' ? metrics() : metrics;
      send('metric', stepId, 'progress', null, null, null, built);
    };

    em.retry = function retry(stepId, key, args, metrics) {
      if (out === null || level < 1) return;
      send('retry', stepId, 'progress', key, args, null, metrics);
    };

    em.done = function done(args, metrics) {
      if (out === null) return;
      send('done', 'pipeline', 'end', 'done', args, null, metrics);
    };

    em.error = function error(stepId, err) {
      if (out === null) return;
      const code = err && typeof err.code === 'string' ? err.code : 'unexpected';
      const args = err && err.i18nArgs ? toPlain(err.i18nArgs, 0) : {};
      args.code = code;
      if (!(err && typeof err.code === 'string')) {
        args.message = String(err && err.message ? err.message : err);
      }
      send('error', stepId, 'end', 'error.' + code, args, null, null);
    };

    em.bindBoard = function bindBoard(cellCount) {
      if (out === null) return createView(cellCount);
      if (view === null || view.value.length !== cellCount) view = createView(cellCount);
      return view;
    };

    em.microChunks = function microChunks(stepId, key, args, changes, metrics) {
      if (out === null || level < 2) return 0;
      const total = changes.length;
      if (total === 0) return 0;
      const parts = Math.ceil(total / MAX_PATCH_CELLS);
      const t = elapsed();
      for (let p = 0; p < parts; p++) {
        let a = args;
        let m = metrics;
        if (parts > 1) {
          a = Object.assign({}, args);
          a.part = p;
          a.parts = parts;
          if (p > 0 && metrics !== undefined && metrics !== null) m = Object.assign({}, metrics);
        }
        const cells = parts === 1 ? changes : changes.slice(p * MAX_PATCH_CELLS, (p + 1) * MAX_PATCH_CELLS);
        send('micro', stepId, 'progress', key, a, { cells: cells }, m, t);
      }
      return parts;
    };

    em.syncBoard = function syncBoard(stepId, key, args, values) {
      if (out === null || level < 2) return 0;
      const v = em.bindBoard(values.length);
      const have = v.value;
      const changes = [];
      for (let c = 0; c < values.length; c++) {
        if (have[c] !== values[c]) {
          changes.push({ i: c, value: values[c], state: values[c] === 0 ? 'empty' : 'placed' });
        }
      }
      if (changes.length === 0) return 0;
      return em.microChunks(stepId, key, Object.assign({ count: changes.length }, args), changes, null);
    };

    em.clearBoard = function clearBoard(stepId, key, args) {
      if (out === null || level < 2 || view === null) return 0;
      const have = view.value;
      const changes = [];
      for (let c = 0; c < have.length; c++) {
        if (have[c] !== 0) changes.push({ i: c, value: 0, state: 'empty' });
      }
      if (changes.length === 0) return 0;
      return em.microChunks(stepId, key, Object.assign({ count: changes.length }, args), changes, null);
    };

    em.setVerbosity = function setVerbosity(next) {
      if (LEVEL_OF[next] === undefined) throw fail('events.invalidVerbosity', { verbosity: String(next) });
      level = LEVEL_OF[next];
      em.verbosity = next;
      refresh();
    };

    refresh();
    return em;
  }

  const NULL_EMITTER = createEmitter('off', null);

  // Turns whatever a caller passed as `emit` into an emitter: an emitter stays as it is, a plain function
  // becomes a 'full' emitter that feeds it (a bare callback wants everything), null or undefined become the
  // shared `NULL_EMITTER`.
  function toEmitter(target) {
    if (target !== null && target !== undefined) {
      if (target.isEmitter === true) return target;
      if (typeof target === 'function') return createEmitter('full', target);
    }
    return NULL_EMITTER;
  }

  // Creates the runner of pipeline steps. `stage(stepId, args, fn)` emits the step's start event, checks the
  // budget (so a cancel is noticed at every step boundary), calls `fn(scope)`, emits the end event and adds
  // the elapsed time to `stage.timings[stepId]`. `fn` can set `scope.args` and `scope.metrics` for the end
  // event; its return value is the return value of `stage`. When `fn` throws, no end event is sent and
  // `stage.current` keeps the id of the failed step. Options: budget (a SG.budget, checked at every step
  // start), timings (collects ms per step id; default a new object), now.
  function createStageRunner(emitter, options) {
    options = options || {};
    const budget = options.budget || null;
    const now = typeof options.now === 'function' ? options.now : defaultNow;
    const timings = options.timings || {};
    STEP_IDS.forEach(function (id) { if (timings[id] === undefined) timings[id] = 0; });

    function stage(stepId, args, fn) {
      const t0 = now();
      stage.current = stepId;
      try {
        emitter.step(stepId, 'start', stepId + '.start', args);
        if (budget !== null) budget.check();
        const scope = { args: undefined, metrics: undefined };
        const result = fn(scope);
        emitter.step(stepId, 'end', stepId + '.end', scope.args, scope.metrics);
        stage.current = null;
        return result;
      } finally {
        timings[stepId] = (timings[stepId] || 0) + (now() - t0);
      }
    }
    stage.current = null;
    stage.timings = timings;
    return stage;
  }

  function eachCell(patch, fn) {
    if (patch.cells !== undefined) {
      for (let j = 0; j < patch.cells.length; j++) fn(patch.cells[j].i);
    }
    [patch.highlight, patch.unhighlight].forEach(function (list) {
      if (list !== undefined) list.forEach(fn);
    });
  }

  /** The number of cells a trace talks about: one more than the highest cell index in any patch. */
  function boardSizeOf(events) {
    let max = -1;
    for (let k = 0; k < events.length; k++) {
      if (events[k].patch !== undefined) {
        eachCell(events[k].patch, function (i) { if (i > max) max = i; });
      }
    }
    return max + 1;
  }

  // Keeps exactly `keepMicro` of the `microTotal` micro events (spread evenly) and every other event. What
  // the dropped events changed is made up for by synthesized 'trace.coalesced' events placed just before the
  // next kept event: two boards are tracked, the one the original trace has reached (`truth`) and the one the
  // capped trace has shown so far (`shown`), and a synthesized event carries exactly the cells and highlights
  // on which they differ, so a highlight that was set and cleared again, or a digit that was placed and
  // backtracked, costs nothing.
  function decimate(events, microTotal, keepMicro, cellCount) {
    const out = [];
    const truth = createView(cellCount);
    const shown = createView(cellCount);
    const touched = new Set();
    let dropped = 0;
    let last = null;
    let seen = 0;

    function touch(patch) {
      eachCell(patch, function (i) { touched.add(i); });
    }

    function flush(next) {
      if (touched.size > 0) {
        const cells = [];
        const on = [];
        const off = [];
        Array.from(touched).sort(function (a, b) { return a - b; }).forEach(function (i) {
          if (truth.value[i] !== shown.value[i] || truth.state[i] !== shown.state[i]) {
            cells.push({ i: i, value: truth.value[i], state: truth.state[i] });
          }
          if (truth.highlight[i] !== shown.highlight[i]) (truth.highlight[i] === 1 ? on : off).push(i);
        });
        // A synthesized event takes the seq and t of the event after it, so the order of seq never breaks.
        const ref = next !== null ? next : last;
        const patches = cells.length + off.length + on.length === 0 ? []
          : splitPatch({ cells: cells, unhighlight: off, highlight: on });
        for (let p = 0; p < patches.length; p++) {
          const args = { dropped: dropped };
          if (patches.length > 1) {
            args.part = p;
            args.parts = patches.length;
          }
          applyPatch(shown, patches[p]);
          out.push({
            type: 'micro', stepId: last.stepId, phase: 'progress', t: ref.t, seq: ref.seq,
            i18nKey: 'trace.coalesced', i18nArgs: args, patch: patches[p]
          });
        }
        touched.clear();
      }
      dropped = 0;
    }

    for (let k = 0; k < events.length; k++) {
      const e = events[k];
      if (e.type === 'micro') {
        const before = Math.floor(seen * keepMicro / microTotal);
        const keep = Math.floor((seen + 1) * keepMicro / microTotal) > before;
        seen++;
        if (keep) {
          flush(e);
          if (e.patch !== undefined) {
            applyPatch(truth, e.patch);
            applyPatch(shown, e.patch);
          }
          out.push(e);
        } else {
          if (e.patch !== undefined) {
            applyPatch(truth, e.patch);
            touch(e.patch);
          }
          dropped++;
          last = e;
        }
      } else {
        if (e.type !== 'metric') flush(e);
        out.push(e);
      }
    }
    flush(null);
    return out;
  }

  // Limits a trace to `maxEvents` (default 20000) by thinning out the `micro` events; every other event
  // (`step`, `metric`, `retry`, `done`, `error`) is always kept. The kept micro events are spread evenly;
  // what the dropped ones changed is carried by synthesized `micro` events with the key 'trace.coalesced'
  // (arguments `dropped`, and `part` / `parts` when it takes several), placed just before the next kept event
  // and carrying its `seq` and `t` (so `seq` never decreases), so the replay still ends on exactly the same
  // board. As many micro events are kept as the limit allows; if the step events alone exceed the limit, all
  // micro events go and only the synthesized ones remain. Returns a new array.
  function capTrace(events, maxEvents) {
    const max = maxEvents === undefined ? DEFAULT_MAX_TRACE_EVENTS : maxEvents;
    if (!(max >= 1)) throw fail('events.invalidLimit', { maxEvents: String(maxEvents) });
    if (events.length <= max) return events.slice();
    let micro = 0;
    for (let k = 0; k < events.length; k++) if (events[k].type === 'micro') micro++;
    if (micro === 0) return events.slice();

    const cellCount = boardSizeOf(events);
    // The size of the result grows with the number of micro events kept; find the most that still fits.
    let lo = 0;
    let hi = Math.min(micro, Math.max(0, max - (events.length - micro)));
    let best = decimate(events, micro, 0, cellCount);
    if (best.length > max) return best;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const candidate = decimate(events, micro, mid, cellCount);
      if (candidate.length <= max) {
        lo = mid;
        best = candidate;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  }

  // TraceBuffer: { push(event), events() (the trace within the limit; a new array), clear(), size, dropped
  // (events thinned out so far) }

  // A growing trace that never holds much more than `maxTraceEvents` (default 20000): at a quarter over the
  // limit it is thinned with `capTrace`, so the cost stays amortised. Clear it before the next generation.
  function createTraceBuffer(options) {
    const max = options && options.maxTraceEvents !== undefined ? options.maxTraceEvents
      : DEFAULT_MAX_TRACE_EVENTS;
    if (!(max >= 1)) throw fail('events.invalidLimit', { maxEvents: String(max) });
    const slack = Math.max(64, Math.floor(max / 4));
    let list = [];
    let pushed = 0;

    function thin() {
      list = capTrace(list, max);
    }

    return {
      push: function push(event) {
        list.push(event);
        pushed++;
        if (list.length > max + slack) thin();
      },
      events: function events() {
        return list.length > max ? capTrace(list, max) : list.slice();
      },
      clear: function clear() {
        list = [];
        pushed = 0;
      },
      get size() { return list.length; },
      get dropped() { return Math.max(0, pushed - list.length); }
    };
  }

  // VocabularyEntry: { type, stepId ('*' = any step), phase, key (the `i18nKey`; null for `metric` events;
  // 'error.*' stands for 'error.' plus any error code), level (lowest verbosity that emits it), args (names
  // that may appear in `i18nArgs`; `part`, `parts` and `count` are allowed on any `micro` event carrying
  // cells), patch (patch fields the event may carry) }

  function entry(type, stepId, phase, key, level, args, patch) {
    return {
      type: type, stepId: stepId, phase: phase, key: key, level: level, args: args || [], patch: patch || []
    };
  }

  /**
   * Every event the core emits (locale packs must define a translation for every `key`; the UI reads the
   * `args`). Per step:
   *  - 1 configure: start, config, end.
   *  - 2 buildModel: start, model, spec, traceDowngraded, end.
   *  - 3 fullGrid: start, clear, fixed, seed, place, conflict, backtrack, restart, end.
   *  - 4 extraStructure: start, none, built, end.
   *  - 5 dig: start, restore, pass.start, skip, try, accept, reject, keep, pass.end, verify, unsound, end,
   *    and `metric` events.
   *  - 6 rate: start, technique, result, end.
   *  - 7 tune: start, hit, miss, best, final, end.
   *  - run level: `retry.difficulty`, `done`, `error.<code>`, `trace.coalesced`.
   */
  const VOCABULARY = [
    entry('step', 'configure', 'start', 'configure.start', 'off'),
    entry('step', 'configure', 'progress', 'configure.config', 'summary',
      ['variantId', 'difficulty', 'seed', 'symbolMode', 'symmetry', 'digOrder', 'maxAttempts', 'trace']),
    entry('step', 'configure', 'end', 'configure.end', 'off'),

    entry('step', 'buildModel', 'start', 'buildModel.start', 'off', ['variantId']),
    entry('step', 'buildModel', 'progress', 'buildModel.model', 'summary',
      ['variantId', 'cellCount', 'digits', 'rows', 'cols', 'units', 'cages', 'inequalities']),
    entry('step', 'buildModel', 'progress', 'buildModel.spec', 'summary',
      ['level', 'scoreMin', 'scoreMax', 'minClues', 'maxClues', 'minCluesPerUnit', 'techniques']),
    entry('step', 'buildModel', 'progress', 'buildModel.traceDowngraded', 'summary',
      ['requested', 'applied', 'cellCount']),
    entry('step', 'buildModel', 'end', 'buildModel.end', 'off'),

    entry('step', 'fullGrid', 'start', 'fullGrid.start', 'off', ['attempt', 'maxAttempts']),
    entry('micro', 'fullGrid', 'progress', 'fullGrid.clear', 'full', ['count'], ['cells']),
    entry('micro', 'fullGrid', 'progress', 'fullGrid.fixed', 'full', ['count'], ['cells']),
    entry('micro', 'fullGrid', 'progress', 'fullGrid.seed', 'full', ['count'], ['cells']),
    entry('micro', 'fullGrid', 'progress', 'fullGrid.place', 'full',
      ['cell', 'value', 'depth', 'forced'], ['cells']),
    entry('micro', 'fullGrid', 'progress', 'fullGrid.conflict', 'full',
      ['cell', 'value', 'depth'], ['cells']),
    entry('micro', 'fullGrid', 'progress', 'fullGrid.backtrack', 'full',
      ['cell', 'value', 'depth', 'cleared'], ['cells']),
    entry('micro', 'fullGrid', 'progress', 'fullGrid.restart', 'full',
      ['restart', 'backtracks', 'limit', 'count'], ['cells']),
    entry('step', 'fullGrid', 'end', 'fullGrid.end', 'off'),

    entry('step', 'extraStructure', 'start', 'extraStructure.start', 'off', ['attempt', 'variantId']),
    entry('step', 'extraStructure', 'progress', 'extraStructure.none', 'summary', ['variantId']),
    entry('step', 'extraStructure', 'progress', 'extraStructure.built', 'summary', ['variantId']),
    entry('step', 'extraStructure', 'end', 'extraStructure.end', 'off', ['skipped']),

    entry('step', 'dig', 'start', 'dig.start', 'off',
      ['attempt', 'maxAttempts', 'sample', 'maxSamples', 'level', 'symmetry', 'order', 'strategy',
        'minClues']),
    entry('micro', 'dig', 'progress', 'dig.restore', 'full', ['count'], ['cells']),
    entry('micro', 'dig', 'progress', 'dig.pass.start', 'full', ['pass', 'clues']),
    entry('micro', 'dig', 'progress', 'dig.skip', 'full', ['cells', 'reason']),
    entry('micro', 'dig', 'progress', 'dig.try', 'full', ['cells', 'pass'], ['highlight']),
    entry('micro', 'dig', 'progress', 'dig.accept', 'full', ['cells'], ['cells', 'unhighlight']),
    entry('micro', 'dig', 'progress', 'dig.reject', 'full', ['cells', 'reason'], ['unhighlight']),
    entry('micro', 'dig', 'progress', 'dig.keep', 'full', ['cells', 'score'], ['unhighlight']),
    entry('micro', 'dig', 'progress', 'dig.pass.end', 'full', ['pass', 'clues']),
    entry('metric', 'dig', 'progress', null, 'summary'),
    entry('step', 'dig', 'progress', 'dig.verify', 'summary', ['unique']),
    entry('step', 'dig', 'progress', 'dig.unsound', 'summary'),
    entry('step', 'dig', 'end', 'dig.end', 'off'),

    entry('step', 'rate', 'start', 'rate.start', 'off', ['attempt', 'maxAttempts', 'sample', 'maxSamples']),
    entry('step', 'rate', 'progress', 'rate.technique', 'summary', ['technique', 'count', 'group']),
    entry('step', 'rate', 'progress', 'rate.result', 'summary',
      ['level', 'score', 'hardestTechnique', 'requested', 'solved']),
    entry('step', 'rate', 'end', 'rate.end', 'off'),

    entry('step', 'tune', 'start', 'tune.start', 'off',
      ['attempt', 'maxAttempts', 'sample', 'maxSamples', 'finalize']),
    entry('step', 'tune', 'progress', 'tune.hit', 'summary',
      ['requested', 'achieved', 'score', 'scoreMin', 'scoreMax', 'hardestTechnique']),
    entry('step', 'tune', 'progress', 'tune.miss', 'summary',
      ['requested', 'achieved', 'score', 'scoreMin', 'scoreMax', 'sample', 'maxSamples']),
    entry('step', 'tune', 'progress', 'tune.best', 'summary', ['requested', 'achieved', 'score']),
    entry('micro', 'tune', 'progress', 'tune.final', 'full', ['count'], ['cells']),
    entry('step', 'tune', 'end', 'tune.end', 'off'),

    entry('retry', 'tune', 'progress', 'retry.difficulty', 'summary',
      ['attempt', 'maxAttempts', 'requested', 'achieved', 'reason', 'willRetry']),
    entry('done', 'pipeline', 'end', 'done', 'off',
      ['requested', 'achieved', 'exact', 'attempts', 'clues', 'seed', 'warnings']),
    entry('error', '*', 'end', 'error.*', 'off', ['code', 'message']),
    entry('micro', '*', 'progress', 'trace.coalesced', 'full', ['dropped'],
      ['cells', 'highlight', 'unhighlight'])
  ];

  function lookup(event) {
    const key = event.i18nKey === undefined ? null : event.i18nKey;
    for (let k = 0; k < VOCABULARY.length; k++) {
      const v = VOCABULARY[k];
      if (v.type !== event.type || v.phase !== event.phase) continue;
      if (v.stepId !== '*' && v.stepId !== event.stepId) continue;
      if (v.key === key || (v.key === 'error.*' && key !== null && key.indexOf('error.') === 0)) return v;
    }
    return null;
  }

  // Every distinct `i18nKey` of the vocabulary, sorted ('error.*' stands for the error codes).
  function vocabularyKeys() {
    const keys = [];
    VOCABULARY.forEach(function (v) { if (v.key !== null && keys.indexOf(v.key) === -1) keys.push(v.key); });
    return keys.sort();
  }

  SG.events = {
    VERBOSITIES: VERBOSITIES,
    TYPES: TYPES,
    PHASES: PHASES,
    STEP_IDS: STEP_IDS,
    CELL_STATES: CELL_STATES,
    MAX_PATCH_CELLS: MAX_PATCH_CELLS,
    METRIC_INTERVAL_MS: METRIC_INTERVAL_MS,
    DEFAULT_MAX_TRACE_EVENTS: DEFAULT_MAX_TRACE_EVENTS,
    VOCABULARY: VOCABULARY,
    NULL_EMITTER: NULL_EMITTER,
    createEvent: createEvent,
    eventProblems: eventProblems,
    patchProblems: patchProblems,
    isPlainData: isPlainData,
    createEmitter: createEmitter,
    toEmitter: toEmitter,
    makePatch: makePatch,
    applyPatch: applyPatch,
    invertPatch: invertPatch,
    mergePatches: mergePatches,
    splitPatch: splitPatch,
    createView: createView,
    cloneView: cloneView,
    createStageRunner: createStageRunner,
    capTrace: capTrace,
    createTraceBuffer: createTraceBuffer,
    lookup: lookup,
    vocabularyKeys: vocabularyKeys
  };
})(typeof self !== 'undefined' ? self : globalThis);
