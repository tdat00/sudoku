/**
 * Work budget and cancellation token shared by every long running routine. Hot loops call `check()` once per
 * node: the flags are tested every call, but the clock (and the external cancel poll) only every 1024 ticks.
 * Once a limit is hit every further `check()` keeps throwing. Also holds the run control of resumable generation
 * (see `SG.pipeline.runSteps`): an active clock and `drive`.
 */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};

  var CLOCK_INTERVAL = 1024;

  // Budget: tick(n = 1) records work; check() counts one tick and throws GenerationError
  // 'budget.cancelled' or 'budget.exceeded'; cancel(); elapsedMs(); read-only isCancelled and nodes.

  /**
   * Creates a budget; all options are optional (none = never expires). `ms`: wall-clock limit; `nodes`: max ticks;
   * `onCancel`: called once on the first cancel(); `shouldCancel`: polled with the clock sample, for flags set from
   * outside (e.g. shared memory); `now`: clock in ms, default Date.now.
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

  function defaultNow() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now() : Date.now();
  }

  // Clock that only counts while running. A scheduler running generation in slices resumes it before and pauses it
  // after each slice, so time given away to the page is charged to nothing: pass `clock.now` as the budget `now`
  // and as `now` of `SG.pipeline.runSteps`. resume()/pause() are idempotent; a new clock is paused.
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

  // True for the iterator a `function*` returns (the "steps" of a resumable computation).
  function isSteps(x) {
    return x !== null && typeof x === 'object' && typeof x.next === 'function' &&
      typeof x[Symbol.iterator] === 'function';
  }

  // Runs a resumable computation (the iterator of a `*Steps` function) to its end without yielding the thread and
  // returns its result; this is how every synchronous API is built on its stepper. Non-iterators are returned as is.
  function drive(steps) {
    if (!isSteps(steps)) return steps;
    for (;;) {
      var step = steps.next();
      if (step.done) return step.value;
    }
  }

  SG.budget = { create: create, createClock: createClock, drive: drive, isSteps: isSteps };
})(typeof self !== 'undefined' ? self : globalThis);
