// Almost-locked sets: the bounded enumerator SG.alsPatterns.enumerate of ../core/js/engine/tech-als.js
// (difficulty v3, R18, MS15a). The helper is INACTIVE: no technique is registered, so these suites are all
// that reads it.
//
// Layout of this suite:
//   scope        the API, the limits, nothing registered, no observer record
//   vectors      what is an ALS and what is not (cardinality, units, fixed cells, partial units), by hand
//   order        the canonical order, deduplication, independence of the order of units and cells
//   agreement    every record and the work, against an independent enumeration, on seeded positions of every
//                unit shape (classic, 4 to 16 digits, diagonal, windows, Jigsaw, partial cages, Samurai)
//   records      the record limit and the prefix it leaves
//   work         the shared guard, the work limit and the prefix that a cut leaves
//   budget       the parent budget at entry and every 256 units, cancellation, other errors
//   ownership    arrays of the caller, nothing read twice, nothing cached, no interference with the finders
//
// The enumeration of the RECORDS (`oracle`) is independent: it is written from model.units, the state and
// sorted digit lists only (all subsets of the open cells of each unit, the union of their digits, a table by
// the cells), with no mask, no pruning and no search order of the engine. The WORK and PROBE counts
// (`unitWork`) are not independent in that sense: they re-implement the engine's walk, with the same order of
// cells, the same union bound and the same size bound, from the definition of a work unit, and so pin the
// stated count rather than discover it.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.techHelper;
  var A = SG.alsPatterns;
  var J = SG.fixtures.jigsawModels;
  var M = SG.fixtures.models;

  var DEFAULT = { cells: 4, records: 4096, work: 50000 };

  function numeric(a, b) { return a - b; }

  function range(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(i);
    return out;
  }

  function maskOf(digits) {
    var mask = 0;
    for (var i = 0; i < digits.length; i++) mask |= 1 << (Number(digits.charAt(i)) - 1);
    return mask;
  }

  function caught(fn) {
    try {
      fn();
    } catch (err) {
      return err;
    }
    return null;
  }

  // ---------------------------------------------------------------------------------------------------------
  // Boards

  /**
   * A D x D model of rows, columns and boxes (or `regions`) with `extra` units after them.
   * `order.reverseUnits` lists the units backwards and `order.descendingCells` each unit's cells from the
   * highest index down.
   */
  function buildModel(id, D, boxRows, boxCols, extra, order) {
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
      units.push(range(D).map(function (col) { return r * D + col; }));
      meta.push({ kind: 'row', label: 'R' + (r + 1) });
    }
    for (c = 0; c < D; c++) {
      units.push(range(D).map(function (row) { return row * D + c; }));
      meta.push({ kind: 'col', label: 'C' + (c + 1) });
    }
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
    (extra || []).forEach(function (unit) {
      units.push(unit.cells);
      meta.push({ kind: unit.kind, label: unit.label, partial: unit.partial === true });
    });
    if (order && order.reverseUnits) {
      units.reverse();
      meta.reverse();
    }
    if (order && order.descendingCells) units = units.map(function (u) { return u.slice().reverse(); });
    return SG.model.create({
      variantId: id,
      digits: D,
      units: units,
      unitMeta: meta,
      layout: { rows: D, cols: D, cellRow: cellRow, cellCol: cellCol }
    });
  }

  var m9 = H.model('classic9');
  var m6 = H.model('classic6');
  var m4 = H.model('classic4');
  var m12 = M.boxGrid('als-12', 3, 4);
  var m16 = M.boxGrid('als-16', 4, 4);

  function cellAt(ref) { return H.cell(m9, ref); }

  // Three cells that no row, column or box of a 9 x 9 board shares, a partial all-different unit: a Killer
  // cage.
  var CAGE = [{ kind: 'cage', label: 'K1', cells: [0, 40, 80], partial: true }];
  var cageModel = buildModel('als-cage', 9, 3, 3, CAGE);
  var diagonalModel = buildModel('als-diagonal', 9, 3, 3, [
    { kind: 'diag', label: 'D1', cells: range(9).map(function (i) { return i * 9 + i; }) },
    { kind: 'diag', label: 'D2', cells: range(9).map(function (i) { return i * 9 + 8 - i; }) }
  ]);
  var hyperModel = buildModel('als-hyper', 9, 3, 3, [[1, 1], [1, 5], [5, 1], [5, 5]].map(function (o, i) {
    var cells = [];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) cells.push((o[0] + r) * 9 + o[1] + c);
    return { kind: 'window', label: 'W' + (i + 1), cells: cells };
  }));
  var samuraiModel = M.samurai();

  // ---------------------------------------------------------------------------------------------------------
  // States

  /**
   * A state with the given candidates ({ R1C1: '12' }) and solved cells ({ R1C3: 4 }); nothing is propagated.
   */
  function position(model, restricted, solved) {
    var state = SG.model.initState(model);
    Object.keys(solved || {}).forEach(function (ref) {
      if (!SG.constraints.assign(model, state, H.cell(model, ref), solved[ref])) {
        throw new Error('contradiction');
      }
    });
    Object.keys(restricted || {}).forEach(function (ref) {
      state.candidates[H.cell(model, ref)] = maskOf(restricted[ref]);
    });
    return state;
  }

  /**
   * Positions consistent with a known solution: a share of the cells placed, a share of the wrong candidates
   * kept.
   */
  function seededStates(model, solve, seed, count, keepRange) {
    var rng = SG.testkit.rng.create(seed);
    var out = [];
    for (var i = 0; i < count; i++) {
      var solution = solve(model, rng.fork('grid' + i));
      var pick = rng.fork('pick' + i);
      var placedShare = 0.03 + 0.25 * pick.next();
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
      out.push(state);
    }
    return out;
  }

  function randomSolution(model, rng) { return SG.testkit.randomSolution(model, rng); }

  /** Every open cell of a 16 x 16 board with exactly two candidates, chosen from the seed. */
  function twoCandidates(model, seed) {
    var rng = SG.testkit.rng.create(seed);
    var state = SG.model.initState(model);
    for (var c = 0; c < model.cellCount; c++) {
      var mask = 0;
      while (popcount(mask) < 2) mask |= 1 << rng.int(model.digits);
      state.candidates[c] = mask;
    }
    return state;
  }

  function popcount(mask) {
    var n = 0;
    for (; mask !== 0; mask >>>= 1) n += mask & 1;
    return n;
  }

  function snapshotOf(model, state) {
    return JSON.stringify({
      state: [Array.from(state.candidates), Array.from(state.value), state.unsolvedCount],
      model: [model.units.map(function (u) { return Array.from(u); }), model.unitMeta,
        model.peers.map(function (p) { return Array.from(p); }), model.digits, model.variantId,
        model.cellCount]
    });
  }

  // ---------------------------------------------------------------------------------------------------------
  // The independent enumeration

  function digitsOf(model, state, cell) {
    var out = [];
    for (var d = 1; d <= model.digits; d++) if ((state.candidates[cell] & (1 << (d - 1))) !== 0) out.push(d);
    return out;
  }

  function mergeDigits(a, b) {
    var seen = {};
    var out = [];
    a.concat(b).forEach(function (d) {
      if (!seen[d]) {
        seen[d] = true;
        out.push(d);
      }
    });
    return out.sort(numeric);
  }

  function eachCombination(list, k, visit) {
    var picked = [];
    function walk(from) {
      if (picked.length === k) {
        visit(picked.slice());
        return;
      }
      for (var i = from; i < list.length; i++) {
        picked.push(list[i]);
        walk(i + 1);
        picked.pop();
      }
    }
    walk(0);
  }

  function openCells(model, state, unit) {
    return model.units[unit].filter(function (c) { return state.value[c] === 0; }).sort(numeric);
  }

  /**
   * The tested extensions of one unit and size, by the definition of a work unit: every open cell tried after
   * a prefix whose union has at most k + 1 digits, only the cells that can still complete a combination of k.
   * With `first` the count stops at the first ALS found (the probe), and `hit` says whether one was found.
   * This is NOT an independent discovery of the engine's count: it re-implements the engine's walk (the same
   * order of cells, union bound and completion bound) in digit lists instead of masks.
   */
  function unitWork(model, state, open, k, first) {
    var tests = 0;
    var hit = false;
    function walk(depth, from, union) {
      var last = open.length - (k - depth);
      for (var i = from; i <= last && !(first && hit); i++) {
        tests++;
        var merged = mergeDigits(union, digitsOf(model, state, open[i]));
        if (merged.length > k + 1) continue;
        if (depth + 1 === k) {
          if (merged.length === k + 1) hit = true;
        } else {
          walk(depth + 1, i + 1, merged);
        }
      }
    }
    walk(0, 0, []);
    return { tests: tests, hit: hit };
  }

  /**
   * All the ALS of at most maxCells cells: { records, levels: [{ size, work, probe }] }. `records` is
   * ordered by cell count, then by the cells (the independent part: every subset of every unit). In each
   * level, `work` is the tested extensions of that size over all units and `probe` those up to the first ALS
   * of that size in unit order (null when there is none): the counts of `unitWork` above, with the size bound
   * of the engine.
   */
  function oracle(model, state, maxCells) {
    var table = {};
    var levels = [];
    // k cells need k + 1 different digits, so no set has more cells than the board has digits minus one
    for (var k = 1; k <= Math.min(maxCells, model.digits - 1); k++) {
      var level = { size: k, work: 0, probe: null };
      var spent = 0;
      for (var u = 0; u < model.units.length; u++) {
        var open = openCells(model, state, u);
        level.work += unitWork(model, state, open, k, false).tests;
        if (level.probe === null) {
          var probe = unitWork(model, state, open, k, true);
          spent += probe.tests;
          if (probe.hit) level.probe = spent;
        }
        eachCombination(open, k, function (cells) {
          var digits = cells.reduce(function (acc, c) {
            return mergeDigits(acc, digitsOf(model, state, c));
          }, []);
          if (digits.length !== k + 1) return;
          var occurrences = {};
          digits.forEach(function (d) {
            occurrences[d] = cells.filter(function (c) {
              return digitsOf(model, state, c).indexOf(d) !== -1;
            });
          });
          table[cells.join(',')] = { cells: cells, digits: digits, occurrences: occurrences };
        });
      }
      levels.push(level);
    }
    var records = Object.keys(table).map(function (key) { return table[key]; }).sort(function (a, b) {
      if (a.cells.length !== b.cells.length) return a.cells.length - b.cells.length;
      for (var i = 0; i < a.cells.length; i++) if (a.cells[i] !== b.cells[i]) return a.cells[i] - b.cells[i];
      return 0;
    });
    return { records: records, levels: levels };
  }

  /**
   * Whether one record is valid by itself: open cells in one unit, the union of their digits, k + 1 of them.
   */
  function problemsOf(model, state, record) {
    var out = [];
    var k = record.cells.length;
    if (k < 1) out.push('no cells');
    record.cells.forEach(function (c, i) {
      if (state.value[c] !== 0) out.push('cell ' + c + ' is solved');
      if (i > 0 && record.cells[i - 1] >= c) out.push('cells are not ascending');
    });
    var shared = model.units.some(function (u) {
      return record.cells.every(function (c) { return u.indexOf(c) !== -1; });
    });
    if (!shared) out.push('no unit holds the cells');
    var digits = record.cells.reduce(function (acc, c) {
      return mergeDigits(acc, digitsOf(model, state, c));
    }, []);
    if (JSON.stringify(digits) !== JSON.stringify(record.digits)) out.push('digits are not the union');
    if (record.digits.length !== k + 1) out.push('digit count is not k + 1');
    if (JSON.stringify(Object.keys(record.occurrences)) !== JSON.stringify(record.digits.map(String))) {
      out.push('occurrence keys are not the digits');
    }
    record.digits.forEach(function (d) {
      var here = record.cells.filter(function (c) { return digitsOf(model, state, c).indexOf(d) !== -1; });
      if (JSON.stringify(record.occurrences[d]) !== JSON.stringify(here) || here.length === 0) {
        out.push('occurrences of ' + d);
      }
    });
    return out;
  }

  function run(model, state, limits, workLimit, ctx) {
    var work = A.createWork(workLimit);
    var result = A.enumerate(model, state, ctx || SG.techniques.createContext(model, {}), work, limits);
    return { result: result, work: work };
  }

  /**
   * expect(actual).toEqual(expected) for large values: compared as JSON first, so that a pass costs no
   * report.
   */
  function same(label, actual, expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      expect([label, actual]).toEqual([label, expected]);
    }
  }

  function recordsOf(model, state) { return run(model, state, undefined, undefined).result.records; }

  function rec(cells, digits, occurrences) {
    return { cells: cells, digits: digits, occurrences: occurrences };
  }

  // ---------------------------------------------------------------------------------------------------------

  describe('als enumerator: scope', function () {
    it('offers enumerate, createWork, spend and the limits 4 cells, ' +
      '4096 records and 50000 units', function () {
      expect(typeof A.enumerate).toBe('function');
      expect(typeof A.createWork).toBe('function');
      expect(typeof A.spend).toBe('function');
      expect(A.LIMITS).toEqual(DEFAULT);
      expect(Object.isFrozen(A.LIMITS)).toBe(true);
      expect(Object.keys(A).sort()).toEqual(['LIMITS', 'createWork', 'enumerate', 'spend']);
    });

    it('is inactive: no ALS technique is registered, so no solve, rating or hint can reach it', function () {
      ['alsXz', 'sueDeCoq', 'als', 'alsEnumerate', 'alsXyWing', 'deathBlossom'].forEach(function (id) {
        expect(SG.techniques.has(id)).toBe(false);
      });
      SG.techniques.list().forEach(function (def) {
        expect(/^als/i.test(def.id) || /sueDeCoq/.test(def.id)).toBe(false);
      });
    });

    it('returns exactly records, complete and capHit, ' +
      'and records of exactly cells, digits and occurrences', function () {
      var out = run(m9, position(m9, { R1C1: '12', R1C2: '23' })).result;
      expect(Object.keys(out)).toEqual(['records', 'complete', 'capHit']);
      expect(out.records).toHaveLength(3);
      out.records.forEach(function (r) {
        expect(Object.keys(r)).toEqual(['cells', 'digits', 'occurrences']);
      });
      expect(out.complete).toBe(true);
      expect(out.capHit).toBeNull();
    });

    it('publishes no onPatternWork record, whatever the outcome: the enclosing finder does', function () {
      var seen = [];
      var observer = function (r) { seen.push(r); };
      var model = m16;
      var state = twoCandidates(model, 3);
      var ctx = SG.techniques.createContext(model, { onPatternWork: observer });
      A.enumerate(model, state, ctx, A.createWork(), undefined);
      A.enumerate(model, state, ctx, A.createWork(500), undefined);
      A.enumerate(model, state, ctx, A.createWork(), { records: 3 });
      var spent = SG.budget.create({ nodes: 1 });
      A.enumerate(model, state,
        SG.techniques.createContext(model, { budget: spent, onPatternWork: observer }),
        A.createWork(), undefined);
      expect(seen).toEqual([]);
    });
  });

  describe('als enumerator: what is an almost-locked set', function () {
    it('takes a bivalue cell as a 1-cell ALS, and no cell with one, three or more candidates', function () {
      var state = position(m9, { R5C5: '12', R1C1: '4', R2C4: '123', R3C7: '1234' });
      var out = run(m9, state).result;
      expect(out.records).toEqual([rec([40], [1, 2], { 1: [40], 2: [40] })]);
      expect(out.complete).toBe(true);
    });

    it('takes two cells of one unit with the candidates {1,2} and {2,3} as a 2-cell ALS', function () {
      var out = run(m9, position(m9, { R1C1: '12', R1C2: '23' })).result;
      expect(out.records).toEqual([
        rec([0], [1, 2], { 1: [0], 2: [0] }),
        rec([1], [2, 3], { 2: [1], 3: [1] }),
        rec([0, 1], [1, 2, 3], { 1: [0], 2: [0, 1], 3: [1] })
      ]);
    });

    it('rejects two cells whose union is 2 (a naked pair) or 4 digits: ' +
      'only the bivalue cells remain', function () {
      expect(recordsOf(m9, position(m9, { R1C1: '12', R1C2: '12' }))).toEqual([
        rec([0], [1, 2], { 1: [0], 2: [0] }),
        rec([1], [1, 2], { 1: [1], 2: [1] })
      ]);
      expect(recordsOf(m9, position(m9, { R1C1: '12', R1C2: '34' }))).toEqual([
        rec([0], [1, 2], { 1: [0], 2: [0] }),
        rec([1], [3, 4], { 3: [1], 4: [1] })
      ]);
    });

    it('takes three cells with four digits, and not three cells with five', function () {
      expect(recordsOf(m9, position(m9, { R1C1: '123', R1C2: '234', R1C3: '134' }))).toEqual([
        rec([0, 1, 2], [1, 2, 3, 4], { 1: [0, 2], 2: [0, 1], 3: [0, 1, 2], 4: [1, 2] })
      ]);
      expect(recordsOf(m9, position(m9, { R1C1: '123', R1C2: '234', R1C3: '345' }))).toEqual([]);
    });

    it('takes four cells with five digits, and stops at four cells: ' +
      'five cells with six digits are not enumerated', function () {
      var four = { R1C1: '1234', R1C2: '1235', R1C3: '1245', R1C4: '1345' };
      expect(recordsOf(m9, position(m9, four))).toEqual([
        rec([0, 1, 2, 3], [1, 2, 3, 4, 5],
          { 1: [0, 1, 2, 3], 2: [0, 1, 2], 3: [0, 1, 3], 4: [0, 2, 3], 5: [1, 2, 3] })
      ]);
      var five = { R1C1: '12345', R1C2: '12346', R1C3: '12356', R1C4: '12456', R1C5: '13456' };
      var state = position(m9, five);
      var out = run(m9, state).result;
      expect(out.records).toEqual([]);
      expect(out.complete).toBe(true);
      // the limit is what leaves it out: with five cells allowed the set is a record
      var wider = run(m9, state, { cells: 5 }).result.records;
      expect(wider).toHaveLength(1);
      expect(wider[0].cells).toEqual([0, 1, 2, 3, 4]);
      expect(wider[0].digits).toEqual([1, 2, 3, 4, 5, 6]);
      // a huge limit is no runaway: sizes beyond what the digits allow (8 of 9) are not searched. The larger
      // sets are real ones: eight cells of a unit with all nine digits.
      // The same bound, finitely: a ninth cell would need ten digits, so nine allowed cells search no more
      // than eight
      var eight = run(m9, state, { cells: 8 });
      var nine = run(m9, state, { cells: 9 });
      expect(nine.work.used).toBe(eight.work.used);
      expect(nine.result).toEqual(eight.result);
      var huge = run(m9, state, { cells: 1000000000000 });
      expect(huge.result.complete).toBe(true);
      expect(huge.result.records.filter(function (r) { return r.cells.length <= 5; })).toEqual(wider);
      huge.result.records.filter(function (r) { return r.cells.length > 5; }).forEach(function (r) {
        expect([r.cells.length, r.digits.length]).toEqual([8, 9]);
      });
      expect(huge.result.records.length).toBeGreaterThan(wider.length);
      expect(huge.work.used).toBe(eight.work.used);
      // and with three allowed the four-cell set goes the same way
      expect(run(m9, position(m9, four), { cells: 3 }).result.records).toEqual([]);
      expect(run(m9, position(m9, four), { cells: 4 }).result.records).toHaveLength(1);
      var none = run(m9, position(m9, four), { cells: 0 });
      expect(none.result).toEqual({ records: [], complete: true, capHit: null });
      expect(none.work.used).toBe(0);
    });

    it('needs the cells to share ONE unit: ' +
      'cells that see each other only through different units are no ALS', function () {
      // R1C1, R5C5 share no unit: neither a row, a column nor a box
      var out = recordsOf(m9, position(m9, { R1C1: '12', R5C5: '23' }));
      expect(out).toEqual([
        rec([0], [1, 2], { 1: [0], 2: [0] }),
        rec([40], [2, 3], { 2: [40], 3: [40] })
      ]);
      // three cells that pairwise see each other through three different units still do not make a set
      // R1C1 and R1C4 (row), R1C1 and R4C1 (column), R1C4 and R4C1 share nothing, so add R4C4 (box 5,
      // column 4, row 4)
      var around = position(m9, { R1C1: '123', R1C4: '234', R4C1: '134' });
      expect(recordsOf(m9, around)).toEqual([]);
    });

    it('counts only open cells: a solved cell is never in a record and its digit joins nothing', function () {
      var solved = position(m9, { R1C1: '12', R1C2: '23' }, { R1C3: 4 });
      expect(recordsOf(m9, solved)).toEqual(recordsOf(m9, position(m9, { R1C1: '12', R1C2: '23' })));
      // were the solved R1C3 (value 4) an open cell, {1,2} + {4} would be a 2-cell set
      recordsOf(m9, solved).forEach(function (r) { expect(r.cells.indexOf(2)).toBe(-1); });
      // a fully solved row leaves its unit without any set
      var all = SG.model.initState(m9);
      for (var c = 0; c < 9; c++) SG.constraints.assign(m9, all, c, c + 1);
      var row = recordsOf(m9, all);
      row.forEach(function (r) { r.cells.forEach(function (cell) { expect(cell).toBeGreaterThan(8); }); });
    });

    it('lists a set that two units share once: ' +
      'two cells of a row and a box, a bivalue cell of three units', function () {
      var out = run(m9, position(m9, { R1C1: '12', R1C2: '23' })).result;
      // R1C1 and R1C2 are in row 1 and in box 1; R1C1 is also in column 1
      expect(out.records.filter(function (r) { return r.cells.length === 2; })).toHaveLength(1);
      expect(out.records.filter(function (r) { return r.cells.join() === '0'; })).toHaveLength(1);
      // a column and a box that meet in three cells: the same three cells found from both units, one record
      var column = recordsOf(m9, position(m9, { R1C1: '123', R2C1: '234', R3C1: '134' }));
      expect(column).toEqual([
        rec([0, 9, 18], [1, 2, 3, 4], { 1: [0, 18], 2: [0, 9], 3: [0, 9, 18], 4: [9, 18] })
      ]);
    });

    it('takes an open cell without candidates as adding no digit ' +
      '(an inconsistent position, a vacuous set)', function () {
      // R1C1 has none: with R1C2 {1,2,3} the two cells hold at most the digits of R1C2, so the pair is a
      // valid 2-cell set by the definition; no claim is made that the position is consistent. It is a
      // structural input of the enumeration, not an example of a valid puzzle.
      var state = position(m9, { R1C1: '', R1C2: '123' });
      var out = run(m9, state).result;
      expect(out.records).toEqual([rec([0, 1], [1, 2, 3], { 1: [1], 2: [1], 3: [1] })]);
    });

    it('takes genuine PARTIAL all-different units: ' +
      'a cage of three cells that no complete unit shares', function () {
      var pair = { R1C1: '12', R5C5: '23' };
      expect(recordsOf(cageModel, position(cageModel, pair))).toEqual([
        rec([0], [1, 2], { 1: [0], 2: [0] }),
        rec([40], [2, 3], { 2: [40], 3: [40] }),
        rec([0, 40], [1, 2, 3], { 1: [0], 2: [0, 40], 3: [40] })
      ]);
      // the same candidates on the board without the cage give no pair
      expect(recordsOf(m9, position(m9, pair)).filter(function (r) {
        return r.cells.length === 2;
      })).toEqual([]);
      var three = { R1C1: '123', R5C5: '234', R9C9: '134' };
      expect(recordsOf(cageModel, position(cageModel, three))).toEqual([
        rec([0, 40, 80], [1, 2, 3, 4], { 1: [0, 80], 2: [0, 40], 3: [0, 40, 80], 4: [40, 80] })
      ]);
      expect(recordsOf(m9, position(m9, three))).toEqual([]);
      // a partial unit of two cells holds no set of three
      var small = buildModel('als-small-cage', 9, 3, 3,
        [{ kind: 'cage', label: 'K1', cells: [0, 40], partial: true }]);
      expect(recordsOf(small, position(small, { R1C1: '123', R5C5: '234' }))).toEqual([]);
    });

    it('takes the diagonal and window units of other grids, and the regions of a Jigsaw', function () {
      var diag = recordsOf(diagonalModel, position(diagonalModel, { R1C1: '12', R5C5: '23' }));
      expect(diag.map(function (r) { return r.cells.join(); })).toEqual(['0', '40', '0,40']);
      // R2C2 and R4C4 share only a window of the hyper board
      var win = recordsOf(hyperModel, position(hyperModel, { R2C2: '12', R4C4: '23' }));
      expect(win.map(function (r) { return r.cells.join(); })).toEqual(['10', '30', '10,30']);
      var plain = recordsOf(m9, position(m9, { R2C2: '12', R4C4: '23' }));
      expect(plain.map(function (r) { return r.cells.join(); })).toEqual(['10', '30']);
      // two cells of a Jigsaw region that share no row and no column
      var model = J.build(J.parse(J.LAYOUTS.staggered));
      var region = model.units.filter(function (u, i) { return model.unitMeta[i].kind === 'region'; })[0];
      var pairOf = null;
      region.forEach(function (a) {
        region.forEach(function (b) {
          if (pairOf === null && a < b && Math.floor(a / 9) !== Math.floor(b / 9) && a % 9 !== b % 9) {
            pairOf = [a, b];
          }
        });
      });
      var state = SG.model.initState(model);
      state.candidates[pairOf[0]] = maskOf('12');
      state.candidates[pairOf[1]] = maskOf('23');
      expect(recordsOf(model, state).map(function (r) { return r.cells.join(); })).toContain(pairOf.join());
    });
  });

  describe('als enumerator: order and duplicates', function () {
    var SPEC = { R3C1: '12', R1C5: '23', R2C9: '34', R1C6: '34', R3C9: '45', R3C2: '23' };

    it('orders by cell count, then by the cell indexes, whatever the units that found the sets', function () {
      var out = recordsOf(m9, position(m9, SPEC));
      expect(out.map(function (r) { return r.cells.join(); })).toEqual([
        '4', '5', '17', '18', '19', '26', '4,5', '17,26', '18,19'
      ]);
    });

    it('does not depend on the order of the units or on the order of the cells inside a unit', function () {
      var expected = recordsOf(m9, position(m9, SPEC));
      [{ reverseUnits: true }, { descendingCells: true }, { reverseUnits: true, descendingCells: true }]
        .forEach(function (order) {
          var model = buildModel('als-order', 9, 3, 3, [], order);
          var state = position(model, SPEC);
          var snapshot = snapshotOf(model, state);
          var out = recordsOf(model, state);
          expect(out).toEqual(expected);
          expect(snapshotOf(model, state)).toBe(snapshot);
        });
      // and the work is the same too: it counts tests, and every unit is searched
      var a = run(m9, position(m9, SPEC)).work.used;
      var reversed = buildModel('als-order', 9, 3, 3, [], { reverseUnits: true });
      expect(run(reversed, position(reversed, SPEC)).work.used).toBe(a);
    });

    it('answers the same twice, with records that are equal and not the same arrays', function () {
      var state = position(m9, SPEC);
      var first = recordsOf(m9, state);
      var second = recordsOf(m9, state);
      expect(second).toEqual(first);
      expect(second[0]).not.toBe(first[0]);
      expect(second[0].cells).not.toBe(first[0].cells);
    });
  });

  describe('als enumerator: agreement with the independent enumeration', function () {
    var POPULATIONS = [
      { name: 'classic9', model: m9, solve: randomSolution, count: 12, seed: 1501, keep: [0.05, 0.4] },
      { name: 'classic6', model: m6, solve: randomSolution, count: 16, seed: 1502, keep: [0.1, 0.5] },
      { name: 'classic4', model: m4, solve: randomSolution, count: 8, seed: 1503, keep: [0.1, 0.6] },
      { name: '12 digits', model: m12, solve: randomSolution, count: 3, seed: 1504, keep: [0.15, 0.4] },
      { name: '16 digits', model: m16, solve: randomSolution, count: 2, seed: 1505, keep: [0.2, 0.5] },
      { name: 'diagonal', model: diagonalModel, solve: randomSolution, count: 6, seed: 1506,
        keep: [0.05, 0.4] },
      { name: 'windows', model: hyperModel, solve: randomSolution, count: 6, seed: 1507,
        keep: [0.05, 0.4] },
      { name: 'partial cage', model: cageModel, solve: randomSolution, count: 6, seed: 1508,
        keep: [0.05, 0.4] },
      { name: 'samurai', model: samuraiModel, solve: randomSolution, count: 1, seed: 1509,
        keep: [0.1, 0.4] }
    ];
    ['staggered', 'wavy', 'mixed', 'crossed'].forEach(function (name, i) {
      [false, true].forEach(function (flip) {
        var layout = J.parse(J.LAYOUTS[name]);
        POPULATIONS.push({
          name: 'jigsaw ' + name + (flip ? ' (transposed)' : ''),
          model: J.build(flip ? J.transpose(layout) : layout),
          solve: J.solve, count: 3, seed: 1510 + 2 * i + (flip ? 1 : 0), keep: [0.05, 0.4]
        });
      });
    });

    var seen = { positions: 0, records: 0, sizes: [0, 0, 0, 0, 0], shared: 0, solvedCells: 0 };
    POPULATIONS.forEach(function (pop) {
      var title = 'gives the oracle\'s records, order and work on ' + pop.count +
        ' seeded positions of ' + pop.name;
      it(title, function () {
        seededStates(pop.model, pop.solve, pop.seed, pop.count, pop.keep).forEach(function (state, i) {
          var expected = oracle(pop.model, state, 4);
          var got = run(pop.model, state, { records: 1000000 }, 100000000);
          expect([pop.name, i, got.result.complete, got.result.capHit]).toEqual([pop.name, i, true, null]);
          same(pop.name + ' #' + i, got.result.records, expected.records);
          var total = expected.levels.reduce(function (n, level) { return n + level.work; }, 0);
          expect([pop.name, i, got.work.used]).toEqual([pop.name, i, total]);
          var problems = [];
          got.result.records.forEach(function (r) {
            var found = problemsOf(pop.model, state, r);
            if (found.length > 0) problems.push([r.cells, found]);
            seen.sizes[r.cells.length]++;
            var holding = pop.model.units.filter(function (u) {
              return r.cells.every(function (c) { return u.indexOf(c) !== -1; });
            });
            if (holding.length > 1) seen.shared++;
          });
          expect([pop.name, i, problems]).toEqual([pop.name, i, []]);
          seen.positions++;
          seen.records += got.result.records.length;
          if (state.unsolvedCount < pop.model.cellCount) seen.solvedCells++;
        });
      });
    });

    it('exercises every size, solved cells, shared sets and a good number of sets ' +
      'on those positions', function () {
      expect(seen.positions).toBeGreaterThan(70);
      expect(seen.records).toBeGreaterThan(2000);
      for (var k = 1; k <= 4; k++) expect(seen.sizes[k]).toBeGreaterThan(50);
      expect(seen.solvedCells).toBeGreaterThan(50);
      expect(seen.shared).toBeGreaterThan(100);
    });
  });

  describe('als enumerator: the record limit and its prefix', function () {
    var SPEC = { R3C1: '12', R1C5: '23', R2C9: '34', R1C6: '34', R3C9: '45', R3C2: '23' };

    it('keeps the first records of the order and says so: ' +
      'every lowered limit is a prefix of the whole', function () {
      var state = position(m9, SPEC);
      var all = oracle(m9, state, 4).records;
      expect(all).toHaveLength(9);
      for (var limit = 0; limit <= 11; limit++) {
        var out = run(m9, state, { records: limit }).result;
        expect([limit, out.records]).toEqual([limit, all.slice(0, limit)]);
        expect([limit, out.complete]).toEqual([limit, limit >= all.length]);
        expect([limit, out.capHit]).toEqual([limit, limit < all.length ? 'records' : null]);
      }
    });

    it('allows exactly the limit: ' +
      'the limit refuses the NEXT distinct set, not the last one it keeps', function () {
      var state = position(m9, SPEC);
      var exact = run(m9, state, { records: 9 });
      expect(exact.result.complete).toBe(true);
      expect(exact.result.capHit).toBeNull();
      var short = run(m9, state, { records: 8 });
      expect(short.result.complete).toBe(false);
      expect(short.result.capHit).toBe('records');
      expect(short.result.records).toHaveLength(8);
      var total = oracle(m9, state, 4).levels.reduce(function (n, l) { return n + l.work; }, 0);
      expect(exact.work.used).toBe(total);
    });

    it('probes the later sizes for one more set when a size ends exactly at the limit, ' +
      'and stops at the first', function () {
      var state = position(m9, SPEC);
      var model = oracle(m9, state, 4);
      // six records of size 1 come first. A limit of 5 is passed inside size 1: its search was finished
      var run5 = run(m9, state, { records: 5 });
      expect(run5.result.capHit).toBe('records');
      expect(run5.result.records).toEqual(model.records.slice(0, 5));
      expect(run5.work.used).toBe(model.levels[0].work);
      // a limit of 6 is reached exactly at the end of size 1: size 2 is searched only up to its first set
      var run6 = run(m9, state, { records: 6 });
      expect(run6.result.capHit).toBe('records');
      expect(run6.result.records).toEqual(model.records.slice(0, 6));
      expect(model.levels[1].probe).not.toBeNull();
      expect(run6.work.used).toBe(model.levels[0].work + model.levels[1].probe);
      expect(model.levels[1].probe).toBeLessThan(model.levels[1].work);
      // a limit of 0 probes from size 1
      var run0 = run(m9, state, { records: 0 });
      expect(run0.result).toEqual({ records: [], complete: false, capHit: 'records' });
      expect(run0.work.used).toBe(model.levels[0].probe);
      // no further set at all: the probes of sizes 2 to 4 find nothing, run all the way and end complete
      var bivalue = position(m9, { R5C5: '12' });
      var one = run(m9, bivalue, { records: 1 });
      expect(one.result).toEqual({
        records: [rec([40], [1, 2], { 1: [40], 2: [40] })], complete: true, capHit: null
      });
      var oneTotal = oracle(m9, bivalue, 4).levels.reduce(function (n, l) { return n + l.work; }, 0);
      expect(one.work.used).toBe(oneTotal);
    });

    it('reaches the real limit of 4096 on a 16 x 16 board with two candidates per cell, ' +
      'within the work limit', function () {
      var state = twoCandidates(m16, 1);
      var all = oracle(m16, state, 4);
      expect(all.records.length).toBeGreaterThan(DEFAULT.records);
      var cut = run(m16, state);
      expect(cut.result.records).toHaveLength(DEFAULT.records);
      same('the first 4096', cut.result.records, all.records.slice(0, DEFAULT.records));
      expect(cut.result.complete).toBe(false);
      expect(cut.result.capHit).toBe('records');
      // the work limit was not what stopped it: the cut came inside the third size, after its search
      var spent = all.levels[0].work + all.levels[1].work + all.levels[2].work;
      expect(cut.work.used).toBe(spent);
      expect(spent).toBeLessThan(DEFAULT.work);
      expect(cut.work.capped).toBe(false);
      var problems = cut.result.records.filter(function (r) {
        return problemsOf(m16, state, r).length > 0;
      });
      expect(problems).toEqual([]);
    });

    it('floors a fractional limit and rejects an invalid one with solver.invalidOption', function () {
      var state = position(m9, SPEC);
      expect(run(m9, state, { records: 2.9 }).result.records).toHaveLength(2);
      expect(run(m9, state, { cells: 1.5 }).result.records.every(function (r) {
        return r.cells.length === 1;
      })).toBe(true);
      [-1, NaN, Infinity, -Infinity, '5', null, true, {}].forEach(function (value) {
        ['records', 'cells'].forEach(function (key) {
          var limits = {};
          limits[key] = value;
          var err = caught(function () { run(m9, state, limits); });
          expect([key, String(value), err && err.code]).toEqual([key, String(value), 'solver.invalidOption']);
        });
      });
      [null, 5, 'x', true].forEach(function (limits) {
        var err = caught(function () { run(m9, state, limits); });
        expect([String(limits), err && err.code]).toEqual([String(limits), 'solver.invalidOption']);
      });
      expect(run(m9, state, {}).result.records).toHaveLength(9);
      expect(run(m9, state, { other: 1 }).result.records).toHaveLength(9);
    });
  });

  describe('als enumerator: the shared work guard and the work limit', function () {
    function levelWork(model, state) {
      return oracle(model, state, 4).levels.map(function (l) { return l.work; });
    }

    it('makes a fresh guard of its own: 50000 units, nothing spent, never unbounded', function () {
      var a = A.createWork();
      expect(a).toEqual({ limit: 50000, used: 0, checkedAt: 0, capped: false });
      var b = A.createWork();
      expect(b).not.toBe(a);
      a.used = 5;
      expect(b.used).toBe(0);
      expect(A.createWork(7).limit).toBe(7);
      expect(A.createWork(0).limit).toBe(0);
      expect(A.createWork(2.9).limit).toBe(2);
      [-1, NaN, Infinity, -Infinity, '5', null, true, {}].forEach(function (value) {
        var err = caught(function () { A.createWork(value); });
        expect([String(value), err && err.code]).toEqual([String(value), 'solver.invalidOption']);
      });
    });

    it('needs a guard made by createWork: ' +
      'a missing, wrong or hand-made invalid one is solver.invalidOption', function () {
      var state = position(m9, { R1C1: '12' });
      var ctx = SG.techniques.createContext(m9, {});
      var checks = 0;
      var counting = Object.assign({}, ctx, { check: function () { checks++; } });
      var ok = A.createWork();
      var bad = [undefined, null, 5, '5', true, {}, [], { limit: 10 },
        { limit: 10, used: 0, checkedAt: 0 },
        { limit: 10, used: 0, checkedAt: 0, capped: 'no' },
        { limit: -1, used: 0, checkedAt: 0, capped: false },
        { limit: 1.5, used: 0, checkedAt: 0, capped: false },
        { limit: Infinity, used: 0, checkedAt: 0, capped: false },
        { limit: 10, used: -1, checkedAt: 0, capped: false },
        { limit: 10, used: 2.5, checkedAt: 0, capped: false },
        { limit: 10, used: 11, checkedAt: 0, capped: false },
        { limit: 10, used: 5, checkedAt: 6, capped: false },
        { limit: 10, used: 5, checkedAt: -1, capped: false },
        { limit: '10', used: 0, checkedAt: 0, capped: false },
        Object.assign(function () {}, { limit: 10, used: 0, checkedAt: 0, capped: false })];
      bad.forEach(function (work, i) {
        var err = caught(function () { A.enumerate(m9, state, counting, work); });
        expect([i, err && err.code]).toEqual([i, 'solver.invalidOption']);
      });
      expect(checks).toBe(0);
      expect(A.enumerate(m9, state, counting, ok).complete).toBe(true);
      // the entry check and the checks at 256, 512 and 768 of the 810 units of this position
      expect(checks).toBe(4);
    });

    it('counts one unit per tested extension: ' +
      'the work is the oracle\'s, and 810 on a blank 9 x 9 board', function () {
      var blank = SG.model.initState(m9);
      expect(levelWork(m9, blank)).toEqual([243, 216, 189, 162]);
      var out = run(m9, blank);
      expect(out.work.used).toBe(810);
      expect(out.result).toEqual({ records: [], complete: true, capHit: null });
      // a position without an open cell costs nothing and is complete
      var solved = SG.model.initState(m9);
      var solution = SG.testkit.randomSolution(m9, SG.testkit.rng.create(5));
      for (var c = 0; c < m9.cellCount; c++) SG.constraints.assign(m9, solved, c, solution[c]);
      var none = run(m9, solved, undefined, 0);
      expect(none.result).toEqual({ records: [], complete: true, capHit: null });
      expect(none.work.used).toBe(0);
    });

    it('is one counter for the whole call: it continues from what is spent and is never reset', function () {
      var state = position(m9, { R1C1: '12', R1C2: '23' });
      var ctx = SG.techniques.createContext(m9, {});
      var total = oracle(m9, state, 4).levels.reduce(function (n, l) { return n + l.work; }, 0);
      var work = A.createWork(10 * total);
      work.used = 100;
      A.enumerate(m9, state, ctx, work);
      expect(work.used).toBe(100 + total);
      // a second phase of the same call spends from the same counter
      expect(A.spend(work, ctx)).toBe(true);
      expect(work.used).toBe(101 + total);
      A.enumerate(m9, state, ctx, work);
      expect(work.used).toBe(101 + 2 * total);
      expect(work.limit).toBe(10 * total);
      // a guard that is nearly spent leaves the enumeration only what remains
      var left = A.createWork(total + 3);
      A.enumerate(m9, state, ctx, left);
      var second = A.enumerate(m9, state, ctx, left);
      expect(left.used).toBe(total + 3);
      expect(left.capped).toBe(true);
      expect(second.capHit).toBe('work');
      expect(second.complete).toBe(false);
      // a refusal of an earlier phase stays on the guard: the enumeration never clears it
      var earlier = A.createWork(10 * total);
      earlier.capped = true;
      expect(A.enumerate(m9, state, ctx, earlier).complete).toBe(true);
      expect(earlier.capped).toBe(true);
      expect(earlier.limit).toBe(10 * total);
    });

    it('spends one unit per call and refuses the unit that would pass the limit, ' +
      'charging nothing', function () {
      var ctx = SG.techniques.createContext(m9, {});
      var work = A.createWork(3);
      expect([A.spend(work, ctx), A.spend(work, ctx), A.spend(work, ctx)]).toEqual([true, true, true]);
      expect(work.used).toBe(3);
      expect(work.capped).toBe(false);
      expect(A.spend(work, ctx)).toBe(false);
      expect(work).toEqual({ limit: 3, used: 3, checkedAt: 0, capped: true });
      expect(A.spend(work, ctx)).toBe(false);
      expect(work.used).toBe(3);
      // a spent limit asks nobody: no budget check is made for a refused unit
      var checks = 0;
      var counting = Object.assign({}, ctx, { check: function () { checks++; } });
      var full = A.createWork(0);
      expect(A.spend(full, counting)).toBe(false);
      expect(checks).toBe(0);
    });

    it('cuts at the limit with the sizes it finished: ' +
      'every limit gives a prefix of the whole, never a part of a size', function () {
      var state = position(m9, {
        R3C1: '12', R1C5: '23', R2C9: '34', R1C6: '34', R3C9: '45', R3C2: '23'
      });
      var expected = oracle(m9, state, 4);
      var work = expected.levels.map(function (l) { return l.work; });
      var total = work[0] + work[1] + work[2] + work[3];
      expect(total).toBeGreaterThan(500);
      for (var limit = 0; limit <= total + 2; limit++) {
        var out = run(m9, state, undefined, limit);
        var cumulative = 0;
        var finished = 0;
        var sizes = 0;
        work.forEach(function (w, i) {
          cumulative += w;
          if (cumulative <= limit) {
            finished = cumulative;
            sizes = i + 1;
          }
        });
        var kept = expected.records.filter(function (r) { return r.cells.length <= sizes; });
        var label = 'limit ' + limit;
        if (limit >= total) {
          expect([label, out.result.complete, out.result.capHit]).toEqual([label, true, null]);
          expect([label, out.work.used, out.work.capped]).toEqual([label, total, false]);
          same(label + ' records', out.result.records, expected.records);
        } else {
          expect([label, out.result.complete, out.result.capHit]).toEqual([label, false, 'work']);
          expect([label, out.work.used, out.work.capped]).toEqual([label, limit, true]);
          same(label + ' records', out.result.records, kept);
        }
        expect(finished).toBeLessThanOrEqual(limit);
      }
    });

    it('is cut by the default limit of 50000 on a flood, and keeps the sizes it finished', function () {
      // every cell of a 16 x 16 board is {1,2}: a union of two digits never reaches three or more
      var state = SG.model.initState(m16);
      for (var c = 0; c < m16.cellCount; c++) state.candidates[c] = 3;
      var expected = oracle(m16, state, 4);
      expect(expected.levels.map(function (l) { return l.work; })).toEqual([768, 6480, 32592, 114192]);
      expect(expected.records).toHaveLength(256);
      var out = run(m16, state);
      expect(out.result.capHit).toBe('work');
      expect(out.result.complete).toBe(false);
      expect(out.work).toEqual({ limit: 50000, used: 50000, checkedAt: 49920, capped: true });
      // sizes 1 to 3 (39,840 units) were finished and 4 was cut: the 256 bivalue cells are kept
      expect(out.result.records).toEqual(expected.records);
      // an exact limit finishes it, one less does not
      var all = 768 + 6480 + 32592 + 114192;
      expect(run(m16, state, undefined, all).result.complete).toBe(true);
      expect(run(m16, state, undefined, all - 1).result.capHit).toBe('work');
    });
  });

  describe('als enumerator: the parent budget, cancellation and other errors', function () {
    // a context whose check records the work at the time of every check
    function watched(model, work, log) {
      return Object.assign({}, SG.techniques.createContext(model, {}), {
        check: function () { log.push(work.used); }
      });
    }

    function floodState() { return twoCandidates(m16, 2); }

    it('checks the budget at entry and so that at most 256 units pass between two checks', function () {
      var state = floodState();
      [
        [1000, [0, 256, 512, 768]], [256, [0]], [257, [0, 256]], [0, [0]], [512, [0, 256]],
        [513, [0, 256, 512]]
      ].forEach(function (pair) {
        var work = A.createWork(pair[0]);
        var log = [];
        A.enumerate(m16, state, watched(m16, work, log), work);
        expect([pair[0], log]).toEqual([pair[0], pair[1]]);
      });
      var whole = A.createWork();
      var log = [];
      var flood = SG.model.initState(m16);
      for (var c = 0; c < m16.cellCount; c++) flood.candidates[c] = 3;
      A.enumerate(m16, flood, watched(m16, whole, log), whole);
      expect(whole.used).toBe(50000);
      expect(log).toHaveLength(196);
      expect(log[195]).toBe(256 * 195);
    });

    it('keeps the cadence of a guard that arrives partly spent: ' +
      'the entry check is its first check', function () {
      var state = floodState();
      var work = A.createWork(1200);
      work.used = 100;
      var log = [];
      A.enumerate(m16, state, watched(m16, work, log), work);
      expect(log).toEqual([100, 356, 612, 868, 1124]);
      // the later pair scan of the same call goes on from the last check the enumeration made
      var again = A.createWork(5000);
      var seen = [];
      var ctx = watched(m9, again, seen);
      A.enumerate(m9, SG.model.initState(m9), ctx, again);
      expect(again.used).toBe(810);
      expect(again.checkedAt).toBe(768);
      for (var i = 0; i < 300; i++) A.spend(again, ctx);
      expect(seen).toEqual([0, 256, 512, 768, 1024]);
    });

    it('answers a spent budget as nothing found: ' +
      'the prefix of the finished sizes, capHit null, no error', function () {
      var state = floodState();
      var parent = SG.budget.create({ nodes: 3 });
      var work = A.createWork();
      var out = A.enumerate(m16, state, SG.techniques.createContext(m16, { budget: parent }), work);
      expect(out.complete).toBe(false);
      expect(out.capHit).toBeNull();
      // the entry, 256 and 512 are the three checks the budget allows; the fourth is at 768 units
      expect(work.used).toBe(768);
      expect(work.capped).toBe(false);
      expect(caught(function () { parent.check(); }).code).toBe('budget.exceeded');
      var expected = oracle(m16, state, 4).records;
      expect(out.records).toEqual(expected.filter(function (r) { return r.cells.length === 1; }));
      // a budget that is spent at once leaves nothing
      var gone = SG.budget.create({ nodes: 0 });
      var first = A.enumerate(m16, state, SG.techniques.createContext(m16, { budget: gone }),
        A.createWork());
      expect(first).toEqual({ records: [], complete: false, capHit: null });
    });

    it('lets cancellation and every other error through, ' +
      'with nothing returned and nothing published', function () {
      var state = floodState();
      var seen = [];
      var budget = SG.budget.create({});
      budget.cancel();
      var err = caught(function () {
        A.enumerate(m16, state, SG.techniques.createContext(m16, {
          budget: budget, onPatternWork: function (r) { seen.push(r); } }), A.createWork());
      });
      expect(err.code).toBe('budget.cancelled');
      var sentinel = Object.freeze({ sentinel: 'parent cancellation' });
      var kinds = [
        ['a cancellation of the parent',
          new SG.errors.GenerationError('budget.cancelled', { reason: 'cancelled' })],
        ['an error that is not a budget error', new Error('boom')],
        ['a plain sentinel object', sentinel],
        ['an object with a code that is not a budget code', { code: 'other.code' }],
        ['a thrown null', null],
        ['a thrown undefined', undefined],
        ['a thrown zero', 0]
      ];
      kinds.forEach(function (kind) {
        [1, 2, 3].forEach(function (target) {
          var k = 0;
          var work = A.createWork();
          var ctx = Object.assign({}, SG.techniques.createContext(m16, {}), {
            options: { onPatternWork: function (r) { seen.push(r); } },
            check: function () {
              if (++k === target) throw kind[1];
            }
          });
          var thrown = null;
          var threw = false;
          var returned = null;
          try {
            returned = A.enumerate(m16, state, ctx, work);
          } catch (e) {
            threw = true;
            thrown = e;
          }
          expect([kind[0], target, threw]).toEqual([kind[0], target, true]);
          expect([kind[0], target, thrown === kind[1]]).toEqual([kind[0], target, true]);
          expect(returned).toBeNull();
          expect(k).toBe(target);
        });
      });
      expect(seen).toEqual([]);
    });

    it('reads a context without options or with a hostile observer the same way, ' +
      'and never calls it', function () {
      var state = position(m9, { R1C1: '12', R1C2: '23' });
      var plain = JSON.stringify(recordsOf(m9, state));
      var base = SG.techniques.createContext(m9, {});
      var calls = 0;
      var variants = [
        undefined, null, { onPatternWork: 'no' }, { onPatternWork: function () { calls++; } }
      ];
      variants.forEach(function (options) {
        var ctx = Object.assign({}, base, { options: options });
        expect(JSON.stringify(A.enumerate(m9, state, ctx, A.createWork()).records)).toBe(plain);
      });
      expect(calls).toBe(0);
    });
  });

  describe('als enumerator: ownership, immutability and no cache', function () {
    var SPEC = { R3C1: '12', R1C5: '23', R2C9: '34', R1C6: '34', R3C9: '45', R3C2: '23' };

    it('returns arrays of its own: writing to the result changes nothing in the next call', function () {
      var state = position(m9, SPEC);
      var first = A.enumerate(m9, state, SG.techniques.createContext(m9, {}), A.createWork());
      var snapshot = JSON.stringify(first);
      first.records.forEach(function (r) {
        r.cells.push(999);
        r.cells.reverse();
        r.digits.length = 0;
        Object.keys(r.occurrences).forEach(function (d) { r.occurrences[d].push(-1); });
        r.occurrences[99] = [1];
      });
      first.records.length = 0;
      first.complete = false;
      var second = A.enumerate(m9, state, SG.techniques.createContext(m9, {}), A.createWork());
      expect(JSON.stringify(second)).toBe(snapshot);
      // no two records, and no record and its occurrences, share an array
      var arrays = [];
      second.records.forEach(function (r) {
        arrays.push(r.cells, r.digits);
        Object.keys(r.occurrences).forEach(function (d) { arrays.push(r.occurrences[d]); });
      });
      arrays.forEach(function (a, i) {
        arrays.forEach(function (b, j) { if (i !== j) expect(a === b).toBe(false); });
      });
    });

    it('reads the model, the state and the context only, with the debug checks on', function () {
      var before = SG.DEBUG;
      SG.setDebug(true);
      try {
        [m9, m6, cageModel].forEach(function (model, k) {
          seededStates(model, randomSolution, 1600 + k, 4, [0.05, 0.4]).forEach(function (state, i) {
            var snapshot = snapshotOf(model, state);
            var ctx = SG.techniques.createContext(model, {});
            var frozen = Object.freeze(Object.assign({}, ctx));
            var first = A.enumerate(model, state, frozen, A.createWork());
            var second = A.enumerate(model, state, frozen, A.createWork());
            expect([k, i, second]).toEqual([k, i, first]);
            expect([k, i, snapshotOf(model, state)]).toEqual([k, i, snapshot]);
          });
        });
      } finally {
        SG.setDebug(before);
      }
    });

    it('has plain data only: a result survives a trip through JSON unchanged', function () {
      var out = A.enumerate(m9, position(m9, SPEC), SG.techniques.createContext(m9, {}), A.createWork());
      expect(JSON.parse(JSON.stringify(out))).toEqual(out);
      out.records.forEach(function (r) {
        expect(Object.keys(r.occurrences)).toEqual(r.digits.map(String));
      });
    });

    it('keeps no candidate list: ' +
      'the same state object, changed between calls, is read again every time', function () {
      var model = m9;
      var state = seededStates(model, randomSolution, 1700, 1, [0.1, 0.4])[0];
      var rng = SG.testkit.rng.create(77);
      var changes = 0;
      for (var round = 0; round < 60; round++) {
        var cell = rng.int(model.cellCount);
        if (state.value[cell] === 0) {
          var digit = 1 + rng.int(model.digits);
          if (rng.next() < 0.6) {
            state.candidates[cell] &= ~(1 << (digit - 1));
          } else {
            state.candidates[cell] |= 1 << (digit - 1);
          }
          changes++;
        }
        var got = recordsOf(model, state);
        same('round ' + round, got, oracle(model, state, 4).records);
      }
      expect(changes).toBeGreaterThan(30);
      // placing a value changes the sets too: the cell and its digit leave every unit's open cells
      var open = state.value.indexOf(0);
      var before = recordsOf(model, state);
      var placed = state.candidates[open] !== 0
        ? SG.bits.lowestBitIndex(state.candidates[open]) + 1 : 1;
      state.value[open] = placed;
      var after = recordsOf(model, state);
      expect(after).toEqual(oracle(model, state, 4).records);
      expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
      after.forEach(function (r) { expect(r.cells.indexOf(open)).toBe(-1); });
    });

    it('shares nothing with the registered finders: ' +
      'calls of both kinds interleaved give the same answers', function () {
      var items = [];
      H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(1800), 6).forEach(function (item) {
        items.push({ model: m9, state: item.state });
      });
      H.randomStatesWithKnownSolution(m6, SG.testkit.rng.create(1801), 4).forEach(function (item) {
        items.push({ model: m6, state: item.state });
      });
      function answer(item, def) {
        return JSON.stringify(def.find(item.model, item.state, SG.techniques.createContext(item.model, {})));
      }
      function enumerated(item) {
        return JSON.stringify(A.enumerate(item.model, item.state,
          SG.techniques.createContext(item.model, {}), A.createWork()));
      }
      var defs = SG.techniques.list().filter(function (def) {
        return def.id !== 'nishioDeep' && def.id !== 'nishio';
      });
      var fired = 0;
      items.forEach(function (item, n) {
        var plain = {};
        defs.forEach(function (def) {
          if (SG.techniques.appliesTo(def, item.model.variantId)) plain[def.id] = answer(item, def);
        });
        var base = enumerated(item);
        defs.forEach(function (def, k) {
          if (!SG.techniques.appliesTo(def, item.model.variantId)) return;
          expect([n, def.id, enumerated(item)]).toEqual([n, def.id, base]);
          expect([n, def.id, answer(item, def)]).toEqual([n, def.id, plain[def.id]]);
          if (plain[def.id] !== 'null') fired++;
          if (k % 3 === 0) expect([n, def.id, enumerated(item)]).toEqual([n, def.id, base]);
        });
      });
      expect(fired).toBeGreaterThan(20);
    });
  });
})();
