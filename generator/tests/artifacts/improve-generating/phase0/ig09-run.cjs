'use strict';

/*
 * Task glue of IG-S09 for run.cjs (test side, provisional (pre-freeze)): the captured request of either arm (`execute`), the
 * post-timing diagnosis of its samples (rating, minimality, setup probes; its own 30 s host budget, an unpatched instance, separate
 * wall and CPU fields), the record additions (`augmentRecord`), the identity of G0 against G1 and of the observer-free controls
 * against the captured G0 records (`identity`) and the shard summary.
 *
 * The timed request is the unchanged `Host.runRequest` path (guards, wall, one process CPU reading at the host, cleanup); only the
 * job kind differs. The capture message is collected by a passive listener. Everything after the decision of a request (the
 * diagnosis here, the harness's own final-puzzle validation after it) is outside every generation figure.
 *
 * A diagnosis row that was not reached is `unstarted`, one that ran out of time `timeout`: never assumed. A sample's validation is
 * reused from the other arm of the same pair only when the digest of its full canonical input (level, solution, givens, signs),
 * the source and the guard settings is identical; the source request is recorded in `validationReusedFrom`.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const G = require('./greater-than-diagnostic.cjs');
const PLAN = require('./plans/ig-s09.cjs');

const HarnessError = C.HarnessError;
const TASK = 'IG-S09';
const DIAG_MARGIN_MS = 2000;
const caches = new WeakMap();

const NOT_INSTRUMENTED = 'not instrumented';
const GUARD_SETTINGS = Object.freeze({ minimalNodeCap: G.MINIMAL_NODE_CAP, probeNodeCap: G.PROBE_NODE_CAP,
  probeStepCap: G.PROBE_STEP_CAP, probeGroups: G.PROBE_GROUPS, diagBudgetMs: G.DIAG_BUDGET_MS });

// --- capture collection ----------------------------------------------------------------------------------------------------------

/** Collects the `ig09-capture` message of the worker spawned while `run` executes (a passive listener only). */
async function withCapture(host, run) {
  const messages = [];
  const hadOwn = Object.prototype.hasOwnProperty.call(host, 'spawn');
  const original = host.spawn;
  host.spawn = function (data) {
    const spawned = original.call(this, data);
    spawned.worker.on('message', function (m) {
      if (m && m.type === 'ig09-capture') messages.push(m);
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
  obs.captureMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  obs.captureMessageCount = messages.length;
  return obs;
}

// --- the diagnosis host call -------------------------------------------------------------------------------------------------------

/**
 * One diagnosis worker: rows are collected as they arrive. The allowance is `budgetMs` (30 s) counted from the start of the diagnosis,
 * bounded by the command deadline; worker start and a margin are INSIDE it (the worker's own cooperative budget is what is left at the
 * moment the job is posted, minus `DIAG_MARGIN_MS`), and the host ends the worker at the allowance, never later. Work is reported by
 * the worker before it starts (`ig09-begin`), so what is missing at the end is either `unfinished` (reported started, no result) or
 * `unstarted` (never reported): the two are kept apart.
 */
async function diagnoseCall(host, job, budgetMs) {
  if (host.stopped) throw new HarnessError('host-stopped', 'the host stopped: ' + host.stopped);
  const start = host.mark();
  const deadlineAt = Math.min(start.t + budgetMs, host.commandTimerAt);
  const scope = start.t + budgetMs <= host.commandTimerAt ? 'request' : 'command';
  const spawned = host.spawn({ role: 'verify', adapterIds: [], expectedFingerprint: host.runtimeFingerprint, noEngine: false,
    wantCatalogue: false });
  const out = { status: 'error', rows: [], probe: null, done: null, error: null, terminateFailure: null, began: [], probeBegan: false,
    jobPosted: false, allowanceMs: Math.round(deadlineAt - start.t), allowanceScope: scope, workerBudgetMs: null };
  try {
    const first = await spawned.channel.next(['ready', 'fatal'], deadlineAt, scope);
    if (first.kind === 'message' && first.msg.type === 'ready') {
      out.workerBudgetMs = Math.max(0, Math.floor(deadlineAt - host.clock() - DIAG_MARGIN_MS));
      spawned.worker.postMessage({ type: 'job', job: Object.assign({ kind: 'ig09-diagnose', budgetMs: out.workerBudgetMs }, job) });
      out.jobPosted = true;
      for (;;) {
        const ev = await spawned.channel.next(['ig09-begin', 'ig09-row', 'ig09-probe', 'ig09-done', 'error', 'fatal'], deadlineAt, scope);
        if (ev.kind === 'message') {
          if (ev.msg.type === 'ig09-begin') {
            if (ev.msg.probe === true) out.probeBegan = true;
            else out.began.push(ev.msg.ordinal);
          } else if (ev.msg.type === 'ig09-row') {
            out.rows.push(ev.msg.row);
          } else if (ev.msg.type === 'ig09-probe') {
            out.probe = { ordinal: ev.msg.ordinal, rows: ev.msg.rows };
          } else if (ev.msg.type === 'ig09-done') {
            out.done = ev.msg;
            out.status = ev.msg.stopped ? 'budget' : 'complete';
            break;
          } else {
            out.error = ev.msg.error;
            break;
          }
        } else if (ev.kind === 'timeout') {
          out.status = 'timeout';
          break;
        } else {
          out.error = ev.error || { code: ev.kind, message: 'diagnosis worker ' + ev.kind };
          break;
        }
      }
    } else if (first.kind === 'message') {
      out.error = first.msg.error;
    } else {
      out.status = first.kind === 'timeout' ? 'timeout' : 'error';
      out.error = first.error || { code: first.kind, message: 'diagnosis worker ' + first.kind };
    }
  } finally {
    const term = await host.terminateWorker(spawned.worker);
    if (!term.ok) out.terminateFailure = term.reason;
  }
  const end = host.mark();
  out.wallMs = end.t - start.t;
  out.cpuMs = end.cpu - start.cpu;
  out.cpuResolutionStatus = R.classifyCpu(out.cpuMs, host.cpu.quantumMs);
  return out;
}

function cacheOf(host, blockKey) {
  if (!caches.has(host)) caches.set(host, new Map());
  const byBlock = caches.get(host);
  if (!byBlock.has(blockKey)) byBlock.set(blockKey, { samples: new Map(), probes: new Map() });
  return byBlock.get(blockKey);
}

/**
 * The diagnosis of one captured request. `call(job, budgetMs)` runs the worker (`diagnoseCall` on the host; a scripted one in the
 * tests). Reuse: a sample whose digest is in the pair's cache takes the earlier row and records where it came from.
 */
async function diagnoseRequest(input, call) {
  const capture = input.capture;
  const level = input.level;
  const cache = input.cache;
  const plan = G.planDiagnosis(capture, { level: level, runtimeFingerprint: input.runtimeFingerprint, guards: GUARD_SETTINGS,
    cache: cache.samples });
  const byOrdinal = new Map(capture.samples.map(function (s) { return [s.ordinal, s]; }));
  const jobSamples = plan.order.map(function (ordinal) {
    const s = byOrdinal.get(ordinal);
    const row = plan.rows.find(function (r) { return r.ordinal === ordinal; });
    return { ordinal: ordinal, givens: s.final.givens, signs: s.final.signs, floorClause: row.floorClause,
      ratingDigest: s.final.rating ? s.final.rating.digest : null };
  });
  // the setup probes of the first missed sample, against its saved post-setup parent
  let probeJob = null;
  let probeReuse = null;
  const missed = G.firstMissed(capture.samples);
  if (missed !== null) {
    const groups = G.aboveFloorGroups(missed, G.PROBE_GROUPS);
    probeJob = { ordinal: missed.ordinal, solution: missed.setup.solution, parent: missed.setup.givens,
      signsAll: capture.attemptSigns[missed.attempt], groups: groups.map(function (g) { return { phase: g.phase, cells: g.cells }; }),
      minClues: missed.setup.minClues, minPerUnit: missed.setup.minPerUnit };
    const digest = G.probeInputDigest({ level: level, solution: probeJob.solution, parent: probeJob.parent,
      signsAll: probeJob.signsAll, groups: probeJob.groups, floor: [probeJob.minClues, probeJob.minPerUnit],
      runtimeFingerprint: input.runtimeFingerprint, guards: GUARD_SETTINGS });
    probeJob.digest = digest;
    if (groups.length === 0) {
      probeJob = null;
    } else if (cache.probes.has(digest)) {
      probeReuse = cache.probes.get(digest);
      probeJob = null;
    }
  }
  const diag = { status: 'not-run', budgetMs: G.DIAG_BUDGET_MS, wallMs: null, cpuMs: null, cpuResolutionStatus: null,
    plan: { dugSamples: plan.rows.length, toDiagnose: plan.order.length, reused: plan.rows.length - plan.order.length },
    rows: {}, unstarted: [], unfinished: [], probe: null, error: null, guardSettings: GUARD_SETTINGS };
  if (jobSamples.length > 0 || probeJob !== null) {
    const out = await call({ level: level, samples: jobSamples, probe: probeJob }, G.DIAG_BUDGET_MS);
    diag.status = out.status;
    diag.wallMs = out.wallMs;
    diag.cpuMs = out.cpuMs;
    diag.cpuResolutionStatus = out.cpuResolutionStatus;
    diag.error = out.error;
    diag.allowance = { allowanceMs: out.allowanceMs === undefined ? null : out.allowanceMs, scope: out.allowanceScope || null,
      workerBudgetMs: out.workerBudgetMs === undefined ? null : out.workerBudgetMs, jobPosted: out.jobPosted === undefined ? null : out.jobPosted,
      note: 'the allowance is counted from the start of the diagnosis (worker start included) and bounded by the command deadline' };
    out.rows.forEach(function (row) { diag.rows[row.ordinal] = row; });
    diag.workerDone = out.done ? { stopped: out.done.stopped, rows: out.done.rows, wallMs: out.done.wallMs } : null;
    // work that has no row: reported started (unfinished: the result is unknown) or never reported started (unstarted)
    const began = new Set(Array.isArray(out.began) ? out.began : []);
    jobSamples.forEach(function (s) {
      if (diag.rows[s.ordinal] !== undefined) return;
      if (began.has(s.ordinal)) diag.unfinished.push(s.ordinal);
      else diag.unstarted.push(s.ordinal);
    });
    if (out.probe) {
      diag.probe = { ordinal: out.probe.ordinal, groupsPlanned: probeJob.groups.length, rows: out.probe.rows,
        digest: probeJob.digest, reusedFrom: null };
    } else if (probeJob !== null) {
      diag.probe = { ordinal: probeJob.ordinal, groupsPlanned: probeJob.groups.length, rows: [], digest: probeJob.digest,
        reusedFrom: null, status: out.probeBegan === true ? 'unfinished' : 'unstarted' };
    }
  } else {
    diag.status = 'reused-only';
  }
  if (probeReuse !== null) {
    diag.probe = Object.assign({}, probeReuse.probe, { reusedFrom: probeReuse.key });
  }
  // the reused rows, and the cache for the other arm
  plan.rows.forEach(function (r) {
    if (r.reusedFrom !== null) {
      diag.rows[r.ordinal] = Object.assign({}, r.reusedRow, { ordinal: r.ordinal, validationReusedFrom: r.reusedFrom,
        inputDigest: r.digest });
    } else if (diag.rows[r.ordinal] !== undefined) {
      diag.rows[r.ordinal].inputDigest = r.digest;
      diag.rows[r.ordinal].validationReusedFrom = null;
      if (diag.rows[r.ordinal].ratingStatus === 'ok' && !input.noCacheWrite) {
        cache.samples.set(r.digest, { key: input.key, row: diag.rows[r.ordinal] });
      }
    }
  });
  if (diag.probe && diag.probe.reusedFrom === null && diag.probe.digest && diag.probe.rows.length > 0 && !input.noCacheWrite) {
    cache.probes.set(diag.probe.digest, { key: input.key, probe: diag.probe });
  }
  diag.reuse = { samples: plan.rows.filter(function (r) { return r.reusedFrom !== null; }).length,
    diagnosed: Object.keys(diag.rows).length - plan.rows.filter(function (r) { return r.reusedFrom !== null; }).length,
    sources: Array.from(new Set(plan.rows.filter(function (r) { return r.reusedFrom !== null; }).map(function (r) {
      return r.reusedFrom;
    }))) };
  return diag;
}

// --- run.cjs hooks: execute -------------------------------------------------------------------------------------------------------

async function execute(ctx) {
  const job = ctx.job;
  const host = ctx.host;
  if (job.executor !== 'gt') throw new HarnessError('plan-missing', 'no executor ' + job.executor);
  const obs = await withCapture(host, function () {
    return host.runRequest({ key: job.key, kind: 'ig09-' + job.gtArm + '-request', request: job.request,
      adapterIds: job.adapterIds, guardScope: job.guardScope, wantCatalogue: ctx.catalogue === null, readyCheck: ctx.readyCheck });
  });
  const message = obs.captureMessage;
  obs.gt = { arm: job.gtArm, capture: message ? message.capture : null, captureBuildMs: message ? message.captureBuildMs : null,
    workerRunMs: message ? message.runMs : null, restore: message ? message.restore : null, runError: message ? message.runError : null,
    messages: obs.captureMessageCount, diag: null };
  if (obs.outcome === 'complete' && obs.gt.capture !== null && !host.stopped) {
    const cache = cacheOf(host, job.blockKey);
    obs.gt.diag = await diagnoseRequest({ capture: obs.gt.capture, level: job.level, cache: cache, key: job.key,
      runtimeFingerprint: host.runtimeFingerprint }, function (diagJob, budgetMs) { return diagnoseCall(host, diagJob, budgetMs); });
  }
  return obs;
}

// --- record additions ---------------------------------------------------------------------------------------------------------------

/** The consistency of a capture against its own counters and the returned wire: problems, empty when well formed. */
function captureProblems(capture, wire, arm) {
  const problems = [];
  if (!capture || capture.schema !== G.SCHEMA) return ['no capture of the expected schema'];
  if (capture.arm !== arm) problems.push('the capture is of arm ' + capture.arm + ', expected ' + arm);
  if (capture.finished !== true) problems.push('the capture was not finished');
  let maxAttempt = 0;
  capture.samples.forEach(function (s) {
    if (s.endReason !== 'end') problems.push('sample ' + s.ordinal + ' ended as ' + s.endReason);
    if (s.attempt !== null && s.attempt > maxAttempt) maxAttempt = s.attempt;
    if (s.kind !== 'local' && (s.setup === null || s.final === null)) problems.push('sample ' + s.ordinal + ' has no setup or final state');
    s.passes.forEach(function (p) {
      if (p.seq.length !== p.removals) problems.push('sample ' + s.ordinal + ' pass ' + p.index + ': decisions != removals');
      if (p.accepted + p.rejectedAmbiguous + p.rejectedTechniques + p.errors !== p.removals) {
        problems.push('sample ' + s.ordinal + ' pass ' + p.index + ': outcomes do not add up');
      }
      if (p.ended !== true) problems.push('sample ' + s.ordinal + ' pass ' + p.index + ' did not end');
      if (arm === 'g0' && p.g1 !== null) problems.push('a G1 record in a G0 capture');
      if (arm === 'g1' && p.g1 !== null) {
        const sum = Object.keys(p.g1).filter(function (k) { return k !== 'tried'; }).reduce(function (t, k) { return t + p.g1[k]; }, 0);
        if (p.g1.tried !== p.removals || sum !== p.g1.tried) problems.push('sample ' + s.ordinal + ' pass ' + p.index + ': G1 events');
      }
      if (arm === 'g1' && p.g1 === null && p.firstTechnique === true) problems.push('the first technique pass has no G1 record');
    });
  });
  if (wire && maxAttempt !== wire.attempts) problems.push('captured attempts ' + maxAttempt + ' != wire attempts ' + wire.attempts);
  return problems;
}

function augmentRecord(rec, job, obs, io) {
  rec.solverMode = job.solverMode;
  rec.poolWidth = 1;
  rec.cellKind = job.cellKind;
  rec.gtArm = job.gtArm;
  if (io && io.evidenceRoot && io.attemptDir) rec.round = path.relative(io.evidenceRoot, io.attemptDir).split(path.sep)[0];
  rec.limitOrigin = job.executor === 'gt' ? 'research safety guard (request 180 s); a captured request is a diagnostic run with ' +
    'observation hooks, not an uninstrumented timing' : 'research safety guard (request 180 s); the observer-free control';
  if (job.executor !== 'gt') return;
  const g = obs.gt || null;
  if (g === null) return;
  const diag = g.diag;
  const problems = [];
  if (obs.outcome === 'complete' || (g.capture && g.runError === null)) {
    captureProblems(g.capture, obs.wire, job.gtArm).forEach(function (p) { problems.push(p); });
    if (!g.restore || g.restore.removed !== true) problems.push('the capture runtime was not removed');
  }
  rec.gt = { arm: job.gtArm, capture: g.capture, captureBuildMs: g.captureBuildMs, workerRunMs: g.workerRunMs, restore: g.restore,
    runError: g.runError, problems: problems, diag: diag, guardSettings: GUARD_SETTINGS, counterUnits: G.COUNTER_UNITS,
    firstFailure: g.capture && g.capture.firstFailure ? g.capture.firstFailure : null };
  if (problems.length > 0) rec.identityViolation = 'capture-inconsistent: ' + problems.slice(0, 3).join('; ');
  // a failure that is not a recognised engine guard (a solver bug guard, a contradiction, a malformed proof) stops the pack for review
  const ff = rec.gt.firstFailure;
  if (ff !== null && G.GUARD_CODES.indexOf(ff.code) < 0) {
    rec.identityViolation = rec.identityViolation || 'unexpected failure (' + ff.kind + ', ' + ff.code + ') at ' + ff.site + ', sample ' + ff.sampleOrdinal +
      ', pass ' + ff.pass + ', removal ' + ff.removal;
  }
  if (g.capture) {
    const t = g.capture.totals;
    // `counts.dfsEntries` stays unknown (null): the capture counts countSolutions calls, which are not depth-first node entries (r1
    // records alias them there; `rec.gt.counterUnits` says what each counter is). `counts.dfsChecks` is the search-loop budget checks.
    rec.counts = Object.assign(rec.counts, { dfsChecks: t.dfsChecks });
    rec.samplesUsed = g.capture.samples.filter(function (s) { return s.kind !== 'local'; }).length;
  }
  if (obs.wire && Array.isArray(obs.wire.work)) rec.attemptsWork = attemptWork(obs.wire);
}

/** The per-attempt work of the wire: ratings and proposals used, their caps and every local search with its cap reason. */
function attemptWork(wire) {
  return wire.work.map(function (w, i) {
    return { attempt: i + 1, ratings: w.ratings, proposals: w.proposals, maxRatings: w.maxRatings, maxProposals: w.maxProposals,
      localSearches: (w.localSearches || []).map(function (l) {
        return { ratings: l.ratings, proposals: l.proposals, firstShallowAt: l.firstShallowAt, shallowRatings: l.shallowRatings,
          shallowLimit: l.shallowLimit, capHit: l.capHit };
      }) };
  });
}

// --- identity ----------------------------------------------------------------------------------------------------------------------

function readG0Record(repoRoot, level, seed, round) {
  const cohort = level === 'normal' ? 'normal' : 'nightmare';
  const shard = PLAN.shardList().find(function (s) { return s.cohort === cohort && s.seeds.indexOf(seed) >= 0; });
  if (!shard) return null;
  const dir = R.shardDirOf(path.join(repoRoot, ...C.EVIDENCE_REL.split('/')), round || 'provisional-r1', TASK, shard.shard);
  const key = TASK + '/' + shard.shard + '/greaterThan:' + level + ':' + seed + '/g0';
  const attempts = R.listAttempts(dir);
  for (let i = attempts.length - 1; i >= 0; i--) {
    const file = path.join(attempts[i].dir, R.EVIDENCE_FILES.records);
    if (!fs.existsSync(file)) continue;
    const found = C.readJson(file).records.find(function (r) { return r.key === key && r.outcome === 'complete'; });
    if (found) return found;
  }
  return null;
}

function identity(records, options) {
  const repoRoot = options && options.repoRoot ? options.repoRoot : C.DEFAULT_REPO_ROOT;
  const read = options && options.readG0 ? options.readG0 : function (level, seed, round) { return readG0Record(repoRoot, level, seed, round); };
  const pairs = [];
  const byPair = new Map();
  records.forEach(function (r) {
    if (r.cellKind === 'control') {
      if (r.outcome === 'unstarted') return;
      const g0 = r.outcome === 'complete' ? read(r.level, r.requestSeed, r.round) : null;
      if (r.outcome !== 'complete' || !g0 || !g0.digests || !r.digests) {
        pairs.push({ pairId: r.pairId, kind: 'control', verdict: 'not-comparable', problems: [r.outcome !== 'complete' ?
          'the control did not complete (' + r.outcome + ')' : 'no recorded G0 request of the same seed'] });
        return;
      }
      const diff = R.compareDigests(g0.digests, r.digests);
      const problems = [];
      if (!diff.equal) problems.push('digests differ in: ' + diff.differing.join(', '));
      if (g0.claimedExact !== r.claimedExact) problems.push('claimed exact differs from the captured G0');
      pairs.push({ pairId: r.pairId, kind: 'control', verdict: problems.length === 0 ? 'identity-ok' : 'identity-failed',
        problems: problems, differing: diff.differing, g0Key: g0.key, g0Digest: g0.digests.all, controlDigest: r.digests.all });
      return;
    }
    if (!r.pairId) return;
    if (!byPair.has(r.pairId)) byPair.set(r.pairId, {});
    byPair.get(r.pairId)[r.arm] = r;
  });
  byPair.forEach(function (arms, pairId) {
    const a = arms.reference;
    const b = arms.prototype;
    const present = function (r) { return !!r && r.outcome !== 'unstarted'; };
    if (!present(a) && !present(b)) return;
    if (present(a) !== present(b) && (present(a) ? a : b).outcome === 'complete') {
      pairs.push({ pairId: pairId, kind: 'arms', verdict: 'deferred', waitingFor: present(a) ? 'g1' : 'g0' });
      return;
    }
    const uncensored = !!a && !!b && a.outcome === 'complete' && b.outcome === 'complete' && a.gt && b.gt && a.gt.capture && b.gt.capture;
    if (!uncensored) {
      pairs.push({ pairId: pairId, kind: 'arms', verdict: 'not-comparable', problems: ['an arm did not complete with a capture (' +
        (a ? a.outcome : 'none') + ' / ' + (b ? b.outcome : 'none') + '): censored or failed pairs are not compared'] });
      return;
    }
    const diff = R.compareDigests(a.digests, b.digests);
    const arms2 = G.compareArms(a.gt.capture, b.gt.capture);
    const problems = [];
    if (!diff.equal) problems.push('request digests differ in: ' + diff.differing.join(', '));
    if (a.claimedExact !== b.claimedExact || a.verifiedExact !== b.verifiedExact) problems.push('exactness differs');
    let verdict = 'identity-ok';
    if (!arms2.equal || !diff.equal || problems.length > 0) {
      verdict = !arms2.equal && arms2.verdict === 'guard-binding-difference' ? 'guard-binding-difference' : 'identity-failed';
    }
    pairs.push({ pairId: pairId, kind: 'arms', verdict: verdict, problems: problems, differing: diff.differing,
      samples: arms2.samplesCompared, passes: arms2.passesCompared, removals: arms2.removalsCompared,
      budgetPresent: arms2.budgetPresent, firstDifference: arms2.firstDifference, unrecognisedFailure: arms2.unrecognisedFailure || null,
      g0Digest: a.digests.all, g1Digest: b.digests.all });
  });
  const count = function (v) { return pairs.filter(function (p) { return p.verdict === v; }).length; };
  return { pairs: pairs, failed: count('identity-failed'), ok: count('identity-ok'), guardBinding: count('guard-binding-difference'),
    notComparable: count('not-comparable'), deferred: count('deferred'),
    complete: pairs.length > 0 && count('identity-ok') === pairs.length };
}

// --- shard summary -----------------------------------------------------------------------------------------------------------------

function requestView(rec) {
  const g = rec.gt;
  const cap = g && g.capture ? g.capture : null;
  const gen = rec.generation || {};
  return { key: rec.key, arm: rec.gtArm || rec.variantId, outcome: rec.outcome, readyWallMs: gen.readyWallMs, cpuTotalMs: gen.cpuTotalMs,
    samples: cap ? cap.samples.length : null, dfsCalls: cap ? cap.totals.dfsCalls : null, dfsChecks: cap ? cap.totals.dfsChecks : null,
    diagStatus: g && g.diag ? g.diag.status : null, diagWallMs: g && g.diag ? g.diag.wallMs : null,
    problems: g ? g.problems : null };
}

function summary(ctx) {
  const rows = ctx.mergedRecords || ctx.records;
  return {
    estimateVerdict: 'diagnostic only: no guided pool, setup-clue policy change or IR29 adoption follows from it (IG-S-Q16, B03)',
    exclusions: ['a captured request is a diagnostic run with observation hooks and trace summary: never an uninstrumented headline',
      'the post-timing diagnosis (independent rating, minimality, probes) and the harness validation are outside every generation time',
      'the observer-free controls are overhead comparators, not new headline measurements'],
    extra: {
      arms: { reference: 'G0: the native first-allowed sign pass, with capture', prototype: 'G1: native restricted solve first in the ' +
        'first technique sign pass, with the same capture', control: 'observer-free native request (no capture hooks)' },
      identity: ctx.parity,
      requests: rows.map(requestView),
      guardSettings: GUARD_SETTINGS,
      chain: ctx.chainInfo
    }
  };
}

module.exports = { TASK, NOT_INSTRUMENTED, GUARD_SETTINGS, DIAG_MARGIN_MS, withCapture, diagnoseCall, diagnoseRequest, execute, captureProblems,
  augmentRecord, identity, readG0Record, summary, requestView, cacheOf };
