'use strict';

/*
 * One wrapped development check of IG-S09 (test side, provisional (pre-freeze)): before the shards run, the complete per-job flow
 * (capture, post-timing diagnosis, harness validation, record, record check, identity) on the real engine for Normal seed 300: the
 * G0 and the G1 request of that pair in their manifest order and the observer-free control. It writes one immutable report and a
 * command.json (the charge: its occupied time plus the 45 s grace) beside it and nothing else; its requests are NOT part of the
 * shards' counts, and it never changes a manifest, a budget or a record of the task.
 *
 *   Invoke-IgNode -Repo sudoku -Task 'IG-S09-dev' -NodeArgs @('<this file>', '--round=provisional-r1', '--seed=300')
 */
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const L = require('./loader.cjs');
const H = require('./host.cjs');
const RUN = require('./run.cjs');
const IG09 = require('./ig09-run.cjs');
const G = require('./greater-than-diagnostic.cjs');

const TASK = 'IG-S09';
const WRAPPER_TASK = 'IG-S09-dev';

function parseArgs(argv) {
  const opts = { round: null, seed: 300, level: 'normal', out: 'dev-check-a1.json' };
  argv.forEach(function (arg) {
    const m = /^--(round|seed|level|out|requested-at)=(.*)$/.exec(arg);
    if (!m) throw new C.HarnessError('args', 'unknown argument ' + arg);
    const key = m[1] === 'requested-at' ? 'requestedAt' : m[1];
    opts[key] = key === 'seed' ? Number(m[2]) : m[2];
  });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.round || '')) throw new C.HarnessError('args', 'missing or bad --round');
  return opts;
}

/**
 * The priority wait of a wrapped command is the time between the caller's request and the process admission. The process itself cannot
 * observe when it was requested: without a caller-supplied `--requested-at` the wait is UNKNOWN (null), never zero (the first
 * development check of IG-S09 recorded a fictitious 0 here, corrected in the r2 report).
 */
function waitOf(requestedAt, admittedAt) {
  if (!requestedAt) return null;
  const ms = Date.parse(admittedAt) - Date.parse(requestedAt);
  return Number.isFinite(ms) ? Math.max(0, ms) : null;
}

async function main(argv) {
  const opts = parseArgs(argv);
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const processStartedAt = new Date(performance.timeOrigin).toISOString();
  const requestedAt = opts.requestedAt || null;
  const lock = RUN.observeLock(WRAPPER_TASK);
  RUN.assertLockOwned(lock, WRAPPER_TASK);
  const set = L.loadSourceSet({ repoRoot: repoRoot });
  const harness = C.harnessFingerprint();
  const host = new H.Host({ repoRoot: repoRoot, runtimeFingerprint: set.fingerprint, deadlineMs: 200000 });
  host.calibrate();
  const manifest = M.buildManifest(TASK, opts.round);
  const jobs = manifest.jobs.filter(function (j) { return j.requestSeed === opts.seed && j.level === opts.level; });
  if (jobs.length === 0) throw new C.HarnessError('args', 'no job for ' + opts.level + ' ' + opts.seed);
  jobs.sort(function (a, b) { return (a.cellKind === 'control') - (b.cellKind === 'control') || a.order - b.order; });
  const report = { schema: 'ig09-dev-check/1', task: TASK, round: opts.round, evidenceStatus: manifest.evidenceStatus,
    notice: 'development check before the shards: its requests are not part of any shard', startedAt: processStartedAt, requestedAt: requestedAt,
    runtimeFingerprint: set.fingerprint, harnessFingerprint: harness.fingerprint, manifestHash: manifest.manifestHash, cpu: host.cpu, jobs: [] };
  let catalogue = null;
  const records = [];
  for (const job of jobs) {
    const t0 = host.mark();
    const obs = job.executor === 'gt' ? await IG09.execute({ host: host, job: job, catalogue: catalogue, readyCheck: null }) :
      await host.runRequest({ key: job.key, request: job.request, adapterIds: job.adapterIds, guardScope: job.guardScope, wantCatalogue: catalogue === null });
    if (obs.ready && obs.ready.catalogue && catalogue === null) catalogue = obs.ready.catalogue;
    let validation = null;
    if (obs.outcome === 'complete') validation = await host.runValidation(obs.wire, { level: job.level });
    const rec = RUN.recordOfRequest(job, obs, validation, { deadlineMs: 200000 });
    IG09.augmentRecord(rec, job, obs, { repoRoot: repoRoot });
    const t1 = host.mark();
    records.push(rec);
    const g = rec.generation || {};
    const cap = rec.gt && rec.gt.capture ? rec.gt.capture : null;
    const diag = rec.gt ? rec.gt.diag : null;
    report.jobs.push({ key: job.key, arm: job.gtArm, estimateMs: job.estimateMs, occupiedMs: t1.t - t0.t, outcome: rec.outcome,
      claimedExact: rec.claimedExact, verifiedExact: rec.verifiedExact, recordProblems: R.checkRecord(JSON.parse(JSON.stringify(rec))),
      captureProblems: rec.gt ? rec.gt.problems : null,
      identityViolation: rec.identityViolation || null, readyWallMs: g.readyWallMs, cpuTotalMs: g.cpuTotalMs, cpuResolutionStatus: g.cpuResolutionStatus,
      engineElapsedMs: rec.engineElapsedMs, captureBuildMs: rec.gt ? rec.gt.captureBuildMs : null, workerRunMs: rec.gt ? rec.gt.workerRunMs : null,
      samples: cap ? cap.samples.length : null, totals: cap ? cap.totals : null, passes: cap ? cap.samples.reduce(function (t, s) { return t + s.passes.length; }, 0) : null,
      g1: cap && job.gtArm === 'g1' ? G.sumPasses(G.passesOf(cap.samples, function (p) { return p.firstTechnique; })).g1 : null,
      diag: diag ? { status: diag.status, wallMs: diag.wallMs, cpuMs: diag.cpuMs, plan: diag.plan, reuse: diag.reuse, unstarted: diag.unstarted,
        rows: Object.keys(diag.rows).length, probe: diag.probe ? { groupsPlanned: diag.probe.groupsPlanned, rows: diag.probe.rows, reusedFrom: diag.probe.reusedFrom } : null,
        workerDone: diag.workerDone } : null,
      validation: rec.validation, validationStatus: rec.validationDetail ? rec.validationDetail.status : null, puzzleHash: rec.puzzleHash,
      digests: rec.digests ? rec.digests.all : null, recordBytes: JSON.stringify(rec).length, attemptsWork: rec.attemptsWork || null });
  }
  await host.terminateAll();
  report.identity = IG09.identity(records.filter(function (r) { return r.cellKind !== 'control'; }), { readG0: function () { return null; } });
  const g0 = records.find(function (r) { return r.gtArm === 'g0'; });
  const control = records.find(function (r) { return r.cellKind === 'control'; });
  report.controlIdentity = g0 && control ? IG09.identity([control], { readG0: function () { return g0; } }) : null;
  const levels = catalogue ? catalogue.snapshot.levels : null;
  report.split = {};
  if (levels) {
    ['g0', 'g1'].forEach(function (arm) {
      const rec = records.find(function (r) { return r.gtArm === arm; });
      if (!rec || !rec.gt || !rec.gt.capture) return;
      const classified = rec.gt.capture.samples.filter(function (s) { return s.kind !== 'local' && s.setup && s.final; }).map(function (s) {
        return G.classifySample(s, rec.gt.diag && rec.gt.diag.rows ? rec.gt.diag.rows[s.ordinal] || null : null, rec.level, levels);
      });
      report.split[arm] = G.missSplit(classified);
    });
  }
  const endedAt = C.isoNow();
  report.endedAt = endedAt;
  const occupiedMs = Math.round(Date.now() - performance.timeOrigin);
  report.occupiedMs = occupiedMs;
  const dir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), opts.round, TASK, 'dev-check');
  C.writeJsonAtomic(repoRoot, path.join(dir, opts.out), report);
  const bad = report.jobs.filter(function (j) {
    return j.recordProblems.length > 0 || j.outcome === 'error' || (j.captureProblems && j.captureProblems.length > 0) || j.identityViolation;
  });
  const failed = bad.length > 0 || report.identity.failed > 0 || (report.controlIdentity && report.controlIdentity.failed > 0);
  C.writeJsonAtomic(repoRoot, path.join(dir, 'command.json'), { schema: C.SCHEMA, task: TASK, shard: 'dev-check', round: opts.round, attemptId: 'a1',
    status: failed ? 'dev-check-failed' : 'dev-check-complete', evidenceStatus: manifest.evidenceStatus, wrapperTask: WRAPPER_TASK, harnessFingerprint: harness.fingerprint,
    runtimeFingerprint: set.fingerprint, notes: ['development check of the IG-S09 flow (' + opts.level + ' seed ' + opts.seed + '); not part of any shard'],
    timing: { requestedAt: requestedAt, admittedAt: processStartedAt, endedAt: endedAt, occupiedMs: occupiedMs, chargedGraceMs: C.GUARDS.graceMs,
      priorityWaitMs: waitOf(requestedAt, processStartedAt) }, exit: failed ? 1 : 0 });
  process.stdout.write(JSON.stringify({ ig: 'dev-check', jobs: report.jobs.map(function (j) { return { key: j.key, outcome: j.outcome, occupiedMs: Math.round(j.occupiedMs),
    samples: j.samples, problems: j.recordProblems.length + (j.captureProblems ? j.captureProblems.length : 0) }; }), identity: { ok: report.identity.ok, failed: report.identity.failed },
  control: report.controlIdentity ? { ok: report.controlIdentity.ok, failed: report.controlIdentity.failed } : null, occupiedMs: occupiedMs, out: opts.out }) + '\n');
  return failed ? 1 : 0;
}

module.exports = { waitOf, parseArgs };

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
