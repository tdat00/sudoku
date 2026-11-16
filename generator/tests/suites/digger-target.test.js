// The target policy of difficulty v3 (R6/R7), active since MS06c2: the pure helpers of `SG.digger.targetPolicy`
// (MS06b), the target of every sample (one draw from its own child stream, overriding any caller value, and an
// initialization of an absent target at the lower-level entry), its transport as data (MS06c1: the keeper views,
// the sample, the search and the result) and the activated stages: the guided pass of the cells strategy
// (initial state, first-success pools, the apply table), the downward refinement and the local search, and the
// real first-allowed sign pass of Greater-Than, which receives the target and does not read it.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var Z = SG.digger;
  var D = SG.difficulty;
  var P = SG.digger.targetPolicy;
  var model9 = SG.variants.get('classic9').build({}, null);

  // The digger's own constant for a proposal whose techniques below the chain group do not finish the puzzle.
  var STUCK = 1e9;
  // The largest number a seeded stream returns: a 32-bit integer over 2^32.
  var NEXT_MAX = (Math.pow(2, 32) - 1) / Math.pow(2, 32);
  var EXPERT = { min: 700, max: 1000 };
  // The top level has no upper bound (its band is open): no finite target.
  var HELL2 = D.bandOf('hell2');

  function bounded(score, tierUsed) { return { kind: 'bounded', score: score, tierUsed: tierUsed }; }
  function proposal(priority) { return { kind: 'proposal', priority: priority }; }
  function refused(reason) { return { kind: 'refused', reason: reason }; }
  function rated(score) { return { solved: true, score: score }; }

  /**
   * The contract of the typed objective of a score-targeted removal, worked out apart from the digger: the
   * restricted solve of the level's techniques, then refused 'techniques' (not solved) or 'tooHard' (the score
   * reaches the maximum), else the score and whether the solve used a technique of the level's tier.
   */
  function boundedOf(model, spec, givens) {
    var report = SG.logicalSolver.solve(model, givens, {
      allowedTechniques: spec.allowedTechniques, collectSteps: false, assumeUniqueness: false, budget: null
    });
    if (!report.solved) return refused('techniques');
    var score = D.classify(report, model).score;
    if (score >= spec.max) return refused('tooHard');
    var used = spec.tierTechniques.some(function (id) { return report.techniqueCounts[id] > 0; });
    return bounded(score, D.levelIndex(spec.level) === 0 || spec.tierTechniques.length === 0 || used);
  }

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

    it('a success does not replace a refused or absent incumbent, a refusal is never preferred, and an ' +
      'unusable value never wins', function () {
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

    it('keeps the floor of the band on its own: with target 705, 730 to 699 is nearer but below the minimum',
      function () {
        expect(accept(730, 699, true, true, 705)).toBe(false);
        expect(accept(730, 701, true, true, 705)).toBe(true);
        expect(accept(730, 700, true, true, 705)).toBe(true);
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

  /** The stream with every fork recorded by its path, so that a draw of the child "target" would show. */
  function spied(rng, path, tags) {
    return Object.assign({}, rng, {
      fork: function (tag) {
        var at = path + tag;
        tags.push(at);
        return spied(rng.fork(tag), at + '/', tags);
      }
    });
  }

  function targetForks(tags) {
    return tags.filter(function (t) { return t.split('/').pop() === 'target'; });
  }

  describe('digLevelSteps: the target of a call is its own property, initialized once when absent', function () {
    var solution = SG.fullGrid.generate(model9, SG.rng.create(11).fork('grid'), null);
    // A redundant puzzle: a strategy that returns it digs nothing, so an open band costs no search.
    var redundant = Z.dig(model9, solution, SG.rng.create(11).fork('base'), { minClues: 58 });
    // Hell 2, the only open band, is offered by the extra-region boards and not by classic9.
    var modelX = SG.variants.get('diagonalX').build({}, null);
    var solutionX = SG.fullGrid.generate(modelX, SG.rng.create(11).fork('grid'), null);
    var redundantX = Z.dig(modelX, solutionX, SG.rng.create(11).fork('base'), { minClues: 58 });

    /** One digLevel through a strategy that records what it receives and then digs as the default one. */
    function dig(extra, level, stub) {
      var seen = [];
      var tags = [];
      var cells = SG.digger.getStrategy('cells');
      var open = stub === 'open';
      var options = Object.assign({
        strategy: function (model, sol, lvl, rng, opts) {
          seen.push([Object.prototype.hasOwnProperty.call(opts, 'target'), opts.target]);
          var base = open ? redundantX : redundant;
          return stub ? { givens: base.givens, clues: base.clues, stats: base.stats }
            : cells(model, sol, lvl, rng, opts);
        }
      }, extra);
      var rng = spied(SG.rng.create(12), '', tags);
      var puzzle = open ? SG.digger.digLevel(modelX, solutionX, level, rng, options)
        : SG.digger.digLevel(model9, solution, level || 'easy', rng, options);
      return { seen: seen, puzzle: puzzle, tags: tags, next: rng.next() };
    }

    function outcome(run) {
      var p = run.puzzle;
      return {
        givens: Array.from(p.givens), clues: p.clues, rating: p.rating, exact: p.exact, stats: p.stats,
        log: p.log, next: run.next
      };
    }

    // The value the entry must have drawn: on a test stream of the same seed, never the production stream.
    var EASY_TARGET = P.targetFor(D.spec('easy', model9), SG.rng.create(12));

    it('gives the strategy an explicit number, zero or null as it was given, and draws nothing for them',
      function () {
        [[812, 812], [0, 0], [null, null]].forEach(function (pair) {
          var run = dig({ target: pair[0] });
          expect(run.seen).toEqual([[true, pair[1]]]);
          expect(run.puzzle.target).toBe(pair[1]);
          expect(targetForks(run.tags)).toEqual([]);
        });
        var invalid = dig({ target: NaN });
        expect(invalid.seen).toHaveLength(1);
        expect(invalid.seen[0][0]).toBe(true);
        expect(Number.isNaN(invalid.seen[0][1])).toBe(true);
        expect(invalid.puzzle.target).toBe(null);
        expect(targetForks(invalid.tags)).toEqual([]);
      });

    it('initializes an absent target once, from the entry\'s own stream: its draw, one child, no parent draw',
      function () {
        var run = dig({});
        expect(EASY_TARGET).toBeGreaterThanOrEqual(D.spec('easy', model9).min);
        expect(EASY_TARGET).toBeLessThan(D.spec('easy', model9).max);
        expect(run.seen).toEqual([[true, EASY_TARGET]]);
        expect(run.puzzle.target).toBe(EASY_TARGET);
        expect(targetForks(run.tags)).toEqual(['target']);
        expect(run.next).toBe(SG.rng.create(12).next());
      });

    it('an open band initializes to null without a draw, and the strategy still gets the property', function () {
      var run = dig({}, 'hell2', 'open');
      expect(run.seen).toEqual([[true, null]]);
      expect(run.puzzle.target).toBe(null);
      expect(targetForks(run.tags)).toEqual([]);
    });

    it('an absent target is the value it would draw: the same puzzle, statistics, dig log and streams',
      function () {
        var base = outcome(dig({}));
        expect(base.clues).toBeGreaterThan(0);
        expect(base.log.length).toBeGreaterThan(0);
        expect(outcome(dig({ target: EASY_TARGET }))).toEqual(base);
        // a repeated call with the same explicit target is the same puzzle
        expect(outcome(dig({ target: 812 }))).toEqual(outcome(dig({ target: 812 })));
      });

    it('plain generation draws one target per entered sample from that sample\'s own child, and none ' +
      'for an open band or a search', function () {
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
        var tags = [];
        try {
          ['easy', 'normal', 'expert'].forEach(function (level) {
            var rng = spied(SG.rng.create(5), '', tags);
            results.push(SG.digger.generate(model9, level, rng, { strategy: strategy, maxAttempts: 1, digTries: 3 }));
          });
        } finally {
          names.forEach(function (name) { P[name] = original[name]; });
        }
        expect(results.every(function (r) { return r.rating.solved === true; })).toBe(true);
        expect(seen.length).toBeGreaterThanOrEqual(3);
        seen.forEach(function (one) { expect(one[0]).toBe(true); });
        // the value of each sample, worked out on a test stream by the literal path of its fork
        var expected = [];
        ['easy', 'normal', 'expert'].forEach(function (level, i) {
          for (var t = 1; t <= results[i].samples; t++) {
            expected.push([true, P.targetFor(D.spec(level, model9), SG.rng.create(5).fork('dig#1.' + t))]);
          }
        });
        expect(seen).toEqual(expected);
        expect(called.filter(function (n) { return n === 'targetFor'; })).toHaveLength(expected.length);
        expect(called.indexOf('preferObjective')).not.toBe(-1);
        // the draw is the sample's own child, and none comes from the search stream
        expect(targetForks(tags).every(function (t) { return /^dig#1\.\d+\/target$/.test(t); })).toBe(true);
        expect(targetForks(tags)).toHaveLength(expected.length);
      });

    it('an open band gives every sample of generate an own null, with no draw', function () {
      var seen = [];
      var tags = [];
      var strategy = function (model, sol, level, rng, opts) {
        seen.push([Object.prototype.hasOwnProperty.call(opts, 'target'), opts.target]);
        return { givens: redundantX.givens, clues: redundantX.clues, stats: redundantX.stats };
      };
      var open = SG.digger.generate(modelX, 'hell2', spied(SG.rng.create(5), '', tags), { strategy: strategy,
        maxAttempts: 1, digTries: 1, maxProposals: 0 });
      expect(open.target).toBe(null);
      expect(seen).toEqual([[true, null]]);
      expect(targetForks(tags)).toEqual([]);
    });
  });

  // The guided pass of the cells strategy, checked against an independent replay of its own dig log: the board
  // before the pass is rebuilt from the accepted removals of stage A, every candidate is evaluated again with
  // the solver by the contract of the typed objective, the winner of each pool and the decision to apply it or
  // to end the pass are worked out again from the table of the task (written out here, not read from
  // `targetPolicy`), and the count of oracle calls, including the one evaluation of the pass's own board,
  // is compared with what the log shows.
  describe('digGuidedSteps: a real pass follows the policy, replayed from its dig log (MS06c2)', function () {
    // [variant, level, seed, proposal dig, target as a fraction of the band (null: no target)]
    var CASES = [
      ['classic4', 'veryEasy', 4, false, 0.5],
      ['classic6', 'hard', 4, false, 0.25],
      ['diagonalX', 'hard', 4, false, null],
      ['classic9', 'veryEasy', 4, false, 0.5],
      ['classic9', 'veryEasy', 9, false, null],
      ['classic9', 'veryEasy', 14, false, 0.9],
      ['classic9', 'easy', 4, false, 0.5],
      ['classic9', 'easy', 9, false, 0.1],
      ['classic9', 'easy', 14, false, null],
      ['classic9', 'normal', 4, false, 0.5],
      ['classic9', 'normal', 9, false, 0.9],
      ['classic9', 'normal', 14, false, null],
      ['classic9', 'hard', 4, false, 0.5],
      ['classic9', 'hard', 9, false, 0.1],
      ['classic9', 'hard', 14, false, null],
      ['classic9', 'expert', 4, false, 0.5],
      ['classic9', 'expert', 9, false, 0.9],
      ['classic9', 'expert', 14, false, null],
      ['classic9', 'master', 4, false, 0.5],
      ['classic9', 'master', 9, false, 0.1],
      ['classic9', 'master', 14, false, null],
      ['classic9', 'normal', 4, true, null],
      ['classic9', 'expert', 9, true, 0.5],
      ['classic9', 'nightmare', 4, true, null],
      ['classic9', 'master', 7, true, 0.5],
      ['classic9', 'master', 16, true, null],
      // Hell 1 seed 14 where it was 11: the hidden Unique Rectangle (MS11b) finishes the three stuck proposals of seed 11
      ['classic9', 'hell1', 14, true, null],
      ['classic9', 'hell1', 13, true, null],
      ['classic9', 'hell1', 30, true, null]
    ];

    function finiteTarget(t) { return typeof t === 'number' && isFinite(t); }

    /** Does a pool candidate beat the incumbent? The tier first, then the nearer score, else the higher one. */
    function beats(c, w, target) {
      if (c.kind === 'proposal') return c.priority > w.priority;
      if (c.tierUsed !== w.tierUsed) return c.tierUsed;
      return finiteTarget(target) ? Math.abs(c.score - target) < Math.abs(w.score - target) : c.score > w.score;
    }

    /** May the winner replace the current state? A shallower one never; a state without the tier takes any. */
    function applies(current, winner, target) {
      if (current.tierUsed !== winner.tierUsed) return winner.tierUsed;
      if (!current.tierUsed) return true;
      return finiteTarget(target) ? Math.abs(winner.score - target) < Math.abs(current.score - target) : true;
    }

    function sameCells(a, b) {
      return a.length === b.length && a.every(function (c) { return b.indexOf(c) !== -1; });
    }

    /** The pass of one case, and everything its replay needs. */
    function pass(c) {
      var model = SG.variants.get(c[0]).build({}, null);
      var rng = SG.rng.create(c[2]);
      var solution = SG.fullGrid.generate(model, rng.fork('grid'), null);
      var spec = D.spec(c[1], model);
      var target = c[4] === null || spec.max === Infinity ? null : spec.min + c[4] * (spec.max - spec.min);
      var log = [];
      var dug = SG.digger.digStage(model, solution, c[1], rng.fork('dig'),
        { log: log, proposal: c[3], target: target });
      return { model: model, solution: solution, spec: spec, target: target, log: log, dug: dug, proposal: c[3] };
    }

    var runs = null;

    function allRuns() {
      if (runs === null) runs = CASES.map(pass);
      return runs;
    }

    /** The replay of one pass; the counts it compares are returned for the aggregate checks. */
    function replay(run) {
      var model = run.model;
      var spec = run.spec;
      var givens = Int32Array.from(run.solution);
      var proposalEvaluate = run.proposal ? Z.removalObjective(model, spec, true) : null;
      function cleared(group) {
        var out = Int32Array.from(givens);
        group.forEach(function (c) { out[c] = 0; });
        return out;
      }
      function objectiveOf(trial, group) {
        return run.proposal ? proposalEvaluate(trial, run.solution, group, null, { oracleCalls: 0 })
          : boundedOf(model, spec, trial);
      }
      var i = 0;
      var stageA = 0;
      var log = run.log;
      while (!(log[i].op === 'pass' && log[i].pass === 'guided')) {
        if (log[i].op === 'accept') log[i].cells.forEach(function (c) { givens[c] = 0; });
        if (log[i].op === 'accept' || log[i].op === 'reject') stageA++;
        i++;
      }
      var start = Int32Array.from(givens);
      i++;
      var current = run.proposal ? null : boundedOf(model, spec, givens);
      expect(current === null || current.kind === 'bounded').toBe(true);
      var pool = [];
      var evaluated = 0;
      var accepted = 0;
      var winner;
      function best() {
        winner = pool[0];
        for (var k = 1; k < pool.length; k++) if (beats(pool[k].objective, winner.objective, run.target)) winner = pool[k];
        return winner;
      }
      for (; i < log.length; i++) {
        var e = log[i];
        var trial = cleared(e.cells);
        var objective = objectiveOf(trial, e.cells);
        if (e.op === 'reject') {
          evaluated++;
          expect(objective).toEqual(refused(e.reason));
        } else if (e.op === 'keep') {
          evaluated++;
          expect(objective.kind).not.toBe('refused');
          var shown = objective.kind === 'bounded' ? objective.score : objective.priority;
          expect(e.score).toBe(shown >= STUCK ? null : Math.round(shown));
          pool.push({ cells: e.cells, objective: objective });
        } else if (e.op === 'accept') {
          expect(sameCells(e.cells, best().cells)).toBe(true);
          if (current !== null) {
            expect(applies(current, winner.objective, run.target)).toBe(true);
            current = winner.objective;
          }
          givens = trial;
          accepted++;
          pool = [];
        }
      }
      var ended = null;
      if (pool.length > 0) {
        // the pass stopped on a pool whose winner the table does not allow: only a score-targeted pass can
        expect(current).not.toBe(null);
        expect(applies(current, best().objective, run.target)).toBe(false);
        ended = 'policy';
      }
      expect(Array.from(run.dug.givens)).toEqual(Array.from(givens));
      if (!run.proposal) {
        // one evaluation of the pass's own board, then one solve per candidate; stage A made one per decision
        expect(run.dug.stats.oracleCalls).toBe(stageA + 1 + evaluated);
      }
      return { accepted: accepted, ended: ended, start: start, evaluated: evaluated, current: current };
    }

    it('every candidate, winner and end of 29 passes (bounded with and without a target, and proposals) ' +
      'is what the table says', function () {
      var ends = { policy: 0 };
      var applied = 0;
      allRuns().forEach(function (run) {
        var out = replay(run);
        if (out.ended !== null) ends[out.ended]++;
        applied += out.accepted;
      });
      expect(applied).toBeGreaterThan(100);
      // a pass that the table ends before the minimal puzzle needs a state that uses its tier, which these
      // seeded passes rarely reach (the scripted pools below cover that end); where one does, the replay held
      expect(ends.policy).toBeLessThan(CASES.length);
    });

    it('those passes meet every kind of objective: each refusal reason, scores, and stuck proposals', function () {
      var reasons = {};
      var scores = 0;
      var stuck = 0;
      allRuns().forEach(function (run) {
        run.log.forEach(function (entry) {
          if (entry.op === 'reject') reasons[entry.reason] = true;
          if (entry.op === 'keep') {
            expect(entry.score === null || Number.isInteger(entry.score)).toBe(true);
            if (entry.score === null) stuck++;
            else scores++;
          }
        });
      });
      expect(Object.keys(reasons).sort()).toEqual(['ambiguous', 'techniques', 'tooHard']);
      expect(scores).toBeGreaterThan(300);
      expect(stuck).toBeGreaterThan(30);
    });
  });

  // The pools, the apply table and the end of the pass, with a scripted solver. Stage A runs on the real solver;
  // from the start of the guided pass (its `dig.pass.start` event) `SG.logicalSolver.solve` and
  // `SG.difficulty.classify` answer from the script: first the pass's own board, then every candidate of a
  // pool in order (a pool ends with an applied removal). Each answer is `[score, tierUsed]` or 'stuck'. One
  // solve is one rated candidate, so the number of scripted solves is checked against the pass's own trace.
  describe('digGuidedSteps: pools, the apply table and the end of the pass, with a scripted solver (MS06c2)', function () {
    var solution = SG.fullGrid.generate(model9, SG.rng.create(41).fork('grid'), null);
    var SCRIPTED_LEVEL = 'normal';
    var TIER = D.spec(SCRIPTED_LEVEL, model9).tierTechniques[0];
    var TARGET = 300;
    var BAD = [399, false];

    /** A pool of the script: its first answers, then `rest` for every further candidate ('stuck' or BAD). */
    function pool(entries, rest) { return { entries: entries, rest: rest === undefined ? BAD : rest }; }

    function report(answer) {
      if (answer === 'stuck') return { solved: false, techniqueCounts: {}, state: { unsolvedCount: 7 } };
      var counts = { nakedSingle: 30 };
      if (answer[1]) counts[TIER] = 1;
      return { solved: true, techniqueCounts: counts, scripted: answer[0] };
    }

    /**
     * One guided pass of Normal with no symmetry, scripted. `script`: { init (the answer for the pass's own
     * board; none for a proposal pass), pools: [pool, ...] }; a pool beyond the script answers 'stuck'.
     */
    function scripted(script, options) {
      var real = SG.logicalSolver.solve;
      var realClassify = D.classify;
      var on = false;
      var initial = script.init !== undefined;
      var calls = 0;
      var poolIndex = 0;
      var inPool = 0;
      var tries = 0;
      var keys = [];
      var shuffles = 0;
      var start = null;
      SG.logicalSolver.solve = function () {
        if (!on) return real.apply(this, arguments);
        calls++;
        var answer;
        if (initial) {
          initial = false;
          answer = script.init;
        } else {
          var p = script.pools[poolIndex];
          answer = p === undefined ? 'stuck' : p.entries[inPool] !== undefined ? p.entries[inPool] : p.rest;
          inPool++;
        }
        if (answer === 'cancel') throw new SG.errors.GenerationError('budget.cancelled', {});
        if (answer === 'loop') {
          for (;;) arguments[2].budget.check();
        }
        return report(answer);
      };
      D.classify = function (rep) {
        return rep.scripted !== undefined ? { score: rep.scripted } : realClassify.apply(this, arguments);
      };
      var emit = SG.events.createEmitter('full', function (e) {
        keys.push(e.i18nKey + (e.i18nArgs && e.i18nArgs.pass ? ':' + e.i18nArgs.pass : ''));
        if (e.i18nKey === 'dig.pass.start' && e.i18nArgs.pass === 'guided') on = true;
        if (e.i18nKey === 'dig.try' && on) tries++;
        if (e.i18nKey === 'dig.accept' && on) {
          poolIndex++;
          inPool = 0;
        }
      });
      var rng = SG.rng.create(41);
      var counting = Object.assign({}, rng, {
        fork: function (tag) {
          var child = rng.fork(tag);
          if (tag === 'guided') {
            var shuffle = child.shuffle;
            child.shuffle = function (a) {
              shuffles++;
              return shuffle(a);
            };
          }
          return child;
        }
      });
      var log = [];
      var caught = null;
      var dug = null;
      try {
        dug = Z.digStage(model9, solution, SCRIPTED_LEVEL, counting, Object.assign({
          symmetry: 'none', log: log, emit: emit, target: TARGET, proposal: script.init === undefined
        }, options));
      } catch (err) {
        caught = err;
      } finally {
        SG.logicalSolver.solve = real;
        D.classify = realClassify;
      }
      var givens = Int32Array.from(solution);
      var stageA = 0;
      var i = 0;
      while (!(log[i].op === 'pass' && log[i].pass === 'guided')) {
        if (log[i].op === 'accept') givens[log[i].cells[0]] = 0;
        if (log[i].op === 'accept' || log[i].op === 'reject') stageA++;
        i++;
      }
      start = givens;
      var pass = log.slice(i + 1);
      return {
        dug: dug, error: caught, log: log, pass: pass, calls: calls, tries: tries, keys: keys, shuffles: shuffles,
        start: start, stageA: stageA,
        ops: function (op) { return pass.filter(function (e) { return e.op === op; }); },
        ends: keys.filter(function (k) { return k === 'dig.pass.end:guided'; }).length
      };
    }

    function removedBy(run, accepts) {
      var givens = Int32Array.from(run.start);
      accepts.forEach(function (e) { e.cells.forEach(function (c) { givens[c] = 0; }); });
      return givens;
    }

    it('a winner the table does not allow ends the pass: no further rating, draw or end record', function () {
      // the board needs the tier at 320; the nearest tier-using candidate (340) is no nearer, the tier-less
      // 310 is nearer still but never trades for the tier
      var run = scripted({ init: [320, true], pools: [pool([[340, true], [390, true], [310, false]])] });
      expect(run.error).toBe(null);
      expect(run.ops('accept')).toEqual([]);
      expect(Array.from(run.dug.givens)).toEqual(Array.from(run.start));
      expect(run.ops('keep').slice(0, 3).map(function (e) { return e.score; })).toEqual([340, 390, 310]);
      expect(run.tries).toBeGreaterThan(3);
      // one solve for the board and one per candidate: nothing after the refused winner
      expect(run.calls).toBe(1 + run.tries);
      expect(run.shuffles).toBe(1);
      expect(run.ends).toBe(1);
      expect(run.dug.stats.oracleCalls).toBe(run.stageA + 1 + run.tries);
      // the losers are not rejected: only the unscripted candidates, which answered 399 here, stay too
      expect(run.ops('reject')).toEqual([]);
    });

    it('applies a tier-using winner strictly nearer the target, then ends on the next that is not', function () {
      var run = scripted({
        init: [350, true],
        pools: [pool([[320, true], [340, true]]), pool([[330, true]]), pool([[300, true]])]
      });
      expect(run.error).toBe(null);
      var accepts = run.ops('accept');
      // 320 is nearer than 350 and wins its pool; the next pool offers 330 (a distance of 30 against 20: no)
      expect(accepts).toHaveLength(1);
      var keeps = run.ops('keep');
      expect(keeps[0].score).toBe(320);
      expect(accepts[0].cells).toEqual(keeps[0].cells);
      expect(Array.from(run.dug.givens)).toEqual(Array.from(removedBy(run, accepts)));
      expect(run.shuffles).toBe(2);
      expect(run.calls).toBe(1 + run.tries);
      expect(run.ends).toBe(1);
    });

    it('a state without the tier takes any winner, farther ones too, and moves on when the tier is found',
      function () {
        var run = scripted({
          init: [350, false],
          pools: [pool([[390, false], [310, false], [330, false]]), pool([[370, false]]), pool([[305, true]]),
            pool([[310, true]])]
        });
        expect(run.error).toBe(null);
        var accepts = run.ops('accept');
        var keeps = run.ops('keep');
        function keepOf(score) {
          return keeps.filter(function (e) { return e.score === score; })[0].cells;
        }
        // 310 is the nearest of the first pool, 370 the only success of the second (farther than 310: false and
        // false stays allowed), 305 finds the tier, and 310 with the tier is no nearer than 305
        expect(accepts.map(function (e) { return e.cells; }))
          .toEqual([keepOf(310), keepOf(370), keepOf(305)]);
        expect(run.calls).toBe(1 + run.tries);
        expect(run.ends).toBe(1);
      });

    it('without a target the winner always applies once the tier is used: unbounded digging is kept', function () {
      var run = scripted({
        init: [320, true],
        pools: [pool([[340, true], [310, true]]), pool([[395, true]]), pool([[100, true]])]
      }, { target: null });
      var accepts = run.ops('accept');
      var keeps = run.ops('keep');
      // the higher score wins without a target, and every tier-using winner applies, even a farther or lower one
      expect(keeps[0].score).toBe(340);
      expect(accepts[0].cells).toEqual(keeps[0].cells);
      expect(accepts.length).toBeGreaterThanOrEqual(3);
      expect(run.calls).toBe(1 + run.tries);
    });

    it('an all-refused pool goes on with the next one; its refusals stay marked; an empty pool ends', function () {
      var run = scripted({
        init: [350, true],
        pools: [pool([], 'stuck'), pool([[320, true]], 'stuck')]
      });
      expect(run.error).toBe(null);
      var rejects = run.ops('reject');
      // the first pool of 32 candidates is refused as a whole, so the second one is drawn from the rest
      expect(run.shuffles).toBeGreaterThanOrEqual(2);
      expect(rejects.length).toBeGreaterThanOrEqual(32);
      rejects.forEach(function (e) { expect(e.reason).toBe('techniques'); });
      // no group is tried twice in the pass: a refusal is final
      var tried = {};
      run.pass.forEach(function (e) {
        if (e.op === 'reject' || e.op === 'keep') {
          expect(tried[e.cells.join(',')]).toBeUndefined();
          tried[e.cells.join(',')] = true;
        }
      });
      expect(run.calls).toBe(1 + run.tries);
      expect(run.ends).toBe(1);
    });

    it('every candidate refused ends the pass on an empty pool, with the board it had', function () {
      var run = scripted({ init: [350, true], pools: [pool([], 'stuck'), pool([], 'stuck'), pool([], 'stuck')] });
      expect(run.error).toBe(null);
      expect(run.ops('accept')).toEqual([]);
      expect(run.ops('keep')).toEqual([]);
      expect(Array.from(run.dug.givens)).toEqual(Array.from(run.start));
      expect(run.calls).toBe(1 + run.tries);
      expect(run.ops('reject')).toHaveLength(run.tries);
      expect(run.ends).toBe(1);
    });

    it('rates its own board once, counted once; a board it cannot rate ends the pass on the board it got',
      function () {
        [['stuck', 'techniques'], [[420, true], 'tooHard'], ['loop', 'step guard']].forEach(function (c) {
          var run = scripted({ init: c[0], pools: [pool([[320, true]])] });
          expect([c[1], run.error]).toEqual([c[1], null]);
          expect(run.calls).toBe(1);
          expect(run.tries).toBe(0);
          expect(run.pass).toEqual([]);
          expect(Array.from(run.dug.givens)).toEqual(Array.from(run.start));
          expect(run.dug.stats.oracleCalls).toBe(run.stageA + 1);
          expect(run.ends).toBe(1);
        });
      });

    it('a cancellation or an error of the evaluation of the board propagates unchanged', function () {
      var run = scripted({ init: 'cancel', pools: [] });
      expect(run.error).toBeInstanceOf(SG.errors.GenerationError);
      expect(run.error.code).toBe('budget.cancelled');
      expect(run.calls).toBe(1);
      var inPool = scripted({ init: [350, true], pools: [pool(['cancel'])] });
      expect(inPool.error.code).toBe('budget.cancelled');
    });

    it('a proposal pass has no state and no target: it applies the highest priority, stuck above every score',
      function () {
        var run = scripted({ pools: [pool([[500, true], 'stuck', [650, false]], 'stuck')] });
        expect(run.error).toBe(null);
        var keeps = run.ops('keep');
        // a solved candidate keeps its score in the log, a stuck one shows null (its priority is above 1e9)
        expect(keeps.slice(0, 3).map(function (e) { return e.score; })).toEqual([500, null, 650]);
        var accepts = run.ops('accept');
        expect(accepts[0].cells).toEqual(keeps[1].cells);
        // no bounded state: the pass goes on after a lower or farther priority, and nothing was solved for it
        expect(run.calls).toBe(run.ops('keep').length + run.ops('reject').filter(function (e) {
          return e.reason !== 'ambiguous';
        }).length);
      });

    it('is the same pass cooperatively as synchronously: givens, statistics, dig log and events', function () {
      function once(cooperative) {
        var log = [];
        var keys = [];
        var emit = SG.events.createEmitter('full', function (e) { keys.push([e.i18nKey, e.i18nArgs]); });
        var rng = SG.rng.create(41);
        var out = Z.digStage(model9, solution, 'expert', rng.fork('dig'),
          { log: log, emit: emit, target: 850, cooperative: cooperative });
        if (cooperative) out = SG.budget.drive(out);
        return { givens: Array.from(out.givens), clues: out.clues, stats: out.stats, log: log, keys: keys };
      }
      expect(once(true)).toEqual(once(false));
    });
  });

  // ---------------------------------------------------------------------------------------------------------
  // The typed objective of a removal
  // ---------------------------------------------------------------------------------------------------------

  describe('removalObjective: the typed objective of one removal (MS06c1)', function () {
    var solution = SG.fullGrid.generate(model9, SG.rng.create(21).fork('grid'), null);
    var GROUPS = SG.symmetry.groups(model9, 'rotational180');
    // Guided digs that end on puzzles whose removals show both kinds of bounded objective and both reasons
    // to refuse: [level, seed, minClues].
    var STATES = [['normal', 18, 30], ['normal', 25, 30], ['normal', 5, 38], ['veryEasy', 4, 40]];

    /** The puzzle a guided dig of `level` ends on when it may not go below `minClues`. */
    function stateOf(level, seed, minClues) {
      var dug = Z.digStage(model9, solution, level, SG.rng.create(seed).fork('dig'), { minClues: minClues });
      return { spec: D.spec(level, model9), givens: dug.givens };
    }

    /** The givens with one group of clues cleared, the form an objective is called with. */
    function cleared(givens, group) {
      var out = Int32Array.from(givens);
      group.forEach(function (c) { out[c] = 0; });
      return out;
    }

    /** The groups that are all there, each with its cleared givens. */
    function removals(state) {
      return GROUPS.filter(function (g) {
        return Array.from(g).every(function (c) { return state.givens[c] !== 0; });
      }).map(function (g) { return { group: g, givens: cleared(state.givens, g) }; });
    }

    /** What `spec` makes of the removal, from the solver's own report: the contract, worked out apart. */
    function expectedBounded(spec, givens) {
      var report = SG.logicalSolver.solve(model9, givens, {
        allowedTechniques: spec.allowedTechniques, collectSteps: false, assumeUniqueness: false, budget: null
      });
      if (!report.solved) return refused('techniques');
      var score = D.classify(report, model9).score;
      if (score >= spec.max) return refused('tooHard');
      var used = spec.tierTechniques.some(function (id) { return report.techniqueCounts[id] > 0; });
      return bounded(score, D.levelIndex(spec.level) === 0 || spec.tierTechniques.length === 0 || used);
    }

    function call(objective, removal, stats) {
      return objective(removal.givens, solution, removal.group, null, stats || { oracleCalls: 0 });
    }

    /** `fn` with `SG.logicalSolver.solve` replaced by `stub`; the real one is put back. */
    function withSolver(stub, fn) {
      var real = SG.logicalSolver.solve;
      SG.logicalSolver.solve = stub;
      try {
        return fn();
      } finally {
        SG.logicalSolver.solve = real;
      }
    }

    it('a bounded removal is { score, tierUsed } or refused techniques or tooHard, as the solver says',
      function () {
        var seen = { reasons: {}, tier: {} };
        STATES.forEach(function (s) {
          var state = stateOf(s[0], s[1], s[2]);
          var objective = Z.removalObjective(model9, state.spec, false);
          removals(state).forEach(function (r) {
            var stats = { oracleCalls: 0 };
            var got = call(objective, r, stats);
            expect(got).toEqual(expectedBounded(state.spec, r.givens));
            expect(stats.oracleCalls).toBe(1);
            if (got.kind === 'refused') seen.reasons[got.reason] = true;
            else seen.tier[got.tierUsed] = true;
          });
        });
        expect(Object.keys(seen.reasons)).toEqual(['techniques']);
        expect(Object.keys(seen.tier).sort()).toEqual(['false', 'true']);
      });

    it('costs the one restricted solve of before: one classification, and no solve for the tier', function () {
      var state = stateOf('normal', 18, 30);
      var objective = Z.removalObjective(model9, state.spec, false);
      var realSolve = SG.logicalSolver.solve;
      var realClassify = D.classify;
      var solves = 0;
      var classified = 0;
      SG.logicalSolver.solve = function () {
        solves++;
        return realSolve.apply(this, arguments);
      };
      D.classify = function () {
        classified++;
        return realClassify.apply(this, arguments);
      };
      var asked = removals(state);
      var answered = 0;
      try {
        asked.forEach(function (r) { if (call(objective, r).kind === 'bounded') answered++; });
      } finally {
        SG.logicalSolver.solve = realSolve;
        D.classify = realClassify;
      }
      expect(answered).toBeGreaterThan(3);
      expect(solves).toBe(asked.length);
      expect(classified).toBe(asked.filter(function (r) {
        return expectedBounded(state.spec, r.givens).reason !== 'techniques';
      }).length);
    });

    it('a score at or above the band maximum is refused tooHard (the maximum is exclusive)', function () {
      var state = stateOf('normal', 18, 30);
      var removal = removals(state).filter(function (r) {
        return expectedBounded(state.spec, r.givens).kind === 'bounded';
      })[0];
      var score = expectedBounded(state.spec, removal.givens).score;
      [1, score].forEach(function (max) {
        var spec = Object.assign({}, state.spec, { max: max });
        expect(call(Z.removalObjective(model9, spec, false), removal)).toEqual(refused('tooHard'));
      });
      var spec = Object.assign({}, state.spec, { max: score + 1 });
      expect(call(Z.removalObjective(model9, spec, false), removal).score).toBe(score);
    });

    it('a stuck solve and the step guard are refused techniques; another error is not swallowed', function () {
      var state = stateOf('normal', 18, 30);
      var removal = removals(state)[0];
      var objective = Z.removalObjective(model9, state.spec, false);
      withSolver(function () { return { solved: false, techniqueCounts: {} }; }, function () {
        expect(call(objective, removal)).toEqual(refused('techniques'));
      });
      var checks = 0;
      withSolver(function (model, givens, options) {
        for (;;) {
          checks++;
          options.budget.check();
        }
      }, function () {
        expect(call(objective, removal)).toEqual(refused('techniques'));
      });
      expect(checks).toBe(100001);
      [new Error('boom'), new SG.errors.GenerationError('budget.cancelled', {})].forEach(function (err) {
        withSolver(function () { throw err; }, function () {
          var caught = null;
          try {
            call(objective, removal);
          } catch (e) {
            caught = e;
          }
          expect(caught).toBe(err);
        });
      });
    });

    it('the tier is vacuous for Very Easy and for an empty tier: tierUsed is true whatever the solve used',
      function () {
        var veryEasy = stateOf('veryEasy', 4, 40);
        var removal = removals(veryEasy).filter(function (r) {
          return expectedBounded(veryEasy.spec, r.givens).kind === 'bounded';
        })[0];
        // Very Easy has a tier (the singles), but it is vacuous: a tier the solve cannot have used still counts
        var odd = Object.assign({}, veryEasy.spec, { tierTechniques: ['xyWing'] });
        expect(call(Z.removalObjective(model9, odd, false), removal).tierUsed).toBe(true);
        // the same removal in Normal: the tier decides, and an empty tier is vacuous again
        var state = stateOf('normal', 18, 30);
        var shallow = removals(state).filter(function (r) {
          var got = expectedBounded(state.spec, r.givens);
          return got.kind === 'bounded' && got.tierUsed === false;
        })[0];
        expect(call(Z.removalObjective(model9, state.spec, false), shallow).tierUsed).toBe(false);
        var none = Object.assign({}, state.spec, { tierTechniques: [] });
        expect(call(Z.removalObjective(model9, none, false), shallow).tierUsed).toBe(true);
      });

    it('a refusal is one frozen value per reason, the same for every removal that has it', function () {
      var state = stateOf('normal', 18, 30);
      var spec = Object.assign({}, state.spec, { max: 1 });
      var objective = Z.removalObjective(model9, spec, false);
      var solved = removals(state).filter(function (r) {
        return expectedBounded(state.spec, r.givens).kind === 'bounded';
      });
      expect(solved.length).toBeGreaterThan(1);
      var first = call(objective, solved[0]);
      expect(first).toEqual(refused('tooHard'));
      expect(Object.isFrozen(first)).toBe(true);
      expect(call(objective, solved[1])).toBe(first);
    });

    it('a proposal stays a proposal when its solve finishes: its priority is the score; stuck: STUCK + left',
      function () {
        var spec = D.spec('nightmare', model9);
        var objective = Z.removalObjective(model9, spec, true);
        // the whole grid but one group: unique, and finished by the techniques below the chain group
        var removal = { group: GROUPS[3], givens: cleared(solution, GROUPS[3]) };
        var got = call(objective, removal);
        var report = SG.logicalSolver.solve(model9, removal.givens, {
          allowedTechniques: spec.allowedTechniques.filter(function (id) {
            return SG.techniques.get(id).group !== 'chain';
          }),
          collectSteps: false, assumeUniqueness: true, budget: null
        });
        expect(report.solved).toBe(true);
        expect(got).toEqual(proposal(D.classify(report, model9).score));
        expect(got.priority).toBeLessThan(STUCK);
        // not solved: above everything, the more cells left open the better
        [1, 7, 30].forEach(function (left) {
          withSolver(function () { return { solved: false, state: { unsolvedCount: left } }; }, function () {
            expect(call(objective, removal)).toEqual(proposal(STUCK + left));
          });
        });
      });

    it('a proposal that is not unique is refused ambiguous, and no solve is spent on it', function () {
      var objective = Z.removalObjective(model9, D.spec('nightmare', model9), true);
      var minimal = Z.dig(model9, solution, SG.rng.create(3).fork('minimal'), {});
      var removal = removals({ givens: minimal.givens })[0];
      var solves = 0;
      var stats = { oracleCalls: 0 };
      withSolver(function () {
        solves++;
        throw new Error('no solve is expected');
      }, function () {
        expect(call(objective, removal, stats)).toEqual(refused('ambiguous'));
      });
      expect(solves).toBe(0);
      expect(stats.oracleCalls).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------------------------------------
  // The target as data: the keeper views, the sample, the search and the result
  // ---------------------------------------------------------------------------------------------------------

  var LEVEL = 'normal';
  var NORMAL = D.spec(LEVEL, model9);
  var BASIC = { nakedSingle: 40, hiddenSingleBox: 8, pointing: 3, nakedPair: 2 };

  /** A complete canonical rating as `SG.difficulty.rate` reports it; the technique counts decide the tier. */
  function complete(score, counts, hardest) {
    return {
      level: LEVEL, score: score, rawScore: score, hardestTechnique: hardest || 'nakedSingle',
      hardestGroup: 'basic', confidence: 1, solved: true, empties: 50, techniqueCounts: counts,
      ratingVersion: D.RATING_VERSION
    };
  }
  // Normal asks for a technique of its tier (hiddenPair, nakedTriple ...): REQUIRED has one, SHALLOW has not.
  var SHALLOW = complete(250, BASIC);
  var SHALLOW_2 = complete(260, BASIC);
  // A complete rating one level below Normal: the closest a sample can be without being in the band.
  var EASY_RATING = Object.assign(complete(120, BASIC), { level: 'easy' });
  var REQUIRED = complete(230, Object.assign({ hiddenPair: 1 }, BASIC), 'hiddenPair');
  var REQUIRED_2 = complete(300, Object.assign({ nakedTriple: 1 }, BASIC), 'nakedTriple');

  function zeroStats() {
    return { groups: 0, tried: 0, accepted: 0, rejected: 0, skipped: 0, oracleCalls: 0 };
  }

  describe('the keeper views: every candidate carries the target of its own sample or search (MS06c1)', function () {
    var solution = SG.fullGrid.generate(model9, SG.rng.create(11).fork('grid'), null);
    // A redundant puzzle (58 clues or more): it stays unique when clues are shown again, or one group goes.
    var base = Z.dig(model9, solution, SG.rng.create(11).fork('base'), { minClues: 58 });

    /** `givens` with the first `extra` empty symmetry groups shown again. */
    function more(givens, extra) {
      var out = Int32Array.from(givens);
      SG.symmetry.groups(model9, 'rotational180').forEach(function (g) {
        if (extra > 0 && Array.from(g).every(function (c) { return out[c] === 0; })) {
          g.forEach(function (c) { out[c] = solution[c]; });
          extra--;
        }
      });
      return out;
    }

    var A = base.givens;
    var B = more(A, 1);
    var C = more(A, 2);

    function candidate(givens, rating) {
      return { model: model9, givens: givens, solution: solution, rating: rating, logOf: function () { return []; } };
    }

    function fresh() {
      return Z.createKeeper(NORMAL, LEVEL, null);
    }

    it('gives the keeper a copy of the candidate with the captured scalar; keptPuzzle hands it on', function () {
      var keeper = fresh();
      var offered = candidate(A, REQUIRED);
      expect(Z.keeperView(keeper, 812.5).offer(offered)).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(offered, 'target')).toBe(false);
      expect(keeper.best.target).toBe(812.5);
      var puzzle = Z.keptPuzzle(keeper.best, LEVEL);
      expect(puzzle.target).toBe(812.5);
      expect(puzzle.exact).toBe(true);
      expect(Array.from(puzzle.givens)).toEqual(Array.from(A));
    });

    it('keeps a number, zero and null as they are; anything else is no target, never a guess', function () {
      [[812.5, 812.5], [0, 0], [-3, -3], [null, null], [undefined, null], [NaN, null], [Infinity, null],
        ['812', null], [{}, null]].forEach(function (pair) {
        var keeper = fresh();
        Z.keeperView(keeper, pair[0]).offer(candidate(A, REQUIRED));
        expect([pair[0], keeper.best.target]).toEqual([pair[0], pair[1]]);
        expect(Z.keptPuzzle(keeper.best, LEVEL).target).toBe(pair[1]);
      });
      expect(Z.keeperView(null, 5)).toBe(null);
      expect(Z.keeperView(undefined, 5)).toBe(null);
    });

    it('the original keeper (a structure search) keeps no target, and a view overrides what is named',
      function () {
        var keeper = fresh();
        expect(keeper.offer(candidate(A, SHALLOW))).toBe(true);
        expect(keeper.best.target).toBe(null);
        expect(Z.keptPuzzle(keeper.best, LEVEL).target).toBe(null);
        var named = Object.assign(candidate(B, REQUIRED), { target: 999 });
        expect(Z.keeperView(keeper, 812).offer(named)).toBe(true);
        expect(keeper.best.target).toBe(812);
        expect(named.target).toBe(999);
      });

    it('is the shared keeper read live: best, distance, unsound and the model-aware closer', function () {
      var keeper = fresh();
      var view = Z.keeperView(keeper, 812);
      expect(Object.keys(view)).toEqual(['offer']);
      expect(view.closer).toBe(keeper.closer);
      expect([view.best, view.distance, view.unsound]).toEqual([null, Infinity, false]);
      keeper.offer(candidate(A, SHALLOW));
      expect(view.best).toBe(keeper.best);
      expect(view.distance).toBe(0.5);
      expect(view.closer(REQUIRED, model9)).toBe(true);
      expect(view.closer(REQUIRED, null)).toBe(false);
      expect(view.closer(SHALLOW_2, model9)).toBe(false);
      keeper.unsound = true;
      expect(view.unsound).toBe(true);
      // the view holds no state of its own, so a kept candidate of the view is the keeper's
      expect(view.offer(candidate(B, REQUIRED))).toBe(true);
      expect(Object.keys(view)).toEqual(['offer']);
      expect([keeper.distance, view.distance]).toEqual([0, 0]);
    });

    it('offers to the original keeper, with its own receiver and without a second uniqueness check',
      function () {
        var keeper = fresh();
        var real = keeper.offer;
        var receivers = [];
        keeper.offer = function (c) {
          receivers.push([this, c.target]);
          return real.call(this, c);
        };
        var view = Z.keeperView(keeper, 5);
        expect(view.offer(candidate(A, SHALLOW))).toBe(true);
        expect(view.offer(candidate(B, SHALLOW_2))).toBe(false);
        expect(receivers).toHaveLength(2);
        expect(receivers[0][0]).toBe(keeper);
        expect(receivers.map(function (r) { return r[1]; })).toEqual([5, 5]);
      });

    it('two contexts on one keeper: the winner keeps the target of the context that offered it', function () {
      var keeper = fresh();
      var a = Z.keeperView(keeper, 812);
      var b = Z.keeperView(keeper, 915);
      // an earlier structure-only winner has no target, and no later candidate of equal quality replaces it
      expect(keeper.offer(candidate(A, SHALLOW))).toBe(true);
      expect(a.offer(candidate(B, SHALLOW_2))).toBe(false);
      expect(b.offer(candidate(C, SHALLOW_2))).toBe(false);
      expect(keeper.best.target).toBe(null);
      // A offers the strictly better one; B's later one is no better and does not take the target
      expect(a.offer(candidate(B, REQUIRED))).toBe(true);
      expect(b.offer(candidate(C, REQUIRED_2))).toBe(false);
      expect(keeper.best.target).toBe(812);
      expect(Z.keptPuzzle(keeper.best, LEVEL).target).toBe(812);
      expect(Array.from(keeper.best.givens)).toEqual(Array.from(B));
      // a winner of B's has B's target, not the last one that was kept
      var other = fresh();
      expect(Z.keeperView(other, 812).offer(candidate(A, SHALLOW))).toBe(true);
      expect(Z.keeperView(other, 915).offer(candidate(B, REQUIRED))).toBe(true);
      expect(Z.keptPuzzle(other.best, LEVEL).target).toBe(915);
    });

    describe('suspended contexts (cooperative yields) with different targets, one shared keeper', function () {
      /**
       * A dig strategy that follows `script`: offers to its keeper, or `'pause'` for a cooperative yield. The
       * keeper it is given is a view whose prototype is the one original keeper of the run, never another
       * context's view.
       */
      function scripted(script, trace, original) {
        return function (model, sol, level, rng, o) {
          expect(Object.getPrototypeOf(o.keeper)).toBe(original);
          expect(Object.getPrototypeOf(Object.getPrototypeOf(o.keeper))).toBe(Object.prototype);
          return (function* () {
            for (var i = 0; i < script.length; i++) {
              if (script[i] === 'pause') {
                yield;
              } else {
                trace.push([script[i][0], o.keeper.offer(candidate(script[i][1], script[i][2]))]);
              }
            }
            return { givens: A, clues: A.reduce(function (n, v) { return n + (v === 0 ? 0 : 1); }, 0),
              stats: zeroStats(), rating: SHALLOW };
          })();
        };
      }

      function context(keeper, target, script, trace) {
        return Z.digLevelSteps(model9, solution, LEVEL, SG.rng.create(1), {
          keeper: keeper, target: target, cooperative: true, strategy: scripted(script, trace, keeper)
        });
      }

      /**
       * Runs context A up to its pause, then context B to its end, then A to its end. `prelude` is offered to
       * the original keeper before either starts.
       */
      function interleave(prelude, scriptA, scriptB) {
        var keeper = fresh();
        var trace = [];
        if (prelude) keeper.offer(candidate(prelude[0], prelude[1]));
        var a = context(keeper, 812, scriptA, trace);
        var step = a.next();
        while (!step.done && trace.length === 0) step = a.next();
        expect(step.done).toBe(false);
        var puzzleB = SG.budget.drive(context(keeper, 915, scriptB, trace));
        while (!step.done) step = a.next();
        return { keeper: keeper, trace: trace, a: step.value, b: puzzleB };
      }

      it('a later context that starts, offers and ends in between does not change the target of the earlier ' +
        'one\'s offers', function () {
          var run = interleave(null,
            [['a1', B, SHALLOW], 'pause', ['a2', C, REQUIRED]],
            [['b1', C, SHALLOW_2]]);
          expect(run.trace).toEqual([['a1', true], ['b1', false], ['a2', true]]);
          expect(run.keeper.best.target).toBe(812);
          expect(Array.from(run.keeper.best.givens)).toEqual(Array.from(C));
          expect(Z.keptPuzzle(run.keeper.best, LEVEL).target).toBe(812);
          expect([run.a.target, run.b.target]).toEqual([812, 915]);
        });

      it('the winner offered by the later context has its own target; the earlier one\'s later offer loses',
        function () {
          var run = interleave(null,
            [['a1', B, SHALLOW], 'pause', ['a2', C, REQUIRED_2]],
            [['b1', C, REQUIRED]]);
          expect(run.trace).toEqual([['a1', true], ['b1', true], ['a2', false]]);
          expect(run.keeper.best.target).toBe(915);
          expect(Z.keptPuzzle(run.keeper.best, LEVEL).target).toBe(915);
          expect([run.a.target, run.b.target]).toEqual([812, 915]);
        });

      it('an earlier structure-only winner stays with no target whatever the contexts offer', function () {
        var run = interleave([A, REQUIRED],
          [['a1', B, REQUIRED_2], 'pause', ['a2', C, REQUIRED_2]],
          [['b1', C, REQUIRED_2]]);
        expect(run.trace).toEqual([['a1', false], ['b1', false], ['a2', false]]);
        expect(run.keeper.best.target).toBe(null);
        expect(Z.keptPuzzle(run.keeper.best, LEVEL).target).toBe(null);
        expect(Array.from(run.keeper.best.givens)).toEqual(Array.from(A));
      });
    });
  });

  describe('a sample, a search and a generation carry their target (MS06c2)', function () {
    var solution = SG.fullGrid.generate(model9, SG.rng.create(11).fork('grid'), null);
    var base = Z.dig(model9, solution, SG.rng.create(11).fork('base'), { minClues: 58 });
    var CLUES = base.givens.reduce(function (n, v) { return n + (v === 0 ? 0 : 1); }, 0);
    // What the outer caller passes to `generate`, and what an own `target` of a lower-level call comes back as.
    // Under IR39(b) a caller value on `generate` reaches no sample: every sample draws its own.
    var TARGETS = [[812.5, 812.5], [0, 0], [null, null], [undefined, null], [NaN, null]];
    var SEED = 7;

    function options(target, rest) {
      var out = Object.assign({}, rest);
      if (target !== undefined) out.target = target;
      return out;
    }

    /**
     * The target that sample `t` of attempt 1 must have drawn, worked out on a test stream from the known
     * seed of `generate` and the literal fork path of the sample, never from the production stream.
     */
    function drawn(t) {
      return P.targetFor(NORMAL, SG.rng.create(SEED).fork('dig#1.' + t));
    }

    /**
     * A dig strategy that returns the redundant puzzle. `plan[i]` is `{ rating, offered }` for its i-th call
     * (the last entry repeats): the rating it hands back and what it offers to the keeper view it is given.
     */
    function planned(plan) {
      var calls = 0;
      return function (model, sol, level, rng, o) {
        var step = plan[Math.min(calls, plan.length - 1)];
        calls++;
        if (step.offered) {
          o.keeper.offer({ model: model, givens: base.givens, solution: sol, rating: step.offered,
            logOf: function () { return []; } });
        }
        return { givens: base.givens, clues: CLUES, stats: zeroStats(), rating: step.rating };
      };
    }

    function generate(target, plan, rest, rng) {
      return Z.generate(model9, LEVEL, rng || SG.rng.create(SEED),
        options(target, Object.assign({ strategy: planned(plan), maxAttempts: 1, digTries: 1 }, rest)));
    }

    /** `value` is not one the caller could have meant: the drawn target of a sample is its own number. */
    function ownDraw(out, t, pair) {
      expect([pair[0], out.target]).toEqual([pair[0], drawn(t)]);
      if (Number.isFinite(pair[0])) expect(out.target).not.toBe(pair[0]);
    }

    it('the draws of the controlled samples are distinct numbers of the band, one per sample', function () {
      var all = [drawn(1), drawn(2), drawn(3)];
      all.forEach(function (t) {
        expect(t).toBeGreaterThanOrEqual(NORMAL.min);
        expect(t).toBeLessThan(NORMAL.max);
      });
      expect(new Set(all).size).toBe(3);
    });

    it('digLevel returns the target of its call: a number, zero or null as given, an absent one initialized ' +
      'once', function () {
      TARGETS.forEach(function (pair) {
        var puzzle = Z.digLevel(model9, solution, 'easy', SG.rng.create(12), options(pair[0]));
        var expected = pair[0] === undefined ? P.targetFor(D.spec('easy', model9), SG.rng.create(12)) : pair[1];
        expect([pair[0], puzzle.target]).toEqual([pair[0], expected]);
      });
    });

    it('generate returns the target of the sample that is the result', function () {
      TARGETS.forEach(function (pair) {
        // the only sample is exact: it is the result, with its own draw whatever the caller named
        var out = generate(pair[0], [{ rating: REQUIRED }]);
        expect(out.exact).toBe(true);
        ownDraw(out, 1, pair);
        // an earlier sample is the closest: the result is the second of three, not the last one drawn
        var middle = generate(pair[0], [{ rating: EASY_RATING }, { rating: SHALLOW }, { rating: EASY_RATING }],
          { digTries: 3, maxProposals: 3 });
        expect(middle.exact).toBe(false);
        expect(middle.rating).toBe(SHALLOW);
        ownDraw(middle, 2, pair);
        expect(middle.target).not.toBe(drawn(1));
        expect(middle.target).not.toBe(drawn(3));
      });
    });

    it('generate returns the target of the kept candidate that beats its samples', function () {
      TARGETS.forEach(function (pair) {
        // the first sample offers nothing; the second offers an exact candidate: its context's target is kept
        var out = generate(pair[0], [{ rating: SHALLOW }, { rating: SHALLOW, offered: REQUIRED }],
          { digTries: 3 });
        expect(out.exact).toBe(true);
        expect(out.rating).toBe(REQUIRED);
        expect(out.samples).toBe(2);
        ownDraw(out, 2, pair);
        expect(out.target).not.toBe(drawn(1));
      });
    });

    it('generate returns the target of the local search that found the winner', function () {
      var real = D.rate;
      var rated = 0;
      D.rate = function () {
        rated++;
        return REQUIRED;
      };
      try {
        TARGETS.forEach(function (pair) {
          rated = 0;
          var tags = [];
          // the closest sample is the middle one: the search continues it and inherits its target, never the
          // last sample's, the caller's or a draw of the search stream
          var out = generate(pair[0], [{ rating: EASY_RATING }, { rating: SHALLOW }, { rating: EASY_RATING }],
            { digTries: 3 }, spied(SG.rng.create(SEED), '', tags));
          expect(rated).toBeGreaterThan(0);
          expect(out.exact).toBe(true);
          expect(out.rating).toBe(REQUIRED);
          ownDraw(out, 2, pair);
          expect(out.target).not.toBe(drawn(3));
          expect(tags.filter(function (t) { return /^search#1\//.test(t); })).toEqual([]);
          expect(targetForks(tags).sort()).toEqual(['dig#1.1/target', 'dig#1.2/target', 'dig#1.3/target']);
        });
      } finally {
        D.rate = real;
      }
    });

    it('a structure-search winner has no target even when the samples of the run have finite ones', function () {
      // the hook offers an exact candidate to the original keeper, as a variant's structure search does
      var out = generate(null, [{ rating: SHALLOW }], {
        digTries: 2,
        postGenerate: function (ctx) {
          ctx.keeper.offer({ model: ctx.model, givens: base.givens, solution: ctx.solution, rating: REQUIRED,
            logOf: function () { return []; } });
        }
      });
      expect(out.exact).toBe(true);
      expect(out.rating).toBe(REQUIRED);
      expect(out.target).toBe(null);
    });

    it('the pipeline result carries the target of the sample that is the result, and its wire the same value',
      function () {
        var events = [];
        var result = SG.pipeline.run({ variantId: 'classic9', difficulty: 'easy', seed: 3, trace: 'summary' },
          function (e) { events.push(e); });
        var spec = D.spec('easy', model9);
        // the last dig that started before the verdict is the sample the result comes from
        var starts = events.filter(function (e) { return e.i18nKey === 'dig.start'; });
        var at = starts[starts.length - 1].i18nArgs;
        var verdict = events.filter(function (e) { return /^tune\.(hit|miss|shallow)$/.test(e.i18nKey); }).pop();
        expect(result.exact).toBe(true);
        var expected = P.targetFor(spec, SG.rng.create(3).fork('dig#' + at.attempt + '.' + at.sample));
        expect(result.target).toBe(expected);
        expect(verdict.i18nArgs.target).toBe(expected);
        expect(SG.pipeline.toWire(result).target).toBe(expected);
      });
  });

  describe('the first-allowed sign pass of Greater-Than gets its sample\'s target and does not read it ' +
    '(MS06c2, CC02)', function () {
    // A real Greater-Than Expert request: seed 319 is exact in one attempt with two samples and no local
    // search (docs/difficulty-v3/evidence/MS05e/before/expert-300-r1.json and -r2.json), so this is cheap.
    var SPEC_OF = function (model) { return D.spec('expert', model); };

    it('every invocation gets the own target of its sample; the result carries the one of its origin',
      function () {
        var original = Z.getStrategy('signs');
        var calls = [];
        var offers = [];
        var instrumented = [];
        var probes = [];

        function instrument(keeper) {
          if (instrumented.indexOf(keeper) !== -1) return;
          instrumented.push(keeper);
          var real = keeper.offer;
          keeper.offer = function (candidate) {
            offers.push({ givens: Int32Array.from(candidate.givens), signs: candidate.model.inequalities.length,
              target: candidate.target });
            return real.call(this, candidate);
          };
        }

        Z.unregisterStrategy('signs');
        Z.registerStrategy('signs', function (model, sol, level, rng, opts) {
          instrument(Object.getPrototypeOf(opts.keeper));
          var call = {
            has: Object.prototype.hasOwnProperty.call(opts, 'target'),
            target: opts.target,
            // the same stream again: the target child of a fresh stream of this stream's seed
            expected: P.targetFor(opts.spec, SG.rng.create(rng.seed)),
            original: Object.getPrototypeOf(opts.keeper)
          };
          calls.push(call);
          var out = original.apply(this, arguments);
          expect(SG.budget.isSteps(out)).toBe(false);
          call.returned = { givens: Int32Array.from(out.givens), signs: out.model.inequalities.length };
          // not consumed: the same dig with another target, or none, is the same puzzle
          if (probes.length === 0) {
            [null, 0, 1e9, 1].forEach(function (value) {
              var again = original(model, sol, level, SG.rng.create(rng.seed),
                Object.assign({}, opts, { target: value, keeper: null, caps: null, log: [], emit: null }));
              probes.push([value, Array.from(again.givens), again.model.inequalities.length]);
            });
            probes.push(['first', Array.from(out.givens), out.model.inequalities.length]);
          }
          return out;
        });
        var result;
        try {
          result = SG.pipeline.run({ variantId: 'greaterThan', difficulty: 'expert', seed: 319, trace: 'off' },
            null);
        } finally {
          Z.unregisterStrategy('signs');
          Z.registerStrategy('signs', original);
        }
        expect(Z.getStrategy('signs')).toBe(original);
        expect(calls.length).toBeGreaterThan(0);
        calls.forEach(function (call) {
          expect(call.has).toBe(true);
          expect(Number.isFinite(call.target)).toBe(true);
          expect(call.target).toBe(call.expected);
          expect(call.original).toBe(calls[0].original);
        });
        var spec = SPEC_OF(result.model);
        calls.forEach(function (call) {
          expect(call.target).toBeGreaterThanOrEqual(spec.min);
          expect(call.target).toBeLessThan(spec.max);
        });
        expect(new Set(calls.map(function (c) { return c.target; })).size).toBe(calls.length);
        // the sign pass does not read it: its puzzle is the same whatever the target
        expect(probes).toHaveLength(5);
        probes.slice(0, 4).forEach(function (p) { expect(p.slice(1)).toEqual(probes[4].slice(1)); });
        // the result comes from one candidate that a sign invocation returned or its keeper view was offered
        var origins = [];
        function sameAsResult(c) {
          return c.signs === result.model.inequalities.length &&
            Array.from(c.givens).join(',') === Array.from(result.givens).join(',');
        }
        calls.forEach(function (call) {
          if (sameAsResult(call.returned)) origins.push(['returned', call.target]);
        });
        offers.forEach(function (offer) {
          if (sameAsResult(offer)) origins.push(['offered', offer.target]);
        });
        expect(origins.length).toBeGreaterThan(0);
        expect(Number.isFinite(result.target)).toBe(true);
        origins.forEach(function (origin) { expect(result.target).toBe(origin[1]); });
        // and never the target of another invocation
        var others = calls.map(function (c) { return c.target; }).filter(function (t) { return t !== result.target; });
        expect(others.length).toBe(calls.length - 1);
      });
  });

  // The downward refinement of an entered proposal, on scripted ratings: `D.rate` answers from the list, one
  // rating for the proposal and then one per revealed group, and every answer after the list is above the band.
  describe('refineDown: an entered refinement goes on to the target and no further (MS06c2)', function () {
    var EXPERT_SPEC = D.spec('expert', model9);
    var TIER = EXPERT_SPEC.tierTechniques[0];
    var solution = SG.fullGrid.generate(model9, SG.rng.create(11).fork('grid'), null);
    // A puzzle with many empty symmetry groups to reveal, unique: the proposal the strategy hands back.
    var dug = Z.dig(model9, solution, SG.rng.create(11).fork('base'), { minClues: 30 });
    var CLUES_DUG = dug.givens.reduce(function (n, v) { return n + (v === 0 ? 0 : 1); }, 0);

    /** A rating at `score`: required (a technique of the tier) or shallow (singles only). */
    function at(score, required) {
      var counts = { nakedSingle: 40, hiddenSingleBox: 8 };
      if (required) counts[TIER] = 1;
      return {
        level: score >= 1000 ? 'master' : score >= 700 ? 'expert' : 'hard', score: score, rawScore: score,
        hardestTechnique: required ? TIER : 'nakedSingle', hardestGroup: 'basic', confidence: 1, solved: true,
        empties: 50, techniqueCounts: counts, ratingVersion: D.RATING_VERSION
      };
    }

    /** One entered proposal sample; `script` is a list of [score, required] answers, the first for the proposal. */
    function refine(script, target) {
      var real = D.rate;
      var asked = 0;
      var keeper = Z.createKeeper(EXPERT_SPEC, 'expert', null);
      var offered = [];
      var realOffer = keeper.offer;
      keeper.offer = function (candidate) {
        offered.push(candidate.rating.score);
        return realOffer.call(this, candidate);
      };
      D.rate = function () {
        var answer = script[asked] || [1100, false];
        asked++;
        return at(answer[0], answer[1]);
      };
      var options = { proposal: true, keeper: keeper, strategy: function () {
        return { givens: dug.givens, clues: CLUES_DUG, stats: zeroStats() };
      } };
      if (target !== undefined) options.target = target;
      var puzzle;
      try {
        puzzle = Z.digLevel(model9, solution, 'expert', SG.rng.create(3), options);
      } finally {
        D.rate = real;
      }
      return {
        puzzle: puzzle, asked: asked, keeper: keeper, offered: offered,
        reveals: puzzle.log.filter(function (e) { return e.op === 'reveal'; }).length
      };
    }

    it('1100 to 920 required to 880 required; 900 is farther, 840 shallow and 690 below the band: undone',
      function () {
        var run = refine([[1100, false], [920, true], [880, true], [900, true], [840, false], [690, true]], 850);
        expect(run.puzzle.rating.score).toBe(880);
        expect(run.puzzle.exact).toBe(true);
        expect(run.reveals).toBe(2);
        // 920 passed the band edge and went on to 880: the refinement was entered, it is not a new search
        var shown = 0;
        run.puzzle.log.forEach(function (e) { if (e.op === 'reveal') shown += e.cells.length; });
        expect(run.puzzle.clues).toBe(CLUES_DUG + shown);
        // every completely rated state was offered, the undone ones too; the keeper holds the first exact one
        expect(run.offered.slice(0, 6)).toEqual([1100, 920, 880, 900, 840, 690]);
        expect(run.keeper.best.rating.score).toBe(920);
        expect(run.puzzle.target).toBe(850);
      });

    it('an exact 920 in the band goes on while above the target, and stops once it is at or below it',
      function () {
        var run = refine([[1100, false], [1050, false], [690, true], [950, true], [880, true], [850, true],
          [845, true]], 850);
        expect(run.puzzle.rating.score).toBe(850);
        expect(run.reveals).toBe(4);
        // 850 is not above 850: no further rating is made, so the 845 that follows is never asked
        expect(run.asked).toBe(6);
      });

    it('a required state at or below the target ends the refinement on the first reveal that gets there',
      function () {
        var run = refine([[1100, false], [800, true], [790, true]], 850);
        expect(run.puzzle.rating.score).toBe(800);
        expect(run.asked).toBe(2);
        expect(run.reveals).toBe(1);
      });

    it('a shallow state inside the band ends it: the local search goes on from there, not the refinement',
      function () {
        var run = refine([[1100, false], [920, false], [880, true]], 850);
        expect(run.puzzle.rating.score).toBe(920);
        expect(run.puzzle.exact).toBe(false);
        expect(run.asked).toBe(2);
        expect(run.reveals).toBe(1);
      });

    it('without a finite target the first state inside the band ends it, as before (null or an open call)',
      function () {
        [null, NaN].forEach(function (target) {
          var run = refine([[1100, false], [920, true], [880, true]], target);
          expect(run.puzzle.rating.score).toBe(920);
          expect(run.asked).toBe(2);
          expect(run.reveals).toBe(1);
        });
      });

    it('never starts from a state inside the band: only a proposal above it is refined', function () {
      var run = refine([[920, true], [880, true]], 850);
      expect(run.asked).toBe(1);
      expect(run.reveals).toBe(0);
      expect(run.puzzle.rating.score).toBe(920);
    });
  });
})();
