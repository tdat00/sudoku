// Almost-locked sets: the bounded enumerator SG.alsPatterns.enumerate of ../core/js/engine/tech-als.js
// (difficulty v3, R18, MS15a) and ALS-XZ (MS15b), the registered technique alsXz that reads it through
// SG.alsPatterns.findXz. The enumerator is a helper with no observer of its own; ALS-XZ is the only ALS
// technique registered, Sue de Coq (MS16) is not active yet.
//
// Layout of this suite:
//   scope        the API, the limits, ALS-XZ registered and no other ALS technique, no observer record of the
//                helper
//   vectors      what is an ALS and what is not (cardinality, units, fixed cells, partial units), by hand
//   order        the canonical order, deduplication, independence of the order of units and cells
//   agreement    every record and the work, against an independent enumeration, on seeded positions of every
//                unit shape (classic, 4 to 16 digits, diagonal, windows, Jigsaw, partial cages, Samurai)
//   records      the record limit and the prefix it leaves
//   work         the shared guard, the work limit and the prefix that a cut leaves
//   budget       the parent budget at entry and every 256 units, cancellation, other errors
//   ownership    arrays of the caller, nothing read twice, nothing cached, no interference with the finders
//   als-xz       the registered technique: its seam, the proof by hand (the brief's witness and its near
//                misses), the Finding against an independent search, the one guard (work, caps, record quota),
//                the parent budget, the observer record, ownership
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
    it('offers enumerate, createWork, spend, findXz and the limits 4 cells, ' +
      '4096 records and 50000 units', function () {
      expect(typeof A.enumerate).toBe('function');
      expect(typeof A.createWork).toBe('function');
      expect(typeof A.spend).toBe('function');
      expect(typeof A.findXz).toBe('function');
      expect(A.LIMITS).toEqual(DEFAULT);
      expect(Object.isFrozen(A.LIMITS)).toBe(true);
      expect(Object.keys(A).sort()).toEqual(['LIMITS', 'createWork', 'enumerate', 'findXz', 'spend']);
    });

    it('registers ALS-XZ only: alsXz is active, Sue de Coq and every other ALS technique are absent',
      function () {
        expect(SG.techniques.has('alsXz')).toBe(true);
        ['sueDeCoq', 'als', 'alsEnumerate', 'alsXyWing', 'deathBlossom'].forEach(function (id) {
          expect(SG.techniques.has(id)).toBe(false);
        });
        SG.techniques.list().forEach(function (def) {
          if (def.id !== 'alsXz') expect(/^als/i.test(def.id) || /sueDeCoq/.test(def.id)).toBe(false);
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

  // =========================================================================================================
  // ALS-XZ (R18, MS15b): the registered technique alsXz and `SG.alsPatterns.findXz`

  // The brief's witness: A = {R1C1 {1,2}, R1C2 {2,3}}, B = {R1C4 {1,4}, R2C4 {3,4}}, x = 1 (R1C1 sees R1C4 in
  // row 1), z = 3 (R1C2 and R2C4), and R2C2 sees both. The other cells keep all their candidates.
  var XZ_BASE = { R1C1: '12', R1C2: '23', R1C4: '14', R2C4: '34' };
  // The same without the 3 in the other cells that see R1C2 and R2C4, so that R2C2 is the one target.
  var XZ_ONE_TARGET = Object.assign({
    R1C5: '12456789', R1C6: '12456789', R2C1: '12456789', R2C3: '12456789'
  }, XZ_BASE);
  // Two bivalue cells with the same pair: x = 1 or 2 are both restricted common digits of the pair.
  var XZ_PAIR = { R1C1: '12', R1C2: '12' };
  // Near misses found by a search (scratch `search-vectors.js`) that separate the rule from a looser one; each has
  // no witness, the looser rule would make one.
  // overlapping sets only (the three-cell sets of box 1 share R1C1 and R2C2)
  var XZ_OVERLAP = { R1C1: '123', R1C3: '134', R2C1: '124', R2C2: '123' };
  // a restricted common digit missing one cross-peer: the 1 of R1C5 sees R1C2 but not R2C1
  var XZ_CROSS = { R1C2: '124', R1C5: '13', R2C1: '134', R2C2: '234' };
  // a target that sees only some of the cells that hold z: the 3 of R1C3, R1C5, R2C3 and R2C5 have no common peer
  var XZ_TARGET = { R1C3: '234', R1C5: '23', R2C3: '134', R2C5: '13' };

  var seeTables = new WeakMap();

  /** Two different cells that share a unit, read from model.units and never from model.peers. */
  function shareUnit(model, a, b) {
    if (a === b) return false;
    var table = seeTables.get(model);
    if (!table) {
      table = {};
      seeTables.set(model, table);
    }
    var key = a * model.cellCount + b;
    if (table[key] === undefined) {
      table[key] = model.units.some(function (u) { return u.indexOf(a) !== -1 && u.indexOf(b) !== -1; });
    }
    return table[key];
  }

  function peerCount(model, cell) {
    var n = 0;
    for (var c = 0; c < model.cellCount; c++) if (shareUnit(model, cell, c)) n++;
    return n;
  }

  /**
   * Every ALS-XZ witness of the records, in the canonical order (A before B by record index, x ascending, z
   * ascending): { i, j, a, b, x, z, targets }. It is written from the definition: disjoint sets, a restricted
   * common x (every x cell of A sees every x cell of B), another common digit z, and as targets EVERY open cell
   * (not a pivot's peers) that holds z, is outside both sets and sees every z cell of both.
   */
  function xzWitnesses(model, state, records, firstOnly) {
    var out = [];
    for (var i = 0; i < records.length && !(firstOnly && out.length > 0); i++) {
      for (var j = i + 1; j < records.length && !(firstOnly && out.length > 0); j++) {
        var a = records[i];
        var b = records[j];
        if (a.cells.some(function (c) { return b.cells.indexOf(c) !== -1; })) continue;
        var common = a.digits.filter(function (d) { return b.digits.indexOf(d) !== -1; });
        common.forEach(function (x) {
          var restricted = a.occurrences[x].every(function (p) {
            return b.occurrences[x].every(function (q) { return shareUnit(model, p, q); });
          });
          if (!restricted) return;
          common.forEach(function (z) {
            if (z === x) return;
            var zCells = a.occurrences[z].concat(b.occurrences[z]);
            var targets = [];
            for (var c = 0; c < model.cellCount; c++) {
              if (state.value[c] !== 0 || (state.candidates[c] & (1 << (z - 1))) === 0) continue;
              if (a.cells.indexOf(c) !== -1 || b.cells.indexOf(c) !== -1) continue;
              if (zCells.every(function (q) { return shareUnit(model, c, q); })) targets.push(c);
            }
            if (targets.length > 0) out.push({ i: i, j: j, a: a, b: b, x: x, z: z, targets: targets });
          });
        });
      }
    }
    return out;
  }

  function xzFindingOf(model, w) {
    var cells = w.a.cells.concat(w.b.cells).sort(numeric);
    return {
      technique: 'alsXz',
      cells: cells,
      placements: [],
      eliminations: w.targets.map(function (c) { return [c, w.z]; }),
      i18nKey: 'technique.alsXz.step',
      i18nArgs: {
        digitX: w.x,
        digitY: w.z,
        cells: cells.map(function (c) { return SG.model.cellLabel(model, c); })
      }
    };
  }

  /**
   * The units the stated rule charges after the enumeration, up to the witness w (null: every pair): one per
   * pair of records tested, one per opened (x, z) scan and one per cell of the pivot's peer list, the pivot being
   * the first cell of A that holds z. NOT independent: it re-implements the count of the rule from its words,
   * so it pins the stated count rather than discovers it.
   */
  function xzPairUnits(model, records, w) {
    var units = 0;
    for (var i = 0; i < records.length; i++) {
      for (var j = i + 1; j < records.length; j++) {
        units++;
        var a = records[i];
        var b = records[j];
        if (a.cells.some(function (c) { return b.cells.indexOf(c) !== -1; })) continue;
        var common = a.digits.filter(function (d) { return b.digits.indexOf(d) !== -1; });
        for (var p = 0; p < common.length; p++) {
          var x = common[p];
          var restricted = a.occurrences[x].every(function (s) {
            return b.occurrences[x].every(function (q) { return shareUnit(model, s, q); });
          });
          if (!restricted) continue;
          for (var k = 0; k < common.length; k++) {
            if (common[k] === x) continue;
            units += 1 + peerCount(model, a.occurrences[common[k]][0]);
            if (w !== null && w.i === i && w.j === j && w.x === x && w.z === common[k]) return units;
          }
        }
      }
    }
    return units;
  }

  /** A call of findXz with a context that collects the observer records: { finding, seen }. */
  function xzRun(model, state, opts, ctxOptions) {
    var seen = [];
    var options = Object.assign({ onPatternWork: function (r) { seen.push(r); } }, ctxOptions || {});
    var finding = A.findXz(model, state, SG.techniques.createContext(model, options), opts);
    return { finding: finding, seen: seen };
  }

  /** The enumeration the finder starts with, for the same limits: its records and its work. */
  function xzEnumeration(model, state, limits) {
    var out = run(model, state, limits, undefined);
    return { records: out.result.records, work: out.work.used, capHit: out.result.capHit };
  }

  describe('als-xz: the registered technique and the seam', function () {
    it('is registered as alsXz: chain group, order 194, base cost 106, unscoped, no uniqueness, ' +
      'between forcingChain (190) and forcingChainLong (198)', function () {
      var def = SG.techniques.get('alsXz');
      expect(SG.techniques.list().filter(function (t) { return t.id === 'alsXz'; })).toHaveLength(1);
      expect(def.group).toBe('chain');
      expect(def.order).toBe(194);
      expect(def.baseCost).toBe(106);
      expect(def.i18nKey).toBe('technique.alsXz');
      expect(def.variantScope).toBeNull();
      expect(def.assumesUniqueness).toBe(false);
      expect(typeof def.find).toBe('function');
      var long = SG.techniques.get('forcingChainLong');
      var short = SG.techniques.get('forcingChain');
      expect(short.order).toBe(190);
      expect(long.order).toBe(198);
      expect(short.order).toBeLessThan(def.order);
      expect(def.order).toBeLessThan(long.order);
      expect(short.baseCost).toBeLessThan(def.baseCost);
      expect(def.baseCost).toBeLessThan(long.baseCost);
      var ids = SG.techniques.list().map(function (t) { return t.id; });
      expect(ids.indexOf('alsXz')).toBe(ids.indexOf('forcingChain') + 1);
      expect(ids.indexOf('alsXz')).toBe(ids.indexOf('forcingChainLong') - 1);
      // no other technique has its order
      expect(SG.techniques.list().filter(function (t) { return t.order === 194; })).toHaveLength(1);
    });

    it('is registered once even when the file is loaded again: the registry keeps its first definition',
      function () {
        var source = SG.test.node && SG.test.node.fs.readFileSync(
          SG.test.node.path.join(SG.test.node.root, '../core/js/engine/tech-als.js'), 'utf8');
        if (!source) SG.test.skip('needs the Node runner to reload the source');
        var def = SG.techniques.get('alsXz');
        var count = SG.techniques.list().length;
        SG.test.node.vm.runInThisContext(source, { filename: '../core/js/engine/tech-als.js' });
        expect(SG.techniques.get('alsXz')).toBe(def);
        expect(SG.techniques.list().length).toBe(count);
        expect(SG.alsPatterns.LIMITS).toEqual(DEFAULT);
      });

    it('runs with the production limits: the registered finder takes no options, whatever it is given',
      function () {
        var def = SG.techniques.get('alsXz');
        var state = position(m9, XZ_BASE);
        var seen = [];
        var ctx = SG.techniques.createContext(m9, { onPatternWork: function (r) { seen.push(r); } });
        var plain = def.find(m9, state, ctx);
        var extra = def.find(m9, state, ctx, { workLimit: 5, limits: { cells: 1, records: 1 } });
        expect(extra).toEqual(plain);
        expect(seen).toHaveLength(2);
        expect(seen[0]).toEqual(seen[1]);
        expect(seen[0].limit).toBe(50000);
        expect(plain).toEqual(A.findXz(m9, state, SG.techniques.createContext(m9, {})));
      });

    it('takes opts = { workLimit, limits } as the seam of the tests and refuses anything else, ' +
      'before any work', function () {
        var state = position(m9, XZ_PAIR);
        var bad = [null, 5, 'x', true, { workLimit: -1 }, { workLimit: NaN }, { workLimit: Infinity },
          { workLimit: '5' }, { workLimit: null }, { limits: null }, { limits: 5 }, { limits: { cells: -1 } },
          { limits: { records: NaN } }, { limits: { cells: Infinity } }];
        bad.forEach(function (opts) {
          var seen = [];
          var checks = 0;
          var ctx = Object.assign({}, SG.techniques.createContext(m9, {}), {
            options: { onPatternWork: function (r) { seen.push(r); } },
            check: function () { checks++; }
          });
          var err = caught(function () { A.findXz(m9, state, ctx, opts); });
          expect([JSON.stringify(opts), err && err.code]).toEqual([JSON.stringify(opts), 'solver.invalidOption']);
          expect([JSON.stringify(opts), seen.length, checks]).toEqual([JSON.stringify(opts), 0, 0]);
        });
        // a whole number of at least 0 is accepted and floored
        var out = xzRun(m9, state, { workLimit: 2.9, limits: { cells: 1.7, records: 100 } });
        expect(out.seen).toHaveLength(1);
        expect(out.seen[0].limit).toBe(2);
        expect(xzRun(m9, state, {}).finding).not.toBeNull();
        expect(xzRun(m9, state, { workLimit: undefined, limits: undefined }).finding).not.toBeNull();
      });

    it('offers no other ALS technique: Sue de Coq and the rest stay absent', function () {
      ['sueDeCoq', 'als', 'alsEnumerate', 'alsXyWing', 'deathBlossom', 'alsXy'].forEach(function (id) {
        expect(SG.techniques.has(id)).toBe(false);
      });
      var ids = SG.techniques.list().filter(function (def) {
        return /^als/i.test(def.id) || /sueDeCoq/.test(def.id);
      }).map(function (def) { return def.id; });
      expect(ids).toEqual(['alsXz']);
    });
  });

  describe('als-xz: the proof by hand', function () {
    function everyWitness(model, state, maxCells) {
      var records = oracle(model, state, maxCells).records;
      return { records: records, all: xzWitnesses(model, state, records, false) };
    }

    /** A complete negative: the independent search finds nothing and neither does the finder. */
    function expectNone(model, state, label) {
      var expected = everyWitness(model, state, 4);
      expect([label, expected.all.length]).toEqual([label, 0]);
      var out = xzRun(model, state);
      expect([label, out.finding]).toEqual([label, null]);
      var enumeration = xzEnumeration(model, state);
      expect(out.seen).toEqual([{
        id: 'alsXz', work: enumeration.work + xzPairUnits(model, enumeration.records, null), limit: 50000,
        capHit: null, retained: expected.records.length
      }]);
      return expected;
    }

    it('finds the brief\'s witness: A = {R1C1, R1C2}, B = {R1C4, R2C4}, x = 1 on row 1, z = 3, and ' +
      'R2C2 loses the 3', function () {
        var state = position(m9, XZ_ONE_TARGET);
        var limits = { cells: 2 };
        var expected = everyWitness(m9, state, 2);
        // with sets of at most two cells it is the only witness of the position
        expect(expected.all).toHaveLength(1);
        var w = expected.all[0];
        expect([w.a.cells, w.b.cells, w.x, w.z, w.targets]).toEqual([[0, 1], [3, 12], 1, 3, [10]]);
        var out = xzRun(m9, state, { limits: limits });
        expect(out.finding).toEqual({
          technique: 'alsXz',
          cells: [0, 1, 3, 12],
          placements: [],
          eliminations: [[10, 3]],
          i18nKey: 'technique.alsXz.step',
          i18nArgs: { digitX: 1, digitY: 3, cells: ['R1C1', 'R1C2', 'R1C4', 'R2C4'] }
        });
        expect(Object.keys(out.finding)).toEqual(['technique', 'cells', 'placements', 'eliminations', 'i18nKey',
          'i18nArgs']);
        expect(Object.keys(out.finding.i18nArgs)).toEqual(['digitX', 'digitY', 'cells']);
        expect(out.finding).toEqual(xzFindingOf(m9, w));
        // the work: the enumeration, one pair, one (x, z) scan and the twenty peers of the pivot R1C2
        var enumeration = xzEnumeration(m9, state, limits);
        expect(enumeration.records).toHaveLength(7);
        expect(out.seen).toEqual([{
          id: 'alsXz', work: enumeration.work + xzPairUnits(m9, enumeration.records, w), limit: 50000,
          capHit: null, retained: 7
        }]);
      });

    it('returns the first witness of the canonical order with the default limits, and the brief\'s witness is ' +
      'one of the position\'s witnesses', function () {
        var state = position(m9, XZ_ONE_TARGET);
        var expected = everyWitness(m9, state, 4);
        expect(expected.records).toHaveLength(8);
        var brief = expected.all.filter(function (w) {
          return w.a.cells.join() === '0,1' && w.b.cells.join() === '3,12' && w.x === 1 && w.z === 3;
        });
        expect(brief).toHaveLength(1);
        expect(brief[0].targets).toEqual([10]);
        expect(expected.all.length).toBeGreaterThan(1);
        // the three-cell set of row 1 comes after the one-cell sets: R2C4 (record 3) is A, with x = 4
        var first = expected.all[0];
        expect([first.i, first.j, first.a.cells, first.b.cells, first.x, first.z]).toEqual([3, 7, [12], [0, 1, 3], 4,
          3]);
        var out = xzRun(m9, state);
        expect(out.finding).toEqual(xzFindingOf(m9, first));
        expect(out.finding.i18nArgs.digitX).toBe(4);
        expect(out.finding.cells).toEqual([0, 1, 3, 12]);
      });

    it('removes only the cells that see EVERY cell holding z in both sets, and only the digit z', function () {
      var state = position(m9, XZ_BASE);
      var out = xzRun(m9, state, { limits: { cells: 2 } });
      // R1C5, R1C6 (row 1 and box 2), R2C1, R2C2, R2C3 (row 2 and box 1) see both R1C2 and R2C4
      expect(out.finding.eliminations).toEqual([[4, 3], [5, 3], [9, 3], [10, 3], [11, 3]]);
      // R1C3 sees R1C2 only, R2C5 sees R2C4 only: they keep the 3, and nothing loses the 1
      var removed = out.finding.eliminations.map(function (e) { return e[0]; });
      expect(removed).not.toContain(2);
      expect(removed).not.toContain(13);
      out.finding.eliminations.forEach(function (e) { expect(e[1]).toBe(3); });
    });

    it('never removes a candidate from a solved cell, even in a position that was not propagated', function () {
      // R2C2 holds the 3 and has no other candidate: it would be the one target, but a solved cell is none
      var state = position(m9, XZ_ONE_TARGET);
      state.value[10] = 3;
      state.candidates[10] = 1 << 2;
      var limits = { cells: 2 };
      expect(everyWitness(m9, state, 2).all).toHaveLength(0);
      expect(xzRun(m9, state, { limits: limits }).finding).toBeNull();
      expect(xzRun(m9, state).finding).toBeNull();
    });

    it('finds nothing when the only sets overlap, when a restricted common digit lacks a cross-peer, ' +
      'when no cell sees all the cells holding z, or when a set has one digit too many', function () {
        expectNone(m9, position(m9, XZ_OVERLAP), 'overlapping sets');
        expectNone(m9, position(m9, XZ_CROSS), 'a missing cross-peer');
        expectNone(m9, position(m9, XZ_TARGET), 'a target that sees some z only');
        // R1C2 {2,3,5}: {R1C1, R1C2} has four digits, so it is not an ALS and the brief's witness is gone
        var card = Object.assign({}, XZ_BASE, { R1C2: '235' });
        expectNone(m9, position(m9, card), 'one digit too many');
        expectNone(m9, position(m9, Object.assign({}, XZ_ONE_TARGET, { R1C2: '235' })),
          'one digit too many, one target');
      });

    it('takes another restricted common digit as z: two bivalue cells {1,2} give x = 1 and z = 2 first', function () {
      var state = position(m9, XZ_PAIR);
      var expected = everyWitness(m9, state, 4);
      expect(expected.records.map(function (r) { return r.cells.join(); })).toEqual(['0', '1']);
      expect(expected.all.map(function (w) { return [w.x, w.z]; })).toEqual([[1, 2], [2, 1]]);
      var out = xzRun(m9, state);
      // R1C3 to R1C9 (the row) and R2C1 to R3C3 (the box): thirteen cells, all losing the 2
      expect(out.finding.eliminations).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20].map(function (c) {
        return [c, 2];
      }));
      expect(out.finding.i18nArgs).toEqual({ digitX: 1, digitY: 2, cells: ['R1C1', 'R1C2'] });
      expect(out.finding.cells).toEqual([0, 1]);
      // the unit of the pair phase is stated: one pair, one (x, z) scan and the twenty peers of the pivot = 22
      var enumeration = xzEnumeration(m9, state);
      expect(out.seen[0].work - enumeration.work).toBe(1 + 1 + 20);
      expect(out.seen[0].work).toBe(enumeration.work + 22);
    });

    it('reads a partial unit as an all-different unit: a set of two cells that only a cage joins', function () {
      var spec = { R1C1: '12', R5C5: '23', R1C5: '14', R2C5: '34' };
      var caged = position(cageModel, spec);
      var plain = position(m9, spec);
      var withCage = everyWitness(cageModel, caged, 2);
      var withoutCage = everyWitness(m9, plain, 2);
      expect(withCage.records.map(function (r) { return r.cells.join(); })).toContain('0,40');
      expect(withoutCage.records.map(function (r) { return r.cells.join(); })).not.toContain('0,40');
      // x = 1 (R1C1 sees R1C5 in row 1), z = 3 (R5C5 and R2C5 in column 5)
      var cage = withCage.all.filter(function (w) {
        return w.a.cells.join() === '0,40' && w.b.cells.join() === '4,13' && w.x === 1 && w.z === 3;
      });
      expect(cage).toHaveLength(1);
      expect(cage[0].targets).toEqual([22, 31, 49, 58, 67, 76]);
      withoutCage.all.forEach(function (w) {
        expect(w.a.cells.join() === '0,40' || w.b.cells.join() === '0,40').toBe(false);
      });
      var limits = { cells: 2 };
      expect(xzRun(cageModel, caged, { limits: limits }).finding).toEqual(xzFindingOf(cageModel, withCage.all[0]));
      expect(xzRun(m9, plain, { limits: limits }).finding).toEqual(xzFindingOf(m9, withoutCage.all[0]));
    });

    it('visits the peers of the pivot, the first cell of A that holds z: here R1C1, which the cage gives ' +
      'two more peers than R2C2 or R1C4', function () {
        var spec = { R1C1: '124', R1C2: '34', R1C4: '124', R1C5: '124', R2C2: '12' };
        var state = position(cageModel, spec);
        var limits = { cells: 3 };
        var expected = everyWitness(cageModel, state, 3);
        var first = expected.all[0];
        expect([first.a.cells, first.b.cells, first.x, first.z]).toEqual([[0, 10], [3, 4], 4, 1]);
        expect(first.a.occurrences[1]).toEqual([0, 10]);
        expect(first.b.occurrences[1]).toEqual([3, 4]);
        expect([peerCount(cageModel, 0), peerCount(cageModel, 10), peerCount(cageModel, 3)]).toEqual([22, 20, 20]);
        var out = xzRun(cageModel, state, { limits: limits });
        expect(out.finding).toEqual(xzFindingOf(cageModel, first));
        var enumeration = xzEnumeration(cageModel, state, limits);
        var pairs = xzPairUnits(cageModel, enumeration.records, first);
        expect(out.seen[0].work).toBe(enumeration.work + pairs);
        // one unit less ends inside the last peer scan: the 22nd peer of R1C1 is refused and the scan is discarded
        var again = xzRun(cageModel, state, { limits: limits, workLimit: enumeration.work + pairs - 1 });
        expect(again.finding).toBeNull();
        expect(again.seen[0].capHit).toBe('work');
      });
  });

  describe('als-xz: agreement with the independent search, and exactness', function () {
    var F = SG.fixtures.techniques;

    /** The seeded positions of `seededStates`, with the solution that every candidate set contains. */
    function seededWithSolution(model, solve, seed, count, keepRange) {
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
        out.push({ state: state, solution: solution });
      }
      return out;
    }

    /** The real classic 9 x 9 puzzles of the technique fixtures, each at the position where alsXz is reached. */
    function realPositions() {
      var ids = SG.techniques.list().filter(function (t) { return t.variantScope === null && t.order < 194; })
        .map(function (t) { return t.id; });
      var seen = {};
      var out = [];
      function add(fixture) {
        if (!fixture || typeof fixture.puzzle !== 'string' || fixture.puzzle.length !== 81 || seen[fixture.puzzle]) {
          return;
        }
        seen[fixture.puzzle] = true;
        var givens = H.parsePuzzle(m9, fixture.puzzle);
        if (SG.dfs.countSolutions(m9, givens, 2) !== 1) return;
        var state = H.stateAfter(m9, fixture.puzzle, ids);
        if (state.unsolvedCount === 0) return;
        out.push({ state: state, solution: SG.dfs.solve(m9, givens) });
      }
      Object.keys(F.byId).forEach(function (id) {
        F.byId[id].positive.forEach(add);
        F.byId[id].negative.forEach(add);
      });
      Object.keys(F.supplements).forEach(function (id) { F.supplements[id].forEach(add); });
      return out;
    }

    /** Forcing the eliminated digit leaves no completion at all: the exact search finds none. */
    function expectImpossible(model, state, cell, digit, label) {
      var forced = SG.model.cloneState(state);
      if (!SG.constraints.assign(model, forced, cell, digit) || !SG.constraints.propagate(model, forced)) return;
      var result = SG.dfs.searchFrom(model, forced, { maxBacktracks: 300000 });
      expect([label, result.aborted, result.found]).toEqual([label, false, 0]);
    }

    var POPULATIONS = [
      { name: 'the real classic 9 x 9 fixture positions', model: m9, exact: true, positions: realPositions },
      { name: 'classic9 seeded', model: m9, exact: true, seed: 1901, count: 6, keep: [0.3, 0.6] },
      { name: 'classic9 sweep states', model: m9, exact: true, sweep: 20 },
      { name: 'classic6', model: m6, exact: true, seed: 1902, count: 6, keep: [0.3, 0.6] },
      { name: 'classic4', model: m4, exact: true, seed: 1903, count: 6, keep: [0.3, 0.6] },
      { name: '12 digits', model: m12, exact: true, seed: 1904, count: 3, keep: [0.3, 0.6] },
      { name: '16 digits', model: m16, exact: false, seed: 7, count: 4, keep: [0.3, 0.6] },
      { name: 'diagonal', model: diagonalModel, exact: true, seed: 1906, count: 4, keep: [0.3, 0.6] },
      { name: 'windows', model: hyperModel, exact: true, seed: 1907, count: 4, keep: [0.3, 0.6] },
      { name: 'partial cage', model: cageModel, exact: true, seed: 1908, count: 4, keep: [0.3, 0.6] },
      { name: 'samurai', model: samuraiModel, exact: false, seed: 7, count: 2, keep: [0.7, 0.95] }
    ];
    ['staggered', 'wavy', 'mixed', 'crossed'].forEach(function (name, i) {
      [false, true].forEach(function (flip) {
        var layout = J.parse(J.LAYOUTS[name]);
        POPULATIONS.push({
          name: 'jigsaw ' + name + (flip ? ' (transposed)' : ''),
          model: J.build(flip ? J.transpose(layout) : layout), solve: J.solve, exact: true,
          seed: 1910 + 2 * i + (flip ? 1 : 0), count: 2, keep: [0.3, 0.6]
        });
      });
    });

    var tally = { positions: 0, fired: 0, byPopulation: {}, eliminations: 0, notTheMost: 0, anotherRestricted: 0,
      oneCellSets: 0, bigSets: 0, exact: 0, multipleTargets: 0 };

    function checkPosition(pop, item, i) {
      var model = pop.model;
      var state = item.state;
      var label = pop.name + ' #' + i;
      var records = oracle(model, state, 4).records;
      if (pop.maxRecords && records.length > pop.maxRecords) return false;
      expect(records.length).toBeLessThan(DEFAULT.records);
      var witnesses = xzWitnesses(model, state, records, false);
      var out = xzRun(model, state);
      var enumeration = xzEnumeration(model, state);
      var first = witnesses.length > 0 ? witnesses[0] : null;
      var total = enumeration.work + xzPairUnits(model, records, first);
      // the default guard is not reached on these positions, so the call is complete
      expect([label, total < DEFAULT.work]).toEqual([label, true]);
      if (first === null) expect([label, out.finding]).toEqual([label, null]);
      else same(label, out.finding, xzFindingOf(model, first));
      expect([label, out.seen]).toEqual([label, [{
        id: 'alsXz', work: total, limit: DEFAULT.work, capHit: null, retained: records.length
      }]]);
      tally.positions++;
      tally.byPopulation[pop.name] = (tally.byPopulation[pop.name] || 0) + (first === null ? 0 : 1);
      if (first === null) return true;
      tally.fired++;
      tally.eliminations += out.finding.eliminations.length;
      if (first.targets.length > 1) tally.multipleTargets++;
      if (witnesses.some(function (w) { return w.targets.length > first.targets.length; })) tally.notTheMost++;
      if (witnesses.some(function (w) { return w.i === first.i && w.j === first.j && w.x === first.z; })) {
        tally.anotherRestricted++;
      }
      if (first.a.cells.length === 1 || first.b.cells.length === 1) tally.oneCellSets++;
      if (first.a.cells.length + first.b.cells.length >= 6) tally.bigSets++;
      // sound against the position's own solution, and every removal checked by the exact search
      out.finding.eliminations.forEach(function (e, k) {
        expect([label, e, item.solution[e[0]] === e[1]]).toEqual([label, e, false]);
        if (pop.exact && k < 2) {
          expectImpossible(model, state, e[0], e[1], label);
          tally.exact++;
        }
      });
      return true;
    }

    POPULATIONS.forEach(function (pop) {
      it('gives the independent search\'s first witness, its work and its record on ' + pop.name, function () {
        var items;
        if (pop.positions) {
          items = pop.positions();
        } else if (pop.sweep) {
          items = H.randomStatesWithKnownSolution(pop.model, SG.testkit.rng.create(20260101), pop.sweep);
        } else {
          items = seededWithSolution(pop.model, pop.solve || randomSolution, pop.seed, pop.count, pop.keep);
        }
        var used = 0;
        items.forEach(function (item, i) { if (checkPosition(pop, item, i)) used++; });
        expect([pop.name, used > 0]).toEqual([pop.name, true]);
      });
    });

    it('exercises the rule on those positions: firings in every kind of board, several targets, a first ' +
      'witness that is not the largest, another restricted common digit as z, small and large sets, ' +
      'and the exact search', function () {
        expect(tally.positions).toBeGreaterThan(70);
        expect(tally.fired).toBeGreaterThan(50);
        POPULATIONS.forEach(function (pop) {
          expect([pop.name, tally.byPopulation[pop.name] > 0]).toEqual([pop.name, true]);
        });
        expect(tally.eliminations).toBeGreaterThan(100);
        expect(tally.multipleTargets).toBeGreaterThan(10);
        expect(tally.notTheMost).toBeGreaterThan(3);
        expect(tally.anotherRestricted).toBeGreaterThan(3);
        expect(tally.oneCellSets).toBeGreaterThan(10);
        expect(tally.bigSets).toBeGreaterThan(2);
        expect(tally.exact).toBeGreaterThan(50);
      });
  });

  describe('als-xz: the one guard, the work limit and the record quota', function () {
    var PAIR = position(m9, XZ_PAIR);

    it('charges the enumeration and the pair phase to one guard: a limit L gives the Finding from the whole ' +
      'count on, and a cut call has spent exactly L, with no Finding and capHit work', function () {
        var E = xzEnumeration(m9, PAIR).work;
        var T = E + 22;
        for (var limit = 0; limit <= T + 2; limit++) {
          var out = xzRun(m9, PAIR, { workLimit: limit });
          var label = 'limit ' + limit;
          expect(out.seen).toHaveLength(1);
          var record = out.seen[0];
          expect([label, record.id, record.limit]).toEqual([label, 'alsXz', limit]);
          if (limit >= T) {
            expect([label, record.capHit, record.work, out.finding === null]).toEqual([label, null, T, false]);
          } else {
            // a refused unit leaves used === limit; a partial scan of the pivot's peers is discarded
            expect([label, record.capHit, record.work, out.finding]).toEqual([label, 'work', limit, null]);
          }
          if (limit >= E) expect([label, record.retained]).toEqual([label, 2]);
        }
        expect(T).toBeGreaterThan(E);
      });

    it('does not go on to the pair phase once the enumeration was cut, although the kept sizes hold a ' +
      'witness', function () {
        var E = xzEnumeration(m9, PAIR).work;
        var cut = xzRun(m9, PAIR, { workLimit: E - 1 });
        expect(cut.finding).toBeNull();
        expect(cut.seen[0]).toEqual({ id: 'alsXz', work: E - 1, limit: E - 1, capHit: 'work', retained: 2 });
        var kept = run(m9, PAIR, undefined, E - 1).result;
        expect(kept.capHit).toBe('work');
        expect(xzWitnesses(m9, PAIR, kept.records, false).length).toBeGreaterThan(0);
        // the same limit plus the 22 units of the pair phase finds it
        expect(xzRun(m9, PAIR, { workLimit: E + 22 }).finding).not.toBeNull();
      });

    it('has no work limit of its own for the pair phase: the guard is the one the enumeration used, never ' +
      'refilled', function () {
        var state = position(m9, XZ_OVERLAP);
        var E = xzEnumeration(m9, state).work;
        var pairs = xzPairUnits(m9, xzEnumeration(m9, state).records, null);
        expect(pairs).toBeGreaterThan(0);
        var whole = xzRun(m9, state, { workLimit: E + pairs });
        // one two-cell set {R1C1, R2C2} and the four three-cell sets of box 1: five records, all in box 1
        expect(whole.seen[0]).toEqual({ id: 'alsXz', work: E + pairs, limit: E + pairs, capHit: null, retained: 5 });
        var short = xzRun(m9, state, { workLimit: E + pairs - 1 });
        expect(short.finding).toBeNull();
        expect(short.seen[0].capHit).toBe('work');
        expect(short.seen[0].work).toBe(E + pairs - 1);
        // a complete scan with no witness is a complete negative: capHit null, never a work cap
        expect(xzRun(m9, state, { workLimit: E + pairs + 1000 }).seen[0].capHit).toBeNull();
      });

    it('keeps a prefix of the records when the quota cuts and still searches its pairs: the Finding of a ' +
      'prefix is a proof, the cap stays visible', function () {
        var state = position(m9, XZ_ONE_TARGET);
        // the eight records: four of one cell, three of two cells and the three-cell set of row 1
        var all = oracle(m9, state, 4).records;
        expect(all).toHaveLength(8);
        // seven records hold the brief's pair ([R1C1, R1C2], [R1C4, R2C4]) and not the three-cell set
        var seven = xzRun(m9, state, { limits: { records: 7 } });
        expect(seven.finding).toEqual(xzFindingOf(m9, xzWitnesses(m9, state, all.slice(0, 7), true)[0]));
        expect(seven.finding.i18nArgs).toEqual({ digitX: 1, digitY: 3, cells: ['R1C1', 'R1C2', 'R1C4', 'R2C4'] });
        expect(seven.seen[0].capHit).toBe('records');
        expect(seven.seen[0].retained).toBe(7);
        var enumeration = xzEnumeration(m9, state, { records: 7 });
        expect(enumeration.capHit).toBe('records');
        expect(seven.seen[0].work).toBe(enumeration.work + xzPairUnits(m9, all.slice(0, 7),
          xzWitnesses(m9, state, all.slice(0, 7), true)[0]));
        // six records hold no witness: no Finding, and no claim of absence: capHit stays records
        var six = xzRun(m9, state, { limits: { records: 6 } });
        expect(xzWitnesses(m9, state, all.slice(0, 6), false)).toHaveLength(0);
        expect(six.finding).toBeNull();
        expect(six.seen[0].capHit).toBe('records');
        expect(six.seen[0].retained).toBe(6);
        // exactly the quota is allowed: with sets of at most two cells there are seven records and no cap
        var exact = xzRun(m9, state, { limits: { cells: 2, records: 7 } });
        expect(exact.seen[0].capHit).toBeNull();
        expect(exact.finding).not.toBeNull();
        expect(xzRun(m9, state, { limits: { cells: 2, records: 6 } }).seen[0].capHit).toBe('records');
      });

    it('reports the work cap before the record quota when both happened', function () {
      var state = position(m9, XZ_ONE_TARGET);
      var all = oracle(m9, state, 4).records;
      var witness = xzWitnesses(m9, state, all.slice(0, 7), true)[0];
      var enumeration = xzEnumeration(m9, state, { records: 7 });
      var pairs = xzPairUnits(m9, all.slice(0, 7), witness);
      var cut = xzRun(m9, state, { limits: { records: 7 }, workLimit: enumeration.work + pairs - 1 });
      expect(cut.finding).toBeNull();
      expect(cut.seen[0]).toEqual({ id: 'alsXz', work: enumeration.work + pairs - 1,
        limit: enumeration.work + pairs - 1, capHit: 'work', retained: 7 });
      // a cut inside the enumeration after the quota was reached (the probe of the next size)
      var probe = xzRun(m9, state, { limits: { records: 7 }, workLimit: enumeration.work - 1 });
      expect(probe.finding).toBeNull();
      expect(probe.seen[0].capHit).toBe('work');
    });

    it('lets the default 50,000 cut a call and reports it, while a lifted limit finds the proof', function () {
      var state = position(m16, {});
      for (var c = 0; c < m16.cellCount; c++) state.candidates[c] = 3;
      // every cell {1,2} of a 16 x 16 board: the enumeration alone costs 154,032 units
      var out = xzRun(m16, state);
      expect(out.finding).toBeNull();
      expect(out.seen).toEqual([{ id: 'alsXz', work: 50000, limit: 50000, capHit: 'work', retained: 256 }]);
    });
  });

  describe('als-xz: the parent budget, errors and the observer record', function () {
    var PAIR = position(m9, XZ_PAIR);

    function exceeded() { return new SG.errors.GenerationError('budget.exceeded', { reason: 'nodes' }); }

    /** A context whose check counts its calls and calls hook(n), n from 1, which may throw. */
    function counting(model, observer, hook) {
      var counter = { calls: 0 };
      var ctx = Object.assign({}, SG.techniques.createContext(model, { onPatternWork: observer }), {
        check: function () {
          counter.calls++;
          if (hook) hook(counter.calls);
        }
      });
      return { ctx: ctx, counter: counter };
    }

    // the real classic 9 x 9 position where the registry reaches alsXz and no pair removes anything: a
    // complete negative of some 14,000 units, so that the pair phase has many checks of its own
    var DUG_24 = '..7..1..6.8....1..5..6.78.3..65..7.......8..2.9..6....459........2...5......1..9.';

    function negative() {
      var ids = SG.techniques.list().filter(function (t) { return t.variantScope === null && t.order < 194; })
        .map(function (t) { return t.id; });
      return H.stateAfter(m9, DUG_24, ids);
    }

    function layout(model, state) {
      var enumeration = xzEnumeration(model, state);
      var witness = xzWitnesses(model, state, enumeration.records, true);
      var T = enumeration.work + xzPairUnits(model, enumeration.records, witness.length > 0 ? witness[0] : null);
      var cE = Math.floor((enumeration.work - 1) / 256);
      var cT = Math.floor((T - 1) / 256);
      return { E: enumeration.work, T: T, cE: cE, cT: cT, N: 3 + cT, retained: enumeration.records.length,
        found: witness.length > 0 };
    }

    /** What the guard has spent when the k-th check is made (see the rule: entry, cadence, recheck, cadence, final). */
    function spentAt(k, p) {
      if (k === 1) return 0;
      if (k <= 1 + p.cE) return 256 * (k - 1);
      if (k === 2 + p.cE) return p.E;
      if (k < p.N) return 256 * (k - 2);
      return p.T;
    }

    it('asks the parent budget at entry, every 256 units, after the enumeration and after the pair phase',
      function () {
        [[m9, PAIR], [m9, negative()], [m9, position(m9, XZ_ONE_TARGET)]].forEach(function (item, n) {
          var p = layout(item[0], item[1]);
          var seen = [];
          var c = counting(item[0], function (r) { seen.push(r); });
          A.findXz(item[0], item[1], c.ctx);
          expect([n, c.counter.calls]).toEqual([n, p.N]);
          expect([n, seen.length, seen[0].work]).toEqual([n, 1, p.T]);
        });
        // the cadence of the negative position has many checks of the pair phase
        var big = layout(m9, negative());
        expect(big.cT - big.cE).toBeGreaterThan(30);
      });

    it('asks nothing more of the parent once the guard refused a unit: no recheck after a cut enumeration, ' +
      'no final check after a cut pair phase', function () {
        var p = layout(m9, PAIR);
        // a cut inside the enumeration: the entry and the cadence checks before the refused unit, nothing else
        var cutEnumeration = counting(m9, null);
        A.findXz(m9, PAIR, cutEnumeration.ctx, { workLimit: p.E - 1 });
        expect(cutEnumeration.counter.calls).toBe(1 + Math.floor((p.E - 2) / 256));
        // a cut inside the pair phase: those, the recheck after the enumeration, and no final check
        var cutPairs = counting(m9, null);
        A.findXz(m9, PAIR, cutPairs.ctx, { workLimit: p.T - 1 });
        expect(cutPairs.counter.calls).toBe(1 + Math.floor((p.T - 2) / 256) + 1);
        // a complete call asks once more, after the pair phase
        var whole = counting(m9, null);
        A.findXz(m9, PAIR, whole.ctx, { workLimit: p.T });
        expect(whole.counter.calls).toBe(p.N);
      });

    it('answers a stop of the parent at any one of those checks with no Finding and no error, and the one ' +
      'record says what the guard had spent', function () {
        [[PAIR, 'a position with a Finding'], [negative(), 'a complete negative']].forEach(function (item) {
          var state = item[0];
          var p = layout(m9, state);
          var ks = [];
          for (var k = 1; k <= p.N; k++) {
            if (p.N <= 12 || k <= 4 || k >= p.N - 3 || k === 2 + p.cE || k === 3 + p.cE || k === p.cE ||
                k === 1 + p.cE || k % 11 === 0) ks.push(k);
          }
          ks.forEach(function (stop) {
            var seen = [];
            var c = counting(m9, function (r) { seen.push(r); }, function (n) {
              if (n === stop) throw exceeded();
            });
            var label = item[1] + ', stop at check ' + stop + ' of ' + p.N;
            var finding = A.findXz(m9, state, c.ctx);
            expect([label, finding]).toEqual([label, null]);
            expect([label, seen.length]).toEqual([label, 1]);
            expect([label, seen[0].work, seen[0].capHit, seen[0].limit]).toEqual([label, spentAt(stop, p), null,
              50000]);
            // a stop in the enumeration is remembered: the call asks once more, it passes, and nothing is searched
            var inEnumeration = stop === 1 || (stop >= 2 && stop <= 1 + p.cE);
            expect([label, c.counter.calls]).toEqual([label, inEnumeration ? stop + 1 : stop]);
            if (stop >= 2 + p.cE) expect([label, seen[0].retained]).toEqual([label, p.retained]);
          });
        });
      });

    it('remembers a stop of the parent seen once: even when the budget answers again the prefix is not ' +
      'used', function () {
        var seen = [];
        var c = counting(m9, function (r) { seen.push(r); }, function (n) { if (n === 1) throw exceeded(); });
        expect(A.findXz(m9, PAIR, c.ctx)).toBeNull();
        expect(c.counter.calls).toBe(2);
        expect(seen).toEqual([{ id: 'alsXz', work: 0, limit: 50000, capHit: null, retained: 0 }]);
        // the same call without the stop finds the witness
        expect(A.findXz(m9, PAIR, SG.techniques.createContext(m9, {}))).not.toBeNull();
      });

    it('does not erase a cap already reported: the record quota stays after a stop of the parent', function () {
      var state = position(m9, XZ_ONE_TARGET);
      var recheck = 2 + Math.floor((xzEnumeration(m9, state, { records: 7 }).work - 1) / 256);
      var seen = [];
      var c = counting(m9, function (r) { seen.push(r); }, function (n) { if (n === recheck) throw exceeded(); });
      expect(A.findXz(m9, state, c.ctx, { limits: { records: 7 } })).toBeNull();
      expect(seen).toHaveLength(1);
      expect([seen[0].capHit, seen[0].retained]).toEqual(['records', 7]);
      // the same in the pair phase of the negative position, cut to 100 of its records
      var big = negative();
      var enumeration = xzEnumeration(m9, big, { records: 100 });
      expect(enumeration.capHit).toBe('records');
      var after = 2 + Math.floor((enumeration.work - 1) / 256) + 3;
      var again = [];
      var d = counting(m9, function (r) { again.push(r); }, function (n) { if (n === after) throw exceeded(); });
      expect(A.findXz(m9, big, d.ctx, { limits: { records: 100 } })).toBeNull();
      expect(d.counter.calls).toBe(after);
      expect([again[0].capHit, again[0].retained]).toEqual(['records', 100]);
    });

    it('answers a real spent budget as no Finding, and the budget stays spent for the caller', function () {
      var parent = SG.budget.create({ nodes: 3 });
      var seen = [];
      var ctx = SG.techniques.createContext(m9, { budget: parent, onPatternWork: function (r) { seen.push(r); } });
      expect(A.findXz(m9, negative(), ctx)).toBeNull();
      expect(seen).toHaveLength(1);
      expect(seen[0].capHit).toBeNull();
      expect(caught(function () { parent.check(); }).code).toBe('budget.exceeded');
      var gone = SG.budget.create({ nodes: 0 });
      var first = [];
      expect(A.findXz(m9, PAIR, SG.techniques.createContext(m9, {
        budget: gone, onPatternWork: function (r) { first.push(r); }
      }))).toBeNull();
      expect(first).toEqual([{ id: 'alsXz', work: 0, limit: 50000, capHit: null, retained: 0 }]);
    });

    it('lets cancellation and every other error through from every check, with nothing published', function () {
      var kinds = [
        ['a cancellation of the parent', new SG.errors.GenerationError('budget.cancelled', { reason: 'cancelled' })],
        ['an error that is not a budget error', new Error('boom')],
        ['a plain sentinel object', Object.freeze({ sentinel: 'parent cancellation' })],
        ['an object with a code that is not a budget code', { code: 'other.code' }],
        ['a thrown null', null],
        ['a thrown undefined', undefined],
        ['a thrown zero', 0]
      ];
      [[PAIR, 'a position with a Finding'], [negative(), 'a complete negative']].forEach(function (item) {
        var p = layout(m9, item[0]);
        [1, 2, 2 + p.cE, 3 + p.cE, p.N - 1, p.N].forEach(function (stop) {
          kinds.forEach(function (kind) {
            var seen = [];
            var c = counting(m9, function (r) { seen.push(r); }, function (n) {
              if (n === stop) throw kind[1];
            });
            var threw = false;
            var thrown = null;
            var returned = null;
            try {
              returned = A.findXz(m9, item[0], c.ctx);
            } catch (e) {
              threw = true;
              thrown = e;
            }
            var label = item[1] + ', ' + kind[0] + ', check ' + stop;
            expect([label, threw, thrown === kind[1], returned, seen.length]).toEqual([label, true, true, null, 0]);
            expect([label, c.counter.calls]).toEqual([label, stop]);
          });
        });
      });
    });

    it('drops a Finding when the budget fails after the pair phase: the last check is before publishing',
      function () {
        var p = layout(m9, PAIR);
        expect(p.found).toBe(true);
        var seen = [];
        var c = counting(m9, function (r) { seen.push(r); }, function (n) { if (n === p.N) throw exceeded(); });
        expect(A.findXz(m9, PAIR, c.ctx)).toBeNull();
        expect(seen).toEqual([{ id: 'alsXz', work: p.T, limit: 50000, capHit: null, retained: 2 }]);
      });

    it('publishes one record per call that returns, after the search and outside the error handling: an ' +
      'observer that throws is not swallowed', function () {
        var calls = 0;
        var boom = new Error('observer');
        var err = caught(function () {
          A.findXz(m9, PAIR, SG.techniques.createContext(m9, {
            onPatternWork: function () { calls++; throw boom; }
          }));
        });
        expect([calls, err === boom]).toEqual([1, true]);
        // an observer that throws a budget error is not taken for a stop of the parent
        var stop = exceeded();
        var other = caught(function () {
          A.findXz(m9, PAIR, SG.techniques.createContext(m9, { onPatternWork: function () { throw stop; } }));
        });
        expect(other === stop).toBe(true);
        // on a call that was cut by the guard or by the parent the record is published as well
        var records = [];
        var observer = function (r) { records.push(r); };
        A.findXz(m9, PAIR, SG.techniques.createContext(m9, { onPatternWork: observer }), { workLimit: 5 });
        A.findXz(m9, PAIR, SG.techniques.createContext(m9, {
          budget: SG.budget.create({ nodes: 0 }), onPatternWork: observer
        }));
        expect(records.map(function (r) { return [r.capHit, r.work]; })).toEqual([['work', 5], [null, 0]]);
      });

    it('gives exactly id, work, limit, capHit and retained, a new object for each call, and reads a context ' +
      'without options or with a hostile observer the same way', function () {
        var a = xzRun(m9, PAIR).seen[0];
        var b = xzRun(m9, PAIR).seen[0];
        expect(Object.keys(a)).toEqual(['id', 'work', 'limit', 'capHit', 'retained']);
        expect(a).toEqual(b);
        expect(a).not.toBe(b);
        var base = SG.techniques.createContext(m9, {});
        var calls = 0;
        [undefined, null, { onPatternWork: 'no' }, { onPatternWork: 5 }].forEach(function (options) {
          var ctx = Object.assign({}, base, { options: options });
          expect(A.findXz(m9, PAIR, ctx)).toEqual(A.findXz(m9, PAIR, base));
        });
        var counting2 = Object.assign({}, base, { options: { onPatternWork: function () { calls++; } } });
        A.findXz(m9, PAIR, counting2);
        expect(calls).toBe(1);
      });
  });

  describe('als-xz: ownership, immutability and no cache', function () {
    it('returns arrays of its own: writing to the Finding changes nothing in the next call', function () {
      var state = position(m9, XZ_BASE);
      var ctx = SG.techniques.createContext(m9, {});
      var first = A.findXz(m9, state, ctx);
      var snapshot = JSON.stringify(first);
      first.cells.push(999);
      first.cells.reverse();
      first.eliminations.forEach(function (e) { e.push(1); e[0] = -1; });
      first.eliminations.length = 0;
      first.placements.push([1, 1]);
      first.i18nArgs.cells.push('R0C0');
      first.i18nArgs.digitX = 0;
      var second = A.findXz(m9, state, ctx);
      expect(JSON.stringify(second)).toBe(snapshot);
      var arrays = [second.cells, second.placements, second.eliminations, second.i18nArgs.cells];
      second.eliminations.forEach(function (e) { arrays.push(e); });
      arrays.forEach(function (a, i) {
        arrays.forEach(function (b, j) { if (i !== j) expect(a === b).toBe(false); });
      });
      expect(JSON.parse(JSON.stringify(second))).toEqual(second);
    });

    it('reads the model, the state and the context only, with the debug checks on', function () {
      var before = SG.DEBUG;
      SG.setDebug(true);
      try {
        [m9, m6, cageModel].forEach(function (model, k) {
          seededStates(model, randomSolution, 1950 + k, 4, [0.3, 0.6]).forEach(function (state, i) {
            var snapshot = snapshotOf(model, state);
            var ctx = Object.freeze(Object.assign({}, SG.techniques.createContext(model, {})));
            var first = A.findXz(model, state, ctx);
            var second = A.findXz(model, state, ctx);
            expect([k, i, second]).toEqual([k, i, first]);
            expect([k, i, snapshotOf(model, state)]).toEqual([k, i, snapshot]);
          });
        });
      } finally {
        SG.setDebug(before);
      }
    });

    it('keeps no candidate list: the same state object, changed between calls, is read again every time',
      function () {
        var model = m9;
        var state = seededStates(model, randomSolution, 1960, 1, [0.3, 0.6])[0];
        var rng = SG.testkit.rng.create(78);
        var changes = 0;
        var fired = 0;
        for (var round = 0; round < 40; round++) {
          var cell = rng.int(model.cellCount);
          if (state.value[cell] === 0) {
            var digit = 1 + rng.int(model.digits);
            if (rng.next() < 0.7) state.candidates[cell] &= ~(1 << (digit - 1));
            else state.candidates[cell] |= 1 << (digit - 1);
            changes++;
          }
          var records = oracle(model, state, 4).records;
          var first = xzWitnesses(model, state, records, true);
          var got = A.findXz(model, state, SG.techniques.createContext(model, {}));
          same('round ' + round, got, first.length > 0 ? xzFindingOf(model, first[0]) : null);
          if (got !== null) fired++;
        }
        expect(changes).toBeGreaterThan(20);
        expect(fired).toBeGreaterThan(5);
      });

    it('shares nothing with the enumerator or the other finders: calls interleaved give the same answers',
      function () {
        var items = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(1970), 6);
        items.forEach(function (item, n) {
          var ctx = SG.techniques.createContext(m9, {});
          var plain = JSON.stringify(A.findXz(m9, item.state, ctx));
          A.enumerate(m9, item.state, ctx, A.createWork());
          SG.techniques.get('xyChain').find(m9, item.state, ctx);
          SG.techniques.get('forcingChain').find(m9, item.state, ctx);
          expect([n, JSON.stringify(A.findXz(m9, item.state, ctx))]).toEqual([n, plain]);
          expect([n, JSON.stringify(SG.techniques.get('alsXz').find(m9, item.state, ctx))]).toEqual([n, plain]);
        });
      });
  });
})();
