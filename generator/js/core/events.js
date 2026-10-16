/**
 * Generation event system (design.md sections 3.3 and 7.2).
 *
 * The generator runs at full speed and records a trace of `GenerationEvent`s; the UI replays the trace at
 * the speed the user picked (ADR-002). Everything in this file is transport agnostic: an event is plain
 * data (numbers, strings, booleans, null, arrays and plain objects), so it survives `postMessage` and
 * `structuredClone` unchanged, and no event ever carries a function, a typed array or a class instance.
 *
 * Contents
 *  - `createEmitter(verbosity, sink)`  stamps `t` and `seq`, filters by verbosity, throttles `metric`.
 *  - `makePatch`, `applyPatch`, `invertPatch`, `mergePatches`, `splitPatch`  deltas for the grid view.
 *  - `createView`, `cloneView`  the plain state a patch is applied to (replay engine, tests).
 *  - `capTrace`, `createTraceBuffer`  trace size limit (design.md section 9.4).
 *  - `createStageRunner`  runs one pipeline step: start/end events, timing, budget check.
 *  - `VOCABULARY`  the complete list of event keys, with their arguments. It is the contract between the
 *    producers (core, pipeline, variants) and the consumers (UI, locale packs, tests).
 *
 * Event vocabulary
 *  Every event has `type`, `stepId`, `phase`, `t` (ms since the emitter was created) and `seq` (0, 1, 2,
 *  ... in emission order, so `seq` equals the array index of an uncapped trace), and optionally `i18nKey`,
 *  `i18nArgs`, `patch` and `metrics`. `stepId` is one of the seven step ids, or 'pipeline' for `done` and
 *  for errors that happen outside a step. See `VOCABULARY` below for every key.
 *
 *  Verbosity: 'off' passes only `step` start/end, `done` and `error`. 'summary' adds `step` progress,
 *  `retry` and `metric` (at most one every 50 ms). 'full' adds every `micro` event (each placement,
 *  backtrack and dig).
 *
 *  Patch: `{ cells?: [{i, value, state}], highlight?: [i], unhighlight?: [i] }`. A patch is a delta: it
 *  holds at most 8 cells (`MAX_PATCH_CELLS`), and `highlight` plus `unhighlight` name at most 8 cells
 *  together. It is applied in this order: `cells`, then `unhighlight`, then `highlight`. Cell states:
 *  'empty' (no digit), 'placed' (a digit of the grid or of the puzzle), 'given' (reserved for the UI),
 *  'backtracked' (a cell that the search emptied again; the digit tried is in the event arguments and the
 *  UI flashes it red).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  /** Verbosity levels, from the quietest. */
  const VERBOSITIES = ['off', 'summary', 'full'];
  const LEVEL_OF = { off: 0, summary: 1, full: 2 };

  /** Event types. */
  const TYPES = ['step', 'micro', 'metric', 'retry', 'done', 'error'];

  /** Event phases. */
  const PHASES = ['start', 'progress', 'end'];

  /** The seven canonical steps of design.md section 7.1, in order. */
  const STEP_IDS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];

  /** Cell states a patch may set. */
  const CELL_STATES = ['empty', 'placed', 'given', 'backtracked'];

  /** A patch changes at most this many cells (and highlights at most this many cells). */
  const MAX_PATCH_CELLS = 8;

  /** `metric` events are throttled to one per this many milliseconds. */
  const METRIC_INTERVAL_MS = 50;

  /** Default trace size limit (design.md section 9.4). */
  const DEFAULT_MAX_TRACE_EVENTS = 20000;

  function fail(code, args) {
    return new SG.errors.GenerationError(code, args);
  }

  /** Milliseconds from a monotonic clock where there is one (resolved once, not on every call). */
  const defaultNow = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? function defaultNow() { return performance.now(); }
    : Date.now;

  // ---------------------------------------------------------------------------------------------
  // Plain data
  // ---------------------------------------------------------------------------------------------

  /**
   * Is the value plain data that `structuredClone` and JSON keep intact: null, booleans, finite numbers,
   * strings, and arrays and plain objects made of those?
   * @param {*} value
   * @returns {boolean}
   */
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

  // ---------------------------------------------------------------------------------------------
  // Patches and the view they are applied to
  // ---------------------------------------------------------------------------------------------

  /**
   * @typedef {Object} CellChange
   * @property {number} i        Cell index.
   * @property {number} value    0 for an empty cell, else the digit.
   * @property {string} state    One of `CELL_STATES`.
   */

  /**
   * @typedef {Object} Patch
   * @property {CellChange[]} [cells]
   * @property {number[]} [highlight]    Cells that get the highlight.
   * @property {number[]} [unhighlight]  Cells that lose it.
   */

  /**
   * @typedef {Object} BoardView  The state a patch is applied to; one entry per cell. Not sent anywhere.
   * @property {Int32Array} value
   * @property {string[]} state
   * @property {Uint8Array} highlight  1 while the cell is highlighted.
   */

  function invalidPatch(reason) {
    return fail('events.invalidPatch', { reason: reason });
  }

  function isIndex(x) {
    return Number.isInteger(x) && x >= 0;
  }

  /**
   * Lists everything wrong with a patch (empty for a valid one): unknown fields, malformed cells, an unknown
   * state, too many cells.
   * @param {*} patch
   * @returns {string[]}
   */
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

  /**
   * Builds a validated patch from loose changes. Cells may omit `state` (then 'empty' for value 0, else
   * 'placed'). Empty fields are left out, so the patch of "no change" is `{}`.
   * @param {Object} changes
   * @param {Array<{i: number, value: number, state?: string}>} [changes.cells]
   * @param {ArrayLike<number>} [changes.highlight]
   * @param {ArrayLike<number>} [changes.unhighlight]
   * @returns {Patch} Plain data; at most 8 cells.
   * @throws {SG.errors.GenerationError} 'events.invalidPatch' when the changes are malformed or too large.
   */
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

  /**
   * Creates an empty view: every cell empty, nothing highlighted.
   * @param {number} cellCount
   * @returns {BoardView}
   */
  function createView(cellCount) {
    return {
      value: new Int32Array(cellCount),
      state: new Array(cellCount).fill('empty'),
      highlight: new Uint8Array(cellCount)
    };
  }

  /**
   * @param {BoardView} view
   * @returns {BoardView} An independent copy.
   */
  function cloneView(view) {
    return {
      value: Int32Array.from(view.value),
      state: view.state.slice(),
      highlight: Uint8Array.from(view.highlight)
    };
  }

  /**
   * Applies a patch to a view in place: `cells` first, then `unhighlight`, then `highlight`.
   * @param {BoardView} view
   * @param {Patch} patch
   * @returns {BoardView} The same view.
   * @throws {SG.errors.GenerationError} 'events.invalidPatch' for a cell outside the view.
   */
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

  /**
   * The inverse of a patch: applied to the state AFTER the patch, it restores the state BEFORE it, for every
   * cell and every highlight the patch touched. The replay engine stores it next to each patch to step
   * backwards without recomputation.
   * @param {Patch} patch
   * @param {{value: ArrayLike<number>, state?: ArrayLike<string>, highlight?: ArrayLike<number>}} prevState
   *        The state before the patch (a `BoardView`). Missing `state` entries read as 'empty' / 'placed'
   *        by value, a missing `highlight` as "nothing highlighted".
   * @returns {Patch} A new patch; the inverse of a valid patch is a valid patch.
   */
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

  /**
   * Folds a sequence of patches into one patch with the same net effect (applying it equals applying the
   * sequence): the last write to a cell, and the last highlight or unhighlight of a cell, wins. The result
   * can exceed the 8-cell limit; use `splitPatch` to cut it up again.
   * @param {Patch[]} patches
   * @returns {Patch}
   */
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

  /**
   * Cuts a patch into patches that respect the limits. Applying them one after the other equals applying
   * the original.
   * @param {Patch} patch
   * @returns {Patch[]} At least one patch (the empty patch stays one empty patch).
   */
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

  // ---------------------------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------------------------

  /**
   * @typedef {Object} GenerationEvent
   * @property {'step'|'micro'|'metric'|'retry'|'done'|'error'} type
   * @property {string} stepId   A step id, or 'pipeline'.
   * @property {'start'|'progress'|'end'} phase
   * @property {number} t        Milliseconds since the emitter was created.
   * @property {number} seq      0, 1, 2, ... in emission order.
   * @property {string} [i18nKey]
   * @property {Object} [i18nArgs]  Plain data inserted into the translation (and read by the UI).
   * @property {Patch} [patch]
   * @property {Object<string, number>} [metrics]  { clues, accepted, rejected, attempts, placed, backtracks,
   *           restarts, score }, whichever apply to the step.
   */

  /**
   * The event factory: a complete event from its parts. Optional parts that are undefined or null are
   * left out.
   * @param {string} type
   * @param {string} stepId
   * @param {string} phase
   * @param {number} seq
   * @param {number} t
   * @param {Object} [fields]  { i18nKey, i18nArgs, patch, metrics }
   * @returns {GenerationEvent}
   */
  function createEvent(type, stepId, phase, seq, t, fields) {
    const ev = { type: type, stepId: stepId, phase: phase, t: t, seq: seq };
    const f = fields || {};
    if (f.i18nKey !== undefined && f.i18nKey !== null) ev.i18nKey = f.i18nKey;
    if (f.i18nArgs !== undefined && f.i18nArgs !== null) ev.i18nArgs = f.i18nArgs;
    if (f.patch !== undefined && f.patch !== null) ev.patch = f.patch;
    if (f.metrics !== undefined && f.metrics !== null) ev.metrics = f.metrics;
    return ev;
  }

  /**
   * Lists everything wrong with an event (empty for a valid one): the shape of every field, plain data
   * only, patch limits.
   * @param {*} event
   * @returns {string[]}
   */
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

  // ---------------------------------------------------------------------------------------------
  // Emitter
  // ---------------------------------------------------------------------------------------------

  /**
   * @typedef {Object} Emitter
   * @property {boolean} isEmitter       Always true.
   * @property {string} verbosity        'off' | 'summary' | 'full'.
   * @property {boolean} wantsMicro      True when `micro` events reach a sink. The hot paths of the core
   *           pick their instrumented variant once, at entry, from this flag; with a quiet emitter they
   *           run the plain code, so instrumentation costs nothing there.
   * @property {boolean} wantsMetrics    True when `metric` events reach a sink.
   * @property {number} count            Events handed to the sink so far.
   * @property {?BoardView} view         What the replay of the emitted events would show (null until
   *           bound).
   * @property {function(Object): boolean} emit  Generic entry: a partial event `{type, stepId, phase,
   *           i18nKey, i18nArgs, patch, metrics}`; returns whether the sink got it.
   * @property {function(string, string, string, Object=, Object=): void} step
   *           `(stepId, phase, i18nKey, i18nArgs, metrics)`.
   * @property {function(string, string, Object=, Object=, Object=): void} micro
   *           `(stepId, i18nKey, i18nArgs, patch, metrics)`.
   * @property {function(string, (Object|function(): Object)): void} metric  `(stepId, metrics)`,
   *           throttled to one per 50 ms; `metrics` may be a function that is only called when the event
   *           is sent.
   * @property {function(string, string, Object=, Object=): void} retry
   *           `(stepId, i18nKey, i18nArgs, metrics)`.
   * @property {function(Object=, Object=): void} done  `(i18nArgs, metrics)`; stepId 'pipeline', key
   *           'done'.
   * @property {function(string, *): void} error  `(stepId, error)`; key 'error.' + error.code.
   * @property {function(number): BoardView} bindBoard  Starts tracking the view for a board of that size.
   * @property {function(string, string, Object, ArrayLike<number>): number} syncBoard  Emits chunked
   *           patches that bring the replayed board to the given values; returns the number of events.
   * @property {function(string, string, Object): number} clearBoard  `syncBoard` to an empty board.
   * @property {function(string, string, Object, CellChange[], Object=): number} microChunks  Emits one
   *           `micro` event per 8 cells, all with the same key (`part` and `parts` added to the arguments
   *           when it takes more than one); returns the number of events.
   * @property {function(string): void} setVerbosity
   */

  /**
   * Creates an emitter. The sink receives each event that the verbosity lets through, in order, with `t`
   * and `seq` stamped on. A null sink is allowed: nothing is built or sent, and every method does nothing.
   *
   * @param {string} verbosity  'off' | 'summary' | 'full'.
   * @param {?function(GenerationEvent): void} sink
   * @param {Object} [options]
   * @param {function(): number} [options.now]  Clock in milliseconds (default: `performance.now`).
   * @param {number} [options.metricIntervalMs=50]
   * @returns {Emitter}
   * @throws {SG.errors.GenerationError} 'events.invalidVerbosity', 'events.invalidSink'.
   */
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

  /** The emitter that drops everything. Shared; it has no state worth sharing. */
  const NULL_EMITTER = createEmitter('off', null);

  /**
   * Turns whatever a caller passed as `emit` into an emitter: an emitter stays as it is, a plain function
   * becomes a 'full' emitter that feeds it (a bare callback wants everything), and null or undefined become
   * the shared `NULL_EMITTER`.
   * @param {?(Emitter|function(GenerationEvent): void)} target
   * @returns {Emitter}
   */
  function toEmitter(target) {
    if (target !== null && target !== undefined) {
      if (target.isEmitter === true) return target;
      if (typeof target === 'function') return createEmitter('full', target);
    }
    return NULL_EMITTER;
  }

  // ---------------------------------------------------------------------------------------------
  // Pipeline steps
  // ---------------------------------------------------------------------------------------------

  /**
   * Creates the runner of pipeline steps. `stage(stepId, args, fn)` emits the step's start event, checks
   * the budget (so a cancel is noticed at every step boundary), calls `fn(scope)`, emits the end event,
   * and adds the elapsed time to `stage.timings[stepId]`. `fn` can set `scope.args` and `scope.metrics`,
   * which go into the end event, and its return value is the return value of `stage`. When `fn` throws,
   * no end event is sent and `stage.current` keeps the id of the step that failed.
   *
   * @param {Emitter} emitter
   * @param {Object} [options]
   * @param {Object} [options.budget]   A `SG.budget`; checked at every step start.
   * @param {Object} [options.timings]  Object that collects milliseconds per step id (default: a new one).
   * @param {function(): number} [options.now]
   * @returns {function(string, Object, function(Object): *): *}
   */
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

  // ---------------------------------------------------------------------------------------------
  // Trace size limit (design.md section 9.4)
  // ---------------------------------------------------------------------------------------------

  /** Calls `fn` with every cell index that a patch mentions. */
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

  /**
   * Keeps exactly `keepMicro` of the `microTotal` micro events (spread evenly) and every other event. What
   * the dropped events changed is made up for by synthesized 'trace.coalesced' events placed just before
   * the next kept event: two boards are tracked, the one the original trace has reached (`truth`) and the
   * one the capped trace has shown so far (`shown`), and a synthesized event carries exactly the cells and
   * highlights on which they differ. A highlight that was set and cleared again, or a digit that was
   * placed and backtracked, therefore costs nothing.
   */
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

  /**
   * Limits a trace to `maxEvents` events by thinning out the `micro` events (design.md section 9.4).
   * Every other event (`step`, `metric`, `retry`, `done`, `error`) is always kept. The kept `micro`
   * events are spread evenly over the trace. What the dropped events changed is not lost: it is carried
   * by synthesized `micro` events with the key 'trace.coalesced' (arguments `dropped`, and `part` /
   * `parts` when it takes several), placed just before the next kept event and carrying its `seq` and
   * `t` (so `seq` never decreases, and is unique among the original events). The replay still ends on
   * exactly the same board, with the same states and highlights. As many micro events are kept as the
   * limit allows. If the step events alone exceed the limit, all micro events go and only the
   * synthesized events remain.
   *
   * @param {GenerationEvent[]} events
   * @param {number} [maxEvents=20000]
   * @returns {GenerationEvent[]} A new array (the original events are shared, not copied).
   */
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

  /**
   * @typedef {Object} TraceBuffer
   * @property {function(GenerationEvent): void} push
   * @property {function(): GenerationEvent[]} events  The trace, within the limit (a new array).
   * @property {function(): void} clear
   * @property {number} size     Events currently held.
   * @property {number} dropped  Events thinned out so far.
   */

  /**
   * A growing trace that never holds much more than `maxTraceEvents` events: when it gets a quarter over the
   * limit it is thinned with `capTrace`, so the cost stays amortised. Clear it before the next generation.
   * @param {Object} [options]
   * @param {number} [options.maxTraceEvents=20000]
   * @returns {TraceBuffer}
   */
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

  // ---------------------------------------------------------------------------------------------
  // Vocabulary
  // ---------------------------------------------------------------------------------------------

  /**
   * @typedef {Object} VocabularyEntry
   * @property {string} type
   * @property {string} stepId   '*' = any step.
   * @property {string} phase
   * @property {?string} key     The `i18nKey`; null for `metric` events, which have none. 'error.*' stands
   *           for 'error.' plus any error code.
   * @property {string} level    The lowest verbosity that emits it: 'off', 'summary' or 'full'.
   * @property {string[]} args   Names that may appear in `i18nArgs`. `part` and `parts` (and `count` on
   *           events with cell patches) are allowed on any `micro` event that carries cells.
   * @property {string[]} patch  Patch fields the event may carry: 'cells', 'highlight', 'unhighlight'.
   */

  function entry(type, stepId, phase, key, level, args, patch) {
    return {
      type: type, stepId: stepId, phase: phase, key: key, level: level, args: args || [], patch: patch || []
    };
  }

  /**
   * Every event the core emits. Locale packs must define a translation for every `key`; the UI reads the
   * `args`. Per step:
   *  - 1 configure: start, config, end.
   *  - 2 buildModel: start, model, spec, traceDowngraded, end.
   *  - 3 fullGrid: start, clear, fixed, seed, place, conflict, backtrack, restart, end.
   *  - 4 extraStructure: start, none, built, end.
   *  - 5 dig: start, restore, pass.start, skip, try, accept, reject, keep, pass.end, verify, unsound, end,
   *    and `metric` events.
   *  - 6 rate: start, technique, result, end.
   *  - 7 tune: start, hit, miss, best, final, end.
   *  - run level: `retry.difficulty`, `done`, `error.<code>`, `trace.coalesced`.
   * @type {VocabularyEntry[]}
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

  /**
   * Finds the vocabulary entry of an event.
   * @param {GenerationEvent} event
   * @returns {?VocabularyEntry}
   */
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

  /**
   * @returns {string[]} Every distinct `i18nKey` of the vocabulary, sorted ('error.*' stands for the
   *          error codes).
   */
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
