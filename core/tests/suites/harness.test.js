// Self-tests of the test infrastructure that every suite relies on: core/tests/harness.js (expect, deep
// equality, the runner and its isolation).
(function () {
  'use strict';

  var SG = (typeof self !== 'undefined' ? self : globalThis).SG;

  /** Returns the Node helpers, or ends the running test as skipped when they are missing (browser). */
  function requireNode() {
    var env = SG.test.node;
    if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
    return env;
  }

  /** A copy of a value as JSON data (the values of a private harness belong to another realm). */
  function plain(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /**
   * Evaluates `code` against a private copy of the harness, so that nothing leaks into this run.
   * Returns { SG, extra }: the private SG, and what the code stored in globalThis.extra.
   */
  function privateHarness(code) {
    var env = requireNode();
    var context = env.vm.createContext({ setTimeout: setTimeout, clearTimeout: clearTimeout });
    env.vm.runInContext(env.fs.readFileSync(env.path.join(env.root, '../core/tests/harness.js'), 'utf8'), context);
    env.vm.runInContext(code.join('\n'), context);
    return { SG: env.vm.runInContext('SG', context), extra: env.vm.runInContext('globalThis.extra', context) };
  }

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
      env.vm.runInContext(env.fs.readFileSync(env.path.join(env.root, '../core/tests/harness.js'), 'utf8'), context);
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

  describe('test harness: list, exact selection and ordinals (isolated copy)', function () {
    var MIXED = [
      'var log = []; globalThis.extra = log;',
      "SG.test.setSuite('first');",
      "describe('outer', function () {",
      "  beforeEach(function () { log.push('before'); });",
      "  it('one', function () { log.push('one'); });",
      "  describe('inner', function () {",
      "    it('two', function () { log.push('two'); }, 777);",
      "    it.skip('three');",
      '  });',
      "  bench('speed', function () { log.push('bench'); }, 3);",
      '});',
      "describe.skip('muted', function () { it('inherited', function () { log.push('muted'); }); });",
      "SG.test.setSuite('second');",
      "it('runtime skip', function () { SG.test.skip('later'); });"
    ];

    function row(suite, ordinal, fullName, kind, skipped, timeoutMs) {
      return { suite: suite, ordinal: ordinal, fullName: fullName, kind: kind, skipped: skipped, timeoutMs: timeoutMs };
    }

    function names(listing) {
      return plain(listing).tests.map(function (t) { return t.fullName; });
    }

    it('lists the run order without calling a test, a hook or a benchmark; run then executes as before', function () {
      var h = privateHarness(MIXED);
      var first = plain(h.SG.test.list({}));
      expect(plain(h.SG.test.list({}))).toEqual(first);
      expect(plain(h.extra)).toEqual([]);
      expect(first.registrationErrors).toEqual([]);
      expect(first.tests).toEqual([
        row('first', 0, 'first > outer > one', 'test', false, 5000),
        row('first', 1, 'first > outer > inner > two', 'test', false, 777),
        row('first', 2, 'first > outer > inner > three', 'test', true, 5000),
        row('first', 3, 'first > outer > speed', 'bench', false, 5000),
        row('first', 4, 'first > muted > inherited', 'test', true, 5000),
        row('second', 0, 'second > runtime skip', 'test', false, 5000)
      ]);
      return h.SG.test.run({}).then(function (results) {
        var done = plain(results);
        expect(done.tests.map(function (t) { return t.fullName; }))
          .toEqual(first.tests.map(function (t) { return t.fullName; }));
        expect(done.tests.map(function (t) { return t.ordinal; })).toEqual([0, 1, 2, 3, 4, 0]);
        expect(done.tests.map(function (t) { return t.status; }))
          .toEqual(['pass', 'pass', 'skip', 'pass', 'skip', 'skip']);
        expect(plain(h.extra)).toEqual(['before', 'one', 'before', 'two', 'before',
          'bench', 'bench', 'bench', 'bench', 'bench', 'bench']);
      });
    });

    it('numbers the tests of a file from 0 before any filter and keeps the numbers whatever is selected', function () {
      var h = privateHarness([
        "SG.test.setSuite('b');",
        "it('same', function () {});",
        "it('same', function () {});",
        "it('other', function () {});",
        "SG.test.setSuite('a');",
        "it('other', function () {});",
        "it('same', function () {});"
      ]);
      function keys(options) {
        return plain(h.SG.test.list(options)).tests.map(function (t) {
          return t.suite + '#' + t.ordinal + ' ' + t.fullName;
        });
      }
      var all = ['b#0 b > same', 'b#1 b > same', 'b#2 b > other', 'a#0 a > other', 'a#1 a > same'];
      expect(keys({})).toEqual(all);
      expect(keys({ filter: 'SAME' })).toEqual(['b#0 b > same', 'b#1 b > same', 'a#1 a > same']);
      expect(keys({ suite: 'a' })).toEqual(['a#0 a > other', 'a#1 a > same']);
      expect(keys({ suite: 'a,b' })).toEqual(all);
      expect(keys({ suite: 'b,a' })).toEqual(all);
      expect(keys({ exact: 'b > same' })).toEqual(['b#0 b > same', 'b#1 b > same']);
      return h.SG.test.run({ filter: 'same' }).then(function (filtered) {
        expect(plain(filtered).tests.map(function (t) { return t.ordinal; })).toEqual([0, 1, 1]);
        return h.SG.test.run({ exact: 'b > same' });
      }).then(function (exact) {
        expect(plain(exact).tests.map(function (t) { return t.ordinal; })).toEqual([0, 1]);
      });
    });

    it('keeps the substring filter, and exact takes every test of one full name, case-sensitive, never both', function () {
      var h = privateHarness([
        "SG.test.setSuite('levels');",
        "describe('classic9', function () {",
        "  it('Very Easy: 3 puzzles', function () {});",
        "  it('Easy: 3 puzzles', function () {});",
        '});'
      ]);
      var veryEasy = 'levels > classic9 > Very Easy: 3 puzzles';
      var easy = 'levels > classic9 > Easy: 3 puzzles';
      expect(names(h.SG.test.list({ filter: 'easy' }))).toEqual([veryEasy, easy]);
      expect(names(h.SG.test.list({ filter: '> easy: 3 puzzles' }))).toEqual([easy]);
      expect(names(h.SG.test.list({ exact: easy }))).toEqual([easy]);
      expect(names(h.SG.test.list({ exact: easy.toLowerCase() }))).toEqual([]);
      expect(names(h.SG.test.list({ exact: 'levels > classic9 > Easy' }))).toEqual([]);
      expect(function () { h.SG.test.list({ exact: easy, filter: 'easy' }); }).toThrow('mutually exclusive');
      expect(function () { h.SG.test.list({ exact: '' }); }).toThrow('full name');
      return h.SG.test.run({ exact: easy, filter: 'easy' }).then(function () {
        throw new Error('run must reject exact together with filter');
      }, function (err) {
        expect(err.message).toContain('mutually exclusive');
        return h.SG.test.run({ exact: easy });
      }).then(function (results) {
        expect(plain(results).tests.map(function (t) { return t.fullName; })).toEqual([easy]);
      });
    });

    it('keeps registration errors visible: a describe that threw and a file that failed to load', function () {
      var h = privateHarness([
        "SG.test.setSuite('flaky');",
        "it('before', function () {});",
        "describe('broken', function () { it('partial', function () {}); throw new Error('describe broke'); });",
        "it('after', function () {});",
        "SG.test.addLoadError('flaky', new Error('syntax problem'));",
        "SG.test.setSuite('fine');",
        "it('ok', function () {});"
      ]);
      var errors = [
        { suite: 'flaky', ordinal: 2, fullName: 'flaky > broken > (describe block threw)', type: 'describe',
          name: 'Error', message: 'describe broke' },
        { suite: 'flaky', ordinal: 4, fullName: 'flaky > (failed to load)', type: 'load', name: 'Error',
          message: 'syntax problem' }
      ];
      var all = plain(h.SG.test.list({}));
      expect(all.tests.map(function (t) { return t.suite + '#' + t.ordinal; }))
        .toEqual(['flaky#0', 'flaky#1', 'flaky#2', 'flaky#3', 'flaky#4', 'fine#0']);
      expect(all.registrationErrors).toEqual(errors);
      expect(plain(h.SG.test.list({ filter: 'fine' })).registrationErrors).toEqual(errors);
      expect(plain(h.SG.test.list({ suite: 'fine' })).registrationErrors).toEqual([]);
      return h.SG.test.run({}).then(function (results) {
        var done = plain(results);
        expect([done.total, done.passed, done.failed]).toEqual([6, 4, 2]);
        expect(done.tests.filter(function (t) { return t.status === 'fail'; }).map(function (t) { return t.ordinal; }))
          .toEqual([2, 4]);
      });
    });

    it('lists without touching the results of the last run', function () {
      var h = privateHarness(MIXED);
      return h.SG.test.run({ suite: 'second' }).then(function () {
        var before = plain(h.SG.testResults);
        h.SG.test.list({});
        expect(plain(h.SG.testResults)).toEqual(before);
        expect(before.total).toBe(1);
      });
    });
  });

  describe('test harness: evidence tooling (core/tests/node-evidence.js, Node only)', function () {
    var SANDBOX = 'tests/artifacts/difficulty-v3/MS05r5/sandbox-evidence';

    function tools() {
      var env = requireNode();
      if (typeof process === 'undefined' || !process.getBuiltinModule) SG.test.skip('needs process.getBuiltinModule');
      var file = env.path.join(env.root, '../core/tests/node-evidence.js');
      return { env: env, E: process.getBuiltinModule('module').createRequire(file)(file),
        crypto: process.getBuiltinModule('crypto') };
    }

    /** Runs fn(tools, folder) with an empty sandbox folder that is removed afterwards (also after a promise). */
    function inSandbox(fn) {
      var t = tools();
      var dir = t.env.path.join(t.env.root, SANDBOX);
      function clean() { t.env.fs.rmSync(dir, { recursive: true, force: true }); }
      clean();
      t.env.fs.mkdirSync(dir, { recursive: true });
      var out;
      try {
        out = fn(t, dir);
      } catch (err) {
        clean();
        throw err;
      }
      if (out && typeof out.then === 'function') {
        return out.then(function (value) { clean(); return value; }, function (err) { clean(); throw err; });
      }
      clean();
      return out;
    }

    function put(t, dir, rel, text) {
      var abs = t.env.path.join(dir, rel);
      t.env.fs.mkdirSync(t.env.path.dirname(abs), { recursive: true });
      t.env.fs.writeFileSync(abs, text);
    }

    function create(t, dir, inputs, logs) {
      return t.E.create({
        app: 'scripted', repoRoot: dir, cwd: dir, inputs: inputs,
        out: function (text) { logs.out.push(text); }, err: function (text) { logs.err.push(text); }
      });
    }

    function readJson(t, dir, rel) {
      return JSON.parse(t.env.fs.readFileSync(t.env.path.join(dir, rel), 'utf8'));
    }

    it('parses --list-tests, --results and --exact, and refuses what cannot be combined', function () {
      var E = tools().E;
      function parse(argv) {
        var opts = { exact: null, listTests: null, results: null, filter: null };
        for (var i = 0; i < argv.length; i++) {
          var taken = E.parseOption(argv, i, opts);
          if (taken < 0) throw new Error('not an evidence option: ' + argv[i]);
          i = taken;
        }
        return opts;
      }
      expect(parse(['--exact=a > b', '--results', 'x.json'])).toEqual(
        { exact: 'a > b', listTests: null, results: 'x.json', filter: null });
      expect(parse(['--list-tests=y.json']).listTests).toBe('y.json');
      ['--exact=', '--results', '--list-tests'].forEach(function (bad) {
        expect(function () { parse([bad]); }).toThrow('Missing value');
      });
      expect(function () { parse(['--exact', '--bail']); }).toThrow('Missing value');
      expect(function () { parse(['--exact=a', '--exact=b']); }).toThrow('given twice');
      expect(E.parseOption(['--filter=x'], 0, {})).toBe(-1);
      expect(function () { E.checkOptions({ listTests: 'a.json', results: 'b.json' }); }).toThrow('mutually exclusive');
      expect(function () { E.checkOptions({ exact: 'a', filter: 'b' }); }).toThrow('mutually exclusive');
      E.checkOptions({ exact: 'a', filter: null, listTests: 'a.json', results: null });
    });

    it('renders one CRLF line per field and per row, as valid JSON without BOM or trailing space', function () {
      var E = tools().E;
      var doc = { schema: 1, rows: [{ x: 1 }, { x: 2 }], nested: { more: [{ y: 'z' }], plain: [1, 2] }, none: null };
      var text = E.render(doc);
      expect(text).toBe([
        '{', '  "schema": 1,', '  "rows": [', '    {"x":1},', '    {"x":2}', '  ],', '  "nested": {', '    "more": [',
        '      {"y":"z"}', '    ],', '    "plain": [1,2]', '  },', '  "none": null', '}', ''].join('\r\n'));
      expect(JSON.parse(text)).toEqual(doc);
      expect(/(?<!\r)\n|^\uFEFF|[ \t]\r\n/.test(text)).toBe(false);
    });

    it('fingerprints the same files in sorted order whatever is selected, from text with LF and no BOM', function () {
      inSandbox(function (t, dir) {
        put(t, dir, 'doc.md', 'doc\r\n');
        put(t, dir, 'a/two.txt', 'two');
        put(t, dir, 'a/one.js', 'x\n');
        put(t, dir, 'a/sub/three.js', 'three');
        put(t, dir, 'a/artifacts/out.js', 'artifact');
        put(t, dir, 'a/node_modules/m.js', 'module');
        put(t, dir, 'b/direct.js', 'direct');
        put(t, dir, 'b/deep/skipped.js', 'deep');
        put(t, dir, 'm/manual.js', 'manual');
        var ev = create(t, dir, { files: ['doc.md'], trees: ['a', { dir: 'b', recursive: false }],
          manualTrees: ['m'] }, { out: [], err: [] });
        var quick = ev.fingerprint();
        expect(quick.files.map(function (f) { return f.path; }))
          .toEqual(['a/one.js', 'a/sub/three.js', 'a/two.txt', 'b/direct.js', 'doc.md']);
        expect(ev.fingerprint()).toEqual(quick);
        expect(ev.fingerprint({ manual: true }).files.map(function (f) { return f.path; }))
          .toEqual(['a/one.js', 'a/sub/three.js', 'a/two.txt', 'b/direct.js', 'doc.md', 'm/manual.js']);
        expect(ev.fingerprint({ manual: true }).sourceHash).not.toBe(quick.sourceHash);
        function sha(text) { return t.crypto.createHash('sha256').update(text).digest('hex'); }
        expect(quick.files[0].hash).toBe(sha('x\n'));
        expect(quick.files[4].hash).toBe(sha('doc\n'));
        put(t, dir, 'a/artifacts/out.js', 'another artifact');
        expect(ev.fingerprint()).toEqual(quick);
        put(t, dir, 'a/one.js', '\uFEFFx\r\n');
        expect(ev.fingerprint()).toEqual(quick);
        put(t, dir, 'a/one.js', 'y\n');
        expect(ev.fingerprint().sourceHash).not.toBe(quick.sourceHash);
        put(t, dir, 'b/deep/skipped.js', 'deeper');
        t.env.fs.rmSync(t.env.path.join(dir, 'doc.md'));
        expect(function () { ev.fingerprint(); }).toThrow('doc.md: a fingerprint file is missing');
      });
    });

    it('accepts only a new project-relative .json path inside the repository and outside the fingerprint', function () {
      inSandbox(function (t, dir) {
        put(t, dir, 'src/code.js', 'code');
        put(t, dir, 'top.md', 'top');
        put(t, dir, 'direct/file.js', 'direct');
        put(t, dir, 'taken.json', '{}');
        put(t, dir, 'leftover.json.partial', '{');
        var ev = create(t, dir, { files: ['top.md'], trees: ['src', { dir: 'direct', recursive: false }] },
          { out: [], err: [] });
        function refused(value, text) {
          expect(function () { ev.outputTarget('--results', value); }).toThrow(text);
        }
        refused('', 'Missing value');
        refused(t.env.path.join(dir, 'abs.json'), 'not an absolute one');
        if (t.env.path.sep === '\\') refused('C:drive.json', 'not an absolute one');
        refused('../outside.json', 'inside the repository');
        refused('notes.txt', 'extension .json');
        refused('taken.json', 'exists already');
        refused('leftover.json', 'exists already');
        refused('top.json/../top.md', 'extension .json');
        refused('src/new.json', 'fingerprinted');
        refused('direct/new.json', 'fingerprinted');
        var ok = ev.outputTarget('--list-tests', 'evidence/deep/inv.json');
        expect(ok.shown).toBe('evidence/deep/inv.json');
        expect(ok.abs).toBe(t.env.path.join(dir, 'evidence', 'deep', 'inv.json'));
        expect(t.env.fs.existsSync(t.env.path.join(dir, 'evidence'))).toBe(false);
        expect(ev.outputTarget('--results', 'direct/artifacts/x.json').shown).toBe('direct/artifacts/x.json');
        expect(ev.outputTarget('--results', 'src/artifacts/x.json').shown).toBe('src/artifacts/x.json');
      });
    });

    it('writes whole, creates the folders, never overwrites and leaves no partial file', function () {
      inSandbox(function (t, dir) {
        var ev = create(t, dir, { files: [] }, { out: [], err: [] });
        var target = ev.outputTarget('--results', 'evidence/deep/r.json');
        var text = t.E.render({ schema: 1, rows: [{ a: 1 }] });
        ev.write(target, text);
        expect(t.env.fs.readFileSync(target.abs, 'utf8')).toBe(text);
        expect(t.env.fs.readdirSync(t.env.path.dirname(target.abs))).toEqual(['r.json']);
        expect(function () { ev.write(target, 'other'); }).toThrow('exists already');
        expect(t.env.fs.readFileSync(target.abs, 'utf8')).toBe(text);
        expect(t.env.fs.readdirSync(t.env.path.dirname(target.abs))).toEqual(['r.json']);
        expect(function () { ev.outputTarget('--results', 'evidence/deep/r.json'); }).toThrow('exists already');
        expect(JSON.stringify(ev.scrub(JSON.stringify({ at: dir + t.env.path.sep + 'x' }))).indexOf(dir)).toBe(-1);
      });
    });

    var SCRIPTED = [
      "SG.test.setSuite('good');",
      "it('one', function () {});",
      "it.skip('two');",
      "bench('three', function () {}, 2);",
      "SG.test.setSuite('bad');",
      "it('four', function () {});",
      "describe('broken', function () { throw new Error('describe broke'); });",
      "SG.test.addLoadError('worse', new Error('syntax problem'));",
      "SG.test.setSuite('mix');",
      "it('ok one', function () {});",
      "it('bad two', function () { throw new Error('assertion failed'); });",
      "it('ok three', function () {});"
    ];

    it('--list-tests writes the inventory, marks registration errors incomplete and writes nothing for none', function () {
      inSandbox(function (t, dir) {
        put(t, dir, 'doc.md', 'doc');
        var logs = { out: [], err: [] };
        var ev = create(t, dir, { files: ['doc.md'] }, logs);
        var identity = ev.fingerprint();
        var h = privateHarness(SCRIPTED);
        function list(target, selection) {
          return ev.listCommand({ SG: h.SG, target: ev.outputTarget('--list-tests', target), selection: selection,
            identity: identity, argv: ['--list-tests=' + target], registrationMs: 12.34 });
        }
        expect(list('inv/good.json', { set: 'suites', suites: ['good'], filter: null, exact: null })).toBe(0);
        var good = readJson(t, dir, 'inv/good.json');
        expect(good.schema).toBe(1);
        expect(good.app).toBe('scripted');
        expect(good.node).toBe(process.version);
        expect(good.sourceHash).toBe(identity.sourceHash);
        expect(good.files).toEqual(identity.files);
        expect(good.timeFactor).toBe(h.SG.test.TIME_FACTOR);
        expect(good.selection).toEqual({ set: 'suites', suites: ['good'], filter: null, exact: null, count: 3 });
        expect(good.registrationMs).toBe(12.3);
        expect(good.complete).toBe(true);
        expect(good.registrationErrors).toEqual([]);
        expect(good.tests.map(function (r) { return [r.ordinal, r.kind, r.skipped]; }))
          .toEqual([[0, 'test', false], [1, 'test', true], [2, 'bench', false]]);
        expect(logs.out[0]).toContain('Inventory: 3 tests in 1 suites (1 skipped, 1 benchmarks)');

        expect(list('inv/bad.json', { set: 'suites', suites: ['bad', 'worse'], filter: null, exact: null })).toBe(1);
        var bad = readJson(t, dir, 'inv/bad.json');
        expect(bad.complete).toBe(false);
        expect(bad.registrationErrors.map(function (e) { return e.type + ': ' + e.message; }))
          .toEqual(['describe: describe broke', 'load: syntax problem']);
        expect(bad.tests.length).toBe(3);
        expect(logs.err.join('\n')).toContain('Registration error (describe): bad > broken > (describe block threw)');

        expect(list('inv/none.json', { set: 'suites', suites: ['good'], filter: 'zzz', exact: null })).toBe(1);
        expect(t.env.fs.existsSync(t.env.path.join(dir, 'inv', 'none.json'))).toBe(false);
        expect(logs.err[logs.err.length - 1]).toContain('No tests were selected');
      });
    });

    it('--results documents a finished run with its failures, and is incomplete after a bail or a change', function () {
      return inSandbox(function (t, dir) {
        put(t, dir, 'doc.md', 'doc');
        var logs = { out: [], err: [] };
        var ev = create(t, dir, { files: ['doc.md'] }, logs);
        var identity = ev.fingerprint();
        var h = privateHarness(SCRIPTED);
        function record(name, options, change) {
          var listing = plain(h.SG.test.list(options));
          return h.SG.test.run(options).then(function (results) {
            var ctx = { SG: h.SG, target: ev.outputTarget('--results', name), identity: identity,
              identityAfter: identity, selection: { set: 'suites', suites: options.suite, filter: null, exact: null },
              expected: listing.tests.length, registrationErrors: listing.registrationErrors, results: results,
              wallMs: 5.55, argv: ['--results=' + name] };
            if (change) change(ctx);
            return { code: ev.resultsCommand(ctx), doc: readJson(t, dir, name) };
          });
        }
        return record('r/mix.json', { suite: ['mix'] }).then(function (made) {
          expect(made.code).toBe(0);
          var doc = made.doc;
          expect(doc.complete).toBe(true);
          expect(doc.sourceStable).toBe(true);
          expect(doc.sourceHash).toBe(identity.sourceHash);
          expect(doc.wallMs).toBe(5.6);
          expect(doc.selection.count).toBe(3);
          expect([doc.results.total, doc.results.passed, doc.results.failed, doc.results.skipped,
            doc.results.bailed]).toEqual([3, 2, 1, 0, false]);
          expect(doc.results.tests.map(function (r) { return r.ordinal + ':' + r.status; }))
            .toEqual(['0:pass', '1:fail', '2:pass']);
          expect(doc.results.tests[1].error.message).toBe('assertion failed');
          expect(doc.registrationErrors).toEqual([]);
          return record('r/bail.json', { suite: ['mix'], bail: true });
        }).then(function (made) {
          expect(made.doc.complete).toBe(false);
          expect(made.doc.results.bailed).toBe(true);
          expect([made.doc.results.total, made.doc.selection.count]).toEqual([2, 3]);
          return record('r/changed.json', { suite: ['good'] }, function (ctx) {
            ctx.identityAfter = { sourceHash: 'f'.repeat(64), files: [] };
          });
        }).then(function (made) {
          expect(made.doc.complete).toBe(false);
          expect(made.doc.sourceStable).toBe(false);
          expect(made.doc.results.failed).toBe(0);
          return record('r/errors.json', { suite: ['bad', 'worse'] });
        }).then(function (made) {
          expect(made.doc.complete).toBe(false);
          expect(made.doc.results.failed).toBe(2);
          expect(made.doc.registrationErrors.length).toBe(2);
          expect(logs.out.filter(function (line) { return line.indexOf('INCOMPLETE') !== -1; }).length).toBe(3);
        });
      });
    });

    it('the runner of the app writes the inventory and the result of one bounded test and refuses the rest', function () {
      inSandbox(function (t, dir) {
        var spawn = process.getBuiltinModule('child_process');
        var folder = t.env.path.relative(t.env.root, dir).split(t.env.path.sep).join('/');
        // One test of this suite that is not this one: the child registers the suite but runs only that test.
        var one = plain(SG.test.list({ suite: 'harness' })).tests[0];
        function runner(args) {
          var run = spawn.spawnSync(process.execPath, ['tests/node-runner.js'].concat(args), {
            cwd: t.env.root, encoding: 'utf8', windowsHide: true, timeout: 120000 });
          return { code: run.status, out: run.stdout || '', err: run.stderr || '' };
        }
        var select = ['--suite=harness', '--exact=' + one.fullName];
        var listed = runner(select.concat(['--list-tests=' + folder + '/list.json']));
        expect(listed.code).toBe(0);
        expect(listed.out).toContain('Inventory: 1 tests in 1 suites');
        var inventory = readJson(t, dir, 'list.json');
        expect(inventory.complete).toBe(true);
        expect(inventory.tests).toEqual([one]);
        expect(inventory.selection.set).toBe('suites');
        expect(inventory.selection.exact).toBe(one.fullName);
        expect(inventory.files.length).toBeGreaterThan(50);
        expect(inventory.sourceHash).toMatch(/^[0-9a-f]{64}$/);
        var ran = runner(select.concat(['--results=' + folder + '/result.json']));
        expect(ran.code).toBe(0);
        expect(ran.out).toContain('Tests:  1 total');
        var result = readJson(t, dir, 'result.json');
        expect(result.complete).toBe(true);
        expect([result.results.total, result.results.failed, result.results.tests[0].ordinal])
          .toEqual([1, 0, one.ordinal]);
        expect(result.sourceHash).toBe(inventory.sourceHash);
        [[select.concat(['--filter=x']), 'mutually exclusive'],
          [['--suite=harness', '--list-tests=' + folder + '/a.json', '--results=' + folder + '/b.json'],
            'mutually exclusive'],
          [['--suite=harness', '--list-tests=' + folder + '/list.json'], 'exists already'],
          [['--suite=harness', '--results=' + folder + '/x.txt'], 'extension .json'],
          [['--suite=harness', '--list-tests=../../outside.json'], 'inside the repository'],
          [['--suite=harness', '--exact'], 'Missing value']
        ].forEach(function (c) {
          var bad = runner(c[0]);
          expect(bad.code).toBe(1);
          expect(bad.err).toContain(c[1]);
        });
        var none = runner(['--suite=harness', '--exact=no such test', '--list-tests=' + folder + '/none.json']);
        expect(none.code).toBe(1);
        expect(none.err).toContain('No tests were selected');
        var empty = runner(['--suite=harness', '--exact=no such test', '--results=' + folder + '/none.json']);
        expect(empty.code).toBe(1);
        expect(empty.out).toContain('No result file was written');
        expect(t.env.fs.readdirSync(dir).sort()).toEqual(['list.json', 'result.json']);
      });
    });
  });
})();
