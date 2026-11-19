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
    assert.throws(() => payloadGp.recorder.validateRequest(Object.assign({}, base,
      { command: { args: good }, attempt: 3 })), /attempt is 1 or 2/);
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

async function main() {
  await recorderTests();
  await mergerTests();
  await readinessMergeTests();
  await classifierTests();
}

main().then(() => {
  console.log(passed + ' passed, ' + failed.length + ' failed');
  if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
  process.exitCode = failed.length === 0 ? 0 : 1;
}, (err) => {
  console.log('ERROR ' + (err && err.stack));
  process.exitCode = 1;
}).then(() => fs.rmSync(scratch, { recursive: true, force: true }));
