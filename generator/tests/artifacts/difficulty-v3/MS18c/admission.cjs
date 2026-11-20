'use strict';

/*
 * MS18c Stage 3 task-owned PURE admission logic of the GQ launcher (policy MS18c-GQ-host-active),
 * adapted from MS18b's admission.cjs (which it does not modify) with the Stage 2 changes: the host
 * is the manifest's full tuple (.NET StartTime and CIM UTC microseconds compared independently,
 * ProcessName ignored), a readiness timeout is its own unstarted hold, and the result says which KIND
 * of hold it is, so that only a verified unstarted additional-consumer hold is ever eligible for the
 * one 60 s re-ask.
 *
 * The raw strict screen (five one-second CPU intervals, mean <= 0.5 and max <= 1.0 busy logical
 * cores, no foreign timing lock, our lock naming this run) is ALWAYS evaluated and kept as `ready`,
 * and is never turned true to launch; `admitted` is the named policy's own verdict: confirmed host,
 * valid counters, valid locks before the sampling and again immediately before the payload, two valid
 * process snapshots, and no other process gaining 0.5 CPU-s per elapsed second (no OS-service,
 * all-copilot or host-tree exemption; no CPU is subtracted).
 */
const host = require('./host.cjs');

const POLICY = 'MS18c-GQ-host-active';
const LABEL = 'shared-slot, CLI-host-active; not strict-quiet-machine timing';
const SCREEN = Object.freeze({ intervals: 5, intervalMs: 1000, meanMax: 0.5, peakMax: 1.0 });
const CONSUMER_LIMIT = 0.5;

const finite = (x) => typeof x === 'number' && Number.isFinite(x);

/** The original strict verdict: locks, five valid intervals, mean and maximum thresholds. */
function strictOf(facts) {
  const reasons = [];
  if (facts.locks.foreign.present) reasons.push('a foreign dv3-timing.lock is present');
  if (!facts.locks.own.matchesRun) reasons.push('our dv3-sudoku.lock is missing or names another run');
  const cores = facts.intervals.map((interval) => interval.busyCores);
  const valid = cores.length === SCREEN.intervals && cores.every(finite);
  let mean = null;
  let max = null;
  if (!valid) {
    reasons.push('a CPU counter interval is unavailable or invalid (read as not ready, never as idle)');
  } else {
    mean = cores.reduce((a, b) => a + b, 0) / cores.length;
    max = Math.max.apply(null, cores);
    if (mean > SCREEN.meanMax) {
      reasons.push('mean ' + mean.toFixed(3) + ' busy cores is above ' + SCREEN.meanMax);
    }
    if (max > SCREEN.peakMax) {
      reasons.push('maximum ' + max.toFixed(3) + ' busy cores is above ' + SCREEN.peakMax);
    }
  }
  return { ready: reasons.length === 0, meanBusyCores: mean, maxBusyCores: max, reasons: reasons,
    countersValid: valid };
}

/**
 * The CPU deltas of two process snapshots { mid, start, processes: [{pid, ppid, created (UTC
 * microseconds), cpu (seconds), name}] }. An instance is a pid with its creation time; one only in
 * the second snapshot and created after the first one began is counted from its creation.
 * `launchPids` is the identified instrumentation (the launcher, its ancestors up to the host, the
 * sampler shells), `expectedHost` the manifest's host object.
 */
function deltasOf(a, b, launchPids, expectedHost) {
  if (!a || !b || !Array.isArray(a.processes) || !Array.isArray(b.processes)) return null;
  const seconds = (b.mid - a.mid) / 1000;
  const key = (p) => p.pid + '|' + p.created;
  const before = new Map(a.processes.map((p) => [key(p), p]));
  const out = { windowSeconds: seconds, deltas: [], unobservable: 0, unmatched: 0, hostInA: false,
    hostInB: false, hostDelta: null };
  const isHost = (p) => host.isHostInstance(expectedHost, p.pid, p.created);
  b.processes.forEach((now) => {
    const was = before.get(key(now));
    const hostNow = typeof now.created === 'string' && isHost(now);
    if (hostNow) out.hostInB = true;
    let cpu = null;
    let fresh = false;
    if (was) {
      cpu = finite(now.cpu) && finite(was.cpu) ? now.cpu - was.cpu : null;
    } else if (now.created && Date.parse(now.created) > a.start) {
      cpu = finite(now.cpu) ? now.cpu : null;
      fresh = true;
    } else {
      out.unmatched++;
      return;
    }
    if (cpu === null) out.unobservable++;
    const delta = { pid: now.pid, name: now.name, created: now.created, cpuSeconds: cpu, newInWindow: fresh,
      isHost: hostNow, idle: now.pid === 0, launchChain: launchPids.has(now.pid) };
    delta.perSecond = cpu !== null && seconds > 0 ? cpu / seconds : null;
    out.deltas.push(delta);
    if (hostNow && was) out.hostDelta = { cpuSeconds: cpu, perSecond: delta.perSecond };
  });
  out.hostInA = a.processes.some((p) => typeof p.created === 'string' && isHost(p));
  return out;
}

/**
 * facts: { policy, locks: { foreign: {present}, own: {matchesRun} }, lockRecheck (the same shape, taken
 * immediately before the payload) | null, intervals: [{busyCores}], host: { expected, observed },
 * window: deltasOf(...) | null, timeouts: [text] (queries that exceeded their cap or the cumulative
 * budget) }. Returns
 * { policy, strict, admitted, eligible, kind, holds: [text], heldBy: [{ kind, text }], reason }.
 */
function evaluate(facts) {
  const strict = strictOf(facts);
  const held = [];
  const hold = (kind, text) => held.push({ kind: kind, text: text });
  if (facts.policy !== POLICY) hold('policy', 'unknown admission policy ' + facts.policy);
  (facts.timeouts || []).forEach((t) => hold('timeout', 'readiness timeout: ' + t));
  if (facts.locks.foreign.present) hold('lock', 'a foreign dv3-timing.lock was present at the start');
  if (!facts.locks.own.matchesRun) hold('lock', 'our dv3-sudoku.lock was missing or named another run');
  if (!strict.countersValid) hold('counters', 'the aggregate CPU counters were unavailable or invalid');
  const again = facts.lockRecheck;
  if (!again) {
    hold('lock', 'the lock state was not rechecked immediately before the payload');
  } else {
    if (again.foreign.present) hold('lock', 'a foreign dv3-timing.lock appeared before the payload');
    if (!again.own.matchesRun) hold('lock', 'our dv3-sudoku.lock was gone or changed before the payload');
  }
  host.hostProblems(facts.host && facts.host.expected, facts.host && facts.host.observed)
    .forEach((p) => hold('host', p));
  const w = facts.window;
  if (!w || !(w.windowSeconds > 0)) {
    hold('snapshot', 'the process snapshots are unavailable or their window is not positive');
  } else {
    if (!w.hostInA || !w.hostInB) {
      hold('host', 'the host was not the same instance in both process snapshots');
    }
    if (!w.hostDelta || !finite(w.hostDelta.cpuSeconds)) {
      hold('snapshot', 'no usable CPU observation of the host');
    }
    w.deltas.forEach((d) => {
      if (d.isHost || d.idle || d.launchChain || !finite(d.cpuSeconds)) return;
      if (d.cpuSeconds / w.windowSeconds >= CONSUMER_LIMIT) {
        hold('consumer', 'another process (' + d.name + ', PID ' + d.pid + ') gained ' +
          d.cpuSeconds.toFixed(2) +
          ' CPU-s in ' + w.windowSeconds.toFixed(2) + ' s (' + (d.cpuSeconds / w.windowSeconds).toFixed(2) +
          ' per second, limit ' + CONSUMER_LIMIT + ')');
      }
    });
  }
  const admitted = held.length === 0;
  const kinds = Array.from(new Set(held.map((h) => h.kind)));
  const eligible = !admitted && kinds.length === 1 && kinds[0] === 'consumer';
  return {
    policy: facts.policy, strict: strict, admitted: admitted, eligible: eligible,
    kind: admitted ? null : (kinds.length === 1 ? (kinds[0] === 'consumer' ? 'additional-consumer' : kinds[0])
      : 'mixed'),
    holds: held.map((h) => h.text), heldBy: held,
    reason: admitted ? 'every admission condition of ' + POLICY + ' holds; the strict screen ' +
      (strict.ready ? 'passed' : 'FAILED') + ' and is recorded unchanged' : held.map((h) => h.text).join('; ')
  };
}

module.exports = { POLICY, LABEL, SCREEN, CONSUMER_LIMIT, strictOf, deltasOf, evaluate };
