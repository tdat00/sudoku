// Constraint propagation (task T-1.3): peer elimination, naked and hidden singles, contradiction detection,
// soundness against known solutions, and the extension hook that cage and inequality rules will plug into.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var F = SG.fixtures.classic;
  var C = SG.constraints;

  var model9 = SG.classicModel.build(9);
  var model4 = SG.classicModel.build(4);

  function bit(v) { return 1 << (v - 1); }

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown.code).toBe(code);
  }

  function randomSolution(seed) {
    return SG.testkit.randomSolution(model9, SG.testkit.rng.create(seed));
  }

  /** A fresh state with the given clues applied through assign (peer elimination only). */
  function stateWith(model, givens) {
    var s = SG.model.initState(model);
    for (var c = 0; c < givens.length; c++) {
      if (givens[c] !== 0) expect(C.assign(model, s, c, givens[c])).toBe(true);
    }
    return s;
  }

  describe('constraints: P1 peer elimination (assign)', function () {
    it('fixes the cell and removes the value from every peer, and only from the peers', function () {
      var s = SG.model.initState(model9);
      expect(C.assign(model9, s, 40, 5)).toBe(true);
      expect(s.value[40]).toBe(5);
      expect(s.candidates[40]).toBe(bit(5));
      expect(s.unsolvedCount).toBe(80);
      var peers = Array.from(model9.peers[40]);
      for (var c = 0; c < 81; c++) {
        if (c === 40) continue;
        var expected = peers.indexOf(c) !== -1 ? 511 & ~bit(5) : 511;
        expect(s.candidates[c]).toBe(expected);
      }
    });

    it('assign followed by propagate keeps the value out of all peers', function () {
      var s = SG.model.initState(model9);
      C.assign(model9, s, 0, 9);
      expect(C.propagate(model9, s)).toBe(true);
      Array.from(model9.peers[0]).forEach(function (p) {
        expect(s.candidates[p] & bit(9)).toBe(0);
      });
    });

    it('is idempotent for the same value and refuses a different one', function () {
      var s = SG.model.initState(model9);
      expect(C.assign(model9, s, 7, 3)).toBe(true);
      expect(C.assign(model9, s, 7, 3)).toBe(true);
      expect(s.unsolvedCount).toBe(80);
      expect(C.assign(model9, s, 7, 4)).toBe(false);
    });

    it('returns false when the value is not a candidate of the cell', function () {
      var s = SG.model.initState(model9);
      C.assign(model9, s, 0, 1);
      expect(C.assign(model9, s, 1, 1)).toBe(false);
      expect(C.assign(model9, s, 9, 1)).toBe(false);
      expect(C.assign(model9, s, 10, 1)).toBe(false);
    });

    it('returns false when a peer would be left without candidates', function () {
      var s = SG.model.initState(model4);
      s.candidates[1] = bit(2);
      expect(C.assign(model4, s, 0, 2)).toBe(false);
    });
  });

  describe('constraints: eliminate', function () {
    it('clears one candidate and nothing else', function () {
      var s = SG.model.initState(model9);
      expect(C.eliminate(model9, s, 12, 4)).toBe(true);
      expect(s.candidates[12]).toBe(511 & ~bit(4));
      expect(s.candidates[13]).toBe(511);
      expect(s.unsolvedCount).toBe(81);
    });

    it('is a no-op for a value that is already gone', function () {
      var s = SG.model.initState(model9);
      C.eliminate(model9, s, 12, 4);
      expect(C.eliminate(model9, s, 12, 4)).toBe(true);
      expect(s.candidates[12]).toBe(511 & ~bit(4));
    });

    it('returns false when it would remove the last candidate, or the value of a fixed cell', function () {
      var s = SG.model.initState(model4);
      s.candidates[3] = bit(2);
      expect(C.eliminate(model4, s, 3, 2)).toBe(false);
      var t = SG.model.initState(model4);
      C.assign(model4, t, 0, 1);
      expect(C.eliminate(model4, t, 0, 1)).toBe(false);
    });
  });

  describe('constraints: P2 naked single', function () {
    it('fixes a cell with one candidate left and clears the value from its peers', function () {
      var s = SG.model.initState(model9);
      for (var v = 1; v <= 9; v++) if (v !== 6) C.eliminate(model9, s, 20, v);
      expect(s.value[20]).toBe(0);
      expect(C.propagate(model9, s)).toBe(true);
      expect(s.value[20]).toBe(6);
      expect(s.unsolvedCount).toBe(80);
      Array.from(model9.peers[20]).forEach(function (p) { expect(s.candidates[p] & bit(6)).toBe(0); });
    });

    it('cascades through several singles', function () {
      // Row 0 holds 1..8 in cells 0..7: cell 8 is a naked single (9), and then 9 leaves its column and box.
      var givens = new Int32Array(81);
      for (var c = 0; c < 8; c++) givens[c] = c + 1;
      var s = stateWith(model9, givens);
      expect(C.propagate(model9, s)).toBe(true);
      expect(s.value[8]).toBe(9);
      [17, 26, 35, 44, 53, 62, 71, 80].forEach(function (p) { expect(s.candidates[p] & bit(9)).toBe(0); });
    });
  });

  describe('constraints: P3 hidden single in a row, a column and a box', function () {
    function unitIndex(kind, n) {
      for (var u = 0; u < model9.units.length; u++) {
        if (model9.unitMeta[u].kind === kind && model9.unitMeta[u].label.slice(1) === String(n)) return u;
      }
      return -1;
    }

    ['row', 'col', 'box'].forEach(function (kind) {
      it('places a value that fits only one cell of a ' + kind, function () {
        var u = unitIndex(kind, 5);
        var cells = Array.from(model9.units[u]);
        var target = cells[4];
        var s = SG.model.initState(model9);
        cells.forEach(function (c) { if (c !== target) C.eliminate(model9, s, c, 7); });
        expect(s.candidates[target]).toBe(511);
        expect(C.propagate(model9, s)).toBe(true);
        expect(s.value[target]).toBe(7);
        expect(s.candidates[target]).toBe(bit(7));
        // The placed value now also leaves the other units of the target cell.
        Array.from(model9.peers[target]).forEach(function (p) { expect(s.candidates[p] & bit(7)).toBe(0); });
      });
    });

    it('finds hidden singles that only appear after a naked single was applied', function () {
      var s = SG.model.initState(model9);
      var row = Array.from(model9.units[0]);
      // 3 can only go in cell 5 or cell 6 of row 0; a naked single at cell 5 then pushes it to cell 6.
      row.forEach(function (c) { if (c !== 5 && c !== 6) C.eliminate(model9, s, c, 3); });
      for (var v = 1; v <= 9; v++) if (v !== 3) C.eliminate(model9, s, 5, v);
      expect(C.propagate(model9, s)).toBe(true);
      expect(s.value[5]).toBe(3);
      expect(s.candidates[6] & bit(3)).toBe(0);
    });
  });

  describe('constraints: P6 contradiction detection', function () {
    it('returns false, and does not throw, for a cell without candidates', function () {
      var s = SG.model.initState(model9);
      s.candidates[30] = 0;
      expect(C.propagate(model9, s)).toBe(false);
    });

    it('returns false when two peers are forced to the same value', function () {
      var s = SG.model.initState(model4);
      for (var v = 1; v <= 4; v++) {
        if (v !== 1) {
          C.eliminate(model4, s, 0, v);
          C.eliminate(model4, s, 1, v);
        }
      }
      expect(C.propagate(model4, s)).toBe(false);
    });

    it('returns false when a unit has no room left for some value', function () {
      var s = SG.model.initState(model9);
      Array.from(model9.units[0]).forEach(function (c) { C.eliminate(model9, s, c, 5); });
      expect(C.propagate(model9, s)).toBe(false);
    });

    it('returns false when one cell is the only place for two different values of a unit', function () {
      var s = SG.model.initState(model9);
      var row = Array.from(model9.units[0]);
      row.forEach(function (c) {
        if (c !== 0) {
          C.eliminate(model9, s, c, 1);
          C.eliminate(model9, s, c, 2);
        }
      });
      expect(C.propagate(model9, s)).toBe(false);
    });

    it('detects the fixture puzzles that have no solution', function () {
      var results = F.contradictory.map(function (entry) {
        var givens = F.parse(entry.puzzle);
        var s = SG.model.initState(model9);
        var ok = true;
        for (var c = 0; c < 81 && ok; c++) if (givens[c] !== 0) ok = C.assign(model9, s, c, givens[c]);
        return ok && C.propagate(model9, s);
      });
      // The duplicate and the cell without candidates are caught by propagation alone.
      expect(results[0]).toBe(false);
      expect(results[1]).toBe(false);
    });

    it('leaves the engine usable after a contradiction', function () {
      var bad = SG.model.initState(model9);
      bad.candidates[3] = 0;
      expect(C.propagate(model9, bad)).toBe(false);
      var good = SG.model.initState(model9);
      C.assign(model9, good, 0, 1);
      expect(C.propagate(model9, good)).toBe(true);
      expect(good.value[0]).toBe(1);
      var again = SG.model.initState(model9);
      expect(C.propagate(model9, again)).toBe(true);
      expect(Array.from(again.candidates)).toEqual(new Array(81).fill(511));
    });
  });

  describe('constraints: fixpoint and full solving', function () {
    it('solves an easy puzzle by propagation alone', function () {
      var entry = F.unique[3];
      var s = stateWith(model9, F.parse(entry.puzzle));
      expect(C.propagate(model9, s)).toBe(true);
      expect(s.unsolvedCount).toBe(0);
      expect(Array.from(s.value)).toEqual(Array.from(F.parse(entry.solution)));
    });

    it('is idempotent: a second propagate changes nothing', function () {
      F.unique.forEach(function (entry) {
        var s = stateWith(model9, F.parse(entry.puzzle));
        expect(C.propagate(model9, s)).toBe(true);
        var snapshot = SG.model.cloneState(s);
        expect(C.propagate(model9, s)).toBe(true);
        expect(s.candidates).toEqual(snapshot.candidates);
        expect(s.value).toEqual(snapshot.value);
        expect(s.unsolvedCount).toBe(snapshot.unsolvedCount);
      });
    });

    it('keeps unsolvedCount equal to the number of cells without a value', function () {
      F.unique.forEach(function (entry) {
        var s = stateWith(model9, F.parse(entry.puzzle));
        C.propagate(model9, s);
        var open = 0;
        for (var c = 0; c < 81; c++) if (s.value[c] === 0) open++;
        expect(s.unsolvedCount).toBe(open);
        // Every open cell keeps at least two candidates at a fixpoint.
        for (var k = 0; k < 81; k++) {
          if (s.value[k] === 0) expect(SG.bits.popcount(s.candidates[k])).toBeGreaterThan(1);
        }
      });
    });
  });

  describe('constraints: soundness', function () {
    it('never removes a value of the true solution (100 random grids, random subsets of clues)', function () {
      for (var seed = 1; seed <= 100; seed++) {
        var solution = randomSolution(seed);
        var rng = SG.testkit.rng.create(seed * 7919);
        var order = [];
        for (var i = 0; i < 81; i++) order.push(i);
        rng.shuffle(order);
        var clues = 20 + rng.int(31);
        var s = SG.model.initState(model9);
        for (var k = 0; k < clues; k++) expect(C.assign(model9, s, order[k], solution[order[k]])).toBe(true);
        expect(C.propagate(model9, s)).toBe(true);
        for (var c = 0; c < 81; c++) {
          expect(s.candidates[c] & bit(solution[c])).not.toBe(0);
          if (s.value[c] !== 0) expect(s.value[c]).toBe(solution[c]);
        }
      }
    });

    it('stays sound when random wrong values are eliminated first (100 random grids)', function () {
      for (var seed = 1; seed <= 100; seed++) {
        var solution = randomSolution(1000 + seed);
        var rng = SG.testkit.rng.create(seed);
        var s = SG.model.initState(model9);
        for (var k = 0; k < 150; k++) {
          var cell = rng.int(81);
          var value = 1 + rng.int(9);
          if (value !== solution[cell]) C.eliminate(model9, s, cell, value);
        }
        expect(C.propagate(model9, s)).toBe(true);
        for (var c = 0; c < 81; c++) expect(s.candidates[c] & bit(solution[c])).not.toBe(0);
      }
    });
  });

  describe('constraints: incremental entry points', function () {
    it('place gives the same state as assign followed by a full propagate', function () {
      for (var seed = 1; seed <= 40; seed++) {
        var solution = randomSolution(2000 + seed);
        var rng = SG.testkit.rng.create(seed);
        var order = [];
        for (var i = 0; i < 81; i++) order.push(i);
        rng.shuffle(order);
        var base = SG.model.initState(model9);
        for (var k = 0; k < 22; k++) C.assign(model9, base, order[k], solution[order[k]]);
        expect(C.propagate(model9, base)).toBe(true);
        var cell = -1;
        for (var c = 0; c < 81 && cell < 0; c++) if (base.value[c] === 0) cell = c;
        if (cell < 0) continue;

        var a = SG.model.cloneState(base);
        var b = SG.model.cloneState(base);
        var ok1 = C.place(model9, a, cell, solution[cell]);
        var ok2 = C.assign(model9, b, cell, solution[cell]) && C.propagate(model9, b);
        expect(ok1).toBe(ok2);
        expect(a.candidates).toEqual(b.candidates);
        expect(a.value).toEqual(b.value);
        expect(a.unsolvedCount).toBe(b.unsolvedCount);
      }
    });

    it('place refuses a value that is not a candidate', function () {
      var s = SG.model.initState(model9);
      C.place(model9, s, 0, 4);
      expect(C.place(model9, s, 1, 4)).toBe(false);
      expect(C.place(model9, s, 0, 5)).toBe(false);
    });

    it('propagateSwept equals propagate on a peer-consistent state', function () {
      F.unique.forEach(function (entry) {
        var a = stateWith(model9, F.parse(entry.puzzle));
        var b = SG.model.cloneState(a);
        expect(C.propagateSwept(model9, a)).toBe(true);
        expect(C.propagate(model9, b)).toBe(true);
        expect(a.candidates).toEqual(b.candidates);
        expect(a.value).toEqual(b.value);
        expect(a.unsolvedCount).toBe(b.unsolvedCount);
      });
    });

    it('propagateSwept reports a cell without candidates and leaves the queues clean', function () {
      var s = SG.model.initState(model9);
      s.candidates[12] = 0;
      s.candidates[3] = bit(2);
      expect(C.propagateSwept(model9, s)).toBe(false);
      var good = SG.model.initState(model9);
      expect(C.propagateSwept(model9, good)).toBe(true);
    });

    it('propagateSwept with a watched cell may stop as soon as that cell is decided', function () {
      var entry = F.unique[3];
      var s = stateWith(model9, F.parse(entry.puzzle));
      var solution = F.parse(entry.solution);
      var watch = -1;
      for (var c = 0; c < 81 && watch < 0; c++) if (s.value[c] === 0) watch = c;
      expect(C.propagateSwept(model9, s, null, watch)).toBe(true);
      expect(s.candidates[watch]).toBe(bit(solution[watch]));
      // The queues were cleaned: a normal propagate afterwards completes the solution.
      expect(C.propagate(model9, s)).toBe(true);
      expect(Array.from(s.value)).toEqual(Array.from(solution));
    });
  });

  describe('constraints: extension hook (P4 / P5 plug-in point)', function () {
    var registered = [];
    var foundExtensions = [];

    function register(ext) {
      C.registerExtension(ext);
      registered.push(ext.id);
    }

    // Earlier suites may have enabled the lazy cage / inequality extensions; run on a pristine registry and
    // put back what was found, so that suite order never matters.
    beforeEach(function () {
      foundExtensions = C.extensionSnapshot();
      C.extensionRestore([]);
    });

    afterEach(function () {
      registered.forEach(function (id) { C.unregisterExtension(id); });
      registered = [];
      C.extensionRestore(foundExtensions);
    });

    /** value[a] < value[b] for every inequality of the model, as bound propagation (the P5 idea). */
    var lessThan = {
      id: 'mock-less-than',
      prepare: function (model) { return model.inequalities.length > 0 ? model.inequalities : null; },
      propagate: function (model, state, list, ctx) {
        var cand = state.candidates;
        for (var i = 0; i < list.length; i++) {
          var a = list[i].a;
          var b = list[i].b;
          var maxB = 31 - Math.clz32(cand[b]) + 1;
          var minA = SG.bits.lowestBitIndex(cand[a]) + 1;
          // a < max(b): values 1 .. maxB - 1; b > min(a): values minA + 1 .. D.
          if (!ctx.restrict(a, (1 << (maxB - 1)) - 1)) return false;
          if (!ctx.restrict(b, ~((1 << minA) - 1))) return false;
        }
        return true;
      }
    };

    function model4WithInequality(a, b) {
      var spec = {
        variantId: 'classic4',
        digits: 4,
        units: model4.units.map(function (u) { return Array.from(u); }),
        unitMeta: model4.unitMeta.slice(),
        inequalities: [{ a: a, b: b }],
        layout: {
          rows: 4,
          cols: 4,
          cellRow: Array.from(model4.layout.cellRow),
          cellCol: Array.from(model4.layout.cellCol),
          cellRegion: Array.from(model4.layout.cellRegion)
        }
      };
      return SG.model.create(spec);
    }

    it('starts with no extensions registered', function () {
      expect(C.listExtensions()).toEqual([]);
    });

    it('lets a mock rule prune candidates that the built-in rules would not touch', function () {
      var model = model4WithInequality(0, 1);
      var s = SG.model.initState(model);
      expect(C.propagate(model, s)).toBe(true);
      expect(s.candidates[0]).toBe(15);
      register(lessThan);
      s = SG.model.initState(model);
      expect(C.propagate(model, s)).toBe(true);
      expect(s.candidates[0]).toBe(bit(1) | bit(2) | bit(3));
      expect(s.candidates[1]).toBe(bit(2) | bit(3) | bit(4));
    });

    it('re-runs the built-in rules after an extension change (rounds repeat until stable)', function () {
      register(lessThan);
      var model = model4WithInequality(0, 1);
      var s = SG.model.initState(model);
      expect(C.place(model, s, 0, 3)).toBe(true);
      // a = 3 forces b = 4 through the extension; the built-in rules then clear 4 from b's peers.
      expect(s.value[1]).toBe(4);
      expect(s.candidates[2] & bit(4)).toBe(0);
      expect(s.candidates[2] & bit(3)).toBe(0);
    });

    it('turns a contradiction found by an extension into a false result', function () {
      register(lessThan);
      var model = model4WithInequality(0, 1);
      var s = SG.model.initState(model);
      expect(C.place(model, s, 0, 4)).toBe(false);
      var t = SG.model.initState(model);
      expect(C.place(model, t, 1, 1)).toBe(false);
    });

    it('is honoured by the solver: it halves the number of solutions of the empty 4x4 grid', function () {
      var model = model4WithInequality(0, 1);
      var empty = new Int32Array(16);
      expect(SG.dfs.countSolutions(model, empty, 1000)).toBe(288);
      register(lessThan);
      expect(SG.dfs.countSolutions(model, empty, 1000)).toBe(144);
      var rng = SG.testkit.rng.create(11);
      for (var i = 0; i < 20; i++) {
        var solution = SG.dfs.solve(model, empty, rng);
        expect(solution[0]).toBeLessThan(solution[1]);
        expect(SG.model.isSolution(model, solution)).toBe(true);
      }
    });

    it('skips an extension whose prepare returns null for the model', function () {
      var calls = 0;
      register({
        id: 'mock-counter',
        prepare: function () { return null; },
        propagate: function () { calls++; return true; }
      });
      var s = SG.model.initState(model9);
      C.propagate(model9, s);
      expect(calls).toBe(0);
      expect(SG.dfs.countSolutions(model4, new Int32Array(16), 1000)).toBe(288);
    });

    it('gives the extension the changed cells: all on a full propagate, few after a place', function () {
      var seen = [];
      register({
        id: 'mock-spy',
        propagate: function (model, state, data, ctx) {
          seen.push(Array.from(ctx.changed.subarray(0, ctx.changedCount)));
          return true;
        }
      });
      var s = SG.model.initState(model9);
      C.propagate(model9, s);
      expect(seen[0]).toHaveLength(81);
      expect(new Set(seen[0]).size).toBe(81);
      seen.length = 0;
      C.place(model9, s, 0, 1);
      expect(seen.length).toBeGreaterThan(0);
      expect(seen[0]).toContain(0);
      expect(seen[0].length).toBeLessThan(81);
    });

    it('picks up an extension registered after the model was already used, and drops it again', function () {
      var model = model4WithInequality(0, 1);
      var s = SG.model.initState(model);
      C.propagate(model, s);
      expect(s.candidates[0]).toBe(15);
      register(lessThan);
      s = SG.model.initState(model);
      C.propagate(model, s);
      expect(s.candidates[0]).toBe(7);
      expect(C.unregisterExtension('mock-less-than')).toBe(true);
      expect(C.unregisterExtension('mock-less-than')).toBe(false);
      s = SG.model.initState(model);
      C.propagate(model, s);
      expect(s.candidates[0]).toBe(15);
    });

    it('calls prepare once per model and caches the result', function () {
      var prepares = 0;
      register({
        id: 'mock-prepare',
        prepare: function () { prepares++; return { x: 1 }; },
        propagate: function () { return true; }
      });
      var model = SG.classicModel.build(4);
      for (var i = 0; i < 5; i++) C.propagate(model, SG.model.initState(model));
      expect(prepares).toBe(1);
    });

    it('rejects invalid and duplicate registrations', function () {
      expectCode(function () { C.registerExtension(null); }, 'constraints.invalidExtension');
      expectCode(function () { C.registerExtension({ id: 'x' }); }, 'constraints.invalidExtension');
      expectCode(function () {
        C.registerExtension({ propagate: function () {} });
      }, 'constraints.invalidExtension');
      expectCode(function () {
        C.registerExtension({ id: 'x', prepare: 5, propagate: function () {} });
      }, 'constraints.invalidExtension');
      register({ id: 'mock-dup', propagate: function () { return true; } });
      expectCode(function () {
        C.registerExtension({ id: 'mock-dup', propagate: function () { return true; } });
      }, 'constraints.duplicateExtension');
      expect(C.listExtensions()).toEqual(['mock-dup']);
    });

    it('keeps the engine usable after an extension fails or throws', function () {
      var mode = 'fail';
      register({
        id: 'mock-flaky',
        propagate: function () {
          if (mode === 'throw') throw new Error('extension bug');
          return mode !== 'fail';
        }
      });
      expect(C.propagate(model9, SG.model.initState(model9))).toBe(false);
      mode = 'throw';
      expect(function () { C.propagate(model9, SG.model.initState(model9)); }).toThrow('extension bug');
      mode = 'ok';
      var s = SG.model.initState(model9);
      expect(C.propagate(model9, s)).toBe(true);
      C.place(model9, s, 0, 1);
      expect(s.value[0]).toBe(1);
    });

    it('checks the budget once per extension round, and a cancelled budget throws', function () {
      register({ id: 'mock-budget', propagate: function () { return true; } });
      var budget = SG.budget.create({});
      C.propagate(model9, SG.model.initState(model9), budget);
      expect(budget.nodes).toBeGreaterThan(0);
      budget.cancel();
      expectCode(function () {
        C.propagate(model9, SG.model.initState(model9), budget);
      }, 'budget.cancelled');
      expect(C.propagate(model9, SG.model.initState(model9))).toBe(true);
    });

    it('falls back to a full scan in propagateSwept while extensions are active', function () {
      var rounds = [];
      register({
        id: 'mock-full',
        propagate: function (model, state, data, ctx) { rounds.push(ctx.changedCount); return true; }
      });
      C.propagateSwept(model9, stateWith(model9, F.parse(F.unique[0].puzzle)));
      expect(rounds[0]).toBe(81);
    });
  });
})();
