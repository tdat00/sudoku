'use strict';

/*
 * MS18b task-owned test of the admission logic (admission.cjs; the MS18a-Q1 predicate under the policy name
 * MS18b-host-active). NO generation, no lock, no process is started and nothing outside the optional output
 * file is written; it runs in well under a second.
 *   node generator/tests/artifacts/difficulty-v3/MS18b/test-admission.cjs [out file]
 * Each case builds the facts that launch.cjs collects (locks, five intervals, the confirmed host, two
 * process snapshots) and checks the decision and the reporter's verdict. Exit 0 when every case holds.
 */
const fs = require('fs');
const path = require('path');
const A = require('./admission.cjs');

const HOST = A.HOST;
const CIM_CREATED = '2026-11-13T19:26:33.6916440+07:00';
const OBSERVED = {
  pid: 1968, processName: 'copilot.exe.old-25148-1794809773310', created: HOST.created, path: HOST.exe,
  cimName: 'copilot.exe', cimParent: 18780, cimExe: HOST.exe, cimCreated: CIM_CREATED
};
const LAUNCH = new Set([5000, 4000]);
const T0 = Date.parse('2026-11-18T19:40:00.000+07:00');
const KEY = { pid: 1968, createdCim: CIM_CREATED };
const OLD_DAY = '2026-11-18T08:00:00.0000000+07:00';
const proc = (pid, ppid, created, cpu, name) => ({
  pid: pid, ppid: ppid, created: created, cpu: cpu, name: name
});

function snapshots(change) {
  const spec = Object.assign({
    hostCpu: 0.7, otherCpu: 0.1, launcherCpu: 0.2, hostCreated: CIM_CREATED, hostInB: true,
    hostNullCpu: false, extra: [], extraB: []
  }, change || {});
  const base = (cpu) => [
    proc(0, 0, null, 90000, 'System Idle Process'),
    proc(1968, 18780, spec.hostCreated, cpu.host, 'copilot.exe'),
    proc(17588, 26488, '2026-11-16T13:21:18.0000000+07:00', cpu.sibling, 'copilot.exe'),
    proc(6552, 1, OLD_DAY, cpu.other, 'WindowsTerminal.exe'),
    proc(4000, 1968, '2026-11-18T19:30:00.0000000+07:00', cpu.launcher, 'pwsh.exe'),
    proc(5000, 4000, '2026-11-18T19:40:00.0000000+07:00', cpu.launcher, 'node.exe')
  ];
  const a = {
    start: T0, mid: T0 + 500,
    processes: base({ host: 50, sibling: 20, other: 5, launcher: 1 }).concat(spec.extra)
  };
  const after = { host: 50 + spec.hostCpu * 9.5, sibling: 20.05, other: 5 + spec.otherCpu,
    launcher: 1 + spec.launcherCpu };
  const b = { start: T0 + 9000, mid: T0 + 10000, processes: base(after).concat(spec.extraB) };
  if (!spec.hostInB) b.processes = b.processes.filter((p) => p.pid !== 1968);
  if (spec.hostNullCpu) b.processes.find((p) => p.pid === 1968).cpu = null;
  return { a: a, b: b };
}

const windowOf = (change) => {
  const s = snapshots(change);
  return A.deltasOf(s.a, s.b, LAUNCH, KEY);
};
const OK_LOCKS = { foreign: { present: false }, own: { present: true, matchesTask: true } };
const FAILING = [1.43, 0.84, 0.45, 1.19, 1.33];
const PASSING = [0.2, 0.3, 0.4, 0.1, 0.5];
const cores = (list) => list.map((c) => ({ busyCores: c }));

function facts(change, over) {
  return Object.assign({
    task: 'T', policy: A.POLICY, locks: OK_LOCKS, lockRecheck: OK_LOCKS, intervals: cores(FAILING),
    host: { expected: HOST, observed: OBSERVED }, window: windowOf(change)
  }, over || {});
}
const withHost = (patch) => ({ host: { expected: HOST, observed: Object.assign({}, OBSERVED, patch) } });

const results = [];
function expect(name, decision, admitted, strictReady) {
  const strictOk = strictReady === undefined || decision.strict.ready === strictReady;
  const ok = decision.admitted === admitted && strictOk;
  const holds = decision.holds.length ? ' [' + decision.holds.join('; ') + ']' : '';
  results.push({ name: name, ok: ok, detail: 'admitted ' + decision.admitted + ', strict ' +
    decision.strict.ready + holds });
}
function note(name, ok, detail) {
  results.push({ name: name, ok: ok, detail: detail || '' });
}
const lock = {
  foreign: { foreign: { present: true }, own: { present: true, matchesTask: true } },
  other: { foreign: { present: false }, own: { present: true, matchesTask: false } },
  gone: { foreign: { present: false }, own: { present: false, matchesTask: false } }
};
const hiddenProc = proc(777, 1, OLD_DAY, null, 'protected.exe');

note('the policy of this task is MS18b-host-active and the label is the descriptive one',
  A.POLICY === 'MS18b-host-active' &&
  A.LABEL === 'shared-slot, CLI-host-active; not strict-quiet-machine timing', A.POLICY);
note('the thresholds are the original ones (mean 0.5, max 1.0, five one-second intervals, 0.5 CPU-s/s)',
  A.SCREEN.meanMax === 0.5 && A.SCREEN.peakMax === 1.0 && A.SCREEN.intervals === 5 &&
  A.SCREEN.intervalMs === 1000 && A.CONSUMER_LIMIT === 0.5, JSON.stringify(A.SCREEN));
note('the confirmed host is PID 1968, parent 18780, the confirmed creation time',
  HOST.pid === 1968 && HOST.parent === 18780 && HOST.created === '2026-11-13T19:26:33.6916441+07:00',
  JSON.stringify(HOST));

// The admitted cases: the strict verdict stays visible and false.
const base = A.evaluate(facts());
expect('raw screen fails (mean 1.048, max 1.43), confirmed host, nothing else: admitted, strict false',
  base, true, false);
note('the strict verdict keeps its reasons and numbers when admitted',
  base.strict.reasons.length === 2 && Math.abs(base.strict.meanBusyCores - 1.048) < 0.001 &&
    base.strict.maxBusyCores === 1.43, JSON.stringify(base.strict));
expect('strict screen passes: admitted, strict true',
  A.evaluate(facts({}, { intervals: cores(PASSING) })), true, true);
expect('another process at 0.49 CPU-s per second is below the limit: admitted',
  A.evaluate(facts({ otherCpu: 0.49 * 9.5 })), true);
expect('the launch chain at 3 CPU-s is instrumentation: admitted',
  A.evaluate(facts({ launcherCpu: 3 })), true);
const hidden = { extra: [hiddenProc], extraB: [hiddenProc] };
expect('a process without a CPU counter is a recorded limitation, not zero and not a hold',
  A.evaluate(facts(hidden)), true);
note('the unobservable counter is counted', facts(hidden).window.unobservable === 1);

// The holds.
const hold = (name, decision) => expect(name, decision, false);
hold('a foreign timing lock at the start', A.evaluate(facts({}, { locks: lock.foreign })));
hold('a foreign timing lock before the payload', A.evaluate(facts({}, { lockRecheck: lock.foreign })));
hold('our lock naming another task', A.evaluate(facts({}, { locks: lock.other })));
hold('our lock gone before the payload', A.evaluate(facts({}, { lockRecheck: lock.gone })));
hold('no recheck of the locks before the payload', A.evaluate(facts({}, { lockRecheck: null })));
hold('another process at exactly 0.5 CPU-s per second', A.evaluate(facts({ otherCpu: 0.5 * 9.5 })));
const sibling = snapshots();
sibling.b.processes.find((p) => p.pid === 17588).cpu += 6;
hold('PID 17588 (the other copilot host) has no exemption', A.evaluate(facts({}, {
  window: A.deltasOf(sibling.a, sibling.b, LAUNCH, KEY) })));
const fresh = proc(888, 1, '2026-11-18T19:40:03.0000000+07:00', 6, 'node.exe');
hold('a heavy process that started inside the window', A.evaluate(facts({ extraB: [fresh] })));
hold('another PID observed as the host', A.evaluate(facts({}, withHost({ pid: 1969 }))));
hold('the right PID with another creation time', A.evaluate(facts({}, withHost({
  created: '2026-11-13T19:26:34.6916441+07:00', cimCreated: '2026-11-13T19:26:34.6916440+07:00' }))));
hold('a wrong parent PID', A.evaluate(facts({}, withHost({ cimParent: 26488 }))));
hold('a wrong executable', A.evaluate(facts({}, withHost({ cimExe: 'C:\\other\\copilot.exe' }))));
hold('a missing host', A.evaluate(facts({}, { host: { expected: HOST, observed: null } })));
hold('no host identity supplied', A.evaluate(facts({}, { host: { expected: null, observed: OBSERVED } })));
hold('the host missing from the second snapshot', A.evaluate(facts({ hostInB: false })));
hold('the host in the snapshots with another creation time',
  A.evaluate(facts({ hostCreated: '2026-11-13T19:26:35.0000000+07:00' })));
hold('no CPU observation of the host', A.evaluate(facts({ hostNullCpu: true })));
hold('an invalid counter interval',
  A.evaluate(facts({}, { intervals: cores([1.43, null, 0.45, 1.19, 1.33]) })));
hold('fewer than five intervals', A.evaluate(facts({}, { intervals: cores(FAILING.slice(0, 4)) })));
hold('missing process snapshots', A.evaluate(facts({}, { window: null })));
hold('the old MS18a policy name is an unknown policy here',
  A.evaluate(facts({}, { policy: 'MS18a-Q1-host-active' })));
hold('an unknown policy', A.evaluate(facts({}, { policy: 'MS18b-anything' })));
expect('without a policy the failed strict screen is not admitted',
  A.evaluate(facts({}, { policy: null })), false, false);
expect('without a policy a passing strict screen is admitted',
  A.evaluate(facts({}, { policy: null, intervals: cores(PASSING) })), true, true);

// The reporter's verdict: a payload exit 0 alone is never read as acceptable.
const admitted = {
  policy: A.POLICY, admitted: true, ready: false, environmentLabel: A.LABEL, payloadExit: 0
};
const verdict = (name, record, ok) => {
  const v = A.reportVerdict(record);
  results.push({ name: 'reportVerdict: ' + name, ok: v.ok === ok, detail: v.reason });
};
verdict('admitted under the policy, strict failed, exit 0 is acceptable', admitted, true);
note('reportVerdict says the strict screen FAILED', /FAILED/.test(A.reportVerdict(admitted).reason),
  A.reportVerdict(admitted).reason);
verdict('exit 0 with a failed strict screen and no policy', { ready: false, payloadExit: 0 }, false);
verdict('policy named but admitted false, exit 0', Object.assign({}, admitted, { admitted: false }), false);
verdict('policy named, no admitted field, exit 0',
  { policy: A.POLICY, ready: false, payloadExit: 0, environmentLabel: A.LABEL }, false);
verdict('admitted without the environment label',
  Object.assign({}, admitted, { environmentLabel: null }), false);
verdict('admitted with a non-zero payload exit', Object.assign({}, admitted, { payloadExit: 1 }), false);
verdict('admitted, payload not run (no exit)',
  Object.assign({}, admitted, { payloadExit: undefined }), false);
verdict('the old MS18a policy name', Object.assign({}, admitted, { policy: 'MS18a-Q1-host-active' }), false);
verdict('another policy name', Object.assign({}, admitted, { policy: 'other' }), false);
verdict('a strict pass under the policy', Object.assign({}, admitted, { ready: true }), true);
verdict('a strict pass without a policy, exit 0', { ready: true, payloadExit: 0 }, true);
verdict('no record', null, false);

const failed = results.filter((r) => !r.ok);
const lines = results.map((r) => (r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' -- ' + r.detail));
lines.push('');
lines.push(results.length + ' cases, ' + (results.length - failed.length) + ' pass, ' + failed.length +
  ' fail');
lines.forEach((line) => console.log(line));
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), lines.join('\r\n') + '\r\n', 'utf8');
process.exitCode = failed.length === 0 ? 0 : 1;
