'use strict';

/*
 * Task glue of IG-S04 for run.cjs (test side, provisional (pre-freeze)): the unmeasured catalogue probe and, in the first
 * command of the round, the synthetic engine tests and the patched/unpatched parity run (`prepare`); the grid-trial
 * executor with its engine-ready primary interval, grid-build marks and the post-timing S2 audit (`execute`); the record
 * additions (`augmentRecord`); the grid-hash identity inside a shard and the shard summary.
 *
 * A trial is one fresh host worker: the primary CPU/wall interval starts at engine-ready and ends after the trial's
 * cleanup (the loader's cold start is reported beside it, never inside the SM2 rate). The independent verification (the
 * unpatched verifier of run.cjs) and the S2 audit (an unpatched instance) follow outside that interval and are never part
 * of a generation time. Nothing here edits host.cjs, loader.cjs, the verifier or the attempt pool.
 */
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const H = require('./host.cjs');
const IG02 = require('./ig02-run.cjs');
const F = require('./frontier.cjs');
const PLAN = require('./plans/ig-s04.cjs');

const HarnessError = C.HarnessError;
const TASK = 'IG-S04';
const GATE_FILE = 'pilot-reprojection.json';
const FIRST_SHARD = 's1-large-controls';
const MIN_AUDIT_REMAINING_MS = 20000;
const PARITY_REQUEST = Object.freeze({ variantId: 'classic9', difficulty: 'hard', seed: 9002, trace: 'off' });

function taskDir(repoRoot, round) {
  return path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round, TASK);
}

function gateExists(repoRoot, round) {
  return require('fs').existsSync(path.join(taskDir(repoRoot, round), GATE_FILE));
}

// --- one worker, one job -------------------------------------------------------------------------------------------

/** Spawns a worker, waits for ready, posts one job and returns the reply of one of `replyTypes` (or the error). */
async function workerCall(host, spawnArgs, job, replyTypes, limitMs) {
  if (host.stopped) throw new HarnessError('host-stopped', 'the host stopped: ' + host.stopped);
  const start = host.mark();
  const deadlineAt = Math.min(start.t + limitMs, host.commandTimerAt);
  const spawned = host.spawn(Object.assign({ expectedFingerprint: host.runtimeFingerprint, noEngine: false,
    wantCatalogue: false }, spawnArgs));
  const out = { reply: null, error: null, ready: null, terminateFailure: null };
  try {
    const first = await spawned.channel.next(['ready', 'fatal'], deadlineAt, 'command');
    if (first.kind === 'message' && first.msg.type === 'ready') {
      out.ready = first.msg;
      spawned.worker.postMessage({ type: 'job', job: job });
      const last = await spawned.channel.next(replyTypes.concat(['error', 'fatal']), deadlineAt, 'command');
      if (last.kind === 'message' && replyTypes.indexOf(last.msg.type) >= 0) out.reply = last.msg;
      else if (last.kind === 'message') out.error = last.msg.error;
      else if (last.kind === 'timeout') out.error = { code: 'timeout', message: 'no reply before the command deadline' };
      else out.error = last.error || { code: last.kind, message: 'worker ' + last.kind };
    } else if (first.kind === 'message') {
      out.error = first.msg.error;
    } else {
      out.error = first.error || { code: first.kind, message: 'worker ' + first.kind };
    }
  } finally {
    const term = await host.terminateWorker(spawned.worker);
    if (!term.ok) out.terminateFailure = term.reason;
  }
  const end = host.mark();
  out.wallMs = end.t - start.t;
  out.cpuMs = end.cpu - start.cpu;
  return out;
}

// --- run.cjs hooks: prepare ----------------------------------------------------------------------------------------

function syntheticPassedBefore(repoRoot, round) {
  const roundDir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round);
  return R.scanRoundCommands(roundDir).some(function (e) {
    return e.command && e.command.task === TASK && (e.command.notes || []).some(function (note) {
      const m = /^synthetic frontier tests .*: (\d+)\/(\d+) passed$/.exec(note);
      return m !== null && m[1] === m[2];
    });
  });
}

async function parityRun(host) {
  const native = await host.runRequest({ key: 'ig04-parity-native', request: PARITY_REQUEST, adapterIds: [],
    guardScope: 'request', wantCatalogue: false });
  const patched = await workerCall(host, { role: 'request', adapterIds: ['frontier-hooks'] },
    { kind: 'ig04-parity', config: PARITY_REQUEST, withBudget: true }, ['decision'], 60000);
  if (native.outcome !== 'complete' || !patched.reply) {
    return { id: 'parity.patched-vs-plain', group: 'engine', ok: false, title: 'hooks change no output (plain run versus ' +
      'patched run with a counting budget)', detail: { error: native.outcome !== 'complete' ? 'native run ' + native.outcome :
      (patched.error ? patched.error.message : 'no patched reply') } };
  }
  const a = R.normaliseWire(native.wire);
  const b = R.normaliseWire(patched.reply.wire);
  const cmp = R.compareDigests(a.digests, b.digests);
  return { id: 'parity.patched-vs-plain', group: 'engine', ok: cmp.equal && a.exact === b.exact,
    title: 'hooks change no output (plain run versus patched run with a counting budget, every digest section)',
    detail: { differing: cmp.differing, plainDigest: a.digests.all, patchedDigest: b.digests.all,
      request: PARITY_REQUEST } };
}

async function prepare(ctx) {
  const host = ctx.host;
  const out = { catalogue: null, probe: null, synthetic: null, failure: null, notes: [] };
  if (ctx.shard.shard !== FIRST_SHARD && !gateExists(ctx.repoRoot, ctx.round)) {
    out.failure = { code: 'reprojection-missing', message: 'the mandatory ' + GATE_FILE + ' is not emitted yet: the ' +
      'large-board controls and F1 (shard ' + FIRST_SHARD + ') run first, then the reprojection, before any other real trial' };
    return out;
  }
  const probe = await IG02.probeCatalogue(host);
  out.catalogue = probe.catalogue;
  out.probe = { wallMs: probe.wallMs, cpuMs: probe.cpuMs,
    note: 'unmeasured: loads the engine once per command so no trial carries the catalogue discovery' };
  if (typeof ctx.readyCheck === 'function') {
    const refusal = ctx.readyCheck({ catalogue: probe.catalogue });
    if (refusal) {
      out.failure = refusal;
      return out;
    }
  }
  if (!syntheticPassedBefore(ctx.repoRoot, ctx.round)) {
    const synth = await workerCall(host, { role: 'request', adapterIds: ['frontier-hooks'] }, { kind: 'ig04-synthetic' },
      ['decision'], 90000);
    const results = [];
    if (synth.reply) {
      synth.reply.results.forEach(function (r) { results.push(r); });
    } else {
      results.push({ id: 'engine.synthetic-run', group: 'engine', ok: false, title: 'the synthetic engine tests ran',
        detail: { error: synth.error ? synth.error.message : 'no reply' } });
    }
    results.push(await parityRun(host));
    const failed = results.filter(function (r) { return !r.ok; });
    out.synthetic = { ok: failed.length === 0, passed: results.length - failed.length, total: results.length,
      workerWallMs: synth.wallMs, workerCpuMs: synth.cpuMs, results: results };
    out.notes.push('synthetic frontier tests (engine, first command of the round): ' + out.synthetic.passed + '/' +
      out.synthetic.total + ' passed');
    if (failed.length > 0) {
      out.failure = { code: 'frontier-tests-failed', message: 'synthetic frontier tests failed: ' + failed.map(function (r) {
        return r.id + ' (' + (r.detail && r.detail.error ? r.detail.error : 'failed') + ')';
      }).join('; ') };
    }
  }
  return out;
}

// --- run.cjs hooks: execute ----------------------------------------------------------------------------------------

async function runTrial(host, job, ctx) {
  if (host.stopped) throw new HarnessError('host-stopped', 'the host stopped: ' + host.stopped);
  const guardMs = host.guards.sampleMs;
  const marks = { t0: null, cpu0: null, tReady: null, cpuReady: null, tDecision: null, cpuDecision: null, tClean: null,
    cpuClean: null };
  const start = host.mark();
  marks.t0 = start.t;
  marks.cpu0 = start.cpu;
  const requestAt = marks.t0 + guardMs;
  const deadlineAt = Math.min(requestAt, host.commandTimerAt);
  const scopeAtTimeout = requestAt <= host.commandTimerAt ? 'sample' : 'command';
  const spawned = host.spawn({ role: 'request', adapterIds: job.adapterIds, expectedFingerprint: host.runtimeFingerprint,
    noEngine: false, wantCatalogue: ctx.catalogue === null });
  const worker = spawned.worker;
  const channel = spawned.channel;
  const obs = { key: job.key, outcome: 'error', timeoutScope: null, wire: null, error: null, fatal: null,
    engineElapsedMs: null, ready: null, lateDecision: false, terminateFailure: null, trial: null, progress: [] };
  let gridEvent = null;
  let jobMark = null;
  try {
    const first = await channel.next(['ready', 'fatal'], deadlineAt, scopeAtTimeout);
    let decided;
    if (first.kind === 'message' && first.msg.type === 'ready') {
      marks.tReady = first.t;
      marks.cpuReady = first.cpu;
      obs.ready = first.msg;
      const refusal = typeof ctx.readyCheck === 'function' ? ctx.readyCheck(first.msg) : null;
      if (refusal) {
        decided = { kind: 'message', msg: { type: 'fatal', error: { code: refusal.code, name: null,
          message: refusal.message } }, t: first.t, cpu: first.cpu };
      } else {
        jobMark = host.mark();
        worker.postMessage({ type: 'job', job: { kind: 'ig04-trial', config: job.request, trial: job.trial } });
        for (;;) {
          decided = await channel.next(['progress', 'grid-built', 'decision', 'error', 'fatal'], deadlineAt,
            scopeAtTimeout);
          if (decided.kind === 'message' && decided.msg.type === 'progress') {
            obs.progress.push({ atMs: decided.t - marks.t0, cpuMs: decided.cpu - marks.cpu0, msg: decided.msg });
            continue;
          }
          if (decided.kind === 'message' && decided.msg.type === 'grid-built') {
            gridEvent = decided;
            continue;
          }
          break;
        }
      }
    } else {
      decided = first;
    }
    marks.tDecision = decided.t;
    marks.cpuDecision = decided.cpu;
    host.classify(decided, obs);
    if (decided.kind === 'message' && decided.msg.type === 'decision') {
      obs.trial = decided.msg.trial || null;
      if (obs.trial && obs.trial.status === 'sample-budget') obs.outcome = 'sample-budget';
    }
  } finally {
    const term = await host.terminateWorker(worker);
    if (!term.ok) obs.terminateFailure = term.reason;
    const end = host.mark();
    marks.tClean = end.t;
    marks.cpuClean = end.cpu;
  }
  obs.generation = H.accountRequest(marks, host.cpu.quantumMs, host.cpu.api);
  if (gridEvent && jobMark) {
    obs.generation.gridBuildWallMs = gridEvent.t - jobMark.t;
    obs.generation.gridBuildCpuMs = gridEvent.cpu - jobMark.cpu;
    obs.gridWorkerWallMs = gridEvent.msg.wallMs;
    obs.gridInfo = gridEvent.msg.info || null;
  }
  obs.guard = { scope: 'sample', guardMs: guardMs, deadlineAt: deadlineAt - marks.t0 };
  obs.testOnly = host.testOnly;
  return obs;
}

/** The post-timing S2 audit on an unpatched instance; never inside a generation time, skipped when time is short. */
async function auditTrial(host, job, obs) {
  const t = obs.trial;
  if (!t || !t.audit || !obs.wire) return { status: 'not-applicable' };
  if (host.remainingMs() < MIN_AUDIT_REMAINING_MS) {
    return { status: 'skipped', reason: 'the command window was too short for the audit' };
  }
  const call = await workerCall(host, { role: 'verify', adapterIds: [] }, { kind: 'ig04-audit', config: job.request,
    solution: Array.from(obs.wire.solution), audit: t.audit, checkLimit: F.AUDIT_CHECKS }, ['audit-result'], 60000);
  if (!call.reply) {
    return { status: 'error', error: call.error ? call.error.message : 'no audit reply', wallMs: call.wallMs,
      cpuMs: call.cpuMs };
  }
  return Object.assign({ status: 'audited', wallMs: call.wallMs, cpuMs: call.cpuMs,
    checkLimit: F.AUDIT_CHECKS }, call.reply.audit);
}

async function execute(ctx) {
  const host = ctx.host;
  const job = ctx.job;
  if (job.executor !== 'frontier-trial') throw new HarnessError('plan-missing', 'no executor ' + job.executor);
  const obs = await runTrial(host, job, ctx);
  if ((obs.outcome === 'complete' || obs.outcome === 'sample-budget') && obs.trial && obs.trial.audit) {
    obs.audit = await auditTrial(host, job, obs);
  }
  return obs;
}

// --- record additions ----------------------------------------------------------------------------------------------

function lastProgress(obs) {
  return obs.progress.length === 0 ? null : obs.progress[obs.progress.length - 1];
}

function augmentRecord(rec, job, obs, io) {
  const mode = F.MODES[job.trial.mode];
  rec.solverMode = 'reference';
  rec.poolWidth = 1;
  rec.attempt = 1;
  rec.sample = 1;
  rec.samplesUsed = 1;
  rec.sampleMode = mode.kind === 'native' ? (mode.proposal ? 'proposal' : 'ordinary') : 'frontier';
  rec.parentMode = mode.kind === 'frontier' ? mode.parent : null;
  rec.limitOrigin = 'research safety guard (trial 45 s, observation backstop); count budget: ' +
    (obs.trial && obs.trial.limitOrigin ? obs.trial.limitOrigin : (mode.kind === 'native' ? 'native guards and caps' :
      'pilot ceilings (the trial did not report)'));
  rec.performanceScope = obs.trial && obs.trial.performanceScope ? obs.trial.performanceScope : null;
  const snap = io.catalogue ? io.catalogue.snapshot : null;
  const floors = snap && snap.floors && snap.floors[job.puzzleVariant] ? snap.floors[job.puzzleVariant][job.level] : null;
  rec.tierIds = floors ? floors.tier : null;
  rec.arm = job.arm;
  rec.puzzleVariant = job.puzzleVariant;
  const gi = obs.trial || obs.gridInfo || null;
  rec.forkLabels = obs.trial ? obs.trial.forkLabels : null;
  rec.gridHash = gi ? gi.gridHash : null;
  rec.cellCount = gi ? gi.cells : null;
  rec.groupCount = gi ? gi.groups : null;
  rec.digits = gi ? gi.digits : null;
  rec.nativeConstants = gi ? gi.nativeConstants : null;
  rec.gridBuild = obs.trial ? obs.trial.gridBuild : null;
  rec.gridWorkerWallMs = obs.gridWorkerWallMs === undefined ? null : obs.gridWorkerWallMs;
  rec.progressMessages = obs.progress.length;
  if (obs.outcome === 'request-timeout' || obs.outcome === 'error') {
    const p = lastProgress(obs);
    rec.censoredProgress = p ? { atMs: p.atMs, cpuMs: p.cpuMs, phase: p.msg.phase, floorTests: p.msg.floorTests,
      ladderPasses: p.msg.ladderPasses, removals: p.msg.removals, entries: p.msg.entries,
      phaseBSolves: p.msg.phaseBSolves, canonicalRatings: p.msg.canonicalRatings, counters: p.msg.counters,
      rung: p.msg.rung === undefined ? null : p.msg.rung } : null;
  }
  const t = obs.trial;
  if (t) {
    rec.limits = Object.assign({}, rec.limits, { budget: t.limits, ceilings: t.ceilings === undefined ? null : t.ceilings });
    rec.counts = Object.assign({}, rec.counts, t.counts);
    rec.canonicalRatings = t.counts.canonicalRatings === undefined ? null : t.counts.canonicalRatings;
    rec.budgetStop = t.budgetStop === undefined ? null : t.budgetStop;
    rec.engineCounters = t.engine;
    rec.enginePurposes = t.enginePurposes;
    rec.best = t.best;
    rec.fallback = t.fallback === undefined ? null : t.fallback;
    rec.frontier = t.frontier === undefined ? null : t.frontier;
    rec.native = t.native === undefined ? null : t.native;
    rec.engineMs = t.engineMs;
    rec.floorIds = t.frontier ? t.frontier.rungs.map(function (r) { return { rung: r.id, ids: r.ids }; }) : null;
    rec.firstExactOrigin = t.best && t.best.exact === true ? 'sample' : null;
    rec.firstExactOrdinal = t.best && t.best.exact === true ? 1 : null;
    rec.localCapReasons = null;
    rec.localProposals = null;
  }
  if (obs.audit) {
    rec.s2Audit = obs.audit;
  }
  if (rec.outcome === 'sample-budget') {
    rec.timeoutScope = null;
    rec.claimedExact = t && t.best ? t.best.exact === true : null;
    rec.verifiedExact = null;
    rec.note = 'sample-budget: a distinct harness reason, not an exact hit and not a completed frontier search; the fallback ' +
      'candidate (at worst the fully given grid) is valid but is not offered as a result';
  }
  if (obs.fatal) rec.fatal = obs.fatal;
}

// --- identity inside a shard: one grid per cluster ---------------------------------------------------------------------

function identity(records) {
  const byCluster = new Map();
  records.forEach(function (r) {
    if (r.outcome === 'unstarted' || r.gridHash === null || r.gridHash === undefined) return;
    if (!byCluster.has(r.gridCluster)) byCluster.set(r.gridCluster, []);
    byCluster.get(r.gridCluster).push(r);
  });
  const pairs = [];
  byCluster.forEach(function (rows, cluster) {
    const hashes = Array.from(new Set(rows.map(function (r) { return r.gridHash; })));
    pairs.push({ pairId: cluster, verdict: hashes.length === 1 ? 'identity-ok' : 'identity-failed', problems: hashes.length === 1 ?
      [] : ['the grid hashes differ inside the cluster'], gridHash: hashes[0], trials: rows.length });
  });
  const count = function (v) { return pairs.filter(function (p) { return p.verdict === v; }).length; };
  return { pairs: pairs, failed: count('identity-failed'), ok: count('identity-ok'), deferred: 0,
    complete: pairs.length > 0 && count('identity-ok') === pairs.length };
}

// --- shard summary ---------------------------------------------------------------------------------------------------

function compactTrial(r) {
  const g = r.generation || {};
  return { key: r.key, cell: r.puzzleVariant, seed: r.requestSeed, mode: r.mode, outcome: r.outcome,
    readyWallMs: g.readyWallMs, readyOccupiedWallMs: g.readyOccupiedWallMs, cpuReadyTotalMs: g.cpuReadyTotalMs,
    coldWallMs: g.coldWallMs, gridBuildWallMs: g.gridBuildWallMs, claimedExact: r.claimedExact,
    verifiedExact: r.verifiedExact, counts: r.counts, budgetStop: r.budgetStop === undefined ? null : r.budgetStop,
    best: r.best === undefined ? null : r.best, censoredProgress: r.censoredProgress === undefined ? null : r.censoredProgress };
}

/**
 * The mandatory reprojection: emitted once, at the end of the large-board probes (shard s1), from the records of that
 * shard and the machine time charged so far. A failure here is reported in the summary, never allowed to lose the evidence.
 */
function emitStageReprojection(ctx) {
  const agg = require('./ig04-aggregate.cjs');
  const repoRoot = C.DEFAULT_REPO_ROOT;
  const round = ctx.command.round;
  if (ctx.chainInfo && ctx.chainInfo.unstartedAfter && ctx.chainInfo.unstartedAfter.length > 0) {
    return { written: false, reason: 'the shard still has unstarted keys: emitted by the command that finishes it' };
  }
  const AGG = require('./aggregate.cjs');
  const charged = AGG.machineTime(repoRoot, TASK, round).chargedMs;
  const out = agg.emitReprojection(repoRoot, round, { records: ctx.mergedRecords || ctx.records, command: ctx.command,
    chargedBeforeMs: charged });
  return { written: out.written, file: C.toPosix(path.relative(repoRoot, out.file)), hash: out.doc ? out.doc.hash : null };
}

function summary(ctx) {
  const rows = ctx.mergedRecords || ctx.records;
  let reprojection = null;
  if (ctx.shard === FIRST_SHARD) {
    try {
      reprojection = emitStageReprojection(ctx);
    } catch (err) {
      reprojection = { written: false, error: String(err && err.message ? err.message : err) };
    }
  }
  return {
    estimateVerdict: 'provisional; judged in the task summary (the pilot measures cost and exact hits per variant; it ' +
      'decides neither S1 nor the bank route)',
    exclusions: ['one sample (ordinal 1) per mode on each pilot grid: not a default request and not a qualification',
      'the unmeasured catalogue probe, the independent verifier and the S2 audit are outside every generation time',
      'a censored, budget-stopped or unverified trial proves neither a hit nor a zero rate'],
    extra: {
      arms: Object.keys(F.MODES).map(function (id) { return { id: id, kind: F.MODES[id].kind,
        description: F.MODES[id].description }; }),
      identity: ctx.parity,
      trials: rows.map(compactTrial),
      synthetic: ctx.prepared ? ctx.prepared.synthetic : null,
      reprojection: reprojection,
      catalogueProbe: ctx.prepared ? ctx.prepared.probe : null,
      chain: ctx.chainInfo
    }
  };
}

module.exports = { TASK, GATE_FILE, FIRST_SHARD, prepare, execute, augmentRecord, identity, summary, workerCall,
  taskDir, gateExists, compactTrial, PLAN };
