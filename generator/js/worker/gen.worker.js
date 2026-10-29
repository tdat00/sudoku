/**
 * Web Worker of the generator: runs `SG.pipeline.runSteps` (a generation) and `SG.replay.prepare` (the
 * replay analysis of a finished puzzle) off the main thread and reports through `postMessage`. Only
 * `SG.workerClient` (js/worker/worker-client.js) should talk to it.
 * It loads the core, the variants and the word lists with `importScripts`, in exactly the order of
 * `SOURCE_FILES` in tests/node-runner.js up to the word lists (a test compares the two lists); never the UI
 * or the client.
 *
 * PROTOCOL (plain objects with a `type`; `session` is the number the client gave the run)
 *   page -> worker
 *     { type: 'ping', id }                  Handshake, answered with 'pong'.
 *     { type: 'generate', session, config, options }
 *         Starts a run (a run in progress is dropped). `config` is a GenerateConfig. `options` (all
 *         optional): chunkMs (slice length, default 12), batchMs (events are sent at most this often, default
 *         30), maxBatch (...or when this many are waiting, default 400), budgetMs (time limit of the run in
 *         active milliseconds, default 120000).
 *     { type: 'replay', session, result, options }
 *         Analyses a finished puzzle (a generation or a replay in progress is dropped). `result` is
 *         `SG.replay.toPlainWire` data, with its `digLog`. `options` (all optional): chunkMs (slice length,
 *         default 12), rateNodes, countNodes, probeNodes (the guards of `SG.replay.prepare`, used when
 *         they are positive numbers).
 *     { type: 'cancel', session }           Drops that run (a generation or a replay; any run when `session`
 *         is missing). The worker has one job at a time: 'generate', 'replay' and 'cancel' stop the job in
 *         progress at its next slice boundary, before anything else.
 *   worker -> page
 *     { type: 'pong', id, ok, error? }      `ok` is false when the scripts failed to load; `error` as below.
 *     { type: 'events', session, events }   A batch of GenerationEvents, in order, never empty.
 *     { type: 'done', session, result }     The PuzzleResult as `SG.pipeline.toWire` data; all events of the
 *                                           run were sent before it.
 *     { type: 'error', session, error }     `error` = { code, i18nArgs, name, message }: a GenerationError
 *         as plain data ('unexpected' with `i18nArgs.message` for any other error). The events (including the
 *         'error' event) were sent before it.
 *     { type: 'cancelled', session }        Answer to 'cancel': the worker is free again.
 *     { type: 'replayProgress', session, done, total }   After a slice of a replay, when `done` (positions
 *         rated, then `total` while the jumps are explained) changed since the last one of this job; the
 *         final count is always reported before 'replayDone'.
 *     { type: 'replayDone', session, analysis }   The analysis of `SG.replay.prepare` (plain data; the board
 *         values stay `Int32Array`s).
 *     { type: 'replayError', session, error }   `error` as for 'error': the scripts failed to load, the data
 *         could not be read, or the move model or a rating threw.
 *
 * CANCELLATION (design.md 9.3): the worker runs the resumable `runSteps` in slices of `chunkMs` and hands
 * the thread back to its own message loop after each slice (a MessageChannel message, not throttled like a
 * timer), so a queued 'cancel' or 'generate' is handled at the next boundary of the algorithm. Time given
 * back to the loop is not charged to the run (active clock, `SG.budget.createClock`). A replay is sliced the
 * same way (`SG.replay.prepare` yields after every position and every probe of an explanation).
 */
(function (scope) {
  'use strict';

  // Same order as SOURCE_FILES (shared core, engine, variants, word lists); paths relative to this file.
  const SCRIPTS = [
    '../../../core/js/engine/ns.js',
    '../../../core/js/engine/errors.js',
    '../../../core/js/engine/bits.js',
    '../../../core/js/engine/budget.js',
    '../engine/rng.js',
    '../../../core/js/engine/model.js',
    '../../../core/js/engine/constraints.js',
    '../../../core/js/engine/combo-table.js',
    '../../../core/js/engine/dfs-solver.js',
    '../../../core/js/engine/techniques.js',
    '../../../core/js/engine/logical-solver.js',
    '../../../core/js/engine/tech-basic.js',
    '../../../core/js/engine/tech-subset.js',
    '../../../core/js/engine/tech-fish.js',
    '../../../core/js/engine/tech-wing.js',
    '../../../core/js/engine/tech-chain.js',
    '../../../core/js/engine/tech-cage.js',
    '../../../core/js/engine/tech-ineq.js',
    '../../../core/js/engine/classic-model.js',
    '../../../core/js/engine/model-aids.js',
    '../engine/difficulty.js',
    '../engine/full-grid.js',
    '../engine/symmetry.js',
    '../engine/digger.js',
    '../engine/events.js',
    '../engine/explain-data.js',
    '../engine/pipeline.js',
    '../engine/replay.js',
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
      kind: 'generate',
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

  function failReplay(run, err) {
    if (active !== run) return;
    active = null;
    post({ type: 'replayError', session: run.id, error: errorData(err) });
  }

  // Posts a progress message when `progress.done` is a count this job has not reported yet.
  function reportProgress(run, progress) {
    if (progress === null || progress.done === run.lastDone) return;
    run.lastDone = progress.done;
    post({ type: 'replayProgress', session: run.id, done: progress.done, total: progress.total });
  }

  function finishReplay(run, analysis, latest) {
    if (active !== run) return;
    try {
      reportProgress(run, latest);
      const positions = analysis.stats.positions;
      reportProgress(run, { done: positions, total: positions });
      post({ type: 'replayDone', session: run.id, analysis: analysis });
      active = null;
    } catch (err) {
      failReplay(run, err);
    }
  }

  function replaySlice(run) {
    if (active !== run) return;
    const began = clockNow();
    let step;
    let latest = null;
    try {
      do {
        step = run.steps.next();
        if (!step.done) latest = step.value;
      } while (!step.done && clockNow() - began < run.chunkMs);
      if (!step.done) reportProgress(run, latest);
    } catch (err) {
      failReplay(run, err);
      return;
    }
    if (step.done) {
      finishReplay(run, step.value, latest);
      return;
    }
    later(function () { replaySlice(run); });
  }

  function onReplay(msg) {
    if (active !== null) stop(active);
    if (loadError !== null) {
      post({ type: 'replayError', session: msg.session, error: errorData(loadError) });
      return;
    }
    const SG = scope.SG;
    const options = msg.options !== null && typeof msg.options === 'object' ? msg.options : {};
    const prepareOptions = {};
    ['rateNodes', 'countNodes', 'probeNodes'].forEach(function (name) {
      if (number(options[name], 0) > 0) prepareOptions[name] = options[name];
    });
    const run = {
      kind: 'replay',
      id: msg.session,
      steps: null,
      chunkMs: nonNegative(options.chunkMs, DEFAULT_CHUNK_MS),
      lastDone: -1,
      pending: []
    };
    active = run;
    try {
      const result = SG.replay.fromPlainWire(msg.result);
      run.steps = SG.replay.prepare(result, prepareOptions);
    } catch (err) {
      failReplay(run, err);
      return;
    }
    replaySlice(run);
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
      } else if (msg.type === 'replay') {
        onReplay(msg);
      } else if (msg.type === 'cancel') {
        onCancel(msg);
      }
    } catch (err) {
      const type = msg.type === 'replay' ? 'replayError' : 'error';
      post({ type: type, session: msg.session, error: errorData(err) });
    }
  };
})(self);
