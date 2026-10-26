// Subset techniques: nakedPair, hiddenPair, nakedTriple, hiddenTriple, nakedQuad, hiddenQuad, all served by
// one engine in ../core/js/engine/tech-subset.js. Soundness on classic9 and the empty and solved boards are
// checked for every technique by techniques.test.js.
//
// Layout of this suite:
//   registration     ids, groups, costs and order of the six techniques
//   <technique>      positive and negative fixtures (hand made candidate grids and real puzzle positions)
//   duplicates       a smaller subset is never reported again as a bigger one (nor a degenerate subset)
//   oracle           the engine against a deliberately naive brute-force implementation, on random states
//   shapes           other digit counts (4, 6, 12, 16), jigsaw / diagonal / window units, partial units
//                    and a samurai
//   contract         budget, determinism, the logical solver
//   performance      27 units of a 9x9 in under 1 ms
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.techHelper;
  var F = SG.fixtures.classic;
  var M = SG.fixtures.models;

  var IDS = ['nakedPair', 'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad'];
  var SIZE = { nakedPair: 2, hiddenPair: 2, nakedTriple: 3, hiddenTriple: 3, nakedQuad: 4, hiddenQuad: 4 };
  var LADDER = {
    nakedPair: { cost: 9, order: 60 },
    hiddenPair: { cost: 11, order: 70 },
    nakedTriple: { cost: 15, order: 80 },
    hiddenTriple: { cost: 18, order: 90 },
    nakedQuad: { cost: 24, order: 100 },
    hiddenQuad: { cost: 24, order: 105 }
  };

  var model9 = H.model('classic9');
  var model6 = H.model('classic6');
  var model4 = H.model('classic4');
  var model12 = M.boxGrid('subset-12', 3, 4);
  var model16 = M.boxGrid('subset-16', 4, 4);

  // Positions of real puzzles (unique solution) where the technique is the first one that applies: the
  // singles are placed and every cheaper subset technique is used up. The expected deductions were
  // double-checked with the brute-force oracle below and, through H.expectFinding, against the solution.
  var REAL = {
    nakedPair: [
      {
        puzzle: '85...24..72......9..4.........1.7..23.5...9...4...........8..7..17..........36.4.',
        unit: 'R1',
        cells: ['R1C4', 'R1C8'],
        digits: [3, 6],
        eliminations: [['R1C3', 3], ['R1C3', 6], ['R1C5', 6], ['R1C9', 3], ['R1C9', 6]]
      },
      {
        puzzle: '.5..29..3..4..1..298..3...52..1...9..7.......1.....43.....4..........5..8..35...9',
        unit: 'C8',
        cells: ['R2C8', 'R8C8'],
        digits: [7, 8],
        eliminations: [['R1C8', 8], ['R3C8', 7], ['R7C8', 7], ['R7C8', 8]]
      }
    ],
    hiddenPair: [
      {
        puzzle: '4.....8.5.3..........7......2.....6.....8.4......1.......6.3.7.5..2.....1.4......',
        unit: 'B5',
        cells: ['R5C6', 'R6C6'],
        digits: [2, 6],
        eliminations: [['R5C6', 5], ['R5C6', 7], ['R5C6', 9], ['R6C6', 5], ['R6C6', 7], ['R6C6', 9]]
      },
      {
        puzzle: '..53.....8......2..7..1.5..4....53...1..7...6..32...8..6.5....9..4....3......97..',
        unit: 'B4',
        cells: ['R4C3', 'R6C1'],
        digits: [6, 7],
        eliminations: [['R4C3', 2], ['R4C3', 8], ['R4C3', 9], ['R6C1', 5], ['R6C1', 9]]
      }
    ],
    nakedTriple: [
      {
        puzzle: '8..3.4..9..1..25....59........7.83.4....61..7.6.....9.6..1...3.2....57......4....',
        unit: 'C7',
        cells: ['R1C7', 'R5C7', 'R6C7'],
        digits: [1, 2, 8],
        eliminations: [['R3C7', 2], ['R3C7', 8], ['R7C7', 2], ['R7C7', 8], ['R9C7', 1], ['R9C7', 8]]
      },
      {
        puzzle: '1.2...8.....2..6...7......55.1.6.3.....54....3.49....8.13..7..4....2.7.9.2.....5.',
        unit: 'R1',
        cells: ['R1C5', 'R1C8', 'R1C9'],
        digits: [3, 7, 9],
        eliminations: [['R1C2', 3], ['R1C4', 3], ['R1C6', 9]]
      }
    ],
    hiddenTriple: [
      {
        puzzle: '4...6.....1.79...8.....325...5............49.2......3....3...7.17...2...64....1..',
        unit: 'B8',
        cells: ['R7C5', 'R7C6', 'R8C4'],
        digits: [1, 4, 6],
        eliminations: [['R8C4', 5], ['R8C4', 8], ['R8C4', 9]]
      },
      {
        puzzle: '6.....9..342....8.7...8...55..7.........1..26...6.8........7..9..7.3.5..1.5..42.7',
        unit: 'C2',
        cells: ['R5C2', 'R6C2', 'R7C2'],
        digits: [2, 3, 7],
        eliminations: [['R5C2', 8], ['R5C2', 9], ['R6C2', 1], ['R7C2', 6], ['R7C2', 8]]
      }
    ],
    nakedQuad: [
      {
        puzzle: '8...4....4...38.5....21.9..2....75....6.....47.4.532..............9.1.27......1.9',
        unit: 'R7',
        cells: ['R7C4', 'R7C6', 'R7C7', 'R7C8'],
        digits: [3, 4, 6, 8],
        eliminations: [['R7C2', 3], ['R7C2', 4], ['R7C2', 6], ['R7C2', 8], ['R7C3', 3], ['R7C3', 8]]
      },
      {
        puzzle: '...8...5....49.3......3.7.242......8516.......8.92......428...6.5...1.....8......',
        unit: 'B6',
        cells: ['R4C7', 'R6C7', 'R6C8', 'R6C9'],
        digits: [1, 4, 5, 6],
        eliminations: [['R4C8', 1], ['R4C8', 6], ['R5C7', 4], ['R5C8', 4], ['R5C9', 4]]
      }
    ],
    hiddenQuad: [
      {
        puzzle: '...9..36.........1....489....953...2.4.1...3.1.62...584...29.....5......8..6.....',
        unit: 'B9',
        cells: ['R8C7', 'R8C8', 'R9C7', 'R9C8'],
        digits: [2, 4, 8, 9],
        eliminations: [['R8C7', 1], ['R8C7', 6], ['R8C7', 7], ['R8C8', 1], ['R8C8', 7]]
      }
    ]
  };

  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  function find(id, model, state, options) {
    return SG.techniques.get(id).find(model, state, SG.techniques.createContext(model, options || {}));
  }

  function zeros(model) { return new Array(model.cellCount + 1).join('0'); }

  /**
   * A state with exactly the listed candidates ({ R1C3: '1235' }) and `fill` (default: every digit) in all
   * other cells. Nothing is propagated, so a cell with one candidate stays open, as in a position where
   * the singles are not placed yet.
   */
  function handMade(model, spec, fill) {
    var cands = [];
    for (var c = 0; c < model.cellCount; c++) cands.push(fill === undefined ? null : fill);
    Object.keys(spec).forEach(function (ref) { cands[H.cell(model, ref)] = spec[ref]; });
    return H.makeState(model, zeros(model), { candidates: cands, propagate: false });
  }

  /** Adds the candidates of one row to `spec`: rowSpec(1, ['12', '12', ...]) fills R1C1, R1C2, ... */
  function rowSpec(row, list, spec) {
    spec = spec || {};
    list.forEach(function (digits, i) { spec['R' + row + 'C' + (i + 1)] = digits; });
    return spec;
  }

  function applyFinding(model, state, finding) {
    finding.eliminations.forEach(function (e) {
      if (!SG.constraints.eliminate(model, state, e[0], e[1])) {
        throw new Error('an elimination emptied a cell');
      }
    });
  }

  /** Applies findings (and the singles they unlock) until none of `ids` fires any more. */
  function settle(model, state, ids) {
    var ctx = SG.techniques.createContext(model, {});
    for (var round = 0; round < 500; round++) {
      var fired = false;
      for (var i = 0; i < ids.length && !fired; i++) {
        var finding = SG.techniques.get(ids[i]).find(model, state, ctx);
        if (finding !== null) {
          applyFinding(model, state, finding);
          if (!SG.constraints.propagate(model, state)) throw new Error('settle: contradiction');
          fired = true;
        }
      }
      if (!fired) return state;
    }
    throw new Error('settle did not finish');
  }

  /** The position a person reaches with the singles and every cheaper subset technique used up. */
  function positionFor(model, puzzle, id) {
    return settle(model, H.makeState(model, puzzle), IDS.slice(0, IDS.indexOf(id)));
  }

  /** Positive fixture: `id` produces exactly this deduction in this unit. */
  function expectSubset(id, state, expected, opts) {
    var args = { size: SIZE[id], unit: expected.unit, digits: expected.digits };
    var finding = H.expectFinding(SG.test, id, state, {
      cells: expected.cells,
      eliminations: expected.eliminations,
      placements: [],
      args: args
    }, opts);
    expect(finding.i18nKey).toBe('technique.' + id + '.step');
    expect(finding.i18nArgs.cells.length).toBe(SIZE[id]);
    return finding;
  }

  function expectNone(ids, state, opts) {
    ids.forEach(function (id) { H.expectNoFinding(SG.test, id, state, opts); });
  }

  /** Independent set arithmetic for the oracle and the degeneracy checks (arrays, no bit masks). */
  function digitList(mask, digits) {
    var out = [];
    for (var d = 1; d <= digits; d++) if ((mask & (1 << (d - 1))) !== 0) out.push(d);
    return out;
  }

  /** True when some proper non-empty part of `sets` has no more distinct elements than members. */
  function hasSmallerSubset(sets) {
    var n = sets.length;
    for (var s = 1; s < (1 << n) - 1; s++) {
      var seen = {};
      var distinct = 0;
      var members = 0;
      for (var i = 0; i < n; i++) {
        if ((s & (1 << i)) === 0) continue;
        members++;
        for (var j = 0; j < sets[i].length; j++) {
          if (!seen[sets[i][j]]) {
            seen[sets[i][j]] = true;
            distinct++;
          }
        }
      }
      if (distinct <= members) return true;
    }
    return false;
  }

  function unitIndexOf(model, label) {
    for (var u = 0; u < model.units.length; u++) if (model.unitMeta[u].label === label) return u;
    throw new Error('no unit ' + label);
  }

  // Brute-force oracle
  /** Calls visit(indices) for every combination in lexicographic order; stops at the first truthy result. */
  function eachCombination(n, k, visit) {
    var chosen = [];
    function walk(start) {
      if (chosen.length === k) return visit(chosen.slice());
      for (var i = start; i <= n - (k - chosen.length); i++) {
        chosen.push(i);
        var found = walk(i + 1);
        chosen.pop();
        if (found) return found;
      }
      return null;
    }
    return walk(0);
  }

  /**
   * The first subset deduction in scan order, found the slow and obvious way: every combination of open
   * cells (naked) or unplaced digits (hidden) of every unit, no pruning, no bit tricks. A subset counts when
   * its items cover exactly `size` elements, no smaller part of it does (degeneracy) and it removes
   * something. Returns { unit, cells, digits, eliminations: ['cell:digit', ...] } or null.
   */
  function oracle(model, state, id) {
    var size = SIZE[id];
    var hidden = id.indexOf('hidden') === 0;
    var D = model.digits;
    for (var u = 0; u < model.units.length; u++) {
      var cells = Array.prototype.slice.call(model.units[u]);
      var open = cells.filter(function (c) { return state.value[c] === 0; });
      var items = [];
      if (!hidden) {
        open.forEach(function (c) { items.push({ ref: c, elements: digitList(state.candidates[c], D) }); });
      } else {
        if (cells.length !== D || model.unitMeta[u].partial) continue;
        var placed = cells.filter(function (c) { return state.value[c] !== 0; })
          .map(function (c) { return state.value[c]; });
        for (var d = 1; d <= D; d++) {
          if (placed.indexOf(d) !== -1) continue;
          items.push({
            ref: d,
            elements: open.filter(function (c) { return (state.candidates[c] & (1 << (d - 1))) !== 0; })
          });
        }
      }
      var hit = eachCombination(items.length, size, function (indices) {
        var chosen = indices.map(function (i) { return items[i]; });
        var covered = {};
        var count = 0;
        chosen.forEach(function (item) {
          item.elements.forEach(function (e) {
            if (!covered[e]) {
              covered[e] = true;
              count++;
            }
          });
        });
        if (count !== size || hasSmallerSubset(chosen.map(function (item) { return item.elements; }))) {
          return null;
        }
        var refs = chosen.map(function (item) { return item.ref; });
        var removed = [];
        if (!hidden) {
          open.forEach(function (c) {
            if (refs.indexOf(c) !== -1) return;
            digitList(state.candidates[c], D).forEach(function (v) {
              if (covered[v]) removed.push(c + ':' + v);
            });
          });
        } else {
          Object.keys(covered).forEach(function (key) {
            var c = Number(key);
            digitList(state.candidates[c], D).forEach(function (v) {
              if (refs.indexOf(v) === -1) removed.push(c + ':' + v);
            });
          });
        }
        if (removed.length === 0) return null;
        return {
          unit: u,
          cells: hidden ? Object.keys(covered).map(Number) : refs,
          digits: hidden ? refs : Object.keys(covered).map(Number),
          eliminations: removed
        };
      });
      if (hit) return hit;
    }
    return null;
  }

  function numeric(a, b) { return a - b; }

  /** Asserts that find() and the oracle agree on this state; returns the Finding (or null). */
  function expectSameAsOracle(id, model, state, where) {
    var finding = find(id, model, state);
    var hit = oracle(model, state, id);
    if (hit === null) {
      if (finding !== null) throw new Error(id + ' found something the oracle does not, ' + where + ': ' +
        JSON.stringify(finding));
      return null;
    }
    if (finding === null) throw new Error(id + ' missed what the oracle found, ' + where + ': ' +
      JSON.stringify(hit));
    var keys = finding.eliminations.map(function (e) { return e[0] + ':' + e[1]; });
    expect(keys.slice().sort()).toEqual(hit.eliminations.slice().sort());
    expect(keys.length).toBe(new Set(keys).size);
    expect(finding.cells.slice().sort(numeric)).toEqual(hit.cells.slice().sort(numeric));
    expect(finding.i18nArgs.digits).toEqual(hit.digits.slice().sort(numeric));
    expect(finding.i18nArgs.unit).toBe(model.unitMeta[hit.unit].label);
    return finding;
  }

  /** The items of a Finding (cell candidates or digit places) for the degeneracy check. */
  function itemsOf(model, state, finding, id) {
    var unit = model.units[unitIndexOf(model, finding.i18nArgs.unit)];
    if (id.indexOf('naked') === 0) {
      return finding.cells.map(function (c) { return digitList(state.candidates[c], model.digits); });
    }
    return finding.i18nArgs.digits.map(function (d) {
      return Array.prototype.filter.call(unit, function (c) {
        return state.value[c] === 0 && (state.candidates[c] & (1 << (d - 1))) !== 0;
      });
    });
  }

  /**
   * Random peer-consistent states that contain a known solution, for models the puzzle corpus of the helper
   * is too slow for. Some cells are placed, and every other wrong candidate stays with a small chance, so
   * subsets of every size turn up.
   */
  function candidateStates(model, seed, count, keepRange) {
    var rng = SG.testkit.rng.create(seed);
    var out = [];
    var emptyGivens = new Int32Array(model.cellCount);
    for (var i = 0; i < count; i++) {
      var solution = SG.testkit.randomSolution(model, rng.fork('grid' + i));
      var pick = rng.fork('pick' + i);
      var placedShare = 0.05 + 0.3 * pick.next();
      var keep = keepRange[0] + (keepRange[1] - keepRange[0]) * pick.next();
      var state = SG.model.initState(model);
      var c;
      var v;
      for (c = 0; c < model.cellCount; c++) {
        if (pick.next() < placedShare) SG.constraints.assign(model, state, c, solution[c]);
      }
      for (c = 0; c < model.cellCount; c++) {
        if (state.value[c] !== 0) continue;
        for (v = 1; v <= model.digits; v++) {
          if (v !== solution[c] && (state.candidates[c] & (1 << (v - 1))) !== 0 && pick.next() >= keep) {
            SG.constraints.eliminate(model, state, c, v);
          }
        }
      }
      out.push({ state: state, solution: solution, givens: emptyGivens, kind: 'random' });
    }
    return out;
  }

  /** A model of D x D cells: rows and columns, then either boxes or `regions`, then `extra` units. */
  function shapedModel(variantId, D, boxRows, boxCols, extra, regions) {
    var cellRow = [];
    var cellCol = [];
    var units = [];
    var meta = [];
    var r;
    var c;
    for (r = 0; r < D; r++) {
      for (c = 0; c < D; c++) {
        cellRow.push(r);
        cellCol.push(c);
      }
    }
    for (r = 0; r < D; r++) {
      units.push(cellCol.slice(0, D).map(function (col) { return r * D + col; }));
      meta.push({ kind: 'row', label: 'R' + (r + 1) });
    }
    for (c = 0; c < D; c++) {
      units.push(cellCol.slice(0, D).map(function (row) { return row * D + c; }));
      meta.push({ kind: 'col', label: 'C' + (c + 1) });
    }
    if (regions) {
      var byRegion = {};
      regions.forEach(function (region, cell) { (byRegion[region] = byRegion[region] || []).push(cell); });
      Object.keys(byRegion).forEach(function (key, i) {
        units.push(byRegion[key]);
        meta.push({ kind: 'region', label: 'J' + (i + 1) });
      });
    } else {
      for (var b = 0; b < D; b++) {
        var top = Math.floor(b / (D / boxCols)) * boxRows;
        var left = (b % (D / boxCols)) * boxCols;
        var box = [];
        for (r = 0; r < boxRows; r++) {
          for (c = 0; c < boxCols; c++) box.push((top + r) * D + left + c);
        }
        units.push(box);
        meta.push({ kind: 'box', label: 'B' + (b + 1) });
      }
    }
    (extra || []).forEach(function (unit) {
      units.push(unit.cells);
      meta.push({ kind: unit.kind, label: unit.label, partial: unit.partial === true });
    });
    return SG.model.create({
      variantId: variantId,
      digits: D,
      units: units,
      unitMeta: meta,
      layout: { rows: D, cols: D, cellRow: cellRow, cellCol: cellCol }
    });
  }

  var diagonalModel = (function () {
    var main = [];
    var anti = [];
    for (var i = 0; i < 9; i++) {
      main.push(i * 9 + i);
      anti.push(i * 9 + 8 - i);
    }
    return shapedModel('subset-diagonal', 9, 3, 3, [
      { kind: 'diag', label: 'D1', cells: main },
      { kind: 'diag', label: 'D2', cells: anti }
    ]);
  })();

  var hyperModel = (function () {
    var windows = [];
    [[1, 1], [1, 5], [5, 1], [5, 5]].forEach(function (origin, i) {
      var cells = [];
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) cells.push((origin[0] + r) * 9 + origin[1] + c);
      windows.push({ kind: 'window', label: 'W' + (i + 1), cells: cells });
    });
    return shapedModel('subset-hyper', 9, 3, 3, windows);
  })();

  // The 3x3 boxes with some cells swapped between neighbours: every region has 9 cells, none is a rectangle.
  var jigsawModel = (function () {
    var regions = [];
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) regions.push(Math.floor(r / 3) * 3 + Math.floor(c / 3));
    }
    [[2, 2, 3, 2], [2, 3, 3, 3], [5, 5, 5, 6], [8, 5, 8, 6]].forEach(function (s) {
      var a = s[0] * 9 + s[1];
      var b = s[2] * 9 + s[3];
      var t = regions[a];
      regions[a] = regions[b];
      regions[b] = t;
    });
    return shapedModel('subset-jigsaw', 9, 0, 0, [], regions);
  })();

  describe('subset techniques: registration', function () {
    it('registers the six techniques of the subset group with the ladder cost and order', function () {
      IDS.forEach(function (id) {
        expect(SG.techniques.has(id)).toBe(true);
        var def = SG.techniques.get(id);
        expect(def.group).toBe('subset');
        expect(def.baseCost).toBe(LADDER[id].cost);
        expect(def.order).toBe(LADDER[id].order);
        expect(def.i18nKey).toBe('technique.' + id);
        expect(def.variantScope).toBeNull();
        expect(def.assumesUniqueness).toBe(false);
      });
    });

    it('sits between boxLine and the fish group in the loop', function () {
      var ids = SG.techniques.list().map(function (t) { return t.id; });
      var positions = IDS.map(function (id) { return ids.indexOf(id); });
      expect(positions.every(function (p) { return p >= 0; })).toBe(true);
      for (var i = 1; i < positions.length; i++) expect(positions[i]).toBeGreaterThan(positions[i - 1]);
      ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine'].forEach(function (id) {
        if (ids.indexOf(id) !== -1) expect(ids.indexOf(id)).toBeLessThan(positions[0]);
      });
      ['xWing', 'swordfish', 'jellyfish', 'xyWing'].forEach(function (id) {
        if (ids.indexOf(id) !== -1) expect(ids.indexOf(id)).toBeGreaterThan(positions[positions.length - 1]);
      });
    });

    it('is not registered twice when the file is loaded a second time', function () {
      var source = SG.test.node && SG.test.node.fs.readFileSync(
        SG.test.node.path.join(SG.test.node.root, '../core/js/engine/tech-subset.js'), 'utf8');
      if (!source) SG.test.skip('needs the Node runner to reload the source');
      var before = SG.techniques.list().length;
      SG.test.node.vm.runInThisContext(source, { filename: '../core/js/engine/tech-subset.js' });
      expect(SG.techniques.list().length).toBe(before);
    });
  });

  describe('nakedPair', function () {
    it('finds a pair in a row and removes its digits from the other cells of the row', function () {
      // R1C1 and R1C2 hold only 1 and 2, so R1C3 and R1C4 lose them.
      var state = handMade(model9, rowSpec(1, ['12', '12', '1235', '2467', '3489', '3456', '5678', '789',
        '4569']));
      expectSubset('nakedPair', state, {
        unit: 'R1',
        cells: ['R1C1', 'R1C2'],
        digits: [1, 2],
        eliminations: [['R1C3', 1], ['R1C3', 2], ['R1C4', 2]]
      });
      expectNone(['hiddenPair'], state);
    });

    it('finds a pair in a column', function () {
      var spec = {};
      ['12', '1349', '12', '2567', '3489', '4567', '5689', '6789', '3459'].forEach(function (d, i) {
        spec['R' + (i + 1) + 'C5'] = d;
      });
      expectSubset('nakedPair', handMade(model9, spec, '3456789'), {
        unit: 'C5',
        cells: ['R1C5', 'R3C5'],
        digits: [1, 2],
        eliminations: [['R2C5', 1], ['R4C5', 2]]
      });
    });

    it('finds a pair in a box, with the pair cells in different rows and columns', function () {
      // R4C4 and R6C6 are the pair of box 5; the other cells of the box are R5C5 and the rest.
      var state = handMade(model9, { R4C4: '12', R6C6: '12', R5C5: '1346', R4C5: '2578' }, '3456789');
      expectSubset('nakedPair', state, {
        unit: 'B5',
        cells: ['R4C4', 'R6C6'],
        digits: [1, 2],
        eliminations: [['R4C5', 2], ['R5C5', 1]]
      });
    });

    it('finds the pair in real puzzles, once the singles are placed', function () {
      REAL.nakedPair.forEach(function (fixture) {
        expectSubset('nakedPair', positionFor(model9, fixture.puzzle, 'nakedPair'), fixture);
      });
    });

    it('is quiet when the two cells do not share their candidates', function () {
      var state = handMade(model9, rowSpec(1, ['12', '13', '1235', '2467', '3489', '3456', '5678', '789',
        '4569']));
      H.expectNoFinding(SG.test, 'nakedPair', state);
    });

    it('is quiet when the pair has nothing left to remove', function () {
      var state = handMade(model9, rowSpec(1, ['12', '12', '3456', '3457', '3458', '3459', '3467', '3468',
        '3469']), '3456789');
      H.expectNoFinding(SG.test, 'nakedPair', state);
    });

    it('does not take a cell with one candidate (a pending naked single) for half of a pair', function () {
      // R1C1 is a naked single that is not placed yet: that is nakedSingle's job, not a pair.
      var state = handMade(model9, rowSpec(1, ['1', '12', '1235', '2467', '3489', '3456', '5678', '789',
        '4569']), '3456789');
      H.expectNoFinding(SG.test, 'nakedPair', state);
    });
  });

  describe('hiddenPair', function () {
    it('finds two digits that fit only two cells of a row and strips the other candidates', function () {
      // 1 and 2 are possible only in R1C1 and R1C2.
      var state = handMade(model9, rowSpec(1, ['1237', '1248', '3456', '4567', '5678', '6789', '3789', '4568',
        '3579']));
      expectSubset('hiddenPair', state, {
        unit: 'R1',
        cells: ['R1C1', 'R1C2'],
        digits: [1, 2],
        eliminations: [['R1C1', 3], ['R1C1', 7], ['R1C2', 4], ['R1C2', 8]]
      });
      expectNone(['nakedPair', 'nakedTriple', 'nakedQuad'], state);
    });

    it('finds a hidden pair in a box', function () {
      // In box 5, digits 1 and 2 fit only R4C4 and R6C6.
      var state = handMade(model9, { R4C4: '1235', R6C6: '1246' }, '3456789');
      expectSubset('hiddenPair', state, {
        unit: 'B5',
        cells: ['R4C4', 'R6C6'],
        digits: [1, 2],
        eliminations: [['R4C4', 3], ['R4C4', 5], ['R6C6', 4], ['R6C6', 6]]
      });
    });

    it('finds the pair in real puzzles, once the singles and naked pairs are used up', function () {
      expectSubset('hiddenPair', positionFor(model9, REAL.hiddenPair[0].puzzle, 'hiddenPair'),
        REAL.hiddenPair[0]);
      expectSubset('hiddenPair', positionFor(model9, REAL.hiddenPair[1].puzzle, 'hiddenPair'),
        REAL.hiddenPair[1]);
    });

    it('is quiet when one of the digits has a third place', function () {
      var state = handMade(model9, rowSpec(1, ['1237', '1248', '1349', '4567', '5678', '6789', '3789',
        '4568', '3579']));
      H.expectNoFinding(SG.test, 'hiddenPair', state);
    });

    it('is quiet when the two cells hold nothing else to remove', function () {
      var state = handMade(model9, rowSpec(1, ['12', '12', '3456', '3457', '3458', '3459', '3467', '3468',
        '3469']), '3456789');
      H.expectNoFinding(SG.test, 'hiddenPair', state);
    });

    it('does not take a hidden single for half of a pair', function () {
      // 1 fits only R1C1: a hidden single. 2 fits two cells, but {1, 2} is not a pair of its own.
      var state = handMade(model9, rowSpec(1, ['1237', '2348', '3456', '4567', '5678', '6789', '3789',
        '4568', '3579']));
      H.expectNoFinding(SG.test, 'hiddenPair', state);
    });
  });

  describe('nakedTriple', function () {
    it('finds three cells that share three digits, however the digits are spread', function () {
      // R1C2 {1,2}, R1C5 {2,3}, R1C8 {1,3}: no cell holds all three digits, and no two cells are a pair.
      var state = handMade(model9, rowSpec(1, ['1459', '12', '3689', '2569', '23', '5678', '4579', '13',
        '4789']));
      expectSubset('nakedTriple', state, {
        unit: 'R1',
        cells: ['R1C2', 'R1C5', 'R1C8'],
        digits: [1, 2, 3],
        eliminations: [['R1C1', 1], ['R1C3', 3], ['R1C4', 2]]
      });
      expectNone(['nakedPair'], state);
    });

    it('finds a triple whose cells are {a b}, {a b c} and {b c}', function () {
      var spec = {};
      ['3689', '2459', '12', '123', '23', '4578', '4679', '5789', '4568'].forEach(function (d, i) {
        spec['R' + (i + 1) + 'C7'] = d;
      });
      expectSubset('nakedTriple', handMade(model9, spec, '456789'), {
        unit: 'C7',
        cells: ['R3C7', 'R4C7', 'R5C7'],
        digits: [1, 2, 3],
        eliminations: [['R1C7', 3], ['R2C7', 2]]
      });
    });

    it('finds the triple in real puzzles, once the singles and the pairs are used up', function () {
      expectSubset('nakedTriple', positionFor(model9, REAL.nakedTriple[0].puzzle, 'nakedTriple'),
        REAL.nakedTriple[0]);
      expectSubset('nakedTriple', positionFor(model9, REAL.nakedTriple[1].puzzle, 'nakedTriple'),
        REAL.nakedTriple[1]);
    });

    it('is quiet when the three cells cover four digits', function () {
      var state = handMade(model9, rowSpec(1, ['1459', '12', '3689', '2569', '23', '5678', '4579', '14',
        '4789']));
      H.expectNoFinding(SG.test, 'nakedTriple', state);
    });

    it('is quiet when the triple has nothing left to remove', function () {
      var state = handMade(model9, rowSpec(1, ['4567', '12', '4568', '4569', '23', '5678', '4579', '13',
        '4789']), '456789');
      H.expectNoFinding(SG.test, 'nakedTriple', state);
    });
  });

  describe('hiddenTriple', function () {
    it('finds three digits that fit only three cells of a row', function () {
      // 1 fits R1C2 and R1C8, 2 fits R1C2 and R1C5, 3 fits R1C5 and R1C8.
      var state = handMade(model9, rowSpec(1, ['4567', '1245', '4568', '4569', '2356', '5679', '4789', '1346',
        '5689']));
      expectSubset('hiddenTriple', state, {
        unit: 'R1',
        cells: ['R1C2', 'R1C5', 'R1C8'],
        digits: [1, 2, 3],
        eliminations: [['R1C2', 4], ['R1C2', 5], ['R1C5', 5], ['R1C5', 6], ['R1C8', 4], ['R1C8', 6]]
      });
      expectNone(['nakedPair', 'hiddenPair', 'nakedTriple'], state);
    });

    it('finds a hidden triple in a column', function () {
      var spec = {};
      ['4567', '1245', '4568', '2356', '5679', '4789', '1346', '5689', '4569'].forEach(function (d, i) {
        spec['R' + (i + 1) + 'C9'] = d;
      });
      expectSubset('hiddenTriple', handMade(model9, spec, '456789'), {
        unit: 'C9',
        cells: ['R2C9', 'R4C9', 'R7C9'],
        digits: [1, 2, 3],
        eliminations: [['R2C9', 4], ['R2C9', 5], ['R4C9', 5], ['R4C9', 6], ['R7C9', 4], ['R7C9', 6]]
      });
    });

    it('finds the triple in real puzzles, once the singles and cheaper subsets are used up', function () {
      expectSubset('hiddenTriple', positionFor(model9, REAL.hiddenTriple[0].puzzle, 'hiddenTriple'),
        REAL.hiddenTriple[0]);
      expectSubset('hiddenTriple', positionFor(model9, REAL.hiddenTriple[1].puzzle, 'hiddenTriple'),
        REAL.hiddenTriple[1]);
    });

    it('is quiet when the three digits spread over four cells', function () {
      var state = handMade(model9, rowSpec(1, ['3567', '1245', '4568', '4569', '2356', '5679', '4789', '1346',
        '5689']));
      H.expectNoFinding(SG.test, 'hiddenTriple', state);
    });

    it('is quiet when the three cells hold nothing else to remove', function () {
      var state = handMade(model9, rowSpec(1, ['4567', '12', '4568', '4569', '23', '5679', '4789', '13',
        '5689']), '456789');
      H.expectNoFinding(SG.test, 'hiddenTriple', state);
    });
  });

  describe('nakedQuad', function () {
    it('finds four cells that share four digits', function () {
      // A cycle of pairs 12-23-34-14: no smaller subset hides in it.
      var state = handMade(model9, rowSpec(1, ['12', '23', '34', '14', '1569', '2578', '3679', '4589',
        '5678']));
      expectSubset('nakedQuad', state, {
        unit: 'R1',
        cells: ['R1C1', 'R1C2', 'R1C3', 'R1C4'],
        digits: [1, 2, 3, 4],
        eliminations: [['R1C5', 1], ['R1C6', 2], ['R1C7', 3], ['R1C8', 4]]
      });
      expectNone(['nakedPair', 'nakedTriple'], state);
    });

    it('finds a quad of cells with two, three and four candidates', function () {
      var state = handMade(model9, rowSpec(5, ['1578', '12', '1234', '134', '234', '5679', '2689', '5789',
        '6789']));
      expectSubset('nakedQuad', state, {
        unit: 'R5',
        cells: ['R5C2', 'R5C3', 'R5C4', 'R5C5'],
        digits: [1, 2, 3, 4],
        eliminations: [['R5C1', 1], ['R5C7', 2]]
      });
      expectNone(['nakedPair', 'nakedTriple'], state);
    });

    it('finds the quad in real puzzles, once the singles and cheaper subsets are used up', function () {
      expectSubset('nakedQuad', positionFor(model9, REAL.nakedQuad[0].puzzle, 'nakedQuad'),
        REAL.nakedQuad[0]);
      expectSubset('nakedQuad', positionFor(model9, REAL.nakedQuad[1].puzzle, 'nakedQuad'),
        REAL.nakedQuad[1]);
    });

    it('is quiet when the four cells cover five digits', function () {
      var state = handMade(model9, rowSpec(1, ['12', '23', '34', '15', '1569', '2578', '3679', '4589',
        '5678']));
      H.expectNoFinding(SG.test, 'nakedQuad', state);
    });

    it('is quiet when the quad has nothing left to remove', function () {
      var state = handMade(model9, rowSpec(1, ['12', '23', '34', '14', '5678', '5679', '5689', '5789',
        '6789']), '56789');
      H.expectNoFinding(SG.test, 'nakedQuad', state);
    });
  });

  describe('hiddenQuad', function () {
    it('finds four digits that fit only four cells of a row', function () {
      // 1: C1 C4, 2: C1 C2, 3: C2 C3, 4: C3 C4.
      var state = handMade(model9, rowSpec(1, ['1256', '2367', '3478', '1489', '5678', '5679', '5689', '6789',
        '5789']));
      expectSubset('hiddenQuad', state, {
        unit: 'R1',
        cells: ['R1C1', 'R1C2', 'R1C3', 'R1C4'],
        digits: [1, 2, 3, 4],
        eliminations: [['R1C1', 5], ['R1C1', 6], ['R1C2', 6], ['R1C2', 7], ['R1C3', 7], ['R1C3', 8],
          ['R1C4', 8], ['R1C4', 9]]
      });
      expectNone(['nakedPair', 'hiddenPair', 'nakedTriple', 'hiddenTriple', 'nakedQuad'], state);
    });

    it('finds the quad in a real puzzle, once the singles and cheaper subsets are used up', function () {
      expectSubset('hiddenQuad', positionFor(model9, REAL.hiddenQuad[0].puzzle, 'hiddenQuad'),
        REAL.hiddenQuad[0]);
    });

    it('is quiet when the four digits spread over five cells', function () {
      var state = handMade(model9, rowSpec(1, ['1256', '2367', '3478', '1489', '1578', '5679', '5689', '6789',
        '5789']));
      H.expectNoFinding(SG.test, 'hiddenQuad', state);
    });

    it('is quiet when the four cells hold nothing else to remove', function () {
      var state = handMade(model9, rowSpec(1, ['12', '23', '34', '14', '5678', '5679', '5689', '5789',
        '6789']), '56789');
      H.expectNoFinding(SG.test, 'hiddenQuad', state);
    });
  });

  describe('subset techniques: no duplicate reporting', function () {
    /**
     * `small` fires on `state`; the bigger technique must stay quiet both before and after the smaller
     * deduction is applied (the cells of the smaller subset are still there, as a pair, triple, ...).
     */
    function expectNoRepeat(smallId, bigId, state, expected) {
      var small = expectSubset(smallId, state, expected);
      H.expectNoFinding(SG.test, bigId, state);
      var after = SG.model.cloneState(state);
      applyFinding(model9, after, small);
      H.expectNoFinding(SG.test, smallId, after, { model: model9 });
      H.expectNoFinding(SG.test, bigId, after, { model: model9 });
    }

    it('does not report a naked pair again as a naked triple', function () {
      // {R1C1, R1C2} is a pair. With R1C3 = {2,3} the three cells cover three digits, but that "triple"
      // is the pair plus a cell that becomes the naked single 3, so nakedTriple must not claim it.
      var state = handMade(model9, rowSpec(1, ['12', '12', '23', '1345', '2456', '3678', '4789', '5689',
        '6789']), '456789');
      expectNoRepeat('nakedPair', 'nakedTriple', state, {
        unit: 'R1',
        cells: ['R1C1', 'R1C2'],
        digits: [1, 2],
        eliminations: [['R1C3', 2], ['R1C4', 1], ['R1C5', 2]]
      });
    });

    it('does not report a naked triple again as a naked quad', function () {
      var state = handMade(model9, rowSpec(1, ['12', '23', '13', '1234', '4567', '5678', '4789', '5689',
        '6789']), '56789');
      expectNoRepeat('nakedTriple', 'nakedQuad', state, {
        unit: 'R1',
        cells: ['R1C1', 'R1C2', 'R1C3'],
        digits: [1, 2, 3],
        eliminations: [['R1C4', 1], ['R1C4', 2], ['R1C4', 3]]
      });
    });

    it('does not report a naked pair again as a naked quad', function () {
      var state = handMade(model9, rowSpec(1, ['12', '12', '23', '34', '1345', '4567', '5678', '5689',
        '6789']), '56789');
      var pair = expectSubset('nakedPair', state, {
        unit: 'R1',
        cells: ['R1C1', 'R1C2'],
        digits: [1, 2],
        eliminations: [['R1C3', 2], ['R1C5', 1]]
      });
      expect(pair.technique).toBe('nakedPair');
      H.expectNoFinding(SG.test, 'nakedQuad', state);
    });

    it('does not report a hidden pair again as a hidden triple', function () {
      // 1 and 2 fit only R1C2 and R1C5; 3 fits R1C5 and R1C8. {1, 2, 3} is the pair plus a hidden single.
      var state = handMade(model9, rowSpec(1, ['4567', '1245', '4568', '4569', '1236', '5679', '4789', '3456',
        '5689']), '456789');
      expectNoRepeat('hiddenPair', 'hiddenTriple', state, {
        unit: 'R1',
        cells: ['R1C2', 'R1C5'],
        digits: [1, 2],
        eliminations: [['R1C2', 4], ['R1C2', 5], ['R1C5', 3], ['R1C5', 6]]
      });
    });

    it('does not report a hidden triple again as a hidden quad', function () {
      var state = handMade(model9, rowSpec(1, ['1256', '2367', '1347', '4789', '5678', '5679', '5689', '6789',
        '5789']), '56789');
      expectNoRepeat('hiddenTriple', 'hiddenQuad', state, {
        unit: 'R1',
        cells: ['R1C1', 'R1C2', 'R1C3'],
        digits: [1, 2, 3],
        eliminations: [['R1C1', 5], ['R1C1', 6], ['R1C2', 6], ['R1C2', 7], ['R1C3', 4], ['R1C3', 7]]
      });
    });

    it('does not report a subset that contains a single (a pending naked or hidden single)', function () {
      // R1C1 is a naked single {1}; R1C2 {1,2} would make a "pair" with it.
      var naked = handMade(model9, rowSpec(1, ['1', '12', '123', '1234', '2345', '3456', '4567', '5678',
        '6789']), '456789');
      expectNone(['nakedPair', 'nakedTriple', 'nakedQuad'], naked);
      // Digit 1 fits only R1C1: a hidden single. Digit 2 fits R1C1 and R1C2.
      var hidden = handMade(model9, rowSpec(1, ['1234', '2345', '3456', '4567', '5678', '6789', '3456',
        '4567', '5678']), '456789');
      expectNone(['hiddenPair', 'hiddenTriple', 'hiddenQuad'], hidden);
    });

    it('never returns a Finding with a smaller subset inside, on states from the whole ladder', function () {
      // Walks random positions with the six techniques in ladder order, so that the smaller subsets are
      // applied (and still sit in the grid) before the bigger ones are asked.
      var items = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(9001), 400);
      var seen = {};
      items.forEach(function (item, index) {
        var state = SG.model.cloneState(item.state);
        for (var step = 0; step < 60; step++) {
          var fired = null;
          for (var i = 0; i < IDS.length && fired === null; i++) {
            var finding = find(IDS[i], model9, state);
            if (finding !== null) fired = { id: IDS[i], finding: finding };
          }
          if (fired === null) return;
          var items0 = itemsOf(model9, state, fired.finding, fired.id);
          if (hasSmallerSubset(items0)) {
            throw new Error(fired.id + ' reported a subset with a smaller one inside on state #' + index +
              ': ' + JSON.stringify(fired.finding));
          }
          seen[fired.id] = (seen[fired.id] || 0) + 1;
          applyFinding(model9, state, fired.finding);
          if (!SG.constraints.propagate(model9, state)) throw new Error('contradiction on state #' + index);
        }
      });
      IDS.forEach(function (id) { expect(seen[id]).toBeGreaterThan(0); });
    });
  });

  describe('subset techniques: oracle comparison', function () {
    /** Walks states and compares find() with the oracle at every step; returns how often it fired. */
    function compareOn(id, model, items, maxSteps) {
      var firings = 0;
      items.forEach(function (item, index) {
        var state = SG.model.cloneState(item.state);
        for (var step = 0; step < maxSteps; step++) {
          var where = 'state #' + index + ' step ' + step;
          var finding = expectSameAsOracle(id, model, state, where);
          if (finding === null) return;
          firings++;
          if (hasSmallerSubset(itemsOf(model, state, finding, id))) {
            throw new Error(id + ' reported a degenerate subset, ' + where);
          }
          applyFinding(model, state, finding);
          if (!SG.constraints.propagate(model, state)) throw new Error('contradiction, ' + where);
        }
      });
      return firings;
    }

    IDS.forEach(function (id) {
      it(id + ' agrees with the oracle on classic9 positions', function () {
        var items = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(31337), 120);
        expect(compareOn(id, model9, items, 12)).toBeGreaterThan(10);
      });

      it(id + ' agrees with the oracle on classic6 and classic4 positions', function () {
        var fired = 0;
        [model6, model4].forEach(function (model) {
          var items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(555), 80);
          fired += compareOn(id, model, items, 10);
        });
        // A quad of a 4x4 never has a cell left to change, so only the 6x6 can fire for the quads.
        expect(fired).toBeGreaterThan(id.indexOf('Quad') !== -1 ? 0 : 5);
      });

      it(id + ' agrees with the oracle on random candidate grids of 12 digits', function () {
        var items = candidateStates(model12, 777, 8, [0.1, 0.25]);
        expect(compareOn(id, model12, items, 6)).toBeGreaterThan(0);
      });
    });

    IDS.forEach(function (id) {
      it(id + ' agrees with the oracle with diagonal, window and jigsaw units', function () {
        var fired = 0;
        [diagonalModel, hyperModel, jigsawModel].forEach(function (model) {
          fired += compareOn(id, model, candidateStates(model, 4711, 14, [0.06, 0.22]), 6);
        });
        expect(fired).toBeGreaterThan(0);
      });
    });
  });

  describe('subset techniques: any digit count', function () {
    it('4x4: naked and hidden pair', function () {
      expectSubset('nakedPair', handMade(model4, rowSpec(1, ['12', '12', '234', '134'])), {
        unit: 'R1',
        cells: ['R1C1', 'R1C2'],
        digits: [1, 2],
        eliminations: [['R1C3', 2], ['R1C4', 1]]
      });
      expectSubset('hiddenPair', handMade(model4, rowSpec(2, ['123', '124', '34', '34'])), {
        unit: 'R2',
        cells: ['R2C1', 'R2C2'],
        digits: [1, 2],
        eliminations: [['R2C1', 3], ['R2C2', 4]]
      });
    });

    it('4x4: the quads can never fire, there is no cell left to change', function () {
      var state = handMade(model4, rowSpec(1, ['12', '23', '34', '14']));
      expectNone(['nakedQuad', 'hiddenQuad'], state);
    });

    it('6x6: naked triple and hidden quad', function () {
      expectSubset('nakedTriple', handMade(model6, rowSpec(1, ['12', '23', '13', '1456', '2456', '3456'])), {
        unit: 'R1',
        cells: ['R1C1', 'R1C2', 'R1C3'],
        digits: [1, 2, 3],
        eliminations: [['R1C4', 1], ['R1C5', 2], ['R1C6', 3]]
      });
      expectSubset('hiddenQuad', handMade(model6, rowSpec(1, ['125', '236', '346', '145', '56', '56'])), {
        unit: 'R1',
        cells: ['R1C1', 'R1C2', 'R1C3', 'R1C4'],
        digits: [1, 2, 3, 4],
        eliminations: [['R1C1', 5], ['R1C2', 6], ['R1C3', 6], ['R1C4', 5]]
      });
    });

    it('12 digits: hidden triple (digits written A, B, C for 10, 11, 12)', function () {
      var state = handMade(model12, rowSpec(2, ['456789ABC', '1245', '456789ABC', '456789ABC', '2356',
        '456789ABC', '456789ABC', '1346', '456789ABC', '456789ABC', '456789ABC', '456789ABC']), '456789ABC');
      expectSubset('hiddenTriple', state, {
        unit: 'R2',
        cells: ['R2C2', 'R2C5', 'R2C8'],
        digits: [1, 2, 3],
        eliminations: [['R2C2', 4], ['R2C2', 5], ['R2C5', 5], ['R2C5', 6], ['R2C8', 4], ['R2C8', 6]]
      });
    });

    it('16 digits: naked pair and naked quad', function () {
      var fill = '123456789CDEFG';
      var pairRow = rowSpec(3, ['AB', 'AB', 'ABC', 'BDE']);
      expectSubset('nakedPair', handMade(model16, pairRow, fill), {
        unit: 'R3',
        cells: ['R3C1', 'R3C2'],
        digits: [10, 11],
        eliminations: [['R3C3', 10], ['R3C3', 11], ['R3C4', 11]]
      });
      var quadRow = rowSpec(5, ['AB', 'BC', 'CD', 'AD', 'AEFG', 'CEFG']);
      expectSubset('nakedQuad', handMade(model16, quadRow, '123456789EFG'), {
        unit: 'R5',
        cells: ['R5C1', 'R5C2', 'R5C3', 'R5C4'],
        digits: [10, 11, 12, 13],
        eliminations: [['R5C5', 10], ['R5C6', 12]]
      });
    });

    it('16 digits: hidden quad', function () {
      // Digits A..D fit only R4C1..R4C4 in a 16-cell row: A: C1 C4, B: C1 C2, C: C2 C3, D: C3 C4.
      var state = handMade(model16, rowSpec(4, ['ABEF', 'BCEG', 'CDFG', 'ADEF']), '123456789EFG');
      expectSubset('hiddenQuad', state, {
        unit: 'R4',
        cells: ['R4C1', 'R4C2', 'R4C3', 'R4C4'],
        digits: [10, 11, 12, 13],
        eliminations: [['R4C1', 14], ['R4C1', 15], ['R4C2', 14], ['R4C2', 16], ['R4C3', 15], ['R4C3', 16],
          ['R4C4', 14], ['R4C4', 15]]
      });
    });

    it('is sound on classic4 and classic6 puzzles (I7)', function () {
      var fired = {};
      IDS.forEach(function (id) {
        fired['6:' + id] = H.assertSound(SG.test, id, { model: model6, count: 200 }).firings;
        fired['4:' + id] = H.assertSound(SG.test, id, { model: model4, count: 120 }).firings;
      });
      expect(fired['6:nakedPair']).toBeGreaterThan(2);
      expect(fired['4:nakedPair']).toBeGreaterThan(2);
      expect(fired['6:nakedTriple']).toBeGreaterThan(0);
      expect(fired['6:hiddenQuad']).toBeGreaterThan(0);
    });

    it('is sound on random candidate grids of 12 and 16 digits (I7)', function () {
      [[model12, 12012, 40], [model16, 16016, 30]].forEach(function (spec) {
        var states = candidateStates(spec[0], spec[1], spec[2], [0.06, 0.2]);
        IDS.forEach(function (id) {
          H.assertSound(SG.test, id, { model: spec[0], states: states, minFirings: 3 });
        });
      });
    });
  });

  describe('subset techniques: any unit shape', function () {
    function unitContaining(model, kind, ref) {
      var cell = H.cell(model, ref);
      for (var u = 0; u < model.units.length; u++) {
        if (model.unitMeta[u].kind === kind && Array.prototype.indexOf.call(model.units[u], cell) !== -1) {
          return u;
        }
      }
      throw new Error('no ' + kind + ' unit holds ' + ref);
    }

    it('finds a naked pair on a diagonal, where the two cells share no row, column or box', function () {
      var state = handMade(diagonalModel, { R2C2: '12', R7C7: '12', R4C4: '1345', R5C5: '2678' }, '3456789');
      expectSubset('nakedPair', state, {
        unit: 'D1',
        cells: ['R2C2', 'R7C7'],
        digits: [1, 2],
        eliminations: [['R4C4', 1], ['R5C5', 2]]
      });
    });

    it('finds a hidden pair on a diagonal', function () {
      var state = handMade(diagonalModel, { R2C2: '1234', R7C7: '1256' }, '3456789');
      expectSubset('hiddenPair', state, {
        unit: 'D1',
        cells: ['R2C2', 'R7C7'],
        digits: [1, 2],
        eliminations: [['R2C2', 3], ['R2C2', 4], ['R7C7', 5], ['R7C7', 6]]
      });
    });

    it('finds a naked pair and a hidden pair in a Hyper window', function () {
      expectSubset('nakedPair', handMade(hyperModel, { R2C2: '12', R3C4: '12', R4C3: '1345', R3C3: '2678' },
        '3456789'), {
        unit: 'W1',
        cells: ['R2C2', 'R3C4'],
        digits: [1, 2],
        eliminations: [['R3C3', 2], ['R4C3', 1]]
      });
      expectSubset('hiddenPair', handMade(hyperModel, { R2C2: '1234', R3C4: '1256' }, '3456789'), {
        unit: 'W1',
        cells: ['R2C2', 'R3C4'],
        digits: [1, 2],
        eliminations: [['R2C2', 3], ['R2C2', 4], ['R3C4', 5], ['R3C4', 6]]
      });
    });

    it('finds a naked pair and a hidden pair in an irregular jigsaw region', function () {
      var u = unitContaining(jigsawModel, 'region', 'R1C1');
      // The swapped cell R4C3 belongs to this region, so it spans four rows.
      expect(Array.prototype.indexOf.call(jigsawModel.units[u], H.cell(jigsawModel, 'R4C3'))).not.toBe(-1);
      var label = jigsawModel.unitMeta[u].label;
      expectSubset('nakedPair', handMade(jigsawModel, { R1C1: '12', R4C3: '12', R2C2: '1345', R3C1: '2678' },
        '3456789'), {
        unit: label,
        cells: ['R1C1', 'R4C3'],
        digits: [1, 2],
        eliminations: [['R2C2', 1], ['R3C1', 2]]
      });
      expectSubset('hiddenPair', handMade(jigsawModel, { R1C1: '1234', R4C3: '1256' }, '3456789'), {
        unit: label,
        cells: ['R1C1', 'R4C3'],
        digits: [1, 2],
        eliminations: [['R1C1', 3], ['R1C1', 4], ['R4C3', 5], ['R4C3', 6]]
      });
    });

    it('is quiet on the same diagonal pattern when the cells hold other candidates', function () {
      var state = handMade(diagonalModel, { R2C2: '12', R7C7: '13', R4C4: '1345', R5C5: '2678' }, '3456789');
      expectNone(['nakedPair', 'hiddenPair'], state);
    });

    it('only trusts hidden subsets in complete units, naked subsets work in partial ones', function () {
      // A 4x4 grid with one extra all-different unit of three cells (not every digit has to appear in it).
      var partial = shapedModel('subset-partial', 4, 2, 2,
        [{ kind: 'region', label: 'P1', cells: [0, 6, 11], partial: true }]);
      var p1 = unitIndexOf(partial, 'P1');
      expect(SG.techniques.createContext(partial).completeUnits[p1]).toBe(0);
      expectSubset('nakedPair', handMade(partial, { R1C1: '12', R2C3: '12' }), {
        unit: 'P1',
        cells: ['R1C1', 'R2C3'],
        digits: [1, 2],
        eliminations: [['R3C4', 1], ['R3C4', 2]]
      });
      // 1 and 2 fit only R1C1 and R2C3 inside P1, but P1 does not have to contain them: no deduction.
      expectNone(['hiddenPair'], handMade(partial, { R1C1: '1234', R2C3: '1234', R3C4: '34' }));
    });

    it('is sound on random candidate grids with diagonal, window and jigsaw units (I7)', function () {
      [diagonalModel, hyperModel, jigsawModel].forEach(function (model, i) {
        var states = candidateStates(model, 600 + i, 30, [0.06, 0.22]);
        IDS.forEach(function (id) {
          H.assertSound(SG.test, id, { model: model, states: states, minFirings: 3 });
        });
      });
    });

    it('is sound on a samurai (overlapping grids share cells and units) (I7)', function () {
      var samurai = M.samurai();
      var states = candidateStates(samurai, 99, 6, [0.08, 0.2]);
      IDS.forEach(function (id) {
        H.assertSound(SG.test, id, { model: samurai, states: states, minFirings: 1 });
      });
    });
  });

  describe('subset techniques: contract', function () {
    it('returns one deduction: no placements, real eliminations, cells inside the unit', function () {
      var items = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(2468), 80);
      var checked = 0;
      items.forEach(function (item) {
        IDS.forEach(function (id) {
          var finding = find(id, model9, item.state);
          if (finding === null) return;
          checked++;
          expect(finding.technique).toBe(id);
          expect(finding.placements).toEqual([]);
          expect(finding.cells.length).toBe(SIZE[id]);
          expect(new Set(finding.cells).size).toBe(SIZE[id]);
          var unitIndex = unitIndexOf(model9, finding.i18nArgs.unit);
          var unit = model9.units[unitIndex];
          finding.cells.forEach(function (c) { expect(Array.prototype.indexOf.call(unit, c)).not.toBe(-1); });
          expect(finding.i18nArgs.size).toBe(SIZE[id]);
          expect(finding.i18nArgs.digits.length).toBe(SIZE[id]);
          expect(finding.i18nArgs.cells.length).toBe(SIZE[id]);
          expect(finding.i18nArgs.unitKind).toBe(model9.unitMeta[unitIndex].kind);
          var keys = finding.eliminations.map(function (e) { return e[0] + ':' + e[1]; });
          expect(new Set(keys).size).toBe(keys.length);
          expect(H.findingProblems(model9, item.state, finding, { technique: id, solution: item.solution }))
            .toEqual([]);
        });
      });
      expect(checked).toBeGreaterThan(50);
    });

    it('asks the budget while it scans and stops with budget.exceeded when it is spent', function () {
      var puzzle = REAL.nakedPair[0].puzzle;
      IDS.forEach(function (id) {
        var tech = SG.techniques.get(id);
        // Used up, so find() scans every unit and has to ask the budget at least once per unit.
        var quiet = settle(model9, H.makeState(model9, puzzle), [id]);
        var budget = SG.budget.create({ nodes: 1000000 });
        expect(tech.find(model9, quiet, SG.techniques.createContext(model9, { budget: budget }))).toBeNull();
        expect(budget.nodes).toBeGreaterThanOrEqual(model9.units.length);

        var spent = SG.budget.create({ nodes: 0 });
        var caught = null;
        try {
          tech.find(model9, quiet, SG.techniques.createContext(model9, { budget: spent }));
        } catch (err) {
          caught = err;
        }
        expect(caught).toBeTruthy();
        expect(caught.code).toBe('budget.exceeded');
      });
    });

    it('does not change a state and answers the same twice (also with SG.DEBUG on)', function () {
      var debugBefore = SG.DEBUG;
      SG.setDebug(true);
      try {
        var items = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(1357), 40);
        items.forEach(function (item) {
          IDS.forEach(function (id) {
            var copy = SG.model.cloneState(item.state);
            var first = find(id, model9, item.state);
            var second = find(id, model9, item.state);
            expect(second).toEqual(first);
            expect(item.state.candidates).toEqual(copy.candidates);
            expect(item.state.value).toEqual(copy.value);
          });
        });
      } finally {
        SG.setDebug(debugBefore);
      }
    });

    it('runs inside the logical solver and is credited at the ladder cost', function () {
      var debugBefore = SG.DEBUG;
      SG.setDebug(true);
      var used = {};
      try {
        F.unique.forEach(function (fixture) {
          var givens = F.parse(fixture.puzzle.replace(/\./g, '0'));
          var report = SG.logicalSolver.solve(model9, givens, { allowedTechniques: IDS, collectSteps: true });
          var counts = {};
          var empty = Array.prototype.filter.call(givens, function (g) { return g === 0; }).length;
          var expectedScore = 0.6 * empty;
          var hardest = null;
          report.steps.forEach(function (step) {
            expect(IDS).toContain(step.technique);
            expect(step.eliminations.length).toBeGreaterThan(0);
            expect(step.placements).toEqual([]);
            expectedScore += LADDER[step.technique].cost * (counts[step.technique] ? 1 : 1.5);
            counts[step.technique] = (counts[step.technique] || 0) + 1;
            used[step.technique] = true;
            if (hardest === null || LADDER[step.technique].order > LADDER[hardest].order) {
              hardest = step.technique;
            }
          });
          expect(report.techniqueCounts).toEqual(counts);
          expect(report.score).toBeCloseTo(expectedScore, 6);
          expect(report.hardestTechnique).toBe(hardest);
          // The stuck position still holds the true solution in every cell.
          var solution = SG.dfs.solve(model9, givens);
          for (var c = 0; c < model9.cellCount; c++) {
            expect(report.state.candidates[c] & (1 << (solution[c] - 1))).not.toBe(0);
          }
        });
      } finally {
        SG.setDebug(debugBefore);
      }
      IDS.forEach(function (id) { expect(used[id]).toBe(true); });
    });
  });

  describe('subset techniques: performance', function () {
    /** Positions where the technique is used up, so that find() has to scan every unit and returns null. */
    function usedUp(model, id, states, wanted) {
      var out = [];
      states.forEach(function (item) {
        if (out.length >= wanted) return;
        var state = SG.model.cloneState(item.state);
        settle(model, state, [id]);
        if (state.unsolvedCount >= 20) out.push(state);
      });
      return out;
    }

    /** Best of several rounds of the mean time of one find() over all the states, in milliseconds. */
    function bestScanMs(model, id, states, reps) {
      var tech = SG.techniques.get(id);
      var ctx = SG.techniques.createContext(model, {});
      var best = Infinity;
      for (var round = 0; round < 5; round++) {
        var start = now();
        for (var r = 0; r < reps; r++) {
          for (var i = 0; i < states.length; i++) tech.find(model, states[i], ctx);
        }
        best = Math.min(best, (now() - start) / (reps * states.length));
      }
      return best;
    }

    var cache = {};
    function positions9(id) {
      if (!cache[id]) {
        cache[id] = usedUp(model9, id, H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(808), 80), 12);
      }
      return cache[id];
    }

    IDS.forEach(function (id) {
      it(id + ' scans all 27 units of a 9x9 in under 1 ms', function () {
        var states = positions9(id);
        expect(states.length).toBeGreaterThan(5);
        states.forEach(function (state) { expect(find(id, model9, state)).toBeNull(); });
        expect(bestScanMs(model9, id, states, 40)).toBeLessThan(1);
      });

      bench('subset scan of 27 units, 9x9: ' + id, function () {
        var states = positions9(id);
        for (var i = 0; i < states.length; i++) find(id, model9, states[i]);
      }, 100);
    });

    it('stays cheap on 16-digit grids, where k = 4 has C(16,4) = 1820 combinations per unit', function () {
      var states = candidateStates(model16, 1616, 6, [0.12, 0.2]).map(function (item) { return item.state; });
      // Worst case for the search: every cell holds 2-4 of the same six digits, so almost every partial
      // combination survives until the union outgrows the subset size.
      var rng = SG.testkit.rng.create(1234);
      var crowded = SG.model.initState(model16);
      for (var c = 0; c < model16.cellCount; c++) {
        var mask = 0;
        var wanted = 2 + Math.floor(rng.next() * 3);
        while (SG.bits.popcount(mask) < wanted) mask |= 1 << Math.floor(rng.next() * 6);
        crowded.candidates[c] = mask;
      }
      states.push(crowded);
      states.forEach(function (state) { expect(state.unsolvedCount).toBeGreaterThan(100); });
      IDS.forEach(function (id) {
        expect(bestScanMs(model16, id, states, 3)).toBeLessThan(5);
      });
    });
  });
})();
