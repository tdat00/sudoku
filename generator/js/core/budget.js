/**
 * Work budget and cancellation token shared by every long running routine.
 *
 * Hot loops call `budget.check()` once per search node. It is cheap on purpose: the flags are tested on
 * every call, but the clock (and the optional external cancel poll) is only sampled every 1024 ticks.
 * Once a limit is hit, every further `check()` keeps throwing.
 *
 * It also holds the run control of resumable generation (see `SG.pipeline.runSteps`): an active clock that
 * does not count the time given away between slices, and `drive`, which runs a stepper to its end.
 */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};

  /** Number of ticks between two clock samples. */
  var CLOCK_INTERVAL = 1024;

  /**
   * @typedef {Object} Budget
   * @property {function(number=): void} tick  Records n (default 1) units of work without any checking.
   * @property {function(): void} check        Counts one tick, then throws a GenerationError if cancelled
   *                                           ('budget.cancelled') or out of nodes or time
   *                                           ('budget.exceeded').
   * @property {function(): void} cancel       Cancels the budget; the next check() throws at once.
   * @property {function(): number} elapsedMs  Milliseconds since creation.
   * @property {boolean} isCancelled           True after cancel() (read only).
   * @property {number} nodes                  Ticks recorded so far (read only).
   */

  /**
   * Creates a budget. All limits are optional; with no options the budget never expires.
   * @param {Object} [options]
   * @param {number} [options.ms]       Wall-clock limit in milliseconds.
   * @param {number} [options.nodes]    Maximum number of ticks (check() calls plus tick() units).
   * @param {function(): void} [options.onCancel]  Called once, when cancel() is invoked first time.
   * @param {function(): *} [options.shouldCancel] Polled with the clock sample; a truthy result cancels
   *                                               the budget (for flags set from outside, e.g. in shared memory).
   * @param {function(): number} [options.now]     Clock in milliseconds; defaults to Date.now.
   * @returns {Budget}
   */
  function create(options) {
    options = options || {};
    var now = typeof options.now === 'function' ? options.now : Date.now;
    var maxMs = typeof options.ms === 'number' && isFinite(options.ms) ? options.ms : Infinity;
    var maxNodes = typeof options.nodes === 'number' && isFinite(options.nodes) ? options.nodes : Infinity;
    var onCancel = typeof options.onCancel === 'function' ? options.onCancel : null;
    var shouldCancel = typeof options.shouldCancel === 'function' ? options.shouldCancel : null;
    var needsClock = maxMs !== Infinity || shouldCancel !== null;

    var startedAt = now();
    var nodes = 0;
    var nextClockAt = CLOCK_INTERVAL;
    var cancelled = false;
    var exceededReason = null;

    function error(code, reason) {
      return new SG.errors.GenerationError(code, {
        reason: reason,
        limitMs: maxMs,
        limitNodes: maxNodes,
        nodes: nodes,
        elapsedMs: now() - startedAt
      });
    }

    function tick(n) {
      nodes += n === undefined ? 1 : n;
    }

    function cancel() {
      if (cancelled) return;
      cancelled = true;
      if (onCancel !== null) onCancel();
    }

    function check() {
      if (cancelled) throw error('budget.cancelled', 'cancelled');
      if (exceededReason !== null) throw error('budget.exceeded', exceededReason);
      nodes++;
      if (nodes > maxNodes) {
        exceededReason = 'nodes';
        throw error('budget.exceeded', exceededReason);
      }
      if (nodes >= nextClockAt) {
        nextClockAt = nodes + CLOCK_INTERVAL;
        if (needsClock) sampleClock();
      }
    }

    function sampleClock() {
      if (shouldCancel !== null && shouldCancel()) {
        cancel();
        throw error('budget.cancelled', 'cancelled');
      }
      if (now() - startedAt >= maxMs) {
        exceededReason = 'time';
        throw error('budget.exceeded', exceededReason);
      }
    }

    return {
      tick: tick,
      check: check,
      cancel: cancel,
      elapsedMs: function elapsedMs() { return now() - startedAt; },
      get isCancelled() { return cancelled; },
      get nodes() { return nodes; }
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Run control for resumable ("stepper") generation
  // ---------------------------------------------------------------------------------------------

  function defaultNow() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now() : Date.now();
  }

  /**
   * @typedef {Object} ActiveClock
   * @property {function(): number} now      Milliseconds spent running so far (bound: pass it as an option).
   * @property {function(): void} resume     Starts counting (idempotent). A new clock is paused.
   * @property {function(): void} pause      Stops counting (idempotent); time passing now is not counted.
   * @property {boolean} running             True between resume() and pause() (read only).
   */

  /**
   * A clock that only counts the time it is running. A scheduler that runs a generation in slices resumes it
   * before each slice and pauses it after, so that the time given away to the page (or to the message loop
   * of a worker) is charged to nothing: `SG.budget.create({ ms, now: clock.now })` then limits the work done,
   * and event times and step timings (`now` option of `SG.pipeline.runSteps`) show active time only.
   * @param {function(): number} [rawNow]  Source of milliseconds; default `performance.now`.
   * @returns {ActiveClock}
   */
  function createClock(rawNow) {
    var read = typeof rawNow === 'function' ? rawNow : defaultNow;
    var counted = 0;
    var since = null;
    return {
      now: function now() { return since === null ? counted : counted + (read() - since); },
      resume: function resume() { if (since === null) since = read(); },
      pause: function pause() {
        if (since === null) return;
        counted += read() - since;
        since = null;
      },
      get running() { return since !== null; }
    };
  }

  /**
   * True for what a `function*` returns (and any other iterator): the "steps" of a resumable computation.
   * @param {*} x
   * @returns {boolean}
   */
  function isSteps(x) {
    return x !== null && typeof x === 'object' && typeof x.next === 'function' &&
      typeof x[Symbol.iterator] === 'function';
  }

  /**
   * Runs a resumable computation (the iterator of a `*Steps` function) to its end without ever giving the
   * thread away and returns what it returned. This is how every synchronous API (`SG.pipeline.run`,
   * `SG.digger.generate`, ...) is built on its stepper: the yields are ignored and the result is the same.
   * A value that is not an iterator is returned as it is.
   * @param {*} steps
   * @returns {*}
   */
  function drive(steps) {
    if (!isSteps(steps)) return steps;
    for (;;) {
      var step = steps.next();
      if (step.done) return step.value;
    }
  }

  SG.budget = { create: create, createClock: createClock, drive: drive, isSteps: isSteps };
})(typeof self !== 'undefined' ? self : globalThis);
