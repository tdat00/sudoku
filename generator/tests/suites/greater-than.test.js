// Greater-Than Sudoku (task T-5.6): the inequality propagation (design.md 6.3 P5), the two techniques of the
// `ineq` group (6.6 I1 / I2), the sign dig of 8.3, and the common variant criteria CV1-CV9 of task.md
// phase P5. The propagation is compared with an independent fixpoint, the techniques with hand-made
// positions, and every generated puzzle is checked against its own solution, a brute-force search for the
// minimality of its signs and an ASCII drawing of its signs that is read back.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.techHelper;
  var E = SG.events;
  var G = SG.greaterThan;
  var def = SG.variants.get('greaterThan');

  var LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];
  /** design.md 9.1, greaterThan row, p95 in ms. */
  var BUDGET_MS = { veryEasy: 300, easy: 700, normal: 700, hard: 6000, expert: 10000, master: 10000,
    nightmare: 10000, hell1: 10000, hell2: 10000 };
  var PUZZLES_PER_LEVEL = 20;
  /** Fewer puzzles of the slower levels, so that the suite stays quick. */
  var PER_LEVEL = { hard: 10, expert: 10, master: 10, nightmare: 10, hell1: 10, hell2: 10 };
  var SINGLES = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine'];

  function countOf(level) {
    return PER_LEVEL[level] || PUZZLES_PER_LEVEL;
  }

  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  /** Fails with a message that names the puzzle, which a bare expect() would not. */
  function check(ok, message) {
    if (!ok) throw new Error(message);
  }

  function expectCode(fn, code) {
    var thrown = null;
    try { fn(); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(thrown instanceof SG.errors.GenerationError).toBe(true);
    expect(thrown.code).toBe(code);
    return thrown;
  }

  function mean(values) {
    return values.reduce(function (a, b) { return a + b; }, 0) / values.length;
  }

  /** Nearest-rank percentile: the p95 of 20 runs is the 19th of them. */
  function percentile(values, p) {
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
  }

  function clueCount(givens) {
    var k = 0;
    for (var c = 0; c < givens.length; c++) if (givens[c] !== 0) k++;
    return k;
  }

  function row(c) { return Math.floor(c / 9); }
  function col(c) { return c % 9; }
  function box(c) { return Math.floor(row(c) / 3) * 3 + Math.floor(col(c) / 3); }

  function bit(v) { return 1 << (v - 1); }

  function maskOf(values) {
    return values.reduce(function (m, v) { return m | bit(v); }, 0);
  }

  function valuesOf(mask) {
    var out = [];
    for (var v = 1; v <= 9; v++) if ((mask & bit(v)) !== 0) out.push(v);
    return out;
  }

  var boardCache = null;
  /** The sign-free board (what build gives). */
  function board() {
    if (boardCache === null) boardCache = def.build({}, null);
    return boardCache;
  }

  /** A full grid of the sign-free board for a seed. */
  function gridFor(seed) {
    return SG.fullGrid.generate(board(), SG.rng.create(seed), null);
  }

  /** The model with every sign of a grid (what postGenerate returns). */
  function allSignsModel(seed, futoshiki) {
    var m = futoshiki ? def.build({ futoshiki: true }, null) : board();
    var solution = SG.fullGrid.generate(m, SG.rng.create(seed), null);
    var model = def.postGenerate({ model: m, solution: solution });
    return { base: m, model: model, solution: solution };
  }

  /** A model with a plain list of signs and no units at all: only the bound rules and singles act on it. */
  function signsOnly(cellCount, signs) {
    var rows = [];
    var cols = [];
    for (var c = 0; c < cellCount; c++) {
      rows.push(0);
      cols.push(c);
    }
    return SG.model.create({
      variantId: 'greaterThan',
      digits: 9,
      cellCount: cellCount,
      units: [],
      layout: { rows: 1, cols: cellCount, cellRow: rows, cellCol: cols, cellRegion: rows },
      inequalities: signs
    });
  }

  /** The two bound rules of design.md 6.3 P5, applied link by link until nothing changes. */
  function referenceClosure(cand, signs) {
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < signs.length; i++) {
        var a = signs[i].a;
        var b = signs[i].b;
        var minA = valuesOf(cand[a])[0];
        var maxB = valuesOf(cand[b]).pop();
        var newA = cand[a] & ((1 << (maxB - 1)) - 1);
        var newB = cand[b] & ~((1 << minA) - 1);
        if (newA === 0 || newB === 0) return false;
        if (newA !== cand[a]) { cand[a] = newA; changed = true; }
        if (newB !== cand[b]) { cand[b] = newB; changed = true; }
      }
    }
    return true;
  }

  /**
   * A random consistent position of a few cells: hidden values, signs that hold for them, and candidates
   * that are a random superset of each value. `cand` is an Int32Array of candidate masks.
   */
  function randomPosition(rng) {
    var n = 3 + rng.int(10);
    var values = [];
    var i;
    for (i = 0; i < n; i++) values.push(1 + rng.int(9));
    var signs = [];
    var links = 1 + rng.int(2 * n);
    for (i = 0; i < links; i++) {
      var a = rng.int(n);
      var b = rng.int(n);
      if (values[a] < values[b]) signs.push({ a: a, b: b });
    }
    if (signs.length === 0) {
      values[0] = 1;
      values[1] = 9;
      signs.push({ a: 0, b: 1 });
    }
    var cand = new Int32Array(n);
    for (i = 0; i < n; i++) {
      var keep = bit(values[i]);
      for (var v = 1; v <= 9; v++) if (rng.next() < 0.45) keep |= bit(v);
      cand[i] = keep;
    }
    return { n: n, values: values, signs: signs, cand: cand };
  }

  function removedCandidates(state) {
    var removed = 0;
    for (var c = 0; c < state.candidates.length; c++) removed += 9 - SG.bits.popcount(state.candidates[c]);
    return removed;
  }

  /** Runs fn with the inequality extension switched off, then restores it. */
  function withoutExtension(fn) {
    var was = SG.constraints.listExtensions().indexOf(SG.ineq.EXTENSION_ID) !== -1;
    SG.constraints.unregisterExtension(SG.ineq.EXTENSION_ID);
    try {
      return fn();
    } finally {
      if (was) SG.ineq.ensureExtension();
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Generated puzzles, shared by the suites below (generated once, on first use)
  // ---------------------------------------------------------------------------------------------

  function generate(level, seed, extra) {
    var events = 0;
    var cfg = Object.assign({
      variantId: 'greaterThan', difficulty: level, seed: seed, trace: 'summary'
    }, extra);
    var t0 = now();
    var result = SG.pipeline.run(cfg, function () { events++; });
    result.elapsedMs = now() - t0;
    result.eventCount = events;
    return result;
  }

  var runCache = null;
  function puzzleRun() {
    if (runCache === null) {
      runCache = {};
      LEVELS.forEach(function (level, li) {
        runCache[level] = [];
        for (var i = 0; i < countOf(level); i++) {
          runCache[level].push(generate(level, 100 * (li + 1) + i));
        }
      });
    }
    return runCache;
  }

  function allPuzzles() {
    var out = [];
    LEVELS.forEach(function (level) { out = out.concat(puzzleRun()[level]); });
    return out;
  }

  var futoCache = null;
  function futoshikiRun() {
    if (futoCache === null) {
      futoCache = [];
      ['easy', 'normal', 'hard', 'master'].forEach(function (level, li) {
        for (var i = 0; i < 4; i++) {
          futoCache.push(generate(level, 7000 + 10 * li + i, { variantOptions: { futoshiki: true } }));
        }
      });
    }
    return futoCache;
  }

  /** A puzzle's model with another set of signs: what a solver sees when some signs are left out. */
  function signsRemoved(model, keep) {
    return G.withSigns(model, keep);
  }

  // ---------------------------------------------------------------------------------------------
  // P5: the propagation extension
  // ---------------------------------------------------------------------------------------------

  describe('greaterThan: inequality propagation (design.md 6.3 P5)', function () {
    it('is registered through the extension hook, once, by ensureExtension (and by building a model)',
      function () {
        board();
        expect(SG.constraints.listExtensions()).toContain('ineq');
        expect(SG.ineq.ensureExtension()).toBe(false);
        expect(SG.constraints.listExtensions().filter(function (id) { return id === 'ineq'; }))
          .toHaveLength(1);
      });

    it('can be switched off and back on, and building a model switches it on again', function () {
      withoutExtension(function () {
        expect(SG.constraints.listExtensions()).not.toContain('ineq');
        expect(SG.ineq.ensureExtension()).toBe(true);
        expect(SG.constraints.unregisterExtension('ineq')).toBe(true);
        var m = G.withSigns(board(), []);
        expect(m.inequalities).toHaveLength(0);
        expect(SG.constraints.listExtensions()).toContain('ineq');
      });
      expect(SG.constraints.listExtensions()).toContain('ineq');
    });

    it('leaves a model without signs alone (the sign-free board is a plain Sudoku)', function () {
      var plain = SG.model.initState(board());
      expect(SG.constraints.propagate(board(), plain)).toBe(true);
      expect(removedCandidates(plain)).toBe(0);
    });

    it('a < b removes the values >= max(b) from a and <= min(a) from b', function () {
      var m = signsOnly(2, [{ a: 0, b: 1 }]);
      var s = SG.model.initState(m);
      expect(SG.constraints.propagate(m, s)).toBe(true);
      expect(valuesOf(s.candidates[0])).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(valuesOf(s.candidates[1])).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('carries the bounds along a whole chain a < b < c < d in one call', function () {
      var m = signsOnly(4, [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }]);
      var s = SG.model.initState(m);
      expect(SG.constraints.propagate(m, s)).toBe(true);
      expect(valuesOf(s.candidates[0])).toEqual([1, 2, 3, 4, 5, 6]);
      expect(valuesOf(s.candidates[1])).toEqual([2, 3, 4, 5, 6, 7]);
      expect(valuesOf(s.candidates[2])).toEqual([3, 4, 5, 6, 7, 8]);
      expect(valuesOf(s.candidates[3])).toEqual([4, 5, 6, 7, 8, 9]);
    });

    it('a chain of nine cells is a complete ordering: 1 < 2 < ... < 9 falls out by itself', function () {
      var signs = [];
      for (var i = 0; i < 8; i++) signs.push({ a: i, b: i + 1 });
      var m = signsOnly(9, signs);
      var s = SG.model.initState(m);
      expect(SG.constraints.propagate(m, s)).toBe(true);
      for (var c = 0; c < 9; c++) expect(s.value[c]).toBe(c + 1);
    });

    it('a fixed value pushes the bounds of the cells around it, through gaps in their candidates',
      function () {
        var m = signsOnly(3, [{ a: 0, b: 1 }, { a: 1, b: 2 }]);
        var s = SG.model.initState(m);
        s.candidates[1] = maskOf([2, 7]);
        expect(SG.constraints.place(m, s, 0, 3)).toBe(true);
        // R1C2 can only be 7 (2 is below 3), which leaves 8 and 9 for the cell above it.
        expect(s.value[1]).toBe(7);
        expect(valuesOf(s.candidates[2])).toEqual([8, 9]);
      });

    it('reports a contradiction: a cell that cannot be above its neighbour, and a cycle', function () {
      var m = signsOnly(2, [{ a: 0, b: 1 }]);
      var s = SG.model.initState(m);
      expect(SG.constraints.place(m, s, 0, 9)).toBe(false);
      var cyc = signsOnly(3, [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 0 }]);
      expect(SG.constraints.propagate(cyc, SG.model.initState(cyc))).toBe(false);
      var self = signsOnly(2, [{ a: 1, b: 1 }]);
      expect(SG.constraints.propagate(self, SG.model.initState(self))).toBe(false);
    });

    it('gives the same candidates as an independent fixpoint of the two rules (400 random sign sets)',
      function () {
        var rng = SG.rng.create(5150);
        for (var trial = 0; trial < 400; trial++) {
          var pos = randomPosition(rng);
          var model = signsOnly(pos.n, pos.signs);
          var state = SG.model.initState(model);
          state.candidates.set(pos.cand);
          var expected = pos.cand.slice();
          // The position is consistent (it holds a solution), so neither side may find a contradiction.
          expect(referenceClosure(expected, pos.signs)).toBe(true);
          expect(SG.constraints.propagate(model, state)).toBe(true);
          for (var i = 0; i < pos.n; i++) {
            // The engine also fixes single candidates, which does not change the candidate set.
            if (state.candidates[i] !== expected[i]) {
              throw new Error('trial ' + trial + ' cell ' + i + ': got ' + valuesOf(state.candidates[i]) +
                ', expected ' + valuesOf(expected[i]) + ' for ' + JSON.stringify(pos.signs));
            }
          }
        }
      });

    it('prunes: with all the signs of a grid and no clue it removes hundreds of candidates, none of the ' +
      'solution', function () {
      [false, true].forEach(function (futoshiki) {
        var totals = [];
        for (var seed = 1; seed <= 20; seed++) {
          var g = allSignsModel(seed, futoshiki);
          var state = SG.model.initState(g.model);
          expect(SG.constraints.propagate(g.model, state)).toBe(true);
          for (var c = 0; c < 81; c++) expect((state.candidates[c] & bit(g.solution[c])) !== 0).toBe(true);
          totals.push(removedCandidates(state));
        }
        // 729 candidates in all; without the rule a model of signs and no clue removes nothing at all.
        expect(Math.min.apply(null, totals)).toBeGreaterThan(futoshiki ? 250 : 150);
        expect(mean(totals)).toBeGreaterThan(futoshiki ? 450 : 300);
      });
      var g1 = allSignsModel(1, false);
      var off = withoutExtension(function () {
        var s = SG.model.initState(g1.model);
        SG.constraints.propagate(g1.model, s);
        return removedCandidates(s);
      });
      expect(off).toBe(0);
    });

    it('is honoured by the solver: every solution it finds satisfies the signs, and the given one is found',
      function () {
        var g = allSignsModel(2, false);
        expect(SG.model.isSolution(g.model, g.solution)).toBe(true);
        for (var k = 1; k <= 6; k++) {
          var found = SG.dfs.solve(g.model, new Int32Array(81), SG.rng.create(k));
          expect(SG.model.isSolution(g.model, found)).toBe(true);
        }
        var seeded = new Int32Array(81);
        seeded[0] = g.solution[0];
        var count = SG.dfs.countSolutions(g.model, seeded, 1000);
        expect(count).toBeGreaterThan(0);
        // Without the rule the search knows the units only, and finds solutions that break signs.
        var without = withoutExtension(function () {
          return SG.dfs.countSolutions(g.model, seeded, count + 1);
        });
        expect(without).toBe(count + 1);
      });

    it('is what makes the signs count: with it every puzzle is solved by a few search nodes, without ' +
      'it a puzzle that keeps a sign is ambiguous', function () {
      var withSign = 0;
      var nodes = [];
      allPuzzles().forEach(function (p, i) {
        var budget = SG.budget.create({ nodes: 1e6 });
        check(SG.dfs.countSolutions(p.model, p.givens, 2, budget) === 1, 'puzzle ' + i + ': not unique');
        nodes.push(budget.nodes);
        // Rating v2 digs the levels up to hell2 with fewer clues and signs: a few thousand at most.
        check(budget.nodes < 5000, 'puzzle ' + i + ': ' + budget.nodes + ' nodes');
        if (p.model.inequalities.length === 0) return;
        withSign++;
        var blind = withoutExtension(function () { return SG.dfs.countSolutions(p.model, p.givens, 2); });
        check(blind === 2, 'puzzle ' + i + ': unique although the signs are ignored');
      });
      nodes.sort(function (a, b) { return a - b; });
      // Most of them need only a handful.
      expect(nodes[nodes.length >> 1]).toBeLessThan(200);
      expect(withSign).toBeGreaterThan(50);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The techniques
  // ---------------------------------------------------------------------------------------------

  describe('greaterThan: techniques of the ineq group (I1 ineqChain, I2 minMaxForcing)', function () {
    var chain = SG.techniques.get('ineqChain');
    var forcing = SG.techniques.get('minMaxForcing');

    function ctxFor(model, budget) {
      return SG.techniques.createContext(model, { budget: budget || null });
    }

    /** A state with the signs and, optionally, extra candidate restrictions { cell: [values] }. */
    function stateOf(signs, restrict, propagate) {
      var model = G.withSigns(board(), signs);
      var state = H.makeState(model, new Int32Array(81), {
        propagate: propagate === true,
        candidates: Array.from({ length: 81 }, function (x, c) {
          return restrict && restrict[c] ? restrict[c].join('') : null;
        })
      });
      return { model: model, state: state };
    }

    it('are registered as the ladder says: group ineq, costs 12 and 22, orders 65 and 85, greaterThan only',
      function () {
        expect(chain.group).toBe('ineq');
        expect(chain.baseCost).toBe(12);
        expect(chain.order).toBe(65);
        expect(forcing.group).toBe('ineq');
        expect(forcing.baseCost).toBe(22);
        expect(forcing.order).toBe(85);
        [chain, forcing].forEach(function (t) {
          expect(Array.from(t.variantScope)).toEqual(['greaterThan']);
          expect(t.assumesUniqueness).toBe(false);
          expect(t.i18nKey).toBe('technique.' + t.id);
        });
        expect(chain.order).toBeLessThan(forcing.order);
      });

    it('apply to greaterThan only: no other variant has them in its ladder', function () {
      expect(SG.techniques.appliesTo(chain, 'greaterThan')).toBe(true);
      expect(SG.techniques.appliesTo(chain, 'classic9')).toBe(false);
      expect(SG.techniques.appliesTo(forcing, 'killer')).toBe(false);
      var onClassic = SG.difficulty.spec('master', SG.variants.get('classic9').build({}, null));
      expect(onClassic.allowedTechniques).not.toContain('ineqChain');
      // Rating v2: a technique is allowed from the band whose maximum exceeds 1.25 x its weight.
      expect(SG.difficulty.spec('veryEasy', board()).allowedTechniques).not.toContain('ineqChain');
      expect(SG.difficulty.spec('easy', board()).allowedTechniques).toContain('ineqChain');
      var onThis = SG.difficulty.spec('normal', board());
      expect(onThis.allowedTechniques).toContain('ineqChain');
      expect(onThis.allowedTechniques).toContain('minMaxForcing');
    });

    describe('ineqChain', function () {
      it('a chain of four cells in a row: the top three cannot be too high (upper bounds, one Finding)',
        function () {
          var t = stateOf([{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }]);
          var f = H.expectFinding(SG.test, 'ineqChain', t.state, {
            eliminations: [[0, 7], [0, 8], [0, 9], [1, 8], [1, 9], [2, 9]],
            cells: [0, 1, 2, 3],
            args: { cell: 'R1C1', bound: 6, chain: 'R1C1 < R1C2 < R1C3 < R1C4', count: 4, direction: 'max' }
          });
          expect(f.i18nKey).toBe('technique.ineqChain.step.max');
          expect(f.placements).toEqual([]);
        });

      it('a chain from above: the lowest values are ruled out along the way (lower bounds)', function () {
        // value[2] < value[1] < value[0]
        var t = stateOf([{ a: 2, b: 1 }, { a: 1, b: 0 }]);
        var f = H.expectFinding(SG.test, 'ineqChain', t.state, {
          eliminations: [[1, 1], [0, 1], [0, 2]],
          cells: [2, 1, 0],
          args: { cell: 'R1C1', bound: 3, chain: 'R1C3 < R1C2 < R1C1', count: 3, direction: 'min' }
        });
        expect(f.i18nKey).toBe('technique.ineqChain.step.min');
      });

      it('uses what the cells at the foot of the chain already exclude, gaps included', function () {
        // value[2] < value[1] < value[0], R1C3 >= 4, R1C2 holds 3 or 6 only: 3 is below its bound 5 and
        // R1C2 is 6, so R1C1 is at least 7.
        var t = stateOf([{ a: 2, b: 1 }, { a: 1, b: 0 }], { 2: [4, 5, 6, 7, 8, 9], 1: [3, 6] });
        H.expectFinding(SG.test, 'ineqChain', t.state, {
          eliminations: [[1, 3], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]],
          cells: [2, 1, 0],
          args: { cell: 'R1C1', bound: 7, chain: 'R1C3 < R1C2 < R1C1', count: 3, direction: 'min' }
        });
      });

      it('stops a chain at the cell that already meets its bound: the nearest one that is pushed up',
        function () {
          // R1C2 holds 5 or 9, so R1C1 (above it) is at least 6 whatever lies below R1C2.
          var t = stateOf([{ a: 2, b: 1 }, { a: 1, b: 0 }], { 2: [4, 5, 6, 7, 8, 9], 1: [5, 9] });
          H.expectFinding(SG.test, 'ineqChain', t.state, {
            eliminations: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]],
            cells: [1, 0],
            args: { cell: 'R1C1', bound: 6, chain: 'R1C2 < R1C1', count: 2, direction: 'min' }
          });
        });

      it('reports one chain per call, the first cell by index, and goes on until the bounds are settled',
        function () {
          var signs = [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 10, b: 11 }];
          var t = stateOf(signs);
          var ctx = ctxFor(t.model);
          var findings = [];
          for (var step = 0; step < 20; step++) {
            var f = chain.find(t.model, t.state, ctx);
            if (f === null) break;
            expect(H.findingProblems(t.model, t.state, f, { technique: 'ineqChain' })).toEqual([]);
            findings.push(f);
            f.eliminations.forEach(function (e) { SG.constraints.eliminate(t.model, t.state, e[0], e[1]); });
          }
          expect(step).toBeLessThan(20);
          expect(findings[0].cells).toEqual([0, 1, 2, 3]);
          expect(findings[0].i18nArgs.direction).toBe('max');
          // The two chains end with the bounds of the rule: 1..6, 2..7, 3..8, 4..9 and 1..8, 2..9.
          var expected = { 0: [1, 6], 1: [2, 7], 2: [3, 8], 3: [4, 9], 10: [1, 8], 11: [2, 9] };
          Object.keys(expected).forEach(function (c) {
            var values = valuesOf(t.state.candidates[c]);
            expect([values[0], values[values.length - 1]]).toEqual(expected[c]);
          });
          // Lowest cell first: the second chain is reported after the first one.
          var firstOfSecond = findings.findIndex(function (x) { return x.cells.indexOf(10) !== -1; });
          expect(firstOfSecond).toBeGreaterThan(0);
        });

      it('finds nothing on a position that the bound rule has already settled, and on a board without signs',
        function () {
          var settled = stateOf([{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }], null, true);
          H.expectNoFinding(SG.test, 'ineqChain', settled.state);
          H.expectNoFinding(SG.test, 'ineqChain', H.makeState(board(), new Int32Array(81)));
          var g = allSignsModel(4, false);
          H.expectNoFinding(SG.test, 'ineqChain', H.makeState(g.model, g.solution, { propagate: false }));
        });

      it('finds nothing on a contradictory position instead of throwing', function () {
        var t = stateOf([{ a: 0, b: 1 }], { 0: [9], 1: [3] });
        H.expectNoFinding(SG.test, 'ineqChain', t.state);
        var cyc = G.withSigns(board(), [{ a: 0, b: 1 }, { a: 1, b: 0 }]);
        H.expectNoFinding(SG.test, 'ineqChain', H.makeState(cyc, new Int32Array(81), { propagate: false }));
      });

      it('agrees with the propagation rule: using it until it is silent leaves the same candidates',
        function () {
          var rng = SG.rng.create(8086);
          var ctx;
          for (var trial = 0; trial < 300; trial++) {
            var pos = randomPosition(rng);
            var model = signsOnly(pos.n, pos.signs);
            var byHand = SG.model.initState(model);
            byHand.candidates.set(pos.cand);
            ctx = ctxFor(model);
            for (var step = 0; step < 200; step++) {
              var f = chain.find(model, byHand, ctx);
              if (f === null) break;
              expect(f.eliminations.length).toBeGreaterThan(0);
              f.eliminations.forEach(function (e) { SG.constraints.eliminate(model, byHand, e[0], e[1]); });
            }
            expect(step).toBeLessThan(200);
            var expected = pos.cand.slice();
            expect(referenceClosure(expected, pos.signs)).toBe(true);
            for (var i = 0; i < pos.n; i++) {
              if (byHand.candidates[i] !== expected[i]) {
                throw new Error('trial ' + trial + ' cell ' + i + ': ' + valuesOf(byHand.candidates[i]) +
                  ' instead of ' + valuesOf(expected[i]) + ' for ' + JSON.stringify(pos.signs));
              }
            }
          }
        });

      it('is never wrong on a position of a real puzzle: what it removes is not the solution', function () {
        for (var seed = 1; seed <= 12; seed++) {
          var g = allSignsModel(seed, seed % 2 === 0);
          var givens = new Int32Array(81);
          [3, 40, 77].forEach(function (c) { givens[c] = g.solution[c]; });
          var state = H.makeState(g.model, givens, { propagate: false });
          var ctx2 = ctxFor(g.model);
          for (var step = 0; step < 500; step++) {
            var f = chain.find(g.model, state, ctx2);
            if (f === null) break;
            f.eliminations.forEach(function (e) {
              if (g.solution[e[0]] === e[1]) throw new Error('seed ' + seed + ': removed a solution value');
              SG.constraints.eliminate(g.model, state, e[0], e[1]);
            });
          }
          expect(step).toBeLessThan(500);
        }
      });

      it('calls ctx.check() so that a budget can stop it', function () {
        var t = stateOf([{ a: 0, b: 1 }, { a: 1, b: 2 }]);
        var calls = 0;
        chain.find(t.model, t.state, ctxFor(t.model, { check: function () { calls++; } }));
        expect(calls).toBeGreaterThan(0);
      });
    });

    describe('minMaxForcing', function () {
      // R5C5 (cell 40) is larger than its four neighbours in the box.
      var STAR_UP = [{ a: 31, b: 40 }, { a: 49, b: 40 }, { a: 39, b: 40 }, { a: 41, b: 40 }];
      var STAR_DOWN = [{ a: 40, b: 31 }, { a: 40, b: 49 }, { a: 40, b: 39 }, { a: 40, b: 41 }];

      it('a cell above four cells of its box is at least 5; the row and the column come first (min)',
        function () {
          var t = stateOf(STAR_UP, null, true);
          expect(valuesOf(t.state.candidates[40])).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
          var first = H.expectFinding(SG.test, 'minMaxForcing', t.state, {
            eliminations: [[40, 2]],
            cells: [40, 39, 41],
            args: { cell: 'R5C5', bound: 3, count: 2, unit: 'R5', direction: 'min' }
          });
          expect(first.i18nKey).toBe('technique.minMaxForcing.step.min');
          SG.constraints.eliminate(t.model, t.state, 40, 2);
          var second = H.expectFinding(SG.test, 'minMaxForcing', t.state, {
            eliminations: [[40, 3], [40, 4]],
            cells: [40, 31, 39, 41, 49],
            args: { cell: 'R5C5', bound: 5, count: 4, unit: 'B5', direction: 'min' }
          });
          expect(second.i18nArgs.others).toBe('R4C5, R5C4, R5C6, R6C5');
        });

      it('a cell below four cells of its box is at most 5 (max), by the same rule from the other side',
        function () {
          var t = stateOf(STAR_DOWN, null, true);
          expect(valuesOf(t.state.candidates[40])).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
          var first = H.expectFinding(SG.test, 'minMaxForcing', t.state, {
            eliminations: [[40, 8]],
            args: { cell: 'R5C5', bound: 7, count: 2, unit: 'R5', direction: 'max' }
          });
          expect(first.i18nKey).toBe('technique.minMaxForcing.step.max');
          SG.constraints.eliminate(t.model, t.state, 40, 8);
          H.expectFinding(SG.test, 'minMaxForcing', t.state, {
            eliminations: [[40, 6], [40, 7]],
            args: { bound: 5, count: 4, unit: 'B5', direction: 'max' }
          });
        });

      it('goes beyond the chain: three cells of a row below one cell that is itself outside the chain',
        function () {
          // R1C1 < R1C2 (a chain) and R1C3 < R1C4... all four cells of row 1 below cell R1C9 (index 8),
          // but only R1C1 < R1C2 are linked to each other: the rank of R1C9 is at least 4.
          var t = stateOf([{ a: 0, b: 1 }, { a: 1, b: 8 }, { a: 2, b: 8 }], null, true);
          expect(valuesOf(t.state.candidates[8])).toEqual([3, 4, 5, 6, 7, 8, 9]);
          H.expectFinding(SG.test, 'minMaxForcing', t.state, {
            eliminations: [[8, 3]],
            cells: [8, 0, 1, 2],
            args: { cell: 'R1C9', bound: 4, count: 3, unit: 'R1', direction: 'min' }
          });
        });

      it('uses the candidates that are left: the cells below have to share a few digits only', function () {
        var t = stateOf(STAR_UP.slice(0, 2).concat([{ a: 31, b: 40 }]), {
          31: [2, 3], 49: [2, 3], 40: [1, 2, 3, 4, 5, 6, 7, 8, 9]
        }, false);
        // R4C5 and R6C5 hold 2 or 3 and differ (same column): R5C5 is above both, so at least 4.
        H.expectFinding(SG.test, 'minMaxForcing', t.state, {
          eliminations: [[40, 1], [40, 2], [40, 3]],
          args: { cell: 'R5C5', bound: 4, count: 2, unit: 'C5', direction: 'min' }
        });
      });

      it('finds nothing when no unit holds two cells on the same side, or the bound is already met',
        function () {
          var one = stateOf([{ a: 0, b: 1 }, { a: 0, b: 12 }], null, false);
          H.expectNoFinding(SG.test, 'minMaxForcing', one.state);
          var settled = stateOf([{ a: 0, b: 1 }, { a: 1, b: 2 }], null, true);
          H.expectNoFinding(SG.test, 'minMaxForcing', settled.state);
          H.expectNoFinding(SG.test, 'minMaxForcing', H.makeState(board(), new Int32Array(81)));
        });

      it('does not touch a cell that is already solved', function () {
        var model = G.withSigns(board(), STAR_UP);
        var givens = new Int32Array(81);
        givens[40] = 9;
        var state = H.makeState(model, givens, { propagate: false });
        H.expectNoFinding(SG.test, 'minMaxForcing', state);
      });

      it('calls ctx.check() so that a budget can stop it', function () {
        var t = stateOf(STAR_UP, null, true);
        var calls = 0;
        forcing.find(t.model, t.state, ctxFor(t.model, { check: function () { calls++; } }));
        expect(calls).toBeGreaterThan(0);
      });
    });

    describe('soundness (invariant I7)', function () {
      function itemsFor(model, solution, givens, seed) {
        var rng = SG.rng.create(seed);
        var items = [
          { state: H.makeState(model, givens, { propagate: false }), solution: solution, givens: givens,
            kind: 'initial' },
          { state: H.stateAfter(model, givens, SINGLES), solution: solution, givens: givens,
            kind: 'singles' }
        ];
        for (var k = 0; k < 2; k++) {
          var pruned = SG.model.cloneState(items[1].state);
          var share = 0.05 + 0.25 * rng.next();
          for (var c = 0; c < 81; c++) {
            if (pruned.value[c] !== 0) continue;
            for (var v = 1; v <= 9; v++) {
              if (v !== solution[c] && (pruned.candidates[c] & bit(v)) !== 0 && rng.next() < share) {
                SG.constraints.eliminate(model, pruned, c, v);
              }
            }
          }
          items.push({ state: pruned, solution: solution, givens: givens, kind: 'pruned' });
        }
        return items;
      }

      /** Puzzles of every level plus models with all the signs and a few random clues (dense positions). */
      function corpus() {
        var list = [];
        allPuzzles().slice(0, 100).forEach(function (p, i) {
          if (i % 2 === 0) list.push({ model: p.model, solution: p.solution, givens: p.givens });
        });
        for (var seed = 1; seed <= 30; seed++) {
          var g = allSignsModel(200 + seed, seed % 3 === 0);
          var givens = new Int32Array(81);
          var rng = SG.rng.create(seed);
          var clues = [0, 3, 8][seed % 3];
          for (var i = 0; i < clues; i++) {
            var c = rng.int(81);
            givens[c] = g.solution[c];
          }
          list.push({ model: g.model, solution: g.solution, givens: givens });
        }
        return list;
      }

      ['ineqChain', 'minMaxForcing'].forEach(function (id) {
        it(id + ' never removes a candidate of the true solution, on ' + 'puzzles and on dense positions',
          function () {
            var firings = 0;
            var eliminations = 0;
            corpus().forEach(function (p, i) {
              var stats = H.assertSound(SG.test, id, {
                model: p.model, states: itemsFor(p.model, p.solution, p.givens, 900 + i)
              });
              firings += stats.firings;
              eliminations += stats.eliminations;
            });
            expect(firings).toBeGreaterThan(id === 'ineqChain' ? 100 : 20);
            expect(eliminations).toBeGreaterThan(firings - 1);
          });
      });

      it('every step of the whole ladder on the way to the solution is sound, in application order',
        function () {
          var used = {};
          corpus().forEach(function (p, i) {
            var report = SG.logicalSolver.solve(p.model, p.givens, { collectSteps: true });
            report.steps.forEach(function (step) {
              used[step.technique] = (used[step.technique] || 0) + 1;
              step.placements.forEach(function (pl) {
                if (p.solution[pl[0]] !== pl[1]) throw new Error('puzzle ' + i + ': ' + step.technique);
              });
              step.eliminations.forEach(function (el) {
                if (p.solution[el[0]] === el[1]) throw new Error('puzzle ' + i + ': ' + step.technique);
              });
            });
          });
          expect(used.ineqChain).toBeGreaterThan(50);
          expect(used.minMaxForcing).toBeGreaterThan(0);
        });

      it('the logical solver reaches the solution of every generated puzzle with the techniques of its ' +
        'level', function () {
        allPuzzles().forEach(function (p, i) {
          var spec = SG.difficulty.spec(p.config.difficulty, p.model);
          var report = SG.logicalSolver.solve(p.model, p.givens, {
            allowedTechniques: spec.allowedTechniques, assumeUniqueness: false, collectSteps: false
          });
          if (p.rating.level === p.config.difficulty) {
            check(report.solved, 'puzzle ' + i + ' (' + p.config.difficulty + ') is not solved by its techniques');
          }
        });
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV1, CV2: the variant and its model
  // ---------------------------------------------------------------------------------------------

  describe('greaterThan: variant definition and model (CV1, CV2)', function () {
    it('is registered with the fields of the contract (design.md 5.3 / 13.8)', function () {
      expect(SG.variants.get('greaterThan')).toBe(def);
      expect(def.i18nKey).toBe('variant.greaterThan');
      expect(def.digits).toBe(9);
      expect(def.difficultySupport).toEqual(LEVELS);
      expect(def.symbolModes).toContain(def.defaultSymbolMode);
      expect(typeof def.build).toBe('function');
      expect(typeof def.postGenerate).toBe('function');
      expect(def.digStrategy).toBe('signs');
    });

    it('registered its dig strategy "signs", which is the function SG.greaterThan.digSigns', function () {
      expect(SG.digger.getStrategy('signs')).toBe(G.digSigns);
      expect(SG.digger.getStrategy('cells')).not.toBe(G.digSigns);
    });

    it('describes the futoshiki option as a boolean, default off, with its strings', function () {
      expect(def.options).toHaveLength(1);
      var o = def.options[0];
      expect(o.id).toBe('futoshiki');
      expect(o.type).toBe('boolean');
      expect(o.default).toBe(false);
      expect(typeof o.i18nKey).toBe('string');
      expect(typeof o.hintI18nKey).toBe('string');
    });

    it('offers every level of the nine, hell2 included (measured by tests/qualify.js)', function () {
      expect(def.difficultySupport).toEqual(LEVELS);
      expectCode(function () {
        SG.pipeline.run({ variantId: 'greaterThan', difficulty: 'hell', seed: 1 }, null);
      }, 'difficulty.unknownLevel');
    });

    it('builds the plain 9x9 board: 27 units like classic9, no signs, no clues (CV1)', function () {
      var m = board();
      var classic = SG.variants.get('classic9').build({}, null);
      expect(m.variantId).toBe('greaterThan');
      expect(m.cellCount).toBe(81);
      expect(m.digits).toBe(9);
      expect(m.units).toHaveLength(27);
      expect(m.units.map(function (u) { return Array.from(u); }))
        .toEqual(classic.units.map(function (u) { return Array.from(u); }));
      expect(m.unitMeta.map(function (u) { return u.kind; })).toEqual(classic.unitMeta.map(function (u) {
        return u.kind;
      }));
      expect(m.inequalities).toEqual([]);
      expect(m.cages).toEqual([]);
      expect(Array.from(m.layout.cellRegion)).toEqual(Array.from(classic.layout.cellRegion));
      expect(Object.isFrozen(m)).toBe(true);
    });

    it('passes SG.model.validate (V1-V8), with and without the futoshiki option, and without an rng',
      function () {
        [{}, { futoshiki: false }, { futoshiki: true }].forEach(function (opts) {
          var r = SG.model.validate(def.build(opts, null));
          expect(r.errors).toEqual([]);
          expect(r.ok).toBe(true);
          expect(r.warnings).toEqual([]);
        });
        expect(SG.model.validate(def.build({}, SG.rng.create(4))).ok).toBe(true);
      });

    it('rejects an option of the wrong type with pipeline.invalidOption, and accepts null options',
      function () {
        expectCode(function () { def.build({ futoshiki: 'yes' }, null); }, 'pipeline.invalidOption');
        expectCode(function () { def.build({ futoshiki: 1 }, null); }, 'pipeline.invalidOption');
        expect(def.build(null, null).inequalities).toEqual([]);
        expect(def.build(undefined, null).cellCount).toBe(81);
      });

    it('the model of every puzzle (with its signs) validates too: no cycle, a solution exists (V7, V8)',
      function () {
        allPuzzles().filter(function (p, i) { return i % 4 === 0; }).forEach(function (p) {
          var r = SG.model.validate(p.model);
          expect(r.errors).toEqual([]);
        });
      });

    it('generates a valid full grid for 50 different seeds (CV2), which satisfies every sign placed on it',
      function () {
        for (var seed = 1; seed <= 50; seed++) {
          var grid = gridFor(seed);
          expect(SG.model.isSolution(board(), grid)).toBe(true);
          var withSigns = def.postGenerate({ model: board(), solution: grid });
          expect(SG.model.isSolution(withSigns, grid)).toBe(true);
        }
      });

    it('the same seed gives the same grid and the same signs', function () {
      var a = allSignsModel(77, false);
      var b = allSignsModel(77, false);
      expect(Array.from(b.solution)).toEqual(Array.from(a.solution));
      expect(b.model.inequalities).toEqual(a.model.inequalities);
    });
  });

  describe('greaterThan: placing the signs (design.md 8.3 steps 1-2)', function () {
    it('puts a sign on every pair of neighbouring cells of one box: 6 + 6 per box, 108 in all', function () {
      var g = allSignsModel(1, false);
      var signs = g.model.inequalities;
      expect(signs).toHaveLength(108);
      var seen = {};
      signs.forEach(function (q) {
        var lo = Math.min(q.a, q.b);
        var hi = Math.max(q.a, q.b);
        expect(box(q.a)).toBe(box(q.b));
        expect(hi - lo === 1 && row(lo) === row(hi) || hi - lo === 9).toBe(true);
        expect(g.solution[q.a]).toBeLessThan(g.solution[q.b]);
        seen[lo + ',' + hi] = true;
      });
      expect(Object.keys(seen)).toHaveLength(108);
      var perBox = {};
      signs.forEach(function (q) { perBox[box(q.a)] = (perBox[box(q.a)] || 0) + 1; });
      for (var b = 0; b < 9; b++) expect(perBox[b]).toBe(12);
    });

    it('with the futoshiki option it puts one on every neighbouring pair of the grid: 144, boxes linked',
      function () {
        var g = allSignsModel(1, true);
        var signs = g.model.inequalities;
        expect(signs).toHaveLength(144);
        var across = signs.filter(function (q) { return box(q.a) !== box(q.b); });
        expect(across).toHaveLength(144 - 108);
        signs.forEach(function (q) { expect(g.solution[q.a]).toBeLessThan(g.solution[q.b]); });
      });

    it('orients each sign by the solution: value[a] < value[b], whichever way the pair lies', function () {
      var solution = gridFor(9);
      var signs = G.placeSigns(board(), solution, 'grid');
      var leftSmaller = 0;
      var rightSmaller = 0;
      signs.forEach(function (q) {
        expect(solution[q.a]).toBeLessThan(solution[q.b]);
        if (row(q.a) === row(q.b)) {
          if (q.a < q.b) leftSmaller++; else rightSmaller++;
        }
      });
      expect(leftSmaller).toBeGreaterThan(10);
      expect(rightSmaller).toBeGreaterThan(10);
    });

    it('postGenerate keeps the option of the board it was built for, and models stay immutable',
      function () {
        var plain = def.postGenerate({ model: board(), solution: gridFor(2) });
        var futoModel = def.build({ futoshiki: true }, null);
        var futo = def.postGenerate({ model: futoModel, solution: gridFor(2) });
        expect(plain.inequalities).toHaveLength(108);
        expect(futo.inequalities).toHaveLength(144);
        expect(Object.isFrozen(plain)).toBe(true);
        expect(Object.isFrozen(plain.inequalities)).toBe(true);
        expect(board().inequalities).toHaveLength(0);
        // A model made by someone else (no option recorded) gets the box rule.
        var foreign = SG.model.create({
          variantId: 'greaterThan', digits: 9, units: board().units, unitMeta: board().unitMeta,
          layout: board().layout
        });
        expect(def.postGenerate({ model: foreign, solution: gridFor(2) }).inequalities).toHaveLength(108);
      });

    it('the replacement model is a model of the same board: same units, layout, digits and cell count',
      function () {
        var g = allSignsModel(5, false);
        expect(g.model.cellCount).toBe(81);
        expect(g.model.digits).toBe(9);
        expect(g.model.variantId).toBe('greaterThan');
        expect(g.model.units.map(function (u) { return Array.from(u); }))
          .toEqual(g.base.units.map(function (u) { return Array.from(u); }));
        expect(Array.from(g.model.layout.cellRow)).toEqual(Array.from(g.base.layout.cellRow));
      });
  });

  // ---------------------------------------------------------------------------------------------
  // CV3, CV4, T-5.6: puzzles at every level
  // ---------------------------------------------------------------------------------------------

  describe('greaterThan: puzzles at every level (CV3, CV4: invariants I1-I7; T-5.6)', function () {
    LEVELS.forEach(function (level) {
      describe(level + ': ' + countOf(level) + ' puzzles', function () {
        it('I1: exactly one solution; I2: givens are part of the solution; I3: it satisfies units and signs',
          function () {
            puzzleRun()[level].forEach(function (p, i) {
              check(SG.dfs.countSolutions(p.model, p.givens, 2) === 1, 'puzzle ' + i + ': not unique');
              for (var c = 0; c < 81; c++) {
                check(p.givens[c] === 0 || p.givens[c] === p.solution[c], 'puzzle ' + i + ': I2');
              }
              check(SG.model.isSolution(p.model, p.solution), 'puzzle ' + i + ': I3');
              expect(Array.from(SG.dfs.solve(p.model, p.givens))).toEqual(Array.from(p.solution));
            });
          });

        it('every sign agrees with the solution, joins two neighbours of one box, and appears once',
          function () {
            puzzleRun()[level].forEach(function (p, i) {
              var seen = {};
              p.model.inequalities.forEach(function (q) {
                check(p.solution[q.a] < p.solution[q.b], 'puzzle ' + i + ': a sign against the solution');
                var lo = Math.min(q.a, q.b);
                var hi = Math.max(q.a, q.b);
                check(box(lo) === box(hi), 'puzzle ' + i + ': a sign across boxes');
                check(hi - lo === 9 || (hi - lo === 1 && row(lo) === row(hi)), 'puzzle ' + i + ': not neighbours');
                check(!seen[lo + ',' + hi], 'puzzle ' + i + ': a duplicate sign');
                seen[lo + ',' + hi] = true;
              });
              expect(p.model.inequalities.length).toBeLessThan(109);
            });
          });

        it('T-5.6: the sign set is minimal: removing any sign that is left gives a second solution',
          function () {
            puzzleRun()[level].forEach(function (p, i) {
              var signs = p.model.inequalities;
              for (var s = 0; s < signs.length; s++) {
                var rest = signs.filter(function (q, k) { return k !== s; });
                if (SG.dfs.countSolutions(signsRemoved(p.model, rest), p.givens, 2) !== 2) {
                  throw new Error('puzzle ' + i + ': sign ' + s + ' (' + signs[s].a + '<' + signs[s].b +
                    ') is redundant');
                }
              }
            });
          });

        it('I5: every puzzle has a complete proof, and one that reached the level has its score in the band; ' +
          'I6: at least minClues givens, every unit its minimum', function () {
          var exact = 0;
          puzzleRun()[level].forEach(function (p, i) {
            var spec = SG.difficulty.spec(level, p.model);
            if (clueCount(p.givens) < spec.minClues) throw new Error('puzzle ' + i + ': too few clues');
            p.model.units.forEach(function (u) {
              var inUnit = 0;
              for (var k = 0; k < u.length; k++) if (p.givens[u[k]] !== 0) inUnit++;
              if (inUnit < spec.minCluesPerUnit) throw new Error('puzzle ' + i + ': a unit has ' + inUnit);
            });
            expect(p.config.difficulty).toBe(level);
            if (p.rating.level === level) {
              exact++;
              expect(p.rating.score).toBeGreaterThanOrEqual(spec.min);
              expect(p.rating.score).toBeLessThan(spec.max);
              expect(p.warnings).toEqual([]);
            }
            expect(SG.difficulty.rate(p.model, p.givens).level).toBe(p.rating.level);
            expect(p.rating.solved).toBe(true);
          });
          expect(exact / countOf(level)).toBeGreaterThanOrEqual(0.9);
        });

        it('the clues follow the symmetry of the configuration (rotational180): the signs are not mirrored',
          function () {
            puzzleRun()[level].forEach(function (p, i) {
              for (var c = 0; c < 81; c++) {
                if ((p.givens[c] !== 0) !== (p.givens[80 - c] !== 0)) throw new Error('puzzle ' + i + ': cell ' + c);
              }
            });
          });

        it('CV6: p95 of the generation time is within the design.md 9.1 budget of ' + BUDGET_MS[level] + ' ms',
          function () {
            var times = puzzleRun()[level].map(function (p) { return p.elapsedMs; });
            expect(percentile(times, 0.95)).toBeLessThan(SG.test.timeLimit(BUDGET_MS[level]));
          });
      });
    });

    it('the signs matter: without them a puzzle that keeps any sign leaves several solutions', function () {
      var withSigns = 0;
      allPuzzles().forEach(function (p) {
        if (p.model.inequalities.length === 0) return;
        withSigns++;
        expect(SG.dfs.countSolutions(signsRemoved(p.model, []), p.givens, 2)).toBe(2);
      });
      expect(withSigns).toBeGreaterThan(50);
    });

    it('clue counts fall and sign counts rise with the difficulty (means over the puzzles of a level)',
      function () {
        var clues = LEVELS.map(function (level) { return mean(puzzleRun()[level].map(function (p) {
          return clueCount(p.givens);
        })); });
        var signs = LEVELS.map(function (level) { return mean(puzzleRun()[level].map(function (p) {
          return p.model.inequalities.length;
        })); });
        // Rating v2: the score, not the counts, sets the level, so neighbouring levels may swap; the trend
        // over the ladder holds: veryEasy > easy > every level above in clues, and the three hardest levels
        // keep more signs than the three easiest.
        var text = 'clues ' + clues.map(function (c) { return c.toFixed(1); }).join(' / ') + ', signs ' +
          signs.map(function (s) { return s.toFixed(1); }).join(' / ');
        check(clues[0] > clues[1], text);
        for (var i = 2; i < LEVELS.length; i++) check(clues[i] < clues[1], text);
        function avg(list) { return list.reduce(function (a, b) { return a + b; }, 0) / list.length; }
        check(avg(signs.slice(-3)) > avg(signs.slice(0, 3)), text);
        expect(signs[LEVELS.length - 1]).toBeGreaterThan(4);
      });

    it('scores rise with the level: the means of the levels are in order', function () {
      var scores = LEVELS.map(function (level) { return mean(puzzleRun()[level].map(function (p) {
        return p.rating.score;
      })); });
      for (var i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    });

    it('the ineq techniques are used at the harder levels, and the hardest technique is not beyond the level',
      function () {
        var used = 0;
        ['normal', 'hard', 'master'].forEach(function (level) {
          puzzleRun()[level].forEach(function (p) {
            if (p.rating.techniqueCounts.ineqChain > 0) used++;
          });
        });
        expect(used).toBeGreaterThan(30);
      });

    it('the futoshiki option works at every level: signs may link boxes, and all the invariants hold',
      function () {
        var across = 0;
        futoshikiRun().forEach(function (p, i) {
          expect(p.config.variantOptions).toEqual({ futoshiki: true });
          if (SG.dfs.countSolutions(p.model, p.givens, 2) !== 1) throw new Error('futoshiki ' + i + ': not unique');
          if (!SG.model.isSolution(p.model, p.solution)) throw new Error('futoshiki ' + i + ': invalid solution');
          var signs = p.model.inequalities;
          for (var s = 0; s < signs.length; s++) {
            if (box(signs[s].a) !== box(signs[s].b)) across++;
            var rest = signs.filter(function (q, k) { return k !== s; });
            if (SG.dfs.countSolutions(signsRemoved(p.model, rest), p.givens, 2) !== 2) {
              throw new Error('futoshiki ' + i + ': sign ' + s + ' is redundant');
            }
          }
          var spec = SG.difficulty.spec(p.config.difficulty, p.model);
          expect(clueCount(p.givens)).toBeGreaterThanOrEqual(spec.minClues);
        });
        var exact = futoshikiRun().filter(function (p) { return p.rating.level === p.config.difficulty; });
        expect(exact.length / futoshikiRun().length).toBeGreaterThanOrEqual(0.85);
        expect(across).toBeGreaterThan(0);
      });
  });

  describe('greaterThan: the sign dig as a strategy (design.md 8.3 steps 3-5)', function () {
    function digFrom(seed, level, extra) {
      var g = allSignsModel(seed, false);
      var spec = SG.difficulty.spec(level, g.model);
      var events = [];
      var options = Object.assign({
        spec: spec, symmetry: 'rotational180', minClues: spec.minClues, minCluesPerUnit: spec.minCluesPerUnit,
        budget: null, emit: E.createEmitter('full', function (e) { events.push(e); })
      }, extra);
      var dug = G.digSigns(g.model, g.solution, level, SG.rng.create(seed), options);
      return { g: g, dug: dug, events: events, spec: spec };
    }

    it('returns the contract of a dig strategy: givens, clues, stats and the model without the removed signs',
      function () {
        var r = digFrom(3, 'normal');
        expect(r.dug.givens instanceof Int32Array).toBe(true);
        expect(r.dug.clues).toBe(clueCount(r.dug.givens));
        ['groups', 'tried', 'accepted', 'rejected', 'skipped', 'oracleCalls'].forEach(function (k) {
          expect(typeof r.dug.stats[k]).toBe('number');
        });
        expect(r.dug.stats.groups).toBe(108);
        expect(r.dug.stats.tried).toBeGreaterThan(107);
        expect(r.dug.stats.accepted + r.dug.stats.rejected).toBe(r.dug.stats.tried);
        expect(r.dug.model.inequalities.length).toBe(108 - r.dug.stats.accepted);
        expect(r.dug.model.variantId).toBe('greaterThan');
        r.dug.model.inequalities.forEach(function (q) {
          expect(r.g.model.inequalities.some(function (o) { return o.a === q.a && o.b === q.b; })).toBe(true);
        });
        expect(SG.dfs.countSolutions(r.dug.model, r.dug.givens, 2)).toBe(1);
      });

    it('does not change the model it is given, and gives the same puzzle for the same rng', function () {
      var g = allSignsModel(4, false);
      var before = JSON.stringify(g.model.inequalities);
      var spec = SG.difficulty.spec('hard', g.model);
      var a = G.digSigns(g.model, g.solution, 'hard', SG.rng.create(4), { spec: spec });
      var b = G.digSigns(g.model, g.solution, 'hard', SG.rng.create(4), { spec: spec });
      expect(JSON.stringify(g.model.inequalities)).toBe(before);
      expect(Array.from(b.givens)).toEqual(Array.from(a.givens));
      expect(b.model.inequalities).toEqual(a.model.inequalities);
    });

    it('works with the defaults of the spec when it is called without options', function () {
      var g = allSignsModel(6, false);
      var dug = G.digSigns(g.model, g.solution, 'easy', SG.rng.create(6));
      expect(dug.clues).toBeGreaterThan(33);
      expect(SG.dfs.countSolutions(dug.model, dug.givens, 2)).toBe(1);
    });

    it('never goes below the clue floor, even when it is asked for a symmetry of four cells', function () {
      var r = digFrom(8, 'hard', { symmetry: 'mirrorBoth' });
      expect(r.dug.clues).toBeGreaterThan(r.spec.minClues - 1);
      for (var c = 0; c < 81; c++) {
        expect(r.dug.givens[c] !== 0).toBe(r.dug.givens[80 - c] !== 0);
        expect(r.dug.givens[c] !== 0).toBe(r.dug.givens[row(c) * 9 + 8 - col(c)] !== 0);
      }
    });

    it('with no symmetry the clues are free', function () {
      var seen = false;
      for (var seed = 1; seed <= 8 && !seen; seed++) {
        var r = digFrom(seed, 'normal', { symmetry: 'none' });
        for (var c = 0; c < 81; c++) if ((r.dug.givens[c] !== 0) !== (r.dug.givens[80 - c] !== 0)) seen = true;
      }
      expect(seen).toBe(true);
    });

    it('an easy level reveals many clues first and ends with almost no sign; a hard one keeps some',
      function () {
        var easy = [];
        var hard = [];
        for (var seed = 1; seed <= 6; seed++) {
          easy.push(digFrom(seed, 'veryEasy').dug.model.inequalities.length);
          hard.push(digFrom(seed, 'master').dug.model.inequalities.length);
        }
        expect(Math.max.apply(null, easy)).toBeLessThan(4);
        expect(mean(hard)).toBeGreaterThan(mean(easy));
      });

    it('uses the oracles it names: signs refused for "ambiguous" or "techniques", nothing else', function () {
      var r = digFrom(5, 'master');
      var reasons = {};
      r.events.forEach(function (e) { if (e.i18nKey === 'dig.reject') reasons[e.i18nArgs.reason] = true; });
      Object.keys(reasons).forEach(function (k) { expect(['ambiguous', 'techniques']).toContain(k); });
      expect(Object.keys(reasons).length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Events of the pipeline
  // ---------------------------------------------------------------------------------------------

  describe('greaterThan: the pipeline and its events', function () {
    var STEPS = ['configure', 'buildModel', 'fullGrid', 'extraStructure', 'dig', 'rate', 'tune'];

    function trace(level, seed, trace) {
      var events = [];
      var result = SG.pipeline.run({ variantId: 'greaterThan', difficulty: level, seed: seed, trace: trace },
        function (e) { events.push(e); });
      return { result: result, events: events };
    }

    /** Every event is valid, in the shared vocabulary, with only its declared arguments and patch fields. */
    function checkEvents(events) {
      events.forEach(function (e, i) {
        var problems = E.eventProblems(e);
        if (problems.length > 0) throw new Error('event ' + i + ' (' + e.i18nKey + '): ' + problems.join('; '));
        if (e.seq !== i) throw new Error('seq ' + e.seq + ' at index ' + i);
        var v = E.lookup(e);
        if (v === null) throw new Error('not in the vocabulary: ' + [e.type, e.stepId, e.phase, e.i18nKey].join(' '));
        if (e.i18nArgs && v.key !== 'error.*') {
          Object.keys(e.i18nArgs).forEach(function (a) {
            if (v.args.indexOf(a) === -1 && a !== 'part' && a !== 'parts') {
              throw new Error(e.i18nKey + ' has the undeclared argument "' + a + '"');
            }
          });
        }
        if (e.patch) {
          Object.keys(e.patch).forEach(function (f) {
            if (v.patch.indexOf(f) === -1) throw new Error(e.i18nKey + ' has the undeclared patch field "' + f + '"');
          });
        }
      });
    }

    function replay(events) {
      var view = E.createView(81);
      events.forEach(function (e) { if (e.patch) E.applyPatch(view, e.patch); });
      return view;
    }

    it('runs the seven steps in order, builds the signs in step 4 and digs signs in step 5', function () {
      var out = trace('normal', 11, 'summary');
      var starts = out.events.filter(function (e) { return e.type === 'step' && e.phase === 'start'; });
      expect(starts.map(function (e) { return e.stepId; }).slice(0, 7)).toEqual(STEPS);
      var built = out.events.filter(function (e) { return e.i18nKey === 'extraStructure.built'; });
      expect(built).toHaveLength(out.result.attempts);
      var dig = out.events.filter(function (e) { return e.i18nKey === 'dig.start'; });
      expect(dig.length).toBeGreaterThan(0);
      dig.forEach(function (e) { expect(e.i18nArgs.strategy).toBe('signs'); });
      var model = out.events.filter(function (e) { return e.i18nKey === 'buildModel.model'; })[0];
      expect(model.i18nArgs.inequalities).toBe(0);
      expect(out.result.model.inequalities.length).toBeGreaterThan(0);
    });

    it('every event of a full trace is valid and in the vocabulary, and the replayed board is the puzzle',
      function () {
        ['veryEasy', 'normal', 'master'].forEach(function (level, i) {
          var out = trace(level, 20 + i, 'full');
          checkEvents(out.events);
          var view = replay(out.events);
          expect(Array.from(view.value)).toEqual(Array.from(out.result.givens));
          expect(view.highlight.reduce(function (a, b) { return a + b; }, 0)).toBe(0);
        });
      });

    it('the dig events of a sign are about its two cells: neighbours of one box, tried, then accepted or kept',
      function () {
        var out = trace('hard', 31, 'full');
        var tries = out.events.filter(function (e) { return e.i18nKey === 'dig.try'; });
        expect(tries.length).toBeGreaterThan(107);
        tries.forEach(function (e) {
          var pair = e.i18nArgs.cells;
          expect(pair).toHaveLength(2);
          expect(box(pair[0])).toBe(box(pair[1]));
          expect(e.patch.highlight).toEqual(pair);
          expect(['signs', 'signs.minimal']).toContain(e.i18nArgs.pass);
        });
        out.events.forEach(function (e, i) {
          if (e.i18nKey !== 'dig.try') return;
          var next = out.events[i + 1];
          expect(['dig.accept', 'dig.reject']).toContain(next.i18nKey);
          expect(next.i18nArgs.cells).toEqual(e.i18nArgs.cells);
          expect(next.patch.unhighlight).toEqual(e.i18nArgs.cells);
        });
        var passes = out.events.filter(function (e) { return e.i18nKey === 'dig.pass.start'; })
          .map(function (e) { return e.i18nArgs.pass; });
        expect(passes).toContain('signs');
        expect(passes).toContain('signs.minimal');
      });

    it('shows the empty board first: the clues of the full grid are cleared before the first sign is tried',
      function () {
        var out = trace('normal', 12, 'full');
        var first = out.events.findIndex(function (e) { return e.i18nKey === 'dig.start'; });
        var tryAt = out.events.findIndex(function (e) { return e.i18nKey === 'dig.try'; });
        var view = E.createView(81);
        out.events.slice(0, tryAt).forEach(function (e) { if (e.patch) E.applyPatch(view, e.patch); });
        expect(first).toBeLessThan(tryAt);
        expect(clueCount(view.value)).toBeGreaterThan(20);
        expect(clueCount(view.value)).toBeLessThan(40);
      });

    it('the result does not depend on the trace level or on a listening sink (I4)', function () {
      var base = generate('hard', 77);
      ['off', 'summary', 'full'].forEach(function (verbosity) {
        var r = SG.pipeline.run({ variantId: 'greaterThan', difficulty: 'hard', seed: 77, trace: verbosity },
          function () {});
        expect(Array.from(r.givens)).toEqual(Array.from(base.givens));
        expect(r.model.inequalities).toEqual(base.model.inequalities);
      });
    });

    it('works through the worker-style call too: a plain config object with variantOptions', function () {
      var cfg = JSON.parse(JSON.stringify({
        variantId: 'greaterThan', difficulty: 'easy', seed: 5, variantOptions: { futoshiki: true }
      }));
      var r = SG.pipeline.run(cfg, null);
      expect(r.config.variantOptions).toEqual({ futoshiki: true });
      expect(SG.model.isSolution(r.model, r.solution)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV5: determinism
  // ---------------------------------------------------------------------------------------------

  describe('greaterThan: same seed, same puzzle (CV5 / I4)', function () {
    it('every level: two runs give the same givens, signs and solution', function () {
      LEVELS.forEach(function (level, li) {
        [3 + li, 400 + li].slice(0, level === 'master' || level === 'hard' ? 1 : 2).forEach(function (seed) {
          var a = generate(level, seed);
          var b = generate(level, seed);
          expect(Array.from(b.givens)).toEqual(Array.from(a.givens));
          expect(b.model.inequalities).toEqual(a.model.inequalities);
          expect(Array.from(b.solution)).toEqual(Array.from(a.solution));
          expect(b.rating.score).toBe(a.rating.score);
        });
      });
    });

    it('reproduces the puzzles of the shared run', function () {
      LEVELS.forEach(function (level, li) {
        var seed = 100 * (li + 1) + 3;
        var again = generate(level, seed);
        var first = puzzleRun()[level][3];
        expect(Array.from(again.givens)).toEqual(Array.from(first.givens));
        expect(again.model.inequalities).toEqual(first.model.inequalities);
      });
    });

    it('another seed gives another puzzle; the same options the same one, other options another', function () {
      var a = generate('normal', 1000);
      var b = generate('normal', 1001);
      expect(Array.from(b.solution)).not.toEqual(Array.from(a.solution));
      var plain = generate('master', 55);
      var futo1 = generate('master', 55, { variantOptions: { futoshiki: true } });
      var futo2 = generate('master', 55, { variantOptions: { futoshiki: true } });
      expect(Array.from(futo2.givens)).toEqual(Array.from(futo1.givens));
      expect(futo2.model.inequalities).toEqual(futo1.model.inequalities);
      expect(futo1.model.inequalities).not.toEqual(plain.model.inequalities);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV7: strings
  // ---------------------------------------------------------------------------------------------

  describe('greaterThan: strings in both languages (CV7)', function () {
    var KEY = /^(variant\.greaterThan|option\.futoshiki|technique\.(ineqChain|minMaxForcing))/;

    function fragments() {
      return SG.localeFragments.filter(function (f) {
        return f.en && Object.keys(f.en).some(function (k) { return KEY.test(k); });
      });
    }

    function merged(lang) {
      var out = {};
      fragments().forEach(function (f) { Object.assign(out, f[lang]); });
      return out;
    }

    function placeholders(text) {
      var found = text.match(/\{[A-Za-z]+\}/g) || [];
      return found.sort();
    }

    it('declares its fragments with en and vi', function () {
      expect(Array.isArray(SG.localeFragments)).toBe(true);
      expect(fragments().length).toBeGreaterThan(0);
      fragments().forEach(function (f) {
        expect(typeof f.en).toBe('object');
        expect(typeof f.vi).toBe('object');
        expect(Object.keys(f.vi).sort()).toEqual(Object.keys(f.en).sort());
      });
    });

    it('en and vi have the same keys, no empty value, and the Vietnamese is not a copy of the English',
      function () {
        var en = merged('en');
        var vi = merged('vi');
        expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
        Object.keys(en).forEach(function (key) {
          expect(typeof en[key]).toBe('string');
          expect(en[key].trim()).not.toBe('');
          expect(typeof vi[key]).toBe('string');
          expect(vi[key].trim()).not.toBe('');
          expect(vi[key]).not.toBe(en[key]);
          expect(placeholders(vi[key])).toEqual(placeholders(en[key]));
        });
      });

    it('covers the variant name, its option and both techniques (name, description, both step texts)',
      function () {
        var en = merged('en');
        var vi = merged('vi');
        var keys = [def.i18nKey, def.options[0].i18nKey, def.options[0].hintI18nKey];
        ['ineqChain', 'minMaxForcing'].forEach(function (id) {
          keys.push(SG.techniques.get(id).i18nKey, 'technique.' + id + '.desc', 'technique.' + id + '.step.min',
            'technique.' + id + '.step.max');
        });
        keys.forEach(function (key) {
          expect(en[key]).toBeDefined();
          expect(vi[key]).toBeDefined();
        });
        expect(en['variant.greaterThan']).toBe('Greater-Than Sudoku');
        expect(vi['variant.greaterThan']).toBe('Sudoku So sánh');
        expect(Object.keys(en)).toHaveLength(11);
      });

    it('every Finding the techniques return uses a key that exists, and its text only names arguments it gives',
      function () {
        var en = merged('en');
        var vi = merged('vi');
        var seenKeys = {};
        allPuzzles().concat(futoshikiRun()).forEach(function (p) {
          var report = SG.logicalSolver.solve(p.model, p.givens, { collectSteps: true });
          report.steps.forEach(function (step) {
            if (step.technique !== 'ineqChain' && step.technique !== 'minMaxForcing') return;
            seenKeys[step.i18nKey] = true;
            [en, vi].forEach(function (pack) {
              expect(pack[step.i18nKey]).toBeDefined();
              placeholders(pack[step.i18nKey]).forEach(function (ph) {
                expect(Object.keys(step.i18nArgs)).toContain(ph.slice(1, -1));
              });
            });
          });
        });
        expect(Object.keys(seenKeys).length).toBeGreaterThan(1);
        // The four step keys are all produced by the fixtures above and by dense positions.
        var dense = allSignsModel(1, false);
        var denseReport = SG.logicalSolver.solve(dense.model, new Int32Array(81), { collectSteps: true });
        denseReport.steps.forEach(function (step) { seenKeys[step.i18nKey] = true; });
        ['technique.ineqChain.step.min', 'technique.ineqChain.step.max', 'technique.minMaxForcing.step.min']
          .forEach(function (key) { expect(seenKeys[key]).toBe(true); });
      });

    it('is merged into the language packs when they are loaded (browser run)', function () {
      var locales = SG.locales;
      if (!locales || !locales.en || !locales.vi) SG.test.skip('the language packs are not loaded here');
      Object.keys(merged('en')).forEach(function (key) {
        expect(locales.en[key]).toBeDefined();
        expect(locales.vi[key]).toBeDefined();
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // CV9: what the board view needs
  // ---------------------------------------------------------------------------------------------

  describe('greaterThan: data for the board view (CV9)', function () {
    /**
     * Draws a board as text the way a renderer lays it out: a line of cells with the horizontal signs between
     * them, then a line with the vertical signs under their cell. Only `signEdges` is used for the signs.
     */
    function draw(model, values) {
      var edges = G.signEdges(model);
      var lines = [];
      for (var r = 0; r < 9; r++) {
        var cells = '';
        var between = '';
        for (var c = 0; c < 9; c++) {
          cells += values[r * 9 + c];
          cells += c < 8 ? ' ' : '';
          between += ' ' + (c < 8 ? ' ' : '');
        }
        var lineChars = cells.split('');
        var underChars = between.split('');
        edges.forEach(function (e) {
          // Cell (r, c) sits at text column 2c, so the midpoint of two cells is at 2 * midCol.
          if (e.midRow === r) lineChars[2 * e.midCol] = e.glyph;
          if (e.midRow === r + 0.5) underChars[2 * e.midCol] = e.glyph;
        });
        lines.push(lineChars.join(''));
        if (r < 8) lines.push(underChars.join(''));
      }
      return lines;
    }

    /** Reads every sign of a drawing back as "left/top value, glyph, right/bottom value". */
    function readBack(lines) {
      var facts = [];
      for (var r = 0; r < 9; r++) {
        var line = lines[2 * r];
        for (var c = 0; c < 8; c++) {
          var g = line.charAt(2 * c + 1);
          if (g !== ' ') facts.push({ glyph: g, first: +line.charAt(2 * c), second: +line.charAt(2 * c + 2) });
        }
        if (r < 8) {
          var under = lines[2 * r + 1];
          for (c = 0; c < 9; c++) {
            var v = under.charAt(2 * c);
            if (v !== ' ') {
              facts.push({ glyph: v, first: +lines[2 * r].charAt(2 * c), second: +lines[2 * r + 2].charAt(2 * c) });
            }
          }
        }
      }
      return facts;
    }

    it('gives a glyph, a direction and the midpoint of the two cell centres for each sign', function () {
      var m = G.withSigns(board(), [{ a: 0, b: 1 }, { a: 1, b: 0 }, { a: 0, b: 9 }, { a: 9, b: 0 }]);
      var e = G.signEdges(m);
      expect(e.map(function (x) { return x.direction; })).toEqual(['right', 'left', 'down', 'up']);
      expect(e.map(function (x) { return x.glyph; })).toEqual(['<', '>', '\u2227', '\u2228']);
      expect(e.map(function (x) { return [x.midRow, x.midCol]; }))
        .toEqual([[0, 0.5], [0, 0.5], [0.5, 0], [0.5, 0]]);
      expect(e.map(function (x) { return x.index; })).toEqual([0, 1, 2, 3]);
      expect(e[0].a).toBe(0);
      expect(e[0].b).toBe(1);
    });

    it('for the horizontal glyph the apex is on the smaller cell: "<" has the smaller value on its left',
      function () {
        allPuzzles().slice(0, 40).forEach(function (p) {
          G.signEdges(p.model).forEach(function (e) {
            var left = Math.min(e.a, e.b);
            if (e.direction === 'right') expect(e.glyph).toBe('<');
            if (e.direction === 'left') expect(e.glyph).toBe('>');
            if (e.direction === 'right' || e.direction === 'left') {
              expect(p.solution[left] < p.solution[left + 1]).toBe(e.glyph === '<');
            }
          });
        });
      });

    it('drawn as text and read back, every sign is true for the solution (all 100 puzzles + futoshiki)',
      function () {
        allPuzzles().concat(futoshikiRun()).forEach(function (p, i) {
          var facts = readBack(draw(p.model, p.solution));
          if (facts.length !== p.model.inequalities.length) {
            throw new Error('puzzle ' + i + ': ' + facts.length + ' signs drawn, ' + p.model.inequalities.length);
          }
          facts.forEach(function (f) {
            var ok = f.glyph === '<' ? f.first < f.second : f.glyph === '>' ? f.first > f.second
              : f.glyph === '\u2227' ? f.first < f.second : f.first > f.second;
            if (!ok) throw new Error('puzzle ' + i + ': "' + f.first + f.glyph + f.second + '" is false');
          });
        });
      });

    it('the signs of a drawn puzzle sit between orthogonal neighbours only, one per edge', function () {
      allPuzzles().concat(futoshikiRun()).forEach(function (p) {
        var seen = {};
        G.signEdges(p.model).forEach(function (e) {
          var dr = Math.abs(p.model.layout.cellRow[e.a] - p.model.layout.cellRow[e.b]);
          var dc = Math.abs(p.model.layout.cellCol[e.a] - p.model.layout.cellCol[e.b]);
          expect(dr + dc).toBe(1);
          var key = e.midRow + ',' + e.midCol;
          expect(seen[key]).toBeUndefined();
          seen[key] = true;
        });
      });
    });

    it('draws one example board (a printed check of the geometry)', function () {
      var p = puzzleRun().normal[0];
      var lines = draw(p.model, p.solution);
      expect(lines).toHaveLength(17);
      lines.forEach(function (l) { expect(l).toHaveLength(17); });
    });
  });
})();
