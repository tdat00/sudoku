// The pattern-cost tool (difficulty v3, MS07a): the pure helpers of tests/fixtures/pattern-cost.js on fake
// observations and fake clocks, the measurement loop on the real fixtures of two registered finders with a fake
// clock, and the Node tool tests/pattern-cost.js as real processes (help, list, refusals, one tiny real record).
// A quick suite measures nothing: no assertion here reads a real wall-clock time, and no number below is evidence
// of a gate (the cost recordings of the technique tasks are made with the tool, not by this suite).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var P = SG.fixtures.patternCost;
  var F = SG.fixtures.techniques;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function usageProblem(args) {
    try {
      P.parseArgs(args);
    } catch (err) {
      return err;
    }
    return null;
  }

  /** A clock that moves one millisecond per reading, and a digest that is only a stand-in. */
  function fakeEnv() {
    var t = 0;
    return {
      clock: function () { t += 1; return t; },
      digest: function (text) { return 'digest:' + text.length; }
    };
  }

  describe('pattern cost: command line', function () {
    it('reads a run with the defaults, and every option', function () {
      expect(P.parseArgs(['--ids=nishio', '--json=out.json'])).toEqual({
        mode: 'run', ids: ['nishio'], runs: 20, json: 'out.json', caseText: null });
      expect(P.parseArgs(['--ids=forcingChain,nishio', '--runs=5', '--json=a/b.json', '--case=puzzle 2']))
        .toEqual({ mode: 'run', ids: ['forcingChain', 'nishio'], runs: 5, json: 'a/b.json', caseText: 'puzzle 2' });
      expect(P.parseArgs(['--runs=200', '--ids=x', '--json=o.json']).runs).toBe(200);
    });

    it('reads a list and the help, which run nothing', function () {
      expect(P.parseArgs(['--ids=nishio', '--list', '--case=empty'])).toEqual({
        mode: 'list', ids: ['nishio'], runs: null, json: null, caseText: 'empty' });
      expect(P.parseArgs(['--help'])).toEqual({ mode: 'help' });
      expect(P.USAGE).toContain('--ids=<id>[,<id>]');
      expect(P.USAGE).toContain('--runs=<n>');
      expect(P.USAGE).toContain('--json=<file>');
      expect(P.USAGE).toContain('--case=<text>');
    });

    it('refuses what it cannot run, with the usage code', function () {
      [[], ['--json=o.json'], ['--ids=nishio'], ['--ids='], ['--ids=1bad', '--json=o.json'],
        ['--ids=a b', '--json=o.json'], ['--ids=nishio,nishio', '--json=o.json'],
        ['--ids=nishio', '--runs=0', '--json=o.json'], ['--ids=nishio', '--runs=201', '--json=o.json'],
        ['--ids=nishio', '--runs=2.5', '--json=o.json'], ['--ids=nishio', '--runs=x', '--json=o.json'],
        ['--ids=nishio', '--runs=-1', '--json=o.json'], ['--ids=nishio', '--json='],
        ['--ids=nishio', '--json=o.json', '--json=p.json'], ['--ids=nishio', '--json=o.json', '--case='],
        ['--ids=nishio', '--list', '--json=o.json'], ['--ids=nishio', '--list', '--runs=3'],
        ['--ids=nishio', '--list=1'], ['--help', '--ids=nishio'], ['--help=1'], ['--ids=nishio', '--bogus'],
        ['nishio'], ['--ids', 'nishio']].forEach(function (args) {
        var err = usageProblem(args);
        if (!err || err.code !== 'usage') throw new Error('not refused as usage: ' + JSON.stringify(args));
      });
    });
  });

  describe('pattern cost: the cases', function () {
    function inventory(extra) {
      return [Object.assign({ id: 'alpha', registered: true, scope: null, hasEntry: true,
        positive: [{ name: 'Alpha one', puzzle: 'p1', after: null }, { name: 'Alpha two', puzzle: 'p2', after: [] }],
        negative: [{ name: 'Alpha nothing', puzzle: 'p3', after: null }] }, extra)];
    }

    it('reads the registry and the active fixtures of the ids', function () {
      var items = P.inventoryOf(['forcingChain', 'nishio', 'noSuchTechnique']);
      expect(items.map(function (i) { return i.registered; })).toEqual([true, true, false]);
      expect(items[0].positive).toBe(F.byId.forcingChain.positive);
      expect(items[0].negative).toBe(F.byId.forcingChain.negative);
      expect(items[0].scope).toBeNull();
      expect(items[2].hasEntry).toBe(false);
    });

    it('plans positives then negatives per id, with a key that names the case', function () {
      var plan = P.planCases(inventory().concat(inventory({ id: 'beta' })), null);
      expect(plan.problems).toEqual([]);
      expect(plan.cases.map(function (c) { return c.key; })).toEqual([
        'alpha:positive:1', 'alpha:positive:2', 'alpha:negative:1',
        'beta:positive:1', 'beta:positive:2', 'beta:negative:1']);
      expect(plan.cases[2].kind).toBe('negative');
      expect(plan.cases[2].name).toBe('Alpha nothing');
      expect(P.listText(plan.cases.slice(0, 1))).toBe('alpha:positive:1  Alpha one');
    });

    it('selects by text in the key or the name, ignoring the case of the letters', function () {
      expect(P.planCases(inventory(), 'NEGATIVE').cases.map(function (c) { return c.key; }))
        .toEqual(['alpha:negative:1']);
      expect(P.planCases(inventory(), 'alpha two').cases.map(function (c) { return c.key; }))
        .toEqual(['alpha:positive:2']);
      expect(P.planCases(inventory(), 'positive:').cases).toHaveLength(2);
      expect(P.planCases(inventory(), '').cases).toHaveLength(3);
    });

    it('fails an unknown id, a scoped technique, missing fixtures and an empty selection, with no case',
      function () {
        [[inventory({ registered: false }), 'unknown technique id alpha'],
          [inventory({ scope: ['killer'] }), 'is scoped to [killer]'],
          [inventory({ hasEntry: false, positive: [], negative: [] }), 'no fixtures for alpha'],
          [inventory({ positive: [], negative: [] }), 'no fixtures for alpha']].forEach(function (tc) {
          var plan = P.planCases(tc[0], null);
          expect(plan.cases).toEqual([]);
          expect(plan.problems).toHaveLength(1);
          expect(plan.problems[0]).toContain(tc[1]);
        });
        var empty = P.planCases(inventory(), 'zzz');
        expect(empty.cases).toEqual([]);
        expect(empty.problems[0]).toContain('empty selection');
        expect(empty.problems[0]).toContain('"zzz"');
        // one bad id fails the whole plan: a record with a missing id would look complete
        var mixed = P.planCases(inventory().concat(inventory({ id: 'gamma', registered: false })), null);
        expect(mixed.cases).toEqual([]);
        expect(mixed.problems).toHaveLength(1);
      });

    it('refuses the scoped techniques of the registry, which have no fixtures in the tool yet', function () {
      var scoped = SG.techniques.list().filter(function (t) { return t.variantScope !== null; })[0];
      expect(scoped).toBeTruthy();
      var plan = P.planCases(P.inventoryOf([scoped.id]), null);
      expect(plan.cases).toEqual([]);
      expect(plan.problems[0]).toContain('scoped');
    });
  });

  describe('pattern cost: statistics and records (fake observations)', function () {
    var CASE = {
      key: 'alpha:positive:1', id: 'alpha', kind: 'positive', name: 'Alpha one',
      fixture: { puzzle: 'p1', after: ['a'], propagate: true, expect: { placements: [], eliminations: [[1, 2], [3, 4]] } }
    };
    var FINDING = { technique: 'alpha', cells: [1], placements: [], eliminations: [[3, 4], [1, 2]], i18nKey: 'k',
      i18nArgs: { n: 1 } };
    var WORK = { id: 'alpha', work: 120, limit: 50000, capHit: null, retained: null };

    function observation(ms, finding, reports) {
      return { ms: ms, finding: finding === null ? null : P.canonical(finding), reports: reports };
    }

    function observations(n, finding, reports) {
      var list = [];
      for (var i = 0; i < n; i++) list.push(observation(i + 1, finding, reports));
      return list;
    }

    it('takes the nearest rank for p50 and p95, and sorts the samples first', function () {
      var samples = [];
      for (var i = 20; i >= 1; i--) samples.push(i);
      expect(P.timeStats(samples)).toEqual({ min: 1, p50: 10, p95: 19, max: 20, mean: 10.5 });
      expect(P.timeStats([5])).toEqual({ min: 5, p50: 5, p95: 5, max: 5, mean: 5 });
      expect(P.timeStats([3, 1, 2])).toEqual({ min: 1, p50: 2, p95: 3, max: 3, mean: 2 });
      expect(P.timeStats([0.12345, 0.6789]).min).toBe(0.123);
      expect(P.timeStats([])).toBeNull();
    });

    it('makes a record of identical runs: the Finding, its digest, the work and the time', function () {
      var made = P.recordOf(CASE, observations(20, FINDING, [WORK]), fakeEnv());
      expect(made.problems).toEqual([]);
      var r = made.record;
      expect(r.runs).toBe(20);
      expect(r.outcome).toBe('found');
      expect(r.matchesFixture).toBe(true);
      expect(r.finding).toEqual(FINDING);
      expect(r.findingDigest).toBe('digest:' + P.canonical(FINDING).length);
      expect(r.reports).toBe(1);
      expect(r.work).toEqual([WORK]);
      expect(r.workUnits).toBe(120);
      expect(r.capHit).toBeNull();
      expect(r.deterministic).toBe(true);
      expect(r.timeMs).toEqual({ min: 1, p50: 10, p95: 19, max: 20, mean: 10.5 });
      expect(r.samplesMs).toHaveLength(20);
      expect(r.after).toEqual(['a']);
      expect(r.puzzle).toBe('p1');
    });

    it('keeps a cap hit, adds up several work records and records none for a finder that reports none',
      function () {
        var capped = { id: 'alpha', work: 50000, limit: 50000, capHit: 'work', retained: null };
        var made = P.recordOf(CASE, observations(3, null, [capped, WORK]), fakeEnv());
        expect(made.problems).toEqual([]);
        expect(made.record.outcome).toBe('none');
        expect(made.record.matchesFixture).toBe(false);
        expect(made.record.capHit).toBe('work');
        expect(made.record.workUnits).toBe(50120);
        expect(made.record.findingDigest).toBeNull();
        var silent = P.recordOf(CASE, observations(3, FINDING, []), fakeEnv()).record;
        expect(silent.reports).toBe(0);
        expect(silent.work).toEqual([]);
        expect(silent.workUnits).toBeNull();
        expect(silent.capHit).toBeNull();
      });

    it('compares a Finding with the fixture as sets, and a negative fixture with nothing', function () {
      var other = clone(FINDING);
      other.eliminations = [[9, 9]];
      expect(P.recordOf(CASE, observations(2, other, []), fakeEnv()).record.matchesFixture).toBe(false);
      var negative = { key: 'alpha:negative:1', id: 'alpha', kind: 'negative', name: 'n',
        fixture: { puzzle: 'p', after: null, propagate: false } };
      expect(P.recordOf(negative, observations(2, null, []), fakeEnv()).record.matchesFixture).toBe(true);
      expect(P.recordOf(negative, observations(2, FINDING, []), fakeEnv()).record.matchesFixture).toBe(false);
      var noExpect = { key: 'k', id: 'alpha', kind: 'positive', name: 'n', fixture: { puzzle: 'p', after: null } };
      expect(P.recordOf(noExpect, observations(2, FINDING, []), fakeEnv()).record.matchesFixture).toBeNull();
      expect(P.recordOf(noExpect, observations(2, FINDING, []), fakeEnv()).record.propagate).toBeNull();
    });

    it('reports a Finding or a work record that changed between runs, and marks the record', function () {
      var list = observations(3, FINDING, [WORK]);
      list[1] = observation(2, null, [WORK]);
      var made = P.recordOf(CASE, list, fakeEnv());
      expect(made.record.deterministic).toBe(false);
      expect(made.problems).toEqual(['alpha:positive:1: the Finding of run 2 differs from run 1']);
      list = observations(3, FINDING, [WORK]);
      list[2] = observation(3, FINDING, [Object.assign({}, WORK, { work: 121 })]);
      made = P.recordOf(CASE, list, fakeEnv());
      expect(made.problems).toEqual(['alpha:positive:1: the work records of run 3 differ from run 1']);
    });
  });

  describe('pattern cost: the record of a run (fake observations)', function () {
    function recordFor(key, runs, extra) {
      return Object.assign({ key: key, id: 'alpha', kind: 'positive', name: key, runs: runs, outcome: 'found',
        matchesFixture: true, finding: null, findingDigest: null, reports: 1,
        work: [{ id: 'alpha', work: 7, limit: null, capHit: null, retained: null }], workUnits: 7, capHit: null,
        deterministic: true, timeMs: { min: 1, p50: 1, p95: 1, max: 1, mean: 1 }, samplesMs: [1, 1, 1] }, extra);
    }

    function documentFor(records, measuredExtra) {
      var cases = ['alpha:positive:1', 'alpha:negative:1'].map(function (key) { return { key: key }; });
      return P.documentOf({
        argv: ['--ids=alpha'], identity: { sourceHash: 's', fixtureHash: 'f', toolHash: 't', node: 'v0' },
        machine: { cores: 1 }, config: { ids: ['alpha'], caseText: null, runs: 3, budgetMs: 480000 },
        cases: cases, startedAt: 'a', endedAt: 'b',
        measured: Object.assign({ records: records, problems: [], stopped: false, wallMs: 12.5 }, measuredExtra)
      });
    }

    function complete() {
      return [recordFor('alpha:positive:1', 3), recordFor('alpha:negative:1', 3, { outcome: 'none' })];
    }

    it('is complete only when every planned case has all its runs, in agreement', function () {
      var doc = documentFor(complete());
      expect(doc.complete).toBe(true);
      expect(doc.problems).toEqual([]);
      expect(P.exitCodeOf(doc)).toBe(0);
      expect(doc.summary).toEqual({ planned: 2, measured: 2, runsPerCase: 3, finds: 6, found: 1, none: 1,
        mismatches: 0, reporting: 2, capped: 0 });
      expect(doc.config.cases).toEqual(['alpha:positive:1', 'alpha:negative:1']);
      expect(doc.config.model).toBe('classic9');
      expect(doc.schema).toBe(1);
      expect(doc.kind).toBe('pattern-cost');
      expect(doc.identity.fixtureHash).toBe('f');
    });

    it('is incomplete, with the reason, for a missing case, a short sample or disagreeing runs', function () {
      var missing = documentFor(complete().slice(0, 1));
      expect(missing.complete).toBe(false);
      expect(missing.problems).toEqual(['alpha:negative:1: no record (the case was not finished)']);
      expect(P.exitCodeOf(missing)).toBe(1);

      var short = complete();
      short[1] = recordFor('alpha:negative:1', 2, { samplesMs: [1, 1] });
      var shortDoc = documentFor(short);
      expect(shortDoc.complete).toBe(false);
      expect(shortDoc.problems).toEqual(['alpha:negative:1: 2 runs of 3']);

      var split = complete();
      split[0].deterministic = false;
      expect(documentFor(split).problems).toEqual(['alpha:positive:1: the runs disagree']);

      var extra = complete().concat([recordFor('alpha:positive:9', 3)]);
      expect(documentFor(extra).problems).toEqual(['alpha:positive:9: a record of a case that is not planned']);
    });

    it('is incomplete when a run was stopped, whatever the records say, and keeps the reasons', function () {
      var doc = documentFor(complete(), { stopped: true, problems: ['alpha:negative:1: the caller budget spent'] });
      expect(doc.complete).toBe(false);
      expect(doc.stopped).toBe(true);
      expect(doc.problems).toEqual(['alpha:negative:1: the caller budget spent']);
      expect(P.exitCodeOf(doc)).toBe(1);
      doc.complete = true;
      doc.problems = [];
      doc.cases = doc.cases.slice(0, 1);
      expect(P.exitCodeOf(doc)).toBe(1);
    });

    it('refuses an unreadable work record', function () {
      var bad = complete();
      bad[0].work = [{ id: 'alpha', work: -1, limit: null, capHit: null, retained: null }];
      expect(documentFor(bad).problems[0]).toContain('an unreadable work record');
      bad[0].work = [{ id: 'alpha', work: 1, limit: null, capHit: 'surprise', retained: null }];
      expect(documentFor(bad).problems[0]).toContain('an unreadable work record');
      bad[0].work = [{ id: 'alpha', work: 1, limit: 50000, capHit: 'records', retained: 4096 }];
      expect(documentFor(bad).problems).toEqual([]);
    });

    it('fails a record whose outcome is not the fixture\'s, keeping what was measured (MS07b, IR55)',
      function () {
        // every run finished and agreed: a deterministic wrong answer, positive and negative
        var wrong = complete();
        wrong[0] = recordFor('alpha:positive:1', 3, { outcome: 'none', matchesFixture: false, workUnits: 99 });
        wrong[1] = recordFor('alpha:negative:1', 3, { kind: 'negative', outcome: 'found', matchesFixture: false });
        var doc = documentFor(wrong);
        expect(doc.complete).toBe(false);
        expect(doc.stopped).toBe(false);
        expect(doc.problems).toEqual([
          'alpha:positive:1: the outcome is not the fixture\'s (none where the fixture records a deduction)',
          'alpha:negative:1: the outcome is not the fixture\'s (found where the fixture records nothing)']);
        expect(P.exitCodeOf(doc)).toBe(1);
        expect(P.problemsOf(doc)).toEqual(doc.problems);
        expect(doc.summary.mismatches).toBe(2);
        // the record is not rewritten to the expectation: the measured outcome, work and runs stay
        expect(doc.cases[0].outcome).toBe('none');
        expect(doc.cases[0].matchesFixture).toBe(false);
        expect(doc.cases[0].workUnits).toBe(99);
        expect(doc.cases[0].runs).toBe(3);
        expect(doc.cases[0].deterministic).toBe(true);
        // a misleading complete flag, or a record that was written complete before this rule, is still refused
        doc.complete = true;
        doc.problems = [];
        expect(P.exitCodeOf(doc)).toBe(1);
        expect(P.problemsOf(doc)).toHaveLength(2);
      });

    it('still passes a matching record, and a case whose fixture records no expectation', function () {
      var records = complete();
      records[0].matchesFixture = null; // "no fixture expectation": unknown, not a mismatch and not a match
      var doc = documentFor(records);
      expect(doc.complete).toBe(true);
      expect(doc.problems).toEqual([]);
      expect(P.exitCodeOf(doc)).toBe(0);
      expect(doc.summary.mismatches).toBe(0);
      expect(doc.cases[0].matchesFixture).toBeNull();
    });

    it('is deterministic apart from time: two runs differ only in the clock readings', function () {
      var a = documentFor(complete());
      var slower = complete();
      slower.forEach(function (r) {
        r.timeMs = { min: 9, p50: 9, p95: 9, max: 9, mean: 9 };
        r.samplesMs = [9, 9, 9];
      });
      var b = documentFor(slower);
      b.startedAt = 'later';
      b.endedAt = 'later still';
      b.wallMs = 99;
      expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
      expect(P.withoutTime(a)).toEqual(P.withoutTime(b));
      expect(P.withoutTime(a).cases[0].timeMs).toBeUndefined();
      expect(a.cases[0].timeMs.p50).toBe(1); // the original is untouched
      var changed = complete();
      changed[0].work[0].work = 8;
      expect(P.withoutTime(documentFor(changed))).not.toEqual(P.withoutTime(a));
    });

    it('prints a line per case with the work, the cap and the time, and every problem', function () {
      var records = complete();
      records[0].work = [{ id: 'alpha', work: 50000, limit: 50000, capHit: 'work', retained: null }];
      records[0].workUnits = 50000;
      records[0].capHit = 'work';
      records[0].matchesFixture = false;
      records[1].work = [];
      records[1].workUnits = null;
      records[1].reports = 0;
      var text = P.renderText(documentFor(records, { problems: ['something went wrong'] }));
      expect(text).toContain('pattern-cost: 2 of 2 cases x 3 runs (6 finds), complete false');
      expect(text).toContain('capped 1');
      expect(text).toContain('alpha:positive:1 found (NOT the fixture\'s outcome), work 50000 of 50000, CAP work');
      expect(text).toContain('alpha:negative:1 none, no work report');
      expect(text).toContain('ms p50 1.000 p95 1.000 max 1.000');
      expect(text).toContain('PROBLEM something went wrong');
    });
  });

  describe('pattern cost: measuring real fixtures with a fake clock', function () {
    function cases(ids) {
      var plan = P.planCases(P.inventoryOf(ids), null);
      expect(plan.problems).toEqual([]);
      return plan.cases;
    }

    function probe(find) {
      SG.techniques.register({ id: 'patternCostProbe', group: 'chain', baseCost: 1, order: 100000,
        i18nKey: 'technique.patternCostProbe', variantScope: null, assumesUniqueness: false, find: find });
      return { key: 'patternCostProbe:positive:1', id: 'patternCostProbe', kind: 'positive', name: 'probe',
        fixture: F.byId.nakedSingle.positive[0] };
    }

    it('runs every case of forcingChain and nishio the same number of times, with the work records',
      function () {
        var run = P.measure(cases(['forcingChain', 'nishio']), { runs: 3, budgetMs: 1e9 }, fakeEnv());
        expect(run.stopped).toBe(false);
        expect(run.problems).toEqual([]);
        expect(run.records.map(function (r) { return r.key; })).toEqual([
          'forcingChain:positive:1', 'forcingChain:positive:2', 'forcingChain:negative:1',
          'forcingChain:negative:2', 'nishio:positive:1', 'nishio:positive:2', 'nishio:negative:1',
          'nishio:negative:2']);
        run.records.forEach(function (r) {
          expect(r.runs).toBe(3);
          expect(r.samplesMs).toHaveLength(3);
          expect(r.deterministic).toBe(true);
          expect(r.matchesFixture).toBe(true);
          expect(r.reports).toBe(1);
          expect(r.work[0].id).toBe(r.id);
          expect(r.work[0].limit).toBeNull(); // the registered finders are unbounded
          expect(r.work[0].capHit).toBeNull();
          expect(r.workUnits).toBeGreaterThan(0);
          expect(r.timeMs.min).toBeGreaterThan(0);
          expect(r.timeMs.p50).toBeLessThan(r.timeMs.p95 + 1e-9);
          expect(r.timeMs.p95).toBeLessThan(r.timeMs.max + 1e-9);
        });
        var positive = run.records[0];
        expect(positive.finding.technique).toBe('forcingChain');
        expect(positive.findingDigest).toBe('digest:' + P.canonical(positive.finding).length);
        expect(run.records[2].outcome).toBe('none');
        expect(run.records[3].outcome).toBe('none');
        expect(run.records[6].outcome).toBe('none');
        expect(run.records[7].outcome).toBe('none');
      });

    it('measures identical work and Findings in two runs: only the time may differ', function () {
      var both = cases(['forcingChain', 'nishio']);
      var first = P.measure(both, { runs: 2, budgetMs: 1e9 }, fakeEnv());
      var second = P.measure(both, { runs: 2, budgetMs: 1e9 }, fakeEnv());
      function view(run) {
        return run.records.map(function (r) {
          return { key: r.key, finding: r.finding, work: r.work, outcome: r.outcome };
        });
      }
      expect(view(first)).toEqual(view(second));
    });

    it('stops with a problem and no record when the caller budget is spent, never a short sample', function () {
      var tick = 0;
      var env = { clock: function () { tick += 10; return tick; }, digest: fakeEnv().digest };
      var run = P.measure(cases(['nishio']), { runs: 3, budgetMs: 15 }, env);
      expect(run.stopped).toBe(true);
      expect(run.records).toEqual([]);
      expect(run.problems).toHaveLength(1);
      expect(run.problems[0]).toContain('nishio:positive:1: the caller budget of 15 ms was spent after 0 of 3 runs');
      var doc = P.documentOf({ argv: [], identity: {}, machine: {}, config: { ids: ['nishio'], caseText: null,
        runs: 3, budgetMs: 15 }, cases: cases(['nishio']), startedAt: 'a', endedAt: 'b', measured: run });
      expect(doc.complete).toBe(false);
      expect(P.exitCodeOf(doc)).toBe(1);
    });

    it('checks the budget again after a find, which may have swallowed budget.exceeded', function () {
      var now = 0;
      var env = { clock: function () { return now; }, digest: fakeEnv().digest };
      var c = probe(function (model, state, ctx) {
        ctx.budget.tick(5000); // enough ticks for the budget to look at the clock at its next check
        now += 1e6;
        return null;
      });
      try {
        var run = P.measure([c], { runs: 3, budgetMs: 1000 }, env);
        expect(run.stopped).toBe(true);
        expect(run.records).toEqual([]);
        expect(run.problems[0]).toContain('the caller budget was spent in run 1 of 3 (budget.exceeded)');
        expect(run.problems[0]).toContain('partial answer');
      } finally {
        SG.techniques.unregister('patternCostProbe');
      }
    });

    it('fails a finder that writes to the state, and one that changes its answer between runs', function () {
      var c = probe(function (model, state) {
        state.candidates[0] ^= 1;
        return null;
      });
      try {
        var run = P.measure([c], { runs: 2, budgetMs: 1e9 }, fakeEnv());
        expect(run.stopped).toBe(true);
        expect(run.records).toEqual([]);
        expect(run.problems).toEqual(['patternCostProbe:positive:1: the finder wrote to the state in run 1']);
      } finally {
        SG.techniques.unregister('patternCostProbe');
      }

      // A finder that reports a growing work count: the records of the runs differ.
      var calls = 0;
      c = probe(function (model, state, ctx) {
        calls++;
        ctx.options.onPatternWork({ id: 'patternCostProbe', work: calls, limit: null, capHit: null, retained: null });
        return null;
      });
      try {
        var made = P.measure([c], { runs: 3, budgetMs: 1e9 }, fakeEnv());
        expect(made.stopped).toBe(false);
        expect(made.records[0].deterministic).toBe(false);
        expect(made.problems).toEqual([
          'patternCostProbe:positive:1: the work records of run 2 differ from run 1',
          'patternCostProbe:positive:1: the work records of run 3 differ from run 1']);
      } finally {
        SG.techniques.unregister('patternCostProbe');
      }
    });

    it('fails a real finder whose answer differs from the fixture, with the measured numbers kept', function () {
      // The probe never finds anything where the fixture records a deduction: every run agrees, so the record
      // is deterministic and finished, and still no evidence.
      var c = probe(function (model, state, ctx) {
        ctx.options.onPatternWork({ id: 'patternCostProbe', work: 41, limit: 50000, capHit: null, retained: null });
        return null;
      });
      try {
        var run = P.measure([c], { runs: 3, budgetMs: 1e9 }, fakeEnv());
        expect(run.stopped).toBe(false);
        expect(run.problems).toEqual([]);
        expect(run.records[0].deterministic).toBe(true);
        expect(run.records[0].matchesFixture).toBe(false);
        var doc = P.documentOf({ argv: [], identity: {}, machine: {}, config: { ids: ['patternCostProbe'],
          caseText: null, runs: 3, budgetMs: 1e9 }, cases: [c], startedAt: 'a', endedAt: 'b', measured: run });
        expect(doc.complete).toBe(false);
        expect(doc.problems).toEqual(['patternCostProbe:positive:1: the outcome is not the fixture\'s (none where ' +
          'the fixture records a deduction)']);
        expect(P.exitCodeOf(doc)).toBe(1);
        expect(doc.cases[0].outcome).toBe('none');
        expect(doc.cases[0].finding).toBeNull();
        expect(doc.cases[0].workUnits).toBe(41);
        expect(doc.cases[0].runs).toBe(3);
      } finally {
        SG.techniques.unregister('patternCostProbe');
      }
    });

    it('leaves the registry as it found it', function () {
      expect(SG.techniques.has('patternCostProbe')).toBe(false);
    });
  });

  describe('pattern cost: tests/pattern-cost.js (Node only)', function () {
    // Every file these tests write goes to a folder of its own under the repository's ignored `.scratch-*/` rule:
    // `.scratch-pattern-cost-tools/<unique run>/` at the repository root (never the task evidence, never a folder
    // that a fingerprint reads, never a system temporary directory). Only the folder of the run is removed, never
    // the shared base or the files of another run; a killed run leaves ignored scratch only.
    var SCRATCH_BASE = '.scratch-pattern-cost-tools';

    function node() {
      var host = SG.test.node;
      var spawn = typeof process !== 'undefined' && process.getBuiltinModule ?
        process.getBuiltinModule('child_process') : null;
      if (!host || !host.fs || !spawn) SG.test.skip('needs Node (fs and child_process); skipped in the browser');
      return { host: host, spawn: spawn };
    }

    /** A new, unique folder of this run: its absolute path, and its path as the tool (cwd: generator) sees it. */
    function ownScratch(n) {
      var repo = n.host.path.resolve(n.host.root, '..');
      var base = n.host.path.join(repo, SCRATCH_BASE);
      var unique = process.pid + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      var dir = n.host.path.join(base, unique);
      n.host.fs.mkdirSync(base, { recursive: true });
      n.host.fs.mkdirSync(dir); // not recursive: it must be new
      return { dir: dir, relative: '../' + SCRATCH_BASE + '/' + unique, shown: SCRATCH_BASE + '/' + unique };
    }

    function tool(args) {
      var n = node();
      var run = n.spawn.spawnSync(process.execPath, [n.host.path.join('tests', 'pattern-cost.js')].concat(args), {
        cwd: n.host.root, encoding: 'utf8', windowsHide: true, timeout: 120000 });
      return { code: run.status, out: run.stdout || '', err: run.stderr || '' };
    }

    it('shows the usage, lists the cases and runs nothing', function () {
      var help = tool(['--help']);
      expect(help.code).toBe(0);
      expect(help.out).toContain('Usage: node tests/pattern-cost.js --ids=<id>[,<id>] --json=<new.json>');
      var list = tool(['--ids=forcingChain,nishio', '--list']);
      expect(list.code).toBe(0);
      expect(list.out.split('\n').filter(function (line) { return line.indexOf(':') !== -1; })).toHaveLength(8);
      expect(list.out).toContain('forcingChain:positive:1  forcingChain contradiction of 4 links on puzzle 2');
      expect(list.out).toContain('nishio:negative:1');
      var one = tool(['--ids=nishio', '--list', '--case=positive:2']);
      expect(one.out.trim()).toBe('nishio:positive:2  nishio depth 1 on puzzle 2');
    });

    it('refuses a bad command line, an unknown id, a scoped id and an empty selection with code 2', function () {
      [[], ['--ids=nishio'], ['--ids=nishio', '--json=x.json', '--runs=0'], ['--bogus']].forEach(function (args) {
        var run = tool(args);
        expect(run.code).toBe(2);
        expect(run.out).toBe('');
        expect(run.err).toContain('Usage: node tests/pattern-cost.js');
      });
      var unknown = tool(['--ids=noSuchTechnique', '--list']);
      expect(unknown.code).toBe(2);
      expect(unknown.err).toContain('unknown technique id noSuchTechnique');
      var scoped = tool(['--ids=cageCombo', '--list']);
      expect(scoped.code).toBe(2);
      expect(scoped.err).toContain('scoped');
      var empty = tool(['--ids=nishio', '--list', '--case=zzz']);
      expect(empty.code).toBe(2);
      expect(empty.err).toContain('empty selection');
    });

    it('writes one complete record of two cases, never over an existing file, and refuses folders of sources',
      function () {
        var n = node();
        var own = ownScratch(n);
        try {
          var file = own.relative + '/record.json';
          var run = tool(['--ids=nishio', '--runs=2', '--case=positive', '--json=' + file]);
          expect(run.code).toBe(0);
          expect(run.out).toContain('pattern-cost: 2 of 2 cases x 2 runs (4 finds), complete true');
          expect(run.out).toContain('record: ' + own.shown + '/record.json');
          var written = n.host.path.join(own.dir, 'record.json');
          var text = n.host.fs.readFileSync(written, 'utf8');
          expect(n.host.fs.readdirSync(own.dir)).toEqual(['record.json']);
          expect(text.indexOf('\uFEFF')).toBe(-1);
          expect(/(?<!\r)\n/.test(text)).toBe(false);
          expect(text.endsWith('\r\n')).toBe(true);
          var doc = JSON.parse(text);
          expect(doc.kind).toBe('pattern-cost');
          expect(doc.complete).toBe(true);
          expect(doc.config.cases).toEqual(['nishio:positive:1', 'nishio:positive:2']);
          expect(doc.config.runs).toBe(2);
          expect(doc.config.budgetMs).toBe(480000);
          expect(doc.cases).toHaveLength(2);
          expect(doc.cases[0].runs).toBe(2);
          expect(doc.cases[0].work[0].limit).toBeNull();
          ['sourceHash', 'fixtureHash', 'toolHash'].forEach(function (name) {
            expect(/^[0-9a-f]{64}$/.test(doc.identity[name])).toBe(true);
          });
          expect(doc.identity.node).toBe(process.version);
          expect(P.problemsOf(doc)).toEqual([]);

          var again = tool(['--ids=nishio', '--runs=2', '--json=' + file]);
          expect(again.code).toBe(2);
          expect(again.err).toContain('the file exists already');
          expect(n.host.fs.readFileSync(written, 'utf8')).toBe(text);
          // a protected path is refused and nothing is written there
          var protectedFile = n.host.path.join(n.host.root, 'tests/fixtures/pattern-cost-record.json');
          var inSources = tool(['--ids=nishio', '--runs=2', '--json=tests/fixtures/pattern-cost-record.json']);
          expect(inSources.code).toBe(2);
          expect(n.host.fs.existsSync(protectedFile)).toBe(false);
          expect(n.host.fs.readdirSync(own.dir)).toEqual(['record.json']);
        } finally {
          n.host.fs.rmSync(own.dir, { recursive: true, force: true });
        }
        expect(n.host.fs.existsSync(own.dir)).toBe(false);
      });

    it('gives every invocation a folder of its own and leaves the shared base and other runs alone', function () {
      var n = node();
      var first = ownScratch(n);
      var second = ownScratch(n);
      try {
        expect(first.dir).not.toBe(second.dir);
        n.host.fs.writeFileSync(n.host.path.join(first.dir, 'kept.txt'), 'x');
        n.host.fs.rmSync(second.dir, { recursive: true, force: true });
        expect(n.host.fs.existsSync(n.host.path.join(first.dir, 'kept.txt'))).toBe(true);
        expect(n.host.fs.existsSync(n.host.path.dirname(first.dir))).toBe(true);
        // the rule that keeps it out of the repository: the folder lies under the ignored `.scratch-*/` pattern
        var ignore = n.host.fs.readFileSync(n.host.path.join(n.host.root, '..', '.gitignore'), 'utf8');
        expect(/^\.scratch-\*\/\s*$/m.test(ignore)).toBe(true);
        expect(n.host.path.basename(n.host.path.dirname(first.dir))).toBe(SCRATCH_BASE);
      } finally {
        n.host.fs.rmSync(first.dir, { recursive: true, force: true });
        n.host.fs.rmSync(second.dir, { recursive: true, force: true });
      }
    });
  });
})();
