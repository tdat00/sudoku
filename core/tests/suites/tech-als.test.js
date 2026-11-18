// Almost-locked sets: the bounded enumerator SG.alsPatterns.enumerate of ../core/js/engine/tech-als.js
// (difficulty v3, R18, MS15a), ALS-XZ (MS15b), the registered technique alsXz that reads it through
// SG.alsPatterns.findXz, and Sue de Coq (MS16), the registered technique sueDeCoq that reads it through
// SG.alsPatterns.findSueDeCoq. The enumerator is a helper with no observer of its own; ALS-XZ and Sue de Coq
// are the only ALS techniques registered.
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
//   sue-de-coq   the registered technique (R19, MS16): the same sections for the line/box intersection
//                form: the seam, the proof by hand (the brief's vector in both orientations, both forms of
//                Z, a proper subset of the intersection, the near misses and the wrong roles of a unit),
//                agreement with an independent search on every kind of board, the one guard with its nine
//                charge points, the parent budget and the observer record, ownership
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
    it('offers enumerate, createWork, spend, findXz, findSueDeCoq and the limits 4 cells, ' +
      '4096 records and 50000 units', function () {
      expect(typeof A.enumerate).toBe('function');
      expect(typeof A.createWork).toBe('function');
      expect(typeof A.spend).toBe('function');
      expect(typeof A.findXz).toBe('function');
      expect(typeof A.findSueDeCoq).toBe('function');
      expect(A.LIMITS).toEqual(DEFAULT);
      expect(Object.isFrozen(A.LIMITS)).toBe(true);
      expect(Object.keys(A).sort())
        .toEqual(['LIMITS', 'createWork', 'enumerate', 'findSueDeCoq', 'findXz', 'spend']);
    });

    it('registers ALS-XZ and Sue de Coq only: alsXz and sueDeCoq are active, every other ALS technique is ' +
      'absent', function () {
        expect(SG.techniques.has('alsXz')).toBe(true);
        expect(SG.techniques.has('sueDeCoq')).toBe(true);
        ['als', 'alsEnumerate', 'alsXyWing', 'deathBlossom'].forEach(function (id) {
          expect(SG.techniques.has(id)).toBe(false);
        });
        SG.techniques.list().forEach(function (def) {
          if (def.id !== 'alsXz') expect(/^als/i.test(def.id)).toBe(false);
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
      // Sue de Coq (196, MS16) sits between it and the long chain
      expect(ids.indexOf('alsXz')).toBe(ids.indexOf('sueDeCoq') - 1);
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

    it('offers no other ALS technique: the rest stay absent, and Sue de Coq is the second one', function () {
      ['als', 'alsEnumerate', 'alsXyWing', 'deathBlossom', 'alsXy'].forEach(function (id) {
        expect(SG.techniques.has(id)).toBe(false);
      });
      var ids = SG.techniques.list().filter(function (def) {
        return /^als/i.test(def.id) || /sueDeCoq/.test(def.id);
      }).map(function (def) { return def.id; });
      expect(ids).toEqual(['alsXz', 'sueDeCoq']);
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

  // =========================================================================================================
  // Sue de Coq (R19, MS16): the registered technique sueDeCoq and `SG.alsPatterns.findSueDeCoq`

  // The brief's vector: I = {R1C1, R1C2} with C = {1,2,3,4}; A = R1C5 {1,2} in row 1 outside box 1;
  // B = R2C3 {3,4} in box 1 outside row 1. The other cells keep all their candidates.
  var SDC_BASE = { R1C1: '1234', R1C2: '1234', R1C5: '12', R2C3: '34' };
  // I = {R1C1, R1C2, R1C3} with C = {1,2,3,4,5}, so |C| = 3 + 1 + 1 and Z = {5}; no 2-cell subset is a
  // witness.
  var SDC_EXTRA = { R1C1: '1234', R1C2: '1235', R1C3: '125', R1C5: '12', R2C3: '34' };
  // R1C3 is an open cell of the intersection outside I = {R1C1, R1C2}: an ordinary target (it loses the 1).
  var SDC_SUBSET = { R1C1: '1234', R1C2: '1234', R1C3: '15', R1C5: '12', R2C3: '34' };

  var SDC_ID = 'sueDeCoq';

  function sdcRoles(model, boxKinds) {
    var out = { lines: [], boxes: [] };
    model.unitMeta.forEach(function (meta, u) {
      if (meta.kind === 'row' || meta.kind === 'col') out.lines.push(u);
      else if ((boxKinds || ['box', 'region']).indexOf(meta.kind) !== -1) out.boxes.push(u);
    });
    return out;
  }

  function heldIn(model, unit, cell) { return model.units[unit].indexOf(cell) !== -1; }

  /** The state after solving every cell of a random solution (no open cell, so no geometry at all). */
  function solvedState(model, seed) {
    var solution = SG.testkit.randomSolution(model, SG.testkit.rng.create(seed));
    var state = SG.model.initState(model);
    for (var c = 0; c < model.cellCount; c++) SG.constraints.assign(model, state, c, solution[c]);
    return state;
  }

  /**
   * Every Sue de Coq witness that has a target, in the canonical order, written from the definition of R19
   * with model.units, model.unitMeta and the state: a line (row or column) U and a box (box or region, or
   * the `boxKinds` given) V sharing two or more open cells; I a 2- or 3-subset of those cells; A a record
   * whose cells all lie in U and not in V, B one in V and not in U (the records in their canonical order);
   * both digit lists inside the digits of I and disjoint; |C| = |I| + p + q; the targets are the candidates
   * of the digits of A (and Z) in the other cells of U and of the digits of B (and Z) in those of V, never
   * in I, A or B.
   * { line, box, tuple, a, b, z, targets }.
   */
  function sdcWitnesses(model, state, records, firstOnly, boxKinds) {
    var roles = sdcRoles(model, boxKinds);
    var out = [];
    roles.lines.forEach(function (l) {
      roles.boxes.forEach(function (b) {
        if (firstOnly && out.length > 0) return;
        var shared = openCells(model, state, l).filter(function (c) { return heldIn(model, b, c); });
        if (shared.length < 2) return;
        var sideA = records.filter(function (r) {
          return r.cells.every(function (c) { return heldIn(model, l, c) && !heldIn(model, b, c); });
        });
        var sideB = records.filter(function (r) {
          return r.cells.every(function (c) { return heldIn(model, b, c) && !heldIn(model, l, c); });
        });
        [2, 3].forEach(function (size) {
          eachCombination(shared, size, function (tuple) {
            var union = tuple.reduce(function (acc, c) {
              return mergeDigits(acc, digitsOf(model, state, c));
            }, []);
            sideA.forEach(function (a) {
              sideB.forEach(function (bb) {
                if (firstOnly && out.length > 0) return;
                var inside = a.digits.concat(bb.digits).every(function (d) {
                  return union.indexOf(d) !== -1;
                });
                if (!inside) return;
                if (a.digits.some(function (d) { return bb.digits.indexOf(d) !== -1; })) return;
                if (union.length !== size + a.cells.length + bb.cells.length) return;
                var z = union.filter(function (d) {
                  return a.digits.indexOf(d) === -1 && bb.digits.indexOf(d) === -1;
                });
                var targets = [];
                for (var c = 0; c < model.cellCount; c++) {
                  if (state.value[c] !== 0 || tuple.indexOf(c) !== -1) continue;
                  if (a.cells.indexOf(c) !== -1 || bb.cells.indexOf(c) !== -1) continue;
                  var drop = [];
                  if (heldIn(model, l, c)) drop = drop.concat(a.digits, z);
                  if (heldIn(model, b, c)) drop = drop.concat(bb.digits, z);
                  var have = digitsOf(model, state, c);
                  mergeDigits(drop, []).forEach(function (d) {
                    if (have.indexOf(d) !== -1) targets.push([c, d]);
                  });
                }
                if (targets.length > 0) {
                  out.push({ line: l, box: b, tuple: tuple, a: a, b: bb, z: z, targets: targets });
                }
              });
            });
          });
        });
      });
    });
    return out;
  }

  function sdcFindingOf(model, w) {
    return {
      technique: SDC_ID,
      cells: w.tuple.concat(w.a.cells, w.b.cells).sort(numeric),
      placements: [],
      eliminations: w.targets,
      i18nKey: 'technique.sueDeCoq.step' + (w.z.length === 0 ? '' : '.extra'),
      i18nArgs: {
        digits: w.a.digits,
        partDigits: w.b.digits,
        forced: w.z,
        line: model.unitMeta[w.line].label,
        box: model.unitMeta[w.box].label
      }
    };
  }

  /**
   * The units the stated rule charges around the enumeration, up to the witness w (null: every pair):
   * { geometry, rest, pairs }, `geometry` the cells of the boxes visited (solved cells included, one unit
   * each), `rest` the units after the enumeration: a record classified, a pair opened, a record of each home
   * list tested for lying outside the other unit, a tuple opened, a side record tested for its digits inside
   * C (both sides, every tuple), a pair (A, B) tested, a cell of U and V visited for each valid witness. With
   * no pair of two open shared cells nothing is enumerated and `rest` is 0. NOT independent: it re-implements
   * the count of the rule from its words, so it pins the stated count rather than discovers it.
   */
  function sdcUnits(model, state, records, w) {
    var roles = sdcRoles(model);
    var geometry = 0;
    roles.boxes.forEach(function (b) { geometry += model.units[b].length; });
    var pairs = [];
    roles.lines.forEach(function (l) {
      roles.boxes.forEach(function (b) {
        var shared = openCells(model, state, l).filter(function (c) { return heldIn(model, b, c); });
        if (shared.length >= 2) pairs.push({ l: l, b: b, shared: shared });
      });
    });
    if (pairs.length === 0) return { geometry: geometry, rest: 0, pairs: 0 };
    var rest = records.length;
    var done = false;
    var within = function (unit) {
      return function (r) { return r.cells.every(function (c) { return heldIn(model, unit, c); }); };
    };
    var outside = function (unit) {
      return function (r) { return r.cells.every(function (c) { return !heldIn(model, unit, c); }); };
    };
    pairs.forEach(function (p) {
      if (done) return;
      rest += 1;
      var homeA = records.filter(within(p.l));
      var homeB = records.filter(within(p.b));
      rest += homeA.length + homeB.length;
      var sideA = homeA.filter(outside(p.b));
      var sideB = homeB.filter(outside(p.l));
      if (sideA.length === 0 || sideB.length === 0) return;
      var scope = mergeDigits(Array.prototype.slice.call(model.units[p.l]),
        Array.prototype.slice.call(model.units[p.b])).length;
      [2, 3].forEach(function (size) {
        eachCombination(p.shared, size, function (tuple) {
          if (done) return;
          rest += 1 + sideA.length + sideB.length;
          var union = tuple.reduce(function (acc, c) {
            return mergeDigits(acc, digitsOf(model, state, c));
          }, []);
          var inside = function (r) {
            return r.digits.every(function (d) { return union.indexOf(d) !== -1; });
          };
          sideA.filter(inside).forEach(function (a) {
            sideB.filter(inside).forEach(function (b) {
              if (done) return;
              rest += 1;
              if (a.digits.some(function (d) { return b.digits.indexOf(d) !== -1; })) return;
              if (union.length !== size + a.cells.length + b.cells.length) return;
              rest += scope;
              if (w !== null && w.line === p.l && w.box === p.b && w.tuple.join() === tuple.join() &&
                  w.a === a && w.b === b) {
                done = true;
              }
            });
          });
        });
      });
    });
    return { geometry: geometry, rest: rest, pairs: pairs.length };
  }

  /** A call of findSueDeCoq with a context that collects the observer records: { finding, seen }. */
  function sdcRun(model, state, opts, ctxOptions) {
    var seen = [];
    var options = Object.assign({ onPatternWork: function (r) { seen.push(r); } }, ctxOptions || {});
    var finding = A.findSueDeCoq(model, state, SG.techniques.createContext(model, options), opts);
    return { finding: finding, seen: seen };
  }

  /**
   * The plan of one position under the production limits: the independent witnesses of the retained prefix
   * (the first 4096 records), the geometry units, the enumeration and the units after it up to the first
   * witness.
   */
  function sdcPlan(model, state, limits) {
    var enumeration = run(model, state, limits, undefined);
    var records = enumeration.result.records;
    var all = oracle(model, state, 4).records;
    var witnesses = sdcWitnesses(model, state, records, false);
    var first = witnesses.length > 0 ? witnesses[0] : null;
    var units = sdcUnits(model, state, records, first);
    var enumerated = units.pairs > 0;
    return {
      records: records, all: all, witnesses: witnesses, first: first, geometry: units.geometry,
      rest: units.rest, E: enumerated ? enumeration.work.used : 0, enumerated: enumerated,
      capHit: enumeration.result.capHit,
      T: units.geometry + (enumerated ? enumeration.work.used : 0) + units.rest
    };
  }

  /** The cells of a 9 x 9 position or Finding turned the other way: R(r)C(c) becomes R(c)C(r). */
  function transposed(spec) {
    var out = {};
    Object.keys(spec).forEach(function (ref) {
      var m = /^R(\d)C(\d)$/.exec(ref);
      out['R' + m[2] + 'C' + m[1]] = spec[ref];
    });
    return out;
  }

  var SDC_ORDER = SG.fixtures.techniques.registryOrder;

  /** The ids of the registry before `id` (the preparatory list of an explicit position). */
  function through(id) { return SDC_ORDER.slice(0, SDC_ORDER.indexOf(id)); }

  /** The real classic 9 x 9 puzzles of the fixtures with a unique solution, each stuck after `ids`. */
  function realPositions(ids) {
    var F = SG.fixtures.techniques;
    var seen = {};
    var out = [];
    function add(fixture) {
      if (!fixture || typeof fixture.puzzle !== 'string' || fixture.puzzle.length !== 81 ||
          seen[fixture.puzzle]) {
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

  describe('sue-de-coq: the registered technique and the seam', function () {
    it('is registered as sueDeCoq: chain group, order 196, base cost 112, unscoped, no uniqueness, between ' +
      'alsXz (194) and forcingChainLong (198), and the chain group has seven members', function () {
        var def = SG.techniques.get(SDC_ID);
        expect(SG.techniques.list().filter(function (t) { return t.id === SDC_ID; })).toHaveLength(1);
        expect(def.group).toBe('chain');
        expect(def.order).toBe(196);
        expect(def.baseCost).toBe(112);
        expect(def.i18nKey).toBe('technique.sueDeCoq');
        expect(def.variantScope).toBeNull();
        expect(def.assumesUniqueness).toBe(false);
        expect(typeof def.find).toBe('function');
        var als = SG.techniques.get('alsXz');
        var long = SG.techniques.get('forcingChainLong');
        expect([SG.techniques.get('forcingChain').order, als.order, def.order, long.order,
          SG.techniques.get('nishio').order, SG.techniques.get('nishioDeep').order])
          .toEqual([190, 194, 196, 198, 200, 202]);
        expect(als.order).toBeLessThan(def.order);
        expect(def.order).toBeLessThan(long.order);
        expect(als.baseCost).toBeLessThan(def.baseCost);
        expect(def.baseCost).toBeLessThan(long.baseCost);
        var ids = SG.techniques.list().map(function (t) { return t.id; });
        expect(ids.indexOf(SDC_ID)).toBe(ids.indexOf('alsXz') + 1);
        expect(ids.indexOf(SDC_ID)).toBe(ids.indexOf('forcingChainLong') - 1);
        expect(SG.techniques.list().filter(function (t) { return t.order === 196; })).toHaveLength(1);
        expect(SG.techniques.list().filter(function (t) { return t.group === 'chain'; }).map(function (t) {
          return t.id;
        })).toEqual(['xyChain', 'forcingChain', 'alsXz', 'sueDeCoq', 'forcingChainLong', 'nishio',
          'nishioDeep']);
      });

    it('is registered once even when the file is loaded again: the registry keeps its first definitions',
      function () {
        var source = SG.test.node && SG.test.node.fs.readFileSync(
          SG.test.node.path.join(SG.test.node.root, '../core/js/engine/tech-als.js'), 'utf8');
        if (!source) SG.test.skip('needs the Node runner to reload the source');
        var def = SG.techniques.get(SDC_ID);
        var als = SG.techniques.get('alsXz');
        var count = SG.techniques.list().length;
        SG.test.node.vm.runInThisContext(source, { filename: '../core/js/engine/tech-als.js' });
        expect(SG.techniques.get(SDC_ID)).toBe(def);
        expect(SG.techniques.get('alsXz')).toBe(als);
        expect(SG.techniques.list().length).toBe(count);
        expect(SG.alsPatterns.LIMITS).toEqual(DEFAULT);
      });

    it('runs with its own allowance 50,000 and the production limits: the registered finder takes no ' +
      'options, and never reads limits from the context', function () {
        var def = SG.techniques.get(SDC_ID);
        var state = position(m9, SDC_BASE);
        var seen = [];
        var ctx = SG.techniques.createContext(m9, { onPatternWork: function (r) { seen.push(r); } });
        var plain = def.find(m9, state, ctx);
        var extra = def.find(m9, state, ctx, { workLimit: 5, limits: { cells: 1, records: 1 } });
        expect(extra).toEqual(plain);
        expect(plain).not.toBeNull();
        expect(seen).toHaveLength(2);
        expect(seen[0]).toEqual(seen[1]);
        expect(seen[0].limit).toBe(50000);
        expect(seen[0].retained).toBeGreaterThan(1);
        var hostile = SG.techniques.createContext(m9, {
          limits: { cells: 1, records: 1 }, workLimit: 5, onPatternWork: function (r) { seen.push(r); }
        });
        expect(def.find(m9, state, hostile)).toEqual(plain);
        expect(seen[2].limit).toBe(50000);
        expect(seen[2].retained).toBe(seen[0].retained);
        expect(plain).toEqual(A.findSueDeCoq(m9, state, SG.techniques.createContext(m9, {})));
      });

    it('takes opts = { workLimit, limits } as the seam of the tests and refuses anything else before any ' +
      'work: null, a number, a string, a boolean, an array, a negative or non-finite limit, for both finders',
      function () {
        var state = position(m9, SDC_BASE);
        var bad = [null, 5, 'x', true, [], [1], [{ workLimit: 5 }], { workLimit: -1 }, { workLimit: NaN },
          { workLimit: Infinity }, { workLimit: '5' }, { workLimit: null }, { limits: null }, { limits: 5 },
          { limits: { cells: -1 } }, { limits: { records: NaN } }, { limits: { cells: Infinity } }];
        [['findXz', A.findXz], ['findSueDeCoq', A.findSueDeCoq]].forEach(function (finder) {
          bad.forEach(function (opts) {
            var seen = [];
            var checks = 0;
            var ctx = Object.assign({}, SG.techniques.createContext(m9, {}), {
              options: { onPatternWork: function (r) { seen.push(r); } },
              check: function () { checks++; }
            });
            var err = caught(function () { finder[1](m9, state, ctx, opts); });
            var label = finder[0] + ' ' + JSON.stringify(opts);
            expect([label, err && err.code]).toEqual([label, 'solver.invalidOption']);
            expect([label, seen.length, checks]).toEqual([label, 0, 0]);
          });
        });
        // a whole number of at least 0 is accepted and floored, and undefined means no option
        var out = sdcRun(m9, state, { workLimit: 2.9, limits: { cells: 1.7, records: 100 } });
        expect(out.seen).toHaveLength(1);
        expect(out.seen[0].limit).toBe(2);
        expect(sdcRun(m9, state, {}).finding).not.toBeNull();
        expect(sdcRun(m9, state, { workLimit: undefined, limits: undefined }).finding).not.toBeNull();
        expect(sdcRun(m9, state, { workLimit: undefined }).seen[0].limit).toBe(50000);
        expect(sdcRun(m9, state, { workLimit: 0 }).seen[0].limit).toBe(0);
      });

    it('checks an explicit limits override even when the geometry ends the call before any enumeration',
      function () {
        var solved = solvedState(m9, 1601);
        expect(solved.unsolvedCount).toBe(0);
        [{ limits: { cells: -1 } }, { limits: { records: NaN } }, { limits: null }, { limits: 'x' },
          { workLimit: -2 }]
          .forEach(function (opts) {
            var seen = [];
            var checks = 0;
            var ctx = Object.assign({}, SG.techniques.createContext(m9, {}), {
              options: { onPatternWork: function (r) { seen.push(r); } },
              check: function () { checks++; }
            });
            var err = caught(function () { A.findSueDeCoq(m9, solved, ctx, opts); });
            var label = JSON.stringify(opts);
            expect([label, err && err.code]).toEqual([label, 'solver.invalidOption']);
            expect([label, seen.length, checks]).toEqual([label, 0, 0]);
          });
        // a valid override passes through the same early return
        var ok = sdcRun(m9, solved, { limits: { cells: 2, records: 5 } });
        expect(ok.finding).toBeNull();
        expect(ok.seen).toHaveLength(1);
      });

    it('defaults to its own private allowance, SDC_WORK_LIMIT, and not to the shared LIMITS.work',
      function () {
        var state = position(m9, SDC_BASE);
        expect(A.LIMITS.work).toBe(50000);
        expect(sdcRun(m9, state).seen[0].limit).toBe(50000);
        expect(sdcRun(m9, state, { limits: { records: 100 } }).seen[0].limit).toBe(50000);
        // the guard is a fresh one for each call: a second call starts from zero and ends with the same
        // record
        var a = sdcRun(m9, state).seen[0];
        var b = sdcRun(m9, state).seen[0];
        expect(a).toEqual(b);
        expect(a.work).toBeGreaterThan(0);
        // and no guard of an earlier ALS-XZ call is reused
        A.findXz(m9, state, SG.techniques.createContext(m9, {}));
        expect(sdcRun(m9, state).seen[0]).toEqual(a);
      });
  });

  describe('sue-de-coq: the proof by hand', function () {
    function cellOf(ref) { return H.cell(m9, ref); }
    function turn(cell) { return (cell % 9) * 9 + Math.floor(cell / 9); }

    /** Eliminations from the cells of a list: [[cell, [digits]], ...] to sorted [cell, digit] pairs. */
    function pairsOf(list) {
      var out = [];
      list.forEach(function (item) { item[1].forEach(function (d) { out.push([item[0], d]); }); });
      return out;
    }

    /** A position and its transpose: the same pattern read along a column and a box. */
    function bothWays(spec) { return [['rows', spec], ['columns', transposed(spec)]]; }

    /** A complete negative: the independent search finds nothing and neither does the finder. */
    function expectNone(model, state, label) {
      var plan = sdcPlan(model, state);
      expect([label, plan.witnesses.length]).toEqual([label, 0]);
      var out = sdcRun(model, state);
      expect([label, out.finding]).toEqual([label, null]);
      expect(out.seen).toEqual([{
        id: SDC_ID, work: plan.T, limit: 50000, capHit: null,
        retained: plan.enumerated ? plan.records.length : 0
      }]);
      return plan;
    }

    // what the brief's vector removes: 1 and 2 from the other cells of row 1, 3 and 4 from the other cells of
    // box 1
    var BASE_ELIMINATIONS = pairsOf([
      [2, [1, 2, 3, 4]], [3, [1, 2]], [5, [1, 2]], [6, [1, 2]], [7, [1, 2]], [8, [1, 2]],
      [9, [3, 4]], [10, [3, 4]], [18, [3, 4]], [19, [3, 4]], [20, [3, 4]]
    ]);

    it('finds the brief\'s vector: I = {R1C1, R1C2} with C = {1,2,3,4}, A = R1C5 {1,2}, B = R2C3 {3,4}; it ' +
      'removes 1 and 2 elsewhere in row 1 and 3 and 4 elsewhere in box 1, and nothing from I, A or B',
    function () {
      var state = position(m9, SDC_BASE);
      var plan = sdcPlan(m9, state);
      var w = plan.first;
      expect([w.line, w.box, w.tuple, w.a.cells, w.b.cells, w.z]).toEqual([0, 18, [0, 1], [4], [11], []]);
      expect(plan.witnesses.filter(function (x) { return x.tuple.length === 2; }).length).toBeGreaterThan(0);
      var out = sdcRun(m9, state);
      expect(out.finding).toEqual({
        technique: 'sueDeCoq',
        cells: [0, 1, 4, 11],
        placements: [],
        eliminations: BASE_ELIMINATIONS,
        i18nKey: 'technique.sueDeCoq.step',
        i18nArgs: { digits: [1, 2], partDigits: [3, 4], forced: [], line: 'R1', box: 'B1' }
      });
      expect(Object.keys(out.finding)).toEqual(['technique', 'cells', 'placements', 'eliminations', 'i18nKey',
        'i18nArgs']);
      expect(Object.keys(out.finding.i18nArgs)).toEqual(['digits', 'partDigits', 'forced', 'line', 'box']);
      expect(out.finding).toEqual(sdcFindingOf(m9, w));
      var removed = out.finding.eliminations.map(function (e) { return e[0]; });
      [0, 1, 4, 11].forEach(function (c) { expect(removed).not.toContain(c); });
      // R1C3 sees both units and loses all four digits; R4C1 sees R1C1 only through column 1 and keeps
      // everything
      expect(removed).not.toContain(cellOf('R4C1'));
      expect(out.seen).toEqual([{
        id: 'sueDeCoq', work: plan.T, limit: 50000, capHit: null, retained: plan.records.length
      }]);
      expect(plan.records).toHaveLength(4);
    });

    it('finds the same pattern along a column and a box: the transposed vector, with the transposed removals',
      function () {
      var state = position(m9, transposed(SDC_BASE));
      var out = sdcRun(m9, state);
      var plan = sdcPlan(m9, state);
      expect(out.finding.cells).toEqual([0, 9, 19, 36]);
      expect(out.finding.i18nArgs)
        .toEqual({ digits: [1, 2], partDigits: [3, 4], forced: [], line: 'C1', box: 'B1' });
      expect(out.finding.eliminations).toEqual(BASE_ELIMINATIONS
        .map(function (e) { return [turn(e[0]), e[1]]; })
        .sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }));
      expect(out.finding).toEqual(sdcFindingOf(m9, plan.first));
      expect(out.seen[0].work).toBe(plan.T);
    });

    it('adds the Z digit for a three-cell I: I = {R1C1, R1C2, R1C3} with C = {1,2,3,4,5} also removes the ' +
      '5 elsewhere in row 1 and in box 1, and the key is the extra one', function () {
      bothWays(SDC_EXTRA).forEach(function (way) {
        var state = position(m9, way[1]);
        var plan = sdcPlan(m9, state);
        var w = plan.first;
        var out = sdcRun(m9, state);
        var turned = way[0] === 'columns';
        var fix = function (cell) { return turned ? turn(cell) : cell; };
        var expected = pairsOf([
          [3, [1, 2, 5]], [5, [1, 2, 5]], [6, [1, 2, 5]], [7, [1, 2, 5]], [8, [1, 2, 5]],
          [9, [3, 4, 5]], [10, [3, 4, 5]], [18, [3, 4, 5]], [19, [3, 4, 5]], [20, [3, 4, 5]]
        ]).map(function (e) { return [fix(e[0]), e[1]]; })
          .sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
        expect([way[0], w.tuple.length, w.z]).toEqual([way[0], 3, [5]]);
        expect([way[0], out.finding.i18nKey]).toEqual([way[0], 'technique.sueDeCoq.step.extra']);
        var args = out.finding.i18nArgs;
        expect([way[0], args.forced, args.digits, args.partDigits]).toEqual([way[0], [5], [1, 2], [3, 4]]);
        expect([way[0], out.finding.eliminations]).toEqual([way[0], expected]);
        expect(out.finding.cells).toEqual([0, 1, 2, 4, 11].map(fix).sort(numeric));
        expect(out.finding).toEqual(sdcFindingOf(m9, w));
        // none of the three cells of I, nor A, nor B, loses a candidate
        var removed = out.finding.eliminations.map(function (e) { return e[0]; });
        [0, 1, 2, 4, 11].forEach(function (c) { expect(removed).not.toContain(fix(c)); });
      });
    });

    it('takes every 2-subset of the open shared cells as I, not only the whole intersection: with R1C3 ' +
      'open the pair {R1C1, R1C2} is I and R1C3 is an ordinary target', function () {
      bothWays(SDC_SUBSET).forEach(function (way) {
        var state = position(m9, way[1]);
        var plan = sdcPlan(m9, state);
        var w = plan.first;
        var turned = way[0] === 'columns';
        var fix = function (cell) { return turned ? turn(cell) : cell; };
        expect([way[0], w.tuple.slice().sort(numeric), w.z])
          .toEqual([way[0], [0, 1].map(fix).sort(numeric), []]);
        var out = sdcRun(m9, state);
        var third = fix(2);
        var onThird = out.finding.eliminations.filter(function (e) { return e[0] === third; });
        expect([way[0], onThird]).toEqual([way[0], [[third, 1]]]);
        expect(out.finding.cells).toEqual([0, 1, 4, 11].map(fix).sort(numeric));
        expect(out.finding).toEqual(sdcFindingOf(m9, w));
      });
      // with R1C3 solved the same pair is the whole open intersection and the pattern is the same
      var solved = position(m9, SDC_BASE, { R1C3: 7 });
      expect(sdcPlan(m9, solved).first.tuple).toEqual([0, 1]);
      expect(sdcRun(m9, solved).finding.cells).toEqual([0, 1, 4, 11]);
    });

    it('never removes a candidate of a solved cell, and keeps what it must not touch: a cell that sees I ' +
      'only by another unit, and a candidate that is not one of the digits', function () {
      var state = position(m9, SDC_BASE, { R1C4: 1, R2C1: 3 });
      var out = sdcRun(m9, state);
      var removed = out.finding.eliminations.map(function (e) { return e[0]; });
      expect(removed).not.toContain(cellOf('R1C4'));
      expect(removed).not.toContain(cellOf('R2C1'));
      out.finding.eliminations.forEach(function (e) {
        var open = (state.candidates[e[0]] & (1 << (e[1] - 1))) !== 0;
        expect([e, state.value[e[0]], open]).toEqual([e, 0, true]);
      });
      // a cell of row 1 without the digits 1 and 2 loses nothing: R1C6 holds only 5 and 6
      var narrow = position(m9, Object.assign({ R1C6: '56' }, SDC_BASE));
      var fromNarrow = sdcRun(m9, narrow).finding.eliminations.map(function (e) { return e[0]; });
      expect(fromNarrow).not.toContain(cellOf('R1C6'));
      expect(sdcRun(m9, narrow).finding).toEqual(sdcFindingOf(m9, sdcPlan(m9, narrow).first));
    });

    it('finds nothing when the digits of A and B overlap, when |C| is not |I| + p + q, when A or B is not ' +
      'inside C, or when the sets are in the wrong unit, in rows and in columns', function () {
      var cases = [
        ['A and B share the 2', Object.assign({}, SDC_BASE, { R2C3: '23' })],
        ['|C| is one too big for p = q = 1', Object.assign({}, SDC_BASE, { R1C2: '12345' })],
        // three cells whose digits are one short of |I| + p + q: such a position has no solution at all
        ['|C| is one short of |I| + p + q for a three-cell I',
          { R1C1: '12', R1C2: '13', R1C3: '14', R1C5: '12', R2C3: '34' }],
        ['|C| is one too small: B has a digit outside C',
          Object.assign({}, SDC_BASE, { R1C1: '123', R1C2: '123' })],
        ['A has a digit outside C', Object.assign({}, SDC_BASE, { R1C5: '15' })],
        ['A is a cell of the intersection, in the box',
          { R1C1: '1234', R1C2: '1234', R1C3: '12', R2C3: '34' }],
        ['B is a cell of the line, outside the box', { R1C1: '1234', R1C2: '1234', R1C5: '12', R1C6: '34' }],
        ['A is a cell of another row', { R1C1: '1234', R1C2: '1234', R4C5: '12', R2C3: '34' }],
        ['B is in a box other than the I box', { R1C1: '1234', R1C2: '1234', R1C5: '12', R5C5: '34' }]
      ];
      cases.forEach(function (item) {
        bothWays(item[1]).forEach(function (way) {
          expectNone(m9, position(m9, way[1]), item[0] + ', ' + way[0]);
        });
      });
      // each near miss differs from the brief's vector by one fact, and that vector does fire
      expect(sdcRun(m9, position(m9, SDC_BASE)).finding).not.toBeNull();
    });

    it('has no witness with a single open cell of the intersection, or when the digits of the cells are no ' +
      'almost locked set', function () {
      // one open shared cell: R1C2 and R1C3 are solved
      expectNone(m9, position(m9, { R1C1: '1234', R1C5: '12', R2C3: '34' }, { R1C2: 5, R1C3: 6 }),
        'one shared cell');
      // a one-cell set with three digits is no almost locked set: there is no A
      expectNone(m9, position(m9, { R1C1: '1234', R1C2: '1234', R1C5: '123', R2C3: '34' }),
        'no ALS on the A side');
    });

    it('reads a window, a diagonal or a cage as neither the line nor the box: a pattern that exists only ' +
      'with a window as the box is not taken', function () {
      // W1 holds R2C2..R4C4; row 2 meets it in R2C2, R2C3, R2C4 (the last in box 2). I = {R2C3, R2C4} is in
      // one box only through the window
      var spec = { R2C3: '1234', R2C4: '1234', R2C7: '12', R3C3: '34' };
      var state = position(hyperModel, spec);
      var all = oracle(hyperModel, state, 4).records;
      var asWindow = sdcWitnesses(hyperModel, state, all, false, ['window']);
      expect(asWindow.length).toBeGreaterThan(0);
      var w = asWindow[0];
      expect([hyperModel.unitMeta[w.box].kind, w.tuple]).toEqual(['window', [11, 12]]);
      var plan = sdcPlan(hyperModel, state);
      expect(plan.witnesses).toHaveLength(0);
      expect(sdcWitnesses(hyperModel, state, all, false, ['box'])).toHaveLength(0);
      var out = sdcRun(hyperModel, state);
      expect(out.finding).toBeNull();
      expect(out.seen[0].capHit).toBeNull();
      // a diagonal meets a line in one cell, a cage here in none: neither makes a pair on its own
      [diagonalModel, cageModel].forEach(function (model) {
        var other = sdcPlan(model, position(model, { R1C1: '1234', R2C2: '1234', R1C5: '12', R3C3: '34' }));
        other.witnesses.forEach(function (x) {
          expect(['row', 'col']).toContain(model.unitMeta[x.line].kind);
          expect(['box', 'region']).toContain(model.unitMeta[x.box].kind);
        });
      });
    });
  });

  describe('sue-de-coq: agreement with the independent search, and exactness', function () {
    var ORDER = SDC_ORDER;

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

    /** Forcing the eliminated digit leaves no completion at all: the exact search finds none. */
    function expectImpossible(model, state, cell, digit, label) {
      var forced = SG.model.cloneState(state);
      if (!SG.constraints.assign(model, forced, cell, digit)) return;
      if (!SG.constraints.propagate(model, forced)) return;
      var result = SG.dfs.searchFrom(model, forced, { maxBacktracks: 300000 });
      expect([label, result.aborted, result.found]).toEqual([label, false, 0]);
    }

    var SPARSE = [0.05, 0.4];
    var POPULATIONS = [
      { name: 'real fixtures after the basic techniques', model: m9, exact: true, real: ORDER.slice(0, 3) },
      { name: 'real fixtures through the locked techniques', model: m9, exact: true,
        real: through('nakedPair') },
      { name: 'real fixtures through the triples', model: m9, exact: true, real: through('nakedQuad') },
      { name: 'real fixtures through the fish', model: m9, exact: true, real: through('xyWing') },
      { name: 'real fixtures where alsXz\'s predecessors are exhausted', model: m9, exact: true,
        real: through('forcingChain') },
      { name: 'classic9 seeded (seed 4001)', model: m9, exact: true, seed: 4001, count: 8, keep: SPARSE },
      { name: 'classic9 seeded (seed 4011)', model: m9, exact: true, seed: 4011, count: 8, keep: SPARSE },
      { name: 'classic9 sweep states', model: m9, exact: true, sweep: 40 },
      { name: 'classic6', model: m6, exact: true, seed: 4002, count: 12, keep: SPARSE },
      { name: 'classic4', model: m4, exact: true, seed: 4003, count: 12, keep: SPARSE },
      { name: '12 digits', model: m12, exact: true, seed: 4004, count: 4, keep: SPARSE },
      { name: '16 digits', model: m16, exact: false, seed: 4029, count: 3, keep: SPARSE },
      { name: 'diagonal', model: diagonalModel, exact: true, seed: 4017, count: 6, keep: SPARSE },
      { name: 'windows', model: hyperModel, exact: true, seed: 4017, count: 6, keep: SPARSE },
      { name: 'partial cage', model: cageModel, exact: true, seed: 4018, count: 6, keep: SPARSE },
      { name: 'samurai', model: samuraiModel, exact: false, seed: 4006, count: 2, keep: SPARSE },
      { name: 'samurai, denser', model: samuraiModel, exact: false, seed: 4016, count: 2, keep: [0.3, 0.6] }
    ];
    ['staggered', 'wavy', 'mixed', 'crossed'].forEach(function (name, i) {
      [false, true].forEach(function (flip) {
        var layout = J.parse(J.LAYOUTS[name]);
        POPULATIONS.push({
          name: 'jigsaw ' + name + (flip ? ' (transposed)' : ''),
          model: J.build(flip ? J.transpose(layout) : layout), solve: J.solve, exact: true,
          seed: 4100 + 2 * i + (flip ? 1 : 0), count: 6, keep: SPARSE
        });
      });
    });

    var tally = { positions: 0, fired: 0, byPopulation: {}, eliminations: 0, zEmpty: 0, zNonEmpty: 0,
      twoCells: 0, threeCells: 0, properSubset: 0, wholeIntersection: 0, oneCellSides: 0, bigSides: 0,
      notTheMost: 0, multipleTargets: 0, cut: 0, recordQuota: 0, exact: 0, withoutAlsXz: 0, withAlsXz: 0,
      labels: {}, regions: 0 };

    function checkPosition(pop, item, i) {
      var model = pop.model;
      var state = item.state;
      var label = pop.name + ' #' + i;
      var plan = sdcPlan(model, state);
      var out = sdcRun(model, state);
      var first = plan.first;
      tally.positions++;
      if (plan.all.length > DEFAULT.records) tally.recordQuota++;
      if (plan.T > DEFAULT.work) {
        // the guard of 50,000 units is spent before the first witness (or the end): a cut call, no Finding
        expect([label, out.finding]).toEqual([label, null]);
        expect([label, out.seen]).toEqual([label, [{
          id: SDC_ID, work: DEFAULT.work, limit: DEFAULT.work, capHit: 'work', retained: out.seen[0].retained
        }]]);
        tally.cut++;
        return true;
      }
      var capHit = plan.enumerated && plan.capHit === 'records' ? 'records' : null;
      if (first === null) expect([label, out.finding]).toEqual([label, null]);
      else same(label, out.finding, sdcFindingOf(model, first));
      expect([label, out.seen]).toEqual([label, [{
        id: SDC_ID, work: plan.T, limit: DEFAULT.work, capHit: capHit,
        retained: plan.enumerated ? plan.records.length : 0
      }]]);
      tally.byPopulation[pop.name] = (tally.byPopulation[pop.name] || 0) + (first === null ? 0 : 1);
      if (first === null) return true;
      tally.fired++;
      tally.eliminations += out.finding.eliminations.length;
      tally[first.z.length === 0 ? 'zEmpty' : 'zNonEmpty']++;
      tally[first.tuple.length === 2 ? 'twoCells' : 'threeCells']++;
      var shared = openCells(model, state, first.line)
        .filter(function (c) { return heldIn(model, first.box, c); });
      tally[first.tuple.length < shared.length ? 'properSubset' : 'wholeIntersection']++;
      if (first.a.cells.length === 1 && first.b.cells.length === 1) tally.oneCellSides++;
      if (first.a.cells.length + first.b.cells.length >= 4) tally.bigSides++;
      if (first.targets.length > 1) tally.multipleTargets++;
      var largest = plan.witnesses.some(function (w) { return w.targets.length > first.targets.length; });
      if (largest) tally.notTheMost++;
      var kinds = [model.unitMeta[first.line].kind, model.unitMeta[first.box].kind];
      tally.labels[kinds.join('/')] = (tally.labels[kinds.join('/')] || 0) + 1;
      if (kinds[1] === 'region') tally.regions++;
      // ALS-XZ is a separate finder: both may fire on one position, either may not
      var xzFound = A.findXz(model, state, SG.techniques.createContext(model, {})) !== null;
      tally[xzFound ? 'withAlsXz' : 'withoutAlsXz']++;
      // the line and the box named in the Finding are the real units, and every removal is sound
      expect(out.finding.i18nArgs.line).toBe(model.unitMeta[first.line].label);
      expect(out.finding.i18nArgs.box).toBe(model.unitMeta[first.box].label);
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
      it('gives the independent search\'s first witness, its work and its record on ' + pop.name,
        function () {
          var items;
          if (pop.real) {
            items = realPositions(pop.real);
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

    it('exercises the rule on those positions: firings on every kind of board and in the real fixtures, ' +
      'both forms of Z, two- and three-cell I, a proper subset of the intersection, larger sets, several ' +
      'targets, a first witness that is not the largest, a record-capped call, regions as boxes, and the ' +
      'exact search',
      function () {
        expect(tally.positions).toBeGreaterThan(400);
        POPULATIONS.forEach(function (pop) {
          expect([pop.name, tally.byPopulation[pop.name] > 0]).toEqual([pop.name, true]);
        });
        expect(tally.fired).toBeGreaterThan(60);
        expect(tally.zEmpty).toBeGreaterThan(30);
        expect(tally.zNonEmpty).toBeGreaterThan(30);
        expect(tally.twoCells).toBeGreaterThan(30);
        expect(tally.threeCells).toBeGreaterThan(30);
        expect(tally.properSubset).toBeGreaterThan(10);
        expect(tally.wholeIntersection).toBeGreaterThan(40);
        expect(tally.oneCellSides).toBeGreaterThan(30);
        expect(tally.bigSides).toBeGreaterThan(8);
        expect(tally.multipleTargets).toBeGreaterThan(50);
        expect(tally.notTheMost).toBeGreaterThan(8);
        expect(tally.recordQuota).toBeGreaterThan(0);
        expect(tally.regions).toBeGreaterThan(12);
        // ALS-XZ is another finder: on these positions it also fires wherever Sue de Coq does, which says
        // nothing about a position that the registry reaches only after ALS-XZ is exhausted
        expect(tally.withAlsXz + tally.withoutAlsXz).toBe(tally.fired);
        expect(tally.exact).toBeGreaterThan(100);
        // only rows and columns against boxes and regions ever appear
        Object.keys(tally.labels).forEach(function (key) {
          expect(['row/box', 'col/box', 'row/region', 'col/region']).toContain(key);
        });
      });
  });

  describe('sue-de-coq: the one guard, the work limit and the record quota', function () {
    var BASE = position(m9, SDC_BASE);
    // every other cell of the row and the box of the vector is left with digits that are none of 1 to 4, so
    // the capacity condition holds for {R1C1, R1C2}, R1C5 and R2C3 and no target is left
    var NO_TARGET = position(m9, Object.assign({
      R1C4: '6', R1C6: '7', R1C7: '8', R1C8: '9', R1C9: '67', R2C1: '6', R2C2: '7', R3C1: '8', R3C2: '9',
      R3C3: '67'
    }, SDC_BASE), { R1C3: 5 });

    /** Two open cells left of a solved board: `leave` are the cells that stay open. */
    function almostSolved(model, seed, leave) {
      var solution = SG.testkit.randomSolution(model, SG.testkit.rng.create(seed));
      var state = SG.model.initState(model);
      for (var c = 0; c < model.cellCount; c++) {
        if (leave.indexOf(c) === -1) SG.constraints.assign(model, state, c, solution[c]);
      }
      return state;
    }

    it('charges the geometry, the enumeration and the search to one guard: a limit L gives the Finding ' +
      'from the whole count on, and a cut call has spent exactly L, with no Finding and capHit work',
      function () {
        var plan = sdcPlan(m9, BASE);
        var T = plan.T;
        expect(plan.geometry).toBe(81);
        expect(T).toBeGreaterThan(plan.geometry + plan.E);
        for (var limit = 0; limit <= T + 2; limit++) {
          var out = sdcRun(m9, BASE, { workLimit: limit });
          var label = 'limit ' + limit;
          expect(out.seen).toHaveLength(1);
          var record = out.seen[0];
          expect([label, record.id, record.limit]).toEqual([label, SDC_ID, limit]);
          if (limit >= T) {
            expect([label, record.capHit, record.work, out.finding === null])
              .toEqual([label, null, T, false]);
          } else {
            // a refused unit leaves used === limit; a partial scan of the targets is dropped whole
            expect([label, record.capHit, record.work, out.finding]).toEqual([label, 'work', limit, null]);
          }
          if (limit >= plan.geometry + plan.E) {
            expect([label, record.retained]).toEqual([label, plan.records.length]);
          }
          if (limit <= plan.geometry) expect([label, record.retained]).toEqual([label, 0]);
        }
      });

    it('ends in the geometry when no (line, box) pair has two open shared cells: no enumeration, retained ' +
      '0, and exactly the geometry is no cap while one unit less is', function () {
        var geometry = 81;
        [['a solved board', solvedState(m9, 1601)],
          ['two open cells that share no pair', almostSolved(m9, 1602, [0, 40])]].forEach(function (item) {
          var state = item[1];
          expect([item[0], sdcPlan(m9, state).enumerated]).toEqual([item[0], false]);
          expect(sdcRun(m9, state).seen).toEqual([{ id: SDC_ID, work: geometry, limit: 50000, capHit: null,
            retained: 0 }]);
          var exact = sdcRun(m9, state, { workLimit: geometry });
          expect([item[0], exact.finding, exact.seen]).toEqual([item[0], null, [{
            id: SDC_ID, work: geometry, limit: geometry, capHit: null, retained: 0
          }]]);
          var short = sdcRun(m9, state, { workLimit: geometry - 1 });
          expect([item[0], short.finding, short.seen]).toEqual([item[0], null, [{
            id: SDC_ID, work: geometry - 1, limit: geometry - 1, capHit: 'work', retained: 0
          }]]);
          expect(sdcRun(m9, state, { workLimit: 0 }).seen[0].capHit).toBe('work');
        });
        // the pair {R1C1, R1C2} of two open cells exists: the enumeration runs, and a normal negative has no
        // cap
        var pair = almostSolved(m9, 1603, [0, 1]);
        var plan = sdcPlan(m9, pair);
        expect(plan.enumerated).toBe(true);
        expect(plan.witnesses).toHaveLength(0);
        expect(sdcRun(m9, pair).seen).toEqual([{ id: SDC_ID, work: plan.T, limit: 50000, capHit: null,
          retained: plan.records.length }]);
      });

    it('is cut by the guard inside the geometry before any enumeration, and a cut at the first unit of the ' +
      'enumeration still retains nothing', function () {
        var plan = sdcPlan(m9, BASE);
        [0, 1, 40, 80].forEach(function (limit) {
          var out = sdcRun(m9, BASE, { workLimit: limit });
          expect(out.finding).toBeNull();
          expect(out.seen).toEqual([{ id: SDC_ID, work: limit, limit: limit, capHit: 'work', retained: 0 }]);
        });
        var edge = sdcRun(m9, BASE, { workLimit: plan.geometry });
        expect(edge.finding).toBeNull();
        expect(edge.seen).toEqual([{ id: SDC_ID, work: 81, limit: 81, capHit: 'work', retained: 0 }]);
        // after the enumeration the next refused unit is the first classified record, then the first pair
        // opened
        var afterEnumeration = sdcRun(m9, BASE, { workLimit: plan.geometry + plan.E });
        expect(afterEnumeration.seen).toEqual([{ id: SDC_ID, work: plan.geometry + plan.E,
          limit: plan.geometry + plan.E, capHit: 'work', retained: plan.records.length }]);
        var afterRecords = plan.geometry + plan.E + plan.records.length;
        var atPairs = sdcRun(m9, BASE, { workLimit: afterRecords });
        expect(atPairs.seen).toEqual([{ id: SDC_ID, work: afterRecords, limit: afterRecords, capHit: 'work',
          retained: plan.records.length }]);
      });

    it('charges a valid witness without a target, and every rejected test: the call that scans the 15 ' +
      'cells of the row and the box and finds nothing is complete at exactly its count and cut one unit ' +
      'short',
      function () {
        var plan = sdcPlan(m9, NO_TARGET);
        expect(plan.witnesses).toHaveLength(0);
        var out = sdcRun(m9, NO_TARGET);
        expect(out.finding).toBeNull();
        expect(out.seen).toEqual([{ id: SDC_ID, work: plan.T, limit: 50000, capHit: null,
          retained: plan.records.length }]);
        // the vector of the brief is still a valid witness of the position: only its targets are gone
        var short = sdcRun(m9, NO_TARGET, { workLimit: plan.T - 1 });
        expect([short.finding, short.seen[0].capHit, short.seen[0].work]).toEqual([null, 'work', plan.T - 1]);
        expect(sdcRun(m9, NO_TARGET, { workLimit: plan.T }).seen[0].capHit).toBeNull();
        // the 15 cells of the target scan are the last units: with 15 fewer the call is cut before them
        expect(sdcRun(m9, NO_TARGET, { workLimit: plan.T - 15 }).seen[0].capHit).toBe('work');
        // a valid witness with targets differs from it by the target scan only in what it returns
        var withTargets = sdcPlan(m9, BASE);
        expect(withTargets.first).not.toBeNull();
      });

    it('keeps a prefix of the records when the quota cuts and still searches its witnesses: the Finding of ' +
      'a prefix is a proof and the cap stays visible; a prefix without a witness claims no absence',
    function () {
        var plan = sdcPlan(m9, BASE);
        expect(plan.records.map(function (r) { return r.cells; }))
          .toEqual([[4], [11], [0, 1, 4], [0, 1, 11]]);
        // two records are R1C5 and R2C3, the A and the B of the vector: the witness is still found
        var two = sdcRun(m9, BASE, { limits: { records: 2 } });
        var plan2 = sdcPlan(m9, BASE, { records: 2 });
        expect(plan2.first).not.toBeNull();
        expect(two.finding).toEqual(sdcFindingOf(m9, plan2.first));
        expect(two.finding.cells).toEqual([0, 1, 4, 11]);
        expect(two.seen).toEqual([{ id: SDC_ID, work: plan2.T, limit: 50000, capHit: 'records',
          retained: 2 }]);
        // one record holds no B: no Finding, no claim, the cap stays records
        var one = sdcRun(m9, BASE, { limits: { records: 1 } });
        expect(sdcPlan(m9, BASE, { records: 1 }).witnesses).toHaveLength(0);
        expect(one.finding).toBeNull();
        expect([one.seen[0].capHit, one.seen[0].retained]).toEqual(['records', 1]);
        // exactly the quota is allowed: four records and no cap; one more record than allowed is a cap
        expect(sdcRun(m9, BASE, { limits: { records: 4 } }).seen[0].capHit).toBeNull();
        expect(sdcRun(m9, BASE, { limits: { records: 3 } }).seen[0].capHit).toBe('records');
      });

    it('reports the work cap before the record quota when both happened', function () {
      var plan2 = sdcPlan(m9, BASE, { records: 2 });
      var cutSearch = sdcRun(m9, BASE, { limits: { records: 2 }, workLimit: plan2.T - 1 });
      expect(cutSearch.finding).toBeNull();
      expect(cutSearch.seen).toEqual([{ id: SDC_ID, work: plan2.T - 1, limit: plan2.T - 1, capHit: 'work',
        retained: 2 }]);
      // a cut inside the enumeration after the quota was reached (the probe of the next size)
      var cutEnumeration = sdcRun(m9, BASE, {
        limits: { records: 2 }, workLimit: plan2.geometry + plan2.E - 1
      });
      expect(cutEnumeration.finding).toBeNull();
      expect(cutEnumeration.seen[0].capHit).toBe('work');
    });

    it('lets the default 50,000 cut a call and reports it, while a lifted limit finds nothing either',
      function () {
        var state = position(m16, {});
        for (var c = 0; c < m16.cellCount; c++) state.candidates[c] = 3;
        // every cell {1,2} of a 16 x 16 board: the enumeration alone costs 154,032 units
        var out = sdcRun(m16, state);
        expect(out.finding).toBeNull();
        expect(out.seen).toEqual([{ id: SDC_ID, work: 50000, limit: 50000, capHit: 'work', retained: 256 }]);
      });

    it('has the allowance of its own guard only: a lifted workLimit changes no finding of a complete call',
      function () {
        [BASE, NO_TARGET, position(m9, SDC_EXTRA)].forEach(function (state, i) {
          var plain = sdcRun(m9, state);
          var lifted = sdcRun(m9, state, { workLimit: 5000000 });
          expect([i, JSON.stringify(lifted.finding)]).toEqual([i, JSON.stringify(plain.finding)]);
          expect([i, lifted.seen[0].work, lifted.seen[0].capHit]).toEqual([i, plain.seen[0].work, null]);
          expect(lifted.seen[0].limit).toBe(5000000);
        });
      });
  });

  describe('sue-de-coq: the parent budget, errors and the observer record', function () {
    var BASE = position(m9, SDC_BASE);

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

    // the real classic 9 x 9 position, among those where every technique before sueDeCoq is exhausted, that
    // has no witness and the longest search: a complete negative of a few thousand units, so that the search
    // has checks of its own
    var negativeCache = null;
    function negative() {
      if (negativeCache !== null) return negativeCache;
      var ids = SG.techniques.list().filter(function (t) { return t.variantScope === null && t.order < 196; })
        .map(function (t) { return t.id; });
      var best = null;
      realPositions(ids).forEach(function (item) {
        var plan = sdcPlan(m9, item.state);
        if (plan.first === null && plan.enumerated && (best === null || plan.rest > best.rest)) {
          best = { state: item.state, rest: plan.rest };
        }
      });
      negativeCache = best.state;
      return negativeCache;
    }

    var samuraiBlank = SG.model.initState(samuraiModel);

    /**
     * Where the parent is asked: in order, the check at entry, one every 256 units of the geometry, one at
     * the end of the geometry, then (with a pair) the enumeration's own entry check, one every 256 units of
     * it, one after it, one every 256 units of the classification, one after it, one every 256 units of the
     * search and one before the record is published. `spents[k]` is what the guard has spent when check k + 1
     * is made and `kinds[k]` which one it is. NOT independent: it states the rule.
     */
    function layout(model, state, limits) {
      var plan = sdcPlan(model, state, limits);
      var spents = [0];
      var kinds = ['entry'];
      function cadence(units, from, kind) {
        for (var j = 1; j <= Math.floor((units - 1) / 256); j++) {
          spents.push(from + 256 * j);
          kinds.push(kind);
        }
      }
      function boundary(at, kind) {
        spents.push(at);
        kinds.push(kind);
      }
      cadence(plan.geometry, 0, 'geometry');
      boundary(plan.geometry, 'afterGeometry');
      var K = plan.enumerated ? plan.records.length : 0;
      var S = plan.enumerated ? plan.rest - K : 0;
      if (plan.enumerated) {
        boundary(plan.geometry, 'enumerateEntry');
        cadence(plan.E, plan.geometry, 'enumeration');
        boundary(plan.geometry + plan.E, 'afterEnumeration');
        cadence(K, plan.geometry + plan.E, 'classification');
        boundary(plan.geometry + plan.E + K, 'afterClassification');
        cadence(S, plan.geometry + plan.E + K, 'search');
        boundary(plan.T, 'final');
      }
      return { plan: plan, spents: spents, kinds: kinds, N: spents.length };
    }

    /** How many checks a call makes when the guard refuses the unit after the L-th (L < T). */
    function checksBefore(lay, L) {
      var G = lay.plan.geometry;
      var E = lay.plan.E;
      var K = lay.plan.records.length;
      var done = { entry: 0, afterGeometry: G, enumerateEntry: G, afterEnumeration: G + E,
        afterClassification: G + E + K, final: lay.plan.T };
      var n = 0;
      lay.kinds.forEach(function (kind, k) {
        if (done[kind] !== undefined) {
          if (L >= done[kind]) n++;
        } else if (lay.spents[k] < L) {
          n++;
        }
      });
      return n;
    }

    // built when a test asks for them: the real negative is chosen among the fixture positions
    function positions() {
      return [
        ['the brief\'s vector', m9, BASE],
        ['a real complete negative', m9, negative()],
        ['a blank Samurai board', samuraiModel, samuraiBlank],
        ['a solved board', m9, solvedState(m9, 1601)]
      ];
    }

    it('asks the parent budget at entry, every 256 units, at the end of the geometry, of the enumeration ' +
      'and of the classification, and before publishing', function () {
        positions().forEach(function (item) {
          var lay = layout(item[1], item[2]);
          var seen = [];
          var c = counting(item[1], function (r) { seen.push(r); });
          A.findSueDeCoq(item[1], item[2], c.ctx);
          expect([item[0], c.counter.calls]).toEqual([item[0], lay.N]);
          expect([item[0], seen.length, seen[0].work]).toEqual([item[0], 1, lay.plan.T]);
        });
        // the shapes the rule needs are all there: a geometry check of the 405 cells of a Samurai board, many
        // checks of the search of the real negative, and none of the enumeration for the solved board
        var samurai = layout(samuraiModel, samuraiBlank);
        expect(samurai.kinds.filter(function (k) { return k === 'geometry'; })).toHaveLength(1);
        var real = layout(m9, negative());
        expect(real.plan.witnesses).toHaveLength(0);
        expect(real.kinds.filter(function (k) { return k === 'search'; }).length).toBeGreaterThan(1);
        expect(layout(m9, solvedState(m9, 1601)).N).toBe(2);
      });

    it('asks nothing more of the parent once the guard refused a unit', function () {
      positions().forEach(function (item) {
        var lay = layout(item[1], item[2]);
        var T = lay.plan.T;
        var limits = [0, 1, 40, lay.plan.geometry - 1, lay.plan.geometry, lay.plan.geometry + 1,
          lay.plan.geometry + lay.plan.E - 1, lay.plan.geometry + lay.plan.E, Math.floor(T / 2), T - 2,
          T - 1, T];
        limits.forEach(function (limit) {
          if (limit < 0 || limit > T) return;
          var c = counting(item[1], null);
          A.findSueDeCoq(item[1], item[2], c.ctx, { workLimit: limit });
          var expected = limit >= T ? lay.N : checksBefore(lay, limit);
          expect([item[0], limit, c.counter.calls]).toEqual([item[0], limit, expected]);
        });
      });
    });

    it('answers a stop of the parent at any one of those checks with no Finding and no error, and the one ' +
      'record says what the guard had spent', function () {
        var all = positions();
        [all[0], all[1], all[2]].forEach(function (item) {
          var lay = layout(item[1], item[2]);
          var ks = [];
          for (var k = 1; k <= lay.N; k++) {
            var edge = k <= 4 || k >= lay.N - 3 || k % 5 === 0 || lay.kinds[k - 1] !== lay.kinds[k - 2];
            if (lay.N <= 14 || edge) ks.push(k);
          }
          ks.forEach(function (stop) {
            var seen = [];
            var c = counting(item[1], function (r) { seen.push(r); }, function (n) {
              if (n === stop) throw exceeded();
            });
            var kind = lay.kinds[stop - 1];
            var label = item[0] + ', stop at check ' + stop + ' of ' + lay.N + ' (' + kind + ')';
            var finding = A.findSueDeCoq(item[1], item[2], c.ctx);
            expect([label, finding]).toEqual([label, null]);
            expect([label, seen.length]).toEqual([label, 1]);
            expect([label, seen[0].work, seen[0].capHit, seen[0].limit])
              .toEqual([label, lay.spents[stop - 1], null, 50000]);
            // a stop in the enumeration is remembered: the call asks once more, it passes, and nothing is
            // searched
            var inEnumeration = kind === 'enumerateEntry' || kind === 'enumeration';
            expect([label, c.counter.calls]).toEqual([label, inEnumeration ? stop + 1 : stop]);
            var early = kind === 'entry' || kind === 'geometry' || kind === 'afterGeometry' ||
              kind === 'enumerateEntry';
            if (early) {
              expect([label, seen[0].retained]).toEqual([label, 0]);
            }
            if (!inEnumeration && stop >= lay.N - 2 && lay.plan.enumerated) {
              expect([label, seen[0].retained]).toEqual([label, lay.plan.records.length]);
            }
          });
        });
      });

    it('remembers a stop of the parent seen once: even when the budget answers again the prefix is not used',
      function () {
        var lay = layout(m9, BASE);
        var entry = lay.kinds.indexOf('enumerateEntry') + 1;
        var seen = [];
        var c = counting(m9, function (r) { seen.push(r); }, function (n) {
          if (n === entry) throw exceeded();
        });
        expect(A.findSueDeCoq(m9, BASE, c.ctx)).toBeNull();
        expect(c.counter.calls).toBe(entry + 1);
        expect(seen).toEqual([{ id: SDC_ID, work: 81, limit: 50000, capHit: null, retained: 0 }]);
        // the same call without the stop finds the witness
        expect(A.findSueDeCoq(m9, BASE, SG.techniques.createContext(m9, {}))).not.toBeNull();
      });

    it('does not erase a cap already reported: the record quota stays after a stop of the parent',
      function () {
        var lay = layout(m9, BASE, { records: 2 });
        ['afterClassification', 'final'].forEach(function (kind) {
          var stop = lay.kinds.indexOf(kind) + 1;
          var seen = [];
          var c = counting(m9, function (r) { seen.push(r); }, function (n) {
            if (n === stop) throw exceeded();
          });
          expect([kind, A.findSueDeCoq(m9, BASE, c.ctx, { limits: { records: 2 } })]).toEqual([kind, null]);
          expect([kind, seen.length]).toEqual([kind, 1]);
          expect([kind, seen[0].capHit, seen[0].retained]).toEqual([kind, 'records', 2]);
        });
      });

    it('answers a real spent budget as no Finding, and the budget stays spent for the caller', function () {
      var parent = SG.budget.create({ nodes: 3 });
      var seen = [];
      var ctx = SG.techniques.createContext(m9, {
        budget: parent, onPatternWork: function (r) { seen.push(r); }
      });
      expect(A.findSueDeCoq(m9, negative(), ctx)).toBeNull();
      expect(seen).toHaveLength(1);
      expect(seen[0].capHit).toBeNull();
      expect(caught(function () { parent.check(); }).code).toBe('budget.exceeded');
      var gone = SG.budget.create({ nodes: 0 });
      var first = [];
      expect(A.findSueDeCoq(m9, BASE, SG.techniques.createContext(m9, {
        budget: gone, onPatternWork: function (r) { first.push(r); }
      }))).toBeNull();
      expect(first).toEqual([{ id: SDC_ID, work: 0, limit: 50000, capHit: null, retained: 0 }]);
    });

    it('lets cancellation and every other error through from every check, with nothing published',
      function () {
      var kinds = [
        ['a cancellation of the parent',
          new SG.errors.GenerationError('budget.cancelled', { reason: 'cancelled' })],
        ['an error that is not a budget error', new Error('boom')],
        ['a plain sentinel object', Object.freeze({ sentinel: 'parent cancellation' })],
        ['an object with a code that is not a budget code', { code: 'other.code' }],
        ['a thrown null', null],
        ['a thrown undefined', undefined],
        ['a thrown zero', 0]
      ];
      var all = positions();
      [all[0], all[1], all[3]].forEach(function (item) {
        var lay = layout(item[1], item[2]);
        var stops = [1, 2, lay.N - 1, lay.N];
        lay.kinds.forEach(function (kind, k) {
          if (kind !== lay.kinds[k - 1]) stops.push(k + 1);
        });
        stops.forEach(function (stop) {
          kinds.forEach(function (kind) {
            var seen = [];
            var c = counting(item[1], function (r) { seen.push(r); }, function (n) {
              if (n === stop) throw kind[1];
            });
            var threw = false;
            var thrown = null;
            var returned = null;
            try {
              returned = A.findSueDeCoq(item[1], item[2], c.ctx);
            } catch (e) {
              threw = true;
              thrown = e;
            }
            var label = item[0] + ', ' + kind[0] + ', check ' + stop;
            expect([label, threw, thrown === kind[1], returned, seen.length])
              .toEqual([label, true, true, null, 0]);
            expect([label, c.counter.calls]).toEqual([label, stop]);
          });
        });
      });
    });

    it('drops a Finding when the budget fails after the search: the last check is before publishing',
      function () {
      var lay = layout(m9, BASE);
      expect(lay.plan.first).not.toBeNull();
      var seen = [];
      var c = counting(m9, function (r) { seen.push(r); }, function (n) {
        if (n === lay.N) throw exceeded();
      });
      expect(A.findSueDeCoq(m9, BASE, c.ctx)).toBeNull();
      expect(seen).toEqual([{ id: SDC_ID, work: lay.plan.T, limit: 50000, capHit: null,
        retained: lay.plan.records.length }]);
      // the same position with a final check that passes returns the Finding
      expect(A.findSueDeCoq(m9, BASE, counting(m9, null).ctx)).not.toBeNull();
    });

    it('publishes one record per call that returns, after the search and outside the error handling: an ' +
      'observer that throws is not swallowed, whatever it throws', function () {
        var calls = 0;
        var boom = new Error('observer');
        var err = caught(function () {
          A.findSueDeCoq(m9, BASE, SG.techniques.createContext(m9, {
            onPatternWork: function () { calls++; throw boom; }
          }));
        });
        expect([calls, err === boom]).toEqual([1, true]);
        // an observer that throws a budget error is not taken for a stop of the parent: no retry, no second
        // record
        var stop = exceeded();
        var published = 0;
        var other = caught(function () {
          A.findSueDeCoq(m9, BASE, SG.techniques.createContext(m9, {
            onPatternWork: function () { published++; throw stop; }
          }));
        });
        expect([published, other === stop]).toEqual([1, true]);
        // the same on a cut call and on a call that the parent stopped
        var cutThrown = caught(function () {
          A.findSueDeCoq(m9, BASE, SG.techniques.createContext(m9, {
            onPatternWork: function () { throw stop; }
          }), { workLimit: 5 });
        });
        expect(cutThrown === stop).toBe(true);
        // a cut call and a stopped call publish their record as well
        var records = [];
        var observer = function (r) { records.push(r); };
        A.findSueDeCoq(m9, BASE, SG.techniques.createContext(m9, { onPatternWork: observer }),
          { workLimit: 5 });
        A.findSueDeCoq(m9, BASE, SG.techniques.createContext(m9, {
          budget: SG.budget.create({ nodes: 0 }), onPatternWork: observer
        }));
        expect(records.map(function (r) { return [r.capHit, r.work]; })).toEqual([['work', 5], [null, 0]]);
      });

    it('gives exactly id, work, limit, capHit and retained, a new object for each call, and reads a ' +
      'context without options or with a hostile observer the same way', function () {
        var a = sdcRun(m9, BASE).seen[0];
        var b = sdcRun(m9, BASE).seen[0];
        expect(Object.keys(a)).toEqual(['id', 'work', 'limit', 'capHit', 'retained']);
        expect(a).toEqual(b);
        expect(a).not.toBe(b);
        var base = SG.techniques.createContext(m9, {});
        var calls = 0;
        [undefined, null, { onPatternWork: 'no' }, { onPatternWork: 5 }].forEach(function (options) {
          var ctx = Object.assign({}, base, { options: options });
          expect(A.findSueDeCoq(m9, BASE, ctx)).toEqual(A.findSueDeCoq(m9, BASE, base));
        });
        var counting2 = Object.assign({}, base, { options: { onPatternWork: function () { calls++; } } });
        A.findSueDeCoq(m9, BASE, counting2);
        expect(calls).toBe(1);
      });
  });

  describe('sue-de-coq: ownership, immutability and no cache', function () {
    it('returns arrays of its own: writing to the Finding changes nothing in the next call', function () {
      var state = position(m9, SDC_EXTRA);
      var ctx = SG.techniques.createContext(m9, {});
      var first = A.findSueDeCoq(m9, state, ctx);
      var snapshot = JSON.stringify(first);
      first.cells.push(999);
      first.cells.reverse();
      first.eliminations.forEach(function (e) { e.push(1); e[0] = -1; });
      first.eliminations.length = 0;
      first.placements.push([1, 1]);
      first.i18nArgs.digits.push(9);
      first.i18nArgs.partDigits.length = 0;
      first.i18nArgs.forced.push(8);
      first.i18nArgs.line = 'X';
      var second = A.findSueDeCoq(m9, state, ctx);
      expect(JSON.stringify(second)).toBe(snapshot);
      var arrays = [second.cells, second.placements, second.eliminations, second.i18nArgs.digits,
        second.i18nArgs.partDigits, second.i18nArgs.forced];
      second.eliminations.forEach(function (e) { arrays.push(e); });
      arrays.forEach(function (a, i) {
        arrays.forEach(function (b, j) { if (i !== j) expect(a === b).toBe(false); });
      });
      expect(JSON.parse(JSON.stringify(second))).toEqual(second);
      // the records the enumerator returns are the caller's too: nothing of them is shared with the Finding
      var records = run(m9, state).result.records;
      expect(records.every(function (r) { return r.digits !== second.i18nArgs.digits; })).toBe(true);
    });

    it('reads the model, the state and the context only, with the debug checks on', function () {
      var before = SG.DEBUG;
      SG.setDebug(true);
      try {
        [m9, m6, cageModel, hyperModel, m12].forEach(function (model, k) {
          seededStates(model, randomSolution, 4040 + k, 4, [0.05, 0.4]).forEach(function (state, i) {
            var snapshot = snapshotOf(model, state);
            var ctx = Object.freeze(Object.assign({}, SG.techniques.createContext(model, {})));
            var first = A.findSueDeCoq(model, state, ctx);
            var second = A.findSueDeCoq(model, state, ctx);
            expect([k, i, second]).toEqual([k, i, first]);
            expect([k, i, snapshotOf(model, state)]).toEqual([k, i, snapshot]);
          });
        });
      } finally {
        SG.setDebug(before);
      }
    });

    it('keeps no candidate list and no geometry: the same state object, changed between calls, is read ' +
      'again every time', function () {
        var model = m9;
        var state = seededStates(model, randomSolution, 4001, 1, [0.05, 0.4])[0];
        var rng = SG.testkit.rng.create(79);
        var changes = 0;
        var fired = 0;
        for (var round = 0; round < 60; round++) {
          var cell = rng.int(model.cellCount);
          if (state.value[cell] === 0) {
            var digit = 1 + rng.int(model.digits);
            if (rng.next() < 0.7) state.candidates[cell] &= ~(1 << (digit - 1));
            else state.candidates[cell] |= 1 << (digit - 1);
            changes++;
          }
          var plan = sdcPlan(model, state);
          var got = A.findSueDeCoq(model, state, SG.techniques.createContext(model, {}));
          same('round ' + round, got, plan.first !== null ? sdcFindingOf(model, plan.first) : null);
          if (got !== null) fired++;
        }
        expect(changes).toBeGreaterThan(30);
        expect(fired).toBeGreaterThan(3);
      });

    it('does not depend on the order of the cells inside a unit: the same Finding and record when every ' +
      'unit lists its cells from the highest', function () {
        var descending = buildModel('als-order', 9, 3, 3, [], { descendingCells: true });
        var fired = 0;
        seededStates(m9, randomSolution, 4001, 30, [0.05, 0.4]).forEach(function (state, i) {
          var plain = sdcRun(m9, state);
          var other = sdcRun(descending, state);
          expect([i, other.finding]).toEqual([i, plain.finding]);
          expect([i, other.seen]).toEqual([i, plain.seen]);
          if (plain.finding !== null) fired++;
        });
        expect(fired).toBeGreaterThan(3);
      });

    it('shares nothing with the enumerator or the other finders: calls interleaved give the same answers, ' +
      'and ALS-XZ is unchanged by them', function () {
        var items = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(1971), 6);
        items.forEach(function (item, n) {
          var ctx = SG.techniques.createContext(m9, {});
          var plain = JSON.stringify(A.findSueDeCoq(m9, item.state, ctx));
          var xz = JSON.stringify(A.findXz(m9, item.state, ctx));
          A.enumerate(m9, item.state, ctx, A.createWork());
          SG.techniques.get('xyChain').find(m9, item.state, ctx);
          SG.techniques.get('forcingChain').find(m9, item.state, ctx);
          expect([n, JSON.stringify(A.findSueDeCoq(m9, item.state, ctx))]).toEqual([n, plain]);
          var registered = JSON.stringify(SG.techniques.get(SDC_ID).find(m9, item.state, ctx));
          expect([n, registered]).toEqual([n, plain]);
          expect([n, JSON.stringify(A.findXz(m9, item.state, ctx))]).toEqual([n, xz]);
          var xzRegistered = JSON.stringify(SG.techniques.get('alsXz').find(m9, item.state, ctx));
          expect([n, xzRegistered]).toEqual([n, xz]);
        });
      });
  });
})();
