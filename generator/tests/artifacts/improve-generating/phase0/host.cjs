'use strict';

/*
 * Responsive request host. The host thread only supervises: each request runs in a fresh worker thread (a private
 * engine instance), so a busy or blocked solver never blocks the host's timers. CPU is read once, at the host, with
 * process.cpuUsage(), which already includes every worker thread; it is never summed over workers. One request at a
 * time, so no other experiment contaminates an interval. The host records the request, the engine-ready boundary,
 * startup, decision, cleanup and total as separate intervals and writes a timeout as a timeout with its actual CPU.
 */
const path = require('path');
const { Worker } = require('worker_threads');
const C = require('./common.cjs');
const R = require('./records.cjs');

const HarnessError = C.HarnessError;
const WORKER_FILE = path.join(__dirname, 'worker.cjs');
const TERMINATE_GUARD_MS = 5000;
const TERMINATE_TIMEOUT = 'terminate-timeout';

/** A CPU meter over process.cpuUsage (or a stand-in with the same shape), in milliseconds. */
function createCpuMeter(cpuUsage) {
  const read = typeof cpuUsage === 'function' ? cpuUsage : function () { return process.cpuUsage(); };
  return {
    api: 'process.cpuUsage (user+system of the host process, worker threads included; read once at the host)',
    readMs: function () {
      const u = read();
      return (u.user + u.system) / 1000;
    }
  };
}

/**
 * The observable resolution of the CPU API: how far a reading steps when it changes. Short intervals below this
 * quantum are unresolved and are aggregated, never turned into precise-looking numbers.
 */
function probeCpuResolution(meter, clock, options) {
  const maxWallMs = options && options.maxWallMs ? options.maxWallMs : 300;
  const wanted = options && options.changes ? options.changes : 7;
  const started = clock();
  let last = meter.readMs();
  const steps = [];
  while (clock() - started < maxWallMs && steps.length < wanted) {
    const v = meter.readMs();
    if (v !== last) {
      steps.push(v - last);
      last = v;
    }
  }
  // The first step began inside a quantum, so only the later ones are whole increments.
  const increments = steps.slice(1);
  const sorted = increments.slice().sort(function (a, b) { return a - b; });
  return {
    api: meter.api,
    probeWallMs: clock() - started,
    changesSeen: steps.length,
    incrementsMs: increments,
    minIncrementMs: sorted.length > 0 ? sorted[0] : null,
    quantumMs: sorted.length >= 2 ? sorted[Math.floor(sorted.length / 2)] : null
  };
}

/** The intervals of one request from the host's marks (ms), each independent of validation. */
function accountRequest(m, quantumMs, apiLabel) {
  const d = function (a, b) {
    return a === null || a === undefined || b === null || b === undefined ? null : b - a;
  };
  const cpuTotal = d(m.cpu0, m.cpuClean);
  return {
    readyWallMs: d(m.tReady, m.tDecision),
    coldWallMs: d(m.t0, m.tDecision),
    occupiedWallMs: d(m.t0, m.tClean),
    cpuToDecisionMs: d(m.cpu0, m.cpuDecision),
    cpuTotalMs: cpuTotal,
    cpuReadyTotalMs: d(m.cpuReady, m.cpuClean),
    startupMs: d(m.t0, m.tReady),
    startupCpuMs: d(m.cpu0, m.cpuReady),
    cleanupMs: d(m.tDecision, m.tClean),
    readyOccupiedWallMs: d(m.tReady, m.tClean),
    gridBuildWallMs: null,
    gridBuildCpuMs: null,
    cpuApi: apiLabel,
    cpuResolutionStatus: R.classifyCpu(cpuTotal, quantumMs),
    cleanupCpuMs: d(m.cpuDecision, m.cpuClean)
  };
}

function serialiseError(err) {
  if (err === null || err === undefined) return { code: null, name: null, message: String(err) };
  return {
    code: err.code === undefined ? null : err.code,
    name: err.name || null,
    message: String(err.message !== undefined ? err.message : err),
    work: err.work === undefined ? null : err.work
  };
}

const GUARD_KEYS = { request: 'requestMs', sample: 'sampleMs', jigsaw: 'jigsawMs' };

/** Events of one worker, each stamped with the host clock and CPU at the moment it arrived. */
class Channel {
  constructor(worker, host) {
    this.host = host;
    this.queue = [];
    this.wake = null;
    worker.on('message', (msg) => this.push({ kind: 'message', msg: msg }));
    worker.on('error', (err) => this.push({ kind: 'worker-error', error: serialiseError(err) }));
    worker.on('exit', (code) => this.push({ kind: 'exit', code: code }));
  }

  push(event) {
    const m = this.host.mark();
    event.t = m.t;
    event.cpu = m.cpu;
    this.queue.push(event);
    if (this.wake) {
      const wake = this.wake;
      this.wake = null;
      wake();
    }
  }

  /**
   * The next wanted message, a worker error/exit, or a timeout event. Anything that arrives after `deadlineAt`
   * (a decision included) is a timeout, never a result: the arrival time is the host's own stamp.
   */
  async next(types, deadlineAt, scope) {
    for (;;) {
      while (this.queue.length > 0) {
        const event = this.queue[0];
        const wanted = event.kind !== 'message' || types.indexOf(event.msg.type) >= 0;
        if (!wanted) {
          this.queue.shift();
          continue;
        }
        if (event.t > deadlineAt) {
          this.queue.shift();
          return { kind: 'timeout', scope: scope, late: true, t: event.t, cpu: event.cpu,
            arrived: event.kind === 'message' ? event.msg.type : event.kind };
        }
        if (event.kind !== 'message') return event;
        this.queue.shift();
        return event;
      }
      const remaining = deadlineAt - this.host.clock();
      if (remaining <= 0) {
        const m = this.host.mark();
        return { kind: 'timeout', scope: scope, late: false, t: m.t, cpu: m.cpu };
      }
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          this.wake = null;
          resolve();
        }, remaining);
        this.wake = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    }
  }
}

class Host {
  constructor(options) {
    this.repoRoot = options.repoRoot;
    this.runtimeFingerprint = options.runtimeFingerprint || null;
    this.testOnly = options.testOnly === true;
    this.guards = Object.assign({}, options.guards || C.GUARDS);
    if (!this.testOnly && C.canonicalJson(this.guards) !== C.canonicalJson(C.GUARDS)) {
      throw new HarnessError('guard-override-forbidden', 'only a test-only host may shorten a guard');
    }
    this.meter = options.meter || createCpuMeter();
    this.clock = options.clock || C.nowMs;
    this.workerFile = options.workerFile || WORKER_FILE;
    this.workerFactory = options.workerFactory || function (file, data) {
      return new Worker(file, { workerData: data });
    };
    this.terminateGuardMs = options.terminateGuardMs === undefined ? TERMINATE_GUARD_MS : options.terminateGuardMs;
    this.deadlineMs = options.deadlineMs === undefined ? this.guards.commandMs : options.deadlineMs;
    if (!this.testOnly && this.deadlineMs > C.GUARDS.commandMs) {
      throw new HarnessError('guard-override-forbidden', 'the command deadline is at most ' + C.GUARDS.commandMs);
    }
    // The deadline counts from the start of the process (what the wrapper's backstop counts from), not from the
    // moment this host was built after the sources were read and the firewall taken.
    const age = options.processAgeMs === undefined ? C.processAgeMs() : options.processAgeMs;
    this.processAgeMs = age;
    this.startedAt = this.clock() - age;
    this.cpuStartMs = this.meter.readMs();
    // New work stops at this time: what is left below the deadline is kept to terminate and write evidence.
    this.commandTimerAt = this.startedAt + this.deadlineMs - this.guards.finalizeReserveMs;
    this.workers = new Set();
    this.stopped = null;
    this.cpu = { api: this.meter.api, quantumMs: null, probe: null };
  }

  mark() {
    return { t: this.clock(), cpu: this.meter.readMs() };
  }

  calibrate() {
    const probe = probeCpuResolution(this.meter, this.clock);
    this.cpu = { api: this.meter.api, quantumMs: probe.quantumMs, probe: probe };
    return this.cpu;
  }

  remainingMs() {
    return this.commandTimerAt - this.clock();
  }

  expired() {
    return this.remainingMs() <= 0;
  }

  canAdmit(estimateMs) {
    return this.remainingMs() >= estimateMs + this.guards.startMarginMs;
  }

  commandCpuMs() {
    return this.meter.readMs() - this.cpuStartMs;
  }

  spawn(data) {
    const worker = this.workerFactory(this.workerFile,
      Object.assign({ repoRoot: this.repoRoot, testOnly: this.testOnly }, data));
    this.workers.add(worker);
    worker.once('exit', () => this.workers.delete(worker));
    return { worker: worker, channel: new Channel(worker, this) };
  }

  /**
   * Terminates one worker. When the worker does not stop within the guard it stays in `this.workers` (it is never
   * forgotten), the host stops accepting work and the caller reports it.
   */
  async terminateWorker(worker) {
    let guard = null;
    const limit = new Promise((resolve) => {
      guard = setTimeout(() => resolve(TERMINATE_TIMEOUT), this.terminateGuardMs);
    });
    let outcome = null;
    try {
      outcome = await Promise.race([worker.terminate(), limit]);
    } catch (err) {
      outcome = TERMINATE_TIMEOUT;
    } finally {
      clearTimeout(guard);
    }
    if (outcome === TERMINATE_TIMEOUT) {
      this.stopped = this.stopped || 'terminate-timeout';
      return { ok: false, reason: 'terminate-timeout' };
    }
    this.workers.delete(worker);
    return { ok: true, reason: null };
  }

  async terminateAll() {
    const results = await Promise.all(Array.from(this.workers).map((w) => this.terminateWorker(w)));
    return { ok: results.every((r) => r.ok), remaining: this.workers.size };
  }

  /**
   * One request in a fresh worker. The request guard and the command deadline are supervised from here; a request
   * that does not decide in time, or whose decision arrives after the deadline, is terminated and recorded as a
   * timeout, never as a result. `job.readyCheck(readyMessage)` may refuse the job before it is posted.
   */
  async runRequest(job) {
    const kind = job.kind || 'pipeline-request';
    if (kind.indexOf('selftest-') === 0 && !this.testOnly) {
      throw new HarnessError('test-only-leak', 'a synthetic job outside a test-only host');
    }
    if (this.stopped) throw new HarnessError('host-stopped', 'the host stopped: ' + this.stopped);
    const guardScope = job.guardScope || 'request';
    const guardMs = this.guards[GUARD_KEYS[guardScope]];
    const marks = { t0: null, cpu0: null, tReady: null, cpuReady: null, tDecision: null, cpuDecision: null,
      tClean: null, cpuClean: null };
    const start = this.mark();
    marks.t0 = start.t;
    marks.cpu0 = start.cpu;
    const requestAt = marks.t0 + guardMs;
    const deadlineAt = Math.min(requestAt, this.commandTimerAt);
    const scopeAtTimeout = requestAt <= this.commandTimerAt ? (guardScope === 'sample' ? 'sample' : 'request') :
      'command';
    const { worker, channel } = this.spawn({
      role: 'request', adapterIds: job.adapterIds || [], expectedFingerprint: this.runtimeFingerprint,
      noEngine: job.noEngine === true, wantCatalogue: job.wantCatalogue === true
    });
    const obs = { key: job.key, outcome: 'error', timeoutScope: null, wire: null, error: null, fatal: null,
      engineElapsedMs: null, ready: null, lateDecision: false, terminateFailure: null };
    let decided = null;
    try {
      const first = await channel.next(['ready', 'fatal'], deadlineAt, scopeAtTimeout);
      if (first.kind === 'message' && first.msg.type === 'ready') {
        marks.tReady = first.t;
        marks.cpuReady = first.cpu;
        obs.ready = first.msg;
        const refusal = typeof job.readyCheck === 'function' ? job.readyCheck(first.msg) : null;
        if (refusal) {
          decided = { kind: 'message', msg: { type: 'fatal', error: { code: refusal.code, name: null,
            message: refusal.message } }, t: first.t, cpu: first.cpu };
        } else {
          worker.postMessage({ type: 'job', job: { kind: kind, config: job.request, spinMs: job.spinMs || 0 } });
          decided = await channel.next(['decision', 'error', 'fatal'], deadlineAt, scopeAtTimeout);
        }
      } else {
        decided = first;
      }
      marks.tDecision = decided.t;
      marks.cpuDecision = decided.cpu;
      this.classify(decided, obs);
    } finally {
      const term = await this.terminateWorker(worker);
      if (!term.ok) obs.terminateFailure = term.reason;
      const end = this.mark();
      marks.tClean = end.t;
      marks.cpuClean = end.cpu;
    }
    obs.generation = accountRequest(marks, this.cpu.quantumMs, this.cpu.api);
    obs.guard = { scope: guardScope, guardMs: guardMs, deadlineAt: deadlineAt - marks.t0 };
    obs.testOnly = this.testOnly;
    return obs;
  }

  classify(event, obs) {
    if (event.kind === 'timeout') {
      obs.outcome = 'request-timeout';
      obs.timeoutScope = event.scope;
      obs.lateDecision = event.late === true;
      obs.error = { code: 'timeout', name: null, message: event.late === true ?
        'a ' + event.arrived + ' arrived after the ' + event.scope + ' deadline and was rejected' :
        'no decision before the ' + event.scope + ' guard' };
    } else if (event.kind === 'worker-error') {
      obs.error = Object.assign({}, event.error, { code: event.error.code || 'worker-error' });
    } else if (event.kind === 'exit') {
      obs.error = { code: 'worker-exited', name: null, message: 'the worker exited with code ' + event.code };
    } else if (event.msg.type === 'decision') {
      obs.outcome = 'complete';
      obs.wire = event.msg.wire;
      obs.engineElapsedMs = event.msg.engineElapsedMs === undefined ? null : event.msg.engineElapsedMs;
      obs.spinProof = event.msg.spinProof === undefined ? null : event.msg.spinProof;
    } else {
      obs.error = event.msg.error || { code: 'unknown', name: null, message: 'unknown worker message' };
      if (event.msg.type === 'fatal') obs.fatal = obs.error.code;
    }
  }

  /**
   * The independent audit after the timed interval: a separate, unpatched engine instance. Its wall and CPU are
   * reported on their own and never added to a generation time.
   */
  async runValidation(wire, context) {
    if (this.stopped) throw new HarnessError('host-stopped', 'the host stopped: ' + this.stopped);
    const start = this.mark();
    const guardMs = this.guards.validationMs;
    const deadlineAt = Math.min(start.t + guardMs, this.commandTimerAt);
    const scope = start.t + guardMs <= this.commandTimerAt ? 'request' : 'command';
    const { worker, channel } = this.spawn({
      role: 'verify', adapterIds: [], expectedFingerprint: this.runtimeFingerprint, noEngine: false,
      wantCatalogue: false
    });
    const out = { status: 'error', verdict: null, error: null, proof: null, terminateFailure: null };
    try {
      const first = await channel.next(['ready', 'fatal'], deadlineAt, scope);
      let last = first;
      if (first.kind === 'message' && first.msg.type === 'ready') {
        out.proof = first.msg.proof || null;
        worker.postMessage({ type: 'job', job: { kind: 'verify', wire: wire, level: context.level,
          validationMs: Math.max(1000, Math.floor(deadlineAt - this.clock())) } });
        last = await channel.next(['validation', 'fatal'], deadlineAt, scope);
      }
      if (last.kind === 'message' && last.msg.type === 'validation') {
        out.status = 'ok';
        out.verdict = last.msg.verdict;
      } else if (last.kind === 'timeout') {
        out.status = 'timeout';
        out.error = { code: 'timeout', message: 'validation did not finish before the ' + last.scope + ' guard' };
      } else {
        out.error = last.kind === 'message' ? last.msg.error : last.error ||
          { code: last.kind, message: 'verifier ' + last.kind };
      }
    } finally {
      const term = await this.terminateWorker(worker);
      if (!term.ok) out.terminateFailure = term.reason;
    }
    const end = this.mark();
    out.wallMs = end.t - start.t;
    out.cpuMs = end.cpu - start.cpu;
    out.cpuResolutionStatus = R.classifyCpu(out.cpuMs, this.cpu.quantumMs);
    return out;
  }
}

module.exports = {
  WORKER_FILE, TERMINATE_GUARD_MS, createCpuMeter, probeCpuResolution, accountRequest, serialiseError, Channel, Host
};
