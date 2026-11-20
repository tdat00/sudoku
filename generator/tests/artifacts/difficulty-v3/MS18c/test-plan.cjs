'use strict';

/*
 * MS18c Stage 3 FAKE-DATA tests of gq-plan.cjs: the planner's peek / hostcheck / begin / post over a
 * scratch folder (`.scratch-*` of the repository, removed at the end), the real committed manifest, a fake
 * Git and fake process queries. No solver runs, no qualifier is started, no CPU is sampled. Covered: the
 * approved payload and caps in the launch spec, the host check, refusal of a changed frozen input without
 * any reservation, adoption of a live matching supervisor and the refusal of an ambiguous or unjournalled
 * attempt, an eligible unstarted CPU hold and its >= 60 s re-ask, holds with launcher exit 3 that are never
 * faults, the S-OD14 recovery (the explicit fault allowlist and the label checked against the journalled
 * facts, the termination proof of the supervisor and every owned job member and the lock state, the
 * one-use committed authorization, the close-out of a lost run, a readable record recovered for review, a
 * corrupt or partial artifact acknowledged only by exact path and hash, the separate slot-2 budget and the
 * permanent gap), a complete accepted record (the single canonical copy and the receipt), a monitor review
 * (kept, never copied or rerun), a late record blocking a relaunch and partial files preserved.
 *   node generator/tests/artifacts/difficulty-v3/MS18c/test-plan.cjs
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('./util.cjs');
const rules = require('./rules.cjs');
const journal = require('./journal.cjs');
const plan = require('./gq-plan.cjs');
const inputs = require('./inputs.cjs');

let passed = 0;
const failed = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + ': ' + (err && err.stack));
  }
}

const MANIFEST = JSON.parse(fs.readFileSync(path.join(util.REPO, util.MANIFEST_PATH), 'utf8'));
const BLOB = 'b'.repeat(40);
const KEY = 'classic4/veryEasy';
const lib = inputs.recordsConstants();
const SCRATCH = fs.mkdtempSync(path.join(util.REPO, '.scratch-ms18c-plan-'));
const T0 = Date.parse('2026-11-20T01:00:00.000Z');
const SUP1 = { pid: 7001, created: '2026-11-20T00:59:00.1234567Z' };
const SUP1_ID = { pid: 7001, createdUtcMicros: '2026-11-20T00:59:00.123456Z' };
const SUP2 = { pid: 7002, created: '2026-11-20T01:10:00.7654321Z' };
const SUP2_ID = { pid: 7002, createdUtcMicros: '2026-11-20T01:10:00.765432Z' };
const MEMBERS = [{ pid: 9101, createdUtcMicros: '2026-11-20T01:00:05.000001Z' },
  { pid: 9102, createdUtcMicros: '2026-11-20T01:00:05.500002Z' }];
const MEMBER_LIVE = { pid: 9102, created: '2026-11-20T01:00:05.5000025Z' };
const IDENT = MANIFEST.identities;
let counter = 0;

const REL_DIR = 'docs/difficulty-v3/evidence/MS18c/recovery/classic4-veryEasy/';
const DIAG_REL = REL_DIR + 'diagnosis-r1.json';
const PROOF_REL = REL_DIR + 'termination-r1.json';
const DIAG_BYTES = Buffer.from('{"diagnosis":"fake"}\r\n');
const isAuthFile = (f) => f.endsWith('classic4-veryEasy.json') && f.indexOf('MS18c-gq-recovery') !== -1;

const authObject = (over) => Object.assign({
  schema: plan.AUTH_SCHEMA, epoch: MANIFEST.epoch, cell: KEY, ownerDecision: 'S-OD14',
  manifestBlob: BLOB, slot: 2, admissions: 2, faultClass: 't-kill', primaryRuns: ['run-p1a1'],
  terminationProof: null, diagnosis: { path: DIAG_REL, sha256: util.sha256(DIAG_BYTES) },
  inputs: { engineSources: IDENT.source.engineSources, qualifierHash: IDENT.tool.qualifierHash,
    attemptPolicyDigest: IDENT.attemptPolicy.digest },
  approvals: { sa1: 'MS18c-S2-SA1-fake', sa2: 'MS18c-S2-SA2-fake' } }, over);

const proofBytes = (spec) => Buffer.from(JSON.stringify(Object.assign({ schema: plan.PROOF_SCHEMA,
  runId: 'run-p1a1', supervisor: SUP1_ID, allGone: true, members: MEMBERS,
  lock: { state: 'absent' } }, spec)));

function world(over) {
  const root = path.join(SCRATCH, 'w' + (++counter));
  const state = { head: 'h'.repeat(40), authBytes: null, authBlob: null, verifyProblems: [],
    live: null, liveTimeout: false, procs: [], procsFail: false, diffStatus: 0, hashed: null,
    evidence: {}, hostObserved: null, hostTimeout: false };
  const deps = {
    paths: { runs: path.join(root, 'runs'), qualification: path.join(root, 'qualification') },
    nowMs: T0,
    git: (args) => {
      if (args[0] === 'rev-parse') {
        return state.authBlob ? { status: 0, stdout: state.authBlob, stderr: '' } :
          { status: 1, stdout: '', stderr: '' };
      }
      if (args[0] === 'hash-object') {
        return { status: 0, stdout: state.hashed || state.authBlob || '', stderr: '' };
      }
      return { status: state.diffStatus, stdout: '', stderr: '' };
    },
    loadManifest: () => ({ ok: true, problems: [], manifest: MANIFEST, blob: BLOB }),
    verifyCell: () => ({ ok: state.verifyProblems.length === 0, problems: state.verifyProblems,
      head: state.head, commits: [], engineSources: IDENT.source.engineSources,
      qualifierHash: IDENT.tool.qualifierHash, ratingVersion: 3 }),
    observeProcess: () => {
      if (state.live) return { observed: { pid: state.live.pid, cimCreatedUtc: state.live.created } };
      if (state.liveTimeout) return { observed: null, absent: false, timedOut: true, reason: 'timed out' };
      return { observed: null, absent: true, reason: 'the process is not running' };
    },
    observeProcesses: (pids) => (state.procsFail ? { observed: null, timedOut: true, reason: 'timed out' } :
      { observed: state.procs.filter((p) => pids.indexOf(p.pid) !== -1)
        .map((p) => ({ pid: p.pid, cimCreatedUtc: p.created })), timedOut: false }),
    observeHost: () => (state.hostTimeout ? { observed: null, timedOut: true } :
      { observed: state.hostObserved, timedOut: false }),
    exists: (f) => (isAuthFile(f) ? state.authBytes !== null : fs.existsSync(f)),
    readBytes: (f) => {
      if (isAuthFile(f)) return state.authBytes;
      const rel = f.replace(/\\/g, '/');
      const known = Object.keys(state.evidence).filter((k) => rel.endsWith(k))[0];
      if (rel.endsWith(DIAG_REL)) return DIAG_BYTES;
      if (known) return state.evidence[known];
      return fs.existsSync(f) ? fs.readFileSync(f) : null;
    }
  };
  Object.assign(deps, over || {});
  const files = plan.cellFiles(deps.paths, KEY);
  const authorize = (obj) => {
    state.authBytes = Buffer.from(JSON.stringify(obj));
    state.authBlob = 'a'.repeat(40);
  };
  return { deps: deps, state: state, files: files, authorize: authorize,
    at: (ms) => Object.assign(deps, { nowMs: T0 + ms }) };
}

/** Commits (in the fake) a recovery authorization with its termination proof; returns the object. */
function authorize(w, over, proof) {
  const bytes = proofBytes(proof);
  w.state.evidence[PROOF_REL] = bytes;
  const auth = authObject(Object.assign({ terminationProof: { path: PROOF_REL, sha256: util.sha256(bytes) } },
    over));
  w.authorize(auth);
  return auth;
}

const CLOSES_P1 = { runId: 'run-p1a1', slot: 1, ordinal: 1, supervisor: SUP1_ID };
const CLOSES_P2 = { runId: 'run-p2a1', slot: 2, ordinal: 1, supervisor: SUP2_ID };

const beginArgs = (runId, over) => Object.assign({ runId: runId, supervisor: SUP1,
  oStart: '2026-11-20T01:00:00.000Z', lockFile: 'L:\\mine.lock', foreignLockFile: 'L:\\timing.lock' }, over);
const eventsOf = (w) => journal.readJournal(w.files.journal).events;
const typesOf = (w) => eventsOf(w).map((e) => e.type);

/** Simulates what the launcher does inside an attempt: events.jsonl, the launch intent, the creation. */
function launcherRuns(w, begun, r) {
  const dir = begun.attemptDir;
  const ids = { slot: begun.slot, ordinal: begun.ordinal, runId: begun.runId };
  journal.appendEvent(w.files.journal, 'launch-intent', ids, w.deps.nowMs);
  util.appendLine(path.join(dir, 'events.jsonl'),
    JSON.stringify({ type: 'qualifier-created', rSeconds: r, pid: 4100 }));
  journal.appendEvent(w.files.journal, 'qualifier-created', Object.assign({ rSeconds: r }, ids),
    w.deps.nowMs);
}

/** What the supervisor's status.json holds once the window ran: the owned job members it saw. */
const writeStatus = (b, members) => util.writeNew(path.join(b.attemptDir, 'status.json'),
  JSON.stringify({ membersSeen: members || MEMBERS }) + '\r\n');

function start(w, runId, over) {
  const r = plan.begin(KEY, beginArgs(runId, over), w.deps);
  assert.ok(r.ok && r.action === 'start', JSON.stringify(r));
  r.runId = runId;
  return r;
}

const postArgs = (b, over) => Object.assign({ runId: b.runId, slot: b.slot, ordinal: b.ordinal,
  launcherExit: 0, wSeconds: 20, tExpired: false, leftover: false }, over);

function hold(w, begun, eligible, kind) {
  const readiness = { admitted: false, eligible: eligible, kind: kind, holds: ['x'] };
  util.writeNew(path.join(begun.attemptDir, 'readiness.json'), util.jsonText(readiness, true));
  return plan.post(KEY, postArgs(begun, { launcherExit: 3 }), w.deps);
}

const noRecord = (w, b) => plan.post(KEY, postArgs(b, { launcherExit: 1, wSeconds: 2220, tExpired: true }),
  w.deps);

/** Slot 1 whose payload ran and ended without a record: killed on T (default) or a worker fault. */
function slot1Fails(w, tExpired, extra) {
  const b = start(w, 'run-p1a1');
  launcherRuns(w, b, 2.5);
  writeStatus(b);
  if (extra) extra(b);
  const n = plan.post(KEY, postArgs(b, { launcherExit: 1, wSeconds: tExpired === false ? 30 : 2220,
    tExpired: tExpired !== false }), w.deps);
  return { b: b, n: n };
}

/** Slot 1 whose launcher failed before the launch intent with the given exit code. */
function preIntent(w, exit, readinessKind) {
  const b = start(w, 'run-p1a1');
  writeStatus(b);
  if (readinessKind) {
    util.writeNew(path.join(b.attemptDir, 'readiness.json'),
      util.jsonText({ admitted: false, eligible: true, kind: readinessKind, holds: ['x'] }, true));
  }
  const n = plan.post(KEY, postArgs(b, { launcherExit: exit, wSeconds: 5 }), w.deps);
  return { b: b, n: n };
}

/** A slot-1 run whose supervisor died after the launcher began: open, journalled to the creation. */
function lostRun(w, runId, over) {
  const b = start(w, runId, over);
  launcherRuns(w, b, 2);
  writeStatus(b);
  return b;
}

// ---- a fake complete record of the approved cell (the same construction as the monitor's tests) ---------

const START = '2026-11-20T01:05:00.000Z';
const iso = (ms) => new Date(Date.parse(START) + ms).toISOString();

function fakeRecord(over) {
  const requests = Array.from({ length: 40 }, (_, i) => ({ key: KEY, index: i,
    seed: lib.seedFor(KEY + '/' + i), ms: 100, hit: true, valid: true, solved: true, approximate: false,
    exact: true, achieved: 'veryEasy', score: 1 }));
  const cell = { variant: 'classic4', level: 'veryEasy', cellCount: 16, budget: lib.budgetOf(16),
    attempts: 8, requests: requests,
    summary: lib.decide({ done: requests, budget: lib.budgetOf(16), stopped: null }, false) };
  const sMs = rules.simulate(requests, 4, 40).totalMs;
  const qMs = Math.round(sMs + 500);
  return Object.assign({
    protocol: lib.PROTOCOL.document, seedBase: 20260601, machine: IDENT.machine.object,
    engine: { sources: IDENT.source.engineSources, commit: null, dirty: null },
    qualifierHash: IDENT.tool.qualifierHash, acceptance: lib.PROTOCOL.acceptance, ratingVersion: 3,
    probe: 0, earlyStop: true, guardMs: 120000, attemptPolicy: IDENT.attemptPolicy.object,
    started: START, finished: iso(qMs), seconds: Math.round(qMs / 1000), cells: [cell], support: {}
  }, over);
}

const qSeconds = (record) => (Date.parse(record.finished) - Date.parse(record.started)) / 1000;
const writeRecord = (b, record) =>
  util.writeNew(path.join(b.attemptDir, 'qualifier.json'), JSON.stringify(record) + '\r\n');

test('begin builds the one approved payload, the committed caps and a launch spec; reservations are durable',
  () => {
    const w = world();
    const peeked = plan.peek(KEY, w.deps);
    assert.deepStrictEqual([peeked.ok, peeked.action, peeked.slot, peeked.ordinal], [true, 'start', 1, 1]);
    assert.ok(!fs.existsSync(w.files.dir), 'a peek creates no folder');
    const b = start(w, 'run-p1a1');
    assert.deepStrictEqual([b.slot, b.ordinal, b.T, b.O], [1, 1, 2220, 4920]);
    assert.deepStrictEqual(typesOf(w), ['cell-open', 'admission-begin']);
    const spec = JSON.parse(fs.readFileSync(b.specFile, 'utf8'));
    const json = '--json=..\\docs\\difficulty-v3\\evidence\\MS18c\\runs\\classic4-veryEasy\\' +
      'payload-1\\admission-1\\qualifier.json';
    assert.deepStrictEqual(spec.payloadArgs.slice(0, 5),
      ['tests\\qualify.js', '--variant=classic4', '--level=veryEasy', '--jobs=4', json]);
    assert.strictEqual(spec.nodePath, 'C:\\Program Files\\nodejs\\node.exe');
    assert.deepStrictEqual(spec.caps, { callSeconds: 15, cumulativeSeconds: 45 });
    assert.strictEqual(spec.host.pid, 1968);
    const begun = eventsOf(w)[1];
    assert.deepStrictEqual(begun.supervisor, SUP1_ID);
    assert.strictEqual(begun.manifestBlob, BLOB);
  });

test('the host check compares the whole confirmed tuple and reserves nothing', () => {
  const h = MANIFEST.host;
  const good = { pid: h.pid, dotNetStartTime: h.dotNetStartTime,
    cimCreatedUtc: h.cimCreationDateUtcMicroseconds, cimParent: h.parentPid, cimExe: h.executablePath,
    cimName: h.cimName, processName: 'anything' };
  const w = world();
  w.state.hostObserved = good;
  assert.deepStrictEqual([plan.hostcheck(w.deps).ok, plan.hostcheck(w.deps).problems], [true, []]);
  w.state.hostObserved = Object.assign({}, good, { cimCreatedUtc: '2026-11-20T01:00:00.000000Z' });
  assert.ok(plan.hostcheck(w.deps).problems.some((p) => /CIM creation/.test(p)));
  w.state.hostObserved = Object.assign({}, good, { pid: 1 });
  assert.strictEqual(plan.hostcheck(w.deps).ok, false);
  w.state.hostObserved = null;
  assert.ok(/not found/.test(plan.hostcheck(w.deps).problems[0]));
  w.state.hostTimeout = true;
  const timed = plan.hostcheck(w.deps);
  assert.deepStrictEqual([timed.ok, timed.timedOut], [false, true]);
  assert.ok(!fs.existsSync(w.files.journal) && !fs.existsSync(w.files.dir), 'nothing is reserved');
});

test('a changed frozen input or a non-row cell: no reservation, no directory, a retained refusal', () => {
  const w = world();
  w.state.verifyProblems = ['frozen: qualifierHash differs'];
  const r = plan.begin(KEY, beginArgs('run-x'), w.deps);
  assert.ok(!r.ok && r.code === 'frozen-input-mismatch');
  assert.ok(!fs.existsSync(w.files.journal) && !fs.existsSync(path.join(w.files.dir, 'payload-1')));
  assert.ok(/frozen-input-mismatch/.test(fs.readFileSync(w.files.refusals, 'utf8')));
  const alias = plan.peek('Classic4/veryEasy', w.deps);
  assert.ok(!alias.ok, 'case-folded aliases are not rows');
});

test('a live matching supervisor is adopted: no new admission, no payload, no reservation', () => {
  const w = world();
  start(w, 'run-p1a1');
  w.state.live = { pid: 7001, created: '2026-11-20T00:59:00.1234560Z' };
  const p = plan.peek(KEY, w.deps);
  assert.deepStrictEqual([p.ok, p.action, p.runId, p.slot, p.ordinal], [true, 'adopt', 'run-p1a1', 1, 1]);
  const b = plan.begin(KEY, beginArgs('run-other'), w.deps);
  assert.ok(!b.ok && b.action === 'adopt');
  assert.strictEqual(eventsOf(w).length, 2);
  // PID reuse: the same PID with another creation time is not the supervisor.
  w.state.live = { pid: 7001, created: '2026-11-20T03:00:00.0000000Z' };
  assert.strictEqual(plan.peek(KEY, w.deps).code, 'ambiguous-open-attempt');
});

test('an ambiguous open attempt, an unknown attempt directory and a late record are review stops', () => {
  const w = world();
  start(w, 'run-p1a1');
  assert.strictEqual(plan.begin(KEY, beginArgs('run-2'), w.deps).code, 'ambiguous-open-attempt');
  fs.mkdirSync(path.join(w.files.dir, 'payload-1', 'admission-2'), { recursive: true });
  assert.strictEqual(plan.begin(KEY, beginArgs('run-3'), w.deps).code, 'unknown-attempt-directory');
  const w2 = world();
  const { b } = slot1Fails(w2);
  util.writeNew(path.join(b.attemptDir, 'qualifier.json'), '{}\r\n');
  assert.strictEqual(plan.peek(KEY, w2.deps).code, 'unjournaled-complete-record');
  authorize(w2);
  assert.strictEqual(plan.peek(KEY, w2.deps).code, 'unjournaled-complete-record', 'with the authorization');
});

test('an eligible unstarted CPU hold may be re-asked once, 60 s after its release, with a fresh ordinal',
  () => {
    const w = world();
    const b = start(w, 'run-p1a1');
    const h = hold(w, b, true, 'additional-consumer');
    assert.deepStrictEqual([h.ok, h.outcome, h.eligible, h.kind],
      [true, 'unstarted-hold', true, 'additional-consumer']);
    assert.strictEqual(plan.peek(KEY, w.deps).action, 'wait');
    w.at(30000);
    const early = plan.peek(KEY, w.deps);
    assert.deepStrictEqual([early.action, early.code], ['wait', 'reask-too-early']);
    w.at(61000);
    const second = start(w, 'run-p1a2');
    assert.deepStrictEqual([second.slot, second.ordinal], [1, 2]);
    assert.ok(second.attemptDir.endsWith(path.join('payload-1', 'admission-2')));
    assert.ok(hold(w, second, true, 'additional-consumer').ok);
    w.at(200000);
    const third = plan.peek(KEY, w.deps);
    assert.deepStrictEqual([third.ok, third.code], [false, 'admissions-exhausted']);
  });

test('holds with launcher exit 3 are ordinary verdicts: never a fault, never slot 2, even labelled', () => {
  ['host', 'lock', 'timeout', 'mixed', 'counters', 'snapshot'].forEach((kind) => {
    const w = world();
    const b = start(w, 'run-p1a1');
    writeStatus(b);
    assert.strictEqual(hold(w, b, false, kind).eligible, false);
    w.at(500000);
    assert.strictEqual(plan.peek(KEY, w.deps).code, 'ineligible-hold-review', kind);
    authorize(w, { faultClass: 'launcher-fault' });
    assert.strictEqual(plan.peek(KEY, w.deps).code, 'ineligible-hold-review', kind + ' and authorized');
    assert.strictEqual(plan.begin(KEY, beginArgs('run-p2a1'), w.deps).code, 'ineligible-hold-review', kind);
    assert.ok(typesOf(w).indexOf('recovery-claim') === -1, kind);
  });
  // An eligible consumer hold is a CPU verdict as well; with a second hold it is a gap, never a recovery.
  const w = world();
  const b = start(w, 'run-p1a1');
  hold(w, b, true, 'additional-consumer');
  authorize(w, { faultClass: 'launcher-fault' });
  w.at(61000);
  assert.deepStrictEqual([plan.peek(KEY, w.deps).action, plan.peek(KEY, w.deps).slot], ['start', 1]);
});

test('a launcher fault before the intent (exit 71, 70, 5, 2, post after a fault) is a labelled hold', () => {
  [71, 70, 5, 2].forEach((exit) => {
    const w = world();
    const { n } = preIntent(w, exit);
    assert.deepStrictEqual([n.outcome, n.kind, n.eligible], ['unstarted-hold', 'launcher-fault', false]);
    assert.strictEqual(plan.peek(KEY, w.deps).code, 'recovery-authorization-required', 'exit ' + exit);
    authorize(w, { faultClass: 'launcher-fault' });
    const p = plan.peek(KEY, w.deps);
    assert.deepStrictEqual([p.action, p.slot, p.ordinal, p.claimRecovery], ['start', 2, 1, true],
      'exit ' + exit);
  });
  // The label comes from the journalled exit code, not the readiness kind: a crash after readiness.json.
  const w = world();
  const { n } = preIntent(w, 71, 'additional-consumer');
  assert.deepStrictEqual([n.kind, n.eligible], ['additional-consumer', false]);
  authorize(w, { faultClass: 'launcher-fault' });
  assert.strictEqual(plan.peek(KEY, w.deps).action, 'start');
  // A post after a window fault records the flag and the known exit code.
  const w2 = world();
  const b = start(w2, 'run-p1a1');
  writeStatus(b);
  const r = plan.post(KEY, postArgs(b, { launcherExit: 3, wSeconds: 40, fault: true }), w2.deps);
  assert.strictEqual(r.outcome, 'unstarted-hold');
  const held = eventsOf(w2).filter((e) => e.type === 'admission-hold')[0];
  assert.deepStrictEqual([held.fault, held.launcherExit, held.eligible], [true, 3, false]);
});

test('after a T-kill the recovery needs the committed authorization; a partial file stops first', () => {
  const w = world();
  const { n } = slot1Fails(w, true, (b) => fs.writeFileSync(path.join(b.attemptDir, 'qualifier.json.partial'),
    'partial'));
  assert.deepStrictEqual([n.ok, n.outcome], [true, 'no-record']);
  assert.ok(n.partials.some((p) => p.endsWith('qualifier.json.partial')), 'the partial file is kept');
  const refused = plan.peek(KEY, w.deps);
  assert.deepStrictEqual([refused.ok, refused.code], [false, 'record-inspection-required']);
  const w2 = world();
  slot1Fails(w2);
  const none = plan.peek(KEY, w2.deps);
  assert.deepStrictEqual([none.ok, none.code], [false, 'recovery-authorization-required']);
  const again = plan.begin(KEY, beginArgs('run-p2a1'), w2.deps);
  assert.strictEqual(again.code, 'recovery-authorization-required');
  assert.deepStrictEqual(typesOf(w2).slice(-1), ['attempt-end']);
});

test('a missing, edited, uncommitted or mismatching authorization is refused; nothing is claimed', () => {
  const edited = (w) => { authorize(w); w.state.hashed = 'c'.repeat(40); };
  const changed = (w) => { authorize(w); w.state.diffStatus = 1; };
  const diag = { path: DIAG_REL, sha256: 'e'.repeat(64) };
  const inp = (key) => Object.assign({}, authObject().inputs, { [key]: 'f'.repeat(64) });
  const bads = [
    ['edited', edited], ['diff', changed],
    ['other cell', (w) => authorize(w, { cell: 'classic4/easy' })],
    ['other epoch', (w) => authorize(w, { epoch: 'MS18c-GQ-20990101-01' })],
    ['other manifest', (w) => authorize(w, { manifestBlob: 'd'.repeat(40) })],
    ['old schema', (w) => authorize(w, { schema: 'MS18c-gq-recovery-authorization-v1' })],
    ['slot 1', (w) => authorize(w, { slot: 1 })],
    ['approvals as a list', (w) => authorize(w, { approvals: ['SA1-ref', 'SA2-ref'] })],
    ['the same approval twice', (w) => authorize(w, { approvals: { sa1: 'x', sa2: 'x' } })],
    ['admissions', (w) => authorize(w, { admissions: 3 })],
    ['diagnosis hash', (w) => authorize(w, { diagnosis: diag })],
    ['diagnosis elsewhere',
      (w) => authorize(w, { diagnosis: { path: 'docs/x.json', sha256: 'e'.repeat(64) } })],
    ['primary runs', (w) => authorize(w, { primaryRuns: ['another-run'] })],
    ['engine inputs', (w) => authorize(w, { inputs: inp('engineSources') })],
    ['qualifier input', (w) => authorize(w, { inputs: inp('qualifierHash') })],
    ['policy input', (w) => authorize(w, { inputs: inp('attemptPolicyDigest') })],
    ['no termination proof', (w) => authorize(w, { terminationProof: undefined })],
    ['proof of another run', (w) => authorize(w, {}, { runId: 'other' })],
    ['proof of another supervisor', (w) => authorize(w, {}, { supervisor: SUP2_ID })],
    ['proof not all gone', (w) => authorize(w, {}, { allGone: false })],
    ['proof lists other members', (w) => authorize(w, {}, { members: [MEMBERS[0]] })],
    ['proof without members', (w) => authorize(w, {}, { members: undefined })],
    ['proof without a lock state', (w) => authorize(w, {}, { lock: undefined })],
    ['proof with a foreign lock', (w) => authorize(w, {}, { lock: { state: 'held' } })],
    ['cleanup without its proof', (w) => authorize(w, {}, { lock: { state: 'orchestrator-cleanup' } })],
    ['closes a run that was never lost', (w) => authorize(w, { closesRun: CLOSES_P1 })],
    ['a class outside the allowlist', (w) => authorize(w, { faultClass: 'cpu-admission' })],
    ['a class that is not a fault', (w) => authorize(w, { faultClass: 'missing-approval' })],
    ['a rejected-source class', (w) => authorize(w, { faultClass: 'rejected-source' })],
    ['a rejected protocol fact', (w) => authorize(w, { faultClass: 'rejected-protocol' })],
    ['a label the journal does not support', (w) => authorize(w, { faultClass: 'worker-fault' })],
    ['a supervisor label without a loss', (w) => authorize(w, { faultClass: 'session-loss' })],
    ['an unreadable proof file', (w) => { authorize(w); w.state.evidence[PROOF_REL] = Buffer.from('nope'); }]
  ];
  bads.forEach(([name, prepare]) => {
    const w = world();
    slot1Fails(w);
    prepare(w);
    const r = plan.begin(KEY, beginArgs('run-p2a1'), w.deps);
    assert.ok(!r.ok && r.code === 'recovery-authorization-required', name + ' ' + JSON.stringify(r));
    assert.ok(typesOf(w).indexOf('recovery-claim') === -1, name + ' claimed');
  });
  const good = world();
  slot1Fails(good);
  authorize(good);
  assert.strictEqual(plan.peek(KEY, good.deps).claimRecovery, true);
  const cleaned = world();
  slot1Fails(cleaned);
  authorize(cleaned, {}, { lock: { state: 'orchestrator-cleanup',
    cleanupProof: { path: REL_DIR + 'lock-cleanup.json', sha256: 'a'.repeat(64) } } });
  assert.strictEqual(plan.peek(KEY, cleaned.deps).claimRecovery, true, 'an orchestrator cleanup is recorded');
});

test('the labels are checked against the journal: t-kill, worker/launcher fault, supervisor loss', () => {
  const claims = (w, faultClass) => {
    authorize(w, { faultClass: faultClass });
    return plan.peek(KEY, w.deps).claimRecovery === true;
  };
  const worker = world();
  slot1Fails(worker, false);
  assert.deepStrictEqual(['worker-fault', 'launcher-fault', 't-kill', 'supervisor-crash'].map(
    (c) => claims(worker, c)), [true, true, false, false]);
  const tk = world();
  slot1Fails(tk, true);
  assert.deepStrictEqual(['t-kill', 'worker-fault', 'launcher-fault'].map((c) => claims(tk, c)),
    [true, false, false]);
  const pre = world();
  preIntent(pre, 71);
  assert.deepStrictEqual(['launcher-fault', 'worker-fault', 't-kill', 'supervisor-crash'].map(
    (c) => claims(pre, c)), [true, false, false, false]);
  // A worker fault is journalled as a failed payload that is not a T expiry; a faulted window is too.
  const flagged = world();
  const { n } = slot1Fails(flagged, false);
  assert.strictEqual(n.outcome, 'no-record');
  const end = eventsOf(flagged).filter((e) => e.type === 'payload-end')[0];
  assert.deepStrictEqual([end.tExpired, end.exitCode], [false, 1]);
});

test('the committed authorization claims slot 2 once, with its own two admissions; failure is a gap', () => {
  const w = world();
  slot1Fails(w);
  authorize(w);
  w.at(1000);
  const s2 = start(w, 'run-p2a1', { supervisor: SUP2 });
  assert.deepStrictEqual([s2.slot, s2.ordinal, s2.claimedRecovery], [2, 1, true]);
  assert.ok(s2.attemptDir.endsWith(path.join('payload-2', 'admission-1')));
  assert.strictEqual(typesOf(w).filter((t) => t === 'recovery-claim').length, 1);
  assert.strictEqual(eventsOf(w).filter((e) => e.type === 'recovery-claim')[0].faultClass, 't-kill');
  assert.ok(hold(w, s2, true, 'additional-consumer').ok);
  w.at(120000);
  const s2b = start(w, 'run-p2a2', { supervisor: SUP2 });
  assert.deepStrictEqual([s2b.slot, s2b.ordinal, s2b.claimedRecovery], [2, 2, false]);
  assert.strictEqual(typesOf(w).filter((t) => t === 'recovery-claim').length, 1, 'the same claim continues');
  launcherRuns(w, s2b, 1);
  noRecord(w, s2b);
  w.at(300000);
  const gap = plan.peek(KEY, w.deps);
  assert.deepStrictEqual([gap.ok, gap.code], [false, 'permanent-gap']);
  assert.ok(/recovery-exhausted/.test(gap.reason));
  const marked = plan.begin(KEY, beginArgs('run-p3'), w.deps);
  assert.strictEqual(marked.code, 'permanent-gap');
  assert.deepStrictEqual(typesOf(w).slice(-1), ['permanent-gap']);
  plan.begin(KEY, beginArgs('run-p4'), w.deps);
  assert.strictEqual(typesOf(w).filter((t) => t === 'permanent-gap').length, 1, 'marked once, no payload');
  // The authorization is re-verified on every slot-2 admission: with it gone, admission 2 is refused.
  const w2 = world();
  slot1Fails(w2);
  authorize(w2);
  w2.at(1000);
  const d = start(w2, 'run-p2a1', { supervisor: SUP2 });
  hold(w2, d, true, 'additional-consumer');
  w2.state.authBytes = null;
  w2.at(120000);
  assert.strictEqual(plan.peek(KEY, w2.deps).code, 'recovery-authorization-required');
});

test('the tool proves the supervisor and every owned job member are gone; anything else is a refusal', () => {
  const ref = { runId: 'run-p1a1', slot: 1, ordinal: 1, supervisor: SUP1_ID };
  const w = world();
  slot1Fails(w);
  assert.deepStrictEqual(plan.ownedGone(KEY, ref, w.deps), { ok: true });
  w.state.procs = [MEMBER_LIVE];
  const alive = plan.ownedGone(KEY, ref, w.deps);
  assert.deepStrictEqual([alive.ok, alive.code, alive.alive],
    [false, 'owned-process-alive', ['job member 9102']]);
  w.state.procs = [{ pid: 7001, created: SUP1.created }];
  assert.deepStrictEqual(plan.ownedGone(KEY, ref, w.deps).alive, ['supervisor 7001']);
  // PID reuse: another creation time is another process, so the recorded one is gone.
  w.state.procs = [{ pid: 9102, created: '2026-11-20T05:00:00.0000000Z' },
    { pid: 7001, created: '2026-11-20T05:00:00.0000000Z' }];
  assert.strictEqual(plan.ownedGone(KEY, ref, w.deps).ok, true);
  w.state.procs = [];
  w.state.procsFail = true;
  const timeout = plan.ownedGone(KEY, ref, w.deps);
  assert.deepStrictEqual([timeout.ok, timeout.code], [false, 'owned-liveness-unknown']);
  const w2 = world();
  const b2 = start(w2, 'run-p1a1');
  const unknown = plan.ownedGone(KEY, ref, w2.deps);
  assert.deepStrictEqual([unknown.ok, unknown.code], [false, 'owned-members-unknown']);
  assert.ok(b2.attemptDir);
});

test('a live member, a failed liveness query or unknown members stop a claim: nothing is journalled', () => {
  const stops = [
    ['a live member', (w) => { w.state.procs = [MEMBER_LIVE]; }, 'owned-process-alive'],
    ['a live supervisor', (w) => { w.state.procs = [{ pid: 7001, created: SUP1.created }]; },
      'owned-process-alive'],
    ['a liveness timeout', (w) => { w.state.procsFail = true; }, 'owned-liveness-unknown']
  ];
  stops.forEach(([name, prepare, code]) => {
    const w = world();
    slot1Fails(w);
    authorize(w);
    prepare(w);
    const before = typesOf(w).length;
    const r = plan.begin(KEY, beginArgs('run-p2a1'), w.deps);
    assert.deepStrictEqual([r.ok, r.code], [false, code], name);
    assert.strictEqual(typesOf(w).length, before, name + ' journalled');
  });
});

test('a dead supervisor is closed out under a validated authorization; the close-out grants nothing', () => {
  const w = world();
  lostRun(w, 'run-p1a1');
  assert.strictEqual(plan.peek(KEY, w.deps).code, 'ambiguous-open-attempt');
  authorize(w, { faultClass: 'supervisor-crash', closesRun: CLOSES_P1 });
  const peeked = plan.peek(KEY, w.deps);
  assert.deepStrictEqual([peeked.ok, peeked.action, peeked.slot, peeked.ordinal], [true, 'close', 1, 1]);
  w.at(1000);
  const r = plan.begin(KEY, beginArgs('run-p2a1', { supervisor: SUP2 }), w.deps);
  assert.deepStrictEqual([r.ok, r.action, r.slot, r.claimedRecovery], [true, 'start', 2, true]);
  assert.deepStrictEqual(typesOf(w).slice(-4), ['qualifier-created', 'attempt-end', 'recovery-claim',
    'admission-begin']);
  const closed = eventsOf(w).filter((e) => e.type === 'attempt-end')[0];
  assert.deepStrictEqual([closed.outcome, closed.runId], ['supervisor-lost', 'run-p1a1']);
  assert.ok(closed.closedBy && closed.closedBy.authorizationBlob);
  const state = journal.reduce(eventsOf(w));
  assert.deepStrictEqual([state.problems, state.slots[1].attempts.length, state.slots[2].attempts.length],
    [[], 1, 1]);
  // session-loss is the same fact and the same label family.
  const w2 = world();
  lostRun(w2, 'run-p1a1');
  authorize(w2, { faultClass: 'session-loss', closesRun: CLOSES_P1 });
  assert.strictEqual(plan.peek(KEY, w2.deps).action, 'close');
});

test('a close-out is refused for a mismatch, a live supervisor or member, a timeout or a bad label', () => {
  const bads = [
    ['another run id', (w) => authorize(w, { faultClass: 'supervisor-crash',
      closesRun: Object.assign({}, CLOSES_P1, { runId: 'other' }) }), 'ambiguous-open-attempt'],
    ['another supervisor', (w) => authorize(w, { faultClass: 'supervisor-crash',
      closesRun: Object.assign({}, CLOSES_P1, { supervisor: SUP2_ID }) }), 'ambiguous-open-attempt'],
    ['no closesRun', (w) => authorize(w, { faultClass: 'supervisor-crash' }), 'ambiguous-open-attempt'],
    ['a t-kill label on an open run', (w) => authorize(w, { faultClass: 't-kill', closesRun: CLOSES_P1 }),
      'ambiguous-open-attempt'],
    ['a worker-fault label', (w) => authorize(w, { faultClass: 'worker-fault', closesRun: CLOSES_P1 }),
      'ambiguous-open-attempt'],
    ['a cpu-admission label', (w) => authorize(w, { faultClass: 'cpu-admission', closesRun: CLOSES_P1 }),
      'ambiguous-open-attempt'],
    ['a proof without the lock state', (w) => authorize(w, { faultClass: 'supervisor-crash',
      closesRun: CLOSES_P1 }, { lock: undefined }), 'ambiguous-open-attempt'],
    ['a liveness timeout of the supervisor', (w) => {
      authorize(w, { faultClass: 'supervisor-crash', closesRun: CLOSES_P1 });
      w.state.liveTimeout = true;
    }, 'ambiguous-open-attempt'],
    ['a live job member', (w) => {
      authorize(w, { faultClass: 'supervisor-crash', closesRun: CLOSES_P1 });
      w.state.procs = [MEMBER_LIVE];
    }, 'owned-process-alive'],
    ['a failed member query', (w) => {
      authorize(w, { faultClass: 'supervisor-crash', closesRun: CLOSES_P1 });
      w.state.procsFail = true;
    }, 'owned-liveness-unknown']
  ];
  bads.forEach(([name, prepare, code]) => {
    const w = world();
    lostRun(w, 'run-p1a1');
    prepare(w);
    const before = typesOf(w).length;
    const r = plan.begin(KEY, beginArgs('run-p2a1', { supervisor: SUP2 }), w.deps);
    assert.deepStrictEqual([r.ok, r.code], [false, code], name + ' ' + JSON.stringify(r));
    assert.strictEqual(typesOf(w).length, before, name + ' journalled');
    assert.ok(typesOf(w).indexOf('attempt-end') === -1, name + ' closed out');
  });
  const live = world();
  lostRun(live, 'run-p1a1');
  authorize(live, { faultClass: 'supervisor-crash', closesRun: CLOSES_P1 });
  live.state.live = { pid: 7001, created: SUP1.created };
  const adopt = plan.peek(KEY, live.deps);
  assert.deepStrictEqual([adopt.action, adopt.runId], ['adopt', 'run-p1a1']);
  const timeout = world();
  lostRun(timeout, 'run-p1a1');
  authorize(timeout, { faultClass: 'supervisor-crash', closesRun: CLOSES_P1 });
  timeout.state.liveTimeout = true;
  assert.ok(/not confirmed dead/.test(plan.peek(KEY, timeout.deps).reason));
});

test('a readable record of a lost run is recovered for review: W unknown, never rerun, no recovery', () => {
  const w = world();
  const b = lostRun(w, 'run-p1a1');
  writeRecord(b, fakeRecord());
  const peeked = plan.peek(KEY, w.deps);
  assert.deepStrictEqual([peeked.ok, peeked.action], [true, 'recover-record']);
  const r = plan.begin(KEY, beginArgs('run-p2a1', { supervisor: SUP2 }), w.deps);
  assert.deepStrictEqual([r.ok, r.action, r.verdict, r.outcome], [true, 'recovered-record', 'review',
    'record-review']);
  assert.ok(r.monitor.invalidTiming.length > 0, 'W unknown makes the timing invalid');
  assert.ok(!fs.existsSync(w.files.canonJson), 'a review verdict copies nothing');
  const end = eventsOf(w).filter((e) => e.type === 'payload-end')[0];
  assert.deepStrictEqual([end.fault, end.supervisorLost, end.wSeconds, end.exitCode],
    [true, true, null, null]);
  assert.deepStrictEqual(typesOf(w).slice(-3), ['payload-end', 'postcheck', 'attempt-end']);
  const receipt = JSON.parse(fs.readFileSync(w.files.receipt, 'utf8'));
  assert.deepStrictEqual([receipt.verdict, receipt.supervisorLost, receipt.wSeconds], ['review', true, null]);
  w.at(500000);
  authorize(w, { faultClass: 'supervisor-crash', closesRun: CLOSES_P1 });
  assert.strictEqual(plan.peek(KEY, w.deps).code, 'complete-record', 'it never justifies a recovery');
  assert.ok(typesOf(w).indexOf('recovery-claim') === -1);
});

test('a record of a lost run is not recovered while its owner may be alive or its members unknown', () => {
  const alive = world();
  writeRecord(lostRun(alive, 'run-p1a1'), fakeRecord());
  alive.state.procs = [MEMBER_LIVE];
  const a = plan.begin(KEY, beginArgs('run-p2a1', { supervisor: SUP2 }), alive.deps);
  assert.deepStrictEqual([a.ok, a.code], [false, 'owned-process-alive']);
  const timeout = world();
  writeRecord(lostRun(timeout, 'run-p1a1'), fakeRecord());
  timeout.state.liveTimeout = true;
  assert.strictEqual(plan.peek(KEY, timeout.deps).code, 'unjournaled-complete-record');
  const unknown = world();
  const b = start(unknown, 'run-p1a1');
  launcherRuns(unknown, b, 2);
  writeRecord(b, fakeRecord());
  const u = plan.begin(KEY, beginArgs('run-p2a1', { supervisor: SUP2 }), unknown.deps);
  assert.deepStrictEqual([u.ok, u.code], [false, 'owned-members-unknown']);
  const live = world();
  writeRecord(lostRun(live, 'run-p1a1'), fakeRecord());
  live.state.live = { pid: 7001, created: SUP1.created };
  assert.strictEqual(plan.peek(KEY, live.deps).action, 'adopt');
  [alive, timeout, unknown, live].forEach((x) => assert.deepStrictEqual(typesOf(x).slice(-1),
    ['qualifier-created']));
});

test('a lost slot-2 run closes out into a permanent gap only without any record artifact', () => {
  const claimedAndLost = (extra) => {
    const w = world();
    slot1Fails(w);
    authorize(w);
    w.at(1000);
    const s2 = start(w, 'run-p2a1', { supervisor: SUP2 });
    launcherRuns(w, s2, 2);
    writeStatus(s2);
    if (extra) extra(s2);
    w.at(5000);
    authorize(w, { faultClass: 't-kill', closesRun: CLOSES_P2 }, { runId: 'run-p2a1', supervisor: SUP2_ID });
    return { w: w, s2: s2 };
  };
  const plain = claimedAndLost();
  const peeked = plan.peek(KEY, plain.w.deps);
  assert.deepStrictEqual([peeked.action, peeked.slot], ['close', 2]);
  const gap = plan.begin(KEY, beginArgs('run-p3'), plain.w.deps);
  assert.deepStrictEqual([gap.ok, gap.code], [false, 'permanent-gap']);
  assert.deepStrictEqual(typesOf(plain.w).slice(-2), ['attempt-end', 'permanent-gap']);
  assert.strictEqual(eventsOf(plain.w).filter((e) => e.type === 'attempt-end').pop().outcome,
    'supervisor-lost');
  const partial = claimedAndLost((b) => fs.writeFileSync(path.join(b.attemptDir, 'qualifier.json.partial'),
    'x'));
  assert.strictEqual(plan.begin(KEY, beginArgs('run-p3'), partial.w.deps).code, 'record-inspection-required');
  assert.ok(typesOf(partial.w).indexOf('permanent-gap') === -1, 'no gap while a partial file exists');
  const complete = claimedAndLost((b) => writeRecord(b, fakeRecord()));
  const rec = plan.begin(KEY, beginArgs('run-p3'), complete.w.deps);
  assert.deepStrictEqual([rec.action, rec.verdict], ['recovered-record', 'review']);
  assert.ok(typesOf(complete.w).indexOf('permanent-gap') === -1, 'a complete record is no gap');
  const live = claimedAndLost();
  live.w.state.procs = [{ pid: 9101, created: '2026-11-20T01:00:05.0000015Z' }];
  assert.strictEqual(plan.begin(KEY, beginArgs('run-p3'), live.w.deps).code, 'owned-process-alive');
});

test('a corrupt or partial artifact is acknowledged only by exact path and hash; canonical never', () => {
  const rel = 'payload-1/admission-1/qualifier.json.partial';
  const setup = () => {
    const w = world();
    slot1Fails(w, true, (b) => fs.writeFileSync(path.join(b.attemptDir, 'qualifier.json.partial'),
      'partial'));
    return w;
  };
  const sha = util.sha256(Buffer.from('partial'));
  const w = setup();
  authorize(w);
  assert.strictEqual(plan.peek(KEY, w.deps).code, 'record-inspection-required');
  authorize(w, { acknowledgedArtifacts: [{ path: rel, sha256: sha }] });
  const ok = plan.peek(KEY, w.deps);
  assert.deepStrictEqual([ok.action, ok.slot, ok.claimRecovery], ['start', 2, true]);
  const wrongHash = setup();
  authorize(wrongHash, { acknowledgedArtifacts: [{ path: rel, sha256: 'e'.repeat(64) }] });
  assert.strictEqual(plan.peek(KEY, wrongHash.deps).code, 'record-inspection-required');
  const wrongPath = setup();
  authorize(wrongPath, { acknowledgedArtifacts: [{ path: 'payload-1/admission-1/other.partial',
    sha256: sha }] });
  assert.strictEqual(plan.peek(KEY, wrongPath.deps).code, 'record-inspection-required');
  const changed = setup();
  authorize(changed, { acknowledgedArtifacts: [{ path: rel, sha256: sha }] });
  const partialFile = path.join(changed.files.dir, 'payload-1', 'admission-1', 'qualifier.json.partial');
  fs.writeFileSync(partialFile, 'edited');
  assert.strictEqual(plan.peek(KEY, changed.deps).code, 'record-inspection-required');
  const canon = setup();
  authorize(canon, { acknowledgedArtifacts: [{ path: rel, sha256: sha }] });
  fs.mkdirSync(path.dirname(canon.files.canonJson), { recursive: true });
  fs.writeFileSync(canon.files.canonJson, '{}');
  assert.strictEqual(plan.peek(KEY, canon.deps).code, 'record-inspection-required');
  const notList = setup();
  authorize(notList, { acknowledgedArtifacts: 'all' });
  assert.strictEqual(plan.peek(KEY, notList.deps).code, 'record-inspection-required');
});

test('a corrupt qualifier.json is a review stop; only its exact path and hash can be acknowledged', () => {
  const w = world();
  const b = start(w, 'run-p1a1');
  launcherRuns(w, b, 2);
  writeStatus(b);
  util.writeNew(path.join(b.attemptDir, 'qualifier.json'), '{broken\r\n');
  const p = plan.post(KEY, postArgs(b, { wSeconds: 100 }), w.deps);
  assert.deepStrictEqual([p.ok, p.outcome], [false, 'record-unreadable']);
  assert.ok(!fs.existsSync(w.files.canonJson));
  assert.strictEqual(plan.peek(KEY, w.deps).code, 'record-inspection-required');
  authorize(w, { faultClass: 'worker-fault' });
  assert.strictEqual(plan.peek(KEY, w.deps).code, 'record-inspection-required', 'not by default');
  const sha = util.sha256(fs.readFileSync(path.join(b.attemptDir, 'qualifier.json')));
  authorize(w, { faultClass: 'worker-fault',
    acknowledgedArtifacts: [{ path: 'payload-1/admission-1/qualifier.json', sha256: sha }] });
  assert.deepStrictEqual([plan.peek(KEY, w.deps).action, plan.peek(KEY, w.deps).slot], ['start', 2]);
});

test('a complete accepted record: monitor passed, receipt written, raw bytes copied once, never rerun',
  () => {
    const w = world();
    const b = start(w, 'run-p1a1');
    launcherRuns(w, b, 2);
    const record = fakeRecord();
    writeRecord(b, record);
    util.writeNew(path.join(b.attemptDir, 'qualifier.md'), '# fake\r\n');
    const p = plan.post(KEY, postArgs(b, { wSeconds: qSeconds(record) + 3 }), w.deps);
    assert.deepStrictEqual([p.ok, p.verdict, p.outcome], [true, 'accepted', 'record-accepted']);
    assert.ok(fs.existsSync(w.files.canonJson) && fs.existsSync(w.files.canonMd));
    const original = fs.readFileSync(path.join(b.attemptDir, 'qualifier.json'));
    assert.strictEqual(util.sha256(fs.readFileSync(w.files.canonJson)), util.sha256(original));
    const receipt = JSON.parse(fs.readFileSync(w.files.receipt, 'utf8'));
    assert.deepStrictEqual([receipt.verdict, receipt.slot, receipt.ordinal, receipt.rSeconds],
      ['accepted', 1, 1, 2]);
    assert.strictEqual(receipt.original.json.sha256, receipt.canonical.json.sha256);
    assert.deepStrictEqual(typesOf(w).slice(-3), ['payload-end', 'postcheck', 'attempt-end']);
    w.at(500000);
    const next = plan.peek(KEY, w.deps);
    assert.deepStrictEqual([next.ok, next.code], [false, 'complete-record']);
  });

test('R comes from the journalled creation when events.jsonl could not be written', () => {
  const w = world();
  const b = start(w, 'run-p1a1');
  const ids = { slot: 1, ordinal: 1, runId: 'run-p1a1' };
  journal.appendEvent(w.files.journal, 'launch-intent', ids, w.deps.nowMs);
  const created = Object.assign({ rSeconds: 2 }, ids);
  journal.appendEvent(w.files.journal, 'qualifier-created', created, w.deps.nowMs);
  const record = fakeRecord();
  writeRecord(b, record);
  assert.ok(!fs.existsSync(path.join(b.attemptDir, 'events.jsonl')));
  const p = plan.post(KEY, postArgs(b, { wSeconds: qSeconds(record) + 3 }), w.deps);
  assert.deepStrictEqual([p.ok, p.verdict], [true, 'accepted']);
  assert.strictEqual(JSON.parse(fs.readFileSync(w.files.receipt, 'utf8')).rSeconds, 2);
});

test('a monitor review keeps the record, copies nothing and never reruns', () => {
  const cases = [['R > W-Q', 2, 1.5], ['W-Q negative', 2, -1], ['W-Q above 60', 2, 61]];
  cases.forEach(([name, r, wMinusQ]) => {
    const w = world();
    const b = start(w, 'run-p1a1');
    launcherRuns(w, b, r);
    const record = fakeRecord();
    writeRecord(b, record);
    const p = plan.post(KEY, postArgs(b, { wSeconds: qSeconds(record) + wMinusQ }), w.deps);
    assert.deepStrictEqual([p.verdict, p.outcome], ['review', 'record-review'], name);
    assert.ok(p.monitor.invalidTiming.length + p.monitor.breaches.length > 0, name);
    assert.ok(!fs.existsSync(w.files.canonJson), name + ' copied');
    assert.ok(fs.existsSync(path.join(b.attemptDir, 'qualifier.json')) && fs.existsSync(w.files.receipt));
    w.at(500000);
    assert.strictEqual(plan.peek(KEY, w.deps).code, 'complete-record');
  });
  const w = world();
  const b = start(w, 'run-p1a1');
  launcherRuns(w, b, 2);
  const bad = fakeRecord();
  bad.cells[0].cellCount = 17;
  writeRecord(b, bad);
  const p = plan.post(KEY, postArgs(b, { wSeconds: qSeconds(bad) + 3 }), w.deps);
  assert.strictEqual(p.verdict, 'review');
  assert.ok(p.monitor.invalid.some((x) => x.indexOf('cellCount') !== -1));
});

test('authorizationProblems is pure: cell, epoch, blob, slot, class, runs, proof, inputs, approvals', () => {
  const proof = proofBytes();
  const supervised = { runId: 'run-p1a1', slot: 1, ordinal: 1, supervisor: SUP1_ID };
  const facts = { classes: ['t-kill'], primaryRuns: ['run-p1a1'], open: null, lost: [], last: supervised,
    concerned: supervised, membersSeen: MEMBERS, artifacts: [] };
  const ctx = { key: KEY, epoch: MANIFEST.epoch, manifestBlob: BLOB, manifest: MANIFEST, facts: facts,
    readBytes: (f) => (f.replace(/\\/g, '/').endsWith(PROOF_REL) ? proof : DIAG_BYTES) };
  const good = authObject({ terminationProof: { path: PROOF_REL, sha256: util.sha256(proof) } });
  assert.deepStrictEqual(plan.authorizationProblems(good, ctx), []);
  assert.ok(plan.authorizationProblems(null, ctx).length > 0);
  assert.ok(plan.authorizationProblems(Object.assign({}, good, { primaryRuns: [] }), ctx).length > 0);
  assert.ok(plan.authorizationProblems(Object.assign({}, good, { ownerDecision: 'S-OD13' }), ctx).length > 0);
  const wrongClass = Object.assign({}, good, { faultClass: 'worker-fault' });
  assert.ok(plan.authorizationProblems(wrongClass, ctx).length > 0);
  const open = Object.assign({}, facts, { open: supervised });
  assert.ok(plan.authorizationProblems(good, Object.assign({}, ctx, { facts: open })).length > 0,
    'closesRun is required exactly when an attempt is open');
  const withClose = Object.assign({}, good, { closesRun: supervised, faultClass: 'supervisor-crash' });
  const openClass = Object.assign({}, open, { classes: ['supervisor-crash'] });
  const asOpen = Object.assign({}, ctx, { facts: openClass });
  assert.deepStrictEqual(plan.authorizationProblems(withClose, asOpen), []);
  const noLoss = Object.assign({}, facts, { classes: ['supervisor-crash'] });
  assert.ok(plan.authorizationProblems(withClose, Object.assign({}, ctx, { facts: noLoss })).length > 0,
    'closesRun without a loss');
  const noMembers = Object.assign({}, ctx, { facts: Object.assign({}, facts, { membersSeen: null }) });
  assert.ok(plan.authorizationProblems(good, noMembers).some((p) => /unknown/.test(p)));
});

try {
  fs.rmSync(SCRATCH, { recursive: true, force: true });
} catch (err) {
  console.log('could not remove ' + SCRATCH + ': ' + err.message);
}
console.log(passed + ' passed, ' + failed.length + ' failed');
if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
process.exitCode = failed.length === 0 ? 0 : 1;
