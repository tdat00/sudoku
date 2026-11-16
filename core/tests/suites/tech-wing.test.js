// Wing techniques (../core/js/engine/tech-wing.js): Remote Pairs, XY-Wing, XYZ-Wing, WXYZ-Wing, W-Wing, Unique
// Rectangle and BUG+1.
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

  /**
   * The hidden form of the Unique Rectangle (R14, MS11b), enumerated in the same independent way (layout positions and
   * `model.units` only: never `peers`, `cellUnits`, the finder's rectangle table or its kinds). Every tested
   * (target, digit) in the order of the finder: the rectangles in their order, the corners as target in the order of the
   * rectangle, the digit of the pair ascending. A target needs the corner opposite to it to hold exactly the pair and its
   * row and its column to be complete units. A rectangle whose four corners all hold exactly the pair is the deadly pattern
   * itself and has none. `found` says that the digit is held by exactly two cells in both lines.
   */
  function urHiddenTests(model, state) {
    var L = model.layout;
    var tests = [];
    urRectangles(model).forEach(function (cells) {
      if (!cells.every(function (c) { return open(state, c); })) return;
      var masks = cells.map(function (c) { return state.candidates[c]; });
      var common = masks[0] & masks[1] & masks[2] & masks[3];
      if (SG.bits.popcount(common) !== 2 || masks.every(function (m) { return m === common; })) return;
      var digits = SG.bits.toArray(common);
      cells.forEach(function (target) {
        var sameRow = cells.filter(function (c) { return c !== target && L.cellRow[c] === L.cellRow[target]; })[0];
        var sameCol = cells.filter(function (c) { return c !== target && L.cellCol[c] === L.cellCol[target]; })[0];
        var floor = cells.filter(function (c) { return c !== target && c !== sameRow && c !== sameCol; })[0];
        if (state.candidates[floor] !== common) return;
        var rowUnit = completeLine(model, target, sameRow, 'row');
        var colUnit = completeLine(model, target, sameCol, 'col');
        if (rowUnit < 0 || colUnit < 0) return;
        digits.forEach(function (d, j) {
          tests.push({
            cells: cells, target: target, floor: floor, common: common, link: d, removed: digits[1 - j],
            rowUnit: rowUnit, colUnit: colUnit,
            found: holdersIn(model, state, rowUnit, d) === 2 && holdersIn(model, state, colUnit, d) === 2
          });
        });
      });
    });
    return tests;
  }

  /** The unit of the kind ('row' or 'col') that holds both cells and is complete, or -1. */
  function completeLine(model, a, b, kind) {
    for (var u = 0; u < model.units.length; u++) {
      var cells = model.units[u];
      if (model.unitMeta[u].kind !== kind || cells.length !== model.digits || model.unitMeta[u].partial) continue;
      if (Array.prototype.indexOf.call(cells, a) !== -1 && Array.prototype.indexOf.call(cells, b) !== -1) return u;
    }
    return -1;
  }

  /** How many cells of the unit hold the digit (a solved cell holds its own digit). */
  function holdersIn(model, state, u, digit) {
    return Array.from(model.units[u]).filter(function (c) { return has(state, c, digit); }).length;
  }

  /** Every hidden pattern of a state, in the order of the finder; with `firstOnly` only the first one. */
  function urHiddenOf(model, state, firstOnly) {
    var found = urHiddenTests(model, state).filter(function (t) { return t.found; });
    return firstOnly ? found.slice(0, 1) : found;
  }

  /** The units one call of the third pass spends, counted again from the rule: the tests up to the first pattern. */
  function urHiddenUnitsOf(model, state) {
    var tests = urHiddenTests(model, state);
    for (var i = 0; i < tests.length; i++) {
      if (tests[i].found) return i + 1;
    }
    return tests.length;
  }

  /** The Finding that a pattern of `urHiddenOf` is documented to give. */
  function urExpectedHidden(model, pattern) {
    return {
      technique: 'uniqueRectangle',
      cells: pattern.cells,
      placements: [],
      eliminations: [[pattern.target, pattern.removed]],
      i18nKey: 'technique.uniqueRectangle.hidden.step',
      i18nArgs: {
        digit: pattern.link,
        digits: SG.bits.toArray(pattern.common),
        cells: pattern.cells.map(function (c) { return H.label(model, c); })
      }
    };
  }

  /**
   * The work done at each check of the parent budget of the second and of the third pass of the finder (the seam, with
   * `limit` and `hiddenLimit` when given): a context whose k-th check throws a spent budget lets the records of the
   * (swallowed) call tell how many units were spent at that check (one record: the second pass was spent, and the third
   * did not run; two: the third pass, after a complete second pass). The first pass has checks of its own (one per 64
   * rectangles, and it lets a budget error through), which are skipped: they are the checks of a call with both limits
   * of 0 less the entry check of each pass that ran.
   */
  function urCheckWorks(model, state, limit, hiddenLimit) {
    var base = SG.techniques.createContext(model, {});
    function attempt(target, workLimit, hiddenWorkLimit) {
      var k = 0;
      var records = [];
      var ctx = Object.assign({}, base, {
        options: { onPatternWork: function (r) { records.push(r); } },
        check: function () {
          k++;
          if (k === target) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' });
        }
      });
      var finding = SG.wingSearch.uniqueRectangle(model, state, ctx, workLimit === undefined &&
        hiddenWorkLimit === undefined ? undefined : { workLimit: workLimit, hiddenWorkLimit: hiddenWorkLimit });
      return { checks: k, records: records, record: records[0], finding: finding };
    }
    var none = attempt(0, 0, 0);
    var firstPass = none.checks - none.records.length;
    var free = attempt(0, limit, hiddenLimit);
    var works = [];
    var hiddenWorks = [];
    for (var target = firstPass + 1; target <= free.checks; target++) {
      var spent = attempt(target, limit, hiddenLimit);
      expect(spent.finding).toBeNull();
      var last = spent.records[spent.records.length - 1];
      expect(last.capHit).toBeNull();
      (spent.records.length === 1 ? works : hiddenWorks).push(last.work);
    }
    function gapsOf(list, total) {
      var gaps = list.map(function (w, i) { return w - (i === 0 ? 0 : list[i - 1]); });
      if (list.length > 0) gaps.push(total - list[list.length - 1]);
      return gaps;
    }
    var second = gapsOf(works, free.record.work);
    var third = gapsOf(hiddenWorks, free.records.length > 1 ? free.records[1].work : 0);
    return { works: works, hiddenWorks: hiddenWorks, max: Math.max.apply(null, second),
      hiddenMax: third.length === 0 ? 0 : Math.max.apply(null, third), free: free, firstPass: firstPass };
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
        return urHasTypesOneTwo(model, state) || urSubtypesOf(model, state, true).length > 0 ||
          urHiddenOf(model, state, true).length > 0;
      },
      verify: function (model, state, f) {
        expect(f.cells.length).toBeGreaterThanOrEqual(4);
        expect(inTwoBoxes(model, f.cells.slice(0, 4))).toBe(true);
        if (f.i18nKey === 'technique.uniqueRectangle.hidden.step') {
          // the third pass: nothing in the first two, and the Finding is the first pattern of the hidden form
          expect(urHasTypesOneTwo(model, state)).toBe(false);
          expect(urSubtypesOf(model, state, true)).toEqual([]);
          var hidden = urHiddenOf(model, state, true);
          expect(hidden.length).toBe(1);
          expect(f).toEqual(urExpectedHidden(model, hidden[0]));
          // the target holds the removed digit, the floor opposite to it holds exactly the pair
          expect(has(state, hidden[0].target, hidden[0].removed)).toBe(true);
          expect(state.candidates[hidden[0].floor]).toBe(hidden[0].common);
          return;
        }
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
      ? SG.wingSearch.uniqueRectangle(model, state, ctx, options.limit === undefined && options.hiddenLimit === undefined
        ? undefined : { workLimit: options.limit, hiddenWorkLimit: options.hiddenLimit })
      : SG.techniques.get('uniqueRectangle').find(model, state, ctx);
    return { finding: finding, records: records, record: records[0], hiddenRecord: records[1] };
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

  // The hidden form of the Unique Rectangle (R14, MS11b). The vector of the brief: A = R1C1 (0) {1,2}, B = R1C4 (3) {1,2,4},
  // C = R2C1 (9) {1,2,5}, D = R2C4 (12) {1,2,3}. If the 1 is conjugate between D and C in row 2 and between D and B in column
  // 4, D cannot be 2: B and C would be 1, A would be 2 and the four corners the forbidden rectangle. The corner opposite to
  // the target holds exactly the pair, the digit of the links is the other digit of the Finding's `digit` argument.
  var HID_BASE = [[0, '12'], [3, '124'], [9, '125'], [12, '123']];
  var HID_ROW = [10, 11, 13, 14, 15, 16, 17];
  var HID_COL = [21, 30, 39, 48, 57, 66, 75];

  /** The vector's board with `digit` confined to the two corners in row 2 and in column 4 (only `sides` when given). */
  function hiddenState(model, digit, sides) {
    var state = board(model, HID_BASE);
    if (!sides || sides.indexOf('row') !== -1) dropDigit(state, digit, HID_ROW);
    if (!sides || sides.indexOf('column') !== -1) dropDigit(state, digit, HID_COL);
    return state;
  }

  /** The cells of the unit of the kind ('row' or 'col') that holds both cells, apart from the two. */
  function lineOthers(model, a, b, kind) {
    var holding = unitsHolding(model, a, b).filter(function (u) { return model.unitMeta[u].kind === kind; });
    if (holding.length !== 1) throw new Error('cells ' + a + ' and ' + b + ' share ' + holding.length + ' units of ' + kind);
    return Array.from(model.units[holding[0]]).filter(function (c) { return c !== a && c !== b; });
  }

  /**
   * A hidden form on the rectangle `rect` = [a, b, c, d] (the order of the finder: a and b share a row, a and c a
   * column, d is opposite to a) with the corner `t` as target: the opposite corner holds {1,2}, the target {1,2,3}, its row
   * neighbour {1,2,4} and its column neighbour {1,2,3}; the 1 is confined to the target and each neighbour in their line.
   */
  function hiddenBoard(model, rect, t, digit) {
    var floor = rect[t ^ 3];
    var rowMate = rect[t ^ 1];
    var colMate = rect[t ^ 2];
    var state = board(model, [[floor, '12'], [rect[t], '123'], [rowMate, '124'], [colMate, '123']]);
    dropDigit(state, digit || 1, lineOthers(model, rect[t], rowMate, 'row'));
    dropDigit(state, digit || 1, lineOthers(model, rect[t], colMate, 'col'));
    return state;
  }

  /** The same model with the units of the given labels marked partial (a unit of nine cells that is not a complete one). */
  function withPartial(model, id, labels) {
    var units = Array.prototype.map.call(model.units, function (u) { return Array.from(u); });
    var meta = model.unitMeta.map(function (m) {
      return Object.assign({}, m, labels.indexOf(m.label) !== -1 ? { partial: true } : {});
    });
    return SG.model.create({
      variantId: id,
      digits: model.digits,
      units: units,
      unitMeta: meta,
      layout: {
        rows: model.layout.rows,
        cols: model.layout.cols,
        cellRow: model.layout.cellRow,
        cellCol: model.layout.cellCol,
        cellRegion: model.layout.cellRegion
      }
    });
  }

  /** The same model with one more unit listed FIRST (before the rows), so that its index is the lowest of the model. */
  function withLeadingUnit(model, id, cells, meta) {
    var units = [cells].concat(Array.prototype.map.call(model.units, function (u) { return Array.from(u); }));
    var metas = [meta].concat(model.unitMeta.map(function (m) { return Object.assign({}, m); }));
    return SG.model.create({
      variantId: id,
      digits: model.digits,
      units: units,
      unitMeta: metas,
      layout: {
        rows: model.layout.rows,
        cols: model.layout.cols,
        cellRow: model.layout.cellRow,
        cellCol: model.layout.cellCol,
        cellRegion: model.layout.cellRegion
      }
    });
  }

  describe('uniqueRectangle (R14): the hidden form, a conjugate link on each side of the target', function () {
    it('the vector: the 1 only at R2C1 and R2C4 in row 2 and at R1C4 and R2C4 in column 4 removes 2 from R2C4', function () {
      var f = check('uniqueRectangle', model9, hiddenState(model9, 1), {
        cells: ['R1C1', 'R1C4', 'R2C1', 'R2C4'],
        eliminations: [['R2C4', 2]],
        args: { digit: 1, digits: [1, 2], cells: ['R1C1', 'R1C4', 'R2C1', 'R2C4'] }
      });
      expect(f.cells).toEqual([0, 3, 9, 12]);
      expect(f.placements).toEqual([]);
      expect(f.technique).toBe('uniqueRectangle');
      expect(f.i18nKey).toBe('technique.uniqueRectangle.hidden.step');
      expect(Object.keys(f.i18nArgs)).toEqual(['digit', 'digits', 'cells']);
      expect(JSON.parse(JSON.stringify(f.i18nArgs))).toEqual(f.i18nArgs);
    });

    it('swapped digit roles: with the 2 as the digit of the links the 1 leaves R2C4', function () {
      check('uniqueRectangle', model9, hiddenState(model9, 2), {
        eliminations: [['R2C4', 1]],
        args: { digit: 2, digits: [1, 2], cells: ['R1C1', 'R1C4', 'R2C1', 'R2C4'] }
      });
    });

    it('both digits are links: the lower digit of the pair is the digit of the links, the higher one is removed', function () {
      var state = hiddenState(model9, 1);
      dropDigit(state, 2, HID_ROW.concat(HID_COL));
      var f = check('uniqueRectangle', model9, state, {
        eliminations: [['R2C4', 2]],
        args: { digit: 1, digits: [1, 2] }
      });
      expect(f.cells).toEqual([0, 3, 9, 12]);
    });

    it('the transposed vector: the links in row 4 and column 2, the rectangle with its upper corners in one box', function () {
      // A = R1C1 {1,2}, the corners R1C2 {1,2,5} and R4C1 {1,2,4}, the target R4C2 {1,2,3}
      var state = board(model9, [[0, '12'], [1, '125'], [27, '124'], [28, '123']]);
      dropDigit(state, 1, [29, 30, 31, 32, 33, 34, 35]);
      dropDigit(state, 1, [10, 19, 37, 46, 55, 64, 73]);
      var f = check('uniqueRectangle', model9, state, {
        eliminations: [['R4C2', 2]],
        args: { digit: 1, digits: [1, 2], cells: ['R1C1', 'R1C2', 'R4C1', 'R4C2'] }
      });
      expect(f.cells).toEqual([0, 1, 27, 28]);
    });

    it('every corner can be the target, the floor is always the corner opposite to it', function () {
      var rect = [0, 3, 9, 12];
      rect.forEach(function (target, t) {
        var f = check('uniqueRectangle', model9, hiddenBoard(model9, rect, t), { eliminations: [[target, 2]] });
        expect(f.cells).toEqual(rect);
        expect(f.i18nArgs.digit).toBe(1);
      });
    });

    it('the target already holds only the pair when the floor opposite to it does: the 2 leaves it', function () {
      // A and D hold exactly {1,2}, B and C have extras: no corner needs an extra digit for the proof, only the four
      // corners must not all be the bare pair
      var state = board(model9, [[0, '12'], [3, '124'], [9, '125'], [12, '12']]);
      dropDigit(state, 1, HID_ROW.concat(HID_COL));
      var f = check('uniqueRectangle', model9, state, { eliminations: [['R2C4', 2]], args: { digit: 1 } });
      expect(f.cells).toEqual([0, 3, 9, 12]);
    });

    it('determinism and purity: the same Finding again, a mutated copy changes nothing, the state is never written',
      function () {
        var state = hiddenState(model9, 1);
        var before = JSON.stringify([Array.from(state.candidates), Array.from(state.value)]);
        var first = urFind(model9, state);
        first.cells.push(99);
        first.eliminations.push([1, 1]);
        first.i18nArgs.cells.push('R9C9');
        first.i18nArgs.digits.push(9);
        var second = urFind(model9, state);
        expect(second).toEqual(urExpectedHidden(model9, urHiddenOf(model9, state, true)[0]));
        expect(second.cells).toEqual([0, 3, 9, 12]);
        expect(JSON.stringify([Array.from(state.candidates), Array.from(state.value)])).toBe(before);
        expect(second.eliminations).not.toBe(first.eliminations);
        expect(second.i18nArgs.digits).toEqual([1, 2]);
      });
  });

  describe('uniqueRectangle (R14): the hidden form, near misses', function () {
    it('a third occurrence of the digit in row 2, or in column 4, breaks that link', function () {
      var inRow = hiddenState(model9, 1);
      inRow.candidates[15] |= bit(1);
      checkNone('uniqueRectangle', model9, inRow);
      var inColumn = hiddenState(model9, 1);
      inColumn.candidates[39] |= bit(1);
      checkNone('uniqueRectangle', model9, inColumn);
    });

    it('one link is not enough: only the row, or only the column, is conjugate', function () {
      checkNone('uniqueRectangle', model9, hiddenState(model9, 1, ['row']));
      checkNone('uniqueRectangle', model9, hiddenState(model9, 1, ['column']));
    });

    it('a solved 1 in the row or in the column is a third occurrence of the digit: the link is gone', function () {
      var inRow = hiddenState(model9, 1);
      solveCell(inRow, 17, 1);
      checkNone('uniqueRectangle', model9, inRow);
      var inColumn = hiddenState(model9, 1);
      solveCell(inColumn, 75, 1);
      checkNone('uniqueRectangle', model9, inColumn);
    });

    it('the links must be around the target whose opposite corner holds the pair: links around R1C4 find nothing',
      function () {
        // the 1 only at R1C1 and R1C4 in row 1 and at R1C4 and R2C4 in column 4: the target would be R1C4, but the
        // corner opposite to it, R2C1, holds {1,2,5}
        var state = board(model9, HID_BASE);
        dropDigit(state, 1, [1, 2, 4, 5, 6, 7, 8]);
        dropDigit(state, 1, HID_COL);
        checkNone('uniqueRectangle', model9, state);
        // the links around R2C4 with the pair in R1C4 instead of R1C1: R2C4 is opposite to R1C1 {1,2,4}
        var wrongFloor = board(model9, [[0, '124'], [3, '12'], [9, '125'], [12, '123']]);
        dropDigit(wrongFloor, 1, HID_ROW.concat(HID_COL));
        checkNone('uniqueRectangle', model9, wrongFloor);
      });

    it('the corner opposite to the target must hold exactly the pair: three digits in it find nothing', function () {
      var state = board(model9, [[0, '123'], [3, '124'], [9, '125'], [12, '123']]);
      dropDigit(state, 1, HID_ROW.concat(HID_COL));
      checkNone('uniqueRectangle', model9, state);
    });

    it('all four corners hold exactly the pair: the deadly pattern itself, no deduction', function () {
      var state = board(model9, [[0, '12'], [3, '12'], [9, '12'], [12, '12']]);
      dropDigit(state, 1, HID_ROW.concat(HID_COL));
      checkNone('uniqueRectangle', model9, state);
      // the rectangle itself has no tested pair (other rectangles that hold one of the four cells have)
      expect(urHiddenTests(model9, state).filter(function (t) { return t.cells.join() === '0,3,9,12'; })).toEqual([]);
    });

    it('every corner holds both digits of the pair: a corner without one of them is no rectangle of one pair', function () {
      [[3, '14'], [9, '15'], [12, '13']].forEach(function (corner) {
        var state = hiddenState(model9, 1);
        state.candidates[corner[0]] = maskOf(corner[1]);
        checkNone('uniqueRectangle', model9, state);
      });
    });

    it('a solved corner is no rectangle (whatever its mask: a corner is open when its value is not set)', function () {
      var state = hiddenState(model9, 1);
      solveCell(state, 12, 3);
      checkNone('uniqueRectangle', model9, state);
      // a value that is set without the candidates of the cell collapsed to it: the cell is solved all the same
      var marked = hiddenState(model9, 1);
      marked.value[12] = 3;
      checkNone('uniqueRectangle', model9, marked);
      expect(urHiddenTests(model9, marked).filter(function (t) { return t.cells.join() === '0,3,9,12'; })).toEqual([]);
    });

    it('the corners hold exactly two digits in common: one common digit, or three, is no pair', function () {
      // one common digit: the floor holds only the 1 (a cell with a single candidate that is not yet placed)
      var single = board(model9, [[0, '1'], [3, '12'], [9, '12'], [12, '12']]);
      dropDigit(single, 1, HID_ROW.concat(HID_COL));
      checkNone('uniqueRectangle', model9, single);
      // three common digits, the floor holding exactly those three
      var triple = board(model9, [[0, '123'], [3, '1234'], [9, '1235'], [12, '1236']]);
      dropDigit(triple, 1, HID_ROW.concat(HID_COL));
      checkNone('uniqueRectangle', model9, triple);
    });

    it('the links are in the row and the column, a conjugate pair in a box is no link', function () {
      // rectangle R1C1, R1C2, R4C1, R4C2: R4C2 and R4C1 share row 4 and box 4, R4C2 and R1C2 column 2. The 1 is
      // confined to the pair of cells in the box (and in the column), not in the row
      var state = board(model9, [[0, '12'], [1, '125'], [27, '124'], [28, '123']]);
      dropDigit(state, 1, [29, 36, 37, 38, 45, 46, 47]);
      dropDigit(state, 1, [10, 19, 37, 46, 55, 64, 73]);
      checkNone('uniqueRectangle', model9, state);
      // confined in the row instead: a link
      var inRow = board(model9, [[0, '12'], [1, '125'], [27, '124'], [28, '123']]);
      dropDigit(inRow, 1, [29, 30, 31, 32, 33, 34, 35]);
      dropDigit(inRow, 1, [10, 19, 37, 46, 55, 64, 73]);
      check('uniqueRectangle', model9, inRow, { eliminations: [['R4C2', 2]] });
    });

    it('a partial row or column is no conjugate link, the same units complete are', function () {
      var state = hiddenState(model9, 1);
      check('uniqueRectangle', model9, state, { eliminations: [['R2C4', 2]] });
      var partialRow = withPartial(model9, 'test-partial-row', ['R2']);
      checkNone('uniqueRectangle', partialRow, state);
      checkNone('uniqueRectangle', withPartial(model9, 'test-partial-column', ['C4']), state);
      // the targets whose row is the partial one are not tested at all (the rectangle has none of its own)
      expect(urHiddenTests(partialRow, state).filter(function (t) { return t.cells.join() === '0,3,9,12'; })).toEqual([]);
    });

    it('a model with cages or inequalities never gets a hidden form', function () {
      var state = hiddenState(model9, 1);
      var caged = rebuild(model9, 'test-cages', { cages: [{ cells: [20, 21], sum: 3 }] });
      var signs = rebuild(model9, 'test-signs', { inequalities: [{ a: 40, b: 41 }] });
      none('uniqueRectangle', caged, state);
      none('uniqueRectangle', signs, state);
      check('uniqueRectangle', model9, state, {});
    });

    it('assumeUniqueness: false skips the hidden form too, with no work record at all', function () {
      var state = hiddenState(model9, 1);
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

  describe('uniqueRectangle (R14): the hidden form, order and the passes before it', function () {
    // a second rectangle R7C5, R7C8, R8C5, R8C8 (58, 61, 67, 70) in other rows and columns than the vector
    var RECT_B = [58, 61, 67, 70];
    var ROW8_OTHERS = [63, 64, 65, 66, 68, 69, 71];

    it('types 1 and 2 keep their priority: a type 1 on a later rectangle beats the hidden form on an earlier one', function () {
      var state = hiddenState(model9, 1);
      state.candidates[64] = maskOf('12');
      state.candidates[67] = maskOf('12');
      state.candidates[73] = maskOf('12');
      state.candidates[76] = maskOf('125');
      expect(urHiddenOf(model9, state, true)).toHaveLength(1);
      var f = check('uniqueRectangle', model9, state, { cells: ['R8C2', 'R8C5', 'R9C2', 'R9C5'] });
      expect(f.i18nKey).toBe('technique.uniqueRectangle.type1.step');
      expect(urObserved(model9, state).records).toEqual([]);
    });

    it('types 3 and 4 come first too, whatever the order of the rectangles: the pass is complete before the hidden one',
      function () {
        var type3 = hiddenState(model9, 1);
        [[58, '12'], [61, '12'], [67, '123'], [70, '124'], [63, '34']].forEach(function (e) {
          type3.candidates[e[0]] = maskOf(e[1]);
        });
        expect(urHiddenOf(model9, type3, true)).toHaveLength(1);
        var f = check('uniqueRectangle', model9, type3, {});
        expect(f.i18nKey).toBe('technique.uniqueRectangle.type3.step');
        expect(f.cells.slice(0, 4)).toEqual(RECT_B);
        var type4 = hiddenState(model9, 1);
        [[58, '12'], [61, '12'], [67, '123'], [70, '124']].forEach(function (e) {
          type4.candidates[e[0]] = maskOf(e[1]);
        });
        dropDigit(type4, 1, ROW8_OTHERS);
        var g = check('uniqueRectangle', model9, type4, {});
        expect(g.i18nKey).toBe('technique.uniqueRectangle.type4.step');
        expect(g.i18nArgs.unit).toBe('R8');
        // without them the hidden form is the first Finding, and the second pass has run (its record comes first)
        var out = urObserved(model9, hiddenState(model9, 1));
        expect(out.finding.i18nKey).toBe('technique.uniqueRectangle.hidden.step');
        expect(out.records).toHaveLength(2);
      });

    it('the rectangles in the order of the first pass: the hidden form on the first one wins, then the second one', function () {
      var both = hiddenState(model9, 1);
      [[58, '12'], [61, '124'], [67, '125'], [70, '123']].forEach(function (e) { both.candidates[e[0]] = maskOf(e[1]); });
      dropDigit(both, 1, ROW8_OTHERS.concat([7, 16, 25, 34, 43, 52, 79]));
      expect(urHiddenOf(model9, both).map(function (p) { return p.cells[0]; })).toEqual([0, 58]);
      var f = check('uniqueRectangle', model9, both, {});
      expect(f.cells).toEqual([0, 3, 9, 12]);
      var onlyB = board(model9, [[58, '12'], [61, '124'], [67, '125'], [70, '123']]);
      dropDigit(onlyB, 1, ROW8_OTHERS.concat([7, 16, 25, 34, 43, 52, 79]));
      var g = check('uniqueRectangle', model9, onlyB, { eliminations: [['R8C8', 2]] });
      expect(g.cells).toEqual(RECT_B);
    });

    it('in one rectangle the targets come in the order of its corners, and the lower digit of the pair first', function () {
      // A and D hold exactly the pair; the 1 is confined in the lines of A and in the lines of D: A is the first target
      var state = board(model9, [[0, '12'], [3, '124'], [9, '125'], [12, '12']]);
      dropDigit(state, 1, [1, 2, 4, 5, 6, 7, 8, 18, 27, 36, 45, 54, 63, 72]);
      dropDigit(state, 1, HID_ROW.concat(HID_COL));
      expect(urHiddenOf(model9, state).map(function (p) { return p.target; })).toEqual([0, 12]);
      check('uniqueRectangle', model9, state, { eliminations: [['R1C1', 2]], args: { digit: 1 } });
      // the 2 confined as well, in the lines of both targets: the digit 1 is still tried first
      dropDigit(state, 2, [1, 2, 4, 5, 6, 7, 8, 18, 27, 36, 45, 54, 63, 72]);
      dropDigit(state, 2, HID_ROW.concat(HID_COL));
      expect(urHiddenOf(model9, state).map(function (p) { return p.link + ':' + p.target; }))
        .toEqual(['1:0', '2:0', '1:12', '2:12']);
      check('uniqueRectangle', model9, state, { eliminations: [['R1C1', 2]], args: { digit: 1 } });
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

  describe('uniqueRectangle (R14): the hidden form on other unit shapes and sizes', function () {
    [['4 digits', model4], ['6 digits', model6], ['9 digits', model9], ['12 digits', model12],
      ['16 digits', model16]].forEach(function (setup) {
      it('finds the constructed vector on ' + setup[0] + ' for every corner as the target, as the enumeration does',
        function () {
          var model = setup[1];
          var rect = urRectangles(model)[0];
          rect.forEach(function (target, t) {
            var state = hiddenBoard(model, rect, t);
            var f = check('uniqueRectangle', model, state, { eliminations: [[target, 2]] });
            expect(f.i18nKey).toBe('technique.uniqueRectangle.hidden.step');
            expect(f.cells).toEqual(rect);
            expect(f.i18nArgs).toEqual({ digit: 1, digits: [1, 2], cells: rect.map(function (c) { return H.label(model, c); }) });
            // the other digit as the digit of the links
            var swapped = hiddenBoard(model, rect, t, 2);
            check('uniqueRectangle', model, swapped, { eliminations: [[target, 1]], args: { digit: 2 } });
          });
        });
    });

    it('a 4x4 jigsaw rectangle: the links are in the row and the column, not in a region', function () {
      var jigsaw = jigsawModel();
      // rectangle [1, 3, 5, 7]: R1C2 and R2C2 share region Z1, R1C4 and R2C4 region Z2; target R2C4, floor R1C2
      var rect = [1, 3, 5, 7];
      var f = check('uniqueRectangle', jigsaw, hiddenBoard(jigsaw, rect, 3), {
        cells: ['R1C2', 'R1C4', 'R2C2', 'R2C4'],
        eliminations: [['R2C4', 2]],
        args: { digit: 1, digits: [1, 2], cells: ['R1C2', 'R1C4', 'R2C2', 'R2C4'] }
      });
      expect(f.cells).toEqual(rect);
      // a conjugate pair in each region (the 1 only at R1C2 and R2C2 in Z1 and at R1C4 and R2C4 in Z2) is no link
      var inRegion = board(jigsaw, [[1, '12'], [3, '123'], [5, '124'], [7, '123']]);
      dropDigit(inRegion, 1, [0, 2, 6, 11]);
      checkNone('uniqueRectangle', jigsaw, inRegion);
    });

    it('a diagonal that holds only one corner breaks the deadly pattern for the hidden form too (Sudoku X)', function () {
      var diagonal = [];
      for (var i = 0; i < 9; i++) diagonal.push(at(model9, i, i));
      var sudokuX = rebuild(model9, 'test-x', { units: [{ cells: diagonal, meta: { kind: 'diag', label: 'D1' } }] });
      var state = hiddenState(model9, 1);
      none('uniqueRectangle', sudokuX, state);
      check('uniqueRectangle', model9, state, {});
    });

    it('a unit of the rectangle that holds exactly two corners keeps the pattern: an extra unit through R2C1 and R2C4',
      function () {
        var extra = rebuild(model9, 'test-two', { units: [{ cells: [9, 12, 28, 42, 50, 60, 70, 80, 2],
          meta: { kind: 'diag', gridIndex: 0, label: 'D2' } }] });
        var f = check('uniqueRectangle', extra, hiddenState(extra, 1), { eliminations: [['R2C4', 2]] });
        expect(f.i18nKey).toBe('technique.uniqueRectangle.hidden.step');
      });

    it('the links are the row and the column even when another unit of two corners is listed first', function () {
      // an extra unit through the two corners R2C1 and R2C4 (or R1C4 and R2C4), listed BEFORE the rows: the 1 is confined
      // to the two corners in it, while the real row (or column) still has other 1s: no link, whatever the unit order
      var rowUnit = [9, 12, 28, 42, 50, 60, 70, 80, 2];
      var viaRow = withLeadingUnit(model9, 'test-lead-row', rowUnit, { kind: 'diag', gridIndex: 0, label: 'D2' });
      var stateRow = hiddenState(viaRow, 1, ['column']);
      dropDigit(stateRow, 1, [28, 42, 50, 60, 70, 80, 2]);
      checkNone('uniqueRectangle', viaRow, stateRow);
      var colUnit = [3, 12, 31, 41, 49, 59, 69, 79, 22];
      var viaCol = withLeadingUnit(model9, 'test-lead-col', colUnit, { kind: 'diag', gridIndex: 0, label: 'D3' });
      var stateCol = hiddenState(viaCol, 1, ['row']);
      dropDigit(stateCol, 1, [31, 41, 49, 59, 69, 79, 22]);
      checkNone('uniqueRectangle', viaCol, stateCol);
      // with the real row and column confined the same models give the Finding
      check('uniqueRectangle', viaRow, hiddenState(viaRow, 1), { eliminations: [['R2C4', 2]] });
      check('uniqueRectangle', viaCol, hiddenState(viaCol, 1), { eliminations: [['R2C4', 2]] });
    });

    it('the layout rows of a multi-grid board are no units: the links are the rows and columns of the first grid',
      function () {
        var samurai = SG.testkit.hasVariant('samurai') ? H.model('samurai') : null;
        if (samurai === null) SG.test.skip('no samurai board can be built here');
        var at1 = function (r, c) { return byLayout(samurai, r, c); };
        var rect = [at1(0, 0), at1(0, 3), at1(1, 0), at1(1, 3)];
        var f = check('uniqueRectangle', samurai, hiddenBoard(samurai, rect, 3), { eliminations: [[rect[3], 2]] });
        expect(f.cells).toEqual(rect);
        // a 1 in the same layout row of the second grid holds no place of the first grid's row unit: the link stays
        var twin = hiddenBoard(samurai, rect, 3);
        expect(sees(samurai, rect[3], at1(1, 12))).toBe(false);
        expect(has(twin, at1(1, 12), 1)).toBe(true);
        check('uniqueRectangle', samurai, twin, { eliminations: [[rect[3], 2]] });
      });
  });

  describe('uniqueRectangle (R14): the hidden form, work limit, budget and cancellation', function () {
    var model16h = model16;
    // three columns (1, 4 and 7) of nine cells that hold exactly {1,2}: with a rectangle of two or three exact cells in
    // them, the second pass spends 756 units and the third 1,080, and no pattern is found
    var PAIR_COLUMNS_SECOND = 756;
    var PAIR_COLUMNS_THIRD = 1080;

    function pairColumns(columns) {
      var state = SG.model.initState(model9);
      for (var r = 0; r < 9; r++) columns.forEach(function (c) { state.candidates[r * 9 + c] = maskOf('12'); });
      return state;
    }

    it('has R10\'s limit of 50000 of its own, and every bounded pass that runs reports a record, the second one first',
      function () {
        expect(SG.wingSearch.UNIQUE_RECTANGLE_HIDDEN_WORK_LIMIT).toBe(50000);
        var out = urObserved(model9, hiddenState(model9, 1));
        expect(out.finding.i18nKey).toBe('technique.uniqueRectangle.hidden.step');
        expect(out.records).toEqual([
          { id: 'uniqueRectangle', work: 0, limit: 50000, capHit: null, retained: null },
          { id: 'uniqueRectangle', work: 25, limit: 50000, capHit: null, retained: null }]);
        expect(out.records[0]).not.toBe(out.records[1]);
        // a pattern of the second pass ends the call: the third pass does not run and reports nothing
        expect(urObserved(model9, urState(model9, [[15, '34']])).records).toHaveLength(1);
        // nothing at all: both passes ran, nothing was tested
        var empty = urObserved(model9, board(model9, []));
        expect(empty.finding).toBeNull();
        expect(empty.records.map(function (r) { return [r.work, r.limit, r.capHit]; }))
          .toEqual([[0, 50000, null], [0, 50000, null]]);
      });

    it('counts one unit per tested (target, digit) from a fresh counter, as the rule says', function () {
      var vector = hiddenState(model9, 1);
      expect(urObserved(model9, vector).hiddenRecord.work).toBe(25);
      expect(urHiddenUnitsOf(model9, vector)).toBe(25);
      // the second call counts afresh
      expect(urObserved(model9, vector).hiddenRecord).toEqual(urObserved(model9, vector).hiddenRecord);
      // a target whose opposite corner is not the bare pair, or whose line is not a complete unit, costs nothing and
      // finds nothing: with the row R2 partial the vector has no pattern and every other test is made
      var partial = withPartial(model9, 'test-partial-row', ['R2']);
      var partialOut = urObserved(partial, vector);
      expect(partialOut.finding).toBeNull();
      expect(partialOut.hiddenRecord.work).toBe(urHiddenUnitsOf(partial, vector));
      expect(partialOut.hiddenRecord.work).toBe(urHiddenTests(partial, vector).length);
      // the flood: pinned and recounted from the rule, in both passes
      var flood = pairColumns([0, 3, 6]);
      var out = urObserved(model9, flood);
      expect(out.finding).toBeNull();
      expect(out.records).toEqual([
        { id: 'uniqueRectangle', work: PAIR_COLUMNS_SECOND, limit: 50000, capHit: null, retained: null },
        { id: 'uniqueRectangle', work: PAIR_COLUMNS_THIRD, limit: 50000, capHit: null, retained: null }]);
      expect(urUnitsOf(model9, flood)).toBe(PAIR_COLUMNS_SECOND);
      expect(urHiddenUnitsOf(model9, flood)).toBe(PAIR_COLUMNS_THIRD);
      expect(urHiddenOf(model9, flood)).toEqual([]);
    });

    it('is counted as the rule says on real states: every call of 120 states agrees with the recount', function () {
      var items = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(777), 120);
      var ran = 0;
      var most = 0;
      items.forEach(function (item, index) {
        var out = urObserved(model9, item.state);
        if (out.records.length < 2) return;
        ran++;
        expect(out.hiddenRecord.capHit).toBeNull();
        var recount = urHiddenUnitsOf(model9, item.state);
        if (out.hiddenRecord.work !== recount) {
          fail('state #' + index + ': ' + out.hiddenRecord.work + ' units counted, ' + recount + ' by the rule');
        }
        most = Math.max(most, out.hiddenRecord.work);
      });
      expect(ran).toBeGreaterThan(40);
      expect(most).toBeGreaterThan(5);
    });

    it('ends the pass whose limit is spent with nothing found (never a finding), and says so', function () {
      var flood = pairColumns([0, 3, 6]);
      [0, 1, 100, PAIR_COLUMNS_THIRD - 1].forEach(function (limit) {
        var out = urObserved(model9, flood, { seam: true, hiddenLimit: limit });
        expect(out.finding).toBeNull();
        expect(out.record.work).toBe(PAIR_COLUMNS_SECOND);
        expect(out.hiddenRecord).toEqual({ id: 'uniqueRectangle', work: limit, limit: limit, capHit: 'work', retained: null });
      });
      var exact = urObserved(model9, flood, { seam: true, hiddenLimit: PAIR_COLUMNS_THIRD });
      expect(exact.hiddenRecord).toEqual({ id: 'uniqueRectangle', work: PAIR_COLUMNS_THIRD, limit: PAIR_COLUMNS_THIRD,
        capHit: null, retained: null });
      expect(urObserved(model9, flood, { seam: true }).hiddenRecord.limit).toBe(50000);
    });

    it('is complete or empty: the vector (25 units) is found at 25 and lost (capped prefix) at 24, 1 and 0', function () {
      var vector = hiddenState(model9, 1);
      var plain = urObserved(model9, vector).finding;
      var kept = urObserved(model9, vector, { seam: true, hiddenLimit: 25 });
      expect(kept.finding).toEqual(plain);
      expect(kept.hiddenRecord).toEqual({ id: 'uniqueRectangle', work: 25, limit: 25, capHit: null, retained: null });
      [24, 1, 0].forEach(function (limit) {
        var lost = urObserved(model9, vector, { seam: true, hiddenLimit: limit });
        expect(lost.finding).toBeNull();
        expect(lost.hiddenRecord).toEqual({ id: 'uniqueRectangle', work: limit, limit: limit, capHit: 'work', retained: null });
      });
    });

    it('has a counter of its own: a second pass that spends its limit does not stop the third, and the limits are apart',
      function () {
        // the second pass tries R2C2 {5,6} and R2C3 {5,7} as real cells of the vector's rectangle and finds nothing; a
        // hidden form on the rectangle R7C5, R7C8, R8C5, R8C8 follows
        var state = urState(model9, [[10, '56'], [11, '57']]);
        [[58, '12'], [61, '124'], [67, '125'], [70, '123']].forEach(function (e) { state.candidates[e[0]] = maskOf(e[1]); });
        dropDigit(state, 1, [63, 64, 65, 66, 68, 69, 71, 7, 16, 25, 34, 43, 52, 79]);
        var plain = urObserved(model9, state);
        expect(plain.finding.i18nKey).toBe('technique.uniqueRectangle.hidden.step');
        expect(plain.record.work).toBeGreaterThan(0);
        var capped = urObserved(model9, state, { seam: true, limit: 0 });
        expect(capped.record).toEqual({ id: 'uniqueRectangle', work: 0, limit: 0, capHit: 'work', retained: null });
        expect(capped.finding).toEqual(plain.finding);
        expect(capped.hiddenRecord).toEqual(plain.hiddenRecord);
        expect(capped.hiddenRecord.limit).toBe(50000);
        // and the other way round: the third limit does not touch the second pass
        var lost = urObserved(model9, state, { seam: true, hiddenLimit: 0 });
        expect(lost.finding).toBeNull();
        expect(lost.record).toEqual(plain.record);
        expect(lost.hiddenRecord).toEqual({ id: 'uniqueRectangle', work: 0, limit: 0, capHit: 'work', retained: null });
      });

    it('floors a fractional limit and rejects an invalid one with solver.invalidOption', function () {
      var vector = hiddenState(model9, 1);
      expect(urObserved(model9, vector, { seam: true, hiddenLimit: 24.9 }).hiddenRecord.work).toBe(24);
      [-1, NaN, Infinity, '5', null].forEach(function (hiddenWorkLimit) {
        var ctx = SG.techniques.createContext(model9, {});
        var err = thrownBy(function () { SG.wingSearch.uniqueRectangle(model9, vector, ctx, { hiddenWorkLimit: hiddenWorkLimit }); });
        expect([String(hiddenWorkLimit), err && err.code]).toEqual([String(hiddenWorkLimit), 'solver.invalidOption']);
        expect(err.message).toContain('wingSearch.uniqueRectangle hiddenWorkLimit');
      });
      var ok = SG.techniques.createContext(model9, {});
      expect(SG.wingSearch.uniqueRectangle(model9, vector, ok, {})).not.toBeNull();
      expect(SG.wingSearch.uniqueRectangle(model9, vector, ok, { hiddenWorkLimit: undefined })).not.toBeNull();
    });

    it('checks the parent budget at the entry of the pass and so that at most 256 units pass between two checks', function () {
      var out = urCheckWorks(model9, pairColumns([0, 3, 6]));
      // the second pass: 756 units, checks at 0, 256 and 512; the third: 1,080 units, checks at 0, 256, ... 1,024
      expect(out.works).toEqual([0, 256, 512]);
      expect(out.hiddenWorks).toEqual([0, 256, 512, 768, 1024]);
      expect(out.max).toBeLessThanOrEqual(256);
      expect(out.hiddenMax).toBeLessThanOrEqual(256);
      // a call that ends at its limit keeps the same cadence
      expect(urCheckWorks(model9, pairColumns([0, 3, 6]), 756, 600).hiddenWorks).toEqual([0, 256, 512]);
      // a small call has the entry check only
      expect(urCheckWorks(model9, hiddenState(model9, 1)).hiddenWorks).toEqual([0]);
      expect(urCheckWorks(model16h, board(model16h, [])).hiddenWorks).toEqual([0]);
    });

    it('reports a spent budget of the third pass as nothing found and lets cancellation and other errors through',
      function () {
        var flood = pairColumns([0, 3, 6]);
        var checks = urCheckWorks(model9, flood);
        var inPass = checks.firstPass + checks.works.length;
        // the entry check of the third pass, and its second check
        [[inPass, 0], [inPass + 1, 256]].forEach(function (entry) {
          var parent = SG.budget.create({ nodes: entry[0] });
          var spent = urObserved(model9, flood, { ctx: { budget: parent } });
          expect(spent.finding).toBeNull();
          expect(spent.records).toHaveLength(2);
          expect(spent.records[0].work).toBe(PAIR_COLUMNS_SECOND);
          expect(spent.hiddenRecord.capHit).toBeNull();
          expect(spent.hiddenRecord.work).toBe(entry[1]);
          // capHit null is no proof of a complete scan: the caller's budget still fails after the call
          expect(thrownBy(function () { parent.check(); }).code).toBe('budget.exceeded');
        });
        // a spent budget of the second pass leaves no third pass and no second record
        var early = urObserved(model9, flood, { ctx: { budget: SG.budget.create({ nodes: checks.firstPass + 2 }) } });
        expect(early.records).toHaveLength(1);
        // cancellation or another error in the second pass (its second check) and in the third pass (its entry check and
        // its second check): the error is thrown as it is and the call leaves no record at all, not even that of a pass
        // that had completed
        [['budget.cancelled', true], ['boom', false]].forEach(function (kind) {
          [checks.firstPass + 2, inPass + 1, inPass + 2].forEach(function (at) {
            var k = 0;
            var records = [];
            var ctx = Object.assign({}, SG.techniques.createContext(model9, {}), {
              options: { onPatternWork: function (r) { records.push(r); } },
              check: function () {
                if (++k === at) {
                  throw kind[1] ? new SG.errors.GenerationError(kind[0], { reason: 'cancelled' }) : new Error(kind[0]);
                }
              }
            });
            var thrown = thrownBy(function () { SG.techniques.get('uniqueRectangle').find(model9, flood, ctx); });
            expect(thrown).toBeTruthy();
            expect(kind[1] ? thrown.code : thrown.message).toBe(kind[0]);
            expect(k).toBe(at);
            expect(records).toEqual([]);
          });
        });
        // an error thrown by the observer propagates, for a call of one record and for a call of two
        [hiddenState(model9, 1), urState(model9, [[15, '34']]), board(model9, [])].forEach(function (state) {
          var ctx = SG.techniques.createContext(model9, {
            onPatternWork: function () { throw new Error('observer'); }
          });
          var thrown = thrownBy(function () { SG.techniques.get('uniqueRectangle').find(model9, state, ctx); });
          expect(thrown && thrown.message).toBe('observer');
        });
      });

    it('is not fooled by a hostile or absent observer', function () {
      var state = hiddenState(model9, 1);
      var plain = JSON.stringify(urFind(model9, state));
      ['not a function', null, 7].forEach(function (observer) {
        expect(JSON.stringify(urFind(model9, state, { onPatternWork: observer }))).toBe(plain);
      });
    });

    it('leaves no mark behind: a call after a capped or budget-spent third pass answers like a fresh one', function () {
      var vector = hiddenState(model9, 1);
      var fresh = JSON.stringify(urFind(model9, vector));
      urObserved(model9, vector, { seam: true, hiddenLimit: 10 });
      var checks = urCheckWorks(model9, vector);
      urObserved(model9, vector, { ctx: { budget: SG.budget.create({ nodes: checks.firstPass + checks.works.length }) } });
      expect(JSON.stringify(urFind(model9, vector))).toBe(fresh);
      expect(urObserved(model9, vector).hiddenRecord.work).toBe(25);
    });
  });

  describe('uniqueRectangle (R14): real positions', function () {
    var entry = SG.fixtures.techniques.byId.uniqueRectangle;
    var registry = SG.fixtures.techniques.registryOrder;

    // The exact Findings of the five real positive fixtures (core/tests/fixtures/techniques.js), type 3 and type 4 first,
    // the hidden form last.
    var REAL = [
      { cells: ['R4C8', 'R4C9', 'R9C8', 'R9C9', 'R4C5', 'R4C6'], eliminations: [['R4C1', 5], ['R4C1', 6]],
        args: { roof1: 'R4C8', roof2: 'R4C9', digits: [2, 3], partDigits: [5, 6, 9], cells: ['R4C5', 'R4C6'], unit: 'R4' } },
      { cells: ['R3C7', 'R3C9', 'R6C7', 'R6C9'], eliminations: [['R6C7', 1], ['R6C9', 1]],
        args: { roof1: 'R6C7', roof2: 'R6C9', digits: [1, 9], digit: 1, unit: 'R6' } },
      { cells: ['R1C2', 'R1C5', 'R3C2', 'R3C5'], eliminations: [['R1C2', 5], ['R1C2', 9]],
        args: { cell: 'R1C2', digitX: 5, digitY: 9 } },
      { cells: ['R1C3', 'R1C4', 'R2C3', 'R2C4'], eliminations: [['R3C3', 3]],
        args: { roof1: 'R1C3', roof2: 'R2C3', digitX: 6, digitY: 8, digit: 3 } },
      { cells: ['R5C1', 'R5C9', 'R6C1', 'R6C9'], eliminations: [['R5C1', 4]],
        args: { digit: 9, digits: [4, 9], cells: ['R5C1', 'R5C9', 'R6C1', 'R6C9'] } }
    ];
    var KEYS = ['technique.uniqueRectangle.type3.step', 'technique.uniqueRectangle.type4.step',
      'technique.uniqueRectangle.type1.step', 'technique.uniqueRectangle.type2.step',
      'technique.uniqueRectangle.hidden.step'];

    function positionOf(fixture) {
      return fixture.after !== null ? H.stateAfter(model9, fixture.puzzle, fixture.after)
        : H.makeState(model9, fixture.puzzle, { propagate: fixture.propagate });
    }

    it('has one positive per subtype and two negatives; the positives are where the registry reaches it', function () {
      expect(entry.positive).toHaveLength(5);
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
        if (i === 4) {
          // hidden form: the target is not the removed digit in the unique solution, and the pattern that it would
          // force (the target and the corner opposite to it the removed digit, the two others the digit of the links)
          // has no completion
          var target = finding.eliminations[0][0];
          var removed = finding.eliminations[0][1];
          var linkDigit = finding.i18nArgs.digit;
          expect(solution[target]).not.toBe(removed);
          expect(finding.i18nArgs.digits.slice().sort(byNumber)).toEqual([linkDigit, removed].sort(byNumber));
          var forced = SG.model.cloneState(state);
          quad.forEach(function (c) {
            var near = model9.layout.cellRow[c] === model9.layout.cellRow[target] ||
              model9.layout.cellCol[c] === model9.layout.cellCol[target];
            forced.candidates[c] = bit(near && c !== target ? linkDigit : removed);
          });
          expect(SG.dfs.searchFrom(model9, forced, { limit: 2 }).found).toBe(0);
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
        [0, 1, 4].forEach(function (i) {
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

    it('the five supplements of the soundness sweep are real unique positions of a type 3, a type 4 or a hidden form',
      function () {
        var supplements = SG.fixtures.techniques.supplements.uniqueRectangle;
        expect(supplements).toHaveLength(5);
        var keys = [];
        supplements.forEach(function (fixture) {
          expect(SG.dfs.countSolutions(model9, H.parsePuzzle(model9, fixture.puzzle), 2)).toBe(1);
          var state = positionOf(fixture);
          var f = check('uniqueRectangle', model9, state, {});
          keys.push(f.i18nKey);
        });
        expect(keys).toEqual(['technique.uniqueRectangle.type3.step', 'technique.uniqueRectangle.type3.step',
          'technique.uniqueRectangle.type4.step', 'technique.uniqueRectangle.hidden.step',
          'technique.uniqueRectangle.hidden.step']);
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

    var checkWorks = urCheckWorks;

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
      var found = { 3: 0, 4: 0, hidden: 0, other: 0 };
      itemsOf(model, count, seed).forEach(function (item, index) {
        var state = SG.model.cloneState(item.state);
        for (var step = 0; step < maxSteps && state.unsolvedCount > 0; step++) {
          var out = urObserved(model, state, { seam: true, limit: 100000000, hiddenLimit: 100000000 });
          out.records.forEach(function (record) {
            if (record.capHit !== null) fail('uniqueRectangle spent its limit on state #' + index);
          });
          var wanted = ORACLE.uniqueRectangle.exists(model, state);
          if ((out.finding !== null) !== wanted) {
            fail('uniqueRectangle ' + (out.finding !== null ? 'found' : 'missed') + ' a pattern the enumeration ' +
              (wanted ? 'sees' : 'does not see') + ' on state #' + index + ' step ' + step + '\n  puzzle: ' +
              H.puzzleString(model, item.givens) + '\n  finding: ' + JSON.stringify(out.finding));
          }
          if (out.finding === null) break;
          ORACLE.uniqueRectangle.verify(model, state, out.finding);
          var key = /type([34])\.step$|(hidden)\.step$/.exec(out.finding.i18nKey);
          found[key ? key[1] || key[2] : 'other']++;
          if (!apply(model, state, out.finding)) fail('uniqueRectangle led to a contradiction on state #' + index);
        }
      });
      return found;
    }

    [['classic9', 300, 20260101, 40, 6, 5, 25], ['classic9', 300, 777, 12, 10, 12, 20],
      ['classic9', 300, 99, 12, 8, 6, 22], ['classic6', 200, 20260101, 40, 3, 2, 14],
      ['classic4', 300, 20260101, 40, 1, 5, 5]].forEach(function (setup) {
      it('agrees on ' + setup[0] + ' (' + setup[1] + ' states of seed ' + setup[2] + ') and fires every subtype',
        function () {
          var found = walk(H.model(setup[0]), setup[1], setup[2], setup[3]);
          expect(found[3]).toBeGreaterThanOrEqual(setup[4]);
          expect(found[4]).toBeGreaterThanOrEqual(setup[5]);
          expect(found.hidden).toBeGreaterThanOrEqual(setup[6]);
        });
    });

    it('agrees on 12 digits (boxes of 3 x 4) and 16 digits (4 x 4), no 9 x 9 arithmetic', function () {
      var twelve = walk(model12, 200, 20260101, 40);
      expect(twelve[4]).toBeGreaterThanOrEqual(1);
      expect(twelve.hidden).toBeGreaterThanOrEqual(10);
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

  // BUG+1 (R14). The position: exactly one open cell T with three candidates and every other open cell with two, and,
  // with one candidate X of T left out, every unit of the model holds each placed digit in its own cell only and every
  // other digit in exactly two cells. The enumeration below is independent of the finder: it reads `model.units`,
  // `model.unitMeta`, the cages, the inequalities and the candidates only, and filters the cells of each unit for the
  // holders of each digit (the finder tallies them). The constructed positions are mechanics positions: a solution S of
  // the blank board and a cyclic relabelling p of its free digits give every open cell {S, p(S)} (two solutions that
  // differ in every cell, so every unit holds every free digit twice) and one cell gets a third candidate. They exercise
  // the guards of the finder; they are not uniqueness fixtures (the remainder has two solutions, which is the
  // contradiction of the premise), and the real positions further down are the unique ones.
  var bugSolutionCache = new WeakMap();

  /** A complete solution of the blank board of a model (plain depth first search, deterministic). */
  function bugSolution(model) {
    var solution = bugSolutionCache.get(model);
    if (!solution) {
      solution = Array.from(SG.dfs.solve(model, new Int32Array(model.cellCount)));
      bugSolutionCache.set(model, solution);
    }
    return solution;
  }

  /** The first cell (in index order, within `cells` when given) whose solution digit is `digit`. */
  function bugCellWith(model, digit, cells) {
    var solution = bugSolution(model);
    var list = cells || solution.map(function (s, c) { return c; });
    for (var i = 0; i < list.length; i++) if (solution[list[i]] === digit) return list[i];
    throw new Error('no cell with the solution digit ' + digit);
  }

  /** The cells of row `r` (0-based) of a square board. */
  function bugRow(model, r) {
    var out = [];
    for (var c = 0; c < model.digits; c++) out.push(at(model, r, c));
    return out;
  }

  /**
   * A BUG+1 on the blank board of a model: every open cell holds {S, p(S)}, where S is the solution of `bugSolution` and
   * p the cycle `opts.cycle` (default: the free digits ascending) through the free digits, every digit but the
   * `opts.placed` ones, whose cells are solved; `cell` gets the third candidate `opts.extra` (default: the lowest free
   * digit outside its pair), or none with `opts.plain`.
   */
  function bugState(model, cell, opts) {
    var options = opts || {};
    var solution = bugSolution(model);
    var placed = options.placed || [];
    var free = [];
    for (var d = 1; d <= model.digits; d++) if (placed.indexOf(d) === -1) free.push(d);
    var cycle = options.cycle || free;
    var next = {};
    cycle.forEach(function (digit, i) { next[digit] = cycle[(i + 1) % cycle.length]; });
    var state = SG.model.initState(model);
    for (var c = 0; c < model.cellCount; c++) {
      var s = solution[c];
      if (placed.indexOf(s) !== -1) {
        state.value[c] = s;
        state.candidates[c] = bit(s);
        state.unsolvedCount--;
      } else {
        state.candidates[c] = bit(s) | bit(next[s]);
      }
    }
    var pair = state.candidates[cell];
    var extra = options.extra;
    if (extra === undefined) {
      extra = free.filter(function (digit) { return (pair & bit(digit)) === 0; })[0];
    }
    if (!options.plain) state.candidates[cell] |= bit(extra);
    return { state: state, extra: extra, cell: cell, pair: pair };
  }

  /** Whether the model has neither cages nor inequalities and only complete units. */
  function bugSupported(model) {
    return model.cages.length === 0 && model.inequalities.length === 0 &&
      model.units.every(function (cells, u) { return cells.length === model.digits && !model.unitMeta[u].partial; });
  }

  /** The cells of a unit that hold `digit` (a solved cell holds its value only), without `x` in the cell `skip`. */
  function bugHolders(state, cells, digit, skip, x) {
    return cells.filter(function (c) {
      if (!open(state, c)) return state.value[c] === digit;
      return has(state, c, digit) && !(c === skip && digit === x);
    });
  }

  /**
   * The BUG+1 of a state from the definition: { found: { cell, digit } | null, units }. `units` counts the cells of the
   * units read (the work rule): the candidates X of the trivalue cell in ascending order, the units in index order, a
   * candidate ending at its first unit whose counts break; 0 where the guard (one trivalue cell, every other open cell
   * with two candidates, a supported model) refuses the position. A candidate X that is a digit placed in a unit of the
   * cell is a stale candidate and never qualifies.
   */
  function bugOf(model, state) {
    var refused = { found: null, units: 0 };
    if (!bugSupported(model)) return refused;
    var trivalue = [];
    for (var c = 0; c < model.cellCount; c++) {
      if (!open(state, c)) continue;
      var k = size(state, c);
      if (k === 3) trivalue.push(c);
      else if (k !== 2) return refused;
    }
    if (trivalue.length !== 1) return refused;
    var cell = trivalue[0];
    var units = 0;
    var candidates = SG.bits.toArray(state.candidates[cell]);
    for (var i = 0; i < candidates.length; i++) {
      var x = candidates[i];
      var good = true;
      for (var u = 0; u < model.units.length && good; u++) {
        var cells = Array.from(model.units[u]);
        units += cells.length;
        for (var d = 1; d <= model.digits && good; d++) {
          var placedHere = cells.some(function (m) { return state.value[m] === d; });
          var holders = bugHolders(state, cells, d, cell, x);
          if (holders.length !== (placedHere ? 1 : 2)) good = false;
          if (placedHere && d === x && cells.indexOf(cell) !== -1) good = false;
        }
      }
      if (good) return { found: { cell: cell, digit: x }, units: units };
    }
    return { found: null, units: units };
  }

  ORACLE.bugPlusOne = {
    exists: function (model, state) { return bugOf(model, state).found !== null; },
    verify: function (model, state, f) {
      var want = bugOf(model, state).found;
      expect(want).not.toBeNull();
      expect(f.technique).toBe('bugPlusOne');
      expect(f.cells).toEqual([want.cell]);
      expect(f.placements).toEqual([[want.cell, want.digit]]);
      expect(f.eliminations).toEqual([]);
      expect(f.i18nKey).toBe('technique.bugPlusOne.step');
      expect(f.i18nArgs).toEqual({ cell: want.cell, label: H.label(model, want.cell), digit: want.digit });
      expect(open(state, want.cell) && size(state, want.cell) === 3).toBe(true);
      expect(has(state, want.cell, want.digit)).toBe(true);
    }
  };

  function bugFind(model, state, ctxOptions) {
    return SG.techniques.get('bugPlusOne').find(model, state, SG.techniques.createContext(model, ctxOptions || {}));
  }

  /** One call of the registered finder or of the seam (`seam`, with `limit` when given) with its observer. */
  function bugObserved(model, state, opts) {
    var records = [];
    var options = opts || {};
    var ctx = SG.techniques.createContext(model, Object.assign({
      onPatternWork: function (r) { records.push(r); }
    }, options.ctx));
    var finding = options.seam
      ? SG.wingSearch.bugPlusOne(model, state, ctx, options.limit === undefined ? undefined : { workLimit: options.limit })
      : SG.techniques.get('bugPlusOne').find(model, state, ctx);
    return { finding: finding, records: records, record: records[0] };
  }

  /** The cells of the three units of the cell holding the digit more often than twice, as a quick local look. */
  function bugLocalCounts(model, state, cell, digit) {
    var counts = [];
    model.units.forEach(function (cells) {
      if (Array.prototype.indexOf.call(cells, cell) === -1) return;
      counts.push(bugHolders(state, Array.from(cells), digit, -1, 0).length);
    });
    return counts;
  }

  /** Two cells that share no unit (the second is the first cell of the model that does not see the first). */
  function bugDistantCell(model, from) {
    for (var c = 0; c < model.cellCount; c++) {
      if (c !== from && !sees(model, from, c)) return c;
    }
    throw new Error('every cell sees the cell ' + from);
  }

  describe('bugPlusOne (R14): registration, the Finding and the guards', function () {
    var T = at(model9, 4, 4);

    it('is registered with the agreed group, cost, order, scope and uniqueness flag', function () {
      var tech = SG.techniques.get('bugPlusOne');
      expect(tech.group).toBe('wing');
      expect(tech.baseCost).toBe(72);
      expect(tech.order).toBe(182);
      expect(tech.assumesUniqueness).toBe(true);
      expect(tech.variantScope).toBeNull();
      expect(tech.i18nKey).toBe('technique.bugPlusOne');
    });

    it('is the second technique of the group that relies on a unique solution, right after uniqueRectangle and before ' +
      'forcingChain', function () {
        var wing = SG.techniques.list().filter(function (t) { return t.group === 'wing'; });
        expect(wing.map(function (t) { return t.id; }))
          .toEqual(['remotePairs', 'xyWing', 'xyzWing', 'wxyzWing', 'wWing', 'uniqueRectangle', 'bugPlusOne']);
        expect(wing.filter(function (t) { return t.assumesUniqueness; }).map(function (t) { return t.id; }))
          .toEqual(['uniqueRectangle', 'bugPlusOne']);
        var ids = SG.techniques.list().filter(function (t) { return t.variantScope === null; })
          .map(function (t) { return t.id; });
        expect(ids.indexOf('uniqueRectangle') + 1).toBe(ids.indexOf('bugPlusOne'));
        expect(ids.indexOf('bugPlusOne') + 1).toBe(ids.indexOf('forcingChain'));
        expect(SG.techniques.get('uniqueRectangle').order).toBeLessThan(182);
        expect(SG.techniques.get('forcingChain').order).toBeGreaterThan(182);
      });

    it('the vector: every open cell holds two candidates but R5C5, whose third candidate is the answer in every unit',
      function () {
        var built = bugState(model9, T);
        var f = check('bugPlusOne', model9, built.state, {
          cells: ['R5C5'], placements: [['R5C5', built.extra]], eliminations: [],
          args: { cell: T, label: 'R5C5', digit: built.extra }
        });
        expect(f.cells).toEqual([T]);
        expect(f.placements).toEqual([[T, built.extra]]);
        expect(f.eliminations).toEqual([]);
        expect(f.i18nKey).toBe('technique.bugPlusOne.step');
        expect(Object.keys(f.i18nArgs)).toEqual(['cell', 'label', 'digit']);
        expect(JSON.parse(JSON.stringify(f.i18nArgs))).toEqual(f.i18nArgs);
        // the answer is held three times in each of the three units of the cell, every other digit twice
        expect(bugLocalCounts(model9, built.state, T, built.extra)).toEqual([3, 3, 3]);
        // the premise of the proof: without the answer the position has the solution flip, so two solutions
        var without = SG.model.cloneState(built.state);
        without.candidates[T] &= ~bit(built.extra);
        expect(SG.dfs.searchFrom(model9, without, { limit: 2 }).found).toBe(2);
      });

    it('takes the answer whichever candidate of the cell it is: the lowest, a middle one and the highest', function () {
      // the cycle 1 3 5 7 9 2 4 6 8 gives the cell of the solution digit 1 the pair {1,3}, that of 3 the pair {3,5}
      var cycle = [1, 3, 5, 7, 9, 2, 4, 6, 8];
      var row = bugRow(model9, 4);
      [[3, 1, 'lowest'], [1, 2, 'middle'], [1, 9, 'highest']].forEach(function (c) {
        var cell = bugCellWith(model9, c[0], row);
        var built = bugState(model9, cell, { cycle: cycle, extra: c[1] });
        var digits = SG.bits.toArray(built.state.candidates[cell]);
        expect([c[2], digits.indexOf(c[1])]).toEqual([c[2], c[2] === 'lowest' ? 0 : c[2] === 'middle' ? 1 : 2]);
        check('bugPlusOne', model9, built.state, { placements: [[cell, c[1]]] });
      });
    });

    it('a distant unit with a wrong digit count: the units of the cell look valid and nothing is found', function () {
      var built = bugState(model9, T);
      expect(bugLocalCounts(model9, built.state, T, built.extra)).toEqual([3, 3, 3]);
      var far = bugDistantCell(model9, T);
      var state = SG.model.cloneState(built.state);
      // the cell far gives one of its two candidates up for a digit outside its pair: one holder fewer for the first,
      // one more for the second, in the three units of the far cell only
      var pair = SG.bits.toArray(state.candidates[far]);
      var other = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(function (d) { return pair.indexOf(d) === -1; })[0];
      state.candidates[far] = (state.candidates[far] & ~bit(pair[1])) | bit(other);
      expect(size(state, far)).toBe(2);
      expect(bugLocalCounts(model9, state, T, built.extra)).toEqual([3, 3, 3]);
      checkNone('bugPlusOne', model9, state);
      expect(bugOf(model9, state).units).toBeGreaterThan(0);
      // and the same position with the far cell as it was is the Finding
      check('bugPlusOne', model9, built.state, { placements: [[T, built.extra]] });
    });

    it('a second trivalue cell, a cell with four candidates, a naked single and an empty cell: nothing is found',
      function () {
        var built = bugState(model9, T);
        var far = bugDistantCell(model9, T);
        var second = SG.model.cloneState(built.state);
        second.candidates[far] |= bit(1 + (SG.bits.toArray(second.candidates[far]).slice(-1)[0] % 9));
        expect(size(second, far)).toBe(3);
        checkNone('bugPlusOne', model9, second);
        var four = SG.model.cloneState(built.state);
        four.candidates[T] = maskOf('1234');
        expect(size(four, T)).toBe(4);
        checkNone('bugPlusOne', model9, four);
        var single = SG.model.cloneState(built.state);
        single.candidates[far] = bit(SG.bits.toArray(single.candidates[far])[0]);
        checkNone('bugPlusOne', model9, single);
        var empty = SG.model.cloneState(built.state);
        empty.candidates[far] = 0;
        checkNone('bugPlusOne', model9, empty);
        // a grave without any third candidate (a plain BUG) has nothing to place
        checkNone('bugPlusOne', model9, bugState(model9, T, { plain: true }).state);
      });

    it('the third candidate in another cell is another answer: moving it makes the finder follow it', function () {
      var a = bugState(model9, T);
      var other = at(model9, 1, 7);
      var b = bugState(model9, other);
      var fa = check('bugPlusOne', model9, a.state, { placements: [[T, a.extra]] });
      var fb = check('bugPlusOne', model9, b.state, { placements: [[other, b.extra]] });
      expect(fa.cells).not.toEqual(fb.cells);
      // a position that has both third candidates has two trivalue cells and gives nothing
      var both = SG.model.cloneState(a.state);
      both.candidates[other] = b.state.candidates[other];
      checkNone('bugPlusOne', model9, both);
    });

    it('accounts for placed digits: with every 9 solved the grave still gives the answer', function () {
      var cell = bugCellWith(model9, 3, bugRow(model9, 4));
      var built = bugState(model9, cell, { placed: [9] });
      expect(built.state.unsolvedCount).toBe(72);
      expect(bugLocalCounts(model9, built.state, cell, 9)).toEqual([1, 1, 1]);
      check('bugPlusOne', model9, built.state, { placements: [[cell, built.extra]] });
      // the same with the digits 1 and 2 placed, on 6 digits and on 4 digits
      var cell6 = bugCellWith(model6, 3, bugRow(model6, 2));
      check('bugPlusOne', model6, bugState(model6, cell6, { placed: [1, 2] }).state, {});
      var cell4 = bugCellWith(model4, 1, bugRow(model4, 1));
      check('bugPlusOne', model4, bugState(model4, cell4, { placed: [4] }).state, {});
    });

    it('a placed digit is not an unplaced one: a stale candidate, a second placement and a digit left open are ' +
      'refused', function () {
        var cell = bugCellWith(model9, 3, bugRow(model9, 4));
        var built = bugState(model9, cell, { placed: [9] });
        // the stale candidate of a placed digit as the third candidate of the cell: without it the position is a grave,
        // but the digit cannot be placed in a cell whose unit holds it
        var stale = bugState(model9, cell, { placed: [9], extra: 9 });
        expect(bugLocalCounts(model9, stale.state, cell, 9)).toEqual([2, 2, 2]);
        checkNone('bugPlusOne', model9, stale.state);
        // a second 9 placed in a unit that has one
        var nine = built.state.value.indexOf(9);
        var twin = SG.model.cloneState(built.state);
        var mate = Array.from(unitCells(model9, 'R' + (model9.layout.cellRow[nine] + 1))).filter(function (c) {
          return open(twin, c) && c !== cell;
        })[0];
        twin.value[mate] = 9;
        twin.candidates[mate] = bit(9);
        twin.unsolvedCount--;
        checkNone('bugPlusOne', model9, twin);
        // a 9 that is left open (a cell {9, x}) has one holder in its units: the counts break
        var loose = SG.model.cloneState(built.state);
        loose.value[nine] = 0;
        loose.candidates[nine] = maskOf('19');
        loose.unsolvedCount++;
        checkNone('bugPlusOne', model9, loose);
        // the unplaced digits of the unit are counted without the placed one: placing nothing breaks the counts
        // when a solved cell is simply dropped from the candidates of its unit
        var dropped = SG.model.cloneState(built.state);
        dropped.value[nine] = 0;
        dropped.candidates[nine] = 0;
        dropped.unsolvedCount++;
        checkNone('bugPlusOne', model9, dropped);
      });

    it('reads every unit of the model: an added complete diagonal takes part', function () {
      var diagonal = [];
      for (var i = 0; i < 9; i++) diagonal.push(at(model9, i, i));
      var sudokuX = rebuild(model9, 'test-x-bug', { units: [{ cells: diagonal, meta: { kind: 'diag', label: 'D1' } }] });
      var cell = bugCellWith(sudokuX, 5, bugRow(sudokuX, 3));
      // a grave built on the diagonal model: its solution has the diagonal complete, every count is right
      var good = bugState(sudokuX, cell);
      check('bugPlusOne', sudokuX, good.state, { placements: [[cell, good.extra]] });
      // the same candidates on the model without the diagonal: fewer units, the same Finding
      check('bugPlusOne', model9, good.state, { placements: [[cell, good.extra]] });
      // a grave built on the plain model: its rows, columns and boxes are right and its diagonal is not a complete
      // unit of digits twice, so the model with the diagonal refuses it
      var plain = bugState(model9, T);
      check('bugPlusOne', model9, plain.state, { placements: [[T, plain.extra]] });
      checkNone('bugPlusOne', sudokuX, plain.state);
      expect(bugOf(sudokuX, plain.state).units).toBeGreaterThan(0);
      // the diagonal as a partial unit refuses the form for every position
      var partial = rebuild(model9, 'test-x-partial-bug', { units: [{ cells: diagonal,
        meta: { kind: 'diag', label: 'D1', partial: true } }] });
      checkNone('bugPlusOne', partial, good.state);
    });

    it('refuses cages, inequalities and a partial unit: the same candidates on the plain model give the Finding',
      function () {
        var built = bugState(model9, T);
        var caged = rebuild(model9, 'test-cages-bug', { cages: [{ cells: [20, 21], sum: 3 }] });
        var signs = rebuild(model9, 'test-signs-bug', { inequalities: [{ a: 40, b: 41 }] });
        var partial = withPartial(model9, 'test-partial-bug', ['R9']);
        [caged, signs, partial].forEach(function (model) {
          none('bugPlusOne', model, built.state);
          var out = bugObserved(model, built.state);
          expect(out.finding).toBeNull();
          // the call ran: one record, nothing was tallied
          expect(out.records).toEqual([{ id: 'bugPlusOne', work: 0, limit: 50000, capHit: null, retained: null }]);
        });
        check('bugPlusOne', model9, built.state, { placements: [[T, built.extra]] });
      });

    it('assumeUniqueness: false skips the finder and the seam and leaves no work record', function () {
      var built = bugState(model9, T);
      none('bugPlusOne', model9, built.state, { assumeUniqueness: false });
      var out = bugObserved(model9, built.state, { ctx: { assumeUniqueness: false } });
      expect(out.finding).toBeNull();
      expect(out.records).toEqual([]);
      var seam = bugObserved(model9, built.state, { seam: true, ctx: { assumeUniqueness: false } });
      expect(seam.finding).toBeNull();
      expect(seam.records).toEqual([]);
      expect(bugObserved(model9, built.state).finding).not.toBeNull();
    });

    it('leaves the state alone, answers the same twice and returns fresh owned data', function () {
      var built = bugState(model9, T);
      var snapshot = SG.model.cloneState(built.state);
      var a = bugFind(model9, built.state);
      var b = bugFind(model9, built.state);
      expect(b).toEqual(a);
      expect(b).not.toBe(a);
      expect(b.cells).not.toBe(a.cells);
      expect(b.placements).not.toBe(a.placements);
      expect(b.placements[0]).not.toBe(a.placements[0]);
      expect(built.state.candidates).toEqual(snapshot.candidates);
      expect(built.state.value).toEqual(snapshot.value);
      expect(built.state.unsolvedCount).toBe(snapshot.unsolvedCount);
      // changing what a call returned changes nothing for the next call
      a.cells.push(99);
      a.placements[0][1] = 99;
      a.i18nArgs.digit = 99;
      expect(bugFind(model9, built.state)).toEqual(b);
      // another call on another position in between changes nothing
      bugFind(model9, bugState(model9, at(model9, 1, 7)).state);
      expect(bugFind(model9, built.state)).toEqual(b);
    });
  });

  describe('bugPlusOne (R14): unit shapes and sizes', function () {
    var jigsaw4 = jigsawModel();
    var SHAPES = [['4 digits', model4], ['6 digits', model6], ['9 digits', model9], ['12 digits', model12],
      ['16 digits', model16], ['a 4x4 jigsaw', jigsaw4]];
    // every unit-shape class that a board of the registry can have: extra complete units (diagonals, windows), irregular
    // regions and several grids that share cells (all built by the helper; the Killer and Greater-Than helper boards have
    // neither cages nor signs here, so they are plain nine-digit boards)
    ['diagonalX', 'hyper', 'jigsaw9', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku'].forEach(function (id) {
      if (SG.testkit.hasVariant(id)) SHAPES.push([id, H.model(id)]);
    });

    SHAPES.forEach(function (setup) {
      it('finds the constructed grave on ' + setup[0] + ' for the first, a middle and the last cell, as the ' +
        'enumeration does, and nothing in its near misses', function () {
          var model = setup[1];
          [0, Math.floor(model.cellCount / 2), model.cellCount - 1].forEach(function (cell) {
            var built = bugState(model, cell);
            var f = check('bugPlusOne', model, built.state, { placements: [[cell, built.extra]] });
            expect(f.i18nArgs).toEqual({ cell: cell, label: H.label(model, cell), digit: built.extra });
            expect(bugObserved(model, built.state).record.work).toBe(bugOf(model, built.state).units);
            if (model.digits <= 9 && model.cellCount <= 144) {
              // the flip of the proof, by exhaustion: without the answer the position has two solutions (at least)
              var without = SG.model.cloneState(built.state);
              without.candidates[cell] &= ~bit(built.extra);
              expect(SG.dfs.searchFrom(model, without, { limit: 2 }).found).toBe(2);
            }
            // near misses: a plain grave (no third candidate), and a distant cell that moves a candidate
            checkNone('bugPlusOne', model, bugState(model, cell, { plain: true }).state);
            var far = bugDistantCell(model, cell);
            var broken = SG.model.cloneState(built.state);
            var pair = SG.bits.toArray(broken.candidates[far]);
            var other = [];
            for (var d = 1; d <= model.digits; d++) if (pair.indexOf(d) === -1) other.push(d);
            broken.candidates[far] = (broken.candidates[far] & ~bit(pair[1])) | bit(other[0]);
            checkNone('bugPlusOne', model, broken);
            expect(bugOf(model, broken).units).toBeGreaterThan(0);
          });
        });
    });

    it('a model with an extra complete unit (a window or a diagonal) reads it too: a grave built without it is refused',
      function () {
        ['diagonalX', 'hyper'].forEach(function (id) {
          if (!SG.testkit.hasVariant(id)) return;
          var model = H.model(id);
          var plain = bugState(model9, at(model9, 4, 4));
          // the plain classic grave on the board with the extra units: its rows, columns and boxes hold every digit
          // twice, the diagonals and windows do not
          checkNone('bugPlusOne', model, plain.state);
          expect(bugOf(model, plain.state).units).toBeGreaterThan(0);
          check('bugPlusOne', model9, plain.state, { placements: [[at(model9, 4, 4), plain.extra]] });
        });
      });

    it('on a multi-grid board a cell of two grids is in the units of both: moving a candidate in it breaks the counts',
      function () {
        if (!SG.testkit.hasVariant('samurai')) SG.test.skip('no samurai board can be built here');
        var samurai = H.model('samurai');
        var built = bugState(samurai, byLayout(samurai, 4, 4));
        check('bugPlusOne', samurai, built.state, { placements: [[byLayout(samurai, 4, 4), built.extra]] });
        // the cells that belong to two grids are in the units of both: a candidate moved in one of them breaks both
        var shared = byLayout(samurai, 6, 6);
        var broken = SG.model.cloneState(built.state);
        var pair = SG.bits.toArray(broken.candidates[shared]);
        broken.candidates[shared] = (broken.candidates[shared] & ~bit(pair[1])) |
          bit([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(function (d) { return pair.indexOf(d) === -1; })[0]);
        checkNone('bugPlusOne', samurai, broken);
        var shape = samurai.cellUnits[shared].length;
        expect(shape).toBeGreaterThan(3);
      });
  });

  describe('bugPlusOne (R14): real positions', function () {
    var entry = SG.fixtures.techniques.byId.bugPlusOne;
    var registry = SG.fixtures.techniques.registryOrder;

    // The exact Findings of the two real positive fixtures (core/tests/fixtures/techniques.js): the answer is the lowest
    // and the highest candidate of the trivalue cell.
    var REAL = [
      { cell: 79, label: 'R9C8', digit: 2, candidates: [2, 7, 8], open: 17 },
      { cell: 51, label: 'R6C7', digit: 9, candidates: [3, 4, 9], open: 21 }
    ];

    function positionOf(fixture) {
      return fixture.after !== null ? H.stateAfter(model9, fixture.puzzle, fixture.after)
        : H.makeState(model9, fixture.puzzle, { propagate: fixture.propagate });
    }

    it('has two positives and two negatives; the positives are where the registry reaches it', function () {
      expect(entry.positive).toHaveLength(2);
      expect(entry.negative).toHaveLength(2);
      var below = registry.slice(0, registry.indexOf('bugPlusOne'));
      expect(below[below.length - 1]).toBe('uniqueRectangle');
      entry.positive.forEach(function (fixture) { expect(fixture.after.slice().sort()).toEqual(below.slice().sort()); });
      expect(entry.negative[0].after).toContain('bugPlusOne');
      expect(entry.negative[1].after).not.toContain('uniqueRectangle');
    });

    REAL.forEach(function (want, i) {
      it('finds the exact Finding of real position ' + (i + 1) + ', sound against an independent completion, with the ' +
        'premise of the pattern shown absurd', function () {
          var fixture = entry.positive[i];
          var givens = H.parsePuzzle(model9, fixture.puzzle);
          // the puzzle has exactly one solution (plain depth first search, no technique): the uniqueness the pattern uses
          expect(SG.dfs.countSolutions(model9, givens, 2)).toBe(1);
          var solution = SG.dfs.solve(model9, givens);
          var state = positionOf(fixture);
          expect(state.unsolvedCount).toBe(want.open);
          var finding = check('bugPlusOne', model9, state, {
            cells: [want.label], placements: [[want.label, want.digit]], eliminations: [],
            args: { cell: want.cell, label: want.label, digit: want.digit }
          });
          expect(finding.placements).toEqual([[want.cell, want.digit]]);
          expect(solution[want.cell]).toBe(want.digit);
          // the answer is fixed in other cells too, none of them in a unit of the cell: that is no obstacle to the placement
          var fixedElsewhere = 0;
          for (var f = 0; f < model9.cellCount; f++) {
            if (state.value[f] !== want.digit) continue;
            fixedElsewhere++;
            expect(sees(model9, want.cell, f)).toBe(false);
          }
          expect(fixedElsewhere).toBeGreaterThan(0);
          expect(SG.bits.toArray(state.candidates[want.cell])).toEqual(want.candidates);
          // exactly one open cell has three candidates and every other has two
          var sizes = {};
          for (var c = 0; c < model9.cellCount; c++) {
            if (open(state, c)) sizes[size(state, c)] = (sizes[size(state, c)] || 0) + 1;
          }
          expect(sizes).toEqual({ 2: want.open - 1, 3: 1 });
          // the premise: with the answer left out the position has no completion; with any other candidate of the cell
          // fixed, none either; with the answer, exactly the unique solution
          want.candidates.forEach(function (digit) {
            var fixed = SG.model.cloneState(state);
            fixed.candidates[want.cell] = bit(digit);
            var found = SG.dfs.searchFrom(model9, fixed, { limit: 2 });
            expect([digit, found.found]).toEqual([digit, digit === want.digit ? 1 : 0]);
          });
          var without = SG.model.cloneState(state);
          without.candidates[want.cell] &= ~bit(want.digit);
          expect(SG.dfs.searchFrom(model9, without, { limit: 2 }).found).toBe(0);
          // the position after the placement still completes, and only to that solution
          var reduced = SG.model.cloneState(state);
          expect(SG.constraints.assign(model9, reduced, want.cell, want.digit)).toBe(true);
          var done = SG.dfs.searchFrom(model9, reduced, { limit: 2 });
          expect(done.found).toBe(1);
          expect(Array.from(done.solution)).toEqual(Array.from(solution));
          // no cheaper technique of the registry finds anything here: bugPlusOne is the first one reached
          SG.techniques.list().filter(function (t) { return t.variantScope === null && t.order < 182; })
            .forEach(function (t) {
              expect([t.id, t.find(model9, state, SG.techniques.createContext(model9, { assumeUniqueness: true })) === null])
                .toEqual([t.id, true]);
            });
        });
    });

    it('is a step of the logical solver from the real positions, and never without the uniqueness assumption',
      function () {
        entry.positive.forEach(function (fixture) {
          var givens = H.parsePuzzle(model9, fixture.puzzle);
          var allowed = fixture.after.concat(['bugPlusOne']);
          var report = SG.logicalSolver.solve(model9, givens, { allowedTechniques: allowed });
          var steps = report.steps.filter(function (s) { return s.technique === 'bugPlusOne'; });
          expect(steps.length).toBeGreaterThan(0);
          expect(steps[0].i18nKey).toBe('technique.bugPlusOne.step');
          expect(steps[0].eliminations).toEqual([]);
          expect(report.techniqueCounts.bugPlusOne).toBe(steps.length);
          var without = SG.logicalSolver.solve(model9, givens, { allowedTechniques: allowed, assumeUniqueness: false });
          without.steps.forEach(function (s) { expect(s.technique).not.toBe('bugPlusOne'); });
        });
      });

    it('finds nothing at the negative positions: nothing left after it, and a Unique Rectangle that keeps its priority',
      function () {
        entry.negative.forEach(function (fixture) {
          var state = positionOf(fixture);
          H.expectNoFinding(SG.test, 'bugPlusOne', state);
          expect(bugOf(model9, state).found).toBeNull();
          expect(state.unsolvedCount).toBeGreaterThan(0);
        });
        // the second position holds a rectangle: uniqueRectangle finds it, and it is first in the registry
        var ur = SG.techniques.get('uniqueRectangle').find(model9, positionOf(entry.negative[1]),
          SG.techniques.createContext(model9, {}));
        expect(ur).not.toBeNull();
        expect(SG.techniques.get('uniqueRectangle').order).toBeLessThan(SG.techniques.get('bugPlusOne').order);
        // and a trivalue cell is not enough: the first negative has several
        var many = 0;
        var negative = positionOf(entry.negative[0]);
        for (var c = 0; c < model9.cellCount; c++) if (open(negative, c) && size(negative, c) === 3) many++;
        expect(many).toBeGreaterThan(1);
      });

    it('the three supplements of the soundness sweep are real unique positions where the registry reaches it',
      function () {
        var supplements = SG.fixtures.techniques.supplements.bugPlusOne;
        expect(supplements).toHaveLength(3);
        var cells = [];
        supplements.forEach(function (fixture) {
          expect(SG.dfs.countSolutions(model9, H.parsePuzzle(model9, fixture.puzzle), 2)).toBe(1);
          var state = positionOf(fixture);
          var f = check('bugPlusOne', model9, state, {});
          cells.push(H.label(model9, f.cells[0]) + '=' + f.placements[0][1]);
          expect(fixture.after.slice().sort()).toEqual(registry.slice(0, registry.indexOf('bugPlusOne')).sort());
        });
        expect(cells).toEqual(['R4C2=7', 'R8C2=3', 'R5C6=2']);
      });
  });

  /**
   * The work done at each check of the parent budget of one call of the seam (a context whose k-th check throws a spent
   * budget): the swallowed call's record tells how many units were spent at that check.
   */
  function bugCheckWorks(model, state) {
    var base = SG.techniques.createContext(model, {});
    function attempt(target) {
      var k = 0;
      var records = [];
      var ctx = Object.assign({}, base, {
        options: { onPatternWork: function (r) { records.push(r); } },
        check: function () {
          k++;
          if (k === target) throw new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' });
        }
      });
      var finding = SG.wingSearch.bugPlusOne(model, state, ctx, undefined);
      return { checks: k, records: records, finding: finding };
    }
    var free = attempt(0);
    var works = [];
    for (var target = 1; target <= free.checks; target++) {
      var spent = attempt(target);
      expect(spent.finding).toBeNull();
      expect(spent.records).toHaveLength(1);
      expect(spent.records[0].capHit).toBeNull();
      works.push(spent.records[0].work);
    }
    return { works: works, free: free };
  }

  describe('bugPlusOne (R14): work limit, budget and cancellation', function () {
    // the cycle 1 3 5 7 9 2 4 6 8 gives the cell of the solution digit 1 the pair {1,3} and that of 3 the pair {3,5}, so
    // that the extra 1, 2 or 9 is the lowest, a middle or the highest candidate of the cell
    var CYCLE = [1, 3, 5, 7, 9, 2, 4, 6, 8];
    var row5 = bugRow(model9, 4);
    var row9 = bugRow(model9, 8);

    function grave(row, solutionDigit, extra) {
      return bugState(model9, bugCellWith(model9, solutionDigit, row), { cycle: CYCLE, extra: extra });
    }

    // [row, solution digit of the cell, extra, work]: the proposal that qualifies reads the 27 units of 9 cells (243); a
    // refused proposal ends at the first unit that holds the cell (row 5: unit 4, 5 units of 9 cells, 45; row 9: unit 8,
    // 9 units, 81), and the proposals come in ascending order, so that the lowest extra costs nothing more
    var WORKS = [[row5, 3, 1, 243], [row5, 1, 2, 45 + 243], [row5, 1, 9, 45 + 45 + 243],
      [row9, 3, 1, 243], [row9, 1, 2, 81 + 243], [row9, 1, 9, 81 + 81 + 243]];

    it('has R10\'s limit of 50000 and reports one record of its own per call that ran', function () {
      expect(SG.wingSearch.BUG_PLUS_ONE_WORK_LIMIT).toBe(50000);
      var built = grave(row5, 3, 1);
      var out = bugObserved(model9, built.state);
      expect(out.finding).not.toBeNull();
      expect(out.records).toEqual([{ id: 'bugPlusOne', work: 243, limit: 50000, capHit: null, retained: null }]);
      expect(bugObserved(model9, built.state).record).not.toBe(out.record);
      // a position that the guard refuses: one record, nothing tallied; the same for a call that tallies and finds
      // nothing (a distant unit with a wrong count)
      expect(bugObserved(model9, board(model9, [])).records)
        .toEqual([{ id: 'bugPlusOne', work: 0, limit: 50000, capHit: null, retained: null }]);
      var far = bugDistantCell(model9, bugCellWith(model9, 3, row5));
      var broken = SG.model.cloneState(built.state);
      var pair = SG.bits.toArray(broken.candidates[far]);
      broken.candidates[far] = (broken.candidates[far] & ~bit(pair[1])) |
        bit([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(function (d) { return pair.indexOf(d) === -1; })[0]);
      var lost = bugObserved(model9, broken);
      expect(lost.finding).toBeNull();
      expect(lost.record.capHit).toBeNull();
      expect(lost.record.work).toBeGreaterThan(0);
      expect(lost.record.work).toBe(bugOf(model9, broken).units);
    });

    it('counts one unit per cell tallied under a proposed digit, the proposals in ascending order, a proposal ending ' +
      'at its first broken unit', function () {
        WORKS.forEach(function (w) {
          var built = grave(w[0], w[1], w[2]);
          var out = bugObserved(model9, built.state);
          expect([w[2], out.record.work]).toEqual([w[2], w[3]]);
          expect(bugOf(model9, built.state).units).toBe(w[3]);
          expect(out.finding.placements).toEqual([[bugCellWith(model9, w[1], w[0]), w[2]]]);
        });
        // the largest call of 9 digits on a grave: a refused first and second proposal in the last row, then 243
        expect(WORKS[5][3]).toBe(405);
        // the counter starts afresh with every call
        var built = grave(row9, 1, 9);
        expect(bugObserved(model9, built.state).record.work).toBe(405);
        expect(bugObserved(model9, built.state).record.work).toBe(405);
        // 16 digits: a unit holds 16 cells, 48 units: 768 for the proposal that qualifies, 15 units and the refused
        // one (256) for each refused proposal before it
        var last = model16.cellCount - 1;
        var big = bugState(model16, last, { extra: 16 });
        var bigWork = bugObserved(model16, big.state).record.work;
        expect(bigWork).toBe(256 + 256 + 768);
        expect(bugOf(model16, big.state).units).toBe(bigWork);
      });

    it('is counted as the rule says on the real positions and on 120 random states', function () {
      var positions = entryPositions();
      positions.forEach(function (state) {
        var out = bugObserved(model9, state);
        expect(out.finding).not.toBeNull();
        expect(out.record.work).toBe(bugOf(model9, state).units);
        expect(out.record.work).toBeGreaterThanOrEqual(243);
      });
      var items = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(777), 120);
      var tallied = 0;
      items.forEach(function (item, index) {
        var out = bugObserved(model9, item.state);
        var recount = bugOf(model9, item.state).units;
        if (out.record.work !== recount) fail('state #' + index + ': ' + out.record.work + ' units counted, ' + recount + ' by the rule');
        if (recount > 0) tallied++;
        expect(out.record.capHit).toBeNull();
      });
      expect(tallied).toBeLessThan(items.length);
    });

    function entryPositions() {
      var fixtures = SG.fixtures.techniques;
      return fixtures.byId.bugPlusOne.positive.concat(fixtures.supplements.bugPlusOne).map(function (fixture) {
        return H.stateAfter(model9, fixture.puzzle, fixture.after);
      });
    }

    it('ends a call whose limit is spent with nothing found, never a wrong finding, and says so', function () {
      var built = grave(row5, 1, 9);
      var plain = bugFind(model9, built.state);
      expect(plain).not.toBeNull();
      var exact = bugObserved(model9, built.state, { seam: true, limit: 333 });
      expect(exact.finding).toEqual(plain);
      expect(exact.record).toEqual({ id: 'bugPlusOne', work: 333, limit: 333, capHit: null, retained: null });
      [332, 288, 100, 45, 1, 0].forEach(function (limit) {
        var out = bugObserved(model9, built.state, { seam: true, limit: limit });
        expect(out.finding).toBeNull();
        expect(out.record).toEqual({ id: 'bugPlusOne', work: limit, limit: limit, capHit: 'work', retained: null });
      });
      expect(bugObserved(model9, built.state, { seam: true }).record.limit).toBe(50000);
      // the limit is the call's: a position that the guard refuses never reaches it, even with the limit 0
      var refused = bugObserved(model9, board(model9, []), { seam: true, limit: 0 });
      expect(refused.record).toEqual({ id: 'bugPlusOne', work: 0, limit: 0, capHit: null, retained: null });
    });

    it('floors a fractional limit and rejects an invalid one with solver.invalidOption', function () {
      var built = grave(row5, 1, 9);
      expect(bugObserved(model9, built.state, { seam: true, limit: 332.9 }).record)
        .toEqual({ id: 'bugPlusOne', work: 332, limit: 332, capHit: 'work', retained: null });
      [-1, NaN, Infinity, '5', null].forEach(function (workLimit) {
        var ctx = SG.techniques.createContext(model9, {});
        var err = thrownBy(function () { SG.wingSearch.bugPlusOne(model9, built.state, ctx, { workLimit: workLimit }); });
        expect([String(workLimit), err && err.code]).toEqual([String(workLimit), 'solver.invalidOption']);
        expect(err.message).toContain('wingSearch.bugPlusOne workLimit');
      });
      var ok = SG.techniques.createContext(model9, {});
      expect(SG.wingSearch.bugPlusOne(model9, built.state, ok, {})).not.toBeNull();
      expect(SG.wingSearch.bugPlusOne(model9, built.state, ok, { workLimit: undefined })).not.toBeNull();
    });

    it('checks the parent budget at its entry and so that at most 256 units pass between two checks', function () {
      var vector = bugCheckWorks(model9, grave(row5, 3, 1).state);
      // 243 units: the entry check only
      expect(vector.works).toEqual([0]);
      // 405 units: the entry check and the check before the 257th unit
      var big = bugCheckWorks(model9, grave(row9, 1, 9).state);
      expect(big.free.records[0].work).toBe(405);
      expect(big.works).toEqual([0, 256]);
      // 1,280 units on 16 digits: checks at 0, 256, 512, 768 and 1,024
      var wide = bugCheckWorks(model16, bugState(model16, model16.cellCount - 1, { extra: 16 }).state);
      expect(wide.works).toEqual([0, 256, 512, 768, 1024]);
      var gaps = wide.works.map(function (w, i) { return (i + 1 < wide.works.length ? wide.works[i + 1] : 1280) - w; });
      expect(Math.max.apply(null, gaps)).toBeLessThanOrEqual(256);
      // a position that the guard refuses has the entry check only
      expect(bugCheckWorks(model9, board(model9, [])).works).toEqual([0]);
    });

    it('reports a spent budget as nothing found (capHit null) and lets cancellation and other errors through with no ' +
      'record', function () {
        var built = grave(row9, 1, 9);
        // the entry check and the check before the 257th unit
        [[0, 0], [1, 256]].forEach(function (entry) {
          var parent = SG.budget.create({ nodes: entry[0] });
          var spent = bugObserved(model9, built.state, { ctx: { budget: parent } });
          expect(spent.finding).toBeNull();
          expect(spent.records).toEqual([{ id: 'bugPlusOne', work: entry[1], limit: 50000, capHit: null, retained: null }]);
          // capHit null is no proof of a complete scan: the caller's budget still fails after the call
          expect(thrownBy(function () { parent.check(); }).code).toBe('budget.exceeded');
        });
        // a budget with room for the whole call changes nothing
        var roomy = bugObserved(model9, built.state, { ctx: { budget: SG.budget.create({ nodes: 10 }) } });
        expect(roomy.finding).toEqual(bugFind(model9, built.state));
        // cancellation or another error at the entry check and at the second check: thrown as it is, no record at all
        [['budget.cancelled', true], ['boom', false]].forEach(function (kind) {
          [1, 2].forEach(function (at) {
            var k = 0;
            var records = [];
            var ctx = Object.assign({}, SG.techniques.createContext(model9, {}), {
              options: { onPatternWork: function (r) { records.push(r); } },
              check: function () {
                if (++k === at) {
                  throw kind[1] ? new SG.errors.GenerationError(kind[0], { reason: 'cancelled' }) : new Error(kind[0]);
                }
              }
            });
            var thrown = thrownBy(function () { SG.techniques.get('bugPlusOne').find(model9, built.state, ctx); });
            expect(thrown).toBeTruthy();
            expect(kind[1] ? thrown.code : thrown.message).toBe(kind[0]);
            expect(k).toBe(at);
            expect(records).toEqual([]);
          });
        });
        // an error thrown by the observer propagates, for a found, a capped and a refused call
        [[built.state, undefined], [built.state, 10], [board(model9, []), undefined]].forEach(function (c) {
          var ctx = SG.techniques.createContext(model9, { onPatternWork: function () { throw new Error('observer'); } });
          var thrown = thrownBy(function () {
            SG.wingSearch.bugPlusOne(model9, c[0], ctx, c[1] === undefined ? undefined : { workLimit: c[1] });
          });
          expect(thrown && thrown.message).toBe('observer');
        });
      });

    it('is not fooled by a hostile or absent observer', function () {
      var built = grave(row5, 3, 1);
      var plain = JSON.stringify(bugFind(model9, built.state));
      ['not a function', null, 7].forEach(function (observer) {
        expect(JSON.stringify(bugFind(model9, built.state, { onPatternWork: observer }))).toBe(plain);
      });
    });

    it('leaves no mark behind: a call after a capped or budget-spent call answers like a fresh one', function () {
      var built = grave(row9, 1, 9);
      var fresh = JSON.stringify(bugFind(model9, built.state));
      bugObserved(model9, built.state, { seam: true, limit: 10 });
      bugObserved(model9, built.state, { ctx: { budget: SG.budget.create({ nodes: 1 }) } });
      expect(JSON.stringify(bugFind(model9, built.state))).toBe(fresh);
      expect(bugObserved(model9, built.state).record.work).toBe(405);
    });
  });

  describe('bugPlusOne (R14): agreement with an independent enumeration', function () {
    /** One seeded mutation of a grave: nothing, a candidate added, removed or moved, or a cell solved without propagation. */
    function mutate(model, state, rng) {
      var kind = rng.int(8);
      if (kind < 2) return 'none';
      var openCells = [];
      for (var c = 0; c < model.cellCount; c++) if (open(state, c)) openCells.push(c);
      var cell = openCells[rng.int(openCells.length)];
      var digits = SG.bits.toArray(state.candidates[cell]);
      var missing = [];
      for (var d = 1; d <= model.digits; d++) if (digits.indexOf(d) === -1) missing.push(d);
      if (kind === 2 && missing.length > 0) {
        state.candidates[cell] |= bit(missing[rng.int(missing.length)]);
        return 'add';
      }
      if (kind === 3 && digits.length > 1) {
        state.candidates[cell] &= ~bit(digits[rng.int(digits.length)]);
        return 'remove';
      }
      if (kind === 4 && missing.length > 0 && digits.length > 0) {
        state.candidates[cell] = (state.candidates[cell] & ~bit(digits[rng.int(digits.length)])) |
          bit(missing[rng.int(missing.length)]);
        return 'move';
      }
      if (kind === 5) {
        state.value[cell] = digits[rng.int(digits.length)];
        state.candidates[cell] = bit(state.value[cell]);
        state.unsolvedCount--;
        return 'solve';
      }
      if (kind === 6 && missing.length > 0) {
        // the third candidate somewhere else as well (a second trivalue cell, or a fourth candidate)
        state.candidates[cell] |= bit(missing[rng.int(missing.length)]);
        state.candidates[openCells[rng.int(openCells.length)]] |= bit(1 + rng.int(model.digits));
        return 'two';
      }
      return 'none';
    }

    var SETUPS = [['4 digits', model4, 120], ['6 digits', model6, 120], ['9 digits', model9, 120],
      ['12 digits', model12, 60], ['a 4x4 jigsaw', jigsawModel(), 120]];
    ['diagonalX', 'jigsaw9'].forEach(function (id) {
      if (SG.testkit.hasVariant(id)) SETUPS.push([id, H.model(id), 40]);
    });

    SETUPS.forEach(function (setup) {
      it('agrees with the enumeration on ' + setup[2] + ' mutated graves of ' + setup[0] + ': the same Finding or none, ' +
        'and the same work', function () {
          var model = setup[1];
          var rng = SG.testkit.rng.create(SEED + model.digits + model.cellCount);
          var yes = 0;
          var no = 0;
          var kinds = {};
          for (var i = 0; i < setup[2]; i++) {
            var placed = rng.int(3) === 0 ? [model.digits] : [];
            var solution = bugSolution(model);
            var cell;
            do { cell = rng.int(model.cellCount); } while (placed.indexOf(solution[cell]) !== -1);
            var state = bugState(model, cell, { placed: placed }).state;
            var kind = mutate(model, state, rng);
            kinds[kind] = (kinds[kind] || 0) + 1;
            var want = bugOf(model, state);
            var got = bugFind(model, state);
            if ((got !== null) !== (want.found !== null)) {
              fail((got !== null ? 'found' : 'missed') + ' a grave on mutation #' + i + ' (' + kind + ') of ' + setup[0] +
                '\n  finding: ' + JSON.stringify(got) + '\n  enumeration: ' + JSON.stringify(want.found));
            }
            if (got !== null) {
              ORACLE.bugPlusOne.verify(model, state, got);
              yes++;
            } else {
              no++;
            }
            expect(bugObserved(model, state).record.work).toBe(want.units);
          }
          expect(yes).toBeGreaterThanOrEqual(Math.floor(setup[2] / 8));
          expect(no).toBeGreaterThanOrEqual(Math.floor(setup[2] / 8));
          expect(Object.keys(kinds).length).toBeGreaterThanOrEqual(4);
        });
    });

    /** Walks the states of the corpus and asks the finder and the enumeration on every position; places what it finds. */
    function walk(model, count, maxSteps) {
      var items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(SEED), count);
      var fired = 0;
      items.forEach(function (item, index) {
        var state = SG.model.cloneState(item.state);
        for (var step = 0; step < maxSteps && state.unsolvedCount > 0; step++) {
          var finding = bugFind(model, state);
          var wanted = ORACLE.bugPlusOne.exists(model, state);
          if ((finding !== null) !== wanted) {
            fail('bugPlusOne ' + (finding !== null ? 'found' : 'missed') + ' a pattern the enumeration ' +
              (wanted ? 'sees' : 'does not see') + ' on state #' + index + ' step ' + step + '\n  puzzle: ' +
              H.puzzleString(model, item.givens) + '\n  finding: ' + JSON.stringify(finding));
          }
          if (finding === null) break;
          ORACLE.bugPlusOne.verify(model, state, finding);
          expect(finding.placements[0][1]).toBe(item.solution[finding.placements[0][0]]);
          fired++;
          if (!SG.constraints.assign(model, state, finding.placements[0][0], finding.placements[0][1]) ||
              !SG.constraints.propagate(model, state)) {
            fail('bugPlusOne led to a contradiction on state #' + index);
          }
        }
      });
      return fired;
    }

    [['4 digits', model4, 300, 12], ['6 digits', model6, 200, 12], ['9 digits', model9, 300, 12],
      ['12 digits', model12, 60, 8]].forEach(function (setup) {
      it('agrees with the enumeration on every position of the random corpus of ' + setup[0] + ' and only places the ' +
        'solution', function () {
          expect(walk(setup[1], setup[2], setup[3])).toBeGreaterThanOrEqual(0);
        });
    });

    it('agrees with the enumeration on every published position', function () {
      Object.keys(PUBLISHED).forEach(function (name) {
        var state = H.makeState(model9, PUBLISHED[name]);
        var found = bugFind(model9, state);
        expect(found !== null).toBe(ORACLE.bugPlusOne.exists(model9, state));
      });
    });

    [['4 digits', model4, 300], ['6 digits', model6, 200], ['9 digits', model9, 300], ['12 digits', model12, 200],
      ['16 digits (a few states: generating them is slow)', model16, 8]].forEach(function (setup) {
      it('stays sound on ' + setup[0] + ': a placement is always a digit of the solution', function () {
        H.assertSound(SG.test, 'bugPlusOne', { model: setup[1], count: setup[2], minFirings: 0 });
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
