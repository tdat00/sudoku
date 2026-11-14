/**
 * Lazy corpora of the manual suites (difficulty v3, MS05b3). Test tooling, not part of any application script
 * list; the manual suites and the `manual-corpus` quick suite use it. No file system, clock or hash function is
 * needed here, except in `sandbox`, which is Node only and reads what `SG.test.node` offers.
 *
 *  - SG.test.lazyCorpus(keys, build)  an object with one enumerable getter per key, in the order of `keys`:
 *    the first successful read calls `build(key, originalIndex)` once and keeps its array, every later read
 *    returns that same array, listing the keys or registering a test builds nothing, and an error of `build`
 *    propagates unchanged and publishes nothing (the next read builds again, from the start). The seed of a
 *    request comes from the original index of its key, never from the order of the reads. With SG_CORPUS_TIMES=1
 *    (Node) a key that has just been built prints the milliseconds of each of its requests.
 *  - SG.fixtures.manualCorpus         the pure helpers that read a manual suite without running it: `expose`
 *    (the source of a suite that also publishes some of its private helpers), `splitOldExtraRegions`, the
 *    request recorder `recorder`, `projectResult`, `canonical` and, in Node, `sandbox`: a second engine registry
 *    with its own harness, in which a suite is registered (to list its tests) or probed (its describe and it
 *    are no-ops, its pipeline is the recorder's), without touching the registry of the run.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.test = SG.test || {};
  SG.fixtures = SG.fixtures || {};

  var own = Object.prototype.hasOwnProperty;

  /**
   * With SG_CORPUS_TIMES=1 (Node), a key that has just been built prints the milliseconds of each of its requests
   * (`ms` of a corpus entry, `elapsedMs` of a result), so that a transcript of one level shows the time of every
   * request. Nothing else changes: the arrays, the order and the reads are the same.
   */
  function reportTimes(key, list) {
    if (typeof process === 'undefined' || !process.env || process.env.SG_CORPUS_TIMES !== '1') return;
    var ms = list.map(function (item) {
      var t = item && (typeof item.ms === 'number' ? item.ms : item.elapsedMs);
      return typeof t === 'number' ? Math.round(t) : null;
    });
    console.log('corpus ' + key + ': ' + list.length + ' requests, ms ' + JSON.stringify(ms));
  }

  function lazyCorpus(keys, build) {
    if (!Array.isArray(keys)) throw new TypeError('lazyCorpus needs the list of its keys');
    if (typeof build !== 'function') throw new TypeError('lazyCorpus needs a build function');
    var corpus = {};
    keys.forEach(function (key, index) {
      if (own.call(corpus, key)) throw new Error('lazyCorpus: the key ' + key + ' is listed twice');
      var built = false;
      var value = null;
      Object.defineProperty(corpus, key, {
        enumerable: true,
        configurable: false,
        get: function () {
          if (!built) {
            var list = build(key, index);
            if (!Array.isArray(list)) throw new TypeError('lazyCorpus: build(' + key + ') returned no array');
            reportTimes(key, list);
            value = list;
            built = true;
          }
          return value;
        }
      });
    });
    return corpus;
  }

  SG.test.lazyCorpus = lazyCorpus;

  var PROBE = '__manualCorpusProbe';

  /** JSON text with the keys of every object in order, so that equal data gives equal text. */
  function canonical(value) {
    return JSON.stringify(sorted(value));
  }

  function sorted(value) {
    if (Array.isArray(value)) return value.map(sorted);
    if (value !== null && typeof value === 'object') {
      var out = {};
      Object.keys(value).sort().forEach(function (key) { out[key] = sorted(value[key]); });
      return out;
    }
    return value;
  }

  /** Typed arrays as arrays, functions and undefined dropped: data that JSON keeps whole. */
  function plain(value) {
    if (value === undefined || typeof value === 'function') return undefined;
    if (value === null || typeof value !== 'object') return value;
    if (ArrayBuffer.isView(value)) return Array.from(value);
    if (Array.isArray(value)) {
      return value.map(function (item) {
        var kept = plain(item);
        return kept === undefined ? null : kept;
      });
    }
    var out = {};
    Object.keys(value).forEach(function (key) {
      var kept = plain(value[key]);
      if (kept !== undefined) out[key] = kept;
    });
    return out;
  }

  /**
   * The source of a manual suite with one statement more before the end of its IIFE: it publishes the private
   * names of `names` (and the fields of `extra`, given as source text) as `globalThis.__manualCorpusProbe`.
   */
  function expose(source, names, extra) {
    var end = source.lastIndexOf('})();');
    if (end === -1 || source.slice(end + 5).trim() !== '') throw new Error('the suite does not end with its IIFE');
    var fields = names.map(function (name) { return name + ': ' + name; }).concat(extra || []);
    return source.slice(0, end) + '  globalThis.' + PROBE + ' = { ' + fields.join(', ') + ' };\n' +
      source.slice(end);
  }

  /**
   * The old extra-regions suite with the body of its variant loop saved as `innerBuilder(id, variantIndex)`, so
   * that the first level of the second variant can be built without the whole first variant: reading
   * `puzzleRun()` once (and stopping its first request) leaves the old function in `innerBuilder`. Only the head
   * of the loop and one declaration change; the body stays the old text. The source is returned with LF ends.
   */
  function splitOldExtraRegions(source) {
    var text = source.replace(/\r\n/g, '\n');
    var cache = '  var runCache = null;\n';
    var loop = '      VARIANT_IDS.forEach(function (id, vi) {\n        runCache[id] = {};\n';
    if (text.split(cache).length !== 2 || text.split(loop).length !== 2) {
      throw new Error('the old variant loop of extra-regions is not where it was');
    }
    return text
      .replace(cache, cache + '  var innerBuilder = null;\n')
      .replace(loop, '      VARIANT_IDS.forEach(innerBuilder = function (id, vi) {\n        runCache[id] = {};\n');
  }

  /**
   * A stand-in for SG.pipeline.run that records every request as it was made: the configuration, whether a
   * callback was given and the time limit of the budget (`env.budgetMsOf`). It returns a plain stub, or the
   * answer of `env.delegate` (then `outcome` is 'returned' or the code of the error it threw, which is thrown
   * again unchanged).
   */
  function recorder(env) {
    env = env || {};
    var log = [];
    function run(config, emit, budget) {
      var entry = {
        n: log.length,
        config: JSON.parse(canonical(plain(config))),
        emit: emit === null || emit === undefined ? 'none' : typeof emit,
        budgetMs: budget === null || budget === undefined ? null :
          (env.budgetMsOf ? env.budgetMsOf(budget) : 'unknown'),
        outcome: 'stub'
      };
      log.push(entry);
      if (!env.delegate) return { scripted: true, ordinal: entry.n, config: entry.config };
      try {
        var result = env.delegate(config, emit, budget);
        entry.outcome = 'returned';
        return result;
      } catch (err) {
        entry.outcome = err && err.code ? err.code : 'error';
        throw err;
      }
    }
    return { run: run, log: log };
  }

  /** The request of a log entry without its position: what the ordered plan of a corpus is made of. */
  function planOf(log) {
    return log.map(function (entry) {
      return { config: entry.config, emit: entry.emit, budgetMs: entry.budgetMs };
    });
  }

  /**
   * The data of a puzzle result that decides what a corpus holds: the request, the givens, the solution, the
   * model (units, cages, inequalities, layout, symbols, fixed cells), the flags, the rating, the warnings, the
   * dig log and the work, without a clock (`timings`, `elapsedMs`, `eventCount`).
   */
  function projectResult(result) {
    var skipped = { timings: true, elapsedMs: true, eventCount: true };
    var out = {};
    Object.keys(result).sort().forEach(function (key) {
      if (!skipped[key]) out[key] = plain(result[key]);
    });
    return out;
  }

  var SOURCE_LIST = /const SOURCE_FILES = \[([\s\S]*?)\];/;
  var ENGINE_FILE = /^(?:\.\.\/core\/js\/engine|js\/engine|js\/variants|assets\/wordlists)\//;
  var SANDBOX_FIXTURES = ['../core/tests/fixtures/classic.js', '../core/tests/fixtures/techniques-helper.js',
    '../core/tests/fixtures/techniques.js', '../core/tests/fixtures/testkit.js',
    'tests/fixtures/testkit-provider.js', 'tests/fixtures/manual-corpus.js'];

  /**
   * Node only (`node` is `SG.test.node`: fs, path, vm and the generator folder). A second complete engine
   * registry in a vm context, with its own harness, the engine, the variants and the fixtures that the manual
   * suites need. Nothing of it is shared with the registry of the run.
   *
   *  - register(name, relPath)         registers the suite as the runner does, so `list` can select its tests
   *  - list(options)                   SG.test.list of that harness (suite, filter, exact)
   *  - probe(source, names, extra)     runs `expose(source, ...)` with describe, it and the hooks as no-ops and
   *                                    returns the published helpers: no test of the suite is registered or run
   *  - withRun(run, fn)                fn() with `run` as the pipeline of the sandbox, restored afterwards
   *  - realRun()                       the pipeline of the sandbox as it was loaded
   *  - load(relPath)                   evaluates one more file (fixture) of the generator folder in the sandbox
   *  - budgetMsOf(budget)              the time limit that SG.budget.create was given for this budget
   */
  function sandbox(node) {
    var read = function (rel) {
      return node.fs.readFileSync(node.path.join(node.root, rel), 'utf8').replace(/^\uFEFF/, '');
    };
    var context = node.vm.createContext({});
    var evaluate = function (rel, text) {
      node.vm.runInContext(text === undefined ? read(rel) : text, context, {
        filename: node.path.join(node.root, rel)
      });
    };
    var sources = (SOURCE_LIST.exec(read('tests/node-runner.js'))[1].match(/'[^']+'/g) || [])
      .map(function (quoted) { return quoted.slice(1, -1); });
    evaluate('../core/tests/harness.js');
    sources.filter(function (rel) { return ENGINE_FILE.test(rel); }).forEach(function (rel) { evaluate(rel); });
    SANDBOX_FIXTURES.forEach(function (rel) { evaluate(rel); });

    var inner = context.SG;
    var original = inner.pipeline.run;
    var limits = new WeakMap();
    var createBudget = inner.budget.create;
    inner.budget = Object.assign({}, inner.budget, {
      create: function (options) {
        var budget = createBudget.apply(this, arguments);
        limits.set(budget, options && typeof options.ms === 'number' ? options.ms : null);
        return budget;
      }
    });

    return {
      SG: inner,
      register: function (name, rel) {
        inner.test.setSuite(name);
        evaluate(rel);
      },
      list: function (options) { return inner.test.list(options); },
      probe: function (source, names, extra) {
        var wrapped = '(function (describe, it, beforeEach, afterEach, bench) { ' +
          expose(source, names, extra) + '\n})(__noop, __noop, __noop, __noop, __noop);';
        context.__noop = function () {};
        context.__noop.skip = context.__noop;
        try {
          evaluate('tests/manual/probe.js', wrapped);
          return context[PROBE];
        } finally {
          delete context.__noop;
          delete context[PROBE];
        }
      },
      withRun: function (run, fn) {
        var saved = inner.pipeline.run;
        inner.pipeline.run = run;
        try {
          return fn();
        } finally {
          inner.pipeline.run = saved;
        }
      },
      realRun: function () { return original; },
      load: function (rel) { evaluate(rel); },
      budgetMsOf: function (budget) { return limits.has(budget) ? limits.get(budget) : 'unknown'; }
    };
  }

  SG.fixtures.manualCorpus = {
    PROBE: PROBE,
    canonical: canonical,
    plain: plain,
    expose: expose,
    splitOldExtraRegions: splitOldExtraRegions,
    recorder: recorder,
    planOf: planOf,
    projectResult: projectResult,
    sandbox: sandbox
  };
})();
