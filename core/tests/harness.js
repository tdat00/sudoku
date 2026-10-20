/**
 * Minimal dependency-free test harness shared by tests.html (browser) and tests/node-runner.js (Node).
 *
 * Globals: describe, it, expect, beforeEach, afterEach, bench. Everything is also on `SG.test`.
 *   describe(name, fn) / describe.skip       it(name, fn[, timeoutMs]) / it.skip
 *   beforeEach(fn) / afterEach(fn)           bench(name, fn[, iterations])
 *   SG.test.skip(reason)   marks the running test as skipped (use for environment limits)
 *   SG.test.node           { fs, path, vm, root } provided by the Node runner, undefined in a browser
 *   SG.test.run(options)   runs everything registered so far, resolves with SG.testResults
 *   SG.test.timeLimit(ms)  the limit a time assertion of a unit suite uses for a budget of design.md 9.1:
 *                          `ms * SG.test.TIME_FACTOR` (see TIME_FACTOR below)
 *
 * Tests may be async (return a promise). Results are collected into `SG.testResults`.
 */
(function (root) {
  'use strict';

  var SG = root.SG = root.SG || {};
  if (SG.test) return;

  var DEFAULT_TIMEOUT_MS = 5000;
  var DEFAULT_BENCH_ITERATIONS = 1000;

  /**
   * Tolerance of the time assertions of the unit suites (the CV6 checks of the generation time against the
   * budgets of design.md 9.1). They run 4 to 20 puzzles on whatever machine runs the suites, often while it
   * does other work, so they guard against a gross slowdown only: 2x the budget by default, 3x when the
   * environment variable CI is set (shared, slower CI runners), or the value of SG_TIME_FACTOR (1: the
   * budgets themselves). The budgets as such are enforced by `node tests/qualify.js` (the 95th percentile of
   * 40 requests per level on the reference machine decides which levels a variant offers) and measured by
   * `node tests/perf.js`.
   */
  var TIME_FACTOR = (function () {
    var env = typeof process !== 'undefined' && process && process.env ? process.env : {};
    var forced = parseFloat(env.SG_TIME_FACTOR);
    if (isFinite(forced) && forced > 0) return forced;
    return env.CI ? 3 : 2;
  })();

  // ---------------------------------------------------------------------------------------------
  // Errors and formatting
  // ---------------------------------------------------------------------------------------------

  class AssertionError extends Error {
    constructor(message, actual, expected) {
      super(message);
      this.name = 'AssertionError';
      this.actual = actual;
      this.expected = expected;
    }
  }

  /** Thrown by SG.test.skip() to end a test early as "skipped". */
  class SkipSignal extends Error {
    constructor(reason) {
      super(reason || 'skipped');
      this.name = 'SkipSignal';
      this.reason = reason || '';
    }
  }

  function isTypedArray(v) {
    return ArrayBuffer.isView(v) && !(v instanceof DataView);
  }

  /** Short, single-line description of any value for failure messages. */
  function fmt(value, depth) {
    depth = depth || 0;
    var type = typeof value;
    if (value === null) return 'null';
    if (type === 'string') return JSON.stringify(value.length > 120 ? value.slice(0, 117) + '...' : value);
    if (type === 'number') return Object.is(value, -0) ? '-0' : String(value);
    if (type === 'bigint') return String(value) + 'n';
    if (type === 'function') return '[Function ' + (value.name || 'anonymous') + ']';
    if (type !== 'object') return String(value);
    if (value instanceof Error) return value.name + '(' + JSON.stringify(value.message) + ')';
    if (value instanceof RegExp || value instanceof Date) return String(value);
    if (isTypedArray(value) || Array.isArray(value)) {
      var name = isTypedArray(value) ? value.constructor.name : 'Array';
      if (depth > 2) return name + '(' + value.length + ')';
      var shown = [];
      for (var i = 0; i < value.length && i < 12; i++) shown.push(fmt(value[i], depth + 1));
      return name + '(' + value.length + ')[' + shown.join(', ') + (value.length > 12 ? ', ...' : '') + ']';
    }
    if (value instanceof Map || value instanceof Set) {
      return value.constructor.name + '(' + value.size + ')';
    }
    if (depth > 2) return '{...}';
    var keys = Object.keys(value);
    var parts = [];
    for (var k = 0; k < keys.length && k < 8; k++) {
      parts.push(keys[k] + ': ' + fmt(value[keys[k]], depth + 1));
    }
    return '{' + parts.join(', ') + (keys.length > 8 ? ', ...' : '') + '}';
  }

  // ---------------------------------------------------------------------------------------------
  // Deep equality (arrays, typed arrays, Map, Set, Date, RegExp, Error, plain objects, NaN)
  // ---------------------------------------------------------------------------------------------

  function deepEqual(a, b, seen) {
    if (a === b) return true;
    if (typeof a === 'number' && typeof b === 'number') return a !== a && b !== b;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

    seen = seen || [];
    for (var s = 0; s < seen.length; s++) {
      if (seen[s][0] === a && seen[s][1] === b) return true;
    }
    seen.push([a, b]);

    var i;
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      for (i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i], seen)) return false;
      return true;
    }
    if (isTypedArray(a) || isTypedArray(b)) {
      if (!isTypedArray(a) || !isTypedArray(b)) return false;
      if (a.constructor !== b.constructor || a.length !== b.length) return false;
      for (i = 0; i < a.length; i++) {
        if (a[i] !== b[i] && !(a[i] !== a[i] && b[i] !== b[i])) return false;
      }
      return true;
    }
    if (a instanceof Date || b instanceof Date) {
      return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
    }
    if (a instanceof RegExp || b instanceof RegExp) {
      return a instanceof RegExp && b instanceof RegExp && String(a) === String(b);
    }
    if (a instanceof Map || b instanceof Map) {
      if (!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size) return false;
      var mapOk = true;
      a.forEach(function (v, key) {
        if (!b.has(key) || !deepEqual(v, b.get(key), seen)) mapOk = false;
      });
      return mapOk;
    }
    if (a instanceof Set || b instanceof Set) {
      if (!(a instanceof Set) || !(b instanceof Set) || a.size !== b.size) return false;
      var setOk = true;
      a.forEach(function (v) { if (!b.has(v)) setOk = false; });
      return setOk;
    }
    if (a instanceof Error || b instanceof Error) {
      if (!(a instanceof Error) || !(b instanceof Error)) return false;
      if (a.name !== b.name || a.message !== b.message) return false;
    }
    var keysA = Object.keys(a);
    var keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (i = 0; i < keysA.length; i++) {
      var key = keysA[i];
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key], seen)) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------------------------
  // expect(...)
  // ---------------------------------------------------------------------------------------------

  function result(pass, message, notMessage) {
    return { pass: pass, message: message, notMessage: notMessage };
  }

  function lengthOf(v) {
    return v !== null && v !== undefined && typeof v.length === 'number' ? v.length : undefined;
  }

  function describeThrown(thrown) {
    return thrown instanceof Error ? thrown.name + ': ' + thrown.message : fmt(thrown);
  }

  /** Does the thrown value satisfy the `expected` argument of toThrow? */
  function thrownMatches(thrown, expected) {
    var message = thrown instanceof Error ? thrown.message : String(thrown);
    if (expected === undefined) return true;
    if (typeof expected === 'string') return message.indexOf(expected) !== -1;
    if (expected instanceof RegExp) return expected.test(message);
    if (typeof expected === 'function') return thrown instanceof expected;
    if (expected !== null && typeof expected === 'object') {
      if (thrown === null || typeof thrown !== 'object') return false;
      return Object.keys(expected).every(function (key) { return deepEqual(thrown[key], expected[key]); });
    }
    return false;
  }

  var matchers = {
    toBe: function (actual, expected) {
      return result(Object.is(actual, expected),
        'expected ' + fmt(actual) + ' to be ' + fmt(expected),
        'expected value not to be ' + fmt(expected));
    },
    toEqual: function (actual, expected) {
      return result(deepEqual(actual, expected),
        'expected ' + fmt(actual) + ' to equal ' + fmt(expected),
        'expected ' + fmt(actual) + ' not to equal ' + fmt(expected));
    },
    toBeTruthy: function (actual) {
      return result(!!actual, 'expected ' + fmt(actual) + ' to be truthy',
        'expected ' + fmt(actual) + ' not to be truthy');
    },
    toBeFalsy: function (actual) {
      return result(!actual, 'expected ' + fmt(actual) + ' to be falsy',
        'expected ' + fmt(actual) + ' not to be falsy');
    },
    toBeNull: function (actual) {
      return result(actual === null, 'expected ' + fmt(actual) + ' to be null', 'expected value not to be null');
    },
    toBeUndefined: function (actual) {
      return result(actual === undefined, 'expected ' + fmt(actual) + ' to be undefined',
        'expected value not to be undefined');
    },
    toBeDefined: function (actual) {
      return result(actual !== undefined, 'expected value to be defined', 'expected value to be undefined');
    },
    toBeGreaterThan: function (actual, limit) {
      return result(actual > limit, 'expected ' + fmt(actual) + ' to be > ' + fmt(limit),
        'expected ' + fmt(actual) + ' not to be > ' + fmt(limit));
    },
    toBeGreaterThanOrEqual: function (actual, limit) {
      return result(actual >= limit, 'expected ' + fmt(actual) + ' to be >= ' + fmt(limit),
        'expected ' + fmt(actual) + ' not to be >= ' + fmt(limit));
    },
    toBeLessThan: function (actual, limit) {
      return result(actual < limit, 'expected ' + fmt(actual) + ' to be < ' + fmt(limit),
        'expected ' + fmt(actual) + ' not to be < ' + fmt(limit));
    },
    toBeLessThanOrEqual: function (actual, limit) {
      return result(actual <= limit, 'expected ' + fmt(actual) + ' to be <= ' + fmt(limit),
        'expected ' + fmt(actual) + ' not to be <= ' + fmt(limit));
    },
    toBeCloseTo: function (actual, expected, digits) {
      var places = digits === undefined ? 2 : digits;
      var diff = Math.abs(actual - expected);
      return result(diff < Math.pow(10, -places) / 2,
        'expected ' + fmt(actual) + ' to be close to ' + fmt(expected) + ' (' + places + ' digits, diff ' + diff + ')',
        'expected ' + fmt(actual) + ' not to be close to ' + fmt(expected));
    },
    toBeInstanceOf: function (actual, ctor) {
      return result(actual instanceof ctor,
        'expected ' + fmt(actual) + ' to be an instance of ' + (ctor && ctor.name),
        'expected value not to be an instance of ' + (ctor && ctor.name));
    },
    toMatch: function (actual, pattern) {
      var ok = typeof actual === 'string' &&
        (pattern instanceof RegExp ? pattern.test(actual) : actual.indexOf(pattern) !== -1);
      return result(ok, 'expected ' + fmt(actual) + ' to match ' + fmt(pattern),
        'expected ' + fmt(actual) + ' not to match ' + fmt(pattern));
    },
    toContain: function (actual, item) {
      var ok = false;
      if (typeof actual === 'string') ok = actual.indexOf(item) !== -1;
      else if (actual instanceof Set) ok = actual.has(item);
      else if (Array.isArray(actual) || isTypedArray(actual)) ok = Array.prototype.indexOf.call(actual, item) !== -1;
      return result(ok, 'expected ' + fmt(actual) + ' to contain ' + fmt(item),
        'expected ' + fmt(actual) + ' not to contain ' + fmt(item));
    },
    toHaveLength: function (actual, expected) {
      var len = lengthOf(actual);
      return result(len === expected, 'expected length ' + fmt(len) + ' of ' + fmt(actual) + ' to be ' + expected,
        'expected ' + fmt(actual) + ' not to have length ' + expected);
    },
    toThrow: function (actual, expected) {
      if (typeof actual !== 'function') {
        return result(false, 'toThrow expects a function, got ' + fmt(actual), 'toThrow expects a function');
      }
      var threw = false;
      var thrown;
      try { actual(); } catch (e) { threw = true; thrown = e; }
      if (!threw) {
        return result(false, 'expected function to throw' + (expected === undefined ? '' : ' ' + fmt(expected)) +
          ', but it did not', 'expected function not to throw');
      }
      return result(thrownMatches(thrown, expected),
        'expected thrown ' + describeThrown(thrown) + ' to match ' + fmt(expected),
        'expected function not to throw' + (expected === undefined ? '' : ' ' + fmt(expected)) +
          ', but it threw ' + describeThrown(thrown));
    }
  };

  function makeExpectation(actual, negate) {
    var api = {};
    Object.keys(matchers).forEach(function (name) {
      api[name] = function () {
        var args = [actual].concat(Array.prototype.slice.call(arguments));
        var res = matchers[name].apply(null, args);
        if (res.pass === negate) {
          throw new AssertionError(negate ? res.notMessage : res.message, actual, arguments[0]);
        }
      };
    });
    if (!negate) api.not = makeExpectation(actual, true);
    return api;
  }

  function expect(actual) {
    return makeExpectation(actual, false);
  }

  // ---------------------------------------------------------------------------------------------
  // Registry: root -> one node per suite file -> nested describes -> tests
  // ---------------------------------------------------------------------------------------------

  function Suite(name, kind) {
    this.name = name;
    this.kind = kind;
    this.children = [];
    this.beforeEach = [];
    this.afterEach = [];
    this.skipped = false;
  }

  var rootSuite = new Suite('', 'root');
  var fileSuite = null;
  var stack = [];

  function currentSuite() {
    if (stack.length === 0) setSuite('default');
    return stack[stack.length - 1];
  }

  /**
   * Starts a new suite file. Everything registered afterwards (until the next call) belongs to it,
   * and `run({ suite })` selects by this name.
   */
  function setSuite(name) {
    fileSuite = new Suite(String(name), 'file');
    rootSuite.children.push(fileSuite);
    stack = [fileSuite];
    return fileSuite.name;
  }

  function addTest(kind, name, fn, extra) {
    var test = { type: 'test', kind: kind, name: String(name), fn: fn, skipped: typeof fn !== 'function' };
    if (extra) Object.keys(extra).forEach(function (key) { test[key] = extra[key]; });
    currentSuite().children.push(test);
    return test;
  }

  function describe(name, fn) {
    var parent = currentSuite();
    var suite = new Suite(String(name), 'describe');
    parent.children.push(suite);
    stack.push(suite);
    try {
      fn.call(suite);
    } catch (err) {
      addTest('test', '(describe block threw)', function () { throw err; });
    } finally {
      stack.pop();
    }
    return suite;
  }

  describe.skip = function (name, fn) {
    var suite = describe(name, fn);
    suite.skipped = true;
    return suite;
  };

  function it(name, fn, timeoutMs) {
    return addTest('test', name, fn, { timeout: timeoutMs || DEFAULT_TIMEOUT_MS });
  }

  it.skip = function (name) {
    var test = addTest('test', name, null);
    test.skipped = true;
    return test;
  };

  function beforeEach(fn) { currentSuite().beforeEach.push(fn); }

  function afterEach(fn) { currentSuite().afterEach.push(fn); }

  /**
   * Registers a micro-benchmark. It always passes unless `fn` throws; timings go to
   * `SG.testResults.benches` and are shown by the runners.
   */
  function bench(name, fn, iterations) {
    return addTest('bench', name, fn, {
      iterations: iterations || DEFAULT_BENCH_ITERATIONS,
      timeout: DEFAULT_TIMEOUT_MS
    });
  }

  function skip(reason) {
    throw new SkipSignal(reason);
  }

  /** Reports a file that failed to load as a failing test, so it can not go unnoticed. */
  function addLoadError(suiteName, err) {
    setSuite(suiteName);
    addTest('test', '(failed to load)', function () { throw err; });
  }

  // ---------------------------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------------------------

  function now() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  function emptyResults() {
    return {
      total: 0, passed: 0, failed: 0, skipped: 0, ms: 0, bailed: false,
      tests: [], suites: [], benches: []
    };
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error('timed out after ' + ms + ' ms'));
      }, ms);
      promise.then(function (value) { clearTimeout(timer); resolve(value); },
        function (err) { clearTimeout(timer); reject(err); });
    });
  }

  /** Calls fn; waits for it when it returns a promise. Sync functions stay on the fast path. */
  function invoke(fn, ctx, timeoutMs) {
    var out = fn.call(ctx);
    if (out && typeof out.then === 'function') return withTimeout(out, timeoutMs);
    return undefined;
  }

  function runBench(test, ctx) {
    var iterations = test.iterations;
    var warmup = Math.min(10, iterations);
    for (var w = 0; w < warmup; w++) test.fn.call(ctx);
    var start = now();
    for (var i = 0; i < iterations; i++) test.fn.call(ctx);
    var totalMs = now() - start;
    return {
      iterations: iterations,
      totalMs: totalMs,
      msPerOp: totalMs / iterations,
      opsPerSec: totalMs > 0 ? iterations / (totalMs / 1000) : Infinity
    };
  }

  /**
   * Runs one test with its hooks. Returns { status, error, reason, bench }.
   * @param {Object} test
   * @param {Suite[]} chain Ancestors from the file suite down to the test's own describe.
   */
  async function runTest(test, chain) {
    var ctx = {};
    var error = null;
    var reason = '';
    var skipped = false;
    var benchResult = null;
    var i;
    var j;

    try {
      for (i = 0; i < chain.length; i++) {
        for (j = 0; j < chain[i].beforeEach.length; j++) {
          await invoke(chain[i].beforeEach[j], ctx, test.timeout || DEFAULT_TIMEOUT_MS);
        }
      }
      if (test.kind === 'bench') benchResult = runBench(test, ctx);
      else await invoke(test.fn, ctx, test.timeout || DEFAULT_TIMEOUT_MS);
    } catch (err) {
      if (err instanceof SkipSignal) { skipped = true; reason = err.reason; } else error = err;
    }

    for (i = chain.length - 1; i >= 0; i--) {
      for (j = 0; j < chain[i].afterEach.length; j++) {
        try {
          await invoke(chain[i].afterEach[j], ctx, DEFAULT_TIMEOUT_MS);
        } catch (err) {
          if (error === null && !(err instanceof SkipSignal)) error = err;
        }
      }
    }

    if (error !== null) return { status: 'fail', error: error, reason: '', bench: null };
    return { status: skipped ? 'skip' : 'pass', error: null, reason: reason, bench: benchResult };
  }

  function normalizeError(err) {
    if (err instanceof Error) return { name: err.name, message: err.message, stack: String(err.stack || '') };
    return { name: 'Error', message: fmt(err), stack: '' };
  }

  function parseSuiteList(value) {
    if (!value) return null;
    var list = Array.isArray(value) ? value : String(value).split(',');
    list = list.map(function (s) { return String(s).trim().toLowerCase(); }).filter(Boolean);
    return list.length ? list : null;
  }

  function notify(callback, arg) {
    if (typeof callback !== 'function') return;
    try { callback(arg); } catch (e) { /* a broken reporter must not break the run */ }
  }

  /**
   * Runs every registered test.
   * @param {Object} [options]
   * @param {string|string[]} [options.suite]  Only suites with these names (comma separated string ok).
   * @param {string} [options.filter]          Only tests whose "suite > describe > test" name contains this.
   * @param {boolean} [options.bail]           Stop after the first failure.
   * @param {number} [options.yieldMs]         Give the event loop a turn about every N ms (browser UI).
   * @param {function} [options.onSuiteStart]  Called with the suite name just before its first test runs.
   * @param {function} [options.onTestEnd]     Called with each test result record.
   * @param {function} [options.onSuiteEnd]    Called with the suite summary.
   * @returns {Promise<Object>} SG.testResults
   */
  async function run(options) {
    options = options || {};
    var wanted = parseSuiteList(options.suite);
    var filter = options.filter ? String(options.filter).toLowerCase() : null;
    var results = SG.testResults = emptyResults();
    var runStart = now();
    var lastYield = runStart;

    async function walk(suite, chain, names, summary) {
      for (var c = 0; c < suite.children.length; c++) {
        if (results.bailed) return;
        var child = suite.children[c];

        if (child.type !== 'test') {
          await walk(child, chain.concat(child), names.concat(child.name), summary);
          continue;
        }

        var fullName = names.concat(child.name).join(' > ');
        if (filter && fullName.toLowerCase().indexOf(filter) === -1) continue;

        var testStart = now();
        if (summary.total === 0) notify(options.onSuiteStart, summary.name);
        var outcome;
        if (child.skipped || chain.some(function (s) { return s.skipped; })) {
          outcome = { status: 'skip', error: null, reason: '', bench: null };
        } else {
          outcome = await runTest(child, chain);
        }

        var record = {
          suite: names[0],
          name: child.name,
          fullName: fullName,
          status: outcome.status,
          ms: now() - testStart,
          reason: outcome.reason,
          error: outcome.error ? normalizeError(outcome.error) : null
        };
        results.tests.push(record);
        results.total++;
        summary.total++;
        if (outcome.status === 'pass') { results.passed++; summary.passed++; }
        else if (outcome.status === 'fail') { results.failed++; summary.failed++; }
        else { results.skipped++; summary.skipped++; }
        if (outcome.bench) {
          results.benches.push(Object.assign({ suite: names[0], name: fullName }, outcome.bench));
        }
        notify(options.onTestEnd, record);

        if (outcome.status === 'fail' && options.bail) results.bailed = true;
        if (options.yieldMs && now() - lastYield > options.yieldMs) {
          await new Promise(function (resolve) { setTimeout(resolve, 0); });
          lastYield = now();
        }
      }
    }

    for (var f = 0; f < rootSuite.children.length && !results.bailed; f++) {
      var file = rootSuite.children[f];
      if (wanted && wanted.indexOf(file.name.toLowerCase()) === -1) continue;
      var summary = { name: file.name, total: 0, passed: 0, failed: 0, skipped: 0, ms: 0 };
      var suiteStart = now();
      await walk(file, [file], [file.name], summary);
      summary.ms = now() - suiteStart;
      if (summary.total > 0) {
        results.suites.push(summary);
        notify(options.onSuiteEnd, summary);
      }
    }

    results.ms = now() - runStart;
    return results;
  }

  /** Names of the suite files that registered at least one test or block, in registration order. */
  function suiteNames() {
    var names = [];
    rootSuite.children.forEach(function (s) {
      if (s.children.length > 0 && names.indexOf(s.name) === -1) names.push(s.name);
    });
    return names;
  }

  SG.testResults = emptyResults();
  SG.test = {
    describe: describe,
    it: it,
    expect: expect,
    beforeEach: beforeEach,
    afterEach: afterEach,
    bench: bench,
    skip: skip,
    setSuite: setSuite,
    addLoadError: addLoadError,
    suiteNames: suiteNames,
    run: run,
    deepEqual: deepEqual,
    AssertionError: AssertionError,
    TIME_FACTOR: TIME_FACTOR,
    timeLimit: function (ms) { return ms * TIME_FACTOR; }
  };

  root.describe = describe;
  root.it = it;
  root.expect = expect;
  root.beforeEach = beforeEach;
  root.afterEach = afterEach;
  root.bench = bench;
})(typeof self !== 'undefined' ? self : globalThis);
