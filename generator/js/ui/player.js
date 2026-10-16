/**
 * Replay player (task T-4.6; design.md sections 7.3, 9.4 and 10.3): replays the recorded event trace of a
 * generation on the board, at the speed the user picked, forward and backward, with a scrubber.
 *
 * Two layers, so everything can be tested in Node:
 *  - `SG.player.createEngine(events, options)`  the PURE engine: no DOM, no timers, no rAF. It holds the
 *    trace, one working view, a checkpoint (a cloned view) every 500 events and the inverse patch of every
 *    patch event, and moves to any position on demand.
 *  - `SG.player.create(options)`  the thin layer: a time-based rAF loop, the board, the transport controls
 *    of `#player-root` and the two callbacks of the app. It owns no panel: the steps panel and the
 *    explanation card derive their state from the `position` it reports.
 *
 * Vocabulary
 *  - POSITION `p` (0 .. length): how many events are applied. The board shows the first `p` events; the
 *    CURRENT EVENT is `events[p - 1]` (null at position 0). `seek(p)`, `layersAt(p)`, `stepAt(p)` and the
 *    scrubber work in positions; `eventAt(i)`, `inverseAt(i)` and `highlightFlash(i)` take an event INDEX.
 *  - MEANINGFUL EVENT: the events that manual mode (and the pacing of `fast` / `step`) stops at. An event is
 *    meaningful unless it is (a) a `metric` event, or (b) a `micro` event with no board change at all
 *    (`dig.skip`, `dig.pass.start`, `dig.pass.end`: bookkeeping). So these are meaningful: every event with a
 *    non-empty patch (a digit placed, removed or cleared, a probing frame set or cleared), every `step`
 *    event (start, progress and end, they carry the narration: techniques found, verdicts, the structure
 *    built), every `retry`, `done` and `error`. The STOPS of manual stepping are position 0 and the position
 *    right after each meaningful event, so `step(+1)` then `step(-1)` always comes back to the same stop.
 *
 * Speeds (design.md section 7.3)
 *  - instant  `load()` / `play()` / choosing it jump straight to the FINAL position: no replay and no
 *             animation. The buttons keep working (they step like manual mode).
 *  - fast     ~200 meaningful events per second, board animations off (they could not keep up).
 *  - step     ~8 meaningful events per second, animations on.
 *  - manual   nothing moves by itself; next (and play) advance exactly one meaningful event.
 *  The speed is time based (an accumulator fed by the elapsed milliseconds), so it does not depend on the
 *  frame rate. A frame never applies more than `MAX_TICKS_PER_FRAME` events and never counts a gap longer
 *  than `MAX_FRAME_MS` (a background tab does not run away when it wakes up).
 *
 * Streaming: `push(event)` buffers silently (nothing is drawn, no callback). `finish()` completes the trace
 * and then, like `load()`, replays from the start with the current speed. `play()` before `finish()` follows
 * the buffer live: the replay waits at the end of what has arrived and carries on when more comes in.
 *
 * Contract for the app (see also the JSDoc of `create`): build the board (from the final model) before the
 * first `load` / `push`; call `reset()` when a new generation starts; write the status line from
 * `describe(position)` on every `onPosition` and again on a language change.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  if (SG.player && typeof SG.player.create === 'function') return;

  /** The four speeds, in the order of the buttons. */
  const SPEEDS = Object.freeze(['instant', 'fast', 'step', 'manual']);

  /** Meaningful events per second of the two timed speeds. */
  const RATES = Object.freeze({ fast: 200, step: 8 });

  /** One checkpoint (a cloned view) per this many events. */
  const CHECKPOINT_EVERY = 500;

  /** Longest gap between two frames that is counted, in milliseconds. */
  const MAX_FRAME_MS = 1000;

  /** Most events one frame applies. */
  const MAX_TICKS_PER_FRAME = 120;

  /** A move of at most this many events is replayed patch by patch on the board, a longer one redraws it. */
  const PATCH_SYNC_MAX = 64;

  /** The board layers the player shows and hides, in drawing order. */
  const LAYER_NAMES = Object.freeze(['regions', 'overlays', 'grid', 'cells', 'cages', 'ineq', 'word']);

  const NO_LAYERS = Object.freeze([]);
  const BASE_LAYERS = Object.freeze(['regions', 'overlays', 'grid', 'cells']);
  const ALL_LAYERS = LAYER_NAMES;

  const PROBE_CLASS = 'cell--probing';

  /** Milliseconds from a monotonic clock where there is one. */
  const defaultNow = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? function defaultNow() { return performance.now(); }
    : Date.now;

  // ---------------------------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------------------------

  /** Does the patch change anything: a cell, a highlight or an unhighlight? */
  function patchChanges(patch) {
    if (patch === undefined || patch === null) return false;
    return (patch.cells !== undefined && patch.cells.length > 0) ||
      (patch.highlight !== undefined && patch.highlight.length > 0) ||
      (patch.unhighlight !== undefined && patch.unhighlight.length > 0);
  }

  /**
   * The "meaningful event" rule of manual stepping (see the file header): every event except a `metric` and
   * a `micro` event without a board change.
   * @param {Object} event  A `GenerationEvent`.
   * @returns {boolean}
   */
  function isMeaningful(event) {
    if (event === null || typeof event !== 'object' || event.type === 'metric') return false;
    if (patchChanges(event.patch)) return true;
    return event.type === 'step' || event.type === 'retry' || event.type === 'done' ||
      event.type === 'error';
  }

  /** One more than the highest cell index any patch of the events mentions (0 for none). */
  function inferCellCount(events) {
    let max = -1;
    function see(list) {
      if (list === undefined) return;
      for (let j = 0; j < list.length; j++) if (list[j] > max) max = list[j];
    }
    for (let k = 0; k < events.length; k++) {
      const patch = events[k] && events[k].patch;
      if (patch === undefined || patch === null) continue;
      if (patch.cells !== undefined) {
        for (let j = 0; j < patch.cells.length; j++) if (patch.cells[j].i > max) max = patch.cells[j].i;
      }
      see(patch.highlight);
      see(patch.unhighlight);
    }
    return max + 1;
  }

  function listOf(first, second) {
    if (Array.isArray(first)) return first.slice();
    return Array.isArray(second) ? second.slice() : [];
  }

  /**
   * What the board does by itself or must be told to do for one event.
   * @typedef {Object} Flash
   * @property {string} cls    Board class: 'cell--restored', 'cell--removed', 'cell--backtrack' or
   *           'cell--probing'.
   * @property {number[]} cells
   * @property {boolean} auto  True when `board.applyPatch` already draws it (removal, backtrack flash,
   *           probing frame); false when the player has to call `board.highlight(cells, cls)` (the red
   *           "restored" frame after a rejected dig: the patch of `dig.reject` only clears the probe).
   */

  /**
   * @param {?Object} event
   * @returns {?Flash} The one-shot effect of the event, or null when it has none.
   */
  function flashOf(event) {
    if (!event || typeof event.i18nKey !== 'string') return null;
    const args = event.i18nArgs || {};
    const patch = event.patch || {};
    switch (event.i18nKey) {
      case 'dig.reject':
        return { cls: 'cell--restored', cells: listOf(args.cells, patch.unhighlight), auto: false };
      case 'dig.accept':
        return {
          cls: 'cell--removed',
          cells: (patch.cells || []).filter(function (c) { return c.value === 0; })
            .map(function (c) { return c.i; }),
          auto: true
        };
      case 'dig.try':
        return { cls: PROBE_CLASS, cells: listOf(patch.highlight, args.cells), auto: true };
      case 'fullGrid.backtrack':
      case 'fullGrid.conflict':
        return {
          cls: 'cell--backtrack',
          cells: (patch.cells || []).filter(function (c) { return c.state === 'backtracked'; })
            .map(function (c) { return c.i; }),
          auto: true
        };
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Engine
  // ---------------------------------------------------------------------------------------------

  /**
   * @typedef {Object} ReplayEngine
   * @property {number} length       Events held.
   * @property {number} position     Events applied (0 .. length).
   * @property {boolean} complete    No more events will come.
   * @property {number} cellCount
   * @property {number} checkpointEvery
   * @property {function(Object): void} push  Adds an event to a trace that is still open.
   * @property {function(): void} finish      Closes the trace.
   * @property {function(number): number} seek  Moves to a position (clamped); returns it.
   * @property {function(number, number=): number} step  `(dir, count = 1)` moves by meaningful events.
   * @property {function(number): number} advance  Moves by raw events (negative = backward).
   * @property {function(): Object} view     The live `SG.events` view at `position` (read only).
   * @property {function(): number[]} litCells  Cells that are highlighted in the view.
   * @property {function(number): ?Object} eventAt
   * @property {function(number): ?Object} inverseAt
   * @property {function(number): boolean} isMeaningful
   * @property {function(string, number=): number} stepIndex
   * @property {function(number): ?string} stepAt
   * @property {function(number): string[]} layersAt
   * @property {function(number): ?Flash} highlightFlash
   * @property {function(number): ?Object} metricsAt
   * @property {function(number): number} timeAt
   * @property {function(): number} totalTime
   * @property {function(number): number} positionOfSeq
   * @property {function(): number[]} checkpointPositions
   */

  /**
   * Creates the replay engine for a trace. Moving costs at most one checkpoint interval of patches: a seek
   * starts from the nearest checkpoint at or before the target, and a short step backward applies stored
   * inverse patches, so no move ever re-runs the whole trace. The checkpoints and inverse patches are built
   * while the events are added (`push` is O(1) per event), the view always equals applying the first
   * `position` events from scratch.
   *
   * @param {Object[]} events  The trace so far (may be empty); `seq` is expected to follow the array order.
   * @param {Object} [options]
   * @param {number} [options.cellCount]  Cells of the board; required for a trace that starts empty,
   *        otherwise inferred from the patches.
   * @param {number} [options.checkpointEvery=500]
   * @param {boolean} [options.complete=true]  `false` keeps the trace open for `push` until `finish()`.
   * @returns {ReplayEngine}
   * @throws {SG.errors.GenerationError} 'events.invalidPatch' for a patch outside the board.
   */
  function createEngine(events, options) {
    const opts = options || {};
    const E = SG.events;
    const initial = Array.isArray(events) ? events : [];
    const cellCount = Number.isInteger(opts.cellCount) && opts.cellCount > 0 ? opts.cellCount
      : inferCellCount(initial);
    const every = opts.checkpointEvery >= 1 ? Math.floor(opts.checkpointEvery) : CHECKPOINT_EVERY;

    const list = [];
    const meaningful = [];
    const inverses = [];
    const metricRef = [];
    const firstOf = Object.create(null);
    const runsOf = Object.create(null);
    const builder = E.createView(cellCount);
    const view = E.createView(cellCount);
    const checkpoints = [E.cloneView(builder)];
    let position = 0;
    let complete = false;

    function add(event) {
      const k = list.length;
      const patch = event.patch;
      let inverse = null;
      if (patchChanges(patch)) {
        inverse = E.invertPatch(patch, builder);
        E.applyPatch(builder, patch);
      }
      list.push(event);
      inverses.push(inverse);
      meaningful.push(isMeaningful(event) ? 1 : 0);
      const before = k > 0 ? list[k - 1] : null;
      let ref = -1;
      if (event.metrics) ref = k;
      else if (before !== null && before.stepId === event.stepId) ref = metricRef[k - 1];
      metricRef.push(ref);
      if (firstOf[event.stepId] === undefined) firstOf[event.stepId] = k;
      if (event.type === 'step' && event.phase === 'start') {
        (runsOf[event.stepId] = runsOf[event.stepId] || []).push(k);
      }
      if ((k + 1) % every === 0) checkpoints.push(E.cloneView(builder));
    }

    function restore(index) {
      const cp = checkpoints[index];
      view.value.set(cp.value);
      view.highlight.set(cp.highlight);
      for (let i = 0; i < cellCount; i++) view.state[i] = cp.state[i];
      position = index * every;
    }

    function forwardTo(target) {
      for (let k = position; k < target; k++) {
        const patch = list[k].patch;
        if (patch !== undefined) E.applyPatch(view, patch);
      }
      position = target;
    }

    function backwardTo(target) {
      for (let k = position - 1; k >= target; k--) {
        if (inverses[k] !== null) E.applyPatch(view, inverses[k]);
      }
      position = target;
    }

    function seek(index) {
      const wanted = Math.floor(Number(index));
      if (!isFinite(wanted)) return position;
      const target = Math.max(0, Math.min(list.length, wanted));
      if (target === position) return position;
      const base = Math.floor(target / every);
      if (target > position) {
        if (base * every > position) restore(base);
        forwardTo(target);
      } else if (position - target <= (target - base * every) + 16) {
        backwardTo(target);
      } else {
        restore(base);
        forwardTo(target);
      }
      return position;
    }

    function step(dir, count) {
      let n = count === undefined ? 1 : Math.max(1, Math.floor(count));
      let p = position;
      if (!(dir < 0)) {
        while (n-- > 0 && p < list.length) {
          let k = p;
          while (k < list.length && meaningful[k] === 0) k++;
          p = k < list.length ? k + 1 : list.length;
        }
      } else {
        while (n-- > 0 && p > 0) {
          let k = p - 2;
          while (k >= 0 && meaningful[k] === 0) k--;
          p = k >= 0 ? k + 1 : 0;
        }
      }
      return seek(p);
    }

    function started(stepId, pos) {
      const first = firstOf[stepId];
      return first === undefined ? complete : pos > first;
    }

    const engine = {
      get length() { return list.length; },
      get position() { return position; },
      get complete() { return complete; },
      cellCount: cellCount,
      checkpointEvery: every,

      /**
       * Adds an event to a trace created with `complete: false`.
       * @param {Object} event
       * @throws {Error} When the trace is already complete.
       */
      push: function push(event) {
        if (complete) throw new Error('SG.player engine: the trace is already complete');
        add(event);
      },

      /** Closes the trace: no more events, and a finished trace shows every layer at its end. */
      finish: function finish() {
        complete = true;
      },

      seek: seek,
      step: step,

      /**
       * Moves by raw events.
       * @param {number} n  Positive = forward, negative = backward.
       * @returns {number} The new position.
       */
      advance: function advance(n) {
        return seek(position + Math.floor(Number(n) || 0));
      },

      /** @returns {Object} The live view (`SG.events.createView` shape) at the current position. */
      view: function viewOf() { return view; },

      /** @returns {number[]} The highlighted cells of the view. */
      litCells: function litCells() {
        const out = [];
        for (let i = 0; i < cellCount; i++) if (view.highlight[i] === 1) out.push(i);
        return out;
      },

      /** @returns {?Object} The event at an INDEX, null outside the trace. */
      eventAt: function eventAt(i) { return list[i] || null; },

      /** @returns {?Object} The inverse patch of the event at an index (null: no board change). */
      inverseAt: function inverseAt(i) { return inverses[i] || null; },

      /** @returns {boolean} Whether the event at an index is meaningful (see the file header). */
      isMeaningful: function isMeaningfulAt(i) { return meaningful[i] === 1; },

      /**
       * Index of the first event of a step: the start event of the step (or of its `run`-th run, counted
       * from 0, a step repeats after a missed dig sample or a retry). `seek(stepIndex + 1)` shows the board
       * as that step begins.
       * @param {string} stepId
       * @param {number} [run=0]
       * @returns {number} -1 when the trace has no such step.
       */
      stepIndex: function stepIndex(stepId, run) {
        if (run === undefined || run === 0) return firstOf[stepId] === undefined ? -1 : firstOf[stepId];
        const runs = runsOf[stepId];
        return runs !== undefined && runs[run] !== undefined ? runs[run] : -1;
      },

      /** @returns {?string} The step of the current event at a POSITION (null at position 0). */
      stepAt: function stepAt(p) {
        const ev = list[p - 1];
        return ev === undefined ? null : ev.stepId;
      },

      /**
       * The board layers to show at a POSITION: nothing before the model is built (step 2), the regions,
       * overlays, grid lines and cell backgrounds from step 2 on, and cages, inequality signs and the word
       * line from step 4 (`extraStructure`) on. The end of a complete trace shows everything, and so does a
       * complete trace that lacks those steps (an open trace waits for them).
       * @param {number} p
       * @returns {string[]} Names for `board.setLayerVisible`, a subset of `LAYER_NAMES`.
       */
      layersAt: function layersAt(p) {
        if (list.length === 0) return NO_LAYERS;
        if (complete && p >= list.length) return ALL_LAYERS;
        if (!started('buildModel', p)) return NO_LAYERS;
        return started('extraStructure', p) ? ALL_LAYERS : BASE_LAYERS;
      },

      /**
       * The one-shot effect of the event at an INDEX: `dig.reject` gives the red 'cell--restored' frame
       * the player must draw itself (`auto: false`), `dig.accept`, `fullGrid.backtrack`, `fullGrid.conflict`
       * and `dig.try` give what `board.applyPatch` already draws (`auto: true`).
       * @param {number} i
       * @returns {?Flash}
       */
      highlightFlash: function highlightFlash(i) { return flashOf(list[i]); },

      /**
       * The latest metrics of the step the current event at a POSITION belongs to.
       * @param {number} p
       * @returns {?Object} `event.metrics` of the latest event of the step that had some, or null.
       */
      metricsAt: function metricsAt(p) {
        const ref = p > 0 && p <= list.length ? metricRef[p - 1] : -1;
        return ref >= 0 ? list[ref].metrics : null;
      },

      /** @returns {number} `t` (ms of the generation) of the current event at a POSITION; 0 at the start. */
      timeAt: function timeAt(p) {
        const ev = list[p - 1];
        return ev !== undefined && isFinite(ev.t) ? ev.t : 0;
      },

      /** @returns {number} `t` of the last event. */
      totalTime: function totalTime() {
        const ev = list[list.length - 1];
        return ev !== undefined && isFinite(ev.t) ? ev.t : 0;
      },

      /**
       * The position after all events with `seq <= seq` (events are in `seq` order; a capped trace repeats
       * a `seq` on purpose, both events count). For the steps panel, which keeps `seq` positions.
       * @param {number} seq
       * @returns {number}
       */
      positionOfSeq: function positionOfSeq(seq) {
        let lo = 0;
        let hi = list.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (list[mid].seq <= seq) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      },

      /** @returns {number[]} The positions that have a checkpoint (0, 500, 1000, ...). */
      checkpointPositions: function checkpointPositions() {
        return checkpoints.map(function (cp, k) { return k * every; });
      }
    };

    for (let k = 0; k < initial.length; k++) add(initial[k]);
    complete = opts.complete !== false;
    return engine;
  }

  // ---------------------------------------------------------------------------------------------
  // Player
  // ---------------------------------------------------------------------------------------------

  function T(key, args) {
    return SG.i18n && typeof SG.i18n.t === 'function' ? SG.i18n.t(key, args) : key;
  }

  function stepName(stepId) {
    const key = 'step.' + stepId + '.name';
    return SG.i18n && typeof SG.i18n.has === 'function' && SG.i18n.has(key) ? T(key) : String(stepId);
  }

  function formatTime(ms) {
    return SG.i18n && typeof SG.i18n.formatDuration === 'function' ? SG.i18n.formatDuration(ms)
      : String(Math.round(ms)) + ' ms';
  }

  function defaultRaf(callback) {
    if (typeof root.requestAnimationFrame === 'function') return root.requestAnimationFrame(callback);
    return root.setTimeout(function () { callback(defaultNow()); }, 16);
  }

  function defaultCaf(id) {
    if (typeof root.cancelAnimationFrame === 'function') root.cancelAnimationFrame(id);
    else root.clearTimeout(id);
  }

  /**
   * @typedef {Object} PlayerState
   * @property {number} position
   * @property {number} length
   * @property {boolean} playing
   * @property {string} speed      'instant' | 'fast' | 'step' | 'manual'.
   * @property {boolean} finished  The trace is complete and the position is at its end.
   * @property {boolean} complete  The trace is complete (loaded, or `finish()` was called).
   */

  /**
   * @typedef {Object} PositionInfo  What `onPosition` receives after every change of the position.
   * @property {number} position   Events applied.
   * @property {number} length     Events held so far.
   * @property {?Object} event     The current event, `events[position - 1]` (null at position 0, and after
   *           `reset()`).
   * @property {?string} stepId    `event.stepId`.
   * @property {?string} phase     `event.phase`.
   * @property {string} direction  'forward' (play, next), 'backward' (prev) or 'seek' (everything else).
   * @property {?Object} metrics   Latest `event.metrics` of the current step (see `engine.metricsAt`).
   */

  /**
   * Creates the player.
   *
   * @param {Object} [options]
   * @param {Object} [options.board]  A `SG.boardView` view: `applyPatch`, `setValues`, `highlight`,
   *        `clearHighlights`, `setLayerVisible`, `setAnimate`, `setGivens`, `pulseDone`, `getState` are used
   *        (each only if it exists). Without a board only the callbacks and the controls work.
   * @param {function(PositionInfo): void} [options.onPosition]  Called after every change of the position.
   * @param {function(PlayerState): void} [options.onStateChange]  Called when play / pause, the speed, the
   *        length or the finished flag change.
   * @param {function(): number} [options.now]   Clock in ms (default `performance.now`).
   * @param {function(function): *} [options.raf]  Default `requestAnimationFrame`.
   * @param {function(*): void} [options.caf]      Default `cancelAnimationFrame`.
   * @param {string} [options.speed='fast']
   * @param {Object} [options.model]  The puzzle model, to name cells in `describe`.
   * @param {function(number): string} [options.cellLabel]  The same, as a function.
   * @param {number} [options.cellCount]  Cells of the board when there is no board to ask (a streamed
   *        trace needs the count up front; `load` can also infer it from the patches).
   * @param {{fast?: number, step?: number}} [options.rates]  Override of `RATES`.
   * @param {boolean} [options.manageAnimation=true]  Switch the board's per-cell animation off (with
   *        `board.setAnimate(false)`) while playing fast and back on afterwards; `false` leaves the flag to
   *        the app.
   * @returns {Object} The player: `load, push, finish, play, pause, toggle, next, prev, first, last, seek,
   *          seekToStep, seekToSeq, setSpeed, getSpeed, state, describe, bindControls, reset, destroy,
   *          engine`.
   */
  function create(options) {
    const o = options || {};
    const board = o.board || null;
    const now = typeof o.now === 'function' ? o.now : defaultNow;
    const raf = typeof o.raf === 'function' ? o.raf : defaultRaf;
    const caf = typeof o.caf === 'function' ? o.caf : defaultCaf;
    const rates = Object.assign({}, RATES, o.rates || {});
    const onPosition = typeof o.onPosition === 'function' ? o.onPosition : null;
    const onStateChange = typeof o.onStateChange === 'function' ? o.onStateChange : null;

    let speed = SPEEDS.indexOf(o.speed) !== -1 ? o.speed : 'fast';
    let engine = null;
    let session = 0;
    let playing = false;
    let rafId = null;
    let lastTime = 0;
    let accumulator = 0;
    let destroyed = false;
    let sessionOpts = { model: o.model, cellLabel: o.cellLabel, givens: null, autoplay: true };
    let animateOn = true;
    let layerKey = null;
    let givensShown = false;
    let finalReplaced = false;
    let stateKey = '';
    let ui = null;

    // ---- board ----------------------------------------------------------------------------------

    function callBoard(name, a, b) {
      if (board !== null && typeof board[name] === 'function') board[name](a, b);
    }

    function boardCellCount() {
      if (board === null || typeof board.getState !== 'function') return 0;
      return board.getState().values.length;
    }

    /** The cell count of a new trace: the one given, else the board's, else `options.cellCount`. */
    function knownCellCount(explicit) {
      if (explicit > 0) return explicit;
      const fromBoard = boardCellCount();
      if (fromBoard > 0) return fromBoard;
      return o.cellCount > 0 ? o.cellCount : undefined;
    }

    function wantAnimate() {
      return !(playing && speed === 'fast');
    }

    function applyAnimatePolicy() {
      if (o.manageAnimation === false) return;
      const want = wantAnimate();
      if (want === animateOn) return;
      animateOn = want;
      callBoard('setAnimate', want);
    }

    function applyLayers() {
      if (board === null || typeof board.setLayerVisible !== 'function') return;
      const visible = engine === null ? NO_LAYERS : engine.layersAt(engine.position);
      const key = visible.join(',');
      if (key === layerKey) return;
      layerKey = key;
      LAYER_NAMES.forEach(function (name) { board.setLayerVisible(name, visible.indexOf(name) !== -1); });
    }

    function viewEqualsGivens() {
      const have = engine.view().value;
      const want = sessionOpts.givens;
      if (have.length !== want.length) return false;
      for (let i = 0; i < have.length; i++) if (have[i] !== want[i]) return false;
      return true;
    }

    /**
     * At the end of the trace with `givens`, the board shows the result itself (a trace without patches,
     * 'summary' or 'off', replays no digits) drawn as clues; anywhere else it shows the replayed view.
     */
    function applyFinal() {
      if (board === null || sessionOpts.givens === null) return;
      const want = engine !== null && atEnd();
      if (want === givensShown) return;
      givensShown = want;
      if (want) {
        finalReplaced = !viewEqualsGivens();
        if (finalReplaced) callBoard('setValues', sessionOpts.givens);
        callBoard('setGivens', sessionOpts.givens);
      } else {
        callBoard('setGivens', null);
        if (finalReplaced) {
          finalReplaced = false;
          resyncBoard();
        }
      }
    }

    function dropFinal() {
      if (givensShown) callBoard('setGivens', null);
      givensShown = false;
      finalReplaced = false;
    }

    function resyncBoard() {
      if (board === null) return;
      if (engine === null) {
        callBoard('setValues', new Int32Array(boardCellCount()));
        callBoard('clearHighlights');
        return;
      }
      const v = engine.view();
      callBoard('setValues', v.value, v.state);
      callBoard('clearHighlights');
      const lit = engine.litCells();
      if (lit.length > 0) callBoard('highlight', lit, PROBE_CLASS);
    }

    function syncBoard(from, to, animate) {
      if (board === null) return;
      const span = to > from ? to - from : from - to;
      if (span > PATCH_SYNC_MAX) {
        resyncBoard();
        return;
      }
      if (to > from) {
        for (let k = from; k < to; k++) {
          const patch = engine.eventAt(k).patch;
          if (patch !== undefined) board.applyPatch(patch, { animate: animate });
          if (animate) {
            const flash = engine.highlightFlash(k);
            if (flash !== null && flash.auto === false && flash.cells.length > 0) {
              callBoard('highlight', flash.cells, flash.cls);
            }
          }
        }
      } else {
        for (let k = from - 1; k >= to; k--) {
          const inverse = engine.inverseAt(k);
          if (inverse !== null) board.applyPatch(inverse, { animate: false });
        }
      }
    }

    // ---- state ----------------------------------------------------------------------------------

    function atEnd() {
      return engine !== null && engine.length > 0 && engine.complete && engine.position >= engine.length;
    }

    function canAct() {
      return !destroyed && engine !== null && engine.length > 0;
    }

    function state() {
      return {
        position: engine === null ? 0 : engine.position,
        length: engine === null ? 0 : engine.length,
        playing: playing,
        speed: speed,
        finished: atEnd(),
        complete: engine !== null && engine.complete
      };
    }

    function safely(fn, arg) {
      try {
        fn(arg);
      } catch (err) {
        if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
      }
    }

    function emitState() {
      const s = state();
      const key = [s.length, s.playing, s.speed, s.finished, s.complete].join('|');
      if (key === stateKey) return;
      stateKey = key;
      if (onStateChange !== null) safely(onStateChange, s);
    }

    function emitPosition(direction) {
      if (onPosition === null) return;
      const p = engine === null ? 0 : engine.position;
      const ev = engine === null ? null : engine.eventAt(p - 1);
      safely(onPosition, {
        position: p,
        length: engine === null ? 0 : engine.length,
        event: ev,
        stepId: ev === null ? null : ev.stepId,
        phase: ev === null ? null : ev.phase,
        direction: direction,
        metrics: engine === null ? null : engine.metricsAt(p)
      });
    }

    // ---- controls ---------------------------------------------------------------------------------

    // The controls are compared with what the DOM holds now (not with what was written last), so a
    // re-translation by `SG.i18n.applyTo` or a drag of the scrubber is put right at the next update.
    function setProp(el, prop, value) {
      if (el[prop] !== value) el[prop] = value;
    }

    function setAttr(el, name, value) {
      if (el.getAttribute(name) !== value) el.setAttribute(name, value);
    }

    function valueText(position, length) {
      if (position === 0 || engine === null) {
        return T('player.position.start', { position: 0, length: length });
      }
      const ev = engine.eventAt(position - 1);
      if (ev.type === 'done') return T('player.position.done', { position: position, length: length });
      return T('player.position', { step: stepName(ev.stepId), position: position, length: length });
    }

    function updateUi() {
      if (ui === null) return;
      const s = state();
      const loaded = s.length > 0;
      if (ui.first) setProp(ui.first, 'disabled', !loaded);
      if (ui.prev) setProp(ui.prev, 'disabled', !loaded);
      if (ui.next) setProp(ui.next, 'disabled', !loaded);
      if (ui.last) setProp(ui.last, 'disabled', !loaded);
      if (ui.play) {
        const label = T(s.playing ? 'player.pause' : 'player.play');
        setProp(ui.play, 'disabled', !loaded);
        setAttr(ui.play, 'data-state', s.playing ? 'playing' : 'paused');
        setAttr(ui.play, 'aria-label', label);
        setAttr(ui.play, 'title', label);
      }
      if (ui.scrubber) {
        setProp(ui.scrubber, 'disabled', !loaded);
        setProp(ui.scrubber, 'max', String(s.length));
        setProp(ui.scrubber, 'value', String(s.position));
        const text = loaded ? valueText(s.position, s.length) : '';
        setAttr(ui.scrubber, 'aria-valuetext', text);
      }
      if (ui.time) {
        const text = loaded ? T('player.time', {
          elapsed: formatTime(engine.timeAt(s.position)), total: formatTime(engine.totalTime())
        }) : '';
        setProp(ui.time, 'textContent', text);
      }
      ui.speeds.forEach(function (el) {
        setAttr(el, 'aria-pressed', el.getAttribute('data-speed') === speed ? 'true' : 'false');
      });
    }

    // ---- moving -----------------------------------------------------------------------------------

    /** Brings the board, the layers, the controls and the app up to date after the engine moved. */
    function afterMove(from, direction, animate) {
      const to = engine.position;
      if (to !== from) syncBoard(from, to, animate);
      applyLayers();
      applyFinal();
      updateUi();
      if (to !== from) emitPosition(direction);
      emitState();
    }

    function celebrate() {
      if (speed !== 'instant' && atEnd()) callBoard('pulseDone');
    }

    function stopLoop() {
      if (rafId !== null) {
        caf(rafId);
        rafId = null;
      }
    }

    function stopPlaying() {
      playing = false;
      stopLoop();
      applyAnimatePolicy();
      updateUi();
      emitState();
    }

    function schedule() {
      const token = session;
      rafId = raf(function () { frame(token); });
    }

    function frame(token) {
      if (token !== session || !playing || destroyed) return;
      rafId = null;
      try {
        tick(token);
      } catch (err) {
        // A failing board or callback must not leave a player that says "playing" and does nothing.
        if (token === session) stopPlaying();
        throw err;
      }
    }

    function tick(token) {
      const t = now();
      let dt = t - lastTime;
      lastTime = t;
      if (!(dt > 0)) dt = 0;
      if (dt > MAX_FRAME_MS) dt = MAX_FRAME_MS;
      const from = engine.position;
      if (speed === 'instant') {
        engine.seek(engine.length);
        afterMove(from, 'seek', false);
      } else if (from >= engine.length) {
        accumulator = 0;
      } else {
        accumulator += dt * rates[speed] / 1000;
        let n = Math.floor(accumulator);
        if (n > MAX_TICKS_PER_FRAME) {
          n = MAX_TICKS_PER_FRAME;
          accumulator = 0;
        } else {
          accumulator -= n;
        }
        if (n > 0) {
          engine.step(1, n);
          afterMove(from, 'forward', wantAnimate());
        }
      }
      if (token !== session || !playing) return;
      if (atEnd()) {
        stopPlaying();
        celebrate();
      } else {
        schedule();
      }
    }

    function jump(target, direction) {
      const from = engine.position;
      engine.seek(target);
      afterMove(from, direction, false);
    }

    function pauseQuietly() {
      if (playing) stopPlaying();
    }

    /**
     * Starts (or continues) the replay. At the end of a complete trace it starts again from position 0.
     * Instant jumps to the end; manual advances one meaningful event instead of playing.
     * @returns {boolean} Whether the player is playing now.
     */
    function play() {
      if (!canAct()) return false;
      if (speed === 'manual') {
        next();
        return false;
      }
      if (playing) return true;
      if (speed === 'instant') {
        jump(engine.length, 'seek');
        if (engine.complete) return false;
      } else if (atEnd()) {
        jump(0, 'seek');
      }
      playing = true;
      accumulator = 0;
      lastTime = now();
      applyAnimatePolicy();
      schedule();
      updateUi();
      emitState();
      return true;
    }

    function pause() {
      if (destroyed || !playing) return;
      stopPlaying();
    }

    function toggle() {
      if (playing) pause();
      else play();
    }

    function next() {
      if (!canAct()) return;
      pauseQuietly();
      const from = engine.position;
      engine.step(1);
      afterMove(from, 'forward', true);
      if (engine.position !== from) celebrate();
    }

    function prev() {
      if (!canAct()) return;
      pauseQuietly();
      const from = engine.position;
      engine.step(-1);
      afterMove(from, 'backward', true);
    }

    function seek(index, seekOptions) {
      if (!canAct()) return;
      if (!(seekOptions && seekOptions.keepPlaying === true)) pauseQuietly();
      jump(index, 'seek');
    }

    function startReplay() {
      if (sessionOpts.autoplay === false || speed === 'manual' || !canAct()) return;
      play();
    }

    // ---- sessions ---------------------------------------------------------------------------------

    /** Ends the running session: no frame of the old one can run any more, its trace is dropped. */
    function endSession() {
      session++;
      stopLoop();
      playing = false;
      accumulator = 0;
      engine = null;
    }

    function beginSession(sessionOptions) {
      const so = sessionOptions || {};
      endSession();
      sessionOpts = {
        model: so.model !== undefined ? so.model : o.model,
        cellLabel: so.cellLabel !== undefined ? so.cellLabel : o.cellLabel,
        givens: so.givens ? Int32Array.from(so.givens) : null,
        autoplay: so.autoplay !== false
      };
      dropFinal();
    }

    function showStart() {
      resyncBoard();
      layerKey = null;
      applyLayers();
      applyAnimatePolicy();
      updateUi();
    }

    /**
     * Replaces the session by a complete trace and replays it from the start (position 0), at the current
     * speed: instant jumps to the end, fast and step play, manual waits for `next()`.
     * @param {Object[]} events  A whole trace.
     * @param {Object} [opts]
     * @param {number} [opts.cellCount]  Default: the board's cell count, else inferred from the patches.
     * @param {ArrayLike<number>} [opts.givens]  The clues of the result. At the end of the trace the board
     *        shows exactly these, drawn as clues (`board.setValues` if the replayed view differs, which is
     *        the case for a 'summary' or 'off' trace that has no digits, then `board.setGivens`); anywhere
     *        else it shows the replayed view.
     * @param {Object} [opts.model]  To name cells in `describe`.
     * @param {function(number): string} [opts.cellLabel]
     * @param {boolean} [opts.autoplay=true]  `false` stays at position 0 whatever the speed.
     * @param {number} [opts.checkpointEvery=500]
     * @throws {SG.errors.GenerationError} For a malformed patch (the player is reset first).
     */
    function load(events, opts) {
      if (destroyed) return;
      const lo = opts || {};
      beginSession(lo);
      try {
        engine = createEngine(events, {
          cellCount: knownCellCount(lo.cellCount), checkpointEvery: lo.checkpointEvery
        });
      } catch (err) {
        reset();
        throw err;
      }
      stateKey = '';
      showStart();
      emitState();
      emitPosition('seek');
      startReplay();
    }

    /**
     * Adds one event of a generation that is still running. Nothing is drawn and no callback is called
     * until `finish()` (or `play()` / `seek()`, which follow the buffer). An event pushed after the trace
     * was completed starts a new session.
     * @param {Object} event
     */
    function push(event) {
      if (destroyed) return;
      if (engine === null || engine.complete) {
        beginSession({});
        engine = createEngine([], { cellCount: knownCellCount(), complete: false });
        stateKey = '';
        showStart();
        emitState();
        emitPosition('seek');
      }
      engine.push(event);
    }

    /**
     * Completes a streamed trace. If nothing was shown yet, the replay starts from the beginning like after
     * `load()`; a replay that follows the buffer (`play()` before this call) carries on to the end.
     * @param {Object} [opts]  `givens`, `model`, `cellLabel`, `autoplay` as in `load`.
     */
    function finish(opts) {
      if (destroyed || engine === null || engine.complete) return;
      const fo = opts || {};
      if (fo.givens) sessionOpts.givens = Int32Array.from(fo.givens);
      if (fo.model !== undefined) sessionOpts.model = fo.model;
      if (fo.cellLabel !== undefined) sessionOpts.cellLabel = fo.cellLabel;
      if (fo.autoplay !== undefined) sessionOpts.autoplay = fo.autoplay !== false;
      engine.finish();
      applyLayers();
      applyFinal();
      updateUi();
      emitState();
      emitPosition('seek');
      if (engine.position === 0 && !playing) startReplay();
    }

    /**
     * Cancels the session: the loop stops, the buffered trace is dropped and the board is cleared (blank
     * values, no highlights, the layers of position 0).
     * @param {{keepBoard?: boolean}} [opts]  `keepBoard` leaves the board as it is.
     */
    function reset(opts) {
      if (destroyed) return;
      endSession();
      stateKey = '';
      dropFinal();
      if (opts && opts.keepBoard === true) updateUi();
      else showStart();
      emitState();
      emitPosition('seek');
    }

    // ---- public -----------------------------------------------------------------------------------

    function setSpeed(wanted) {
      if (destroyed || SPEEDS.indexOf(wanted) === -1) return speed;
      if (wanted === speed) return speed;
      speed = wanted;
      accumulator = 0;
      if (canAct()) {
        if (speed === 'manual') {
          pause();
        } else if (speed === 'instant') {
          pause();
          play();
        }
      }
      applyAnimatePolicy();
      updateUi();
      emitState();
      return speed;
    }

    function labelOptions() {
      const out = {};
      if (typeof sessionOpts.cellLabel === 'function') out.cellLabel = sessionOpts.cellLabel;
      else if (sessionOpts.model) out.model = sessionOpts.model;
      return out;
    }

    /**
     * The text of the current event at a position, in the current language. A `metric` event has no text,
     * so the nearest earlier event that has one is described.
     * @param {number} [position]  Default: the current position.
     * @returns {{text: string, key: ?string, args: Object}}
     */
    function describe(position) {
      const empty = { text: '', key: null, args: {} };
      if (engine === null) return empty;
      let k = (position === undefined ? engine.position : Math.min(position, engine.length)) - 1;
      while (k >= 0 && typeof engine.eventAt(k).i18nKey !== 'string') k--;
      if (k < 0) return empty;
      const ev = engine.eventAt(k);
      const text = SG.i18n && typeof SG.i18n.eventText === 'function'
        ? SG.i18n.eventText(ev, labelOptions()) : ev.i18nKey;
      return { text: text, key: ev.i18nKey, args: ev.i18nArgs || {} };
    }

    function unbindControls() {
      if (ui === null) return;
      ui.listeners.forEach(function (l) { l.el.removeEventListener(l.type, l.fn); });
      if (ui.unsubscribe) ui.unsubscribe();
      ui = null;
    }

    /**
     * Connects the transport controls inside `#player-root`: `#btn-first #btn-prev #btn-play #btn-next
     * #btn-last`, the `[data-speed]` buttons, `#scrubber` and `#player-time`. They are disabled while no
     * trace is loaded, `#btn-play` carries `data-state="playing|paused"` and the translated label of the
     * action it would do, the scrubber is `0 .. length` with an `aria-valuetext` (translated current step
     * and position), dragging or keying it pauses the replay and seeks. A language change re-translates
     * what the player wrote. Missing elements are skipped.
     * @param {Element} rootEl
     * @returns {function(): void} Removes the listeners (also done by `destroy`).
     */
    function bindControls(rootEl) {
      unbindControls();
      if (destroyed || !rootEl || typeof rootEl.querySelector !== 'function') return unbindControls;
      const q = function (selector) { return rootEl.querySelector(selector); };
      ui = {
        first: q('#btn-first'),
        prev: q('#btn-prev'),
        play: q('#btn-play'),
        next: q('#btn-next'),
        last: q('#btn-last'),
        scrubber: q('#scrubber'),
        time: q('#player-time'),
        speeds: Array.prototype.slice.call(rootEl.querySelectorAll('[data-speed]')),
        listeners: [],
        unsubscribe: null
      };
      const listen = function (el, type, fn) {
        if (!el) return;
        el.addEventListener(type, fn);
        ui.listeners.push({ el: el, type: type, fn: fn });
      };
      const toEnd = function () { if (canAct()) seek(engine.length); };
      listen(ui.first, 'click', function () { seek(0); });
      listen(ui.prev, 'click', prev);
      listen(ui.play, 'click', toggle);
      listen(ui.next, 'click', next);
      listen(ui.last, 'click', toEnd);
      listen(ui.scrubber, 'input', function () { seek(Number(ui.scrubber.value)); });
      ui.speeds.forEach(function (el) {
        listen(el, 'click', function () { setSpeed(el.getAttribute('data-speed')); });
      });
      if (SG.i18n && typeof SG.i18n.onChange === 'function') {
        ui.unsubscribe = SG.i18n.onChange(updateUi);
      }
      updateUi();
      return unbindControls;
    }

    /** Stops everything and lets go of the controls and the trace. The board is left to the app. */
    function destroy() {
      if (destroyed) return;
      endSession();
      destroyed = true;
      unbindControls();
      if (board !== null && typeof board.setLayerVisible === 'function') {
        LAYER_NAMES.forEach(function (name) { board.setLayerVisible(name, true); });
      }
      if (!animateOn) callBoard('setAnimate', true);
    }

    return {
      load: load,
      push: push,
      finish: finish,
      play: play,
      pause: pause,
      toggle: toggle,
      next: next,
      prev: prev,
      first: function first() { seek(0); },
      last: function last() { if (canAct()) seek(engine.length); },

      /**
       * Moves to a position (clamped). Pauses a running replay unless `opts.keepPlaying` is true; the board
       * ends exactly as if the first `index` events had been applied from scratch.
       * @param {number} index  Position, 0 .. length.
       * @param {{keepPlaying?: boolean}} [opts]
       */
      seek: seek,

      /**
       * Moves to the beginning of a step (the position right after its start event, so the board shows
       * what that step starts from).
       * @param {string} stepId
       * @param {number} [run=0]  Which run of the step (a step repeats after a retry or a missed sample).
       * @returns {boolean} False when the trace has no such step.
       */
      seekToStep: function seekToStep(stepId, run) {
        if (!canAct()) return false;
        const index = engine.stepIndex(stepId, run);
        if (index < 0) return false;
        seek(index + 1);
        return true;
      },

      /**
       * Moves to the position after all events with `seq <= seq` (the steps panel keeps `seq` positions).
       * @param {number} seq
       */
      seekToSeq: function seekToSeq(seq) {
        if (canAct()) seek(engine.positionOfSeq(seq));
      },

      setSpeed: setSpeed,
      getSpeed: function getSpeed() { return speed; },
      state: state,
      describe: describe,
      bindControls: bindControls,
      reset: reset,
      destroy: destroy,

      /** @returns {?ReplayEngine} The engine of the current session (read only: use the player to move). */
      get engine() { return engine; }
    };
  }

  SG.player = {
    SPEEDS: SPEEDS,
    RATES: RATES,
    CHECKPOINT_EVERY: CHECKPOINT_EVERY,
    MAX_FRAME_MS: MAX_FRAME_MS,
    MAX_TICKS_PER_FRAME: MAX_TICKS_PER_FRAME,
    PATCH_SYNC_MAX: PATCH_SYNC_MAX,
    LAYER_NAMES: LAYER_NAMES,
    isMeaningful: isMeaningful,
    createEngine: createEngine,
    create: create
  };

  // ---------------------------------------------------------------------------------------------
  // Locale fragment (the other `player.*` keys live in locale.shell.js)
  // ---------------------------------------------------------------------------------------------

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'player.position': '{step}: event {position} of {length}',
      'player.position.start': 'At the start: event {position} of {length}',
      'player.position.done': 'Finished: event {position} of {length}',
      'player.time': '{elapsed} / {total}'
    },
    vi: {
      'player.position': '{step}: sự kiện {position} trên {length}',
      'player.position.start': 'Lúc bắt đầu: sự kiện {position} trên {length}',
      'player.position.done': 'Đã hoàn tất: sự kiện {position} trên {length}',
      'player.time': '{elapsed} / {total}'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
