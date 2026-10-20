// Puzzle model (create, state, labels, validation V1-V8) and the classic board builder of the player.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var F = SG.fixtures;

  function build(id) {
    return SG.classicModel.build({ classic4: 4, classic6: 6, classic9: 9 }[id]);
  }

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
  }

  /** A plain-array spec taken from a built model, ready to be damaged by a test. */
  function specOf(model) {
    var layout = model.layout;
    return {
      variantId: model.variantId,
      digits: model.digits,
      units: model.units.map(function (u) { return Array.from(u); }),
      unitMeta: model.unitMeta.map(function (m) { return Object.assign({}, m); }),
      layout: {
        rows: layout.rows,
        cols: layout.cols,
        cellRow: Array.from(layout.cellRow),
        cellCol: Array.from(layout.cellCol),
        cellRegion: Array.from(layout.cellRegion)
      }
    };
  }

  function errorsOf(model, options) {
    return SG.model.validate(model, options).errors;
  }

  function hasRule(errors, rule) {
    return errors.some(function (e) { return e.indexOf(rule + ':') === 0; });
  }

  // A complete valid 4x4 grid (boxes 2x2).
  var GRID4 = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];

  describe('model: classic9 construction', function () {
    var model = build('classic9');

    it('has 81 cells, 9 digits and 27 units (9 rows, 9 columns, 9 boxes)', function () {
      expect(model.cellCount).toBe(81);
      expect(model.digits).toBe(9);
      expect(model.variantId).toBe('classic9');
      expect(model.units).toHaveLength(27);
      var kinds = {};
      model.unitMeta.forEach(function (m) { kinds[m.kind] = (kinds[m.kind] || 0) + 1; });
      expect(kinds).toEqual({ row: 9, col: 9, box: 9 });
      model.units.forEach(function (u) { expect(u).toHaveLength(9); });
    });

    it('lists every cell in exactly three units', function () {
      for (var c = 0; c < 81; c++) {
        expect(model.cellUnits[c]).toHaveLength(3);
        for (var k = 0; k < 3; k++) expect(Array.from(model.units[model.cellUnits[c][k]])).toContain(c);
      }
    });

    it('gives peers[0] exactly 20 cells: the row, the column and the box', function () {
      expect(model.peers[0]).toHaveLength(20);
      var expected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 27, 36, 45, 54, 63, 72];
      expect(Array.from(model.peers[0])).toEqual(expected);
    });

    it('has 20 distinct peers for every cell, never the cell itself, in ascending order', function () {
      for (var c = 0; c < 81; c++) {
        var peers = Array.from(model.peers[c]);
        expect(peers).toHaveLength(20);
        expect(peers).not.toContain(c);
        expect(new Set(peers).size).toBe(20);
        expect(peers).toEqual(peers.slice().sort(function (a, b) { return a - b; }));
      }
    });

    it('has symmetric peers: b in peers[a] exactly when a in peers[b]', function () {
      for (var a = 0; a < 81; a++) {
        for (var b = 0; b < 81; b++) {
          var aHas = Array.from(model.peers[a]).indexOf(b) !== -1;
          var bHas = Array.from(model.peers[b]).indexOf(a) !== -1;
          expect(aHas).toBe(bHas);
        }
      }
    });

    it('lays the cells out row by row on a 9x9 canvas', function () {
      expect(model.layout.rows).toBe(9);
      expect(model.layout.cols).toBe(9);
      expect(model.layout.cellRow[40]).toBe(4);
      expect(model.layout.cellCol[40]).toBe(4);
      expect(model.layout.cellRow[80]).toBe(8);
      expect(model.layout.subGrids).toEqual([{ gridIndex: 0, originRow: 0, originCol: 0 }]);
    });

    it('has no cages, inequalities or fixed cells, and default digit symbols', function () {
      expect(model.cages).toEqual([]);
      expect(model.inequalities).toEqual([]);
      expect(Array.from(model.fixedCells)).toEqual(new Array(81).fill(0));
      expect(model.symbols.mode).toBe('digits');
      expect(model.symbols.labels).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    });

    it('is immutable at the top level', function () {
      expect(Object.isFrozen(model)).toBe(true);
      expect(Object.isFrozen(model.units)).toBe(true);
      expect(Object.isFrozen(model.peers)).toBe(true);
      expect(function () { 'use strict'; model.digits = 4; }).toThrow();
    });
  });

  describe('model: create', function () {
    it('rejects a malformed spec with model.invalidSpec', function () {
      var good = specOf(build('classic4'));
      function invalid(change) {
        expectCode(function () { SG.model.create(Object.assign({}, good, change)); }, 'model.invalidSpec');
      }
      expectCode(function () { SG.model.create(null); }, 'model.invalidSpec');
      invalid({ variantId: '' });
      invalid({ digits: 0 });
      invalid({ digits: 17 });
      invalid({ units: null });
      invalid({ layout: null });
      invalid({ layout: Object.assign({}, good.layout, { rows: 0 }) });
    });

    it('accepts typed arrays and plain arrays for units and layout alike', function () {
      var spec = specOf(build('classic4'));
      var typed = Object.assign({}, spec, {
        units: spec.units.map(function (u) { return Int32Array.from(u); }),
        layout: Object.assign({}, spec.layout, {
          cellRow: Int32Array.from(spec.layout.cellRow),
          cellCol: Int32Array.from(spec.layout.cellCol)
        })
      });
      var a = SG.model.create(spec);
      var b = SG.model.create(typed);
      expect(b.peers).toEqual(a.peers);
      expect(b.cellUnits).toEqual(a.cellUnits);
    });

    it('does not alias the arrays of the spec', function () {
      var spec = specOf(build('classic4'));
      var model = SG.model.create(spec);
      spec.units[0][0] = 99;
      spec.layout.cellRow[0] = 99;
      expect(model.units[0][0]).toBe(0);
      expect(model.layout.cellRow[0]).toBe(0);
    });

    it('normalises fixedCells given per cell or as [cell, value] pairs', function () {
      var spec = specOf(build('classic4'));
      var perCell = new Array(16).fill(0);
      perCell[5] = 3;
      var a = SG.model.create(Object.assign({}, spec, { fixedCells: perCell }));
      var b = SG.model.create(Object.assign({}, spec, { fixedCells: [[5, 3]] }));
      expect(a.fixedCells).toBeInstanceOf(Int32Array);
      expect(Array.from(a.fixedCells)).toEqual(perCell);
      expect(b.fixedCells).toEqual(a.fixedCells);
      expectCode(function () {
        SG.model.create(Object.assign({}, spec, { fixedCells: [[99, 1]] }));
      }, 'model.invalidSpec');
    });

    it('derives the cell regions from the box units when the layout has none', function () {
      var spec = specOf(build('classic4'));
      delete spec.layout.cellRegion;
      var model = SG.model.create(spec);
      expect(Array.from(model.layout.cellRegion)).toEqual([0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3]);
    });

    it('keeps cages and inequalities as normalised, distinct-by-default records', function () {
      var spec = specOf(build('classic4'));
      var model = SG.model.create(Object.assign({}, spec, {
        cages: [{ cells: [0, 1], sum: 3 }, { cells: [2, 3], sum: 7, distinct: false }],
        inequalities: [{ a: 0, b: 1 }]
      }));
      expect(model.cages[0].cells).toBeInstanceOf(Int32Array);
      expect(model.cages[0].distinct).toBe(true);
      expect(model.cages[1].distinct).toBe(false);
      expect(model.inequalities).toEqual([{ a: 0, b: 1 }]);
    });
  });

  describe('model: solve state', function () {
    var model = build('classic9');

    it('initState opens every digit in every cell', function () {
      var s = SG.model.initState(model);
      expect(s.candidates).toBeInstanceOf(Int32Array);
      expect(s.value).toBeInstanceOf(Int32Array);
      expect(s.candidates).toHaveLength(81);
      expect(Array.from(s.candidates)).toEqual(new Array(81).fill(511));
      expect(Array.from(s.value)).toEqual(new Array(81).fill(0));
      expect(s.unsolvedCount).toBe(81);
    });

    it('works for the largest digit count (16 digits fit in the candidate masks)', function () {
      var spec = specOf(build('classic4'));
      var n = 16;
      var layout = {
        rows: 1, cols: n, cellRow: new Array(n).fill(0), cellCol: [], cellRegion: new Array(n).fill(0)
      };
      for (var i = 0; i < n; i++) layout.cellCol.push(i);
      var wide = SG.model.create({
        variantId: 'wide16', digits: 16, units: [layout.cellCol.slice()], layout: layout
      });
      expect(spec.digits).toBe(4);
      expect(SG.model.initState(wide).candidates[0]).toBe(65535);
    });

    it('cloneState copies the data and does not share it', function () {
      var s = SG.model.initState(model);
      s.candidates[3] = 5;
      s.value[3] = 1;
      s.unsolvedCount = 80;
      var copy = SG.model.cloneState(s);
      expect(copy).not.toBe(s);
      expect(copy.candidates).not.toBe(s.candidates);
      expect(copy.candidates).toEqual(s.candidates);
      expect(copy.value).toEqual(s.value);
      expect(copy.unsolvedCount).toBe(80);
      copy.candidates[3] = 1;
      expect(s.candidates[3]).toBe(5);
    });

    it('cloneState(s, buf) writes into buf and allocates nothing new', function () {
      var s = SG.model.initState(model);
      s.candidates[10] = 7;
      s.value[10] = 3;
      s.unsolvedCount = 12;
      var buf = SG.model.initState(model);
      var candidates = buf.candidates;
      var value = buf.value;
      var out = SG.model.cloneState(s, buf);
      expect(out).toBe(buf);
      expect(out.candidates).toBe(candidates);
      expect(out.value).toBe(value);
      expect(buf.candidates).toEqual(s.candidates);
      expect(buf.value).toEqual(s.value);
      expect(buf.unsolvedCount).toBe(12);
      expect(buf.candidates).not.toBe(s.candidates);
    });
  });

  describe('model: cellLabel', function () {
    it('labels cells of a single grid R<row>C<col>, 1-based', function () {
      var model = build('classic9');
      expect(SG.model.cellLabel(model, 0)).toBe('R1C1');
      expect(SG.model.cellLabel(model, 33)).toBe('R4C7');
      expect(SG.model.cellLabel(model, 80)).toBe('R9C9');
      expect(SG.model.cellLabel(build('classic6'), 11)).toBe('R2C6');
    });

    it('prefixes the sub-grid for multi-grid layouts', function () {
      var model = F.models.samurai();
      function cellAtCanvas(r, c) {
        for (var i = 0; i < model.cellCount; i++) {
          if (model.layout.cellRow[i] === r && model.layout.cellCol[i] === c) return i;
        }
        return -1;
      }
      expect(SG.model.cellLabel(model, cellAtCanvas(0, 0))).toBe('G1-R1C1');
      expect(SG.model.cellLabel(model, cellAtCanvas(3, 6))).toBe('G1-R4C7');
      expect(SG.model.cellLabel(model, cellAtCanvas(0, 12))).toBe('G2-R1C1');
      expect(SG.model.cellLabel(model, cellAtCanvas(20, 20))).toBe('G4-R9C9');
      // Inside an overlap the first grid that holds the cell names it.
      expect(SG.model.cellLabel(model, cellAtCanvas(7, 7))).toBe('G1-R8C8');
      expect(SG.model.cellLabel(model, cellAtCanvas(10, 10))).toBe('G5-R5C5');
    });
  });

  describe('model: multi-grid construction (samurai-like, shared cells)', function () {
    var model = F.models.samurai();

    it('shares the cells of the overlaps: 369 cells, 135 units', function () {
      expect(model.cellCount).toBe(369);
      expect(model.units).toHaveLength(135);
      expect(model.layout.subGrids).toHaveLength(5);
      var shared = 0;
      for (var c = 0; c < model.cellCount; c++) if (model.cellUnits[c].length === 6) shared++;
      expect(shared).toBe(4 * 9);
    });

    it('has symmetric peers and passes V1-V7', function () {
      expect(errorsOf(model, { solve: false })).toEqual([]);
    });

    it('is solvable, or at worst inconclusive within the small trial budget', function () {
      var report = SG.model.validate(model);
      expect(report.ok).toBe(true);
    });
  });

  describe('model: validate', function () {
    it('accepts the classic variants, including the V8 trial solve', function () {
      ['classic4', 'classic6', 'classic9'].forEach(function (id) {
        var report = SG.model.validate(build(id));
        expect(report.errors).toEqual([]);
        expect(report.ok).toBe(true);
        expect(report.warnings).toEqual([]);
      });
    });

    it('V1: reports a unit with the wrong number of cells', function () {
      var spec = specOf(build('classic4'));
      spec.units[0] = [0, 1, 2];
      var errors = errorsOf(SG.model.create(spec));
      expect(hasRule(errors, 'V1')).toBe(true);
      expect(SG.model.validate(SG.model.create(spec)).ok).toBe(false);
    });

    it('V1: accepts a unit marked partial when it is smaller than D, rejects one larger than D', function () {
      var spec = specOf(build('classic4'));
      spec.units.push([0, 5, 10]);
      spec.unitMeta.push({ kind: 'diag', gridIndex: 0, label: 'X', partial: true });
      expect(SG.model.validate(SG.model.create(spec)).ok).toBe(true);
      spec.units[spec.units.length - 1] = [0, 1, 2, 3, 4];
      expect(hasRule(errorsOf(SG.model.create(spec)), 'V1')).toBe(true);
    });

    it('V1: reports a cell listed twice in one unit', function () {
      var spec = specOf(build('classic4'));
      spec.units[0] = [0, 0, 2, 3];
      expect(hasRule(errorsOf(SG.model.create(spec)), 'V1')).toBe(true);
    });

    it('V2: reports cell indices out of range without throwing', function () {
      var spec = specOf(build('classic4'));
      spec.units[3] = [0, 1, 2, 99];
      var errors = errorsOf(SG.model.create(spec));
      expect(hasRule(errors, 'V2')).toBe(true);
      spec.units[3] = [0, 1, 2, -1];
      expect(hasRule(errorsOf(SG.model.create(spec)), 'V2')).toBe(true);
    });

    it('V3: reports a cell that belongs to no unit', function () {
      var spec = specOf(build('classic4'));
      spec.layout.cellRow.push(5);
      spec.layout.cellCol.push(5);
      spec.layout.cellRegion.push(0);
      spec.layout.rows = 6;
      spec.layout.cols = 6;
      var model = SG.model.create(spec);
      expect(model.cellCount).toBe(17);
      var errors = errorsOf(model);
      expect(errors).toContain('V3: cell 16 belongs to no unit');
    });

    it('V4: reports peers that are not symmetric', function () {
      var model = build('classic4');
      var peers = model.peers.map(function (p) { return Int32Array.from(p); });
      peers[0] = peers[0].slice(1);
      var broken = Object.assign({}, model, { peers: peers });
      expect(hasRule(errorsOf(broken), 'V4')).toBe(true);
    });

    it('V5: reports two cells drawn at the same canvas position', function () {
      var spec = specOf(build('classic4'));
      spec.layout.cellRow[1] = spec.layout.cellRow[0];
      spec.layout.cellCol[1] = spec.layout.cellCol[0];
      var errors = errorsOf(SG.model.create(spec));
      expect(hasRule(errors, 'V5')).toBe(true);
      expect(errors.join(' ')).toContain('R1C1');
    });

    it('V5: reports a cell outside the canvas and layout arrays of the wrong length', function () {
      var spec = specOf(build('classic4'));
      spec.layout.cellRow[0] = 40;
      expect(hasRule(errorsOf(SG.model.create(spec)), 'V5')).toBe(true);
      spec = specOf(build('classic4'));
      spec.layout.cellRow.pop();
      expect(hasRule(errorsOf(SG.model.create(Object.assign(spec, { cellCount: 16 }))), 'V5')).toBe(true);
    });

    it('V6: checks that cages do not overlap and that their sums are feasible', function () {
      var spec = specOf(build('classic4'));
      function withCages(cages) { return SG.model.create(Object.assign({}, spec, { cages: cages })); }
      expect(errorsOf(withCages([{ cells: [0, 1], sum: 3 }, { cells: [2, 3], sum: 7 }]))).toEqual([]);
      var overlapping = withCages([{ cells: [0, 1], sum: 3 }, { cells: [1, 2], sum: 5 }]);
      expect(hasRule(errorsOf(overlapping), 'V6')).toBe(true);
      expect(hasRule(errorsOf(withCages([{ cells: [0, 1], sum: 2 }])), 'V6')).toBe(true);
      expect(hasRule(errorsOf(withCages([{ cells: [0, 1], sum: 8 }])), 'V6')).toBe(true);
      expect(hasRule(errorsOf(withCages([{ cells: [0, 1, 2, 3, 4], sum: 15 }])), 'V6')).toBe(true);
      expect(hasRule(errorsOf(withCages([{ cells: [0, 99], sum: 3 }])), 'V6')).toBe(true);
      // Without the all-different rule the range is size .. size * D.
      expect(errorsOf(withCages([{ cells: [0, 1], sum: 2, distinct: false }]))).toEqual([]);
    });

    it('V7: rejects an inequality of a cell with itself and any inequality cycle', function () {
      var spec = specOf(build('classic4'));
      function withIneq(list) { return SG.model.create(Object.assign({}, spec, { inequalities: list })); }
      expect(errorsOf(withIneq([{ a: 0, b: 1 }, { a: 1, b: 2 }]))).toEqual([]);
      expect(hasRule(errorsOf(withIneq([{ a: 3, b: 3 }])), 'V7')).toBe(true);
      expect(hasRule(errorsOf(withIneq([{ a: 0, b: 1 }, { a: 1, b: 0 }])), 'V7')).toBe(true);
      expect(hasRule(errorsOf(withIneq([{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 0 }])), 'V7')).toBe(true);
      expect(hasRule(errorsOf(withIneq([{ a: 0, b: 40 }])), 'V7')).toBe(true);
    });

    it('V8: reports a model that has no solution at all', function () {
      // Four cells that all see each other but only two digits exist.
      var units = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
      var model = SG.model.create({
        variantId: 'k4-two-digits',
        digits: 2,
        units: units,
        layout: { rows: 2, cols: 2, cellRow: [0, 0, 1, 1], cellCol: [0, 1, 0, 1], cellRegion: [0, 0, 0, 0] }
      });
      var report = SG.model.validate(model);
      expect(report.ok).toBe(false);
      expect(hasRule(report.errors, 'V8')).toBe(true);
      expect(SG.model.validate(model, { solve: false }).ok).toBe(true);
    });

    it('V8: reports fixed cells that contradict each other', function () {
      var spec = specOf(build('classic4'));
      var fixed = new Array(16).fill(0);
      fixed[0] = 1;
      fixed[1] = 1;
      var report = SG.model.validate(SG.model.create(Object.assign({}, spec, { fixedCells: fixed })));
      expect(report.ok).toBe(false);
      expect(hasRule(report.errors, 'V8')).toBe(true);
    });

    it('V8: reports fixed cells that hold something other than a digit', function () {
      var spec = specOf(build('classic4'));
      var fixed = new Array(16).fill(0);
      fixed[3] = 7;
      var report = SG.model.validate(SG.model.create(Object.assign({}, spec, { fixedCells: fixed })));
      expect(report.ok).toBe(false);
      expect(hasRule(report.errors, 'V8')).toBe(true);
    });

    it('V8: accepts consistent fixed cells', function () {
      var spec = specOf(build('classic4'));
      var fixed = new Array(16).fill(0);
      fixed[0] = 1;
      fixed[5] = 2;
      var model = SG.model.create(Object.assign({}, spec, { fixedCells: fixed }));
      expect(SG.model.validate(model).ok).toBe(true);
    });

    it('V8: a trial solve that runs out of budget is a warning, not an error', function () {
      var model = F.models.samurai();
      var report = SG.model.validate(model, { budget: SG.budget.create({ nodes: 3 }) });
      expect(report.ok).toBe(true);
      expect(report.warnings).toHaveLength(1);
      expect(report.warnings[0]).toContain('V8');
    });

    it('does not run V8 on a structurally broken model', function () {
      var spec = specOf(build('classic4'));
      spec.units[0] = [0, 1, 2];
      var errors = errorsOf(SG.model.create(spec));
      expect(hasRule(errors, 'V8')).toBe(false);
    });
  });

  describe('model: isSolution', function () {
    it('accepts a valid classic9 solution and rejects broken ones', function () {
      var model = build('classic9');
      var solution = F.classic.parse(F.classic.unique[0].solution);
      expect(SG.model.isSolution(model, solution)).toBe(true);
      var swapped = Int32Array.from(solution);
      swapped[0] = solution[1];
      swapped[1] = solution[0];
      expect(SG.model.isSolution(model, swapped)).toBe(false);
      var zero = Int32Array.from(solution);
      zero[40] = 0;
      expect(SG.model.isSolution(model, zero)).toBe(false);
      expect(SG.model.isSolution(model, solution.slice(1))).toBe(false);
      var big = Int32Array.from(solution);
      big[0] = 10;
      expect(SG.model.isSolution(model, big)).toBe(false);
    });

    it('checks cage sums, the distinct rule inside cages, and inequalities', function () {
      var spec = specOf(build('classic4'));
      function check(extra) {
        return SG.model.isSolution(SG.model.create(Object.assign({}, spec, extra)), GRID4);
      }
      expect(check({})).toBe(true);
      expect(check({ cages: [{ cells: [0, 1], sum: 3 }, { cells: [2, 3], sum: 7 }] })).toBe(true);
      expect(check({ cages: [{ cells: [0, 1], sum: 4 }] })).toBe(false);
      expect(check({ inequalities: [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }] })).toBe(true);
      expect(check({ inequalities: [{ a: 1, b: 0 }] })).toBe(false);
    });
  });

  describe('classic model builder (SG.classicModel)', function () {
    it('all build a model that passes validate (V1-V8)', function () {
      ['classic4', 'classic6', 'classic9'].forEach(function (id) {
        var model = build(id);
        expect(model.variantId).toBe(id);
        expect(SG.model.validate(model).ok).toBe(true);
      });
    });

    it('have the expected sizes', function () {
      var expected = { classic4: [4, 16, 12], classic6: [6, 36, 18], classic9: [9, 81, 27] };
      Object.keys(expected).forEach(function (id) {
        var model = build(id);
        expect(model.digits).toBe(expected[id][0]);
        expect(model.cellCount).toBe(expected[id][1]);
        expect(model.units).toHaveLength(expected[id][2]);
      });
    });

    it('knows the variant id of each size and refuses the others', function () {
      expect(SG.classicModel.DIGITS).toEqual([4, 6, 9]);
      expect(SG.classicModel.variantIdOf(6)).toBe('classic6');
      expect(SG.classicModel.variantIdOf(12)).toBeNull();
      expectCode(function () { SG.classicModel.build(5); }, 'model.invalidSpec');
    });

    it('classic4 has 2x2 boxes', function () {
      var model = build('classic4');
      expect(Array.from(model.layout.cellRegion)).toEqual([0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3]);
    });

    it('classic6 has boxes of 2 rows x 3 columns, not 3 rows x 2 columns', function () {
      var model = build('classic6');
      var region = model.layout.cellRegion;
      function at(r, c) { return region[r * 6 + c]; }
      expect(at(0, 0)).toBe(at(0, 2));
      expect(at(0, 0)).toBe(at(1, 2));
      expect(at(0, 0)).not.toBe(at(2, 0));
      expect(at(0, 0)).not.toBe(at(0, 3));
      expect(at(2, 0)).toBe(2);
      expect(at(0, 3)).toBe(1);
      var boxes = model.units.filter(function (u, i) { return model.unitMeta[i].kind === 'box'; });
      expect(boxes).toHaveLength(6);
      expect(Array.from(boxes[0])).toEqual([0, 1, 2, 6, 7, 8]);
      expect(Array.from(boxes[1])).toEqual([3, 4, 5, 9, 10, 11]);
      // Every box spans exactly 2 distinct rows and 3 distinct columns.
      boxes.forEach(function (box) {
        var rows = new Set(Array.from(box).map(function (c) { return Math.floor(c / 6); }));
        var cols = new Set(Array.from(box).map(function (c) { return c % 6; }));
        expect(rows.size).toBe(2);
        expect(cols.size).toBe(3);
      });
    });

    it('classic9 has 3x3 boxes numbered row by row', function () {
      var model = build('classic9');
      expect(model.layout.cellRegion[0]).toBe(0);
      expect(model.layout.cellRegion[3]).toBe(1);
      expect(model.layout.cellRegion[27]).toBe(3);
      expect(model.layout.cellRegion[80]).toBe(8);
    });

    it('build returns an independent model on every call', function () {
      expect(SG.classicModel.build(9)).not.toBe(SG.classicModel.build(9));
    });
  });
})();
