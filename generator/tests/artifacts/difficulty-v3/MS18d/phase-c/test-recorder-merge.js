'use strict';

/*
 * MS18d Phase C0b task-owned tests, FAKE-DATA, of the raw-time recorder (record-gp.js), the check-only
 * merger (merge-gp.js, merge-core.js) and the typed G3 classifiers of the two payloads (payload-gp.js). The
 * recorder runs as a real child process over a FAKE project (standin-gp.js): fake sources, a fake `measure`
 * that logs its calls and returns invented times; no generator, no pipeline, no real measurement. The merger
 * runs over synthetic run folders written by standin-gp.js (receipts included) and, in-process, over a
 * stubbed Git for the R3 ancestry cases. Every number is invented here.
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-c/test-recorder-merge.js
 */
const assert = require('assert');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const plan = require('./plan-data.js');
const ledgerSchema = require('./ledger-schema.js');
const core = require('./merge-core.js');
const mergeGp = require('./merge-gp.js');
const payloadGp = require('./payload-gp.js');
const proofTool = require('./test-epoch4-proof.js');
const standin = require('./standin-gp.js');
const { sha256 } = require('./common.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const RECORDER = path.join(__dirname, 'record-gp.js');
const MERGER = path.join(__dirname, 'merge-gp.js');
const scratch = fs.mkdtempSync(path.join(REPO, '.scratch-ms18d-c-rm-'));

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

let seq = 0;
/** A fake repository: fake project, helper manifest, reduced plan manifest. */
function newWorld(options) {
  const o = options || {};
  const repo = path.join(scratch, 'w' + (++seq));
  fs.mkdirSync(repo, { recursive: true });
  const g = standin.makeFakeProject(repo, o.project);
  const helper = standin.makeHelperManifest(repo);
  const made = standin.makeFakeManifest(repo, { cellMergeSlots: o.cellMergeSlots, rows: o.rows });
  // the committed host-binding journal the synthetic readiness records were made against
  const journalWorld = require('./standin-readiness.js').journalWorld({});
  return { repo, g, helper, made, doc: made.doc, callsLog: path.join(repo, 'calls.log'), journalWorld };
}

const slotOf = (w, chunkId, attempt) => w.doc.runSlots.filter((s) => s.role === 'chunk' &&
  s.chunkId === chunkId && s.attempt === (attempt || 1))[0];
const chunkOf = (w, chunkId) => w.doc.chunks.filter((c) => c.chunkId === chunkId)[0];

function recorderRequestFiles(w, slot, over) {
  const dir = path.join(w.repo, slot.dir);
  fs.mkdirSync(dir, { recursive: true });
  const json = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2));
  json('request.json', Object.assign({ schema: 'ms18d-c-request-1', runId: slot.runId, standin: true,
    profile: 'gp-recorder', allowExit1: false, runDir: dir, repo: w.repo,
    plan: { file: w.made.planRel, rawSha256: w.made.rawSha256, manifestSha256: w.doc.manifestSha256 },
    chunk: chunkOf(w, slot.chunkId), attempt: slot.attempt,
    helpers: { manifestFile: w.helper.file, manifestSha256: w.helper.sha256, required: w.helper.required,
      repoRoot: w.repo },
    expected: { base: standin.BASE } }, over && over.request));
  json('acquisition.json', { decision: 'proceed' });
  json('binding.json', Object.assign({ ok: true, head: { actual: standin.HEAD } }, over && over.binding));
  json('admission.json', { decision: 'proceed' });
  return dir;
}

function recorderArgs(w, slot, dir, o) {
  return (o.nodeFlags || []).concat([RECORDER, '--plan=' + w.made.planRel, '--chunk=' + slot.chunkId,
    '--out=' + path.join(dir, 'ledger.json')], o.noStandinRoot ? [] : ['--standin-root=' + w.g],
  o.extraArgs || []);
}

function recorderEnv(w, o) {
  const env = Object.assign({}, process.env, { FAKE_MEASURE_LOG: w.callsLog }, o.env || {});
  if (!o.env || o.env.NODE_OPTIONS === undefined) delete env.NODE_OPTIONS;
  return env;
}

function record(w, chunkId, o) {
  const opts = o || {};
  const slot = slotOf(w, chunkId, opts.attempt);
  const dir = opts.skipRequest ? path.join(w.repo, slot.dir) : recorderRequestFiles(w, slot, opts);
  fs.mkdirSync(dir, { recursive: true });
  const r = spawnSync(process.execPath, recorderArgs(w, slot, dir, opts), { encoding: 'utf8', cwd: w.g,
    env: recorderEnv(w, opts) });
  return { status: r.status, signal: r.signal, stdout: r.stdout, stderr: r.stderr, dir, slot,
    ledgerFile: path.join(dir, 'ledger.json') };
}

const callsOf = (w) => (fs.existsSync(w.callsLog)
  ? fs.readFileSync(w.callsLog, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const linesOf = (text) => String(text).split(/\r?\n/).filter((l) => l.trim() !== '');

async function recorderTests() {
  await test('recorder: one planned chunk: two stdout lines, a new ledger of the raw times, ONE call', () => {
    const w = newWorld();
    const r = record(w, 'fakeb-easy.i25.n25');
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(r.stderr, '', 'stderr stays empty');
    const lines = linesOf(r.stdout);
    assert.strictEqual(lines.length, 2);
    assert.ok(ledgerSchema.START.test(lines[0]), lines[0]);
    const m = ledgerSchema.MARKER.exec(lines[1]);
    assert.ok(m, lines[1]);
    const bytes = fs.readFileSync(r.ledgerFile);
    assert.strictEqual(Number(m[2]), bytes.length);
    assert.strictEqual(m[3], sha256(bytes));
    const ledger = JSON.parse(bytes.toString('utf8'));
    assert.deepStrictEqual(ledgerSchema.validateLedgerShape(ledger, chunkOf(w, 'fakeb-easy.i25.n25'),
      { allowStandin: true }), []);
    const calls = callsOf(w);
    assert.strictEqual(calls.length, 1, 'exactly one measure call');
    assert.deepStrictEqual([calls[0].variant, calls[0].level, calls[0].runs, calls[0].options, calls[0].argc],
      ['fakeb', 'easy', 25, { seedBase: 7000 + 101 * 25 }, 4]);
    assert.deepStrictEqual(calls[0].order, ['alpha', 'beta', 'gamma', 'regression'],
      'the loader order; no UI, worker or perf.js code ran');
    const seedBase = 7000 + 101 * 25;
    ledger.requests.forEach((q, j) => {
      assert.strictEqual(q.index, 25 + j);
      assert.strictEqual(q.seed, 7000 + 101 * (25 + j));
      assert.strictEqual(q.ms, 10 + ((seedBase + j * 101) % 37) + (j % 7) / 8, 'raw, unrounded');
    });
    assert.deepStrictEqual(ledger.identity.execArgv, []);
    assert.strictEqual(ledger.identity.nodeOptions, '');
    assert.strictEqual(ledger.identity.base, standin.BASE);
    assert.strictEqual(ledger.identity.hashIdentity, w.doc.sources.hashIdentity);
    assert.strictEqual(ledger.observation.provenance.standin, true);
    assert.strictEqual(ledger.observation.head, standin.HEAD);
    assert.strictEqual(ledger.protocol.measureCalls, 1);
    const text = bytes.toString('utf8');
    assert.ok(/\r\n/.test(text) && !/[^\r]\n/.test(text), 'CRLF only');
    ['request', 'acquisition', 'binding', 'admission'].forEach((n) => {
      assert.strictEqual(ledger.observation.transport[n].sha256,
        sha256(fs.readFileSync(path.join(r.dir, n + '.json'))), n);
    });
  });

  await test('recorder: a one-chunk cell uses the same schema (k = 1)', () => {
    const w = newWorld();
    const r = record(w, 'fakea-easy.i0.n50');
    assert.strictEqual(r.status, 0, r.stderr);
    const ledger = JSON.parse(fs.readFileSync(r.ledgerFile, 'utf8'));
    assert.strictEqual(ledger.requests.length, 50);
    assert.strictEqual(ledger.schema, 'ms18d-gp-request-ledger-v1');
    assert.deepStrictEqual(callsOf(w)[0].options, { seedBase: 7000 });
  });

  await test('recorder: the ledger is created exclusively: never overwritten, nothing measured again', () => {
    const w = newWorld();
    const first = record(w, 'fakea-easy.i0.n50');
    assert.strictEqual(first.status, 0);
    const before = sha256(fs.readFileSync(first.ledgerFile));
    const second = record(w, 'fakea-easy.i0.n50', { skipRequest: true });
    assert.strictEqual(second.status, 2);
    assert.ok(/never overwritten/.test(second.stderr));
    assert.strictEqual(sha256(fs.readFileSync(first.ledgerFile)), before);
    assert.strictEqual(callsOf(w).length, 1);
    assert.strictEqual(linesOf(second.stdout).length, 0, 'no start line, no marker');
  });

  const wrongChunk = (w) => ({ request: { chunk: Object.assign({}, chunkOf(w, 'fakea-easy.i0.n50'),
    { target: 101 }) } });
  const otherPlan = () => ({ request: { plan: { file: standin.PLAN_REL, rawSha256: 'a'.repeat(64),
    manifestSha256: 'b'.repeat(64) } } });
  const refusals = [
    ['NODE_OPTIONS set (never silently cleared)', () => ({ env: { NODE_OPTIONS: '--no-warnings' } }),
      /NODE_OPTIONS/],
    ['a Node flag (process.execArgv not empty)', () => ({ nodeFlags: ['--no-warnings'] }), /execArgv/],
    ['a stand-in request without the stand-in root', () => ({ noStandinRoot: true }),
      /disagree on a stand-in/],
    ['an unknown argument', () => ({ extraArgs: ['--warmup=3'] }), /unknown or repeated/],
    ['a request that is not a recorder request', () => ({ request: { profile: 'gp-cell' } }),
      /not a gp-recorder/],
    ['a request naming another plan digest', otherPlan, /plan is not the one/],
    ['a chunk that differs from the plan entry', wrongChunk, /differs from the plan entry/],
    ['an attempt that does not match the slot', () => ({ request: { attempt: 2 } }), /declared slot/],
    ['a binding that is not ok', () => ({ binding: { ok: false } }), /did not prove the binding/]
  ];
  for (const [name, build, pattern] of refusals) {
    await test('recorder: refuses before the measured call (exit 2): ' + name, () => {
      const w = newWorld();
      const r = record(w, 'fakea-easy.i0.n50', build(w));
      assert.strictEqual(r.status, 2, r.stdout + r.stderr);
      assert.ok(pattern.test(r.stderr), r.stderr);
      assert.strictEqual(callsOf(w).length, 0, 'nothing was measured');
      assert.ok(!fs.existsSync(r.ledgerFile), 'no ledger');
      assert.strictEqual(linesOf(r.stdout).length, 0);
    });
  }

  await test('recorder: a source or tool changed since the plan is refused (E, loaded-file list)', () => {
    const edits = [
      ['an engine file', 'js/core/beta.js', "SG.order.push('beta2');\n", /E hash identity/],
      ['perf-helper.js', 'tests/fixtures/perf-helper.js', '// changed\n', /E hash identity/],
      ['perf.js (part of E, never run)', 'tests/perf.js', "throw new Error('x');\n// y\n",
        /E hash identity/],
      ['regression.js (loaded, not in E: bound separately)', 'tests/fixtures/regression.js',
        "SG.order.push('regression2');\n", /loaded-file manifest differs/],
      ['the source list', 'tests/node-runner.js',
        "const SOURCE_FILES = [\n'js/core/alpha.js',\n'js/core/beta.js'\n];\n",
        /loaded-file manifest differs|sources hash|E hash/]
    ];
    for (const [name, rel, text, pattern] of edits) {
      const w = newWorld();
      fs.writeFileSync(path.join(w.g, rel), text);
      const r = record(w, 'fakea-easy.i0.n50');
      assert.strictEqual(r.status, 2, name + ': ' + r.stdout + r.stderr);
      assert.ok(pattern.test(r.stderr), name + ': ' + r.stderr);
      assert.strictEqual(callsOf(w).length, 0, name);
    }
  });

  await test('recorder: CRLF re-saving a source keeps E but the executed-digest list catches it', () => {
    const w = newWorld();
    fs.writeFileSync(path.join(w.g, 'js/core/beta.js'), "SG.order.push('beta');\r\n");
    const r = record(w, 'fakea-easy.i0.n50');
    assert.strictEqual(r.status, 2);
    assert.ok(/sources hash|loaded-file manifest/.test(r.stderr), r.stderr);
  });

  await test('recorder: an executed target unlike the plan, or a chunk outside its slot, is refused', () => {
    const w = newWorld({ project: { targetA: 101 } });
    const r = record(w, 'fakea-easy.i0.n50');
    assert.strictEqual(r.status, 2, r.stderr);
    assert.ok(/loaded target of fakea\/easy is not 100/.test(r.stderr), r.stderr);
    assert.strictEqual(callsOf(w).length, 0);
    const w2 = newWorld();
    const slot = slotOf(w2, 'fakea-easy.i0.n50');
    const wrong = Object.assign({}, slot, { dir: slot.dir.replace(/\.a1$/, '.zz') });
    const dir = recorderRequestFiles(w2, wrong);
    const run = spawnSync(process.execPath, recorderArgs(w2, slot, dir, {}), { encoding: 'utf8', cwd: w2.g,
      env: recorderEnv(w2, {}) });
    assert.strictEqual(run.status, 2);
    assert.ok(/not the declared slot/.test(run.stderr), run.stderr);
  });

  await test('recorder: another Node or machine than the plan, or a changed helper, is refused', () => {
    const rewrite = (w, edit) => {
      const doc = JSON.parse(JSON.stringify(w.doc));
      edit(doc);
      delete doc.manifestSha256;
      doc.manifestSha256 = plan.canonicalSha256(doc);
      const { manifestText } = require('./make-chunk-manifest.js');
      fs.writeFileSync(w.made.planFile, manifestText(doc));
      w.made.doc = doc;
      w.doc = doc;
      w.made.rawSha256 = sha256(fs.readFileSync(w.made.planFile));
    };
    const w = newWorld();
    rewrite(w, (d) => { d.environment.node = 'v1.0.0'; });
    let r = record(w, 'fakea-easy.i0.n50');
    assert.strictEqual(r.status, 2);
    assert.ok(/Node is/.test(r.stderr), r.stderr);
    const w2 = newWorld();
    rewrite(w2, (d) => { d.environment.machine.cpu = 'Other CPU'; });
    r = record(w2, 'fakea-easy.i0.n50');
    assert.ok(/machine differs/.test(r.stderr), r.stderr);
    const w3 = newWorld();
    fs.writeFileSync(path.join(w3.repo, 'helper-a.txt'), 'changed\n');
    r = record(w3, 'fakea-easy.i0.n50');
    assert.strictEqual(r.status, 2);
    assert.ok(/helpers: helper bytes differ/.test(r.stderr), r.stderr);
  });

  const failures = [
    ['the measured call throws', 'throw', 3, /measured call failed/],
    ['too few times are returned', 'short', 3, /did not return 25 finite non-negative times/],
    ['a NaN time is returned', 'nan', 3, /finite non-negative/],
    ['a negative time is returned', 'negative', 3, /finite non-negative/]
  ];
  for (const [name, mode, code, pattern] of failures) {
    await test('recorder: ' + name + ': exit ' + code + ', no ledger, no completion marker', () => {
      const w = newWorld();
      const r = record(w, 'fakeb-easy.i0.n25', { env: { FAKE_MEASURE_MODE: mode } });
      assert.strictEqual(r.status, code, r.stderr);
      assert.ok(pattern.test(r.stderr), r.stderr);
      assert.ok(!fs.existsSync(r.ledgerFile));
      assert.deepStrictEqual(linesOf(r.stdout).map((l) => l.split(' ')[0]), ['ms18d-gp-recorder-start']);
      assert.strictEqual(callsOf(w).length, 1, 'still exactly one call: no retry');
    });
  }

  await test('recorder: a ledger that cannot be created is exit 4, no marker, the other file intact', () => {
    const w = newWorld();
    const slot = slotOf(w, 'fakea-easy.i0.n50');
    const target = path.join(w.repo, slot.dir, 'ledger.json');
    const r = record(w, 'fakea-easy.i0.n50', { env: { FAKE_MEASURE_BLOCK_OUT: target } });
    assert.strictEqual(r.status, 4, r.stderr);
    assert.ok(/not written completely/.test(r.stderr));
    assert.strictEqual(fs.readFileSync(target, 'utf8'), 'taken', 'the existing file was not overwritten');
    assert.strictEqual(linesOf(r.stdout).some((l) => /ledger-complete/.test(l)), false);
  });

  await test('recorder: an unexpected error (the plan path is a directory) is exit 5, never 0 or 1', () => {
    const w = newWorld();
    const slot = slotOf(w, 'fakea-easy.i0.n50');
    const dir = recorderRequestFiles(w, slot);
    const args = [RECORDER, '--plan=docs', '--chunk=' + slot.chunkId,
      '--out=' + path.join(dir, 'ledger.json'), '--standin-root=' + w.g];
    const r = spawnSync(process.execPath, args, { encoding: 'utf8', cwd: w.g, env: recorderEnv(w, {}) });
    assert.strictEqual(r.status, 5, r.stderr);
    assert.ok(/unexpected/.test(r.stderr));
  });

  await test('recorder: killed mid-call: no ledger, no marker, no success', async () => {
    const w = newWorld();
    const slot = slotOf(w, 'fakea-easy.i0.n50');
    const dir = recorderRequestFiles(w, slot);
    const child = spawn(process.execPath, recorderArgs(w, slot, dir, {}), { cwd: w.g,
      env: recorderEnv(w, { env: { FAKE_MEASURE_MODE: 'hang' } }), stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    const done = new Promise((resolve) => child.on('close', (code, signal) => resolve({ code, signal })));
    const end = Date.now() + 15000;
    while (callsOf(w).length === 0 && Date.now() < end) await new Promise((r) => setTimeout(r, 40));
    assert.strictEqual(callsOf(w).length, 1, 'the measured call started');
    child.kill('SIGKILL');
    const result = await done;
    assert.ok(result.code !== 0, 'a killed process is not a success');
    assert.ok(!fs.existsSync(path.join(dir, 'ledger.json')), 'no ledger was written');
    assert.ok(!/ledger-complete/.test(out), 'no completion marker');
    assert.ok(/recorder-start/.test(out), 'the start line was out before the kill');
  });
}

// ---------------------------------------------------------------------------------------------------------
// the merger
// ---------------------------------------------------------------------------------------------------------

function mergeRequestFile(w, scope, over) {
  const doc = w.doc;
  const slot = scope === 'all-79' ? doc.runSlots.filter((s) => s.role === 'final-merge')[0]
    : doc.runSlots.filter((s) => s.role === 'cell-merge' && 'cell:' + s.cell === scope)[0];
  const dir = path.join(w.repo, slot.dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'request.json'), JSON.stringify(Object.assign({
    schema: 'ms18d-c-request-1', runId: slot.runId, standin: true, profile: 'gp-merge', allowExit1: true,
    runDir: dir, repo: w.repo,
    plan: { file: w.made.planRel, rawSha256: w.made.rawSha256, manifestSha256: doc.manifestSha256 }, scope,
    gate: doc.gate, helpers: { manifestFile: w.helper.file, manifestSha256: w.helper.sha256,
      required: w.helper.required, repoRoot: w.repo }, expected: { base: standin.BASE },
    bindingJournalText: w.journalWorld.committed[require('./journals.js').BINDINGS_REL] }, over || {}),
  null, 2));
  return { dir, slot };
}

/** A campaign: one complete run folder per planned chunk (attempt 1). `o.times(chunk)` gives the times. */
function writeCampaign(w, o) {
  const opts = o || {};
  w.doc.chunks.forEach((chunk) => {
    const slot = slotOf(w, chunk.chunkId, 1);
    const custom = opts.chunk && opts.chunk[chunk.chunkId];
    if (custom && custom.skip) return;
    standin.writeRunFolder(w.repo, w.made, slot, Object.assign({ helper: w.helper,
      times: opts.times ? opts.times(chunk) : undefined, head: opts.head, base: opts.base }, custom));
  });
}

function runMerge(w, scope, o) {
  const opts = o || {};
  const { dir } = mergeRequestFile(w, scope, opts.request);
  const args = [MERGER, '--plan=' + w.made.planRel, '--scope=' + scope,
    '--out=' + path.join(dir, 'report.json')];
  const env = Object.assign({}, process.env, opts.env || {});
  if (!opts.env || opts.env.NODE_OPTIONS === undefined) delete env.NODE_OPTIONS;
  const r = spawnSync(process.execPath, (opts.nodeFlags || []).concat(args), { encoding: 'utf8', cwd: w.g,
    env });
  const lines = linesOf(r.stdout);
  const reportFile = path.join(dir, 'report.json');
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, lines, last: lines[lines.length - 1],
    report: fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : null, dir,
    hasResultLine: lines.some((l) => /^ms18d-gp-merge-result /.test(l)) };
}

const lowTimes = (chunk) => standin.timesFor(chunk, 50, 0);
const seq50 = (length, from) => Array.from({ length }, (_, i) => from + i);
const RESULT_ALL = 'ms18d-gp-merge-result scope=all-79 complete=true meets=';

async function mergerTests() {
  await test('merge R1: a complete pass: exit 0, the last line is the result line, stderr empty', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes });
    const r = runMerge(w, 'all-79');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.strictEqual(r.stderr, '');
    assert.strictEqual(r.last, RESULT_ALL + 'true successes=2 cells=2 required=2');
    assert.strictEqual(r.report.complete, true);
    assert.strictEqual(r.report.resultLine, r.last);
    assert.strictEqual(r.report.consumed.length, 3);
    assert.ok(r.report.consumed.every((x) => /^[0-9a-f]{64}$/.test(x.ledgerSha256) &&
      x.head === standin.BASE));
    assert.strictEqual(r.report.extraColdStarts, 1);
    assert.ok(r.lines.some((l) => /^cell fakeb\/easy chunks=2 /.test(l)));
  });

  await test('merge R1: a complete gate failure is exit 1 with the result line, meets=false', () => {
    const w = newWorld();
    writeCampaign(w, { times: (c) => (c.cell === 'fakea/easy' ? lowTimes(c).map(() => 200) : lowTimes(c)) });
    const r = runMerge(w, 'all-79');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.strictEqual(r.stderr, '');
    assert.strictEqual(r.last, RESULT_ALL + 'false successes=1 cells=2 required=2');
    assert.strictEqual(r.report.meets, false);
    assert.strictEqual(r.report.cells.filter((c) => c.stats.meets).length, 1);
  });

  await test('merge: a selected cell (declared optional slot): pass exit 0, MISS exit 1 with p95', () => {
    const w = newWorld({ cellMergeSlots: true });
    writeCampaign(w, { times: lowTimes });
    let r = runMerge(w, 'cell:fakea/easy');
    assert.strictEqual(r.status, 0, r.stdout);
    assert.ok(/^ms18d-gp-merge-result scope=cell:fakea\/easy complete=true meets=true p95=\S+ target=100$/
      .test(r.last), r.last);
    const w2 = newWorld({ cellMergeSlots: true });
    writeCampaign(w2, { times: (c) => lowTimes(c).map(() => 150) });
    r = runMerge(w2, 'cell:fakea/easy');
    assert.strictEqual(r.status, 1, r.stdout);
    assert.strictEqual(r.last,
      'ms18d-gp-merge-result scope=cell:fakea/easy complete=true meets=false p95=150 target=100');
  });

  await test('merge: no selected-cell merge without a declared slot (the real plan declares none)', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes });
    const slot = w.doc.runSlots.filter((s) => s.role === 'final-merge')[0];
    const dir = path.join(w.repo, slot.dir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'request.json'), JSON.stringify({ schema: 'ms18d-c-request-1',
      profile: 'gp-merge', standin: true, repo: w.repo, scope: 'cell:fakea/easy',
      plan: { file: w.made.planRel, rawSha256: w.made.rawSha256, manifestSha256: w.doc.manifestSha256 },
      helpers: { manifestFile: w.helper.file, manifestSha256: w.helper.sha256, repoRoot: w.repo },
      expected: { base: standin.BASE } }));
    const r = spawnSync(process.execPath, [MERGER, '--plan=' + w.made.planRel, '--scope=cell:fakea/easy',
      '--out=' + path.join(dir, 'report.json')], { encoding: 'utf8', cwd: w.g });
    assert.strictEqual(r.status, 2);
    assert.ok(/not the declared merge slot/.test(r.stdout), r.stdout);
  });

  await test('merge: the final merge needs no selected-cell merge report (optional, no prerequisite)', () => {
    const w = newWorld({ cellMergeSlots: true });
    writeCampaign(w, { times: lowTimes });
    const dirs = fs.readdirSync(path.join(w.repo, standin.RUN_BASE), { withFileTypes: true })
      .map((e) => e.name);
    assert.ok(!dirs.some((d) => /merge/.test(d)));
    assert.strictEqual(runMerge(w, 'all-79').status, 0);
  });

  await test('merge: raw sorted[24]/[47]/[49], never chunk percentiles; strict p95 < target', () => {
    const rowsB = [{ key: 'fakeb/easy', variant: 'fakeb', level: 'easy', target: 122,
      chunks: [[0, 25, 60], [25, 25, 60]] }];
    const w = newWorld({ rows: rowsB, cellMergeSlots: true });
    const a = seq50(25, 1);
    const b = seq50(25, 100);
    writeCampaign(w, { times: (c) => (c.i0 === 0 ? a : b) });
    const r = runMerge(w, 'cell:fakeb/easy');
    const s = r.report.cells[0].stats;
    const merged = a.concat(b).sort((x, y) => x - y);
    assert.strictEqual(s.p50, merged[24]);
    assert.strictEqual(s.p50, 25);
    assert.strictEqual(s.p95, merged[47]);
    assert.strictEqual(s.p95, 122);
    assert.strictEqual(s.max, merged[49]);
    assert.strictEqual(s.max, 124);
    assert.strictEqual(s.mean, a.concat(b).reduce((x, y) => x + y, 0) / 50);
    const chunkP95s = [a, b].map((t) => t.slice().sort((x, y) => x - y)[Math.ceil(0.95 * 25) - 1]);
    assert.deepStrictEqual(chunkP95s, [24, 123]);
    assert.notStrictEqual(s.p95, (chunkP95s[0] + chunkP95s[1]) / 2, 'not an average of chunk percentiles');
    assert.notStrictEqual(s.p95, Math.max.apply(null, chunkP95s), 'not the larger chunk percentile');
    assert.strictEqual(s.meets, false, 'p95 equals the target exactly: strict equality is a MISS');
    assert.strictEqual(r.status, 1, r.stdout);
    assert.strictEqual(r.last,
      'ms18d-gp-merge-result scope=cell:fakeb/easy complete=true meets=false p95=122 target=122');
  });

  await test('merge: p95 just below the target (unrounded) meets; decisions never use rounded values', () => {
    const rows = [{ key: 'fakea/easy', variant: 'fakea', level: 'easy', target: 100, chunks: [[0, 50, 70]] }];
    const w = newWorld({ rows, cellMergeSlots: true });
    const t = [];
    for (let i = 0; i < 50; i++) t.push(10 + i / 100);
    t[47] = 99.99999999999999;
    t[48] = 99.99999999999999;
    t[49] = 99.99999999999999;
    writeCampaign(w, { times: () => t });
    const r = runMerge(w, 'cell:fakea/easy');
    assert.strictEqual(r.status, 0, r.stdout);
    assert.ok(/p95=99\.99999999999999 target=100$/.test(r.last), r.last);
    const hold = t.slice();
    hold[47] = 100;
    hold[48] = 100;
    hold[49] = 100;
    const w2 = newWorld({ rows, cellMergeSlots: true });
    writeCampaign(w2, { times: () => hold });
    assert.strictEqual(runMerge(w2, 'cell:fakea/easy').status, 1);
  });

  await test('merge: cold-start disclosure: first requests >= sorted[47] (ties), extra-start flag', () => {
    const rowsB = [{ key: 'fakeb/easy', variant: 'fakeb', level: 'easy', target: 500,
      chunks: [[0, 25, 60], [25, 25, 60]] }];
    const times = (firstOfB) => (c) => {
      if (c.i0 === 0) return seq50(25, 1);
      const b = seq50(25, 100);
      b[0] = firstOfB;
      return b;
    };
    const w = newWorld({ rows: rowsB, cellMergeSlots: true });
    writeCampaign(w, { times: times(122) });
    let r = runMerge(w, 'cell:fakeb/easy');
    assert.strictEqual(r.status, 0, r.stdout);
    assert.strictEqual(r.report.cells[0].stats.p95, 122);
    assert.deepStrictEqual(r.report.cells[0].coldStart, [{ index: 25, ms: 122, extraStart: true }]);
    assert.strictEqual(r.report.cells[0].coldStartSensitive, true);
    assert.ok(r.lines.some((l) => l ===
      'cold-start-sensitive cell=fakeb/easy first-request-index=25 ms=122 extra-start=true'));
    const w2 = newWorld({ rows: rowsB, cellMergeSlots: true });
    writeCampaign(w2, { times: times(121) });
    r = runMerge(w2, 'cell:fakeb/easy');
    assert.strictEqual(r.report.cells[0].stats.p95, 122);
    assert.deepStrictEqual(r.report.cells[0].coldStart, []);
    const w3 = newWorld({ rows: rowsB, cellMergeSlots: true });
    writeCampaign(w3, { times: (c) => (c.i0 === 0 ? [500].concat(seq50(24, 2)) : seq50(25, 100)) });
    r = runMerge(w3, 'cell:fakeb/easy');
    assert.deepStrictEqual(r.report.cells[0].coldStart, [{ index: 0, ms: 500, extraStart: false }],
      'a first request at index 0 is reported, not an extra start');
    assert.strictEqual(r.report.cells[0].stats.max, 500, 'the cold-start sample is kept, not removed');
    assert.strictEqual(r.report.cells[0].stats.p95, 123);
  });

  const bigRows = Array.from({ length: 79 }, (_, i) => {
    const name = 'f' + String(i).padStart(2, '0');
    return { key: name + '/easy', variant: name, level: 'easy', target: 100, chunks: [[0, 50, 70]] };
  });
  for (const [passing, expectCode] of [[72, 0], [71, 1], [79, 0], [0, 1]]) {
    await test('merge: the final gate is an integer count: ' + passing + ' of 79 -> exit ' + expectCode,
      () => {
      const w = newWorld({ rows: bigRows });
      writeCampaign(w, { times: (c) => (c.matrixIndex < passing
        ? Array.from({ length: 50 }, (_, i) => 1 + i / 100) : Array.from({ length: 50 }, () => 150)) });
      const r = runMerge(w, 'all-79');
      assert.strictEqual(r.status, expectCode, r.stdout.split('\n').slice(-3).join('|'));
      assert.strictEqual(r.last, RESULT_ALL + (expectCode === 0) + ' successes=' + passing +
        ' cells=79 required=72');
      assert.strictEqual(r.report.required, 72);
    });
  }

  // damage applied to ONE chunk run (fakeb i25) of an otherwise complete campaign
  const mut = (file, fn) => ({ mutate: { [file]: fn } });
  const patchLedger = (fn) => mut('ledger.json', (l) => { fn(l); return l; });
  const patch = (file, over) => mut(file, (o) => Object.assign(o, over));
  const omit = (file) => ({ omit: [file] });
  const raw = (file, text) => ({ raw: { [file]: text } });
  const pids = (event, over) => mut('pids.jsonl', (rows) => rows.map((r) => (r.event === event
    ? Object.assign({}, r, over) : r)));
  const START25 = 'ms18d-gp-recorder-start chunk=fakeb-easy.i25.n25 i0=25 n=25 seedBase=9525\r\n';
  const MARK25 = 'ms18d-gp-ledger-complete chunk=fakeb-easy.i25.n25 bytes=1 sha256=' + 'a'.repeat(64) +
    '\r\n';
  const A64 = 'a'.repeat(64);
  const damaged = [
    ['a missing result.json', omit('result.json'), /result\.json is missing/],
    ['a missing wrapper.json', omit('wrapper.json'), /wrapper\.json is missing/],
    ['a missing cleanup.json', omit('cleanup.json'), /cleanup\.json: not clean/],
    ['a missing admission.json', omit('admission.json'), /admission\.json: not proceed/],
    ['a missing ledger', omit('ledger.json'), /ledger\.json is missing/],
    ['a missing stdout.txt', omit('stdout.txt'), /stdout\.txt is missing/],
    ['a missing pids.jsonl (no exit receipt)', omit('pids.jsonl'), /pids\.jsonl: command exit/],
    ['a stdout marker with another digest', raw('stdout.txt', START25 + MARK25),
      /completion marker is not the size and digest/],
    ['no completion marker (a killed recorder)', raw('stdout.txt', START25),
      /exactly the start line and the completion marker/],
    ['a stderr byte', raw('stderr.txt', 'x'), /stderr\.txt is missing or not empty/],
    ['a nonzero command exit', pids('command-exit', { code: 1 }), /pids\.jsonl: command exit/],
    ['a command that ended on a signal', pids('command-exit', { signal: 'SIGKILL' }),
      /pids\.jsonl: command exit/],
    ['stderr bytes counted by the tee', pids('tee-exit', { stderrBytes: 3 }), /tee exit \/ stderr/],
    ['a controller result that is a stop', patch('result.json', { outcome: 'stop', controllerExit: 65 }),
      /not a complete success/],
    ['a classification that is not complete', patch('result.json', { classification: { complete: false } }),
      /not a complete success/],
    ['a barrier that is not clean', patch('result.json', { barrier: { verdict: 'hold-survivor' } }),
      /barrier not clean/],
    ['a cleanup record that is not clean', mut('cleanup.json', () => ({ verdict: 'stopped-owned' })),
      /cleanup\.json: not clean/],
    ['a tee marker with a nonzero exit', patch('result.json', { tee: { marker: 'exit=1 seconds=1' } }),
      /tee marker/],
    ['a wrapper outcome that is a stop', patch('wrapper.json', { outcome: 'stop' }),
      /wrapper\.json: outcome stop/],
    ['wrapper problems', patch('wrapper.json', { problems: ['x'] }), /problems recorded/],
    ['a request that is not a real recorder request', patch('request.json', { standin: true }),
      /not a real recorder request/],
    ['a request for another attempt slot', patch('request.json', { attempt: 2 }), /request\.json: slot/],
    ['a request naming another campaign base',
      patch('request.json', { expected: { base: 'c'.repeat(40) } }), /campaign base/],
    ['a binding that is not ok', patch('binding.json', { ok: false }), /binding\.json: not ok/],
    ['stand-in provenance (everywhere, though every hash matches)', { standin: true },
      /stand-in provenance|not a real recorder request/],
    ['a ledger with a wrong seed', patchLedger((l) => { l.requests[3].seed += 1; }), /seed/],
    ['a ledger with another target', patchLedger((l) => { l.chunk.target = 301; }), /chunk\.target/],
    ['a ledger with a wrong chunk range', patchLedger((l) => { l.chunk.i0 = 24; }), /chunk\.i0/],
    ['a ledger with an overlapping index', patchLedger((l) => { l.requests[0].index = 26; }),
      /request 0 has index/],
    ['a ledger with a missing request', patchLedger((l) => { l.requests.pop(); }), /requests are 24/],
    ['a ledger with a NaN (null) time', patchLedger((l) => { l.requests[2].ms = NaN; }),
      /finite non-negative/],
    ['a ledger with a negative time', patchLedger((l) => { l.requests[2].ms = -1; }),
      /finite non-negative/],
    ['a ledger of another source (E hash)', patchLedger((l) => { l.identity.hashIdentity = A64; }),
      /identity differs/],
    ['a ledger of another plan', patchLedger((l) => { l.identity.planManifestSha256 = A64; }),
      /identity differs/],
    ['a ledger of other helpers', patchLedger((l) => { l.identity.helperManifestSha256 = A64; }),
      /identity differs/],
    ['a ledger of another Node', patchLedger((l) => { l.identity.node = 'v1.0.0'; }), /identity differs/],
    ['a ledger of another machine', patchLedger((l) => { l.identity.machine.cpu = 'X'; }),
      /identity differs/],
    ['a ledger of another policy', patchLedger((l) => { l.identity.selectedPolicy = { choice: 'B' }; }),
      /identity differs/],
    ['a ledger of another campaign base', patchLedger((l) => { l.identity.base = 'c'.repeat(40); }),
      /identity differs/],
    ['a ledger recorded with an execArgv flag', patchLedger((l) => { l.identity.execArgv = ['--x']; }),
      /execArgv/],
    ['a ledger recorded with NODE_OPTIONS', patchLedger((l) => { l.identity.nodeOptions = '--x'; }),
      /NODE_OPTIONS/],
    ['a ledger whose transport reference is wrong',
      patchLedger((l) => { l.observation.transport.binding.sha256 = A64; }),
      /transport reference binding/],
    ['a ledger HEAD that is not the bound HEAD',
      patch('binding.json', { head: { actual: 'c'.repeat(40) } }), /HEAD is not the bound HEAD/],
    ['a corrupted ledger (truncated JSON)',
      raw('ledger.json', '{"schema": "ms18d-gp-request-ledger-v1", "kind"'),
      /not JSON|completion marker/]
  ];
  for (const [name, damage, pattern] of damaged) {
    await test('merge refuses (exit 2, no result line, no stderr): ' + name, () => {
      const w = newWorld();
      writeCampaign(w, { times: lowTimes,
        chunk: { 'fakeb-easy.i25.n25': Object.assign({ helper: w.helper }, damage) } });
      const r = runMerge(w, 'all-79');
      assert.strictEqual(r.status, 2, r.stdout.split('\n').slice(-6).join('|'));
      assert.strictEqual(r.hasResultLine, false, 'no verdict is inferred');
      assert.strictEqual(r.stderr, '');
      assert.ok(pattern.test(r.stdout), r.stdout.split('\n').filter((l) => /^problem/.test(l)).slice(0, 4)
        .join(' | '));
      assert.strictEqual(r.report.complete, false);
      assert.ok(/^ms18d-gp-merge-incomplete /.test(r.last));
    });
  }

  await test('merge refuses: a missing chunk leaves the cell incomplete (nothing is filled in)', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes, chunk: { 'fakeb-easy.i0.n25': { skip: true } } });
    const r = runMerge(w, 'all-79');
    assert.strictEqual(r.status, 2);
    assert.ok(/fakeb-easy\.i0\.n25: no complete run \(0 hold\(s\), 0 failed\)/.test(r.stdout), r.stdout);
    assert.strictEqual(r.report.cells.filter((c) => !c.complete).length, 1);
    assert.strictEqual(r.report.cells[0].complete, true, 'the other cell is still reported');
  });

  const second = (w, id, over) => standin.writeRunFolder(w.repo, w.made, slotOf(w, id, 2),
    Object.assign({ helper: w.helper, times: lowTimes(chunkOf(w, id)) }, over));

  await test('merge refuses: a duplicate (two complete runs) and a replacement of a started chunk', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes });
    second(w, 'fakeb-easy.i0.n25');
    let r = runMerge(w, 'all-79');
    assert.strictEqual(r.status, 2);
    assert.ok(/2 complete ledgers/.test(r.stdout), r.stdout);
    const w2 = newWorld();
    writeCampaign(w2, { times: lowTimes,
      chunk: { 'fakeb-easy.i0.n25': { helper: w2.helper, omit: ['cleanup.json'] } } });
    second(w2, 'fakeb-easy.i0.n25');
    r = runMerge(w2, 'all-79');
    assert.strictEqual(r.status, 2);
    assert.ok(/a complete run follows a run that failed; a started chunk is never replaced/.test(r.stdout),
      r.stdout);
  });

  await test('merge: lawful continuation: an unstarted hold, then a complete run on attempt 2', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes, chunk: { 'fakeb-easy.i0.n25': { skip: true } } });
    standin.writeHoldFolder(w.repo, slotOf(w, 'fakeb-easy.i0.n25', 1));
    second(w, 'fakeb-easy.i0.n25');
    const r = runMerge(w, 'all-79');
    assert.strictEqual(r.status, 0, r.stdout);
    assert.strictEqual(r.report.cells[1].chunks[0].holds, 1);
  });

  await test('merge R2: an undeclared or declared-looking directory, a loose file, a non-flat folder', () => {
    const base = standin.RUN_BASE;
    const mk = (...parts) => (w) => fs.mkdirSync(path.join(w.repo, base, ...parts), { recursive: true });
    const cases = [
      ['an undeclared attempt of a declared cell', mk('fakea-easy', 'fakea-easy.i0.n50.a3'),
        /undeclared run directory/],
      ['a guessed all-79 directory', mk('all-79', 'other'), /undeclared run directory/],
      ['an unknown cell folder', mk('fakec-easy', 'x'), /undeclared run directory/],
      ['a loose file under gp', (w) => fs.writeFileSync(path.join(w.repo, base, 'loose.txt'), 'x'),
        /loose file/],
      ['a nested directory inside a run folder', mk('fakea-easy', 'fakea-easy.i0.n50.a1', 'sub'),
        /not flat/]
    ];
    for (const [name, make, pattern] of cases) {
      const w = newWorld();
      writeCampaign(w, { times: lowTimes });
      make(w);
      const r = runMerge(w, 'all-79');
      assert.strictEqual(r.status, 2, name + ': ' + r.stdout);
      assert.ok(pattern.test(r.stdout), name + ': ' + r.stdout);
    }
  });

  await test('merge R2: the merge itself must run in its declared slot (a guessed folder is invalid)', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes });
    const guessed = path.join(w.repo, standin.RUN_BASE, 'all-79', 'guess.m9');
    fs.mkdirSync(guessed, { recursive: true });
    fs.writeFileSync(path.join(guessed, 'request.json'), JSON.stringify({ schema: 'ms18d-c-request-1',
      profile: 'gp-merge', standin: true, repo: w.repo, scope: 'all-79',
      plan: { file: w.made.planRel, rawSha256: w.made.rawSha256, manifestSha256: w.doc.manifestSha256 },
      helpers: { manifestFile: w.helper.file, manifestSha256: w.helper.sha256, repoRoot: w.repo },
      expected: { base: standin.BASE } }));
    const r = spawnSync(process.execPath, [MERGER, '--plan=' + w.made.planRel, '--scope=all-79',
      '--out=' + path.join(guessed, 'report.json')], { encoding: 'utf8', cwd: w.g });
    assert.strictEqual(r.status, 2);
    assert.ok(/ms18d-gp-merge-invalid .*not the declared merge slot/.test(r.stdout), r.stdout);
    assert.ok(!fs.existsSync(path.join(guessed, 'report.json')));
  });

  await test('merge R5: execArgv or NODE_OPTIONS is invalid input; the named plan must be the one', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes });
    let r = runMerge(w, 'all-79', { env: { NODE_OPTIONS: '--no-warnings' } });
    assert.strictEqual(r.status, 2);
    assert.ok(/Node flags are set/.test(r.stdout));
    const w2 = newWorld();
    writeCampaign(w2, { times: lowTimes });
    r = runMerge(w2, 'all-79', { nodeFlags: ['--no-warnings'] });
    assert.strictEqual(r.status, 2);
    const w3 = newWorld();
    writeCampaign(w3, { times: lowTimes });
    r = runMerge(w3, 'all-79', { request: { plan: { file: w3.made.planRel, rawSha256: A64,
      manifestSha256: w3.doc.manifestSha256 } } });
    assert.strictEqual(r.status, 2);
    assert.ok(/plan is not the one/.test(r.stdout));
  });

  await test('merge R1: an unexpected exception is caught at the top level: exit 3, never 1', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes });
    const { dir } = mergeRequestFile(w, 'all-79');
    const realWrite = process.stderr.write;
    process.stderr.write = () => true;
    let code;
    try {
      code = mergeGp.main(['--plan=' + w.made.planRel, '--scope=all-79',
        '--out=' + path.join(dir, 'report.json')], { out: () => { throw new Error('boom'); } });
    } finally {
      process.stderr.write = realWrite;
    }
    assert.strictEqual(code, 3);
    const w2 = newWorld();
    const { dir: dir2 } = mergeRequestFile(w2, 'all-79');
    const r = spawnSync(process.execPath, [MERGER, '--plan=docs', '--scope=all-79',
      '--out=' + path.join(dir2, 'report.json')], { encoding: 'utf8', cwd: w2.g });
    assert.strictEqual(r.status, 3, r.stdout + r.stderr);
    assert.ok(/unexpected/.test(r.stderr));
    const bad = spawnSync(process.execPath, [MERGER, '--scope=all-79'], { encoding: 'utf8', cwd: w.g });
    assert.strictEqual(bad.status, 2, 'a usage error is invalid input');
  });

  await test('merge R3: HEADs differ from the base only under ancestry and an allowed diff', () => {
    const OTHER = 'c'.repeat(40);
    const mk = (git, o) => {
      const w = newWorld();
      writeCampaign(w, Object.assign({ times: lowTimes, head: OTHER }, o));
      const { dir } = mergeRequestFile(w, 'all-79');
      const lines = [];
      const code = mergeGp.main(['--plan=' + w.made.planRel, '--scope=all-79',
        '--out=' + path.join(dir, 'report.json')], { git, out: (t) => lines.push(t) });
      return { code, lines, w,
        report: JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8')) };
    };
    const okGit = (names) => (args) => {
      if (args[0] === 'merge-base') return '';
      if (args[0] === 'diff') return names.map((n) => n + '\0').join('');
      throw new Error('unexpected git ' + args[0]);
    };
    const pack = ['tasks/difficulty-v3/check-list.md', 'tasks/difficulty-v3/x/y.md'];
    const allowed = mk(okGit(pack));
    assert.strictEqual(allowed.code, 0, allowed.lines.join('\n'));
    assert.ok(allowed.report.consumed.every((c) => c.head === OTHER), 'each ledger keeps its actual HEAD');
    const declared = plan.declaredDirsOf(allowed.w.doc)[0] + '/ledger.json';
    const outputs = mk(okGit([declared, standin.RUN_BASE.replace('gp', 'phase-c') + '/lock-log.jsonl']));
    assert.strictEqual(outputs.code, 0, outputs.lines.join('\n'));
    const helper = mk(okGit(['generator/tests/artifacts/difficulty-v3/MS18d/phase-c/record-gp.js']));
    assert.strictEqual(helper.code, 2);
    assert.ok(helper.lines.some((l) => /changed since the base/.test(l)), helper.lines.join('\n'));
    assert.strictEqual(mk(okGit([standin.RUN_BASE + '/fakea-easy/guess/ledger.json'])).code, 2);
    const planFile = 'docs/difficulty-v3/evidence/MS18d/phase-c/gp-chunk-manifest.json';
    assert.strictEqual(mk(okGit([planFile])).code, 2);
    const notDescendant = mk((args) => {
      if (args[0] === 'merge-base') throw new Error('not an ancestor');
      return '';
    });
    assert.strictEqual(notDescendant.code, 2);
    assert.ok(notDescendant.lines.some((l) => /not a descendant of the campaign base/.test(l)));
    assert.strictEqual(mk(okGit([]), { head: 'main' }).code, 2);
    const same = mk(() => { throw new Error('git is not asked when HEAD is the base'); },
      { head: standin.BASE });
    assert.strictEqual(same.code, 0, same.lines.join('\n'));
  });

  await test('merge R3: helper identity drift between ledgers is refused (one common identity)', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes,
      chunk: { 'fakeb-easy.i0.n25': { helper: { sha256: A64 } } } });
    const r = runMerge(w, 'all-79');
    assert.strictEqual(r.status, 2);
    assert.ok(/identity differs from the campaign identity/.test(r.stdout));
  });

  await test('merge: the frozen command line of a real recorder run is checked (a real merge only)', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes });
    const fsio = { listDir: () => [], exists: (rel) => fs.existsSync(path.join(w.repo, rel)),
      readDir: (rel) => core.readRunFolder(path.join(w.repo, rel)) };
    const folders = core.collectRunFolders(w.doc, { type: 'all' }, fsio);
    const input = (planRel) => ({ doc: w.doc, scope: { type: 'all' }, runFolders: folders.folders,
      expectedIdentity: core.expectedIdentityOf(w.doc, w.helper.sha256, standin.BASE), base: standin.BASE,
      checkHead: () => ({ ok: true, problems: [] }), realRun: true, planRel,
      bindingJournal: require('./standin-readiness.js').journalWorld({}).chain() });
    assert.strictEqual(core.evaluate(input(w.made.planRel)).complete, true);
    const wrong = core.evaluate(input('docs\\other.json'));
    assert.strictEqual(wrong.complete, false);
    assert.ok(wrong.problems.some((p) => /command line is not the frozen one/.test(p)));
  });
}

// ---------------------------------------------------------------------------------------------------------
// the typed G3 classifiers
// ---------------------------------------------------------------------------------------------------------

async function classifierTests() {
  const w = newWorld();
  const first = record(w, 'fakeb-easy.i0.n25');
  assert.strictEqual(first.status, 0, first.stderr);
  const chunk = chunkOf(w, 'fakeb-easy.i0.n25');
  const ledgerBytes = fs.readFileSync(first.ledgerFile);
  const request = (over) => Object.assign({ standin: true, chunk,
    plan: { manifestSha256: w.doc.manifestSha256 }, expected: { base: standin.BASE } }, over || {});
  const recorderEvidence = (over) => Object.assign({
    request: request(), stdout: first.stdout, stderr: '', stdoutBytes: first.stdout.length, stderrBytes: 0,
    cli: { exit: 0, signal: null }, tee: { marker: 'exit=0 seconds=1.5', exit: 0 },
    barrier: { verdict: 'clean' }, binding: { ok: true, head: { actual: standin.HEAD } },
    acquisition: { decision: 'proceed' },
    readRunBytes: (name) => (name === 'ledger.json' ? ledgerBytes : null) }, over || {});
  const kinds = (r) => r.kinds.join(',');

  await test('G3 recorder: only exit 0 with the exact ledger and a clean transport is a success', () => {
    const r = payloadGp.recorder.classify(recorderEvidence());
    assert.strictEqual(r.complete, true, r.problems.join(' | '));
    assert.strictEqual(r.outcome, 'success');
    assert.strictEqual(r.controllerExit, 0);
    assert.strictEqual(payloadGp.recorder.allowsMissExit, false);
  });

  const exit1 = { cli: { exit: 1, signal: null }, tee: { marker: 'exit=1 seconds=1', exit: 1 } };
  const plus = Buffer.concat([ledgerBytes, Buffer.from(' ')]);
  const recorderStops = [
    ['exit 1 (no verdict exists for a recorder)', exit1, /cli-exit/],
    ['a signal', { cli: { exit: null, signal: 'SIGKILL' } }, /cli-signal/],
    ['a stderr byte', { stderrBytes: 1 }, /stderr-output/],
    ['an unrecorded stderr count', { stderrBytes: null }, /stderr-output/],
    ['an unclean barrier', { barrier: { verdict: 'hold-unknown' } }, /orphan/],
    ['a binding that is not ok', { binding: { ok: false } }, /binding/],
    ['an acquisition that did not proceed', { acquisition: { decision: 'hold' } }, /admission/],
    ['a tee exit that differs from the command', { tee: { marker: 'exit=0 seconds=1', exit: 1 } },
      /tee-status-mismatch/],
    ['no ledger', { readRunBytes: () => null }, /ledger/],
    ['a ledger that is not the one the marker names', { readRunBytes: () => plus }, /ledger/],
    ['stdout that has an extra line', { stdout: first.stdout + 'extra\n' }, /output/],
    ['stdout that has no marker', { stdout: first.stdout.split('\n')[0] + '\n' }, /output/],
    ['another chunk in the request',
      { request: request({ chunk: Object.assign({}, chunk, { chunkId: 'x' }) }) },
      /output|ledger/],
    ['another plan in the request', { request: request({ plan: { manifestSha256: A64x() } }) }, /ledger/],
    ['another campaign base', { request: request({ expected: { base: 'c'.repeat(40) } }) }, /ledger/],
    ['stand-in provenance in a real request', { request: request({ standin: false }) }, /ledger/],
    ['a HEAD that is not the bound HEAD', { binding: { ok: true, head: { actual: 'c'.repeat(40) } } },
      /ledger/]
  ];
  function A64x() {
    return 'a'.repeat(64);
  }
  for (const [name, over, pattern] of recorderStops) {
    await test('G3 recorder: STOP (exit 65): ' + name, () => {
      const r = payloadGp.recorder.classify(recorderEvidence(over));
      assert.strictEqual(r.outcome, 'stop');
      assert.strictEqual(r.controllerExit, 65);
      assert.ok(pattern.test(kinds(r)), kinds(r) + ' :: ' + r.problems.join(' | '));
    });
  }

  const mergeLine = (o) => 'ms18d-gp-merge-result scope=' + o.scope + ' complete=true meets=' + o.meets +
    o.tail;
  const mergeEvidence = (o) => {
    const line = o.line === undefined ? mergeLine(o) : o.line;
    const report = o.report === undefined ? { resultLine: line, complete: true, scope: o.scope,
      meets: o.meets === true, cells: o.cells } : o.report;
    return Object.assign({
      request: { scope: o.scope, gate: { cells: 2, requiredSuccesses: 2 } },
      stdout: 'ms18d-gp-merge-start\ncell x\n' + (line === null ? '' : line + '\n'), stderr: '',
      stdoutBytes: 100, stderrBytes: 0, cli: { exit: o.exit, signal: null },
      tee: { marker: 'exit=' + o.exit + ' seconds=1', exit: o.exit }, barrier: { verdict: 'clean' },
      binding: { ok: true }, acquisition: { decision: 'proceed' },
      readRunFile: (name) => (name === 'report.json' && report !== null ? JSON.stringify(report) : null) },
    o.over || {});
  };
  const cellsOf = (meets) => meets.map((m) => ({ complete: true, stats: { meets: m, p95: 1, target: 2 } }));
  const allPass = { scope: 'all-79', meets: true, tail: ' successes=2 cells=2 required=2', exit: 0,
    cells: cellsOf([true, true]) };
  const allFail = { scope: 'all-79', meets: false, tail: ' successes=1 cells=2 required=2', exit: 1,
    cells: cellsOf([true, false]) };

  await test('G3 merge: exit 0 with meets=true and exit 1 with meets=false are defined; a cell too', () => {
    assert.strictEqual(payloadGp.merge.classify(mergeEvidence(allPass)).outcome, 'success');
    const miss = payloadGp.merge.classify(mergeEvidence(allFail));
    assert.strictEqual(miss.outcome, 'miss', miss.problems.join(' | '));
    assert.strictEqual(miss.controllerExit, 1);
    assert.strictEqual(payloadGp.merge.allowsMissExit, true);
    const cell = { scope: 'cell:a/b', meets: false, tail: ' p95=2 target=2', exit: 1,
      cells: [{ complete: true, stats: { p95: 2, target: 2, meets: false } }] };
    assert.strictEqual(payloadGp.merge.classify(mergeEvidence(cell)).outcome, 'miss',
      'strict: 2 < 2 is false');
    const pass = { scope: 'cell:a/b', meets: true, tail: ' p95=1.5 target=2', exit: 0,
      cells: [{ complete: true, stats: { p95: 1.5, target: 2, meets: true } }] };
    assert.strictEqual(payloadGp.merge.classify(mergeEvidence(pass)).outcome, 'success');
  });

  const gate = (cells, required) => ({ request: { scope: 'all-79',
    gate: { cells, requiredSuccesses: required } } });
  const withReport = (o, report) => Object.assign({}, o, { report });
  const mergeStops = [
    ['exit 1 without a result line', Object.assign({}, allFail, { line: null }), {}, /result-line/],
    ['exit 1 with a line that is not machine readable',
      Object.assign({}, allFail, { line: 'a number is missing' }), {}, /result-line/],
    ['exit 1 with a stderr byte', allFail, { stderrBytes: 1 }, /stderr-output/],
    ['exit 1 with meets=true', Object.assign({}, allFail, { meets: true }), {}, /contradiction/],
    ['exit 0 with meets=false', Object.assign({}, allPass, { meets: false,
      tail: ' successes=1 cells=2 required=2' }), {}, /contradiction/],
    ['exit 2 (incomplete input) with a result line', Object.assign({}, allFail, { exit: 2 }), {}, /cli-exit/],
    ['exit 3 (unexpected exception)', Object.assign({}, allFail, { exit: 3, line: null }), {}, /cli-exit/],
    ['another scope than requested', Object.assign({}, allFail, { scope: 'cell:a/b',
      tail: ' p95=3 target=2' }), gate(2, 2), /result-line/],
    ['a gate that is not the manifest gate', allFail, gate(79, 72), /contradiction/],
    ['meets that disagrees with the integer success count', Object.assign({}, allFail, { meets: true,
      exit: 0, tail: ' successes=1 cells=2 required=2' }), {}, /contradiction/],
    ['a report that disagrees with the line', withReport(allFail, { resultLine: 'other', complete: true,
      scope: 'all-79', meets: false, cells: cellsOf([true, false]) }), {}, /report/],
    ['a report with another success count', Object.assign({}, allFail, { cells: cellsOf([true, true]) }), {},
      /report/],
    ['no report', withReport(allFail, null), {}, /report/],
    ['a signal', allFail, { cli: { exit: null, signal: 'SIGKILL' } }, /cli-signal/],
    ['an unclean barrier', allFail, { barrier: { verdict: 'hold-survivor' } }, /orphan/]
  ];
  for (const [name, o, over, pattern] of mergeStops) {
    await test('G3 merge: STOP (never a MISS): ' + name, () => {
      const r = payloadGp.merge.classify(mergeEvidence(Object.assign({}, o, { over })));
      assert.strictEqual(r.outcome, 'stop', r.problems.join(' | '));
      assert.strictEqual(r.controllerExit, 65);
      assert.ok(pattern.test(kinds(r)), kinds(r) + ' :: ' + r.problems.join(' | '));
    });
  }

  await test('G3: the payload types are registered with their exit semantics (a miss exit: merge)', () => {
    const payloads = require('./payloads.js');
    assert.ok(payloads.types().indexOf('gp-recorder') !== -1 && payloads.types().indexOf('gp-merge') !== -1);
    assert.strictEqual(payloads.payloadFor({ profile: 'gp-recorder' }).allowsMissExit, false);
    assert.strictEqual(payloads.payloadFor({ profile: 'gp-merge' }).allowsMissExit, true);
    assert.strictEqual(payloads.payloadFor({ profile: 'gp-cell' }).allowsMissExit, true);
    assert.strictEqual(payloads.payloadFor({ profile: 'generic' }).allowsMissExit, false);
  });

  await test('payload request checks: a real recorder or merge takes only the frozen command line', () => {
    const gpDir = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18d', 'gp');
    const planFile = 'docs\\difficulty-v3\\evidence\\MS18d\\phase-c\\gp-chunk-manifest.json';
    const sha = 'a'.repeat(64);
    const planRef = { file: planFile, rawSha256: sha, manifestSha256: sha };
    const base = { repo: REPO, runDir: path.join(gpDir, 'fakea-easy', 'fakea-easy.i0.n50.a1'), standin: false,
      plan: planRef, chunk: { chunkId: 'fakea-easy.i0.n50', i0: 0, n: 50 }, attempt: 1 };
    const out = '..\\docs\\difficulty-v3\\evidence\\MS18d\\gp\\fakea-easy\\fakea-easy.i0.n50.a1\\ledger.json';
    const good = ['tests\\artifacts\\difficulty-v3\\MS18d\\phase-c\\record-gp.js', '--plan=' + planFile,
      '--chunk=fakea-easy.i0.n50', '--out=' + out];
    payloadGp.recorder.validateRequest(Object.assign({}, base, { command: { args: good } }));
    assert.throws(() => payloadGp.recorder.validateRequest(Object.assign({}, base,
      { command: { args: good.concat(['--standin-root=x']) } })), /frozen command line/);
    // attempt 3 is a valid REQUEST type (the plan decides: only a declared admission exception has the slot),
    // attempt 4 never is
    payloadGp.recorder.validateRequest(Object.assign({}, base, { command: { args: good }, attempt: 3 }));
    assert.throws(() => payloadGp.recorder.validateRequest(Object.assign({}, base,
      { command: { args: good }, attempt: 4 })), /attempt is 1, 2 or 3/);
    const mergeArgs = ['tests\\artifacts\\difficulty-v3\\MS18d\\phase-c\\merge-gp.js', '--plan=' + planFile,
      '--scope=all-79', '--out=..\\docs\\difficulty-v3\\evidence\\MS18d\\gp\\all-79\\final.m1\\report.json'];
    const mreq = { repo: REPO, runDir: path.join(gpDir, 'all-79', 'final.m1'), standin: false, plan: planRef,
      scope: 'all-79', gate: { cells: 79, requiredSuccesses: 72 } };
    payloadGp.merge.validateRequest(Object.assign({}, mreq, { command: { args: mergeArgs } }));
    assert.throws(() => payloadGp.merge.validateRequest(Object.assign({}, mreq,
      { command: { args: mergeArgs.slice(0, 3) } })), /frozen command line/);
    assert.throws(() => payloadGp.merge.validateRequest(Object.assign({}, mreq,
      { scope: 'cell:a', command: { args: mergeArgs } })), /names its scope/);
  });
}

// ---------------------------------------------------------------------------------------------------------
// F5 and F6 (SA1): what a hold is, the command.exec rule, and the readiness record the merger re-decides
// ---------------------------------------------------------------------------------------------------------

async function readinessMergeTests() {
  const rd = require('./standin-readiness.js');
  const REBOUND = { pid: 5555, parentPid: 4001, dotNetStartTime: '2026-02-02T07:00:00.1111111+07:00',
    cimCreationDateUtcMicroseconds: '2026-02-02T00:00:00.111111Z' };
  const bystander = '310:' + (rd.T0 - 7e6);
  const A64x = 'a'.repeat(64);
  const mutate = (file, fn) => ({ mutate: { [file]: (o) => { fn(o); return o; } } });
  const B = 'fakeb-easy.i0.n25';
  const campaignWith = (w, damage) => {
    const chunk = {};
    chunk['fakeb-easy.i25.n25'] = Object.assign({ helper: w.helper }, damage || {});
    writeCampaign(w, { times: lowTimes, chunk });
  };
  // a merge run folder never keeps an earlier report: the test removes it to merge the same world again
  const forget = (w) => fs.rmSync(path.join(w.repo, w.doc.runSlots.filter((s) => s.role === 'final-merge')[0]
    .dir, 'report.json'), { force: true });
  const second = (w) => standin.writeRunFolder(w.repo, w.made, slotOf(w, B, 2),
    { helper: w.helper, times: lowTimes(chunkOf(w, B)) });
  const refused = (w, pattern, what) => {
    const r = runMerge(w, 'all-79');
    assert.strictEqual(r.status, 2, what + ': ' + r.stdout.split('\n').slice(-5).join('|'));
    assert.strictEqual(r.hasResultLine, false);
    assert.ok(pattern.test(r.stdout), what + ': ' + r.stdout.split('\n').filter((l) => /^problem/.test(l))
      .slice(0, 3).join(' | '));
  };

  // F5: a folder counts as a hold only if it left no sign of a payload
  const holdWith = (w, name, text) => {
    const dir = standin.writeHoldFolder(w.repo, slotOf(w, B, 1));
    if (name) fs.writeFileSync(path.join(dir, name), text);
    return dir;
  };
  for (const [name, text] of [['stdout.txt', 'x'], ['stderr.txt', 'x'], ['transcript.txt', 'x'],
    ['ledger.json', '{}'], ['pids.jsonl', '{"role":"tee","pid":1}\r\n'],
    ['pids.jsonl', '{"role":"command","pid":2}\r\n'], ['pids.jsonl', '{"event":"command-exit","code":0}\r\n'],
    ['pids.jsonl', '{"event":"tee-exit","stderrBytes":0}\r\n']]) {
    await test('F5: a control-hold with a payload sign is not a hold but a failed run: ' + name + ' ' +
      text.slice(0, 22).trim(), () => {
      const w = newWorld();
      writeCampaign(w, { times: lowTimes, chunk: { [B]: { skip: true } } });
      holdWith(w, name, text);
      second(w);
      refused(w, /a complete run follows a run that failed/, name);
    });
  }

  await test('F5: a control-hold with only the controller\'s own pid record is a hold', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes, chunk: { [B]: { skip: true } } });
    holdWith(w, 'pids.jsonl', '{"role":"controller","pid":5001}\r\n');
    second(w);
    const r = runMerge(w, 'all-79');
    assert.strictEqual(r.status, 0, r.stdout);
    assert.strictEqual(r.report.cells[1].chunks[0].holds, 1);
  });

  await test('F5: a wrapper.json saying only foreign-lock-watch is a hold; with a file beside it, no', () => {
    const w = newWorld();
    writeCampaign(w, { times: lowTimes, chunk: { [B]: { skip: true } } });
    const dir = path.join(w.repo, slotOf(w, B, 1).dir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'wrapper.json'), JSON.stringify({ schema: 'ms18d-c-run-1',
      outcome: 'control-hold', heldAt: 'foreign-lock-watch' }));
    second(w);
    const r = runMerge(w, 'all-79');
    assert.strictEqual(r.status, 0, r.stdout);
    assert.strictEqual(r.report.cells[1].chunks[0].holds, 1);
    fs.writeFileSync(path.join(dir, 'watch.json'), '{}');
    forget(w);
    refused(w, /a complete run follows a run that failed/, 'a wrapper-only hold plus another file');
  });

  await test('F5: a real run whose request has command.exec is rejected (the tee executable)', () => {
    const w = newWorld();
    campaignWith(w, mutate('request.json', (o) => { o.command.exec = 'node'; }));
    refused(w, /request\.json: command\.exec is set/, 'command.exec');
  });

  // F6: the admission carries a complete A readiness record the merger decides again
  const refusals = [
    ['no readiness record in admission.json', mutate('admission.json', (o) => { delete o.readiness; }),
      /admission\.json carries no readiness record/],
    ['a readiness record that did not run', mutate('admission.json', (o) => { o.readiness.ran = false; }),
      /carries no readiness record of a run/],
    ['a readiness record that is not complete', mutate('admission.json', (o) => {
      o.readiness.complete = false;
    }), /not a complete admitted one/],
    ['a readiness record that is an eligible hold', mutate('admission.json', (o) => {
      o.readiness.eligibleReAsk = true;
    }), /not a complete admitted one/],
    ['a cited readiness.json that is another file', mutate('admission.json', (o) => {
      o.readiness.sha256 = A64x;
    }), /readiness\.json is missing or not the cited bytes/],
    ['a missing readiness.json', { omit: ['readiness.json'] }, /readiness\.json is missing or not the cited/],
    ['a missing first snapshot', { omit: ['readiness-before.json'] },
      /first snapshot|before snapshot is missing|before snapshot/],
    ['a missing second snapshot', { omit: ['readiness-after.json'] }, /after snapshot is missing/],
    ['a decision that is not the one the data give', mutate('readiness.json', (o) => {
      o.decision.counters.mean = 0;
    }), /recorded decision is not the one the retained data give/],
    ['a second snapshot changed after the decision', mutate('readiness-after.json', (o) => {
      o.processes.filter((p) => p.pid === 310)[0].cpuMs += 100000;
    }), /recorded decision is not the one the retained data give/],
    ['an additional consumer in the retained data (honestly recorded)', {
      readiness: { snapshotOptions: { rates: { [bystander]: 0.9 } } } }, /not a complete admitted one/],
    ['a short full-core burst of a new process (honestly recorded, R1)', {
      readiness: { snapshotOptions: { afterOnly: [rd.proc(8210, 'burst.exe', rd.T0 + 5500, 2000)] } } },
      /not a complete admitted one/],
    ['a replaced host (honestly recorded)', { readiness: { snapshotOptions: {
      hostFacts: rd.hostFacts(Object.assign({}, rd.HOST, { pid: 1 })) } } }, /not a complete admitted one/],
    ['a host tuple that is not the one the journal approved', mutate('readiness.json', (o) => {
      o.inputs.expected.pid = 99;
    }), /host tuple is not the one approved by entry host-1/],
    ['a host binding id that is not in the committed journal (unapproved)', mutate('readiness.json', (o) => {
      o.inputs.binding.bindingId = 'host-9';
    }), /host binding host-9 is not in the committed journal \(unapproved\)/],
    ['a binding that was not the one in force at admission', mutate('readiness.json', (o) => {
      o.inputs.binding.journal.entryCount = 2;
    }), /was not the one in force at admission/],
    ['a journal digest that is no prefix of the committed journal', mutate('readiness.json', (o) => {
      o.inputs.binding.journal.sha256 = A64x;
    }), /not a prefix of the committed journal/],
    ['a binding whose evidence is not recorded as verified', mutate('readiness.json', (o) => {
      o.inputs.binding.evidence.verified = false;
    }), /names no verified host binding/],
    ['a recorded host that differs from the journal entry', mutate('readiness.json', (o) => {
      o.inputs.binding.host.pid = 77;
    }), /recorded host differs from the journal entry/],
    ['a readiness record that names no binding at all', mutate('readiness.json', (o) => {
      delete o.inputs.binding;
    }), /names no verified host binding/],
    ['another logical processor count', mutate('readiness.json', (o) => {
      o.inputs.logicalCpus = 8;
    }), /another logical processor count/],
    ['an excluded wrapper that is not the run\'s', mutate('readiness.json', (o) => {
      o.inputs.owned.filter((x) => x.role === 'wrapper')[0].pid = 1;
    }), /the wrapper is not the run's/],
    ['an excluded controller that is not the run\'s', mutate('readiness.json', (o) => {
      o.inputs.owned.filter((x) => x.role === 'controller')[0].pid = 1;
    }), /the controller is not the run's/],
    ['an excluded process of another role', mutate('readiness.json', (o) => {
      o.inputs.owned.push({ role: 'bystander', pid: 310, createdMs: rd.T0 - 7e6 });
    }), /an excluded process has the role bystander/],
    ['an excluded probe that is no snapshot\'s', mutate('readiness.json', (o) => {
      o.inputs.owned.push({ role: 'readiness-probe', pid: 31, createdMs: 1 });
    }), /a probe process is not that of a snapshot/],
    ['more than 60 s between the call and the payload', mutate('admission.json', (o) => {
      o.callToSpawnMs = 60001;
    }), /more than 60 s between the call and the payload/],
    ['a late start recorded', mutate('admission.json', (o) => { o.lateStart = true; }),
      /more than 60 s between the call and the payload/],
    ['a readiness over the 45 s budget', { readiness: { input: { budget: { elapsedMs: 45001,
      queryDurationsMs: [600, 650] } } } }, /not a complete admitted one/]
  ];
  for (const [name, damage, pattern] of refusals) {
    await test('F6: the merger rejects ' + name, () => {
      const w = newWorld();
      campaignWith(w, damage);
      refused(w, pattern, name);
    });
  }

  await test('F6: policy A admits a busy host (ready false) and the merge passes: ready is no verdict',
    () => {
    const w = newWorld();
    campaignWith(w, { readiness: { input: { readings: rd.readings(16, [3, 3, 3, 3, 3]) } } });
    const r = runMerge(w, 'all-79');
    assert.strictEqual(r.status, 0, r.stdout.split('\n').slice(-5).join('|'));
  });

  await test('F6/R1: a young new process (0.3 s, 0.3 CPU-s) passes; its data made a burst is refused', () => {
    const young = () => rd.proc(8220, 'young.exe', rd.T0 + 7200, 300);
    const w = newWorld();
    campaignWith(w, { readiness: { snapshotOptions: { afterOnly: [young()] } } });
    const ok = runMerge(w, 'all-79');
    assert.strictEqual(ok.status, 0, ok.stdout.split('\n').slice(-5).join('|'));
    // the same record with the retained second snapshot changed to a two-second full-core burst
    const w2 = newWorld();
    campaignWith(w2, Object.assign({ readiness: { snapshotOptions: { afterOnly: [young()] } } },
      mutate('readiness-after.json', (o) => {
        const p = o.processes.filter((x) => x.pid === 8220)[0];
        p.createdMs = rd.T0 + 5500;
        p.cpuMs = 2000;
      })));
    refused(w2, /recorded decision is not the one the retained data give/, 'a burst made of a young one');
  });

  await test('F6: an approved rebinding is judged for ITS admissions; earlier ledgers stay valid', () => {
    const w = newWorld();
    const jw = rd.journalWorld({ bindings: [{}, { host: REBOUND }] });
    const tuple2 = jw.hostBinding().expected;
    const text2 = jw.committed[require('./journals.js').BINDINGS_REL];
    // one chunk was admitted after the rebinding (binding host-2), the others before it (host-1)
    campaignWith(w, { readiness: { world: jw, snapshotOptions: { binding: tuple2 },
      input: { expected: tuple2, bindingSource: 'journal entry host-2' } } });
    refused(w, /host binding host-2 is not in the committed journal \(unapproved\)/,
      'the rebinding is not committed');
    forget(w);
    const ok = runMerge(w, 'all-79', { request: { bindingJournalText: text2 } });
    assert.strictEqual(ok.status, 0, ok.stdout.split('\n').slice(-5).join('|'));
    forget(w);
    // the committed journal must still hold the prior entry first: a journal that dropped host-1 rejects
    const dropped = text2.split('\n').filter(Boolean).slice(1).join('\n') + '\n';
    const bad = runMerge(w, 'all-79', { request: { bindingJournalText: dropped } });
    assert.strictEqual(bad.status, 2);
    assert.ok(/replaces host-1|host-binding journal is empty or invalid/.test(bad.stdout), bad.stdout);
  });

  await test('F6: an empty, invalid or missing host-binding journal makes the merge invalid (exit 2)', () => {
    for (const text of ['', '{broken\n', '\n\n']) {
      const w = newWorld();
      campaignWith(w, {});
      const r = runMerge(w, 'all-79', { request: { bindingJournalText: text } });
      assert.strictEqual(r.status, 2, JSON.stringify(text));
      assert.ok(/host-binding journal is empty or invalid/.test(r.stdout), r.stdout);
      assert.strictEqual(r.hasResultLine, false);
    }
  });

  await test('F6: a REAL merge reads the journal at HEAD: base prefix and evidence digests checked', () => {
    const jr = require('./journals.js');
    const jw = rd.journalWorld({ bindings: [{}, { host: REBOUND }], baseBindings: 1 });
    const mergeGp = require('./merge-gp.js');
    const ctx = (base) => ({ standin: false, request: {}, base });
    const read = (world, extra) => {
      const git = (args) => {
        if (args[0] === 'rev-parse') return rd.HEAD + '\n';
        return world.git(args);
      };
      return mergeGp.bindingJournalOf(ctx(extra === undefined ? rd.BASE : extra), git, null);
    };
    assert.strictEqual(read(jw).entries.length, 2);
    const rewritten = rd.journalWorld({ bindings: [{}, { host: REBOUND }], baseBindings: 1 });
    rewritten.committedBase[jr.BINDINGS_REL] = rewritten.committedBase[jr.BINDINGS_REL]
      .replace('host-1', 'host-X');
    assert.throws(() => read(rewritten), /does not keep the version committed at the base/);
    const noEvidence = rd.journalWorld({ bindings: [{}, { host: REBOUND }], baseBindings: 1 });
    delete noEvidence.committed[jr.EVIDENCE_DIR + 'host-1.json'];
    assert.throws(() => read(noEvidence),
      /host-binding evidence is invalid: .*host-1\.json is not committed/);
    const wrongBytes = rd.journalWorld({ bindings: [{}, { host: REBOUND }], baseBindings: 1 });
    wrongBytes.committed[jr.EVIDENCE_DIR + 'host-2.json'] += ' ';
    assert.throws(() => read(wrongBytes), /not the cited bytes/);
    const empty = rd.journalWorld({ bindings: [], baseBindings: 0 });
    assert.throws(() => read(empty), /empty or invalid/);
  });
}

// ---------------------------------------------------------------------------------------------------------
// the two epochs of the campaign (the B2 transport repair): merge-core.js epoch rules, merge-gp.js epochsOf
// ---------------------------------------------------------------------------------------------------------

const HDIR = core.HELPER_DIR;
const B1 = 'a1'.repeat(20);
const CHK = 'c0'.repeat(20);
const B2 = 'b2'.repeat(20);
const CHK3 = 'c9'.repeat(20);
const B3 = 'b3'.repeat(20);
const B4 = 'b4'.repeat(20);
const CHK4 = 'c8'.repeat(20);
const HEADX = 'd4'.repeat(20);
const MANIFEST1_REL = 'docs/difficulty-v3/evidence/MS18d/phase-c/helpers-c1b-sha256.txt';
const MANIFEST2_REL = 'docs/difficulty-v3/evidence/MS18d/phase-c/helpers-c2-sha256.txt';
const MANIFEST3_REL = 'docs/difficulty-v3/evidence/MS18d/phase-c/helpers-c3-sha256.txt';
const PROOF_REL = 'tasks/difficulty-v3/MS18d-gp-campaign-base-2-proof.json';
const PROOF3_REL = 'tasks/difficulty-v3/MS18d-gp-campaign-base-3-proof.json';
const hexOf = (text) => sha256(Buffer.from(text, 'utf8'));
const helperText = (entries) => Object.keys(entries).sort()
  .map((p) => entries[p].toUpperCase() + '  ' + p.replace(/\//g, '\\')).join('\r\n') + '\r\n';
const HELPER_NAMES = ['record-gp.js', 'loader.js', 'controller.js', 'readiness-core.js', 'run-locked-c.ps1',
  'merge-core.js', 'merge-gp.js', 'test-units.js', 'standin-gp.js', 'release-history.js', 'plan-data.js',
  'attempts.js', 'payload-gp.js', 'test-plan.js', 'test-recorder-merge.js', 'test-run-locked-c.ps1'];

function helperEntries(version, extra) {
  const e = {};
  HELPER_NAMES.forEach((n) => { e[HDIR + n] = hexOf(version + ' ' + n); });
  e['docs/difficulty-v3/evidence/MS18d/phase-c/gp-chunk-manifest.json'] = hexOf('plan');
  return Object.assign(e, extra || {});
}

/**
 * A world of two epochs: epoch 1 = (B1, H1), epoch 2 = (B2, H2). H1 and H2 are manifests written to the
 * world's repository; H2 differs from H1 in the three production files, one test file (changed) and one
 * added test file.
 * `o.h2` overrides entries of H2 (a null value removes one), `o.diff` replaces the committed B1 -> B2 diff.
 */
function epochWorld(o) {
  const opts = o || {};
  const w = newWorld({ rows: opts.rows });
  const e1 = helperEntries('v1');
  const e2 = helperEntries('v1', {
    [HDIR + 'run-locked-c.ps1']: hexOf('v2 wrapper'), [HDIR + 'merge-core.js']: hexOf('v2 core'),
    [HDIR + 'merge-gp.js']: hexOf('v2 gp'), [HDIR + 'test-units.js']: hexOf('v2 units'),
    [HDIR + 'test-epoch2-proof.js']: hexOf('v2 proof tool') });
  Object.keys(opts.h2 || {}).forEach((k) => {
    if (opts.h2[k] === null) delete e2[k];
    else e2[k] = opts.h2[k];
  });
  const write = (rel, text) => {
    const file = path.join(w.repo, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    return file;
  };
  w.m1Text = helperText(e1);
  w.m2Text = helperText(e2);
  w.h1 = { rel: MANIFEST1_REL, sha256: hexOf(w.m1Text), entries: Object.keys(e1).length };
  write(MANIFEST1_REL, w.m1Text);
  w.h2 = { file: write(MANIFEST2_REL, w.m2Text), sha256: hexOf(w.m2Text), entries: Object.keys(e2).length };
  w.diff = opts.diff || [
    { status: 'M', file: HDIR + 'run-locked-c.ps1' }, { status: 'M', file: HDIR + 'merge-core.js' },
    { status: 'M', file: HDIR + 'merge-gp.js' }, { status: 'M', file: HDIR + 'test-units.js' },
    { status: 'A', file: HDIR + 'test-epoch2-proof.js' },
    { status: 'A', file: 'docs/difficulty-v3/evidence/MS18d/phase-c/helpers-c2-sha256.txt' },
    { status: 'A', file: 'docs/difficulty-v3/evidence/MS18d/phase-c/transcripts/c2-units-1.txt' },
    { status: 'A', file: standin.RUN_BASE + '/fakea-easy/fakea-easy.i0.n50.a1/ledger.json' },
    { status: 'M', file: 'docs/difficulty-v3/evidence/MS18d/phase-c/lock-log.jsonl' },
    { status: 'M', file: 'tasks/difficulty-v3/MS18d-gp-rulings.jsonl' },
    { status: 'A', file: 'tasks/difficulty-v3/MS18d-epoch2-transport-repair.md' }];
  w.write = write;
  return w;
}

const pairOf = (w, n) => (n === 1 ? { base: B1, helper: { sha256: w.h1.sha256 } }
  : n === 2 ? { base: B2, helper: { sha256: w.h2.sha256 } }
    : n === 3 ? { base: B3, helper: { sha256: w.h3.sha256 } }
      : { base: B4, helper: { sha256: w.h4.sha256 } });

/** The campaign of an epoch world: epoch 1 for `first` (chunk ids), epoch 2 for the others. */
function writeEpochCampaign(w, first, extra) {
  const chunk = {};
  w.doc.chunks.forEach((c) => { chunk[c.chunkId] = pairOf(w, first.indexOf(c.chunkId) !== -1 ? 1 : 2); });
  writeCampaign(w, { times: lowTimes, chunk: Object.assign(chunk, extra || {}) });
}

const retainedOf = (w, ids) => ids.map((id) => {
  const slot = slotOf(w, id, 1);
  return { chunkId: id, runId: slot.runId,
    ledgerSha256: sha256(fs.readFileSync(path.join(w.repo, slot.dir, 'ledger.json'))) };
});

/** The base-2 record of an epoch world and its proof file (written to the world), with `over` applied. */
function epochRecord(w, retained, over) {
  const t = core.manifestTransition(core.parseHelperManifest(w.m1Text), core.parseHelperManifest(w.m2Text));
  const proof = { schema: core.PROOF_SCHEMA, previousBase: B1, checkpoint: CHK, campaignBase: B2,
    previousHelperManifestSha256: w.h1.sha256, helperManifestSha256: w.h2.sha256, changes: t.changes,
    identicalEntries: t.identical, committedDiff: w.diff.map((d) => d.status + ' ' + d.file).sort() };
  const proofText = JSON.stringify(proof, null, 2) + '\n';
  w.write(PROOF_REL, proofText);
  const requests = w.doc.chunks.filter((c) => retained.some((r) => r.chunkId === c.chunkId))
    .reduce((sum, c) => sum + c.n, 0);
  return Object.assign({ schema: core.EPOCH2_SCHEMA, campaignBase: B2, previousBase: B1, checkpoint: CHK,
    reason: 'a fixture', recordedAt: '2026-11-19T20:00:00+07:00', recordedBy: 'orchestrator',
    previousHelperManifest: { file: MANIFEST1_REL, sha256: w.h1.sha256, entries: w.h1.entries },
    helperManifest: { file: MANIFEST2_REL, sha256: w.h2.sha256, entries: w.h2.entries },
    allowedHelperChanges: t.changes, transitionProof: { file: PROOF_REL, sha256: hexOf(proofText) },
    retainedEvidence: { successes: retained },
    plan: { rawSha256: w.made.rawSha256, manifestSha256: w.doc.manifestSha256 },
    identities: { hashIdentity: w.doc.sources.hashIdentity, sources: w.doc.sources.sources,
      tableSha256: w.doc.targets.tableSha256 },
    environment: { node: w.doc.environment.node }, policy: { choice: w.doc.policy.choice },
    cutover: { successes: retained.length, requests } }, over || {});
}

/** A Git stand-in for the epoch checks; `o`: { commits, notAncestor (a regexp over "<a> <b>"), diff }. */
function epochGit(w, o) {
  const opts = o || {};
  return (args) => {
    if (args[0] === 'rev-parse') return HEADX + '\n';
    if (args[0] === 'rev-list') return String(opts.commits === undefined ? 1 : opts.commits) + '\n';
    if (args[0] === 'merge-base') {
      if (opts.notAncestor && opts.notAncestor.test(args[2] + ' ' + args[3])) {
        throw new Error('not an ancestor');
      }
      return '';
    }
    if (args[0] === 'diff' && args.indexOf('--name-status') !== -1) {
      const list = args[4] === B3 ? (opts.diff4 || w.diff4) : args[4] === B2 ? (opts.diff3 || w.diff3)
        : (opts.diff || w.diff);
      return list.map((d) => d.status + '\0' + d.file + '\0').join('');
    }
    if (args[0] === 'diff') return '';
    if (args[0] === 'show') {
      const shown = Object.assign({}, w.show, opts.show);
      if (shown[args[1]] !== undefined && shown[args[1]] !== null) return shown[args[1]];
    }
    throw new Error('unexpected git ' + args.join(' '));
  };
}

/**
 * One merge of an epoch world through merge-gp.js main(). `o`: { retained (ids of the epoch-1 chunks, default
 * the two first), record (an object), recordText, noRecord, recordOver, request (more request fields), base,
 * git (options of epochGit) }.
 */
function epochMerge(w, o) {
  const opts = o || {};
  const retained = retainedOf(w, opts.retained || ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25']);
  const record = opts.record || epochRecord(w, retained, opts.recordOver);
  const request = Object.assign({ expected: { base: opts.base || B2 },
    helpers: { manifestFile: w.h2.file, manifestSha256: w.h2.sha256, required: [], repoRoot: w.repo },
    epoch1: { base: B1, helperManifestSha256: w.h1.sha256, entries: w.h1.entries, manifestRel: MANIFEST1_REL,
      checkpoint: CHK } }, opts.request);
  if (!opts.noRecord) {
    request.epoch2Text = opts.recordText !== undefined ? opts.recordText : JSON.stringify(record) + '\n';
  }
  const { dir } = mergeRequestFile(w, 'all-79', request);
  fs.rmSync(path.join(dir, 'report.json'), { force: true });
  const lines = [];
  const code = mergeGp.main(['--plan=' + w.made.planRel, '--scope=all-79',
    '--out=' + path.join(dir, 'report.json')], { git: epochGit(w, opts.git), out: (t) => lines.push(t) });
  const file = path.join(dir, 'report.json');
  return { code, lines, text: lines.join('\n'),
    report: fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null };
}

// ---- epoch 3 (the release-history repair): three chained pairs (B1, H1), (B2, H2), (B3, H3)

/**
 * A world of three epochs. H3 differs from H2 in release-history.js, the wrapper, the merger (production) and
 * test files (one changed, two added); B2 contributes no success and one hold (a1 of the last chunk).
 * `o.h3` overrides entries of H3 (a null removes one); `o.h2`, `o.diff` as in epochWorld; `o.diff3`
 * replaces the committed B2 -> B3 diff.
 */
function epochWorld3(o) {
  const opts = o || {};
  const w = epochWorld(opts);
  const e3 = {};
  core.parseHelperManifest(w.m2Text).entries.forEach((hash, rel) => { e3[rel] = hash; });
  Object.assign(e3, { [HDIR + 'release-history.js']: hexOf('v3 history'),
    [HDIR + 'run-locked-c.ps1']: hexOf('v3 wrapper'), [HDIR + 'merge-core.js']: hexOf('v3 core'),
    [HDIR + 'merge-gp.js']: hexOf('v3 gp'), [HDIR + 'test-units.js']: hexOf('v3 units'),
    [HDIR + 'test-epoch3-proof.js']: hexOf('v3 proof tool'),
    [HDIR + 'standin-history.js']: hexOf('v3 standin') });
  Object.keys(opts.h3 || {}).forEach((k) => {
    if (opts.h3[k] === null) delete e3[k];
    else e3[k] = opts.h3[k];
  });
  w.m3Text = helperText(e3);
  w.h3 = { file: w.write(MANIFEST3_REL, w.m3Text), sha256: hexOf(w.m3Text), entries: Object.keys(e3).length };
  w.diff3 = opts.diff3 || [
    { status: 'M', file: HDIR + 'release-history.js' }, { status: 'M', file: HDIR + 'run-locked-c.ps1' },
    { status: 'M', file: HDIR + 'merge-core.js' }, { status: 'M', file: HDIR + 'merge-gp.js' },
    { status: 'M', file: HDIR + 'test-units.js' }, { status: 'A', file: HDIR + 'test-epoch3-proof.js' },
    { status: 'A', file: HDIR + 'standin-history.js' },
    { status: 'A', file: 'docs/difficulty-v3/evidence/MS18d/phase-c/helpers-c3-sha256.txt' },
    { status: 'A', file: standin.RUN_BASE + '/fakeb-easy/fakeb-easy.i25.n25.a1/result.json' },
    { status: 'M', file: 'docs/difficulty-v3/evidence/MS18d/phase-c/lock-log.jsonl' },
    { status: 'A', file: 'tasks/difficulty-v3/MS18d-epoch3-release-history-repair.md' }];
  return w;
}

/** The campaign of a three-epoch world: epoch 1 for two chunks, a B2-era hold and a B3 attempt 2. */
function writeCampaign3(w, extra) {
  const first = ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25'];
  const last = 'fakeb-easy.i25.n25';
  const chunk = {};
  first.forEach((id) => { chunk[id] = pairOf(w, 1); });
  chunk[last] = { skip: true };
  writeCampaign(w, { times: lowTimes, chunk });
  standin.writeHoldFolder(w.repo, slotOf(w, last, 1));
  standin.writeRunFolder(w.repo, w.made, slotOf(w, last, 2), Object.assign({ helper: w.helper,
    times: lowTimes(chunkOf(w, last)) }, pairOf(w, 3), extra || {}));
}

/** The base-3 record and its proof file (written to the world). `tagged`: the retained successes. */
function epochRecord3(w, tagged, holds, over) {
  const t = core.manifestTransition(core.parseHelperManifest(w.m2Text), core.parseHelperManifest(w.m3Text),
    core.EPOCH_STEPS[3].production);
  const proof = { schema: core.PROOF3_SCHEMA, previousBase: B2, checkpoint: CHK3, campaignBase: B3,
    previousHelperManifestSha256: w.h2.sha256, helperManifestSha256: w.h3.sha256, changes: t.changes,
    identicalEntries: t.identical, committedDiff: w.diff3.map((d) => d.status + ' ' + d.file).sort() };
  const proofText = JSON.stringify(proof, null, 2) + '\n';
  w.write(PROOF3_REL, proofText);
  const requests = w.doc.chunks.filter((c) => tagged.some((r) => r.chunkId === c.chunkId))
    .reduce((sum, c) => sum + c.n, 0);
  return Object.assign({ schema: core.EPOCH3_SCHEMA, campaignBase: B3, previousBase: B2, checkpoint: CHK3,
    reason: 'a fixture', recordedAt: '2026-11-19T22:00:00+07:00', recordedBy: 'orchestrator',
    previousHelperManifest: { file: MANIFEST2_REL, sha256: w.h2.sha256, entries: w.h2.entries },
    helperManifest: { file: MANIFEST3_REL, sha256: w.h3.sha256, entries: w.h3.entries },
    allowedHelperChanges: t.changes, transitionProof: { file: PROOF3_REL, sha256: hexOf(proofText) },
    retainedEvidence: { successes: tagged, holds },
    plan: { rawSha256: w.made.rawSha256, manifestSha256: w.doc.manifestSha256 },
    identities: { hashIdentity: w.doc.sources.hashIdentity, sources: w.doc.sources.sources,
      tableSha256: w.doc.targets.tableSha256 },
    environment: { node: w.doc.environment.node }, policy: { choice: w.doc.policy.choice },
    cutover: { successes: tagged.length, requests } }, over || {});
}

/**
 * One merge of a three-epoch world. `o`: { record2Over, record3, record3Over, tagged, holds, noRecord3,
 * record3Text, request, base, git }.
 */
function epochMerge3(w, o) {
  const opts = o || {};
  const first = ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25'];
  const retained2 = retainedOf(w, first);
  const tagged = opts.tagged || retained2.map((r) => Object.assign({ epoch: 1 }, r));
  const holds = opts.holds || ['fakeb-easy.i25.n25.a1'];
  const record2 = epochRecord(w, retained2, Object.assign({ retainedEvidence: { successes: retained2,
    holds: [] } }, opts.record2Over));
  const record3 = opts.record3 || epochRecord3(w, tagged, holds, opts.record3Over);
  const request = Object.assign({ expected: { base: opts.base || B3 },
    helpers: { manifestFile: w.h3.file, manifestSha256: w.h3.sha256, required: [], repoRoot: w.repo },
    epoch1: { base: B1, helperManifestSha256: w.h1.sha256, entries: w.h1.entries, manifestRel: MANIFEST1_REL,
      checkpoint: CHK }, epoch2Text: JSON.stringify(record2) + '\n', epoch3Checkpoint: CHK3 }, opts.request);
  if (!opts.noRecord3) {
    request.epoch3Text = opts.record3Text !== undefined ? opts.record3Text : JSON.stringify(record3) + '\n';
  }
  const { dir } = mergeRequestFile(w, 'all-79', request);
  fs.rmSync(path.join(dir, 'report.json'), { force: true });
  const lines = [];
  const code = mergeGp.main(['--plan=' + w.made.planRel, '--scope=all-79',
    '--out=' + path.join(dir, 'report.json')], { git: epochGit(w, opts.git), out: (t) => lines.push(t) });
  const file = path.join(dir, 'report.json');
  return { code, lines, text: lines.join('\n'),
    report: fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null };
}

async function epoch3Tests() {
  await test('epoch 3: three chained pairs merge: B1 successes, a B2-era hold, a B3 attempt 2', () => {
    const w = epochWorld3();
    writeCampaign3(w);
    const r = epochMerge3(w);
    assert.strictEqual(r.code, 0, r.text);
    assert.strictEqual(r.lines[r.lines.length - 1], RESULT_ALL + 'true successes=2 cells=2 required=2');
    assert.ok(r.lines.some((l) => /^ms18d-gp-merge-epochs 1=a1a1a1a1:\w{8} 2=b2b2b2b2:\w{8} 3=b3b3b3b3:\w{8}/
      .test(l)), r.text);
    assert.deepStrictEqual(r.report.consumed.map((c) => c.epoch.id).sort(), [1, 1, 3]);
    assert.deepStrictEqual(r.report.epochs.pairs.map((p) => p.id), [1, 2, 3]);
    assert.deepStrictEqual(r.report.epochs.chain.map((c) => c.epoch), [2, 3]);
    assert.strictEqual(r.report.identity.base, B3, 'the merge run itself is B3/H3');
    assert.strictEqual(r.report.identity.helperManifestSha256, w.h3.sha256);
    const holds = r.report.cells.filter((c) => c.cell === 'fakeb/easy')[0].chunks
      .filter((c) => c.chunkId === 'fakeb-easy.i25.n25')[0];
    assert.deepStrictEqual(holds.holdRuns, ['fakeb-easy.i25.n25.a1']);
  });

  await test('epoch 3: a merge at B2 reads only the base-2 record; a third pair needs its own record', () => {
    const w = epochWorld3();
    writeCampaign(w, { times: lowTimes, chunk: { 'fakeb-easy.i25.n25': pairOf(w, 2),
      'fakea-easy.i0.n50': pairOf(w, 1), 'fakeb-easy.i0.n25': pairOf(w, 1) } });
    const r = epochMerge(w, { request: { epoch3Text: 'not even json' } });
    assert.strictEqual(r.code, 0, r.text);
    assert.strictEqual(r.report.epochs.pairs.length, 2);
    const noRecord = epochMerge3(w, { noRecord3: true });
    assert.strictEqual(noRecord.code, 2);
    assert.ok(/is not a declared epoch: the base-3 record is not committed at HEAD/.test(noRecord.text),
      noRecord.text);
  });

  await test('epoch 3: B2 contributes no success; a ledger of (B2, H2) or any other pair is refused', () => {
    const cases = [
      ['a ledger of B2/H2', (w) => pairOf(w, 2), /an epoch-2 ledger that is not one of the retained/],
      ['a fourth pair', () => ({ base: 'c4'.repeat(20), helper: { sha256: 'e4'.repeat(32) } }),
        /identity pair .* is no declared epoch/],
      ['(B2, H3)', (w) => ({ base: B2, helper: { sha256: w.h3.sha256 } }), /is no declared epoch/],
      ['(B3, H2)', (w) => ({ base: B3, helper: { sha256: w.h2.sha256 } }), /is no declared epoch/],
      ['(B1, H3)', (w) => ({ base: B1, helper: { sha256: w.h3.sha256 } }), /is no declared epoch/]];
    cases.forEach(([what, pair, pattern]) => {
      const w = epochWorld3();
      writeCampaign3(w, pair(w));
      const r = epochMerge3(w);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(pattern.test(r.text), what + ': ' + r.text);
    });
  });

  await test('epoch 3: the base-3 record must be valid against the base-2 epoch', () => {
    const w = epochWorld3();
    writeCampaign3(w);
    const retained2 = retainedOf(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25']);
    const tagged = retained2.map((r) => Object.assign({ epoch: 1 }, r));
    const good = JSON.stringify(epochRecord3(w, tagged, ['fakeb-easy.i25.n25.a1'])) + '\n';
    const bad = (what, o, pattern) => {
      const r = epochMerge3(w, o);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(/^ms18d-gp-merge-invalid /m.test(r.text) && pattern.test(r.text), what + ': ' + r.text);
      assert.strictEqual(r.report, null, what + ': an invalid merge writes no report');
    };
    bad('two lines', { record3Text: good + good }, /base-3 record is not exactly one line/);
    bad('edited once', { git: { commits: 2 } }, /committed 2 times/);
    bad('another schema', { record3Over: { schema: core.EPOCH2_SCHEMA } }, /schema is not/);
    bad('another previous base', { record3Over: { previousBase: B1 } },
      /previousBase is not the declared base/);
    bad('another checkpoint', { record3Over: { checkpoint: CHK } }, /checkpoint is not the declared/);
    bad('another request base', { base: 'c4'.repeat(20) }, /is not a declared epoch/);
    bad('B3 is no ancestor of HEAD', { git: { notAncestor: new RegExp('^' + B3 + ' ' + HEADX) } },
      /B3 of HEAD is not an ancestor/);
    bad('the checkpoint is no ancestor of B3', { git: { notAncestor: new RegExp('^' + CHK3 + ' ' + B3) } },
      /the checkpoint of B3 is not an ancestor/);
    bad('B2 is no ancestor of the checkpoint', { git: { notAncestor: new RegExp('^' + B2 + ' ' + CHK3) } },
      /B2 of the checkpoint is not an ancestor/);
    bad('a record that retains epoch-1 successes unlike the base-2 record', { tagged: tagged.map((r, i) =>
      (i === 0 ? Object.assign({}, r, { ledgerSha256: 'e3'.repeat(32) }) : r)) },
    /epoch-1 successes are not those the previous record retained/);
    bad('a success without its epoch', { tagged: retained2 }, /retainedEvidence\.successes is not a list/);
    bad('a success of an epoch that is not before this one', { tagged: tagged.map((r) =>
      Object.assign({}, r, { epoch: 3 })) }, /retainedEvidence\.successes is not a list/);
    bad('holds that are no run ids', { holds: [5] }, /retainedEvidence\.holds is not a list of run ids/);
    bad('a cutover that is not the retained', { record3Over: { cutover: { successes: 9, requests: 1 } } },
      /cutover is not the retained successes/);
    bad('another helper manifest',
      { record3Over: { helperManifest: { sha256: 'e3'.repeat(32), entries: 1 } } },
      /helperManifest is not the manifest of the merge request/);
    bad('another previous manifest', { record3Over: { previousHelperManifest: { file: MANIFEST2_REL,
      sha256: 'e3'.repeat(32), entries: w.h2.entries } } }, /previousHelperManifest is not the declared/);
    bad('a damaged base-2 record', { record2Over: { schema: 'x' } }, /base-2 record: schema is not/);
    bad('a change list that is not the exact one', { record3Over: { allowedHelperChanges: [] } },
      /allowedHelperChanges is not the exact change list/);
    // the base-2 transition is judged by its own allowlist: release-history.js is no epoch-2 change
    const w2 = epochWorld3({ h2: { [HDIR + 'release-history.js']: hexOf('tampered in epoch 2') } });
    writeCampaign3(w2);
    const r2 = epochMerge3(w2);
    assert.strictEqual(r2.code, 2, r2.text);
    assert.ok(/base-2 record: the helper manifests differ in .*release-history\.js/.test(r2.text), r2.text);
  });

  await test('epoch 3: the manifests of B2 and B3 differ only in the four production files and tests', () => {
    const clean = epochWorld3();
    writeCampaign3(clean);
    assert.strictEqual(epochMerge3(clean).code, 0);
    const t = core.manifestTransition(core.parseHelperManifest(clean.m2Text),
      core.parseHelperManifest(clean.m3Text), core.EPOCH_STEPS[3].production);
    assert.deepStrictEqual(t.changes.map((c) => c.path.slice(HDIR.length) + ':' + c.class), [
      'merge-core.js:production', 'merge-gp.js:production', 'release-history.js:production',
      'run-locked-c.ps1:production', 'standin-history.js:test', 'test-epoch3-proof.js:test',
      'test-units.js:test']);
    const refuse = (what, h3, pattern) => {
      const w = epochWorld3({ h3 });
      writeCampaign3(w);
      const r = epochMerge3(w);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(pattern.test(r.text), what + ': ' + r.text);
    };
    refuse('the acquisition rule', { [HDIR + 'acquisition.js']: hexOf('x') }, /differ in .*acquisition\.js/);
    refuse('the controller', { [HDIR + 'controller.js']: hexOf('x') }, /differ in .*controller\.js/);
    refuse('the recorder', { [HDIR + 'record-gp.js']: hexOf('x') }, /differ in .*record-gp\.js/);
    refuse('readiness', { [HDIR + 'readiness-core.js']: hexOf('x') }, /differ in .*readiness-core\.js/);
    refuse('the plan', { 'docs/difficulty-v3/evidence/MS18d/phase-c/gp-chunk-manifest.json': hexOf('x') },
      /differ in .*gp-chunk-manifest\.json/);
    refuse('a removed production file', { [HDIR + 'release-history.js']: null },
      /differ in .*release-history/);
    refuse('a new production module', { [HDIR + 'new-module.js']: hexOf('x') }, /differ in .*new-module\.js/);
  });

  await test('epoch 3: the committed B2 -> B3 diff holds only the allowed paths', () => {
    const w = epochWorld3();
    writeCampaign3(w);
    const refuse = (what, extra, drop, pattern) => {
      const list = w.diff3.filter((d) => d.file !== drop).concat(extra);
      const r = epochMerge3(w, { git: { diff3: list } });
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(pattern.test(r.text), what + ': ' + r.text);
    };
    refuse('the acquisition rule', [{ status: 'M', file: HDIR + 'acquisition.js' }], null,
      /acquisition\.js: a helper file changed that is no change of the manifests/);
    refuse('an engine file', [{ status: 'M', file: 'generator/js/core/engine.js' }], null,
      /engine\.js: outside the allowed B1 -> B2 set/);
    refuse('a recorded base record changed', [{ status: 'M', file: MANIFEST2_REL }], null,
      /helpers-c2-sha256\.txt: recorded evidence was changed \(M\)/);
    refuse('a recorded run output deleted', [{ status: 'D', file: standin.RUN_BASE + '/x/y/ledger.json' }],
      null, /recorded evidence was changed \(D\)/);
    refuse('a manifest change missing from the diff', [], HDIR + 'release-history.js',
      /release-history\.js: a manifest change that is not in the committed diff/);
  });

  await test('epoch 3: no retagging, no discarded hold, no replacement of a started payload', () => {
    const first = ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25'];
    // a chunk recorded under epoch 1 that the records do not retain
    let w = epochWorld3();
    writeCampaign3(w);
    fs.rmSync(path.join(w.repo, slotOf(w, 'fakeb-easy.i25.n25', 2).dir), { recursive: true, force: true });
    standin.writeRunFolder(w.repo, w.made, slotOf(w, 'fakeb-easy.i25.n25', 2),
      Object.assign({ helper: w.helper, times: lowTimes(chunkOf(w, 'fakeb-easy.i25.n25')) }, pairOf(w, 1)));
    let r = epochMerge3(w);
    assert.strictEqual(r.code, 2);
    assert.ok(/fakeb-easy\.i25\.n25: an epoch-1 ledger that is not one of the retained successes/
      .test(r.text), r.text);
    // a retained epoch-1 chunk answered by an epoch-3 ledger
    w = epochWorld3();
    writeCampaign3(w);
    fs.rmSync(path.join(w.repo, slotOf(w, 'fakea-easy.i0.n50', 1).dir), { recursive: true, force: true });
    standin.writeRunFolder(w.repo, w.made, slotOf(w, 'fakea-easy.i0.n50', 1),
      Object.assign({ helper: w.helper, times: lowTimes(chunkOf(w, 'fakea-easy.i0.n50')) }, pairOf(w, 3)));
    r = epochMerge3(w, { tagged: retainedOf(w, first).map((x) => Object.assign({ epoch: 1 }, x)) });
    assert.strictEqual(r.code, 2);
    assert.ok(/a retained success is answered by an epoch-3 ledger/.test(r.text), r.text);
    // the B2 hold is discarded (its folder is gone)
    w = epochWorld3();
    writeCampaign3(w);
    fs.rmSync(path.join(w.repo, slotOf(w, 'fakeb-easy.i25.n25', 1).dir), { recursive: true, force: true });
    r = epochMerge3(w);
    assert.strictEqual(r.code, 2);
    assert.ok(/the retained hold fakeb-easy\.i25\.n25\.a1 is gone or is no hold/.test(r.text), r.text);
    // the hold run is a started failed payload now, not a hold
    w = epochWorld3();
    writeCampaign3(w);
    fs.rmSync(path.join(w.repo, slotOf(w, 'fakeb-easy.i25.n25', 1).dir), { recursive: true, force: true });
    standin.writeRunFolder(w.repo, w.made, slotOf(w, 'fakeb-easy.i25.n25', 1), Object.assign({
      helper: w.helper, times: lowTimes(chunkOf(w, 'fakeb-easy.i25.n25')),
      mutate: { 'wrapper.json': (x) => Object.assign({}, x, { outcome: 'stop', exit: 65 }) } },
    pairOf(w, 2)));
    r = epochMerge3(w);
    assert.strictEqual(r.code, 2);
    assert.ok(/a complete run follows a run that failed/.test(r.text), r.text);
    // a missing remaining record stays incomplete
    w = epochWorld3();
    writeCampaign3(w);
    fs.rmSync(path.join(w.repo, slotOf(w, 'fakeb-easy.i25.n25', 2).dir), { recursive: true, force: true });
    r = epochMerge3(w);
    assert.strictEqual(r.code, 2);
    assert.ok(/no complete run \(1 hold\(s\), 0 failed\)/.test(r.text), r.text);
  });
}

async function epochTests() {
  await test('epoch: two valid pairs merge; an epoch-1 hold then an epoch-2 attempt 2 is accepted', () => {
    const w = epochWorld();
    writeEpochCampaign(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25'],
      { 'fakeb-easy.i25.n25': { skip: true } });
    standin.writeHoldFolder(w.repo, slotOf(w, 'fakeb-easy.i25.n25', 1));
    standin.writeRunFolder(w.repo, w.made, slotOf(w, 'fakeb-easy.i25.n25', 2),
      Object.assign({ helper: w.helper, times: lowTimes(chunkOf(w, 'fakeb-easy.i25.n25')) },
        pairOf(w, 2)));
    const r = epochMerge(w);
    assert.strictEqual(r.code, 0, r.text);
    assert.strictEqual(r.lines[r.lines.length - 1], RESULT_ALL + 'true successes=2 cells=2 required=2');
    assert.ok(r.lines.some((l) => /^ms18d-gp-merge-epochs 1=a1a1a1a1:\w{8} 2=b2b2b2b2:\w{8} record=/.test(l)),
      r.text);
    assert.deepStrictEqual(r.report.consumed.map((c) => c.epoch.id).sort(), [1, 1, 2]);
    const second = r.report.consumed.filter((c) => c.epoch.id === 2)[0];
    assert.deepStrictEqual([second.epoch.base, second.epoch.helperManifestSha256], [B2, w.h2.sha256]);
    assert.strictEqual(r.report.identity.base, B2, 'the merge run itself is B2/H2');
    assert.strictEqual(r.report.identity.helperManifestSha256, w.h2.sha256);
    assert.strictEqual(r.report.epochs.pairs.length, 2);
    assert.ok(/^[0-9a-f]{64}$/.test(r.report.epochs.record.sha256));
  });

  await test('epoch: each ledger is judged against its OWN pair: no third pair, no swapped pair', () => {
    const third = { base: 'c3'.repeat(20), helper: { sha256: 'e3'.repeat(32) } };
    const cases = [['a third pair', third], ['(B1, H2)', { base: B1, helper: 'H2' }],
      ['(B2, H1)', { base: B2, helper: 'H1' }]];
    cases.forEach(([what, pair]) => {
      const w = epochWorld();
      const helper = pair.helper === 'H2' ? { sha256: w.h2.sha256 } : pair.helper === 'H1'
        ? { sha256: w.h1.sha256 } : pair.helper;
      writeEpochCampaign(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25'],
        { 'fakeb-easy.i25.n25': { base: pair.base, helper } });
      const r = epochMerge(w);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(/identity pair \(base, helper manifest\) is no declared epoch/.test(r.text), what + r.text);
      assert.strictEqual(r.report.complete, false);
    });
  });

  await test('epoch: no base-2 record, or one that is damaged, edited or not the pair of the request', () => {
    const w = epochWorld();
    writeEpochCampaign(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25']);
    const ok = epochMerge(w);
    assert.strictEqual(ok.code, 0, ok.text);
    const retained = retainedOf(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25']);
    const good = JSON.stringify(epochRecord(w, retained)) + '\n';
    const bad = (what, o, pattern) => {
      const r = epochMerge(w, o);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(/^ms18d-gp-merge-invalid /m.test(r.text) && pattern.test(r.text), what + ': ' + r.text);
      assert.strictEqual(r.report, null, what + ': an invalid merge writes no report');
    };
    bad('no record', { noRecord: true }, /base-2 record is not committed at HEAD/);
    bad('two lines', { recordText: good + good }, /not exactly one line/);
    bad('not JSON', { recordText: '{broken\n' }, /not JSON/);
    bad('an array', { recordText: '[]\n' }, /not JSON/);
    bad('edited once', { git: { commits: 2 } }, /committed 2 times/);
    bad('another schema', { recordOver: { schema: 'x' } }, /schema is not/);
    bad('another base than the request', { base: 'c3'.repeat(20) },
      /is not a declared epoch: the base-3 record/);
    bad('epoch 1 as epoch 2', { recordOver: { campaignBase: B1 }, base: B1,
      request: { helpers: { manifestFile: w.h2.file, manifestSha256: w.h2.sha256, repoRoot: w.repo } } },
    /helper manifest of the request is not the declared one of epoch 1/);
    bad('another previous base', { recordOver: { previousBase: 'c3'.repeat(20) } },
      /previousBase is not the declared base/);
    bad('another checkpoint', { recordOver: { checkpoint: 'c3'.repeat(20) } },
      /checkpoint is not the declared/);
    bad('another helper manifest',
      { recordOver: { helperManifest: { sha256: 'e3'.repeat(32), entries: 1 } } },
      /helperManifest is not the manifest of the merge request/);
    bad('another previous manifest', { recordOver: { previousHelperManifest: { file: MANIFEST1_REL,
      sha256: 'e3'.repeat(32), entries: w.h1.entries } } }, /previousHelperManifest is not the declared/);
    bad('another plan',
      { recordOver: { plan: { rawSha256: 'e3'.repeat(32), manifestSha256: 'e3'.repeat(32) } } },
      /plan is not the plan/);
    bad('other identities',
      { recordOver: { identities: { hashIdentity: 'x', sources: 'y', tableSha256: 'z' } } },
      /identities are not those of the plan/);
    bad('no retained successes', { recordOver: { retainedEvidence: { successes: [] } } },
      /retainedEvidence\.successes is not a list/);
    bad('a cutover that is not the retained', { recordOver: { cutover: { successes: 7, requests: 1 } } },
      /cutover is not the retained successes/);
  });

  await test('epoch: the helper manifests may differ only in the three production files and tests', () => {
    const w0 = epochWorld();
    writeEpochCampaign(w0, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25']);
    const clean = epochMerge(w0);
    assert.strictEqual(clean.code, 0, clean.text);
    assert.deepStrictEqual(clean.report.consumed.length, 3);
    const t = core.manifestTransition(core.parseHelperManifest(w0.m1Text),
      core.parseHelperManifest(w0.m2Text));
    assert.deepStrictEqual(t.changes.map((c) => c.path.slice(HDIR.length) + ':' + c.class), [
      'merge-core.js:production', 'merge-gp.js:production', 'run-locked-c.ps1:production',
      'test-epoch2-proof.js:test', 'test-units.js:test']);
    assert.strictEqual(t.changes[3].before, null, 'an added test file has no before hash');
    assert.strictEqual(t.identical, Object.keys(helperEntries('v1')).length - 4);
    const refuse = (what, h2, pattern) => {
      const w = epochWorld({ h2 });
      writeEpochCampaign(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25']);
      const r = epochMerge(w);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(pattern.test(r.text), what + ': ' + r.text);
    };
    refuse('the recorder', { [HDIR + 'record-gp.js']: hexOf('tampered') }, /differ in .*record-gp\.js/);
    refuse('the controller', { [HDIR + 'controller.js']: hexOf('tampered') }, /differ in .*controller\.js/);
    refuse('readiness', { [HDIR + 'readiness-core.js']: hexOf('tampered') }, /differ in .*readiness-core/);
    refuse('the plan', { 'docs/difficulty-v3/evidence/MS18d/phase-c/gp-chunk-manifest.json': hexOf('x') },
      /differ in .*gp-chunk-manifest\.json/);
    refuse('a new production module', { [HDIR + 'new-module.js']: hexOf('x') }, /differ in .*new-module\.js/);
    refuse('a removed production file', { [HDIR + 'merge-core.js']: null }, /differ in .*merge-core\.js/);
    refuse('a test file outside the folder', { 'generator/tests/test-extra.js': hexOf('x') },
      /differ in generator\/tests\/test-extra\.js/);
    refuse('a nested test file', { [HDIR + 'sub/test-x.js']: hexOf('x') }, /differ in .*sub\/test-x\.js/);
    refuse('a test-looking helper with another name', { [HDIR + 'fake-gp.js']: hexOf('x') },
      /differ in .*fake-gp\.js/);
    // a record whose change list is not the exact one
    const w = epochWorld();
    writeEpochCampaign(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25']);
    const list = core.manifestTransition(core.parseHelperManifest(w.m1Text),
      core.parseHelperManifest(w.m2Text)).changes;
    const dropped = epochMerge(w, { recordOver: { allowedHelperChanges: list.slice(1) } });
    assert.strictEqual(dropped.code, 2);
    assert.ok(/allowedHelperChanges is not the exact change list/.test(dropped.text), dropped.text);
    const forged = list.map((c, i) => (i === 0 ? Object.assign({}, c, { after: 'e3'.repeat(32) }) : c));
    assert.strictEqual(epochMerge(w, { recordOver: { allowedHelperChanges: forged } }).code, 2);
  });

  await test('epoch: the committed B1 -> B2 diff holds only the allowed paths and the ancestry holds', () => {
    const w = epochWorld();
    writeEpochCampaign(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25']);
    const withDiff = (extra) => w.diff.concat(extra);
    const refuse = (what, o, pattern) => {
      const r = epochMerge(w, o);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(pattern.test(r.text), what + ': ' + r.text);
    };
    const engine = { status: 'M', file: 'generator/js/core/engine.js' };
    refuse('an engine file', { git: { diff: withDiff([engine]) } },
      /generator\/js\/core\/engine\.js: outside the allowed B1 -> B2 set/);
    refuse('a helper that is no manifest change',
      { git: { diff: withDiff([{ status: 'M', file: HDIR + 'controller.js' }]) } },
      /controller\.js: a helper file changed that is no change of the manifests/);
    const frozenRecord = { status: 'M', file: MANIFEST1_REL };
    refuse('a recorded evidence file changed', { git: { diff: withDiff([frozenRecord]) } },
    /helpers-c1b-sha256\.txt: recorded evidence was changed \(M\)/);
    refuse('a recorded output deleted',
      { git: { diff: withDiff([{ status: 'D', file: standin.RUN_BASE + '/fakeb-easy/x/ledger.json' }]) } },
      /recorded evidence was changed \(D\)/);
    refuse('a manifest change missing from the diff',
      { git: { diff: w.diff.filter((d) => d.file !== HDIR + 'merge-gp.js') } },
      /merge-gp\.js: a manifest change that is not in the committed diff/);
    refuse('a path that leaves the repository',
      { git: { diff: withDiff([{ status: 'A', file: 'tasks/difficulty-v3/../x' }]) } },
      /leaves the repository/);
    refuse('B1 is no ancestor of the checkpoint', { git: { notAncestor: new RegExp('^' + B1 + ' ' + CHK) } },
      /B1 of the checkpoint is not an ancestor/);
    refuse('the checkpoint is no ancestor of B2', { git: { notAncestor: new RegExp('^' + CHK + ' ' + B2) } },
      /the checkpoint of B2 is not an ancestor/);
    refuse('B2 is no ancestor of HEAD', { git: { notAncestor: new RegExp('^' + B2 + ' ' + HEADX) } },
      /B2 of HEAD is not an ancestor/);
  });

  await test('epoch: the transition proof is the committed, cited bytes and the recomputed facts', () => {
    const w = epochWorld();
    writeEpochCampaign(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25']);
    const retained = retainedOf(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25']);
    const record = epochRecord(w, retained);
    const pristine = fs.readFileSync(path.join(w.repo, PROOF_REL), 'utf8');
    const refuse = (what, rec, pattern) => {
      const r = epochMerge(w, { record: rec });
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(pattern.test(r.text), what + ': ' + r.text);
    };
    assert.strictEqual(epochMerge(w, { record }).code, 0);
    refuse('a proof of other bytes', Object.assign({}, record, { transitionProof: {
      file: PROOF_REL, sha256: 'e3'.repeat(32) } }), /transition proof is missing or not the cited bytes/);
    refuse('a missing proof', Object.assign({}, record, { transitionProof: {
      file: 'tasks/difficulty-v3/none.json', sha256: record.transitionProof.sha256 } }),
    /transition proof is missing/);
    refuse('a proof that leaves the repository', Object.assign({}, record, { transitionProof: {
      file: '../x.json', sha256: record.transitionProof.sha256 } }), /transitionProof leaves the repository/);
    refuse('no proof', Object.assign({}, record, { transitionProof: 'x' }), /transitionProof is not/);
    const damaged = (change) => {
      const doc = JSON.parse(pristine);
      change(doc);
      const text = JSON.stringify(doc, null, 2) + '\n';
      w.write(PROOF_REL, text);
      return Object.assign({}, record, { transitionProof: { file: PROOF_REL, sha256: hexOf(text) } });
    };
    refuse('another diff list', damaged((d) => { d.committedDiff.pop(); }),
      /differs from the recomputed committedDiff/);
    refuse('another identical count', damaged((d) => { d.identicalEntries++; }),
      /differs from the recomputed identicalEntries/);
    refuse('another change list', damaged((d) => { d.changes[0].after = 'e3'.repeat(32); }),
      /differs from the recomputed changes/);
    refuse('another checkpoint', damaged((d) => { d.checkpoint = 'c3'.repeat(20); }),
      /differs from the recomputed checkpoint/);
  });

  await test('epoch: the epoch-1 ledgers are exactly the retained successes; none retagged, replaced', () => {
    const first = ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25'];
    // a retained ledger whose digest is not the record's
    let w = epochWorld();
    writeEpochCampaign(w, first);
    let retained = retainedOf(w, first);
    retained[0].ledgerSha256 = 'e3'.repeat(32);
    let r = epochMerge(w, { record: epochRecord(w, retained) });
    assert.strictEqual(r.code, 2);
    assert.ok(/fakea-easy\.i0\.n50: an epoch-1 ledger that is not one of the retained successes/.test(r.text),
      r.text);
    // an epoch-1 ledger of a chunk the record does not retain (a payload recorded after the cutover)
    w = epochWorld();
    writeEpochCampaign(w, first.concat(['fakeb-easy.i25.n25']));
    r = epochMerge(w, { retained: first });
    assert.strictEqual(r.code, 2);
    assert.ok(/fakeb-easy\.i25\.n25: an epoch-1 ledger that is not one of the retained successes/
      .test(r.text), r.text);
    // a retained chunk answered by an epoch-2 ledger
    w = epochWorld();
    writeEpochCampaign(w, ['fakeb-easy.i0.n25'], { 'fakea-easy.i0.n50': pairOf(w, 2) });
    retained = retainedOf(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25']);
    r = epochMerge(w, { record: epochRecord(w, retained) });
    assert.strictEqual(r.code, 2);
    assert.ok(/a retained success is answered by an epoch-2 ledger/.test(r.text), r.text);
    // a retained success that the merge does not consume as an epoch-1 ledger
    w = epochWorld();
    writeEpochCampaign(w, ['fakeb-easy.i0.n25']);
    r = epochMerge(w, { retained: first });
    assert.strictEqual(r.code, 2);
    assert.ok(/the retained successes are 2, the epoch-1 ledgers of the merge 1/.test(r.text) ||
      /a retained success is answered/.test(r.text), r.text);
    // a started payload that failed is never replaced, across epochs either
    w = epochWorld();
    writeEpochCampaign(w, first, { 'fakeb-easy.i25.n25': { skip: true } });
    standin.writeRunFolder(w.repo, w.made, slotOf(w, 'fakeb-easy.i25.n25', 1), Object.assign({
      helper: w.helper, times: lowTimes(chunkOf(w, 'fakeb-easy.i25.n25')),
      mutate: { 'wrapper.json': (x) => Object.assign({}, x, { outcome: 'stop', exit: 65 }) } },
    pairOf(w, 1)));
    standin.writeRunFolder(w.repo, w.made, slotOf(w, 'fakeb-easy.i25.n25', 2), Object.assign({
      helper: w.helper, times: lowTimes(chunkOf(w, 'fakeb-easy.i25.n25')) }, pairOf(w, 2)));
    r = epochMerge(w);
    assert.strictEqual(r.code, 2);
    assert.ok(/a complete run follows a run that failed/.test(r.text), r.text);
  });

  await test('epoch: a missing remaining record is incomplete, never a fabricated success', () => {
    const w = epochWorld();
    writeEpochCampaign(w, ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25'],
      { 'fakeb-easy.i25.n25': { skip: true } });
    const r = epochMerge(w);
    assert.strictEqual(r.code, 2, r.text);
    assert.ok(/no complete run \(0 hold\(s\), 0 failed\)/.test(r.text), r.text);
    assert.strictEqual(r.report.complete, false);
    assert.deepStrictEqual(r.report.consumed.map((c) => c.chunkId), ['fakea-easy.i0.n50'],
      'only the complete cell is consumed, as an epoch-1 ledger');
  });

  await test('epoch tooling: --data emits the exact change list; a disallowed difference is exit 2', () => {
    const tool = path.join(__dirname, 'test-epoch2-proof.js');
    const run = (w) => spawnSync(process.execPath, [tool, '--data',
      '--h1=' + path.join(w.repo, MANIFEST1_REL), '--h2=' + w.h2.file], { encoding: 'utf8' });
    const w = epochWorld();
    const ok = run(w);
    assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);
    const data = JSON.parse(ok.stdout);
    const want = core.manifestTransition(core.parseHelperManifest(w.m1Text),
      core.parseHelperManifest(w.m2Text));
    assert.deepStrictEqual(data.allowedHelperChanges, want.changes);
    assert.strictEqual(data.identicalEntries, want.identical);
    assert.deepStrictEqual([data.previousHelperManifest.sha256, data.helperManifest.sha256],
      [w.h1.sha256, w.h2.sha256]);
    assert.deepStrictEqual([data.previousHelperManifest.entries, data.helperManifest.entries],
      [w.h1.entries, w.h2.entries]);
    const bad = run(epochWorld({ h2: { [HDIR + 'controller.js']: hexOf('tampered') } }));
    assert.strictEqual(bad.status, 2);
    assert.ok(/differ in .*controller\.js, which is no allowed change/.test(bad.stdout), bad.stdout);
  });

  await test('epoch: a request at the base of epoch 1 needs no record; real merges use the constants', () => {
    const e1 = core.EPOCH1;
    const ctx = (over) => Object.assign({ standin: false, request: {}, base: e1.base,
      helperSha: e1.helperManifestSha256 }, over);
    const git = () => { throw new Error('no git'); };
    const single = mergeGp.epochsOf(ctx(), git);
    assert.deepStrictEqual(single.pairs.map((p) => p.id), [1]);
    assert.strictEqual(single.record, null);
    assert.throws(() => mergeGp.epochsOf(ctx({ helperSha: 'e3'.repeat(32) }), git),
      /helper manifest of the request is not the declared one of epoch 1/);
    assert.throws(() => mergeGp.epochsOf(ctx({ base: 'c3'.repeat(20) }), git),
      /HEAD cannot be read/);
    // a real request cannot declare its own epoch 1: its own pair is no declared pair
    const own = ctx({ request: { epoch1: { base: B1, helperManifestSha256: 'e3'.repeat(32) } },
      base: B1, helperSha: 'e3'.repeat(32) });
    assert.throws(() => mergeGp.epochsOf(own, git), /HEAD cannot be read/);
    assert.strictEqual(e1.base, 'a2e6423a52a89dd36ee646aa14706dd2369e087f');
    assert.strictEqual(e1.helperManifestSha256,
      '5feeb42f31148b086105ac8579d7c3dbfab14193d460fa8a5a0bc05ce95def03');
    assert.strictEqual(e1.checkpoint, '4db0114e0acd325a34b29a7741ca8eb75e178813');
    assert.strictEqual(e1.entries, 52);
  });
}

// ---- epoch 4 (B4, the owner-approved a3 exceptions): four chained pairs, the V2 plan for the last

const MANIFEST4_REL = 'docs/difficulty-v3/evidence/MS18d/phase-c/helpers-c4-sha256.txt';
const PROOF4_REL = 'tasks/difficulty-v3/MS18d-gp-campaign-base-4-proof.json';
const V1_FWD = 'docs/difficulty-v3/evidence/MS18d/phase-c/gp-chunk-manifest.json';
const V2_BACK = core.V2_PLAN_REL.replace(/\//g, '\\');
const OWNER_COMMIT = 'c7'.repeat(20);
// the three candidate cells are named like the real ones (the merger never runs `measure`)
const ROWS4 = [
  { key: 'fakea/easy', variant: 'fakea', level: 'easy', target: 100, chunks: [[0, 50, 70]] },
  { key: 'fakeb/easy', variant: 'fakeb', level: 'easy', target: 300, chunks: [[0, 25, 60], [25, 25, 60]] },
  { key: 'mega16/easy', variant: 'mega16', level: 'easy', target: 100, chunks: [[0, 50, 70]] },
  { key: 'hyper/hard', variant: 'hyper', level: 'hard', target: 100, chunks: [[0, 50, 70]] },
  { key: 'butterfly/master', variant: 'butterfly', level: 'master', target: 100, chunks: [[0, 50, 70]] }];
const CAND = plan.CANDIDATES.map((c) => c.chunkId);
const FIRST4 = ['fakea-easy.i0.n50', 'fakeb-easy.i0.n25'];
const LATE4 = 'fakeb-easy.i25.n25';
const ALL_HOLDS = [].concat(...CAND.map((id) => [id + '.a1', id + '.a2']));
const masksOf = (n) => Array.from({ length: n }, (_, i) => i);
const lettersOf = (mask) => [0, 1, 2].map((i) => ((mask >> i) & 1 ? 'A' : 'B'));

/** The owner selector of question `q` (2..4) as the pack file has it, for the whole reply `letters`. */
const selectorOf = (q, letters) => ({ question: 'MS18d-Q' + q, choice: letters[q - 2], owner: 'amicably8850',
  answeredAt: '2026-11-19T22:50:08.320Z', source: { channel: 'ai-agent-session2',
    channelId: '1571779348573323334', messageId: '1573108143389675704' },
answer: 'Q2=' + letters[0] + ', Q3=' + letters[1] + ', Q4=' + letters[2],
binding: 'Q' + q + '=' + letters[q - 2],
questionMessageId: '15729771244768' + q, reAskMessageId: '1573095012768682146', chunkId: CAND[q - 2],
cell: 'x/y', queuePosition: 20 + q });

/** The pack file text at the owner commit: the subsection with its text fence of `S-OD<n> {json}` lines. */
const ownerFileText = (letters, edit) => {
  let lines = [2, 3, 4].map((q) => 'S-OD' + (14 + q) + ' ' + JSON.stringify(selectorOf(q, letters)));
  if (edit) lines = edit(lines);
  return ['# check-list', '', '## 4 decisions', '', '### S-OD16 / S-OD17 / S-OD18 — owner-choice records', '',
    'Each V2 ref cites the commit that adds these lines.', '', '```text'].concat(lines,
    ['```', '', 'end', '']).join('\n');
};

/**
 * The question wordings as the proof tool is given them in the tests: Q2 and Q3 at the owner commit, Q4 (its
 * posted text archived later) at its own pack commit, with the SHA-256 of the synthetic text fence.
 */
const W_COMMIT = 'e8'.repeat(20);
const Q4_FENCE = '**MS18d-Q4 (a synthetic posted question)**\n\nAnh chọn **Q4=A** hoặc **Q4=B**.';
const TEST_WORDING = proofTool.WORDING.map((x) => (x.decisionId === 'S-OD18' ? Object.assign({}, x, {
  commit: W_COMMIT, messageId: '1573073374584774872', fenceSha256: sha256(Buffer.from(Q4_FENCE, 'utf8')) })
  : x));

/** The wording files the owner decisions point to (a heading and a block quote naming the question). */
const wordingFiles = () => {
  const files = {};
  TEST_WORDING.forEach((x) => {
    const body = x.fenceSha256 ? ['Message ' + x.messageId + '.', '', '````text'].concat(Q4_FENCE.split('\n'),
      ['````']) : ['> **' + x.question + ':** the posted question'];
    files[(x.commit || OWNER_COMMIT) + ':' + x.file] = ['# a pack file', '', '## ' + x.section, '']
      .concat(body, ['', '## next', '']).join('\n');
  });
  return files;
};

/**
 * A world of four epochs, B1 to B3 on the V1 plan and B4 on the V2 plan. `o`: { letters (the answers of
 * Q2, Q3, Q4: the subset S is read from them), v2Edit(doc) (a change of the V2 document, rehashed), h4
 * (overrides of H4, null removes one), diff4, plus the options of epochWorld3 }.
 */
function epochWorld4(o) {
  const opts = o || {};
  const w = epochWorld3(Object.assign({}, opts, { rows: ROWS4 }));
  const letters = opts.letters || ['A', 'A', 'A'];
  // what the pack file holds at the owner commit (the V2 is built from `letters`, the file may differ)
  w.ownerText = ownerFileText(opts.ownerLetters || letters, opts.ownerEdit);
  w.show = Object.assign({ [OWNER_COMMIT + ':' + plan.OWNER_FILE]: w.ownerText }, wordingFiles());
  w.v1ref = { file: V1_FWD, rawSha256: w.made.rawSha256 };
  const granted = plan.resolveSubset(plan.parseOwnerSelectors(ownerFileText(letters)).entries,
    OWNER_COMMIT).granted;
  const v2 = plan.buildManifestV2(w.doc, w.v1ref, granted);
  if (opts.v2Edit) {
    opts.v2Edit(v2);
    const rest = Object.assign({}, v2);
    delete rest.manifestSha256;
    v2.manifestSha256 = plan.canonicalSha256(rest);
  }
  const v2Text = JSON.stringify(v2, null, 2) + '\n';
  w.write(core.V2_PLAN_REL, v2Text);
  w.v2 = v2;
  w.v2raw = hexOf(v2Text);
  w.made4 = { doc: v2, planRel: V2_BACK, rawSha256: w.v2raw };
  const e4 = {};
  core.parseHelperManifest(w.m3Text).entries.forEach((hash, rel) => { e4[rel] = hash; });
  Object.assign(e4, { [HDIR + 'plan-data.js']: hexOf('v4 plan'), [HDIR + 'attempts.js']: hexOf('v4 attempts'),
    [HDIR + 'payload-gp.js']: hexOf('v4 payload'), [HDIR + 'run-locked-c.ps1']: hexOf('v4 wrapper'),
    [HDIR + 'merge-core.js']: hexOf('v4 core'), [HDIR + 'merge-gp.js']: hexOf('v4 gp'),
    [HDIR + 'test-units.js']: hexOf('v4 units'), [HDIR + 'test-plan.js']: hexOf('v4 plan tests'),
    [HDIR + 'test-recorder-merge.js']: hexOf('v4 merge tests'),
    [HDIR + 'test-run-locked-c.ps1']: hexOf('v4 wrapper tests'),
    [HDIR + 'test-epoch4-proof.js']: hexOf('v4 proof tool'), [core.V2_PLAN_REL]: hexOf(v2Text) });
  Object.keys(opts.h4 || {}).forEach((k) => {
    if (opts.h4[k] === null) delete e4[k];
    else e4[k] = opts.h4[k];
  });
  w.m4Text = helperText(e4);
  w.h4 = { file: w.write(MANIFEST4_REL, w.m4Text), sha256: hexOf(w.m4Text), entries: Object.keys(e4).length };
  w.diff4 = opts.diff4 || [
    { status: 'M', file: HDIR + 'plan-data.js' }, { status: 'M', file: HDIR + 'attempts.js' },
    { status: 'M', file: HDIR + 'payload-gp.js' }, { status: 'M', file: HDIR + 'run-locked-c.ps1' },
    { status: 'M', file: HDIR + 'merge-core.js' }, { status: 'M', file: HDIR + 'merge-gp.js' },
    { status: 'M', file: HDIR + 'test-units.js' }, { status: 'M', file: HDIR + 'test-plan.js' },
    { status: 'M', file: HDIR + 'test-recorder-merge.js' },
    { status: 'M', file: HDIR + 'test-run-locked-c.ps1' },
    { status: 'A', file: HDIR + 'test-epoch4-proof.js' }, { status: 'A', file: core.V2_PLAN_REL },
    { status: 'A', file: MANIFEST4_REL },
    { status: 'A', file: standin.RUN_BASE + '/mega16-easy/mega16-easy.i0.n50.a3/ledger.json' },
    { status: 'M', file: 'docs/difficulty-v3/evidence/MS18d/phase-c/lock-log.jsonl' },
    { status: 'A', file: 'tasks/difficulty-v3/MS18d-gp-campaign-base-4.jsonl' }];
  return w;
}

/**
 * The campaign of a four-epoch world: two epoch-1 successes, one epoch-3 success, a1 and a2 holds of every
 * candidate and, for each chunk of S (read from the V2 plan), a complete a3 under (B4, H4).
 * `o`: { a3 (options of writeRunFolder for every a3), noA3 (no a3 folder at all) }.
 */
function writeCampaign4(w, o) {
  const opts = o || {};
  const chunk = {};
  FIRST4.forEach((id) => { chunk[id] = pairOf(w, 1); });
  chunk[LATE4] = pairOf(w, 3);
  CAND.forEach((id) => { chunk[id] = { skip: true }; });
  writeCampaign(w, { times: lowTimes, chunk });
  CAND.forEach((id) => [1, 2].forEach((n) => standin.writeHoldFolder(w.repo, slotOf(w, id, n))));
  if (opts.noA3) return;
  (w.v2.admissionExceptions || []).forEach((e) => {
    const slot = w.v2.runSlots.filter((s) => s.role === 'chunk' && s.runId === e.runId)[0];
    standin.writeRunFolder(w.repo, w.made4, slot, Object.assign({ helper: pairOf(w, 4).helper, base: B4,
      times: lowTimes(chunkOf(w, e.chunkId)) }, opts.a3));
  });
}

/** The base-4 `ownerDecisions` as the proof tool makes them from the owner commit (the fake Git). */
function ownerDecisions(w) {
  try {
    return proofTool.ownerDecisionsAt(epochGit(w), OWNER_COMMIT, TEST_WORDING);
  } catch (err) {
    return [];
  }
}

/** The base-4 record and its proof file (written to the world); `over` replaces top-level fields. */
function epochRecord4(w, tagged, holds, over) {
  const step = core.EPOCH_STEPS[4];
  const t = core.manifestTransition(core.parseHelperManifest(w.m3Text), core.parseHelperManifest(w.m4Text),
    step.production, step.tests, step.dataFiles, step.addedTests);
  const proof = { schema: core.PROOF4_SCHEMA, previousBase: B3, checkpoint: CHK4, campaignBase: B4,
    previousHelperManifestSha256: w.h3.sha256, helperManifestSha256: w.h4.sha256, changes: t.changes,
    identicalEntries: t.identical, committedDiff: w.diff4.map((d) => d.status + ' ' + d.file).sort() };
  const proofText = JSON.stringify(proof, null, 2) + '\n';
  w.write(PROOF4_REL, proofText);
  const requests = w.doc.chunks.filter((c) => tagged.some((r) => r.chunkId === c.chunkId))
    .reduce((sum, c) => sum + c.n, 0);
  return Object.assign({ schema: core.EPOCH4_SCHEMA, campaignBase: B4, previousBase: B3, checkpoint: CHK4,
    reason: 'a fixture', recordedAt: '2026-11-20T12:00:00+07:00', recordedBy: 'orchestrator',
    previousHelperManifest: { file: MANIFEST3_REL, sha256: w.h3.sha256, entries: w.h3.entries },
    helperManifest: { file: MANIFEST4_REL, sha256: w.h4.sha256, entries: w.h4.entries },
    allowedHelperChanges: t.changes, transitionProof: { file: PROOF4_REL, sha256: hexOf(proofText) },
    retainedEvidence: { successes: tagged, holds },
    plan: { file: core.V2_PLAN_REL, rawSha256: w.v2raw, manifestSha256: w.v2.manifestSha256 },
    previousPlan: { file: V1_FWD, rawSha256: w.made.rawSha256, manifestSha256: w.doc.manifestSha256 },
    campaignRoot: B1, ownerDecisionCommit: OWNER_COMMIT, ownerDecisions: ownerDecisions(w),
    admissionExceptions: w.v2.admissionExceptions,
    exceptionOrder: (w.v2.admissionExceptions || []).map((e) => e.runId),
    identities: { hashIdentity: w.doc.sources.hashIdentity, sources: w.doc.sources.sources,
      tableSha256: w.doc.targets.tableSha256 },
    environment: { node: w.doc.environment.node }, policy: { choice: w.doc.policy.choice },
    cutover: { successes: tagged.length, requests } }, over || {});
}

/**
 * One merge of a four-epoch world through merge-gp.js main(). `o`: { record2Over, record3Over, record4,
 * record4Over, tagged, holds, noRecord4, record4Text, planRel (the plan the merge request names), request,
 * base, git }.
 */
function epochMerge4(w, o) {
  const opts = o || {};
  const retained2 = retainedOf(w, FIRST4);
  const tagged3 = retained2.map((r) => Object.assign({ epoch: 1 }, r));
  const tagged4 = tagged3.concat(retainedOf(w, [LATE4]).map((r) => Object.assign({ epoch: 3 }, r)));
  const v1Plan = { file: V1_FWD, rawSha256: w.made.rawSha256, manifestSha256: w.doc.manifestSha256 };
  const record2 = epochRecord(w, retained2, Object.assign({ plan: v1Plan,
    retainedEvidence: { successes: retained2, holds: [] } }, opts.record2Over));
  const record3 = epochRecord3(w, tagged3, [CAND[0] + '.a1', CAND[0] + '.a2'],
    Object.assign({ plan: v1Plan }, opts.record3Over));
  const record4 = opts.record4 || epochRecord4(w, typeof opts.tagged === 'function' ? opts.tagged(tagged4)
    : opts.tagged || tagged4, opts.holds || ALL_HOLDS, opts.record4Over);
  const planRel = opts.planRel || V2_BACK;
  const planBytes = fs.readFileSync(path.join(w.repo, planRel));
  const planDoc = JSON.parse(planBytes.toString('utf8'));
  const request = Object.assign({ expected: { base: opts.base || B4 },
    plan: { file: planRel, rawSha256: sha256(planBytes), manifestSha256: planDoc.manifestSha256 },
    helpers: { manifestFile: w.h4.file, manifestSha256: w.h4.sha256, required: [], repoRoot: w.repo },
    epoch1: { base: B1, helperManifestSha256: w.h1.sha256, entries: w.h1.entries, manifestRel: MANIFEST1_REL,
      checkpoint: CHK }, epoch2Text: JSON.stringify(record2) + '\n',
    epoch3Text: JSON.stringify(record3) + '\n',
    epoch3Checkpoint: CHK3, epoch4Checkpoint: CHK4 }, opts.request);
  if (!opts.noRecord4) {
    request.epoch4Text = opts.record4Text !== undefined ? opts.record4Text : JSON.stringify(record4) + '\n';
  }
  const { dir } = mergeRequestFile(w, 'all-79', request);
  fs.rmSync(path.join(dir, 'report.json'), { force: true });
  const lines = [];
  const code = mergeGp.main(['--plan=' + planRel, '--scope=all-79', '--out=' + path.join(dir, 'report.json')],
    { git: epochGit(w, opts.git), out: (t) => lines.push(t) });
  const file = path.join(dir, 'report.json');
  return { code, lines, text: lines.join('\n'),
    report: fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null };
}

async function epoch4Tests() {
  await test('epoch 4: four chained pairs merge (V1 for B1 to B3, V2 for B4); every a3 counts once', () => {
    const w = epochWorld4();
    writeCampaign4(w);
    const r = epochMerge4(w);
    assert.strictEqual(r.code, 0, r.text);
    assert.strictEqual(r.lines[r.lines.length - 1], RESULT_ALL + 'true successes=5 cells=5 required=5');
    const epochsLine = new RegExp('^ms18d-gp-merge-epochs 1=a1a1a1a1:\\w{8} 2=b2b2b2b2:\\w{8} ' +
      '3=b3b3b3b3:\\w{8} 4=b4b4b4b4:\\w{8}');
    assert.ok(r.lines.some((l) => epochsLine.test(l)), r.text);
    assert.deepStrictEqual(r.report.consumed.map((c) => c.epoch.id).sort(), [1, 1, 3, 4, 4, 4]);
    assert.deepStrictEqual(r.report.epochs.pairs.map((p) => p.id), [1, 2, 3, 4]);
    assert.deepStrictEqual(r.report.epochs.pairs.map((p) => p.attempts), [[1, 2], [1, 2], [1, 2], [3]]);
    assert.deepStrictEqual(r.report.epochs.pairs.map((p) => p.plan.file),
      [V1_FWD, V1_FWD, V1_FWD, core.V2_PLAN_REL]);
    assert.deepStrictEqual(r.report.epochs.pairs.map((p) => p.plan.manifestSha256),
      [w.doc.manifestSha256, w.doc.manifestSha256, w.doc.manifestSha256, w.v2.manifestSha256]);
    assert.strictEqual(r.report.identity.base, B4);
    assert.strictEqual(r.report.identity.helperManifestSha256, w.h4.sha256);
    assert.deepStrictEqual(r.report.epochs.chain.map((c) => c.epoch), [2, 3, 4]);
    assert.deepStrictEqual(r.report.totals.cells, 5);
    assert.deepStrictEqual(r.report.totals.completeCells, 5);
    assert.strictEqual(r.report.totals.requests, 250, 'each complete a3 counts exactly its 50 requests once');
    assert.deepStrictEqual(r.report.totals.holds.sort(), ALL_HOLDS.slice().sort(),
      'every hold is still a hold');
  });

  await test('epoch 4: all eight subsets of S (from the decisions): 2 + k cells, 100 + 50 k requests', () => {
    const w0 = newWorld({ rows: ROWS4 });
    assert.strictEqual(plan.buildManifestV2(w0.doc, { file: V1_FWD, rawSha256: w0.made.rawSha256 },
      plan.resolveSubset(plan.parseOwnerSelectors(ownerFileText(['B', 'B', 'B'])).entries, OWNER_COMMIT)
        .granted), null, 'S empty: no V2, no B4');
    masksOf(8).slice(1).forEach((mask) => {
      const letters = lettersOf(mask);
      const k = letters.filter((l) => l === 'A').length;
      const w = epochWorld4({ letters });
      writeCampaign4(w);
      const r = epochMerge4(w);
      const declined = CAND.filter((c, i) => letters[i] === 'B');
      const granted = CAND.filter((c, i) => letters[i] === 'A');
      assert.deepStrictEqual(w.v2.admissionExceptions.map((e) => e.chunkId), granted, 'mask ' + mask);
      assert.strictEqual(r.report.totals.cells, 5);
      assert.strictEqual(r.report.totals.completeCells, 2 + k, 'mask ' + mask);
      assert.strictEqual(r.report.totals.requests, 100 + 50 * k, 'mask ' + mask);
      assert.strictEqual(r.report.totals.holds.length, 6, 'holds are never successes (mask ' + mask + ')');
      assert.strictEqual(r.report.consumed.filter((c) => c.epoch.id === 4).length, k);
      if (k === 3) {
        assert.strictEqual(r.code, 0, r.text);
        return;
      }
      assert.strictEqual(r.code, 2, 'a declined candidate stays incomplete (mask ' + mask + ')');
      assert.strictEqual(r.report.complete, false);
      assert.ok(r.report.problems.length > 0 && r.report.problems.every((p) => declined.some((id) =>
        p.indexOf(id) !== -1)), r.report.problems.join(' | '));
    });
  });

  await test('epoch 4: an a3 runs only under (B4, H4, V2); the V1 pairs run attempts 1 and 2 only', () => {
    const refuse = (what, a3, pattern, edit) => {
      const w = epochWorld4({ letters: ['A', 'B', 'B'] });
      writeCampaign4(w, { a3 });
      if (edit) edit(w);
      const r = epochMerge4(w);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(pattern.test(r.text), what + ': ' + r.text);
    };
    const withPair = (n) => (w) => {
      const slot = w.v2.runSlots.filter((s) => s.attempt === 3)[0];
      fs.rmSync(path.join(w.repo, slot.dir), { recursive: true, force: true });
      standin.writeRunFolder(w.repo, w.made4, slot, Object.assign({ times: lowTimes(chunkOf(w, CAND[0])) },
        pairOf(w, n)));
    };
    refuse('an a3 of (B3, H3)', {}, /the epoch 3 does not run attempt 3/, withPair(3));
    refuse('an a3 of (B1, H1)', {}, /the epoch 1 does not run attempt 3/, withPair(1));
    refuse('an a3 of (B2, H2)', {}, /(the epoch 2 does not run attempt 3|is no declared epoch)/, withPair(2));
    // a retained chunk answered by an attempt-1 ledger of (B4, H4)
    const w = epochWorld4();
    writeCampaign4(w);
    const slot = slotOf(w, 'fakea-easy.i0.n50', 1);
    fs.rmSync(path.join(w.repo, slot.dir), { recursive: true, force: true });
    standin.writeRunFolder(w.repo, w.made, slot, Object.assign({
      times: lowTimes(chunkOf(w, 'fakea-easy.i0.n50')) }, pairOf(w, 4)));
    const r = epochMerge4(w);
    assert.strictEqual(r.code, 2, r.text);
    assert.ok(/the epoch 4 does not run attempt 1/.test(r.text), r.text);
  });

  await test('epoch 4: an epoch-1 ledger that names the V2 plan is no ledger of the V1 pair', () => {
    const w = epochWorld4();
    writeCampaign4(w);
    const slot = slotOf(w, 'fakea-easy.i0.n50', 1);
    fs.rmSync(path.join(w.repo, slot.dir), { recursive: true, force: true });
    standin.writeRunFolder(w.repo, w.made4, slot, Object.assign({
      times: lowTimes(chunkOf(w, 'fakea-easy.i0.n50')) },
      pairOf(w, 1)));
    const r = epochMerge4(w);
    assert.strictEqual(r.code, 2, r.text);
    assert.ok(/ledger: identity differs from the campaign identity|request\.json: plan/.test(r.text), r.text);
  });

  await test('epoch 4: an a3 needs its OWN a1 and a2, both proven-unstarted holds (no borrowing)', () => {
    const refuse = (what, edit, pattern) => {
      const w = epochWorld4();
      writeCampaign4(w);
      edit(w);
      const r = epochMerge4(w);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(pattern.test(r.text), what + ': ' + r.text);
    };
    const drop = (w, id, n) => fs.rmSync(path.join(w.repo, slotOf(w, id, n).dir), { recursive: true,
      force: true });
    refuse('no a2 folder', (w) => drop(w, CAND[0], 2), /an a3 without its own two proven-unstarted holds/);
    refuse('no a1 folder', (w) => drop(w, CAND[1], 1), /an a3 without its own two proven-unstarted holds/);
    refuse('a2 is a started failed payload', (w) => {
      drop(w, CAND[2], 2);
      standin.writeRunFolder(w.repo, w.made, slotOf(w, CAND[2], 2), Object.assign({
        times: lowTimes(chunkOf(w, CAND[2])),
        mutate: { 'wrapper.json': (x) => Object.assign({}, x, { outcome: 'stop', exit: 65 }) } },
      pairOf(w, 3)));
    }, /an a3 without its own two proven-unstarted holds/);
    refuse('a1 is a complete success', (w) => {
      drop(w, CAND[0], 1);
      standin.writeRunFolder(w.repo, w.made, slotOf(w, CAND[0], 1), Object.assign({
        times: lowTimes(chunkOf(w, CAND[0])) }, pairOf(w, 1)));
    }, /an a3 without its own two proven-unstarted holds|2 complete ledgers|retained success/);
    const none = epochWorld4();
    writeCampaign4(none, { noA3: true });
    const r = epochMerge4(none);
    assert.strictEqual(r.code, 2, 'holds are never successes: nothing completes the candidates');
    assert.strictEqual(r.report.totals.completeCells, 2);
    assert.strictEqual(r.report.totals.requests, 100);
    assert.ok(/no complete run \(2 hold\(s\), 0 failed\)/.test(r.text), r.text);
  });

  await test('epoch 4: no a4, no a3 outside S, no a3 of another chunk (undeclared folders)', () => {
    const refuse = (what, letters, dirOf) => {
      const w = epochWorld4({ letters });
      writeCampaign4(w);
      const dir = path.join(w.repo, standin.RUN_BASE, dirOf);
      fs.mkdirSync(dir, { recursive: true });
      const r = epochMerge4(w);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(/an undeclared run directory/.test(r.text), what + ': ' + r.text);
    };
    refuse('an a4', ['A', 'A', 'A'], 'mega16-easy/' + CAND[0] + '.a4');
    refuse('an a3 of a declined candidate', ['A', 'B', 'A'], 'hyper-hard/' + CAND[1] + '.a3');
    refuse('an a3 of a normal chunk', ['A', 'A', 'A'], 'fakea-easy/fakea-easy.i0.n50.a3');
  });

  await test('epoch 4: the record carries the owner selectors exactly, with their ref and wording', () => {
    const w = epochWorld4();
    const git = epochGit(w);
    const made = proofTool.ownerDecisionsAt(git, OWNER_COMMIT, TEST_WORDING);
    const parsed = plan.parseOwnerSelectors(w.ownerText);
    assert.strictEqual(made.length, 3);
    made.forEach((d, i) => {
      const { id, ref, questionWording } = d;
      const rest = Object.assign({}, d);
      ['id', 'ref', 'questionWording'].forEach((k) => delete rest[k]);
      assert.strictEqual(id, 'S-OD' + (16 + i));
      assert.strictEqual(ref, OWNER_COMMIT + ':tasks/difficulty-v3/check-list.md#' + id);
      assert.deepStrictEqual(rest, parsed.entries[i].selector, 'the source fields are untouched');
      assert.strictEqual(JSON.stringify(rest), JSON.stringify(parsed.entries[i].selector), 'in their order');
      assert.deepStrictEqual(questionWording, { file: TEST_WORDING[i].file,
        section: TEST_WORDING[i].section, commit: TEST_WORDING[i].commit || OWNER_COMMIT },
      'Q2 and Q3 keep the owner commit, Q4 its own wording commit');
    });
    assert.strictEqual(made[2].questionWording.commit, W_COMMIT);
    assert.strictEqual(made[2].ref, OWNER_COMMIT + ':tasks/difficulty-v3/check-list.md#S-OD18',
      'the owner reference of Q4 stays anchored to the owner commit');
    const spec = TEST_WORDING[0];
    const key = OWNER_COMMIT + ':' + spec.file;
    const withText = (text) => epochGit(w, { show: { [key]: text } });
    assert.throws(() => proofTool.wordingOf(withText('# t\n\n## other\n\nMS18d-Q2\n'), OWNER_COMMIT, spec),
      /no unique section/);
    assert.throws(() => proofTool.wordingOf(withText('## ' + spec.section + '\n\nx\n\n## ' + spec.section +
      '\n\nMS18d-Q2\n'), OWNER_COMMIT, spec), /no unique section/);
    assert.throws(() => proofTool.wordingOf(withText('## ' + spec.section + '\n\nno id here\n\n## next\n' +
      'MS18d-Q2 appears after the section\n'), OWNER_COMMIT, spec), /does not mention MS18d-Q2/);
    assert.deepStrictEqual(proofTool.wordingOf(withText('## ' + spec.section + '\n\n> **MS18d-Q2:** q\n'),
      OWNER_COMMIT, spec), { file: spec.file, section: spec.section, commit: OWNER_COMMIT });
    // Q4: the archived text is the wording record: its message, its fence and the fence digest
    const q4 = TEST_WORDING[2];
    const q4Key = W_COMMIT + ':' + q4.file;
    const q4Of = (lines) => proofTool.wordingOf(epochGit(w, { show: { [q4Key]: ['## ' + q4.section, '']
      .concat(lines, ['', '## next', '']).join('\n') } }), OWNER_COMMIT, q4);
    const msg = 'Message ' + q4.messageId + '.';
    const fence = ['````text'].concat(Q4_FENCE.split('\n'), ['````']);
    assert.deepStrictEqual(q4Of([msg].concat(fence)),
      { file: q4.file, section: q4.section, commit: W_COMMIT });
    assert.throws(() => q4Of([msg, '````text', Q4_FENCE + ' edited', '````']), /does not hash to/);
    assert.throws(() => q4Of(['MS18d-Q4, a section without its message id'].concat(fence)),
      /does not name the message/);
    assert.throws(() => q4Of([msg, 'no fence here']), /has no text fence/);
    assert.throws(() => q4Of([msg, '````text'].concat(Q4_FENCE.split('\n'))), /has no text fence/);
    assert.throws(() => proofTool.ownerTextAt(git, OWNER_COMMIT.slice(0, 8)), /full 40-hex/);
  });

  await test('epoch 4: the retained evidence: git blob bytes, folders compared at the checkpoint', () => {
    const { LEDGER } = require('./source-binding.js');
    const chk = core.EPOCH3_CHECKPOINT;
    const B4C = 'b4'.repeat(20);
    const lines = ['{"type":"run","n":1}', '{"type":"pre-window-hold","n":2}', '{"type":"run","n":3}'];
    const logAt = lines.join('\n') + '\n';
    const judged = { r3: { retainedEvidence: { skippedEvents: [{ line: 2, type: 'pre-window-hold' }] } },
      retained: [{ runId: 'b.i0.n50.a1', chunkId: 'b.i0.n50' }],
      others: [{ runId: 'c.i0.n50.a1', status: 'hold' }, { runId: 'c.i0.n50.a2', status: 'hold' }],
      doc: { runSlots: ['b', 'c'].reduce((all, c) => all.concat([1, 2].map((a) => ({
        runId: c + '.i0.n50.a' + a, dir: 'gp/' + c + '/' + c + '.i0.n50.a' + a }))), []) } };
    const git = (o) => (a) => {
      const [cmd, spec] = a;
      const [commit, rel] = String(spec).split(':');
      if (cmd === 'show') {
        if (commit === chk) return logAt;
        return o && o.b4Log !== undefined ? o.b4Log : logAt + '{"n":4}\n';
      }
      if (cmd === 'rev-parse') {
        return rel === LEDGER ? 'blob-of-the-log' : 'tree-of-' + rel + (commit === B4C && o && o.moved === rel
          ? '-moved' : '');
      }
      throw new Error('unexpected git ' + a.join(' '));
    };
    const ok = proofTool.retainedEvidenceAt(git(), judged, B4C);
    assert.deepStrictEqual(ok.problems, []);
    assert.deepStrictEqual(ok.evidence.skippedEvents, [{ line: 2, type: 'pre-window-hold' }]);
    assert.deepStrictEqual(ok.evidence.holds, ['c.i0.n50.a1', 'c.i0.n50.a2']);
    assert.deepStrictEqual(Object.keys(ok.evidence.successFolders), ['b.i0.n50.a1']);
    assert.deepStrictEqual(Object.keys(ok.evidence.holdFolders), ['c.i0.n50.a1', 'c.i0.n50.a2'], 'all holds');
    assert.strictEqual(ok.evidence.holdFolders['c.i0.n50.a2'], 'tree-of-gp/c/c.i0.n50.a2');
    assert.strictEqual(ok.evidence.cLog.hashOf, 'git blob content bytes at the checkpoint');
    assert.strictEqual(ok.evidence.cLog.blobBytes, Buffer.byteLength(logAt, 'utf8'));
    assert.strictEqual(ok.evidence.cLog.blobSha256, sha256(Buffer.from(logAt, 'utf8')));
    assert.strictEqual(ok.evidence.cLog.lines, 3);
    const bad = (what, o, pattern, j) => {
      const r = proofTool.retainedEvidenceAt(git(o), j || judged, B4C);
      assert.ok(r.problems.some((p) => pattern.test(p)), what + ': ' + r.problems.join(' | '));
    };
    bad('the log at B4 does not start with the checkpoint log (no newline normalisation)',
      { b4Log: logAt.replace(/\n/g, '\r\n') }, /does not keep the checkpoint log as a prefix/);
    bad('a retained success folder changed after the checkpoint', { moved: 'gp/b/b.i0.n50.a1' },
      /b\.i0\.n50\.a1: the folder at B4 is not that of the checkpoint/);
    bad('a retained hold folder changed', { moved: 'gp/c/c.i0.n50.a2' }, /c\.i0\.n50\.a2: the folder at B4/);
    bad('the pre-window event is another line', {}, /the pre-window event is not line 3/, Object.assign({},
      judged, { r3: { retainedEvidence: { skippedEvents: [{ line: 3, type: 'pre-window-hold' }] } } }));
    bad('an other run that is no hold', {}, /neither a complete run nor a hold \(failed\)/, Object.assign({},
      judged, { others: [{ runId: 'c.i0.n50.a1', status: 'failed' }] }));
  });

  await test('epoch 4: the authority is the owner records AT the owner commit and the V2/B4 binding', () => {
    const refuse = (what, o, pattern) => {
      const w = epochWorld4(o && o.world);
      writeCampaign4(w);
      const r = epochMerge4(w, o);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(/^ms18d-gp-merge-invalid /m.test(r.text) && pattern.test(r.text), what + ': ' + r.text);
      assert.strictEqual(r.report, null, what + ': an invalid merge writes no report');
    };
    const good = epochWorld4();
    writeCampaign4(good);
    // the pack file at HEAD may say anything: the records are read at the owner commit, never at HEAD
    const atHead = { show: { ['HEAD:' + plan.OWNER_FILE]: ownerFileText(['B', 'B', 'B']) } };
    assert.strictEqual(epochMerge4(good, { git: atHead }).code, 0, 'HEAD is never read for the owner text');
    refuse('Q3 declined at the owner commit but granted by the V2',
      { world: { ownerLetters: ['A', 'B', 'A'] } },
      /the V2 exceptions are not exactly the subset the committed owner decisions grant/);
    refuse('Q4 missing at the owner commit', { world: { ownerEdit: (l) => l.slice(0, 2) } },
      /Q4 is unresolved: missing/);
    refuse('a reply that does not tie its answer to the question', { world: { ownerEdit: (lines) => lines.map(
      (l, i) => (i === 1 ? l.replace('Q3=A', 'agreed') : l)) } }, /Q3 is unresolved: .*ties no answer/);
    refuse('a reply of another owner', { world: { ownerEdit: (lines) => lines.map((l) => l.replace(
      'amicably8850', 'someone')) } }, /the owner is not amicably8850/);
    refuse('the records are not at the owner commit', { git: { show: { [OWNER_COMMIT + ':' + plan.OWNER_FILE]:
      null } } }, /the owner records cannot be read at ownerDecisionCommit/);
    refuse('an owner commit that is not an ancestor of B4',
      { git: { notAncestor: new RegExp('^' + OWNER_COMMIT) } },
      /ownerDecisionCommit is not an ancestor of B4/);
    refuse('an owner commit that is not the one the V2 cites', { record4Over: { ownerDecisionCommit:
      'd7'.repeat(20) } }, /the owner references of the V2 do not cite ownerDecisionCommit/);
    refuse('an abbreviated owner commit', { record4Over: { ownerDecisionCommit: OWNER_COMMIT.slice(0, 8) } },
      /ownerDecisionCommit is not a full commit id/);
    refuse('an owner selector edited in the record', { record4Over: { ownerDecisions: ownerDecisions(good)
      .map((d, i) => (i === 1 ? Object.assign({}, d, { binding: 'Q3=B' }) : d)) } },
    /ownerDecisions\[1\] is not the selector as committed/);
    refuse('ownerDecisions that drop one selector', { record4Over: { ownerDecisions: ownerDecisions(good)
      .slice(0, 2) } }, /ownerDecisions are not the three owner selectors/);
    const dropWording = (d) => {
      const c = Object.assign({}, d);
      delete c.questionWording;
      return c;
    };
    refuse('an owner decision without the pointer to the question wording', { record4Over: {
      ownerDecisions: ownerDecisions(good).map(dropWording) } },
    /carries no pointer to the question wording/);
    refuse('a wording pointer to a commit that does not hold the section', { record4Over: { ownerDecisions:
      ownerDecisions(good).map((d) => Object.assign({}, d, { questionWording: Object.assign({},
        d.questionWording, { commit: 'd7'.repeat(20) }) })) } }, /cannot be read at its commit/);
    const wordingRead = /question wording of ownerDecisions\[2\] cannot be read/;
    refuse('a wording commit (Q4) that is not an ancestor of B4',
      { git: { notAncestor: new RegExp('^' + W_COMMIT) } }, wordingRead);
    refuse('a wording section that is not at its commit', { git: { show: { [W_COMMIT + ':' +
      TEST_WORDING[2].file]: '## another section\n' } } }, wordingRead);
    refuse('a wording pointer that is not a full commit', { record4Over: { ownerDecisions:
      ownerDecisions(good).map((d, i) => (i === 2 ? Object.assign({}, d, { questionWording:
        Object.assign({}, d.questionWording, { commit: 'd0b746bb' }) }) : d)) } },
    /carries no pointer to the question wording/);
    refuse('admissionExceptions that are not the V2 entries', { record4Over: { admissionExceptions:
      good.v2.admissionExceptions.slice(0, 2) } },
    /admissionExceptions is not exactly the V2 manifest entries/);
    refuse('an exception order that is not the a3 slots',
      { record4Over: { exceptionOrder: [CAND[0] + '.a3'] } },
      /exceptionOrder is not the ordered a3 run list/);
    refuse('another campaign root', { record4Over: { campaignRoot: B2 } },
      /campaignRoot is not the declared root/);
    refuse('a V2 that is no exact delta of the V1 (a changed target)', { world: { v2Edit: (d) => {
      d.chunks[0].target += 1;
    } } }, /not the exact V1 -> V2 delta/);
    refuse('a V2 whose parent raw hash is not the V1 file', { world: { v2Edit: (d) => {
      d.parent.rawSha256 = 'f'.repeat(64);
    } } }, /the parent raw hash is not the V1 file/);
    refuse('a V2 whose owner reference is the old "@" form', { world: { v2Edit: (d) => {
      d.admissionExceptions[0].ownerDecision.ref = 'tasks/difficulty-v3/check-list.md@' + OWNER_COMMIT;
    } } }, /the decision ref is not <full commit>/);
    refuse('a previous plan that is not the plan of B3', { record4Over: { previousPlan: {
      file: V1_FWD, rawSha256: 'f'.repeat(64), manifestSha256: good.doc.manifestSha256 } } },
    /previousPlan is not the plan of the previous epoch/);
    refuse('a record that drops a retained hold', { holds: ALL_HOLDS.slice(1) },
      /the hold mega16-easy\.i0\.n50\.a1 the previous record retained is dropped/);
    refuse('a merge request that names the V1 plan at B4', { planRel: standin.PLAN_REL },
      /plan is not the plan of the merge request|not an ms18d-gp-chunk-manifest-v2|exceptions/);
    refuse('no base-4 record', { noRecord4: true }, /the base-4 record is not committed at HEAD/);
  });

  await test('epoch 4: the manifests of B3 and B4 differ only in the exact allowlist (no wildcards)', () => {
    const clean = epochWorld4();
    writeCampaign4(clean);
    assert.strictEqual(epochMerge4(clean).code, 0);
    const step = core.EPOCH_STEPS[4];
    const t = core.manifestTransition(core.parseHelperManifest(clean.m3Text),
      core.parseHelperManifest(clean.m4Text), step.production, step.tests, step.dataFiles, step.addedTests);
    const wanted = ['attempts.js:production', 'merge-core.js:production', 'merge-gp.js:production',
      'payload-gp.js:production', 'plan-data.js:production', 'run-locked-c.ps1:production',
      'test-epoch4-proof.js:test', 'test-plan.js:test', 'test-recorder-merge.js:test',
      'test-run-locked-c.ps1:test', 'test-units.js:test', core.V2_PLAN_REL + ':plan-v2'];
    assert.deepStrictEqual(t.changes.map((c) => c.path.replace(HDIR, '') + ':' + c.class).sort(),
      wanted.sort());
    const refuse = (what, h4, pattern) => {
      const w = epochWorld4({ h4 });
      writeCampaign4(w);
      const r = epochMerge4(w);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(pattern.test(r.text), what + ': ' + r.text);
    };
    refuse('another test file (not on the list)', { [HDIR + 'test-controller.js']: hexOf('x') },
      /differ in .*test-controller\.js/);
    refuse('a stand-in file', { [HDIR + 'standin-gp.js']: hexOf('x') }, /differ in .*standin-gp\.js/);
    refuse('the acquisition rule', { [HDIR + 'acquisition.js']: hexOf('x') }, /differ in .*acquisition\.js/);
    refuse('the controller', { [HDIR + 'controller.js']: hexOf('x') }, /differ in .*controller\.js/);
    refuse('the recorder', { [HDIR + 'record-gp.js']: hexOf('x') }, /differ in .*record-gp\.js/);
    refuse('the loader', { [HDIR + 'loader.js']: hexOf('x') }, /differ in .*loader\.js/);
    refuse('readiness', { [HDIR + 'readiness-core.js']: hexOf('x') }, /differ in .*readiness-core\.js/);
    refuse('the release history (an epoch-3 file, not an epoch-4 one)', { [HDIR + 'release-history.js']:
      hexOf('x') }, /differ in .*release-history\.js/);
    refuse('the V1 plan', { [V1_FWD]: hexOf('x') }, /differ in .*gp-chunk-manifest\.json/);
    refuse('a removed production file', { [HDIR + 'attempts.js']: null }, /differ in .*attempts\.js/);
    refuse('a removed named test (a test may be changed, never removed)', { [HDIR + 'test-plan.js']: null },
      /differ in .*test-plan\.js/);
    {
      // the proof tool test already in B3: it cannot be the added test of B4
      const early = core.parseHelperManifest(clean.m3Text);
      early.entries.set(HDIR + 'test-epoch4-proof.js', hexOf('before'));
      const t2 = core.manifestTransition(early, core.parseHelperManifest(clean.m4Text), step.production,
        step.tests, step.dataFiles, step.addedTests);
      assert.ok(t2.problems.some((p) => /differ in .*test-epoch4-proof\.js/.test(p)), t2.problems.join('; '));
    }
    refuse('a new production module', { [HDIR + 'new-module.js']: hexOf('x') }, /differ in .*new-module\.js/);
    refuse('another data file', { 'docs/difficulty-v3/evidence/MS18d/phase-c/gp-chunk-manifest-a3-v3.json':
      hexOf('x') }, /differ in .*gp-chunk-manifest-a3-v3\.json/);
  });

  await test('epoch 4: the committed B3 -> B4 diff holds only the allowed paths', () => {
    const w = epochWorld4();
    writeCampaign4(w);
    const refuse = (what, extra, drop, pattern) => {
      const list = w.diff4.filter((d) => d.file !== drop).concat(extra);
      const r = epochMerge4(w, { git: { diff4: list } });
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(pattern.test(r.text), what + ': ' + r.text);
    };
    refuse('the acquisition rule', [{ status: 'M', file: HDIR + 'acquisition.js' }], null,
      /acquisition\.js: a helper file changed that is no change of the manifests/);
    refuse('an engine file', [{ status: 'M', file: 'generator/js/core/engine.js' }], null,
      /engine\.js: outside the allowed B1 -> B2 set/);
    refuse('a recorded base record changed', [{ status: 'M', file: MANIFEST3_REL }], null,
      /helpers-c3-sha256\.txt: recorded evidence was changed \(M\)/);
    refuse('a recorded run output deleted', [{ status: 'D', file: standin.RUN_BASE + '/x/y/ledger.json' }],
      null, /recorded evidence was changed \(D\)/);
    refuse('the V2 plan missing from the diff', [], core.V2_PLAN_REL,
      /gp-chunk-manifest-a3-v2\.json: a manifest change that is not in the committed diff/);
    refuse('a helper change missing from the diff', [], HDIR + 'attempts.js',
      /attempts\.js: a manifest change that is not in the committed diff/);
  });

  await test('epoch 4: the earlier pairs keep their own records; a damaged earlier record is refused', () => {
    const refuse = (what, o, pattern) => {
      const w = epochWorld4();
      writeCampaign4(w);
      const r = epochMerge4(w, o);
      assert.strictEqual(r.code, 2, what + ' ' + r.text);
      assert.ok(pattern.test(r.text), what + ': ' + r.text);
    };
    refuse('a damaged base-3 record', { record3Over: { schema: 'x' } }, /base-3 record: schema is not/);
    refuse('a damaged base-2 record', { record2Over: { schema: 'x' } }, /base-2 record: schema is not/);
    refuse('a base-4 record edited once', { git: { commits: 2 } }, /committed 2 times/);
    refuse('another base-4 schema', { record4Over: { schema: core.EPOCH3_SCHEMA } }, /schema is not/);
    refuse('a previous base that is not B3', { record4Over: { previousBase: B2 } },
      /previousBase is not the declared base/);
    refuse('another checkpoint', { record4Over: { checkpoint: CHK3 } }, /checkpoint is not the declared/);
    refuse('B3 is no ancestor of the checkpoint', { git: { notAncestor: new RegExp('^' + B3 + ' ' + CHK4) } },
      /B3 of the checkpoint is not an ancestor/);
    refuse('B4 is no ancestor of HEAD', { git: { notAncestor: new RegExp('^' + B4 + ' ' + HEADX) } },
      /B4 of HEAD is not an ancestor/);
    const stale = (t) => t.map((r, i) => (i === 0 ? Object.assign({}, r, { ledgerSha256: 'e3'.repeat(32) })
      : r));
    refuse('a record that retains epoch-1 successes unlike the base-3 record', { tagged: stale },
    /epoch-1 successes are not those the previous record retained|retained success/);
  });

  await test('epoch 4: the recorder checks an a3 against the declared exception and its two holds', () => {
    const w = epochWorld4();
    const id = CAND[0];
    const slot3 = w.v2.runSlots.filter((s) => s.runId === id + '.a3')[0];
    const cLog = path.join(w.repo, 'c.jsonl');
    const cell = path.join(w.repo, standin.RUN_BASE, 'mega16-easy');
    const hold = (n) => {
      const dir = path.join(cell, id + '.a' + n);
      fs.mkdirSync(dir, { recursive: true });
      const put = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
      put('request.json', { chunk: { chunkId: id } });
      put('wrapper.json', { chunkId: id, outcome: 'control-hold' });
      put('admission.json', { decision: 'hold' });
      put('result.json', { outcome: 'control-hold', payloadStarted: false });
      fs.appendFileSync(cLog, JSON.stringify({ schema: 'ms18d-c-run-1', chunkId: id,
        runDir: standin.RUN_BASE + '/mega16-easy/' + id + '.a' + n, controllerOutcome: 'control-hold',
        releaseObservedAt: new Date(1000000).toISOString() }) + '\r\n');
    };
    const journal = require('./journals.js').rulingsState(() => '', 'a'.repeat(40), null);
    const request = (attempt, doc, rawSha256) => ({ repo: w.repo, plan: { file: V2_BACK,
      rawSha256: rawSha256 || w.v2raw, manifestSha256: doc.manifestSha256 }, runId: id + '.a' + attempt,
    attempt, chunk: chunkOf(w, id), policy: doc.policy,
    runDir: path.join(w.repo, standin.RUN_BASE, 'mega16-easy', id + '.a' + attempt),
    expected: { identities: { hashIdentity: doc.sources.hashIdentity,
      replayIdentity: doc.sources.replayIdentity, sources: doc.sources.sources },
    tableSha256: doc.targets.tableSha256, node: doc.environment.node, machine: doc.environment.machine,
    base: B4 } });
    const ctx = { cLedger: cLog, journals: { rulings: journal }, nowMs: 5000000000 };
    fs.mkdirSync(path.join(cell, id + '.a3'), { recursive: true });
    hold(1);
    let c = payloadGp.recorder.extraChecks(request(3, w.v2), ctx);
    assert.strictEqual(c.ok, false, 'one hold is no two admissions');
    assert.ok(c.problems.some((p) => /attempts: a3 needs its own a1 and a2/.test(p)), c.problems.join(' | '));
    hold(2);
    c = payloadGp.recorder.extraChecks(request(3, w.v2), ctx);
    assert.strictEqual(c.ok, true, c.problems.join(' | '));
    assert.strictEqual(c.records['attempts.json'].exception, 'MS18d-Q2-A');
    assert.strictEqual(c.records['attempts.json'].admissions, 2);
    assert.strictEqual(slot3.attempt, 3);
    // the V1 plan declares no a3 slot and no exception: the same request is refused there
    const v1 = w.doc;
    const v1Raw = w.made.rawSha256;
    const refused = payloadGp.recorder.extraChecks(Object.assign(request(3, v1, v1Raw), { plan: { file:
      w.made.planRel, rawSha256: v1Raw, manifestSha256: v1.manifestSha256 } }), ctx);
    assert.strictEqual(refused.ok, false);
    assert.ok(refused.problems.some((p) => /declared slot|no-admission-exception|attempt 3/.test(p)),
      refused.problems.join(' | '));
    // an a4 never has a slot
    fs.mkdirSync(path.join(cell, id + '.a4'), { recursive: true });
    assert.throws(() => payloadGp.recorder.validateRequest(Object.assign(request(4, w.v2), {
      command: { args: [] }, standin: true })), /attempt is 1, 2 or 3/);
  });
}

async function main() {
  await recorderTests();
  await mergerTests();
  await readinessMergeTests();
  await classifierTests();
  await epochTests();
  await epoch3Tests();
  await epoch4Tests();
}

main().then(() => {
  console.log(passed + ' passed, ' + failed.length + ' failed');
  if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
  process.exitCode = failed.length === 0 ? 0 : 1;
}, (err) => {
  console.log('ERROR ' + (err && err.stack));
  process.exitCode = 1;
}).then(() => fs.rmSync(scratch, { recursive: true, force: true }));
