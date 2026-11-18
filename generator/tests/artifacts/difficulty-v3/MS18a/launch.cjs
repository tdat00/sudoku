'use strict';

/*
 * MS18a task-owned launch wrapper (check-list section 7, "Final-gate quiet-machine precondition"), revised
 * for MS18a-Q1 (the first version, frozen 17:34, is kept in evidence/MS18a/pre-q1-helpers/). It runs INSIDE
 * the
 * lock held by `Invoke-Dv3Node`, so everything is observed while our lock is held:
 *   1. the lock files: the foreign `dv3-timing.lock` must be absent and our `dv3-sudoku.lock` must be present
 *      with this task's name;
 *   2. the identity of the confirmed session host (policy only): PID, exact creation time, parent, executable
 *      and CIM name are read and compared by admission.cjs;
 *   3. two CIM `Win32_Process` snapshots (kernel + user CPU time, creation date, parent, name of every
 *      process) with their start and end instants around
 *   4. five one-second host CPU intervals from the real cumulative counters of `os.cpus()`: busy cores of an
 *      interval = logical CPUs x (1 - idle delta / total delta). The STRICT screen is the check-list's: mean
 *      <= 0.5 and maximum <= 1.0, no unavailable or invalid counter (never read as idle). Its verdict is
 *      recorded as `ready` and is never changed to launch;
 *   5. the lock state again immediately before the payload.
 * `admission.cjs` then decides `admitted`: without a policy it is the strict verdict (the first version's
 * behaviour); under `--policy=MS18a-Q1-host-active` it admits a failed strict screen only when its named
 * conditions hold (confirmed host instance, nothing else running, valid counters, locks). Only an admitted
 * run starts the ORIGINAL payload unchanged as a child (`node <payload arguments>`); its console output is
 * copied to this console and, line by line as it arrives, to the transcript (UTF-8, CRLF, trailing
 * whitespace removed; a run that is killed leaves the partial transcript without its last two lines).
 *
 *   node launch.cjs <task> <readiness json> <transcript> [--policy=<name> --host-pid=<n> --host-created=<iso>
 *        --host-parent=<n> --host-exe=<path> --host-name=<name> --] <payload argument> [more...]
 *
 * Options end at the first `--`; without one every argument after the transcript is the payload.
 * Exit code: the payload's, or 3 when the payload was not started (a hold), or 2 for a usage error. The
 * screen and the admission are never changed after a result is known, and nothing is retried.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const admission = require('./admission.cjs');

const SCREEN = admission.SCREEN;
const [task, readyFile, logFile, ...rest] = process.argv.slice(2);
const split = rest.indexOf('--');
const options = split === -1 ? [] : rest.slice(0, split);
const payload = split === -1 ? rest : rest.slice(split + 1);
if (!task || !readyFile || !logFile || payload.length === 0) {
  console.error('usage: launch.cjs <task> <readiness json> <transcript> [options --] <payload argument> ...');
  process.exit(2);
}
const opt = {};
options.forEach((arg) => {
  const m = /^--([a-z-]+)=(.*)$/.exec(arg);
  if (m) {
    opt[m[1]] = m[2];
  } else {
    console.error('bad option ' + arg);
    process.exit(2);
  }
});
const policy = opt.policy || null;

function iso(date) {
  const pad = (n, width) => String(n).padStart(width || 2, '0');
  const offset = -date.getTimezoneOffset();
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' +
    pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) + '.' +
    pad(date.getMilliseconds(), 3) + (offset >= 0 ? '+' : '-') + pad(Math.floor(Math.abs(offset) / 60)) +
    ':' + pad(Math.abs(offset) % 60);
}

const nowMs = () => Number(process.hrtime.bigint() / 1000n) / 1000;
const sleeper = new Int32Array(new SharedArrayBuffer(4));
const sleepMs = (ms) => { if (ms > 0) Atomics.wait(sleeper, 0, 0, ms); };

function lockState(name) {
  const file = path.join(process.env.TEMP || os.tmpdir(), name);
  try {
    const stat = fs.statSync(file);
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (err) {
      content = 'unreadable: ' + err.code;
    }
    return { path: file, present: true, modified: iso(stat.mtime), content: content };
  } catch (err) {
    return { path: file, present: false };
  }
}

function lockPair() {
  const own = lockState('dv3-sudoku.lock');
  const named = own.present && typeof own.content === 'string' && own.content.split('|')[1] === task;
  return { foreign: lockState('dv3-timing.lock'), own: own, matchesTask: named };
}
const shape = (pair) => ({
  foreign: pair.foreign,
  own: { present: pair.own.present, matchesTask: pair.matchesTask, content: pair.own.content }
});

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

function powershell(script) {
  return spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', windowsHide: true, timeout: 30000 });
}

/** Name, exact start time, path, CIM name, parent and creation date of one process, or null. */
function hostObservation(pid) {
  const script = '$p = Get-Process -Id ' + pid + ' -ErrorAction SilentlyContinue; ' +
    "$c = Get-CimInstance Win32_Process -Filter 'ProcessId=" + pid + "'; " +
    'if ($p -and $c) { [pscustomobject]@{ pid = $p.Id; processName = $p.ProcessName; ' +
    "created = $p.StartTime.ToString('o'); path = $p.Path; cimName = $c.Name; " +
    'cimParent = [int]$c.ParentProcessId; cimExe = $c.ExecutablePath; ' +
    "cimCreated = $c.CreationDate.ToString('o') } | ConvertTo-Json -Compress } else { 'null' }";
  const run = powershell(script);
  if (run.status !== 0 || !run.stdout) return null;
  try {
    return JSON.parse(run.stdout.trim());
  } catch (err) {
    return null;
  }
}

/** Every process with its creation date and kernel + user CPU seconds, with the instants of the query. */
function cimSnapshot() {
  const script = "Get-CimInstance Win32_Process | ForEach-Object { '{0}|{1}|{2}|{3}|{4}' -f " +
    '$_.ProcessId, $_.ParentProcessId, $(if ($_.CreationDate) { ' + "$_.CreationDate.ToString('o') } " +
    "else { '' }), ($_.KernelModeTime + $_.UserModeTime), $_.Name }";
  const began = new Date();
  const run = powershell(script);
  const ended = new Date();
  const snapshot = {
    ok: false, samplerPid: run.pid, startedAt: iso(began), endedAt: iso(ended), start: began.getTime(),
    mid: (began.getTime() + ended.getTime()) / 2, processes: []
  };
  if (run.status !== 0 || !run.stdout) return snapshot;
  run.stdout.split(/\r?\n/).forEach((line) => {
    const m = /^(\d+)\|(\d+)\|([^|]*)\|(\d+)\|(.*)$/.exec(line);
    if (m) {
      snapshot.processes.push({
        pid: Number(m[1]), ppid: Number(m[2]), created: m[3] === '' ? null : m[3], cpu: Number(m[4]) / 1e7,
        name: m[5]
      });
    }
  });
  snapshot.ok = snapshot.processes.length > 0;
  return snapshot;
}

const wrapperStart = new Date();
const wrapperClock = nowMs();
const record = {
  task: task, payload: ['node'].concat(payload), wrapper: 'launch.cjs (MS18a, Q1 revision)',
  wrapperStartedAt: iso(wrapperStart), node: process.version, host: os.hostname(), screen: SCREEN,
  policy: policy, environmentLabel: policy ? admission.LABEL : null
};

const first = lockPair();
record.locks = { foreign: first.foreign, own: first.own, ownMatchesTask: first.matchesTask };

let observed = null;
let expected = null;
if (policy) {
  expected = {
    pid: Number(opt['host-pid']), name: opt['host-name'], parent: Number(opt['host-parent']),
    created: opt['host-created'], exe: opt['host-exe']
  };
  if (Number.isInteger(expected.pid) && expected.pid > 0) observed = hostObservation(expected.pid);
}
const snapA = cimSnapshot();
const startedCpu = cpuCounters();
record.logicalCpus = startedCpu.cpus;
record.counterSource = 'os.cpus() cumulative times (user, nice, sys, idle, irq), idle share of the total';
const intervals = [];
let previous = startedCpu;
let previousAt = new Date();
const origin = nowMs();
for (let k = 1; k <= SCREEN.intervals; k++) {
  sleepMs(origin + k * SCREEN.intervalMs - nowMs());
  const current = cpuCounters();
  const at = new Date();
  const idle = current.idle - previous.idle;
  const total = current.total - previous.total;
  const valid = Number.isFinite(idle) && Number.isFinite(total) && total > 0 && idle >= 0 && idle <= total &&
    current.cpus === startedCpu.cpus;
  intervals.push({
    index: k, start: iso(previousAt), end: iso(at), idleDelta: idle, totalDelta: total,
    busyFraction: valid ? 1 - idle / total : null,
    busyCores: valid ? startedCpu.cpus * (1 - idle / total) : null
  });
  previous = current;
  previousAt = at;
}
const snapB = cimSnapshot();
record.intervals = intervals;

// The identified instrumentation: this launcher, its ancestors up to the host, the sampler shells and
// their children.
const launchPids = new Set([process.pid, snapA.samplerPid, snapB.samplerPid]);
if (snapB.ok) {
  const parent = new Map(snapB.processes.map((p) => [p.pid, p.ppid]));
  let current = process.pid;
  for (let step = 0; step < 12; step++) {
    const up = parent.get(current);
    if (up === undefined || up === 0 || (expected && up === expected.pid)) break;
    launchPids.add(up);
    current = up;
  }
  snapB.processes.forEach((p) => {
    if (p.ppid === snapA.samplerPid || p.ppid === snapB.samplerPid) launchPids.add(p.pid);
  });
}
const hostKey = {
  pid: expected ? expected.pid : -1, createdCim: observed ? String(observed.cimCreated) : ''
};
const window = snapA.ok && snapB.ok ? admission.deltasOf(snapA, snapB, launchPids, hostKey) : null;

const again = lockPair();
const decision = admission.evaluate({
  task: task, policy: policy, locks: shape(first), lockRecheck: shape(again), intervals: intervals,
  host: { expected: expected, observed: observed }, window: window
});
record.meanBusyCores = decision.strict.meanBusyCores;
record.maxBusyCores = decision.strict.maxBusyCores;
record.ready = decision.strict.ready;
record.reasons = decision.strict.reasons;
record.admitted = decision.admitted;
record.admissionHolds = decision.holds;
record.admissionReason = decision.reason;
record.lockRecheck = { foreign: again.foreign, own: again.own, ownMatchesTask: again.matchesTask };
record.hostObservation = policy ? {
  expected: expected, observed: observed,
  inBothSnapshots: window ? window.hostInA && window.hostInB : null,
  cpuSeconds: window && window.hostDelta ? window.hostDelta.cpuSeconds : null,
  cpuSecondsPerSecond: window && window.hostDelta ? window.hostDelta.perSecond : null,
  note: 'an observation of the confirmed instance only; it is not subtracted from the aggregate screen'
} : null;
record.processWindow = {
  a: { startedAt: snapA.startedAt, endedAt: snapA.endedAt, ok: snapA.ok, processes: snapA.processes.length },
  b: { startedAt: snapB.startedAt, endedAt: snapB.endedAt, ok: snapB.ok, processes: snapB.processes.length },
  seconds: window ? window.windowSeconds : null, consumerLimitPerSecond: admission.CONSUMER_LIMIT
};
if (window) {
  const named = window.deltas.filter((d) => !d.idle && Number.isFinite(d.cpuSeconds))
    .sort((x, y) => y.cpuSeconds - x.cpuSeconds).slice(0, 8);
  record.processContext = {
    note: 'CPU seconds gained per process instance (pid + creation date) between the two snapshots, ' +
      'from the ' +
      'kernel + user times of Win32_Process; the launch chain is instrumentation; protected, system and ' +
      'transient processes may be partly unattributed and this inventory is not claimed to explain the ' +
      'aggregate busy cores; the snapshot window and the five intervals are not synchronized',
    busiest: named.map((d) => ({
      pid: d.pid, name: d.name, cpuSeconds: Math.round(d.cpuSeconds * 1000) / 1000,
      perSecond: Math.round(d.perSecond * 1000) / 1000, host: d.isHost, launchChain: d.launchChain,
      newInWindow: d.newInWindow
    })),
    launchChain: Array.from(launchPids), unobservable: window.unobservable, unmatched: window.unmatched
  };
}
record.readinessSeconds = Math.round(nowMs() - wrapperClock) / 1000;
const text = () => JSON.stringify(record, null, 2).replace(/\n/g, '\r\n') + '\r\n';
fs.mkdirSync(path.dirname(path.resolve(readyFile)), { recursive: true });
fs.writeFileSync(path.resolve(readyFile), text(), 'utf8');

fs.mkdirSync(path.dirname(path.resolve(logFile)), { recursive: true });
const fd = fs.openSync(path.resolve(logFile), 'w');
const writeLine = (line) => fs.writeSync(fd, line.replace(/[ \t]+$/, '') + '\r\n');
const fmt = (x) => (x === null ? 'n/a' : x.toFixed(3));
writeLine('$ node ' + payload.join(' '));
writeLine('TASK ' + task);
writeLine('STRICT SCREEN ' + (record.ready ? 'ready' : 'NOT READY') + ': mean ' + fmt(record.meanBusyCores) +
  ', max ' + fmt(record.maxBusyCores) + ' busy cores of ' + record.logicalCpus + ' (' +
  path.basename(readyFile) + ')');
if (policy) {
  writeLine('POLICY ' + policy + ' ' + (record.admitted ? 'ADMITTED' : 'HOLD') + ': ' +
    record.admissionReason);
  writeLine('LABEL ' + admission.LABEL);
}
console.log('strict screen ' + (record.ready ? 'ready' : 'NOT READY') + ' mean ' + record.meanBusyCores +
  ' max ' + record.maxBusyCores + '; ' + (policy ? policy + ' ' : '') +
  (record.admitted ? 'admitted' : 'HOLD ' + decision.reason));

if (!record.admitted) {
  writeLine('NOT STARTED: ' + decision.reason);
  fs.closeSync(fd);
  process.exit(3);
}

const started = new Date();
const startedClock = nowMs();
record.payloadStartedAt = iso(started);
writeLine('START ' + iso(started));
let pending = '';
const emit = (chunk) => {
  process.stdout.write(chunk);
  pending += chunk;
  const parts = pending.split('\n');
  pending = parts.pop();
  parts.forEach((part) => writeLine(part.replace(/\r$/, '')));
};
const child = spawn(process.execPath, payload, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', emit);
child.stderr.on('data', emit);
child.on('close', (code, signal) => {
  if (pending !== '') writeLine(pending.replace(/\r$/, ''));
  const ended = new Date();
  const seconds = (nowMs() - startedClock) / 1000;
  const exit = code === null ? 1 : code;
  writeLine('END ' + iso(ended));
  writeLine('exit=' + exit + (signal ? ' signal=' + signal : '') + ' seconds=' + seconds.toFixed(3));
  fs.closeSync(fd);
  record.payloadEndedAt = iso(ended);
  record.payloadExit = exit;
  record.payloadSeconds = Math.round(seconds * 1000) / 1000;
  fs.writeFileSync(path.resolve(readyFile), text(), 'utf8');
  process.exit(exit);
});
