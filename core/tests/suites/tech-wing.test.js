// Wing techniques (../core/js/engine/tech-wing.js): Remote Pairs, XY-Wing, XYZ-Wing, WXYZ-Wing, W-Wing and Unique
// Rectangle.
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

  var IDS = ['remotePairs', 'xyWing', 'xyzWing', 'wxyzWing', 'wWing', 'uniqueRectangle'];
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

  // Independent oracles. They only use model.units, never model.peers.
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
   * What the four cells are as a Unique Rectangle: { type: 1, target, common } or { type: 2, roofs, digit,
   * common }; null when they are neither.
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

  // Unique Rectangle types 3 and 4 (R14). The enumeration below is independent of the finder: it uses the layout
  // positions and `model.units` only (never `peers`, `cellUnits` or the finder's rectangle table), tries every subset
  // of every unit by brute force (no pool, no pruning) and keeps the documented order of the finder: rectangles by
  // their lowest cell, then the next cells of the four (a rectangle is [(r1,c1), (r1,c2), (r2,c1), (r2,c2)]), type 3
  // before type 4, units ascending, sizes ascending, subsets in ascending cell order, digits ascending.
  var urRectCache = new WeakMap();

  /** The rectangles of the layout whose swap of two digits keeps every unit valid (two corners in a unit or none). */
  function urRectangles(model) {
    var list = urRectCache.get(model);
    if (!list) {
      list = rectangles(model).filter(function (cells) {
        return inTwoBoxes(model, cells) && model.units.every(function (unitCells) {
          var n = cells.filter(function (c) { return Array.prototype.indexOf.call(unitCells, c) !== -1; }).length;
          return n === 0 || n === 2;
        });
      });
      list.sort(function (x, y) { return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
      urRectCache.set(model, list);
    }
    return list;
  }

  /** { common, roofs (ascending), extras } of four open cells with two floors (exactly the pair) and two roofs. */
  function urShape(state, cells) {
    if (!cells.every(function (c) { return open(state, c); })) return null;
    var masks = cells.map(function (c) { return state.candidates[c]; });
    var common = masks[0] & masks[1] & masks[2] & masks[3];
    if (SG.bits.popcount(common) !== 2) return null;
    var roofs = cells.filter(function (c, i) { return masks[i] !== common; });
    if (roofs.length !== 2) return null;
    return {
      common: common,
      roofs: roofs.sort(byNumber),
      extras: (state.candidates[roofs[0]] | state.candidates[roofs[1]]) & ~common
    };
  }

  /** The units (indices, ascending) that hold both cells. */
  function unitsHolding(model, a, b) {
    var out = [];
    model.units.forEach(function (cells, u) {
      if (Array.prototype.indexOf.call(cells, a) !== -1 && Array.prototype.indexOf.call(cells, b) !== -1) out.push(u);
    });
    return out;
  }

  function subsetsOf(list, k) {
    var out = [];
    (function go(start, chosen) {
      if (chosen.length === k) {
        out.push(chosen.slice());
        return;
      }
      for (var i = start; i < list.length; i++) {
        chosen.push(list[i]);
        go(i + 1, chosen);
        chosen.pop();
      }
    })(0, []);
    return out;
  }

  /**
   * Every type 3 and type 4 pattern of a state with at least one elimination, in the order of the finder; with
   * `firstOnly` only the first one. { type: 3, cells (the rectangle), roofs, unit, real, union (mask), common,
   * eliminations } or { type: 4, cells, roofs, unit, link (digit), digit (removed), common, eliminations }.
   * A type 3 subset has any size from 1 to the number of eligible cells of the unit (no cap of its own: the union
   * check |D| = k + 1 <= digits ends it).
   */
  function urSubtypesOf(model, state, firstOnly) {
    var out = [];
    var rects = urRectangles(model);
    for (var r = 0; r < rects.length; r++) {
      var cells = rects[r];
      var shape = urShape(state, cells);
      if (shape === null) continue;
      var units = unitsHolding(model, shape.roofs[0], shape.roofs[1]);
      var u;
      var i;
      for (i = 0; i < units.length; i++) {
        u = units[i];
        var members = Array.from(model.units[u]).sort(byNumber).filter(function (c) {
          return open(state, c) && state.candidates[c] !== 0 && cells.indexOf(c) === -1;
        });
        for (var k = 1; k <= members.length; k++) {
          var sets = subsetsOf(members, k);
          for (var s = 0; s < sets.length; s++) {
            var union = shape.extras;
            sets[s].forEach(function (c) { union |= state.candidates[c]; });
            if (SG.bits.popcount(union) !== k + 1) continue;
            var eliminations = [];
            members.forEach(function (c) {
              if (sets[s].indexOf(c) !== -1) return;
              SG.bits.toArray(state.candidates[c] & union).forEach(function (d) { eliminations.push([c, d]); });
            });
            if (eliminations.length === 0) continue;
            out.push({ type: 3, cells: cells, roofs: shape.roofs, unit: u, real: sets[s], union: union,
              common: shape.common, eliminations: eliminations });
            if (firstOnly) return out;
          }
        }
      }
      for (i = 0; i < units.length; i++) {
        u = units[i];
        if (model.units[u].length !== model.digits || model.unitMeta[u].partial) continue;
        var digits = SG.bits.toArray(shape.common);
        for (var j = 0; j < digits.length; j++) {
          var holders = Array.from(model.units[u]).filter(function (c) { return has(state, c, digits[j]); });
          if (holders.length !== 2) continue;
          var removed = digits[1 - j];
          out.push({ type: 4, cells: cells, roofs: shape.roofs, unit: u, link: digits[j], digit: removed,
            common: shape.common, eliminations: [[shape.roofs[0], removed], [shape.roofs[1], removed]] });
          if (firstOnly) return out;
        }
      }
    }
    return out;
  }

  /** The Finding that the pattern of `urSubtypesOf` is documented to give. */
  function urExpectedFinding(model, pattern) {
    var label = function (c) { return H.label(model, c); };
    var base = {
      technique: 'uniqueRectangle',
      placements: [],
      eliminations: pattern.eliminations.slice().sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; })
    };
    var roofs = { roof1: label(pattern.roofs[0]), roof2: label(pattern.roofs[1]) };
    if (pattern.type === 3) {
      return Object.assign(base, {
        cells: pattern.cells.concat(pattern.real),
        i18nKey: 'technique.uniqueRectangle.type3.step',
        i18nArgs: Object.assign(roofs, {
          digits: SG.bits.toArray(pattern.common), partDigits: SG.bits.toArray(pattern.union),
          cells: pattern.real.map(label), unit: model.unitMeta[pattern.unit].label
        })
      });
    }
    return Object.assign(base, {
      cells: pattern.cells,
      i18nKey: 'technique.uniqueRectangle.type4.step',
      i18nArgs: Object.assign(roofs, {
        digits: SG.bits.toArray(pattern.common), digit: pattern.digit, unit: model.unitMeta[pattern.unit].label
      })
    });
  }

  /** Whether some rectangle of the state is a type 1 or a type 2 with a target (the first pass of the finder). */
  function urHasTypesOneTwo(model, state) {
    return rectangles(model).some(function (cells) {
      if (!inTwoBoxes(model, cells)) return false;
      var kind = urKind(model, state, cells);
      return kind !== null && (kind.type === 1 || urTargets(model, state, kind).length > 0);
    });
  }

  /**
   * The work units one call of the second pass spends, counted again from the rule of the header (units and layout
   * only, no table of the finder), for a state in which the first pass finds nothing: for every unit that holds both
   * roofs, with e the open cells of it outside the rectangle (the eligible cells) and the widest subset
   * min(e, digits - 1), every eligible cell whose candidates with the extras are at most widest + 1 digits is tried
   * as the next real cell of a subset of the sizes max(1, |extras| - 1) .. min(widest, pool), a cell that brings the
   * union above k + 1 digits is not extended, and the count stops at the first complete subset with a target; then,
   * in a complete unit, one unit per digit of the pair until a conjugate link.
   */
  function urUnitsOf(model, state) {
    var cand = state.candidates;
    var units = 0;
    var stop = false;
    urRectangles(model).forEach(function (cells) {
      if (stop) return;
      var shape = urShape(state, cells);
      if (shape === null) return;
      var holding = unitsHolding(model, shape.roofs[0], shape.roofs[1]);
      holding.forEach(function (u) {
        if (stop) return;
        var members = Array.from(model.units[u]).sort(byNumber).filter(function (c) {
          return open(state, c) && cand[c] !== 0 && cells.indexOf(c) === -1;
        });
        var first = Math.max(1, SG.bits.popcount(shape.extras) - 1);
        var widest = Math.min(members.length, model.digits - 1);
        var pool = members.filter(function (c) { return SG.bits.popcount(cand[c] | shape.extras) <= widest + 1; });
        for (var k = first; k <= widest && k <= pool.length && !stop; k++) {
          (function extend(chosen, union, from) {
            for (var i = from; i <= pool.length - (k - chosen.length) && !stop; i++) {
              units++;
              var all = union | cand[pool[i]];
              if (SG.bits.popcount(all) > k + 1) continue;
              var next = chosen.concat([pool[i]]);
              if (next.length === k) {
                if (SG.bits.popcount(all) === k + 1 && members.some(function (c) {
                  return next.indexOf(c) === -1 && (cand[c] & all) !== 0;
                })) stop = true;
                continue;
              }
              extend(next, all, i + 1);
            }
          })([], shape.extras, 0);
        }
      });
      if (stop) return;
      holding.forEach(function (u) {
        if (stop || model.units[u].length !== model.digits || model.unitMeta[u].partial) return;
        SG.bits.toArray(shape.common).forEach(function (d) {
          if (stop) return;
          units++;
          if (Array.from(model.units[u]).filter(function (c) { return has(state, c, d); }).length === 2) stop = true;
        });
      });
    });
    return units;
  }

  function byNumber(a, b) {
    return a - b;
  }

  /** The distance (number of peer edges) from `from` to every cell of `comp`, by breadth-first search. */
  function distancesFrom(model, comp, from) {
    var dist = {};
    dist[from] = 0;
    var queue = [from];
    for (var head = 0; head < queue.length; head++) {
      var u = queue[head];
      comp.forEach(function (v) {
        if (dist[v] === undefined && sees(model, u, v)) {
          dist[v] = dist[u] + 1;
          queue.push(v);
        }
      });
    }
    return dist;
  }

  /**
   * Independent enumeration of the remote pairs of a state, from the units alone (`sees`): the open cells with
   * the same two candidates, the components of their peer graph by depth-first search, a depth-first
   * two-colouring (an odd cycle skips the component), the distance of every pair of cells of a component by
   * breadth-first search and, for every pair at an odd distance of at least 3, the open cells that see both and
   * still have one of the two digits. Patterns come in the order of the finder: component (by its lowest cell),
   * lower end, higher end. `report` receives { components, inconsistent, targetsInComponent }.
   */
  function remotePairsOf(model, state, report) {
    var openPairs = bivalueCells(model, state);
    var done = {};
    var out = [];
    var stats = report || {};
    stats.components = 0;
    stats.inconsistent = 0;
    stats.targetsInComponent = 0;
    openPairs.forEach(function (start) {
      if (done[start]) return;
      var mask = state.candidates[start];
      var comp = [];
      var stack = [start];
      done[start] = true;
      while (stack.length > 0) {
        var c = stack.pop();
        comp.push(c);
        openPairs.forEach(function (d) {
          if (!done[d] && state.candidates[d] === mask && sees(model, c, d)) {
            done[d] = true;
            stack.push(d);
          }
        });
      }
      comp.sort(byNumber);
      stats.components++;
      var colour = {};
      colour[comp[0]] = 1;
      var consistent = true;
      stack = [comp[0]];
      while (stack.length > 0) {
        var u = stack.pop();
        comp.forEach(function (v) {
          if (!sees(model, u, v)) return;
          if (colour[v] === undefined) {
            colour[v] = 3 - colour[u];
            stack.push(v);
          } else if (colour[v] === colour[u]) {
            consistent = false;
          }
        });
      }
      if (!consistent) {
        stats.inconsistent++;
        return;
      }
      comp.forEach(function (x, i) {
        var dist = distancesFrom(model, comp, x);
        comp.forEach(function (y, j) {
          if (j <= i || dist[y] < 3 || dist[y] % 2 === 0) return;
          var targets = [];
          for (var t = 0; t < model.cellCount; t++) {
            if (open(state, t) && (state.candidates[t] & mask) !== 0 && sees(model, t, x) && sees(model, t, y)) {
              targets.push(t);
              if (comp.indexOf(t) !== -1) stats.targetsInComponent++;
            }
          }
          if (targets.length > 0) {
            out.push({ digits: SG.bits.toArray(mask), ends: [x, y], length: dist[y], targets: targets,
              component: comp, mask: mask });
          }
        });
      });
    });
    return out;
  }

  /** The eliminations of a remote pair: every target, both digits where it still has them (cell, then digit). */
  function remoteEliminations(state, pattern) {
    var out = [];
    pattern.targets.forEach(function (t) {
      pattern.digits.forEach(function (d) {
        if (has(state, t, d)) out.push([t, d]);
      });
    });
    return out;
  }

  /** `cells` is one shortest path between the ends: ascending, length + 1 cells, exactly `length` peer edges. */
  function expectShortestPath(model, cells, pattern) {
    expect(cells.slice().sort(byNumber)).toEqual(cells);
    expect(cells.length).toBe(pattern.length + 1);
    expect(cells).toContain(pattern.ends[0]);
    expect(cells).toContain(pattern.ends[1]);
    var edges = 0;
    for (var i = 0; i < cells.length; i++) {
      for (var j = i + 1; j < cells.length; j++) if (sees(model, cells[i], cells[j])) edges++;
    }
    expect(edges).toBe(pattern.length);
    expect(distancesFrom(model, cells, pattern.ends[0])[pattern.ends[1]]).toBe(pattern.length);
  }

  /**
   * Independent enumeration of the WXYZ-Wings of a state, from the units alone (`sees`) and digit set first: for every
   * set of four digits, the open cells whose candidates are a non-empty part of it, every four of them (in ascending
   * cell order) whose candidates together are the set, the digits that two of the four hold without seeing each
   * other (the non-restricted ones; exactly one makes a pattern), and the open cells outside the four that still
   * hold that digit z and see every cell of the four that holds it. With `firstOnly` the first pattern of each set
   * is enough (a quartet has one set, so the first of all is the first of those). Patterns come in the order of the
   * finder: the four cells, compared one by one.
   */
  function wxyzOf(model, state, firstOnly) {
    var n = model.cellCount;
    var cand = state.candidates;
    var pool = [];
    for (var c = 0; c < n; c++) {
      if (open(state, c) && cand[c] !== 0 && size(state, c) <= 4) pool.push(c);
    }
    var out = [];

    function pattern(quad, digits) {
      var holders = {};
      var apart = [];
      digits.forEach(function (d) {
        holders[d] = quad.filter(function (cell) { return has(state, cell, d); });
        var split = holders[d].some(function (p, i) {
          return holders[d].some(function (q, j) { return j > i && !sees(model, p, q); });
        });
        if (split) apart.push(d);
      });
      if (apart.length !== 1) return null;
      var z = apart[0];
      var targets = [];
      for (var t = 0; t < n; t++) {
        if (open(state, t) && has(state, t, z) && quad.indexOf(t) === -1 &&
            holders[z].every(function (h) { return sees(model, t, h); })) targets.push(t);
      }
      if (targets.length === 0) return null;
      return { cells: quad, digits: digits, digit: z, targets: targets, holders: holders[z] };
    }

    function forSet(digits) {
      var mask = 0;
      digits.forEach(function (d) { mask |= bit(d); });
      var inside = pool.filter(function (cell) { return (cand[cell] & ~mask) === 0; });
      for (var i = 0; i < inside.length; i++) {
        for (var j = i + 1; j < inside.length; j++) {
          for (var k = j + 1; k < inside.length; k++) {
            for (var l = k + 1; l < inside.length; l++) {
              var quad = [inside[i], inside[j], inside[k], inside[l]];
              if ((cand[quad[0]] | cand[quad[1]] | cand[quad[2]] | cand[quad[3]]) !== mask) continue;
              var found = pattern(quad, digits);
              if (found === null) continue;
              out.push(found);
              if (firstOnly) return;
            }
          }
        }
      }
    }

    for (var a = 1; a <= model.digits; a++) {
      for (var b = a + 1; b <= model.digits; b++) {
        for (var cc = b + 1; cc <= model.digits; cc++) {
          for (var d = cc + 1; d <= model.digits; d++) forSet([a, b, cc, d]);
        }
      }
    }
    out.sort(function (x, y) {
      for (var i = 0; i < 4; i++) if (x.cells[i] !== y.cells[i]) return x.cells[i] - y.cells[i];
      return 0;
    });
    return out;
  }

  /**
   * The capacity argument by exhaustion: every way to give each cell of the quartet one of its candidates so that
   * cells that see each other differ (a consistent filling) uses `digit` in at least one cell. Returns the number
   * of consistent fillings and of those without `digit`.
   */
  function fillings(model, state, quad, digit) {
    var total = 0;
    var without = 0;
    var picked = [];
    function go(i) {
      if (i === quad.length) {
        total++;
        if (picked.indexOf(digit) === -1) without++;
        return;
      }
      SG.bits.toArray(state.candidates[quad[i]]).forEach(function (d) {
        for (var k = 0; k < i; k++) {
          if (picked[k] === d && sees(model, quad[k], quad[i])) return;
        }
        picked[i] = d;
        go(i + 1);
      });
    }
    go(0);
    return { total: total, without: without };
  }

  /**
   * The work units one call of wxyzWing spends, counted again from the rule of the file header (units only, no table
   * of the finder): every open cell of one to four candidates is tried as the next member of a partial quartet, in
   * ascending order and only while enough cells are left to complete it; a cell that brings the union above four
   * digits or a second non-restricted digit is not extended; the count stops at the first complete quartet with a
   * target.
   */
  function wxyzUnits(model, state) {
    var cand = state.candidates;
    var pool = [];
    for (var c = 0; c < model.cellCount; c++) {
      if (open(state, c) && cand[c] !== 0 && size(state, c) <= 4) pool.push(c);
    }
    var units = 0;
    var stop = false;
    function extend(chosen, union, non, from) {
      for (var i = from; i <= pool.length - (4 - chosen.length) && !stop; i++) {
        units++;
        var cell = pool[i];
        var all = union | cand[cell];
        if (SG.bits.popcount(all) > 4) continue;
        var apart = non;
        chosen.forEach(function (p) {
          if (!sees(model, p, cell)) apart |= cand[p] & cand[cell];
        });
        if (SG.bits.popcount(apart) > 1) continue;
        var quad = chosen.concat([cell]);
        if (quad.length === 4) {
          if (apart === 0 || SG.bits.popcount(all) !== 4) continue;
          var holders = quad.filter(function (q) { return (cand[q] & apart) !== 0; });
          for (var t = 0; t < model.cellCount && !stop; t++) {
            if (open(state, t) && (cand[t] & apart) !== 0 && quad.indexOf(t) === -1 &&
                holders.every(function (h) { return sees(model, t, h); })) stop = true;
          }
          continue;
        }
        extend(quad, all, apart, i + 1);
      }
    }
    extend([], 0, 0, 0);
    return units;
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
        return urHasTypesOneTwo(model, state) || urSubtypesOf(model, state, true).length > 0;
      },
      verify: function (model, state, f) {
        expect(f.cells.length).toBeGreaterThanOrEqual(4);
        expect(inTwoBoxes(model, f.cells.slice(0, 4))).toBe(true);
        if (f.i18nKey === 'technique.uniqueRectangle.type3.step' || f.i18nKey === 'technique.uniqueRectangle.type4.step') {
          // types 1 and 2 keep their priority: none exists anywhere, and the Finding is the first of the second pass
          expect(urHasTypesOneTwo(model, state)).toBe(false);
          var first = urSubtypesOf(model, state, true);
          expect(first.length).toBe(1);
          expect(f).toEqual(urExpectedFinding(model, first[0]));
          return;
        }
        expect(f.cells.length).toBe(4);
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
    },
    wxyzWing: {
      exists: function (model, state) { return wxyzOf(model, state, true).length > 0; },
      verify: function (model, state, f) {
        var patterns = wxyzOf(model, state, true);
        expect(patterns.length).toBeGreaterThan(0);
        var first = patterns[0];
        expect(f.technique).toBe('wxyzWing');
        expect(f.placements).toEqual([]);
        expect(f.i18nKey).toBe('technique.wxyzWing.step');
        expect(f.cells).toEqual(first.cells);
        expect(f.i18nArgs).toEqual({ digits: first.digits, digit: first.digit,
          cells: first.cells.map(function (c) { return H.label(model, c); }) });
        expect(f.eliminations).toEqual(first.targets.map(function (t) { return [t, first.digit]; }));
        // the four cells are open, different and hold four digits together; no cell of the quartet is a target
        f.cells.forEach(function (c) { expect(open(state, c)).toBe(true); });
        expect(new Set(f.cells).size).toBe(4);
        expect(SG.bits.popcount(f.cells.reduce(function (m, c) { return m | state.candidates[c]; }, 0))).toBe(4);
        f.eliminations.forEach(function (e) {
          expect(f.cells).not.toContain(e[0]);
          expect(has(state, e[0], first.digit)).toBe(true);
          first.holders.forEach(function (h) { expect(sees(model, e[0], h)).toBe(true); });
        });
        // the proof by exhaustion: no consistent filling of the four cells is without the digit
        expect(fillings(model, state, f.cells, first.digit).without).toBe(0);
      }
    },
    remotePairs: {
      exists: function (model, state) { return remotePairsOf(model, state).length > 0; },
      verify: function (model, state, f) {
        var report = {};
        var patterns = remotePairsOf(model, state, report);
        expect(patterns.length).toBeGreaterThan(0);
        // no target is ever a cell of its own component (parity: it would be adjacent to both ends)
        expect(report.targetsInComponent).toBe(0);
        var first = patterns[0];
        expect(f.technique).toBe('remotePairs');
        expect(f.placements).toEqual([]);
        expect(f.i18nArgs.digits).toEqual(first.digits);
        expect(f.i18nArgs.ends).toEqual(first.ends.map(function (c) { return H.label(model, c); }));
        expect(f.i18nArgs.length).toBe(first.length);
        expect(f.eliminations).toEqual(remoteEliminations(state, first));
        expectShortestPath(model, f.cells, first);
        f.eliminations.forEach(function (e) { expect(f.cells).not.toContain(e[0]); });
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
    var items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(SEED), count);
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

  describe('wing techniques: registration', function () {
    var EXPECTED = {
      remotePairs: { baseCost: 35, order: 116, assumesUniqueness: false },
      xyWing: { baseCost: 48, order: 140, assumesUniqueness: false },
      xyzWing: { baseCost: 54, order: 150, assumesUniqueness: false },
      wxyzWing: { baseCost: 57, order: 155, assumesUniqueness: false },
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

    it('the six techniques run in the order remotePairs, xyWing, xyzWing, wxyzWing, wWing, uniqueRectangle',
      function () {
        var ladder = SG.techniques.list().map(function (t) { return t.id; })
          .filter(function (id) { return IDS.indexOf(id) !== -1; });
        expect(ladder).toEqual(['remotePairs', 'xyWing', 'xyzWing', 'wxyzWing', 'wWing', 'uniqueRectangle']);
      });

    it('wxyzWing sits between xyzWing and wWing (R13: order 155 after the unscoped techniques of lower order)',
      function () {
        var ids = SG.techniques.list().filter(function (t) { return t.variantScope === null; })
          .map(function (t) { return t.id; });
        expect(ids.indexOf('xyzWing') + 1).toBe(ids.indexOf('wxyzWing'));
        expect(ids.indexOf('wxyzWing') + 1).toBe(ids.indexOf('wWing'));
        expect(SG.techniques.get('xyzWing').order).toBeLessThan(155);
        expect(SG.techniques.get('wWing').order).toBeGreaterThan(155);
      });

    it('remotePairs sits between twoStringKite and simpleColouring (RP-01: order 116, after the unscoped ' +
      'techniques of lower order)', function () {
        var ids = SG.techniques.list().filter(function (t) { return t.variantScope === null; })
          .map(function (t) { return t.id; });
        expect(ids.indexOf('twoStringKite') + 1).toBe(ids.indexOf('remotePairs'));
        expect(ids.indexOf('remotePairs') + 1).toBe(ids.indexOf('simpleColouring'));
        expect(SG.techniques.get('twoStringKite').order).toBeLessThan(116);
        expect(SG.techniques.get('simpleColouring').order).toBeGreaterThan(116);
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

    // remotePairs and wxyzWing are bounded finders: a spent budget is "nothing found" there (their own describes below).
    IDS.filter(function (id) { return id !== 'remotePairs' && id !== 'wxyzWing'; }).forEach(function (id) {
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

  // Remote Pairs (R13). The vector: A = R1C1, B = R2C2, C = R2C5 and D = R5C5 hold exactly {2, 7}; the edges are A-B
  // (box 1), B-C (row 2) and C-D (column 5) and no other pair of the four sees each other, so A and D are three
  // edges apart. R1C5 and R5C1 see A and D and neither B nor C.
  var RP_VECTOR = [0, 10, 13, 40];

  /** A blank board where the cells of the list hold exactly the pair of digits (default 2 and 7). */
  function pairState(model, cells, digits) {
    return board(model, cells.map(function (c) { return [c, digits || '27']; }));
  }

  /** Removes both digits of the pair from every cell that is not in `keep`, so that only `keep` can be a target. */
  function isolate(model, state, digits, keep) {
    for (var c = 0; c < model.cellCount; c++) {
      if (keep.indexOf(c) !== -1) continue;
      String(digits).split('').forEach(function (ch) { state.candidates[c] &= ~bit(parseInt(ch, 10)); });
    }
    return state;
  }

  function cellsOf(model, refs) {
    return refs.map(function (ref) { return H.cell(model, ref); });
  }

  function rpFind(model, state, ctxOptions) {
    return SG.techniques.get('remotePairs').find(model, state, SG.techniques.createContext(model, ctxOptions || {}));
  }

  /** One call of the registered finder or of the seam (`workLimit` given, even undefined) with its observer. */
  function rpObserved(model, state, opts) {
    var records = [];
    var options = opts || {};
    var ctx = SG.techniques.createContext(model, Object.assign({
      onPatternWork: function (r) { records.push(r); }
    }, options.ctx));
    var finding = options.seam
      ? SG.wingSearch.remotePairs(model, state, ctx, options.limit === undefined ? undefined : { workLimit: options.limit })
      : SG.techniques.get('remotePairs').find(model, state, ctx);
    return { finding: finding, records: records, record: records[0] };
  }

  function thrownBy(fn) {
    try {
      fn();
    } catch (err) {
      return err;
    }
    return null;
  }

  describe('remotePairs (R13): geometry', function () {
    it('the vector: the common peers of the ends lose both digits, with the ends, the digits and 3 edges',
      function () {
        var state = pairState(model9, RP_VECTOR);
        var f = check('remotePairs', model9, state, {
          cells: ['R1C1', 'R2C2', 'R2C5', 'R5C5'],
          eliminations: [['R1C5', 2], ['R1C5', 7], ['R5C1', 2], ['R5C1', 7]],
          args: { digits: [2, 7], ends: ['R1C1', 'R5C5'], length: 3 }
        });
        expect(f.cells).toEqual([0, 10, 13, 40]);
        expect(f.eliminations).toEqual([[4, 2], [4, 7], [36, 2], [36, 7]]);
        expect(f.placements).toEqual([]);
        expect(f.i18nKey).toBe('technique.remotePairs.step');
        expect(Object.keys(f.i18nArgs)).toEqual(['digits', 'ends', 'length']);
        expect(JSON.parse(JSON.stringify(f.i18nArgs))).toEqual(f.i18nArgs);
        expect(f.cells).not.toContain(4);
        expect(f.cells).not.toContain(36);
      });

    it('R5C1 alone, as in the brief: it sees A and D only and loses 2 and 7 (R1C5 has neither left)', function () {
      var state = pairState(model9, RP_VECTOR);
      dropDigit(state, 2, [4]);
      dropDigit(state, 7, [4]);
      var f = check('remotePairs', model9, state, { eliminations: [['R5C1', 2], ['R5C1', 7]] });
      expect(f.eliminations).toEqual([[36, 2], [36, 7]]);
    });

    it('a target loses only the digits it still has', function () {
      var state = pairState(model9, RP_VECTOR);
      dropDigit(state, 7, [36]);
      dropDigit(state, 2, [4]);
      dropDigit(state, 7, [4]);
      var f = check('remotePairs', model9, state, { eliminations: [['R5C1', 2]] });
      expect(f.eliminations).toEqual([[36, 2]]);
    });

    it('the transposed vector: the same ends and targets, the path through R5C2', function () {
      var cells = [at(model9, 0, 0), at(model9, 1, 1), at(model9, 4, 1), at(model9, 4, 4)];
      var f = check('remotePairs', model9, pairState(model9, cells), {
        eliminations: [['R1C5', 2], ['R1C5', 7], ['R5C1', 2], ['R5C1', 7]],
        args: { digits: [2, 7], ends: ['R1C1', 'R5C5'], length: 3 }
      });
      expect(f.cells).toEqual([0, 10, 37, 40]);
    });

    it('works with any pair of digits (a pair other than the first ones, the digits in ascending order)', function () {
      var f = check('remotePairs', model9, pairState(model9, RP_VECTOR, '49'), {
        eliminations: [['R1C5', 4], ['R1C5', 9], ['R5C1', 4], ['R5C1', 9]],
        args: { digits: [4, 9], ends: ['R1C1', 'R5C5'], length: 3 }
      });
      expect(f.eliminations.length).toBe(4);
    });

    it('an even path proves nothing: R1C4 sees only A and C, which hold the same digit when B is 7', function () {
      var state = isolate(model9, pairState(model9, RP_VECTOR), '27', RP_VECTOR.concat([3]));
      expect(victims(model9, state, [0, 13], 2)).toContain(3);
      checkNone('remotePairs', model9, state);
      // the chain A-B-C alone: three cells, two edges
      checkNone('remotePairs', model9, pairState(model9, RP_VECTOR.slice(0, 3)));
    });

    it('an adjacent pair is no remote pair: R2C1 sees A and B, and B and C, each pair one edge apart', function () {
      var state = isolate(model9, pairState(model9, RP_VECTOR), '27', RP_VECTOR.concat([9]));
      var seen = RP_VECTOR.filter(function (c) { return sees(model9, 9, c); });
      expect(seen).toEqual([0, 10, 13]);
      checkNone('remotePairs', model9, state);
    });

    it('a target that sees only one end proves nothing: R1C9 sees A, R5C9 sees D', function () {
      [8, 44].forEach(function (target) {
        var state = isolate(model9, pairState(model9, RP_VECTOR), '27', RP_VECTOR.concat([target]));
        checkNone('remotePairs', model9, state);
      });
    });

    it('a path of five edges (six cells): the ends are the pair R7C1 sees three or more edges apart', function () {
      var chain = cellsOf(model9, ['R1C1', 'R1C5', 'R4C5', 'R4C8', 'R7C8', 'R7C2']);
      var target = H.cell(model9, 'R7C1');
      var state = isolate(model9, pairState(model9, chain), '27', chain.concat([target]));
      var f = check('remotePairs', model9, state, {
        eliminations: [['R7C1', 2], ['R7C1', 7]],
        args: { digits: [2, 7], ends: ['R1C1', 'R7C2'], length: 5 }
      });
      expect(f.cells).toEqual([0, 4, 31, 34, 55, 61]);
    });

    it('a target that also sees an adjacent opposite-colour pair still loses both digits when another visible ' +
      'pair is three or more edges apart (SA2 Q3), and the witness is that far pair', function () {
        var chain = cellsOf(model9, ['R1C1', 'R1C5', 'R4C5', 'R4C8', 'R7C8', 'R7C2']);
        var target = H.cell(model9, 'R7C1');
        var state = isolate(model9, pairState(model9, chain), '27', chain.concat([target]));
        // R7C1 sees R1C1 (column 1), R7C8 and R7C2 (row 7); R7C8 and R7C2 are peers of opposite colours (R1C1 is
        // one colour with R7C8, the other with R7C2), so the target sees an adjacent opposite pair as well
        expect([0, 61, 55].every(function (c) { return sees(model9, target, c); })).toBe(true);
        expect(sees(model9, 61, 55)).toBe(true);
        var patterns = remotePairsOf(model9, state);
        expect(patterns.map(function (p) { return p.length; })).toEqual([5]);
        expect(remoteEliminations(state, patterns[0])).toEqual([[target, 2], [target, 7]]);
        expect(rpFind(model9, state).i18nArgs).toEqual({ digits: [2, 7], ends: ['R1C1', 'R7C2'], length: 5 });
        // the justification of an adjacent pair alone is not a remote pair: without R1C1 the chain has five cells,
        // R7C1 sees only R7C8 and R7C2, and nothing is found
        var shorter = chain.slice(1);
        var alone = isolate(model9, pairState(model9, shorter), '27', shorter.concat([target]));
        expect(sees(model9, target, shorter[3])).toBe(true);
        checkNone('remotePairs', model9, alone);
      });

    it('the length is the shortest way: an 8-cycle holds the ends of 3 and of 5 edges, 3 is reported', function () {
      var ring = cellsOf(model9, ['R1C1', 'R1C4', 'R4C4', 'R4C7', 'R8C7', 'R8C2', 'R5C2', 'R5C1']);
      // R1C7 sees R1C1 and R4C7, R1C2 sees R1C1 and R8C2 (both pairs are three edges apart); the pairs are tried by
      // lower end, then higher end, so R4C7 comes before R8C2
      var targets = cellsOf(model9, ['R1C7', 'R1C2']);
      var state = isolate(model9, pairState(model9, ring), '27', ring.concat(targets));
      var f = check('remotePairs', model9, state, {
        eliminations: [['R1C7', 2], ['R1C7', 7]],
        args: { digits: [2, 7], ends: ['R1C1', 'R4C7'], length: 3 }
      });
      expect(f.cells).toEqual([0, 3, 30, 33]);
      // without R1C7 the next pair of ends is the one of R1C2, three edges the other way round
      var second = isolate(model9, pairState(model9, ring), '27', ring.concat(targets.slice(1)));
      var g = check('remotePairs', model9, second, {
        eliminations: [['R1C2', 2], ['R1C2', 7]],
        args: { digits: [2, 7], ends: ['R1C1', 'R8C2'], length: 3 }
      });
      expect(g.cells).toEqual([0, 36, 37, 64]);
    });

    it('the witness is the first shortest path of a breadth-first search from the lower end (a 6-cycle tie)',
      function () {
        var ring = cellsOf(model9, ['R1C1', 'R1C4', 'R4C4', 'R4C2', 'R7C2', 'R7C1']);
        var target = H.cell(model9, 'R4C1');
        var state = isolate(model9, pairState(model9, ring), '27', ring.concat([target]));
        var f = check('remotePairs', model9, state, {
          eliminations: [['R4C1', 2], ['R4C1', 7]],
          args: { digits: [2, 7], ends: ['R1C1', 'R4C2'], length: 3 }
        });
        // both ways round have three edges; the search reaches R4C2 through R1C4 and R4C4 first
        expect(f.cells).toEqual([0, 3, 28, 30]);
      });

    it('the first pair of ends with a target wins: components by their lowest cell, then lower end, higher end',
      function () {
        // the vector plus a second chain in boxes 8 and 9: only the first component is reported
        var second = cellsOf(model9, ['R7C7', 'R8C8', 'R8C4', 'R9C6']);
        var state = pairState(model9, RP_VECTOR.concat(second), '27');
        var f = check('remotePairs', model9, state, {});
        expect(f.cells).toEqual([0, 10, 13, 40]);
        // without the targets of the first chain the second one is found, through R7C6 (row 7 and column 6)
        var rest = isolate(model9, pairState(model9, RP_VECTOR.concat(second)), '27',
          RP_VECTOR.concat(second).concat(cellsOf(model9, ['R7C6'])));
        var g = check('remotePairs', model9, rest, { eliminations: [['R7C6', 2], ['R7C6', 7]] });
        expect(g.cells).toEqual([60, 66, 70, 77]);
        expect(g.i18nArgs.ends).toEqual(['R7C7', 'R9C6']);
      });

    it('two components of two cells prove nothing, even when every cell holds the same pair', function () {
      // A-B in box 1 and D-C in box 5; R1C4 sees A (row 1) and D (column 4) and none of the others. Each component
      // is walked once (2 + 2 edge extensions) and no pair of ends is tested.
      var cells = cellsOf(model9, ['R1C1', 'R2C2', 'R5C5', 'R4C4']);
      var state = isolate(model9, pairState(model9, cells), '27', cells.concat(cellsOf(model9, ['R1C4'])));
      checkNone('remotePairs', model9, state);
      expect(rpObserved(model9, state).record.work).toBe(4);
      // a component of three cells and a fourth cell of its own: no path of three edges
      var apart = cellsOf(model9, ['R1C1', 'R2C2', 'R2C5', 'R8C8']);
      var split = pairState(model9, apart);
      checkNone('remotePairs', model9, split);
      expect(rpObserved(model9, split).record.work).toBe(4);
    });

    it('a two-cell component is a naked pair, left to nakedPair: a target of its row is no remote-pair target',
      function () {
        var state = pairState(model9, cellsOf(model9, ['R1C1', 'R1C5']));
        checkNone('remotePairs', model9, state);
        expect(rpObserved(model9, state).record.work).toBe(0);
        var naked = SG.techniques.get('nakedPair').find(model9, state, SG.techniques.createContext(model9, {}));
        expect(naked).not.toBeNull();
      });

    it('an odd cycle is inconsistent: a 5-cycle with a target that sees two of its far cells finds nothing',
      function () {
        var ring = cellsOf(model9, ['R1C1', 'R1C5', 'R4C5', 'R4C2', 'R3C2']);
        var target = H.cell(model9, 'R1C2');
        var state = isolate(model9, pairState(model9, ring), '27', ring.concat([target]));
        expect(target).toBe(1);
        var report = {};
        expect(remotePairsOf(model9, state, report)).toEqual([]);
        expect(report.inconsistent).toBe(1);
        checkNone('remotePairs', model9, state);
        // the same cells without the fifth one are a chain of four with the target of the vector's kind: found
        var chain = ring.slice(0, 4);
        var open = isolate(model9, pairState(model9, chain), '27', chain.concat([target]));
        expect(rpFind(model9, open)).not.toBeNull();
      });

    it('a triple of the pair in one unit rejects the whole component, a valid-looking chain included', function () {
      // B, C and E are in row 2: three cells with the same pair in a unit, the colouring cannot be consistent
      var state = pairState(model9, RP_VECTOR.concat([17]));
      var report = {};
      expect(remotePairsOf(model9, state, report)).toEqual([]);
      expect(report.inconsistent).toBe(1);
      checkNone('remotePairs', model9, state);
      expect(rpFind(model9, pairState(model9, RP_VECTOR))).not.toBeNull();
    });

    it('an inconsistent component is consumed whole: a valid chain hanging off a triangle proves nothing', function () {
      // A, B and C are a triangle in box 1; T1-T2-T3-T4 is a chain of three edges attached to C along row 2. The
      // pair T1, T4 would justify R2C9 if the chain were looked at on its own.
      var triangle = cellsOf(model9, ['R1C1', 'R1C2', 'R2C1']);
      var tail = cellsOf(model9, ['R2C5', 'R6C5', 'R6C9', 'R3C9']);
      var target = H.cell(model9, 'R2C9');
      var all = triangle.concat(tail);
      var state = isolate(model9, pairState(model9, all), '27', all.concat([target]));
      var report = {};
      expect(remotePairsOf(model9, state, report)).toEqual([]);
      expect(report.components).toBe(1);
      expect(report.inconsistent).toBe(1);
      checkNone('remotePairs', model9, state);
      // the tail alone, without the triangle, is a chain of three edges and is found
      var alone = isolate(model9, pairState(model9, tail), '27', tail.concat([target]));
      var f = check('remotePairs', model9, alone, { eliminations: [['R2C9', 2], ['R2C9', 7]] });
      expect(f.i18nArgs.ends).toEqual(['R2C5', 'R3C9']);
    });

    it('only cells with exactly the same two candidates chain: another pair, a third candidate or a solved cell',
      function () {
        function withCell(cell, digits) {
          var state = pairState(model9, RP_VECTOR);
          state.candidates[cell] = maskOf(digits);
          return state;
        }
        checkNone('remotePairs', model9, withCell(13, '28'));
        checkNone('remotePairs', model9, withCell(13, '279'));
        checkNone('remotePairs', model9, withCell(10, '7'));
        var solved = pairState(model9, RP_VECTOR);
        solved.value[13] = 2;
        solved.candidates[13] = bit(2);
        solved.unsolvedCount--;
        none('remotePairs', model9, solved);
        expect(remotePairsOf(model9, solved)).toEqual([]);
      });

    it('solved cells are never targets, nor does a target need to hold both digits', function () {
      var state = pairState(model9, RP_VECTOR);
      state.value[4] = 2;
      state.candidates[4] = bit(2);
      state.unsolvedCount--;
      var f = check('remotePairs', model9, state, { eliminations: [['R5C1', 2], ['R5C1', 7]] });
      expect(f.eliminations.every(function (e) { return e[0] === 36; })).toBe(true);
      state.value[36] = 7;
      state.candidates[36] = bit(7);
      state.unsolvedCount--;
      none('remotePairs', model9, state);
    });

    it('is a pure function of the state: another call in between changes nothing, and the state stays as it was',
      function () {
        var vector = pairState(model9, RP_VECTOR);
        var other = pairState(model9, cellsOf(model9, ['R1C1', 'R1C5', 'R4C5', 'R4C8', 'R7C8', 'R7C2']));
        var first = JSON.stringify(rpFind(model9, vector));
        var snapshot = SG.model.cloneState(vector);
        expect(JSON.stringify(rpFind(model9, other))).not.toBe(first);
        expect(JSON.stringify(rpFind(model9, pairState(model9, RP_VECTOR.slice(0, 3))))).toBe('null');
        expect(JSON.stringify(rpFind(model9, vector))).toBe(first);
        expect(vector.candidates).toEqual(snapshot.candidates);
        expect(vector.value).toEqual(snapshot.value);
        // the Finding owns its arrays: changing one does not change the next answer
        var f = rpFind(model9, vector);
        f.cells.push(99);
        f.eliminations.pop();
        f.i18nArgs.digits.push(0);
        f.i18nArgs.ends.push('X');
        expect(JSON.stringify(rpFind(model9, vector))).toBe(first);
      });

    it('shares nothing between boards: a call on one model leaves the answers on another untouched', function () {
      var vector = pairState(model9, RP_VECTOR);
      var chain = inducedChain(model6, 4, 0);
      expect(chain).not.toBeNull();
      var small = pairState(model6, chain, '12');
      var a = JSON.stringify(rpFind(model9, vector));
      var b = JSON.stringify(rpFind(model6, small));
      expect(b).not.toBe('null');
      expect(JSON.stringify(rpFind(model9, vector))).toBe(a);
      expect(JSON.stringify(rpFind(model6, small))).toBe(b);
    });

    it('does not rely on a unique solution', function () {
      check('remotePairs', model9, pairState(model9, RP_VECTOR), {}, { assumeUniqueness: false });
    });
  });

  describe('remotePairs (R13): actual peers on other unit shapes', function () {
    function variantModel(id) {
      if (!SG.testkit.hasVariant(id)) SG.test.skip('no board of ' + id + ' can be built here');
      return H.model(id);
    }

    it('diagonalX: an edge through the main diagonal, a target through the anti-diagonal; classic9 has neither',
      function () {
        var diag = variantModel('diagonalX');
        var chain = cellsOf(diag, ['R2C2', 'R6C6', 'R6C1', 'R9C1']);
        var target = H.cell(diag, 'R2C8');
        var state = isolate(diag, pairState(diag, chain), '27', chain.concat([target]));
        var f = check('remotePairs', diag, state, {
          eliminations: [['R2C8', 2], ['R2C8', 7]],
          args: { digits: [2, 7], ends: ['R2C2', 'R9C1'], length: 3 }
        });
        expect(f.cells).toEqual([10, 45, 50, 72]);
        // the same cells on the classic board are not a chain: R2C2 and R6C6 do not see each other
        var plain = isolate(model9, pairState(model9, chain), '27', chain.concat([target]));
        checkNone('remotePairs', model9, plain);
      });

    it('diagonalX: two cells that see each other only along the diagonal are an adjacent pair, no remote pair',
      function () {
        var diag = variantModel('diagonalX');
        var ends = cellsOf(diag, ['R1C1', 'R5C5']);
        var state = isolate(diag, pairState(diag, ends), '27', ends.concat(cellsOf(diag, ['R1C5'])));
        checkNone('remotePairs', diag, state);
        // with a second pair of the same digits next to them the component has four cells and the diagonal edge
        // is part of a path of three edges
        var chain = cellsOf(diag, ['R1C2', 'R1C1', 'R5C5', 'R5C9']);
        expect(sees(diag, chain[1], chain[2])).toBe(true);
        var longer = isolate(diag, pairState(diag, chain), '27', chain.concat(cellsOf(diag, ['R1C9'])));
        var f = check('remotePairs', diag, longer, {});
        expect(f.i18nArgs.length).toBe(3);
      });

    it('hyper: an edge inside an extra window', function () {
      var hyper = variantModel('hyper');
      var chain = inducedChain(hyper, 4, 0);
      expect(chain).not.toBeNull();
      var state = pairState(hyper, chain);
      check('remotePairs', hyper, state, {});
    });

    it('jigsaw9: an edge inside an irregular region', function () {
      var jig = variantModel('jigsaw9');
      var chain = inducedChain(jig, 4, 0);
      expect(chain).not.toBeNull();
      check('remotePairs', jig, pairState(jig, chain), {});
    });

    it('samurai: cells of two grids that share a layout row but no unit are not peers, so no chain', function () {
      var samurai = variantModel('samurai');
      var L = samurai.layout;
      var left = -1;
      var right = -1;
      for (var c = 0; c < samurai.cellCount; c++) {
        if (L.cellRow[c] === 0 && L.cellCol[c] === 0) left = c;
        if (L.cellRow[c] === 0 && L.cellCol[c] === 12) right = c;
      }
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeGreaterThanOrEqual(0);
      expect(sees(samurai, left, right)).toBe(false);
      // a chain A-B-C-D whose last hop would need the two rows to be one line: the layout says row 1, the units do not
      var chain = [left, right];
      var state = pairState(samurai, chain);
      checkNone('remotePairs', samurai, state);
      expect(rpObserved(samurai, state).record.work).toBe(0);
    });
  });

  describe('remotePairs (R13): an assembled caged Killer model (a cage-only peer edge)', function () {
    // The Killer puzzle of the help catalogue (givens '4' at R1C1 and '2' at R9C9), assembled with its 25 cages: a cage is
    // a partial all-different unit, so cage-mates are real peers, also when they share no complete row, column or box.
    // R7C3 and R8C4 are cage-mates of the cage R7C2, R7C3, R7C4, R8C4 (sum 18) in different rows, columns and boxes.
    // A cage-only peer edge invalidates the complete-unit subsumption proof; this alone does not demonstrate normal-hint
    // reachability (RP-01 / S-OD9: it is a finder-level test, not a help source).
    var CAGES = [
      { cells: [0, 9], sum: 6 }, { cells: [1, 10], sum: 7 }, { cells: [2, 11, 20, 29], sum: 23 },
      { cells: [3, 4], sum: 9 }, { cells: [5, 13, 14, 22], sum: 26 }, { cells: [6, 15, 16, 24], sum: 12 },
      { cells: [7, 8], sum: 12 }, { cells: [12, 21, 30], sum: 12 }, { cells: [17, 25, 26, 35, 44], sum: 26 },
      { cells: [18, 19, 27], sum: 20 }, { cells: [23, 32, 33], sum: 17 }, { cells: [28, 36, 37, 38, 45], sum: 23 },
      { cells: [31, 39, 40, 48, 49], sum: 24 }, { cells: [34, 41, 42, 43], sum: 23 }, { cells: [46, 47], sum: 11 },
      { cells: [50, 58, 59, 60], sum: 22 }, { cells: [51, 52, 53], sum: 11 }, { cells: [54, 63, 72], sum: 20 },
      { cells: [55, 56, 57, 66], sum: 18 }, { cells: [61, 62, 71], sum: 16 }, { cells: [64, 65, 73], sum: 7 },
      { cells: [67, 68, 69], sum: 18 }, { cells: [70, 79, 80], sum: 12 }, { cells: [74, 75, 76], sum: 18 },
      { cells: [77, 78], sum: 12 }
    ];
    var SOLUTION = '465817239217369548983542167358426971692173854174958326736291485521784693849635712';
    var solution = SOLUTION.split('').map(Number);
    var R7C3 = 56;
    var R8C4 = 66;

    function assembled() {
      // killer.js is not loaded by the Player: the same assembly there (the 27 classic units and a partial unit of
      // kind 'cage' per cage, with the cages), the real one wherever SG.killer exists
      if (SG.killer) return SG.killer.modelFromCages(CAGES);
      return rebuild(model9, 'killer', {
        units: CAGES.map(function (cage, k) {
          return { cells: cage.cells, meta: { kind: 'cage', gridIndex: 0, label: 'K' + (k + 1), partial: true } };
        }),
        cages: CAGES.map(function (cage) { return { cells: cage.cells, sum: cage.sum, distinct: true }; })
      });
    }

    var model = null;
    function killer() {
      if (model === null) model = assembled();
      return model;
    }

    function completeUnitsHolding(m, a, b) {
      var out = [];
      m.units.forEach(function (cells, u) {
        var kind = m.unitMeta[u].kind;
        if ((kind === 'row' || kind === 'col' || kind === 'box' || kind === 'region') &&
            cells.indexOf(a) !== -1 && cells.indexOf(b) !== -1) out.push(u);
      });
      return out;
    }

    function chainState(m, chain) {
      var state = SG.model.initState(m);
      var mask = bit(solution[chain[0]]) | bit(solution[chain[1]]);
      chain.forEach(function (c) { state.candidates[c] = mask; });
      return state;
    }

    it('assembles the cages as partial units: cage-mates are peers, also with no complete unit in common', function () {
      var m = killer();
      expect(m.cages).toHaveLength(25);
      expect(m.unitMeta.filter(function (meta) { return meta.kind === 'cage'; })).toHaveLength(25);
      m.unitMeta.forEach(function (meta) { if (meta.kind === 'cage') expect(meta.partial).toBe(true); });
      // R7C3 and R8C4 share the cage and no row, column or box; the uncaged boards have no such edge
      expect(completeUnitsHolding(m, R7C3, R8C4)).toEqual([]);
      expect(sees(m, R7C3, R8C4)).toBe(true);
      expect(Array.prototype.indexOf.call(m.peers[R7C3], R8C4)).not.toBe(-1);
      expect(Array.prototype.indexOf.call(model9.peers[R7C3], R8C4)).toBe(-1);
      expect(sees(model9, R7C3, R8C4)).toBe(false);
      // the units hold only different digits in the solution: rows, columns, boxes and cages, and every cage sum
      m.units.forEach(function (cells) {
        var seen = {};
        cells.forEach(function (c) {
          expect(seen[solution[c]]).toBeUndefined();
          seen[solution[c]] = true;
        });
      });
      CAGES.forEach(function (cage) {
        expect(cage.cells.reduce(function (sum, c) { return sum + solution[c]; }, 0)).toBe(cage.sum);
      });
      if (SG.killer) {
        // the hand assembly of the fallback is the real one: the same units and the same peers
        var by = rebuild(model9, 'killer', {
          units: CAGES.map(function (cage, k) {
            return { cells: cage.cells, meta: { kind: 'cage', gridIndex: 0, label: 'K' + (k + 1), partial: true } };
          }),
          cages: CAGES.map(function (cage) { return { cells: cage.cells, sum: cage.sum, distinct: true }; })
        });
        var toLists = function (peers) {
          return Array.prototype.map.call(peers, function (list) { return Array.from(list); });
        };
        expect(toLists(by.peers)).toEqual(toLists(m.peers));
      }
    });

    it('a chain whose last edge is a cage-only edge is found, with a sound witness and no proving cell removed',
      function () {
        var m = killer();
        // R1C2 - R2C3 (box 1) - R7C3 (column 3) - R8C4 (the cage), the solution digits 6 and 7 alternate along it
        var chain = [1, 11, R7C3, R8C4];
        expect(chain.map(function (c) { return solution[c]; })).toEqual([6, 7, 6, 7]);
        var state = chainState(m, chain);
        var f = check('remotePairs', m, state, {
          cells: chain,
          eliminations: [['R1C4', 6], ['R1C4', 7], ['R7C2', 6], ['R7C2', 7], ['R8C2', 6], ['R8C2', 7]],
          args: { digits: [6, 7], ends: ['R1C2', 'R8C4'], length: 3 }
        }, { solution: solution });
        expect(f.cells).toEqual([1, 11, 56, 66]);
        expect(f.eliminations).toEqual([[3, 6], [3, 7], [55, 6], [55, 7], [64, 6], [64, 7]]);
        // independent soundness: nothing the solution needs is removed, and no proving cell loses a digit
        expect(H.findingProblems(m, state, f, { technique: 'remotePairs', solution: solution })).toEqual([]);
        f.eliminations.forEach(function (e) {
          expect(f.cells).not.toContain(e[0]);
          expect(solution[e[0]]).not.toBe(e[1]);
        });
        // R7C2 sees the end R8C4 only through the cage
        expect(completeUnitsHolding(m, 55, R8C4)).toEqual([]);
        expect(sees(m, 55, R8C4)).toBe(true);
        // 6 edge extensions to colour, 1 pair of ends, 5 to walk the witness
        expect(rpObserved(m, state).record).toEqual({ id: 'remotePairs', work: 12, limit: 50000, capHit: null,
          retained: null });
      });

    it('the cage is the only link of that chain: the same cells on the uncaged board find nothing', function () {
      var state = chainState(model9, [1, 11, R7C3, R8C4]);
      checkNone('remotePairs', model9, state);
      // the box edge and the column edge are still walked, each from both of its cells, and no pair of ends is tested
      expect(rpObserved(model9, state).record.work).toBe(4);
    });

    it('agrees with the independent enumeration and with the solution on every cage-only chain of the model',
      function () {
        var m = killer();
        var n = m.cellCount;
        var chains = [];
        for (var a = 0; a < n && chains.length < 16; a++) {
          for (var b = 0; b < n && chains.length < 16; b++) {
            if (!sees(m, a, b) || solution[b] === solution[a]) continue;
            for (var c = 0; c < n; c++) {
              if (c === a || !sees(m, b, c) || solution[c] !== solution[a] || sees(m, a, c)) continue;
              for (var d = 0; d < n; d++) {
                if (d === a || d === b || !sees(m, c, d) || solution[d] !== solution[b] || sees(m, a, d) ||
                    sees(m, b, d)) continue;
                var cageOnly = [[a, b], [b, c], [c, d]].some(function (edge) {
                  return completeUnitsHolding(m, edge[0], edge[1]).length === 0;
                });
                var target = false;
                for (var t = 0; t < n; t++) {
                  if (t !== b && t !== c && sees(m, t, a) && sees(m, t, d)) target = true;
                }
                if (cageOnly && target && chains.length < 16) chains.push([a, b, c, d]);
              }
            }
          }
        }
        expect(chains.length).toBe(16);
        chains.forEach(function (chain) {
          var state = chainState(m, chain);
          var f = rpFind(m, state);
          expect(f).not.toBeNull();
          ORACLE.remotePairs.verify(m, state, f);
          expect(H.findingProblems(m, state, f, { technique: 'remotePairs', solution: solution })).toEqual([]);
          expect(f.cells.every(function (cell) { return chain.indexOf(cell) !== -1; })).toBe(true);
          // the chain needs the cage: on the uncaged board the same cells find nothing
          expect(rpFind(model9, chainState(model9, chain))).toBeNull();
        });
      });

    it('costs the sum of the peers at most (bound evidence of the caged model, not the 27-unit uncaged one)',
      function () {
        var m = killer();
        var state = SG.model.initState(m);
        var peerSum = 0;
        for (var c = 0; c < m.cellCount; c++) {
          state.candidates[c] = 3;
          for (var d = 0; d < m.cellCount; d++) if (sees(m, c, d)) peerSum++;
        }
        // every cell holds {1, 2}: one component with odd cycles, no pair of ends is tested
        var out = rpObserved(m, state);
        expect(out.finding).toBeNull();
        expect(out.record).toEqual({ id: 'remotePairs', work: peerSum, limit: 50000, capHit: null, retained: null });
        // 1,638 here (the uncaged model has 1,620): the cages add nine peer edges, no bound comes near 50,000
        expect(peerSum).toBe(1638);
      });
  });

  /**
   * A chain of `count` cells in which only neighbours see each other and whose ends see a common cell: the first
   * one whose first cell is at or after `from` (units only, never model.peers), or null.
   */
  function inducedChain(model, count, from) {
    var n = model.cellCount;
    var path = [];
    function commonPeer(a, b) {
      for (var c = 0; c < n; c++) {
        if (c !== a && c !== b && sees(model, c, a) && sees(model, c, b)) return true;
      }
      return false;
    }
    function extend() {
      if (path.length === count) return commonPeer(path[0], path[count - 1]);
      var last = path[path.length - 1];
      for (var p = 0; p < n; p++) {
        if (p === last || !sees(model, last, p) || path.indexOf(p) !== -1) continue;
        var induced = true;
        for (var k = 0; k < path.length - 1; k++) {
          if (sees(model, p, path[k])) induced = false;
        }
        if (!induced) continue;
        path.push(p);
        if (extend()) return true;
        path.pop();
      }
      return false;
    }
    for (var start = from; start < n; start++) {
      path = [start];
      if (extend()) return path.slice();
    }
    return null;
  }

  describe('remotePairs (R13): real positions', function () {
    var entry = SG.fixtures.techniques.byId.remotePairs;

    // The exact Findings of the two real positive fixtures (core/tests/fixtures/techniques.js).
    var REAL = [
      { cells: ['R5C2', 'R5C3', 'R9C3', 'R9C6'], eliminations: [['R5C6', 4]],
        args: { digits: [4, 6], ends: ['R5C2', 'R9C6'], length: 3 } },
      { cells: ['R2C3', 'R3C1', 'R3C7', 'R7C4', 'R8C3', 'R8C4'], eliminations: [['R7C7', 6], ['R7C7', 7]],
        args: { digits: [6, 7], ends: ['R3C7', 'R7C4'], length: 5 } }
    ];

    function positionOf(fixture) {
      return fixture.after !== null ? H.stateAfter(model9, fixture.puzzle, fixture.after)
        : H.makeState(model9, fixture.puzzle, { propagate: fixture.propagate });
    }

    function transposed(puzzle) {
      var out = [];
      for (var r = 0; r < 9; r++) {
        for (var c = 0; c < 9; c++) out[c * 9 + r] = puzzle.charAt(r * 9 + c);
      }
      return out.join('');
    }

    function transposeCell(cell) {
      return (cell % 9) * 9 + Math.floor(cell / 9);
    }

    it('has two positive and two negative fixtures; the positives are first positions of real puzzles', function () {
      expect(entry.positive).toHaveLength(2);
      expect(entry.negative).toHaveLength(2);
      entry.positive.forEach(function (fixture) { expect(fixture.after).toBeNull(); });
      // nothing left after the technique itself; the position before nakedPair is where a naked pair is reached
      expect(entry.negative[0].after).toContain('remotePairs');
      expect(entry.negative[0].after).toContain('twoStringKite');
      expect(entry.negative[0].after).not.toContain('simpleColouring');
      expect(entry.negative[1].after).not.toContain('nakedPair');
    });

    REAL.forEach(function (want, i) {
      it('finds the exact Finding of real position ' + (i + 1) + ', sound against an independent completion',
        function () {
          var fixture = entry.positive[i];
          var givens = H.parsePuzzle(model9, fixture.puzzle);
          // the puzzle has exactly one solution (plain depth first search, no technique)
          expect(SG.dfs.countSolutions(model9, givens, 2)).toBe(1);
          var solution = SG.dfs.solve(model9, givens);
          var state = positionOf(fixture);
          var finding = check('remotePairs', model9, state, want);
          expect(finding.eliminations.length).toBe(want.eliminations.length);
          finding.eliminations.forEach(function (e) { expect(solution[e[0]]).not.toBe(e[1]); });
          // the ends hold the two digits, one each (the parity argument, read from the solution)
          var ends = finding.i18nArgs.ends.map(function (ref) { return H.cell(model9, ref); });
          expect([solution[ends[0]], solution[ends[1]]].sort()).toEqual(finding.i18nArgs.digits);
          // along the path every cell holds one of the two digits and the cells of a pair see each other
          finding.cells.forEach(function (c) { expect(finding.i18nArgs.digits).toContain(solution[c]); });
          // the position without the eliminated candidates still completes, and only to that solution
          var reduced = SG.model.cloneState(state);
          finding.eliminations.forEach(function (e) {
            expect(SG.constraints.eliminate(model9, reduced, e[0], e[1])).toBe(true);
          });
          var done = SG.dfs.searchFrom(model9, reduced, { limit: 2 });
          expect(done.found).toBe(1);
          expect(Array.from(done.solution)).toEqual(Array.from(solution));
          // no cheaper technique of the registry (through swordfish) is asked first here: it is a first position,
          // where remotePairs is the first pattern of the enumeration, and the cells of the Finding are no targets
          expect(remotePairsOf(model9, state)[0].length).toBe(want.args.length);
          finding.eliminations.forEach(function (e) { expect(finding.cells).not.toContain(e[0]); });
        });

      it('finds the transposed real position ' + (i + 1) + ' with the transposed eliminations', function () {
        var fixture = entry.positive[i];
        var turned = transposed(fixture.puzzle);
        var state = H.makeState(model9, turned, { propagate: fixture.propagate });
        var solution = SG.dfs.solve(model9, H.parsePuzzle(model9, turned));
        var finding = check('remotePairs', model9, state, {});
        expect(H.findingProblems(model9, state, finding, { technique: 'remotePairs', solution: solution })).toEqual([]);
        // the first pattern may differ (the order of cells changes), but the transposed pattern is among the patterns
        var wanted = want.eliminations.map(function (e) {
          return transposeCell(H.cell(model9, e[0])) + ':' + e[1];
        });
        var known = {};
        remotePairsOf(model9, state).forEach(function (pattern) {
          remoteEliminations(state, pattern).forEach(function (e) { known[e[0] + ':' + e[1]] = true; });
        });
        wanted.forEach(function (key) { expect(known[key]).toBe(true); });
        expect(finding.i18nArgs.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('finds nothing at the negative positions: nothing left after it, and a naked pair', function () {
      entry.negative.forEach(function (fixture) {
        var state = positionOf(fixture);
        H.expectNoFinding(SG.test, 'remotePairs', state);
        expect(remotePairsOf(model9, state)).toEqual([]);
      });
      // the second position holds a genuine naked pair, which belongs to nakedPair
      var naked = SG.techniques.get('nakedPair').find(model9, positionOf(entry.negative[1]),
        SG.techniques.createContext(model9, {}));
      expect(naked).not.toBeNull();
    });

    it('the three supplements of the soundness sweep are real unique positions that hold a remote pair', function () {
      var supplements = SG.fixtures.techniques.supplements.remotePairs;
      expect(supplements).toHaveLength(3);
      supplements.forEach(function (fixture) {
        expect(SG.dfs.countSolutions(model9, H.parsePuzzle(model9, fixture.puzzle), 2)).toBe(1);
        var state = positionOf(fixture);
        expect(rpFind(model9, state)).not.toBeNull();
        check('remotePairs', model9, state, {});
      });
    });
  });

  describe('remotePairs (R13): work limit, budget and cancellation', function () {
    // Every cell of a 16 digit board holds {1, 2}: one component of 256 cells where every row, column and box holds
    // sixteen of them, so the colouring finds an odd cycle. A call extends every edge once in each direction (the
    // sum of the peers of all cells) and tests no pair of ends.
    var flood = null;

    function floodState() {
      if (flood === null) {
        var spec = [];
        var work = 0;
        for (var c = 0; c < model16.cellCount; c++) {
          spec.push([c, '12']);
          for (var d = 0; d < model16.cellCount; d++) if (sees(model16, c, d)) work++;
        }
        flood = { state: board(model16, spec), work: work };
      }
      return flood;
    }

    var VECTOR_WORK = 12;

    it('has R10\'s limit of 50000, and the registered finder reports it for every call', function () {
      expect(SG.wingSearch.REMOTE_PAIRS_WORK_LIMIT).toBe(50000);
      var out = rpObserved(model9, pairState(model9, RP_VECTOR));
      expect(out.finding).not.toBeNull();
      expect(out.records).toEqual([{ id: 'remotePairs', work: VECTOR_WORK, limit: 50000, capHit: null, retained: null }]);
    });

    it('counts one unit per edge extension and per tested pair of ends, from a fresh counter on every call',
      function () {
        // the vector: 6 edge extensions to colour the four cells (each edge from both ends), 1 tested pair (A, D) and
        // 5 extensions of the walk that finds the path (A: B; B: A, C; C: B, D)
        expect(rpObserved(model9, pairState(model9, RP_VECTOR)).record.work).toBe(12);
        // without a target the call stops after the tested pair
        var bare = isolate(model9, pairState(model9, RP_VECTOR), '27', RP_VECTOR);
        var none4 = rpObserved(model9, bare);
        expect(none4.finding).toBeNull();
        expect(none4.record).toEqual({ id: 'remotePairs', work: 7, limit: 50000, capHit: null, retained: null });
        // a pair held by fewer than four cells, or four cells of different pairs, cost nothing
        expect(rpObserved(model9, pairState(model9, RP_VECTOR.slice(0, 3))).record.work).toBe(0);
        var mixed = pairState(model9, [0, 10], '14');
        mixed.candidates[13] = maskOf('23');
        mixed.candidates[40] = maskOf('23');
        mixed.candidates[1] = maskOf('14');
        mixed.candidates[20] = maskOf('15');
        expect(rpObserved(model9, mixed).record.work).toBe(0);
        // an empty board and a flood of one pair
        expect(rpObserved(model9, board(model9, [])).record.work).toBe(0);
        var f = floodState();
        var first = rpObserved(model16, f.state);
        expect(first.finding).toBeNull();
        expect(first.record).toEqual({ id: 'remotePairs', work: f.work, limit: 50000, capHit: null, retained: null });
        expect(f.work).toBe(256 * 39);
        var second = rpObserved(model16, f.state);
        expect(second.record).toEqual(first.record);
        expect(second.record).not.toBe(first.record);
      });

    it('ends a call whose limit is spent with nothing found (never a finding), and says so', function () {
      var f = floodState();
      [0, 1, 100, f.work - 1].forEach(function (limit) {
        var out = rpObserved(model16, f.state, { seam: true, limit: limit });
        expect(out.finding).toBeNull();
        expect(out.record).toEqual({ id: 'remotePairs', work: limit, limit: limit, capHit: 'work', retained: null });
      });
      var exact = rpObserved(model16, f.state, { seam: true, limit: f.work });
      expect(exact.record.capHit).toBeNull();
      expect(exact.record.work).toBe(f.work);
      // the default limit of the seam is the registered one
      expect(rpObserved(model16, f.state, { seam: true }).record).toEqual(first(f));
      function first(flooded) {
        return { id: 'remotePairs', work: flooded.work, limit: 50000, capHit: null, retained: null };
      }
    });

    it('is complete or empty: the vector is found with its whole 12 units and lost with 11 (capped prefix)',
      function () {
        var state = pairState(model9, RP_VECTOR);
        var plain = rpObserved(model9, state).finding;
        var kept = rpObserved(model9, state, { seam: true, limit: 12 });
        expect(kept.finding).toEqual(plain);
        expect(kept.record).toEqual({ id: 'remotePairs', work: 12, limit: 12, capHit: null, retained: null });
        [11, 7, 6, 1, 0].forEach(function (limit) {
          var lost = rpObserved(model9, state, { seam: true, limit: limit });
          expect(lost.finding).toBeNull();
          expect(lost.record).toEqual({ id: 'remotePairs', work: limit, limit: limit, capHit: 'work', retained: null });
        });
        // the capped call is repeatable, and the same limit gives the same answer again
        expect(rpObserved(model9, state, { seam: true, limit: 11 }).record).toEqual(
          rpObserved(model9, state, { seam: true, limit: 11 }).record);
        // an inconsistent component is never used, whatever the limit: nothing is found even with a large one
        var ring = cellsOf(model9, ['R1C1', 'R1C5', 'R4C5', 'R4C2', 'R3C2']);
        var odd = isolate(model9, pairState(model9, ring), '27', ring.concat([1]));
        expect(rpObserved(model9, odd, { seam: true, limit: 1000000 }).finding).toBeNull();
      });

    it('floors a fractional limit and rejects an invalid one with solver.invalidOption', function () {
      var state = pairState(model9, RP_VECTOR);
      expect(rpObserved(model9, state, { seam: true, limit: 2.9 }).record.work).toBe(2);
      [-1, NaN, Infinity, '5', null].forEach(function (workLimit) {
        var err = thrownBy(function () { rpObserved(model9, state, { seam: true, limit: workLimit }); });
        expect([String(workLimit), err && err.code]).toEqual([String(workLimit), 'solver.invalidOption']);
      });
      // an absent option object, a null one and an option object without a limit use the registered limit
      expect(SG.wingSearch.remotePairs(model9, state, SG.techniques.createContext(model9, {}))).not.toBeNull();
      expect(SG.wingSearch.remotePairs(model9, state, SG.techniques.createContext(model9, {}), null)).not.toBeNull();
      expect(SG.wingSearch.remotePairs(model9, state, SG.techniques.createContext(model9, {}), {})).not.toBeNull();
    });

    /**
     * The work done at each check of the parent budget: a context whose k-th check throws a spent budget lets the
     * record of the (swallowed) call tell how many units were spent at that check.
     */
    function checkWorks(model, state, limit) {
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
        var finding = SG.wingSearch.remotePairs(model, state, ctx, limit === undefined ? undefined : { workLimit: limit });
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
      var gaps = works.map(function (w, i) { return w - (i === 0 ? 0 : works[i - 1]); });
      gaps.push(free.record.work - works[works.length - 1]);
      return { works: works, max: Math.max.apply(null, gaps), free: free };
    }

    it('checks the parent budget at entry and so that at most 256 units pass between two checks', function () {
      var f = floodState();
      var out = checkWorks(model16, f.state);
      var expected = [];
      for (var w = 0; w < f.work; w += 256) expected.push(w);
      expect(out.works).toEqual(expected);
      expect(out.works.length).toBe(39);
      expect(out.max).toBeLessThanOrEqual(256);
      // a call that ends at its limit keeps the same cadence
      expect(checkWorks(model16, f.state, 1000).works).toEqual([0, 256, 512, 768]);
      // a small call has only the entry check
      expect(checkWorks(model9, pairState(model9, RP_VECTOR)).works).toEqual([0]);
    });

    it('reports a spent budget as nothing found and lets cancellation and other errors through', function () {
      var f = floodState();
      var parent = SG.budget.create({ nodes: 3 });
      var spent = rpObserved(model16, f.state, { ctx: { budget: parent } });
      expect(spent.finding).toBeNull();
      expect(spent.records).toHaveLength(1);
      expect(spent.record.capHit).toBeNull();
      expect(spent.record.work).toBeLessThan(f.work);
      // capHit null is no proof of a complete scan: the caller's budget still fails after the call
      expect(thrownBy(function () { parent.check(); }).code).toBe('budget.exceeded');

      var budget = SG.budget.create({});
      budget.cancel();
      var records = [];
      var err = thrownBy(function () {
        SG.techniques.get('remotePairs').find(model16, f.state, SG.techniques.createContext(model16, {
          budget: budget, onPatternWork: function (r) { records.push(r); } }));
      });
      expect(err.code).toBe('budget.cancelled');
      expect(records).toEqual([]);

      // cancellation in the middle of the scan, and an error that is not a budget error
      [['budget.cancelled', true], ['boom', false]].forEach(function (kind) {
        var k = 0;
        var ctx = Object.assign({}, SG.techniques.createContext(model16, {}), {
          check: function () {
            if (++k === 3) {
              throw kind[1] ? new SG.errors.GenerationError(kind[0], { reason: 'cancelled' }) : new Error(kind[0]);
            }
          }
        });
        var thrown = thrownBy(function () { SG.techniques.get('remotePairs').find(model16, f.state, ctx); });
        expect(thrown).toBeTruthy();
        expect(kind[1] ? thrown.code : thrown.message).toBe(kind[0]);
        expect(k).toBe(3);
      });
    });

    it('is not fooled by a hostile or absent observer', function () {
      var state = pairState(model9, RP_VECTOR);
      var plain = JSON.stringify(rpFind(model9, state));
      ['not a function', null, 7].forEach(function (observer) {
        expect(JSON.stringify(rpFind(model9, state, { onPatternWork: observer }))).toBe(plain);
      });
    });

    it('leaves no mark behind: a call after a capped or budget-spent call answers like a fresh one', function () {
      var state = pairState(model9, RP_VECTOR);
      var fresh = JSON.stringify(rpFind(model9, state));
      var f = floodState();
      rpObserved(model16, f.state, { seam: true, limit: 500 });
      rpObserved(model9, state, { seam: true, limit: 8 });
      rpObserved(model9, state, { ctx: { budget: SG.budget.create({ nodes: 0 }) } });
      expect(JSON.stringify(rpFind(model9, state))).toBe(fresh);
      expect(rpObserved(model9, state).record.work).toBe(VECTOR_WORK);
    });
  });

  describe('remotePairs (R13): agreement with an independent enumeration', function () {
    var cache = {};

    function itemsOf(model, count, seed) {
      var key = model.variantId + '/' + model.digits + '/' + seed;
      if (!cache[key]) cache[key] = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), count);
      return cache[key].slice(0, count);
    }

    /** The finder finds a pattern exactly when the enumeration does, and its Finding is the first one, field by field. */
    function agree(model, state, what) {
      var finding = rpFind(model, state);
      var wanted = remotePairsOf(model, state);
      if ((finding !== null) !== (wanted.length > 0)) {
        fail('remotePairs ' + (finding !== null ? 'reported a pattern that the enumeration does not know' :
          'missed a pattern the enumeration found') + ' on ' + what + '\n  ' + JSON.stringify(finding));
      }
      if (finding === null) return false;
      ORACLE.remotePairs.verify(model, state, finding);
      return true;
    }

    // Real puzzle states, kinds initial, propagated and pruned: a remote pair is rare in them (a few in a hundred),
    // so the sizes are chosen for the minima that follow.
    [['classic9', 1600, 777, 20], ['classic9', 1600, 99, 30], ['classic6', 600, 777, 30],
      ['classic4', 400, 777, 1]].forEach(function (setup) {
      it('finds a remote pair exactly when one exists and removes exactly its candidates on ' + setup[0] +
        ' (seed ' + setup[2] + ')', function () {
        var model = H.model(setup[0]);
        var found = 0;
        itemsOf(model, setup[1], setup[2]).forEach(function (item, index) {
          if (agree(model, item.state, 'state #' + index + ' (' + item.kind + ')')) found++;
        });
        expect(found).toBeGreaterThanOrEqual(setup[3]);
      });
    });

    [12, 16].forEach(function (D) {
      it('agrees on ' + D + ' digits (box shapes of 3 x 4 and 4 x 4, no 9 x 9 arithmetic)', function () {
        var model = D === 12 ? model12 : model16;
        itemsOf(model, D === 12 ? 160 : 12, 2026).forEach(function (item, index) {
          agree(model, item.state, 'state #' + index);
        });
      });
    });

    ['diagonalX', 'hyper', 'jigsaw9'].forEach(function (variant) {
      it('agrees on ' + variant + ' (extra regions or irregular regions are real peers)', function () {
        if (!SG.testkit.hasVariant(variant)) SG.test.skip('no board of ' + variant + ' can be built here');
        var model = H.model(variant);
        itemsOf(model, 400, 4242).forEach(function (item, index) {
          agree(model, item.state, 'state #' + index + ' (' + item.kind + ')');
        });
      });
    });

    // Constructed chains on every board: the lowest induced chains of four and of six cells whose ends see a common
    // cell, every cell holding {1, 2} and every other cell all digits. Each setup must fire, so a finder that never
    // fires on a board shape cannot agree vacuously.
    [['classic9', 'classic9'], ['classic6', 'classic6'], ['12 digits', null], ['16 digits', null],
      ['diagonalX', 'diagonalX'], ['hyper', 'hyper'], ['jigsaw9', 'jigsaw9'], ['samurai', 'samurai'],
      ['sohei', 'sohei'], ['flower', 'flower'], ['butterfly', 'butterfly']].forEach(function (setup) {
      it('agrees on constructed chains on ' + setup[0] + ' (a chain of 4 and of 6 cells, three start cells each)',
        function () {
          var model = setup[1] === null ? (setup[0] === '12 digits' ? model12 : model16) : null;
          if (model === null) {
            if (!SG.testkit.hasVariant(setup[1])) SG.test.skip('no board of ' + setup[1] + ' can be built here');
            model = H.model(setup[1]);
          }
          var seen = {};
          var fired = 0;
          [4, 6].forEach(function (count) {
            [0, Math.floor(model.cellCount / 3), Math.floor(2 * model.cellCount / 3)].forEach(function (from) {
              var chain = inducedChain(model, count, from);
              if (chain === null || seen[chain.join(',')]) return;
              seen[chain.join(',')] = true;
              var state = pairState(model, chain, '12');
              expect(agree(model, state, 'the chain ' + chain.join(','))).toBe(true);
              var f = rpFind(model, state);
              expect(f.cells.every(function (c) { return chain.indexOf(c) !== -1; })).toBe(true);
              expect([3, 5]).toContain(f.i18nArgs.length);
              fired++;
            });
          });
          expect(fired).toBeGreaterThanOrEqual(2);
        });
    });

    it('classic4: a chain of four cells exists on the 4 x 4 board and is found', function () {
      var chain = inducedChain(model4, 4, 0);
      if (chain === null) SG.test.skip('no induced chain of four cells with a common peer on the 4 x 4 board');
      expect(agree(model4, pairState(model4, chain, '12'), 'the 4 x 4 chain')).toBe(true);
    });

    it('agrees with the oracle on every published position', function () {
      Object.keys(PUBLISHED).forEach(function (name) {
        agree(model9, H.makeState(model9, PUBLISHED[name]), 'published ' + name);
      });
    });
  });

  // WXYZ-Wing (R13). The vector: A = R1C1 {1,4}, B = R1C5 {1,2}, C = R1C9 {2,3} and D = R5C9 {3,4}. The digit 1 is held by
  // A and B (row 1), the 2 by B and C (row 1), the 3 by C and D (column 9): each pair sees itself, so they are
  // restricted. The 4 is held by A and D, which do not see each other: z = 4. R5C1 sees A (column 1) and D (row 5) and
  // loses the 4; R1C9 also sees both but is C, which holds no 4.
  var WX_VECTOR = [0, 4, 8, 44];
  var WX_MASKS = ['14', '12', '23', '34'];

  /** A blank board where the cells hold the masks (the vector's by default); every other cell has all digits. */
  function wxState(model, cells, masks) {
    return board(model, cells.map(function (c, i) { return [c, (masks || WX_MASKS)[i]]; }));
  }

  function wxFind(model, state, ctxOptions) {
    return SG.techniques.get('wxyzWing').find(model, state, SG.techniques.createContext(model, ctxOptions || {}));
  }

  /** One call of the registered finder or of the seam (`seam`, and a `limit` given or not) with its observer. */
  function wxObserved(model, state, opts) {
    var records = [];
    var options = opts || {};
    var ctx = SG.techniques.createContext(model, Object.assign({
      onPatternWork: function (r) { records.push(r); }
    }, options.ctx));
    var finding = options.seam
      ? SG.wingSearch.wxyzWing(model, state, ctx, options.limit === undefined ? undefined : { workLimit: options.limit })
      : SG.techniques.get('wxyzWing').find(model, state, ctx);
    return { finding: finding, records: records, record: records[0] };
  }

  /** Every cell holds {1, 2, 3, 4}: no quartet is a WXYZ-Wing (a unit's four cells have no non-restricted digit). */
  function wxFlood(model) {
    var state = SG.model.initState(model);
    for (var c = 0; c < model.cellCount; c++) state.candidates[c] = 15;
    return state;
  }

  /** The cell at a layout row and column of a multi-grid board. */
  function byLayout(model, row, col) {
    for (var c = 0; c < model.cellCount; c++) {
      if (model.layout.cellRow[c] === row && model.layout.cellCol[c] === col) return c;
    }
    throw new Error('no cell at layout row ' + row + ' column ' + col);
  }

  /** Marks a cell as solved (the state is no longer peer consistent, which find() must tolerate). */
  function solveCell(state, cell, digit) {
    state.value[cell] = digit;
    state.candidates[cell] = bit(digit);
    state.unsolvedCount--;
  }

  describe('wxyzWing (R13): geometry', function () {
    it('the vector: R5C1 sees both cells that hold the unrestricted 4 and loses it; the digits and cells are listed',
      function () {
        var state = wxState(model9, WX_VECTOR);
        var f = check('wxyzWing', model9, state, {
          cells: ['R1C1', 'R1C5', 'R1C9', 'R5C9'],
          eliminations: [['R5C1', 4]],
          args: { digits: [1, 2, 3, 4], digit: 4, cells: ['R1C1', 'R1C5', 'R1C9', 'R5C9'] }
        });
        expect(f.cells).toEqual([0, 4, 8, 44]);
        expect(f.eliminations).toEqual([[36, 4]]);
        expect(f.placements).toEqual([]);
        expect(f.i18nKey).toBe('technique.wxyzWing.step');
        expect(Object.keys(f.i18nArgs)).toEqual(['digits', 'digit', 'cells']);
        expect(JSON.parse(JSON.stringify(f.i18nArgs))).toEqual(f.i18nArgs);
        // the other cell that sees A and D is C, which has no 4 to lose; no cell of the quartet is touched
        expect(victims(model9, state, [0, 44], 4)).toEqual([36]);
        f.eliminations.forEach(function (e) { expect(f.cells).not.toContain(e[0]); });
      });

    it('a target loses only z, and only if it still has it', function () {
      var state = wxState(model9, WX_VECTOR);
      dropDigit(state, 4, [36]);
      checkNone('wxyzWing', model9, state);
      expect(state.candidates[36] & bit(5)).not.toBe(0);
    });

    it('the transposed vector: the quartet in ascending cell order, the target R1C5', function () {
      var cells = [at(model9, 0, 0), at(model9, 4, 0), at(model9, 8, 0), at(model9, 8, 4)];
      var f = check('wxyzWing', model9, wxState(model9, cells), {
        eliminations: [['R1C5', 4]],
        args: { digits: [1, 2, 3, 4], digit: 4, cells: ['R1C1', 'R5C1', 'R9C1', 'R9C5'] }
      });
      expect(f.cells).toEqual([0, 36, 72, 76]);
    });

    it('works with any four digits: the digits are listed ascending, z is the one that is not restricted', function () {
      var f = check('wxyzWing', model9, wxState(model9, WX_VECTOR, ['29', '25', '57', '79']), {
        eliminations: [['R5C1', 9]],
        args: { digits: [2, 5, 7, 9], digit: 9, cells: ['R1C1', 'R1C5', 'R1C9', 'R5C9'] }
      });
      expect(f.eliminations).toEqual([[36, 9]]);
      // z need not be the highest: here the 2 is the only digit held by cells that do not see each other
      var g = check('wxyzWing', model9, wxState(model9, WX_VECTOR, ['12', '13', '34', '24']), {
        eliminations: [['R5C1', 2]],
        args: { digits: [1, 2, 3, 4], digit: 2 }
      });
      expect(g.eliminations).toEqual([[36, 2]]);
    });

    it('two non-restricted digits prove nothing: with a 1 added to D, the 1 (A and D) joins the 4', function () {
      var state = wxState(model9, WX_VECTOR, ['14', '12', '23', '134']);
      expect(sees(model9, 0, 44)).toBe(false);
      checkNone('wxyzWing', model9, state);
    });

    it('no non-restricted digit proves nothing: four cells of one row are a naked quad, not a WXYZ-Wing', function () {
      var state = wxState(model9, [0, 1, 2, 3], ['12', '23', '34', '14']);
      checkNone('wxyzWing', model9, state);
      // the neighbour owns it: nakedQuad removes the four digits from the rest of the row
      expect(SG.techniques.get('nakedQuad').find(model9, state, SG.techniques.createContext(model9, {}))).not.toBeNull();
    });

    it('the union must be four digits: five digits, and three digits (an XY-Wing, which is its own technique)',
      function () {
        checkNone('wxyzWing', model9, wxState(model9, WX_VECTOR, ['14', '125', '23', '34']));
        // R1C1 {1,2} sees R1C5 {1,3} and R5C1 {2,3}, which do not see each other: an XY-Wing that removes the 3 from R5C5;
        // a fourth cell of the same digits leaves the union at three
        var state = wxState(model9, [0, 4, 36, 80], ['12', '13', '23', '12']);
        H.expectFinding(SG.test, 'xyWing', state, { eliminations: [['R5C5', 3]] }, { model: model9 });
        checkNone('wxyzWing', model9, state);
        // and an XYZ-Wing alone has three cells: nothing to enumerate
        var xyz = wxState(model9, [0, 1, 9], ['123', '13', '23']);
        checkNone('wxyzWing', model9, xyz);
      });

    it('a z occurrence that the target misses proves nothing: with a 4 added to B, R5C1 no longer sees all of them',
      function () {
        var state = wxState(model9, WX_VECTOR, ['14', '124', '23', '34']);
        // the 4 is held by A, B and D; R5C1 sees A and D but not B
        expect(sees(model9, 36, 0) && sees(model9, 36, 44) && !sees(model9, 36, 4)).toBe(true);
        expect(wxyzOf(model9, state, true)).toEqual([]);
        checkNone('wxyzWing', model9, state);
      });

    // A = R1C1 {1,4}, B = R2C2 {2,4}, C = R1C9 {3,4} hold the 4 (A sees B and C, B and C do not see each other); Y = R3C3
    // {1,2} links A (the 1) and B (the 2) and the 3 is held once. R1C2 sees all three and R1C3 too (box 1 holds R2C2);
    // R1C5 sees A and C only and keeps the 4. Only z is not restricted: the 3, held by one cell, is restricted too.
    var THREE = { cells: [0, 10, 8, 20], masks: ['14', '24', '34', '12'] };

    it('every z cell counts: R1C2 and R1C3 see all three, R1C5 sees two and keeps the 4; a digit held once is ' +
      'restricted', function () {
        var state = wxState(model9, THREE.cells, THREE.masks);
        var f = check('wxyzWing', model9, state, {
          cells: ['R1C1', 'R1C9', 'R2C2', 'R3C3'],
          eliminations: [['R1C2', 4], ['R1C3', 4]],
          args: { digits: [1, 2, 3, 4], digit: 4, cells: ['R1C1', 'R1C9', 'R2C2', 'R3C3'] }
        });
        expect(f.cells).toEqual([0, 8, 10, 20]);
        expect(f.eliminations).toEqual([[1, 4], [2, 4]]);
        expect(f.i18nArgs.cells).toEqual(['R1C1', 'R1C9', 'R2C2', 'R3C3']);
        expect(sees(model9, 4, 0) && sees(model9, 4, 8) && !sees(model9, 4, 10)).toBe(true);
        expect(f.eliminations.map(function (e) { return e[0]; })).not.toContain(4);
        // the digit held once (the 3 of C) is no restriction, and the 4 is the only digit of two cells that do not
        // see each other
        expect(sees(model9, 10, 8)).toBe(false);
      });

    it('a quartet cell that sees every z cell has no z to lose, and is no target', function () {
      var state = wxState(model9, [0, 10, 8, 2], ['14', '24', '34', '12']);
      var f = check('wxyzWing', model9, state, {
        eliminations: [['R1C2', 4]],
        args: { digits: [1, 2, 3, 4], digit: 4 }
      });
      expect(f.cells).toEqual([0, 2, 8, 10]);
      expect(sees(model9, 2, 0) && sees(model9, 2, 8) && sees(model9, 2, 10)).toBe(true);
      expect(has(state, 2, 4)).toBe(false);
    });

    it('a quartet cell never is a target even when it holds z and sees every other z cell: it does not see itself',
      function () {
        // R1C1 holds the 4 and sees the other two z cells R2C2 (box 1) and R1C9 (row 1)
        var state = wxState(model9, THREE.cells, THREE.masks);
        expect(sees(model9, 0, 10) && sees(model9, 0, 8)).toBe(true);
        var f = wxFind(model9, state);
        expect(f.eliminations.map(function (e) { return e[0]; })).not.toContain(0);
        expect(f.eliminations.map(function (e) { return e[0]; })).not.toContain(8);
        expect(f.eliminations.map(function (e) { return e[0]; })).not.toContain(10);
      });

    it('solved cells take no part: a solved target, and a solved cell of the quartet', function () {
      [4, 5].forEach(function (digit) {
        // the solved cell holds the digit z itself (a placed 4) or another one: either way it loses nothing
        var targetSolved = wxState(model9, WX_VECTOR);
        solveCell(targetSolved, 36, digit);
        none('wxyzWing', model9, targetSolved);
      });
      var cellSolved = wxState(model9, WX_VECTOR);
      solveCell(cellSolved, 44, 4);
      none('wxyzWing', model9, cellSolved);
      // a state of three open cells and a solved one has no quartet
      expect(wxObserved(model9, cellSolved).record.work).toBe(0);
    });

    it('a naked single is an open cell like any other: here D holds only the 4, the quartet is still valid (R13 ' +
      'says four open cells)', function () {
        var state = wxState(model9, WX_VECTOR, ['14', '12', '23', '4']);
        var f = check('wxyzWing', model9, state, {
          eliminations: [['R5C1', 4]],
          args: { digits: [1, 2, 3, 4], digit: 4, cells: ['R1C1', 'R1C5', 'R1C9', 'R5C9'] }
        });
        expect(f.cells).toEqual([0, 4, 8, 44]);
      });

    it('the first quartet in ascending cell order wins, with all its targets; the other is found when it is alone',
      function () {
        // a second WXYZ-Wing on the digits 5 to 8: R7C1 {5,8}, R7C5 {5,6}, R7C9 {6,7}, R3C9 {7,8}, target R3C1
        var second = [at(model9, 6, 0), at(model9, 6, 4), at(model9, 6, 8), at(model9, 2, 8)];
        var secondMasks = ['58', '56', '67', '78'];
        var both = wxState(model9, WX_VECTOR.concat(second), WX_MASKS.concat(secondMasks));
        var f = check('wxyzWing', model9, both, { eliminations: [['R5C1', 4]] });
        expect(f.cells).toEqual([0, 4, 8, 44]);
        expect(wxyzOf(model9, both).map(function (p) { return p.cells.join(','); }))
          .toEqual(['0,4,8,44', '26,54,58,62']);
        var alone = wxState(model9, second, secondMasks);
        var g = check('wxyzWing', model9, alone, {
          eliminations: [['R3C1', 8]],
          args: { digits: [5, 6, 7, 8], digit: 8, cells: ['R3C9', 'R7C1', 'R7C5', 'R7C9'] }
        });
        expect(g.cells).toEqual([26, 54, 58, 62]);
      });

    it('the answer is the same after another call, the state is not written, and a Finding\'s arrays are the ' +
      'call\'s own', function () {
        var state = wxState(model9, WX_VECTOR);
        var snapshot = SG.model.cloneState(state);
        var a = wxFind(model9, state);
        a.cells.push(99);
        a.eliminations.push([1, 1]);
        a.i18nArgs.digits.push(9);
        a.i18nArgs.cells.push('x');
        var b = wxFind(model9, state);
        expect(b.cells).toEqual([0, 4, 8, 44]);
        expect(b.eliminations).toEqual([[36, 4]]);
        expect(b.i18nArgs).toEqual({ digits: [1, 2, 3, 4], digit: 4, cells: ['R1C1', 'R1C5', 'R1C9', 'R5C9'] });
        expect(state.candidates).toEqual(snapshot.candidates);
        expect(state.value).toEqual(snapshot.value);
        expect(state.unsolvedCount).toBe(snapshot.unsolvedCount);
      });

    it('a cell of five candidates or more is never part of a quartet', function () {
      var five = wxState(model9, WX_VECTOR, ['14', '12', '23', '34']);
      five.candidates[0] = maskOf('14567');
      checkNone('wxyzWing', model9, five);
      // the same cell with the digits of the quartet only is the vector again
      expect(wxFind(model9, wxState(model9, WX_VECTOR))).not.toBeNull();
    });
  });

  describe('wxyzWing (R13): actual peers on other unit shapes', function () {
    function variantModel(id) {
      if (!SG.testkit.hasVariant(id)) SG.test.skip('no board of ' + id + ' can be built here');
      return H.model(id);
    }

    // A cage is a partial all-different unit: cage-mates are real peers, also when they share no complete row, column or
    // box. C = R1C9 and D' = R5C8 share no unit, so the 3 of the vector's C and D is restricted only through the cage.
    it('a cage-only edge counts as a peer: the 3 is restricted through the cage, and the uncaged board finds nothing',
      function () {
        var cells = [0, 4, 8, 43];
        var caged = rebuild(model9, 'killer', {
          units: [{ cells: [8, 43], meta: { kind: 'cage', gridIndex: 0, label: 'K1', partial: true } }],
          cages: [{ cells: [8, 43], sum: 9, distinct: true }]
        });
        expect(sees(caged, 8, 43)).toBe(true);
        expect(Array.prototype.indexOf.call(caged.peers[8], 43)).not.toBe(-1);
        expect(sees(model9, 8, 43)).toBe(false);
        var f = check('wxyzWing', caged, wxState(caged, cells), {
          eliminations: [['R1C8', 4], ['R5C1', 4]],
          args: { digits: [1, 2, 3, 4], digit: 4, cells: ['R1C1', 'R1C5', 'R1C9', 'R5C8'] }
        });
        expect(f.cells).toEqual([0, 4, 8, 43]);
        expect(f.eliminations).toEqual([[7, 4], [36, 4]]);
        // without the cage the 3 and the 4 are both unrestricted: two non-restricted digits
        checkNone('wxyzWing', model9, wxState(model9, cells));
      });

    it('diagonalX: a restricted digit seen only along the diagonal; classic9 has no such edge', function () {
      var diag = variantModel('diagonalX');
      // R1C1 and R5C5 are on the main diagonal and share no row, column or box
      expect(sees(diag, 0, 40)).toBe(true);
      expect(sees(model9, 0, 40)).toBe(false);
      // A = R1C1 {1,4}, B = R5C5 {1,2} (the 1 through the diagonal), C = R5C9 {2,3} (row 5), D = R2C9 {3,4} (column 9)
      var cells = [0, 40, 44, 17];
      var state = wxState(diag, cells);
      var f = check('wxyzWing', diag, state, {
        args: { digits: [1, 2, 3, 4], digit: 4, cells: ['R1C1', 'R2C9', 'R5C5', 'R5C9'] }
      });
      expect(f.eliminations.length).toBeGreaterThan(0);
      checkNone('wxyzWing', model9, wxState(model9, cells));
    });

    it('samurai: two cells that share a layout row but no unit are not peers, so the digit between them is not ' +
      'restricted', function () {
        var samurai = variantModel('samurai');
        // A = G1-R1C1 and B = G2-R1C1 lie in layout row 1; T = G1-R4C1 and D = G2-R4C2 in layout row 4. Were the layout
        // rows units, A-B-C-D (B-C and C-D are real peers) would be a vector with the target T
        var A = byLayout(samurai, 0, 0);
        var B = byLayout(samurai, 0, 12);
        var C = byLayout(samurai, 1, 13);
        var D = byLayout(samurai, 3, 13);
        var T = byLayout(samurai, 3, 0);
        expect(samurai.layout.cellRow[A]).toBe(samurai.layout.cellRow[B]);
        expect(samurai.layout.cellRow[T]).toBe(samurai.layout.cellRow[D]);
        expect(sees(samurai, A, B)).toBe(false);
        expect(sees(samurai, T, D)).toBe(false);
        expect(sees(samurai, B, C) && sees(samurai, C, D) && sees(samurai, T, A)).toBe(true);
        var state = wxState(samurai, [A, B, C, D]);
        checkNone('wxyzWing', samurai, state);
        expect(has(state, T, 4)).toBe(true);
      });

    // Constructed vectors on every board: the lowest induced chain of four cells whose ends see a common cell (only
    // neighbours see each other), holding the masks of the vector. Each setup must fire, so a finder that never
    // fires on a board shape cannot agree vacuously.
    [['classic9', 'classic9'], ['classic6', 'classic6'], ['12 digits', null], ['16 digits', null],
      ['diagonalX', 'diagonalX'], ['hyper', 'hyper'], ['jigsaw9', 'jigsaw9'], ['samurai', 'samurai'],
      ['sohei', 'sohei'], ['flower', 'flower'], ['butterfly', 'butterfly']].forEach(function (setup) {
      it('finds the constructed vector on ' + setup[0] + ' (three start cells), as the enumeration does', function () {
        var model = setup[1] === null ? (setup[0] === '12 digits' ? model12 : model16) : null;
        if (model === null) {
          if (!SG.testkit.hasVariant(setup[1])) SG.test.skip('no board of ' + setup[1] + ' can be built here');
          model = H.model(setup[1]);
        }
        var seen = {};
        var fired = 0;
        [0, Math.floor(model.cellCount / 3), Math.floor(2 * model.cellCount / 3)].forEach(function (from) {
          var chain = inducedChain(model, 4, from);
          if (chain === null || seen[chain.join(',')]) return;
          seen[chain.join(',')] = true;
          var state = wxState(model, chain);
          var out = wxObserved(model, state, { seam: true, limit: 100000000 });
          expect(out.record.capHit).toBeNull();
          var f = check('wxyzWing', model, state, {});
          expect(out.finding).toEqual(f);
          expect(f.cells).toEqual(chain.slice().sort(byNumber));
          expect(f.i18nArgs.digit).toBe(4);
          fired++;
        });
        expect(fired).toBeGreaterThanOrEqual(2);
      });
    });

    it('classic4: every cell holds four digits already, so the enumeration decides which quartet is the first',
      function () {
        var chain = inducedChain(model4, 4, 0);
        if (chain === null) SG.test.skip('no induced chain of four cells with a common peer on the 4 x 4 board');
        var state = wxState(model4, chain);
        var found = wxFind(model4, state) !== null;
        expect(found).toBe(ORACLE.wxyzWing.exists(model4, state));
        if (found) ORACLE.wxyzWing.verify(model4, state, wxFind(model4, state));
      });
  });

  describe('wxyzWing (R13): real positions', function () {
    var entry = SG.fixtures.techniques.byId.wxyzWing;

    // The exact Findings of the two real positive fixtures (core/tests/fixtures/techniques.js).
    var REAL = [
      { cells: ['R1C2', 'R1C3', 'R1C9', 'R2C8'], eliminations: [['R2C1', 4], ['R2C2', 4]],
        args: { digits: [3, 4, 7, 9], digit: 4, cells: ['R1C2', 'R1C3', 'R1C9', 'R2C8'] } },
      { cells: ['R2C7', 'R6C7', 'R8C7', 'R8C9'], eliminations: [['R9C7', 4]],
        args: { digits: [1, 4, 7, 9], digit: 4, cells: ['R2C7', 'R6C7', 'R8C7', 'R8C9'] } }
    ];

    function positionOf(fixture) {
      return fixture.after !== null ? H.stateAfter(model9, fixture.puzzle, fixture.after)
        : H.makeState(model9, fixture.puzzle, { propagate: fixture.propagate });
    }

    it('has two positive and two negative fixtures; the positives are the positions where the registry reaches it',
      function () {
        expect(entry.positive).toHaveLength(2);
        expect(entry.negative).toHaveLength(2);
        var below = SG.fixtures.techniques.registryOrder.slice(0, SG.fixtures.techniques.registryOrder.indexOf('wxyzWing'));
        entry.positive.forEach(function (fixture) { expect(fixture.after.slice().sort()).toEqual(below.slice().sort()); });
        // nothing left after the technique itself; the neighbour's boundary is the position before nakedQuad
        expect(entry.negative[0].after).toContain('wxyzWing');
        expect(entry.negative[0].after).toContain('xyzWing');
        expect(entry.negative[1].after).not.toContain('nakedQuad');
      });

    REAL.forEach(function (want, i) {
      it('finds the exact Finding of real position ' + (i + 1) + ', sound against an independent completion',
        function () {
          var fixture = entry.positive[i];
          var givens = H.parsePuzzle(model9, fixture.puzzle);
          // the puzzle has exactly one solution (plain depth first search, no technique)
          expect(SG.dfs.countSolutions(model9, givens, 2)).toBe(1);
          var solution = SG.dfs.solve(model9, givens);
          var state = positionOf(fixture);
          var finding = check('wxyzWing', model9, state, want);
          expect(finding.eliminations.length).toBe(want.eliminations.length);
          finding.eliminations.forEach(function (e) { expect(solution[e[0]]).not.toBe(e[1]); });
          // the proof, read from the solution: the restricted digits occur at most once among the four cells, so z
          // is held by one of them
          var z = finding.i18nArgs.digit;
          var values = finding.cells.map(function (c) { return solution[c]; });
          expect(finding.cells.some(function (c) { return has(state, c, z) && solution[c] === z; })).toBe(true);
          finding.i18nArgs.digits.filter(function (d) { return d !== z; }).forEach(function (d) {
            expect(values.filter(function (v) { return v === d; }).length).toBeLessThanOrEqual(1);
          });
          // the position without the eliminated candidates still completes, and only to that solution
          var reduced = SG.model.cloneState(state);
          finding.eliminations.forEach(function (e) {
            expect(SG.constraints.eliminate(model9, reduced, e[0], e[1])).toBe(true);
          });
          var done = SG.dfs.searchFrom(model9, reduced, { limit: 2 });
          expect(done.found).toBe(1);
          expect(Array.from(done.solution)).toEqual(Array.from(solution));
          // no cheaper technique of the registry finds anything here: wxyzWing is the first one reached
          SG.techniques.list().filter(function (t) { return t.variantScope === null && t.order < 155; })
            .forEach(function (t) {
              expect([t.id, t.find(model9, state, SG.techniques.createContext(model9, { assumeUniqueness: true })) === null])
                .toEqual([t.id, true]);
            });
        });
    });

    it('finds nothing at the negative positions: nothing left after it, and a naked quad', function () {
      entry.negative.forEach(function (fixture) {
        var state = positionOf(fixture);
        H.expectNoFinding(SG.test, 'wxyzWing', state);
        expect(wxyzOf(model9, state)).toEqual([]);
      });
      // the second position holds a genuine naked quad, which belongs to nakedQuad
      var quad = SG.techniques.get('nakedQuad').find(model9, positionOf(entry.negative[1]),
        SG.techniques.createContext(model9, {}));
      expect(quad).not.toBeNull();
      expect(positionOf(entry.negative[0]).unsolvedCount).toBeGreaterThan(0);
    });

    it('the three supplements of the soundness sweep are real unique positions that hold a WXYZ-Wing', function () {
      var supplements = SG.fixtures.techniques.supplements.wxyzWing;
      expect(supplements).toHaveLength(3);
      supplements.forEach(function (fixture) {
        expect(SG.dfs.countSolutions(model9, H.parsePuzzle(model9, fixture.puzzle), 2)).toBe(1);
        var state = positionOf(fixture);
        expect(wxFind(model9, state)).not.toBeNull();
        check('wxyzWing', model9, state, {});
      });
    });
  });

  describe('wxyzWing (R13): work limit, budget and cancellation', function () {
    // Every cell of the 4 x 4 board holds {1, 2, 3, 4}: a quartet inside a unit has four restricted digits, any other
    // has two or more unrestricted ones, so nothing is found and the whole enumeration is spent. The same on a 9 x 9
    // board spends more than the limit.
    var FLOOD4_UNITS = 583;

    it('has R10\'s limit of 50000, and the registered finder reports it for every call', function () {
      expect(SG.wingSearch.WXYZ_WORK_LIMIT).toBe(50000);
      var out = wxObserved(model9, wxState(model9, WX_VECTOR));
      expect(out.finding).not.toBeNull();
      expect(out.records).toEqual([{ id: 'wxyzWing', work: 4, limit: 50000, capHit: null, retained: null }]);
    });

    it('counts one unit per cell tested as the next member of a partial quartet, from a fresh counter', function () {
      // the vector: four pool cells, one test each; without a target the same four tests; fewer than four cells none
      expect(wxObserved(model9, wxState(model9, WX_VECTOR)).record.work).toBe(4);
      var bare = wxState(model9, WX_VECTOR);
      dropDigit(bare, 4, [36]);
      var none4 = wxObserved(model9, bare);
      expect(none4.finding).toBeNull();
      expect(none4.record).toEqual({ id: 'wxyzWing', work: 4, limit: 50000, capHit: null, retained: null });
      expect(wxObserved(model9, wxState(model9, WX_VECTOR.slice(0, 3))).record.work).toBe(0);
      expect(wxObserved(model9, board(model9, [])).record.work).toBe(0);
      // a flood: the exact count, pinned and recounted from the rule of the header
      var flood = wxFlood(model4);
      var first = wxObserved(model4, flood);
      expect(first.finding).toBeNull();
      expect(first.record).toEqual({ id: 'wxyzWing', work: FLOOD4_UNITS, limit: 50000, capHit: null, retained: null });
      expect(wxyzUnits(model4, flood)).toBe(FLOOD4_UNITS);
      var second = wxObserved(model4, flood);
      expect(second.record).toEqual(first.record);
      expect(second.record).not.toBe(first.record);
    });

    it('is counted as the rule says on real states: every call of 60 states agrees with the recount', function () {
      var items = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(777), 60);
      var most = 0;
      items.forEach(function (item, index) {
        var out = wxObserved(model9, item.state);
        expect(out.record.capHit).toBeNull();
        if (out.record.work !== wxyzUnits(model9, item.state)) {
          fail('state #' + index + ': ' + out.record.work + ' units counted, ' + wxyzUnits(model9, item.state) + ' by the rule');
        }
        most = Math.max(most, out.record.work);
      });
      expect(most).toBeGreaterThan(100);
    });

    it('ends a call whose limit is spent with nothing found (never a finding), and says so', function () {
      var flood = wxFlood(model4);
      [0, 1, 100, FLOOD4_UNITS - 1].forEach(function (limit) {
        var out = wxObserved(model4, flood, { seam: true, limit: limit });
        expect(out.finding).toBeNull();
        expect(out.record).toEqual({ id: 'wxyzWing', work: limit, limit: limit, capHit: 'work', retained: null });
      });
      var exact = wxObserved(model4, flood, { seam: true, limit: FLOOD4_UNITS });
      expect(exact.record.capHit).toBeNull();
      expect(exact.record.work).toBe(FLOOD4_UNITS);
      // the default limit of the seam is the registered one, which a 9 x 9 flood spends
      var flood9 = wxFlood(model9);
      var spent = wxObserved(model9, flood9, { seam: true });
      expect(spent.finding).toBeNull();
      expect(spent.record).toEqual({ id: 'wxyzWing', work: 50000, limit: 50000, capHit: 'work', retained: null });
      expect(wxObserved(model9, flood9).record).toEqual(spent.record);
    });

    it('is complete or empty: the vector is found with its whole 4 units and lost with 3 (capped prefix)',
      function () {
        var state = wxState(model9, WX_VECTOR);
        var plain = wxObserved(model9, state).finding;
        var kept = wxObserved(model9, state, { seam: true, limit: 4 });
        expect(kept.finding).toEqual(plain);
        expect(kept.record).toEqual({ id: 'wxyzWing', work: 4, limit: 4, capHit: null, retained: null });
        [3, 2, 1, 0].forEach(function (limit) {
          var lost = wxObserved(model9, state, { seam: true, limit: limit });
          expect(lost.finding).toBeNull();
          expect(lost.record).toEqual({ id: 'wxyzWing', work: limit, limit: limit, capHit: 'work', retained: null });
        });
        // the capped call is repeatable
        expect(wxObserved(model9, state, { seam: true, limit: 3 }).record).toEqual(
          wxObserved(model9, state, { seam: true, limit: 3 }).record);
      });

    it('floors a fractional limit and rejects an invalid one with solver.invalidOption', function () {
      var state = wxState(model9, WX_VECTOR);
      expect(wxObserved(model9, state, { seam: true, limit: 2.9 }).record.work).toBe(2);
      [-1, NaN, Infinity, '5', null].forEach(function (workLimit) {
        var err = thrownBy(function () { wxObserved(model9, state, { seam: true, limit: workLimit }); });
        expect([String(workLimit), err && err.code]).toEqual([String(workLimit), 'solver.invalidOption']);
        expect(err.message).toContain('wingSearch.wxyzWing workLimit');
      });
      // an absent option object, a null one and an option object without a limit use the registered limit
      var ctx = SG.techniques.createContext(model9, {});
      expect(SG.wingSearch.wxyzWing(model9, state, ctx)).not.toBeNull();
      expect(SG.wingSearch.wxyzWing(model9, state, ctx, null)).not.toBeNull();
      expect(SG.wingSearch.wxyzWing(model9, state, ctx, {})).not.toBeNull();
    });

    /**
     * The work done at each check of the parent budget: a context whose k-th check throws a spent budget lets the
     * record of the (swallowed) call tell how many units were spent at that check.
     */
    function checkWorks(model, state, limit) {
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
        var finding = SG.wingSearch.wxyzWing(model, state, ctx, limit === undefined ? undefined : { workLimit: limit });
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
      var gaps = works.map(function (w, i) { return w - (i === 0 ? 0 : works[i - 1]); });
      gaps.push(free.record.work - works[works.length - 1]);
      return { works: works, max: Math.max.apply(null, gaps), free: free };
    }

    it('checks the parent budget at entry and so that at most 256 units pass between two checks', function () {
      var out = checkWorks(model4, wxFlood(model4));
      expect(out.works).toEqual([0, 256, 512]);
      expect(out.max).toBeLessThanOrEqual(256);
      // a call that ends at its limit keeps the same cadence
      expect(checkWorks(model9, wxFlood(model9), 1000).works).toEqual([0, 256, 512, 768]);
      // a small call has only the entry check
      expect(checkWorks(model9, wxState(model9, WX_VECTOR)).works).toEqual([0]);
    });

    it('reports a spent budget as nothing found and lets cancellation and other errors through', function () {
      var flood = wxFlood(model9);
      var parent = SG.budget.create({ nodes: 3 });
      var spent = wxObserved(model9, flood, { ctx: { budget: parent } });
      expect(spent.finding).toBeNull();
      expect(spent.records).toHaveLength(1);
      expect(spent.record.capHit).toBeNull();
      expect(spent.record.work).toBeLessThan(50000);
      // capHit null is no proof of a complete scan: the caller's budget still fails after the call
      expect(thrownBy(function () { parent.check(); }).code).toBe('budget.exceeded');

      var budget = SG.budget.create({});
      budget.cancel();
      var records = [];
      var err = thrownBy(function () {
        SG.techniques.get('wxyzWing').find(model9, flood, SG.techniques.createContext(model9, {
          budget: budget, onPatternWork: function (r) { records.push(r); } }));
      });
      expect(err.code).toBe('budget.cancelled');
      expect(records).toEqual([]);

      // cancellation in the middle of the scan, and an error that is not a budget error
      [['budget.cancelled', true], ['boom', false]].forEach(function (kind) {
        var k = 0;
        var ctx = Object.assign({}, SG.techniques.createContext(model9, {}), {
          check: function () {
            if (++k === 3) {
              throw kind[1] ? new SG.errors.GenerationError(kind[0], { reason: 'cancelled' }) : new Error(kind[0]);
            }
          }
        });
        var thrown = thrownBy(function () { SG.techniques.get('wxyzWing').find(model9, flood, ctx); });
        expect(thrown).toBeTruthy();
        expect(kind[1] ? thrown.code : thrown.message).toBe(kind[0]);
        expect(k).toBe(3);
      });
    });

    it('is not fooled by a hostile or absent observer', function () {
      var state = wxState(model9, WX_VECTOR);
      var plain = JSON.stringify(wxFind(model9, state));
      ['not a function', null, 7].forEach(function (observer) {
        expect(JSON.stringify(wxFind(model9, state, { onPatternWork: observer }))).toBe(plain);
      });
    });

    it('leaves no mark behind: a call after a capped or budget-spent call answers like a fresh one', function () {
      var state = wxState(model9, WX_VECTOR);
      var fresh = JSON.stringify(wxFind(model9, state));
      var flood = wxFlood(model9);
      wxObserved(model9, flood, { seam: true, limit: 500 });
      wxObserved(model9, state, { seam: true, limit: 3 });
      wxObserved(model9, state, { ctx: { budget: SG.budget.create({ nodes: 0 }) } });
      expect(JSON.stringify(wxFind(model9, state))).toBe(fresh);
      expect(wxObserved(model9, state).record.work).toBe(4);
    });
  });

  describe('wxyzWing (R13): agreement with an independent enumeration', function () {
    var cache = {};

    function itemsOf(model, count, seed) {
      var key = model.variantId + '/' + model.digits + '/' + seed;
      if (!cache[key]) cache[key] = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), count);
      return cache[key].slice(0, count);
    }

    /**
     * The finder finds a pattern exactly when the enumeration does, and its Finding is the first one, field by field.
     * With `unbounded` the call goes through the seam with a limit that no call reaches (the multi-grid boards may
     * spend the registered one, which is a lost deduction, not a disagreement); otherwise a spent limit is a failure.
     */
    function agree(model, state, what, unbounded) {
      var out = wxObserved(model, state, unbounded ? { seam: true, limit: 100000000 } : {});
      if (out.record.capHit !== null) fail('wxyzWing spent its limit on ' + what);
      var wanted = wxyzOf(model, state, true);
      if ((out.finding !== null) !== (wanted.length > 0)) {
        fail('wxyzWing ' + (out.finding !== null ? 'reported a pattern that the enumeration does not know' :
          'missed a pattern the enumeration found') + ' on ' + what + '\n  ' + JSON.stringify(out.finding));
      }
      if (out.finding === null) return false;
      ORACLE.wxyzWing.verify(model, state, out.finding);
      return true;
    }

    // Real puzzle states: a WXYZ-Wing is common in them (about two states in three on 9 x 9), so the minima are large.
    [['classic9', 300, 777, 100], ['classic9', 300, 99, 100], ['classic6', 200, 777, 50],
      ['classic4', 200, 777, 1]].forEach(function (setup) {
      it('finds a WXYZ-Wing exactly when one exists and removes exactly its candidates on ' + setup[0] + ' (seed ' +
        setup[2] + ')', function () {
        var model = H.model(setup[0]);
        var found = 0;
        itemsOf(model, setup[1], setup[2]).forEach(function (item, index) {
          if (agree(model, item.state, 'state #' + index + ' (' + item.kind + ')')) found++;
        });
        expect(found).toBeGreaterThanOrEqual(setup[3]);
      });
    });

    [12, 16].forEach(function (D) {
      it('agrees on ' + D + ' digits (box shapes of 3 x 4 and 4 x 4, no 9 x 9 arithmetic)', function () {
        var model = D === 12 ? model12 : model16;
        var found = 0;
        itemsOf(model, D === 12 ? 80 : 6, 2026).forEach(function (item, index) {
          if (agree(model, item.state, 'state #' + index, true)) found++;
        });
        expect(found).toBeGreaterThanOrEqual(D === 12 ? 20 : 1);
      });
    });

    ['diagonalX', 'hyper', 'jigsaw9'].forEach(function (variant) {
      it('agrees on ' + variant + ' (extra regions or irregular regions are real peers)', function () {
        if (!SG.testkit.hasVariant(variant)) SG.test.skip('no board of ' + variant + ' can be built here');
        var model = H.model(variant);
        var found = 0;
        itemsOf(model, 120, 4242).forEach(function (item, index) {
          if (agree(model, item.state, 'state #' + index + ' (' + item.kind + ')')) found++;
        });
        expect(found).toBeGreaterThanOrEqual(10);
      });
    });

    ['samurai', 'sohei', 'butterfly', 'flower'].forEach(function (variant) {
      it('agrees on ' + variant + ' (several grids: only real peers count, an unbounded seam)', function () {
        if (!SG.testkit.hasVariant(variant)) SG.test.skip('no board of ' + variant + ' can be built here');
        var model = H.model(variant);
        var found = 0;
        itemsOf(model, 4, 4242).forEach(function (item, index) {
          if (agree(model, item.state, 'state #' + index + ' (' + item.kind + ')', true)) found++;
        });
        expect(found).toBeGreaterThanOrEqual(1);
      });
    });

    it('agrees with the oracle on every published position', function () {
      Object.keys(PUBLISHED).forEach(function (name) {
        agree(model9, H.makeState(model9, PUBLISHED[name]), 'published ' + name);
      });
    });
  });

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

  // Unique Rectangle types 3 and 4 (R14, MS11a). The vector of the brief: the floors R1C1 (0) and R1C4 (3) hold {1, 2};
  // the roofs R2C1 (9) {1, 2, 3} and R2C4 (12) {1, 2, 4} share row 2 only (box 1 and box 2). Cells of row 2 are
  // R2C1 = 9 ... R2C9 = 17. Types 1 and 2 keep their priority; the second pass looks at types 3 and 4.
  var UR_BASE = [[0, '12'], [3, '12'], [9, '123'], [12, '124']];
  var ROW2_OTHERS = [10, 11, 13, 14, 16, 17];

  /** The vector's blank board with the cells of `extra` = [[cell, '34'], ...] set as well. */
  function urState(model, extra) {
    return board(model, UR_BASE.concat(extra || []));
  }

  function urFind(model, state, ctxOptions) {
    return SG.techniques.get('uniqueRectangle').find(model, state, SG.techniques.createContext(model, ctxOptions || {}));
  }

  /** One call of the registered finder or of the seam (`seam`, and a `limit` given or not) with its observer. */
  function urObserved(model, state, opts) {
    var records = [];
    var options = opts || {};
    var ctx = SG.techniques.createContext(model, Object.assign({
      onPatternWork: function (r) { records.push(r); }
    }, options.ctx));
    var finding = options.seam
      ? SG.wingSearch.uniqueRectangle(model, state, ctx, options.limit === undefined ? undefined : { workLimit: options.limit })
      : SG.techniques.get('uniqueRectangle').find(model, state, ctx);
    return { finding: finding, records: records, record: records[0] };
  }

  /** [[cell, digit], ...] for every cell and every digit, cell by cell. */
  function both(cells, digits) {
    var out = [];
    cells.forEach(function (c) { digits.forEach(function (d) { out.push([c, d]); }); });
    return out;
  }

  describe('uniqueRectangle (R14): type 3, the roofs\' extras as one virtual subset member', function () {
    it('the vector: R2C7 {3,4} with the roofs\' extras 3 and 4 removes 3 and 4 from the rest of row 2', function () {
      var state = urState(model9, [[15, '34']]);
      var f = check('uniqueRectangle', model9, state, {
        cells: ['R1C1', 'R1C4', 'R2C1', 'R2C4', 'R2C7'],
        eliminations: both(ROW2_OTHERS, [3, 4]),
        args: { roof1: 'R2C1', roof2: 'R2C4', digits: [1, 2], partDigits: [3, 4], cells: ['R2C7'], unit: 'R2' }
      });
      expect(f.cells).toEqual([0, 3, 9, 12, 15]);
      expect(f.placements).toEqual([]);
      expect(f.i18nKey).toBe('technique.uniqueRectangle.type3.step');
      expect(Object.keys(f.i18nArgs)).toEqual(['roof1', 'roof2', 'digits', 'partDigits', 'cells', 'unit']);
      expect(JSON.parse(JSON.stringify(f.i18nArgs))).toEqual(f.i18nArgs);
      // cell by cell, then digit by digit; the two roofs and the real cell are never targets
      expect(f.eliminations).toEqual(both(ROW2_OTHERS, [3, 4]));
      [9, 12, 15].forEach(function (c) {
        f.eliminations.forEach(function (e) { expect(e[0]).not.toBe(c); });
      });
      expect(state.candidates[9]).toBe(maskOf('123'));
      expect(state.candidates[12]).toBe(maskOf('124'));
    });

    it('a target loses only the digits of the subset that it still has', function () {
      var state = urState(model9, [[15, '34'], [10, '356'], [11, '4789']]);
      var f = check('uniqueRectangle', model9, state, {
        eliminations: [[10, 3], [11, 4]].concat(both([13, 14, 16, 17], [3, 4]))
      });
      expect(elimKeys(f.eliminations)).not.toContain('10:5');
      expect(elimKeys(f.eliminations)).not.toContain('11:7');
    });

    it('the transposed vector: floors R1C1 and R4C1, roofs R1C2 and R4C2, the real cell R7C2, the unit C2', function () {
      var state = board(model9, [[0, '12'], [27, '12'], [1, '123'], [28, '124'], [55, '34']]);
      var f = check('uniqueRectangle', model9, state, {
        eliminations: both([10, 19, 37, 46, 64, 73], [3, 4]),
        args: { roof1: 'R1C2', roof2: 'R4C2', digits: [1, 2], partDigits: [3, 4], cells: ['R7C2'], unit: 'C2' }
      });
      expect(f.cells).toEqual([0, 1, 27, 28, 55]);
    });

    it('the roofs may be in a box and a row at once: the row comes first and the box is the next unit', function () {
      // roofs R2C1 (9) {1,2,3} and R2C2 (10) {1,2,4}, floors R5C1 (36) and R5C2 (37): rows 2 and 5, columns 1 and 2
      var base = [[36, '12'], [37, '12'], [9, '123'], [10, '124']];
      var inBox = board(model9, base.concat([[20, '34']]));
      var f = check('uniqueRectangle', model9, inBox, {
        args: { roof1: 'R2C1', roof2: 'R2C2', digits: [1, 2], partDigits: [3, 4], cells: ['R3C3'], unit: 'B1' },
        eliminations: both([0, 1, 2, 11, 18, 19], [3, 4])
      });
      expect(f.cells).toEqual([9, 10, 36, 37, 20]);
      var inRow = board(model9, base.concat([[16, '34'], [20, '34']]));
      var g = check('uniqueRectangle', model9, inRow, {
        args: { cells: ['R2C8'], unit: 'R2' },
        eliminations: both([11, 12, 13, 14, 15, 17], [3, 4])
      });
      expect(g.cells).toEqual([9, 10, 36, 37, 16]);
    });

    it('a pair, a triple and a quad of cells (k = 1, 2, 3 real cells): the union with the extras has k + 1 digits',
      function () {
        // k = 2: extras {3,4,5}; {3,4} and {4,5} together with them are three digits
        var triple = board(model9, [[0, '12'], [3, '12'], [9, '1234'], [12, '125'], [15, '34'], [16, '45']]);
        var f = check('uniqueRectangle', model9, triple, {
          eliminations: both([10, 11, 13, 14, 17], [3, 4, 5]),
          args: { partDigits: [3, 4, 5], cells: ['R2C7', 'R2C8'], unit: 'R2' }
        });
        expect(f.cells).toEqual([0, 3, 9, 12, 15, 16]);
        expect(urObserved(model9, triple).record.work).toBe(urUnitsOf(model9, triple));
        // k = 1 with three extras is no subset: {3,4,5} is three digits
        var single = board(model9, [[0, '12'], [3, '12'], [9, '1234'], [12, '125'], [15, '345']]);
        checkNone('uniqueRectangle', model9, single);
        // k = 3: extras {3,4}; {3,5}, {5,6} and {6,4} together with them are {3,4,5,6}
        var quad = urState(model9, [[15, '35'], [16, '56'], [17, '46']]);
        var g = check('uniqueRectangle', model9, quad, {
          eliminations: both([10, 11, 13, 14], [3, 4, 5, 6]),
          args: { partDigits: [3, 4, 5, 6], cells: ['R2C7', 'R2C8', 'R2C9'] }
        });
        expect(g.cells).toEqual([0, 3, 9, 12, 15, 16, 17]);
        // four extras ({3,4,5,6}) need three real cells inside them
        var fourExtras = board(model9, [[0, '12'], [3, '12'], [9, '12345'], [12, '126'], [15, '34'], [16, '45'],
          [17, '56']]);
        var h = check('uniqueRectangle', model9, fourExtras, {
          eliminations: both([10, 11, 13, 14], [3, 4, 5, 6]),
          args: { partDigits: [3, 4, 5, 6], cells: ['R2C7', 'R2C8', 'R2C9'] }
        });
        expect(h.cells).toEqual([0, 3, 9, 12, 15, 16, 17]);
        expect(urObserved(model9, fourExtras).record.work).toBe(urUnitsOf(model9, fourExtras));
        // k = 4: five extras ({3,4,5,6,7}) need four real cells inside them; the earlier bound of three real cells
        // would have missed this proof (the unit holds five cells for five digits: the roof and four real cells)
        var fiveExtras = board(model9, [[0, '12'], [3, '12'], [9, '12345'], [12, '1267'], [15, '34'], [16, '45'],
          [17, '56'], [11, '67']]);
        var five = check('uniqueRectangle', model9, fiveExtras, {
          eliminations: both([10, 13, 14], [3, 4, 5, 6, 7]),
          args: { partDigits: [3, 4, 5, 6, 7], cells: ['R2C3', 'R2C7', 'R2C8', 'R2C9'], unit: 'R2' }
        });
        expect(five.cells).toEqual([0, 3, 9, 12, 11, 15, 16, 17]);
        expect(urObserved(model9, fiveExtras).record.work).toBe(urUnitsOf(model9, fiveExtras));
      });

    it('a subset of four real cells is searched: {3,5} {5,6} {6,7} {7,4} with the extras {3,4} are five digits', function () {
      // the brief's vector with R2C3 {4,7}, R2C7 {3,5}, R2C8 {5,6} and R2C9 {6,7}: k = 4, D = {3,4,5,6,7}
      var state = urState(model9, [[11, '74'], [15, '35'], [16, '56'], [17, '67']]);
      var f = check('uniqueRectangle', model9, state, {
        eliminations: both([10, 13, 14], [3, 4, 5, 6, 7]),
        args: { roof1: 'R2C1', roof2: 'R2C4', digits: [1, 2], partDigits: [3, 4, 5, 6, 7],
          cells: ['R2C3', 'R2C7', 'R2C8', 'R2C9'], unit: 'R2' }
      });
      expect(f.cells).toEqual([0, 3, 9, 12, 11, 15, 16, 17]);
      expect(f.eliminations).toEqual(both([10, 13, 14], [3, 4, 5, 6, 7]));
      expect(urSubtypesOf(model9, state, true)).toHaveLength(1);
      var seen = urObserved(model9, state);
      expect(seen.record).toEqual({ id: 'uniqueRectangle', work: 24, limit: 50000, capHit: null, retained: null });
      expect(urUnitsOf(model9, state)).toBe(24);
    });

    it('subsets of five and six real cells on twelve digits: the proof has no cap, its prefix is cut by the work limit',
      function () {
        // floors R1C1 (0) and R1C5 (4) {1,2}, roofs R2C1 (12) {1,2,3} and R2C5 (16) {1,2,4} (rows 1 and 2, boxes 1 and
        // 2 of the 3 x 4 boxes); the real cells R2C3 {3,5}, R2C7 {5,6}, R2C8 {6,7}, R2C9 {7,8} and R2C10 {8,4} give
        // k = 5 and D = {3,4,5,6,7,8}; the other cells of row 2 (R2C2, R2C4, R2C6, R2C11, R2C12) are the targets
        var state = board(model12, [[0, '12'], [4, '12'], [12, '123'], [16, '124'], [14, '35'], [18, '56'], [19, '67'],
          [20, '78'], [21, '84']]);
        var targets = [13, 15, 17, 22, 23];
        var before = Array.from(state.candidates);
        var f = check('uniqueRectangle', model12, state, {
          eliminations: both(targets, [3, 4, 5, 6, 7, 8]),
          args: { roof1: 'R2C1', roof2: 'R2C5', digits: [1, 2], partDigits: [3, 4, 5, 6, 7, 8],
            cells: ['R2C3', 'R2C7', 'R2C8', 'R2C9', 'R2C10'], unit: 'R2' }
        });
        expect(f.cells).toEqual([0, 4, 12, 16, 14, 18, 19, 20, 21]);
        expect(urUnitsOf(model12, state)).toBe(41);
        expect(urObserved(model12, state).record).toEqual(
          { id: 'uniqueRectangle', work: 41, limit: 50000, capHit: null, retained: null });
        // deterministic truncation: every smaller limit ends in null with capHit 'work' at exactly its limit
        [0, 1, 20, 40].forEach(function (limit) {
          var cut = urObserved(model12, state, { seam: true, limit: limit });
          expect(cut.finding).toBeNull();
          expect(cut.record).toEqual({ id: 'uniqueRectangle', work: limit, limit: limit, capHit: 'work', retained: null });
        });
        var exact = urObserved(model12, state, { seam: true, limit: 41 });
        expect(exact.finding).toEqual(f);
        expect(exact.record).toEqual({ id: 'uniqueRectangle', work: 41, limit: 41, capHit: null, retained: null });
        // the state is not changed by any of the calls
        expect(Array.from(state.candidates)).toEqual(before);
        // six real cells: R2C11 {4,9} joins and R2C10 becomes {8,9}; k = 6 and D = {3,..,9}, 77 units
        var six = board(model12, [[0, '12'], [4, '12'], [12, '123'], [16, '124'], [14, '35'], [18, '56'], [19, '67'],
          [20, '78'], [21, '89'], [22, '94']]);
        var g = check('uniqueRectangle', model12, six, {
          eliminations: both([13, 15, 17, 23], [3, 4, 5, 6, 7, 8, 9]),
          args: { partDigits: [3, 4, 5, 6, 7, 8, 9], cells: ['R2C3', 'R2C7', 'R2C8', 'R2C9', 'R2C10', 'R2C11'], unit: 'R2' }
        });
        expect(g.cells).toEqual([0, 4, 12, 16, 14, 18, 19, 20, 21, 22]);
        expect(urUnitsOf(model12, six)).toBe(77);
        expect(urObserved(model12, six, { seam: true, limit: 76 }).record.capHit).toBe('work');
        expect(urObserved(model12, six, { seam: true, limit: 77 }).finding).toEqual(g);
      });

    it('wrong union sizes find nothing: a third digit, a digit outside the extras, a real cell of three digits',
      function () {
        [[15, '35'], [15, '345'], [15, '56'], [15, '5']].forEach(function (cell) {
          checkNone('uniqueRectangle', model9, urState(model9, [cell]));
        });
      });

    it('a real cell outside every unit that holds both roofs is no real cell', function () {
      // R3C7 and R4C7 are not in row 2 (the roofs are in boxes 1 and 2)
      checkNone('uniqueRectangle', model9, urState(model9, [[24, '34']]));
      checkNone('uniqueRectangle', model9, urState(model9, [[33, '34']]));
    });

    it('an open cell without any candidate is no real cell (a contradictory position proves nothing)', function () {
      var state = urState(model9, [[15, '']]);
      expect(state.candidates[15]).toBe(0);
      checkNone('uniqueRectangle', model9, state);
      // nor an eligible cell: with R2C2 at eight digits (the union with the extras is eight) the widest subset is the six
      // other cells, whose filter of seven digits leaves R2C2 out; the work is that of the rule
      var eight = urState(model9, [[15, ''], [10, '23456789']]);
      checkNone('uniqueRectangle', model9, eight);
      expect(urObserved(model9, eight).record.work).toBe(urUnitsOf(model9, eight));
    });

    it('the roofs are never real cells: with them R2C7 {1,2} would make a false quad of the digits 1 to 4', function () {
      var state = urState(model9, [[15, '12']]);
      checkNone('uniqueRectangle', model9, state);
      expect(urSubtypesOf(model9, state)).toEqual([]);
    });

    it('the cells of a unit are tried in ascending order, whatever the order of the list of the unit', function () {
      // the unit D9 lists its cells from the highest to the lowest; it holds the roofs R1C1 (0) and R2C4 (12) only
      var descending = rebuild(model9, 'test-desc', { units: [{ cells: [77, 66, 58, 49, 41, 29, 20, 12, 0],
        meta: { kind: 'diag', gridIndex: 0, label: 'D9' } }] });
      var base = [[3, '12'], [9, '12'], [0, '123'], [12, '124']];
      var state = board(descending, base.concat([[20, '34'], [29, '34']]));
      var f = check('uniqueRectangle', descending, state, {
        args: { cells: ['R3C3'], unit: 'D9' }, eliminations: both([29, 41, 49, 58, 66, 77], [3, 4])
      });
      expect(f.cells).toEqual([0, 3, 9, 12, 20]);
      expect(f.eliminations).toEqual(both([29, 41, 49, 58, 66, 77], [3, 4]));
    });

    it('empty extras are no virtual member: four cells that hold only {1,2} are the deadly pattern itself', function () {
      var state = board(model9, [[0, '12'], [3, '12'], [9, '12'], [12, '12'], [15, '34']]);
      checkNone('uniqueRectangle', model9, state);
    });

    it('two bivalue floors are needed: one floor of three digits makes no type 3', function () {
      var state = board(model9, [[0, '12'], [3, '125'], [9, '123'], [12, '124'], [15, '34']]);
      checkNone('uniqueRectangle', model9, state);
    });

    it('roofs on opposite corners share no unit: a real cell in either row finds nothing', function () {
      // floors R1C4 (3) and R2C1 (9), roofs R1C1 (0) and R2C4 (12)
      var state = board(model9, [[3, '12'], [9, '12'], [0, '123'], [12, '124'], [6, '34'], [15, '34']]);
      checkNone('uniqueRectangle', model9, state);
    });

    it('the roofs are never targets and the virtual member is one roof, not both: the extras stay in both roofs',
      function () {
        var state = urState(model9, [[15, '34']]);
        var f = check('uniqueRectangle', model9, state, {});
        f.eliminations.forEach(function (e) { expect([9, 12]).not.toContain(e[0]); });
        // were both roofs counted as members with a fixed extra each, the real cell and the other cells would be
        // removed; here the other cells lose exactly the two digits of the subset
        var kept = new Set(f.eliminations.map(function (e) { return e[0]; }));
        ROW2_OTHERS.forEach(function (c) { expect(kept.has(c)).toBe(true); });
        expect(f.eliminations.length).toBe(ROW2_OTHERS.length * 2);
      });

    it('a solved cell of the unit is left out, and a solved cell is no real cell', function () {
      var state = urState(model9, [[15, '34']]);
      solveCell(state, 10, 3);
      var f = check('uniqueRectangle', model9, state, {});
      expect(elimKeys(f.eliminations)).not.toContain('10:3');
      var onlySolved = urState(model9, [[15, '34']]);
      solveCell(onlySolved, 15, 3);
      checkNone('uniqueRectangle', model9, onlySolved);
    });

    it('is deterministic, leaves the state alone and owns its arrays', function () {
      var state = urState(model9, [[15, '34']]);
      var snapshot = SG.model.cloneState(state);
      var a = urFind(model9, state);
      var b = urFind(model9, state);
      expect(b).toEqual(a);
      a.cells.push(99);
      a.eliminations.push([99, 9]);
      a.i18nArgs.cells.push('R9C9');
      a.i18nArgs.partDigits.push(9);
      expect(urFind(model9, state)).toEqual(b);
      expect(state.candidates).toEqual(snapshot.candidates);
      expect(state.value).toEqual(snapshot.value);
    });
  });

  describe('uniqueRectangle (R14): type 4, a conjugate link between the roofs', function () {
    it('the vector: 1 only in the two roofs of row 2 removes 2 from both roofs', function () {
      var state = urState(model9, []);
      dropDigit(state, 1, [10, 11, 13, 14, 15, 16, 17]);
      var f = check('uniqueRectangle', model9, state, {
        cells: ['R1C1', 'R1C4', 'R2C1', 'R2C4'],
        eliminations: [['R2C1', 2], ['R2C4', 2]],
        args: { roof1: 'R2C1', roof2: 'R2C4', digits: [1, 2], digit: 2, unit: 'R2' }
      });
      expect(f.cells).toEqual([0, 3, 9, 12]);
      expect(f.eliminations).toEqual([[9, 2], [12, 2]]);
      expect(f.i18nKey).toBe('technique.uniqueRectangle.type4.step');
      expect(Object.keys(f.i18nArgs)).toEqual(['roof1', 'roof2', 'digits', 'digit', 'unit']);
      expect(JSON.parse(JSON.stringify(f.i18nArgs))).toEqual(f.i18nArgs);
    });

    it('the link may be either digit of the pair: 2 only in the roofs removes 1', function () {
      var state = urState(model9, []);
      dropDigit(state, 2, [10, 11, 13, 14, 15, 16, 17]);
      check('uniqueRectangle', model9, state, {
        eliminations: [['R2C1', 1], ['R2C4', 1]],
        args: { digits: [1, 2], digit: 1 }
      });
    });

    it('the transposed vector: 1 only in the two roofs of column 2', function () {
      var state = board(model9, [[0, '12'], [27, '12'], [1, '123'], [28, '124']]);
      dropDigit(state, 1, [10, 19, 37, 46, 55, 64, 73]);
      var f = check('uniqueRectangle', model9, state, {
        eliminations: [['R1C2', 2], ['R4C2', 2]],
        args: { roof1: 'R1C2', roof2: 'R4C2', digits: [1, 2], digit: 2, unit: 'C2' }
      });
      expect(f.cells).toEqual([0, 1, 27, 28]);
    });

    it('roofs in a box and a row: the link may be in the box (the row has other 1s)', function () {
      // roofs R2C1 (9) and R2C2 (10), floors R5C1 and R5C2; the 1 is confined to the roofs inside box 1 only
      var state = board(model9, [[36, '12'], [37, '12'], [9, '123'], [10, '124']]);
      dropDigit(state, 1, [0, 1, 2, 11, 18, 19, 20]);
      var f = check('uniqueRectangle', model9, state, {
        eliminations: [['R2C1', 2], ['R2C2', 2]],
        args: { digit: 2, unit: 'B1' }
      });
      expect(f.cells).toEqual([9, 10, 36, 37]);
    });

    it('a third occurrence of the digit breaks the conjugacy', function () {
      var state = urState(model9, []);
      dropDigit(state, 1, [10, 11, 13, 14, 16, 17]);
      checkNone('uniqueRectangle', model9, state);
      expect(has(state, 15, 1)).toBe(true);
    });

    it('a solved 1 in the row is a third occurrence of the digit: the link is gone', function () {
      var state = urState(model9, []);
      dropDigit(state, 1, [10, 11, 13, 14, 15, 16, 17]);
      solveCell(state, 17, 1);
      checkNone('uniqueRectangle', model9, state);
    });

    it('the digit must be in both roofs: a roof without it leaves no rectangle of one pair', function () {
      var state = urState(model9, []);
      dropDigit(state, 1, [10, 11, 13, 14, 15, 16, 17]);
      state.candidates[12] &= ~bit(1);
      checkNone('uniqueRectangle', model9, state);
    });

    it('roofs on opposite corners share no unit', function () {
      var state = board(model9, [[3, '12'], [9, '12'], [0, '123'], [12, '124']]);
      dropDigit(state, 1, [1, 2, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16, 17]);
      checkNone('uniqueRectangle', model9, state);
    });

    it('a link needs two bivalue floors and roofs with extras: one floor of three digits finds nothing', function () {
      var state = board(model9, [[0, '12'], [3, '125'], [9, '123'], [12, '124']]);
      dropDigit(state, 1, [10, 11, 13, 14, 15, 16, 17]);
      checkNone('uniqueRectangle', model9, state);
    });
  });

  describe('uniqueRectangle (R14): order, priority and the first Finding', function () {
    it('types 1 and 2 keep their priority: a type 1 on a later rectangle beats a type 3 on an earlier one', function () {
      // rectangle A (cells 0, 3, 9, 12) holds the vector with the real cell R2C7; rectangle B (R8C2, R8C5, R9C2, R9C5)
      // is a type 1, found by the first pass over every rectangle although it comes later
      var state = urState(model9, [[15, '34'], [64, '12'], [67, '12'], [73, '12'], [76, '125']]);
      expect(urSubtypesOf(model9, state, true)).toHaveLength(1);
      var f = check('uniqueRectangle', model9, state, {
        cells: ['R8C2', 'R8C5', 'R9C2', 'R9C5'],
        eliminations: [['R9C5', 1], ['R9C5', 2]],
        args: { cell: 'R9C5', digitX: 1, digitY: 2 }
      });
      expect(f.i18nKey).toBe('technique.uniqueRectangle.type1.step');
      // and a type 2 with a target likewise
      var second = urState(model9, [[15, '34'], [64, '12'], [67, '12'], [73, '125'], [76, '125']]);
      expect(urFind(model9, second).i18nKey).toBe('technique.uniqueRectangle.type2.step');
    });

    it('type 3 comes before type 4 on the same rectangle, whatever their units', function () {
      // roofs R2C1 and R2C2 share row 2 and box 1: the 1 is confined to the roofs in the row (type 4) and a real cell
      // {3,4} sits in box 1 (type 3): the type 3 of the box is returned
      var base = [[36, '12'], [37, '12'], [9, '123'], [10, '124']];
      var state = board(model9, base.concat([[20, '34']]));
      dropDigit(state, 1, [11, 12, 13, 14, 15, 16, 17]);
      var patterns = urSubtypesOf(model9, state);
      expect(patterns.map(function (p) { return p.type; })).toEqual([3, 4]);
      var f = check('uniqueRectangle', model9, state, {});
      expect(f.i18nKey).toBe('technique.uniqueRectangle.type3.step');
      expect(f.i18nArgs.unit).toBe('B1');
      // without the real cell the type 4 of the row is the first Finding
      var only = board(model9, base);
      dropDigit(only, 1, [11, 12, 13, 14, 15, 16, 17]);
      var g = check('uniqueRectangle', model9, only, {});
      expect(g.i18nKey).toBe('technique.uniqueRectangle.type4.step');
      expect(g.i18nArgs.unit).toBe('R2');
    });

    it('the units of the roofs are tried in index order: the row R2 before the box B1', function () {
      var base = [[36, '12'], [37, '12'], [9, '123'], [10, '124']];
      var state = board(model9, base.concat([[16, '34'], [20, '34']]));
      var f = check('uniqueRectangle', model9, state, {});
      expect(f.i18nArgs.unit).toBe('R2');
      expect(f.i18nArgs.cells).toEqual(['R2C8']);
    });

    it('smaller subsets come first, then the lowest cells: a pair before a triple, the lower of two pairs', function () {
      var state = urState(model9, [[15, '34'], [16, '34'], [17, '35'], [11, '45']]);
      var f = check('uniqueRectangle', model9, state, {});
      expect(f.i18nArgs.cells).toEqual(['R2C7']);
      expect(f.cells).toEqual([0, 3, 9, 12, 15]);
      // the other pair is a target of the first
      expect(elimKeys(f.eliminations)).toContain('16:3');
      expect(elimKeys(f.eliminations)).toContain('16:4');
    });

    it('the first rectangle in the order of the first pass wins, and the second is found once the first is spent', function () {
      // rectangle B: floors R4C1 (27) and R4C4 (30), roofs R5C1 (36) and R5C4 (39), the real cell R5C7 (42)
      var rectB = [[27, '12'], [30, '12'], [36, '123'], [39, '124'], [42, '34']];
      var both2 = urState(model9, [[15, '34']].concat(rectB));
      var f = check('uniqueRectangle', model9, both2, {});
      expect(f.cells.slice(0, 4)).toEqual([0, 3, 9, 12]);
      var onlyB = board(model9, rectB);
      var g = check('uniqueRectangle', model9, onlyB, {});
      expect(g.cells).toEqual([27, 30, 36, 39, 42]);
    });

    it('rectangle by rectangle: a type 4 on an earlier rectangle comes before a type 3 on a later one', function () {
      var rectB = [[27, '12'], [30, '12'], [36, '123'], [39, '124'], [42, '34']];
      var state = board(model9, UR_BASE.concat(rectB));
      dropDigit(state, 1, [10, 11, 13, 14, 15, 16, 17]);
      expect(urSubtypesOf(model9, state).map(function (p) { return p.type; })).toEqual([4, 3]);
      var f = check('uniqueRectangle', model9, state, {});
      expect(f.i18nKey).toBe('technique.uniqueRectangle.type4.step');
      expect(f.cells).toEqual([0, 3, 9, 12]);
    });
  });

  describe('uniqueRectangle (R14): other unit shapes, the uniqueness assumption and structures', function () {
    it('a 4x4 jigsaw rectangle: type 3 and type 4 inside a region, after the column in unit order', function () {
      var jigsaw = jigsawModel();
      // rectangle [1, 3, 5, 7]: regions Z1 (cells 0, 1, 2, 5) and Z2; the roofs 1 and 5 share column C2 and region Z1
      var base = [[3, '12'], [7, '12'], [1, '123'], [5, '124']];
      var inRegion = board(jigsaw, base.concat([[0, '34']]));
      var f = check('uniqueRectangle', jigsaw, inRegion, {
        eliminations: [[2, 3], [2, 4]],
        args: { roof1: 'R1C2', roof2: 'R2C2', digits: [1, 2], partDigits: [3, 4], cells: ['R1C1'], unit: 'Z1' }
      });
      expect(f.cells).toEqual([1, 3, 5, 7, 0]);
      // type 4: the 1 only at the roofs inside Z1 (the column C2 has other 1s)
      var link = board(jigsaw, base);
      dropDigit(link, 1, [0, 2]);
      var g = check('uniqueRectangle', jigsaw, link, {
        eliminations: [[1, 2], [5, 2]],
        args: { digits: [1, 2], digit: 2, unit: 'Z1' }
      });
      expect(g.cells).toEqual([1, 3, 5, 7]);
      // the same cells on the regular 4x4 board: box 1 is {0, 1, 4, 5}, so the box has the target 4, not the cell 2
      var regular = check('uniqueRectangle', model4, board(model4, base.concat([[0, '34']])), {
        eliminations: [[4, 3], [4, 4]],
        args: { cells: ['R1C1'], unit: 'B1' }
      });
      expect(regular.cells).toEqual([1, 3, 5, 7, 0]);
    });

    it('a diagonal that holds only one corner breaks the deadly pattern for both subtypes (Sudoku X)', function () {
      var diagonal = [];
      for (var i = 0; i < 9; i++) diagonal.push(at(model9, i, i));
      var sudokuX = rebuild(model9, 'test-x', { units: [{ cells: diagonal, meta: { kind: 'diag', label: 'D1' } }] });
      // R1C1 is the only corner on the diagonal
      var type3 = urState(model9, [[15, '34']]);
      none('uniqueRectangle', sudokuX, type3);
      check('uniqueRectangle', model9, type3, {});
      var type4 = urState(model9, []);
      dropDigit(type4, 1, [10, 11, 13, 14, 15, 16, 17]);
      none('uniqueRectangle', sudokuX, type4);
      check('uniqueRectangle', model9, type4, {});
    });

    it('a unit of the rectangle that holds exactly two corners keeps the pattern: an extra unit of two corners',
      function () {
        // a diagonal-like unit through the two roofs R2C1 and R2C4 only, plus other cells: the swap keeps it valid
        var extra = rebuild(model9, 'test-two', { units: [{ cells: [9, 12, 28, 42, 50, 60, 70, 80, 2],
          meta: { kind: 'diag', gridIndex: 0, label: 'D2' } }] });
        var state = urState(extra, [[15, '34']]);
        var f = check('uniqueRectangle', extra, state, {});
        expect(f.i18nArgs.unit).toBe('R2');
      });

    it('a partial unit: type 3 works in it (its cells differ), a type 4 link in it proves nothing', function () {
      // the roofs R1C1 (0) {1,2,3} and R2C4 (12) {1,2,4} are opposite corners of [0, 3, 9, 12]: they share no row, column
      // or box, only the unit P1, which holds both and two more cells (it holds exactly two corners)
      var partial = rebuild(model9, 'test-partial', { units: [{ cells: [0, 12, 20, 41],
        meta: { kind: 'diag', gridIndex: 0, label: 'P1', partial: true } }] });
      var base = [[3, '12'], [9, '12'], [0, '123'], [12, '124']];
      var f = check('uniqueRectangle', partial, board(partial, base.concat([[20, '34']])), {
        eliminations: [[41, 3], [41, 4]],
        args: { roof1: 'R1C1', roof2: 'R2C4', digits: [1, 2], partDigits: [3, 4], cells: ['R3C3'], unit: 'P1' }
      });
      expect(f.cells).toEqual([0, 3, 9, 12, 20]);
      var link = board(partial, base);
      dropDigit(link, 1, [20, 41]);
      checkNone('uniqueRectangle', partial, link);
      // the same unit as a complete one (nine cells) is a real conjugate link
      var complete = rebuild(model9, 'test-complete', { units: [{ cells: [0, 12, 20, 29, 41, 49, 58, 66, 77],
        meta: { kind: 'diag', gridIndex: 0, label: 'D9' } }] });
      var done = board(complete, base);
      dropDigit(done, 1, [20, 29, 41, 49, 58, 66, 77]);
      check('uniqueRectangle', complete, done, {
        eliminations: [[0, 2], [12, 2]], args: { digits: [1, 2], digit: 2, unit: 'D9' }
      });
    });

    it('the exact union is required: a real cell inside the extras holds one digit for two cells, no type 3', function () {
      // the partial unit P1 {R1C1, R2C4, R3C3, R5C6} holds the opposite roofs R1C1 and R2C4 {1,2,3} (the extras are {3})
      // and the real cell R3C3 {3}: the union with the extras is {3}, one digit, not the two that k = 1 needs; the
      // contradictory state proves nothing and a claim of D = {3} that removes 3 from R5C6 would be wrong
      var partial = rebuild(model9, 'test-partial-union', { units: [{ cells: [0, 12, 20, 41],
        meta: { kind: 'diag', gridIndex: 0, label: 'P1', partial: true } }] });
      var state = board(partial, [[3, '12'], [9, '12'], [0, '123'], [12, '123'], [20, '3']]);
      checkNone('uniqueRectangle', partial, state);
      expect(urObserved(partial, state).record.capHit).toBeNull();
      expect(urUnitsOf(partial, state)).toBe(urObserved(partial, state).record.work);
      // with a second digit in the real cell the same cells are a type 3 (D = {3,4}): the guard, not the geometry
      var good = board(partial, [[3, '12'], [9, '12'], [0, '123'], [12, '123'], [20, '34']]);
      check('uniqueRectangle', partial, good, {
        eliminations: [[41, 3], [41, 4]],
        args: { roof1: 'R1C1', roof2: 'R2C4', digits: [1, 2], partDigits: [3, 4], cells: ['R3C3'], unit: 'P1' }
      });
    });

    it('a model with cages or inequalities never gets a type 3 or a type 4', function () {
      var type3 = urState(model9, [[15, '34']]);
      var type4 = urState(model9, []);
      dropDigit(type4, 1, [10, 11, 13, 14, 15, 16, 17]);
      var caged = rebuild(model9, 'test-cages', { cages: [{ cells: [20, 21], sum: 3 }] });
      var signs = rebuild(model9, 'test-signs', { inequalities: [{ a: 40, b: 41 }] });
      [type3, type4].forEach(function (state) {
        none('uniqueRectangle', caged, state);
        none('uniqueRectangle', signs, state);
        check('uniqueRectangle', model9, state, {});
      });
    });

    it('the layout rows of a multi-grid board are no units: a real cell of another grid on the same row finds nothing',
      function () {
        var samurai = SG.testkit.hasVariant('samurai') ? H.model('samurai') : null;
        if (samurai === null) SG.test.skip('no samurai board can be built here');
        var at1 = function (r, c) { return byLayout(samurai, r, c); };
        // the vector inside the first grid: floors (0,0) and (0,3), roofs (1,0) and (1,3), the real cell (1,6)
        var state = board(samurai, [[at1(0, 0), '12'], [at1(0, 3), '12'], [at1(1, 0), '123'], [at1(1, 3), '124'],
          [at1(1, 6), '34']]);
        var f = H.expectFinding(SG.test, 'uniqueRectangle', state, {}, { model: samurai });
        expect(f.i18nKey).toBe('technique.uniqueRectangle.type3.step');
        expect(f.i18nArgs.cells).toEqual([H.label(samurai, at1(1, 6))]);
        // the same layout row in the second grid (layout column 12) is not in the unit of the roofs
        var twin = board(samurai, [[at1(0, 0), '12'], [at1(0, 3), '12'], [at1(1, 0), '123'], [at1(1, 3), '124'],
          [at1(1, 12), '34']]);
        expect(sees(samurai, at1(1, 0), at1(1, 12))).toBe(false);
        none('uniqueRectangle', samurai, twin);
      });

    it('assumeUniqueness: false skips both subtypes (and the seam), and leaves no work record', function () {
      var type3 = urState(model9, [[15, '34']]);
      var type4 = urState(model9, []);
      dropDigit(type4, 1, [10, 11, 13, 14, 15, 16, 17]);
      [type3, type4].forEach(function (state) {
        none('uniqueRectangle', model9, state, { assumeUniqueness: false });
        var out = urObserved(model9, state, { ctx: { assumeUniqueness: false } });
        expect(out.finding).toBeNull();
        expect(out.records).toEqual([]);
        var seam = urObserved(model9, state, { seam: true, ctx: { assumeUniqueness: false } });
        expect(seam.finding).toBeNull();
        expect(seam.records).toEqual([]);
        expect(urObserved(model9, state).finding).not.toBeNull();
      });
    });
  });

  describe('uniqueRectangle (R14): real positions', function () {
    var entry = SG.fixtures.techniques.byId.uniqueRectangle;
    var registry = SG.fixtures.techniques.registryOrder;

    // The exact Findings of the four real positive fixtures (core/tests/fixtures/techniques.js), type 3 and type 4 first.
    var REAL = [
      { cells: ['R4C8', 'R4C9', 'R9C8', 'R9C9', 'R4C5', 'R4C6'], eliminations: [['R4C1', 5], ['R4C1', 6]],
        args: { roof1: 'R4C8', roof2: 'R4C9', digits: [2, 3], partDigits: [5, 6, 9], cells: ['R4C5', 'R4C6'], unit: 'R4' } },
      { cells: ['R3C7', 'R3C9', 'R6C7', 'R6C9'], eliminations: [['R6C7', 1], ['R6C9', 1]],
        args: { roof1: 'R6C7', roof2: 'R6C9', digits: [1, 9], digit: 1, unit: 'R6' } },
      { cells: ['R1C2', 'R1C5', 'R3C2', 'R3C5'], eliminations: [['R1C2', 5], ['R1C2', 9]],
        args: { cell: 'R1C2', digitX: 5, digitY: 9 } },
      { cells: ['R1C3', 'R1C4', 'R2C3', 'R2C4'], eliminations: [['R3C3', 3]],
        args: { roof1: 'R1C3', roof2: 'R2C3', digitX: 6, digitY: 8, digit: 3 } }
    ];
    var KEYS = ['technique.uniqueRectangle.type3.step', 'technique.uniqueRectangle.type4.step',
      'technique.uniqueRectangle.type1.step', 'technique.uniqueRectangle.type2.step'];

    function positionOf(fixture) {
      return fixture.after !== null ? H.stateAfter(model9, fixture.puzzle, fixture.after)
        : H.makeState(model9, fixture.puzzle, { propagate: fixture.propagate });
    }

    it('has one positive per subtype and two negatives; the positives are where the registry reaches it', function () {
      expect(entry.positive).toHaveLength(4);
      expect(entry.negative).toHaveLength(2);
      var below = registry.slice(0, registry.indexOf('uniqueRectangle'));
      entry.positive.forEach(function (fixture) { expect(fixture.after.slice().sort()).toEqual(below.slice().sort()); });
      expect(entry.negative[0].after).toContain('uniqueRectangle');
      expect(entry.negative[1].after).toContain('wxyzWing');
      expect(entry.negative[1].after).not.toContain('wWing');
      // the v2 entry is untouched history: its first positive is still the old type 1 position
      var old = SG.fixtures.techniques.historyV2.byId.uniqueRectangle;
      expect(old.positive[0].expect.eliminations).toEqual([[33, 4], [33, 6]]);
      expect(SG.fixtures.techniques.byId.uniqueRectangle).not.toBe(old);
    });

    REAL.forEach(function (want, i) {
      it('finds the exact Finding of real position ' + (i + 1) + ' (' + KEYS[i].split('.')[2] + '), sound against an ' +
        'independent completion and with the premise of the pattern shown absurd', function () {
        var fixture = entry.positive[i];
        var givens = H.parsePuzzle(model9, fixture.puzzle);
        // the puzzle has exactly one solution (plain depth first search, no technique): the uniqueness the pattern uses
        expect(SG.dfs.countSolutions(model9, givens, 2)).toBe(1);
        var solution = SG.dfs.solve(model9, givens);
        var state = positionOf(fixture);
        var finding = check('uniqueRectangle', model9, state, want);
        expect(finding.i18nKey).toBe(KEYS[i]);
        expect(finding.eliminations.length).toBe(want.eliminations.length);
        finding.eliminations.forEach(function (e) { expect(solution[e[0]]).not.toBe(e[1]); });
        var quad = finding.cells.slice(0, 4);
        var shape = urShape(state, quad);
        if (i < 2) {
          // the premise "both roofs hold one of the pair" has no completion: the unique solution is not one of them
          var deadly = SG.model.cloneState(state);
          shape.roofs.forEach(function (c) { deadly.candidates[c] = shape.common; });
          expect(SG.dfs.searchFrom(model9, deadly, { limit: 2 }).found).toBe(0);
          expect(shape.roofs.some(function (c) { return (shape.common & bit(solution[c])) === 0; })).toBe(true);
        }
        if (i === 0) {
          // type 3: the roof with an extra and the real cells hold exactly the k + 1 digits of the subset
          var real = finding.cells.slice(4);
          var holder = shape.roofs.filter(function (c) { return (shape.common & bit(solution[c])) === 0; });
          expect(holder).toHaveLength(1);
          var values = real.map(function (c) { return solution[c]; }).concat([solution[holder[0]]]).sort(byNumber);
          expect(values).toEqual(finding.i18nArgs.partDigits);
        }
        if (i === 1) {
          // type 4: exactly one of the roofs holds the digit of the link
          var link = finding.i18nArgs.digits.filter(function (d) { return d !== finding.i18nArgs.digit; })[0];
          expect(shape.roofs.filter(function (c) { return solution[c] === link; })).toHaveLength(1);
        }
        // the position without the eliminated candidates still completes, and only to that solution
        var reduced = SG.model.cloneState(state);
        finding.eliminations.forEach(function (e) {
          expect(SG.constraints.eliminate(model9, reduced, e[0], e[1])).toBe(true);
        });
        var done = SG.dfs.searchFrom(model9, reduced, { limit: 2 });
        expect(done.found).toBe(1);
        expect(Array.from(done.solution)).toEqual(Array.from(solution));
        // no cheaper technique of the registry finds anything here: uniqueRectangle is the first one reached
        SG.techniques.list().filter(function (t) { return t.variantScope === null && t.order < 180; })
          .forEach(function (t) {
            expect([t.id, t.find(model9, state, SG.techniques.createContext(model9, { assumeUniqueness: true })) === null])
              .toEqual([t.id, true]);
          });
      });
    });

    it('is a step of the logical solver from the real positions, and never without the uniqueness assumption',
      function () {
        [0, 1].forEach(function (i) {
          var fixture = entry.positive[i];
          var givens = H.parsePuzzle(model9, fixture.puzzle);
          var allowed = fixture.after.concat(['uniqueRectangle']);
          var report = SG.logicalSolver.solve(model9, givens, { allowedTechniques: allowed });
          var ur = report.steps.filter(function (s) { return s.technique === 'uniqueRectangle'; });
          expect(ur.length).toBeGreaterThan(0);
          expect(ur[0].i18nKey).toBe(KEYS[i]);
          expect(report.techniqueCounts.uniqueRectangle).toBe(ur.length);
          var without = SG.logicalSolver.solve(model9, givens, { allowedTechniques: allowed, assumeUniqueness: false });
          without.steps.forEach(function (s) { expect(s.technique).not.toBe('uniqueRectangle'); });
        });
      });

    it('finds nothing at the negative positions: nothing left after it, and a W-Wing', function () {
      entry.negative.forEach(function (fixture) {
        var state = positionOf(fixture);
        H.expectNoFinding(SG.test, 'uniqueRectangle', state);
        expect(urHasTypesOneTwo(model9, state)).toBe(false);
        expect(urSubtypesOf(model9, state)).toEqual([]);
      });
      // the second position holds a genuine W-Wing, which belongs to wWing
      var wing = SG.techniques.get('wWing').find(model9, positionOf(entry.negative[1]),
        SG.techniques.createContext(model9, {}));
      expect(wing).not.toBeNull();
      expect(positionOf(entry.negative[0]).unsolvedCount).toBeGreaterThan(0);
    });

    it('the three supplements of the soundness sweep are real unique positions that hold a type 3 or a type 4', function () {
      var supplements = SG.fixtures.techniques.supplements.uniqueRectangle;
      expect(supplements).toHaveLength(3);
      var keys = [];
      supplements.forEach(function (fixture) {
        expect(SG.dfs.countSolutions(model9, H.parsePuzzle(model9, fixture.puzzle), 2)).toBe(1);
        var state = positionOf(fixture);
        var f = check('uniqueRectangle', model9, state, {});
        keys.push(f.i18nKey);
      });
      expect(keys).toEqual(['technique.uniqueRectangle.type3.step', 'technique.uniqueRectangle.type3.step',
        'technique.uniqueRectangle.type4.step']);
    });
  });

  describe('uniqueRectangle (R14): work limit, budget and cancellation', function () {
    var model16w = model16;

    var FLOOD_UNITS = 5832;

    function maskOfDigits(digits) {
      var m = 0;
      digits.forEach(function (d) { m |= bit(d); });
      return m;
    }

    // On the 16-digit board: roofs R1C1 {1,2,3} and R1C9 {1,2,4} share row 1 only (columns 1 and 9 are in different
    // stacks), the floors R2C1 and R2C9 hold {1,2}. The other fourteen cells of row 1 hold the pairs of a cycle over the
    // fourteen digits {1,2,5..16} ({1,2}, {2,5}, {5,6}, ..., {16,1}): k cells of it touch at least k digits, so with the
    // extras 3 and 4 no subset has k + 1 digits and nothing is found, while every partial subset of the uncapped search is
    // tried: 5832 units of work. `rows` floods more rows of the same kind (rectangles in rows 5, 9, ... with the cycle
    // shifted by one cell each).
    function flood16(rows) {
      var D = 16;
      var cycle = [1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
      var state = SG.model.initState(model16w);
      for (var n = 0; n < (rows || 1); n++) {
        var rowR = 4 * n;
        var roofA = rowR * D;
        var roofB = rowR * D + 8;
        state.candidates[(rowR + 1) * D] = maskOf('12');
        state.candidates[(rowR + 1) * D + 8] = maskOf('12');
        state.candidates[roofA] = maskOf('123');
        state.candidates[roofB] = maskOf('124');
        var i = n;
        for (var c = 0; c < D; c++) {
          var cell = rowR * D + c;
          if (cell === roofA || cell === roofB) continue;
          state.candidates[cell] = maskOfDigits([cycle[i % 14], cycle[(i + 1) % 14]]);
          i++;
        }
      }
      return state;
    }

    it('has R10\'s limit of 50000, and the registered finder reports every call that runs the second pass', function () {
      expect(SG.wingSearch.UNIQUE_RECTANGLE_WORK_LIMIT).toBe(50000);
      var out = urObserved(model9, urState(model9, [[15, '34']]));
      expect(out.finding).not.toBeNull();
      expect(out.records).toEqual([{ id: 'uniqueRectangle', work: 1, limit: 50000, capHit: null, retained: null }]);
      // a type 1 or 2 is found by the first pass: the second pass does not run and reports nothing
      var first = urObserved(model9, board(model9, [[0, '12'], [8, '12'], [9, '12'], [17, '123']]));
      expect(first.finding.i18nKey).toBe('technique.uniqueRectangle.type1.step');
      expect(first.records).toEqual([]);
    });

    it('counts one unit per cell tested as the next real cell and per digit tested as a link, from a fresh counter',
      function () {
        // type 3 vector: one pool cell; an empty board: nothing to test
        expect(urObserved(model9, urState(model9, [[15, '34']])).record.work).toBe(1);
        // type 4 vector: the seven other cells of row 2 hold eight digits each, so every size k = 1 .. 7 of the type 3
        // search tests them (7 + 6 + 5 + 4 + 3 + 2 + 1 = 28 first cells, and the six deeper cells of the one chain
        // of k = 7 that the union allows: 34 units), then one digit is tested as a link: 35 units
        var link = urState(model9, []);
        dropDigit(link, 1, [10, 11, 13, 14, 15, 16, 17]);
        expect(urObserved(model9, link).record.work).toBe(35);
        expect(urUnitsOf(model9, link)).toBe(35);
        var none0 = urObserved(model9, board(model9, []));
        expect(none0.finding).toBeNull();
        expect(none0.record).toEqual({ id: 'uniqueRectangle', work: 0, limit: 50000, capHit: null, retained: null });
        // a witness three cells deep: R2C2 {5,6} and R2C3 {5,7} are tried and rejected before R2C7 {3,4}
        var deep = urState(model9, [[10, '56'], [11, '57'], [15, '34']]);
        var out = urObserved(model9, deep);
        expect(out.finding.i18nArgs.cells).toEqual(['R2C7']);
        expect(out.record.work).toBe(3);
        expect(urUnitsOf(model9, deep)).toBe(3);
        // the flood: the exact count, pinned and recounted from the rule of the header; a second call counts afresh
        var flood = flood16(1);
        var first = urObserved(model16w, flood);
        expect(first.finding).toBeNull();
        expect(first.record).toEqual({ id: 'uniqueRectangle', work: FLOOD_UNITS, limit: 50000, capHit: null, retained: null });
        expect(urUnitsOf(model16w, flood)).toBe(FLOOD_UNITS);
        var second = urObserved(model16w, flood);
        expect(second.record).toEqual(first.record);
        expect(second.record).not.toBe(first.record);
        expect(urSubtypesOf(model16w, flood)).toEqual([]);
      });

    it('is counted as the rule says on real states: every call of 120 states agrees with the recount', function () {
      var items = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(777), 120);
      var most = 0;
      var ran = 0;
      items.forEach(function (item, index) {
        var out = urObserved(model9, item.state);
        if (out.records.length === 0) {
          expect(out.finding.i18nKey).toMatch(/type[12]\.step$/);
          return;
        }
        ran++;
        expect(out.record.capHit).toBeNull();
        var recount = urUnitsOf(model9, item.state);
        if (out.record.work !== recount) fail('state #' + index + ': ' + out.record.work + ' units counted, ' + recount + ' by the rule');
        most = Math.max(most, out.record.work);
      });
      expect(ran).toBeGreaterThan(60);
      expect(most).toBeGreaterThan(5);
    });

    it('ends a call whose limit is spent with nothing found (never a finding), and says so', function () {
      var flood = flood16(1);
      [0, 1, 100, FLOOD_UNITS - 1].forEach(function (limit) {
        var out = urObserved(model16w, flood, { seam: true, limit: limit });
        expect(out.finding).toBeNull();
        expect(out.record).toEqual({ id: 'uniqueRectangle', work: limit, limit: limit, capHit: 'work', retained: null });
      });
      var exact = urObserved(model16w, flood, { seam: true, limit: FLOOD_UNITS });
      expect(exact.record).toEqual({ id: 'uniqueRectangle', work: FLOOD_UNITS, limit: FLOOD_UNITS, capHit: null, retained: null });
      // the default limit of the seam is the registered one
      expect(urObserved(model16w, flood, { seam: true }).record.limit).toBe(50000);
      // more rows, more work, still far below the limit: the call is never capped by this construction
      expect(urObserved(model16w, flood16(3)).record.work).toBe(urUnitsOf(model16w, flood16(3)));
    });

    it('is complete or empty: a witness three units deep is found at 3 and lost (capped prefix) at 2, 1 and 0', function () {
      var deep = urState(model9, [[10, '56'], [11, '57'], [15, '34']]);
      var plain = urObserved(model9, deep).finding;
      var kept = urObserved(model9, deep, { seam: true, limit: 3 });
      expect(kept.finding).toEqual(plain);
      expect(kept.record).toEqual({ id: 'uniqueRectangle', work: 3, limit: 3, capHit: null, retained: null });
      [2, 1, 0].forEach(function (limit) {
        var lost = urObserved(model9, deep, { seam: true, limit: limit });
        expect(lost.finding).toBeNull();
        expect(lost.record).toEqual({ id: 'uniqueRectangle', work: limit, limit: limit, capHit: 'work', retained: null });
      });
      // the first pass is not bounded: a type 1 is found even with a limit of 0, and then nothing is reported
      var first = urObserved(model9, board(model9, [[0, '12'], [8, '12'], [9, '12'], [17, '123']]),
        { seam: true, limit: 0 });
      expect(first.finding).not.toBeNull();
      expect(first.records).toEqual([]);
      // the same for the type 4 vector: 34 units of type 3 search, then one unit for the digit tested as a link
      var link = urState(model9, []);
      dropDigit(link, 1, [10, 11, 13, 14, 15, 16, 17]);
      expect(urObserved(model9, link, { seam: true, limit: 35 }).finding).not.toBeNull();
      expect(urObserved(model9, link, { seam: true, limit: 34 }).record)
        .toEqual({ id: 'uniqueRectangle', work: 34, limit: 34, capHit: 'work', retained: null });
      expect(urObserved(model9, link, { seam: true, limit: 34 }).finding).toBeNull();
    });

    it('floors a fractional limit and rejects an invalid one with solver.invalidOption', function () {
      var deep = urState(model9, [[10, '56'], [11, '57'], [15, '34']]);
      expect(urObserved(model9, deep, { seam: true, limit: 2.9 }).record.work).toBe(2);
      [-1, NaN, Infinity, '5', null].forEach(function (workLimit) {
        var err = thrownBy(function () { urObserved(model9, deep, { seam: true, limit: workLimit }); });
        expect([String(workLimit), err && err.code]).toEqual([String(workLimit), 'solver.invalidOption']);
        expect(err.message).toContain('wingSearch.uniqueRectangle workLimit');
      });
      var ctx = SG.techniques.createContext(model9, {});
      expect(SG.wingSearch.uniqueRectangle(model9, deep, ctx)).not.toBeNull();
      expect(SG.wingSearch.uniqueRectangle(model9, deep, ctx, null)).not.toBeNull();
      expect(SG.wingSearch.uniqueRectangle(model9, deep, ctx, {})).not.toBeNull();
    });

    /**
     * The work done at each check of the parent budget of the second pass: a context whose k-th check throws a spent
     * budget lets the record of the (swallowed) call tell how many units were spent at that check. The first pass has
     * checks of its own (one per 64 rectangles, and it lets a budget error through), which are skipped: they are the
     * checks of a call with a limit of 0 less its entry check.
     */
    function checkWorks(model, state, limit) {
      var base = SG.techniques.createContext(model, {});
      function attempt(target, workLimit) {
        var k = 0;
        var record = null;
        var ctx = Object.assign({}, base, {
          options: { onPatternWork: function (r) { record = r; } },
          check: function () {
            k++;
            if (k === target) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' });
          }
        });
        var finding = SG.wingSearch.uniqueRectangle(model, state, ctx, workLimit === undefined ? undefined : { workLimit: workLimit });
        return { checks: k, record: record, finding: finding };
      }
      var firstPass = attempt(0, 0).checks - 1;
      var free = attempt(0, limit);
      var works = [];
      for (var target = firstPass + 1; target <= free.checks; target++) {
        var spent = attempt(target, limit);
        expect(spent.finding).toBeNull();
        expect(spent.record.capHit).toBeNull();
        works.push(spent.record.work);
      }
      var gaps = works.map(function (w, i) { return w - (i === 0 ? 0 : works[i - 1]); });
      gaps.push(free.record.work - works[works.length - 1]);
      return { works: works, max: Math.max.apply(null, gaps), free: free, firstPass: firstPass };
    }

    it('checks the parent budget at the entry of the second pass and so that at most 256 units pass between two checks',
      function () {
        var out = checkWorks(model16w, flood16(1));
        var cadence = [];
        for (var w = 0; w < FLOOD_UNITS; w += 256) cadence.push(w);
        expect(out.works).toEqual(cadence);
        expect(out.works).toHaveLength(23);
        expect(out.max).toBeLessThanOrEqual(256);
        // the first pass checks once per 64 rectangles of the board, as before
        expect(out.firstPass).toBe(Math.ceil(urRectangles(model16w).length / 64));
        // a call that ends at its limit keeps the same cadence
        expect(checkWorks(model16w, flood16(1), 300).works).toEqual([0, 256]);
        // a small call has only the entry check
        expect(checkWorks(model9, urState(model9, [[15, '34']])).works).toEqual([0]);
      });

    it('reports a spent budget of the second pass as nothing found and lets cancellation and other errors through',
      function () {
        var flood = flood16(1);
        var firstPass = checkWorks(model16w, flood).firstPass;
        var parent = SG.budget.create({ nodes: firstPass + 1 });
        var spent = urObserved(model16w, flood, { ctx: { budget: parent } });
        expect(spent.finding).toBeNull();
        expect(spent.records).toHaveLength(1);
        expect(spent.record.capHit).toBeNull();
        expect(spent.record.work).toBeLessThan(FLOOD_UNITS);
        // capHit null is no proof of a complete scan: the caller's budget still fails after the call
        expect(thrownBy(function () { parent.check(); }).code).toBe('budget.exceeded');

        var cancelled = SG.budget.create({});
        cancelled.cancel();
        var records = [];
        var err = thrownBy(function () {
          SG.techniques.get('uniqueRectangle').find(model16w, flood, SG.techniques.createContext(model16w, {
            budget: cancelled, onPatternWork: function (r) { records.push(r); } }));
        });
        expect(err.code).toBe('budget.cancelled');
        expect(records).toEqual([]);

        // cancellation in the middle of the second pass, and an error that is not a budget error
        [['budget.cancelled', true], ['boom', false]].forEach(function (kind) {
          var k = 0;
          var ctx = Object.assign({}, SG.techniques.createContext(model16w, {}), {
            check: function () {
              if (++k === firstPass + 2) {
                throw kind[1] ? new SG.errors.GenerationError(kind[0], { reason: 'cancelled' }) : new Error(kind[0]);
              }
            }
          });
          var thrown = thrownBy(function () { SG.techniques.get('uniqueRectangle').find(model16w, flood, ctx); });
          expect(thrown).toBeTruthy();
          expect(kind[1] ? thrown.code : thrown.message).toBe(kind[0]);
          expect(k).toBe(firstPass + 2);
        });
      });

    it('is not fooled by a hostile or absent observer', function () {
      var state = urState(model9, [[15, '34']]);
      var plain = JSON.stringify(urFind(model9, state));
      ['not a function', null, 7].forEach(function (observer) {
        expect(JSON.stringify(urFind(model9, state, { onPatternWork: observer }))).toBe(plain);
      });
    });

    it('leaves no mark behind: a call after a capped or budget-spent call answers like a fresh one', function () {
      var state = urState(model9, [[10, '56'], [11, '57'], [15, '34']]);
      var fresh = JSON.stringify(urFind(model9, state));
      var flood = flood16(1);
      urObserved(model16w, flood, { seam: true, limit: 500 });
      urObserved(model9, state, { seam: true, limit: 2 });
      urObserved(model9, state, { ctx: { budget: SG.budget.create({ nodes: checkWorks(model9, state).firstPass }) } });
      expect(JSON.stringify(urFind(model9, state))).toBe(fresh);
      expect(urObserved(model9, state).record.work).toBe(3);
    });
  });

  describe('uniqueRectangle (R14): agreement with an independent enumeration', function () {
    var cache = {};

    function itemsOf(model, count, seed) {
      var key = model.variantId + '/' + model.digits + '/' + seed;
      if (!cache[key]) cache[key] = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), count);
      return cache[key].slice(0, count);
    }

    /**
     * Walks the states: the finder finds something exactly when the enumeration does, its Finding is the first one field
     * by field, a call never spends its limit, and the Finding is applied (with the singles it unlocks) before the next
     * call. Returns the number of Findings by subtype.
     */
    function walk(model, count, seed, maxSteps) {
      var found = { 3: 0, 4: 0, other: 0 };
      itemsOf(model, count, seed).forEach(function (item, index) {
        var state = SG.model.cloneState(item.state);
        for (var step = 0; step < maxSteps && state.unsolvedCount > 0; step++) {
          var out = urObserved(model, state, { seam: true, limit: 100000000 });
          if (out.record && out.record.capHit !== null) fail('uniqueRectangle spent its limit on state #' + index);
          var wanted = ORACLE.uniqueRectangle.exists(model, state);
          if ((out.finding !== null) !== wanted) {
            fail('uniqueRectangle ' + (out.finding !== null ? 'found' : 'missed') + ' a pattern the enumeration ' +
              (wanted ? 'sees' : 'does not see') + ' on state #' + index + ' step ' + step + '\n  puzzle: ' +
              H.puzzleString(model, item.givens) + '\n  finding: ' + JSON.stringify(out.finding));
          }
          if (out.finding === null) break;
          ORACLE.uniqueRectangle.verify(model, state, out.finding);
          var key = /type([34])\.step$/.exec(out.finding.i18nKey);
          found[key ? key[1] : 'other']++;
          if (!apply(model, state, out.finding)) fail('uniqueRectangle led to a contradiction on state #' + index);
        }
      });
      return found;
    }

    [['classic9', 300, 20260101, 40, 6, 5], ['classic9', 300, 777, 12, 10, 12], ['classic9', 300, 99, 12, 8, 6],
      ['classic6', 200, 20260101, 40, 3, 2], ['classic4', 300, 20260101, 40, 1, 5]].forEach(function (setup) {
      it('agrees on ' + setup[0] + ' (' + setup[1] + ' states of seed ' + setup[2] + ') and fires both subtypes', function () {
        var found = walk(H.model(setup[0]), setup[1], setup[2], setup[3]);
        expect(found[3]).toBeGreaterThanOrEqual(setup[4]);
        expect(found[4]).toBeGreaterThanOrEqual(setup[5]);
      });
    });

    it('agrees on 12 digits (boxes of 3 x 4) and 16 digits (4 x 4), no 9 x 9 arithmetic', function () {
      var twelve = walk(model12, 200, 20260101, 40);
      expect(twelve[4]).toBeGreaterThanOrEqual(1);
      walk(model16, 8, 2026, 40);
    });

    // A constructed vector on every board of rows, columns and boxes: the first rectangle of the enumeration, roofs a and
    // b on its first row, the floors c and d on its second; type 3 with a real cell of the roofs' row, then type 4 with
    // the first digit of the pair confined to the roofs in that row.
    [['4 digits', model4], ['6 digits', model6], ['9 digits', model9], ['12 digits', model12],
      ['16 digits', model16]].forEach(function (setup) {
      it('finds the constructed vectors of both subtypes on ' + setup[0] + ', as the enumeration does', function () {
        var model = setup[1];
        var rect = urRectangles(model)[0];
        var roofs = [rect[0], rect[1]];
        var floors = [rect[2], rect[3]];
        var rowCells = Array.from(model.units[unitsHolding(model, roofs[0], roofs[1])[0]]).sort(byNumber)
          .filter(function (c) { return rect.indexOf(c) === -1; });
        var base = [[floors[0], '12'], [floors[1], '12'], [roofs[0], '123'], [roofs[1], '124']];
        var type3 = board(model, base.concat([[rowCells[0], '34']]));
        var f3 = check('uniqueRectangle', model, type3, {});
        expect(f3.i18nKey).toBe('technique.uniqueRectangle.type3.step');
        expect(f3.cells).toEqual(rect.concat([rowCells[0]]));
        var type4 = board(model, base);
        dropDigit(type4, 1, rowCells);
        var f4 = check('uniqueRectangle', model, type4, {});
        expect(f4.i18nKey).toBe('technique.uniqueRectangle.type4.step');
        expect(f4.i18nArgs.digit).toBe(2);
      });
    });
  });

  // 9 digits: the sweep of techniques.test.js.
  describe('wing techniques: soundness (invariant I7)', function () {
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
        // a remote pair is rare on 12 digits (one firing in these 200 states)
        H.assertSound(SG.test, id, { model: model12, count: 200, minFirings: id === 'remotePairs' ? 1 : 3 });
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
