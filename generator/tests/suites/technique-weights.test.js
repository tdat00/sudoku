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

    it('places skyscraper between xWing and simpleColouring: order 112, weight 330, a Hard-tier technique (R11)',
      function () {
        var model = SG.techHelper.model('classic9');
        expect([SG.techniques.get('skyscraper').order, D.WEIGHTS.skyscraper]).toEqual([112, 330]);
        expect(position('xWing')).toBeLessThan(position('skyscraper'));
        expect(position('skyscraper')).toBeLessThan(position('simpleColouring'));
        expect(D.WEIGHTS.xWing).toBeLessThan(D.WEIGHTS.skyscraper);
        expect(D.WEIGHTS.skyscraper).toBeLessThan(D.WEIGHTS.simpleColouring);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ xWing: 1, skyscraper: 1 }, 10).hardest).toBe('skyscraper');
        expect(D.breakdown({ skyscraper: 1, simpleColouring: 1 }, 10).hardest).toBe('simpleColouring');
        // 1.25 x 330 is above Normal's maximum (400) and below Hard's (700)
        expect(D.spec('normal', model).allowedTechniques).not.toContain('skyscraper');
        expect(D.spec('hard', model).allowedTechniques).toContain('skyscraper');
        expect(D.spec('hard', model).tierTechniques).toContain('skyscraper');
        expect(D.spec('expert', model).floorTechniques).toContain('skyscraper');
        expect(D.spec('hard', model).floorTechniques).not.toContain('skyscraper');
      });

    it('places twoStringKite between skyscraper and simpleColouring: order 114, weight 340, a Hard-tier ' +
      'technique (R11)', function () {
        var model = SG.techHelper.model('classic9');
        expect([SG.techniques.get('twoStringKite').order, D.WEIGHTS.twoStringKite]).toEqual([114, 340]);
        expect(position('skyscraper')).toBeLessThan(position('twoStringKite'));
        expect(position('twoStringKite')).toBeLessThan(position('simpleColouring'));
        expect(D.WEIGHTS.skyscraper).toBeLessThan(D.WEIGHTS.twoStringKite);
        expect(D.WEIGHTS.twoStringKite).toBeLessThan(D.WEIGHTS.simpleColouring);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ skyscraper: 1, twoStringKite: 1 }, 10).hardest).toBe('twoStringKite');
        expect(D.breakdown({ twoStringKite: 1, simpleColouring: 1 }, 10).hardest).toBe('simpleColouring');
        // 1.25 x 340 is above Normal's maximum (400) and below Hard's (700)
        expect(D.spec('normal', model).allowedTechniques).not.toContain('twoStringKite');
        expect(D.spec('hard', model).allowedTechniques).toContain('twoStringKite');
        expect(D.spec('hard', model).tierTechniques).toContain('twoStringKite');
        expect(D.spec('expert', model).floorTechniques).toContain('twoStringKite');
        expect(D.spec('hard', model).floorTechniques).not.toContain('twoStringKite');
      });

    it('places emptyRectangle between simpleColouring and swordfish: order 124, weight 380, a Hard-tier ' +
      'technique (R11)', function () {
        var model = SG.techHelper.model('classic9');
        expect([SG.techniques.get('emptyRectangle').order, D.WEIGHTS.emptyRectangle]).toEqual([124, 380]);
        expect(position('simpleColouring')).toBeLessThan(position('emptyRectangle'));
        expect(position('emptyRectangle')).toBeLessThan(position('swordfish'));
        expect(D.WEIGHTS.simpleColouring).toBeLessThan(D.WEIGHTS.emptyRectangle);
        expect(D.WEIGHTS.emptyRectangle).toBeLessThan(D.WEIGHTS.swordfish);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ simpleColouring: 1, emptyRectangle: 1 }, 10).hardest).toBe('emptyRectangle');
        expect(D.breakdown({ emptyRectangle: 1, swordfish: 1 }, 10).hardest).toBe('swordfish');
        // 1.25 x 380 is above Normal's maximum (400) and below Hard's (700)
        expect(D.spec('normal', model).allowedTechniques).not.toContain('emptyRectangle');
        expect(D.spec('hard', model).allowedTechniques).toContain('emptyRectangle');
        expect(D.spec('hard', model).tierTechniques).toContain('emptyRectangle');
        expect(D.spec('expert', model).floorTechniques).toContain('emptyRectangle');
        expect(D.spec('hard', model).floorTechniques).not.toContain('emptyRectangle');
      });

    it('places finnedXWing between emptyRectangle and swordfish: order 126, weight 400, a Hard-tier technique ' +
      '(R12)', function () {
        var model = SG.techHelper.model('classic9');
        expect([SG.techniques.get('finnedXWing').order, D.WEIGHTS.finnedXWing]).toEqual([126, 400]);
        expect(position('emptyRectangle')).toBeLessThan(position('finnedXWing'));
        expect(position('finnedXWing')).toBeLessThan(position('swordfish'));
        expect(D.WEIGHTS.emptyRectangle).toBeLessThan(D.WEIGHTS.finnedXWing);
        expect(D.WEIGHTS.finnedXWing).toBeLessThan(D.WEIGHTS.swordfish);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ emptyRectangle: 1, finnedXWing: 1 }, 10).hardest).toBe('finnedXWing');
        expect(D.breakdown({ finnedXWing: 1, swordfish: 1 }, 10).hardest).toBe('swordfish');
        // 1.25 x 400 is above Normal's maximum (400) and below Hard's (700)
        expect(D.spec('normal', model).allowedTechniques).not.toContain('finnedXWing');
        expect(D.spec('hard', model).allowedTechniques).toContain('finnedXWing');
        expect(D.spec('hard', model).tierTechniques).toContain('finnedXWing');
        expect(D.spec('expert', model).floorTechniques).toContain('finnedXWing');
        expect(D.spec('hard', model).floorTechniques).not.toContain('finnedXWing');
      });

    it('places remotePairs between twoStringKite and simpleColouring: order 116, weight 350, a Hard-tier ' +
      'technique (R13 with RP-01 / S-OD9)', function () {
        var model = SG.techHelper.model('classic9');
        expect([SG.techniques.get('remotePairs').order, D.WEIGHTS.remotePairs]).toEqual([116, 350]);
        expect(SG.techniques.get('remotePairs').baseCost).toBe(35);
        expect(SG.techniques.get('remotePairs').group).toBe('wing');
        expect(position('twoStringKite')).toBeLessThan(position('remotePairs'));
        expect(position('remotePairs')).toBeLessThan(position('simpleColouring'));
        expect(position('remotePairs')).toBeLessThan(position('xyWing'));
        // the order follows the weight: the neighbours are 114 / 340 and 120 / 360
        expect([SG.techniques.get('twoStringKite').order, D.WEIGHTS.twoStringKite]).toEqual([114, 340]);
        expect([SG.techniques.get('simpleColouring').order, D.WEIGHTS.simpleColouring]).toEqual([120, 360]);
        expect(D.WEIGHTS.twoStringKite).toBeLessThan(D.WEIGHTS.remotePairs);
        expect(D.WEIGHTS.remotePairs).toBeLessThan(D.WEIGHTS.simpleColouring);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ twoStringKite: 1, remotePairs: 1 }, 10).hardest).toBe('remotePairs');
        expect(D.breakdown({ remotePairs: 1, simpleColouring: 1 }, 10).hardest).toBe('simpleColouring');
        // 1.25 x 350 = 437.5 is above Normal's maximum (400) and below Hard's (700)
        expect(D.spec('normal', model).allowedTechniques).not.toContain('remotePairs');
        expect(D.spec('hard', model).allowedTechniques).toContain('remotePairs');
        expect(D.spec('hard', model).tierTechniques).toContain('remotePairs');
        expect(D.spec('expert', model).floorTechniques).toContain('remotePairs');
        expect(D.spec('hard', model).floorTechniques).not.toContain('remotePairs');
        // the wing group enters the Hard tier with it; xyWing (812.5) and the rest stay above Hard's maximum
        expect(D.spec('hard', model).allowedGroups).toContain('wing');
        expect(D.spec('hard', model).allowedTechniques).not.toContain('xyWing');
      });

    it('places wxyzWing between xyzWing and wWing: order 155, weight 800, a Master-tier technique (R13)',
      function () {
        var model = SG.techHelper.model('classic9');
        expect([SG.techniques.get('wxyzWing').order, D.WEIGHTS.wxyzWing]).toEqual([155, 800]);
        expect(SG.techniques.get('wxyzWing').baseCost).toBe(57);
        expect(SG.techniques.get('wxyzWing').group).toBe('wing');
        expect(position('wxyzWing')).toBe(position('xyzWing') + 1);
        expect(position('wxyzWing')).toBe(position('wWing') - 1);
        // the order follows the weight: the neighbours are 150 / 750 and 170 / 850
        expect([SG.techniques.get('xyzWing').order, D.WEIGHTS.xyzWing]).toEqual([150, 750]);
        expect([SG.techniques.get('wWing').order, D.WEIGHTS.wWing]).toEqual([170, 850]);
        expect(D.WEIGHTS.xyzWing).toBeLessThan(D.WEIGHTS.wxyzWing);
        expect(D.WEIGHTS.wxyzWing).toBeLessThan(D.WEIGHTS.wWing);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ xyzWing: 1, wxyzWing: 1 }, 10).hardest).toBe('wxyzWing');
        expect(D.breakdown({ wxyzWing: 1, wWing: 1 }, 10).hardest).toBe('wWing');
        // 1.25 x 800 = 1000 is not below Expert's maximum (1000): Master's tier, never Expert's, while 1.25 x 750 is
        expect(1.25 * D.WEIGHTS.wxyzWing).toBe(D.spec('expert', model).max);
        expect(1.25 * D.WEIGHTS.xyzWing).toBeLessThan(D.spec('expert', model).max);
        expect(D.spec('expert', model).allowedTechniques).toContain('xyzWing');
        expect(D.spec('expert', model).allowedTechniques).not.toContain('wxyzWing');
        expect(D.spec('master', model).allowedTechniques).toContain('wxyzWing');
        expect(D.spec('master', model).tierTechniques.slice(0, 2)).toEqual(['wxyzWing', 'wWing']);
        expect(D.spec('master', model).floorTechniques).toContain('xyzWing');
        expect(D.spec('master', model).floorTechniques).not.toContain('wxyzWing');
        expect(D.spec('nightmare', model).floorTechniques).toContain('wxyzWing');
      });

    it('places bugPlusOne between uniqueRectangle and forcingChain: order 182, weight 920, a Master-tier technique ' +
      'that assumes uniqueness (R14)', function () {
        var model = SG.techHelper.model('classic9');
        expect([SG.techniques.get('bugPlusOne').order, D.WEIGHTS.bugPlusOne]).toEqual([182, 920]);
        expect(SG.techniques.get('bugPlusOne').baseCost).toBe(72);
        expect(SG.techniques.get('bugPlusOne').group).toBe('wing');
        expect(SG.techniques.get('bugPlusOne').assumesUniqueness).toBe(true);
        expect(SG.techniques.get('bugPlusOne').variantScope).toBeNull();
        expect(position('bugPlusOne')).toBe(position('uniqueRectangle') + 1);
        expect(position('bugPlusOne')).toBe(position('xyChain') - 1);
        expect(position('bugPlusOne')).toBeLessThan(position('forcingChain'));
        // the order follows the weight: the neighbours are 180 / 900 and, since MS12, 186 / 1000 (then 190 / 1100)
        expect([SG.techniques.get('uniqueRectangle').order, D.WEIGHTS.uniqueRectangle]).toEqual([180, 900]);
        expect([SG.techniques.get('xyChain').order, D.WEIGHTS.xyChain]).toEqual([186, 1000]);
        expect([SG.techniques.get('forcingChain').order, D.WEIGHTS.forcingChain]).toEqual([190, 1100]);
        expect(D.WEIGHTS.uniqueRectangle).toBeLessThan(D.WEIGHTS.bugPlusOne);
        expect(D.WEIGHTS.bugPlusOne).toBeLessThan(D.WEIGHTS.forcingChain);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ uniqueRectangle: 1, bugPlusOne: 1 }, 10).hardest).toBe('bugPlusOne');
        expect(D.breakdown({ bugPlusOne: 1, forcingChain: 1 }, 10).hardest).toBe('forcingChain');
        // 1.25 x 920 = 1150 is not below Expert's maximum (1000) and is below Master's (1500): Master's tier
        expect(1.25 * D.WEIGHTS.bugPlusOne).toBeGreaterThan(D.spec('expert', model).max);
        expect(1.25 * D.WEIGHTS.bugPlusOne).toBeLessThan(D.spec('master', model).max);
        expect(D.spec('expert', model).allowedTechniques).not.toContain('bugPlusOne');
        expect(D.spec('master', model).allowedTechniques).toContain('bugPlusOne');
        expect(D.spec('master', model).tierTechniques).toContain('bugPlusOne');
        expect(D.spec('master', model).floorTechniques).not.toContain('bugPlusOne');
        expect(D.spec('nightmare', model).floorTechniques).toContain('bugPlusOne');
        // allowed right after uniqueRectangle (the oracle's solver, which runs without the uniqueness assumption,
        // lists both and uses neither)
        expect(D.spec('master', model).allowedTechniques.indexOf('bugPlusOne'))
          .toBe(D.spec('master', model).allowedTechniques.indexOf('uniqueRectangle') + 1);
      });

    it('places xyChain between bugPlusOne and forcingChain: order 186, weight 1000, a Master-tier chain technique ' +
      'of its own group (R15)', function () {
        var model = SG.techHelper.model('classic9');
        var xy = SG.techniques.get('xyChain');
        expect([xy.order, D.WEIGHTS.xyChain]).toEqual([186, 1000]);
        expect([xy.group, xy.baseCost, xy.variantScope, xy.assumesUniqueness]).toEqual(['chain', 82, null, false]);
        expect(position('xyChain')).toBe(position('bugPlusOne') + 1);
        expect(position('xyChain')).toBe(position('forcingChain') - 1);
        // the order follows the weight: the neighbours are 182 / 920 and 190 / 1100
        expect([SG.techniques.get('bugPlusOne').order, D.WEIGHTS.bugPlusOne]).toEqual([182, 920]);
        expect([SG.techniques.get('forcingChain').order, D.WEIGHTS.forcingChain]).toEqual([190, 1100]);
        expect(D.WEIGHTS.bugPlusOne).toBeLessThan(D.WEIGHTS.xyChain);
        expect(D.WEIGHTS.xyChain).toBeLessThan(D.WEIGHTS.forcingChain);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ bugPlusOne: 1, xyChain: 1 }, 10).hardest).toBe('xyChain');
        expect(D.breakdown({ xyChain: 1, forcingChain: 1 }, 10).hardest).toBe('forcingChain');
        // 1.25 x 1000 = 1250 is above Expert's maximum (1000) and below Master's (1500): Master's tier
        expect(1.25 * D.WEIGHTS.xyChain).toBeGreaterThan(D.spec('expert', model).max);
        expect(1.25 * D.WEIGHTS.xyChain).toBeLessThan(D.spec('master', model).max);
        expect(D.spec('expert', model).allowedTechniques).not.toContain('xyChain');
        expect(D.spec('master', model).allowedTechniques).toContain('xyChain');
        expect(D.spec('master', model).tierTechniques).toContain('xyChain');
        expect(D.spec('master', model).floorTechniques).not.toContain('xyChain');
        expect(D.spec('nightmare', model).floorTechniques).toContain('xyChain');
        // allowed right after bugPlusOne
        expect(D.spec('master', model).allowedTechniques.indexOf('xyChain'))
          .toBe(D.spec('master', model).allowedTechniques.indexOf('bugPlusOne') + 1);
      });

    it('places alsXz between forcingChain and forcingChainLong: order 194, weight 1250, a Nightmare-tier chain ' +
      'technique of its own group (R18)', function () {
        var model = SG.techHelper.model('classic9');
        var als = SG.techniques.get('alsXz');
        expect([als.order, D.WEIGHTS.alsXz]).toEqual([194, 1250]);
        expect([als.group, als.baseCost, als.variantScope, als.assumesUniqueness])
          .toEqual(['chain', 106, null, false]);
        expect(position('alsXz')).toBe(position('forcingChain') + 1);
        expect(position('alsXz')).toBe(position('sueDeCoq') - 1);
        // the order follows the weight and the base cost: the neighbours are 190 / 1100 / 90 and 198 / 1400 / 118
        // (Sue de Coq, 196, sits between ALS-XZ and the long chain since MS16)
        var short = SG.techniques.get('forcingChain');
        var long = SG.techniques.get('forcingChainLong');
        expect([short.order, D.WEIGHTS.forcingChain, short.baseCost]).toEqual([190, 1100, 90]);
        expect([long.order, D.WEIGHTS.forcingChainLong, long.baseCost]).toEqual([198, 1400, 118]);
        expect(short.order).toBeLessThan(als.order);
        expect(als.order).toBeLessThan(long.order);
        expect(D.WEIGHTS.forcingChain).toBeLessThan(D.WEIGHTS.alsXz);
        expect(D.WEIGHTS.alsXz).toBeLessThan(D.WEIGHTS.forcingChainLong);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ forcingChain: 1, alsXz: 1 }, 10).hardest).toBe('alsXz');
        expect(D.breakdown({ alsXz: 1, forcingChainLong: 1 }, 10).hardest).toBe('forcingChainLong');
        // 1.25 x 1250 = 1562.5 is above Master's maximum (1500) and below Nightmare's (2400): Nightmare's tier
        expect(1.25 * D.WEIGHTS.alsXz).toBeGreaterThan(D.spec('master', model).max);
        expect(1.25 * D.WEIGHTS.alsXz).toBeLessThan(D.spec('nightmare', model).max);
        expect(D.spec('master', model).allowedTechniques).not.toContain('alsXz');
        expect(D.spec('nightmare', model).allowedTechniques).toContain('alsXz');
        expect(D.spec('nightmare', model).tierTechniques).toContain('alsXz');
        expect(D.spec('nightmare', model).floorTechniques).not.toContain('alsXz');
        expect(D.spec('hell1', model).floorTechniques).toContain('alsXz');
        // allowed right after forcingChain
        expect(D.spec('nightmare', model).allowedTechniques.indexOf('alsXz'))
          .toBe(D.spec('nightmare', model).allowedTechniques.indexOf('forcingChain') + 1);
      });

    it('places sueDeCoq between alsXz and forcingChainLong: order 196, weight 1300, base cost 112, a ' +
      'Nightmare-tier chain technique of its own group (R19)', function () {
        var model = SG.techHelper.model('classic9');
        var sue = SG.techniques.get('sueDeCoq');
        expect([sue.order, D.WEIGHTS.sueDeCoq]).toEqual([196, 1300]);
        expect([sue.group, sue.baseCost, sue.variantScope, sue.assumesUniqueness])
          .toEqual(['chain', 112, null, false]);
        expect(position('sueDeCoq')).toBe(position('alsXz') + 1);
        expect(position('sueDeCoq')).toBe(position('forcingChainLong') - 1);
        // the order follows the weight and the base cost: the neighbours are 194 / 1250 / 106 and
        // 198 / 1400 / 118
        var als = SG.techniques.get('alsXz');
        var long = SG.techniques.get('forcingChainLong');
        expect([als.order, D.WEIGHTS.alsXz, als.baseCost]).toEqual([194, 1250, 106]);
        expect([long.order, D.WEIGHTS.forcingChainLong, long.baseCost]).toEqual([198, 1400, 118]);
        expect(als.order).toBeLessThan(sue.order);
        expect(sue.order).toBeLessThan(long.order);
        expect(als.baseCost).toBeLessThan(sue.baseCost);
        expect(sue.baseCost).toBeLessThan(long.baseCost);
        expect(D.WEIGHTS.alsXz).toBeLessThan(D.WEIGHTS.sueDeCoq);
        expect(D.WEIGHTS.sueDeCoq).toBeLessThan(D.WEIGHTS.forcingChainLong);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ alsXz: 1, sueDeCoq: 1 }, 10).hardest).toBe('sueDeCoq');
        expect(D.breakdown({ sueDeCoq: 1, forcingChainLong: 1 }, 10).hardest).toBe('forcingChainLong');
        // 1.25 x 1300 = 1625 is above Master's maximum (1500) and below Nightmare's (2400): Nightmare's tier
        expect(1.25 * D.WEIGHTS.sueDeCoq).toBeGreaterThan(D.spec('master', model).max);
        expect(1.25 * D.WEIGHTS.sueDeCoq).toBeLessThan(D.spec('nightmare', model).max);
        expect(D.spec('master', model).allowedTechniques).not.toContain('sueDeCoq');
        expect(D.spec('nightmare', model).allowedTechniques).toContain('sueDeCoq');
        expect(D.spec('nightmare', model).tierTechniques).toContain('sueDeCoq');
        expect(D.spec('nightmare', model).floorTechniques).not.toContain('sueDeCoq');
        expect(D.spec('hell1', model).floorTechniques).toContain('sueDeCoq');
        // allowed right after alsXz
        expect(D.spec('nightmare', model).allowedTechniques.indexOf('sueDeCoq'))
          .toBe(D.spec('nightmare', model).allowedTechniques.indexOf('alsXz') + 1);
      });

    it('places finnedSwordfish between swordfish and jellyfish: order 134, weight 480, a Hard-tier technique ' +
      '(R12)', function () {
        var model = SG.techHelper.model('classic9');
        expect([SG.techniques.get('finnedSwordfish').order, D.WEIGHTS.finnedSwordfish]).toEqual([134, 480]);
        expect(SG.techniques.get('finnedSwordfish').baseCost).toBe(48);
        expect(position('swordfish')).toBeLessThan(position('finnedSwordfish'));
        expect(position('finnedSwordfish')).toBeLessThan(position('cageSplit'));
        expect(position('finnedSwordfish')).toBeLessThan(position('jellyfish'));
        expect(D.WEIGHTS.swordfish).toBeLessThan(D.WEIGHTS.finnedSwordfish);
        expect(D.WEIGHTS.finnedSwordfish).toBeLessThan(D.WEIGHTS.jellyfish);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ swordfish: 1, finnedSwordfish: 1 }, 10).hardest).toBe('finnedSwordfish');
        expect(D.breakdown({ finnedSwordfish: 1, jellyfish: 1 }, 10).hardest).toBe('jellyfish');
        // 1.25 x 480 is above Normal's maximum (400) and below Hard's (700)
        expect(D.spec('normal', model).allowedTechniques).not.toContain('finnedSwordfish');
        expect(D.spec('hard', model).allowedTechniques).toContain('finnedSwordfish');
        expect(D.spec('hard', model).tierTechniques).toContain('finnedSwordfish');
        expect(D.spec('expert', model).floorTechniques).toContain('finnedSwordfish');
        expect(D.spec('hard', model).floorTechniques).not.toContain('finnedSwordfish');
      });

    it('places lawOfLeftovers between nakedTriple and hiddenTriple: order 87, weight 200, a Normal-tier technique of ' +
      'the locked group that only Jigsaw has (R17)', function () {
        var jigsaw = SG.techHelper.model('jigsaw9');
        var classic = SG.techHelper.model('classic9');
        var def = SG.techniques.get('lawOfLeftovers');
        expect([def.order, D.WEIGHTS.lawOfLeftovers]).toEqual([87, 200]);
        expect([def.group, def.baseCost, def.variantScope, def.assumesUniqueness])
          .toEqual(['locked', 20, ['jigsaw9'], false]);
        expect(position('nakedTriple')).toBeLessThan(position('lawOfLeftovers'));
        expect(position('lawOfLeftovers')).toBe(position('hiddenTriple') - 1);
        // the order follows the weight: the neighbours are 80 / 180 and 90 / 220 (minMaxForcing, 85 / 180, is
        // Greater-Than's)
        expect([SG.techniques.get('nakedTriple').order, D.WEIGHTS.nakedTriple]).toEqual([80, 180]);
        expect([SG.techniques.get('minMaxForcing').order, D.WEIGHTS.minMaxForcing]).toEqual([85, 180]);
        expect([SG.techniques.get('hiddenTriple').order, D.WEIGHTS.hiddenTriple]).toEqual([90, 220]);
        expect(D.WEIGHTS.nakedTriple).toBeLessThan(D.WEIGHTS.lawOfLeftovers);
        expect(D.WEIGHTS.lawOfLeftovers).toBeLessThan(D.WEIGHTS.hiddenTriple);
        // its own weight decides the hardest technique, no tie is needed
        expect(D.breakdown({ nakedTriple: 1, lawOfLeftovers: 1 }, 10).hardest).toBe('lawOfLeftovers');
        expect(D.breakdown({ lawOfLeftovers: 1, hiddenTriple: 1 }, 10).hardest).toBe('hiddenTriple');
        // 1.25 x 200 = 250 is above Easy's maximum (180) and below Normal's (400): Normal's tier, on Jigsaw boards
        expect(1.25 * D.WEIGHTS.lawOfLeftovers).toBeGreaterThan(D.spec('easy', jigsaw).max);
        expect(1.25 * D.WEIGHTS.lawOfLeftovers).toBeLessThan(D.spec('normal', jigsaw).max);
        expect(D.spec('easy', jigsaw).allowedTechniques).not.toContain('lawOfLeftovers');
        expect(D.spec('normal', jigsaw).allowedTechniques).toContain('lawOfLeftovers');
        expect(D.spec('normal', jigsaw).tierTechniques).toContain('lawOfLeftovers');
        expect(D.spec('normal', jigsaw).floorTechniques).not.toContain('lawOfLeftovers');
        expect(D.spec('hard', jigsaw).floorTechniques).toContain('lawOfLeftovers');
        // allowed right after nakedTriple (registry order)
        var allowed = D.spec('normal', jigsaw).allowedTechniques;
        expect(allowed.indexOf('lawOfLeftovers')).toBe(allowed.indexOf('nakedTriple') + 1);
        // and on no other variant
        ['easy', 'normal', 'hard', 'master', 'nightmare'].forEach(function (level) {
          expect([level, D.spec(level, classic).allowedTechniques.indexOf('lawOfLeftovers')]).toEqual([level, -1]);
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
