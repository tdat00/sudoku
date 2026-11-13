// The recovery profile driver (difficulty v3, MS05r1: tests/difficulty-recovery.js and its pure helpers in
// tests/fixtures/recovery-profile.js): the command line, the three fixed requests, the classification of the
// stages of a pipeline run into ordinary samples, local continuation and the rest on scripted stage streams,
// the transparency of the observation (arguments, yields, results, restoration, also after an error), a
// small real control, the outcome rows of a failed generation and of a failed validation, and the record text.
// Nothing here runs one of the three profiled requests.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var F = SG.fixtures.recoveryProfile;

  function now() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now() : Date.now();
  }

  function caught(fn) {
    try {
      fn();
    } catch (e) {
      return e;
    }
    throw new Error('expected the call to throw');
  }

  // ---------------------------------------------------------------------------------------------
  // Scripted stage streams
  // ---------------------------------------------------------------------------------------------

  function step(id, attempt, sample, extra) {
    var args = { attempt: attempt, maxAttempts: 2 };
    if (sample !== null) {
      args.sample = sample;
      args.maxSamples = 12;
    }
    return Object.assign({ id: id, args: args }, extra);
  }

  function fullGrid(attempt) { return step('fullGrid', attempt, null, { ms: 2 }); }
  function extra(attempt) { return step('extraStructure', attempt, null, { ms: 1 }); }
  function finalize(attempt) {
    return { id: 'tune', args: { attempt: attempt, maxAttempts: 2, finalize: true }, ms: 4 };
  }

  /** The dig, rate and tune stages of one sample of an attempt; `local` marks the repeated last sample. */
  function triplet(attempt, sample, digExtra, local) {
    return [
      step('dig', attempt, sample, Object.assign({ ms: 10, strategy: !local, local: local }, digExtra)),
      // the local search hands its own rating on, so its rate stage does not rate again
      step('rate', attempt, sample, { ms: 3, rates: local ? 0 : 1 }),
      step('tune', attempt, sample, { ms: 1 })
    ];
  }

  function flat(parts) {
    return parts.reduce(function (all, part) { return all.concat(part); }, []);
  }

  /**
   * Runs a plan (the stage calls of one generation, in order) through a fake `generateSteps` that gets the
   * real stage runner of the digger, a fake clock that only the stage bodies advance, and a fake `rate`. The
   * recorder is installed on the fake targets for the run and restored after it, as the driver does.
   */
  function scripted(plan, settings) {
    settings = settings || {};
    var time = { now: 0 };
    var read = function () { return time.now; };
    var seenCalls = { rate: 0, strategy: 0 };
    var allCaps = [];
    var targets = {
      difficulty: { rate: function () { seenCalls.rate++; return { solved: true }; } },
      digger: {
        getStrategy: function () {
          return function cells() { seenCalls.strategy++; return 'dug'; };
        },
        generateSteps: function* (model, level, rng, options) {
          var stage = options.stage;
          var strategy = targets.digger.getStrategy('cells');
          var all = allCaps;
          var caps = null;
          for (var i = 0; i < plan.length; i++) {
            var part = plan[i];
            if (part.id === 'fullGrid') {
              caps = { ratings: 0, proposals: 0, maxRatings: 1024, maxProposals: 32768 };
              if (settings.richCaps) {
                caps.localSearches = [];
                caps.local = null;
              }
              all.push(caps);
            }
            yield* stage(part.id, part.args, function () {
              if (part.strategy) strategy({}, [], 'level', null, { caps: caps });
              if (part.search && Array.isArray(caps.localSearches)) {
                caps.localSearches.push(Object.assign({}, part.search));
              }
              time.now += part.ms || 0;
              for (var k = 0; k < (part.rates || 0); k++) targets.difficulty.rate();
              if (caps !== null) {
                caps.ratings += part.rates || 0;
                caps.proposals += part.proposals || 0;
              }
              if (part.throws) throw new SG.errors.GenerationError(part.throws, {});
              return part.id;
            });
          }
          return {
            attempts: all.length,
            samples: plan.filter(function (p) { return p.id === 'dig' && !p.local; }).length,
            exact: false,
            clues: 0,
            warnings: [],
            work: all.map(function (c) {
              var copy = Object.assign({}, c);
              delete copy.local;
              return copy;
            })
          };
        }
      }
    };
    var before = {
      generateSteps: targets.digger.generateSteps, getStrategy: targets.digger.getStrategy,
      rate: targets.difficulty.rate
    };
    var recorder = F.createRecorder({ clock: read });
    var installed = F.install(recorder, targets);
    var stage = SG.digger.createStageSteps({ step: function () {} }, { now: read, cooperative: settings.coop });
    var failure = null;
    var puzzle = null;
    try {
      puzzle = SG.budget.drive(targets.digger.generateSteps({}, 'level', null, { stage: stage }));
    } catch (err) {
      failure = err;
    }
    var notes = installed.restore();
    return {
      seen: recorder.finish({ failed: failure !== null }), failure: failure, puzzle: puzzle, notes: notes,
      targets: targets, before: before, calls: seenCalls, stage: stage, caps: allCaps
    };
  }

  function kinds(run) {
    return run.seen.segments.map(function (seg) { return seg.kind; });
  }

  function repeat(kind, n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(kind);
    return out;
  }

  var ONE_ATTEMPT_LOCAL = flat([
    [fullGrid(1), extra(1)],
    triplet(1, 1, { rates: 0 }, false),
    triplet(1, 2, { rates: 1, ms: 20 }, false),
    triplet(1, 2, { rates: 5, proposals: 40, ms: 100 }, true),
    [finalize(1)]
  ]);

  describe('recovery profile: the command line', function () {
    var JSON_ARG = '--json=..\\docs\\x.json';

    it('reads both modes of every case, and takes the allowance setting as a string', function () {
      expect(F.parseArgs(['--mode=profile', '--case=G13', JSON_ARG])).toEqual(
        { mode: 'profile', caseId: 'G13', shallowCap: null, json: '..\\docs\\x.json' });
      expect(F.parseArgs(['--mode=profile', '--case=mega12-nightmare', '--shallow-cap=none', JSON_ARG])
        .shallowCap).toBe('none');
      F.CAP_SETTINGS.forEach(function (cap) {
        var args = F.parseArgs(['--mode=diagnostic', '--case=mega16-nightmare', '--shallow-cap=' + cap, JSON_ARG]);
        expect([args.mode, args.caseId, args.shallowCap]).toEqual(['diagnostic', 'mega16-nightmare', cap]);
      });
    });

    it('refuses what is not part of the contract, with the usage code', function () {
      var bad = [
        [],
        ['--mode=profile', '--case=G13'],
        ['--mode=other', '--case=G13', JSON_ARG],
        ['--mode=profile', '--case=G14', JSON_ARG],
        ['--mode=profile', '--case=G13', '--shallow-cap=64', JSON_ARG],
        ['--mode=profile', '--case=G13', '--shallow-cap=', JSON_ARG],
        ['--mode=diagnostic', '--case=G13', JSON_ARG],
        ['--mode=diagnostic', '--case=G13', '--shallow-cap=32', JSON_ARG],
        ['--mode=profile', '--case=G13', '--jobs=2', JSON_ARG],
        ['--mode=profile', '--case=G13', '--mode=profile', JSON_ARG],
        ['--mode', 'profile', '--case=G13', JSON_ARG]
      ];
      bad.forEach(function (argv) {
        expect(caught(function () { F.parseArgs(argv); }).code).toBe('usage');
      });
    });
  });

  describe('recovery profile: the three fixed requests', function () {
    function allowanceApi(on, fn) {
      var saved = Object.getOwnPropertyDescriptor(SG.digger, F.ALLOWANCE);
      if (on && !saved) SG.digger[F.ALLOWANCE] = Infinity;
      if (!on && saved) delete SG.digger[F.ALLOWANCE];
      try {
        return fn();
      } finally {
        if (saved) Object.defineProperty(SG.digger, F.ALLOWANCE, saved);
        else delete SG.digger[F.ALLOWANCE];
      }
    }

    it('takes G13 from the golden request through the store, and the megas as the seed-3 CV5 requests', function () {
      var golden = SG.fixtures.replayGoldens.filter(function (g) { return g.id === 'G13'; })[0];
      var g13 = F.caseOf('G13');
      expect(g13.request).toEqual(golden.request);
      expect(g13.config).toEqual(SG.store.toConfig(golden.request));
      expect([g13.config.variantId, g13.config.difficulty, g13.config.seed]).toEqual(['samurai', 'nightmare', 42]);
      expect(F.caseOf('mega12-nightmare').config).toEqual(
        { variantId: 'mega12', difficulty: 'nightmare', seed: 3, trace: 'off' });
      expect(F.caseOf('mega16-nightmare').config).toEqual(
        { variantId: 'mega16', difficulty: 'nightmare', seed: 3, trace: 'off' });
    });

    it('changes only maxAttempts in the profile, and nothing in the diagnostic, which keeps 8 attempts', function () {
      F.CASE_IDS.forEach(function (id) {
        var base = F.caseOf(id).config;
        var profile = F.prepare({ mode: 'profile', caseId: id, shallowCap: null, json: 'x.json' });
        expect(profile.config).toEqual(Object.assign({}, base, { maxAttempts: 1 }));
        expect(profile.normalizedConfig.maxAttempts).toBe(1);
        expect(F.prepare({ mode: 'profile', caseId: id, shallowCap: 'none', json: 'x.json' }).config)
          .toEqual(profile.config);
        allowanceApi(true, function () {
          var diag = F.prepare({ mode: 'diagnostic', caseId: id, shallowCap: '64', json: 'x.json' });
          expect(diag.config).toEqual(base);
          expect(diag.normalizedConfig.maxAttempts).toBe(SG.pipeline.DEFAULT_MAX_ATTEMPTS);
          expect(diag.normalizedConfig.maxAttempts).toBe(8);
        });
        var normalized = SG.pipeline.normalizeConfig(Object.assign({}, base, { maxAttempts: 1 }));
        expect(Object.assign({}, profile.normalizedConfig)).toEqual(normalized);
      });
    });

    it('refuses the diagnostic mode before anything is generated while the allowance API does not exist', function () {
      allowanceApi(false, function () {
        var generated = 0;
        var run = SG.pipeline.run;
        SG.pipeline.run = function () { generated++; return run.apply(this, arguments); };
        var err;
        try {
          err = caught(function () {
            F.prepare({ mode: 'diagnostic', caseId: 'G13', shallowCap: '128', json: 'x.json' });
          });
        } finally {
          SG.pipeline.run = run;
        }
        expect(err.code).toBe('usage');
        expect(err.message).toContain(F.ALLOWANCE);
        expect(generated).toBe(0);
      });
    });
  });

  describe('recovery profile: classification of the stages (scripted streams)', function () {
    it('splits ordinary samples 1 and 2 from the repeated sample 2, the local continuation', function () {
      var run = scripted(ONE_ATTEMPT_LOCAL);
      expect(run.failure).toBeNull();
      expect(kinds(run)).toEqual(['other', 'other'].concat(repeat('sample', 6), repeat('local', 3), ['other']));
      expect(run.seen.problems).toEqual([]);
      var s = run.seen.summary;
      expect([s.sampleMs, s.localMs, s.otherMs]).toEqual([10 + 3 + 1 + 20 + 3 + 1, 100 + 3 + 1, 2 + 1 + 4]);
      expect([s.sampleRatings, s.localStageRatings, s.otherRatings]).toEqual([3, 5, 0]);
      expect([s.sampleStages, s.localStages, s.otherStages]).toEqual([6, 3, 3]);
      expect([s.sampleTriplets, s.localTriplets, s.attemptsObserved]).toEqual([2, 1, 1]);
      expect(s.localProposals).toBe(40);
      expect(run.seen.attemptSummaries).toEqual([{
        attempt: 1, samples: 2, localRan: true, sampleMs: 38, localMs: 104, otherMs: 7, sampleRatings: 3,
        localStageRatings: 5, otherRatings: 0, localProposals: 40
      }]);
      expect(run.seen.segments.map(function (seg) { return seg.sample; }))
        .toEqual([null, null, 1, 1, 1, 2, 2, 2, 2, 2, 2, null]);
    });

    it('does not label the stage by its strategy: the local stage ran no cells strategy at all', function () {
      var run = scripted(ONE_ATTEMPT_LOCAL);
      expect(run.calls.strategy).toBe(2);
      var dig = run.seen.segments.filter(function (seg) { return seg.stepId === 'dig'; });
      expect(dig.map(function (seg) { return seg.kind; })).toEqual(['sample', 'sample', 'local']);
    });

    it('has no local stage when the attempt ends exact, and does not invent one', function () {
      var run = scripted(flat([[fullGrid(1), extra(1)], triplet(1, 1, {}, false)]));
      expect(kinds(run)).toEqual(['other', 'other'].concat(repeat('sample', 3)));
      expect(run.seen.summary.localMs).toBe(0);
      expect(run.seen.summary.localProposals).toBe(0);
      expect(run.seen.summary.localTriplets).toBe(0);
      expect(run.seen.attemptSummaries[0].localRan).toBe(false);
      expect(run.seen.problems).toEqual([]);
    });

    it('starts again in every attempt: sample 1 is a new sample and its repeat is the local continuation', function () {
      var run = scripted(flat([
        [fullGrid(1), extra(1)], triplet(1, 1, {}, false), triplet(1, 1, { proposals: 7 }, true),
        [fullGrid(2), extra(2)], triplet(2, 1, {}, false), triplet(2, 1, { proposals: 9, rates: 2 }, true),
        [finalize(2)]
      ]));
      expect(run.seen.problems).toEqual([]);
      expect(run.seen.summary.attemptsObserved).toBe(2);
      expect(run.seen.attemptSummaries.map(function (a) { return [a.attempt, a.samples, a.localRan]; }))
        .toEqual([[1, 1, true], [2, 1, true]]);
      expect(run.seen.work.map(function (w) { return [w.attempt, w.ratings, w.proposals, w.source]; }))
        .toEqual([[1, 1, 7, 'returned'], [2, 3, 9, 'returned']]);
      expect(run.seen.attemptSummaries[1].localProposals).toBe(9);
      var last = run.seen.segments[run.seen.segments.length - 1];
      expect([last.attempt, last.stepId, last.kind, last.sample]).toEqual([2, 'tune', 'other', null]);
    });

    it('keeps the partial data of an exception in the local continuation, and restores the engine', function () {
      var plan = ONE_ATTEMPT_LOCAL.slice(0, 8).concat([
        Object.assign({}, ONE_ATTEMPT_LOCAL[8], { rates: 2, proposals: 11, throws: 'budget.exceeded' })
      ]);
      var run = scripted(plan);
      expect(run.failure.code).toBe('budget.exceeded');
      var last = run.seen.segments[run.seen.segments.length - 1];
      expect([last.kind, last.stepId, last.complete, last.error.code]).toEqual(
        ['local', 'dig', false, 'budget.exceeded']);
      expect([last.rateCalls, last.ratings, last.proposals]).toEqual([2, 2, 11]);
      expect(run.seen.problems).toEqual([]);
      expect(run.seen.work).toEqual([{
        attempt: 1, ratings: 5, proposals: 11, maxRatings: 1024, maxProposals: 32768, source: 'snapshot',
        partial: true
      }]);
      expect(run.seen.workUnavailableReason).toContain('generation failed');
      expect(run.seen.summary.incompleteStages).toBe(1);
      expect(run.seen.summary.localMs).toBe(100);
      expect(run.notes).toEqual([]);
      expect(run.targets.digger.generateSteps).toBe(run.before.generateSteps);
      expect(run.targets.digger.getStrategy).toBe(run.before.getStrategy);
      expect(run.targets.difficulty.rate).toBe(run.before.rate);
      // the stage's own timings were not disturbed: the failed stage still added its time
      expect(run.stage.timings.dig).toBe(10 + 20 + 100);
    });

    it('labels an attempt whose counters were never seen as unavailable, not as zero', function () {
      var run = scripted([fullGrid(1), Object.assign({}, extra(1), { throws: 'budget.cancelled' })]);
      expect(run.failure.code).toBe('budget.cancelled');
      expect(run.seen.work).toEqual([{
        attempt: 1, ratings: null, proposals: null, maxRatings: null, maxProposals: null,
        source: 'unavailable', partial: true
      }]);
    });

    it('MS05r3: carries the local searches of the work, returned or snapshot, as its own copy', function () {
      var search = { ratings: 5, proposals: 40, firstShallowAt: 0, shallowRatings: 5, shallowLimit: 64,
        capHit: 'shallow' };
      var done = ONE_ATTEMPT_LOCAL.slice();
      done[8] = Object.assign({}, ONE_ATTEMPT_LOCAL[8], { search: search });
      var ok = scripted(done, { richCaps: true });
      expect(ok.failure).toBeNull();
      // the four base counters still reconcile; the richer record passes through unchanged
      expect(ok.seen.problems).toEqual([]);
      expect(ok.seen.work[0].localSearches).toEqual([search]);
      expect([ok.seen.work[0].source, ok.seen.work[0].partial]).toEqual(['returned', false]);
      expect(Object.keys(ok.seen.work[0]).sort()).toEqual(['attempt', 'localSearches', 'maxProposals',
        'maxRatings', 'partial', 'proposals', 'ratings', 'source']);
      // a failed attempt: the snapshot of its caps carries the records so far, copied
      var failing = ONE_ATTEMPT_LOCAL.slice(0, 8).concat([Object.assign({}, ONE_ATTEMPT_LOCAL[8],
        { rates: 2, proposals: 11, throws: 'budget.exceeded', search: search })]);
      var bad = scripted(failing, { richCaps: true });
      expect(bad.failure.code).toBe('budget.exceeded');
      expect([bad.seen.work[0].source, bad.seen.work[0].partial]).toEqual(['snapshot', true]);
      expect(bad.seen.work[0].localSearches).toEqual([search]);
      expect(bad.seen.work[0].localSearches[0]).not.toBe(bad.caps[0].localSearches[0]);
      bad.caps[0].localSearches[0].ratings = 999;
      expect(bad.seen.work[0].localSearches[0].ratings).toBe(5);
      expect(bad.seen.problems).toEqual([]);
      // an engine without the records (the caps of the MS05r1 tree): the work is what it was
      expect(Object.keys(scripted(failing).seen.work[0])).toEqual(['attempt', 'ratings', 'proposals',
        'maxRatings', 'maxProposals', 'source', 'partial']);
    });

    it('records an instrumentation problem, not a split, for invalid repeated or skipped sample IDs', function () {
      var twice = scripted(flat([
        [fullGrid(1), extra(1)], triplet(1, 1, {}, false), triplet(1, 1, {}, true), triplet(1, 1, {}, true)
      ]));
      expect(twice.seen.problems[0]).toContain('repeats its last sample more than once');
      expect(kinds(twice)).toEqual(['other', 'other'].concat(repeat('sample', 3), repeat('local', 3),
        repeat('other', 3)));

      var skipped = scripted(flat([[fullGrid(1), extra(1)], triplet(1, 1, {}, false), triplet(1, 3, {}, false)]));
      expect(skipped.seen.problems[0]).toBe('sample 3 follows sample 1 in attempt 1');
      expect(kinds(skipped).slice(5)).toEqual(repeat('other', 3));

      var back = scripted(flat([
        [fullGrid(1), extra(1)], triplet(1, 1, {}, false), triplet(1, 2, {}, false), triplet(1, 1, {}, false)
      ]));
      expect(back.seen.problems[0]).toBe('sample 1 follows sample 2 in attempt 1');

      var late = scripted(flat([[fullGrid(1), extra(1)], triplet(1, 1, {}, false)]).slice(0, 4)
        .concat([step('rate', 1, 2, {})]));
      expect(late.seen.problems[0]).toBe('the rate stage of sample 2 of attempt 1 does not follow its dig stage');

      var wrongAttempt = scripted([step('fullGrid', 2, null, {})]);
      expect(wrongAttempt.seen.problems[0]).toBe('fullGrid of attempt 2 does not follow attempt 0');
    });

    it('records overlapping stages, a missing work field and work that does not add up', function () {
      var time = { now: 0 };
      var read = function () { return time.now; };
      var overlap = F.createRecorder({ clock: read });
      var wrapped = overlap.wrapStage(SG.digger.createStageSteps({ step: function () {} }, { now: read }));
      SG.budget.drive((function* () {
        yield* wrapped('fullGrid', { attempt: 1, maxAttempts: 1 }, function* () {
          yield* wrapped('extraStructure', { attempt: 1, variantId: 'x' }, function () { return 0; });
        });
      })());
      var seen = overlap.finish({ failed: false });
      expect(seen.problems[0]).toBe('the extraStructure stage starts inside the fullGrid stage');
      expect(seen.work).toEqual([{
        attempt: 1, ratings: null, proposals: null, maxRatings: null, maxProposals: null, source: 'unavailable',
        partial: true
      }]);

      var missing = F.createRecorder({ clock: read });
      missing.takeReturned({ attempts: 1, samples: 0, work: null });
      var noWork = missing.finish({ failed: false });
      expect(noWork.workUnavailableReason).toBe('the returned puzzle has no work field');
      expect(noWork.problems).toContain('the returned puzzle has no work field');

      var lying = F.createRecorder({ clock: read });
      lying.takeReturned({ attempts: 2, samples: 5, work: [{ ratings: 3, proposals: 0, maxRatings: 1,
        maxProposals: 1 }] });
      var problems = lying.finish({ failed: false }).problems;
      expect(problems).toContain('the work records count 3 full ratings but 0 rate calls were made');
      expect(problems).toContain('the puzzle reports 2 attempts, 0 were observed');
      expect(problems).toContain('the puzzle reports 5 samples, 0 were observed');
    });
  });

  describe('recovery profile: the observation is transparent', function () {
    it('delegates the stage with its arguments, body, yields, result and error, and aliases the rest', function () {
      var time = { now: 0 };
      var recorder = F.createRecorder({ clock: function () { return time.now; } });
      var received = [];
      var result = { value: 'kept' };
      var boom = new Error('boom');
      var original = function* (stepId, args, body) {
        received.push([stepId, args, body]);
        yield 'a';
        time.now += 5;
        yield 'b';
        if (stepId === 'tune') throw boom;
        return result;
      };
      original.isStepStage = true;
      original.timings = { dig: 1 };
      original.current = 'first';
      var wrapped = recorder.wrapStage(original);
      expect(wrapped.isStepStage).toBe(true);
      expect(wrapped.timings).toBe(original.timings);
      original.current = 'dig';
      expect(wrapped.current).toBe('dig');
      wrapped.current = 'tune';
      expect(original.current).toBe('tune');

      var args = { attempt: 1, maxAttempts: 1 };
      var body = function () {};
      var it1 = wrapped('fullGrid', args, body);
      expect([it1.next().value, it1.next().value]).toEqual(['a', 'b']);
      var done = it1.next();
      expect(done.done).toBe(true);
      expect(done.value).toBe(result);
      expect(received[0][0]).toBe('fullGrid');
      expect(received[0][1]).toBe(args);
      expect(received[0][2]).toBe(body);

      var it2 = wrapped('tune', { attempt: 1, finalize: true }, body);
      it2.next();
      it2.next();
      expect(caught(function () { it2.next(); })).toBe(boom);
      var it3 = wrapped('extraStructure', { attempt: 1, variantId: 'x' }, body);
      it3.next();
      it3.return('stop');
      var seen = recorder.finish({ failed: true });
      expect(seen.segments.map(function (s) { return [s.stepId, s.complete, s.ms]; }))
        .toEqual([['fullGrid', true, 5], ['tune', false, 5], ['extraStructure', false, 0]]);
      expect(seen.segments[1].error).toEqual({ code: 'error', message: 'boom' });
    });

    it('hands the digger what it was given, and returns what it returns, copying only the work', function () {
      var seenArgs = null;
      var stage = SG.digger.createStageSteps({ step: function () {} });
      var puzzle = { attempts: 1, samples: 0, work: [{ ratings: 0, proposals: 0, maxRatings: 1, maxProposals: 1 }] };
      var targets = {
        difficulty: { rate: function () {} },
        digger: {
          getStrategy: function () {},
          generateSteps: function* () {
            seenArgs = Array.prototype.slice.call(arguments);
            yield 1;
            yield 2;
            return puzzle;
          }
        }
      };
      var recorder = F.createRecorder({ clock: now });
      var installed = F.install(recorder, targets);
      var model = {};
      var rng = {};
      var options = { maxAttempts: 3, stage: stage, marker: {} };
      var gen = targets.digger.generateSteps(model, 'hard', rng, options, 'more');
      expect([gen.next().value, gen.next().value]).toEqual([1, 2]);
      var done = gen.next();
      installed.restore();
      expect(done.done).toBe(true);
      expect(done.value).toBe(puzzle);
      expect(seenArgs[0]).toBe(model);
      expect(seenArgs[1]).toBe('hard');
      expect(seenArgs[2]).toBe(rng);
      expect(seenArgs[4]).toBe('more');
      expect(seenArgs[3]).not.toBe(options);
      expect(seenArgs[3].stage).not.toBe(stage);
      expect(seenArgs[3].stage.timings).toBe(stage.timings);
      expect(seenArgs[3].marker).toBe(options.marker);
      expect(seenArgs[3].maxAttempts).toBe(3);
      expect(options.stage).toBe(stage);
      puzzle.work[0].ratings = 99;
      expect(recorder.finish({ failed: false }).returned.work[0].ratings).toBe(0);
    });

    it('hands out one wrapper of the cells strategy, equal in effect, and the other strategies as they are', function () {
      var calls = [];
      var cells = function (model, solution) {
        calls.push([this, Array.prototype.slice.call(arguments)]);
        return { dug: solution };
      };
      var signs = function () {};
      var targets = {
        difficulty: { rate: function () {} },
        digger: {
          generateSteps: function* () {},
          getStrategy: function (id) { return id === 'cells' ? cells : signs; }
        }
      };
      var recorder = F.createRecorder({ clock: now });
      var installed = F.install(recorder, targets);
      var wrapped = targets.digger.getStrategy('cells');
      expect(wrapped).not.toBe(cells);
      expect(targets.digger.getStrategy('cells')).toBe(wrapped);
      expect(targets.digger.getStrategy('signs')).toBe(signs);
      var solution = [1];
      var caps = { ratings: 3, proposals: 4, maxRatings: 5, maxProposals: 6 };
      var out = wrapped('m', solution, 'level', 'rng', { caps: caps });
      expect(out.dug).toBe(solution);
      expect(calls[0][1][4].caps).toBe(caps);
      installed.restore();
      expect(targets.digger.getStrategy('cells')).toBe(cells);
    });

    it('counts a rate call, delegating its arguments and result, and nothing else', function () {
      var received = [];
      var out = { solved: true };
      var targets = {
        difficulty: { rate: function () { received.push(Array.prototype.slice.call(arguments)); return out; } },
        digger: { generateSteps: function* () {}, getStrategy: function () {} }
      };
      var recorder = F.createRecorder({ clock: now });
      var installed = F.install(recorder, targets);
      var model = {};
      var givens = [];
      var options = {};
      expect(targets.difficulty.rate(model, givens, options)).toBe(out);
      expect(received[0][0]).toBe(model);
      expect(received[0][1]).toBe(givens);
      expect(received[0][2]).toBe(options);
      installed.restore();
      expect(recorder.finish({ failed: false }).rateCalls).toBe(1);
    });

    it('puts the originals back after an error, only once, and never over another wrapper', function () {
      var run = scripted([fullGrid(1), Object.assign({}, extra(1), { throws: 'budget.exceeded' })]);
      expect(run.failure.code).toBe('budget.exceeded');
      expect(run.targets.digger.generateSteps).toBe(run.before.generateSteps);

      var targets = {
        difficulty: { rate: function () {} },
        digger: { generateSteps: function* () {}, getStrategy: function () {} }
      };
      var installed = F.install(F.createRecorder({ clock: now }), targets);
      var foreign = function () {};
      targets.difficulty.rate = foreign;
      var notes = installed.restore();
      expect(notes).toEqual(['rate was replaced during the run and is left as it is']);
      expect(targets.difficulty.rate).toBe(foreign);
      expect(installed.restore()).toEqual([]);
    });
  });

  describe('recovery profile: a small real control', function () {
    var CONTROL = { variantId: 'classic6', difficulty: 'hard', seed: 1, trace: 'off' };

    function prepared(mode, cap) {
      var config = Object.assign({}, CONTROL);
      if (mode === 'profile') config.maxAttempts = 1;
      return {
        caseId: 'control', mode: mode, capSetting: cap, baseRequest: CONTROL, config: config,
        normalizedConfig: SG.pipeline.normalizeConfig(config)
      };
    }

    function spyRng(rng, forks) {
      return {
        seed: rng.seed, next: rng.next, int: rng.int, pick: rng.pick, shuffle: rng.shuffle,
        fork: function (tag) {
          var child = rng.fork(tag);
          forks.push([tag, child]);
          return spyRng(child, forks);
        }
      };
    }

    /** `SG.digger.generateSteps` as the pipeline calls it, on its own stage runner, observed or not. */
    function direct(observed) {
      var cfg = prepared('profile').normalizedConfig;
      var forks = [];
      var rng = spyRng(SG.rng.create(cfg.seed), forks);
      var model = SG.variants.get(cfg.variantId).build(cfg.variantOptions, rng.fork('model'));
      var em = SG.events.createEmitter('off', null, {});
      var stage = SG.digger.createStageSteps(em, { now: now });
      var recorder = observed ? F.createRecorder({ clock: now }) : null;
      var installed = observed ? F.install(recorder, { digger: SG.digger, difficulty: SG.difficulty }) : null;
      var puzzle;
      try {
        puzzle = SG.budget.drive(SG.digger.generateSteps(model, cfg.difficulty, rng, {
          symmetry: cfg.symmetry, order: cfg.digOrder, maxAttempts: cfg.maxAttempts, budget: null, emit: em,
          stage: stage, cooperative: false, postGenerate: null, strategy: SG.digger.getStrategy('cells'),
          strategyId: 'cells'
        }));
      } finally {
        if (installed) installed.restore();
      }
      return {
        puzzle: puzzle,
        draws: forks.map(function (f) { return f[0] + ':' + f[1].next(); }),
        timingKeys: Object.keys(stage.timings),
        seen: recorder ? recorder.finish({ failed: false }) : null
      };
    }

    it('keeps the puzzle, the rating, the exactness, the dig log, the random streams and the counters', function () {
      var plain = direct(false);
      var before = { gs: SG.digger.generateSteps, gst: SG.digger.getStrategy, rate: SG.difficulty.rate };
      var observed = direct(true);
      expect(SG.digger.generateSteps).toBe(before.gs);
      expect(SG.digger.getStrategy).toBe(before.gst);
      expect(SG.difficulty.rate).toBe(before.rate);
      var a = plain.puzzle;
      var b = observed.puzzle;
      expect(Array.from(b.givens)).toEqual(Array.from(a.givens));
      expect(Array.from(b.solution)).toEqual(Array.from(a.solution));
      expect(b.rating).toEqual(a.rating);
      expect([b.exact, b.attempts, b.samples, b.clues]).toEqual([a.exact, a.attempts, a.samples, a.clues]);
      expect(b.warnings).toEqual(a.warnings);
      expect(b.log).toEqual(a.log);
      expect(b.work).toEqual(a.work);
      expect(observed.draws).toEqual(plain.draws);
      expect(observed.timingKeys).toEqual(plain.timingKeys);
      expect(a.exact).toBe(false);
    });

    it('splits the control by stage arguments and reconciles the stages with the work and the rate calls', function () {
      var seen = direct(true).seen;
      var work = seen.work.map(function (w) {
        return {
          ratings: w.ratings, proposals: w.proposals, maxRatings: w.maxRatings, maxProposals: w.maxProposals,
          localSearches: w.localSearches
        };
      });
      var plain = direct(false).puzzle;
      expect(seen.problems).toEqual([]);
      // the richer work of the engine (its local searches included) is copied whole, not reduced to the counters
      expect(work).toEqual(plain.work);
      expect(plain.work[0].localSearches).toHaveLength(1);
      var s = seen.summary;
      expect(s.localTriplets).toBe(1);
      expect(s.sampleTriplets).toBe(plain.samples);
      expect(s.sampleRatings + s.localStageRatings + s.otherRatings).toBe(plain.work[0].ratings);
      expect(s.rateCalls).toBe(plain.work[0].ratings);
      expect(s.localProposals).toBe(plain.work[0].proposals);
      expect(seen.segments.every(function (seg) { return seg.complete; })).toBe(true);
    });

    it('writes a complete record of the observed pipeline run, and puts the engine back', function () {
      var before = { gs: SG.digger.generateSteps, gst: SG.digger.getStrategy, rate: SG.difficulty.rate };
      var out = F.profile(prepared('profile', null), { clock: now, sha256: function (t) { return 'h' + t.length; } });
      expect(SG.digger.generateSteps).toBe(before.gs);
      expect(SG.digger.getStrategy).toBe(before.gst);
      expect(SG.difficulty.rate).toBe(before.rate);
      var identity = { sourceHash: 's', toolHash: 't', commit: 'c', dirty: true, node: 'v', machine: {}, argv: ['a'],
        startedAt: 'now' };
      var record = F.recordOf(prepared('profile', null), identity, out.run);
      expect(record.outcome).toBe('ok');
      expect(record.complete).toBe(true);
      expect(record.error).toBeNull();
      expect(F.exitCodeOf(record)).toBe(0);
      expect(Object.keys(record).slice(0, 26)).toEqual(['schema', 'complete', 'mode', 'caseId', 'baseRequest',
        'normalizedConfig', 'effectiveMaxAttempts', 'capSetting', 'sourceHash', 'toolHash', 'commit', 'dirty',
        'node', 'machine', 'jobs', 'argv', 'startedAt', 'diagnosticBudgetMs', 'generationMs', 'validationMs',
        'outcome', 'error', 'underlying', 'attempts', 'samples', 'exact']);
      expect([record.mode, record.jobs, record.effectiveMaxAttempts, record.capSetting, record.diagnosticBudgetMs])
        .toEqual(['profile', 1, 1, null, 500000]);
      expect([record.attempts, record.exact, record.required]).toEqual([1, false, false]);
      expect(record.checks).toEqual({ givensMatchSolution: true, isSolution: true, unique: true, ratingAgrees: true });
      expect(record.puzzleHash).toMatch(/^h\d+$/);
      expect(record.work).toHaveLength(1);
      expect(record.work[0].source).toBe('returned');
      expect(record.workUnavailableReason).toBeNull();
      expect(record.summary.localTriplets).toBe(1);
      expect(record.summary.pipelineTimingsMs.dig).toBeGreaterThan(0);
      expect(out.result.exact).toBe(false);
      expect(Array.from(out.result.givens)).toEqual(Array.from(direct(false).puzzle.givens));

      var text = F.renderRecord(record);
      expect(text.endsWith('\r\n')).toBe(true);
      expect(/(?<!\r)\n|[ \t]\r?\n/.test(text)).toBe(false);
      expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify(record)));
    });

    it('applies the diagnostic allowance for the run only, and keeps the normal attempts', function () {
      var saved = Object.getOwnPropertyDescriptor(SG.digger, F.ALLOWANCE);
      var writes = [];
      Object.defineProperty(SG.digger, F.ALLOWANCE, {
        configurable: true,
        get: function () { return 77; },
        set: function (v) { writes.push(v); }
      });
      var out;
      try {
        out = F.profile(prepared('diagnostic', '128'), { clock: now });
        F.profile(prepared('diagnostic', 'none'), { clock: now });
      } finally {
        if (saved) Object.defineProperty(SG.digger, F.ALLOWANCE, saved);
        else delete SG.digger[F.ALLOWANCE];
      }
      expect(writes).toEqual([128, 77, Infinity, 77]);
      expect(out.run.problems).toEqual([]);
      expect(out.run.seen.summary.attemptsObserved).toBeGreaterThan(1);
      expect(out.run.seen.work).toHaveLength(out.run.seen.summary.attemptsObserved);
    });

    it('keeps a failed generation as an outcome row with partial, labelled counters', function () {
      var before = SG.digger.generateSteps;
      var out = F.profile(prepared('profile', null), { clock: now, budget: SG.budget.create({ nodes: 600 }) });
      expect(SG.digger.generateSteps).toBe(before);
      expect(out.error.code).toBe('budget.exceeded');
      expect(out.result).toBeNull();
      var record = F.recordOf(prepared('profile', null), { sourceHash: 's', toolHash: 't', commit: null,
        dirty: null, node: 'v', machine: {}, argv: [], startedAt: 'now' }, out.run);
      expect(record.outcome).toBe('generation-error');
      expect(record.error.code).toBe('budget.exceeded');
      expect(record.complete).toBe(true);
      expect(F.exitCodeOf(record)).toBe(0);
      expect([record.validationMs, record.attempts, record.samples, record.exact, record.required])
        .toEqual([null, null, null, null, null]);
      expect(record.work.every(function (w) { return w.partial === true; })).toBe(true);
      expect(record.workUnavailableReason).toContain('generation failed');
      expect(record.summary.incompleteStages).toBeGreaterThan(0);
      expect(record.instrumentationProblems).toEqual([]);
    });

    it('does not take a failed validation as a fallback', function () {
      var out = F.profile(prepared('profile', null), { clock: now });
      var bad = Object.assign({}, out.result, { givens: Int32Array.from(out.result.givens) });
      var at = Array.prototype.findIndex.call(bad.givens, function (v) { return v !== 0; });
      bad.givens[at] = (bad.solution[at] % bad.model.digits) + 1;
      var checked = F.validate(bad, 'hard', SG.budget.create({ ms: 60000 }));
      expect(checked.ok).toBe(false);
      expect(checked.failed).toContain('givensMatchSolution');
      var run = Object.assign({}, out.run, { validation: checked });
      var record = F.recordOf(prepared('profile', null), { sourceHash: 's', toolHash: 't', commit: null,
        dirty: null, node: 'v', machine: {}, argv: [], startedAt: 'now' }, run);
      expect(record.outcome).toBe('validation-error');
      expect(record.error.code).toBe('validation.failed');
      expect(record.error.message).toContain('givensMatchSolution');
      expect(F.exitCodeOf(record)).toBe(0);
    });

    it('turns an instrumentation problem into an incomplete record and exit code 1', function () {
      var out = F.profile(prepared('profile', null), { clock: now });
      var run = Object.assign({}, out.run, { problems: ['sample 3 follows sample 1 in attempt 1'] });
      var record = F.recordOf(prepared('profile', null), { sourceHash: 's', toolHash: 't', commit: null,
        dirty: null, node: 'v', machine: {}, argv: [], startedAt: 'now' }, run);
      expect(record.outcome).toBe('instrumentation-error');
      expect(record.complete).toBe(false);
      expect(record.error).toEqual({ code: 'instrumentation', message: 'sample 3 follows sample 1 in attempt 1' });
      expect(record.underlying).toEqual({ outcome: 'ok', error: null });
      expect(F.exitCodeOf(record)).toBe(1);
    });

    it('refuses to render data that is not plain JSON', function () {
      expect(caught(function () { F.renderRecord({ a: Infinity }); })).toBeInstanceOf(TypeError);
      expect(caught(function () { F.renderRecord({ a: undefined }); })).toBeInstanceOf(TypeError);
    });
  });
})();
