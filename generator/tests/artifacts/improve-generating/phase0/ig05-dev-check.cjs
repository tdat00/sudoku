'use strict';

/*
 * One wrapped development check of IG-S05 (test side, provisional (pre-freeze)): before the matrix runs, the synthetic engine
 * tests (patched and unpatched instance) and the complete per-job flow (executor, verification, record, record check) on a few
 * real jobs of the manifest. It writes one immutable report beside the shard evidence and nothing else; it never changes a
 * manifest, a budget or a record of the screen and its trials are NOT part of the screen's counts.
 *
 *   Invoke-IgNode -Repo sudoku -Task 'IG-S05/dev-check' -NodeArgs @('<this file>', '--round=provisional-r1',
 *     '--keys=classic9:101,mega16:101,...', '--out=dev-check-a1.json')
 *
 * Every key is `<cell>:<seed>` (all eight modes of that grid) or `<cell>:<seed>:<mode>+<mode>`, run in the manifest's own order.
 */
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const L = require('./loader.cjs');
const H = require('./host.cjs');
const RUN = require('./run.cjs');
const IG02 = require('./ig02-run.cjs');
const IG04 = require('./ig04-run.cjs');
const IG05 = require('./ig05-run.cjs');

const TASK = 'IG-S05';
const WRAPPER_TASK = TASK + '/dev-check';

function parseArgs(argv) {
  const opts = { round: null, keys: [], out: 'dev-check-a1.json', modes: null };
  argv.forEach(function (arg) {
    const m = /^--(round|keys|out|modes)=(.*)$/.exec(arg);
    if (!m) throw new C.HarnessError('args', 'unknown argument ' + arg);
    if (m[1] === 'keys') opts.keys = m[2].split(',').filter(Boolean);
    else if (m[1] === 'modes') opts.modes = m[2].split(',').filter(Boolean);
    else opts[m[1]] = m[2];
  });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.round || '')) throw new C.HarnessError('args', 'missing or bad --round');
  if (!/^[a-z0-9][a-z0-9.-]*\.json$/.test(opts.out)) throw new C.HarnessError('args', 'bad --out');
  return opts;
}

async function main(argv) {
  const opts = parseArgs(argv);
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const startedAt = C.isoNow();
  const lock = RUN.observeLock(WRAPPER_TASK);
  RUN.assertLockOwned(lock, WRAPPER_TASK);
  const set = L.loadSourceSet({ repoRoot: repoRoot });
  const harness = C.harnessFingerprint();
  const host = new H.Host({ repoRoot: repoRoot, runtimeFingerprint: set.fingerprint, deadlineMs: 200000 });
  host.calibrate();
  const manifest = M.buildManifest(TASK, opts.round);
  const probe = await IG02.probeCatalogue(host);
  const report = { schema: 'ig-s05-dev-check/1', task: TASK, round: opts.round, evidenceStatus: manifest.evidenceStatus,
    notice: 'development check before the matrix: its trials are not part of the screen', startedAt: startedAt,
    runtimeFingerprint: set.fingerprint, harnessFingerprint: harness.fingerprint, manifestHash: manifest.manifestHash,
    catalogueFingerprint: probe.catalogue.fingerprint, cpu: host.cpu, synthetic: null, jobs: [] };

  const patched = await IG04.workerCall(host, { role: 'request', adapterIds: ['frontier-hooks'] }, { kind: 'ig05-synthetic' },
    ['decision'], 90000);
  const verify = await IG04.workerCall(host, { role: 'verify', adapterIds: [] }, { kind: 'ig05-synthetic-verify' }, ['decision'],
    90000);
  const results = [];
  [patched, verify].forEach(function (call, i) {
    if (call.reply) call.reply.results.forEach(function (r) { results.push(r); });
    else results.push({ id: i === 0 ? 'engine.synthetic-run' : 'engine.synthetic-verify-run', ok: false,
      detail: { error: call.error ? call.error.message : 'no reply' } });
  });
  report.synthetic = { passed: results.filter(function (r) { return r.ok; }).length, total: results.length, results: results,
    wallMs: patched.wallMs + verify.wallMs, cpuMs: patched.cpuMs + verify.cpuMs };

  for (const key of opts.keys) {
    const parts = key.split(':');
    const cell = parts[0];
    const seed = Number(parts[1]);
    const only = parts[2] ? parts[2].split('+') : opts.modes;
    const jobs = manifest.jobs.filter(function (j) {
      return j.puzzleVariant === cell && j.requestSeed === seed && (only === null || only.indexOf(j.mode) >= 0);
    });
    if (jobs.length === 0) throw new C.HarnessError('args', 'no job for ' + key);
    for (const job of jobs) {
      const t0 = host.mark();
      const obs = await IG05.execute({ host: host, job: job, catalogue: probe.catalogue, readyCheck: null });
      let validation = null;
      if (obs.outcome === 'complete') validation = await host.runValidation(obs.wire, { level: job.level });
      const rec = RUN.recordOfRequest(job, obs, validation, { deadlineMs: 200000 });
      IG05.augmentRecord(rec, job, obs, { repoRoot: repoRoot, catalogue: probe.catalogue });
      const t1 = host.mark();
      const g = rec.generation || {};
      report.jobs.push({ key: job.key, mode: job.mode, estimateMs: job.estimateMs, occupiedMs: t1.t - t0.t, outcome: rec.outcome,
        claimedExact: rec.claimedExact, verifiedExact: rec.verifiedExact, problems: R.checkRecord(rec),
        readyOccupiedWallMs: g.readyOccupiedWallMs, cpuReadyTotalMs: g.cpuReadyTotalMs, coldWallMs: g.coldWallMs,
        gridBuildWallMs: g.gridBuildWallMs, validationWallMs: rec.validation ? rec.validation.wallMs : null,
        validationStatus: rec.validationDetail ? rec.validationDetail.status : null, gridHash: rec.gridHash,
        sampleStates: rec.sampleStates ? rec.sampleStates.map(function (s) { return s.state; }) : null,
        sampleClasses: rec.samples ? rec.samples.map(function (s) { return s.class; }) : null,
        hostSamples: rec.hostSamples, parents: rec.parents ? { status: rec.parents.status, wallMs: rec.parents.wallMs,
          cpuMs: rec.parents.cpuMs, classes: rec.parents.rows.map(function (p) { return p.class + (p.fromCache ? ' (cache)' : ''); }),
          unique: rec.parents.rows.map(function (p) { return p.unique; }) } : null, counts: rec.counts,
        budgetStops: rec.budgetStops, error: rec.error });
    }
  }
  await host.terminateAll();
  report.endedAt = C.isoNow();
  report.occupiedMs = Math.round(Date.now() - performance.timeOrigin);
  const gridHashes = {};
  report.jobs.forEach(function (j) {
    const k = j.key.split('/')[2];
    gridHashes[k] = gridHashes[k] || new Set();
    gridHashes[k].add(j.gridHash);
  });
  report.identity = Object.keys(gridHashes).map(function (k) { return { cluster: k, gridHashes: gridHashes[k].size }; });
  const dir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), opts.round, TASK);
  C.writeJsonAtomic(repoRoot, path.join(dir, opts.out), report);
  const bad = report.jobs.filter(function (j) { return j.problems.length > 0 || j.outcome === 'error'; });
  const failedTests = results.filter(function (r) { return !r.ok; });
  process.stdout.write(JSON.stringify({ ig: 'dev-check', synthetic: report.synthetic.passed + '/' + report.synthetic.total,
    jobs: report.jobs.length, badJobs: bad.length, failedTests: failedTests.map(function (r) { return r.id + ': ' +
      (r.detail && r.detail.error); }), occupiedMs: report.occupiedMs, out: opts.out }) + '\n');
  return failedTests.length === 0 && bad.length === 0 ? 0 : 1;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(function (code) {
    process.exitCode = code;
    process.stdout.write('', function () { process.exit(code); });
  }, function (err) {
    process.stderr.write('IG error [' + (err && err.code ? err.code : 'unexpected') + ']: ' + (err && err.stack ? err.stack : err) + '\n');
    process.exitCode = C.exitCodeOf(err);
    process.stdout.write('', function () { process.exit(C.exitCodeOf(err)); });
  });
}
