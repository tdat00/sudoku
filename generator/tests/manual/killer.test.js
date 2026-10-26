// Killer Sudoku: the combination table, cage propagation, the three cage techniques, cage
// generation, colouring and the whole pipeline for the variant `killer`.
//
//   - combo table      exhaustive check against brute force, size of the table, restricted digit sets
//   - propagation      the cage extension against brute-force solution counts on 4x4 boards, soundness and
//                      pruning on 9x9 models, the on-demand registration and the per-variant switch
//   - techniques       registration, fixtures, brute-force cross-check of cageCombo, soundness (invariant I7)
//                      for cageCombo, ruleOf45 and cageSplit through SG.techHelper.assertSound
//   - generation       20 puzzles per level (8 from expert on): CV1 - CV6 and the invariants I1 - I7
//   - cages            partition, distinct digits, sums, colouring, rendering geometry (CV9)
//   - repair           split / merge / reveal and the layout info
//   - i18n, events     every key in both languages, every event in the vocabulary
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.techHelper;
  var K = SG.killer;
  var T = SG.comboTable;

  var DEF = SG.variants.get('killer');
  var LEVELS = DEF.difficultySupport;
  var PER_LEVEL = 20;
  /** Fewer puzzles of the slow top levels (each takes a second or more), so that the suite stays quick. */
  var TOP_LEVEL_COUNT = 8;

  /** Puzzles of a level in the corpus. */
  function countOf(level) {
    var top = SG.difficulty.levelIndex(level) >= SG.difficulty.levelIndex('expert');
    return top ? TOP_LEVEL_COUNT : PER_LEVEL;
  }

  /** Milliseconds a pipeline run may take at the 95th percentile, design.md section 9.1 (killer row). */
  var BUDGET_MS = { veryEasy: 300, easy: 700, normal: 700, hard: 1800, expert: 10000, master: 10000,
    nightmare: 10000, hell1: 10000, hell2: 10000 };

  function now() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  function popcount(mask) { return SG.bits.popcount(mask); }

  function zeros(n) { return new Int32Array(n); }

  function generate(level, seed, trace, emit) {
    return SG.pipeline.run({ variantId: 'killer', difficulty: level, seed: seed, trace: trace || 'off' },
      emit || null, null);
  }

  function clueCount(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] !== 0) n++;
    return n;
  }

  function isConnected(cells) {
    var seen = [cells[0]];
    for (var i = 0; i < seen.length; i++) {
      var c = seen[i];
      [c - 9, c + 9, c % 9 > 0 ? c - 1 : -1, c % 9 < 8 ? c + 1 : -1].forEach(function (nb) {
        if (nb >= 0 && nb < 81 && cells.indexOf(nb) !== -1 && seen.indexOf(nb) === -1) seen.push(nb);
      });
    }
    return seen.length === cells.length;
  }

  // The corpus: 20 puzzles per level through the real pipeline (generated once, on first use)

  var corpusCache = null;

  /** @returns {Array<{level, seed, result, ms}>} */
  function corpus() {
    if (corpusCache === null) {
      corpusCache = [];
      LEVELS.forEach(function (level) {
        for (var seed = 1; seed <= countOf(level); seed++) {
          var t0 = now();
          var result = generate(level, seed);
          corpusCache.push({ level: level, seed: seed, result: result, ms: now() - t0 });
        }
      });
    }
    return corpusCache;
  }

  function corpusOf(level) {
    return corpus().filter(function (p) { return p.level === level; });
  }

  describe('killer: combination table (P4)', function () {
    /** Every digit set of size `size` and sum `sum`, by brute force over all 512 subsets of 1..9. */
    function bruteForce(size, sum) {
      var found = [];
      for (var mask = 0; mask < 512; mask++) {
        var total = 0;
        for (var d = 1; d <= 9; d++) if ((mask & (1 << (d - 1))) !== 0) total += d;
        if (popcount(mask) === size && total === sum) found.push(mask);
      }
      return found;
    }

    it('matches a brute-force enumeration for every size up to 4 and every sum', function () {
      for (var size = 0; size <= 4; size++) {
        for (var sum = 0; sum <= 45; sum++) {
          expect(Array.from(T.masks(size, sum))).toEqual(bruteForce(size, sum));
        }
      }
    });

    it('in fact matches it for every size up to 9, through both entry points', function () {
      for (var size = 0; size <= 9; size++) {
        for (var sum = 0; sum <= 45; sum++) {
          var expected = bruteForce(size, sum);
          expect(Array.from(T.masks(size, sum))).toEqual(expected);
          expect(Array.from(T.table[size][sum])).toEqual(expected);
        }
      }
    });

    it('lists known sets: 3 = {1,2}, 17 = {8,9}, 3 cells summing to 7 = {1,2,4}, 45 = all nine', function () {
      expect(Array.from(T.masks(2, 3))).toEqual([3]);
      expect(Array.from(T.masks(2, 17))).toEqual([256 + 128]);
      expect(Array.from(T.masks(3, 7))).toEqual([1 + 2 + 8]);
      expect(Array.from(T.masks(9, 45))).toEqual([511]);
      expect(Array.from(T.masks(1, 5))).toEqual([16]);
      expect(Array.from(T.masks(4, 10))).toEqual([15]);
    });

    it('gives an empty list for an impossible size / sum, instead of throwing', function () {
      expect(T.masks(2, 2)).toHaveLength(0);
      expect(T.masks(2, 18)).toHaveLength(0);
      expect(T.masks(10, 45)).toHaveLength(0);
      expect(T.masks(-1, 5)).toHaveLength(0);
      expect(T.masks(3, 99)).toHaveLength(0);
    });

    it('is small: 512 masks in all, far under the 50 KB budget, and built once', function () {
      var total = 0;
      var maxSum = 0;
      T.table.forEach(function (row) {
        row.forEach(function (list) { total += list.length; });
        maxSum = Math.max(maxSum, row.length);
      });
      expect(total).toBe(512);
      expect(maxSum).toBe(46);
      expect(total * 4 + 10 * 46 * 16).toBeLessThan(50 * 1024);
      expect(T.table[3][12]).toBe(T.table[3][12]);
    });

    it('keeps each list ascending, with the right size and sum in every mask', function () {
      T.table.forEach(function (row, size) {
        row.forEach(function (list, sum) {
          for (var i = 0; i < list.length; i++) {
            expect(popcount(list[i])).toBe(size);
            if (i > 0) expect(list[i]).toBeGreaterThan(list[i - 1]);
            var total = 0;
            for (var d = 1; d <= 9; d++) if ((list[i] & (1 << (d - 1))) !== 0) total += d;
            expect(total).toBe(sum);
          }
        });
      });
    });

    it('union() and common() summarise a list: the digits some / every combination uses', function () {
      expect(T.union(2, 3)).toBe(3);
      expect(T.common(2, 3)).toBe(3);
      expect(T.union(2, 10)).toBe(1 + 2 + 4 + 8 + 32 + 64 + 128 + 256);
      expect(T.common(2, 10)).toBe(0);
      expect(T.common(3, 7)).toBe(11);
      expect(T.union(2, 2)).toBe(0);
      expect(T.common(2, 2)).toBe(0);
    });

    it('can be restricted to a smaller board: the digits above D disappear', function () {
      for (var size = 0; size <= 4; size++) {
        for (var sum = 0; sum <= 10; sum++) {
          var all = Array.from(T.masks(size, sum));
          expect(Array.from(T.masks(size, sum, 4))).toEqual(all.filter(function (m) { return m < 16; }));
        }
      }
      expect(Array.from(T.masks(2, 7, 4))).toEqual([4 + 8]);
      expect(T.masks(2, 17, 4)).toHaveLength(0);
    });

    it('knows the smallest and largest sum of n distinct digits', function () {
      expect(T.minSum(1)).toBe(1);
      expect(T.minSum(3)).toBe(6);
      expect(T.maxSum(2)).toBe(17);
      expect(T.maxSum(4, 9)).toBe(30);
      expect(T.maxSum(2, 4)).toBe(7);
      for (var size = 1; size <= 9; size++) {
        expect(T.masks(size, T.minSum(size))).toHaveLength(1);
        expect(T.masks(size, T.maxSum(size))).toHaveLength(1);
        expect(T.masks(size, T.minSum(size) - 1)).toHaveLength(0);
        expect(T.masks(size, T.maxSum(size) + 1)).toHaveLength(0);
      }
    });

    bench('killer: comboTable lookup (4 cells, sum 20)', function () {
      return T.masks(4, 20).length;
    }, 20000);
  });

  describe('killer: cage propagation extension', function () {
    var base4 = SG.variants.get('classic4').build({}, null);

    /** All 288 grids of the 4x4 board. */
    function allGrids4() {
      var grids = [];
      var grid = new Array(16).fill(0);
      function ok(cell, v) {
        for (var i = 0; i < base4.peers[cell].length; i++) if (grid[base4.peers[cell][i]] === v) return false;
        return true;
      }
      (function fill(cell) {
        if (cell === 16) { grids.push(grid.slice()); return; }
        for (var v = 1; v <= 4; v++) {
          if (!ok(cell, v)) continue;
          grid[cell] = v;
          fill(cell + 1);
          grid[cell] = 0;
        }
      })(0);
      return grids;
    }

    function model4(cages, variantId) {
      var spec = {
        variantId: variantId,
        digits: 4,
        units: base4.units.map(function (u) { return Array.from(u); }),
        unitMeta: base4.unitMeta.slice(),
        cages: cages,
        layout: {
          rows: 4, cols: 4,
          cellRow: Array.from(base4.layout.cellRow),
          cellCol: Array.from(base4.layout.cellCol),
          cellRegion: Array.from(base4.layout.cellRegion)
        }
      };
      return SG.model.create(spec);
    }

    function satisfies(grid, cage) {
      var sum = 0;
      var seen = 0;
      for (var i = 0; i < cage.cells.length; i++) {
        var v = grid[cage.cells[i]];
        sum += v;
        if (cage.distinct !== false) {
          if ((seen & (1 << (v - 1))) !== 0) return false;
          seen |= 1 << (v - 1);
        }
      }
      return sum === cage.sum;
    }

    /** A random layout of groups of 1 - 4 arbitrary cells with the sums of a random grid. */
    function randomCages(rng, grids) {
      var grid = grids[rng.int(grids.length)];
      var cells = rng.shuffle(Array.from({ length: 16 }, function (_, i) { return i; }));
      var cages = [];
      while (cells.length > 0 && cages.length < 7) {
        var size = Math.min(cells.length, 1 + rng.int(4));
        var members = cells.splice(0, size);
        var sum = 0;
        members.forEach(function (c) { sum += grid[c]; });
        var distinct = rng.next() < 0.85;
        var digits = members.reduce(function (m, c) { return m | (1 << (grid[c] - 1)); }, 0);
        if (distinct && popcount(digits) !== size) {
          distinct = false;
        }
        cages.push({ cells: members, sum: sum, distinct: distinct });
      }
      return cages;
    }

    it('is registered on demand, once, and per variant: a second call changes nothing', function () {
      T.disablePropagation();
      expect(SG.constraints.listExtensions()).not.toContain('cage');
      expect(T.enablePropagation('killer')).toBe(true);
      expect(SG.constraints.listExtensions()).toContain('cage');
      expect(T.enablePropagation('killer')).toBe(false);
      expect(T.enablePropagation('killer4')).toBe(true);
      expect(SG.constraints.listExtensions().filter(function (id) { return id === 'cage'; })).toHaveLength(1);
      T.disablePropagation();
      expect(SG.constraints.listExtensions()).not.toContain('cage');
      // Building a Killer model switches it on again.
      var base = K.buildBoard({});
      K.modelWithCages(base, [[0, 1]], new Array(81).fill(1).map(function (_, i) { return (i % 9) + 1; }));
      expect(SG.constraints.listExtensions()).toContain('cage');
    });

    it('counts exactly the solutions that satisfy the cages: 4x4 boards against brute force', function () {
      T.enablePropagation('killer4');
      var grids = allGrids4();
      expect(grids).toHaveLength(288);
      var rng = SG.rng.create(5150);
      var checked = 0;
      var nonTrivial = 0;
      for (var round = 0; round < 60; round++) {
        var cages = randomCages(rng.fork('layout' + round), grids);
        var model = model4(cages, 'killer4');
        var expected = grids.filter(function (g) {
          return cages.every(function (c) { return satisfies(g, c); });
        }).length;
        var counted = SG.dfs.countSolutions(model, zeros(16), 1000);
        if (counted !== expected) {
          throw new Error('layout ' + round + ': dfs counts ' + counted + ', brute force ' + expected +
            ' for ' + JSON.stringify(cages));
        }
        checked++;
        if (expected > 1 && expected < 288) nonTrivial++;
      }
      expect(checked).toBe(60);
      expect(nonTrivial).toBeGreaterThan(5);
    });

    it('also solves with the clues of a known solution: the 4x4 puzzle keeps exactly its solution',
      function () {
        T.enablePropagation('killer4');
        var grids = allGrids4();
        var rng = SG.rng.create(77);
        for (var round = 0; round < 20; round++) {
          var cages = randomCages(rng.fork('c' + round), grids);
          var model = model4(cages, 'killer4');
          var solution = SG.dfs.solve(model, zeros(16));
          expect(solution).not.toBeNull();
          expect(SG.model.isSolution(model, solution)).toBe(true);
          var givens = zeros(16);
          for (var c = 0; c < 16; c++) if (rng.next() < 0.3) givens[c] = solution[c];
          var count = SG.dfs.countSolutions(model, givens, 1000);
          var expected = grids.filter(function (g) {
            return cages.every(function (cg) { return satisfies(g, cg); }) &&
              givens.every(function (v, i) { return v === 0 || g[i] === v; });
          }).length;
          expect(count).toBe(expected);
        }
      });

    it('acts only on the models of a variant that asked for it (a plain board with cages is left alone)',
      function () {
        T.enablePropagation('killer4');
        // The cage says both cells are 1, the row says they differ: it has no solution when it is enforced.
        var cages = [{ cells: [0, 1], sum: 2, distinct: false }];
        expect(SG.dfs.solve(model4(cages, 'killer4'), zeros(16))).toBeNull();
        expect(SG.dfs.solve(model4(cages, 'a-board-nobody-asked-for'), zeros(16))).not.toBeNull();
      });

    it('prunes the candidates of small cages straight away (bounds + combinations)', function () {
      T.enablePropagation('killer');
      function pruned(cells, sum) {
        var model = K.modelFromCages([{ cells: cells, sum: sum }]);
        var state = SG.model.initState(model);
        expect(SG.constraints.propagate(model, state)).toBe(true);
        return cells.map(function (c) { return state.candidates[c]; });
      }
      expect(pruned([0, 1], 3)).toEqual([3, 3]);
      expect(pruned([0, 1], 17)).toEqual([384, 384]);
      expect(pruned([0, 1, 2], 6)).toEqual([7, 7, 7]);
      expect(pruned([0, 1, 2], 24)).toEqual([448, 448, 448]);
      expect(pruned([0, 1, 2, 3], 10)).toEqual([15, 15, 15, 15]);
      // 2 cells, sum 10: any digit but 5 can sit in either cell.
      expect(pruned([0, 1], 10)).toEqual([511 - 16, 511 - 16]);
      // The cage rules never reach into cells outside the cages.
      var model = K.modelFromCages([{ cells: [0, 1], sum: 3 }]);
      var state = SG.model.initState(model);
      SG.constraints.propagate(model, state);
      expect(state.candidates[2]).toBe(511);
    });

    /** A Killer model whose cages are NOT units: the extension alone has to keep the cage digits apart. */
    function bareModel(cages) {
      var board = K.buildBoard({});
      return SG.model.create({
        variantId: 'killer',
        digits: 9,
        units: board.units.map(function (u) { return Array.from(u); }),
        unitMeta: board.unitMeta.slice(),
        cages: cages,
        layout: {
          rows: 9, cols: 9, cellRow: board.layout.cellRow, cellCol: board.layout.cellCol,
          cellRegion: board.layout.cellRegion
        }
      });
    }

    it('makes a fixed digit leave the other cells of its cage, even when they are not peers', function () {
      T.enablePropagation('killer');
      // Cells 0 and 40 share no row, column or box; the cage is the only thing that makes them differ.
      var model = bareModel([{ cells: [0, 40], sum: 10 }]);
      expect(Array.from(model.peers[0])).not.toContain(40);
      var state = SG.model.initState(model);
      expect(SG.constraints.assign(model, state, 0, 3)).toBe(true);
      expect(SG.constraints.propagate(model, state)).toBe(true);
      expect(state.value[40]).toBe(7);
      // 3 + 3 would reach the sum 6 of another cage, but a cage never repeats a digit.
      var twin = bareModel([{ cells: [0, 40], sum: 6 }]);
      var open = SG.model.initState(twin);
      expect(SG.constraints.propagate(twin, open)).toBe(true);
      expect(open.candidates[0] & 4).toBe(0);
      var fresh = SG.model.initState(twin);
      expect(SG.constraints.assign(twin, fresh, 0, 3)).toBe(true);
      expect(SG.constraints.propagate(twin, fresh)).toBe(false);
    });

    it('detects a contradiction: a sum nobody can reach, and two equal digits in one cage', function () {
      T.enablePropagation('killer');
      var model = bareModel([{ cells: [0, 40], sum: 10 }]);
      var state = SG.model.initState(model);
      state.candidates[0] = 1;
      state.candidates[40] = 1;
      expect(SG.constraints.propagate(model, state)).toBe(false);
      state = SG.model.initState(model);
      state.candidates[0] = 16;
      state.candidates[40] = 16;
      expect(SG.constraints.propagate(model, state)).toBe(false);
    });

    it('is sound on 9x9 puzzles: propagation keeps the true solution in every cell and never fails',
      function () {
        T.enablePropagation('killer');
        corpus().filter(function (p) { return p.seed <= 6; }).forEach(function (p) {
          var model = p.result.model;
          var state = SG.model.initState(model);
          expect(SG.constraints.propagate(model, state)).toBe(true);
          for (var c = 0; c < 81; c++) {
            if ((state.candidates[c] & (1 << (p.result.solution[c] - 1))) === 0) {
              throw new Error(p.level + ' seed ' + p.seed + ': cell ' + c + ' lost its solution digit');
            }
          }
          // With the clues of the puzzle the whole grid follows: the solution is unique.
          var withClues = SG.model.initState(model);
          for (c = 0; c < 81; c++) {
            if (p.result.givens[c] !== 0) SG.constraints.assign(model, withClues, c, p.result.givens[c]);
          }
          expect(SG.constraints.propagate(model, withClues)).toBe(true);
        });
      });

    it('genuinely prunes: a tenth of the candidates are gone before a single digit is known', function () {
      T.enablePropagation('killer');
      var removed = 0;
      var total = 0;
      // Measured: 12.7 % pruned over these 20 hard layouts (easy layouts, with their small cages, about
      // 18 %).
      corpus().filter(function (p) { return p.level === 'hard'; }).forEach(function (p) {
        var model = p.result.model;
        var plainSpec = { variantId: 'plain-test', digits: 9, units: model.units.slice(0, 27), layout: {
          rows: 9, cols: 9, cellRow: model.layout.cellRow, cellCol: model.layout.cellCol } };
        var plain = SG.model.create(plainSpec);
        var withCages = SG.model.initState(model);
        var without = SG.model.initState(plain);
        SG.constraints.propagate(model, withCages);
        SG.constraints.propagate(plain, without);
        for (var c = 0; c < 81; c++) {
          removed += popcount(without.candidates[c]) - popcount(withCages.candidates[c]);
          total += popcount(without.candidates[c]);
        }
      });
      expect(removed / total).toBeGreaterThan(0.1);
    });

    it('leaves a model without cages alone: no extension work for the classic variants', function () {
      T.enablePropagation('killer');
      var model = H.model('classic9');
      var state = SG.model.initState(model);
      var solved = SG.dfs.solve(model, zeros(81));
      expect(solved).not.toBeNull();
      expect(SG.constraints.propagate(model, state)).toBe(true);
    });
  });

  describe('killer: cage techniques (K1 cageCombo, K2 ruleOf45, K3 cageSplit)', function () {
    var IDS = ['cageCombo', 'ruleOf45', 'cageSplit'];
    var board = K.buildBoard({});

    /** A valid grid in which the listed cells (row-major index -> digit) hold the given digits. */
    function gridWith(fixed) {
      var givens = zeros(81);
      Object.keys(fixed).forEach(function (cell) { givens[cell] = fixed[cell]; });
      var grid = SG.dfs.solve(board, givens);
      expect(grid).not.toBeNull();
      return grid;
    }

    /** A Killer model for some cages (cell lists) with the sums of `grid`; not every cell needs a cage. */
    function modelOf(cages, grid) { return K.modelWithCages(board, cages, grid); }

    /** A state with no digit known: peers only, exactly where the logical solver starts from. */
    function emptyState(model) { return H.makeState(model, zeros(81), { propagate: false }); }

    function cell(ref) { return H.cell(board, ref); }

    function allElims(cells, digits) {
      var out = [];
      cells.forEach(function (c) { digits.forEach(function (d) { out.push([c, d]); }); });
      return out;
    }

    function digitsExcept(keep) {
      var out = [];
      for (var d = 1; d <= 9; d++) if (keep.indexOf(d) === -1) out.push(d);
      return out;
    }

    it('registers cageCombo, ruleOf45 and cageSplit in the cage group with the costs and orders of the ' +
      'ladder',
      function () {
        var rows = { cageCombo: [10, 55], ruleOf45: [28, 95], cageSplit: [40, 135] };
        IDS.forEach(function (id) {
          var tech = SG.techniques.get(id);
          expect(tech.group).toBe('cage');
          expect(tech.baseCost).toBe(rows[id][0]);
          expect(tech.order).toBe(rows[id][1]);
          expect(Array.from(tech.variantScope)).toEqual(['killer']);
          expect(tech.assumesUniqueness).toBe(false);
          expect(tech.i18nKey).toBe('technique.' + id);
        });
      });

    it('puts them into the ladder between the classic techniques of similar cost', function () {
      var ids = SG.techniques.list().map(function (t) { return t.id; });
      expect(ids.indexOf('cageCombo')).toBeGreaterThan(ids.indexOf('boxLine'));
      expect(ids.indexOf('cageCombo')).toBeLessThan(ids.indexOf('nakedPair'));
      expect(ids.indexOf('ruleOf45')).toBeGreaterThan(ids.indexOf('hiddenPair'));
      expect(ids.indexOf('ruleOf45')).toBeLessThan(ids.indexOf('hiddenQuad') + 2);
      expect(ids.indexOf('cageSplit')).toBeGreaterThan(ids.indexOf('xWing'));
      expect(ids.indexOf('cageCombo')).toBeLessThan(ids.indexOf('ruleOf45'));
      expect(ids.indexOf('ruleOf45')).toBeLessThan(ids.indexOf('cageSplit'));
    });

    it('never runs for another variant: a classic9 solve uses none of them', function () {
      var puzzle = SG.fixtures.classic.unique[0];
      var classic = H.model('classic9');
      var report = SG.logicalSolver.solve(classic, H.parsePuzzle(classic, puzzle.puzzle), {});
      IDS.forEach(function (id) { expect(report.techniqueCounts[id]).toBeUndefined(); });
      var spec = SG.difficulty.spec('master', H.model('classic9'));
      IDS.forEach(function (id) { expect(spec.allowedTechniques).not.toContain(id); });
      // Rating v2: a technique is allowed from the band whose maximum exceeds 1.25 x its weight.
      expect(SG.difficulty.spec('veryEasy', board).allowedTechniques).not.toContain('cageCombo');
      expect(SG.difficulty.spec('easy', board).allowedTechniques).toContain('cageCombo');
      expect(SG.difficulty.spec('normal', board).allowedTechniques).toContain('ruleOf45');
      expect(SG.difficulty.spec('hard', board).allowedTechniques).toContain('cageSplit');
    });

    it('find nothing on a Killer board without cages, and on a solved board', function () {
      IDS.forEach(function (id) {
        H.expectNoFinding(SG.test, id, emptyState(board), { model: board });
      });
      var p = corpusOf('normal')[0].result;
      var solved = H.makeState(p.model, p.solution, { propagate: false });
      IDS.forEach(function (id) { H.expectNoFinding(SG.test, id, solved, { model: p.model }); });
    });

    // cageCombo fixtures

    it('cageCombo: a cage with sum 3 keeps {1,2}, and 1 and 2 leave the rest of its row and box',
      function () {
        var grid = gridWith({ 0: 1, 1: 2 });
        var model = modelOf([[0, 1]], grid);
        var finding = H.expectFinding(SG.test, 'cageCombo', emptyState(model), {
          placements: [],
          eliminations: allElims([0, 1], digitsExcept([1, 2])).concat(
            allElims([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20], [1, 2]))
        });
        expect(finding.cells).toEqual([0, 1]);
        expect(finding.i18nKey).toBe('technique.cageCombo.step');
        expect(finding.i18nArgs.sum).toBe(3);
        expect(finding.i18nArgs.size).toBe(2);
        expect(finding.i18nArgs.digits).toEqual([1, 2]);
        expect(finding.i18nArgs.forced).toEqual([1, 2]);
        expect(finding.i18nArgs.cells).toEqual(['R1C1', 'R1C2']);
      });

    it('cageCombo: only the cells of the cage lose digits when its places do not share a unit', function () {
      var grid = gridWith({ 0: 8, 10: 9 });
      var model = modelOf([[0, 10]], grid);
      // R1C1 and R2C2 share box 1, so the forced 8 and 9 do leave the rest of that box (not its row or
      // column).
      var finding = H.expectFinding(SG.test, 'cageCombo', emptyState(model), {
        eliminations: allElims([0, 10], digitsExcept([8, 9])).concat(
          allElims([1, 2, 9, 11, 18, 19, 20], [8, 9]))
      });
      expect(finding.i18nArgs.digits).toEqual([8, 9]);
      var far = gridWith({ 0: 8, 40: 9 });
      var spread = modelOf([[0, 40]], far);
      H.expectFinding(SG.test, 'cageCombo', emptyState(spread), {
        eliminations: allElims([0, 40], digitsExcept([8, 9]))
      });
    });

    it('cageCombo: a digit that every combination needs and one cell can take is placed', function () {
      // 3 cells, sum 7 can only be {1,2,4}. R1C2 and R1C3 cannot be 1, so the 1 has to go to R1C1.
      var grid = gridWith({ 0: 1, 1: 2, 2: 4 });
      var model = modelOf([[0, 1, 2]], grid);
      var candidates = new Array(81).fill(null);
      candidates[1] = '24';
      candidates[2] = '24';
      var state = H.makeState(model, zeros(81), { propagate: false, candidates: candidates });
      var finding = H.expectFinding(SG.test, 'cageCombo', state, {
        placements: [[0, 1]],
        partial: true
      }, { solution: grid });
      expect(finding.placements).toEqual([[0, 1]]);
    });

    it('cageCombo: nothing to do when the combinations leave every digit possible', function () {
      var grid = gridWith({ 0: 1, 1: 5, 2: 9 });
      var model = modelOf([[0, 1, 2]], grid);
      H.expectNoFinding(SG.test, 'cageCombo', emptyState(model), { model: model });
    });

    it('cageCombo: a digit already placed in the cage leaves its other cells, and the rest is split',
      function () {
        // R1C1 = 9 is known and the cage {R1C1,R1C2,R1C3} adds up to 12: the other two cells make 3 = {1,2},
        // which leaves their row and box as well.
        var grid = gridWith({ 0: 9, 1: 1, 2: 2 });
        var model = modelOf([[0, 1, 2]], grid);
        var givens = zeros(81);
        givens[0] = 9;
        var state = H.makeState(model, givens, { propagate: false });
        var finding = H.expectFinding(SG.test, 'cageCombo', state, {
          placements: [],
          eliminations: allElims([1, 2], [3, 4, 5, 6, 7, 8]).concat(
            allElims([3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20], [1, 2]))
        }, { solution: grid });
        expect(finding.i18nArgs.digits).toEqual([1, 2]);
      });

    // brute-force cross-check of cageCombo

    /**
     * Every assignment of the cage cells that uses the candidates, sums to the cage sum and has distinct
     * digits.
     * @returns {number[][]}
     */
    function validAssignments(model, state, cageIndex) {
      var cage = model.cages[cageIndex];
      var cells = Array.from(cage.cells);
      var out = [];
      var chosen = [];
      (function walk(i, sum, seen) {
        if (i === cells.length) {
          if (sum === cage.sum) out.push(chosen.slice());
          return;
        }
        for (var d = 1; d <= 9; d++) {
          if ((state.candidates[cells[i]] & (1 << (d - 1))) === 0 || (seen & (1 << (d - 1))) !== 0) continue;
          chosen[i] = d;
          walk(i + 1, sum + d, seen | (1 << (d - 1)));
        }
      })(0, 0, 0);
      return out;
    }

    it('cageCombo: its eliminations and placements are sound against brute force on 300 random cage states',
      function () {
        var rng = SG.rng.create(424242);
        var checked = 0;
        var fired = 0;
        for (var round = 0; round < 300; round++) {
          var r = rng.fork('case' + round);
          var size = 2 + r.int(4);
          var cells = [];
          while (cells.length < size) {
            var c = r.int(81);
            if (cells.indexOf(c) === -1) cells.push(c);
          }
          cells.sort(function (a, b) { return a - b; });
          var digits = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, size);
          var sum = digits.reduce(function (a, b) { return a + b; }, 0);
          var model = K.modelFromCages([{ cells: cells, sum: sum }]);
          var state = SG.model.initState(model);
          // Random extra candidates around a true assignment keep the case consistent.
          cells.forEach(function (cellIndex, i) {
            var mask = 1 << (digits[i] - 1);
            for (var d = 1; d <= 9; d++) if (r.next() < 0.45) mask |= 1 << (d - 1);
            state.candidates[cellIndex] = mask;
          });
          var ctx = SG.techniques.createContext(model, {});
          var finding = SG.techniques.get('cageCombo').find(model, state, ctx);
          checked++;
          if (finding === null) continue;
          fired++;
          var valid = validAssignments(model, state, 0);
          expect(valid.length).toBeGreaterThan(0);
          var inCage = {};
          cells.forEach(function (cellIndex, i) { inCage[cellIndex] = i; });
          finding.eliminations.forEach(function (e) {
            if (inCage[e[0]] !== undefined) {
              if (valid.some(function (a) { return a[inCage[e[0]]] === e[1]; })) {
                throw new Error('round ' + round + ': ' + e + ' is possible inside the cage');
              }
            } else if (!valid.every(function (a) {
              return cells.some(function (cc, i) {
                return a[i] === e[1] && model.peers[e[0]].indexOf(cc) !== -1;
              });
            })) {
              throw new Error('round ' + round + ': ' + e + ' outside the cage is not forced out');
            }
          });
          finding.placements.forEach(function (p) {
            if (!valid.every(function (a) { return a[inCage[p[0]]] === p[1]; })) {
              throw new Error('round ' + round + ': placement ' + p + ' is not forced');
            }
          });
        }
        expect(checked).toBe(300);
        expect(fired).toBeGreaterThan(120);
      });

    // ruleOf45 fixtures

    it('ruleOf45: a row whose cages leave one cell outside gives that cell its value', function () {
      // Row 1 = {R1C1,R1C2} + {R1C3,R1C4,R1C5} + {R1C6,R1C7,R1C8} + {R1C9,R2C9}: the last cage sticks out.
      var grid = gridWith({});
      var cages = [[0, 1], [2, 3, 4], [5, 6, 7], [8, 17]];
      var model = modelOf(cages, grid);
      var finding = H.expectFinding(SG.test, 'ruleOf45', emptyState(model), {
        placements: [[8, grid[8]]],
        eliminations: []
      }, { solution: grid });
      expect(finding.i18nKey).toBe('technique.ruleOf45.place');
      expect(finding.i18nArgs.digit).toBe(grid[8]);
      expect(finding.i18nArgs.cell).toBe('R1C9');
      expect(finding.i18nArgs.units).toEqual(['R1']);
    });

    it('ruleOf45: once R1C9 is known, the same row gives R2C9 (the outie of the row) from its cage sum',
      function () {
        var grid = gridWith({});
        var cages = [[0, 1], [2, 3, 4], [5, 6, 7], [8, 17]];
        var model = modelOf(cages, grid);
        var givens = zeros(81);
        givens[8] = grid[8];
        var state = H.makeState(model, givens, { propagate: false });
        var finding = H.expectFinding(SG.test, 'ruleOf45', state, {
          placements: [[17, grid[17]]],
          eliminations: []
        }, { solution: grid });
        expect(finding.i18nArgs.kind).toBe('outie');
        expect(finding.i18nArgs.cell).toBe('R2C9');
      });

    it('ruleOf45: three innies from three different cages are filtered against their sum', function () {
      // Row 1: two cages inside, and R1C7, R1C8, R1C9 each belong to a cage that reaches into row 2.
      var grid = gridWith({ 6: 1, 7: 2, 8: 3 });
      var cages = [[0, 1, 2], [3, 4, 5], [6, 15], [7, 16], [8, 17]];
      var model = modelOf(cages, grid);
      var finding = H.expectFinding(SG.test, 'ruleOf45', emptyState(model), {
        eliminations: allElims([6, 7, 8], digitsExcept([1, 2, 3]))
      }, { solution: grid });
      expect(finding.i18nKey).toBe('technique.ruleOf45.step');
      expect(finding.i18nArgs.sum).toBe(6);
      expect(finding.i18nArgs.kind).toBe('innie');
      expect(finding.i18nArgs.units).toEqual(['R1']);
    });

    it('ruleOf45: finds nothing when the cages inside leave a group that is too wide to say anything',
      function () {
        var grid = gridWith({});
        var model = modelOf([[0, 1], [2, 11]], grid);
        H.expectNoFinding(SG.test, 'ruleOf45', emptyState(model), { model: model });
      });

    // cageSplit fixtures

    it('cageSplit: a cage that sticks out of a row splits into an inside and an outside part with their ' +
      'own sums',
      function () {
        // Row 1 holds 1+2 in R1C8,R1C9 and the cage {R1C8,R1C9,R2C8,R2C9} (sum 20) sticks out of it.
        var grid = gridWith({ 7: 1, 8: 2, 16: 8, 17: 9 });
        var cages = [[0, 1], [2, 3, 4], [5, 6], [7, 8, 16, 17]];
        var model = modelOf(cages, grid);
        expect(model.cages[3].sum).toBe(20);
        var finding = H.expectFinding(SG.test, 'cageSplit', emptyState(model), {
          eliminations: allElims([7, 8], digitsExcept([1, 2]))
            .concat(allElims([16, 17], digitsExcept([8, 9])))
        }, { solution: grid });
        expect(finding.i18nKey).toBe('technique.cageSplit.step');
        expect(finding.cells).toEqual([7, 8, 16, 17]);
        expect(finding.i18nArgs.sum).toBe(20);
        expect(finding.i18nArgs.partSum).toBe(3);
        expect(finding.i18nArgs.restSum).toBe(17);
        expect(finding.i18nArgs.partDigits).toEqual([1, 2]);
        expect(finding.i18nArgs.restDigits).toEqual([8, 9]);
        expect(finding.i18nArgs.units).toEqual(['R1']);
        // ruleOf45 leaves this to cageSplit: its group lies inside one cage.
        H.expectNoFinding(SG.test, 'ruleOf45', emptyState(model), { model: model });
      });

    it('cageSplit: also splits off a single outside cell, and leaves cages that stick out of nothing alone',
      function () {
        var grid = gridWith({});
        var model = modelOf([[0, 1, 2], [3, 4, 5], [6, 7, 8, 17]], grid);
        var finding = H.expectFinding(SG.test, 'cageSplit', emptyState(model), {
          partial: true, eliminations: []
        }, { solution: grid });
        expect(finding.i18nArgs.rest).toEqual(['R2C9']);
        expect(finding.i18nArgs.restDigits).toEqual([grid[17]]);
        var inside = modelOf([[0, 1, 2], [3, 4, 5], [6, 7, 8]], grid);
        H.expectNoFinding(SG.test, 'cageSplit', emptyState(inside), { model: inside });
        var lone = modelOf([[0, 10]], grid);
        H.expectNoFinding(SG.test, 'cageSplit', emptyState(lone), { model: lone });
      });

    // determinism

    it('every technique answers the same twice and never touches the state', function () {
      var p = corpusOf('master')[0].result;
      var state = H.makeState(p.model, p.givens, { propagate: false });
      IDS.forEach(function (id) {
        var before = SG.model.cloneState(state);
        var ctx = SG.techniques.createContext(p.model, { assumeUniqueness: true });
        var a = SG.techniques.get(id).find(p.model, state, ctx);
        var b = SG.techniques.get(id).find(p.model, state, ctx);
        expect(b).toEqual(a);
        expect(state.candidates).toEqual(before.candidates);
        expect(state.value).toEqual(before.value);
      });
    });
  });

  describe('killer: soundness of the cage techniques (invariant I7)', function () {
    var BASIC = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine'];
    var IDS = ['cageCombo', 'ruleOf45', 'cageSplit'];
    var MIN_FIRINGS = { cageCombo: 100, ruleOf45: 100, cageSplit: 30 };
    var sweepCache = null;

    /**
     * Five positions per puzzle, all derived from the clues the way a person gets there: the clues only,
     * after the singles, after the singles with pointing and box/line, and after those plus cageCombo; and
     * one position with a random share of the wrong candidates removed.
     */
    function positionsOf(p, rng) {
      var m = p.model;
      var initial = SG.model.initState(m);
      for (var c = 0; c < 81; c++) if (p.givens[c] !== 0) SG.constraints.assign(m, initial, c, p.givens[c]);
      function after(ids) {
        return SG.logicalSolver.solve(m, p.givens, { allowedTechniques: ids, collectSteps: false }).state;
      }
      var locked = BASIC.concat(['pointing', 'boxLine']);
      var singles = after(BASIC);
      var pruned = SG.model.cloneState(singles);
      for (c = 0; c < 81; c++) {
        if (pruned.value[c] !== 0) continue;
        for (var v = 1; v <= 9; v++) {
          if (v !== p.solution[c] && (pruned.candidates[c] & (1 << (v - 1))) !== 0 && rng.next() < 0.1) {
            SG.constraints.eliminate(m, pruned, c, v);
          }
        }
      }
      return [
        { kind: 'initial', state: initial },
        { kind: 'singles', state: singles },
        { kind: 'locked', state: after(locked) },
        { kind: 'combo', state: after(locked.concat(['cageCombo'])) },
        { kind: 'pruned', state: pruned }
      ].map(function (item) {
        return { kind: item.kind, state: item.state, solution: p.solution, givens: p.givens };
      });
    }

    function sweep() {
      if (sweepCache === null) {
        sweepCache = { firings: {}, keys: {}, states: 0, puzzles: 0 };
        IDS.forEach(function (id) { sweepCache.firings[id] = 0; });
        var rng = SG.rng.create(31337);
        corpus().filter(function (p) {
          return (p.level === 'hard' || p.level === 'master') && p.seed <= 12;
        }).forEach(function (p, index) {
          var states = positionsOf(p.result, rng.fork('p' + index));
          sweepCache.puzzles++;
          IDS.forEach(function (id) {
            var stats = H.assertSound(SG.test, id, { model: p.result.model, states: states });
            sweepCache.firings[id] += stats.firings;
            sweepCache.states += stats.states;
          });
        });
      }
      return sweepCache;
    }

    IDS.forEach(function (id) {
      it(id + ' never removes or places a value of the true solution, and every Finding obeys the contract',
        function () {
          var result = sweep();
          // 12 hard puzzles and the master ones up to seed 12 (the corpus holds fewer of the top levels).
          expect(result.puzzles).toBe(12 + Math.min(12, countOf('master')));
          expect(result.states).toBe(result.puzzles * 5 * 3);
          expect(result.firings[id]).toBeGreaterThan(MIN_FIRINGS[id]);
        });
    });

    it('stays sound at every level: the whole ladder solves each puzzle of the corpus with correct steps',
      function () {
        corpus().forEach(function (p) {
          var report = SG.logicalSolver.solve(p.result.model, p.result.givens, { collectSteps: true });
          if (report.status !== 'solved') {
            throw new Error(p.level + ' seed ' + p.seed + ' ended ' + report.status);
          }
          report.steps.forEach(function (step, i) {
            step.placements.forEach(function (pair) {
              if (p.result.solution[pair[0]] !== pair[1]) {
                throw new Error(p.level + ' seed ' + p.seed + ' step ' + i + ' (' + step.technique + ') ' +
                  'places ' + pair);
              }
            });
            step.eliminations.forEach(function (pair) {
              if (p.result.solution[pair[0]] === pair[1]) {
                throw new Error(p.level + ' seed ' + p.seed + ' step ' + i + ' (' + step.technique + ') ' +
                  'removes ' + pair);
              }
            });
          });
        });
      });

    it('uses the cage techniques for real: cageCombo in every puzzle from normal up, ruleOf45 in many',
      function () {
        var used = { cageCombo: 0, ruleOf45: 0, cageSplit: 0 };
        var missing = 0;
        corpus().forEach(function (p) {
          var counts = p.result.rating.techniqueCounts;
          // A very easy puzzle keeps about 40 clues and is finished by the singles alone.
          if (!(counts.cageCombo > 0) && p.level !== 'veryEasy' && p.level !== 'easy') missing++;
          IDS.forEach(function (id) { if (counts[id] > 0) used[id]++; });
        });
        expect(missing).toBe(0);
        expect(used.cageCombo).toBeGreaterThan(60);
        expect(used.ruleOf45).toBeGreaterThan(10);
      });

    it('rates with a hardest technique that belongs to the groups of the level (invariant I5 for cage ' +
      'groups)',
      function () {
        corpus().forEach(function (p) {
          var rating = p.result.rating;
          var spec = SG.difficulty.spec(p.level, p.result.model);
          if (rating.level !== p.level) return;
          expect(rating.score).toBeGreaterThanOrEqual(spec.min);
          expect(rating.score).toBeLessThan(spec.max);
          var tech = SG.techniques.get(rating.hardestTechnique);
          expect(spec.allowedGroups).toContain(tech.group);
        });
      });
  });

  describe('killer: the variant and its board', function () {
    it('is registered with the contract of design.md 5.3 and 13.8', function () {
      expect(DEF.id).toBe('killer');
      expect(DEF.i18nKey).toBe('variant.killer');
      expect(DEF.digits).toBe(9);
      expect(DEF.group).toBe('killer');
      expect(Array.from(DEF.difficultySupport)).toEqual(['veryEasy', 'easy', 'normal', 'hard', 'expert',
        'master', 'nightmare', 'hell1', 'hell2']);
      expect(DEF.defaultSymbolMode).toBe('digits');
      expect(DEF.symbolModes).toContain(DEF.defaultSymbolMode);
      expect(typeof DEF.build).toBe('function');
      expect(typeof DEF.postGenerate).toBe('function');
      expect(typeof DEF.fastSeed).toBe('function');
      expect(DEF.digStrategy).toBe('killer');
      expect(typeof SG.digger.getStrategy('killer')).toBe('function');
    });

    it('describes its option as a slider with a default that means "by difficulty"', function () {
      expect(DEF.options).toHaveLength(1);
      var o = DEF.options[0];
      expect(o.id).toBe('cageSize');
      expect(o.type).toBe('slider');
      expect(o.default).toBe(0);
      expect(o.min).toBeLessThan(0);
      expect(o.max).toBeGreaterThan(0);
      ['i18nKey', 'hintKey', 'minLabelKey', 'maxLabelKey', 'defaultLabelKey'].forEach(function (f) {
        expect(typeof o[f]).toBe('string');
      });
    });

    it('CV1: builds the plain 9x9 board (no cages yet) and it validates; it also builds without an rng',
      function () {
        var model = DEF.build({}, null);
        var verdict = SG.model.validate(model);
        expect(verdict.errors).toEqual([]);
        expect(verdict.ok).toBe(true);
        expect(model.variantId).toBe('killer');
        expect(model.cellCount).toBe(81);
        expect(model.units).toHaveLength(27);
        expect(model.cages).toHaveLength(0);
        expect(model.layout.subGrids).toHaveLength(1);
      });

    it('CV2: generates a valid full grid for 50 different seeds (with its fastSeed)', function () {
      var model = DEF.build({}, null);
      var seen = {};
      for (var seed = 1; seed <= 50; seed++) {
        var grid = SG.fullGrid.generate(model, SG.rng.create(seed), null);
        expect(SG.model.isSolution(model, grid)).toBe(true);
        seen[Array.from(grid).join('')] = true;
      }
      expect(Object.keys(seen).length).toBe(50);
    });

    it('its fastSeed gives a valid partial fill and the grid still completes', function () {
      var model = DEF.build({}, null);
      var state = SG.model.initState(model);
      expect(DEF.fastSeed(model, state, SG.rng.create(4))).toBe(true);
      expect(state.unsolvedCount).toBe(81 - 27);
      expect(SG.constraints.propagate(model, state)).toBe(true);
    });

    it('refuses a level id it does not know, with the usual error', function () {
      var error = null;
      try { generate('hell3', 1); } catch (err) { error = err; }
      expect(error).not.toBeNull();
      expect(error.code).toBe('difficulty.unknownLevel');
    });
  });

  describe('killer: generated puzzles (20 per level, 8 from expert on), CV3 - CV6 and invariants I1 - I7',
    function () {
      it('CV3: every supported level yields its puzzles of that variant', function () {
        var expected = 0;
        LEVELS.forEach(function (level) { expected += countOf(level); });
        expect(corpus()).toHaveLength(expected);
        LEVELS.forEach(function (level) {
          expect(corpusOf(level)).toHaveLength(countOf(level));
          corpusOf(level).forEach(function (p) {
            expect(p.result.model.variantId).toBe('killer');
            expect(p.result.config.difficulty).toBe(level);
            expect(p.result.givens).toHaveLength(81);
          });
        });
      });

      it('CV1: the model of every puzzle validates (units, peers, layout, cages, trial solve)', function () {
        corpus().forEach(function (p) {
          var verdict = SG.model.validate(p.result.model);
          if (!verdict.ok) throw new Error(p.level + ' seed ' + p.seed + ': ' + verdict.errors.join('; '));
        });
      });

      it('I1: every puzzle has exactly one solution (counted by the cage-aware DFS)', function () {
        corpus().forEach(function (p) {
          expect(SG.dfs.countSolutions(p.result.model, p.result.givens, 2)).toBe(1);
        });
      });

      it('I2, I3: the clues belong to the solution, and the solution satisfies every unit and every cage',
        function () {
          corpus().forEach(function (p) {
            var r = p.result;
            for (var c = 0; c < 81; c++) {
              if (r.givens[c] !== 0 && r.givens[c] !== r.solution[c]) throw new Error('I2');
            }
            expect(SG.model.isSolution(r.model, r.solution)).toBe(true);
            expect(SG.dfs.solve(r.model, r.givens)).toEqual(r.solution);
          });
        });

      it('I5: every puzzle has a complete proof; one rated as requested has its score in the band',
        function () {
          var hits = {};
          corpus().forEach(function (p) {
            var rating = p.result.rating;
            var spec = SG.difficulty.spec(p.level, p.result.model);
            expect(rating.solved).toBe(true);
            if (rating.level === p.level) {
              hits[p.level] = (hits[p.level] || 0) + 1;
              expect(rating.score).toBeGreaterThanOrEqual(spec.min);
              expect(rating.score).toBeLessThan(spec.max);
              expect(p.result.warnings).not.toContain('difficulty.approximate');
            } else {
              expect(p.result.warnings).toContain('difficulty.approximate');
            }
          });
          LEVELS.forEach(function (level) { expect(hits[level]).toBeGreaterThan(countOf(level) * 0.8); });
        });

      it('I6 (the clue floor of a Killer): very easy keeps 40 clues; the other levels dig down to a handful',
        function () {
          corpusOf('veryEasy').forEach(function (p) {
            expect(clueCount(p.result.givens)).toBeGreaterThanOrEqual(40);
          });
          var mean = {};
          LEVELS.forEach(function (level) {
            var sum = 0;
            corpusOf(level).forEach(function (p) { sum += clueCount(p.result.givens); });
            mean[level] = sum / countOf(level);
          });
          expect(mean.easy).toBeLessThan(35);
          // Rating v2: the score, not the clue count, sets the level; from easy on a puzzle keeps a handful.
          LEVELS.slice(1).forEach(function (level) {
            if (!(mean[level] < 12)) throw new Error(level + ': mean of ' + mean[level] + ' clues');
          });
        });

      it('I4 (CV5): the same seed gives the same puzzle, cages and colours included; other seeds differ',
        function () {
          LEVELS.forEach(function (level) {
            [1, 2, 3].forEach(function (seed) {
              var first = corpusOf(level)[seed - 1].result;
              var again = generate(level, seed, 'full', function () {});
              expect(Array.from(again.givens)).toEqual(Array.from(first.givens));
              expect(Array.from(again.solution)).toEqual(Array.from(first.solution));
              expect(again.model.cages.map(function (c) { return [Array.from(c.cells), c.sum]; }))
                .toEqual(first.model.cages.map(function (c) { return [Array.from(c.cells), c.sum]; }));
              var overlays = function (m) {
                return m.layout.overlays.map(function (o) { return [o.kind, Array.from(o.cells)]; });
              };
              expect(overlays(again.model)).toEqual(overlays(first.model));
            });
            var a = Array.from(corpusOf(level)[0].result.solution).join('');
            var b = Array.from(corpusOf(level)[1].result.solution).join('');
            expect(a).not.toBe(b);
          });
        });

      it('CV6: the 95th percentile of the generation time stays inside the killer row of design.md 9.1',
        function () {
          var report = {};
          LEVELS.forEach(function (level) {
            var times = corpusOf(level).map(function (p) { return p.ms; })
              .sort(function (a, b) { return a - b; });
            var p95 = times[Math.ceil(0.95 * times.length) - 1];
            report[level] = Math.round(p95);
            var limit = SG.test.timeLimit(BUDGET_MS[level]);
            if (p95 >= limit) {
              throw new Error(level + ': p95 ' + Math.round(p95) + ' ms >= ' + limit + ' (x' +
                SG.test.TIME_FACTOR + ')');
            }
          });
          expect(Object.keys(report)).toHaveLength(LEVELS.length);
        });

      it('stays reproducible whatever the trace level: off, summary and full give the same puzzle',
        function () {
          var base = generate('hard', 7, 'off');
          ['summary', 'full'].forEach(function (trace) {
            var other = generate('hard', 7, trace, function () {});
            expect(Array.from(other.givens)).toEqual(Array.from(base.givens));
          });
        });

      it('honours the cage size option through variantOptions: larger cages mean fewer of them', function () {
        function meanCages(tilt) {
          var total = 0;
          for (var seed = 1; seed <= 8; seed++) {
            var r = SG.pipeline.run({ variantId: 'killer', difficulty: 'normal', seed: seed, trace: 'off',
              variantOptions: { cageSize: tilt } }, null, null);
            total += r.model.cages.length;
          }
          return total / 8;
        }
        expect(meanCages(-2)).toBeGreaterThan(meanCages(0));
        expect(meanCages(0)).toBeGreaterThan(meanCages(2));
      });
    });

  describe('killer: cages of the generated puzzles', function () {
    it('partition the board: every cell in exactly one cage, each cage connected and of 1 to 7 cells',
      function () {
        corpus().forEach(function (p) {
          var model = p.result.model;
          var owner = new Int32Array(81).fill(-1);
          var singles = 0;
          model.cages.forEach(function (cage, k) {
            var cells = Array.from(cage.cells);
            cells.forEach(function (c) {
              expect(owner[c]).toBe(-1);
              owner[c] = k;
            });
            expect(cells.length).toBeGreaterThanOrEqual(1);
            expect(cells.length).toBeLessThanOrEqual(7);
            if (cells.length === 1) singles++;
            expect(isConnected(cells)).toBe(true);
            expect(cage.distinct).toBe(true);
          });
          for (var c = 0; c < 81; c++) expect(owner[c]).toBeGreaterThan(-1);
          expect(singles).toBeLessThanOrEqual(1);
        });
      });

    it('hold pairwise distinct digits in the solution, and every cage sum is the sum of its solution cells',
      function () {
        corpus().forEach(function (p) {
          var solution = p.result.solution;
          p.result.model.cages.forEach(function (cage) {
            var seen = 0;
            var sum = 0;
            Array.from(cage.cells).forEach(function (c) {
              var bit = 1 << (solution[c] - 1);
              if ((seen & bit) !== 0) throw new Error(p.level + ' seed ' + p.seed + ': a digit repeats in ' +
                'a cage');
              seen |= bit;
              sum += solution[c];
            });
            expect(cage.sum).toBe(sum);
            expect(cage.sum).toBeGreaterThanOrEqual(T.minSum(cage.cells.length));
            expect(cage.sum).toBeLessThanOrEqual(T.maxSum(cage.cells.length));
            expect(T.masks(cage.cells.length, cage.sum).length).toBeGreaterThan(0);
          });
        });
      });

    it('add up to the sum of the whole solution: the cage sums total 405 and equal the sum of the solution',
      function () {
        corpus().forEach(function (p) {
          var total = 0;
          p.result.model.cages.forEach(function (cage) { total += cage.sum; });
          var grid = 0;
          for (var c = 0; c < 81; c++) grid += p.result.solution[c];
          expect(total).toBe(grid);
          expect(total).toBe(405);
        });
      });

    it('make the cells of a cage peers of each other (a cage is a partial all-different unit)', function () {
      var model = corpusOf('normal')[0].result.model;
      model.cages.forEach(function (cage, k) {
        var cells = Array.from(cage.cells);
        for (var i = 0; i < cells.length; i++) {
          for (var j = i + 1; j < cells.length; j++) {
            expect(Array.from(model.peers[cells[i]])).toContain(cells[j]);
          }
        }
      });
      var cageUnits = model.unitMeta.filter(function (m) { return m.kind === 'cage'; });
      expect(cageUnits.length).toBe(model.cages.filter(function (c) { return c.cells.length >= 2; }).length);
      cageUnits.forEach(function (m) { expect(m.partial).toBe(true); });
    });

    it('follow the size distribution of the level (design.md 8.2): small cages on the easy levels',
      function () {
        function shares(level) {
          var hist = {};
          var total = 0;
          for (var seed = 1; seed <= 40; seed++) {
            var rng = SG.rng.create(seed);
            var board = DEF.build({}, null);
            var grid = SG.fullGrid.generate(board, rng.fork('grid'), null);
            K.growCages(grid, rng.fork('c'), K.sizeDistribution(level, 0)).forEach(function (cells) {
              hist[cells.length] = (hist[cells.length] || 0) + 1;
              total++;
            });
          }
          Object.keys(hist).forEach(function (k) { hist[k] = hist[k] / total; });
          return hist;
        }
        var easy = shares('easy');
        expect(Math.abs(easy[2] - 0.45)).toBeLessThan(0.08);
        expect(Math.abs(easy[3] - 0.40)).toBeLessThan(0.08);
        expect(Math.abs(easy[4] - 0.15)).toBeLessThan(0.06);
        expect(easy[6]).toBeUndefined();
        var normal = shares('normal');
        expect(Math.abs(normal[2] - 0.30)).toBeLessThan(0.08);
        expect(Math.abs(normal[5] - 0.10)).toBeLessThan(0.05);
        var hard = shares('hard');
        expect(Math.abs(hard[4] - 0.30)).toBeLessThan(0.08);
        expect(hard[6] + (hard[7] || 0)).toBeLessThan(0.1);
        expect(hard[6]).toBeGreaterThan(0);
      });

    it('the cage size slider tilts the distribution: smaller on the left, larger on the right', function () {
      function meanSize(tilt) {
        var cells = 0;
        var count = 0;
        for (var seed = 1; seed <= 20; seed++) {
          var rng = SG.rng.create(seed);
          var board = DEF.build({}, null);
          var grid = SG.fullGrid.generate(board, rng.fork('grid'), null);
          K.growCages(grid, rng.fork('c'), K.sizeDistribution('normal', tilt)).forEach(function (c) {
            cells += c.length;
            count++;
          });
        }
        return cells / count;
      }
      var sizes = [-2, -1, 0, 1, 2].map(meanSize);
      for (var i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
    });

    // colouring

    function sharedEdge(a, b) {
      return a.some(function (c) {
        return b.some(function (d) {
          return Math.abs(c - d) === 9 ||
            (Math.abs(c - d) === 1 && Math.floor(c / 9) === Math.floor(d / 9));
        });
      });
    }

    it('colour the cages so that no two cages that share an edge have the same colour (4 to 5 pale colours)',
      function () {
        corpus().forEach(function (p) {
          var cages = K.describeCages(p.result.model);
          var used = {};
          cages.forEach(function (a) {
            expect(a.color).toBeGreaterThan(-1);
            used[a.color] = true;
            cages.forEach(function (b) {
              if (a.index < b.index && sharedEdge(a.cells, b.cells) && a.color === b.color) {
                throw new Error(p.level + ' seed ' + p.seed + ': cages ' + a.index + ' and ' + b.index +
                  ' touch and share a colour');
              }
            });
          });
          expect(Object.keys(used).length).toBeGreaterThanOrEqual(2);
          expect(Object.keys(used).length).toBeLessThanOrEqual(5);
        });
      });

    it('colorCages is correct on 300 random layouts of every level, uses at most 5 colours and depends ' +
      'only on the cages',
      function () {
        var board = DEF.build({}, null);
        var maxColors = 0;
        for (var round = 0; round < 300; round++) {
          var level = LEVELS[round % LEVELS.length];
          var rng = SG.rng.create(900 + round);
          var grid = SG.fullGrid.generate(board, rng.fork('grid'), null);
          var cages = K.growCages(grid, rng.fork('c'), K.sizeDistribution(level, (round % 5) - 2));
          var colors = K.colorCages(cages);
          expect(colors).toHaveLength(cages.length);
          for (var a = 0; a < cages.length; a++) {
            for (var b = a + 1; b < cages.length; b++) {
              if (colors[a] === colors[b] && sharedEdge(cages[a], cages[b])) {
                throw new Error('layout ' + round);
              }
            }
            maxColors = Math.max(maxColors, colors[a] + 1);
          }
          expect(Array.from(K.colorCages(cages))).toEqual(Array.from(colors));
        }
        expect(maxColors).toBeLessThanOrEqual(5);
        expect(maxColors).toBeGreaterThanOrEqual(3);
      });

    it('colorCages widens the palette when it must, and still never gives touching cages one colour',
      function () {
        var board = DEF.build({}, null);
        var rng = SG.rng.create(5);
        var grid = SG.fullGrid.generate(board, rng.fork('grid'), null);
        var cages = K.growCages(grid, rng.fork('c'), K.sizeDistribution('easy', 0));
        var colors = K.colorCages(cages, 1);
        for (var a = 0; a < cages.length; a++) {
          for (var b = a + 1; b < cages.length; b++) {
            if (sharedEdge(cages[a], cages[b])) expect(colors[a]).not.toBe(colors[b]);
          }
        }
      });

    it('exposes the colours in the layout: one overlay per colour, cageColor0 ... , covering every cell once',
      function () {
        corpus().forEach(function (p) {
          var overlays = p.result.model.layout.overlays;
          expect(overlays.length).toBeGreaterThanOrEqual(2);
          expect(overlays.length).toBeLessThanOrEqual(5);
          var covered = new Int32Array(81);
          overlays.forEach(function (o, i) {
            expect(o.kind).toBe('cageColor' + i);
            expect(o.cells).toBeInstanceOf(Int32Array);
            for (var j = 0; j < o.cells.length; j++) covered[o.cells[j]]++;
          });
          for (var c = 0; c < 81; c++) expect(covered[c]).toBe(1);
        });
      });

    // geometry for the renderer (CV9)

    /**
     * The dashed outline of a cage as a renderer would draw it: the sides of its cells that touch another
     * cage or the border of the board, as unit segments between lattice points (x = column, y = row).
     */
    function outline(model, cage) {
      var cells = Array.from(cage.cells);
      var segments = [];
      cells.forEach(function (c) {
        var r = Math.floor(c / 9);
        var col = c % 9;
        var sides = [
          [r > 0 ? c - 9 : -1, [col, r], [col + 1, r]],
          [r < 8 ? c + 9 : -1, [col, r + 1], [col + 1, r + 1]],
          [col > 0 ? c - 1 : -1, [col, r], [col, r + 1]],
          [col < 8 ? c + 1 : -1, [col + 1, r], [col + 1, r + 1]]
        ];
        sides.forEach(function (s) {
          if (cells.indexOf(s[0]) === -1) segments.push([s[1], s[2]]);
        });
      });
      return segments;
    }

    it('give every cage a closed outline: one loop of lattice segments, with the perimeter of its cells',
      function () {
        corpus().filter(function (p) { return p.seed <= 4; }).forEach(function (p) {
          var model = p.result.model;
          model.cages.forEach(function (cage) {
            var cells = Array.from(cage.cells);
            var segments = outline(model, cage);
            var internal = 0;
            cells.forEach(function (c) {
              [c + 1, c + 9].forEach(function (d) {
                var sameRow = Math.floor(c / 9) === Math.floor(d / 9);
                if (cells.indexOf(d) !== -1 && (d === c + 9 || sameRow)) internal++;
              });
            });
            expect(segments).toHaveLength(4 * cells.length - 2 * internal);
            // Every lattice point of a closed curve is the end of an even number of segments, and one loop
            // means the segments connect: walk from one segment and visit them all.
            var degree = {};
            segments.forEach(function (s) {
              s.forEach(function (pt) { degree[pt.join(',')] = (degree[pt.join(',')] || 0) + 1; });
            });
            Object.keys(degree).forEach(function (k) { expect(degree[k] % 2).toBe(0); });
            var points = {};
            segments.forEach(function (s, i) {
              s.forEach(function (pt) {
                var key = pt.join(',');
                (points[key] = points[key] || []).push(i);
              });
            });
            var seen = { 0: true };
            var queue = [0];
            while (queue.length > 0) {
              var at = queue.pop();
              segments[at].forEach(function (pt) {
                points[pt.join(',')].forEach(function (next) {
                  if (!seen[next]) {
                    seen[next] = true;
                    queue.push(next);
                  }
                });
              });
            }
            expect(Object.keys(seen)).toHaveLength(segments.length);
          });
        });
      });

    it('tell the renderer where to write each sum: the top-left cell of the cage, a label of at most two ' +
      'digits',
      function () {
        corpus().filter(function (p) { return p.seed <= 4; }).forEach(function (p) {
          var model = p.result.model;
          var labelCells = {};
          K.describeCages(model).forEach(function (cage) {
            expect(cage.cells).toContain(cage.labelCell);
            cage.cells.forEach(function (c) {
              var r = model.layout.cellRow[c];
              var col = model.layout.cellCol[c];
              var lr = model.layout.cellRow[cage.labelCell];
              var lc = model.layout.cellCol[cage.labelCell];
              expect(r > lr || (r === lr && col >= lc)).toBe(true);
            });
            expect(labelCells[cage.labelCell]).toBeUndefined();
            labelCells[cage.labelCell] = true;
            expect(String(cage.sum).length).toBeLessThanOrEqual(2);
            expect(cage.size).toBe(cage.cells.length);
            expect(cage.sum).toBe(model.cages[cage.index].sum);
          });
        });
      });

    it('keeps the 3x3 box borders available next to the cages: cellRegion is the box of each cell',
      function () {
        var model = corpusOf('hard')[0].result.model;
        for (var c = 0; c < 81; c++) {
          expect(model.layout.cellRegion[c]).toBe(Math.floor(c / 27) * 3 + Math.floor((c % 9) / 3));
        }
        expect(model.layout.rows).toBe(9);
        expect(model.layout.cols).toBe(9);
      });

    it('rebuilds a model from stored cages (an import): same cages, colours and units as the generated one',
      function () {
        var original = corpusOf('normal')[3].result.model;
        var rebuilt = K.modelFromCages(original.cages.map(function (c) {
          return { cells: Array.from(c.cells), sum: c.sum };
        }));
        expect(rebuilt.cages.map(function (c) { return [Array.from(c.cells), c.sum]; }))
          .toEqual(original.cages.map(function (c) { return [Array.from(c.cells), c.sum]; }));
        expect(rebuilt.layout.overlays.map(function (o) { return [o.kind, Array.from(o.cells)]; }))
          .toEqual(original.layout.overlays.map(function (o) { return [o.kind, Array.from(o.cells)]; }));
        expect(rebuilt.units.length).toBe(original.units.length);
        expect(SG.model.validate(rebuilt).ok).toBe(true);
        var solution = corpusOf('normal')[3].result.solution;
        expect(SG.model.isSolution(rebuilt, solution)).toBe(true);
      });
  });

  describe('killer: layout check and repair', function () {
    var board = DEF.build({}, null);

    function gridOf(seed) { return SG.fullGrid.generate(board, SG.rng.create(seed).fork('grid'), null); }

    /** The layout is a partition of the board into connected cages of distinct digits. */
    function expectValidLayout(cages, grid) {
      var seen = new Int32Array(81);
      cages.forEach(function (cells) {
        var digits = 0;
        expect(isConnected(cells)).toBe(true);
        cells.forEach(function (c) {
          seen[c]++;
          expect((digits & (1 << (grid[c] - 1)))).toBe(0);
          digits |= 1 << (grid[c] - 1);
        });
      });
      for (var c = 0; c < 81; c++) expect(seen[c]).toBe(1);
    }

    function zeroUnique(model) {
      return SG.dfs.countSolutions(model, zeros(81), 2) === 1;
    }

    it('records for hard and master puzzles whether the cages alone are unique, and tells the truth',
      function () {
        var unique = 0;
        var total = 0;
        var checked = corpus().filter(function (p) { return p.level === 'hard' || p.level === 'master'; });
        checked.forEach(function (p) {
          var model = p.result.model;
          var info = K.layoutInfo(model);
          expect(info).not.toBeNull();
          expect(info.checked).toBe(true);
          expect(info.nodes).toBeGreaterThan(0);
          expect(info.cageCount).toBe(model.cages.length);
          info.repairs.forEach(function (action) { expect(['split', 'merge']).toContain(action); });
          total++;
          if (info.unique) {
            unique++;
            expect(info.revealed).toEqual([]);
            expect(zeroUnique(model)).toBe(true);
          } else {
            // Step (c): the clues it revealed make the layout unique (or the cap of 24 clues was reached).
            var givens = zeros(81);
            info.revealed.forEach(function (c) { givens[c] = p.result.solution[c]; });
            expect(info.revealed.length).toBeGreaterThan(0);
            if (info.revealed.length < 24) {
              expect(SG.dfs.countSolutions(model, givens, 2)).toBe(1);
            }
          }
        });
        expect(total).toBe(countOf('hard') + countOf('master'));
        expect(unique / total).toBeGreaterThan(0.25);
      });

    it('skips the check on the three lower levels: their digger keeps enough clues anyway', function () {
      ['veryEasy', 'easy', 'normal'].forEach(function (level) {
        var info = K.layoutInfo(corpusOf(level)[0].result.model);
        expect(info.checked).toBe(false);
        expect(info.unique).toBeNull();
        expect(info.nodes).toBe(0);
        expect(info.repairs).toEqual([]);
        expect(info.revealed).toEqual([]);
      });
      expect(K.layoutInfo(board)).toBeNull();
    });

    it('(a) splits a large cage: more cages afterwards, still a valid layout, sums from the same solution',
      function () {
        var found = 0;
        for (var seed = 1; seed <= 6; seed++) {
          var grid = gridOf(seed);
          var rng = SG.rng.create(seed);
          var cages = K.growCages(grid, rng.fork('c'), K.sizeDistribution('hard', 0));
          var actions = [];
          var out = K.repairLayout(board, grid, cages, 'hard', rng.fork('r'), null, {
            repair: function (action, attempt, count) { actions.push([action, attempt, count]); }
          });
          expectValidLayout(out.cages, grid);
          var splits = out.info.repairs.filter(function (a) { return a === 'split'; }).length;
          var merges = out.info.repairs.length - splits;
          if (splits > 0) {
            found++;
            // A split adds one cage; a merge takes one away (or regroups two cages, leaving the count alone).
            expect(out.cages.length).toBeGreaterThanOrEqual(cages.length + splits - merges);
            expect(out.cages.length).toBeLessThanOrEqual(cages.length + splits);
          }
          expect(actions.filter(function (a) { return a[0] !== 'reveal'; }))
            .toHaveLength(out.info.repairs.length);
          actions.forEach(function (a, i) {
            expect(['split', 'merge', 'reveal']).toContain(a[0]);
            expect(a[1]).toBeGreaterThan(0);
            expect(a[2]).toBeGreaterThan(0);
            if (i > 0 && a[0] === 'split' && actions[i - 1][0] === 'split') {
              expect(a[2]).toBe(actions[i - 1][2] + 1);
            }
          });
          var model = K.modelWithCages(board, out.cages, grid);
          expect(SG.model.isSolution(model, grid)).toBe(true);
          if (out.info.unique) expect(zeroUnique(model)).toBe(true);
        }
        expect(found).toBeGreaterThan(3);
      });

    it('splitting only adds constraints: the cage count never drops during the splits of a repair',
      function () {
        var grid = gridOf(3);
        var rng = SG.rng.create(3);
        var cages = K.growCages(grid, rng.fork('c'), K.sizeDistribution('master', 0));
        var counts = [cages.length];
        K.repairLayout(board, grid, cages, 'master', rng.fork('r'), null, {
          repair: function (action, attempt, count) { if (action === 'split') counts.push(count); }
        });
        for (var i = 1; i < counts.length; i++) expect(counts[i]).toBe(counts[i - 1] + 1);
      });

    it('(b) merges small neighbours when no cage is large enough to split, then (c) reveals clues',
      function () {
        var merges = 0;
        var reveals = 0;
        for (var seed = 1; seed <= 6; seed++) {
          var grid = gridOf(100 + seed);
          var rng = SG.rng.create(seed);
          // Only cages of two and three cells: nothing to split.
          var cages = K.growCages(grid, rng.fork('c'), { sizes: [2, 3], weights: [1, 1] });
          expect(Math.max.apply(null, cages.map(function (c) { return c.length; }))).toBeLessThanOrEqual(4);
          var out = K.repairLayout(board, grid, cages, 'master', rng.fork('r'), null, null);
          expectValidLayout(out.cages, grid);
          merges += out.info.repairs.filter(function (a) { return a === 'merge'; }).length;
          reveals += out.info.revealed.length;
          var model = K.modelWithCages(board, out.cages, grid);
          expect(SG.model.isSolution(model, grid)).toBe(true);
          if (!out.info.unique && out.info.revealed.length < 24) {
            var givens = zeros(81);
            out.info.revealed.forEach(function (c) { givens[c] = grid[c]; });
            expect(SG.dfs.countSolutions(model, givens, 2)).toBe(1);
          }
        }
        expect(merges).toBeGreaterThan(0);
        expect(reveals).toBeGreaterThan(0);
      });

    it('is deterministic: the same layout and rng give the same repair', function () {
      var grid = gridOf(9);
      var cages = K.growCages(grid, SG.rng.create(9).fork('c'), K.sizeDistribution('hard', 0));
      var a = K.repairLayout(board, grid, cages, 'hard', SG.rng.create(9).fork('r'), null, null);
      var b = K.repairLayout(board, grid, cages, 'hard', SG.rng.create(9).fork('r'), null, null);
      expect(b.cages).toEqual(a.cages);
      expect(b.info).toEqual(a.info);
    });

    it('does nothing for a level with no repairs, and respects the cancellation of the pipeline budget',
      function () {
        var grid = gridOf(2);
        var cages = K.growCages(grid, SG.rng.create(2).fork('c'), K.sizeDistribution('easy', 0));
        var out = K.repairLayout(board, grid, cages, 'easy', SG.rng.create(2), null, null);
        expect(out.cages).toBe(cages);
        expect(out.info.checked).toBe(false);
        var budget = SG.budget.create({});
        budget.cancel();
        var error = null;
        try {
          K.repairLayout(board, grid, cages, 'hard', SG.rng.create(2), budget, null);
        } catch (err) {
          error = err;
        }
        expect(error).not.toBeNull();
        expect(error.code).toBe('budget.cancelled');
      });
  });

  describe('killer: the fallback is the closest completely rated candidate the run met', function () {
    /** Distance to the requested level as the generator measures it: whole levels, then off the band. */
    function distance(rating, level) {
      if (!rating || rating.solved !== true) return Infinity;
      var band = SG.difficulty.bandOf(level);
      var gap = Math.abs(SG.difficulty.levelIndex(rating.level) - SG.difficulty.levelIndex(level));
      var off = rating.score < band.min ? (band.min - rating.score) / Math.max(band.min, 1)
        : rating.score >= band.max ? (rating.score - band.max) / band.max : 0;
      return gap * 1000 + off;
    }

    it('master, diagonal symmetry, two attempts (seed 61843): nothing it met and verified is closer',
      function () {
        var config = { variantId: 'killer', difficulty: 'master', seed: 61843, symmetry: 'diagonal',
          maxAttempts: 2, trace: 'off' };
        var rate = SG.difficulty.rate;
        var seen = [];
        SG.difficulty.rate = function (model, givens) {
          var rating = rate.apply(this, arguments);
          if (rating.solved) seen.push({ model: model, givens: Int32Array.from(givens), rating: rating });
          return rating;
        };
        var result;
        try {
          result = SG.pipeline.run(config, null);
        } finally {
          SG.difficulty.rate = rate;
        }
        // The closest candidate the run rated that an independent DFS count proves unique.
        seen.sort(function (a, b) { return distance(a.rating, 'master') - distance(b.rating, 'master'); });
        var witness = null;
        for (var i = 0; i < seen.length && witness === null; i++) {
          if (SG.dfs.countSolutions(seen[i].model, seen[i].givens, 2) === 1) witness = seen[i];
        }
        expect(witness).not.toBeNull();
        expect(distance(result.rating, 'master')).toBeLessThan(distance(witness.rating, 'master') + 1e-9);

        // The returned puzzle is valid: one solution, clues by whole symmetry groups, valid cages, a replay
        // that rebuilds it, and the score it claims.
        var model = result.model;
        expect(SG.dfs.countSolutions(model, result.givens, 2)).toBe(1);
        expect(SG.model.isSolution(model, result.solution)).toBe(true);
        expect(SG.difficulty.rate(model, result.givens).score).toBe(result.rating.score);
        SG.symmetry.groups(model, 'diagonal').forEach(function (g) {
          var shown = Array.from(g).filter(function (c) { return result.givens[c] !== 0; }).length;
          if (shown !== 0 && shown !== g.length) {
            throw new Error('a symmetry group is half shown: ' + Array.from(g));
          }
        });
        var covered = new Int32Array(81);
        model.cages.forEach(function (cage) {
          var cells = Array.from(cage.cells);
          expect(cells.length).toBeGreaterThan(1);
          expect(isConnected(cells)).toBe(true);
          var digits = {};
          var sum = 0;
          cells.forEach(function (c) {
            covered[c]++;
            expect(digits[result.solution[c]]).toBeUndefined();
            digits[result.solution[c]] = true;
            sum += result.solution[c];
          });
          expect(sum).toBe(cage.sum);
        });
        for (var c = 0; c < 81; c++) expect(covered[c]).toBe(1);
        var steps = SG.player.buildSteps(result).steps;
        var lastDig = steps[steps.length - 2];
        expect(Array.from(lastDig.values)).toEqual(Array.from(result.givens));
        expect(result.warnings).toContain('difficulty.approximate');
      }, 120000);
  });

  describe('killer: events of the extraStructure step', function () {
    var E = SG.events;
    var KEYS = ['extraStructure.cages', 'extraStructure.repairSplit', 'extraStructure.repairMerge',
      'extraStructure.repairReveal', 'extraStructure.unique', 'extraStructure.ambiguous'];

    /** The checks of the pipeline suite: valid shape, listed in the vocabulary with declared arguments. */
    function checkEvents(events) {
      events.forEach(function (e, i) {
        var problems = E.eventProblems(e);
        if (problems.length > 0) {
          throw new Error('event ' + i + ' (' + e.i18nKey + '): ' + problems.join('; '));
        }
        var v = E.lookup(e);
        if (v === null) {
          throw new Error('not in the vocabulary: ' + [e.type, e.stepId, e.phase, e.i18nKey].join(' '));
        }
        if (e.i18nArgs && v.key !== 'error.*') {
          Object.keys(e.i18nArgs).forEach(function (a) {
            if (v.args.indexOf(a) === -1 && a !== 'part' && a !== 'parts') {
              throw new Error(e.i18nKey + ' has the undeclared argument "' + a + '"');
            }
          });
        }
      });
    }

    it('lists its events in the vocabulary of the core, each once, at the summary level', function () {
      KEYS.forEach(function (key) {
        var entries = E.VOCABULARY.filter(function (v) { return v.key === key; });
        expect(entries).toHaveLength(1);
        expect(entries[0].type).toBe('step');
        expect(entries[0].stepId).toBe('extraStructure');
        expect(entries[0].phase).toBe('progress');
        expect(entries[0].level).toBe('summary');
        expect(E.vocabularyKeys()).toContain(key);
        expect(/^[a-z][A-Za-z]*(\.[A-Za-z*]+)+$/.test(key)).toBe(true);
      });
    });

    it('emits valid events for step 4 of a hard puzzle: the cages, the repairs and the verdict', function () {
      var events = [];
      generate('hard', 3, 'full', function (e) { events.push(e); });
      checkEvents(events);
      var own = events.filter(function (e) { return e.stepId === 'extraStructure'; });
      var keys = own.map(function (e) { return e.i18nKey; });
      expect(keys[0]).toBe('extraStructure.start');
      expect(keys[keys.length - 1]).toBe('extraStructure.end');
      expect(keys).toContain('extraStructure.cages');
      expect(keys).toContain('extraStructure.built');
      expect(keys.indexOf('extraStructure.unique') !== -1 || keys.indexOf('extraStructure.ambiguous') !== -1)
        .toBe(true);
      var cages = own.filter(function (e) { return e.i18nKey === 'extraStructure.cages'; })[0];
      expect(cages.i18nArgs.cages).toBeGreaterThan(10);
      expect(cages.i18nArgs.minSize).toBeGreaterThanOrEqual(1);
      expect(cages.i18nArgs.maxSize).toBeLessThanOrEqual(7);
      expect(cages.i18nArgs.colors).toBeGreaterThanOrEqual(2);
      own.filter(function (e) { return /extraStructure\.repair/.test(e.i18nKey); }).forEach(function (e) {
        expect(e.i18nArgs.attempt).toBeGreaterThan(0);
      });
    });

    it('reports the repairs it makes, in order, when postGenerate runs on its own', function () {
      var events = [];
      var em = E.createEmitter('summary', function (e) { events.push(e); });
      var board = DEF.build({}, null);
      var grid = SG.fullGrid.generate(board, SG.rng.create(11), null);
      var model = DEF.postGenerate({ model: board, solution: grid, rng: SG.rng.create(11).fork('extra#1'),
        level: 'master', spec: null, attempt: 1, budget: null, emit: em, variantId: 'killer' });
      checkEvents(events);
      expect(model.cages.length).toBeGreaterThan(10);
      expect(SG.model.isSolution(model, grid)).toBe(true);
      var info = K.layoutInfo(model);
      var repairEvents = events.filter(function (e) { return /extraStructure\.repair/.test(e.i18nKey); });
      expect(repairEvents).toHaveLength(info.repairs.length + info.revealed.length);
      expect(events.some(function (e) { return e.i18nKey === 'extraStructure.cages'; })).toBe(true);
      // A quiet emitter (or none at all) does not change the result.
      var again = DEF.postGenerate({ model: board, solution: grid, rng: SG.rng.create(11).fork('extra#1'),
        level: 'master', spec: null, attempt: 1, budget: null, emit: null, variantId: 'killer' });
      expect(again.cages.map(function (c) { return Array.from(c.cells); }))
        .toEqual(model.cages.map(function (c) { return Array.from(c.cells); }));
    });

    it('stays quiet at trace off: only the step start and end of step 4 reach the sink', function () {
      var events = [];
      SG.pipeline.run({ variantId: 'killer', difficulty: 'hard', seed: 3, trace: 'off' },
        function (e) { events.push(e); }, null);
      var own = events.filter(function (e) { return e.stepId === 'extraStructure'; });
      expect(own.map(function (e) { return e.i18nKey; }))
        .toEqual(['extraStructure.start', 'extraStructure.end']);
    });
  });

  describe('killer: translations (CV7)', function () {
    function fragment() {
      var list = (SG.localeFragments || []).filter(function (f) {
        return f.en && f.en['variant.killer'] !== undefined;
      });
      expect(list).toHaveLength(1);
      return list[0];
    }

    function placeholders(text) {
      var found = {};
      (text.match(/\{[A-Za-z]+\}/g) || []).forEach(function (p) { found[p] = true; });
      return Object.keys(found).sort();
    }

    it('names the variant in both languages and has a label for every part of its option', function () {
      var f = fragment();
      expect(f.en['variant.killer']).toBe('Killer Sudoku');
      expect(f.vi['variant.killer']).toBe('Sudoku Sát thủ');
      var o = DEF.options[0];
      var keys = [DEF.i18nKey, o.i18nKey, o.hintKey, o.minLabelKey, o.maxLabelKey, o.defaultLabelKey];
      keys.forEach(function (key) {
        expect(f.en[key]).toBeTruthy();
        expect(f.vi[key]).toBeTruthy();
      });
    });

    it('names each cage technique and explains each step, in both languages', function () {
      var f = fragment();
      ['cageCombo', 'ruleOf45', 'cageSplit'].forEach(function (id) {
        expect(f.en[SG.techniques.get(id).i18nKey]).toBeTruthy();
        expect(f.vi[SG.techniques.get(id).i18nKey]).toBeTruthy();
      });
      ['technique.cageCombo.step', 'technique.ruleOf45.step', 'technique.ruleOf45.place',
        'technique.cageSplit.step'].forEach(function (key) {
        expect(f.en[key]).toBeTruthy();
        expect(f.vi[key]).toBeTruthy();
      });
      expect(f.vi['technique.ruleOf45']).toBe('Quy tắc 45');
      expect(f.vi['technique.cageSplit']).toBe('Tách lồng');
    });

    it('uses only arguments that a Finding of a cage technique really carries',
      function () {
        var f = fragment();
        var args = {};
        corpus().filter(function (p) { return p.level === 'hard' || p.level === 'master'; }).slice(0, 12)
          .forEach(function (p) {
            var report = SG.logicalSolver.solve(p.result.model, p.result.givens, { collectSteps: true });
            report.steps.forEach(function (step) {
              if (SG.techniques.get(step.technique).group === 'cage') {
                args[step.i18nKey] = Object.keys(step.i18nArgs);
              }
            });
          });
        Object.keys(f.en).forEach(function (key) {
          if (args[key]) {
            placeholders(f.en[key]).forEach(function (p) {
              expect(args[key]).toContain(p.slice(1, -1));
            });
          }
        });
        // The solver really produced steps of the cage techniques, so the check above looked at some.
        expect(Object.keys(args).length).toBeGreaterThanOrEqual(2);
      });

    it('translates every event of step 4 that it adds, with the arguments the event declares', function () {
      var f = fragment();
      var own = SG.events.VOCABULARY.filter(function (v) {
        return v.stepId === 'extraStructure' && v.key !== null && f.en[v.key] !== undefined;
      });
      expect(own).toHaveLength(6);
      own.forEach(function (v) {
        placeholders(f.en[v.key]).forEach(function (p) { expect(v.args).toContain(p.slice(1, -1)); });
        placeholders(f.vi[v.key]).forEach(function (p) { expect(v.args).toContain(p.slice(1, -1)); });
      });
    });

    it('writes Vietnamese with diacritics (natural text, not the English words)', function () {
      var f = fragment();
      Object.keys(f.vi).forEach(function (key) {
        expect(/[^\x00-\x7f]/.test(f.vi[key])).toBe(true);
      });
    });
  });

  describe('killer: code hygiene', function () {
    it('has no variant check in the engines: Killer reaches the core only through the registry, the hooks ' +
      'and variantScope',
      function () {
        var env = SG.test.node;
        if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
        var compares = /(===?|!==?)\s*['"]killer['"]|['"]killer['"]\s*(===?|!==?)|indexOf\(\s*['"]killer['"]/;
        ['../core/js/engine', 'js/engine'].forEach(function (rel) {
          var dir = env.path.join(env.root, rel);
          env.fs.readdirSync(dir).filter(function (n) { return n.endsWith('.js'); }).forEach(function (name) {
            var text = env.fs.readFileSync(env.path.join(dir, name), 'utf8');
            text.split(/\r?\n/).forEach(function (line, i) {
              if (compares.test(line)) {
                throw new Error(rel + '/' + name + ':' + (i + 1) + ' compares with "killer": ' + line.trim());
              }
            });
          });
        });
      });

    it('keeps the lines of its three files at most 110 characters long', function () {
      var env = SG.test.node;
      if (!env || !env.fs) SG.test.skip('needs the Node file system; skipped in the browser');
      var files = ['../core/js/engine/combo-table.js', '../core/js/engine/tech-cage.js',
        'js/variants/killer.js'];
      files.forEach(function (rel) {
        var text = env.fs.readFileSync(env.path.join(env.root, rel), 'utf8');
        expect(text.split(/\r?\n/).every(function (line) { return line.length <= 110; })).toBe(true);
      });
    });
  });
})();
