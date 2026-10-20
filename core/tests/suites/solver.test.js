// DFS solver (task T-1.4): solve, countSolutions, and the unique-solution check stillUnique, including the
// equivalence of stillUnique with a plain solution count and its speed advantage.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var F = SG.fixtures.classic;
  var model9 = SG.classicModel.build(9);
  var model4 = SG.classicModel.build(4);
  var model6 = SG.classicModel.build(6);

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
  }

  function clues(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] !== 0) n++;
    return n;
  }

  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  /** Smallest wall time of `rounds` runs of fn, in milliseconds. */
  function bestOf(rounds, fn) {
    var best = Infinity;
    for (var r = 0; r < rounds; r++) {
      var t = now();
      fn();
      best = Math.min(best, now() - t);
    }
    return best;
  }

  describe('dfs.solve: known puzzles', function () {
    F.unique.forEach(function (entry) {
      it('solves ' + entry.name + ' exactly as the known solution says', function () {
        var givens = F.parse(entry.puzzle);
        var solution = SG.dfs.solve(model9, givens);
        expect(solution).toBeInstanceOf(Int32Array);
        expect(Array.from(solution)).toEqual(Array.from(F.parse(entry.solution)));
        expect(SG.model.isSolution(model9, solution)).toBe(true);
        for (var c = 0; c < 81; c++) if (givens[c] !== 0) expect(solution[c]).toBe(givens[c]);
      });
    });

    it('has at least 10 sample puzzles, including Escargot and the 2012 "world\'s hardest"', function () {
      expect(F.unique.length).toBeGreaterThan(9);
      var names = F.unique.map(function (e) { return e.name; });
      expect(names).toContain('escargot');
      expect(names).toContain('worlds-hardest-2012');
    });

    it('does not change the givens it was given', function () {
      var givens = F.parse(F.unique[1].puzzle);
      var copy = Int32Array.from(givens);
      SG.dfs.solve(model9, givens);
      expect(givens).toEqual(copy);
    });

    it('returns a copy: a second solve does not overwrite an earlier result', function () {
      var a = SG.dfs.solve(model9, F.parse(F.unique[0].puzzle));
      var b = SG.dfs.solve(model9, F.parse(F.unique[1].puzzle));
      expect(a).not.toBe(b);
      expect(Array.from(a)).toEqual(Array.from(F.parse(F.unique[0].solution)));
    });

    it('returns null for puzzles without a solution', function () {
      F.contradictory.forEach(function (entry) {
        expect(SG.dfs.solve(model9, F.parse(entry.puzzle))).toBeNull();
      });
    });

    it('finds some solution of a puzzle that has several', function () {
      F.multi.forEach(function (entry) {
        var givens = F.parse(entry.puzzle);
        var solution = SG.dfs.solve(model9, givens);
        expect(SG.model.isSolution(model9, solution)).toBe(true);
        for (var c = 0; c < 81; c++) if (givens[c] !== 0) expect(solution[c]).toBe(givens[c]);
      });
    });

    it('solves the classic4 and classic6 empty grids', function () {
      expect(SG.model.isSolution(model4, SG.dfs.solve(model4, new Int32Array(16)))).toBe(true);
      expect(SG.model.isSolution(model6, SG.dfs.solve(model6, new Int32Array(36)))).toBe(true);
    });

    it('is deterministic without an rng and random but reproducible with one', function () {
      var empty = new Int32Array(81);
      expect(SG.dfs.solve(model9, empty)).toEqual(SG.dfs.solve(model9, empty));
      var a = SG.dfs.solve(model9, empty, SG.testkit.rng.create(5));
      var b = SG.dfs.solve(model9, empty, SG.testkit.rng.create(5));
      var c = SG.dfs.solve(model9, empty, SG.testkit.rng.create(6));
      expect(a).toEqual(b);
      expect(a).not.toEqual(c);
      expect(SG.model.isSolution(model9, a)).toBe(true);
      expect(SG.model.isSolution(model9, c)).toBe(true);
    });
  });

  describe('dfs.countSolutions', function () {
    it('returns 1 for every standard puzzle', function () {
      F.unique.forEach(function (entry) {
        expect(SG.dfs.countSolutions(model9, F.parse(entry.puzzle), 2)).toBe(1);
      });
    });

    it('returns 2 (meaning "two or more") for puzzles with several solutions', function () {
      expect(F.multi.length).toBeGreaterThan(1);
      F.multi.forEach(function (entry) {
        expect(SG.dfs.countSolutions(model9, F.parse(entry.puzzle), 2)).toBe(2);
      });
    });

    it('returns 0 for contradictory puzzles', function () {
      expect(F.contradictory.length).toBeGreaterThan(1);
      F.contradictory.forEach(function (entry) {
        expect(SG.dfs.countSolutions(model9, F.parse(entry.puzzle), 2)).toBe(0);
      });
    });

    it('defaults to a limit of 2', function () {
      expect(SG.dfs.countSolutions(model9, new Int32Array(81))).toBe(2);
    });

    it('counts exactly when there are fewer solutions than the limit', function () {
      var deadly = F.parse(F.multi[1].puzzle);
      expect(SG.dfs.countSolutions(model9, deadly, 2)).toBe(2);
      expect(SG.dfs.countSolutions(model9, deadly, 3)).toBe(2);
      expect(SG.dfs.countSolutions(model9, deadly, 1000)).toBe(2);
      expect(SG.dfs.countSolutions(model9, deadly, 1)).toBe(1);
    });

    it('counts all 288 grids of the empty 4x4 board', function () {
      expect(SG.dfs.countSolutions(model4, new Int32Array(16), 1000)).toBe(288);
    });

    it('stops early at the limit instead of counting every solution', function () {
      // The empty 9x9 board has about 6.7e21 solutions: only an early stop can answer this at all.
      var small = SG.budget.create({ nodes: 5000 });
      expect(SG.dfs.countSolutions(model9, new Int32Array(81), 2, small)).toBe(2);
      var few = small.nodes;
      expect(few).toBeLessThan(5000);
      var more = SG.budget.create({});
      expect(SG.dfs.countSolutions(model4, new Int32Array(16), 2, more)).toBe(2);
      var all = SG.budget.create({});
      expect(SG.dfs.countSolutions(model4, new Int32Array(16), 1000, all)).toBe(288);
      expect(more.nodes).toBeLessThan(all.nodes / 5);
    });

    it('rejects a limit that is not a positive integer', function () {
      expectCode(function () { SG.dfs.countSolutions(model9, new Int32Array(81), 0); }, 'dfs.invalidLimit');
      expectCode(function () { SG.dfs.countSolutions(model9, new Int32Array(81), 1.5); }, 'dfs.invalidLimit');
      expectCode(function () { SG.dfs.countSolutions(model9, new Int32Array(81), -2); }, 'dfs.invalidLimit');
    });
  });

  describe('dfs: input checks and budget', function () {
    it('rejects givens of the wrong length or with values outside 1..D', function () {
      expectCode(function () { SG.dfs.solve(model9, new Int32Array(80)); }, 'dfs.invalidGivens');
      expectCode(function () { SG.dfs.countSolutions(model9, null); }, 'dfs.invalidGivens');
      var bad = new Int32Array(81);
      bad[3] = 10;
      expectCode(function () { SG.dfs.solve(model9, bad); }, 'dfs.invalidGivens');
      bad[3] = -1;
      expectCode(function () { SG.dfs.countSolutions(model9, bad); }, 'dfs.invalidGivens');
      var fractional = new Array(81).fill(0);
      fractional[0] = 1.5;
      expectCode(function () { SG.dfs.solve(model9, fractional); }, 'dfs.invalidGivens');
      expectCode(function () { SG.dfs.stillUnique(model9, new Int32Array(80), 0, 1); }, 'dfs.invalidGivens');
    });

    it('throws budget.exceeded when the node budget runs out, and works again afterwards', function () {
      var hard = F.parse(F.unique[2].puzzle);
      expectCode(function () {
        SG.dfs.solve(model9, hard, null, SG.budget.create({ nodes: 1 }));
      }, 'budget.exceeded');
      expect(Array.from(SG.dfs.solve(model9, hard))).toEqual(Array.from(F.parse(F.unique[2].solution)));
    });

    it('throws budget.cancelled for a cancelled budget', function () {
      var budget = SG.budget.create({});
      budget.cancel();
      var hard = F.parse(F.unique[2].puzzle);
      expectCode(function () { SG.dfs.countSolutions(model9, hard, 2, budget); }, 'budget.cancelled');
    });

    it('counts search nodes in the budget', function () {
      var budget = SG.budget.create({});
      SG.dfs.solve(model9, F.parse(F.unique[2].puzzle), null, budget);
      expect(budget.nodes).toBeGreaterThan(0);
    });
  });

  describe('dfs.searchFrom', function () {
    it('completes a copy of a propagated state and leaves the original untouched', function () {
      var s = SG.model.initState(model4);
      SG.constraints.assign(model4, s, 0, 1);
      SG.constraints.propagate(model4, s);
      var before = SG.model.cloneState(s);
      var result = SG.dfs.searchFrom(model4, s, { limit: 1 });
      expect(result.found).toBe(1);
      expect(result.aborted).toBe(false);
      expect(SG.model.isSolution(model4, result.solution)).toBe(true);
      expect(result.solution[0]).toBe(1);
      expect(s.candidates).toEqual(before.candidates);
      expect(s.value).toEqual(before.value);
    });

    it('counts up to the limit and reports the first solution', function () {
      var s = SG.model.initState(model4);
      var result = SG.dfs.searchFrom(model4, s, { limit: 1000 });
      expect(result.found).toBe(288);
      expect(result.solution).not.toBeNull();
    });

    it('gives up (aborted) after maxBacktracks failed guesses', function () {
      // A puzzle that propagation alone cannot finish needs wrong guesses when values are tried at random.
      var entry = F.unique.filter(function (e) { return e.name === 'hard-a'; })[0];
      var base = SG.model.initState(model9);
      var givens = F.parse(entry.puzzle);
      for (var c = 0; c < 81; c++) if (givens[c] !== 0) SG.constraints.assign(model9, base, c, givens[c]);
      expect(SG.constraints.propagate(model9, base)).toBe(true);
      var aborted = 0;
      var finished = 0;
      for (var seed = 1; seed <= 40; seed++) {
        var strict = SG.dfs.searchFrom(model9, base, { rng: SG.testkit.rng.create(seed), maxBacktracks: 0 });
        expect(strict.aborted).toBe(strict.found === 0);
        if (strict.aborted) aborted++;
        else finished++;
        var relaxed = SG.dfs.searchFrom(model9, base, { rng: SG.testkit.rng.create(seed) });
        expect(relaxed.aborted).toBe(false);
        expect(Array.from(relaxed.solution)).toEqual(Array.from(F.parse(entry.solution)));
      }
      expect(aborted).toBeGreaterThan(0);
      expect(finished).toBeGreaterThan(0);
    });
  });

  /**
   * Cases for the stillUnique checks. Each case is a unique puzzle P with a clue (cell, value) to remove;
   * `givens` already has the clue cleared (the puzzle after removal).
   */
  function buildCases(count) {
    var rng = SG.testkit.rng.create(424242);
    var out = [];

    // Half of them: single clues removed from the sample puzzles.
    var fromFixtures = Math.floor(count / 2);
    for (var i = 0; i < fromFixtures; i++) {
      var entry = rng.pick(F.unique);
      var puzzle = F.parse(entry.puzzle);
      var solution = F.parse(entry.solution);
      var held = [];
      for (var c = 0; c < 81; c++) if (puzzle[c] !== 0) held.push(c);
      var cell = rng.pick(held);
      var after = Int32Array.from(puzzle);
      after[cell] = 0;
      out.push({ givens: after, before: puzzle, cell: cell, value: solution[cell] });
    }

    // The rest: puzzles dug from random full grids with the plain oracle, stopped at a random clue count.
    while (out.length < count) {
      var full = SG.testkit.randomSolution(model9, rng.fork('grid' + out.length));
      var target = 22 + rng.int(40);
      var puz = Int32Array.from(full);
      var order = [];
      for (var k = 0; k < 81; k++) order.push(k);
      rng.shuffle(order);
      var left = 81;
      for (var j = 0; j < 81 && left > target; j++) {
        var saved = puz[order[j]];
        puz[order[j]] = 0;
        if (SG.dfs.countSolutions(model9, puz, 2) === 1) left--;
        else puz[order[j]] = saved;
      }
      var heldCells = [];
      for (var m = 0; m < 81; m++) if (puz[m] !== 0) heldCells.push(m);
      var pick = rng.pick(heldCells);
      var removed = Int32Array.from(puz);
      removed[pick] = 0;
      out.push({ givens: removed, before: puz, cell: pick, value: full[pick] });
    }
    return out;
  }

  describe('dfs.stillUnique', function () {
    var cases = buildCases(200);

    it('agrees with countSolutions(puzzle after removal, 2) === 1 on 200 random cases', function () {
      var unique = 0;
      cases.forEach(function (cs, index) {
        var expected = SG.dfs.countSolutions(model9, cs.givens, 2) === 1;
        var actual = SG.dfs.stillUnique(model9, cs.givens, cs.cell, cs.value);
        if (actual !== expected) {
          throw new Error('case ' + index + ': stillUnique says ' + actual + ', the count says ' + expected);
        }
        if (expected) unique++;
      });
      // The sample must exercise both answers, or the equivalence says little.
      expect(unique).toBeGreaterThan(40);
      expect(cases.length - unique).toBeGreaterThan(40);
    });

    it('gives the same answer whether or not the clue is still in the givens', function () {
      cases.forEach(function (cs) {
        expect(SG.dfs.stillUnique(model9, cs.before, cs.cell, cs.value))
          .toBe(SG.dfs.stillUnique(model9, cs.givens, cs.cell, cs.value));
      });
    });

    it('does not modify the givens', function () {
      var cs = cases[0];
      var copy = Int32Array.from(cs.before);
      SG.dfs.stillUnique(model9, cs.before, cs.cell, cs.value);
      expect(cs.before).toEqual(copy);
    });

    it('is true when removing a clue that its peers make redundant (a naked single)', function () {
      var solution = F.parse(F.unique[0].solution);
      var givens = Int32Array.from(solution);
      givens[40] = 0;
      expect(SG.dfs.stillUnique(model9, givens, 40, solution[40])).toBe(true);
    });

    it('is true for a hidden single and for one that needs propagation to see', function () {
      // The easy sample is solved by singles alone, so every one of its clues that has a naked or hidden
      // single in the remaining puzzle must be reported as removable, and countSolutions must agree.
      var entry = F.unique[3];
      var puzzle = F.parse(entry.puzzle);
      var solution = F.parse(entry.solution);
      var removable = 0;
      for (var c = 0; c < 81; c++) {
        if (puzzle[c] === 0) continue;
        var givens = Int32Array.from(puzzle);
        givens[c] = 0;
        var viaCount = SG.dfs.countSolutions(model9, givens, 2) === 1;
        expect(SG.dfs.stillUnique(model9, givens, c, solution[c])).toBe(viaCount);
        if (viaCount) removable++;
      }
      expect(removable).toBeGreaterThan(0);
    });

    it('is false for every clue of a minimal puzzle (17 clues), with and without a search', function () {
      ['hard-17-clues', 'hard-17-clues-b'].forEach(function (name) {
        var entry = F.unique.filter(function (e) { return e.name === name; })[0];
        var puzzle = F.parse(entry.puzzle);
        var solution = F.parse(entry.solution);
        expect(clues(puzzle)).toBe(17);
        for (var c = 0; c < 81; c++) {
          if (puzzle[c] === 0) continue;
          var givens = Int32Array.from(puzzle);
          givens[c] = 0;
          expect(SG.dfs.stillUnique(model9, givens, c, solution[c])).toBe(false);
          expect(SG.dfs.countSolutions(model9, givens, 2)).toBe(2);
        }
      });
    });

    it('is false when the given true value is excluded by the peers (inconsistent input)', function () {
      var puzzle = F.parse(F.unique[0].puzzle);
      var cell = 0;
      expect(puzzle[cell]).toBe(5);
      var givens = Int32Array.from(puzzle);
      givens[cell] = 0;
      // 3 is a given in the first row, so it cannot be the value of cell 0.
      expect(SG.dfs.stillUnique(model9, givens, cell, 3)).toBe(false);
    });

    it('finds the second solution of a deadly pattern', function () {
      var solution = F.parse(F.unique[0].solution);
      var rectangle = F.parse(F.multi[1].puzzle);
      // The rectangle puzzle plus one of its four empty cells is unique; removing it makes it ambiguous.
      var cell = 3;
      expect(rectangle[cell]).toBe(0);
      var withClue = Int32Array.from(rectangle);
      withClue[cell] = solution[cell];
      expect(SG.dfs.countSolutions(model9, withClue, 2)).toBe(1);
      expect(SG.dfs.stillUnique(model9, withClue, cell, solution[cell])).toBe(false);
    });

    it('respects the budget when the check has to search', function () {
      // An empty grid breaks the precondition on purpose: no propagation decides the cell, so the alternative
      // values have to be searched, which is where the budget is checked.
      var empty = new Int32Array(81);
      var threw = false;
      try {
        SG.dfs.stillUnique(model9, empty, 0, 1, SG.budget.create({ nodes: 1 }));
      } catch (e) {
        threw = e.code === 'budget.exceeded';
      }
      expect(threw).toBe(true);
      expect(SG.dfs.stillUnique(model9, empty, 0, 1)).toBe(false);
    });

    it('works on classic4 and classic6 as well', function () {
      [model4, model6].forEach(function (model, which) {
        var rng = SG.testkit.rng.create(90 + which);
        for (var i = 0; i < 20; i++) {
          var full = SG.testkit.randomSolution(model, rng.fork('g' + i));
          var puz = Int32Array.from(full);
          var order = [];
          for (var k = 0; k < full.length; k++) order.push(k);
          rng.shuffle(order);
          order.forEach(function (cell) {
            var saved = puz[cell];
            puz[cell] = 0;
            var viaCount = SG.dfs.countSolutions(model, puz, 2) === 1;
            expect(SG.dfs.stillUnique(model, puz, cell, saved)).toBe(viaCount);
            if (!viaCount) puz[cell] = saved;
          });
        }
      });
    });
  });

  describe('dfs.stillUnique: speed (T-1.4 performance milestone)', function () {
    // The calls a dig makes: remove the next cell of a random order, ask whether the puzzle is still unique,
    // keep or restore the clue. Recorded once so that both approaches see exactly the same questions.
    var workload = [];
    for (var s = 0; s < 20; s++) {
      var rng = SG.testkit.rng.create(31337 + s);
      var grid = SG.testkit.randomSolution(model9, rng.fork('grid'));
      var puz = Int32Array.from(grid);
      var order = [];
      for (var k = 0; k < 81; k++) order.push(k);
      rng.shuffle(order);
      for (var j = 0; j < 81; j++) {
        var cell = order[j];
        var value = puz[cell];
        puz[cell] = 0;
        var unique = SG.dfs.countSolutions(model9, puz, 2) === 1;
        workload.push({ givens: Int32Array.from(puz), cell: cell, value: value, unique: unique });
        if (!unique) puz[cell] = value;
      }
    }
    var keepers = workload.filter(function (w) { return w.unique; });

    function naive(w) { return SG.dfs.countSolutions(model9, w.givens, 2) === 1; }
    function optimised(w) { return SG.dfs.stillUnique(model9, w.givens, w.cell, w.value); }
    function runAll(list, fn) { for (var i = 0; i < list.length; i++) fn(list[i]); }

    /** Ratio of best-of-N times, measured alternately so slow phases of the machine hit both sides. */
    function speedup(list) {
      var slow = Infinity;
      var fast = Infinity;
      for (var round = 0; round < 9; round++) {
        slow = Math.min(slow, bestOf(1, function () { runAll(list, naive); }));
        fast = Math.min(fast, bestOf(1, function () { runAll(list, optimised); }));
      }
      return slow / fast;
    }

    var cursor = 0;
    bench('stillUnique, one dig-time call (mixed outcomes)', function () {
      optimised(workload[cursor++ % workload.length]);
    }, 3000);
    cursor = 0;
    bench('countSolutions(...) === 1, the same dig-time calls', function () {
      naive(workload[cursor++ % workload.length]);
    }, 3000);

    it('gives the same answers as the plain count on the whole recorded dig workload', function () {
      expect(workload.length).toBe(1620);
      runAll(workload, function (w) { expect(optimised(w)).toBe(w.unique); });
      expect(keepers.length).toBeGreaterThan(900);
    });

    it('is at least 3x faster than the naive approach when the puzzle stays unique', function () {
      // The case section 6.5 is about: the removal is accepted, so the plain count must prove that no second
      // solution exists. stillUnique answers most of these from the removed cell alone (a naked or hidden
      // single) and otherwise only refutes the alternatives of that one cell.
      var factor = speedup(keepers);
      expect(factor).toBeGreaterThan(3);
    });

    it('is also faster over a whole dig, where refused removals cost both about the same', function () {
      // A refused removal ends as soon as any second solution is found, which both approaches do at similar
      // cost, so the gain over the whole workload is smaller than the one above.
      var factor = speedup(workload);
      expect(factor).toBeGreaterThan(1.25);
    });
  });
})();
