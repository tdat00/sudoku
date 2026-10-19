/**
 * Work budget and cancellation token shared by every long running routine.
 * Hot loops call `budget.check()` once per node; the clock (and the optional external cancel poll) is only
 * sampled every 1024 ticks. Once a limit is hit, every further `check()` keeps throwing.
 */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};

  var CLOCK_INTERVAL = 1024;

  /**
   * @typedef {Object} Budget
   * `check()` counts one tick and throws a GenerationError ('budget.cancelled' or 'budget.exceeded');
   * `tick(n)` only counts. `cancel()` makes the next check() throw. `isCancelled` and `nodes` are read only.
   */

  /**
   * All limits are optional (none = never expires). `shouldCancel` is polled with the clock sample, for flags
   * set from outside (e.g. shared memory); `now` defaults to Date.now.
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

  SG.budget = { create: create };
})(typeof self !== 'undefined' ? self : globalThis);
