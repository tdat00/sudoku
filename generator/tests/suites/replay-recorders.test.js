// The bounded recorders of the replay evidence (difficulty v3, MS03a): the pure helper of ledgers and merges
// (tests/fixtures/tool-records.js), the projection of an analysis to the golden record and the canonical text of
// tests/fixtures/replay-goldens.js (tests/fixtures/replay-recording.js), and the command line of
// tests/replay-goldens.js and tests/replay-fixtures.js. The helper, the projection and the command line (run with a
// fake file system, clock and git) run in both runners; the tools themselves run in Node only, on ledgers made of the
// baseline fixtures in a sandbox folder, so nothing here generates a golden request or touches a canonical fixture.
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var T = SG.fixtures.toolRecords;
  var RR = SG.fixtures.replayRecording;
  var R = SG.replay;
  var GOLDENS = SG.fixtures.replayGoldens;
  var WIRE = SG.fixtures.replayWire;
  var NONE = '\u2014';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function golden(id) {
    return GOLDENS.filter(function (g) { return g.id === id; })[0];
  }

  // A hash with the look of SHA-256 for the fake file system (the tools use the real one).
  function tinyHash(text) {
    var out = '';
    for (var round = 0; round < 8; round++) {
      var h = (2166136261 ^ (round * 16777619)) >>> 0;
      for (var i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
      out += ('00000000' + h.toString(16)).slice(-8);
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // The identity of the corpora: the requests of the old recorder and of the goldens, pinned
  // ---------------------------------------------------------------------------------------------

  describe('replay recorders: the corpora', function () {
    var REQUESTS = [
      ['G01', 'classic9', 'expert', '3275974478'], ['G02', 'classic9', 'veryEasy', '1'],
      ['G03', 'classic9', 'nightmare', '42'], ['G04', 'classic9', 'hell1', '2400651925'],
      ['G05', 'classic9', 'hell1', '2299986211'], ['G06', 'jigsaw9', 'nightmare', '42'],
      ['G07', 'jigsaw9', 'nightmare', '3962167687'], ['G08', 'killer', 'veryEasy', '1'],
      ['G09', 'killer', 'expert', '3514204290'], ['G10', 'killer', 'nightmare', '42'],
      ['G11', 'greaterThan', 'expert', '42'], ['G12', 'greaterThan', 'hard', '3115968914'],
      ['G13', 'samurai', 'nightmare', '42'], ['G14', 'mega16', 'hell2', '12']
    ];

    it('keeps the fourteen analysis requests G01-G14 exactly as the golden fixture states them', function () {
      expect(GOLDENS.map(function (g) {
        return [g.id, g.request.variantId, g.request.difficulty, g.request.seed];
      })).toEqual(REQUESTS);
      GOLDENS.forEach(function (g) { expect(Object.keys(g.request)).toEqual(['variantId', 'difficulty', 'seed']); });
    });

    it('keeps the five wire requests G09-G13 (G13 saved since MS05r6a) and the saved data of exactly those',
      function () {
        expect(RR.WIRE_IDS).toEqual(['G09', 'G10', 'G11', 'G12', 'G13']);
        expect(Object.keys(WIRE)).toEqual(RR.WIRE_IDS);
        expect(RR.WIRE_IDS.map(function (id) {
          var r = golden(id).request;
          return [id, r.variantId, r.difficulty, r.seed];
        })).toEqual(REQUESTS.slice(8, 13));
      });

    it('lists the fields of a golden record in the schema order of the fixture', function () {
      expect(RR.FIELDS).toEqual(['id', 'request', 'today', 'counts', 'board', 'rows', 'details', 'alive', 'folds',
        'jumps']);
      GOLDENS.forEach(function (g) { expect(Object.keys(g)).toEqual(RR.FIELDS); });
      expect(RR.EXCLUDED).toEqual(['timings', 'ratings[].checks', 'stats.checks']);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The helper: keys, ledgers, merge, differences, the level guard
  // ---------------------------------------------------------------------------------------------

  describe('replay recorders: ledgers and merge (pure)', function () {
    var MANIFEST = ['G01', 'G02', 'G03'].map(function (key) {
      return { key: key, request: { variantId: 'classic9', difficulty: 'easy', seed: key } };
    });
    var EXPECT = { kind: 'fake', sourceHash: tinyHash('source'), manifestHash: tinyHash(T.manifestText(MANIFEST)),
      manifest: MANIFEST };

    function ledger(keys, change) {
      var records = keys.map(function (key) {
        return { key: key, request: MANIFEST.filter(function (m) { return m.key === key; })[0].request,
          value: { n: key } };
      });
      var made = clone(T.ledgerOf({ kind: 'fake', sourceHash: EXPECT.sourceHash, manifestHash: EXPECT.manifestHash,
        node: 'v0', commit: 'abc', dirty: false }, records));
      if (change) change(made);
      return made;
    }

    function files(list) {
      return list.map(function (item, i) { return { name: 'f' + i + '.json', ledger: item }; });
    }

    it('writes the same text for the same data whatever the order of its keys, in canonical JSON', function () {
      expect(T.canonicalJson({ b: 1, a: [{ d: 2, c: null }], e: 'x' })).toBe('{"a":[{"c":null,"d":2}],"b":1,"e":"x"}');
      expect(T.manifestText(MANIFEST)).toBe(T.manifestText(clone(MANIFEST).map(function (m) {
        return { request: { seed: m.request.seed, difficulty: 'easy', variantId: 'classic9' }, key: m.key };
      })));
      [NaN, Infinity, undefined, function () {}].forEach(function (bad) {
        expect(function () { return T.canonicalJson({ x: bad }); }).toThrow();
      });
    });

    it('selects keys in manifest order, and refuses an unknown, duplicate or empty key', function () {
      expect(T.selectKeys(MANIFEST, 'G03,G01')).toEqual(['G01', 'G03']);
      expect(function () { T.selectKeys(MANIFEST, 'G01,G09'); }).toThrow(/unknown key G09/);
      expect(function () { T.selectKeys(MANIFEST, 'G02,G01,G02'); }).toThrow(/duplicate key G02/);
      expect(function () { T.selectKeys(MANIFEST, 'G01,,G02'); }).toThrow(/empty key/);
      expect(function () { T.selectKeys(MANIFEST, ''); }).toThrow(/empty key/);
    });

    it('prints a ledger as CRLF text with one line per record that parses back to the ledger', function () {
      var made = clone(T.ledgerOf({ kind: 'fake', sourceHash: EXPECT.sourceHash, manifestHash: EXPECT.manifestHash,
        node: 'v0', commit: 'abc', dirty: false, generatedAt: '2026-01-01T00:00:00.000Z', argv: ['--ids=G02,G01'] },
      [{ key: 'G02', request: MANIFEST[1].request, value: { n: 2 }, ms: 40, overrides: [] },
        { key: 'G01', request: MANIFEST[0].request, value: { n: 1 } }]));
      var text = T.ledgerText(made);
      expect(text.charCodeAt(0)).not.toBe(0xfeff);
      expect(/(?<!\r)\n|\r(?!\n)|[ \t]+\r?$/m.test(text)).toBe(false);
      expect(text.slice(-2)).toBe('\r\n');
      expect(text.split('\r\n')).toHaveLength(1 + 9 + 1 + 2 + 1 + 1 + 1);
      expect(JSON.parse(text)).toEqual(made);
      expect(T.ledgerText(made)).toBe(text);
      expect(Object.keys(made)).toEqual(['schema', 'kind', 'sourceHash', 'manifestHash', 'node', 'commit', 'dirty',
        'generatedAt', 'argv', 'records']);
      expect(Object.keys(made.records[0])).toEqual(['key', 'request', 'value', 'ms', 'overrides']);
      expect(Object.keys(made.records[1])).toEqual(['key', 'request', 'value']);
    });

    it('merges complete ledgers in manifest order, not in file order', function () {
      var forward = T.merge(files([ledger(['G01', 'G02']), ledger(['G03'])]), EXPECT);
      var backward = T.merge(files([ledger(['G03']), ledger(['G02', 'G01'])]), EXPECT);
      expect(forward.ok).toBe(true);
      expect(forward.problems).toEqual([]);
      expect(forward.records.map(function (r) { return r.key; })).toEqual(['G01', 'G02', 'G03']);
      expect(backward.records).toEqual(forward.records);
      expect(forward.records[0]).toEqual({ key: 'G01', request: MANIFEST[0].request, value: { n: 'G01' } });
    });

    it('refuses a missing, duplicate, unknown or malformed record, and merges nothing then', function () {
      var missing = T.merge(files([ledger(['G01', 'G03'])]), EXPECT);
      expect(missing.ok).toBe(false);
      expect(missing.records).toBeNull();
      expect(missing.problems).toEqual(['G02: missing (no ledger records it)']);
      var twice = T.merge(files([ledger(['G01', 'G02']), ledger(['G02', 'G03'])]), EXPECT);
      expect(twice.ok).toBe(false);
      expect(twice.problems).toEqual(['G02: duplicate, recorded by f0.json and f1.json']);
      var inside = T.merge(files([ledger(['G01', 'G01', 'G02', 'G03'])]), EXPECT);
      expect(inside.problems).toEqual(['f0.json: record G01 appears twice', 'G01: duplicate, recorded by ' +
        'f0.json and f0.json']);
      var unknown = T.merge(files([ledger(['G01', 'G02', 'G03'], function (l) {
        l.records.push({ key: 'G09', request: {}, value: {} });
      })]), EXPECT);
      expect(unknown.ok).toBe(false);
      expect(unknown.problems).toEqual(['f0.json: record G09 is not in the manifest']);
      [function (l) { l.records[0].value = null; }, function (l) { l.records[0].value = [1]; },
        function (l) { delete l.records[0].value; }, function (l) { l.records[0].key = 3; },
        function (l) { l.records[0].request = { variantId: 'classic9', difficulty: 'hard', seed: 'G01' }; },
        function (l) { l.records = 'none'; }, function (l) { l.schema = 2; }, function (l) { l.node = 7; },
        function (l) { l.dirty = 'yes'; }].forEach(function (change) {
        var bad = T.merge(files([ledger(['G01', 'G02', 'G03'], change)]), EXPECT);
        expect(bad.ok).toBe(false);
        expect(bad.records).toBeNull();
      });
      var unreadable = T.merge([{ name: 'broken.json', error: 'not valid JSON (x)' }], EXPECT);
      expect(unreadable.problems[0]).toBe('broken.json: not valid JSON (x)');
      expect(T.merge([], EXPECT).problems[0]).toBe('no ledger to merge');
    });

    it('refuses a ledger of another kind, from other sources, or of another recipe list', function () {
      var kind = T.merge(files([ledger(['G01', 'G02', 'G03'], function (l) { l.kind = 'replay-wire'; })]), EXPECT);
      expect(kind.ok).toBe(false);
      expect(kind.problems[0]).toMatch(/^f0\.json: kind "replay-wire" is not "fake"$/);
      var source = T.merge(files([ledger(['G01', 'G02']), ledger(['G03'], function (l) {
        l.sourceHash = tinyHash('edited source');
      })]), EXPECT);
      expect(source.ok).toBe(false);
      expect(source.problems).toHaveLength(1);
      expect(source.problems[0]).toMatch(/^f1\.json: sourceHash [0-9a-f]{12}\.\.\. is not the current/);
      var recipe = T.merge(files([ledger(['G01', 'G02', 'G03'], function (l) {
        l.manifestHash = tinyHash('another recipe list');
      })]), EXPECT);
      expect(recipe.ok).toBe(false);
      expect(recipe.problems[0]).toMatch(/manifestHash .* \(another recipe list\)$/);
      var badHash = T.merge(files([ledger(['G01', 'G02', 'G03'], function (l) { l.sourceHash = 'abc'; })]), EXPECT);
      expect(badHash.problems[0]).toBe('f0.json: sourceHash is not a SHA-256 hex string');
    });

    it('names the fields that differ, with their paths', function () {
      var saved = { a: 1, b: [1, 2, 3], c: { d: 'x', e: null }, f: 5 };
      var fresh = { a: 1, b: [1, 9], c: { d: 'y', e: null, g: 1 } };
      var lines = T.diffValues(saved, fresh).map(T.diffLine);
      expect(lines).toEqual(['b.length: saved 3, fresh 2', 'b[1]: saved 2, fresh 9', 'c.d: saved "x", fresh "y"',
        'c.g: saved undefined, fresh 1', 'f: saved 5, fresh undefined']);
      expect(T.diffValues(saved, clone(saved))).toEqual([]);
    });

    it('offers a hidden level to one request and puts the exact original support array back', function () {
      var def = SG.variants.get('classic4');
      var original = def.difficultySupport;
      var before = original.slice();
      var inside = null;
      var run = T.withRequestedLevel('classic4', 'hard', function () {
        inside = def.difficultySupport.slice();
        return SG.store.toConfig({ variantId: 'classic4', difficulty: 'hard', seed: '1' }).difficulty;
      });
      expect(run).toEqual({ value: 'hard', overridden: true });
      expect(inside).toEqual(['veryEasy', 'hard']);
      expect(def.difficultySupport).toBe(original);
      expect(original).toEqual(before);
      expect(SG.store.toConfig({ variantId: 'classic4', difficulty: 'hard', seed: '1' }).difficulty)
        .toBe('veryEasy');
      expect(function () {
        T.withRequestedLevel('classic4', 'hard', function () { throw new Error('boom'); });
      }).toThrow(/boom/);
      expect(def.difficultySupport).toBe(original);
      var offered = T.withRequestedLevel('classic4', 'veryEasy', function () { return def.difficultySupport; });
      expect(offered.overridden).toBe(false);
      expect(offered.value).toBe(original);
      expect(T.withRequestedLevel('classic4', 'nosuchlevel', function () { return 1; }).overridden).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The projection of an analysis to the golden record
  // ---------------------------------------------------------------------------------------------

  describe('replay recorders: the projection of an analysis', function () {
    function rating(score, extra) {
      return Object.assign({ status: score === null ? 'unverified' : score === 0 ? 'zero' : 'rated',
        reasons: [], score: score, counts: {}, empties: 0, hardest: null, checks: 0, memo: false }, extra);
    }

    function move(i, extra) {
      return Object.assign({ index: i, kind: i === 0 ? 'solution' : 'random', phase: i === 0 ? null : 'random',
        removed: [], restored: [], alive: null }, extra);
    }

    function step(role, first, last, phases, k) {
      return { role: role, first: first, last: last, position: last, phases: phases, kinds: [],
        transition: k === undefined ? null : k };
    }

    function terms(total, extra) {
      return Object.assign({ total: total, P: 0, W: 0, R: 0, V: 0, E: 0, level: 'veryEasy', hardest: null,
        counts: {} }, extra);
    }

    function transition(tier, before, after, extra) {
      return Object.assign({ view: 'compact', tier: tier, before: before, after: after, to: 0,
        folded: { peak: null, aboveBand: false, revealed: 0, unscored: 0, restart: null }, cause: null,
        choice: null }, extra);
    }

    function analysisOf(parts) {
      return Object.assign({ fallback: null, structure: null, signs: null, band: { min: 0, max: 1000 },
        proofs: {} }, parts);
    }

    var G01_DETAILS = [0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 28, 30, 31, 33, 34, 36, 37, 38, 40, 41, 42, 43, 44,
      551, 557, 567, 568, 568, 568, 568, 568, 992, 992];

    // The compact steps and details of G01 (a Classic 9x9 Expert, 32 positions), with its jump explained.
    function g01Shaped() {
      var empties = { 7: 14, 22: 43, 23: 45, 26: 51, 31: 51 };
      var hardest = { 7: 'nakedSingle', 22: 'nakedSingle', 23: 'simpleColouring', 26: 'simpleColouring',
        31: 'xyzWing' };
      var ratings = [];
      var moves = [];
      for (var p = 0; p < 32; p++) {
        ratings.push(rating(G01_DETAILS[p], { empties: empties[p] || 0, hardest: hardest[p] || null }));
        moves.push(move(p));
      }
      var details = [];
      for (p = 0; p < 32; p++) details.push(step(p === 0 ? 'solution' : 'moves', p, p, p === 0 ? [] : ['random']));
      details.push(step('final', 31, 31, []));
      var compact = [step('solution', 0, 0, []), step('moves', 1, 7, ['random'], 0),
        step('moves', 8, 22, ['random'], 1), step('moves', 23, 23, ['guided'], 2),
        step('moves', 24, 26, ['guided'], 3), step('moves', 27, 31, ['search'], 4), step('final', 31, 31, [], 5)];
      var before = terms(44, { P: 1, W: 43, R: 1.36485812, V: 41.4457831, E: 43, hardest: 'nakedSingle' });
      var after = terms(551, { P: 360, W: 768.25, R: 148.3216171, V: 42.3529412, E: 45, level: 'hard',
        hardest: 'simpleColouring' });
      var transitions = [
        transition('first', terms(0), terms(23, { E: 14, hardest: 'nakedSingle' })),
        transition(null, terms(23), terms(44)),
        transition('jump', before, after, { to: 23,
          cause: { class: 'single-culprit', frame: { kind: 'cell', cell: 1, action: 'remove' },
            singles: [{ action: 'remove', cell: 1, score: 550 }, { action: 'remove', cell: 79, score: 44 }] },
          choice: { kind: 'guided', chosen: 551, others: 9, nulls: 0, max: 45, at: 42, rated: 15, refused: 5,
            count: null } }),
        transition(null, terms(551), terms(568)),
        transition('newPeak', terms(568), terms(992, { hardest: 'xyzWing' })),
        transition(null, terms(992), terms(992))
      ];
      var proofs = { 23: { restricted: 'stuck', firstUse: { k: 32, n: 47, technique: 'simpleColouring',
        i18nKey: 'technique.simpleColouring.step', eliminations: [[37, 3], [65, 3]], placements: [] } } };
      return analysisOf({ moves: moves, ratings: ratings, transitions: transitions, proofs: proofs,
        views: { compact: { steps: compact }, details: { steps: details } } });
    }

    function classic9() {
      return SG.variants.get('classic9').build({}, null);
    }

    var ENTRY = { id: 'G01', request: golden('G01').request, today: golden('G01').today };

    it('projects G01-shaped data to the numbers of the golden: 7 compact and 33 details steps', function () {
      var record = RR.goldenOf(ENTRY, g01Shaped(), classic9());
      expect(Object.keys(record)).toEqual(RR.FIELDS);
      expect(record.counts).toEqual({ compact: 7, details: 33 });
      expect(record.rows.map(function (row) { return row[4]; })).toEqual([0, 23, 44, 551, 568, 992, 992]);
      expect(record.rows.map(function (row) { return row[1]; })).toEqual([0, 7, 22, 23, 26, 31, 31]);
      expect(record.details).toEqual(G01_DETAILS);
      expect(record.rows).toEqual([
        [1, 0, 'S/Sol', 0, 0, 0, NONE, NONE, NONE, NONE],
        [2, 7, 'D/Dig', 14, 23, 23, 'nakedSingle', NONE, NONE, 'F'],
        [3, 22, 'D/Dig', 43, 44, 21, 'nakedSingle', NONE, NONE, NONE],
        [4, 23, 'G/Choose', 45, 551, 507, 'simpleColouring', 'Y', 'R1C2', NONE],
        [5, 26, 'G/Choose', 51, 568, 17, 'simpleColouring', NONE, NONE, NONE],
        [6, 31, 'X/Adjust', 51, 992, 424, 'xyzWing', NONE, NONE, 'N'],
        [7, 31, 'F/Final', 51, 992, 0, 'xyzWing', NONE, NONE, NONE]]);
      expect(record.board).toEqual({ cells: 81, cages: 0, signsFrom: 0, signsTo: 0, log: 'normal' });
      expect([record.alive, record.folds, record.today, record.request]).toEqual([null, [], ENTRY.today,
        ENTRY.request]);
      expect(record.jumps).toEqual([{
        step: 4, from: 44, to: 551,
        before: { P: 1, W: 43, R: 1.364858, V: 41.445783, E: 43, level: 'veryEasy' },
        after: { P: 360, W: 768.25, R: 148.321617, V: 42.352941, E: 45, level: 'hard' },
        choice: { chosen: 551, others: 9, nulls: 0, max: 45, at: 42, rated: 15, refused: 5 },
        singles: [{ op: 'remove', cell: 'R1C2', score: 550 }, { op: 'remove', cell: 'R9C8', score: 44 }],
        cause: 'single-culprit', frame: 'R1C2',
        firstUse: { k: 32, n: 47, technique: 'simpleColouring' }, key: 'technique.simpleColouring.step',
        effects: 'remove candidate 3@R5C2, 3@R8C3'
      }]);
      expect(clone(record)).toEqual(record);
    });

    it('is deterministic, and leaves the analysis and the model as they were', function () {
      var analysis = g01Shaped();
      var model = classic9();
      var snapshot = clone(analysis);
      expect(RR.goldenOf(ENTRY, analysis, model)).toEqual(RR.goldenOf(ENTRY, analysis, model));
      expect(clone(analysis)).toEqual(snapshot);
    });

    it('gives a step without a score no delta, an empty hardest technique the dash, and the first step 0', function () {
      var ratings = [rating(0), rating(0), rating(null, { status: 'unverified' }), rating(40, {
        empties: 12, hardest: 'nakedPair' }), rating(40, { empties: 12, hardest: 'nakedPair' })];
      var moves = [move(0), move(1), move(2), move(3), move(3)];
      var compact = [step('solution', 0, 0, []), step('moves', 1, 1, ['random'], 0),
        step('moves', 2, 2, ['random'], 1), step('moves', 3, 3, ['guided'], 2), step('final', 3, 3, [], 3)];
      var transitions = [
        transition(null, terms(0), terms(0)), transition(null, terms(0), terms(null)),
        transition('newPeak', terms(null), terms(40, { hardest: 'nakedPair' })),
        transition(null, terms(40), terms(40))
      ];
      var analysis = analysisOf({ moves: moves, ratings: ratings, transitions: transitions,
        views: { compact: { steps: compact }, details: { steps: compact } } });
      var record = RR.goldenOf(ENTRY, analysis, classic9());
      expect(record.rows.map(function (row) { return row[5]; })).toEqual([0, 0, null, null, 0]);
      expect(record.rows.map(function (row) { return row[4]; })).toEqual([0, 0, null, 40, 40]);
      expect(record.rows.map(function (row) { return row[6]; })).toEqual([NONE, NONE, NONE, 'nakedPair',
        'nakedPair']);
      expect(record.rows.map(function (row) { return row[9]; })).toEqual([NONE, NONE, NONE, 'N', NONE]);
      expect(record.details).toEqual([0, 0, null, 40, 40]);
      expect(record.jumps).toEqual([]);
    });

    it('reads the signs: culprit label of a sign, alive counts, an opening fold and a revealed one', function () {
      var model = SG.variants.get('classic4').build({}, null);
      model = Object.assign({}, model, { inequalities: [{ a: 0, b: 1 }] });
      var alive = [[0, 1, 2], [0, 1, 2], [0], [0]];
      var ratings = [rating(0), rating(0), rating(135, { empties: 10, hardest: 'ineqChain' }),
        rating(973, { empties: 10, hardest: 'xyWing' })];
      var moves = alive.map(function (a, i) { return move(i, { alive: a }); });
      moves[1] = move(1, { alive: alive[1], restored: [3, 4] });
      moves[2] = move(2, { alive: alive[2], restored: [5], phase: 'clues' });
      moves[3] = move(3, { alive: alive[3], removed: [8, 9], restored: [6, 7], phase: 'reveal' });
      var compact = [step('solution', 0, 0, []), step('structure', 0, 0, [], 0),
        step('moves', 1, 2, ['clues', 'signs'], 1), step('moves', 3, 3, ['signs', 'reveal'], 2),
        step('final', 3, 3, [], 3)];
      var transitions = [
        transition(null, terms(0), terms(0), { role: 'step' }),
        transition('first', terms(0), terms(135), { folded: { peak: 275, aboveBand: false, revealed: 0,
          unscored: 0, restart: null } }),
        transition('jump', terms(135, { P: 120 }), terms(973, { P: 650, level: 'expert' }), {
          to: 3, folded: { peak: 1967, aboveBand: true, revealed: 2, unscored: 0, restart: null },
          cause: { class: 'single-sign', frame: { kind: 'sign', sign: 1, action: 'remove' }, singles: [] },
          choice: { kind: 'checked', chosen: null } }),
        transition(null, terms(973), terms(973))
      ];
      var analysis = analysisOf({ structure: 'signs', signs: [[0, 1], [1, 2], [2, 3]], moves: moves,
        ratings: ratings, transitions: transitions, views: { compact: { steps: compact },
          details: { steps: compact } } });
      var record = RR.goldenOf(ENTRY, analysis, model);
      expect(record.board).toEqual({ cells: 16, cages: 0, signsFrom: 3, signsTo: 1, log: 'normal' });
      expect(record.alive).toEqual([3, 3, 1, 1, 1]);
      expect(record.folds).toEqual([
        { step: 3, peak: 275, end: 135, removed: null, restored: null, signs: 2, opening: true },
        { step: 4, peak: 1967, end: 973, removed: 2, restored: 2, signs: 0, opening: false }]);
      expect(record.rows.map(function (row) { return row[2]; })).toEqual(['S/Sol', 'S/Sig', 'C+I/Mixed',
        'I+A/Mixed', 'F/Final']);
      expect(record.rows[3][7]).toBe('Y');
      expect(record.rows[3][8]).toBe('s1(R1C2<R1C3)');
      expect(record.jumps).toHaveLength(1);
      var jump = record.jumps[0];
      expect([jump.step, jump.from, jump.to, jump.cause, jump.frame]).toEqual([4, 135, 973, 'single-sign',
        's1(R1C2<R1C3)']);
      expect([jump.choice, jump.singles, jump.firstUse, jump.key, jump.effects]).toEqual([null, [], null, null,
        null]);
    });

    it('records "normal" only for an analysis without a fallback', function () {
      var analysis = g01Shaped();
      analysis.fallback = 'mismatch';
      expect(RR.goldenOf(ENTRY, analysis, classic9()).board.log).toBe('mismatch');
    });

    it('projects the analysis of the saved results G09-G13 to exactly their golden records', function () {
      RR.WIRE_IDS.forEach(function (id) {
        var result = R.fromPlainWire(WIRE[id]);
        var record = RR.goldenOf({ id: id, request: golden(id).request, today: golden(id).today },
          R.analyse(result), result.model);
        expect(T.diffValues(clone(golden(id)), clone(record)).map(T.diffLine)).toEqual([]);
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The canonical text of replay-goldens.js
  // ---------------------------------------------------------------------------------------------

  describe('replay recorders: the canonical golden fixture', function () {
    function records() {
      return GOLDENS.map(function (g) { return { key: g.id, request: g.request, value: g }; });
    }

    // The data the text defines, as the fixture script would set it.
    function evaluated(text) {
      var fake = {};
      new Function('self', text)(fake);
      return fake.SG.fixtures.replayGoldens;
    }

    it('renders every golden record so that the fixture script gives the same data back', function () {
      var text = RR.renderGoldens(records());
      expect(T.diffValues(clone(GOLDENS), clone(evaluated(text)))).toEqual([]);
    });

    it('renders CRLF without a BOM or trailing white space, ends with a line end, and is deterministic', function () {
      var text = RR.renderGoldens(records());
      expect(text.charCodeAt(0)).not.toBe(0xfeff);
      expect(/(?<!\r)\n|\r(?!\n)|[ \t]+\r?$/m.test(text)).toBe(false);
      expect(text.slice(-2)).toBe('\r\n');
      expect(RR.renderGoldens(records())).toBe(text);
    });

    it('says in its header what is the historical annotation and what is projected', function () {
      var header = RR.renderGoldens(records()).split('\r\n').slice(0, 16).join('\n');
      expect(header).toContain('Generated by tests/replay-goldens.js');
      expect(header).toContain('`today` is their');
      expect(header).toContain('historical annotation, not freshly verified output');
      expect(header).toContain('projected from the analysis of a freshly generated result');
    });

    it('lays a record out like the hand-written fixture: rows, wrapped details, folds, jumps', function () {
      var lines = RR.renderGoldens(records()).split('\r\n');
      var saved = lines.indexOf('    {');
      expect(saved).toBeGreaterThan(10);
      expect(lines[saved + 1]).toBe("      id: 'G01', request: { variantId: 'classic9', difficulty: 'expert', " +
        "seed: '3275974478' },");
      expect(lines[saved + 2]).toBe('      today: { steps: 21, missing: 10 }, counts: { compact: 7, details: 33 },');
      expect(lines[saved + 6]).toBe("        [1, 0, 'S/Sol', 0, 0, 0, '\u2014', '\u2014', '\u2014', '\u2014'],");
      var long = lines.filter(function (line) { return line.indexOf('      details: [') === 0; });
      expect(long).toHaveLength(14);
      expect(Math.max.apply(null, lines.map(function (line) { return line.length; }))).toBeLessThan(121);
      expect(lines.filter(function (line) { return /^ {10}singles: \[$/.test(line); })).toHaveLength(1);
    });

    it('refuses what it cannot write as plain data', function () {
      var bad = records();
      bad[0] = { key: 'G01', request: bad[0].request, value: Object.assign({}, bad[0].value, { details: [NaN] }) };
      expect(function () { RR.renderGoldens(bad); }).toThrow(/not finite/);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The command line (run with a fake file system, clock, hashes and git)
  // ---------------------------------------------------------------------------------------------

  describe('replay recorders: the command line (fake environment)', function () {
    var MANIFEST = ['G01', 'G02', 'G03'].map(function (key) {
      return { key: key, request: { variantId: 'classic9', difficulty: 'easy', seed: key } };
    });
    var FIXTURE = 'tests/fixtures/fake.js';
    var SAVED = { G01: { n: 1, rows: [1, 2] }, G02: { n: 2, rows: [1, 2] }, G03: { n: 3, rows: [1, 2] } };

    function setup(options) {
      var o = options || {};
      var state = { out: [], err: [], writes: [], generated: [], engine: 0, files: {}, dirs: o.dirs || {} };
      if (!o.noFixture) state.files[FIXTURE] = 'saved text\r\n';
      var ticks = 0;
      var env = {
        out: function (text) { state.out.push(text); },
        err: function (text) { state.err.push(text); },
        now: function () { return '2026-01-01T00:00:00.000Z'; },
        clock: function () { ticks += 1500; return ticks; },
        sha256: tinyHash,
        identity: function () {
          return { sourceHash: tinyHash('sources'), node: 'v0.0.0', commit: 'abc123', dirty: true };
        },
        checkPath: function (p, rules) {
          if (/^([A-Za-z]:|\/)/.test(p) || p.indexOf('..') !== -1) throw new Error(p + ': outside');
          if (rules.extension && p.slice(-rules.extension.length) !== rules.extension) {
            throw new Error(p + ': the file needs the extension ' + rules.extension);
          }
          if (rules.notIn && p.indexOf(rules.notIn) === 0) throw new Error(p + ': never into ' + rules.notIn);
        },
        checkDirectory: function (p) { if (!state.dirs[p]) throw new Error(p + ': not a directory'); },
        readText: function (p) { return state.files[p] === undefined ? null : state.files[p]; },
        writeText: function (p, text) { state.writes.push(p); state.files[p] = text; },
        readLedgers: function (dir) { return state.dirs[dir]; },
        show: function (p) { return p; },
        engine: function () { state.engine++; }
      };
      var spec = {
        tool: 'tests/fake.js', kind: 'fake', fixture: FIXTURE, defaultMode: o.defaultMode || 'check',
        compareText: Boolean(o.compareText), manifest: MANIFEST, extraFiles: [],
        describe: function (entry) { return 'classic9 easy ' + entry.request.seed; },
        saved: function (key) { return o.saved === undefined ? SAVED[key] : o.saved[key]; },
        generate: function (entry) {
          state.generated.push(entry.key);
          if (o.failOn === entry.key) throw new Error('budget.exceeded');
          var value = clone(SAVED[entry.key]);
          if (o.change && o.change === entry.key) value.rows[1] = 99;
          return { value: value, overrides: o.override ? ['classic9:easy'] : [] };
        },
        render: function (records) { return rendered(records.map(function (r) { return r.key; })); }
      };
      return { state: state, env: env, spec: spec, run: function (args) { return RR.runCli(env, spec, args); } };
    }

    // The text of the fake fixture: one `    Gnn: <json>,` line per record, like the wire fixture.
    function rendered(keys) {
      return keys.map(function (key) { return '    ' + key + ': ' + JSON.stringify(SAVED[key]) + ','; })
        .join('\r\n') + '\r\n';
    }

    function ledgerFile(name, keys, change) {
      var made = clone(T.ledgerOf({ kind: 'fake', sourceHash: tinyHash('sources'),
        manifestHash: tinyHash(T.manifestText(MANIFEST)), node: 'v0', commit: 'c', dirty: false },
      keys.map(function (key) {
        return { key: key, request: MANIFEST.filter(function (m) { return m.key === key; })[0].request,
          value: clone(SAVED[key]) };
      })));
      if (change) change(made);
      return { name: name, text: T.ledgerText(made) };
    }

    it('refuses conflicting or malformed options before it generates, and writes nothing', function () {
      [['--check', '--write'], ['--record=a.json', '--check'], ['--record=a.json', '--write'],
        ['--record=a.json', '--merge=d'], ['--record=a.json', '--out=b.js'], ['--merge=d', '--ids=G01'],
        ['--out=b.js', '--check'], ['--out=b.js'], ['--list', '--check'], ['--help', '--ids=G01'],
        ['--list', '--help'], ['--ids=G01', '--ids=G02'], ['--ids='], ['--record='], ['--bogus'], ['--ids=G09'],
        ['--ids=G01,G01'], ['--ids=,G01'], ['--record=a.txt'], ['--record=tests/fixtures/a.json'],
        ['--record=C:/a.json'], ['--record=../a.json'], ['--out=b.json', '--write'], ['--merge=missing', '--check']
      ].forEach(function (args) {
        var t = setup();
        expect(t.run(args)).toBe(1);
        expect(t.state.engine).toBe(0);
        expect(t.state.generated).toEqual([]);
        expect(t.state.writes).toEqual([]);
        expect(t.state.out).toEqual([]);
        expect(t.state.err.join('\n')).toContain('Usage: node tests/fake.js');
        expect(t.state.files[FIXTURE]).toBe('saved text\r\n');
      });
    });

    it('shows the usage and the manifest without generating', function () {
      var t = setup();
      expect(t.run(['--help'])).toBe(0);
      expect(t.run(['-h'])).toBe(0);
      expect(t.state.out[0]).toContain('--record=<file.json>');
      expect(t.state.out[0]).toContain('(no option)           same as --check');
      t = setup({ defaultMode: 'write' });
      expect(t.run(['--list'])).toBe(0);
      expect(t.state.out[0]).toBe('tests/fake.js: 3 records, kind fake, fixture ' + FIXTURE);
      expect(t.state.out.slice(1, 4)).toEqual(['  G01 classic9 easy G01', '  G02 classic9 easy G02',
        '  G03 classic9 easy G03']);
      expect(t.state.out[4]).toBe('manifestHash ' + tinyHash(T.manifestText(MANIFEST)));
      expect(t.state.out[5]).toBe('sourceHash   ' + tinyHash('sources'));
      expect([t.state.engine, t.state.generated, t.state.writes]).toEqual([0, [], []]);
    });

    it('refuses a write of a partial selection, with the complete one in any order accepted', function () {
      var wire = setup({ defaultMode: 'write' });
      expect(wire.run(['--ids=G02'])).toBe(1);
      expect(wire.state.err.join('\n')).toContain('a write needs the complete manifest, not the partial selection G02');
      var explicit = setup();
      expect(explicit.run(['--write', '--ids=G01,G03'])).toBe(1);
      expect([explicit.state.generated, explicit.state.writes]).toEqual([[], []]);
      var whole = setup();
      expect(whole.run(['--write', '--ids=G03,G01,G02'])).toBe(0);
      expect(whole.state.generated).toEqual(['G01', 'G02', 'G03']);
      expect(whole.state.writes).toEqual([FIXTURE]);
      expect(whole.state.files[FIXTURE]).toBe(rendered(['G01', 'G02', 'G03']));
    });

    it('keeps the old default of the wire tool (no option writes) and of the analysis tool (no option checks)',
      function () {
        var wire = setup({ defaultMode: 'write' });
        expect(wire.run([])).toBe(0);
        expect(wire.state.writes).toEqual([FIXTURE]);
        expect(wire.state.out[wire.state.out.length - 1]).toBe('wrote ' + FIXTURE + ' (3 lines)');
        var analysis = setup({ change: 'G02' });
        expect(analysis.run([])).toBe(1);
        expect(analysis.state.writes).toEqual([]);
      });

    it('checks without writing: explains the field that differs, and counts a partial check as partial', function () {
      var same = setup();
      expect(same.run(['--check'])).toBe(0);
      expect(same.state.out).toContain('G02: matches fake.js');
      expect(same.state.out[same.state.out.length - 1]).toBe('fake.js is up to date');
      expect([same.state.engine, same.state.writes]).toEqual([1, []]);
      var different = setup({ change: 'G02' });
      expect(different.run(['--check'])).toBe(1);
      expect(different.state.out).toContain('G02: 1 field differ from fake.js');
      expect(different.state.out).toContain('  rows[1]: saved 2, fresh 99');
      expect(different.state.generated).toEqual(['G01', 'G02', 'G03']);
      expect(different.state.writes).toEqual([]);
      expect(different.state.files[FIXTURE]).toBe('saved text\r\n');
      var partial = setup({ change: 'G03' });
      expect(partial.run(['--check', '--ids=G01'])).toBe(0);
      expect(partial.state.generated).toEqual(['G01']);
      expect(partial.state.out[partial.state.out.length - 1]).toBe('fake.js: 1 of 3 records checked (G01), all ' +
        'match; a partial check is no check of the complete fixture');
      var missing = setup({ saved: {} });
      expect(missing.run(['--check', '--ids=G01'])).toBe(1);
      expect(missing.state.out).toContain('G01: no saved record in ' + FIXTURE);
    });

    it('compares the text of a complete corpus with the file when the tool says so', function () {
      var good = setup({ compareText: true });
      good.state.files[FIXTURE] = rendered(['G01', 'G02', 'G03']);
      expect(good.run(['--check'])).toBe(0);
      var bad = setup({ compareText: true });
      bad.state.files[FIXTURE] = rendered(['G01', 'G02', 'G03']).replace('"n":2,', '"n":9,');
      expect(bad.run(['--check'])).toBe(1);
      expect(bad.state.out[bad.state.out.length - 1]).toBe('fake.js differs at line 2 (request G02); regenerate it ' +
        'with node tests/fake.js if the generator changed on purpose');
      expect(bad.state.writes).toEqual([]);
    });

    it('records a shard into a ledger only: identity, request, value, timing and overrides', function () {
      var t = setup({ override: true });
      expect(t.run(['--ids=G03,G02', '--record=out/shard.json'])).toBe(0);
      expect(t.state.generated).toEqual(['G02', 'G03']);
      expect(t.state.writes).toEqual(['out/shard.json']);
      expect(t.state.files[FIXTURE]).toBe('saved text\r\n');
      var text = t.state.files['out/shard.json'];
      var made = JSON.parse(text);
      expect(Object.keys(made)).toEqual(['schema', 'kind', 'sourceHash', 'manifestHash', 'node', 'commit', 'dirty',
        'generatedAt', 'argv', 'records']);
      expect([made.schema, made.kind, made.node, made.commit, made.dirty]).toEqual([1, 'fake', 'v0.0.0', 'abc123',
        true]);
      expect(made.manifestHash).toBe(tinyHash(T.manifestText(MANIFEST)));
      expect(made.argv).toEqual(['--ids=G03,G02', '--record=out/shard.json']);
      expect(made.records.map(function (r) { return r.key; })).toEqual(['G02', 'G03']);
      expect(Object.keys(made.records[0])).toEqual(['key', 'request', 'value', 'ms', 'overrides']);
      expect([made.records[0].ms, made.records[0].overrides]).toEqual([1500, ['classic9:easy']]);
      expect(made.records[0].value).toEqual(SAVED.G02);
      expect(text.slice(-2)).toBe('\r\n');
      expect(t.state.out.join('\n')).toContain('(level offered for this request only: classic9:easy)');
      expect(t.state.out[t.state.out.length - 1]).toBe('recorded 2 of 3 keys (G02, G03) in out/shard.json; ' +
        'a ledger is one shard, merge them all with --merge');
    });

    it('writes no ledger and no fixture when a generation fails', function () {
      var t = setup({ failOn: 'G02' });
      expect(t.run(['--record=out/all.json'])).toBe(1);
      expect(t.state.generated).toEqual(['G01', 'G02']);
      expect(t.state.writes).toEqual([]);
      expect(t.state.err.join('\n')).toContain('G02: generation failed: budget.exceeded; nothing was written');
      var write = setup({ failOn: 'G03' });
      expect(write.run(['--write'])).toBe(1);
      expect(write.state.writes).toEqual([]);
      expect(write.state.files[FIXTURE]).toBe('saved text\r\n');
    });

    it('merges complete ledgers without generating: checks by default, writes an alternate file with --out',
      function () {
        var dirs = { shards: [ledgerFile('b.json', ['G03']), ledgerFile('a.json', ['G02', 'G01'])] };
        var check = setup({ dirs: dirs });
        expect(check.run(['--merge=shards'])).toBe(0);
        expect(check.state.out[0]).toBe('merged 2 ledgers: all 3 keys exactly once, recorded from the current sources');
        expect(check.state.out[check.state.out.length - 1]).toBe('fake.js is up to date');
        expect([check.state.engine, check.state.generated, check.state.writes]).toEqual([0, [], []]);
        var explicit = setup({ dirs: dirs });
        expect(explicit.run(['--merge=shards', '--check'])).toBe(0);
        var write = setup({ dirs: dirs });
        expect(write.run(['--merge=shards', '--write', '--out=alt/fake.js'])).toBe(0);
        expect(write.state.writes).toEqual(['alt/fake.js']);
        expect(write.state.files['alt/fake.js']).toBe(rendered(['G01', 'G02', 'G03']));
        expect(write.state.files[FIXTURE]).toBe('saved text\r\n');
        expect([write.state.engine, write.state.generated]).toEqual([0, []]);
        var canonical = setup({ dirs: dirs });
        expect(canonical.run(['--merge=shards', '--write'])).toBe(0);
        expect(canonical.state.writes).toEqual([FIXTURE]);
      });

    it('explains the fields a merged corpus changes, without writing', function () {
      var dirs = { shards: [ledgerFile('a.json', ['G01', 'G02', 'G03'], function (l) {
        l.records[2].value.rows[0] = 7;
      })] };
      var t = setup({ dirs: dirs });
      expect(t.run(['--merge=shards', '--check'])).toBe(1);
      expect(t.state.out).toContain('G03: 1 field differ from fake.js');
      expect(t.state.out).toContain('  rows[0]: saved 1, fresh 7');
      expect(t.state.writes).toEqual([]);
    });

    it('refuses to merge an incomplete, duplicated, stale or mixed corpus and keeps the old file', function () {
      var stale = function (l) { l.sourceHash = tinyHash('older sources'); };
      [[[ledgerFile('a.json', ['G01', 'G02'])], 'G03: missing'],
        [[ledgerFile('a.json', ['G01', 'G02']), ledgerFile('b.json', ['G02', 'G03'])], 'G02: duplicate'],
        [[ledgerFile('a.json', ['G01', 'G02', 'G03'], stale)], 'is not the current'],
        [[ledgerFile('a.json', ['G01', 'G02']), ledgerFile('b.json', ['G03'], stale)], 'b.json: sourceHash'],
        [[ledgerFile('a.json', ['G01', 'G02', 'G03'], function (l) { l.kind = 'replay-wire'; })], 'kind'],
        [[{ name: 'a.json', text: '{ not json' }], 'not valid JSON'],
        [[{ name: 'a.json', error: 'cannot be read (EACCES)' }], 'cannot be read'],
        [[], 'no ledger to merge']
      ].forEach(function (c) {
        ['--check', '--write'].forEach(function (mode) {
          var t = setup({ dirs: { shards: c[0] } });
          expect(t.run(['--merge=shards', mode])).toBe(1);
          expect(t.state.out.join('\n')).toContain(c[1]);
          expect(t.state.err.join('\n')).toContain('merge refused');
          expect(t.state.err.join('\n')).toContain('nothing was written');
          expect([t.state.writes, t.state.generated, t.state.engine]).toEqual([[], [], 0]);
          expect(t.state.files[FIXTURE]).toBe('saved text\r\n');
        });
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The tools themselves (Node only): real processes on the real fixtures, never generating
  // ---------------------------------------------------------------------------------------------

  describe('replay recorders: the tools (Node only)', function () {
    var SANDBOX = 'tests/artifacts/difficulty-v3/MS03a/sandbox-recorders';

    function node() {
      var host = SG.test.node;
      var spawn = typeof process !== 'undefined' && process.getBuiltinModule ?
        process.getBuiltinModule('child_process') : null;
      if (!host || !host.fs || !spawn) SG.test.skip('needs Node (fs and child_process); skipped in the browser');
      return { host: host, spawn: spawn };
    }

    function tool(name, args) {
      var n = node();
      var run = n.spawn.spawnSync(process.execPath, [n.host.path.join('tests', name + '.js')].concat(args), {
        cwd: n.host.root, encoding: 'utf8', windowsHide: true, timeout: 120000 });
      return { code: run.status, out: run.stdout || '', err: run.stderr || '' };
    }

    function fixtureText(name) {
      var n = node();
      return n.host.fs.readFileSync(n.host.path.join(n.host.root, 'tests', 'fixtures', name + '.js'), 'utf8');
    }

    var identities = {};

    function identityOf(name) {
      if (!identities[name]) {
        var run = tool(name, ['--list']);
        expect(run.code).toBe(0);
        identities[name] = { source: /sourceHash\s+([0-9a-f]{64})/.exec(run.out)[1],
          manifest: /manifestHash ([0-9a-f]{64})/.exec(run.out)[1], out: run.out };
      }
      return identities[name];
    }

    function ledgerFor(name, ids, values, change) {
      var id = identityOf(name);
      var kind = name === 'replay-goldens' ? 'replay-goldens' : 'replay-wire';
      var made = T.ledgerOf({ kind: kind, sourceHash: id.source, manifestHash: id.manifest, node: process.version,
        commit: null, dirty: null }, ids.map(function (key) {
        return { key: key, request: golden(key).request, value: clone(values(key)) };
      }));
      if (change) change(made);
      return T.ledgerText(made);
    }

    function inSandbox(fn) {
      var n = node();
      var dir = n.host.path.join(n.host.root, SANDBOX);
      n.host.fs.rmSync(dir, { recursive: true, force: true });
      n.host.fs.mkdirSync(dir, { recursive: true });
      try {
        return fn(n.host, dir);
      } finally {
        n.host.fs.rmSync(dir, { recursive: true, force: true });
      }
    }

    it('lists the manifest and the identity of the sources of both tools, the same twice', function () {
      var goldens = identityOf('replay-goldens');
      var wire = identityOf('replay-fixtures');
      expect(goldens.out).toContain('tests/replay-goldens.js: 14 records, kind replay-goldens');
      expect(wire.out).toContain('tests/replay-fixtures.js: 5 records, kind replay-wire');
      expect(goldens.out).toContain('  G14 mega16 hell2 12');
      expect(wire.out).toContain('  G12 greaterThan hard 3115968914');
      expect(wire.out).toContain('  G13 samurai nightmare 42');
      expect(goldens.source).toBe(wire.source);
      expect(goldens.manifest).not.toBe(wire.manifest);
      expect(tool('replay-goldens', ['--list']).out).toBe(goldens.out);
      var help = tool('replay-goldens', ['--help']);
      expect(help.code).toBe(0);
      expect(help.out).toContain('--merge=<directory>');
      expect(tool('replay-fixtures', ['--help']).out).toContain('(no option)           generate the 5 requests');
    });

    it('refuses conflicting options, bad paths and partial writes, and leaves the fixtures byte for byte', function () {
      var n = node();
      var before = [fixtureText('replay-goldens'), fixtureText('replay-wire')];
      var absolute = n.host.path.resolve(n.host.root, 'elsewhere.json');
      [['replay-goldens', ['--write', '--check']], ['replay-goldens', ['--write', '--ids=G01']],
        ['replay-goldens', ['--record=tests/artifacts/x.json', '--write']], ['replay-goldens', ['--out=x.js']],
        ['replay-goldens', ['--ids=G15']], ['replay-goldens', ['--ids=G01,G01', '--check']],
        ['replay-goldens', ['--record=tests/fixtures/replay-goldens.json']],
        ['replay-goldens', ['--record=' + absolute]], ['replay-goldens', ['--record=../../outside.json']],
        ['replay-goldens', ['--record=tests/artifacts/x.txt']], ['replay-goldens', ['--merge=tests/nonexistent']],
        ['replay-fixtures', ['--ids=G09']], ['replay-fixtures', ['--write', '--ids=G09,G10']],
        ['replay-fixtures', ['--ids=G14', '--record=tests/artifacts/x.json']], ['replay-fixtures', ['--bogus']]
      ].forEach(function (c) {
        var run = tool(c[0], c[1]);
        expect(run.code).toBe(1);
        expect(run.out).toBe('');
        expect(run.err).toContain('Usage: node tests/' + c[0] + '.js');
      });
      expect([fixtureText('replay-goldens'), fixtureText('replay-wire')]).toEqual(before);
      expect(n.host.fs.existsSync(n.host.path.join(n.host.root, 'tests/artifacts/x.json'))).toBe(false);
      expect(n.host.fs.existsSync(n.host.path.join(n.host.root, 'x.js'))).toBe(false);
    });

    it('merges a complete ledger of the baseline records and checks it without generating (analysis)', function () {
      inSandbox(function (host, dir) {
        host.fs.writeFileSync(host.path.join(dir, 'all.json'), ledgerFor('replay-goldens',
          GOLDENS.map(function (g) { return g.id; }), golden), 'utf8');
        var before = fixtureText('replay-goldens');
        var run = tool('replay-goldens', ['--merge=' + SANDBOX, '--check']);
        expect(run.code).toBe(0);
        expect(run.out).toContain('merged 1 ledger: all 14 keys exactly once');
        expect(run.out).toContain('G14: matches replay-goldens.js');
        expect(run.out).toContain('replay-goldens.js is up to date');
        expect(/: \d+\.\d s/.test(run.out)).toBe(false);
        expect(tool('replay-goldens', ['--merge=' + SANDBOX]).code).toBe(0);
        expect(fixtureText('replay-goldens')).toBe(before);
        expect(host.fs.readdirSync(dir)).toEqual(['all.json']);
      });
    });

    it('writes an alternate fixture from merged ledgers, equal to the baseline data, and no canonical file',
      function () {
        inSandbox(function (host, dir) {
          host.fs.writeFileSync(host.path.join(dir, 'a.json'), ledgerFor('replay-goldens', ['G01', 'G02', 'G03',
            'G04', 'G05', 'G06', 'G07'], golden), 'utf8');
          host.fs.writeFileSync(host.path.join(dir, 'b.json'), ledgerFor('replay-goldens', ['G14', 'G13', 'G12',
            'G11', 'G10', 'G09', 'G08'], golden), 'utf8');
          var before = fixtureText('replay-goldens');
          var out = SANDBOX + '/fixture.js';
          var run = tool('replay-goldens', ['--merge=' + SANDBOX, '--write', '--out=' + out]);
          expect(run.code).toBe(0);
          expect(run.out).toContain('wrote generator/' + out + ' (');
          var text = host.fs.readFileSync(host.path.join(host.root, out), 'utf8');
          expect(text).toBe(RR.renderGoldens(GOLDENS.map(function (g) {
            return { key: g.id, request: g.request, value: g };
          })));
          expect(text.split('\r\n').filter(function (line) { return line.indexOf('    {') === 0; })).toHaveLength(14);
          expect(fixtureText('replay-goldens')).toBe(before);
          expect(host.fs.readdirSync(dir).sort()).toEqual(['a.json', 'b.json', 'fixture.js']);
        });
      });

    it('explains a changed field of a merged corpus and refuses a stale, partial or duplicated one', function () {
      inSandbox(function (host, dir) {
        var ids = GOLDENS.map(function (g) { return g.id; });
        var write = function (name, text) { host.fs.writeFileSync(host.path.join(dir, name), text, 'utf8'); };
        var arg = '--merge=' + SANDBOX;
        write('all.json', ledgerFor('replay-goldens', ids, golden, function (l) {
          l.records[0].value.rows[1][4] += 1;
        }));
        var changed = tool('replay-goldens', [arg, '--check']);
        expect(changed.code).toBe(1);
        expect(changed.out).toContain('G01: 1 field differ from replay-goldens.js');
        expect(changed.out).toContain('  rows[1][4]: saved 23, fresh 24');
        expect(changed.out).toContain('G02: matches replay-goldens.js');
        write('all.json', ledgerFor('replay-goldens', ids, golden, function (l) {
          l.sourceHash = '0'.repeat(64);
        }));
        var stale = tool('replay-goldens', [arg, '--write', '--out=' + SANDBOX + '/never.js']);
        expect(stale.code).toBe(1);
        expect(stale.out).toContain('all.json: sourceHash 000000000000... is not the current');
        write('all.json', ledgerFor('replay-goldens', ids.slice(1), golden));
        var partial = tool('replay-goldens', [arg, '--write', '--out=' + SANDBOX + '/never.js']);
        expect(partial.code).toBe(1);
        expect(partial.out).toContain('G01: missing');
        write('second.json', ledgerFor('replay-goldens', ['G01', 'G02'], golden));
        var twice = tool('replay-goldens', [arg, '--check']);
        expect(twice.code).toBe(1);
        expect(twice.out).toContain('G02: duplicate, recorded by all.json and second.json');
        expect(host.fs.readdirSync(dir).sort()).toEqual(['all.json', 'second.json']);
      });
    });

    it('rebuilds the saved wire file byte for byte from its five records (wire)', function () {
      inSandbox(function (host, dir) {
        var run = function (extra) { return tool('replay-fixtures', ['--merge=' + SANDBOX].concat(extra)); };
        host.fs.writeFileSync(host.path.join(dir, 'wire.json'), ledgerFor('replay-fixtures', RR.WIRE_IDS,
          function (key) { return WIRE[key]; }), 'utf8');
        var before = fixtureText('replay-wire');
        var check = run(['--check']);
        expect(check.code).toBe(0);
        expect(check.out).toContain('G11: matches replay-wire.js');
        expect(check.out).toContain('replay-wire.js is up to date');
        var out = SANDBOX + '/replay-wire.js';
        expect(run(['--write', '--out=' + out]).code).toBe(0);
        expect(host.fs.readFileSync(host.path.join(host.root, out), 'utf8')).toBe(before);
        expect(fixtureText('replay-wire')).toBe(before);
        host.fs.writeFileSync(host.path.join(dir, 'wire.json'), ledgerFor('replay-fixtures', RR.WIRE_IDS,
          function (key) { return WIRE[key]; }, function (l) { l.records[1].value.givens[0] += 1; }), 'utf8');
        var changed = run(['--check']);
        expect(changed.code).toBe(1);
        expect(changed.out).toContain('G10: 1 field differ from replay-wire.js');
        expect(changed.out).toContain('  givens[0]: saved ');
      });
    });
  });
})();
