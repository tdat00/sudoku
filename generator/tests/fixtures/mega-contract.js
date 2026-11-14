/**
 * Pure helpers of the mega Nightmare deep tier (difficulty v3, MS05r5m: `node tests/mega-contract.js`).
 * Exposed as SG.fixtures.megaContract; test tooling, not part of any application script list. They know no
 * file system, git, clock, hash function or process: the Node tool passes the clock and `sha256(text)` in and
 * writes the files. The deep tier is a tool, not a discovered generation suite: its generating callbacks are
 * never run by a suite. The tier is not product qualification, and a fallback is never an exact hit.
 *
 * The frozen population (CV6-03, S-OD3 (a)): for each of mega12 and mega16 seven Nightmare requests, trace off,
 * with the default symbol set, symmetry, dig order and the default attempts of the board (4 and 2), none of
 * them with an explicit `maxAttempts`: the four invariant seeds 1 to 4 and the three independently generated
 * calls of the old CV5 test, seed 3 twice and seed 4 (ids `<board>-invariant-<seed>`, `<board>-cv5-a`,
 * `<board>-cv5-b`, `<board>-cv5-other`). Each is one record of its own and never a read of another record. The
 * relations of the old test stay: the two seed-3 calls give the same givens, solution and score, and seed 4 a
 * different solution than seed 3; one extra, not original, relation compares invariant seed 3 with them.
 *
 *  - MANIFEST, RELATIONS, BOARDS, makeManifest(boards, level), manifestHash(sha256), listText(sha256)
 *  - parseArgs(argv)                 { mode: 'list' } | { mode: 'request', id, record } |
 *                                    { mode: 'reconcile', directory, json }; a bad command line throws an Error
 *                                    whose `code` is 'usage' (exit code 2)
 *  - execute(entry, env)             one request once, then its checks: { run, result }; never throws for a failed
 *                                    generation or check. env: clock(), sha256(text), budgetMs (default 500000),
 *                                    budget, produce(request, budget)
 *  - evaluate(entry, result, budget) the independent checks of a returned puzzle (see CHECKS)
 *  - recordOf(entry, identity, run, manifestHash, result), renderRecord(record), exitCodeOf(record)
 *  - checkRecord(record, entry, ctx) the evidence problems of one record
 *  - reconcile(files, options)       the reconciliation of a directory of records, no generation
 *  - exitCodeOfReconciliation(doc), guardOf(...)
 *  - reuse(records, query, current, options)  the read-only consumer of MS05b3 (CV3)
 *
 * Verdicts are kept apart: generation (a puzzle came back, or the error code is kept), correctness (every
 * independent check, each recorded `true`, `false` or `null` when it could not be evaluated) and timing (seconds,
 * margins, never a pass or fail of an owner's guard). A request that ends in an error keeps it, and every
 * relation that needs its puzzle is `unevaluated`: a comparison is never claimed to pass without two puzzles.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  var SCHEMA = 1;
  var KIND = 'mega-nightmare-record';
  var RECONCILED_KIND = 'mega-nightmare-reconciliation';
  // The meaning of the checks below; a change of the set or of a check needs fresh records.
  var CHECKS_VERSION = 1;
  var LEVEL = 'nightmare';
  var BUDGET_MS = 500000;
  var PROCESS_LIMIT_MS = 540000;
  var APPLICATION_GUARD_MS = 120000;
  var QUALIFICATION_P95_MS = 30000;
  var GUARD_FACTOR = 1.5;
  var GUARD_STEP_MS = 5000;
  var OUTCOMES = ['ok', 'generation-error', 'check-error'];
  var WARNINGS = ['difficulty.approximate', 'difficulty.shallow'];
  var HASH = /^[0-9a-f]{64}$/;

  // Every check of a returned puzzle. The first eight need no solving; the others run inside the budget.
  var CHECKS = ['variantMatches', 'givensMatchSolution', 'validSolution', 'latin', 'clueFloor', 'bandAndGroup',
    'attemptsPolicy', 'wireRoundTrip', 'unique', 'ratingAgrees', 'exactFlag', 'approximateWarning',
    'shallowWarning', 'noOtherWarning', 'soundness'];

  var BOARDS = {
    mega12: { digits: 12, boxRows: 3, boxCols: 4, attempts: 4 },
    mega16: { digits: 16, boxRows: 4, boxCols: 4, attempts: 2 }
  };

  var USAGE = [
    'Usage: node tests/mega-contract.js --list',
    '       node tests/mega-contract.js --request=<id> --record=<new.json>',
    '       node tests/mega-contract.js --reconcile=<records directory> --json=<new.json>',
    '',
    '  --list              the fixed manifest of 14 requests and their relations; generates nothing',
    '  --request=<id>      one fixed request, once, with its checks; with --record, a new project-relative .json',
    '                      file named <id>.json (an existing file is refused)',
    '  --reconcile=<dir>   validate the records of that directory and their relations, no generation; with',
    '                      --json, a new project-relative .json file outside that directory',
    '',
    'One request per process, inside one 500000 ms budget (the process limit is 540 s).',
    'Exit code of --request: 0 a record with every check passed; 3 a record whose request ended in an error or',
    'whose checks could not finish (an availability outcome); 1 a failed check or no trustworthy record;',
    '2 an invalid command line, path or source. Exit code of --reconcile: 0 all fourteen reconcile and pass;',
    '3 sound but incomplete (an unavailable request); 1 an evidence problem, a failed check or relation.'
  ].join('\n');

  // ---------------------------------------------------------------------------------------------
  // Small utilities
  // ---------------------------------------------------------------------------------------------

  function has(object, name) {
    return Object.prototype.hasOwnProperty.call(object, name);
  }

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
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

  function canonical(value) {
    return SG.fixtures.toolRecords.canonicalJson(value);
  }

  function same(a, b) {
    try {
      return canonical(a) === canonical(b);
    } catch (err) {
      return false;
    }
  }

  function sameList(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function isHash(value) {
    return typeof value === 'string' && HASH.test(value);
  }

  function isTime(value) {
    return typeof value === 'number' && isFinite(value) && value >= 0;
  }

  function budgetFailure(err) {
    return !!err && typeof err.code === 'string' && err.code.indexOf('budget.') === 0;
  }

  /** { phase, code, message } of an error and the finite numbers and strings of its arguments (budget identity). */
  function errorOf(err, phase) {
    var out = {
      phase: phase,
      code: err && typeof err.code === 'string' ? err.code : 'error',
      message: String(err && err.message !== undefined ? err.message : err)
    };
    var args = err && err.i18nArgs;
    if (isObject(args)) {
      var kept = {};
      Object.keys(args).forEach(function (key) {
        var value = args[key];
        if (typeof value === 'string' || typeof value === 'boolean') kept[key] = value;
        else if (typeof value === 'number') kept[key] = isFinite(value) ? value : null;
      });
      out.args = kept;
    }
    return out;
  }

  function clueCount(givens) {
    var n = 0;
    for (var i = 0; i < givens.length; i++) if (givens[i] !== 0) n++;
    return n;
  }

  /** Is `values` a complete grid? Rows, columns and boxes from the box shape alone, one bit per digit. */
  function isLatin(geometry, values) {
    var D = geometry.digits;
    if (!values || values.length !== D * D) return false;
    var across = D / geometry.boxCols;
    var rows = new Int32Array(D);
    var cols = new Int32Array(D);
    var boxes = new Int32Array(D);
    for (var r = 0; r < D; r++) {
      for (var c = 0; c < D; c++) {
        var v = values[r * D + c];
        if (!(v >= 1 && v <= D)) return false;
        var bit = 1 << (v - 1);
        var box = Math.floor(r / geometry.boxRows) * across + Math.floor(c / geometry.boxCols);
        if ((rows[r] & bit) || (cols[c] & bit) || (boxes[box] & bit)) return false;
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[box] |= bit;
      }
    }
    return true;
  }

  function summarize(values) {
    if (values.length === 0) return null;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    var median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    var sum = sorted.reduce(function (total, x) { return total + x; }, 0);
    return { n: sorted.length, min: sorted[0], median: round3(median), max: sorted[sorted.length - 1],
      sum: round3(sum) };
  }

  // ---------------------------------------------------------------------------------------------
  // The manifest and its relations
  // ---------------------------------------------------------------------------------------------

  /**
   * The occurrences and relations of a population: per board four invariant seeds and the three CV5 calls.
   * `boards` is { id: { digits, boxRows, boxCols, attempts } }, `level` the one requested level.
   */
  function makeManifest(boards, level) {
    var entries = [];
    var relations = [];
    Object.keys(boards).forEach(function (board) {
      var spec = boards[board];
      var geometry = Object.freeze({ digits: spec.digits, boxRows: spec.boxRows, boxCols: spec.boxCols });
      var invariantTest = board + ' ' + level + ': 4 puzzles are unique, valid and inside the 9.1 time budget';
      var cv5Test = board + ' ' + level + ': the same seed gives the same puzzle (CV5)';
      var add = function (role, group, seed, origin) {
        entries.push(Object.freeze({
          id: board + '-' + role, board: board, group: group, role: role, seed: seed,
          request: Object.freeze({ variantId: board, difficulty: level, seed: seed, trace: 'off' }),
          expectedAttempts: spec.attempts, geometry: geometry, origin: origin
        }));
      };
      [1, 2, 3, 4].forEach(function (seed) {
        add('invariant-' + seed, 'invariant', seed, invariantTest + ', seed ' + seed);
      });
      add('cv5-a', 'cv5', 3, cv5Test + ', first seed-3 call (a)');
      add('cv5-b', 'cv5', 3, cv5Test + ', second seed-3 call (c)');
      add('cv5-other', 'cv5', 4, cv5Test + ', seed-4 call (other)');
      relations.push(Object.freeze({
        id: board + '-cv5-same-seed', board: board, kind: 'same-seed', original: true,
        a: board + '-cv5-a', b: board + '-cv5-b', compare: ['givens', 'solution', 'score']
      }));
      relations.push(Object.freeze({
        id: board + '-cv5-other-seed', board: board, kind: 'different-seed', original: true,
        a: board + '-cv5-other', b: board + '-cv5-a', compare: ['solution']
      }));
      relations.push(Object.freeze({
        id: board + '-invariant-3-same-seed', board: board, kind: 'same-seed', original: false,
        a: board + '-invariant-3', b: board + '-cv5-a', compare: ['givens', 'solution', 'score']
      }));
    });
    return Object.freeze({ entries: Object.freeze(entries), relations: Object.freeze(relations) });
  }

  var DEFAULT = makeManifest(BOARDS, LEVEL);

  function manifestOf(options) {
    return options && options.manifest ? options.manifest : DEFAULT;
  }

  function manifestHash(sha256, manifest) {
    var m = manifest || DEFAULT;
    return sha256(canonical({
      entries: m.entries.map(function (e) {
        return { id: e.id, board: e.board, group: e.group, role: e.role, seed: e.seed, request: e.request,
          expectedAttempts: e.expectedAttempts, geometry: e.geometry };
      }),
      relations: m.relations
    }));
  }

  function entryOf(manifest, id) {
    return manifest.entries.filter(function (e) { return e.id === id; })[0];
  }

  /** The text of `--list`: every fixed request with its attempts and old origin, then the relations. */
  function listText(sha256, manifest) {
    var m = manifest || DEFAULT;
    var lines = ['mega Nightmare deep tier: ' + m.entries.length + ' requests, manifest ' +
      manifestHash(sha256, m).slice(0, 12) + '..., budget ' + BUDGET_MS + ' ms, trace off, default attempts'];
    m.entries.forEach(function (e) {
      lines.push('  ' + e.id + '  ' + e.request.variantId + ' ' + e.request.difficulty + ' seed ' + e.seed +
        '  attempts ' + e.expectedAttempts + '  (was: ' + e.origin + ')');
    });
    lines.push('relations:');
    m.relations.forEach(function (r) {
      lines.push('  ' + r.id + '  ' + r.a + ' vs ' + r.b + ': ' + (r.kind === 'same-seed'
        ? r.compare.join(', ') + ' equal' : 'the ' + r.compare.join(', ') + ' differs') +
        (r.original ? '' : '  (extra, not an original relation)'));
    });
    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------------------------
  // The command line
  // ---------------------------------------------------------------------------------------------

  /** The command of an argument list; unknown, repeated, empty or conflicting options throw a 'usage' error. */
  function parseArgs(argv, manifest) {
    var m = manifest || DEFAULT;
    var flags = ['list', 'request', 'record', 'reconcile', 'json'];
    var given = {};
    (argv || []).forEach(function (arg) {
      var parts = /^--([a-z]+)(?:=([\s\S]*))?$/.exec(String(arg));
      if (!parts || flags.indexOf(parts[1]) === -1) throw usageError('unknown argument ' + arg);
      if (parts[1] === 'list') {
        if (parts[2] !== undefined) throw usageError('--list takes no value');
      } else if (parts[2] === undefined || parts[2] === '') {
        throw usageError('--' + parts[1] + ' needs a value');
      }
      if (has(given, parts[1])) throw usageError('--' + parts[1] + ' is given twice');
      given[parts[1]] = parts[2] === undefined ? true : parts[2];
    });
    var names = Object.keys(given);
    if (names.length === 0) throw usageError('one of --list, --request or --reconcile is required');
    if (has(given, 'list')) {
      if (names.length > 1) throw usageError('--list cannot be combined with another option');
      return { mode: 'list' };
    }
    if (has(given, 'request') || has(given, 'record')) {
      if (has(given, 'reconcile') || has(given, 'json')) {
        throw usageError('--request/--record and --reconcile/--json are different commands: give one of them');
      }
      if (!has(given, 'request')) throw usageError('--record needs --request=<id>');
      if (!has(given, 'record')) throw usageError('--request needs --record=<new.json>');
      if (!entryOf(m, given.request)) {
        throw usageError('--request=' + given.request + ' is not one of ' +
          m.entries.map(function (e) { return e.id; }).join(', '));
      }
      return { mode: 'request', id: given.request, record: given.record };
    }
    if (!has(given, 'reconcile')) throw usageError('--json needs --reconcile=<records directory>');
    if (!has(given, 'json')) throw usageError('--reconcile needs --json=<new.json>');
    return { mode: 'reconcile', directory: given.reconcile, json: given.json };
  }

  // ---------------------------------------------------------------------------------------------
  // One request and its checks
  // ---------------------------------------------------------------------------------------------

  /** Only the two difficulty warnings, each once: an unsound-technique warning or an unknown key is not allowed. */
  function onlyKnown(warnings) {
    return warnings.every(function (w, i) { return WARNINGS.indexOf(w) !== -1 && warnings.indexOf(w) === i; });
  }

  /** What a returned puzzle must say about itself, derived from an independent complete canonical rating. */
  function expectation(level, rated, required) {
    var complete = !!rated && rated.solved === true && rated.level === level;
    var exact = complete && required === true;
    return { complete: complete, exact: exact, approximate: !exact, shallow: !exact && complete };
  }

  function allowanceNow() {
    var value = SG.digger && SG.digger.SHALLOW_SEARCH_RATINGS;
    if (typeof value !== 'number' || isNaN(value) || value < 0) {
      throw usageError('SG.digger.SHALLOW_SEARCH_RATINGS is not a number: this source has no recovery allowance');
    }
    return value === Infinity ? null : value;
  }

  /**
   * The independent checks of a returned puzzle. The budget covers the solving ones: a budget error leaves the
   * check and every later one `null` (not evaluated) and is returned as `error`. A check that throws
   * something else is `false`, with the error in its detail. Returns { checks, details, rated, required,
   * expected, error }.
   */
  function evaluate(entry, result, budget) {
    var out = { checks: {}, details: {}, rated: null, required: null, expected: null, error: null };
    CHECKS.forEach(function (name) { out.checks[name] = null; });
    var requested = entry.request.difficulty;
    var spec;
    try {
      spec = SG.difficulty.spec(requested, result.model);
    } catch (err) {
      out.error = errorOf(err, 'check');
      return out;
    }
    var model = result.model;
    var givens = result.givens;
    var solution = result.solution;
    var warnings = Array.isArray(result.warnings) ? result.warnings : [];
    var hasWarning = function (key) { return warnings.indexOf(key) !== -1; };

    function run(name, fn) {
      if (out.error !== null) return;
      try {
        var verdict = fn();
        out.checks[name] = verdict.ok === true;
        if (verdict.detail !== undefined) out.details[name] = verdict.detail;
      } catch (err) {
        if (budgetFailure(err)) {
          out.error = errorOf(err, 'check');
        } else {
          out.checks[name] = false;
          out.details[name] = { error: errorOf(err, 'check') };
        }
      }
    }

    run('variantMatches', function () {
      return { ok: model.variantId === entry.request.variantId };
    });
    run('givensMatchSolution', function () {
      var ok = givens.length === model.cellCount && solution.length === model.cellCount;
      for (var c = 0; ok && c < givens.length; c++) if (givens[c] !== 0 && givens[c] !== solution[c]) ok = false;
      return { ok: ok };
    });
    run('validSolution', function () {
      return { ok: SG.model.isSolution(model, solution) === true };
    });
    run('latin', function () {
      return { ok: isLatin(entry.geometry, solution) };
    });
    run('clueFloor', function () {
      var clues = clueCount(givens);
      return { ok: clues >= spec.minClues, detail: { clues: clues, minClues: spec.minClues } };
    });
    run('bandAndGroup', function () {
      var rating = result.rating;
      if (rating.level !== requested) return { ok: hasWarning('difficulty.approximate') };
      var group = rating.hardestTechnique === null ? null : SG.techniques.get(rating.hardestTechnique).group;
      return {
        ok: rating.score >= spec.min && rating.score < spec.max && spec.allowedGroups.indexOf(group) !== -1,
        detail: { score: rating.score, min: spec.min, max: spec.max === Infinity ? null : spec.max, group: group }
      };
    });
    run('attemptsPolicy', function () {
      var configured = result.config ? result.config.maxAttempts : null;
      var policy = SG.digger.defaultMaxAttempts(model.cellCount);
      var attempts = result.attempts;
      var ok = configured === entry.expectedAttempts && policy === entry.expectedAttempts &&
        Number.isInteger(attempts) && attempts >= 1 && attempts <= configured &&
        (result.exact === true || attempts === configured);
      return { ok: ok, detail: { configured: configured, expected: entry.expectedAttempts, policy: policy,
        attempts: attempts } };
    });
    run('wireRoundTrip', function () {
      var back = SG.replay.fromPlainWire(clone(SG.replay.toPlainWire(result)));
      var ok = sameList(Array.from(back.givens), Array.from(givens)) &&
        sameList(Array.from(back.solution), Array.from(solution)) && back.exact === (result.exact === true) &&
        same(back.warnings, warnings) && back.seed === result.seed && back.attempts === result.attempts &&
        same(back.config, result.config) && same(back.rating, result.rating);
      return { ok: ok };
    });
    run('unique', function () {
      var solutions = SG.dfs.countSolutions(model, givens, 2, budget);
      return { ok: solutions === 1, detail: { solutions: solutions } };
    });
    run('ratingAgrees', function () {
      var rated = SG.difficulty.rate(model, givens, { budget: budget });
      var verdict = SG.difficulty.requiredOf(rated, requested, model);
      out.rated = { solved: rated.solved, level: rated.level, score: rated.score,
        hardestTechnique: rated.hardestTechnique };
      out.required = verdict === null ? null : verdict.required;
      out.expected = expectation(requested, rated, out.required);
      return {
        ok: rated.solved === result.rating.solved && rated.score === result.rating.score &&
          rated.level === result.rating.level && rated.hardestTechnique === result.rating.hardestTechnique
      };
    });
    if (out.expected !== null) {
      run('exactFlag', function () {
        return { ok: result.exact === out.expected.exact, detail: { returned: result.exact === true,
          expected: out.expected.exact } };
      });
      run('approximateWarning', function () {
        return { ok: hasWarning('difficulty.approximate') === out.expected.approximate };
      });
      run('shallowWarning', function () {
        return { ok: hasWarning('difficulty.shallow') === out.expected.shallow };
      });
      run('noOtherWarning', function () {
        return { ok: onlyKnown(warnings), detail: { warnings: warnings.slice() } };
      });
    }
    run('soundness', function () {
      var report = SG.logicalSolver.solve(model, givens, {
        allowedTechniques: spec.allowedTechniques, collectSteps: true, assumeUniqueness: false, budget: budget
      });
      var placements = 0;
      var eliminations = 0;
      var wrong = 0;
      var samples = [];
      var note = function (step, kind, pair) {
        wrong++;
        if (samples.length < 5) samples.push({ technique: step.technique, kind: kind, cell: pair[0], digit: pair[1] });
      };
      report.steps.forEach(function (step) {
        step.placements.forEach(function (p) {
          placements++;
          if (solution[p[0]] !== p[1]) note(step, 'placement', p);
        });
        step.eliminations.forEach(function (e) {
          eliminations++;
          if (solution[e[0]] === e[1]) note(step, 'elimination', e);
        });
      });
      return { ok: wrong === 0, detail: { steps: report.steps.length, placements: placements,
        eliminations: eliminations, wrong: wrong, samples: samples } };
    });
    return out;
  }

  /**
   * One request once, then its checks, both inside one budget (`env.budget`, or a new one of `env.budgetMs`,
   * default 500000 ms): the generation time and the check time are measured apart. A level that qualification
   * has hidden is offered for the length of the run only (`toolRecords.withRequestedLevel`) and the original
   * support array is put back in `finally`; the override is recorded. Never throws for a failed generation or a
   * check that cannot finish. Returns { run, result }; `run` is the data of the record.
   */
  function execute(entry, env) {
    var clock = env.clock;
    var budgetMs = env.budgetMs !== undefined ? env.budgetMs : BUDGET_MS;
    var budget = env.budget || SG.budget.create({ ms: budgetMs });
    var produce = env.produce || function (request, b) { return SG.pipeline.run(request, null, b); };
    var request = clone(entry.request);
    var run = {
      budgetMs: budgetMs, allowance: allowanceNow(), normalizedConfig: null, overridden: false,
      generationMs: 0, checkMs: null, generationError: null, evaluation: null, wire: null,
      puzzleDigest: null, wireDigest: null
    };
    var result = null;
    var scope = SG.fixtures.toolRecords.withRequestedLevel(request.variantId, request.difficulty, function () {
      try {
        run.normalizedConfig = SG.pipeline.normalizeConfig(request);
      } catch (err) {
        run.generationError = errorOf(err, 'configure');
        return;
      }
      var t0 = clock();
      try {
        result = produce(request, budget);
      } catch (err) {
        run.generationError = errorOf(err, 'generation');
      }
      run.generationMs = clock() - t0;
      if (result === null) return;
      var t1 = clock();
      run.evaluation = evaluate(entry, result, budget);
      run.checkMs = clock() - t1;
    });
    run.overridden = scope.overridden;
    if (result !== null) {
      run.wire = clone(SG.replay.toPlainWire(result));
      if (env.sha256) {
        run.puzzleDigest = digestOfWire(run.wire, env.sha256);
        run.wireDigest = env.sha256(canonical(run.wire));
      }
    }
    return { run: run, result: result };
  }

  function digestOfWire(wire, sha256) {
    return sha256([wire.model.variantId, wire.givens.join(','), wire.solution.join(',')].join('|'));
  }

  function unevaluatedChecks() {
    var all = {};
    CHECKS.forEach(function (name) { all[name] = null; });
    return all;
  }

  function verdictOfChecks(checks) {
    var failed = CHECKS.filter(function (name) { return checks[name] === false; });
    var unevaluated = CHECKS.filter(function (name) { return checks[name] === null; });
    return {
      failed: failed, unevaluated: unevaluated,
      correctness: failed.length > 0 ? 'fail' : unevaluated.length > 0 ? 'unevaluated' : 'pass'
    };
  }

  function workOf(work) {
    if (!Array.isArray(work)) return null;
    var perAttempt = work.map(function (w) { return { ratings: w.ratings, proposals: w.proposals }; });
    return {
      attempts: perAttempt.length,
      ratings: perAttempt.reduce(function (n, w) { return n + (w.ratings || 0); }, 0),
      proposals: perAttempt.reduce(function (n, w) { return n + (w.proposals || 0); }, 0),
      perAttempt: perAttempt
    };
  }

  /**
   * The record of a run in its fixed field order. `identity` has sourceHash, toolHash, commit, dirty, node,
   * machine, argv and startedAt; `hash` is the manifest hash.
   */
  function recordOf(entry, identity, run, hash, result) {
    var ev = run.evaluation;
    var outcome = 'ok';
    var error = null;
    if (run.generationError !== null) {
      outcome = 'generation-error';
      error = run.generationError;
    } else if (ev !== null && ev.error !== null) {
      outcome = 'check-error';
      error = ev.error;
    }
    var checks = ev !== null ? ev.checks : unevaluatedChecks();
    var verdict = verdictOfChecks(checks);
    var generationMs = round3(run.generationMs);
    var checkMs = run.checkMs === null ? null : round3(run.checkMs);
    var totalMs = round3(generationMs + (checkMs === null ? 0 : checkMs));
    var returned = result || null;
    var config = run.normalizedConfig;
    return {
      schema: SCHEMA,
      kind: KIND,
      id: entry.id,
      board: entry.board,
      group: entry.group,
      role: entry.role,
      request: clone(entry.request),
      manifestHash: hash,
      normalizedConfig: config,
      effectiveMaxAttempts: config === null ? null : config.maxAttempts,
      expectedAttempts: entry.expectedAttempts,
      allowance: run.allowance,
      sourceHash: identity.sourceHash,
      toolHash: identity.toolHash,
      checksVersion: CHECKS_VERSION,
      commit: identity.commit,
      dirty: identity.dirty,
      node: identity.node,
      machine: identity.machine,
      argv: identity.argv,
      startedAt: identity.startedAt,
      diagnosticBudgetMs: run.budgetMs,
      processLimitMs: PROCESS_LIMIT_MS,
      overrides: run.overridden ? [entry.request.variantId + ':' + entry.request.difficulty] : [],
      generationMs: generationMs,
      checkMs: checkMs,
      totalMs: totalMs,
      guardMarginMs: round3(run.budgetMs - totalMs),
      outcome: outcome,
      error: error,
      correctness: verdict.correctness,
      failedChecks: verdict.failed,
      unevaluatedChecks: verdict.unevaluated,
      checks: checks,
      checkDetails: ev !== null ? ev.details : {},
      attempts: returned ? returned.attempts : null,
      exact: returned ? returned.exact === true : null,
      achieved: returned ? returned.rating.level : null,
      score: returned ? returned.rating.score : null,
      hardestTechnique: returned ? returned.rating.hardestTechnique : null,
      clues: returned ? clueCount(returned.givens) : null,
      warnings: returned ? returned.warnings.slice() : null,
      rated: ev !== null ? ev.rated : null,
      required: ev !== null ? ev.required : null,
      expected: ev !== null ? ev.expected : null,
      work: returned ? workOf(returned.work) : null,
      pipelineTimingsMs: returned ? clone(returned.timings) : null,
      puzzleDigest: run.puzzleDigest,
      wireDigest: run.wireDigest,
      wire: run.wire
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

  /** The text of a record or reconciliation: a line per field, a line per element of an array of objects, CRLF. */
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

  /** The exit code of a written record: 0 every check passed, 3 an error or unfinished checks, 1 a failed check. */
  function exitCodeOf(record) {
    if (record.correctness === 'fail') return 1;
    return record.outcome === 'ok' && record.correctness === 'pass' ? 0 : 3;
  }

  // ---------------------------------------------------------------------------------------------
  // The evidence problems of one record
  // ---------------------------------------------------------------------------------------------

  function decode(wire) {
    return SG.replay.fromPlainWire(clone(wire));
  }

  /**
   * The evidence problems of one record against its manifest entry: shape, immutable request and defaults,
   * identities, digests, a wire that decodes and agrees with the record, the flags derived again from the
   * recorded independent rating, and the pure checks derived again from the wire. A record whose checks
   * recorded a failure is not a problem here: that is a correctness verdict, read from the record.
   * `ctx` is { manifestHash, budgetMs, sha256 }. Returns { problems: string[], usable, state, decoded }.
   */
  function checkRecord(record, entry, ctx) {
    var problems = [];
    var bad = function (text) { problems.push(text); };
    var out = { problems: problems, usable: false, state: 'missing', decoded: null };
    if (!isObject(record)) {
      bad('not a record object');
      out.state = 'evidence problem';
      return out;
    }
    if (record.schema !== SCHEMA) bad('schema ' + JSON.stringify(record.schema) + ' is not ' + SCHEMA);
    if (record.kind !== KIND) bad('kind ' + JSON.stringify(record.kind) + ' is not ' + KIND);
    if (record.id !== entry.id) bad('id ' + JSON.stringify(record.id) + ' is not ' + entry.id);
    if (!same(record.request, entry.request)) bad('the request is not the manifest\'s');
    ['board', 'group', 'role'].forEach(function (name) {
      if (record[name] !== entry[name]) bad(name + ' ' + JSON.stringify(record[name]) + ' is not ' + entry[name]);
    });
    if (record.manifestHash !== ctx.manifestHash) bad('manifestHash is not the current manifest\'s');
    if (record.checksVersion !== CHECKS_VERSION) bad('checksVersion ' + record.checksVersion + ' is not ' +
      CHECKS_VERSION);
    var config = record.normalizedConfig;
    if (config === null) {
      if (record.outcome !== 'generation-error') bad('normalizedConfig is missing');
    } else if (!isObject(config)) {
      bad('normalizedConfig is not an object');
    } else {
      ['variantId', 'difficulty', 'seed', 'trace'].forEach(function (name) {
        var wanted = name === 'variantId' ? entry.request.variantId : entry.request[name];
        if (config[name] !== wanted) bad('normalizedConfig.' + name + ' is not the request\'s');
      });
      if (config.maxAttempts !== entry.expectedAttempts) {
        bad('the normalised attempts ' + config.maxAttempts + ' are not the board default ' +
          entry.expectedAttempts);
      }
    }
    if (record.expectedAttempts !== entry.expectedAttempts) bad('expectedAttempts is not the manifest\'s');
    if (record.effectiveMaxAttempts !== (config ? config.maxAttempts : null)) {
      bad('effectiveMaxAttempts is not the normalised attempts');
    }
    if (!(record.allowance === null || isTime(record.allowance))) bad('allowance is not a number or null');
    if (!isHash(record.sourceHash)) bad('sourceHash is not a SHA-256 hex string');
    if (!isHash(record.toolHash)) bad('toolHash is not a SHA-256 hex string');
    if (typeof record.node !== 'string') bad('node is not a string');
    if (record.commit !== null && typeof record.commit !== 'string') bad('commit is not a string or null');
    if (record.dirty !== null && typeof record.dirty !== 'boolean') bad('dirty is not a boolean or null');
    if (!isObject(record.machine)) bad('machine is not an object');
    if (typeof record.startedAt !== 'string') bad('startedAt is not a string');
    if (!Array.isArray(record.argv) || record.argv.indexOf('--request=' + entry.id) === -1) {
      bad('argv does not show the request ' + entry.id + ' (a record of another request?)');
    }
    if (record.diagnosticBudgetMs !== ctx.budgetMs) {
      bad('the diagnostic budget ' + record.diagnosticBudgetMs + ' ms is not ' + ctx.budgetMs + ' ms');
    }
    if (record.processLimitMs !== PROCESS_LIMIT_MS) bad('processLimitMs is not ' + PROCESS_LIMIT_MS);
    if (!isTime(record.generationMs)) bad('generationMs is not a time');
    if (!(record.checkMs === null || isTime(record.checkMs))) bad('checkMs is not a time or null');
    if (isTime(record.generationMs) && (record.checkMs === null || isTime(record.checkMs))) {
      var total = round3(record.generationMs + (record.checkMs === null ? 0 : record.checkMs));
      if (record.totalMs !== total) bad('totalMs is not generationMs + checkMs');
      if (record.guardMarginMs !== round3(ctx.budgetMs - total)) bad('guardMarginMs is not the budget minus totalMs');
    }
    if (OUTCOMES.indexOf(record.outcome) === -1) {
      bad('outcome ' + JSON.stringify(record.outcome) + ' is not one of ' + OUTCOMES.join(', '));
      out.state = 'evidence problem';
      return out;
    }

    var checks = record.checks;
    var checksOk = isObject(checks) && CHECKS.every(function (name) {
      return has(checks, name) && (checks[name] === true || checks[name] === false || checks[name] === null);
    }) && Object.keys(checks).length === CHECKS.length;
    if (!checksOk) {
      bad('checks is not exactly ' + CHECKS.length + ' named true, false or null results');
    } else {
      var verdict = verdictOfChecks(checks);
      if (!sameList(record.failedChecks, verdict.failed)) bad('failedChecks does not list the false checks');
      if (!sameList(record.unevaluatedChecks, verdict.unevaluated)) {
        bad('unevaluatedChecks does not list the null checks');
      }
      if (record.correctness !== verdict.correctness) bad('correctness is not derived from the checks');
    }

    if (record.outcome === 'generation-error') {
      if (!isObject(record.error) || typeof record.error.code !== 'string') bad('the error has no code');
      if (record.wire !== null || record.puzzleDigest !== null || record.wireDigest !== null) {
        bad('a request that ended in an error carries a puzzle');
      }
      if (checksOk && record.unevaluatedChecks.length !== CHECKS.length) {
        bad('a request that ended in an error has an evaluated check');
      }
      out.state = 'generation-error ' + (isObject(record.error) ? record.error.code : '?');
      return out;
    }

    // A puzzle came back: its wire, digests and recorded facts must hold together.
    if (record.outcome === 'check-error') {
      if (!isObject(record.error) || record.error.phase !== 'check' || typeof record.error.code !== 'string') {
        bad('a check-error outcome without a check error');
      }
      if (checksOk && record.unevaluatedChecks.length === 0) bad('a check-error outcome with every check evaluated');
    } else if (record.error !== null || (checksOk && record.correctness === 'unevaluated')) {
      bad('an ok outcome with an error or an unevaluated check');
    }
    var wire = record.wire;
    if (!isObject(wire) || !Array.isArray(wire.givens) || !Array.isArray(wire.solution) || !isObject(wire.model)) {
      bad('the wire is missing or not a plain wire');
      out.state = 'evidence problem';
      return out;
    }
    var decoded = null;
    try {
      decoded = decode(wire);
    } catch (err) {
      bad('the wire does not decode (' + (err && err.code ? err.code : String(err && err.message)) + ')');
    }
    var digestsOk = true;
    if (!isHash(record.puzzleDigest) || record.puzzleDigest !== digestOfWire(wire, ctx.sha256)) {
      bad('puzzleDigest is not the digest of the wire\'s variant, givens and solution');
      digestsOk = false;
    }
    if (!isHash(record.wireDigest) || record.wireDigest !== ctx.sha256(canonical(wire))) {
      bad('wireDigest is not the digest of the wire');
      digestsOk = false;
    }
    if (wire.model.variantId !== entry.board) bad('the wire is a puzzle of ' + wire.model.variantId);
    if (wire.seed !== entry.request.seed) bad('the wire\'s seed is not ' + entry.request.seed);
    if (!same(wire.config, record.normalizedConfig)) bad('the wire\'s configuration is not the normalised one');
    if (wire.attempts !== record.attempts) bad('the wire\'s attempts are not the recorded ones');
    if ((wire.exact === true) !== record.exact) bad('the wire\'s exact flag is not the recorded one');
    if (!same(wire.warnings, record.warnings)) bad('the wire\'s warnings are not the recorded ones');
    if (!isObject(wire.rating) || wire.rating.score !== record.score || wire.rating.level !== record.achieved) {
      bad('the wire\'s rating is not the recorded score and level');
    }
    if (checksOk) comparePuzzleFacts(record, entry, wire, checks, bad);
    out.decoded = decoded;
    out.usable = decoded !== null && digestsOk;
    out.state = problems.length === 0 ? 'ok' : 'evidence problem';
    return out;
  }

  // The flags and the pure checks, derived again from what the record says, against what its checks claim.
  function comparePuzzleFacts(record, entry, wire, checks, bad) {
    var claim = function (name, derived) {
      if (checks[name] !== derived) {
        bad('check ' + name + ' says ' + checks[name] + ' but the recorded data give ' + derived);
      }
    };
    claim('variantMatches', wire.model.variantId === entry.request.variantId);
    var matches = wire.givens.length === wire.solution.length;
    for (var c = 0; matches && c < wire.givens.length; c++) {
      if (wire.givens[c] !== 0 && wire.givens[c] !== wire.solution[c]) matches = false;
    }
    claim('givensMatchSolution', matches);
    claim('latin', isLatin(entry.geometry, wire.solution));
    var warnings = Array.isArray(record.warnings) ? record.warnings : [];
    var named = function (key) { return warnings.indexOf(key) !== -1; };
    if (record.rated === null) {
      ['ratingAgrees', 'exactFlag', 'approximateWarning', 'shallowWarning', 'noOtherWarning'].forEach(function (n) {
        if (checks[n] !== null) bad('check ' + n + ' is evaluated but no independent rating is recorded');
      });
    } else {
      var exp = expectation(entry.request.difficulty, record.rated, record.required);
      if (!same(record.expected, exp)) bad('expected is not derived from the recorded independent rating');
      claim('exactFlag', record.exact === exp.exact);
      claim('approximateWarning', named('difficulty.approximate') === exp.approximate);
      claim('shallowWarning', named('difficulty.shallow') === exp.shallow);
      claim('noOtherWarning', onlyKnown(warnings));
      claim('ratingAgrees', record.rated.solved === wire.rating.solved && record.rated.score === wire.rating.score &&
        record.rated.level === wire.rating.level && record.rated.hardestTechnique === wire.rating.hardestTechnique);
    }
    if (checks.attemptsPolicy === true) {
      var max = record.effectiveMaxAttempts;
      var attempts = record.attempts;
      if (!(Number.isInteger(attempts) && attempts >= 1 && attempts <= max && (record.exact || attempts === max))) {
        bad('check attemptsPolicy says true but the recorded attempts ' + attempts + ' of ' + max +
          ' and the exact flag do not satisfy it');
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Reconciliation
  // ---------------------------------------------------------------------------------------------

  function arraysOf(view) {
    var wire = view.record.wire;
    return { givens: wire.givens, solution: wire.solution, score: view.record.score };
  }

  function evaluateRelation(relation, views) {
    var out = { id: relation.id, board: relation.board, kind: relation.kind, original: relation.original,
      a: relation.a, b: relation.b, compare: relation.compare.slice(), verdict: 'unevaluated', reason: null,
      equal: null };
    var missing = [relation.a, relation.b].filter(function (id) { return !views[id] || !views[id].usable; });
    if (missing.length > 0) {
      out.reason = missing.map(function (id) {
        return id + ': ' + (views[id] ? views[id].state : 'missing');
      }).join('; ');
      return out;
    }
    var a = arraysOf(views[relation.a]);
    var b = arraysOf(views[relation.b]);
    var equal = {};
    relation.compare.forEach(function (field) {
      equal[field] = field === 'score' ? a.score === b.score : sameList(a[field], b[field]);
    });
    out.equal = equal;
    var allEqual = relation.compare.every(function (field) { return equal[field]; });
    var anyEqual = relation.compare.some(function (field) { return equal[field]; });
    var passed = relation.kind === 'same-seed' ? allEqual : !anyEqual;
    out.verdict = passed ? 'pass' : 'fail';
    return out;
  }

  /** The per-board guard from a completed fixed population: 1.5 x the largest total time, 5 s steps, <= budget. */
  function guardOf(rows, budgetMs, requests) {
    var done = rows.filter(function (r) { return r.outcome === 'ok' && r.evidenceOk !== false; });
    var out = { status: 'unavailable', rule: GUARD_FACTOR + ' x the largest completed generation + check time, ' +
      'rounded up to ' + GUARD_STEP_MS + ' ms, at most ' + budgetMs + ' ms', guardMs: null, maxTotalMs: null,
      marginMs: null, marginShare: null, capped: false, reason: null };
    if (done.length < requests) {
      out.reason = done.length + ' of ' + requests + ' requests completed with their checks: a narrower guard is ' +
        'never extrapolated from unmeasured requests';
      return out;
    }
    var max = Math.max.apply(null, done.map(function (r) { return r.generationMs + (r.checkMs || 0); }));
    var wanted = Math.ceil(max * GUARD_FACTOR / GUARD_STEP_MS) * GUARD_STEP_MS;
    out.status = 'reported';
    out.capped = wanted > budgetMs;
    out.guardMs = Math.min(wanted, budgetMs);
    out.maxTotalMs = round3(max);
    out.marginMs = round3(out.guardMs - max);
    out.marginShare = round3((out.guardMs - max) / out.guardMs);
    return out;
  }

  /**
   * Validates the records of a directory against the manifest and relates them, with no generation. `files` is
   * [{ name, record }] or [{ name, error }] (a file that could not be read or parsed, or another kind of file).
   * `options`: manifest, sha256 (required), budgetMs, current { sourceHash, toolHash }. The document keeps the
   * verdicts apart: `complete` (every occurrence exactly once), `evidenceSound`, `generation`, `correctness`
   * ('pass', 'fail' or 'incomplete'), `relations`, `timing`.
   */
  function reconcile(files, options) {
    var opts = options || {};
    var manifest = manifestOf(opts);
    var sha256 = opts.sha256;
    var budgetMs = opts.budgetMs !== undefined ? opts.budgetMs : BUDGET_MS;
    var hash = manifestHash(sha256, manifest);
    var problems = [];
    var note = function (id, file, text) { problems.push({ id: id, file: file, text: text }); };
    var found = {};
    files.slice().sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; })
      .forEach(function (file) {
        if (file.error !== undefined) {
          note(null, file.name, file.error);
          return;
        }
        var record = file.record;
        if (!isObject(record) || typeof record.id !== 'string') {
          note(null, file.name, 'not a record with an id');
          return;
        }
        if (!entryOf(manifest, record.id)) {
          note(record.id, file.name, 'not an occurrence of the manifest');
          return;
        }
        if (file.name !== record.id + '.json') note(record.id, file.name, 'the file is not named ' + record.id + '.json');
        (found[record.id] = found[record.id] || []).push(file);
      });

    var views = {};
    var rows = [];
    manifest.entries.forEach(function (entry) {
      var list = found[entry.id] || [];
      if (list.length === 0) {
        note(entry.id, null, 'missing: no record of this occurrence');
        rows.push({ id: entry.id, board: entry.board, group: entry.group, seed: entry.seed, file: null,
          present: false });
        return;
      }
      if (list.length > 1) {
        note(entry.id, null, 'duplicate: recorded by ' + list.map(function (f) { return f.name; }).join(' and '));
        rows.push({ id: entry.id, board: entry.board, group: entry.group, seed: entry.seed, file: null,
          present: false });
        return;
      }
      var record = list[0].record;
      var checked = checkRecord(record, entry, { manifestHash: hash, budgetMs: budgetMs, sha256: sha256 });
      checked.problems.forEach(function (text) { note(entry.id, list[0].name, text); });
      views[entry.id] = { record: record, usable: checked.usable, state: checked.state };
      rows.push(rowOf(entry, list[0].name, record, checked));
    });

    var identity = identityOf(manifest, views, note);
    var relations = manifest.relations.map(function (r) { return evaluateRelation(r, views); });
    var boards = boardsOf(manifest, rows, budgetMs);
    var present = rows.filter(function (r) { return r.present !== false; });
    var failedRows = present.filter(function (r) { return r.correctness === 'fail'; });
    var generated = present.filter(function (r) { return r.outcome !== 'generation-error'; });
    var evidenceSound = problems.length === 0;
    var relationFailed = relations.some(function (r) { return r.verdict === 'fail'; });
    var incomplete = present.length < rows.length || present.some(function (r) { return r.correctness !== 'pass'; }) ||
      relations.some(function (r) { return r.verdict === 'unevaluated'; });
    var correctness = failedRows.length > 0 || relationFailed ? 'fail' : incomplete ? 'incomplete' : 'pass';
    var currentMatches = null;
    if (opts.current) {
      currentMatches = { sourceHash: identity.sourceHash === opts.current.sourceHash,
        toolHash: identity.toolHash === opts.current.toolHash };
    }
    return {
      schema: SCHEMA,
      kind: RECONCILED_KIND,
      manifestHash: hash,
      requests: manifest.entries.length,
      complete: present.length === rows.length,
      evidenceSound: evidenceSound,
      identity: Object.assign({}, identity, { currentMatches: currentMatches }),
      generation: {
        requested: rows.length, produced: generated.length,
        unavailable: present.filter(function (r) { return r.outcome === 'generation-error'; }).map(function (r) {
          return { id: r.id, code: r.error ? r.error.code : null, generationMs: r.generationMs };
        }),
        checkErrors: present.filter(function (r) { return r.outcome === 'check-error'; }).map(function (r) {
          return { id: r.id, code: r.error ? r.error.code : null, checkMs: r.checkMs };
        })
      },
      correctness: correctness,
      correctnessDetail: {
        passed: present.filter(function (r) { return r.correctness === 'pass'; }).length,
        failed: failedRows.map(function (r) { return { id: r.id, failedChecks: r.failedChecks }; }),
        unevaluated: present.filter(function (r) { return r.correctness === 'unevaluated'; }).map(function (r) {
          return r.id;
        })
      },
      relationVerdicts: {
        pass: relations.filter(function (r) { return r.verdict === 'pass'; }).length,
        fail: relations.filter(function (r) { return r.verdict === 'fail'; }).length,
        unevaluated: relations.filter(function (r) { return r.verdict === 'unevaluated'; }).length
      },
      timing: {
        budgetMs: budgetMs, processLimitMs: PROCESS_LIMIT_MS, applicationGuardMs: APPLICATION_GUARD_MS,
        qualificationP95Ms: QUALIFICATION_P95_MS,
        note: 'seconds and margins only: not a pass or fail of any owner\'s guard; the guard is reported per ' +
          'board from the completed fixed population'
      },
      boards: boards,
      problems: problems,
      occurrences: rows,
      relations: relations
    };
  }

  function rowOf(entry, file, record, checked) {
    var error = null;
    if (isObject(record.error)) {
      error = { phase: record.error.phase, code: record.error.code,
        args: record.error.args === undefined ? null : record.error.args };
    }
    return {
      id: entry.id, board: entry.board, group: entry.group, seed: entry.seed, file: file, present: true,
      outcome: record.outcome, error: error,
      attempts: record.attempts, effectiveMaxAttempts: record.effectiveMaxAttempts, exact: record.exact,
      warnings: record.warnings, achieved: record.achieved, score: record.score,
      generationMs: isTime(record.generationMs) ? record.generationMs : null,
      checkMs: isTime(record.checkMs) ? record.checkMs : null,
      guardMarginMs: typeof record.guardMarginMs === 'number' ? record.guardMarginMs : null,
      correctness: record.correctness, failedChecks: Array.isArray(record.failedChecks) ? record.failedChecks : [],
      unevaluatedChecks: Array.isArray(record.unevaluatedChecks) ? record.unevaluatedChecks : [],
      puzzleDigest: record.puzzleDigest, usable: checked.usable, evidenceOk: checked.problems.length === 0
    };
  }

  // One value of each identity field across the records; a field with two values is a mixed identity.
  function identityOf(manifest, views, note) {
    var out = { sourceHash: null, toolHash: null, node: null, commit: null, allowance: null, budgetMs: null,
      checksVersion: null };
    var fields = [['sourceHash', 'sourceHash'], ['toolHash', 'toolHash'], ['node', 'node'], ['commit', 'commit'],
      ['allowance', 'allowance'], ['budgetMs', 'diagnosticBudgetMs'], ['checksVersion', 'checksVersion']];
    fields.forEach(function (pair) {
      var values = {};
      manifest.entries.forEach(function (entry) {
        if (!views[entry.id]) return;
        var key = JSON.stringify(views[entry.id].record[pair[1]]);
        (values[key] = values[key] || []).push(entry.id);
      });
      var keys = Object.keys(values);
      if (keys.length === 1) out[pair[0]] = JSON.parse(keys[0]);
      else if (keys.length > 1) {
        note(null, null, 'mixed identities: ' + pair[0] + ' has ' + keys.length + ' values (' + keys.map(function (k) {
          return k.slice(0, 14) + ' for ' + values[k].join(', ');
        }).join('; ') + ')');
      }
    });
    return out;
  }

  function boardsOf(manifest, rows, budgetMs) {
    var boards = {};
    var names = [];
    manifest.entries.forEach(function (e) { if (names.indexOf(e.board) === -1) names.push(e.board); });
    names.forEach(function (board) {
      var mine = rows.filter(function (r) { return r.board === board; });
      var present = mine.filter(function (r) { return r.present !== false; });
      var produced = present.filter(function (r) { return r.outcome !== 'generation-error'; });
      var times = produced.map(function (r) { return r.generationMs; }).filter(function (t) { return t !== null; });
      boards[board] = {
        requests: mine.length,
        produced: produced.length,
        exact: produced.filter(function (r) { return r.exact === true; }).length,
        fallbacks: produced.filter(function (r) { return r.exact === false; }).length,
        shallow: produced.filter(function (r) {
          return r.exact === false && Array.isArray(r.warnings) && r.warnings.indexOf('difficulty.shallow') !== -1;
        }).length,
        unavailable: present.filter(function (r) { return r.outcome === 'generation-error'; }).length,
        generationMs: summarize(times),
        checkMs: summarize(produced.map(function (r) { return r.checkMs; }).filter(function (t) { return t !== null; })),
        overApplicationGuard: times.filter(function (t) { return t > APPLICATION_GUARD_MS; }).length,
        overQualificationP95: times.filter(function (t) { return t > QUALIFICATION_P95_MS; }).length,
        guard: guardOf(present, budgetMs, mine.length)
      };
    });
    return boards;
  }

  /** The exit code of a reconciliation: 1 evidence problem, failed check or relation; 3 incomplete; else 0. */
  function exitCodeOfReconciliation(doc) {
    if (!doc.evidenceSound || doc.correctness === 'fail') return 1;
    return doc.correctness === 'incomplete' || !doc.complete ? 3 : 0;
  }

  // ---------------------------------------------------------------------------------------------
  // The read-only consumer of MS05b3 (CV3)
  // ---------------------------------------------------------------------------------------------

  function currentConfigOf(entry) {
    var request = clone(entry.request);
    var scope = SG.fixtures.toolRecords.withRequestedLevel(request.variantId, request.difficulty, function () {
      return SG.pipeline.normalizeConfig(request);
    });
    return scope.value;
  }

  /**
   * The puzzle of an invariant occurrence for CV3 (`generation: 'reused'`), or the reasons it cannot be taken.
   * `query` is { variantId, level, seed }: only the invariant occurrences (seeds 1 to 4) answer; a CV5 repeat is
   * never chosen to fill a seed. `current` is { sourceHash, toolHash } of the sources and the tool now, and
   * optionally { config (the normalised configuration of the caller's request), allowance } (default: the
   * normalised request now and `SG.digger.SHALLOW_SEARCH_RATINGS`). `options`: sha256 (required), manifest,
   * budgetMs. The records are only read; a decoded copy is returned. The caller applies its own per-puzzle
   * checks and availability threshold: `recorded` only reports what the tool recorded, and an unavailable
   * request is returned as `unavailable`, never replaced by another puzzle.
   * @returns {{ ok, id, reasons, unavailable, recorded, generation, result }}
   */
  function reuse(records, query, current, options) {
    var opts = options || {};
    var manifest = manifestOf(opts);
    var out = { ok: false, id: null, reasons: [], unavailable: null, recorded: null, generation: 'reused',
      result: null };
    var refuse = function (text) { out.reasons.push(text); };
    var entry = manifest.entries.filter(function (e) {
      return e.group === 'invariant' && query && e.request.variantId === query.variantId &&
        e.request.difficulty === query.level && e.seed === query.seed;
    })[0];
    if (!entry) {
      refuse('no invariant occurrence for ' + (query && query.variantId) + ' ' + (query && query.level) +
        ' seed ' + (query && query.seed));
      return out;
    }
    out.id = entry.id;
    var mine = (records || []).filter(function (r) { return isObject(r) && r.id === entry.id; });
    if (mine.length !== 1) {
      refuse(mine.length === 0 ? 'no record of ' + entry.id : mine.length + ' records of ' + entry.id);
      return out;
    }
    var record = mine[0];
    var hash = manifestHash(opts.sha256, manifest);
    var checked = checkRecord(record, entry, {
      manifestHash: hash, budgetMs: opts.budgetMs !== undefined ? opts.budgetMs : BUDGET_MS, sha256: opts.sha256
    });
    checked.problems.forEach(refuse);
    var now = current || {};
    if (!isHash(now.sourceHash)) refuse('the current source identity is not given');
    else if (record.sourceHash !== now.sourceHash) refuse('the record was made by other engine sources');
    if (!isHash(now.toolHash)) refuse('the current validation identity is not given');
    else if (record.toolHash !== now.toolHash) refuse('the record was validated by another tool');
    var config = now.config !== undefined ? now.config : currentConfigOf(entry);
    if (!same(record.normalizedConfig, config)) refuse('the normalised configuration is not the current one');
    var allowance = now.allowance !== undefined ? now.allowance : allowanceNow();
    if (record.allowance !== allowance) refuse('the allowance ' + record.allowance + ' is not the current ' + allowance);
    if (record.outcome === 'generation-error' && isObject(record.error)) {
      out.unavailable = { code: record.error.code, phase: record.error.phase, generationMs: record.generationMs };
    }
    if (out.reasons.length > 0) return out;
    if (record.outcome === 'generation-error') {
      refuse('the request ended in ' + record.error.code + ': no puzzle was returned');
      return out;
    }
    out.recorded = {
      outcome: record.outcome, generationMs: record.generationMs, checkMs: record.checkMs,
      attempts: record.attempts, exact: record.exact, warnings: record.warnings.slice(),
      correctness: record.correctness, failedChecks: record.failedChecks.slice(), node: record.node,
      commit: record.commit, startedAt: record.startedAt
    };
    out.result = checked.decoded;
    out.ok = true;
    return out;
  }

  SG.fixtures.megaContract = {
    SCHEMA: SCHEMA,
    KIND: KIND,
    RECONCILED_KIND: RECONCILED_KIND,
    CHECKS_VERSION: CHECKS_VERSION,
    CHECKS: CHECKS,
    LEVEL: LEVEL,
    BUDGET_MS: BUDGET_MS,
    PROCESS_LIMIT_MS: PROCESS_LIMIT_MS,
    APPLICATION_GUARD_MS: APPLICATION_GUARD_MS,
    QUALIFICATION_P95_MS: QUALIFICATION_P95_MS,
    BOARDS: BOARDS,
    USAGE: USAGE,
    MANIFEST: DEFAULT.entries,
    RELATIONS: DEFAULT.relations,
    makeManifest: makeManifest,
    manifestHash: manifestHash,
    listText: listText,
    parseArgs: parseArgs,
    expectation: expectation,
    evaluate: evaluate,
    execute: execute,
    recordOf: recordOf,
    renderRecord: renderRecord,
    exitCodeOf: exitCodeOf,
    checkRecord: checkRecord,
    reconcile: reconcile,
    exitCodeOfReconciliation: exitCodeOfReconciliation,
    guardOf: guardOf,
    reuse: reuse
  };
})();
