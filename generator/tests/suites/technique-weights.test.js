// The cost table of the generator (SG.difficulty.WEIGHTS) against the technique registry of the engine:
// every registered technique needs a weight, the weights of a group follow the ladder, and the technique
// order of the registry never contradicts the weights (rating v3: the floor of a level is a prefix of it).
// The techniques themselves are tested by the shared suite core/tests/suites/techniques.test.js; a technique
// registered later is covered here without editing this file.
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

  describe('techniques: the order of the registry follows the weights (rating v3)', function () {
    var D = SG.difficulty;

    /** Asserts that no technique of the sequence is lighter than the one before it (equal is fine). */
    function expectNondecreasing(sequence) {
      sequence.forEach(function (tech, i) {
        if (i === 0) return;
        var before = sequence[i - 1];
        expect([before.id, tech.id, D.weightOf(tech.id) >= D.weightOf(before.id)])
          .toEqual([before.id, tech.id, true]);
      });
    }

    function position(id) {
      return SG.techniques.list().map(function (t) { return t.id; }).indexOf(id);
    }

    it('has no heavier technique directly before a lighter one in the actual sorted registry', function () {
      var sequence = SG.techniques.list();
      expect(sequence.length).toBe(all.length);
      expectNondecreasing(sequence);
      ['cageCombo', 'ineqChain', 'jellyfish'].forEach(function (id) {
        expect(sequence.map(function (t) { return t.id; })).toContain(id);
      });
    });

    it('has the corrected orders of the three inversions, with their weights unchanged', function () {
      var rows = { cageCombo: [44, 40], ineqChain: [46, 40], jellyfish: [137, 520] };
      Object.keys(rows).forEach(function (id) {
        expect([id, SG.techniques.get(id).order, D.WEIGHTS[id]]).toEqual([id, rows[id][0], rows[id][1]]);
      });
      expect(position('pointing')).toBeLessThan(position('cageCombo'));
      expect(position('cageCombo')).toBeLessThan(position('ineqChain'));
      expect(position('ineqChain')).toBeLessThan(position('boxLine'));
      expect(position('cageSplit')).toBeLessThan(position('jellyfish'));
      expect(position('jellyfish')).toBeLessThan(position('xyWing'));
    });

    it('keeps the calibrated tie outcomes: ineqChain over pointing, nakedQuad over ruleOf45, jellyfish ' +
      'over cageSplit', function () {
        var ties = [['ineqChain', 'pointing'], ['nakedQuad', 'ruleOf45'], ['jellyfish', 'cageSplit']];
        ties.forEach(function (p) {
          var over = p[0];
          var under = p[1];
          var counts = {};
          counts[over] = 1;
          counts[under] = 1;
          expect([over, D.weightOf(over)]).toEqual([over, D.weightOf(under)]);
          expect(SG.techniques.get(over).order).toBeGreaterThan(SG.techniques.get(under).order);
          expect([over, D.breakdown(counts, 10).hardest]).toEqual([over, over]);
        });
      });

    it('lets a tie of weight and of order fall to the smaller id and still sorts the sequence', function () {
      var ids = ['orderProbeB', 'orderProbeA'];
      try {
        ids.forEach(function (id) {
          // order 65 and weight 130 sit between nakedPair (60, 120) and hiddenPair (70, 145)
          SG.techniques.register({
            id: id, group: 'subset', baseCost: 20, order: 65, i18nKey: 'technique.' + id,
            variantScope: null, find: function () { return null; }
          });
          D.WEIGHTS[id] = 130;
        });
        var sequence = SG.techniques.list();
        expectNondecreasing(sequence);
        var names = sequence.map(function (t) { return t.id; });
        expect(names.indexOf('orderProbeA')).toBe(names.indexOf('orderProbeB') - 1);
        expect(names.indexOf('nakedPair')).toBeLessThan(names.indexOf('orderProbeA'));
        expect(names.indexOf('orderProbeB')).toBeLessThan(names.indexOf('hiddenPair'));
        expect(D.breakdown({ orderProbeA: 1, orderProbeB: 1 }, 10).hardest).toBe('orderProbeA');
      } finally {
        ids.forEach(function (id) {
          SG.techniques.unregister(id);
          delete D.WEIGHTS[id];
        });
      }
      expect(SG.techniques.list().length).toBe(all.length);
    });
  });
})();
