// Techniques of the `basic` and `locked` groups (../core/js/engine/tech-basic.js):
// nakedSingle, hiddenSingleBox, hiddenSingleLine, pointing and boxLine.
//
// Three kinds of evidence:
//   - positive and negative fixtures per technique, written with H.expectFinding / H.expectNoFinding. The
//     classic9 fixtures use real puzzles and hand-made candidate grids (every candidate present except a
//     list of eliminations, taken from a known solution, so the helper can check them against it);
//   - the same fixtures on units that are not rectangles: a Jigsaw model, hyper windows, diagonals,
//     digit counts 4, 6, 12 and 16 and the overlapping boards of a Samurai;
//   - the soundness guard of invariant I7 (H.assertSound) on the boards above (classic9 is in the sweep of
//     techniques.test.js) and a differential check against a naive reference scan that finds the shared
//     lines through the `cellUnits` of the candidate cells.
// The empty and the solved board are covered for every technique by techniques.test.js.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.techHelper;
  var F = SG.fixtures.classic;
  var M = SG.fixtures.models;

  var IDS = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine'];
  var BASICS = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine'];
  var model9 = H.model('classic9');
  var model6 = H.model('classic6');
  var model4 = H.model('classic4');

  // Wikipedia example: the solution is used by the hand-made classic9 fixtures.
  var SOL9 = F.unique[0].solution;
  // Rows 1234 / 3412 / 2143 / 4321.
  var SOL4 = '1234341221434321';
  // SudokuWiki's pointing pair example; once the singles are used up it holds a pointing pair in row 2 (the
  // 3s of box 3) and a box/line reduction in row 3 (the 3s of box 1).
  var WIKI_LOCKED = ['017903600', '000080000', '900000507', '072010430', '000402070', '064370250',
    '701000065', '000030000', '005601720'].join('');

  function puzzle(name) {
    for (var i = 0; i < F.unique.length; i++) if (F.unique[i].name === name) return F.unique[i];
    throw new Error('no fixture puzzle named ' + name);
  }

  // Models that are not plain boxes
  var cache = {};

  function once(key, build) {
    if (!cache[key]) cache[key] = build();
    return cache[key];
  }

  /** Regions of the 6x6 Jigsaw below, row by row. None of them is a rectangle. */
  var JIGSAW6 = [
    [0, 0, 0, 1, 1, 1],
    [0, 2, 2, 2, 1, 1],
    [0, 0, 2, 3, 3, 1],
    [4, 2, 2, 3, 3, 3],
    [4, 4, 4, 4, 3, 5],
    [4, 5, 5, 5, 5, 5]
  ];

  function jigsaw6() {
    return once('jigsaw6', function () {
      var D = 6;
      var units = [];
      var meta = [];
      var cellRow = [];
      var cellCol = [];
      var region = [];
      var r;
      var c;
      for (r = 0; r < D; r++) {
        for (c = 0; c < D; c++) {
          cellRow.push(r);
          cellCol.push(c);
          region.push(JIGSAW6[r][c]);
        }
      }
      function cellsWhere(test) {
        var out = [];
        for (var i = 0; i < D * D; i++) if (test(i)) out.push(i);
        return out;
      }
      for (r = 0; r < D; r++) {
        units.push(cellsWhere(function (i) { return cellRow[i] === r; }));
        meta.push({ kind: 'row', label: 'R' + (r + 1) });
      }
      for (c = 0; c < D; c++) {
        units.push(cellsWhere(function (i) { return cellCol[i] === c; }));
        meta.push({ kind: 'col', label: 'C' + (c + 1) });
      }
      for (var k = 0; k < D; k++) {
        units.push(cellsWhere(function (i) { return region[i] === k; }));
        meta.push({ kind: 'region', label: 'J' + (k + 1) });
      }
      return SG.model.create({
        variantId: 'test-jigsaw6',
        digits: D,
        units: units,
        unitMeta: meta,
        layout: { rows: D, cols: D, cellRow: cellRow, cellCol: cellCol, cellRegion: region }
      });
    });
  }

  /** `base` plus extra all-different units, for windows, diagonals and partial units. */
  function withUnits(base, variantId, extraUnits, extraMeta) {
    return SG.model.create({
      variantId: variantId,
      digits: base.digits,
      units: base.units.map(function (u) { return Array.from(u); }).concat(extraUnits),
      unitMeta: base.unitMeta.concat(extraMeta),
      layout: base.layout
    });
  }

  /** classic9 plus the four 3x3 hyper windows (kind 'window', labels W1..W4). */
  function hyper9() {
    return once('hyper9', function () {
      var units = [];
      var meta = [];
      [[1, 1], [1, 5], [5, 1], [5, 5]].forEach(function (origin, k) {
        var cells = [];
        for (var r = 0; r < 3; r++) {
          for (var c = 0; c < 3; c++) cells.push((origin[0] + r) * 9 + origin[1] + c);
        }
        units.push(cells);
        meta.push({ kind: 'window', label: 'W' + (k + 1) });
      });
      return withUnits(model9, 'test-hyper9', units, meta);
    });
  }

  /** classic9 plus both main diagonals (kind 'diag', labels D1 and D2). */
  function diag9() {
    return once('diag9', function () {
      var down = [];
      var up = [];
      for (var i = 0; i < 9; i++) {
        down.push(i * 9 + i);
        up.push(i * 9 + 8 - i);
      }
      return withUnits(model9, 'test-diag9', [down, up],
        [{ kind: 'diag', label: 'D1' }, { kind: 'diag', label: 'D2' }]);
    });
  }

  /**
   * classic4 plus two partial units of three cells: a digit does not have to appear in them. P1 holds R1C1,
   * R2C3 and R4C2; Q1 holds R2C1, R2C4 and R4C1, so two of its cells lie in row 2.
   */
  function partial4() {
    return once('partial4', function () {
      return withUnits(model4, 'test-partial4', [[0, 6, 13], [4, 7, 12]], [
        { kind: 'region', label: 'P1', partial: true },
        { kind: 'region', label: 'Q1', partial: true }
      ]);
    });
  }

  function box12() {
    return once('box12', function () { return M.boxGrid('test-box12', 3, 4); });
  }

  function box16() {
    return once('box16', function () { return M.boxGrid('test-box16', 4, 4); });
  }

  function samurai() {
    return once('samurai', function () { return M.samurai(); });
  }

  /** A full valid grid of `model`, found once (deterministic seed). */
  function solutionOf(model) {
    return once('solution:' + model.variantId, function () {
      return SG.testkit.randomSolution(model, SG.testkit.rng.create(11));
    });
  }

  // Fixture builders
  function cells(model, refs) {
    return refs.map(function (ref) { return H.cell(model, ref); });
  }

  function unitCells(model, label) {
    for (var u = 0; u < model.units.length; u++) {
      if (model.unitMeta[u].label === label) return Array.from(model.units[u]);
    }
    throw new Error('no unit labelled ' + label);
  }

  /** [cell, digit] pairs that remove `digit` from every cell of the unit that is not listed in `keep`. */
  function confine(model, unitLabel, keep, digit) {
    var kept = cells(model, keep);
    return unitCells(model, unitLabel).filter(function (c) { return kept.indexOf(c) === -1; })
      .map(function (c) { return [c, digit]; });
  }

  function givensOf(model, byLabel) {
    var givens = new Int32Array(model.cellCount);
    Object.keys(byLabel).forEach(function (label) { givens[H.cell(model, label)] = byLabel[label]; });
    return givens;
  }

  /**
   * A hand-made state: every candidate present except `pairs`, nothing propagated, so singles stay open.
   * `opts` goes to H.expectFinding and carries the known solution. The pairs must keep it possible.
   */
  function fixture(model, solution, pairs) {
    var sol = H.parsePuzzle(model, solution);
    var state = H.makeState(model, new Int32Array(model.cellCount), { eliminate: pairs, propagate: false });
    for (var c = 0; c < model.cellCount; c++) {
      if ((state.candidates[c] & (1 << (sol[c] - 1))) === 0) {
        throw new Error('bad fixture: the solution digit of ' + H.label(model, c) + ' was eliminated');
      }
    }
    return { state: state, opts: { solution: sol } };
  }

  function pairsOf(model, cellRefs, digit) {
    return cells(model, cellRefs).map(function (c) { return [c, digit]; });
  }

  function expectOne(id, fx, expected) {
    return H.expectFinding(SG.test, id, fx.state, expected, fx.opts);
  }

  function expectNone(id, fx) {
    H.expectNoFinding(SG.test, id, fx.state, fx.opts);
  }

  function rawState(model, text) {
    return H.makeState(model, text, { propagate: false });
  }

  function afterBasics(name) {
    return H.stateAfter(model9, puzzle(name).puzzle, BASICS);
  }

  function find(id, model, state, ctx) {
    return SG.techniques.get(id).find(model, state, ctx || SG.techniques.createContext(model, {}));
  }

  describe('tech-basic: registration', function () {
    var EXPECTED = {
      nakedSingle: { group: 'basic', baseCost: 1, order: 10 },
      hiddenSingleBox: { group: 'basic', baseCost: 2, order: 20 },
      hiddenSingleLine: { group: 'basic', baseCost: 3, order: 30 },
      pointing: { group: 'locked', baseCost: 7, order: 40 },
      boxLine: { group: 'locked', baseCost: 7, order: 50 }
    };

    IDS.forEach(function (id) {
      it(id + ' is registered with the ladder values of design.md section 6.6', function () {
        var def = SG.techniques.get(id);
        expect(def.group).toBe(EXPECTED[id].group);
        expect(def.baseCost).toBe(EXPECTED[id].baseCost);
        expect(def.order).toBe(EXPECTED[id].order);
        expect(def.i18nKey).toBe('technique.' + id);
        expect(def.variantScope).toBeNull();
        expect(def.assumesUniqueness).toBe(false);
      });
    });

    it('the five techniques come out of the registry cheapest first', function () {
      var ids = SG.techniques.list().map(function (def) { return def.id; })
        .filter(function (id) { return IDS.indexOf(id) !== -1; });
      expect(ids).toEqual(IDS);
    });

    it('every Finding names its technique and carries i18n keys and plain args', function () {
      var raw = rawState(model9, puzzle('wikipedia-example').puzzle);
      IDS.forEach(function (id) {
        var finding = find(id, model9, raw);
        expect(finding).not.toBeNull();
        expect(finding.technique).toBe(id);
        expect(finding.i18nKey).toBe('technique.' + id + '.step');
        expect(JSON.parse(JSON.stringify(finding.i18nArgs))).toEqual(finding.i18nArgs);
      });
    });
  });

  describe('nakedSingle', function () {
    it('places the last candidate of a row (positive 1)', function () {
      var state = rawState(model9, '12345678.' + new Array(73).join('0'));
      H.expectFinding(SG.test, 'nakedSingle', state, {
        placements: [['R1C9', 9]],
        eliminations: [],
        cells: ['R1C9'],
        args: { cell: 'R1C9', digit: 9 }
      });
    });

    it('sees the row, the column and the box together (positive 2)', function () {
      var givens = givensOf(model9, {
        R5C1: 1, R5C2: 2, R5C3: 3, R1C5: 4, R9C5: 5, R4C4: 6, R6C6: 7, R4C6: 8
      });
      H.expectFinding(SG.test, 'nakedSingle', H.makeState(model9, givens, { propagate: false }), {
        placements: [['R5C5', 9]],
        cells: ['R5C5']
      });
    });

    it('works on a 4x4 grid (positive 3)', function () {
      var state = rawState(model4, '123.............');
      H.expectFinding(SG.test, 'nakedSingle', state, { placements: [['R1C4', 4]], cells: ['R1C4'] });
    });

    it('finds the first naked single of real puzzles (positive 4)', function () {
      H.expectFinding(SG.test, 'nakedSingle', rawState(model9, puzzle('wikipedia-example').puzzle),
        { placements: [['R5C5', 5]] });
      H.expectFinding(SG.test, 'nakedSingle', rawState(model9, puzzle('classic-easy-2').puzzle),
        { placements: [['R1C2', 3]] });
    });

    it('reports the lowest cell index first and nothing about the others', function () {
      var text = '12345678.' + new Array(64).join('0') + '.12345678';
      var finding = H.expectFinding(SG.test, 'nakedSingle', rawState(model9, text), {
        placements: [['R1C9', 9]]
      });
      expect(finding.placements).toHaveLength(1);
    });

    it('needs no propagation fixpoint: pending singles elsewhere do not matter', function () {
      var state = rawState(model9, puzzle('classic-easy').puzzle);
      var finding = find('nakedSingle', model9, state);
      expect(finding).not.toBeNull();
      expect(state.value[finding.placements[0][0]]).toBe(0);
    });

    it('finds nothing in puzzles that need more than hidden singles (negative 1)', function () {
      ['hard-nugget', 'worlds-hardest-2012', 'hard-c'].forEach(function (name) {
        H.expectNoFinding(SG.test, 'nakedSingle', rawState(model9, puzzle(name).puzzle));
      });
    });

    it('finds nothing once every naked single has been placed (negative 2)', function () {
      H.expectNoFinding(SG.test, 'nakedSingle', H.stateAfter(model9, puzzle('classic-medium').puzzle,
        ['nakedSingle']));
    });

    it('never reports a solved cell, although its only candidate is its own value (negative 3)', function () {
      var solved = rawState(model9, SOL9);
      expect(solved.unsolvedCount).toBe(0);
      H.expectNoFinding(SG.test, 'nakedSingle', solved);
    });

    it('ignores a cell without any candidate', function () {
      var state = rawState(model4, new Array(17).join('0'));
      state.candidates[5] = 0;
      expect(find('nakedSingle', model4, state)).toBeNull();
    });
  });

  describe('hiddenSingleBox', function () {
    it('finds the only cell for a digit in a box (positive 1)', function () {
      var fx = fixture(model9, SOL9, confine(model9, 'B5', ['R5C5'], 5));
      expectOne('hiddenSingleBox', fx, {
        placements: [['R5C5', 5]],
        eliminations: [],
        cells: ['R5C5'],
        args: { cell: 'R5C5', digit: 5, unit: 'B5', unitKind: 'box' }
      });
    });

    it('finds it in a corner box, away from the centre (positive 2)', function () {
      var fx = fixture(model9, SOL9, confine(model9, 'B3', ['R2C9'], 8));
      expectOne('hiddenSingleBox', fx, {
        placements: [['R2C9', 8]],
        args: { unit: 'B3', unitKind: 'box', digit: 8 }
      });
    });

    it('works on a 4x4 grid (positive 3)', function () {
      var fx = fixture(model4, SOL4, confine(model4, 'B4', ['R4C4'], 1));
      expectOne('hiddenSingleBox', fx, { placements: [['R4C4', 1]], args: { unit: 'B4' } });
    });

    it('works on real puzzles (positive 4)', function () {
      H.expectFinding(SG.test, 'hiddenSingleBox', rawState(model9, puzzle('wikipedia-example').puzzle),
        { placements: [['R1C6', 8]], args: { unit: 'B2' } });
      H.expectFinding(SG.test, 'hiddenSingleBox', rawState(model9, puzzle('escargot').puzzle),
        { placements: [['R8C3', 1]], args: { unit: 'B7' } });
      H.expectFinding(SG.test, 'hiddenSingleBox', rawState(model9, puzzle('hard-a').puzzle),
        { placements: [['R5C2', 7]], args: { unit: 'B4' } });
    });

    it('names a Jigsaw region as the unit (positive 5, units that are not rectangles)', function () {
      var m = jigsaw6();
      var sol = solutionOf(m);
      var digit = sol[H.cell(m, 'R2C3')];
      var fx = fixture(m, sol, confine(m, 'J3', ['R2C3'], digit));
      expectOne('hiddenSingleBox', fx, {
        placements: [['R2C3', digit]],
        args: { unit: 'J3', unitKind: 'region' }
      });
    });

    it('covers diagonals and hyper windows too (positive 6)', function () {
      var d = diag9();
      var dsol = solutionOf(d);
      var dd = dsol[H.cell(d, 'R4C4')];
      expectOne('hiddenSingleBox', fixture(d, dsol, confine(d, 'D1', ['R4C4'], dd)), {
        placements: [['R4C4', dd]],
        args: { unit: 'D1', unitKind: 'diag' }
      });

      var h = hyper9();
      var hsol = solutionOf(h);
      var hd = hsol[H.cell(h, 'R3C7')];
      expectOne('hiddenSingleBox', fixture(h, hsol, confine(h, 'W2', ['R3C7'], hd)), {
        placements: [['R3C7', hd]],
        args: { unit: 'W2', unitKind: 'window' }
      });
    });

    it('is not attributed to rows or columns that it also happens to sit in (attribution)', function () {
      var fx = fixture(model9, SOL9, confine(model9, 'B5', ['R5C5'], 5));
      expectNone('hiddenSingleLine', fx);
      expectNone('nakedSingle', fx);
    });

    it('names the box when a cell is hidden in a box and in a row at once (attribution)', function () {
      var raw = rawState(model9, puzzle('classic-easy-2').puzzle);
      var inBox = find('hiddenSingleBox', model9, raw);
      var inLine = find('hiddenSingleLine', model9, raw);
      expect(inBox.placements).toEqual([[0, 4]]);
      expect(inLine.placements).toEqual([[0, 4]]);
      expect(inBox.i18nArgs.unit).toBe('B1');
      expect(inLine.i18nArgs.unit).toBe('R1');
    });

    it('finds nothing when every digit has two cells in every box (negative 1)', function () {
      H.expectNoFinding(SG.test, 'hiddenSingleBox', rawState(model9, new Array(82).join('0')));
    });

    it('finds nothing in puzzles that need more than singles (negative 2)', function () {
      ['hard-nugget', 'worlds-hardest-2012', 'hard-c'].forEach(function (name) {
        H.expectNoFinding(SG.test, 'hiddenSingleBox', rawState(model9, puzzle(name).puzzle));
      });
    });

    it('finds nothing when the only cell sits in a row or a column unit (negative 3)', function () {
      var row = fixture(model9, SOL9, confine(model9, 'R5', ['R5C5'], 5));
      expectNone('hiddenSingleBox', row);
      var col = fixture(model9, SOL9, confine(model9, 'C7', ['R3C7'], 5));
      expectNone('hiddenSingleBox', col);
    });

    it('does not report a digit that is already placed in the unit', function () {
      var state = rawState(model9, '5' + new Array(81).join('0'));
      // A stale candidate: R2C2 shows 5 again although R1C1 holds it. Only R2C2 has it left in box 1.
      state.candidates[10] |= 1 << 4;
      expect(find('hiddenSingleBox', model9, state)).toBeNull();
    });

    it('only trusts complete units: a partial unit may miss a digit (negative 4)', function () {
      var m = partial4();
      var sol = solutionOf(m);
      var digit = sol[H.cell(m, 'R1C1')];
      var pairs = [[H.cell(m, 'R2C3'), digit], [H.cell(m, 'R4C2'), digit]];
      var fx = fixture(m, sol, pairs);
      var completeUnits = SG.techniques.createContext(m, {}).completeUnits;
      expect(completeUnits[m.units.length - 1]).toBe(0);
      expect(completeUnits[m.units.length - 2]).toBe(0);
      expectNone('hiddenSingleBox', fx);
      expectNone('hiddenSingleLine', fx);
      // The ordinary box of the same model still works.
      var box = fixture(m, sol, confine(m, 'B1', ['R2C2'], sol[H.cell(m, 'R2C2')]));
      expectOne('hiddenSingleBox', box, { placements: [['R2C2', sol[H.cell(m, 'R2C2')]]] });
    });

    it('honours ctx.completeUnits', function () {
      var fx = fixture(model9, SOL9, confine(model9, 'B5', ['R5C5'], 5));
      var ctx = SG.techniques.createContext(model9, {});
      expect(find('hiddenSingleBox', model9, fx.state, ctx)).not.toBeNull();
      var none = Object.assign({}, ctx, { completeUnits: new Uint8Array(model9.units.length) });
      expect(find('hiddenSingleBox', model9, fx.state, none)).toBeNull();
    });
  });

  describe('hiddenSingleLine', function () {
    it('finds the only cell for a digit in a row (positive 1)', function () {
      var fx = fixture(model9, SOL9, confine(model9, 'R5', ['R5C5'], 5));
      expectOne('hiddenSingleLine', fx, {
        placements: [['R5C5', 5]],
        eliminations: [],
        cells: ['R5C5'],
        args: { cell: 'R5C5', digit: 5, unit: 'R5', unitKind: 'row' }
      });
    });

    it('finds the only cell for a digit in a column (positive 2)', function () {
      var fx = fixture(model9, SOL9, confine(model9, 'C7', ['R3C7'], 5));
      expectOne('hiddenSingleLine', fx, {
        placements: [['R3C7', 5]],
        args: { unit: 'C7', unitKind: 'col', digit: 5 }
      });
    });

    it('works on a 6x6 grid with 2x3 boxes (positive 3)', function () {
      var sol = solutionOf(model6);
      var digit = sol[H.cell(model6, 'R4C2')];
      expectOne('hiddenSingleLine', fixture(model6, sol, confine(model6, 'R4', ['R4C2'], digit)), {
        placements: [['R4C2', digit]],
        args: { unit: 'R4', unitKind: 'row' }
      });
      var cd = sol[H.cell(model6, 'R5C6')];
      expectOne('hiddenSingleLine', fixture(model6, sol, confine(model6, 'C6', ['R5C6'], cd)), {
        placements: [['R5C6', cd]],
        args: { unit: 'C6', unitKind: 'col' }
      });
    });

    it('works on real puzzles, in rows and in columns (positive 4)', function () {
      H.expectFinding(SG.test, 'hiddenSingleLine', rawState(model9, puzzle('wikipedia-example').puzzle),
        { placements: [['R3C7', 5]], args: { unit: 'R3', unitKind: 'row' } });
      H.expectFinding(SG.test, 'hiddenSingleLine', rawState(model9, puzzle('escargot').puzzle),
        { placements: [['R8C3', 1]], args: { unit: 'C3', unitKind: 'col' } });
      H.expectFinding(SG.test, 'hiddenSingleLine', rawState(model9, puzzle('hard-platinum').puzzle),
        { placements: [['R9C3', 5]], args: { unit: 'R9' } });
    });

    it('reads rows and columns of a Jigsaw, whatever its regions look like (positive 5)', function () {
      var m = jigsaw6();
      var sol = solutionOf(m);
      var digit = sol[H.cell(m, 'R3C4')];
      expectOne('hiddenSingleLine', fixture(m, sol, confine(m, 'R3', ['R3C4'], digit)), {
        placements: [['R3C4', digit]],
        args: { unit: 'R3', unitKind: 'row' }
      });
    });

    it('is not attributed to boxes that it also happens to sit in (attribution)', function () {
      expectNone('hiddenSingleBox', fixture(model9, SOL9, confine(model9, 'R5', ['R5C5'], 5)));
      expectNone('hiddenSingleBox', fixture(model9, SOL9, confine(model9, 'C7', ['R3C7'], 5)));
    });

    it('the solver tries the box before the row and the column, then the line', function () {
      var givens = givensOf(model9, { R2C4: 1, R3C7: 1, R5C2: 1, R8C3: 1 });
      var withBoth = SG.logicalSolver.solve(model9, givens, { allowedTechniques: BASICS });
      expect(withBoth.steps[0].technique).toBe('hiddenSingleBox');
      expect(withBoth.steps[0].placements).toEqual([[0, 1]]);
      var noBox = SG.logicalSolver.solve(model9, givens,
        { allowedTechniques: ['nakedSingle', 'hiddenSingleLine'] });
      expect(noBox.steps[0].technique).toBe('hiddenSingleLine');
      expect(noBox.steps[0].placements).toEqual([[0, 1]]);
    });

    it('finds nothing in puzzles that need more than singles (negative 1)', function () {
      ['hard-nugget', 'worlds-hardest-2012', 'hard-c'].forEach(function (name) {
        H.expectNoFinding(SG.test, 'hiddenSingleLine', rawState(model9, puzzle(name).puzzle));
      });
    });

    it('finds nothing when the only cell sits in a box unit (negative 2)', function () {
      expectNone('hiddenSingleLine', fixture(model9, SOL9, confine(model9, 'B5', ['R5C5'], 5)));
      var m = jigsaw6();
      var sol = solutionOf(m);
      var digit = sol[H.cell(m, 'R2C3')];
      expectNone('hiddenSingleLine', fixture(m, sol, confine(m, 'J3', ['R2C3'], digit)));
    });

    it('honours ctx.completeUnits', function () {
      var fx = fixture(model9, SOL9, confine(model9, 'R5', ['R5C5'], 5));
      var ctx = SG.techniques.createContext(model9, {});
      expect(find('hiddenSingleLine', model9, fx.state, ctx)).not.toBeNull();
      var none = Object.assign({}, ctx, { completeUnits: new Uint8Array(model9.units.length) });
      expect(find('hiddenSingleLine', model9, fx.state, none)).toBeNull();
    });
  });

  describe('pointing', function () {
    var ROW1 = ['R1C4', 'R1C5', 'R1C6', 'R1C7', 'R1C8', 'R1C9'];

    function rowPairFixture() {
      // 5 in box 1 only at R1C1 and R1C2: both are in row 1.
      return fixture(model9, SOL9, confine(model9, 'B1', ['R1C1', 'R1C2'], 5));
    }

    it('a pair along a row removes the digit from the rest of the row (positive 1)', function () {
      expectOne('pointing', rowPairFixture(), {
        eliminations: pairsOf(model9, ROW1, 5),
        placements: [],
        cells: ['R1C1', 'R1C2'],
        args: { digit: 5, count: 2, box: 'B1', line: 'R1' }
      });
    });

    it('a triple along a column removes the digit from the rest of the column (positive 2)', function () {
      var fx = fixture(model9, SOL9, confine(model9, 'B5', ['R4C5', 'R5C5', 'R6C5'], 6));
      expectOne('pointing', fx, {
        eliminations: pairsOf(model9, ['R1C5', 'R2C5', 'R3C5', 'R7C5', 'R8C5', 'R9C5'], 6),
        cells: ['R4C5', 'R5C5', 'R6C5'],
        args: { digit: 6, count: 3, box: 'B5', line: 'C5' }
      });
    });

    it('works on real positions (positive 3)', function () {
      // SudokuWiki's pointing pair: the 3s of box 3 sit in R2C7 and R2C9.
      var wiki = H.stateAfter(model9, WIKI_LOCKED, BASICS);
      H.expectFinding(SG.test, 'pointing', wiki, {
        eliminations: pairsOf(model9, ['R2C1', 'R2C2', 'R2C3'], 3),
        cells: ['R2C7', 'R2C9'],
        args: { digit: 3, box: 'B3', line: 'R2' }
      });
      H.expectFinding(SG.test, 'pointing', afterBasics('hard-a'), {
        eliminations: pairsOf(model9, ['R6C4', 'R6C5'], 2),
        cells: ['R6C1', 'R6C3'],
        args: { digit: 2, box: 'B4', line: 'R6' }
      });
      H.expectFinding(SG.test, 'pointing', afterBasics('hard-17-clues-b'), {
        eliminations: pairsOf(model9, ['R2C1', 'R2C3'], 7),
        cells: ['R2C7', 'R2C9'],
        args: { digit: 7, box: 'B3', line: 'R2' }
      });
    });

    it('does not need a propagation fixpoint: pending singles do not hide it (positive 4)', function () {
      var raw = rawState(model9, puzzle('wikipedia-example').puzzle);
      expect(find('nakedSingle', model9, raw)).not.toBeNull();
      H.expectFinding(SG.test, 'pointing', raw, {
        eliminations: pairsOf(model9, ['R2C7', 'R2C9'], 7),
        cells: ['R2C2', 'R2C3'],
        args: { digit: 7, box: 'B1', line: 'R2' }
      });
    });

    it('points along a column of a Jigsaw region that is not a rectangle (positive 5)', function () {
      var m = jigsaw6();
      var sol = solutionOf(m);
      // Region J3 = R2C2 R2C3 R2C4 R3C3 R4C2 R4C3; its cells in column 3 are R2C3, R3C3 and R4C3.
      var d = sol[H.cell(m, 'R3C3')];
      var fx = fixture(m, sol, confine(m, 'J3', ['R2C3', 'R3C3', 'R4C3'], d));
      expectOne('pointing', fx, {
        eliminations: pairsOf(m, ['R1C3', 'R5C3', 'R6C3'], d),
        cells: ['R2C3', 'R3C3', 'R4C3'],
        args: { digit: d, count: 3, box: 'J3', line: 'C3' }
      });
    });

    it('points along a row of a Jigsaw region, with a pair that leaves the region (positive 6)', function () {
      var m = jigsaw6();
      var sol = solutionOf(m);
      // Region J1 = R1C1 R1C2 R1C3 R2C1 R3C1 R3C2; only R3C1 and R3C2 are in row 3.
      var d = sol[H.cell(m, 'R3C1')];
      var fx = fixture(m, sol, confine(m, 'J1', ['R3C1', 'R3C2'], d));
      expectOne('pointing', fx, {
        eliminations: pairsOf(m, ['R3C3', 'R3C4', 'R3C5', 'R3C6'], d),
        cells: ['R3C1', 'R3C2'],
        args: { digit: d, count: 2, box: 'J1', line: 'R3' }
      });
    });

    it('treats a hyper window as a box (positive 7)', function () {
      var m = hyper9();
      var sol = solutionOf(m);
      // Window 1 is R2C2..R4C4. Its candidates for d are R2C2 and R2C3: a pair on row 2, with R2C4 and the
      // rest of the window already without d.
      var d = sol[H.cell(m, 'R2C2')];
      var fx = fixture(m, sol, confine(m, 'W1', ['R2C2', 'R2C3'], d));
      expectOne('pointing', fx, {
        eliminations: pairsOf(m, ['R2C1', 'R2C5', 'R2C6', 'R2C7', 'R2C8', 'R2C9'], d),
        cells: ['R2C2', 'R2C3'],
        args: { digit: d, count: 2, box: 'W1', line: 'R2' }
      });
    });

    it('works with 12 digits and 3x4 boxes (positive 8)', function () {
      var m = box12();
      var sol = solutionOf(m);
      // Box 1 = rows 1-3, columns 1-4. Keep d in R2C1..R2C3 only.
      var d = sol[H.cell(m, 'R2C2')];
      var fx = fixture(m, sol, confine(m, 'B1', ['R2C1', 'R2C2', 'R2C3'], d));
      var finding = expectOne('pointing', fx, {
        cells: ['R2C1', 'R2C2', 'R2C3'],
        args: { digit: d, count: 3, box: 'B1', line: 'R2' }
      });
      expect(finding.eliminations).toHaveLength(8);
    });

    it('works on overlapping boards, on every line that crosses the shared box (positive 9)', function () {
      var m = samurai();
      var sol = solutionOf(m);
      function at(r, c) {
        for (var i = 0; i < m.cellCount; i++) {
          if (m.layout.cellRow[i] === r && m.layout.cellCol[i] === c) return i;
        }
        throw new Error('no cell at ' + r + ',' + c);
      }
      var shared = [at(6, 6), at(6, 7), at(6, 8)];
      var d = sol[shared[0]];
      var state = fixture(m, sol, confine(m, 'G1-B9', shared, d)).state;
      var ctx = SG.techniques.createContext(m, {});
      var lines = [];
      for (var step = 0; step < 4; step++) {
        var finding = find('pointing', m, state, ctx);
        if (finding === null) break;
        expect(finding.i18nArgs.digit).toBe(d);
        expect(finding.cells.slice().sort()).toEqual(shared.slice().sort());
        lines.push(finding.i18nArgs.line);
        finding.eliminations.forEach(function (e) {
          expect(sol[e[0]]).not.toBe(e[1]);
          expect(SG.constraints.eliminate(m, state, e[0], e[1])).toBe(true);
        });
      }
      // The same three cells lie in row 7 of the top-left grid and in row 1 of the centre grid.
      expect(lines).toEqual(['G1-R7', 'G5-R1']);
    });

    it('finds nothing when the candidates of the box do not share a line (negative 1)', function () {
      expectNone('pointing', fixture(model9, SOL9, confine(model9, 'B1', ['R1C1', 'R2C2'], 5)));
      expectNone('pointing', fixture(model9, SOL9, confine(model9, 'B1', ['R1C1', 'R2C2', 'R3C3'], 5)));
    });

    it('finds nothing when the rest of the line has no such candidate left (negative 2)', function () {
      var pairs = confine(model9, 'B1', ['R1C1', 'R1C2'], 5).concat(pairsOf(model9, ROW1, 5));
      expectNone('pointing', fixture(model9, SOL9, pairs));
    });

    it('leaves a digit with a single cell in the box to the hidden single (negative 3)', function () {
      var fx = fixture(model9, SOL9, confine(model9, 'B1', ['R1C1'], 5));
      expectNone('pointing', fx);
      expectOne('hiddenSingleBox', fx, { placements: [['R1C1', 5]] });
    });

    it('finds nothing in stuck positions that have no locked candidates (negative 4)', function () {
      ['hard-platinum', 'hard-nugget', 'hard-c', 'worlds-hardest-2012'].forEach(function (name) {
        H.expectNoFinding(SG.test, 'pointing', afterBasics(name));
      });
    });

    it('does not point from a region whose candidates share no line (negative 5, Jigsaw)', function () {
      var m = jigsaw6();
      var sol = solutionOf(m);
      // The position of the Box/Line negative: R2C1 (region J1) and R2C2 (region J3) lie in the same 2x3
      // rectangle, but no region is confined to a line.
      var d = sol[H.cell(m, 'R2C2')];
      var pairs = confine(m, 'R2', ['R2C1', 'R2C2'], d);
      expectNone('pointing', fixture(m, sol, pairs));
    });

    it('does not point from a partial unit: the digit may be missing there', function () {
      var m = partial4();
      var sol = solutionOf(m);
      // Q1 = R2C1, R2C4, R4C1. Without R4C1 the digit of R2C1 is confined to row 2 inside Q1, but Q1 need
      // not contain it, so R2C2 and R2C3 keep it.
      var d = sol[H.cell(m, 'R2C1')];
      expectNone('pointing', fixture(m, sol, confine(m, 'Q1', ['R2C1', 'R2C4'], d)));
    });

    it('only trusts a complete box-like unit', function () {
      var fx = rowPairFixture();
      var ctx = SG.techniques.createContext(model9, {});
      expect(find('pointing', model9, fx.state, ctx)).not.toBeNull();
      var none = Object.assign({}, ctx, { completeUnits: new Uint8Array(model9.units.length) });
      expect(find('pointing', model9, fx.state, none)).toBeNull();
    });

    it('does not count a digit that is already placed in the box', function () {
      // 5 is placed in R1C1 of box 1. Stale candidates in R1C2, R1C3 and R1C5 must not start a deduction.
      var state = rawState(model9, '5' + new Array(81).join('0'));
      [1, 2, 4].forEach(function (cell) { state.candidates[cell] |= 1 << 4; });
      expect(find('pointing', model9, state)).toBeNull();
    });
  });

  describe('boxLine', function () {
    function rowPairFixture() {
      // 8 in row 4 only at R4C1 and R4C2: both are in box 4.
      return fixture(model9, SOL9, confine(model9, 'R4', ['R4C1', 'R4C2'], 8));
    }

    it('a pair in a row removes the digit from the rest of the box (positive 1)', function () {
      expectOne('boxLine', rowPairFixture(), {
        eliminations: pairsOf(model9, ['R5C1', 'R5C2', 'R5C3', 'R6C1', 'R6C2', 'R6C3'], 8),
        placements: [],
        cells: ['R4C1', 'R4C2'],
        args: { digit: 8, count: 2, box: 'B4', line: 'R4' }
      });
    });

    it('a triple in a column removes the digit from the rest of the box (positive 2)', function () {
      var fx = fixture(model9, SOL9, confine(model9, 'C7', ['R1C7', 'R2C7', 'R3C7'], 5));
      expectOne('boxLine', fx, {
        eliminations: pairsOf(model9, ['R1C8', 'R1C9', 'R2C8', 'R2C9', 'R3C8', 'R3C9'], 5),
        cells: ['R1C7', 'R2C7', 'R3C7'],
        args: { digit: 5, count: 3, box: 'B3', line: 'C7' }
      });
    });

    it('works on real positions (positive 3)', function () {
      var wiki = H.stateAfter(model9, WIKI_LOCKED, BASICS);
      H.expectFinding(SG.test, 'boxLine', wiki, {
        eliminations: pairsOf(model9, ['R2C1', 'R2C2', 'R2C3'], 3),
        cells: ['R3C2', 'R3C3'],
        args: { digit: 3, box: 'B1', line: 'R3' }
      });
      H.expectFinding(SG.test, 'boxLine', afterBasics('hard-a'), {
        eliminations: pairsOf(model9, ['R6C1', 'R6C3'], 9),
        cells: ['R4C1', 'R4C2', 'R4C3'],
        args: { digit: 9, box: 'B4', line: 'R4' }
      });
      H.expectFinding(SG.test, 'boxLine', afterBasics('hard-17-clues-b'), {
        eliminations: pairsOf(model9, ['R2C1', 'R2C3'], 7),
        cells: ['R1C2', 'R1C3'],
        args: { digit: 7, box: 'B1', line: 'R1' }
      });
    });

    it('does not need a propagation fixpoint: pending singles do not hide it (positive 4)', function () {
      var raw = rawState(model9, puzzle('hard-b').puzzle);
      expect(find('hiddenSingleBox', model9, raw)).not.toBeNull();
      H.expectFinding(SG.test, 'boxLine', raw, {
        eliminations: pairsOf(model9, ['R7C6'], 3),
        cells: ['R7C5', 'R9C5'],
        args: { digit: 3, box: 'B8', line: 'C5' }
      });
    });

    it('reduces a Jigsaw region to the cells of a column inside it (positive 5)', function () {
      var m = jigsaw6();
      var sol = solutionOf(m);
      // Column 3 holds d only in R2C3, R3C3, R4C3, all of region J3, which then loses d elsewhere.
      var d = sol[H.cell(m, 'R3C3')];
      var fx = fixture(m, sol, confine(m, 'C3', ['R2C3', 'R3C3', 'R4C3'], d));
      expectOne('boxLine', fx, {
        eliminations: pairsOf(m, ['R2C2', 'R2C4', 'R4C2'], d),
        cells: ['R2C3', 'R3C3', 'R4C3'],
        args: { digit: d, count: 3, box: 'J3', line: 'C3' }
      });
    });

    it('reduces a Jigsaw region to part of a row that crosses it in four cells (positive 6)', function () {
      var m = jigsaw6();
      var sol = solutionOf(m);
      // Row 5 meets region J5 in R5C1..R5C4. d is only possible in R5C2 and R5C3, so J5 loses it elsewhere.
      var d = sol[H.cell(m, 'R5C2')];
      var fx = fixture(m, sol, confine(m, 'R5', ['R5C2', 'R5C3'], d));
      expectOne('boxLine', fx, {
        eliminations: pairsOf(m, ['R4C1', 'R6C1'], d),
        cells: ['R5C2', 'R5C3'],
        args: { digit: d, count: 2, box: 'J5', line: 'R5' }
      });
    });

    it('treats a hyper window as a box (positive 7)', function () {
      var m = hyper9();
      var sol = solutionOf(m);
      // Row 3 meets window 1 (R2C2..R4C4) in R3C2..R3C4. Keep d in R3C3 and R3C4 only: they share the window
      // but not a box (R3C3 is in box 1, R3C4 in box 2), so the window is the only unit that is reduced.
      var d = sol[H.cell(m, 'R3C3')];
      var fx = fixture(m, sol, confine(m, 'R3', ['R3C3', 'R3C4'], d));
      expectOne('boxLine', fx, {
        eliminations: pairsOf(m, ['R2C2', 'R2C3', 'R2C4', 'R4C2', 'R4C3', 'R4C4'], d),
        cells: ['R3C3', 'R3C4'],
        args: { digit: d, count: 2, box: 'W1', line: 'R3' }
      });
    });

    it('works with 16 digits and 4x4 boxes (positive 8)', function () {
      var m = box16();
      var sol = solutionOf(m);
      // Row 2 meets box 1 in R2C1..R2C4. Keep d in R2C1 and R2C2 only.
      var d = sol[H.cell(m, 'R2C1')];
      var fx = fixture(m, sol, confine(m, 'R2', ['R2C1', 'R2C2'], d));
      var finding = expectOne('boxLine', fx, {
        cells: ['R2C1', 'R2C2'],
        args: { digit: d, count: 2, box: 'B1', line: 'R2' }
      });
      // The 16 cells of the box minus the 4 it shares with row 2.
      expect(finding.eliminations).toHaveLength(12);
    });

    it('finds nothing when the candidates of the line sit in two boxes (negative 1)', function () {
      expectNone('boxLine', fixture(model9, SOL9, confine(model9, 'R4', ['R4C1', 'R4C4'], 8)));
      expectNone('boxLine', fixture(model9, SOL9, confine(model9, 'C7', ['R3C7', 'R4C7'], 5)));
    });

    it('finds nothing when the rest of the box has no such candidate left (negative 2)', function () {
      var rest = ['R5C1', 'R5C2', 'R5C3', 'R6C1', 'R6C2', 'R6C3'];
      var pairs = confine(model9, 'R4', ['R4C1', 'R4C2'], 8).concat(pairsOf(model9, rest, 8));
      expectNone('boxLine', fixture(model9, SOL9, pairs));
    });

    it('leaves a digit with a single cell in the line to the hidden single (negative 3)', function () {
      var fx = fixture(model9, SOL9, confine(model9, 'R4', ['R4C1'], 8));
      expectNone('boxLine', fx);
      expectOne('hiddenSingleLine', fx, { placements: [['R4C1', 8]] });
    });

    it('finds nothing in stuck positions that have no locked candidates (negative 4)', function () {
      ['hard-platinum', 'hard-nugget', 'hard-c', 'worlds-hardest-2012'].forEach(function (name) {
        H.expectNoFinding(SG.test, 'boxLine', afterBasics(name));
      });
    });

    it('does not mistake a rectangle for a region (negative 5, Jigsaw)', function () {
      var m = jigsaw6();
      var sol = solutionOf(m);
      // R2C1 (region J1) and R2C2 (region J3) lie in the same 2x3 rectangle but in different regions: the
      // two candidates of row 2 do not confine the digit to one region.
      var d = sol[H.cell(m, 'R2C2')];
      var fx = fixture(m, sol, confine(m, 'R2', ['R2C1', 'R2C2'], d));
      expectNone('boxLine', fx);
    });

    it('only trusts a complete line', function () {
      var fx = rowPairFixture();
      var ctx = SG.techniques.createContext(model9, {});
      expect(find('boxLine', model9, fx.state, ctx)).not.toBeNull();
      var none = Object.assign({}, ctx, { completeUnits: new Uint8Array(model9.units.length) });
      expect(find('boxLine', model9, fx.state, none)).toBeNull();
    });
  });

  describe('soundness (I7): no technique removes a digit of the true solution', function () {
    var OTHER_MODELS = [
      ['classic4', function () { return model4; }, 120],
      ['classic6', function () { return model6; }, 120],
      ['Jigsaw 6x6', jigsaw6, 120],
      ['hyper windows', hyper9, 80],
      ['diagonals', diag9, 80],
      ['12 digits', box12, 24],
      ['16 digits', box16, 12],
      ['Samurai', samurai, 8]
    ];
    OTHER_MODELS.forEach(function (spec) {
      IDS.forEach(function (id) {
        it(id + ' is sound on ' + spec[0], function () {
          var stats = H.assertSound(SG.test, id, { model: spec[1](), count: spec[2] });
          expect(stats.states).toBe(spec[2]);
        });
      });
    });

    it('the five techniques together keep the true solution on every fixture puzzle', function () {
      F.unique.forEach(function (p) {
        var solution = F.parse(p.solution);
        var report = SG.logicalSolver.solve(model9, F.parse(p.puzzle), { allowedTechniques: IDS });
        for (var c = 0; c < 81; c++) {
          expect(report.state.candidates[c] & (1 << (solution[c] - 1))).not.toBe(0);
          if (report.state.value[c] !== 0) expect(report.state.value[c]).toBe(solution[c]);
        }
      });
    });
  });

  describe('reference scan: the techniques agree with a naive scan on all unit shapes', function () {
    function isLine(model, u) {
      var kind = model.unitMeta[u].kind;
      return kind === 'row' || kind === 'col';
    }

    function candidateCells(model, state, u, digit) {
      var out = [];
      var cs = model.units[u];
      for (var i = 0; i < cs.length; i++) {
        if (state.value[cs[i]] === 0 && (state.candidates[cs[i]] & (1 << (digit - 1))) !== 0) out.push(cs[i]);
      }
      return out;
    }

    function isPlaced(model, state, u, digit) {
      var cs = model.units[u];
      for (var i = 0; i < cs.length; i++) if (state.value[cs[i]] === digit) return true;
      return false;
    }

    /** "cell:digit" of every hidden single in the complete units of the wanted kind. */
    function referenceHidden(model, state, ctx, wantLines) {
      var found = [];
      for (var u = 0; u < model.units.length; u++) {
        if (ctx.completeUnits[u] !== 1 || isLine(model, u) !== wantLines) continue;
        for (var d = 1; d <= model.digits; d++) {
          if (isPlaced(model, state, u, d)) continue;
          var cs = candidateCells(model, state, u, d);
          if (cs.length === 1) found.push(cs[0] + ':' + d);
        }
      }
      return found;
    }

    /**
     * Every Pointing (or Box/Line) deduction with at least one elimination. The shared units of the
     * candidate cells come from intersecting their `cellUnits`, which is how a person reads the board.
     */
    function referenceLocked(model, state, ctx, pointing) {
      var found = [];
      for (var f = 0; f < model.units.length; f++) {
        if (ctx.completeUnits[f] !== 1 || isLine(model, f) === pointing) continue;
        for (var d = 1; d <= model.digits; d++) {
          if (isPlaced(model, state, f, d)) continue;
          var S = candidateCells(model, state, f, d);
          if (S.length < 2) continue;
          Array.from(model.cellUnits[S[0]]).forEach(function (x) {
            var everywhere = S.every(function (c) { return model.cellUnits[c].indexOf(x) !== -1; });
            if (x === f || !everywhere || isLine(model, x) !== pointing) return;
            var elims = candidateCells(model, state, x, d).filter(function (c) {
              return model.units[f].indexOf(c) === -1;
            });
            if (elims.length > 0) found.push({ forced: f, target: x, digit: d, cells: S, elims: elims });
          });
        }
      }
      return found;
    }

    function sorted(list) {
      return list.slice().sort(function (a, b) { return a - b; });
    }

    function referenceNaked(model, state) {
      var found = [];
      for (var c = 0; c < model.cellCount; c++) {
        var m = state.candidates[c];
        if (state.value[c] === 0 && m !== 0 && (m & (m - 1)) === 0) {
          found.push(c + ':' + SG.bits.toArray(m)[0]);
        }
      }
      return found;
    }

    /** Asks the technique and the reference about `state`; returns the Finding or null. */
    function compare(id, model, state, ctx) {
      var finding = find(id, model, state, ctx);
      var key;
      var expected;
      if (id === 'nakedSingle' || id === 'hiddenSingleBox' || id === 'hiddenSingleLine') {
        expected = id === 'nakedSingle' ? referenceNaked(model, state) :
          referenceHidden(model, state, ctx, id === 'hiddenSingleLine');
        if (expected.length === 0) {
          expect(finding).toBeNull();
        } else {
          expect(finding).not.toBeNull();
          key = finding.placements[0][0] + ':' + finding.placements[0][1];
          expect(expected).toContain(key);
          if (id === 'nakedSingle') expect(key).toBe(expected[0]);
          else expect(isLine(model, finding.i18nArgs.unitIndex)).toBe(id === 'hiddenSingleLine');
        }
        return finding;
      }
      var pointing = id === 'pointing';
      expected = referenceLocked(model, state, ctx, pointing);
      if (expected.length === 0) {
        expect(finding).toBeNull();
        return null;
      }
      expect(finding).not.toBeNull();
      var args = finding.i18nArgs;
      var forced = pointing ? args.boxIndex : args.lineIndex;
      var target = pointing ? args.lineIndex : args.boxIndex;
      var match = expected.filter(function (e) {
        return e.forced === forced && e.target === target && e.digit === args.digit;
      })[0];
      expect(match).toBeDefined();
      expect(sorted(finding.eliminations.map(function (e) { return e[0]; }))).toEqual(sorted(match.elims));
      expect(sorted(finding.cells)).toEqual(sorted(match.cells));
      expect(args.count).toBe(match.cells.length);
      return finding;
    }

    function walk(id, model, items, maxSteps) {
      var ctx = SG.techniques.createContext(model, {});
      var fired = 0;
      items.forEach(function (item) {
        var state = SG.model.cloneState(item.state);
        for (var step = 0; step < maxSteps && state.unsolvedCount > 0; step++) {
          var finding = compare(id, model, state, ctx);
          if (finding === null) return;
          fired++;
          finding.placements.forEach(function (p) {
            expect(SG.constraints.assign(model, state, p[0], p[1])).toBe(true);
          });
          finding.eliminations.forEach(function (e) {
            expect(SG.constraints.eliminate(model, state, e[0], e[1])).toBe(true);
          });
        }
      });
      return fired;
    }

    var SPECS = [
      ['classic9', function () { return model9; }, 200],
      ['classic6', function () { return model6; }, 80],
      ['classic4', function () { return model4; }, 60],
      ['Jigsaw 6x6', jigsaw6, 120],
      ['hyper windows', hyper9, 80],
      ['diagonals', diag9, 60],
      ['12 digits', box12, 16],
      ['Samurai', samurai, 8]
    ];

    SPECS.forEach(function (spec) {
      IDS.forEach(function (id) {
        it(id + ' on ' + spec[0], function () {
          var model = spec[1]();
          var items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(20260101), spec[2]);
          var fired = walk(id, model, items, 12);
          expect(fired).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('tech-basic in the logical solver', function () {
    it('solves the easy fixtures with the three basic techniques and attributes every step', function () {
      ['wikipedia-example', 'classic-easy', 'classic-easy-2'].forEach(function (name) {
        var p = puzzle(name);
        var report = SG.logicalSolver.solve(model9, F.parse(p.puzzle), { allowedTechniques: BASICS });
        expect(report.solved).toBe(true);
        expect(Array.from(report.state.value)).toEqual(Array.from(F.parse(p.solution)));
        report.steps.forEach(function (step) {
          expect(BASICS).toContain(step.technique);
          expect(step.placements).toHaveLength(1);
          expect(step.eliminations).toHaveLength(0);
        });
        Object.keys(report.techniqueCounts).forEach(function (id) {
          expect(BASICS).toContain(id);
        });
        expect(report.hardestTechnique).not.toBe('pointing');
      });
    });

    it('scores each application with the baseCost of its technique', function () {
      var givens = F.parse(puzzle('classic-medium').puzzle);
      var report = SG.logicalSolver.solve(model9, givens, { allowedTechniques: BASICS });
      expect(report.solved).toBe(true);
      var seen = {};
      var expected = 0;
      var bonus = SG.logicalSolver.SCORING.emptyCellBonus;
      for (var c = 0; c < givens.length; c++) if (givens[c] === 0) expected += bonus;
      report.steps.forEach(function (step) {
        var cost = SG.techniques.get(step.technique).baseCost;
        expected += seen[step.technique] ? cost : cost * SG.logicalSolver.SCORING.firstUseMultiplier;
        seen[step.technique] = true;
      });
      expect(report.score).toBeCloseTo(expected, 6);
      expect(Object.keys(seen).length).toBeGreaterThan(1);
    });

    it('locked candidates unlock puzzles that the singles alone cannot finish', function () {
      var unlocked = 0;
      F.unique.forEach(function (p) {
        var givens = F.parse(p.puzzle);
        var singlesOnly = { allowedTechniques: BASICS, collectSteps: false };
        var singles = SG.logicalSolver.solve(model9, givens, singlesOnly);
        var locked = SG.logicalSolver.solve(model9, givens, { allowedTechniques: IDS });
        var used = (locked.techniqueCounts.pointing || 0) + (locked.techniqueCounts.boxLine || 0);
        if (!singles.solved && used > 0 && locked.state.unsolvedCount < singles.state.unsolvedCount) {
          unlocked++;
        }
      });
      expect(unlocked).toBeGreaterThan(0);
    });

    it('reports pointing and box/line steps with real eliminations only', function () {
      var givens = F.parse(puzzle('hard-a').puzzle);
      var report = SG.logicalSolver.solve(model9, givens, { allowedTechniques: IDS });
      var locked = report.steps.filter(function (step) {
        return step.technique === 'pointing' || step.technique === 'boxLine';
      });
      expect(locked.length).toBeGreaterThan(0);
      locked.forEach(function (step) {
        expect(step.placements).toHaveLength(0);
        expect(step.eliminations.length).toBeGreaterThan(0);
        expect(step.cells.length).toBeGreaterThan(1);
      });
    });
  });

  describe('performance', function () {
    var CALLS = 2000;
    var EMPTY = new Array(82).join('0');

    IDS.forEach(function (id) {
      it(id + ' scans all 27 units of a 9x9 in well under 1 ms', function () {
        // An empty grid is the worst case: nothing is found, so every unit and pair is scanned.
        var state = rawState(model9, EMPTY);
        var ctx = SG.techniques.createContext(model9, {});
        var tech = SG.techniques.get(id);
        for (var warm = 0; warm < 200; warm++) tech.find(model9, state, ctx);
        var start = Date.now();
        for (var i = 0; i < CALLS; i++) tech.find(model9, state, ctx);
        expect((Date.now() - start) / CALLS).toBeLessThan(1);
      });

      var benchState = null;
      bench(id + ' on an empty 9x9 grid (full scan)', function () {
        if (benchState === null) benchState = rawState(model9, EMPTY);
        find(id, model9, benchState);
      }, 2000);
    });
  });
})();
