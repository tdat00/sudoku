// Static checks: the core and variant layers must stay free of DOM access and of module syntax.
// The last block also self-tests tests/harness.js (the test infrastructure that all suites rely on).
(function () {
  'use strict';

  var SG = (typeof self !== 'undefined' ? self : globalThis).SG;

  var FORBIDDEN = ['document.', 'window.', 'localStorage', 'alert(', 'import ', 'export ', 'require('];
  var SCANNED_DIRS = ['../core/js/engine', 'js/engine', 'js/variants'];

  /** @returns {Array<{line:number, token:string}>} every forbidden token found, with its line number. */
  function findViolations(text) {
    var found = [];
    text.split(/\r?\n/).forEach(function (line, index) {
      FORBIDDEN.forEach(function (token) {
        if (line.indexOf(token) !== -1) found.push({ line: index + 1, token: token });
      });
    });
    return found;
  }

  /** Returns the Node helpers, or ends the running test as skipped when they are missing (browser). */
  function requireNode() {
    var env = SG.test.node;
    if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
    return env;
  }

  /** Recursively lists *.js files below a directory, relative to the project root, sorted. */
  function listScripts(env, relDir) {
    var abs = env.path.join(env.root, relDir);
    if (!env.fs.existsSync(abs)) return [];
    var out = [];
    env.fs.readdirSync(abs, { withFileTypes: true }).forEach(function (entry) {
      var rel = relDir + '/' + entry.name;
      if (entry.isDirectory()) out = out.concat(listScripts(env, rel));
      else if (entry.name.endsWith('.js')) out.push(rel);
    });
    return out.sort();
  }

  function scanFile(env, rel) {
    var text = env.fs.readFileSync(env.path.join(env.root, rel), 'utf8');
    return findViolations(text).map(function (v) {
      return rel + ':' + v.line + ' contains "' + v.token + '"';
    });
  }

  describe('purity scanner', function () {
    it('flags every forbidden token with its line number', function () {
      FORBIDDEN.forEach(function (token) {
        var found = findViolations('var ok = 1;\nfoo ' + token + ' bar\n');
        expect(found).toEqual([{ line: 2, token: token }]);
      });
    });

    it('accepts ordinary code', function () {
      var clean = "(function (root) {\n  'use strict';\n  var SG = root.SG = root.SG || {};\n" +
        "  var self = typeof self !== 'undefined' ? self : globalThis;\n})(globalThis);\n";
      expect(findViolations(clean)).toEqual([]);
    });

    it('skips instead of failing when no Node file system is available (browser)', function () {
      var saved = SG.test.node;
      SG.test.node = undefined;
      try {
        expect(function () { requireNode(); }).toThrow({ name: 'SkipSignal' });
      } finally {
        SG.test.node = saved;
      }
    });
  });

  describe('source purity (core/js/engine, js/engine, js/variants)', function () {
    var env = SG.test.node;

    if (!env || !env.fs) {
      it('contains no DOM access or module syntax', function () {
        requireNode();
      });
      return;
    }

    var files = [];
    SCANNED_DIRS.forEach(function (dir) { files = files.concat(listScripts(env, dir)); });

    it('finds the core files to scan', function () {
      requireNode();
      ['../core/js/engine/ns.js', '../core/js/engine/errors.js', '../core/js/engine/bits.js', '../core/js/engine/budget.js', 'js/engine/rng.js']
        .forEach(function (rel) { expect(files).toContain(rel); });
    });

    files.forEach(function (rel) {
      it(rel + ' has none of: ' + FORBIDDEN.join(' '), function () {
        expect(scanFile(requireNode(), rel)).toEqual([]);
      });
    });
  });

  describe('test harness: expect and deep equality', function () {
    function failureOf(fn) {
      try { fn(); } catch (e) { return e; }
      return null;
    }

    it('toEqual compares typed arrays, arrays and nested objects deeply', function () {
      expect(new Int32Array([1, 2, 3])).toEqual(new Int32Array([1, 2, 3]));
      expect({ a: [1, { b: new Int32Array([4, 5]) }], c: 'x' }).toEqual({ a: [1, { b: new Int32Array([4, 5]) }], c: 'x' });
      expect([NaN, new Map([[1, { z: 1 }]]), new Set([1, 2])]).toEqual([NaN, new Map([[1, { z: 1 }]]), new Set([2, 1])]);
      expect(new Int32Array([1, 2, 3])).not.toEqual(new Int32Array([1, 2, 4]));
      expect(new Int32Array([1, 2, 3])).not.toEqual(new Int32Array([1, 2]));
      expect(new Int32Array([1, 2, 3])).not.toEqual([1, 2, 3]);
      expect(new Int32Array([1, 2, 3])).not.toEqual(new Uint8Array([1, 2, 3]));
      expect({ a: { b: [1, 2] } }).not.toEqual({ a: { b: [1, 3] } });
      expect({ a: 1 }).not.toEqual({ a: 1, b: undefined });
    });

    it('a failed matcher throws an AssertionError with a clear message', function () {
      var err = failureOf(function () { expect(new Int32Array([1, 2])).toEqual(new Int32Array([1, 3])); });
      expect(err instanceof SG.test.AssertionError).toBe(true);
      expect(err.message).toBe('expected Int32Array(2)[1, 2] to equal Int32Array(2)[1, 3]');
      expect(failureOf(function () { expect(1).toBe(2); }).message).toBe('expected 1 to be 2');
      expect(failureOf(function () { expect(1).not.toBe(1); }).message).toBe('expected value not to be 1');
    });

    it('supports toBe, toBeTruthy, toBeFalsy, toBeCloseTo, toContain, toHaveLength', function () {
      expect('a').toBe('a');
      expect(NaN).toBe(NaN);
      expect(0).toBeFalsy();
      expect('x').toBeTruthy();
      expect(0.1 + 0.2).toBeCloseTo(0.3, 5);
      expect(failureOf(function () { expect(0.3).toBeCloseTo(0.31, 3); })).toBeTruthy();
      expect([1, 2, 3]).toContain(2);
      expect('hello').toContain('ell');
      expect(new Int32Array([7, 8])).toContain(8);
      expect([1, 2, 3]).toHaveLength(3);
      expect(failureOf(function () { expect([1]).toHaveLength(2); })).toBeTruthy();
      expect(failureOf(function () { expect([1]).toContain(5); })).toBeTruthy();
    });

    it('toThrow accepts nothing, a message part, a pattern, a class or a property object', function () {
      function boom() { throw new RangeError('out of range: 7'); }
      expect(boom).toThrow();
      expect(boom).toThrow('range: 7');
      expect(boom).toThrow(/of range/);
      expect(boom).toThrow(RangeError);
      expect(boom).toThrow({ name: 'RangeError' });
      expect(boom).not.toThrow(TypeError);
      expect(function () {}).not.toThrow();
      expect(failureOf(function () { expect(function () {}).toThrow(); })).toBeTruthy();
      expect(failureOf(function () { expect(boom).toThrow('other'); })).toBeTruthy();
    });
  });

  describe('test harness: running (isolated copy)', function () {
    /**
     * Evaluates `code` against a private copy of the harness so that nothing leaks into this run.
     * Resolves with { results, extra } where `extra` is whatever the code stored in globalThis.extra.
     */
    function runIsolated(code, options) {
      var env = requireNode();
      var context = env.vm.createContext({ setTimeout: setTimeout, clearTimeout: clearTimeout });
      env.vm.runInContext(env.fs.readFileSync(env.path.join(env.root, 'tests/harness.js'), 'utf8'), context);
      env.vm.runInContext(code.join('\n'), context);
      var pending = env.vm.runInContext(
        'SG.test.run(' + JSON.stringify(options || {}) + ').then(function (r) {' +
        ' return JSON.stringify({ results: r, extra: globalThis.extra }); })', context);
      return pending.then(JSON.parse);
    }

    function named(results, status) {
      return results.tests.filter(function (t) { return t.status === status; }).map(function (t) { return t.name; });
    }

    it('reports a failing test red with its message and keeps running the others', function () {
      return runIsolated([
        "describe('d', function () {",
        "  it('passes', function () { expect(1).toBe(1); });",
        "  it('fails', function () { expect([1, 2]).toEqual([1, 3]); });",
        "  it('still runs', function () { expect('abc').toContain('b'); });",
        '});'
      ]).then(function (out) {
        var r = out.results;
        expect([r.total, r.passed, r.failed, r.skipped]).toEqual([3, 2, 1, 0]);
        expect(named(r, 'fail')).toEqual(['fails']);
        expect(r.tests[1].error.message).toBe('expected Array(2)[1, 2] to equal Array(2)[1, 3]');
        expect(r.tests[1].fullName).toBe('default > d > fails');
        expect(r.tests[1].error.stack).toContain('AssertionError');
      });
    });

    it('runs hooks outer-first before and inner-first after each test', function () {
      return runIsolated([
        'var log = []; globalThis.extra = log;',
        "describe('outer', function () {",
        "  beforeEach(function () { log.push('outer-before'); });",
        "  afterEach(function () { log.push('outer-after'); });",
        "  describe('inner', function () {",
        "    beforeEach(function () { log.push('inner-before'); });",
        "    afterEach(function () { log.push('inner-after'); });",
        "    it('a', function () { log.push('test'); });",
        '  });',
        '});'
      ]).then(function (out) {
        expect(out.extra).toEqual(['outer-before', 'inner-before', 'test', 'inner-after', 'outer-after']);
      });
    });

    it('fails a test when a hook throws, and still runs afterEach', function () {
      return runIsolated([
        'var log = []; globalThis.extra = log;',
        "describe('d', function () {",
        "  beforeEach(function () { throw new Error('hook broke'); });",
        "  afterEach(function () { log.push('after'); });",
        "  it('t', function () { log.push('body'); });",
        '});'
      ]).then(function (out) {
        expect(out.results.failed).toBe(1);
        expect(out.results.tests[0].error.message).toBe('hook broke');
        expect(out.extra).toEqual(['after']);
      });
    });

    it('supports async tests, timeouts, skips and benchmarks', function () {
      return runIsolated([
        "it('async ok', function () { return new Promise(function (resolve) { setTimeout(resolve, 5); }); });",
        "it('async fail', function () { return Promise.reject(new Error('boom')); });",
        "it('hangs', function () { return new Promise(function () {}); }, 30);",
        "it.skip('skipped', function () { throw new Error('must not run'); });",
        "it('skips at runtime', function () { SG.test.skip('because'); });",
        "describe.skip('skipped block', function () { it('inside', function () {}); });",
        "bench('bench', function () {}, 50);"
      ]).then(function (out) {
        var r = out.results;
        expect(named(r, 'pass')).toEqual(['async ok', 'bench']);
        expect(named(r, 'fail')).toEqual(['async fail', 'hangs']);
        expect(named(r, 'skip')).toEqual(['skipped', 'skips at runtime', 'inside']);
        expect(r.tests[1].error.message).toBe('boom');
        expect(r.tests[2].error.message).toContain('timed out');
        expect(r.tests[4].reason).toBe('because');
        expect(r.benches).toHaveLength(1);
        expect(r.benches[0].iterations).toBe(50);
      });
    });

    it('records describe blocks that throw and files that fail to load as failures', function () {
      return runIsolated([
        "describe('bad', function () { throw new Error('describe broke'); });",
        "SG.test.addLoadError('broken-file', new Error('syntax problem'));"
      ]).then(function (out) {
        var r = out.results;
        expect(r.failed).toBe(2);
        expect(r.tests[0].error.message).toBe('describe broke');
        expect(r.tests[1].suite).toBe('broken-file');
        expect(r.tests[1].error.message).toBe('syntax problem');
      });
    });

    var FILTER_CODE = [
      "SG.test.setSuite('first');",
      "it('one', function () {});",
      "it('two fails', function () { throw new Error('x'); });",
      "SG.test.setSuite('second');",
      "it('Three', function () {});"
    ];

    it('selects by suite name (comma separated) and by case-insensitive filter', function () {
      return Promise.all([
        runIsolated(FILTER_CODE, { suite: 'first' }),
        runIsolated(FILTER_CODE, { suite: 'second,first' }),
        runIsolated(FILTER_CODE, { filter: 'THREE' }),
        runIsolated(FILTER_CODE, { suite: 'first', filter: 'zzz' })
      ]).then(function (all) {
        expect(all.map(function (o) { return o.results.total; })).toEqual([2, 3, 1, 0]);
        expect(all[0].results.suites.map(function (s) { return s.name; })).toEqual(['first']);
      });
    });

    it('bail stops after the first failure', function () {
      return runIsolated(FILTER_CODE, { bail: true }).then(function (out) {
        expect(out.results.bailed).toBe(true);
        expect(out.results.total).toBe(2);
        expect(named(out.results, 'pass')).toEqual(['one']);
      });
    });

    it('collects totals, timing and per-suite counts in SG.testResults', function () {
      return runIsolated(FILTER_CODE).then(function (out) {
        var r = out.results;
        expect([r.total, r.passed, r.failed, r.skipped]).toEqual([3, 2, 1, 0]);
        expect(r.ms).toBeGreaterThan(-1);
        expect(r.suites.map(function (s) { return [s.name, s.total, s.failed]; }))
          .toEqual([['first', 2, 1], ['second', 1, 0]]);
      });
    });
  });
})();
