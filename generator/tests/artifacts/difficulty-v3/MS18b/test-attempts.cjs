'use strict';

/*
 * MS18b task-owned test of the bounded admission re-ask with EXPERIMENT-AWARE identity (attempts.cjs). NO
 * generation, no lock, no process: the whole control flow runs against an in-memory world with a fake clock
 * and a scripted launcher.
 *   node generator/tests/artifacts/difficulty-v3/MS18b/test-attempts.cjs [out file]
 * Exit 0 when every case holds.
 */
const fs = require('fs');
const path = require('path');
const A = require('./attempts.cjs');

const POLICY = A.POLICY;
const T0 = Date.parse('2026-11-18T19:40:00.000+07:00');
const HOLD_TEXT = 'another process (svchost.exe, PID 10948) gained 3.78 CPU-s in 5.71 s ' +
  '(0.66 per second, limit 0.5)';
const HOST = {
  pid: 1968, parent: 18780, created: '2026-11-13T19:26:33.6916441+07:00', exe: 'C:\\h\\copilot.exe'
};

function entryOf(id, family, setting, variant, level, from, count) {
  const whole = count === 12;
  const identity = {
    family: family, setting: setting, variant: variant, level: level, seed: 20260101, from: from,
    count: count, total: 12,
    defaults: { shallowAllowance: 256, chainShortMax: 4, attemptsPerRequest: 'board default (8)',
      ratingVersion: 3 },
    sourceHash: 'src', toolHash: 'tool'
  };
  identity[family === 'cap' ? 'otherChainWindow' : 'otherShallowCap'] = 'default';
  const payload = ['tests\\soak.js', '--variant=' + variant, '--level=' + level, '--count=' + count];
  if (!whole) payload.push('--from=' + from, '--total-count=12');
  payload.push('--seed=20260101', '--no-gate', (family === 'cap' ? '--shallow-cap=' : '--chain-window=') +
    setting, '--json=..\\x\\' + id + '.json');
  return {
    id: id, experiment: family === 'cap' ? 'R5' : 'R9', family: family, setting: setting, variant: variant,
    level: level, shard: !whole, from: from, count: count,
    requests: Array.from({ length: count }, (_, k) => from + k), json: id + '.json', identity: identity,
    payload: payload, boundSeconds: 100, admissible: true
  };
}
const PLAN = {
  entries: [
    entryOf('cap-64-c9n', 'cap', '64', 'classic9', 'nightmare', 0, 12),
    entryOf('cap-128-c9n', 'cap', '128', 'classic9', 'nightmare', 0, 12),
    entryOf('window-4-c9n', 'window', '4', 'classic9', 'nightmare', 0, 12),
    entryOf('window-6-c9n-0-6', 'window', '6', 'classic9', 'nightmare', 0, 6),
    entryOf('window-6-c9n-6-6', 'window', '6', 'classic9', 'nightmare', 6, 6),
    entryOf('cap-none-ke-9-3', 'cap', 'none', 'killer', 'expert', 9, 3),
    entryOf('cap-256-j9e', 'cap', '256', 'jigsaw9', 'expert', 0, 12)
  ]
};
const byId = (id) => PLAN.entries.find((e) => e.id === id);

const iso = (ms) => new Date(ms).toISOString().replace('Z', '+00:00');

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
    id: id, task: 'MS18b ' + id, asked: iso(asked), finished: iso(finished), entry: entry.id,
    attempt: ordinal, identity: JSON.stringify(entry.identity), exit: 3, nodeSeconds: null, policy: POLICY,
    payload: entry.payload.join(' '), error: 'MS18b ' + id + ' command failed: 3'
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
    ready.admitted = kind !== 'holdAfterStart';
    ready.payloadStartedAt = iso(asked + 2000);
    ready.payloadExit = kind === 'fail' ? 1 : 0;
    ready.admissionHolds = [];
    text = '$ node x\nSTART t\nout\nEND t\nexit=' + ready.payloadExit + ' seconds=1\n';
    row.exit = kind === 'fail' ? 1 : 0;
    row.error = kind === 'fail' ? 'MS18b ' + id + ' command failed: 1' : null;
    row.nodeSeconds = 5;
    if (kind === 'admit') w.ledgers.add(entry.id);
    if (kind === 'holdAfterStart') {
      row.exit = 3;
      row.error = 'MS18b ' + id + ' command failed: 3';
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
const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const clone = (x) => JSON.parse(JSON.stringify(x));

// 0. the identity of a payload: exactly one experiment flag, the setting of its family, the whole key.
{
  const p = (text) => A.parsePayload(text);
  const cap = p(byId('cap-64-c9n').payload.join(' '));
  check('a cap payload parses to family cap, setting 64, the whole key', cap.ok &&
    A.canonical(cap.key) === A.canonical({ family: 'cap', setting: '64', variant: 'classic9',
      level: 'nightmare', seed: 20260101, from: 0, count: 12, total: 12 }), JSON.stringify(cap));
  const win = p(byId('window-6-c9n-6-6').payload.join(' '));
  check('a window shard parses to family window, setting 6, from 6, count 6, total 12', win.ok &&
    A.canonical(win.key) === A.canonical({ family: 'window', setting: '6', variant: 'classic9',
      level: 'nightmare', seed: 20260101, from: 6, count: 6, total: 12 }), JSON.stringify(win));
  const base = 'tests\\soak.js --variant=classic9 --level=nightmare --count=12 --seed=20260101 --no-gate';
  check('both --shallow-cap and --chain-window is invalid',
    p(base + ' --shallow-cap=64 --chain-window=4').ok === false);
  check('neither --shallow-cap nor --chain-window is invalid', p(base).ok === false);
  check('a setting outside the family is invalid (--shallow-cap=4, --chain-window=64, --chain-window=5)',
    p(base + ' --shallow-cap=4').ok === false && p(base + ' --chain-window=64').ok === false &&
    p(base + ' --chain-window=5').ok === false);
  check('a repeated flag is invalid', p(base + ' --shallow-cap=64 --shallow-cap=128').ok === false);
  check('a command that is not the soak is not a soak row', p('--version').soak === false);
  check('a payload without --seed is invalid', p('tests\\soak.js --variant=a --level=b --count=1 ' +
    '--shallow-cap=64').ok === false);
}

// 1. held-then-admitted starts exactly one payload, after the 60 s wait counted from the recorded release.
{
  const w = world();
  addAttempt(w, byId('cap-64-c9n'), 1, 'hold');
  const release = Date.parse(w.records[0].finished);
  w.time = release + 20000;
  const out = A.run(['cap-64-c9n'], w.deps());
  check('held-then-admitted: exactly one launch, attempt 2', sameList(w.launches, ['cap-64-c9n#2']),
    w.launches.join());
  check('the wait is 60 s after the recorded release and elapsed time counts',
    w.sleeps.length === 1 && w.sleeps[0] === 40000, JSON.stringify(w.sleeps));
  check('the re-ask is asked at least 60 s after the release',
    Date.parse(w.records[1].asked) >= release + 60000, w.records[1].asked);
  check('the sleep happens with no lock held', w.sleepLockStates.every((s) => s === false));
  check('attempt 2 has its distinct id, the entry mapping and the entry identity',
    w.records[1].id === 'cap-64-c9n-admission2' && w.records[1].entry === 'cap-64-c9n' &&
    w.records[1].attempt === 2 && w.records[1].identity === w.records[0].identity);
  check('attempt 1 is untouched',
    w.records[0].id === 'cap-64-c9n' && w.ready['cap-64-c9n'].admitted === false);
  check('the entry is done and the status complete', out.results[0].status === 'done' && out.exitCode === 0,
    out.lines.join(' | '));
  const again = A.run(['cap-64-c9n'], w.deps());
  check('a second call never reruns a completed payload', w.launches.length === 1 && again.exitCode === 0);
}
// 1b. the elapsed time already covers the wait: no sleep.
{
  const w = world();
  addAttempt(w, byId('cap-64-c9n'), 1, 'hold');
  w.time = Date.parse(w.records[0].finished) + 75000;
  A.run(['cap-64-c9n'], w.deps());
  check('elapsed time beyond 60 s needs no sleep', w.sleeps.length === 0 && w.launches[0] === 'cap-64-c9n#2');
}
// 2. the same span at another setting or in the other family is a different entry with its own quota.
{
  const w = world();
  addAttempt(w, byId('cap-64-c9n'), 1, 'hold');
  addAttempt(w, byId('cap-64-c9n'), 2, 'hold');
  const out = A.run(['cap-128-c9n', 'window-4-c9n'], w.deps());
  check('two holds of cap 64 leave cap 128 (same variant, level, span) and window 4 their own attempt 1',
    sameList(w.launches, ['cap-128-c9n#1', 'window-4-c9n#1']) && out.exitCode === 0, w.launches.join());
  const stale = A.run(['cap-64-c9n'], w.deps());
  check('cap 64 itself is an exhausted gap: no third attempt, exit 4',
    stale.exitCode === 4 && w.launches.length === 2, stale.lines.join(' | '));
  const w2 = world({ 'cap-128-c9n': ['hold', 'admit'] });
  addAttempt(w2, byId('cap-64-c9n'), 1, 'hold');
  A.run(['cap-128-c9n'], w2.deps());
  const own = w2.records.filter((r) => r.entry === 'cap-64-c9n').length;
  check('a hold of cap 128 never counts against cap 64 or the window entry',
    own === 1 && w2.records.filter((r) => r.entry === 'cap-128-c9n').length === 2, w2.launches.join());
}
// 3. twice-held starts no third payload, the next entry runs, the status stays INCOMPLETE (exit 4).
{
  const w = world({ 'window-6-c9n-0-6': ['hold', 'hold'] });
  const out = A.run(['window-6-c9n-0-6', 'window-6-c9n-6-6'], w.deps());
  check('twice held: two attempts, then the next entry is launched',
    sameList(w.launches, ['window-6-c9n-0-6#1', 'window-6-c9n-0-6#2', 'window-6-c9n-6-6#1']),
    w.launches.join());
  check('the second launch of the entry is at least 60 s after the first release',
    Date.parse(w.records[1].asked) >= Date.parse(w.records[0].finished) + 60000);
  check('the entry is a named gap with its unexecuted requests',
    out.results[0].status === 'gap' && out.lines[0].indexOf('unexecuted requests 0, 1, 2, 3, 4, 5') !== -1 &&
    out.lines[0].indexOf('window 6 classic9 nightmare 0-5') !== -1, out.lines[0]);
  check('INCOMPLETE and exit 4 even though the later entry completed',
    out.results[1].status === 'done' && out.exitCode === 4 &&
    /INCOMPLETE/.test(out.lines[out.lines.length - 1]), out.lines.join(' | '));
  check('no ledger is invented for the gap',
    !w.ledgers.has('window-6-c9n-0-6') && w.ledgers.has('window-6-c9n-6-6'));
  // 4. restarts, renames and a revised plan cannot reset the quota or overwrite records.
  const before = w.records.length;
  const restart = A.run(['window-6-c9n-0-6'], w.deps());
  check('a restart makes no launch for an exhausted entry',
    w.launches.length === 3 && restart.exitCode === 4);
  const revised = clone(PLAN);
  revised.entries[3].boundSeconds = 1;
  A.run(['window-6-c9n-0-6'], w.deps(revised));
  check('a revised plan does not renew the quota', w.launches.length === 3 && w.records.length === before);
  const renamed = clone(PLAN);
  renamed.entries[3].id = 'renamed-entry';
  renamed.entries[3].json = 'renamed-entry.json';
  const outRenamed = A.run(['renamed-entry'], w.deps(renamed));
  check('a renamed entry with the same full identity consumes its quota: its rows are aliases, it stops',
    outRenamed.exitCode === 1 && w.launches.length === 3 && w.records.length === before,
    outRenamed.lines.join(' | '));
  const alias = Object.assign({}, w.records[0], { id: 'beta-retry', attempt: undefined, entry: undefined });
  w.records.push(alias);
  const aliased = A.run(['window-6-c9n-0-6'], w.deps());
  check('a row under another name for the same identity still counts and stops the driver',
    aliased.exitCode === 1 && w.launches.length === 3, aliased.lines.join(' | '));
}
// 5. a plan with two entries of one identity (a renamed duplicate) never launches.
{
  const w = world();
  const dup = clone(PLAN);
  dup.entries.push(Object.assign(clone(byId('cap-64-c9n')), { id: 'cap-64-c9n-renamed', json: 'r.json' }));
  const out = A.run(['cap-64-c9n-renamed', 'cap-64-c9n'], w.deps(dup));
  check('two plan entries with one full identity: stops before any launch',
    out.exitCode === 1 && w.launches.length === 0 && /same identity/.test(out.lines.join(' ')),
    out.lines.join(' | '));
}
// 6. invalid or inconsistent experiment identities stop.
{
  const bothFlags = clone(PLAN);
  bothFlags.entries[0].payload.push('--chain-window=4');
  const w = world();
  const out = A.run(['cap-64-c9n'], w.deps(bothFlags));
  check('a plan payload with both flags stops before any launch',
    out.exitCode === 1 && w.launches.length === 0,
    out.lines.join(' | '));
  const mismatch = clone(PLAN);
  mismatch.entries[0].identity.setting = '128';
  const w2 = world();
  const out2 = A.run(['cap-64-c9n'], w2.deps(mismatch));
  check('a plan payload that disagrees with its identity (setting 64 against 128) stops',
    out2.exitCode === 1 && w2.launches.length === 0, out2.lines.join(' | '));
  const noOther = clone(PLAN);
  delete noOther.entries[0].identity.otherChainWindow;
  const w3 = world();
  check('an entry that does not state the other effective default stops',
    A.run(['cap-64-c9n'], w3.deps(noOther)).exitCode === 1 && w3.launches.length === 0);
  const bad = (name, mutate) => {
    const w4 = world();
    addAttempt(w4, byId('cap-128-c9n'), 1, 'admit', {});
    mutate(w4.records[0]);
    const out4 = A.run(['cap-64-c9n'], w4.deps());
    check(name, out4.exitCode === 1 && w4.launches.length === 0, out4.lines.join(' | '));
  };
  bad('a lock-log row with both flags stops the driver for every entry',
    (row) => { row.payload += ' --chain-window=4'; });
  bad('a lock-log row with neither flag stops the driver for every entry',
    (row) => { row.payload = row.payload.replace(' --shallow-cap=128', ''); });
  bad('a lock-log row with a setting outside the experiment stops',
    (row) => { row.payload = row.payload.replace('--shallow-cap=128', '--shallow-cap=100'); });
  const w5 = world();
  addAttempt(w5, byId('cap-64-c9n'), 1, 'hold');
  w5.records[0].identity = JSON.stringify(Object.assign({}, byId('cap-64-c9n').identity, { seed: 1 }));
  const out5 = A.run(['cap-64-c9n'], w5.deps());
  check('a row whose identity differs from the plan entry stops',
    out5.exitCode === 1 && w5.launches.length === 0,
    out5.lines.join(' | '));
  const w6 = world();
  addAttempt(w6, byId('cap-64-c9n'), 1, 'hold');
  w6.records[0].identity = '';
  check('a row without an identity stops', A.run(['cap-64-c9n'], w6.deps()).exitCode === 1 &&
    w6.launches.length === 0);
  const w7 = world();
  addAttempt(w7, byId('cap-64-c9n'), 1, 'hold');
  w7.records[0].identity = JSON.stringify(Object.assign({}, byId('cap-64-c9n').identity,
    { defaults: { shallowAllowance: 512 } }));
  check('a row whose source or default configuration differs stops',
    A.run(['cap-64-c9n'], w7.deps()).exitCode === 1 && w7.launches.length === 0);
}
// 7. unexpected situations stop and launch nothing further.
const stopCase = (name, kind) => {
  const w = world({ 'cap-64-c9n': [kind] });
  const out = A.run(['cap-64-c9n', 'cap-128-c9n'], w.deps());
  check(name + ': stops, launches nothing after it',
    out.exitCode === 1 && w.launches.join() === 'cap-64-c9n#1' &&
    !w.ledgers.has('cap-128-c9n'), out.lines.join(' | '));
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
  const w = world({ 'cap-64-c9n': ['hold', 'fail'] });
  const out = A.run(['cap-64-c9n', 'cap-128-c9n'], w.deps());
  check('attempt 2 failing after a hold stops (no third attempt, no next entry)',
    out.exitCode === 1 && w.launches.join() === 'cap-64-c9n#1,cap-64-c9n#2', w.launches.join());
}
{
  const w = world();
  w.ledgers.add('cap-64-c9n');
  const out = A.run(['cap-64-c9n'], w.deps());
  check('a ledger without any attempt record stops and launches nothing',
    out.exitCode === 1 && w.launches.length === 0, out.lines.join(' | '));
}
{
  const w = world();
  const e = byId('cap-64-c9n');
  addAttempt(w, e, 1, 'hold');
  addAttempt(w, e, 2, 'hold');
  addAttempt(w, e, 2, 'hold', { id: 'cap-64-c9n-admission2-again' });
  const out = A.run(['cap-64-c9n'], w.deps());
  check('a third row for the identity stops', out.exitCode === 1 && w.launches.length === 0,
    out.lines.join(' | '));
}
{
  const w = world();
  addAttempt(w, byId('cap-64-c9n'), 1, 'hold');
  w.time = Date.parse(w.records[0].finished) + 1000;
  w.lock = true;
  const out = A.run(['cap-64-c9n'], w.deps());
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
  addAttempt(w, byId('cap-256-j9e'), 1, 'hold');
  addAttempt(w, byId('cap-256-j9e'), 2, 'admit');
  const out = A.run(['cap-256-j9e'], w.deps());
  check('an entry already completed by its second attempt is done and never relaunched',
    out.exitCode === 0 && w.launches.length === 0 && out.results[0].reason.indexOf('never rerun') !== -1);
}
{
  const w = world();
  addAttempt(w, byId('cap-256-j9e'), 1, 'admit');
  const out = A.run(['cap-256-j9e'], w.deps());
  check('a completed entry is never relaunched', out.exitCode === 0 && w.launches.length === 0);
}
{
  const w = world({ 'cap-none-ke-9-3': ['hold', 'admit'] });
  const out = A.run(['cap-256-j9e', 'cap-none-ke-9-3'], w.deps());
  check('held-then-admitted plus a plain success in one call: complete, three launches, one sleep of 60 s',
    out.exitCode === 0 && sameList(w.launches, ['cap-256-j9e#1', 'cap-none-ke-9-3#1', 'cap-none-ke-9-3#2']) &&
    w.sleeps.length === 1, w.launches.join() + ' ' + JSON.stringify(w.sleeps));
}

// 8. the real launch scripts keep the same refusals (read as text, nothing is run).
const entryScript = fs.readFileSync(path.join(__dirname, 'run-entry.ps1'), 'utf8');
check('run-entry.ps1 maps attempt 2 to <entry>-admission2 and refuses an existing ledger or record',
  /-admission2/.test(entryScript) && /payload is never rerun/.test(entryScript) &&
  /never overwritten/.test(entryScript) && /at most two/.test(entryScript));
check('run-entry.ps1 passes the plan identity and refuses an inadmissible entry',
  /-Identity \$identity/.test(entryScript) && /is not admissible/.test(entryScript));
const driveText = fs.readFileSync(path.join(__dirname, 'drive.cjs'), 'utf8');
check('drive.cjs starts attempts only through run-entry.ps1 with -Attempt',
  /run-entry\.ps1/.test(driveText) && /'-Attempt'/.test(driveText));
const lockedText = fs.readFileSync(path.join(__dirname, 'run-locked.ps1'), 'utf8');
check('run-locked.ps1 records the entry, the attempt and the plan identity of every command',
  /attempt = \$Attempt; identity = \$Identity/.test(lockedText) && /MS18b-host-active/.test(lockedText));

const failed = results.filter((r) => !r.ok);
const lines = results.map((r) => (r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' [' + r.detail + ']'));
lines.push('');
lines.push(results.length + ' cases, ' + (results.length - failed.length) + ' pass, ' + failed.length +
  ' fail');
lines.forEach((line) => console.log(line));
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), lines.join('\r\n') + '\r\n', 'utf8');
process.exitCode = failed.length === 0 ? 0 : 1;
