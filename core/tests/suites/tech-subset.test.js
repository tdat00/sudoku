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

    it('counts its search nodes per call: the same Finding and the same budget checks after other calls',
      function () {
        function run(id, state) {
          var budget = { calls: 0, check: function () { budget.calls++; } };
          var finding = find(id, model9, state, { budget: budget });
          return { finding: finding, checks: budget.calls };
        }
        // The checks are spaced by search nodes (every 256th): a counter that outlives a call would check the
        // same state at another point of its scan after other calls. Forty rounds of every subset technique
        // in between walk the counter through many positions.
        var states = candidateStates(model9, 8642, 6, [0.1, 0.3]).map(function (item) { return item.state; });
        var found = 0;
        IDS.forEach(function (id) {
          states.forEach(function (state, i) {
            var snapshot = SG.model.cloneState(state);
            var base = run(id, state);
            if (base.finding !== null) found++;
            for (var round = 0; round < 40; round++) {
              IDS.forEach(function (other) { run(other, states[(i + 1 + round) % states.length]); });
              var again = run(id, state);
              expect([id, i, round, again.checks]).toEqual([id, i, round, base.checks]);
              expect(again.finding).toEqual(base.finding);
            }
            expect(state.candidates).toEqual(snapshot.candidates);
            expect(state.value).toEqual(snapshot.value);
          });
        });
        expect(found).toBeGreaterThan(0);
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

  // Law of leftovers (MS14a, R17; registered by MS14b): the complete-support finder, here as SG.leftoverPatterns.find (the
  // seam with a work limit) and as the registered technique `lawOfLeftovers`. The helper's registry based checks do not
  // apply to a Jigsaw-only technique, so the checks below are their own. Every expectation comes from `oracle`, a
  // deliberately naive enumeration built only from model.units, model.unitMeta and the units' cells (no table
  // of the finder, no bit mask, signatures as sorted digit lists), from hand-checked vectors, or from known
  // solutions that satisfy every unit of their board.
  (function () {
    var J = SG.fixtures.jigsawModels;
    var LO = SG.leftoverPatterns;
    var ID = 'lawOfLeftovers';
    var UNCAPPED = 100000000;
    // The layouts with choices of units that leave few cells over (the ordinary `boxes` has none).
    var NAMES = ['staggered', 'wavy', 'mixed', 'crossed'];
    // Two vectors on the board `crossed`, whose only choices are R1+R2 with J1+J2 (leaving R1C9, R2C1, R2C9 and R3C3,
    // R3C8, R4C8) and R8+R9 with J8+J9 (R8C3, R8C9, R9C9 and R7C2, R7C5, R7C6). FIRST: the line side holds 1, 1, 2 and
    // the region side is 1 2 1 or 2 1 2, so the multiset {1, 1, 2} keeps only 1 2 1. SECOND: the line side holds 1, 3, 4
    // and R7C2 may not be 5 (the digits stay clear of the column 9 of the first vector).
    var FIRST = { given: { R1C9: 1, R2C1: 1, R2C9: 2 }, open: { R3C3: '12', R3C8: '12', R4C8: '12' } };
    var SECOND = { given: { R8C3: 1, R8C9: 3, R9C9: 4 }, open: { R7C2: '1345', R7C5: '134', R7C6: '134' } };

    var boards = {};
    /** The model of a named layout; `transposed` swaps rows and columns, so the columns become the lines. */
    function board(name, transposed) {
      var key = name + (transposed ? ' (transposed)' : '');
      if (!boards[key]) {
        var layout = J.parse(J.LAYOUTS[name]);
        boards[key] = J.build(transposed ? J.transpose(layout) : layout);
      }
      return boards[key];
    }

    /**
     * A hand-made position. `given` cells ({ R9C1: 5 }) are placed the way the solver places a given, so that
     * the digit leaves their peers; `single` cells ({ R9C1: 5 }) keep the one candidate and the digit leaves their
     * peers, but nothing is placed (a naked single that is not placed yet); `fixed` cells hold a value with no
     * peer elimination (a hand-made position, used where the peers matter); `open` cells ({ R8C9: '57' }) keep only
     * the listed candidates. Every other cell keeps all its digits, nothing is propagated.
     */
    function position(model, spec) {
      var state = SG.model.initState(model);
      Object.keys(spec.given || {}).forEach(function (ref) {
        if (!SG.constraints.assign(model, state, H.cell(model, ref), spec.given[ref])) throw new Error('bad given');
      });
      Object.keys(spec.single || {}).forEach(function (ref) {
        var c = H.cell(model, ref);
        Array.prototype.forEach.call(model.peers[c], function (p) {
          if (!SG.constraints.eliminate(model, state, p, spec.single[ref])) throw new Error('bad single');
        });
        state.candidates[c] = 1 << (spec.single[ref] - 1);
      });
      Object.keys(spec.open || {}).forEach(function (ref) {
        var mask = 0;
        String(spec.open[ref]).split('').forEach(function (d) { mask |= 1 << (Number(d) - 1); });
        state.candidates[H.cell(model, ref)] = mask;
      });
      Object.keys(spec.fixed || {}).forEach(function (ref) {
        var c = H.cell(model, ref);
        state.value[c] = spec.fixed[ref];
        state.candidates[c] = 1 << (spec.fixed[ref] - 1);
        state.unsolvedCount--;
      });
      return state;
    }

    /**
     * A bare model of the variant jigsaw9: `cellCount` cells in one row and only the listed units, each
     * { kind, label, cells, partial? }, so that no other unit lets two cells see each other.
     */
    function bare(cellCount, units) {
      var cellRow = [];
      var cellCol = [];
      for (var c = 0; c < cellCount; c++) {
        cellRow.push(0);
        cellCol.push(c);
      }
      return SG.model.create({
        variantId: 'jigsaw9',
        digits: 9,
        cellCount: cellCount,
        units: units.map(function (u) { return u.cells; }),
        unitMeta: units.map(function (u) { return { kind: u.kind, label: u.label, partial: u.partial === true }; }),
        layout: { rows: 1, cols: cellCount, cellRow: cellRow, cellCol: cellCol }
      });
    }

    /** True when every unit of the board holds every digit exactly once in `solution` (the full units). */
    function validSolution(model, solution) {
      return model.units.every(function (cells) {
        var digits = Array.prototype.map.call(cells, function (c) { return solution[c]; }).sort(numeric);
        return digits.length === model.digits && digits.every(function (d, i) { return d === i + 1; });
      });
    }

    var solutionCache = {};
    /**
     * A known solution of the board, with two digits swapped so that cell `ref` holds `digit` (swapping two digits
     * of a solution gives a solution).
     */
    function solutionWith(model, ref, digit) {
      var key = model.layout.cellRegion.join('');
      if (!solutionCache[key]) solutionCache[key] = J.solve(model, SG.testkit.rng.create(20261117));
      var base = solutionCache[key];
      var had = base[H.cell(model, ref)];
      return Int32Array.from(base, function (v) { return v === had ? digit : v === digit ? had : v; });
    }

    /** The position of `solution` with every cell fixed but the `open` ones ({ R9C1: '5' } keeps those candidates). */
    function solved(model, solution, open) {
      var state = SG.model.initState(model);
      for (var c = 0; c < model.cellCount; c++) {
        state.value[c] = solution[c];
        state.candidates[c] = 1 << (solution[c] - 1);
      }
      state.unsolvedCount = 0;
      Object.keys(open).forEach(function (ref) {
        var cell = H.cell(model, ref);
        var mask = 0;
        String(open[ref]).split('').forEach(function (d) { mask |= 1 << (Number(d) - 1); });
        state.value[cell] = 0;
        state.candidates[cell] = mask;
        state.unsolvedCount++;
      });
      return state;
    }

    /**
     * Seeded positions that contain a known solution (the fixture's, found with restarts: see J.solve): a share of
     * the cells is placed the way a given is, and every other wrong candidate stays with the chance of a draw
     * from `keepRange`, so that the cells left over by a choice often have few candidates.
     */
    function leftoverStates(model, seed, count, keepRange) {
      var rng = SG.testkit.rng.create(seed);
      var out = [];
      for (var i = 0; i < count; i++) {
        var solution = J.solve(model, rng.fork('grid' + i));
        var pick = rng.fork('pick' + i);
        var placedShare = 0.05 + 0.3 * pick.next();
        var keep = keepRange[0] + (keepRange[1] - keepRange[0]) * pick.next();
        var state = SG.model.initState(model);
        var c;
        for (c = 0; c < model.cellCount; c++) {
          if (pick.next() < placedShare) SG.constraints.assign(model, state, c, solution[c]);
        }
        for (c = 0; c < model.cellCount; c++) {
          if (state.value[c] !== 0) continue;
          for (var v = 1; v <= model.digits; v++) {
            if (v !== solution[c] && (state.candidates[c] & (1 << (v - 1))) !== 0 && pick.next() >= keep) {
              SG.constraints.eliminate(model, state, c, v);
            }
          }
        }
        out.push({ state: state, solution: solution, kind: 'seeded' });
      }
      return out;
    }

    /** One call with an observer; `options` is the seam ({ workLimit }), `contextOptions` extends the context. */
    function call(model, state, options, contextOptions) {
      var records = [];
      var ctx = SG.techniques.createContext(model, Object.assign({
        onPatternWork: function (r) { records.push(r); }
      }, contextOptions));
      var finding = LO.find(model, state, ctx, options);
      return { finding: finding, records: records, record: records[0] };
    }

    /** The call of the vectors: the work limit is lifted, so that a flood of other choices cannot hide the point. */
    function lifted(model, state) { return call(model, state, { workLimit: UNCAPPED }); }

    function caught(fn) {
      try {
        fn();
      } catch (err) {
        return err;
      }
      return null;
    }

    /** The eliminations of a Finding as 'cell:digit' texts. */
    function removed(finding) {
      return finding.eliminations.map(function (e) { return e[0] + ':' + e[1]; });
    }

    /** The cell indices of cell labels. */
    function at(model, refs) {
      return refs.map(function (ref) { return H.cell(model, ref); });
    }

    // ----- the oracle: the same rule, written the slow and obvious way

    var seeingTables = new WeakMap();
    /** True when some unit holds both cells (computed from the units only). */
    function sees(model, a, b) {
      var table = seeingTables.get(model);
      if (!table) {
        table = {};
        model.units.forEach(function (cells) {
          for (var i = 0; i < cells.length; i++) {
            for (var j = 0; j < cells.length; j++) if (i !== j) table[cells[i] * model.cellCount + cells[j]] = true;
          }
        });
        seeingTables.set(model, table);
      }
      return table[a * model.cellCount + b] === true;
    }

    /** The complete units of one kind (as many cells as digits, not partial), by unit index. */
    function completeOfKind(model, kind) {
      var out = [];
      for (var u = 0; u < model.units.length; u++) {
        var meta = model.unitMeta[u];
        if (meta.kind === kind && model.units[u].length === model.digits && meta.partial !== true) out.push(u);
      }
      return out;
    }

    function overlaps(model, chosen, unit) {
      return chosen.some(function (other) {
        return Array.prototype.some.call(model.units[other], function (c) {
          return Array.prototype.indexOf.call(model.units[unit], c) !== -1;
        });
      });
    }

    function cellsOfUnits(model, units) {
      var out = [];
      units.forEach(function (u) { Array.prototype.forEach.call(model.units[u], function (c) { out.push(c); }); });
      return out;
    }

    /**
     * Every assignment of digits to `cells` (a fixed cell holds its value, an open cell one of its candidates,
     * cells that see each other differ), by plain recursion; `count.tests` is raised once for every digit tried
     * at a cell, accepted or not.
     */
    function assignmentsOf(model, state, cells, count) {
      var options = cells.map(function (c) {
        return state.value[c] !== 0 ? [state.value[c]] : digitList(state.candidates[c], model.digits);
      });
      var out = [];
      (function walk(i, chosen) {
        if (i === cells.length) {
          out.push(chosen.slice());
          return;
        }
        options[i].forEach(function (digit) {
          count.tests++;
          for (var q = 0; q < i; q++) if (chosen[q] === digit && sees(model, cells[q], cells[i])) return;
          chosen.push(digit);
          walk(i + 1, chosen);
          chosen.pop();
        });
      })(0, []);
      return out;
    }

    /** signature (the sorted digits of an assignment, so repeats count) -> per cell, the digits it takes. */
    function supportBySignature(assignments, size) {
      var table = {};
      assignments.forEach(function (assignment) {
        var key = assignment.slice().sort(numeric).join(',');
        if (!table[key]) {
          table[key] = [];
          for (var i = 0; i < size; i++) table[key].push({});
        }
        assignment.forEach(function (digit, i) { table[key][i][digit] = true; });
      });
      return table;
    }

    /**
     * The first choice of units, in the documented order, that removes a candidate. Returns { result, work }:
     * `result` is null (nothing), 'declined' (a choice whose two sides share no signature) or the expected
     * { lines, regions, cells, eliminations, digits, kind, n }; `work` counts the tested extensions the kernel makes
     * up to that point: units tried as the next of a side (the ones that can still complete the side) and digits
     * tried for the next cell of a side. With an array as `collect`, every removing choice is appended to it, in
     * order, and the scan goes on (the work is then the whole scan's).
     */
    function oracle(model, state, collect) {
      var count = { tests: 0 };
      var result = null;
      var done = false;

      function pickUnits(pool, n, depth, from, chosen, then) {
        for (var i = from; i <= pool.length - (n - depth) && !done; i++) {
          count.tests++;
          if (overlaps(model, chosen, pool[i])) continue;
          chosen.push(pool[i]);
          if (depth + 1 < n) pickUnits(pool, n, depth + 1, i + 1, chosen, then);
          else then(chosen.slice());
          chosen.pop();
        }
      }

      function consider(lines, regions) {
        var L = cellsOfUnits(model, lines);
        var G = cellsOfUnits(model, regions);
        var a = L.filter(function (c) { return G.indexOf(c) === -1; }).sort(numeric);
        var b = G.filter(function (c) { return L.indexOf(c) === -1; }).sort(numeric);
        if (a.length < 1 || a.length > 4 || a.length !== b.length) return;
        var anyOpen = a.concat(b).some(function (c) { return state.value[c] === 0; });
        if (!anyOpen) return;
        var tableA = supportBySignature(assignmentsOf(model, state, a, count), a.length);
        var tableB = supportBySignature(assignmentsOf(model, state, b, count), b.length);
        var shared = Object.keys(tableA).filter(function (key) { return tableB[key] !== undefined; });
        if (shared.length === 0) {
          result = 'declined';
          done = true;
          return;
        }
        var eliminations = [];
        [[a, tableA], [b, tableB]].forEach(function (side) {
          side[0].forEach(function (c, i) {
            if (state.value[c] !== 0) return;
            digitList(state.candidates[c], model.digits).forEach(function (digit) {
              var taken = shared.some(function (key) { return side[1][key][i][digit] === true; });
              if (!taken) eliminations.push([c, digit]);
            });
          });
        });
        if (eliminations.length === 0) return;
        eliminations.sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; });
        var digits = [];
        eliminations.forEach(function (e) { if (digits.indexOf(e[1]) === -1) digits.push(e[1]); });
        var found = {
          lines: lines.map(function (u) { return model.unitMeta[u].label; }),
          regions: regions.map(function (u) { return model.unitMeta[u].label; }),
          cells: a.concat(b).sort(numeric),
          eliminations: eliminations,
          digits: digits.sort(numeric),
          kind: model.unitMeta[lines[0]].kind,
          n: lines.length
        };
        if (collect) {
          collect.push(found);
          return;
        }
        result = found;
        done = true;
      }

      for (var n = 1; n <= 2 && !done; n++) {
        ['row', 'col'].forEach(function (kind) {
          if (done) return;
          pickUnits(completeOfKind(model, kind), n, 0, 0, [], function (lines) {
            if (done) return;
            pickUnits(completeOfKind(model, 'region'), n, 0, 0, [], function (regions) {
              if (!done) consider(lines, regions);
            });
          });
        });
      }
      return { result: result, work: count.tests };
    }

    /**
     * The kernel and the oracle agree on this state, field by field and in work (the work limit is lifted).
     * Returns { finding, work, declined }.
     */
    function expectSame(model, state, where) {
      var out = lifted(model, state);
      var truth = oracle(model, state);
      var tag = where === undefined ? '' : ' (' + where + ')';
      expect(out.record.capHit).toBeNull();
      expect(out.record.work + tag).toBe(truth.work + tag);
      if (truth.result === null || truth.result === 'declined') {
        expect(out.finding === null ? 'null' + tag : JSON.stringify(out.finding)).toBe('null' + tag);
        return { finding: null, work: truth.work, declined: truth.result === 'declined' };
      }
      expect(out.finding).not.toBeNull();
      var expected = truth.result;
      expect(out.finding.technique).toBe(ID);
      expect(out.finding.i18nKey).toBe('technique.lawOfLeftovers.step');
      expect(out.finding.placements).toEqual([]);
      expect(out.finding.cells).toEqual(expected.cells);
      expect(out.finding.eliminations).toEqual(expected.eliminations);
      expect(out.finding.i18nArgs).toEqual({
        lines: expected.lines,
        regions: expected.regions,
        cells: expected.cells.map(function (c) { return SG.model.cellLabel(model, c); }),
        digits: expected.digits
      });
      return { finding: out.finding, work: truth.work, declined: false };
    }

    describe('law of leftovers kernel: scoped', function () {
      it('is in the registry now (MS14a pinned the opposite while the kernel was inactive)', function () {
        expect(SG.techniques.has(ID)).toBe(true);
        expect(SG.techniques.get(ID).id).toBe(ID);
        expect(SG.techniques.list().map(function (t) { return t.id; })).toContain(ID);
        expect(caught(function () { SG.techniques.get('lawOfLeftovers2'); }).code).toBe('technique.unknown');
      });

      it('has R10\'s starting limits: 2 units and 4 cells per side, 50000 work units', function () {
        expect(typeof LO.find).toBe('function');
        expect(LO.LIMITS).toEqual({ units: 2, cells: 4, work: 50000 });
        expect(Object.isFrozen(LO.LIMITS)).toBe(true);
      });

      it('does nothing outside jigsaw9, and the call costs no work', function () {
        var classic = H.model('classic9');
        var none = call(classic, SG.model.initState(classic));
        expect(none.finding).toBeNull();
        expect(none.records).toEqual([{ id: ID, work: 0, limit: 50000, capHit: null, retained: null }]);
        // The same units and the same position under another variant id: nothing, where jigsaw9 finds a removal.
        var model = board('staggered');
        var state = position(model, { open: { R9C1: '5', R8C9: '57' } });
        expect(lifted(model, state).finding).not.toBeNull();
        var stray = SG.model.create({
          variantId: 'jigsaw9-copy',
          digits: 9,
          cellCount: model.cellCount,
          units: model.units,
          unitMeta: model.unitMeta,
          layout: model.layout
        });
        var out = lifted(stray, state);
        expect(out.finding).toBeNull();
        expect(out.record).toEqual({ id: ID, work: 0, limit: UNCAPPED, capHit: null, retained: null });
      });
    });

    describe('law of leftovers kernel: vectors', function () {
      it('forces the removal of 7 where a singleton side {5} meets a cell with the candidates {5, 7}', function () {
        // One row of nine cells and one region of nine cells that share eight of them: cell 0 is left over on the
        // line side, cell 9 on the region side, and no other unit lets any cell see another.
        var model = bare(10, [
          { kind: 'row', label: 'R1', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
          { kind: 'region', label: 'J1', cells: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
        ]);
        var state = SG.model.initState(model);
        state.candidates[0] = 1 << 4;
        state.candidates[9] = (1 << 4) | (1 << 6);
        var out = expectSame(model, state, 'singleton {5} against {5, 7}');
        expect(out.finding.eliminations).toEqual([[9, 7]]);
        expect(out.finding.cells).toEqual([0, 9]);
        expect(out.finding.i18nArgs).toEqual({
          lines: ['R1'], regions: ['J1'], cells: [SG.model.cellLabel(model, 0), SG.model.cellLabel(model, 9)], digits: [7]
        });
        expect(out.work).toBe(5); // the row, the region, one digit for cell 0 and two for cell 9
      });

      it('takes a fixed cell for a singleton side, on either side', function () {
        var model = bare(10, [
          { kind: 'row', label: 'R1', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
          { kind: 'region', label: 'J1', cells: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
        ]);
        var line = SG.model.initState(model);
        line.value[0] = 5;
        line.candidates[0] = 1 << 4;
        line.unsolvedCount--;
        line.candidates[9] = (1 << 4) | (1 << 6);
        expect(expectSame(model, line, 'fixed line cell').finding.eliminations).toEqual([[9, 7]]);
        var region = SG.model.initState(model);
        region.value[9] = 5;
        region.candidates[9] = 1 << 4;
        region.unsolvedCount--;
        region.candidates[0] = (1 << 4) | (1 << 6);
        expect(expectSame(model, region, 'fixed region cell').finding.eliminations).toEqual([[0, 7]]);
      });

      it('is quiet when the singleton sides can agree on every candidate, and declines when they cannot', function () {
        var model = bare(10, [
          { kind: 'row', label: 'R1', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
          { kind: 'region', label: 'J1', cells: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
        ]);
        var agree = SG.model.initState(model);
        agree.candidates[0] = (1 << 4) | (1 << 6);
        agree.candidates[9] = (1 << 4) | (1 << 6);
        var quiet = expectSame(model, agree, 'agreeing singletons');
        expect(quiet.finding).toBeNull();
        expect(quiet.declined).toBe(false);
        var apart = SG.model.initState(model);
        apart.candidates[0] = 1 << 4;
        apart.candidates[9] = 1 << 6;
        var declined = expectSame(model, apart, 'disjoint singletons');
        expect(declined.finding).toBeNull();
        expect(declined.declined).toBe(true);
      });

      it('applies the law on a real board: R8C9 holds the digit of R9C1 in every solution', function () {
        var model = board('staggered');
        var solution = solutionWith(model, 'R9C1', 5);
        expect(validSolution(model, solution)).toBe(true);
        expect(solution[H.cell(model, 'R8C9')]).toBe(5);
        // Everything is fixed to the solution but R9C1 {5} and R8C9 {5, 7}. R8 and J7 share all of R8C1-R8C5 and
        // R9C1 is left over in J7 with R6C2, R6C3, R7C3 against R8C6-R8C9: the first choice that sees R8C9 removes 7.
        var state = solved(model, solution, { R9C1: '5', R8C9: '57' });
        var out = expectSame(model, state, 'real board');
        expect(out.finding.eliminations).toEqual([[H.cell(model, 'R8C9'), 7]]);
        expect(out.finding.i18nArgs.lines).toEqual(['R8']);
        expect(out.finding.i18nArgs.regions).toEqual(['J7']);
        expect(out.finding.i18nArgs.digits).toEqual([7]);
        // the same cells with nothing in common between the candidates: no digit is removed, the position declines
        var apart = expectSame(model, solved(model, solution, { R9C1: '5', R8C9: '7' }), 'inconsistent real board');
        expect(apart.finding).toBeNull();
        expect(apart.declined).toBe(true);
      });

      it('finds the same choice with columns as the lines: the transposed board gives the transposed Finding', function () {
        var model = board('staggered', true);
        // R9C1 becomes R1C9, R8C9 becomes R9C8, row R8 becomes column C8.
        var solution = solutionWith(model, 'R1C9', 5);
        expect(validSolution(model, solution)).toBe(true);
        expect(solution[H.cell(model, 'R9C8')]).toBe(5);
        var out = expectSame(model, solved(model, solution, { R1C9: '5', R9C8: '57' }), 'transposed');
        expect(out.finding.eliminations).toEqual([[H.cell(model, 'R9C8'), 7]]);
        expect(out.finding.i18nArgs.lines).toEqual(['C8']);
        expect(out.finding.i18nArgs.regions).toEqual(['J7']);
        expect(out.finding.cells).toEqual(out.finding.i18nArgs.cells.map(function (label) { return H.cell(model, label); }));
      });

      it('counts a digit twice where the cells do not see each other: {1, 1, 2} is not {1, 2, 2}', function () {
        // Rows 1-2 with regions 1-2 leave R1C9, R2C1, R2C9 and R3C3, R3C8, R4C8. R1C9 and R2C1 see no common unit, so
        // the digit may repeat there, and R3C3 and R4C8 do not see each other either.
        var model = board('crossed');
        // The line side holds 1, 1, 2. R3C8 differs from both other cells, so the region side is 1 2 1 or 2 1 2,
        // and only {1, 1, 2} = 1 2 1 matches: the digit sets {1, 2} are equal, the multisets are not.
        var state = position(model, {
          given: { R1C9: 1, R2C1: 1, R2C9: 2 },
          open: { R3C3: '12', R3C8: '12', R4C8: '12' }
        });
        var out = expectSame(model, state, 'multiset 1 1 2');
        expect(removed(out.finding)).toEqual(at(model, ['R3C3', 'R3C8', 'R4C8']).map(function (c, i) {
          return c + ':' + [2, 1, 2][i];
        }));
        expect(out.finding.i18nArgs).toEqual({
          lines: ['R1', 'R2'],
          regions: ['J1', 'J2'],
          cells: ['R1C9', 'R2C1', 'R2C9', 'R3C3', 'R3C8', 'R4C8'],
          digits: [1, 2]
        });
        // {1, 2, 2}: the other way round
        var other = expectSame(model, position(model, {
          given: { R1C9: 2, R2C1: 2, R2C9: 1 },
          open: { R3C3: '12', R3C8: '12', R4C8: '12' }
        }), 'multiset 1 2 2');
        expect(removed(other.finding)).toEqual(at(model, ['R3C3', 'R3C8', 'R4C8']).map(function (c, i) {
          return c + ':' + [1, 2, 1][i];
        }));
      });

      it('tells {1, 2, 2} from {1, 1, 2} where the digit sets agree', function () {
        var model = board('crossed');
        // The region side can only be 2 1 2 = {1, 2, 2}. The line side R1C9, R2C1, R2C9 can be 1 1 2 or 2 2 1 (R2C9
        // sees the other two): the digit sets {1, 2} are the same, but only 2 2 1 has the multiset {1, 2, 2}.
        var state = position(model, {
          open: { R1C9: '12', R2C1: '12', R2C9: '12', R3C3: '2', R3C8: '1', R4C8: '2' }
        });
        var out = expectSame(model, state, 'multiset tells apart');
        expect(removed(out.finding)).toEqual(at(model, ['R1C9', 'R2C1', 'R2C9']).map(function (c, i) {
          return c + ':' + [1, 1, 2][i];
        }));
        expect(out.finding.i18nArgs.digits).toEqual([1, 2]);
      });

      it('declines when a side repeats a digit that the other cannot repeat', function () {
        var model = board('crossed');
        // The line side holds 1, 1, 2; the region side is fixed to 2, 1, 2 by its cells: the digit sets agree, the
        // multisets do not, and the position is inconsistent.
        var state = position(model, {
          given: { R1C9: 1, R2C1: 1, R2C9: 2 },
          open: { R3C3: '2', R3C8: '1', R4C8: '2' }
        });
        var out = expectSame(model, state, 'no common signature');
        expect(out.finding).toBeNull();
        expect(out.declined).toBe(true);
      });

      it('counts the fixed cells of the region side in its signature too', function () {
        var model = board('crossed');
        // R3C3 = 2 is placed. The open masks are set after it, so R3C8 keeps the candidate 2, but R3C8 sees R3C3 inside
        // the side: R3C8 = 1, R4C8 = 2 (it sees R3C8), and the region side is {2, 1, 2}. The line side then has to be
        // 2, 2, 1 in R1C9, R2C1, R2C9 (R2C9 sees both others).
        var state = position(model, {
          given: { R3C3: 2 },
          open: { R1C9: '12', R2C1: '12', R2C9: '12', R3C8: '12', R4C8: '12' }
        });
        var out = expectSame(model, state, 'fixed region cell');
        expect(removed(out.finding)).toEqual(at(model, ['R1C9', 'R2C1', 'R2C9', 'R3C8', 'R4C8']).map(function (c, i) {
          return c + ':' + [1, 1, 2, 2, 1][i];
        }));
      });
    });

    describe('law of leftovers kernel: geometry', function () {
      function range(from, to) {
        var out = [];
        for (var c = from; c <= to; c++) out.push(c);
        return out;
      }

      /** A copy of the board whose units are edited by `edit(units, meta)`; units are plain arrays of cells. */
      function variant(model, edit) {
        var units = model.units.map(function (u) { return Array.prototype.slice.call(u); });
        var meta = model.unitMeta.map(function (m) { return Object.assign({}, m); });
        edit(units, meta);
        return SG.model.create({
          variantId: model.variantId,
          digits: model.digits,
          cellCount: model.cellCount,
          units: units,
          unitMeta: meta,
          layout: model.layout
        });
      }

      it('finds nothing on the ordinary boxes, where no choice leaves at most four cells over', function () {
        var model = board('boxes');
        var out = expectSame(model, SG.model.initState(model), 'blank boxes');
        expect(out.finding).toBeNull();
        expect(out.declined).toBe(false);
        // Only units are tried, no digit: one row or column (9 + 9 tries) with each region (9 each) for n = 1, and
        // for n = 2 the 8 + 36 tries of a pair of lines with 8 + 36 tries of a pair of regions for each of the 36 pairs.
        expect(out.work).toBe(2 * (9 + 9 * 9) + 2 * ((8 + 36) + 36 * (8 + 36)));
        expect(out.work).toBe(3436);
        expect(lifted(model, SG.model.initState(model)).record).toEqual({
          id: ID, work: 3436, limit: UNCAPPED, capHit: null, retained: null
        });
      });

      it('finds the choices of the second kind too: the second choice of the crossed board', function () {
        var model = board('crossed');
        var out = expectSame(model, position(model, SECOND), 'second choice');
        expect(out.finding.eliminations).toEqual([[H.cell(model, 'R7C2'), 5]]);
        expect(out.finding.i18nArgs.lines).toEqual(['R8', 'R9']);
        expect(out.finding.i18nArgs.regions).toEqual(['J8', 'J9']);
        expect(out.finding.i18nArgs.cells).toEqual(['R7C2', 'R7C5', 'R7C6', 'R8C3', 'R8C9', 'R9C9']);
        // and with the first choice's vector as well, the first choice comes first
        var both = position(model, {
          given: Object.assign({}, FIRST.given, SECOND.given),
          open: Object.assign({}, FIRST.open, SECOND.open)
        });
        var first = expectSame(model, both, 'both choices');
        expect(first.finding.i18nArgs.lines).toEqual(['R1', 'R2']);
      });

      it('looks at one or two units on a side, never at three', function () {
        // Three rows (cells 0-26) and three regions that take three cells of each row, except that the last region
        // takes cell 27 instead of cell 26: with all three of each, cell 26 is left over on one side and cell 27 on
        // the other. No choice of one or two units leaves at most four cells over.
        var model = bare(28, [
          { kind: 'row', label: 'R1', cells: range(0, 8) },
          { kind: 'row', label: 'R2', cells: range(9, 17) },
          { kind: 'row', label: 'R3', cells: range(18, 26) },
          { kind: 'region', label: 'J1', cells: [0, 1, 2, 9, 10, 11, 18, 19, 20] },
          { kind: 'region', label: 'J2', cells: [3, 4, 5, 12, 13, 14, 21, 22, 23] },
          { kind: 'region', label: 'J3', cells: [6, 7, 8, 15, 16, 17, 24, 25, 27] }
        ]);
        var state = SG.model.initState(model);
        state.value[26] = 5;
        state.candidates[26] = 1 << 4;
        state.unsolvedCount--;
        state.candidates[27] = (1 << 4) | (1 << 6);
        var out = expectSame(model, state, 'three units');
        expect(out.finding).toBeNull();
        expect(out.declined).toBe(false);
      });

      it('leaves at most four cells over on a side: four are examined, five are not', function () {
        // One row of nine cells and a region shifted by k cells leave k cells over on each side.
        function shifted(k, extra) {
          var model = bare(9 + k, [
            { kind: 'row', label: 'R1', cells: range(0, 8) },
            { kind: 'region', label: 'J1', cells: range(k, k + 8) }
          ]);
          var state = SG.model.initState(model);
          for (var c = 0; c < k; c++) {
            state.value[c] = c + 1;
            state.candidates[c] = 1 << c;
            state.unsolvedCount--;
          }
          for (var d = 0; d < k; d++) state.candidates[9 + d] = (1 << (k + extra)) - 1;
          return { model: model, state: state };
        }
        var four = shifted(4, 2);
        var found = expectSame(four.model, four.state, 'four cells');
        // the region side must hold 1, 2, 3, 4 as a set (its cells all see each other): 5 and 6 go from every cell
        expect(found.finding.eliminations).toEqual([[9, 5], [9, 6], [10, 5], [10, 6], [11, 5], [11, 6], [12, 5], [12, 6]]);
        expect(found.finding.cells).toEqual([0, 1, 2, 3, 9, 10, 11, 12]);
        // 1 row + 1 region, 4 fixed cells (1 digit each), then 6 + 6*6 + 30*6 + 120*6 digits tried on the region side
        expect(found.work).toBe(2 + 4 + (6 + 36 + 180 + 720));
        var five = shifted(5, 2);
        var none = expectSame(five.model, five.state, 'five cells');
        expect(none.finding).toBeNull();
        expect(none.declined).toBe(false);
        expect(none.work).toBe(2);
      });

      it('takes only complete units of the kinds row, col and region', function () {
        var base = board('crossed');
        var state = position(base, FIRST);
        expect(expectSame(base, state, 'the unchanged board').finding).not.toBeNull();
        var edits = {
          'a partial region': function (units, meta) { meta[19].partial = true; },
          'a region of eight cells': function (units) { units[19].pop(); },
          'a partial row': function (units, meta) { meta[1].partial = true; },
          'a row of eight cells': function (units) { units[0].pop(); },
          'a region that is no region': function (units, meta) { meta[19].kind = 'box'; },
          'a row that is no row': function (units, meta) { meta[0].kind = 'diag'; }
        };
        Object.keys(edits).forEach(function (name) {
          var model = variant(base, edits[name]);
          var out = expectSame(model, state, name);
          expect([name, out.finding]).toEqual([name, null]);
        });
      });

      it('orders lines and regions by unit index, never by label text, and does not merge equal labels', function () {
        var base = board('crossed');
        var state = position(base, FIRST);
        // R1, R2 are units 0 and 1, J1, J2 are units 18 and 19: labels that sort the other way round stay in unit order
        var renamed = variant(base, function (units, meta) {
          meta[0].label = 'Z';
          meta[1].label = 'A';
          meta[18].label = 'Y';
          meta[19].label = 'B';
        });
        var out = expectSame(renamed, state, 'labels against unit order');
        expect(out.finding.i18nArgs.lines).toEqual(['Z', 'A']);
        expect(out.finding.i18nArgs.regions).toEqual(['Y', 'B']);
        // two distinct units that show the same label are two entries
        var equal = variant(base, function (units, meta) {
          [0, 1, 18, 19].forEach(function (u) { meta[u].label = 'U'; });
        });
        var twice = expectSame(equal, state, 'equal labels');
        expect(twice.finding.i18nArgs.lines).toEqual(['U', 'U']);
        expect(twice.finding.i18nArgs.regions).toEqual(['U', 'U']);
      });

      it('never takes two units that share a cell as one side', function () {
        var base = board('crossed');
        // An extra region J10 that is J2 with R1C8 replaced by R1C4 shares R1C4 with J1. Rows 1-2 with J1 and J10
        // would leave 4 cells on the line side and 3 on the region side: no signature in common, a position that
        // would "decline". Skipped as it must be, the second choice (rows 8-9) is still reached.
        var overlapped = variant(base, function (units, meta) {
          var cells = units[19].slice();
          cells[cells.indexOf(H.cell(base, 'R1C8'))] = H.cell(base, 'R1C4');
          units.push(cells);
          meta.push({ kind: 'region', gridIndex: 0, label: 'J10' });
        });
        var out = expectSame(overlapped, position(base, SECOND), 'overlapping regions');
        expect(out.finding.i18nArgs.lines).toEqual(['R8', 'R9']);
        expect(out.finding.eliminations).toEqual([[H.cell(base, 'R7C2'), 5]]);
        // the same with an extra row sharing R1C2-R1C9 with R1 and R2C1 with R2
        var tall = variant(base, function (units, meta) {
          units.push([H.cell(base, 'R2C1')].concat(range(1, 8)));
          meta.push({ kind: 'row', gridIndex: 0, label: 'R10' });
        });
        var again = expectSame(tall, position(base, SECOND), 'overlapping rows');
        expect(again.finding.i18nArgs.lines).toEqual(['R8', 'R9']);
      });
    });

    describe('law of leftovers kernel: agreement with the independent enumeration', function () {
      /** Seeded positions with a known solution; every solution satisfies all the units of its board. */
      function positions(name, transposed, count, keepRange, salt) {
        var model = board(name, transposed);
        var seed = 31000 + 7 * NAMES.indexOf(name) + (transposed ? 1 : 0) + 100 * (salt || 0);
        var items = leftoverStates(model, seed, count, keepRange);
        items.forEach(function (item) { expect(validSolution(model, item.solution)).toBe(true); });
        return items;
      }

      function checkFinding(model, state, finding, solution, where) {
        expect(H.findingProblems(model, state, finding, { technique: ID, solution: solution })).toEqual([]);
        var args = finding.i18nArgs;
        expect(args.lines.length === args.regions.length && args.lines.length >= 1 && args.lines.length <= 2).toBe(true);
        expect(finding.cells.length).toBeLessThanOrEqual(8);
        expect(finding.cells).toEqual(finding.cells.slice().sort(numeric));
        expect(new Set(finding.cells).size).toBe(finding.cells.length);
        var keys = finding.eliminations.map(function (e) { return e[0] * 100 + e[1]; });
        expect(keys).toEqual(keys.slice().sort(numeric));
        expect(new Set(keys).size).toBe(keys.length);
        var digits = [];
        finding.eliminations.forEach(function (e) { if (digits.indexOf(e[1]) === -1) digits.push(e[1]); });
        expect([where, args.digits]).toEqual([where, digits.sort(numeric)]);
        finding.eliminations.forEach(function (e) {
          expect(finding.cells).toContain(e[0]);
          expect(state.value[e[0]]).toBe(0);
        });
      }

      it('gives the oracle\'s Finding and the oracle\'s work on seeded positions of every layout and its transpose',
        function () {
          var seen = { positions: 0, found: 0, declined: 0, units: { 1: 0, 2: 0 }, kind: { R: 0, C: 0 } };
          // few candidates left (most cells settle quickly), then more (sides with real choices and repeated digits)
          [[[0.04, 0.3], 0], [[0.3, 0.7], 1]].forEach(function (setup) {
            NAMES.forEach(function (name) {
              [false, true].forEach(function (transposed) {
                var model = board(name, transposed);
                positions(name, transposed, 30, setup[0], setup[1]).forEach(function (item, i) {
                  var where = name + (transposed ? ' (transposed)' : '') + ' #' + i + ' keep ' + setup[0][0];
                  var out = expectSame(model, item.state, where);
                  seen.positions++;
                  if (out.declined) seen.declined++;
                  if (out.finding === null) return;
                  seen.found++;
                  checkFinding(model, item.state, out.finding, item.solution, where);
                  seen.units[out.finding.i18nArgs.lines.length]++;
                  seen.kind[out.finding.i18nArgs.lines[0].charAt(0)]++;
                });
              });
            });
          });
          expect(seen.positions).toBe(480);
          expect(seen.declined).toBe(0);
          expect(seen.found).toBeGreaterThan(400);
          expect(seen.units[1]).toBeGreaterThan(250);
          expect(seen.units[2]).toBeGreaterThan(80);
          expect(seen.kind.R).toBeGreaterThan(200);
          expect(seen.kind.C).toBeGreaterThan(120);
        });

      it('stays sound when its Findings are applied one after another', function () {
        var applied = 0;
        NAMES.forEach(function (name) {
          var model = board(name, false);
          positions(name, false, 24, [0.04, 0.25]).forEach(function (item, i) {
            var state = SG.model.cloneState(item.state);
            for (var step = 0; step < 30; step++) {
              var out = lifted(model, state);
              if (out.finding === null) break;
              checkFinding(model, state, out.finding, item.solution, name + ' #' + i + ' step ' + step);
              applyFinding(model, state, out.finding);
              applied++;
            }
          });
        });
        expect(applied).toBeGreaterThan(20);
      });

      it('finds the same Finding on a flooded position (every candidate open) as the oracle, within its work', function () {
        var capped = 0;
        NAMES.forEach(function (name) {
          var model = board(name, false);
          var blank = SG.model.initState(model);
          var truth = oracle(model, blank);
          var out = call(model, blank);
          expect(truth.result).toBeNull();
          if (truth.work > 50000) {
            capped++;
            expect(out.record).toEqual({ id: ID, work: 50000, limit: 50000, capHit: 'work', retained: null });
            expect(out.finding).toBeNull();
          } else {
            expect(out.record).toEqual({ id: ID, work: truth.work, limit: 50000, capHit: null, retained: null });
          }
          expect(lifted(model, blank).record.work).toBe(truth.work);
        });
        expect(capped).toBe(2);
      });

      it('knows the work of a flood by hand: the crossed board costs 3436 tries of units and 1557 + 1476 of digits',
        function () {
          var model = board('crossed');
          var out = lifted(model, SG.model.initState(model));
          // Counted by hand. The first choice: its line side R1C9, R2C1, R2C9 (R1C9 and R2C1 do not see each other, R2C9
          // sees both) costs 9 + 9*9 + 9*9*9 = 819 tries of digits, its region side R3C3, R3C8, R4C8 (R3C8 sees both)
          // 9 + 9*9 + 72*9 = 738; the second choice's sides cost 9 + 81 + 72*9 = 738 each (all three cells of a side
          // see each other, or the third sees the first two).
          expect(out.record.work).toBe(3436 + (819 + 738) + (738 + 738));
          expect(out.record.work).toBe(6469);
        });
    });

    describe('law of leftovers kernel: the contract of a call', function () {
      var VECTOR = FIRST;

      function snapshotOf(model, state) {
        return JSON.stringify({
          state: [Array.from(state.candidates), Array.from(state.value), state.unsolvedCount],
          model: [model.units.map(function (u) { return Array.from(u); }), model.unitMeta,
            model.peers.map(function (p) { return Array.from(p); }), model.layout.cellRegion, model.digits,
            model.variantId, model.cellCount]
        });
      }

      it('returns arrays of its own: writing to a Finding changes nothing in the next call', function () {
        var model = board('crossed');
        var state = position(model, VECTOR);
        var first = lifted(model, state).finding;
        var snapshot = JSON.stringify(first);
        first.cells.push(999);
        first.cells.reverse();
        first.eliminations.forEach(function (e) { e[0] = -1; e[1] = -1; });
        first.eliminations.length = 0;
        first.placements.push([0, 1]);
        first.i18nArgs.lines.push('X');
        first.i18nArgs.regions.length = 0;
        first.i18nArgs.cells.push('Y');
        first.i18nArgs.digits.push(0);
        var second = lifted(model, state).finding;
        expect(JSON.stringify(second)).toBe(snapshot);
        var third = lifted(model, state).finding;
        expect(third).toEqual(second);
        expect(third.cells).not.toBe(second.cells);
        expect(third.eliminations).not.toBe(second.eliminations);
        expect(third.eliminations[0]).not.toBe(second.eliminations[0]);
        expect(third.i18nArgs.lines).not.toBe(second.i18nArgs.lines);
        expect(third.i18nArgs.digits).not.toBe(second.i18nArgs.digits);
      });

      it('reads the model, the state and the context only, and answers the same twice', function () {
        var debugBefore = SG.DEBUG;
        SG.setDebug(true);
        try {
          NAMES.forEach(function (name) {
            var model = board(name);
            leftoverStates(model, 4400, 6, [0.05, 0.4]).forEach(function (item, i) {
              var before = snapshotOf(model, item.state);
              var ctx = SG.techniques.createContext(model, { onPatternWork: function () {} });
              var first = LO.find(model, item.state, ctx);
              var second = LO.find(model, item.state, ctx);
              expect([name, i, second]).toEqual([name, i, first]);
              expect([name, i, snapshotOf(model, item.state)]).toEqual([name, i, before]);
            });
          });
        } finally {
          SG.setDebug(debugBefore);
        }
      });

      it('has plain data only, so that a Finding survives a trip through JSON unchanged', function () {
        var model = board('crossed');
        var finding = lifted(model, position(model, VECTOR)).finding;
        expect(JSON.parse(JSON.stringify(finding))).toEqual(finding);
        expect(Object.keys(finding).sort()).toEqual(['cells', 'eliminations', 'i18nArgs', 'i18nKey', 'placements',
          'technique']);
        expect(Object.keys(finding.i18nArgs).sort()).toEqual(['cells', 'digits', 'lines', 'regions']);
      });

      it('shares nothing with the subset scan: calls of both kinds interleaved give the same answers', function () {
        var items = [];
        ['staggered', 'wavy', 'crossed', 'mixed'].forEach(function (name, k) {
          leftoverStates(board(name), 4800 + k, 5, [0.1, 0.4]).forEach(function (item) {
            items.push({ model: board(name), state: item.state });
          });
        });
        var classic = H.model('classic9');
        H.randomStatesWithKnownSolution(classic, SG.testkit.rng.create(4900), 8).forEach(function (item) {
          items.push({ model: classic, state: item.state });
        });
        var fired = 0;
        items.forEach(function (item, n) {
          function answer(kind) {
            var budget = { calls: 0, check: function () { budget.calls++; } };
            var result = kind === ID
              ? JSON.stringify(call(item.model, item.state, { workLimit: UNCAPPED }, { budget: budget }).finding)
              : JSON.stringify(find(kind, item.model, item.state, { budget: budget }));
            return [result, budget.calls];
          }
          var base = {};
          [ID].concat(IDS).forEach(function (kind) { base[kind] = answer(kind); });
          if (base[ID][0] !== 'null') fired++;
          var order = [ID, IDS[0], ID, IDS[1], IDS[2], ID, IDS[3], IDS[4], IDS[5], ID, IDS[5], IDS[0], ID];
          order.forEach(function (kind, k) { expect([n, k, kind, answer(kind)]).toEqual([n, k, kind, base[kind]]); });
        });
        expect(fired).toBeGreaterThan(10);
      });
    });

    describe('law of leftovers kernel: work limit, budget and cancellation', function () {
      var VECTOR = FIRST;

      function flood() {
        var model = board('staggered');
        return { model: model, state: SG.model.initState(model) };
      }

      /**
       * The work done at each check of the parent budget: a context whose k-th check throws a spent budget lets the
       * record of the (swallowed) call tell how many units had been tried at that check.
       */
      function checkWorks(model, state, options) {
        var base = SG.techniques.createContext(model, {});
        function attempt(target) {
          var k = 0;
          var record = null;
          var ctx = Object.assign({}, base, {
            options: { onPatternWork: function (r) { record = r; } },
            check: function () {
              k++;
              if (k === target) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' });
            }
          });
          var finding = LO.find(model, state, ctx, options);
          return { checks: k, record: record, finding: finding };
        }
        var free = attempt(0);
        var works = [];
        for (var target = 1; target <= free.checks; target++) {
          var spent = attempt(target);
          expect(spent.finding).toBeNull();
          expect(spent.record.capHit).toBeNull();
          works.push(spent.record.work);
        }
        return { works: works, free: free };
      }

      it('counts from a fresh counter on every call, with a record of its own', function () {
        var f = flood();
        var first = call(f.model, f.state, { workLimit: UNCAPPED });
        var second = call(f.model, f.state, { workLimit: UNCAPPED });
        expect(first.record).toEqual({ id: ID, work: 98530, limit: UNCAPPED, capHit: null, retained: null });
        expect(second.record).toEqual(first.record);
        expect(second.record).not.toBe(first.record);
        expect(first.records).toHaveLength(1);
      });

      it('has R10\'s limit of 50000 for the whole call: a flood is cut there with nothing found', function () {
        var f = flood();
        var out = call(f.model, f.state);
        expect(out.finding).toBeNull();
        expect(out.records).toEqual([{ id: ID, work: 50000, limit: 50000, capHit: 'work', retained: null }]);
        // the other choices of the same call have used the counter by then: it is not reset per choice
        var exact = call(f.model, f.state, { workLimit: 98530 });
        expect(exact.record).toEqual({ id: ID, work: 98530, limit: 98530, capHit: null, retained: null });
        expect(call(f.model, f.state, { workLimit: 98529 }).record).toEqual({
          id: ID, work: 98529, limit: 98529, capHit: 'work', retained: null
        });
      });

      it('never reads an unfinished enumeration as no support: every earlier cut gives no Finding', function () {
        var model = board('crossed');
        var state = position(model, VECTOR);
        var full = lifted(model, state);
        var total = full.record.work;
        expect(full.finding).not.toBeNull();
        // the work is the oracle's: the tries of units up to the first choice, 3 digits for the line side (three
        // fixed cells) and 2 + 2*2 + 2*2 for the region side
        expect(total).toBe(oracle(model, state).work);
        for (var limit = 0; limit < total; limit++) {
          var cut = call(model, state, { workLimit: limit });
          expect([limit, cut.finding]).toEqual([limit, null]);
          expect([limit, cut.record]).toEqual([limit, { id: ID, work: limit, limit: limit, capHit: 'work', retained: null }]);
        }
        var exact = call(model, state, { workLimit: total });
        expect(exact.finding).toEqual(full.finding);
        expect(exact.record).toEqual({ id: ID, work: total, limit: total, capHit: null, retained: null });
        expect(call(model, state, { workLimit: total + 1000 }).finding).toEqual(full.finding);
      });

      it('finishes both sides before it concludes: a cut inside the second enumeration finds nothing', function () {
        var model = board('crossed');
        var state = position(model, VECTOR);
        var total = lifted(model, state).record.work;
        // The region side costs 10 tries (2 digits for R3C3, 2 x 2 for R3C8, 2 x 2 for R4C8) and comes last.
        for (var back = 1; back <= 10; back++) {
          var cut = call(model, state, { workLimit: total - back });
          expect([back, cut.finding]).toEqual([back, null]);
          expect(cut.record.capHit).toBe('work');
        }
        expect(call(model, state, { workLimit: total }).finding).not.toBeNull();
      });

      it('floors a fractional limit and rejects an invalid one with solver.invalidOption', function () {
        var f = flood();
        expect(call(f.model, f.state, { workLimit: 2.9 }).record).toEqual({
          id: ID, work: 2, limit: 2, capHit: 'work', retained: null
        });
        expect(call(f.model, f.state, { workLimit: 0 }).record).toEqual({
          id: ID, work: 0, limit: 0, capHit: 'work', retained: null
        });
        [-1, NaN, Infinity, -Infinity, '5', null, true, {}].forEach(function (workLimit) {
          var err = caught(function () { call(f.model, f.state, { workLimit: workLimit }); });
          expect([String(workLimit), err && err.code]).toEqual([String(workLimit), 'solver.invalidOption']);
        });
        // no option at all, or other options, mean the default
        [undefined, null, {}, { other: 1 }].forEach(function (options) {
          expect(call(f.model, f.state, options).record.limit).toBe(50000);
        });
      });

      it('checks the parent budget at entry and so that at most 256 units pass between two checks', function () {
        var f = flood();
        var cut = checkWorks(f.model, f.state, { workLimit: 1000 });
        expect(cut.works).toEqual([0, 256, 512, 768]);
        expect(cut.free.checks).toBe(4);
        // the default limit, 50000 units, ends the call after 195 checks beyond the first
        var whole = checkWorks(f.model, f.state);
        var expected = [];
        for (var k = 0; k < 196; k++) expected.push(256 * k);
        expect(whole.works).toEqual(expected);
        // a small call has only the entry check, a larger one as many as 256-unit steps it passes
        var model = board('crossed');
        var small = checkWorks(model, position(model, VECTOR));
        expect(small.works).toEqual(small.works.map(function (w, i) { return 256 * i; }));
        expect(small.works.length).toBe(1 + Math.floor((lifted(model, position(model, VECTOR)).record.work - 1) / 256));
        // a call that ends at its limit keeps the same cadence
        expect(checkWorks(f.model, f.state, { workLimit: 256 }).works).toEqual([0]);
        expect(checkWorks(f.model, f.state, { workLimit: 257 }).works).toEqual([0, 256]);
      });

      it('reports a spent budget as nothing found and lets cancellation and other errors through', function () {
        var f = flood();
        var parent = SG.budget.create({ nodes: 3 });
        var spent = call(f.model, f.state, { workLimit: UNCAPPED }, { budget: parent });
        expect(spent.finding).toBeNull();
        expect(spent.records).toHaveLength(1);
        // entry, 256 and 512 are the three checks the budget allows, the fourth is at 768 units
        expect(spent.record).toEqual({ id: ID, work: 768, limit: UNCAPPED, capHit: null, retained: null });
        // capHit null is no proof of a complete scan: the caller's budget still fails after the call
        expect(caught(function () { parent.check(); }).code).toBe('budget.exceeded');

        var budget = SG.budget.create({});
        budget.cancel();
        var records = [];
        var err = caught(function () {
          LO.find(f.model, f.state, SG.techniques.createContext(f.model, {
            budget: budget, onPatternWork: function (r) { records.push(r); } }));
        });
        expect(err.code).toBe('budget.cancelled');
        expect(records).toEqual([]);

        // cancellation in the middle of the scan, and an error that is not a budget error
        [['budget.cancelled', true], ['boom', false]].forEach(function (kind) {
          var k = 0;
          var seen = [];
          var ctx = Object.assign({}, SG.techniques.createContext(f.model, {}), {
            options: { onPatternWork: function (r) { seen.push(r); } },
            check: function () {
              if (++k === 3) {
                throw kind[1] ? new SG.errors.GenerationError(kind[0], { reason: 'cancelled' }) : new Error(kind[0]);
              }
            }
          });
          var thrown = caught(function () { LO.find(f.model, f.state, ctx, { workLimit: UNCAPPED }); });
          expect(thrown).toBeTruthy();
          expect(kind[1] ? thrown.code : thrown.message).toBe(kind[0]);
          expect(k).toBe(3);
          expect(seen).toEqual([]);
        });
      });

      it('is not fooled by a hostile or absent observer, nor by a hand-made context without options', function () {
        var model = board('crossed');
        var state = position(model, VECTOR);
        var plain = JSON.stringify(lifted(model, state).finding);
        ['not a function', null, 7, {}].forEach(function (observer) {
          var ctx = SG.techniques.createContext(model, { onPatternWork: observer });
          expect(JSON.stringify(LO.find(model, state, ctx, { workLimit: UNCAPPED }))).toBe(plain);
        });
        expect(JSON.stringify(LO.find(model, state, SG.techniques.createContext(model), { workLimit: UNCAPPED })))
          .toBe(plain);
        var bareContext = Object.assign({}, SG.techniques.createContext(model), { options: undefined });
        expect(JSON.stringify(LO.find(model, state, bareContext, { workLimit: UNCAPPED }))).toBe(plain);
      });
    });

    describe('law of leftovers kernel: inconsistent positions and the order of choices', function () {
      it('declines the whole call at an inconsistent choice, though a later choice would remove something', function () {
        var model = board('crossed');
        var clash = { given: FIRST.given, open: { R3C3: '2', R3C8: '1', R4C8: '2' } };
        var alone = expectSame(model, position(model, SECOND), 'the second choice alone');
        expect(alone.finding).not.toBeNull();
        var both = position(model, {
          given: Object.assign({}, clash.given, SECOND.given),
          open: Object.assign({}, clash.open, SECOND.open)
        });
        var out = expectSame(model, both, 'inconsistent first choice');
        expect(out.finding).toBeNull();
        expect(out.declined).toBe(true);
      });

      it('proves no inconsistency from an enumeration that was cut short, and stops at the first decline', function () {
        var model = board('crossed');
        var clash = { given: FIRST.given, open: { R3C3: '2', R3C8: '1', R4C8: '2' } };
        var both = position(model, {
          given: Object.assign({}, clash.given, SECOND.given),
          open: Object.assign({}, clash.open, SECOND.open)
        });
        var full = lifted(model, both);
        var total = full.record.work;
        expect(full.finding).toBeNull();
        expect(full.record).toEqual({ id: ID, work: total, limit: UNCAPPED, capHit: null, retained: null });
        // the call ends where the decline is found: the later choice costs nothing, whatever it would hold
        expect(total).toBe(oracle(model, both).work);
        expect(lifted(model, position(model, clash)).record.work).toBe(total);
        // every cut before the end is a spent limit, not a verdict on the position
        for (var limit = 0; limit < total; limit++) {
          var cut = call(model, both, { workLimit: limit });
          expect([limit, cut.finding]).toEqual([limit, null]);
          expect([limit, cut.record.capHit, cut.record.work]).toEqual([limit, 'work', limit]);
        }
        expect(call(model, both, { workLimit: total }).record.capHit).toBeNull();
      });

      it('counts a solved cell with its value and never lists one in its eliminations, whatever its mask holds', function () {
        var model = board('crossed');
        var sound = position(model, FIRST);
        // a hand-made position that breaks the invariant of a solved cell (its candidates are its value): the masks
        // of the three fixed cells of the line side are left wide open
        var stale = SG.model.cloneState(sound);
        at(model, ['R1C9', 'R2C1', 'R2C9']).forEach(function (c) { stale.candidates[c] = 511; });
        var out = expectSame(model, stale, 'stale masks');
        expect(out.finding).toEqual(expectSame(model, sound, 'sound masks').finding);
        out.finding.eliminations.forEach(function (e) { expect(stale.value[e[0]]).toBe(0); });
      });

      it('scans rows before columns and lines by index: the first removing choice wins (seeded positions)', function () {
        var classes = { n1RowBeforeN1Col: 0, ascendingRows: 0, ascendingColumns: 0 };
        ['mixed', 'wavy', 'staggered'].forEach(function (name, b) {
          [false, true].forEach(function (transposed) {
            var model = board(name, transposed);
            leftoverStates(model, 6100 + 10 * b + (transposed ? 1 : 0), 12, [0.04, 0.5]).forEach(function (item, i) {
              var all = [];
              oracle(model, item.state, all);
              if (all.length < 2) return;
              var out = lifted(model, item.state).finding;
              var first = all[0];
              expect([name, transposed, i, out.i18nArgs.lines, out.i18nArgs.regions])
                .toEqual([name, transposed, i, first.lines, first.regions]);
              var has = function (n, kind) { return all.some(function (x) { return x.n === n && x.kind === kind; }); };
              if (first.n === 1 && first.kind === 'row' && has(1, 'col')) classes.n1RowBeforeN1Col++;
              var sameKind = all.filter(function (x) { return x.n === first.n && x.kind === first.kind; });
              if (sameKind.length > 1 && first.kind === 'row') classes.ascendingRows++;
              if (sameKind.length > 1 && first.kind === 'col') classes.ascendingColumns++;
              if (sameKind.length > 1) {
                // lines ascend: the first choice has the lowest line (by unit index) of those of its kind and size
                var index = function (x) { return model.unitMeta.findIndex(function (m) { return m.label === x.lines[0]; }); };
                sameKind.forEach(function (x) { expect(index(first)).toBeLessThanOrEqual(index(x)); });
              }
            });
          });
        });
        Object.keys(classes).forEach(function (key) { expect([key, classes[key] > 0]).toEqual([key, true]); });
      });

      it('scans one unit before two and rows before columns on the board `ordered`', function () {
        var model = board('ordered');
        var solution = J.solve(model, SG.testkit.rng.create(88));
        expect(validSolution(model, solution)).toBe(true);
        // each listed cell keeps its digit and one more, everything else is fixed to the solution, so that every
        // choice with such a cell as a side cell removes the extra digit
        function opened(refs) {
          var open = {};
          refs.forEach(function (ref) {
            var digit = solution[H.cell(model, ref)];
            open[ref] = String(digit) + String(digit % 9 + 1);
          });
          return solved(model, solution, open);
        }
        function order(refs) {
          var all = [];
          var state = opened(refs);
          oracle(model, state, all);
          var first = lifted(model, state).finding;
          expect([first.i18nArgs.lines, first.i18nArgs.regions]).toEqual([all[0].lines, all[0].regions]);
          return all.map(function (x) { return x.lines.join('+') + ' ' + x.regions.join('+'); });
        }
        // R5C7 lies in the choice of C9 with J3 (one column), R3C3 in the choice of R1+R2 with J1+J2, R8C7 in the
        // choice of C8+C9 with J3+J8 (two columns); R5C7 lies in that last choice too
        expect(order(['R3C3', 'R5C7'])).toEqual(['C9 J3', 'R1+R2 J1+J2', 'C8+C9 J3+J8']);
        expect(order(['R3C3', 'R8C7'])).toEqual(['R1+R2 J1+J2', 'C8+C9 J3+J8']);
        expect(order(['R8C7'])).toEqual(['C8+C9 J3+J8']);
      });
    });

    // ----- law of leftovers registered (MS14b): the registry, the scope, the real positions on their own region maps

    var JT = SG.fixtures.jigsawTechniques;
    // the variants of the project other than jigsaw9
    var OTHER_VARIANTS = ['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX', 'hyper', 'killer',
      'greaterThan', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku'];
    var DEFAULT_WORK = 50000;

    /** The registered ids before lawOfLeftovers that apply to jigsaw9: where the registry reaches it. */
    function belowLeftovers() {
      var order = SG.techniques.get(ID).order;
      return SG.techniques.list().filter(function (t) {
        return t.order < order && SG.techniques.appliesTo(t, 'jigsaw9');
      }).map(function (t) { return t.id; });
    }

    /** The registered finder on a position, at the default limit: { finding, records, record }. */
    function registered(model, state, contextOptions) {
      var records = [];
      var ctx = SG.techniques.createContext(model, Object.assign({
        onPatternWork: function (r) { records.push(r); }
      }, contextOptions));
      var finding = SG.techniques.get(ID).find(model, state, ctx);
      return { finding: finding, records: records, record: records[0] };
    }

    function transposeCell(cell) { return (cell % 9) * 9 + Math.floor(cell / 9); }

    function transposeText(text) {
      var out = '';
      for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) out += text.charAt(c * 9 + r);
      return out;
    }

    /** R1C2 <-> R2C1 and R4 <-> C4; a region (J7) is the region of the same number in the transposed layout. */
    function transposeLabel(label) {
      var cell = /^R(\d)C(\d)$/.exec(label);
      if (cell) return 'R' + cell[2] + 'C' + cell[1];
      var line = /^([RC])(\d)$/.exec(label);
      return line ? (line[1] === 'R' ? 'C' : 'R') + line[2] : label;
    }

    function byCellThenDigit(x, y) { return x[0] - y[0] || x[1] - y[1]; }

    describe('law of leftovers registered: registration, scope and order', function () {
      it('is registered once, as R17 fixes it: group locked, order 87, base cost 20, scope jigsaw9, no uniqueness ' +
        'assumption', function () {
        var def = SG.techniques.get(ID);
        expect(SG.techniques.list().filter(function (t) { return t.id === ID; })).toHaveLength(1);
        expect(def.id).toBe(ID);
        expect(def.group).toBe('locked');
        expect(def.order).toBe(87);
        expect(def.baseCost).toBe(20);
        expect(def.i18nKey).toBe('technique.lawOfLeftovers');
        expect(def.variantScope).toEqual(['jigsaw9']);
        expect(def.assumesUniqueness).toBe(false);
        expect(typeof def.find).toBe('function');
      });

      it('is registered once even when the file is loaded again: the registry keeps its first definition', function () {
        var source = SG.test.node && SG.test.node.fs.readFileSync(
          SG.test.node.path.join(SG.test.node.root, '../core/js/engine/tech-subset.js'), 'utf8');
        if (!source) SG.test.skip('needs the Node runner to reload the source');
        var def = SG.techniques.get(ID);
        var count = SG.techniques.list().length;
        SG.test.node.vm.runInThisContext(source, { filename: '../core/js/engine/tech-subset.js' });
        expect(SG.techniques.get(ID)).toBe(def);
        expect(SG.techniques.list().length).toBe(count);
        expect(SG.techniques.list().filter(function (t) { return t.id === ID; })).toHaveLength(1);
        expect(SG.leftoverPatterns.LIMITS).toEqual({ units: 2, cells: 4, work: 50000 });
      });

      it('sits between the naked and the hidden triple, and no other technique has its order', function () {
        var ids = SG.techniques.list().map(function (t) { return t.id; });
        expect(ids.indexOf(ID)).toBeGreaterThan(ids.indexOf('nakedTriple'));
        expect(ids.indexOf(ID)).toBe(ids.indexOf('hiddenTriple') - 1);
        expect(SG.techniques.get('nakedTriple').order).toBeLessThan(87);
        expect(SG.techniques.get('hiddenTriple').order).toBeGreaterThan(87);
        SG.techniques.list().forEach(function (t) {
          if (t.id !== ID) expect([t.id, t.order === 87]).toEqual([t.id, false]);
        });
      });

      it('is a scoped technique with its own fixtures: not in the classic map, and no second id for the cage rule',
        function () {
          var F = SG.fixtures.techniques;
          expect(F.ids).not.toContain(ID);
          expect(F.byId[ID]).toBeUndefined();
          expect(F.registryOrder).not.toContain(ID);
          expect(JT.ids).toEqual([ID]);
          expect(JT.byId[ID].scope).toEqual(SG.techniques.get(ID).variantScope);
          var ids = SG.techniques.list().map(function (t) { return t.id; });
          expect(ids.filter(function (id) { return /cageLocked/i.test(id); })).toEqual([]);
        });

      it('applies to jigsaw9 only: the registry offers it to no other variant', function () {
        var def = SG.techniques.get(ID);
        expect(SG.techniques.appliesTo(def, 'jigsaw9')).toBe(true);
        OTHER_VARIANTS.forEach(function (id) {
          expect([id, SG.techniques.appliesTo(def, id)]).toEqual([id, false]);
        });
      });

      it('does nothing on any other board, called through the registry, with a record of no work: the finder checks ' +
        'the scope itself', function () {
        var checked = 0;
        OTHER_VARIANTS.forEach(function (id) {
          if (!SG.testkit.hasVariant(id)) return;
          var model = H.model(id);
          var out = registered(model, SG.model.initState(model));
          expect([id, out.finding]).toEqual([id, null]);
          expect([id, out.records]).toEqual([id, [{ id: ID, work: 0, limit: DEFAULT_WORK, capHit: null,
            retained: null }]]);
          checked++;
        });
        expect(checked).toBeGreaterThanOrEqual(3);
      });

      it('is never offered to the solver of another variant: a classic solve has no step and no record of it',
        function () {
          var model = H.model('classic9');
          SG.fixtures.classic.unique.slice(0, 3).forEach(function (item) {
            var records = [];
            var report = SG.logicalSolver.solve(model, H.parsePuzzle(model, item.puzzle), {
              collectSteps: true, onPatternWork: function (r) { records.push(r); }
            });
            expect(report.techniqueCounts[ID]).toBeUndefined();
            report.steps.forEach(function (s) { expect(s.technique).not.toBe(ID); });
            expect(records.filter(function (r) { return r.id === ID; })).toEqual([]);
          });
          // asking for it by name on another variant is skipped, not an error: the ladder holds what applies
          var asked = SG.logicalSolver.solve(model, H.parsePuzzle(model, SG.fixtures.classic.unique[0].puzzle), {
            allowedTechniques: ['nakedSingle', ID], collectSteps: true
          });
          expect(asked.techniqueCounts[ID]).toBeUndefined();
        });

      it('is the kernel at the default limit: the registry call and the seam give the same Finding and record',
        function () {
          JT.byId[ID].positive.concat(JT.byId[ID].negative).forEach(function (fixture) {
            var model = JT.modelOf(fixture);
            var state = JT.stateOf(fixture);
            var viaRegistry = registered(model, state);
            var viaSeam = call(model, state);
            expect([fixture.name, viaRegistry.finding]).toEqual([fixture.name, viaSeam.finding]);
            expect([fixture.name, viaRegistry.records]).toEqual([fixture.name, viaSeam.records]);
            expect(viaRegistry.record.limit).toBe(DEFAULT_WORK);
          });
        });

      it('is deterministic after another call, and leaves the position and the Finding of an earlier call alone',
        function () {
          var first = JT.byId[ID].positive[0];
          var second = JT.byId[ID].positive[2];
          var modelA = JT.modelOf(first);
          var stateA = JT.stateOf(first);
          var snapshot = SG.model.cloneState(stateA);
          var before = registered(modelA, stateA).finding;
          var kept = JSON.stringify(before);
          registered(JT.modelOf(second), JT.stateOf(second));
          before.eliminations.length = 0;
          before.cells.length = 0;
          var again = registered(modelA, stateA).finding;
          expect(JSON.stringify(again)).toBe(kept);
          expect(Array.from(stateA.candidates)).toEqual(Array.from(snapshot.candidates));
          expect(Array.from(stateA.value)).toEqual(Array.from(snapshot.value));
          expect(stateA.unsolvedCount).toBe(snapshot.unsolvedCount);
        });
    });

    describe('law of leftovers registered: real positions on their own region maps (jigsaw-techniques.js)', function () {
      var ENTRY = JT.byId[ID];

      it('has two positive pairs, rows and columns, and three negatives, each with a name of its own', function () {
        expect(ENTRY.positive).toHaveLength(4);
        expect(ENTRY.negative).toHaveLength(3);
        var names = ENTRY.positive.concat(ENTRY.negative).map(function (f) { return f.name; });
        expect(new Set(names).size).toBe(names.length);
        expect(ENTRY.positive.map(function (f) { return f.expect.args.lines[0].charAt(0); }))
          .toEqual(['R', 'C', 'R', 'C']);
        expect(ENTRY.positive.map(function (f) { return f.expect.args.lines.length; })).toEqual([1, 1, 2, 2]);
      });

      ENTRY.positive.forEach(function (fixture) {
        it('finds exactly the recorded deduction, field by field, on its own board: ' + fixture.name, function () {
          var model = JT.modelOf(fixture);
          expect(J.problems(fixture.cellRegion)).toEqual([]);
          expect(Array.from(model.layout.cellRegion)).toEqual(fixture.cellRegion);
          expect(fixture.after).toEqual(belowLeftovers());
          var givens = H.parsePuzzle(model, fixture.givens);
          expect(SG.dfs.countSolutions(model, givens, 2)).toBe(1);
          var state = JT.stateOf(fixture);
          var finding = H.expectFinding(SG.test, ID, state, {
            placements: [], eliminations: fixture.expect.eliminations, cells: fixture.expect.cells,
            args: fixture.expect.args
          }, { model: model });
          expect(finding.technique).toBe(ID);
          expect(finding.i18nKey).toBe('technique.lawOfLeftovers.step');
          expect(finding.placements).toEqual([]);
          expect(finding.eliminations).toEqual(fixture.expect.eliminations);
          expect(finding.cells).toEqual(fixture.expect.cells);
          expect(finding.i18nArgs).toEqual(fixture.expect.args);
          // the independent enumeration, built from model.units alone, finds the same first choice in the same work
          expect(expectSame(model, state, fixture.name).finding).toEqual(finding);
          var out = registered(model, state);
          expect(out.finding).toEqual(finding);
          expect(out.record.capHit).toBeNull();
          expect(out.record.work).toBeLessThan(DEFAULT_WORK);
        });

        it('proves its eliminations against the unique solution, and the puzzle completes: ' + fixture.name,
          function () {
            var model = JT.modelOf(fixture);
            var givens = H.parsePuzzle(model, fixture.givens);
            var solution = SG.dfs.solve(model, givens);
            expect(validSolution(model, solution)).toBe(true);
            fixture.expect.eliminations.forEach(function (e) {
              expect([fixture.name, e, solution[e[0]] === e[1]]).toEqual([fixture.name, e, false]);
            });
            var state = JT.stateOf(fixture);
            expect(H.findingProblems(model, state, registered(model, state).finding,
              { technique: ID, solution: solution })).toEqual([]);
            // the solution lies in every candidate set of the position and survives the eliminations
            var reduced = SG.model.cloneState(state);
            fixture.expect.eliminations.forEach(function (e) {
              expect(SG.constraints.eliminate(model, reduced, e[0], e[1])).toBe(true);
            });
            for (var c = 0; c < model.cellCount; c++) {
              expect(reduced.candidates[c] & (1 << (solution[c] - 1))).not.toBe(0);
            }
            // the full solver finishes the puzzle and takes this very step first among the steps of the technique
            var records = [];
            var report = SG.logicalSolver.solve(model, givens, {
              collectSteps: true, onPatternWork: function (r) { records.push(r); }
            });
            expect(report.status).toBe('solved');
            expect(Array.from(report.state.value)).toEqual(Array.from(solution));
            var steps = report.steps.filter(function (s) { return s.technique === ID; });
            expect(steps.length).toBeGreaterThan(0);
            expect(steps[0].eliminations).toEqual(fixture.expect.eliminations);
            expect(steps[0].i18nArgs).toEqual(fixture.expect.args);
            expect(report.techniqueCounts[ID]).toBe(steps.length);
            var mine = records.filter(function (r) { return r.id === ID; });
            expect(mine.length).toBeGreaterThanOrEqual(steps.length);
            mine.forEach(function (r) { expect(r.limit).toBe(DEFAULT_WORK); });
          });
      });

      it('has each positive pair as exact duals: the second is the first with rows and columns exchanged', function () {
        [[0, 1], [2, 3]].forEach(function (pair) {
          var a = ENTRY.positive[pair[0]];
          var b = ENTRY.positive[pair[1]];
          var modelB = JT.modelOf(b);
          expect(b.cellRegion).toEqual(J.transpose(a.cellRegion));
          expect(b.givens).toBe(transposeText(a.givens));
          expect(b.expect.eliminations).toEqual(a.expect.eliminations.map(function (e) {
            return [transposeCell(e[0]), e[1]];
          }).sort(byCellThenDigit));
          expect(b.expect.cells).toEqual(a.expect.cells.map(transposeCell).sort(numeric));
          expect(b.expect.args.lines).toEqual(a.expect.args.lines.map(transposeLabel));
          expect(b.expect.args.regions).toEqual(a.expect.args.regions);
          expect(b.expect.args.digits).toEqual(a.expect.args.digits);
          expect(b.expect.args.cells).toEqual(b.expect.cells.map(function (c) { return SG.model.cellLabel(modelB, c); }));
          expect(a.expect.args.lines[0].charAt(0)).toBe('R');
          expect(b.expect.args.lines[0].charAt(0)).toBe('C');
        });
      });

      ENTRY.negative.forEach(function (fixture) {
        it('finds nothing, by a complete search and not by a cap: ' + fixture.name, function () {
          var model = JT.modelOf(fixture);
          expect(J.problems(fixture.cellRegion)).toEqual([]);
          expect(SG.dfs.countSolutions(model, H.parsePuzzle(model, fixture.givens), 2)).toBe(1);
          var state = JT.stateOf(fixture);
          H.expectNoFinding(SG.test, ID, state, { model: model });
          var out = registered(model, state);
          expect(out.finding).toBeNull();
          expect(out.record.capHit).toBeNull();
          var truth = oracle(model, state);
          expect(truth.result).toBeNull();
          expect(out.record.work).toBe(truth.work);
        });
      });

      it('keeps each negative where it belongs: the two "nothing left" positions are the positives\' own after the ' +
        'technique, the boxes puzzle is on the plain boxes', function () {
        var neg = ENTRY.negative;
        var pos = ENTRY.positive;
        [[0, 0], [1, 1]].forEach(function (pair) {
          expect(neg[pair[0]].after).toEqual(belowLeftovers().concat([ID]));
          expect(neg[pair[0]].givens).toBe(pos[pair[1]].givens);
          expect(neg[pair[0]].cellRegion).toEqual(pos[pair[1]].cellRegion);
        });
        expect(neg[2].cellRegion).toEqual(J.parse(J.LAYOUTS.boxes));
        expect(neg[2].after).toEqual(belowLeftovers());
        // no choice of units leaves at most four cells there: the scan costs what a blank board of the layout costs
        var model = JT.modelOf(neg[2]);
        expect(oracle(model, JT.stateOf(neg[2])).work).toBe(3436);
      });

      it('has supplements that are real unique puzzles with a Finding at the registry position, rows and columns',
        function () {
          var list = JT.supplements[ID];
          expect(list.length).toBeGreaterThanOrEqual(7);
          var kinds = { R: 0, C: 0 };
          list.forEach(function (fixture) {
            var model = JT.modelOf(fixture);
            expect(J.problems(fixture.cellRegion)).toEqual([]);
            expect(fixture.after).toEqual(belowLeftovers());
            var givens = H.parsePuzzle(model, fixture.givens);
            expect(SG.dfs.countSolutions(model, givens, 2)).toBe(1);
            var state = JT.stateOf(fixture);
            var out = expectSame(model, state, fixture.name);
            expect([fixture.name, out.finding === null]).toEqual([fixture.name, false]);
            kinds[out.finding.i18nArgs.lines[0].charAt(0)]++;
            expect(H.findingProblems(model, state, out.finding,
              { technique: ID, solution: SG.dfs.solve(model, givens) })).toEqual([]);
          });
          expect(kinds.R).toBeGreaterThanOrEqual(3);
          expect(kinds.C).toBeGreaterThanOrEqual(3);
        });
    });

    describe('law of leftovers registered: the default limit and the caller\'s budget', function () {
      it('runs with the default limit of 50000 through the registry, and no option reaches it', function () {
        [['staggered', 50000, 'work'], ['wavy', 50000, 'work'], ['mixed', 33784, null], ['crossed', 6469, null],
          ['boxes', 3436, null]].forEach(function (row) {
          var model = board(row[0]);
          var out = registered(model, SG.model.initState(model));
          expect([row[0], out.finding]).toEqual([row[0], null]);
          expect([row[0], out.record]).toEqual([row[0], { id: ID, work: row[1], limit: DEFAULT_WORK, capHit: row[2],
            retained: null }]);
        });
        // the registered finder takes no options: a fourth argument, which no solver passes, is ignored
        var model = board('staggered');
        var records = [];
        var ctx = SG.techniques.createContext(model, { onPatternWork: function (r) { records.push(r); } });
        expect(SG.techniques.get(ID).find(model, SG.model.initState(model), ctx, { workLimit: 5 })).toBeNull();
        expect(records).toEqual([{ id: ID, work: DEFAULT_WORK, limit: DEFAULT_WORK, capHit: 'work', retained: null }]);
      });

      it('passes the budget of the caller through unchanged: spent is nothing found, cancellation propagates',
        function () {
          var model = board('staggered');
          var blank = SG.model.initState(model);
          var parent = SG.budget.create({ nodes: 3 });
          var spent = registered(model, blank, { budget: parent });
          expect(spent.finding).toBeNull();
          expect(spent.record).toEqual({ id: ID, work: 768, limit: DEFAULT_WORK, capHit: null, retained: null });
          expect(caught(function () { parent.check(); }).code).toBe('budget.exceeded');

          var budget = SG.budget.create({});
          budget.cancel();
          var records = [];
          var err = caught(function () {
            SG.techniques.get(ID).find(model, blank, SG.techniques.createContext(model, {
              budget: budget, onPatternWork: function (r) { records.push(r); } }));
          });
          expect(err.code).toBe('budget.cancelled');
          expect(records).toEqual([]);
        });
    });

    describe('law of leftovers registered: seeded dug puzzles at the position where the registry reaches it', function () {
      var LAYOUTS = ['staggered', 'wavy', 'mixed', 'ordered', 'crossed'];

      /** A unique puzzle dug from a seeded solution of the layout, and the position after the techniques below. */
      function dugPosition(name, transposed, seed) {
        var model = board(name, transposed);
        var rng = SG.testkit.rng.create(seed * 7919 + (transposed ? 1 : 0));
        var solution = J.solve(model, rng.fork('grid'));
        var dug = SG.testkit.dig(model, solution, rng.fork('dig'), { minClues: 0 });
        return { model: model, solution: solution,
          state: H.stateAfter(model, dug.givens, belowLeftovers()) };
      }

      it('gives the oracle\'s Finding, and its cap where the oracle needs more than 50000 units, on 60 puzzles of the ' +
        'five layouts and their transposes', function () {
        var seen = { positions: 0, found: 0, capped: 0, units: { 1: 0, 2: 0 }, kind: { R: 0, C: 0 } };
        LAYOUTS.forEach(function (name) {
          [false, true].forEach(function (transposed) {
            for (var seed = 1; seed <= 6; seed++) {
              var item = dugPosition(name, transposed, seed);
              var where = name + (transposed ? ' (transposed)' : '') + ' seed ' + seed;
              var truth = oracle(item.model, item.state);
              var out = registered(item.model, item.state);
              seen.positions++;
              if (truth.work > DEFAULT_WORK) {
                seen.capped++;
                expect([where, out.finding]).toEqual([where, null]);
                expect([where, out.record]).toEqual([where, { id: ID, work: DEFAULT_WORK, limit: DEFAULT_WORK,
                  capHit: 'work', retained: null }]);
                continue;
              }
              expect([where, out.record.capHit]).toEqual([where, null]);
              expect([where, out.record.work]).toEqual([where, truth.work]);
              if (truth.result === null || truth.result === 'declined') {
                expect([where, out.finding]).toEqual([where, null]);
                continue;
              }
              seen.found++;
              expect(out.finding.cells).toEqual(truth.result.cells);
              expect(out.finding.eliminations).toEqual(truth.result.eliminations);
              expect(out.finding.i18nArgs).toEqual({
                lines: truth.result.lines, regions: truth.result.regions,
                cells: truth.result.cells.map(function (c) { return SG.model.cellLabel(item.model, c); }),
                digits: truth.result.digits
              });
              expect(H.findingProblems(item.model, item.state, out.finding,
                { technique: ID, solution: item.solution })).toEqual([]);
              seen.units[out.finding.i18nArgs.lines.length]++;
              seen.kind[out.finding.i18nArgs.lines[0].charAt(0)]++;
            }
          });
        });
        // minimums from the recorded scan (logs/seeded-distribution.txt): 30 findings, 4 with one unit a side and 26 with
        // two, 16 with rows and 14 with columns as the lines, none capped
        expect(seen.positions).toBe(60);
        expect(seen.found).toBeGreaterThanOrEqual(25);
        expect(seen.units[1]).toBeGreaterThanOrEqual(3);
        expect(seen.units[2]).toBeGreaterThanOrEqual(20);
        expect(seen.kind.R).toBeGreaterThanOrEqual(10);
        expect(seen.kind.C).toBeGreaterThanOrEqual(10);
      });
    });

    // LEFTOVER-TESTS-END
  })();
})();
