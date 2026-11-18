'use strict';

/*
 * MS18a task-owned launch wrapper (check-list section 7, "Final-gate quiet-machine precondition"). It
 * runs INSIDE the lock held by `Invoke-Dv3Node`, so the observations are taken while our lock is held:
 *   1. the lock files: the foreign `dv3-timing.lock` must be absent and our `dv3-sudoku.lock` must be
 *      present with this task's name;
 *   2. five one-second host CPU intervals from the real cumulative counters of `os.cpus()` (not
 *      `os.loadavg`): busy cores of an interval = logical CPUs x (1 - idle delta / total delta). The
 *      screen is the check-list's: mean <= 0.5 busy logical cores and maximum <= 1.0, no unavailable or
 *      invalid counter (never read as idle). An operational noise screen, not a performance budget or a
 *      proof of isolation;
 *   3. for context only (never a gate): a snapshot of the cumulative CPU seconds of every process before
 *      and after the five intervals, naming the busiest ones and whether they are this wrapper or its
 *      parent.
 * Then, only when ready, the ORIGINAL payload runs unchanged as a child (`node <payload arguments>`), its
 * console output is copied to this console and, line by line as it arrives, to the transcript (UTF-8,
 * CRLF, trailing whitespace removed; a run that is killed leaves the partial transcript without its last
 * two lines).
 *
 *   node launch.cjs <task> <readiness json> <transcript> <payload argument> [more payload arguments...]
 *
 * Exit code: the payload's, or 3 when the readiness screen failed (the payload was not started), or 2 for
 * a usage error. It never changes the screen after a result is known and never retries.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const SCREEN = { intervals: 5, intervalMs: 1000, meanMax: 0.5, peakMax: 1.0 };
const [task, readyFile, logFile, ...payload] = process.argv.slice(2);
if (!task || !readyFile || !logFile || payload.length === 0) {
  console.error('usage: launch.cjs <task> <readiness json> <transcript> <payload argument> [...]');
  process.exit(2);
}

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

function processSnapshot() {
  const script = "Get-Process | ForEach-Object { '{0}|{1}|{2}' -f $_.Id, $_.ProcessName, $_.CPU }";
  const run = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', windowsHide: true, timeout: 20000 });
  if (run.status !== 0 || !run.stdout) return null;
  const table = new Map();
  run.stdout.split(/\r?\n/).forEach((line) => {
    const m = /^(\d+)\|([^|]*)\|(.*)$/.exec(line);
    if (m) table.set(Number(m[1]), { name: m[2], cpu: m[3] === '' ? null : Number(m[3].replace(',', '.')) });
  });
  return table;
}

const wrapperStart = new Date();
const wrapperClock = nowMs();
const record = {
  task: task, payload: ['node'].concat(payload), wrapper: 'launch.cjs (MS18a)',
  wrapperStartedAt: iso(wrapperStart), node: process.version, host: os.hostname(), screen: SCREEN
};

const foreign = lockState('dv3-timing.lock');
const own = lockState('dv3-sudoku.lock');
record.locks = {
  foreign: foreign,
  own: own,
  ownMatchesTask: own.present && typeof own.content === 'string' && own.content.split('|')[1] === task
};

const reasons = [];
if (foreign.present) reasons.push('a foreign dv3-timing.lock is present');
if (!record.locks.ownMatchesTask) reasons.push('our dv3-sudoku.lock is missing or names another task');

const before = processSnapshot();
record.processSnapshots = { before: before === null ? 'unavailable' : before.size + ' processes' };
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
const after = processSnapshot();
record.processSnapshots.after = after === null ? 'unavailable' : after.size + ' processes';
record.intervals = intervals;
const valid = intervals.every((interval) => interval.busyCores !== null);
if (!valid) {
  reasons.push('a CPU counter interval is unavailable or invalid (read as not ready, never as idle)');
}
const cores = intervals.map((interval) => interval.busyCores);
record.meanBusyCores = valid ? cores.reduce((a, b) => a + b, 0) / cores.length : null;
record.maxBusyCores = valid ? Math.max.apply(null, cores) : null;
if (valid && record.meanBusyCores > SCREEN.meanMax) {
  reasons.push('mean ' + record.meanBusyCores.toFixed(3) + ' busy cores is above ' + SCREEN.meanMax);
}
if (valid && record.maxBusyCores > SCREEN.peakMax) {
  reasons.push('maximum ' + record.maxBusyCores.toFixed(3) + ' busy cores is above ' + SCREEN.peakMax);
}
if (before !== null && after !== null) {
  const deltas = [];
  after.forEach((now, pid) => {
    const then = before.get(pid);
    if (then && Number.isFinite(then.cpu) && Number.isFinite(now.cpu) && now.name === then.name) {
      deltas.push({ pid: pid, name: now.name, cpuSeconds: Math.round((now.cpu - then.cpu) * 1000) / 1000,
        thisWrapperOrItsParent: pid === process.pid || pid === process.ppid });
    }
  });
  deltas.sort((a, b) => b.cpuSeconds - a.cpuSeconds);
  record.processContext = {
    note: 'cumulative CPU seconds gained between the two snapshots (about the five intervals plus the ' +
      'snapshots); context only, not a gate',
    busiest: deltas.slice(0, 6)
  };
}
record.ready = reasons.length === 0;
record.reasons = reasons;
record.readinessSeconds = Math.round((nowMs() - wrapperClock)) / 1000;
const text = () => JSON.stringify(record, null, 2).replace(/\n/g, '\r\n') + '\r\n';
fs.mkdirSync(path.dirname(path.resolve(readyFile)), { recursive: true });
fs.writeFileSync(path.resolve(readyFile), text(), 'utf8');

fs.mkdirSync(path.dirname(path.resolve(logFile)), { recursive: true });
const fd = fs.openSync(path.resolve(logFile), 'w');
const writeLine = (line) => fs.writeSync(fd, line.replace(/[ \t]+$/, '') + '\r\n');
writeLine('$ node ' + payload.join(' '));
writeLine('TASK ' + task);
writeLine('READINESS ' + (record.ready ? 'ready' : 'NOT READY') + ': mean ' +
  (record.meanBusyCores === null ? 'n/a' : record.meanBusyCores.toFixed(3)) + ', max ' +
  (record.maxBusyCores === null ? 'n/a' : record.maxBusyCores.toFixed(3)) + ' busy cores of ' +
  record.logicalCpus + ' (' + path.basename(readyFile) + ')');
console.log('readiness ' + (record.ready ? 'ready' : 'NOT READY ' + reasons.join('; ')) + ' mean ' +
  record.meanBusyCores + ' max ' + record.maxBusyCores);

if (!record.ready) {
  writeLine('NOT STARTED: ' + reasons.join('; '));
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
