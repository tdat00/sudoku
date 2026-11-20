// The two interactions of a Killer cage with its units that cageCombo already implements (R17: no new
// "cageLocked" technique), on boards built here with SG.model.create from the 27 row, column and box units
// and explicit cages; no Generator variant and no generated puzzle:
//   - a required digit locked to a unit: every surviving combination of the cage contains the digit d and all
//     the cells of the cage that can still hold d lie in one unit, so d leaves the other cells of that unit;
//   - the two-cell Killer pair: the two digits of a two-cell cage whose combination is settled can only be in
//     its two cells, so both leave the other cells of every unit the two cells share.
// Both are the pointing step of cageCombo (pointOutOfCage in tech-cage.js) and only use the surviving
// combinations of the cage (no assignment matching). Every position is checked against the exact
// eliminations written out by hand, a brute-force oracle built from model.units and the digit subsets only
// (never from the comboTable or the finder's tables), and the exact solver, which must find no solution with
// an eliminated digit in its cell; the designated solution keeps every digit. Each position also runs
// transposed. The positions are one cage on an empty board, propagated with the cage extension (so nothing
// but the pointing is left), except three hand-made ones (two with typed-in pencil marks, one with singles
// only). The near misses are isolated the same way: the pointing must not fire and nothing else is left.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.techHelper;

  var D = 9;
  var VARIANT = 'tech-cage-core';

  function range(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(i);
    return out;
  }

  /** 'R4C7' -> cell index. */
  function at(ref) {
    var m = /^R(\d)C(\d)$/.exec(ref);
    return (Number(m[1]) - 1) * D + (Number(m[2]) - 1);
  }

  /** The same position transposed: every R<r>C<c> in the text becomes R<c>C<r>. */
  function flip(text) { return text.replace(/R(\d)C(\d)/g, 'R$2C$1'); }

  /**
   * A 9 x 9 model with the nine rows, columns and boxes and the given cages. It has a variant id of its own:
   * the cage propagation is switched on for that id only and cannot touch another board.
   */
  function buildModel(cages) {
    var units = [];
    var meta = [];
    var cellRow = [];
    var cellCol = [];
    var r;
    var c;
    var b;
    for (r = 0; r < D; r++) {
      for (c = 0; c < D; c++) {
        cellRow.push(r);
        cellCol.push(c);
      }
    }
    for (r = 0; r < D; r++) {
      units.push(range(D).map(function (col) { return r * D + col; }));
      meta.push({ kind: 'row', label: 'R' + (r + 1) });
    }
    for (c = 0; c < D; c++) {
      units.push(range(D).map(function (row) { return row * D + c; }));
      meta.push({ kind: 'col', label: 'C' + (c + 1) });
    }
    for (b = 0; b < D; b++) {
      var box = [];
      for (r = 0; r < 3; r++) {
        for (c = 0; c < 3; c++) box.push((Math.floor(b / 3) * 3 + r) * D + (b % 3) * 3 + c);
      }
      units.push(box);
      meta.push({ kind: 'box', label: 'B' + (b + 1) });
    }
    return SG.model.create({
      variantId: VARIANT,
      digits: D,
      units: units,
      unitMeta: meta,
      layout: { rows: D, cols: D, cellRow: cellRow, cellCol: cellCol },
      cages: cages
    });
  }

  function popcount(mask) {
    var n = 0;
    for (; mask !== 0; mask >>= 1) n += mask & 1;
    return n;
  }

  function digitSum(mask) {
    var total = 0;
    for (var d = 1; d <= D; d++) if ((mask & (1 << (d - 1))) !== 0) total += d;
    return total;
  }

  function keysOf(model, pairs) {
    return pairs.map(function (p) { return SG.model.cellLabel(model, p[0]) + ':' + p[1]; }).sort();
  }

  /**
   * What the cage must give, by brute force: the digit sets that fit (size, sum, not a digit already placed
   * in the cage, inside the candidates of its open cells, every open cell holding one of their digits), the
   * digits every set needs, and for each of those with two or more places the units that hold all its places
   * and the cells of those units outside the cage that can hold it. The eliminations also list the digits of
   * an open cell that no set contains.
   * { digits, forced, common: { d: [unit labels] }, eliminations: [sorted keys] }.
   */
  function oracle(model, state, cage) {
    var open = [];
    var fixedMask = 0;
    var fixedSum = 0;
    var union = 0;
    cage.cells.forEach(function (cell) {
      var v = state.value[cell];
      if (v !== 0) {
        fixedMask |= 1 << (v - 1);
        fixedSum += v;
      } else {
        open.push(cell);
        union |= state.candidates[cell];
      }
    });
    var sets = [];
    for (var mask = 1; mask < (1 << D); mask++) {
      if (popcount(mask) !== open.length || digitSum(mask) !== cage.sum - fixedSum) continue;
      if ((mask & fixedMask) !== 0 || (mask & ~union) !== 0) continue;
      var fits = open.every(function (cell) { return (state.candidates[cell] & mask) !== 0; });
      if (fits) sets.push(mask);
    }
    var out = { digits: [], forced: [], common: {}, eliminations: [] };
    if (sets.length === 0) return out;
    var always = (1 << D) - 1;
    var valid = 0;
    sets.forEach(function (set) {
      always &= set;
      valid |= set;
    });
    var pairs = [];
    for (var d = 1; d <= D; d++) {
      var bit = 1 << (d - 1);
      if ((valid & bit) !== 0) out.digits.push(d);
      if ((always & bit) === 0) continue;
      out.forced.push(d);
      var places = open.filter(function (cell) { return (state.candidates[cell] & bit) !== 0; });
      out.common[d] = [];
      if (places.length < 2) continue;
      model.units.forEach(function (cells, u) {
        var holdsAll = places.every(function (cell) { return cells.indexOf(cell) !== -1; });
        if (!holdsAll) return;
        out.common[d].push(model.unitMeta[u].label);
        for (var i = 0; i < cells.length; i++) {
          var x = cells[i];
          if (state.value[x] === 0 && cage.cells.indexOf(x) === -1 && (state.candidates[x] & bit) !== 0) {
            pairs.push([x, d]);
          }
        }
      });
    }
    open.forEach(function (cell) {
      for (var e = 1; e <= D; e++) {
        var eb = 1 << (e - 1);
        if ((state.candidates[cell] & eb) !== 0 && (valid & eb) === 0) pairs.push([cell, e]);
      }
    });
    var seen = {};
    out.eliminations = keysOf(model, pairs).filter(function (key) {
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
    return out;
  }

  /**
   * The exact solver finds no solution of the model with `digit` in `cell`, the givens kept and every cell
   * whose candidates were typed in (`typed`: [[cell, [digits]]]) holding one of its typed digits.
   */
  function refuted(model, givens, typed, cell, digit) {
    function walk(i, values) {
      if (i === typed.length) {
        var all = Int32Array.from(values);
        all[cell] = digit;
        return SG.dfs.countSolutions(model, all, 1) === 0;
      }
      return typed[i][1].every(function (d) {
        var next = Array.from(values);
        next[typed[i][0]] = d;
        return walk(i + 1, next);
      });
    }
    return walk(0, Array.from(givens));
  }

  /**
   * One position, in the row orientation: `cage` cells and `sum`; `solution` the digits of the cage cells in
   * the grid that completes it and `givens` the placed cells (both in that grid); `candidates` the cells
   * whose candidates are typed in; `propagate: false` leaves the singles-only state; `eliminations`
   * { digit: 'cells' } exactly what cageCombo removes; `digits` and `forced` its arguments; `keeps`
   * [cell, digit] that must still be candidates afterwards.
   */
  function prepare(spec) {
    SG.comboTable.enablePropagation(VARIANT);
    var model = buildModel([{ cells: spec.cage.map(at), sum: spec.sum }]);
    var fix = new Int32Array(model.cellCount);
    var givens = new Int32Array(model.cellCount);
    Object.keys(spec.solution).forEach(function (ref) { fix[at(ref)] = spec.solution[ref]; });
    Object.keys(spec.givens).forEach(function (ref) {
      fix[at(ref)] = spec.givens[ref];
      givens[at(ref)] = spec.givens[ref];
    });
    var solution = SG.dfs.solve(model, fix);
    expect(solution).not.toBeNull();
    expect(SG.model.isSolution(model, solution)).toBe(true);
    expect(SG.model.validate(model, { solve: false }).ok).toBe(true);
    var options = {};
    if (spec.propagate === false) options.propagate = false;
    var typed = Object.keys(spec.candidates);
    if (typed.length > 0) {
      options.candidates = range(model.cellCount).map(function () { return null; });
      typed.forEach(function (ref) { options.candidates[at(ref)] = spec.candidates[ref]; });
    }
    return { model: model, givens: givens, solution: solution, state: H.makeState(model, givens, options) };
  }

  function expectedPairs(spec) {
    var out = [];
    Object.keys(spec.eliminations).forEach(function (digit) {
      spec.eliminations[digit].split(' ').forEach(function (ref) { out.push([at(ref), Number(digit)]); });
    });
    return out;
  }

  function transpose(spec) {
    var out = Object.assign({}, spec);
    function flipKeys(map) {
      var flipped = {};
      Object.keys(map).forEach(function (ref) { flipped[flip(ref)] = map[ref]; });
      return flipped;
    }
    out.cage = spec.cage.map(flip);
    out.solution = flipKeys(spec.solution);
    out.givens = flipKeys(spec.givens);
    out.candidates = flipKeys(spec.candidates);
    out.eliminations = {};
    Object.keys(spec.eliminations).forEach(function (d) {
      out.eliminations[d] = flip(spec.eliminations[d]);
    });
    out.keeps = spec.keeps.map(function (k) { return [flip(k[0]), k[1]]; });
    return out;
  }

  function checkPositive(spec) {
    var run = prepare(spec);
    var model = run.model;
    var expected = expectedPairs(spec);
    var finding = H.expectFinding(SG.test, 'cageCombo', run.state, {
      placements: [],
      eliminations: expected,
      cells: spec.cage,
      args: {
        sum: spec.sum, size: spec.cage.length, cells: spec.cage, digits: spec.digits, forced: spec.forced
      }
    }, { solution: run.solution });
    expect(finding.i18nKey).toBe('technique.cageCombo.step');
    expect(finding.i18nArgs.rule).toBeUndefined();
    expect(finding.eliminations.length).toBe(expected.length);

    var oracleSays = oracle(model, run.state, model.cages[0]);
    expect(oracleSays.digits).toEqual(spec.digits);
    expect(oracleSays.forced).toEqual(spec.forced);
    expect(keysOf(model, finding.eliminations)).toEqual(oracleSays.eliminations);
    expect(keysOf(model, expected)).toEqual(oracleSays.eliminations);

    var typed = Object.keys(spec.candidates).map(function (ref) {
      return [at(ref), spec.candidates[ref].split('').map(Number)];
    });
    finding.eliminations.forEach(function (e) {
      expect(refuted(model, run.givens, typed, e[0], e[1])).toBe(true);
    });

    var after = SG.model.cloneState(run.state);
    finding.eliminations.forEach(function (e) { after.candidates[e[0]] &= ~(1 << (e[1] - 1)); });
    for (var c = 0; c < model.cellCount; c++) {
      expect((after.candidates[c] & (1 << (run.solution[c] - 1))) !== 0).toBe(true);
    }
    spec.keeps.forEach(function (keep) {
      var bit = 1 << (keep[1] - 1);
      expect((run.state.candidates[at(keep[0])] & bit) !== 0).toBe(true);
      expect((after.candidates[at(keep[0])] & bit) !== 0).toBe(true);
    });
  }

  function checkNegative(spec) {
    var run = prepare(spec);
    var oracleSays = oracle(run.model, run.state, run.model.cages[0]);
    expect(oracleSays.forced).toEqual(spec.forced);
    spec.forced.forEach(function (d) { expect(oracleSays.common[d]).toEqual([]); });
    expect(oracleSays.eliminations).toEqual([]);
    H.expectNoFinding(SG.test, 'cageCombo', run.state);
  }

  function base(fields) {
    return Object.assign({ givens: {}, candidates: {}, eliminations: {}, keeps: [] }, fields);
  }

  // A cage of three cells in row 1 whose digits add up to 8 (sets {1,2,5} and {1,3,4}: every set needs a 1).
  // R5C4 = 1 takes the 1 away from R1C4, so the 1 of the cage is in R1C2 or R1C3: the 1 leaves the rest of
  // row 1 and of box 1.
  var LOCKED = [
    base({
      name: 'a 1 in every set whose places R1C2 and R1C3 share row 1 and box 1 leaves both',
      cage: ['R1C2', 'R1C3', 'R1C4'],
      sum: 8,
      solution: { R1C2: 1, R1C3: 2, R1C4: 5 },
      givens: { R5C4: 1 },
      digits: [1, 2, 3, 4, 5],
      forced: [1],
      eliminations: { 1: 'R1C1 R1C5 R1C6 R1C7 R1C8 R1C9 R2C1 R2C2 R2C3 R3C1 R3C2 R3C3' },
      keeps: [['R2C5', 1], ['R4C2', 1]]
    }),
    // The same cage with no given: R1C4 can hold the 1, the places are all in row 1 but not all in box 1.
    base({
      name: 'the places share only row 1 when the third cell can hold the digit: the box keeps it',
      cage: ['R1C2', 'R1C3', 'R1C4'],
      sum: 8,
      solution: { R1C2: 1, R1C3: 2, R1C4: 5 },
      digits: [1, 2, 3, 4, 5],
      forced: [1],
      eliminations: { 1: 'R1C1 R1C5 R1C6 R1C7 R1C8 R1C9' },
      keeps: [['R2C1', 1], ['R2C2', 1], ['R2C3', 1], ['R3C1', 1], ['R3C2', 1], ['R3C3', 1]]
    }),
    // Sum 9 has {1,2,6}, {1,3,5} and {2,3,4}; the 4 placed in R1C8 takes the 4 from the whole cage, so the
    // set without a 1 no longer survives and the 1 is needed again.
    base({
      name: 'the 1 is locked again once the only set without it no longer fits the candidates',
      cage: ['R1C2', 'R1C3', 'R1C4'],
      sum: 9,
      solution: { R1C2: 1, R1C3: 2, R1C4: 6 },
      givens: { R1C8: 4, R5C4: 1 },
      digits: [1, 2, 3, 5, 6],
      forced: [1],
      eliminations: { 1: 'R1C1 R1C5 R1C6 R1C7 R1C9 R2C1 R2C2 R2C3 R3C1 R3C2 R3C3' },
      keeps: [['R2C5', 1]]
    }),
    // R1C3 is in box 1, R1C4 and R2C4 in box 2; the 1 of R2C7 takes it from R2C4, leaving R1C3 and R1C4:
    // row 1. R1C7 to R1C9 see the placed 1 of R2C7 and have no 1 to lose.
    base({
      name: 'an L-shaped cage across two boxes locks the digit to its row only',
      cage: ['R1C3', 'R1C4', 'R2C4'],
      sum: 8,
      solution: { R1C3: 1, R1C4: 3, R2C4: 4 },
      givens: { R2C7: 1 },
      digits: [1, 2, 3, 4, 5],
      forced: [1],
      eliminations: { 1: 'R1C1 R1C2 R1C5 R1C6' },
      keeps: [['R3C4', 1], ['R3C1', 1]]
    }),
    base({
      name: 'a cage inside one box locks the digit to that box',
      cage: ['R4C4', 'R4C5', 'R5C5'],
      sum: 8,
      solution: { R4C4: 2, R4C5: 1, R5C5: 5 },
      digits: [1, 2, 3, 4, 5],
      forced: [1],
      eliminations: { 1: 'R4C6 R5C4 R5C6 R6C4 R6C5 R6C6' },
      keeps: [['R4C1', 1], ['R1C5', 1]]
    }),
    // A placed 1 leaves 6 for the two open cells: {1,5} is out, {2,4} is the pair.
    base({
      name: 'a cage with a placed cell leaves its open cells a pair, locked to their row',
      cage: ['R1C2', 'R1C3', 'R1C4'],
      sum: 7,
      solution: { R1C2: 1, R1C3: 2, R1C4: 4 },
      givens: { R1C2: 1 },
      digits: [2, 4],
      forced: [2, 4],
      eliminations: { 2: 'R1C1 R1C5 R1C6 R1C7 R1C8 R1C9', 4: 'R1C1 R1C5 R1C6 R1C7 R1C8 R1C9' },
      keeps: [['R2C1', 2], ['R3C5', 4]]
    }),
    // Pencil marks typed in: no cell takes a 4, 7 or 8 set with R7C4 (3 or 9), so {4,7,8} does not count, and
    // neither does {5,6,8} (no cell takes a 5); {2,8,9}, {3,7,9} and {4,6,9} are left, and all need the 9.
    base({
      name: 'a set that no open cell can complete does not count: the 9 is still locked to row 7',
      cage: ['R7C2', 'R7C3', 'R7C4'],
      sum: 19,
      solution: { R7C2: 2, R7C3: 8, R7C4: 9 },
      candidates: { R7C2: '267', R7C3: '34689', R7C4: '39' },
      digits: [2, 3, 4, 6, 7, 8, 9],
      forced: [9],
      eliminations: { 9: 'R7C1 R7C5 R7C6 R7C7 R7C8 R7C9' },
      keeps: [['R8C1', 9], ['R9C4', 9]]
    }),
    // Singles only (no cage propagation): R2C4 keeps its 1, which the placed 1 of the cage must not offer
    // to the sets. Sum 6 for R1C4 and R2C4 is {1,5} or {2,4}; with the 1 placed only {2,4} is left, in
    // column 4 and box 2. The other digits of the two cells leave them in the same Finding.
    base({
      name: 'a digit already placed in the cage is not one of the sets of its open cells (singles only)',
      cage: ['R1C3', 'R1C4', 'R2C4'],
      sum: 7,
      solution: { R1C3: 1, R1C4: 2, R2C4: 4 },
      givens: { R1C3: 1 },
      propagate: false,
      digits: [2, 4],
      forced: [2, 4],
      eliminations: {
        1: 'R2C4',
        2: 'R3C4 R4C4 R5C4 R6C4 R7C4 R8C4 R9C4 R1C5 R1C6 R2C5 R2C6 R3C5 R3C6',
        3: 'R1C4 R2C4',
        4: 'R3C4 R4C4 R5C4 R6C4 R7C4 R8C4 R9C4 R1C5 R1C6 R2C5 R2C6 R3C5 R3C6',
        5: 'R1C4 R2C4',
        6: 'R1C4 R2C4',
        7: 'R1C4 R2C4',
        8: 'R1C4 R2C4',
        9: 'R1C4 R2C4'
      },
      keeps: [['R3C3', 2], ['R2C1', 4]]
    })
  ];

  var PAIRS = [
    base({
      name: 'the pair 8,9 of a cage 17 in R5C3 and R5C4 leaves the rest of row 5 only',
      cage: ['R5C3', 'R5C4'],
      sum: 17,
      solution: { R5C3: 8, R5C4: 9 },
      digits: [8, 9],
      forced: [8, 9],
      eliminations: { 8: 'R5C1 R5C2 R5C5 R5C6 R5C7 R5C8 R5C9', 9: 'R5C1 R5C2 R5C5 R5C6 R5C7 R5C8 R5C9' },
      keeps: [['R4C3', 8], ['R6C4', 9], ['R4C4', 8]]
    }),
    base({
      name: 'the pair 1,2 of a cage 3 on the diagonal of box 9 leaves the rest of the box only',
      cage: ['R7C7', 'R8C8'],
      sum: 3,
      solution: { R7C7: 1, R8C8: 2 },
      digits: [1, 2],
      forced: [1, 2],
      eliminations: {
        1: 'R7C8 R7C9 R8C7 R8C9 R9C7 R9C8 R9C9',
        2: 'R7C8 R7C9 R8C7 R8C9 R9C7 R9C8 R9C9'
      },
      keeps: [['R7C1', 1], ['R1C8', 2]]
    }),
    base({
      name: 'the pair 1,2 of a cage 3 in R1C1 and R1C2 leaves the rest of row 1 and of box 1',
      cage: ['R1C1', 'R1C2'],
      sum: 3,
      solution: { R1C1: 1, R1C2: 2 },
      digits: [1, 2],
      forced: [1, 2],
      eliminations: {
        1: 'R1C3 R1C4 R1C5 R1C6 R1C7 R1C8 R1C9 R2C1 R2C2 R2C3 R3C1 R3C2 R3C3',
        2: 'R1C3 R1C4 R1C5 R1C6 R1C7 R1C8 R1C9 R2C1 R2C2 R2C3 R3C1 R3C2 R3C3'
      },
      keeps: [['R2C4', 1], ['R4C1', 2]]
    }),
    // Sum 10 has four pairs; typing R5C4 in as 4 or 6 leaves {4,6} as the only pair that fits.
    base({
      name: 'the pair 4,6 of a cage 10 once the candidates settle the combination leaves the rest of row 5',
      cage: ['R5C3', 'R5C4'],
      sum: 10,
      solution: { R5C3: 4, R5C4: 6 },
      candidates: { R5C4: '46' },
      digits: [4, 6],
      forced: [4, 6],
      eliminations: { 4: 'R5C1 R5C2 R5C5 R5C6 R5C7 R5C8 R5C9', 6: 'R5C1 R5C2 R5C5 R5C6 R5C7 R5C8 R5C9' },
      keeps: [['R4C3', 4], ['R6C4', 6]]
    })
  ];

  var NEAR_MISSES = [
    base({
      name: 'a digit missing from one of the surviving sets is not locked (cage 9: {1,2,6} {1,3,5} {2,3,4})',
      cage: ['R1C2', 'R1C3', 'R1C4'],
      sum: 9,
      solution: { R1C2: 1, R1C3: 2, R1C4: 6 },
      givens: { R5C4: 1 },
      forced: []
    }),
    base({
      name: 'a cell of the cage outside every unit of the other places can hold the digit: nothing is locked',
      cage: ['R1C3', 'R1C4', 'R2C4'],
      sum: 8,
      solution: { R1C3: 1, R1C4: 3, R2C4: 4 },
      forced: [1]
    }),
    base({
      name: 'a cage 10 of two cells has four pairs: no digit is needed',
      cage: ['R5C3', 'R5C4'],
      sum: 10,
      solution: { R5C3: 4, R5C4: 6 },
      forced: []
    }),
    base({
      name: 'a pair whose cells share no unit is not locked to any',
      cage: ['R3C3', 'R4C4'],
      sum: 3,
      solution: { R3C3: 1, R4C4: 2 },
      forced: [1, 2]
    })
  ];

  function orientations(spec) {
    return [{ label: 'rows', spec: spec }, { label: 'columns (transposed)', spec: transpose(spec) }];
  }

  describe('tech-cage: cageCombo is the one technique of both interactions', function () {
    it('the cage group is cageCombo, ruleOf45 and cageSplit: no separate cageLocked or pointing technique',
      function () {
        var ids = SG.techniques.list().filter(function (t) { return t.group === 'cage'; })
          .map(function (t) { return t.id; }).sort();
        expect(ids).toEqual(['cageCombo', 'cageSplit', 'ruleOf45']);
        expect(SG.techniques.has('cageLocked')).toBe(false);
        expect(Array.from(SG.techniques.get('cageCombo').variantScope)).toEqual(['killer']);
      });
  });

  describe('tech-cage: a required digit locked to a unit leaves the rest of the unit', function () {
    LOCKED.forEach(function (spec) {
      orientations(spec).forEach(function (o) {
        it(spec.name + ' [' + o.label + ']', function () { checkPositive(o.spec); });
      });
    });
  });

  describe('tech-cage: the two-cell Killer pair leaves every unit its two cells share', function () {
    PAIRS.forEach(function (spec) {
      orientations(spec).forEach(function (o) {
        it(spec.name + ' [' + o.label + ']', function () { checkPositive(o.spec); });
      });
    });
  });

  describe('tech-cage: near misses lock nothing', function () {
    NEAR_MISSES.forEach(function (spec) {
      orientations(spec).forEach(function (o) {
        it(spec.name + ' [' + o.label + ']', function () { checkNegative(o.spec); });
      });
    });
  });
})();
