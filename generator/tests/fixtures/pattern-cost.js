/**
 * Pure helpers of the pattern-cost tool (difficulty v3, MS07a: `node tests/pattern-cost.js`). Exposed as
 * SG.fixtures.patternCost; test tooling, not part of any application script list. They know no file system, git,
 * hash function or process: the Node tool passes the clock and `digest(text)` in, loads the engine and writes the
 * file. The tool measures the cost of the registered technique finders on the REAL fixtures of
 * core/tests/fixtures/techniques.js (the active `byId` map, never the frozen history), read-only: it generates no
 * puzzle and runs no suite. Its numbers are evidence for the owner of a technique (GP-cost), never an assertion of
 * a quick suite: the quick suite `pattern-cost-tools` tests these helpers on fake observations only.
 *
 * One case is one fixture (positive or negative) of one technique id: `<id>:<positive|negative>:<n>`. A case is
 * run `runs` times (default 20) on the same state, each time with a fresh context whose optional
 * `onPatternWork` observer collects the work records of the finder ({ id, work, limit, capHit, retained }, see
 * core/js/engine/tech-chain.js; a finder that does not report them has no records). Every run must give the same
 * Finding and the same records (the finders are deterministic and read-only: the state is compared after each
 * run); only the time may differ. A case keeps the Finding, its digest, the work records, whether the outcome is
 * the one the fixture records, and min / p50 / p95 / max / mean of the time (nearest rank) with the samples.
 *
 *  - parseArgs(argv)                    { mode: 'help' | 'list' | 'run', ids, runs, json, caseText }; a bad command
 *                                       line throws an Error whose `code` is 'usage' (exit code 2)
 *  - inventoryOf(ids)                   what the registry and the fixtures hold for those ids (needs the engine)
 *  - planCases(inventory, caseText)     { cases, problems }: unknown id, scoped technique, missing fixtures and an
 *                                       empty selection are problems (no run), the text selects by substring
 *  - measure(cases, config, env)        the runs: { records, problems, stopped, wallMs }; never throws for a finder
 *                                       result; env = { clock(), digest(text) }; config = { runs, budgetMs }
 *  - recordOf(c, observations, env)     the record of one case, with its own problems; env.digest(text)
 *  - documentOf(parts), problemsOf(document), exitCodeOf(document), withoutTime(document)
 *  - renderText(document), listText(cases)
 *
 * The caller budget (BUDGET_MS, eight minutes, inside the 540 s process limit) is one SG.budget shared by every
 * context. A finder may turn a spent budget into "nothing found", so it is checked again after every find, and
 * the clock is compared before every run; a spent budget ends the run with the cases measured so far and a
 * problem, never with a short sample presented as complete.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  var SCHEMA = 1;
  var KIND = 'pattern-cost';
  var TOOL = 'tests/pattern-cost.js';
  var DEFAULT_RUNS = 20;
  var MAX_RUNS = 200;
  var BUDGET_MS = 480000;
  var MODEL_ID = 'classic9';
  var ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
  var KINDS = ['positive', 'negative'];

  var USAGE = [
    'Usage: node tests/pattern-cost.js --ids=<id>[,<id>] --json=<new.json> [--runs=20] [--case=<text>]',
    '       node tests/pattern-cost.js --ids=<id>[,<id>] [--case=<text>] --list',
    '',
    '  --ids=<id>[,<id>]  registered, unscoped technique ids; every positive and negative fixture of each is a case',
    '  --json=<file>      a new project-relative .json file for the record (an existing file is refused)',
    '  --runs=<n>         identical read-only finds per case, 1 to 200 (default 20)',
    '  --case=<text>      only the cases whose key or fixture name contains the text (case-insensitive)',
    '  --list             print the cases and run nothing',
    '',
    'No puzzle is generated and no suite runs. The caller budget is 480000 ms (the process limit is 540 s):',
    'run it through `Invoke-Dv3Node`. Exit code: 0 a complete record; 1 an incomplete or inconsistent one',
    '(a spent budget, a Finding or work record that changed between runs, a state that was written, a missing',
    'case, an outcome that is not the fixture\'s); 2 an invalid command line, an unknown or scoped id, missing',
    'fixtures or an empty selection.'
  ].join('\n');

  // ---------------------------------------------------------------------------------------------
  // Small utilities
  // ---------------------------------------------------------------------------------------------

  function has(object, name) {
    return Object.prototype.hasOwnProperty.call(object, name);
  }

  function round3(x) {
    return Math.round(x * 1000) / 1000;
  }

  function usageError(message) {
    var err = new Error(message);
    err.code = 'usage';
    return err;
  }

  /** JSON with the keys of every object sorted, so that equal data gives equal text. */
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value !== null && typeof value === 'object') {
      return '{' + Object.keys(value).sort().map(function (key) {
        return JSON.stringify(key) + ':' + canonical(value[key]);
      }).join(',') + '}';
    }
    return JSON.stringify(value === undefined ? null : value);
  }

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // ---------------------------------------------------------------------------------------------
  // Command line
  // ---------------------------------------------------------------------------------------------

  function parseArgs(argv) {
    var given = {};
    (argv || []).forEach(function (arg) {
      var parts = /^--([a-z]+)(?:=([\s\S]*))?$/.exec(String(arg));
      if (!parts || ['ids', 'runs', 'json', 'case', 'list', 'help'].indexOf(parts[1]) === -1) {
        throw usageError('unknown argument ' + arg);
      }
      var name = parts[1];
      if (name === 'list' || name === 'help') {
        if (parts[2] !== undefined) throw usageError('--' + name + ' takes no value');
      } else if (parts[2] === undefined || parts[2] === '') {
        throw usageError('--' + name + ' needs a value');
      }
      if (has(given, name)) throw usageError('--' + name + ' is given twice');
      given[name] = parts[2] === undefined ? true : parts[2];
    });
    if (has(given, 'help')) {
      if (Object.keys(given).length > 1) throw usageError('--help cannot be combined with another option');
      return { mode: 'help' };
    }
    if (!has(given, 'ids')) throw usageError('--ids=<id>[,<id>] is required');
    var ids = given.ids.split(',');
    ids.forEach(function (id) {
      if (!ID_PATTERN.test(id)) throw usageError('--ids: "' + id + '" is not a technique id');
    });
    ids.forEach(function (id, i) {
      if (ids.indexOf(id) !== i) throw usageError('--ids: ' + id + ' is listed twice');
    });
    var runs = DEFAULT_RUNS;
    if (has(given, 'runs')) {
      if (!/^[0-9]+$/.test(given.runs)) throw usageError('--runs needs a whole number, not "' + given.runs + '"');
      runs = parseInt(given.runs, 10);
      if (runs < 1 || runs > MAX_RUNS) throw usageError('--runs must be between 1 and ' + MAX_RUNS);
    }
    var caseText = has(given, 'case') ? given.case : null;
    if (has(given, 'list')) {
      if (has(given, 'json') || has(given, 'runs')) throw usageError('--list runs nothing: no --json or --runs');
      return { mode: 'list', ids: ids, runs: null, json: null, caseText: caseText };
    }
    if (!has(given, 'json')) throw usageError('--json=<new.json> is required: a run without a record is lost');
    return { mode: 'run', ids: ids, runs: runs, json: given.json, caseText: caseText };
  }

  // ---------------------------------------------------------------------------------------------
  // The cases
  // ---------------------------------------------------------------------------------------------

  /** What the registry and the active fixtures hold for these ids; needs the engine and the fixtures. */
  function inventoryOf(ids) {
    var fixtures = SG.fixtures.techniques;
    return ids.map(function (id) {
      var tech = SG.techniques.has(id) ? SG.techniques.get(id) : null;
      var entry = has(fixtures.byId, id) ? fixtures.byId[id] : null;
      return {
        id: id,
        registered: tech !== null,
        scope: tech === null ? null : tech.variantScope,
        hasEntry: entry !== null,
        positive: entry ? entry.positive : [],
        negative: entry ? entry.negative : []
      };
    });
  }

  /**
   * The cases of an inventory, in the order of the ids, positives then negatives. Anything that would make the
   * record meaningless is a problem and there are no cases then: an id that is not registered, a scoped technique
   * (its fixtures need a model of their own: the scoped adapter belongs to MS14b), an id without fixtures, and a
   * text that selects nothing.
   */
  function planCases(inventory, caseText) {
    var problems = [];
    var cases = [];
    inventory.forEach(function (item) {
      if (!item.registered) {
        problems.push('unknown technique id ' + item.id);
      } else if (item.scope !== null) {
        problems.push('technique ' + item.id + ' is scoped to [' + item.scope.join(', ') + ']: the tool has no ' +
          'scoped fixtures yet');
      } else if (!item.hasEntry || item.positive.length + item.negative.length === 0) {
        problems.push('no fixtures for ' + item.id + ' in the active map of core/tests/fixtures/techniques.js');
      } else {
        KINDS.forEach(function (kind) {
          item[kind].forEach(function (fixture, i) {
            cases.push({ key: item.id + ':' + kind + ':' + (i + 1), id: item.id, kind: kind, name: fixture.name,
              fixture: fixture });
          });
        });
      }
    });
    if (problems.length > 0) return { cases: [], problems: problems };
    if (caseText !== null && caseText !== undefined) {
      var needle = String(caseText).toLowerCase();
      cases = cases.filter(function (c) { return (c.key + ' ' + c.name).toLowerCase().indexOf(needle) !== -1; });
    }
    if (cases.length === 0) {
      problems.push('empty selection: no case of ' + inventory.map(function (i) { return i.id; }).join(', ') +
        (caseText ? ' contains "' + caseText + '"' : ''));
    }
    return { cases: cases, problems: problems };
  }

  /** The state of a fixture position, built like the tests build it (techniques.test.js). */
  function stateOf(fixture) {
    var H = SG.techHelper;
    var model = H.model(MODEL_ID);
    return fixture.after !== null
      ? H.stateAfter(model, fixture.puzzle, fixture.after)
      : H.makeState(model, fixture.puzzle, { propagate: fixture.propagate });
  }

  // ---------------------------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------------------------

  function nearestRank(sorted, p) {
    return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
  }

  /** min, p50, p95, max and mean of the samples (ms, to the microsecond), by nearest rank; null for none. */
  function timeStats(samples) {
    if (samples.length === 0) return null;
    var sorted = samples.slice().sort(function (a, b) { return a - b; });
    var sum = 0;
    sorted.forEach(function (x) { sum += x; });
    return {
      min: round3(sorted[0]), p50: round3(nearestRank(sorted, 0.5)), p95: round3(nearestRank(sorted, 0.95)),
      max: round3(sorted[sorted.length - 1]), mean: round3(sum / sorted.length)
    };
  }

  // ---------------------------------------------------------------------------------------------
  // One case
  // ---------------------------------------------------------------------------------------------

  function pairKeys(list) {
    return list.map(function (p) { return p[0] + ':' + p[1]; }).sort();
  }

  /** Whether the outcome is the one the fixture records: null when the fixture records none. */
  function matchesFixture(c, finding) {
    if (c.kind === 'negative') return finding === null;
    var expect = c.fixture.expect;
    if (!expect) return null;
    if (finding === null) return false;
    return canonical(pairKeys(finding.placements)) === canonical(pairKeys(expect.placements)) &&
      canonical(pairKeys(finding.eliminations)) === canonical(pairKeys(expect.eliminations));
  }

  /**
   * The record of one case from its observations ({ ms, finding (canonical text or null), reports }), which hold
   * one entry per run. Runs that disagree on the Finding or on the work records are problems of the record.
   * `env.digest(text)` hashes the canonical Finding.
   * @returns {{ record: Object, problems: string[] }}
   */
  function recordOf(c, observations, env) {
    var problems = [];
    var first = observations[0];
    var workText = canonical(first.reports);
    observations.forEach(function (o, i) {
      if (o.finding !== first.finding) problems.push(c.key + ': the Finding of run ' + (i + 1) + ' differs from run 1');
      if (canonical(o.reports) !== workText) problems.push(c.key + ': the work records of run ' + (i + 1) +
        ' differ from run 1');
    });
    var finding = first.finding === null ? null : JSON.parse(first.finding);
    var capHits = first.reports.map(function (r) { return r.capHit; }).filter(function (hit) { return hit !== null; });
    var samples = observations.map(function (o) { return round3(o.ms); });
    var workUnits = null;
    if (first.reports.length > 0) {
      workUnits = 0;
      first.reports.forEach(function (r) { workUnits += r.work; });
    }
    return {
      record: {
        key: c.key, id: c.id, kind: c.kind, name: c.name, puzzle: c.fixture.puzzle,
        after: c.fixture.after, propagate: c.fixture.propagate === undefined ? null : c.fixture.propagate,
        runs: observations.length,
        outcome: finding === null ? 'none' : 'found',
        matchesFixture: matchesFixture(c, finding),
        finding: finding,
        findingDigest: finding === null ? null : env.digest(first.finding),
        reports: first.reports.length,
        work: copy(first.reports),
        workUnits: workUnits,
        capHit: capHits.length > 0 ? capHits[0] : null,
        deterministic: problems.length === 0,
        timeMs: timeStats(samples),
        samplesMs: samples
      },
      problems: problems
    };
  }

  function sameState(state, snapshot) {
    for (var c = 0; c < snapshot.value.length; c++) {
      if (state.value[c] !== snapshot.value[c] || state.candidates[c] !== snapshot.candidates[c]) return false;
    }
    return state.unsolvedCount === snapshot.unsolvedCount;
  }

  /**
   * Runs a case `config.runs` times. Returns { record, problems, stopped }; `record` is null when the case could
   * not be finished (a spent budget, a state that was written), and `stopped` then ends the whole run.
   */
  function measureCase(c, config, env, budget, started) {
    var H = SG.techHelper;
    var model = H.model(MODEL_ID);
    var tech = SG.techniques.get(c.id);
    var state = stateOf(c.fixture);
    var snapshot = {
      value: Array.prototype.slice.call(state.value), candidates: Array.prototype.slice.call(state.candidates),
      unsolvedCount: state.unsolvedCount
    };
    var observations = [];
    for (var run = 0; run < config.runs; run++) {
      if (env.clock() - started >= config.budgetMs) {
        return { record: null, stopped: true, problems: [c.key + ': the caller budget of ' + config.budgetMs +
          ' ms was spent after ' + run + ' of ' + config.runs + ' runs'] };
      }
      var reports = [];
      var ctx = SG.techniques.createContext(model, {
        assumeUniqueness: true, budget: budget, onPatternWork: function (r) { reports.push(r); }
      });
      var t0 = env.clock();
      var finding = tech.find(model, state, ctx);
      var t1 = env.clock();
      try {
        budget.check();
      } catch (err) {
        return { record: null, stopped: true, problems: [c.key + ': the caller budget was spent in run ' +
          (run + 1) + ' of ' + config.runs + ' (' + (err && err.code ? err.code : String(err)) + '): the find may ' +
          'have returned a partial answer'] };
      }
      if (!sameState(state, snapshot)) {
        return { record: null, stopped: true, problems: [c.key + ': the finder wrote to the state in run ' +
          (run + 1)] };
      }
      if (run === 0 && finding !== null) {
        var bad = H.findingProblems(model, state, finding, { technique: c.id });
        if (bad.length > 0) {
          return { record: null, stopped: false, problems: [c.key + ': not a valid Finding: ' + bad.join('; ')] };
        }
      }
      observations.push({ ms: t1 - t0, finding: finding === null ? null : canonical(finding), reports: reports });
    }
    var made = recordOf(c, observations, env);
    return { record: made.record, stopped: false, problems: made.problems };
  }

  /**
   * The runs of every case, one after the other. Never throws for what a finder returns; a case that cannot be
   * finished is a problem and has no record, and a spent budget ends the run.
   * @returns {{ records: Object[], problems: string[], stopped: boolean, wallMs: number }}
   */
  function measure(cases, config, env) {
    var started = env.clock();
    var budget = SG.budget.create({ ms: config.budgetMs, now: env.clock });
    var records = [];
    var problems = [];
    var stopped = false;
    for (var i = 0; i < cases.length && !stopped; i++) {
      var out = measureCase(cases[i], config, env, budget, started);
      problems = problems.concat(out.problems);
      if (out.record !== null) records.push(out.record);
      stopped = out.stopped;
    }
    return { records: records, problems: problems, stopped: stopped, wallMs: round3(env.clock() - started) };
  }

  // ---------------------------------------------------------------------------------------------
  // The record of a run
  // ---------------------------------------------------------------------------------------------

  /**
   * The problems of a record against its own plan: a case without a record or with fewer runs, runs that
   * disagreed, an outcome that is not the one the fixture records (the measured Finding and numbers stay in the
   * record, but it is no evidence for a consumer), a work record that cannot be read. An empty list means the
   * record is complete.
   */
  function problemsOf(document) {
    var problems = [];
    var planned = document.config.cases;
    var byKey = {};
    document.cases.forEach(function (record) { byKey[record.key] = record; });
    planned.forEach(function (key) {
      var record = byKey[key];
      if (!record) {
        problems.push(key + ': no record (the case was not finished)');
        return;
      }
      if (record.runs !== document.config.runs || record.samplesMs.length !== document.config.runs) {
        problems.push(key + ': ' + record.runs + ' runs of ' + document.config.runs);
      }
      if (record.deterministic !== true) problems.push(key + ': the runs disagree');
      // A deterministic wrong answer is still wrong: the record keeps what was measured, but it is no evidence
      if (record.matchesFixture === false) {
        problems.push(key + ': the outcome is not the fixture\'s (' + record.outcome + ' where the fixture records ' +
          (record.kind === 'negative' ? 'nothing' : 'a deduction') + ')');
      }
      record.work.forEach(function (r) {
        var okLimit = r.limit === null || (typeof r.limit === 'number' && r.limit >= 0);
        if (typeof r.work !== 'number' || !(r.work >= 0) || !okLimit || [null, 'work', 'records', 'nodes']
          .indexOf(r.capHit) === -1) {
          problems.push(key + ': an unreadable work record ' + JSON.stringify(r));
        }
      });
    });
    document.cases.forEach(function (record) {
      if (planned.indexOf(record.key) === -1) problems.push(record.key + ': a record of a case that is not planned');
    });
    return problems;
  }

  /**
   * The document of a run. parts: { argv, identity, machine, config: { runs, ids, caseText, budgetMs }, cases (the
   * planned cases), startedAt, endedAt, measured ({ records, problems, stopped, wallMs }) }. `complete` is true
   * only when every planned case has all its runs, they agreed, and nothing was stopped.
   */
  function documentOf(parts) {
    var measured = parts.measured;
    var document = {
      schema: SCHEMA,
      kind: KIND,
      tool: TOOL,
      argv: parts.argv.slice(),
      identity: parts.identity,
      machine: parts.machine,
      config: {
        ids: parts.config.ids.slice(), caseText: parts.config.caseText, runs: parts.config.runs,
        budgetMs: parts.config.budgetMs, model: MODEL_ID, assumeUniqueness: true,
        cases: parts.cases.map(function (c) { return c.key; })
      },
      startedAt: parts.startedAt,
      endedAt: parts.endedAt,
      wallMs: measured.wallMs,
      complete: false,
      stopped: measured.stopped,
      problems: [],
      summary: null,
      cases: measured.records
    };
    document.problems = measured.problems.concat(problemsOf(document));
    document.complete = !measured.stopped && document.problems.length === 0;
    document.summary = {
      planned: document.config.cases.length,
      measured: measured.records.length,
      runsPerCase: document.config.runs,
      finds: measured.records.reduce(function (sum, r) { return sum + r.runs; }, 0),
      found: measured.records.filter(function (r) { return r.outcome === 'found'; }).length,
      none: measured.records.filter(function (r) { return r.outcome === 'none'; }).length,
      mismatches: measured.records.filter(function (r) { return r.matchesFixture === false; }).length,
      reporting: measured.records.filter(function (r) { return r.reports > 0; }).length,
      capped: measured.records.filter(function (r) { return r.capHit !== null; }).length
    };
    return document;
  }

  /** 0 for a complete record, 1 for an incomplete or inconsistent one. */
  function exitCodeOf(document) {
    return document.complete === true && problemsOf(document).length === 0 ? 0 : 1;
  }

  /** The document without the clock readings: two runs of the same source agree on it (the timing differs). */
  function withoutTime(document) {
    var view = copy(document);
    delete view.startedAt;
    delete view.endedAt;
    delete view.wallMs;
    view.cases.forEach(function (record) {
      delete record.timeMs;
      delete record.samplesMs;
    });
    return view;
  }

  // ---------------------------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------------------------

  function ms(x) {
    return x === null || x === undefined ? 'n/a' : x.toFixed(3);
  }

  function workText(record) {
    if (record.workUnits === null) return 'no work report';
    var limit = record.work.length === 1 ? (record.work[0].limit === null ? 'unbounded' : record.work[0].limit) :
      record.work.length + ' reports';
    return 'work ' + record.workUnits + ' of ' + limit + (record.capHit ? ', CAP ' + record.capHit : '');
  }

  function renderText(document) {
    var s = document.summary;
    var lines = [
      'pattern-cost: ' + s.measured + ' of ' + s.planned + ' cases x ' + s.runsPerCase + ' runs (' + s.finds +
        ' finds), complete ' + document.complete + ', found ' + s.found + ', none ' + s.none + ', outcome not ' +
        'the fixture\'s ' + s.mismatches + ', capped ' + s.capped + ', wall ' + ms(document.wallMs / 1000) + ' s'
    ];
    document.cases.forEach(function (r) {
      lines.push('  ' + r.key + ' ' + r.outcome + (r.matchesFixture === false ? ' (NOT the fixture\'s outcome)' : '') +
        ', ' + workText(r) + ', ms p50 ' + ms(r.timeMs.p50) + ' p95 ' + ms(r.timeMs.p95) + ' max ' + ms(r.timeMs.max));
    });
    document.problems.forEach(function (p) { lines.push('  PROBLEM ' + p); });
    return lines.join('\n');
  }

  function listText(cases) {
    return cases.map(function (c) { return c.key + '  ' + c.name; }).join('\n');
  }

  SG.fixtures.patternCost = {
    SCHEMA: SCHEMA,
    KIND: KIND,
    DEFAULT_RUNS: DEFAULT_RUNS,
    MAX_RUNS: MAX_RUNS,
    BUDGET_MS: BUDGET_MS,
    USAGE: USAGE,
    parseArgs: parseArgs,
    inventoryOf: inventoryOf,
    planCases: planCases,
    stateOf: stateOf,
    timeStats: timeStats,
    recordOf: recordOf,
    measure: measure,
    problemsOf: problemsOf,
    documentOf: documentOf,
    exitCodeOf: exitCodeOf,
    withoutTime: withoutTime,
    renderText: renderText,
    listText: listText,
    canonical: canonical
  };
})();
