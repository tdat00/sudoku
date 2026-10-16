// Mega variants (task T-5.1): mega12 (12x12, boxes of 3 rows x 4 columns) and mega16 (16x16, 4x4 boxes).
//
// The geometry (3 rows x 4 columns, not 4 x 3), the symbol sets (a presentation concern only), the 16 bit
// candidate masks at D = 16 (digit 16 is bit 15, the classic off-by-one trap), the pre-fill and restart
// tuning of the full grid generator, and the common variant criteria CV1-CV6 (CV7 is the locale fragment,
// CV8 the generic variants suite, CV9 the renderer contract at the end). The default run stays light: a few
// puzzles per level. Set the environment variable SG_DEEP=1 (Node) or SG.test.deep = true (browser) for 20
// puzzles per level and their hit rates.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;

  var DEEP = (typeof process !== 'undefined' && process.env && process.env.SG_DEEP === '1') ||
    SG.test.deep === true;
  var SAMPLES = DEEP ? 20 : 4;
  var SLOW = 120000;

  var IDS = ['mega12', 'mega16'];
  var LEVELS = ['veryEasy', 'easy', 'medium', 'hard'];

  /**
   * What each board must look like, written down independently of the builder. `budgets` are the
   * design.md section 9.1 limits in ms for veryEasy, medium and hard; easy is held to the medium one.
   */
  var BOARDS = {
    mega12: {
      digits: 12, boxRows: 3, boxCols: 4, boxesAcross: 3, boxesDown: 4, peers: 11 + 11 + 6,
      budgets: [400, 1000, 3000],
      sets: {
        letters: ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C'],
        numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
      },
      defaultSet: 'letters', otherSet: 'numbers'
    },
    mega16: {
      digits: 16, boxRows: 4, boxCols: 4, boxesAcross: 4, boxesDown: 4, peers: 15 + 15 + 9,
      budgets: [1500, 4000, 10000],
      sets: {
        hex: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'],
        letters: ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
      },
      defaultSet: 'hex', otherSet: 'letters'
    }
  };

  /** Minimum share of exact hits in the deep run (measured 100 % over 200 seeds per level and board). */
  var HIT_RATE = 0.95;

  var cache = {};

  function model(id, set) {
    var key = id + '/' + set;
    if (cache[key] === undefined) {
      cache[key] = SG.variants.get(id).build(set === undefined ? {} : { symbolSet: set }, SG.rng.create(1));
    }
    return cache[key];
  }

  function now() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
    return thrown;
  }

  function clueCount(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] !== 0) n++;
    return n;
  }

  /**
   * Is `values` a complete grid? Rows, columns and boxes are checked from the box shape alone, with one bit
   * per digit, so this does not depend on the units of the model.
   */
  function isLatin(id, values) {
    var b = BOARDS[id];
    var D = b.digits;
    var rows = new Int32Array(D);
    var cols = new Int32Array(D);
    var boxes = new Int32Array(D);
    for (var r = 0; r < D; r++) {
      for (var c = 0; c < D; c++) {
        var v = values[r * D + c];
        if (!(v >= 1 && v <= D)) return false;
        var bit = 1 << (v - 1);
        var box = Math.floor(r / b.boxRows) * b.boxesAcross + Math.floor(c / b.boxCols);
        if ((rows[r] & bit) || (cols[c] & bit) || (boxes[box] & bit)) return false;
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[box] |= bit;
      }
    }
    return true;
  }

  function sameTyped(a, b) {
    return Array.from(a).join(',') === Array.from(b).join(',');
  }

  // ===========================================================================================
  // Registration and definition
  // ===========================================================================================

  describe('mega definitions', function () {
    IDS.forEach(function (id) {
      it(id + ': is registered with the digits, group and presentation settings of its board', function () {
        var def = SG.variants.get(id);
        expect(def.id).toBe(id);
        expect(def.digits).toBe(BOARDS[id].digits);
        expect(def.group).toBe('mega');
        expect(def.i18nKey).toBe('variant.' + id);
        expect(def.defaultSymbolMode).toBe('digits');
        expect(def.symbolModes).toContain(def.defaultSymbolMode);
        expect(typeof def.build).toBe('function');
      });

      it(id + ': offers exactly veryEasy to hard, the levels of design.md 9.1', function () {
        var def = SG.variants.get(id);
        expect(def.difficultySupport).toEqual(LEVELS);
        ['expert', 'evil'].forEach(function (level) {
          expectCode(function () {
            SG.pipeline.run({ variantId: id, difficulty: level, seed: 1, trace: 'off' }, null);
          }, 'difficulty.unsupportedLevel');
        });
      });

      it(id + ': has a pre-fill and a restart threshold far below the generic default', function () {
        var def = SG.variants.get(id);
        expect(typeof def.fastSeed).toBe('function');
        expect(Number.isInteger(def.restartThreshold)).toBe(true);
        expect(def.restartThreshold).toBeGreaterThan(0);
        // The generic default of SG.fullGrid.generate is cellCount * 50.
        expect(def.restartThreshold).toBeLessThan(model(id).cellCount * 50 / 10);
      });

      it(id + ': describes the symbol set as a select option in the shape of the Killer and Jigsaw sliders',
        function () {
          var def = SG.variants.get(id);
          expect(def.options).toHaveLength(1);
          var option = def.options[0];
          expect(option.id).toBe('symbolSet');
          expect(option.type).toBe('select');
          expect(option.default).toBe(BOARDS[id].defaultSet);
          expect(option.i18nKey).toBe('option.symbolSet');
          expect(option.hintKey).toBe('option.symbolSet.hint');
          expect(option.choices.map(function (c) { return c.value; }).sort())
            .toEqual(Object.keys(BOARDS[id].sets).sort());
          option.choices.forEach(function (choice) {
            expect(choice.i18nKey).toBe('option.symbolSet.' + id + '.' + choice.value);
          });
          expect(option.choices[0].value).toBe(option.default);
        });
    });

    it('is plain data: the option schema survives a JSON round trip (it is sent to the UI)', function () {
      IDS.forEach(function (id) {
        var options = SG.variants.get(id).options;
        expect(JSON.parse(JSON.stringify(options))).toEqual(options);
      });
    });

    it('loading the file twice registers nothing twice and adds no second locale fragment', function () {
      var env = SG.test.node;
      if (!env || !env.fs) SG.test.skip('needs the Node file system');
      var before = SG.variants.list().length;
      var fragments = SG.localeFragments.length;
      var saved = SG.mega;
      var file = env.path.join(env.root, 'js/variants/mega.js');
      try {
        env.vm.runInThisContext(env.fs.readFileSync(file, 'utf8'), { filename: file });
      } finally {
        SG.mega = saved;
      }
      expect(SG.variants.list().length).toBe(before);
      expect(SG.localeFragments.length).toBe(fragments);
    });
  });

  // ===========================================================================================
  // Geometry (CV1)
  // ===========================================================================================

  describe('mega geometry', function () {
    IDS.forEach(function (id) {
      var b = BOARDS[id];
      var D = b.digits;

      it(id + ': the model is valid (CV1) and has D x D cells and 3 x D units of D cells', function () {
        var m = model(id);
        var report = SG.model.validate(m);
        expect(report.errors).toEqual([]);
        expect(report.ok).toBe(true);
        expect(m.variantId).toBe(id);
        expect(m.digits).toBe(D);
        expect(m.cellCount).toBe(D * D);
        expect(m.units).toHaveLength(3 * D);
        m.units.forEach(function (unit) { expect(unit).toHaveLength(D); });
        expect(m.cages).toHaveLength(0);
        expect(m.inequalities).toHaveLength(0);
        expect(m.layout.overlays).toHaveLength(0);
        expect(m.layout.subGrids).toHaveLength(1);
        for (var c = 0; c < m.cellCount; c++) expect(m.fixedCells[c]).toBe(0);
      });

      it(id + ': units are the rows, then the columns, then the boxes', function () {
        var m = model(id);
        for (var i = 0; i < D; i++) {
          expect(m.unitMeta[i].kind).toBe('row');
          expect(m.unitMeta[D + i].kind).toBe('col');
          expect(m.unitMeta[2 * D + i].kind).toBe('box');
          for (var j = 0; j < D; j++) {
            expect(m.units[i][j]).toBe(i * D + j);
            expect(m.units[D + i][j]).toBe(j * D + i);
          }
        }
      });

      it(id + ': every box is ' + b.boxRows + ' rows x ' + b.boxCols + ' columns, read from cellRegion',
        function () {
          var m = model(id);
          var region = m.layout.cellRegion;
          var rows = {};
          var cols = {};
          var count = {};
          for (var c = 0; c < m.cellCount; c++) {
            var g = region[c];
            (rows[g] = rows[g] || {})[m.layout.cellRow[c]] = true;
            (cols[g] = cols[g] || {})[m.layout.cellCol[c]] = true;
            count[g] = (count[g] || 0) + 1;
          }
          expect(Object.keys(count)).toHaveLength(D);
          Object.keys(count).forEach(function (g) {
            expect(count[g]).toBe(D);
            expect(Object.keys(rows[g])).toHaveLength(b.boxRows);
            expect(Object.keys(cols[g])).toHaveLength(b.boxCols);
          });
          for (var r = 0; r < D; r++) {
            for (var k = 0; k < D; k++) {
              var expected = Math.floor(r / b.boxRows) * b.boxesAcross + Math.floor(k / b.boxCols);
              expect(region[r * D + k]).toBe(expected);
            }
          }
        });

      it(id + ': the box units are exactly the cells of one region id', function () {
        var m = model(id);
        for (var box = 0; box < D; box++) {
          var unit = Array.from(m.units[2 * D + box]).sort(function (x, y) { return x - y; });
          var members = [];
          for (var c = 0; c < m.cellCount; c++) if (m.layout.cellRegion[c] === box) members.push(c);
          expect(unit).toEqual(members);
        }
      });

      it(id + ': each cell sees ' + b.peers + ' peers, and the relation is symmetric', function () {
        var m = model(id);
        for (var c = 0; c < m.cellCount; c++) {
          expect(m.peers[c]).toHaveLength(b.peers);
          for (var i = 0; i < m.peers[c].length; i++) {
            expect(Array.from(m.peers[m.peers[c][i]])).toContain(c);
          }
        }
      });

      it(id + ': the canvas is D x D and no two cells share a position', function () {
        var m = model(id);
        expect(m.layout.rows).toBe(D);
        expect(m.layout.cols).toBe(D);
        var seen = {};
        for (var c = 0; c < m.cellCount; c++) {
          expect(m.layout.cellRow[c]).toBe(Math.floor(c / D));
          expect(m.layout.cellCol[c]).toBe(c % D);
          seen[m.layout.cellRow[c] + ',' + m.layout.cellCol[c]] = true;
        }
        expect(Object.keys(seen)).toHaveLength(D * D);
      });
    });

    it('mega12 boxes are 3 rows x 4 columns and not 4 x 3', function () {
      var region = model('mega12').layout.cellRegion;
      // Row 0 holds four cells of box 0, then box 1 starts: a 4 column wide box.
      [0, 1, 2, 3].forEach(function (col) { expect(region[col]).toBe(0); });
      expect(region[4]).toBe(1);
      expect(region[8]).toBe(2);
      // Rows 0..2 belong to box 0, row 3 starts the next box row: a 3 row tall box.
      [0, 1, 2].forEach(function (row) { expect(region[row * 12]).toBe(0); });
      expect(region[3 * 12]).toBe(3);
      expect(region[6 * 12]).toBe(6);
      expect(region[9 * 12]).toBe(9);
      expect(region[12 * 12 - 1]).toBe(11);
      expect(model('mega12').unitMeta[24].label).toBe('B1');
      expect(Array.from(model('mega12').units[24])).toEqual(
        [0, 1, 2, 3, 12, 13, 14, 15, 24, 25, 26, 27]);
    });

    it('mega16 boxes are 4 x 4', function () {
      var region = model('mega16').layout.cellRegion;
      expect(region[3]).toBe(0);
      expect(region[4]).toBe(1);
      expect(region[3 * 16]).toBe(0);
      expect(region[4 * 16]).toBe(4);
      expect(region[16 * 16 - 1]).toBe(15);
      expect(Array.from(model('mega16').units[32])).toEqual(
        [0, 1, 2, 3, 16, 17, 18, 19, 32, 33, 34, 35, 48, 49, 50, 51]);
    });

    it('the peers of the mega12 corner cell are its row, its column and the rest of its 3 x 4 box',
      function () {
        var m = model('mega12');
        var expected = {};
        for (var i = 1; i < 12; i++) { expected[i] = true; expected[i * 12] = true; }
        for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) expected[r * 12 + c] = true;
        delete expected[0];
        expect(Array.from(m.peers[0])).toEqual(Object.keys(expected).map(Number).sort(function (x, y) {
          return x - y;
        }));
      });

    it('with 3 x 4 boxes, mega12 cell (1, 1) sees (0, 3) and (2, 3) by box but not (3, 3)', function () {
      var m = model('mega12');
      // (0, 3) and (2, 3) share the 3 x 4 box of (1, 1); (3, 3) lies in the box below. Cell (0, 0) does not
      // see (3, 1), which a 4 row tall box would put in its box.
      expect(Array.from(m.peers[1 * 12 + 1])).toContain(0 * 12 + 3);
      expect(Array.from(m.peers[1 * 12 + 1])).toContain(2 * 12 + 3);
      expect(Array.from(m.peers[1 * 12 + 1])).not.toContain(3 * 12 + 3);
      expect(Array.from(m.peers[0])).not.toContain(3 * 12 + 1);
    });
  });

  // ===========================================================================================
  // Symbol sets: a presentation concern
  // ===========================================================================================

  describe('mega symbol sets', function () {
    IDS.forEach(function (id) {
      var b = BOARDS[id];

      Object.keys(b.sets).forEach(function (set) {
        it(id + ': the "' + set + '" set labels the values 1..' + b.digits + ' as ' + b.sets[set].join(' '),
          function () {
            var m = model(id, set);
            expect(m.symbols.labels).toEqual(b.sets[set]);
            expect(m.symbols.labels).toHaveLength(b.digits);
            expect(SG.mega.symbolLabels(id, set)).toEqual(b.sets[set]);
            var distinct = {};
            m.symbols.labels.forEach(function (label) {
              expect(label.length).toBeGreaterThan(0);
              distinct[label] = true;
            });
            expect(Object.keys(distinct)).toHaveLength(b.digits);
          });
      });

      it(id + ': the default set is "' + b.defaultSet + '" whether the option is missing, null or empty',
        function () {
          var def = SG.variants.get(id);
          var missing = [undefined, null, {}, { symbolSet: undefined }, { symbolSet: null }, { other: 1 }];
          missing.forEach(function (opts) {
            expect(def.build(opts, SG.rng.create(1)).symbols.labels).toEqual(b.sets[b.defaultSet]);
          });
          expect(def.build({ symbolSet: def.options[0].default }).symbols.labels)
            .toEqual(b.sets[b.defaultSet]);
        });

      it(id + ': refuses an unknown symbol set, a set of the other variant and a value of the wrong type',
        function () {
          var def = SG.variants.get(id);
          var foreign = id === 'mega12' ? 'hex' : 'numbers';
          ['bogus', '', foreign, 5, true, ['letters']].forEach(function (value) {
            var err = expectCode(function () { def.build({ symbolSet: value }, SG.rng.create(1)); },
              'pipeline.invalidOption');
            expect(err.i18nArgs.option).toBe('symbolSet');
            expect(err.i18nArgs.value).toBe(String(value));
          });
          expectCode(function () {
            SG.pipeline.run({ variantId: id, difficulty: 'veryEasy', seed: 1, trace: 'off',
              variantOptions: { symbolSet: 'bogus' } }, null);
          }, 'pipeline.invalidOption');
        });

      it(id + ': the set only changes the labels, never the units, peers or layout', function () {
        var sets = Object.keys(b.sets);
        var a = model(id, sets[0]);
        var c = model(id, sets[1]);
        expect(a.symbols.labels).not.toEqual(c.symbols.labels);
        expect(a.units.map(function (u) { return Array.from(u).join(','); }))
          .toEqual(c.units.map(function (u) { return Array.from(u).join(','); }));
        expect(a.peers.map(function (p) { return Array.from(p).join(','); }))
          .toEqual(c.peers.map(function (p) { return Array.from(p).join(','); }));
        expect(sameTyped(a.layout.cellRegion, c.layout.cellRegion)).toBe(true);
        expect(sameTyped(a.layout.cellRow, c.layout.cellRow)).toBe(true);
        expect(sameTyped(a.layout.cellCol, c.layout.cellCol)).toBe(true);
      });

      it(id + ': the same seed gives the same puzzle in every set, and the result carries the chosen labels',
        function () {
          var reference = null;
          Object.keys(b.sets).forEach(function (set) {
            var result = SG.pipeline.run({ variantId: id, difficulty: 'easy', seed: 11, trace: 'off',
              variantOptions: { symbolSet: set } }, null);
            expect(result.model.symbols.labels).toEqual(b.sets[set]);
            expect(result.config.variantOptions).toEqual({ symbolSet: set });
            if (reference === null) {
              reference = result;
            } else {
              expect(sameTyped(result.givens, reference.givens)).toBe(true);
              expect(sameTyped(result.solution, reference.solution)).toBe(true);
            }
          });
        }, SLOW);
    });

    it('the highest value of each set: 16 is F in hex, G in 1-9 A-G; 12 is C or "12"', function () {
      expect(model('mega16', 'hex').symbols.labels[16 - 1]).toBe('F');
      expect(model('mega16', 'letters').symbols.labels[16 - 1]).toBe('G');
      expect(model('mega12', 'letters').symbols.labels[12 - 1]).toBe('C');
      expect(model('mega12', 'numbers').symbols.labels[12 - 1]).toBe('12');
    });

    it('hex starts at 0, which labels the value 1; no value is ever 0 in the core', function () {
      var labels = model('mega16', 'hex').symbols.labels;
      expect(labels[0]).toBe('0');
      expect(labels[10 - 1]).toBe('9');
      expect(labels[11 - 1]).toBe('A');
      var result = SG.pipeline.run({ variantId: 'mega16', difficulty: 'veryEasy', seed: 2, trace: 'off',
        variantOptions: { symbolSet: 'hex' } }, null);
      for (var c = 0; c < result.solution.length; c++) {
        expect(result.solution[c]).toBeGreaterThanOrEqual(1);
        expect(result.solution[c]).toBeLessThanOrEqual(16);
      }
    });
  });

  // ===========================================================================================
  // Candidate masks at the highest digit (D = 16 uses bit 15)
  // ===========================================================================================

  describe('mega bitmasks at the highest digit', function () {
    it('SG.bits handles digit 16: bit 15, the mask 0xFFFF, always a positive int32', function () {
      var top = 1 << 15;
      expect(top).toBe(32768);
      expect(SG.bits.full(16)).toBe(0xFFFF);
      expect(SG.bits.full(12)).toBe(0xFFF);
      expect(SG.bits.popcount(0xFFFF)).toBe(16);
      expect(SG.bits.popcount(top)).toBe(1);
      expect(SG.bits.popcount(0xFFFF & ~top)).toBe(15);
      expect(SG.bits.lowestBitIndex(top)).toBe(15);
      expect(SG.bits.lowestBitIndex(0xFFFF)).toBe(0);
      expect(SG.bits.toArray(top)).toEqual([16]);
      expect(SG.bits.toArray(0xFFFF)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      var seen = [];
      SG.bits.forEach(top | 1, function (v) { seen.push(v); });
      expect(seen).toEqual([1, 16]);
      // The value of the lowest set bit as the searches compute it, `32 - clz32(m & -m)`.
      expect(32 - Math.clz32(top & -top)).toBe(16);
    });

    IDS.forEach(function (id) {
      var D = BOARDS[id].digits;
      var top = 1 << (D - 1);
      var full = (1 << D) - 1;

      it(id + ': a fresh state holds the full mask ' + full + ' in every cell, none of them negative',
        function () {
          var m = model(id);
          var state = SG.model.initState(m);
          for (var c = 0; c < m.cellCount; c++) {
            expect(state.candidates[c]).toBe(full);
            expect(state.value[c]).toBe(0);
          }
          expect(state.unsolvedCount).toBe(m.cellCount);
        });

      it(id + ': assigning ' + D + ' clears bit ' + (D - 1) + ' of the peers and nothing else', function () {
        var m = model(id);
        var cell = (D >> 1) * D + 3;
        var state = SG.model.initState(m);
        expect(SG.constraints.assign(m, state, cell, D)).toBe(true);
        expect(state.value[cell]).toBe(D);
        expect(state.candidates[cell]).toBe(top);
        expect(state.unsolvedCount).toBe(m.cellCount - 1);
        var peers = {};
        Array.from(m.peers[cell]).forEach(function (p) { peers[p] = true; });
        for (var c = 0; c < m.cellCount; c++) {
          if (c === cell) continue;
          expect(state.candidates[c]).toBe(peers[c] ? full & ~top : full);
        }
      });

      it(id + ': eliminate(' + D + ') clears only bit ' + (D - 1) + ', never the last one', function () {
        var m = model(id);
        var state = SG.model.initState(m);
        expect(SG.constraints.eliminate(m, state, 5, D)).toBe(true);
        expect(state.candidates[5]).toBe(full & ~top);
        expect(SG.constraints.eliminate(m, state, 5, D)).toBe(true);
        expect(state.candidates[5]).toBe(full & ~top);
        var alone = SG.model.initState(m);
        for (var v = 1; v < D; v++) SG.constraints.eliminate(m, alone, 7, v);
        expect(alone.candidates[7]).toBe(top);
        expect(SG.constraints.eliminate(m, alone, 7, D)).toBe(false);
      });

      it(id + ': propagation places ' + D + ' as a naked single and removes it from the peers', function () {
        var m = model(id);
        var state = SG.model.initState(m);
        for (var v = 1; v < D; v++) SG.constraints.eliminate(m, state, 20, v);
        expect(SG.constraints.propagate(m, state, null)).toBe(true);
        expect(state.value[20]).toBe(D);
        Array.from(m.peers[20]).forEach(function (p) {
          expect(state.candidates[p] & top).toBe(0);
          expect(state.value[p]).not.toBe(D);
        });
      });

      it(id + ': propagation places ' + D + ' as a hidden single in a row', function () {
        var m = model(id);
        var state = SG.model.initState(m);
        var row = m.units[3];
        for (var i = 1; i < D; i++) SG.constraints.eliminate(m, state, row[i], D);
        expect(SG.constraints.propagate(m, state, null)).toBe(true);
        expect(state.value[row[0]]).toBe(D);
        for (var j = 1; j < D; j++) expect(state.value[row[j]]).not.toBe(D);
      });

      it(id + ': the solvers fill in every ' + D + ' that is left out of a grid', function () {
        var m = model(id);
        var solution = SG.fullGrid.generate(m, SG.rng.create(5), null, {});
        var givens = solution.slice();
        var holes = [];
        for (var c = 0; c < givens.length; c++) {
          if (givens[c] === D) {
            givens[c] = 0;
            holes.push(c);
          }
        }
        expect(holes).toHaveLength(D);
        expect(SG.dfs.countSolutions(m, givens, 2)).toBe(1);
        var found = SG.dfs.solve(m, givens);
        expect(sameTyped(found, solution)).toBe(true);
        holes.forEach(function (c) { expect(found[c]).toBe(D); });

        var report = SG.logicalSolver.solve(m, givens, { allowedTechniques: null, collectSteps: true });
        expect(report.solved).toBe(true);
        var placed = [];
        report.steps.forEach(function (step) {
          step.placements.forEach(function (p) {
            expect(solution[p[0]]).toBe(p[1]);
            if (p[1] === D) placed.push(p[0]);
          });
        });
        expect(placed.sort(function (x, y) { return x - y; })).toEqual(holes);
      });

      it(id + ': a single missing cell holding ' + D + ' is found by every solver', function () {
        var m = model(id);
        var solution = SG.fullGrid.generate(m, SG.rng.create(9), null, {});
        var cell = Array.from(solution).indexOf(D);
        var givens = solution.slice();
        givens[cell] = 0;
        expect(SG.dfs.countSolutions(m, givens, 2)).toBe(1);
        expect(SG.dfs.solve(m, givens)[cell]).toBe(D);
        expect(SG.dfs.stillUnique(m, givens, cell, D)).toBe(true);
      });
    });
  });

  // ===========================================================================================
  // Full grid (CV2), the pre-fill and the restart threshold
  // ===========================================================================================

  describe('mega full grids', function () {
    IDS.forEach(function (id) {
      var b = BOARDS[id];
      var D = b.digits;
      var diagonal = Math.min(b.boxesAcross, b.boxesDown);

      it(id + ': 50 seeds give a valid grid, each digit once per row, column and box (CV2)', function () {
        var m = model(id);
        var distinct = {};
        var digit = new Int32Array(D + 1);
        for (var seed = 1; seed <= 50; seed++) {
          var grid = SG.fullGrid.generate(m, SG.rng.create(seed), null, {});
          expect(SG.model.isSolution(m, grid)).toBe(true);
          expect(isLatin(id, grid)).toBe(true);
          distinct[Array.from(grid).join(',')] = true;
          for (var c = 0; c < grid.length; c++) digit[grid[c]]++;
        }
        expect(Object.keys(distinct).length).toBeGreaterThan(45);
        for (var v = 1; v <= D; v++) expect(digit[v]).toBe(50 * D);
      }, SLOW);

      it(id + ': the same seed gives the same grid, whatever the symbol set', function () {
        var m = model(id);
        var a = SG.fullGrid.generate(m, SG.rng.create(77), null, {});
        var c = SG.fullGrid.generate(m, SG.rng.create(77), null, {});
        expect(sameTyped(a, c)).toBe(true);
        var other = SG.fullGrid.generate(m, SG.rng.create(78), null, {});
        expect(sameTyped(a, other)).toBe(false);
        // Both symbol sets share one search: the grid does not depend on the labels.
        var named = Object.keys(b.sets).map(function (set) {
          return SG.fullGrid.generate(model(id, set), SG.rng.create(77), null, {});
        });
        expect(sameTyped(named[0], named[1])).toBe(true);
        expect(sameTyped(named[0], a)).toBe(true);
      });

      it(id + ': the pre-fill puts a random permutation into each of the ' + diagonal +
        ' diagonal boxes, and only there', function () {
        var m = model(id);
        var def = SG.variants.get(id);
        var state = SG.model.initState(m);
        expect(def.fastSeed(m, state, SG.rng.create(3))).toBe(true);
        expect(state.unsolvedCount).toBe(m.cellCount - diagonal * D);
        var filled = {};
        for (var k = 0; k < diagonal; k++) filled[k * b.boxesAcross + k] = true;
        var rows = {};
        var cols = {};
        for (var box = 0; box < D; box++) {
          var seen = {};
          for (var c = 0; c < m.cellCount; c++) {
            if (m.layout.cellRegion[c] !== box) continue;
            if (filled[box]) {
              expect(state.value[c]).toBeGreaterThanOrEqual(1);
              expect(state.value[c]).toBeLessThanOrEqual(D);
              seen[state.value[c]] = true;
              rows[m.layout.cellRow[c]] = (rows[m.layout.cellRow[c]] || 0) + 1;
              cols[m.layout.cellCol[c]] = (cols[m.layout.cellCol[c]] || 0) + 1;
            } else {
              expect(state.value[c]).toBe(0);
            }
          }
          if (filled[box]) expect(Object.keys(seen)).toHaveLength(D);
        }
        // The seeded boxes share no row and no column.
        Object.keys(rows).forEach(function (r) { expect(rows[r]).toBe(b.boxCols); });
        Object.keys(cols).forEach(function (cc) { expect(cols[cc]).toBe(b.boxRows); });
        expect(Object.keys(rows)).toHaveLength(diagonal * b.boxRows);
        expect(Object.keys(cols)).toHaveLength(diagonal * b.boxCols);
      });

      it(id + ': the pre-fill is deterministic per seed, varies with it and reports a clash', function () {
        var m = model(id);
        var def = SG.variants.get(id);
        function seeded(seed) {
          var state = SG.model.initState(m);
          def.fastSeed(m, state, SG.rng.create(seed));
          return state.value;
        }
        expect(sameTyped(seeded(4), seeded(4))).toBe(true);
        expect(sameTyped(seeded(4), seeded(5))).toBe(false);

        var identity = { shuffle: function (list) { return list; } };
        var agrees = SG.model.initState(m);
        expect(SG.constraints.assign(m, agrees, 0, 1)).toBe(true);
        expect(def.fastSeed(m, agrees, identity)).toBe(true);
        var clash = SG.model.initState(m);
        expect(SG.constraints.assign(m, clash, 0, 2)).toBe(true);
        expect(def.fastSeed(m, clash, identity)).toBe(false);
      });

      it(id + ': the generator uses the pre-fill, and can run without it', function () {
        var m = model(id);
        var stats = {};
        var grid = SG.fullGrid.generate(m, SG.rng.create(1), null, { stats: stats });
        expect(isLatin(id, grid)).toBe(true);
        expect(stats.fastSeed).toBe(true);
        expect(stats.attempts).toBeGreaterThanOrEqual(1);
        var off = {};
        SG.fullGrid.generate(m, SG.rng.create(1), null, { stats: off, fastSeed: false });
        expect(off.fastSeed).toBe(false);
      });

      it(id + ': 50 seeds give a valid grid with the restartThreshold of the definition', function () {
        var m = model(id);
        var threshold = SG.variants.get(id).restartThreshold;
        for (var seed = 1; seed <= 50; seed++) {
          var stats = {};
          var grid = SG.fullGrid.generate(m, SG.rng.create(seed), null,
            { restartThreshold: threshold, stats: stats });
          expect(isLatin(id, grid)).toBe(true);
          expect(stats.attempts).toBe(stats.restarts + 1);
          expect(stats.backtracks).toBeLessThanOrEqual((threshold + 1) * (stats.restarts + 1));
        }
      }, SLOW);

      it(id + ': a threshold of 0 restarts at the first dead end, and the search still ends in a valid grid',
        function () {
          var m = model(id);
          var restarts = 0;
          for (var seed = 1; seed <= 60; seed++) {
            var stats = {};
            var grid = SG.fullGrid.generate(m, SG.rng.create(seed), null,
              { restartThreshold: 0, fastSeed: false, stats: stats });
            expect(isLatin(id, grid)).toBe(true);
            restarts += stats.restarts;
          }
          expect(restarts).toBeGreaterThan(0);
        }, SLOW);

      it(id + ': a cancelled or exhausted budget stops the search of the generator', function () {
        var m = model(id);
        var cancelled = SG.budget.create();
        cancelled.cancel();
        expectCode(function () {
          SG.fullGrid.generate(m, SG.rng.create(1), cancelled, { fastSeed: false });
        }, 'budget.cancelled');
        expectCode(function () {
          SG.fullGrid.generate(m, SG.rng.create(1), SG.budget.create({ nodes: 2 }), { fastSeed: false });
        }, 'budget.exceeded');
      });
    });
  });

  // ===========================================================================================
  // Puzzles (CV3, CV4, CV5, CV6)
  // ===========================================================================================

  describe('mega puzzles', function () {
    var BUDGET_OF = { veryEasy: 0, easy: 1, medium: 1, hard: 2 };

    function generate(id, level, seed, extra) {
      var budget = SG.budget.create({ ms: 60000 });
      var started = now();
      var config = Object.assign({ variantId: id, difficulty: level, seed: seed, trace: 'off' }, extra);
      var result = SG.pipeline.run(config, null, budget);
      return { result: result, ms: now() - started };
    }

    /** Invariants I1-I3, I5, I6 and the soundness (I7) of the logical solver on this puzzle. */
    function checkInvariants(id, level, result) {
      var m = result.model;
      var spec = SG.difficulty.spec(level, m);
      expect(m.variantId).toBe(id);
      expect(SG.dfs.countSolutions(m, result.givens, 2)).toBe(1);
      expect(SG.model.isSolution(m, result.solution)).toBe(true);
      expect(isLatin(id, result.solution)).toBe(true);
      for (var c = 0; c < m.cellCount; c++) {
        if (result.givens[c] !== 0) expect(result.givens[c]).toBe(result.solution[c]);
      }
      expect(clueCount(result.givens)).toBeGreaterThanOrEqual(spec.minClues);
      if (result.rating.level === level) {
        expect(result.rating.score).toBeGreaterThanOrEqual(spec.min);
        expect(result.rating.score).toBeLessThan(spec.max);
        expect(spec.allowedGroups).toContain(SG.techniques.get(result.rating.hardestTechnique).group);
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
      var b = BOARDS[id];

      LEVELS.forEach(function (level) {
        it(id + ' ' + level + ': ' + SAMPLES + ' puzzles are unique, valid and inside the 9.1 time budget',
          function () {
            var limit = b.budgets[BUDGET_OF[level]];
            for (var seed = 1; seed <= SAMPLES; seed++) {
              var out = generate(id, level, seed);
              checkInvariants(id, level, out.result);
              expect(out.ms).toBeLessThan(limit);
            }
          }, SLOW);

        it(id + ' ' + level + ': the same seed gives the same puzzle (CV5)', function () {
          var a = generate(id, level, 3).result;
          var c = generate(id, level, 3).result;
          expect(sameTyped(a.givens, c.givens)).toBe(true);
          expect(sameTyped(a.solution, c.solution)).toBe(true);
          expect(a.rating.score).toBe(c.rating.score);
          var other = generate(id, level, 4).result;
          expect(sameTyped(other.solution, a.solution)).toBe(false);
        }, SLOW);
      });

      it(id + ': puzzles hold the highest digit ' + b.digits + ' as a given and as a deduction', function () {
        var D = b.digits;
        var given = 0;
        var deduced = 0;
        for (var seed = 1; seed <= SAMPLES; seed++) {
          var result = generate(id, 'veryEasy', seed).result;
          for (var c = 0; c < result.givens.length; c++) if (result.givens[c] === D) given++;
          var report = SG.logicalSolver.solve(result.model, result.givens,
            { allowedTechniques: null, collectSteps: true });
          expect(report.solved).toBe(true);
          report.steps.forEach(function (step) {
            step.placements.forEach(function (p) { if (p[1] === D) deduced++; });
          });
        }
        expect(given).toBeGreaterThan(0);
        expect(deduced).toBeGreaterThan(0);
      }, SLOW);

      it(id + ': the clues are symmetric about the centre of the board (no centre cell)', function () {
        var D = b.digits;
        var givens = generate(id, 'veryEasy', 5).result.givens;
        for (var cell = 0; cell < givens.length; cell++) {
          var r = Math.floor(cell / D);
          var c = cell % D;
          var mirror = (D - 1 - r) * D + (D - 1 - c);
          expect(mirror).not.toBe(cell);
          expect(givens[cell] !== 0).toBe(givens[mirror] !== 0);
        }
      }, SLOW);

      it(id + ': every symmetry of the digger keeps its clue pattern and the unique solution', function () {
        SG.symmetry.KINDS.forEach(function (kind) {
          var result = generate(id, 'veryEasy', 6, { symmetry: kind }).result;
          expect(SG.dfs.countSolutions(result.model, result.givens, 2)).toBe(1);
          SG.symmetry.groups(result.model, kind).forEach(function (group) {
            var first = result.givens[group[0]] !== 0;
            for (var i = 1; i < group.length; i++) expect(result.givens[group[i]] !== 0).toBe(first);
          });
        });
      }, SLOW);

      it(id + ': a budget that is too small or already cancelled stops the pipeline', function () {
        var cfg = { variantId: id, difficulty: 'veryEasy', seed: 1, trace: 'off' };
        expectCode(function () { SG.pipeline.run(cfg, null, SG.budget.create({ nodes: 2 })); },
          'budget.exceeded');
        var cancelled = SG.budget.create();
        cancelled.cancel();
        expectCode(function () { SG.pipeline.run(cfg, null, cancelled); }, 'budget.cancelled');
      });
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

      IDS.forEach(function (id) {
        it(id + ': a full trace of ' + BOARDS[id].digits * BOARDS[id].digits + ' cells is kept and replays ' +
          'to the puzzle', function () {
          var out = replayed(id);
          expect(out.result.warnings).not.toContain('trace.downgraded');
          expect(Array.from(out.view.value)).toEqual(Array.from(out.result.givens));
        }, SLOW);

        it(id + ': the buildModel step reports the size of the board', function () {
          var events = [];
          SG.pipeline.run({ variantId: id, difficulty: 'veryEasy', seed: 1, trace: 'summary' },
            function (e) { events.push(e); });
          var built = events.filter(function (e) { return e.i18nKey === 'buildModel.model'; })[0];
          expect(built.i18nArgs.cellCount).toBe(BOARDS[id].digits * BOARDS[id].digits);
          expect(built.i18nArgs.digits).toBe(BOARDS[id].digits);
          expect(built.i18nArgs.rows).toBe(BOARDS[id].digits);
          expect(built.i18nArgs.cols).toBe(BOARDS[id].digits);
          expect(built.i18nArgs.units).toBe(3 * BOARDS[id].digits);
        });
      });
    });
  });

  // ===========================================================================================
  // Locale fragment (CV7)
  // ===========================================================================================

  describe('mega locale fragment', function () {
    function fragments() {
      return SG.localeFragments.filter(function (f) { return f.en && f.en['variant.mega12'] !== undefined; });
    }

    function fragment() {
      return fragments()[0];
    }

    function placeholders(text) {
      return (text.match(/\{[A-Za-z0-9_]+\}/g) || []).sort();
    }

    it('is published once in SG.localeFragments with an en and a vi pack', function () {
      expect(fragments()).toHaveLength(1);
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
        expect(placeholders(f.vi[key])).toEqual(placeholders(f.en[key]));
      });
    });

    it('names both variants, in the words of the design catalogue', function () {
      var f = fragment();
      expect(f.en['variant.mega12']).toBe('Mega Sudoku 12×12');
      expect(f.en['variant.mega16']).toBe('Monster Sudoku 16×16');
      expect(f.vi['variant.mega12']).toBe('Sudoku Khổng lồ 12×12');
      expect(f.vi['variant.mega16']).toBe('Sudoku Quái vật 16×16');
      IDS.forEach(function (id) {
        var def = SG.variants.get(id);
        expect(f.en[def.i18nKey]).toBeDefined();
        expect(f.vi[def.i18nKey]).toBeDefined();
        expect(f.en[def.i18nKey + '.desc']).toBeDefined();
        expect(f.vi[def.i18nKey + '.desc']).toBeDefined();
      });
    });

    it('translates the symbol set control: label, hint and every choice of both variants', function () {
      var f = fragment();
      IDS.forEach(function (id) {
        SG.variants.get(id).options.forEach(function (option) {
          [option.i18nKey, option.hintKey].concat(option.choices.map(function (c) { return c.i18nKey; }))
            .forEach(function (key) {
              expect(f.en[key]).toBeDefined();
              expect(f.vi[key]).toBeDefined();
            });
        });
      });
    });

    it('has no vi text that is just the English text', function () {
      var f = fragment();
      Object.keys(f.en).forEach(function (key) { expect(f.vi[key]).not.toBe(f.en[key]); });
    });
  });

  // ===========================================================================================
  // What the renderer reads (CV9, without a DOM)
  // ===========================================================================================

  describe('mega renderer contract', function () {
    /** Thick borders as board-view derives them: wherever two neighbouring cells lie in different regions. */
    function borders(m) {
      var D = m.digits;
      var vertical = {};
      var horizontal = {};
      for (var r = 0; r < D; r++) {
        for (var c = 0; c < D; c++) {
          var region = m.layout.cellRegion[r * D + c];
          if (c + 1 < D && m.layout.cellRegion[r * D + c + 1] !== region) vertical[c + 1] = true;
          if (r + 1 < D && m.layout.cellRegion[(r + 1) * D + c] !== region) horizontal[r + 1] = true;
        }
      }
      return {
        vertical: Object.keys(vertical).map(Number).sort(function (x, y) { return x - y; }),
        horizontal: Object.keys(horizontal).map(Number).sort(function (x, y) { return x - y; })
      };
    }

    it('mega12 draws thick lines after every 4th column and every 3rd row', function () {
      var found = borders(model('mega12'));
      expect(found.vertical).toEqual([4, 8]);
      expect(found.horizontal).toEqual([3, 6, 9]);
    });

    it('mega16 draws thick lines after every 4th column and every 4th row', function () {
      var found = borders(model('mega16'));
      expect(found.vertical).toEqual([4, 8, 12]);
      expect(found.horizontal).toEqual([4, 8, 12]);
    });

    it('the labels are 1 character wide, except the 2 of "10".."12" in the numbers set', function () {
      IDS.forEach(function (id) {
        Object.keys(BOARDS[id].sets).forEach(function (set) {
          var widest = 0;
          model(id, set).symbols.labels.forEach(function (label) {
            widest = Math.max(widest, label.length);
          });
          expect(widest).toBe(set === 'numbers' ? 2 : 1);
        });
      });
    });

    it('every digit of a grid has a label: labels[v - 1] exists for v in 1..D and nothing else', function () {
      IDS.forEach(function (id) {
        var m = model(id);
        var solution = SG.fullGrid.generate(m, SG.rng.create(8), null, {});
        for (var c = 0; c < solution.length; c++) {
          expect(typeof m.symbols.labels[solution[c] - 1]).toBe('string');
        }
        expect(m.symbols.labels[-1]).toBeUndefined();
        expect(m.symbols.labels[m.digits]).toBeUndefined();
      });
    });
  });

  // ===========================================================================================
  // Deep run (CV3 at full size): SG_DEEP=1
  // ===========================================================================================

  if (DEEP) {
    describe('mega deep run: 20 puzzles per level (SG_DEEP=1)', function () {
      IDS.forEach(function (id) {
        LEVELS.forEach(function (level) {
          it(id + ' ' + level + ': 20 seeds, hit rate and p95 time against section 9.1', function () {
            var exact = 0;
            var times = [];
            for (var seed = 1; seed <= 20; seed++) {
              var started = now();
              var config = { variantId: id, difficulty: level, seed: seed, trace: 'off' };
              var result = SG.pipeline.run(config, null, SG.budget.create({ ms: 120000 }));
              times.push(now() - started);
              if (result.rating.level === level) exact++;
              expect(SG.dfs.countSolutions(result.model, result.givens, 2)).toBe(1);
            }
            times.sort(function (a, b) { return a - b; });
            var index = { veryEasy: 0, easy: 1, medium: 1, hard: 2 }[level];
            expect(times[18]).toBeLessThan(BOARDS[id].budgets[index]);
            expect(exact / 20).toBeGreaterThanOrEqual(HIT_RATE);
          }, 600000);
        });
      });
    });
  }
})();
