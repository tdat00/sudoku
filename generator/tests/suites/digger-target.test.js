// The target policy of difficulty v3 (R6/R7): the pure helpers of `SG.digger.targetPolicy`, which no
// generation code calls yet, the one inert production edit of MS06b, the forwarding of an explicit
// `options.target` from `digLevelSteps` to its dig strategy (a number, null or absent: three cases), and the
// nullable transport of MS06c1: the typed objectives of the guided pass with their legacy ranking, the keeper
// views that give every candidate the target of its own sample or search, and the target of a result. Nothing
// draws a target and nothing reads one yet; the cases marked "preparation phase" are replaced by the active
// policy's tests in MS06c2, which keeps the transport ones.
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

  // Preparation-phase assertions of MS06c1: the guided pass ranks by the old numbers, and no helper is called.
  // MS06c2 replaces the legacy ranking, and these digests with it. The digests were captured with
  // tests/artifacts/difficulty-v3/MS06c1/characterize.cjs on HEAD 1d657b1, before `digger.js` was changed.
  describe('digGuidedSteps: the typed objectives rank exactly as the old numbers did (MS06c1)', function () {
    // The two-offset FNV-1a of tests/fixtures/perf-helper.js: no dependency, the same in a browser.
    var OFFSETS = [0x811c9dc5, 0x2545f491];
    function hash64(text) {
      var out = '';
      OFFSETS.forEach(function (offset) {
        var h = offset >>> 0;
        for (var i = 0; i < text.length; i++) {
          h ^= text.charCodeAt(i);
          h = Math.imul(h, 16777619) >>> 0;
        }
        out += ('00000000' + h.toString(16)).slice(-8);
      });
      return out;
    }

    // [variant, level, seed, proposal dig, digest of the pass]
    var CASES = [
      ['classic4', 'veryEasy', 4, false, '5c37a73d25bbccd9'],
      ['classic6', 'hard', 4, false, '1504b1338cf8631f'],
      ['diagonalX', 'hard', 4, false, '02db479ba1e7f7af'],
      ['classic9', 'veryEasy', 4, false, '36a778e7150f4a4b'],
      ['classic9', 'veryEasy', 9, false, '46aaa99589659ee9'],
      ['classic9', 'veryEasy', 14, false, 'b66d507ea2c41872'],
      ['classic9', 'easy', 4, false, '90e4af6cdf6bae38'],
      ['classic9', 'easy', 9, false, 'f30ef3804b7c94d4'],
      ['classic9', 'easy', 14, false, 'c5db9a75ff374131'],
      ['classic9', 'normal', 4, false, '9f11523d367c2081'],
      ['classic9', 'normal', 9, false, '83843b5840a2f114'],
      ['classic9', 'normal', 14, false, '37f83ed5ebdeb3d1'],
      ['classic9', 'hard', 4, false, '9f11523d367c2081'],
      ['classic9', 'hard', 9, false, '83843b5840a2f114'],
      ['classic9', 'hard', 14, false, 'bcc8e8c04054459c'],
      ['classic9', 'expert', 4, false, '9f11523d367c2081'],
      ['classic9', 'expert', 9, false, '83843b5840a2f114'],
      ['classic9', 'expert', 14, false, 'bcc8e8c04054459c'],
      ['classic9', 'master', 4, false, '943f9768c67c2294'],
      ['classic9', 'master', 9, false, 'e0628e8d53d813b9'],
      ['classic9', 'master', 14, false, 'ec008c6cbe25b3f0'],
      ['classic9', 'normal', 4, true, '1a0cbe1abecb6666'],
      ['classic9', 'expert', 9, true, '8d259d8602d9466a'],
      ['classic9', 'nightmare', 4, true, '755fa96fd20846c3'],
      ['classic9', 'master', 7, true, 'fc7085a1aadb38ad'],
      ['classic9', 'master', 16, true, '371ca4df1c54a09b'],
      ['classic9', 'hell1', 11, true, 'f18ce018231eb9dc'],
      ['classic9', 'hell1', 13, true, '600519c29d4abb7e'],
      ['classic9', 'hell1', 30, true, '4e87d4adce919041']
    ];

    /** The pass of one case: a digest of what it decided, and its dig log. */
    function pass(c) {
      var model = SG.variants.get(c[0]).build({}, null);
      var rng = SG.rng.create(c[2]);
      var solution = SG.fullGrid.generate(model, rng.fork('grid'), null);
      var log = [];
      var events = [];
      var emit = SG.events.createEmitter('full', function (e) {
        if (typeof e.i18nKey === 'string' && e.i18nKey.indexOf('dig.') === 0) events.push([e.i18nKey, e.i18nArgs]);
      });
      var dug = SG.digger.digStage(model, solution, c[1], rng.fork('dig'), { log: log, emit: emit, proposal: c[3] });
      return {
        log: log,
        digest: hash64(JSON.stringify({ givens: Array.from(dug.givens), clues: dug.clues, stats: dug.stats,
          log: log, events: events }))
      };
    }

    var runs = null;

    function allRuns() {
      if (runs === null) runs = CASES.map(pass);
      return runs;
    }

    it('keeps the givens, statistics, oracle calls, dig log and dig events of 29 passes, bounded and proposal',
      function () {
        var expected = {};
        var actual = {};
        CASES.forEach(function (c, i) {
          var name = c.slice(0, 4).join(' ');
          expected[name] = c[4];
          actual[name] = allRuns()[i].digest;
        });
        expect(actual).toEqual(expected);
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
      /** A dig strategy that follows `script`: offers to its keeper, or `'pause'` for a cooperative yield. */
      function scripted(script, trace) {
        return function (model, sol, level, rng, o) {
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
          keeper: keeper, target: target, cooperative: true, strategy: scripted(script, trace)
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

  describe('a sample, a search and a generation carry their target (MS06c1)', function () {
    var solution = SG.fullGrid.generate(model9, SG.rng.create(11).fork('grid'), null);
    var base = Z.dig(model9, solution, SG.rng.create(11).fork('base'), { minClues: 58 });
    var CLUES = base.givens.reduce(function (n, v) { return n + (v === 0 ? 0 : 1); }, 0);
    // [what the caller passes, the target that comes back]: an explicit zero and null are not an absent target
    var TARGETS = [[812.5, 812.5], [0, 0], [null, null], [undefined, null], [NaN, null]];

    function options(target, rest) {
      var out = Object.assign({}, rest);
      if (target !== undefined) out.target = target;
      return out;
    }

    /** A dig strategy that returns the redundant puzzle with `rating`, after offering `offered` to its keeper. */
    function strategy(rating, offered) {
      return function (model, sol, level, rng, o) {
        if (offered) {
          o.keeper.offer({ model: model, givens: base.givens, solution: sol, rating: offered,
            logOf: function () { return []; } });
        }
        return { givens: base.givens, clues: CLUES, stats: zeroStats(), rating: rating };
      };
    }

    function generate(target, rating, offered, rest) {
      return Z.generate(model9, LEVEL, SG.rng.create(7),
        options(target, Object.assign({ strategy: strategy(rating, offered), maxAttempts: 1, digTries: 1 }, rest)));
    }

    it('digLevel returns the target of its call: a number, zero, null or none (null)', function () {
      TARGETS.forEach(function (pair) {
        var puzzle = Z.digLevel(model9, solution, 'easy', SG.rng.create(12), options(pair[0]));
        expect([pair[0], puzzle.target]).toEqual([pair[0], pair[1]]);
      });
    });

    it('generate returns the target of the sample that is the result', function () {
      TARGETS.forEach(function (pair) {
        var out = generate(pair[0], REQUIRED, null);
        expect(out.exact).toBe(true);
        expect([pair[0], out.target]).toEqual([pair[0], pair[1]]);
      });
    });

    it('generate returns the target of the kept candidate that beats its samples', function () {
      TARGETS.forEach(function (pair) {
        var out = generate(pair[0], SHALLOW, REQUIRED);
        expect(out.exact).toBe(true);
        expect(out.rating).toBe(REQUIRED);
        expect([pair[0], out.target]).toEqual([pair[0], pair[1]]);
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
          var out = generate(pair[0], SHALLOW, null);
          expect(rated).toBeGreaterThan(0);
          expect(out.exact).toBe(true);
          expect([pair[0], out.target]).toEqual([pair[0], pair[1]]);
        });
      } finally {
        D.rate = real;
      }
    });

    it('the pipeline result and its work stay what they were: a request has no target', function () {
      var result = SG.pipeline.run({ variantId: 'classic9', difficulty: 'easy', seed: 3, trace: 'off' }, null);
      expect(Object.prototype.hasOwnProperty.call(result, 'target')).toBe(true);
      expect(result.target).toBe(null);
      expect(SG.pipeline.toWire(result).target).toBe(null);
    });
  });

  // Preparation-phase assertions of MS06c1: nothing draws a target and no normal caller sends one. MS06c2 draws
  // one in every sample and replaces these with the active policy's tests, keeping the transport ones above.
  describe('normal generation draws and sends no target (preparation phase of MS06c1)', function () {
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

    it('no sample or search stream is asked for the child "target"', function () {
      ['easy', 'normal', 'expert'].forEach(function (level) {
        var tags = [];
        var out = Z.generate(model9, level, spied(SG.rng.create(5), '', tags), { maxAttempts: 1, digTries: 3 });
        expect(out.rating.solved).toBe(true);
        expect(out.target).toBe(null);
        expect(tags.some(function (t) { return /^dig#1\.1\//.test(t); })).toBe(true);
        expect(tags.filter(function (t) { return t.split('/').pop() === 'target'; })).toEqual([]);
      });
    });

    it('the registered signs strategy of Greater-Than gets no target option from a normal request', function () {
      var original = Z.getStrategy('signs');
      var seen = [];
      Z.unregisterStrategy('signs');
      Z.registerStrategy('signs', function (model, sol, level, rng, opts) {
        seen.push([Object.prototype.hasOwnProperty.call(opts, 'target'), opts.target]);
        return original.apply(this, arguments);
      });
      var result;
      try {
        result = SG.pipeline.run({ variantId: 'greaterThan', difficulty: 'easy', seed: 2, trace: 'off' }, null);
      } finally {
        Z.unregisterStrategy('signs');
        Z.registerStrategy('signs', original);
      }
      expect(Z.getStrategy('signs')).toBe(original);
      expect(seen.length).toBeGreaterThan(0);
      seen.forEach(function (one) { expect(one).toEqual([false, undefined]); });
      expect(result.target).toBe(null);
    });
  });
})();
