// Wing techniques (task T-2.5), ../core/js/engine/tech-wing.js: XY-Wing, XYZ-Wing, W-Wing and Unique Rectangle.
//
// Where the fixtures come from:
//   - published: puzzles of the SudokuWiki.org strategy pages (Y-Wing, XYZ-Wing, W-Wing, Unique Rectangles).
//     Those pages show a candidate grid that earlier strategies had already reduced. A test starts from the
//     position after naked and hidden singles only and restricts just the cells that the page shows with
//     fewer candidates (see `published`), which reproduces the page's pattern and elimination.
//   - synthetic: blank boards of 4, 6, 9, 12 and 16 digits where only the cells of the pattern are
//     restricted. They prove that nothing depends on a 9x9 grid or on 3x3 boxes.
//   - oracles: brute-force versions of the four definitions, written from the units only (never from
//     model.peers or the layout of the technique). They check that every Finding on a corpus of real puzzle
//     states is a real pattern with a complete elimination list, and that the technique finds something
//     whenever an oracle does.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.techHelper;
  var F = SG.fixtures.classic;

  var IDS = ['xyWing', 'xyzWing', 'wWing', 'uniqueRectangle'];
  var SEED = 20260101;
  var model4 = H.model('classic4');
  var model6 = H.model('classic6');
  var model9 = H.model('classic9');
  var model12 = SG.fixtures.models.boxGrid('test-wing-12', 3, 4);
  var model16 = SG.fixtures.models.boxGrid('test-wing-16', 4, 4);
  var SIZES = [
    ['4 digits', model4],
    ['6 digits', model6],
    ['9 digits', model9],
    ['12 digits', model12],
    ['16 digits', model16]
  ];

  // Puzzles as printed on the SudokuWiki.org strategy pages.
  var PUBLISHED = {
    yWing: '034500000802060400600008000003900004050000090900005800000300008001040605000007120',
    xyz1: '090001700500200008000030200070004960200060005069700030008090000700003009003800040',
    xyz2: '600000000500900007820001030340209080000080000080307025050400092900005004000000003',
    wWing: '000020007000507800057090030008900010700040008020001900090050740002109000600080000',
    wWingSplit: '000010600000709005080050930050130090000090000020067080093080020200306000005040000',
    ur1: '006324800850090000000700000004007680300000007067400300000003000000040021008259700',
    ur2: '020000000060000794809060200700003000900102003000500008004020507682000030000000010',
    ur2b: '000805000090040060030090001008000040500604003070000200100080009060010030000206000',
    ur2c: '070903080000020000200407001605000109020000060708000205900205006000070000010309020'
  };

  // ---------------------------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------------------------

  function fail(message) {
    throw new SG.test.AssertionError(message);
  }

  function bit(digit) {
    return 1 << (digit - 1);
  }

  /** '123' -> mask of the digits 1, 2 and 3 (digits 1-9 only). */
  function maskOf(digits) {
    var mask = 0;
    String(digits).split('').forEach(function (ch) { mask |= bit(parseInt(ch, 10)); });
    return mask;
  }

  /** Cell index of row r, column c (0-based) on a square board. */
  function at(model, r, c) {
    return r * model.digits + c;
  }

  function open(state, cell) {
    return state.value[cell] === 0;
  }

  function has(state, cell, digit) {
    return (state.candidates[cell] & bit(digit)) !== 0;
  }

  function size(state, cell) {
    return SG.bits.popcount(state.candidates[cell]);
  }

  /** The candidates of a cell (index or 'R4C7' label) as a string such as '259'. */
  function cands(model, state, ref) {
    return SG.bits.toArray(state.candidates[H.cell(model, ref)]).join('');
  }

  /**
   * The position after naked and hidden singles for a published puzzle. `restrict` maps cell labels to the
   * digits that the cell keeps; `opts.eliminate` removes single candidates.
   */
  function published(puzzle, restrict, opts) {
    var list = [];
    for (var i = 0; i < model9.cellCount; i++) list.push(null);
    Object.keys(restrict || {}).forEach(function (ref) { list[H.cell(model9, ref)] = restrict[ref]; });
    return H.makeState(model9, puzzle, Object.assign({ candidates: list }, opts));
  }

  /** A blank board (all candidates everywhere) where the cells of `spec` = [[cell, '12'], ...] are set. */
  function board(model, spec) {
    var state = SG.model.initState(model);
    spec.forEach(function (entry) { state.candidates[entry[0]] = maskOf(entry[1]); });
    return state;
  }

  function dropDigit(state, digit, cells) {
    cells.forEach(function (c) { state.candidates[c] &= ~bit(digit); });
  }

  function unitCells(model, name) {
    for (var u = 0; u < model.units.length; u++) {
      if (model.unitMeta[u].label === name) return Array.from(model.units[u]);
    }
    throw new Error('no unit ' + name);
  }

  /** [[cell, digit], ...] for a list of cells. */
  function pairs(cells, digit) {
    return cells.map(function (c) { return [c, digit]; });
  }

  /** Same model with extra units, cages or inequalities (everything else is copied). */
  function rebuild(model, id, extra) {
    extra = extra || {};
    var units = Array.prototype.map.call(model.units, function (u) { return Array.from(u); });
    var meta = model.unitMeta.map(function (m) { return Object.assign({}, m); });
    (extra.units || []).forEach(function (u) {
      units.push(u.cells);
      meta.push(u.meta);
    });
    return SG.model.create({
      variantId: id,
      digits: model.digits,
      units: units,
      unitMeta: meta,
      cages: extra.cages,
      inequalities: extra.inequalities,
      layout: {
        rows: model.layout.rows,
        cols: model.layout.cols,
        cellRow: model.layout.cellRow,
        cellCol: model.layout.cellCol,
        cellRegion: model.layout.cellRegion
      }
    });
  }

  // 4x4 jigsaw board: rows, columns and four irregular regions (kind 'region').
  var JIGSAW_REGIONS = [
    0, 0, 0, 1,
    2, 0, 1, 1,
    2, 2, 3, 1,
    2, 3, 3, 3
  ];

  function jigsawModel() {
    var units = [];
    var meta = [];
    var cellRow = [];
    var cellCol = [];
    var r;
    var c;
    var g;
    for (r = 0; r < 4; r++) {
      for (c = 0; c < 4; c++) {
        cellRow.push(r);
        cellCol.push(c);
      }
    }
    for (r = 0; r < 4; r++) {
      units.push([r * 4, r * 4 + 1, r * 4 + 2, r * 4 + 3]);
      meta.push({ kind: 'row', label: 'R' + (r + 1) });
    }
    for (c = 0; c < 4; c++) {
      units.push([c, 4 + c, 8 + c, 12 + c]);
      meta.push({ kind: 'col', label: 'C' + (c + 1) });
    }
    for (g = 0; g < 4; g++) {
      units.push(JIGSAW_REGIONS.map(function (region, i) { return region === g ? i : -1; })
        .filter(function (i) { return i >= 0; }));
      meta.push({ kind: 'region', label: 'Z' + (g + 1) });
    }
    return SG.model.create({
      variantId: 'test-jigsaw4',
      digits: 4,
      units: units,
      unitMeta: meta,
      layout: { rows: 4, cols: 4, cellRow: cellRow, cellCol: cellCol, cellRegion: JIGSAW_REGIONS }
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Independent oracles. They only use model.units, never model.peers.
  // ---------------------------------------------------------------------------------------------

  var seesCache = new WeakMap();

  function seesMatrix(model) {
    var matrix = seesCache.get(model);
    if (!matrix) {
      var n = model.cellCount;
      matrix = new Uint8Array(n * n);
      model.units.forEach(function (cells) {
        for (var i = 0; i < cells.length; i++) {
          for (var j = 0; j < cells.length; j++) {
            if (i !== j) matrix[cells[i] * n + cells[j]] = 1;
          }
        }
      });
      seesCache.set(model, matrix);
    }
    return matrix;
  }

  function sees(model, a, b) {
    return seesMatrix(model)[a * model.cellCount + b] === 1;
  }

  /** Unsolved cells that see every cell of `seen` and still have `digit`. */
  function victims(model, state, seen, digit) {
    var out = [];
    for (var c = 0; c < model.cellCount; c++) {
      if (open(state, c) && has(state, c, digit) && seen.every(function (s) { return sees(model, c, s); })) {
        out.push(c);
      }
    }
    return out;
  }

  function bivalueCells(model, state) {
    var out = [];
    for (var c = 0; c < model.cellCount; c++) {
      if (open(state, c) && size(state, c) === 2) out.push(c);
    }
    return out;
  }

  function digitOfMask(mask) {
    return SG.bits.toArray(mask)[0];
  }

  function elimKeys(list) {
    return list.map(function (e) { return e[0] + ':' + e[1]; }).sort();
  }

  /** The eliminations of a Finding are exactly `cells` x `digit`. */
  function expectEliminations(finding, cells, digit) {
    expect(elimKeys(finding.eliminations)).toEqual(elimKeys(pairs(cells, digit)));
  }

  /** Every XY-wing as { cells: [pivot, a, b], digit, targets } with at least one target. */
  function xyWings(model, state) {
    var bi = bivalueCells(model, state);
    var out = [];
    bi.forEach(function (p) {
      var cp = state.candidates[p];
      var mates = bi.filter(function (c) {
        return sees(model, p, c) && SG.bits.popcount(state.candidates[c] & cp) === 1;
      });
      mates.forEach(function (a) {
        mates.forEach(function (b) {
          var ca = state.candidates[a];
          var cb = state.candidates[b];
          if ((ca & cp) >= (cb & cp) || (ca & ~cp) !== (cb & ~cp)) return;
          var digit = digitOfMask(ca & ~cp);
          var targets = victims(model, state, [a, b], digit);
          if (targets.length > 0) out.push({ cells: [p, a, b], digit: digit, targets: targets });
        });
      });
    });
    return out;
  }

  function xyzWings(model, state) {
    var bi = bivalueCells(model, state);
    var out = [];
    for (var p = 0; p < model.cellCount; p++) {
      if (!open(state, p) || size(state, p) !== 3) continue;
      var cp = state.candidates[p];
      var inside = bi.filter(function (c) {
        return sees(model, p, c) && (state.candidates[c] & ~cp) === 0;
      });
      for (var i = 0; i < inside.length; i++) {
        for (var j = i + 1; j < inside.length; j++) {
          var a = inside[i];
          var b = inside[j];
          if (state.candidates[a] === state.candidates[b]) continue;
          var digit = digitOfMask(state.candidates[a] & state.candidates[b]);
          var targets = victims(model, state, [p, a, b], digit);
          if (targets.length > 0) out.push({ cells: [p, a, b], digit: digit, targets: targets });
        }
      }
    }
    return out;
  }

  /** Complete units in which `digit` has exactly two (unsolved) cells: [unit, cell, cell]. */
  function strongLinks(model, state, digit) {
    var out = [];
    model.units.forEach(function (cells, u) {
      if (cells.length !== model.digits || model.unitMeta[u].partial) return;
      var holders = [];
      for (var i = 0; i < cells.length; i++) {
        if (has(state, cells[i], digit)) holders.push(cells[i]);
      }
      if (holders.length === 2 && open(state, holders[0]) && open(state, holders[1])) {
        out.push([u, holders[0], holders[1]]);
      }
    });
    return out;
  }

  function linksWings(model, a, b, link) {
    return (sees(model, link[1], a) && sees(model, link[2], b)) ||
      (sees(model, link[1], b) && sees(model, link[2], a));
  }

  /** Every W-wing as { cells: [a, b, p, q], unit, link, digit, targets } (one per wing pair and link). */
  function wWings(model, state) {
    var bi = bivalueCells(model, state);
    var out = [];
    for (var i = 0; i < bi.length; i++) {
      for (var j = i + 1; j < bi.length; j++) {
        var a = bi[i];
        var b = bi[j];
        if (state.candidates[a] !== state.candidates[b] || sees(model, a, b)) continue;
        SG.bits.toArray(state.candidates[a]).forEach(function (x) {
          var y = digitOfMask(state.candidates[a] & ~bit(x));
          var targets = victims(model, state, [a, b], y);
          if (targets.length === 0) return;
          strongLinks(model, state, x).forEach(function (link) {
            if (linksWings(model, a, b, link)) {
              out.push({
                cells: [a, b, link[1], link[2]], unit: link[0], link: x, digit: y, targets: targets
              });
            }
          });
        });
      }
    }
    return out;
  }

  /** Rectangle corners [(r1,c1), (r1,c2), (r2,c1), (r2,c2)] of a grid whose cells carry layout positions. */
  function rectangles(model) {
    var L = model.layout;
    var byPos = {};
    for (var c = 0; c < model.cellCount; c++) byPos[L.cellRow[c] * L.cols + L.cellCol[c]] = c;
    var out = [];
    for (var r1 = 0; r1 < L.rows; r1++) {
      for (var r2 = r1 + 1; r2 < L.rows; r2++) {
        for (var c1 = 0; c1 < L.cols; c1++) {
          for (var c2 = c1 + 1; c2 < L.cols; c2++) {
            out.push([r1 * L.cols + c1, r1 * L.cols + c2, r2 * L.cols + c1, r2 * L.cols + c2]
              .map(function (pos) { return byPos[pos]; }));
          }
        }
      }
    }
    return out;
  }

  /** Two regions holding two corners each (rows and columns are two by construction). */
  function inTwoBoxes(model, cells) {
    var count = {};
    cells.forEach(function (c) {
      var region = model.layout.cellRegion[c];
      count[region] = (count[region] || 0) + 1;
    });
    var keys = Object.keys(count);
    return keys.length === 2 && keys.every(function (k) { return count[k] === 2; });
  }

  /**
   * What the four cells are as a Unique Rectangle: { type: 1, target, common } or
   * { type: 2, roofs, digit, common }; null when they are neither.
   */
  function urKind(model, state, cells) {
    if (!cells.every(function (c) { return open(state, c); })) return null;
    var masks = cells.map(function (c) { return state.candidates[c]; });
    var common = masks[0] & masks[1] & masks[2] & masks[3];
    if (SG.bits.popcount(common) !== 2) return null;
    var extra = [];
    masks.forEach(function (m, i) { if (m !== common) extra.push(i); });
    if (extra.length === 1) return { type: 1, target: cells[extra[0]], common: common };
    if (extra.length === 2 && masks[extra[0]] === masks[extra[1]] &&
        SG.bits.popcount(masks[extra[0]]) === 3) {
      var roofs = [cells[extra[0]], cells[extra[1]]];
      var L = model.layout;
      var sameLine = L.cellRow[roofs[0]] === L.cellRow[roofs[1]] ||
        L.cellCol[roofs[0]] === L.cellCol[roofs[1]];
      if (sameLine) {
        return { type: 2, roofs: roofs, digit: digitOfMask(masks[extra[0]] & ~common), common: common };
      }
    }
    return null;
  }

  function urTargets(model, state, kind) {
    return kind.type === 1 ? [] : victims(model, state, kind.roofs, kind.digit);
  }

  var ORACLE = {
    xyWing: {
      exists: function (model, state) { return xyWings(model, state).length > 0; },
      verify: function (model, state, f) {
        expect(f.cells.length).toBe(3);
        var p = f.cells[0];
        var a = f.cells[1];
        var b = f.cells[2];
        [p, a, b].forEach(function (c) {
          expect(open(state, c)).toBe(true);
          expect(size(state, c)).toBe(2);
        });
        expect(sees(model, p, a) && sees(model, p, b)).toBe(true);
        var z = state.candidates[a] & state.candidates[b];
        expect(SG.bits.popcount(z)).toBe(1);
        expect(state.candidates[p] & z).toBe(0);
        expect(state.candidates[p]).toBe((state.candidates[a] ^ z) | (state.candidates[b] ^ z));
        expect(f.i18nArgs.digit).toBe(digitOfMask(z));
        expectEliminations(f, victims(model, state, [a, b], digitOfMask(z)), digitOfMask(z));
      }
    },
    xyzWing: {
      exists: function (model, state) { return xyzWings(model, state).length > 0; },
      verify: function (model, state, f) {
        expect(f.cells.length).toBe(3);
        var p = f.cells[0];
        var a = f.cells[1];
        var b = f.cells[2];
        expect(open(state, p) && size(state, p) === 3).toBe(true);
        [a, b].forEach(function (c) {
          expect(open(state, c) && size(state, c) === 2).toBe(true);
          expect(state.candidates[c] & ~state.candidates[p]).toBe(0);
          expect(sees(model, p, c)).toBe(true);
        });
        expect(state.candidates[a]).not.toBe(state.candidates[b]);
        var z = state.candidates[a] & state.candidates[b];
        expect(SG.bits.popcount(z)).toBe(1);
        expect(f.i18nArgs.digit).toBe(digitOfMask(z));
        expectEliminations(f, victims(model, state, [p, a, b], digitOfMask(z)), digitOfMask(z));
      }
    },
    wWing: {
      exists: function (model, state) { return wWings(model, state).length > 0; },
      verify: function (model, state, f) {
        expect(f.cells.length).toBe(4);
        var a = f.cells[0];
        var b = f.cells[1];
        var link = [-1, f.cells[2], f.cells[3]];
        expect(open(state, a) && size(state, a) === 2).toBe(true);
        expect(state.candidates[b]).toBe(state.candidates[a]);
        expect(open(state, b)).toBe(true);
        expect(sees(model, a, b)).toBe(false);
        var x = f.i18nArgs.digitX;
        var y = f.i18nArgs.digit;
        expect(state.candidates[a]).toBe(bit(x) | bit(y));
        var found = strongLinks(model, state, x).filter(function (l) {
          var sameCells = (l[1] === link[1] && l[2] === link[2]) || (l[1] === link[2] && l[2] === link[1]);
          return model.unitMeta[l[0]].label === f.i18nArgs.unit && sameCells;
        });
        expect(found.length).toBe(1);
        expect(linksWings(model, a, b, [found[0][0], link[1], link[2]])).toBe(true);
        expectEliminations(f, victims(model, state, [a, b], y), y);
      }
    },
    uniqueRectangle: {
      exists: function (model, state) {
        return rectangles(model).some(function (cells) {
          if (!inTwoBoxes(model, cells)) return false;
          var kind = urKind(model, state, cells);
          return kind !== null && (kind.type === 1 || urTargets(model, state, kind).length > 0);
        });
      },
      verify: function (model, state, f) {
        expect(f.cells.length).toBe(4);
        expect(inTwoBoxes(model, f.cells)).toBe(true);
        var kind = urKind(model, state, f.cells);
        expect(kind).not.toBeNull();
        if (kind.type === 1) {
          expect(f.i18nKey).toBe('technique.uniqueRectangle.type1.step');
          var digits = SG.bits.toArray(kind.common);
          expect(elimKeys(f.eliminations))
            .toEqual(elimKeys([[kind.target, digits[0]], [kind.target, digits[1]]]));
        } else {
          expect(f.i18nKey).toBe('technique.uniqueRectangle.type2.step');
          expect(f.i18nArgs.digit).toBe(kind.digit);
          expectEliminations(f, victims(model, state, kind.roofs, kind.digit), kind.digit);
        }
      }
    }
  };

  /** Finding + independent verification of the pattern. */
  function check(id, model, state, expected, opts) {
    var finding = H.expectFinding(SG.test, id, state, expected, Object.assign({ model: model }, opts));
    ORACLE[id].verify(model, state, finding);
    return finding;
  }

  /** No Finding, and the oracle agrees that there is no pattern. */
  function checkNone(id, model, state, opts) {
    H.expectNoFinding(SG.test, id, state, Object.assign({ model: model }, opts));
    expect(ORACLE[id].exists(model, state)).toBe(false);
  }

  function none(id, model, state, opts) {
    H.expectNoFinding(SG.test, id, state, Object.assign({ model: model }, opts));
  }

  /** Applies a Finding like the solver does, then the singles it unlocks. */
  function apply(model, state, finding) {
    for (var i = 0; i < finding.eliminations.length; i++) {
      var e = finding.eliminations[i];
      if (!SG.constraints.eliminate(model, state, e[0], e[1])) return false;
    }
    return SG.constraints.propagate(model, state);
  }

  /**
   * Walks the states of the corpus, asks the technique again after every Finding and compares it with the
   * oracle on every position: it finds something exactly when the oracle does, and every Finding passes
   * the oracle's check. Returns the number of Findings.
   */
  function differential(id, model, count, maxSteps) {
    var tech = SG.techniques.get(id);
    var ctx = SG.techniques.createContext(model, { assumeUniqueness: true });
    var items = H.randomStatesWithKnownSolution(model, SG.rng.create(SEED), count);
    var fired = 0;
    items.forEach(function (item, index) {
      var state = SG.model.cloneState(item.state);
      for (var step = 0; step < maxSteps && state.unsolvedCount > 0; step++) {
        var finding = tech.find(model, state, ctx);
        var wanted = ORACLE[id].exists(model, state);
        if ((finding !== null) !== wanted) {
          fail(id + ' ' + (finding !== null ? 'found' : 'missed') + ' a pattern the oracle ' +
            (wanted ? 'sees' : 'does not see') + ' on state #' + index + ' step ' + step + '\n  puzzle: ' +
            H.puzzleString(model, item.givens) + '\n  finding: ' + JSON.stringify(finding));
        }
        if (finding === null) break;
        ORACLE[id].verify(model, state, finding);
        fired++;
        if (!apply(model, state, finding)) fail(id + ' led to a contradiction on state #' + index);
      }
    });
    return fired;
  }

  // ---------------------------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------------------------

  describe('wing techniques: registration', function () {
    var EXPECTED = {
      xyWing: { baseCost: 48, order: 140, assumesUniqueness: false },
      xyzWing: { baseCost: 54, order: 150, assumesUniqueness: false },
      wWing: { baseCost: 60, order: 170, assumesUniqueness: false },
      uniqueRectangle: { baseCost: 66, order: 180, assumesUniqueness: true }
    };

    IDS.forEach(function (id) {
      it(id + ' is registered with the agreed group, cost and order', function () {
        var tech = SG.techniques.get(id);
        expect(tech.group).toBe('wing');
        expect(tech.baseCost).toBe(EXPECTED[id].baseCost);
        expect(tech.order).toBe(EXPECTED[id].order);
        expect(tech.assumesUniqueness).toBe(EXPECTED[id].assumesUniqueness);
        expect(tech.variantScope).toBeNull();
        expect(tech.i18nKey).toBe('technique.' + id);
      });
    });

    it('only Unique Rectangle is flagged as relying on a unique solution', function () {
      var flagged = IDS.filter(function (id) { return SG.techniques.get(id).assumesUniqueness; });
      expect(flagged).toEqual(['uniqueRectangle']);
    });

    it('the four techniques run in the order xyWing, xyzWing, wWing, uniqueRectangle', function () {
      var ladder = SG.techniques.list().map(function (t) { return t.id; })
        .filter(function (id) { return IDS.indexOf(id) !== -1; });
      expect(ladder).toEqual(['xyWing', 'xyzWing', 'wWing', 'uniqueRectangle']);
    });

    it('a Finding carries the id of its technique and plain JSON arguments', function () {
      var f = check('xyWing', model9, published(PUBLISHED.yWing, { R5C1: '12' }), {});
      expect(f.technique).toBe('xyWing');
      expect(f.i18nKey).toBe('technique.xyWing.step');
      expect(JSON.parse(JSON.stringify(f.i18nArgs))).toEqual(f.i18nArgs);
    });
  });

  describe('wing techniques: budget', function () {
    function counting() {
      var budget = { calls: 0, check: function () { budget.calls++; } };
      return budget;
    }

    function patternBoard(id) {
      var model = model9;
      if (id === 'xyWing') return board(model, [[0, '12'], [8, '13'], [72, '23']]);
      if (id === 'xyzWing') return board(model, [[0, '123'], [1, '13'], [9, '23']]);
      if (id === 'wWing') return board(model, [[0, '12'], [80, '12']]);
      return board(model, [[0, '12'], [8, '12'], [9, '12'], [17, '12']]);
    }

    IDS.forEach(function (id) {
      it(id + ' calls ctx.check() and lets a budget error through', function () {
        var model = model9;
        var state = patternBoard(id);
        var budget = counting();
        SG.techniques.get(id).find(model, state, SG.techniques.createContext(model, { budget: budget }));
        expect(budget.calls).toBeGreaterThan(0);

        var stopping = { check: function () { throw new SG.errors.GenerationError('budget.exceeded', {}); } };
        expect(function () {
          SG.techniques.get(id).find(model, state, SG.techniques.createContext(model, { budget: stopping }));
        }).toThrow({ code: 'budget.exceeded' });
      });
    });
  });

  describe('wing techniques: solved cells are never targets', function () {
    /** Marks a cell as solved (the state is no longer peer consistent, which find() must tolerate). */
    function solve(state, cell, digit) {
      state.value[cell] = digit;
      state.candidates[cell] = bit(digit);
      state.unsolvedCount--;
    }

    it('xyWing: the only target is solved, so nothing is found', function () {
      var state = board(model9, [[0, '12'], [8, '13'], [72, '23']]);
      solve(state, 80, 3);
      none('xyWing', model9, state);
    });

    it('xyzWing: a solved cell that sees all three is left out', function () {
      var state = board(model9, [[0, '123'], [1, '13'], [9, '23']]);
      var targets = victims(model9, state, [0, 1, 9], 3);
      solve(state, targets[0], 3);
      var f = H.expectFinding(SG.test, 'xyzWing', state, { eliminations: pairs(targets.slice(1), 3) },
        { model: model9 });
      expect(elimKeys(f.eliminations)).not.toContain(targets[0] + ':3');
    });

    it('wWing: a solved cell that sees both cells is left out', function () {
      var a = at(model9, 0, 0);
      var b = at(model9, 8, 8);
      var state = board(model9, [[a, '12'], [b, '12']]);
      dropDigit(state, 1, unitCells(model9, 'C2').filter(function (c) { return c !== 1 && c !== 73; }));
      solve(state, at(model9, 0, 8), 2);
      H.expectFinding(SG.test, 'wWing', state, { eliminations: [[at(model9, 8, 0), 2]] }, { model: model9 });
    });

    it('uniqueRectangle type 2: a solved cell that sees both roofs is left out', function () {
      var state = board(model9, [[0, '123'], [8, '123'], [9, '12'], [17, '12']]);
      solve(state, 1, 3);
      H.expectFinding(SG.test, 'uniqueRectangle', state, { eliminations: pairs([2, 3, 4, 5, 6, 7], 3) },
        { model: model9 });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // XY-Wing
  // ---------------------------------------------------------------------------------------------

  describe('xyWing', function () {
    it('SudokuWiki Y-Wing example 1: pivot R1C1 {1,7}, pincers R1C7 {2,7} and R5C1 {1,2}', function () {
      var state = published(PUBLISHED.yWing, { R5C1: '12' });
      expect(cands(model9, state, 'R1C1')).toBe('17');
      expect(cands(model9, state, 'R1C7')).toBe('27');
      var f = check('xyWing', model9, state, {
        cells: ['R1C1', 'R1C7', 'R5C1'],
        eliminations: [['R5C7', 2]],
        args: { pivot: 'R1C1', digit: 2, digitX: 1, digitY: 7 }
      });
      expect([f.i18nArgs.pincer1, f.i18nArgs.pincer2].sort()).toEqual(['R1C7', 'R5C1']);
    });

    it('finds a wing in the same puzzle straight after the singles (R1C6 pivot, 7 leaves R3C2)', function () {
      check('xyWing', model9, H.makeState(model9, PUBLISHED.yWing), {
        cells: ['R1C6', 'R1C1', 'R3C5'],
        eliminations: [['R3C2', 7]],
        args: { pivot: 'R1C6', digit: 7 }
      });
    });

    it('finds the wing of the split W-Wing puzzle and removes the digit from both targets', function () {
      check('xyWing', model9, H.makeState(model9, PUBLISHED.wWingSplit), {
        cells: ['R1C2', 'R8C2', 'R3C1'],
        eliminations: [['R2C2', 1], ['R9C1', 1]]
      });
    });

    SIZES.forEach(function (size) {
      var model = size[1];
      var D = model.digits;
      it('corner wing on ' + size[0] + ': the digit leaves the opposite corner', function () {
        var p = at(model, 0, 0);
        var a = at(model, 0, D - 1);
        var b = at(model, D - 1, 0);
        var state = board(model, [[p, '12'], [a, '13'], [b, '23']]);
        check('xyWing', model, state, {
          cells: [p, a, b],
          eliminations: [[at(model, D - 1, D - 1), 3]],
          args: { digitX: 1, digitY: 2, digit: 3 }
        });
      });
    });

    it('pincers in the pivot box that see each other still work', function () {
      var state = board(model9, [[0, '12'], [1, '13'], [9, '23']]);
      var f = check('xyWing', model9, state, {});
      var targets = victims(model9, state, [1, 9], 3);
      expect(targets.length).toBeGreaterThan(0);
      expect(f.eliminations.length).toBe(targets.length);
    });

    it('lists every cell that sees both pincers, and only those that still have the digit', function () {
      var state = board(model9, [[0, '12'], [8, '13'], [72, '23']]);
      dropDigit(state, 3, [80]);
      none('xyWing', model9, state);
      state = board(model9, [[0, '12'], [2, '13'], [18, '23']]);
      var f = check('xyWing', model9, state, {});
      expect(f.eliminations.length).toBeGreaterThan(1);
      var withoutDigit = board(model9, [[0, '12'], [2, '13'], [18, '23']]);
      dropDigit(withoutDigit, 3, [f.eliminations[0][0]]);
      var g = check('xyWing', model9, withoutDigit, {});
      expect(g.eliminations.length).toBe(f.eliminations.length - 1);
    });

    it('finds nothing when the pincers do not share a digit', function () {
      checkNone('xyWing', model9, board(model9, [[0, '12'], [8, '13'], [72, '24']]));
    });

    it('finds nothing when a pincer does not see the pivot', function () {
      checkNone('xyWing', model9, board(model9, [[0, '12'], [8, '13'], [40, '23']]));
    });

    it('a pincer that sees only one of the others can be the pivot of a turned V', function () {
      var state = board(model9, [[0, '12'], [8, '13'], [80, '23']]);
      check('xyWing', model9, state, {
        cells: [0, 8, 80],
        eliminations: [[72, 2]],
        args: { pivot: 'R1C9', digit: 2 }
      });
    });

    it('finds nothing when the pincers share a digit that the pivot has (no Z)', function () {
      checkNone('xyWing', model9, board(model9, [[0, '12'], [8, '12'], [72, '12']]));
    });

    it('finds nothing when no cell with the digit sees both pincers', function () {
      var state = board(model9, [[0, '12'], [8, '13'], [72, '23']]);
      var spare = [];
      for (var c = 0; c < 81; c++) if (c !== 8 && c !== 72) spare.push(c);
      dropDigit(state, 3, spare);
      checkNone('xyWing', model9, state);
    });

    it('ignores a three-candidate pivot (that is an XYZ-Wing)', function () {
      checkNone('xyWing', model9, board(model9, [[0, '123'], [8, '13'], [72, '23']]));
    });

    it('ignores solved cells', function () {
      var state = board(model9, [[0, '12'], [8, '13'], [72, '23']]);
      state.value[8] = 3;
      state.candidates[8] = bit(3);
      none('xyWing', model9, state);
    });

    it('finds nothing on published positions without a wing, nor on a solved or an empty grid', function () {
      [PUBLISHED.xyz1, PUBLISHED.ur1, PUBLISHED.ur2c].forEach(function (puzzle) {
        checkNone('xyWing', model9, H.makeState(model9, puzzle));
      });
      checkNone('xyWing', model9, H.makeState(model9, F.parse(F.unique[0].solution)));
      checkNone('xyWing', model9, H.makeState(model9, new Array(82).join('0')));
    });

    it('does not rely on a unique solution', function () {
      check('xyWing', model9, published(PUBLISHED.yWing, { R5C1: '12' }), { eliminations: [['R5C7', 2]] },
        { assumeUniqueness: false });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // XYZ-Wing
  // ---------------------------------------------------------------------------------------------

  describe('xyzWing', function () {
    it('SudokuWiki XYZ-Wing example 1: hinge R6C9 {1,2,4}, pincers R4C9 {1,2} and R6C1 {1,4}', function () {
      var state = published(PUBLISHED.xyz1, { R6C1: '14' });
      expect(cands(model9, state, 'R6C9')).toBe('124');
      expect(cands(model9, state, 'R4C9')).toBe('12');
      check('xyzWing', model9, state, {
        cells: ['R6C9', 'R4C9', 'R6C1'],
        eliminations: [['R6C7', 1]],
        args: { pivot: 'R6C9', digit: 1 }
      });
    });

    it('SudokuWiki XYZ-Wing example 2: hinge R5C8 {1,4,6} on a row and a box, 6 leaves R5C9', function () {
      var state = published(PUBLISHED.xyz2, { R5C8: '146' });
      expect(cands(model9, state, 'R4C9')).toBe('16');
      expect(cands(model9, state, 'R5C6')).toBe('46');
      check('xyzWing', model9, state, {
        cells: ['R5C8', 'R4C9', 'R5C6'],
        eliminations: [['R5C9', 6]],
        args: { pivot: 'R5C8', digit: 6, digitX: 1, digitY: 4 }
      });
    });

    it('finds a wing in the second puzzle straight after the singles', function () {
      check('xyzWing', model9, H.makeState(model9, PUBLISHED.xyz2), {
        cells: ['R8C2', 'R2C2', 'R9C2'],
        eliminations: [['R1C2', 1]],
        args: { pivot: 'R8C2', digit: 1 }
      });
    });

    SIZES.forEach(function (size) {
      var model = size[1];
      it('wing in one box on ' + size[0] + ': the digit leaves every cell that sees all three', function () {
        var p = at(model, 0, 0);
        var a = at(model, 0, 1);
        var b = at(model, 1, 0);
        var state = board(model, [[p, '123'], [a, '13'], [b, '23']]);
        var targets = victims(model, state, [p, a, b], 3);
        expect(targets).toContain(at(model, 1, 1));
        check('xyzWing', model, state, {
          cells: [p, a, b],
          eliminations: pairs(targets, 3),
          args: { digit: 3 }
        });
      });
    });

    it('the pivot itself keeps the digit: only cells that see all three lose it', function () {
      var state = board(model9, [[0, '123'], [1, '13'], [9, '23']]);
      var f = check('xyzWing', model9, state, {});
      f.eliminations.forEach(function (e) {
        expect(e[0]).not.toBe(0);
        expect(sees(model9, e[0], 0) && sees(model9, e[0], 1) && sees(model9, e[0], 9)).toBe(true);
      });
    });

    it('does not remove the digit from a cell that sees only the pincers', function () {
      var state = board(model9, [[0, '123'], [8, '13'], [72, '23']]);
      expect(victims(model9, state, [8, 72], 3)).toContain(80);
      checkNone('xyzWing', model9, state);
    });

    it('finds nothing when the pivot has only two candidates (that is an XY-Wing)', function () {
      checkNone('xyzWing', model9, board(model9, [[0, '12'], [1, '13'], [9, '23']]));
    });

    it('finds nothing when a pincer has a digit outside the pivot', function () {
      checkNone('xyzWing', model9, board(model9, [[0, '123'], [1, '14'], [9, '23']]));
    });

    it('finds nothing when the pincers are the same pair', function () {
      checkNone('xyzWing', model9, board(model9, [[0, '123'], [1, '13'], [9, '13']]));
    });

    it('finds nothing when a pincer does not see the pivot', function () {
      checkNone('xyzWing', model9, board(model9, [[0, '123'], [1, '13'], [80, '23']]));
    });

    it('finds nothing on published positions without a wing', function () {
      [PUBLISHED.xyz1, PUBLISHED.ur1, PUBLISHED.ur2c, PUBLISHED.yWing].forEach(function (puzzle) {
        checkNone('xyzWing', model9, H.makeState(model9, puzzle));
      });
    });

    it('does not rely on a unique solution', function () {
      check('xyzWing', model9, published(PUBLISHED.xyz1, { R6C1: '14' }), { eliminations: [['R6C7', 1]] },
        { assumeUniqueness: false });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // W-Wing
  // ---------------------------------------------------------------------------------------------

  describe('wWing', function () {
    it('SudokuWiki W-Wing example 1: R1C6 and R6C5 {3,6}, strong link on 6 in column 3', function () {
      var state = published(PUBLISHED.wWing, {}, { eliminate: [['R2C3', 6]] });
      expect(cands(model9, state, 'R1C6')).toBe('36');
      expect(cands(model9, state, 'R6C5')).toBe('36');
      expect(cands(model9, state, 'R1C3')).toContain('6');
      expect(cands(model9, state, 'R6C3')).toContain('6');
      check('wWing', model9, state, {
        cells: ['R1C6', 'R6C5', 'R1C3', 'R6C3'],
        eliminations: [['R4C6', 3], ['R5C6', 3]],
        args: { unit: 'C3', digitX: 6, digit: 3 }
      });
    });

    it('before R2C3 loses its 6, column 3 is no strong link, so another wing is used first', function () {
      var f = H.expectFinding(SG.test, 'wWing', H.makeState(model9, PUBLISHED.wWing), {
        cells: ['R3C1', 'R9C7', 'R1C1', 'R1C7'],
        eliminations: [['R3C7', 2]],
        args: { unit: 'R1', digitX: 1, digit: 2 }
      });
      ORACLE.wWing.verify(model9, H.makeState(model9, PUBLISHED.wWing), f);
    });

    it('finds a wing in the split W-Wing puzzle', function () {
      check('wWing', model9, H.makeState(model9, PUBLISHED.wWingSplit), {
        cells: ['R2C8', 'R8C2', 'R9C8', 'R8C7'],
        eliminations: [['R2C2', 4]],
        args: { unit: 'B9', digitX: 1, digit: 4 }
      });
    });

    function wingBoard(model, linkDigit, columnName) {
      var D = model.digits;
      var otherDigit = linkDigit === 1 ? 2 : 1;
      var a = at(model, 0, 0);
      var b = at(model, D - 1, D - 1);
      var p = at(model, 0, 1);
      var q = at(model, D - 1, 1);
      var state = board(model, [[a, '12'], [b, '12']]);
      var others = unitCells(model, columnName).filter(function (c) { return c !== p && c !== q; });
      dropDigit(state, linkDigit, others);
      return { state: state, a: a, b: b, p: p, q: q, otherDigit: otherDigit };
    }

    SIZES.forEach(function (size) {
      var model = size[1];
      var D = model.digits;
      [1, 2].forEach(function (linkDigit) {
        it('wing on ' + size[0] + ' with the strong link on ' + linkDigit + ' in a column', function () {
          var w = wingBoard(model, linkDigit, 'C2');
          check('wWing', model, w.state, {
            cells: [w.a, w.b, w.p, w.q],
            eliminations: [[at(model, 0, D - 1), w.otherDigit], [at(model, D - 1, 0), w.otherDigit]],
            args: { unit: 'C2', digitX: linkDigit, digit: w.otherDigit }
          });
        });
      });
    });

    it('a strong link in a row works as well as one in a column or a box', function () {
      var a = at(model9, 0, 0);
      var b = at(model9, 8, 8);
      var p = at(model9, 4, 0);
      var q = at(model9, 4, 8);
      var state = board(model9, [[a, '12'], [b, '12']]);
      dropDigit(state, 1, unitCells(model9, 'R5').filter(function (c) { return c !== p && c !== q; }));
      check('wWing', model9, state, {
        cells: [a, b, p, q],
        eliminations: [[at(model9, 0, 8), 2], [at(model9, 8, 0), 2]],
        args: { unit: 'R5', digitX: 1, digit: 2 }
      });
    });

    it('finds nothing when the link unit has a third cell with the digit (no strong link)', function () {
      var w = wingBoard(model9, 1, 'C2');
      w.state.candidates[at(model9, 4, 1)] |= bit(1);
      checkNone('wWing', model9, w.state);
    });

    it('finds nothing when the link cell does not see its wing cell', function () {
      var D = 9;
      var a = at(model9, 0, 0);
      var b = at(model9, D - 1, D - 1);
      var p = at(model9, 0, 1);
      var q = at(model9, D - 2, 1);
      var state = board(model9, [[a, '12'], [b, '12']]);
      dropDigit(state, 1, unitCells(model9, 'C2').filter(function (c) { return c !== p && c !== q; }));
      checkNone('wWing', model9, state);
    });

    it('finds nothing when the two cells see each other (that is a naked pair)', function () {
      var a = at(model9, 0, 0);
      var b = at(model9, 0, 8);
      var state = board(model9, [[a, '12'], [b, '12']]);
      dropDigit(state, 1, unitCells(model9, 'C2').filter(function (c) { return c !== 1 && c !== 73; }));
      checkNone('wWing', model9, state);
    });

    it('finds nothing when no cell that sees both has the other digit', function () {
      var w = wingBoard(model9, 1, 'C2');
      dropDigit(w.state, 2, [at(model9, 0, 8), at(model9, 8, 0)]);
      checkNone('wWing', model9, w.state);
    });

    it('finds nothing when the two cells have different pairs', function () {
      var w = wingBoard(model9, 1, 'C2');
      w.state.candidates[w.b] = maskOf('13');
      checkNone('wWing', model9, w.state);
    });

    it('a link in a partial unit is no strong link: the digit need not occur there', function () {
      function modelWith(partial) {
        var meta = { kind: 'region', label: 'X1' };
        if (partial) meta.partial = true;
        var cells = [at(model4, 0, 2), at(model4, 3, 0), at(model4, 1, 1), at(model4, 2, 2)];
        return rebuild(model4, partial ? 'test-w-partial' : 'test-w-full', {
          units: [{ cells: cells, meta: meta }]
        });
      }
      function boardFor(model) {
        var state = board(model, [[at(model, 0, 0), '12'], [at(model, 3, 3), '12']]);
        dropDigit(state, 1, [at(model, 1, 1), at(model, 2, 2)]);
        return state;
      }
      var full = modelWith(false);
      check('wWing', full, boardFor(full), {
        cells: [0, 15, at(full, 0, 2), at(full, 3, 0)],
        eliminations: [[at(full, 0, 3), 2], [at(full, 3, 0), 2]],
        args: { unit: 'X1', digitX: 1 }
      });
      var partial = modelWith(true);
      expect(partial.unitMeta[partial.units.length - 1].partial).toBe(true);
      none('wWing', partial, boardFor(partial));
    });

    it('finds nothing on published positions without a W-Wing', function () {
      [PUBLISHED.xyz1, PUBLISHED.ur1, PUBLISHED.ur2c].forEach(function (puzzle) {
        checkNone('wWing', model9, H.makeState(model9, puzzle));
      });
    });

    it('does not rely on a unique solution', function () {
      var state = published(PUBLISHED.wWing, {}, { eliminate: [['R2C3', 6]] });
      check('wWing', model9, state, { eliminations: [['R4C6', 3], ['R5C6', 3]] },
        { assumeUniqueness: false });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Unique Rectangle
  // ---------------------------------------------------------------------------------------------

  describe('uniqueRectangle: published examples', function () {
    it('SudokuWiki type 1: R4C1 {1,2,5,9} over three {2,9} cells loses 2 and 9', function () {
      var state = published(PUBLISHED.ur1, { R4C9: '29', R6C1: '29', R6C9: '29' });
      expect(cands(model9, state, 'R4C1')).toBe('1259');
      var f = check('uniqueRectangle', model9, state, {
        cells: ['R4C1', 'R4C9', 'R6C1', 'R6C9'],
        eliminations: [['R4C1', 2], ['R4C1', 9]],
        args: { cell: 'R4C1', digitX: 2, digitY: 9 }
      });
      expect(f.i18nKey).toBe('technique.uniqueRectangle.type1.step');
    });

    it('SudokuWiki type 2: roofs R1C5 and R1C6 both have an extra 7, so 7 leaves R1C3 and R3C6', function () {
      var state = H.makeState(model9, PUBLISHED.ur2);
      expect(cands(model9, state, 'R1C5')).toBe('157');
      expect(cands(model9, state, 'R1C6')).toBe('157');
      var f = check('uniqueRectangle', model9, state, {
        cells: ['R1C5', 'R1C6', 'R8C5', 'R8C6'],
        eliminations: [['R1C3', 7], ['R3C6', 7]],
        args: { digit: 7, digitX: 1, digitY: 5 }
      });
      expect(f.i18nKey).toBe('technique.uniqueRectangle.type2.step');
      expect([f.i18nArgs.roof1, f.i18nArgs.roof2].sort()).toEqual(['R1C5', 'R1C6']);
    });

    it('SudokuWiki type 2B: roofs R2C1 and R2C9 sit in different boxes, only row 2 is reduced', function () {
      var state = published(PUBLISHED.ur2b, { R2C9: '278' });
      expect(cands(model9, state, 'R1C1')).toBe('27');
      expect(cands(model9, state, 'R1C9')).toBe('27');
      var f = check('uniqueRectangle', model9, state, {
        cells: ['R1C1', 'R1C9', 'R2C1', 'R2C9'],
        eliminations: [['R2C7', 8]],
        args: { digit: 8, digitX: 2, digitY: 7 }
      });
      expect([f.i18nArgs.roof1, f.i18nArgs.roof2].sort()).toEqual(['R2C1', 'R2C9']);
    });

    it('SudokuWiki type 2: roofs R8C4 and R8C6 with an extra 8 reduce row 8 and box 8', function () {
      var state = published(PUBLISHED.ur2c, { R6C6: '16', R8C6: '168' });
      expect(cands(model9, state, 'R6C4')).toBe('16');
      expect(cands(model9, state, 'R8C4')).toBe('168');
      check('uniqueRectangle', model9, state, {
        cells: ['R6C4', 'R6C6', 'R8C4', 'R8C6'],
        eliminations: [['R7C5', 8], ['R8C1', 8], ['R8C2', 8], ['R8C7', 8], ['R8C9', 8], ['R9C5', 8]],
        args: { digit: 8, digitX: 1, digitY: 6 }
      });
    });

    it('finds nothing on published positions that have no rectangle yet', function () {
      [PUBLISHED.yWing, PUBLISHED.xyz1, PUBLISHED.wWing].forEach(function (puzzle) {
        checkNone('uniqueRectangle', model9, H.makeState(model9, puzzle));
      });
      checkNone('uniqueRectangle', model9, H.makeState(model9, PUBLISHED.ur1));
    });

    it('finds nothing in the bare deadly pattern of a puzzle with two solutions', function () {
      var multi = F.multi.filter(function (p) { return p.name === 'deadly-rectangle'; })[0];
      var state = H.makeState(model9, multi.puzzle, { propagate: false });
      ['R1C4', 'R1C5', 'R4C4', 'R4C5'].forEach(function (ref) {
        expect(cands(model9, state, ref)).toBe('67');
      });
      checkNone('uniqueRectangle', model9, state);
    });
  });

  describe('uniqueRectangle: any digit count (types 1 and 2)', function () {
    var SHAPES = [
      ['rows in one band, columns in two stacks', function (m) { return [0, 1, 0, m.digits - 1]; }],
      ['columns in one stack, rows in two bands', function (m) { return [0, m.digits - 1, 0, 1]; }]
    ];

    function corners(model, shape) {
      var g = shape(model);
      return [at(model, g[0], g[2]), at(model, g[0], g[3]), at(model, g[1], g[2]), at(model, g[1], g[3])];
    }

    SIZES.forEach(function (size) {
      var model = size[1];
      SHAPES.forEach(function (shape) {
        it('type 1 on ' + size[0] + ', ' + shape[0] + ': every corner can be the open one', function () {
          var cells = corners(model, shape[1]);
          cells.forEach(function (target) {
            var spec = cells.map(function (c) { return [c, c === target ? '123' : '12']; });
            check('uniqueRectangle', model, board(model, spec), {
              cells: cells,
              eliminations: [[target, 1], [target, 2]],
              args: { digitX: 1, digitY: 2 }
            });
          });
        });

        it('type 2 on ' + size[0] + ', ' + shape[0] + ': roofs on a common side', function () {
          var cells = corners(model, shape[1]);
          [[0, 1], [2, 3], [0, 2], [1, 3]].forEach(function (roofs) {
            var spec = cells.map(function (c, i) { return [c, roofs.indexOf(i) !== -1 ? '123' : '12']; });
            var state = board(model, spec);
            var roofCells = [cells[roofs[0]], cells[roofs[1]]];
            var targets = victims(model, state, roofCells, 3);
            expect(targets.length).toBeGreaterThan(0);
            check('uniqueRectangle', model, state, {
              cells: cells,
              eliminations: pairs(targets, 3),
              args: { digit: 3, digitX: 1, digitY: 2 }
            });
          });
        });

        it('on ' + size[0] + ', ' + shape[0] + ': roofs on opposite corners are no type 2', function () {
          var cells = corners(model, shape[1]);
          [[0, 3], [1, 2]].forEach(function (roofs) {
            var spec = cells.map(function (c, i) { return [c, roofs.indexOf(i) !== -1 ? '123' : '12']; });
            checkNone('uniqueRectangle', model, board(model, spec));
          });
        });
      });

      it('on ' + size[0] + ': four boxes or one box is no deadly pattern', function () {
        var D = model.digits;
        var fourBoxes = [at(model, 0, 0), at(model, 0, D - 1), at(model, D - 1, 0), at(model, D - 1, D - 1)];
        var oneBox = [at(model, 0, 0), at(model, 0, 1), at(model, 1, 0), at(model, 1, 1)];
        [fourBoxes, oneBox].forEach(function (cells) {
          var type1 = board(model, cells.map(function (c, i) { return [c, i === 3 ? '123' : '12']; }));
          checkNone('uniqueRectangle', model, type1);
          var type2 = board(model, cells.map(function (c, i) { return [c, i < 2 ? '123' : '12']; }));
          checkNone('uniqueRectangle', model, type2);
        });
      });

      it('on ' + size[0] + ': four cells in one row are no rectangle', function () {
        var cells = [at(model, 0, 0), at(model, 0, 1), at(model, 0, 2), at(model, 0, 3)];
        checkNone('uniqueRectangle', model,
          board(model, cells.map(function (c, i) { return [c, i === 3 ? '123' : '12']; })));
      });
    });

    it('finds nothing when the corners do not share one pair (three {1,2} and one {1,3})', function () {
      var cells = [0, 8, 9, 17];
      checkNone('uniqueRectangle', model9,
        board(model9, [[cells[0], '12'], [cells[1], '12'], [cells[2], '12'], [cells[3], '13']]));
    });

    it('finds nothing when the two roofs have different extra digits (no type 3)', function () {
      checkNone('uniqueRectangle', model9, board(model9, [[0, '123'], [8, '124'], [9, '12'], [17, '12']]));
    });

    it('finds nothing when no cell that sees both roofs has the extra digit', function () {
      var state = board(model9, [[0, '123'], [8, '123'], [9, '12'], [17, '12']]);
      dropDigit(state, 3, victims(model9, state, [0, 8], 3));
      checkNone('uniqueRectangle', model9, state);
    });

    it('finds nothing when a corner is already solved', function () {
      var state = board(model9, [[0, '12'], [8, '12'], [9, '12'], [17, '123']]);
      state.value[0] = 1;
      none('uniqueRectangle', model9, state);
    });

    it('type 2 lists only cells that see both roofs', function () {
      var state = board(model9, [[0, '123'], [8, '123'], [9, '12'], [17, '12']]);
      var f = check('uniqueRectangle', model9, state, {
        eliminations: pairs([1, 2, 3, 4, 5, 6, 7], 3)
      });
      expect(f.eliminations.length).toBe(7);
    });
  });

  describe('uniqueRectangle: geometry on other unit shapes', function () {
    function type1Board(model, cells, target) {
      return board(model, cells.map(function (c) { return [c, c === target ? '123' : '12']; }));
    }

    it('a 4x4 jigsaw rectangle fires when two regions hold two corners each', function () {
      var jigsaw = jigsawModel();
      var cells = [1, 3, 5, 7];
      check('uniqueRectangle', jigsaw, type1Board(jigsaw, cells, 7), {
        cells: cells,
        eliminations: [[7, 1], [7, 2]]
      });
    });

    it('a 4x4 jigsaw rectangle whose corners are in three regions never fires', function () {
      var jigsaw = jigsawModel();
      var cells = [0, 3, 4, 7];
      var regions = cells.map(function (c) { return JIGSAW_REGIONS[c]; });
      expect(regions).toEqual([0, 1, 2, 1]);
      checkNone('uniqueRectangle', jigsaw, type1Board(jigsaw, cells, 7));
      // The same corners are two boxes on a regular 4x4 board, where the pattern does fire.
      check('uniqueRectangle', model4, type1Board(model4, cells, 7), { eliminations: [[7, 1], [7, 2]] });
    });

    it('a 4x4 jigsaw rectangle with three corners in one region never fires', function () {
      var jigsaw = jigsawModel();
      var cells = [2, 3, 6, 7];
      checkNone('uniqueRectangle', jigsaw, type1Board(jigsaw, cells, 7));
    });

    it('corners in four boxes of a regular board can be two jigsaw regions, and then fire', function () {
      var jigsaw = jigsawModel();
      var cells = [1, 2, 13, 14];
      expect(cells.map(function (c) { return JIGSAW_REGIONS[c]; })).toEqual([0, 0, 3, 3]);
      check('uniqueRectangle', jigsaw, type1Board(jigsaw, cells, 14), { eliminations: [[14, 1], [14, 2]] });
      checkNone('uniqueRectangle', model4, type1Board(model4, cells, 14));
    });

    it('a diagonal that holds only one corner breaks the deadly pattern (Sudoku X)', function () {
      var diagonal = [];
      for (var i = 0; i < 9; i++) diagonal.push(at(model9, i, i));
      var diagonalUnit = { cells: diagonal, meta: { kind: 'diag', label: 'D1' } };
      var sudokuX = rebuild(model9, 'test-x', { units: [diagonalUnit] });
      var onDiagonal = [at(sudokuX, 0, 0), at(sudokuX, 0, 8), at(sudokuX, 1, 0), at(sudokuX, 1, 8)];
      var offDiagonal = [at(sudokuX, 0, 3), at(sudokuX, 0, 6), at(sudokuX, 1, 3), at(sudokuX, 1, 6)];
      none('uniqueRectangle', sudokuX, type1Board(sudokuX, onDiagonal, onDiagonal[3]));
      check('uniqueRectangle', model9, type1Board(model9, onDiagonal, onDiagonal[3]), {});
      none('uniqueRectangle', model9, board(model9, onDiagonal.map(function (c) { return [c, '12']; })));
      var f = H.expectFinding(SG.test, 'uniqueRectangle', type1Board(sudokuX, offDiagonal, offDiagonal[3]),
        { eliminations: [[offDiagonal[3], 1], [offDiagonal[3], 2]] }, { model: sudokuX });
      expect(f.cells.length).toBe(4);
    });

    it('a corner that lies in no box-like unit is not a deadly pattern', function () {
      var units = [];
      var meta = [];
      var cellRow = [];
      var cellCol = [];
      var i;
      for (i = 0; i < 16; i++) {
        cellRow.push(Math.floor(i / 4));
        cellCol.push(i % 4);
      }
      for (i = 0; i < 4; i++) {
        units.push([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3]);
        meta.push({ kind: 'row', label: 'R' + (i + 1) });
      }
      for (i = 0; i < 4; i++) {
        units.push([i, 4 + i, 8 + i, 12 + i]);
        meta.push({ kind: 'col', label: 'C' + (i + 1) });
      }
      // Two overlapping boxes: corner 0 is in both, corner 5 is in neither.
      units.push([0, 1, 8, 9], [0, 4, 12, 13]);
      meta.push({ kind: 'box', label: 'B1' }, { kind: 'box', label: 'B2' });
      var odd = SG.model.create({
        variantId: 'test-no-box',
        digits: 4,
        units: units,
        unitMeta: meta,
        layout: { rows: 4, cols: 4, cellRow: cellRow, cellCol: cellCol }
      });
      none('uniqueRectangle', odd, type1Board(odd, [0, 1, 4, 5], 5));
    });

    it('a model with cages or inequalities never gets a Unique Rectangle', function () {
      var cells = [0, 8, 9, 17];
      var caged = rebuild(model9, 'test-cages', { cages: [{ cells: [0, 1], sum: 3 }] });
      var signs = rebuild(model9, 'test-signs', { inequalities: [{ a: 40, b: 41 }] });
      none('uniqueRectangle', caged, type1Board(caged, cells, 17));
      none('uniqueRectangle', signs, type1Board(signs, cells, 17));
      check('uniqueRectangle', model9, type1Board(model9, cells, 17), {});
    });
  });

  describe('uniqueRectangle: relies on a unique solution', function () {
    var UNIQUE = '871.5.93..3...84.5..59317..28...537...4.795........8..7.2....43.683..2..54...2.87';

    function type1State() {
      return board(model9, [[0, '12'], [8, '12'], [9, '12'], [17, '123']]);
    }

    it('is skipped when assumeUniqueness is false, and fires when it is true or left out', function () {
      none('uniqueRectangle', model9, type1State(), { assumeUniqueness: false });
      check('uniqueRectangle', model9, type1State(), { eliminations: [[17, 1], [17, 2]] });
      check('uniqueRectangle', model9, type1State(), { eliminations: [[17, 1], [17, 2]] },
        { assumeUniqueness: true });
    });

    it('is skipped for every kind of rectangle when the option is false', function () {
      var type2 = board(model9, [[0, '123'], [8, '123'], [9, '12'], [17, '12']]);
      none('uniqueRectangle', model9, type2, { assumeUniqueness: false });
      none('uniqueRectangle', model9, published(PUBLISHED.ur1, { R4C9: '29', R6C1: '29', R6C9: '29' }),
        { assumeUniqueness: false });
      none('uniqueRectangle', model9, H.makeState(model9, PUBLISHED.ur2), { assumeUniqueness: false });
    });

    it('the logical solver leaves it out with assumeUniqueness:false and uses it otherwise', function () {
      var givens = H.parsePuzzle(model9, UNIQUE);
      expect(SG.dfs.countSolutions(model9, givens, 2)).toBe(1);

      var withIt = SG.logicalSolver.solve(model9, givens, { allowedTechniques: ['uniqueRectangle'] });
      expect(withIt.steps.length).toBe(1);
      expect(withIt.steps[0].technique).toBe('uniqueRectangle');
      expect(withIt.techniqueCounts.uniqueRectangle).toBe(1);
      expect(withIt.hardestTechnique).toBe('uniqueRectangle');

      var without = SG.logicalSolver.solve(model9, givens,
        { allowedTechniques: ['uniqueRectangle'], assumeUniqueness: false });
      expect(without.steps).toEqual([]);
      expect(without.techniqueCounts).toEqual({});
      expect(without.hardestTechnique).toBeNull();

      var all = SG.logicalSolver.solve(model9, givens, { allowedTechniques: null, assumeUniqueness: false });
      expect(Object.keys(all.techniqueCounts)).not.toContain('uniqueRectangle');
    });

    it('the other wing techniques stay available without the assumption', function () {
      var givens = H.parsePuzzle(model9, PUBLISHED.yWing);
      var state = H.makeState(model9, givens);
      var found = SG.techniques.get('xyWing').find(model9, state,
        SG.techniques.createContext(model9, { assumeUniqueness: false }));
      expect(found).not.toBeNull();
      var report = SG.logicalSolver.solve(model9, givens,
        { allowedTechniques: ['xyWing', 'xyzWing', 'wWing'], assumeUniqueness: false });
      Object.keys(report.techniqueCounts).forEach(function (id) { expect(IDS).toContain(id); });
    });

    it('is not sound with several solutions: it removes every solution (why it is flagged)', function () {
      var twoSolutions = '534008902672095348198342567859001423426853791713924856961537284287419635345286179';
      var givens = H.parsePuzzle(model9, twoSolutions);
      expect(SG.dfs.countSolutions(model9, givens, 5)).toBe(2);
      var state = H.makeState(model9, givens, { propagate: false });
      var f = SG.techniques.get('uniqueRectangle').find(model9, state,
        SG.techniques.createContext(model9, {}));
      expect(f).not.toBeNull();
      expect(f.eliminations).toEqual([[H.cell(model9, 'R1C4'), 6], [H.cell(model9, 'R1C4'), 7]]);
      expect(SG.dfs.searchFrom(model9, state, { limit: 5 }).found).toBe(2);
      f.eliminations.forEach(function (e) { SG.constraints.eliminate(model9, state, e[0], e[1]); });
      expect(SG.dfs.searchFrom(model9, state, { limit: 5 }).found).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Soundness (invariant I7) and the oracle comparison
  // ---------------------------------------------------------------------------------------------

  describe('wing techniques: soundness (invariant I7)', function () {
    IDS.forEach(function (id) {
      it(id + ' never removes a solution digit (9 digits, 300 states, fires at least 3 times)', function () {
        var stats = H.assertSound(SG.test, id, { count: 300, minFirings: 3 });
        expect(stats.firings).toBeGreaterThanOrEqual(3);
      });
    });

    IDS.forEach(function (id) {
      it(id + ' stays sound on 6 digits', function () {
        H.assertSound(SG.test, id, { model: model6, count: 200, minFirings: 3 });
      });
    });

    IDS.forEach(function (id) {
      it(id + ' stays sound on 4 digits', function () {
        // The shared corpus has a single Unique Rectangle on the 4x4 boards; the synthetic tests cover them.
        var minFirings = id === 'uniqueRectangle' ? 0 : 1;
        H.assertSound(SG.test, id, { model: model4, count: 300, minFirings: minFirings });
      });
    });

    IDS.forEach(function (id) {
      it(id + ' stays sound on 12 digits', function () {
        H.assertSound(SG.test, id, { model: model12, count: 200, minFirings: 3 });
      });
    });

    IDS.forEach(function (id) {
      it(id + ' stays sound on 16 digits (a few states: generating them is slow)', function () {
        H.assertSound(SG.test, id, { model: model16, count: 8 });
      });
    });
  });

  describe('wing techniques: every Finding is a complete real pattern and none is missed', function () {
    IDS.forEach(function (id) {
      it(id + ' agrees with the brute-force oracle on 9 digits', function () {
        expect(differential(id, model9, 300, 12)).toBeGreaterThanOrEqual(3);
      });

      it(id + ' agrees with the brute-force oracle on 6 digits', function () {
        expect(differential(id, model6, 200, 12)).toBeGreaterThanOrEqual(3);
      });
    });

    IDS.forEach(function (id) {
      it(id + ' agrees with the brute-force oracle on 12 digits', function () {
        expect(differential(id, model12, 120, 8)).toBeGreaterThanOrEqual(1);
      });
    });

    it('agrees with the oracles on every published position', function () {
      Object.keys(PUBLISHED).forEach(function (name) {
        var state = H.makeState(model9, PUBLISHED[name]);
        IDS.forEach(function (id) {
          var found = SG.techniques.get(id).find(model9, state, SG.techniques.createContext(model9, {}));
          expect(found !== null).toBe(ORACLE[id].exists(model9, state));
          if (found !== null) ORACLE[id].verify(model9, state, found);
        });
      });
    });
  });

  describe('wing techniques: speed', function () {
    var model = model9;
    var state = H.makeState(model, PUBLISHED.xyz2);
    var ctx = SG.techniques.createContext(model, {});
    IDS.forEach(function (id) {
      var tech = SG.techniques.get(id);
      bench(id + '.find on a stuck 9x9 position', function () { tech.find(model, state, ctx); }, 2000);
    });
  });
})();
