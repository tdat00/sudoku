/**
 * `SG.workerClient`: runs a generation off the main thread in a Web Worker (js/worker/gen.worker.js) when the page
 * can have one, and on the main thread in cooperative slices when it cannot; one interface for both.
 *
 * API
 *   generate(config, onEvent) -> Promise<PuzzleResult>
 *       `onEvent(event)` gets the GenerationEvents in order, in batches (worker: about every 30 ms; main thread:
 *       after every slice). Resolves with the PuzzleResult (the model is rebuilt here, see `SG.pipeline.fromWire`);
 *       rejects with a `SG.errors.GenerationError` (translate with `SG.i18n.tError`). A run that is cancelled or
 *       replaced by the next `generate` rejects with code 'budget.cancelled' and delivers no further events.
 *   cancel() -> boolean
 *       Cancels the running generation (true when there was one). The promise is rejected at once; the work stops
 *       at the next slice boundary.
 *   mode -> 'worker' | 'main'
 *       Final once `ready()` has settled (the first access starts the detection in the background so the worker
 *       is warm for the first `generate`); before that it is a guess.
 *   ready() -> Promise<'worker'|'main'>
 *       Constructs the worker (`new Worker` throws for file:// in Chrome and Edge and under a CSP that forbids it)
 *       and waits for a ping/pong handshake with a timeout, so a worker that never starts cannot hang the page:
 *       the client falls back to the main thread.
 *   create(options) -> client
 *       An independent client with the same interface plus `dispose()` (cancels the run, terminates the worker,
 *       releases timers and listeners; the client can be used again). A background pre-generator uses its own so
 *       that it never disturbs the foreground run. Options (all optional):
 *         forceMode 'auto' | 'worker' | 'main'  'main' never creates a worker; 'worker' does not fall back
 *                                               (`ready()` rejects). Default 'auto'.
 *         workerUrl (default: next to this script), workerFactory(url) -> { postMessage, terminate, onmessage, onerror }
 *         chunkMs (slice length, default 12; 0 = one step per slice), batchMs (worker flush interval, 30),
 *         maxBatch (worker: also flush when this many events wait, 400), now (clock, performance.now),
 *         budgetMs (time limit of a run in ACTIVE milliseconds, 120000), readyTimeoutMs (handshake timeout, 5000),
 *         killAfterMs (a worker that has not answered a cancel after this long is terminated, 150),
 *         yieldFn() -> Promise (main mode; default a MessageChannel round trip),
 *         paintFn() -> Promise resolved once the busy state has been painted (main mode, before the first slice).
 *
 * Worker messages: see the header of js/worker/gen.worker.js. Every message after the handshake carries the
 * `session` number of its run; messages of any other run are ignored, so nothing of a cancelled or replaced run
 * can reach the new one.
 *
 * CANCELLATION. `SG.pipeline.run` is synchronous, so both modes run `SG.pipeline.runSteps`, which yields at the
 * natural boundaries of the algorithm (between pipeline steps and between the oracle calls of the dig), and give the
 * thread away between slices of `chunkMs`. `cancel()` takes effect at the next boundary. In worker mode it is a
 * cooperative 'cancel' message first (the worker stays warm); only if the worker has not answered after
 * `killAfterMs` (it is inside work that cannot be interrupted: a full grid, one search of the Killer layout, one
 * rating) is it terminated, and a new one is created when needed. A SharedArrayBuffer flag would need
 * cross-origin isolation headers, which a plain static server does not send.
 *
 * GRANULARITY LIMIT of the main thread mode: a slice is never shorter than the longest piece of work that cannot be
 * split, so the page may stall for that long. Measured in Node the pieces are mostly below 3 ms, even on Samurai.
 * The Greater-Than sign dig yields after every sign candidate (about 10 ms at most) and the Killer layout after
 * every analysis; its longest piece is one search of the layout (a DFS of at most ANALYSIS_NODES nodes), about 70
 * to 90 ms. The worker has this limit only for the latency of a cancel.
 *
 * ACTIVE TIME. Time that a slice gives away is not charged to the run: the time limit, the event times `t` and
 * the step timings count active time only, in both modes.
 *
 * WORKER BOUNDARY. The result goes through `SG.pipeline.toWire` / `fromWire`: the model is reduced to plain data in
 * the worker and rebuilt with `SG.model.create` here, with the lazy propagation extensions of Killer and Greater-Than
 * switched on so that `SG.dfs` works on the model. Per-model side data that variants keep in WeakMaps does not cross.
 *
 * Loads in Node without a DOM; the DOM and `Worker` are touched only inside functions.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  // Keep the first instance on repeated loads: the running application holds it.
  if (SG.workerClient && typeof SG.workerClient.create === 'function') return;

  const DEFAULT_CHUNK_MS = 12;
  const DEFAULT_BATCH_MS = 30;
  const DEFAULT_MAX_BATCH = 400;
  const DEFAULT_BUDGET_MS = 120000;
  const DEFAULT_READY_TIMEOUT_MS = 5000;
  const DEFAULT_KILL_AFTER_MS = 150;
  const PAINT_FALLBACK_MS = 100;
  const FALLBACK_WORKER_URL = 'js/worker/gen.worker.js';

  function noop() {}

  function cancelledError() {
    return new SG.errors.GenerationError('budget.cancelled', {});
  }

  function unexpectedError(reason) {
    const text = reason !== null && typeof reason === 'object' && reason.message !== undefined
      ? String(reason.message) : String(reason);
    return new SG.errors.GenerationError('unexpected', { message: text });
  }

  function errorFromWire(data) {
    if (data === null || typeof data !== 'object' || typeof data.code !== 'string') {
      return unexpectedError(data);
    }
    return new SG.errors.GenerationError(data.code, data.i18nArgs || {});
  }

  function reportError(err) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') console.error(err);
  }

  function nowMs() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now() : Date.now();
  }

  function positive(value, fallback) {
    return typeof value === 'number' && isFinite(value) && value > 0 ? value : fallback;
  }

  function nonNegative(value, fallback) {
    return typeof value === 'number' && isFinite(value) && value >= 0 ? value : fallback;
  }

  function defaultWorkerUrl() {
    try {
      if (typeof document !== 'undefined') {
        const tags = document.getElementsByTagName('script');
        for (let i = tags.length - 1; i >= 0; i--) {
          const src = tags[i].src;
          if (src && /\/worker-client\.js(\?.*)?$/.test(src)) return new URL('gen.worker.js', src).href;
        }
      }
    } catch (err) {
      // Fall through to the relative URL.
    }
    return FALLBACK_WORKER_URL;
  }

  function defaultWorkerFactory(url) {
    if (typeof root.Worker !== 'function') throw new Error('Web Workers are not available');
    return new root.Worker(url);
  }

  function guessMode(workerFactory) {
    if (workerFactory !== null) return 'worker';
    if (typeof root.Worker !== 'function') return 'main';
    const location = root.location;
    return location && location.protocol === 'file:' ? 'main' : 'worker';
  }

  /**
   * Resolves after the page has had its turn, as a MessageChannel round trip: unlike `setTimeout(0)` it is neither
   * clamped to 4 ms nor throttled to 1 s in a background tab (falls back to `setTimeout(0)`). `.close()` releases it.
   */
  function createYield() {
    let channel = null;
    const waiting = [];
    function yieldToUi() {
      return new Promise(function (resolve) {
        if (typeof root.MessageChannel !== 'function') {
          root.setTimeout(resolve, 0);
          return;
        }
        if (channel === null) {
          channel = new root.MessageChannel();
          channel.port1.onmessage = function () {
            const next = waiting.shift();
            if (next !== undefined) next();
          };
        }
        waiting.push(resolve);
        channel.port2.postMessage(0);
      });
    }
    yieldToUi.close = function close() {
      if (channel !== null) {
        channel.port1.onmessage = null;
        channel.port1.close();
        channel = null;
      }
      waiting.length = 0;
    };
    return yieldToUi;
  }

  /**
   * Resolves after two animation frames, so the busy state is on screen before the first slice runs. A timer covers
   * a hidden tab, which paints nothing; without animation frames (Node, a worker) it resolves at once.
   */
  function waitForPaint() {
    return new Promise(function (resolve) {
      if (typeof root.requestAnimationFrame !== 'function') {
        resolve();
        return;
      }
      let timer = null;
      let done = false;
      function fire() {
        if (done) return;
        done = true;
        if (timer !== null) root.clearTimeout(timer);
        resolve();
      }
      root.requestAnimationFrame(function () { root.requestAnimationFrame(fire); });
      timer = root.setTimeout(fire, PAINT_FALLBACK_MS);
    });
  }

  function create(options) {
    const o = options || {};
    const opt = {
      forceMode: o.forceMode === 'worker' || o.forceMode === 'main' ? o.forceMode : 'auto',
      workerUrl: typeof o.workerUrl === 'string' ? o.workerUrl : null,
      workerFactory: typeof o.workerFactory === 'function' ? o.workerFactory : null,
      chunkMs: nonNegative(o.chunkMs, DEFAULT_CHUNK_MS),
      batchMs: nonNegative(o.batchMs, DEFAULT_BATCH_MS),
      maxBatch: Math.floor(positive(o.maxBatch, DEFAULT_MAX_BATCH)),
      budgetMs: positive(o.budgetMs, DEFAULT_BUDGET_MS),
      readyTimeoutMs: positive(o.readyTimeoutMs, DEFAULT_READY_TIMEOUT_MS),
      killAfterMs: nonNegative(o.killAfterMs, DEFAULT_KILL_AFTER_MS),
      now: typeof o.now === 'function' ? o.now : nowMs,
      yieldFn: typeof o.yieldFn === 'function' ? o.yieldFn : null,
      paintFn: typeof o.paintFn === 'function' ? o.paintFn : waitForPaint
    };
    const ownYield = opt.yieldFn === null ? createYield() : null;
    const yieldFn = opt.yieldFn !== null ? opt.yieldFn : ownYield;

    let decided = opt.forceMode === 'main' ? 'main' : null;
    let readyPromise = null;
    let spawning = null;
    let worker = null;
    let workerBusy = 0;
    let killTimer = null;
    let current = null;
    let lifecycle = 0;
    let lastSession = 0;
    let lastPing = 0;

    /** Settles a run once; false when it was settled before (late messages, double cancel). */
    function settle(s, ok, value) {
      if (s.state !== 'running') return false;
      s.state = ok ? 'done' : 'failed';
      if (current === s) current = null;
      if (!ok && s.abort !== null) s.abort();
      if (ok) s.resolve(value);
      else s.reject(value);
      return true;
    }

    /** Hands events to the consumer; a consumer that cancels (or replaces) the run ends the batch. */
    function deliver(s, events) {
      if (typeof s.onEvent !== 'function') return;
      for (let i = 0; i < events.length; i++) {
        if (s.state !== 'running') return;
        try {
          s.onEvent(events[i]);
        } catch (err) {
          reportError(err);
        }
      }
    }

    function terminate(w) {
      try {
        w.onmessage = null;
        w.onerror = null;
        w.onmessageerror = null;
        w.terminate();
      } catch (err) {
        // A worker that cannot be terminated is gone anyway.
      }
    }

    function clearKill() {
      if (killTimer !== null) {
        root.clearTimeout(killTimer);
        killTimer = null;
      }
    }

    /** The worker finished (or dropped) the run it was busy with: start the one that waits, if any. */
    function workerFree() {
      workerBusy = 0;
      clearKill();
      if (current !== null && !current.sent && decided === 'worker') runInWorker(current);
    }

    /** The worker did not answer a cancel in time (or died): replace it, lazily. */
    function dropWorker() {
      clearKill();
      workerBusy = 0;
      if (worker !== null) {
        terminate(worker);
        worker = null;
      }
    }

    function armKill() {
      if (killTimer !== null) return;
      killTimer = root.setTimeout(function () {
        killTimer = null;
        if (workerBusy === 0 || worker === null) return;
        dropWorker();
        if (current !== null && !current.sent && decided === 'worker') runInWorker(current);
      }, opt.killAfterMs);
    }

    function onWorkerMessage(event) {
      const m = event && event.data;
      if (m === null || typeof m !== 'object') return;
      const mine = current !== null && m.session === current.id;
      if (m.type === 'events') {
        if (mine && Array.isArray(m.events)) deliver(current, m.events);
        return;
      }
      if (m.type !== 'done' && m.type !== 'error' && m.type !== 'cancelled') return;
      const own = m.session === workerBusy;
      if (mine && m.type === 'done') {
        let result;
        try {
          result = SG.pipeline.fromWire(m.result);
        } catch (err) {
          settle(current, false, err);
          result = null;
        }
        if (result !== null) settle(current, true, result);
      } else if (mine && m.type === 'error') {
        settle(current, false, errorFromWire(m.error));
      }
      if (own) workerFree();
    }

    function onWorkerError(event) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      const reason = event && event.message ? event.message : 'The generator worker stopped';
      dropWorker();
      if (current === null) return;
      if (current.sent) settle(current, false, unexpectedError(reason));
      else runInWorker(current);
    }

    function spawn() {
      const epoch = lifecycle;
      return new Promise(function (resolve) {
        let w = null;
        let timer = null;
        let settled = false;
        const pingId = ++lastPing;
        function done(ok) {
          if (settled) return;
          settled = true;
          if (timer !== null) root.clearTimeout(timer);
          if (ok && epoch === lifecycle) {
            worker = w;
            w.onmessage = onWorkerMessage;
            w.onerror = onWorkerError;
            resolve(true);
            return;
          }
          if (w !== null) terminate(w);
          resolve(false);
        }
        try {
          w = (opt.workerFactory || defaultWorkerFactory)(opt.workerUrl || defaultWorkerUrl());
        } catch (err) {
          w = null;
        }
        if (w === null || typeof w !== 'object') {
          done(false);
          return;
        }
        timer = root.setTimeout(function () { done(false); }, opt.readyTimeoutMs);
        w.onmessage = function (event) {
          const m = event && event.data;
          if (m && m.type === 'pong' && m.id === pingId) done(m.ok !== false);
        };
        w.onerror = function () { done(false); };
        try {
          w.postMessage({ type: 'ping', id: pingId });
        } catch (err) {
          done(false);
        }
      });
    }

    function ensureWorker() {
      if (worker !== null) return Promise.resolve(true);
      if (spawning === null) {
        const mine = spawning = spawn().then(function (ok) {
          if (spawning === mine) spawning = null;
          return ok;
        });
      }
      return spawning;
    }

    function dispatch(s) {
      s.sent = true;
      workerBusy = s.id;
      try {
        worker.postMessage({
          type: 'generate',
          session: s.id,
          config: s.config,
          options: {
            chunkMs: opt.chunkMs, batchMs: opt.batchMs, maxBatch: opt.maxBatch, budgetMs: opt.budgetMs
          }
        });
      } catch (err) {
        workerBusy = 0;
        s.sent = false;
        settle(s, false, unexpectedError(err));
      }
    }

    function runInWorker(s) {
      if (current !== s) return;
      if (worker === null) {
        ensureWorker().then(function (ok) {
          if (current !== s) return;
          if (ok) {
            runInWorker(s);
          } else {
            decided = 'main';
            runInMain(s);
          }
        });
        return;
      }
      // The worker is still finishing a cancelled run: this one is sent when it answers (or is replaced).
      if (workerBusy !== 0) return;
      dispatch(s);
    }

    function runInMain(s) {
      const clock = SG.budget.createClock(opt.now);
      const budget = SG.budget.create({ ms: opt.budgetMs, now: clock.now });
      let pending = [];
      const steps = SG.pipeline.runSteps(s.config, function (event) { pending.push(event); }, budget, {
        now: clock.now,
        cooperative: true
      });
      s.abort = function abort() {
        try {
          steps.return();
        } catch (err) {
          // The generator is abandoned either way.
        }
        pending = [];
      };

      function slice() {
        if (s.state !== 'running') return;
        const began = opt.now();
        let step;
        clock.resume();
        try {
          do {
            step = steps.next();
          } while (!step.done && opt.now() - began < opt.chunkMs);
        } catch (err) {
          clock.pause();
          const events = pending;
          pending = [];
          deliver(s, events);
          settle(s, false, err);
          return;
        }
        clock.pause();
        const events = pending;
        pending = [];
        deliver(s, events);
        if (s.state !== 'running') return;
        if (step.done) {
          settle(s, true, step.value);
          return;
        }
        yieldFn().then(guarded);
      }

      function guarded() {
        try {
          slice();
        } catch (err) {
          settle(s, false, err);
        }
      }

      Promise.resolve(opt.paintFn()).then(guarded);
    }

    function ready() {
      if (readyPromise === null) {
        if (opt.forceMode === 'main') {
          decided = 'main';
          readyPromise = Promise.resolve('main');
        } else {
          const epoch = lifecycle;
          readyPromise = ensureWorker().then(function (ok) {
            // A dispose() in the meantime started over: this answer belongs to nobody.
            if (epoch !== lifecycle) return 'main';
            if (ok) {
              decided = 'worker';
              return 'worker';
            }
            if (opt.forceMode === 'worker') throw new Error('The generator worker could not be started');
            decided = 'main';
            return 'main';
          });
        }
      }
      return readyPromise;
    }

    function start(s) {
      ready().then(function (mode) {
        if (current !== s) return;
        if (mode === 'worker') runInWorker(s);
        else runInMain(s);
      }).catch(function (err) {
        settle(s, false, unexpectedError(err));
      });
    }

    function cancel() {
      const s = current;
      if (s === null) return false;
      settle(s, false, cancelledError());
      if (s.sent && worker !== null) {
        try {
          worker.postMessage({ type: 'cancel', session: s.id });
        } catch (err) {
          dropWorker();
        }
        if (workerBusy === s.id) armKill();
      }
      return true;
    }

    function generate(config, onEvent) {
      if (current !== null) cancel();
      let resolve;
      let reject;
      const promise = new Promise(function (res, rej) {
        resolve = res;
        reject = rej;
      });
      const s = {
        id: ++lastSession,
        config: config,
        onEvent: onEvent,
        state: 'running',
        sent: false,
        abort: null,
        resolve: resolve,
        reject: reject
      };
      current = s;
      start(s);
      return promise;
    }

    function dispose() {
      lifecycle++;
      if (current !== null) cancel();
      clearKill();
      if (worker !== null) {
        terminate(worker);
        worker = null;
      }
      spawning = null;
      workerBusy = 0;
      readyPromise = null;
      decided = opt.forceMode === 'main' ? 'main' : null;
      if (ownYield !== null) ownYield.close();
    }

    return {
      generate: generate,
      cancel: cancel,
      ready: ready,
      dispose: dispose,
      get mode() { return decided !== null ? decided : guessMode(opt.workerFactory); }
    };
  }

  let shared = null;

  function sharedClient() {
    if (shared === null) shared = create();
    return shared;
  }

  SG.workerClient = {
    create: create,
    generate: function generate(config, onEvent) { return sharedClient().generate(config, onEvent); },
    cancel: function cancel() { return sharedClient().cancel(); },
    ready: function ready() { return sharedClient().ready(); },
    dispose: function dispose() { if (shared !== null) shared.dispose(); },
    get mode() {
      const client = sharedClient();
      client.ready().catch(noop);
      return client.mode;
    }
  };
})(typeof self !== 'undefined' ? self : globalThis);
