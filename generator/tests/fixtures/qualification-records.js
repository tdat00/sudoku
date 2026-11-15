/**
 * Pure helpers of the qualification (difficulty v3, MS07d), exposed as SG.fixtures.qualificationRecords. Test
 * tooling, not part of any application script list: no file system, clock or hash function. tests/qualify.js
 * runs this file in a context of its own (its bytes are part of the `qualifierHash` of every shard) and
 * passes the facts of the engine in; the quick suite `qualification-records` tests it on synthetic records.
 *
 *  - PROTOCOL, VARIANTS, LEVELS   the protocol constants and the 15 x 9 manifest of checklist Q
 *  - seedFor, budgetOf, percentile, hitOf, decide   the decision of tests/qualify.js (shared, not copied)
 *  - fmt, markdownOf(record)      the table of docs/difficulty-rating/qualification.md
 *  - matrixOf(engine)             the variants of the registry: id, board size, default attempts
 *  - checkCell(cell, expect)      the problems of one cell record: every request, the rounds, the early-stop
 *                                 proof of a stopped level and the summary recomputed from the requests
 *  - merge(files, expect)         { ok, problems, record }: every shard valid and consistent, every one of
 *                                 the 135 cells exactly once; the record lists the cells in manifest order
 *  - recordText(record), toCrlf(text)   the deterministic text (UTF-8, CRLF, a final line end)
 *
 * A shard is the JSON of one `node tests/qualify.js --json=` run. `expect` of `merge` is { jobs, sources,
 * qualifierHash, ratingVersion, attemptPolicy, variants: [{ id, cellCount, attempts }], levels }: what the
 * current tree says, read by the tool. A problem is a text; an empty list means valid.
 *
 * The early-stop proof follows the scheduler of tests/qualify.js (`certain`): after every result a level
 * stops when it has more than 10 misses, or more than 5 requests over its budget. Both counts grow by at most
 * one per result, so a stopped level shows exactly 11 misses (or 6 slow requests) at the stop, and at most
 * jobs - 1 results that were in flight complete after it. The first round is dispatched in ascending index
 * order (its outcomes are the indexes 0..n-1); the second round is dispatched in descending order, so a
 * stopped second round need not hold a contiguous run of indexes.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  var PROTOCOL = Object.freeze({
    document: 'docs/difficulty-rating/report-detailed.md section 6',
    seedBase: 20260601,
    firstSeeds: 40,
    moreSeeds: 60,
    offerFirst: 36,
    borderFrom: 30,
    offerTotal: 90,
    guardMs: 120000,
    jobs: 4,
    acceptance: 'canonical-required-tier'
  });
  var FIRST = PROTOCOL.firstSeeds;
  var TOTAL = FIRST + PROTOCOL.moreSeeds;
  // Misses and slow requests beyond which no offer is possible any more (the 10 and the 5 of `certain`).
  var MISS_LIMIT = TOTAL - PROTOCOL.offerTotal;
  var SLOW_LIMIT = TOTAL - Math.ceil(0.95 * TOTAL);

  var VARIANTS = Object.freeze(['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX', 'hyper',
    'jigsaw9', 'killer', 'greaterThan', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku']);
  var LEVELS = Object.freeze(['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1',
    'hell2']);

  var HEX16 = /^[0-9a-f]{16}$/;
  var HEX64 = /^[0-9a-f]{64}$/;
  var ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function isInt(value) {
    return isNumber(value) && Math.floor(value) === value;
  }

  /** JSON with the keys of every object sorted: equal data gives equal text. */
  function canon(value) {
    if (Array.isArray(value)) return '[' + value.map(canon).join(',') + ']';
    if (isObject(value)) {
      return '{' + Object.keys(value).sort().filter(function (key) { return value[key] !== undefined; })
        .map(function (key) { return JSON.stringify(key) + ':' + canon(value[key]); }).join(',') + '}';
    }
    var text = JSON.stringify(value);
    return text === undefined ? 'undefined' : text;
  }

  function show(value) {
    var text = value === undefined ? 'undefined' : JSON.stringify(value);
    return text.length > 48 ? text.slice(0, 45) + '...' : text;
  }

  function count(list, test) {
    return list.filter(test).length;
  }

  // -----------------------------------------------------------------------------------------------
  // The decision of tests/qualify.js
  // -----------------------------------------------------------------------------------------------

  /** FNV-1a of a tag on the base seed (the derivation of tests/soak.js, with this seed base). */
  function seedFor(tag) {
    var h = (2166136261 ^ PROTOCOL.seedBase) >>> 0;
    for (var k = 0; k < tag.length; k++) h = Math.imul(h ^ tag.charCodeAt(k), 16777619) >>> 0;
    return h;
  }

  /** p95 budget of a board in milliseconds. */
  function budgetOf(cellCount) {
    if (cellCount <= 36) return 2000;
    if (cellCount <= 81) return 10000;
    return 30000;
  }

  /** Nearest-rank percentile of a sorted array. */
  function percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
  }

  /**
   * The hit of one request from the outcome the worker recorded: the independent checks (a valid puzzle that
   * has a complete proof, no approximate warning), the level the rating reports, and the generator's own
   * `exact` flag, strictly true (a complete proof in the requested level that needs its tier). A level name
   * that matches is a consistency check and never enough: an absent or false `exact` is a miss.
   */
  function hitOf(out, requested) {
    return out.valid === true && out.solved === true && out.approximate === false &&
      out.exact === true && out.achieved === requested;
  }

  /**
   * The verdict of a level from its requests. Only a complete round can offer a level: exactly `firstSeeds`
   * outcomes in the first round, or `firstSeeds + moreSeeds` with the second. `cell` is { done, budget,
   * stopped }: the outcomes, the p95 budget and the reason of an early stop (null: none).
   */
  function decide(cell, probe) {
    var n = cell.done.length;
    var hits = count(cell.done, function (r) { return r.hit; });
    var sorted = cell.done.map(function (r) { return r.ms; }).sort(function (a, b) { return a - b; });
    var p95 = percentile(sorted, 0.95);
    var fast = p95 <= cell.budget;
    var complete = n === FIRST || n === TOTAL;
    var verdict;
    if (probe) verdict = 'probe';
    else if (cell.stopped || !complete) verdict = 'hidden';
    else if (n === FIRST) verdict = hits >= PROTOCOL.offerFirst && fast ? 'offered' : 'hidden';
    else verdict = hits >= PROTOCOL.offerTotal && fast ? 'offered' : 'hidden';
    return {
      n: n, hits: hits, rate: n > 0 ? hits / n : 0, p50: percentile(sorted, 0.5), p95: p95,
      max: sorted.length > 0 ? sorted[sorted.length - 1] : 0, verdict: verdict,
      stopped: cell.stopped || (!probe && !complete ? 'incomplete' : null),
      errors: count(cell.done, function (r) { return r.error; }),
      approximate: count(cell.done, function (r) { return r.approximate; }),
      invalid: count(cell.done, function (r) { return r.valid === false; })
    };
  }

  function fmt(ms) {
    return ms >= 10000 ? (ms / 1000).toFixed(1) + ' s' : ms >= 1000 ? (ms / 1000).toFixed(2) + ' s'
      : ms.toFixed(0) + ' ms';
  }

  /** The table of a record ({ cells }): columns and order of docs/difficulty-rating/qualification.md. */
  function markdownOf(summary) {
    var lines = [];
    lines.push('| variant | level | n | hits | rate | p50 | p95 | max | budget | verdict |');
    lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---|');
    summary.cells.forEach(function (c) {
      var s = c.summary;
      var verdict = s.verdict + (s.stopped ? ' (stopped: ' + s.stopped + ')' : '');
      lines.push('| ' + c.variant + ' | ' + c.level + ' | ' + s.n + ' | ' + s.hits + ' | ' +
        (100 * s.rate).toFixed(0) + ' % | ' + fmt(s.p50) + ' | ' + fmt(s.p95) + ' | ' + fmt(s.max) + ' | ' +
        fmt(c.budget) + ' | ' + verdict + ' |');
    });
    return lines.join('\n') + '\n';
  }

  /** The variants of the registry in its order: { id, cellCount (built model), attempts (the default) }. */
  function matrixOf(engine) {
    return engine.variants.list().map(function (def) {
      var model = def.build({}, engine.rng.create(PROTOCOL.seedBase).fork('build:' + def.id));
      return {
        id: def.id, cellCount: model.cellCount,
        attempts: engine.digger.defaultMaxAttempts(engine.variants.cellCountOf(def))
      };
    });
  }

  // -----------------------------------------------------------------------------------------------
  // One cell
  // -----------------------------------------------------------------------------------------------

  /** The problems of one request, judged alone: key, index, derived seed, time and a complete outcome. */
  function requestProblems(r, key, level) {
    if (!isObject(r)) return ['is not an object'];
    var problems = [];
    if (r.key !== key) problems.push('key ' + show(r.key) + ' is not ' + key);
    if (!(isInt(r.index) && r.index >= 0 && r.index < TOTAL)) {
      problems.push('index ' + show(r.index) + ' is not a whole number from 0 to ' + (TOTAL - 1));
    } else if (r.seed !== seedFor(key + '/' + r.index)) {
      problems.push('seed ' + show(r.seed) + ' is not the derived ' + seedFor(key + '/' + r.index));
    }
    if (!isNumber(r.ms) || r.ms < 0) {
      problems.push('ms ' + show(r.ms) + ' is not a finite number of at least 0');
    }
    if (typeof r.hit !== 'boolean') problems.push('hit ' + show(r.hit) + ' is not a boolean');
    if (r.error !== undefined) {
      if (typeof r.error !== 'string' || r.error === '') {
        problems.push('error ' + show(r.error) + ' is not a text');
      }
      if (r.hit !== false) problems.push('has an error and is counted as a hit');
      return problems;
    }
    var missing = ['valid', 'solved', 'approximate', 'exact'].filter(function (name) {
      return typeof r[name] !== 'boolean';
    });
    if (missing.length > 0) {
      problems.push('has no outcome: neither an error nor a complete result (' + missing.join(', ') +
        ' missing)');
      return problems;
    }
    if (!(r.achieved === undefined || r.achieved === null || typeof r.achieved === 'string')) {
      problems.push('achieved ' + show(r.achieved) + ' is not a level');
    }
    if (!(r.score === undefined || r.score === null || isNumber(r.score))) {
      problems.push('score ' + show(r.score) + ' is not a number');
    }
    if (typeof r.hit === 'boolean' && r.hit !== hitOf(r, level)) {
      problems.push('hit ' + r.hit + ' does not follow from its own outcome (valid, solved, approximate, ' +
        'exact and the achieved level)');
    }
    return problems;
  }

  /**
   * The rounds and the stop of a level whose requests are individually valid and unique. `stopped` is the
   * recorded reason (null, 'misses' or 'time'); `expect` has `jobs` and `earlyStop`.
   */
  function roundProblems(requests, budget, stopped, expect) {
    var problems = [];
    var n = requests.length;
    var indexes = requests.map(function (r) { return r.index; }).sort(function (a, b) { return a - b; });
    var prefix = indexes.every(function (index, i) { return index === i; });
    var first = requests.filter(function (r) { return r.index < FIRST; });
    var secondRound = n - first.length;
    var slow = function (r) { return r.ms > budget; };
    var firstHits = count(first, function (r) { return r.hit; });
    var misses = n - count(requests, function (r) { return r.hit; });
    var over = count(requests, slow);
    var spare = expect.jobs - 1;

    if (secondRound > 0) {
      if (first.length !== FIRST || firstHits < PROTOCOL.borderFrom || firstHits >= PROTOCOL.offerFirst) {
        problems.push('has second-round outcomes, which need all ' + FIRST + ' first-round outcomes with ' +
          PROTOCOL.borderFrom + ' to ' + (PROTOCOL.offerFirst - 1) + ' hits (it has ' + first.length +
          ' with ' + firstHits + ' hits)');
      } else if (expect.earlyStop && count(first, slow) > SLOW_LIMIT) {
        problems.push('has second-round outcomes, but its first round had ' + count(first, slow) +
          ' requests over the budget: the early stop would have ended the level');
      }
    }

    if (stopped === null) {
      if (secondRound > 0 ? n !== TOTAL : !(n === FIRST && prefix)) {
        problems.push('has ' + n + ' outcomes without an early stop: a verdict needs exactly ' + FIRST +
          ' (the indexes 0..' + (FIRST - 1) + ') or ' + TOTAL + ' outcomes');
      } else if (secondRound === 0 && firstHits >= PROTOCOL.borderFrom && firstHits < PROTOCOL.offerFirst) {
        problems.push(firstHits + ' hits of ' + FIRST + ' need the second round of ' + PROTOCOL.moreSeeds +
          ' more requests, and it has none');
      }
      if (expect.earlyStop && (misses > MISS_LIMIT || over > SLOW_LIMIT)) {
        problems.push('has ' + misses + ' misses and ' + over + ' requests over the budget without a stop, ' +
          'but the early stop ends a level beyond ' + MISS_LIMIT + ' misses or ' + SLOW_LIMIT +
          ' slow requests');
      }
      return problems;
    }

    if (!expect.earlyStop) {
      return problems.concat('is stopped (' + stopped + ') in a shard that ran without early stop');
    }
    if (secondRound === 0 && !prefix) {
      problems.push('stopped in the first round, whose outcomes are the indexes 0..' + (n - 1) +
        ' (the first round is dispatched in ascending order)');
    }
    if (stopped === 'misses') {
      if (misses <= MISS_LIMIT) {
        problems.push('stopped for misses with ' + misses + ' misses: the proof needs more than ' +
          MISS_LIMIT);
      } else if (misses > MISS_LIMIT + 1 + spare) {
        problems.push('stopped for misses at ' + (MISS_LIMIT + 1) + ' misses, which leaves at most ' + spare +
          ' more results in flight, but it has ' + misses);
      }
      if (over > SLOW_LIMIT + 1 + spare) {
        problems.push('stopped for misses, with ' + over + ' requests over the budget: the slow-request ' +
          'stop would have come first');
      }
    } else {
      if (over <= SLOW_LIMIT) {
        problems.push('stopped for time with ' + over + ' requests over the budget: the proof needs more ' +
          'than ' + SLOW_LIMIT);
      } else if (over > SLOW_LIMIT + 1 + spare) {
        problems.push('stopped for time at ' + (SLOW_LIMIT + 1) + ' slow requests, which leaves at most ' +
          spare + ' more results in flight, but it has ' + over);
      }
      if (misses > MISS_LIMIT + spare) {
        problems.push('stopped for time, with ' + misses + ' misses: the miss stop would have come first');
      }
    }
    return problems;
  }

  /**
   * The problems of one cell record { variant, level, cellCount, budget, attempts, summary, requests } of a
   * shard (an empty array: valid). `expect` is { cellCount, attempts, jobs, earlyStop } of that variant. The
   * summary is recomputed from the requests with `decide` and has to agree in every field.
   */
  function checkCell(cell, expect) {
    if (!isObject(cell)) return ['is not an object'];
    var problems = [];
    var key = cell.variant + '/' + cell.level;
    if (cell.cellCount !== expect.cellCount) {
      problems.push('cellCount ' + show(cell.cellCount) + ' is not ' + expect.cellCount);
    }
    if (cell.budget !== budgetOf(expect.cellCount)) {
      problems.push('budget ' + show(cell.budget) + ' is not ' + budgetOf(expect.cellCount) + ' ms');
    }
    if (cell.attempts !== expect.attempts) {
      problems.push('attempts ' + show(cell.attempts) + ' is not the size default ' + expect.attempts +
        ' of a board of ' + expect.cellCount + ' cells');
    }
    if (!Array.isArray(cell.requests)) return problems.concat('requests is not an array');
    if (!isObject(cell.summary)) return problems.concat('summary is not an object');
    var seen = {};
    var bad = false;
    cell.requests.forEach(function (r, i) {
      var found = requestProblems(r, key, cell.level);
      var label = 'request ' + (isObject(r) && isInt(r.index) ? '#' + r.index : 'at position ' + i);
      if (isObject(r) && isInt(r.index)) {
        if (seen[r.index]) found.push('index ' + r.index + ' appears twice');
        seen[r.index] = true;
      }
      found.forEach(function (problem) { problems.push(label + ' ' + problem); });
      if (found.length > 0) bad = true;
    });
    if (bad) return problems;
    var stopped = cell.summary.stopped;
    if (stopped !== null && stopped !== 'misses' && stopped !== 'time') {
      problems.push('stopped ' + show(stopped) + ' is not an early-stop reason (null, "misses" or "time"): a ' +
        'level without a verdict and without a proof of one cannot be merged');
      return problems.concat(roundProblems(cell.requests, cell.budget, null, expect));
    }
    problems = problems.concat(roundProblems(cell.requests, cell.budget, stopped, expect));
    var fresh = decide({ done: cell.requests, budget: cell.budget, stopped: stopped }, false);
    Object.keys(fresh).forEach(function (name) {
      if (canon(cell.summary[name]) !== canon(fresh[name])) {
        problems.push('summary.' + name + ' is ' + show(cell.summary[name]) + ', but its requests give ' +
          show(fresh[name]));
      }
    });
    Object.keys(cell.summary).forEach(function (name) {
      if (!(name in fresh)) problems.push('summary.' + name + ' is not a field of a summary');
    });
    return problems;
  }

  // -----------------------------------------------------------------------------------------------
  // One shard and the merge
  // -----------------------------------------------------------------------------------------------

  function offeredBy(cells) {
    var support = {};
    cells.forEach(function (c) {
      if (!support[c.variant]) support[c.variant] = [];
      if (c.summary.verdict === 'offered') support[c.variant].push(c.level);
    });
    return support;
  }

  /** The problems of the metadata of one shard (everything but its cells), against what the tree says. */
  function headerProblems(s, expect) {
    if (!isObject(s)) return ['is not a qualification record (not an object)'];
    var problems = [];
    var same = function (name, wanted, why) {
      if (canon(s[name]) !== canon(wanted)) {
        problems.push(name + ' is ' + show(s[name]) + ', not ' + show(wanted) +
          (why ? ' (' + why + ')' : ''));
      }
    };
    if (s.shards !== undefined) problems.push('is a merged record (it has "shards"), not a shard');
    same('protocol', PROTOCOL.document);
    same('seedBase', PROTOCOL.seedBase);
    if (s.qualifierHash === undefined) {
      problems.push('has no qualifierHash: it was written by a qualifier older than MS07d, or by hand');
    } else if (typeof s.qualifierHash !== 'string' || !HEX64.test(s.qualifierHash)) {
      problems.push('qualifierHash is not a SHA-256 hex string');
    } else {
      same('qualifierHash', expect.qualifierHash, 'qualify.js or its helper changed since the run');
    }
    same('acceptance', PROTOCOL.acceptance);
    same('ratingVersion', expect.ratingVersion, 'recorded by another engine');
    same('probe', 0, 'a probe is a quick look, never a qualification');
    if (typeof s.earlyStop !== 'boolean') {
      problems.push('earlyStop ' + show(s.earlyStop) + ' is not a boolean');
    }
    same('guardMs', PROTOCOL.guardMs);
    same('attemptPolicy', expect.attemptPolicy, 'the size-default attempts of another source');
    var machine = s.machine;
    if (!isObject(machine)) {
      problems.push('machine is not an object');
    } else {
      ['cpu', 'platform', 'node'].forEach(function (name) {
        if (typeof machine[name] !== 'string' || machine[name] === '') {
          problems.push('machine.' + name + ' is not a text');
        }
      });
      ['logicalProcessors', 'memoryGb'].forEach(function (name) {
        if (!isNumber(machine[name])) problems.push('machine.' + name + ' is not a number');
      });
      if (machine.jobs !== expect.jobs) {
        problems.push('machine.jobs is ' + show(machine.jobs) + ', not ' + expect.jobs +
          ' (the qualification always runs with --jobs=' + expect.jobs + ')');
      }
    }
    var engine = s.engine;
    if (!isObject(engine)) {
      problems.push('engine is not an object');
    } else {
      if (typeof engine.sources !== 'string' || !HEX16.test(engine.sources)) {
        problems.push('engine.sources is not a hash of the sources');
      } else if (engine.sources !== expect.sources) {
        problems.push('engine.sources ' + engine.sources + ' is not the current ' + expect.sources +
          ' (recorded from other sources)');
      }
      if (engine.commit !== null && typeof engine.commit !== 'string') {
        problems.push('engine.commit is not a text or null');
      }
      if (engine.dirty !== null && typeof engine.dirty !== 'boolean') {
        problems.push('engine.dirty is not a boolean or null');
      }
    }
    var startedMs = ISO.test(String(s.started)) ? Date.parse(s.started) : NaN;
    var finishedMs = ISO.test(String(s.finished)) ? Date.parse(s.finished) : NaN;
    if (isNaN(startedMs)) problems.push('started ' + show(s.started) + ' is not a time');
    if (isNaN(finishedMs)) problems.push('finished ' + show(s.finished) + ' is not a time');
    if (!isNaN(startedMs) && !isNaN(finishedMs)) {
      var span = (finishedMs - startedMs) / 1000;
      if (span < 0) problems.push('finished is before started');
      else if (!isInt(s.seconds) || s.seconds < 0 || Math.abs(s.seconds - span) > 1) {
        problems.push('seconds ' + show(s.seconds) + ' does not match the ' + span.toFixed(1) +
          ' s between started and finished');
      }
    }
    if (!Array.isArray(s.cells) || s.cells.length === 0) {
      problems.push('cells is not a list with at least one cell');
    } else if (!isObject(s.support)) {
      problems.push('support is not an object');
    } else if (s.cells.every(function (c) { return isObject(c) && isObject(c.summary); })) {
      same('support', offeredBy(s.cells), 'it is derived from the verdicts of its cells');
    }
    return problems;
  }

  function byName(a, b) {
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  }

  /**
   * Merges the shards. `files` is [{ name, shard }] (or { name, error } for a file that could not be read or
   * parsed). Valid only when every shard is valid, the shards agree (one machine and Node, one early-stop
   * setting, no two shards running at the same time) and every one of the 15 x 9 cells appears exactly once.
   * The commit and the dirty flag are provenance of each shard, kept per shard and never compared: the hashes
   * of the sources and of the tool are the identity. The record exists only for a valid merge (`record` is
   * null otherwise).
   * @returns {{ ok: boolean, problems: string[], record: (Object|null) }}
   */
  function merge(files, expect) {
    var problems = [];
    var wanted = [];
    var wantedBy = {};
    expect.variants.forEach(function (v) {
      LEVELS.forEach(function (level) {
        var entry = { key: v.id + '/' + level, variant: v, level: level };
        wanted.push(entry);
        wantedBy[entry.key] = entry;
      });
    });
    if (canon(expect.variants.map(function (v) { return v.id; })) !== canon(VARIANTS) ||
        canon(expect.levels) !== canon(LEVELS)) {
      problems.push('the registry of the engine is not the 15 variants x 9 levels of the qualification ' +
        'manifest (checklist Q)');
    }
    if (expect.jobs !== PROTOCOL.jobs) {
      problems.push('--jobs=' + expect.jobs + ': the qualification always runs with --jobs=' + PROTOCOL.jobs);
    }
    var ordered = files.slice().sort(byName);
    if (ordered.length === 0) problems.push('no shard (*.json) to merge');
    var found = {};
    var shards = [];
    ordered.forEach(function (file) {
      if (file.error !== undefined) {
        problems.push(file.name + ': ' + file.error);
        return;
      }
      var s = file.shard;
      var own = headerProblems(s, expect);
      own.forEach(function (problem) { problems.push(file.name + ': ' + problem); });
      if (!isObject(s) || !Array.isArray(s.cells)) return;
      var keys = [];
      s.cells.forEach(function (cell, i) {
        if (!isObject(cell) || typeof cell.variant !== 'string' || typeof cell.level !== 'string') {
          problems.push(file.name + ': cell at position ' + i + ' has no variant and level');
          return;
        }
        var key = cell.variant + '/' + cell.level;
        var entry = wantedBy[key];
        if (!entry) {
          problems.push(file.name + ': ' + key + ' is not one of the 135 cells of the matrix');
          return;
        }
        keys.push(key);
        (found[key] = found[key] || []).push({ name: file.name, cell: cell });
        checkCell(cell, {
          cellCount: entry.variant.cellCount, attempts: entry.variant.attempts, jobs: expect.jobs,
          earlyStop: s.earlyStop === true
        }).forEach(function (problem) { problems.push(file.name + ': ' + key + ': ' + problem); });
      });
      shards.push({ name: file.name, shard: s, keys: keys, headerOk: own.length === 0 });
    });
    Object.keys(found).forEach(function (key) {
      if (found[key].length > 1) {
        problems.push(key + ': duplicate, recorded by ' +
          found[key].map(function (x) { return x.name; }).join(' and '));
      }
    });
    var missing = wanted.filter(function (w) { return !found[w.key]; }).map(function (w) { return w.key; });
    if (missing.length > 0) {
      problems.push('missing ' + missing.length + ' of ' + wanted.length + ' cells: ' +
        missing.slice(0, 12).join(', ') +
        (missing.length > 12 ? ' and ' + (missing.length - 12) + ' more' : ''));
    }
    crossProblems(shards.filter(function (x) { return x.headerOk; })).forEach(function (problem) {
      problems.push(problem);
    });
    if (problems.length > 0) return { ok: false, problems: problems, record: null };
    return { ok: true, problems: [], record: recordOf(shards, found, wanted, expect) };
  }

  /** What the valid shards share: one machine and Node, one early-stop setting, no overlap in time. */
  function crossProblems(usable) {
    var problems = [];
    var head = usable[0];
    usable.forEach(function (x) {
      var mine = x.shard.machine;
      var first = head.shard.machine;
      Object.keys(Object.assign({}, first, mine)).forEach(function (name) {
        if (name !== 'jobs' && canon(mine[name]) !== canon(first[name])) {
          problems.push(x.name + ': machine.' + name + ' is ' + show(mine[name]) + ', but ' + head.name +
            ' ran on ' + show(first[name]) + ' (one machine and one Node per qualification)');
        }
      });
      if (x.shard.earlyStop !== head.shard.earlyStop) {
        problems.push(x.name + ': earlyStop ' + x.shard.earlyStop + ' differs from ' + head.shard.earlyStop +
          ' of ' + head.name);
      }
    });
    var byStart = usable.slice().sort(function (a, b) {
      return Date.parse(a.shard.started) - Date.parse(b.shard.started);
    });
    for (var i = 1; i < byStart.length; i++) {
      var before = byStart[i - 1];
      if (Date.parse(byStart[i].shard.started) < Date.parse(before.shard.finished)) {
        problems.push(byStart[i].name + ' started before ' + before.name + ' finished: the qualifier is ' +
          'never run twice at the same time');
      }
    }
    return problems;
  }

  /** The merged record of valid shards: the metadata once, each shard's own, the 135 cells in order. */
  function recordOf(shards, found, wanted, expect) {
    var head = shards[0].shard;
    var startedMs = Math.min.apply(null, shards.map(function (x) { return Date.parse(x.shard.started); }));
    var finishedMs = Math.max.apply(null, shards.map(function (x) { return Date.parse(x.shard.finished); }));
    var dirty = shards.some(function (x) { return x.shard.engine.dirty === true; }) ? true
      : shards.every(function (x) { return x.shard.engine.dirty === false; }) ? false : null;
    var commits = [];
    shards.forEach(function (x) {
      var commit = x.shard.engine.commit;
      if (commit !== null && commits.indexOf(commit) === -1) commits.push(commit);
    });
    commits.sort();
    var cells = wanted.map(function (w) {
      var cell = found[w.key][0].cell;
      var out = {};
      Object.keys(cell).forEach(function (name) {
        out[name] = name === 'requests' ?
          cell.requests.slice().sort(function (a, b) { return a.index - b.index; }) : cell[name];
      });
      return out;
    });
    var totals = {
      cells: cells.length, requests: 0, hits: 0, errors: 0, approximate: 0, invalid: 0, offered: 0, hidden: 0,
      stopped: 0
    };
    cells.forEach(function (c) {
      totals.requests += c.summary.n;
      totals.hits += c.summary.hits;
      totals.errors += c.summary.errors;
      totals.approximate += c.summary.approximate;
      totals.invalid += c.summary.invalid;
      totals[c.summary.verdict] += 1;
      if (c.summary.stopped) totals.stopped += 1;
    });
    return {
      protocol: head.protocol, seedBase: head.seedBase, machine: head.machine,
      engine: {
        sources: head.engine.sources, commit: commits.length === 1 ? commits[0] : null, commits: commits,
        dirty: dirty
      },
      qualifierHash: head.qualifierHash, acceptance: head.acceptance, ratingVersion: head.ratingVersion,
      probe: 0, earlyStop: head.earlyStop, guardMs: head.guardMs, attemptPolicy: head.attemptPolicy,
      matrix: {
        variants: expect.variants.map(function (v) { return v.id; }), levels: LEVELS.slice(),
        cells: wanted.length
      },
      started: new Date(startedMs).toISOString(), finished: new Date(finishedMs).toISOString(),
      wallSpanSeconds: Math.round((finishedMs - startedMs) / 1000),
      shardSeconds: shards.reduce(function (sum, x) { return sum + x.shard.seconds; }, 0),
      shards: shards.map(function (x) {
        return {
          file: x.name, started: x.shard.started, finished: x.shard.finished, seconds: x.shard.seconds,
          engine: x.shard.engine, cells: x.keys
        };
      }),
      totals: totals,
      cells: cells,
      support: offeredBy(cells)
    };
  }

  // -----------------------------------------------------------------------------------------------
  // The text of a record
  // -----------------------------------------------------------------------------------------------

  function toCrlf(text) {
    return text.replace(/\r?\n/g, '\r\n');
  }

  /**
   * The text of a shard or a merged record: one line per field, per shard and per request, so that the files
   * stay readable and their differences small; the same data as JSON.stringify, UTF-8, CRLF, a final line
   * end.
   */
  function recordText(record) {
    var lines = ['{'];
    var keys = Object.keys(record).filter(function (key) { return record[key] !== undefined; });
    keys.forEach(function (key, i) {
      var comma = i < keys.length - 1 ? ',' : '';
      var value = record[key];
      if (key === 'shards' && Array.isArray(value)) {
        lines.push('  "shards": [');
        value.forEach(function (shard, j) {
          lines.push('    ' + JSON.stringify(shard) + (j < value.length - 1 ? ',' : ''));
        });
        lines.push('  ]' + comma);
      } else if (key === 'cells' && Array.isArray(value)) {
        lines.push('  "cells": [');
        value.forEach(function (cell, j) {
          lines.push('    {');
          var fields = Object.keys(cell).filter(function (name) { return cell[name] !== undefined; });
          fields.forEach(function (name, k) {
            var tail = k < fields.length - 1 ? ',' : '';
            if (name === 'requests') {
              lines.push('      "requests": [');
              cell.requests.forEach(function (r, m) {
                lines.push('        ' + JSON.stringify(r) + (m < cell.requests.length - 1 ? ',' : ''));
              });
              lines.push('      ]' + tail);
            } else {
              lines.push('      ' + JSON.stringify(name) + ': ' + JSON.stringify(cell[name]) + tail);
            }
          });
          lines.push('    }' + (j < value.length - 1 ? ',' : ''));
        });
        lines.push('  ]' + comma);
      } else {
        lines.push('  ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + comma);
      }
    });
    lines.push('}');
    return lines.join('\r\n') + '\r\n';
  }

  SG.fixtures.qualificationRecords = {
    PROTOCOL: PROTOCOL,
    VARIANTS: VARIANTS,
    LEVELS: LEVELS,
    canon: canon,
    seedFor: seedFor,
    budgetOf: budgetOf,
    percentile: percentile,
    hitOf: hitOf,
    decide: decide,
    fmt: fmt,
    markdownOf: markdownOf,
    matrixOf: matrixOf,
    checkCell: checkCell,
    merge: merge,
    recordText: recordText,
    toCrlf: toCrlf
  };
})();
