// Overlapping multi-grid variants (tasks T-5.7 and T-5.8): samurai, sohei, butterfly and flower.
//
// The geometry, the shared cell indices, the geometry self-check, the overlap-first full grid seed,
// symmetry on the whole canvas, and the common variant criteria CV1-CV6 (CV7 is the locale fragment, CV8 the
// generic variants suite). The default run stays light: a couple of puzzles per level. Set the environment
// variable SG_DEEP=1 (Node) or SG.test.deep = true (browser) for 20 puzzles per level and their hit rates.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var MG = SG.multigrid;

  var DEEP = (typeof process !== 'undefined' && process.env && process.env.SG_DEEP === '1') ||
    SG.test.deep === true;
  var SAMPLES = DEEP ? 20 : 2;
  var SLOW = 120000;

  var IDS = ['samurai', 'sohei', 'butterfly', 'flower'];

  /**
   * What each board must look like, written down independently of the builder. `cells` is the arithmetic
   * unique cell count of the origins: design.md lists 324 for sohei and 225 for flower, but 4 x 81 - 4 x 9 = 288
   * and a 15x15 canvas minus its four empty 3x3 corners = 189 (see the header of js/variants/multigrid.js).
   */
  var BOARDS = {
    samurai: {
      canvas: 21, cells: 369, overlapBoxes: 4,
      origins: [[0, 0], [0, 12], [12, 0], [12, 12], [6, 6]],
      levels: ['veryEasy', 'easy', 'medium', 'hard'], budgets: [3000, 8000, 20000]
    },
    sohei: {
      canvas: 21, cells: 288, overlapBoxes: 4,
      origins: [[0, 6], [6, 0], [6, 12], [12, 6]],
      levels: ['veryEasy', 'easy', 'medium', 'hard'], budgets: [3000, 8000, 20000]
    },
    butterfly: {
      canvas: 12, cells: 144, overlapBoxes: 12,
      origins: [[0, 0], [0, 3], [3, 0], [3, 3]],
      levels: ['veryEasy', 'easy', 'medium', 'hard'], budgets: [1000, 3000, 8000]
    },
    flower: {
      canvas: 15, cells: 189, overlapBoxes: 9,
      origins: [[3, 3], [0, 3], [6, 3], [3, 0], [3, 6]],
      levels: ['veryEasy', 'easy', 'medium', 'hard'], budgets: [3000, 8000, 20000]
    }
  };

  /** Minimum share of exact hits (deep run, default 8 attempts); measured: see the report of T-5.7/T-5.8. */
  var HIT_RATE = { veryEasy: 0.95, easy: 0.95, medium: 0.8, hard: 0.85 };

  var CLASSIC = SG.variants.get('classic9').build({}, null);
  var cache = {};

  function model(id) {
    if (cache[id] === undefined) cache[id] = SG.variants.get(id).build({}, SG.rng.create(1));
    return cache[id];
  }

  function now() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  function expectGeometryError(fn, pattern) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe('multigrid.invalidGeometry');
    expect(thrown.message).toMatch('multigrid.invalidGeometry');
    expect(thrown.message).toMatch(pattern);
    return thrown;
  }

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
  }

  /** Unique cells of a list of origins, counted without any code of the builder. */
  function uniqueCellsOf(origins) {
    var seen = {};
    origins.forEach(function (o) {
      for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) seen[(o[0] + r) + ',' + (o[1] + c)] = true;
    });
    return Object.keys(seen).length;
  }

  function covers(origin, row, col) {
    return row >= origin[0] && row < origin[0] + 9 && col >= origin[1] && col < origin[1] + 9;
  }

  /** In how many sub-grids lies the canvas position (row, col)? */
  function coverage(origins, row, col) {
    return origins.filter(function (o) { return covers(o, row, col); }).length;
  }

  /** Cell of local position (r, c) of grid g, read through the row unit r of that grid. */
  function localCell(m, g, r, c) {
    return m.units[g * 27 + r][c];
  }

  function positionOf(m, cell) {
    return m.layout.cellRow[cell] + ',' + m.layout.cellCol[cell];
  }

  function gridValues(m, values, g) {
    var out = new Int32Array(81);
    for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) out[r * 9 + c] = values[localCell(m, g, r, c)];
    return out;
  }

  /** Are all sub-grids of a board, taken on their own, valid classic 9x9 solutions? */
  function everySubGridValid(m, values) {
    for (var g = 0; g < m.layout.subGrids.length; g++) {
      if (!SG.model.isSolution(CLASSIC, gridValues(m, values, g))) return false;
    }
    return true;
  }

  function clueCount(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] !== 0) n++;
    return n;
  }

  function sharedCells(m) {
    var out = [];
    for (var c = 0; c < m.cellCount; c++) {
      if (coverage(BOARDS[m.variantId].origins, m.layout.cellRow[c], m.layout.cellCol[c]) >= 2) out.push(c);
    }
    return out;
  }

  function setOf(list) {
    var s = {};
    list.forEach(function (x) { s[x] = true; });
    return s;
  }

  // ===========================================================================================
  // Geometry tables
  // ===========================================================================================

  describe('multigrid geometry tables', function () {
    it('lists the four boards of design.md section 5.2 with the origins of the table', function () {
      IDS.forEach(function (id) {
        expect(MG.GEOMETRIES[id].origins).toEqual(BOARDS[id].origins);
        expect(MG.GEOMETRIES[id].rows).toBe(BOARDS[id].canvas);
        expect(MG.GEOMETRIES[id].cols).toBe(BOARDS[id].canvas);
      });
    });

    it('every origin is a multiple of 3 so the overlaps are made of whole boxes', function () {
      IDS.forEach(function (id) {
        MG.GEOMETRIES[id].origins.forEach(function (o) {
          expect(o[0] % 3).toBe(0);
          expect(o[1] % 3).toBe(0);
        });
      });
    });

    it('the expected unique counts are the arithmetic ones: 369, 288, 144 and 189', function () {
      expect(MG.GEOMETRIES.samurai.cells).toBe(369);
      expect(MG.GEOMETRIES.sohei.cells).toBe(288);
      expect(MG.GEOMETRIES.butterfly.cells).toBe(144);
      expect(MG.GEOMETRIES.flower.cells).toBe(189);
      IDS.forEach(function (id) {
        expect(uniqueCellsOf(BOARDS[id].origins)).toBe(BOARDS[id].cells);
        expect(MG.GEOMETRIES[id].cells).toBe(BOARDS[id].cells);
      });
    });

    it('explains the 324 and 225 of design.md: four grids before merging, and the flower canvas area', function () {
      expect(4 * 81).toBe(324);
      expect(4 * 81 - 4 * 9).toBe(288);
      expect(15 * 15).toBe(225);
      expect(15 * 15 - 4 * 9).toBe(189);
    });

    it('the tables cannot be changed by accident', function () {
      expect(Object.isFrozen(MG.GEOMETRIES)).toBe(true);
      IDS.forEach(function (id) {
        expect(Object.isFrozen(MG.GEOMETRIES[id])).toBe(true);
        expect(Object.isFrozen(MG.GEOMETRIES[id].origins)).toBe(true);
      });
      expect(function () { MG.GEOMETRIES.samurai.cells = 1; }).toThrow();
    });
  });

  // ===========================================================================================
  // Per board: registry entry, structure, shared indices
  // ===========================================================================================

  IDS.forEach(function (id) {
    var spec = BOARDS[id];

    describe(id + ': registry and model', function () {
      it('is registered as a multigrid variant with its own levels', function () {
        expect(SG.variants.has(id)).toBe(true);
        var def = SG.variants.get(id);
        expect(def.group).toBe('multigrid');
        expect(def.digits).toBe(9);
        expect(def.i18nKey).toBe('variant.' + id);
        expect(def.difficultySupport).toEqual(SG.difficulty.LEVELS);
        expect(def.symbolModes).toContain(def.defaultSymbolMode);
        expect(def.options).toEqual([]);
        expect(def.fastSeed).toBe(MG.fastSeedOverlaps);
      });

      it('offers every level of the nine, nightmare2 included (measured by tests/qualify.js)', function () {
        expect(SG.variants.get(id).difficultySupport).toEqual(SG.difficulty.LEVELS);
      });

      it('has exactly ' + spec.cells + ' unique cells on a ' + spec.canvas + 'x' + spec.canvas + ' canvas',
        function () {
          var m = model(id);
          expect(m.cellCount).toBe(spec.cells);
          expect(m.layout.rows).toBe(spec.canvas);
          expect(m.layout.cols).toBe(spec.canvas);
          expect(m.digits).toBe(9);
          var seen = {};
          for (var c = 0; c < m.cellCount; c++) seen[positionOf(m, c)] = true;
          expect(Object.keys(seen).length).toBe(spec.cells);
        });

      it('passes SG.model.validate (CV1)', function () {
        var report = SG.model.validate(model(id));
        expect(report.errors).toEqual([]);
        expect(report.ok).toBe(true);
      });

      it('has ' + spec.origins.length + ' sub-grids at the origins of the table', function () {
        var grids = model(id).layout.subGrids;
        expect(grids).toHaveLength(spec.origins.length);
        grids.forEach(function (g, i) {
          expect(g.gridIndex).toBe(i);
          expect([g.originRow, g.originCol]).toEqual(spec.origins[i]);
        });
      });

      it('has 27 units per sub-grid (9 rows, 9 columns, 9 boxes), every one of 9 distinct cells', function () {
        var m = model(id);
        expect(m.units).toHaveLength(27 * spec.origins.length);
        spec.origins.forEach(function (o, g) {
          var kinds = { row: 0, col: 0, box: 0 };
          for (var u = g * 27; u < (g + 1) * 27; u++) {
            expect(m.unitMeta[u].gridIndex).toBe(g);
            kinds[m.unitMeta[u].kind]++;
            expect(m.units[u]).toHaveLength(9);
            expect(Object.keys(setOf(Array.from(m.units[u]))).length).toBe(9);
          }
          expect(kinds).toEqual({ row: 9, col: 9, box: 9 });
        });
      });

      it('every cell belongs to 3 units per sub-grid that covers it', function () {
        var m = model(id);
        for (var c = 0; c < m.cellCount; c++) {
          var grids = coverage(spec.origins, m.layout.cellRow[c], m.layout.cellCol[c]);
          expect(grids).toBeGreaterThan(0);
          expect(m.cellUnits[c]).toHaveLength(3 * grids);
        }
      });

      it('each sub-grid on its own is a valid 9x9 Sudoku: its units are the 27 units of classic9', function () {
        var m = model(id);
        spec.origins.forEach(function (o, g) {
          for (var u = 0; u < 27; u++) {
            var local = Array.from(m.units[g * 27 + u]).map(function (cell) {
              return (m.layout.cellRow[cell] - o[0]) * 9 + (m.layout.cellCol[cell] - o[1]);
            }).sort(function (a, b) { return a - b; });
            expect(local).toEqual(Array.from(CLASSIC.units[u]).sort(function (a, b) { return a - b; }));
          }
        });
      });

      it('cells on one canvas position share ONE index; changing a value through grid A shows in grid B',
        function () {
          var m = model(id);
          var pairs = 0;
          for (var a = 0; a < spec.origins.length; a++) {
            for (var b = a + 1; b < spec.origins.length; b++) {
              var A = spec.origins[a];
              var B = spec.origins[b];
              var values = new Int32Array(m.cellCount);
              for (var r = 0; r < 9; r++) {
                for (var c = 0; c < 9; c++) {
                  var row = A[0] + r;
                  var col = A[1] + c;
                  if (!covers(B, row, col)) continue;
                  var viaA = localCell(m, a, r, c);
                  var viaB = localCell(m, b, row - B[0], col - B[1]);
                  expect(viaB).toBe(viaA);
                  values[viaA] = 7;
                  expect(values[viaB]).toBe(7);
                  pairs++;
                }
              }
            }
          }
          expect(pairs).toBeGreaterThan(0);
        });

      it('a placement made through grid A prunes the units of grid B', function () {
        var m = model(id);
        var done = false;
        for (var a = 0; a < spec.origins.length && !done; a++) {
          for (var b = 0; b < spec.origins.length && !done; b++) {
            if (a === b) continue;
            var A = spec.origins[a];
            var B = spec.origins[b];
            for (var r = 0; r < 9 && !done; r++) {
              for (var c = 0; c < 9 && !done; c++) {
                if (!covers(B, A[0] + r, A[1] + c)) continue;
                var state = SG.model.initState(m);
                var cell = localCell(m, a, r, c);
                expect(SG.constraints.assign(m, state, cell, 5)).toBe(true);
                var rowB = A[0] + r - B[0];
                var colB = A[1] + c - B[1];
                expect(state.value[localCell(m, b, rowB, colB)]).toBe(5);
                for (var k = 0; k < 9; k++) {
                  var other = localCell(m, b, rowB, k);
                  if (other !== cell) expect(state.candidates[other] & 16).toBe(0);
                }
                done = true;
              }
            }
          }
        }
        expect(done).toBe(true);
      });

      it('lists each overlapped 3x3 box once as an overlay, and only the boxes of two or more grids', function () {
        var m = model(id);
        var overlays = m.layout.overlays;
        expect(overlays).toHaveLength(spec.overlapBoxes);
        overlays.forEach(function (o) {
          expect(o.kind).toBe('overlap');
          expect(o.cells).toHaveLength(9);
          for (var i = 0; i < 9; i++) {
            expect(coverage(spec.origins, m.layout.cellRow[o.cells[i]], m.layout.cellCol[o.cells[i]]))
              .toBeGreaterThan(1);
          }
        });
        var inOverlay = {};
        overlays.forEach(function (o) { Array.from(o.cells).forEach(function (c) { inOverlay[c] = true; }); });
        expect(Object.keys(inOverlay).map(Number).sort(function (a, b) { return a - b; }))
          .toEqual(sharedCells(m));
      });

      it('numbers the cells grid by grid: grid 0 owns the indices 0..80 in its own row-major order', function () {
        var m = model(id);
        for (var i = 0; i < 81; i++) {
          expect(m.layout.cellRow[i]).toBe(spec.origins[0][0] + Math.floor(i / 9));
          expect(m.layout.cellCol[i]).toBe(spec.origins[0][1] + (i % 9));
        }
      });

      it('gives every box of every grid one region id: the box slot of the canvas', function () {
        var m = model(id);
        var slotsAcross = spec.canvas / 3;
        for (var c = 0; c < m.cellCount; c++) {
          var slot = Math.floor(m.layout.cellRow[c] / 3) * slotsAcross + Math.floor(m.layout.cellCol[c] / 3);
          expect(m.layout.cellRegion[c]).toBe(slot);
        }
        m.units.forEach(function (cells, u) {
          if (m.unitMeta[u].kind !== 'box') return;
          var regions = setOf(Array.from(cells).map(function (c) { return m.layout.cellRegion[c]; }));
          expect(Object.keys(regions)).toHaveLength(1);
        });
      });

      it('labels cells by the first grid that holds them', function () {
        var m = model(id);
        expect(SG.model.cellLabel(m, 0)).toBe('G1-R1C1');
        var shared = sharedCells(m)[0];
        var label = SG.model.cellLabel(m, shared);
        var first = 0;
        while (!covers(spec.origins[first], m.layout.cellRow[shared], m.layout.cellCol[shared])) first++;
        expect(label.indexOf('G' + (first + 1) + '-R')).toBe(0);
      });

      it('builds the same model every time (the model does not depend on the rng)', function () {
        var a = SG.variants.get(id).build({}, SG.rng.create(1));
        var b = SG.variants.get(id).build({ ignored: true }, SG.rng.create(99));
        expect(Array.from(a.layout.cellRow)).toEqual(Array.from(b.layout.cellRow));
        expect(a.units.map(function (u) { return Array.from(u); }))
          .toEqual(b.units.map(function (u) { return Array.from(u); }));
      });
    });
  });

  // ===========================================================================================
  // The shapes of the four boards
  // ===========================================================================================

  describe('samurai shape', function () {
    var m = model('samurai');
    var O = BOARDS.samurai.origins;

    it('has 5 x 27 = 135 units', function () {
      expect(m.units).toHaveLength(135);
    });

    it('shares exactly four 3x3 boxes: the corners of the centre grid', function () {
      var boxes = m.layout.overlays.map(function (o) {
        var rows = Array.from(o.cells).map(function (c) { return m.layout.cellRow[c]; });
        var cols = Array.from(o.cells).map(function (c) { return m.layout.cellCol[c]; });
        return [Math.min.apply(null, rows), Math.min.apply(null, cols)];
      }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      expect(boxes).toEqual([[6, 6], [6, 12], [12, 6], [12, 12]]);
      expect(sharedCells(m)).toHaveLength(36);
    });

    it('the centre grid shares 9 cells with each corner grid and the corner grids share none', function () {
      var gridsOf = function (cell) {
        return O.map(function (o, g) { return covers(o, m.layout.cellRow[cell], m.layout.cellCol[cell]) ? g : -1; })
          .filter(function (g) { return g >= 0; });
      };
      var withCentre = [0, 0, 0, 0];
      for (var c = 0; c < m.cellCount; c++) {
        var grids = gridsOf(c);
        if (grids.length === 2) {
          expect(grids[1]).toBe(4);
          withCentre[grids[0]]++;
        } else {
          expect(grids).toHaveLength(1);
        }
      }
      expect(withCentre).toEqual([9, 9, 9, 9]);
    });

    it('leaves the 3x12 gaps between the corner grids empty (441 - 369 = 72 holes)', function () {
      var seen = {};
      for (var c = 0; c < m.cellCount; c++) seen[positionOf(m, c)] = true;
      expect(seen['0,9']).toBeUndefined();
      expect(seen['9,0']).toBeUndefined();
      expect(seen['20,11']).toBeUndefined();
      expect(seen['10,10']).toBe(true);
      expect(21 * 21 - m.cellCount).toBe(72);
    });
  });

  describe('sohei shape', function () {
    var m = model('sohei');

    it('has 4 x 27 = 108 units', function () {
      expect(m.units).toHaveLength(108);
    });

    it('is a ring: each grid shares one 3x3 box with each of the two grids beside it', function () {
      var O = BOARDS.sohei.origins;
      var shared = function (a, b) {
        var n = 0;
        for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) {
          if (covers(O[b], O[a][0] + r, O[a][1] + c)) n++;
        }
        return n;
      };
      expect(shared(0, 1)).toBe(9);
      expect(shared(0, 2)).toBe(9);
      expect(shared(1, 3)).toBe(9);
      expect(shared(2, 3)).toBe(9);
      expect(shared(0, 3)).toBe(0);
      expect(shared(1, 2)).toBe(0);
      expect(sharedCells(m)).toHaveLength(36);
    });

    it('has an empty middle: no cell in the 3x3 at the centre of the canvas', function () {
      for (var c = 0; c < m.cellCount; c++) {
        var inMiddle = m.layout.cellRow[c] >= 9 && m.layout.cellRow[c] <= 11 &&
          m.layout.cellCol[c] >= 9 && m.layout.cellCol[c] <= 11;
        expect(inMiddle).toBe(false);
      }
    });
  });

  describe('butterfly shape', function () {
    var m = model('butterfly');

    it('has 4 grids and fills its whole 12x12 canvas', function () {
      expect(m.layout.subGrids).toHaveLength(4);
      expect(m.units).toHaveLength(108);
      expect(m.cellCount).toBe(144);
    });

    it('has the central 6x6 region in all four grids and nowhere else', function () {
      var inAll = [];
      for (var c = 0; c < m.cellCount; c++) {
        if (m.cellUnits[c].length === 12) inAll.push(positionOf(m, c));
      }
      var expected = [];
      for (var r = 3; r <= 8; r++) for (var col = 3; col <= 8; col++) expected.push(r + ',' + col);
      expect(inAll.sort()).toEqual(expected.sort());
      expect(inAll).toHaveLength(36);
    });

    it('shares 12 boxes: 8 by two grids and 4 by all four (Sudopedia: 8 x double, 4 x quadruple)', function () {
      var O = BOARDS.butterfly.origins;
      var tally = { 2: 0, 4: 0 };
      m.layout.overlays.forEach(function (o) {
        var k = coverage(O, m.layout.cellRow[o.cells[0]], m.layout.cellCol[o.cells[0]]);
        tally[k] = (tally[k] || 0) + 1;
      });
      expect(tally).toEqual({ 2: 8, 4: 4 });
    });
  });

  describe('flower shape', function () {
    var m = model('flower');
    var O = BOARDS.flower.origins;

    it('has 5 sub-grids, the first one in the centre, and 5 x 27 = 135 units', function () {
      expect(m.layout.subGrids).toHaveLength(5);
      expect([m.layout.subGrids[0].originRow, m.layout.subGrids[0].originCol]).toEqual([3, 3]);
      expect(m.units).toHaveLength(135);
    });

    it('lets every petal overlap the centre grid in a 6x9 (or 9x6) area of 54 cells', function () {
      for (var p = 1; p <= 4; p++) {
        var n = 0;
        for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) {
          if (covers(O[0], O[p][0] + r, O[p][1] + c)) n++;
        }
        expect(n).toBe(54);
      }
    });

    it('leaves the four 3x3 corners of the 15x15 canvas empty (225 - 36 = 189 cells)', function () {
      var seen = {};
      for (var c = 0; c < m.cellCount; c++) seen[positionOf(m, c)] = true;
      [[0, 0], [0, 12], [12, 0], [12, 12]].forEach(function (corner) {
        for (var r = 0; r < 3; r++) for (var col = 0; col < 3; col++) {
          expect(seen[(corner[0] + r) + ',' + (corner[1] + col)]).toBeUndefined();
        }
      });
      expect(Object.keys(seen)).toHaveLength(189);
    });

    it('shares 9 boxes: 4 by three grids, 4 by four grids and the middle one by all five', function () {
      var tally = {};
      m.layout.overlays.forEach(function (o) {
        var k = coverage(O, m.layout.cellRow[o.cells[0]], m.layout.cellCol[o.cells[0]]);
        tally[k] = (tally[k] || 0) + 1;
      });
      expect(tally).toEqual({ 3: 4, 4: 4, 5: 1 });
    });

    it('has a centre grid that adds no constraint: each of its units equals a unit of a petal', function () {
      var key = function (cells) { return Array.from(cells).sort(function (a, b) { return a - b; }).join(','); };
      var petalUnits = {};
      for (var u = 27; u < m.units.length; u++) petalUnits[key(m.units[u])] = true;
      for (var centre = 0; centre < 27; centre++) expect(petalUnits[key(m.units[centre])]).toBe(true);
    });
  });

  // ===========================================================================================
  // Geometry self-validation
  // ===========================================================================================

  describe('multigrid geometry self-validation', function () {
    function samuraiWith(changes) {
      return Object.assign({}, MG.GEOMETRIES.samurai, changes);
    }

    it('throws a clear error when an origin is not a multiple of 3', function () {
      var bad = samuraiWith({ origins: [[0, 0], [0, 12], [12, 0], [12, 12], [6, 7]] });
      var err = expectGeometryError(function () { MG.buildModel('samurai', bad); }, 'not a multiple of 3');
      expect(err.message).toMatch('samurai');
      expect(err.message).toMatch('(6,7)');
      expect(err.i18nArgs.variantId).toBe('samurai');
      expect(typeof err.i18nArgs.reason).toBe('string');
    });

    it('throws when the unique cell count differs from the table, naming both counts', function () {
      var bad = samuraiWith({ cells: 441 });
      expectGeometryError(function () { MG.buildModel('samurai', bad); }, 'cover 369 unique cells, expected 441');
    });

    it('rejects the unique counts 324 (sohei) and 225 (flower) that design.md lists, with the real ones', function () {
      expectGeometryError(function () {
        MG.buildModel('sohei', Object.assign({}, MG.GEOMETRIES.sohei, { cells: 324 }));
      }, 'cover 288 unique cells, expected 324');
      expectGeometryError(function () {
        MG.buildModel('flower', Object.assign({}, MG.GEOMETRIES.flower, { cells: 225 }));
      }, 'cover 189 unique cells, expected 225');
    });

    // The count alone cannot tell every layout apart (the centre grid of samurai at (6,6), (3,3) and (9,9)
    // all give 369), which is why the origins are also compared with the table above and checked for alignment.
    it('throws when moving one grid of a board changes the count', function () {
      var moved = MG.GEOMETRIES.samurai.origins.map(function (o) { return o.slice(); });
      moved[4] = [9, 0];
      expectGeometryError(function () { MG.buildModel('samurai', samuraiWith({ origins: moved })); },
        /cover 351 unique cells, expected 369/);
    });

    it('throws when a sub-grid does not fit on the canvas', function () {
      var bad = samuraiWith({ rows: 18, cols: 18 });
      expectGeometryError(function () { MG.buildModel('samurai', bad); }, 'does not fit');
      expectGeometryError(function () {
        MG.buildModel('x', { rows: 9, cols: 9, cells: 81, origins: [[-3, 0]] });
      }, /not a multiple|does not fit/);
    });

    it('throws for a canvas that is not a multiple of 3, a repeated origin and an empty origin list', function () {
      expectGeometryError(function () { MG.buildModel('x', samuraiWith({ rows: 20 })); }, 'canvas 20x21');
      expectGeometryError(function () {
        MG.buildModel('x', { rows: 9, cols: 9, cells: 81, origins: [[0, 0], [0, 0]] });
      }, 'listed twice');
      expectGeometryError(function () {
        MG.buildModel('x', { rows: 9, cols: 9, cells: 0, origins: [] });
      }, 'at least one sub-grid');
    });

    it('throws for a missing or malformed geometry instead of building something', function () {
      expectGeometryError(function () { MG.buildModel('nonexistent'); }, 'geometry is missing');
      expectGeometryError(function () {
        MG.buildModel('x', { rows: 9, cols: 9, cells: 81, origins: [[0]] });
      }, 'pair');
      expectGeometryError(function () {
        MG.buildModel('x', { rows: 9, cols: 9, cells: 81, origins: [[0.5, 0]] });
      }, 'multiple of 3');
    });

    it('MG.measure reports the coverage of each canvas position', function () {
      var measured = MG.measure('butterfly', MG.GEOMETRIES.butterfly);
      expect(measured.cells).toBe(144);
      expect(measured.coverage[4 * 12 + 4]).toBe(4);
      expect(measured.coverage[0]).toBe(1);
    });

    it('builds and validates any other well-formed geometry (here a 9x15 two-grid board)', function () {
      var geometry = { rows: 9, cols: 15, cells: 2 * 81 - 27, origins: [[0, 0], [0, 6]] };
      var m = MG.buildModel('twoGrids', geometry);
      expect(m.cellCount).toBe(135);
      expect(m.units).toHaveLength(54);
      expect(SG.model.validate(m).ok).toBe(true);
      var grid = SG.fullGrid.generate(m, SG.rng.create(5), null, {});
      expect(SG.model.isSolution(m, grid)).toBe(true);
      expect(everySubGridValid(m, grid)).toBe(true);
    });

    it('loading the file twice registers nothing twice and adds no second locale fragment', function () {
      var env = SG.test.node;
      if (!env || !env.fs) SG.test.skip('needs the Node file system');
      var before = SG.variants.list().length;
      var fragments = SG.localeFragments.length;
      var saved = SG.multigrid;
      var file = env.path.join(env.root, 'js/variants/multigrid.js');
      try {
        env.vm.runInThisContext(env.fs.readFileSync(file, 'utf8'), { filename: file });
      } finally {
        SG.multigrid = saved;
      }
      expect(SG.variants.list().length).toBe(before);
      expect(SG.localeFragments.length).toBe(fragments);
    });
  });

  // ===========================================================================================
  // Locale fragment (CV7)
  // ===========================================================================================

  describe('multigrid locale fragment', function () {
    function fragment() {
      return SG.localeFragments.filter(function (f) { return f.en && f.en['variant.samurai'] !== undefined; })[0];
    }

    function placeholders(text) {
      return (text.match(/\{[A-Za-z0-9_]+\}/g) || []).sort();
    }

    it('is published once in SG.localeFragments with an en and a vi pack', function () {
      var found = SG.localeFragments.filter(function (f) {
        return f.en && f.en['variant.samurai'] !== undefined;
      });
      expect(found).toHaveLength(1);
      expect(typeof fragment().en).toBe('object');
      expect(typeof fragment().vi).toBe('object');
    });

    it('carries identical key sets in both languages, none of them empty', function () {
      var f = fragment();
      expect(Object.keys(f.vi).sort()).toEqual(Object.keys(f.en).sort());
      Object.keys(f.en).forEach(function (key) {
        expect(typeof f.en[key]).toBe('string');
        expect(f.en[key].trim()).not.toBe('');
        expect(f.vi[key].trim()).not.toBe('');
      });
    });

    it('names every variant and describes it', function () {
      var f = fragment();
      IDS.forEach(function (id) {
        var def = SG.variants.get(id);
        expect(f.en[def.i18nKey]).toBeDefined();
        expect(f.vi[def.i18nKey]).toBeDefined();
        expect(f.en[def.i18nKey + '.desc']).toBeDefined();
        expect(f.vi[def.i18nKey + '.desc']).toBeDefined();
      });
      expect(f.en['variant.samurai']).toBe('Samurai Sudoku');
      expect(f.vi['variant.butterfly']).toBe('Sudoku Cánh bướm');
      expect(f.vi['variant.flower']).toBe('Sudoku Bông hoa');
    });

    it('translates the geometry error code of the builder, with the same placeholders in both languages',
      function () {
        var f = fragment();
        var key = 'error.multigrid.invalidGeometry';
        expect(f.en[key]).toBeDefined();
        expect(placeholders(f.vi[key])).toEqual(placeholders(f.en[key]));
        expect(placeholders(f.en[key])).toEqual(['{reason}', '{variantId}']);
      });

    it('has no vi text that is just the English text', function () {
      var f = fragment();
      Object.keys(f.en).forEach(function (key) { expect(f.vi[key]).not.toBe(f.en[key]); });
    });
  });

  // ===========================================================================================
  // Full grid (CV2) and the overlap-first seed
  // ===========================================================================================

  describe('multigrid full grids', function () {
    IDS.forEach(function (id) {
      it(id + ': 50 seeds give a valid grid, and every sub-grid is a valid 9x9 solution (CV2)', function () {
        var m = model(id);
        var distinct = {};
        for (var seed = 1; seed <= 50; seed++) {
          var grid = SG.fullGrid.generate(m, SG.rng.create(seed), null, {});
          expect(SG.model.isSolution(m, grid)).toBe(true);
          expect(everySubGridValid(m, grid)).toBe(true);
          distinct[Array.from(grid).join('')] = true;
        }
        expect(Object.keys(distinct).length).toBeGreaterThan(45);
      }, SLOW);

      it(id + ': the same seed gives the same grid', function () {
        var m = model(id);
        var a = SG.fullGrid.generate(m, SG.rng.create(77), null, {});
        var b = SG.fullGrid.generate(m, SG.rng.create(77), null, {});
        expect(Array.from(a)).toEqual(Array.from(b));
      });

      it(id + ': a cancelled or exhausted budget stops the search of the generator', function () {
        var m = model(id);
        // Without the seed the search always needs more than 3 nodes. (With the seed a tiny board can be
        // finished by propagation alone, before the search asks the budget anything.)
        var cancelled = SG.budget.create();
        cancelled.cancel();
        expectCode(function () {
          SG.fullGrid.generate(m, SG.rng.create(1), cancelled, { fastSeed: false });
        }, 'budget.cancelled');
        expectCode(function () {
          SG.fullGrid.generate(m, SG.rng.create(1), SG.budget.create({ nodes: 3 }), { fastSeed: false });
        }, 'budget.exceeded');
      });
    });
  });

  describe('multigrid overlap-first seed (fastSeed)', function () {
    function propagated(m) {
      var state = SG.model.initState(m);
      expect(SG.constraints.propagate(m, state)).toBe(true);
      return state;
    }

    IDS.forEach(function (id) {
      it(id + ': decides every shared cell, and what it decides stays consistent', function () {
        var m = model(id);
        var shared = sharedCells(m);
        var seeded = 0;
        for (var seed = 1; seed <= 20; seed++) {
          var state = propagated(m);
          if (!MG.fastSeedOverlaps(m, state, SG.rng.create(seed))) continue;
          seeded++;
          shared.forEach(function (c) { expect(state.value[c]).not.toBe(0); });
          expect(SG.constraints.propagate(m, state)).toBe(true);
        }
        expect(seeded).toBeGreaterThan(10);
      });

      it(id + ': is deterministic for a given rng', function () {
        var m = model(id);
        var a = propagated(m);
        var b = propagated(m);
        expect(MG.fastSeedOverlaps(m, a, SG.rng.create(4))).toBe(MG.fastSeedOverlaps(m, b, SG.rng.create(4)));
        expect(Array.from(a.value)).toEqual(Array.from(b.value));
      });

      it(id + ': the generator uses it for nearly every grid', function () {
        var m = model(id);
        var used = 0;
        for (var seed = 1; seed <= 30; seed++) {
          var stats = {};
          SG.fullGrid.generate(m, SG.rng.create(seed), null, { stats: stats });
          if (stats.fastSeed) used++;
        }
        expect(used).toBeGreaterThanOrEqual(15);
      });
    });

    function backtracks(m, useSeed, count) {
      var total = 0;
      for (var seed = 1; seed <= count; seed++) {
        var stats = {};
        SG.fullGrid.generate(m, SG.rng.create(seed), null, { stats: stats, fastSeed: useSeed });
        total += stats.backtracks;
      }
      return total;
    }

    it('cuts the backtracking of flower by far more than half (measured: about 20x)', function () {
      var m = model('flower');
      var without = backtracks(m, false, 100);
      var withSeed = backtracks(m, true, 100);
      expect(without).toBeGreaterThan(1000);
      expect(withSeed * 2).toBeLessThan(without);
    });

    it('cuts the backtracking of butterfly (measured: about 3x)', function () {
      var m = model('butterfly');
      expect(backtracks(m, true, 100)).toBeLessThan(backtracks(m, false, 100));
    });

    it('is harmless on samurai and sohei, which the plain search already solves without backtracking',
      function () {
        ['samurai', 'sohei'].forEach(function (id) {
          expect(backtracks(model(id), true, 50)).toBeLessThan(50);
        });
      });

    it('is a no-op on a model without overlaps', function () {
      var state = SG.model.initState(CLASSIC);
      expect(MG.fastSeedOverlaps(CLASSIC, state, SG.rng.create(1))).toBe(true);
      expect(state.unsolvedCount).toBe(81);
    });
  });

  // ===========================================================================================
  // Symmetry about the centre of the whole canvas
  // ===========================================================================================

  describe('multigrid symmetry', function () {
    function canvasMirror(m) {
      var at = {};
      for (var c = 0; c < m.cellCount; c++) at[positionOf(m, c)] = c;
      return function (cell) {
        var key = (m.layout.rows - 1 - m.layout.cellRow[cell]) + ',' + (m.layout.cols - 1 - m.layout.cellCol[cell]);
        return at[key];
      };
    }

    IDS.forEach(function (id) {
      it(id + ': rotational180 pairs every cell with its mirror about the centre of the canvas', function () {
        var m = model(id);
        var mirror = canvasMirror(m);
        var groups = SG.symmetry.groups(m, 'rotational180');
        var total = 0;
        var singles = 0;
        groups.forEach(function (g) {
          total += g.length;
          if (g.length === 1) {
            singles++;
            expect(mirror(g[0])).toBe(g[0]);
          } else {
            expect(g).toHaveLength(2);
            expect(mirror(g[0])).toBe(g[1]);
          }
        });
        expect(total).toBe(m.cellCount);
        // Only a cell on the exact centre of an odd canvas lies on its own mirror position.
        var centre = ((m.layout.rows - 1) / 2) + ',' + ((m.layout.cols - 1) / 2);
        var hasCentreCell = false;
        for (var c = 0; c < m.cellCount; c++) if (positionOf(m, c) === centre) hasCentreCell = true;
        expect(singles).toBe(hasCentreCell ? 1 : 0);
      });

      it(id + ': the board itself is symmetric, so no cell loses its mirror cell', function () {
        var m = model(id);
        var mirror = canvasMirror(m);
        for (var c = 0; c < m.cellCount; c++) expect(mirror(c)).toBeDefined();
      });
    });

    it('mirrors across grids: the top-left corner of samurai pairs with the bottom-right corner', function () {
      var m = model('samurai');
      var groups = SG.symmetry.groups(m, 'rotational180');
      var group = groups.filter(function (g) { return g.indexOf(0) !== -1; })[0];
      expect(group).toHaveLength(2);
      expect(positionOf(m, group[1])).toBe('20,20');
      var gridOfLast = m.layout.subGrids.filter(function (g) {
        return covers([g.originRow, g.originCol], 20, 20);
      });
      expect(gridOfLast).toHaveLength(1);
      expect(gridOfLast[0].gridIndex).toBe(3);
    });

    it('works with the symmetries of a square canvas too (mirrorBoth, diagonal) without losing a cell', function () {
      IDS.forEach(function (id) {
        var m = model(id);
        ['mirrorH', 'mirrorV', 'mirrorBoth', 'rotational90', 'diagonal', 'antiDiagonal'].forEach(function (kind) {
          var total = 0;
          SG.symmetry.groups(m, kind).forEach(function (g) { total += g.length; });
          expect(total).toBe(m.cellCount);
        });
      });
    });

    it('a group shrinks, it does not fail, where the mirrored position holds no cell', function () {
      // Two grids along the diagonal of a 12x12 canvas: the top-right and bottom-left corners are empty.
      var m = MG.buildModel('diagonalPair', { rows: 12, cols: 12, cells: 126, origins: [[0, 0], [3, 3]] });
      var groups = SG.symmetry.groups(m, 'mirrorV');
      var first = groups.filter(function (g) { return g.indexOf(0) !== -1; })[0];
      expect(first).toHaveLength(1);
      var total = 0;
      groups.forEach(function (g) { total += g.length; });
      expect(total).toBe(126);
      expect(SG.symmetry.groups(m, 'rotational180').every(function (g) { return g.length === 2; })).toBe(true);
    });
  });

  // ===========================================================================================
  // Puzzles (CV3, CV4, CV5, CV6)
  // ===========================================================================================

  describe('multigrid puzzles', function () {
    var BUDGET_OF = { veryEasy: 0, easy: 1, medium: 1, hard: 2 };

    function generate(id, level, seed, extra) {
      var budget = SG.budget.create({ ms: 60000 });
      var started = now();
      var result = SG.pipeline.run(Object.assign({ variantId: id, difficulty: level, seed: seed, trace: 'off' },
        extra), null, budget);
      return { result: result, ms: now() - started };
    }

    /** Invariants I1-I3, I5, I6 and the soundness (I7) of the logical solver on this puzzle. */
    function checkInvariants(id, level, result) {
      var m = result.model;
      var spec = SG.difficulty.spec(level, m);
      expect(m.variantId).toBe(id);
      expect(SG.dfs.countSolutions(m, result.givens, 2)).toBe(1);
      expect(SG.model.isSolution(m, result.solution)).toBe(true);
      expect(everySubGridValid(m, result.solution)).toBe(true);
      for (var c = 0; c < m.cellCount; c++) {
        if (result.givens[c] !== 0) expect(result.givens[c]).toBe(result.solution[c]);
      }
      expect(clueCount(result.givens)).toBeGreaterThanOrEqual(spec.minClues);
      if (result.rating.level === level) {
        expect(result.rating.score).toBeGreaterThanOrEqual(spec.min);
        expect(result.rating.score).toBeLessThan(spec.max);
      } else {
        expect(result.warnings).toContain('difficulty.approximate');
      }
      var report = SG.logicalSolver.solve(m, result.givens, {
        allowedTechniques: spec.allowedTechniques, collectSteps: true, assumeUniqueness: false
      });
      report.steps.forEach(function (step) {
        step.placements.forEach(function (p) { expect(result.solution[p[0]]).toBe(p[1]); });
        step.eliminations.forEach(function (e) { expect(result.solution[e[0]]).not.toBe(e[1]); });
      });
    }

    IDS.forEach(function (id) {
      var spec = BOARDS[id];

      spec.levels.forEach(function (level) {
        it(id + ' ' + level + ': ' + SAMPLES + ' puzzles are unique, valid and inside the §9.1 time budget',
          function () {
            var limit = SG.test.timeLimit(spec.budgets[BUDGET_OF[level]]);
            for (var seed = 1; seed <= SAMPLES; seed++) {
              var out = generate(id, level, seed);
              checkInvariants(id, level, out.result);
              expect(out.ms).toBeLessThan(limit);
            }
          }, SLOW);

        it(id + ' ' + level + ': the same seed gives the same puzzle (CV5)', function () {
          var a = generate(id, level, 3).result;
          var b = generate(id, level, 3).result;
          expect(Array.from(a.givens)).toEqual(Array.from(b.givens));
          expect(Array.from(a.solution)).toEqual(Array.from(b.solution));
          if (level === 'veryEasy') {
            var c = generate(id, level, 4).result;
            expect(Array.from(c.solution)).not.toEqual(Array.from(a.solution));
          }
        }, SLOW);
      });

      it(id + ': the clues are symmetric about the centre of the whole canvas', function () {
        var out = generate(id, 'veryEasy', 5).result;
        var m = out.model;
        var at = {};
        for (var c = 0; c < m.cellCount; c++) at[positionOf(m, c)] = c;
        for (var cell = 0; cell < m.cellCount; cell++) {
          var other = at[(m.layout.rows - 1 - m.layout.cellRow[cell]) + ',' + (m.layout.cols - 1 - m.layout.cellCol[cell])];
          expect(out.givens[cell] !== 0).toBe(out.givens[other] !== 0);
        }
      }, SLOW);

      it(id + ': a budget that is too small or already cancelled stops the pipeline', function () {
        var cfg = { variantId: id, difficulty: 'veryEasy', seed: 1, trace: 'off' };
        expectCode(function () { SG.pipeline.run(cfg, null, SG.budget.create({ nodes: 2 })); },
          'budget.exceeded');
        var cancelled = SG.budget.create();
        cancelled.cancel();
        expectCode(function () { SG.pipeline.run(cfg, null, cancelled); }, 'budget.cancelled');
      });

      it(id + ': refuses a level that does not exist', function () {
        ['nightmare', 'nightmare3', 'impossible'].forEach(function (level) {
          expectCode(function () {
            SG.pipeline.run({ variantId: id, difficulty: level, seed: 1, trace: 'off' }, null);
          }, 'difficulty.unknownLevel');
        });
      });
    });

    it('every board offers all nine levels, flower included (its own clue floor makes medium reachable)',
      function () {
        IDS.forEach(function (id) {
          expect(SG.variants.get(id).difficultySupport).toEqual(SG.difficulty.LEVELS);
        });
      });

    it('every board scales the derived clue floor of medium and hard down (flower easy too); ' +
      'veryEasy keeps it',
      function () {
        var factors = { samurai: { medium: 0.6, hard: 0.6 }, sohei: { medium: 0.6, hard: 0.6 },
          butterfly: { medium: 0.6, hard: 0.6 }, flower: { easy: 0.8, medium: 0.6, hard: 0.6 } };
        var floors = {};
        IDS.forEach(function (id) {
          var board = model(id);
          floors[id] = [];
          ['veryEasy', 'easy', 'medium', 'hard'].forEach(function (level) {
            var row = SG.difficulty.TABLE[SG.difficulty.levelIndex(level)];
            var derived = Math.max(1, Math.floor(row.minClues * board.cellCount / 81));
            var factor = factors[id][level] === undefined ? 1 : factors[id][level];
            var spec = SG.difficulty.spec(level, board);
            expect(spec.minClues).toBe(Math.max(1, Math.floor(Math.round(derived * factor * 1e6) / 1e6)));
            floors[id].push(spec.minClues);
          });
          // Whatever the factors, the floors still fall with the level.
          for (var i = 1; i < floors[id].length; i++) expect(floors[id][i]).toBeLessThan(floors[id][i - 1]);
        });
        // The floor of flower's easy level is the same 80% as before the calibration of the other levels.
        expect(floors.flower[1]).toBe(Math.floor(Math.floor(34 * 189 / 81) * 0.8));
      });

    describe('the step trace', function () {
      function replayed(id) {
        var events = [];
        var result = SG.pipeline.run({ variantId: id, difficulty: 'veryEasy', seed: 2, trace: 'full' },
          function (e) { events.push(e); });
        var view = SG.events.createView(result.model.cellCount);
        events.forEach(function (e) { if (e.patch) SG.events.applyPatch(view, e.patch); });
        return { result: result, view: view, events: events };
      }

      ['sohei', 'butterfly', 'flower'].forEach(function (id) {
        it(id + ': a full trace replays to exactly the puzzle', function () {
          var out = replayed(id);
          expect(out.result.warnings).not.toContain('trace.downgraded');
          expect(Array.from(out.view.value)).toEqual(Array.from(out.result.givens));
        }, SLOW);
      });

      it('samurai (369 cells) downgrades a full trace to a summary and says so', function () {
        var out = replayed('samurai');
        expect(out.result.warnings).toContain('trace.downgraded');
        expect(out.result.config.trace).toBe('summary');
      }, SLOW);
    });

    describe('the buildModel step reports the board', function () {
      it('tells the size of the canvas and the number of cells and units', function () {
        var events = [];
        SG.pipeline.run({ variantId: 'samurai', difficulty: 'veryEasy', seed: 1, trace: 'summary' },
          function (e) { events.push(e); });
        var built = events.filter(function (e) { return e.i18nKey === 'buildModel.model'; })[0];
        expect(built.i18nArgs.cellCount).toBe(369);
        expect(built.i18nArgs.rows).toBe(21);
        expect(built.i18nArgs.cols).toBe(21);
        expect(built.i18nArgs.units).toBe(135);
      });
    });
  });

  // ===========================================================================================
  // Deep run (CV3 at full size): SG_DEEP=1
  // ===========================================================================================

  if (DEEP) {
    describe('multigrid deep run: 20 puzzles per level (SG_DEEP=1)', function () {
      IDS.forEach(function (id) {
        BOARDS[id].levels.forEach(function (level) {
          it(id + ' ' + level + ': 20 seeds, hit rate and p95 time against §9.1', function () {
            var exact = 0;
            var times = [];
            for (var seed = 1; seed <= 20; seed++) {
              var started = now();
              var result = SG.pipeline.run({ variantId: id, difficulty: level, seed: seed, trace: 'off' }, null,
                SG.budget.create({ ms: 120000 }));
              times.push(now() - started);
              if (result.rating.level === level) exact++;
              expect(SG.dfs.countSolutions(result.model, result.givens, 2)).toBe(1);
            }
            times.sort(function (a, b) { return a - b; });
            var index = { veryEasy: 0, easy: 1, medium: 1, hard: 2 }[level];
            expect(times[18]).toBeLessThan(SG.test.timeLimit(BOARDS[id].budgets[index]));
            expect(exact / 20).toBeGreaterThanOrEqual(HIT_RATE[level]);
          }, 600000);
        });
      });
    });
  }
})();
