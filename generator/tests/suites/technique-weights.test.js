// The cost table of the generator (SG.difficulty.WEIGHTS) against the technique registry of the engine: every
// registered technique needs a weight, and the weights of a group follow the ladder. The techniques themselves are
// tested by the shared suite core/tests/suites/techniques.test.js; a technique registered later is covered here
// without editing this file.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;

  var all = SG.techniques.list();

  describe('techniques: the weight table of SG.difficulty', function () {
    it('covers every registered technique (add a WEIGHTS entry for a new technique)', function () {
      var missing = all.filter(function (t) {
        return !Object.prototype.hasOwnProperty.call(SG.difficulty.WEIGHTS, t.id);
      }).map(function (t) { return t.id; });
      expect(missing).toEqual([]);
      Object.keys(SG.difficulty.WEIGHTS).forEach(function (id) {
        expect(SG.techniques.has(id)).toBe(true);
        expect(SG.difficulty.WEIGHTS[id]).toBeGreaterThan(0);
      });
    });

    it('puts the techniques of a group in the ladder in the order of their weights', function () {
      SG.techniques.GROUPS.forEach(function (group) {
        var weights = all.filter(function (t) { return t.group === group; }).map(function (t) {
          return SG.difficulty.weightOf(t.id);
        });
        for (var i = 1; i < weights.length; i++) expect(weights[i]).toBeGreaterThan(weights[i - 1]);
      });
    });
  });
})();
