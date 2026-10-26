// Logical solver framework: the technique registry (techniques.js), the solve loop
// (logical-solver.js) and the shared technique test helper (tests/fixtures/techniques-helper.js).
//
// The tests register TEMPORARY stub techniques (ids starting with "stub") and remove them again in
// afterEach, so the registry that other suites (and the real techniques) see is never touched.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var F = SG.fixtures.classic;
  var H = SG.techHelper;
  var model9 = SG.classicModel.build(9);
  var model6 = SG.classicModel.build(6);
  var model4 = SG.classicModel.build(4);

  var SINGLES = ['stubNakedSingle', 'stubHiddenSingle'];
  // Labelled easy in the fixtures: plain naked singles solve them.
  var EASY = ['wikipedia-example', 'classic-easy', 'classic-easy-2'];
  // Not easy, but still solved by singles once hidden singles are allowed.
  var NEEDS_HIDDEN = ['classic-medium', 'hard-17-clues'];
  // A classic4 grid for the hand-worked checks: rows 1234 / 3412 / 2143 / 4321.
  var SOLUTION4 = '1234341221434321';
  var debugAtLoad = SG.DEBUG;
  var registered = [];

  // Stub techniques and small helpers
  function reg(def) {
    var stored = SG.techniques.register(def);
    registered.push(stored.id);
    return stored;
  }

  afterEach(function () {
    registered.splice(0).forEach(function (id) { SG.techniques.unregister(id); });
    SG.setDebug(debugAtLoad);
  });

  function finding(id, cells, placements, eliminations) {
    return {
      technique: id,
      cells: cells,
      placements: placements,
      eliminations: eliminations,
      i18nKey: 'test.' + id + '.step',
      i18nArgs: { cell: cells[0] }
    };
  }

  function stubDef(id, baseCost, order, find, extra) {
    return Object.assign({
      id: id,
      group: 'basic',
      baseCost: baseCost,
      order: order,
      i18nKey: 'test.' + id,
      variantScope: null,
      assumesUniqueness: false,
      find: find
    }, extra);
  }

  function noFinding() { return null; }

  function findNakedSingle(model, state) {
    var cand = state.candidates;
    var val = state.value;
    for (var c = 0; c < model.cellCount; c++) {
      var m = cand[c];
      if (val[c] === 0 && m !== 0 && (m & (m - 1)) === 0) {
        return finding('stubNakedSingle', [c], [[c, 32 - Math.clz32(m)]], []);
      }
    }
    return null;
  }

  function findHiddenSingle(model, state, ctx) {
    var cand = state.candidates;
    var val = state.value;
    for (var u = 0; u < model.units.length; u++) {
      if (ctx.completeUnits[u] === 0) continue;
      var cells = model.units[u];
      var once = 0;
      var twice = 0;
      var placed = 0;
      var i;
      for (i = 0; i < cells.length; i++) {
        var c = cells[i];
        if (val[c] !== 0) {
          placed |= 1 << (val[c] - 1);
        } else {
          twice |= once & cand[c];
          once |= cand[c];
        }
      }
      var hidden = once & ~twice & ~placed;
      if (hidden !== 0) {
        var bit = hidden & -hidden;
        for (i = 0; i < cells.length; i++) {
          if (val[cells[i]] === 0 && (cand[cells[i]] & bit) !== 0) {
            return finding('stubHiddenSingle', [cells[i]], [[cells[i], 32 - Math.clz32(bit)]], []);
          }
        }
      }
    }
    return null;
  }

  function registerSingles() {
    reg(stubDef('stubNakedSingle', 1, 10, findNakedSingle));
    reg(stubDef('stubHiddenSingle', 2, 20, findHiddenSingle));
  }

  function entry(name) {
    return F.unique.filter(function (e) { return e.name === name; })[0];
  }

  function puzzle(name) { return F.parse(entry(name).puzzle); }

  function blank() { return new Int32Array(81); }

  function emptyCount(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] === 0) n++;
    return n;
  }

  /** solve() on classic9 unless a model is given. */
  function run(givens, options, model) {
    return SG.logicalSolver.solve(model || model9, givens, options);
  }

  function solveSingles(model, givens, extra) {
    return SG.logicalSolver.solve(model, givens, Object.assign({ allowedTechniques: SINGLES }, extra));
  }

  function thrown(fn) {
    try { fn(); } catch (e) { return e; }
    return null;
  }

  function expectCode(fn, code, textPart) {
    var err = thrown(fn);
    expect(err).toBeTruthy();
    expect(err instanceof SG.errors.GenerationError).toBe(true);
    expect(err.code).toBe(code);
    if (textPart !== undefined) expect(err.message).toContain(textPart);
    return err;
  }

  /** Singles only, done by the propagation engine: the independent oracle for the stub based solver. */
  function propagated(model, givens) {
    var state = SG.model.initState(model);
    for (var c = 0; c < model.cellCount; c++) {
      if (givens[c] !== 0 && !SG.constraints.assign(model, state, c, givens[c])) return null;
    }
    return SG.constraints.propagate(model, state) ? state : null;
  }

  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  function bestOf(rounds, fn) {
    var best = Infinity;
    for (var r = 0; r < rounds; r++) {
      var t = now();
      fn();
      best = Math.min(best, now() - t);
    }
    return best;
  }

  /** A random puzzle with a unique solution, dug down to a minimal one (a mix of easy and stuck cases). */
  function randomPuzzle(model, seed, minClues) {
    var rng = SG.testkit.rng.create(seed);
    var solution = SG.testkit.randomSolution(model, rng.fork('grid'));
    var dug = SG.testkit.dig(model, solution, rng.fork('dig'), { symmetry: 'none', minClues: minClues || 0 });
    return { givens: dug.givens, solution: solution };
  }

  describe('SG.techniques registry', function () {
    function valid(overrides) {
      return stubDef('stubRegistryProbe', 5, 50, noFinding, overrides);
    }

    it('registers, gets, lists, reports and unregisters a technique', function () {
      var before = SG.techniques.list().length;
      var stored = reg(valid());
      expect(stored.id).toBe('stubRegistryProbe');
      expect(SG.techniques.has('stubRegistryProbe')).toBe(true);
      expect(SG.techniques.get('stubRegistryProbe')).toBe(stored);
      expect(SG.techniques.list().length).toBe(before + 1);
      expect(SG.techniques.unregister('stubRegistryProbe')).toBe(true);
      expect(SG.techniques.has('stubRegistryProbe')).toBe(false);
      expect(SG.techniques.unregister('stubRegistryProbe')).toBe(false);
      expect(SG.techniques.list().length).toBe(before);
    });

    it('get throws a GenerationError for an unknown id', function () {
      expectCode(function () { SG.techniques.get('noSuchTechnique'); }, 'technique.unknown',
        'noSuchTechnique');
    });

    it('exposes the eight groups', function () {
      expect(SG.techniques.GROUPS)
        .toEqual(['basic', 'locked', 'subset', 'fish', 'wing', 'chain', 'cage', 'ineq']);
    });

    it('rejects a duplicate id', function () {
      reg(valid());
      expectCode(function () { SG.techniques.register(valid()); }, 'technique.duplicate',
        'stubRegistryProbe');
    });

    it('rejects every missing or invalid required field with an error that names the field', function () {
      var cases = [
        [{ id: undefined }, 'id'], [{ id: '' }, 'id'], [{ id: '1abc' }, 'id'], [{ id: '__proto__' }, 'id'],
        [{ group: undefined }, 'group'], [{ group: 'bogus' }, 'group'],
        [{ baseCost: undefined }, 'baseCost'], [{ baseCost: 'cheap' }, 'baseCost'],
        [{ baseCost: 0 }, 'baseCost'], [{ baseCost: -3 }, 'baseCost'], [{ baseCost: NaN }, 'baseCost'],
        [{ baseCost: Infinity }, 'baseCost'],
        [{ order: undefined }, 'order'], [{ order: '5' }, 'order'], [{ order: NaN }, 'order'],
        [{ i18nKey: undefined }, 'i18nKey'], [{ i18nKey: '' }, 'i18nKey'],
        [{ variantScope: 'killer' }, 'variantScope'], [{ variantScope: [] }, 'variantScope'],
        [{ variantScope: [1] }, 'variantScope'],
        [{ assumesUniqueness: 'yes' }, 'assumesUniqueness'],
        [{ find: undefined }, 'find'], [{ find: 'not a function' }, 'find']
      ];
      cases.forEach(function (c) {
        var def = valid(c[0]);
        Object.keys(c[0]).forEach(function (k) { if (c[0][k] === undefined) delete def[k]; });
        var err = expectCode(function () { SG.techniques.register(def); }, 'technique.invalidDef');
        expect(err.message).toContain(c[1]);
        expect(SG.techniques.has('stubRegistryProbe')).toBe(false);
      });
    });

    it('rejects a non-object definition', function () {
      expectCode(function () { SG.techniques.register(null); }, 'technique.invalidDef');
      expectCode(function () { SG.techniques.register('xWing'); }, 'technique.invalidDef');
    });

    it('rejects unknown fields, so a typo such as assumeUniqueness cannot slip through', function () {
      var err = expectCode(function () {
        SG.techniques.register(valid({ assumeUniqueness: true }));
      }, 'technique.invalidDef', 'assumeUniqueness');
      expect(err.message).toContain('unknown field');
    });

    it('treats variantScope and assumesUniqueness as optional: defaults null and false', function () {
      var def = valid();
      delete def.variantScope;
      delete def.assumesUniqueness;
      var stored = reg(def);
      expect(stored.variantScope).toBeNull();
      expect(stored.assumesUniqueness).toBe(false);
    });

    it('keeps assumesUniqueness and variantScope, and stores a frozen copy', function () {
      var scope = ['killer'];
      var stored = reg(valid({ assumesUniqueness: true, variantScope: scope }));
      expect(stored.assumesUniqueness).toBe(true);
      expect(stored.variantScope).toEqual(['killer']);
      scope.push('classic9');
      expect(stored.variantScope).toEqual(['killer']);
      expect(Object.isFrozen(stored)).toBe(true);
      expect(Object.isFrozen(stored.variantScope)).toBe(true);
    });

    it('keeps list() sorted by order, then baseCost, then id, whatever the registration order', function () {
      reg(stubDef('stubC', 5, 300, noFinding));
      reg(stubDef('stubA', 9, 100, noFinding));
      reg(stubDef('stubB2', 5, 200, noFinding));
      reg(stubDef('stubB1', 5, 200, noFinding));
      reg(stubDef('stubB0', 4, 200, noFinding));
      var ids = SG.techniques.list().map(function (t) { return t.id; })
        .filter(function (id) { return /^stub[ABC]/.test(id); });
      expect(ids).toEqual(['stubA', 'stubB0', 'stubB1', 'stubB2', 'stubC']);
      var all = SG.techniques.list();
      for (var i = 1; i < all.length; i++) expect(all[i - 1].order).toBeLessThanOrEqual(all[i].order);
    });

    it('re-sorts after unregister and returns a fresh array each time', function () {
      reg(stubDef('stubFirst', 1, -500, noFinding));
      var list = SG.techniques.list();
      expect(list[0].id).toBe('stubFirst');
      list.length = 0;
      expect(SG.techniques.list()[0].id).toBe('stubFirst');
      SG.techniques.unregister('stubFirst');
      expect(SG.techniques.list().some(function (t) { return t.id === 'stubFirst'; })).toBe(false);
    });

    it('appliesTo honours variantScope', function () {
      var all = reg(stubDef('stubAll', 1, 1, noFinding));
      var scoped = reg(stubDef('stubScoped', 1, 2, noFinding, { variantScope: ['killer', 'x'] }));
      expect(SG.techniques.appliesTo(all, 'classic9')).toBe(true);
      expect(SG.techniques.appliesTo(scoped, 'classic9')).toBe(false);
      expect(SG.techniques.appliesTo(scoped, 'killer')).toBe(true);
    });
  });

  describe('SG.techniques.createContext', function () {
    it('provides check, budget, digits, fullMask, completeUnits and the options', function () {
      var ctx = SG.techniques.createContext(model9, { maxChainLength: 7 });
      expect(ctx.digits).toBe(9);
      expect(ctx.fullMask).toBe(511);
      expect(ctx.assumeUniqueness).toBe(true);
      expect(ctx.budget).toBeNull();
      expect(ctx.options.maxChainLength).toBe(7);
      expect(ctx.completeUnits).toBeInstanceOf(Uint8Array);
      expect(ctx.completeUnits.length).toBe(27);
      expect(Array.from(ctx.completeUnits).every(function (x) { return x === 1; })).toBe(true);
      ctx.check();
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    it('check() calls the budget; assumeUniqueness:false is carried', function () {
      var budget = SG.budget.create({ nodes: 2 });
      var ctx = SG.techniques.createContext(model9, { budget: budget, assumeUniqueness: false });
      expect(ctx.assumeUniqueness).toBe(false);
      ctx.check();
      ctx.check();
      expectCode(function () { ctx.check(); }, 'budget.exceeded');
    });

    it('marks a partial unit as not complete', function () {
      var model = SG.model.create({
        variantId: 'stub-partial',
        digits: 4,
        units: model4.units.map(function (u) { return Array.from(u); }).concat([[0, 5, 10]]),
        unitMeta: model4.unitMeta.concat([{ kind: 'diag', gridIndex: 0, label: 'D', partial: true }]),
        layout: model4.layout
      });
      var flags = Array.from(SG.techniques.createContext(model).completeUnits);
      expect(flags.length).toBe(13);
      expect(flags.slice(0, 12).every(function (x) { return x === 1; })).toBe(true);
      expect(flags[12]).toBe(0);
    });
  });

  describe('solve: easy puzzles with singles only', function () {
    EASY.forEach(function (name) {
      it('solves ' + name + ' with allowedTechniques [nakedSingle, hiddenSingle]', function () {
        registerSingles();
        var report = solveSingles(model9, puzzle(name));
        expect(report.solved).toBe(true);
        expect(report.status).toBe('solved');
        expect(report.state.unsolvedCount).toBe(0);
        expect(Array.from(report.state.value)).toEqual(Array.from(F.parse(entry(name).solution)));
        expect(SG.model.isSolution(model9, report.state.value)).toBe(true);
        expect(report.solution).toBeNull();
      });
    });

    it('the singles-solvable fixtures are the EASY ones plus two that need hidden singles', function () {
      var viaEngine = F.unique.filter(function (e) {
        var state = propagated(model9, F.parse(e.puzzle));
        return state !== null && state.unsolvedCount === 0;
      }).map(function (e) { return e.name; });
      expect(viaEngine.sort()).toEqual(EASY.concat(NEEDS_HIDDEN).sort());
    });

    NEEDS_HIDDEN.forEach(function (name) {
      it('solves ' + name + ', which needs hidden singles, and attributes them', function () {
        registerSingles();
        var report = solveSingles(model9, puzzle(name));
        expect(report.solved).toBe(true);
        expect(Array.from(report.state.value)).toEqual(Array.from(F.parse(entry(name).solution)));
        expect(report.techniqueCounts.stubNakedSingle).toBeGreaterThan(0);
        expect(report.techniqueCounts.stubHiddenSingle).toBeGreaterThan(0);
        expect(report.hardestTechnique).toBe('stubHiddenSingle');
      });
    });

    it('does not modify the givens and returns an independent state each time', function () {
      registerSingles();
      var givens = puzzle('classic-easy');
      var copy = Int32Array.from(givens);
      var a = solveSingles(model9, givens);
      var b = solveSingles(model9, givens);
      expect(givens).toEqual(copy);
      expect(a.state).not.toBe(b.state);
      expect(a.state.value).not.toBe(b.state.value);
      expect(a).toEqual(b);
    });

    it('works with plain arrays as givens', function () {
      registerSingles();
      expect(solveSingles(model9, Array.from(puzzle('classic-easy'))).solved).toBe(true);
    });

    it('records one step per application, each of them a sound, real change', function () {
      registerSingles();
      var givens = puzzle('classic-easy');
      var solution = F.parse(entry('classic-easy').solution);
      var report = solveSingles(model9, givens);
      expect(report.steps.length).toBe(emptyCount(givens));
      var filled = new Int32Array(81);
      report.steps.forEach(function (step) {
        expect(Object.keys(step))
          .toEqual(['technique', 'i18nKey', 'i18nArgs', 'cells', 'eliminations', 'placements']);
        expect(SINGLES).toContain(step.technique);
        expect(step.i18nKey).toBe('test.' + step.technique + '.step');
        expect(step.placements.length).toBe(1);
        expect(step.eliminations).toEqual([]);
        var cell = step.placements[0][0];
        expect(step.cells).toEqual([cell]);
        expect(givens[cell]).toBe(0);
        expect(filled[cell]).toBe(0);
        filled[cell] = step.placements[0][1];
        expect(step.placements[0][1]).toBe(solution[cell]);
      });
      var total = 0;
      Object.keys(report.techniqueCounts).forEach(function (id) { total += report.techniqueCounts[id]; });
      expect(total).toBe(report.steps.length);
    });

    it('agrees with the propagation engine on every fixture, solved or stuck (same fixpoint)', function () {
      registerSingles();
      F.unique.concat(F.multi).forEach(function (e) {
        var givens = F.parse(e.puzzle);
        var oracle = propagated(model9, givens);
        var report = solveSingles(model9, givens, { collectSteps: false });
        expect(oracle).toBeTruthy();
        expect(report.solved).toBe(oracle.unsolvedCount === 0);
        expect(Array.from(report.state.value)).toEqual(Array.from(oracle.value));
        expect(Array.from(report.state.candidates)).toEqual(Array.from(oracle.candidates));
        expect(report.state.unsolvedCount).toBe(oracle.unsolvedCount);
      });
    });

    [['classic4', model4, 24], ['classic6', model6, 24], ['classic9', model9, 24]].forEach(function (c) {
      it('agrees with the propagation engine on random ' + c[0] + ' puzzles', function () {
        registerSingles();
        var solved = 0;
        for (var seed = 1; seed <= c[2]; seed++) {
          var p = randomPuzzle(c[1], 500 + seed);
          var oracle = propagated(c[1], p.givens);
          var report = solveSingles(c[1], p.givens, { collectSteps: false });
          expect(report.solved).toBe(oracle.unsolvedCount === 0);
          expect(Array.from(report.state.value)).toEqual(Array.from(oracle.value));
          expect(Array.from(report.state.candidates)).toEqual(Array.from(oracle.candidates));
          if (report.solved) {
            solved++;
            expect(Array.from(report.state.value)).toEqual(Array.from(p.solution));
          }
        }
        expect(solved).toBeGreaterThan(0);
      });
    });

    it('agrees with the propagation engine on a 12x12 grid (3x4 boxes) too', function () {
      registerSingles();
      var model = SG.fixtures.models.boxGrid('test-mega12', 3, 4);
      var p = randomPuzzle(model, 77, 100);
      var oracle = propagated(model, p.givens);
      var report = solveSingles(model, p.givens, { collectSteps: false });
      expect(report.solved).toBe(oracle.unsolvedCount === 0);
      expect(Array.from(report.state.candidates)).toEqual(Array.from(oracle.candidates));
      expect(report.solved).toBe(true);
    });
  });

  describe('solve: stuck puzzles and other end states never throw', function () {
    it('a puzzle that needs more than singles returns solved:false with the stuck state', function () {
      registerSingles();
      var report;
      expect(function () { report = solveSingles(model9, puzzle('escargot')); }).not.toThrow();
      expect(report.solved).toBe(false);
      expect(report.status).toBe('stuck');
      expect(report.state.unsolvedCount).toBeGreaterThan(0);
      expect(report.state.unsolvedCount).toBeLessThan(81);
      // Stuck for real: neither single technique finds anything in the returned position.
      var ctx = SG.techniques.createContext(model9);
      expect(findNakedSingle(model9, report.state, ctx)).toBeNull();
      expect(findHiddenSingle(model9, report.state, ctx)).toBeNull();
      // The position is still consistent with the real solution.
      var solution = F.parse(entry('escargot').solution);
      for (var c = 0; c < 81; c++) {
        expect((report.state.candidates[c] & (1 << (solution[c] - 1))) !== 0).toBe(true);
        if (report.state.value[c] !== 0) expect(report.state.value[c]).toBe(solution[c]);
      }
    });

    it('every fixture that is not solved is reported as stuck, never as an error', function () {
      registerSingles();
      F.unique.concat(F.multi).forEach(function (e) {
        var report = solveSingles(model9, F.parse(e.puzzle));
        expect(report.status).toBe(report.solved ? 'solved' : 'stuck');
      });
    });

    it('an empty grid is stuck at once: no steps, score = empty cells x 0.6, no hardest', function () {
      registerSingles();
      var report = solveSingles(model9, blank());
      expect(report.solved).toBe(false);
      expect(report.status).toBe('stuck');
      expect(report.steps).toEqual([]);
      expect(report.techniqueCounts).toEqual({});
      expect(report.hardestTechnique).toBeNull();
      expect(report.score).toBeCloseTo(48.6, 6);
    });

    it('a complete valid grid is solved without any step', function () {
      registerSingles();
      var report = solveSingles(model9, F.parse(entry('classic-easy').solution));
      expect(report.solved).toBe(true);
      expect(report.steps).toEqual([]);
      expect(report.score).toBe(0);
      expect(report.hardestTechnique).toBeNull();
    });

    it('contradictory givens give status contradiction, not an exception', function () {
      registerSingles();
      F.contradictory.forEach(function (e) {
        var report = solveSingles(model9, F.parse(e.puzzle));
        expect(report.solved).toBe(false);
        expect(['contradiction', 'stuck']).toContain(report.status);
      });
      expect(solveSingles(model9, F.parse(F.contradictory[0].puzzle)).status).toBe('contradiction');
      expect(solveSingles(model9, F.parse(F.contradictory[1].puzzle)).status).toBe('contradiction');
    });

    it('a complete grid that breaks a rule is a contradiction, not a solution', function () {
      registerSingles();
      var bad = Int32Array.from(F.parse(entry('classic-easy').solution));
      var t = bad[0];
      bad[0] = bad[1];
      bad[1] = t;
      var report = solveSingles(model9, bad);
      expect(report.solved).toBe(false);
      expect(report.status).toBe('contradiction');
    });

    it('rejects givens of the wrong length or with a value outside 0..D', function () {
      registerSingles();
      expectCode(function () { solveSingles(model9, new Int32Array(80)); }, 'solver.invalidGivens');
      expectCode(function () { solveSingles(model9, null); }, 'solver.invalidGivens');
      var bad = blank();
      bad[3] = 10;
      expectCode(function () { solveSingles(model9, bad); }, 'solver.invalidGivens', 'givens[3]');
      bad[3] = -1;
      expectCode(function () { solveSingles(model9, bad); }, 'solver.invalidGivens');
      var plain = new Array(81).fill(0);
      plain[3] = 1.5;
      expectCode(function () { solveSingles(model9, plain); }, 'solver.invalidGivens', 'givens[3]');
    });

    it('a technique that leads into a contradiction ends the solve as one, without throwing', function () {
      reg(stubDef('stubWrongPlacement', 1, 5, function (model, state) {
        // Claims 1 for the first open cell even when 1 is not a candidate there.
        for (var c = 0; c < model.cellCount; c++) {
          if (state.value[c] === 0 && (state.candidates[c] & 1) === 0) {
            return finding('stubWrongPlacement', [c], [[c, 1]], []);
          }
        }
        return null;
      }));
      var report = run(puzzle('classic-easy'), { allowedTechniques: ['stubWrongPlacement'] });
      expect(report.solved).toBe(false);
      expect(report.status).toBe('contradiction');
    });
  });

  describe('solve: the technique ladder', function () {
    it('tries techniques in ascending order and restarts from the cheapest after every step', function () {
      var log = [];
      var used = 0;
      reg(stubDef('stubLow', 1, 1, function () { log.push('low'); return null; }));
      reg(stubDef('stubMid', 1, 2, function () {
        log.push('mid');
        if (used >= 3) return null;
        return finding('stubMid', [0], [], [[0, 9 - used++]]);
      }));
      // Registered last but sorting first: it must still run first.
      reg(stubDef('stubEarly', 1, 0, function () { log.push('early'); return null; }));
      var report = run(blank(), { allowedTechniques: ['stubMid', 'stubLow', 'stubEarly'] });
      expect(report.status).toBe('stuck');
      expect(report.steps.length).toBe(3);
      var pass = ['early', 'low', 'mid'];
      expect(log).toEqual(pass.concat(pass, pass, pass));
    });

    it('applies the cheapest technique that finds something and starts over', function () {
      var cheapSteps = 4;
      reg(stubDef('stubCheap', 3, 10, function (model, state) {
        var m = state.candidates[0];
        if (cheapSteps === 0 || SG.bits.popcount(m) <= 2) return null;
        cheapSteps--;
        return finding('stubCheap', [0], [], [[0, 32 - Math.clz32(m)]]);
      }));
      reg(stubDef('stubDear', 7, 20, function (model, state) {
        var m = state.candidates[1];
        if (SG.bits.popcount(m) <= 2) return null;
        return finding('stubDear', [1], [], [[1, 32 - Math.clz32(m)]]);
      }));
      var report = run(blank(), { allowedTechniques: ['stubCheap', 'stubDear'] });
      var order = report.steps.map(function (s) { return s.technique; });
      // The dear technique is always applicable, yet the cheap one gets all its turns first.
      expect(order.slice(0, 4)).toEqual(['stubCheap', 'stubCheap', 'stubCheap', 'stubCheap']);
      expect(order.slice(4)).toEqual(new Array(7).fill('stubDear'));
      expect(report.techniqueCounts).toEqual({ stubCheap: 4, stubDear: 7 });
      expect(report.hardestTechnique).toBe('stubDear');
    });

    it('reports techniqueCounts in ladder order and breaks a cost tie by the later technique', function () {
      reg(stubDef('stubTwo', 5, 20, function (model, state) {
        var m = state.candidates[2];
        return SG.bits.popcount(m) > 1 ? finding('stubTwo', [2], [], [[2, 32 - Math.clz32(m)]]) : null;
      }));
      reg(stubDef('stubOne', 5, 10, function (model, state) {
        var m = state.candidates[3];
        return SG.bits.popcount(m) > 1 ? finding('stubOne', [3], [], [[3, 32 - Math.clz32(m)]]) : null;
      }));
      var report = run(blank(), { allowedTechniques: ['stubTwo', 'stubOne'], collectSteps: false });
      expect(Object.keys(report.techniqueCounts)).toEqual(['stubOne', 'stubTwo']);
      expect(report.hardestTechnique).toBe('stubTwo');
    });

    it('allowedTechniques null or missing uses every registered technique, a list only those', function () {
      var runs = 0;
      reg(stubDef('stubProbeFirst', 1, -1e9, function () {
        if (runs > 0) return null;
        runs++;
        return finding('stubProbeFirst', [0], [], [[0, 9]]);
      }));
      var all = run(blank(), { allowedTechniques: null, collectSteps: false });
      expect(all.techniqueCounts.stubProbeFirst).toBe(1);
      runs = 0;
      expect(run(blank(), { collectSteps: false }).techniqueCounts.stubProbeFirst).toBe(1);
      runs = 0;
      registerSingles();
      var some = run(blank(), { allowedTechniques: SINGLES, collectSteps: false });
      expect(some.techniqueCounts.stubProbeFirst).toBeUndefined();
      expect(runs).toBe(0);
    });

    it('allowedTechniques [] runs nothing; an unknown id throws and names it', function () {
      registerSingles();
      var report = run(puzzle('classic-easy'), { allowedTechniques: [] });
      expect(report.status).toBe('stuck');
      expect(report.steps).toEqual([]);
      expectCode(function () {
        run(blank(), { allowedTechniques: ['stubNakedSingle', 'noSuchTech'] });
      }, 'solver.unknownTechnique', 'noSuchTech');
    });

    it('with only nakedSingle allowed, a puzzle that needs hidden singles is not solved', function () {
      registerSingles();
      var givens = puzzle('classic-medium');
      var naked = run(givens, { allowedTechniques: ['stubNakedSingle'] });
      var both = solveSingles(model9, givens);
      expect(both.solved).toBe(true);
      expect(both.techniqueCounts.stubHiddenSingle).toBeGreaterThan(0);
      expect(naked.solved).toBe(false);
      expect(naked.status).toBe('stuck');
      expect(naked.techniqueCounts.stubHiddenSingle).toBeUndefined();
      expect(naked.state.unsolvedCount).toBeGreaterThan(0);
    });

    it('a variantScope [killer] technique never runs for classic9, but does for a killer model', function () {
      registerSingles();
      var calls = 0;
      reg(stubDef('stubKillerOnly', 1, 5, function () { calls++; return null; },
        { variantScope: ['killer'] }));
      var ids = SINGLES.concat(['stubKillerOnly']);
      expect(run(puzzle('classic-easy'), { allowedTechniques: ids }).solved).toBe(true);
      expect(run(puzzle('classic-easy')).solved).toBe(true);
      expect(calls).toBe(0);

      var killerModel = SG.fixtures.models.boxGrid('killer', 3, 3);
      expect(killerModel.variantId).toBe('killer');
      run(puzzle('classic-easy'), { allowedTechniques: ids }, killerModel);
      expect(calls).toBeGreaterThan(0);
    });

    it('assumeUniqueness:false skips assumesUniqueness techniques, true (default) runs them', function () {
      registerSingles();
      var calls = 0;
      reg(stubDef('stubUnique', 1, 5, function () { calls++; return null; }, { assumesUniqueness: true }));
      var ids = SINGLES.concat(['stubUnique']);
      var givens = puzzle('classic-easy');

      run(givens, { allowedTechniques: ids, assumeUniqueness: false });
      expect(calls).toBe(0);
      run(givens, { allowedTechniques: ids });
      expect(calls).toBeGreaterThan(0);
      calls = 0;
      run(givens, { allowedTechniques: ids, assumeUniqueness: true });
      expect(calls).toBeGreaterThan(0);
      calls = 0;
      run(givens, { allowedTechniques: null, assumeUniqueness: false });
      expect(calls).toBe(0);
    });

    it('a flagged technique that would solve a stuck puzzle stays out without the assumption', function () {
      registerSingles();
      var solution = F.parse(entry('escargot').solution);
      reg(stubDef('stubOracleUnique', 50, 5, function (model, state) {
        for (var c = 0; c < model.cellCount; c++) {
          if (state.value[c] === 0) return finding('stubOracleUnique', [c], [[c, solution[c]]], []);
        }
        return null;
      }, { assumesUniqueness: true }));
      var ids = SINGLES.concat(['stubOracleUnique']);
      var givens = puzzle('escargot');
      expect(run(givens, { allowedTechniques: ids }).solved).toBe(true);
      expect(run(givens, { allowedTechniques: ids, assumeUniqueness: false }).solved).toBe(false);
    });

    it('a technique may probe on its own clone with the propagation engine', function () {
      registerSingles();
      var probes = 0;
      reg(stubDef('stubProber', 1, 5, function (model, state) {
        var copy = SG.model.cloneState(state);
        SG.constraints.propagate(model, copy);
        SG.dfs.countSolutions(model, copy.value, 2);
        probes++;
        return null;
      }));
      var givens = puzzle('classic-easy');
      var plain = solveSingles(model9, givens);
      var probing = run(givens, { allowedTechniques: SINGLES.concat(['stubProber']) });
      expect(probes).toBeGreaterThan(10);
      expect(probing).toEqual(plain);
    });

    it('passes unknown options through to the techniques as ctx.options', function () {
      var seen = null;
      reg(stubDef('stubOptions', 1, 5, function (model, state, ctx) { seen = ctx; return null; }));
      run(blank(), { allowedTechniques: ['stubOptions'], maxChainLength: 5 });
      expect(seen.options.maxChainLength).toBe(5);
      expect(seen.options.collectSteps).toBe(true);
      expect(seen.assumeUniqueness).toBe(true);
    });

    it('rejects options of the wrong type', function () {
      expectCode(function () { run(blank(), 'fast'); }, 'solver.invalidOption');
      expectCode(function () { run(blank(), { allowedTechniques: 'stubNakedSingle' }); },
        'solver.invalidOption');
      expectCode(function () { run(blank(), { allowedTechniques: [1, 2] }); }, 'solver.invalidOption');
      expectCode(function () { run(blank(), { budget: {} }); }, 'solver.invalidOption');
    });
  });

  describe('solve: scoring', function () {
    it('score = baseCost x (1.5 on first use) + empty cells x 0.6, worked out by hand', function () {
      registerSingles();
      // Cells 0 and 15 are empty: two naked singles. 1 x 1.5 + 1 x 1 + 2 x 0.6 = 3.7
      var report = run(F.parse('0234341221434320'), { allowedTechniques: SINGLES }, model4);
      expect(report.solved).toBe(true);
      expect(report.techniqueCounts).toEqual({ stubNakedSingle: 2 });
      expect(report.hardestTechnique).toBe('stubNakedSingle');
      expect(report.score).toBeCloseTo(3.7, 6);
    });

    it('charges the first use of each technique 1.5 times and later uses once', function () {
      reg(stubDef('stubCost4', 4, 10, function (model, state) {
        for (var c = 0; c < 16; c++) {
          var m = state.candidates[c];
          if (state.value[c] === 0 && m !== 0 && (m & (m - 1)) === 0) {
            return finding('stubCost4', [c], [[c, 32 - Math.clz32(m)]], []);
          }
        }
        return null;
      }));
      reg(stubDef('stubCost10', 10, 20, function (model, state) {
        for (var c = 0; c < 16; c++) {
          if (state.value[c] === 0) {
            return finding('stubCost10', [c], [[c, SOLUTION4.charCodeAt(c) - 48]], []);
          }
        }
        return null;
      }));
      // The whole top half is empty: no naked single at first, so the dear technique has to start.
      var givens = F.parse('0000' + '0000' + '2143' + '4321');
      var report = run(givens, { allowedTechniques: ['stubCost4', 'stubCost10'] }, model4);
      expect(report.solved).toBe(true);
      expect(report.techniqueCounts.stubCost10).toBeGreaterThan(0);
      expect(report.techniqueCounts.stubCost4).toBeGreaterThan(1);
      var expected = emptyCount(givens) * 0.6;
      var seen = {};
      report.steps.forEach(function (s) {
        var cost = s.technique === 'stubCost4' ? 4 : 10;
        expected += seen[s.technique] ? cost : cost * 1.5;
        seen[s.technique] = true;
      });
      expect(report.score).toBeCloseTo(expected, 6);
      expect(report.hardestTechnique).toBe('stubCost10');
    });

    it('matches an independent recomputation from the steps on every singles-solvable fixture', function () {
      registerSingles();
      var cost = { stubNakedSingle: 1, stubHiddenSingle: 2 };
      EASY.concat(NEEDS_HIDDEN).forEach(function (name) {
        var givens = puzzle(name);
        var report = solveSingles(model9, givens);
        var seen = {};
        var expected = emptyCount(givens) * 0.6;
        report.steps.forEach(function (s) {
          expected += seen[s.technique] ? cost[s.technique] : cost[s.technique] * 1.5;
          seen[s.technique] = true;
        });
        expect(report.score).toBeCloseTo(expected, 6);
        expect(report.hardestTechnique).toBe(seen.stubHiddenSingle ? 'stubHiddenSingle' : 'stubNakedSingle');
      });
    });

    it('rounds away floating point noise', function () {
      reg(stubDef('stubTenth', 0.1, 10, function (model, state) {
        for (var c = 0; c < 16; c++) {
          if (state.value[c] === 0) {
            return finding('stubTenth', [c], [[c, SOLUTION4.charCodeAt(c) - 48]], []);
          }
        }
        return null;
      }));
      // Two uses of cost 0.1 and two empty cells: 1.2 + 0.15 + 0.1 is 1.4500000000000002 in floating point.
      var report = run(F.parse('00' + SOLUTION4.slice(2)), { allowedTechniques: ['stubTenth'] }, model4);
      expect(report.solved).toBe(true);
      expect(2 * 0.6 + 0.1 * 1.5 + 0.1).not.toBe(1.45);
      expect(report.score).toBe(1.45);
    });

    it('exposes the scoring constants', function () {
      expect(SG.logicalSolver.SCORING.firstUseMultiplier).toBe(1.5);
      expect(SG.logicalSolver.SCORING.emptyCellBonus).toBe(0.6);
      expect(Object.isFrozen(SG.logicalSolver.SCORING)).toBe(true);
    });

    it('is deterministic: the same call gives a deeply equal report', function () {
      registerSingles();
      var givens = puzzle('hard-a');
      expect(solveSingles(model9, givens)).toEqual(solveSingles(model9, givens));
    });
  });

  describe('solve: steps', function () {
    it('collectSteps:false builds no steps but reports the same counts, score and state', function () {
      registerSingles();
      var givens = puzzle('wikipedia-example');
      var withSteps = solveSingles(model9, givens, { collectSteps: true });
      var without = solveSingles(model9, givens, { collectSteps: false });
      expect(without.steps).toEqual([]);
      expect(withSteps.steps.length).toBeGreaterThan(30);
      expect(without.techniqueCounts).toEqual(withSteps.techniqueCounts);
      expect(without.score).toBe(withSteps.score);
      expect(without.hardestTechnique).toBe(withSteps.hardestTechnique);
      expect(without.state).toEqual(withSteps.state);
    });

    it('collectSteps defaults to true', function () {
      registerSingles();
      expect(solveSingles(model9, puzzle('classic-easy')).steps.length).toBeGreaterThan(0);
    });

    it('copies what a technique returns, so a technique may reuse its own buffers', function () {
      var scratchCells = [0];
      var args = { n: 0 };
      var calls = 0;
      reg(stubDef('stubReuse', 1, 10, function () {
        if (calls >= 3) return null;
        scratchCells[0] = calls;
        args.n = calls;
        return { technique: 'stubReuse', cells: scratchCells, placements: [], eliminations: [[calls++, 9]],
          i18nKey: 'test.reuse', i18nArgs: args };
      }));
      var report = run(blank(), { allowedTechniques: ['stubReuse'] });
      expect(report.steps.map(function (s) { return s.cells; })).toEqual([[0], [1], [2]]);
      expect(report.steps.map(function (s) { return s.i18nArgs.n; })).toEqual([0, 1, 2]);
      expect(report.steps[0].cells).not.toBe(scratchCells);
      expect(report.steps[0].i18nArgs).not.toBe(args);
    });

    it('records only the changes that really happened', function () {
      var used = false;
      reg(stubDef('stubRedundant', 1, 10, function () {
        if (used) return null;
        used = true;
        // Placing 5 in cell 0 removes 5 from its peer 1, so [1, 5] is redundant, as is the second
        // placement of the same value and the elimination of 6 from the now fixed cell 0.
        return finding('stubRedundant', [0, 1], [[0, 5], [0, 5]], [[1, 5], [0, 6], [2, 7]]);
      }));
      var report = run(blank(), { allowedTechniques: ['stubRedundant'] });
      expect(report.steps.length).toBe(1);
      expect(report.steps[0].placements).toEqual([[0, 5]]);
      expect(report.steps[0].eliminations).toEqual([[2, 7]]);
      expect(report.state.value[0]).toBe(5);
      expect(report.state.candidates[1] & 16).toBe(0);
    });

    it('defaults i18nArgs to {} when a technique leaves it out', function () {
      var used = false;
      reg(stubDef('stubNoArgs', 1, 10, function () {
        if (used) return null;
        used = true;
        return { technique: 'stubNoArgs', cells: [0], placements: [], eliminations: [[0, 1]],
          i18nKey: 'test.k' };
      }));
      var report = run(blank(), { allowedTechniques: ['stubNoArgs'] });
      expect(report.steps[0].i18nArgs).toEqual({});
    });
  });

  describe('solve: a faulty technique fails loudly and by name', function () {
    /** Registers 'stubBroken' returning whatever make() builds; returns a function that runs the solver. */
    function broken(make) {
      reg(stubDef('stubBroken', 1, 10, function () { return make(); }));
      return function () { run(blank(), { allowedTechniques: ['stubBroken'] }); };
    }

    it('an empty Finding throws solver.emptyFinding naming the technique', function () {
      var err = expectCode(broken(function () { return finding('stubBroken', [0], [], []); }),
        'solver.emptyFinding', 'stubBroken');
      expect(err.i18nArgs.technique).toBe('stubBroken');
    });

    it('a Finding that changes nothing throws solver.noEffect instead of looping forever', function () {
      var solved = F.parse(entry('classic-easy').solution);
      reg(stubDef('stubNoop', 1, 10, function () {
        return finding('stubNoop', [0], [[0, solved[0]]], []);
      }));
      var err = expectCode(function () {
        run(puzzle('classic-easy'), { allowedTechniques: ['stubNoop'], collectSteps: false });
      }, 'solver.noEffect');
      expect(err.message).toContain('stubNoop');
      expect(err.i18nArgs.technique).toBe('stubNoop');
    });

    it('an elimination of a candidate that is already gone is also a no-op', function () {
      reg(stubDef('stubGone', 1, 10, function (model, state) {
        for (var c = 0; c < 81; c++) {
          if (state.value[c] !== 0) return finding('stubGone', [c], [], [[c, state.value[c] % 9 + 1]]);
        }
        return null;
      }));
      expectCode(function () {
        run(puzzle('classic-easy'), { allowedTechniques: ['stubGone'] });
      }, 'solver.noEffect', 'stubGone');
    });

    it('a Finding labelled with another technique id throws solver.invalidFinding', function () {
      expectCode(broken(function () { return finding('stubOther', [0], [], [[0, 1]]); }),
        'solver.invalidFinding', 'stubBroken');
    });

    function raw(extra) {
      return Object.assign({ technique: 'stubBroken', cells: [0], placements: [], eliminations: [[0, 1]],
        i18nKey: 'k' }, extra);
    }

    function without(key) {
      var f = raw();
      delete f[key];
      return f;
    }

    it('malformed Findings throw solver.invalidFinding naming the technique and the problem', function () {
      var bad = [
        [true, 'object'],
        [without('placements'), 'arrays'],
        [without('eliminations'), 'arrays'],
        [without('cells'), 'cells'],
        [without('i18nKey'), 'i18nKey'],
        [raw({ i18nArgs: 5 }), 'i18nArgs'],
        [raw({ eliminations: [[0, 10]] }), 'eliminations[0]'],
        [raw({ eliminations: [[81, 1]] }), 'eliminations[0]'],
        [raw({ eliminations: [[0.5, 1]] }), 'eliminations[0]'],
        [raw({ eliminations: [[0]] }), 'eliminations[0]'],
        [raw({ eliminations: [], placements: [[0, 0]] }), 'placements[0]'],
        [raw({ eliminations: [], placements: [[-1, 3]] }), 'placements[0]'],
        [raw({ cells: [200] }), 'cells[0]']
      ];
      bad.forEach(function (b) {
        var run1 = broken(function () { return b[0]; });
        var err = expectCode(run1, 'solver.invalidFinding', 'stubBroken');
        expect(err.message).toContain(b[1]);
        SG.techniques.unregister('stubBroken');
        registered.pop();
      });
    });

    it('SG.DEBUG detects a technique that changes the state inside find()', function () {
      reg(stubDef('stubWriter', 1, 10, function (model, state) {
        SG.constraints.eliminate(model, state, 0, 9);
        return null;
      }));
      var go = function () { run(blank(), { allowedTechniques: ['stubWriter'] }); };
      expect(go).not.toThrow();
      SG.setDebug(true);
      expectCode(go, 'solver.stateMutated', 'stubWriter');
    });

    it('errors thrown by a technique itself propagate unchanged', function () {
      reg(stubDef('stubThrows', 1, 10, function () { throw new RangeError('boom'); }));
      expect(function () { run(blank(), { allowedTechniques: ['stubThrows'] }); }).toThrow(RangeError);
    });
  });

  describe('solve: budget and stopOnStuck', function () {
    it('checks the budget once per applied step and throws the budget error', function () {
      registerSingles();
      var givens = puzzle('classic-easy');
      expectCode(function () {
        solveSingles(model9, givens, { budget: SG.budget.create({ nodes: 5 }) });
      }, 'budget.exceeded');
      var generous = SG.budget.create({ nodes: 1000 });
      var report = solveSingles(model9, givens, { budget: generous });
      expect(report.solved).toBe(true);
      expect(generous.nodes).toBeGreaterThanOrEqual(report.steps.length);
      expect(generous.nodes).toBeLessThanOrEqual(report.steps.length + 2);
    });

    it('a cancelled budget throws budget.cancelled', function () {
      registerSingles();
      var budget = SG.budget.create({});
      budget.cancel();
      expectCode(function () {
        solveSingles(model9, puzzle('classic-easy'), { budget: budget });
      }, 'budget.cancelled');
    });

    it('an exhausted budget is noticed even when a technique swallowed its own budget error', function () {
      reg(stubDef('stubSwallow', 1, 10, function (model, state, ctx) {
        try { ctx.check(); } catch (e) { return null; }
        return null;
      }));
      // nodes: 2 allows the check at the top of the loop; the check before "stuck" then fails.
      expectCode(function () {
        run(blank(), { allowedTechniques: ['stubSwallow'], budget: SG.budget.create({ nodes: 1 }) });
      }, 'budget.exceeded');
      var report = run(blank(), { allowedTechniques: [], budget: SG.budget.create({ nodes: 2 }) });
      expect(report.status).toBe('stuck');
    });

    it('stopOnStuck:false keeps the stuck state and adds a full solution found by search', function () {
      registerSingles();
      var givens = puzzle('escargot');
      var stopped = solveSingles(model9, givens);
      var completed = solveSingles(model9, givens, { stopOnStuck: false });
      expect(completed.solved).toBe(false);
      expect(completed.status).toBe('stuck');
      expect(completed.state).toEqual(stopped.state);
      expect(completed.solution).toBeInstanceOf(Int32Array);
      expect(Array.from(completed.solution)).toEqual(Array.from(F.parse(entry('escargot').solution)));
      expect(stopped.solution).toBeNull();
    });

    it('stopOnStuck:false adds no solution to a puzzle that was solved by technique', function () {
      registerSingles();
      var report = solveSingles(model9, puzzle('classic-easy'), { stopOnStuck: false });
      expect(report.solved).toBe(true);
      expect(report.solution).toBeNull();
    });

    it('stopOnStuck:false gives no solution for a puzzle that has none', function () {
      registerSingles();
      var report = solveSingles(model9, F.parse(F.contradictory[2].puzzle), { stopOnStuck: false });
      expect(report.solved).toBe(false);
      expect(report.solution).toBeNull();
    });
  });

  describe('solve: collectSteps:false is faster (>= 15%)', function () {
    var puzzles = EASY.map(puzzle);

    function runAll(collect) {
      for (var round = 0; round < 20; round++) {
        for (var i = 0; i < puzzles.length; i++) {
          SG.logicalSolver.solve(model9, puzzles[i], { allowedTechniques: SINGLES, collectSteps: collect });
        }
      }
    }

    bench('solve the easy fixtures, collectSteps:true', function () {
      if (!SG.techniques.has('stubNakedSingle')) registerSingles();
      runAll(true);
    }, 20);

    bench('solve the easy fixtures, collectSteps:false', function () {
      if (!SG.techniques.has('stubNakedSingle')) registerSingles();
      runAll(false);
    }, 20);

    it('takes at most 85% of the time of collectSteps:true on the easy fixtures', function () {
      registerSingles();
      runAll(true);
      runAll(false);
      var slow = Infinity;
      var fast = Infinity;
      // Alternating best-of-N: a slow phase of the machine hits both sides.
      for (var round = 0; round < 15; round++) {
        slow = Math.min(slow, bestOf(1, function () { runAll(true); }));
        fast = Math.min(fast, bestOf(1, function () { runAll(false); }));
      }
      expect(fast).toBeLessThan(slow * 0.85);
    });
  });

  describe('SG.techHelper: states and conversions', function () {
    it('model() caches models and defaults to classic9', function () {
      expect(H.model()).toBe(H.model('classic9'));
      expect(H.model().cellCount).toBe(81);
      expect(H.model('classic4').cellCount).toBe(16);
    });

    it('parses puzzle strings (dots, zeros, whitespace) and converts back', function () {
      var text = entry('escargot').puzzle;
      var givens = H.parsePuzzle(model9, text);
      expect(givens).toEqual(F.parse(text));
      expect(H.puzzleString(model9, givens)).toBe(text.replace(/0/g, '.'));
      expect(H.parsePuzzle(model9, text.slice(0, 40) + '\n  ' + text.slice(40))).toEqual(givens);
      expect(H.parsePuzzle(model4, '1.3.\n3.1.\n.1.3\n3.1.'))
        .toEqual(F.parse('1030' + '3010' + '0103' + '3010'));
      expect(function () { H.parsePuzzle(model9, '123'); }).toThrow('81');
      expect(function () { H.parsePuzzle(model4, '5...............'); }).toThrow('not valid');
    });

    it('resolves cell labels and indices', function () {
      expect(H.cell(model9, 'R1C1')).toBe(0);
      expect(H.cell(model9, 'r4c7')).toBe(33);
      expect(H.cell(model9, 80)).toBe(80);
      expect(H.label(model9, 33)).toBe('R4C7');
      expect(function () { H.cell(model9, 'R10C1'); }).toThrow('unknown cell label');
      expect(function () { H.cell(model9, 81); }).toThrow('outside');
    });

    it('makeState propagates by default; propagate:false keeps the peer-consistent grid', function () {
      var text = entry('classic-easy').puzzle;
      var raw = H.makeState(model9, text, { propagate: false });
      var full = H.makeState(model9, text);
      expect(raw.unsolvedCount).toBe(emptyCount(F.parse(text)));
      expect(full.unsolvedCount).toBe(0);
      expect(full.candidates).toEqual(propagated(model9, F.parse(text)).candidates);
    });

    it('makeState can restrict candidates and eliminate by label, and rejects contradictions', function () {
      var text = entry('escargot').puzzle;
      var cands = new Array(81).fill(null);
      cands[1] = '2345';
      var state = H.makeState(model9, text,
        { propagate: false, candidates: cands, eliminate: [['R1C2', 2]] });
      expect(state.candidates[1] & 2).toBe(0);
      expect(state.candidates[1] & ~(4 | 8 | 16)).toBe(0);
      expect(state.candidates[1]).not.toBe(0);
      cands[1] = '1';
      expect(function () { H.makeState(model9, text, { candidates: cands }); }).toThrow('leaves');
      expect(function () { H.makeState(model9, text, { eliminate: [['R1C1', 1]] }); }).toThrow('empty');
      expect(function () { H.makeState(model9, F.contradictory[0].puzzle); }).toThrow('contradict');
    });

    it('stateAfter returns the position where the given techniques get stuck', function () {
      registerSingles();
      var text = entry('escargot').puzzle;
      var state = H.stateAfter(model9, text, SINGLES);
      expect(state.value).toEqual(solveSingles(model9, F.parse(text)).state.value);
      expect(H.stateAfter(model9, text, []).unsolvedCount).toBe(emptyCount(F.parse(text)));
    });
  });

  describe('SG.techHelper: expectFinding / expectNoFinding', function () {
    // After the givens R1C1 is a naked single: only a 1 fits.
    var text4 = '0234341221434320';

    function failureOf(fn) { return thrown(fn); }

    it('expectFinding returns the Finding and compares cells as index or label, as sets', function () {
      registerSingles();
      var state = H.makeState(model4, text4, { propagate: false });
      var f = H.expectFinding(SG.test, 'stubNakedSingle', state, {
        placements: [['R1C1', 1]], cells: [0], args: { cell: 0 }
      });
      expect(f.technique).toBe('stubNakedSingle');
      H.expectFinding(SG.test, 'stubNakedSingle', state, { placements: [[0, 1]], partial: true });
      H.expectFinding(SG.test, 'stubNakedSingle', state, {});
    });

    it('expectFinding fails readably on a wrong expectation, a null result or a foreign state', function () {
      registerSingles();
      var state = H.makeState(model4, text4, { propagate: false });
      var wrong = failureOf(function () {
        H.expectFinding(SG.test, 'stubNakedSingle', state, { placements: [[0, 2]] });
      });
      expect(wrong instanceof SG.test.AssertionError).toBe(true);
      expect(wrong.message).toContain('stubNakedSingle');
      expect(wrong.message).toContain('placements');
      var none = failureOf(function () {
        H.expectFinding(SG.test, 'stubHiddenSingle', H.makeState(model9, entry('escargot').puzzle), {});
      });
      expect(none.message).toContain('found nothing');
      expect(failureOf(function () {
        H.expectFinding(SG.test, 'stubNakedSingle', state, { cells: [1] });
      }).message).toContain('cells');
      expect(failureOf(function () {
        H.expectFinding(SG.test, 'stubNakedSingle', state, { args: { cell: 9 } });
      }).message).toContain('i18nArgs.cell');
      expect(failureOf(function () {
        H.expectFinding(SG.test, 'noSuchTech', state, {});
      }).message).toContain('not registered');
      expect(failureOf(function () {
        H.expectFinding(SG.test, 'stubNakedSingle', SG.model.initState(model4), {});
      }).message).toContain('not made by SG.techHelper');
      // A model can be passed instead.
      H.expectFinding(SG.test, 'stubNakedSingle', SG.model.cloneState(state), { placements: [[0, 1]] },
        { model: model4 });
    });

    it('expectFinding also checks the contract and the soundness of the Finding', function () {
      reg(stubDef('stubWrong', 1, 10, function () { return finding('stubWrong', [0], [[0, 3]], []); }));
      var state = H.makeState(model4, text4, { propagate: false });
      var err = failureOf(function () { H.expectFinding(SG.test, 'stubWrong', state, {}); });
      expect(err.message).toContain('stubWrong');
      expect(err.message).toMatch(/not a candidate|WRONG placement/);
      reg(stubDef('stubUnsoundElim', 1, 11, function () {
        return finding('stubUnsoundElim', [0], [], [[0, 1]]);
      }));
      err = failureOf(function () { H.expectFinding(SG.test, 'stubUnsoundElim', state, {}); });
      expect(err.message).toContain('UNSOUND');
    });

    it('expectFinding fails when find() modifies the state', function () {
      reg(stubDef('stubMutator', 1, 10, function (model, state) {
        state.candidates[0] |= 8;
        return finding('stubMutator', [0], [], [[1, 1]]);
      }));
      var state = H.makeState(model4, text4, { propagate: false });
      expect(failureOf(function () { H.expectFinding(SG.test, 'stubMutator', state, {}); }).message)
        .toContain('modified the state');
    });

    it('expectFinding fails when find() is not deterministic', function () {
      var calls = 0;
      reg(stubDef('stubRandomish', 1, 10, function () {
        return finding('stubRandomish', [0], [], [[0, 1 + (calls++ % 2) * 2]]);
      }));
      var state = H.makeState(model4, '0000000000000000', { propagate: false });
      expect(failureOf(function () { H.expectFinding(SG.test, 'stubRandomish', state, {}); }).message)
        .toContain('not deterministic');
    });

    it('expectNoFinding passes on null and fails with the Finding it got', function () {
      registerSingles();
      H.expectNoFinding(SG.test, 'stubHiddenSingle', H.makeState(model9, entry('escargot').puzzle));
      var err = failureOf(function () {
        H.expectNoFinding(SG.test, 'stubNakedSingle', H.makeState(model4, text4, { propagate: false }));
      });
      expect(err instanceof SG.test.AssertionError).toBe(true);
      expect(err.message).toContain('should find nothing');
      expect(err.message).toContain('stubNakedSingle');
    });

    it('works without a kit: t may be null', function () {
      registerSingles();
      var state = H.makeState(model4, text4, { propagate: false });
      expect(function () {
        H.expectFinding(null, 'stubNakedSingle', state, { placements: [[0, 4]] });
      }).toThrow();
    });

    it('findingProblems lists every contract violation', function () {
      var state = H.makeState(model4, text4, { propagate: false });
      function mk(cells, placements, eliminations) {
        return { technique: 'x', cells: cells, placements: placements, eliminations: eliminations,
          i18nKey: 'k', i18nArgs: {} };
      }
      function problems(f, opts) { return H.findingProblems(model4, state, f, opts).join(' | '); }
      var ok = mk([0], [[0, 1]], []);
      expect(H.findingProblems(model4, state, ok, { technique: 'x' })).toEqual([]);
      expect(problems(ok, { technique: 'y' })).toContain('"y"');
      expect(H.findingProblems(model4, state, null)).toEqual(['the Finding is not an object']);
      expect(problems(mk([], [[0, 1]], []))).toContain('cells is empty');
      expect(problems(mk([0], [], []))).toContain('no placements');
      expect(problems(mk([0], [], [[0, 3]]))).toContain('not a candidate');
      expect(problems(mk([0], [[1, 2]], []))).toContain('already placed');
      expect(problems(mk([0], [[1, 3]], []))).toContain('solved cell');
      expect(problems(mk([0], [[0, 1], [0, 2]], []))).toContain('contradicts another placement');
      expect(problems(mk([99], [[0, 1]], []))).toContain('cells[0]');
      expect(problems(mk([0], [[0, 1]], [[0, 9]]))).toContain('eliminations[0]');
      var badArgs = mk([0], [[0, 1]], []);
      badArgs.i18nArgs = { f: function () {} };
      expect(problems(badArgs)).toContain('i18nArgs');
      var noArgs = mk([0], [[0, 1]], []);
      delete noArgs.i18nArgs;
      expect(problems(noArgs)).toContain('i18nArgs');
      expect(H.findingProblems(model4, state, ok, { solution: F.parse(SOLUTION4) })).toEqual([]);
      expect(problems(ok, { solution: F.parse('2234341221434321') })).toContain('WRONG placement');
    });
  });

  describe('SG.techHelper: randomStatesWithKnownSolution and assertSound', function () {
    it('produces states consistent with a unique known solution, in every kind', function () {
      var states = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(11), 24);
      expect(states.length).toBe(24);
      var kinds = {};
      states.forEach(function (s) {
        kinds[s.kind] = (kinds[s.kind] || 0) + 1;
        expect(SG.model.isSolution(model9, s.solution)).toBe(true);
        for (var c = 0; c < 81; c++) {
          expect((s.state.candidates[c] & (1 << (s.solution[c] - 1))) !== 0).toBe(true);
          if (s.state.value[c] !== 0) expect(s.state.value[c]).toBe(s.solution[c]);
          if (s.givens[c] !== 0) expect(s.givens[c]).toBe(s.solution[c]);
        }
      });
      expect(Object.keys(kinds).sort()).toEqual(['initial', 'propagated', 'pruned']);
      expect(kinds.pruned).toBe(12);
      for (var k = 0; k < 24; k += 6) {
        expect(SG.dfs.countSolutions(model9, states[k].givens, 2)).toBe(1);
      }
    });

    it('is deterministic for a seed, different for another, and hands out fresh states', function () {
      function candidatesOf(list) {
        return list.map(function (s) { return Array.from(s.state.candidates); });
      }
      var a = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(5), 8);
      var b = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(5), 8);
      var c = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(6), 8);
      expect(candidatesOf(a)).toEqual(candidatesOf(b));
      expect(Array.from(a[0].solution)).not.toEqual(Array.from(c[0].solution));
      a[0].state.candidates.fill(0);
      var again = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(5), 8);
      expect(candidatesOf(again)).toEqual(candidatesOf(b));
    });

    it('works for classic4 and classic6', function () {
      [model4, model6].forEach(function (m) {
        var states = H.randomStatesWithKnownSolution(m, SG.testkit.rng.create(3), 8);
        expect(states.length).toBe(8);
        states.forEach(function (s) { expect(SG.model.isSolution(m, s.solution)).toBe(true); });
      });
    });

    it('assertSound passes for a sound technique and reports how often it fired', function () {
      registerSingles();
      var stats = H.assertSound(SG.test, 'stubNakedSingle', { count: 40, minFirings: 5, seed: 9 });
      expect(stats.states).toBe(40);
      expect(stats.firings).toBeGreaterThanOrEqual(5);
      expect(stats.placements).toBe(stats.firings);
      var hidden = H.assertSound(SG.test, 'stubHiddenSingle', { count: 40, minFirings: 5, seed: 9 });
      expect(hidden.firings).toBeGreaterThanOrEqual(5);
    });

    /** Lowest candidate of the first open cell that has more than one. */
    function firstChoice(model, state) {
      for (var c = 0; c < model.cellCount; c++) {
        var m = state.candidates[c];
        if (state.value[c] === 0 && m !== (m & -m)) return { cell: c, value: 32 - Math.clz32(m & -m) };
      }
      return null;
    }

    it('assertSound catches an unsound elimination and shows puzzle, solution and Finding', function () {
      reg(stubDef('stubUnsound', 1, 10, function (model, state) {
        var pick = firstChoice(model, state);
        return pick && finding('stubUnsound', [pick.cell], [], [[pick.cell, pick.value]]);
      }));
      var err = thrown(function () { H.assertSound(SG.test, 'stubUnsound', { count: 40, seed: 9 }); });
      expect(err instanceof SG.test.AssertionError).toBe(true);
      expect(err.message).toContain('stubUnsound');
      expect(err.message).toContain('UNSOUND');
      expect(err.message).toContain('puzzle:');
      expect(err.message).toContain('solution:');
      expect(err.message).toContain('finding:');
    });

    it('assertSound catches a wrong placement', function () {
      reg(stubDef('stubGuess', 1, 10, function (model, state) {
        var pick = firstChoice(model, state);
        return pick && finding('stubGuess', [pick.cell], [[pick.cell, pick.value]], []);
      }));
      var err = thrown(function () { H.assertSound(SG.test, 'stubGuess', { count: 40, seed: 9 }); });
      expect(err.message).toContain('WRONG placement');
    });

    it('assertSound rejects a technique that mislabels its Finding or modifies the state', function () {
      reg(stubDef('stubMislabel', 1, 10, function (model, state) {
        var f = findNakedSingle(model, state);
        if (f) f.technique = 'somethingElse';
        return f;
      }));
      var err = thrown(function () { H.assertSound(SG.test, 'stubMislabel', { count: 40, seed: 9 }); });
      expect(err.message).toContain('finding.technique');
      reg(stubDef('stubWritesState', 1, 11, function (model, state) {
        var pick = firstChoice(model, state);
        if (pick) SG.constraints.eliminate(model, state, pick.cell, pick.value);
        return null;
      }));
      err = thrown(function () { H.assertSound(SG.test, 'stubWritesState', { count: 10, seed: 9 }); });
      expect(err.message).toContain('modified the state');
    });

    it('assertSound enforces minFirings so that a vacuous run cannot pass', function () {
      reg(stubDef('stubNever', 1, 10, noFinding));
      expect(function () { H.assertSound(SG.test, 'stubNever', { count: 12, seed: 9 }); }).not.toThrow();
      var err = thrown(function () {
        H.assertSound(SG.test, 'stubNever', { count: 12, seed: 9, minFirings: 1 });
      });
      expect(err.message).toContain('fired only 0 times');
    });

    it('assertSound needs a model for a scoped technique and refuses one it does not apply to', function () {
      reg(stubDef('stubScopedSound', 1, 10, noFinding, { variantScope: ['killer'] }));
      expect(function () { H.assertSound(SG.test, 'stubScopedSound', {}); }).toThrow('scoped');
      expect(function () { H.assertSound(SG.test, 'stubScopedSound', { model: model9 }); })
        .toThrow('does not apply');
      expect(function () { H.assertSound(SG.test, 'noSuchTech', {}); }).toThrow('not registered');
    });

    it('assertSound accepts ready made states', function () {
      registerSingles();
      var states = H.randomStatesWithKnownSolution(model4, SG.testkit.rng.create(2), 10);
      var stats = H.assertSound(SG.test, 'stubNakedSingle', { model: model4, states: states });
      expect(stats.states).toBe(10);
    });
  });
})();
