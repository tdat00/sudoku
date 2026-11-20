'use strict';

/*
 * MS18a task-owned, PURE (no I/O) admission logic of the launch wrapper, the reporter and the no-generation
 * test. Policy MS18a-Q1-host-active (SA2's ruling of 2026-11-18, MS18a-Q1): the raw strict screen of the
 * check-list (five one-second host CPU intervals, mean <= 0.5 and max <= 1.0 busy logical cores, no foreign
 * timing lock, our lock naming the task) is ALWAYS evaluated and kept, and is never turned true to launch.
 * A separate `admitted` result lets a payload start although the strict screen failed, only when the named
 * session host is the confirmed instance and nothing else is running:
 *   - the policy name is exactly MS18a-Q1-host-active; our lock names the task, no foreign timing lock, at
 *     the start and again immediately before the payload;
 *   - the aggregate counters are valid (never read as idle);
 *   - the host (PID, exact creation time, parent PID, executable, CIM name) is the confirmed instance and is
 *     the same instance in both process snapshots, with a usable CPU observation;
 *   - both snapshots exist with a positive window, and no process other than the host, the idle process and
 *     the identified launch chain gained 0.5 CPU-seconds or more per elapsed second over that window.
 * No CPU is subtracted from the aggregate and no other copilot instance or process tree is exempt. An
 * unknown or contradicted fact is a hold with its reason.
 */
const POLICY = 'MS18a-Q1-host-active';
const LABEL = 'shared-slot, CLI-host-active; not strict-quiet-machine timing';
const SCREEN = { intervals: 5, intervalMs: 1000, meanMax: 0.5, peakMax: 1.0 };
const CONSUMER_LIMIT = 0.5;
// The orchestrator-confirmed host (relay of 2026-11-18, 17:50); the real runs pass it explicitly.
const HOST = {
  pid: 1968, name: 'copilot.exe', parent: 18780, created: '2026-11-13T19:26:33.6916441+07:00',
  exe: 'C:\\Users\\ledat\\AppData\\Local\\Microsoft\\WinGet\\Links\\copilot.exe'
};

const finite = (x) => typeof x === 'number' && Number.isFinite(x);

/** The original strict verdict, unchanged: locks, five valid intervals, mean and maximum thresholds. */
function strictOf(facts) {
  const reasons = [];
  if (facts.locks.foreign.present) reasons.push('a foreign dv3-timing.lock is present');
  if (!facts.locks.own.matchesTask) reasons.push('our dv3-sudoku.lock is missing or names another task');
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
 * The CPU deltas of two process snapshots {mid, start, processes: [{pid, ppid, created, cpu, name}]} (cpu in
 * seconds, null when unavailable; mid and start in milliseconds). An instance is a pid with its creation
 * time;
 * one that is only in the second snapshot and was created after the first one began is counted from its
 * creation (its whole CPU time). `launchPids` are the identified instrumentation (the launcher, its ancestors
 * up to the host, the sampler shells), `host` = { pid, createdCim } the confirmed host.
 */
function deltasOf(a, b, launchPids, host) {
  if (!a || !b || !Array.isArray(a.processes) || !Array.isArray(b.processes)) return null;
  const seconds = (b.mid - a.mid) / 1000;
  const key = (p) => p.pid + '|' + p.created;
  const before = new Map(a.processes.map((p) => [key(p), p]));
  const out = {
    windowSeconds: seconds, deltas: [], unobservable: 0, unmatched: 0, hostInA: false, hostInB: false,
    hostDelta: null
  };
  b.processes.forEach((now) => {
    const was = before.get(key(now));
    const isHost = now.pid === host.pid && typeof now.created === 'string' &&
      now.created.slice(0, 26) === host.createdCim.slice(0, 26);
    if (isHost) out.hostInB = true;
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
      isHost: isHost, idle: now.pid === 0, launchChain: launchPids.has(now.pid) };
    delta.perSecond = cpu !== null && seconds > 0 ? cpu / seconds : null;
    out.deltas.push(delta);
    if (isHost && was) out.hostDelta = { cpuSeconds: cpu, perSecond: delta.perSecond };
  });
  out.hostInA = a.processes.some((p) => p.pid === host.pid && typeof p.created === 'string' &&
    p.created.slice(0, 26) === host.createdCim.slice(0, 26));
  return out;
}

function hostHolds(facts) {
  const holds = [];
  const want = facts.host && facts.host.expected;
  const got = facts.host && facts.host.observed;
  if (!want) return ['no confirmed host identity was supplied'];
  if (!got) return ['the confirmed host (PID ' + want.pid + ') was not found'];
  if (got.pid !== want.pid) holds.push('host PID ' + got.pid + ' is not the confirmed ' + want.pid);
  if (got.created !== want.created) {
    holds.push('host creation time ' + got.created + ' is not the confirmed ' + want.created);
  }
  if (typeof got.cimCreated !== 'string' || got.cimCreated.slice(0, 26) !== want.created.slice(0, 26)) {
    holds.push('host CIM creation date ' + got.cimCreated + ' does not match the confirmed time');
  }
  if (got.cimParent !== want.parent) {
    holds.push('host parent ' + got.cimParent + ' is not the confirmed ' + want.parent);
  }
  if (String(got.cimExe).toLowerCase() !== String(want.exe).toLowerCase()) {
    holds.push('host executable ' + got.cimExe + ' is not the confirmed one');
  }
  if (String(got.cimName).toLowerCase() !== String(want.name).toLowerCase()) {
    holds.push('host name ' + got.cimName + ' is not the confirmed ' + want.name);
  }
  return holds;
}

/**
 * facts: { task, policy (null for the strict launcher), locks: { foreign: {present}, own: {matchesTask} },
 * lockRecheck (the same shape, taken immediately before the payload) | null, intervals: [{busyCores}], host:
 * { expected, observed }, window: deltasOf(...) | null }. Returns { policy, strict, admitted, holds,
 * reason }.
 */
function evaluate(facts) {
  const strict = strictOf(facts);
  const policy = facts.policy || null;
  if (policy === null) {
    return { policy: null, strict: strict, admitted: strict.ready, holds: strict.reasons,
      reason: strict.ready ? 'strict screen passed' : 'strict screen failed (no admission policy)' };
  }
  const holds = [];
  if (policy !== POLICY) holds.push('unknown admission policy ' + policy);
  if (facts.locks.foreign.present) holds.push('a foreign dv3-timing.lock was present at the start');
  if (!facts.locks.own.matchesTask) holds.push('our dv3-sudoku.lock was missing or named another task');
  if (!strict.countersValid) holds.push('the aggregate CPU counters were unavailable or invalid');
  const again = facts.lockRecheck;
  if (!again) {
    holds.push('the lock state was not rechecked immediately before the payload');
  } else {
    if (again.foreign.present) holds.push('a foreign dv3-timing.lock appeared before the payload');
    if (!again.own.matchesTask) holds.push('our dv3-sudoku.lock was gone or changed before the payload');
  }
  hostHolds(facts).forEach((h) => holds.push(h));
  const w = facts.window;
  if (!w || !(w.windowSeconds > 0)) {
    holds.push('the process snapshots are unavailable or their window is not positive');
  } else {
    if (!w.hostInA || !w.hostInB) holds.push('the host was not the same instance in both process snapshots');
    if (!w.hostDelta || !finite(w.hostDelta.cpuSeconds)) holds.push('no usable CPU observation of the host');
    w.deltas.forEach((d) => {
      if (d.isHost || d.idle || d.launchChain || !finite(d.cpuSeconds)) return;
      if (d.cpuSeconds / w.windowSeconds >= CONSUMER_LIMIT) {
        holds.push('another process (' + d.name + ', PID ' + d.pid + ') gained ' + d.cpuSeconds.toFixed(2) +
          ' CPU-s in ' + w.windowSeconds.toFixed(2) + ' s (' + (d.cpuSeconds / w.windowSeconds).toFixed(2) +
          ' per second, limit ' + CONSUMER_LIMIT + ')');
      }
    });
  }
  const admitted = holds.length === 0;
  return {
    policy: policy, strict: strict, admitted: admitted, holds: holds,
    reason: admitted ? 'every admission condition of ' + POLICY + ' holds; the strict screen ' +
      (strict.ready ? 'passed' : 'FAILED') + ' and is recorded unchanged' : holds.join('; ')
  };
}

/** The reporter's verdict of one readiness record: a payload exit 0 alone is never read as acceptable. */
function reportVerdict(record) {
  const no = (reason) => ({ ok: false, reason: reason });
  if (!record || typeof record !== 'object') return no('no readiness record');
  const exit = record.payloadExit === undefined ? null : record.payloadExit;
  if (record.policy === POLICY) {
    if (record.admitted !== true) {
      return no('not admitted under ' + POLICY + ': ' + (record.admissionHolds || []).join('; '));
    }
    if (record.environmentLabel !== LABEL) return no('the environment label is missing or changed');
    if (exit !== 0) return no('payload exit ' + exit);
    const strict = record.ready ? 'passed' : 'FAILED';
    return { ok: true, reason: 'admitted under ' + POLICY + '; strict screen ' + strict };
  }
  if (record.policy) return no('unknown admission policy ' + record.policy);
  if (record.ready !== true) return no('strict screen failed and no named admission policy');
  if (exit !== 0) return no('payload exit ' + exit);
  return { ok: true, reason: 'strict screen passed' };
}

module.exports = {
  POLICY: POLICY, LABEL: LABEL, SCREEN: SCREEN, CONSUMER_LIMIT: CONSUMER_LIMIT, HOST: HOST,
  strictOf: strictOf, deltasOf: deltasOf, evaluate: evaluate, reportVerdict: reportVerdict
};
