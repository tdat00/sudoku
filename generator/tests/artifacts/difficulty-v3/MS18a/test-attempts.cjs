'use strict';

/*
 * MS18a task-owned test of the bounded admission re-ask (attempts.cjs, MS18a-Q2). NO generation, no lock, no
 * process: the whole control flow runs against an in-memory world with a fake clock and a scripted launcher.
 *   node generator/tests/artifacts/difficulty-v3/MS18a/test-attempts.cjs [out file]
 * Exit 0 when every case holds.
 */
const fs = require('fs');
const path = require('path');
const A = require('./attempts.cjs');

const POLICY = A.POLICY;
const T0 = Date.parse('2026-11-18T18:30:00.000+07:00');
const HOLD_TEXT = 'another process (svchost.exe, PID 10948) gained 3.78 CPU-s in 5.71 s ' +
  '(0.66 per second, limit 0.5)';
const HOST = {
  pid: 1968, parent: 18780, created: '2026-11-13T19:26:33.6916441+07:00', exe: 'C:\\h\\copilot.exe'
};

const entryOf = (id, variant, level, from, count) => ({
  id: id, variant: variant, level: level, shard: count !== 12, from: from, count: count,
  requests: Array.from({ length: count }, (_, k) => from + k), json: 'shards\\' + id + '.json'
});
const PLAN = {
  entries: [
    entryOf('alpha', 'killer', 'expert', 9, 3), entryOf('beta', 'jigsaw9', 'normal', 0, 12),
    entryOf('gamma', 'jigsaw9', 'hard', 0, 12), entryOf('delta', 'jigsaw9', 'expert', 0, 12),
    entryOf('epsilon', 'diagonalX', 'nightmare', 0, 4)
  ]
};

const iso = (ms) => new Date(ms).toISOString().replace('Z', '+00:00');
const payloadOf = (e) => 'tests\\soak.js --variant=' + e.variant + ' --level=' + e.level + ' --count=' +
  e.count + (e.shard ? ' --from=' + e.from + ' --total-count=12' : '') + ' --seed=20260101 --no-gate';

function world(script) {
  const w = {
    records: [], ready: {}, text: {}, ledgers: new Set(), time: T0, lock: false, launches: [], sleeps: [],
    sleepLockStates: [], script: script || {}, logLines: []
  };
  w.store = {
    records: () => w.records.slice(),
    readiness: (id) => (w.ready[id] === undefined ? null : w.ready[id]),
    transcript: (id) => (w.text[id] === undefined ? null : w.text[id]),
    ledgerExists: (entry) => w.ledgers.has(entry.id)
  };
  w.deps = (plan) => ({
    plan: plan || PLAN, store: w.store, now: () => w.time, lockHeld: () => w.lock,
    log: (l) => w.logLines.push(l),
    sleep: (ms) => { w.sleeps.push(ms); w.sleepLockStates.push(w.lock); w.time += ms; },
    launch: (entry, ordinal) => {
      w.launches.push(entry.id + '#' + ordinal);
      w.lock = true;
      const kind = (w.script[entry.id] || [])[ordinal - 1] || 'admit';
      addAttempt(w, entry, ordinal, kind);
      w.lock = false;
      w.time += 15000;
    }
  });
  return w;
}

function addAttempt(w, entry, ordinal, kind, extra) {
  const id = ordinal === 1 ? entry.id : entry.id + '-admission2';
  const asked = w.time + 1000;
  const finished = w.time + 9000;
  const row = {
    id: id, task: 'MS18a ' + id, asked: iso(asked), finished: iso(finished), entry: entry.id,
    attempt: ordinal, exit: 3, nodeSeconds: null, policy: POLICY, payload: payloadOf(entry),
    error: 'MS18a ' + id + ' command failed: 3'
  };
  const cores = [1.4, 1.1, 1.2, 1.3, 1.0].map((c) => ({ busyCores: c }));
  const ready = {
    policy: POLICY, admitted: false, ready: false, intervals: cores, admissionHolds: [HOLD_TEXT],
    hostObservation: {
      expected: HOST, observed: Object.assign({ cimName: 'copilot.exe', cimParent: 18780, cimExe: HOST.exe },
        { pid: 1968, created: HOST.created }), inBothSnapshots: true
    },
    locks: { foreign: { present: false }, ownMatchesTask: true },
    lockRecheck: { foreign: { present: false }, ownMatchesTask: true }
  };
  let text = '$ node x\nNOT STARTED: ' + HOLD_TEXT + '\n';
  if (kind === 'admit' || kind === 'fail' || kind === 'holdAfterStart') {
    ready.admitted = kind !== 'holdAfterStart' ? true : false;
    ready.payloadStartedAt = iso(asked + 2000);
    ready.payloadExit = kind === 'fail' ? 1 : 0;
    ready.admissionHolds = [];
    text = '$ node x\nSTART t\nout\nEND t\nexit=' + ready.payloadExit + ' seconds=1\n';
    row.exit = kind === 'fail' ? 1 : 0;
    row.error = kind === 'fail' ? 'MS18a ' + id + ' command failed: 1' : null;
    row.nodeSeconds = 5;
    if (kind === 'admit') w.ledgers.add(entry.id);
    if (kind === 'holdAfterStart') {
      row.exit = 3;
      row.error = 'MS18a ' + id + ' command failed: 3';
      ready.payloadExit = undefined;
      text = '$ node x\nSTART t\nNOT STARTED: ' + HOLD_TEXT + '\n';
    }
  }
  if (kind === 'timeout') {
    row.exit = 0;
    row.error = '540-second limit reached; record the timeout';
  }
  if (kind === 'holdMixed') {
    ready.admissionHolds = [HOLD_TEXT, 'a foreign dv3-timing.lock appeared before the payload'];
  }
  if (kind === 'holdForeign') ready.admissionHolds = ['a foreign dv3-timing.lock was present at the start'];
  if (kind === 'holdHost') ready.admissionHolds = ['host PID 1969 is not the confirmed 1968'];
  if (kind === 'holdCounters') ready.intervals[2].busyCores = null;
  if (kind === 'holdLowRate') {
    ready.admissionHolds = ['another process (x.exe, PID 7) gained 1.00 CPU-s in 5.00 s ' +
      '(0.20 per second, limit 0.5)'];
  }
  if (kind === 'holdHostItself') ready.admissionHolds = [HOLD_TEXT.replace('PID 10948', 'PID 1968')];
  if (kind === 'holdNoVerify') ready.hostObservation.inBothSnapshots = false;
  if (kind === 'holdDirtyLock') ready.lockRecheck = { foreign: { present: true }, ownMatchesTask: true };
  if (kind === 'holdLedger') w.ledgers.add(entry.id);
  if (kind === 'noReadiness') {
    w.records.push(row);
    return;
  }
  Object.assign(row, extra || {});
  w.records.push(row);
  w.ready[id] = ready;
  w.text[id] = text;
}

const results = [];
const check = (name, ok, detail) => results.push({ name: name, ok: ok === true, detail: detail || '' });
const quiet = (t) => ' [' + t + ']';

// 1. held-then-admitted starts exactly one payload, after the 60 s wait counted from the recorded release.
{
  const w = world();
  addAttempt(w, PLAN.entries[0], 1, 'hold');
  const release = Date.parse(w.records[0].finished);
  w.time = release + 20000;
  const out = A.run(['alpha'], w.deps());
  check('held-then-admitted: exactly one launch, attempt 2', sameList(w.launches, ['alpha#2']),
    w.launches.join());
  check('the wait is 60 s after the recorded release and elapsed time counts',
    w.sleeps.length === 1 && w.sleeps[0] === 40000, JSON.stringify(w.sleeps));
  check('the re-ask is asked at least 60 s after the release',
    Date.parse(w.records[1].asked) >= release + 60000, w.records[1].asked);
  check('the sleep happens with no lock held', w.sleepLockStates.every((s) => s === false));
  check('attempt 2 has its distinct id and the entry mapping',
    w.records[1].id === 'alpha-admission2' && w.records[1].entry === 'alpha' && w.records[1].attempt === 2);
  check('attempt 1 is untouched', w.records[0].id === 'alpha' && w.ready.alpha.admitted === false);
  check('the entry is done and the status complete', out.results[0].status === 'done' && out.exitCode === 0,
    out.lines.join(' | '));
  const again = A.run(['alpha'], w.deps());
  check('a second call never reruns a completed payload', w.launches.length === 1 && again.exitCode === 0);
}
// 1b. the elapsed time already covers the wait: no sleep.
{
  const w = world();
  addAttempt(w, PLAN.entries[0], 1, 'hold');
  w.time = Date.parse(w.records[0].finished) + 75000;
  A.run(['alpha'], w.deps());
  check('elapsed time beyond 60 s needs no sleep', w.sleeps.length === 0 && w.launches[0] === 'alpha#2');
}
// 2. twice-held starts no third payload, the next entry runs, the status stays INCOMPLETE (exit 4).
{
  const w = world({ beta: ['hold', 'hold'] });
  const out = A.run(['beta', 'gamma'], w.deps());
  check('twice held: two attempts, then the next entry is launched',
    sameList(w.launches, ['beta#1', 'beta#2', 'gamma#1']), w.launches.join());
  check('the second launch of the entry is at least 60 s after the first release',
    Date.parse(w.records[1].asked) >= Date.parse(w.records[0].finished) + 60000);
  check('the entry is a named gap with its unexecuted requests',
    out.results[0].status === 'gap' && out.lines[0].indexOf('unexecuted requests 0, 1, 2') !== -1,
    out.lines[0]);
  check('INCOMPLETE and exit 4 even though the later entry completed',
    out.results[1].status === 'done' && out.exitCode === 4 &&
    /INCOMPLETE/.test(out.lines[out.lines.length - 1]),
    out.lines.join(' | '));
  check('no ledger is invented for the gap', !w.ledgers.has('beta') && w.ledgers.has('gamma'));
  // 3. restarts, renames and a revised plan cannot reset the quota or overwrite records.
  const before = w.records.length;
  const restart = A.run(['beta'], w.deps());
  check('a restart makes no launch for an exhausted entry',
    w.launches.length === 3 && restart.exitCode === 4);
  const revised = JSON.parse(JSON.stringify(PLAN));
  revised.entries[1].boundSeconds = 1;
  A.run(['beta'], w.deps(revised));
  check('a revised plan does not renew the quota', w.launches.length === 3 && w.records.length === before);
  const alias = Object.assign({}, w.records[0], { id: 'beta-retry', attempt: undefined, entry: undefined });
  w.records.push(alias);
  const aliased = A.run(['beta'], w.deps());
  check('a row under another name for the same span still counts and stops the driver',
    aliased.exitCode === 1 && w.launches.length === 3, aliased.lines.join(' | '));
}
// 4. unexpected situations stop and launch nothing further.
const stopCase = (name, kind) => {
  const w = world({ beta: [kind] });
  const out = A.run(['beta', 'gamma'], w.deps());
  check(name + ': stops, launches nothing after it', out.exitCode === 1 && w.launches.join() === 'beta#1' &&
    !w.ledgers.has('gamma'), out.lines.join(' | '));
};
stopCase('a payload failure (exit 1, payload started)', 'fail');
stopCase('a timeout at the 540 s ceiling', 'timeout');
stopCase('a claimed hold after the payload started', 'holdAfterStart');
stopCase('a hold with a mixed reason', 'holdMixed');
stopCase('a hold for a foreign lock only', 'holdForeign');
stopCase('a hold for a wrong host', 'holdHost');
stopCase('invalid aggregate counters', 'holdCounters');
stopCase('a consumer below the limit (inconsistent hold)', 'holdLowRate');
stopCase('the host itself named as the consumer', 'holdHostItself');
stopCase('a host not verified in both snapshots', 'holdNoVerify');
stopCase('a dirty lock recheck', 'holdDirtyLock');
stopCase('a ledger present after an exit 3', 'holdLedger');
stopCase('a lock-log row without a readiness record', 'noReadiness');
{
  const w = world({ beta: ['hold', 'fail'] });
  const out = A.run(['beta', 'gamma'], w.deps());
  check('attempt 2 failing after a hold stops (no third attempt, no next entry)',
    out.exitCode === 1 && w.launches.join() === 'beta#1,beta#2', w.launches.join());
}
{
  const w = world();
  w.ledgers.add('beta');
  const out = A.run(['beta'], w.deps());
  check('a ledger without any attempt record stops and launches nothing',
    out.exitCode === 1 && w.launches.length === 0, out.lines.join(' | '));
}
{
  const w = world();
  addAttempt(w, PLAN.entries[1], 1, 'hold');
  addAttempt(w, PLAN.entries[1], 2, 'hold');
  addAttempt(w, PLAN.entries[1], 2, 'hold', { id: 'beta-admission2-again' });
  const out = A.run(['beta'], w.deps());
  check('a third row for the span stops', out.exitCode === 1 && w.launches.length === 0,
    out.lines.join(' | '));
}
{
  const w = world();
  addAttempt(w, PLAN.entries[0], 1, 'hold');
  w.time = Date.parse(w.records[0].finished) + 1000;
  w.lock = true;
  const out = A.run(['alpha'], w.deps());
  check('a lock held before the wait stops', out.exitCode === 1 && w.launches.length === 0,
    out.lines.join(' | '));
}
{
  const w = world();
  const out = A.run(['not-an-entry'], w.deps());
  check('an unknown entry stops', out.exitCode === 1 && w.launches.length === 0);
}
{
  const w = world();
  addAttempt(w, PLAN.entries[2], 1, 'hold');
  addAttempt(w, PLAN.entries[2], 2, 'admit');
  const out = A.run(['gamma'], w.deps());
  check('an entry already completed by its second attempt is done and never relaunched',
    out.exitCode === 0 && w.launches.length === 0 && out.results[0].reason.indexOf('never rerun') !== -1);
}
{
  const w = world();
  addAttempt(w, PLAN.entries[2], 1, 'admit');
  const out = A.run(['gamma'], w.deps());
  check('a completed entry (the 14 earlier commands) is never relaunched',
    out.exitCode === 0 && w.launches.length === 0);
}
const keyText = (e) => JSON.stringify(A.payloadKey(payloadOf(e)));
check('the payload key ignores the id and reads --from/--count',
  keyText(PLAN.entries[0]) === '{"variant":"killer","level":"expert","from":9,"count":3}' &&
  keyText(PLAN.entries[1]) === '{"variant":"jigsaw9","level":"normal","from":0,"count":12}');

// 5. the real launch scripts keep the same refusals (read as text, nothing is run).
const entryScript = fs.readFileSync(path.join(__dirname, 'run-entry.ps1'), 'utf8');
check('run-entry.ps1 maps attempt 2 to <entry>-admission2 and refuses an existing ledger or record',
  /-admission2/.test(entryScript) && /payload is never rerun/.test(entryScript) &&
  /never overwritten/.test(entryScript) && /at most two/.test(entryScript));
const driveText = fs.readFileSync(path.join(__dirname, 'drive.cjs'), 'utf8');
check('drive.cjs starts attempts only through run-entry.ps1 with -Attempt',
  /run-entry\.ps1/.test(driveText) &&
  /'-Attempt'/.test(driveText));

function sameList(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
const failed = results.filter((r) => !r.ok);
const lines = results.map((r) => (r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : quiet(r.detail)));
lines.push('');
lines.push(results.length + ' cases, ' + (results.length - failed.length) + ' pass, ' + failed.length +
  ' fail');
lines.forEach((line) => console.log(line));
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), lines.join('\r\n') + '\r\n', 'utf8');
process.exitCode = failed.length === 0 ? 0 : 1;
