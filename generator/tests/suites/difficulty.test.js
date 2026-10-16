// Difficulty scoring and the difficulty-bounded digger (tasks T-2.7, T-2.8 and the checks of T-2.10).
// Covers the acceptance criteria of those tasks and the invariants I1-I6 of design.md section 15.3 (I7, the
// soundness of every technique, is swept over the registry in techniques.test.js and once more on every
// generated puzzle here).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var D = SG.difficulty;
  var LEVELS = D.LEVELS;
  var model9 = SG.variants.get('classic9').build({}, null);
  var model6 = SG.variants.get('classic6').build({}, null);
  var model4 = SG.variants.get('classic4').build({}, null);

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
  }

  function idx(level) {
    return D.levelIndex(level);
  }

  function clueCount(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] !== 0) n++;
    return n;
  }

  function parse(text) {
    return SG.fixtures.classic.parse(text.replace(/\./g, '0'));
  }

  /** The technique ids a level lets the oracle use, solved with the uniqueness-free solver of the digger. */
  function solvesWithin(model, givens, level) {
    return SG.logicalSolver.solve(model, givens, {
      allowedTechniques: D.spec(level, model).allowedTechniques,
      collectSteps: false,
      assumeUniqueness: false
    }).solved;
  }

  /** A solver report as SG.logicalSolver would build it, for given counts and empty cells. */
  function fakeReport(counts, empties, solved) {
    var scoring = SG.logicalSolver.SCORING;
    var score = empties * scoring.emptyCellBonus;
    Object.keys(counts).forEach(function (id) {
      score += SG.techniques.get(id).baseCost * (counts[id] - 1 + scoring.firstUseMultiplier);
    });
    return {
      solved: solved !== false,
      status: solved === false ? 'stuck' : 'solved',
      techniqueCounts: counts,
      score: score
    };
  }

  /** Runs fn with cost overrides and always restores the table. */
  function withCosts(overrides, fn) {
    var saved = {};
    Object.keys(overrides).forEach(function (id) {
      saved[id] = Object.prototype.hasOwnProperty.call(D.COSTS, id) ? D.COSTS[id] : undefined;
      if (overrides[id] === undefined) delete D.COSTS[id];
      else D.COSTS[id] = overrides[id];
    });
    try {
      return fn();
    } finally {
      Object.keys(saved).forEach(function (id) {
        if (saved[id] === undefined) delete D.COSTS[id];
        else D.COSTS[id] = saved[id];
      });
    }
  }

  // ---------------------------------------------------------------------------------------------
  // T-2.7: levels and specifications
  // ---------------------------------------------------------------------------------------------

  describe('difficulty: levels', function () {
    it('lists the six levels, easiest first, and rejects anything else', function () {
      expect(LEVELS).toEqual(['veryEasy', 'easy', 'medium', 'hard', 'expert', 'evil']);
      LEVELS.forEach(function (level, i) { expect(idx(level)).toBe(i); });
      expectCode(function () { D.levelIndex('impossible'); }, 'difficulty.unknownLevel');
      expectCode(function () { D.spec('impossible', model9); }, 'difficulty.unknownLevel');
    });

    it('agrees with the list that the variant registry validates difficultySupport against', function () {
      var classic9 = SG.variants.get('classic9');
      expect(classic9.difficultySupport).toEqual(LEVELS);
    });
  });

  describe('difficulty: spec(level, model) for classic9', function () {
    var specs = LEVELS.map(function (level) { return D.spec(level, model9); });

    it('returns the fields of design.md section 13.7', function () {
      specs.forEach(function (spec, i) {
        expect(spec.level).toBe(LEVELS[i]);
        ['min', 'max', 'minClues', 'maxClues', 'minCluesPerUnit', 'extraPasses'].forEach(function (key) {
          expect(typeof spec[key]).toBe('number');
        });
        expect(Array.isArray(spec.allowedTechniques)).toBe(true);
        expect(Array.isArray(spec.allowedGroups)).toBe(true);
        expect(SG.symmetry.KINDS).toContain(spec.symmetryDefault);
      });
      expect(specs[0].symmetryDefault).toBe('rotational180');
    });

    it('has score bands that tile the scale: from 0, touching, with an open top', function () {
      expect(specs[0].min).toBe(0);
      for (var i = 0; i + 1 < specs.length; i++) {
        expect(specs[i].max).toBe(specs[i + 1].min);
        expect(specs[i].min).toBeLessThan(specs[i].max);
      }
      expect(specs[5].max).toBe(Infinity);
    });

    it('keeps the design clue ranges of section 6.7', function () {
      var ranges = [[40, 50], [34, 40], [29, 34], [25, 30], [22, 27], [17, 24]];
      specs.forEach(function (spec, i) {
        expect([spec.minClues, spec.maxClues]).toEqual(ranges[i]);
      });
    });

    it('allows the groups of the design table, cumulatively', function () {
      var base = ['basic', 'locked', 'subset', 'fish', 'wing', 'chain'];
      specs.forEach(function (spec, i) {
        base.forEach(function (group, g) {
          expect(spec.allowedGroups.indexOf(group) !== -1).toBe(g <= i);
        });
      });
    });

    it('lists exactly the registered techniques of the allowed groups, in ladder order', function () {
      specs.forEach(function (spec) {
        var expected = SG.techniques.list().filter(function (t) {
          return spec.allowedGroups.indexOf(t.group) !== -1 && SG.techniques.appliesTo(t, 'classic9');
        }).map(function (t) { return t.id; });
        expect(spec.allowedTechniques).toEqual(expected);
      });
      expect(specs[0].allowedTechniques).toEqual(['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine']);
      expect(specs[1].allowedTechniques).toContain('pointing');
      expect(specs[1].allowedTechniques).toContain('boxLine');
      expect(specs[2].allowedTechniques).toContain('nakedQuad');
      expect(specs[3].allowedTechniques).toContain('xWing');
      expect(specs[4].allowedTechniques).toContain('xyWing');
      expect(specs[5].allowedTechniques).toContain('nishio');
    });

    it('uses the technique-bounded oracle up to expert and the DFS oracle for evil', function () {
      expect(specs.map(function (s) { return s.oracle; })).toEqual(
        ['techniques', 'techniques', 'techniques', 'techniques', 'techniques', 'unique']);
    });

    it('never offers a technique that is scoped to another variant', function () {
      var temp = SG.techniques.register({
        id: 'testKillerOnly', group: 'basic', baseCost: 2, order: 15, i18nKey: 'technique.testKillerOnly',
        variantScope: ['killer'], find: function () { return null; }
      });
      try {
        expect(temp.id).toBe('testKillerOnly');
        expect(D.spec('veryEasy', model9).allowedTechniques).not.toContain('testKillerOnly');
        expect(D.spec('evil', model9).allowedTechniques).not.toContain('testKillerOnly');
      } finally {
        SG.techniques.unregister('testKillerOnly');
      }
    });

    it('asks for fewer clues per unit on boards with fewer digits, never for more', function () {
      expect(specs.map(function (s) { return s.minCluesPerUnit; })).toEqual([2, 2, 1, 1, 0, 0]);
      LEVELS.forEach(function (level, i) {
        if (SG.variants.get('classic6').difficultySupport.indexOf(level) === -1) return;
        expect(D.spec(level, model6).minCluesPerUnit).toBeLessThanOrEqual(specs[i].minCluesPerUnit);
      });
    });
  });

  describe('difficulty: spec scales with the board and respects difficultySupport', function () {
    it('multiplies the score band and the clue range by cellCount / 81', function () {
      var scale = 36 / 81;
      // A 6x6 box grid with an unregistered id supports every level, medium included.
      var board6 = SG.fixtures.models.boxGrid('boxGrid6', 2, 3);
      LEVELS.slice(0, 3).forEach(function (level) {
        var big = D.spec(level, model9);
        var small = D.spec(level, board6);
        expect(small.min).toBeCloseTo(big.min * scale, 9);
        if (big.max !== Infinity) expect(small.max).toBeCloseTo(big.max * scale, 9);
        expect(small.scale).toBeCloseTo(scale, 12);
        expect(small.minClues).toBe(Math.max(1, Math.floor(big.minClues * scale)));
        expect(small.maxClues).toBe(Math.max(1, Math.round(big.maxClues * scale)));
        if (level !== 'medium') expect(D.spec(level, model6).minClues).toBe(small.minClues);
      });
    });

    it('scales the bands of a samurai board in the proportion 369 / 81', function () {
      var samurai = SG.fixtures.models.samurai();
      expect(samurai.cellCount).toBe(369);
      var ratio = 369 / 81;
      LEVELS.forEach(function (level) {
        var base = D.spec(level, model9);
        var spec = D.spec(level, samurai);
        expect(spec.min).toBeCloseTo(base.min * ratio, 9);
        if (base.max !== Infinity) expect(spec.max).toBeCloseTo(base.max * ratio, 9);
        else expect(spec.max).toBe(Infinity);
        expect(spec.minClues).toBe(Math.floor(base.minClues * ratio));
        expect(spec.maxClues).toBe(Math.round(base.maxClues * ratio));
      });
      expect(D.spec('hard', samurai).min).toBeCloseTo(D.TABLE[3].min * 369 / 81, 9);
    });

    it('throws for a level the variant does not support (evil on classic4)', function () {
      expectCode(function () { D.spec('evil', model4); }, 'difficulty.unsupportedLevel');
      expectCode(function () { D.spec('hard', model4); }, 'difficulty.unsupportedLevel');
      expectCode(function () { D.spec('evil', model6); }, 'difficulty.unsupportedLevel');
      expectCode(function () { D.spec('medium', model6); }, 'difficulty.unsupportedLevel');
      expect(D.spec('easy', model4).level).toBe('easy');
      expect(D.spec('easy', model6).level).toBe('easy');
    });

    it('isSupported follows the variant definition; unknown variants support every level', function () {
      LEVELS.forEach(function (level) {
        expect(D.isSupported(level, model9)).toBe(true);
        expect(D.isSupported(level, model4)).toBe(['veryEasy', 'easy'].indexOf(level) !== -1);
        expect(D.isSupported(level, SG.fixtures.models.samurai())).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Clue floor per variant (D1): `clueFloor` in the variant definition, read by spec()
  // ---------------------------------------------------------------------------------------------

  describe('difficulty: the clue floor of a variant (clueFloor)', function () {
    var TEMP_ID = 'floorProbe';

    /** Registers a throw-away classic-shaped variant, runs fn(model) and removes the variant again. */
    function withFloor(clueFloor, fn, extra) {
      var def = {
        id: TEMP_ID, i18nKey: 'variant.' + TEMP_ID, group: 'test', digits: 9,
        difficultySupport: LEVELS.slice(), defaultSymbolMode: 'digits', symbolModes: ['digits'], options: [],
        build: function () { return SG.fixtures.models.boxGrid(TEMP_ID, 3, 3); }
      };
      if (clueFloor !== undefined) def.clueFloor = clueFloor;
      Object.assign(def, extra);
      SG.variants.register(def);
      try {
        return fn(def.build());
      } finally {
        SG.variants.unregister(TEMP_ID);
      }
    }

    it('without a declaration the floor is the classic9 floor scaled by cellCount / 81', function () {
      withFloor(undefined, function (model) {
        LEVELS.forEach(function (level) {
          expect(D.spec(level, model).minClues).toBe(D.spec(level, model9).minClues);
        });
      });
    });

    it('a table gives absolute floors; a level that is missing has no floor (0)', function () {
      withFloor({ veryEasy: 33, hard: 7 }, function (model) {
        var floors = LEVELS.map(function (level) { return D.spec(level, model).minClues; });
        expect(floors).toEqual([33, 0, 0, 7, 0, 0]);
        LEVELS.forEach(function (level) {
          var spec = D.spec(level, model);
          expect(spec.maxClues).toBeGreaterThanOrEqual(spec.minClues);
        });
      });
    });

    it('a function gets (level, model, the derived floor) and may scale it; nonsense falls back', function () {
      var seen = [];
      withFloor(function (level, model, derived) {
        seen.push([level, model.variantId, derived]);
        if (level === 'expert') return NaN;
        if (level === 'evil') return -4;
        return derived * 0.5 + 0.9;
      }, function (model) {
        LEVELS.forEach(function (level) {
          var derived = D.spec(level, model9).minClues;
          var floor = D.spec(level, model).minClues;
          expect(floor).toBe(level === 'expert' || level === 'evil' ? derived : Math.floor(derived * 0.5 + 0.9));
        });
      });
      expect(seen).toHaveLength(LEVELS.length);
      expect(seen[0]).toEqual(['veryEasy', TEMP_ID, 40]);
    });

    it('spec(level, null) and boards of unregistered variants keep working', function () {
      expect(D.spec('easy', null).minClues).toBe(Math.max(1, Math.floor(34 * 1)));
      expect(D.spec('veryEasy', SG.fixtures.models.samurai()).minClues).toBe(Math.floor(40 * 369 / 81));
    });

    it('Killer declares 40 clues for veryEasy and none for the levels above', function () {
      if (!SG.variants.has('killer')) SG.test.skip('the Killer variant is not loaded');
      var killer = SG.variants.get('killer').build({}, SG.rng.create(1));
      expect(LEVELS.slice(0, 5).map(function (level) { return D.spec(level, killer).minClues; }))
        .toEqual([40, 0, 0, 0, 0]);
    });

      it('Greater-Than and the 9x9 hybrids keep the derived floor of veryEasy and easy and scale the rest',
        function () {
          var ids = ['greaterThan', 'diagonalX', 'hyper', 'jigsaw9'];
          if (!ids.every(function (id) { return SG.variants.has(id); })) SG.test.skip('variants are not loaded');
          var expected = { veryEasy: 40, easy: 34, medium: 24, hard: 20, expert: 17, evil: 17 };
          ids.forEach(function (id) {
            var board = SG.variants.get(id).build({}, SG.rng.create(1));
            SG.variants.get(id).difficultySupport.forEach(function (level) {
              expect(D.spec(level, board).minClues).toBe(expected[level]);
            });
          });
        });

    it('a clueFloorScale multiplies the derived floor of its levels; a missing level keeps it', function () {
      withFloor(undefined, function (model) {
        var floors = LEVELS.map(function (level) { return D.spec(level, model).minClues; });
        expect(floors).toEqual([40, 34, 14, 25, 22, 17]);
        // The largest floor that the scale could give is the derived one times the factor, rounded down.
        LEVELS.forEach(function (level) {
          var spec = D.spec(level, model);
          expect(spec.maxClues).toBeGreaterThanOrEqual(spec.minClues);
        });
      }, { clueFloorScale: { medium: 0.5, easy: 1 } });
      // 25 * 0.8 is 19.999999999999996 in floating point and must still give 20.
      withFloor(undefined, function (model) {
        expect(D.spec('hard', model).minClues).toBe(20);
      }, { clueFloorScale: { hard: 0.8 } });
    });

    it('clueFloor sees the scaled floor as the derived one, and has the last word', function () {
      var seen = {};
      withFloor(function (level, model, derived) {
        seen[level] = derived;
        return level === 'hard' ? 3 : derived;
      }, function (model) {
        expect(D.spec('medium', model).minClues).toBe(14);
        expect(D.spec('hard', model).minClues).toBe(3);
        expect(D.spec('veryEasy', model).minClues).toBe(40);
      }, { clueFloorScale: { medium: 0.5, hard: 0.5 } });
      expect(seen).toEqual({ medium: 14, hard: 12, veryEasy: 40 });
    });

    it('a registration with a malformed clueFloor, clueFloorScale or restartThreshold is refused',
      function () {
      [{ clueFloor: { nope: 3 } }, { clueFloor: { easy: -1 } }, { clueFloor: { easy: 2.5 } },
        { clueFloor: [1, 2] }, { clueFloor: 7 }, { restartThreshold: 0 }, { restartThreshold: 1.5 },
        { restartThreshold: '300' }, { clueFloorScale: { nope: 1 } }, { clueFloorScale: { easy: -0.5 } },
        { clueFloorScale: { easy: '0.5' } }, { clueFloorScale: { easy: NaN } },
        { clueFloorScale: { easy: Infinity } }, { clueFloorScale: [0.5] }, { clueFloorScale: 0.5 },
        { clueFloorScale: null }].forEach(function (extra) {
        var def = Object.assign({
          id: TEMP_ID, i18nKey: 'variant.' + TEMP_ID, group: 'test', digits: 9, difficultySupport: ['easy'],
          defaultSymbolMode: 'digits', symbolModes: ['digits'], options: [], build: function () { return null; }
        }, extra);
        expectCode(function () { SG.variants.register(def); }, 'variant.invalidDef');
        expect(SG.variants.has(TEMP_ID)).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // T-2.7: scoring and classification
  // ---------------------------------------------------------------------------------------------

  describe('difficulty: classify and the cost table', function () {
    it('scores sum(cost x (uses + 0.5)) plus the empty cells, with the calibrated costs', function () {
      var counts = { nakedSingle: 30, hiddenSingleBox: 4, nakedPair: 2 };
      var rating = D.classify(fakeReport(counts, 50), model9);
      var expected = 50 * D.SCORING.emptyCellBonus;
      Object.keys(counts).forEach(function (id) {
        expected += D.costOf(id) * (counts[id] - 1 + D.SCORING.firstUseMultiplier);
      });
      expect(rating.rawScore).toBeCloseTo(expected, 6);
      expect(rating.empties).toBe(50);
    });

    it('takes a technique cost from SG.difficulty.COSTS, else the registered baseCost', function () {
      var counts = { nakedSingle: 10, xWing: 1 };
      var plain = D.classify(fakeReport(counts, 40), model9).rawScore;
      var dearer = withCosts({ xWing: D.COSTS.xWing + 100 }, function () {
        return D.classify(fakeReport(counts, 40), model9).rawScore;
      });
      expect(dearer - plain).toBeCloseTo(100 * D.SCORING.firstUseMultiplier, 6);

      var fallback = withCosts({ xWing: undefined }, function () {
        expect(D.costOf('xWing')).toBe(SG.techniques.get('xWing').baseCost);
        return D.classify(fakeReport(counts, 40), model9).rawScore;
      });
      var designCost = SG.techniques.get('xWing').baseCost;
      expect(fallback - plain).toBeCloseTo((designCost - D.COSTS.xWing) * D.SCORING.firstUseMultiplier, 6);
    });

    it('does not depend on whether the solver collected its steps', function () {
      var puzzles = SG.fixtures.rated.entries.slice(0, 6);
      puzzles.forEach(function (entry) {
        var givens = parse(entry.puzzle);
        var lean = D.rate(model9, givens);
        var full = D.rate(model9, givens, { collectSteps: true });
        expect(full.score).toBe(lean.score);
        expect(full.level).toBe(lean.level);
        expect(full.steps.length).toBeGreaterThan(0);
      });
    });

    it('rates the same report the same whichever way it is classified', function () {
      var entry = SG.fixtures.rated.entries[0];
      var givens = parse(entry.puzzle);
      var report = SG.logicalSolver.solve(model9, givens, { collectSteps: false });
      expect(D.classify(report, model9)).toEqual(D.rate(model9, givens));
    });

    it('rates a puzzle that needs only singles by the number of empty cells', function () {
      var dense = D.classify(fakeReport({ nakedSingle: 41 }, 41), model9);
      var sparse = D.classify(fakeReport({ nakedSingle: 47 }, 47), model9);
      expect(dense.level).toBe('veryEasy');
      expect(sparse.level).toBe('easy');
      expect(dense.hardestTechnique).toBe('nakedSingle');
      expect(dense.hardestGroup).toBe('basic');
      expect(dense.score).toBeLessThan(sparse.score);
    });

    it('raises the score to the floor of the hardest technique needed (technique floor)', function () {
      // One use of a technique of group G, nearly no other work: the raw score is far below the band of G.
      var cases = [
        ['pointing', 'easy'], ['nakedPair', 'medium'], ['xWing', 'hard'], ['xyWing', 'expert'],
        ['forcingChain', 'evil']
      ];
      cases.forEach(function (c) {
        var counts = { nakedSingle: 3 };
        counts[c[0]] = 1;
        var rating = D.classify(fakeReport(counts, 4), model9);
        var spec = D.spec(c[1], model9);
        expect(rating.rawScore).toBeLessThan(spec.min);
        expect(rating.level).toBe(c[1]);
        expect(rating.score).toBe(spec.min);
        expect(rating.hardestTechnique).toBe(c[0]);
      });
    });

    it('lets a long solving path outgrow its own level (score band) when the steps add up', function () {
      var rating = D.classify(fakeReport({ nakedSingle: 30, nakedPair: 12 }, 50), model9);
      expect(rating.hardestGroup).toBe('subset');
      expect(rating.rawScore).toBeGreaterThan(D.spec('hard', model9).min);
      expect(rating.level).not.toBe('medium');
      expect(idx(rating.level)).toBeGreaterThan(idx('medium'));
    });

    it('reports the hardest technique by group first, then by cost, then by ladder position', function () {
      var r1 = D.classify(fakeReport({ nakedSingle: 5, xWing: 1, nakedQuad: 6 }, 20), model9);
      expect(r1.hardestTechnique).toBe('xWing');
      var r2 = D.classify(fakeReport({ nakedPair: 1, hiddenPair: 1 }, 20), model9);
      expect(r2.hardestTechnique).toBe('hiddenPair');
      var r3 = D.classify(fakeReport({ nakedQuad: 1, hiddenQuad: 1 }, 20), model9);
      expect(r3.hardestTechnique).toBe('hiddenQuad');
      expect(D.classify(fakeReport({}, 0), model9).hardestTechnique).toBeNull();
    });

    it('rates a puzzle that the techniques cannot finish as evil and says it is unsolved', function () {
      var rating = D.classify(fakeReport({ nakedSingle: 20 }, 60, false), model9);
      expect(rating.solved).toBe(false);
      expect(rating.level).toBe('evil');
      expect(rating.score).toBeGreaterThanOrEqual(D.spec('evil', model9).min);
    });

    it('scales its bands with the board (a small board reaches higher levels)', function () {
      var counts = { nakedSingle: 18 };
      var onSmall = D.classify(fakeReport(counts, 20), model6);
      var onBig = D.classify(fakeReport(counts, 20), model9);
      expect(idx(onSmall.level)).toBeGreaterThan(idx(onBig.level) - 1);
      // The technique floor is the band minimum of the board: 72 x 36/81 for 'easy' on classic6.
      var floored = D.classify(fakeReport({ pointing: 1 }, 3), model6);
      expect(floored.rawScore).toBeLessThan(D.spec('easy', model6).min);
      expect(floored.score).toBe(D.spec('easy', model6).min);
      expect(floored.level).toBe('easy');
    });

    it('returns a confidence between 0 and 1: 0 on a band edge, high deep inside the band', function () {
      var spec = D.spec('medium', model9);
      var onEdge = D.classify(fakeReport({ nakedPair: 1 }, 5), model9);
      expect(onEdge.score).toBe(spec.min);
      expect(onEdge.confidence).toBe(0);
      // Pick the number of naked pairs that puts the score closest to the middle of the band.
      var middle = null;
      var best = Infinity;
      for (var n = 1; n < 60; n++) {
        var r = D.classify(fakeReport({ nakedSingle: 40, nakedPair: n }, 45), model9);
        var off = Math.abs(r.score - (spec.min + spec.max) / 2);
        if (r.level === 'medium' && off < best) {
          best = off;
          middle = r;
        }
      }
      expect(middle).toBeTruthy();
      expect(middle.confidence).toBeGreaterThan(0.7);
      LEVELS.forEach(function (level) {
        [fakeReport({ nakedSingle: 30 }, 40), fakeReport({ xWing: 2, forcingChain: 7 }, 50)]
          .forEach(function (rep) {
          var c = D.classify(rep, model9).confidence;
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(1);
        });
        expect(typeof level).toBe('string');
      });
    });

    it('keeps the costs in the order of the groups: each group costs more than the one below', function () {
      var tiers = SG.difficulty.BASE_GROUPS.map(function (group) {
        return SG.techniques.list()
          .filter(function (t) { return t.group === group && t.variantScope === null; })
          .map(function (t) { return D.costOf(t.id); });
      });
      tiers.forEach(function (costs, i) {
        expect(costs.length).toBeGreaterThan(0);
        if (i > 0) expect(Math.min.apply(null, costs)).toBeGreaterThan(Math.max.apply(null, tiers[i - 1]));
      });
    });

    it('breaks the ties of the design table: boxLine > pointing, hiddenQuad > nakedQuad',
      function () {
        expect(D.costOf('boxLine')).toBeGreaterThan(D.costOf('pointing'));
        expect(D.costOf('hiddenQuad')).toBeGreaterThan(D.costOf('nakedQuad'));
      });
  });

  // ---------------------------------------------------------------------------------------------
  // T-2.7: labelled puzzles and monotonicity
  // ---------------------------------------------------------------------------------------------

  describe('difficulty: labelled puzzles (fixtures/rated.js)', function () {
    var entries = SG.fixtures.rated.entries;

    it('has at least 20 labelled puzzles, each with exactly one solution', function () {
      expect(entries.length).toBeGreaterThanOrEqual(20);
      entries.forEach(function (entry) {
        expect(entry.puzzle).toHaveLength(81);
        expect(LEVELS).toContain(entry.label);
        expect(SG.dfs.countSolutions(model9, parse(entry.puzzle), 2)).toBe(1);
      });
    });

    it('classify matches every label within one level', function () {
      entries.forEach(function (entry) {
        var rating = D.rate(model9, parse(entry.puzzle));
        var gap = Math.abs(idx(rating.level) - idx(entry.label));
        if (gap > 1) {
          throw new Error(entry.name + ' is labelled ' + entry.label + ' but rated ' + rating.level +
            ' (score ' +
            Math.round(rating.score) + ', hardest ' + rating.hardestTechnique + ')');
        }
      });
    });

    it('classify reproduces the level of every constructed puzzle exactly', function () {
      SG.fixtures.rated.constructed.forEach(function (entry) {
        var rating = D.rate(model9, parse(entry.puzzle));
        expect(rating.level).toBe(entry.label);
      });
    });

    it('the label of a constructed puzzle is a certificate about techniques, not a score', function () {
      SG.fixtures.rated.constructed.forEach(function (entry) {
        var givens = parse(entry.puzzle);
        if (entry.solvableWithin !== null) {
          expect(solvesWithin(model9, givens, entry.solvableWithin)).toBe(true);
        }
        if (entry.notSolvableWithin !== null) {
          expect(solvesWithin(model9, givens, entry.notSolvableWithin)).toBe(false);
        }
      });
    });

    it('rates the famous hardest puzzles as evil, and they need more than the cheap techniques', function () {
      ['escargot', 'worlds-hardest-2012', 'platinum-blonde', 'golden-nugget'].forEach(function (name) {
        var entry = entries.filter(function (e) { return e.name === name; })[0];
        var rating = D.rate(model9, parse(entry.puzzle));
        expect(rating.level).toBe('evil');
        expect(rating.hardestGroup).toBe('chain');
        expect(rating.solved).toBe(true);
      });
    });

    it('puts every label in order: harder labels never rate lower on average', function () {
      var sum = {};
      var count = {};
      SG.fixtures.rated.constructed.forEach(function (entry) {
        var s = D.rate(model9, parse(entry.puzzle)).score;
        sum[entry.label] = (sum[entry.label] || 0) + s;
        count[entry.label] = (count[entry.label] || 0) + 1;
      });
      var previous = -1;
      LEVELS.forEach(function (level) {
        var mean = sum[level] / count[level];
        expect(mean).toBeGreaterThan(previous);
        previous = mean;
      });
    });
  });

  describe('difficulty: monotonicity (removing a clue never makes a puzzle easier)', function () {
    /** A puzzle dug to `clues` clues, and the same puzzle with one more clue removed (null: none can go). */
    function pair(seed, minClues) {
      var rng = SG.rng.create(seed);
      var solution = SG.fullGrid.generate(model9, rng.fork('grid'), null);
      var dug = SG.digger.dig(model9, solution, rng.fork('dig'), { symmetry: 'none', minClues: minClues });
      var givens = dug.givens;
      var before = D.rate(model9, givens);
      var cells = [];
      for (var c = 0; c < givens.length; c++) if (givens[c] !== 0) cells.push(c);
      rng.fork('pick').shuffle(cells);
      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        var value = givens[cell];
        givens[cell] = 0;
        if (SG.dfs.stillUnique(model9, givens, cell, value)) {
          return { before: before, after: D.rate(model9, givens) };
        }
        givens[cell] = value;
      }
      return null;
    }

    it('does not lower the score: 100 puzzles of 30 to 50 clues, one more clue removed each', function () {
      var checked = 0;
      for (var i = 0; i < 100; i++) {
        var rng = SG.rng.create(31000 + i);
        var p = pair(31000 + i, 30 + rng.int(21));
        if (p === null) continue;
        checked++;
        if (p.after.score < p.before.score) {
          throw new Error('case ' + i + ': score fell from ' + p.before.score + ' to ' + p.after.score);
        }
      }
      expect(checked).toBeGreaterThanOrEqual(95);
    });

    it('never lowers the level, even on sparse puzzles: 300 puzzles of 22 to 50 clues', function () {
      var checked = 0;
      for (var i = 0; i < 300; i++) {
        var rng = SG.rng.create(41000 + i);
        var p = pair(41000 + i, 22 + rng.int(29));
        if (p === null) continue;
        checked++;
        if (idx(p.after.level) < idx(p.before.level)) {
          throw new Error('case ' + i + ': level fell from ' + p.before.level + ' to ' + p.after.level);
        }
      }
      expect(checked).toBeGreaterThanOrEqual(250);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // T-2.8: the technique-bounded oracle (stage A)
  // ---------------------------------------------------------------------------------------------

  describe('digger: technique-bounded oracle', function () {
    var SINGLES = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine'];

    function makeSolution(seed) {
      var rng = SG.rng.create(seed);
      return { rng: rng, solution: SG.fullGrid.generate(model9, rng.fork('grid'), null) };
    }

    it('keeps the puzzle solvable with the allowed techniques only, which also makes it unique', function () {
      for (var i = 0; i < 30; i++) {
        var s = makeSolution(5100 + i);
        var dug = SG.digger.dig(model9, s.solution, s.rng.fork('dig'), { allowedTechniques: SINGLES });
        var report = SG.logicalSolver.solve(model9, dug.givens, {
          allowedTechniques: SINGLES, collectSteps: false, assumeUniqueness: false
        });
        expect(report.solved).toBe(true);
        expect(SG.dfs.countSolutions(model9, dug.givens, 2)).toBe(1);
        expect(dug.clues).toBeGreaterThan(21);
      }
    });

    it('digs less deep with fewer techniques: singles only never beats more techniques', function () {
      var singles = 0;
      var more = 0;
      for (var i = 0; i < 30; i++) {
        var s = makeSolution(5200 + i);
        var narrow = SG.digger.dig(model9, s.solution, s.rng.fork('dig'), { allowedTechniques: SINGLES });
        singles += narrow.clues;
        var wide = SG.digger.dig(model9, s.solution, s.rng.fork('dig'), {
          allowedTechniques: D.spec('expert', model9).allowedTechniques
        });
        more += wide.clues;
      }
      expect(more).toBeLessThanOrEqual(singles);
    });

    it('never uses a technique that assumes uniqueness: it is listed, but the oracle skips it', function () {
      var allowed = D.spec('expert', model9).allowedTechniques;
      expect(allowed).toContain('uniqueRectangle');
      for (var i = 0; i < 15; i++) {
        var s = makeSolution(5300 + i);
        var dug = SG.digger.dig(model9, s.solution, s.rng.fork('dig'), { allowedTechniques: allowed });
        expect(SG.dfs.countSolutions(model9, dug.givens, 2)).toBe(1);
        var report = SG.logicalSolver.solve(model9, dug.givens, {
          allowedTechniques: allowed, collectSteps: false, assumeUniqueness: false
        });
        expect(report.solved).toBe(true);
        expect(report.techniqueCounts.uniqueRectangle).toBeUndefined();
      }
    });

    it('reports the groups it removed, in order, and they account for every removed clue', function () {
      var s = makeSolution(5400);
      var dug = SG.digger.dig(model9, s.solution, s.rng.fork('dig'), { allowedTechniques: SINGLES });
      var removed = 0;
      dug.removedGroups.forEach(function (group) {
        removed += group.length;
        group.forEach(function (cell) { expect(dug.givens[cell]).toBe(0); });
      });
      expect(removed).toBe(81 - dug.clues);
      expect(dug.removedGroups).toHaveLength(dug.stats.accepted);
    });

    it('continues a dug puzzle from startGivens without touching the clues that were kept', function () {
      var s = makeSolution(5500);
      var first = SG.digger.dig(model9, s.solution, s.rng.fork('a'), { minClues: 45 });
      var second = SG.digger.dig(model9, s.solution, s.rng.fork('b'), { startGivens: first.givens });
      expect(second.clues).toBeLessThan(first.clues);
      for (var c = 0; c < 81; c++) {
        if (second.givens[c] !== 0) expect(first.givens[c]).toBe(s.solution[c]);
        if (first.givens[c] === 0) expect(second.givens[c]).toBe(0);
      }
      expect(SG.dfs.countSolutions(model9, second.givens, 2)).toBe(1);
    });

    it('rejects options it cannot use', function () {
      var s = makeSolution(5600);
      expectCode(function () {
        SG.digger.dig(model9, s.solution, s.rng.fork('x'), { allowedTechniques: 'nakedSingle' });
      }, 'digger.invalidOption');
      expectCode(function () {
        SG.digger.dig(model9, s.solution, s.rng.fork('x'), { startGivens: new Int32Array(10) });
      }, 'digger.invalidOption');
      var wrong = Int32Array.from(s.solution);
      wrong[0] = wrong[0] === 9 ? 1 : wrong[0] + 1;
      expectCode(function () {
        SG.digger.dig(model9, s.solution, s.rng.fork('x'), { startGivens: wrong });
      }, 'digger.invalidOption');
      expect(function () {
        SG.digger.dig(model9, s.solution, s.rng.fork('x'), { allowedTechniques: ['noSuchTechnique'] });
      }).toThrow('noSuchTechnique');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // T-2.8 / T-2.10: 100 puzzles per level on classic9
  // ---------------------------------------------------------------------------------------------

  describe('digger.generate: 100 classic9 puzzles per level (hit rate, invariants I1-I7, time)', function () {
    var PER_LEVEL = 100;
    /** design.md section 9.1, ms; the table has no column for 'easy', so it gets the one of 'medium'. */
    var BUDGET_MS = { veryEasy: 60, easy: 150, medium: 150, hard: 400, expert: 900, evil: 2500 };
    var batches = {};

    function batch(level) {
      if (batches[level]) return batches[level];
      var puzzles = [];
      var times = [];
      for (var i = 0; i < PER_LEVEL; i++) {
        var rng = SG.rng.create(7000 + i);
        var started = Date.now();
        puzzles.push(SG.digger.generate(model9, level, rng, {}));
        times.push(Date.now() - started);
      }
      batches[level] = { puzzles: puzzles, times: times };
      return batches[level];
    }

    LEVELS.forEach(function (level) {
      var spec = D.spec(level, model9);

      describe(level, function () {
        it('hits the requested level in at least 90 of 100 puzzles', function () {
          var hits = batch(level).puzzles.filter(function (p) { return p.achieved === level; }).length;
          expect(hits).toBeGreaterThanOrEqual(0.9 * PER_LEVEL);
        });

        it('I1: every puzzle has exactly one solution (checked with the DFS, not the oracle)', function () {
          batch(level).puzzles.forEach(function (p, i) {
            if (SG.dfs.countSolutions(model9, p.givens, 2) !== 1) {
              throw new Error('puzzle ' + i + ' is not unique');
            }
            expect(p.warnings).not.toContain('digger.unsoundTechnique');
          });
        });

        it('I2, I3, I6: givens belong to the solution they determine; at least minClues', function () {
          batch(level).puzzles.forEach(function (p, i) {
            expect(SG.model.isSolution(model9, p.solution)).toBe(true);
            for (var c = 0; c < 81; c++) {
              if (p.givens[c] !== 0 && p.givens[c] !== p.solution[c]) {
                throw new Error('puzzle ' + i + ' cell ' + c);
              }
            }
            expect(clueCount(p.givens)).toBe(p.clues);
            expect(p.clues).toBeGreaterThanOrEqual(spec.minClues);
            expect(SG.dfs.solve(model9, p.givens)).toEqual(p.solution);
          });
        });

        it('I5: an exact puzzle has its score in the band and its hardest technique in the allowed groups',
          function () {
            batch(level).puzzles.forEach(function (p, i) {
              expect(p.exact).toBe(p.achieved === level);
              if (!p.exact) return;
              var rating = D.rate(model9, p.givens);
              expect(rating.score).toBe(p.rating.score);
              expect(rating.score).toBeGreaterThanOrEqual(spec.min);
              expect(rating.score).toBeLessThan(spec.max);
              if (rating.hardestGroup !== null && spec.allowedGroups.indexOf(rating.hardestGroup) === -1) {
                throw new Error('puzzle ' + i + ' needs ' + rating.hardestTechnique + ' (' +
                  rating.hardestGroup + ')');
              }
            });
          });

        it('stays within the technique set of the level (up to expert), by the oracle itself', function () {
          if (level === 'evil') return;
          batch(level).puzzles.forEach(function (p, i) {
            if (!p.exact) return;
            if (!solvesWithin(model9, p.givens, level)) {
              throw new Error('puzzle ' + i + ' needs more than ' + level);
            }
          });
        });

        it('I7: every deduction on the way to the solution is sound', function () {
          batch(level).puzzles.forEach(function (p, i) {
            var report = SG.logicalSolver.solve(model9, p.givens, { collectSteps: true });
            expect(report.solved).toBe(true);
            report.steps.forEach(function (step) {
              step.placements.forEach(function (pl) {
                if (p.solution[pl[0]] !== pl[1]) {
                  throw new Error('puzzle ' + i + ': ' + step.technique + ' places wrongly');
                }
              });
              step.eliminations.forEach(function (el) {
                if (p.solution[el[0]] === el[1]) {
                  throw new Error('puzzle ' + i + ': ' + step.technique + ' is unsound');
                }
              });
            });
          });
        });

        it('has the pattern of empty cells that the default symmetry asks for (rotational 180)', function () {
          batch(level).puzzles.forEach(function (p, i) {
            for (var c = 0; c < 81; c++) {
              if ((p.givens[c] === 0) !== (p.givens[80 - c] === 0)) {
                throw new Error('puzzle ' + i + ' cell ' + c);
              }
            }
          });
        });

        it('is generated well inside the budget of design.md section 9.1 (median time)', function () {
          var times = batch(level).times.slice().sort(function (a, b) { return a - b; });
          expect(times[PER_LEVEL >> 1]).toBeLessThan(BUDGET_MS[level]);
        });
      });
    });

    it('is a confusion matrix with its diagonal as the most common cell of every row', function () {
      LEVELS.forEach(function (level) {
        var row = {};
        batch(level).puzzles.forEach(function (p) { row[p.achieved] = (row[p.achieved] || 0) + 1; });
        LEVELS.forEach(function (other) {
          if (other !== level) expect(row[other] || 0).toBeLessThanOrEqual(row[level] || 0);
        });
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // T-2.8: digLevel, generate and their guarantees
  // ---------------------------------------------------------------------------------------------

  describe('digger.generate: guarantees', function () {
    it('I4: the same seed gives the same puzzle, another seed another one', function () {
      ['medium', 'hard', 'evil'].forEach(function (level) {
        var a = SG.digger.generate(model9, level, SG.rng.create(8100), {});
        var b = SG.digger.generate(model9, level, SG.rng.create(8100), {});
        var c = SG.digger.generate(model9, level, SG.rng.create(8101), {});
        expect(Array.from(b.givens)).toEqual(Array.from(a.givens));
        expect(b.rating.score).toBe(a.rating.score);
        expect(b.samples).toBe(a.samples);
        expect(Array.from(c.givens)).not.toEqual(Array.from(a.givens));
      });
    });

    it('is independent of the emit callback', function () {
      var plain = SG.digger.generate(model9, 'hard', SG.rng.create(8200), {});
      var seen = 0;
      var loud = SG.digger.generate(model9, 'hard', SG.rng.create(8200), { emit: function () { seen++; } });
      expect(seen).toBeGreaterThan(0);
      expect(Array.from(loud.givens)).toEqual(Array.from(plain.givens));
    });

    it('returns the documented fields', function () {
      var p = SG.digger.generate(model9, 'medium', SG.rng.create(8300), {});
      expect(p.requested).toBe('medium');
      expect(p.achieved).toBe(p.rating.level);
      expect(p.exact).toBe(true);
      expect(p.attempts).toBeGreaterThanOrEqual(1);
      expect(p.samples).toBeGreaterThanOrEqual(p.attempts);
      expect(p.warnings).toEqual([]);
      expect(p.givens).toHaveLength(81);
      expect(p.solution).toHaveLength(81);
      expect(typeof p.stats.oracleCalls).toBe('number');
    });

    it('honours minClues and the unit floor of the spec on every level', function () {
      LEVELS.forEach(function (level) {
        var spec = D.spec(level, model9);
        for (var i = 0; i < 5; i++) {
          var p = SG.digger.generate(model9, level, SG.rng.create(8400 + i), {});
          expect(p.clues).toBeGreaterThanOrEqual(spec.minClues);
          model9.units.forEach(function (unit) {
            var n = 0;
            unit.forEach(function (cell) { if (p.givens[cell] !== 0) n++; });
            expect(n).toBeGreaterThanOrEqual(spec.minCluesPerUnit);
          });
        }
      });
    });

    it('works with other symmetries and with none', function () {
      ['none', 'mirrorH', 'rotational90'].forEach(function (symmetry) {
        var p = SG.digger.generate(model9, 'medium', SG.rng.create(8500), { symmetry: symmetry });
        expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
        var groups = SG.symmetry.groups(model9, symmetry);
        groups.forEach(function (group) {
          for (var i = 1; i < group.length; i++) {
            expect(p.givens[group[i]] === 0).toBe(p.givens[group[0]] === 0);
          }
        });
      });
    });

    it('digLevel makes one attempt from a given solution and says whether it hit the level', function () {
      var rng = SG.rng.create(8600);
      var solution = SG.fullGrid.generate(model9, rng.fork('grid'), null);
      var puzzle = SG.digger.digLevel(model9, solution, 'easy', rng.fork('dig'), {});
      expect(puzzle.requested).toBe('easy');
      expect(puzzle.exact).toBe(puzzle.achieved === 'easy');
      expect(puzzle.unsound).toBe(false);
      expect(SG.dfs.countSolutions(model9, puzzle.givens, 2)).toBe(1);
      expect(puzzle.removed).toBe(81 - puzzle.clues);
      expect(Array.from(puzzle.solution)).toEqual(Array.from(solution));
      // The stage B switch changes the way the puzzle is dug, not what a puzzle is.
      var plain = SG.digger.digLevel(model9, solution, 'hard', rng.fork('dig2'), { guided: false });
      var guided = SG.digger.digLevel(model9, solution, 'hard', rng.fork('dig2'), { guided: true });
      [plain, guided].forEach(function (p) {
        expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
      });
    });

    it('works on the smaller boards for the levels they support', function () {
      [[model4, 'veryEasy'], [model4, 'easy'], [model6, 'veryEasy'], [model6, 'easy']].forEach(function (c) {
        var hits = 0;
        for (var i = 0; i < 20; i++) {
          var p = SG.digger.generate(c[0], c[1], SG.rng.create(8700 + i), {});
          expect(SG.dfs.countSolutions(c[0], p.givens, 2)).toBe(1);
          if (p.exact) hits++;
        }
        expect(hits).toBeGreaterThanOrEqual(18);
      });
    });

    it('rejects a level the variant does not support and options that make no sense', function () {
      expectCode(function () { SG.digger.generate(model4, 'evil', SG.rng.create(1), {}); },
        'difficulty.unsupportedLevel');
      expectCode(function () { SG.digger.generate(model9, 'nightmare', SG.rng.create(1), {}); },
        'difficulty.unknownLevel');
      [0, -1, 1.5, 'x'].forEach(function (bad) {
        expectCode(function () {
          SG.digger.generate(model9, 'easy', SG.rng.create(1), { maxAttempts: bad });
        },
          'digger.invalidOption');
        expectCode(function () { SG.digger.generate(model9, 'easy', SG.rng.create(1), { digTries: bad }); },
          'digger.invalidOption');
      });
    });

    it('propagates a budget that runs out instead of swallowing it', function () {
      expectCode(function () {
        SG.digger.generate(model9, 'hard', SG.rng.create(8800), { budget: SG.budget.create({ nodes: 30 }) });
      }, 'budget.exceeded');
    });
  });

  describe('digger.generate: when the level cannot be reached', function () {
    it('returns the closest puzzle with the warning difficulty.approximate and does not throw', function () {
      // With the cost of a naked single made absurd, every puzzle rates as the hardest level.
      withCosts({ nakedSingle: 1000 }, function () {
        var events = [];
        var result = SG.digger.generate(model9, 'veryEasy', SG.rng.create(9000), {
          maxAttempts: 3,
          digTries: 2,
          emit: function (e) { if (e.type === 'retry') events.push(e); }
        });
        expect(result.exact).toBe(false);
        expect(result.warnings).toContain('difficulty.approximate');
        expect(result.achieved).toBe('evil');
        expect(result.requested).toBe('veryEasy');
        expect(result.attempts).toBe(3);
        expect(result.samples).toBe(6);
        expect(events).toHaveLength(3);
        expect(events[0].i18nArgs.attempt).toBe(1);
        expect(SG.dfs.countSolutions(model9, result.givens, 2)).toBe(1);
      });
    });

    it('prefers the closest result: a puzzle one level off beats one five levels off', function () {
      // 'medium' on a 6x6 board is almost never reached (that is why classic6 does not offer it); the closest
      // puzzles are 'easy' ones, never 'evil'. A box grid with an unregistered id supports every level.
      var board6 = SG.fixtures.models.boxGrid('boxGrid6', 2, 3);
      var result = SG.digger.generate(board6, 'medium', SG.rng.create(9100), { maxAttempts: 2, digTries: 2 });
      if (!result.exact) {
        expect(result.warnings).toContain('difficulty.approximate');
        expect(idx(result.achieved)).toBeLessThanOrEqual(idx('medium') + 1);
        expect(idx(result.achieved)).toBeGreaterThanOrEqual(idx('medium') - 1);
      }
      expect(SG.dfs.countSolutions(board6, result.givens, 2)).toBe(1);
    });

    it('stops after maxAttempts x digTries samples and never more', function () {
      withCosts({ nakedSingle: 1000 }, function () {
        var result = SG.digger.generate(model9, 'easy', SG.rng.create(9200), { maxAttempts: 2, digTries: 5 });
        expect(result.samples).toBe(10);
        expect(result.attempts).toBe(2);
      });
    });

    it('tries more dig samples per grid when the symmetry digs in groups of four', function () {
      withCosts({ nakedSingle: 1000 }, function () {
        var pairs = SG.digger.generate(model9, 'easy', SG.rng.create(9210), { maxAttempts: 1 });
        var fours = SG.digger.generate(model9, 'easy', SG.rng.create(9210),
          { maxAttempts: 1, symmetry: 'mirrorBoth' });
        expect(pairs.samples).toBe(12);
        expect(fours.samples).toBe(30);
      });
    });
  });

  describe('digger.generate: safety net against a technique bug (risk R3)', function () {
    /**
     * A technique that guesses: it places the smallest candidate of the first open cell. It is
     * registered as the cheapest technique of the basic group, so the oracle of every level uses it,
     * and it "solves" puzzles that
     * have many solutions. Without the final DFS check such puzzles would be returned.
     */
    function withGuesser(fn) {
      SG.techniques.register({
        id: 'testGuesser',
        group: 'basic',
        baseCost: 1,
        order: 5,
        i18nKey: 'technique.testGuesser',
        find: function (model, state) {
          for (var c = 0; c < model.cellCount; c++) {
            if (state.value[c] === 0) {
              var mask = state.candidates[c];
              var v = 1;
              while ((mask & (1 << (v - 1))) === 0) v++;
              return {
                technique: 'testGuesser', cells: [c], placements: [[c, v]], eliminations: [],
                i18nKey: 'technique.testGuesser.step', i18nArgs: {}
              };
            }
          }
          return null;
        }
      });
      try {
        return fn();
      } finally {
        SG.techniques.unregister('testGuesser');
      }
    }

    it('never returns an ambiguous puzzle, reports the bug and still delivers a unique puzzle', function () {
      withGuesser(function () {
        var unsound = 0;
        for (var i = 0; i < 12; i++) {
          var p = SG.digger.generate(model9, 'veryEasy', SG.rng.create(9300 + i),
            { maxAttempts: 1, digTries: 1 });
          expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
          expect(SG.model.isSolution(model9, p.solution)).toBe(true);
          if (p.warnings.indexOf('digger.unsoundTechnique') !== -1) unsound++;
        }
        // The bug must have been caught at least once, or this test proves nothing.
        expect(unsound).toBeGreaterThan(0);
      });
    });

    it('digLevel marks the puzzle it had to replace', function () {
      withGuesser(function () {
        var flagged = 0;
        for (var i = 0; i < 12; i++) {
          var rng = SG.rng.create(9400 + i);
          var solution = SG.fullGrid.generate(model9, rng.fork('grid'), null);
          var p = SG.digger.digLevel(model9, solution, 'veryEasy', rng.fork('dig'), {});
          expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
          if (p.unsound) flagged++;
        }
        expect(flagged).toBeGreaterThan(0);
      });
    });
  });
})();
