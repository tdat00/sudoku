// Foundation primitives: namespace (ns.js), errors.js, bits.js and budget.js.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;

  /**
   * Evaluates a source file again in the current realm, like a second <script> / importScripts call.
   * Returns a promise because browsers load scripts asynchronously.
   */
  function reloadScript(relPath) {
    var env = SG.test.node;
    if (env) {
      var abs = env.path.join(env.root, relPath);
      env.vm.runInThisContext(env.fs.readFileSync(abs, 'utf8'), { filename: abs });
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = relPath + '?reload=' + Date.now();
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('could not reload ' + relPath)); };
      document.head.appendChild(script);
    });
  }

  function fakeClock(start) {
    var time = start === undefined ? 1000 : start;
    var reads = 0;
    return {
      now: function () { reads++; return time; },
      advance: function (ms) { time += ms; },
      get reads() { return reads; }
    };
  }

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
    return thrown;
  }

  // -------------------------------------------------------------------------------------------
  describe('SG namespace (ns.js)', function () {
    var savedDebug;

    beforeEach(function () { savedDebug = SG.DEBUG; });
    afterEach(function () {
      SG.setDebug(savedDebug);
      delete SG.nsTestMarker;
    });

    it('defines VERSION, MAX_DIGITS, DEBUG and setDebug', function () {
      expect(typeof SG.VERSION).toBe('string');
      expect(SG.MAX_DIGITS).toBe(16);
      expect(SG.DEBUG).toBe(false);
      expect(typeof SG.setDebug).toBe('function');
    });

    it('setDebug switches SG.DEBUG and coerces to a boolean', function () {
      expect(SG.setDebug(1)).toBe(true);
      expect(SG.DEBUG).toBe(true);
      expect(SG.setDebug('')).toBe(false);
      expect(SG.DEBUG).toBe(false);
    });

    it('loading ns.js again does not wipe or replace existing SG data', function () {
      var marker = { value: 1 };
      var before = {
        version: SG.VERSION, setDebug: SG.setDebug, errors: SG.errors, rng: SG.rng, bits: SG.bits,
        budget: SG.budget, test: SG.test, results: SG.testResults
      };
      SG.nsTestMarker = marker;
      SG.setDebug(true);
      return reloadScript('../core/js/engine/ns.js').then(function () {
        expect(SG.nsTestMarker).toBe(marker);
        expect(SG.DEBUG).toBe(true);
        expect(SG.VERSION).toBe(before.version);
        expect(SG.setDebug).toBe(before.setDebug);
        expect(SG.errors).toBe(before.errors);
        expect(SG.rng).toBe(before.rng);
        expect(SG.bits).toBe(before.bits);
        expect(SG.budget).toBe(before.budget);
        expect(SG.test).toBe(before.test);
        expect(SG.testResults).toBe(before.results);
        expect(root.SG).toBe(SG);
      });
    });

    it('loading errors.js again keeps the original GenerationError class', function () {
      var Original = SG.errors.GenerationError;
      var earlier = new Original('x.y');
      return reloadScript('../core/js/engine/errors.js').then(function () {
        expect(SG.errors.GenerationError).toBe(Original);
        expect(earlier instanceof SG.errors.GenerationError).toBe(true);
      });
    });
  });

  describe('core files in a bare environment (Node only)', function () {
    var FILES = ['../core/js/engine/ns.js', '../core/js/engine/errors.js', '../core/js/engine/bits.js', '../core/js/engine/budget.js', 'js/engine/rng.js'];

    function loadInto(context) {
      var env = SG.test.node;
      FILES.forEach(function (rel) {
        var abs = env.path.join(env.root, rel);
        env.vm.runInContext(env.fs.readFileSync(abs, 'utf8'), context, { filename: abs });
      });
    }

    function evaluate(context, code) {
      return SG.test.node.vm.runInContext(code, context);
    }

    var CHECKS = [
      'SG.bits.popcount(255)',
      'new SG.errors.GenerationError("a.b", { n: 1 }) instanceof Error',
      'SG.budget.create({ nodes: 1 }).check() === undefined',
      'SG.rng.create(42).int(1000) >= 0'
    ];

    it('loads without self, window or document (plain Node global)', function () {
      if (!SG.test.node) SG.test.skip('needs Node vm; skipped in the browser');
      var context = SG.test.node.vm.createContext({});
      loadInto(context);
      expect(evaluate(context, 'typeof self + typeof window + typeof document'))
        .toBe('undefinedundefinedundefined');
      expect(CHECKS.map(function (code) { return evaluate(context, code); }))
        .toEqual([8, true, true, true]);
    });

    it('loads when only `self` exists (Web Worker style global)', function () {
      if (!SG.test.node) SG.test.skip('needs Node vm; skipped in the browser');
      var context = SG.test.node.vm.createContext({});
      evaluate(context, 'var self = globalThis;');
      loadInto(context);
      expect(evaluate(context, 'self.SG === SG && typeof window + typeof document'))
        .toBe('undefinedundefined');
      expect(CHECKS.map(function (code) { return evaluate(context, code); }))
        .toEqual([8, true, true, true]);
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('SG.errors.GenerationError', function () {
    it('is an Error carrying code and i18nArgs', function () {
      var err = new SG.errors.GenerationError('x.y', { a: 1 });
      expect(err instanceof Error).toBe(true);
      expect(err instanceof SG.errors.GenerationError).toBe(true);
      expect(err.code).toBe('x.y');
      expect(err.i18nArgs).toEqual({ a: 1 });
      expect(err.name).toBe('GenerationError');
    });

    it('defaults i18nArgs to an empty object and has a message and a stack', function () {
      var err = new SG.errors.GenerationError('only.code');
      expect(err.i18nArgs).toEqual({});
      expect(err.message).toBe('only.code');
      expect(typeof err.stack).toBe('string');
    });

    it('can be thrown and told apart by code', function () {
      var caught = null;
      try {
        throw new SG.errors.GenerationError('some.code', { k: 'v' });
      } catch (e) {
        caught = e;
      }
      expect(caught.code).toBe('some.code');
      expect(function () { throw new SG.errors.GenerationError('some.code'); }).toThrow({ code: 'some.code' });
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('SG.bits', function () {
    var bits = SG.bits;

    function naivePopcount(mask) {
      var count = 0;
      for (var i = 0; i < 32; i++) if ((mask >>> i) & 1) count++;
      return count;
    }

    function naiveLowest(mask) {
      for (var i = 0; i < 32; i++) if ((mask >>> i) & 1) return i;
      return -1;
    }

    function naiveValues(mask) {
      var out = [];
      for (var i = 0; i < 32; i++) if ((mask >>> i) & 1) out.push(i + 1);
      return out;
    }

    it('popcount is correct for every mask in [0, 65536)', function () {
      var wrong = [];
      for (var mask = 0; mask < 65536; mask++) {
        if (bits.popcount(mask) !== naivePopcount(mask)) wrong.push(mask);
      }
      expect(wrong).toEqual([]);
    });

    it('popcount is correct for the full 32-bit range', function () {
      var cases = [0, 1, -1, 0x7fffffff, 0x80000000, 0xffffffff, 0xaaaaaaaa, 0x55555555, -2147483648];
      for (var i = 0; i < 31; i++) cases.push(1 << i);
      var seed = 123456789;
      for (var n = 0; n < 2000; n++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        cases.push(seed);
      }
      var wrong = cases.filter(function (mask) { return bits.popcount(mask) !== naivePopcount(mask); });
      expect(wrong).toEqual([]);
    });

    it('popcount is branch free (no loops, conditionals or string conversion)', function () {
      var source = bits.popcount.toString();
      expect(/\b(if|for|while|switch)\b|\?|toString|split/.test(source)).toBe(false);
    });

    it('lowestBitIndex matches a naive scan for every mask in [0, 65536)', function () {
      var wrong = [];
      for (var mask = 0; mask < 65536; mask++) {
        if (bits.lowestBitIndex(mask) !== naiveLowest(mask)) wrong.push(mask);
      }
      expect(wrong).toEqual([]);
    });

    it('lowestBitIndex returns -1 for 0 and handles bit 31', function () {
      expect(bits.lowestBitIndex(0)).toBe(-1);
      expect(bits.lowestBitIndex(1)).toBe(0);
      expect(bits.lowestBitIndex(0b101000)).toBe(3);
      expect(bits.lowestBitIndex(0x80000000)).toBe(31);
      expect(bits.lowestBitIndex(-1)).toBe(0);
    });

    it('lowestBitIndex is built on Math.clz32', function () {
      expect(bits.lowestBitIndex.toString()).toContain('Math.clz32');
    });

    it('forEach yields 1-based values in ascending order for every mask in [0, 65536)', function () {
      var wrong = [];
      for (var mask = 0; mask < 65536; mask++) {
        var seen = [];
        bits.forEach(mask, function (v) { seen.push(v); });
        var expected = naiveValues(mask);
        if (seen.length !== expected.length || seen.some(function (v, i) { return v !== expected[i]; })) {
          wrong.push(mask);
        }
      }
      expect(wrong).toEqual([]);
    });

    it('forEach examples: empty mask, digit 1, digit 16', function () {
      var seen = [];
      bits.forEach(0, function (v) { seen.push(v); });
      expect(seen).toEqual([]);
      bits.forEach(0b1, function (v) { seen.push(v); });
      expect(seen).toEqual([1]);
      seen = [];
      bits.forEach(0x8001, function (v) { seen.push(v); });
      expect(seen).toEqual([1, 16]);
    });

    it('toArray returns the same 1-based ascending values', function () {
      expect(bits.toArray(0)).toEqual([]);
      expect(bits.toArray(0b100110)).toEqual([2, 3, 6]);
      expect(bits.toArray(0x1ff)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      var wrong = [];
      for (var mask = 0; mask < 65536; mask += 7) {
        if (!SG.test.deepEqual(bits.toArray(mask), naiveValues(mask))) wrong.push(mask);
      }
      expect(wrong).toEqual([]);
    });

    it('full(digits) sets exactly the digits 1..digits for 0..16', function () {
      for (var d = 0; d <= 16; d++) {
        var mask = bits.full(d);
        expect(mask).toBe(Math.pow(2, d) - 1);
        expect(bits.popcount(mask)).toBe(d);
      }
      expect(bits.full(9)).toBe(0x1ff);
    });

    it('maskOf(value) is the single bit of a 1-based value', function () {
      for (var v = 1; v <= 16; v++) {
        expect(bits.popcount(bits.maskOf(v))).toBe(1);
        expect(bits.lowestBitIndex(bits.maskOf(v))).toBe(v - 1);
      }
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('SG.budget', function () {
    var budget = SG.budget;

    it('without limits it never throws', function () {
      var b = budget.create();
      for (var i = 0; i < 5000; i++) b.check();
      expect(b.nodes).toBe(5000);
      expect(b.isCancelled).toBe(false);
    });

    it('does not look at the clock before 1024 ticks, then throws budget.exceeded on timeout', function () {
      var clock = fakeClock();
      var b = budget.create({ ms: 100, now: clock.now });
      clock.advance(1000);
      for (var i = 0; i < 1023; i++) b.check();
      var err = expectCode(function () { b.check(); }, 'budget.exceeded');
      expect(err.i18nArgs.reason).toBe('time');
    });

    it('reads the clock only once per 1024 ticks', function () {
      var clock = fakeClock();
      var b = budget.create({ ms: 1e9, now: clock.now });
      expect(clock.reads).toBe(1);
      for (var i = 0; i < 10240; i++) b.check();
      expect(clock.reads).toBe(1 + 10);
    });

    it('tick() counts toward the clock interval and never throws or reads the clock itself', function () {
      var clock = fakeClock();
      var b = budget.create({ ms: 100, now: clock.now });
      clock.advance(1000);
      for (var i = 0; i < 5000; i++) b.tick();
      expect(clock.reads).toBe(1);
      expect(b.nodes).toBe(5000);
      expectCode(function () { b.check(); }, 'budget.exceeded');
      b.tick(10);
      expect(b.nodes).toBe(5011);
    });

    it('expires on the real clock as well', function () {
      var b = budget.create({ ms: 5 });
      var start = Date.now();
      while (Date.now() - start < 25) { /* busy wait */ }
      var thrown = null;
      try {
        for (var i = 0; i < 2048 && thrown === null; i++) b.check();
      } catch (e) {
        thrown = e;
      }
      expect(thrown instanceof SG.errors.GenerationError).toBe(true);
      expect(thrown.code).toBe('budget.exceeded');
    });

    it('stays exceeded: every later check() throws at once', function () {
      var clock = fakeClock();
      var b = budget.create({ ms: 10, now: clock.now });
      clock.advance(50);
      for (var i = 0; i < 1023; i++) b.check();
      expectCode(function () { b.check(); }, 'budget.exceeded');
      clock.advance(-50);
      expectCode(function () { b.check(); }, 'budget.exceeded');
    });

    it('enforces the node limit exactly and reports the reason', function () {
      var b = budget.create({ nodes: 50 });
      for (var i = 0; i < 50; i++) b.check();
      var err = expectCode(function () { b.check(); }, 'budget.exceeded');
      expect(err.i18nArgs.reason).toBe('nodes');
      expect(err.i18nArgs.limitNodes).toBe(50);
    });

    it('cancel() makes check() throw immediately, before any tick', function () {
      var b = budget.create({ ms: 1e9, nodes: 1e9 });
      expect(b.isCancelled).toBe(false);
      b.check();
      b.cancel();
      expect(b.isCancelled).toBe(true);
      expectCode(function () { b.check(); }, 'budget.cancelled');
      expectCode(function () { b.check(); }, 'budget.cancelled');
    });

    it('cancel() works on a budget without limits and on a brand new one', function () {
      var b = budget.create();
      b.cancel();
      expectCode(function () { b.check(); }, 'budget.cancelled');
    });

    it('calls onCancel exactly once, however often cancel() is called', function () {
      var calls = 0;
      var b = budget.create({ onCancel: function () { calls++; } });
      b.cancel();
      b.cancel();
      expect(calls).toBe(1);
    });

    it('polls shouldCancel together with the clock sample', function () {
      var cancelRequested = false;
      var calls = 0;
      var b = budget.create({ shouldCancel: function () { return cancelRequested; }, onCancel: function () { calls++; } });
      for (var i = 0; i < 1023; i++) b.check();
      cancelRequested = true;
      expectCode(function () { b.check(); }, 'budget.cancelled');
      expect(b.isCancelled).toBe(true);
      expect(calls).toBe(1);
      expectCode(function () { b.check(); }, 'budget.cancelled');
    });

    it('reports elapsedMs and nodes, which are read only', function () {
      var clock = fakeClock();
      var b = budget.create({ now: clock.now });
      clock.advance(250);
      b.check();
      b.check();
      b.tick(8);
      expect(b.elapsedMs()).toBe(250);
      expect(b.nodes).toBe(10);
      expect(function () { b.nodes = 0; }).toThrow();
      expect(function () { b.isCancelled = true; }).toThrow();
    });
  });
})();
