// The target policy of difficulty v3 (R6/R7): the pure helpers of `SG.digger.targetPolicy`, which no
// generation code calls yet, and the one inert production edit of this step, the forwarding of an explicit
// `options.target` from `digLevelSteps` to its dig strategy (a number, null or absent: three cases).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var P = SG.digger.targetPolicy;
  var model9 = SG.variants.get('classic9').build({}, null);

  // The digger's own constant for a proposal whose techniques below the chain group do not finish the puzzle.
  var STUCK = 1e9;
  // The largest number a seeded stream returns: a 32-bit integer over 2^32.
  var NEXT_MAX = (Math.pow(2, 32) - 1) / Math.pow(2, 32);
  var EXPERT = { min: 700, max: 1000 };
  // The top level has no upper bound (its band is open): no finite target.
  var HELL2 = { min: 3600, max: Infinity };

  function bounded(score, tierUsed) { return { kind: 'bounded', score: score, tierUsed: tierUsed }; }
  function proposal(priority) { return { kind: 'proposal', priority: priority }; }
  function refused(reason) { return { kind: 'refused', reason: reason }; }
  function rated(score) { return { solved: true, score: score }; }

  /** A stand-in for the seeded stream: its `target` child returns `value`; the forks asked are kept. */
  function fakeRng(value) {
    var forks = [];
    return {
      forks: forks,
      fork: function (tag) {
        forks.push(tag);
        return { next: function () { return value; } };
      }
    };
  }

  describe('digger target policy: the target of a sample', function () {
    it('is drawn from the child stream "target" alone: the parent streams and other children do not move',
      function () {
        var spec = SG.difficulty.spec('expert', model9);
        expect([spec.min, spec.max]).toEqual([EXPERT.min, EXPERT.max]);
        var used = SG.rng.create(2026);
        var control = SG.rng.create(2026);
        var target = P.targetFor(spec, used);
        var expected = spec.min + SG.rng.create(2026).fork('target').next() * (spec.max - spec.min);
        expect(target).toBe(expected);
        expect(target).toBeGreaterThanOrEqual(spec.min);
        expect(target).toBeLessThan(spec.max);
        expect(P.targetFor(spec, used)).toBe(target);
        for (var i = 0; i < 6; i++) expect(used.next()).toBe(control.next());
        ['random', 'guided', 'dig#1.1', 'search#1'].forEach(function (tag) {
          expect(used.fork(tag).next()).toBe(control.fork(tag).next());
        });
        expect(P.targetFor(spec, SG.rng.create(2027))).not.toBe(target);
      });

    it('is the minimum for a stream that returns 0 and below the maximum for the largest value', function () {
      var low = fakeRng(0);
      expect(P.targetFor(EXPERT, low)).toBe(700);
      expect(low.forks).toEqual(['target']);
      var high = P.targetFor(EXPERT, fakeRng(NEXT_MAX));
      expect(high).toBe(700 + NEXT_MAX * 300);
      expect(high).toBeGreaterThan(999.99);
      expect(high).toBeLessThan(1000);
      expect(P.targetFor({ min: 0, max: 45 }, fakeRng(0.5))).toBe(22.5);
    });

    it('is null without an upper bound, and then draws nothing', function () {
      var probe = fakeRng(0.5);
      expect(P.targetFor(HELL2, probe)).toBeNull();
      expect(P.targetFor({ min: 0, max: Infinity }, probe)).toBeNull();
      expect(probe.forks).toEqual([]);
      var rng = SG.rng.create(9);
      var control = SG.rng.create(9);
      expect(P.targetFor(HELL2, rng)).toBeNull();
      expect(rng.next()).toBe(control.next());
    });
  });

  describe('digger target policy: comparing the objectives of a pool', function () {
    it('bounded: the tier comes before the target (650 beats 500; 550 and 450 tie around a target of 500)',
      function () {
        expect(P.preferObjective(bounded(650, true), bounded(500, false), 500)).toBe(true);
        expect(P.preferObjective(bounded(500, false), bounded(650, true), 500)).toBe(false);
        expect(P.preferObjective(bounded(550, true), bounded(450, true), 500)).toBe(false);
        expect(P.preferObjective(bounded(450, true), bounded(550, true), 500)).toBe(false);
        expect(P.preferObjective(bounded(520, false), bounded(500, true), 500)).toBe(false);
      });

    it('bounded: within one tier state the nearer score to a finite target wins, a tie keeps the first',
      function () {
        [true, false].forEach(function (tier) {
          expect(P.preferObjective(bounded(540, tier), bounded(600, tier), 500)).toBe(true);
          expect(P.preferObjective(bounded(600, tier), bounded(540, tier), 500)).toBe(false);
          expect(P.preferObjective(bounded(470, tier), bounded(560, tier), 500)).toBe(true);
          expect(P.preferObjective(bounded(430, tier), bounded(560, tier), 500)).toBe(false);
          expect(P.preferObjective(bounded(500, tier), bounded(500, tier), 500)).toBe(false);
        });
      });

    it('bounded: with no finite target the higher score wins and an equal one keeps the first', function () {
      [null, undefined, NaN, Infinity].forEach(function (target) {
        expect(P.preferObjective(bounded(600, true), bounded(540, true), target)).toBe(true);
        expect(P.preferObjective(bounded(540, true), bounded(600, true), target)).toBe(false);
        expect(P.preferObjective(bounded(540, true), bounded(540, true), target)).toBe(false);
        expect(P.preferObjective(bounded(1, true), bounded(900, false), target)).toBe(true);
      });
    });

    it('a proposal maximises its priority irrespective of the target and is never compared with a score',
      function () {
        [500, 10, null].forEach(function (target) {
          expect(P.preferObjective(proposal(STUCK + 9), proposal(STUCK + 2), target)).toBe(true);
          expect(P.preferObjective(proposal(STUCK + 2), proposal(STUCK + 9), target)).toBe(false);
          expect(P.preferObjective(proposal(STUCK + 2), proposal(STUCK + 2), target)).toBe(false);
          expect(P.preferObjective(proposal(480), proposal(900), target)).toBe(false);
          expect(P.preferObjective(proposal(STUCK + 9), bounded(500, true), target)).toBe(false);
          expect(P.preferObjective(bounded(500, true), proposal(STUCK + 9), target)).toBe(false);
          expect(P.preferObjective(bounded(500, true), proposal(1), target)).toBe(false);
        });
      });

    it('a refusal never wins, whatever it is compared with, and an unusable value is never preferred',
      function () {
        ['ambiguous', 'techniques', 'tooHard'].forEach(function (reason) {
          expect(P.preferObjective(refused(reason), bounded(500, false), 500)).toBe(false);
          expect(P.preferObjective(refused(reason), proposal(STUCK), 500)).toBe(false);
          expect(P.preferObjective(refused(reason), refused(reason), 500)).toBe(false);
          expect(P.preferObjective(bounded(500, true), refused(reason), 500)).toBe(false);
          expect(P.preferObjective(proposal(STUCK + 1), refused(reason), 500)).toBe(false);
        });
        expect(P.preferObjective(bounded(500, true), null, 500)).toBe(false);
        expect(P.preferObjective(null, bounded(500, true), 500)).toBe(false);
        expect(P.preferObjective(bounded(NaN, true), bounded(500, false), 500)).toBe(false);
        expect(P.preferObjective(bounded(Infinity, true), bounded(500, true), null)).toBe(false);
        expect(P.preferObjective(proposal(Infinity), proposal(STUCK), 500)).toBe(false);
      });
  });

  describe('digger target policy: applying the winner of a bounded pool', function () {
    it('never trades a tier-using state for a shallower winner, whatever the distance', function () {
      expect(P.applyBounded(bounded(650, true), bounded(500, false), 500)).toBe(false);
      expect(P.applyBounded(bounded(900, true), bounded(500, false), null)).toBe(false);
    });

    it('takes a tier-using winner when the state does not use the tier yet', function () {
      expect(P.applyBounded(bounded(500, false), bounded(650, true), 500)).toBe(true);
      expect(P.applyBounded(bounded(500, false), bounded(650, true), null)).toBe(true);
    });

    it('keeps seeking the tier: false and false applies, even to a farther score (650 to 700)', function () {
      expect(P.applyBounded(bounded(650, false), bounded(700, false), 500)).toBe(true);
      expect(P.applyBounded(bounded(650, false), bounded(500, false), 500)).toBe(true);
      expect(P.applyBounded(bounded(650, false), bounded(650, false), 500)).toBe(true);
      expect(P.applyBounded(bounded(650, false), bounded(700, false), null)).toBe(true);
    });

    it('two tier-using states with a finite target: only a strictly nearer score applies', function () {
      expect(P.applyBounded(bounded(550, true), bounded(600, true), 500)).toBe(false);
      expect(P.applyBounded(bounded(550, true), bounded(450, true), 500)).toBe(false);
      expect(P.applyBounded(bounded(550, true), bounded(550, true), 500)).toBe(false);
      expect(P.applyBounded(bounded(550, true), bounded(510, true), 500)).toBe(true);
      expect(P.applyBounded(bounded(550, true), bounded(500, true), 500)).toBe(true);
    });

    it('two tier-using states without a target: the winner applies (unbounded digging is kept)', function () {
      [null, undefined].forEach(function (target) {
        expect(P.applyBounded(bounded(550, true), bounded(600, true), target)).toBe(true);
        expect(P.applyBounded(bounded(550, true), bounded(450, true), target)).toBe(true);
        expect(P.applyBounded(bounded(550, true), bounded(550, true), target)).toBe(true);
      });
    });

    it('a refusal, a proposal or nothing is never applied, nor is anything applied over one', function () {
      [refused('techniques'), proposal(STUCK + 1), null].forEach(function (other) {
        expect(P.applyBounded(bounded(500, false), other, 500)).toBe(false);
        expect(P.applyBounded(other, bounded(500, true), 500)).toBe(false);
      });
    });
  });

  describe('digger target policy: comparing rated candidates of a local search', function () {
    it('the lower R3 quality wins whatever the target: 0 with score 430 beats 0.5 with 500', function () {
      [500, null].forEach(function (target) {
        expect(P.preferRated(0, 430, 0.5, 500, target)).toBe(true);
        expect(P.preferRated(0.5, 500, 0, 430, target)).toBe(false);
        expect(P.preferRated(1000, 900, 2000, 500, target)).toBe(true);
        expect(P.preferRated(2000, 500, 1000, 900, target)).toBe(false);
      });
    });

    it('equal quality: the nearer score to a finite target; an exact tie is false either way', function () {
      expect(P.preferRated(0, 480, 0, 540, 500)).toBe(true);
      expect(P.preferRated(0, 540, 0, 480, 500)).toBe(false);
      expect(P.preferRated(0, 460, 0, 540, 500)).toBe(false);
      expect(P.preferRated(0, 540, 0, 460, 500)).toBe(false);
      expect(P.preferRated(0, 500, 0, 500, 500)).toBe(false);
    });

    it('equal quality without a target: the higher score, an equal one is false', function () {
      expect(P.preferRated(0.5, 600, 0.5, 540, null)).toBe(true);
      expect(P.preferRated(0.5, 540, 0.5, 600, null)).toBe(false);
      expect(P.preferRated(0.5, 540, 0.5, 540, null)).toBe(false);
    });

    it('an unrated quality of Infinity loses to any rated one, compared without subtraction', function () {
      expect(P.preferRated(Infinity, 900, 1000, 100, 500)).toBe(false);
      expect(P.preferRated(1000, 100, Infinity, 900, 500)).toBe(true);
      expect(P.preferRated(Infinity, 480, Infinity, 540, 500)).toBe(true);
      expect(P.preferRated(Infinity, 540, Infinity, 480, 500)).toBe(false);
      expect(P.preferRated(Infinity, 500, Infinity, 500, 500)).toBe(false);
      expect(P.preferRated(Infinity, 600, Infinity, 540, null)).toBe(true);
      expect(P.preferRated(Infinity, 540, Infinity, 540, null)).toBe(false);
      expect(P.preferRated(NaN, 500, NaN, 400, null)).toBe(false);
    });
  });

  describe('digger target policy: the reveals of the downward refinement', function () {
    function accept(current, next, currentIsExact, nextIsExact, target) {
      return P.acceptReveal(rated(current), rated(next), EXPERT, target === undefined ? 850 : target,
        currentIsExact, nextIsExact);
    }

    it('while the state is above the band the existing rule stays: solved, and a score of at least min',
      function () {
        expect(accept(1100, 920, false, false)).toBe(true);
        expect(accept(1100, 920, true, true)).toBe(true);
        expect(accept(1100, 1050, false, false)).toBe(true);
        expect(accept(1000, 700, false, false)).toBe(true);
        expect(accept(1100, 690, false, false)).toBe(false);
        expect(accept(1000, 699, false, false)).toBe(false);
        var unsolved = { solved: false, score: 920 };
        expect(P.acceptReveal(rated(1100), unsolved, EXPERT, 850, true, true)).toBe(false);
        expect(P.acceptReveal({ solved: false, score: 1100 }, rated(920), EXPERT, 850, true, true))
          .toBe(false);
        expect(accept(1100, NaN, false, false)).toBe(false);
        expect(accept(1100, Infinity, false, false)).toBe(false);
        expect(accept(Infinity, 920, false, false)).toBe(false);
      });

    it('in the band, a required state goes on to a required reveal strictly nearer the target: 920 to 880',
      function () {
        expect(accept(920, 880, true, true)).toBe(true);
        expect(accept(920, 900, true, true)).toBe(true);
        expect(accept(880, 860, true, true)).toBe(true);
        expect(accept(860, 850, true, true)).toBe(true);
      });

    it('refuses 880 to 900: not nearer, though the sequence 920 to 900 would have been', function () {
      expect(accept(880, 900, true, true)).toBe(false);
      expect(accept(880, 820, true, true)).toBe(false);
      expect(accept(880, 880, true, true)).toBe(false);
      expect(accept(920, 780, true, true)).toBe(false);
    });

    it('undoes a shallow reveal (920 to 840), a tier-losing one and one below the minimum (920 to 690)',
      function () {
        expect(accept(920, 840, true, false)).toBe(false);
        expect(accept(920, 880, true, false)).toBe(false);
        expect(accept(920, 690, true, true)).toBe(false);
        expect(accept(920, 699, true, true)).toBe(false);
        expect(accept(920, 1010, true, true)).toBe(false);
        expect(accept(920, 1000, true, true)).toBe(false);
      });

    it('does not start from a state at or below the target (800), nor from a shallow one (920)', function () {
      expect(accept(800, 840, true, true)).toBe(false);
      expect(accept(800, 790, true, true)).toBe(false);
      expect(accept(850, 849, true, true)).toBe(false);
      expect(accept(920, 880, false, true)).toBe(false);
      expect(accept(920, 880, false, false)).toBe(false);
      expect(accept(920, 880, undefined, true)).toBe(false);
      expect(accept(920, 880, true, undefined)).toBe(false);
      expect(accept(650, 700, true, true)).toBe(false);
    });

    it('has no finite target to refine towards: an unbounded level or a missing target stops', function () {
      expect(P.acceptReveal(rated(4000), rated(3900), HELL2, null, true, true)).toBe(false);
      expect(P.acceptReveal(rated(4000), rated(3700), HELL2, null, true, true)).toBe(false);
      expect(P.acceptReveal(rated(920), rated(880), EXPERT, null, true, true)).toBe(false);
      expect(P.acceptReveal(rated(920), rated(880), EXPERT, undefined, true, true)).toBe(false);
      expect(P.acceptReveal(rated(920), rated(880), EXPERT, NaN, true, true)).toBe(false);
    });

    it('continues conditionally: a sequence of reveals keeps only the improving required ones', function () {
      function refine(startScore, startExact, reveals) {
        var score = startScore;
        var exact = startExact;
        var kept = [];
        reveals.forEach(function (reveal) {
          if (P.acceptReveal(rated(score), rated(reveal[0]), EXPERT, 850, exact, reveal[1])) {
            score = reveal[0];
            exact = reveal[1];
            kept.push(score);
          }
        });
        return kept;
      }
      // Above the band, 920 is taken; then 880; 900 is farther, 840 shallow and 690 too low are undone.
      expect(refine(1100, false, [[920, true], [880, true], [900, true], [840, false], [690, true]]))
        .toEqual([920, 880]);
      // A shallow 920 ends the refinement: the caller continues the local search instead.
      expect(refine(1100, false, [[920, false], [880, true], [860, true]])).toEqual([920]);
      // Down to the target, and no further: at 850 nothing starts another reveal.
      expect(refine(1100, false, [[880, true], [860, true], [850, true], [845, true], [850, true]]))
        .toEqual([880, 860, 850]);
      // An exact 920 in the band, offered 900 and then 880, settles for the nearest it met.
      expect(refine(920, true, [[900, true], [880, true], [890, true]])).toEqual([900, 880]);
    });
  });

  describe('digLevelSteps: an explicit options.target reaches the strategy and nothing else', function () {
    var solution = SG.fullGrid.generate(model9, SG.rng.create(11).fork('grid'), null);

    /** One digLevel through a strategy that records what it receives and then digs as the default one. */
    function dig(extra) {
      var seen = [];
      var cells = SG.digger.getStrategy('cells');
      var options = Object.assign({
        strategy: function (model, sol, level, rng, opts) {
          seen.push([Object.prototype.hasOwnProperty.call(opts, 'target'), opts.target]);
          return cells(model, sol, level, rng, opts);
        }
      }, extra);
      var rng = SG.rng.create(12);
      var puzzle = SG.digger.digLevel(model9, solution, 'easy', rng, options);
      return { seen: seen, puzzle: puzzle, next: rng.next() };
    }

    function outcome(run) {
      var p = run.puzzle;
      return {
        givens: Array.from(p.givens), clues: p.clues, rating: p.rating, exact: p.exact, stats: p.stats,
        log: p.log, next: run.next
      };
    }

    it('gives the strategy the number, the null or the absence it was given, as three different things',
      function () {
        var withNumber = dig({ target: 812 });
        var withNull = dig({ target: null });
        var without = dig({});
        expect(withNumber.seen).toEqual([[true, 812]]);
        expect(withNull.seen).toEqual([[true, null]]);
        expect(without.seen).toEqual([[false, undefined]]);
        expect(dig({ target: 0 }).seen).toEqual([[true, 0]]);
      });

    it('leaves the puzzle, rating, statistics, dig log and random streams as without it', function () {
      var base = outcome(dig({}));
      expect(base.clues).toBeGreaterThan(0);
      expect(base.log.length).toBeGreaterThan(0);
      expect(outcome(dig({ target: 812 }))).toEqual(base);
      expect(outcome(dig({ target: null }))).toEqual(base);
      expect(outcome(dig({ target: 0 }))).toEqual(base);
    });

    it('is no draw: plain generation hands the strategy no target and calls no policy helper', function () {
      var names = Object.keys(P).sort();
      expect(names).toEqual(['acceptReveal', 'applyBounded', 'preferObjective', 'preferRated', 'targetFor']);
      var called = [];
      var original = {};
      names.forEach(function (name) {
        original[name] = P[name];
        P[name] = function () {
          called.push(name);
          return original[name].apply(P, arguments);
        };
      });
      var seen = [];
      var cells = SG.digger.getStrategy('cells');
      var strategy = function (model, sol, level, rng, opts) {
        seen.push([Object.prototype.hasOwnProperty.call(opts, 'target'), opts.target]);
        return cells(model, sol, level, rng, opts);
      };
      var results = [];
      try {
        ['easy', 'normal', 'expert'].forEach(function (level) {
          results.push(SG.digger.generate(model9, level, SG.rng.create(5),
            { strategy: strategy, maxAttempts: 1, digTries: 3 }));
        });
      } finally {
        names.forEach(function (name) { P[name] = original[name]; });
      }
      expect(results.every(function (r) { return r.rating.solved === true; })).toBe(true);
      expect(seen.length).toBeGreaterThanOrEqual(3);
      seen.forEach(function (one) { expect(one).toEqual([false, undefined]); });
      expect(called).toEqual([]);
    });
  });
})();
