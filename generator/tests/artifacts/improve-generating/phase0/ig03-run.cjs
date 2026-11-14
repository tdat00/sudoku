'use strict';

/*
 * Task glue of IG-S03 for run.cjs (test side, provisional (pre-freeze)): the executors of the three kinds of job
 * (`scoped-native` = the S3 prototype in one worker, `scoped-pool` = the S3 prototype inside the S5a pool,
 * `solver-audit` = the check-sequence parity audit), the record additions, the identity check against IG-S02's matched
 * baselines and the shard summary.
 *
 * Reference generation is not touched: the scoped arms run the harness's own host paths (`Host.runRequest`,
 * `runAttemptPool`) with the adapter `scoped-solver` added; nothing here edits host.cjs, worker.cjs, loader.cjs, the
 * attempt pool or the verifier. The counters of the S3 runtime reach the host as `scoped-stats` messages that a passive
 * listener collects; a timing instance carries no per-check hashing and no per-finder clock.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const P = require('./attempt-pool.cjs');
const IG02 = require('./ig02-run.cjs');
const AH = require('./scoped-audit-host.cjs');
const SM = require('./scoped-solver.cjs');
const PLAN = require('./plans/ig-s03.cjs');

const HarnessError = C.HarnessError;
const TASK = 'IG-S03';
const APPLICATION_GUARD_MS = 120000;
const sessions = new WeakMap();

// --- run.cjs hooks -------------------------------------------------------------------------------------------------

async function prepare(ctx) {
  const out = { catalogue: null, probe: null, synthetic: null, failure: null, notes: [] };
  const probe = await IG02.probeCatalogue(ctx.host);
  out.catalogue = probe.catalogue;
  out.probe = { wallMs: probe.wallMs, cpuMs: probe.cpuMs,
    note: 'unmeasured: loads the engine once per command so no arm carries the catalogue discovery' };
  if (typeof ctx.readyCheck === 'function') {
    const refusal = ctx.readyCheck({ catalogue: probe.catalogue });
    if (refusal) out.failure = refusal;
  }
  return out;
}

// Collects the S3 counters of every worker spawned while `run` executes (a listener only; nothing is changed).
async function withStats(host, run) {
  const stats = [];
  const original = host.spawn;
  host.spawn = function (data) {
    const spawned = original.call(this, data);
    spawned.worker.on('message', function (m) {
      if (m && m.type === 'scoped-stats') stats.push(m.stats);
    });
    return spawned;
  };
  let obs;
  try {
    obs = await run();
  } finally {
    host.spawn = original;
  }
  obs.scopedStats = stats;
  return obs;
}

function readSaved(repoRoot, spec) {
  const file = path.join(repoRoot, ...spec.file.split('/'));
  const bytes = fs.readFileSync(file);
  if (C.sha256(bytes) !== spec.sha256) {
    throw new HarnessError('source-changed', 'the saved puzzle changed since the manifest: ' + spec.file);
  }
  const saved = JSON.parse(bytes.toString('utf8'));
  return { wire: saved.wire, puzzleHash: saved.puzzleHash, key: saved.key };
}

function emptyGeneration(host, wallMs) {
  return { readyWallMs: null, coldWallMs: null, occupiedWallMs: wallMs, cpuToDecisionMs: null, cpuTotalMs: null,
    cpuReadyTotalMs: null, startupMs: null, startupCpuMs: null, cleanupMs: null, readyOccupiedWallMs: null,
    gridBuildWallMs: null, gridBuildCpuMs: null, cpuApi: host.cpu.api, cpuResolutionStatus: 'unavailable' };
}

async function executeAudit(ctx) {
  const host = ctx.host;
  const job = ctx.job;
  const repoRoot = host.repoRoot;
  let session = sessions.get(host);
  if (!session) {
    session = new AH.AuditSession(host);
    sessions.set(host, session);
  }
  const start = host.mark();
  const obs = { key: job.key, outcome: 'error', timeoutScope: null, wire: null, error: null, fatal: null,
    engineElapsedMs: null, ready: null, lateDecision: false, terminateFailure: null, audit: null,
    guard: { scope: 'request', guardMs: AH.OP_GUARD_MS, deadlineAt: null }, testOnly: false };
  try {
    if (job.audit.kind === 'synthetic') {
      const saved = readSaved(repoRoot, job.audit.mutationPuzzle);
      obs.audit = await AH.runSynthetic(session, { mutationPuzzle: { puzzleKey: job.key, wire: saved.wire } });
      obs.audit.kind = 'synthetic';
      obs.audit.mutationPuzzle = { file: job.audit.mutationPuzzle.file, sha256: job.audit.mutationPuzzle.sha256 };
    } else {
      const saved = readSaved(repoRoot, job.audit);
      obs.audit = await AH.auditPuzzle(session, { puzzleKey: job.key, wire: saved.wire });
      obs.audit.kind = 'puzzle';
      obs.audit.cell = job.audit.cell;
      obs.audit.seed = job.audit.seed;
      obs.audit.puzzleFile = job.audit.file;
      obs.audit.puzzleFileSha256 = job.audit.sha256;
      obs.audit.puzzleHash = saved.puzzleHash;
    }
    obs.audit.adapters = session.adapterInfo();
    obs.outcome = 'audit-ran';
  } catch (err) {
    await session.close();
    sessions.delete(host);
    if (err instanceof AH.AuditTimeout) {
      obs.outcome = 'request-timeout';
      obs.timeoutScope = err.scope;
      obs.error = { code: 'timeout', name: null, message: err.message };
    } else if (err instanceof AH.AuditStartup) {
      // the instances did not start: nothing can be audited and the command stops (never a silent retry)
      obs.error = { code: err.code, name: err.name, message: err.message };
      obs.fatal = 'unsupported-source';
    } else {
      obs.error = { code: err && err.code ? err.code : 'audit-error', name: err && err.name ? err.name : null,
        message: String(err && err.message !== undefined ? err.message : err) };
      if (err instanceof HarnessError && err.code === 'source-changed') obs.fatal = 'source-changed';
    }
  }
  const end = host.mark();
  obs.generation = emptyGeneration(host, end.t - start.t);
  return obs;
}

async function execute(ctx) {
  const job = ctx.job;
  const host = ctx.host;
  if (job.executor === 'solver-audit') return executeAudit(ctx);
  if (job.executor === 'scoped-native') {
    return withStats(host, function () {
      return host.runRequest({ key: job.key, request: job.request, adapterIds: job.adapterIds,
        guardScope: job.guardScope, wantCatalogue: ctx.catalogue === null, readyCheck: ctx.readyCheck });
    });
  }
  if (job.executor === 'scoped-pool') {
    return withStats(host, function () {
      return P.runAttemptPool(host, job, {
        attempts: IG02.attemptsOf(job, ctx.catalogue),
        width: P.POOL_WIDTH,
        spawn: { adapterIds: job.adapterIds },
        readyCheck: ctx.readyCheck,
        makeJob: function (ordinal) { return { kind: 'attempt-run', config: job.request, attempt: ordinal }; }
      });
    });
  }
  throw new HarnessError('plan-missing', 'no executor ' + job.executor);
}

/** The S3 counters of one request: the messages of its workers summed (a message per finished pipeline run). */
function sumStats(list) {
  const total = { messages: list.length, solve: {}, finders: {}, fallbackReasons: {}, violations: 0 };
  list.forEach(function (s) {
    Object.keys(s.solve).forEach(function (k) { total.solve[k] = (total.solve[k] || 0) + s.solve[k]; });
    Object.keys(s.finders).forEach(function (id) {
      if (!total.finders[id]) total.finders[id] = {};
      Object.keys(s.finders[id]).forEach(function (k) {
        total.finders[id][k] = (total.finders[id][k] || 0) + s.finders[id][k];
      });
    });
    Object.keys(s.fallbackReasons).forEach(function (k) {
      total.fallbackReasons[k] = (total.fallbackReasons[k] || 0) + s.fallbackReasons[k];
    });
    total.violations += s.violations.count;
  });
  return total;
}

function augmentRecord(rec, job, obs, io) {
  rec.solverMode = job.solverMode;
  if (job.executor === 'solver-audit') {
    rec.limitOrigin = 'harness audit op guard (' + AH.OP_GUARD_MS + ' ms per message); not a generation measurement';
    rec.poolWidth = 3;
    if (obs.outcome === 'audit-ran') {
      rec.outcome = 'complete';
      rec.audit = JSON.parse(JSON.stringify(obs.audit));
      rec.auditVerdict = obs.audit.verdict === 'pass' || obs.audit.verdict === 'parity-ok' ? 'ok' : 'failed';
    }
    return;
  }
  rec.poolWidth = obs.pool ? obs.pool.width : 1;
  rec.limitOrigin = 'research safety guard (request 180 s); neither arm uses the 120 s application active-time guard';
  const g = rec.generation;
  rec.above120s = {
    readyWall: g.readyWallMs === null ? null : g.readyWallMs > APPLICATION_GUARD_MS,
    coldWall: g.coldWallMs === null ? null : g.coldWallMs > APPLICATION_GUARD_MS,
    note: 'recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard'
  };
  try {
    rec.attemptsPlanned = IG02.attemptsOf(job, io.catalogue);
  } catch (err) {
    rec.attemptsPlanned = null;
  }
  if (obs.pool) {
    rec.pool = obs.pool;
    rec.firstExactOrigin = obs.pool.firstExactOrigin;
    rec.firstExactOrdinal = obs.pool.firstExactOrdinal;
  }
  if (obs.identityViolation) rec.identityViolation = obs.identityViolation;
  rec.scoped = sumStats(obs.scopedStats || []);
  rec.scopedStatsNote = job.executor === 'scoped-pool' ?
    'summed over the pipeline runs that finished in the pool workers (consumed and speculative completed attempts); ' +
    'an attempt terminated before its end reports none' : 'summed over the one pipeline run of the request';
}

// --- identity against IG-S02's matched baselines -------------------------------------------------------------------

const baselineCache = new Map();

function baselineRecord(repoRoot, cell, seed, armId) {
  const rel = PLAN.baselineRecordsFile(repoRoot, cell, seed);
  if (!baselineCache.has(rel)) baselineCache.set(rel, C.readJson(path.join(repoRoot, ...rel.split('/'))).records);
  const want = '/' + cell + ':nightmare:' + seed + '/' + armId;
  return baselineCache.get(rel).find(function (r) {
    return r.key.startsWith('IG-S02/') && r.key.endsWith(want);
  }) || null;
}

function identity(records) {
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const pairs = [];
  records.forEach(function (rec) {
    if (rec.arm === 'audit') {
      if (rec.outcome !== 'complete' && rec.outcome !== 'unstarted') {
        pairs.push({ pairId: rec.key, verdict: 'identity-failed', problems: ['audit outcome ' + rec.outcome] });
      } else if (rec.outcome === 'complete') {
        const ok = rec.auditVerdict === 'ok';
        pairs.push({ pairId: rec.key, verdict: ok ? 'identity-ok' : 'identity-failed',
          problems: ok ? [] : (rec.audit.problems || []).slice(0, 5) });
      }
      return;
    }
    if (rec.outcome === 'unstarted') return;
    const base = baselineRecord(repoRoot, rec.puzzleVariant, rec.requestSeed, 'native-w1');
    if (rec.outcome !== 'complete' || !base || base.outcome === 'request-timeout') {
      pairs.push({ pairId: rec.key, verdict: 'not-comparable',
        problems: [rec.outcome !== 'complete' ? 'the scoped arm did not complete (' + rec.outcome + ')' :
          'no usable baseline'] });
      return;
    }
    const cmp = R.compareDigests(base.digests, rec.digests);
    const problems = [];
    if (!cmp.equal) problems.push('digests differ in: ' + cmp.differing.join(', '));
    if (rec.claimedExact !== base.claimedExact) problems.push('claimed exact differs from the baseline');
    if (rec.claimedExact === true && rec.verifiedExact !== true) problems.push('false exact flag');
    pairs.push({ pairId: rec.key, baselineKey: base.key, verdict: problems.length === 0 ? 'identity-ok' :
      'identity-failed', problems: problems, differing: cmp.differing, puzzleHash: rec.puzzleHash,
    baselinePuzzleHash: base.puzzleHash, scopedDigest: rec.digests.all, baselineDigest: base.digests.all });
  });
  const count = function (v) { return pairs.filter(function (p) { return p.verdict === v; }).length; };
  return { pairs: pairs, failed: count('identity-failed'), ok: count('identity-ok'),
    notComparable: count('not-comparable'), deferred: 0, complete: pairs.length > 0 && count('identity-ok') === pairs.length };
}

// --- shard summary -------------------------------------------------------------------------------------------------

function summary(ctx) {
  const prepared = ctx.prepared;
  const rows = ctx.mergedRecords || ctx.records;
  return {
    estimateVerdict: 'provisional; judged in the task summary against IG-S02\'s matched baselines',
    exclusions: ['the baselines are IG-S02\'s records (not rerun here)', 'audited wall time is not a speed measurement',
      'the unmeasured catalogue probe and the independent audit are outside every generation time',
      'a censored or unverified arm proves neither identity nor speed'],
    extra: {
      arms: { prototype: 'S3 prototype (scoped negative scans of singles and subsets) with the harness paths of IG-S02',
        audit: 'three engine instances: plain native, native with audit annotations, scoped with audit annotations' },
      identity: ctx.parity,
      scoped: rows.filter(function (r) { return r.scoped; }).map(function (r) {
        return { key: r.key, stats: r.scoped, note: r.scopedStatsNote }; }),
      audits: rows.filter(function (r) { return r.audit; }).map(function (r) {
        return { key: r.key, kind: r.audit.kind, verdict: r.audit.verdict, problems: (r.audit.problems || []).slice(0, 5) };
      }),
      catalogueProbe: prepared ? prepared.probe : null,
      chain: ctx.chainInfo
    }
  };
}

module.exports = { TASK, prepare, execute, augmentRecord, identity, summary, sumStats, withStats, readSaved,
  baselineRecord };
