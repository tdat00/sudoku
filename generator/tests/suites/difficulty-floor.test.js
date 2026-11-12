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
    [
      ['easy', [false, false, false]],
      ['normal', [false, true, false]],
      ['hard', [true, true, true]],
      ['expert', [true, true, true]],
      ['nightmare', [false, false, false]]
    ].forEach(function (row) {
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
  });
})();

