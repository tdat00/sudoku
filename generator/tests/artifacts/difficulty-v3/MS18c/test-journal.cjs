'use strict';

/*
 * MS18c Stage 3 FAKE-DATA tests of journal.cjs: the S-OD14 counters and recovery policy on fake journals
 * (live-run adoption, complete/hidden record refusal, unchanged counters across restarts and aliases,
 * the explicit fault classes and the journalled facts each label needs, a missing or unclaimed
 * authorization, the close-out of a lost run that grants nothing, the separate slot-2 admission budget,
 * a readable record recovered after a loss, corrupt or partial artifacts, partial files preserved, the
 * permanent gap) plus the hash chain on real appends in a scratch folder of the repository
 * (`.scratch-*`, ignored by git, removed afterwards). No solver, no payload.
 *   node generator/tests/artifacts/difficulty-v3/MS18c/test-journal.cjs
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('./util.cjs');
const journal = require('./journal.cjs');

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

const EPOCH = 'MS18c-GQ-20261118-01';
const CELL = 'classic4/veryEasy';
const T0 = Date.parse('2026-11-20T01:00:00.000Z');
const SUP = { pid: 4242, createdUtcMicros: '2026-11-20T01:00:00.123456Z' };

/** A chain of fake events: each is [type, fields, secondsFromT0]. */
function chain(list) {
  const events = [];
  let prev = util.ZERO_HASH;
  list.forEach(([type, fields, sec], i) => {
    const at = new Date(T0 + (sec || 0) * 1000).toISOString();
    const e = Object.assign({ seq: i + 1, prev: prev, at: at, type: type }, fields);
    e.hash = journal.hashOf(e);
    events.push(e);
    prev = e.hash;
  });
  return events;
}
const ids = (slot, ordinal) => ({ slot: slot, ordinal: ordinal, runId: 'r' + slot + ordinal });
const open = () => ['cell-open', { epoch: EPOCH, cell: CELL, manifestBlob: 'b'.repeat(40) }, 0];
const begin = (slot, ordinal, sec) => ['admission-begin', Object.assign(ids(slot, ordinal),
  { supervisor: SUP }), sec];
const hold = (slot, ordinal, eligible, sec, kind, over) => ['admission-hold',
  Object.assign(ids(slot, ordinal), { kind: kind || 'additional-consumer', eligible: eligible,
    launcherExit: 3, tExpired: false }, over), sec];
const intent = (slot, ordinal, sec) => ['launch-intent', ids(slot, ordinal), sec];
const created = (slot, ordinal, sec) => ['qualifier-created', Object.assign(ids(slot, ordinal),
  { rSeconds: 2 }), sec];
const pend = (slot, ordinal, sec, over) => ['payload-end', Object.assign(ids(slot, ordinal),
  { exitCode: 1, tExpired: false }, over), sec];
const post = (slot, ordinal, verdict, sec) => ['postcheck', Object.assign(ids(slot, ordinal),
  { verdict: verdict }), sec];
const end = (slot, ordinal, outcome, sec) => ['attempt-end', Object.assign(ids(slot, ordinal),
  { outcome: outcome }), sec];
const lost = (slot, ordinal, sec) => end(slot, ordinal, 'supervisor-lost', sec);
const claim = (sec) => ['recovery-claim', { slot: 2, authorization: { blob: 'c'.repeat(40) } }, sec];

const CTX = (over) => Object.assign({ nowMs: T0 + 3600 * 1000, epoch: EPOCH, live: null, diskComplete: false,
  openRecord: null, recordCandidates: [], recoveryAuth: null }, over);
const decide = (list, ctx) => journal.decideNext(journal.reduce(chain(list)), CTX(ctx));
const facts = (list) => journal.recoveryFacts(journal.reduce(chain(list)));
const AUTH = { ok: true };
const DEAD = { matches: false, dead: true };

/** Slot 1 whose payload ran and was killed on T: begin, intent, created, payload end (T), no record. */
const tKill = () => [open(), begin(1, 1, 10), intent(1, 1, 20), created(1, 1, 21),
  pend(1, 1, 25, { tExpired: true }), end(1, 1, 'no-record', 30)];
/** Slot 1 whose payload failed on its own (a worker fault): the same, with no T expiry. */
const workerFault = () => [open(), begin(1, 1, 10), intent(1, 1, 20), created(1, 1, 21),
  pend(1, 1, 25), end(1, 1, 'no-record', 30)];
const preIntentHold = (exit, over) => [open(), begin(1, 1, 10),
  hold(1, 1, false, 12, 'launcher-fault', Object.assign({ launcherExit: exit }, over)),
  end(1, 1, 'unstarted-hold', 13)];
const lostSlot1 = () => [open(), begin(1, 1, 10), lost(1, 1, 30)];

test('a fresh cell starts slot 1 admission 1, and the counters only come from the journal', () => {
  const first = { action: 'start', slot: 1, ordinal: 1 };
  assert.deepStrictEqual(journal.decideNext(journal.reduce([]), CTX()), first);
  assert.deepStrictEqual(decide([open()]), first);
});

test('a live matching supervisor is adopted: no new admission, no launch', () => {
  const list = [open(), begin(1, 1, 10), intent(1, 1, 20)];
  const adopt = decide(list, { live: { matches: true } });
  assert.deepStrictEqual(adopt, { action: 'adopt', runId: 'r11', slot: 1, ordinal: 1 });
  const reused = decide(list, { live: { matches: false } });
  assert.strictEqual(reused.code, 'ambiguous-open-attempt');
  assert.strictEqual(decide(list).code, 'ambiguous-open-attempt');
  // Adoption wins over a record that is being written by that very supervisor.
  assert.strictEqual(decide(list, { live: { matches: true }, diskComplete: true }).action, 'adopt');
});

test('a complete record is never rerun, hidden, early-stopped or under review', () => {
  ['accepted', 'review'].forEach((verdict) => {
    const list = [open(), begin(1, 1, 10), intent(1, 1, 20), created(1, 1, 21), post(1, 1, verdict, 900),
      end(1, 1, 'complete-' + verdict, 901)];
    const d = decide(list, { recoveryAuth: AUTH });
    assert.strictEqual(d.code, 'complete-record', verdict);
    assert.ok(/never rerun/.test(d.reason));
    assert.deepStrictEqual(facts(list).classes, [], 'a complete record supports no recovery');
  });
  // Also a complete record found in a recovery slot.
  const rec = [].concat(tKill(), [claim(40), begin(2, 1, 50), intent(2, 1, 60), post(2, 1, 'accepted', 900),
    end(2, 1, 'complete-accepted', 901)]);
  assert.strictEqual(decide(rec, { recoveryAuth: AUTH }).code, 'complete-record');
});

test('a late or unjournaled record on disk blocks any relaunch, even with an authorization', () => {
  assert.strictEqual(decide([open()], { diskComplete: true }).code, 'unjournaled-complete-record');
  assert.strictEqual(decide(tKill(), { diskComplete: true, recoveryAuth: AUTH }).code,
    'unjournaled-complete-record');
  assert.strictEqual(decide([open(), begin(1, 1, 10), hold(1, 1, true, 12), end(1, 1, 'hold', 13)],
    { diskComplete: true }).code, 'unjournaled-complete-record');
});

test('counters survive restarts, renamed runs, other PIDs and a new agent; no epoch escape', () => {
  const list = [open(), begin(1, 1, 10), hold(1, 1, true, 12), end(1, 1, 'hold', 13)];
  const a = journal.decideNext(journal.reduce(chain(list)), CTX({ nowMs: T0 + 100 * 1000 }));
  const renamed = list.map(([t, f, s]) => [t, Object.assign({}, f,
    f.runId ? { runId: 'another-name' } : {},
    f.supervisor ? { supervisor: { pid: 7, createdUtcMicros: 'x' } } : {}), s]);
  const b = journal.decideNext(journal.reduce(chain(renamed)), CTX({ nowMs: T0 + 100 * 1000 }));
  assert.deepStrictEqual([a.action, a.slot, a.ordinal], ['start', 1, 2]);
  assert.deepStrictEqual([b.action, b.slot, b.ordinal], ['start', 1, 2]);
  const epoch = journal.decideNext(journal.reduce(chain(list)), CTX({ epoch: 'MS18c-GQ-20261119-01' }));
  assert.strictEqual(epoch.code, 'epoch-mismatch');
  const again = journal.decideNext(journal.reduce(chain(list)), CTX({ nowMs: T0 + 100 * 1000 }));
  assert.deepStrictEqual(again, a);
});

test('a second admission is only for an eligible unstarted CPU hold, 60 s after its release', () => {
  const held = (eligible, kind) => [open(), begin(1, 1, 10), hold(1, 1, eligible, 12, kind),
    end(1, 1, 'hold', 13)];
  const soon = decide(held(true), { nowMs: T0 + 72.9 * 1000 });
  assert.deepStrictEqual([soon.action, soon.code, soon.waitSeconds], ['wait', 'reask-too-early', 1]);
  const later = decide(held(true), { nowMs: T0 + 73 * 1000 });
  assert.deepStrictEqual(later, { action: 'start', slot: 1, ordinal: 2 });
  assert.strictEqual(decide(held(false, 'readiness-timeout')).code, 'ineligible-hold-review');
  assert.strictEqual(decide(held(false, 'identity')).code, 'ineligible-hold-review');
  const two = held(true).concat([begin(1, 2, 200), hold(1, 2, true, 202), end(1, 2, 'hold', 203)]);
  const gap = decide(two, { recoveryAuth: AUTH });
  assert.strictEqual(gap.code, 'admissions-exhausted');
  assert.ok(/unexecuted gap/.test(gap.reason), 'two CPU holds are a gap, never a recovery');
});

test('the fault labels come from the JOURNALLED facts: t-kill, worker/launcher fault, loss', () => {
  assert.deepStrictEqual(facts(tKill()).classes, ['t-kill']);
  assert.deepStrictEqual(facts(workerFault()).classes, ['worker-fault', 'launcher-fault']);
  assert.deepStrictEqual(facts(lostSlot1()).classes, ['supervisor-crash', 'session-loss']);
  assert.deepStrictEqual(facts([open(), begin(1, 1, 10)]).classes, ['supervisor-crash', 'session-loss']);
  [2, 5, 70, 71].forEach((code) => {
    assert.deepStrictEqual(facts(preIntentHold(code)).classes, ['launcher-fault'], 'exit ' + code);
  });
  assert.deepStrictEqual(facts([open(), begin(1, 1, 10), intent(1, 1, 20), end(1, 1, 'x', 30)]).classes, [],
    'an intent without a payload end cannot be diagnosed');
  assert.deepStrictEqual(facts([open()]).classes, []);
});

test('a hold with launcher exit 3, a readiness T expiry and a CPU hold are never faults', () => {
  const kinds = ['host', 'lock', 'timeout', 'mixed', 'counters', 'snapshot', 'policy',
    'additional-consumer', 'launcher-fault'];
  kinds.forEach((kind) => {
    assert.deepStrictEqual(facts(preIntentHold(3, { kind: kind })).classes, [], 'exit 3 ' + kind);
  });
  assert.deepStrictEqual(facts(preIntentHold(1, { tExpired: true })).classes, [], 'T expired in readiness');
  const consumer = [open(), begin(1, 1, 10), hold(1, 1, true, 12), end(1, 1, 'hold', 13)];
  assert.deepStrictEqual(facts(consumer).classes, []);
  // Even with a committed authorization these never reach slot 2.
  [preIntentHold(3, { kind: 'host' }), preIntentHold(3, { kind: 'timeout' }), consumer].forEach((list) => {
    const d = decide(list, { recoveryAuth: AUTH, nowMs: T0 + 20 });
    assert.ok(d.slot !== 2 && !d.claimRecovery, JSON.stringify(d));
  });
  assert.strictEqual(decide(preIntentHold(3, { kind: 'host' }), { recoveryAuth: AUTH }).code,
    'ineligible-hold-review');
});

test('an eligible fault needs the committed authorization; with it slot 2 is claimed, never slot 1', () => {
  const cases = [tKill(), workerFault(), preIntentHold(71), preIntentHold(70), preIntentHold(5),
    lostSlot1()];
  cases.forEach((list, i) => {
    assert.strictEqual(decide(list).code, 'recovery-authorization-required', 'case ' + i);
    assert.strictEqual(decide(list, { recoveryAuth: { ok: false } }).code,
      'recovery-authorization-required', 'case ' + i);
    assert.deepStrictEqual(decide(list, { recoveryAuth: AUTH }),
      { action: 'start', slot: 2, ordinal: 1, claimRecovery: true }, 'case ' + i);
  });
  // The intent counts even when the process creation failed or never happened.
  const failedCreate = [open(), begin(1, 1, 10), intent(1, 1, 20), pend(1, 1, 22, { exitCode: 6 }),
    end(1, 1, 'no-record', 30)];
  assert.deepStrictEqual(decide(failedCreate, { recoveryAuth: AUTH }).slot, 2);
});

test('a claimed recovery has its own two admissions, re-verified each time, and no slot 3', () => {
  const claimed = [].concat(tKill(), [claim(40)]);
  assert.deepStrictEqual(decide(claimed, { recoveryAuth: AUTH }),
    { action: 'start', slot: 2, ordinal: 1 });
  assert.strictEqual(decide(claimed).code, 'recovery-authorization-required');
  assert.strictEqual(decide(claimed, { recoveryAuth: { ok: false } }).code,
    'recovery-authorization-required');
  const held = claimed.concat([begin(2, 1, 50), hold(2, 1, true, 52), end(2, 1, 'hold', 53)]);
  const soon = decide(held, { nowMs: T0 + 100 * 1000, recoveryAuth: AUTH });
  assert.strictEqual(soon.code, 'reask-too-early');
  assert.deepStrictEqual(decide(held, { recoveryAuth: AUTH }), { action: 'start', slot: 2, ordinal: 2 });
  const both = held.concat([begin(2, 2, 200), hold(2, 2, true, 202), end(2, 2, 'hold', 203)]);
  const gap = decide(both, { recoveryAuth: AUTH });
  assert.deepStrictEqual([gap.code, gap.journalPermanentGap], ['permanent-gap', true]);
  assert.ok(/recovery-exhausted/.test(gap.reason));
});

test('a failed recovery is a permanent gap: no third payload, no new grant, no epoch reset', () => {
  const failed2 = [].concat(tKill(), [claim(40), begin(2, 1, 50), intent(2, 1, 60), created(2, 1, 61),
    pend(2, 1, 65), end(2, 1, 'no-record', 70)]);
  const gap = decide(failed2, { recoveryAuth: AUTH });
  assert.deepStrictEqual([gap.action, gap.code, gap.journalPermanentGap],
    ['refuse', 'permanent-gap', true]);
  const marked = failed2.concat([['permanent-gap', { reason: 'recovery-exhausted' }, 80]]);
  assert.strictEqual(decide(marked, { recoveryAuth: AUTH }).code, 'permanent-gap');
  const other = { recoveryAuth: AUTH, epoch: 'MS18c-GQ-20261119-01' };
  assert.strictEqual(decide(marked, other).code, 'epoch-mismatch');
});

test('a dead supervisor with a validated authorization is CLOSED OUT; otherwise a stop', () => {
  const list = [open(), begin(1, 1, 10), intent(1, 1, 20)];
  const closeIt = decide(list, { live: DEAD, recoveryAuth: AUTH });
  assert.deepStrictEqual(closeIt, { action: 'close', runId: 'r11', slot: 1, ordinal: 1 });
  const noAuth = decide(list, { live: DEAD });
  assert.strictEqual(noAuth.code, 'ambiguous-open-attempt');
  assert.ok(/authorization naming this run/.test(noAuth.reason));
  const unknown = decide(list, { live: { matches: false, dead: false, timedOut: true }, recoveryAuth: AUTH });
  assert.strictEqual(unknown.code, 'ambiguous-open-attempt');
  assert.ok(/not confirmed dead/.test(unknown.reason), 'a timed-out liveness query is a refusal');
  assert.strictEqual(decide(list, { live: { matches: true }, recoveryAuth: AUTH }).action, 'adopt');
});

test('a close-out grants no ordinal or opportunity; a claim still needs the authorization', () => {
  const closed = [open(), begin(1, 1, 10), intent(1, 1, 20), lost(1, 1, 30)];
  const state = journal.reduce(chain(closed));
  assert.deepStrictEqual([state.slots[1].attempts.length, state.slots[1].launchIntent,
    state.recoveryClaimed, state.open], [1, true, false, null]);
  assert.strictEqual(decide(closed).code, 'recovery-authorization-required');
  assert.deepStrictEqual(decide(closed, { recoveryAuth: AUTH }),
    { action: 'start', slot: 2, ordinal: 1, claimRecovery: true });
  // A lost run before any intent does not reopen slot 1 either.
  assert.strictEqual(decide(lostSlot1()).code, 'recovery-authorization-required');
  assert.notStrictEqual(decide(lostSlot1(), { recoveryAuth: AUTH }).slot, 1);
});

test('a lost slot-2 run closes out into a permanent gap, and only without a record', () => {
  const slot2Open = [].concat(tKill(), [claim(40), begin(2, 1, 50), intent(2, 1, 60)]);
  assert.deepStrictEqual(decide(slot2Open, { live: DEAD, recoveryAuth: AUTH }),
    { action: 'close', runId: 'r21', slot: 2, ordinal: 1 });
  const slot2Lost = slot2Open.concat([lost(2, 1, 100)]);
  const gap = decide(slot2Lost, { recoveryAuth: AUTH });
  assert.deepStrictEqual([gap.code, gap.journalPermanentGap], ['permanent-gap', true]);
  // With a complete or reconstructible record around, neither the close-out nor the gap takes effect.
  const candidates = { recordCandidates: ['payload-2/admission-1/qualifier.json.partial (ab12cd34ef56)'] };
  assert.strictEqual(decide(slot2Open, Object.assign({ live: DEAD, recoveryAuth: AUTH }, candidates)).code,
    'record-inspection-required');
  assert.strictEqual(decide(slot2Lost, Object.assign({ recoveryAuth: AUTH }, candidates)).code,
    'record-inspection-required');
  assert.strictEqual(decide(slot2Lost, { diskComplete: true, recoveryAuth: AUTH }).code,
    'unjournaled-complete-record');
});

test('a readable record of a lost run is recovered for review, with no authorization and no recovery', () => {
  const list = [open(), begin(1, 1, 10), intent(1, 1, 20), created(1, 1, 21)];
  const recover = decide(list, { live: DEAD, openRecord: { readable: true }, diskComplete: true });
  assert.deepStrictEqual(recover, { action: 'recover-record', runId: 'r11', slot: 1, ordinal: 1 });
  // A live supervisor is adopted first; a supervisor not confirmed dead blocks the recovery.
  const live = { live: { matches: true }, openRecord: { readable: true }, diskComplete: true };
  assert.strictEqual(decide(list, live).action, 'adopt');
  const unknown = { live: { matches: false, dead: false }, openRecord: { readable: true },
    diskComplete: true };
  assert.strictEqual(decide(list, unknown).code, 'unjournaled-complete-record');
  // After the journalled review the cell is complete: never rerun, and no recovery is justified by it.
  const reviewed = list.concat([pend(1, 1, 30, { exitCode: null, fault: true }), post(1, 1, 'review', 31),
    end(1, 1, 'record-review', 32)]);
  assert.strictEqual(decide(reviewed, { recoveryAuth: AUTH }).code, 'complete-record');
  assert.deepStrictEqual(facts(reviewed).classes, []);
});

test('corrupt or partial record artifacts refuse every recovery step until they are acknowledged', () => {
  const artifacts = { recordCandidates: ['payload-1/admission-1/qualifier.json (0123456789ab)'] };
  const closing = [open(), begin(1, 1, 10), intent(1, 1, 20)];
  assert.strictEqual(decide(closing, Object.assign({ live: DEAD, recoveryAuth: AUTH }, artifacts)).code,
    'record-inspection-required');
  assert.strictEqual(decide(tKill(), Object.assign({ recoveryAuth: AUTH }, artifacts)).code,
    'record-inspection-required');
  assert.strictEqual(decide(preIntentHold(71), Object.assign({ recoveryAuth: AUTH }, artifacts)).code,
    'record-inspection-required');
  // Acknowledged (nothing left in the candidate list): the ordinary rules apply again.
  assert.strictEqual(decide(tKill(), { recoveryAuth: AUTH, recordCandidates: [] }).slot, 2);
});

test('ordering violations make the journal invalid, and an invalid journal refuses everything', () => {
  const cases = [
    [[open(), begin(1, 1, 10), begin(1, 2, 11)], 'is open'],
    [[open(), begin(1, 2, 10)], 'not the next admission'],
    [[open(), begin(2, 1, 10)], 'slot 2 without its recovery claim'],
    [[open(), begin(1, 1, 10), intent(1, 1, 20), intent(1, 1, 21)], 'a second launch intent'],
    [[open(), begin(1, 1, 10), hold(1, 1, true, 11), intent(1, 1, 12)], 'a launch intent after a hold'],
    [[open(), begin(1, 1, 10), intent(1, 1, 11), hold(1, 1, true, 12)], 'a hold after a launch intent'],
    [[open(), begin(1, 1, 10), created(1, 1, 11)], 'a creation without its launch intent'],
    [[open(), claim(5)], 'no eligible supervisor or session fault'],
    [[open(), begin(1, 1, 10), hold(1, 1, true, 11), end(1, 1, 'hold', 12), claim(13)],
      'no eligible supervisor or session fault'],
    [preIntentHold(3, { kind: 'host' }).concat([claim(20)]), 'no eligible supervisor or session fault'],
    [[open(), begin(1, 1, 10), intent(1, 1, 11), claim(12)], 'while r11 is open'],
    [[].concat(tKill(), [claim(40), claim(41)]), 'a second recovery claim'],
    [[].concat(preIntentHold(3, { kind: 'host' }), [begin(2, 1, 30)]), 'slot 2 without its recovery claim'],
    [[open(), open()], 'opened twice'],
    [[begin(1, 1, 10)], 'the first event is not cell-open'],
    [[open(), begin(1, 1, 10), post(1, 1, 'accepted', 11), begin(1, 2, 12)], 'while r11 is open'],
    [[open(), begin(1, 1, 10), end(1, 1, 'hold', 11), end(1, 1, 'hold', 12)], 'no such open attempt'],
    [[open(), ['mystery', {}, 3]], 'unknown type']
  ];
  cases.forEach(([list, text]) => {
    const state = journal.reduce(chain(list));
    assert.ok(state.problems.some((p) => p.indexOf(text) !== -1),
      text + ' in ' + JSON.stringify(state.problems));
    assert.strictEqual(journal.decideNext(state, CTX({ recoveryAuth: AUTH })).code, 'journal-invalid');
  });
});

test('the sequences a recovery uses are valid: loss then claim, launcher fault then claim, T-kill', () => {
  const sequences = [
    [].concat(lostSlot1(), [claim(40), begin(2, 1, 50), intent(2, 1, 60)]),
    [].concat(preIntentHold(71), [claim(40), begin(2, 1, 50), hold(2, 1, true, 52)]),
    [].concat(preIntentHold(5, { tExpired: false }), [claim(40), begin(2, 1, 50)]),
    [].concat(tKill(), [claim(40), begin(2, 1, 50), intent(2, 1, 60), lost(2, 1, 100)]),
    [].concat(workerFault(), [claim(40), begin(2, 1, 50)])
  ];
  sequences.forEach((list, i) => {
    assert.deepStrictEqual(journal.reduce(chain(list)).problems, [], 'sequence ' + i);
  });
});

function scratch() {
  return fs.mkdtempSync(path.join(util.REPO, '.scratch-ms18c-journal-'));
}

test('the hash chain is verified on every read: an edit, a reorder or a truncation is detected', () => {
  const dir = scratch();
  try {
    const file = path.join(dir, 'journal.jsonl');
    journal.appendEvent(file, 'cell-open', { epoch: EPOCH, cell: CELL, manifestBlob: 'b'.repeat(40) }, T0);
    journal.appendEvent(file, 'admission-begin', { slot: 1, ordinal: 1, runId: 'r11', supervisor: SUP },
      T0 + 1000);
    journal.appendEvent(file, 'admission-hold', { slot: 1, ordinal: 1, runId: 'r11',
      kind: 'additional-consumer', eligible: true }, T0 + 2000);
    const ok = journal.readJournal(file);
    assert.deepStrictEqual(ok.problems, []);
    assert.deepStrictEqual(ok.events.map((e) => e.seq), [1, 2, 3]);
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(text.endsWith('\r\n') && !/(^|[^\r])\n/.test(text) && !/[ \t]\r\n/.test(text));
    const lines = text.split('\r\n').filter(Boolean);
    const edit = (i, fn) => {
      const copy = lines.slice();
      copy[i] = fn(copy[i]);
      fs.writeFileSync(file, copy.join('\r\n') + '\r\n');
      return journal.readJournal(file).problems;
    };
    const wrong = (p) => /wrong hash/.test(p);
    assert.ok(edit(1, (l) => l.replace('"ordinal":1', '"ordinal":2')).some(wrong));
    assert.ok(edit(2, (l) => l.replace('"eligible":true', '"eligible":false')).some(wrong));
    fs.writeFileSync(file, [lines[0], lines[2]].join('\r\n') + '\r\n');
    assert.ok(journal.readJournal(file).problems.length >= 2);
    fs.writeFileSync(file, [lines[1], lines[0], lines[2]].join('\r\n') + '\r\n');
    assert.ok(journal.readJournal(file).problems.length >= 1);
    fs.writeFileSync(file, lines[0] + '\r\n' + 'not json\r\n');
    assert.ok(journal.readJournal(file).problems.some((p) => /not JSON/.test(p)));
    assert.throws(() => journal.appendEvent(file, 'permanent-gap', {}, T0), /not intact/);
    assert.throws(() => journal.appendEvent(file, 'mystery', {}, T0), RangeError);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('partial files and unknown attempt directories are found and left exactly as they are', () => {
  const dir = scratch();
  try {
    const mk = (rel, text) => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    };
    mk('payload-1/admission-1/status.json', '{}\r\n');
    mk('payload-1/admission-1/qualifier.json.partial', 'half');
    mk('payload-1/admission-1/status.json.part', 'x');
    mk('payload-1/admission-2/qualifier.json', '{}\r\n');
    mk('payload-3/admission-1/events.jsonl', '');
    mk('notes.txt', 'x');
    const disk = journal.scanDisk(dir);
    assert.strictEqual(disk.attempts.length, 3);
    assert.deepStrictEqual(disk.records.map((f) => path.basename(path.dirname(f))), ['admission-2']);
    assert.strictEqual(disk.partials.length, 2);
    assert.deepStrictEqual(disk.recordPartials.map((f) => path.basename(f)), ['qualifier.json.partial']);
    const first = chain([open(), begin(1, 1, 10), hold(1, 1, true, 11), end(1, 1, 'hold', 12)]);
    const state = journal.reduce(first);
    const unknown = journal.unknownDirectories(state, disk).map((d) => d.slot + '/' + d.ordinal);
    assert.deepStrictEqual(unknown.sort(), ['1/2', '3/1']);
    const partial = path.join(dir, 'payload-1/admission-1/qualifier.json.partial');
    assert.strictEqual(fs.readFileSync(partial, 'utf8'), 'half');
    assert.deepStrictEqual(journal.scanDisk(path.join(dir, 'missing')),
      { attempts: [], records: [], partials: [], recordPartials: [] });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log(passed + ' passed, ' + failed.length + ' failed');
if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
process.exitCode = failed.length === 0 ? 0 : 1;
