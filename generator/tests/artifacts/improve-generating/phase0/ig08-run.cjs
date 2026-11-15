'use strict';

/*
 * Task glue of IG-S08 for run.cjs (test side, provisional (pre-freeze), pre-MS07): in the first shard (`control`) the unmeasured
 * catalogue probe, the calibration of the instrument's unit costs, the engine checks of the instrument and the synthetic
 * short-timeout journal recovery test (`prepare`); the observed request with its stage journal (`execute`); the record additions
 * with the attribution reconciled from the journal alone (`augmentRecord`); the identity of the observed control against the
 * native one and the shard summary.
 *
 * The observed request is the unchanged `Host.runRequest` path (guards, wall, one process CPU reading at the host, cleanup); only
 * the job kind differs, and a recorder is attached to the worker the host spawns: it journals every stage marker the worker
 * posts and, every few seconds, the shared-memory counters (a heartbeat), and it reads the shared memory once more after the
 * worker was terminated. The journal (`stage-journal.jsonl`) is what the attribution is computed from, so it survives a worker
 * that never answers: the host only waits and writes. A request cut by the guard is a censored lower bound at the limit actually
 * applied, never a result and never a pass. Nothing here edits host.cjs, loader.cjs, the verifier or any generation code.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const R = require('./records.cjs');
const H = require('./host.cjs');
const P = require('./jigsaw-profile.cjs');
const PLAN = require('./plans/ig-s08.cjs');

const HarnessError = C.HarnessError;
const TASK = 'IG-S08';
const STAGE_JOURNAL = 'stage-journal.jsonl';
const SYNTHETIC_JOURNAL = 'stage-journal-synthetic.jsonl';
const HEARTBEAT_MS = 5000;
const calibrations = new WeakMap();

const PRE_MS07 = 'pre-MS07: the catalogue, floors and search may change when difficulty-v3 freezes (MS07); every number here is ' +
  'provisional (pre-freeze) and a frozen rerun with the same seeds and bound is the confirmatory one';
const PROVENANCE = Object.freeze({
  harnessBase: '5027a528f03a (IG-S07 r2 writer; this task adds files and one line each to run.cjs and worker.cjs, so the harness ' +
    'fingerprint of its commands differs and is recorded in each command.json)',
  loopTestProvenance: '062742c330eb (the IG-S07 loop-check command: the budget-check counts of the logical solver loop)',
  counterLimitation: 'chain propagation checks that bypass ctx.check are not counted (IG-S07 limitation carried forward); the totals of ' +
    'the solver\'s budget checks were not instrumented in this task (the request passes no external budget, but the digger\'s own internal ' +
    'budgets issue checks that are not counted), so they are recorded as unknown, never zero'
});
const UNKNOWN_COUNTERS = Object.freeze([
  { counter: 'solverBudgetChecks', why: 'not instrumented: the totals of the solver\'s budget checks are not counted (the request passes no ' +
    'external budget, but the digger\'s internal budgets, such as the stage B objective step guard and the uniqueness-count node slices, ' +
    'issue checks); the propagation checks of the chain finders bypass ctx.check in any case (IG-S07 limitation)' },
  { counter: 'constraintPropagationOperations', why: 'no counter exists in the private source; the time is part of the cell of the ' +
    'caller (the logical solver\'s own code, a finder or the depth-first search)' },
  { counter: 'findingApplicationTime', why: 'part of the logical solver\'s own code (sub solver), not separated from the ladder loop' },
  { counter: 'perCallTimeOfOracleObjectiveKeeperLocal', why: 'wall time and call counts are kept per context, not per individual call' }
]);

// --- the stage journal (host side) -------------------------------------------------------------------------------------------

/** An append-only file kept open for one request: one JSON line (CRLF) per entry, written at once, flushed to disk at a heartbeat. */
class StageJournal {
  constructor(repoRoot, file) {
    this.file = C.assertAuthorised(repoRoot, file);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.fd = fs.openSync(this.file, 'a');
    this.lines = 0;
    this.closed = false;
  }

  append(entry) {
    if (this.closed) return;
    fs.writeSync(this.fd, JSON.stringify(entry) + '\r\n');
    this.lines++;
  }

  sync() {
    if (!this.closed) fs.fsyncSync(this.fd);
  }

  close() {
    if (this.closed) return;
    try {
      fs.fsyncSync(this.fd);
    } finally {
      fs.closeSync(this.fd);
      this.closed = true;
    }
  }
}

function r3(x) {
  return Math.round(x * 1000) / 1000;
}

/**
 * Journals what one worker does while the host waits: its markers as they arrive, a heartbeat of the shared memory every
 * `heartbeatMs`, its exit and, once the request has ended, the post-mortem read of the shared memory. Reads and writes only.
 */
class Recorder {
  constructor(options) {
    this.host = options.host;
    this.journal = options.journal;
    this.key = options.key;
    this.sab = options.sab;
    this.heartbeatMs = options.heartbeatMs === undefined ? HEARTBEAT_MS : options.heartbeatMs;
    this.epoch = options.epoch || function () { return performance.timeOrigin + performance.now(); };
    this.timer = null;
    this.beats = 0;
    this.origin = null;
    this.detached = false;
  }

  line(type, data) {
    this.journal.append(Object.assign({ at: C.isoNow(), key: this.key, type: type }, data));
  }

  rel(mark) {
    return r3(mark.t - this.origin.clock);
  }

  attach(worker, meta) {
    this.origin = { clock: meta.before.t, cpu: meta.before.cpu, epoch: meta.beforeEpoch };
    const g = this.host.guards;
    this.line('spawn', { hostEpochMs: r3(meta.beforeEpoch), role: meta.role, adapterIds: meta.adapterIds,
      heartbeatMs: this.heartbeatMs, sabBytes: this.sab.byteLength, layout: { version: P.VERSION, nCtx: P.NCTX, subs: P.SUBS },
      guards: { requestMs: g.requestMs, jigsawMs: g.jigsawMs, commandMs: g.commandMs },
      commandWindowRemainingMs: r3(this.host.remainingMs()) });
    worker.on('message', (m) => this.onMessage(m));
    worker.on('error', (err) => {
      this.line('worker-error', { rel: this.rel(this.host.mark()), message: String(err && err.message ? err.message : err) });
    });
    worker.on('exit', (code) => {
      this.line('worker-exit', { rel: this.rel(this.host.mark()), code: code });
    });
    this.timer = setInterval(() => this.beat(), this.heartbeatMs);
    this.journal.sync();
  }

  onMessage(m) {
    if (!m || this.detached) return;
    if (m.type === 'ig08-ev') {
      const mk = this.host.mark();
      const rest = Object.assign({}, m);
      delete rest.type;
      delete rest.ev;
      delete rest.seq;
      delete rest.t;
      this.line('ev', Object.assign({ rel: this.rel(mk), cpuMs: r3(mk.cpu - this.origin.cpu), workerSeq: m.seq, t: r3(m.t),
        ev: m.ev }, rest));
    } else if (m.type === 'ig08-profile') {
      const rest = Object.assign({}, m);
      delete rest.type;
      this.line('worker-end', Object.assign({ rel: this.rel(this.host.mark()) }, rest));
    } else if (m.type === 'ready') {
      this.line('ready', { rel: this.rel(this.host.mark()), loadMs: m.loadMs, adapterIds: m.adapterIds });
    }
  }

  beat() {
    if (this.detached) return;
    const mk = this.host.mark();
    const snap = P.readSnapshot(this.sab);
    this.beats++;
    this.line('heartbeat', { n: this.beats, rel: this.rel(mk), hostEpochMs: r3(this.epoch()), cpuMs: r3(mk.cpu - this.origin.cpu),
      summary: P.summariseSnapshot(snap), snapshot: snap });
    this.journal.sync();
  }

  detach() {
    this.detached = true;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  /** After the request ended and its worker was terminated: the last read of the shared memory and the host's own account. */
  finalize(obs) {
    const mk = this.host.mark();
    const snap = P.readSnapshot(this.sab);
    const g = obs && obs.generation ? obs.generation : null;
    this.line('final', { rel: this.rel(mk), hostEpochMs: r3(this.epoch()),
      endEpochMs: g && Number.isFinite(g.coldWallMs) ? r3(this.origin.epoch + g.coldWallMs) : null,
      outcome: obs ? obs.outcome : null, timeoutScope: obs ? obs.timeoutScope : null, lateDecision: obs ? obs.lateDecision === true : null,
      guard: obs ? obs.guard : null, terminateFailure: obs ? obs.terminateFailure : null,
      generation: g ? { coldWallMs: g.coldWallMs, readyWallMs: g.readyWallMs, startupMs: g.startupMs, cleanupMs: g.cleanupMs,
        cpuToDecisionMs: g.cpuToDecisionMs, cpuTotalMs: g.cpuTotalMs, cpuResolutionStatus: g.cpuResolutionStatus } : null,
      heartbeats: this.beats, source: 'shared memory read after the worker ended', summary: P.summariseSnapshot(snap), snapshot: snap });
    this.journal.sync();
  }
}

/**
 * Runs `run()` (a host request) with a recorder attached to the worker the host spawns: the shared buffer goes in through the
 * worker data, the host's spawn is restored afterwards, the journal receives the final read. The host path is otherwise untouched.
 */
async function withBeacon(host, spec, run) {
  const sab = P.allocate();
  const recorder = new Recorder({ host: host, journal: spec.journal, key: spec.key, sab: sab, heartbeatMs: spec.heartbeatMs,
    epoch: spec.epoch });
  const hadOwn = Object.prototype.hasOwnProperty.call(host, 'spawn');
  const original = host.spawn;
  host.spawn = function (data) {
    const before = host.mark();
    const beforeEpoch = recorder.epoch();
    const spawned = original.call(this, Object.assign({}, data, { ig08: { sab: sab } }));
    recorder.attach(spawned.worker, { before: before, beforeEpoch: beforeEpoch, role: data.role, adapterIds: data.adapterIds || [] });
    return spawned;
  };
  let obs = null;
  try {
    obs = await run();
  } catch (err) {
    recorder.line('abort', { message: String(err && err.message ? err.message : err) });
    throw err;
  } finally {
    if (hadOwn) host.spawn = original;
    else delete host.spawn;
    recorder.detach();
  }
  recorder.finalize(obs);
  return obs;
}

// --- reading the journal -------------------------------------------------------------------------------------------------------

/** The attribution of one request from its journal alone: the final read, else the last heartbeat, else nothing. */
function attributionOf(rc) {
  const techniques = rc.begin && Array.isArray(rc.begin.techniques) ? rc.begin.techniques : [];
  if (rc.final && rc.final.snapshot) {
    return { source: 'final', atRelMs: rc.final.rel,
      attribution: P.attribute(rc.final.snapshot, { techniques: techniques, endEpochMs: rc.final.endEpochMs }) };
  }
  if (rc.lastHeartbeat && rc.lastHeartbeat.snapshot) {
    return { source: 'last-heartbeat', atRelMs: rc.lastHeartbeat.rel,
      attribution: P.attribute(rc.lastHeartbeat.snapshot, { techniques: techniques, endEpochMs: rc.lastHeartbeat.hostEpochMs }) };
  }
  return { source: rc.markers > 0 ? 'markers-only' : 'none', atRelMs: null, attribution: null };
}

/** How the marker channel and the shared memory agree on the stage that was running when the worker ended. */
function agreement(rc, attribution) {
  if (!attribution || !attribution.current) return 'finished';
  const open = rc.openStages.length > 0 ? rc.openStages[rc.openStages.length - 1] : null;
  if (open === null) return 'no-open-marker';
  return open.step === attribution.current.step || (attribution.current.step === null && open.step === undefined) ? 'agree' :
    'differ(marker ' + open.step + ', shared memory ' + attribution.current.step + ')';
}

function compactStages(stages) {
  return stages.map(function (s) {
    return [s.step, s.attempt, s.sample, s.kind, s.wallMs, s.closed];
  });
}

function reconcileSummary(rc, parsed) {
  return { lines: rc.lines, markers: rc.markers, heartbeats: rc.heartbeats, source: rc.source, problems: rc.problems,
    truncatedLastLine: parsed.truncatedLastLine, unparsableLines: parsed.badLines, openStages: rc.openStages,
    layoutEvents: rc.layoutEvents.length, stageColumns: ['step', 'attempt', 'sample', 'kind', 'wallMs', 'closed'],
    stages: compactStages(rc.stages) };
}

function sha(text) {
  return C.sha256(Buffer.from(text, 'utf8'));
}

// --- run.cjs hooks: prepare ----------------------------------------------------------------------------------------------------

/** Builds a test-only host sharing the real host's CPU calibration (short guards exist only in a test-only host). */
function testHost(real, guardOverrides, deadlineMs) {
  const host = new H.Host({ repoRoot: C.DEFAULT_REPO_ROOT, runtimeFingerprint: null, testOnly: true,
    guards: Object.assign({}, C.GUARDS, guardOverrides || {}), deadlineMs: deadlineMs || 60000, processAgeMs: 0 });
  if (real && real.cpu) host.cpu = real.cpu;
  return host;
}

/**
 * The journal recovery scenario: a busy worker that publishes stage entries and counters and never answers, a short test-only
 * Jigsaw guard, the recorder on the real host path. Returns the observation and the journal text.
 */
async function recoveryScenario(options) {
  const host = options.host;
  const journal = new StageJournal(C.DEFAULT_REPO_ROOT, options.file);
  let obs = null;
  try {
    obs = await withBeacon(host, { key: options.key, journal: journal, heartbeatMs: options.heartbeatMs }, function () {
      return host.runRequest({ key: options.key, kind: 'ig08-synthetic-busy', noEngine: options.noEngine !== false, request: {},
        guardScope: 'jigsaw' });
    });
  } finally {
    journal.close();
  }
  return { obs: obs, text: fs.readFileSync(options.file, 'utf8'), hostWorkersAfter: host.workers.size };
}

function monotone(values) {
  for (let i = 1; i < values.length; i++) if (values[i] < values[i - 1]) return false;
  return true;
}

/**
 * Judges a recovery scenario: the busy worker was cut by the guard, the host recorded a timeout and no result, and the journal
 * alone gives the last stage and counters (from the final read; from the last heartbeat when the final line is missing; and
 * from a journal whose last line was cut short).
 */
function judgeRecovery(run, expect) {
  const checks = [];
  const add = function (id, ok, detail) { checks.push({ id: id, ok: ok === true, detail: detail === undefined ? null : detail }); };
  const obs = run.obs;
  const key = obs.key;
  const g = obs.generation;
  add('recovery.timeout-recorded', obs.outcome === 'request-timeout' && obs.timeoutScope === 'request' && obs.wire === null &&
    obs.error && obs.error.code === 'timeout', { outcome: obs.outcome, scope: obs.timeoutScope });
  add('recovery.no-invented-result', obs.wire === null && obs.lateDecision === false, null);
  add('recovery.host-stayed-responsive', g.coldWallMs >= expect.guardMs - 10 && g.coldWallMs < expect.guardMs + 1500,
    { coldWallMs: g.coldWallMs, guardMs: expect.guardMs });
  add('recovery.worker-terminated', run.hostWorkersAfter === 0 && obs.terminateFailure === null, null);
  const parsed = P.parseJournal(run.text);
  const rc = P.reconcileJournal(parsed.entries, key);
  add('recovery.journal-wellformed', parsed.badLines.length === 0 && !parsed.truncatedLastLine && rc.problems.length === 0,
    { bad: parsed.badLines, problems: rc.problems });
  add('recovery.stage-markers-survive', rc.begin !== null && rc.stages.length === 3 && rc.stages[0].step === 'configure' &&
    rc.stages[1].step === 'buildModel' && rc.stages[2].step === 'fullGrid' && rc.stages[0].closed && rc.stages[1].closed &&
    !rc.stages[2].closed && rc.openStages.length === 1, rc.stages.map(function (s) { return s.step + (s.closed ? '' : '(open)'); }));
  add('recovery.layout-markers', rc.layoutEvents.filter(function (e) { return e.ev === 'layout-attempt'; }).length === 3 &&
    rc.layoutEvents.some(function (e) { return e.ev === 'layout-accepted'; }), rc.layoutEvents.length);
  const beats = parsed.entries.filter(function (e) { return e.key === key && e.type === 'heartbeat'; });
  add('recovery.heartbeats-while-busy', beats.length >= expect.minHeartbeats, { heartbeats: beats.length });
  const nodes = beats.map(function (b) { return b.summary.totals.dfsNodes; });
  add('recovery.counters-move-while-worker-blocked', nodes.length >= 2 && monotone(nodes) && nodes[nodes.length - 1] > nodes[0],
    nodes.slice(0, 6));
  add('recovery.final-read', rc.final !== null && rc.source === 'final' && rc.final.snapshot.header.state === P.STATE.running,
    rc.final ? P.STATE_NAMES[rc.final.snapshot.header.state] : null);
  const full = attributionOf(rc);
  const a = full.attribution;
  add('recovery.last-stage-from-shared-memory', a !== null && a.current !== null && a.current.step === 'fullGrid' &&
    a.current.attempt === 2 && a.current.inProgressMs >= 0 && a.current.inProgressMs < expect.guardMs + 2000,
  a ? a.current : null);
  add('recovery.marker-and-memory-agree', a !== null && agreement(rc, a) === 'agree', a ? agreement(rc, a) : null);
  add('recovery.final-counters-cover-last-heartbeat', rc.final !== null && rc.lastHeartbeat !== null &&
    rc.final.summary.totals.dfsNodes >= rc.lastHeartbeat.summary.totals.dfsNodes && rc.final.summary.totals.dfsNodes > 0,
  rc.final ? rc.final.summary.totals : null);
  // the host died before the final read: the last heartbeat is what is left
  const withoutFinal = P.reconcileJournal(parsed.entries.filter(function (e) { return e.type !== 'final'; }), key);
  const fallback = attributionOf(withoutFinal);
  add('recovery.fallback-last-heartbeat', fallback.source === 'last-heartbeat' && fallback.attribution !== null &&
    fallback.attribution.current !== null && fallback.attribution.current.step === 'fullGrid' &&
    fallback.attribution.counters.totals.dfsNodes <= (a ? a.counters.totals.dfsNodes : 0), fallback.source);
  // the last line written was cut short
  const cut = run.text.replace(/\r?\n$/, '');
  const truncated = P.parseJournal(cut.slice(0, cut.length - Math.floor(cut.split(/\r?\n/).pop().length / 2)));
  const rcCut = P.reconcileJournal(truncated.entries, key);
  add('recovery.truncated-last-line-tolerated', truncated.truncatedLastLine === true && rcCut.stages.length === 3 &&
    rcCut.begin !== null, { truncated: truncated.truncatedLastLine });
  return { ok: checks.every(function (c) { return c.ok; }), checks: checks, summary: { heartbeats: beats.length,
    markers: rc.markers, stages: rc.stages.length, source: rc.source, coldWallMs: g.coldWallMs } };
}

async function syntheticRecovery(ctx) {
  const host = testHost(ctx.host, { jigsawMs: 1500 });
  const file = path.join(ctx.attemptDir, SYNTHETIC_JOURNAL);
  const key = 'IG-S08/synthetic/busy-worker';
  const run = await recoveryScenario({ host: host, file: file, key: key, heartbeatMs: 400, noEngine: true });
  const judged = judgeRecovery(run, { guardMs: 1500, minHeartbeats: 2 });
  return Object.assign(judged, { journal: SYNTHETIC_JOURNAL, journalSha256: sha(run.text), guardMs: 1500, heartbeatMs: 400 });
}

async function prepare(ctx) {
  const host = ctx.host;
  const out = { catalogue: null, probe: null, calibration: null, engineChecks: null, synthetic: null, failure: null,
    notes: [PRE_MS07] };
  // The tail command is the observation window: no probe, no check, no test (they ran in the control command).
  if (!ctx.shard || ctx.shard.shard !== PLAN.CONTROL_SHARD) return out;
  const IG02 = require('./ig02-run.cjs');
  const IG04 = require('./ig04-run.cjs');
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
  const cal = await IG04.workerCall(host, { role: 'request', adapterIds: [], noEngine: true },
    { kind: 'ig08-calibrate', options: { iterations: 50000, repeats: 3 } }, ['decision'], 30000);
  out.calibration = cal.reply ? Object.assign({ wallMs: cal.wallMs, cpuMs: cal.cpuMs }, cal.reply.costs) : null;
  if (out.calibration === null) out.notes.push('instrument calibration failed: ' + (cal.error ? cal.error.message : 'no reply'));
  calibrations.set(host, out.calibration);

  const tests = require('./ig08-test.cjs');
  const checks = await tests.engineChecks({ host: host, workerCall: IG04.workerCall });
  const failedChecks = checks.results.filter(function (r) { return !r.ok; });
  out.engineChecks = { ok: failedChecks.length === 0, passed: checks.results.length - failedChecks.length,
    total: checks.results.length, workerWallMs: checks.wallMs, workerCpuMs: checks.cpuMs, results: checks.results };
  out.notes.push('engine checks of the instrument (real engine, first command): ' + out.engineChecks.passed + '/' +
    out.engineChecks.total + ' passed');
  if (failedChecks.length > 0) {
    out.failure = { code: 'instrument-checks-failed', message: 'engine checks of the instrument failed: ' +
      failedChecks.map(function (r) { return r.id; }).join(', ') };
    return out;
  }

  const rec = await syntheticRecovery(ctx);
  out.synthetic = rec;
  const failedRec = rec.checks.filter(function (c) { return !c.ok; });
  out.notes.push('synthetic short-timeout journal recovery test (busy worker, test-only host): ' + (rec.checks.length - failedRec.length) +
    '/' + rec.checks.length + ' passed');
  if (failedRec.length > 0) {
    out.failure = { code: 'journal-recovery-failed', message: 'the synthetic journal recovery test failed: ' +
      failedRec.map(function (c) { return c.id; }).join(', ') };
  }
  return out;
}

// --- run.cjs hooks: execute ------------------------------------------------------------------------------------------------------

async function execute(ctx) {
  const job = ctx.job;
  if (job.executor !== 'jigsaw') throw new HarnessError('plan-missing', 'no executor ' + job.executor);
  const journal = new StageJournal(C.DEFAULT_REPO_ROOT, path.join(ctx.attemptDir, STAGE_JOURNAL));
  try {
    const obs = await withBeacon(ctx.host, { key: job.key, journal: journal, heartbeatMs: HEARTBEAT_MS }, function () {
      return ctx.host.runRequest({ key: job.key, kind: 'ig08-jigsaw-request', request: job.request, adapterIds: job.adapterIds,
        guardScope: job.guardScope, wantCatalogue: ctx.catalogue === null, readyCheck: ctx.readyCheck });
    });
    obs.calibration = calibrations.get(ctx.host) || null;
    return obs;
  } finally {
    journal.close();
  }
}

// --- record additions --------------------------------------------------------------------------------------------------------------

function clean(value) {
  return JSON.parse(JSON.stringify(value));
}

/** What the beacon recorded must be self-consistent when the request ended by itself; a censored one is never judged by it. */
function beaconProblems(rc, attribution, obs) {
  const problems = [];
  if (obs.outcome !== 'complete' && obs.outcome !== 'error') return problems;
  if (rc.final === null) problems.push('no final read of the shared memory');
  if (attribution === null) {
    problems.push('no attribution');
    return problems;
  }
  if (attribution.state !== 'finished' && attribution.state !== 'finished-with-error') {
    problems.push('the beacon did not finish: ' + attribution.state);
  }
  const opened = rc.stages.length;
  const closed = rc.stages.filter(function (s) { return s.closed; }).length;
  if (opened !== closed) problems.push('stages opened ' + opened + ', closed ' + closed);
  if (rc.final && rc.final.snapshot.header.depth !== 0) problems.push('frames left open: ' + rc.final.snapshot.header.depth);
  if (rc.workerEnd && rc.workerEnd.restore && rc.workerEnd.restore.restored !== true) problems.push('the hooks were not restored');
  return problems;
}

function augmentRecord(rec, job, obs, io) {
  rec.solverMode = job.solverMode;
  rec.poolWidth = 1;
  rec.cellKind = job.cellKind;
  rec.preMs07 = true;
  rec.limitOrigin = job.guardScope === 'jigsaw' ?
    'research safety guard (Jigsaw diagnostic 240 s, or the command window if smaller); an observed request is an attribution run, not a timing run' :
    'research safety guard (request 180 s); an observed request is an attribution run, not a timing run';
  if (job.executor !== 'jigsaw') return;
  const file = path.join(io.attemptDir, STAGE_JOURNAL);
  const text = io.journalText !== undefined ? io.journalText : fs.readFileSync(file, 'utf8');
  const parsed = P.parseJournal(text);
  const rc = P.reconcileJournal(parsed.entries, job.key);
  const full = attributionOf(rc);
  const a = full.attribution;
  const own = text.split(/\r?\n/).filter(function (line) { return line.indexOf('"key":"' + job.key + '"') >= 0; });
  const censored = obs.outcome === 'request-timeout';
  rec.censored = censored;
  rec.stageJournal = { file: STAGE_JOURNAL, lines: rc.lines, sha256OfItsLines: sha(own.join('\r\n')) };
  rec.jigsaw = clean({
    schema: 'ig-s08-attribution/1', preMs07: true, evidenceStatus: C.EVIDENCE_PROVISIONAL, source: full.source,
    attributedAtRelMs: full.atRelMs, outcome: obs.outcome, censored: censored, timeoutScope: obs.timeoutScope,
    limitAppliedMs: obs.guard ? obs.guard.deadlineAt : null, guardMs: obs.guard ? obs.guard.guardMs : null,
    guardScope: obs.guard ? obs.guard.scope : null, commandWindowRemainingAtSpawnMs: rc.spawn ? rc.spawn.commandWindowRemainingMs : null,
    attribution: a, markerAgreement: agreement(rc, a), reconcile: reconcileSummary(rc, parsed), unknownCounters: UNKNOWN_COUNTERS,
    workerEnd: rc.workerEnd ? { restore: rc.workerEnd.restore, runMs: rc.workerEnd.runMs, ok: rc.workerEnd.ok, stats: rc.workerEnd.stats,
      runError: rc.workerEnd.runError } : null,
    calibration: obs.calibration || null
  });
  const problems = beaconProblems(rc, a, obs);
  rec.beaconProblems = problems;
  if (problems.length > 0) rec.identityViolation = 'beacon-inconsistent: ' + problems.slice(0, 3).join('; ');
  if (censored) {
    const g = rec.generation;
    rec.censoredLowerBound = clean({ wallMs: g.coldWallMs, cpuToTimeoutMs: g.cpuToDecisionMs, cpuTotalMs: g.cpuTotalMs,
      limitAppliedMs: obs.guard ? obs.guard.deadlineAt : null, scope: obs.timeoutScope,
      note: 'a lower bound: the request had not ended at this limit; not a completed latency, not a pass, and no evidence that a ' +
        'specific S7 ceiling is safe' });
  }
  if (a) {
    // the DFS node and check counters are observed; every other count of the record stays unknown (null), never zero
    rec.counts = Object.assign(rec.counts, { dfsEntries: a.counters.totals.dfsNodes, dfsChecks: a.counters.totals.dfsChecks });
  }
}

// --- identity against the native control ---------------------------------------------------------------------------------------------

function identity(records) {
  const pairs = [];
  const ref = records.find(function (r) { return r.shard === PLAN.CONTROL_SHARD && r.arm === 'reference'; });
  const proto = records.find(function (r) { return r.shard === PLAN.CONTROL_SHARD && r.arm === 'prototype'; });
  if (proto && proto.outcome !== 'unstarted') {
    if (!ref || ref.outcome !== 'complete' || proto.outcome !== 'complete' || !ref.digests || !proto.digests) {
      pairs.push({ pairId: proto.key, verdict: 'not-comparable', problems: ['the native or the observed control did not complete'] });
    } else {
      const diff = R.compareDigests(ref.digests, proto.digests);
      const problems = [];
      if (!diff.equal) problems.push('digests differ in: ' + diff.differing.join(', '));
      if (ref.claimedExact !== proto.claimedExact) problems.push('claimed exact differs from the native control');
      if (proto.claimedExact === true && proto.verifiedExact !== true) problems.push('false exact flag');
      pairs.push({ pairId: proto.key, comparator: ref.key, verdict: problems.length === 0 ? 'identity-ok' : 'identity-failed',
        problems: problems, differing: diff.differing, puzzleHash: proto.puzzleHash, comparatorPuzzleHash: ref.puzzleHash,
        observedDigest: proto.digests.all, comparatorDigest: ref.digests.all });
    }
  }
  records.filter(function (r) { return r.shard === PLAN.TAIL_SHARD && r.arm === 'prototype' && r.outcome !== 'unstarted'; })
    .forEach(function (r) {
      pairs.push({ pairId: r.key, verdict: 'not-comparable', problems: ['no comparator: the historical 325.313 s request was ' +
        'not retained and an uncensored native request of this length is not run (it would exceed the 300 s command ceiling)'] });
    });
  const count = function (v) { return pairs.filter(function (p) { return p.verdict === v; }).length; };
  return { pairs: pairs, failed: count('identity-failed'), ok: count('identity-ok'), notComparable: count('not-comparable'),
    deferred: 0, complete: pairs.length > 0 && count('identity-ok') === pairs.length };
}

// --- shard summary -------------------------------------------------------------------------------------------------------------------------

function compactView(rec) {
  const j = rec.jigsaw;
  if (!j) return { key: rec.key, outcome: rec.outcome, jigsaw: null };
  const a = j.attribution;
  const g = rec.generation;
  return { key: rec.key, outcome: rec.outcome, censored: j.censored, timeoutScope: j.timeoutScope, limitAppliedMs: j.limitAppliedMs,
    guardMs: j.guardMs, coldWallMs: g.coldWallMs, readyWallMs: g.readyWallMs, cpuToDecisionMs: g.cpuToDecisionMs,
    cpuTotalMs: g.cpuTotalMs, source: j.source, markerAgreement: j.markerAgreement,
    current: a ? a.current : null, stages: a ? a.stages.map(function (s) {
      return { stage: s.stage, wallMsLowerBound: s.wallMsLowerBound, share: s.share, counters: s.counters };
    }) : null,
    finderGroups: a ? a.finderGroups : null, layout: a ? a.layout : null, totals: a ? a.counters.totals : null,
    beaconObservedMs: a ? a.beaconObservedMs : null, problems: rec.beaconProblems };
}

/** The overhead of the observation on the control: n = 1, so one ratio and the operation-count estimate beside it. */
function overheadOf(ref, proto, calibration) {
  if (!ref || !proto || ref.outcome !== 'complete' || proto.outcome !== 'complete') return null;
  const ratio = function (a, b) { return a !== null && b !== null && b > 0 ? a / b : null; };
  const out = { n: 1, readyWallFactor: ratio(proto.generation.readyWallMs, ref.generation.readyWallMs),
    coldWallFactor: ratio(proto.generation.coldWallMs, ref.generation.coldWallMs),
    cpuFactor: R.usable(proto.generation.cpuResolutionStatus) && R.usable(ref.generation.cpuResolutionStatus) ?
      ratio(proto.generation.cpuTotalMs, ref.generation.cpuTotalMs) : null,
    note: 'one pair of requests, time-separated: a single ratio, not a distribution; the profiled request is an attribution run, ' +
      'never a timing run', estimate: null };
  const a = proto.jigsaw && proto.jigsaw.attribution ? proto.jigsaw.attribution : null;
  if (a && calibration && Number.isFinite(calibration.enterLeavePairNs)) {
    const spans = a.contexts.reduce(function (s, c) {
      return s + c.bySub.reduce(function (t, b) { return t + b.calls; }, 0);
    }, 0);
    const t = a.counters.totals;
    const increments = t.dfsNodes + t.dfsChecks + t.dfsBacktracks + t.gridSearches + t.gridRestarts;
    const posted = a.markers ? a.markers.posted : 0;
    const ms = (spans * calibration.enterLeavePairNs + increments * calibration.counterIncrementNs +
      posted * calibration.markerPostNs) / 1e6;
    out.estimate = { spans: spans, counterIncrements: increments, markersPosted: posted, estimatedMs: ms,
      shareOfObservedWall: a.beaconObservedMs > 0 ? ms / a.beaconObservedMs : null,
      note: 'calibrated unit costs times the operations the beacon counted: an estimate, never a correction' };
  }
  return out;
}

function summary(ctx) {
  const prepared = ctx.prepared;
  const rows = ctx.mergedRecords || ctx.records;
  const ref = rows.find(function (r) { return r.arm === 'reference'; }) || null;
  const proto = rows.find(function (r) { return r.arm === 'prototype'; }) || null;
  return {
    estimateVerdict: 'attribution only (pre-MS07, provisional (pre-freeze)); a censored request is a lower bound, never a ' +
      'completed latency or a pass',
    exclusions: ['an observed request is an attribution run, not a timing run: its wall time is never a before/after figure',
      'the catalogue probe, the calibration, the engine checks, the synthetic recovery test and the independent audit are outside ' +
        'every generation time',
      'the historical 325.313 s Jigsaw request (I5, seed 1111) is not remeasured to completion: the command ceiling is 300 s'],
    extra: {
      label: PRE_MS07,
      provenance: PROVENANCE,
      arms: { prototype: 'observed native request (adapter jigsaw-profile, beacon installed for the one pipeline call)',
        reference: 'unobserved native request (the unchanged host path), control only' },
      identity: ctx.parity,
      observations: rows.filter(function (r) { return r.arm === 'prototype'; }).map(compactView),
      overhead: overheadOf(ref, proto, prepared ? prepared.calibration : null),
      calibration: prepared ? prepared.calibration : null,
      engineChecks: prepared && prepared.engineChecks ? { passed: prepared.engineChecks.passed, total: prepared.engineChecks.total,
        results: prepared.engineChecks.results.map(function (r) { return { id: r.id, ok: r.ok, detail: r.ok ? null : r.detail }; }) } : null,
      syntheticRecovery: prepared && prepared.synthetic ? prepared.synthetic : null,
      catalogueProbe: prepared ? prepared.probe : null,
      unknownCounters: UNKNOWN_COUNTERS,
      chain: ctx.chainInfo
    }
  };
}

module.exports = { TASK, STAGE_JOURNAL, SYNTHETIC_JOURNAL, HEARTBEAT_MS, PRE_MS07, PROVENANCE, UNKNOWN_COUNTERS, StageJournal, Recorder,
  withBeacon, attributionOf, agreement, reconcileSummary, recoveryScenario, judgeRecovery, syntheticRecovery, prepare, execute,
  augmentRecord, identity, summary, compactView, overheadOf, beaconProblems, testHost };
