/**
 * Pure helpers of the recovery profile driver (difficulty v3, MS05r1: `node tests/difficulty-recovery.js`).
 * Exposed as SG.fixtures.recoveryProfile; test tooling, not part of any application script list. They know
 * no file system, git, hash function or process: the Node tool passes the clock (and the hash) in, and
 * writes the record. A diagnostic run is not a performance gate and not an acceptance run: it measures
 * where one fixed request spends its time.
 *
 *  - parseArgs(argv)            { mode, caseId, shallowCap, json } of the command line; a bad one throws an
 *                               Error whose `code` is 'usage' (exit code 2)
 *  - prepare(args)              the fixed request of the case, its profile or diagnostic configuration and
 *                               the normalised configuration; throws 'usage' errors before any generation
 *  - createRecorder, install    the transparent observation of one pipeline run (see below)
 *  - summarize(segments)        the time and the full ratings of the ordinary samples, of the local
 *                               continuation and of everything else
 *  - validate(result, level, budget)   the independent checks of the returned puzzle
 *  - profile(prepared, env)     one observed generation and its validation: { run, result, error }
 *  - recordOf(prepared, identity, run), renderRecord(record)   the record and its text (UTF-8, CRLF)
 *
 * The three fixed requests are G13 (the golden request through SG.store.toConfig) and the seed-3 Nightmare
 * requests of mega12 and mega16. The profile keeps every setting of the request except `maxAttempts: 1`.
 *
 * Observation. The pipeline hands its stage runner to `SG.digger.generateSteps`; `install` wraps that
 * exported function, the exported `SG.difficulty.rate` and `SG.digger.getStrategy` for the length of one
 * run, and `restore()` puts the exact originals back (in a `finally`). The wrappers delegate with the
 * arguments they got and return what they got: the stage delegate times each original stage call and reads
 * its arguments, the `generateSteps` wrapper copies the `work` of the returned puzzle (the pipeline drops
 * it), the strategy wrapper keeps the `caps` object of the attempt to copy its counters, and the rate
 * wrapper counts calls. No wrapper draws a random number, solves, rates or decides anything, so the puzzle
 * never depends on the observation. The registry refuses to replace the built-in 'cells' strategy
 * (`unregisterStrategy('cells')` is false and `registerStrategy` refuses a duplicate), so the strategy
 * wrapper is handed out by the `getStrategy` wrapper, which the pipeline calls once in its configure step.
 *
 * Stage classification, from the stage arguments and never from a strategy label. Within one attempt a dig
 * stage with the next sample number starts an ordinary sample; the one extra dig stage with the same last
 * sample number starts the local continuation; the rate and tune stages that follow belong to the same
 * triplet; the tune stage with `finalize: true`, `fullGrid` and `extraStructure` are 'other'. Anything else
 * (a second continuation, a sample number that skips or goes back, a stage that does not belong to its
 * triplet, overlapping stages, work that does not add up) is an instrumentation problem, never a
 * fabricated split.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  var SCHEMA = 1;
  var BUDGET_MS = 500000;
  var MODES = ['profile', 'diagnostic'];
  var CAP_SETTINGS = ['64', '128', '256', 'none'];
  var CASE_IDS = ['G13', 'mega12-nightmare', 'mega16-nightmare'];
  var FLAGS = ['mode', 'case', 'shallow-cap', 'json'];
  var ALLOWANCE = 'SHALLOW_SEARCH_RATINGS';
  var MAX_PROBLEMS = 20;
  var CASES = {
    G13: { golden: 'G13' },
    'mega12-nightmare': { request: { variantId: 'mega12', difficulty: 'nightmare', seed: 3, trace: 'off' } },
    'mega16-nightmare': { request: { variantId: 'mega16', difficulty: 'nightmare', seed: 3, trace: 'off' } }
  };

  var USAGE = [
    'Usage: node tests/difficulty-recovery.js --mode=profile|diagnostic --case=<case> [--shallow-cap=<cap>]',
    '                                         --json=<project-relative file>',
    '',
    '  --mode=profile      one attempt (maxAttempts 1) of the fixed request; --shallow-cap absent or none',
    '  --mode=diagnostic   the normal attempts of the request; needs --shallow-cap and the runtime allowance',
    '                      setting SG.digger.SHALLOW_SEARCH_RATINGS (set for the run and put back afterwards; a',
    '                      source without it is refused before anything is generated)',
    '  --case=<case>       ' + CASE_IDS.join(' | '),
    '  --shallow-cap=<cap> 64 | 128 | 256 | none (none: no allowance)',
    '  --json=<file>       the record (a new .json file inside the repository; an existing one is refused)',
    '',
    'One process runs exactly one case; the engine and the validation share one 500000 ms budget.',
    'Exit code: 0 a record was written (read its outcome), 1 no trustworthy complete record, 2 invalid use.'
  ].join('\n');

  function has(object, name) {
    return Object.prototype.hasOwnProperty.call(object, name);
  }

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isCount(n) {
    return typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n >= 1;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function round3(x) {
    return Math.round(x * 1000) / 1000;
  }

  function usageError(message) {
    var err = new Error(message);
    err.code = 'usage';
    return err;
  }

  function errorOf(err) {
    if (err && typeof err.code === 'string') return { code: err.code, message: String(err.message) };
    return { code: 'error', message: String(err && err.message !== undefined ? err.message : err) };
  }

  // The counters of the caps of an attempt; when the engine keeps them (difficulty v3, MS05r3), also a copy of
  // the records of its local searches, so the snapshot of an attempt that fails carries the richer work shape.
  function copyCaps(caps) {
    var copy = {
      ratings: caps.ratings, proposals: caps.proposals, maxRatings: caps.maxRatings,
      maxProposals: caps.maxProposals
    };
    if (Array.isArray(caps.localSearches)) {
      copy.localSearches = caps.localSearches.map(function (entry) { return Object.assign({}, entry); });
    }
    return copy;
  }

  // ---------------------------------------------------------------------------------------------
  // Command line and the fixed requests
  // ---------------------------------------------------------------------------------------------

  /** { mode, caseId, shallowCap (null when absent), json } of an argument list; throws a 'usage' error. */
  function parseArgs(argv) {
    var given = {};
    (argv || []).forEach(function (arg) {
      var m = /^--([a-z][a-z-]*)=(.*)$/.exec(String(arg));
      if (!m || FLAGS.indexOf(m[1]) === -1) throw usageError('unknown argument ' + arg);
      if (m[2] === '') throw usageError('--' + m[1] + ' needs a value');
      if (has(given, m[1])) throw usageError('--' + m[1] + ' is given twice');
      given[m[1]] = m[2];
    });
    if (!has(given, 'mode')) throw usageError('--mode=profile|diagnostic is required');
    if (MODES.indexOf(given.mode) === -1) {
      throw usageError('--mode=' + given.mode + ' is not one of ' + MODES.join(', '));
    }
    if (!has(given, 'case')) throw usageError('--case=<case> is required');
    if (CASE_IDS.indexOf(given['case']) === -1) {
      throw usageError('--case=' + given['case'] + ' is not one of ' + CASE_IDS.join(', '));
    }
    var cap = has(given, 'shallow-cap') ? given['shallow-cap'] : null;
    if (given.mode === 'profile' && cap !== null && cap !== 'none') {
      throw usageError('profile mode permits only an absent --shallow-cap or --shallow-cap=none');
    }
    if (given.mode === 'diagnostic' && CAP_SETTINGS.indexOf(cap) === -1) {
      throw usageError('diagnostic mode needs --shallow-cap=' + CAP_SETTINGS.join('|'));
    }
    if (!has(given, 'json')) throw usageError('--json=<project-relative file> is required');
    return { mode: given.mode, caseId: given['case'], shallowCap: cap, json: given.json };
  }

  /** The fixed request of a case: { id, request (as the fixture or the test states it), config }. */
  function caseOf(caseId) {
    if (!has(CASES, caseId)) throw usageError('--case=' + caseId + ' is not one of ' + CASE_IDS.join(', '));
    var spec = CASES[caseId];
    if (spec.golden === undefined) {
      return { id: caseId, request: clone(spec.request), config: clone(spec.request) };
    }
    var goldens = SG.fixtures.replayGoldens || [];
    var golden = goldens.filter(function (g) { return g.id === spec.golden; })[0];
    if (!golden) throw usageError('SG.fixtures.replayGoldens has no ' + spec.golden);
    var request = clone(golden.request);
    return { id: caseId, request: request, config: SG.store.toConfig(request) };
  }

  /** Does this source have the runtime allowance API of the shallow search (MS05r3)? */
  function hasAllowance(digger) {
    return !!digger && ALLOWANCE in digger;
  }

  /**
   * The run of a parsed command: the request, the configuration to run (profile: `maxAttempts: 1`, nothing
   * else changed; diagnostic: the request as it is) and its normalised form, whose `maxAttempts` is the one
   * that counts. Throws a 'usage' error, before anything is generated, for a diagnostic mode on a source
   * without the allowance API and for a configuration that does not normalise or has the wrong attempts.
   */
  function prepare(args) {
    var base = caseOf(args.caseId);
    var diagnostic = args.mode === 'diagnostic';
    if (diagnostic && !hasAllowance(SG.digger)) {
      throw usageError('diagnostic mode needs SG.digger.' + ALLOWANCE + ', the runtime allowance API of ' +
        'MS05r3, which this source does not have');
    }
    var config = clone(base.config);
    if (!diagnostic) config.maxAttempts = 1;
    var normalized;
    try {
      normalized = SG.pipeline.normalizeConfig(config);
    } catch (err) {
      throw usageError('the request of ' + args.caseId + ' does not normalise: ' + errorOf(err).code);
    }
    if (!diagnostic && normalized.maxAttempts !== 1) {
      throw usageError('the profile of ' + args.caseId + ' normalises to maxAttempts ' +
        normalized.maxAttempts);
    }
    return {
      caseId: args.caseId, mode: args.mode, capSetting: args.shallowCap, baseRequest: base.request,
      config: config, normalizedConfig: normalized
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Observation
  // ---------------------------------------------------------------------------------------------

  /**
   * The state of the observation of one run. `options.clock()` returns milliseconds. It records one segment
   * per stage call, the counters of the attempts and the problems it met; it never throws for a problem.
   */
  function createRecorder(options) {
    var clock = options.clock;
    var segments = [];
    var problems = [];
    var extraProblems = 0;
    var open = [];
    var triplets = [];
    var attempts = [];
    var rateCalls = 0;
    var generated = 0;
    var attempt = 0;
    var lastSample = 0;
    var locals = 0;
    var triplet = null;
    var caps = null;
    var returned = null;
    var timings = null;

    function problem(text) {
      if (problems.length < MAX_PROBLEMS) problems.push(text);
      else extraProblems++;
    }

    function snap() {
      if (caps !== null && attempts[attempt - 1]) attempts[attempt - 1].latest = copyCaps(caps);
    }

    function classify(stepId, a) {
      var kind = 'other';
      var sample = isCount(a.sample) ? a.sample : null;
      var own = null;
      if (stepId === 'fullGrid') {
        if (triplet !== null) {
          problem('attempt ' + attempt + ' ended inside the triplet of sample ' + triplet.sample);
        }
        if (a.attempt !== attempt + 1) {
          problem('fullGrid of attempt ' + a.attempt + ' does not follow attempt ' + attempt);
        }
        attempt = attempt + 1;
        attempts[attempt - 1] = { attempt: attempt, latest: null };
        lastSample = 0;
        locals = 0;
        triplet = null;
        caps = null;
        sample = null;
      } else if (stepId === 'extraStructure') {
        if (a.attempt !== attempt) {
          problem('extraStructure of attempt ' + a.attempt + ' runs in attempt ' + attempt);
        }
        sample = null;
      } else if (stepId === 'dig') {
        if (a.attempt !== attempt) problem('a dig of attempt ' + a.attempt + ' runs in attempt ' + attempt);
        if (triplet !== null) {
          problem('a dig starts inside the unfinished triplet of sample ' + triplet.sample);
        }
        if (sample === null) {
          problem('a dig stage of attempt ' + attempt + ' has no sample number');
        } else if (sample === lastSample + 1) {
          kind = 'sample';
          lastSample = sample;
        } else if (sample === lastSample) {
          locals++;
          if (locals > 1) problem('attempt ' + attempt + ' repeats its last sample more than once');
          else kind = 'local';
        } else {
          problem('sample ' + sample + ' follows sample ' + lastSample + ' in attempt ' + attempt);
        }
        triplet = { kind: kind, attempt: a.attempt, sample: sample, next: 'rate' };
      } else if (stepId === 'rate' || (stepId === 'tune' && a.finalize !== true)) {
        if (triplet !== null && triplet.next === stepId && triplet.attempt === a.attempt &&
            triplet.sample === a.sample) {
          kind = triplet.kind;
          triplet.next = stepId === 'rate' ? 'tune' : 'done';
          own = stepId === 'tune' ? triplet : null;
        } else {
          problem('the ' + stepId + ' stage of sample ' + a.sample + ' of attempt ' + a.attempt +
            ' does not follow its dig stage');
        }
      } else if (stepId === 'tune') {
        if (triplet !== null) problem('the finalize tune starts inside the unfinished triplet of sample ' +
          triplet.sample);
        sample = null;
      } else {
        problem('the unknown stage ' + String(stepId));
      }
      return { kind: kind, sample: sample, closes: own };
    }

    function begin(stepId, args) {
      var a = isObject(args) ? args : {};
      if (open.length > 0) {
        problem('the ' + stepId + ' stage starts inside the ' + open[open.length - 1].seg.stepId + ' stage');
      }
      var found = classify(stepId, a);
      snap();
      var seg = {
        seq: segments.length,
        attempt: isCount(a.attempt) ? a.attempt : (attempt >= 1 ? attempt : null),
        sample: found.sample,
        kind: found.kind,
        stepId: String(stepId),
        ms: null,
        complete: false,
        ratings: null,
        proposals: null,
        rateCalls: null,
        error: null
      };
      var entry = {
        seg: seg, t0: clock(), rate0: rateCalls, caps0: caps !== null ? copyCaps(caps) : null,
        closes: found.closes
      };
      segments.push(seg);
      open.push(entry);
      return entry;
    }

    function end(entry, ok, failure) {
      var seg = entry.seg;
      seg.ms = clock() - entry.t0;
      seg.complete = ok === true;
      seg.rateCalls = rateCalls - entry.rate0;
      if (caps !== null) {
        snap();
        if (entry.caps0 !== null) {
          seg.ratings = caps.ratings - entry.caps0.ratings;
          seg.proposals = caps.proposals - entry.caps0.proposals;
        }
      }
      if (failure) seg.error = errorOf(failure);
      var at = open.lastIndexOf(entry);
      if (at !== -1) open.splice(at, 1);
      if (ok === true && entry.closes !== null && triplet === entry.closes) {
        triplets.push({ attempt: triplet.attempt, sample: triplet.sample, kind: triplet.kind });
        triplet = null;
      }
    }

    /** The stage delegate of a stepper stage: the same stage for the digger, timed and read from outside. */
    function wrapStage(original) {
      var observed = function* observedStage(stepId, args, body) {
        var entry = begin(stepId, args);
        var ok = false;
        var failure = null;
        try {
          var value = yield* original(stepId, args, body);
          ok = true;
          return value;
        } catch (err) {
          failure = err;
          throw err;
        } finally {
          end(entry, ok, failure);
        }
      };
      observed.isStepStage = true;
      observed.timings = original.timings;
      Object.defineProperty(observed, 'current', {
        enumerable: true,
        get: function () { return original.current; },
        set: function (value) { original.current = value; }
      });
      return observed;
    }

    /** The attempt's counters object, as the dig strategy receives it (`options.caps`). */
    function noteCaps(given) {
      if (!isObject(given)) {
        problem('a dig strategy received no caps');
        return;
      }
      if (caps !== null && caps !== given) problem('the caps object changed inside attempt ' + attempt);
      caps = given;
      snap();
      var top = open[open.length - 1];
      if (top && top.caps0 === null) top.caps0 = copyCaps(caps);
    }

    function enter(stage) {
      generated++;
      if (generated > 1) problem('generateSteps ran ' + generated + ' times in one observation');
      if (stage && stage.timings) timings = stage.timings;
    }

    function leave() {
      snap();
    }

    function takeReturned(puzzle) {
      if (!isObject(puzzle)) {
        problem('generateSteps returned no puzzle');
        return;
      }
      returned = {
        attempts: puzzle.attempts,
        samples: puzzle.samples,
        exact: puzzle.exact === true,
        clues: puzzle.clues,
        warnings: Array.isArray(puzzle.warnings) ? puzzle.warnings.slice() : [],
        work: Array.isArray(puzzle.work) ? clone(puzzle.work) : null
      };
      if (returned.work === null) problem('the returned puzzle has no work field');
    }

    function countRate() {
      rateCalls++;
    }

    /** Ends the observation: the segments, the summaries, the work and every problem found. */
    function finish(outcome) {
      var failed = !!outcome && outcome.failed === true;
      open.slice().forEach(function (entry) { end(entry, false, null); });
      var rows = segments.map(function (seg) {
        return Object.assign({}, seg, { ms: seg.ms === null ? null : round3(seg.ms) });
      });
      var seen = problems.slice();
      var sumCalls = 0;
      segments.forEach(function (seg) {
        sumCalls += seg.rateCalls === null ? 0 : seg.rateCalls;
        if (seg.ratings !== null && seg.ratings !== seg.rateCalls) {
          seen.push('the ' + seg.stepId + ' stage #' + seg.seq + ' counted ' + seg.ratings +
            ' full ratings but made ' + seg.rateCalls + ' rate calls');
        }
        if (!failed && !seg.complete) {
          seen.push('the ' + seg.stepId + ' stage #' + seg.seq + ' did not complete');
        }
      });
      if (sumCalls !== rateCalls) {
        seen.push(rateCalls - sumCalls + ' of the ' + rateCalls + ' rate calls happened outside every stage');
      }
      if (!failed && triplet !== null) {
        seen.push('the triplet of sample ' + triplet.sample + ' did not finish');
      }

      var work = null;
      var reason;
      if (!failed && returned !== null && returned.work !== null) {
        var sumRatings = 0;
        if (returned.work.length !== attempts.length) {
          seen.push('the puzzle reports ' + returned.work.length + ' work records for ' + attempts.length +
            ' attempts');
        }
        work = returned.work.map(function (w, i) {
          var latest = attempts[i] ? attempts[i].latest : null;
          sumRatings += w.ratings;
          ['ratings', 'proposals', 'maxRatings', 'maxProposals'].forEach(function (name) {
            if (latest === null || latest[name] !== w[name]) {
              seen.push('attempt ' + (i + 1) + ' reports ' + name + ' ' + w[name] + ' but the snapshot has ' +
                (latest === null ? 'nothing' : latest[name]));
            }
          });
          return Object.assign({ attempt: i + 1 }, w, { source: 'returned', partial: false });
        });
        if (sumRatings !== rateCalls) {
          seen.push('the work records count ' + sumRatings + ' full ratings but ' + rateCalls +
            ' rate calls were made');
        }
        if (returned.attempts !== attempts.length) {
          seen.push('the puzzle reports ' + returned.attempts + ' attempts, ' + attempts.length +
            ' were observed');
        }
        var sampleTriplets = triplets.filter(function (t) { return t.kind === 'sample'; }).length;
        if (returned.samples !== sampleTriplets) {
          seen.push('the puzzle reports ' + returned.samples + ' samples, ' + sampleTriplets +
            ' were observed');
        }
        reason = null;
      } else {
        work = attempts.map(function (a) {
          return Object.assign({ attempt: a.attempt }, a.latest !== null ? a.latest : {
            ratings: null, proposals: null, maxRatings: null, maxProposals: null
          }, { source: a.latest !== null ? 'snapshot' : 'unavailable', partial: true });
        });
        reason = failed
          ? (attempts.length === 0 ? 'generation failed before the first attempt started'
            : 'generation failed: the counters are the last snapshots before the error')
          : 'the returned puzzle has no work field';
      }
      if (extraProblems > 0) seen.push(extraProblems + ' more problems were not listed');

      var perAttempt = attempts.map(function (a) {
        var own = segments.filter(function (seg) { return seg.attempt === a.attempt; });
        var split = summarize(own);
        return {
          attempt: a.attempt,
          samples: triplets.filter(function (t) {
            return t.attempt === a.attempt && t.kind === 'sample';
          }).length,
          localRan: own.some(function (seg) { return seg.kind === 'local'; }),
          sampleMs: split.sampleMs, localMs: split.localMs, otherMs: split.otherMs,
          sampleRatings: split.sampleRatings, localStageRatings: split.localStageRatings,
          otherRatings: split.otherRatings, localProposals: split.localProposals
        };
      });
      var sums = {};
      segments.forEach(function (seg) { sums[seg.stepId] = (sums[seg.stepId] || 0) + (seg.ms || 0); });
      return {
        segments: rows,
        summary: Object.assign(summarize(segments), {
          attemptsObserved: attempts.length,
          sampleTriplets: triplets.filter(function (t) { return t.kind === 'sample'; }).length,
          localTriplets: triplets.filter(function (t) { return t.kind === 'local'; }).length,
          rateCalls: rateCalls
        }),
        attemptSummaries: perAttempt,
        work: work,
        workUnavailableReason: reason,
        returned: returned,
        timings: timings === null ? null : Object.keys(timings).reduce(function (out, id) {
          out[id] = round3(timings[id]);
          return out;
        }, {}),
        observedMs: Object.keys(sums).reduce(function (out, id) {
          out[id] = round3(sums[id]);
          return out;
        }, {}),
        rateCalls: rateCalls,
        problems: seen
      };
    }

    return {
      wrapStage: wrapStage, noteCaps: noteCaps, enter: enter, leave: leave, takeReturned: takeReturned,
      countRate: countRate, finish: finish
    };
  }

  /**
   * Wraps `targets.digger.generateSteps`, `targets.digger.getStrategy` and `targets.difficulty.rate` for the
   * recorder. Returns { restore }: it puts each original back, unless something else replaced the wrapper in
   * the meantime (then it leaves that alone and says so) and returns the list of such notes.
   */
  function install(recorder, targets) {
    var digger = targets.digger;
    var difficulty = targets.difficulty;
    var saved = {
      generateSteps: digger.generateSteps, getStrategy: digger.getStrategy, rate: difficulty.rate
    };
    var cells = { original: null, wrapper: null };

    function observedStrategy(original) {
      return function observedCells(model, solution, level, rng, options) {
        recorder.noteCaps(options ? options.caps : null);
        return original.apply(this, arguments);
      };
    }

    var patched = {
      generateSteps: function* observedGenerateSteps(model, level, rng, options) {
        var given = options ? options.stage : null;
        var passed = options;
        if (given && given.isStepStage === true) {
          passed = Object.assign({}, options, { stage: recorder.wrapStage(given) });
        }
        recorder.enter(given);
        var rest = Array.prototype.slice.call(arguments, 4);
        var puzzle;
        try {
          puzzle = yield* saved.generateSteps.apply(digger, [model, level, rng, passed].concat(rest));
        } finally {
          recorder.leave();
        }
        recorder.takeReturned(puzzle);
        return puzzle;
      },
      getStrategy: function observedGetStrategy(id) {
        var strategy = saved.getStrategy.apply(digger, arguments);
        if (id !== 'cells') return strategy;
        if (cells.original !== strategy) {
          cells.original = strategy;
          cells.wrapper = observedStrategy(strategy);
        }
        return cells.wrapper;
      },
      rate: function observedRate() {
        recorder.countRate();
        return saved.rate.apply(this, arguments);
      }
    };
    digger.generateSteps = patched.generateSteps;
    digger.getStrategy = patched.getStrategy;
    difficulty.rate = patched.rate;
    var done = false;

    return {
      restore: function () {
        var notes = [];
        if (done) return notes;
        done = true;
        [['generateSteps', digger], ['getStrategy', digger], ['rate', difficulty]].forEach(function (pair) {
          var name = pair[0];
          var owner = pair[1];
          if (owner[name] === patched[name]) owner[name] = saved[name];
          else notes.push(name + ' was replaced during the run and is left as it is');
        });
        return notes;
      }
    };
  }

  /**
   * The time and the full ratings of a list of segments by kind. Ratings are counted by the independent rate
   * wrapper (`rateCalls`); `localProposals` is null when a local stage has no counter snapshot.
   */
  function summarize(segments) {
    var out = {
      sampleMs: 0, localMs: 0, otherMs: 0, sampleRatings: 0, localStageRatings: 0, otherRatings: 0,
      sampleStages: 0, localStages: 0, otherStages: 0, localProposals: 0, incompleteStages: 0
    };
    segments.forEach(function (seg) {
      var ms = seg.ms === null ? 0 : seg.ms;
      var calls = seg.rateCalls === null ? 0 : seg.rateCalls;
      if (seg.complete !== true) out.incompleteStages++;
      if (seg.kind === 'sample') {
        out.sampleMs += ms;
        out.sampleRatings += calls;
        out.sampleStages++;
      } else if (seg.kind === 'local') {
        out.localMs += ms;
        out.localStageRatings += calls;
        out.localStages++;
        if (out.localProposals !== null) out.localProposals = seg.proposals === null ? null
          : out.localProposals + seg.proposals;
      } else {
        out.otherMs += ms;
        out.otherRatings += calls;
        out.otherStages++;
      }
    });
    ['sampleMs', 'localMs', 'otherMs'].forEach(function (name) { out[name] = round3(out[name]); });
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // Validation, one observed run, the record
  // ---------------------------------------------------------------------------------------------

  /**
   * The independent checks of a returned puzzle, with the budget of the generation (what is left of it):
   * the givens belong to the solution, the solution satisfies the model, the givens have exactly one
   * solution, and the complete canonical rating of the returned model agrees with the returned one and gives
   * the requiredness of the requested level. A check that cannot finish throws the budget error.
   */
  function validate(result, level, budget) {
    var model = result.model;
    var givens = result.givens;
    var solution = result.solution;
    var consistent = givens.length === solution.length;
    for (var c = 0; consistent && c < givens.length; c++) {
      if (givens[c] !== 0 && givens[c] !== solution[c]) consistent = false;
    }
    var checks = {
      givensMatchSolution: consistent, isSolution: SG.model.isSolution(model, solution) === true
    };
    checks.unique = SG.dfs.countSolutions(model, givens, 2, budget) === 1;
    var rating = SG.difficulty.rate(model, givens, { budget: budget });
    var verdict = SG.difficulty.requiredOf(rating, level, model);
    checks.ratingAgrees = rating.solved === result.rating.solved && rating.score === result.rating.score &&
      rating.level === result.rating.level;
    var failed = Object.keys(checks).filter(function (name) { return checks[name] !== true; });
    return {
      ok: failed.length === 0,
      failed: failed,
      checks: checks,
      required: verdict === null ? null : verdict.required,
      vacuous: verdict === null ? null : verdict.vacuous,
      rated: { level: rating.level, score: rating.score, hardestTechnique: rating.hardestTechnique }
    };
  }

  /**
   * One observed generation of a prepared request, then its validation, both inside one budget (`env.budget`,
   * or a new one of `env.budgetMs`, default 500000 ms). `env.clock()` is in milliseconds, `env.sha256(text)`
   * is optional, `env.targets` ({ digger, difficulty }) defaults to the engine. Never throws for a failed
   * generation or validation. Returns { run, result, error }: `run` is the data of the record, `result` the
   * PuzzleResult (live objects, for tests; null on an error), `error` the generation error.
   */
  function profile(prepared, env) {
    var clock = env.clock;
    var targets = env.targets || { digger: SG.digger, difficulty: SG.difficulty };
    var budgetMs = env.budgetMs !== undefined ? env.budgetMs : BUDGET_MS;
    var budget = env.budget || SG.budget.create({ ms: budgetMs });
    var recorder = createRecorder({ clock: clock });
    var level = prepared.normalizedConfig.difficulty;
    var allowance = null;
    if (prepared.mode === 'diagnostic') {
      allowance = { before: targets.digger[ALLOWANCE] };
      targets.digger[ALLOWANCE] = prepared.capSetting === 'none' ? Infinity : Number(prepared.capSetting);
    }
    var installed = install(recorder, targets);
    var result = null;
    var failure = null;
    var generationMs;
    var restoreNotes = [];
    var t0 = clock();
    try {
      result = SG.pipeline.run(prepared.config, null, budget);
    } catch (err) {
      failure = err;
    } finally {
      generationMs = clock() - t0;
      restoreNotes = installed.restore();
      if (allowance !== null) targets.digger[ALLOWANCE] = allowance.before;
    }

    var validation = null;
    var validationFailure = null;
    var validationMs = null;
    if (failure === null) {
      var t1 = clock();
      try {
        validation = validate(result, level, budget);
      } catch (err) {
        validationFailure = err;
      }
      validationMs = clock() - t1;
    }

    var seen = recorder.finish({ failed: failure !== null });
    var problems = seen.problems.concat(restoreNotes);
    var run = {
      generationMs: generationMs,
      validationMs: validationMs,
      diagnosticBudgetMs: budgetMs,
      seen: seen,
      validation: validation,
      generationError: failure === null ? null : errorOf(failure),
      validationError: validationFailure === null ? null : errorOf(validationFailure),
      problems: problems,
      restoreNotes: restoreNotes,
      puzzleHash: null
    };
    if (result !== null && env.sha256) {
      run.puzzleHash = env.sha256([result.model.variantId, Array.prototype.join.call(result.givens, ','),
        Array.prototype.join.call(result.solution, ',')].join('|'));
    }
    return { run: run, result: result, error: failure };
  }

  /**
   * The record of a run in its fixed field order. `identity` has sourceHash, toolHash, commit, dirty, node,
   * machine, argv and startedAt.
   */
  function recordOf(prepared, identity, run) {
    var seen = run.seen;
    var validation = run.validation;
    var returned = seen.returned;
    var good = run.generationError === null;
    var outcome = 'ok';
    var error = null;
    var underlying = null;
    if (run.generationError !== null) {
      outcome = 'generation-error';
      error = run.generationError;
    } else if (run.validationError !== null) {
      outcome = 'validation-error';
      error = run.validationError;
    } else if (validation !== null && !validation.ok) {
      outcome = 'validation-error';
      error = { code: 'validation.failed', message: 'failed checks: ' + validation.failed.join(', ') };
    }
    if (run.problems.length > 0) {
      underlying = { outcome: outcome, error: error };
      outcome = 'instrumentation-error';
      error = { code: 'instrumentation', message: run.problems[0] };
    }
    var rated = validation !== null ? validation.rated : null;
    var segmentMs = seen.summary.sampleMs + seen.summary.localMs + seen.summary.otherMs;
    var residual = {};
    ['fullGrid', 'extraStructure', 'dig', 'rate', 'tune'].forEach(function (id) {
      residual[id] = seen.timings === null || seen.timings[id] === undefined ? null
        : round3(seen.timings[id] - (seen.observedMs[id] || 0));
    });
    var summary = Object.assign({}, seen.summary, {
      segmentMs: round3(segmentMs),
      outsideSegmentsMs: round3(run.generationMs - segmentMs),
      pipelineTimingsMs: seen.timings,
      stageTimingResidualMs: residual
    });
    return {
      schema: SCHEMA,
      complete: outcome !== 'instrumentation-error',
      mode: prepared.mode,
      caseId: prepared.caseId,
      baseRequest: prepared.baseRequest,
      normalizedConfig: prepared.normalizedConfig,
      effectiveMaxAttempts: prepared.normalizedConfig.maxAttempts,
      capSetting: prepared.capSetting,
      sourceHash: identity.sourceHash,
      toolHash: identity.toolHash,
      commit: identity.commit,
      dirty: identity.dirty,
      node: identity.node,
      machine: identity.machine,
      jobs: 1,
      argv: identity.argv,
      startedAt: identity.startedAt,
      diagnosticBudgetMs: run.diagnosticBudgetMs,
      generationMs: round3(run.generationMs),
      validationMs: run.validationMs === null ? null : round3(run.validationMs),
      outcome: outcome,
      error: error,
      underlying: underlying,
      attempts: good && returned ? returned.attempts : null,
      samples: good && returned ? returned.samples : null,
      exact: good && returned ? returned.exact : null,
      required: validation !== null ? validation.required : null,
      score: rated !== null ? rated.score : null,
      achieved: rated !== null ? rated.level : null,
      hardestTechnique: rated !== null ? rated.hardestTechnique : null,
      clues: good && returned ? returned.clues : null,
      warnings: good && returned ? returned.warnings : null,
      puzzleHash: run.puzzleHash,
      checks: validation !== null ? validation.checks : null,
      work: seen.work,
      workUnavailableReason: seen.workUnavailableReason,
      attemptSummaries: seen.attemptSummaries,
      segments: seen.segments,
      summary: summary,
      instrumentationProblems: run.problems
    };
  }

  function checkPlain(value, where) {
    if (value === undefined || typeof value === 'function') throw new TypeError(where + ' is not plain data');
    if (typeof value === 'number' && !isFinite(value)) throw new TypeError(where + ' is not a finite number');
    if (Array.isArray(value)) {
      value.forEach(function (item, i) { checkPlain(item, where + '[' + i + ']'); });
    } else if (isObject(value)) {
      Object.keys(value).forEach(function (key) { checkPlain(value[key], where + '.' + key); });
    }
  }

  /** The text of a record: one line per field, one line per element of an array of objects, CRLF. */
  function renderRecord(record) {
    checkPlain(record, 'record');
    var names = Object.keys(record);
    var lines = ['{'];
    names.forEach(function (name, i) {
      var value = record[name];
      var comma = i < names.length - 1 ? ',' : '';
      if (Array.isArray(value) && value.length > 0 && value.every(isObject)) {
        lines.push('  ' + JSON.stringify(name) + ': [');
        value.forEach(function (item, j) {
          lines.push('    ' + JSON.stringify(item) + (j < value.length - 1 ? ',' : ''));
        });
        lines.push('  ]' + comma);
      } else {
        lines.push('  ' + JSON.stringify(name) + ': ' + JSON.stringify(value) + comma);
      }
    });
    lines.push('}');
    return lines.join('\r\n') + '\r\n';
  }

  /** The exit code of a written record: 0 for a complete one, 1 when its instrumentation is not trusted. */
  function exitCodeOf(record) {
    return record.complete === true && record.outcome !== 'instrumentation-error' ? 0 : 1;
  }

  SG.fixtures.recoveryProfile = {
    SCHEMA: SCHEMA,
    BUDGET_MS: BUDGET_MS,
    CASE_IDS: CASE_IDS,
    CAP_SETTINGS: CAP_SETTINGS,
    ALLOWANCE: ALLOWANCE,
    USAGE: USAGE,
    parseArgs: parseArgs,
    caseOf: caseOf,
    prepare: prepare,
    createRecorder: createRecorder,
    install: install,
    summarize: summarize,
    validate: validate,
    profile: profile,
    recordOf: recordOf,
    renderRecord: renderRecord,
    exitCodeOf: exitCodeOf
  };
})();
