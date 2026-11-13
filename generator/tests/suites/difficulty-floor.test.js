// The tier algebra and the reference floor of SG.difficulty: floorTechniques, tierTechniques, the two new
// fields of spec and certifyFloor (docs/difficulty-v3/report-detailed.md, R1 and R2). The sets are checked
// against an oracle written here from the accepted rule. The reference solves of the frozen puzzles of
// tests/fixtures/rated.js run in a registry of their own (a Node vm context), so that they leave the finder
// state of the registry the other suites use as it was; everything else is pure or uses a stubbed solver.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var D = SG.difficulty;
  var LEVELS = D.LEVELS;
  var BANDS = [0, 45, 180, 400, 700, 1000, 1500, 2400, 3600];
  var SINGLES = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine'];
  var VACUOUS = { required: true, vacuous: true, floorLevel: null, unsolvedCount: 0 };
  var hasOwn = Object.prototype.hasOwnProperty;

  function build(variantId) {
    return SG.variants.get(variantId).build({}, SG.rng.create(1));
  }

  var MODELS = [
    { name: 'no model', model: null },
    { name: 'classic9', model: build('classic9') },
    { name: 'killer', model: build('killer') },
    { name: 'greaterThan', model: build('greaterThan') },
    { name: 'classic6', model: build('classic6') },
    { name: 'classic4', model: build('classic4') }
  ];
  var model9 = MODELS[1].model;
  var killer = MODELS[2].model;
  var greater = MODELS[3].model;
  var model6 = MODELS[4].model;
  var model4 = MODELS[5].model;
  var EMPTY9 = new Int32Array(81);

  function variantOf(model) {
    return model === null ? null : model.variantId;
  }

  /** The techniques of a band by the accepted rule, written out here independently of difficulty.js. */
  function allowed(i, variantId) {
    var top = i === BANDS.length - 1;
    return SG.techniques.list().filter(function (tech) {
      var applies = variantId === null || tech.variantScope === null ||
        tech.variantScope.indexOf(variantId) !== -1;
      return hasOwn.call(D.WEIGHTS, tech.id) && applies && (top || 1.25 * D.WEIGHTS[tech.id] < BANDS[i + 1]);
    }).map(function (tech) { return tech.id; });
  }

  function floorOf(i, variantId) {
    return i === 0 ? [] : allowed(i - 1, variantId);
  }

  function minus(list, other) {
    return list.filter(function (id) { return other.indexOf(id) === -1; });
  }

  function sorted(list) {
    return list.slice().sort();
  }

  function groupsOf(ids) {
    return ids.map(function (id) { return SG.techniques.get(id).group; });
  }

  function caught(fn) {
    try {
      fn();
    } catch (e) {
      return e;
    }
    throw new Error('expected the call to throw');
  }

  /** A report of the logical solver as certifyFloor reads it: the status and the cells left on `state`. */
  function reportOf(status, unsolvedCount) {
    return {
      solved: status === 'solved', status: status, state: { unsolvedCount: unsolvedCount }, steps: [],
      techniqueCounts: {}, hardestTechnique: null, score: 0, solution: null
    };
  }

  /** Runs fn(calls) with SG.logicalSolver.solve replaced by a recorder that returns answer(...). */
  function withSolver(answer, fn) {
    var real = SG.logicalSolver.solve;
    var calls = [];
    SG.logicalSolver.solve = function (model, givens, options) {
      calls.push({ model: model, givens: givens, options: options });
      return answer(model, givens, options);
    };
    try {
      return fn(calls);
    } finally {
      SG.logicalSolver.solve = real;
    }
  }

  function noSolve() {
    throw new Error('the solver must not run');
  }

  describe('difficulty floor: the sets of a level', function () {
    it('keeps the accepted bands and the peak factor that the sets derive from', function () {
      expect(D.TABLE.map(function (row) { return row.min; })).toEqual(BANDS);
      expect(D.SCORING.peakBound).toBe(1.25);
      expect(D.bandOf('hell2').max).toBe(Infinity);
    });

    it('derives floor and tier of every global level on every board by the accepted rule', function () {
      var order = SG.techniques.list().map(function (tech) { return tech.id; });
      MODELS.forEach(function (entry) {
        var variantId = variantOf(entry.model);
        LEVELS.forEach(function (level, i) {
          var where = entry.name + ' ' + level;
          var floor = D.floorTechniques(level, entry.model);
          var tier = D.tierTechniques(level, entry.model);
          expect([where, floor]).toEqual([where, floorOf(i, variantId)]);
          expect([where, tier]).toEqual([where, minus(allowed(i, variantId), floor)]);
          [floor, tier].forEach(function (list) {
            list.forEach(function (id, k) {
              expect([where, id, list.indexOf(id)]).toEqual([where, id, k]);
              expect(order.indexOf(id)).toBeGreaterThan(k === 0 ? -1 : order.indexOf(list[k - 1]));
            });
          });
          expect([where, minus(tier, floor)]).toEqual([where, tier]);
          expect([where, sorted(floor.concat(tier))]).toEqual([where, sorted(allowed(i, variantId))]);
        });
      });
    });

    it('limits the sets to the techniques of the variant (cage and inequality ones only where they apply)',
      function () {
        MODELS.forEach(function (entry) {
          var groups = [];
          LEVELS.forEach(function (level) {
            groups = groups.concat(groupsOf(D.floorTechniques(level, entry.model)),
              groupsOf(D.tierTechniques(level, entry.model)));
          });
          expect([entry.name, groups.indexOf('cage') !== -1]).toEqual([entry.name,
            entry.model === null || entry.name === 'killer']);
          expect([entry.name, groups.indexOf('ineq') !== -1]).toEqual([entry.name,
            entry.model === null || entry.name === 'greaterThan']);
        });
        expect(D.tierTechniques('easy', killer)).toContain('cageCombo');
        expect(D.tierTechniques('normal', killer)).toContain('ruleOf45');
        expect(D.tierTechniques('hard', killer)).toContain('cageSplit');
        expect(D.tierTechniques('easy', greater)).toContain('ineqChain');
        expect(D.tierTechniques('normal', greater)).toContain('minMaxForcing');
      });

    it('makes the floor, and the floor with the tier, a prefix of the actual ladder of every variant',
      function () {
        var variants = SG.variants.list().map(function (def) {
          return { name: def.id, model: { variantId: def.id } };
        }).concat([{ name: 'no model', model: null }]);
        expect(variants.length).toBeGreaterThan(10);
        variants.forEach(function (entry) {
          var variantId = variantOf(entry.model);
          var ladder = SG.techniques.list().filter(function (tech) {
            return hasOwn.call(D.WEIGHTS, tech.id) &&
              (variantId === null || SG.techniques.appliesTo(tech, variantId));
          }).map(function (tech) { return tech.id; });
          LEVELS.forEach(function (level) {
            var where = entry.name + ' ' + level;
            var floor = D.floorTechniques(level, entry.model);
            var allowedIds = floor.concat(D.tierTechniques(level, entry.model));
            expect([where, ladder.slice(0, floor.length)]).toEqual([where, floor]);
            expect([where, ladder.slice(0, allowedIds.length)]).toEqual([where, allowedIds]);
          });
        });
      });

    it('returns a fresh array on every call', function () {
      var floor = D.floorTechniques('hard', model9);
      var tier = D.tierTechniques('hard', model9);
      floor.push('changed');
      tier.length = 0;
      expect(D.floorTechniques('hard', model9)).not.toContain('changed');
      expect(D.tierTechniques('hard', model9).length).toBeGreaterThan(0);
      expect(D.floorTechniques('hard', model9)).not.toBe(D.floorTechniques('hard', model9));
      expect(D.tierTechniques('hard', model9)).not.toBe(D.tierTechniques('hard', model9));
    });

    it('rejects a level that does not exist', function () {
      expect(caught(function () { D.floorTechniques('impossible', model9); }).code)
        .toBe('difficulty.unknownLevel');
      expect(caught(function () { D.tierTechniques('hell3', null); }).code).toBe('difficulty.unknownLevel');
    });

    it('gives VeryEasy no floor and the three singles as its tier', function () {
      MODELS.forEach(function (entry) {
        expect(D.floorTechniques('veryEasy', entry.model)).toEqual([]);
        expect(D.tierTechniques('veryEasy', entry.model)).toEqual(SINGLES);
      });
    });

    it('gives Hell 2 an empty tier at this baseline, also where the variant does not offer the level',
      function () {
        expect(D.isSupported('hell2', model9)).toBe(false);
        MODELS.forEach(function (entry) {
          var variantId = variantOf(entry.model);
          expect(D.tierTechniques('hell2', entry.model)).toEqual([]);
          expect(D.floorTechniques('hell2', entry.model)).toEqual(allowed(7, variantId));
          expect(D.floorTechniques('hell2', entry.model).length).toBeGreaterThan(0);
        });
      });

    it('derives the Normal floor of Hard on classic6, which does not offer Normal', function () {
      expect(D.isSupported('normal', model6)).toBe(false);
      expect(D.isSupported('hard', model6)).toBe(true);
      expect(D.floorTechniques('hard', model6)).toEqual(allowed(2, 'classic6'));
      expect(D.tierTechniques('hard', model6)).toEqual(minus(allowed(3, 'classic6'), allowed(2, 'classic6')));
      expect(D.tierTechniques('normal', model6).length).toBeGreaterThan(0);
      expect(D.spec('hard', model6).floorTechniques).toEqual(D.floorTechniques('hard', model6));
      expect(caught(function () { D.spec('normal', model6); }).code).toBe('difficulty.unsupportedLevel');
    });

    it('reads the weights and the registry on every call, without a cache', function () {
      var before = D.tierTechniques('easy', model9);
      var weight = D.WEIGHTS.pointing;
      try {
        // 1.25 * 400 = 500: below the maximum of Hard (700) but not below that of Normal (400)
        D.WEIGHTS.pointing = 400;
        expect(D.tierTechniques('easy', model9)).not.toContain('pointing');
        expect(D.tierTechniques('normal', model9)).not.toContain('pointing');
        expect(D.tierTechniques('hard', model9)).toContain('pointing');
        expect(D.floorTechniques('hard', model9)).not.toContain('pointing');
        expect(D.floorTechniques('expert', model9)).toContain('pointing');
        expect(D.spec('hard', model9).tierTechniques).toContain('pointing');
        expect(D.spec('easy', model9).allowedTechniques).not.toContain('pointing');
        expect(D.tierTechniques('hard', model9))
          .toEqual(minus(allowed(3, 'classic9'), allowed(2, 'classic9')));
      } finally {
        D.WEIGHTS.pointing = weight;
      }
      expect(D.WEIGHTS.pointing).toBe(40);
      expect(D.tierTechniques('easy', model9)).toEqual(before);
    });

    it('ignores unweighted techniques and weights of nothing, and sees a new technique', function () {
      var probe = 'floorProbe';
      var before = D.tierTechniques('easy', killer);
      try {
        SG.techniques.register({
          id: probe, group: 'cage', baseCost: 1, order: 21, i18nKey: 'technique.' + probe,
          variantScope: ['killer'], find: function () { return null; }
        });
        expect(D.tierTechniques('easy', killer)).toEqual(before);
        D.WEIGHTS.floorGhost = 100;
        LEVELS.forEach(function (level) {
          expect(D.tierTechniques(level, killer)).not.toContain('floorGhost');
        });
        D.WEIGHTS[probe] = 100;
        expect(D.tierTechniques('easy', killer)).toContain(probe);
        expect(D.tierTechniques('easy', killer)).toEqual(minus(allowed(1, 'killer'), allowed(0, 'killer')));
        expect(D.tierTechniques('easy', model9)).not.toContain(probe);
        expect(D.tierTechniques('easy', null)).toContain(probe);
      } finally {
        SG.techniques.unregister(probe);
        delete D.WEIGHTS[probe];
        delete D.WEIGHTS.floorGhost;
      }
      expect(D.tierTechniques('easy', killer)).toEqual(before);
    });
  });

  describe('difficulty floor: spec', function () {
    var OLD_FIELDS = ['level', 'min', 'max', 'minClues', 'maxClues', 'minCluesPerUnit', 'allowedGroups',
      'allowedTechniques', 'symmetryDefault', 'extraPasses', 'oracle', 'proposal', 'scale'];

    it('adds floorTechniques and tierTechniques and keeps every other field', function () {
      var hard = D.spec('hard', model9);
      OLD_FIELDS.concat(['floorTechniques', 'tierTechniques']).forEach(function (key) {
        expect(hasOwn.call(hard, key)).toBe(true);
      });
      expect(hard.level).toBe('hard');
      expect(hard.min).toBe(400);
      expect(hard.max).toBe(700);
      expect(hard.minClues).toBe(25);
      expect(hard.maxClues).toBe(30);
      expect(hard.minCluesPerUnit).toBe(1);
      expect(hard.allowedGroups).toEqual(['basic', 'locked', 'subset', 'fish']);
      expect(hard.allowedTechniques).toEqual(allowed(3, 'classic9'));
      expect(hard.symmetryDefault).toBe('rotational180');
      expect(hard.extraPasses).toBe(1);
      expect(hard.oracle).toBe('techniques');
      expect(hard.proposal).toBe(false);
      expect(hard.scale).toBe(1);
      var top = D.spec('hell2', killer);
      expect(top.max).toBe(Infinity);
      expect(top.proposal).toBe(true);
      expect(top.allowedTechniques).toEqual(allowed(8, 'killer'));
      expect(top.tierTechniques).toEqual([]);
    });

    it('keeps the unfiltered sets without a model', function () {
      var easy = D.spec('easy', null);
      expect(easy.allowedTechniques).toEqual(allowed(1, null));
      expect(easy.allowedTechniques).toContain('cageCombo');
      expect(easy.allowedTechniques).toContain('ineqChain');
      expect(easy.floorTechniques).toEqual(SINGLES);
      expect(easy.tierTechniques).toEqual(minus(allowed(1, null), SINGLES));
    });

    it('lists the allowed set, its floor and its tier for every offered level', function () {
      MODELS.forEach(function (entry) {
        var variantId = variantOf(entry.model);
        LEVELS.forEach(function (level, i) {
          if (!D.isSupported(level, entry.model)) return;
          var spec = D.spec(level, entry.model);
          var where = entry.name + ' ' + level;
          expect([where, spec.allowedTechniques]).toEqual([where, allowed(i, variantId)]);
          expect([where, spec.floorTechniques]).toEqual([where, D.floorTechniques(level, entry.model)]);
          expect([where, spec.tierTechniques]).toEqual([where, D.tierTechniques(level, entry.model)]);
          if (i > 0 && D.isSupported(LEVELS[i - 1], entry.model)) {
            expect([where, spec.floorTechniques])
              .toEqual([where, D.spec(LEVELS[i - 1], entry.model).allowedTechniques]);
          }
        });
      });
    });

    it('returns arrays of its own', function () {
      var spec = D.spec('easy', model9);
      spec.floorTechniques.push('changed');
      spec.tierTechniques.push('changed');
      spec.allowedTechniques.push('changed');
      expect(D.tierTechniques('easy', model9)).not.toContain('changed');
      expect(D.floorTechniques('easy', model9)).not.toContain('changed');
      expect(D.spec('easy', model9).allowedTechniques).not.toContain('changed');
    });

    it('still rejects an unknown level and a level the variant does not offer', function () {
      var unknown = caught(function () { D.spec('impossible', model9); });
      expect(unknown.code).toBe('difficulty.unknownLevel');
      var missing = caught(function () { D.spec('normal', model6); });
      expect(missing.code).toBe('difficulty.unsupportedLevel');
      expect(missing.i18nArgs).toEqual({ level: 'normal', variantId: 'classic6' });
      expect(caught(function () { D.spec('hell2', model9); }).code).toBe('difficulty.unsupportedLevel');
      expect(caught(function () { D.spec('easy', model4); }).code).toBe('difficulty.unsupportedLevel');
    });
  });

  describe('difficulty floor: certifyFloor, with a stubbed solver', function () {
    it('answers a solved floor as not required, with the previous global level', function () {
      var budget = { check: function () {} };
      withSolver(function () { return reportOf('solved', 0); }, function (calls) {
        var asked = 0;
        LEVELS.forEach(function (level, i) {
          var result = D.certifyFloor(model9, EMPTY9, level, budget);
          if (i === 0 || D.tierTechniques(level, model9).length === 0) {
            expect([level, result]).toEqual([level, VACUOUS]);
            return;
          }
          asked++;
          expect([level, result]).toEqual([level,
            { required: false, vacuous: false, floorLevel: LEVELS[i - 1], unsolvedCount: 0 }]);
          expect(calls[asked - 1].options.allowedTechniques).toEqual(D.floorTechniques(level, model9));
        });
        expect(calls).toHaveLength(asked);
        expect(asked).toBeGreaterThan(5);
      });
    });

    it('passes exactly the floor, the uniqueness assumption, no steps and the stop on stuck to the solver',
      function () {
        var budget = { check: function () {} };
        var givens = new Int32Array(81);
        withSolver(function () { return reportOf('solved', 0); }, function (calls) {
          D.certifyFloor(killer, givens, 'normal', budget);
          expect(calls).toHaveLength(1);
          expect(calls[0].model).toBe(killer);
          expect(calls[0].givens).toBe(givens);
          expect(Object.keys(calls[0].options).sort()).toEqual(['allowedTechniques', 'assumeUniqueness',
            'budget', 'collectSteps', 'stopOnStuck']);
          expect(calls[0].options.allowedTechniques).toEqual(D.floorTechniques('normal', killer));
          expect(calls[0].options.allowedTechniques).toContain('cageCombo');
          expect(calls[0].options.assumeUniqueness).toBe(true);
          expect(calls[0].options.collectSteps).toBe(false);
          expect(calls[0].options.stopOnStuck).toBe(true);
        });
      });

    it('answers a stuck floor as required, with the cells left on the state of the report', function () {
      withSolver(function () { return reportOf('stuck', 42); }, function (calls) {
        expect(D.certifyFloor(model9, EMPTY9, 'normal', null))
          .toEqual({ required: true, vacuous: false, floorLevel: 'easy', unsolvedCount: 42 });
        expect(D.certifyFloor(model9, EMPTY9, 'expert', null))
          .toEqual({ required: true, vacuous: false, floorLevel: 'hard', unsolvedCount: 42 });
        expect(D.certifyFloor(model6, new Int32Array(36), 'hard', null))
          .toEqual({ required: true, vacuous: false, floorLevel: 'normal', unsolvedCount: 42 });
        expect(calls).toHaveLength(3);
      });
    });

    it('turns a contradiction into the unexpected error, never into a certificate', function () {
      withSolver(function () { return reportOf('contradiction', 7); }, function (calls) {
        var error = caught(function () { D.certifyFloor(model9, EMPTY9, 'hard', null); });
        expect(error instanceof SG.errors.GenerationError).toBe(true);
        expect(error.code).toBe('unexpected');
        expect(error.i18nArgs).toEqual({ reason: 'floorContradiction', level: 'hard' });
        expect(error.message).toBe('unexpected: floor solve returned contradiction');
        expect(calls).toHaveLength(1);
      });
    });

    it('answers VeryEasy and a level with an empty tier without a solve', function () {
      var weights = { xyWing: D.WEIGHTS.xyWing, xyzWing: D.WEIGHTS.xyzWing };
      withSolver(noSolve, function (calls) {
        expect(D.certifyFloor(model9, EMPTY9, 'veryEasy', null)).toEqual(VACUOUS);
        expect(D.certifyFloor(model9, EMPTY9, 'hell2', null)).toEqual(VACUOUS);
        expect(D.certifyFloor(killer, EMPTY9, 'hell2', { check: function () {} })).toEqual(VACUOUS);
        try {
          // Both techniques of Expert move to Normal: Expert keeps no tier of its own.
          D.WEIGHTS.xyWing = 300;
          D.WEIGHTS.xyzWing = 300;
          expect(D.tierTechniques('expert', model9)).toEqual([]);
          expect(D.certifyFloor(model9, EMPTY9, 'expert', null)).toEqual(VACUOUS);
        } finally {
          D.WEIGHTS.xyWing = weights.xyWing;
          D.WEIGHTS.xyzWing = weights.xyzWing;
        }
        expect(calls).toHaveLength(0);
        expect(D.tierTechniques('expert', model9)).toEqual(['xyWing', 'xyzWing']);
        var first = D.certifyFloor(model9, EMPTY9, 'veryEasy', null);
        first.required = false;
        expect(D.certifyFloor(model9, EMPTY9, 'veryEasy', null).required).toBe(true);
      });
    });

    it('checks the inherited budget first and gives that same object to the solver', function () {
      var log = [];
      var budget = { check: function () { log.push('check'); } };
      withSolver(function () { log.push('solve'); return reportOf('solved', 0); }, function (calls) {
        D.certifyFloor(model9, EMPTY9, 'normal', budget);
        expect(log).toEqual(['check', 'solve']);
        expect(calls[0].options.budget).toBe(budget);
        D.certifyFloor(model9, EMPTY9, 'normal');
        D.certifyFloor(model9, EMPTY9, 'normal', null);
        expect(calls[1].options.budget).toBeNull();
        expect(calls[2].options.budget).toBeNull();
        log.length = 0;
        D.certifyFloor(model9, EMPTY9, 'veryEasy', budget);
        expect(log).toEqual(['check']);
      });
    });

    it('lets a failure of the budget or of the solver escape unchanged, never as stuck or vacuous',
      function () {
        var sentinel = new Error('sentinel');
        var failing = { check: function () { throw sentinel; } };
        withSolver(noSolve, function (calls) {
          ['veryEasy', 'normal', 'hell2'].forEach(function (level) {
            expect(caught(function () { D.certifyFloor(model9, EMPTY9, level, failing); })).toBe(sentinel);
          });
          expect(calls).toHaveLength(0);
        });
        withSolver(function () { throw sentinel; }, function (calls) {
          expect(caught(function () { D.certifyFloor(model9, EMPTY9, 'normal', null); })).toBe(sentinel);
          expect(calls).toHaveLength(1);
        });
      });

    it('fails a cancelled or exhausted budget on every call, a vacuous one included', function () {
      var cancelled = SG.budget.create();
      cancelled.cancel();
      withSolver(noSolve, function (calls) {
        ['veryEasy', 'normal', 'hell2'].forEach(function (level) {
          expect(caught(function () { D.certifyFloor(model9, EMPTY9, level, cancelled); }).code)
            .toBe('budget.cancelled');
          var exhausted = SG.budget.create({ nodes: 0 });
          expect(caught(function () { D.certifyFloor(model9, EMPTY9, level, exhausted); }).code)
            .toBe('budget.exceeded');
        });
        expect(calls).toHaveLength(0);
      });
    });

    it('propagates invalid input, and reports contradictory givens as an error, not as required',
      function () {
        expect(caught(function () { D.certifyFloor(model9, new Int32Array(80), 'normal', null); }).code)
          .toBe('solver.invalidGivens');
        expect(caught(function () { D.certifyFloor(model9, EMPTY9, 'impossible', null); }).code)
          .toBe('difficulty.unknownLevel');
        var clash = new Int32Array(81);
        clash[0] = 5;
        clash[1] = 5;
        var checked = 0;
        LEVELS.forEach(function (level, i) {
          if (i === 0 || D.tierTechniques(level, model9).length === 0) return;
          var error = caught(function () { D.certifyFloor(model9, clash, level, null); });
          expect([level, error.code]).toEqual([level, 'unexpected']);
          expect([level, error.i18nArgs]).toEqual([level, { reason: 'floorContradiction', level: level }]);
          checked++;
        });
        expect(checked).toBeGreaterThan(5);
      });
  });

  describe('difficulty floor: requiredOf, from the technique counts of a rating', function () {
    function rating(counts, solved) {
      return { solved: solved !== false, level: 'normal', score: 250, techniqueCounts: counts };
    }

    /** The registered, weighted techniques that apply to a variant (all of them for no model). */
    function registered(variantId) {
      return SG.techniques.list().filter(function (tech) {
        return hasOwn.call(D.WEIGHTS, tech.id) &&
          (variantId === null || SG.techniques.appliesTo(tech, variantId));
      }).map(function (tech) { return tech.id; });
    }

    it('exports requiredOf and gives no verdict without a complete rating, before it looks at the level',
      function () {
        expect(typeof D.requiredOf).toBe('function');
        var unsolved = rating({ nakedSingle: 3, xWing: 1 }, false);
        [null, undefined, unsolved, { solved: 'yes', techniqueCounts: {} }, { techniqueCounts: {} }]
          .forEach(function (bad) {
            LEVELS.concat(['impossible']).forEach(function (level) {
              expect([level, D.requiredOf(bad, level, model9)]).toEqual([level, null]);
              expect([level, D.requiredOf(bad, level, null)]).toEqual([level, null]);
            });
          });
        expect(caught(function () { D.requiredOf(rating({}), 'impossible', model9); }).code)
          .toBe('difficulty.unknownLevel');
      });

    it('is vacuous, with exactly the three fields and no solve, for veryEasy and an empty tier', function () {
      withSolver(noSolve, function (calls) {
        MODELS.forEach(function (entry) {
          LEVELS.forEach(function (level, i) {
            var vacuous = i === 0 || D.tierTechniques(level, entry.model).length === 0;
            var result = D.requiredOf(rating({ nakedSingle: 4, nishio: 2 }), level, entry.model);
            var where = entry.name + ' ' + level;
            if (vacuous) {
              expect([where, result]).toEqual([where, { required: true, vacuous: true, floorLevel: null }]);
              expect([where, Object.keys(result).sort()])
                .toEqual([where, ['floorLevel', 'required', 'vacuous']]);
            } else {
              expect([where, result.vacuous]).toEqual([where, false]);
            }
          });
          var first = D.requiredOf(rating({}), 'veryEasy', entry.model);
          first.required = false;
          expect(D.requiredOf(rating({}), 'veryEasy', entry.model).required).toBe(true);
        });
        expect(calls).toHaveLength(0);
      });
    });

    it('is required exactly when a technique used is outside the floor of the level', function () {
      var checked = 0;
      MODELS.forEach(function (entry) {
        var ids = registered(variantOf(entry.model));
        LEVELS.forEach(function (level, i) {
          if (i === 0 || D.tierTechniques(level, entry.model).length === 0) return;
          var where = entry.name + ' ' + level;
          var floor = D.floorTechniques(level, entry.model);
          var inside = {};
          floor.forEach(function (id) { inside[id] = 2; });
          expect([where, D.requiredOf(rating(inside), level, entry.model)])
            .toEqual([where, { required: false, vacuous: false, floorLevel: LEVELS[i - 1] }]);
          minus(ids, floor).forEach(function (id) {
            var used = Object.assign({}, inside);
            used[id] = 1;
            expect([where, id, D.requiredOf(rating(used), level, entry.model).required])
              .toEqual([where, id, true]);
            used[id] = 0;
            expect([where, id, D.requiredOf(rating(used), level, entry.model).required])
              .toEqual([where, id, false]);
            checked++;
          });
        });
      });
      expect(checked).toBeGreaterThan(300);
      expect(D.requiredOf(rating({}), 'normal', model9).required).toBe(false);
      expect(D.requiredOf({ solved: true }, 'normal', model9).required).toBe(false);
    });

    it('uses the cage and sign techniques only where the variant has them', function () {
      // cageCombo and ineqChain are in the tier of Easy: Easy needs them, Normal (their floor) does not
      expect(D.requiredOf(rating({ nakedSingle: 5, cageCombo: 2 }), 'easy', killer).required).toBe(true);
      expect(D.requiredOf(rating({ nakedSingle: 5, cageCombo: 2 }), 'normal', killer).required).toBe(false);
      expect(D.requiredOf(rating({ nakedSingle: 5, ruleOf45: 1 }), 'normal', killer).required).toBe(true);
      expect(D.requiredOf(rating({ nakedSingle: 5, ineqChain: 2 }), 'easy', greater).required).toBe(true);
      expect(D.requiredOf(rating({ nakedSingle: 5, ineqChain: 2 }), 'normal', greater).required).toBe(false);
      expect(D.requiredOf(rating({ nakedSingle: 5, minMaxForcing: 1 }), 'normal', greater).required)
        .toBe(true);
      // a technique of another variant is no part of this floor
      expect(D.requiredOf(rating({ nakedSingle: 5, ineqChain: 2 }), 'normal', model9).required).toBe(true);
    });

    it('answers for a level the variant does not offer, and names an unoffered previous level', function () {
      expect(D.isSupported('normal', model6)).toBe(false);
      expect(D.requiredOf(rating({ nakedSingle: 9, nakedPair: 1 }), 'hard', model6))
        .toEqual({ required: false, vacuous: false, floorLevel: 'normal' });
      expect(D.requiredOf(rating({ nakedSingle: 9, hiddenTriple: 1 }), 'hard', model6))
        .toEqual({ required: false, vacuous: false, floorLevel: 'normal' });
      expect(D.requiredOf(rating({ nakedSingle: 9, xWing: 1 }), 'hard', model6))
        .toEqual({ required: true, vacuous: false, floorLevel: 'normal' });
      expect(D.requiredOf(rating({ nakedSingle: 9, hiddenPair: 1 }), 'normal', model6))
        .toEqual({ required: true, vacuous: false, floorLevel: 'easy' });
      expect(D.isSupported('easy', model4)).toBe(false);
      expect(D.requiredOf(rating({ pointing: 1 }), 'easy', model4))
        .toEqual({ required: true, vacuous: false, floorLevel: 'veryEasy' });
    });

    it('is pure: it solves and counts nothing, reads only the rating and keeps it as it was', function () {
      var counts = Object.freeze({ nakedSingle: 5, hiddenPair: 1 });
      var frozen = Object.freeze({ solved: true, level: 'normal', score: 250, techniqueCounts: counts });
      var used = [];
      var names = Object.keys(SG.dfs);
      var original = {};
      names.forEach(function (name) {
        original[name] = SG.dfs[name];
        SG.dfs[name] = function () { used.push(name); return original[name].apply(SG.dfs, arguments); };
      });
      try {
        withSolver(noSolve, function (calls) {
          expect(D.requiredOf(frozen, 'normal', model9)).toEqual({
            required: true, vacuous: false, floorLevel: 'easy' });
          expect(D.requiredOf(frozen, 'normal', model9)).toEqual(D.requiredOf(frozen, 'normal', model9));
          expect(calls).toHaveLength(0);
        });
      } finally {
        names.forEach(function (name) { SG.dfs[name] = original[name]; });
      }
      expect(used).toEqual([]);
      expect(counts).toEqual({ nakedSingle: 5, hiddenPair: 1 });
    });

    it('reads the weights on every call, like the sets it derives from', function () {
      var weight = D.WEIGHTS.pointing;
      var used = rating({ nakedSingle: 5, pointing: 2 });
      function verdicts() {
        return ['easy', 'normal', 'hard', 'expert'].map(function (level) {
          return D.requiredOf(used, level, model9).required;
        });
      }
      try {
        // pointing is in the tier of Easy and in the floor of Normal on
        expect(verdicts()).toEqual([true, false, false, false]);
        // 1.25 * 400 = 500: below the maximum of Hard (700) but not of Normal (400): the tier of Hard
        D.WEIGHTS.pointing = 400;
        expect(verdicts()).toEqual([true, true, true, false]);
      } finally {
        D.WEIGHTS.pointing = weight;
      }
      expect(verdicts()).toEqual([true, false, false, false]);
    });
  });

  describe('difficulty floor: the reference on the frozen puzzles, in a registry of its own', function () {
    var sandbox = null;

    /** A second complete engine registry with the classic and rated fixtures, built once. */
    function isolated() {
      var node = SG.test.node;
      if (!node || !node.vm || !node.fs) SG.test.skip('needs Node (vm and fs); skipped in the browser');
      if (sandbox !== null) return sandbox;
      var read = function (rel) {
        return node.fs.readFileSync(node.path.join(node.root, rel), 'utf8').replace(/^\uFEFF/, '');
      };
      var runner = read('tests/node-runner.js');
      var listed = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g) || [])
        .map(function (quoted) { return quoted.slice(1, -1); });
      var context = node.vm.createContext({});
      listed.filter(function (rel) {
        return /^(?:\.\.\/core\/js\/engine|js\/engine|js\/variants|assets\/wordlists)\//.test(rel);
      }).concat(['../core/tests/fixtures/classic.js', 'tests/fixtures/rated.js']).forEach(function (rel) {
        node.vm.runInContext(read(rel), context, { filename: node.path.join(node.root, rel) });
      });
      sandbox = {
        SG: context.SG,
        model: context.SG.variants.get('classic9').build({}, context.SG.rng.create(1)),
        unique: {}
      };
      return sandbox;
    }

    function puzzles(own, level) {
      return own.SG.fixtures.rated.constructed.filter(function (entry) { return entry.label === level; });
    }

    function givensOf(own, entry) {
      return own.SG.fixtures.classic.parse(entry.puzzle.replace(/\./g, '0'));
    }

    /** The caller's duty: the reference assumes the givens have one solution, so it is proved here, once. */
    function proveUnique(own, entry) {
      if (!hasOwn.call(own.unique, entry.name)) {
        own.unique[entry.name] = own.SG.dfs.countSolutions(own.model, givensOf(own, entry), 2, null);
      }
      expect([entry.name, own.unique[entry.name]]).toEqual([entry.name, 1]);
    }

    function reference(own, entry) {
      proveUnique(own, entry);
      return own.SG.difficulty.certifyFloor(own.model, givensOf(own, entry), entry.label, null);
    }

    it('does not share anything with the registry of the other suites', function () {
      var own = isolated();
      expect(own.SG).not.toBe(SG);
      expect(own.SG.logicalSolver.solve).not.toBe(SG.logicalSolver.solve);
      expect(own.SG.techniques.get('nakedPair')).not.toBe(SG.techniques.get('nakedPair'));
      expect(own.SG.difficulty.WEIGHTS).not.toBe(D.WEIGHTS);
    });

    // The labels and family certificates of the fixtures are rating v2's history: a label names the level
    // asked, and a certificate is no floor of rating v3 (a Nightmare puzzle needs no more than Master's).
    // These are the requested level (the label) and the verdict of the reference there, named explicitly:
    // the five old shallow certificates are Normal 1 and 3 and the three Nightmare puzzles.
    var LABELLED = [
      ['easy', [false, false, false]],
      ['normal', [false, true, false]],
      ['hard', [true, true, true]],
      ['expert', [true, true, true]],
      ['nightmare', [false, false, false]]
    ];

    LABELLED.forEach(function (row) {
      it('says of the three constructed ' + row[0] + ' puzzles: required ' + row[1].join(', '), function () {
        var own = isolated();
        var entries = puzzles(own, row[0]);
        var names = [1, 2, 3].map(function (n) { return 'constructed-' + row[0] + '-' + n; });
        expect(entries.map(function (entry) { return entry.name; })).toEqual(names);
        entries.forEach(function (entry, k) {
          var result = reference(own, entry);
          expect([entry.name, result.required]).toEqual([entry.name, row[1][k]]);
          expect([entry.name, result.vacuous]).toEqual([entry.name, false]);
          expect([entry.name, result.floorLevel]).toEqual([entry.name, LEVELS[LEVELS.indexOf(row[0]) - 1]]);
          expect([entry.name, result.unsolvedCount > 0]).toEqual([entry.name, result.required]);
        });
      });
    });

    it('says of the three constructed veryEasy puzzles that the certificate is vacuous, without a solve',
      function () {
        var own = isolated();
        var real = own.SG.logicalSolver.solve;
        var entries = puzzles(own, 'veryEasy');
        expect(entries).toHaveLength(3);
        entries.forEach(function (entry) { proveUnique(own, entry); });
        own.SG.logicalSolver.solve = function () { throw new Error('the solver must not run'); };
        try {
          entries.forEach(function (entry) {
            expect(reference(own, entry)).toEqual(VACUOUS);
          });
        } finally {
          own.SG.logicalSolver.solve = real;
        }
      });

    it('reports the cells that the floor techniques leave, as a solve with exactly those techniques does',
      function () {
        var own = isolated();
        var entry = puzzles(own, 'hard')[0];
        proveUnique(own, entry);
        var direct = own.SG.logicalSolver.solve(own.model, givensOf(own, entry), {
          allowedTechniques: own.SG.difficulty.floorTechniques('hard', own.model), collectSteps: false,
          assumeUniqueness: true, stopOnStuck: true
        });
        var open = 0;
        for (var c = 0; c < direct.state.value.length; c++) if (direct.state.value[c] === 0) open++;
        expect(direct.status).toBe('stuck');
        expect(open).toBeGreaterThan(0);
        expect(reference(own, entry).unsolvedCount).toBe(open);
      });

    it('counts no solutions and never completes by search: the caller has proved uniqueness', function () {
      var own = isolated();
      var entries = puzzles(own, 'easy').concat(puzzles(own, 'hard'));
      entries.forEach(function (entry) { proveUnique(own, entry); });
      var dfs = own.SG.dfs;
      var names = Object.keys(dfs);
      var original = {};
      var used = [];
      names.forEach(function (name) {
        original[name] = dfs[name];
        dfs[name] = function () {
          used.push(name);
          return original[name].apply(dfs, arguments);
        };
      });
      var required = [];
      try {
        entries.forEach(function (entry) {
          required.push(reference(own, entry).required);
        });
      } finally {
        names.forEach(function (name) { dfs[name] = original[name]; });
      }
      expect(required).toEqual([false, false, false, true, true, true]);
      expect(used).toEqual([]);
    });

    it('lets an exhausted budget escape from the middle of a solve', function () {
      var own = isolated();
      var entry = puzzles(own, 'hard')[0];
      proveUnique(own, entry);
      var budget = own.SG.budget.create({ nodes: 3 });
      var error = caught(function () {
        own.SG.difficulty.certifyFloor(own.model, givensOf(own, entry), 'hard', budget);
      });
      expect(error.code).toBe('budget.exceeded');
      expect(budget.nodes).toBeGreaterThan(1);
    });

    /** What requiredOf and the reference have in common (the reference adds the cells it left). */
    function plain(result) {
      return { required: result.required, vacuous: result.vacuous, floorLevel: result.floorLevel };
    }

    /**
     * The derived verdict of a fresh canonical rating against the reference at every level, with the same
     * model and givens. Uniqueness is proved first and independently, by the caller's duty. Returns the
     * rating.
     */
    function expectDerivedEqualsReference(own, model, givens, name) {
      expect([name, own.SG.dfs.countSolutions(model, givens, 2, null)]).toEqual([name, 1]);
      var rating = own.SG.difficulty.rate(model, givens);
      expect([name, rating.solved]).toEqual([name, true]);
      var asked = 0;
      LEVELS.forEach(function (level) {
        var derived = own.SG.difficulty.requiredOf(rating, level, model);
        var reference = own.SG.difficulty.certifyFloor(model, givens, level, null);
        expect([name, level, derived]).toEqual([name, level, plain(reference)]);
        if (!reference.vacuous) asked++;
      });
      expect(asked).toBeGreaterThan(4);
      return rating;
    }

    it('derives the verdict of the reference at every level on every published and constructed puzzle',
      function () {
        var own = isolated();
        var entries = own.SG.fixtures.rated.entries;
        expect(entries.length).toBeGreaterThanOrEqual(20);
        entries.forEach(function (entry) {
          expectDerivedEqualsReference(own, own.model, givensOf(own, entry), entry.name);
        });
      });

    it('says the same through requiredOf at the requested level of the old shallow certificates',
      function () {
        var own = isolated();
        LABELLED.forEach(function (row) {
          puzzles(own, row[0]).forEach(function (entry, k) {
            var rating = own.SG.difficulty.rate(own.model, givensOf(own, entry));
            expect([entry.name, own.SG.difficulty.requiredOf(rating, row[0], own.model)]).toEqual([entry.name,
              { required: row[1][k], vacuous: false, floorLevel: LEVELS[LEVELS.indexOf(row[0]) - 1] }]);
          });
        });
      });

    it('agrees with the v3Expected level and verdict of every rated puzzle (unrated: null and null)',
      function () {
        var own = isolated();
        own.SG.fixtures.rated.entries.forEach(function (entry) {
          var expected = entry.v3Expected;
          expect([entry.name, Object.keys(expected).sort()]).toEqual([entry.name, ['level', 'required']]);
          var rating = own.SG.difficulty.rate(own.model, givensOf(own, entry));
          if (expected.level === null) {
            expect([entry.name, rating.solved, expected.required]).toEqual([entry.name, false, null]);
            return;
          }
          expect([entry.name, rating.level]).toEqual([entry.name, expected.level]);
          var derived = own.SG.difficulty.requiredOf(rating, expected.level, own.model);
          expect([entry.name, derived.required]).toEqual([entry.name, expected.required]);
          var reference = own.SG.difficulty.certifyFloor(own.model, givensOf(own, entry), expected.level,
            null);
          expect([entry.name, reference.required]).toEqual([entry.name, expected.required]);
        });
      });

    // The puzzle of `SG.pipeline.run({ variantId: 'classic9', difficulty: 'normal', seed: 1 })` as generated
    // when rating v3 began: a real Normal that the techniques of Easy already solve (a shallow Normal).
    var NORMAL_SEED_1 = '2.8.6.1.99.4..8.5..5..2......6..24.....6.7.....74..9......4..9..8.3..2.43.2.8.6.5';

    it('says that the real Normal puzzle of seed 1 is shallow, derived and by the reference', function () {
      var own = isolated();
      var entry = { name: 'classic9 normal seed 1', puzzle: NORMAL_SEED_1 };
      expect(entry.puzzle).toHaveLength(81);
      var rating = expectDerivedEqualsReference(own, own.model, givensOf(own, entry), entry.name);
      expect(rating.level).toBe('normal');
      expect(own.SG.difficulty.requiredOf(rating, 'normal', own.model))
        .toEqual({ required: false, vacuous: false, floorLevel: 'easy' });
      expect(own.SG.difficulty.certifyFloor(own.model, givensOf(own, entry), 'normal', null))
        .toEqual({ required: false, vacuous: false, floorLevel: 'easy', unsolvedCount: 0 });
    });

    function generated(own, variantId, level) {
      return own.SG.pipeline.run({ variantId: variantId, difficulty: level, seed: 1, trace: 'off' }, null);
    }

    it('equals the reference on small generated samples of classic9, Killer, Jigsaw and Greater-Than',
      function () {
        var own = isolated();
        [['classic9', 'normal'], ['classic9', 'hard'], ['killer', 'easy'], ['killer', 'normal'],
          ['jigsaw9', 'hard'], ['greaterThan', 'easy'], ['greaterThan', 'normal']].forEach(function (cell) {
          var made = generated(own, cell[0], cell[1]);
          expect(made.model.variantId).toBe(cell[0]);
          expectDerivedEqualsReference(own, made.model, made.givens, cell[0] + ' ' + cell[1] + ' seed 1');
        });
      });

    it('is right for a changed sign or cage model once that model is rated again', function () {
      var own = isolated();
      var gt = generated(own, 'greaterThan', 'normal');
      var killerMade = generated(own, 'killer', 'easy');

      // one more sign, true in the solution, between two neighbours that have none yet; the first one whose
      // rating differs from the rating of the puzzle (a sign that adds no deduction would prove nothing)
      var signed = {};
      gt.model.inequalities.forEach(function (s) {
        signed[Math.min(s.a, s.b) + ',' + Math.max(s.a, s.b)] = true;
      });
      var gtBefore = own.SG.difficulty.rate(gt.model, gt.givens);
      var signModel = null;
      for (var c = 0; c < 80 && signModel === null; c++) {
        if (c % 9 !== 8 && !signed[c + ',' + (c + 1)]) {
          var moreSign = gt.solution[c] < gt.solution[c + 1] ? { a: c, b: c + 1 } : { a: c + 1, b: c };
          var candidate = Object.assign({}, gt.model,
            { inequalities: gt.model.inequalities.concat([moreSign]) });
          var counts = own.SG.difficulty.rate(candidate, gt.givens).techniqueCounts;
          if (JSON.stringify(counts) !== JSON.stringify(gtBefore.techniqueCounts)) signModel = candidate;
        }
      }
      expect(signModel).not.toBe(null);

      // every third cage of two or more cells falls apart into its first cell and the rest (sums: solution)
      var sumOf = function (cells) {
        return cells.reduce(function (total, cell) { return total + killerMade.solution[cell]; }, 0);
      };
      var split = [];
      killerMade.model.cages.forEach(function (cage, k) {
        var cells = Array.from(cage.cells);
        if (cells.length < 2 || k % 3 !== 0) {
          split.push(cage);
          return;
        }
        [cells.slice(0, 1), cells.slice(1)].forEach(function (part) {
          split.push({ cells: cage.cells.constructor.from(part), sum: sumOf(part), distinct: true });
        });
      });
      var cageModel = Object.assign({}, killerMade.model, { cages: split });
      expect(split.length).toBeGreaterThan(killerMade.model.cages.length);

      [[gt, signModel, 'one more sign'], [killerMade, cageModel, 'split cages']].forEach(function (row) {
        var before = own.SG.difficulty.rate(row[0].model, row[0].givens);
        var after = expectDerivedEqualsReference(own, row[1], row[0].givens, row[2]);
        expect([row[2], after.techniqueCounts]).not.toEqual([row[2], before.techniqueCounts]);
        // requiredOf cannot tell a stale rating of the old model: it reads the counts and the variant only
        expect(own.SG.difficulty.requiredOf(before, 'normal', row[1]))
          .toEqual(own.SG.difficulty.requiredOf(before, 'normal', row[0].model));
      });
    });
  });
})();

