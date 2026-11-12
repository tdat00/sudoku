// The baseline diagnostics of the soak (tests/fixtures/difficulty-diagnostics.js and
// `node tests/soak.js --json=<file>`; docs/difficulty-v3/report-detailed.md R23 and AC01): the raw and
// attainable positions with their null reasons, the statistics and the summary of a ledger, the deferred
// reference and final-path diagnostics with their failures, the ledger text, and (Node only) the soak itself
// run on a small cell in a registry of its own with its file system, git and clock replaced: the order of
// its solves, the partial ledgers and the old text it must not change. Every solve of the registry of the
// other suites is a stub; the real generations run in the Node vm context.
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

  /** A rating as `SG.difficulty.rate` returns it; `score` is set directly, the counts feed V. */
  function ratingOf(score, solved) {
    return { solved: solved !== false, score: solved === false ? null : score, empties: 50,
      techniqueCounts: { nakedSingle: 30, hiddenSingleBox: 10, pointing: 2, xyWing: 1 }, ratingVersion: 2,
      level: null };
  }

  var made = 0;

  /** A ledger row of a fabricated request of `level`; opts: score, solved, exact, error, achieved. */
  function rowFor(level, opts) {
    opts = opts || {};
    var b = bandOf(level);
    var index = made++;
    var puzzle = opts.error ? null : {
      achieved: opts.achieved === undefined ? level : opts.achieved,
      exact: opts.exact !== false,
      rating: ratingOf(opts.score, opts.solved)
    };
    return F.rowOf({ variant: 'classic9', requested: level, index: index,
      tag: 'classic9:' + level + ':' + index, pipelineSeed: null, puzzle: puzzle, error: opts.error,
      band: b.band, tierWeights: b.tierWeights, vacuous: b.vacuous, puzzleHash: 'h' + index,
      generationMs: 5, fullRatings: 1 });
  }

  function entryOf(row, unique) {
    return { row: row, model: model9, givens: new Int32Array(81).fill(0),
      rating: ratingOf(row.score, row.solved), requested: row.requested, unique: unique !== false };
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
        return Object.assign(ratingOf(row.score, row.solved), { steps: steps || [] });
      }
    }));
    return row;
  }

  var STUCK = { required: true, vacuous: false, floorLevel: 'normal', unsolvedCount: 12 };
  var SOLVED = { required: false, vacuous: false, floorLevel: 'normal', unsolvedCount: 0 };
  var VACUOUS = { required: true, vacuous: true, floorLevel: null, unsolvedCount: 0 };

  describe('difficulty diagnostics: rows', function () {
    it('starts a row with the generation facts, reference not run and unexposed counters null', function () {
      var row = rowFor('hard', { score: 520 });
      expect(Object.keys(row)).toEqual(['variant', 'requested', 'index', 'tag', 'pipelineSeed', 'outcome',
        'error', 'achieved', 'solved', 'score', 'ratingVersion', 'techniqueCounts', 'empties', 'scoreHit',
        'generationExact', 'qualifiedHit', 'required', 'referenceStatus', 'referenceError', 'shallow',
        'position', 'generationMs', 'diagnosticMs', 'fullRatings', 'proposals', 'shallowRatings', 'capHits',
        'chainLengths', 'nishioDepths', 'target', 'puzzleHash', 'pathCheck']);
      expect([row.outcome, row.error, row.solved, row.score, row.scoreHit, row.generationExact])
        .toEqual(['ok', null, true, 520, true, true]);
      expect([row.qualifiedHit, row.required, row.referenceStatus, row.referenceError, row.shallow])
        .toEqual([false, null, 'not-run', null, null]);
      expect([row.proposals, row.shallowRatings, row.capHits, row.target, row.diagnosticMs])
        .toEqual([null, null, null, null, null]);
      expect([row.chainLengths, row.nishioDepths]).toEqual([[], []]);
      expect(row.pathCheck).toEqual({ status: 'not-run', error: null });
      expect(row.position.inputs.score).toBe(520);
      expect(row.position.inputs.V).toBe(D.breakdown(row.techniqueCounts, row.empties).empty);
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
  });

  describe('difficulty diagnostics: the reference and the final path of a request', function () {
    it('records a solved or stuck floor, and a vacuous one, with the hits that follow', function () {
      var shallow = diagnosed(rowFor('hard', { score: 520 }), SOLVED);
      expect([shallow.referenceStatus, shallow.required, shallow.qualifiedHit, shallow.shallow])
        .toEqual(['ok', false, false, true]);
      var needed = diagnosed(rowFor('hard', { score: 520 }), STUCK);
      expect([needed.referenceStatus, needed.required, needed.qualifiedHit, needed.shallow])
        .toEqual(['ok', true, true, false]);
      var vacuous = diagnosed(rowFor('hell1', { score: 2500 }), VACUOUS);
      expect([vacuous.referenceStatus, vacuous.required, vacuous.qualifiedHit, vacuous.shallow])
        .toEqual(['vacuous', true, true, false]);
      var offBand = diagnosed(rowFor('hard', { score: 800, exact: false, achieved: 'expert' }), STUCK);
      expect([offBand.required, offBand.qualifiedHit, offBand.shallow]).toEqual([true, false, null]);
    });

    it('gives a reference failure its own status: never required, shallow or a qualified hit', function () {
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
        expect([k, row.referenceStatus, row.required, row.qualifiedHit, row.shallow, row.referenceError.code])
          .toEqual([k, 'error', null, false, null, codes[k]]);
        expect([k, row.outcome, row.scoreHit, row.score]).toEqual([k, 'ok', true, 520]);
      });
    });

    it('runs the reference only for a puzzle that I1 proved unique', function () {
      var log = [];
      var row = rowFor('hard', { score: 520 });
      F.diagnose(entryOf(row, false), envOf(log, { reference: function () { return STUCK; },
        rate: function () { return ratingOf(520); } }));
      expect(log).toEqual([]);
      expect([row.referenceStatus, row.required, row.qualifiedHit, row.shallow, row.pathCheck.status])
        .toEqual(['skipped-not-unique', null, false, null, 'not-run']);
      expect(typeof row.diagnosticMs).toBe('number');
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
        rows.push(diagnosed(rowFor('hard', { score: score, exact: k !== 7 }), k < 3 ? SOLVED : STUCK));
      });
      return rows;
    }

    it('keeps a failed request in every hit denominator, old hits apart from qualified hits', function () {
      var s = F.summaryOf(twelve());
      expect([s.requests, s.errors, s.unrated, s.inBand]).toEqual([12, 1, 1, 8]);
      expect(s.oldHits).toEqual({ count: 7, denominator: 12, share: 7 / 12 });
      expect(s.qualifiedHits).toEqual({ count: 5, denominator: 12, share: 5 / 12 });
      expect(s.matrix).toEqual({ hard: { error: 1, unrated: 1, expert: 1, normal: 1, hard: 8 } });
      expect(s.references).toEqual({ ok: 11, vacuous: 0, error: 0, skipped: 0, notRun: 1 });
    });

    it('takes the shallow share over the solved in-band puzzles, not exact ones or requests', function () {
      var s = F.summaryOf(twelve());
      expect(s.shallow).toEqual({ count: 3, denominator: 8, checked: 8, share: 3 / 8 });
    });

    it('does not call a failed reference shallow and says how many verdicts there are', function () {
      var rows = twelve();
      var cancelled = rowFor('hard', { score: 520 });
      F.diagnose(entryOf(cancelled), envOf([], { reference: function () {
        throw new SG.errors.GenerationError('budget.cancelled', { reason: 'cancelled' });
      }, rate: function () { return ratingOf(520); } }));
      rows.push(cancelled);
      var s = F.summaryOf(rows);
      expect(s.inBand).toBe(9);
      expect(s.shallow).toEqual({ count: 3, denominator: 9, checked: 8, share: 3 / 9 });
      expect(s.references.error).toBe(1);
      expect(s.qualifiedHits).toEqual({ count: 5, denominator: 13, share: 5 / 13 });
    });

    it('reports the exact and the all-in-band cohorts apart, off-band rows out of the spread', function () {
      var s = F.summaryOf(twelve());
      expect(s.cohorts.inBand.n).toBe(8);
      expect(s.cohorts.exact.n).toBe(7);
      var scores = [430, 470, 500, 560, 600, 640, 650, 690];
      var raw = scores.map(function (score) { return (score - 400) / 300; });
      expect(s.cohorts.inBand.raw.n).toBe(8);
      expect(s.cohorts.inBand.raw.deciles[0]).toBe(raw[0]);
      expect(s.cohorts.inBand.raw.deciles[10]).toBe(raw[7]);
      expect(s.cohorts.inBand.raw.upperMedian).toBe(raw[4]);
      expect(s.cohorts.exact.raw.n).toBe(7);
      expect(s.cohorts.exact.raw.deciles[10]).toBe(raw[6]);
      expect(s.cohorts.exact.raw.upperMedian).toBe(raw[3]);
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
      var rows = [rowFor('hard', { error: new Error('lost') })];
      [430, 470, 500, 560].forEach(function (score, k) {
        rows.push(diagnosed(rowFor('hard', { score: score }), k < 1 ? SOLVED : STUCK));
      });
      var text = F.summaryLines(F.ledgerOf({ meta: {}, rows: rows }).summary).join('\n');
      expect(text).toContain('== classic9/hard: 5 requests, 1 errors, 0 unrated, 4 solved in band ==');
      expect(text).toContain('old hits 4/5 (80%), qualified hits 3/5 (60%), shallow 1/4 (25%; 4 with a ' +
        'reference verdict)');
      expect(text).toContain('cohort all in band: 4 puzzles');
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
      var generation = diag.events.slice(0, diag.events.length - 10);
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
      expect(events.filter(function (e) { return e === 'reference'; })).toHaveLength(5);
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
        { variant: 'classic9', level: 'normal', requests: 5, route: 'direct', unsupported: false }]);
      expect(ledger.rows).toHaveLength(5);
      expect(ledger.rows.map(function (row) { return row.tag; })).toEqual([0, 1, 2, 3, 4].map(function (i) {
        return 'classic9:normal:' + i;
      }));
      expect(ledger.rows.every(function (row) { return row.pipelineSeed === null && row.fullRatings >= 1; }))
        .toBe(true);
      expect(ledger.rows.every(function (row) { return /^[0-9a-f]{16}$/.test(row.puzzleHash); })).toBe(true);
      expect(ledger.rows.every(function (row) { return row.referenceStatus === 'ok'; })).toBe(true);
      expect(ledger.rows.every(function (row) { return row.pathCheck.status === 'ok'; })).toBe(true);
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
  });
})();
