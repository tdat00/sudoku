/**
 * Web Worker of the generator: runs `SG.pipeline.runSteps` off the main thread and reports through `postMessage`.
 * Only `SG.workerClient` (js/worker/worker-client.js) should talk to it.
 * It loads the core, the variants and the word lists with `importScripts`, in exactly the order of `SOURCE_FILES`
 * in tests/node-runner.js up to the word lists (a test compares the two lists); never the UI or the client.
 *
 * PROTOCOL (plain objects with a `type`; `session` is the number the client gave the run)
 *   page -> worker
 *     { type: 'ping', id }                  Handshake, answered with 'pong'.
 *     { type: 'generate', session, config, options }
 *         Starts a run (a run in progress is dropped). `config` is a GenerateConfig. `options` (all optional):
 *         chunkMs (slice length, default 12), batchMs (events are sent at most this often, default 30),
 *         maxBatch (...or when this many are waiting, default 400), budgetMs (time limit of the run in active
 *         milliseconds, default 120000).
 *     { type: 'cancel', session }           Drops that run (or any run when `session` is missing).
 *   worker -> page
 *     { type: 'pong', id, ok, error? }      `ok` is false when the scripts failed to load; `error` as below.
 *     { type: 'events', session, events }   A batch of GenerationEvents, in order, never empty.
 *     { type: 'done', session, result }     The PuzzleResult as `SG.pipeline.toWire` data; all events of the run
 *                                           were sent before it.
 *     { type: 'error', session, error }     `error` = { code, i18nArgs, name, message }: a GenerationError as plain
 *         data ('unexpected' with `i18nArgs.message` for any other error). The events (including the 'error'
 *         event) were sent before it.
 *     { type: 'cancelled', session }        Answer to 'cancel': the worker is free again.
 *
 * CANCELLATION: `SG.pipeline.run` is synchronous, so a worker calling it could not read a 'cancel' message. The
 * worker runs the resumable form in slices of `chunkMs`; after each slice it hands the thread back to its own
 * message loop (a MessageChannel message, which is not throttled like a timer), the queued 'cancel' (or a new
 * 'generate') is handled, and the next slice is a task behind it. A cancel takes effect at the next boundary of the
 * algorithm (see `SG.digger.generateSteps`: some ms, up to about 90 ms inside one non-resumable piece such as one
 * Killer layout search; the Greater-Than sign dig yields after every sign candidate, ~10 ms). The client does not
 * wait for that: it settles the promise at once and terminates the worker as a last resort.
 * Time given back to the message loop is not charged to the run: the budget and the timings use an active clock
 * (`SG.budget.createClock`) that only counts while a slice runs.
 */
(function (scope) {
  'use strict';

  /** Same order as SOURCE_FILES (core, variants, word lists); paths are relative to this file. */
  const SCRIPTS = [
    '../core/ns.js',
    '../core/errors.js',
    '../core/bits.js',
    '../core/budget.js',
    '../core/rng.js',
    '../core/model.js',
    '../core/constraints.js',
    '../core/combo-table.js',
    '../core/dfs-solver.js',
    '../core/techniques.js',
    '../core/logical-solver.js',
    '../core/tech-basic.js',
    '../core/tech-subset.js',
    '../core/tech-fish.js',
    '../core/tech-wing.js',
    '../core/tech-chain.js',
    '../core/tech-cage.js',
    '../core/tech-ineq.js',
    '../core/difficulty.js',
    '../core/full-grid.js',
    '../core/symmetry.js',
    '../core/digger.js',
    '../core/events.js',
    '../core/explain-data.js',
    '../core/pipeline.js',
    '../variants/registry.js',
    '../variants/classic.js',
    '../variants/mega.js',
    '../variants/extra-regions.js',
    '../variants/jigsaw.js',
    '../variants/killer.js',
    '../variants/greater-than.js',
    '../variants/multigrid.js',
    '../variants/wordoku.js',
    '../../assets/wordlists/isograms.en.js',
    '../../assets/wordlists/isograms.vi.js'
  ];

  const DEFAULT_CHUNK_MS = 12;
  const DEFAULT_BATCH_MS = 30;
  const DEFAULT_MAX_BATCH = 400;
  const DEFAULT_BUDGET_MS = 120000;

  let loadError = null;
  try {
    scope.importScripts.apply(scope, SCRIPTS);
  } catch (err) {
    loadError = err;
  }

  let active = null;

  function clockNow() {
    return typeof scope.performance !== 'undefined' && typeof scope.performance.now === 'function'
      ? scope.performance.now() : Date.now();
  }

  function post(message) {
    scope.postMessage(message);
  }

  function plainCopy(value) {
    try {
      if (typeof scope.structuredClone === 'function') return scope.structuredClone(value);
    } catch (err) {
      // Not cloneable: fall back to JSON, which drops what it cannot write.
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return {};
    }
  }

  function errorData(err) {
    const coded = err !== null && typeof err === 'object' && typeof err.code === 'string';
    const message = err !== null && typeof err === 'object' && err.message !== undefined
      ? String(err.message) : String(err);
    const args = coded && err.i18nArgs ? plainCopy(err.i18nArgs) : {};
    if (!coded) args.message = message;
    return {
      code: coded ? err.code : 'unexpected',
      i18nArgs: args,
      name: err !== null && typeof err === 'object' && err.name ? String(err.name) : 'Error',
      message: message
    };
  }

  /** Hands the thread back to the message loop, then calls `fn`. */
  const later = (function () {
    let channel = null;
    const queue = [];
    return function later(fn) {
      if (typeof scope.MessageChannel !== 'function') {
        scope.setTimeout(fn, 0);
        return;
      }
      if (channel === null) {
        channel = new scope.MessageChannel();
        channel.port1.onmessage = function () {
          const next = queue.shift();
          if (next !== undefined) next();
        };
      }
      queue.push(fn);
      channel.port2.postMessage(0);
    };
  })();

  function number(value, fallback) {
    return typeof value === 'number' && isFinite(value) && value > 0 ? value : fallback;
  }

  function nonNegative(value, fallback) {
    return typeof value === 'number' && isFinite(value) && value >= 0 ? value : fallback;
  }

  function flush(run) {
    if (run.pending.length === 0) return;
    const batch = run.pending;
    run.pending = [];
    run.lastFlush = clockNow();
    post({ type: 'events', session: run.id, events: batch });
  }

  function stop(run) {
    if (active === run) active = null;
    run.pending = [];
    try {
      run.steps.return();
    } catch (err) {
      // The generator is abandoned either way.
    }
  }

  function fail(run, err) {
    if (active !== run) return;
    active = null;
    try {
      flush(run);
    } catch (postErr) {
      run.pending = [];
    }
    post({ type: 'error', session: run.id, error: errorData(err) });
  }

  function finish(run, result) {
    if (active !== run) return;
    try {
      flush(run);
      post({ type: 'done', session: run.id, result: scope.SG.pipeline.toWire(result) });
      active = null;
    } catch (err) {
      fail(run, err);
    }
  }

  function slice(run) {
    if (active !== run) return;
    const began = clockNow();
    let step;
    run.clock.resume();
    try {
      do {
        step = run.steps.next();
      } while (!step.done && clockNow() - began < run.chunkMs);
    } catch (err) {
      run.clock.pause();
      fail(run, err);
      return;
    }
    run.clock.pause();
    if (step.done) {
      finish(run, step.value);
      return;
    }
    try {
      if (run.pending.length > 0 && clockNow() - run.lastFlush >= run.batchMs) flush(run);
    } catch (err) {
      fail(run, err);
      return;
    }
    later(function () { slice(run); });
  }

  function onGenerate(msg) {
    if (active !== null) stop(active);
    if (loadError !== null) {
      post({ type: 'error', session: msg.session, error: errorData(loadError) });
      return;
    }
    const SG = scope.SG;
    const options = msg.options !== null && typeof msg.options === 'object' ? msg.options : {};
    const clock = SG.budget.createClock(clockNow);
    const run = {
      id: msg.session,
      clock: clock,
      steps: null,
      pending: [],
      lastFlush: clockNow(),
      chunkMs: nonNegative(options.chunkMs, DEFAULT_CHUNK_MS),
      batchMs: nonNegative(options.batchMs, DEFAULT_BATCH_MS)
    };
    const maxBatch = Math.floor(number(options.maxBatch, DEFAULT_MAX_BATCH));
    const budget = SG.budget.create({ ms: number(options.budgetMs, DEFAULT_BUDGET_MS), now: clock.now });
    function sink(event) {
      run.pending.push(event);
      if (run.pending.length >= maxBatch) flush(run);
    }
    active = run;
    try {
      run.steps = SG.pipeline.runSteps(msg.config, sink, budget, { now: clock.now, cooperative: true });
    } catch (err) {
      fail(run, err);
      return;
    }
    slice(run);
  }

  function onCancel(msg) {
    if (active !== null && (msg.session === undefined || msg.session === active.id)) stop(active);
    post({ type: 'cancelled', session: msg.session });
  }

  scope.onmessage = function onMessage(event) {
    const msg = event.data;
    if (msg === null || typeof msg !== 'object') return;
    try {
      if (msg.type === 'ping') {
        const reply = { type: 'pong', id: msg.id, ok: loadError === null };
        if (loadError !== null) reply.error = errorData(loadError);
        post(reply);
      } else if (msg.type === 'generate') {
        onGenerate(msg);
      } else if (msg.type === 'cancel') {
        onCancel(msg);
      }
    } catch (err) {
      post({ type: 'error', session: msg.session, error: errorData(err) });
    }
  };
})(self);
