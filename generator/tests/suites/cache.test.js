// Puzzle cache and background pre-generation (design.md 3.3, 9.3, 9.4 and 14.3): SG.cache. The LRU store
// runs on a fake storage; the controller (client wrapper, trace regeneration, pre-generation scheduler) runs
// against a fake app, fake clients and a fake clock.
(function () {
  'use strict';

  const root = typeof self !== 'undefined' ? self : globalThis;
  const SG = root.SG;
  const C = SG.cache;
  const P = SG.pipeline;

  function ready() {
    if (!C || !SG.i18n || !SG.store) SG.test.skip('SG.cache is not loaded here');
  }

  // Building a Killer or Greater-Than model registers a lazy propagation extension with SG.constraints (and
  // SG.comboTable) for good. Later suites (constraints) assume a pristine registry, so every test of this
  // file leaves it as it found it.
  let extensionsBefore = [];

  function extensionIds() {
    return SG.constraints ? SG.constraints.listExtensions() : [];
  }

  beforeEach(function () { extensionsBefore = extensionIds(); });

  afterEach(function () {
    extensionIds().forEach(function (id) {
      if (extensionsBefore.indexOf(id) !== -1) return;
      if (SG.comboTable && id === SG.comboTable.extension.id) SG.comboTable.disablePropagation();
      else SG.constraints.unregisterExtension(id);
    });
  });

  /** Lets the promise callbacks that are ready run. */
  async function flush() {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  }

  function cfg(extra) {
    return Object.assign({ variantId: 'classic9', difficulty: 'veryEasy', trace: 'full' }, extra);
  }

  function seeded(seed, extra) {
    return cfg(Object.assign({ seed: seed }, extra));
  }

  function key(config) {
    return C.configKey(config);
  }

  function entry(n, extra) {
    return Object.assign({ key: 'k' + n, cfg: 'c' + (n % 3), data: { n: n, pad: 'x'.repeat(120) } }, extra);
  }

  function keysOf(store) {
    return store.list().map(function (e) { return e.key; });
  }

  function memoryStorage(initial) {
    const data = Object.assign({}, initial);
    return {
      data: data,
      sets: 0,
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) {
        this.sets++;
        data[k] = String(v);
      },
      removeItem: function (k) { delete data[k]; }
    };
  }

  function quotaError() {
    const err = new Error('The quota has been exceeded.');
    err.name = 'QuotaExceededError';
    err.code = 22;
    return err;
  }

  /** Storage that refuses a value longer than `capacity` characters, like a full localStorage. */
  function limitedStorage(capacity) {
    const s = memoryStorage();
    s.setItem = function (k, v) {
      s.sets++;
      if (String(v).length > capacity) throw quotaError();
      s.data[k] = String(v);
    };
    return s;
  }

  function blockedStorage() {
    function boom() {
      const err = new Error('The operation is insecure.');
      err.name = 'SecurityError';
      throw err;
    }
    return { getItem: boom, setItem: boom, removeItem: boom };
  }

  function stored(storage) {
    return JSON.parse(storage.data[C.STORAGE_KEY]);
  }

  /** A clock with timers that only run when the test advances it. */
  function fakeClock() {
    let t = 1000;
    let next = 1;
    const pending = new Map();
    return {
      now: function () { return t; },
      set: function (fn, ms) {
        const id = next++;
        pending.set(id, { id: id, at: t + (ms || 0), fn: fn });
        return id;
      },
      clear: function (id) { pending.delete(id); },
      pending: function () { return pending.size; },
      advance: function (ms) {
        const end = t + ms;
        for (;;) {
          let due = null;
          pending.forEach(function (e) {
            if (e.at <= end && (due === null || e.at < due.at || (e.at === due.at && e.id < due.id))) due = e;
          });
          if (due === null) break;
          pending.delete(due.id);
          t = Math.max(t, due.at);
          due.fn();
        }
        t = end;
      }
    };
  }

  function cancelled() {
    return new SG.errors.GenerationError('budget.cancelled', {});
  }

  /** A client with the interface of the app's client; runs the real pipeline at once. */
  function fakeInner(mode) {
    const inner = {
      mode: mode || 'worker',
      calls: [],
      cancels: 0,
      replays: [],
      replayCancels: 0,
      results: [],
      generate: function (config, onEvent, hints) {
        inner.calls.push({ config: config, hints: hints });
        let result;
        try {
          result = P.run(config, onEvent || null);
        } catch (err) {
          return Promise.reject(err);
        }
        inner.results.push(result);
        return Promise.resolve(result);
      },
      cancel: function () {
        inner.cancels++;
        return true;
      },
      replay: function (result, options) {
        inner.replays.push({ result: result, options: options });
        return Promise.resolve({ analysis: true });
      },
      cancelReplay: function () {
        inner.replayCancels++;
        return 'inner';
      },
      ready: function () { return Promise.resolve(inner.mode); }
    };
    return inner;
  }

  /** The independent background client: a job runs when the test completes it. */
  function fakeBackground(mode) {
    const bg = {
      mode: mode || 'worker',
      calls: [],
      cancelCount: 0,
      disposed: 0,
      ignoreCancel: false,
      pending: null,
      generate: function (config, onEvent) {
        const job = { config: config, onEvent: onEvent };
        job.promise = new Promise(function (resolve, reject) {
          job.resolve = resolve;
          job.reject = reject;
        });
        bg.calls.push(job);
        bg.pending = job;
        return job.promise;
      },
      cancel: function () {
        bg.cancelCount++;
        const job = bg.pending;
        if (job !== null && !bg.ignoreCancel) {
          bg.pending = null;
          job.reject(cancelled());
        }
        return job !== null;
      },
      /** Finishes the newest job with the real pipeline (or with `result`). */
      complete: function (result) {
        const job = bg.calls[bg.calls.length - 1];
        bg.pending = null;
        job.resolve(result || P.run(job.config, job.onEvent || null));
      },
      fail: function (err) {
        const job = bg.calls[bg.calls.length - 1];
        bg.pending = null;
        job.reject(err || new Error('boom'));
      },
      ready: function () { return Promise.resolve(bg.mode); },
      dispose: function () { bg.disposed++; }
    };
    return bg;
  }

  function fakeNote() {
    const note = {
      log: [],
      show: function (k) { note.log.push('show:' + k); },
      hide: function () { note.log.push('hide'); },
      refresh: function () { note.log.push('refresh'); },
      destroy: function () { note.log.push('destroy'); }
    };
    return note;
  }

  /** A stand-in for SG.app with the pieces the controller uses. */
  function fakeApp(state) {
    const listeners = {};
    const app = {
      state: state,
      shown: null,
      attached: [],
      toasts: [],
      announced: [],
      generated: [],
      seedWrites: [],
      client: null,
      boardCalls: [],
      on: function (name, fn) {
        (listeners[name] = listeners[name] || []).push(fn);
        return function () { listeners[name] = listeners[name].filter(function (f) { return f !== fn; }); };
      },
      emit: function (name, payload) {
        (listeners[name] || []).slice().forEach(function (fn) { fn(payload); });
      },
      listenerCount: function (name) { return (listeners[name] || []).length; },
      getStore: function () {
        return {
          get: function () { return app.state; },
          set: function (patch) {
            app.seedWrites.push(patch);
            app.state = Object.assign({}, app.state, patch);
          }
        };
      },
      getResult: function () { return app.shown; },
      getBoard: function () {
        return {
          setValues: function (v) { app.boardCalls.push(['values', Array.from(v)]); },
          setGivens: function (v) { app.boardCalls.push(['givens', Array.from(v)]); }
        };
      },
      attachTrace: function (trace) {
        app.attached.push(trace);
        return true;
      },
      generate: function (overrides) {
        app.generated.push(overrides);
        return Promise.resolve(null);
      },
      toast: function (kind, k) { app.toasts.push(kind + ':' + k); },
      announce: function (text) { app.announced.push(text); },
      getClient: function () { return app.client; },
      setClient: function (next) { app.client = next; },
      /** The form changed: new state, then the 'settings' event of the store. */
      change: function (patch) {
        app.state = Object.assign({}, app.state, patch);
        app.emit('settings', { state: app.state, keys: Object.keys(patch), meta: {} });
      },
      /** A generation finished and the app shows it. */
      display: function (result, trace) {
        app.shown = { result: result, trace: trace || [] };
        app.emit('result', app.shown);
        app.emit('generate:end', result);
      }
    };
    return app;
  }

  function formState(extra) {
    return Object.assign(SG.store.defaults(),
      { variantId: 'classic9', difficulty: 'veryEasy', seed: '' }, extra);
  }

  /** Everything a controller needs, started. */
  function makeEnv(options) {
    const o = options || {};
    const clock = fakeClock();
    const app = fakeApp(formState(o.state));
    const inner = fakeInner(o.mode);
    app.client = inner;
    const bg = fakeBackground(o.bgMode);
    const note = fakeNote();
    const storage = o.storage !== undefined ? o.storage : memoryStorage();
    const store = C.createStore({ storage: storage, now: clock.now });
    const env = {
      clock: clock, app: app, inner: inner, bg: bg, note: note, store: store, hidden: false, seeds: [],
      visibilityFn: null, activityFn: null
    };
    let seedCounter = 100;
    env.controller = C.createController(Object.assign({
      app: app,
      store: store,
      inner: inner,
      createClient: function () { return bg; },
      timers: { set: clock.set, clear: clock.clear },
      now: clock.now,
      isHidden: function () { return env.hidden; },
      watchVisibility: function (fn) {
        env.visibilityFn = fn;
        return function () { env.visibilityFn = null; };
      },
      watchActivity: function (fn) {
        env.activityFn = fn;
        return function () { env.activityFn = null; };
      },
      random: function () {
        const seed = ++seedCounter;
        env.seeds.push(seed);
        return seed;
      },
      note: note
    }, o.controller));
    env.controller.start();
    env.client = env.controller.client;
    return env;
  }

  /** Stores a result as the cache would (a normal entry or a pool entry). */
  function putEntry(store, result, pool) {
    const k = key(result.config);
    const c = key(Object.assign({}, result.config, { seed: undefined }));
    return store.put({ key: k, cfg: c, pool: Boolean(pool), data: C.serialize(result) });
  }

  function poolCount(store) {
    return store.list(function (e) { return e.pool; }).length;
  }

  describe('cache: configuration keys', function () {
    beforeEach(ready);

    it('ignores the trace verbosity', function () {
      const keys = ['off', 'summary', 'full', undefined].map(function (trace) {
        return key({ variantId: 'classic9', difficulty: 'hard', seed: 5, trace: trace });
      });
      expect(keys[0]).toBe(keys[1]);
      expect(keys[1]).toBe(keys[2]);
      expect(keys[2]).toBe(keys[3]);
    });

    it('ignores the order of the variant options', function () {
      const a = key(seeded(5, { variantOptions: { x: 1, y: { b: 1, a: [2, 3] }, z: 'q' } }));
      const b = key(seeded(5, { variantOptions: { z: 'q', y: { a: [2, 3], b: 1 }, x: 1 } }));
      expect(a).toBe(b);
      expect(a).not.toBe(key(seeded(5, { variantOptions: { x: 2, y: { b: 1, a: [2, 3] }, z: 'q' } })));
      expect(a).not.toBe(key(seeded(5)));
    });

    it('fills in the defaults the way the pipeline does', function () {
      const plain = key({ variantId: 'classic9', difficulty: 'hard', seed: 9 });
      const spelled = key({
        variantId: 'classic9', difficulty: 'hard', seed: 9, symbolMode: 'digits', digOrder: 'random',
        maxAttempts: P.DEFAULT_MAX_ATTEMPTS, symmetry: SG.difficulty.spec('hard', null).symmetryDefault,
        variantOptions: {}
      });
      expect(plain).toBe(spelled);
    });

    it('tells every field that changes the puzzle apart', function () {
      const base = seeded(5, { difficulty: 'hard' });
      const variants = [
        Object.assign({}, base, { seed: 6 }), Object.assign({}, base, { difficulty: 'master' }),
        Object.assign({}, base, { symmetry: 'none' }), Object.assign({}, base, { digOrder: 'rowByRow' }),
        Object.assign({}, base, { maxAttempts: 3 }), Object.assign({}, base, { variantId: 'diagonalX' })
      ];
      const all = variants.map(key).concat(key(base));
      expect(new Set(all).size).toBe(all.length);
    });

    it('gives a seedless configuration the key of the pool, and null for an invalid one', function () {
      const pool = key(cfg({ difficulty: 'hard' }));
      expect(pool).toMatch(/\|\*\|/);
      expect(key(seeded(7, { difficulty: 'hard' }))).not.toBe(pool);
      expect(key({ variantId: 'nope', seed: 1 })).toBeNull();
      expect(key({ variantId: 'classic9', difficulty: 'evil2' })).toBeNull();
      expect(key(null)).toBeNull();
      expect(key(seeded('x'))).toBeNull();
    });
  });

  describe('cache: serialisation', function () {
    beforeEach(ready);

    const CASES = [
      { variantId: 'classic9', difficulty: 'hard', seed: 5, trace: 'full' },
      { variantId: 'killer', difficulty: 'normal', seed: 5, trace: 'full' },
      { variantId: 'greaterThan', difficulty: 'easy', seed: 5, trace: 'summary' },
      { variantId: 'jigsaw9', difficulty: 'easy', seed: 5, trace: 'full' },
      { variantId: 'samurai', difficulty: 'easy', seed: 5, trace: 'full' },
      { variantId: 'wordoku', difficulty: 'easy', seed: 5, trace: 'summary' },
      { variantId: 'mega12', difficulty: 'easy', seed: 5, trace: 'off' }
    ];

    function sameButTimings(a, b) {
      expect(a.givens).toEqual(b.givens);
      expect(a.solution).toEqual(b.solution);
      expect(a.rating).toEqual(b.rating);
      expect(a.seed).toBe(b.seed);
      expect(a.config).toEqual(b.config);
      expect(a.attempts).toBe(b.attempts);
      expect(a.warnings).toEqual(b.warnings);
      expect(a.model).toEqual(b.model);
      expect(Object.keys(a.timings)).toEqual(Object.keys(b.timings));
    }

    CASES.forEach(function (config) {
      it('round trip equals a fresh generation: ' + config.variantId + ' ' + config.difficulty, function () {
        const made = P.run(config, null);
        const text = JSON.stringify(C.serialize(made));
        const back = C.deserialize(JSON.parse(text), { trace: config.trace });
        expect(back.timings).toEqual(made.timings);
        sameButTimings(back, made);
        sameButTimings(back, P.run(config, null));
        expect(SG.model.validate(back.model).ok).toBe(true);
        expect(SG.dfs.countSolutions(back.model, back.givens, 2)).toBe(1);
        expect(back.model.inequalities.length).toBe(made.model.inequalities.length);
        expect(back.model.cages.length).toBe(made.model.cages.length);
      });
    });

    it('covers the lazily extended variants: signs and cages come back', function () {
      const gt = P.run({ variantId: 'greaterThan', difficulty: 'easy', seed: 5, trace: 'off',
        variantOptions: { futoshiki: true } }, null);
      const back = C.deserialize(C.serialize(gt));
      expect(back.model.inequalities.length).toBeGreaterThan(0);
      expect(back.model).toEqual(gt.model);
      expect(SG.dfs.countSolutions(back.model, back.givens, 2)).toBe(1);
      const killer = C.deserialize(C.serialize(P.run(CASES[1], null)));
      expect(killer.model.cages.length).toBeGreaterThan(0);
    });

    it('switches the lazy extensions on when it rebuilds a Killer or Greater-Than model', function () {
      const killer = P.run(CASES[1], null);
      const gt = P.run({ variantId: 'greaterThan', difficulty: 'easy', seed: 5, trace: 'off' }, null);
      const killerData = C.serialize(killer);
      const gtData = C.serialize(gt);
      SG.comboTable.disablePropagation();
      SG.constraints.unregisterExtension(SG.ineq.EXTENSION_ID);
      expect(SG.constraints.listExtensions()).not.toContain(SG.comboTable.extension.id);
      const backKiller = C.deserialize(killerData);
      expect(SG.constraints.listExtensions()).toContain(SG.comboTable.extension.id);
      expect(SG.dfs.countSolutions(backKiller.model, backKiller.givens, 2)).toBe(1);
      const backGt = C.deserialize(gtData);
      expect(SG.constraints.listExtensions()).toContain(SG.ineq.EXTENSION_ID);
      expect(SG.dfs.countSolutions(backGt.model, backGt.givens, 2)).toBe(1);
    });

    it('accepts the JSON text as well as the object', function () {
      const made = P.run(CASES[0], null);
      expect(C.deserialize(JSON.stringify(C.serialize(made))).givens).toEqual(made.givens);
    });

    it('re-applies the trace verbosity of the request (the downgrade rule included)', function () {
      const config = { variantId: 'samurai', difficulty: 'easy', seed: 5 };
      const off = P.run(Object.assign({ trace: 'off' }, config), null);
      const full = P.run(Object.assign({ trace: 'full' }, config), null);
      expect(full.warnings).toContain('trace.downgraded');
      const viaCache = C.deserialize(C.serialize(off), { trace: 'full' });
      expect(viaCache.config).toEqual(full.config);
      expect(viaCache.warnings).toEqual(full.warnings);
      const summary = C.deserialize(C.serialize(full), { trace: 'summary' });
      expect(summary.warnings).toEqual(P.run(Object.assign({ trace: 'summary' }, config), null).warnings);
      const small = C.deserialize(C.serialize(P.run(CASES[0], null)), { trace: 'full' });
      expect(small.warnings).toEqual([]);
      expect(small.config.trace).toBe('full');
    });

    it('does not store anything that is not part of the result', function () {
      const made = P.run(CASES[0], null);
      made.fromCache = true;
      expect(Object.keys(P.toWire(made))).not.toContain('fromCache');
      expect(Object.keys(C.serialize(made))).not.toContain('fromCache');
      expect(JSON.stringify(C.serialize(made))).not.toMatch(/fromCache/);
    });

    it('refuses data that is not a valid puzzle', function () {
      const made = P.run(CASES[0], null);
      function broken(mutate) {
        const data = JSON.parse(JSON.stringify(C.serialize(made)));
        mutate(data);
        return function () { return C.deserialize(data); };
      }
      const fail = SG.errors.GenerationError;
      expect(broken(function (d) { d.sum = d.sum + 1; })).toThrow(fail);
      expect(broken(function (d) { d.givens.d[0] = (d.givens.d[0] % 9) + 1; })).toThrow(fail);
      expect(broken(function (d) { d.solution.d[3] = (d.solution.d[3] % 9) + 1; })).toThrow(fail);
      expect(broken(function (d) { d.model.units[0].d[0] = 80; })).toThrow(fail);
      expect(broken(function (d) { d.v = 99; })).toThrow(fail);
      expect(broken(function (d) { d.rating = null; })).toThrow(fail);
      expect(broken(function (d) { d.config.seed = d.seed + 1; })).toThrow(fail);
      expect(function () { C.deserialize('{nope'); }).toThrow(fail);
      expect(function () { C.deserialize(null); }).toThrow(fail);
      expect(function () { C.deserialize({ $t: 'Nightmare', d: [] }); }).toThrow(fail);
    });
  });

  describe('cache: LRU store', function () {
    beforeEach(ready);

    it('keeps the most recently used first and evicts the oldest at the limit', function () {
      const clock = fakeClock();
      const store = C.createStore({ storage: memoryStorage(), now: clock.now });
      for (let i = 1; i <= 20; i++) {
        store.put(entry(i));
        clock.advance(1);
      }
      expect(store.list().length).toBe(20);
      expect(keysOf(store)[0]).toBe('k20');
      store.get('k1');
      expect(keysOf(store)[0]).toBe('k1');
      store.put(entry(21));
      store.put(entry(22));
      const keys = keysOf(store);
      expect(keys.length).toBe(20);
      expect(keys.slice(0, 3)).toEqual(['k22', 'k21', 'k1']);
      expect(keys).not.toContain('k2');
      expect(keys).not.toContain('k3');
      expect(keys).toContain('k4');
      expect(store.get('k2')).toBeNull();
    });

    it('can be read without touching the order', function () {
      const store = C.createStore({ storage: memoryStorage() });
      store.put(entry(1));
      store.put(entry(2));
      expect(store.get('k1', { touch: false }).key).toBe('k1');
      expect(keysOf(store)).toEqual(['k2', 'k1']);
    });

    it('replaces an entry with the same key and honours a smaller limit', function () {
      const store = C.createStore({ storage: memoryStorage(), limit: 3 });
      [1, 2, 3, 4].forEach(function (n) { store.put(entry(n)); });
      store.put(entry(3, { data: { n: 33 } }));
      expect(keysOf(store)).toEqual(['k3', 'k4', 'k2']);
      expect(store.get('k3').data.n).toBe(33);
    });

    it('persists as { version, entries } and a second store reads it', function () {
      const storage = memoryStorage();
      const a = C.createStore({ storage: storage });
      a.put(entry(1));
      a.put(entry(2, { pool: true }));
      const written = stored(storage);
      expect(written.version).toBe(C.VERSION);
      expect(written.entries.length).toBe(2);
      const b = C.createStore({ storage: storage });
      expect(keysOf(b)).toEqual(['k2', 'k1']);
      expect(b.get('k2', { touch: false }).pool).toBe(true);
      expect(b.stats().persistent).toBe(true);
      expect(b.stats().count).toBe(2);
    });

    it('purges a list of another schema version', function () {
      const storage = memoryStorage();
      C.createStore({ storage: storage, version: 1 }).put(entry(1));
      const newer = C.createStore({ storage: storage, version: 2 });
      expect(newer.list()).toEqual([]);
      expect(storage.data[C.STORAGE_KEY]).toBeUndefined();
      newer.put(entry(2));
      expect(stored(storage).version).toBe(2);
      expect(keysOf(C.createStore({ storage: storage, version: 1 }))).toEqual([]);
    });

    it('purges corrupt data of every kind and starts empty', function () {
      ['{not json', '[]', 'null', '"text"', '{"version":1}', '{"version":1,"entries":{}}', '42'].forEach(
        function (text) {
          const storage = memoryStorage();
          storage.data[C.STORAGE_KEY] = text;
          const store = C.createStore({ storage: storage });
          expect(store.list()).toEqual([]);
          expect(storage.data[C.STORAGE_KEY]).toBeUndefined();
          expect(store.put(entry(1))).toBe(true);
          expect(keysOf(C.createStore({ storage: storage }))).toEqual(['k1']);
        });
    });

    it('drops malformed entries and duplicates but keeps the good ones', function () {
      const storage = memoryStorage();
      const good = { key: 'a', cfg: 'c', at: 5, pool: false, data: { n: 1 } };
      storage.data[C.STORAGE_KEY] = JSON.stringify({ version: C.VERSION, entries: [
        good, null, 7, { key: 'b' }, { key: 'c', cfg: 'c', at: 'x', data: {} }, Object.assign({}, good)
      ] });
      expect(keysOf(C.createStore({ storage: storage }))).toEqual(['a']);
    });

    it('evicts least recently used entries and retries when the storage is full', function () {
      const storage = limitedStorage(1500);
      const store = C.createStore({ storage: storage });
      for (let i = 1; i <= 12; i++) expect(store.put(entry(i))).toBe(true);
      const keys = keysOf(store);
      expect(keys.length).toBeGreaterThan(2);
      expect(keys.length).toBeLessThan(12);
      expect(keys[0]).toBe('k12');
      expect(stored(storage).entries.length).toBe(keys.length);
      expect(store.stats().persistent).toBe(true);
      expect(store.stats().bytes).toBeLessThanOrEqual(1500);
    });

    it('gives up quietly when nothing fits, keeps working in memory and retries later', function () {
      const clock = fakeClock();
      const storage = limitedStorage(10);
      const store = C.createStore({ storage: storage, now: clock.now });
      expect(store.put(entry(1))).toBe(true);
      expect(store.put(entry(2))).toBe(true);
      expect(keysOf(store)).toEqual(['k2', 'k1']);
      expect(store.get('k1').key).toBe('k1');
      expect(store.stats().persistent).toBe(false);
      expect(store.stats().dirty).toBe(true);
      const tries = storage.sets;
      expect(tries).toBeGreaterThan(0);
      store.put(entry(3));
      store.put(entry(4));
      expect(storage.sets).toBe(tries);
      clock.advance(60000);
      store.put(entry(5));
      expect(storage.sets).toBeGreaterThan(tries);
      expect(keysOf(store).length).toBe(5);
    });

    it('persists what it held in memory once the storage accepts writes again', function () {
      const clock = fakeClock();
      const storage = memoryStorage();
      let broken = true;
      const original = storage.setItem;
      storage.setItem = function (k, v) {
        if (broken) throw quotaError();
        return original.call(storage, k, v);
      };
      const store = C.createStore({ storage: storage, now: clock.now });
      store.put(entry(1));
      expect(store.stats().persistent).toBe(false);
      broken = false;
      clock.advance(60000);
      store.put(entry(2));
      expect(store.stats().persistent).toBe(true);
      expect(keysOf(C.createStore({ storage: storage }))).toEqual(['k2', 'k1']);
    });

    it('works in memory when the storage is blocked, absent or has a throwing getter', function () {
      [blockedStorage(), null].forEach(function (storage) {
        const store = C.createStore({ storage: storage, limit: 3 });
        [1, 2, 3, 4].forEach(function (n) { expect(store.put(entry(n))).toBe(true); });
        expect(keysOf(store)).toEqual(['k4', 'k3', 'k2']);
        store.get('k2');
        expect(keysOf(store)[0]).toBe('k2');
        expect(store.remove('k3')).toBe(true);
        expect(store.stats().persistent).toBe(false);
        store.clear();
        expect(store.list()).toEqual([]);
      });
      const before = Object.getOwnPropertyDescriptor(root, 'localStorage');
      Object.defineProperty(root, 'localStorage', {
        configurable: true,
        get: function () { throw new Error('SecurityError'); }
      });
      try {
        const store = C.createStore({});
        expect(store.put(entry(1))).toBe(true);
        expect(keysOf(store)).toEqual(['k1']);
        expect(store.stats().persistent).toBe(false);
      } finally {
        if (before) Object.defineProperty(root, 'localStorage', before);
        else delete root.localStorage;
      }
    });

    it('re-reads the stored list before every change, so two tabs can share it', function () {
      const storage = memoryStorage();
      const a = C.createStore({ storage: storage });
      const b = C.createStore({ storage: storage });
      a.put(entry(1));
      b.put(entry(2));
      a.put(entry(3));
      expect(keysOf(a)).toEqual(['k3', 'k2', 'k1']);
      expect(keysOf(b)).toEqual(['k3', 'k2', 'k1']);
      b.remove('k1');
      a.get('k2');
      expect(keysOf(a)).toEqual(['k2', 'k3']);
      expect(keysOf(C.createStore({ storage: storage }))).toEqual(['k2', 'k3']);
    });

    it('limits the pre-generated entries per configuration and in all', function () {
      const store = C.createStore({ storage: memoryStorage(), poolPerConfig: 2, poolTotal: 3 });
      [1, 2, 3].forEach(function (n) { store.put({ key: 'a' + n, cfg: 'A', pool: true, data: {} }); });
      expect(keysOf(store)).toEqual(['a3', 'a2']);
      store.put({ key: 'b1', cfg: 'B', pool: true, data: {} });
      store.put({ key: 'b2', cfg: 'B', pool: true, data: {} });
      expect(keysOf(store)).toEqual(['b2', 'b1', 'a3']);
      store.put({ key: 'n1', cfg: 'A', pool: false, data: {} });
      expect(keysOf(store).length).toBe(4);
    });

    it('keeps a puzzle that was handed out out of the pool', function () {
      const store = C.createStore({ storage: memoryStorage() });
      store.put({ key: 'p', cfg: 'A', pool: true, data: {} });
      expect(store.setPool('p', false)).toBe(true);
      expect(store.get('p', { touch: false }).pool).toBe(false);
      store.put({ key: 'p', cfg: 'A', pool: true, data: {} });
      expect(store.get('p', { touch: false }).pool).toBe(false);
      expect(store.setPool('missing', true)).toBe(false);
    });

    it('never throws on junk', function () {
      const store = C.createStore({ storage: memoryStorage() });
      expect(store.put(null)).toBe(false);
      expect(store.put({ key: 1 })).toBe(false);
      expect(store.put({ key: 'a', cfg: 'b', data: 'text' })).toBe(false);
      expect(store.get('nothing')).toBeNull();
      expect(store.remove('nothing')).toBe(false);
      expect(store.list()).toEqual([]);
    });
  });

  describe('cache: SG.cache functions', function () {
    beforeEach(function () {
      ready();
      C.clear();
    });

    it('puts, gets, tests, removes and clears', function () {
      const made = P.run(seeded(21), null);
      const k = key(made.config);
      expect(C.has(k)).toBe(false);
      expect(C.put(made)).toBe(true);
      expect(C.has(k)).toBe(true);
      const back = C.get(k, { trace: 'full' });
      expect(back.givens).toEqual(made.givens);
      expect(C.stats().count).toBe(1);
      expect(C.stats().pool).toBe(0);
      expect(C.remove(k)).toBe(true);
      expect(C.get(k)).toBeNull();
      C.put(made);
      C.clear();
      expect(C.stats().count).toBe(0);
    });

    it('does not cache a result without a seed, and a miss is a miss', function () {
      expect(C.put({ config: { variantId: 'classic9' } })).toBe(false);
      const made = P.run(seeded(22), null);
      expect(C.put(made)).toBe(true);
      expect(C.get(key(made.config))).not.toBeNull();
      expect(C.get('classic9|nothing')).toBeNull();
      expect(C.stats().count).toBe(1);
    });

    it('keeps the pre-generation preference', function () {
      expect(C.isEnabled()).toBe(true);
      C.setEnabled(false);
      expect(C.isEnabled()).toBe(false);
      expect(C.stats().enabled).toBe(false);
      C.setEnabled(true);
      expect(C.isEnabled()).toBe(true);
    });
  });

  describe('cache: client wrapper', function () {
    beforeEach(ready);

    it('plugs into the app and keeps the interface of the client', function () {
      const env = makeEnv();
      expect(env.app.client).toBe(env.client);
      expect(env.client.mode).toBe('worker');
      env.inner.mode = 'main';
      expect(env.client.mode).toBe('main');
      expect(env.client.cancel()).toBe(true);
      expect(env.inner.cancels).toBe(1);
      expect(env.client.inner).toBe(env.inner);
      return env.client.ready().then(function (mode) { expect(mode).toBe('main'); });
    });

    it('forwards replay and cancelReplay to the inner client, so the page reaches it through the cache',
      async function () {
        const env = makeEnv();
        const result = { marker: 'result' };
        const options = { onProgress: function () {}, allowMain: true };
        const promise = env.client.replay(result, options);
        expect(env.inner.replays).toHaveLength(1);
        expect(env.inner.replays[0].result).toBe(result);
        expect(env.inner.replays[0].options).toBe(options);
        expect(await promise).toEqual({ analysis: true });
        expect(env.client.cancelReplay()).toBe('inner');
        expect(env.inner.replayCancels).toBe(1);
        expect(env.inner.cancels).toBe(0);
      });

    it('an inner client without replay rejects with unexpected and answers false to cancelReplay',
      async function () {
        const env = makeEnv();
        delete env.inner.replay;
        delete env.inner.cancelReplay;
        let error = null;
        try {
          await env.client.replay({}, {});
        } catch (err) {
          error = err;
        }
        expect(error instanceof SG.errors.GenerationError).toBe(true);
        expect(error.code).toBe('unexpected');
        expect(env.client.cancelReplay()).toBe(false);
      });

    it('delegates a miss, stores it, and serves the same configuration next time', async function () {
      const env = makeEnv();
      const events = [];
      const onEvent = function (e) { events.push(e); };
      const first = await env.client.generate(seeded(11), onEvent, { random: false });
      expect(env.inner.calls.length).toBe(1);
      expect(env.inner.calls[0].hints).toEqual({ random: false });
      expect(events.length).toBeGreaterThan(0);
      expect(first.fromCache).toBeUndefined();
      expect(env.store.list().length).toBe(0);
      env.clock.advance(0);
      expect(env.store.list().length).toBe(1);

      const seen = [];
      const again = seeded(11, { trace: 'summary' });
      const second = await env.client.generate(again, function (e) { seen.push(e); });
      expect(env.inner.calls.length).toBe(1);
      expect(seen).toEqual([]);
      expect(second.fromCache).toBe(true);
      expect(second.givens).toEqual(first.givens);
      expect(second.solution).toEqual(first.solution);
      expect(second.rating).toEqual(first.rating);
      expect(second.model).toEqual(first.model);
      expect(second.config.trace).toBe('summary');
      expect(first.config.trace).toBe('full');
    });

    it('is not fooled by a different configuration or seed', async function () {
      const env = makeEnv();
      await env.client.generate(seeded(11), null);
      env.clock.advance(0);
      await env.client.generate(seeded(12), null);
      await env.client.generate(seeded(11, { difficulty: 'easy' }), null);
      await env.client.generate(seeded(11, { symmetry: 'none' }), null);
      expect(env.inner.calls.length).toBe(4);
    });

    it('refreshes the LRU order on a hit', async function () {
      const env = makeEnv();
      for (const seed of [1, 2, 3]) {
        await env.client.generate(seeded(seed), null);
        env.clock.advance(0);
      }
      const oldest = key(seeded(1));
      expect(env.store.list().map(function (e) { return e.key; })[2]).toBe(oldest);
      await env.client.generate(seeded(1), null);
      expect(env.store.list()[0].key).toBe(oldest);
    });

    it('passes failures through and does not cache them', async function () {
      const env = makeEnv();
      let error = null;
      try {
        await env.client.generate({ variantId: 'classic9', difficulty: 'nope', seed: 1 }, null);
      } catch (err) {
        error = err;
      }
      expect(error instanceof SG.errors.GenerationError).toBe(true);
      env.clock.advance(0);
      expect(env.store.list().length).toBe(0);
      expect(env.controller.state().running).toBe(0);
    });

    it('never serves an explicit seed from the pool', async function () {
      const env = makeEnv();
      putEntry(env.store, P.run(seeded(500), null), true);
      const result = await env.client.generate(seeded(501), null, { random: false });
      expect(env.inner.calls.length).toBe(1);
      expect(result.seed).toBe(501);
      expect(poolCount(env.store)).toBe(1);
    });

    it('serves an explicit seed that is in the pool as an ordinary hit', async function () {
      const env = makeEnv();
      putEntry(env.store, P.run(seeded(500), null), true);
      const result = await env.client.generate(seeded(500), null);
      expect(env.inner.calls.length).toBe(0);
      expect(result.fromCache).toBe(true);
      expect(poolCount(env.store)).toBe(0);
      expect(env.store.list().length).toBe(1);
    });

    it('hands a blank seed a pre-generated puzzle of the same configuration only', async function () {
      const env = makeEnv();
      putEntry(env.store, P.run(seeded(600, { difficulty: 'easy' }), null), true);
      putEntry(env.store, P.run(seeded(601), null), true);
      putEntry(env.store, P.run(seeded(602), null), true);
      const events = [];
      const first = await env.client.generate(cfg(), function (e) { events.push(e); });
      expect(env.inner.calls.length).toBe(0);
      expect(events).toEqual([]);
      expect(first.fromCache).toBe(true);
      expect([601, 602]).toContain(first.seed);
      expect(first.config.difficulty).toBe('veryEasy');
      expect(poolCount(env.store)).toBe(2);
      expect(env.store.get(key(first.config), { touch: false }).pool).toBe(false);
      const second = await env.client.generate(cfg(), null);
      expect(second.seed).not.toBe(first.seed);
      expect([601, 602]).toContain(second.seed);
      expect(env.inner.calls.length).toBe(0);
      const third = await env.client.generate(cfg(), null);
      expect(env.inner.calls.length).toBe(1);
      expect(third.fromCache).toBeUndefined();
      expect(env.app.seedWrites).toEqual([]);
      const other = await env.client.generate(cfg({ difficulty: 'easy' }), null);
      expect(other.seed).toBe(600);
      expect(poolCount(env.store)).toBe(0);
    });

    it('treats a seed that was just drawn at random (Regenerate) like a blank one and updates the form',
      async function () {
        const env = makeEnv();
        putEntry(env.store, P.run(seeded(700), null), true);
        const result = await env.client.generate(seeded(9999), null, { random: true });
        expect(env.inner.calls.length).toBe(0);
        expect(result.seed).toBe(700);
        expect(env.app.seedWrites).toEqual([{ seed: '700' }]);
        const miss = await env.client.generate(seeded(9998), null, { random: true });
        expect(env.inner.calls.length).toBe(1);
        expect(miss.seed).toBe(9998);
        expect(env.app.seedWrites.length).toBe(1);
      });

    it('skips a pool entry that is damaged and drops it', async function () {
      const env = makeEnv();
      const bad = P.run(seeded(800), null);
      const data = C.serialize(bad);
      data.sum += 1;
      putEntry(env.store, P.run(seeded(801), null), true);
      env.store.put({ key: key(bad.config), cfg: key(cfg()), pool: true, data: data });
      const result = await env.client.generate(cfg(), null);
      expect(result.seed).toBe(801);
      expect(env.store.list().map(function (e) { return e.key; })).not.toContain(key(bad.config));
    });

    it('drops a cached entry that is damaged and generates', async function () {
      const env = makeEnv();
      const made = P.run(seeded(810), null);
      const data = C.serialize(made);
      data.solution.d[0] = 0;
      env.store.put({ key: key(made.config), cfg: key(cfg()), pool: false, data: data });
      const result = await env.client.generate(seeded(810), null);
      expect(env.inner.calls.length).toBe(1);
      expect(result.fromCache).toBeUndefined();
      env.clock.advance(0);
      expect(C.deserialize(env.store.get(key(made.config)).data).givens).toEqual(made.givens);
    });

    it('passes a configuration it cannot parse to the client, which reports it', async function () {
      const env = makeEnv();
      let error = null;
      try {
        await env.client.generate({ variantId: 'classic9', difficulty: 'nope' }, null);
      } catch (err) {
        error = err;
      }
      expect(error instanceof SG.errors.GenerationError).toBe(true);
      expect(env.inner.calls.length).toBe(1);
    });
  });

  describe('cache: trace of a served puzzle', function () {
    beforeEach(ready);

    async function served(env, seed, extra) {
      await env.client.generate(seeded(seed, extra), null);
      env.clock.advance(0);
      const hit = await env.client.generate(seeded(seed, extra), null);
      expect(hit.fromCache).toBe(true);
      return hit;
    }

    it('regenerates it from the seed, verifies it and hands it to the app', async function () {
      const env = makeEnv();
      const hit = await served(env, 31);
      env.app.display(hit);
      expect(env.bg.calls.length).toBe(1);
      expect(env.bg.calls[0].config.seed).toBe(31);
      expect(env.bg.calls[0].config.trace).toBe('full');
      expect(env.note.log[env.note.log.length - 1]).toBe('show:cache.preparing');
      expect(env.controller.state().job).toBe('trace');
      expect(env.app.boardCalls.map(function (c) { return c[0]; })).toEqual(['values', 'givens']);
      expect(env.app.boardCalls[1][1]).toEqual(Array.from(hit.givens));
      expect(env.app.attached.length).toBe(0);
      env.bg.complete();
      await flush();
      expect(env.app.attached.length).toBe(1);
      const trace = env.app.attached[0];
      expect(trace.length).toBeGreaterThan(10);
      expect(trace[trace.length - 1].type).toBe('done');
      expect(env.note.log[env.note.log.length - 1]).toBe('hide');
      expect(env.app.announced.length).toBe(1);
      expect(env.controller.state().job).toBeNull();
      expect(env.store.list().length).toBe(1);
    });

    it('asks for the trace verbosity of the request', async function () {
      const env = makeEnv();
      const hit = await served(env, 32, { trace: 'summary' });
      env.app.display(hit);
      expect(env.bg.calls[0].config.trace).toBe('summary');
      env.bg.complete();
      await flush();
      const kinds = env.app.attached[0].filter(function (e) { return e.patch !== undefined; });
      expect(kinds.length).toBe(0);
    });

    it('drops the entry and generates again when the regenerated puzzle differs', async function () {
      const env = makeEnv();
      const hit = await served(env, 33);
      env.app.display(hit);
      env.bg.complete(P.run(seeded(34), null));
      await flush();
      expect(env.app.attached.length).toBe(0);
      expect(env.store.get(key(seeded(33)), { touch: false })).toBeNull();
      expect(env.app.toasts).toEqual(['warning:cache.stale']);
      expect(env.app.generated.length).toBe(1);
      expect(env.app.generated[0].seed).toBe('33');
      expect(env.app.generated[0].variantId).toBe('classic9');
      expect(env.app.generated[0].difficulty).toBe('veryEasy');
      expect(env.note.log[env.note.log.length - 1]).toBe('hide');
    });

    it('does not use a late answer for a different puzzle on screen', async function () {
      const env = makeEnv();
      const hit = await served(env, 35);
      env.app.display(hit);
      env.app.shown = { result: P.run(seeded(36), null), trace: [] };
      env.bg.complete();
      await flush();
      expect(env.app.attached.length).toBe(0);
      expect(env.app.generated.length).toBe(0);
    });

    it('cancels the regeneration for a new generation and ignores a late answer', async function () {
      const env = makeEnv();
      env.bg.ignoreCancel = true;
      const hit = await served(env, 37);
      env.app.display(hit);
      expect(env.controller.state().job).toBe('trace');
      await env.client.generate(seeded(38), null);
      expect(env.bg.cancelCount).toBe(1);
      expect(env.controller.state().job).toBeNull();
      expect(env.note.log[env.note.log.length - 1]).toBe('hide');
      env.app.display(env.inner.results[env.inner.results.length - 1]);
      env.bg.complete();
      await flush();
      expect(env.app.attached.length).toBe(0);
      expect(env.app.toasts).toEqual([]);
      expect(env.app.generated.length).toBe(0);
    });

    it('ignores the answer of an older regeneration after a newer served puzzle', async function () {
      const env = makeEnv();
      env.bg.ignoreCancel = true;
      const first = await served(env, 41);
      env.app.display(first);
      const firstJob = env.bg.calls[0];
      const second = await served(env, 42);
      env.app.display(second);
      expect(env.bg.calls.length).toBe(2);
      firstJob.resolve(P.run(firstJob.config, null));
      await flush();
      expect(env.app.attached.length).toBe(0);
      env.bg.complete();
      await flush();
      expect(env.app.attached.length).toBe(1);
    });

    it('shows a note and keeps the puzzle when the regeneration fails', async function () {
      const env = makeEnv();
      const hit = await served(env, 43);
      env.app.display(hit);
      env.bg.fail(new Error('worker died'));
      await flush();
      expect(env.note.log[env.note.log.length - 1]).toBe('show:cache.failed');
      expect(env.app.attached.length).toBe(0);
      expect(env.app.generated.length).toBe(0);
      expect(env.controller.state().job).toBeNull();
    });

    it('reports a trace the app refuses', async function () {
      const env = makeEnv();
      env.app.attachTrace = function () { return false; };
      const hit = await served(env, 44);
      env.app.display(hit);
      env.bg.complete();
      await flush();
      expect(env.note.log[env.note.log.length - 1]).toBe('show:cache.failed');
    });

    it('does nothing for a puzzle that was generated normally', async function () {
      const env = makeEnv();
      const made = await env.client.generate(seeded(45), null);
      env.app.display(made);
      expect(env.bg.calls.length).toBe(0);
      expect(env.note.log.filter(function (l) { return l.indexOf('show') === 0; })).toEqual([]);
    });

    it('drops the regeneration when something else is put on screen (an imported puzzle)', async function () {
      const env = makeEnv();
      env.bg.ignoreCancel = true;
      const hit = await served(env, 46);
      env.app.display(hit);
      expect(env.controller.state().job).toBe('trace');
      const imported = P.run(seeded(47), null);
      env.app.shown = { result: imported, trace: [], imported: true };
      env.app.emit('result', env.app.shown);
      expect(env.bg.cancelCount).toBe(1);
      expect(env.controller.state().job).toBeNull();
      expect(env.note.log[env.note.log.length - 1]).toBe('hide');
      env.bg.complete();
      await flush();
      expect(env.app.attached.length).toBe(0);
    });

    it('refreshes the note when the language changes', function () {
      const env = makeEnv();
      env.app.emit('locale', { locale: 'vi' });
      expect(env.note.log).toContain('refresh');
    });
  });

  describe('cache: pre-generation', function () {
    beforeEach(ready);

    /** A page that has shown one puzzle: the pre-generator is armed. */
    async function shown(env) {
      const result = await env.client.generate(SG.store.toConfig(env.app.state), null);
      env.app.display(result);
      await flush();
      return result;
    }

    it('does not start before a puzzle was shown', async function () {
      const env = makeEnv();
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(0);
      expect(env.controller.state().armed).toBe(false);
    });

    it('starts after the idle delay: same configuration, random seed, no trace', async function () {
      const env = makeEnv();
      await shown(env);
      expect(env.controller.state().idleTimer).toBe(true);
      env.clock.advance(999);
      expect(env.bg.calls.length).toBe(0);
      env.clock.advance(1);
      expect(env.bg.calls.length).toBe(1);
      const config = env.bg.calls[0].config;
      expect(config.variantId).toBe('classic9');
      expect(config.difficulty).toBe('veryEasy');
      expect(config.seed).toBe(env.seeds[0]);
      expect(config.trace).toBe('off');
      expect(config.symmetry).toBe(SG.store.toConfig(env.app.state).symmetry);
      expect(env.controller.state().job).toBe('pregen');
    });

    it('fills the pool one job at a time, up to two puzzles', async function () {
      const env = makeEnv();
      await shown(env);
      env.clock.advance(1000);
      env.app.change({ seed: '77' });
      env.clock.advance(5000);
      expect(env.bg.calls.length).toBe(1);
      env.bg.complete();
      await flush();
      expect(poolCount(env.store)).toBe(1);
      expect(env.controller.state().job).toBeNull();
      env.clock.advance(999);
      expect(env.bg.calls.length).toBe(1);
      env.clock.advance(1);
      expect(env.bg.calls.length).toBe(2);
      expect(env.bg.calls[1].config.seed).toBe(env.seeds[1]);
      env.bg.complete();
      await flush();
      expect(poolCount(env.store)).toBe(2);
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(2);
      const first = await env.client.generate(cfg(), null);
      expect(first.fromCache).toBe(true);
      expect(poolCount(env.store)).toBe(1);
      expect(env.inner.calls.length).toBe(1);
    });

    it('hands what it pre-generated to the next blank-seed generation', async function () {
      const env = makeEnv();
      await shown(env);
      env.clock.advance(1000);
      env.bg.complete();
      await flush();
      const next = await env.client.generate(SG.store.toConfig(env.app.state), null);
      expect(next.fromCache).toBe(true);
      expect(next.seed).toBe(env.seeds[0]);
      expect(env.inner.calls.length).toBe(1);
    });

    it('never runs two jobs at once', async function () {
      const env = makeEnv();
      await shown(env);
      env.clock.advance(1000);
      expect(env.controller.state().job).toBe('pregen');
      env.app.emit('generate:end', null);
      env.app.change({ lang: 'vi' });
      env.clock.advance(10000);
      env.app.emit('generate:end', null);
      env.clock.advance(10000);
      expect(env.bg.calls.length).toBe(1);
    });

    it('is cancelled at once when the user generates, and its late answer is ignored', async function () {
      const env = makeEnv();
      env.bg.ignoreCancel = true;
      await shown(env);
      env.clock.advance(1000);
      expect(env.controller.state().job).toBe('pregen');
      const pending = env.bg.calls[0];
      await env.client.generate(seeded(5), null);
      expect(env.bg.cancelCount).toBe(1);
      expect(env.controller.state().job).toBeNull();
      expect(env.controller.state().idleTimer).toBe(false);
      pending.resolve(P.run(pending.config, null));
      await flush();
      expect(poolCount(env.store)).toBe(0);
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(1);
    });

    it('does not run while a generation is in progress', async function () {
      const env = makeEnv();
      await shown(env);
      let release = null;
      env.inner.generate = function (config) {
        return new Promise(function (resolve) { release = function () { resolve(P.run(config, null)); }; });
      };
      const running = env.client.generate(seeded(6), null);
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(0);
      release();
      const result = await running;
      env.app.display(result);
      env.clock.advance(1000);
      expect(env.bg.calls.length).toBe(1);
    });

    it('is cancelled when the configuration changes, and restarts for the new one', async function () {
      const env = makeEnv();
      await shown(env);
      env.clock.advance(1000);
      expect(env.bg.calls.length).toBe(1);
      env.app.change({ difficulty: 'easy' });
      expect(env.bg.cancelCount).toBe(1);
      expect(env.controller.state().job).toBeNull();
      env.clock.advance(999);
      expect(env.bg.calls.length).toBe(1);
      env.clock.advance(1);
      expect(env.bg.calls.length).toBe(2);
      expect(env.bg.calls[1].config.difficulty).toBe('easy');
      env.bg.complete();
      await flush();
      expect(poolCount(env.store)).toBe(1);
      expect(env.store.list()[0].cfg).toBe(key(cfg({ difficulty: 'easy' })));
    });

    it('is not cancelled by a change that is not part of the puzzle', async function () {
      const env = makeEnv();
      await shown(env);
      env.clock.advance(1000);
      env.app.change({ lang: 'vi' });
      env.app.change({ speed: 'fast' });
      expect(env.bg.cancelCount).toBe(0);
      expect(env.controller.state().job).toBe('pregen');
    });

    it('waits for the user to be idle: a key or pointer press or a form change restarts the delay',
      async function () {
        const env = makeEnv();
        await shown(env);
        env.clock.advance(800);
        env.activityFn();
        env.clock.advance(200);
        expect(env.bg.calls.length).toBe(0);
        env.clock.advance(799);
        expect(env.bg.calls.length).toBe(0);
        env.clock.advance(1);
        expect(env.bg.calls.length).toBe(1);
        env.bg.complete();
        await flush();
        env.clock.advance(500);
        env.app.change({ seed: '5' });
        env.clock.advance(700);
        expect(env.bg.calls.length).toBe(1);
        env.clock.advance(300);
        expect(env.bg.calls.length).toBe(2);
      });

    it('pauses while the tab is hidden and resumes when it is visible again', async function () {
      const env = makeEnv();
      await shown(env);
      env.clock.advance(1000);
      expect(env.bg.calls.length).toBe(1);
      env.hidden = true;
      env.visibilityFn(true);
      expect(env.bg.cancelCount).toBe(1);
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(1);
      env.hidden = false;
      env.visibilityFn(false);
      env.clock.advance(1000);
      expect(env.bg.calls.length).toBe(2);
    });

    it('does not start in a hidden tab at all', async function () {
      const env = makeEnv();
      env.hidden = true;
      env.visibilityFn(true);
      await shown(env);
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(0);
    });

    it('does not exist in main-thread mode', async function () {
      const env = makeEnv({ mode: 'main' });
      await shown(env);
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(0);
      expect(env.controller.state().job).toBeNull();
    });

    it('gives up when its own client turns out to run on the main thread', async function () {
      const env = makeEnv({ bgMode: 'main' });
      await shown(env);
      env.clock.advance(1000);
      await flush();
      expect(env.bg.calls.length).toBe(0);
      expect(env.controller.isEnabled()).toBe(false);
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(0);
    });

    it('can be switched off and on', async function () {
      const env = makeEnv();
      await shown(env);
      env.clock.advance(1000);
      expect(env.bg.calls.length).toBe(1);
      env.controller.setEnabled(false);
      expect(env.bg.cancelCount).toBe(1);
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(1);
      env.controller.setEnabled(true);
      env.clock.advance(1000);
      expect(env.bg.calls.length).toBe(2);
      const off = makeEnv({ controller: { pregen: false } });
      await shown(off);
      off.clock.advance(60000);
      expect(off.bg.calls.length).toBe(0);
    });

    it('skips configurations that cost too much, by the cost table', async function () {
      const slow = makeEnv({ controller: { maxCostMs: 10 } });
      await shown(slow);
      slow.clock.advance(60000);
      expect(slow.bg.calls.length).toBe(0);
      expect(C.estimateCost({ variantId: 'classic9', difficulty: 'hard' })).toBeLessThan(1000);
      expect(C.estimateCost({ variantId: 'nothing', difficulty: 'hard' })).toBe(Infinity);
      expect(C.estimateCost({ variantId: 'classic9', difficulty: 'nothing' })).toBe(Infinity);
      SG.variants.list().forEach(function (def) {
        const levels = SG.difficulty.LEVELS.filter(function (l) {
          return SG.difficulty.isSupported(l, { variantId: def.id });
        });
        levels.forEach(function (level) {
          expect(C.estimateCost({ variantId: def.id, difficulty: level })).toBeLessThan(Infinity);
        });
      });
    });

    it('abandons a job that takes too long and does not try that configuration again', async function () {
      const env = makeEnv({ controller: { limitMs: 4000 } });
      await shown(env);
      env.clock.advance(1000);
      expect(env.bg.calls.length).toBe(1);
      env.clock.advance(3999);
      expect(env.bg.cancelCount).toBe(0);
      env.clock.advance(1);
      expect(env.bg.cancelCount).toBe(1);
      expect(env.controller.state().job).toBeNull();
      expect(env.controller.state().blocked.length).toBe(1);
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(1);
      env.app.change({ difficulty: 'easy' });
      await flush();
      env.clock.advance(1000);
      expect(env.bg.calls.length).toBe(2);
    });

    it('does not try a configuration again after a failure', async function () {
      const env = makeEnv();
      await shown(env);
      env.clock.advance(1000);
      env.bg.fail(new Error('boom'));
      await flush();
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(1);
    });

    it('waits for the trace of a served puzzle before it pre-generates', async function () {
      const env = makeEnv();
      await env.client.generate(seeded(51), null);
      env.clock.advance(0);
      const hit = await env.client.generate(seeded(51), null);
      env.app.display(hit);
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(1);
      expect(env.bg.calls[0].config.seed).toBe(51);
      env.bg.complete();
      await flush();
      env.clock.advance(1000);
      expect(env.bg.calls.length).toBe(2);
      expect(env.bg.calls[1].config.seed).toBe(env.seeds[0]);
    });

    it('frees the worker after a while without a job', async function () {
      const env = makeEnv();
      await shown(env);
      env.clock.advance(1000);
      env.bg.complete();
      await flush();
      env.clock.advance(1000);
      env.bg.complete();
      await flush();
      expect(env.bg.disposed).toBe(0);
      env.clock.advance(31000);
      expect(env.bg.disposed).toBe(1);
    });

    it('stops everything on destroy and gives the original client back', async function () {
      const env = makeEnv();
      await shown(env);
      env.clock.advance(1000);
      env.controller.destroy();
      expect(env.bg.cancelCount).toBe(1);
      expect(env.bg.disposed).toBe(1);
      expect(env.app.client).toBe(env.inner);
      expect(env.app.listenerCount('result')).toBe(0);
      expect(env.app.listenerCount('settings')).toBe(0);
      expect(env.activityFn).toBeNull();
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(1);
    });
  });

  describe('cache: imported puzzles', function () {
    beforeEach(ready);

    /** What an import may deliver: a valid puzzle that has no seed and a thin configuration. */
    function seedless() {
      const made = P.run(seeded(60), null);
      return Object.assign({}, made, { seed: undefined, config: { variantId: 'classic9' } });
    }

    function showImported(env, result) {
      env.app.shown = { result: result, trace: [], imported: true };
      env.app.emit('result', env.app.shown);
    }

    it('are never cached, regenerated or pre-generated for', async function () {
      const env = makeEnv();
      showImported(env, seedless());
      showImported(env, P.run(seeded(61), null));
      env.clock.advance(60000);
      await flush();
      expect(env.bg.calls.length).toBe(0);
      expect(env.store.list()).toEqual([]);
      expect(env.note.log.filter(function (l) { return l.indexOf('show') === 0; })).toEqual([]);
      expect(env.app.attached).toEqual([]);
      expect(env.app.boardCalls).toEqual([]);
    });

    it('are not taken for a served puzzle, whatever they claim', async function () {
      const env = makeEnv();
      await env.client.generate(seeded(62), null);
      env.clock.advance(0);
      const hit = await env.client.generate(seeded(62), null);
      expect(hit.fromCache).toBe(true);
      showImported(env, hit);
      expect(env.bg.calls.length).toBe(0);
      expect(env.app.boardCalls).toEqual([]);
      expect(env.controller.state().job).toBeNull();
    });

    it('cancel the regeneration of the puzzle they replace', async function () {
      const env = makeEnv();
      env.bg.ignoreCancel = true;
      await env.client.generate(seeded(63), null);
      env.clock.advance(0);
      env.app.display(await env.client.generate(seeded(63), null));
      expect(env.controller.state().job).toBe('trace');
      showImported(env, seedless());
      expect(env.bg.cancelCount).toBe(1);
      expect(env.controller.state().job).toBeNull();
      env.bg.complete();
      await flush();
      expect(env.app.attached).toEqual([]);
      expect(env.app.generated).toEqual([]);
      expect(env.app.toasts).toEqual([]);
    });

    it('stop the pre-generator until something is generated again', async function () {
      const env = makeEnv();
      await env.client.generate(SG.store.toConfig(env.app.state), null);
      env.app.display(await env.client.generate(SG.store.toConfig(env.app.state), null));
      await flush();
      expect(env.controller.state().armed).toBe(true);
      expect(env.controller.state().idleTimer).toBe(true);
      showImported(env, seedless());
      expect(env.controller.state().armed).toBe(false);
      expect(env.controller.state().idleTimer).toBe(false);
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(0);
      env.app.change({ seed: '5' });
      env.clock.advance(60000);
      expect(env.bg.calls.length).toBe(0);
      const result = await env.client.generate(SG.store.toConfig(env.app.state), null);
      env.app.display(result);
      await flush();
      env.clock.advance(1000);
      expect(env.bg.calls.length).toBe(1);
    });

    it('stop a pre-generation that is running', async function () {
      const env = makeEnv();
      env.app.display(await env.client.generate(SG.store.toConfig(env.app.state), null));
      await flush();
      env.clock.advance(1000);
      expect(env.controller.state().job).toBe('pregen');
      showImported(env, seedless());
      expect(env.bg.cancelCount).toBe(1);
      expect(env.controller.state().job).toBeNull();
    });

    it('can not be put in the cache by mistake: no seed or configuration, no entry', function () {
      expect(C.put(seedless())).toBe(false);
      expect(C.put(Object.assign({}, seedless(), { config: undefined }))).toBe(false);
      expect(C.put({})).toBe(false);
      expect(C.put(null)).toBe(false);
      expect(C.stats().count).toBe(0);
    });
  });

  describe('cache: init and strings', function () {
    beforeEach(ready);

    it('init takes over the client of an app once, and refuses an app without the hook', function () {
      const app = fakeApp(formState());
      app.client = fakeInner();
      expect(C.init({})).toBe(false);
      expect(C.init(null)).toBe(false);
      expect(C.init(app)).toBe(true);
      expect(C.init(app)).toBe(true);
      const wrapper = app.client;
      app.client = fakeInner();
      expect(C.init(app)).toBe(true);
      expect(app.client).toBe(wrapper);
      expect(wrapper.inner).not.toBeUndefined();
      expect(app.listenerCount('result')).toBe(1);
      const other = fakeApp(formState());
      other.client = fakeInner();
      expect(C.init(other)).toBe(true);
      expect(app.listenerCount('result')).toBe(0);
      expect(app.client).toBe(wrapper.inner);
      expect(other.client).not.toBe(wrapper);
      C.destroy();
      expect(other.listenerCount('result')).toBe(0);
    });

    it('has exactly the four cache.* strings, in both languages', function () {
      const keys = ['cache.preparing', 'cache.ready', 'cache.failed', 'cache.stale'];
      const mine = SG.localeFragments.filter(function (f) {
        return Object.keys(f.en).some(function (k) { return k.indexOf('cache.') === 0; });
      });
      expect(mine.length).toBe(1);
      expect(Object.keys(mine[0].en).sort()).toEqual(keys.slice().sort());
      keys.forEach(function (k) { expect(SG.i18n.has(k)).toBe(true); });
    });
  });
})();
