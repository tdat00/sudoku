// The qualification merger (difficulty v3, MS07d): the pure helpers of tests/fixtures/qualification-records.js on
// synthetic records, and, in Node only, tests/qualify.js itself (its merge mode, and its scheduler on fake workers)
// in a context of its own, plus five real processes on a scratch folder. No request is generated and nothing is
// measured: every record below is unit data built here, never evidence of a qualification (the real ones are
// the shards of MS07e and MS18c, merged with `node tests/qualify.js --merge=<folder> --jobs=4`).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var Q = SG.fixtures.qualificationRecords;

  // The 15 variants of checklist Q with the size of their board and the default attempts of that size.
  var MATRIX = [
    { id: 'classic4', cellCount: 16, attempts: 8 }, { id: 'classic6', cellCount: 36, attempts: 8 },
    { id: 'classic9', cellCount: 81, attempts: 8 }, { id: 'mega12', cellCount: 144, attempts: 4 },
    { id: 'mega16', cellCount: 256, attempts: 2 }, { id: 'diagonalX', cellCount: 81, attempts: 8 },
    { id: 'hyper', cellCount: 81, attempts: 8 }, { id: 'jigsaw9', cellCount: 81, attempts: 8 },
    { id: 'killer', cellCount: 81, attempts: 8 }, { id: 'greaterThan', cellCount: 81, attempts: 8 },
    { id: 'samurai', cellCount: 369, attempts: 2 }, { id: 'sohei', cellCount: 288, attempts: 2 },
    { id: 'butterfly', cellCount: 144, attempts: 4 }, { id: 'flower', cellCount: 189, attempts: 2 },
    { id: 'wordoku', cellCount: 81, attempts: 8 }
  ];
  var BY_ID = {};
  var NAMES = {};
  MATRIX.forEach(function (v, n) {
    BY_ID[v.id] = v;
    NAMES[v.id] = (n < 9 ? '0' : '') + (n + 1) + '-' + v.id + '.json';
  });

  function repeat(text, times) {
    return new Array(times + 1).join(text);
  }

  var IDENTITY = {
    sources: '0123456789abcdef', qualifierHash: repeat('ab', 32),
    policy: {
      function: 'SG.digger.defaultMaxAttempts', explicitMaxAttempts: false,
      sources: { 'js/engine/digger.js': repeat('d', 64), 'js/engine/pipeline.js': repeat('e', 64),
        'js/variants/registry.js': repeat('f', 64) }
    }
  };

  function expectOf(identity) {
    return {
      jobs: 4, sources: identity.sources, qualifierHash: identity.qualifierHash,
      ratingVersion: SG.difficulty.RATING_VERSION, attemptPolicy: identity.policy,
      variants: MATRIX.map(function (v) { return { id: v.id, cellCount: v.cellCount, attempts: v.attempts }; }),
      levels: Q.LEVELS.slice()
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function range(from, to) {
    var list = [];
    for (var i = from; i < to; i++) list.push(i);
    return list;
  }

  // -----------------------------------------------------------------------------------------------
  // Synthetic requests, cells and shards
  // -----------------------------------------------------------------------------------------------

  /** One request, shaped as the worker of tests/qualify.js records it. */
  function outcome(key, level, index, hit, ms) {
    return {
      key: key, index: index, seed: Q.seedFor(key + '/' + index), hit: hit, ms: ms, achieved: level, score: 100,
      solved: true, approximate: !hit, exact: hit, valid: true
    };
  }

  /** The requests of the given indexes: `miss(i)` makes request i a miss, `slow(i)` one over the budget. */
  function requests(vid, level, indexes, miss, slow) {
    var budget = Q.budgetOf(BY_ID[vid].cellCount);
    return indexes.map(function (i) {
      return outcome(vid + '/' + level, level, i, !(miss && miss(i)), slow && slow(i) ? budget + 1 : 100 + i);
    });
  }

  /** A cell record with the summary the scheduler would have written for these requests. */
  function cellOf(vid, level, list, stopped) {
    var v = BY_ID[vid];
    var budget = Q.budgetOf(v.cellCount);
    var sorted = list.slice().sort(function (a, b) { return a.index - b.index; });
    return {
      variant: vid, level: level, cellCount: v.cellCount, budget: budget, attempts: v.attempts,
      summary: Q.decide({ done: sorted, budget: budget, stopped: stopped || null }, false), requests: sorted
    };
  }

  /** The problems of a cell of classic9 / normal (81 cells, a 10 s budget), the shard run with four jobs. */
  function check(cell, extra) {
    return Q.checkCell(cell, Object.assign({ cellCount: cell.cellCount, attempts: cell.attempts, jobs: 4,
      earlyStop: true }, extra || {}));
  }

  function classic9(list, stopped) {
    return cellOf('classic9', 'normal', list, stopped);
  }

  function offeredCell(vid, level) {
    return cellOf(vid, level, requests(vid, level, range(0, 40)));
  }

  /** The cells of the synthetic matrix: mostly offered, and one of every other kind of record. */
  function matrixCell(vid, level) {
    var key = vid + '/' + level;
    if (key === 'classic4/hell2') {
      return cellOf(vid, level, requests(vid, level, range(0, 14), function (i) { return i < 11; }), 'misses');
    }
    if (key === 'mega16/hell1') {
      return cellOf(vid, level, requests(vid, level, range(0, 100), function (i) {
        return i < 7 || (i >= 40 && i < 43);
      }));
    }
    if (key === 'samurai/nightmare') {
      return cellOf(vid, level, requests(vid, level, range(0, 9), null, function (i) { return i < 6; }), 'time');
    }
    if (key === 'flower/hell1') {
      var list = requests(vid, level, range(0, 40));
      list[12] = { key: key, index: 12, seed: Q.seedFor(key + '/12'), hit: false, ms: 120000,
        error: 'budget.exhausted' };
      return cellOf(vid, level, list);
    }
    return offeredCell(vid, level);
  }

  function isoAt(minute, second) {
    return new Date(Date.UTC(2026, 10, 15, 8, minute, second)).toISOString();
  }

  /** A shard of the given cells, the n-th of its collection (a minute apart, 30 s each), jobs 4. */
  function shardOf(cells, n, identity, patch) {
    var support = {};
    cells.forEach(function (c) {
      support[c.variant] = support[c.variant] || [];
      if (c.summary.verdict === 'offered') support[c.variant].push(c.level);
    });
    var shard = {
      protocol: 'docs/difficulty-rating/report-detailed.md section 6', seedBase: 20260601,
      machine: { cpu: 'Test CPU @ 3.0 GHz', logicalProcessors: 16, memoryGb: 32, platform: 'win32 10.0.26200',
        node: 'v26.13.0', jobs: 4 },
      engine: { sources: identity.sources, commit: 'abc1234', dirty: n > 0 },
      qualifierHash: identity.qualifierHash, acceptance: 'canonical-required-tier',
      ratingVersion: SG.difficulty.RATING_VERSION, probe: 0, earlyStop: true, guardMs: 120000,
      attemptPolicy: clone(identity.policy), started: isoAt(n, 0), finished: isoAt(n, 30), seconds: 30,
      cells: cells, support: support
    };
    return Object.assign(shard, patch || {});
  }

  /** The 15 shards (one per variant, nine levels each) of the synthetic matrix: [{ name, shard }]. */
  function fullFiles(identity) {
    return MATRIX.map(function (v, n) {
      return {
        name: NAMES[v.id],
        shard: shardOf(Q.LEVELS.map(function (level) { return matrixCell(v.id, level); }), n, identity || IDENTITY)
      };
    });
  }

  function fileOf(files, id) {
    return files.filter(function (f) { return f.name === NAMES[id]; })[0];
  }

  /** Rebuilds a shard around other cells (so that its support list follows them). */
  function withCells(file, cells, identity) {
    var id = Object.keys(NAMES).filter(function (key) { return NAMES[key] === file.name; })[0];
    return { name: file.name, shard: shardOf(cells, MATRIX.indexOf(BY_ID[id]), identity || IDENTITY,
      { started: file.shard.started, finished: file.shard.finished }) };
  }

  function mergeOf(files, patch) {
    return Q.merge(files, Object.assign(expectOf(IDENTITY), patch || {}));
  }

  function problemsOf(files, patch) {
    var result = mergeOf(files, patch);
    expect(result.ok).toBe(false);
    expect(result.record).toBeNull();
    return result.problems;
  }

  function mentions(problems, pattern) {
    return problems.filter(function (p) { return pattern.test(p); }).length;
  }

  /** The conventions of a text file: no BOM, CRLF only, a final line end, no trailing whitespace. */
  function formatProblem(text) {
    if (text.charCodeAt(0) === 65279) return 'BOM';
    if (/(?<!\r)\n|\r(?!\n)/.test(text)) return 'bare line end';
    if (/[ \t]+\r?$/m.test(text)) return 'trailing whitespace';
    if (!/\r\n$/.test(text)) return 'no final line end';
    return null;
  }

  function fnv(base, tag) {
    var h = (2166136261 ^ base) >>> 0;
    for (var k = 0; k < tag.length; k++) h = Math.imul(h ^ tag.charCodeAt(k), 16777619) >>> 0;
    return h;
  }

  // -----------------------------------------------------------------------------------------------
  // The decision shared with tests/qualify.js
  // -----------------------------------------------------------------------------------------------

  describe('qualification records: the protocol and the decision', function () {
    it('derives the seed of a request from the qualification base, not from the soak\'s', function () {
      ['classic4/veryEasy/0', 'classic9/nightmare/39', 'mega16/hell1/99', 'samurai/hell2/17'].forEach(function (tag) {
        expect(Q.seedFor(tag)).toBe(fnv(20260601, tag));
        expect(Q.seedFor(tag)).not.toBe(fnv(20260101, tag));
      });
      // The values of tests/qualify.js before MS07d: the derivation is unchanged.
      expect(Q.seedFor('classic4/veryEasy/0')).toBe(3336360352);
      expect(Q.seedFor('classic9/nightmare/39')).toBe(277978590);
      expect(Q.seedFor('mega16/hell1/99')).toBe(243942779);
      expect(Q.seedFor('samurai/hell2/17')).toBe(491075607);
      expect(Q.PROTOCOL.seedBase).toBe(20260601);
    });

    it('keeps the protocol constants: 40 then 60 more, 36 / 30 / 90, the 120 s guard, four jobs', function () {
      var P = Q.PROTOCOL;
      expect([P.firstSeeds, P.moreSeeds, P.offerFirst, P.borderFrom, P.offerTotal, P.guardMs, P.jobs])
        .toEqual([40, 60, 36, 30, 90, 120000, 4]);
      expect(P.acceptance).toBe('canonical-required-tier');
      [[16, 2000], [36, 2000], [37, 10000], [81, 10000], [82, 30000], [369, 30000]].forEach(function (row) {
        expect([row[0], Q.budgetOf(row[0])]).toEqual(row);
      });
      var twenty = range(1, 21);
      expect([Q.percentile(twenty, 0.95), Q.percentile([], 0.5), Q.percentile([5], 0.95)]).toEqual([19, 0, 5]);
    });

    it('is the matrix of the live registry: 15 variants, nine levels, their sizes and default attempts',
      function () {
        var live = Q.matrixOf(SG);
        expect(live).toEqual(MATRIX);
        expect(Q.VARIANTS.slice()).toEqual(live.map(function (v) { return v.id; }));
        expect(Q.LEVELS.slice()).toEqual(SG.difficulty.LEVELS.slice());
        live.forEach(function (v) { expect(v.attempts).toBe(SG.digger.defaultMaxAttempts(v.cellCount)); });
      });

    it('decides a level as the scheduler does: a complete round, the hits and the p95', function () {
      var rows = [
        // [outcomes, hits, slow requests, stopped, verdict, stopped in the summary]
        [40, 36, 0, null, 'offered', null], [40, 35, 0, null, 'hidden', null], [40, 40, 3, null, 'hidden', null],
        [100, 90, 0, null, 'offered', null], [100, 89, 0, null, 'hidden', null], [100, 95, 5, null, 'offered', null],
        [100, 95, 6, null, 'hidden', null], [39, 39, 0, null, 'hidden', 'incomplete'],
        [14, 3, 0, 'misses', 'hidden', 'misses'], [40, 40, 0, 'time', 'hidden', 'time']
      ];
      rows.forEach(function (row) {
        var done = range(0, row[0]).map(function (i) {
          return { index: i, hit: i < row[1], ms: i >= row[0] - row[2] ? 10001 : 5 };
        });
        var s = Q.decide({ done: done, budget: 10000, stopped: row[3] }, false);
        expect([row[0] + '/' + row[1], s.n, s.hits, s.verdict, s.stopped])
          .toEqual([row[0] + '/' + row[1], row[0], row[1], row[4], row[5]]);
      });
      expect(Q.decide({ done: [{ index: 0, hit: true, ms: 1 }], budget: 10, stopped: null }, true).verdict)
        .toBe('probe');
    });
  });

  // -----------------------------------------------------------------------------------------------
  // One cell: the requests, the rounds and the early-stop proof
  // -----------------------------------------------------------------------------------------------

  describe('qualification records: one cell', function () {
    it('accepts 36 hits of 40, fast: offered (indexes 0..39)', function () {
      var cell = classic9(requests('classic9', 'normal', range(0, 40), function (i) { return i < 4; }));
      expect(check(cell)).toEqual([]);
      expect([cell.summary.verdict, cell.summary.hits, cell.summary.n, cell.summary.stopped])
        .toEqual(['offered', 36, 40, null]);
      var slow = classic9(requests('classic9', 'normal', range(0, 40), null, function (i) { return i < 3; }));
      expect(check(slow)).toEqual([]);
      expect(slow.summary.verdict).toBe('hidden');
    });

    it('refuses 35 hits of 40 without the second round: an incomplete expansion is no verdict', function () {
      var cell = classic9(requests('classic9', 'normal', range(0, 40), function (i) { return i < 5; }));
      var problems = check(cell);
      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatch(/35 hits of 40 need the second round of 60 more requests/);
      var truncated = classic9(requests('classic9', 'normal', range(0, 70), function (i) { return i < 7; }));
      expect(check(truncated).join('|')).toMatch(/has 70 outcomes without an early stop/);
      var short = classic9(requests('classic9', 'normal', range(0, 39)));
      expect(check(short).join('|')).toMatch(/has 39 outcomes without an early stop/);
      expect(check(short).join('|')).toMatch(/stopped "incomplete" is not an early-stop reason/);
    });

    it('accepts 90 hits of 100, fast: offered, and 89 of 100 hidden when no early stop was used', function () {
      var ninety = classic9(requests('classic9', 'normal', range(0, 100), function (i) {
        return i < 7 || (i >= 40 && i < 43);
      }));
      expect(check(ninety)).toEqual([]);
      expect([ninety.summary.verdict, ninety.summary.hits, ninety.summary.n]).toEqual(['offered', 90, 100]);
      var eightyNine = classic9(requests('classic9', 'normal', range(0, 100), function (i) {
        return i < 7 || (i >= 40 && i < 44);
      }));
      expect([eightyNine.summary.verdict, eightyNine.summary.hits]).toEqual(['hidden', 89]);
      expect(check(eightyNine, { earlyStop: false })).toEqual([]);
      // With the early stop on, 11 misses end a level: a full record of 100 outcomes is not the scheduler's.
      expect(check(eightyNine)[0]).toMatch(/has 11 misses and 0 requests over the budget without a stop/);
    });

    it('accepts an early hidden stop at 11 misses, with the results that were in flight', function () {
      var cell = classic9(requests('classic9', 'normal', range(0, 14), function (i) { return i < 11; }), 'misses');
      expect(check(cell)).toEqual([]);
      expect([cell.summary.verdict, cell.summary.stopped, cell.summary.n, cell.summary.hits])
        .toEqual(['hidden', 'misses', 14, 3]);
      var tenMisses = classic9(requests('classic9', 'normal', range(0, 14), function (i) { return i < 10; }),
        'misses');
      expect(check(tenMisses)[0]).toMatch(/stopped for misses with 10 misses: the proof needs more than 10/);
      var late = classic9(requests('classic9', 'normal', range(0, 20), function (i) { return i < 15; }), 'misses');
      expect(check(late)[0]).toMatch(/stopped for misses at 11 misses, which leaves at most 3 more results/);
      expect(check(late, { jobs: 8 })).toEqual([]);
    });

    it('accepts an early hidden stop at the sixth request over the budget, and nothing less or much more',
      function () {
        var six = classic9(requests('classic9', 'normal', range(0, 9), null, function (i) { return i < 6; }),
          'time');
        expect(check(six)).toEqual([]);
        expect([six.summary.verdict, six.summary.stopped, six.summary.hits]).toEqual(['hidden', 'time', 9]);
        var five = classic9(requests('classic9', 'normal', range(0, 9), null, function (i) { return i < 5; }),
          'time');
        expect(check(five)[0]).toMatch(/stopped for time with 5 requests over the budget/);
        var ten = classic9(requests('classic9', 'normal', range(0, 13), null, function (i) { return i < 10; }),
          'time');
        expect(check(ten)[0]).toMatch(/stopped for time at 6 slow requests, which leaves at most 3/);
        var misses = classic9(requests('classic9', 'normal', range(0, 20), function (i) { return i < 14; },
          function (i) { return i >= 14 && i < 20; }), 'time');
        expect(check(misses)[0]).toMatch(/stopped for time, with 14 misses: the miss stop would have come first/);
      });

    it('refuses a stop reason that is not misses or time, and a stop on a run without early stop', function () {
      var cell = classic9(requests('classic9', 'normal', range(0, 14), function (i) { return i < 11; }), 'misses');
      ['budget', 'incomplete', '', 0, true].forEach(function (reason) {
        var bad = clone(cell);
        bad.summary.stopped = reason;
        expect(check(bad).join('|')).toMatch(/is not an early-stop reason/);
      });
      var unstopped = classic9(requests('classic9', 'normal', range(0, 14), function (i) { return i < 11; }));
      expect(check(unstopped).join('|')).toMatch(/has 14 outcomes without an early stop/);
      expect(check(cell, { earlyStop: false })[0]).toMatch(/stopped \(misses\) in a shard that ran without early stop/);
    });

    it('refuses a first-round stop whose outcomes are not the indexes 0..n-1', function () {
      var spread = classic9(requests('classic9', 'normal', range(0, 6).concat(range(20, 25), range(30, 33)),
        function (i) { return i < 6 || (i >= 20 && i < 25); }), 'misses');
      expect(check(spread)[0]).toMatch(/stopped in the first round, whose outcomes are the indexes 0\.\.13/);
    });

    it('accepts a stopped second round with non-contiguous indexes (it is dispatched from 99 down)', function () {
      var misses = function (i) { return i < 9 || i === 99 || i === 98; };
      var cell = classic9(requests('classic9', 'normal', range(0, 40).concat([96, 97, 98, 99]), misses),
        'misses');
      expect(check(cell)).toEqual([]);
      expect([cell.summary.n, cell.summary.hits, cell.summary.stopped]).toEqual([44, 33, 'misses']);
      var ascending = classic9(requests('classic9', 'normal', range(0, 44), function (i) {
        return i < 9 || i === 40 || i === 41;
      }), 'misses');
      expect(check(ascending)).toEqual([]);
    });

    it('needs all 40 first outcomes with 30 to 35 hits before any second-round outcome', function () {
      var second = [99, 98, 97];
      var short = classic9(requests('classic9', 'normal', range(0, 39).concat(second)));
      expect(check(short, {}).join('|')).toMatch(/second-round outcomes, which need all 40 first-round outcomes/);
      var tooMany = classic9(requests('classic9', 'normal', range(0, 40).concat(second), function (i) {
        return i < 4;
      }));
      expect(check(tooMany).join('|')).toMatch(/with 30 to 35 hits \(it has 40 with 36 hits\)/);
      var tooFew = classic9(requests('classic9', 'normal', range(0, 40).concat(second), function (i) {
        return i < 11;
      }), 'misses');
      expect(check(tooFew)[0]).toMatch(/\(it has 40 with 29 hits\)/);
      var slowFirst = classic9(requests('classic9', 'normal', range(0, 40).concat(second), function (i) {
        return i < 7;
      }, function (i) { return i < 6; }));
      expect(check(slowFirst).join('|')).toMatch(/its first round had 6 requests over the budget/);
    });

    it('refuses a duplicated index, a wrong key, an unknown index and a wrong derived seed', function () {
      var base = requests('classic9', 'normal', range(0, 40));
      var twice = base.slice();
      twice[8] = clone(twice[7]);
      expect(check(classic9(twice)).join('|')).toMatch(/request #7 index 7 appears twice/);
      var key = base.map(clone);
      key[3].key = 'classic9/hard';
      expect(check(classic9(key))[0]).toMatch(/request #3 key "classic9\/hard" is not classic9\/normal/);
      [-1, 100, 1.5, '3', null].forEach(function (index) {
        var list = base.map(clone);
        list[3].index = index;
        expect(check(classic9(list)).join('|')).toMatch(/is not a whole number from 0 to 99/);
      });
      var seed = base.map(clone);
      seed[5].seed = fnv(20260101, 'classic9/normal/5');
      expect(check(classic9(seed))[0])
        .toBe('request #5 seed ' + seed[5].seed + ' is not the derived ' + Q.seedFor('classic9/normal/5'));
    });

    it('refuses a time that is negative or not a finite number, and a request with no outcome', function () {
      var base = requests('classic9', 'normal', range(0, 40));
      [-1, NaN, Infinity, null, '5'].forEach(function (ms) {
        var list = base.map(clone);
        list[4].ms = ms;
        expect(check(classic9(list)).join('|')).toMatch(/request #4 ms .* is not a finite number of at least 0/);
      });
      var none = base.map(clone);
      delete none[6].valid;
      expect(check(classic9(none))[0]).toMatch(/request #6 has no outcome: neither an error nor a complete result/);
      var bare = base.map(clone);
      bare[2] = { key: 'classic9/normal', index: 2, seed: Q.seedFor('classic9/normal/2'), hit: true, ms: 3 };
      expect(check(classic9(bare))[0]).toMatch(/request #2 has no outcome/);
    });

    it('refuses a hit that its own outcome does not give, and a hit with an error', function () {
      var base = requests('classic9', 'normal', range(0, 40));
      [{ exact: false }, { approximate: true }, { valid: false }, { solved: false }, { achieved: 'hard' }]
        .forEach(function (change) {
          var list = base.map(clone);
          Object.assign(list[1], change);
          expect(check(classic9(list))[0]).toMatch(/request #1 hit true does not follow from its own outcome/);
        });
      var error = base.map(clone);
      error[9] = { key: 'classic9/normal', index: 9, seed: Q.seedFor('classic9/normal/9'), hit: false,
        ms: 120004, error: 'budget.exhausted' };
      expect(check(classic9(error))).toEqual([]);
      expect(classic9(error).summary.errors).toBe(1);
      error[9].hit = true;
      expect(check(classic9(error)).join('|')).toMatch(/has an error and is counted as a hit/);
    });

    it('recomputes the summary from the requests and refuses any field that differs', function () {
      var cell = classic9(requests('classic9', 'normal', range(0, 40), function (i) { return i < 4; }));
      [['p95', 1], ['p50', 7], ['max', 5], ['hits', 37], ['n', 41], ['rate', 0.5], ['verdict', 'hidden'],
        ['errors', 1], ['approximate', 0], ['invalid', 2]].forEach(function (row) {
        var bad = clone(cell);
        bad.summary[row[0]] = row[1];
        expect(check(bad).join('|')).toContain('summary.' + row[0] + ' is ');
      });
      var extra = clone(cell);
      extra.summary.note = 'x';
      expect(check(extra)[0]).toBe('summary.note is not a field of a summary');
    });

    it('checks the size, the budget and the default attempts of the board', function () {
      var cell = cellOf('mega16', 'nightmare', requests('mega16', 'nightmare', range(0, 40)));
      expect(check(cell)).toEqual([]);
      var eight = clone(cell);
      eight.attempts = 8;
      expect(check(eight, { attempts: 2 })[0]).toBe('attempts 8 is not the size default 2 of a board of 256 cells');
      var budget = clone(cell);
      budget.budget = 10000;
      expect(check(budget, { attempts: 2 }).join('|')).toContain('budget 10000 is not 30000 ms');
      expect(check(cell, { cellCount: 144, attempts: 4 }).length).toBeGreaterThan(1);
    });
  });

  // -----------------------------------------------------------------------------------------------
  // The merge of 135 cells
  // -----------------------------------------------------------------------------------------------

  describe('qualification records: the merge', function () {
    it('merges the 135 cells in the order of the matrix, with the support lists derived from the verdicts',
      function () {
        var result = mergeOf(fullFiles());
        expect(result.problems).toEqual([]);
        var record = result.record;
        expect(record.cells).toHaveLength(135);
        var order = [];
        MATRIX.forEach(function (v) { Q.LEVELS.forEach(function (level) { order.push(v.id + '/' + level); }); });
        expect(record.cells.map(function (c) { return c.variant + '/' + c.level; })).toEqual(order);
        expect(record.support.classic4).toEqual(Q.LEVELS.slice(0, 8));
        expect(record.support.samurai).toEqual(['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'hell1',
          'hell2']);
        expect(record.support.mega16).toEqual(Q.LEVELS.slice());
        expect(Object.keys(record.support)).toEqual(MATRIX.map(function (v) { return v.id; }));
        expect(record.totals).toEqual({ cells: 135, requests: 5403, hits: 5381, errors: 1, approximate: 21,
          invalid: 0, offered: 133, hidden: 2, stopped: 2 });
      });

    it('keeps each shard\'s metadata and records the cumulative shard time apart from the wall span', function () {
      var record = mergeOf(fullFiles()).record;
      expect(record.shards).toHaveLength(15);
      expect(record.shards[0]).toEqual({ file: NAMES.classic4, started: isoAt(0, 0), finished: isoAt(0, 30),
        seconds: 30, engine: { sources: IDENTITY.sources, commit: 'abc1234', dirty: false },
        cells: Q.LEVELS.map(function (level) { return 'classic4/' + level; }) });
      expect(record.shards[14].engine.dirty).toBe(true);
      expect(record.shardSeconds).toBe(450);
      expect(record.wallSpanSeconds).toBe(14 * 60 + 30);
      expect([record.started, record.finished]).toEqual([isoAt(0, 0), isoAt(14, 30)]);
      expect(record.engine).toEqual({ sources: IDENTITY.sources, commit: 'abc1234', commits: ['abc1234'],
        dirty: true });
      expect(record.machine.jobs).toBe(4);
      expect([record.qualifierHash, record.acceptance, record.ratingVersion, record.probe, record.earlyStop,
        record.guardMs]).toEqual([IDENTITY.qualifierHash, 'canonical-required-tier', SG.difficulty.RATING_VERSION,
        0, true, 120000]);
      expect(record.attemptPolicy.explicitMaxAttempts).toBe(false);
      expect(record.matrix).toEqual({ variants: Q.VARIANTS.slice(), levels: Q.LEVELS.slice(), cells: 135 });
    });

    it('does not depend on the order of the files, and keeps every field of every request', function () {
      var files = fullFiles();
      files[3].shard.cells[2].requests[5].stats = { samples: 3, attempts: 1, oracleCalls: 41 };
      var forward = mergeOf(files).record;
      var backward = mergeOf(files.slice().reverse()).record;
      expect(Q.recordText(forward)).toBe(Q.recordText(backward));
      expect(forward.cells[3 * 9 + 2].requests[5].stats).toEqual({ samples: 3, attempts: 1, oracleCalls: 41 });
      expect(Q.recordText(forward)).toContain('"stats":{"samples":3,"attempts":1,"oracleCalls":41}');
    });

    it('writes the same data as JSON, with CRLF line ends, no BOM, no trailing space and a final line end',
      function () {
        var record = mergeOf(fullFiles()).record;
        var text = Q.recordText(record);
        expect(formatProblem(text)).toBeNull();
        expect(Q.canon(JSON.parse(text))).toBe(Q.canon(record));
        expect(text.split('\r\n').length).toBeGreaterThan(5000);
        var table = Q.toCrlf(Q.markdownOf(record));
        expect(formatProblem(table)).toBeNull();
        var lines = table.split('\r\n');
        expect(lines[0]).toBe('| variant | level | n | hits | rate | p50 | p95 | max | budget | verdict |');
        expect(lines[1]).toBe('|---|---|---:|---:|---:|---:|---:|---:|---:|---|');
        expect(lines[2]).toBe('| classic4 | veryEasy | 40 | 40 | 100 % | 119 ms | 137 ms | 139 ms | 2.00 s | ' +
          'offered |');
        expect(lines).toHaveLength(2 + 135 + 1);
        expect(table).toContain('| classic4 | hell2 | 14 | 3 | 21 % | 106 ms | 113 ms | 113 ms | 2.00 s | ' +
          'hidden (stopped: misses) |');
        var shardText = Q.recordText(fullFiles()[0].shard);
        expect(formatProblem(shardText)).toBeNull();
        expect(Q.canon(JSON.parse(shardText))).toBe(Q.canon(fullFiles()[0].shard));
      });

    it('reports an invalid puzzle in the record instead of hiding it', function () {
      var files = fullFiles();
      var cell = files[2].shard.cells[2];
      cell.requests[4].valid = false;
      cell.requests[4].hit = false;
      cell.summary = Q.decide({ done: cell.requests, budget: cell.budget, stopped: null }, false);
      files[2] = withCells(files[2], files[2].shard.cells);
      var record = mergeOf(files).record;
      expect(record.totals.invalid).toBe(1);
      expect(record.cells[2 * 9 + 2].summary.invalid).toBe(1);
    });

    it('refuses a matrix with one cell of 135 missing, and says which', function () {
      var files = fullFiles();
      var last = fileOf(files, 'wordoku');
      var rebuilt = withCells(last, last.shard.cells.slice(0, 8));
      files[14] = rebuilt;
      var problems = problemsOf(files);
      expect(problems).toEqual(['missing 1 of 135 cells: wordoku/hell2']);
      var without = problemsOf(fullFiles().slice(0, 14));
      expect(without).toEqual(['missing 9 of 135 cells: wordoku/veryEasy, wordoku/easy, wordoku/normal, ' +
        'wordoku/hard, wordoku/expert, wordoku/master, wordoku/nightmare, wordoku/hell1, wordoku/hell2']);
      expect(problemsOf([])).toEqual(['no shard (*.json) to merge',
        'missing 135 of 135 cells: classic4/veryEasy, classic4/easy, classic4/normal, classic4/hard, ' +
        'classic4/expert, classic4/master, classic4/nightmare, classic4/hell1, classic4/hell2, classic6/veryEasy, ' +
        'classic6/easy, classic6/normal and 123 more']);
    });

    it('refuses jobs 2 mixed with 4, and a merge asked for another number of jobs', function () {
      var files = fullFiles();
      files[5].shard.machine.jobs = 2;
      var problems = problemsOf(files);
      expect(problems).toEqual([NAMES.diagonalX + ': machine.jobs is 2, not 4 (the qualification always runs ' +
        'with --jobs=4)']);
      var all = fullFiles();
      all.forEach(function (f) { f.shard.machine.jobs = 2; });
      expect(mentions(problemsOf(all), /machine\.jobs is 2, not 4/)).toBe(15);
      expect(problemsOf(fullFiles(), { jobs: 2 })[0]).toBe('--jobs=2: the qualification always runs with --jobs=4');
    });

    it('refuses a cell twice, a cell outside the matrix and an unreadable file', function () {
      var files = fullFiles();
      var again = clone(files[0].shard.cells[0]);
      files[1] = withCells(files[1], files[1].shard.cells.concat([again]));
      expect(problemsOf(files)).toEqual(['classic4/veryEasy: duplicate, recorded by ' + NAMES.classic4 + ' and ' +
        NAMES.classic6]);
      var odd = fullFiles();
      var stray = clone(odd[0].shard.cells[0]);
      stray.variant = 'bogus';
      odd[0] = withCells(odd[0], odd[0].shard.cells.concat([stray]));
      expect(mentions(problemsOf(odd), /bogus\/veryEasy is not one of the 135 cells of the matrix/)).toBe(1);
      var level = fullFiles();
      var wrongLevel = clone(level[0].shard.cells[0]);
      wrongLevel.level = 'hell3';
      level[0] = withCells(level[0], level[0].shard.cells.concat([wrongLevel]));
      expect(mentions(problemsOf(level), /classic4\/hell3 is not one of the 135 cells/)).toBe(1);
      var broken = fullFiles();
      broken.push({ name: 'zz.json', error: 'cannot be read as JSON: Unexpected token' });
      expect(problemsOf(broken)).toEqual(['zz.json: cannot be read as JSON: Unexpected token']);
    });

    it('refuses shards of other sources, another qualifier, rating version, attempt policy or protocol',
      function () {
        var cases = [
          [function (s) { s.engine.sources = 'fedcba9876543210'; },
            /engine\.sources fedcba9876543210 is not the current/],
          [function (s) { s.qualifierHash = repeat('cd', 32); },
            /qualifierHash .*\(qualify\.js or its helper changed/],
          [function (s) { delete s.qualifierHash; }, /has no qualifierHash: it was written by a qualifier older/],
          [function (s) { s.ratingVersion = SG.difficulty.RATING_VERSION + 1; },
            /ratingVersion is \d+, not \d+ \(recorded by another engine\)/],
          [function (s) { s.attemptPolicy.sources['js/engine/digger.js'] = repeat('0', 64); },
            /attemptPolicy .*\(the size-default attempts of another source\)/],
          [function (s) { s.attemptPolicy.explicitMaxAttempts = true; }, /attemptPolicy/],
          [function (s) { s.acceptance = 'band-only'; }, /acceptance is "band-only", not "canonical-required-tier"/],
          [function (s) { s.protocol = 'other'; }, /protocol is "other", not/],
          [function (s) { s.seedBase = 20260101; }, /seedBase is 20260101, not 20260601/],
          [function (s) { s.guardMs = 60000; }, /guardMs is 60000, not 120000/],
          [function (s) { s.probe = 5; }, /probe is 5, not 0 \(a probe is a quick look/],
          [function (s) { s.shards = []; }, /is a merged record \(it has "shards"\), not a shard/]
        ];
        cases.forEach(function (row, i) {
          var files = fullFiles();
          row[0](files[i % 15].shard);
          var problems = problemsOf(files);
          expect([i, mentions(problems, row[1]) > 0]).toEqual([i, true]);
          expect(problems.filter(function (p) { return p.indexOf(files[i % 15].name) !== 0; })).toEqual([]);
        });
      });

    it('refuses a probe cell and a shard of the explicit eight attempts on a large board', function () {
      var files = fullFiles();
      var cell = files[4].shard.cells[0];
      cell.summary = Q.decide({ done: cell.requests, budget: cell.budget, stopped: null }, true);
      var probe = problemsOf(files);
      expect(mentions(probe, /mega16\/veryEasy: summary\.verdict is "probe", but its requests give "offered"/))
        .toBe(1);
      var eight = fullFiles();
      eight[4].shard.cells[3].attempts = 8;
      expect(problemsOf(eight)).toEqual([NAMES.mega16 + ': mega16/hard: attempts 8 is not the size default 2 of ' +
        'a board of 256 cells']);
    });

    it('refuses shards of another machine, Node or early-stop setting, and runs that overlap', function () {
      var cpu = fullFiles();
      cpu[2].shard.machine.cpu = 'Other CPU';
      expect(problemsOf(cpu)).toEqual([NAMES.classic9 + ': machine.cpu is "Other CPU", but ' + NAMES.classic4 +
        ' ran on "Test CPU @ 3.0 GHz" (one machine and one Node per qualification)']);
      var node = fullFiles();
      node[7].shard.machine.node = 'v24.0.0';
      expect(problemsOf(node)).toEqual([NAMES.jigsaw9 + ': machine.node is "v24.0.0", but ' + NAMES.classic4 +
        ' ran on "v26.13.0" (one machine and one Node per qualification)']);
      var early = fullFiles();
      early[1].shard.earlyStop = false;
      expect(problemsOf(early)).toEqual([NAMES.classic6 + ': earlyStop false differs from true of ' +
        NAMES.classic4]);
      var overlap = fullFiles();
      overlap[4].shard.started = isoAt(3, 20);
      overlap[4].shard.finished = isoAt(4, 10);
      overlap[4].shard.seconds = 50;
      expect(problemsOf(overlap)).toEqual([NAMES.mega16 + ' started before ' + NAMES.mega12 + ' finished: the ' +
        'qualifier is never run twice at the same time']);
      var clock = fullFiles();
      clock[6].shard.seconds = 400;
      expect(problemsOf(clock)).toEqual([NAMES.hyper + ': seconds 400 does not match the 30.0 s between ' +
        'started and finished']);
    });

    it('records the commit of each shard and never compares them: the hashes are the identity', function () {
      var files = fullFiles();
      files[9].shard.engine.commit = 'def5678';
      files[3].shard.engine.commit = null;
      var record = mergeOf(files).record;
      expect(record.engine).toEqual({ sources: IDENTITY.sources, commit: null, commits: ['abc1234', 'def5678'],
        dirty: true });
      expect(record.shards.map(function (s) { return s.engine.commit; }).slice(2, 11))
        .toEqual(['abc1234', null, 'abc1234', 'abc1234', 'abc1234', 'abc1234', 'abc1234', 'def5678', 'abc1234']);
      files.forEach(function (f) { f.shard.engine.commit = null; });
      expect(mergeOf(files).record.engine.commits).toEqual([]);
    });

    it('collects the problems of every shard, not only the first', function () {
      var files = fullFiles();
      files[0].shard.cells[0].requests[3].seed = 1;
      files[8].shard.cells[1].requests[7].ms = -1;
      files[12].shard.qualifierHash = repeat('cd', 32);
      var problems = problemsOf(files);
      expect(problems).toHaveLength(3);
      expect(problems[0]).toMatch(new RegExp('^' + NAMES.classic4.replace('.', '\\.') +
        ': classic4/veryEasy: request #3 seed 1 is not the derived'));
      expect(problems[1]).toContain(NAMES.killer + ': killer/easy: request #7 ms -1 is not a finite number');
      expect(problems[2]).toContain(NAMES.butterfly + ': qualifierHash');
    });

    it('refuses a registry that is not the manifest of checklist Q', function () {
      var expectation = expectOf(IDENTITY);
      expectation.variants = expectation.variants.slice(0, 14);
      var problems = Q.merge(fullFiles(), expectation).problems;
      expect(problems[0]).toBe('the registry of the engine is not the 15 variants x 9 levels of the ' +
        'qualification manifest (checklist Q)');
    });
  });

  // -----------------------------------------------------------------------------------------------
  // tests/qualify.js itself (Node only): the merge mode on a file system in memory, the scheduler on fake workers
  // -----------------------------------------------------------------------------------------------

  describe('qualification records: tests/qualify.js (Node only)', function () {
    function host() {
      var h = SG.test.node;
      if (!h || !h.vm || !h.fs || typeof process === 'undefined' || !process.getBuiltinModule) {
        SG.test.skip('needs Node (vm, fs and process.getBuiltinModule); skipped in the browser');
      }
      return h;
    }

    /** A file system in memory over the real one: the paths in `files` are virtual, every other path is real. */
    function fakeFs(files, options) {
      var h = host();
      var opt = options || {};
      var log = [];
      var has = function (k) { return Object.prototype.hasOwnProperty.call(files, k); };
      var key = function (p) { return String(p).replace(/\\/g, '/'); };
      return {
        files: files, log: log,
        readFileSync: function (p, encoding) {
          return has(key(p)) ? files[key(p)] : h.fs.readFileSync(p, encoding);
        },
        readdirSync: function (dir) {
          log.push('readdir ' + key(dir));
          var d = key(dir).replace(/\/$/, '') + '/';
          var names = Object.keys(files).filter(function (k) {
            return k.indexOf(d) === 0 && k.slice(d.length).indexOf('/') === -1;
          }).map(function (k) { return k.slice(d.length); });
          if (names.length === 0 && (opt.folders || []).indexOf(d) === -1) {
            var err = new Error('ENOENT: no such file or directory, scandir \'' + dir + '\'');
            err.code = 'ENOENT';
            throw err;
          }
          return names;
        },
        writeFileSync: function (p, text) {
          log.push('write ' + key(p));
          if (opt.failWrite && key(p).indexOf(opt.failWrite) !== -1) throw new Error('disk full');
          if (opt.failRestore && key(p) === opt.failRestore) throw new Error('restore denied');
          files[key(p)] = text;
        },
        renameSync: function (from, to) {
          if (opt.failRename && key(to).indexOf(opt.failRename) !== -1) throw new Error('rename denied');
          log.push('rename ' + key(to));
          files[key(to)] = files[key(from)];
          delete files[key(from)];
        },
        mkdirSync: function (p) { log.push('mkdir ' + key(p)); },
        rmSync: function (p) {
          log.push('rm ' + key(p));
          delete files[key(p)];
        },
        existsSync: function (p) { return has(key(p)) || h.fs.existsSync(p); }
      };
    }

    /** tests/qualify.js as a script in a context of its own, with the given file system and fork. */
    function loadQualify(extra) {
      var h = host();
      var opts = extra || {};
      var file = h.path.join(h.root, 'tests', 'qualify.js');
      var out = [];
      var err = [];
      var modules = {
        fs: opts.fs || h.fs, path: h.path, vm: h.vm, crypto: process.getBuiltinModule('crypto'),
        os: { cpus: function () { return [{ model: 'Test CPU' }, {}, {}, {}]; }, totalmem: function () { return 0; } },
        child_process: opts.fork ? { fork: opts.fork } : process.getBuiltinModule('child_process')
      };
      var ctx = h.vm.createContext({
        require: function (name) { return modules[name]; }, module: { exports: {} }, process: process,
        __filename: file, __dirname: h.path.dirname(file),
        console: {
          log: function (text) { out.push(String(text)); }, error: function (text) { err.push(String(text)); }
        }
      });
      h.vm.runInContext(h.fs.readFileSync(file, 'utf8'), ctx, { filename: file });
      return {
        ctx: ctx, out: out, err: err, exports: ctx.module.exports,
        run: function (code) { return h.vm.runInContext(code, ctx); }
      };
    }

    /** The identity of the tree, the engine and the registry of the tests, instead of the real ones. */
    function stubIdentity(q) {
      q.ctx.hostSG = SG;
      q.ctx.ID = IDENTITY;
      q.run('loadSources = function () { return hostSG; };' +
        'sourcesHash = function () { return ID.sources; };' +
        'qualifierHash = function () { return ID.qualifierHash; };' +
        'attemptPolicy = function () { return ID.policy; };');
    }

    function parse(q, argv) {
      q.ctx.argv = argv;
      try {
        return { opts: q.run('parseArgs(argv)') };
      } catch (err) {
        return { error: err.message };
      }
    }

    function mergeSetup(files, options) {
      var virtual = {};
      files.forEach(function (f) { virtual['virtual/shards/' + f.name] = Q.recordText(f.shard); });
      var fs = fakeFs(virtual, options);
      var q = loadQualify({ fs: fs });
      stubIdentity(q);
      q.ctx.opts = { merge: 'virtual/shards', jobs: 4, json: 'virtual/out/complete.json',
        markdown: 'virtual/out/table.md', quiet: false, earlyStop: true, probe: 0 };
      return { q: q, fs: fs };
    }

    function runMerge(setup) {
      try {
        return { code: setup.q.run('mergeShards(opts)') };
      } catch (err) {
        return { error: err };
      }
    }

    it('reads --merge with its options, and refuses what cannot be combined with it', function () {
      var q = loadQualify();
      var ok = parse(q, ['--merge=d', '--jobs=4', '--json=a.json', '--markdown=b.md', '--quiet']).opts;
      expect([ok.merge, ok.jobs, ok.jobsGiven, ok.json, ok.markdown, ok.quiet]).toEqual(['d', 4, true, 'a.json',
        'b.md', true]);
      expect(parse(q, ['--merge=d', '--help']).opts.help).toBe(true);
      var generation = parse(q, ['--variant=classic4', '--level=veryEasy', '--jobs=2', '--json=x.json']).opts;
      expect([generation.merge, generation.variants, generation.levels, generation.jobs, generation.jobsGiven])
        .toEqual([null, ['classic4'], ['veryEasy'], 2, true]);
      expect(parse(q, ['--probe=5']).opts.probe).toBe(5);
      expect(parse(q, ['--merge=d']).error)
        .toBe('--merge needs --jobs=4: the qualification always runs with 4 workers');
      expect(parse(q, ['--merge=', '--jobs=4']).error).toBe('--merge needs the folder of the shards');
      [['--variant=classic4', '--variant'], ['--level=easy', '--level'], ['--probe=3', '--probe'],
        ['--no-early-stop', '--no-early-stop'], ['--child', '--child']].forEach(function (row) {
        expect(parse(q, ['--merge=d', '--jobs=4', row[0]]).error)
          .toBe('--merge generates nothing and cannot be combined with ' + row[1]);
      });
      expect(parse(q, ['--merge=d', '--jobs=4', '--variant=a', '--probe=2']).error)
        .toBe('--merge generates nothing and cannot be combined with --variant, --probe');
      expect(parse(q, ['--merge=d', '--jobs=4', '--bogus']).error).toBe('Unknown argument: --bogus');
    });

    it('merges a folder of shards into the record and the table: only the *.json files, CRLF, no partial file left',
      function () {
        var setup = mergeSetup(fullFiles());
        setup.fs.files['virtual/shards/notes.md'] = 'not a shard';
        setup.fs.files['virtual/shards/old/01-classic4.json'] = 'a subfolder is not entered';
        var run = runMerge(setup);
        expect(run).toEqual({ code: 0 });
        var record = mergeOf(fullFiles()).record;
        expect(setup.fs.files['virtual/out/complete.json']).toBe(Q.recordText(record));
        expect(setup.fs.files['virtual/out/table.md']).toBe(Q.toCrlf(Q.markdownOf(record)));
        expect(formatProblem(setup.fs.files['virtual/out/complete.json'])).toBeNull();
        expect(Object.keys(setup.fs.files).filter(function (k) { return /\.partial$/.test(k); })).toEqual([]);
        expect(setup.q.err).toEqual([]);
        expect(setup.q.out[0]).toBe('qualify: merged 135 cells from 15 shards, 5403 requests, 133 offered, 2 hidden ' +
          '(2 stopped early), jobs 4, Node v26.13.0, engine abc1234 sources ' + IDENTITY.sources +
          ', rating version ' + SG.difficulty.RATING_VERSION + ', shards 450 s, wall span 870 s');
        expect(setup.q.out.join('\n')).toContain('| classic4 | hell2 | 14 | 3 | 21 % |');
        expect(setup.q.out.join('\n')).toContain('classic4: ["veryEasy","easy","normal","hard","expert","master",' +
          '"nightmare","hell1"]');
      });

    it('writes nothing and leaves the existing outputs byte for byte when the merge is rejected', function () {
      var files = fullFiles();
      files[14] = withCells(files[14], files[14].shard.cells.slice(0, 8));
      var setup = mergeSetup(files);
      setup.fs.files['virtual/out/complete.json'] = 'OLD RECORD\r\n';
      setup.fs.files['virtual/out/table.md'] = 'OLD TABLE\r\n';
      setup.fs.files['virtual/shards/broken.json'] = '{ not json';
      var run = runMerge(setup);
      expect(run).toEqual({ code: 1 });
      expect(setup.fs.files['virtual/out/complete.json']).toBe('OLD RECORD\r\n');
      expect(setup.fs.files['virtual/out/table.md']).toBe('OLD TABLE\r\n');
      expect(setup.fs.log.filter(function (line) { return !/^readdir /.test(line); })).toEqual([]);
      expect(setup.q.out).toEqual([]);
      expect(setup.q.err[0]).toBe('qualify: the merge is rejected, nothing was written (2 problems):');
      expect(setup.q.err[1]).toMatch(/^ {2}- broken\.json: cannot be read as JSON: /);
      expect(setup.q.err[2]).toBe('  - missing 1 of 135 cells: wordoku/hell2');
      expect(setup.q.err).toHaveLength(3);
    });

    it('refuses a missing folder and an empty one, and a merge asked for another number of jobs', function () {
      var missing = mergeSetup(fullFiles());
      missing.q.ctx.opts.merge = 'virtual/nowhere';
      expect(runMerge(missing)).toEqual({ code: 1 });
      expect(missing.q.err[1]).toMatch(/^ {2}- cannot read the folder virtual\/nowhere: ENOENT/);
      var empty = mergeSetup([], { folders: ['virtual/shards/'] });
      expect(runMerge(empty)).toEqual({ code: 1 });
      expect(empty.q.err[1]).toBe('  - no shard (*.json) to merge');
      var jobs = mergeSetup(fullFiles());
      jobs.q.ctx.opts.jobs = 2;
      expect(runMerge(jobs)).toEqual({ code: 1 });
      expect(jobs.q.err[1]).toBe('  - --jobs=2: the qualification always runs with --jobs=4');
      expect(jobs.fs.files['virtual/out/complete.json']).toBeUndefined();
    });

    it('refuses an output that is the live table, inside the folder of the shards or named twice, before reading',
      function () {
        var live = host().path.join(host().root, '..', 'docs', 'difficulty-rating', 'qualification.md');
        var cases = [
          [{ markdown: live }, /--markdown: a merge never writes the live table docs\/difficulty-rating\/qualif/],
          [{ json: live.toUpperCase() }, /--json: a merge never writes the live table/],
          [{ json: 'virtual/shards/complete.json' },
            /--json: virtual\/shards\/complete\.json is inside the folder of the shards/],
          [{ markdown: 'virtual/shards/sub/table.md' }, /--markdown: .* is inside the folder of the shards/],
          [{ json: 'virtual/out/x.out', markdown: 'virtual/out/x.out' }, /^--json and --markdown name the same file$/]
        ];
        cases.forEach(function (row) {
          var setup = mergeSetup(fullFiles());
          Object.assign(setup.q.ctx.opts, row[0]);
          var run = runMerge(setup);
          expect(run.error.usage).toBe(true);
          expect(run.error.message).toMatch(row[1]);
          expect(setup.fs.log).toEqual([]);
        });
      });

    it('writes both outputs or none: a failure on the second leaves the first untouched and no partial file',
      function () {
        var setup = mergeSetup(fullFiles(), { failWrite: 'table.md' });
        setup.fs.files['virtual/out/complete.json'] = 'OLD RECORD\r\n';
        expect(runMerge(setup)).toEqual({ code: 1 });
        expect(setup.fs.files['virtual/out/complete.json']).toBe('OLD RECORD\r\n');
        expect(setup.fs.files['virtual/out/table.md']).toBeUndefined();
        expect(Object.keys(setup.fs.files).filter(function (k) { return /\.partial$/.test(k); })).toEqual([]);
        expect(setup.q.err[0]).toBe('qualify: the merge is valid but its files could not be written: disk full');
        var json = mergeSetup(fullFiles());
        json.q.ctx.opts.markdown = null;
        expect(runMerge(json)).toEqual({ code: 0 });
        expect(json.fs.log.filter(function (line) { return /^(write|rename) /.test(line); })).toEqual([
          'write virtual/out/complete.json.partial', 'rename virtual/out/complete.json']);
      });

    it('puts the first output back when the second cannot be put in place: both files as before, no partial file',
      function () {
        var kept = mergeSetup(fullFiles(), { failRename: 'table.md' });
        kept.fs.files['virtual/out/complete.json'] = 'OLD RECORD\r\n';
        kept.fs.files['virtual/out/table.md'] = 'OLD TABLE\r\n';
        expect(runMerge(kept)).toEqual({ code: 1 });
        expect(kept.fs.files['virtual/out/complete.json']).toBe('OLD RECORD\r\n');
        expect(kept.fs.files['virtual/out/table.md']).toBe('OLD TABLE\r\n');
        expect(Object.keys(kept.fs.files).filter(function (k) { return /\.partial$/.test(k); })).toEqual([]);
        expect(kept.fs.log.filter(function (line) { return /^rename /.test(line); }))
          .toEqual(['rename virtual/out/complete.json']);
        expect(kept.q.err).toEqual(['qualify: the merge is valid but its files could not be written: rename ' +
          'denied; the 1 output(s) already replaced were put back as they were']);
        expect(kept.q.out).toEqual([]);

        var fresh = mergeSetup(fullFiles(), { failRename: 'table.md' });
        expect(runMerge(fresh)).toEqual({ code: 1 });
        expect(fresh.fs.files['virtual/out/complete.json']).toBeUndefined();
        expect(fresh.fs.files['virtual/out/table.md']).toBeUndefined();
        expect(Object.keys(fresh.fs.files).filter(function (k) { return /^virtual\/out\//.test(k); })).toEqual([]);

        var mixed = mergeSetup(fullFiles(), { failRename: 'table.md' });
        mixed.fs.files['virtual/out/table.md'] = 'OLD TABLE\r\n';
        expect(runMerge(mixed)).toEqual({ code: 1 });
        expect(mixed.fs.files['virtual/out/complete.json']).toBeUndefined();
        expect(mixed.fs.files['virtual/out/table.md']).toBe('OLD TABLE\r\n');

        var first = mergeSetup(fullFiles(), { failRename: 'complete.json' });
        first.fs.files['virtual/out/complete.json'] = 'OLD RECORD\r\n';
        expect(runMerge(first)).toEqual({ code: 1 });
        expect(first.fs.files['virtual/out/complete.json']).toBe('OLD RECORD\r\n');
        expect(first.fs.files['virtual/out/table.md']).toBeUndefined();
        expect(Object.keys(first.fs.files).filter(function (k) { return /\.partial$/.test(k); })).toEqual([]);
        expect(first.q.err[0]).toBe('qualify: the merge is valid but its files could not be written: rename denied');
      });

    it('says so when an output that was replaced cannot be put back', function () {
      var setup = mergeSetup(fullFiles(), { failRename: 'table.md', failRestore: 'virtual/out/complete.json' });
      setup.fs.files['virtual/out/complete.json'] = 'OLD RECORD\r\n';
      expect(runMerge(setup)).toEqual({ code: 1 });
      expect(setup.q.err[0]).toBe('qualify: the merge is valid but its files could not be written: rename denied; ' +
        'THE OUTPUTS COULD NOT BE PUT BACK: virtual/out/complete.json');
      expect(Object.keys(setup.fs.files).filter(function (k) { return /\.partial$/.test(k); })).toEqual([]);
    });

    it('reports an invalid puzzle on stderr and still writes the record that holds it', function () {
      var files = fullFiles();
      var cell = files[2].shard.cells[2];
      cell.requests[4].valid = false;
      cell.requests[4].hit = false;
      cell.summary = Q.decide({ done: cell.requests, budget: cell.budget, stopped: null }, false);
      files[2] = withCells(files[2], files[2].shard.cells);
      var setup = mergeSetup(files);
      expect(runMerge(setup)).toEqual({ code: 0 });
      expect(setup.q.err).toHaveLength(1);
      expect(setup.q.err[0]).toMatch(/^qualify: CORRECTNESS: 1 request\(s\) returned an invalid or non-unique puzzle/);
      expect(JSON.parse(setup.fs.files['virtual/out/complete.json']).totals.invalid).toBe(1);
    });

    it('keeps the exports of before MS07d, and the identity of the qualifier and of the attempt policy', function () {
      var q = loadQualify();
      expect(Object.keys(q.exports).sort()).toEqual(['SEED_BASE', 'budgetOf', 'hitOf', 'percentile', 'seedFor']);
      expect(q.exports.SEED_BASE).toBe(20260601);
      expect(q.exports.seedFor('classic4/veryEasy/0')).toBe(3336360352);
      expect(q.exports.budgetOf(256)).toBe(30000);
      var h = host();
      var crypto = process.getBuiltinModule('crypto');
      var bytes = function (rel) { return h.fs.readFileSync(h.path.join(h.root, rel)); };
      var sha = function (data) { return crypto.createHash('sha256').update(data).digest('hex'); };
      var expected = crypto.createHash('sha256');
      ['tests/qualify.js', 'tests/fixtures/qualification-records.js'].forEach(function (rel) {
        expected.update(bytes(rel));
        expected.update('\0');
      });
      expect(q.run('qualifierHash()')).toBe(expected.digest('hex'));
      var policy = q.run('attemptPolicy()');
      expect([policy.function, policy.explicitMaxAttempts]).toEqual(['SG.digger.defaultMaxAttempts', false]);
      expect(Object.keys(policy.sources)).toEqual(['js/engine/digger.js', 'js/engine/pipeline.js',
        'js/variants/registry.js']);
      Object.keys(policy.sources).forEach(function (rel) { expect(policy.sources[rel]).toBe(sha(bytes(rel))); });
      expect(q.run('sourcesHash()')).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  // -----------------------------------------------------------------------------------------------
  // The scheduler of tests/qualify.js on fake workers: what it writes is what the merge accepts
  // -----------------------------------------------------------------------------------------------

  describe('qualification records: the shards of the real scheduler (Node only, fake workers)', function () {
    var host = function () {
      var h = SG.test.node;
      if (!h || !h.vm || !h.fs || typeof process === 'undefined' || !process.getBuiltinModule) {
        SG.test.skip('needs Node (vm, fs and process.getBuiltinModule); skipped in the browser');
      }
      return h;
    };

    /** A small deterministic generator, for the order in which the fake workers answer. */
    function prng(seed) {
      var a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = Math.imul(a ^ (a >>> 15), a | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    /**
     * Runs `parent` of tests/qualify.js for one level of a fake classic4 on fake workers. `answer(task)` gives
     * { hit, ms }; the workers answer in a pseudo-random order, so that up to `jobs` requests are in flight and
     * finish in any order. Resolves with the shard the scheduler wrote.
     */
    function simulate(answer, options) {
      var h = host();
      var pending = [];
      var rand = prng(options.order);
      var written = {};
      var fs = {
        readFileSync: h.fs.readFileSync, existsSync: h.fs.existsSync, mkdirSync: function () {},
        writeFileSync: function (name, text) { written[name] = text; },
        renameSync: function (from, to) { written[to] = written[from]; delete written[from]; },
        rmSync: function (name) { delete written[name]; }
      };
      function fork() {
        var handlers = {};
        var w = {
          on: function (name, fn) { (handlers[name] = handlers[name] || []).push(fn); return w; },
          emit: function (name, a, b) { (handlers[name] || []).forEach(function (fn) { fn(a, b); }); },
          send: function (task) { pending.push({ w: w, task: task }); },
          kill: function () { pending.push({ w: w, kill: true }); }
        };
        pending.push({ w: w, ready: true });
        return w;
      }
      var file = h.path.join(h.root, 'tests', 'qualify.js');
      var modules = {
        fs: fs, path: h.path, vm: h.vm, crypto: process.getBuiltinModule('crypto'), child_process: { fork: fork },
        os: { cpus: function () { return []; }, totalmem: function () { return 0; } }
      };
      var ctx = h.vm.createContext({
        require: function (name) { return modules[name]; }, module: { exports: {} }, process: process,
        __filename: file, __dirname: h.path.dirname(file), console: { log: function () {}, error: function () {} }
      });
      h.vm.runInContext(h.fs.readFileSync(file, 'utf8'), ctx, { filename: file });
      ctx.fakeSG = {
        difficulty: { LEVELS: Q.LEVELS.slice(), RATING_VERSION: SG.difficulty.RATING_VERSION },
        variants: {
          list: function () { return [{ id: 'classic4', build: function () { return { cellCount: 16 }; } }]; },
          cellCountOf: function () { return 16; }
        },
        digger: { defaultMaxAttempts: function () { return 8; } },
        rng: { create: function () { return { fork: function () { return {}; } }; } }
      };
      h.vm.runInContext('loadSources = function () { return fakeSG; };' +
        'engineInfo = function () { return { sources: "s", commit: "c", dirty: false }; };' +
        'machineInfo = function (jobs) { return { cpu: "test", jobs: jobs }; };' +
        'qualifierHash = function () { return "q"; }; attemptPolicy = function () { return { rule: "r" }; };', ctx);
      ctx.opts = { variants: null, levels: [options.level], jobs: options.jobs, json: 'virtual/s.json',
        markdown: null, earlyStop: options.earlyStop !== false, quiet: true, probe: options.probe || 0 };
      var done = h.vm.runInContext('parent(opts)', ctx);
      return new Promise(function (resolve, reject) {
        var guard = setTimeout(function () { reject(new Error('the scheduler did not finish')); }, 5000);
        (function step() {
          if (pending.length === 0) {
            clearTimeout(guard);
            resolve();
            return;
          }
          var item = pending.splice(Math.floor(rand() * pending.length), 1)[0];
          if (item.ready) item.w.emit('message', { ready: true });
          else if (item.kill) item.w.emit('exit', null, 'SIGTERM');
          else if (item.task === 'exit') item.w.emit('exit', 0, null);
          else {
            var o = answer(item.task);
            item.w.emit('message', { key: item.task.key, index: item.task.index, seed: item.task.seed,
              hit: o.hit, ms: o.ms, achieved: item.task.level, score: 100, solved: true, approximate: !o.hit,
              exact: o.hit, valid: true });
          }
          Promise.resolve().then(step);
        }());
      }).then(function () { return done; }).then(function () {
        return { shard: JSON.parse(written['virtual/s.json']), text: written['virtual/s.json'], files: written };
      });
    }

    var FIRST_MISSES = [3, 9, 14, 22, 27, 31, 37];
    var SCENARIOS = [
      { name: 'all hits', hit: function () { return true; } },
      { name: 'borderline, offered at 90 of 100', hit: function (i) {
        return FIRST_MISSES.indexOf(i) === -1 && [41, 58, 77].indexOf(i) === -1;
      } },
      { name: 'borderline, then misses from 60',
        hit: function (i) { return FIRST_MISSES.indexOf(i) === -1 && i < 60; } },
      { name: 'half misses', hit: function (i) { return i % 2 === 0; } },
      { name: 'six slow requests in the first round', hit: function () { return true; },
        slow: function (i) { return [2, 3, 5, 8, 9, 12].indexOf(i) !== -1; } },
      { name: 'borderline, then slow from 70', hit: function (i) { return FIRST_MISSES.indexOf(i) === -1; },
        slow: function (i) { return i === 1 || i === 2 || i >= 70; } },
      { name: 'five slow requests, no stop', hit: function () { return true; }, slow: function (i) { return i < 5; } }
    ];

    function answerOf(scenario) {
      return function (task) {
        var slow = scenario.slow && scenario.slow(task.index);
        return { hit: scenario.hit(task.index), ms: slow ? 2001 : 100 + task.index };
      };
    }

    it('writes the new metadata, the attempts of every level and the text of the conventions', function () {
      return simulate(answerOf(SCENARIOS[0]), { jobs: 4, level: 'veryEasy', order: 1 }).then(function (run) {
        var shard = run.shard;
        expect(Object.keys(shard)).toEqual(['protocol', 'seedBase', 'machine', 'engine', 'qualifierHash',
          'acceptance', 'ratingVersion', 'probe', 'earlyStop', 'guardMs', 'attemptPolicy', 'started', 'finished',
          'seconds', 'cells', 'support']);
        expect([shard.protocol, shard.seedBase, shard.qualifierHash, shard.acceptance, shard.probe,
          shard.earlyStop, shard.guardMs]).toEqual(['docs/difficulty-rating/report-detailed.md section 6',
          20260601, 'q', 'canonical-required-tier', 0, true, 120000]);
        expect(shard.ratingVersion).toBe(SG.difficulty.RATING_VERSION);
        expect(shard.attemptPolicy).toEqual({ rule: 'r' });
        expect(shard.machine.jobs).toBe(4);
        expect(shard.cells).toHaveLength(1);
        expect(Object.keys(shard.cells[0])).toEqual(['variant', 'level', 'cellCount', 'budget', 'attempts',
          'summary', 'requests']);
        expect([shard.cells[0].cellCount, shard.cells[0].budget, shard.cells[0].attempts]).toEqual([16, 2000, 8]);
        expect(shard.cells[0].requests.map(function (r) { return r.index; })).toEqual(range(0, 40));
        expect(shard.support).toEqual({ classic4: ['veryEasy'] });
        expect(formatProblem(run.text)).toBeNull();
        expect(run.text).toBe(Q.recordText(shard));
        expect(Object.keys(run.files)).toEqual(['virtual/s.json']);
      });
    });

    it('marks a probe in the metadata, and the merge has no use for it', function () {
      return simulate(answerOf(SCENARIOS[0]), { jobs: 2, level: 'easy', order: 3, probe: 3 }).then(function (run) {
        expect(run.shard.probe).toBe(3);
        expect(run.shard.cells[0].summary.verdict).toBe('probe');
        expect(run.shard.cells[0].requests).toHaveLength(3);
        expect(Q.checkCell(run.shard.cells[0], { cellCount: 16, attempts: 8, jobs: 2, earlyStop: true }).length)
          .toBeGreaterThan(0);
      });
    });

    it('writes only levels that the merge accepts: every scenario, jobs and answering order', function () {
      var tally = {};
      var runs = [];
      SCENARIOS.forEach(function (scenario) {
        [1, 2, 4].forEach(function (jobs) {
          [1, 2].forEach(function (order) {
            runs.push({ scenario: scenario, jobs: jobs, order: order * 7 + jobs, earlyStop: true });
          });
        });
      });
      [2, 3, 5].forEach(function (i) {
        runs.push({ scenario: SCENARIOS[i], jobs: 4, order: 11, earlyStop: false });
      });
      var chain = Promise.resolve();
      runs.forEach(function (run) {
        chain = chain.then(function () {
          return simulate(answerOf(run.scenario), { jobs: run.jobs, level: 'hard', order: run.order,
            earlyStop: run.earlyStop }).then(function (written) {
            var cell = written.shard.cells[0];
            var label = run.scenario.name + ', jobs ' + run.jobs + ', order ' + run.order +
              (run.earlyStop ? '' : ', no early stop');
            expect([label, written.shard.earlyStop]).toEqual([label, run.earlyStop]);
            expect([label, Q.checkCell(cell, { cellCount: 16, attempts: 8, jobs: run.jobs,
              earlyStop: run.earlyStop })]).toEqual([label, []]);
            var second = cell.requests.some(function (r) { return r.index >= 40; });
            var kind = (cell.summary.stopped || 'complete') + (second ? '-r2' : '-r1') + ':' + cell.summary.verdict +
              (run.earlyStop ? '' : ':all');
            tally[kind] = (tally[kind] || 0) + 1;
          });
        });
      });
      return chain.then(function () {
        ['complete-r1:offered', 'complete-r1:hidden', 'complete-r2:offered', 'misses-r1:hidden',
          'misses-r2:hidden', 'time-r1:hidden', 'time-r2:hidden', 'complete-r1:hidden:all', 'complete-r2:hidden:all']
          .forEach(function (kind) { expect([kind, tally[kind] > 0]).toEqual([kind, true]); });
        expect(Object.keys(tally).length).toBeGreaterThan(8);
      });
    });
  });

  // -----------------------------------------------------------------------------------------------
  // Real processes on a scratch folder: the exit codes and the files on disk
  // -----------------------------------------------------------------------------------------------

  describe('qualification records: node tests/qualify.js --merge as a real process (Node only)', function () {
    // The files these tests write go to a folder of their own under the ignored `.scratch-*/` rule of the
    // repository: `.scratch-qualification-records/<unique run>/` at its root (never the task evidence, never a
    // folder that a fingerprint reads, never a system temporary directory). Only that folder is removed.
    var SCRATCH_BASE = '.scratch-qualification-records';

    function need() {
      var h = SG.test.node;
      if (!h || !h.vm || !h.fs || typeof process === 'undefined' || !process.getBuiltinModule) {
        SG.test.skip('needs Node (vm, fs and process.getBuiltinModule); skipped in the browser');
      }
      return { h: h, spawn: process.getBuiltinModule('child_process') };
    }

    /** The identity of the real tree: the functions of the real tool, read in a context of their own. */
    function realIdentity(h) {
      var file = h.path.join(h.root, 'tests', 'qualify.js');
      var modules = {
        fs: h.fs, path: h.path, vm: h.vm, crypto: process.getBuiltinModule('crypto'),
        os: process.getBuiltinModule('os'), child_process: process.getBuiltinModule('child_process')
      };
      var ctx = h.vm.createContext({
        require: function (name) { return modules[name]; }, module: { exports: {} }, process: process,
        __filename: file, __dirname: h.path.dirname(file), console: { log: function () {}, error: function () {} }
      });
      h.vm.runInContext(h.fs.readFileSync(file, 'utf8'), ctx, { filename: file });
      var read = function (code) { return h.vm.runInContext(code, ctx); };
      return { sources: read('sourcesHash()'), qualifierHash: read('qualifierHash()'),
        policy: JSON.parse(JSON.stringify(read('attemptPolicy()'))) };
    }

    it('exits 0 with CRLF files for a valid matrix, 1 and untouched files for a bad one, 2 for a usage error',
      function () {
        var n = need();
        var h = n.h;
        var identity = realIdentity(h);
        var repo = h.path.resolve(h.root, '..');
        var base = h.path.join(repo, SCRATCH_BASE);
        var unique = process.pid + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        var dir = h.path.join(base, unique);
        h.fs.mkdirSync(base, { recursive: true });
        h.fs.mkdirSync(dir);
        var rel = '../' + SCRATCH_BASE + '/' + unique;
        function tool(args) {
          var run = n.spawn.spawnSync(process.execPath, [h.path.join('tests', 'qualify.js')].concat(args), {
            cwd: h.root, encoding: 'utf8', windowsHide: true, timeout: 120000 });
          return { code: run.status, out: run.stdout || '', err: run.stderr || '' };
        }
        try {
          var files = fullFiles(identity);
          h.fs.mkdirSync(h.path.join(dir, 'shards'));
          files.forEach(function (f) {
            h.fs.writeFileSync(h.path.join(dir, 'shards', f.name), Q.recordText(f.shard), 'utf8');
          });
          var args = ['--merge=' + rel + '/shards', '--jobs=4', '--json=' + rel + '/complete.json',
            '--markdown=' + rel + '/table.md'];
          var good = tool(args);
          expect([good.code, good.err]).toEqual([0, '']);
          var jsonBytes = h.fs.readFileSync(h.path.join(dir, 'complete.json'));
          expect(jsonBytes[0]).not.toBe(0xEF);
          var record = Q.merge(files, expectOf(identity)).record;
          expect(jsonBytes.toString('utf8')).toBe(Q.recordText(record));
          expect(formatProblem(jsonBytes.toString('utf8'))).toBeNull();
          expect(h.fs.readFileSync(h.path.join(dir, 'table.md'), 'utf8')).toBe(Q.toCrlf(Q.markdownOf(record)));
          expect(good.out).toContain('qualify: merged 135 cells from 15 shards, 5403 requests, 133 offered, ' +
            '2 hidden (2 stopped early), jobs 4');
          expect(h.fs.readdirSync(dir).sort()).toEqual(['complete.json', 'shards', 'table.md']);

          var last = files[14];
          var rebuilt = withCells(last, last.shard.cells.slice(0, 8), identity);
          h.fs.writeFileSync(h.path.join(dir, 'shards', last.name), Q.recordText(rebuilt.shard), 'utf8');
          h.fs.writeFileSync(h.path.join(dir, 'old.json'), 'OLD RECORD\r\n', 'utf8');
          h.fs.writeFileSync(h.path.join(dir, 'old.md'), 'OLD TABLE\r\n', 'utf8');
          var bad = tool(['--merge=' + rel + '/shards', '--jobs=4', '--json=' + rel + '/old.json',
            '--markdown=' + rel + '/old.md']);
          expect(bad.code).toBe(1);
          expect(bad.out).toBe('');
          expect(bad.err).toContain('qualify: the merge is rejected, nothing was written (1 problem):');
          expect(bad.err).toContain('missing 1 of 135 cells: wordoku/hell2');
          expect(h.fs.readFileSync(h.path.join(dir, 'old.json'), 'utf8')).toBe('OLD RECORD\r\n');
          expect(h.fs.readFileSync(h.path.join(dir, 'old.md'), 'utf8')).toBe('OLD TABLE\r\n');
          expect(h.fs.readdirSync(dir).sort()).toEqual(['complete.json', 'old.json', 'old.md', 'shards', 'table.md']);

          var usage = tool(['--merge=' + rel + '/shards', '--jobs=4', '--variant=classic4']);
          expect(usage.code).toBe(2);
          expect(usage.err).toContain('--merge generates nothing and cannot be combined with --variant');
          expect(usage.err).toContain('Usage: node tests/qualify.js');
          var noJobs = tool(['--merge=' + rel + '/shards']);
          expect(noJobs.code).toBe(2);
          var live = tool(['--merge=' + rel + '/shards', '--jobs=4',
            '--markdown=../docs/difficulty-rating/qualification.md']);
          expect(live.code).toBe(2);
          expect(live.err).toContain('a merge never writes the live table');
        } finally {
          h.fs.rmSync(dir, { recursive: true, force: true });
          try {
            h.fs.rmdirSync(base);
          } catch (err) {
            // Another run's folder is in it: the base stays.
          }
        }
      });
  });
}());
