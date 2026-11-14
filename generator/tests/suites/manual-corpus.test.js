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

    /** fn with a scripted pipeline (or the real one with `real`): its value, the log and the plan of the requests. */
    function recorded(fn, real) {
      var rec = MC.recorder({ budgetMsOf: box.budgetMsOf, delegate: real ? box.realRun() : null });
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

    function topLevel(b, level) {
      return b.SG.difficulty.levelIndex(level) >= b.SG.difficulty.levelIndex('expert');
    }

    // The seeded plan of each adapter, written from the task's table, not from the code under test.
    var ADAPTERS = [
      {
        name: 'killer', file: 'killer.test.js', names: ['corpus', 'corpusOf'], trace: 'off', emit: 'none',
        groups: function () { return [{ id: 'killer', vi: 0 }]; },
        count: function (b, g, level) { return topLevel(b, level) ? 8 : 20; },
        seed: function (g, li, i) { return i + 1; },
        read: function (p, g, level) { return p.corpusOf(level); },
        all: function (p) { return p.corpus(); }
      },
      {
        name: 'jigsaw', file: 'jigsaw.test.js', names: ['puzzleRun'], trace: 'off', emit: 'none',
        groups: function () { return [{ id: 'jigsaw9', vi: 0 }]; },
        count: function (b, g, level) { return level === 'hell2' ? 8 : 20; },
        seed: function (g, li, i) { return 700 + li * 100 + i; },
        read: function (p, g, level) { return p.puzzleRun()[level]; },
        all: function (p) { return p.puzzleRun(); }
      },
      {
        name: 'greater-than', file: 'greater-than.test.js', names: ['puzzleRun', 'allPuzzles'], trace: 'summary',
        emit: 'function',
        groups: function () { return [{ id: 'greaterThan', vi: 0 }]; },
        count: function (b, g, level) { return ['veryEasy', 'easy', 'normal'].indexOf(level) !== -1 ? 20 : 10; },
        seed: function (g, li, i) { return 100 * (li + 1) + i; },
        read: function (p, g, level) { return p.puzzleRun()[level]; },
        all: function (p) { return p.allPuzzles(); }
      },
      {
        name: 'extra-regions', file: 'extra-regions.test.js', names: ['puzzleRun', 'allPuzzles'], trace: 'summary',
        emit: 'function',
        groups: function () { return [{ id: 'diagonalX', vi: 0 }, { id: 'hyper', vi: 1 }]; },
        count: function (b, g, level) { return level === 'hell2' ? 8 : 20; },
        seed: function (g, li, i) { return 10000 * (g.vi + 1) + 100 * li + i; },
        read: function (p, g, level) { return p.puzzleRun()[g.id][level]; },
        all: function (p, g) { return p.allPuzzles(g.id); }
      },
      {
        name: 'wordoku', file: 'wordoku.test.js', names: ['puzzleRun', 'allPuzzles'], trace: 'summary',
        emit: 'function',
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
        levelsOf(b, g.id).forEach(function (level, li) { keys.push({ g: g, level: level, li: li }); });
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
            var levels = levelsOf(b, g.id);
            var picks = [Math.floor(levels.length / 2), levels.length - 1, 0].filter(function (li, at, all) {
              return all.indexOf(li) === at;
            });
            picks.forEach(function (li) {
              var first = recorded(function () { return a.read(p, g, levels[li]); });
              expect(first.plan).toEqual(planOfKey(a, b, g, levels[li], li));
              expect(first.value).toHaveLength(a.count(b, g, levels[li]));
              var again = recorded(function () { return a.read(p, g, levels[li]); });
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
          });
          expect(aggregate.plan).toEqual(wholePlan(a, b, keys));
          expect(aggregate.value).toHaveLength(wholePlan(a, b, keys).length);
        });

        it('reading the levels in their natural order makes the plan of the whole corpus, and the aggregate no ' +
          'request', function () {
          var b = sandbox();
          var p = probeOf(a.file, a.names);
          var keys = keysOf(a, b);
          var reads = recorded(function () { keys.forEach(function (k) { a.read(p, k.g, k.level); }); });
          expect(reads.plan).toEqual(wholePlan(a, b, keys));
          var aggregate = recorded(function () {
            return a.groups(b).reduce(function (all, g) { return all.concat(flatten(a.all(p, g))); }, []);
          });
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
            var reads = recorded(function () { reverse.forEach(function (k) { a.read(p, k.g, k.level); }); });
            // Each key is built in one piece with its own original index: the log is the keys in reading order.
            expect(reads.plan).toEqual(wholePlan(a, b, reverse));
            var aggregate = recorded(function () {
              return a.groups(b).reduce(function (all, g) { return all.concat(flatten(a.all(p, g))); }, []);
            });
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
        var changed = recorded(function () { return a.read(p, a.groups(b)[0], 'normal'); });
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

      var PLAIN = [
        { suite: 'killer', id: 'killer', count: function (b, level) { return topLevel(b, level) ? 8 : 20; },
          tests: ['I5:'] },
        { suite: 'jigsaw', id: 'jigsaw9', count: function (b, level) { return level === 'hell2' ? 8 : 20; },
          tests: ['I5:', 'CV6:'] },
        { suite: 'greater-than', id: 'greaterThan', count: function (b, level) {
          return ['veryEasy', 'easy', 'normal'].indexOf(level) !== -1 ? 20 : 10;
        }, tests: ['I5:', 'CV6:'] },
        { suite: 'wordoku', id: 'wordoku', count: function () { return 20; }, tests: ['I5:', 'CV6:'] }
      ];

      PLAIN.forEach(function (entry) {
        it(entry.suite + ': "> <level>: <count> puzzles > I5:" selects one test per level', function () {
          var b = registry();
          var levels = levelsOf(b, entry.id);
          expect(levels.length).toBeGreaterThan(7);
          levels.forEach(function (level) {
            entry.tests.forEach(function (name) {
              expectOne(entry.suite, '> ' + level + ': ' + entry.count(b, level) + ' puzzles > ' + name, name);
            });
          });
        });
      });

      it('extra-regions: "> <variant> <level>: <count> puzzles > I5:" selects one test per variant and level',
        function () {
          var b = registry();
          ['diagonalX', 'hyper'].forEach(function (id) {
            levelsOf(b, id).forEach(function (level) {
              ['I5:', 'CV6:'].forEach(function (name) {
                var count = level === 'hell2' ? 8 : 20;
                expectOne('extra-regions', '> ' + id + ' ' + level + ': ' + count + ' puzzles > ' + name, name);
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
  });
})();
