// The logical techniques as a whole (task T-2.9, design.md sections 15.2 and 15.3). The suites tech-basic,
// tech-subset, tech-fish, tech-wing and tech-chain test each group in depth; this one checks what must
// hold for EVERY technique and is written over SG.techniques.list(), so a technique registered later is
// covered without editing it:
//   - the registry is consistent and the cost table of SG.difficulty covers it,
//   - every technique has fixtures (>= 2 positions where it fires, >= 1 where it does not), taken from
//     tests/fixtures/techniques.js,
//   - invariant I7: a technique never eliminates the true solution (soundness sweep),
//   - the whole ladder solves labelled puzzles soundly and deterministically.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var H = SG.techHelper;
  var F = SG.fixtures.techniques;
  var model9 = H.model('classic9');

  var all = SG.techniques.list();
  /** Techniques of the classic ladder: the ones that apply to every variant. */
  var classic = all.filter(function (t) { return t.variantScope === null; });

  /** States per technique in the soundness sweep; the chain group is dearer per state, so it gets fewer. */
  var SWEEP_STATES = { chain: 120 };
  var SWEEP_DEFAULT = 300;

  /** How often each technique fired in the sweep: filled by the tests below, read by the last one. */
  var firings = {};

  function stateOf(fixture) {
    return fixture.after !== null
      ? H.stateAfter(model9, fixture.puzzle, fixture.after)
      : H.makeState(model9, fixture.puzzle, { propagate: fixture.propagate });
  }

  function pairs(list) {
    return list.map(function (p) { return p[0] + ':' + p[1]; }).sort();
  }

  // ---------------------------------------------------------------------------------------------
  // Registry
  // ---------------------------------------------------------------------------------------------

  describe('techniques: registry', function () {
    it('has the 21 techniques of the classic ladder registered', function () {
      expect(classic.map(function (t) { return t.id; })).toEqual(F.ladder);
    });

    it('lists techniques cheapest first: orders ascend and ids are unique', function () {
      var seen = {};
      all.forEach(function (t, i) {
        expect(seen[t.id]).toBeUndefined();
        seen[t.id] = true;
        if (i > 0) expect(t.order).toBeGreaterThanOrEqual(all[i - 1].order);
      });
    });

    it('gives every technique a group of the registry, a name key and a positive cost', function () {
      all.forEach(function (t) {
        expect(SG.techniques.GROUPS).toContain(t.group);
        expect(typeof t.i18nKey).toBe('string');
        expect(t.baseCost).toBeGreaterThan(0);
        expect(typeof t.find).toBe('function');
      });
    });

    it('is covered by the calibrated cost table of SG.difficulty (add a COSTS entry for a new technique)',
      function () {
        var missing = classic.filter(function (t) {
          return !Object.prototype.hasOwnProperty.call(SG.difficulty.COSTS, t.id);
        }).map(function (t) { return t.id; });
        expect(missing).toEqual([]);
        Object.keys(SG.difficulty.COSTS).forEach(function (id) {
          expect(SG.techniques.has(id)).toBe(true);
          expect(SG.difficulty.COSTS[id]).toBeGreaterThan(0);
        });
      });

    it('puts the techniques of a group in the ladder in the order of their calibrated costs', function () {
      SG.techniques.GROUPS.forEach(function (group) {
        var costs = all.filter(function (t) { return t.group === group; }).map(function (t) {
          return SG.difficulty.costOf(t.id);
        });
        for (var i = 1; i < costs.length; i++) expect(costs[i]).toBeGreaterThan(costs[i - 1]);
      });
    });

    it('marks only the uniqueness-assuming technique, which the oracle must switch off', function () {
      var assuming = all.filter(function (t) { return t.assumesUniqueness; })
        .map(function (t) { return t.id; });
      expect(assuming).toEqual(['uniqueRectangle']);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Fixtures: at least two positive and one negative per technique
  // ---------------------------------------------------------------------------------------------

  describe('techniques: fixtures (fixtures/techniques.js)', function () {
    it('has fixtures for exactly the techniques of the classic ladder (add them for a new one)', function () {
      var ids = classic.map(function (t) { return t.id; });
      var missing = ids.filter(function (id) { return F.ids.indexOf(id) === -1; });
      var stale = F.ids.filter(function (id) { return ids.indexOf(id) === -1; });
      expect(missing).toEqual([]);
      expect(stale).toEqual([]);
    });

    classic.forEach(function (tech) {
      var entry = F.byId[tech.id];
      if (!entry) return;

      describe(tech.id, function () {
        it('has at least 2 positive and 1 negative fixture', function () {
          expect(entry.positive.length).toBeGreaterThanOrEqual(2);
          expect(entry.negative.length + F.nothingToFind.length).toBeGreaterThanOrEqual(1);
          expect(entry.negative.length).toBeGreaterThanOrEqual(1);
        });

        entry.positive.forEach(function (fixture) {
          it('finds exactly the recorded deduction: ' + fixture.name, function () {
            var state = stateOf(fixture);
            var finding = H.expectFinding(SG.test, tech.id, state, {
              placements: fixture.expect.placements,
              eliminations: fixture.expect.eliminations
            });
            expect(pairs(finding.placements)).toEqual(pairs(fixture.expect.placements));
            expect(pairs(finding.eliminations)).toEqual(pairs(fixture.expect.eliminations));
          });
        });

        entry.negative.forEach(function (fixture) {
          it('finds nothing: ' + fixture.name, function () {
            H.expectNoFinding(SG.test, tech.id, stateOf(fixture));
          });
        });

        it('finds nothing on the empty board and on a solved board', function () {
          F.nothingToFind.forEach(function (fixture) {
            H.expectNoFinding(SG.test, tech.id, stateOf(fixture));
          });
          var solved = SG.fixtures.classic.unique[0].solution;
          H.expectNoFinding(SG.test, tech.id, H.makeState(model9, solved, { propagate: false }));
        });

        it('is reproducible: asking twice gives the same Finding and leaves the state alone', function () {
          var state = stateOf(entry.positive[0]);
          var snapshot = SG.model.cloneState(state);
          var ctx = SG.techniques.createContext(model9, { assumeUniqueness: true });
          var a = tech.find(model9, state, ctx);
          var b = tech.find(model9, state, ctx);
          expect(b).toEqual(a);
          expect(state.candidates).toEqual(snapshot.candidates);
          expect(state.value).toEqual(snapshot.value);
        });
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Invariant I7, over the registry
  // ---------------------------------------------------------------------------------------------

  describe('techniques: soundness sweep (invariant I7) over every registered technique', function () {
    all.forEach(function (tech) {
      var count = SWEEP_STATES[tech.group] || SWEEP_DEFAULT;

      if (tech.variantScope !== null) {
        it(tech.id + ' (scoped to ' + tech.variantScope.join(', ') + ') never eliminates the true solution',
          function () {
            var variants = tech.variantScope.filter(function (id) { return SG.variants.has(id); });
            if (variants.length === 0) {
              SG.test.skip('no variant of its scope is registered yet: ' + tech.variantScope.join(', '));
            }
            variants.forEach(function (id) {
              var stats = H.assertSound(SG.test, tech.id, { model: H.model(id), count: count });
              firings[tech.id] = (firings[tech.id] || 0) + stats.firings;
            });
          });
        return;
      }

      it(tech.id + ' never eliminates a candidate of the true solution (' + count + ' states)', function () {
        var stats = H.assertSound(SG.test, tech.id, { count: count });
        firings[tech.id] = stats.firings;
        expect(stats.states).toBe(count);
      });
    });

    it('exercised the registry for real: every technique of the ladder fired in the sweep', function () {
      var silent = classic.filter(function (t) { return !(firings[t.id] > 0); })
        .map(function (t) { return t.id; });
      expect(silent).toEqual([]);
    });

    it('stays sound when the solver is asked to work without the uniqueness assumption', function () {
      var states = H.randomStatesWithKnownSolution(model9, SG.rng.create(20260101), 120);
      var ctx = SG.techniques.createContext(model9, { assumeUniqueness: false });
      states.forEach(function (item, index) {
        classic.forEach(function (tech) {
          if (tech.assumesUniqueness) return;
          var state = SG.model.cloneState(item.state);
          var finding = tech.find(model9, state, ctx);
          if (finding === null) return;
          var problems = H.findingProblems(model9, state, finding,
            { technique: tech.id, solution: item.solution });
          if (problems.length > 0) {
            throw new Error(tech.id + ' on state #' + index + ' (' + item.kind + '): ' + problems.join('; '));
          }
        });
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The whole ladder on the labelled puzzles
  // ---------------------------------------------------------------------------------------------

  describe('techniques: the whole ladder on the labelled puzzles', function () {
    var entries = SG.fixtures.rated.entries;

    function solutionOf(text) {
      return SG.dfs.solve(model9, H.parsePuzzle(model9, text));
    }

    it('solves every one of them, never reaches a contradiction and only makes sound steps', function () {
      entries.forEach(function (entry) {
        var givens = H.parsePuzzle(model9, entry.puzzle);
        var solution = solutionOf(entry.puzzle);
        var report = SG.logicalSolver.solve(model9, givens, { collectSteps: true });
        if (report.status !== 'solved') throw new Error(entry.name + ' ended ' + report.status);
        expect(Array.from(report.state.value)).toEqual(Array.from(solution));
        report.steps.forEach(function (step, i) {
          step.placements.forEach(function (p) {
            if (solution[p[0]] !== p[1]) {
              throw new Error(entry.name + ' step ' + i + ' (' + step.technique + ')');
            }
          });
          step.eliminations.forEach(function (e) {
            if (solution[e[0]] === e[1]) {
              throw new Error(entry.name + ' step ' + i + ' (' + step.technique + ')');
            }
          });
        });
      });
    });

    it('solves the same puzzle the same way twice (no hidden state, no randomness)', function () {
      entries.slice(0, 12).forEach(function (entry) {
        var givens = H.parsePuzzle(model9, entry.puzzle);
        var a = SG.logicalSolver.solve(model9, givens, { collectSteps: true });
        var b = SG.logicalSolver.solve(model9, givens, { collectSteps: true });
        expect(b.steps).toEqual(a.steps);
        expect(b.techniqueCounts).toEqual(a.techniqueCounts);
      });
    });

    it('uses a technique group only when the cheaper groups are stuck (the ladder is applied cheapest first)',
      function () {
        entries.forEach(function (entry) {
          var givens = H.parsePuzzle(model9, entry.puzzle);
          var report = SG.logicalSolver.solve(model9, givens, { collectSteps: true });
          var rank = {};
          classic.forEach(function (t, i) { rank[t.id] = i; });
          // Replaying the steps: before a technique of ladder position k is used, nothing cheaper may apply.
          var state = SG.model.initState(model9);
          for (var c = 0; c < model9.cellCount; c++) {
            if (givens[c] !== 0) SG.constraints.assign(model9, state, c, givens[c]);
          }
          var ctx = SG.techniques.createContext(model9, { assumeUniqueness: true });
          report.steps.slice(0, 40).forEach(function (step) {
            for (var i = 0; i < rank[step.technique]; i++) {
              if (classic[i].find(model9, state, ctx) !== null) {
                throw new Error(entry.name + ': ' + classic[i].id + ' applied before ' + step.technique);
              }
            }
            step.placements.forEach(function (p) { SG.constraints.assign(model9, state, p[0], p[1]); });
            step.eliminations.forEach(function (e) { SG.constraints.eliminate(model9, state, e[0], e[1]); });
          });
        });
      });

    it('respects allowedTechniques: a restricted solver never uses another technique', function () {
      var allowed = ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing', 'boxLine'];
      entries.forEach(function (entry) {
        var report = SG.logicalSolver.solve(model9, H.parsePuzzle(model9, entry.puzzle), {
          allowedTechniques: allowed, collectSteps: false
        });
        Object.keys(report.techniqueCounts).forEach(function (id) { expect(allowed).toContain(id); });
      });
    });
  });
})();
