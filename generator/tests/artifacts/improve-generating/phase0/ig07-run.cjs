'use strict';

/*
 * Task glue of IG-S07 for run.cjs (test side, provisional (pre-freeze)): the unmeasured catalogue probe, the check of the
 * IG-S02 reference evidence, the calibration of the instrumentation cost and, in the first command of the round, the engine
 * checks of the profile (`prepare`); the profiled native request (`execute`); the record additions with the checked profile
 * (`augmentRecord`); the identity against the unprofiled comparator and the shard summary.
 *
 * A profiled request is the native pipeline in one worker on an engine instance with the adapter `profile` (profile-runtime.cjs
 * is installed for that one call only, see ig07-worker.cjs): the host path is the unchanged `Host.runRequest` (guards, wall, one
 * process CPU reading at the host, cleanup), only the job kind differs. The profile message of the worker is collected by a
 * passive listener and never takes part in the request accounting. The independent verification is the unpatched verifier of
 * run.cjs. Nothing here edits host.cjs, loader.cjs, the verifier or any generation code.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const IG02 = require('./ig02-run.cjs');
const IG04 = require('./ig04-run.cjs');
const PR = require('./profile-runtime.cjs');
const PLAN = require('./plans/ig-s07.cjs');

const HarnessError = C.HarnessError;
const TASK = 'IG-S07';
const SYNTHETIC_NOTE = /^synthetic profile tests .*: (\d+)\/(\d+) passed$/;
// The files of the accounting and loading path: byte-identical to the harness of IG-S02's generation evidence.
const ACCOUNTING_FILES = Object.freeze(['host.cjs', 'loader.cjs', 'common.cjs', 'records.cjs', 'manifest.cjs']);
const calibrations = new WeakMap();

// --- reference compatibility ---------------------------------------------------------------------------------------------

function readIfExists(file) {
  return fs.existsSync(file) ? C.readJson(file) : null;
}

/**
 * Active reference compatibility of one headline job against IG-S02's matched native-w1 record: the runtime and catalogue
 * fingerprints of that evidence equal the loaded ones, the accounting-path files of the harness are byte-identical to those
 * of its generation evidence, and the record is a generated result. The changed files are listed, never hidden.
 */
function referenceCompat(repoRoot, job, runtimeFingerprint, catalogueFingerprint) {
  const base = PLAN.baselineRecordsFile(repoRoot, job.puzzleVariant, job.requestSeed);
  const dir = path.dirname(path.join(repoRoot, ...base.file.split('/')));
  const command = readIfExists(path.join(dir, 'command.json'));
  const manifest = readIfExists(path.join(dir, 'source-manifest.json'));
  const records = readIfExists(path.join(dir, 'records.json'));
  const problems = [];
  const out = { baselineKey: base.key, recordsFile: base.file, ok: false, problems: problems };
  if (!command || !manifest || !records) {
    problems.push('the IG-S02 evidence of ' + base.key + ' is incomplete (command, source manifest or records)');
    return out;
  }
  out.baselineRuntimeFingerprint = command.runtimeFingerprint;
  out.baselineCatalogueFingerprint = command.catalogueFingerprint;
  out.baselineHarnessFingerprint = command.harnessFingerprint;
  if (command.runtimeFingerprint !== runtimeFingerprint) problems.push('the runtime of the IG-S02 evidence differs from the loaded one');
  if (command.catalogueFingerprint !== catalogueFingerprint) problems.push('the catalogue of the IG-S02 evidence differs from the loaded one');
  const rec = records.records.find(function (r) { return r.key === base.key; });
  if (!rec) problems.push('no record ' + base.key);
  else if (!rec.digests || !rec.generation || rec.generation.readyWallMs === null) problems.push('the baseline record has no generated result');
  const now = C.harnessFingerprint();
  const was = new Map(manifest.harness.files.map(function (f) { return [f.file, f.sha256]; }));
  const cur = new Map(now.files.map(function (f) { return [f.file, f.sha256]; }));
  const changed = [];
  const removed = [];
  was.forEach(function (hash, file) {
    if (!cur.has(file)) removed.push(file);
    else if (cur.get(file) !== hash) changed.push(file);
  });
  out.harnessFilesAtEvidence = was.size;
  out.changedFiles = changed;
  out.removedFiles = removed;
  out.accountingFilesChanged = ACCOUNTING_FILES.filter(function (f) { return changed.indexOf(f) >= 0 || removed.indexOf(f) >= 0; });
  if (out.accountingFilesChanged.length > 0) {
    problems.push('accounting-path files changed since the IG-S02 generation evidence: ' + out.accountingFilesChanged.join(', '));
  }
  out.ok = problems.length === 0;
  return out;
}

// --- run.cjs hooks: prepare --------------------------------------------------------------------------------------------------

function syntheticPassedBefore(repoRoot, round) {
  const roundDir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round);
  return R.scanRoundCommands(roundDir).some(function (e) {
    return e.command && e.command.task === TASK && (e.command.notes || []).some(function (note) {
      const m = SYNTHETIC_NOTE.exec(note);
      return m !== null && m[1] === m[2];
    });
  });
}

/**
 * The command of the revision r2 (shard `lc`, no request): the loop-check comparison on the real engine, an unpatched instance
 * against the patched sources without and with the runtime. The verdict is recorded, never a stop: a failed comparison is a
 * finding of the revision, not a harness failure. No catalogue probe and no calibration (neither is used here).
 */
async function prepareLoopCheck(ctx) {
  const out = { catalogue: null, probe: null, synthetic: null, calibration: null, compat: [], failure: null, notes: [], loopCheck: null };
  const tests = require('./ig07-test.cjs');
  const L = require('./loader.cjs');
  const run = await tests.loopChecks({ host: ctx.host, workerCall: IG04.workerCall });
  const failed = run.results.filter(function (r) { return !r.ok; });
  out.loopCheck = { ok: failed.length === 0, passed: run.results.length - failed.length, total: run.results.length, results: run.results,
    rows: run.rows, workerWallMs: run.wallMs, workerCpuMs: run.cpuMs, workerEngineMs: run.workerEngineMs,
    adapterHash: C.digestOf(L.getAdapter('profile')), adapterVersion: L.getAdapter('profile').version };
  out.notes.push('loop-check (real engine, revision r2): ' + out.loopCheck.passed + '/' + out.loopCheck.total + ' passed' +
    (failed.length > 0 ? ' (failed: ' + failed.map(function (r) { return r.id; }).join(', ') + ')' : ''));
  return out;
}

async function prepare(ctx) {
  if (ctx.shard && ctx.shard.shard === PLAN.LOOP_SHARD) return prepareLoopCheck(ctx);
  const host = ctx.host;
  const out = { catalogue: null, probe: null, synthetic: null, calibration: null, compat: [], failure: null, notes: [] };
  const probe = await IG02.probeCatalogue(host);
  out.catalogue = probe.catalogue;
  out.probe = { wallMs: probe.wallMs, cpuMs: probe.cpuMs,
    note: 'unmeasured: loads the engine once per command so no request carries the catalogue discovery' };
  if (typeof ctx.readyCheck === 'function') {
    const refusal = ctx.readyCheck({ catalogue: probe.catalogue });
    if (refusal) {
      out.failure = refusal;
      return out;
    }
  }
  ctx.jobs.forEach(function (job) {
    if (!ctx.runKeys.has(job.key) || job.cellKind !== 'headline') return;
    const compat = referenceCompat(ctx.repoRoot, job, host.runtimeFingerprint, probe.catalogue.fingerprint);
    out.compat.push(Object.assign({ key: job.key }, compat));
    if (!compat.ok && !out.failure) {
      out.failure = { code: 'reference-incompatible', message: 'the IG-S02 reference of ' + job.key + ' is not compatible: ' +
        compat.problems.join('; ') };
    }
  });
  if (out.failure) return out;
  const cal = await IG04.workerCall(host, { role: 'request', adapterIds: [], noEngine: true },
    { kind: 'ig07-calibrate', options: { iterations: 100000, repeats: 5 } }, ['decision'], 30000);
  out.calibration = cal.reply ? Object.assign({ wallMs: cal.wallMs, cpuMs: cal.cpuMs }, cal.reply.costs) : null;
  if (out.calibration === null) {
    out.notes.push('instrumentation calibration failed: ' + (cal.error ? cal.error.message : 'no reply'));
  }
  calibrations.set(host, out.calibration);
  if (!syntheticPassedBefore(ctx.repoRoot, ctx.round)) {
    const tests = require('./ig07-test.cjs');
    const run = await tests.engineChecks({ host: host, workerCall: IG04.workerCall });
    const failed = run.results.filter(function (r) { return !r.ok; });
    out.synthetic = { ok: failed.length === 0, passed: run.results.length - failed.length, total: run.results.length,
      workerWallMs: run.wallMs, workerCpuMs: run.cpuMs, results: run.results };
    out.notes.push('synthetic profile tests (engine, first command of the round): ' + out.synthetic.passed + '/' +
      out.synthetic.total + ' passed');
    if (failed.length > 0) {
      out.failure = { code: 'profile-tests-failed', message: 'synthetic profile tests failed: ' + failed.map(function (r) {
        return r.id + ' (' + (r.detail && r.detail.error ? r.detail.error : 'failed') + ')';
      }).join('; ') };
    }
  }
  return out;
}

// --- run.cjs hooks: execute ------------------------------------------------------------------------------------------------------

/** Collects the `ig07-profile` messages of every worker spawned while `run` executes (a passive listener only). */
async function withProfile(host, run) {
  const messages = [];
  const hadOwn = Object.prototype.hasOwnProperty.call(host, 'spawn');
  const original = host.spawn;
  host.spawn = function (data) {
    const spawned = original.call(this, data);
    spawned.worker.on('message', function (m) {
      if (m && m.type === 'ig07-profile') messages.push(m);
    });
    return spawned;
  };
  let obs;
  try {
    obs = await run();
  } finally {
    if (hadOwn) host.spawn = original;
    else delete host.spawn;
  }
  obs.profileMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  obs.profileMessageCount = messages.length;
  return obs;
}

async function execute(ctx) {
  const job = ctx.job;
  if (job.executor !== 'profile') throw new HarnessError('plan-missing', 'no executor ' + job.executor);
  const obs = await withProfile(ctx.host, function () {
    return ctx.host.runRequest({ key: job.key, kind: 'ig07-profile-request', request: job.request,
      adapterIds: job.adapterIds, guardScope: job.guardScope, wantCatalogue: ctx.catalogue === null,
      readyCheck: ctx.readyCheck });
  });
  obs.calibration = calibrations.get(ctx.host) || null;
  return obs;
}

// --- record additions -----------------------------------------------------------------------------------------------------------

/** Where the returned puzzle came from, by the observed samples: the first exact sample, the local search or the keeper. */
function exactOrigin(profile, wire) {
  if (!wire || wire.exact !== true) return { origin: null, ordinal: null, attempt: null };
  const rows = profile && Array.isArray(profile.samples) ? profile.samples : [];
  const hit = rows.find(function (s) { return s.exact === true; });
  if (hit) {
    return { origin: hit.kind === 'local' ? 'local-search' : 'sample', ordinal: hit.sample, attempt: hit.attempt,
      kind: hit.kind };
  }
  return { origin: 'keeper', ordinal: null, attempt: null, kind: null };
}

function attemptWork(wire) {
  if (!wire || !Array.isArray(wire.work)) return null;
  return wire.work.map(function (w, i) {
    return { attempt: i + 1, ratings: w.ratings, proposals: w.proposals, maxRatings: w.maxRatings,
      maxProposals: w.maxProposals, localSearches: w.localSearches.map(function (l) {
        return { ratings: l.ratings, proposals: l.proposals, firstShallowAt: l.firstShallowAt,
          shallowRatings: l.shallowRatings, shallowLimit: l.shallowLimit, capHit: l.capHit };
      }) };
  });
}

function augmentRecord(rec, job, obs, io) {
  rec.solverMode = job.solverMode;
  rec.poolWidth = 1;
  rec.cellKind = job.cellKind;
  rec.limitOrigin = 'research safety guard (request 180 s); the profiled request is an attribution run, not a timing run';
  if (job.executor !== 'profile') return;
  const message = obs.profileMessage;
  const profile = message ? message.profile : null;
  rec.profile = profile;
  rec.profileRestore = message ? message.restore : null;
  rec.profileWorkerRunMs = message ? message.runMs : null;
  rec.profileCalibration = obs.calibration || null;
  rec.profileMessages = obs.profileMessageCount;
  const problems = [];
  if (obs.outcome === 'complete' || (message && message.ok)) {
    if (!profile) problems.push('no profile message');
    else {
      PR.consistency(profile, { allowLeaks: false }).forEach(function (p) { problems.push(p); });
      if (!message.restore || message.restore.restored !== true) problems.push('the observation hooks were not restored');
    }
  } else if (message && message.restore && message.restore.restored !== true) {
    problems.push('the observation hooks were not restored after an error');
  }
  rec.profileProblems = problems;
  if (problems.length > 0) rec.identityViolation = 'profile-inconsistent: ' + problems.slice(0, 3).join('; ');
  if (profile) {
    const loopChecks = typeof profile.counters.loopChecks === 'number' ? profile.counters.loopChecks : profile.counters.loopChecksDerived;
    rec.counts = Object.assign(rec.counts, {
      solverChecks: profile.counters.finderChecks + loopChecks,
      dfsEntries: profile.counters.dfsEntries,
      dfsChecks: profile.counters.dfsSearchChecks
    });
    rec.samplesUsed = profile.samples.filter(function (s) { return s.kind !== 'local'; }).length;
  }
  if (obs.wire) {
    rec.attemptsWork = attemptWork(obs.wire);
    const origin = exactOrigin(profile, obs.wire);
    rec.firstExactOrigin = origin.origin;
    rec.firstExactOrdinal = origin.ordinal;
    rec.firstExactDetail = origin;
  }
}

// --- identity against the unprofiled comparator -----------------------------------------------------------------------------------

const baselineCache = new Map();

function baselineRecord(repoRoot, cell, seed) {
  const base = PLAN.baselineRecordsFile(repoRoot, cell, seed);
  if (!baselineCache.has(base.file)) baselineCache.set(base.file, C.readJson(path.join(repoRoot, ...base.file.split('/'))).records);
  return baselineCache.get(base.file).find(function (r) { return r.key === base.key; }) || null;
}

function comparatorOf(rec, records, repoRoot) {
  if (rec.cellKind === 'control') {
    const mate = records.find(function (r) { return r.shard === rec.shard && r.arm === 'reference'; });
    return mate ? { source: 'same-command unprofiled arm', record: mate } : null;
  }
  const base = baselineRecord(repoRoot, rec.puzzleVariant, rec.requestSeed);
  return base ? { source: 'IG-S02 native-w1 (harness generation dd759a22)', record: base } : null;
}

function identity(records) {
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const pairs = [];
  records.forEach(function (rec) {
    if (rec.arm !== 'prototype' || rec.outcome === 'unstarted') return;
    const cmp = comparatorOf(rec, records, repoRoot);
    if (!cmp || rec.outcome !== 'complete' || !cmp.record.digests || cmp.record.outcome === 'request-timeout' ||
        cmp.record.outcome === 'unstarted') {
      pairs.push({ pairId: rec.key, verdict: 'not-comparable', problems: [rec.outcome !== 'complete' ?
        'the profiled request did not complete (' + rec.outcome + ')' : 'no usable comparator'] });
      return;
    }
    const diff = R.compareDigests(cmp.record.digests, rec.digests);
    const problems = [];
    if (!diff.equal) problems.push('digests differ in: ' + diff.differing.join(', '));
    if (rec.claimedExact !== cmp.record.claimedExact) problems.push('claimed exact differs from the comparator');
    if (rec.claimedExact === true && rec.verifiedExact !== true) problems.push('false exact flag');
    pairs.push({ pairId: rec.key, comparator: cmp.source, comparatorKey: cmp.record.key,
      verdict: problems.length === 0 ? 'identity-ok' : 'identity-failed', problems: problems, differing: diff.differing,
      puzzleHash: rec.puzzleHash, comparatorPuzzleHash: cmp.record.puzzleHash, profiledDigest: rec.digests.all,
      comparatorDigest: cmp.record.digests.all });
  });
  const count = function (v) { return pairs.filter(function (p) { return p.verdict === v; }).length; };
  return { pairs: pairs, failed: count('identity-failed'), ok: count('identity-ok'), notComparable: count('not-comparable'),
    deferred: 0, complete: pairs.length > 0 && count('identity-ok') === pairs.length };
}

// --- shard summary ------------------------------------------------------------------------------------------------------------------

function compactView(rec) {
  const p = rec.profile;
  if (!p) return { key: rec.key, outcome: rec.outcome, profile: null };
  const ms = {};
  p.stage.forEach(function (r) { ms[r[0]] = (ms[r[0]] || 0) + r[3]; });
  p.finders.forEach(function (r) { ms[r[0]] = (ms[r[0]] || 0) + r[5]; });
  const share = {};
  Object.keys(ms).forEach(function (k) { share[k] = p.rootMs > 0 ? Math.round(ms[k] / p.rootMs * 1000) / 1000 : null; });
  const finderMs = p.finders.reduce(function (s, r) { return s + r[5]; }, 0);
  return { key: rec.key, outcome: rec.outcome, rootMs: p.rootMs, workerRunMs: rec.profileWorkerRunMs,
    readyWallMs: rec.generation.readyWallMs, contextShare: share,
    finderShareOfRoot: p.rootMs > 0 ? Math.round(finderMs / p.rootMs * 1000) / 1000 : null,
    finderCalls: p.counters.finderCalls, solves: p.counters.solves, canonicalRates: p.counters.canonicalRates,
    samples: p.samples.length, problems: rec.profileProblems };
}

function summary(ctx) {
  const prepared = ctx.prepared;
  const rows = ctx.mergedRecords || ctx.records;
  return {
    estimateVerdict: 'attribution only; the headline timings stay IG-S02\'s (profiles are not timing evidence)',
    exclusions: ['an instrumented run is not a timing run: the profiled wall time is never a before/after figure',
      'the unmeasured catalogue probe, the calibration and the independent audit are outside every generation time',
      'the three controls\' unprofiled arms are overhead comparators, not new headline measurements'],
    extra: {
      arms: { prototype: 'profiled native request (adapter profile, runtime installed for the one pipeline call)',
        reference: 'unprofiled native request (the unchanged host path), controls only' },
      identity: ctx.parity,
      profiles: rows.filter(function (r) { return r.arm === 'prototype'; }).map(compactView),
      calibration: prepared ? prepared.calibration : null,
      referenceCompatibility: prepared ? prepared.compat : null,
      engineChecks: prepared && prepared.synthetic ? { passed: prepared.synthetic.passed, total: prepared.synthetic.total,
        results: prepared.synthetic.results.map(function (r) { return { id: r.id, ok: r.ok }; }) } : null,
      loopCheck: prepared && prepared.loopCheck ? prepared.loopCheck : null,
      catalogueProbe: prepared ? prepared.probe : null,
      chain: ctx.chainInfo
    }
  };
}

module.exports = { TASK, ACCOUNTING_FILES, prepare, execute, augmentRecord, identity, summary, referenceCompat, withProfile,
  exactOrigin, attemptWork, compactView, comparatorOf, baselineRecord, syntheticPassedBefore };
