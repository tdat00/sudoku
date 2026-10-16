// Symmetry groups (task T-1.6) and the hole digger, stage A (task T-1.7). The digger tests assert the
// invariants I1 (unique solution), I2 (givens are a subset of the solution), I3 (valid solution), I4 (same
// seed, same puzzle) and I6 (clue floor) from design.md section 15.3.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var F = SG.fixtures;
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

  function clues(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] !== 0) n++;
    return n;
  }

  function sorted(list) {
    return Array.from(list).sort(function (a, b) { return a - b; });
  }

  /** Full grid + dig, both from forks of one seed. */
  function makePuzzle(model, seed, options) {
    var rng = SG.rng.create(seed);
    var solution = SG.fullGrid.generate(model, rng.fork('fullGrid'), null);
    return SG.digger.dig(model, solution, rng.fork('dig'), options);
  }

  /**
   * Independent description of the symmetries on an N x N canvas: the canvas positions that a position
   * maps to, one entry per non-identity transform of the group.
   */
  function images(kind, r, c, N) {
    var m = N - 1;
    switch (kind) {
      case 'none': return [];
      case 'rotational180': return [[m - r, m - c]];
      case 'rotational90': return [[c, m - r], [m - r, m - c], [m - c, r]];
      case 'mirrorH': return [[m - r, c]];
      case 'mirrorV': return [[r, m - c]];
      case 'mirrorBoth': return [[m - r, c], [r, m - c], [m - r, m - c]];
      case 'diagonal': return [[c, r]];
      case 'antiDiagonal': return [[m - c, m - r]];
      default: throw new Error('unknown kind ' + kind);
    }
  }

  /** Cell at a canvas position, or -1. */
  function cellAt(model, r, c) {
    for (var i = 0; i < model.cellCount; i++) {
      if (model.layout.cellRow[i] === r && model.layout.cellCol[i] === c) return i;
    }
    return -1;
  }

  /** The cells that the group of `cell` must contain, computed from the independent transforms. */
  function expectedGroup(model, kind, cell) {
    var N = model.layout.rows;
    var members = [cell];
    images(kind, model.layout.cellRow[cell], model.layout.cellCol[cell], N).forEach(function (p) {
      var other = cellAt(model, p[0], p[1]);
      if (other !== -1 && members.indexOf(other) === -1) members.push(other);
    });
    return sorted(members);
  }

  /** True when the empty cells of the puzzle form a pattern that the symmetry maps onto itself. */
  function patternIsSymmetric(model, givens, kind) {
    for (var c = 0; c < model.cellCount; c++) {
      var group = expectedGroup(model, kind, c);
      for (var i = 0; i < group.length; i++) {
        if ((givens[group[i]] === 0) !== (givens[c] === 0)) return false;
      }
    }
    return true;
  }

  describe('symmetry: groups', function () {
    var KINDS = SG.symmetry.KINDS;

    it('knows the eight kinds', function () {
      expect(KINDS).toEqual(['none', 'rotational180', 'rotational90', 'mirrorH', 'mirrorV', 'mirrorBoth',
        'diagonal', 'antiDiagonal']);
    });

    it('none: every cell is its own group', function () {
      var groups = SG.symmetry.groups(model9, 'none');
      expect(groups).toHaveLength(81);
      groups.forEach(function (g, i) { expect(Array.from(g)).toEqual([i]); });
    });

    it('rotational180 on 9x9: 40 pairs and the centre, 41 groups covering all 81 cells once', function () {
      var groups = SG.symmetry.groups(model9, 'rotational180');
      expect(groups).toHaveLength(41);
      var pairs = groups.filter(function (g) { return g.length === 2; });
      var singles = groups.filter(function (g) { return g.length === 1; });
      expect(pairs).toHaveLength(40);
      expect(singles).toHaveLength(1);
      expect(Array.from(singles[0])).toEqual([40]);
      pairs.forEach(function (g) { expect(g[0] + g[1]).toBe(80); });
      var all = [];
      groups.forEach(function (g) { all = all.concat(Array.from(g)); });
      expect(sorted(all)).toEqual(sorted(new Array(81).fill(0).map(function (v, i) { return i; })));
    });

    it('rotational90 on 9x9: groups of four cells and the centre cell', function () {
      var groups = SG.symmetry.groups(model9, 'rotational90');
      expect(groups).toHaveLength(21);
      expect(groups.filter(function (g) { return g.length === 4; })).toHaveLength(20);
      var single = groups.filter(function (g) { return g.length === 1; });
      expect(single).toHaveLength(1);
      expect(Array.from(single[0])).toEqual([40]);
      // The orbit of R1C2 under quarter turns: R1C2, R2C9, R9C8, R8C1.
      var group = groups.filter(function (g) { return Array.from(g).indexOf(1) !== -1; })[0];
      expect(Array.from(group)).toEqual([1, 17, 63, 79]);
    });

    it('mirrorH and mirrorV: pairs across the midline and singles on the axis', function () {
      var h = SG.symmetry.groups(model9, 'mirrorH');
      expect(h).toHaveLength(45);
      expect(h.filter(function (g) { return g.length === 1; })).toHaveLength(9);
      h.filter(function (g) { return g.length === 2; }).forEach(function (g) {
        expect(g[1] - g[0]).toBe(9 * (8 - 2 * Math.floor(g[0] / 9)));
      });
      var v = SG.symmetry.groups(model9, 'mirrorV');
      expect(v).toHaveLength(45);
      v.filter(function (g) { return g.length === 2; }).forEach(function (g) {
        expect(Math.floor(g[0] / 9)).toBe(Math.floor(g[1] / 9));
        expect(g[0] % 9 + g[1] % 9).toBe(8);
      });
    });

    it('mirrorBoth: 16 groups of four, 8 pairs on the axes and the centre', function () {
      var groups = SG.symmetry.groups(model9, 'mirrorBoth');
      expect(groups).toHaveLength(25);
      expect(groups.filter(function (g) { return g.length === 4; })).toHaveLength(16);
      expect(groups.filter(function (g) { return g.length === 2; })).toHaveLength(8);
      expect(groups.filter(function (g) { return g.length === 1; })).toHaveLength(1);
    });

    it('diagonal and antiDiagonal: the diagonal cells stay alone, the rest pair up', function () {
      var d = SG.symmetry.groups(model9, 'diagonal');
      expect(d).toHaveLength(45);
      d.filter(function (g) { return g.length === 1; }).forEach(function (g) { expect(g[0] % 10).toBe(0); });
      d.filter(function (g) { return g.length === 2; }).forEach(function (g) {
        expect([Math.floor(g[0] / 9), g[0] % 9]).toEqual([g[1] % 9, Math.floor(g[1] / 9)]);
      });
      var a = SG.symmetry.groups(model9, 'antiDiagonal');
      expect(a).toHaveLength(45);
      a.filter(function (g) { return g.length === 1; }).forEach(function (g) { expect(g[0] % 8).toBe(0); });
    });

    it('sorts every group ascending and lists groups by their lowest cell', function () {
      KINDS.forEach(function (kind) {
        var groups = SG.symmetry.groups(model9, kind);
        groups.forEach(function (g) { expect(Array.from(g)).toEqual(sorted(g)); });
        for (var i = 1; i < groups.length; i++) expect(groups[i][0]).toBeGreaterThan(groups[i - 1][0]);
      });
    });

    it('matches the independent transforms for every kind on every classic grid', function () {
      [model4, model6, model9].forEach(function (model) {
        KINDS.forEach(function (kind) {
          SG.symmetry.groups(model, kind).forEach(function (g) {
            g.forEach(function (c) { expect(Array.from(g)).toEqual(expectedGroup(model, kind, c)); });
          });
        });
      });
    });

    it('covers every cell exactly once for every kind (union = all cells, no duplicates)', function () {
      [model4, model6, model9, F.models.samurai(), F.models.lShape()].forEach(function (model) {
        KINDS.forEach(function (kind) {
          var seen = new Uint8Array(model.cellCount);
          SG.symmetry.groups(model, kind).forEach(function (g) {
            expect(g.length).toBeGreaterThan(0);
            g.forEach(function (c) {
              expect(seen[c]).toBe(0);
              seen[c] = 1;
            });
          });
          for (var c = 0; c < model.cellCount; c++) expect(seen[c]).toBe(1);
        });
      });
    });

    it('works on the canvas of a samurai board (21x21 with holes): centre of the whole canvas', function () {
      var model = F.models.samurai();
      var r180 = SG.symmetry.groups(model, 'rotational180');
      expect(r180).toHaveLength(185);
      var centre = r180.filter(function (g) { return g.length === 1; });
      expect(centre).toHaveLength(1);
      expect(centre[0][0]).toBe(cellAt(model, 10, 10));
      expect(SG.symmetry.groups(model, 'rotational90')).toHaveLength(93);
      expect(SG.symmetry.groups(model, 'mirrorBoth').length).toBeGreaterThan(90);
    });

    it('shrinks a group instead of failing when the mirror image is not a cell', function () {
      var model = F.models.lShape();
      var groups = SG.symmetry.groups(model, 'rotational180');
      var topLeft = cellAt(model, 0, 0);
      expect(cellAt(model, 20, 20)).toBe(-1);
      var own = groups.filter(function (g) { return g.indexOf(topLeft) !== -1; })[0];
      expect(Array.from(own)).toEqual([topLeft]);
      // R8C8 of the top-left grid lies in the overlap, and its image R14C14 is a cell of the centre grid.
      var inner = cellAt(model, 7, 7);
      var innerGroup = groups.filter(function (g) { return g.indexOf(inner) !== -1; })[0];
      expect(Array.from(innerGroup)).toEqual(sorted([inner, cellAt(model, 13, 13)]));
      expect(groups.filter(function (g) { return g.length === 1; }).length).toBeGreaterThan(1);
      expect(Math.max.apply(null, groups.map(function (g) { return g.length; }))).toBe(2);
    });

    it('rejects an unknown kind, and square-only kinds on a canvas that is not square', function () {
      expectCode(function () { SG.symmetry.groups(model9, 'zigzag'); }, 'symmetry.unknownKind');
      expectCode(function () { SG.symmetry.groups(model9, 'toString'); }, 'symmetry.unknownKind');
      var cells = [0, 1, 2, 3];
      var wide = SG.model.create({
        variantId: 'wide',
        digits: 4,
        units: [cells],
        layout: { rows: 1, cols: 4, cellRow: [0, 0, 0, 0], cellCol: cells, cellRegion: [0, 0, 0, 0] }
      });
      ['rotational90', 'diagonal', 'antiDiagonal'].forEach(function (kind) {
        expectCode(function () { SG.symmetry.groups(wide, kind); }, 'symmetry.needsSquareCanvas');
      });
      expect(SG.symmetry.groups(wide, 'rotational180')).toHaveLength(2);
      expect(SG.symmetry.groups(wide, 'mirrorV')).toHaveLength(2);
      expect(SG.symmetry.groups(wide, 'mirrorH')).toHaveLength(4);
    });
  });

  describe('digger: 200 classic9 puzzles (invariants I1, I2, I3, I6)', function () {
    var COUNT = 200;
    var MIN_CLUES = 17;
    var puzzles = [];
    for (var seed = 1; seed <= COUNT; seed++) {
      puzzles.push(makePuzzle(model9, seed, { symmetry: 'rotational180', minClues: MIN_CLUES }));
    }

    it('I1: every puzzle has exactly one solution (countSolutions(.., 2) === 1)', function () {
      puzzles.forEach(function (p, i) {
        if (SG.dfs.countSolutions(model9, p.givens, 2) !== 1) {
          throw new Error('seed ' + (i + 1) + ' is not unique');
        }
      });
    });

    it('I2: the givens are a subset of the solution', function () {
      puzzles.forEach(function (p) {
        for (var c = 0; c < 81; c++) {
          if (p.givens[c] !== 0) expect(p.givens[c]).toBe(p.solution[c]);
        }
      });
    });

    it('I3: the solution satisfies every unit, and solving the puzzle gives exactly it', function () {
      puzzles.forEach(function (p) {
        expect(SG.model.isSolution(model9, p.solution)).toBe(true);
        expect(Array.from(SG.dfs.solve(model9, p.givens))).toEqual(Array.from(p.solution));
      });
    });

    it('I6: the clue count never falls below minClues, and the result reports it correctly', function () {
      puzzles.forEach(function (p) {
        expect(p.clues).toBeGreaterThan(MIN_CLUES - 1);
        expect(clues(p.givens)).toBe(p.clues);
        expect(p.removed).toBe(81 - p.clues);
      });
    });

    it('actually digs: puzzles are sparse, and none is below the proven minimum of 17 clues', function () {
      var total = 0;
      puzzles.forEach(function (p) { total += p.clues; });
      expect(total / COUNT).toBeLessThan(35);
      puzzles.forEach(function (p) { expect(p.clues).toBeGreaterThan(16); });
    });

    it('the empty cells are centrally symmetric (rotational180)', function () {
      puzzles.forEach(function (p) {
        for (var c = 0; c < 81; c++) expect(p.givens[c] === 0).toBe(p.givens[80 - c] === 0);
      });
    });

    it('is minimal: putting any remaining group of clues back to nothing breaks uniqueness', function () {
      var groups = SG.symmetry.groups(model9, 'rotational180');
      puzzles.slice(0, 30).forEach(function (p) {
        groups.forEach(function (g) {
          var kept = Array.from(g).every(function (c) { return p.givens[c] !== 0; });
          if (!kept) return;
          var smaller = Int32Array.from(p.givens);
          g.forEach(function (c) { smaller[c] = 0; });
          expect(SG.dfs.countSolutions(model9, smaller, 2)).toBe(2);
        });
      });
    });

    it('keeps its statistics consistent', function () {
      puzzles.forEach(function (p) {
        var s = p.stats;
        expect(s.groups).toBe(41);
        expect(s.tried).toBe(s.accepted + s.rejected);
        expect(s.accepted + s.rejected + s.skipped).toBe(s.groups);
        expect(s.oracleCalls).toBeGreaterThan(s.tried - 1);
      });
    });

    it('reports the cells whose removal was refused, and they are clues', function () {
      puzzles.forEach(function (p) {
        for (var c = 0; c < 81; c++) if (p.rejected[c] === 1) expect(p.givens[c]).not.toBe(0);
      });
    });

    it('returns the solution it was given and does not modify it', function () {
      var rng = SG.rng.create(3);
      var solution = SG.fullGrid.generate(model9, rng.fork('fullGrid'), null);
      var copy = Int32Array.from(solution);
      var result = SG.digger.dig(model9, solution, rng.fork('dig'));
      expect(result.solution).toBe(solution);
      expect(solution).toEqual(copy);
      expect(result.givens).not.toBe(solution);
    });
  });

  describe('digger: reproducibility (I4)', function () {
    it('the same seed gives the same givens, for every dig order and every symmetry', function () {
      SG.digger.ORDERS.forEach(function (order) {
        SG.symmetry.KINDS.forEach(function (symmetry) {
          var a = makePuzzle(model9, 11, { order: order, symmetry: symmetry });
          var b = makePuzzle(model9, 11, { order: order, symmetry: symmetry });
          expect(a.givens).toEqual(b.givens);
          expect(a.stats).toEqual(b.stats);
        });
      });
    });

    it('a different seed gives a different puzzle', function () {
      var seen = new Set();
      for (var s = 1; s <= 30; s++) seen.add(makePuzzle(model9, s).givens.join(''));
      expect(seen.size).toBe(30);
    });

    it('the dig order and the symmetry change the pattern', function () {
      var base = makePuzzle(model9, 5, { order: 'random', symmetry: 'none' }).givens.join('');
      expect(makePuzzle(model9, 5, { order: 'rowByRow', symmetry: 'none' }).givens.join('')).not.toBe(base);
      var mirrored = makePuzzle(model9, 5, { order: 'random', symmetry: 'rotational180' });
      expect(mirrored.givens.join('')).not.toBe(base);
    });

    it('is independent of the emit callback', function () {
      var plain = makePuzzle(model9, 9, {}).givens;
      var seen = 0;
      var noisy = makePuzzle(model9, 9, { emit: function () { seen++; } }).givens;
      var nulled = makePuzzle(model9, 9, { emit: null }).givens;
      expect(noisy).toEqual(plain);
      expect(nulled).toEqual(plain);
      expect(seen).toBeGreaterThan(0);
    });
  });

  describe('digger: symmetry kinds', function () {
    SG.symmetry.KINDS.forEach(function (kind) {
      it(kind + ': puzzles are unique and their empty cells follow the symmetry', function () {
        for (var s = 1; s <= 25; s++) {
          var p = makePuzzle(model9, 100 + s, { symmetry: kind });
          expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
          expect(patternIsSymmetric(model9, p.givens, kind)).toBe(true);
        }
      });
    });

    it('a stricter symmetry leaves more clues on average than none', function () {
      function average(kind) {
        var total = 0;
        for (var s = 1; s <= 40; s++) total += makePuzzle(model9, 300 + s, { symmetry: kind }).clues;
        return total / 40;
      }
      expect(average('none')).toBeLessThan(average('rotational90'));
    });
  });

  describe('digger: dig orders', function () {
    function triedCells(model, order, symmetry) {
      var events = [];
      makePuzzle(model, 4, { order: order, symmetry: symmetry, emit: function (e) { events.push(e); } });
      return events.filter(function (e) {
        return e.i18nKey === 'dig.try' || e.i18nKey === 'dig.skip';
      }).map(function (e) { return e.i18nArgs.cells[0]; });
    }

    function range(n) { return new Array(n).fill(0).map(function (v, i) { return i; }); }

    function spiral(N) {
      var seen = new Set();
      var out = [];
      var r = 0;
      var c = 0;
      var dr = 0;
      var dc = 1;
      for (var i = 0; i < N * N; i++) {
        out.push(r * N + c);
        seen.add(r * N + c);
        var nr = r + dr;
        var nc = c + dc;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N || seen.has(nr * N + nc)) {
          var t = dr;
          dr = dc;
          dc = -t;
          nr = r + dr;
          nc = c + dc;
        }
        r = nr;
        c = nc;
      }
      return out;
    }

    it('rowByRow visits the cells row by row', function () {
      expect(triedCells(model9, 'rowByRow', 'none')).toEqual(range(81));
    });

    it('snake alternates the direction of every row', function () {
      var expected = [];
      for (var r = 0; r < 9; r++) {
        for (var k = 0; k < 9; k++) expected.push(r * 9 + (r % 2 === 0 ? k : 8 - k));
      }
      expect(triedCells(model9, 'snake', 'none')).toEqual(expected);
    });

    it('spiral winds clockwise from the top-left corner towards the centre', function () {
      var cells = triedCells(model9, 'spiral', 'none');
      expect(cells).toEqual(spiral(9));
      expect(cells.slice(0, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 17]);
      expect(cells[80]).toBe(40);
      expect(triedCells(model4, 'spiral', 'none')).toEqual(spiral(4));
    });

    it('jumpOne takes every second cell first, then the ones in between', function () {
      var expected = [];
      var i;
      for (i = 0; i < 81; i += 2) expected.push(i);
      for (i = 1; i < 81; i += 2) expected.push(i);
      expect(triedCells(model9, 'jumpOne', 'none')).toEqual(expected);
    });

    it('random is a permutation of all cells that differs from the row order and between seeds', function () {
      var a = triedCells(model9, 'random', 'none');
      expect(sorted(a)).toEqual(range(81));
      expect(a).not.toEqual(range(81));
      var events = [];
      makePuzzle(model9, 5, { order: 'random', symmetry: 'none', emit: function (e) { events.push(e); } });
      var b = events.filter(function (e) { return e.i18nKey === 'dig.try'; }).map(function (e) {
        return e.i18nArgs.cells[0];
      });
      expect(b).not.toEqual(a.slice(0, b.length));
    });

    it('walks the symmetry groups in the order in which the sequence first reaches them', function () {
      var cells = triedCells(model9, 'rowByRow', 'rotational180');
      expect(cells).toEqual(range(41));
    });

    it('produces unique puzzles for all five orders', function () {
      SG.digger.ORDERS.forEach(function (order) {
        for (var s = 1; s <= 20; s++) {
          var p = makePuzzle(model9, 700 + s, { order: order });
          expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
        }
      });
    });

    it('lists the five orders', function () {
      expect(SG.digger.ORDERS).toEqual(['random', 'rowByRow', 'snake', 'spiral', 'jumpOne']);
    });
  });

  describe('digger: minClues, minCluesPerUnit and the rejected map (cheap pre-filters)', function () {
    function reasons(options) {
      var seen = {};
      function count(e) {
        if (e.i18nKey !== 'dig.skip') return;
        seen[e.i18nArgs.reason] = (seen[e.i18nArgs.reason] || 0) + 1;
      }
      makePuzzle(model9, 6, Object.assign({ emit: count }, options));
      return seen;
    }

    it('never goes below minClues', function () {
      [20, 30, 40].forEach(function (floor) {
        for (var s = 1; s <= 40; s++) {
          var p = makePuzzle(model9, 200 + s, { minClues: floor });
          expect(p.clues).toBeGreaterThan(floor - 1);
          expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
        }
      });
    });

    it('stops close to minClues when the floor is the limit (a pair can overshoot by one)', function () {
      for (var s = 1; s <= 20; s++) {
        var p = makePuzzle(model9, 400 + s, { minClues: 45 });
        expect(p.clues).toBeLessThan(47);
      }
    });

    it('removes nothing when minClues is the full grid, and says why', function () {
      var p = makePuzzle(model9, 2, { minClues: 81 });
      expect(p.clues).toBe(81);
      expect(p.removed).toBe(0);
      expect(p.stats.skipped).toBe(p.stats.groups);
      expect(reasons({ minClues: 81 })).toEqual({ minClues: 41 });
    });

    it('keeps at least minCluesPerUnit clues in every row, column and box', function () {
      [1, 2, 3].forEach(function (floor) {
        for (var s = 1; s <= 40; s++) {
          var p = makePuzzle(model9, 500 + s, { minCluesPerUnit: floor });
          model9.units.forEach(function (unit) {
            var inUnit = 0;
            unit.forEach(function (c) { if (p.givens[c] !== 0) inUnit++; });
            expect(inUnit).toBeGreaterThan(floor - 1);
          });
          expect(SG.dfs.countSolutions(model9, p.givens, 2)).toBe(1);
        }
      });
    });

    it('the unit floor has an effect: without it some unit is left with fewer clues', function () {
      var sparse = 0;
      for (var s = 1; s <= 60; s++) {
        var p = makePuzzle(model9, 500 + s, { symmetry: 'none' });
        var low = model9.units.some(function (unit) {
          var inUnit = 0;
          unit.forEach(function (c) { if (p.givens[c] !== 0) inUnit++; });
          return inUnit < 3;
        });
        if (low) sparse++;
      }
      expect(sparse).toBeGreaterThan(0);
      expect(reasons({ minCluesPerUnit: 4 }).unitMinimum).toBeGreaterThan(0);
    });

    it('removes nothing when every unit may not lose a single clue', function () {
      var p = makePuzzle(model9, 2, { minCluesPerUnit: 9 });
      expect(p.clues).toBe(81);
      expect(reasons({ minCluesPerUnit: 9 }).unitMinimum).toBe(41);
    });

    it('skips cells that are already marked as rejected, without trying them', function () {
      var marked = new Uint8Array(81);
      [0, 1, 2, 40, 80].forEach(function (c) { marked[c] = 1; });
      var rng = SG.rng.create(8);
      var solution = SG.fullGrid.generate(model9, rng.fork('fullGrid'), null);
      var tried = [];
      var skipped = [];
      var result = SG.digger.dig(model9, solution, rng.fork('dig'), {
        symmetry: 'none',
        rejected: marked,
        emit: function (e) {
          if (e.i18nKey === 'dig.try') tried.push(e.i18nArgs.cells[0]);
          if (e.i18nKey === 'dig.skip' && e.i18nArgs.reason === 'rejected') skipped.push(e.i18nArgs.cells[0]);
        }
      });
      expect(sorted(skipped)).toEqual([0, 1, 2, 40, 80]);
      [0, 1, 2, 40, 80].forEach(function (c) {
        expect(tried).not.toContain(c);
        expect(result.givens[c]).toBe(solution[c]);
        expect(result.rejected[c]).toBe(1);
      });
      expect(marked[40]).toBe(1);
      expect(SG.dfs.countSolutions(model9, result.givens, 2)).toBe(1);
    });

    it('a rejected cell protects its whole symmetry group', function () {
      var marked = new Uint8Array(81);
      marked[0] = 1;
      var p = makePuzzle(model9, 12, { symmetry: 'rotational180', rejected: marked });
      expect(p.givens[0]).not.toBe(0);
      expect(p.givens[80]).not.toBe(0);
    });
  });

  describe('digger: events', function () {
    function collect(options) {
      var events = [];
      var result = makePuzzle(model9, 7, Object.assign({ emit: function (e) { events.push(e); } }, options));
      return { events: events, result: result };
    }

    it('starts and ends the dig step, and reports one try or skip per group', function () {
      var out = collect({ symmetry: 'rotational180' });
      var events = out.events;
      expect(events[0].type).toBe('step');
      expect(events[0].phase).toBe('start');
      expect(events[0].stepId).toBe('dig');
      expect(events[events.length - 1].phase).toBe('end');
      expect(events[events.length - 1].metrics.clues).toBe(out.result.clues);
      var attempts = events.filter(function (e) {
        return e.i18nKey === 'dig.try' || e.i18nKey === 'dig.skip';
      });
      expect(attempts).toHaveLength(41);
    });

    it('every try is followed by exactly one accept or reject of the same cells', function () {
      var events = collect({}).events;
      for (var i = 0; i < events.length; i++) {
        if (events[i].i18nKey !== 'dig.try') continue;
        var next = events[i + 1];
        expect(['dig.accept', 'dig.reject']).toContain(next.i18nKey);
        expect(next.i18nArgs.cells).toEqual(events[i].i18nArgs.cells);
      }
    });

    it('describes changes as small delta patches, never the whole grid', function () {
      var events = collect({ symmetry: 'mirrorBoth' }).events;
      events.forEach(function (e) {
        if (!e.patch) return;
        ['cells', 'highlight', 'unhighlight'].forEach(function (key) {
          if (e.patch[key]) expect(e.patch[key].length).toBeLessThan(9);
        });
      });
      var accepts = events.filter(function (e) { return e.i18nKey === 'dig.accept'; });
      expect(accepts.length).toBeGreaterThan(0);
      accepts.forEach(function (e) {
        e.patch.cells.forEach(function (change) {
          expect(change.value).toBe(0);
          expect(typeof change.i).toBe('number');
        });
      });
    });

    it('counts accepted and rejected groups in the metrics', function () {
      var out = collect({});
      var events = out.events;
      var last = events[events.length - 1].metrics;
      expect(last.accepted).toBe(out.result.stats.accepted);
      expect(last.rejected).toBe(out.result.stats.rejected);
      expect(events.filter(function (e) { return e.i18nKey === 'dig.accept'; })).toHaveLength(last.accepted);
      expect(events.filter(function (e) { return e.i18nKey === 'dig.reject'; })).toHaveLength(last.rejected);
    });

    it('treats a missing or null emit as a no-op', function () {
      expect(function () { makePuzzle(model9, 1, { emit: null }); }).not.toThrow();
      expect(function () { makePuzzle(model9, 1, { emit: undefined }); }).not.toThrow();
      expect(function () { makePuzzle(model9, 1); }).not.toThrow();
    });
  });

  describe('digger: other boards', function () {
    it('classic4 and classic6 puzzles are unique for every symmetry', function () {
      [model4, model6].forEach(function (model) {
        SG.symmetry.KINDS.forEach(function (kind) {
          for (var s = 1; s <= 8; s++) {
            var p = makePuzzle(model, s, { symmetry: kind });
            expect(SG.dfs.countSolutions(model, p.givens, 2)).toBe(1);
            expect(SG.model.isSolution(model, p.solution)).toBe(true);
            expect(patternIsSymmetric(model, p.givens, kind)).toBe(true);
          }
        });
      });
    });

    it('an overlapping multi-grid board is dug with symmetry about the centre of the canvas', function () {
      var model = F.models.samurai();
      ['rotational180', 'rotational90', 'mirrorBoth', 'diagonal', 'none'].forEach(function (kind) {
        var p = makePuzzle(model, 3, { symmetry: kind });
        expect(SG.dfs.countSolutions(model, p.givens, 2)).toBe(1);
        expect(patternIsSymmetric(model, p.givens, kind)).toBe(true);
        for (var c = 0; c < model.cellCount; c++) {
          if (p.givens[c] !== 0) expect(p.givens[c]).toBe(p.solution[c]);
        }
        expect(p.clues).toBeLessThan(model.cellCount);
      });
    });

    it('a layout whose mirror cells do not exist still digs, symmetric where a partner exists', function () {
      var model = F.models.lShape();
      var p = makePuzzle(model, 3, { symmetry: 'rotational180' });
      expect(SG.dfs.countSolutions(model, p.givens, 2)).toBe(1);
      expect(patternIsSymmetric(model, p.givens, 'rotational180')).toBe(true);
    });
  });

  describe('digger: input checks and budget', function () {
    function digWith(solution, rng, input, options) {
      return function () { SG.digger.dig(model9, input || solution, rng.fork('d'), options); };
    }

    it('rejects a solution that is not valid (digger.invalidSolution)', function () {
      var rng = SG.rng.create(1);
      var solution = SG.fullGrid.generate(model9, rng.fork('g'), null);
      var broken = Int32Array.from(solution);
      broken[0] = solution[1];
      broken[1] = solution[0];
      expectCode(digWith(solution, rng, broken), 'digger.invalidSolution');
      expectCode(digWith(solution, rng, solution.slice(1)), 'digger.invalidSolution');
      expectCode(digWith(solution, rng, new Int32Array(81)), 'digger.invalidSolution');
    });

    it('rejects options it cannot use', function () {
      var rng = SG.rng.create(1);
      var solution = SG.fullGrid.generate(model9, rng.fork('g'), null);
      expectCode(digWith(solution, rng, null, { order: 'zigzag' }), 'digger.invalidOption');
      expectCode(digWith(solution, rng, null, { symmetry: 'weird' }), 'symmetry.unknownKind');
      expectCode(digWith(solution, rng, null, { minClues: -1 }), 'digger.invalidOption');
      expectCode(digWith(solution, rng, null, { minCluesPerUnit: -2 }), 'digger.invalidOption');
      expectCode(digWith(solution, rng, null, { rejected: new Uint8Array(5) }), 'digger.invalidOption');
    });

    it('hands the budget to the solver', function () {
      var checks = 0;
      var counting = { check: function () { checks++; }, tick: function () {} };
      for (var s = 1; s <= 20; s++) makePuzzle(model9, s, { budget: counting });
      expect(checks).toBeGreaterThan(0);
    });

    it('stops with budget.exceeded when the budget runs out', function () {
      var thrown = null;
      try {
        for (var s = 1; s <= 20 && thrown === null; s++) {
          makePuzzle(model9, s, { budget: SG.budget.create({ nodes: 1 }) });
        }
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeTruthy();
      expect(thrown.code).toBe('budget.exceeded');
    });
  });
})();
