'use strict';

/*
 * MS18d Phase C0b task-owned tests, FILE-ONLY and fake-data: the frozen R24 plan (plan-data.js), the chunk
 * manifest builder and verifier, the raw-time ledger contract (ledger-schema.js), the source loader
 * (loader.js), the attempt accounting derived from immutable folders (attempts.js, R4) and the reduced
 * plan of the stand-in project. Nothing is measured and nothing generates a puzzle; the one real-tree read
 * is the loader's capture of the real sources (no execution), compared with the frozen identities.
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-c/test-plan.js
 */
const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const plan = require('./plan-data.js');
const loader = require('./loader.js');
const ledger = require('./ledger-schema.js');
const { chunkAttempts } = require('./attempts.js');
const standin = require('./standin-gp.js');
const { sha256 } = require('./common.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const scratch = fs.mkdtempSync(path.join(REPO, '.scratch-ms18d-c-plan-'));
const at = (...p) => path.join(scratch, ...p);

let passed = 0;
const failed = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + ': ' + (err && err.stack));
  }
}

async function planTests() {
  const rows = plan.frozenRows();

  await test('R24: the frozen table is exactly what the common rule derives (79 rows)', () => {
    assert.strictEqual(rows.length, 79);
    assert.deepStrictEqual(plan.checkFrozen(rows), []);
    assert.strictEqual(new Set(rows.map((r) => r.key)).size, 79);
  });

  await test('R24: 114 commands, 3,950 requests, 35 extra starts, 62 + 52, sums 7739 and 19023, max P 448',
    () => {
      const one = rows.filter((r) => r.route === 'C');
      const multi = rows.filter((r) => r.route === 'R');
      assert.strictEqual(one.length, 62);
      assert.strictEqual(multi.length, 17);
      assert.ok(one.every((r) => r.chunks.length === 1 && r.chunks[0][0] === 0 && r.chunks[0][1] === 50));
      assert.strictEqual(one.reduce((s, r) => s + r.chunks[0][2], 0), 7739);
      const multiChunks = multi.reduce((s, r) => s + r.chunks.length, 0);
      assert.strictEqual(multiChunks, 52);
      assert.strictEqual(multi.reduce((s, r) => s + r.chunks.reduce((t, c) => t + c[2], 0), 0), 19023);
      const all = rows.reduce((s, r) => s + r.chunks.length, 0);
      assert.strictEqual(all, 114);
      assert.strictEqual(rows.reduce((s, r) => s + r.chunks.reduce((t, c) => t + c[1], 0), 0), 3950);
      assert.strictEqual(all - rows.length, 35);
      const maxP = rows.reduce((m, r) => r.chunks.reduce((x, c) => Math.max(x, c[2]), m), 0);
      assert.strictEqual(maxP, 448);
      const shape = {};
      multi.forEach((r) => { shape[r.chunks.length] = (shape[r.chunks.length] || 0) + 1; });
      assert.deepStrictEqual(shape, { 2: 12, 3: 2, 6: 2, 10: 1 });
    });

  await test('R24: the shapes of mega16/hell2, samurai/master and greaterThan/hell2; ranges are contiguous',
    () => {
      const byKey = (k) => rows.filter((r) => r.key === k)[0];
      assert.deepStrictEqual(byKey('mega16/hell2').chunks,
        [[0, 9, 448], [9, 9, 448], [18, 8, 405], [26, 8, 405], [34, 8, 405], [42, 8, 405]]);
      assert.strictEqual(byKey('samurai/master').chunks.length, 10);
      assert.ok(byKey('samurai/master').chunks.every((c) => c[1] === 5 && c[2] === 394));
      assert.deepStrictEqual(byKey('greaterThan/hell2').chunks, [[0, 17, 391], [17, 17, 391], [34, 16, 371]]);
      rows.forEach((r) => {
        let next = 0;
        r.chunks.forEach((c) => {
          assert.strictEqual(c[0], next, r.key);
          next += c[1];
          assert.ok(c[2] <= 450, r.key + ' P ' + c[2]);
        });
        assert.strictEqual(next, 50, r.key);
        const sizes = r.chunks.map((c) => c[1]);
        assert.ok(sizes.every((s, i) => i === 0 || sizes[i - 1] >= s), 'larger chunks first: ' + r.key);
        assert.ok(Math.max.apply(null, sizes) - Math.min.apply(null, sizes) <= 1, 'balanced: ' + r.key);
      });
    });

  await test('R24: the derivation rejects an invalid maximum instead of inventing a bound', () => {
    [0, -1, NaN, Infinity, '12', null, undefined].forEach((m) => {
      assert.throws(() => plan.deriveChunks(m), /invalid maximum/, String(m));
    });
    assert.strictEqual(plan.deriveChunks(390000).k, 50, 'one request per command is the limit');
    assert.throws(() => plan.deriveChunks(390001), /zero capacity/);
    assert.throws(() => plan.deriveChunks(400000), /zero capacity/);
    assert.deepStrictEqual(plan.deriveChunks(7953.7019).chunks, [[0, 25, 259], [25, 25, 259]]);
  });

  await test('R24: a damaged frozen table is reported, never corrected', () => {
    const bad = plan.frozenRows();
    bad[0].p50 += 1;
    bad[17].chunks = [[0, 50, 637]];
    bad[10].chunks = [[0, 49, 61]];
    const problems = plan.checkFrozen(bad);
    assert.ok(problems.some((p) => /classic4\/veryEasy: P50/.test(p)));
    assert.ok(problems.some((p) => /mega12\/hell2: k/.test(p) || /mega12\/hell2: frozen chunks/.test(p)));
    assert.ok(problems.some((p) => /mega12\/veryEasy: chunks cover 49/.test(p)));
  });

  await test('canonicalJson is the recipe of toolRecords.canonicalJson (the real tool, in a VM)', () => {
    const file = path.join(REPO, 'generator', 'tests', 'fixtures', 'tool-records.js');
    const sandbox = vm.createContext({});
    vm.runInContext('var SG = {};', sandbox);
    vm.runInContext(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''), sandbox, { filename: file });
    const real = vm.runInContext('SG.fixtures.toolRecords.canonicalJson', sandbox);
    const samples = [{ b: 1, a: [3, { z: null, y: 'é"\\' }], c: -0.5, d: true }, [], {}, 'x', 7000,
      [[1, 2], []],
      { n: { n: { n: 1.25e-7 } } }, { '': 0, 'a b': 'c' }];
    samples.forEach((s) => assert.strictEqual(plan.canonicalJson(s), real(s), JSON.stringify(s)));
    assert.throws(() => plan.canonicalJson({ a: NaN }), /not finite/);
    assert.throws(() => plan.canonicalJson({ a: undefined }), /not plain JSON/);
    assert.ok(/^[0-9a-f]{64}$/.test(plan.canonicalSha256({ a: 1 })), 'lowercase hex');
  });

  const base = 'docs/difficulty-v3/evidence/MS18d/gp';
  const inputs = (over) => Object.assign({ plan: { packCommit: 'c'.repeat(40) }, targets: { offered: 79 },
    sources: {}, environment: {}, policy: { choice: 'A' },
    loader: { recipe: { loaded: 1 }, files: [{ rel: 'x', sha256: 'a'.repeat(64) }],
      hashIdentity: 'a'.repeat(64) },
    mergeBase: base }, over || {});

  await test('R2: the manifest declares 114 chunks and the literal run slots (2 per chunk + final merge)',
    () => {
      const doc = plan.buildManifest(inputs());
      assert.deepStrictEqual(plan.verifyManifest(doc), []);
      assert.strictEqual(doc.chunks.length, 114);
      assert.strictEqual(doc.counts.requests, 3950);
      assert.strictEqual(doc.counts.runSlots, 114 * 2 + 1);
      assert.strictEqual(doc.slotPolicy.cellMerge, false, 'selected-cell merges are not declared');
      const dirs = plan.declaredDirsOf(doc);
      assert.strictEqual(new Set(dirs).size, dirs.length);
      assert.ok(dirs.indexOf(base + '/all-79/final.m1') !== -1);
      assert.ok(dirs.indexOf(base + '/classic4-veryEasy/classic4-veryEasy.i0.n50.a1') !== -1);
      assert.ok(dirs.indexOf(base + '/classic4-veryEasy/classic4-veryEasy.i0.n50.a2') !== -1);
      assert.ok(dirs.indexOf(base + '/mega16-hell2/mega16-hell2.i42.n8.a2') !== -1);
      assert.ok(!dirs.some((d) => /merge\.m1/.test(d)), 'no selected-cell merge directory');
      assert.strictEqual(doc.gate.requiredSuccesses, 72);
      assert.strictEqual(doc.counts.extraColdStarts, 35);
      assert.strictEqual(doc.counts.maxProjectionSeconds, 448);
      assert.strictEqual(doc.counts.reservedSeconds, 7739 + 19023);
      const chunk = doc.chunks.filter((c) => c.chunkId === 'mega16-hell2.i26.n8')[0];
      assert.deepStrictEqual(chunk.seeds, [26, 27, 28, 29, 30, 31, 32, 33].map((i) => 7000 + 101 * i));
      assert.strictEqual(chunk.seedBase, 7000 + 101 * 26);
      assert.strictEqual(doc.chunks.reduce((s, c) => s + c.seeds.length, 0), 3950);
    });

  await test('R2: optional selected-cell merge slots are declared only when asked for (79 more)', () => {
    const doc = plan.buildManifest(inputs({ cellMergeSlots: true }));
    assert.deepStrictEqual(plan.verifyManifest(doc), []);
    assert.strictEqual(doc.counts.runSlots, 114 * 2 + 79 + 1);
    assert.ok(plan.declaredDirsOf(doc).indexOf(base + '/classic4-veryEasy/merge.m1') !== -1);
    assert.strictEqual(plan.slotForDir(doc, base + '/all-79/final.m1').role, 'final-merge');
    assert.strictEqual(plan.slotForDir(doc, base + '/all-79/final.m1/').role, 'final-merge');
    assert.strictEqual(plan.slotForDir(doc, base + '/all-79/final.m2'), null);
    assert.strictEqual(plan.slotForDir(doc, base + '/classic4-veryEasy'), null);
  });

  const tamper = (label, edit, pattern) => {
    return test('manifest verification rejects ' + label, () => {
      const doc = JSON.parse(JSON.stringify(plan.buildManifest(inputs({ cellMergeSlots: true }))));
      edit(doc);
      const problems = plan.verifyManifest(doc);
      assert.ok(problems.length > 0, 'accepted');
      assert.ok(problems.some((p) => pattern.test(p)), problems.slice(0, 4).join(' | '));
    });
  };
  await tamper('a changed target (the hash no longer matches)', (d) => { d.chunks[0].target += 1; },
    /manifest hash/);
  await tamper('a changed seed', (d) => { d.chunks[3].seeds[1] += 1; d.manifestSha256 = 'x'; }, /seed 1/);
  await tamper('a chunk that is not contiguous', (d) => { d.chunks[2].i0 += 1; },
    /not contiguous|ID differs/);
  await tamper('a duplicated chunk', (d) => { d.chunks[1] = JSON.parse(JSON.stringify(d.chunks[0])); },
    /duplicate chunk ID/);
  await tamper('a projection over 450 s', (d) => { d.chunks[5].projectionSeconds = 451; }, /over 450 s/);
  await tamper('a slot with a traversing path', (d) => { d.runSlots[0].dir += '/../x'; }, /wrong path/);
  await tamper('a slot declared twice', (d) => { d.runSlots[1] = JSON.parse(JSON.stringify(d.runSlots[0])); },
    /declared twice|attempt/);
  await tamper('a slot assigned to the wrong cell', (d) => {
    const s = d.runSlots.filter((x) => x.role === 'chunk')[0];
    s.cell = 'classic6/veryEasy';
    s.dir = s.dir.replace('classic4-veryEasy', 'classic6-veryEasy');
  }, /not the cell of its chunk/);
  await tamper('an extra slot', (d) => {
    d.runSlots.push({ role: 'chunk', runId: 'x.a3', dir: base + '/classic4-veryEasy/x.a3',
      cell: 'classic4/veryEasy', chunkId: 'classic4-veryEasy.i0.n50', attempt: 3 });
  }, /attempt 3|unexpected|expected/);
  await tamper('a changed slot policy', (d) => { d.slotPolicy.chunkAttempts = 3; }, /slot policy/);
  await tamper('a missing loaded-source manifest', (d) => { delete d.loader; }, /loaded-source manifest/);
  await tamper('a wrong request count', (d) => { d.counts.requests -= 1; }, /request count/);
  await tamper('a final merge that names a cell', (d) => {
    d.runSlots[d.runSlots.length - 1].cell = 'classic4/veryEasy';
  }, /names a cell|wrong path/);
}

async function ledgerTests() {
  const made = (() => {
    fs.mkdirSync(at('l-repo'), { recursive: true });
    standin.makeFakeProject(at('l-repo'));
    return standin.makeFakeManifest(at('l-repo'));
  })();
  const chunk = made.doc.chunks.filter((c) => c.chunkId === 'fakeb-easy.i25.n25')[0];
  const times = standin.timesFor(chunk, 50, 3);
  const identity = () => ({ planManifestSha256: 'a'.repeat(64), helperManifestSha256: 'b'.repeat(64),
    hashIdentity: 'c'.repeat(64), tableSha256: 'd'.repeat(64), sourcesPublished: 'e'.repeat(16),
    loadedFiles: [{ rel: 'x.js', bytes: 1, rawSha256: 'f'.repeat(64), sha256: 'f'.repeat(64) }],
    loaderRecipe: { loaded: 1 }, node: 'v26.13.0', machine: {}, execArgv: [], nodeOptions: '',
    base: 'b'.repeat(40),
    selectedPolicy: {}, identityMethod: ledger.IDENTITY_METHOD });
  const build = (mutate) => {
    const l = ledger.buildLedger(chunk, times.slice(), identity(), { provenance: { standin: false } }, {});
    if (mutate) mutate(l);
    return l;
  };
  const problems = (l, options) => ledger.validateLedgerShape(l, chunk, options);

  await test('ledger: a conforming ledger of a planned chunk has no problem; indices and seeds follow it',
    () => {
      const l = build();
      assert.deepStrictEqual(problems(l), []);
      assert.strictEqual(l.requests[0].index, 25);
      assert.strictEqual(l.requests[0].seed, 7000 + 101 * 25);
      assert.strictEqual(l.requests[24].index, 49);
      assert.strictEqual(l.schema, 'ms18d-gp-request-ledger-v1');
      assert.deepStrictEqual(l.requests.map((r) => r.ms), times, 'raw times, not rounded');
    });

  const bad = [
    ['another schema', (l) => { l.schema = 'x'; }, /schema/],
    ['another chunk id', (l) => { l.chunk.chunkId = 'fakeb-easy.i0.n25'; }, /chunk\.chunkId/],
    ['another target', (l) => { l.chunk.target = 301; }, /chunk\.target/],
    ['a warm-up', (l) => { l.policy.warmup = 1; }, /policy/],
    ['jobs 2', (l) => { l.policy.jobs = 2; }, /policy/],
    ['a budget', (l) => { l.policy.budget = 1000; }, /policy/],
    ['two measure calls', (l) => { l.protocol.measureCalls = 2; }, /one measure call/],
    ['too few requests', (l) => { l.requests.pop(); }, /requests are 24/],
    ['a wrong index', (l) => { l.requests[3].index = 99; }, /request 3 has index/],
    ['a wrong seed', (l) => { l.requests[4].seed += 1; }, /seed/],
    ['a negative time', (l) => { l.requests[2].ms = -0.5; }, /finite non-negative/],
    ['a NaN time', (l) => { l.requests[2].ms = NaN; }, /finite non-negative/],
    ['a string time', (l) => { l.requests[2].ms = '5'; }, /finite non-negative/],
    ['an execArgv flag', (l) => { l.identity.execArgv = ['--inspect']; }, /execArgv/],
    ['NODE_OPTIONS', (l) => { l.identity.nodeOptions = '--max-old-space-size=1'; }, /NODE_OPTIONS/],
    ['an identity member missing', (l) => { delete l.identity.hashIdentity; },
      /identity\.hashIdentity is missing/],
    ['an upper-case digest', (l) => { l.identity.tableSha256 = 'D'.repeat(64); }, /lowercase hex/],
    ['no loaded files', (l) => { l.identity.loadedFiles = []; }, /loadedFiles/],
    ['no observation', (l) => { delete l.observation; }, /observation/],
    ['stand-in provenance', (l) => { l.observation.provenance.standin = true; }, /stand-in provenance/]
  ];
  for (const [name, mutate, pattern] of bad) {
    await test('ledger: ' + name + ' is a problem', () => {
      const p = problems(build(mutate));
      assert.ok(p.some((x) => pattern.test(x)), p.join(' | '));
    });
  }
  await test('ledger: a fixture marks stand-in provenance only where the caller allows it', () => {
    const l = build((x) => { x.observation.provenance.standin = true; });
    assert.deepStrictEqual(problems(l, { allowStandin: true }), []);
  });
  await test('ledger: the completion marker and the start line are exact', () => {
    const sha = 'a'.repeat(64);
    const marker = 'ms18d-gp-ledger-complete chunk=a.i0.n5 bytes=10 sha256=';
    assert.ok(ledger.MARKER.test(marker + sha));
    assert.ok(!ledger.MARKER.test(marker + sha.toUpperCase()));
    assert.ok(!ledger.MARKER.test(marker + sha + ' '));
    assert.ok(ledger.START.test('ms18d-gp-recorder-start chunk=a.i0.n5 i0=0 n=5 seedBase=7000'));
  });
}

async function loaderTests() {
  await test('loader: perf.js recipe: declared order, js/ui and js/worker omitted, absent files dropped',
    () => {
      fs.mkdirSync(at('ld'), { recursive: true });
      const g = standin.makeFakeProject(at('ld'));
      const cap = loader.captureAll(g);
      assert.deepStrictEqual(cap.engine.map((c) => c.rel), ['js/core/alpha.js', 'js/core/beta.js',
        'js/core/gamma.js']);
      assert.deepStrictEqual(cap.fixtures.map((c) => c.rel), ['tests/fixtures/perf-helper.js',
        'tests/fixtures/tool-records.js', 'tests/fixtures/regression.js']);
      assert.deepStrictEqual(cap.recipe, { declared: 6, excluded: 2, missing: 1, engine: 3, fixtures: 3,
        loaded: 6 });
      assert.strictEqual(cap.perfJs.rel, 'tests/perf.js');
      assert.ok(cap.loaded.indexOf(cap.perfJs) === -1, 'perf.js is captured for E only, never loaded');
      const no = standin.makeFakeProject(at('ld2'), { noRegression: true });
      assert.strictEqual(loader.captureAll(no).recipe.loaded, 5);
    });

  await test('loader: the executed digest is that of the string the VM gets (no BOM); raw digest kept',
    () => {
      fs.mkdirSync(at('ld3'), { recursive: true });
      const g = standin.makeFakeProject(at('ld3'), { bom: true });
      const cap = loader.captureAll(g);
      const reg = cap.fixtures[2];
      const raw = fs.readFileSync(path.join(g, 'tests/fixtures/regression.js'));
      assert.strictEqual(reg.rawSha256, sha256(raw));
      assert.strictEqual(reg.execSha256, sha256(Buffer.from(reg.text, 'utf8')));
      assert.notStrictEqual(reg.rawSha256, reg.execSha256, 'a BOM is the one difference');
      assert.ok(!reg.text.startsWith('\uFEFF'));
      const m = loader.loadedManifest(cap);
      assert.strictEqual(m.length, 6);
      assert.strictEqual(m[5].sha256, reg.execSha256);
      assert.strictEqual(m[5].rawSha256, reg.rawSha256);
    });

  await test('loader: E identities are derived from the captured texts (LF-normalized, raw sources)',
    () => {
      const a = at('ld4a');
      const b = at('ld4b');
      fs.mkdirSync(a, { recursive: true });
      fs.mkdirSync(b, { recursive: true });
      const ga = standin.makeFakeProject(a);
      const gb = standin.makeFakeProject(b);
      const ia = loader.identitiesOf(loader.captureAll(ga));
      assert.deepStrictEqual(loader.identitiesOf(loader.captureAll(gb)), ia, 'same bytes, same identity');
      fs.writeFileSync(path.join(gb, 'js/core/beta.js'), "SG.order.push('beta');\r\n");
      const ib = loader.identitiesOf(loader.captureAll(gb));
      assert.strictEqual(ib.hashIdentity, ia.hashIdentity, 'a CRLF copy keeps E (LF-normalized)');
      assert.notStrictEqual(ib.sources, ia.sources, 'but not the raw-byte sources hash');
      const mA = loader.loadedManifest(loader.captureAll(ga));
      const mB = loader.loadedManifest(loader.captureAll(gb));
      assert.notStrictEqual(mA[1].sha256, mB[1].sha256, 'nor the executed digest: normalization is no proof');
      fs.writeFileSync(path.join(gb, 'js/core/beta.js'), "SG.order.push('beta2');\n");
      assert.notStrictEqual(loader.identitiesOf(loader.captureAll(gb)).hashIdentity, ia.hashIdentity);
      fs.writeFileSync(path.join(gb, 'js/core/beta.js'), "SG.order.push('beta');\n");
      fs.writeFileSync(path.join(gb, 'tests/perf.js'), "throw new Error('changed');\n// x\n");
      assert.notStrictEqual(loader.identitiesOf(loader.captureAll(gb)).hashIdentity, ia.hashIdentity,
        'perf.js is part of E');
    });

  await test('loader: a file changed on disk after the capture does not change what the VM runs', () => {
    fs.mkdirSync(at('ld5'), { recursive: true });
    const g = standin.makeFakeProject(at('ld5'));
    const script = "const loader=require(" + JSON.stringify(path.join(__dirname, 'loader.js')) + ");" +
      "const fs=require('fs');const path=require('path');const g=" + JSON.stringify(g) + ";" +
      "const cap=loader.captureAll(g);const before=loader.loadedManifest(cap);" +
      "fs.writeFileSync(path.join(g,'js/core/beta.js'),\"SG.order.push('CHANGED');\\n\");" +
      "const ran=loader.execute(cap);const jb=JSON.stringify(before);" +
      "console.log(JSON.stringify({order:ran.order,same:jb===JSON.stringify(loader.loadedManifest(cap))," +
      "now:loader.loadedManifest(loader.captureAll(g))[1].sha256!==before[1].sha256}));";
    const run = childProcess.spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
    assert.strictEqual(run.status, 0, run.stderr);
    const out = JSON.parse(run.stdout);
    assert.deepStrictEqual(out.order, ['alpha', 'beta', 'gamma', 'regression'], 'the captured string ran');
    assert.strictEqual(out.same, true);
    assert.strictEqual(out.now, true, 'a fresh capture sees the change');
  });

  await test('loader (the real tree, captured, NOT executed): 64 declared, 18 excluded, 49 loaded, E', () => {
    const cap = loader.captureAll(path.join(REPO, 'generator'));
    assert.deepStrictEqual(cap.recipe, { declared: 64, excluded: 18, missing: 0, engine: 46, fixtures: 3,
      loaded: 49 });
    assert.strictEqual(cap.fixtures[2].rel, 'tests/fixtures/regression.js');
    const ids = loader.identitiesOf(cap);
    assert.strictEqual(ids.hashIdentity, '344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1');
    assert.strictEqual(ids.sources, '75b0955e3e356bd1');
    const gp = require(path.join(REPO, 'generator', 'tests', 'artifacts', 'difficulty-v3', 'MS18d',
      'project-gp.js'));
    const frozen = gp.computeIdentities(path.join(REPO, 'generator'));
    assert.strictEqual(ids.hashIdentity, frozen.hashIdentity, 'the same recipe as the frozen Phase A helper');
    assert.strictEqual(ids.sources, frozen.sources);
  });
}

async function attemptTests() {
  const base = at('att');
  const gpDir = path.join(base, 'cell');
  const CHUNK = 'cell-x.i0.n50';
  const run = (name, files) => {
    const dir = path.join(gpDir, name);
    fs.mkdirSync(dir, { recursive: true });
    Object.keys(files).forEach((f) => {
      fs.writeFileSync(path.join(dir, f), typeof files[f] === 'string' ? files[f] : JSON.stringify(files[f]));
    });
    return dir;
  };
  const request = (id) => ({ chunk: { chunkId: id || CHUNK } });
  const heldRun = (name, extra) => run(name, { 'request.json': request(),
    'wrapper.json': { chunkId: CHUNK, outcome: 'control-hold' },
    'admission.json': { decision: 'hold' }, 'result.json': Object.assign({ outcome: 'control-hold',
      payloadStarted: false }, extra || {}) });
  const startedRun = (name, outcome) => run(name, { 'request.json': request(),
    'wrapper.json': { chunkId: CHUNK, outcome }, 'admission.json': { decision: 'proceed' },
    'result.json': { outcome, payloadStarted: true }, 'transcript.txt': '$ node x\n',
    'pids.jsonl': '{"role":"tee"}\n' });
  const input = (over) => Object.assign({ baseDir: gpDir, chunkId: CHUNK, runId: 'now',
    ledgerFile: at('att', 'c.jsonl'), nowMs: 10000000 }, over || {});
  const clearRuns = () => {
    for (const name of fs.readdirSync(gpDir)) {
      fs.rmSync(path.join(gpDir, name), { recursive: true, force: true });
    }
  };
  const ledgerRow = (name, extra) => JSON.stringify(Object.assign({ runDir: 'x/cell/' + name,
    chunkId: CHUNK, releaseObservedAt: new Date(1000000).toISOString(), controllerOutcome: 'control-hold' },
  extra || {})) + '\r\n';

  await test('R4: a chunk with no earlier run has no admission and no payload: allowed', () => {
    fs.mkdirSync(gpDir, { recursive: true });
    const a = chunkAttempts(input());
    assert.strictEqual(a.decision, 'allow');
    assert.strictEqual(a.admissions, 0);
    assert.strictEqual(a.payloads, 0);
  });

  await test('R4: a started payload is final: no retry and no replacement, whatever its outcome', () => {
    startedRun('cell-x.i0.n50.a1', 'stop');
    fs.writeFileSync(at('att', 'c.jsonl'), ledgerRow('cell-x.i0.n50.a1', { controllerOutcome: 'stop' }));
    const a = chunkAttempts(input());
    assert.strictEqual(a.decision, 'refuse');
    assert.strictEqual(a.payloads, 1);
    assert.ok(a.reasons.some((r) => /payload-already-started/.test(r)));
    for (const outcome of ['success', 'miss', 'stop']) {
      fs.rmSync(path.join(gpDir, 'cell-x.i0.n50.a1'), { recursive: true, force: true });
      startedRun('cell-x.i0.n50.a1', outcome);
      fs.writeFileSync(at('att', 'c.jsonl'), ledgerRow('cell-x.i0.n50.a1', { controllerOutcome: outcome }));
      assert.strictEqual(chunkAttempts(input()).decision, 'refuse', outcome);
    }
  });

  await test('R4: a plain hold is not an eligible unstarted hold: one admission used, no second one', () => {
    fs.rmSync(path.join(gpDir, 'cell-x.i0.n50.a1'), { recursive: true, force: true });
    heldRun('cell-x.i0.n50.a1');
    run('cell-x.i0.n50.a1/x', {}); // a nested directory is ignored by the accounting
    fs.writeFileSync(at('att', 'c.jsonl'), ledgerRow('cell-x.i0.n50.a1'));
    const a = chunkAttempts(input());
    assert.strictEqual(a.payloads, 0);
    assert.strictEqual(a.decision, 'refuse');
    assert.ok(a.reasons.some((r) => /not an eligible unstarted hold/.test(r)), a.reasons.join());
  });

  await test('R4: an eligible unstarted hold allows ONE re-ask, only at least 60 s after its release', () => {
    fs.rmSync(path.join(gpDir, 'cell-x.i0.n50.a1'), { recursive: true, force: true });
    heldRun('cell-x.i0.n50.a1', { eligibleReAsk: true });
    fs.writeFileSync(at('att', 'c.jsonl'), ledgerRow('cell-x.i0.n50.a1'));
    const early = chunkAttempts(input({ nowMs: 1000000 + 59999 }));
    assert.strictEqual(early.decision, 'refuse');
    assert.ok(early.reasons.some((r) => /60 s/.test(r)));
    const late = chunkAttempts(input({ nowMs: 1000000 + 1000 + 60000 }));
    assert.strictEqual(late.decision, 'allow', late.reasons.join());
    assert.strictEqual(late.admissions, 1);
    heldRun('cell-x.i0.n50.a2', { eligibleReAsk: true });
    fs.appendFileSync(at('att', 'c.jsonl'), ledgerRow('cell-x.i0.n50.a2'));
    const third = chunkAttempts(input({ runId: 'third', nowMs: 99999999 }));
    assert.strictEqual(third.decision, 'refuse');
    assert.ok(third.reasons.some((r) => /at most two/.test(r)));
  });

  await test('R4: counts survive a restart: they are derived from the folders and the log each time', () => {
    const first = chunkAttempts(input({ nowMs: 99999999 }));
    const second = chunkAttempts(input({ nowMs: 99999999 }));
    assert.deepStrictEqual(first, second);
    assert.strictEqual(first.admissions, 2, 'two eligible holds were admitted and released');
    assert.ok(!fs.readdirSync(base).some((n) => /counter|state/i.test(n)), 'no mutable counter file');
  });

  await test('R4: conflicting or missing evidence holds for a ruling instead of defaulting to zero', () => {
    clearRuns();
    fs.writeFileSync(at('att', 'c.jsonl'), ledgerRow('cell-x.i0.n50.a1'));
    let a = chunkAttempts(input());
    assert.strictEqual(a.decision, 'refuse');
    assert.ok(a.problems.some((p) => /folder is gone/.test(p)));
    // a folder that finished without a log line
    fs.writeFileSync(at('att', 'c.jsonl'), '');
    heldRun('cell-x.i0.n50.a1');
    a = chunkAttempts(input());
    assert.ok(a.problems.some((p) => /without a C lock log line/.test(p)));
    // a result that says unstarted next to a transcript
    run('cell-x.i0.n50.a2', { 'request.json': request(), 'wrapper.json': { chunkId: CHUNK },
      'result.json': { outcome: 'control-hold', payloadStarted: false }, 'transcript.txt': 'x' });
    a = chunkAttempts(input());
    assert.ok(a.problems.some((p) => /records show one/.test(p)));
    // an unparsable record
    run('cell-x.i0.n50.a3', { 'result.json': '{not json' });
    a = chunkAttempts(input());
    assert.ok(a.problems.some((p) => /result\.json/.test(p)));
    assert.strictEqual(a.decision, 'refuse');
  });

  await test('R4: an admitted run without a result counts as a started payload (uncertain: consumed)', () => {
    clearRuns();
    fs.writeFileSync(at('att', 'c.jsonl'), '');
    run('cell-x.i0.n50.a1', { 'request.json': request(), 'admission.json': { decision: 'proceed' } });
    const a = chunkAttempts(input());
    assert.strictEqual(a.payloads, 1);
    assert.strictEqual(a.decision, 'refuse');
  });

  await test('R4: other chunks and merge runs never count against this chunk', () => {
    clearRuns();
    run('other.i0.n25.a1', { 'request.json': request('other.i0.n25'),
      'admission.json': { decision: 'proceed' },
      'result.json': { outcome: 'success', payloadStarted: true }, 'transcript.txt': 'x' });
    run('merge.m1', { 'request.json': { scope: 'cell:cell/x' }, 'result.json': { outcome: 'success',
      payloadStarted: true }, 'transcript.txt': 'x' });
    fs.writeFileSync(at('att', 'c.jsonl'), '');
    const a = chunkAttempts(input());
    assert.strictEqual(a.admissions, 0);
    assert.strictEqual(a.decision, 'allow', a.reasons.join());
  });
}

async function main() {
  await planTests();
  await ledgerTests();
  await loaderTests();
  await attemptTests();
}

main().then(() => {
  console.log(passed + ' passed, ' + failed.length + ' failed');
  if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
  process.exitCode = failed.length === 0 ? 0 : 1;
}, (err) => {
  console.log('ERROR ' + (err && err.stack));
  process.exitCode = 1;
}).then(() => fs.rmSync(scratch, { recursive: true, force: true }));
