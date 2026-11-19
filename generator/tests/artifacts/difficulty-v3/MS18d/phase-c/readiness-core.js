'use strict';

/*
 * MS18d Phase C1 task-owned: the PURE decisions of the selected readiness policy A, `MS18d-GP-host-active`
 * (S-OD15 A, owner answer recorded in check-list section 4; pack MS18d-phase-c-admission.md section C1 and
 * SA1's C1 conditions). No clock, no file, no process: readiness.js collects the facts, this module decides,
 * and the merger re-runs the same functions over the retained raw data (merge-core.js).
 *
 *   ready      the original raw strict verdict: five valid one-second aggregate intervals from real
 *              cumulative counters with mean <= 0.5 and max <= 1.0 busy logical cores. Recorded always, never
 *              adjusted, never the policy verdict under A.
 *   admitted   the policy verdict under A: every required fact valid (the exact named host instance in both
 *              snapshots, five valid intervals, two valid snapshots, in budget) AND no additional consumer.
 *   additional consumer   a process (PID plus creation time) that gains at least 0.5 CPU-s per elapsed second
 *              between the two snapshots (unrounded, `>=`). Only the positively identified host itself (not
 *              its descendants), the idle process (pid 0) and this run's wrapper, controller and readiness
 *              probe processes are excluded from that classification, and none is subtracted from the raw
 *              aggregate. No OS-service, all-Copilot or host-tree exemption.
 *   eligibleReAsk   only a hold whose every required fact is valid and whose ONLY failing criterion is an
 *              additional consumer. Mixed, host, counter, snapshot, timeout and policy holds are not
 *              eligible.
 * A process present in the first snapshot and gone from the second (or one that lived and died inside the
 * window) cannot be measured; it is recorded as `vanished`, never invented as a consumer or a clearance: the
 * aggregate stays the independent record of the window.
 */

const SCHEMA = 'ms18d-c-readiness-1';
const POLICY = Object.freeze({ selector: 'S-OD15', choice: 'A', name: 'MS18d-GP-host-active' });
const LIMITS = Object.freeze({
  intervalCount: 5, intervalMs: 1000, intervalMinMs: 900, intervalMaxMs: 1600,
  readyMeanMax: 0.5, readyMaxMax: 1.0, consumerCpuPerSecond: 0.5,
  totalBudgetMs: 45000, queryBudgetMs: 15000, callToSpawnMs: 60000
});

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const lower = (v) => (typeof v === 'string' ? v.toLowerCase() : v);

/**
 * The exact named host instance: the facts read now (readiness-probe.ps1) against the binding, each fact on
 * its own (PID, parent, executable, the .NET start time at 100 ns against the .NET one, the CIM creation at 6
 * digits against the CIM one). ProcessName, the CIM name and `displayName` are diagnostic only and are never
 * compared (an update may rename a running binary). { verified, kind: verified | absent | replaced |
 * unreadable | unbound, checks, problems }.
 */
function evaluateHost(expected, actual) {
  if (!expected) return { verified: false, kind: 'unbound', checks: {}, problems: ['no host binding'] };
  if (!actual || actual.found !== true) {
    return { verified: false, kind: 'absent', checks: {},
      problems: ['the bound host pid ' + expected.pid + ' is not running'] };
  }
  const checks = {
    pid: actual.pid === expected.pid,
    parentPid: actual.parentPid === expected.parentPid,
    exePath: lower(actual.exePath) === lower(expected.exePath),
    netStartUtc: actual.netStartUtc === expected.netStartUtc,
    cimCreationUtc: actual.cimCreationUtc === expected.cimCreationUtc
  };
  const problems = [];
  const unreadable = Object.keys(checks).filter((k) => actual[k] === null || actual[k] === undefined);
  if (actual.error) problems.push('the host facts report an error: ' + actual.error);
  Object.keys(checks).forEach((k) => {
    if (!checks[k]) problems.push(k + ' differs: bound ' + expected[k] + ', found ' + actual[k]);
  });
  const verified = problems.length === 0;
  let kind = 'verified';
  if (!verified) kind = unreadable.length > 0 || actual.error ? 'unreadable' : 'replaced';
  return { verified, kind, checks, problems };
}

// ---- the aggregate screen ---------------------------------------------------------------------------------

/**
 * Five aggregate intervals from six readings of the cumulative per-logical-processor counters of
 * os.cpus(): `readings[k] = { atMs, hrNs, cpus: [{ user, nice, sys, idle, irq }] }` (milliseconds of
 * processor time). Per processor and interval: busy = d(user + nice + sys + irq), total = busy + d(idle);
 * its busy fraction is busy / total; the interval's busy cores are the sum over the logical processors. No
 * os.loadavg, no subtraction of any process, no normalisation. An interval is valid only when every
 * processor was observed with a positive total and a fraction in [0, 1], the processor count is the bound
 * one, and its own clock says 900..1600 ms. { valid, problems, intervals }.
 */
function intervalsFrom(readings, logicalCpus) {
  const problems = [];
  const intervals = [];
  if (!Array.isArray(readings) || readings.length !== LIMITS.intervalCount + 1) {
    return { valid: false, problems: ['expected ' + (LIMITS.intervalCount + 1) + ' counter readings'],
      intervals };
  }
  for (let k = 1; k < readings.length; k++) {
    const a = readings[k - 1];
    const b = readings[k];
    const own = [];
    let busyCores = 0;
    const fractions = [];
    if (!Array.isArray(a.cpus) || !Array.isArray(b.cpus) || a.cpus.length !== logicalCpus ||
      b.cpus.length !== logicalCpus) {
      own.push('the readings do not cover ' + logicalCpus + ' logical processors');
    } else {
      b.cpus.forEach((c, i) => {
        const p = a.cpus[i];
        const fields = ['user', 'nice', 'sys', 'idle', 'irq'];
        if (!fields.every((f) => isNum(c[f]) && isNum(p[f]))) {
          own.push('processor ' + i + ' has no usable counters');
          return;
        }
        const busy = (c.user - p.user) + (c.nice - p.nice) + (c.sys - p.sys) + (c.irq - p.irq);
        const total = busy + (c.idle - p.idle);
        if (!(total > 0) || busy < 0 || busy > total) {
          own.push('processor ' + i + ' has an invalid delta (busy ' + busy + ', total ' + total + ')');
          return;
        }
        fractions.push(busy / total);
        busyCores += busy / total;
      });
    }
    const elapsedMs = (Number(b.hrNs) - Number(a.hrNs)) / 1e6;
    if (!isNum(elapsedMs) || elapsedMs < LIMITS.intervalMinMs || elapsedMs > LIMITS.intervalMaxMs) {
      own.push('interval ' + k + ' lasted ' + elapsedMs + ' ms, not 900..1600');
    }
    const valid = own.length === 0;
    intervals.push({ index: k, startMs: a.atMs, endMs: b.atMs, elapsedMs, busyCores: valid ? busyCores : null,
      instances: fractions.length, valid, problems: own });
    own.forEach((t) => problems.push('interval ' + k + ': ' + t));
  }
  return { valid: problems.length === 0, problems, intervals };
}

/** mean, max and the raw strict `ready` verdict of the intervals (unrounded, `<=`). */
function aggregateOf(intervals) {
  const valid = intervals.length === LIMITS.intervalCount && intervals.every((i) => i.valid &&
    isNum(i.busyCores));
  if (!valid) return { valid: false, mean: null, max: null, ready: false };
  const values = intervals.map((i) => i.busyCores);
  const mean = values.reduce((x, y) => x + y, 0) / values.length;
  const max = Math.max.apply(null, values);
  return { valid: true, mean, max, ready: mean <= LIMITS.readyMeanMax && max <= LIMITS.readyMaxMax };
}

// ---- the additional-consumer rule -------------------------------------------------------------------------

const keyOf = (p) => p.pid + ':' + p.createdMs;

/**
 * The per-instance CPU deltas of two snapshots (readiness-probe.ps1, ms18d-c-snapshot-1). Processes are told
 * apart by PID plus creation time. ctx: { host: { pid, createdMs } | null (the verified host instance),
 * owned: [{ role, pid, createdMs }], minWindowMs }. { valid, problems, windowMs, consumers, excluded,
 * vanished, created, observed }.
 */
function classifyProcesses(before, after, ctx) {
  const problems = [];
  const out = { valid: false, problems, windowMs: null, threshold: LIMITS.consumerCpuPerSecond, consumers: [],
    excluded: [], vanished: [], created: 0, observed: 0 };
  [['first', before], ['second', after]].forEach(([label, snap]) => {
    if (!snap || snap.ok !== true || !Array.isArray(snap.processes) || snap.processes.length === 0 ||
      !isNum(snap.takenAtMs)) problems.push('the ' + label + ' process snapshot is not usable');
  });
  if (problems.length > 0) return out;
  const windowMs = after.takenAtMs - before.takenAtMs;
  out.windowMs = windowMs;
  if (!(windowMs > 0) || windowMs < (ctx.minWindowMs || 0)) {
    problems.push('the snapshot window (' + windowMs + ' ms) does not cover the aggregate intervals');
    return out;
  }
  const owned = new Map((ctx.owned || []).map((o) => [o.pid + ':' + o.createdMs, o.role]));
  const hostKey = ctx.host ? ctx.host.pid + ':' + ctx.host.createdMs : null;
  const exclusion = (p) => {
    if (p.pid === 0) return 'idle';
    if (hostKey !== null && keyOf(p) === hostKey) return 'host';
    return owned.get(keyOf(p)) || null;
  };
  const prior = new Map();
  before.processes.forEach((p) => {
    if (isNum(p.createdMs) && isNum(p.cpuMs)) prior.set(keyOf(p), p);
  });
  const seen = new Set();
  after.processes.forEach((p) => {
    const why = exclusion(p);
    if (why) {
      out.excluded.push({ pid: p.pid, createdMs: p.createdMs, name: p.name, role: why });
      seen.add(keyOf(p));
      return;
    }
    if (!isNum(p.createdMs) || !isNum(p.cpuMs)) {
      problems.push('process ' + p.pid + ' (' + p.name + ') has no creation time or CPU time');
      return;
    }
    seen.add(keyOf(p));
    out.observed++;
    const was = prior.get(keyOf(p));
    let gained;
    if (was) gained = p.cpuMs - was.cpuMs;
    else {
      gained = p.cpuMs;
      out.created++;
    }
    if (gained < 0) {
      problems.push('process ' + p.pid + ' (' + p.name + '): its CPU time went backwards');
      return;
    }
    const rate = gained / windowMs;
    if (rate >= LIMITS.consumerCpuPerSecond) {
      out.consumers.push({ pid: p.pid, createdMs: p.createdMs, name: p.name, ppid: p.ppid,
        cpuSecondsPerSecond: rate, gainedCpuMs: gained, newInWindow: !was });
    }
  });
  before.processes.forEach((p) => {
    if (!isNum(p.createdMs) || seen.has(keyOf(p)) || exclusion(p)) return;
    out.vanished.push({ pid: p.pid, createdMs: p.createdMs, name: p.name, cpuMs: p.cpuMs });
  });
  out.valid = problems.length === 0;
  return out;
}

// ---- the decision -----------------------------------------------------------------------------------------

/**
 * The policy A decision from the retained facts. input: { policy, expected (the tuple of the committed
 * host-binding journal entry in force: bindingId, pid, parentPid, netStartUtc, cimCreationUtc, exePath),
 * bindingSource, logicalCpus, readings, before, after (snapshots), owned, budget: { elapsedMs,
 * queryDurationsMs: [a, b], callToSpawnMs? } }. Returns the whole record: { schema, policy, complete, ready,
 * admitted, eligibleReAsk, kind, reasons: [{ kind, text }], host, counters, processes, budget }.
 */
function decideReadiness(input) {
  const reasons = [];
  const why = (kind, text) => reasons.push({ kind, text });
  const policy = input.policy || {};
  if (policy.choice !== POLICY.choice || policy.selector !== POLICY.selector) {
    why('policy', 'the selected policy is not S-OD15 A: only A is built (' + JSON.stringify(policy) + ')');
  }
  const hostBefore = evaluateHost(input.expected, input.before && input.before.host);
  const hostAfter = evaluateHost(input.expected, input.after && input.after.host);
  if (!hostBefore.verified) {
    hostBefore.problems.forEach((t) => why('host', 'first snapshot: ' + t));
  }
  if (!hostAfter.verified) {
    hostAfter.problems.forEach((t) => why('host', 'second snapshot: ' + t));
  }
  const counters = intervalsFrom(input.readings, input.logicalCpus);
  counters.problems.forEach((t) => why('counter', t));
  const aggregate = aggregateOf(counters.intervals);
  const hostSeen = input.after && input.after.host && input.after.host.found === true &&
    hostAfter.verified ? { pid: input.after.host.pid, createdMs: hostCreatedMs(input.after) } : null;
  const minWindowMs = counters.intervals.reduce((s, i) => s + (isNum(i.elapsedMs) ? i.elapsedMs : 0), 0);
  const processes = classifyProcesses(input.before, input.after, { host: hostSeen, owned: input.owned,
    minWindowMs });
  processes.problems.forEach((t) => why('snapshot', t));
  const budget = input.budget || {};
  if (!isNum(budget.elapsedMs) || budget.elapsedMs > LIMITS.totalBudgetMs) {
    why('timeout', 'the readiness took ' + budget.elapsedMs + ' ms, the budget is ' + LIMITS.totalBudgetMs);
  }
  (budget.queryDurationsMs || []).forEach((d, i) => {
    if (!isNum(d) || d > LIMITS.queryBudgetMs) {
      why('timeout', 'snapshot query ' + (i + 1) + ' took ' + d + ' ms, the budget is ' +
        LIMITS.queryBudgetMs);
    }
  });
  if (!budget.queryDurationsMs || budget.queryDurationsMs.length !== 2) {
    why('snapshot', 'both snapshot queries must be recorded');
  }
  const required = reasons.length === 0;
  const consumers = processes.consumers;
  if (required && consumers.length > 0) {
    consumers.forEach((c) => why('additional-consumer', 'process ' + c.pid + ' (' + c.name + ') gained ' +
      c.cpuSecondsPerSecond.toFixed(3) + ' CPU-s per elapsed second'));
  }
  const admitted = required && consumers.length === 0;
  const eligibleReAsk = required && consumers.length > 0;
  return {
    schema: SCHEMA, policy: { selector: policy.selector, choice: policy.choice, name: POLICY.name },
    complete: required, ready: aggregate.ready, admitted, eligibleReAsk,
    kind: admitted ? 'admitted' : eligibleReAsk ? 'additional-consumer-hold' : 'hold', reasons,
    host: { expected: input.expected || null, source: input.bindingSource || null,
      verified: hostBefore.verified && hostAfter.verified, first: hostBefore, second: hostAfter },
    counters: { logicalCpus: input.logicalCpus, intervals: counters.intervals, valid: counters.valid,
      mean: aggregate.mean, max: aggregate.max, thresholds: { mean: LIMITS.readyMeanMax,
        max: LIMITS.readyMaxMax } },
    processes, budget: { elapsedMs: budget.elapsedMs, queryDurationsMs: budget.queryDurationsMs || [],
      totalBudgetMs: LIMITS.totalBudgetMs, queryBudgetMs: LIMITS.queryBudgetMs }
  };
}

function hostCreatedMs(snapshot) {
  const row = (snapshot.processes || []).filter((p) => p.pid === snapshot.host.pid)[0];
  return row ? row.createdMs : null;
}

module.exports = { SCHEMA, POLICY, LIMITS, evaluateHost, intervalsFrom, aggregateOf, classifyProcesses,
  decideReadiness };
