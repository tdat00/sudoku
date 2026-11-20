'use strict';

/*
 * MS18c Stage 3 FAKE-DATA tests of host.cjs and admission.cjs: the recorded host values (the exact
 * .NET StartTime and the CIM UTC microseconds compared independently, the renamed ProcessName
 * ignored, PID reuse rejected, every missing or mismatching field a hold), the supervisor's own
 * PID-plus-CIM identity, the strict screen kept apart from the named admission, the
 * additional-consumer rule at 0.5 CPU-s per second with no exemption, the kind of every hold (only a
 * verified additional-consumer hold is eligible for the one re-ask) and the readiness caps of 15 s
 * per query and 45 s in all. No process snapshot is taken, no CPU is sampled.
 *   node generator/tests/artifacts/difficulty-v3/MS18c/test-admission.cjs
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('./util.cjs');
const host = require('./host.cjs');
const admission = require('./admission.cjs');

let passed = 0;
const failed = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + ': ' + (err && err.message));
  }
}

const MANIFEST = JSON.parse(fs.readFileSync(path.join(util.REPO, util.MANIFEST_PATH), 'utf8'));
const EXPECTED = MANIFEST.host;
const hasText = (list, text) => list.some((p) => p.indexOf(text) !== -1);

/** What the live query of the host returned at Stage 2 (recorded values, with the renamed ProcessName). */
const OBSERVED = Object.freeze({
  pid: 1968, processName: 'copilot.exe.old-25148-1794809773310',
  dotNetStartTime: '2026-11-13T19:26:33.6916441+07:00', cimName: 'copilot.exe', cimParent: 18780,
  cimExe: 'C:\\Users\\ledat\\AppData\\Local\\Microsoft\\WinGet\\Links\\copilot.exe',
  cimCreatedUtc: '2026-11-13T12:26:33.6916440Z'
});
const seen = (patch) => Object.assign({}, OBSERVED, patch);

test('the manifest carries the recorded host tuple', () => {
  assert.deepStrictEqual([EXPECTED.pid, EXPECTED.parentPid, EXPECTED.cimName],
    [1968, 18780, 'copilot.exe']);
  assert.strictEqual(EXPECTED.dotNetStartTime, '2026-11-13T19:26:33.6916441+07:00');
  assert.strictEqual(EXPECTED.cimCreationDateUtcMicroseconds, '2026-11-13T12:26:33.691644Z');
});

test('UTC microseconds are truncated, never rounded, whatever the spelling of the instant', () => {
  const cases = [
    ['2026-11-13T12:26:33.6916440Z', '2026-11-13T12:26:33.691644Z'],
    ['2026-11-13T12:26:33.6916449Z', '2026-11-13T12:26:33.691644Z'],
    ['2026-11-13T19:26:33.6916440+07:00', '2026-11-13T12:26:33.691644Z'],
    ['2026-11-13T12:26:33.69Z', '2026-11-13T12:26:33.690000Z'],
    ['2026-11-13T12:26:33Z', '2026-11-13T12:26:33.000000Z'],
    ['2026-11-13T12:26:33.123456789Z', '2026-11-13T12:26:33.123456Z']
  ];
  cases.forEach(([text, want]) => assert.strictEqual(host.toUtcMicros(text), want, text));
  ['', 'yesterday', null, undefined, 5, '2026-13-45T99:00:00Z', '2026-11-13 12:26:33'].forEach((bad) => {
    assert.strictEqual(host.toUtcMicros(bad), null, String(bad));
  });
  // A FILETIME round trip: 100 ns ticks since 1601 of the host's creation instant.
  const ms = BigInt(Date.parse('2026-11-13T12:26:33.691Z'));
  const ticks = ms * 10000n + 116444736000000000n + 6440n;
  assert.strictEqual(host.fileTimeMicros(ticks), '2026-11-13T12:26:33.691644Z');
  assert.strictEqual(host.fileTimeMicros(0), null);
});

test('the recorded host values are accepted; the renamed ProcessName and 7th digit are ignored', () => {
  const ok = (patch) => assert.deepStrictEqual(host.hostProblems(EXPECTED, seen(patch)), []);
  ok({});
  ok({ processName: 'anything' });
  ok({ processName: undefined });
  ok({ cimCreatedUtc: '2026-11-13T12:26:33.6916449Z' });
  ok({ cimCreatedUtc: '2026-11-13T19:26:33.6916440+07:00' });
  ok({ cimExe: OBSERVED.cimExe.toUpperCase(), cimName: 'COPILOT.EXE' });
});

test('every mismatch or missing field of the host is a hold; PID reuse is rejected', () => {
  const cases = [
    [{ pid: 4242 }, 'host PID 4242'],
    [{ dotNetStartTime: '2026-11-13T19:26:33.6916440+07:00' }, '.NET StartTime'],
    [{ dotNetStartTime: '2026-11-14T19:26:33.6916441+07:00' }, '.NET StartTime'],
    [{ cimCreatedUtc: '2026-11-13T12:26:33.6916450Z' }, 'CIM creation'],
    [{ cimCreatedUtc: '2026-11-14T12:26:33.6916440Z' }, 'CIM creation'],
    [{ cimCreatedUtc: 'garbage' }, 'CIM creation'],
    [{ cimParent: 1 }, 'host parent 1'], [{ cimExe: 'C:\\other\\copilot.exe' }, 'host executable'],
    [{ cimName: 'copilot.exe.old' }, 'host name']
  ];
  cases.forEach(([patch, text]) => {
    assert.ok(hasText(host.hostProblems(EXPECTED, seen(patch)), text), text + ' ' + JSON.stringify(patch));
  });
  ['pid', 'dotNetStartTime', 'cimCreatedUtc', 'cimParent', 'cimExe', 'cimName'].forEach((name) => {
    [undefined, null, ''].forEach((value) => {
      const r = host.hostProblems(EXPECTED, seen({ [name]: value }));
      assert.ok(r.length === 1 && hasText(r, 'lacks ' + name), name + ' ' + JSON.stringify(r));
    });
  });
  assert.deepStrictEqual(host.hostProblems(EXPECTED, null),
    ['the confirmed host (PID 1968) was not found']);
  assert.deepStrictEqual(host.hostProblems(null, OBSERVED), ['no confirmed host identity was supplied']);
  // PID reuse: the same PID with another creation time is not the host, whichever timestamp changed.
  const reused = seen({ cimCreatedUtc: '2026-11-19T01:00:00.0000000Z' });
  assert.ok(host.hostProblems(EXPECTED, reused).length > 0);
});

test('a snapshot process is the host only with its PID and its CIM UTC microseconds', () => {
  assert.ok(host.isHostInstance(EXPECTED, 1968, '2026-11-13T12:26:33.6916440Z'));
  assert.ok(host.isHostInstance(EXPECTED, 1968, '2026-11-13T19:26:33.6916440+07:00'));
  assert.ok(!host.isHostInstance(EXPECTED, 1968, '2026-11-13T12:26:34.0000000Z'));
  assert.ok(!host.isHostInstance(EXPECTED, 1969, '2026-11-13T12:26:33.6916440Z'));
  assert.ok(!host.isHostInstance(EXPECTED, 1968, null));
});

test('the supervisor identity is PID plus CIM UTC microseconds, and PID reuse does not match', () => {
  const mine = host.supervisorIdentity(7001, '2026-11-19T01:02:03.1234567Z');
  assert.deepStrictEqual(mine, { pid: 7001, createdUtcMicros: '2026-11-19T01:02:03.123456Z' });
  const same = (pid, text) => host.sameInstance(mine, host.supervisorIdentity(pid, text));
  assert.ok(same(7001, '2026-11-19T08:02:03.1234560+07:00'));
  assert.ok(same(7001, '2026-11-19T01:02:03.1234569Z'));
  assert.ok(!same(7001, '2026-11-19T01:02:03.1234570Z'));
  assert.ok(!same(7002, '2026-11-19T01:02:03.1234567Z'));
  assert.ok(!host.sameInstance(mine, null));
  assert.ok(!host.sameInstance(null, null));
  assert.strictEqual(host.supervisorIdentity(1, 'nope'), null);
});

test('the snapshot lines are parsed into UTC-microsecond instances', () => {
  const text = '0|0||5|System Idle Process\r\n' +
    '1968|18780|2026-11-13T12:26:33.6916440Z|123456789|copilot.exe\r\n' +
    'bad line\r\n77|1968|2026-11-19T01:00:00.5000000Z|10000000|pwsh.exe';
  const list = host.parseSnapshot(text);
  assert.strictEqual(list.length, 3);
  assert.deepStrictEqual(list[1], { pid: 1968, ppid: 18780, created: '2026-11-13T12:26:33.691644Z',
    cpu: 12.3456789, name: 'copilot.exe' });
  assert.strictEqual(list[0].created, null);
});

test('each query is capped at 15 s and the readiness at 45 s; a timeout is a hold, not a retry', () => {
  const calls = [];
  const spawn = (cmd, args, opts) => {
    calls.push(opts.timeout);
    return { status: null, error: { code: 'ETIMEDOUT' }, stdout: '', pid: 1 };
  };
  const first = host.runQuery('x', 45, spawn);
  assert.deepStrictEqual([first.ok, first.timedOut], [false, true]);
  assert.strictEqual(calls[0], 15000);
  host.runQuery('x', 7.5, spawn);
  assert.strictEqual(calls[1], 7500);
  const none = host.runQuery('x', 0, spawn);
  assert.deepStrictEqual([none.ok, none.timedOut, calls.length], [false, true, 2]);
  assert.strictEqual(host.runQuery('x', -3, spawn).timedOut, true);
  assert.strictEqual(host.CALL_SECONDS, 15);
  assert.strictEqual(host.CUMULATIVE_SECONDS, 45);
  const json = JSON.stringify(OBSERVED) + '\r\n';
  const okRun = host.observeHost(1968, 45, () => ({ status: 0, stdout: json, pid: 2 }));
  assert.deepStrictEqual(okRun.observed, OBSERVED);
  const missing = host.observeHost(1968, 45, () => ({ status: 0, stdout: 'null\r\n', pid: 2 }));
  assert.deepStrictEqual([missing.observed, missing.reason], [null, 'the process was not found']);
  const noJson = host.observeHost(1968, 45, () => ({ status: 0, stdout: 'x', pid: 2 }));
  assert.strictEqual(noJson.reason, 'the host query returned no JSON');
  const late = host.takeSnapshot(45, () => ({ status: null, error: { code: 'ETIMEDOUT' }, stdout: '',
    pid: 3 }));
  assert.deepStrictEqual([late.ok, late.timedOut], [false, true]);
});

test('process liveness: absent is positive, a failed or timed-out query is unknown; one batch query', () => {
  const absent = host.observeProcess(7001, 15, () => ({ status: 0, stdout: 'null\r\n', pid: 2 }));
  assert.deepStrictEqual([absent.observed, absent.absent, absent.timedOut], [null, true, false]);
  const alive = host.observeProcess(7001, 15, () => ({ status: 0, pid: 2,
    stdout: JSON.stringify({ pid: 7001, cimCreatedUtc: '2026-11-20T00:59:00.1234567Z' }) }));
  assert.deepStrictEqual([alive.absent, alive.observed.pid], [false, 7001]);
  const late = host.observeProcess(7001, 15, () => ({ status: null, error: { code: 'ETIMEDOUT' },
    stdout: '' }));
  assert.deepStrictEqual([late.observed, late.absent, late.timedOut], [null, false, true]);
  const failed = host.observeProcess(7001, 15, () => ({ status: 1, stdout: '' }));
  assert.deepStrictEqual([failed.absent, failed.timedOut], [false, false]);
  const junk = host.observeProcess(7001, 15, () => ({ status: 0, stdout: 'x' }));
  assert.strictEqual(junk.absent, false);
  const calls = [];
  const many = host.observeProcesses([7001, 9101, 9101, 0, -2, 'x'], 15, (cmd, args, opts) => {
    calls.push(args[args.length - 1]);
    assert.strictEqual(opts.timeout, 15000);
    const rows = '9101|2026-11-20T01:00:05.0000015Z\r\n\r\nnoise\r\n7001|2026-11-20T00:59:00.1234567Z\r\n';
    return { status: 0, pid: 2, stdout: rows };
  });
  assert.strictEqual(calls.length, 1, 'one query for all PIDs');
  assert.ok(/ProcessId=7001 OR ProcessId=9101/.test(calls[0]) && calls[0].indexOf('0') !== -1);
  assert.deepStrictEqual(many.observed, [{ pid: 9101, cimCreatedUtc: '2026-11-20T01:00:05.0000015Z' },
    { pid: 7001, cimCreatedUtc: '2026-11-20T00:59:00.1234567Z' }]);
  const none = host.observeProcesses([7001], 15, () => ({ status: 0, stdout: '' }));
  assert.deepStrictEqual(none.observed, [], 'no row for a PID: gone');
  const timeout = host.observeProcesses([7001], 15, () => ({ status: null, error: { code: 'ETIMEDOUT' } }));
  assert.deepStrictEqual([timeout.observed, timeout.timedOut], [null, true]);
  assert.strictEqual(host.observeProcesses([7001], 15, () => ({ status: 1, stdout: '' })).observed, null);
  assert.deepStrictEqual(host.observeProcesses([], 15, () => assert.fail('no query')).observed, []);
});

// ---- admission ---------------------------------------------------------------------------------------

const locks = (over) => Object.assign({ foreign: { present: false }, own: { matchesRun: true } }, over);
const cores = (list) => list.map((busyCores) => ({ busyCores: busyCores }));
const quiet = cores([0.1, 0.2, 0.1, 0.3, 0.2]);
const busy = cores([3.1, 2.9, 3.4, 3.0, 3.2]);
const t0 = Date.parse('2026-11-19T01:00:00.000Z');
const hostProc = (cpu) => ({ pid: 1968, ppid: 18780, created: '2026-11-13T12:26:33.691644Z', cpu: cpu,
  name: 'copilot.exe' });
const proc = (pid, cpu, name) => ({ pid: pid, ppid: 1, created: '2020-01-01T00:00:00.000000Z', cpu: cpu,
  name: name || 'x.exe' });

function snapshots(cpuOf) {
  const first = { start: t0, mid: t0 + 500, processes: [hostProc(100), proc(0, 5000, 'System Idle Process'),
    proc(500, 10, 'pwsh.exe'), proc(600, 20, 'svchost.exe'), proc(700, 30, 'Code.exe')] };
  const second = { start: t0 + 6000, mid: t0 + 6500, processes: [hostProc(100 + cpuOf.host),
    proc(0, 5030, 'System Idle Process'), proc(500, 10 + cpuOf.launcher, 'pwsh.exe'),
    proc(600, 20 + cpuOf.svc, 'svchost.exe'), proc(700, 30 + cpuOf.other, 'Code.exe')] };
  return admission.deltasOf(first, second, new Set([500]), EXPECTED);
}

function facts(over, cpu) {
  const cpuOf = Object.assign({ host: 2, launcher: 1.5, svc: 0.5, other: 0.5 }, cpu);
  return Object.assign({ policy: admission.POLICY, locks: locks(), lockRecheck: locks(), intervals: quiet,
    host: { expected: EXPECTED, observed: OBSERVED }, window: snapshots(cpuOf), timeouts: [] }, over);
}

test('a quiet window is admitted and ready; nothing is subtracted or exempted', () => {
  const r = admission.evaluate(facts());
  assert.ok(r.admitted && r.strict.ready, JSON.stringify(r.holds));
  assert.strictEqual(r.kind, null);
  assert.ok(Math.abs(r.strict.meanBusyCores - 0.18) < 1e-9);
});

test('the strict screen is kept as ready and is separate from admitted', () => {
  const r = admission.evaluate(facts({ intervals: busy }));
  assert.ok(r.admitted && !r.strict.ready, 'host-active admission with a failed strict screen');
  assert.ok(/FAILED/.test(r.reason) && hasText(r.strict.reasons, 'mean'));
  const peak = admission.evaluate(facts({ intervals: cores([0.1, 0.2, 1.1, 0.3, 0.2]) }));
  assert.ok(peak.admitted && !peak.strict.ready && hasText(peak.strict.reasons, 'maximum'));
  const edge = admission.evaluate(facts({ intervals: cores([0, 0.5, 0.5, 0.5, 1.0]) }));
  assert.ok(edge.strict.ready, 'mean exactly 0.5 and max exactly 1.0 pass: ' + edge.strict.meanBusyCores);
  const over = admission.evaluate(facts({ intervals: cores([0.4, 0.4, 0.4, 0.4, 1.0]) }));
  assert.ok(!over.strict.ready && over.admitted);
});

test('another process at 0.5 CPU-s per second holds, whoever it is; it is the one eligible kind', () => {
  const six = 6.0 * 0.5;
  const hold = admission.evaluate(facts({}, { other: six }));
  assert.ok(!hold.admitted && hold.eligible && hold.kind === 'additional-consumer',
    JSON.stringify(hold.holds));
  assert.ok(hasText(hold.holds, 'Code.exe, PID 700'));
  assert.ok(admission.evaluate(facts({}, { other: six - 0.01 })).admitted);
  // No OS-service exemption: a service gaining the same CPU holds too.
  const svc = admission.evaluate(facts({}, { svc: 3 }));
  assert.ok(!svc.admitted && svc.eligible && hasText(svc.holds, 'svchost.exe'));
  // The host, the idle process and the identified launcher chain are instrumentation or the baseline.
  assert.ok(admission.evaluate(facts({}, { host: 20, launcher: 20 })).admitted);
});

test('every other hold is NOT eligible for the re-ask: host, lock, counters, snapshots, timeouts', () => {
  const bad = (r) => {
    assert.ok(!r.admitted && !r.eligible, JSON.stringify(r.holds));
    return r;
  };
  const kindOf = (over, cpu) => bad(admission.evaluate(facts(over, cpu))).kind;
  const hostOf = (observed) => ({ host: { expected: EXPECTED, observed: observed } });
  const foreign = locks({ foreign: { present: true } });
  assert.strictEqual(kindOf(hostOf(seen({ cimParent: 5 }))), 'host');
  assert.strictEqual(kindOf(hostOf(null)), 'host');
  assert.strictEqual(kindOf({ locks: foreign }), 'lock');
  assert.strictEqual(kindOf({ locks: locks({ own: { matchesRun: false } }) }), 'lock');
  assert.strictEqual(kindOf({ lockRecheck: null }), 'lock');
  assert.strictEqual(kindOf({ lockRecheck: foreign }), 'lock');
  assert.strictEqual(kindOf({ intervals: quiet.slice(0, 4) }), 'counters');
  const nan = quiet.map((q, i) => (i === 2 ? { busyCores: NaN } : q));
  assert.strictEqual(kindOf({ intervals: nan }), 'counters');
  assert.strictEqual(kindOf({ window: null }), 'snapshot');
  assert.strictEqual(kindOf({ timeouts: ['a query exceeded 15.0 s'] }), 'timeout');
  assert.strictEqual(kindOf({ policy: 'MS18b-host-active' }), 'policy');
  assert.strictEqual(kindOf({ timeouts: ['cumulative budget spent'] }, { other: 4 }), 'mixed');
  // A consumer hold together with a lock fault is mixed, not eligible.
  assert.strictEqual(kindOf({ locks: foreign }, { other: 4 }), 'mixed');
});

test('a host that is not the same instance in both snapshots, or has no CPU reading, holds', () => {
  const w = snapshots({ host: 2, launcher: 1, svc: 0, other: 0 });
  const holdsOf = (patch) => admission.evaluate(facts({ window: Object.assign({}, w, patch) })).holds;
  assert.ok(hasText(holdsOf({ hostInB: false }), 'same instance'));
  assert.ok(hasText(holdsOf({ hostDelta: null }), 'no usable CPU observation'));
  assert.ok(hasText(holdsOf({ windowSeconds: 0 }), 'not positive'));
});

console.log(passed + ' passed, ' + failed.length + ' failed');
if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
process.exitCode = failed.length === 0 ? 0 : 1;
