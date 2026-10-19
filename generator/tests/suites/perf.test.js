// Performance (warn only) and regression hashes of generated puzzles (task T-6.2, design.md 9.1 and 9.2).
//
//  - "perf": a few cells of the table of design.md section 9.1 with few runs each. It never fails the build:
//    a cell over its p95 target is reported as a skipped test with the numbers as the reason (the full
//    measurement is the job of `node tests/perf.js`).
//  - "regression": for 20 fixed seeds and the combinations of SG.fixtures.perfTools.COMBOS, the puzzle that
//    the pipeline gives must hash to the value recorded in tests/fixtures/regression.js. This one DOES fail:
//    it is how an optimisation proves that it did not change any puzzle. After a change that is meant to
//    alter puzzles, record the new hashes with `node tests/perf.js --update-hashes` (or run this suite with
//    SG_UPDATE_HASHES=1).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var tools = SG.fixtures && SG.fixtures.perfTools;

  var SLOW = 120000;
  var PERF_RUNS = 5;
  /** The cells that the suite times: cheap enough for about 20 s, and one of every kind of variant. */
  var PERF_CELLS = ['classic4/veryEasy', 'classic9/veryEasy', 'classic9/normal', 'classic9/hard',
    'classic9/master', 'classic9/nightmare', 'diagonalX/normal', 'hyper/normal', 'jigsaw9/normal',
    'wordoku/normal', 'killer/veryEasy', 'killer/normal', 'greaterThan/normal', 'mega12/normal',
    'mega16/veryEasy', 'butterfly/veryEasy', 'samurai/veryEasy', 'flower/veryEasy', 'sohei/veryEasy'];

  function envFlag(name) {
    return typeof process !== 'undefined' && process.env && process.env[name] === '1';
  }

  // ---------------------------------------------------------------------------------------------
  // perf (warn only)
  // ---------------------------------------------------------------------------------------------

  describe('perf: generation time against design.md section 9.1 (warn only, ' + PERF_RUNS + ' runs per cell)',
    function () {
      if (!tools) {
        it('needs tests/fixtures/perf-helper.js (not loaded on this page)', function () {
          SG.test.skip('tests/fixtures/perf-helper.js is not loaded');
        });
        return;
      }

      it('every cell of the table is a variant and a level that the variant offers, and every column ' +
        'it offers has a cell', function () {
        expect(tools.cells().length).toBeGreaterThan(40);
        Object.keys(tools.PERF_TARGETS).forEach(function (variant) {
          var offered = SG.variants.get(variant).difficultySupport;
          Object.keys(tools.PERF_TARGETS[variant]).forEach(function (level) {
            expect(offered).toContain(level);
          });
          tools.TARGET_LEVELS.forEach(function (level) {
            if (offered.indexOf(level) !== -1) expect(tools.PERF_TARGETS[variant][level]).toBeGreaterThan(0);
          });
        });
      });

      var byKey = {};
      if (tools) tools.cells().forEach(function (c) { byKey[c.key] = c; });
      PERF_CELLS.forEach(function (key) {
        it(key + ': p95 within the target of design.md 9.1', function () {
          var cell = byKey[key];
          if (!cell) SG.test.skip(key + ' is not a cell of the table');
          var r = tools.measure(cell.variant, cell.level, PERF_RUNS);
          if (!(r.p95 < cell.target)) {
            SG.test.skip('WARNING ' + key + ': p95 ' + r.p95.toFixed(1) + ' ms (max ' + r.max.toFixed(1) +
              ' ms) is over the target of ' + cell.target + ' ms; warn only, see node tests/perf.js');
          }
        }, SLOW);
      });
    });

  // ---------------------------------------------------------------------------------------------
  // regression hashes
  // ---------------------------------------------------------------------------------------------

  describe('regression: puzzles of fixed seeds are unchanged (hashes of tests/fixtures/regression.js)',
    function () {
      if (!tools) {
        it('needs tests/fixtures/perf-helper.js (not loaded on this page)', function () {
          SG.test.skip('tests/fixtures/perf-helper.js is not loaded');
        });
        return;
      }

      it('the hash covers the givens, the solution, the cages, the signs, the regions and the symbols',
        function () {
          function result(variant, level, seed) {
            return SG.pipeline.run({ variantId: variant, difficulty: level, seed: seed, trace: 'off' }, null);
          }
          var base = result('classic4', 'veryEasy', 1);
          var again = result('classic4', 'veryEasy', 1);
          expect(tools.hash64(tools.serialize(again))).toBe(tools.hash64(tools.serialize(base)));
          expect(tools.hash64(tools.serialize(result('classic4', 'veryEasy', 2))))
            .not.toBe(tools.hash64(tools.serialize(base)));
          expect(tools.hash64('')).toBe('811c9dc52545f491');
          expect(tools.hash64('a')).toHaveLength(16);

          function changed(r, edit) {
            var copy = Object.assign({}, r, {
              givens: Int32Array.from(r.givens),
              solution: Int32Array.from(r.solution),
              model: Object.assign({}, r.model, { layout: Object.assign({}, r.model.layout) })
            });
            edit(copy);
            return tools.hash64(tools.serialize(copy)) !== tools.hash64(tools.serialize(r));
          }
          expect(changed(base, function (c) { c.givens[0] += 1; })).toBe(true);
          expect(changed(base, function (c) { c.solution[3] += 1; })).toBe(true);
          expect(changed(base, function (c) {
            c.model.layout.cellRegion = Int32Array.from(c.model.layout.cellRegion).fill(0);
          })).toBe(true);
          expect(changed(base, function (c) { c.model.symbols = { mode: 'x', labels: ['q'] }; })).toBe(true);

          var killer = result('killer', 'easy', 1);
          expect(killer.model.cages.length).toBeGreaterThan(0);
          expect(changed(killer, function (c) {
            c.model.cages = killer.model.cages.map(function (cage, k) {
              return k === 0 ? { cells: cage.cells, sum: cage.sum + 1, distinct: cage.distinct } : cage;
            });
          })).toBe(true);

          var gt = result('greaterThan', 'normal', 1);
          expect(gt.model.inequalities.length).toBeGreaterThan(0);
          expect(changed(gt, function (c) {
            c.model.inequalities = gt.model.inequalities.slice(1);
          })).toBe(true);
        }, SLOW);

      if (envFlag('SG_UPDATE_HASHES') && SG.test.node) {
        it('SG_UPDATE_HASHES=1: records the hashes of the current code in tests/fixtures/regression.js',
          function () {
            var node = SG.test.node;
            var file = node.path.join(node.root, 'tests', 'fixtures', 'regression.js');
            node.fs.writeFileSync(file, tools.render(tools.recordAll()));
            SG.test.skip('tests/fixtures/regression.js was rewritten from the current code; run again ' +
              'without SG_UPDATE_HASHES to check');
          }, 600000);
        return;
      }

      var recorded = SG.fixtures.regression;
      if (!recorded) {
        it('needs tests/fixtures/regression.js (not loaded or not generated yet)', function () {
          SG.test.skip('tests/fixtures/regression.js is missing: run node tests/perf.js --update-hashes');
        });
        return;
      }

      it('the fixture pins the same 20 seeds and the combinations of the helper, every variant at least once',
        function () {
          expect(recorded.seeds).toEqual(tools.SEEDS);
          expect(tools.SEEDS).toHaveLength(20);
          tools.COMBOS.forEach(function (combo) {
            expect(recorded.hashes[combo.key]).toBeTruthy();
            expect(recorded.hashes[combo.key]).toHaveLength(20);
            recorded.hashes[combo.key].forEach(function (h) { expect(/^[0-9a-f]{16}$/.test(h)).toBe(true); });
          });
          expect(Object.keys(recorded.hashes)).toHaveLength(tools.COMBOS.length);
          var pinned = {};
          tools.COMBOS.forEach(function (combo) { pinned[combo.variant] = true; });
          SG.variants.list().forEach(function (def) {
            expect(pinned[def.id]).toBe(true);
            expect(def.difficultySupport).toContain(tools.COMBOS.filter(function (c) {
              return c.variant === def.id;
            })[0].level);
          });
        });

      tools.COMBOS.forEach(function (combo) {
        it(combo.key + ': ' + tools.SEEDS.length + ' seeds give the recorded puzzles', function () {
          var expected = recorded.hashes[combo.key];
          var changed = [];
          tools.SEEDS.forEach(function (seed, i) {
            if (tools.hashOf(combo.variant, combo.level, seed) !== expected[i]) changed.push(seed);
          });
          if (changed.length > 0) {
            throw new Error(combo.key + ': the puzzle of seed ' + changed.join(', ') + ' changed (' +
              changed.length + ' of ' + tools.SEEDS.length + '). An optimisation must not change puzzles; ' +
              'if the change is meant, record it with node tests/perf.js --update-hashes');
          }
        }, SLOW);
      });
    });
})();
