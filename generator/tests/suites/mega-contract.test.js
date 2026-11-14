// The mega Nightmare deep tier (difficulty v3, MS05r5m: tests/mega-contract.js and its pure helpers in
// tests/fixtures/mega-contract.js): the frozen population of 14 occurrences and their relations, the command line,
// the independent checks of a returned puzzle (valid, unique, sound, exact and warnings), the record of a request
// that returns a puzzle, ends in an error or cannot finish its checks, and the strict reconciliation of a
// directory of records and the CV3 reuse consumer, all on synthetic records made from a small real board and
// scripted producers. Nothing here generates a mega puzzle or runs the deep population.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var M = SG.fixtures.megaContract;
  var L = SG.fixtures.toolRecords;

  // The small board of the synthetic population: the same shape as a mega board (4 invariant seeds, 3 CV5 calls).
  var BOARD = 'classic6';
  var LEVEL = 'hard';
  var SMALL = M.makeManifest({ classic6: { digits: 6, boxRows: 2, boxCols: 3, attempts: 8 } }, LEVEL);
  var HEX = 'a'.repeat(64);
  var TOOL = 'b'.repeat(64);

  /** A 64-hex stand-in for SHA-256: the helpers only compare digests. */
  function digest(text) {
    var out = '';
    for (var round = 0; round < 8; round++) {
      var h = (0x811c9dc5 ^ Math.imul(round + 1, 0x9e3779b1)) >>> 0;
      for (var i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      out += ('00000000' + h.toString(16)).slice(-8);
    }
    return out;
  }

  function clock() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
    }
    return value;
  }

  function identity(entry) {
    return {
      sourceHash: HEX, toolHash: TOOL, commit: null, dirty: null, node: 'v0.0.0', machine: { platform: 'test' },
      argv: ['--request=' + entry.id, '--record=x.json'], startedAt: '2026-01-01T00:00:00.000Z'
    };
  }

  function entryOf(id) {
    return SMALL.entries.filter(function (e) { return e.id === id; })[0];
  }

  function budgetError(code, args) {
    return new SG.errors.GenerationError(code, args || {});
  }

  /** One request and its checks; `extra` is the env of `execute` (produce, budget). */
  function executed(entry, extra) {
    return M.execute(entry, Object.assign({ clock: clock, sha256: digest }, extra));
  }

  function recordOf(entry, out, manifest) {
    return M.recordOf(entry, identity(entry), out.run, M.manifestHash(digest, manifest || SMALL), out.result);
  }

  /** A producer that runs the real pipeline and then lets `change` alter or replace the result. */
  function producing(change) {
    return function (request, budget) {
      var result = SG.pipeline.run(request, null, budget);
      var changed = change(result, request);
      return changed === undefined ? result : changed;
    };
  }

  // The seven honest requests of the small population, made once.
  var outs = null;
  function population() {
    if (outs === null) {
      outs = {};
      SMALL.entries.forEach(function (entry) { outs[entry.id] = executed(entry); });
    }
    return outs;
  }

  function records(manifest) {
    var all = population();
    return (manifest || SMALL).entries.map(function (entry) {
      return clone(recordOf(entry, all[entry.id], manifest));
    });
  }

  function filesOf(list) {
    return list.map(function (record) { return { name: record.id + '.json', record: record }; });
  }

  function reconciled(list, options) {
    return M.reconcile(filesOf(list), Object.assign({ manifest: SMALL, sha256: digest }, options));
  }

  function byId(list, id) {
    return list.filter(function (r) { return r.id === id; })[0];
  }

  function problemsOf(doc) {
    return doc.problems.map(function (p) { return p.text; }).join(' | ');
  }

  /** Restamps a record's wire digests after a deliberate change of its wire (a forger who is careful). */
  function restamp(record) {
    record.puzzleDigest = digest([record.wire.model.variantId, record.wire.givens.join(','),
      record.wire.solution.join(',')].join('|'));
    record.wireDigest = digest(L.canonicalJson(record.wire));
  }

  describe('mega deep tier: the frozen population', function () {
    it('has the fourteen occurrences of the old Nightmare tests, each its own record, at the board defaults',
      function () {
        expect(M.MANIFEST.map(function (e) { return e.id; })).toEqual([
          'mega12-invariant-1', 'mega12-invariant-2', 'mega12-invariant-3', 'mega12-invariant-4',
          'mega12-cv5-a', 'mega12-cv5-b', 'mega12-cv5-other',
          'mega16-invariant-1', 'mega16-invariant-2', 'mega16-invariant-3', 'mega16-invariant-4',
          'mega16-cv5-a', 'mega16-cv5-b', 'mega16-cv5-other'
        ]);
        expect(M.MANIFEST.map(function (e) { return e.seed; })).toEqual([1, 2, 3, 4, 3, 3, 4, 1, 2, 3, 4, 3, 3, 4]);
        expect(M.MANIFEST.map(function (e) { return e.expectedAttempts; }))
          .toEqual([4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2]);
        M.MANIFEST.forEach(function (e) {
          expect(e.request).toEqual({ variantId: e.board, difficulty: 'nightmare', seed: e.seed, trace: 'off' });
          expect(Object.prototype.hasOwnProperty.call(e.request, 'maxAttempts')).toBe(false);
          expect(e.origin.indexOf(e.board + ' nightmare:')).toBe(0);
        });
        // Equal configurations keep their own identities: seed 3 is three occurrences per board.
        var seed3 = M.MANIFEST.filter(function (e) { return e.board === 'mega16' && e.seed === 3; });
        expect(seed3.map(function (e) { return e.id; }))
          .toEqual(['mega16-invariant-3', 'mega16-cv5-a', 'mega16-cv5-b']);
      });

    it('keeps the relations of the CV5 test per board and one extra comparison that is not original', function () {
      var mega16 = M.RELATIONS.filter(function (r) { return r.board === 'mega16'; });
      expect(mega16.map(function (r) { return [r.id, r.kind, r.original, r.a, r.b, r.compare]; })).toEqual([
        ['mega16-cv5-same-seed', 'same-seed', true, 'mega16-cv5-a', 'mega16-cv5-b', ['givens', 'solution', 'score']],
        ['mega16-cv5-other-seed', 'different-seed', true, 'mega16-cv5-other', 'mega16-cv5-a', ['solution']],
        ['mega16-invariant-3-same-seed', 'same-seed', false, 'mega16-invariant-3', 'mega16-cv5-a',
          ['givens', 'solution', 'score']]
      ]);
      expect(M.RELATIONS).toHaveLength(6);
    });

    it('lists the old mapping and the relations without generating anything', function () {
      var text = M.listText(digest);
      expect(text).toContain('14 requests');
      expect(text).toContain('mega12-cv5-b  mega12 nightmare seed 3  attempts 4  (was: mega12 nightmare: the same ' +
        'seed gives the same puzzle (CV5), second seed-3 call (c))');
      expect(text).toContain('(extra, not an original relation)');
    });

    it('normalises every fixed request to the default attempts of its board, trace off, no explicit number',
      function () {
        M.MANIFEST.forEach(function (e) {
          var config = L.withRequestedLevel(e.board, e.request.difficulty, function () {
            return SG.pipeline.normalizeConfig(e.request);
          }).value;
          expect([e.id, config.maxAttempts]).toEqual([e.id, e.expectedAttempts]);
          expect(SG.digger.defaultMaxAttempts(SG.variants.cellCountOf(SG.variants.get(e.board))))
            .toBe(e.expectedAttempts);
          expect([config.difficulty, config.trace]).toEqual(['nightmare', 'off']);
        });
      });

    it('has a manifest hash that follows the population', function () {
      var hash = M.manifestHash(digest);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(M.manifestHash(digest, SMALL)).not.toBe(hash);
      var shifted = M.makeManifest({ mega12: { digits: 12, boxRows: 3, boxCols: 4, attempts: 8 },
        mega16: M.BOARDS.mega16 }, 'nightmare');
      expect(M.manifestHash(digest, shifted)).not.toBe(hash);
    });
  });

  describe('mega deep tier: the command line', function () {
    function usage(argv) {
      var thrown = null;
      try { M.parseArgs(argv); } catch (e) { thrown = e; }
      expect(thrown).toBeTruthy();
      expect(thrown.code).toBe('usage');
      return thrown.message;
    }

    it('reads the three commands', function () {
      expect(M.parseArgs(['--list'])).toEqual({ mode: 'list' });
      expect(M.parseArgs(['--request=mega12-invariant-1', '--record=..\\a\\mega12-invariant-1.json']))
        .toEqual({ mode: 'request', id: 'mega12-invariant-1', record: '..\\a\\mega12-invariant-1.json' });
      expect(M.parseArgs(['--json=out.json', '--reconcile=dir']))
        .toEqual({ mode: 'reconcile', directory: 'dir', json: 'out.json' });
    });

    it('refuses unknown, repeated, empty, conflicting and incomplete commands', function () {
      expect(usage([])).toContain('required');
      expect(usage(['--list', '--request=mega12-invariant-1'])).toContain('--list cannot be combined');
      expect(usage(['--list=yes'])).toContain('takes no value');
      expect(usage(['--bogus'])).toContain('unknown argument');
      expect(usage(['mega12-invariant-1'])).toContain('unknown argument');
      expect(usage(['--request=mega12-invariant-1', '--request=mega12-invariant-2', '--record=a.json']))
        .toContain('given twice');
      expect(usage(['--request=', '--record=a.json'])).toContain('needs a value');
      expect(usage(['--request=mega12-invariant-9', '--record=a.json'])).toContain('is not one of');
      expect(usage(['--request=mega12-invariant-1'])).toContain('needs --record');
      expect(usage(['--record=a.json'])).toContain('needs --request');
      expect(usage(['--reconcile=dir'])).toContain('needs --json');
      expect(usage(['--json=a.json'])).toContain('needs --reconcile');
      expect(usage(['--request=mega12-invariant-1', '--record=a.json', '--reconcile=dir', '--json=b.json']))
        .toContain('different commands');
      expect(usage(['--request=mega12-invariant-1', '--record=a.json', '--json=b.json'])).toContain('different');
    });
  });

  describe('mega deep tier: one request and its independent checks', function () {
    it('records a returned puzzle with every check true and the generation and check time apart', function () {
      var entry = entryOf('classic6-invariant-3');
      var out = population()[entry.id];
      var record = recordOf(entry, out);
      expect(record.outcome).toBe('ok');
      expect(record.correctness).toBe('pass');
      expect(M.exitCodeOf(record)).toBe(0);
      expect(Object.keys(record.checks)).toEqual(M.CHECKS);
      M.CHECKS.forEach(function (name) { expect([name, record.checks[name]]).toEqual([name, true]); });
      expect(record.failedChecks).toEqual([]);
      expect(record.unevaluatedChecks).toEqual([]);
      expect(record.request).toEqual(entry.request);
      expect(record.normalizedConfig.maxAttempts).toBe(8);
      expect(record.effectiveMaxAttempts).toBe(8);
      expect(record.allowance).toBe(SG.digger.SHALLOW_SEARCH_RATINGS);
      expect(record.generationMs).toBeGreaterThan(0);
      expect(record.checkMs).toBeGreaterThan(0);
      expect(record.totalMs).toBeCloseTo(record.generationMs + record.checkMs, 2);
      expect(record.guardMarginMs).toBeCloseTo(M.BUDGET_MS - record.totalMs, 2);
      expect(record.overrides).toEqual([]);
      expect(record.puzzleDigest).toMatch(/^[0-9a-f]{64}$/);
      expect(record.exact).toBe(out.result.exact);
      expect(record.warnings).toEqual(out.result.warnings);
      expect(record.wire.seed).toBe(3);
      expect(SG.replay.fromPlainWire(clone(record.wire)).solution).toEqual(out.result.solution);
    });

    it('offers a hidden level for the run only, records it and puts the original support array back', function () {
      var def = SG.variants.get(BOARD);
      var original = def.difficultySupport;
      def.difficultySupport = original.filter(function (level) { return level !== LEVEL; });
      var shown = def.difficultySupport;
      try {
        var entry = entryOf('classic6-invariant-1');
        var out = executed(entry);
        expect(out.run.overridden).toBe(true);
        expect(def.difficultySupport).toBe(shown);
        var record = recordOf(entry, out);
        expect(record.overrides).toEqual(['classic6:hard']);
        expect(record.outcome).toBe('ok');
        expect(record.correctness).toBe('pass');
      } finally {
        def.difficultySupport = original;
      }
    });

    it('accepts a truthful fallback: valid and unique, not exact, with the warnings its rating needs', function () {
      var entry = entryOf('classic6-invariant-2');
      // A veryEasy puzzle for a hard request is a puzzle of another level: exact false and approximate only.
      var out = executed(entry, { produce: function (request, budget) {
        var result = SG.pipeline.run(Object.assign({}, request, { difficulty: 'veryEasy' }), null, budget);
        result.exact = false;
        result.attempts = 8;
        result.config = Object.assign({}, result.config, { maxAttempts: 8 });
        result.warnings = ['difficulty.approximate'];
        return result;
      } });
      var record = recordOf(entry, out);
      expect(record.correctness).toBe('pass');
      expect([record.exact, record.achieved, record.expected.exact, record.expected.shallow])
        .toEqual([false, 'veryEasy', false, false]);
    });

    it('requires both warnings of a shallow fallback and refuses an exact flag on it', function () {
      var entry = entryOf('classic6-invariant-2');
      function shallow(change) {
        return function (request, budget) {
          var result = SG.pipeline.run(request, null, budget);
          result.attempts = 8;
          change(result);
          // From here on the requested level is complete but its tier is not needed: a shallow puzzle.
          SG.difficulty.requiredOf = function (rating) {
            return rating && rating.solved === true ? { required: false, vacuous: false, floorLevel: 'normal' } : null;
          };
          return result;
        };
      }
      var original = SG.difficulty.requiredOf;
      try {
        var good = recordOf(entry, executed(entry, { produce: shallow(function (r) {
          r.exact = false;
          r.warnings = ['difficulty.approximate', 'difficulty.shallow'];
        }) }));
        SG.difficulty.requiredOf = original;
        expect(good.correctness).toBe('pass');
        expect(good.expected).toEqual({ complete: true, exact: false, approximate: true, shallow: true });

        var missing = recordOf(entry, executed(entry, { produce: shallow(function (r) {
          r.exact = false;
          r.warnings = ['difficulty.approximate'];
        }) }));
        SG.difficulty.requiredOf = original;
        expect(missing.failedChecks).toEqual(['shallowWarning']);
        expect(M.exitCodeOf(missing)).toBe(1);

        var exact = recordOf(entry, executed(entry, { produce: shallow(function (r) { r.warnings = []; }) }));
        SG.difficulty.requiredOf = original;
        expect(exact.failedChecks).toEqual(['exactFlag', 'approximateWarning', 'shallowWarning']);
      } finally {
        SG.difficulty.requiredOf = original;
      }
    });

    it('fails a wrong exact flag, a missing approximate warning and an unsound-technique warning', function () {
      var entry = entryOf('classic6-invariant-3');
      var flipped = recordOf(entry, executed(entry, { produce: producing(function (r) {
        r.exact = false;
        r.warnings = ['difficulty.approximate', 'difficulty.shallow'];
      }) }));
      expect(flipped.failedChecks).toContain('exactFlag');
      expect(flipped.failedChecks).toContain('approximateWarning');
      expect(flipped.failedChecks).toContain('shallowWarning');
      expect(flipped.correctness).toBe('fail');
      var unsound = recordOf(entry, executed(entry, { produce: producing(function (r) {
        r.warnings = ['digger.unsoundTechnique'];
      }) }));
      expect(unsound.failedChecks).toEqual(['noOtherWarning']);
      var other = recordOf(entry, executed(entry, { produce: producing(function (r) {
        r.warnings = ['trace.downgraded'];
      }) }));
      expect(other.failedChecks).toEqual(['noOtherWarning']);
    });

    it('fails a wrong attempt count and one that did not use the board default', function () {
      var entry = entryOf('classic6-invariant-3');
      var fewer = recordOf(entry, executed(entry, { produce: producing(function (r) {
        r.exact = false;
        r.warnings = ['difficulty.approximate'];
        r.attempts = 3;
      }) }));
      expect(fewer.failedChecks).toContain('attemptsPolicy');
      var explicit = recordOf(entry, executed(entry, { produce: function (request, budget) {
        return SG.pipeline.run(Object.assign({}, request, { maxAttempts: 5 }), null, budget);
      } }));
      expect(explicit.failedChecks).toContain('attemptsPolicy');
      expect(explicit.checkDetails.attemptsPolicy.configured).toBe(5);
    });

    it('fails an invalid, non-unique or unsound puzzle however it is labelled', function () {
      var entry = entryOf('classic6-invariant-4');
      var bent = recordOf(entry, executed(entry, { produce: producing(function (r) {
        var cell = 0;
        while (r.givens[cell] === 0) cell++;
        r.solution[cell] = r.solution[cell] % 6 + 1;
      }) }));
      expect(bent.failedChecks).toContain('givensMatchSolution');
      expect(bent.failedChecks).toContain('validSolution');
      expect(bent.failedChecks).toContain('latin');
      var thin = recordOf(entry, executed(entry, { produce: producing(function (r) {
        for (var c = 5; c < r.givens.length; c++) r.givens[c] = 0;
      }) }));
      expect(thin.failedChecks).toContain('unique');
      expect(thin.failedChecks).toContain('clueFloor');
      expect(thin.correctness).toBe('fail');
      expect(M.exitCodeOf(thin)).toBe(1);
    });

    it('keeps a generation error with its identity, no puzzle and every check unevaluated', function () {
      var entry = entryOf('classic6-cv5-b');
      [['budget.exceeded', { reason: 'time', limitMs: 500000, limitNodes: Infinity, nodes: 9, elapsedMs: 500002 }],
        ['budget.cancelled', { reason: 'cancelled', limitMs: 500000, limitNodes: Infinity, nodes: 3, elapsedMs: 4 }]
      ].forEach(function (pair) {
        var out = executed(entry, { produce: function () { throw budgetError(pair[0], pair[1]); } });
        var record = recordOf(entry, out);
        expect(record.outcome).toBe('generation-error');
        expect(record.error.code).toBe(pair[0]);
        expect(record.error.phase).toBe('generation');
        expect(record.error.args.reason).toBe(pair[1].reason);
        expect(record.error.args.limitNodes).toBeNull();
        expect(record.wire).toBeNull();
        expect(record.puzzleDigest).toBeNull();
        expect(record.checkMs).toBeNull();
        expect(record.correctness).toBe('unevaluated');
        expect(record.unevaluatedChecks).toEqual(M.CHECKS);
        expect(M.exitCodeOf(record)).toBe(3);
        expect(M.renderRecord(record)).toContain('"code":"' + pair[0] + '"');
      });
    });

    it('keeps a puzzle whose checks ran out of budget or were cancelled: a check error, not a result', function () {
      var entry = entryOf('classic6-invariant-1');
      function stopped(budget) {
        return recordOf(entry, executed(entry, {
          budget: budget,
          produce: function (request) { return SG.pipeline.run(request, null, SG.budget.create({ ms: 60000 })); }
        }));
      }
      var cancelled = SG.budget.create();
      cancelled.cancel();
      [[SG.budget.create({ nodes: 0 }), 'budget.exceeded', 'nodes'], [cancelled, 'budget.cancelled', 'cancelled']]
        .forEach(function (c) {
          var record = stopped(c[0]);
          expect(record.outcome).toBe('check-error');
          expect(record.error.phase).toBe('check');
          expect(record.error.code).toBe(c[1]);
          expect(record.error.args.reason).toBe(c[2]);
          expect(record.wire).not.toBeNull();
          expect(record.correctness).toBe('unevaluated');
          ['variantMatches', 'givensMatchSolution', 'validSolution', 'latin', 'clueFloor', 'bandAndGroup',
            'attemptsPolicy', 'wireRoundTrip'].forEach(function (name) { expect(record.checks[name]).toBe(true); });
          ['unique', 'ratingAgrees', 'exactFlag', 'approximateWarning', 'shallowWarning', 'noOtherWarning',
            'soundness'].forEach(function (name) { expect(record.checks[name]).toBeNull(); });
          expect(M.exitCodeOf(record)).toBe(3);
        });
    });

    it('refuses a source without the recovery allowance before anything is generated', function () {
      var allowance = SG.digger.SHALLOW_SEARCH_RATINGS;
      var generated = 0;
      SG.digger.SHALLOW_SEARCH_RATINGS = undefined;
      try {
        var thrown = null;
        try {
          executed(entryOf('classic6-invariant-1'), { produce: function () { generated++; } });
        } catch (e) {
          thrown = e;
        }
        expect(thrown && thrown.code).toBe('usage');
        expect(generated).toBe(0);
      } finally {
        SG.digger.SHALLOW_SEARCH_RATINGS = allowance;
      }
    });

    it('writes a record as CRLF text of plain finite data that parses back', function () {
      var record = clone(recordOf(entryOf('classic6-invariant-1'), population()['classic6-invariant-1']));
      var text = M.renderRecord(record);
      expect(text.slice(-2)).toBe('\r\n');
      expect(/(?<!\r)\n/.test(text)).toBe(false);
      expect(/[ \t]+\r?$/m.test(text)).toBe(false);
      expect(JSON.parse(text)).toEqual(record);
      var bad = clone(record);
      bad.generationMs = Infinity;
      var thrown = null;
      try { M.renderRecord(bad); } catch (e) { thrown = e; }
      expect(thrown instanceof TypeError).toBe(true);
    });
  });

  describe('mega deep tier: reconciling a directory of records', function () {
    it('reconciles seven honest records: every occurrence once, every relation evaluated', function () {
      var doc = reconciled(records());
      expect(doc.problems).toEqual([]);
      expect([doc.complete, doc.evidenceSound, doc.correctness]).toEqual([true, true, 'pass']);
      expect(doc.generation).toEqual({ requested: 7, produced: 7, unavailable: [], checkErrors: [] });
      expect(doc.relationVerdicts).toEqual({ pass: 3, fail: 0, unevaluated: 0 });
      expect(doc.relations.map(function (r) { return r.id; })).toEqual(['classic6-cv5-same-seed',
        'classic6-cv5-other-seed', 'classic6-invariant-3-same-seed']);
      expect(doc.relations[1].equal).toEqual({ solution: false });
      expect(doc.identity.sourceHash).toBe(HEX);
      expect(M.exitCodeOfReconciliation(doc)).toBe(0);
      expect(doc.boards.classic6.requests).toBe(7);
      expect(doc.boards.classic6.guard.status).toBe('reported');
      expect(M.renderRecord(doc)).toContain('"complete": true');
    });

    it('reports whether the records still match the current sources', function () {
      var same = reconciled(records(), { current: { sourceHash: HEX, toolHash: TOOL } });
      expect(same.identity.currentMatches).toEqual({ sourceHash: true, toolHash: true });
      var stale = reconciled(records(), { current: { sourceHash: 'c'.repeat(64), toolHash: TOOL } });
      expect(stale.identity.currentMatches).toEqual({ sourceHash: false, toolHash: true });
      expect(stale.evidenceSound).toBe(true);
    });

    it('refuses a missing, a duplicate and an unexpected occurrence and a stray file', function () {
      var list = records();
      var missing = reconciled(list.filter(function (r) { return r.id !== 'classic6-cv5-b'; }));
      expect(missing.complete).toBe(false);
      expect(problemsOf(missing)).toContain('missing: no record of this occurrence');
      expect(missing.relations[0].verdict).toBe('unevaluated');
      expect(missing.relations[0].reason).toContain('classic6-cv5-b: missing');
      expect(M.exitCodeOfReconciliation(missing)).toBe(1);

      var files = filesOf(list);
      files.push({ name: 'copy.json', record: clone(byId(list, 'classic6-invariant-1')) });
      var duplicate = M.reconcile(files, { manifest: SMALL, sha256: digest });
      expect(problemsOf(duplicate)).toContain('duplicate: recorded by');
      expect(duplicate.complete).toBe(false);

      var stranger = clone(byId(list, 'classic6-invariant-1'));
      stranger.id = 'classic6-invariant-7';
      var other = M.reconcile(filesOf(list).concat([{ name: 'classic6-invariant-7.json', record: stranger },
        { name: 'notes.txt', error: 'unexpected entry' }, { name: 'bad.json', error: 'not valid JSON (x)' }]),
      { manifest: SMALL, sha256: digest });
      expect(problemsOf(other)).toContain('not an occurrence of the manifest');
      expect(problemsOf(other)).toContain('unexpected entry');
      expect(problemsOf(other)).toContain('not valid JSON');
      expect(other.evidenceSound).toBe(false);
    });

    it('does not accept one record read twice for two equal configurations', function () {
      var list = records();
      var copy = clone(byId(list, 'classic6-cv5-a'));
      copy.id = 'classic6-cv5-b';
      var doc = reconciled(list.map(function (r) { return r.id === 'classic6-cv5-b' ? copy : r; }));
      expect(problemsOf(doc)).toContain('argv does not show the request classic6-cv5-b');
      expect(doc.evidenceSound).toBe(false);
      var renamed = M.reconcile(filesOf(list).map(function (f) {
        return f.record.id === 'classic6-cv5-b' ? { name: 'classic6-cv5-a.json', record: f.record } : f;
      }), { manifest: SMALL, sha256: digest });
      expect(problemsOf(renamed)).toContain('the file is not named classic6-cv5-b.json');
    });

    it('refuses mixed identities, another budget, another request and another manifest', function () {
      var list = records();
      byId(list, 'classic6-invariant-2').sourceHash = 'c'.repeat(64);
      byId(list, 'classic6-invariant-3').node = 'v99.0.0';
      expect(problemsOf(reconciled(list))).toContain('mixed identities: sourceHash has 2 values');
      expect(problemsOf(reconciled(list))).toContain('mixed identities: node has 2 values');
      var budget = records();
      byId(budget, 'classic6-invariant-1').diagnosticBudgetMs = 400000;
      expect(problemsOf(reconciled(budget))).toContain('the diagnostic budget 400000 ms is not 500000 ms');
      var request = records();
      byId(request, 'classic6-invariant-1').request.seed = 2;
      expect(problemsOf(reconciled(request))).toContain('the request is not the manifest\'s');
      var attempts = records();
      byId(attempts, 'classic6-invariant-1').normalizedConfig.maxAttempts = 3;
      expect(problemsOf(reconciled(attempts))).toContain('the normalised attempts 3 are not the board default 8');
      expect(problemsOf(M.reconcile(filesOf(records()), { manifest: M.makeManifest(
        { classic6: { digits: 6, boxRows: 2, boxCols: 3, attempts: 8 } }, 'veryEasy'), sha256: digest })))
        .toContain('manifestHash is not the current manifest\'s');
    });

    it('refuses a tampered wire and a tampered digest, and leaves their relations unevaluated', function () {
      var list = records();
      var tampered = byId(list, 'classic6-cv5-a');
      tampered.wire.givens[tampered.wire.givens.indexOf(0)] = 1;
      var doc = reconciled(list);
      expect(problemsOf(doc)).toContain('puzzleDigest is not the digest of the wire');
      expect(problemsOf(doc)).toContain('wireDigest is not the digest of the wire');
      expect(doc.relations[0].verdict).toBe('unevaluated');
      expect(doc.relations[0].reason).toContain('classic6-cv5-a: evidence problem');
      expect(M.exitCodeOfReconciliation(doc)).toBe(1);

      var swapped = records();
      byId(swapped, 'classic6-cv5-a').puzzleDigest = byId(swapped, 'classic6-invariant-1').puzzleDigest;
      expect(problemsOf(reconciled(swapped))).toContain('puzzleDigest is not the digest');
    });

    it('derives the flags again: a wrong exact flag or warning with a consistent wire is still refused',
      function () {
        var list = records();
        var liar = byId(list, 'classic6-invariant-3');
        liar.exact = false;
        liar.wire.exact = false;
        restamp(liar);
        var doc = reconciled(list);
        expect(problemsOf(doc)).toContain('check exactFlag says true but the recorded data give false');
        expect(doc.evidenceSound).toBe(false);
        var warned = records();
        var w = byId(warned, 'classic6-invariant-3');
        w.warnings = ['difficulty.approximate'];
        w.wire.warnings = ['difficulty.approximate'];
        restamp(w);
        expect(problemsOf(reconciled(warned))).toContain('check approximateWarning says true but the recorded data');
        var flagged = records();
        var f = byId(flagged, 'classic6-invariant-3');
        f.checks.exactFlag = false;
        expect(problemsOf(reconciled(flagged))).toContain('failedChecks does not list the false checks');
      });

    it('reports a failed recorded check as a correctness failure, not as an evidence problem', function () {
      var list = records();
      var entry = entryOf('classic6-invariant-4');
      list[3] = clone(recordOf(entry, executed(entry, { produce: producing(function (r) {
        r.exact = false;
        r.warnings = ['difficulty.approximate', 'difficulty.shallow'];
        r.attempts = 8;
      }) })));
      var doc = reconciled(list);
      expect(doc.evidenceSound).toBe(true);
      expect(doc.correctness).toBe('fail');
      expect(doc.correctnessDetail.failed[0].id).toBe('classic6-invariant-4');
      expect(doc.correctnessDetail.failed[0].failedChecks).toContain('shallowWarning');
      expect(M.exitCodeOfReconciliation(doc)).toBe(1);
    });

    it('keeps an unavailable request with its error: sound but incomplete, its relation unevaluated', function () {
      var list = records();
      var entry = entryOf('classic6-cv5-b');
      var failed = executed(entry, { produce: function () {
        throw budgetError('budget.exceeded', { reason: 'time', limitMs: 500000, limitNodes: Infinity, nodes: 7,
          elapsedMs: 500010 });
      } });
      list = list.map(function (r) { return r.id === entry.id ? clone(recordOf(entry, failed)) : r; });
      var doc = reconciled(list);
      expect(doc.evidenceSound).toBe(true);
      expect(doc.complete).toBe(true);
      expect(doc.correctness).toBe('incomplete');
      expect(doc.generation.produced).toBe(6);
      expect(doc.generation.unavailable.map(function (u) { return [u.id, u.code]; }))
        .toEqual([['classic6-cv5-b', 'budget.exceeded']]);
      expect(doc.relations[0].verdict).toBe('unevaluated');
      expect(doc.relations[0].reason).toContain('classic6-cv5-b: generation-error budget.exceeded');
      expect(doc.relations[2].verdict).toBe('pass');
      expect(doc.relationVerdicts).toEqual({ pass: 2, fail: 0, unevaluated: 1 });
      expect(doc.boards.classic6.unavailable).toBe(1);
      expect(doc.boards.classic6.guard.status).toBe('unavailable');
      expect(doc.boards.classic6.guard.reason).toContain('6 of 7 requests completed');
      expect(M.exitCodeOfReconciliation(doc)).toBe(3);
    });

    it('fails a relation that does not hold: same-seed puzzles that differ, different seeds that agree',
      function () {
        var relations = [
          { id: 'x-same', board: BOARD, kind: 'same-seed', original: true, a: 'classic6-invariant-1',
            b: 'classic6-invariant-2', compare: ['givens', 'solution', 'score'] },
          { id: 'x-other', board: BOARD, kind: 'different-seed', original: true, a: 'classic6-cv5-a',
            b: 'classic6-cv5-b', compare: ['solution'] },
          { id: 'x-score', board: BOARD, kind: 'same-seed', original: false, a: 'classic6-cv5-a',
            b: 'classic6-cv5-b', compare: ['score'] }
        ];
        var manifest = Object.freeze({ entries: SMALL.entries, relations: relations });
        var doc = M.reconcile(filesOf(records(manifest)), { manifest: manifest, sha256: digest });
        expect(doc.evidenceSound).toBe(true);
        expect(doc.relations.map(function (r) { return r.verdict; })).toEqual(['fail', 'fail', 'pass']);
        expect(doc.relations[0].equal.solution).toBe(false);
        expect(doc.relations[1].equal).toEqual({ solution: true });
        expect(doc.correctness).toBe('fail');
        expect(M.exitCodeOfReconciliation(doc)).toBe(1);
      });

    it('compares the score as well as the arrays: equal givens and solution with another score fail the relation',
      function () {
        var list = records();
        var other = byId(list, 'classic6-cv5-b');
        other.score = other.score + 1;
        other.wire.rating = Object.assign({}, other.wire.rating, { score: other.score });
        restamp(other);
        var doc = reconciled(list);
        var same = doc.relations[0];
        expect(same.equal).toEqual({ givens: true, solution: true, score: false });
        expect(same.verdict).toBe('fail');
        expect(doc.correctness).toBe('fail');
        expect(doc.relations[1].verdict).toBe('pass');
      });

    it('keeps a puzzle whose checks ran out of budget: sound but incomplete, its relations still evaluated',
      function () {
        var entry = entryOf('classic6-cv5-b');
        var stopped = SG.budget.create();
        stopped.cancel();
        var out = executed(entry, {
          budget: stopped,
          produce: function (request) { return SG.pipeline.run(request, null, SG.budget.create({ ms: 60000 })); }
        });
        var list = records().map(function (r) { return r.id === entry.id ? clone(recordOf(entry, out)) : r; });
        var doc = reconciled(list);
        expect(doc.evidenceSound).toBe(true);
        expect(doc.correctness).toBe('incomplete');
        expect(doc.generation.produced).toBe(7);
        expect(doc.generation.checkErrors.map(function (e) { return [e.id, e.code]; }))
          .toEqual([['classic6-cv5-b', 'budget.cancelled']]);
        expect(doc.relations[0].verdict).toBe('pass');
        expect(doc.boards.classic6.guard.status).toBe('unavailable');
        expect(M.exitCodeOfReconciliation(doc)).toBe(3);
      });

    it('reports a guard only from a completed population, with its margin, and never above the budget',
      function () {
        function rows(totals) {
          return totals.map(function (ms, i) {
            return { id: 'r' + i, outcome: 'ok', evidenceOk: true, generationMs: ms - 1000, checkMs: 1000 };
          });
        }
        var all = M.guardOf(rows([20000, 41000, 100000, 60000, 3000, 7000, 99000]), M.BUDGET_MS, 7);
        expect([all.status, all.guardMs, all.maxTotalMs, all.marginMs, all.capped])
          .toEqual(['reported', 150000, 100000, 50000, false]);
        expect(all.marginShare).toBeCloseTo(1 / 3, 3);
        var capped = M.guardOf(rows([400000, 1000]), M.BUDGET_MS, 2);
        expect([capped.guardMs, capped.marginMs, capped.capped]).toEqual([500000, 100000, true]);
        var partial = M.guardOf(rows([20000, 41000]), M.BUDGET_MS, 7);
        expect([partial.status, partial.guardMs, partial.marginMs]).toEqual(['unavailable', null, null]);
        expect(partial.reason).toContain('2 of 7 requests completed');
        var unsound = rows([20000, 20000]);
        unsound[1].evidenceOk = false;
        expect(M.guardOf(unsound, M.BUDGET_MS, 2).status).toBe('unavailable');
      });
  });

  describe('mega deep tier: the read-only consumer of CV3 (MS05b3)', function () {
    var QUERY = { variantId: BOARD, level: LEVEL, seed: 3 };
    var NOW = { sourceHash: HEX, toolHash: TOOL };

    function take(list, query, current, extra) {
      return M.reuse(list, query || QUERY, current || NOW, Object.assign({ manifest: SMALL, sha256: digest }, extra));
    }

    it('decodes a fresh copy of the invariant occurrence and leaves the records untouched', function () {
      var frozen = deepFreeze(records());
      var taken = take(frozen);
      expect(taken.ok).toBe(true);
      expect(taken.reasons).toEqual([]);
      expect(taken.id).toBe('classic6-invariant-3');
      expect(taken.generation).toBe('reused');
      var original = population()['classic6-invariant-3'].result;
      expect(Array.from(taken.result.givens)).toEqual(Array.from(original.givens));
      expect(Array.from(taken.result.solution)).toEqual(Array.from(original.solution));
      expect(taken.result.givens instanceof Int32Array).toBe(true);
      expect(taken.result.exact).toBe(original.exact);
      expect(taken.result.config.seed).toBe(3);
      expect(taken.recorded.generationMs).toBe(byId(frozen, 'classic6-invariant-3').generationMs);
      expect(taken.recorded.correctness).toBe('pass');
      expect(taken.result.givens).not.toBe(byId(frozen, 'classic6-invariant-3').wire.givens);
    });

    it('never takes a CV5 repeat, another seed, another level or another board', function () {
      var onlyRepeats = records().filter(function (r) { return r.group === 'cv5'; });
      expect(take(onlyRepeats).reasons).toEqual(['no record of classic6-invariant-3']);
      expect(take(records(), { variantId: BOARD, level: LEVEL, seed: 5 }).reasons[0])
        .toContain('no invariant occurrence');
      expect(take(records(), { variantId: BOARD, level: 'easy', seed: 3 }).ok).toBe(false);
      expect(take(records(), { variantId: 'classic9', level: LEVEL, seed: 3 }).ok).toBe(false);
      expect(take(records().concat([clone(byId(records(), 'classic6-invariant-3'))])).reasons)
        .toEqual(['2 records of classic6-invariant-3']);
    });

    it('refuses other engine sources, another tool, configuration, allowance and checks version', function () {
      var list = records();
      expect(take(list, QUERY, { sourceHash: 'c'.repeat(64), toolHash: TOOL }).reasons)
        .toEqual(['the record was made by other engine sources']);
      expect(take(list, QUERY, { sourceHash: HEX, toolHash: 'd'.repeat(64) }).reasons)
        .toEqual(['the record was validated by another tool']);
      expect(take(list, QUERY, {}).reasons).toEqual(['the current source identity is not given',
        'the current validation identity is not given']);
      var config = clone(byId(list, 'classic6-invariant-3').normalizedConfig);
      config.symmetry = 'none';
      expect(take(list, QUERY, { sourceHash: HEX, toolHash: TOOL, config: config }).reasons)
        .toEqual(['the normalised configuration is not the current one']);
      expect(take(list, QUERY, { sourceHash: HEX, toolHash: TOOL, allowance: null }).reasons[0])
        .toContain('is not the current null');
      var stale = records();
      byId(stale, 'classic6-invariant-3').checksVersion = 0;
      expect(take(stale).reasons[0]).toContain('checksVersion 0');
    });

    it('refuses a tampered wire or digest and a wrong exact flag', function () {
      var list = records();
      byId(list, 'classic6-invariant-3').wire.solution[0] = 9;
      var taken = take(list);
      expect(taken.ok).toBe(false);
      expect(taken.result).toBeNull();
      expect(taken.reasons.join(' | ')).toContain('wireDigest is not the digest of the wire');
      var liar = records();
      var record = byId(liar, 'classic6-invariant-3');
      record.exact = !record.exact;
      expect(take(liar).ok).toBe(false);
    });

    it('returns an unavailable request as such and never another puzzle', function () {
      var entry = entryOf('classic6-invariant-3');
      var failed = executed(entry, { produce: function () {
        throw budgetError('budget.exceeded', { reason: 'time', limitMs: 500000, limitNodes: Infinity, nodes: 1,
          elapsedMs: 500001 });
      } });
      var list = records().map(function (r) { return r.id === entry.id ? clone(recordOf(entry, failed)) : r; });
      var taken = take(list);
      expect(taken.ok).toBe(false);
      expect(taken.result).toBeNull();
      expect(taken.unavailable.code).toBe('budget.exceeded');
      expect(taken.unavailable.generationMs).toBeGreaterThanOrEqual(0);
      expect(taken.reasons).toEqual(['the request ended in budget.exceeded: no puzzle was returned']);
    });

    it('hands over a puzzle whose recorded checks failed so that CV3 applies its own checks', function () {
      var entry = entryOf('classic6-invariant-3');
      var wrong = executed(entry, { produce: producing(function (r) {
        r.exact = false;
        r.warnings = ['difficulty.approximate', 'difficulty.shallow'];
        r.attempts = 8;
      }) });
      var list = records().map(function (r) { return r.id === entry.id ? clone(recordOf(entry, wrong)) : r; });
      var taken = take(list);
      expect(taken.ok).toBe(true);
      expect(taken.recorded.correctness).toBe('fail');
      expect(taken.recorded.failedChecks).toContain('shallowWarning');
    });
  });
})();
