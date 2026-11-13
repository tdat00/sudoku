// The baseline diagnostics of the soak (tests/fixtures/difficulty-diagnostics.js and
// `node tests/soak.js --json=<file>`; docs/difficulty-v3/report-detailed.md R23 and AC01): the raw and
// attainable positions with their null reasons, the statistics and the summary of a ledger, the deferred
// reference and final-path diagnostics with their failures, the ledger text, and (Node only) the soak itself
// run on a small cell in a registry of its own with its file system, git and clock replaced: the order of
// its solves, the partial ledgers and the old text it must not change. Every solve of the registry of the
// other suites is a stub; the real generations run in the Node vm context. Also the consumers of exactness
// (MS05r2): the ordered-prefix check that the soak runs before it generates anything, the strict `exact`
// flag that decides a hit of the soak on both routes, and the hit of a qualification request.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var D = SG.difficulty;
  var F = SG.fixtures.difficultyDiagnostics;
  var model9 = SG.variants.get('classic9').build({}, SG.rng.create(1));
  var EMPTY9 = new Int32Array(81);

  function caught(fn) {
    try {
      fn();
    } catch (e) {
      return e;
    }
    throw new Error('expected the call to throw');
  }

  /** The inputs of positionOf for a result in the Expert band with a tier whose lightest weight is 650. */
  function expert(overrides) {
    return Object.assign({ score: 900, solved: true, V: 40, min: 700, max: 1000, tierWeights: [650, 750, 900],
      vacuous: false }, overrides);
  }

  describe('difficulty diagnostics: the position of a score in its band', function () {
    it('uses the factor of the accepted formula', function () {
      expect(F.PEAK_BOUND).toBe(D.SCORING.peakBound);
    });

    it('computes the accepted formula literally: Expert 900, V 40, lightest tier weight 650', function () {
      var p = F.positionOf(expert());
      expect(p).toEqual({ raw: 200 / 300, adjusted: 47.5 / 147.5, lower: 852.5, reason: null });
      expect(p.raw).toBeCloseTo(2 / 3, 12);
      expect(p.adjusted).toBeCloseTo(0.322033898, 8);
    });

    it('leaves a defined adjusted value unclamped: negative below the lower bound', function () {
      var below = F.positionOf(expert({ score: 852 }));
      expect(below.reason).toBeNull();
      expect(below.adjusted).toBe(-0.5 / 147.5);
      expect(below.adjusted).toBeLessThan(0);
      expect(F.positionOf(expert({ score: 700 })).adjusted).toBe((700 - 852.5) / 147.5);
      expect(F.positionOf(expert({ score: 999 })).adjusted).toBe(146.5 / 147.5);
    });

    it('keeps the raw position of an off-band result and gives the adjusted one a reason', function () {
      var low = F.positionOf(expert({ score: 650 }));
      expect(low).toEqual({ raw: -50 / 300, adjusted: null, lower: 852.5, reason: 'off-band' });
      expect(low.raw).toBeCloseTo(-1 / 6, 12);
      var edge = F.positionOf(expert({ score: 1000 }));
      expect(edge.reason).toBe('off-band');
      expect(edge.raw).toBe(1);
    });

    it('has lower = the band minimum when the analytic bound is below it', function () {
      var p = F.positionOf({ score: 200, solved: true, V: 10, min: 180, max: 400, tierWeights: [40],
        vacuous: false });
      expect(p).toEqual({ raw: 20 / 220, adjusted: 20 / 220, lower: 180, reason: null });
    });

    it('names every reason a position is undefined, in the order of the guards', function () {
      var cases = [
        ['unrated', { solved: false, score: null }, { raw: null, lower: 852.5 }],
        ['unrated', { score: NaN }, { raw: null, lower: 852.5 }],
        ['non-finite-band', { max: Infinity }, { raw: null, lower: 852.5 }],
        ['non-finite-band', { min: NaN }, { raw: null, lower: null }],
        ['non-positive-width', { max: 700 }, { raw: null, lower: 852.5 }],
        ['off-band', { score: 5000 }, { raw: 4300 / 300, lower: 852.5 }],
        ['empty-tier', { tierWeights: [] }, { raw: 200 / 300, lower: null }],
        ['vacuous-tier', { vacuous: true }, { raw: 200 / 300, lower: null }],
        ['non-positive-width', { tierWeights: [900] }, { raw: 200 / 300, lower: 1165 }]
      ];
      cases.forEach(function (row) {
        var p = F.positionOf(expert(row[1]));
        var where = row[0] + ' ' + JSON.stringify(row[1]);
        expect([where, p.reason]).toEqual([where, row[0]]);
        expect([where, p.adjusted]).toEqual([where, null]);
        expect([where, p.raw]).toEqual([where, row[2].raw]);
        expect([where, p.lower]).toEqual([where, row[2].lower]);
      });
      expect(F.REASONS).toEqual(['unrated', 'non-finite-band', 'non-positive-width', 'off-band', 'empty-tier',
        'vacuous-tier']);
    });

    it('applies the guards in order: unrated, non-finite band, band width, off-band, empty, vacuous',
      function () {
        expect(F.positionOf(expert({ solved: false, max: Infinity })).reason).toBe('unrated');
        expect(F.positionOf(expert({ max: Infinity, score: 5 })).reason).toBe('non-finite-band');
        expect(F.positionOf(expert({ max: 700, score: 5 })).reason).toBe('non-positive-width');
        expect(F.positionOf(expert({ score: 5, tierWeights: [], vacuous: true })).reason).toBe('off-band');
        expect(F.positionOf(expert({ tierWeights: [], vacuous: true })).reason).toBe('empty-tier');
        expect(F.positionOf(expert({ vacuous: true })).reason).toBe('vacuous-tier');
      });

    it('has a raw position but no adjusted one for veryEasy (vacuous) and Hell 1 (empty tier here)',
      function () {
        var easy = D.spec('veryEasy', model9);
        expect(easy.tierTechniques.length).toBeGreaterThan(0);
        var p = F.positionOf({ score: 20, solved: true, V: 30, min: easy.min, max: easy.max,
          tierWeights: easy.tierTechniques.map(function (id) { return D.WEIGHTS[id]; }), vacuous: true });
        expect(p.reason).toBe('vacuous-tier');
        expect(p.raw).toBe(20 / 45);
        expect(p.lower).toBeNull();
        var hell = D.spec('hell1', model9);
        expect(hell.tierTechniques).toEqual([]);
        var q = F.positionOf({ score: 3000, solved: true, V: 30, min: hell.min, max: hell.max,
          tierWeights: [], vacuous: true });
        expect(q).toEqual({ raw: 600 / 1200, adjusted: null, lower: null, reason: 'empty-tier' });
      });
  });

  describe('difficulty diagnostics: statistics', function () {
    it('takes the upper median at sorted index floor(n / 2)', function () {
      expect(F.upperMedianOf([1, 2, 3, 4])).toBe(3);
      expect(F.upperMedianOf([4, 1, 3])).toBe(3);
      expect(F.upperMedianOf([7])).toBe(7);
    });

    it('takes decile p at index min(n - 1, floor(p * n)) and does not reorder its input', function () {
      var tens = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      expect(F.decilesOf(tens)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10]);
      expect(tens[0]).toBe(10);
      expect(F.decilesOf([1, 2, 3, 4])).toEqual([1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4]);
      expect(F.decilesOf([5])).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    });

    it('gives null statistics, never 0, to an empty cohort', function () {
      expect(F.statsOf([])).toEqual({ n: 0, deciles: null, upperMedian: null });
      expect(F.statsOf([0, 0])).toEqual({ n: 2, deciles: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], upperMedian: 0 });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Rows, summaries and the deferred diagnostics, on fabricated ratings (no real solve)
  // ---------------------------------------------------------------------------------------------

  function bandOf(level) {
    var spec = D.spec(level, model9);
    return {
      band: { min: spec.min, max: spec.max },
      tierWeights: spec.tierTechniques.map(function (id) { return D.WEIGHTS[id]; }),
      vacuous: D.levelIndex(level) === 0 || spec.tierTechniques.length === 0
    };
  }

  /** The counts of a rating that needs a technique of the tier of Hard and Normal (xyWing) or does not. */
  var NEEDS_TIER = { nakedSingle: 30, hiddenSingleBox: 10, pointing: 2, xyWing: 1 };
  var FLOOR_ONLY = { nakedSingle: 30, hiddenSingleBox: 10, pointing: 2 };

  /** A rating as `SG.difficulty.rate` returns it; `score` is set directly, the counts feed V. */
  function ratingOf(score, solved, counts) {
    return { solved: solved !== false, score: solved === false ? null : score, empties: 50,
      techniqueCounts: Object.assign({}, counts || NEEDS_TIER), ratingVersion: 2, level: null };
  }

  /** The work of one attempt with `ratings` full ratings, `localSearches` as given. */
  function attemptOf(ratings, localSearches, proposals) {
    return { ratings: ratings, proposals: proposals || 0, maxRatings: 1024, maxProposals: 32768,
      localSearches: localSearches || [] };
  }

  function searchOf(ratings, extra) {
    return Object.assign({ ratings: ratings, proposals: ratings, firstShallowAt: null, shallowRatings: 0,
      shallowLimit: null, capHit: null }, extra);
  }

  var made = 0;

  /**
   * A ledger row of a fabricated request of `level`; opts: score, solved, exact, error, achieved, shallow
   * (the counts need no technique of the tier), unique, work (default: one attempt with one rating, which
   * agrees with the one call counted) and workReason.
   */
  function rowFor(level, opts) {
    opts = opts || {};
    var b = bandOf(level);
    var index = made++;
    var puzzle = opts.error ? null : {
      achieved: opts.achieved === undefined ? level : opts.achieved,
      exact: opts.exact !== false,
      rating: ratingOf(opts.score, opts.solved, opts.shallow ? FLOOR_ONLY : undefined),
      model: model9
    };
    return F.rowOf({ variant: 'classic9', requested: level, index: index,
      tag: 'classic9:' + level + ':' + index, pipelineSeed: null, puzzle: puzzle, error: opts.error,
      unique: opts.unique, band: b.band, tierWeights: b.tierWeights, vacuous: b.vacuous,
      puzzleHash: 'h' + index, generationMs: 5, ratingCalls: 1,
      work: opts.work === undefined ? [attemptOf(1)] : opts.work, workReason: opts.workReason });
  }

  /** `referenceSelected: false` makes the request one the reference was not sampled for. */
  function entryOf(row, unique, referenceSelected) {
    return { row: row, model: model9, givens: new Int32Array(81).fill(0),
      rating: ratingOf(row.score, row.solved, row.techniqueCounts), requested: row.requested,
      unique: unique !== false, referenceSelected: referenceSelected };
  }

  /** An environment whose reference and rating are stubs; `log` records the calls and their budgets. */
  function envOf(log, behaviour) {
    var budgets = 0;
    return {
      difficulty: {
        certifyFloor: function (model, givens, level, budget) {
          log.push({ call: 'reference', level: level, budget: budget, model: model, givens: givens });
          return behaviour.reference(level, budget);
        },
        rate: function (model, givens, options) {
          log.push({ call: 'rate', options: options, budget: options.budget, model: model, givens: givens });
          return behaviour.rate(model, givens, options);
        }
      },
      makeBudget: function (ms) {
        budgets++;
        return { id: budgets, ms: ms };
      },
      now: function () { return log.length; }
    };
  }

  function diagnosed(row, reference, steps) {
    var entry = entryOf(row);
    F.diagnose(entry, envOf([], {
      reference: function () { return reference; },
      rate: function () {
        return Object.assign(ratingOf(row.score, row.solved, row.techniqueCounts), { steps: steps || [] });
      }
    }));
    return row;
  }

  var STUCK = { required: true, vacuous: false, floorLevel: 'normal', unsolvedCount: 12 };
  var SOLVED = { required: false, vacuous: false, floorLevel: 'normal', unsolvedCount: 0 };
  var VACUOUS = { required: true, vacuous: true, floorLevel: null, unsolvedCount: 0 };

  describe('difficulty diagnostics: rows', function () {
    it('starts a row with the generation facts, the derived verdict and the work, reference not run',
      function () {
        var row = rowFor('hard', { score: 520 });
        expect(Object.keys(row)).toEqual(['variant', 'requested', 'index', 'tag', 'pipelineSeed', 'outcome',
          'error', 'achieved', 'solved', 'score', 'ratingVersion', 'techniqueCounts', 'empties', 'scoreHit',
          'generationExact', 'qualifiedHit', 'required', 'referenceRequired', 'referenceStatus',
          'referenceError', 'shallow', 'position', 'generationMs', 'diagnosticMs', 'fullRatings',
          'ratingCalls', 'proposals', 'localRatings', 'shallowRatings', 'capHits', 'work', 'workCheck',
          'chainLengths', 'nishioDepths', 'target', 'puzzleHash', 'pathCheck']);
        expect([row.outcome, row.error, row.solved, row.score, row.scoreHit, row.generationExact])
          .toEqual(['ok', null, true, 520, true, true]);
        // the tier is needed (xyWing is outside the floor of Hard), whatever the reference will say
        expect([row.required, row.qualifiedHit, row.shallow]).toEqual([true, true, false]);
        expect([row.referenceRequired, row.referenceStatus, row.referenceError])
          .toEqual([null, 'not-run', null]);
        expect([row.fullRatings, row.ratingCalls, row.proposals, row.localRatings, row.shallowRatings])
          .toEqual([1, 1, 0, 0, 0]);
        expect(row.capHits).toEqual({ shallow: 0, ratings: 0, proposals: 0 });
        expect(row.work).toEqual([attemptOf(1)]);
        expect(row.workCheck).toEqual({ status: 'ok', reason: null });
        expect([row.target, row.diagnosticMs]).toEqual([null, null]);
        expect([row.chainLengths, row.nishioDepths]).toEqual([[], []]);
        expect(row.pathCheck).toEqual({ status: 'not-run', error: null });
        expect(row.position.inputs.score).toBe(520);
        expect(row.position.inputs.V).toBe(D.breakdown(row.techniqueCounts, row.empties).empty);
      });

    it('derives the verdict from the returned rating on the returned model, not from a reference', function () {
      var shallow = rowFor('hard', { score: 520, shallow: true, exact: false });
      expect([shallow.required, shallow.qualifiedHit, shallow.shallow, shallow.referenceStatus])
        .toEqual([false, false, true, 'not-run']);
      var vacuous = rowFor('hell1', { score: 2500 });
      expect([vacuous.required, vacuous.qualifiedHit, vacuous.shallow]).toEqual([true, true, false]);
      var offBand = rowFor('hard', { score: 800, exact: false, achieved: 'expert' });
      expect([offBand.required, offBand.qualifiedHit, offBand.shallow]).toEqual([true, false, null]);
      var unrated = rowFor('hard', { solved: false, achieved: null, exact: false });
      expect([unrated.required, unrated.qualifiedHit, unrated.shallow]).toEqual([null, false, null]);
    });

    it('has no derived verdict for a puzzle that may have a second solution, and keeps its hits false',
      function () {
        var row = rowFor('hard', { score: 520, unique: false });
        expect([row.required, row.qualifiedHit, row.shallow, row.scoreHit]).toEqual([null, false, null, true]);
        var unknown = rowFor('hard', { score: 520, unique: undefined });
        expect(unknown.required).toBe(true);
      });

    it('records the inputs of both positions next to them', function () {
      var row = rowFor('hard', { score: 520 });
      var tier = D.tierTechniques('hard', model9);
      var wMin = Math.min.apply(null, tier.map(function (id) { return D.WEIGHTS[id]; }));
      var lower = Math.max(400, 1.25 * wMin + row.position.inputs.V);
      expect(row.position.inputs).toEqual({ score: 520, V: row.position.inputs.V, min: 400, max: 700,
        wMin: wMin, tierSize: tier.length, vacuous: false });
      expect(row.position.lower).toBe(lower);
      expect(row.position.raw).toBe(120 / 300);
      expect(row.position.adjusted).toBe((520 - lower) / (700 - lower));
    });

    it('is a miss with an error record and no puzzle for a failed request', function () {
      var error = new SG.errors.GenerationError('budget.exceeded', { reason: 'time' });
      var row = rowFor('hard', { error: error });
      expect([row.outcome, row.achieved, row.solved, row.score, row.scoreHit, row.generationExact,
        row.qualifiedHit]).toEqual(['error', null, false, null, false, false, false]);
      expect([row.required, row.shallow]).toEqual([null, null]);
      expect(row.error.code).toBe('budget.exceeded');
      expect(typeof row.error.message).toBe('string');
      expect(row.position)
        .toEqual({ raw: null, adjusted: null, lower: null, reason: 'unrated', inputs: null });
    });

    it('has no score and no position for an unrated result', function () {
      var row = rowFor('hard', { solved: false, achieved: null, exact: false });
      expect([row.solved, row.score, row.scoreHit, row.achieved]).toEqual([false, null, false, null]);
      expect(row.position.reason).toBe('unrated');
      expect(row.position.raw).toBeNull();
    });

    it('does not count an off-band score as a hit', function () {
      var row = rowFor('hard', { score: 700, exact: false, achieved: 'expert' });
      expect([row.scoreHit, row.generationExact, row.position.reason]).toEqual([false, false, 'off-band']);
      expect(row.position.raw).toBe(1);
    });

    describe('the work of a request', function () {
      var WORK = [
        attemptOf(40, [], 12),
        attemptOf(30, [searchOf(25, { proposals: 90, firstShallowAt: 2, shallowRatings: 23, shallowLimit: 64 })],
          100),
        attemptOf(1100, [searchOf(1005, { proposals: 400, firstShallowAt: 0, shallowRatings: 1005,
          capHit: 'ratings' }), searchOf(7, { capHit: 'shallow', shallowLimit: 5, shallowRatings: 5,
          firstShallowAt: 1 })], 500)
      ];

      it('sums the attempts, the local searches and the cap hits, and keeps the raw work', function () {
        var row = rowFor('hard', { score: 520, work: WORK });
        expect([row.fullRatings, row.proposals, row.localRatings, row.shallowRatings])
          .toEqual([1170, 612, 1037, 1033]);
        expect(row.capHits).toEqual({ shallow: 1, ratings: 1, proposals: 0 });
        expect(row.work).toEqual(WORK);
        expect(row.work).not.toBe(WORK);
        expect(row.work[2].localSearches).not.toBe(WORK[2].localSearches);
        // the request counted 1 call: the work says 1170, so the conservation check fails and says why
        expect(row.workCheck.status).toBe('mismatch');
        expect(row.workCheck.reason).toContain('the work counts 1170 full ratings but 1 calls');
      });

      it('conserves: the ratings of all attempts are the calls made, the searches rate no more', function () {
        var ok = F.conservationOf([attemptOf(40), attemptOf(30, [searchOf(30)])], 70);
        expect(ok).toEqual({ status: 'ok', reason: null });
        var short = F.conservationOf([attemptOf(40), attemptOf(30)], 71);
        expect(short.status).toBe('mismatch');
        expect(short.reason).toContain('the work counts 70 full ratings but 71 calls');
        var more = F.conservationOf([attemptOf(10, [searchOf(6), searchOf(5)])], 10);
        expect(more.status).toBe('mismatch');
        expect(more.reason).toContain('attempt 1: its local searches made 11 full ratings, more than the 10');
        var both = F.conservationOf([attemptOf(10, [searchOf(11)])], 12);
        expect(both.status).toBe('mismatch');
        expect(both.reason.split('; ')).toHaveLength(2);
      });

      it('is unavailable, never zero and never ok, for work that is missing or not of the shape', function () {
        [undefined, null, 'x', [{ ratings: 1 }], [attemptOf(1, [{ ratings: 1 }])], [attemptOf(-1)],
          [Object.assign(attemptOf(1), { localSearches: undefined })]].forEach(function (work) {
          var check = F.conservationOf(work, 1, 'no work here');
          expect([JSON.stringify(work), check.status]).toEqual([JSON.stringify(work), 'unavailable']);
          expect(check.reason).toBe('no work here');
          var row = rowFor('hard', { score: 520, work: work === undefined ? null : work,
            workReason: 'no work here' });
          expect([row.fullRatings, row.proposals, row.localRatings, row.shallowRatings, row.capHits, row.work])
            .toEqual([null, null, null, null, null, null]);
          expect(row.workCheck).toEqual({ status: 'unavailable', reason: 'no work here' });
          expect(row.ratingCalls).toBe(1);
        });
        expect(F.conservationOf(undefined, 1).reason).toBe('the generation reported no work');
        var noCalls = F.conservationOf([attemptOf(1)], null);
        expect(noCalls.status).toBe('unavailable');
        expect(noCalls.reason).toContain('no independent count');
      });

      it('keeps the partial work of a failed request, and says nothing is known when there is none',
        function () {
          var error = new SG.errors.GenerationError('budget.cancelled', { reason: 'cancelled' });
          var partial = rowFor('hard', { error: error, work: [attemptOf(1), attemptOf(0)] });
          expect([partial.outcome, partial.fullRatings, partial.work.length, partial.workCheck.status])
            .toEqual(['error', 1, 2, 'ok']);
          var unknown = rowFor('hard', { error: error, work: null, workReason: 'raised outside' });
          expect([unknown.work, unknown.fullRatings]).toEqual([null, null]);
          expect(unknown.workCheck).toEqual({ status: 'unavailable', reason: 'raised outside' });
          var none = F.rowOf({ variant: 'classic9', requested: 'hard', index: 0, tag: 't', puzzle: null,
            error: error, band: { min: 0, max: Infinity }, tierWeights: [], vacuous: false, generationMs: 1,
            ratingCalls: 4, work: undefined, workReason: 'raised outside' });
          expect([none.fullRatings, none.ratingCalls, none.work, none.proposals, none.capHits])
            .toEqual([null, 4, null, null, null]);
          expect(none.workCheck).toEqual({ status: 'unavailable', reason: 'raised outside' });
        });
    });
  });

  describe('difficulty diagnostics: the reference and the final path of a request', function () {
    it('records the sampled reference apart from the derived verdict, hits and shallow flag', function () {
      var needed = diagnosed(rowFor('hard', { score: 520 }), SOLVED);
      // the reference says "not required"; the derived verdict (and the hit it gives) are unchanged
      expect([needed.referenceStatus, needed.referenceRequired, needed.required, needed.qualifiedHit,
        needed.shallow]).toEqual(['ok', false, true, true, false]);
      var shallow = diagnosed(rowFor('hard', { score: 520, shallow: true, exact: false }), STUCK);
      expect([shallow.referenceStatus, shallow.referenceRequired, shallow.required, shallow.qualifiedHit,
        shallow.shallow]).toEqual(['ok', true, false, false, true]);
      var vacuous = diagnosed(rowFor('hell1', { score: 2500 }), VACUOUS);
      expect([vacuous.referenceStatus, vacuous.referenceRequired, vacuous.required, vacuous.qualifiedHit,
        vacuous.shallow]).toEqual(['vacuous', true, true, true, false]);
      var offBand = diagnosed(rowFor('hard', { score: 800, exact: false, achieved: 'expert' }), STUCK);
      expect([offBand.required, offBand.qualifiedHit, offBand.shallow]).toEqual([true, false, null]);
    });

    it('gives a reference failure its own status: the derived verdict and the hit stay', function () {
      var cancelled = SG.budget.create();
      cancelled.cancel();
      var failures = [
        function () { return D.certifyFloor(model9, EMPTY9, 'veryEasy', cancelled); },
        function () { throw new SG.errors.GenerationError('budget.exceeded', { reason: 'time' }); },
        function () { throw new Error('boom'); },
        function () { return { required: 'yes' }; }
      ];
      var codes = ['budget.cancelled', 'budget.exceeded', 'Error', 'diagnostic.badReference'];
      failures.forEach(function (run, k) {
        var reference = F.referenceOf(run);
        expect([k, reference.status, reference.required, reference.error.code])
          .toEqual([k, 'error', null, codes[k]]);
        var row = rowFor('hard', { score: 520 });
        F.diagnose(entryOf(row), envOf([], { reference: run, rate: function () { return ratingOf(520); } }));
        // the verdict of the generation is derived (the tier is needed): a failed reference changes nothing
        expect([k, row.referenceStatus, row.referenceRequired, row.referenceError.code])
          .toEqual([k, 'error', null, codes[k]]);
        expect([k, row.required, row.qualifiedHit, row.shallow]).toEqual([k, true, true, false]);
        expect([k, row.outcome, row.scoreHit, row.score]).toEqual([k, 'ok', true, 520]);
      });
    });

    it('runs the reference only for a puzzle that I1 proved unique', function () {
      var log = [];
      var row = rowFor('hard', { score: 520, unique: false });
      F.diagnose(entryOf(row, false), envOf(log, { reference: function () { return STUCK; },
        rate: function () { return ratingOf(520); } }));
      expect(log).toEqual([]);
      expect([row.referenceStatus, row.referenceRequired, row.required, row.qualifiedHit, row.shallow,
        row.pathCheck.status]).toEqual(['skipped-not-unique', null, null, false, null, 'not-run']);
      expect(typeof row.diagnosticMs).toBe('number');
    });

    it('runs no reference for a request that was not selected, and still checks its final path', function () {
      var log = [];
      var row = rowFor('hard', { score: 520 });
      F.diagnose(entryOf(row, true, false), envOf(log, { reference: function () { return SOLVED; },
        rate: function () { return Object.assign(ratingOf(520), { steps: [] }); } }));
      expect(log.map(function (e) { return e.call; })).toEqual(['rate']);
      // not selected is not a failure and not a verdict: the derived verdict and the hit are untouched
      expect([row.referenceStatus, row.referenceRequired, row.referenceError]).toEqual(['not-selected', null, null]);
      expect([row.required, row.qualifiedHit, row.shallow, row.pathCheck.status])
        .toEqual([true, true, false, 'ok']);
      var odd = rowFor('hard', { score: 520, unique: false });
      F.diagnose(entryOf(odd, false, false), envOf([], { reference: function () { return SOLVED; },
        rate: function () { throw new Error('not rated'); } }));
      expect([odd.referenceStatus, odd.pathCheck.status]).toEqual(['not-selected', 'not-run']);
      var selected = rowFor('hard', { score: 520 });
      F.diagnose(entryOf(selected, true, true), envOf([], { reference: function () { return SOLVED; },
        rate: function () { return Object.assign(ratingOf(520), { steps: [] }); } }));
      expect(selected.referenceStatus).toBe('ok');
    });

    it('gives the reference and the final path one 120,000 ms budget per request, not renewed', function () {
      expect(F.REFERENCE_BUDGET_MS).toBe(120000);
      var log = [];
      var env = envOf(log, { reference: function () { return STUCK; },
        rate: function () { return Object.assign(ratingOf(520), { steps: [] }); } });
      F.diagnose(entryOf(rowFor('hard', { score: 520 })), env);
      F.diagnose(entryOf(rowFor('hard', { score: 520 })), env);
      expect(log.map(function (e) { return e.call; })).toEqual(['reference', 'rate', 'reference', 'rate']);
      expect(log[0].budget).toBe(log[1].budget);
      expect(log[2].budget).toBe(log[3].budget);
      expect(log[0].budget).not.toBe(log[2].budget);
      expect(log[0].budget.ms).toBe(120000);
      expect(log[1].options.collectSteps).toBe(true);
      expect(log[0].level).toBe('hard');
    });

    it('leaves the returned puzzle alone, whatever fails', function () {
      var row = rowFor('hard', { score: 520 });
      var snapshot = JSON.stringify(row);
      var entry = entryOf(row);
      var givens = Array.from(entry.givens);
      var rating = JSON.stringify(entry.rating);
      var model = entry.model;
      F.diagnose(entry, envOf([], { reference: function () { throw new Error('reference'); },
        rate: function () { throw new Error('rate'); } }));
      expect(JSON.stringify(entry.rating)).toBe(rating);
      expect(Array.from(entry.givens)).toEqual(givens);
      expect(entry.model).toBe(model);
      expect(row.pathCheck).toEqual({ status: 'error', error: { code: 'Error', message: 'rate' } });
      var after = JSON.parse(JSON.stringify(row));
      ['diagnosticMs', 'referenceStatus', 'referenceError', 'pathCheck'].forEach(function (key) {
        delete after[key];
      });
      var before = JSON.parse(snapshot);
      ['diagnosticMs', 'referenceStatus', 'referenceError', 'pathCheck'].forEach(function (key) {
        delete before[key];
      });
      expect(after).toEqual(before);
    });

    it('reports a final path that disagrees with the returned rating, and keeps the latter', function () {
      var row = rowFor('hard', { score: 520 });
      var entry = entryOf(row);
      F.diagnose(entry, envOf([], { reference: function () { return STUCK; }, rate: function () {
        return Object.assign(ratingOf(521), { steps: [] });
      } }));
      expect(row.pathCheck.status).toBe('mismatch');
      expect(row.pathCheck.error.code).toBe('diagnostic.pathMismatch');
      expect(row.score).toBe(520);
      expect(entry.rating.score).toBe(520);
      var counts = rowFor('hard', { score: 520 });
      F.diagnose(entryOf(counts), envOf([], { reference: function () { return STUCK; }, rate: function () {
        var again = ratingOf(520);
        again.techniqueCounts.xyWing = 2;
        return Object.assign(again, { steps: [] });
      } }));
      expect(counts.pathCheck.status).toBe('mismatch');
    });

    it('counts forcing-chain lengths and Nishio depths from the steps of the final path', function () {
      var steps = [
        { technique: 'nakedSingle', i18nArgs: {} },
        { technique: 'forcingChain', i18nArgs: { kind: 'cell', length: 4, chains: [] } },
        { technique: 'forcingChain', i18nArgs: { kind: 'unit', length: 6, chains: [] } },
        { technique: 'nishio', i18nArgs: { cell: 3, depth: 1 } },
        { technique: 'nishio', i18nArgs: { cell: 9, depth: 2 } },
        { technique: 'xyWing', i18nArgs: { length: 9, depth: 9 } }
      ];
      expect(F.chainsOf(steps)).toEqual({ lengths: [4, 6], depths: [1, 2] });
      var row = diagnosed(rowFor('hard', { score: 520 }), STUCK, steps);
      expect([row.chainLengths, row.nishioDepths, row.pathCheck.status]).toEqual([[4, 6], [1, 2], 'ok']);
    });
  });

  describe('difficulty diagnostics: the summary', function () {
    /** Twelve requests of Hard: one error, one unrated, two off-band, eight solved in band. */
    function twelve() {
      var rows = [];
      rows.push(rowFor('hard', { error: new Error('lost') }));
      rows.push(diagnosed(rowFor('hard', { solved: false, achieved: null, exact: false }), STUCK));
      rows.push(diagnosed(rowFor('hard', { score: 800, exact: false, achieved: 'expert' }), STUCK));
      rows.push(diagnosed(rowFor('hard', { score: 350, exact: false, achieved: 'normal' }), SOLVED));
      [430, 470, 500, 560, 600, 640, 650, 690].forEach(function (score, k) {
        rows.push(diagnosed(rowFor('hard', { score: score, exact: k !== 7 && k >= 3, shallow: k < 3 }),
          k < 3 ? SOLVED : STUCK));
      });
      return rows;
    }

    it('keeps a failed request in every hit denominator, old hits apart from qualified hits', function () {
      var s = F.summaryOf(twelve());
      expect([s.requests, s.errors, s.unrated, s.inBand]).toEqual([12, 1, 1, 8]);
      // the generator's exact flag is the hit; the shallow ones (k < 3) and the last (k = 7) are not exact
      expect(s.oldHits).toEqual({ count: 4, denominator: 12, share: 4 / 12 });
      expect(s.qualifiedHits).toEqual({ count: 5, denominator: 12, share: 5 / 12 });
      expect(s.matrix).toEqual({ hard: { error: 1, unrated: 1, expert: 1, normal: 1, hard: 8 } });
      expect(s.references).toEqual({ ok: 11, vacuous: 0, error: 0, skipped: 0, notSelected: 0, notRun: 1 });
      // k = 7 is a derived hit that the generator did not call exact: one disagreement
      expect(s.exactDisagreements).toBe(1);
    });

    it('takes the shallow share over the solved in-band puzzles, not exact ones or requests', function () {
      var s = F.summaryOf(twelve());
      expect(s.shallow).toEqual({ count: 3, denominator: 8, checked: 8, share: 3 / 8 });
    });

    it('does not let a failed reference change a verdict, and counts it apart', function () {
      var rows = twelve();
      var cancelled = rowFor('hard', { score: 520 });
      F.diagnose(entryOf(cancelled), envOf([], { reference: function () {
        throw new SG.errors.GenerationError('budget.cancelled', { reason: 'cancelled' });
      }, rate: function () { return ratingOf(520); } }));
      rows.push(cancelled);
      var s = F.summaryOf(rows);
      expect(s.inBand).toBe(9);
      // its verdict is derived (the tier is needed): a hit and a verdict, whatever the reference did
      expect(s.shallow).toEqual({ count: 3, denominator: 9, checked: 9, share: 3 / 9 });
      expect(s.references.error).toBe(1);
      expect(s.qualifiedHits).toEqual({ count: 6, denominator: 13, share: 6 / 13 });
    });

    it('does not take unselected references for unmeasured verdicts: they are counted apart', function () {
      var rows = [];
      for (var k = 0; k < 12; k++) {
        var row = rowFor('hard', { score: 430 + 20 * k, shallow: k % 3 === 0, exact: k % 3 !== 0 });
        F.diagnose(entryOf(row, true, k === 0 || k === 11), envOf([], {
          reference: function () { return STUCK; },
          rate: function () { return ratingOf(row.score, true, row.techniqueCounts); } }));
        rows.push(row);
      }
      var s = F.summaryOf(rows);
      expect(s.references).toEqual({ ok: 2, vacuous: 0, error: 0, skipped: 0, notSelected: 10, notRun: 0 });
      // all twelve have a derived verdict, though only two were checked by the reference
      expect(s.shallow).toEqual({ count: 4, denominator: 12, checked: 12, share: 4 / 12 });
      expect(s.qualifiedHits).toEqual({ count: 8, denominator: 12, share: 8 / 12 });
      expect(s.oldHits.count).toBe(8);
      expect(s.exactDisagreements).toBe(0);
      var text = F.summaryLines(F.ledgerOf({ meta: {}, rows: rows }).summary).join('\n');
      expect(text).toContain('sampled reference: ok 2, vacuous 0, error 0, skipped 0, notSelected 10, notRun 0');
      expect(text).toContain('12 with a derived verdict');
    });

    it('summarises the work of the requests whose work is known, apart from those whose is not', function () {
      var withSearch = [attemptOf(40, [searchOf(30, { capHit: 'shallow', shallowLimit: 5 })])];
      var rows = [rowFor('hard', { score: 520, work: [attemptOf(1)] }),
        rowFor('hard', { score: 520, work: withSearch }),
        rowFor('hard', { score: 520, work: [attemptOf(3), attemptOf(5, [searchOf(2, { capHit: 'proposals' })])] }),
        rowFor('hard', { score: 520, work: null, workReason: 'unknown' }),
        rowFor('hard', { error: new Error('lost'), work: [attemptOf(9)] })];
      var s = F.summaryOf(rows);
      // the request counted 1 rating each: only the first agrees with its work
      expect(s.work.checks).toEqual({ ok: 1, mismatch: 3, unavailable: 1 });
      expect(s.work.capHits).toEqual({ shallow: 1, ratings: 0, proposals: 1 });
      expect(s.work.fullRatings.n).toBe(4);
      expect(s.work.fullRatings.upperMedian).toBe(9);
      expect(F.summaryOf([]).work).toEqual({ checks: { ok: 0, mismatch: 0, unavailable: 0 },
        capHits: { shallow: 0, ratings: 0, proposals: 0 }, fullRatings: { n: 0, deciles: null,
        upperMedian: null } });
    });

    it('reports the exact and the all-in-band cohorts apart, off-band rows out of the spread', function () {
      var s = F.summaryOf(twelve());
      expect(s.cohorts.inBand.n).toBe(8);
      expect(s.cohorts.exact.n).toBe(4);
      var scores = [430, 470, 500, 560, 600, 640, 650, 690];
      var raw = scores.map(function (score) { return (score - 400) / 300; });
      expect(s.cohorts.inBand.raw.n).toBe(8);
      expect(s.cohorts.inBand.raw.deciles[0]).toBe(raw[0]);
      expect(s.cohorts.inBand.raw.deciles[10]).toBe(raw[7]);
      expect(s.cohorts.inBand.raw.upperMedian).toBe(raw[4]);
      // the generator's exact rows are the scores 560 to 650
      expect(s.cohorts.exact.raw.n).toBe(4);
      expect(s.cohorts.exact.raw.deciles[0]).toBe(raw[3]);
      expect(s.cohorts.exact.raw.deciles[10]).toBe(raw[6]);
      expect(s.cohorts.exact.raw.upperMedian).toBe(raw[5]);
      // The adjusted position has its own lower bound; the lowest scores fall below it (kept, unclamped).
      expect(s.cohorts.inBand.adjusted.n).toBe(8);
      expect(s.cohorts.inBand.adjusted.deciles[0]).toBeLessThan(0);
      expect(s.cohorts.exact.nullReasons).toEqual({});
    });

    it('keeps an exact-but-off-band row (a disagreement) out of the raw spread, with a reason', function () {
      var odd = rowFor('hard', { score: 800, exact: true, achieved: 'hard' });
      expect(odd.position.raw).toBe(400 / 300);
      var s = F.summaryOf([odd, rowFor('hard', { score: 500 })]);
      expect(s.cohorts.exact.n).toBe(2);
      expect(s.cohorts.exact.raw.n).toBe(1);
      expect(s.cohorts.exact.raw.upperMedian).toBe(100 / 300);
      expect(s.cohorts.exact.nullReasons).toEqual({ 'off-band': 1 });
      expect(s.cohorts.inBand.n).toBe(1);
    });

    it('says empty cohorts have no statistics, never 0% or a median of 0', function () {
      var s = F.summaryOf([rowFor('hard', { error: new Error('lost') }),
        rowFor('hard', { score: 800, exact: false, achieved: 'expert' })]);
      expect(s.cohorts.exact).toEqual({ n: 0, peaks: {}, raw: { n: 0, deciles: null, upperMedian: null },
        adjusted: { n: 0, deciles: null, upperMedian: null }, nullReasons: {} });
      expect(s.cohorts.inBand.raw.upperMedian).toBeNull();
      expect(s.oldHits).toEqual({ count: 0, denominator: 2, share: 0 });
      var none = F.summaryOf([]);
      expect(none.requests).toBe(0);
      expect(none.oldHits).toEqual({ count: 0, denominator: 0, share: null });
      expect(none.qualifiedHits.share).toBeNull();
      expect(none.shallow).toEqual({ count: 0, denominator: 0, checked: 0, share: null });
    });

    it('has the raw spread but no adjusted one for a vacuous or empty tier, with its reason', function () {
      var rows = [rowFor('hell1', { score: 2500 }), rowFor('hell1', { score: 3000 })];
      rows.forEach(function (row) { diagnosed(row, VACUOUS); });
      var s = F.summaryOf(rows);
      expect(s.cohorts.exact.raw.n).toBe(2);
      expect(s.cohorts.exact.adjusted).toEqual({ n: 0, deciles: null, upperMedian: null });
      expect(s.cohorts.exact.nullReasons).toEqual({ 'empty-tier': 2 });
      expect(s.qualifiedHits.count).toBe(2);
      var easy = F.summaryOf([diagnosed(rowFor('veryEasy', { score: 30 }), VACUOUS)]);
      expect(easy.cohorts.exact.nullReasons).toEqual({ 'vacuous-tier': 1 });
    });

    it('histograms the peak technique and the chain steps by puzzles and by steps', function () {
      var steps = [{ technique: 'forcingChain', i18nArgs: { length: 4 } },
        { technique: 'forcingChain', i18nArgs: { length: 4 } },
        { technique: 'nishio', i18nArgs: { depth: 1 } }];
      var a = diagnosed(rowFor('hard', { score: 520 }), STUCK, steps);
      var single = [{ technique: 'forcingChain', i18nArgs: { length: 7 } }];
      var b = diagnosed(rowFor('hard', { score: 530 }), STUCK, single);
      var c = diagnosed(rowFor('hard', { score: 540 }), STUCK, []);
      var s = F.summaryOf([a, b, c, rowFor('hard', { error: new Error('x') })]);
      expect(s.peaks).toEqual({ xyWing: 3 });
      expect(s.chains.measured).toBe(3);
      expect(s.chains.forcingChain).toEqual({ puzzles: 2, steps: 3, stepHistogram: { 4: 2, 7: 1 },
        maxHistogram: { 4: 1, 7: 1 } });
      expect(s.chains.nishio).toEqual({ puzzles: 1, steps: 1, stepHistogram: { 1: 1 },
        maxHistogram: { 1: 1 } });
    });

    it('groups the rows by cell, in the order the cells first appear', function () {
      var rows = [rowFor('hard', { score: 520 }), rowFor('normal', { score: 220 }),
        rowFor('hard', { score: 530 })];
      var cells = F.cellsOf(rows);
      expect(Object.keys(cells)).toEqual(['classic9/hard', 'classic9/normal']);
      expect(cells['classic9/hard'].requests).toBe(2);
      expect(cells['classic9/normal'].requests).toBe(1);
    });
  });

  describe('difficulty diagnostics: the ledger and its text', function () {
    it('is a schema 1 ledger, not complete until the run says so, with rows not yet diagnosed', function () {
      var rows = [rowFor('hard', { score: 520 })];
      var meta = { sourceHash: 'x', commit: 'c', dirty: false, node: 'v', machine: {}, argv: [], seedBase: 1,
        manifest: {} };
      var partial = F.ledgerOf({ meta: meta, rows: rows, checks: null });
      expect([partial.schema, partial.complete, partial.rows[0].referenceStatus])
        .toEqual([1, false, 'not-run']);
      expect(Object.keys(partial)).toEqual(['schema', 'complete', 'meta', 'rows', 'summary']);
      expect(Object.keys(partial.summary)).toEqual(['all', 'cells', 'checks']);
      expect(F.ledgerOf({ complete: true, meta: meta, rows: rows }).complete).toBe(true);
    });

    it('is written as UTF-8 text with CRLF line ends and one final newline, and reads back', function () {
      var rows = [rowFor('hard', { score: 520 }), rowFor('hard', { error: new Error('lost') })];
      var ledger = F.ledgerOf({ meta: { argv: ['--count=12'] }, rows: rows });
      var text = F.ledgerText(ledger);
      expect(text.charCodeAt(0)).not.toBe(0xFEFF);
      expect(/(?<!\r)\n|\r(?!\n)|[ \t]+\r?$/m.test(text)).toBe(false);
      expect(text.slice(-2)).toBe('\r\n');
      expect(text.slice(-4)).not.toBe('\r\n\r\n');
      expect(JSON.parse(text).rows).toHaveLength(2);
      expect(JSON.parse(text).rows[1].outcome).toBe('error');
    });

    it('prints the hits with their denominators and the shallow share over the in-band puzzles', function () {
      var rows = [rowFor('hard', { error: new Error('lost'), work: null })];
      [430, 470, 500, 560].forEach(function (score, k) {
        rows.push(diagnosed(rowFor('hard', { score: score, shallow: k < 1, exact: k >= 1 }),
          k < 1 ? SOLVED : STUCK));
      });
      var text = F.summaryLines(F.ledgerOf({ meta: {}, rows: rows }).summary).join('\n');
      expect(text).toContain('== classic9/hard: 5 requests, 1 errors, 0 unrated, 4 solved in band ==');
      expect(text).toContain('old hits 3/5 (60%), qualified hits 3/5 (60%), shallow 1/4 (25%; 4 with a ' +
        'derived verdict); exact flag against the derived verdict: 0 disagreements');
      expect(text).toContain('sampled reference: ok 4, vacuous 0, error 0, skipped 0, notSelected 0, notRun 1');
      expect(text).toContain('work: ok 4, mismatch 0, unavailable 1; local searches ended by shallow 0');
      expect(text).toContain('cohort all in band: 4 puzzles');
    });
  });

  describe('difficulty diagnostics: merging the ledgers of the shards of one logical cell', function () {
    function shard(from, count, total, tweak) {
      var rows = [];
      for (var i = from; i < from + count; i++) {
        rows.push({ variant: 'classic9', requested: 'hard', index: i, tag: 'classic9:hard:' + i });
      }
      var ledger = {
        schema: 1, complete: true, rows: rows, summary: {},
        meta: {
          acceptance: 'canonical-required-tier', sourceHash: 'a'.repeat(64), sourceFiles: 63,
          toolHash: 'b'.repeat(64), node: 'v26.0.0', seedBase: 20260101, shallowCap: null,
          shallowSearchRatings: null,
          manifest: {
            quick: false, perCombo: 0, includeUnsupported: false, weights: null, bands: null, gate: false,
            ratingVersion: 3, referenceBudgetMs: 120000,
            cells: [{ variant: 'classic9', level: 'hard', requests: count, from: from, logicalTotal: total,
              referenceIndexes: [0, total - 1], route: 'direct', unsupported: false }]
          }
        }
      };
      if (tweak) tweak(ledger);
      return ledger;
    }

    it('merges the spans of a plan, in any order, into the raw rows 0 to total - 1 once each', function () {
      var low = shard(0, 6, 12);
      var high = shard(6, 6, 12);
      [[low, high], [high, low]].forEach(function (pair) {
        var merged = F.mergeShards(pair);
        expect(merged.problems).toEqual([]);
        expect(merged.ok).toBe(true);
        expect(merged.cell).toEqual({ variant: 'classic9', requested: 'hard', total: 12 });
        expect(merged.rows.map(function (row) { return row.index; }))
          .toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        expect(merged.rows[7]).toBe(high.rows[1]);
      });
      expect(F.mergeShards([shard(0, 12, 12)]).ok).toBe(true);
      expect(F.mergeShards([shard(0, 5, 12), shard(5, 3, 12), shard(8, 4, 12)]).ok).toBe(true);
      expect(F.mergeShards([shard(0, 1, 1)]).ok).toBe(true);
    });

    it('refuses a gap, a duplicate and an overlap: nothing is merged', function () {
      var gap = F.mergeShards([shard(0, 6, 12), shard(7, 5, 12)]);
      expect([gap.ok, gap.rows]).toEqual([false, null]);
      expect(gap.problems).toEqual(['1 of 12 indexes are missing, from 6 to 6 at most']);
      var half = F.mergeShards([shard(0, 6, 12)]);
      expect(half.problems).toEqual(['6 of 12 indexes are missing, from 6 to 11 at most']);
      var twice = F.mergeShards([shard(0, 6, 12), shard(0, 6, 12)]);
      expect(twice.ok).toBe(false);
      expect(twice.problems).toContain('index 0 is in ledger 0 and in ledger 1');
      expect(twice.problems).toContain('6 of 12 indexes are missing, from 6 to 11 at most');
      var overlap = F.mergeShards([shard(0, 7, 12), shard(6, 6, 12)]);
      expect(overlap.ok).toBe(false);
      expect(overlap.problems).toEqual(['index 6 is in ledger 0 and in ledger 1']);
      var short = F.mergeShards([shard(0, 6, 12), shard(6, 6, 12, function (ledger) {
        ledger.rows.pop();
      })]);
      expect(short.problems).toContain('ledger 1 has 5 rows for 6 requests');
      expect(short.ok).toBe(false);
      expect(F.mergeShards([shard(0, 6, 12), shard(6, 6, 13)]).ok).toBe(false);
    });

    it('refuses ledgers of another source, tool, Node, seed, allowance, setting or logical total', function () {
      var changes = {
        sourceHash: function (m) { m.sourceHash = 'c'.repeat(64); },
        toolHash: function (m) { m.toolHash = 'c'.repeat(64); },
        node: function (m) { m.node = 'v26.0.1'; },
        seedBase: function (m) { m.seedBase = 1; },
        shallowCap: function (m) { m.shallowCap = '64'; m.shallowSearchRatings = 64; },
        weights: function (m) { m.manifest.weights = { nishio: 1 }; },
        bands: function (m) { m.manifest.bands = [0, 1]; },
        ratingVersion: function (m) { m.manifest.ratingVersion = 4; },
        route: function (m) { m.manifest.cells[0].route = 'pipeline'; },
        logicalTotal: function (m) { m.manifest.cells[0].logicalTotal = 13; }
      };
      Object.keys(changes).forEach(function (key) {
        var merged = F.mergeShards([shard(0, 6, 12), shard(6, 6, 12, function (ledger) {
          changes[key](ledger.meta);
        })]);
        expect([key, merged.ok, merged.rows]).toEqual([key, false, null]);
        expect(merged.problems.some(function (text) { return text.indexOf('ledger 1 differs from ledger 0 in ') === 0; }))
          .toBe(true);
      });
      var other = F.mergeShards([shard(0, 6, 12), shard(6, 6, 12, function (ledger) {
        ledger.meta.shallowCap = '64';
      })]);
      expect(other.problems).toEqual(['ledger 1 differs from ledger 0 in shallowCap']);
    });

    it('refuses a ledger that is not complete, not current, not of one cell or has a row out of its span',
      function () {
        expect(F.mergeShards([]).problems).toEqual(['no ledger to merge']);
        expect(F.mergeShards(null).ok).toBe(false);
        var partial = F.mergeShards([shard(0, 6, 12), shard(6, 6, 12, function (ledger) {
          ledger.complete = false;
        })]);
        expect(partial.problems).toContain('ledger 1 is not a complete schema 1 ledger');
        var old = F.mergeShards([shard(0, 12, 12, function (ledger) { delete ledger.meta.acceptance; })]);
        expect(old.ok).toBe(false);
        expect(old.problems[0]).toContain('is not a ledger of the canonical required tier');
        var two = F.mergeShards([shard(0, 12, 12, function (ledger) {
          ledger.meta.manifest.cells.push(ledger.meta.manifest.cells[0]);
        })]);
        expect(two.problems).toContain('ledger 0 describes 2 cells, not one');
        var out = F.mergeShards([shard(0, 6, 12), shard(6, 6, 12, function (ledger) {
          ledger.rows[0].index = 3;
        })]);
        expect(out.ok).toBe(false);
        expect(out.problems[0]).toBe('ledger 1 has a row with index 3 outside its span 6 to 11');
        var tag = F.mergeShards([shard(0, 6, 12), shard(6, 6, 12, function (ledger) {
          ledger.rows[2].tag = 'classic9:hard:2';
        })]);
        expect(tag.ok).toBe(false);
        expect(tag.problems[0]).toBe('ledger 1 has a row whose tag classic9:hard:2 is not classic9:hard:8');
        var span = F.mergeShards([shard(0, 6, 12, function (ledger) {
          ledger.meta.manifest.cells[0].logicalTotal = 5;
        })]);
        expect(span.ok).toBe(false);
        expect(span.problems[0]).toContain('has no valid span');
      });
  });

  // ---------------------------------------------------------------------------------------------
  // The ordered prefix of the ladder (the soak refuses weights or bands that break it)
  // ---------------------------------------------------------------------------------------------

  describe('difficulty diagnostics: the ordered prefix of the ladder', function () {
    function prefixEnv() {
      return {
        difficulty: D, techniques: SG.techniques,
        variantIds: SG.variants.list().map(function (def) { return def.id; })
      };
    }

    /** A registry of two techniques, a then b, to build orders the real registry does not have. */
    function fakeEnv(floorOf, tierOf) {
      return {
        difficulty: { LEVELS: ['low', 'high'], WEIGHTS: { a: 1, b: 2 }, floorTechniques: floorOf,
          tierTechniques: tierOf },
        techniques: {
          list: function () { return [{ id: 'a' }, { id: 'b' }]; },
          appliesTo: function () { return true; }
        },
        variantIds: ['probe']
      };
    }

    it('holds for every registered variant, every level and the no-model case of the default tables',
      function () {
        expect(prefixEnv().variantIds.length).toBeGreaterThan(10);
        expect(F.prefixViolationOf(prefixEnv())).toBeNull();
      });

    it('holds under an ordered band override, which is in force while it is checked', function () {
      var saved = D.TABLE.map(function (row) { return row.min; });
      try {
        [0, 60, 200, 420, 720, 1050, 1600, 2500, 3700].forEach(function (min, i) { D.TABLE[i].min = min; });
        expect(D.bandOf('veryEasy').max).toBe(60);
        expect(F.prefixViolationOf(prefixEnv())).toBeNull();
      } finally {
        saved.forEach(function (min, i) { D.TABLE[i].min = min; });
      }
      expect(D.TABLE.map(function (row) { return row.min; })).toEqual(saved);
    });

    it('names the first variant, level and list when a late technique gets a cheap weight', function () {
      var weight = D.WEIGHTS.nishio;
      var violation;
      try {
        D.WEIGHTS.nishio = 1;
        violation = F.prefixViolationOf(prefixEnv());
      } finally {
        D.WEIGHTS.nishio = weight;
      }
      expect(D.WEIGHTS.nishio).toBe(weight);
      expect(violation).toEqual({
        variantId: SG.variants.list()[0].id, level: 'veryEasy', kind: 'allowed',
        expected: ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'nishio'],
        actual: ['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine', 'pointing']
      });
      expect(F.prefixViolationOf(prefixEnv())).toBeNull();
    });

    it('tells a floor that leaves the ladder order from a floor with its tier', function () {
      var tier = function () { return ['a']; };
      var floorB = function (level) { return level === 'low' ? [] : ['b']; };
      expect(F.prefixViolationOf(fakeEnv(floorB, tier))).toEqual({
        variantId: 'probe', level: 'high', kind: 'floor', expected: ['b'], actual: ['a']
      });
      var floorA = function () { return []; };
      var tierB = function (level) { return level === 'low' ? ['b'] : ['a']; };
      expect(F.prefixViolationOf(fakeEnv(floorA, tierB))).toEqual({
        variantId: 'probe', level: 'low', kind: 'allowed', expected: ['b'], actual: ['a']
      });
    });

    it('checks every level, the no-model case last, and compares the lists in order', function () {
      var tier = function () { return []; };
      var onlyNoModel = function (level, model) { return model === null && level === 'high' ? ['b'] : []; };
      expect(F.prefixViolationOf(fakeEnv(onlyNoModel, tier)).variantId).toBeNull();
      var swapped = function (level) { return level === 'high' ? ['b', 'a'] : []; };
      expect(F.prefixViolationOf(fakeEnv(swapped, tier))).toEqual({
        variantId: 'probe', level: 'high', kind: 'floor', expected: ['b', 'a'], actual: ['a', 'b']
      });
      var ordered = function (level) { return level === 'high' ? ['a', 'b'] : []; };
      expect(F.prefixViolationOf(fakeEnv(ordered, tier))).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The hit of the qualifier (tests/qualify.js) in a vm of its own
  // ---------------------------------------------------------------------------------------------

  describe('difficulty diagnostics: the hit of a qualification request (Node only)', function () {
    var GOOD = { valid: true, solved: true, approximate: false, exact: true, achieved: 'easy' };

    /** tests/qualify.js as a module in a context of its own, with a fake process, to run its worker. */
    function loadQualify() {
      var node = SG.test.node;
      if (!node || !node.vm || !node.fs || typeof process === 'undefined' || !process.getBuiltinModule) {
        SG.test.skip('needs Node (vm, fs and process.getBuiltinModule); skipped in the browser');
      }
      var file = node.path.join(node.root, 'tests/qualify.js');
      var sent = [];
      var handlers = [];
      var fakeProcess = {
        on: function (name, fn) { handlers.push(fn); }, send: function (message) { sent.push(message); },
        exit: function () {}, hrtime: process.hrtime, argv: ['node', file]
      };
      var modules = {
        fs: node.fs, path: node.path, vm: node.vm, os: process.getBuiltinModule('os'),
        crypto: process.getBuiltinModule('crypto'), child_process: process.getBuiltinModule('child_process')
      };
      var ctx = node.vm.createContext({
        require: function (name) { return modules[name]; }, module: { exports: {} }, process: fakeProcess,
        __filename: file, __dirname: node.path.dirname(file),
        console: { log: function () {}, error: function () {} }
      });
      node.vm.runInContext(node.fs.readFileSync(file, 'utf8'), ctx, { filename: file });
      return { ctx: ctx, sent: sent, handlers: handlers, exports: ctx.module.exports };
    }

    it('counts a request only with every guard and the exact flag of the generator', function () {
      var hitOf = loadQualify().exports.hitOf;
      expect(hitOf(GOOD, 'easy')).toBe(true);
      expect(hitOf(Object.assign({}, GOOD, { achieved: 'normal' }), 'easy')).toBe(false);
      var misses = [{ valid: false }, { solved: false }, { approximate: true }, { exact: false },
        { exact: undefined }, { exact: 1 }, { valid: undefined }, { solved: undefined },
        { approximate: undefined }];
      misses.forEach(function (change) {
        var out = Object.assign({}, GOOD, change);
        expect([JSON.stringify(change), hitOf(out, 'easy')]).toEqual([JSON.stringify(change), false]);
      });
      var noFlag = Object.assign({}, GOOD);
      delete noFlag.exact;
      expect(hitOf(noFlag, 'easy')).toBe(false);
    });

    it('records the strict exact flag of the result and misses a shallow result in the requested level',
      function () {
        var q = loadQualify();
        var answer = null;
        var good = {
          model: { cellCount: 2 }, givens: [0, 2], solution: [1, 2], warnings: [], exact: true,
          rating: { level: 'easy', score: 70, solved: true }
        };
        var unique = 1;
        q.ctx.fakeSG = {
          difficulty: { LEVELS: ['veryEasy', 'easy'] },
          variants: { list: function () { return [{}]; } },
          budget: { create: function () { return {}; } },
          pipeline: { run: function () { return answer; } },
          model: { isSolution: function () { return true; } },
          dfs: { countSolutions: function () { return unique; } }
        };
        SG.test.node.vm.runInContext('loadSources = function () { return fakeSG; }; child();', q.ctx);
        expect(q.sent).toHaveLength(1);
        expect(q.sent[0].ready).toBe(true);
        function request(result, count) {
          answer = result;
          unique = count === undefined ? 1 : count;
          q.handlers[0]({ key: 'classic9/easy', index: 3, seed: 7, variant: 'classic9', level: 'easy' });
          return q.sent[q.sent.length - 1];
        }
        var hit = request(good);
        expect([hit.hit, hit.exact, hit.valid, hit.achieved]).toEqual([true, true, true, 'easy']);
        var shallow = request(Object.assign({}, good, { exact: false,
          warnings: ['difficulty.approximate', 'difficulty.shallow'] }));
        expect([shallow.hit, shallow.exact, shallow.approximate, shallow.achieved])
          .toEqual([false, false, true, 'easy']);
        var sameNameNoWarning = request(Object.assign({}, good, { exact: false }));
        expect([sameNameNoWarning.hit, sameNameNoWarning.exact, sameNameNoWarning.approximate])
          .toEqual([false, false, false]);
        var absent = Object.assign({}, good);
        delete absent.exact;
        expect([request(absent).hit, q.sent[q.sent.length - 1].exact]).toEqual([false, false]);
        expect(request(Object.assign({}, good, { exact: 'true' })).exact).toBe(false);
        expect(request(good, 2).hit).toBe(false);
        expect(request(Object.assign({}, good, { givens: [2, 2] })).hit).toBe(false);
        expect(request(Object.assign({}, good, { rating: { level: 'easy', score: 70, solved: false } })).hit)
          .toBe(false);
        expect(request(Object.assign({}, good, { rating: { level: 'veryEasy', score: 10, solved: true } }))
          .hit).toBe(false);
      });
  });

  // ---------------------------------------------------------------------------------------------
  // The soak itself, on a small cell, in a registry of its own with a fake file system, git and clock
  // ---------------------------------------------------------------------------------------------

  describe('difficulty diagnostics: the soak with --json (Node only)', function () {
    var CELL = ['--variant=classic9', '--level=normal', '--count=1', '--seed=20260101', '--no-gate'];
    var JSON_ARG = '--json=../docs/difficulty-v3/evidence/MS02/sandbox.json';
    var runs = {};

    /**
     * Runs tests/soak.js as a function with `require`, `process`, `console` and the global object replaced:
     * its sources load into a new vm context, its file writes are kept in memory and git answers with fixed
     * text. `inject(SG, log)` may wrap the engine of that registry once the sources have loaded.
     */
    function runSoak(args, inject) {
      var node = SG.test.node;
      if (!node || !node.vm || !node.fs || typeof process === 'undefined' || !process.getBuiltinModule) {
        SG.test.skip('needs Node (vm, fs and process.getBuiltinModule); skipped in the browser');
      }
      var context = node.vm.createContext({});
      var result = { out: [], err: [], writes: [], files: {}, events: [], givens: [], code: undefined,
        thrown: null };
      var soakPath = node.path.join(node.root, 'tests/soak.js');
      var code = node.fs.readFileSync(soakPath, 'utf8').replace(/^#![^\n]*\n/, '');
      var fakeFs = Object.assign({}, node.fs, {
        writeFileSync: function (file, text) {
          result.files[file] = String(text);
          result.writes.push(JSON.parse(String(text)));
        },
        renameSync: function (from, to) {
          result.files[to] = result.files[from];
          delete result.files[from];
        },
        mkdirSync: function () {},
        rmSync: function (file) { delete result.files[file]; }
      });
      var fakeVm = {
        runInThisContext: function (text, options) {
          var value = node.vm.runInContext(text, context, options);
          if (/difficulty-diagnostics\.js$/.test(options.filename)) watch(context.SG, result, inject);
          return value;
        }
      };
      var modules = {
        fs: fakeFs, path: node.path, vm: fakeVm, os: process.getBuiltinModule('os'),
        crypto: process.getBuiltinModule('crypto'),
        child_process: { execFileSync: function (command, argv) {
          return argv[0] === 'rev-parse' ? 'cafe0001\n' : ' M generator/tests/soak.js\n';
        } }
      };
      var fakeProcess = { argv: ['node', soakPath].concat(args), version: process.version,
        hrtime: process.hrtime, cwd: function () { return node.root; }, exitCode: undefined };
      var fakeConsole = {
        log: function (text) { result.out.push(String(text)); },
        error: function (text) { result.err.push(String(text)); }
      };
      var run = node.vm.runInThisContext('(function (require, process, console, __dirname, globalThis) {' +
        code + '\n})', { filename: soakPath });
      try {
        run(function (name) { return modules[name]; }, fakeProcess, fakeConsole,
          node.path.dirname(soakPath), context);
      } catch (err) {
        result.thrown = err;
      }
      result.code = fakeProcess.exitCode;
      result.text = result.out.join('\n');
      return result;
    }

    /** Logs the engine calls the soak makes in that registry, and what generate returns. */
    function watch(sg, result, inject) {
      var d = sg.difficulty;
      var generate = sg.digger.generate;
      var count = sg.dfs.countSolutions;
      var solve = sg.logicalSolver.solve;
      var certify = d.certifyFloor;
      var rate = d.rate;
      var inDiagnostic = 0;
      sg.digger.generate = function () {
        result.events.push('generate');
        var p = generate.apply(this, arguments);
        result.givens.push(Array.prototype.join.call(p.givens, ''));
        return p;
      };
      sg.dfs.countSolutions = function () {
        result.events.push('count');
        return count.apply(this, arguments);
      };
      sg.logicalSolver.solve = function (model, givens, options) {
        if (inDiagnostic === 0) result.events.push(options && options.collectSteps ? 'solve-steps' : 'solve');
        return solve.apply(this, arguments);
      };
      d.certifyFloor = function () {
        result.events.push('reference');
        inDiagnostic++;
        try {
          return certify.apply(this, arguments);
        } finally {
          inDiagnostic--;
        }
      };
      d.rate = function (model, givens, options) {
        var path = !!options && options.collectSteps === true;
        result.events.push(path ? 'path-rate' : 'rate');
        if (path) inDiagnostic++;
        try {
          return rate.apply(this, arguments);
        } finally {
          if (path) inDiagnostic--;
        }
      };
      if (inject) inject(sg, result);
    }

    function cached(name, args, inject) {
      if (!runs[name]) runs[name] = runSoak(args, inject);
      return runs[name];
    }

    function ledgerOf(run) {
      var files = Object.keys(run.files);
      expect(files).toHaveLength(1);
      expect(/sandbox\.json$/.test(files[0])).toBe(true);
      return JSON.parse(run.files[files[0]]);
    }

    function oldLines(text) {
      return text.split('\n').filter(function (line) {
        return /^(exact:|  normal |Invariants|  I[1-7] |classic9 hit rate|RESULT|bin |\d)/.test(line) ||
          /^(group of|180-400)/.test(line);
      });
    }

    it('keeps the old text, the puzzles and the engine calls of a run without --json', function () {
      var plain = cached('plain', CELL);
      var diag = cached('diag', CELL.concat([JSON_ARG]));
      expect(plain.thrown).toBeNull();
      expect(diag.thrown).toBeNull();
      expect([plain.code, diag.code]).toEqual([0, 0]);
      expect(plain.givens).toHaveLength(6);
      expect(diag.givens).toEqual(plain.givens);
      // 2 sampled references (the first and the last request) and 5 final-path rates
      var generation = diag.events.slice(0, diag.events.length - 7);
      expect(oldLines(diag.text)).toEqual(oldLines(plain.text));
      expect(oldLines(plain.text).length).toBeGreaterThan(15);
      expect(plain.events.indexOf('reference')).toBe(-1);
      expect(plain.events.indexOf('path-rate')).toBe(-1);
      expect(generation).toEqual(plain.events);
      expect(plain.files).toEqual({});
    });

    it('runs every new solve only after the last generation and the last check of I1-I7', function () {
      var diag = cached('diag', CELL.concat([JSON_ARG]));
      var events = diag.events;
      var first = events.findIndex(function (e) { return e === 'reference' || e === 'path-rate'; });
      expect(first).toBeGreaterThan(events.lastIndexOf('generate'));
      expect(first).toBeGreaterThan(events.lastIndexOf('count'));
      expect(first).toBeGreaterThan(events.lastIndexOf('solve-steps'));
      expect(events.slice(first).filter(function (e) { return e !== 'reference' && e !== 'path-rate'; }))
        .toEqual([]);
      expect(events.filter(function (e) { return e === 'reference'; })).toHaveLength(2);
      expect(events.filter(function (e) { return e === 'path-rate'; })).toHaveLength(5);
      expect(events.filter(function (e) { return e === 'generate'; })).toHaveLength(6);
    });

    it('writes a ledger after every request and diagnostic, complete only at the very end', function () {
      var diag = cached('diag', CELL.concat([JSON_ARG]));
      var writes = diag.writes;
      expect(writes[0].complete).toBe(false);
      expect(writes[0].rows).toHaveLength(0);
      expect(writes.slice(0, -1).every(function (w) { return w.complete === false; })).toBe(true);
      expect(writes[writes.length - 1].complete).toBe(true);
      var counts = writes.map(function (w) { return w.rows.length; });
      expect(counts.slice(0, 7)).toEqual([0, 1, 2, 3, 4, 5, 5]);
      var generated = writes[5];
      expect(generated.rows.every(function (row) { return row.referenceStatus === 'not-run'; })).toBe(true);
      expect(generated.rows.every(function (row) { return row.diagnosticMs === null; })).toBe(true);
      var middle = writes[7];
      expect(middle.complete).toBe(false);
      var diagnosedRows = middle.rows.filter(function (row) { return row.referenceStatus !== 'not-run'; });
      expect(diagnosedRows).toHaveLength(2);
      expect(writes).toHaveLength(12);
    });

    it('records the source, the commit, the command and the manifest, and every request', function () {
      var ledger = ledgerOf(cached('diag', CELL.concat([JSON_ARG])));
      expect([ledger.schema, ledger.complete]).toEqual([1, true]);
      expect(ledger.meta.sourceHash).toMatch(/^[0-9a-f]{64}$/);
      expect([ledger.meta.commit, ledger.meta.dirty, ledger.meta.seedBase])
        .toEqual(['cafe0001', true, 20260101]);
      expect(ledger.meta.dirtyFiles).toEqual([' M generator/tests/soak.js']);
      expect(ledger.meta.argv).toEqual(CELL.concat([JSON_ARG]));
      expect(ledger.meta.node).toBe(process.version);
      expect(ledger.meta.manifest.requests).toBe(5);
      expect(ledger.meta.manifest.cells).toEqual([
        { variant: 'classic9', level: 'normal', requests: 5, from: 0, logicalTotal: 5,
          referenceIndexes: [0, 4], route: 'direct', unsupported: false }]);
      expect(ledger.rows).toHaveLength(5);
      expect(ledger.rows.map(function (row) { return row.tag; })).toEqual([0, 1, 2, 3, 4].map(function (i) {
        return 'classic9:normal:' + i;
      }));
      expect(ledger.rows.every(function (row) { return row.pipelineSeed === null && row.fullRatings >= 1; }))
        .toBe(true);
      expect(ledger.rows.every(function (row) { return /^[0-9a-f]{16}$/.test(row.puzzleHash); })).toBe(true);
      // the reference is sampled: the first and the last request of the cell, the others are not selected
      expect(ledger.rows.map(function (row) { return row.referenceStatus; }))
        .toEqual(['ok', 'not-selected', 'not-selected', 'not-selected', 'ok']);
      expect(ledger.rows.every(function (row) { return row.pathCheck.status === 'ok'; })).toBe(true);
      expect(ledger.rows.every(function (row) { return row.workCheck.status === 'ok'; })).toBe(true);
      expect(ledger.meta.acceptance).toBe('canonical-required-tier');
      // no --shallow-cap: the default of the source is in force, and the ledger says which it is
      var inForce = SG.digger.SHALLOW_SEARCH_RATINGS;
      expect([ledger.meta.shallowCap, ledger.meta.shallowSearchRatings])
        .toEqual([null, inForce === Infinity ? null : inForce]);
      expect(ledger.summary.all.requests).toBe(5);
      expect(ledger.summary.checks.result).toBe('PASS');
      expect(diagnosedText(cached('diag', CELL.concat([JSON_ARG])))).toContain('DIAGNOSTICS: PASS');
    });

    function diagnosedText(run) {
      return run.text.slice(run.text.indexOf('Difficulty diagnostics'));
    }

    it('keeps a failed request as an error row in the denominators and fails the report, not the exit status',
      function () {
        var run = runSoak(CELL.concat([JSON_ARG]), function (sg) {
          var generate = sg.digger.generate;
          var calls = 0;
          sg.digger.generate = function () {
            calls++;
            if (calls === 3) throw new sg.errors.GenerationError('budget.exceeded', { reason: 'time' });
            return generate.apply(this, arguments);
          };
        });
        expect(run.thrown).toBeNull();
        expect(run.code).toBe(0);
        var ledger = ledgerOf(run);
        var errors = ledger.rows.filter(function (row) { return row.outcome === 'error'; });
        expect(ledger.rows).toHaveLength(5);
        expect(errors).toHaveLength(1);
        expect(errors[0].error.code).toBe('budget.exceeded');
        expect([errors[0].referenceStatus, errors[0].required, errors[0].qualifiedHit])
          .toEqual(['not-run', null, false]);
        expect(ledger.summary.all.errors).toBe(1);
        expect(ledger.summary.all.oldHits.denominator).toBe(5);
        expect(ledger.summary.all.qualifiedHits.denominator).toBe(5);
        expect(ledger.summary.checks.requestErrors).toBe(1);
        expect(ledger.summary.checks.result).toBe('FAIL');
        expect(run.text).toContain('DIAGNOSTICS: FAIL (request errors 1,');
      });

    it('lets the error of a plain run end it, as it always did', function () {
      var run = runSoak(CELL, function (sg) {
        sg.digger.generate = function () { throw new sg.errors.GenerationError('budget.exceeded', {}); };
      });
      expect(run.thrown).not.toBeNull();
      expect(run.thrown.code).toBe('budget.exceeded');
    });

    it('refuses a ledger path outside the repository', function () {
      var run = runSoak(['--json=../../outside.json']);
      expect(run.code).toBe(2);
      expect(run.err.join('\n')).toContain('--json needs a file inside the repository');
      expect(run.writes).toEqual([]);
    });

    it('rejects weights that break the ordered prefix before any generation, --no-gate included',
      function () {
        var rngCalls = 0;
        var run = runSoak(CELL.concat(['--weights={"nishio":1}', JSON_ARG]), function (sg) {
          var create = sg.rng.create;
          sg.rng.create = function () {
            rngCalls++;
            return create.apply(this, arguments);
          };
        });
        expect(run.thrown).toBeNull();
        expect(run.code).toBe(2);
        var message = run.err.join('\n');
        expect(message).toContain('break the ordered prefix of the technique ladder');
        expect(message).toContain('variant classic4, level veryEasy, floor with tier');
        expect(message).toContain('expected: nakedSingle, hiddenSingleBox, hiddenSingleLine, nishio');
        expect(message).toContain('actual:   nakedSingle, hiddenSingleBox, hiddenSingleLine, pointing');
        expect(message).not.toContain('Usage:');
        expect(run.events).toEqual([]);
        expect(rngCalls).toBe(0);
        expect(run.out).toEqual([]);
        expect(run.writes).toEqual([]);
      });

    it('keeps malformed JSON in --weights a usage error of its own, not a prefix rejection', function () {
      var run = runSoak(CELL.concat(['--weights={"nishio":']));
      expect(run.code).toBe(2);
      var message = run.err.join('\n');
      expect(message).toContain('Usage: node tests/soak.js');
      expect(message).not.toContain('nothing was generated');
      expect(run.events).toEqual([]);
    });

    describe('the shallow allowance, the work and the shards of a plan', function () {
      var CELL4 = ['--variant=classic4', '--level=veryEasy', '--seed=20260101', '--no-gate'];

      function usageError(args, text, inject) {
        var run = runSoak(args, inject);
        expect(run.thrown).toBeNull();
        expect([args.join(' '), run.code]).toEqual([args.join(' '), 2]);
        expect(run.err.join('\n')).toContain(text);
        expect(run.events).toEqual([]);
        expect(run.writes).toEqual([]);
        return run;
      }

      ['64', '128', '256', 'none'].forEach(function (cap) {
        it('--shallow-cap=' + cap + ' sets the allowance of the engine before any generation and says so',
          function () {
            var seen = [];
            var run = runSoak(CELL4.concat(['--count=1', '--shallow-cap=' + cap, JSON_ARG]), function (sg) {
              var generate = sg.digger.generate;
              sg.digger.generate = function () {
                seen.push(sg.digger.SHALLOW_SEARCH_RATINGS);
                return generate.apply(this, arguments);
              };
            });
            expect(run.thrown).toBeNull();
            expect(run.code).toBe(0);
            var expected = cap === 'none' ? Infinity : Number(cap);
            expect(seen.length).toBeGreaterThan(0);
            expect(seen.every(function (value) { return value === expected; })).toBe(true);
            var meta = ledgerOf(run).meta;
            expect([meta.shallowCap, meta.shallowSearchRatings]).toEqual([cap, cap === 'none' ? null : expected]);
            expect(run.text).toContain('Shallow-search allowance: ' +
              (cap === 'none' ? 'none (Infinity)' : cap + ' full ratings') + ' (--shallow-cap)');
          });
      });

      it('leaves the default allowance of the source alone without --shallow-cap', function () {
        var seen = [];
        var original;
        var run = runSoak(CELL4.concat(['--count=1', JSON_ARG]), function (sg) {
          var generate = sg.digger.generate;
          original = sg.digger.SHALLOW_SEARCH_RATINGS;
          sg.digger.generate = function () {
            seen.push(sg.digger.SHALLOW_SEARCH_RATINGS);
            return generate.apply(this, arguments);
          };
        });
        expect(run.code).toBe(0);
        expect(seen.length).toBeGreaterThan(0);
        expect(seen.every(function (value) { return value === original; })).toBe(true);
        expect(run.text).not.toContain('Shallow-search allowance');
      });

      it('rejects a --shallow-cap that is not one of 64, 128, 256 and none, before any generation', function () {
        ['32', '0', 'Infinity', 'abc', ''].forEach(function (value) {
          usageError(CELL4.concat(['--shallow-cap=' + value]), '--shallow-cap needs one of 64, 128, 256, none');
        });
      });

      it('refuses --shallow-cap with a source that has no such setting', function () {
        usageError(CELL4.concat(['--shallow-cap=64']), 'which this source does not have', function (sg) {
          delete sg.digger.SHALLOW_SEARCH_RATINGS;
        });
      });

      it('runs the shards of one logical cell as the whole cell: same tags, puzzles, work and sampled ends',
        function () {
          var whole = runSoak(CELL4.concat(['--count=12', JSON_ARG]));
          var low = runSoak(CELL4.concat(['--count=6', '--from=0', '--total-count=12', JSON_ARG]));
          var high = runSoak(CELL4.concat(['--count=6', '--from=6', '--total-count=12', JSON_ARG]));
          [whole, low, high].forEach(function (run) {
            expect([run.thrown, run.code]).toEqual([null, 0]);
          });
          var all = ledgerOf(whole);
          var a = ledgerOf(low);
          var b = ledgerOf(high);
          expect(all.rows).toHaveLength(12);
          expect([a.rows.length, b.rows.length]).toEqual([6, 6]);
          var rows = a.rows.concat(b.rows);
          var pick = function (row) {
            return [row.index, row.tag, row.pipelineSeed, row.puzzleHash, row.outcome, row.achieved, row.score,
              row.generationExact, row.ratingCalls, row.fullRatings, JSON.stringify(row.work),
              row.referenceStatus, row.workCheck.status];
          };
          expect(rows.map(pick)).toEqual(all.rows.map(pick));
          // the two shards merge into the plan of the whole cell, from their own metadata alone
          expect(a.meta.toolHash).toMatch(/^[0-9a-f]{64}$/);
          expect(a.meta.toolHash).toBe(b.meta.toolHash);
          var merged = F.mergeShards([b, a]);
          expect([merged.problems, merged.ok]).toEqual([[], true]);
          expect(merged.rows.map(pick)).toEqual(all.rows.map(pick));
          expect(F.mergeShards([all]).ok).toBe(true);
          expect(F.mergeShards([a]).ok).toBe(false);
          expect(F.mergeShards([a, a]).ok).toBe(false);
          expect(rows.map(function (row) { return row.index; })).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
          expect(rows.map(function (row) { return row.tag; })).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
            .map(function (i) { return 'classic4:veryEasy:' + i; }));
          // the sampled references are the first and the last request of the logical cell, whatever the shard
          expect(all.rows.map(function (row) { return row.referenceStatus === 'not-selected'; })).toEqual(
            [false, true, true, true, true, true, true, true, true, true, true, false]);
          expect([a.meta.manifest.shard, b.meta.manifest.shard, all.meta.manifest.shard]).toEqual([
            { from: 0, count: 6, total: 12 }, { from: 6, count: 6, total: 12 }, null]);
          expect([a.meta.manifest.requests, a.meta.manifest.logicalRequests, all.meta.manifest.requests,
            all.meta.manifest.logicalRequests]).toEqual([6, 12, 12, 12]);
          expect(b.meta.manifest.cells[0]).toEqual({ variant: 'classic4', level: 'veryEasy', requests: 6,
            from: 6, logicalTotal: 12, referenceIndexes: [0, 11], route: 'direct', unsupported: false });
          expect(low.text).toContain('Shard of classic4/veryEasy: requests 0 to 5 of a logical cell of 12');
          expect(high.text).toContain('requests 6 to 11 of a logical cell of 12');
        });

      it('refuses shard flags that do not describe a shard of one cell, before any generation', function () {
        usageError(CELL4.concat(['--from=3']), '--from and --total-count need --count=<n>');
        usageError(CELL4.concat(['--count=0', '--from=0', '--total-count=4']), 'need --count=<n> with n > 0');
        usageError(CELL4.concat(['--count=6', '--from=6']), '--from > 0 needs --total-count=<N>');
        usageError(CELL4.concat(['--count=6', '--from=6', '--total-count=11']),
          '--total-count=11 is less than --from + --count = 12');
        usageError(CELL4.concat(['--count=6', '--total-count=5']),
          '--total-count=5 is less than --from + --count = 6');
        usageError(CELL4.concat(['--count=6', '--from=x']), '--from needs a whole number, not "x"');
        usageError(CELL4.concat(['--count=6', '--total-count=1.5']), '--total-count needs a whole number');
        ['--quick', '--full', '--per-combo=3'].forEach(function (flag) {
          usageError(CELL4.concat(['--count=6', '--from=0', '--total-count=12', flag]),
            'cannot be combined with --quick, --full or --per-combo');
        });
        usageError(['--variant=classic4,classic6', '--count=2', '--from=0', '--seed=1', '--no-gate'],
          'need exactly one variant and level');
      });

      it('has the work of every request on the direct and on the pipeline route, conserved against the calls',
        function () {
          [['classic4', 'veryEasy', 'direct'], ['killer', 'veryEasy', 'pipeline']].forEach(function (cell) {
            var run = runSoak(['--variant=' + cell[0], '--level=' + cell[1], '--count=2', '--from=0',
              '--seed=20260101', '--no-gate', JSON_ARG]);
            expect([cell[0], run.thrown, run.code]).toEqual([cell[0], null, 0]);
            var ledger = ledgerOf(run);
            expect(ledger.meta.manifest.cells[0].route).toBe(cell[2]);
            expect(ledger.rows).toHaveLength(2);
            ledger.rows.forEach(function (row) {
              expect([cell[0], row.workCheck.status]).toEqual([cell[0], 'ok']);
              expect(row.work.length).toBeGreaterThanOrEqual(1);
              expect(row.fullRatings).toBe(row.ratingCalls);
              expect(row.fullRatings).toBeGreaterThanOrEqual(1);
              expect(row.capHits).toEqual({ shallow: 0, ratings: 0, proposals: 0 });
            });
            expect(ledger.summary.checks.workUnavailable).toBe(0);
            expect(ledger.summary.all.work.checks).toEqual({ ok: 2, mismatch: 0, unavailable: 0 });
          });
        });

      it('fails the run when a rating of the generation is made outside the work it counts', function () {
        var run = runSoak(CELL4.concat(['--count=1', '--from=0', JSON_ARG]), function (sg) {
          var generate = sg.digger.generate;
          sg.digger.generate = function () {
            var p = generate.apply(this, arguments);
            sg.difficulty.rate(p.model, p.givens);
            return p;
          };
        });
        expect([run.thrown, run.code]).toEqual([null, 0]);
        var ledger = ledgerOf(run);
        expect(ledger.rows[0].workCheck.status).toBe('mismatch');
        expect(ledger.rows[0].workCheck.reason).toContain('calls');
        expect(ledger.summary.checks.checkErrors[0]).toContain('classic4/veryEasy#0 work conservation:');
        expect(ledger.summary.checks.result).toBe('FAIL');
        expect(run.text).toContain('DIAGNOSTICS: FAIL');
      });

      it('fails the run when a result carries no work, and says it is unavailable, not zero', function () {
        var run = runSoak(CELL4.concat(['--count=1', '--from=0', JSON_ARG]), function (sg) {
          var generate = sg.digger.generate;
          sg.digger.generate = function () {
            var p = Object.assign({}, generate.apply(this, arguments));
            delete p.work;
            return p;
          };
        });
        expect([run.thrown, run.code]).toEqual([null, 0]);
        var ledger = ledgerOf(run);
        expect([ledger.rows[0].fullRatings, ledger.rows[0].work]).toEqual([null, null]);
        expect(ledger.rows[0].workCheck.status).toBe('unavailable');
        expect(ledger.summary.checks.workUnavailable).toBe(1);
        expect(ledger.summary.checks.result).toBe('INCOMPLETE');
        expect(run.text).toContain('DIAGNOSTICS: INCOMPLETE');
      });

      it('has the partial work of a request that failed in the digger, and counts the request', function () {
        var run = runSoak(CELL4.concat(['--count=1', '--from=0', JSON_ARG]), function (sg) {
          sg.digger.generate = function () {
            var err = new sg.errors.GenerationError('budget.exceeded', { reason: 'time' });
            Object.defineProperty(err, 'work', { value: [{ ratings: 0, proposals: 0, maxRatings: 1024,
              maxProposals: 32768, localSearches: [] }] });
            throw err;
          };
        });
        expect([run.thrown, run.code]).toEqual([null, 0]);
        var row = ledgerOf(run).rows[0];
        expect([row.outcome, row.fullRatings, row.workCheck.status]).toEqual(['error', 0, 'ok']);
      });

      it('reports a disagreement of the exact flag with the derived certificate as an I5 violation',
        function () {
          var run = runSoak(CELL4.concat(['--count=1', '--from=0', '--verbose', JSON_ARG]), function (sg) {
            var generate = sg.digger.generate;
            sg.digger.generate = function () {
              return Object.assign({}, generate.apply(this, arguments), { exact: false });
            };
          });
          expect([run.thrown, run.code]).toEqual([null, 0]);
          var ledger = ledgerOf(run);
          expect(ledger.summary.checks.invariantViolations.I5).toBe(1);
          expect(run.text).toContain('the generator says exact false, the derived certificate true');
          expect(ledger.summary.checks.result).toBe('FAIL');
          var control = ledgerOf(runSoak(CELL4.concat(['--count=1', '--from=0', JSON_ARG])));
          expect(control.summary.checks.invariantViolations.I5).toBe(0);
        });
    });

    describe('the exact flag, not the level names, decides a hit on either route', function () {
      var VERY_EASY = ['--level=veryEasy', '--count=1', '--seed=20260101', '--no-gate'];

      function exactOf(run) {
        var m = /^exact: (\d+) of (\d+)/m.exec(run.text);
        expect(m).not.toBeNull();
        return [Number(m[1]), Number(m[2])];
      }

      /** Very easy of a variant (every puzzle is in its level there), with the flag of the route changed. */
      function flagged(variant, route, mode) {
        var names = [];
        var run = runSoak(['--variant=' + variant].concat(VERY_EASY), function (sg) {
          var host = route === 'direct' ? sg.digger : sg.pipeline;
          var method = route === 'direct' ? 'generate' : 'run';
          var real = host[method];
          host[method] = function () {
            var result = real.apply(this, arguments);
            if (mode === 'real') return result;
            names.push(route === 'direct' ? result.achieved : result.rating.level);
            var changed = Object.assign({}, result);
            if (mode === 'false') changed.exact = false;
            else delete changed.exact;
            return changed;
          };
        });
        expect(run.thrown).toBeNull();
        expect(run.code).toBe(0);
        return { run: run, names: names };
      }

      [['direct', 'classic9'], ['pipeline', 'killer']].forEach(function (pair) {
        var route = pair[0];
        var variant = pair[1];

        it('on the ' + route + ' route (' + variant + '): equal level names with false or absent exact miss',
          function () {
            var control = exactOf(flagged(variant, route, 'real').run);
            expect(control[0]).toBeGreaterThan(0);
            ['false', 'absent'].forEach(function (mode) {
              var changed = flagged(variant, route, mode);
              expect(changed.names.filter(function (name) { return name === 'veryEasy'; }).length)
                .toBeGreaterThanOrEqual(5);
              expect([mode, exactOf(changed.run)]).toEqual([mode, [0, control[1]]]);
            });
          });
      });
    });
  });
})();
