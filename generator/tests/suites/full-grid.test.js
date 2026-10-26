// Full grid generation: validity, determinism, uniformity, fixed cells, restarts and the fastSeed hook that
// comes from the variant registry.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var model9 = SG.variants.get('classic9').build({}, null);
  var model4 = SG.variants.get('classic4').build({}, null);
  var model6 = SG.variants.get('classic6').build({}, null);

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
  }

  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  function generate(model, seed, budget, options) {
    return SG.fullGrid.generate(model, SG.rng.create(seed), budget || null, options);
  }

  /** A copy of a model under another variant id and with other fixed cells (models are immutable). */
  function derive(model, changes) {
    var spec = {
      variantId: model.variantId,
      digits: model.digits,
      units: model.units.map(function (u) { return Array.from(u); }),
      unitMeta: model.unitMeta.map(function (m) { return Object.assign({}, m); }),
      layout: {
        rows: model.layout.rows,
        cols: model.layout.cols,
        cellRow: Array.from(model.layout.cellRow),
        cellCol: Array.from(model.layout.cellCol),
        cellRegion: Array.from(model.layout.cellRegion)
      }
    };
    return SG.model.create(Object.assign(spec, changes));
  }

  var GRID_COUNT = 1000;
  var grids = [];
  for (var seed = 1; seed <= GRID_COUNT; seed++) grids.push(generate(model9, seed));

  describe('full grid: classic9', function () {
    it('generates 1000 valid grids', function () {
      expect(grids).toHaveLength(GRID_COUNT);
      grids.forEach(function (g, i) {
        expect(g).toBeInstanceOf(Int32Array);
        if (!SG.model.isSolution(model9, g)) throw new Error('seed ' + (i + 1) + ' gave an invalid grid');
      });
    });

    it('is deterministic: the same seed gives the same grid, every time', function () {
      for (var s = 1; s <= 50; s++) {
        expect(generate(model9, s)).toEqual(grids[s - 1]);
        expect(generate(model9, s)).toEqual(grids[s - 1]);
      }
    });

    it('depends on the seed: different seeds give different grids', function () {
      var distinct = new Set(grids.map(function (g) { return g.join(''); }));
      expect(distinct.size).toBe(GRID_COUNT);
    });

    it('works with a forked child stream and leaves the parent stream out of it', function () {
      var a = SG.fullGrid.generate(model9, SG.rng.create(77).fork('fullGrid'), null);
      var b = SG.fullGrid.generate(model9, SG.rng.create(77).fork('fullGrid'), null);
      var c = SG.fullGrid.generate(model9, SG.rng.create(77).fork('other'), null);
      expect(a).toEqual(b);
      expect(a).not.toEqual(c);
    });

    it('spreads the value of R1C1 evenly over all 9 digits (within 5 percentage points of 1/9)', function () {
      var counts = new Array(10).fill(0);
      grids.forEach(function (g) { counts[g[0]]++; });
      var chi = 0;
      for (var v = 1; v <= 9; v++) {
        var share = counts[v] / GRID_COUNT;
        expect(Math.abs(share - 1 / 9)).toBeLessThan(0.05);
        chi += Math.pow(counts[v] - GRID_COUNT / 9, 2) / (GRID_COUNT / 9);
      }
      // 8 degrees of freedom: 26.12 is the 0.1% critical value.
      expect(chi).toBeLessThan(26.12);
    });

    it('also spreads the centre cell and the last cell evenly', function () {
      [40, 80].forEach(function (cell) {
        var counts = new Array(10).fill(0);
        grids.forEach(function (g) { counts[g[cell]]++; });
        for (var v = 1; v <= 9; v++) expect(Math.abs(counts[v] / GRID_COUNT - 1 / 9)).toBeLessThan(0.05);
      });
    });
  });

  describe('full grid: classic4 and classic6', function () {
    it('generates valid grids', function () {
      for (var s = 1; s <= 200; s++) {
        expect(SG.model.isSolution(model4, generate(model4, s))).toBe(true);
        expect(SG.model.isSolution(model6, generate(model6, s))).toBe(true);
      }
    });

    it('generates a classic4 grid in under 2 ms', function () {
      for (var w = 0; w < 50; w++) generate(model4, w);
      var runs = 400;
      var start = now();
      for (var i = 0; i < runs; i++) generate(model4, 1000 + i);
      var perGrid = (now() - start) / runs;
      expect(perGrid).toBeLessThan(2);
    });

    bench('classic4 full grid', function () { generate(model4, 5); }, 2000);
    bench('classic6 full grid', function () { generate(model6, 5); }, 2000);
    bench('classic9 full grid (fastSeed)', function () { generate(model9, 5); }, 2000);
    bench('classic9 full grid (no fastSeed)', function () {
      generate(model9, 5, null, { fastSeed: false });
    }, 2000);
  });

  describe('full grid: the fastSeed hook', function () {
    afterEach(function () {
      SG.variants.unregister('fake-seeded');
    });

    function registerFake(fastSeed) {
      SG.variants.register({
        id: 'fake-seeded',
        i18nKey: 'variant.fake',
        group: 'test',
        digits: 4,
        difficultySupport: ['veryEasy'],
        defaultSymbolMode: 'digits',
        symbolModes: ['digits'],
        options: [],
        build: function () { return derive(model4, { variantId: 'fake-seeded' }); },
        fastSeed: fastSeed
      });
      return derive(model4, { variantId: 'fake-seeded' });
    }

    it('is used for classic9 by default and can be switched off', function () {
      var stats = {};
      generate(model9, 3, null, { stats: stats });
      expect(stats.fastSeed).toBe(true);
      expect(stats.attempts).toBe(1);
      generate(model9, 3, null, { stats: stats, fastSeed: false });
      expect(stats.fastSeed).toBe(false);
      generate(model4, 3, null, { stats: stats });
      expect(stats.fastSeed).toBe(false);
    });

    it('pre-fills the three diagonal boxes of classic9 with permutations of 1..9', function () {
      var state = SG.model.initState(model9);
      expect(SG.variants.get('classic9').fastSeed(model9, state, SG.rng.create(9))).toBe(true);
      [0, 4, 8].forEach(function (region) {
        var values = [];
        for (var c = 0; c < 81; c++) if (model9.layout.cellRegion[c] === region) values.push(state.value[c]);
        expect(values.slice().sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      });
      expect(state.unsolvedCount).toBe(54);
    });

    it('calls a hook that a variant registers with (model, state, rng) and keeps its pre-fill', function () {
      var calls = [];
      var model = registerFake(function (m, state, rng) {
        calls.push({ model: m, rng: rng, fresh: state.unsolvedCount });
        return SG.constraints.assign(m, state, 0, 3);
      });
      var stats = {};
      var grid = generate(model, 8, null, { stats: stats });
      expect(calls).toHaveLength(1);
      expect(calls[0].model).toBe(model);
      expect(typeof calls[0].rng.next).toBe('function');
      expect(calls[0].fresh).toBe(16);
      expect(grid[0]).toBe(3);
      expect(SG.model.isSolution(model, grid)).toBe(true);
      expect(stats.fastSeed).toBe(true);
    });

    it('does not call the hook when fastSeed is switched off', function () {
      var calls = 0;
      var model = registerFake(function () { calls++; return true; });
      generate(model, 8, null, { fastSeed: false });
      expect(calls).toBe(0);
    });

    it('falls back to a plain search when the hook gives up or propagation rejects its state', function () {
      var model = registerFake(function () { return false; });
      var stats = {};
      expect(SG.model.isSolution(model, generate(model, 4, null, { stats: stats }))).toBe(true);
      expect(stats.fastSeed).toBe(false);
      SG.variants.unregister('fake-seeded');
      model = registerFake(function (m, state) {
        state.candidates[0] = 0;
        return true;
      });
      expect(SG.model.isSolution(model, generate(model, 4, null, { stats: stats }))).toBe(true);
      expect(stats.fastSeed).toBe(false);
    });

    it('retries without the pre-fill when the search under it is exhausted', function () {
      // A pre-fill that propagation accepts but that cannot be completed: the mock rule rejects every
      // finished grid that starts with a 1, and only notices once the last cell is set.
      SG.constraints.registerExtension({
        id: 'mock-no-leading-one',
        propagate: function (m, state) { return !(state.unsolvedCount === 0 && state.value[0] === 1); }
      });
      try {
        var model = registerFake(function (m, state) { return SG.constraints.assign(m, state, 0, 1); });
        var stats = {};
        var grid = generate(model, 4, null, { stats: stats });
        expect(SG.model.isSolution(model, grid)).toBe(true);
        expect(grid[0]).not.toBe(1);
        expect(stats.fastSeed).toBe(false);
      } finally {
        SG.constraints.unregisterExtension('mock-no-leading-one');
      }
    });

    it('is not special-cased in the core: no variant ids in the generator or solver sources', function () {
      var env = SG.test.node;
      if (!env) SG.test.skip('needs the Node file system');
      ['js/engine/full-grid.js', '../core/js/engine/dfs-solver.js', '../core/js/engine/constraints.js',
        'js/engine/digger.js']
        .forEach(function (rel) {
          var text = env.fs.readFileSync(env.path.join(env.root, rel), 'utf8');
          expect(/classic|variantId\s*===|variantId\s*==/.test(text)).toBe(false);
        });
    });

    it('makes classic9 grid generation at least 25% faster', function () {
      var runs = 800;
      function batch(useSeed) {
        var t = now();
        for (var i = 0; i < runs; i++) generate(model9, 5000 + i, null, { fastSeed: useSeed });
        return now() - t;
      }
      batch(true);
      batch(false);
      var fast = Infinity;
      var slow = Infinity;
      for (var round = 0; round < 7; round++) {
        fast = Math.min(fast, batch(true));
        slow = Math.min(slow, batch(false));
      }
      expect(fast).toBeLessThan(0.75 * slow);
    });
  });

  describe('full grid: fixed cells', function () {
    var WORD = [4, 8, 1, 9, 3, 7, 2, 6, 5];

    function diagonalFixed() {
      var fixed = new Array(81).fill(0);
      for (var i = 0; i < 9; i++) fixed[i * 10] = WORD[i];
      return fixed;
    }

    it('forces the cells listed in model.fixedCells (a Wordoku style diagonal)', function () {
      var model = derive(model9, { fixedCells: diagonalFixed() });
      for (var s = 1; s <= 50; s++) {
        var grid = generate(model, s);
        expect(SG.model.isSolution(model, grid)).toBe(true);
        for (var i = 0; i < 9; i++) expect(grid[i * 10]).toBe(WORD[i]);
      }
    });

    it('accepts fixed cells as an option, which override the model', function () {
      var grid = generate(model9, 5, null, { fixedCells: diagonalFixed() });
      for (var i = 0; i < 9; i++) expect(grid[i * 10]).toBe(WORD[i]);
      var other = new Array(81).fill(0);
      other[0] = 9;
      other[80] = 1;
      var model = derive(model9, { fixedCells: diagonalFixed() });
      var grid2 = generate(model, 5, null, { fixedCells: other });
      expect(grid2[0]).toBe(9);
      expect(grid2[80]).toBe(1);
    });

    it('still works when the fastSeed pre-fill clashes with the fixed cells', function () {
      var model = derive(model9, { fixedCells: diagonalFixed() });
      var stats = {};
      var grid = generate(model, 21, null, { stats: stats });
      expect(SG.model.isSolution(model, grid)).toBe(true);
      expect(stats.fastSeed).toBe(false);
    });

    it('works on classic4 with fixed cells', function () {
      var fixed = new Array(16).fill(0);
      fixed[0] = 4;
      fixed[15] = 4;
      var model = derive(model4, { fixedCells: fixed });
      for (var s = 1; s <= 30; s++) {
        var grid = generate(model, s);
        expect(grid[0]).toBe(4);
        expect(grid[15]).toBe(4);
        expect(SG.model.isSolution(model, grid)).toBe(true);
      }
    });

    function expectInvalidFixed(fixed) {
      expectCode(function () {
        generate(model9, 1, null, { fixedCells: fixed });
      }, 'fullGrid.invalidFixedCells');
    }

    it('rejects fixed cells that contradict each other (fullGrid.invalidFixedCells)', function () {
      var fixed = new Array(81).fill(0);
      fixed[0] = 1;
      fixed[1] = 1;
      expectInvalidFixed(fixed);
      // Fixed so that a cell is left with no candidate: R1C1..R1C8 hold 1..8, R2C9 holds 9.
      fixed = new Array(81).fill(0);
      for (var c = 0; c < 8; c++) fixed[c] = c + 1;
      fixed[17] = 9;
      expectInvalidFixed(fixed);
    });

    it('rejects fixed cells of the wrong length or with values that are not digits', function () {
      expectInvalidFixed(new Array(80).fill(0));
      [10, -1, 1.5, NaN].forEach(function (bad) {
        var fixed = new Array(81).fill(0);
        fixed[4] = bad;
        expectInvalidFixed(fixed);
      });
    });
  });

  describe('full grid: restarts, budget and failure', function () {
    it('restarts a search that exceeds the backtrack threshold and still returns a valid grid', function () {
      var restarted = 0;
      for (var s = 1; s <= 60; s++) {
        var stats = {};
        var grid = generate(model9, s, null, { fastSeed: false, restartThreshold: 0, stats: stats });
        expect(SG.model.isSolution(model9, grid)).toBe(true);
        expect(stats.attempts).toBe(stats.restarts + 1);
        if (stats.restarts > 0) restarted++;
      }
      expect(restarted).toBeGreaterThan(0);
    });

    it('is still deterministic when restarts happen', function () {
      for (var s = 1; s <= 20; s++) {
        var a = {};
        var b = {};
        var g1 = generate(model9, s, null, { fastSeed: false, restartThreshold: 0, stats: a });
        var g2 = generate(model9, s, null, { fastSeed: false, restartThreshold: 0, stats: b });
        expect(g1).toEqual(g2);
        expect(a).toEqual(b);
      }
    });

    it('lets the last attempt run without a backtrack limit, so generation always finishes', function () {
      var stats = {};
      var grid = generate(model9, 4, null, {
        fastSeed: false, restartThreshold: 0, maxRestarts: 0, stats: stats
      });
      expect(SG.model.isSolution(model9, grid)).toBe(true);
      expect(stats.restarts).toBe(0);
      expect(stats.attempts).toBe(1);
    });

    it('uses a default threshold of 50 failed guesses per cell that an easy grid never reaches', function () {
      var stats = {};
      generate(model9, 6, null, { stats: stats });
      expect(stats.restarts).toBe(0);
    });

    it('throws fullGrid.unsatisfiable for a model that has no solution', function () {
      var model = SG.model.create({
        variantId: 'k4-two-digits',
        digits: 2,
        units: [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]],
        layout: { rows: 2, cols: 2, cellRow: [0, 0, 1, 1], cellCol: [0, 1, 0, 1], cellRegion: [0, 0, 0, 0] }
      });
      expectCode(function () { generate(model, 1); }, 'fullGrid.unsatisfiable');
    });

    it('stops with budget.exceeded or budget.cancelled instead of running on', function () {
      expectCode(function () {
        generate(model9, 1, SG.budget.create({ nodes: 1 }), { fastSeed: false });
      }, 'budget.exceeded');
      var budget = SG.budget.create({});
      budget.cancel();
      expectCode(function () { generate(model9, 1, budget, { fastSeed: false }); }, 'budget.cancelled');
    });

    it('creates its own random stream when no rng is passed', function () {
      expect(SG.model.isSolution(model4, SG.fullGrid.generate(model4))).toBe(true);
    });
  });

  describe('full grid: the restartThreshold of the variant definition', function () {
    var IDS = ['thresholdTight', 'thresholdLoose'];
    var LIMITS = { thresholdTight: 1, thresholdLoose: 100000 };
    var boards = {};

    function registerProbe(id) {
      boards[id] = SG.fixtures.models.boxGrid(id, 4, 4);
      SG.variants.register({
        id: id, i18nKey: 'variant.' + id, group: 'test', digits: 16, difficultySupport: ['easy'],
        defaultSymbolMode: 'digits', symbolModes: ['digits'], options: [], restartThreshold: LIMITS[id],
        build: function () { return boards[id]; }
      });
    }

    beforeEach(function () { IDS.forEach(registerProbe); });
    afterEach(function () { IDS.forEach(function (id) { SG.variants.unregister(id); }); });

    // A 16x16 board without a fastSeed: plain DFS runs into a failed guess now and then, so a threshold of 1
    // restarts some of the 60 grids (4 of them, measured) and a loose one never does.
    var SEEDS = 60;

    function restartsOver(model, options) {
      var total = 0;
      for (var s = 1; s <= SEEDS; s++) {
        var stats = {};
        var grid = generate(model, s, null, Object.assign({ stats: stats }, options));
        expect(SG.model.isSolution(model, grid)).toBe(true);
        total += stats.restarts;
      }
      return total;
    }

    it('is used when the caller gives no restartThreshold: a tight value restarts, a loose one never does',
      function () {
        expect(restartsOver(boards.thresholdTight, {})).toBeGreaterThan(0);
        expect(restartsOver(boards.thresholdLoose, {})).toBe(0);
      });

    it('is reported as the limit of the restart events', function () {
      var limits = {};
      for (var s = 1; s <= SEEDS; s++) {
        var out = [];
        var emitter = SG.events.createEmitter('full', function (e) { out.push(e); });
        generate(boards.thresholdTight, s, null, { emit: emitter });
        out.filter(function (e) { return e.i18nKey === 'fullGrid.restart'; }).forEach(function (e) {
          limits[e.i18nArgs.limit] = true;
        });
      }
      expect(Object.keys(limits)).toEqual(['1']);
    });

    it('loses against an explicit option of the caller', function () {
      expect(restartsOver(boards.thresholdTight, { restartThreshold: 100000 })).toBe(0);
      expect(restartsOver(boards.thresholdLoose, { restartThreshold: 1 })).toBeGreaterThan(0);
    });

    it('is left out for a variant that declares none: 50 failed guesses per cell is the default',
      function () {
        var plain = SG.fixtures.models.boxGrid('thresholdNone', 4, 4);
        expect(SG.variants.has('thresholdNone')).toBe(false);
        expect(restartsOver(plain, {})).toBe(0);
      });

    it('is still deterministic when the variant value makes the search restart', function () {
      for (var s = 1; s <= SEEDS; s++) {
        expect(generate(boards.thresholdTight, s)).toEqual(generate(boards.thresholdTight, s));
      }
    });

    it('mega12 and mega16 declare one, and passing that number by hand gives the same grid', function () {
      if (!SG.variants.has('mega12') || !SG.variants.has('mega16')) SG.test.skip('the Mega variants are ' +
        'not loaded');
      ['mega12', 'mega16'].forEach(function (id) {
        var def = SG.variants.get(id);
        expect(Number.isInteger(def.restartThreshold)).toBe(true);
        var model = def.build({}, SG.rng.create(1));
        var stats = {};
        var grid = generate(model, 2, null, { stats: stats });
        expect(SG.model.isSolution(model, grid)).toBe(true);
        // Same grid as with the number passed by hand (the option and the definition agree).
        expect(generate(model, 2, null, { restartThreshold: def.restartThreshold })).toEqual(grid);
      });
    });
  });

  describe('full grid: larger boards (12 and 16 digits)', function () {
    [['mega12-like', 3, 4], ['mega16-like', 4, 4]].forEach(function (spec) {
      var model = SG.fixtures.models.boxGrid(spec[0], spec[1], spec[2]);

      it(spec[0] + ': the model is valid and a grid generates, digs and stays unique', function () {
        expect(SG.model.validate(model).ok).toBe(true);
        for (var s = 1; s <= 5; s++) {
          var rng = SG.rng.create(s);
          var grid = SG.fullGrid.generate(model, rng.fork('grid'), null);
          expect(SG.model.isSolution(model, grid)).toBe(true);
          expect(Math.max.apply(null, Array.from(grid))).toBe(model.digits);
          var puzzle = SG.digger.dig(model, grid, rng.fork('dig'), { symmetry: 'rotational180' });
          expect(SG.dfs.countSolutions(model, puzzle.givens, 2)).toBe(1);
          expect(puzzle.clues).toBeLessThan(model.cellCount);
        }
      });
    });

    it('the 16-digit candidate mask uses all 16 bits', function () {
      var model = SG.fixtures.models.boxGrid('mega16-like', 4, 4);
      var state = SG.model.initState(model);
      expect(state.candidates[0]).toBe(0xffff);
      expect(SG.constraints.assign(model, state, 0, 16)).toBe(true);
      expect(state.candidates[1] & 0x8000).toBe(0);
      expect(state.candidates[1]).toBe(0x7fff);
    });
  });
})();
