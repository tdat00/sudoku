'use strict';

/*
 * Task glue of IG-S05 for run.cjs (test side, provisional (pre-freeze)): the pre-registration and budget checks and the
 * unmeasured catalogue probe, in the first command of the round the synthetic engine tests (`prepare`); the grid-trial executor
 * with its engine-ready primary interval, the grid-build marks, the per-sample marks and the per-sample guard, and the
 * post-timing canonical classification of the parent (`execute`); the record additions (`augmentRecord`); the grid-hash
 * identity inside the shard and the shard summary.
 *
 * A trial is one fresh host worker: ONE grid, then up to two native-fork samples. The primary CPU/wall interval starts at
 * engine-ready and ends after the trial's cleanup, so it holds the actual grid build, every sample and the cleanup (the
 * loader's cold start is reported beside it, never inside the SM2 rate). The independent verification (the unpatched
 * verifier of run.cjs) and the parent classification (an unpatched instance) follow outside that interval and are never part
 * of a generation time. Nothing here edits host.cjs, loader.cjs, the verifier, the attempt pool or the IG-S04 code.
 *
 * The guard is the 45 s research guard of one sample observation: from the start of the trial to the start of sample 1,
 * then from the start of each sample to its end (the worker posts `sample-start`); a trial that runs past it is censored with
 * the progress it had posted and its CPU, never a result and never retried.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const M = require('./manifest.cjs');
const H = require('./host.cjs');
const IG02 = require('./ig02-run.cjs');
const IG04 = require('./ig04-run.cjs');
const F = require('./frontier.cjs');
const S = require('./screen.cjs');
const PLAN = require('./plans/ig-s05.cjs');

const HarnessError = C.HarnessError;
const TASK = 'IG-S05';
const MANIFEST_FILE = 'screen-manifest.json';
const MIN_PARENT_REMAINING_MS = 20000;
const PARENT_RATING_MS = 10000;
const PARENT_CALL_LIMIT_MS = 60000;
const SYNTHETIC_NOTE = /^synthetic screen tests .*: (\d+)\/(\d+) passed$/;

function taskDir(repoRoot, round) {
  return path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round, TASK);
}

// --- pre-registration --------------------------------------------------------------------------------------------------

/**
 * The problems that stop a run before anything is generated: the saved screen manifest (planned keys before runs) must exist
 * and agree with the manifest of this command, with the frozen budget hash and, in the provisional round, with the frozen
 * IG-S04 budget and variant manifests; a frozen run never starts on a projected budget. An empty list: the run may start.
 */
function preregistrationProblems(input) {
  const problems = [];
  const sm = input.screenManifest;
  if (!sm) {
    problems.push('screen-manifest.json is missing: save the planned keys before any run ' +
      '(node ig05-aggregate.cjs --stage=manifest)');
    return problems;
  }
  if (sm.manifestHash !== input.manifest.manifestHash) {
    problems.push('the planned keys changed since the screen manifest was saved (manifest hash ' + input.manifest.manifestHash +
      ' differs from the saved ' + sm.manifestHash + ')');
  }
  if (!sm.budget || sm.budget.hash !== input.budgets.hash) {
    problems.push('budget mismatch: the screen manifest names ' + (sm.budget ? sm.budget.hash : 'no budget') +
      ', the plan reads ' + input.budgets.hash);
  }
  if (input.round !== C.ROUND_FROZEN && input.budgets.hash !== PLAN.BUDGET_HASH) {
    problems.push('budget mismatch: the frozen IG-S04 budget hash is ' + PLAN.BUDGET_HASH + ', the plan reads ' +
      input.budgets.hash);
  }
  if (input.budgets.projection === true) {
    problems.push('the frozen budgets are not recomputed on the frozen pilot yet: a frozen run never starts on a projection');
  }
  if (input.variantManifest && input.round !== C.ROUND_FROZEN && input.variantManifest.hash !== PLAN.VARIANT_HASH) {
    problems.push('source mismatch: the IG-S04 variant manifest differs from the signed-off one');
  }
  if (input.variantManifest && input.catalogue && input.round !== C.ROUND_FROZEN &&
      input.variantManifest.catalogueFingerprint !== input.catalogue.fingerprint) {
    problems.push('source/catalogue mismatch: the loaded catalogue ' + input.catalogue.fingerprint +
      ' is not the one of the IG-S04 variant manifest ' + input.variantManifest.catalogueFingerprint);
  }
  if (input.variantManifest && input.runtimeFingerprint && input.round !== C.ROUND_FROZEN &&
      input.variantManifest.runtimeFingerprint !== input.runtimeFingerprint) {
    problems.push('source mismatch: the runtime ' + input.runtimeFingerprint + ' is not the one of the IG-S04 variant ' +
      'manifest ' + input.variantManifest.runtimeFingerprint);
  }
  return problems;
}

function readIfExists(file) {
  return fs.existsSync(file) ? C.readJson(file) : null;
}

// --- run.cjs hooks: prepare --------------------------------------------------------------------------------------------

function syntheticPassedBefore(repoRoot, round) {
  const roundDir = path.join(repoRoot, ...C.EVIDENCE_REL.split('/'), round);
  return R.scanRoundCommands(roundDir).some(function (e) {
    return e.command && e.command.task === TASK && (e.command.notes || []).some(function (note) {
      const m = SYNTHETIC_NOTE.exec(note);
      return m !== null && m[1] === m[2];
    });
  });
}

async function prepare(ctx) {
  const host = ctx.host;
  const out = { catalogue: null, probe: null, synthetic: null, failure: null, notes: [] };
  const manifest = M.buildManifest(TASK, ctx.round);
  const budgets = PLAN.loadBudgets(ctx.round, ctx.repoRoot);
  const evidence = taskDir(ctx.repoRoot, ctx.round);
  const screenManifest = readIfExists(path.join(evidence, MANIFEST_FILE));
  const variantManifest = readIfExists(path.join(ctx.repoRoot, ...PLAN.VARIANT_REL.split('/')));
  const early = preregistrationProblems({ screenManifest: screenManifest, manifest: manifest, budgets: budgets,
    variantManifest: variantManifest, round: ctx.round });
  if (early.length > 0) {
    out.failure = { code: 'preregistration', message: early.join('; ') };
    return out;
  }
  const probe = await IG02.probeCatalogue(host);
  out.catalogue = probe.catalogue;
  out.probe = { wallMs: probe.wallMs, cpuMs: probe.cpuMs,
    note: 'unmeasured: loads the engine once per command so no trial carries the catalogue discovery' };
  const late = preregistrationProblems({ screenManifest: screenManifest, manifest: manifest, budgets: budgets,
    variantManifest: variantManifest, round: ctx.round, catalogue: probe.catalogue,
    runtimeFingerprint: host.runtimeFingerprint });
  if (late.length > 0) {
    out.failure = { code: 'preregistration', message: late.join('; ') };
    return out;
  }
  if (typeof ctx.readyCheck === 'function') {
    const refusal = ctx.readyCheck({ catalogue: probe.catalogue });
    if (refusal) {
      out.failure = refusal;
      return out;
    }
  }
  if (!syntheticPassedBefore(ctx.repoRoot, ctx.round)) {
    const patched = await IG04.workerCall(host, { role: 'request', adapterIds: ['frontier-hooks'] },
      { kind: 'ig05-synthetic' }, ['decision'], 90000);
    const verify = await IG04.workerCall(host, { role: 'verify', adapterIds: [] }, { kind: 'ig05-synthetic-verify' },
      ['decision'], 90000);
    const results = [];
    [['engine.synthetic-run', patched], ['engine.synthetic-verify-run', verify]].forEach(function (pair) {
      if (pair[1].reply) {
        pair[1].reply.results.forEach(function (r) { results.push(r); });
      } else {
        results.push({ id: pair[0], group: 'engine', ok: false, title: 'the synthetic engine tests ran',
          detail: { error: pair[1].error ? pair[1].error.message : 'no reply' } });
      }
    });
    const failed = results.filter(function (r) { return !r.ok; });
    out.synthetic = { ok: failed.length === 0, passed: results.length - failed.length, total: results.length,
      workerWallMs: patched.wallMs + verify.wallMs, workerCpuMs: patched.cpuMs + verify.cpuMs, results: results };
    out.notes.push('synthetic screen tests (engine, first command of the round): ' + out.synthetic.passed + '/' +
      out.synthetic.total + ' passed');
    if (failed.length > 0) {
      out.failure = { code: 'screen-tests-failed', message: 'synthetic screen tests failed: ' + failed.map(function (r) {
        return r.id + ' (' + (r.detail && r.detail.error ? r.detail.error : 'failed') + ')';
      }).join('; ') };
    }
  }
  return out;
}

// --- run.cjs hooks: execute ----------------------------------------------------------------------------------------------

const MESSAGES = ['progress', 'grid-built', 'sample-start', 'sample-end', 'decision', 'error', 'fatal'];

/** One grid trial in a fresh worker with the engine-ready primary interval and the per-sample guard. */
async function runTrial(host, job, ctx) {
  if (host.stopped) throw new HarnessError('host-stopped', 'the host stopped: ' + host.stopped);
  const guardMs = host.guards.sampleMs;
  const marks = { t0: null, cpu0: null, tReady: null, cpuReady: null, tDecision: null, cpuDecision: null, tClean: null,
    cpuClean: null };
  const start = host.mark();
  marks.t0 = start.t;
  marks.cpu0 = start.cpu;
  let guardOpenAt = marks.t0;
  const deadlineOf = function () { return Math.min(guardOpenAt + guardMs, host.commandTimerAt); };
  const scopeOf = function () { return guardOpenAt + guardMs <= host.commandTimerAt ? 'sample' : 'command'; };
  const spawned = host.spawn({ role: 'request', adapterIds: job.adapterIds, expectedFingerprint: host.runtimeFingerprint,
    noEngine: false, wantCatalogue: ctx.catalogue === null });
  const worker = spawned.worker;
  const channel = spawned.channel;
  const obs = { key: job.key, outcome: 'error', timeoutScope: null, wire: null, error: null, fatal: null,
    engineElapsedMs: null, ready: null, lateDecision: false, terminateFailure: null, trial: null, progress: [],
    sampleMarks: [], sampleEnds: [], solution: null, parentInputs: [] };
  let gridEvent = null;
  let jobMark = null;
  try {
    const first = await channel.next(['ready', 'fatal'], deadlineOf(), scopeOf());
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
        worker.postMessage({ type: 'job', job: { kind: 'ig05-trial', config: job.request, trial: job.trial } });
        for (;;) {
          decided = await channel.next(MESSAGES, deadlineOf(), scopeOf());
          if (decided.kind !== 'message') break;
          const type = decided.msg.type;
          if (type === 'progress') {
            obs.progress.push({ atMs: decided.t - marks.t0, cpuMs: decided.cpu - marks.cpu0, msg: decided.msg });
          } else if (type === 'grid-built') {
            gridEvent = decided;
          } else if (type === 'sample-start') {
            guardOpenAt = decided.t;
            obs.sampleMarks.push({ ordinal: decided.msg.ordinal, fork: decided.msg.fork, kind: decided.msg.kind,
              startT: decided.t, startCpu: decided.cpu, endT: null, endCpu: null, censored: false });
          } else if (type === 'sample-end') {
            const open = obs.sampleMarks.find(function (m) { return m.ordinal === decided.msg.ordinal; });
            if (open) {
              open.endT = decided.t;
              open.endCpu = decided.cpu;
            }
            obs.sampleEnds.push({ ordinal: decided.msg.ordinal, status: decided.msg.status,
              claimedExact: decided.msg.claimedExact, class: decided.msg.class, engineMs: decided.msg.engineMs });
          } else {
            break;
          }
        }
      }
    } else {
      decided = first;
    }
    marks.tDecision = decided.t;
    marks.cpuDecision = decided.cpu;
    host.classify(decided, obs);
    obs.sampleMarks.forEach(function (m) {
      if (m.endT === null) {
        m.censored = true;
        m.endT = decided.t;
        m.endCpu = decided.cpu;
      }
    });
    if (decided.kind === 'message' && decided.msg.type === 'decision') {
      obs.trial = decided.msg.trial || null;
      obs.solution = decided.msg.solution || null;
      obs.parentInputs = decided.msg.parentInputs || [];
      if (obs.trial && obs.trial.status === 'sample-budget') obs.outcome = 'sample-budget';
      if (obs.wire === null && obs.outcome === 'complete') {
        obs.outcome = 'error';
        obs.error = { code: 'no-candidate', name: null, message: 'the trial returned no complete candidate' };
      }
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
  obs.hostSamples = obs.sampleMarks.map(function (m) {
    return { ordinal: m.ordinal, fork: m.fork, kind: m.kind, wallMs: m.endT - m.startT, cpuMs: m.endCpu - m.startCpu,
      censored: m.censored };
  });
  obs.guard = { scope: 'sample', guardMs: guardMs, perSample: true };
  obs.testOnly = host.testOnly;
  return obs;
}

// The classification of a parent depends only on the cell, the seed (the grid) and the parent itself: equal parents of two
// modes of one grid (F1, FU, FS share their phase A) are classified once per process.
const parentCache = new Map();

function parentKey(job, p) {
  return job.puzzleVariant + ':' + job.requestSeed + ':' + p.hash;
}

/** The post-timing parent classification on an unpatched instance; skipped when the command window is short. */
async function classifyParents(host, job, obs, cache) {
  const store = cache || parentCache;
  const wanted = obs.parentInputs;
  const rows = [];
  const todo = [];
  wanted.forEach(function (p) {
    const hit = store.get(parentKey(job, p));
    if (hit) rows.push(Object.assign({}, hit, { ordinal: p.ordinal, fromCache: true, wallMs: 0, cpuMs: 0 }));
    else todo.push(p);
  });
  if (todo.length === 0) return { status: wanted.length === 0 ? 'not-applicable' : 'classified', rows: rows, wallMs: 0, cpuMs: 0 };
  if (host.remainingMs() < MIN_PARENT_REMAINING_MS) {
    return { status: 'skipped', reason: 'the command window was too short for the classification', rows: rows,
      wallMs: 0, cpuMs: 0 };
  }
  const call = await IG04.workerCall(host, { role: 'verify', adapterIds: [] }, { kind: 'ig05-parent', config: job.request,
    solution: obs.solution, parents: todo, ms: PARENT_RATING_MS }, ['parent-result'], PARENT_CALL_LIMIT_MS);
  if (!call.reply) {
    return { status: 'error', error: call.error ? call.error.message : 'no reply', rows: rows, wallMs: call.wallMs,
      cpuMs: call.cpuMs };
  }
  call.reply.parents.forEach(function (row) {
    rows.push(Object.assign({}, row, { fromCache: false }));
    if (row.status === 'classified') store.set(parentKey(job, row), Object.assign({}, row));
  });
  rows.sort(function (a, b) { return a.ordinal - b.ordinal; });
  return { status: 'classified', rows: rows, wallMs: call.wallMs, cpuMs: call.cpuMs };
}

async function execute(ctx) {
  const host = ctx.host;
  const job = ctx.job;
  if (job.executor !== 'screen-trial') throw new HarnessError('plan-missing', 'no executor ' + job.executor);
  const obs = await runTrial(host, job, ctx);
  obs.parents = { status: 'not-applicable', rows: [], wallMs: 0, cpuMs: 0 };
  if ((obs.outcome === 'complete' || obs.outcome === 'sample-budget') && obs.solution && obs.parentInputs.length > 0) {
    obs.parents = await classifyParents(host, job, obs);
  }
  return obs;
}

// --- record additions ----------------------------------------------------------------------------------------------------

function sumField(samples, field) {
  if (samples.length === 0) return null;
  let total = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i].counts ? samples[i].counts[field] : undefined;
    if (typeof v !== 'number') return null;
    total += v;
  }
  return total;
}

/** The state of every planned sample ordinal: returned, budget-stopped, skipped-first-exact, censored, never reached. */
function ordinalStates(planned, obs, job) {
  const trial = obs.trial;
  const states = [];
  for (let t = 1; t <= planned; t++) {
    let state;
    const row = trial ? trial.samples.find(function (s) { return s.ordinal === t; }) : null;
    const skip = trial ? trial.skipped.find(function (s) { return s.ordinal === t; }) : null;
    const mark = obs.sampleMarks.find(function (m) { return m.ordinal === t; });
    const ended = obs.sampleEnds.find(function (e) { return e.ordinal === t; });
    if (row) state = row.status === 'sample-budget' ? 'sample-budget' : 'returned';
    else if (skip) state = 'skipped-' + skip.reason;
    else if (ended) state = ended.status === 'sample-budget' ? 'sample-budget' : 'returned';
    else if (mark && mark.censored) state = 'censored';
    else if (obs.outcome === 'error' && mark) state = 'error';
    else state = 'not-reached';
    states.push({ ordinal: t, fork: S.sampleFork(t), state: state });
  }
  return states;
}

function augmentRecord(rec, job, obs, io) {
  const mode = F.MODES[job.trial.mode];
  const t = obs.trial;
  const samples = t ? t.samples : [];
  rec.solverMode = 'reference';
  rec.poolWidth = 1;
  rec.attempt = 1;
  rec.sample = samples.length > 0 ? samples[samples.length - 1].ordinal : (obs.sampleMarks.length > 0 ?
    obs.sampleMarks[obs.sampleMarks.length - 1].ordinal : null);
  rec.samplesUsed = t ? samples.length : null;
  rec.samplesStarted = obs.sampleMarks.length;
  rec.samplesPlanned = job.trial.samples;
  rec.tier = job.tier;
  rec.sampleMode = mode.kind === 'native' ? (mode.proposal ? 'proposal' : 'ordinary') : 'frontier';
  rec.parentMode = mode.kind === 'frontier' ? mode.parent : null;
  rec.limitOrigin = 'research safety guard (45 s per sample observation, command window 270 s); count budget: ' +
    (mode.kind === 'native' ? 'native guards and caps, shared by both samples (one attempt)' :
      'the frozen IG-S04 per-cell vector ' + (job.trial.budgetHash ? job.trial.budgetHash.slice(0, 12) + '…' : '') +
      ', fresh for every sample');
  rec.performanceScope = t ? t.performanceScope : null;
  const snap = io.catalogue ? io.catalogue.snapshot : null;
  const floors = snap && snap.floors && snap.floors[job.puzzleVariant] ? snap.floors[job.puzzleVariant][job.level] : null;
  rec.tierIds = floors ? floors.tier : null;
  rec.arm = job.arm;
  rec.puzzleVariant = job.puzzleVariant;
  const gi = t || obs.gridInfo || null;
  rec.forkLabels = t ? t.forkLabels : null;
  rec.gridHash = gi ? gi.gridHash : null;
  rec.cellCount = gi ? gi.cells : null;
  rec.groupCount = gi ? gi.groups : null;
  rec.digits = gi ? gi.digits : null;
  rec.nativeConstants = gi ? gi.nativeConstants : null;
  rec.digTries = t ? t.digTries : null;
  rec.gridBuild = t ? t.gridBuild : null;
  rec.gridWorkerWallMs = obs.gridWorkerWallMs === undefined ? null : obs.gridWorkerWallMs;
  rec.progressMessages = obs.progress.length;
  rec.hostSamples = obs.hostSamples;
  rec.sampleStates = ordinalStates(job.trial.samples, obs, job);
  const g = rec.generation || {};
  const sampleWall = obs.hostSamples.reduce(function (a, s) { return a + s.wallMs; }, 0);
  const sampleCpu = obs.hostSamples.reduce(function (a, s) { return a + s.cpuMs; }, 0);
  rec.intervals = {
    startupWallMs: g.startupMs === undefined ? null : g.startupMs, startupCpuMs: g.startupCpuMs === undefined ? null : g.startupCpuMs,
    gridBuildWallMs: g.gridBuildWallMs === undefined ? null : g.gridBuildWallMs,
    gridBuildCpuMs: g.gridBuildCpuMs === undefined ? null : g.gridBuildCpuMs,
    samplesWallMs: obs.hostSamples.length > 0 ? sampleWall : null, samplesCpuMs: obs.hostSamples.length > 0 ? sampleCpu : null,
    cleanupWallMs: g.cleanupMs === undefined ? null : g.cleanupMs, cleanupCpuMs: g.cleanupCpuMs === undefined ? null : g.cleanupCpuMs,
    readyOccupiedWallMs: g.readyOccupiedWallMs === undefined ? null : g.readyOccupiedWallMs,
    cpuReadyTotalMs: g.cpuReadyTotalMs === undefined ? null : g.cpuReadyTotalMs,
    note: 'setup = grid build; sample = the per-sample marks (host clock and process CPU at the worker\'s messages); cleanup = ' +
      'decision to the end of termination; the sample figures are attribution only, the trial totals are the rate denominators'
  };
  if (obs.outcome === 'request-timeout' || obs.outcome === 'error') {
    const p = obs.progress.length === 0 ? null : obs.progress[obs.progress.length - 1];
    rec.censoredProgress = p ? { atMs: p.atMs, cpuMs: p.cpuMs, phase: p.msg.phase, floorTests: p.msg.floorTests,
      ladderPasses: p.msg.ladderPasses, removals: p.msg.removals, entries: p.msg.entries,
      phaseBSolves: p.msg.phaseBSolves, canonicalRatings: p.msg.canonicalRatings, counters: p.msg.counters,
      rung: p.msg.rung === undefined ? null : p.msg.rung } : null;
    rec.samplesObserved = obs.sampleEnds;
  }
  if (t) {
    rec.limits = Object.assign({}, rec.limits, { budget: t.limits, ceilings: t.ceilings === undefined ? null : t.ceilings,
      budgetHash: job.trial.budgetHash });
    const fields = ['floorTests', 'floorDeductions', 'solverChecks', 'dfsEntries', 'dfsChecks', 'ladderPasses',
      'phaseBSolves', 'deepenProposals', 'verificationSolves', 'canonicalRatings', 'phaseBTries', 'fuFilterSolves'];
    const counts = {};
    fields.forEach(function (f) { counts[f] = sumField(samples, f); });
    if (mode.kind === 'native') {
      counts.verificationSolves = sumField(samples, 'canonicalRatings');
      counts.canonicalRatings = counts.verificationSolves;
    }
    rec.counts = Object.assign({}, rec.counts, counts);
    rec.canonicalRatings = counts.canonicalRatings;
    rec.samples = samples;
    rec.skippedOrdinals = t.skipped;
    rec.budgetStops = samples.filter(function (s) { return s.status === 'sample-budget'; }).map(function (s) {
      return Object.assign({ ordinal: s.ordinal }, s.budgetStop);
    });
    rec.best = t.best;
    rec.bestOrdinal = t.bestOrdinal;
    rec.bestSource = t.bestSource;
    rec.nativeCaps = t.nativeCaps;
    rec.engineMs = t.engineMs;
    rec.floorIds = samples.length > 0 && samples[0].frontier ? samples[0].frontier.rungs.map(function (r) {
      return { rung: r.id, ids: r.ids };
    }) : null;
    rec.firstExactOrigin = t.firstExact ? t.firstExact.origin : null;
    rec.firstExactOrdinal = t.firstExact ? t.firstExact.ordinal : null;
    rec.firstExactSource = t.firstExact ? t.firstExact.source : null;
    rec.localCapReasons = null;
    rec.localProposals = null;
  }
  rec.parents = { status: obs.parents ? obs.parents.status : 'not-applicable', reason: obs.parents && obs.parents.reason ?
    obs.parents.reason : null, wallMs: obs.parents ? obs.parents.wallMs : 0, cpuMs: obs.parents ? obs.parents.cpuMs : 0,
  rows: obs.parents ? obs.parents.rows : [],
  note: 'post-timing canonical classification of the final phase A parent: it never steers generation and never counts as a hit' };
  if (obs.parents && obs.parents.rows.some(function (r) { return r.status === 'hash-mismatch'; })) {
    rec.identityViolation = rec.identityViolation || 'parent-hash-mismatch';
  }
  if (rec.outcome === 'sample-budget') {
    rec.timeoutScope = null;
    rec.claimedExact = false;
    rec.verifiedExact = null;
    rec.note = 'sample-budget: a distinct harness reason, not an exact hit and not a completed frontier search; the fallback ' +
      'candidate (at worst the fully given grid) is valid but is not offered as a result';
  }
  if (obs.fatal) rec.fatal = obs.fatal;
}

// --- identity inside a shard: one grid per cluster -------------------------------------------------------------------

const identity = IG04.identity;

// --- shard summary -----------------------------------------------------------------------------------------------------------

function compactTrial(r) {
  const g = r.generation || {};
  return { key: r.key, cell: r.puzzleVariant, seed: r.requestSeed, mode: r.mode, tier: r.tier === undefined ? null : r.tier,
    outcome: r.outcome, readyOccupiedWallMs: g.readyOccupiedWallMs, cpuReadyTotalMs: g.cpuReadyTotalMs,
    coldWallMs: g.coldWallMs, gridBuildWallMs: g.gridBuildWallMs, samplesUsed: r.samplesUsed === undefined ? null :
      r.samplesUsed, sampleStates: r.sampleStates === undefined ? null : r.sampleStates.map(function (s) { return s.state; }),
    claimedExact: r.claimedExact, verifiedExact: r.verifiedExact, counts: r.counts,
    budgetStops: r.budgetStops === undefined ? null : r.budgetStops,
    parentClasses: r.parents && r.parents.rows ? r.parents.rows.map(function (p) { return p.class; }) : null };
}

function summary(ctx) {
  const rows = ctx.mergedRecords || ctx.records;
  return {
    estimateVerdict: 'provisional; judged in the task summary (verified exact hits per CPU and wall second against the native kinds ' +
      'on eight grid clusters per cell; formalGate not-evaluable-pre-freeze)',
    exclusions: ['one grid and at most two native-fork samples per grid trial: not a default request and not a qualification',
      'the unmeasured catalogue probe, the independent verifier and the parent classification are outside every generation time',
      'a censored, budget-stopped or unverified trial proves neither a hit nor a zero rate'],
    extra: {
      arms: Object.keys(F.MODES).map(function (id) { return { id: id, kind: F.MODES[id].kind,
        description: F.MODES[id].description }; }),
      identity: ctx.parity,
      trials: rows.map(compactTrial),
      synthetic: ctx.prepared ? ctx.prepared.synthetic : null,
      catalogueProbe: ctx.prepared ? ctx.prepared.probe : null,
      chain: ctx.chainInfo
    }
  };
}

module.exports = { TASK, MANIFEST_FILE, PARENT_RATING_MS, preregistrationProblems, prepare, execute, runTrial, classifyParents,
  augmentRecord, identity, summary, taskDir, compactTrial, ordinalStates, sumField, parentCache, PLAN };
