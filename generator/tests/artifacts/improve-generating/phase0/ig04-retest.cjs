'use strict';

/*
 * IG-S04 revision r2 (test side, provisional (pre-freeze)): reruns the cases of frontier-test.cjs after a correction of the
 * frontier code, outside the pilot. The pure cases run in this process (a fake engine, nothing timed); the real-engine
 * cases (`engineSynthetic`) run in one patched worker thread exactly as the first command of the round runs them. Nothing
 * here generates, times or records a trial, and the parity run is not repeated (the hooks and the adapter are unchanged).
 * The result is written once as engine-retest<suffix>.json beside the task evidence.
 *
 * The real-engine part loads the engine: run it only through the low-priority wrapper (Invoke-IgNode), never unlocked.
 *
 *   node ig04-retest.cjs --round=provisional-r1 --suffix=-r2
 */
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');
const C = require('./common.cjs');
const AG = require('./aggregate.cjs');
const RUN = require('./run.cjs');
const T = require('./frontier-test.cjs');

const TASK = 'IG-S04';
const WORKER_FILE = path.join(__dirname, 'worker.cjs');
const LIMIT_MS = 120000;
const PROCESS_STARTED_AT = new Date(performance.timeOrigin).toISOString();

function parseArgs(argv) {
  const out = { round: null, suffix: '', requestedAt: null };
  argv.forEach(function (arg) {
    const m = /^--(round|suffix|requested-at)=(.*)$/.exec(arg);
    if (!m) throw new Error('unknown argument ' + arg);
    out[m[1] === 'requested-at' ? 'requestedAt' : m[1]] = m[2];
  });
  if (!out.round || out.suffix === '') throw new Error('usage: ig04-retest.cjs --round=<round> --suffix=-r2 [--requested-at=<iso>]');
  return out;
}

/** One patched worker, one job: the real-engine cases. Resolves to { results } or { error }. */
function engineCases(repoRoot, fingerprint) {
  return new Promise(function (resolve) {
    const worker = new Worker(WORKER_FILE, { workerData: { repoRoot: repoRoot, testOnly: false, role: 'request',
      adapterIds: ['frontier-hooks'], expectedFingerprint: fingerprint, noEngine: false, wantCatalogue: false } });
    let settled = false;
    const timer = setTimeout(function () { finish({ error: 'no reply within ' + LIMIT_MS + ' ms' }); }, LIMIT_MS);
    function finish(value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate().then(function () { resolve(value); }, function () { resolve(value); });
    }
    worker.on('message', function (m) {
      if (m.type === 'ready') worker.postMessage({ type: 'job', job: { kind: 'ig04-synthetic' } });
      else if (m.type === 'decision') finish({ results: m.results });
      else if (m.type === 'error' || m.type === 'fatal') finish({ error: m.error && m.error.message ? m.error.message : m.type });
    });
    worker.on('error', function (err) { finish({ error: err.message }); });
    worker.on('exit', function (code) { finish({ error: 'the worker exited with code ' + code }); });
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const got = AG.collect(repoRoot, TASK, opts.round);
  const fingerprint = got.shards.map(function (s) { return s.commands[0]; }).filter(Boolean).map(function (c) {
    return c.runtimeFingerprint; })[0];
  if (!fingerprint) throw new Error('no recorded command names the runtime fingerprint');
  const pure = await T.runPure();
  const started = Date.now();
  const engine = await engineCases(repoRoot, fingerprint);
  const results = engine.results || [{ id: 'engine.synthetic-run', group: 'engine', ok: false, title: 'the engine cases ran',
    detail: { error: engine.error || 'no reply' } }];
  const failed = results.filter(function (r) { return !r.ok; });
  const doc = {
    schema: 'ig-s04-engine-retest/1',
    task: TASK,
    round: opts.round,
    revision: opts.suffix.replace(/^-/, ''),
    evidenceStatus: 'provisional (pre-freeze)',
    note: 'unmeasured self-tests after the r2 corrections; no trial ran, nothing was timed, the patched/plain parity run ' +
      'is not repeated (hooks and adapter unchanged)',
    runtimeFingerprint: fingerprint,
    harnessFingerprint: C.harnessFingerprint().fingerprint,
    ok: failed.length === 0 && pure.ok,
    passed: results.length - failed.length,
    total: results.length,
    pure: pure.results.filter(function (r) { return r.ok; }).length + '/' + pure.results.length + ' passed',
    engineWallMs: Date.now() - started,
    results: results
  };
  doc.hash = C.digestOf(doc);
  const dir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), opts.round, TASK);
  C.writeJsonAtomic(repoRoot, path.join(dir, 'engine-retest' + opts.suffix + '.json'), doc);
  // A command launched straight through the wrapper is charged from its command.json (occupied time + the 45 s grace).
  const commandDir = path.join(dir, 'engine-retest' + opts.suffix);
  fs.mkdirSync(commandDir, { recursive: true });
  C.writeJsonAtomic(repoRoot, path.join(commandDir, 'command.json'), {
    schema: 'ig-s-phase0/1', task: TASK, shard: 'engine-retest' + opts.suffix, round: opts.round,
    attemptId: opts.suffix.replace(/^-/, ''), status: doc.ok ? 'complete' : 'failed',
    evidenceStatus: 'provisional (pre-freeze)', runtimeFingerprint: fingerprint, harnessFingerprint: doc.harnessFingerprint,
    timing: RUN.timingOf(PROCESS_STARTED_AT, opts.requestedAt),
    notes: ['unmeasured self-tests after the r2 corrections (' + doc.passed + '/' + doc.total + ' engine cases, pure ' +
      doc.pure + '); engine-retest' + opts.suffix + '.json hash ' + doc.hash] });
  process.stdout.write('engine cases ' + doc.passed + '/' + doc.total + ' passed, pure ' + doc.pure + '\n');
  failed.forEach(function (r) {
    process.stdout.write('FAIL ' + r.id + ': ' + (r.detail && r.detail.error ? r.detail.error : 'failed') + '\n');
  });
  process.exitCode = doc.ok ? 0 : 1;
}

main().catch(function (err) {
  process.stderr.write(String(err && err.stack ? err.stack : err) + '\n');
  process.exitCode = 1;
});
