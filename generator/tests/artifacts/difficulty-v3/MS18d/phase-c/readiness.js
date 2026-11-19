'use strict';

/*
 * MS18d Phase C1 task-owned: the READINESS RUN of policy A (`MS18d-GP-host-active`), made by the controller
 * inside the held lock, after the plan, attempt and source checks and before the final lock recheck and the
 * payload. The facts come through `io`, so the real machine and the stand-ins use the same code; the
 * decisions are readiness-core.js's pure functions, which the merger re-runs over the retained raw data.
 *
 * In order (SA1 C1, pack section C1):
 *   1. the host binding in force is the last entry of the COMMITTED host-binding journal at the admitted
 *      HEAD (journals.js; the controller reads it): an empty or invalid journal, a policy other than A or a
 *      missing probe is a hold, never a guess and never a fall-back to a host approved earlier;
 *   2. ONE bounded (<= 15 s) probe snapshot (readiness-probe.ps1: the host facts and the process table with
 *      cumulative CPU times, each process told apart by PID plus creation time);
 *   3. five one-second aggregate intervals from six readings of the real cumulative counters of os.cpus()
 *      taken IN-PROCESS (timers only: no subprocess, file or query inside the window); logical processor
 *      count, raw busy cores, mean/max and timestamps are recorded;
 *   4. ONE more bounded snapshot;
 *   5. readiness-core.js decides: `ready` (raw strict screen) is kept apart from `admitted`.
 * The whole readiness has at most 45 s (each query at most 15 s, and never more than what is left); any
 * query that fails or times out, any unusable fact, is a hold that is not an eligible re-ask. The tooling
 * never rebinds to a new host instance on its own.
 *
 * Returns { record, before, after, decision }: `record` is readiness.json (inputs, references, decision),
 * `before` and `after` the raw snapshots (readiness-before.json, readiness-after.json). Dormant until the
 * controller calls it: nothing here runs at require time.
 */
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('./readiness-core.js');

const SCHEMA = 'ms18d-c-readiness-record-1';

/**
 * Whether the run must have a readiness record: every real recorder run, any run that carries a readiness
 * configuration, and (a stand-in's knob, to test the hold) a stand-in that asks for it.
 */
function readinessRequired(request, payload) {
  return (payload.type === 'gp-recorder' && request.standin !== true) || !!request.readiness ||
    (request.standin === true && request.requireReadiness === true);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The real facts: the clock, the counters of os.cpus() and the bounded PowerShell probe. */
function realIo(config, hostPid) {
  return {
    nowMs: () => Date.now(),
    async sampleIntervals() {
      const readings = [];
      const startedAtMs = Date.now();
      const first = process.hrtime.bigint();
      for (let k = 0; k <= core.LIMITS.intervalCount; k++) {
        if (k > 0) {
          const due = Number(first) / 1e6 + k * core.LIMITS.intervalMs;
          const wait = due - Number(process.hrtime.bigint()) / 1e6;
          if (wait > 0) await sleep(wait);
        }
        readings.push({ atMs: Date.now(), hrNs: Number(process.hrtime.bigint()),
          cpus: os.cpus().map((c) => ({ user: c.times.user, nice: c.times.nice, sys: c.times.sys,
            idle: c.times.idle, irq: c.times.irq })) });
      }
      return { readings, startedAtMs, endedAtMs: Date.now() };
    },
    takeSnapshot(timeoutMs) {
      const t0 = Date.now();
      const seconds = Math.max(1, Math.min(15, Math.floor(timeoutMs / 1000)));
      const run = childProcess.spawnSync(config.powershell, ['-NoProfile', '-NonInteractive', '-File',
        config.probeScript, '-Action', 'snapshot', '-HostPid', String(hostPid), '-TimeoutSeconds',
        String(seconds)], { encoding: 'utf8', timeout: timeoutMs, maxBuffer: 128 * 1024 * 1024,
        windowsHide: true });
      const durationMs = Date.now() - t0;
      const lost = run.error ? { ok: false, timedOut: run.error.code === 'ETIMEDOUT',
        error: String(run.error.message) } : null;
      if (lost) return Object.assign({ durationMs, data: null }, lost);
      if (run.status !== 0) {
        return { ok: false, timedOut: false, durationMs, data: null,
          error: 'the probe exited ' + run.status + ': ' + String(run.stderr || '').trim() };
      }
      try {
        const data = JSON.parse(run.stdout);
        return { ok: data.ok === true, timedOut: false, durationMs, data,
          error: data.ok === true ? null : String(data.error || 'the snapshot is not ok') };
      } catch (err) {
        return { ok: false, timedOut: false, durationMs, data: null,
          error: 'the probe output is not JSON: ' + err.message };
      }
    }
  };
}

/** A stand-in's facts, read from a fixture file (request.standin only): every number is the test's own. */
function fixtureIo(file) {
  const f = JSON.parse(fs.readFileSync(file, 'utf8'));
  let calls = 0;
  let snaps = 0;
  const base = Date.now();
  return {
    nowMs: () => (calls++ === 0 ? base : base + (f.elapsedMs === undefined ? 8000 : f.elapsedMs)),
    async sampleIntervals() {
      if (f.sampleThrows) throw new Error('the counters could not be read');
      if (f.sleepMs) await sleep(f.sleepMs);
      return { readings: f.readings, startedAtMs: base, endedAtMs: base + 5000 };
    },
    takeSnapshot() {
      const i = snaps++;
      const q = (f.queries && f.queries[i]) || {};
      const data = f.snapshots ? f.snapshots[i] : null;
      return { ok: q.ok !== false && !!data, timedOut: q.timedOut === true,
        error: q.ok === false || !data ? (q.error || 'the fixture has no snapshot') : null,
        durationMs: q.durationMs === undefined ? 600 : q.durationMs, data: q.ok === false ? null : data };
    }
  };
}

const rowOf = (snap, pid) => ((snap && snap.processes) || []).filter((p) => p.pid === pid)[0] || null;

/** The processes of this run, by PID plus creation time seen in BOTH snapshots (a reused PID is not ours). */
function ownedProcesses(request, controllerPid, before, after) {
  const owned = [];
  [['wrapper', request.wrapperPid], ['controller', controllerPid]].forEach(([role, pid]) => {
    const a = rowOf(before, pid);
    const b = rowOf(after, pid);
    if (a && b && a.createdMs === b.createdMs && Number.isFinite(a.createdMs)) {
      owned.push({ role, pid, createdMs: a.createdMs });
    }
  });
  [before, after].forEach((s) => {
    if (s && Number.isFinite(s.selfPid) && Number.isFinite(s.selfCreatedMs)) {
      owned.push({ role: 'readiness-probe', pid: s.selfPid, createdMs: s.selfCreatedMs });
    }
  });
  return owned;
}

/**
 * The readiness of one run. `binding` is the host binding in force (journals.hostBindingState: the last entry
 * of the COMMITTED host-binding journal at the admitted HEAD, or no binding at all); `request.readiness` =
 * { powershell, probeScript, logicalCpus, fixture? } (a fixture only for a stand-in); `request.policy` /
 * `request.readiness.policy` is the S-OD15 record. Never throws for a fact it cannot get: that is a hold with
 * its reasons. No binding (an empty or invalid journal) is a hold; nothing falls back to another host.
 */
async function runReadiness({ request, controllerPid, requestedAtMs, io: injected, binding: given }) {
  const requested = request.readiness || {};
  const policy = requested.policy || request.policy || null;
  const startedAtMs = Date.now();
  const hold = (kind, text, extra) => Object.assign({ kind, text }, extra || {});
  const early = [];
  let config = requested;
  if (request.standin !== true) {
    // a real run takes the frozen probe and processor count, whatever the request carries
    const machine = request.expected && request.expected.machine;
    config = { powershell: requested.powershell, probeScript: path.join(__dirname, 'readiness-probe.ps1'),
      logicalCpus: machine ? machine.logicalProcessors : null, policy };
    ['probeScript', 'logicalCpus'].forEach((k) => {
      if (String(requested[k]).toLowerCase() !== String(config[k]).toLowerCase()) {
        early.push(hold('policy', 'the readiness ' + k + ' of the request is not the frozen one'));
      }
    });
    if (requested.fixture) early.push(hold('policy', 'a readiness fixture is for stand-ins only'));
  }
  const binding = given || { ok: false, current: null, expected: null, reference: null,
    problems: ['no host binding was read'] };
  if (!binding.ok) binding.problems.forEach((t) => early.push(hold('host', t)));
  if (!Number.isInteger(config.logicalCpus) || config.logicalCpus <= 0) {
    early.push(hold('counter', 'the bound logical processor count is unusable'));
  }
  let io = injected || null;
  if (!io) {
    if (request.standin === true && config.fixture) io = fixtureIo(config.fixture);
    else if (!config.probeScript || !config.powershell) {
      early.push(hold('snapshot', 'no readiness probe is configured'));
    } else if (binding.ok) io = realIo(config, binding.expected.pid);
  }
  const source = binding.ok ? 'journal entry ' + binding.current.bindingId : null;
  const make = (parts) => {
    const decision = core.decideReadiness(Object.assign({ policy, expected: binding.expected,
      bindingSource: source, logicalCpus: config.logicalCpus }, parts.input));
    early.forEach((r) => {
      decision.reasons.unshift(r);
    });
    if (early.length > 0) {
      decision.complete = false;
      decision.admitted = false;
      decision.eligibleReAsk = false;
      decision.kind = 'hold';
    }
    return { decision, parts };
  };
  if (early.length > 0 || !io) {
    const made = make({ input: { readings: null, before: null, after: null, owned: [],
      budget: { elapsedMs: 0, queryDurationsMs: [] } } });
    return finish(made, request, startedAtMs, requestedAtMs, binding, null, null, [], null);
  }
  const t0 = io.nowMs();
  const left = () => core.LIMITS.totalBudgetMs - (io.nowMs() - t0);
  const queries = [];
  const first = io.takeSnapshot(Math.max(1000, Math.min(core.LIMITS.queryBudgetMs, left())));
  queries.push({ ok: first.ok, timedOut: first.timedOut, error: first.error, durationMs: first.durationMs });
  let sampled = null;
  let second = null;
  if (first.ok && left() > 0) {
    try {
      sampled = await io.sampleIntervals(config.logicalCpus);
    } catch (err) {
      sampled = null;
      early.push(hold('counter', 'the cumulative counters could not be read: ' + err.message));
    }
    if (sampled && left() > 1000) {
      second = io.takeSnapshot(Math.max(1000, Math.min(core.LIMITS.queryBudgetMs, left())));
      queries.push({ ok: second.ok, timedOut: second.timedOut, error: second.error,
        durationMs: second.durationMs });
    }
  }
  queries.forEach((q, i) => {
    if (!q.ok) early.push(hold(q.timedOut ? 'timeout' : 'snapshot', 'snapshot query ' + (i + 1) +
      (q.timedOut ? ' timed out' : ' failed') + (q.error ? ': ' + q.error : '')));
  });
  const before = first.ok ? first.data : null;
  const after = second && second.ok ? second.data : null;
  const owned = ownedProcesses(request, controllerPid, before, after);
  const elapsedMs = io.nowMs() - t0;
  const made = make({ input: { readings: sampled ? sampled.readings : null, before, after, owned,
    budget: { elapsedMs, queryDurationsMs: queries.map((q) => q.durationMs).concat(
      queries.length < 2 ? [null] : []).slice(0, 2) } } });
  return finish(made, request, startedAtMs, requestedAtMs, binding, before, after,
    sampled ? sampled.readings : null, queries);
}

function finish(made, request, startedAtMs, requestedAtMs, binding, before, after, readings, queries) {
  const { decision, parts } = made;
  const record = {
    schema: SCHEMA, policy: decision.policy, requestedAtMs: requestedAtMs || null, startedAtMs,
    endedAtMs: Date.now(), standin: request.standin === true,
    inputs: { expected: binding.expected, binding: binding.reference, bindingSource: decision.host.source,
      logicalCpus: decision.counters.logicalCpus, readings,
      owned: parts.input.owned, budget: parts.input.budget, queries },
    snapshots: { before: null, after: null },
    decision
  };
  return { record, before, after, decision };
}

module.exports = { SCHEMA, readinessRequired, runReadiness, realIo, fixtureIo, ownedProcesses };
