// Jigsaw Sudoku (task T-5.3): the region generator of design.md 8.1, the jigsaw9 variant built on it and the
// common variant criteria CV1-CV9 of task.md phase P5. Layouts are checked independently of the code that makes
// them (own flood fill, own perimeter count, an exhaustive solve), and the solvability check of the builder is
// exercised with a real unsolvable layout (a 4x4 board) and with a stand-in for the full grid generator.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var J = SG.jigsaw;
  var def = SG.variants.get('jigsaw9');

  var LEVELS = ['veryEasy', 'easy', 'medium', 'hard', 'expert', 'evil'];
  /** design.md 9.1, jigsaw9 row, p95 in ms. 'easy' has no column there and takes the next one. */
  var BUDGET_MS = { veryEasy: 150, easy: 350, medium: 350, hard: 900, expert: 2000, evil: 5000 };

  var LAYOUT_COUNT = 200;
  var PUZZLES_PER_LEVEL = 20;

  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
    return thrown;
  }

  /** The rng the pipeline hands to `build`. */
  function modelRng(seed) { return SG.rng.create(seed).fork('model'); }

  function buildModel(seed, options) { return def.build(options || {}, modelRng(seed)); }

  function regionList(model) { return Array.prototype.slice.call(model.layout.cellRegion); }

  function mean(values) {
    return values.reduce(function (a, b) { return a + b; }, 0) / values.length;
  }

  function percentile(values, p) {
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  }

  // ---------------------------------------------------------------------------------------------
  // Independent checks (they share no code with js/variants/jigsaw.js)
  // ---------------------------------------------------------------------------------------------

  /** Every way in which `regions` (row-major, size x size) is not nine connected regions of nine cells. */
  function layoutProblems(regions, size) {
    var problems = [];
    var n = size * size;
    var cells = {};
    var c;
    if (regions.length !== n) return ['wrong length ' + regions.length];
    for (c = 0; c < n; c++) (cells[regions[c]] = cells[regions[c]] || []).push(c);
    var ids = Object.keys(cells);
    if (ids.length !== size) problems.push(ids.length + ' regions instead of ' + size);
    ids.forEach(function (id) {
      var list = cells[id];
      if (list.length !== size) problems.push('region ' + id + ' has ' + list.length + ' cells');
      var inRegion = {};
      list.forEach(function (cell) { inRegion[cell] = true; });
      var seen = {};
      var queue = [list[0]];
      seen[list[0]] = true;
      while (queue.length > 0) {
        var cell = queue.pop();
        var r = Math.floor(cell / size);
        var col = cell % size;
        var next = [];
        if (r > 0) next.push(cell - size);
        if (r < size - 1) next.push(cell + size);
        if (col > 0) next.push(cell - 1);
        if (col < size - 1) next.push(cell + 1);
        next.forEach(function (y) {
          if (inRegion[y] && !seen[y]) {
            seen[y] = true;
            queue.push(y);
          }
        });
      }
      if (Object.keys(seen).length !== list.length) problems.push('region ' + id + ' is not connected');
      var rowsUsed = {};
      var colsUsed = {};
      list.forEach(function (cell) {
        rowsUsed[Math.floor(cell / size)] = true;
        colsUsed[cell % size] = true;
      });
      if (Object.keys(rowsUsed).length === 1 || Object.keys(colsUsed).length === 1) {
        problems.push('region ' + id + ' is a bare row or column');
      }
    });
    return problems;
  }

  /** Mean number of cell sides per region that touch another region or the outside of the board. */
  function perimeterOf(regions, size) {
    var sides = 0;
    var moves = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        for (var m = 0; m < 4; m++) {
          var rr = r + moves[m][0];
          var cc = c + moves[m][1];
          var outside = rr < 0 || rr >= size || cc < 0 || cc >= size;
          if (outside || regions[rr * size + cc] !== regions[r * size + c]) sides++;
        }
      }
    }
    return sides / size;
  }

  /** Does `grid` hold every digit once per row, column and region of the layout? Judged from the layout alone. */
  function gridFitsLayout(grid, regions, size) {
    var groups = [];
    var k;
    for (k = 0; k < 3 * size; k++) groups.push([]);
    for (var cell = 0; cell < size * size; cell++) {
      groups[Math.floor(cell / size)].push(grid[cell]);
      groups[size + (cell % size)].push(grid[cell]);
      groups[2 * size + regions[cell]].push(grid[cell]);
    }
    return groups.every(function (g) {
      var sorted = g.slice().sort(function (a, b) { return a - b; });
      return sorted.every(function (v, i) { return v === i + 1; });
    });
  }

  /** The same board with only the row and column units: what the puzzle would be without the regions. */
  function withoutRegions(model) {
    var D = model.digits;
    return SG.model.create({
      variantId: 'jigsaw-no-regions',
      digits: D,
      cellCount: model.cellCount,
      units: model.units.slice(0, 2 * D).map(function (u) { return Array.from(u); }),
      unitMeta: model.unitMeta.slice(0, 2 * D).map(function (m) { return Object.assign({}, m); }),
      layout: {
        rows: D,
        cols: D,
        cellRow: Array.from(model.layout.cellRow),
        cellCol: Array.from(model.layout.cellCol)
      }
    });
  }

  function parseLayout(text) {
    return Int32Array.from(text.replace(/\|/g, '').split('').map(Number));
  }

  // ---------------------------------------------------------------------------------------------
  // Shared data, built on first use
  // ---------------------------------------------------------------------------------------------

  var cache = {};

  /** 200 layouts of the default compactness, as the pipeline would build them, with the generator statistics. */
  function layouts() {
    if (!cache.layouts) {
      cache.layouts = [];
      for (var seed = 1; seed <= LAYOUT_COUNT; seed++) {
        var stats = {};
        var started = now();
        var regions = J.generateRegions(modelRng(seed), { stats: stats });
        var ms = now() - started;
        cache.layouts.push({ seed: seed, regions: regions, stats: stats, ms: ms });
      }
    }
    return cache.layouts;
  }

  /** Models of the 200 layouts (the layouts are the ones `def.build` makes, see the test that compares them). */
  function layoutModels() {
    if (!cache.models) {
      cache.models = layouts().map(function (item) { return J.modelFromRegions('jigsaw9', 9, item.regions); });
    }
    return cache.models;
  }

  /** Mean perimeter of 60 layouts of the given compactness (computed once per value). */
  function perimeterAt(compactness) {
    cache.perimeters = cache.perimeters || {};
    if (cache.perimeters[compactness] === undefined) {
      var values = [];
      for (var seed = 1; seed <= 60; seed++) {
        var regions = J.generateRegions(SG.rng.create(seed).fork('compactness'), { compactness: compactness });
        values.push(J.meanPerimeter(regions, 9));
      }
      cache.perimeters[compactness] = mean(values);
    }
    return cache.perimeters[compactness];
  }

  // ---------------------------------------------------------------------------------------------
  // The variant definition
  // ---------------------------------------------------------------------------------------------

  describe('jigsaw9: variant definition (design.md 5.3 / 13.8)', function () {
    it('is registered with the fields of the contract', function () {
      expect(SG.variants.has('jigsaw9')).toBe(true);
      expect(def.id).toBe('jigsaw9');
      expect(def.i18nKey).toBe('variant.jigsaw9');
      expect(def.digits).toBe(9);
      expect(def.group).not.toBe('classic');
      expect(def.difficultySupport).toEqual(LEVELS);
      expect(def.symbolModes).toContain(def.defaultSymbolMode);
      expect(def.defaultSymbolMode).toBe('digits');
      expect(typeof def.build).toBe('function');
    });

    it('does not need a pre-fill, a post step or a dig strategy of its own', function () {
      expect(def.fastSeed).toBeUndefined();
      expect(def.postGenerate).toBeUndefined();
      expect(def.digStrategy).toBeUndefined();
    });

    it('describes compactness as a 0..1 slider with the default 0.6, for the generated control panel',
      function () {
        expect(def.options).toHaveLength(1);
        var o = def.options[0];
        expect(o.id).toBe('compactness');
        expect(o.type).toBe('slider');
        expect(o.min).toBe(0);
        expect(o.max).toBe(1);
        expect(o.default).toBe(0.6);
        expect(o.default).toBe(J.DEFAULT_COMPACTNESS);
        expect(o.step).toBeGreaterThan(0);
        expect(o.step).toBeLessThanOrEqual(0.1);
        ['i18nKey', 'hintKey', 'minLabelKey', 'maxLabelKey'].forEach(function (field) {
          expect(typeof o[field]).toBe('string');
          expect(o[field]).not.toBe('');
        });
        expect(Object.isFrozen(def.options)).toBe(true);
        expect(Object.isFrozen(o)).toBe(true);
      });

    it('loading the file again changes nothing (no second registration)', function () {
      var env = SG.test.node;
      if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
      var before = SG.variants.list().length;
      var fragments = SG.localeFragments.length;
      var again = SG.variants.get('jigsaw9');
      env.vm.runInThisContext(env.fs.readFileSync(env.path.join(env.root, 'js/variants/jigsaw.js'), 'utf8'));
      expect(SG.variants.list()).toHaveLength(before);
      expect(SG.variants.get('jigsaw9')).toBe(again);
      expect(SG.localeFragments).toHaveLength(fragments);
    });
  });

  describe('jigsaw9: the model (CV1)', function () {
    it('has 27 units: 9 rows, 9 columns, 9 regions of 9 cells, in that order', function () {
      var m = buildModel(1);
      expect(m.variantId).toBe('jigsaw9');
      expect(m.digits).toBe(9);
      expect(m.cellCount).toBe(81);
      expect(m.units).toHaveLength(27);
      expect(m.unitMeta.map(function (u) { return u.kind; })).toEqual(
        [].concat(new Array(9).fill('row'), new Array(9).fill('col'), new Array(9).fill('region')));
      m.units.forEach(function (u) { expect(u).toHaveLength(9); });
      expect(m.unitMeta[0].label).toBe('R1');
      expect(m.unitMeta[9].label).toBe('C1');
      expect(m.unitMeta[18].label).toBe('J1');
      expect(m.unitMeta[26].label).toBe('J9');
      expect(m.cages).toEqual([]);
      expect(m.inequalities).toEqual([]);
    });

    it('region units are exactly the cells of each region number', function () {
      var m = buildModel(2);
      for (var g = 0; g < 9; g++) {
        var expected = [];
        for (var c = 0; c < 81; c++) if (m.layout.cellRegion[c] === g) expected.push(c);
        expect(Array.from(m.units[18 + g])).toEqual(expected);
      }
    });

    it('passes SG.model.validate (V1-V8) for 50 seeds, and its trial solve is conclusive', function () {
      for (var seed = 1; seed <= 50; seed++) {
        var m = buildModel(seed);
        var report = SG.model.validate(m);
        if (!report.ok) throw new Error('seed ' + seed + ': ' + report.errors.join('; '));
        if (report.warnings.length > 0) throw new Error('seed ' + seed + ': ' + report.warnings.join('; '));
      }
    });

    it('lays the cells out as a 9x9 canvas with one region number per cell and no overlays', function () {
      var m = buildModel(3);
      var l = m.layout;
      expect(l.rows).toBe(9);
      expect(l.cols).toBe(9);
      expect(l.cellRegion).toBeInstanceOf(Int32Array);
      expect(l.cellRegion).toHaveLength(81);
      expect(l.overlays).toHaveLength(0);
      expect(l.subGrids).toHaveLength(1);
      for (var c = 0; c < 81; c++) {
        expect(l.cellRow[c]).toBe(Math.floor(c / 9));
        expect(l.cellCol[c]).toBe(c % 9);
      }
    });

    it('is immutable like every model', function () {
      var m = buildModel(4);
      expect(Object.isFrozen(m)).toBe(true);
      expect(Object.isFrozen(m.layout)).toBe(true);
    });

    it('rejects a compactness outside 0..1 or of the wrong type (pipeline.invalidOption), accepts the ends',
      function () {
        [-0.01, 1.01, NaN, Infinity, '0.5', true, {}, []].forEach(function (bad) {
          var e = expectCode(function () { def.build({ compactness: bad }, modelRng(1)); }, 'pipeline.invalidOption');
          expect(e.i18nArgs.option).toBe('compactness');
        });
        [0, 1, 0.6].forEach(function (good) {
          expect(def.build({ compactness: good }, modelRng(1)).cellCount).toBe(81);
        });
        [undefined, null, {}].forEach(function (opts) {
          expect(def.build(opts, modelRng(1)).cellCount).toBe(81);
        });
      });

    it('a missing compactness means 0.6: the layout is the one of an explicit 0.6', function () {
      expect(regionList(buildModel(5))).toEqual(regionList(buildModel(5, { compactness: 0.6 })));
    });

    it('without an rng it uses a fixed one: the same layout every time', function () {
      var a = def.build({}, null);
      var b = def.build({}, undefined);
      expect(regionList(a)).toEqual(regionList(b));
      expect(SG.model.validate(a).ok).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Layouts
  // ---------------------------------------------------------------------------------------------

  describe('jigsaw9: region layouts (design.md 8.1)', function () {
    it('all ' + LAYOUT_COUNT + ' layouts have 9 connected regions of exactly 9 cells', function () {
      layoutModels().forEach(function (m, i) {
        var problems = layoutProblems(regionList(m), 9);
        if (problems.length > 0) throw new Error('seed ' + (i + 1) + ': ' + problems.join('; '));
      });
    });

    it('the generator and the variant builder give the same layout for the same rng', function () {
      layouts().slice(0, 40).forEach(function (item, i) {
        expect(Array.from(item.regions)).toEqual(regionList(buildModel(i + 1)));
      });
    });

    it('region numbers follow the reading order of their first cell (region 0 holds cell 0)', function () {
      layoutModels().forEach(function (m) {
        var seen = [];
        for (var c = 0; c < 81; c++) {
          var g = m.layout.cellRegion[c];
          if (seen.indexOf(g) === -1) seen.push(g);
        }
        expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      });
    });

    it('no region is a bare row or column (it would only repeat that unit)', function () {
      layoutModels().forEach(function (m) {
        var regions = regionList(m);
        for (var g = 0; g < 9; g++) {
          var rows = {};
          var cols = {};
          for (var c = 0; c < 81; c++) {
            if (regions[c] === g) {
              rows[Math.floor(c / 9)] = true;
              cols[c % 9] = true;
            }
          }
          expect(Object.keys(rows).length).toBeGreaterThan(1);
          expect(Object.keys(cols).length).toBeGreaterThan(1);
        }
      });
    });

    it('is deterministic: the same seed gives the same layout, another seed another one', function () {
      for (var seed = 1; seed <= 20; seed++) {
        expect(regionList(buildModel(seed))).toEqual(regionList(layoutModels()[seed - 1]));
      }
      var distinct = {};
      layoutModels().forEach(function (m) { distinct[regionList(m).join('')] = true; });
      expect(Object.keys(distinct).length).toBeGreaterThan(LAYOUT_COUNT - 3);
    });

    it('layouts are not just the classic boxes in disguise: the regions take many different shapes', function () {
      var shapes = {};
      layoutModels().forEach(function (m) {
        var regions = regionList(m);
        for (var g = 0; g < 9; g++) {
          var cells = [];
          for (var c = 0; c < 81; c++) if (regions[c] === g) cells.push(c);
          var top = Math.floor(cells[0] / 9);
          var left = Math.min.apply(null, cells.map(function (c) { return c % 9; }));
          shapes[cells.map(function (c) { return (Math.floor(c / 9) - top) + ',' + ((c % 9) - left); }).join(' ')] = true;
        }
      });
      expect(Object.keys(shapes).length).toBeGreaterThan(500);
    });

    it('builds a layout in a few milliseconds (mean over ' + LAYOUT_COUNT + ')', function () {
      var times = layouts().map(function (item) { return item.ms; });
      expect(mean(times)).toBeLessThan(15);
      expect(percentile(times, 0.99)).toBeLessThan(100);
    });
  });

  describe('jigsaw9: growth statistics (reseeds and backtracks)', function () {
    it('reports attempts, reseeds, backtracks and the layouts dropped as unsolvable or too hard', function () {
      layouts().forEach(function (item) {
        var s = item.stats;
        expect(s.attempts).toBeGreaterThanOrEqual(1);
        expect(s.reseeds).toBe(s.attempts - 1);
        expect(s.backtracks).toBeGreaterThanOrEqual(0);
        expect(s.unsolvable).toBeGreaterThanOrEqual(0);
        expect(s.hard).toBeGreaterThanOrEqual(0);
        expect(s.unsolvable + s.hard).toBeLessThanOrEqual(s.reseeds);
      });
    });

    it('the Hall and matching checks keep dead ends rare: about one attempt per layout, never a long streak',
      function () {
        var attempts = layouts().map(function (item) { return item.stats.attempts; });
        expect(mean(attempts)).toBeLessThan(2);
        expect(Math.max.apply(null, attempts)).toBeLessThan(15);
        var backtracks = layouts().map(function (item) { return item.stats.backtracks; });
        expect(mean(backtracks)).toBeLessThan(60);
      });

    it('every attempt is bounded: with maxBacktracks 5 an attempt undoes at most 6 moves', function () {
      for (var seed = 1; seed <= 30; seed++) {
        var stats = {};
        J.generateRegions(SG.rng.create(seed), { maxBacktracks: 5, stats: stats });
        expect(stats.backtracks).toBeLessThanOrEqual(stats.attempts * 6);
      }
    });

    it('with maxBacktracks 0 it reseeds instead of searching, and still delivers a valid layout', function () {
      var total = 0;
      for (var seed = 1; seed <= 20; seed++) {
        var stats = {};
        var regions = J.generateRegions(SG.rng.create(seed), { maxBacktracks: 0, stats: stats });
        expect(layoutProblems(Array.from(regions), 9)).toEqual([]);
        total += stats.reseeds;
      }
      expect(total).toBeGreaterThan(0);
    });
  });

  describe('jigsaw9: compactness', function () {
    it('measures the perimeter of a region: 12 for a 3x3 block, 20 for a bare row', function () {
      var boxes = SG.variants.get('classic9').build({}, null).layout.cellRegion;
      expect(J.meanPerimeter(boxes, 9)).toBe(12);
      expect(perimeterOf(boxes, 9)).toBe(12);
      var rows = [];
      for (var c = 0; c < 81; c++) rows.push(Math.floor(c / 9));
      expect(J.meanPerimeter(rows, 9)).toBe(20);
      expect(perimeterOf(rows, 9)).toBe(20);
    });

    it('agrees with an independent perimeter count on every generated layout', function () {
      layouts().slice(0, 50).forEach(function (item) {
        expect(J.meanPerimeter(item.regions, 9)).toBe(perimeterOf(Array.from(item.regions), 9));
      });
    });

    it('high compactness gives clearly rounder regions than low compactness (mean perimeter)', function () {
      var low = perimeterAt(0);
      var mid = perimeterAt(0.6);
      var high = perimeterAt(1);
      // Measured over 300 layouts: about 17.0, 15.4 and 15.1 for compactness 0, 0.6 and 1.
      expect(high).toBeLessThan(low - 1.2);
      expect(mid).toBeLessThan(low - 0.8);
      expect(high).toBeLessThanOrEqual(mid + 0.15);
      expect(low).toBeGreaterThan(16);
      expect(high).toBeLessThan(16);
    });

    it('perimeter falls steadily from 0 to 1 in steps of 0.25', function () {
      var values = [0, 0.25, 0.5, 0.75, 1].map(perimeterAt);
      for (var i = 1; i < values.length; i++) expect(values[i]).toBeLessThan(values[i - 1] + 0.3);
      expect(values[4]).toBeLessThan(values[0] - 1);
    });

    it('layouts are valid and solvable at every compactness, including the ends', function () {
      [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1].forEach(function (c) {
        for (var seed = 1; seed <= 15; seed++) {
          var m = buildModel(seed, { compactness: c });
          expect(layoutProblems(regionList(m), 9)).toEqual([]);
          var grid = SG.fullGrid.generate(m, SG.rng.create(seed), SG.budget.create({ nodes: 1e6 }));
          expect(gridFitsLayout(grid, regionList(m), 9)).toBe(true);
        }
      });
    });

    it('the option travels through the pipeline: variantOptions.compactness shapes the layout', function () {
      var low = [];
      var high = [];
      for (var seed = 1; seed <= 12; seed++) {
        var cfg = { variantId: 'jigsaw9', difficulty: 'veryEasy', seed: seed, trace: 'off' };
        low.push(J.meanPerimeter(SG.pipeline.run(Object.assign({ variantOptions: { compactness: 0 } }, cfg), null)
          .model.layout.cellRegion, 9));
        high.push(J.meanPerimeter(SG.pipeline.run(Object.assign({ variantOptions: { compactness: 1 } }, cfg), null)
          .model.layout.cellRegion, 9));
      }
      expect(mean(high)).toBeLessThan(mean(low) - 0.8);
    });

    it('a bad compactness in the pipeline config is reported as pipeline.invalidOption', function () {
      expectCode(function () {
        SG.pipeline.run({ variantId: 'jigsaw9', difficulty: 'easy', seed: 1, trace: 'off',
          variantOptions: { compactness: 2 } }, null);
      }, 'pipeline.invalidOption');
    });
  });

  describe('jigsaw layouts: checkRegions', function () {
    it('accepts a well formed layout, the classic boxes included', function () {
      var boxes = SG.variants.get('classic9').build({}, null).layout.cellRegion;
      expect(J.checkRegions(boxes, 9)).toEqual([]);
      expect(J.checkRegions(buildModel(1).layout.cellRegion)).toEqual([]);
    });

    it('reports a wrong length, a bad region number, a wrong size, a split region and a bare row', function () {
      var boxes = Array.from(SG.variants.get('classic9').build({}, null).layout.cellRegion);
      expect(J.checkRegions(boxes.slice(1), 9)[0]).toMatch('expected 81 cells');

      var bad = boxes.slice();
      bad[4] = 9;
      expect(J.checkRegions(bad, 9)[0]).toMatch('invalid region');

      var sizes = boxes.slice();
      sizes[0] = 1;
      expect(J.checkRegions(sizes, 9).join(' ')).toMatch('region 0 has 8 cells');
      expect(J.checkRegions(sizes, 9).join(' ')).toMatch('region 1 has 10 cells');

      // Swap two cells of different boxes so that each box keeps 9 cells but one of them falls apart.
      var split = boxes.slice();
      split[0] = 8;
      split[80] = 0;
      expect(J.checkRegions(split, 9).join(' ')).toMatch('not connected');

      var rows = [];
      for (var c = 0; c < 81; c++) rows.push(Math.floor(c / 9));
      expect(J.checkRegions(rows, 9).join(' ')).toMatch('bare row or column');
    });

    it('checks other board sizes too', function () {
      expect(J.checkRegions(parseLayout('0011|0011|2233|2233'), 4)).toEqual([]);
      expect(J.checkRegions(parseLayout('0000|1111|2222|3333'), 4).join(' ')).toMatch('bare row or column');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Solvability: not every layout has a solution
  // ---------------------------------------------------------------------------------------------

  describe('jigsaw9: no unsolvable layout escapes the builder', function () {
    it('every one of the ' + LAYOUT_COUNT + ' layouts has a solution, found by two independent searches',
      function () {
        layoutModels().forEach(function (m, i) {
          var randomised = SG.fullGrid.generate(m, SG.rng.create(5000 + i), SG.budget.create({ nodes: 2e6 }));
          if (!SG.model.isSolution(m, randomised)) throw new Error('seed ' + (i + 1) + ': the grid is invalid');
          if (!gridFitsLayout(randomised, regionList(m), 9)) throw new Error('seed ' + (i + 1) + ': grid breaks a rule');
          var plain = SG.dfs.solve(m, m.fixedCells, null, SG.budget.create({ nodes: 50000 }));
          if (plain === null || !gridFitsLayout(plain, regionList(m), 9)) throw new Error('seed ' + (i + 1) + ': plain');
        });
      });

    it('SG.jigsaw.hasSolution and solvesPlainly say yes for a layout that has solutions', function () {
      var boxes = SG.variants.get('classic9').build({}, null);
      expect(J.hasSolution(boxes, SG.rng.create(1))).toBe(true);
      expect(J.hasSolution(buildModel(7), SG.rng.create(1))).toBe(true);
      expect(J.solvesPlainly(boxes)).toBe(true);
      expect(J.solvesPlainly(buildModel(7))).toBe(true);
    });

    // Found by enumerating 4x4 partitions into four connected regions of four cells and proving by exhaustive
    // search that no digit grid fits: not every Jigsaw layout is solvable.
    var UNSOLVABLE_4X4 = ['1100|2110|2230|2333', '1000|1102|3122|3332', '1100|1002|1322|3332',
      '2000|2201|3211|3331', '0001|0211|2231|2333', '0001|2011|2213|2333'];

    it('the fixtures really are unsolvable boards (exhaustive search) of well formed layouts', function () {
      UNSOLVABLE_4X4.forEach(function (text) {
        var regions = parseLayout(text);
        expect(layoutProblems(Array.from(regions), 4)).toEqual([]);
        var model = J.modelFromRegions('jigsaw4', 4, regions);
        expect(SG.dfs.countSolutions(model, model.fixedCells, 1)).toBe(0);
      });
    });

    it('hasSolution and solvesPlainly reject every unsolvable fixture', function () {
      UNSOLVABLE_4X4.forEach(function (text) {
        var model = J.modelFromRegions('jigsaw4', 4, parseLayout(text));
        expect(J.hasSolution(model, SG.rng.create(1))).toBe(false);
        expect(J.solvesPlainly(model)).toBe(false);
      });
    });

    it('on 4x4 boards, where unsolvable partitions are common, none is ever returned', function () {
      var dropped = 0;
      for (var seed = 1; seed <= 150; seed++) {
        var stats = {};
        var regions = J.generateRegions(SG.rng.create(seed), { size: 4, stats: stats });
        expect(layoutProblems(Array.from(regions), 4)).toEqual([]);
        var model = J.modelFromRegions('jigsaw4', 4, regions);
        if (SG.dfs.countSolutions(model, model.fixedCells, 1) !== 1) throw new Error('seed ' + seed + ' unsolvable');
        dropped += stats.unsolvable;
      }
      expect(dropped).toBeGreaterThan(0);
    });

    it('rejects a board size that makes no sense (pipeline.invalidOption)', function () {
      [0, 1, 17, 4.5, '9', null].forEach(function (bad) {
        expectCode(function () { J.generateRegions(SG.rng.create(1), { size: bad }); }, 'pipeline.invalidOption');
      });
    });

    it('grows boards of other sizes as well (6x6 here)', function () {
      for (var seed = 1; seed <= 20; seed++) {
        var regions = J.generateRegions(SG.rng.create(seed), { size: 6 });
        expect(layoutProblems(Array.from(regions), 6)).toEqual([]);
        var model = J.modelFromRegions('jigsaw6', 6, regions);
        expect(SG.dfs.countSolutions(model, model.fixedCells, 1)).toBe(1);
      }
    });

    describe('the builder drops a layout when the check says no', function () {
      var original = SG.fullGrid.generate;
      var originalSolve = SG.dfs.solve;
      afterEach(function () {
        SG.fullGrid.generate = original;
        SG.dfs.solve = originalSolve;
      });

      function unsatisfiable() { return new SG.errors.GenerationError('fullGrid.unsatisfiable', {}); }

      it('drops a layout that the plain search cannot solve in time, and counts it as hard', function () {
        var calls = 0;
        SG.dfs.solve = function () {
          calls++;
          if (calls <= 2) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' });
          return originalSolve.apply(SG.dfs, arguments);
        };
        var stats = {};
        var regions = J.generateRegions(SG.rng.create(17), { stats: stats });
        expect(layoutProblems(Array.from(regions), 9)).toEqual([]);
        expect(stats.hard).toBeGreaterThanOrEqual(2);
        expect(calls).toBe(stats.hard + 1);
        expect(stats.unsolvable).toBe(0);
      });

      it('lets an unexpected error of the plain search through', function () {
        SG.dfs.solve = function () { throw new TypeError('boom'); };
        expect(function () { J.generateRegions(SG.rng.create(18)); }).toThrow(TypeError);
      });

      it('reseeds once per rejection and delivers the first layout that passes', function () {
        var calls = 0;
        SG.fullGrid.generate = function () {
          calls++;
          if (calls <= 3) throw unsatisfiable();
          return original.apply(SG.fullGrid, arguments);
        };
        var stats = {};
        var regions = J.generateRegions(SG.rng.create(11), { stats: stats });
        expect(layoutProblems(Array.from(regions), 9)).toEqual([]);
        expect(calls).toBe(4);
        expect(stats.unsolvable).toBe(3);
        expect(stats.attempts).toBeGreaterThanOrEqual(4);
        expect(stats.reseeds).toBe(stats.attempts - 1);
      });

      it('treats an exhausted budget like an unsolvable layout', function () {
        var calls = 0;
        SG.fullGrid.generate = function () {
          calls++;
          if (calls <= 2) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' });
          return original.apply(SG.fullGrid, arguments);
        };
        var stats = {};
        J.generateRegions(SG.rng.create(12), { stats: stats });
        expect(stats.unsolvable).toBe(2);
      });

      it('hands the check a node budget, no time limit, and a small restart size (seeds stay reproducible)',
        function () {
          var seen = null;
          SG.fullGrid.generate = function (model, rng, budget, options) {
            seen = { budget: budget, options: options };
            return original.apply(SG.fullGrid, arguments);
          };
          J.generateRegions(SG.rng.create(13));
          expect(seen.options.restartThreshold).toBeLessThan(1000);
          // The budget reports its limits when it runs out: nodes only, so speed cannot change a layout.
          var out = null;
          try {
            for (var i = 0; i < 1e6; i++) seen.budget.check();
          } catch (e) {
            out = e;
          }
          expect(out).toBeTruthy();
          expect(out.code).toBe('budget.exceeded');
          expect(out.i18nArgs.reason).toBe('nodes');
          expect(out.i18nArgs.limitMs).toBe(Infinity);
          expect(out.i18nArgs.limitNodes).toBeLessThan(1e5);
        });

      it('gives up with jigsaw.layoutFailed (and the number of attempts) when every layout is rejected',
        function () {
          var calls = 0;
          SG.fullGrid.generate = function () { calls++; throw unsatisfiable(); };
          var e = expectCode(function () { J.generateRegions(SG.rng.create(14), { maxAttempts: 6 }); },
            'jigsaw.layoutFailed');
          expect(e.i18nArgs).toEqual({ attempts: 6 });
          expect(calls).toBeGreaterThan(0);
          expect(calls).toBeLessThanOrEqual(6);
        });

      it('lets an unexpected error through instead of hiding it', function () {
        SG.fullGrid.generate = function () { throw new TypeError('boom'); };
        expect(function () { J.generateRegions(SG.rng.create(15)); }).toThrow(TypeError);
      });

      it('lets other generation errors through (a cancelled run is not swallowed)', function () {
        SG.fullGrid.generate = function () { throw new SG.errors.GenerationError('budget.cancelled', {}); };
        expectCode(function () { J.generateRegions(SG.rng.create(16)); }, 'budget.cancelled');
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV2: full grids
  // ---------------------------------------------------------------------------------------------

  describe('jigsaw9: full grids (CV2)', function () {
    it('generates a valid full grid for 50 different seeds, each on its own layout', function () {
      var layoutsSeen = {};
      for (var seed = 1; seed <= 50; seed++) {
        var m = buildModel(seed * 31);
        var grid = SG.fullGrid.generate(m, SG.rng.create(seed).fork('grid#1'), null);
        if (!SG.model.isSolution(m, grid)) throw new Error('seed ' + seed + ': invalid grid');
        if (!gridFitsLayout(grid, regionList(m), 9)) throw new Error('seed ' + seed + ': breaks the layout');
        layoutsSeen[regionList(m).join('')] = true;
      }
      expect(Object.keys(layoutsSeen)).toHaveLength(50);
    });

    it('is deterministic for a given model and rng', function () {
      var m = buildModel(9);
      var a = SG.fullGrid.generate(m, SG.rng.create(1), null);
      var b = SG.fullGrid.generate(m, SG.rng.create(1), null);
      expect(a).toEqual(b);
    });

    it('a solution respects the regions: swapping two digits inside a region only is no longer a solution',
      function () {
        var m = buildModel(10);
        var grid = SG.fullGrid.generate(m, SG.rng.create(2), null);
        var cells = Array.from(m.units[18]);
        var broken = grid.slice();
        // Two cells of the first region that share neither a row nor a column.
        var a = cells[0];
        var b = cells.filter(function (c) { return c % 9 !== a % 9 && Math.floor(c / 9) !== Math.floor(a / 9); })[0];
        broken[a] = grid[b];
        broken[b] = grid[a];
        expect(SG.model.isSolution(m, broken)).toBe(false);
      });
  });

  // ---------------------------------------------------------------------------------------------
  // CV3 - CV6: puzzles at every level, invariants I1-I7, determinism, performance
  // ---------------------------------------------------------------------------------------------

  function generatePuzzle(level, seed, extra) {
    var config = Object.assign({ variantId: 'jigsaw9', difficulty: level, seed: seed, trace: 'off' }, extra);
    var started = now();
    var result = SG.pipeline.run(config, null);
    result.elapsedMs = now() - started;
    return result;
  }

  function puzzleRun() {
    if (!cache.puzzles) {
      cache.puzzles = {};
      LEVELS.forEach(function (level, li) {
        cache.puzzles[level] = [];
        for (var i = 0; i < PUZZLES_PER_LEVEL; i++) cache.puzzles[level].push(generatePuzzle(level, 700 + li * 100 + i));
      });
    }
    return cache.puzzles;
  }

  function clueCount(givens) {
    var k = 0;
    for (var c = 0; c < givens.length; c++) if (givens[c] !== 0) k++;
    return k;
  }

  describe('jigsaw9: puzzles at every level (CV3, CV4: invariants I1-I7)', function () {
    LEVELS.forEach(function (level) {
      describe(level + ': ' + PUZZLES_PER_LEVEL + ' puzzles', function () {
        it('I1: exactly one solution; I2: givens are part of the solution; I3: the solution is valid', function () {
          puzzleRun()[level].forEach(function (p, i) {
            var m = p.model;
            if (SG.dfs.countSolutions(m, p.givens, 2) !== 1) throw new Error('puzzle ' + i + ' is not unique');
            for (var c = 0; c < 81; c++) {
              if (p.givens[c] !== 0 && p.givens[c] !== p.solution[c]) throw new Error('puzzle ' + i + ': I2');
            }
            if (!SG.model.isSolution(m, p.solution)) throw new Error('puzzle ' + i + ': invalid solution');
            if (!gridFitsLayout(p.solution, regionList(m), 9)) throw new Error('puzzle ' + i + ': breaks layout');
            expect(layoutProblems(regionList(m), 9)).toEqual([]);
          });
        });

        it('I5: a puzzle that reached the level has its score in the band and its technique in the groups; ' +
          'I6: at least minClues givens', function () {
          var exact = 0;
          puzzleRun()[level].forEach(function (p, i) {
            var spec = SG.difficulty.spec(level, p.model);
            if (clueCount(p.givens) < spec.minClues) throw new Error('puzzle ' + i + ': too few clues');
            expect(p.config.difficulty).toBe(level);
            if (p.rating.level === level) {
              exact++;
              expect(p.rating.score).toBeGreaterThanOrEqual(spec.min);
              expect(p.rating.score).toBeLessThan(spec.max);
              if (p.rating.hardestGroup !== null) expect(spec.allowedGroups).toContain(p.rating.hardestGroup);
              expect(p.warnings).toEqual([]);
            }
            expect(SG.difficulty.rate(p.model, p.givens).level).toBe(p.rating.level);
          });
          // The soak criterion of T-2.10 (90% on classic9) holds for jigsaw9 as well.
          expect(exact / PUZZLES_PER_LEVEL).toBeGreaterThanOrEqual(0.9);
        });

        it('I7: every deduction of the technique ladder on the way to the solution is sound', function () {
          puzzleRun()[level].forEach(function (p, i) {
            expect(p.warnings).not.toContain('digger.unsoundTechnique');
            var report = SG.logicalSolver.solve(p.model, p.givens, { collectSteps: true });
            report.steps.forEach(function (step) {
              step.placements.forEach(function (pl) {
                if (p.solution[pl[0]] !== pl[1]) throw new Error('puzzle ' + i + ': ' + step.technique + ' is unsound');
              });
              step.eliminations.forEach(function (el) {
                if (p.solution[el[0]] === el[1]) throw new Error('puzzle ' + i + ': ' + step.technique + ' is unsound');
              });
            });
          });
        });

        it('CV6: p95 of the generation time is within the design.md 9.1 budget of ' + BUDGET_MS[level] + ' ms',
          function () {
            var times = puzzleRun()[level].map(function (p) { return p.elapsedMs; });
            expect(percentile(times, 0.95)).toBeLessThan(BUDGET_MS[level]);
          });
      });
    });

    it('the regions matter: without them the givens of a hard puzzle leave several solutions', function () {
      var total = 0;
      var ambiguous = 0;
      ['hard', 'expert', 'evil'].forEach(function (level) {
        puzzleRun()[level].forEach(function (p) {
          total++;
          if (SG.dfs.countSolutions(withoutRegions(p.model), p.givens, 2) === 2) ambiguous++;
        });
      });
      expect(ambiguous / total).toBeGreaterThanOrEqual(0.9);
    });

    it('clue counts fall with the difficulty', function () {
      var means = LEVELS.map(function (level) {
        return mean(puzzleRun()[level].map(function (p) { return clueCount(p.givens); }));
      });
      for (var i = 1; i < means.length; i++) expect(means[i]).toBeLessThan(means[i - 1]);
    });
  });

  describe('jigsaw9: same seed, same puzzle (CV5 / I4)', function () {
    it('every level: two runs give the same layout, givens and solution', function () {
      LEVELS.forEach(function (level, li) {
        [3 + li, 400 + li].forEach(function (seed) {
          var a = generatePuzzle(level, seed);
          var b = generatePuzzle(level, seed);
          expect(regionList(b.model)).toEqual(regionList(a.model));
          expect(Array.from(b.givens)).toEqual(Array.from(a.givens));
          expect(Array.from(b.solution)).toEqual(Array.from(a.solution));
          expect(b.rating.score).toBe(a.rating.score);
        });
      });
    });

    it('does not depend on the trace level or on a listening sink', function () {
      var base = generatePuzzle('hard', 77);
      ['off', 'summary', 'full'].forEach(function (trace) {
        var cfg = { variantId: 'jigsaw9', difficulty: 'hard', seed: 77, trace: trace };
        var withSink = SG.pipeline.run(cfg, function () {});
        expect(regionList(withSink.model)).toEqual(regionList(base.model));
        expect(Array.from(withSink.givens)).toEqual(Array.from(base.givens));
      });
    });

    it('another seed gives another layout and another puzzle', function () {
      var a = generatePuzzle('medium', 1000);
      var b = generatePuzzle('medium', 1001);
      expect(regionList(b.model)).not.toEqual(regionList(a.model));
      expect(Array.from(b.givens)).not.toEqual(Array.from(a.givens));
    });

    it('the same options give the same puzzle, other options another one', function () {
      var cfg = { variantOptions: { compactness: 0.9 } };
      var a = generatePuzzle('easy', 55, cfg);
      var b = generatePuzzle('easy', 55, cfg);
      var c = generatePuzzle('easy', 55, { variantOptions: { compactness: 0.1 } });
      expect(Array.from(b.givens)).toEqual(Array.from(a.givens));
      expect(regionList(c.model)).not.toEqual(regionList(a.model));
      expect(a.config.variantOptions).toEqual({ compactness: 0.9 });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV7: i18n
  // ---------------------------------------------------------------------------------------------

  describe('jigsaw9: strings in both languages (CV7)', function () {
    function fragments() {
      return SG.localeFragments.filter(function (f) { return f.en && f.en['variant.jigsaw9'] !== undefined; });
    }

    it('declares exactly one locale fragment, with en and vi', function () {
      expect(Array.isArray(SG.localeFragments)).toBe(true);
      expect(fragments()).toHaveLength(1);
      expect(typeof fragments()[0].en).toBe('object');
      expect(typeof fragments()[0].vi).toBe('object');
    });

    it('en and vi have the same keys and no empty value', function () {
      var f = fragments()[0];
      expect(Object.keys(f.vi).sort()).toEqual(Object.keys(f.en).sort());
      Object.keys(f.en).forEach(function (key) {
        expect(typeof f.en[key]).toBe('string');
        expect(f.en[key].trim()).not.toBe('');
        expect(typeof f.vi[key]).toBe('string');
        expect(f.vi[key].trim()).not.toBe('');
      });
    });

    it('covers the variant name, every key the option schema points at, and the error of the builder', function () {
      var f = fragments()[0];
      var o = def.options[0];
      [def.i18nKey, o.i18nKey, o.hintKey, o.minLabelKey, o.maxLabelKey, 'error.jigsaw.layoutFailed']
        .forEach(function (key) {
          expect(f.en[key]).toBeDefined();
          expect(f.vi[key]).toBeDefined();
        });
      expect(f.en['variant.jigsaw9']).toBe('Jigsaw Sudoku');
      expect(f.vi['variant.jigsaw9']).toBe('Sudoku Ghép hình');
    });

    it('the Vietnamese text is a translation, not a copy, and keeps the {attempts} placeholder', function () {
      var f = fragments()[0];
      Object.keys(f.en).forEach(function (key) {
        expect(f.vi[key]).not.toBe(f.en[key]);
      });
      expect(f.en['error.jigsaw.layoutFailed']).toContain('{attempts}');
      expect(f.vi['error.jigsaw.layoutFailed']).toContain('{attempts}');
    });

    it('is merged into the language packs when they are loaded (browser run)', function () {
      var locales = SG.locales;
      if (!locales || !locales.en || !locales.vi) SG.test.skip('the language packs are not loaded here');
      Object.keys(fragments()[0].en).forEach(function (key) {
        expect(locales.en[key]).toBeDefined();
        expect(locales.vi[key]).toBeDefined();
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV9: what the renderer needs
  // ---------------------------------------------------------------------------------------------

  describe('jigsaw9: data for the board view (CV9)', function () {
    /** What a renderer does with cellRegion: a thick border on every edge between two different regions. */
    function innerBorders(regions) {
      var borders = [];
      for (var r = 0; r < 9; r++) {
        for (var c = 0; c < 9; c++) {
          var cell = r * 9 + c;
          if (c < 8 && regions[cell] !== regions[cell + 1]) borders.push({ a: cell, b: cell + 1 });
          if (r < 8 && regions[cell] !== regions[cell + 9]) borders.push({ a: cell, b: cell + 9 });
        }
      }
      return borders;
    }

    it('thick borders sit on the edges between two regions: their length adds up to the region perimeters',
      function () {
        layoutModels().slice(0, 50).forEach(function (m) {
          var regions = regionList(m);
          var inner = innerBorders(regions).length;
          // Every inner border is a side of two regions; the frame of the board is a side of one cell each.
          expect(J.meanPerimeter(regions, 9) * 9).toBe(2 * inner + 4 * 9);
        });
      });

    it('every region has a thick border all the way round it, even where it touches the frame', function () {
      var m = buildModel(21);
      var regions = regionList(m);
      for (var g = 0; g < 9; g++) {
        var sides = 0;
        for (var c = 0; c < 81; c++) {
          if (regions[c] !== g) continue;
          var r = Math.floor(c / 9);
          var col = c % 9;
          if (r === 0 || regions[c - 9] !== g) sides++;
          if (r === 8 || regions[c + 9] !== g) sides++;
          if (col === 0 || regions[c - 1] !== g) sides++;
          if (col === 8 || regions[c + 1] !== g) sides++;
        }
        // A connected set of nine cells has at least 12 sides on its outline (the 3x3 block).
        expect(sides).toBeGreaterThanOrEqual(12);
      }
    });

    it('the regions form one patchwork: each borders another one, and all are reachable from region 0',
      function () {
        layoutModels().slice(0, 50).forEach(function (m, i) {
          var regions = regionList(m);
          var next = {};
          innerBorders(regions).forEach(function (e) {
            (next[regions[e.a]] = next[regions[e.a]] || {})[regions[e.b]] = true;
            (next[regions[e.b]] = next[regions[e.b]] || {})[regions[e.a]] = true;
          });
          var seen = { 0: true };
          var queue = [0];
          while (queue.length > 0) {
            var g = queue.pop();
            Object.keys(next[g] || {}).forEach(function (h) {
              if (!seen[h]) {
                seen[h] = true;
                queue.push(Number(h));
              }
            });
          }
          if (Object.keys(seen).length !== 9) throw new Error('layout ' + (i + 1) + ': regions are cut off');
        });
      });

    it('region numbers are 0..8, so a fill colour can be picked per region', function () {
      var seen = {};
      regionList(buildModel(22)).forEach(function (g) { seen[g] = true; });
      expect(Object.keys(seen).map(Number).sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });
  });
})();
