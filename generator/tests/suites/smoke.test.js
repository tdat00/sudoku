// Smoke test of every variant, fast enough for the default run (the thorough sweeps are in tests/manual):
// one puzzle per variant at its easiest level and a few harder ones, checked for a unique solution and the
// requested level, and a sample of the regression hashes of tests/fixtures/regression.js.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var tools = SG.fixtures.perfTools;
  var regression = SG.fixtures.regression;

  var EXPECTED_IDS = ['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX', 'hyper',
    'jigsaw9', 'killer', 'greaterThan', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku'];
  var SLOW = 120000;

  // Cells of the regression table that take well under a second each.
  var HASHED = ['classic4/veryEasy', 'classic6/veryEasy', 'classic9/veryEasy', 'classic9/easy', 'classic9/normal',
    'diagonalX/easy', 'jigsaw9/normal', 'killer/easy', 'greaterThan/normal', 'sohei/veryEasy', 'wordoku/normal'];

  function generate(id, level, seed) {
    return SG.pipeline.run({ variantId: id, difficulty: level, seed: seed, trace: 'off' }, null,
      SG.budget.create({ ms: 100000 }));
  }

  describe('smoke: every variant makes a valid puzzle', function () {
    it('registers the 15 variants of the project', function () {
      expect(SG.variants.list().map(function (def) { return def.id; }).sort()).toEqual(EXPECTED_IDS.slice().sort());
    });

    EXPECTED_IDS.forEach(function (id) {
      it(id + ': the easiest level gives a unique puzzle of that level, unchanged since the last recording',
        function () {
          var def = SG.variants.get(id);
          var level = def.difficultySupport[0];
          var result = generate(id, level, 1);
          expect(SG.dfs.countSolutions(result.model, result.givens, 2)).toBe(1);
          for (var i = 0; i < result.givens.length; i++) {
            if (result.givens[i] !== 0) expect(result.givens[i]).toBe(result.solution[i]);
          }
          expect(result.rating.level).toBe(level);
          expect(result.rating.score).toBeGreaterThan(-1);

        }, SLOW);

      it(id + ': a level the variant does not offer is refused', function () {
        var def = SG.variants.get(id);
        var missing = SG.difficulty.LEVELS.filter(function (level) { return def.difficultySupport.indexOf(level) === -1; });
        if (missing.length === 0) return;
        var thrown = null;
        try { generate(id, missing[0], 1); } catch (e) { thrown = e; }
        expect(thrown instanceof SG.errors.GenerationError).toBe(true);
      });
    });

    HASHED.forEach(function (key) {
      it('the puzzle of ' + key + ' with the first fixed seed is unchanged (regression hash)', function () {
        var parts = key.split('/');
        var recorded = regression.hashes[key];
        expect(recorded).toBeDefined();
        var result = generate(parts[0], parts[1], regression.seeds[0]);
        expect(tools.hash64(tools.serialize(result))).toBe(recorded[0]);
      }, SLOW);
    });

    it('classic9 reaches a hard level and the same seed gives the same puzzle', function () {
      var a = generate('classic9', 'hard', 7);
      var b = generate('classic9', 'hard', 7);
      expect(a.rating.level).toBe('hard');
      expect(Array.from(a.givens).join('')).toBe(Array.from(b.givens).join(''));
      expect(SG.dfs.countSolutions(a.model, a.givens, 2)).toBe(1);
    }, SLOW);

    it('killer and greaterThan reach the normal level with their cages / signs', function () {
      var k = generate('killer', 'normal', 3);
      expect(k.rating.level).toBe('normal');
      expect(k.model.cages.length).toBeGreaterThan(0);
      var g = generate('greaterThan', 'normal', 3);
      expect(g.rating.level).toBe('normal');
      expect(g.model.inequalities.length).toBeGreaterThan(0);
    }, SLOW);
  });
})();
