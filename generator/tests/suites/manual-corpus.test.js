// The lazy corpora of the manual suites (difficulty v3, MS05b3): `SG.test.lazyCorpus` and the six adapters that use
// it (the corpus of killer, jigsaw, greater-than, extra-regions and wordoku, and the per-level corpus of the
// variants sweep). Nothing here runs a manual suite or generates a puzzle of its corpora: each manual suite is
// read in memory in a registry of its own (SG.fixtures.manualCorpus.sandbox, Node only) with a scripted pipeline,
// so the seeded plans, the isolation of a level and the eager aggregate are checked on the real adapter code, and
// the full names of its tests are listed (SG.test.list) to show that each selector of the early gates picks one.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var MC = SG.fixtures.manualCorpus;
  var NODE = SG.test.node;

  /** The boards of the variants sweep with the smaller volume (two puzzles per level instead of three). */
  var HEAVY = ['samurai', 'sohei', 'flower', 'mega16', 'butterfly'];
  var CYCLE = ['diagonal', 'diagonal', 'row', 'column'];

  describe('manual corpora: SG.test.lazyCorpus', function () {
    function counting(keys) {
      var calls = [];
      var corpus = SG.test.lazyCorpus(keys, function (key, index) {
        calls.push([key, index]);
        return [key + ':' + index];
      });
      return { corpus: corpus, calls: calls };
    }

    it('lists its keys in order without building any of them', function () {
      var c = counting(['a', 'b', 'c']);
      expect(Object.keys(c.corpus)).toEqual(['a', 'b', 'c']);
      expect('b' in c.corpus).toBe(true);
      expect(Object.getOwnPropertyDescriptor(c.corpus, 'b').enumerable).toBe(true);
      expect(c.calls).toEqual([]);
    });

    it('builds a key once with its original index, whatever the order of the first reads', function () {
      var c = counting(['a', 'b', 'c']);
      expect(c.corpus.b).toEqual(['b:1']);
      expect(c.corpus.a).toEqual(['a:0']);
      expect(c.corpus.b).toEqual(['b:1']);
      expect(c.calls).toEqual([['b', 1], ['a', 0]]);
    });

    it('returns the same array on every read', function () {
      var c = counting(['a', 'b']);
      expect(c.corpus.a).toBe(c.corpus.a);
      expect(c.calls).toHaveLength(1);
    });

    it('builds every key when the whole corpus is read, in the original order', function () {
      var c = counting(['a', 'b', 'c']);
      var seen = Object.keys(c.corpus).map(function (key) { return c.corpus[key][0]; });
      expect(seen).toEqual(['a:0', 'b:1', 'c:2']);
      expect(c.calls).toEqual([['a', 0], ['b', 1], ['c', 2]]);
    });

    it('lets an error propagate unchanged and publishes nothing: the next read builds again', function () {
      var failure = new Error('the second puzzle failed');
      var attempts = 0;
      var corpus = SG.test.lazyCorpus(['a'], function () {
        var partial = [1];
        attempts++;
        if (attempts === 1) {
          partial.push(2);
          throw failure;
        }
        partial.push(3);
        return partial;
      });
      var thrown = null;
      try { void corpus.a; } catch (e) { thrown = e; }
      expect(thrown).toBe(failure);
      expect(corpus.a).toEqual([1, 3]);
      expect(corpus.a).toBe(corpus.a);
      expect(attempts).toBe(2);
    });

    it('refuses a key listed twice, a build function that is missing and a build that returns no array',
      function () {
        expect(function () { SG.test.lazyCorpus(['a', 'a'], function () { return []; }); }).toThrow();
        expect(function () { SG.test.lazyCorpus(['a']); }).toThrow();
        expect(function () { SG.test.lazyCorpus('a', function () { return []; }); }).toThrow();
        var corpus = SG.test.lazyCorpus(['a'], function () { return null; });
        expect(function () { return corpus.a; }).toThrow();
      });
  });

  describe('manual corpora: the adapters of the manual suites, read in memory (Node only)', function () {
    var box = null;

    function sandbox() {
      if (!NODE || !NODE.fs || !NODE.vm || !NODE.path) SG.test.skip('needs Node (fs and vm); skipped in the browser');
      if (box === null) box = MC.sandbox(NODE);
      return box;
    }

    function sourceOf(file) {
      return NODE.fs.readFileSync(NODE.path.join(NODE.root, 'tests/manual/' + file), 'utf8').replace(/^\uFEFF/, '');
    }

    function probeOf(file, names, extra) {
      return sandbox().probe(sourceOf(file), names, extra);
    }

    /**
     * A scripted pipeline that refuses what the real one refuses (`SG.pipeline.normalizeConfig`): a request whose
     * level its variant does not offer at the moment of the call. Every other request returns the plain stub, so a
     * request for a level that qualification hides passes only inside the per-call `withRequestedLevel` guard.
     */
    function checkedRun(b) {
      return function (config) {
        var def = b.SG.variants.get(config.variantId);
        if (def.difficultySupport.indexOf(config.difficulty) === -1) {
          throw new b.SG.errors.GenerationError('difficulty.unsupportedLevel',
            { level: config.difficulty, variantId: config.variantId });
        }
        return { scripted: true, config: JSON.parse(MC.canonical(MC.plain(config))) };
      };
    }

    /**
     * fn with a scripted pipeline (`real`: the real one; 'checked': the scripted one that refuses a level the
     * variant does not offer): its value, the log and the plan of the requests.
     */
    function recorded(fn, real) {
      var delegate = real === true ? box.realRun() : (real === 'checked' ? checkedRun(box) : null);
      var rec = MC.recorder({ budgetMsOf: box.budgetMsOf, delegate: delegate });
      var value = box.withRun(rec.run, fn);
      return { value: value, log: rec.log, plan: MC.planOf(rec.log) };
    }

    function flatten(value) {
      if (Array.isArray(value)) return value;
      return Object.keys(value).reduce(function (all, key) { return all.concat(value[key]); }, []);
    }

    function configOf(puzzle) {
      return (puzzle.result && puzzle.result.config) || puzzle.config;
    }

    function levelsOf(b, id) {
      return b.SG.variants.get(id).difficultySupport.slice();
    }

    // The fixed diagnostic ladders of the five suites, written from the task's table (MS18c): the corpus of a suite
    // keeps its pre-qualification levels, whatever the variant offers now. Killer, jigsaw, greater-than and
    // extra-regions have nine; wordoku has eight. The `variants` sweep has no fixed ladder: its corpus is the offered
    // levels of each variant.
    var NINE = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];
    var EIGHT = NINE.slice(0, 8);

    /** The levels of the corpus of an adapter for a group, in the order of the original global index. */
    function ladderOf(a, b, g) {
      return a.ladder ? a.ladder.slice() : levelsOf(b, g.id);
    }

    function topLevel(b, level) {
      return b.SG.difficulty.levelIndex(level) >= b.SG.difficulty.levelIndex('expert');
    }

    // The seeded plan of each adapter, written from the task's table, not from the code under test. `li` is the
    // original global index of the level in the ladder of the adapter, never a position in the filtered offers.
    var ADAPTERS = [
      {
        name: 'killer', file: 'killer.test.js', names: ['corpus', 'corpusOf'], trace: 'off', emit: 'none',
        ladder: NINE,
        groups: function () { return [{ id: 'killer', vi: 0 }]; },
        count: function (b, g, level) { return topLevel(b, level) ? 8 : 20; },
        seed: function (g, li, i) { return i + 1; },
        read: function (p, g, level) { return p.corpusOf(level); },
        all: function (p) { return p.corpus(); }
      },
      {
        name: 'jigsaw', file: 'jigsaw.test.js', names: ['puzzleRun'], trace: 'off', emit: 'none',
        ladder: NINE,
        groups: function () { return [{ id: 'jigsaw9', vi: 0 }]; },
        count: function (b, g, level) { return level === 'hell2' ? 8 : 20; },
        seed: function (g, li, i) { return 700 + li * 100 + i; },
        read: function (p, g, level) { return p.puzzleRun()[level]; },
        all: function (p) { return p.puzzleRun(); }
      },
      {
        name: 'greater-than', file: 'greater-than.test.js', names: ['puzzleRun', 'allPuzzles'], trace: 'summary',
        emit: 'function', ladder: NINE,
        groups: function () { return [{ id: 'greaterThan', vi: 0 }]; },
        count: function (b, g, level) { return ['veryEasy', 'easy', 'normal'].indexOf(level) !== -1 ? 20 : 10; },
        seed: function (g, li, i) { return 100 * (li + 1) + i; },
        read: function (p, g, level) { return p.puzzleRun()[level]; },
        all: function (p) { return p.allPuzzles(); }
      },
      {
        name: 'extra-regions', file: 'extra-regions.test.js', names: ['puzzleRun', 'allPuzzles'], trace: 'summary',
        emit: 'function', ladder: NINE,
        groups: function () { return [{ id: 'diagonalX', vi: 0 }, { id: 'hyper', vi: 1 }]; },
        count: function (b, g, level) { return level === 'hell2' ? 8 : 20; },
        seed: function (g, li, i) { return 10000 * (g.vi + 1) + 100 * li + i; },
        read: function (p, g, level) { return p.puzzleRun()[g.id][level]; },
        all: function (p, g) { return p.allPuzzles(g.id); }
      },
      {
        name: 'wordoku', file: 'wordoku.test.js', names: ['puzzleRun', 'allPuzzles'], trace: 'summary',
        emit: 'function', ladder: EIGHT,
        groups: function () { return [{ id: 'wordoku', vi: 0 }]; },
        count: function () { return 20; },
        seed: function (g, li, i) { return 100 * (li + 1) + i; },
        options: function (i) { return { placement: CYCLE[i % 4] }; },
        read: function (p, g, level) { return p.puzzleRun()[level]; },
        all: function (p) { return p.allPuzzles(); }
      },
      {
        name: 'variants (CV3)', file: 'variants.test.js', names: ['contextOf'], trace: 'off', emit: 'none',
        budgetMs: 240000,
        groups: function (b) {
          return b.SG.variants.list().map(function (def, vi) { return { id: def.id, vi: vi }; });
        },
        count: function (b, g) { return HEAVY.indexOf(g.id) !== -1 ? 2 : 3; },
        seed: function (g, li, i) { return i + 1; },
        read: function (p, g, level) { return p.contextOf(box.SG.variants.get(g.id)).corpusOf(level); },
        all: function (p, g) { return p.contextOf(box.SG.variants.get(g.id)).corpus(); }
      }
    ];

    function planOfKey(a, b, g, level, li) {
      var out = [];
      for (var i = 0; i < a.count(b, g, level); i++) {
        var config = { variantId: g.id, difficulty: level, seed: a.seed(g, li, i), trace: a.trace };
        if (a.options) config.variantOptions = a.options(i);
        out.push({ config: config, emit: a.emit, budgetMs: a.budgetMs === undefined ? null : a.budgetMs });
      }
      return out;
    }

    /** Every (group, level, original index) of an adapter in the natural order. */
    function keysOf(a, b) {
      var keys = [];
      a.groups(b).forEach(function (g) {
        ladderOf(a, b, g).forEach(function (level, li) { keys.push({ g: g, level: level, li: li }); });
      });
      return keys;
    }

    function wholePlan(a, b, keys) {
      return keys.reduce(function (all, k) { return all.concat(planOfKey(a, b, k.g, k.level, k.li)); }, []);
    }

    ADAPTERS.forEach(function (a) {
      describe(a.name, function () {
        it('reads one key alone: only its own seeded requests, once', function () {
          var b = sandbox();
          var p = probeOf(a.file, a.names);
          a.groups(b).forEach(function (g) {
            var levels = ladderOf(a, b, g);
            var picks = [Math.floor(levels.length / 2), levels.length - 1, 0].filter(function (li, at, all) {
              return all.indexOf(li) === at;
            });
            picks.forEach(function (li) {
              var first = recorded(function () { return a.read(p, g, levels[li]); }, 'checked');
              expect(first.plan).toEqual(planOfKey(a, b, g, levels[li], li));
              expect(first.value).toHaveLength(a.count(b, g, levels[li]));
              var again = recorded(function () { return a.read(p, g, levels[li]); }, 'checked');
              expect(again.log).toHaveLength(0);
              expect(again.value).toBe(first.value);
            });
          });
        });

        it('the aggregate read alone builds every key, in the original order', function () {
          var b = sandbox();
          var p = probeOf(a.file, a.names);
          var keys = keysOf(a, b);
          var aggregate = recorded(function () {
            return a.groups(b).reduce(function (all, g) { return all.concat(flatten(a.all(p, g))); }, []);
          }, 'checked');
          expect(aggregate.plan).toEqual(wholePlan(a, b, keys));
          expect(aggregate.value).toHaveLength(wholePlan(a, b, keys).length);
        });

        it('reading the levels in their natural order makes the plan of the whole corpus, and the aggregate no ' +
          'request', function () {
          var b = sandbox();
          var p = probeOf(a.file, a.names);
          var keys = keysOf(a, b);
          var reads = recorded(function () { keys.forEach(function (k) { a.read(p, k.g, k.level); }); }, 'checked');
          expect(reads.plan).toEqual(wholePlan(a, b, keys));
          var aggregate = recorded(function () {
            return a.groups(b).reduce(function (all, g) { return all.concat(flatten(a.all(p, g))); }, []);
          }, 'checked');
          expect(aggregate.log).toHaveLength(0);
          expect(aggregate.value.map(function (puzzle) { return configOf(puzzle); }))
            .toEqual(wholePlan(a, b, keys).map(function (entry) { return entry.config; }));
        });

        it('reading the levels in the reverse order gives the same plan per key and the same aggregate',
          function () {
            var b = sandbox();
            var p = probeOf(a.file, a.names);
            var keys = keysOf(a, b);
            var reverse = keys.slice().reverse();
            var reads = recorded(function () { reverse.forEach(function (k) { a.read(p, k.g, k.level); }); }, 'checked');
            // Each key is built in one piece with its own original index: the log is the keys in reading order.
            expect(reads.plan).toEqual(wholePlan(a, b, reverse));
            var aggregate = recorded(function () {
              return a.groups(b).reduce(function (all, g) { return all.concat(flatten(a.all(p, g))); }, []);
            }, 'checked');
            expect(aggregate.log).toHaveLength(0);
            expect(aggregate.value.map(function (puzzle) { return configOf(puzzle); }))
              .toEqual(wholePlan(a, b, keys).map(function (entry) { return entry.config; }));
          });
      });
    });

    it('would notice a changed seed: the plan of a probe of greater-than with another seed formula differs',
      function () {
        var b = sandbox();
        var a = ADAPTERS[2];
        var source = sourceOf(a.file).replace('100 * (li + 1) + i', '100 * li + i');
        expect(source).not.toBe(sourceOf(a.file));
        var p = b.probe(source, a.names);
        var changed = recorded(function () { return a.read(p, a.groups(b)[0], 'normal'); }, 'checked');
        expect(changed.plan).not.toEqual(planOfKey(a, b, a.groups(b)[0], 'normal', 2));
      });

    describe('the variants sweep: CV3 per level, the refusals, the eager aggregate', function () {
      var NAMES = ['contextOf', 'volumeOf', 'CHECKS', 'checkSupportedLevel', 'checkUnsupportedLevels',
        'checkLevels'];

      function fresh() {
        var b = sandbox();
        return { b: b, p: probeOf('variants.test.js', NAMES) };
      }

      it('keeps one CV3 entry in CHECKS, the aggregate of the supported-level and refusal helpers', function () {
        var f = fresh();
        var cv3 = f.p.CHECKS.filter(function (check) { return check.id === 'CV3'; });
        expect(cv3).toHaveLength(1);
        expect(cv3[0].run).toBe(f.p.checkLevels);
        expect(f.p.CHECKS.map(function (check) { return check.id; }))
          .toEqual(['CV0', 'CV1', 'CV2', 'CV3', 'CV4', 'CV5', 'CV6', 'CV7']);
      });

      it('generates just the seeds 1..perLevel of one supported level, and none again on a second check',
        function () {
          var f = fresh();
          var def = f.b.SG.variants.get('classic6');
          expect(def.difficultySupport).toEqual(['veryEasy', 'hard']);
          var ctx = f.p.contextOf(def);
          var first = recorded(function () { f.p.checkSupportedLevel(def, ctx, 'hard'); }, true);
          expect(first.plan).toEqual([1, 2, 3].map(function (seed) {
            return { config: { variantId: 'classic6', difficulty: 'hard', seed: seed, trace: 'off' }, emit: 'none',
              budgetMs: 240000 };
          }));
          expect(first.log.map(function (entry) { return entry.outcome; })).toEqual(['returned', 'returned',
            'returned']);
          var again = recorded(function () { f.p.checkSupportedLevel(def, ctx, 'hard'); }, true);
          expect(again.log).toHaveLength(0);
        });

      it('fills the remaining levels when the whole corpus is read, and returns every array', function () {
        var f = fresh();
        var def = f.b.SG.variants.get('classic6');
        var ctx = f.p.contextOf(def);
        var one = recorded(function () { return ctx.corpusOf('veryEasy'); }, true);
        expect(one.log).toHaveLength(3);
        var rest = recorded(function () { return ctx.corpus(); }, true);
        expect(rest.plan.map(function (entry) { return entry.config.difficulty; })).toEqual(['hard', 'hard', 'hard']);
        expect(Object.keys(rest.value)).toEqual(['veryEasy', 'hard']);
        expect(rest.value.veryEasy).toBe(one.value);
        expect(rest.value.hard).toHaveLength(3);
        expect(function () { ctx.corpusOf('expert'); }).toThrow();
      });

      it('refuses the unsupported levels without any corpus: no supported puzzle is generated', function () {
        var f = fresh();
        var def = f.b.SG.variants.get('classic9');
        var missing = f.b.SG.difficulty.LEVELS.filter(function (level) {
          return def.difficultySupport.indexOf(level) === -1;
        });
        expect(missing.length).toBeGreaterThan(0);
        var run = recorded(function () { f.p.checkUnsupportedLevels(def); }, true);
        expect(run.plan.map(function (entry) { return entry.config.difficulty; })).toEqual(missing);
        expect(run.log.map(function (entry) { return entry.outcome; })).toEqual(missing.map(function () {
          return 'difficulty.unsupportedLevel';
        }));
        var allLevels = f.b.SG.variants.get('flower');
        var none = recorded(function () { f.p.checkUnsupportedLevels(allLevels); }, true);
        expect(none.log.length).toBe(f.b.SG.difficulty.LEVELS.length - allLevels.difficultySupport.length);
      });

      it('checks every per-puzzle assertion before the aggregate "none of N puzzles hit it" failure', function () {
        var f = fresh();
        var def = f.b.SG.variants.get('classic4');
        var level = def.difficultySupport[0];
        var real = f.b.realRun();
        function failing(warnings) {
          return function (config, emit, budget) {
            var result = real(config, emit, budget);
            result.exact = false;
            result.warnings = warnings;
            return result;
          };
        }
        function message(run) {
          var ctx = f.p.contextOf(Object.assign({}, def, { id: def.id }));
          try {
            f.b.withRun(run, function () { f.p.checkSupportedLevel(def, ctx, level); });
          } catch (e) {
            return String(e.message);
          }
          return '';
        }
        // A miss without its warning is a per-puzzle failure, reported before the aggregate one.
        expect(message(failing([]))).not.toMatch('none of');
        expect(message(failing([]))).not.toBe('');
        // A complete miss in the level of the request: the warnings are right, and the aggregate check fails.
        expect(message(failing(['difficulty.approximate', 'difficulty.shallow'])))
          .toBe('classic4 veryEasy: none of 3 puzzles hit it');
      });

      it('keeps the cache-before-floor-change regression: corpus() has generated everything first', function () {
        var f = fresh();
        var SGB = f.b.SG;
        var sweep = SGB.test.variantSweep;
        var floor = { value: 0 };
        var def = {
          id: 'sweepMoving', i18nKey: 'variant.sweepMoving', group: 'test', digits: 4,
          difficultySupport: ['veryEasy'], defaultSymbolMode: 'digits', symbolModes: ['digits'], options: [],
          build: function () { return SGB.fixtures.models.boxGrid('sweepMoving', 2, 2); },
          clueFloor: function () { return floor.value; }
        };
        SGB.variants.register(def);
        try {
          var registered = SGB.variants.get('sweepMoving');
          var ctx = f.p.contextOf(registered);
          var filled = recorded(function () { ctx.corpus(); }, true);
          expect(filled.log).toHaveLength(f.p.volumeOf(registered).perLevel);
          floor.value = 16;
          var swept = recorded(function () { return sweep.sweepVariant(registered, { only: ['CV4'] }); }, true);
          expect(swept.value.results.CV4.status).toBe('fail');
          expect(swept.value.results.CV4.message).toMatch('I6');
          expect(swept.log).toHaveLength(0);
        } finally {
          SGB.variants.unregister('sweepMoving');
        }
      });

      it('still answers sweepVariant(def, { only: ["CV3"] }) with one verdict for all levels', function () {
        var f = fresh();
        var SGB = f.b.SG;
        var sweep = SGB.test.variantSweep;
        var def = SGB.variants.get('classic6');
        var swept = recorded(function () { return sweep.sweepVariant(def, { only: ['CV3'] }); }, true);
        expect(Object.keys(swept.value.results)).toEqual(['CV3']);
        expect(swept.value.results.CV3).toEqual({ status: 'pass', message: '' });
        expect(swept.value.failures).toEqual([]);
        // Six puzzles of the two supported levels, then the seven refusals, which return nothing.
        var outcomes = swept.log.map(function (entry) { return entry.outcome; });
        expect(outcomes.slice(0, 6)).toEqual(['returned', 'returned', 'returned', 'returned', 'returned',
          'returned']);
        expect(outcomes.slice(6)).toEqual(SGB.difficulty.LEVELS.filter(function (level) {
          return def.difficultySupport.indexOf(level) === -1;
        }).map(function () { return 'difficulty.unsupportedLevel'; }));
        expect(swept.plan.slice(0, 6).map(function (entry) { return entry.config.difficulty; }))
          .toEqual(['veryEasy', 'veryEasy', 'veryEasy', 'hard', 'hard', 'hard']);
      });
    });

    describe('the selectors of the early gates pick exactly one test', function () {
      var SUITES = ['killer', 'jigsaw', 'greater-than', 'extra-regions', 'wordoku', 'variants'];

      function registry() {
        var b = sandbox();
        if (!b.registered) {
          SUITES.forEach(function (name) { b.register(name, 'tests/manual/' + name + '.test.js'); });
          b.registered = true;
        }
        return b;
      }

      function select(suite, filter) {
        var listing = registry().list({ suite: suite, filter: filter });
        expect(listing.registrationErrors).toEqual([]);
        return listing.tests;
      }

      function expectOne(suite, filter, mustHave) {
        var tests = select(suite, filter);
        if (tests.length !== 1) throw new Error(filter + ' selects ' + tests.length + ' tests of ' + suite);
        expect(tests[0].fullName.toLowerCase()).toContain(mustHave.toLowerCase());
        expect(tests[0].skipped).toBe(false);
      }

      // The published levels of each suite (docs/difficulty-rating/qualification.md), written from the task's table:
      // only they have a public per-level registration (MS18c); the other levels of the fixed ladder have none.
      var PLAIN = [
        { suite: 'killer', id: 'killer', published: ['veryEasy', 'easy', 'normal'], ladder: NINE,
          count: function (b, level) { return topLevel(b, level) ? 8 : 20; }, tests: ['I5:'] },
        { suite: 'jigsaw', id: 'jigsaw9', published: ['veryEasy', 'easy', 'normal', 'hard', 'master', 'hell2'],
          ladder: NINE, count: function (b, level) { return level === 'hell2' ? 8 : 20; },
          tests: ['I5:', 'CV6:'] },
        { suite: 'greater-than', id: 'greaterThan', published: ['veryEasy', 'easy', 'hard', 'master', 'hell2'],
          ladder: NINE, count: function (b, level) {
            return ['veryEasy', 'easy', 'normal'].indexOf(level) !== -1 ? 20 : 10;
          }, tests: ['I5:', 'CV6:'] },
        { suite: 'wordoku', id: 'wordoku', published: ['veryEasy', 'easy', 'hard', 'expert', 'master', 'nightmare'],
          ladder: EIGHT, count: function () { return 20; }, tests: ['I5:', 'CV6:'] }
      ];

      PLAIN.forEach(function (entry) {
        it(entry.suite + ': "> <level>: <count> puzzles > I5:" selects one test per published level, none ' +
          'for a hidden one', function () {
          var b = registry();
          expect(levelsOf(b, entry.id)).toEqual(entry.published);
          entry.ladder.forEach(function (level) {
            entry.tests.forEach(function (name) {
              var filter = '> ' + level + ': ' + entry.count(b, level) + ' puzzles > ' + name;
              if (entry.published.indexOf(level) !== -1) expectOne(entry.suite, filter, name);
              else expect(select(entry.suite, filter)).toHaveLength(0);
            });
          });
        });
      });

      it('extra-regions: "> <variant> <level>: <count> puzzles > I5:" selects one test per variant and published ' +
        'level, none for a hidden one', function () {
        var b = registry();
        var published = ['veryEasy', 'normal', 'hard', 'master', 'nightmare', 'hell2'];
        ['diagonalX', 'hyper'].forEach(function (id) {
          expect(levelsOf(b, id)).toEqual(published);
          NINE.forEach(function (level) {
            ['I5:', 'CV6:'].forEach(function (name) {
              var count = level === 'hell2' ? 8 : 20;
              var filter = '> ' + id + ' ' + level + ': ' + count + ' puzzles > ' + name;
              if (published.indexOf(level) !== -1) expectOne('extra-regions', filter, name);
              else expect(select('extra-regions', filter)).toHaveLength(0);
            });
          });
        });
      });

      it('the boundary prefix matters: "easy: 20 puzzles > I5:" also matches Very Easy, the prefixed form does not',
        function () {
          expect(select('killer', 'easy: 20 puzzles > I5:')).toHaveLength(2);
          expect(select('killer', '> easy: 20 puzzles > I5:')).toHaveLength(1);
          expect(select('killer', '> EASY: 20 puzzles > i5:')).toHaveLength(1);
          expect(select('wordoku', '> veryEasy: 20 puzzles > I5:')).toHaveLength(1);
        });

      it('killer keeps one corpus-wide CV6 test and no per-level CV6; its I5 is registered once per level',
        function () {
          expect(select('killer', '> normal: 20 puzzles > CV6:')).toHaveLength(0);
          expect(select('killer', 'CV6: the 95th percentile')).toHaveLength(1);
          var b = registry();
          expect(select('killer', 'I5:')).toHaveLength(levelsOf(b, 'killer').length);
        });

      it('variants: "> variants: <id> > CV3 <level>:" and "CV3 unsupported:" select one test each', function () {
        var b = registry();
        var defs = b.SG.variants.list();
        expect(defs.length).toBeGreaterThanOrEqual(15);
        defs.forEach(function (def) {
          def.difficultySupport.forEach(function (level) {
            expectOne('variants', '> variants: ' + def.id + ' > CV3 ' + level + ':', 'CV3 ' + level + ':');
          });
          expectOne('variants', '> variants: ' + def.id + ' > CV3 unsupported:', 'CV3 unsupported:');
          // The old aggregate registration is gone: the level tests and the refusals are all of its CV3.
          expect(select('variants', '> variants: ' + def.id + ' > CV3')).toHaveLength(def.difficultySupport.length + 1);
        });
        expect(select('variants', 'CV3 puzzles at every supported level')).toHaveLength(0);
        expect(select('variants', '> variants: classic9 > CV3 easy:')).toHaveLength(1);
      });
    });

    describe('the fixed diagnostic corpora keep their ladder, seeds and guard (MS18c)', function () {
      var FIVE = ADAPTERS.slice(0, 5);
      var PUBLISHED = {
        killer: ['veryEasy', 'easy', 'normal'],
        jigsaw: ['veryEasy', 'easy', 'normal', 'hard', 'master', 'hell2'],
        'greater-than': ['veryEasy', 'easy', 'hard', 'master', 'hell2'],
        'extra-regions': ['veryEasy', 'normal', 'hard', 'master', 'nightmare', 'hell2'],
        wordoku: ['veryEasy', 'easy', 'hard', 'expert', 'master', 'nightmare']
      };

      function range(first, n) {
        var out = [];
        for (var i = 0; i < n; i++) out.push(first + i);
        return out;
      }

      function supportArrays(b) {
        var out = {};
        b.SG.variants.list().forEach(function (def) { out[def.id] = def.difficultySupport; });
        return out;
      }

      function expectSame(b, before) {
        Object.keys(before).forEach(function (id) {
          expect(b.SG.variants.get(id).difficultySupport).toBe(before[id]);
        });
      }

      it('lists the fixed ladder and the published levels of every suite: killer and extra-regions nine, ' +
        'wordoku eight, and no corpus is built by reading the lazy keys', function () {
        var b = sandbox();
        FIVE.forEach(function (a) {
          var p = probeOf(a.file, ['LEVELS', 'PUBLISHED'].concat(a.names));
          expect(p.LEVELS).toEqual(a.ladder);
          expect(p.PUBLISHED).toEqual(PUBLISHED[a.name]);
          expect(levelsOf(b, a.groups(b)[0].id)).toEqual(PUBLISHED[a.name]);
          if (a.name !== 'killer') {
            var listed = recorded(function () {
              var corpus = p.puzzleRun();
              return a.name === 'extra-regions'
                ? { diagonalX: Object.keys(corpus.diagonalX), hyper: Object.keys(corpus.hyper) }
                : Object.keys(corpus);
            }, 'checked');
            expect(listed.log).toHaveLength(0);
            expect(listed.value).toEqual(a.name === 'extra-regions'
              ? { diagonalX: a.ladder, hyper: a.ladder } : a.ladder);
          }
        });
        expect(NINE).toHaveLength(9);
        expect(EIGHT).toHaveLength(8);
      });

      it('builds every hidden level inside the per-call guard: the requested tuple, no unsupported-level error, ' +
        'the very support array put back, and an unguarded request still refused', function () {
        var b = sandbox();
        var before = supportArrays(b);
        FIVE.forEach(function (a) {
          var p = probeOf(a.file, a.names);
          a.groups(b).forEach(function (g) {
            var hidden = ladderOf(a, b, g).filter(function (level) {
              return levelsOf(b, g.id).indexOf(level) === -1;
            });
            expect(hidden.length).toBeGreaterThan(0);
            hidden.forEach(function (level) {
              var run = recorded(function () { return a.read(p, g, level); }, 'checked');
              expect(run.log).toHaveLength(a.count(b, g, level));
              run.log.forEach(function (entry) {
                expect(entry.outcome).toBe('returned');
                expect(entry.config.variantId).toBe(g.id);
                expect(entry.config.difficulty).toBe(level);
              });
              expectSame(b, before);
            });
            var refused = null;
            try {
              recorded(function () {
                return b.SG.pipeline.run({ variantId: g.id, difficulty: hidden[0], seed: 1, trace: 'off' }, null);
              }, 'checked');
            } catch (err) {
              refused = err;
            }
            expect(refused).not.toBeNull();
            expect(refused.code).toBe('difficulty.unsupportedLevel');
            expectSame(b, before);
          });
        });
      });

      it('puts the exact support array back when a build throws, and publishes nothing of that level',
        function () {
          var b = sandbox();
          var before = supportArrays(b);
          FIVE.forEach(function (a) {
            var p = probeOf(a.file, a.names);
            var g = a.groups(b)[0];
            var level = ladderOf(a, b, g).filter(function (name) {
              return levelsOf(b, g.id).indexOf(name) === -1;
            })[0];
            var boom = new Error('boom');
            expect(function () {
              b.withRun(function () { throw boom; }, function () { return a.read(p, g, level); });
            }).toThrow('boom');
            expectSame(b, before);
            var again = recorded(function () { return a.read(p, g, level); }, 'checked');
            expect(again.log).toHaveLength(a.count(b, g, level));
            expectSame(b, before);
          });
        });

      it('would notice an unguarded build: a probe of greater-than without its guard is refused for a hidden ' +
        'level and not for an offered one', function () {
        var b = sandbox();
        var a = ADAPTERS[2];
        var guard = "return SG.fixtures.toolRecords.withRequestedLevel('greaterThan', level, fn).value;";
        var source = sourceOf(a.file).replace(guard, 'return fn();');
        expect(source).not.toBe(sourceOf(a.file));
        var p = b.probe(source, a.names);
        var g = a.groups(b)[0];
        var refused = null;
        try {
          recorded(function () { return a.read(p, g, 'normal'); }, 'checked');
        } catch (err) {
          refused = err;
        }
        expect(refused).not.toBeNull();
        expect(refused.code).toBe('difficulty.unsupportedLevel');
        expect(recorded(function () { return a.read(p, g, 'easy'); }, 'checked').log).toHaveLength(20);
      });

      it('keeps the witness populations of the cross-level assertions: Greater-Than 20 + 10 + 10, Killer Hard ' +
        'and Master, Wordoku Normal seed 302, and the hybrid of 72 requests', function () {
        var b = sandbox();
        var gt = ADAPTERS[2];
        var pg = probeOf(gt.file, gt.names);
        var g = gt.groups(b)[0];
        var used = recorded(function () {
          return ['normal', 'hard', 'master'].map(function (level) { return gt.read(pg, g, level); });
        }, 'checked');
        expect(used.plan.map(function (e) { return e.config.difficulty + ':' + e.config.seed; })).toEqual(
          range(300, 20).map(function (s) { return 'normal:' + s; })
            .concat(range(400, 10).map(function (s) { return 'hard:' + s; }))
            .concat(range(600, 10).map(function (s) { return 'master:' + s; })));

        var killer = ADAPTERS[0];
        var pk = probeOf(killer.file, killer.names);
        var k = killer.groups(b)[0];
        var hardMaster = recorded(function () {
          return [killer.read(pk, k, 'hard'), killer.read(pk, k, 'master')];
        }, 'checked');
        expect(hardMaster.plan.map(function (e) { return e.config.difficulty + ':' + e.config.seed; })).toEqual(
          range(1, 20).map(function (s) { return 'hard:' + s; })
            .concat(range(1, 8).map(function (s) { return 'master:' + s; })));
        expect(hardMaster.value[0][0].seed).toBe(1);
        expect(hardMaster.value[0][0].result.config.seed).toBe(1);
        expect(hardMaster.value[1][0].seed).toBe(1);
        expect(hardMaster.value[1][0].result.config.difficulty).toBe('master');

        var word = ADAPTERS[4];
        var pw = probeOf(word.file, word.names);
        var normal = recorded(function () { return word.read(pw, word.groups(b)[0], 'normal'); }, 'checked');
        expect(normal.value).toHaveLength(20);
        expect(normal.value[2].config).toEqual({ variantId: 'wordoku', difficulty: 'normal', seed: 302,
          trace: 'summary', variantOptions: { placement: 'row' } });

        var ph = probeOf('extra-regions.test.js', ['hybridRun']);
        var hybrid = recorded(function () { return ph.hybridRun(); }, 'checked');
        expect(hybrid.plan).toHaveLength(72);
        hybrid.plan.forEach(function (entry, n) {
          var li = Math.floor(n / 8);
          var i = n % 8;
          var viaHyper = i % 2 === 1;
          expect(entry.config).toEqual({
            variantId: viaHyper ? 'hyper' : 'diagonalX', difficulty: NINE[li], seed: 50000 + 100 * li + i,
            trace: 'summary', variantOptions: viaHyper ? { withDiagonals: true } : { withHyper: true }
          });
        });
        expect(hybrid.plan.filter(function (e) {
          return e.config.difficulty !== 'veryEasy' && e.config.difficulty !== 'easy';
        })).toHaveLength(56);
      });
    });

    describe('the performance table and its smoke cells follow the published offers (MS18c)', function () {
      // The table of design.md 9.1 as it was before the final qualification, one row per variant, the nine levels
      // in order (null: never offered). The offered cells keep these numbers; the 39 hidden ones lose theirs.
      var OLD = {
        classic4: [10, null, null, null, null, null, null, null, null],
        classic6: [10, null, null, 350, null, null, null, null, null],
        classic9: [60, 150, 150, 400, 400, 900, 2500, 2500, null],
        diagonalX: [80, 200, 200, 500, 500, 1200, 3000, 3000, 3000],
        hyper: [80, 200, 200, 500, 500, 1200, 3000, 3000, 5000],
        jigsaw9: [150, 350, 350, 900, 900, 2000, 5000, 5000, 5000],
        wordoku: [100, 250, 250, 600, 600, 1500, 1500, 2500, null],
        killer: [300, 700, 700, 1800, 10000, 10000, 10000, 10000, 10000],
        greaterThan: [300, 700, 700, 6000, 10000, 10000, 10000, 10000, 10000],
        mega12: [400, 1000, 1000, 3000, 3000, 3000, 3000, 4500, 16000],
        mega16: [1500, 4000, 4000, 10000, 10000, 10000, 10000, 10000, 10000],
        butterfly: [1000, 3000, 3000, 8000, 8000, 8000, 8000, 8000, 15000],
        samurai: [3000, 8000, 8000, 20000, 20000, 20000, 20000, 20000, 30000],
        flower: [3000, 8000, 8000, 20000, 20000, 20000, 20000, 20000, 20000],
        sohei: [3000, 8000, 8000, 20000, 20000, 20000, 20000, 20000, 20000]
      };
      var SMOKE_BEFORE = ['classic4/veryEasy', 'classic9/veryEasy', 'classic9/normal', 'classic9/hard',
        'classic9/master', 'classic9/nightmare', 'diagonalX/normal', 'hyper/normal', 'jigsaw9/normal',
        'wordoku/normal', 'killer/veryEasy', 'killer/normal', 'greaterThan/normal', 'mega12/normal',
        'mega16/veryEasy', 'butterfly/veryEasy', 'samurai/veryEasy', 'flower/veryEasy', 'sohei/veryEasy'];

      it('has one positive, unchanged target for each of the 79 offered cells of the registry and none for the ' +
        '56 others (39 removed, 17 never offered)', function () {
        var tools = SG.fixtures.perfTools;
        if (!tools) SG.test.skip('tests/fixtures/perf-helper.js is not loaded');
        var offered = [];
        var removed = 0;
        var never = 0;
        SG.variants.list().forEach(function (def) {
          SG.difficulty.LEVELS.forEach(function (level, i) {
            var key = def.id + '/' + level;
            var target = tools.PERF_TARGETS[def.id][level];
            if (def.difficultySupport.indexOf(level) !== -1) {
              offered.push(key);
              expect([key, target]).toEqual([key, OLD[def.id][i]]);
              expect(OLD[def.id][i]).toBeGreaterThan(0);
            } else {
              expect([key, target]).toEqual([key, undefined]);
              if (OLD[def.id][i] === null) never++;
              else removed++;
            }
          });
        });
        expect(SG.variants.list()).toHaveLength(15);
        expect(offered).toHaveLength(79);
        expect([removed, never]).toEqual([39, 17]);
        var cells = tools.cells().map(function (c) { return c.key; });
        expect(cells).toHaveLength(79);
        expect(cells.slice().sort()).toEqual(offered.slice().sort());
      });

      it('keeps 19 unique smoke cells, all active, with exactly two substitutions: greaterThan/normal to ' +
        'greaterThan/easy and wordoku/normal to wordoku/easy', function () {
        var tools = SG.fixtures.perfTools;
        if (!tools) SG.test.skip('tests/fixtures/perf-helper.js is not loaded');
        var p = probeOf('perf.test.js', ['PERF_CELLS']);
        var expected = SMOKE_BEFORE.map(function (key) {
          if (key === 'greaterThan/normal') return 'greaterThan/easy';
          return key === 'wordoku/normal' ? 'wordoku/easy' : key;
        });
        expect(p.PERF_CELLS).toEqual(expected);
        expect(new Set(p.PERF_CELLS).size).toBe(19);
        var active = {};
        tools.cells().forEach(function (c) { active[c.key] = true; });
        p.PERF_CELLS.forEach(function (key) { expect([key, active[key] === true]).toEqual([key, true]); });
      });
    });
  });
})();
