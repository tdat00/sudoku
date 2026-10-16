// Extra-region variants (task T-5.2): `diagonalX` (29 units) and `hyper` (31 units), their hybrid (33 units),
// and the common variant criteria CV1-CV9 of task.md phase P5. The board geometry is compared with an
// independent oracle written from coordinates alone (rows, columns, boxes, r == c, r + c == 8, the four
// windows), every generated puzzle is checked against it, and the claim of the task card is measured: a
// puzzle of these variants is not a classic puzzle in disguise, its extra units are needed for uniqueness.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var E = SG.events;
  var X = SG.extraRegions;

  var LEVELS = ['veryEasy', 'easy', 'medium', 'hard', 'expert', 'evil'];
  /** design.md 9.1, diagonalX / hyper row, p95 in ms. 'easy' has no column there and takes the next one. */
  var BUDGET_MS = { veryEasy: 80, easy: 200, medium: 200, hard: 500, expert: 1200, evil: 3000 };
  var PUZZLES_PER_LEVEL = 20;
  var HYBRID_PER_LEVEL = 8;
  /** The task card: dropping the extra units must leave several solutions for at least this share. */
  var NEEDED_SHARE = 0.7;
  var WINDOW_CORNERS = [[1, 1], [1, 5], [5, 1], [5, 5]];

  /** The four board configurations: which variant is asked, with which option, and what rules result. */
  var CONFIGS = [
    { name: 'diagonalX', variantId: 'diagonalX', options: {}, diag: true, hyper: false, units: 29 },
    { name: 'hyper', variantId: 'hyper', options: {}, diag: false, hyper: true, units: 31 },
    { name: 'diagonalX + withHyper', variantId: 'diagonalX', options: { withHyper: true },
      diag: true, hyper: true, units: 33 },
    { name: 'hyper + withDiagonals', variantId: 'hyper', options: { withDiagonals: true },
      diag: true, hyper: true, units: 33 }
  ];

  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  /** Fails with a message that names the puzzle, which a bare expect() would not. */
  function check(ok, message) {
    if (!ok) throw new Error(message);
  }

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
    return thrown;
  }

  /** Nearest-rank percentile: the p95 of 20 runs is the 19th of them. */
  function percentile(values, p) {
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
  }

  function clueCount(givens) {
    var k = 0;
    for (var c = 0; c < givens.length; c++) if (givens[c] !== 0) k++;
    return k;
  }

  function sorted(list) {
    return Array.from(list).sort(function (a, b) { return a - b; });
  }

  // ---------------------------------------------------------------------------------------------
  // The oracle: the rules of the boards, from coordinates only
  // ---------------------------------------------------------------------------------------------

  function row(c) { return Math.floor(c / 9); }
  function col(c) { return c % 9; }
  function box(c) { return Math.floor(row(c) / 3) * 3 + Math.floor(col(c) / 3); }

  /** Number 0..3 of the hyper window that holds the cell, -1 for a cell outside every window. */
  function windowOf(c) {
    var r = row(c);
    var k = col(c);
    var wr = r >= 1 && r <= 3 ? 0 : (r >= 5 && r <= 7 ? 1 : -1);
    var wc = k >= 1 && k <= 3 ? 0 : (k >= 5 && k <= 7 ? 1 : -1);
    return wr === -1 || wc === -1 ? -1 : wr * 2 + wc;
  }

  /** Must the two different cells hold different digits on a board with these rules? */
  function related(a, b, cfg) {
    if (row(a) === row(b) || col(a) === col(b) || box(a) === box(b)) return true;
    if (cfg.diag) {
      if (row(a) === col(a) && row(b) === col(b)) return true;
      if (row(a) + col(a) === 8 && row(b) + col(b) === 8) return true;
    }
    return cfg.hyper && windowOf(a) !== -1 && windowOf(a) === windowOf(b);
  }

  /** The groups of nine cells that hold 1..9 once each, listed by coordinates. */
  function groupsFor(cfg) {
    var groups = [];
    var r;
    var c;
    var i;
    var j;
    for (i = 0; i < 9; i++) {
      var line = [];
      var column = [];
      var boxCells = [];
      for (j = 0; j < 9; j++) {
        line.push(i * 9 + j);
        column.push(j * 9 + i);
        boxCells.push((Math.floor(i / 3) * 3 + Math.floor(j / 3)) * 9 + (i % 3) * 3 + (j % 3));
      }
      groups.push(line, column, boxCells);
    }
    if (cfg.diag) {
      var main = [];
      var anti = [];
      for (i = 0; i < 9; i++) {
        main.push(i * 9 + i);
        anti.push(i * 9 + 8 - i);
      }
      groups.push(main, anti);
    }
    if (cfg.hyper) {
      WINDOW_CORNERS.forEach(function (corner) {
        var cells = [];
        for (r = 0; r < 3; r++) for (c = 0; c < 3; c++) cells.push((corner[0] + r) * 9 + corner[1] + c);
        groups.push(cells);
      });
    }
    return groups;
  }

  /** Does the full grid hold 1..9 exactly once in every group of the rules? */
  function gridSatisfies(grid, cfg) {
    return groupsFor(cfg).every(function (cells) {
      var seen = 0;
      cells.forEach(function (cell) { seen |= 1 << (grid[cell] - 1); });
      return seen === 511;
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Builders and shared puzzles (generated once, on first use)
  // ---------------------------------------------------------------------------------------------

  function build(cfg) {
    return SG.variants.get(cfg.variantId).build(cfg.options, SG.rng.create(1));
  }

  /** I1-I3 of a result: a unique solution, givens inside it, and every rule of the board obeyed. */
  function checkInvariants(p, cfg, tag) {
    check(SG.dfs.countSolutions(p.model, p.givens, 2) === 1, tag + ' has no unique solution');
    for (var c = 0; c < 81; c++) {
      check(p.givens[c] === 0 || p.givens[c] === p.solution[c], tag + ': a given is not in the solution');
    }
    check(SG.model.isSolution(p.model, p.solution), tag + ': the solution breaks a unit of the model');
    check(gridSatisfies(p.solution, cfg), tag + ': the solution breaks a rule of the board');
    check(p.model.units.length === cfg.units, tag + ': the model has ' + p.model.units.length + ' units');
  }

  var classicModel = SG.variants.get('classic9').build({}, null);

  function generate(variantId, level, seed, extra) {
    var cfg = Object.assign({ variantId: variantId, difficulty: level, seed: seed, trace: 'summary' }, extra);
    var t0 = now();
    var result = SG.pipeline.run(cfg, function () {});
    result.elapsedMs = now() - t0;
    return result;
  }

  var VARIANT_CONFIGS = { diagonalX: CONFIGS[0], hyper: CONFIGS[1] };
  var VARIANT_IDS = ['diagonalX', 'hyper'];

  function seedOf(variantIndex, levelIndex, i) { return 10000 * (variantIndex + 1) + 100 * levelIndex + i; }

  var runCache = null;
  /** runCache[variantId][level] = 20 results, the puzzles of CV3. */
  function puzzleRun() {
    if (runCache === null) {
      runCache = {};
      VARIANT_IDS.forEach(function (id, vi) {
        runCache[id] = {};
        LEVELS.forEach(function (level, li) {
          runCache[id][level] = [];
          for (var i = 0; i < PUZZLES_PER_LEVEL; i++) {
            runCache[id][level].push(generate(id, level, seedOf(vi, li, i)));
          }
        });
      });
    }
    return runCache;
  }

  function allPuzzles(variantId) {
    var out = [];
    LEVELS.forEach(function (level) { out = out.concat(puzzleRun()[variantId][level]); });
    return out;
  }

  var hybridCache = null;
  /** The hybrid board, asked through both variants alternately. */
  function hybridRun() {
    if (hybridCache === null) {
      hybridCache = [];
      LEVELS.forEach(function (level, li) {
        for (var i = 0; i < HYBRID_PER_LEVEL; i++) {
          var viaHyper = i % 2 === 1;
          hybridCache.push(generate(viaHyper ? 'hyper' : 'diagonalX', level, 50000 + 100 * li + i, {
            variantOptions: viaHyper ? { withDiagonals: true } : { withHyper: true }
          }));
        }
      });
    }
    return hybridCache;
  }

  /** How many of the results have more than one solution on a board with the rows, columns and boxes only. */
  function countNeedingExtras(results) {
    var needing = 0;
    results.forEach(function (p) {
      if (SG.dfs.countSolutions(classicModel, p.givens, 2) > 1) needing++;
    });
    return needing;
  }

  // ---------------------------------------------------------------------------------------------
  // The definitions
  // ---------------------------------------------------------------------------------------------

  describe('extraRegions: variant definitions (design.md 5.3 / 13.8)', function () {
    it('registers diagonalX and hyper with the fields of the contract', function () {
      VARIANT_IDS.forEach(function (id) {
        expect(SG.variants.has(id)).toBe(true);
        var def = SG.variants.get(id);
        expect(def.id).toBe(id);
        expect(def.i18nKey).toBe('variant.' + id);
        expect(def.group).toBe('extraRegions');
        expect(def.digits).toBe(9);
        expect(def.defaultSymbolMode).toBe('digits');
        expect(def.symbolModes).toContain(def.defaultSymbolMode);
        expect(typeof def.build).toBe('function');
        expect(SG.variants.list().filter(function (d) { return d.id === id; })).toHaveLength(1);
      });
    });

    it('supports every difficulty level, evil included (the design.md 9.1 table has a budget for it)',
      function () {
        VARIANT_IDS.forEach(function (id) {
          expect(SG.variants.get(id).difficultySupport).toEqual(LEVELS);
        });
      });

    it('needs no hooks: it digs cells like classic9 and has no structure to add after the grid', function () {
      VARIANT_IDS.forEach(function (id) {
        var def = SG.variants.get(id);
        expect(def.postGenerate).toBeUndefined();
        expect(def.digStrategy).toBeUndefined();
      });
    });

    it('describes the combining option as a boolean, default off, advanced, with two strings', function () {
      var expected = { diagonalX: 'withHyper', hyper: 'withDiagonals' };
      VARIANT_IDS.forEach(function (id) {
        var options = SG.variants.get(id).options;
        expect(options).toHaveLength(1);
        var option = options[0];
        expect(option.id).toBe(expected[id]);
        expect(option.type).toBe('boolean');
        expect(option.default).toBe(false);
        expect(option.advanced).toBe(true);
        expect(option.i18nKey).toBe('variant.' + id + '.' + expected[id]);
        expect(option.hintKey).toBe(option.i18nKey + '.hint');
      });
    });

    it('exports the window corners of design.md 8.7', function () {
      expect(X.WINDOW_ORIGINS.map(function (o) { return Array.from(o); })).toEqual(WINDOW_CORNERS);
      expect(X.KIND_DIAG).toBe('diag');
      expect(X.KIND_WINDOW).toBe('window');
    });

    it('does not register a second time when the file is loaded again', function () {
      var before = SG.variants.list().length;
      var fragments = SG.localeFragments.length;
      var path = SG.test.node && SG.test.node.path;
      if (!path) SG.test.skip('needs the Node file system; skipped in the browser');
      var file = path.join(SG.test.node.root, 'js/variants/extra-regions.js');
      SG.test.node.vm.runInThisContext(SG.test.node.fs.readFileSync(file, 'utf8'), { filename: file });
      expect(SG.variants.list().length).toBe(before);
      expect(SG.localeFragments.length).toBe(fragments);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV1: the model
  // ---------------------------------------------------------------------------------------------

  describe('extraRegions: model structure (CV1, T-5.2)', function () {
    it('diagonalX has exactly 29 units, hyper exactly 31, and the hybrid 33', function () {
      expect(SG.variants.get('diagonalX').build({}, null).units).toHaveLength(29);
      expect(SG.variants.get('hyper').build({}, null).units).toHaveLength(31);
      expect(SG.variants.get('diagonalX').build({ withHyper: true }, null).units).toHaveLength(33);
      expect(SG.variants.get('hyper').build({ withDiagonals: true }, null).units).toHaveLength(33);
    });

    CONFIGS.forEach(function (cfg) {
      describe(cfg.name + ' (' + cfg.units + ' units)', function () {
        var model = build(cfg);

        it('passes SG.model.validate (V1-V8) with no warning: V8 finds a solution', function () {
          var report = SG.model.validate(model);
          expect(report.errors).toEqual([]);
          expect(report.ok).toBe(true);
          expect(report.warnings).toEqual([]);
        });

        it('is a 9x9 board of 81 cells with the id of the variant that was asked', function () {
          expect(model.variantId).toBe(cfg.variantId);
          expect(model.cellCount).toBe(81);
          expect(model.digits).toBe(9);
          expect(model.units).toHaveLength(cfg.units);
          expect(model.unitMeta).toHaveLength(cfg.units);
          expect(model.cages).toHaveLength(0);
          expect(model.inequalities).toHaveLength(0);
          expect(model.layout.rows).toBe(9);
          expect(model.layout.cols).toBe(9);
          model.units.forEach(function (cells) {
            expect(cells).toHaveLength(9);
            expect(sorted(cells).filter(function (c, i, all) { return i === 0 || c !== all[i - 1]; }))
              .toHaveLength(9);
          });
        });

        it('starts with the 27 units of classic9, in the same order, so a puzzle carries over', function () {
          for (var u = 0; u < 27; u++) {
            expect(Array.from(model.units[u])).toEqual(Array.from(classicModel.units[u]));
            expect(model.unitMeta[u]).toEqual(classicModel.unitMeta[u]);
          }
          expect(Array.from(model.layout.cellRow)).toEqual(Array.from(classicModel.layout.cellRow));
          expect(Array.from(model.layout.cellCol)).toEqual(Array.from(classicModel.layout.cellCol));
          expect(Array.from(model.layout.cellRegion)).toEqual(Array.from(classicModel.layout.cellRegion));
        });

        it('adds the extra units after them: diagonals first, then windows, with their kinds and labels',
          function () {
            var extra = model.unitMeta.slice(27);
            var expected = [];
            if (cfg.diag) expected.push({ kind: 'diag', label: 'D1' }, { kind: 'diag', label: 'D2' });
            if (cfg.hyper) {
              for (var w = 1; w <= 4; w++) expected.push({ kind: 'window', label: 'W' + w });
            }
            expect(extra.map(function (m) { return { kind: m.kind, label: m.label }; })).toEqual(expected);
            extra.forEach(function (m) { expect(m.gridIndex).toBe(0); expect(m.partial).toBeUndefined(); });
          });

        it('the diagonals are r == c and r + c == 8, each in reading order of its rows', function () {
          if (!cfg.diag) return;
          var main = [0, 10, 20, 30, 40, 50, 60, 70, 80];
          var anti = [8, 16, 24, 32, 40, 48, 56, 64, 72];
          expect(Array.from(model.units[27])).toEqual(main);
          expect(Array.from(model.units[28])).toEqual(anti);
          expect(model.unitMeta[27].kind).toBe('diag');
        });

        it('the windows are the 3x3 squares at (1,1), (1,5), (5,1), (5,5), cell by cell', function () {
          if (!cfg.hyper) return;
          var start = cfg.diag ? 29 : 27;
          WINDOW_CORNERS.forEach(function (corner, i) {
            var expected = [];
            for (var r = 0; r < 3; r++) {
              for (var c = 0; c < 3; c++) expected.push((corner[0] + r) * 9 + corner[1] + c);
            }
            expect(Array.from(model.units[start + i])).toEqual(expected);
            expect(model.unitMeta[start + i].kind).toBe('window');
          });
        });

        it('peers are exactly the cells that share a row, column, box, diagonal or window (all 3240 pairs)',
          function () {
            for (var a = 0; a < 81; a++) {
              var expected = [];
              for (var b = 0; b < 81; b++) if (b !== a && related(a, b, cfg)) expected.push(b);
              check(JSON.stringify(Array.from(model.peers[a])) === JSON.stringify(expected),
                'peers of cell ' + a + ' differ from the rules');
            }
          });

        it('is immutable, and every cell is in the units the rules say (cellUnits)', function () {
          expect(Object.isFrozen(model)).toBe(true);
          expect(Object.isFrozen(model.units)).toBe(true);
          expect(Object.isFrozen(model.layout.overlays)).toBe(true);
          for (var c = 0; c < 81; c++) {
            var diagonals = cfg.diag ? (row(c) === col(c) ? 1 : 0) + (row(c) + col(c) === 8 ? 1 : 0) : 0;
            var expected = 3 + diagonals + (cfg.hyper && windowOf(c) !== -1 ? 1 : 0);
            check(model.cellUnits[c].length === expected,
              'cell ' + c + ' is in ' + model.cellUnits[c].length + ' units, expected ' + expected);
          }
        });
      });
    });

    it('the two ways to ask for the hybrid give the same board, down to the unit order', function () {
      var a = build(CONFIGS[2]);
      var b = build(CONFIGS[3]);
      expect(a.variantId).toBe('diagonalX');
      expect(b.variantId).toBe('hyper');
      expect(a.units.map(function (u) { return Array.from(u); }))
        .toEqual(b.units.map(function (u) { return Array.from(u); }));
      expect(a.unitMeta).toEqual(b.unitMeta);
      expect(a.layout.overlays.map(function (o) { return [o.kind, Array.from(o.cells)]; }))
        .toEqual(b.layout.overlays.map(function (o) { return [o.kind, Array.from(o.cells)]; }));
      expect(a.peers.map(function (p) { return Array.from(p); }))
        .toEqual(b.peers.map(function (p) { return Array.from(p); }));
    });

    it('the extra units cut across the boxes: a window touches four boxes, a diagonal three', function () {
      var hyper = build(CONFIGS[1]);
      for (var w = 0; w < 4; w++) {
        var boxes = {};
        Array.from(hyper.units[27 + w]).forEach(function (c) { boxes[box(c)] = true; });
        expect(Object.keys(boxes)).toHaveLength(4);
      }
      var diag = build(CONFIGS[0]);
      [27, 28].forEach(function (u) {
        var seen = {};
        Array.from(diag.units[u]).forEach(function (c) { seen[box(c)] = (seen[box(c)] || 0) + 1; });
        expect(Object.keys(seen)).toHaveLength(3);
        Object.keys(seen).forEach(function (b) { expect(seen[b]).toBe(3); });
      });
    });

    it('the region of a cell stays its box (0..8), so the board view keeps drawing the thick box lines',
      function () {
        CONFIGS.forEach(function (cfg) {
          var layout = build(cfg).layout;
          for (var c = 0; c < 81; c++) expect(layout.cellRegion[c]).toBe(box(c));
          expect(layout.subGrids).toHaveLength(1);
        });
      });

    it('the extra rules really are rules: a classic grid that breaks one is not a solution of the board',
      function () {
        [CONFIGS[0], CONFIGS[1]].forEach(function (cfg) {
          var model = build(cfg);
          var grid = null;
          for (var seed = 1; seed < 40 && grid === null; seed++) {
            var candidate = SG.fullGrid.generate(classicModel, SG.rng.create(seed), null);
            if (!gridSatisfies(candidate, cfg)) grid = candidate;
          }
          expect(grid).not.toBeNull();
          expect(SG.model.isSolution(classicModel, grid)).toBe(true);
          expect(SG.model.isSolution(model, grid)).toBe(false);
        });
      });
  });

  describe('extraRegions: the option (CV1)', function () {
    it('builds the plain board for a missing, empty or null option set, and without an rng', function () {
      expect(SG.variants.get('diagonalX').build().units).toHaveLength(29);
      expect(SG.variants.get('diagonalX').build(null, null).units).toHaveLength(29);
      expect(SG.variants.get('diagonalX').build({}, SG.rng.create(1)).units).toHaveLength(29);
      expect(SG.variants.get('hyper').build(undefined, undefined).units).toHaveLength(31);
      expect(SG.variants.get('hyper').build({ withDiagonals: null }, null).units).toHaveLength(31);
    });

    it('treats an explicit false like a missing option and ignores options of another variant', function () {
      expect(SG.variants.get('diagonalX').build({ withHyper: false }, null).units).toHaveLength(29);
      expect(SG.variants.get('hyper').build({ withDiagonals: false }, null).units).toHaveLength(31);
      expect(SG.variants.get('diagonalX').build({ withDiagonals: true }, null).units).toHaveLength(29);
      expect(SG.variants.get('hyper').build({ withHyper: true }, null).units).toHaveLength(31);
      expect(SG.variants.get('hyper').build({ compactness: 0.2 }, null).units).toHaveLength(31);
    });

    it('refuses a value that is not a boolean with pipeline.invalidOption, naming the option', function () {
      [['diagonalX', 'withHyper'], ['hyper', 'withDiagonals']].forEach(function (pair) {
        [1, 0, 'true', 'yes', [], {}].forEach(function (bad) {
          var opts = {};
          opts[pair[1]] = bad;
          var err = expectCode(function () { SG.variants.get(pair[0]).build(opts, null); },
            'pipeline.invalidOption');
          expect(err.i18nArgs.option).toBe(pair[1]);
        });
      });
    });

    it('reaches the model through the pipeline: variantOptions decide the unit count', function () {
      var plain = generate('diagonalX', 'veryEasy', 5);
      var hybrid = generate('diagonalX', 'veryEasy', 5, { variantOptions: { withHyper: true } });
      expect(plain.model.units).toHaveLength(29);
      expect(hybrid.model.units).toHaveLength(33);
      expect(hybrid.config.variantOptions).toEqual({ withHyper: true });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV2: full grids
  // ---------------------------------------------------------------------------------------------

  describe('extraRegions: full grids (CV2)', function () {
    CONFIGS.forEach(function (cfg) {
      it(cfg.name + ': 50 seeds give 50 valid full grids that obey every rule of the board', function () {
        var model = build(cfg);
        var distinct = {};
        for (var seed = 1; seed <= 50; seed++) {
          var grid = SG.fullGrid.generate(model, SG.rng.create(seed), null);
          check(grid.length === 81, 'seed ' + seed + ': wrong length');
          check(SG.model.isSolution(model, grid), 'seed ' + seed + ' is not a solution of the model');
          check(gridSatisfies(grid, cfg), 'seed ' + seed + ' breaks a rule of ' + cfg.name);
          distinct[Array.from(grid).join('')] = true;
        }
        expect(Object.keys(distinct)).toHaveLength(50);
      });
    });

    it('the same seed gives the same grid', function () {
      CONFIGS.forEach(function (cfg) {
        var model = build(cfg);
        var a = SG.fullGrid.generate(model, SG.rng.create(9), null);
        var b = SG.fullGrid.generate(model, SG.rng.create(9), null);
        expect(Array.from(b)).toEqual(Array.from(a));
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV3, CV4, CV6: puzzles
  // ---------------------------------------------------------------------------------------------

  describe('extraRegions: puzzles at every level (CV3, CV4, CV6; T-5.2)', function () {
    VARIANT_IDS.forEach(function (id) {
      var cfg = VARIANT_CONFIGS[id];
      LEVELS.forEach(function (level) {
        describe(id + ' ' + level + ': ' + PUZZLES_PER_LEVEL + ' puzzles', function () {
          it('I1: exactly one solution; I2: givens are part of the solution; I3: it obeys every rule',
            function () {
              puzzleRun()[id][level].forEach(function (p, i) {
                checkInvariants(p, cfg, id + ' ' + level + ' #' + i);
                check(p.model.variantId === id, id + ' ' + level + ' #' + i + ': wrong variant id');
              });
            });

          it('I5: a puzzle that reached the level has its score in the band and a technique group of the ' +
            'level; I6: the clue count respects the spec', function () {
            puzzleRun()[id][level].forEach(function (p, i) {
              var tag = id + ' ' + level + ' #' + i;
              var spec = SG.difficulty.spec(level, p.model);
              check(clueCount(p.givens) >= spec.minClues, tag + ' has fewer clues than ' + spec.minClues);
              if (p.rating.level === level) {
                check(p.rating.score >= spec.min && p.rating.score < spec.max, tag + ': score not in band');
                if (p.rating.hardestGroup !== null) {
                  check(spec.allowedGroups.indexOf(p.rating.hardestGroup) !== -1,
                    tag + ': hardest group ' + p.rating.hardestGroup + ' is not allowed');
                }
              } else {
                expect(p.warnings).toContain('difficulty.approximate');
              }
            });
          });

          it('CV6: p95 of the generation time is within the design.md 9.1 budget of ' + BUDGET_MS[level] +
            ' ms', function () {
            var times = puzzleRun()[id][level].map(function (p) { return p.elapsedMs; });
            expect(percentile(times, 0.95)).toBeLessThan(BUDGET_MS[level]);
          });
        });
      });

      it(id + ': most puzzles reach the level that was asked for (the rest carry the approximate warning)',
        function () {
          var exact = 0;
          allPuzzles(id).forEach(function (p) {
            if (p.rating.level === p.config.difficulty) exact++;
          });
          expect(exact / allPuzzles(id).length).toBeGreaterThan(0.85);
        });

      it(id + ': clue counts fall as the level rises (means over the puzzles of a level)', function () {
        var means = LEVELS.map(function (level) {
          var puzzles = puzzleRun()[id][level];
          return puzzles.reduce(function (sum, p) { return sum + clueCount(p.givens); }, 0) / puzzles.length;
        });
        for (var i = 1; i < means.length; i++) expect(means[i]).toBeLessThan(means[i - 1]);
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // T-5.2: the extra constraints genuinely matter
  // ---------------------------------------------------------------------------------------------

  describe('extraRegions: the extra units are needed (T-5.2)', function () {
    VARIANT_IDS.forEach(function (id) {
      it(id + ': without its extra units at least ' + Math.round(NEEDED_SHARE * 100) + '% of the puzzles ' +
        'have more than one solution', function () {
        var puzzles = allPuzzles(id);
        var needing = countNeedingExtras(puzzles);
        expect(needing / puzzles.length).toBeGreaterThanOrEqual(NEEDED_SHARE);
      });

      it(id + ': from medium upwards, at least ' + Math.round(NEEDED_SHARE * 100) +
        '% need them at every level; and at every level some do', function () {
        LEVELS.forEach(function (level, li) {
          var puzzles = puzzleRun()[id][level];
          var needing = countNeedingExtras(puzzles);
          check(needing > 0, id + ' ' + level + ': no puzzle needs its extra units');
          if (li >= 2) {
            check(needing / puzzles.length >= NEEDED_SHARE, id + ' ' + level + ': only ' + needing + ' of ' +
              puzzles.length + ' need them');
          }
        });
      });
    });

    it('the hybrid: dropping the diagonals and the windows leaves several solutions for 70% of the puzzles',
      function () {
        var puzzles = hybridRun();
        expect(puzzles).toHaveLength(LEVELS.length * HYBRID_PER_LEVEL);
        expect(countNeedingExtras(puzzles) / puzzles.length).toBeGreaterThanOrEqual(NEEDED_SHARE);
      });

    it('the check can tell: a classic9 puzzle keeps its unique solution on the classic board', function () {
      LEVELS.forEach(function (level, li) {
        var p = generate('classic9', level, 700 + li);
        expect(SG.dfs.countSolutions(classicModel, p.givens, 2)).toBe(1);
      });
    });

    it('in the hybrid each family counts on its own: from medium upwards, dropping only the diagonals or ' +
      'only the windows leaves several solutions for most puzzles', function () {
      var puzzles = hybridRun().filter(function (p) {
        return p.config.difficulty !== 'veryEasy' && p.config.difficulty !== 'easy';
      });
      var withoutDiagonals = build(CONFIGS[1]);
      var withoutWindows = build(CONFIGS[0]);
      var noDiagonals = 0;
      var noWindows = 0;
      puzzles.forEach(function (p) {
        if (SG.dfs.countSolutions(withoutDiagonals, p.givens, 2) > 1) noDiagonals++;
        if (SG.dfs.countSolutions(withoutWindows, p.givens, 2) > 1) noWindows++;
      });
      expect(puzzles).toHaveLength(4 * HYBRID_PER_LEVEL);
      expect(noDiagonals / puzzles.length).toBeGreaterThanOrEqual(NEEDED_SHARE);
      expect(noWindows / puzzles.length).toBeGreaterThanOrEqual(NEEDED_SHARE);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The hybrid
  // ---------------------------------------------------------------------------------------------

  describe('extraRegions: the hybrid diagonalX + hyper (33 units; CV3, CV4)', function () {
    it('every level, through both variants: unique solution, givens in the solution, every rule obeyed',
      function () {
        hybridRun().forEach(function (p, i) {
          var tag = 'hybrid #' + i + ' (' + p.config.difficulty + ')';
          checkInvariants(p, CONFIGS[2], tag);
          check(clueCount(p.givens) >= SG.difficulty.spec(p.config.difficulty, p.model).minClues,
            tag + ': too few clues');
        });
      });

    it('the model of every hybrid puzzle validates', function () {
      hybridRun().filter(function (p, i) { return i % 6 === 0; }).forEach(function (p) {
        expect(SG.model.validate(p.model).ok).toBe(true);
      });
    });

    it('the same seed gives the same hybrid puzzle, through either variant', function () {
      var a = generate('diagonalX', 'hard', 31, { variantOptions: { withHyper: true } });
      var b = generate('diagonalX', 'hard', 31, { variantOptions: { withHyper: true } });
      expect(Array.from(b.givens)).toEqual(Array.from(a.givens));
      expect(Array.from(b.solution)).toEqual(Array.from(a.solution));
      var c = generate('hyper', 'hard', 31, { variantOptions: { withDiagonals: true } });
      var d = generate('hyper', 'hard', 31, { variantOptions: { withDiagonals: true } });
      expect(Array.from(d.givens)).toEqual(Array.from(c.givens));
    });
  });

  // ---------------------------------------------------------------------------------------------
  // I7: the techniques work on these units
  // ---------------------------------------------------------------------------------------------

  describe('extraRegions: the logical solver and the extra units (I7)', function () {
    var EXTRA_UNIT = /^(D[12]|W[1-4])$/;

    function sample(id) {
      var out = [];
      LEVELS.forEach(function (level) {
        out = out.concat(puzzleRun()[id][level].filter(function (p, i) { return i % 2 === 0; }));
      });
      return out;
    }

    VARIANT_IDS.forEach(function (id) {
      it(id + ': every step on the way to the solution is sound, and the extra units are used', function () {
        var onExtraUnits = 0;
        sample(id).forEach(function (p, i) {
          var report = SG.logicalSolver.solve(p.model, p.givens, { collectSteps: true });
          report.steps.forEach(function (step) {
            step.placements.forEach(function (pl) {
              check(p.solution[pl[0]] === pl[1], id + ' #' + i + ': ' + step.technique + ' places wrongly');
            });
            step.eliminations.forEach(function (el) {
              check(p.solution[el[0]] !== el[1], id + ' #' + i + ': ' + step.technique + ' drops the truth');
            });
            if (step.i18nArgs && EXTRA_UNIT.test(String(step.i18nArgs.unit))) onExtraUnits++;
          });
        });
        expect(onExtraUnits).toBeGreaterThan(0);
      });

      it(id + ': the logical solver reaches the solution of every puzzle that hit its level, with the ' +
        'techniques of that level', function () {
        allPuzzles(id).forEach(function (p, i) {
          if (p.rating.level !== p.config.difficulty) return;
          var spec = SG.difficulty.spec(p.config.difficulty, p.model);
          var report = SG.logicalSolver.solve(p.model, p.givens, {
            allowedTechniques: spec.allowedTechniques, assumeUniqueness: false, collectSteps: false
          });
          check(report.solved, id + ' #' + i + ' (' + p.config.difficulty + ') is not solved by its level');
        });
      });
    });

    it('a hidden single in a diagonal or a window is found, explained with that unit label', function () {
      var found = { D: false, W: false };
      CONFIGS.slice(0, 2).forEach(function (cfg) {
        allPuzzles(cfg.variantId).forEach(function (p) {
          if (found.D && found.W) return;
          var report = SG.logicalSolver.solve(p.model, p.givens, { collectSteps: true });
          report.steps.forEach(function (step) {
            if (!step.i18nArgs) return;
            if (/^D[12]$/.test(String(step.i18nArgs.unit))) found.D = true;
            if (/^W[1-4]$/.test(String(step.i18nArgs.unit))) found.W = true;
          });
        });
      });
      expect(found.D).toBe(true);
      expect(found.W).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The pipeline and its events
  // ---------------------------------------------------------------------------------------------

  describe('extraRegions: the pipeline and its events', function () {
    var STEPS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];

    function run(cfg, level, seed, trace) {
      var events = [];
      var result = SG.pipeline.run({
        variantId: cfg.variantId, difficulty: level, seed: seed, trace: trace, variantOptions: cfg.options
      }, function (e) { events.push(e); });
      return { result: result, events: events };
    }

    function checkEvents(events) {
      events.forEach(function (e, i) {
        var problems = E.eventProblems(e);
        if (problems.length > 0) {
          throw new Error('event ' + i + ' (' + e.i18nKey + '): ' + problems.join('; '));
        }
        if (e.seq !== i) throw new Error('seq ' + e.seq + ' at index ' + i);
        if (E.lookup(e) === null) throw new Error('not in the vocabulary: ' + e.i18nKey);
      });
    }

    CONFIGS.forEach(function (cfg, k) {
      it(cfg.name + ': runs the seven steps in order, reports its unit count, and a full trace replays to ' +
        'the puzzle', function () {
        var out = run(cfg, 'medium', 40 + k, 'full');
        var starts = out.events.filter(function (e) { return e.type === 'step' && e.phase === 'start'; });
        expect(starts.map(function (e) { return e.stepId; }).slice(0, 7)).toEqual(STEPS);
        var model = out.events.filter(function (e) { return e.i18nKey === 'buildModel.model'; })[0];
        expect(model.i18nArgs.units).toBe(cfg.units);
        expect(model.i18nArgs.cellCount).toBe(81);
        checkEvents(out.events);
        var view = E.createView(81);
        out.events.forEach(function (e) { if (e.patch) E.applyPatch(view, e.patch); });
        expect(Array.from(view.value)).toEqual(Array.from(out.result.givens));
      });

      it(cfg.name + ': the result does not depend on the trace level or on a sink (I4)', function () {
        var base = run(cfg, 'hard', 77 + k, 'off').result;
        ['summary', 'full'].forEach(function (verbosity) {
          var r = run(cfg, 'hard', 77 + k, verbosity).result;
          expect(Array.from(r.givens)).toEqual(Array.from(base.givens));
          expect(Array.from(r.solution)).toEqual(Array.from(base.solution));
        });
        var silent = SG.pipeline.run({
          variantId: cfg.variantId, difficulty: 'hard', seed: 77 + k, variantOptions: cfg.options
        }, null);
        expect(Array.from(silent.givens)).toEqual(Array.from(base.givens));
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV5: determinism
  // ---------------------------------------------------------------------------------------------

  describe('extraRegions: same seed, same puzzle (CV5 / I4)', function () {
    VARIANT_IDS.forEach(function (id, vi) {
      it(id + ': every level, two runs give the same givens, solution and score', function () {
        LEVELS.forEach(function (level, li) {
          [3 + li, 400 + li].forEach(function (seed) {
            var a = generate(id, level, seed);
            var b = generate(id, level, seed);
            expect(Array.from(b.givens)).toEqual(Array.from(a.givens));
            expect(Array.from(b.solution)).toEqual(Array.from(a.solution));
            expect(b.rating.score).toBe(a.rating.score);
          });
        });
      });

      it(id + ': reproduces the puzzles of the shared run', function () {
        LEVELS.forEach(function (level, li) {
          var again = generate(id, level, seedOf(vi, li, 3));
          var first = puzzleRun()[id][level][3];
          expect(Array.from(again.givens)).toEqual(Array.from(first.givens));
        });
      });
    });

    it('another seed gives another puzzle; the option gives another board than the plain variant',
      function () {
      var a = generate('hyper', 'medium', 1000);
      var b = generate('hyper', 'medium', 1001);
      expect(Array.from(b.solution)).not.toEqual(Array.from(a.solution));
      var plain = generate('hyper', 'medium', 55);
      var hybrid = generate('hyper', 'medium', 55, { variantOptions: { withDiagonals: true } });
      expect(hybrid.model.units.length).not.toBe(plain.model.units.length);
      expect(Array.from(hybrid.solution)).not.toEqual(Array.from(plain.solution));
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV7: strings
  // ---------------------------------------------------------------------------------------------

  describe('extraRegions: strings in both languages (CV7)', function () {
    var KEY = /^variant\.(diagonalX|hyper)(\.|$)/;

    function fragments() {
      return SG.localeFragments.filter(function (f) {
        return f.en && Object.keys(f.en).some(function (k) { return KEY.test(k); });
      });
    }

    function merged(lang) {
      var out = {};
      fragments().forEach(function (f) {
        Object.keys(f[lang]).forEach(function (k) { if (KEY.test(k)) out[k] = f[lang][k]; });
      });
      return out;
    }

    function placeholders(text) {
      return (text.match(/\{[A-Za-z]+\}/g) || []).sort();
    }

    it('declares one fragment with en and vi', function () {
      expect(Array.isArray(SG.localeFragments)).toBe(true);
      expect(fragments()).toHaveLength(1);
      var f = fragments()[0];
      expect(typeof f.en).toBe('object');
      expect(typeof f.vi).toBe('object');
      expect(Object.keys(f.vi).sort()).toEqual(Object.keys(f.en).sort());
    });

    it('en and vi have the same keys, no empty value, and the Vietnamese is not a copy of the English',
      function () {
        var en = merged('en');
        var vi = merged('vi');
        expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
        Object.keys(en).forEach(function (key) {
          expect(typeof en[key]).toBe('string');
          expect(en[key].trim()).not.toBe('');
          expect(typeof vi[key]).toBe('string');
          expect(vi[key].trim()).not.toBe('');
          expect(vi[key]).not.toBe(en[key]);
          expect(placeholders(vi[key])).toEqual(placeholders(en[key]));
        });
      });

    it('covers both variant names and both options (label and hint), and nothing else', function () {
      var en = merged('en');
      var vi = merged('vi');
      var keys = [];
      VARIANT_IDS.forEach(function (id) {
        var def = SG.variants.get(id);
        keys.push(def.i18nKey, def.options[0].i18nKey, def.options[0].hintKey);
      });
      keys.forEach(function (key) {
        expect(en[key]).toBeDefined();
        expect(vi[key]).toBeDefined();
      });
      expect(Object.keys(en).sort()).toEqual(keys.slice().sort());
      expect(en['variant.diagonalX']).toBe('Diagonal Sudoku (X)');
      expect(en['variant.hyper']).toBe('Hyper Sudoku (Windoku)');
      expect(vi['variant.diagonalX']).toBe('Sudoku Đường chéo (X)');
      expect(vi['variant.hyper']).toBe('Sudoku Siêu vùng');
    });

    it('the option hints say what the option does: windows for diagonalX, diagonals for hyper', function () {
      var en = merged('en');
      expect(en['variant.diagonalX.withHyper.hint']).toContain('windows');
      expect(en['variant.hyper.withDiagonals.hint']).toContain('diagonals');
    });

    it('is merged into the language packs when they are loaded (browser run)', function () {
      var locales = SG.locales;
      if (!locales || !locales.en || !locales.vi) SG.test.skip('the language packs are not loaded here');
      Object.keys(merged('en')).forEach(function (key) {
        expect(locales.en[key]).toBeDefined();
        expect(locales.vi[key]).toBeDefined();
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV9: what the board view needs
  // ---------------------------------------------------------------------------------------------

  describe('extraRegions: data for the board view (CV9)', function () {
    /**
     * Draws the overlays the way a renderer would shade them: one character per cell, placed by
     * layout.cellRow / cellCol. 'd' = in a diagonal, 'w' = in a window, '#' = in both, '.' = in none.
     */
    function draw(model) {
      var layout = model.layout;
      var mark = [];
      for (var r = 0; r < layout.rows; r++) mark.push(new Array(layout.cols).fill(0));
      model.layout.overlays.forEach(function (o) {
        var bit = o.kind === 'diag' ? 1 : 2;
        Array.from(o.cells).forEach(function (cell) {
          mark[layout.cellRow[cell]][layout.cellCol[cell]] |= bit;
        });
      });
      return mark.map(function (line) {
        return line.map(function (m) { return ['.', 'd', 'w', '#'][m]; }).join('');
      });
    }

    var PICTURES = {
      diagonalX: [
        'd.......d',
        '.d.....d.',
        '..d...d..',
        '...d.d...',
        '....d....',
        '...d.d...',
        '..d...d..',
        '.d.....d.',
        'd.......d'
      ],
      hyper: [
        '.........',
        '.www.www.',
        '.www.www.',
        '.www.www.',
        '.........',
        '.www.www.',
        '.www.www.',
        '.www.www.',
        '.........'
      ],
      hybrid: [
        'd.......d',
        '.#ww.ww#.',
        '.w#w.w#w.',
        '.ww#.#ww.',
        '....d....',
        '.ww#.#ww.',
        '.w#w.w#w.',
        '.#ww.ww#.',
        'd.......d'
      ]
    };

    it('draws the two diagonals of diagonalX as a cross of cells', function () {
      expect(draw(build(CONFIGS[0]))).toEqual(PICTURES.diagonalX);
    });

    it('draws the four windows of hyper as four 3x3 squares that do not touch the board edge', function () {
      expect(draw(build(CONFIGS[1]))).toEqual(PICTURES.hyper);
    });

    it('draws the hybrid with the diagonals crossing the windows, the same from either variant', function () {
      expect(draw(build(CONFIGS[2]))).toEqual(PICTURES.hybrid);
      expect(draw(build(CONFIGS[3]))).toEqual(PICTURES.hybrid);
    });

    it('lists one overlay per extra unit, in unit order: { kind, cells } of that unit', function () {
      CONFIGS.forEach(function (cfg) {
        var model = build(cfg);
        var overlays = model.layout.overlays;
        expect(overlays).toHaveLength(cfg.units - 27);
        overlays.forEach(function (o, i) {
          expect(Object.keys(o).sort()).toEqual(['cells', 'kind']);
          expect(o.kind).toBe(model.unitMeta[27 + i].kind);
          expect(['diag', 'window']).toContain(o.kind);
          expect(o.cells instanceof Int32Array).toBe(true);
          expect(Array.from(o.cells)).toEqual(Array.from(model.units[27 + i]));
          expect(Object.isFrozen(o)).toBe(true);
        });
        expect(overlays.filter(function (o) { return o.kind === 'diag'; })).toHaveLength(cfg.diag ? 2 : 0);
        expect(overlays.filter(function (o) { return o.kind === 'window'; })).toHaveLength(cfg.hyper ? 4 : 0);
      });
    });

    function overlaysOver(model, cell) {
      return model.layout.overlays.filter(function (o) { return Array.from(o.cells).indexOf(cell) !== -1; });
    }

    it('overlays overlap: the centre is on both diagonals, so a renderer must blend the fills', function () {
      expect(overlaysOver(build(CONFIGS[0]), 40)).toHaveLength(2);
      // Cell 10 is (1,1): on the main diagonal and in the first window.
      var onCorner = overlaysOver(build(CONFIGS[2]), 10);
      expect(onCorner.map(function (o) { return o.kind; }).sort()).toEqual(['diag', 'window']);
    });

    it('the plain classic9 board has no overlays; only the extra-region variants draw some', function () {
      expect(classicModel.layout.overlays).toHaveLength(0);
    });
  });
})();
