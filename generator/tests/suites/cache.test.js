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
      expect(a.work).toEqual(b.work);
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

    it('MS05a-T01: keeps the exactness flag; an entry stored without it is refused, not read as not exact',
      function () {
        const made = P.run(CASES[0], null);
        [true, false].forEach(function (flag) {
          const data = C.serialize(Object.assign({}, made, { exact: flag }));
          expect(data.exact).toBe(flag);
          expect(C.deserialize(JSON.stringify(data)).exact).toBe(flag);
        });
        // MS17b (schema 3): the cache needs the explicit flag; the shared wire still reads a missing one as
        // false (worker.test.js)
        const before = JSON.parse(JSON.stringify(C.serialize(made)));
        delete before.exact;
        expect(function () { return C.deserialize(before); }).toThrow(SG.errors.GenerationError);
      });

    it('MS06c1-T01: keeps the target (a number, zero, null) of the result; an entry stored before it is null',
      function () {
        const made = P.run(CASES[0], null);
        // a fresh request in a finite band has its sample's target, and the entry keeps it as it is
        expect(Number.isFinite(made.target)).toBe(true);
        [812.5, 0, null].forEach(function (value) {
          const data = C.serialize(Object.assign({}, made, { target: value }));
          expect(data.target).toBe(value);
          expect(C.deserialize(JSON.parse(JSON.stringify(data))).target).toBe(value);
          expect(C.deserialize(JSON.stringify(data)).target).toBe(value);
        });
        const plain = C.serialize(made);
        expect(plain.target).toBe(made.target);
        expect(C.deserialize(JSON.parse(JSON.stringify(plain))).target).toBe(made.target);
        // an entry stored before the field, and a value that is no finite number: no target, never a guess
        const before = JSON.parse(JSON.stringify(C.serialize(Object.assign({}, made, { target: 812.5 }))));
        delete before.target;
        expect(C.deserialize(before).target).toBe(null);
        ['812', true, {}, []].forEach(function (odd) {
          const tampered = JSON.parse(JSON.stringify(plain));
          tampered.target = odd;
          expect(C.deserialize(tampered).target).toBe(null);
        });
        // an infinite number never reaches the cache entry: the wire has made it null
        const infinite = C.serialize(Object.assign({}, made, { target: Infinity }));
        expect(infinite.target).toBe(null);
      });

    it('MS05r3-T02: keeps the work of the generation, nested records included; an old entry has none',
      function () {
        const made = P.run({ variantId: 'classic9', difficulty: 'master', seed: 1, trace: 'off',
          maxAttempts: 1 }, null);
        const work = [{ ratings: 7, proposals: 12, maxRatings: 1024, maxProposals: 32768, localSearches: [
          { ratings: 5, proposals: 12, firstShallowAt: 2, shallowRatings: 3, shallowLimit: 64,
            capHit: 'shallow' },
          { ratings: 1, proposals: 0, firstShallowAt: null, shallowRatings: 0, shallowLimit: null,
            capHit: null }] }];
        [made.work, work].forEach(function (list) {
          const data = C.serialize(Object.assign({}, made, { work: list }));
          const back = C.deserialize(JSON.parse(JSON.stringify(data)), { trace: 'off' });
          expect(back.work).toEqual(list);
          expect(back.work).not.toBe(list);
          expect(back.work[0].localSearches).not.toBe(list[0].localSearches);
          expect(C.deserialize(JSON.stringify(data), { trace: 'off' }).work).toEqual(list);
        });
        const before = JSON.parse(JSON.stringify(C.serialize(made)));
        delete before.work;
        expect(C.deserialize(before, { trace: 'off' }).work).toBe(undefined);
        const bare = Object.assign({}, made);
        delete bare.work;
        expect('work' in C.serialize(bare)).toBe(false);
        // a malformed list is unavailable, never an empty list or zero work
        const odd = JSON.parse(JSON.stringify(C.serialize(made)));
        odd.work = [{ ratings: 7 }];
        expect(C.deserialize(odd, { trace: 'off' }).work).toBe(undefined);
      });

    it('MS05b1-T05: a shallow fallback keeps exact false and both warnings; a required result keeps its flag',
      function () {
        const shallow = P.run({ variantId: 'classic9', difficulty: 'nightmare', seed: 6, trace: 'summary',
          maxAttempts: 1 }, null);
        expect(shallow.exact).toBe(false);
        expect(shallow.rating.level).toBe('nightmare');
        expect(shallow.warnings).toEqual(['difficulty.approximate', 'difficulty.shallow']);
        const back = C.deserialize(JSON.parse(JSON.stringify(C.serialize(shallow))), { trace: 'summary' });
        expect(back.exact).toBe(false);
        expect(back.warnings).toEqual(['difficulty.approximate', 'difficulty.shallow']);
        sameButTimings(back, shallow);
        const required = P.run(CASES[0], null);
        const again = C.deserialize(JSON.parse(JSON.stringify(C.serialize(required))), { trace: 'full' });
        expect(again.exact).toBe(required.exact);
        expect(again.warnings).toEqual(required.warnings);
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

  describe('cache: version 3 and the complete classification (MS17b)', function () {
    beforeEach(function () {
      ready();
      C.clear();
    });

    const EASY = { variantId: 'classic9', difficulty: 'easy', seed: 5, trace: 'summary' };
    const KILLER = { variantId: 'killer', difficulty: 'easy', seed: 5, trace: 'summary' };
    const SIGNS = { variantId: 'greaterThan', difficulty: 'normal', seed: 5, trace: 'summary' };
    const WORDOKU = { variantId: 'wordoku', difficulty: 'easy', seed: 5, trace: 'summary' };
    const SHALLOW = { variantId: 'classic9', difficulty: 'nightmare', seed: 6, trace: 'summary',
      maxAttempts: 1 };
    const RATING_FIELDS = ['level', 'score', 'rawScore', 'confidence', 'hardestTechnique', 'hardestGroup',
      'solved', 'empties', 'techniqueCounts', 'ratingVersion'];

    const generated = {};

    /** A fresh generation of `config`, made once: the cases below only read it and build changed copies. */
    function runOnce(config) {
      const id = JSON.stringify(config);
      if (!generated[id]) generated[id] = P.run(config, null);
      return generated[id];
    }

    function wireOf(result) {
      return JSON.parse(JSON.stringify(C.serialize(result)));
    }

    function refuses(wire) {
      expect(function () { return C.deserialize(wire); }).toThrow(SG.errors.GenerationError);
    }

    it('MS17b-T01: schema 3 under the same key; a schema-2 list is purged, not migrated', function () {
      expect(C.VERSION).toBe(3);
      expect(SG.difficulty.RATING_VERSION).toBe(3);
      expect(C.STORAGE_KEY).toBe('sg.cache.v1');
      const made = runOnce(EASY);
      const storage = memoryStorage();
      expect(putEntry(C.createStore({ storage: storage, version: 2 }), made)).toBe(true);
      expect(stored(storage).version).toBe(2);
      const current = C.createStore({ storage: storage });
      expect(current.list()).toEqual([]);
      expect(storage.data[C.STORAGE_KEY]).toBeUndefined();
      expect(putEntry(current, made)).toBe(true);
      expect(stored(storage).version).toBe(3);
      expect(keysOf(C.createStore({ storage: storage }))).toEqual([key(made.config)]);
      expect(C.deserialize(current.get(key(made.config)).data).givens).toEqual(made.givens);
    });

    it('MS17b-T01: the write and read boundaries need an own boolean exact; nothing becomes a valid false',
      function () {
        const made = runOnce(EASY);
        [true, false].forEach(function (flag) {
          const data = C.serialize(Object.assign({}, made, { exact: flag }));
          expect(data.exact).toBe(flag);
          expect(C.deserialize(JSON.stringify(data)).exact).toBe(flag);
        });
        const missing = Object.assign({}, made);
        delete missing.exact;
        const inherited = Object.assign(Object.create({ exact: true }), missing);
        const odd = ['true', 1, 0, null, undefined, {}, []].map(function (value) {
          return Object.assign({}, made, { exact: value });
        });
        [missing, inherited].concat(odd).forEach(function (bad) {
          expect(function () { return C.serialize(bad); }).toThrow(SG.errors.GenerationError);
          expect(C.put(bad)).toBe(false);
        });
        expect(C.stats().count).toBe(0);
        ['true', 1, 0, null].forEach(function (value) {
          const wire = wireOf(made);
          wire.exact = value;
          refuses(wire);
        });
        const absent = wireOf(made);
        delete absent.exact;
        refuses(absent);
        // the shared wire keeps its worker compatibility: it reads a missing flag as false, never as exact
        const shared = P.toWire(made);
        delete shared.exact;
        expect(P.fromWire(shared).exact).toBe(false);
        expect(C.put(made)).toBe(true);
        expect(C.has(key(made.config))).toBe(true);
      });

    it('MS17b-T01: a rating needs its ten fields, the current version and local consistency to enter',
      function () {
        const made = runOnce(EASY);
        const rating = made.rating;
        expect(RATING_FIELDS.filter(function (name) { return !(name in rating); })).toEqual([]);
        expect(rating.hardestTechnique).not.toBeNull();
        expect(Object.keys(rating.techniqueCounts).length).toBeGreaterThan(0);
        const otherGroup = rating.hardestGroup === 'fish' ? 'wing' : 'fish';
        function bad(mutate) {
          const wire = wireOf(made);
          mutate(wire.rating, wire);
          refuses(wire);
          // the write boundary refuses the same ratings, whatever the rating holds
          const result = Object.assign({}, made, { rating: JSON.parse(JSON.stringify(made.rating)) });
          mutate(result.rating, result);
          expect(function () { return C.serialize(result); }).toThrow(SG.errors.GenerationError);
        }
        RATING_FIELDS.forEach(function (name) { bad(function (r) { delete r[name]; }); });
        [null, [], 'rating', 7].forEach(function (value) {
          bad(function (r, holder) { holder.rating = value; });
        });
        ['hell3', 'Hard', 5, null, ''].forEach(function (value) { bad(function (r) { r.level = value; }); });
        [-1, 1.5, '700', null, true, NaN, Infinity].forEach(function (value) {
          bad(function (r) {
            r.score = value;
            r.rawScore = value;
          });
        });
        [rating.score + 1, String(rating.score), null].forEach(function (value) {
          bad(function (r) { r.rawScore = value; });
        });
        [-0.1, 1.1, '0.5', null, true, NaN, Infinity, -Infinity].forEach(function (value) {
          bad(function (r) { r.confidence = value; });
        });
        bad(function (r) { r.hardestTechnique = null; });
        bad(function (r) { r.hardestGroup = null; });
        bad(function (r) { r.hardestGroup = otherGroup; });
        bad(function (r) { r.hardestTechnique = 'noSuchTechnique'; });
        bad(function (r) { r.hardestTechnique = 5; });
        bad(function (r) {
          r.hardestTechnique = null;
          r.hardestGroup = 'basic';
        });
        [false, 'true', 1, null].forEach(function (value) { bad(function (r) { r.solved = value; }); });
        [-1, 82, 1.5, '30', null].forEach(function (value) { bad(function (r) { r.empties = value; }); });
        [null, [], 'x', 7, { noSuchTechnique: 1 }, { nakedSingle: -1 }, { nakedSingle: 1.5 },
          { nakedSingle: '3' }, { nakedSingle: null }, { nakedSingle: 3, noSuchTechnique: 0 }].forEach(
          function (value) { bad(function (r) { r.techniqueCounts = value; }); });
        [2, 4, '3', 3.5, null, true].forEach(function (value) {
          bad(function (r) { r.ratingVersion = value; });
        });
      });

    it('MS17b-T01: the bounds of a rating are inclusive, extra fields are ignored, any level may be a ' +
      'fallback', function () {
      const made = runOnce(EASY);
      function read(mutate) {
        const wire = wireOf(made);
        mutate(wire.rating);
        return C.deserialize(wire).rating;
      }
      expect(read(function (r) { r.note = 'extra'; }).note).toBe('extra');
      expect(read(function (r) { r.empties = 0; }).empties).toBe(0);
      expect(read(function (r) { r.empties = 81; }).empties).toBe(81);
      expect(read(function (r) { r.confidence = 0; }).confidence).toBe(0);
      expect(read(function (r) { r.confidence = 1; }).confidence).toBe(1);
      expect(read(function (r) {
        r.score = 0;
        r.rawScore = 0;
      }).score).toBe(0);
      expect(read(function (r) { r.techniqueCounts = {}; }).techniqueCounts).toEqual({});
      expect(read(function (r) { r.techniqueCounts.xWing = 0; }).techniqueCounts.xWing).toBe(0);
      const none = read(function (r) {
        r.hardestTechnique = null;
        r.hardestGroup = null;
      });
      expect([none.hardestTechnique, none.hardestGroup]).toEqual([null, null]);
      SG.difficulty.LEVELS.forEach(function (level) {
        expect(read(function (r) { r.level = level; }).level).toBe(level);
      });
    });

    it('MS17b-T01: a canonical unrated result is refused by the cache, in both directions', function () {
      const made = runOnce(EASY);
      const unrated = SG.difficulty.classify(
        { solved: false, score: 120, techniqueCounts: { nakedSingle: 4 } }, made.model);
      expect(unrated.solved).toBe(false);
      expect(unrated.level).toBeNull();
      expect(unrated.score).toBeNull();
      const result = Object.assign({}, made, { rating: unrated });
      expect(function () { return C.serialize(result); }).toThrow(SG.errors.GenerationError);
      expect(C.put(result)).toBe(false);
      expect(C.has(key(made.config))).toBe(false);
      const wire = wireOf(made);
      wire.rating = JSON.parse(JSON.stringify(unrated));
      refuses(wire);
    });

    it('MS17b-T01: the write boundary refuses a result that is no record, has no usable model size or only ' +
      'inherits its rating', function () {
      const made = runOnce(EASY);
      [null, undefined, 'text', 7, [], function () { return made; }].forEach(function (bad) {
        expect(function () { return C.serialize(bad); }).toThrow(SG.errors.GenerationError);
        expect(C.put(bad)).toBe(false);
      });
      ['81', 81.5, 0, -1, null, undefined, NaN].forEach(function (cellCount) {
        const bad = Object.assign({}, made, {
          model: Object.assign({}, made.model, { cellCount: cellCount })
        });
        expect(function () { return C.serialize(bad); }).toThrow(SG.errors.GenerationError);
      });
      const noModel = Object.assign({}, made, { model: null });
      expect(function () { return C.serialize(noModel); }).toThrow(SG.errors.GenerationError);
      const inherited = Object.assign({}, made, { rating: Object.create(made.rating) });
      expect(function () { return C.serialize(inherited); }).toThrow(SG.errors.GenerationError);
      // each field alone may not be inherited either
      RATING_FIELDS.forEach(function (name) {
        const own = Object.assign({}, made.rating);
        delete own[name];
        const proto = {};
        proto[name] = made.rating[name];
        const bad = Object.assign({}, made, { rating: Object.setPrototypeOf(own, proto) });
        expect(function () { return C.serialize(bad); }).toThrow(SG.errors.GenerationError);
      });
      [0, -1].forEach(function (cellCount) {
        const bad = Object.assign({}, made, {
          rating: Object.assign({}, made.rating, { empties: 0 }),
          model: Object.assign({}, made.model, { cellCount: cellCount })
        });
        expect(function () { return C.serialize(bad); }).toThrow(SG.errors.GenerationError);
      });
      ['cellCount', 'model'].forEach(function (name) {
        const wire = wireOf(made);
        if (name === 'model') wire.model = null;
        else wire.model.cellCount = '81';
        refuses(wire);
      });
    });

    it('MS17b-T01: the current version itself must be a positive safe integer and the level and technique ' +
      'registries present', function () {
        const made = runOnce(EASY);
        const difficulty = SG.difficulty;
        const savedVersion = difficulty.RATING_VERSION;
        const savedLevels = difficulty.LEVELS;
        const savedTechniques = SG.techniques;
        try {
          // a rating that states exactly the odd current value is still refused: nothing is coerced
          const odds = ['3', 3.5, 0, -1, NaN, Infinity, null, undefined, [3], Number.MAX_SAFE_INTEGER + 1,
            { valueOf: function () { return 3; } }];
          odds.forEach(function (odd) {
            difficulty.RATING_VERSION = odd;
            const rating = Object.assign({}, made.rating, { ratingVersion: odd });
            const bad = Object.assign({}, made, { rating: rating });
            expect(function () { return C.serialize(bad); }).toThrow(SG.errors.GenerationError);
          });
          difficulty.RATING_VERSION = savedVersion;
          [undefined, null, 'hard', {}].forEach(function (odd) {
            difficulty.LEVELS = odd;
            expect(function () { return C.serialize(made); }).toThrow(SG.errors.GenerationError);
          });
          difficulty.LEVELS = savedLevels;
          [undefined, null, {}, { has: 5 }].forEach(function (odd) {
            SG.techniques = odd;
            expect(function () { return C.serialize(made); }).toThrow(SG.errors.GenerationError);
          });
        } finally {
          difficulty.RATING_VERSION = savedVersion;
          difficulty.LEVELS = savedLevels;
          SG.techniques = savedTechniques;
        }
        expect(C.serialize(made).rating.ratingVersion).toBe(3);
      });

    it('MS17b-B01: a stored entry of an older rating version or without its flag or a field is not served',
      async function () {
        const config = Object.assign({}, EASY, { seed: 51 });
        const made = runOnce(config);
        const damage = [
          function (w) { w.rating.ratingVersion = 2; },
          function (w) { delete w.exact; },
          function (w) { delete w.rating.empties; },
          function (w) { w.rating.hardestGroup = 'cage'; }
        ];
        for (let i = 0; i < damage.length; i++) {
          const env = makeEnv();
          const wire = wireOf(made);
          damage[i](wire);
          const cfg = key(Object.assign({}, config, { seed: undefined }));
          expect(env.store.put({ key: key(config), cfg: cfg, pool: false, data: wire })).toBe(true);
          const out = await env.client.generate(config, null);
          expect(out.fromCache).toBeUndefined();
          expect(env.inner.calls.length).toBe(1);
          expect(out.rating.ratingVersion).toBe(3);
          env.clock.advance(0);
          const hit = await env.client.generate(config, null);
          expect(hit.fromCache).toBe(true);
          expect(env.inner.calls.length).toBe(1);
        }
      });

    function withRating(patch) {
      return function (fresh) {
        return Object.assign({}, fresh, { rating: Object.assign({}, fresh.rating, patch(fresh.rating)) });
      };
    }

    function withModel(patch) {
      return function (fresh) {
        return Object.assign({}, fresh, { model: Object.assign({}, fresh.model, patch(fresh.model)) });
      };
    }

    function withLayout(patch) {
      return withModel(function (model) {
        return { layout: Object.assign({}, model.layout, patch(model.layout)) };
      });
    }

    function without(field) {
      return function (fresh) {
        const copy = Object.assign({}, fresh);
        delete copy[field];
        return copy;
      };
    }

    function changeOne(list, index, patch) {
      return Array.from(list, function (item, i) {
        return i === index ? Object.assign({}, item, patch(item)) : item;
      });
    }

    /**
     * What the controller does when `change(fresh)` is the regeneration of the cached puzzle of `config`:
     * 'same' (the record is attached) or 'stale' (the entry is dropped, the toast shown, the puzzle generated
     * again). `mode` damages the served puzzle itself first (a damaged copy in memory): 'both' changes it the
     * same way as the regeneration, so that the two sides agree on bad data, and 'served' changes only the
     * served side; such a pair must never be taken for the same puzzle.
     */
    async function verdict(config, change, mode) {
      const made = runOnce(config);
      const env = makeEnv();
      putEntry(env.store, made, false);
      const hit = await env.client.generate(config, null);
      if (hit.fromCache !== true) return 'not served';
      if (mode === 'both' || mode === 'served') {
        const changed = change(hit);
        Object.keys(hit).forEach(function (name) { if (!(name in changed)) delete hit[name]; });
        Object.assign(hit, changed);
      }
      env.app.display(hit);
      await flush();
      if (env.bg.calls.length !== 1) return 'no regeneration';
      env.bg.pending = null;
      env.bg.calls[0].resolve(change === null || mode === 'served' ? made : change(made));
      await flush();
      if (env.app.attached.length === 1 && env.app.toasts.length === 0 && env.app.generated.length === 0) {
        return 'same';
      }
      const dropped = env.store.get(key(config), { touch: false }) === null;
      if (env.app.attached.length === 0 && env.app.toasts.join() === 'warning:cache.stale' &&
          env.app.generated.length === 1 && dropped) {
        return 'stale';
      }
      return 'neither (' + env.app.attached.length + ' attached, toasts ' + env.app.toasts.join() + ', ' +
        env.app.generated.length + ' generated)';
    }

    async function wrongVerdicts(rows, expected, mode) {
      const wrong = [];
      for (let i = 0; i < rows.length; i++) {
        const got = await verdict(rows[i][1], rows[i][2], mode);
        if (got !== expected) wrong.push(rows[i][0] + ': ' + got);
      }
      return wrong;
    }

    function reorderedCounts(rating) {
      const out = {};
      Object.keys(rating.techniqueCounts).reverse().forEach(function (id) {
        out[id] = rating.techniqueCounts[id];
      });
      if (!('swordfish' in out)) out.swordfish = 0;
      return { techniqueCounts: out };
    }

    it('MS17b-T02: a regeneration that differs only in timing, display or representation is the same puzzle',
      async function () {
        const rows = [
          ['the identical regeneration', EASY, null],
          ['a shallow fallback regenerates equal', SHALLOW, null],
          ['timings, attempts, work, target, warnings and trace differ', EASY, function (f) {
            return Object.assign({}, f, { timings: { total: 1 }, attempts: f.attempts + 2, work: undefined,
              target: 123, warnings: ['x'], config: Object.assign({}, f.config, { trace: 'off' }) });
          }],
          ['an extra rating field', EASY, withRating(function () { return { steps: [], note: 'x' }; })],
          ['counts in another key order with valid zero entries', EASY, withRating(reorderedCounts)],
          ['a null-prototype count map', EASY, withRating(function (r) {
            return { techniqueCounts: Object.assign(Object.create(null), r.techniqueCounts) };
          })],
          ['unit cells in another order', EASY, withModel(function (m) {
            return { units: Array.from(m.units, function (u) { return Int32Array.from(u).reverse(); }) };
          })],
          ['cage cells in another order', KILLER, withModel(function (m) {
            return { cages: Array.from(m.cages, function (c) {
              return Object.assign({}, c, { cells: Int32Array.from(c.cells).reverse() });
            }) };
          })],
          ['overlay cells in another order', WORDOKU, withLayout(function (l) {
            return { overlays: Array.from(l.overlays, function (o) {
              return { kind: o.kind, cells: Int32Array.from(o.cells).reverse() };
            }) };
          })],
          ['other unit labels', EASY, withModel(function (m) {
            return { unitMeta: Array.from(m.unitMeta, function (u) {
              return Object.assign({}, u, { label: 'X' + u.label });
            }) };
          })],
          ['a partial flag that is false instead of absent', EASY, withModel(function (m) {
            return { unitMeta: changeOne(m.unitMeta, 0, function () { return { partial: false }; }) };
          })],
          ['other symbols and symbol mode (display only)', WORDOKU, withModel(function (m) {
            return { symbols: { mode: 'other', labels: m.symbols.labels.slice().reverse() } };
          })],
          ['other derived indexes', EASY, withModel(function () { return { peers: [], cellUnits: [] }; })],
          ['an equal copy rebuilt from the wire', KILLER, function (f) { return P.fromWire(P.toWire(f)); }],
          ['an equal Greater-Than copy rebuilt from the wire', SIGNS, function (f) {
            return P.fromWire(P.toWire(f));
          }]
        ];
        expect(await wrongVerdicts(rows, 'same')).toEqual([]);
      });

    it('MS17b-T02: a regeneration with another exactness or rating field is stale, a well-typed one included',
      async function () {
        const rating = runOnce(EASY).rating;
        const counts = Object.keys(rating.techniqueCounts);
        const hardest = rating.hardestTechnique === 'nakedSingle'
          ? { hardestTechnique: 'xWing', hardestGroup: 'fish' }
          : { hardestTechnique: 'nakedSingle', hardestGroup: 'basic' };
        const rows = [
          ['exact flipped', EASY, function (f) { return Object.assign({}, f, { exact: !f.exact }); }],
          ['exact missing', EASY, without('exact')],
          ['exact not a boolean', EASY, function (f) { return Object.assign({}, f, { exact: 'true' }); }],
          ['another level, same score', EASY, withRating(function (r) {
            return { level: r.level === 'hard' ? 'normal' : 'hard' };
          })],
          ['another score and raw score', EASY, withRating(function (r) {
            return { score: r.score + 1, rawScore: r.score + 1 };
          })],
          ['another confidence', EASY, withRating(function (r) {
            return { confidence: r.confidence === 0.5 ? 0.25 : 0.5 };
          })],
          ['another hardest technique and group', EASY, withRating(function () { return hardest; })],
          ['another number of empty cells', EASY, withRating(function (r) {
            return { empties: r.empties === 0 ? 1 : r.empties - 1 };
          })],
          ['another count', EASY, withRating(function (r) {
            const more = {};
            more[counts[0]] = r.techniqueCounts[counts[0]] + 1;
            return { techniqueCounts: Object.assign({}, r.techniqueCounts, more) };
          })],
          ['an extra counted technique', EASY, withRating(function (r) {
            return { techniqueCounts: Object.assign({}, r.techniqueCounts, { swordfish: 2 }) };
          })],
          ['an extra technique used once', EASY, withRating(function (r) {
            return { techniqueCounts: Object.assign({}, r.techniqueCounts, { swordfish: 1 }) };
          })],
          ['a count dropped', EASY, withRating(function (r) {
            const copy = Object.assign({}, r.techniqueCounts);
            delete copy[counts[0]];
            return { techniqueCounts: copy };
          })],
          ['an empty count map', EASY, withRating(function () { return { techniqueCounts: {} }; })],
          ['another rating version', EASY, withRating(function () { return { ratingVersion: 2 }; })],
          ['a future rating version', EASY, withRating(function () { return { ratingVersion: 4 }; })],
          ['no rating', EASY, function (f) { return Object.assign({}, f, { rating: null }); }],
          ['solved false', EASY, withRating(function () { return { solved: false }; })],
          ['a raw score that differs', EASY, withRating(function (r) { return { rawScore: r.score + 1 }; })],
          ['a negative score', EASY, withRating(function () { return { score: -1, rawScore: -1 }; })],
          ['a group that is not the registered one', EASY, withRating(function (r) {
            return { hardestGroup: r.hardestGroup === 'fish' ? 'wing' : 'fish' };
          })],
          ['more empty cells than the board', EASY, withRating(function () { return { empties: 82 }; })]
        ];
        RATING_FIELDS.forEach(function (name) {
          rows.push(['the rating field ' + name + ' missing', EASY, function (f) {
            const copy = Object.assign({}, f.rating);
            delete copy[name];
            return Object.assign({}, f, { rating: copy });
          }]);
        });
        rows.push(['an unknown hardest technique', EASY, withRating(function () {
          return { hardestTechnique: 'noSuchTechnique', hardestGroup: 'basic' };
        })]);
        const sameGroup = SG.techniques.list().filter(function (t) {
          return t.group === rating.hardestGroup && t.id !== rating.hardestTechnique;
        })[0];
        expect(sameGroup).toBeDefined();
        rows.push(['another hardest technique of the same group', EASY, withRating(function () {
          return { hardestTechnique: sameGroup.id };
        })]);
        rows.push(['rating fields that are only inherited', EASY, function (f) {
          return Object.assign({}, f, { rating: Object.create(f.rating) });
        }]);
        rows.push(['one given changed', EASY, function (f) {
          const givens = Int32Array.from(f.givens);
          givens[0] += 1;
          return Object.assign({}, f, { givens: givens });
        }]);
        rows.push(['one solution cell changed', EASY, function (f) {
          const solution = Int32Array.from(f.solution);
          solution[0] += 1;
          return Object.assign({}, f, { solution: solution });
        }]);
        rows.push(['shorter givens', EASY, function (f) {
          return Object.assign({}, f, { givens: f.givens.slice(0, f.givens.length - 1) });
        }]);
        rows.push(['shorter solution', EASY, function (f) {
          return Object.assign({}, f, { solution: f.solution.slice(0, f.solution.length - 1) });
        }]);
        rows.push(['no givens', EASY, function (f) { return Object.assign({}, f, { givens: null }); }]);
        rows.push(['no solution', EASY, function (f) {
          return Object.assign({}, f, { solution: undefined });
        }]);
        ['text', 7, [], {}, null, undefined].forEach(function (value, i) {
          rows.push(['a regeneration that is no result #' + i, EASY, function () { return value; }]);
        });
        expect(await wrongVerdicts(rows, 'stale')).toEqual([]);
        // invalid on both sides at once (a damaged copy of the served puzzle) is not "the same" either
        const invalid = new RegExp(['exact missing', 'exact not', 'rating version', 'no rating',
          'solved false', 'raw score that', 'negative', 'registered', 'more empty', 'field .* missing',
          'unknown hardest', 'only inherited'].join('|'));
        const both = rows.filter(function (row) { return invalid.test(row[0]); });
        expect(both.length).toBeGreaterThan(15);
        expect(await wrongVerdicts(both, 'stale', 'both')).toEqual([]);
      });

    it('MS17b-T02: a regeneration with a changed semantic model is stale, whatever solution fits both',
      async function () {
        const premises = { killer: runOnce(KILLER).model, signs: runOnce(SIGNS).model,
          wordoku: runOnce(WORDOKU).model, classic: runOnce(EASY).model };
        expect(premises.killer.cages.length).toBeGreaterThan(1);
        expect(premises.signs.inequalities.length).toBeGreaterThan(1);
        expect(premises.wordoku.layout.overlays.length).toBeGreaterThan(0);
        expect(premises.classic.units.length).toBeGreaterThan(1);
        function cellsWith(cells, n) {
          const copy = Int32Array.from(cells);
          copy[0] = (copy[0] + 1) % n;
          return copy;
        }
        // the first and the last entry exchanged: the same values in another order, so another board
        function swapped(vectorOfCells) {
          const copy = Int32Array.from(vectorOfCells);
          const last = copy.length - 1;
          const kept = copy[0];
          copy[0] = copy[last];
          copy[last] = kept;
          expect(copy[0]).not.toBe(vectorOfCells[0]);
          return copy;
        }
        function vector(name, change) {
          return withModel(function (m) {
            const copy = Int32Array.from(m[name]);
            copy[0] = change(copy[0]);
            const patch = {};
            patch[name] = copy;
            return patch;
          });
        }
        const rows = [
          ['a cage sum changed', KILLER, withModel(function (m) {
            return { cages: changeOne(m.cages, 0, function (c) { return { sum: c.sum + 1 }; }) };
          })],
          ['a cage cell replaced', KILLER, withModel(function (m) {
            return { cages: changeOne(m.cages, 0, function (c) {
              return { cells: cellsWith(c.cells, m.cellCount) };
            }) };
          })],
          ['a cage distinct flag flipped', KILLER, withModel(function (m) {
            return { cages: changeOne(m.cages, 0, function (c) { return { distinct: !c.distinct }; }) };
          })],
          ['a cage removed', KILLER, withModel(function (m) {
            return { cages: Array.from(m.cages).slice(1) };
          })],
          ['cages in another outer order', KILLER, withModel(function (m) {
            return { cages: Array.from(m.cages).reverse() };
          })],
          ['a sign reversed', SIGNS, withModel(function (m) {
            return { inequalities: changeOne(m.inequalities, 0, function (s) {
              return { a: s.b, b: s.a };
            }) };
          })],
          ['a sign removed', SIGNS, withModel(function (m) {
            return { inequalities: Array.from(m.inequalities).slice(1) };
          })],
          ['signs in another outer order', SIGNS, withModel(function (m) {
            return { inequalities: Array.from(m.inequalities).reverse() };
          })],
          ['a unit kind changed', EASY, withModel(function (m) {
            return { unitMeta: changeOne(m.unitMeta, 0, function (u) { return { kind: u.kind + 'x' }; }) };
          })],
          ['a unit grid index changed', EASY, withModel(function (m) {
            return { unitMeta: changeOne(m.unitMeta, 0, function (u) {
              return { gridIndex: u.gridIndex + 1 };
            }) };
          })],
          ['a unit marked partial', EASY, withModel(function (m) {
            return { unitMeta: changeOne(m.unitMeta, 0, function () { return { partial: true }; }) };
          })],
          ['a unit cell replaced', EASY, withModel(function (m) {
            return { units: Array.from(m.units, function (u, i) {
              return i === 0 ? cellsWith(u, m.cellCount) : u;
            }) };
          })],
          ['units in another outer order', EASY, withModel(function (m) {
            return { units: Array.from(m.units).reverse(), unitMeta: Array.from(m.unitMeta).reverse() };
          })],
          ['a unit removed', EASY, withModel(function (m) {
            return { units: Array.from(m.units).slice(1), unitMeta: Array.from(m.unitMeta).slice(1) };
          })],
          ['a region mapping changed', EASY, withLayout(function (l) {
            const copy = Int32Array.from(l.cellRegion);
            copy[0] += 1;
            return { cellRegion: copy };
          })],
          ['a cell row changed', EASY, withLayout(function (l) {
            const copy = Int32Array.from(l.cellRow);
            copy[0] += 1;
            return { cellRow: copy };
          })],
          ['a cell column changed', EASY, withLayout(function (l) {
            const copy = Int32Array.from(l.cellCol);
            copy[0] += 1;
            return { cellCol: copy };
          })],
          ['two cell rows swapped', EASY, withLayout(function (l) {
            return { cellRow: swapped(l.cellRow) };
          })],
          ['two cell columns swapped', EASY, withLayout(function (l) {
            return { cellCol: swapped(l.cellCol) };
          })],
          ['two region entries swapped', EASY, withLayout(function (l) {
            return { cellRegion: swapped(l.cellRegion) };
          })],
          ['the row count changed', EASY, withLayout(function (l) { return { rows: l.rows + 1 }; })],
          ['the column count changed', EASY, withLayout(function (l) { return { cols: l.cols + 1 }; })],
          ['a fixed cell changed', EASY, vector('fixedCells', function (v) { return v + 1; })],
          ['a sub-grid origin changed', EASY, withLayout(function (l) {
            return { subGrids: changeOne(l.subGrids, 0, function (g) {
              return { originRow: g.originRow + 1 };
            }) };
          })],
          ['a sub-grid origin column changed', EASY, withLayout(function (l) {
            return { subGrids: changeOne(l.subGrids, 0, function (g) {
              return { originCol: g.originCol + 1 };
            }) };
          })],
          ['a sub-grid index changed', EASY, withLayout(function (l) {
            return { subGrids: changeOne(l.subGrids, 0, function (g) {
              return { gridIndex: g.gridIndex + 1 };
            }) };
          })],
          ['an overlay kind changed', WORDOKU, withLayout(function (l) {
            return { overlays: changeOne(l.overlays, 0, function (o) { return { kind: o.kind + 'x' }; }) };
          })],
          ['an overlay cell replaced', WORDOKU, withLayout(function (l) {
            return { overlays: changeOne(l.overlays, 0, function (o) {
              return { cells: cellsWith(o.cells, premises.wordoku.cellCount) };
            }) };
          })],
          ['an overlay added', WORDOKU, withLayout(function (l) {
            return { overlays: Array.from(l.overlays).concat([l.overlays[0]]) };
          })],
          ['the variant changed', EASY, withModel(function () { return { variantId: 'classic9x' }; })],
          ['the digits changed', EASY, withModel(function (m) { return { digits: m.digits + 1 }; })]
        ];
        expect(await wrongVerdicts(rows, 'stale')).toEqual([]);
      });

    it('MS17b-T02: malformed model or count data never matches and never throws out of the comparison',
      async function () {
        const rows = [
          ['no model', EASY, function (f) { return Object.assign({}, f, { model: null }); }],
          ['a model that is not a record', EASY, function (f) { return Object.assign({}, f, { model: 5 }); }],
          ['no layout', EASY, withModel(function () { return { layout: null }; })],
          ['units that are not a list', EASY, withModel(function () { return { units: 5 }; })],
          ['unit metadata of another length', EASY, withModel(function (m) {
            return { unitMeta: Array.from(m.unitMeta).slice(1) };
          })],
          ['a unit cell out of range', EASY, withModel(function (m) {
            return { units: Array.from(m.units, function (u, i) { return i === 0 ? [m.cellCount] : u; }) };
          })],
          ['a fractional unit cell', EASY, withModel(function (m) {
            return { units: Array.from(m.units, function (u, i) { return i === 0 ? [1.5] : u; }) };
          })],
          ['a unit metadata that is not a record', EASY, withModel(function (m) {
            return { unitMeta: Array.from(m.unitMeta, function (u, i) { return i === 0 ? null : u; }) };
          })],
          ['a partial flag that is not a boolean', EASY, withModel(function (m) {
            return { unitMeta: changeOne(m.unitMeta, 0, function () { return { partial: 'yes' }; }) };
          })],
          ['a cage sum that is not finite', KILLER, withModel(function (m) {
            return { cages: changeOne(m.cages, 0, function () { return { sum: NaN }; }) };
          })],
          ['a cage sum that is a string', KILLER, withModel(function (m) {
            return { cages: changeOne(m.cages, 0, function (c) { return { sum: String(c.sum) }; }) };
          })],
          ['a cage flag that is missing', KILLER, withModel(function (m) {
            return { cages: changeOne(m.cages, 0, function () { return { distinct: undefined }; }) };
          })],
          ['a sign with a missing end', SIGNS, withModel(function (m) {
            return { inequalities: changeOne(m.inequalities, 0, function () { return { b: undefined }; }) };
          })],
          ['a fixed-cell vector of the wrong length', EASY, withModel(function () {
            return { fixedCells: new Int32Array(10) };
          })],
          ['a fixed-cell vector that is too long', EASY, withModel(function () {
            return { fixedCells: new Int32Array(82) };
          })],
          ['unit metadata with an extra entry', EASY, withModel(function (m) {
            return { unitMeta: Array.from(m.unitMeta).concat([m.unitMeta[0]]) };
          })],
          ['a region vector with a fractional entry', EASY, withLayout(function (l) {
            const copy = Array.from(l.cellRegion);
            copy[0] = 0.5;
            return { cellRegion: copy };
          })],
          ['an overlay without its kind', WORDOKU, withLayout(function (l) {
            return { overlays: changeOne(l.overlays, 0, function () { return { kind: 7 }; }) };
          })],
          ['a sub-grid with a missing field', EASY, withLayout(function (l) {
            return { subGrids: changeOne(l.subGrids, 0, function () { return { originCol: undefined }; }) };
          })],
          ['a cell count that is a string', EASY, withModel(function () { return { cellCount: '81' }; })],
          ['no variant id', EASY, withModel(function () { return { variantId: undefined }; })],
          ['digits that are not an integer', EASY, withModel(function () { return { digits: 9.5 }; })],
          ['a row count that is not an integer', EASY, withLayout(function () { return { rows: 9.5 }; })],
          ['a column count that is not an integer', EASY, withLayout(function () { return { cols: '9' }; })],
          ['a cage cell out of range', KILLER, withModel(function (m) {
            return { cages: changeOne(m.cages, 0, function () { return { cells: [m.cellCount] }; }) };
          })],
          ['a sign end out of range', SIGNS, withModel(function (m) {
            return { inequalities: changeOne(m.inequalities, 0, function () { return { a: m.cellCount }; }) };
          })],
          ['a sign end that is not an integer', SIGNS, withModel(function (m) {
            return { inequalities: changeOne(m.inequalities, 0, function () { return { a: 0.5 }; }) };
          })],
          ['a sign second end out of range', SIGNS, withModel(function (m) {
            return { inequalities: changeOne(m.inequalities, 0, function () { return { b: m.cellCount }; }) };
          })],
          ['a sign end that is negative', SIGNS, withModel(function (m) {
            return { inequalities: changeOne(m.inequalities, 0, function () { return { a: -1 }; }) };
          })],
          ['a sign second end that is negative', SIGNS, withModel(function (m) {
            return { inequalities: changeOne(m.inequalities, 0, function () { return { b: -1 }; }) };
          })],
          ['a sign that is null', SIGNS, withModel(function (m) {
            return { inequalities: Array.from(m.inequalities, function (s, i) {
              return i === 0 ? null : s;
            }) };
          })],
          ['a cage that is null', KILLER, withModel(function (m) {
            return { cages: Array.from(m.cages, function (c, i) { return i === 0 ? null : c; }) };
          })],
          ['an overlay that is null', WORDOKU, withLayout(function (l) {
            return { overlays: Array.from(l.overlays, function (o, i) { return i === 0 ? null : o; }) };
          })],
          ['a sub-grid that is null', EASY, withLayout(function () { return { subGrids: [null] }; })],
          ['a sub-grid without its index', EASY, withLayout(function (l) {
            return { subGrids: changeOne(l.subGrids, 0, function () { return { gridIndex: undefined }; }) };
          })],
          ['a sub-grid without its first origin', EASY, withLayout(function (l) {
            return { subGrids: changeOne(l.subGrids, 0, function () { return { originRow: '0' }; }) };
          })],
          ['digits that are zero', EASY, withModel(function () { return { digits: 0 }; })],
          ['a unit kind that is not a text', EASY, withModel(function (m) {
            return { unitMeta: changeOne(m.unitMeta, 0, function () { return { kind: 7 }; }) };
          })],
          ['a unit grid index that is a text', EASY, withModel(function (m) {
            return { unitMeta: changeOne(m.unitMeta, 0, function () { return { gridIndex: '0' }; }) };
          })],
          ['a negative unit cell', EASY, withModel(function (m) {
            return { units: Array.from(m.units, function (u, i) { return i === 0 ? [-1] : u; }) };
          })],
          ['a unit that is a data view', EASY, withModel(function (m) {
            return { units: Array.from(m.units, function (u, i) {
              return i === 0 ? new DataView(new ArrayBuffer(8)) : u;
            }) };
          })],
          ['no givens', EASY, function (f) { return Object.assign({}, f, { givens: null }); }],
          ['no solution', EASY, function (f) { return Object.assign({}, f, { solution: undefined }); }],
          ['givens that are no list', EASY, function (f) { return Object.assign({}, f, { givens: {} }); }],
          ['a solution that is no list', EASY, function (f) {
            return Object.assign({}, f, { solution: {} });
          }]
        ];
        function counts(make) {
          return withRating(function (r) {
            return { techniqueCounts: make(Object.assign({}, r.techniqueCounts)) };
          });
        }
        [['no count map', function () { return undefined; }],
          ['a null count map', function () { return null; }],
          ['an array', function () { return []; }],
          ['an array carrying the keys', function (c) { return Object.assign([], c); }],
          ['a text', function () { return 'text'; }],
          ['a number', function () { return 7; }],
          ['a Map', function (c) {
            return new Map(Object.keys(c).map(function (id) { return [id, c[id]]; }));
          }],
          ['the right keys under another prototype', function (c) {
            return Object.assign(Object.create({ inherited: 1 }), c);
          }],
          ['an unknown id with a zero count', function (c) {
            return Object.assign(c, { noSuchTechnique: 0 });
          }],
          ['an unknown id', function (c) { return Object.assign(c, { noSuchTechnique: 1 }); }],
          ['a negative count', function (c) { return Object.assign(c, { swordfish: -1 }); }],
          ['a fractional count', function (c) { return Object.assign(c, { swordfish: 0.5 }); }],
          ['a NaN count', function (c) { return Object.assign(c, { swordfish: NaN }); }],
          ['an infinite count', function (c) { return Object.assign(c, { swordfish: Infinity }); }],
          ['a count beyond the safe integers', function (c) {
            return Object.assign(c, { swordfish: Number.MAX_SAFE_INTEGER + 1 });
          }],
          ['a string count', function (c) { return Object.assign(c, { swordfish: '3' }); }],
          ['a null count', function (c) { return Object.assign(c, { swordfish: null }); }]
        ].forEach(function (row) { rows.push([row[0], EASY, counts(row[1])]); });
        expect(await wrongVerdicts(rows, 'stale')).toEqual([]);
        expect(await wrongVerdicts(rows, 'stale', 'both')).toEqual([]);
        expect(await wrongVerdicts(rows, 'stale', 'served')).toEqual([]);
      });

    it('MS17b-T02: the comparison changes nothing it reads and solves nothing', async function () {
      const made = runOnce(KILLER);
      const reversed = function (list) {
        return Array.from(list, function (u) { return Int32Array.from(u).reverse(); });
      };
      const fresh = Object.assign({}, made, {
        rating: Object.assign({}, made.rating, reorderedCounts(made.rating)),
        model: Object.assign({}, made.model, { units: reversed(made.model.units),
          cages: Array.from(made.model.cages, function (c) {
            return Object.assign({}, c, { cells: Int32Array.from(c.cells).reverse() });
          }) })
      });
      const snapshot = function () {
        return JSON.stringify([P.toWire(fresh), Object.keys(fresh.rating.techniqueCounts),
          Array.from(fresh.model.cages[0].cells), Array.from(fresh.model.units[0])]);
      };
      const before = snapshot();
      const env = makeEnv();
      putEntry(env.store, made, false);
      const hit = await env.client.generate(KILLER, null);
      env.app.display(hit);
      await flush();
      expect(env.bg.calls.length).toBe(1);
      const solvers = [[SG.logicalSolver, 'solve'], [SG.dfs, 'countSolutions'], [SG.difficulty, 'classify'],
        [SG.difficulty, 'rate']];
      const originals = solvers.map(function (pair) { return pair[0][pair[1]]; });
      let calls = 0;
      solvers.forEach(function (pair, i) {
        pair[0][pair[1]] = function () {
          calls++;
          return originals[i].apply(this, arguments);
        };
      });
      try {
        env.bg.complete(fresh);
        await flush();
      } finally {
        solvers.forEach(function (pair, i) { pair[0][pair[1]] = originals[i]; });
      }
      expect(env.app.attached.length).toBe(1);
      expect(env.app.toasts).toEqual([]);
      expect(calls).toBe(0);
      expect(snapshot()).toBe(before);
      expect(Object.keys(hit.rating.techniqueCounts)).toEqual(Object.keys(made.rating.techniqueCounts));
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
      await flush();
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
      await flush();
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
      await flush();
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
      await flush();
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
      await flush();
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
      await flush();
      const firstJob = env.bg.calls[0];
      const second = await served(env, 42);
      env.app.display(second);
      await flush();
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
      await flush();
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
      await flush();
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
      await flush();
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

  describe('cache: the gate of the trace of a served puzzle', function () {
    beforeEach(ready);

    async function served(env, seed) {
      await env.client.generate(seeded(seed), null);
      env.clock.advance(0);
      const hit = await env.client.generate(seeded(seed), null);
      expect(hit.fromCache).toBe(true);
      return hit;
    }

    /** A stand-in for the `markTraceUnavailable` of the app that counts its calls. */
    function spyUnavailable(env) {
      env.unavailable = 0;
      env.app.markTraceUnavailable = function () {
        env.unavailable++;
        return true;
      };
    }

    it('on a main-thread page regenerates the record only after the press, on the page\'s own client',
      async function () {
        const env = makeEnv({ mode: 'main' });
        spyUnavailable(env);
        const hit = await served(env, 61);
        const calls = env.inner.calls.length;
        env.app.display(hit);
        await flush();
        expect(env.bg.calls.length).toBe(0);
        expect(env.inner.calls.length).toBe(calls);
        expect(env.controller.state().job).toBeNull();
        expect(env.note.log).not.toContain('show:cache.preparing');
        expect(env.unavailable).toBe(0);
        env.app.emit('replay:consent', { result: P.run(seeded(62), null) });
        env.app.emit('replay:consent', null);
        await flush();
        expect(env.inner.calls.length).toBe(calls);
        env.app.emit('replay:consent', { result: hit });
        await flush();
        expect(env.bg.calls.length).toBe(0);
        expect(env.inner.calls.length).toBe(calls + 1);
        expect(env.inner.calls[calls].config.seed).toBe(61);
        expect(env.inner.calls[calls].config.trace).toBe('full');
        expect(env.app.attached.length).toBe(1);
        expect(env.app.attached[0].length).toBeGreaterThan(10);
        expect(env.unavailable).toBe(0);
        expect(env.store.list().length).toBe(1);
        env.app.emit('replay:consent', { result: hit });
        await flush();
        expect(env.inner.calls.length).toBe(calls + 1);
      });

    it('a press that arrives before the page client has said what it is starts exactly one regeneration',
      async function () {
        const env = makeEnv({ mode: 'main' });
        const hit = await served(env, 63);
        const calls = env.inner.calls.length;
        env.app.display(hit);
        env.app.emit('replay:consent', { result: hit });
        await flush();
        expect(env.inner.calls.length).toBe(calls + 1);
        expect(env.bg.calls.length).toBe(0);
        env.app.emit('replay:consent', { result: hit });
        await flush();
        expect(env.inner.calls.length).toBe(calls + 1);
      });

    it('on a worker page starts by itself once the background client is confirmed to be a worker, and ' +
      'ignores a press',
      async function () {
        const env = makeEnv();
        spyUnavailable(env);
        const hit = await served(env, 64);
        env.app.display(hit);
        env.app.emit('replay:consent', { result: hit });
        await flush();
        expect(env.bg.calls.length).toBe(1);
        expect(env.controller.state().job).toBe('trace');
        env.app.emit('replay:consent', { result: hit });
        await flush();
        expect(env.bg.calls.length).toBe(1);
        env.bg.complete();
        await flush();
        expect(env.app.attached.length).toBe(1);
        expect(env.unavailable).toBe(0);
      });

    it('on a worker page whose background client runs on the main thread, or cannot tell, marks the record ' +
      'unavailable and starts nothing',
      async function () {
        const main = makeEnv({ bgMode: 'main' });
        spyUnavailable(main);
        main.app.display(await served(main, 65));
        await flush();
        expect(main.bg.calls.length).toBe(0);
        expect(main.unavailable).toBe(1);
        expect(main.controller.state().job).toBeNull();
        expect(main.note.log).not.toContain('show:cache.preparing');
        const broken = makeEnv();
        spyUnavailable(broken);
        broken.bg.ready = function () { return Promise.reject(new Error('no worker')); };
        broken.app.display(await served(broken, 66));
        await flush();
        expect(broken.bg.calls.length).toBe(0);
        expect(broken.unavailable).toBe(1);
        const none = makeEnv();
        spyUnavailable(none);
        none.bg.ready = function () { throw new Error('boom'); };
        none.app.display(await served(none, 67));
        await flush();
        expect(none.unavailable).toBe(1);
        expect(none.bg.calls.length).toBe(0);
      });

    it('marks the record unavailable when the regeneration fails or the app refuses its trace', async function () {
      const failing = makeEnv();
      spyUnavailable(failing);
      failing.app.display(await served(failing, 68));
      await flush();
      failing.bg.fail(new Error('worker died'));
      await flush();
      expect(failing.unavailable).toBe(1);
      expect(failing.note.log[failing.note.log.length - 1]).toBe('show:cache.failed');
      const refusing = makeEnv();
      spyUnavailable(refusing);
      refusing.app.attachTrace = function () { return false; };
      refusing.app.display(await served(refusing, 69));
      await flush();
      refusing.bg.complete();
      await flush();
      expect(refusing.unavailable).toBe(1);
      expect(refusing.note.log[refusing.note.log.length - 1]).toBe('show:cache.failed');
      const plain = makeEnv();
      plain.app.display(await served(plain, 70));
      await flush();
      plain.bg.fail(new Error('worker died'));
      await flush();
      expect(plain.note.log[plain.note.log.length - 1]).toBe('show:cache.failed');
    });

    it('a page whose worker turned out to be the main thread waits for the press instead of using the ' +
      'background client',
      async function () {
        const env = makeEnv();
        spyUnavailable(env);
        const hit = await served(env, 71);
        const calls = env.inner.calls.length;
        env.bg.ready = function () {
          env.inner.mode = 'main';
          return Promise.resolve('worker');
        };
        env.app.display(hit);
        await flush();
        expect(env.bg.calls.length).toBe(0);
        expect(env.inner.calls.length).toBe(calls);
        expect(env.unavailable).toBe(0);
        env.app.emit('replay:consent', { result: hit });
        await flush();
        expect(env.bg.calls.length).toBe(0);
        expect(env.inner.calls.length).toBe(calls + 1);
        expect(env.app.attached.length).toBe(1);
      });

    it('forgets a gate that something else replaced: a late answer or press starts nothing', async function () {
      const env = makeEnv({ mode: 'main' });
      const hit = await served(env, 72);
      const calls = env.inner.calls.length;
      env.app.display(hit);
      env.app.shown = { result: P.run(seeded(73), null), trace: [], imported: true };
      env.app.emit('result', env.app.shown);
      env.app.emit('replay:consent', { result: hit });
      await flush();
      expect(env.inner.calls.length).toBe(calls);
      expect(env.controller.state().job).toBeNull();
    });

    it('makes its default background client worker-only, so an automatic trace never runs on the page',
      async function () {
        const create = SG.workerClient.create;
        const options = [];
        const bg = fakeBackground('worker');
        SG.workerClient.create = function (opts) {
          options.push(opts);
          return bg;
        };
        try {
          const env = makeEnv({ controller: { createClient: undefined } });
          const hit = await served(env, 74);
          env.app.display(hit);
          await flush();
          expect(options).toEqual([{ forceMode: 'worker' }]);
          expect(bg.calls.length).toBe(1);
        } finally {
          SG.workerClient.create = create;
        }
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
      await flush();
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
      await flush();
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

  // A cached puzzle whose regenerated record differs is generated again through `app.generate(overrides)`, i.e.
  // through the store as a replay: with the number of attempts it recorded, which is not a new choice of the user
  // (MS05r5p, CV6-03 (c2)). The controller's `app.generate` is the real one: a private copy of js/ui/app.js on a
  // minimal fake document, with the real store, stand-ins for the views and a scripted client that records the
  // configurations it is asked for.
  describe('cache: a stale entry is generated again with the attempts it recorded (MS05r5p)', function () {
    const pages = [];

    beforeEach(ready);

    afterEach(function () {
      pages.splice(0).forEach(function (page) { page.destroy(); });
      SG.i18n.setLocale('en');
    });

    function shown(store) {
      const s = store.get();
      return [s.variantId, s.maxAttempts, s.attemptsExplicit];
    }

    /** `{ app, store, configs, destroy }`: the started private app, destroyed after the test. */
    function startApp() {
      const node = SG.test.node;
      if (!node) SG.test.skip('needs the file system (Node only)');
      const noop = function () {};
      function element() {
        return {
          nodeType: 1, hidden: false, disabled: false, textContent: '', className: '',
          style: { setProperty: noop },
          classList: { toggle: noop, contains: function () { return false; }, add: noop, remove: noop },
          setAttribute: noop, getAttribute: function () { return null; }, removeAttribute: noop,
          addEventListener: noop, removeEventListener: noop, appendChild: function (c) { return c; },
          removeChild: noop, contains: function () { return false; }, querySelector: function () { return null; },
          focus: noop
        };
      }
      const byId = {};
      ['board-svg', 'board-root', 'controls-root', 'controls-form', 'btn-generate', 'btn-regenerate',
        'btn-cancel', 'btn-export', 'btn-drawer', 'steps-root', 'player-root', 'result-root', 'main']
        .forEach(function (id) { byId[id] = element(); });
      const doc = {
        readyState: 'loading', title: '', body: element(), documentElement: element(), activeElement: null,
        getElementById: function (id) { return byId[id] || null; },
        querySelector: function () { return null; }, querySelectorAll: function () { return []; },
        createElement: element, createElementNS: element, addEventListener: noop, removeEventListener: noop
      };
      const sg = Object.assign({}, SG);
      // Its own fragment list: app.js registers its strings in it, and the host's list (read by the i18n suite,
      // which allows no key defined twice) stays as it was.
      sg.localeFragments = [];
      const hostFragments = (SG.localeFragments || []).slice();
      ['app', 'exportUi', 'a11y', 'theme', 'help', 'cache', 'history'].forEach(function (name) { delete sg[name]; });
      const store = SG.store.create({ storage: null, location: null, history: null, navigator: { languages: [] } });
      sg.store = Object.assign({}, SG.store, { instance: function () { return store; } });
      sg.boardView = { create: function () { return new Proxy({}, { get: function () { return noop; } }); } };
      sg.stepView = {
        create: function () { return { clear: noop, setSteps: noop, setPosition: noop, destroy: noop }; }
      };
      sg.resultView = { create: function () { return { clear: noop, show: noop, refresh: noop, destroy: noop }; } };
      sg.controls = { mount: function () { return { destroy: noop }; } };
      sg.player = {
        LAYER_NAMES: [],
        create: function () {
          return { reset: noop, load: noop, bindControls: noop, setPreparation: noop, setAnalysis: noop,
            destroy: noop, state: function () { return { finished: false, loaded: false, position: 0, length: 0 }; } };
        },
        createPreparation: function () { return { start: noop, cancel: noop, press: noop }; }
      };
      const source = node.fs.readFileSync(node.path.join(node.root, 'js/ui/app.js'), 'utf8');
      new Function('self', 'document', source)({ SG: sg, setTimeout: setTimeout, clearTimeout: clearTimeout }, doc);
      // The private app registered its strings in its own list, and the host's list is untouched.
      expect(sg.localeFragments.length).toBe(1);
      const host = SG.localeFragments || [];
      expect(host.length).toBe(hostFragments.length);
      expect(host.every(function (f, i) { return f === hostFragments[i]; })).toBe(true);
      const configs = [];
      expect(sg.app.start()).toBe(true);
      sg.app.setClient({
        mode: 'main', cancel: noop, cancelReplay: noop,
        generate: function (config) { configs.push(config); return new Promise(noop); }
      });
      const page = { app: sg.app, store: store, configs: configs, destroy: function () { sg.app.destroy(); } };
      pages.push(page);
      return page;
    }

    /** A served puzzle whose regeneration differs, so the controller rebuilds it through the real app. */
    async function staleRound(recorded, setup) {
      const page = startApp();
      if (setup) setup(page.store);
      const env = makeEnv();
      env.app.generate = function (overrides, options) {
        env.app.generated.push(overrides);
        return page.app.generate(overrides, options);
      };
      const hit = await env.client.generate(seeded(41, recorded), null).then(function () {
        env.clock.advance(0);
        return env.client.generate(seeded(41, recorded), null);
      });
      expect(hit.fromCache).toBe(true);
      env.app.display(hit);
      await flush();
      env.bg.complete(P.run(seeded(42), null));
      await flush();
      expect(env.app.toasts).toEqual(['warning:cache.stale']);
      expect(env.app.generated.length).toBe(1);
      expect(page.configs.length).toBe(1);
      return { store: page.store, config: page.configs[0], overrides: env.app.generated[0] };
    }

    it('MS05r5p-T04: a recorded number equal to the default of its board replays as recorded and keeps the ' +
      'mode', async function () {
      const round = await staleRound({ maxAttempts: 8 });
      expect(round.overrides.maxAttempts).toBe(8);
      expect(round.config.maxAttempts).toBe(8);
      expect(shown(round.store)).toEqual(['classic9', 8, false]);
      round.store.set({ variantId: 'mega16' }, { source: 'controls' });
      expect(shown(round.store)).toEqual(['mega16', 2, false]);
      expect(SG.store.toConfig(round.store.get()).maxAttempts).toBe(2);
    });

    it('MS05r5p-T04: a recorded number that is not the default replays as recorded and becomes a chosen one',
      async function () {
        const round = await staleRound({ maxAttempts: 3 });
        expect(round.overrides.maxAttempts).toBe(3);
        expect(round.config.maxAttempts).toBe(3);
        expect(shown(round.store)).toEqual(['classic9', 3, true]);
        round.store.set({ variantId: 'mega16' }, { source: 'controls' });
        expect(shown(round.store)).toEqual(['mega16', 3, true]);
      });

    it('MS05r5p-T04: a chosen number stays chosen when the rebuilt entry records the default of its board',
      async function () {
        const round = await staleRound({ maxAttempts: 8 }, function (store) {
          store.set({ maxAttempts: 5 }, { source: 'controls' });
        });
        expect(round.config.maxAttempts).toBe(8);
        expect(shown(round.store)).toEqual(['classic9', 8, true]);
        round.store.set({ variantId: 'mega16' }, { source: 'controls' });
        expect(shown(round.store)).toEqual(['mega16', 8, true]);
      });

    it('MS05r5p-T04: nothing but the recipe crosses to the app, and no marker crosses to the pipeline',
      async function () {
        const round = await staleRound({ maxAttempts: 3 });
        expect(Object.keys(round.overrides).sort()).toEqual(['difficulty', 'digOrder', 'maxAttempts', 'seed',
          'symbolMode', 'symmetry', 'variantId', 'variantOptions']);
        expect(Object.keys(round.config).sort()).toEqual(['difficulty', 'digOrder', 'maxAttempts', 'seed',
          'symbolMode', 'symmetry', 'variantId', 'variantOptions']);
        expect(JSON.stringify(round.config)).not.toContain('attemptsExplicit');
      });
  });
})();
