// The bounded hash tooling of tests/perf.js (difficulty v3, MS03d): the fixed corpus of 520 (combination, seed)
// records, the selection and the command-line plan of the hash modes, ledgers of selected records and their
// complete merge, the guard of a hidden level, and the tool itself. The corpus, the plan, the ledgers and the merge
// are pure (tests/fixtures/perf-helper.js with SG.fixtures.toolRecords) and run in both runners. The ledger rows
// built here come from the table of tests/fixtures/regression.js and are UNIT-TEST DATA, not recorded evidence: no
// test generates more than two puzzles of classic4, and the Node tests run perf.js on a sandbox folder, never
// against the canonical fixture (they check that it stays byte for byte as it was).
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG;
  var P = SG.fixtures.perfTools;
  var T = SG.fixtures.toolRecords;
  var REGRESSION = SG.fixtures.regression;

  var SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946];
  var COMBOS = ['classic4/veryEasy', 'classic6/veryEasy', 'classic6/hard', 'classic9/veryEasy', 'classic9/easy',
    'classic9/normal', 'classic9/hard', 'classic9/expert', 'classic9/master', 'classic9/nightmare', 'mega12/normal',
    'mega16/easy', 'diagonalX/easy', 'diagonalX/nightmare', 'hyper/hard', 'jigsaw9/normal', 'jigsaw9/master',
    'killer/easy', 'killer/hard', 'greaterThan/normal', 'greaterThan/hard', 'samurai/easy', 'sohei/veryEasy',
    'butterfly/normal', 'flower/normal', 'wordoku/normal'];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function comboOf(entry) {
    return entry.request.variant + '/' + entry.request.level;
  }

  // ---------------------------------------------------------------------------------------------
  // The corpus: identities, order and the hash algorithm stay as they were
  // ---------------------------------------------------------------------------------------------

  describe('perf tooling: the fixed corpus', function () {
    it('keeps the 26 combinations and the 20 seeds in their order, and the 520 records after them', function () {
      expect(P.SEEDS).toEqual(SEEDS);
      expect(P.COMBOS.map(function (combo) { return combo.key; })).toEqual(COMBOS);
      var manifest = P.hashManifest();
      expect(manifest).toHaveLength(520);
      var expected = [];
      COMBOS.forEach(function (key) {
        SEEDS.forEach(function (seed) { expected.push(key + '#' + seed); });
      });
      expect(manifest.map(function (entry) { return entry.key; })).toEqual(expected);
      expect(manifest[0]).toEqual({ key: 'classic4/veryEasy#1',
        request: { variant: 'classic4', level: 'veryEasy', seed: 1 } });
      expect(manifest[519]).toEqual({ key: 'wordoku/normal#10946',
        request: { variant: 'wordoku', level: 'normal', seed: 10946 } });
      expect(Object.keys(manifest[0].request)).toEqual(['variant', 'level', 'seed']);
      expect(T.manifestText(P.hashManifest())).toBe(T.manifestText(manifest));
    });

    it('does not take the expected hashes into the manifest', function () {
      expect(T.manifestText(P.hashManifest())).not.toContain(REGRESSION.hashes['classic4/veryEasy'][0]);
    });

    it('keeps the hash algorithm: the vectors, and the recorded hashes of two cheap cells', function () {
      expect(P.hash64('')).toBe('811c9dc52545f491');
      expect(P.hash64('a')).toHaveLength(16);
      [['classic4', 'veryEasy', 0], ['classic4', 'veryEasy', 1]].forEach(function (cell) {
        expect(P.hashOf(cell[0], cell[1], SEEDS[cell[2]]))
          .toBe(REGRESSION.hashes[cell[0] + '/' + cell[1]][cell[2]]);
      });
    }, 60000);

    it('renders the fixture table to the text of the canonical file, which needs no change of its data', function () {
      var text = P.render(REGRESSION.hashes);
      expect(text.indexOf('\r')).toBe(-1);
      expect(text.slice(-6)).toBe('})();\n');
      expect(Object.keys(REGRESSION.hashes)).toEqual(COMBOS);
      if (!SG.test.node) return;
      var node = SG.test.node;
      var file = node.fs.readFileSync(node.path.join(node.root, 'tests', 'fixtures', 'regression.js'), 'utf8');
      expect(text).toBe(file.replace(/\r\n/g, '\n'));
    });

    it('turns any text into CRLF text without doubling a line end', function () {
      expect(P.toCrlf('a\nb\r\nc\n')).toBe('a\r\nb\r\nc\r\n');
      expect(P.toCrlf('')).toBe('');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // The selection and the plan of a command line
  // ---------------------------------------------------------------------------------------------

  describe('perf tooling: selection and plan of the hash modes', function () {
    function select(key, from, count) {
      return P.planHashSelection({ key: key, from: from, count: count });
    }

    it('selects the whole corpus by default and one combination by its exact key', function () {
      var all = select();
      expect(all.entries).toEqual(P.hashManifest());
      expect([all.complete, all.total]).toEqual([true, 520]);
      var one = select('classic9/hard');
      expect(one.entries).toHaveLength(20);
      expect(one.complete).toBe(false);
      expect(one.entries.every(function (entry) { return comboOf(entry) === 'classic9/hard'; })).toBe(true);
      expect(one.entries.map(function (entry) { return entry.request.seed; })).toEqual(SEEDS);
      expect(one.label).toBe('classic9/hard, all 20 seeds');
    });

    it('selects consecutive seed indexes from `from`, in manifest order, with the boundaries 0, 19 and 20', function () {
      var first = select('classic4/veryEasy', '0', '5');
      expect(first.entries.map(function (entry) { return entry.key; })).toEqual(['classic4/veryEasy#1',
        'classic4/veryEasy#2', 'classic4/veryEasy#3', 'classic4/veryEasy#5', 'classic4/veryEasy#8']);
      expect(first.label).toBe('classic4/veryEasy, seed indexes 0-4 (seeds 1, 2, 3, 5, 8)');
      expect(select('killer/easy', '19', '1').entries.map(function (entry) { return entry.request.seed; }))
        .toEqual([10946]);
      expect(select('killer/easy', '19').entries).toHaveLength(1);
      expect(select('killer/easy', '15').entries.map(function (entry) { return entry.request.seed; }))
        .toEqual([1597, 2584, 4181, 6765, 10946]);
      expect(select('killer/easy', '0', '20').entries).toHaveLength(20);
      expect(select('killer/easy', 0, 1).label).toBe('killer/easy, seed indexes 0 (seeds 1)');
      expect(function () { select('killer/easy', '20'); }).toThrow(/--hash-from=20 is outside the seed indexes 0\.\.19/);
      expect(function () { select('killer/easy', '19', '2'); }).toThrow(/goes past the last seed index 19 \(at most 1\)/);
      expect(function () { select('killer/easy', '0', '21'); }).toThrow(/--hash-count=21 from index 0 goes past/);
      expect(function () { select('killer/easy', '0', '0'); }).toThrow(/--hash-count=0 is not a positive number/);
    });

    it('selects a seed window of every combination when no key is given', function () {
      var window = select(undefined, '18', '2');
      expect(window.entries).toHaveLength(52);
      expect(window.complete).toBe(false);
      expect(window.entries.slice(0, 3).map(function (entry) { return entry.key; })).toEqual([
        'classic4/veryEasy#6765', 'classic4/veryEasy#10946', 'classic6/veryEasy#6765']);
      expect(select(null, '0', '20').complete).toBe(true);
    });

    it('refuses an unknown key and a value that is not a whole number', function () {
      expect(function () { select('classic9/nosuch'); }).toThrow(/is not a combination of the corpus \(known: classic4/);
      expect(function () { select('classic9'); }).toThrow(/not a combination/);
      expect(function () { select('CLASSIC9/hard'); }).toThrow(/not a combination/);
      ['-1', '1.5', 'x', '', ' 1', '1e1'].forEach(function (bad) {
        expect(function () { select('killer/easy', bad); }).toThrow(/--hash-from=.* is not a whole number/);
        expect(function () { select('killer/easy', '0', bad); }).toThrow(/--hash-count=.* is not a whole number/);
      });
    });

    function plan(options) {
      return P.planHashRun(Object.assign({ check: false, update: false, list: false, alloc: false, key: null,
        from: null, count: null, record: null, merge: null, out: null, timing: [] }, options));
    }

    it('keeps the measurement route for every command line without a hash option', function () {
      expect(plan({}).mode).toBe('timing');
      expect(plan({ timing: ['--variant', '--level', '--runs', '--quick', '--seed', '--gate', '--ascii'] }).mode)
        .toBe('timing');
      expect(plan({ alloc: true }).mode).toBe('timing');
      expect(plan({ alloc: true, timing: ['--runs'] }).mode).toBe('timing');
    });

    it('keeps the unfiltered --check-hashes and --update-hashes: every record, generated, timing options ignored',
      function () {
        var check = plan({ check: true, timing: ['--variant', '--quick'] });
        expect([check.mode, check.from, check.selection.complete, check.out]).toEqual(['check', 'generate', true, null]);
        expect(check.selection.entries).toHaveLength(520);
        var update = plan({ update: true });
        expect([update.mode, update.from, update.selection.complete]).toEqual(['update', 'generate', true]);
      });

    it('plans every hash mode', function () {
      var partial = plan({ check: true, key: 'killer/easy', from: '2', count: '3' });
      expect([partial.mode, partial.from, partial.selection.entries.length, partial.selection.complete])
        .toEqual(['check', 'generate', 3, false]);
      var record = plan({ record: 'out/a.json', key: 'killer/easy', count: '5' });
      expect([record.mode, record.file, record.selection.entries.length]).toEqual(['record', 'out/a.json', 5]);
      expect(plan({ record: 'out/all.json' }).selection.complete).toBe(true);
      var list = plan({ list: true, key: 'killer/easy' });
      expect([list.mode, list.selection.entries.length]).toEqual(['list', 20]);
      expect(plan({ list: true }).selection.entries).toHaveLength(520);
      var merged = plan({ merge: 'dir' });
      expect([merged.mode, merged.from, merged.directory, merged.selection.complete]).toEqual(['check', 'merge', 'dir',
        true]);
      expect(plan({ merge: 'dir', check: true }).mode).toBe('check');
      var write = plan({ merge: 'dir', update: true, out: 'alt/regression.js' });
      expect([write.mode, write.from, write.out]).toEqual(['update', 'merge', 'alt/regression.js']);
      var whole = plan({ update: true, from: '0', count: '20', out: 'alt/regression.js' });
      expect([whole.mode, whole.from, whole.out]).toEqual(['update', 'generate', 'alt/regression.js']);
    });

    it('refuses conflicting modes, bad selections and a partial canonical update before generating', function () {
      [[{ check: true, update: true }, /--check-hashes and --update-hashes conflict/],
        [{ check: true, update: true, key: 'killer/easy' }, /conflict/],
        [{ update: true, key: 'killer/easy' }, /a canonical update needs the complete corpus of 520 records, not the partial selection killer\/easy/],
        [{ update: true, from: '1' }, /partial selection all 26 combinations, seed indexes 1-19/],
        [{ update: true, count: '19' }, /partial selection/],
        [{ key: 'killer/easy' }, /need --check-hashes, --hash-record or --hash-list/],
        [{ from: '0' }, /need --check-hashes/],
        [{ count: '5' }, /need --check-hashes/],
        [{ out: 'a.js' }, /--hash-out only goes with --update-hashes/],
        [{ out: 'a.js', check: true }, /--hash-out only goes with --update-hashes/],
        [{ out: 'a.js', merge: 'dir' }, /--hash-out only goes with --update-hashes/],
        [{ record: 'a.json', check: true }, /--hash-record cannot be combined with --check-hashes/],
        [{ record: 'a.json', update: true }, /--hash-record cannot be combined with --update-hashes/],
        [{ record: 'a.json', merge: 'dir' }, /--hash-record cannot be combined with --hash-merge/],
        [{ record: 'a.json', out: 'a.js' }, /--hash-record cannot be combined with --hash-out/],
        [{ record: 'a.json', list: true }, /--hash-list cannot be combined with --hash-record/],
        [{ list: true, check: true }, /--hash-list cannot be combined with --check-hashes/],
        [{ list: true, merge: 'dir' }, /--hash-list cannot be combined with --hash-merge/],
        [{ merge: 'dir', key: 'killer/easy' }, /--hash-merge needs the complete corpus/],
        [{ merge: 'dir', from: '0' }, /--hash-merge needs the complete corpus/],
        [{ merge: 'dir', count: '20' }, /--hash-merge needs the complete corpus/],
        [{ merge: 'dir', check: true, update: true }, /conflict/],
        [{ check: true, alloc: true }, /--alloc cannot be combined with the hash modes/],
        [{ update: true, alloc: true }, /--alloc cannot be combined/],
        [{ record: 'a.json', alloc: true }, /--alloc cannot be combined/],
        [{ check: true, key: 'killer/easy', timing: ['--variant'] }, /the timing options \(--variant\) do not pick hash records/],
        [{ record: 'a.json', timing: ['--runs', '--quick'] }, /\(--runs, --quick\)/],
        [{ merge: 'dir', timing: ['--level'] }, /do not pick hash records/],
        [{ list: true, timing: ['--seed'] }, /do not pick hash records/],
        [{ check: true, key: 'nosuch/level' }, /is not a combination/],
        [{ record: 'a.json', key: 'killer/easy', from: '20' }, /outside the seed indexes/],
        [{ check: true, key: 'killer/easy', from: '19', count: '2' }, /goes past the last seed index/],
        [{ list: true, count: '0' }, /not a positive number/]
      ].forEach(function (c) {
        expect(function () { plan(c[0]); }).toThrow(c[1]);
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Ledgers and the complete merge (unit-test data from the fixture table, not evidence)
  // ---------------------------------------------------------------------------------------------

  describe('perf tooling: hash ledgers and the complete merge (pure, rows from the fixture table as test data)',
    function () {
      var SOURCE = '1'.repeat(64);
      var MANIFEST = '2'.repeat(64);
      var IDENTITY = { sourceHash: SOURCE, manifestHash: MANIFEST };

      function rows(entries) {
        return entries.map(function (entry) {
          return { variant: entry.request.variant, level: entry.request.level, seed: entry.request.seed,
            hash: REGRESSION.hashes[comboOf(entry)][SEEDS.indexOf(entry.request.seed)] };
        });
      }

      function ledger(entries, change) {
        var made = clone(P.hashLedger({ sourceHash: SOURCE, manifestHash: MANIFEST, node: 'v0', commit: 'abc',
          dirty: false }, rows(entries)));
        if (change) change(made);
        return made;
      }

      // The shards of the real procedure: every combination in four chunks of five seed indexes.
      function shards() {
        var out = [];
        var manifest = P.hashManifest();
        COMBOS.forEach(function (key) {
          [0, 5, 10, 15].forEach(function (from) {
            out.push(manifest.filter(function (entry) {
              var index = SEEDS.indexOf(entry.request.seed);
              return comboOf(entry) === key && index >= from && index < from + 5;
            }));
          });
        });
        return out;
      }

      function files(ledgers) {
        return ledgers.map(function (made, i) { return { name: 'shard-' + (1000 + i) + '.json', ledger: made }; });
      }

      function wholeCorpus(change) {
        var list = shards().map(function (entries) { return ledger(entries); });
        if (change) change(list);
        return files(list);
      }

      it('writes a flat record with the identity of its key: variant, level, seed and hash, then the run data', function () {
        var entries = P.hashManifest().slice(0, 2);
        var made = clone(P.hashLedger({ sourceHash: SOURCE, manifestHash: MANIFEST, node: 'v0', commit: null,
          dirty: null, generatedAt: '2026-01-01T00:00:00.000Z', argv: ['--hash-key=classic4/veryEasy'] },
        rows(entries).map(function (row, i) {
          return Object.assign(row, { ms: 12 + i, overrides: i === 0 ? ['classic4:veryEasy'] : [] });
        })));
        expect(Object.keys(made)).toEqual(['schema', 'kind', 'sourceHash', 'manifestHash', 'node', 'commit', 'dirty',
          'generatedAt', 'argv', 'records']);
        expect([made.schema, made.kind]).toEqual([1, 'regression-hashes']);
        expect(Object.keys(made.records[0])).toEqual(['key', 'variant', 'level', 'seed', 'hash', 'ms', 'overrides']);
        expect(made.records[0]).toEqual({ key: 'classic4/veryEasy#1', variant: 'classic4', level: 'veryEasy', seed: 1,
          hash: REGRESSION.hashes['classic4/veryEasy'][0], ms: 12, overrides: ['classic4:veryEasy'] });
        var text = T.ledgerText(made);
        expect(/(?<!\r)\n|\r(?!\n)|[ \t]+\r?$/m.test(text)).toBe(false);
        expect(JSON.parse(text)).toEqual(made);
        var plain = clone(P.hashLedger({ sourceHash: SOURCE, manifestHash: MANIFEST, node: 'v0', commit: 'c',
          dirty: false }, rows(entries)));
        expect(Object.keys(plain)).toEqual(['schema', 'kind', 'sourceHash', 'manifestHash', 'node', 'commit', 'dirty',
          'records']);
        expect(Object.keys(plain.records[0])).toEqual(['key', 'variant', 'level', 'seed', 'hash']);
      });

      it('merges the shards of all 26 combinations in any order into the table of the fixture, in its order',
        function () {
          var forward = P.mergeHashLedgers(wholeCorpus(), IDENTITY);
          expect(forward.problems).toEqual([]);
          expect(forward.ok).toBe(true);
          expect(forward.records).toHaveLength(520);
          expect(forward.records.map(function (r) { return r.key; })).toEqual(P.hashManifest().map(function (e) {
            return e.key;
          }));
          expect(forward.table).toEqual(REGRESSION.hashes);
          expect(Object.keys(forward.table)).toEqual(COMBOS);
          var backward = P.mergeHashLedgers(wholeCorpus(function (list) { list.reverse(); }), IDENTITY);
          expect(backward.table).toEqual(forward.table);
          var shuffled = P.mergeHashLedgers(wholeCorpus(function (list) {
            list.forEach(function (made) { made.records.reverse(); });
            list.sort(function (a, b) { return a.records[0].seed % 7 - b.records[0].seed % 7; });
          }), IDENTITY);
          expect(shuffled.ok).toBe(true);
          expect(shuffled.table).toEqual(forward.table);
          expect(P.tableOf(forward.records)).toEqual(REGRESSION.hashes);
          // One ledger with all 520 records is the same corpus.
          var single = P.mergeHashLedgers(files([ledger(P.hashManifest())]), IDENTITY);
          expect(single.table).toEqual(REGRESSION.hashes);
        });

      it('reconstructs the exact text of the canonical file from a complete merge (renderer equality)', function () {
        var merged = P.mergeHashLedgers(wholeCorpus(function (list) { list.reverse(); }), IDENTITY);
        var text = P.render(merged.table);
        expect(text).toBe(P.render(REGRESSION.hashes));
        var crlf = P.toCrlf(text);
        expect(crlf.charCodeAt(0)).not.toBe(0xfeff);
        expect(/(?<!\r)\n|\r(?!\n)|[ \t]+\r?$/m.test(crlf)).toBe(false);
        expect(crlf.slice(-2)).toBe('\r\n');
        if (!SG.test.node) return;
        var node = SG.test.node;
        var file = node.fs.readFileSync(node.path.join(node.root, 'tests', 'fixtures', 'regression.js'), 'utf8');
        expect(text).toBe(file.replace(/\r\n/g, '\n'));
        expect(crlf).toBe(file.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'));
      });

      it('refuses an incomplete corpus: one shard of 520, an omitted record, a missing combination', function () {
        var one = P.mergeHashLedgers(files([ledger(shards()[0])]), IDENTITY);
        expect(one.ok).toBe(false);
        expect(one.records).toBeNull();
        expect(one.table).toBeNull();
        expect(one.problems).toHaveLength(515);
        expect(one.problems[0]).toBe('classic4/veryEasy#13: missing (no ledger records it)');
        var omitted = P.mergeHashLedgers(wholeCorpus(function (list) { list[7].records.splice(2, 1); }), IDENTITY);
        expect(omitted.ok).toBe(false);
        expect(omitted.problems).toEqual(['classic6/veryEasy#' + SEEDS[17] + ': missing (no ledger records it)']);
        var combo = P.mergeHashLedgers(wholeCorpus(function (list) { list.splice(8, 4); }), IDENTITY);
        expect(combo.problems).toHaveLength(20);
        expect(combo.problems[0]).toBe('classic6/hard#1: missing (no ledger records it)');
        expect(P.mergeHashLedgers([], IDENTITY).problems[0]).toBe('no ledger to merge');
        expect(function () { P.tableOf(one.records || []); }).toThrow(/has no record: the merge is not complete/);
      });

      it('refuses a duplicate, in two ledgers or in one, with the files that recorded it', function () {
        var twice = P.mergeHashLedgers(wholeCorpus(function (list) {
          list.push(ledger(shards()[3].slice(1, 3)));
        }), IDENTITY);
        expect(twice.ok).toBe(false);
        expect(twice.problems).toEqual(['classic4/veryEasy#' + SEEDS[16] + ': duplicate, recorded by ' +
          'shard-1003.json and shard-1104.json', 'classic4/veryEasy#' + SEEDS[17] + ': duplicate, recorded by ' +
          'shard-1003.json and shard-1104.json']);
        var inside = P.mergeHashLedgers(wholeCorpus(function (list) {
          list[0].records.push(clone(list[0].records[0]));
        }), IDENTITY);
        expect(inside.ok).toBe(false);
        expect(inside.problems).toContain('shard-1000.json: record classic4/veryEasy#1 appears twice');
        expect(inside.records).toBeNull();
      });

      it('refuses an unknown combination or seed, and a key that does not say what its fields say', function () {
        var cases = [
          [function (l) { l.records[0].key = 'classic4/veryEasy#4'; l.records[0].seed = 4; },
            'record classic4/veryEasy#4 is not in the manifest'],
          [function (l) { l.records[0].key = 'classic5/veryEasy#1'; l.records[0].variant = 'classic5'; },
            'record classic5/veryEasy#1 is not in the manifest'],
          [function (l) { l.records[0].seed = 2; }, 'has a request that is not the manifest\'s'],
          [function (l) { l.records[0].variant = 'classic6'; }, 'has a request that is not the manifest\'s'],
          [function (l) { l.records[0].level = 'hard'; }, 'has a request that is not the manifest\'s'],
          [function (l) { delete l.records[0].seed; }, 'has a request that is not the manifest\'s'],
          [function (l) { delete l.records[0].hash; }, 'has no value object'],
          [function (l) { l.records[0].hash = 1234567890123456; }, 'has a hash that is not 16 hexadecimal digits'],
          [function (l) { l.records[0].hash = 'ABCDEF0123456789'; }, 'has a hash that is not 16 hexadecimal digits'],
          [function (l) { l.records[0].hash = 'abc'; }, 'has a hash that is not 16 hexadecimal digits'],
          [function (l) { l.records[0].hash = null; }, 'has a hash that is not 16 hexadecimal digits'],
          [function (l) { l.records[0] = 'classic4/veryEasy#1'; }, 'has no string key'],
          [function (l) { l.records[0].key = 7; }, 'has no string key']
        ];
        cases.forEach(function (c) {
          var bad = P.mergeHashLedgers(wholeCorpus(function (list) { c[0](list[0]); }), IDENTITY);
          expect(bad.ok).toBe(false);
          expect(bad.records).toBeNull();
          expect(bad.table).toBeNull();
          expect(bad.problems.join('\n')).toContain(c[1]);
        });
      });

      it('refuses a ledger of another kind, schema, sources or manifest, and a file that cannot be read', function () {
        var cases = [
          [function (l) { l.kind = 'replay-wire'; }, /^shard-1000\.json: kind "replay-wire" is not "regression-hashes"$/],
          [function (l) { l.schema = 2; }, /schema 2 is not 1/],
          [function (l) { l.sourceHash = '3'.repeat(64); },
            /^shard-1000\.json: sourceHash 333333333333\.\.\. is not the current 111111111111\.\.\./],
          [function (l) { l.manifestHash = '4'.repeat(64); }, /manifestHash 444444444444\.\.\. .*another recipe list/],
          [function (l) { l.sourceHash = 'abc'; }, /sourceHash is not a SHA-256 hex string/],
          [function (l) { l.manifestHash = undefined; }, /manifestHash is not a SHA-256 hex string/],
          [function (l) { l.node = 26; }, /node is not a string/],
          [function (l) { l.dirty = 'yes'; }, /dirty is not a boolean or null/],
          [function (l) { l.records = {}; }, /records is not an array/]
        ];
        cases.forEach(function (c) {
          var bad = P.mergeHashLedgers(wholeCorpus(function (list) { c[0](list[0]); }), IDENTITY);
          expect(bad.ok).toBe(false);
          expect(bad.records).toBeNull();
          expect(bad.problems.some(function (problem) { return c[1].test(problem); })).toBe(true);
        });
        var mixed = P.mergeHashLedgers(wholeCorpus(function (list) {
          list[40].sourceHash = '5'.repeat(64);
        }), IDENTITY);
        expect(mixed.ok).toBe(false);
        expect(mixed.problems).toHaveLength(1);
        expect(mixed.problems[0]).toMatch(/^shard-1040\.json: sourceHash/);
        var unreadable = wholeCorpus();
        unreadable[2] = { name: 'shard-1002.json', error: 'not valid JSON (Unexpected end)' };
        var broken = P.mergeHashLedgers(unreadable, IDENTITY);
        expect(broken.ok).toBe(false);
        expect(broken.problems[0]).toBe('shard-1002.json: not valid JSON (Unexpected end)');
        expect(P.mergeHashLedgers(wholeCorpus(), { sourceHash: '6'.repeat(64), manifestHash: MANIFEST }).ok)
          .toBe(false);
        expect(P.mergeHashLedgers(wholeCorpus(), { sourceHash: SOURCE, manifestHash: '6'.repeat(64) }).ok)
          .toBe(false);
      });

      it('compares records with the recorded table: counts, the seeds that changed, a combination it lacks',
        function () {
          var all = rows(P.hashManifest());
          expect(P.compareHashes(REGRESSION, all)).toEqual({ checked: 520, bad: 0, changed: [], missing: [] });
          var changed = clone(all);
          changed[5].hash = '0'.repeat(16);
          changed[7].hash = '0'.repeat(16);
          changed[25].hash = '0'.repeat(16);
          expect(P.compareHashes(REGRESSION, changed)).toEqual({ checked: 520, bad: 3, missing: [],
            changed: [{ key: 'classic4/veryEasy', seeds: [13, 34] }, { key: 'classic6/veryEasy', seeds: [13] }] });
          var partial = all.slice(0, 5);
          expect(P.compareHashes(REGRESSION, partial)).toEqual({ checked: 5, bad: 0, changed: [], missing: [] });
          var lacking = { hashes: { 'classic4/veryEasy': REGRESSION.hashes['classic4/veryEasy'] } };
          expect(P.compareHashes(lacking, all.slice(0, 45))).toEqual({ checked: 45, bad: 25, changed: [],
            missing: ['classic6/veryEasy', 'classic6/hard'] });
          expect(P.compareHashes(null, all.slice(0, 2)).missing).toEqual(['classic4/veryEasy']);
        });
    });

  // ---------------------------------------------------------------------------------------------
  // A hidden level stays in the corpus: offered to one generation, the exact array put back
  // ---------------------------------------------------------------------------------------------

  describe('perf tooling: the guard of a level the qualification hides', function () {
    it('generates an offered level as before, without touching the support array', function () {
      var def = SG.variants.get('classic4');
      var original = def.difficultySupport;
      var made = P.hashRecord('classic4', 'veryEasy', 1);
      expect(made.overridden).toBe(false);
      expect(made.hash).toBe(REGRESSION.hashes['classic4/veryEasy'][0]);
      expect(P.hashOf('classic4', 'veryEasy', 1)).toBe(made.hash);
      expect(def.difficultySupport).toBe(original);
    });

    it('offers a missing level to that one generation, says so, and puts back the exact original array', function () {
      var def = SG.variants.get('classic4');
      var original = def.difficultySupport;
      var before = original.slice();
      expect(before).not.toContain('hard');
      var made = P.hashRecord('classic4', 'hard', 1);
      expect(made.overridden).toBe(true);
      expect(made.hash).toMatch(/^[0-9a-f]{16}$/);
      expect(P.hashOf('classic4', 'hard', 1)).toBe(made.hash);
      expect(def.difficultySupport).toBe(original);
      expect(original).toEqual(before);
      expect(function () {
        SG.pipeline.run({ variantId: 'classic4', difficulty: 'hard', seed: 1, trace: 'off' }, null);
      }).toThrow();
    }, 60000);

    it('restores the exact original array when the generation fails, and offers the level only while it runs',
      function () {
        var def = SG.variants.get('classic4');
        var original = def.difficultySupport;
        var before = original.slice();
        var run = SG.pipeline.run;
        var inside = null;
        SG.pipeline.run = function () {
          inside = def.difficultySupport.slice();
          throw new Error('boom');
        };
        try {
          expect(function () { P.hashRecord('classic4', 'hard', 1); }).toThrow(/boom/);
          expect(function () { P.hashOf('classic4', 'hard', 2); }).toThrow(/boom/);
        } finally {
          SG.pipeline.run = run;
        }
        expect(inside).toEqual(['veryEasy', 'hard']);
        expect(def.difficultySupport).toBe(original);
        expect(original).toEqual(before);
        expect(SG.pipeline.run).toBe(run);
      });
  });

  // ---------------------------------------------------------------------------------------------
  // The tool itself (Node only): real processes on a sandbox folder, the canonical fixture untouched
  // ---------------------------------------------------------------------------------------------

  describe('perf tooling: tests/perf.js (Node only)', function () {
    var SANDBOX = 'tests/artifacts/difficulty-v3/MS03d/sandbox-hashes';

    function node() {
      var host = SG.test.node;
      var spawn = typeof process !== 'undefined' && process.getBuiltinModule ?
        process.getBuiltinModule('child_process') : null;
      if (!host || !host.fs || !spawn) SG.test.skip('needs Node (fs and child_process); skipped in the browser');
      return { host: host, spawn: spawn };
    }

    function perf(args) {
      var n = node();
      var run = n.spawn.spawnSync(process.execPath, [n.host.path.join('tests', 'perf.js')].concat(args), {
        cwd: n.host.root, encoding: 'utf8', windowsHide: true, timeout: 120000 });
      return { code: run.status, out: run.stdout || '', err: run.stderr || '' };
    }

    function canonical() {
      var n = node();
      return n.host.fs.readFileSync(n.host.path.join(n.host.root, 'tests', 'fixtures', 'regression.js'));
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

    var identity = null;

    function identityOf() {
      if (!identity) {
        var run = perf(['--hash-list']);
        expect(run.code).toBe(0);
        identity = { source: /sourceHash\s+([0-9a-f]{64})/.exec(run.out)[1],
          manifest: /manifestHash ([0-9a-f]{64})/.exec(run.out)[1], out: run.out };
      }
      return identity;
    }

    // One ledger per combination, from the table of the fixture (unit-test data), with the real identity.
    function writeShards(host, dir, change) {
      var id = identityOf();
      var manifest = P.hashManifest();
      COMBOS.slice().reverse().forEach(function (key, i) {
        var entries = manifest.filter(function (entry) { return comboOf(entry) === key; });
        var made = clone(P.hashLedger({ sourceHash: id.source, manifestHash: id.manifest, node: process.version,
          commit: null, dirty: null }, entries.map(function (entry) {
          return { variant: entry.request.variant, level: entry.request.level, seed: entry.request.seed,
            hash: REGRESSION.hashes[key][SEEDS.indexOf(entry.request.seed)] };
        })));
        if (change) change(made, key);
        host.fs.writeFileSync(host.path.join(dir, 'ledger-' + (100 + i) + '.json'), T.ledgerText(made), 'utf8');
      });
    }

    it('lists the selected identities and the identity of the sources, without generating', function () {
      var all = identityOf();
      expect(all.out).toContain('tests/perf.js: 520 of 520 hash records (all 26 combinations, all 20 seeds), kind ' +
        'regression-hashes, fixture tests/fixtures/regression.js');
      expect(all.out).toContain('  classic4/veryEasy#1 classic4 veryEasy seed 1 (index 0)');
      expect(all.out).toContain('  wordoku/normal#10946 wordoku normal seed 10946 (index 19)');
      expect(perf(['--hash-list']).out).toBe(all.out);
      var part = perf(['--hash-list', '--hash-key=killer/hard', '--hash-from=18', '--hash-count=2']);
      expect(part.code).toBe(0);
      expect(part.out).toContain('2 of 520 hash records (killer/hard, seed indexes 18-19 (seeds 6765, 10946))');
      expect(part.out).toContain('  killer/hard#6765 killer hard seed 6765 (index 18)');
      expect(part.out.split('\n').filter(function (line) { return line.indexOf('  killer/') === 0; })).toHaveLength(2);
      expect(part.out).toContain('sourceHash   ' + all.source);
      expect(part.out).toContain('manifestHash ' + all.manifest);
      expect(/: \d+\.\d s/.test(part.out)).toBe(false);
    });

    it('shows the usage with every hash option, and keeps the old route of the timing options', function () {
      var help = perf(['--help']);
      expect(help.code).toBe(0);
      ['--hash-key=variant/level', '--hash-from=N', '--hash-count=N', '--hash-record=<file.json>',
        '--hash-merge=<directory>', '--hash-list', '--hash-out=<file.js>'].forEach(function (text) {
        expect(help.out).toContain(text);
      });
      expect(help.out).toContain('--variant=a,b');
      var none = perf(['--variant=classic4', '--level=hard']);
      expect(none.code).toBe(2);
      expect(none.err).toContain('nothing to measure: no cell of the table matches the selection');
      expect(none.out).toBe('');
      var unknown = perf(['--bogus']);
      expect(unknown.code).toBe(2);
      expect(unknown.err).toContain('Unknown argument: --bogus');
    });

    it('refuses invalid modes and ranges before it generates or writes, and the fixture stays byte for byte',
      function () {
        var before = canonical();
        [['--hash-key=classic4/nosuch', '--check-hashes'], ['--hash-from=19', '--hash-count=2', '--check-hashes'],
        ['--hash-key=classic4/veryEasy', '--update-hashes'], ['--check-hashes', '--update-hashes'],
        ['--hash-key=classic4/veryEasy', '--variant=classic4', '--check-hashes'], ['--hash-from=1'],
        ['--hash-key=', '--check-hashes'], ['--hash-key=classic4/veryEasy', '--hash-key=classic9/easy',
          '--check-hashes'], ['--hash-record=tests/artifacts/x.txt', '--hash-key=classic4/veryEasy'],
        ['--hash-record=tests/fixtures/x.json', '--hash-key=classic4/veryEasy'],
        ['--hash-record=../../outside.json', '--hash-key=classic4/veryEasy'],
        ['--hash-merge=tests/nonexistent', '--check-hashes'], ['--hash-merge=tests', '--hash-key=classic4/veryEasy'],
        ['--hash-merge=tests', '--update-hashes', '--hash-out=tests/artifacts/x.json'],
        ['--alloc', '--check-hashes']
        ].forEach(function (args) {
          var run = perf(args);
          expect(run.code).toBe(2);
          expect(run.out).toBe('');
          expect(run.err).toContain('Usage: node tests/perf.js');
        });
        expect(canonical().equals(before)).toBe(true);
        var host = node().host;
        ['tests/artifacts/x.js', 'tests/artifacts/x.json', 'tests/fixtures/x.json'].forEach(function (rel) {
          expect(host.fs.existsSync(host.path.join(host.root, rel))).toBe(false);
        });
      });

    it('checks a selection against the fixture and says it is partial, then records a shard into a ledger only',
      function () {
        inSandbox(function (host, dir) {
          var before = canonical();
          var check = perf(['--check-hashes', '--hash-key=classic4/veryEasy', '--hash-from=0', '--hash-count=2']);
          expect(check.code).toBe(0);
          expect(check.out).toContain('classic4/veryEasy: seeds 1, 2 (');
          expect(check.out).toContain('regression hashes: 2 of 520 puzzles checked (classic4/veryEasy, seed indexes ' +
            '0-1 (seeds 1, 2)), all unchanged; the other 518 were not checked, so this is not a pass of the ' +
            'complete corpus');
          expect(check.out).not.toContain('all 520');
          var file = SANDBOX + '/classic4-00.json';
          var record = perf(['--hash-key=classic4/veryEasy', '--hash-from=0', '--hash-count=2', '--hash-record=' + file]);
          expect(record.code).toBe(0);
          expect(record.out).toContain('recorded 2 of 520 keys (classic4/veryEasy, seed indexes 0-1 (seeds 1, 2)) in ' +
            'generator/' + file + '; a ledger is one shard, merge them all with --hash-merge');
          var text = host.fs.readFileSync(host.path.join(host.root, file), 'utf8');
          var made = JSON.parse(text);
          expect(Object.keys(made)).toEqual(['schema', 'kind', 'sourceHash', 'manifestHash', 'node', 'commit', 'dirty',
            'generatedAt', 'argv', 'records']);
          expect([made.kind, made.sourceHash, made.manifestHash, made.node]).toEqual(['regression-hashes',
            identityOf().source, identityOf().manifest, process.version]);
          expect(made.argv).toEqual(['--hash-key=classic4/veryEasy', '--hash-from=0', '--hash-count=2',
            '--hash-record=' + file]);
          expect(made.records.map(function (r) { return r.key; })).toEqual(['classic4/veryEasy#1',
            'classic4/veryEasy#2']);
          expect(Object.keys(made.records[0])).toEqual(['key', 'variant', 'level', 'seed', 'hash', 'ms', 'overrides']);
          expect(made.records.map(function (r) { return r.hash; }))
            .toEqual(REGRESSION.hashes['classic4/veryEasy'].slice(0, 2));
          expect(made.records[0].overrides).toEqual([]);
          expect(/(?<!\r)\n|\r(?!\n)|[ \t]+\r?$/m.test(text)).toBe(false);
          expect(host.fs.readdirSync(dir)).toEqual(['classic4-00.json']);
          expect(canonical().equals(before)).toBe(true);
        });
      }, 120000);

    it('refuses the merge of one shard as incomplete and leaves the fixture and every other file as they were',
      function () {
        inSandbox(function (host, dir) {
          var before = canonical();
          var entries = P.hashManifest().slice(0, 5);
          var id = identityOf();
          host.fs.writeFileSync(host.path.join(dir, 'classic4-00.json'), T.ledgerText(P.hashLedger({
            sourceHash: id.source, manifestHash: id.manifest, node: process.version, commit: null, dirty: null },
          entries.map(function (entry) {
            return { variant: entry.request.variant, level: entry.request.level, seed: entry.request.seed,
              hash: REGRESSION.hashes['classic4/veryEasy'][SEEDS.indexOf(entry.request.seed)] };
          }))), 'utf8');
          var out = SANDBOX + '/never.js';
          [['--check-hashes'], ['--update-hashes'], ['--update-hashes', '--hash-out=' + out]].forEach(function (extra) {
            var run = perf(['--hash-merge=' + SANDBOX].concat(extra));
            expect(run.code).toBe(1);
            expect(run.out).toContain('classic4/veryEasy#13: missing (no ledger records it)');
            expect(run.out).toContain('... and ' + (515 - 20) + ' more');
            expect(run.err).toContain('merge refused: 515 problems (515 of the 520 keys missing); nothing was written');
            expect(canonical().equals(before)).toBe(true);
          });
          expect(host.fs.readdirSync(dir)).toEqual(['classic4-00.json']);
        });
      }, 120000);

    it('merges the complete corpus without generating: checks it, and writes an alternate file equal to the ' +
      'canonical one (unit-test rows)', function () {
      inSandbox(function (host, dir) {
        var before = canonical();
        writeShards(host, dir);
        var check = perf(['--hash-merge=' + SANDBOX, '--check-hashes']);
        expect(check.code).toBe(0);
        expect(check.out).toContain('merged 26 ledgers: all 520 keys exactly once, recorded from the current sources');
        expect(check.out).toContain('regression hashes: all 520 puzzles unchanged (merged ledgers, nothing generated)');
        expect(/: seeds /.test(check.out)).toBe(false);
        expect(perf(['--hash-merge=' + SANDBOX]).code).toBe(0);
        var out = SANDBOX + '/regression-out.js';
        var write = perf(['--hash-merge=' + SANDBOX, '--update-hashes', '--hash-out=' + out]);
        expect(write.code).toBe(0);
        expect(write.out).toContain('every hash equals the current fixture');
        expect(write.out).toContain('wrote generator/' + out + ': 26 combinations x 20 seeds (merged ledgers, nothing ' +
          'generated)');
        var bytes = host.fs.readFileSync(host.path.join(host.root, out));
        var text = bytes.toString('utf8');
        expect(bytes[0]).not.toBe(0xef);
        expect(/(?<!\r)\n|\r(?!\n)|[ \t]+\r?$/m.test(text)).toBe(false);
        expect(text.slice(-2)).toBe('\r\n');
        expect(text.replace(/\r\n/g, '\n')).toBe(P.render(REGRESSION.hashes));
        expect(text.replace(/\r\n/g, '\n')).toBe(before.toString('utf8').replace(/\r\n/g, '\n'));
        expect(canonical().equals(before)).toBe(true);
        expect(host.fs.readdirSync(dir)).toHaveLength(27);
      });
    }, 120000);

    it('explains a hash that differs in a complete merge, and refuses a duplicated, stale or incomplete one without ' +
      'writing', function () {
      inSandbox(function (host, dir) {
        var before = canonical();
        var out = SANDBOX + '/never.js';
        writeShards(host, dir, function (made, key) {
          if (key === 'killer/hard') made.records[6].hash = '0'.repeat(16);
        });
        var changed = perf(['--hash-merge=' + SANDBOX, '--check-hashes']);
        expect(changed.code).toBe(1);
        expect(changed.out).toContain('CHANGED killer/hard: seeds 21');
        expect(changed.out).toContain('regression hashes: 1 of 520 puzzles changed (merged ledgers, nothing generated)');
        var shown = perf(['--hash-merge=' + SANDBOX, '--update-hashes', '--hash-out=' + out]);
        expect(shown.code).toBe(0);
        expect(shown.out).toContain('CHANGED killer/hard: seeds 21');
        expect(shown.out).toContain('1 of 520 hashes differ from the current fixture');
        host.fs.rmSync(host.path.join(host.root, out));
        var list = host.fs.readdirSync(dir).sort();
        var first = host.path.join(dir, list[0]);
        var good = host.fs.readFileSync(first, 'utf8');
        host.fs.writeFileSync(first, good.replace(identityOf().source, '0'.repeat(64)), 'utf8');
        var stale = perf(['--hash-merge=' + SANDBOX, '--update-hashes', '--hash-out=' + out]);
        expect(stale.code).toBe(1);
        expect(stale.out).toContain(list[0] + ': sourceHash 000000000000... is not the current');
        host.fs.writeFileSync(first, good, 'utf8');
        host.fs.writeFileSync(host.path.join(dir, 'extra.json'), good, 'utf8');
        var twice = perf(['--hash-merge=' + SANDBOX, '--update-hashes', '--hash-out=' + out]);
        expect(twice.code).toBe(1);
        expect(twice.out).toContain('duplicate, recorded by extra.json and ' + list[0]);
        host.fs.rmSync(host.path.join(dir, 'extra.json'));
        host.fs.rmSync(first);
        var partial = perf(['--hash-merge=' + SANDBOX, '--update-hashes', '--hash-out=' + out]);
        expect(partial.code).toBe(1);
        expect(partial.err).toContain('merge refused');
        host.fs.writeFileSync(host.path.join(dir, 'broken.json'), '{ not json', 'utf8');
        expect(perf(['--hash-merge=' + SANDBOX, '--check-hashes']).out).toContain('broken.json: not valid JSON');
        expect(host.fs.existsSync(host.path.join(host.root, out))).toBe(false);
        expect(canonical().equals(before)).toBe(true);
      });
    }, 120000);
  });
})();
