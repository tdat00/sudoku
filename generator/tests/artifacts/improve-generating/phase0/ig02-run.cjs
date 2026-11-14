'use strict';

/*
 * Task glue of IG-S02 for run.cjs: the unmeasured catalogue probe and the synthetic pool tests of the first shard
 * (`prepare`), the attempt pool as the executor of the attempts-w4 arm (`execute`), the record additions (`augmentRecord`:
 * pool details, the 120 s notes, the saved returned puzzle), the native/pooled identity (`identity`) and the shard
 * summary. Also the paired-row and per-cell analysis that the task summary (aggregate.cjs) uses. Provisional (pre-freeze).
 *
 * Arms: native-w1 is the record arm `reference` (the unmodified pipeline in one worker), attempts-w4 the arm `prototype`
 * (S5a, min(4, A) workers). Neither arm uses the 120 s application guard of worker-client/gen.worker: the guard is the
 * research request guard of 180 s; a wall above 120 s is recorded and is no application pass either way.
 */
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const P = require('./attempt-pool.cjs');

const HarnessError = C.HarnessError;
const TASK = 'IG-S02';
const APPLICATION_GUARD_MS = 120000;

// The report's anchors (docs/improve-generating/report.md section 1 and the S5a row of section 5): today's median / p95
// in seconds and the S5a factor on boards of that many attempts. Planning anchors, never acceptance thresholds.
const REPORT = Object.freeze({
  mega16: { attempts: 2, today: [104.1, 117.0], s5a: [1.7, 1.8], afterFirstPhases: [39, 50] },
  mega12: { attempts: 4, today: [23.7, 25.2], s5a: [2.8, 3.0], afterFirstPhases: [5.4, 7.2] },
  samurai: { attempts: 2, today: [26.7, null], s5a: [1.7, 1.8], afterFirstPhases: [10.3, 11.6] },
  classic9: { attempts: 8, today: [4.91, 5.72], s5a: [2.8, 3.0], afterFirstPhases: [1.17, 1.7] },
  killer: { attempts: 8, today: [17.8, 30.0], s5a: [2.8, 3.0], afterFirstPhases: [4.5, 9.8] },
  greaterThan: { attempts: 8, today: [9.3, 19.2], s5a: [2.8, 3.0], afterFirstPhases: [2.2, 6.0] }
});

// --- run.cjs hooks ----------------------------------------------------------------------------------------------

/** One unmeasured worker that loads the engine and reports the discovered catalogue (and default attempts). */
async function probeCatalogue(host) {
  if (host.stopped) throw new HarnessError('host-stopped', 'the host stopped: ' + host.stopped);
  const start = host.mark();
  const spawned = host.spawn({ role: 'request', adapterIds: [], noEngine: false, wantCatalogue: true,
    expectedFingerprint: host.runtimeFingerprint });
  const deadlineAt = Math.min(start.t + host.guards.validationMs, host.commandTimerAt);
  let first;
  try {
    first = await spawned.channel.next(['ready', 'fatal'], deadlineAt, 'command');
  } finally {
    await host.terminateWorker(spawned.worker);
  }
  const end = host.mark();
  if (first.kind === 'message' && first.msg.type === 'ready' && first.msg.catalogue) {
    return { catalogue: first.msg.catalogue, wallMs: end.t - start.t, cpuMs: end.cpu - start.cpu };
  }
  const error = first.kind === 'message' ? first.msg.error : null;
  throw new HarnessError(error && error.code ? error.code : 'catalogue-probe',
    'the catalogue probe failed: ' + (error ? error.message : first.kind));
}

/**
 * The synthetic pool tests run first in the round: in the first shard that is executed (m16-1 when the task is run as
 * documented), and again in a later command only when no earlier command of the task recorded them as all passed.
 */
function syntheticPassedBefore(repoRoot, round) {
  const roundDir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round);
  return R.scanRoundCommands(roundDir).some(function (e) {
    return e.command && e.command.task === TASK && (e.command.notes || []).some(function (note) {
      const m = /^synthetic pool tests .*: (\d+)\/(\d+) passed$/.exec(note);
      return m !== null && m[1] === m[2];
    });
  });
}

async function prepare(ctx) {
  const host = ctx.host;
  const out = { catalogue: null, probe: null, synthetic: null, failure: null, notes: [] };
  const probe = await probeCatalogue(host);
  out.catalogue = probe.catalogue;
  out.probe = { wallMs: probe.wallMs, cpuMs: probe.cpuMs,
    note: 'unmeasured: loads the engine once per command so neither arm carries the catalogue discovery' };
  if (typeof ctx.readyCheck === 'function') {
    const refusal = ctx.readyCheck({ catalogue: probe.catalogue });
    if (refusal) {
      out.failure = refusal;
      return out;
    }
  }
  if (!syntheticPassedBefore(ctx.repoRoot, ctx.round)) {
    const tests = require('./pool-test.cjs');
    const run = await tests.runSynthetic({ cpu: host.cpu });
    const failed = run.results.filter(function (r) { return !r.ok; });
    out.synthetic = { ok: run.ok, passed: run.results.length - failed.length, total: run.results.length,
      results: run.results.map(function (r) {
        return { id: r.id, group: r.group, ok: r.ok, ms: r.ms, title: r.title, detail: r.detail };
      }) };
    out.notes.push('synthetic pool tests (first shard run): ' + out.synthetic.passed + '/' + out.synthetic.total +
      ' passed');
    if (!run.ok) {
      out.failure = { code: 'pool-tests-failed', message: 'synthetic pool tests failed: ' + failed.map(function (r) {
        return r.id + ' (' + (r.detail && r.detail.error ? r.detail.error : 'failed') + ')';
      }).join('; ') };
    }
  }
  return out;
}

function attemptsOf(job, catalogue) {
  if (job.request.maxAttempts !== undefined) return job.request.maxAttempts;
  const variant = catalogue && catalogue.snapshot.variants.find(function (v) { return v.id === job.puzzleVariant; });
  if (!variant) throw new HarnessError('capability-missing', 'the catalogue does not list ' + job.puzzleVariant);
  return variant.defaultMaxAttempts;
}

/** The attempts-w4 arm; native-w1 takes the unchanged `Host.runRequest` path. */
async function execute(ctx) {
  const job = ctx.job;
  if (job.executor !== 'attempt-pool') throw new HarnessError('plan-missing', 'no executor ' + job.executor);
  return P.runAttemptPool(ctx.host, job, {
    attempts: attemptsOf(job, ctx.catalogue),
    width: P.POOL_WIDTH,
    spawn: { adapterIds: job.adapterIds },
    readyCheck: ctx.readyCheck,
    makeJob: function (ordinal) { return { kind: 'attempt-run', config: job.request, attempt: ordinal }; }
  });
}

function savePuzzle(io, job, obs, rec) {
  const file = path.join(io.attemptDir, 'puzzles', job.variantId + '__' + job.puzzleVariant + '-' +
    job.requestSeed + '.json');
  // One compact line: the wire of a large board is long and nobody reads it by eye.
  const text = JSON.stringify({ schema: C.SCHEMA, task: TASK, key: job.key, pairId: job.pairId, arm: job.arm,
    solverMode: job.solverMode, puzzleVariant: job.puzzleVariant, level: job.level, requestSeed: job.requestSeed,
    puzzleHash: rec.puzzleHash, claimedExact: rec.claimedExact, verifiedExact: rec.verifiedExact,
    evidenceStatus: C.EVIDENCE_PROVISIONAL, wire: C.canonicalize(obs.wire) });
  C.writeTextExclusive(io.repoRoot, file, text);
  rec.puzzleFile = C.toPosix(path.relative(io.evidenceRoot, file));
  rec.puzzleFileSha256 = C.sha256(C.normaliseText(text));
}

function augmentRecord(rec, job, obs, io) {
  rec.solverMode = job.solverMode;
  rec.poolWidth = obs.pool ? obs.pool.width : 1;
  rec.limitOrigin = 'research safety guard (request 180 s); neither arm uses the 120 s application active-time guard';
  const g = rec.generation;
  rec.above120s = {
    readyWall: g.readyWallMs === null ? null : g.readyWallMs > APPLICATION_GUARD_MS,
    coldWall: g.coldWallMs === null ? null : g.coldWallMs > APPLICATION_GUARD_MS,
    note: 'recorded only: not proof of an application pass under the old active-time or the proposed wall-time guard'
  };
  try {
    rec.attemptsPlanned = attemptsOf(job, io.catalogue);
  } catch (err) {
    rec.attemptsPlanned = null;
  }
  if (obs.pool) {
    rec.pool = obs.pool;
    rec.firstExactOrigin = obs.pool.firstExactOrigin;
    rec.firstExactOrdinal = obs.pool.firstExactOrdinal;
  }
  if (obs.identityViolation) rec.identityViolation = obs.identityViolation;
  if (obs.wire) savePuzzle(io, job, obs, rec);
}

function identity(records) {
  return P.identityReport(records, R.compareDigests);
}

// --- paired rows and cells -----------------------------------------------------------------------------------------

function armView(rec) {
  if (!rec) return null;
  const g = rec.generation || {};
  const pool = rec.pool || null;
  return {
    outcome: rec.outcome,
    errorCode: rec.error && rec.error.code ? rec.error.code : null,
    timeoutScope: rec.timeoutScope,
    readyWallMs: g.readyWallMs === undefined ? null : g.readyWallMs,
    coldWallMs: g.coldWallMs === undefined ? null : g.coldWallMs,
    occupiedWallMs: g.occupiedWallMs === undefined ? null : g.occupiedWallMs,
    cpuTotalMs: g.cpuTotalMs === undefined ? null : g.cpuTotalMs,
    cpuToDecisionMs: g.cpuToDecisionMs === undefined ? null : g.cpuToDecisionMs,
    cpuResolutionStatus: g.cpuResolutionStatus === undefined ? null : g.cpuResolutionStatus,
    startupMs: g.startupMs === undefined ? null : g.startupMs,
    cleanupMs: g.cleanupMs === undefined ? null : g.cleanupMs,
    claimedExact: rec.claimedExact,
    verifiedExact: rec.verifiedExact,
    validation: rec.validationDetail ? rec.validationDetail.status : null,
    attemptsUsed: rec.attemptsUsed,
    attemptsPlanned: rec.attemptsPlanned === undefined ? null : rec.attemptsPlanned,
    puzzleHash: rec.puzzleHash,
    above120s: rec.above120s || null,
    pool: pool ? {
      width: pool.width, peakActive: pool.peakActive, meanBusyLanes: pool.meanBusyLanes,
      attemptsStarted: pool.attemptsStarted, attemptsConsumed: pool.attemptsConsumed,
      attemptsSpeculative: pool.attemptsSpeculative, firstExactOrigin: pool.firstExactOrigin,
      firstExactOrdinal: pool.firstExactOrdinal, resultOrigin: pool.resultOrigin, firstReadyMs: pool.firstReadyMs,
      allReadyMs: pool.allReadyMs, duplicatedModelBuildMs: pool.duplicatedModelBuild.duplicatedMs,
      modelHashesEqual: pool.modelHashesEqual, keeperUnsoundConsumed: pool.keeperUnsoundConsumed,
      speculativeCompleted: pool.attempts.filter(function (a) {
        return a.speculative && a.outcome === 'complete';
      }).length
    } : null
  };
}

function usable(status) {
  return R.usable(status);
}

/** An arm whose request returned a puzzle that the independent audit rejected (an error record with the audit's code). */
function auditRejected(rec) {
  return !!rec && rec.outcome === 'error' && !!rec.error && rec.error.code === 'validation-failed';
}

/** A request that produced a result whose generation time is a real observation, verified or not. */
function generated(rec) {
  return !!rec && (rec.outcome === 'complete' || rec.outcome === 'validation-unknown' || auditRejected(rec));
}

/**
 * Per pair, native-w1 against attempts-w4: both arms side by side. A speed-up needs two generated results; it is
 * `verified` only when both arms completed (an audit that rejected or could not judge a puzzle leaves its timing a
 * real observation of an unverified result, shown as such).
 */
function pairRows(records, identityPairs) {
  const byPair = new Map();
  records.forEach(function (r) {
    if (!r.pairId) return;
    if (!byPair.has(r.pairId)) byPair.set(r.pairId, {});
    byPair.get(r.pairId)[r.arm] = r;
  });
  const verdicts = new Map((identityPairs || []).map(function (p) { return [p.pairId, p]; }));
  return Array.from(byPair.entries()).map(function (e) {
    const n = e[1].reference;
    const p = e[1].prototype;
    const any = n || p;
    const both = !!n && !!p && n.outcome === 'complete' && p.outcome === 'complete';
    const timed = generated(n) && generated(p);
    const ng = n && n.generation;
    const pg = p && p.generation;
    const ident = verdicts.get(e[0]) || null;
    const digestsEqual = n && p && n.digests && p.digests ? R.compareDigests(n.digests, p.digests).equal : null;
    let identity = ident ? ident.verdict : null;
    if (identity === 'identity-failed' && digestsEqual === true && auditRejected(n) && auditRejected(p)) {
      identity = 'digests-equal-audit-rejected';
    }
    return {
      pairId: e[0],
      cell: any.puzzleVariant,
      seed: any.requestSeed,
      firstArm: [n, p].filter(Boolean).sort(function (a, b) { return a.order - b.order; })[0].variantId,
      bothComplete: both,
      timed: timed,
      timingsVerified: both,
      native: armView(n),
      pooled: armView(p),
      auditRejected: { native: auditRejected(n), pooled: auditRejected(p) },
      digestsEqual: digestsEqual,
      readySpeedup: timed ? R.ratio(ng.readyWallMs, pg.readyWallMs) : null,
      coldSpeedup: timed ? R.ratio(ng.coldWallMs, pg.coldWallMs) : null,
      occupiedSpeedup: timed ? R.ratio(ng.occupiedWallMs, pg.occupiedWallMs) : null,
      cpuRatio: timed && usable(ng.cpuResolutionStatus) && usable(pg.cpuResolutionStatus) ?
        R.ratio(pg.cpuTotalMs, ng.cpuTotalMs) : null,
      identity: identity
    };
  });
}

function column(rows, pick) {
  return rows.map(pick).filter(function (v) { return typeof v === 'number' && Number.isFinite(v); });
}

function s(ms) {
  return typeof ms === 'number' && Number.isFinite(ms) ? Math.round(ms / 10) / 100 : null;
}

function generatedArm(a) {
  return !!a && (a.outcome === 'complete' || a.outcome === 'validation-unknown' ||
    (a.outcome === 'error' && a.errorCode === 'validation-failed'));
}

function cellSummary(cell, rows) {
  const anchors = REPORT[cell] || null;
  const timed = rows.filter(function (r) { return r.timed; });
  const verifiedPairs = rows.filter(function (r) { return r.timingsVerified; });
  const native = rows.map(function (r) { return r.native; }).filter(Boolean);
  const pooled = rows.map(function (r) { return r.pooled; }).filter(Boolean);
  const pooledGenerated = pooled.filter(generatedArm);
  const speedups = column(timed, function (r) { return r.readySpeedup; });
  const verdictOf = function () {
    if (timed.length < 2 || speedups.length < 2) return 'inconclusive: fewer than two uncensored, resolved pairs';
    if (rows.some(function (r) { return r.identity === 'identity-failed'; })) return 'identity violation: stop';
    if (timed.length > verifiedPairs.length) {
      return 'inconclusive: ' + (timed.length - verifiedPairs.length) + ' of ' + timed.length +
        ' pairs return puzzles that the independent audit rejected or could not judge (timings shown, unverified)';
    }
    if (!anchors) return 'inconclusive: no report anchor';
    const lo = anchors.s5a[0];
    const median = R.upperMedian(speedups);
    const max = Math.max.apply(null, speedups);
    if (median !== null && median >= lo) return 'estimate-supported (median ready-wall speed-up >= ' + lo + ')';
    if (max < lo) return 'estimate-refuted (no pair reaches ' + lo + ')';
    return 'inconclusive (median below ' + lo + ' but a pair reaches it)';
  };
  const spec = function (arms) {
    const made = arms.filter(generatedArm);
    return {
      requests: arms.length,
      complete: arms.filter(function (a) { return a.outcome === 'complete'; }).length,
      censored: arms.filter(function (a) { return a.outcome === 'request-timeout'; }).length,
      errors: arms.filter(function (a) { return a.outcome === 'error' && a.errorCode !== 'validation-failed'; }).length,
      auditRejected: arms.filter(function (a) { return a.outcome === 'error' && a.errorCode === 'validation-failed'; })
        .length,
      validationUnknown: arms.filter(function (a) { return a.outcome === 'validation-unknown'; }).length,
      verifiedExact: arms.filter(function (a) { return a.verifiedExact === true; }).length,
      readyWallS: R.describe(column(made, function (a) { return a.readyWallMs; }).map(s)),
      coldWallS: R.describe(column(made, function (a) { return a.coldWallMs; }).map(s)),
      cpuTotalS: R.describe(column(made, function (a) { return a.cpuTotalMs; }).map(s))
    };
  };
  return {
    cell: cell,
    attemptsPlanned: pooled.length > 0 ? pooled[0].attemptsPlanned : null,
    pairs: rows.length,
    completePairs: verifiedPairs.length,
    timedPairs: timed.length,
    unverifiedPairs: timed.length - verifiedPairs.length,
    identity: { ok: rows.filter(function (r) { return r.identity === 'identity-ok'; }).length,
      failed: rows.filter(function (r) { return r.identity === 'identity-failed'; }).length,
      digestsEqualAuditRejected: rows.filter(function (r) {
        return r.identity === 'digests-equal-audit-rejected'; }).length,
      notComparable: rows.filter(function (r) { return r.identity === 'not-comparable'; }).length,
      deferred: rows.filter(function (r) { return r.identity === 'deferred' || r.identity === 'not-started' ||
        r.identity === null; }).length },
    native: spec(native),
    pooled: spec(pooled),
    readySpeedup: R.describe(speedups),
    readySpeedupMin: speedups.length > 0 ? Math.min.apply(null, speedups) : null,
    coldSpeedup: R.describe(column(timed, function (r) { return r.coldSpeedup; })),
    cpuRatio: R.describe(column(timed, function (r) { return r.cpuRatio; })),
    pool: {
      width: pooled.length > 0 && pooled[0].pool ? pooled[0].pool.width : null,
      peakActive: Math.max.apply(null, [0].concat(pooledGenerated.map(function (a) {
        return a.pool ? a.pool.peakActive : 0; }))),
      meanBusyLanes: R.describe(column(pooledGenerated, function (a) { return a.pool ? a.pool.meanBusyLanes : null; })),
      attemptsConsumed: pooledGenerated.map(function (a) { return a.pool ? a.pool.attemptsConsumed : null; }),
      attemptsStarted: pooledGenerated.map(function (a) { return a.pool ? a.pool.attemptsStarted : null; }),
      speculativeCompleted: pooledGenerated.reduce(function (n, a) {
        return n + (a.pool ? a.pool.speculativeCompleted : 0); }, 0),
      firstExactOrigins: pooledGenerated.map(function (a) { return a.pool ? a.pool.firstExactOrigin : null; }),
      firstExactOrdinals: pooledGenerated.map(function (a) { return a.pool ? a.pool.firstExactOrdinal : null; }),
      duplicatedModelBuildMs: pooledGenerated.map(function (a) {
        return a.pool ? a.pool.duplicatedModelBuildMs : null; })
    },
    above120s: { native: native.filter(function (a) {
      return a.above120s && (a.above120s.readyWall || a.above120s.coldWall); }).length,
    pooled: pooled.filter(function (a) { return a.above120s && (a.above120s.readyWall || a.above120s.coldWall); })
      .length },
    report: anchors,
    verdict: verdictOf(),
    verdictNote: 'descriptive, n = ' + rows.length + ' pairs; with n2/n3 the p95 is the observed maximum; provisional ' +
      '(pre-freeze); no availability, default or qualification decision follows'
  };
}

function cellsOf(pairs) {
  const cells = [];
  const seen = new Set();
  pairs.forEach(function (p) { if (!seen.has(p.cell)) { seen.add(p.cell); cells.push(p.cell); } });
  return cells.map(function (cell) {
    return cellSummary(cell, pairs.filter(function (p) { return p.cell === cell; }));
  });
}

function summary(ctx) {
  const pairs = pairRows(ctx.mergedRecords, ctx.parity ? ctx.parity.pairs : []);
  const prepared = ctx.prepared;
  return {
    estimateVerdict: 'provisional; the S5a estimate is judged on the task summary across all six cells',
    exclusions: ['native-w1 and attempts-w4 share one request and the same default attempts; no override', 'the unmeasured ' +
      'catalogue probe and the independent audit are outside every generation time',
    'a censored or unverified arm proves neither identity nor speed'],
    extra: {
      arms: { reference: 'native-w1 (full unmodified pipeline, one worker)',
        prototype: 'attempts-w4 (S5a: one absolute attempt per worker, min(4, A) workers, consumed in native order)' },
      identity: ctx.parity,
      pairs: pairs,
      cells: cellsOf(pairs),
      chain: ctx.chainInfo,
      catalogueProbe: prepared ? prepared.probe : null,
      syntheticPoolTests: prepared ? prepared.synthetic : null
    }
  };
}

module.exports = { TASK, REPORT, prepare, execute, augmentRecord, identity, summary, pairRows,
  cellSummary, cellsOf, armView, probeCatalogue, attemptsOf };
