'use strict';

/*
 * MS18c Stage 3 task-owned GQ launcher: the OWNED Node child the supervisor creates suspended, puts
 * into its Job Object and resumes (T starts at that creation, on the supervisor's monotonic clock).
 * Inside the job it does the admission of the cell and, only when admitted, starts the ORIGINAL
 * payload (`node tests\qualify.js --variant=.. --level=.. --jobs=4 --json=.. --markdown=..`, built
 * from the committed manifest by gq-plan.cjs, never here):
 *
 *   1. readiness under the 15 s per query / 45 s cumulative caps of the manifest: the lock pair, the
 *      confirmed host (full tuple), two CIM snapshots around five one-second CPU intervals, the lock
 *      pair again immediately before the payload; the strict screen is recorded as `ready`, the
 *      named policy decides `admitted`;
 *   2. not admitted: readiness.json and exit 3, nothing started and nothing journalled as a launch;
 *   3. admitted: the LAUNCH INTENT is journalled (flushed) BEFORE the process is created, the
 *      qualifier is spawned, and R is read from the monotonic clock the instant spawn() returns (the
 *      creation boundary, not a delayed observer): R = hrtime - T-start, T-start being the
 *      supervisor's QueryPerformanceCounter value in nanoseconds (`Stopwatch.GetTimestamp` and
 *      libuv's hrtime read the same counter);
 *   4. its output is copied, CRLF-normalised, to stdout.txt / stderr.txt of the attempt directory.
 * Exit code: the payload's, 3 for an unstarted hold, 5 when the launch intent could not be
 * journalled, 70 for an unexpected fault. Nothing is retried and no CPU is subtracted; no timeout
 * can be raised from here.
 *   node gq-launch.cjs <launch-spec.json> <T-start in ns on the QueryPerformanceCounter clock>
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');
const util = require('./util.cjs');
const host = require('./host.cjs');
const admission = require('./admission.cjs');
const journal = require('./journal.cjs');

const [specFile, tStartText] = process.argv.slice(2);
if (!specFile || !/^\d{10,25}$/.test(String(tStartText))) {
  process.stderr.write('usage: gq-launch.cjs <launch-spec.json> <T-start ns>\n');
  process.exit(2);
}
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const tStartNs = BigInt(tStartText);
const sinceTStart = () => Number(process.hrtime.bigint() - tStartNs) / 1e9;
const dir = spec.attemptDir;
const eventsFile = path.join(dir, 'events.jsonl');
const CAP = spec.caps.cumulativeSeconds;
const sleeper = new Int32Array(new SharedArrayBuffer(4));
const sleepMs = (ms) => { if (ms > 0) Atomics.wait(sleeper, 0, 0, ms); };

let eventFailures = 0;
let spawned = false;

/** One line of the launcher's own event log; a failure is counted and never fatal. */
function event(type, fields) {
  try {
    util.appendLine(eventsFile, JSON.stringify(Object.assign({ at: util.isoUtc(), t: sinceTStart(),
      type: type, who: 'launcher' }, fields)));
  } catch (err) {
    eventFailures++;
  }
}

process.on('uncaughtException', (err) => {
  event('launcher-fault', { message: String(err && err.stack || err), afterSpawn: spawned });
  // Once the qualifier exists nothing may end the launcher before its `close`; before that, exit 70.
  if (!spawned) process.exit(70);
});

/** A journal append that retries a busy file a bounded number of times (the chain is re-read each time). */
const journalAppend = (type, fields) =>
  util.withRetry(() => journal.appendEvent(spec.journalFile, type, fields), { tries: 8, delayMs: 100 });

function writeReadiness(record) {
  try {
    util.withRetry(() => util.writeNew(path.join(dir, 'readiness.json'), util.jsonText(record, true)),
      { tries: 8, delayMs: 100 });
  } catch (err) {
    event('readiness-write-failed', { message: String(err && err.message) });
  }
}

function lockState(file) {
  try {
    const stat = fs.statSync(file);
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (err) {
      content = 'unreadable: ' + err.code;
    }
    return { path: file, present: true, modified: stat.mtime.toISOString(), content: content };
  } catch (err) {
    return { path: file, present: false };
  }
}

function lockPair() {
  const own = lockState(spec.lockFile);
  const named = own.present && typeof own.content === 'string' && own.content.split('|')[1] === spec.runId;
  return { foreign: lockState(spec.foreignLockFile), own: own, matchesRun: named };
}
const shape = (pair) => ({ foreign: pair.foreign, own: { present: pair.own.present,
  matchesRun: pair.matchesRun, content: pair.own.content } });

function cpuCounters() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  cpus.forEach((cpu) => {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  });
  return { cpus: cpus.length, idle: idle, total: total };
}

/** One transcript file: CRLF lines without trailing blanks, written as the output arrives. */
function transcript(file) {
  const fd = fs.openSync(file, 'wx');
  let pending = '';
  const line = (text) => fs.writeSync(fd, text.replace(/[ \t]+$/, '') + '\r\n');
  return {
    write: (chunk) => {
      pending += chunk;
      const parts = pending.split('\n');
      pending = parts.pop();
      parts.forEach((part) => line(part.replace(/\r$/, '')));
    },
    end: () => {
      if (pending !== '') line(pending.replace(/\r$/, ''));
      fs.closeSync(fd);
    }
  };
}

function readiness() {
  const timeouts = [];
  const queries = [];
  const remaining = () => CAP - sinceTStart();
  const note = (name, begun, result) => {
    const seconds = Math.round((sinceTStart() - begun) * 1000) / 1000;
    queries.push({ name: name, seconds: seconds, ok: result.ok !== false });
    if (result.timedOut) timeouts.push(name + ': ' + (result.reason || 'timed out'));
  };
  event('readiness-start', { capSeconds: CAP, remaining: remaining() });
  const first = lockPair();
  let begun = sinceTStart();
  const hostRun = host.observeHost(spec.host.pid, remaining());
  note('host', begun, hostRun);
  begun = sinceTStart();
  const snapA = host.takeSnapshot(remaining());
  note('snapshot-a', begun, snapA);
  const start = cpuCounters();
  const intervals = [];
  let previous = start;
  const origin = process.hrtime.bigint();
  for (let k = 1; k <= admission.SCREEN.intervals; k++) {
    if (remaining() <= 0) {
      timeouts.push('interval ' + k + ': the cumulative ' + CAP + ' s readiness budget is spent');
      break;
    }
    const wait = Number((origin + BigInt(k) * 1000000000n - process.hrtime.bigint()) / 1000000n);
    sleepMs(wait);
    const current = cpuCounters();
    const idle = current.idle - previous.idle;
    const total = current.total - previous.total;
    const valid = Number.isFinite(idle) && Number.isFinite(total) && total > 0 && idle >= 0 &&
      idle <= total && current.cpus === start.cpus;
    intervals.push({ index: k, at: util.isoUtc(), idleDelta: idle, totalDelta: total,
      busyCores: valid ? start.cpus * (1 - idle / total) : null });
    previous = current;
  }
  begun = sinceTStart();
  const snapB = host.takeSnapshot(remaining());
  note('snapshot-b', begun, snapB);
  const launchPids = new Set([process.pid, process.ppid, snapA.samplerPid, snapB.samplerPid]);
  if (snapB.ok) {
    const parent = new Map(snapB.processes.map((p) => [p.pid, p.ppid]));
    let current = process.pid;
    for (let step = 0; step < 12; step++) {
      const up = parent.get(current);
      if (up === undefined || up === 0 || up === spec.host.pid) break;
      launchPids.add(up);
      current = up;
    }
    snapB.processes.forEach((p) => {
      if (p.ppid === snapA.samplerPid || p.ppid === snapB.samplerPid) launchPids.add(p.pid);
    });
  }
  const window = snapA.ok && snapB.ok ? admission.deltasOf(snapA, snapB, launchPids, spec.host) : null;
  const again = lockPair();
  const readinessSeconds = sinceTStart();
  if (readinessSeconds > CAP) {
    timeouts.push('the readiness took ' + readinessSeconds.toFixed(3) + ' s, above the ' + CAP +
      ' s cumulative cap');
  }
  const decision = admission.evaluate({
    policy: spec.policy, locks: shape(first), lockRecheck: shape(again), intervals: intervals,
    host: { expected: spec.host, observed: hostRun.observed }, window: window, timeouts: timeouts
  });
  const busiest = window ? window.deltas.filter((d) => !d.idle && Number.isFinite(d.cpuSeconds))
    .sort((x, y) => y.cpuSeconds - x.cpuSeconds).slice(0, 8).map((d) => ({ pid: d.pid, name: d.name,
      cpuSeconds: Math.round(d.cpuSeconds * 1000) / 1000, host: d.isHost, launchChain: d.launchChain })) : [];
  return {
    schema: 'MS18c-gq-readiness-v1', runId: spec.runId, cell: spec.cell, slot: spec.slot,
    ordinal: spec.ordinal,
    policy: spec.policy, environmentLabel: admission.LABEL, node: process.version,
    readinessSeconds: Math.round(readinessSeconds * 1000) / 1000, capSeconds: CAP,
    queryCapSeconds: spec.caps.callSeconds, queries: queries, timeouts: timeouts,
    logicalCpus: start.cpus, intervals: intervals, meanBusyCores: decision.strict.meanBusyCores,
    maxBusyCores: decision.strict.maxBusyCores, ready: decision.strict.ready,
    strictReasons: decision.strict.reasons,
    admitted: decision.admitted, eligible: decision.eligible, kind: decision.kind, holds: decision.holds,
    reason: decision.reason, locks: { start: shape(first), recheck: shape(again) },
    host: { expected: spec.host, observed: hostRun.observed },
    processWindow: window ? { seconds: window.windowSeconds,
      consumerLimitPerSecond: admission.CONSUMER_LIMIT,
      unobservable: window.unobservable, unmatched: window.unmatched, busiest: busiest } : null,
    note: 'the strict screen is kept as `ready`; `admitted` is the named policy; no CPU is subtracted ' +
      'from any observation and no process tree or service is exempt'
  };
}

function main() {
  const startSeconds = sinceTStart();
  event('launcher-start', { pid: process.pid, node: process.version, cell: spec.cell, runId: spec.runId,
    slot: spec.slot, ordinal: spec.ordinal, startSeconds: startSeconds });
  const sameNode = process.execPath.toLowerCase() === String(spec.nodePath).toLowerCase() &&
    process.version === spec.nodeVersion;
  if (!sameNode) {
    event('launcher-fault', { message: 'the launcher runs under ' + process.execPath + ' ' + process.version +
      ', not the approved ' + spec.nodePath + ' ' + spec.nodeVersion });
    process.exit(70);
  }
  if (!(startSeconds >= 0 && startSeconds < CAP)) {
    const r = { schema: 'MS18c-gq-readiness-v1', runId: spec.runId, admitted: false, eligible: false,
      kind: 'timeout', holds: ['the launcher clock is not aligned with T-start: ' + startSeconds + ' s'],
      timeouts: ['clock alignment'], reason: 'clock misaligned' };
    writeReadiness(r);
    process.exit(3);
  }
  const record = readiness();
  // The 45 s cumulative budget is checked once more immediately before the launch intent is journalled.
  if (record.admitted && sinceTStart() > CAP) {
    const late = 'the ' + CAP + ' s cumulative readiness budget was spent before the launch intent (' +
      sinceTStart().toFixed(3) + ' s)';
    Object.assign(record, { admitted: false, eligible: false, kind: 'timeout', reason: late });
    record.holds.push(late);
    record.timeouts.push(late);
  }
  event('readiness-end', { admitted: record.admitted, eligible: record.eligible, kind: record.kind,
    readinessSeconds: record.readinessSeconds, ready: record.ready });
  if (!record.admitted) {
    writeReadiness(record);
    process.exit(3);
  }

  try {
    journalAppend('launch-intent', { slot: spec.slot, ordinal: spec.ordinal, runId: spec.runId });
  } catch (err) {
    record.launchIntentFailed = String(err && err.message);
    writeReadiness(record);
    event('launch-intent-failed', { message: record.launchIntentFailed });
    process.exit(5);
  }
  writeReadiness(record);
  event('launch-intent', { slot: spec.slot, ordinal: spec.ordinal, argv: spec.payloadArgs });
  const out = transcript(path.join(dir, 'stdout.txt'));
  const err = transcript(path.join(dir, 'stderr.txt'));
  let child;
  try {
    child = childProcess.spawn(spec.nodePath, spec.payloadArgs, { cwd: spec.generatorDir,
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: process.env });
  } catch (spawnError) {
    event('qualifier-not-created', { message: String(spawnError && spawnError.message) });
    out.end();
    err.end();
    process.exit(6);
  }
  // The creation boundary: read the monotonic clock before anything else is done.
  const rSeconds = Number(process.hrtime.bigint() - tStartNs) / 1e9;
  const startedClock = process.hrtime.bigint();
  let created = false;
  child.on('error', (e) => {
    event('qualifier-spawn-error', { message: String(e && e.message), created: created });
    if (!created) {
      out.end();
      err.end();
      process.exit(6);
    }
  });
  if (!child.pid) {
    event('qualifier-not-created', { message: 'spawn() returned no PID', rSeconds: rSeconds });
    return;
  }
  created = true;
  spawned = true;
  try {
    journalAppend('qualifier-created', { slot: spec.slot, ordinal: spec.ordinal, runId: spec.runId,
      pid: child.pid, rSeconds: rSeconds });
  } catch (journalError) {
    event('qualifier-created-journal-failed', { message: String(journalError && journalError.message) });
  }
  event('qualifier-created', { pid: child.pid, rSeconds: rSeconds });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => out.write(chunk));
  child.stderr.on('data', (chunk) => err.write(chunk));
  child.on('close', (code, signal) => {
    out.end();
    err.end();
    const seconds = Number(process.hrtime.bigint() - startedClock) / 1e9;
    event('qualifier-exit', { code: code, signal: signal, seconds: seconds, eventFailures: eventFailures });
    process.exit(code === null ? 1 : code);
  });
}

main();
