'use strict';

/*
 * MS18c Stage 3 task-owned host and process identity (the Stage 2 host binding of the manifest).
 * PURE parsing and comparison, plus the PowerShell/CIM query scripts and one bounded runner:
 *
 *   - the confirmed host is PID 1968 with the exact .NET StartTime string, the CIM CreationDate
 *     truncated to MICROSECONDS and normalised to UTC, parent 18780, the executable path and the CIM
 *     name `copilot.exe`; the two timestamps are compared INDEPENDENTLY (their seventh fractional
 *     digit differs by design) and the .NET ProcessName (now `copilot.exe.old-...`) is ignored; a
 *     missing or mismatching field blocks admission;
 *   - the identity of this task's own supervisor (adoption, PID reuse) is PID plus the CIM
 *     CreationDate in UTC, truncated to microseconds, never mixed with .NET's extra digit;
 *   - every query has a timeout of at most 15 s and the readiness as a whole 45 s (`budget`): a
 *     timeout is an unstarted hold with its own reason, never a retry loop.
 */
const childProcess = require('child_process');

const CALL_SECONDS = 15;
const CUMULATIVE_SECONDS = 45;

/** UTC text with exactly six fractional digits (truncated, never rounded) of a CIM / ISO instant, or null. */
function toUtcMicros(text) {
  if (typeof text !== 'string') return null;
  const m = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?(Z|[+-]\d\d:\d\d)$/.exec(text.trim());
  if (!m) return null;
  const digits = (m[2] || '').padEnd(9, '0');
  const whole = Date.parse(m[1] + (m[3] === 'Z' ? 'Z' : m[3]));
  if (!Number.isFinite(whole)) return null;
  return new Date(whole).toISOString().slice(0, 19) + '.' + digits.slice(0, 6) + 'Z';
}

/** The CIM CreationDate (PowerShell `ToUniversalTime().ToString('o')`, seven digits) as UTC microseconds. */
const cimMicros = toUtcMicros;

/** FILETIME ticks (100 ns since 1601) as UTC microseconds, truncated. */
function fileTimeMicros(ticks) {
  const t = BigInt(ticks);
  if (t <= 0n) return null;
  const micros = (t - 116444736000000000n) / 10n;
  const ms = micros / 1000n;
  const stamp = String(micros % 1000000n).padStart(6, '0');
  return new Date(Number(ms)).toISOString().slice(0, 19) + '.' + stamp + 'Z';
}

/**
 * The reasons an observed host is not the confirmed one (empty: it is). `expected` is the
 * manifest's host object,
 * `observed` { pid, dotNetStartTime, cimCreatedUtc, cimParent, cimExe, cimName, processName }.
 */
function hostProblems(expected, observed) {
  if (!expected) return ['no confirmed host identity was supplied'];
  if (!observed) return ['the confirmed host (PID ' + expected.pid + ') was not found'];
  const problems = [];
  const missing = ['pid', 'dotNetStartTime', 'cimCreatedUtc', 'cimParent', 'cimExe', 'cimName']
    .filter((name) => observed[name] === undefined || observed[name] === null || observed[name] === '');
  if (missing.length > 0) {
    return ['the host observation lacks ' + missing.join(', ') + ' (a missing required field is a hold)'];
  }
  if (observed.pid !== expected.pid) {
    problems.push('host PID ' + observed.pid + ' is not the confirmed ' + expected.pid);
  }
  if (observed.dotNetStartTime !== expected.dotNetStartTime) {
    problems.push('host .NET StartTime ' + observed.dotNetStartTime + ' is not the confirmed ' +
      expected.dotNetStartTime);
  }
  const cim = cimMicros(observed.cimCreatedUtc);
  if (cim === null || cim !== expected.cimCreationDateUtcMicroseconds) {
    problems.push('host CIM creation ' + observed.cimCreatedUtc + ' (UTC microseconds ' + cim +
      ') is not the confirmed ' + expected.cimCreationDateUtcMicroseconds);
  }
  if (observed.cimParent !== expected.parentPid) {
    problems.push('host parent ' + observed.cimParent + ' is not the confirmed ' + expected.parentPid);
  }
  if (String(observed.cimExe).toLowerCase() !== String(expected.executablePath).toLowerCase()) {
    problems.push('host executable ' + observed.cimExe + ' is not the confirmed one');
  }
  if (String(observed.cimName).toLowerCase() !== String(expected.cimName).toLowerCase()) {
    problems.push('host name ' + observed.cimName + ' is not the confirmed ' + expected.cimName);
  }
  return problems;
}

/** Is a CIM process record (pid, created) the confirmed host instance (the key of the snapshot deltas)? */
function isHostInstance(expected, pid, createdText) {
  return pid === expected.pid && cimMicros(createdText) === expected.cimCreationDateUtcMicroseconds;
}

/** The identity of a supervisor: PID plus CIM UTC microseconds. */
function supervisorIdentity(pid, cimCreated) {
  const created = cimMicros(cimCreated);
  return created === null ? null : { pid: pid, createdUtcMicros: created };
}

/** Same instance: PID reuse (another creation time for the same PID) is rejected. */
function sameInstance(a, b) {
  return Boolean(a && b && a.pid === b.pid && typeof a.createdUtcMicros === 'string' &&
    a.createdUtcMicros === b.createdUtcMicros);
}

// PowerShell scripts: Windows PowerShell 5.1 (`powershell.exe`), one query each, each with a timeout.
const PS_TIME = "ToUniversalTime().ToString('o')";

const hostScript = (pid) => '$ErrorActionPreference = \'Stop\'; $p = Get-Process -Id ' + pid +
  ' -ErrorAction SilentlyContinue; $c = Get-CimInstance Win32_Process -Filter \'ProcessId=' + pid +
  '\' -OperationTimeoutSec ' + CALL_SECONDS + '; if ($p -and $c) { [pscustomobject]@{ pid = $p.Id; ' +
  'processName = $p.ProcessName; dotNetStartTime = $p.StartTime.ToString(\'o\'); cimName = $c.Name; ' +
  'cimParent = [int]$c.ParentProcessId; cimExe = $c.ExecutablePath; ' +
  'cimCreatedUtc = $c.CreationDate.' + PS_TIME + ' } | ConvertTo-Json -Compress } else { \'null\' }';

const processScript = (pid) => '$ErrorActionPreference = \'Stop\'; ' +
  '$c = Get-CimInstance Win32_Process -Filter \'ProcessId=' + pid + '\' -OperationTimeoutSec ' +
  CALL_SECONDS + '; if ($c) { [pscustomobject]@{ pid = [int]$c.ProcessId; name = $c.Name; ' +
  'cimParent = [int]$c.ParentProcessId; cimExe = $c.ExecutablePath; ' +
  'cimCreatedUtc = $c.CreationDate.' + PS_TIME + ' } | ConvertTo-Json -Compress } else { \'null\' }';

const snapshotScript = () => '$ErrorActionPreference = \'Stop\'; Get-CimInstance Win32_Process ' +
  '-OperationTimeoutSec ' + CALL_SECONDS + ' | ForEach-Object { \'{0}|{1}|{2}|{3}|{4}\' -f $_.ProcessId, ' +
  '$_.ParentProcessId, $(if ($_.CreationDate) { $_.CreationDate.' + PS_TIME + ' } else { \'\' }), ' +
  '($_.KernelModeTime + $_.UserModeTime), $_.Name }';

/** Parses the snapshot lines into { pid, ppid, created (UTC microseconds), cpu (seconds), name }. */
function parseSnapshot(stdout) {
  const processes = [];
  String(stdout || '').split(/\r?\n/).forEach((line) => {
    const m = /^(\d+)\|(\d+)\|([^|]*)\|(\d+)\|(.*)$/.exec(line);
    if (m) {
      processes.push({ pid: Number(m[1]), ppid: Number(m[2]), created: m[3] === '' ? null : cimMicros(m[3]),
        cpu: Number(m[4]) / 1e7, name: m[5] });
    }
  });
  return processes;
}

/**
 * Runs one script with a timeout of min(CALL_SECONDS, remaining) in `powershell.exe`; never longer.
 * A timeout or a missing remaining budget returns { ok: false, timedOut: true } and is an unstarted
 * hold for the caller.
 */
function runQuery(script, remainingSeconds, spawn) {
  const limit = Math.min(CALL_SECONDS, remainingSeconds);
  if (!(limit > 0)) return { ok: false, timedOut: true, reason: 'no readiness budget left', stdout: '' };
  const run = (spawn || childProcess.spawnSync)('powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', windowsHide: true, timeout: Math.round(limit * 1000) });
  const timedOut = Boolean(run.error && run.error.code === 'ETIMEDOUT');
  return { ok: !timedOut && run.status === 0, timedOut: timedOut, status: run.status,
    stdout: String(run.stdout || ''), reason: timedOut ? 'a query exceeded ' + limit.toFixed(1) + ' s' :
      (run.status === 0 ? null : 'the query failed with status ' + run.status), pid: run.pid };
}

/** The host observation: { observed, timedOut, reason }. */
function observeHost(pid, remainingSeconds, spawn) {
  const run = runQuery(hostScript(pid), remainingSeconds, spawn);
  if (!run.ok) return { observed: null, timedOut: run.timedOut, reason: run.reason };
  try {
    const parsed = JSON.parse(run.stdout.trim());
    const missing = parsed === null ? 'the process was not found' : null;
    return { observed: parsed, timedOut: false, reason: missing };
  } catch (err) {
    return { observed: null, timedOut: false, reason: 'the host query returned no JSON' };
  }
}

/** The CIM identity of one process (PID reuse checks); `absent` means positively not running. */
function observeProcess(pid, remainingSeconds, spawn) {
  const run = runQuery(processScript(pid), remainingSeconds, spawn);
  if (!run.ok) return { observed: null, absent: false, timedOut: run.timedOut, reason: run.reason };
  try {
    const parsed = JSON.parse(run.stdout.trim());
    const missing = parsed === null ? 'the process is not running' : null;
    return { observed: parsed, absent: parsed === null, timedOut: false, reason: missing };
  } catch (err) {
    return { observed: null, absent: false, timedOut: false,
      reason: 'the process query returned no JSON' };
  }
}

const processesScript = (pids) => '$ErrorActionPreference = \'Stop\'; ' +
  'Get-CimInstance Win32_Process -Filter \'' + pids.map((p) => 'ProcessId=' + Number(p)).join(' OR ') +
  '\' -OperationTimeoutSec ' + CALL_SECONDS + ' | ForEach-Object { \'{0}|{1}\' -f $_.ProcessId, ' +
  '$_.CreationDate.' + PS_TIME + ' }';

/**
 * The CIM identities of the given PIDs in ONE query: { observed: [{ pid, cimCreatedUtc }] (only those
 * that exist), timedOut, reason }. observed is null when the query failed or timed out (never read as
 * "gone").
 */
function observeProcesses(pids, remainingSeconds, spawn) {
  const list = Array.from(new Set(pids.filter((p) => Number.isInteger(p) && p > 0)));
  if (list.length === 0) return { observed: [], timedOut: false, reason: null };
  const run = runQuery(processesScript(list), remainingSeconds, spawn);
  if (!run.ok) return { observed: null, timedOut: run.timedOut, reason: run.reason };
  const observed = [];
  run.stdout.split(/\r?\n/).forEach((line) => {
    const m = /^(\d+)\|(.+)$/.exec(line.trim());
    if (m) observed.push({ pid: Number(m[1]), cimCreatedUtc: m[2] });
  });
  return { observed: observed, timedOut: false, reason: null };
}

/** One CIM snapshot of every process, with the instants of the query. */
function takeSnapshot(remainingSeconds, spawn) {
  const began = Date.now();
  const run = runQuery(snapshotScript(), remainingSeconds, spawn);
  const ended = Date.now();
  const snapshot = { ok: false, timedOut: run.timedOut, reason: run.reason, samplerPid: run.pid || null,
    start: began, end: ended, mid: (began + ended) / 2, processes: [] };
  if (!run.ok) return snapshot;
  snapshot.processes = parseSnapshot(run.stdout);
  snapshot.ok = snapshot.processes.length > 0;
  if (!snapshot.ok) snapshot.reason = 'the snapshot has no process';
  return snapshot;
}

module.exports = {
  CALL_SECONDS, CUMULATIVE_SECONDS, toUtcMicros, cimMicros, fileTimeMicros, hostProblems, isHostInstance,
  supervisorIdentity, sameInstance, hostScript, processScript, processesScript, snapshotScript,
  parseSnapshot, runQuery, observeHost, observeProcess, observeProcesses, takeSnapshot
};
