// The logical techniques as a whole. The suites tech-basic, tech-subset, tech-fish, tech-wing and tech-chain
// test each group in depth; this one checks what must hold for EVERY technique and is written over
// SG.techniques.list(), so a technique registered later is covered without editing it:
//   - the registry is consistent,
//   - every technique has fixtures (>= 2 positions where it fires, >= 1 where it does not), taken from
//     tests/fixtures/techniques.js,
//   - invariant I7: a technique never eliminates the true solution (soundness sweep; the group suites only
//     add other boards and seeds),
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
  /** The seed of the random population (the default of H.assertSound, which does not export it). */
  var SWEEP_SEED = 20260101;

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

  /** The supplemental positions of a technique as soundness states (the shape of randomStatesWithKnownSolution). */
  function supplementItems(fixtures) {
    return fixtures.map(function (fixture) {
      var givens = H.parsePuzzle(model9, fixture.puzzle);
      return { state: stateOf(fixture), solution: SG.dfs.solve(model9, givens), givens: givens,
        kind: 'supplement' };
    });
  }

  /**
   * The scoped supplements of a technique (fixtures/jigsaw-techniques.js) as soundness states, each with the model of its
   * own region map: [{ model, item }] in the shape of supplementItems, empty for a technique without any.
   */
  function scopedSupplementItems(id) {
    var kit = SG.fixtures.jigsawTechniques;
    var list = kit && kit.supplements && kit.supplements[id] ? kit.supplements[id] : [];
    return list.map(function (fixture) {
      var model = kit.modelOf(fixture);
      var givens = H.parsePuzzle(model, fixture.givens);
      return { model: model, item: { state: kit.stateOf(fixture), solution: SG.dfs.solve(model, givens),
        givens: givens, kind: 'supplement' } };
    });
  }

  /**
   * The states of one soundness sweep: the complete seeded random population of the call site, then the
   * supplemental positions. assertSound uses `states` INSTEAD of generating random ones, so the random
   * prefix is built here with the helper's own default seed and the supplements are only ever appended.
   */
  function sweepStates(count, seed, supplements) {
    var random = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(seed), count);
    return random.concat(supplements);
  }

  describe('techniques: registry', function () {
    it('has the 32 techniques of the classic ladder registered, in the current registry order', function () {
      expect(classic.map(function (t) { return t.id; })).toEqual(F.registryOrder);
      expect(F.registryOrder.length).toBe(32);
    });

    it('keeps the v2 ladder as history: the old ids keep their relative order in the expanded registry, ' +
      'jellyfish apart', function () {
        var added = ['skyscraper', 'twoStringKite', 'remotePairs', 'emptyRectangle', 'finnedXWing',
          'finnedSwordfish', 'wxyzWing', 'bugPlusOne', 'xyChain', 'forcingChainLong', 'nishioDeep'];
        function oldIds(list) {
          return list.filter(function (id) { return id !== 'jellyfish' && added.indexOf(id) === -1; });
        }
        expect(F.historyV2.ladder).toEqual(F.ladder);
        expect(F.ladder.length).toBe(21);
        // the frozen ladder is a subset of the expanded registry, and the registry adds exactly the new ids
        F.ladder.forEach(function (id) { expect(F.registryOrder).toContain(id); });
        expect(F.registryOrder.filter(function (id) { return F.ladder.indexOf(id) === -1; })).toEqual(added);
        expect(F.ladder.indexOf('jellyfish')).toBeGreaterThan(F.ladder.indexOf('xyzWing'));
        expect(F.registryOrder.indexOf('jellyfish')).toBeGreaterThan(F.registryOrder.indexOf('swordfish'));
        expect(F.registryOrder.indexOf('jellyfish')).toBeLessThan(F.registryOrder.indexOf('xyWing'));
        // the old ids in the old relative order, and the new ones inside the chain group at their R9 places
        expect(oldIds(F.registryOrder)).toEqual(oldIds(F.ladder));
        expect(F.registryOrder.slice(-4)).toEqual(['forcingChain', 'forcingChainLong', 'nishio', 'nishioDeep']);
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

    it('marks only the uniqueness-assuming techniques, which hints must not rely on blindly', function () {
      var assuming = all.filter(function (t) { return t.assumesUniqueness; })
        .map(function (t) { return t.id; });
      expect(assuming).toEqual(['uniqueRectangle', 'bugPlusOne']);
    });
  });

  describe('techniques: fixtures (fixtures/techniques.js)', function () {
    it('has the active map (byId, ids) on top of the untouched rating v2 positions', function () {
      expect(F.ids).toEqual(Object.keys(F.byId));
      Object.keys(F.historyV2.byId).forEach(function (id) {
        expect(F.byId[id]).toBeTruthy();
        expect(F.ids).toContain(id);
      });
    });

    it('has fixtures for exactly the techniques of the classic ladder (add them for a new one)', function () {
      var ids = classic.map(function (t) { return t.id; });
      var missing = ids.filter(function (id) { return F.ids.indexOf(id) === -1; });
      var stale = F.ids.filter(function (id) { return ids.indexOf(id) === -1; });
      expect(missing).toEqual([]);
      expect(stale).toEqual([]);
    });

    it('puts the positive positions of a replaced or added entry where its id is reached in the registry ' +
      '(MS07b, MS08a, MS08b, MS08c, MS09a, MS09b, MS10a, MS10b, MS11a, MS11c, MS12)', function () {
        var replaced = F.ids.filter(function (id) { return F.byId[id] !== F.historyV2.byId[id]; });
        expect(replaced.sort()).toEqual(['bugPlusOne', 'emptyRectangle', 'finnedSwordfish', 'finnedXWing',
          'forcingChain', 'forcingChainLong', 'nishio', 'nishioDeep', 'remotePairs', 'skyscraper', 'twoStringKite',
          'uniqueRectangle', 'wxyzWing', 'xyChain']);
        replaced.forEach(function (id) {
          var below = F.registryOrder.slice(0, F.registryOrder.indexOf(id));
          F.byId[id].positive.forEach(function (fixture) {
            // an explicit list of the ids before it (or the first position of a real puzzle), never its own id
            if (fixture.after !== null) expect(fixture.after.slice().sort()).toEqual(below.slice().sort());
          });
        });
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

  describe('techniques: soundness sweep (invariant I7) over every registered technique', function () {
    all.forEach(function (tech) {
      var count = SWEEP_STATES[tech.group] || SWEEP_DEFAULT;

      if (tech.variantScope !== null) {
        it(tech.id + ' (scoped to ' + tech.variantScope.join(', ') + ') never eliminates the true solution',
          function () {
            var variants = tech.variantScope.filter(function (id) { return SG.testkit.hasVariant(id); });
            if (variants.length === 0) {
              SG.test.skip('no board of its scope can be built here: ' + tech.variantScope.join(', '));
            }
            variants.forEach(function (id) {
              var stats = H.assertSound(SG.test, tech.id, { model: H.model(id), count: count });
              firings[tech.id] = (firings[tech.id] || 0) + stats.firings;
            });
            // The supplements of a scoped technique come after the complete seeded random population of its call site,
            // each on the board of its own region map (MS14b: the Jigsaw positions of fixtures/jigsaw-techniques.js).
            scopedSupplementItems(tech.id).forEach(function (one) {
              var stats = H.assertSound(SG.test, tech.id, { model: one.model, states: [one.item], minFirings: 1 });
              firings[tech.id] = (firings[tech.id] || 0) + stats.firings;
            });
          });
        return;
      }

      it(tech.id + ' never eliminates a candidate of the true solution (' + count + ' states)', function () {
        var supplements = supplementItems(F.supplements[tech.id] || []);
        var stats = H.assertSound(SG.test, tech.id, {
          model: model9, count: count, minFirings: 3, states: sweepStates(count, SWEEP_SEED, supplements)
        });
        firings[tech.id] = stats.firings;
        expect(stats.states).toBe(count + supplements.length);
      });
    });

    it('exercised the registry for real: every technique of the ladder fired in the sweep', function () {
      var silent = classic.filter(function (t) { return !(firings[t.id] > 0); })
        .map(function (t) { return t.id; });
      expect(silent).toEqual([]);
    });

    it('stays sound when the solver is asked to work without the uniqueness assumption', function () {
      var states = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(20260101), 120);
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

  describe('techniques: supplemental soundness positions (fixtures/techniques.js supplements)', function () {
    // The mechanism for a rare pattern, shown on two real positions of forcingChain (they are positive fixtures
    // of the ladder, used here only as a stand-in for a supplement list).
    var stand = F.byId.forcingChain.positive;

    it('lists supplements only for registered techniques, as explicit real unique positions', function () {
      Object.keys(F.supplements).forEach(function (id) {
        expect(SG.techniques.has(id)).toBe(true);
        expect(Array.isArray(F.supplements[id])).toBe(true);
        F.supplements[id].forEach(function (fixture) {
          expect(typeof fixture.name).toBe('string');
          expect(fixture.puzzle.length).toBe(81);
          if (fixture.after !== null) {
            expect(Array.isArray(fixture.after)).toBe(true);
            fixture.after.forEach(function (after) { expect(SG.techniques.has(after)).toBe(true); });
          }
          expect(SG.dfs.countSolutions(model9, H.parsePuzzle(model9, fixture.puzzle), 2)).toBe(1);
        });
      });
    });

    it('builds soundness items with the unique solution that lies in every candidate set', function () {
      var items = supplementItems(stand);
      expect(items.length).toBe(stand.length);
      items.forEach(function (item) {
        expect(item.kind).toBe('supplement');
        expect(SG.model.isSolution(model9, item.solution)).toBe(true);
        for (var c = 0; c < model9.cellCount; c++) {
          expect(item.state.candidates[c] & (1 << (item.solution[c] - 1))).not.toBe(0);
        }
      });
    });

    it('runs the complete seeded random population first and appends the supplements', function () {
      var count = 12;
      var items = supplementItems(stand);
      var states = sweepStates(count, SWEEP_SEED, items);
      var random = H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(SWEEP_SEED), count);
      expect(states.length).toBe(count + items.length);
      random.forEach(function (item, i) {
        expect(states[i].kind).toBe(item.kind);
        expect(states[i].state.candidates).toEqual(item.state.candidates);
        expect(states[i].state.value).toEqual(item.state.value);
        expect(states[i].solution).toEqual(item.solution);
        expect(states[i].givens).toEqual(item.givens);
      });
      expect(states.slice(count)).toEqual(items);
      expect(sweepStates(count, SWEEP_SEED, []).length).toBe(count);
    });

    it('counts the supplements on top of the random states and keeps the firing minimum', function () {
      var count = 12;
      var items = supplementItems(stand);
      var stats = H.assertSound(SG.test, 'forcingChain', {
        model: model9, count: count, minFirings: 3, states: sweepStates(count, SWEEP_SEED, items)
      });
      expect(stats.states).toBe(count + items.length);
      var alone = H.assertSound(SG.test, 'forcingChain', {
        model: model9, states: sweepStates(count, SWEEP_SEED, [])
      });
      expect(alone.states).toBe(count);
      expect(stats.firings).toBeGreaterThan(alone.firings);
      // a minimum that the states cannot reach still fails, supplements or not
      expect(function () {
        H.assertSound(SG.test, 'forcingChain', {
          model: model9, minFirings: 1000000, states: sweepStates(count, SWEEP_SEED, items)
        });
      }).toThrow({ name: 'AssertionError' });
    });
  });

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
