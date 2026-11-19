'use strict';

/*
 * MS18d Phase C1 task-owned tests, FAKE-DATA, of the readiness of policy A (`MS18d-GP-host-active`): the pure
 * decisions of readiness-core.js (the exact named host instance, the binding record, the five aggregate
 * intervals and the raw `ready` verdict, the additional-consumer rule at its exact 0.5 CPU-s per elapsed
 * second boundary, eligibility of a re-ask), the readiness run of readiness.js over a stand-in's facts, and
 * the controller's integration (real controller, real tee, stand-in command): admitted, busy-but-admitted,
 * an additional consumer, a replaced host, query failure and timeout, the 45 s and 60 s budgets, a real
 * recorder run without a configured readiness. Every number is invented here: no counter of this machine,
 * no process table, no measurement is read except where a test says so. Run it through the lock wrapper:
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-c/test-readiness.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const core = require('./readiness-core.js');
const readiness = require('./readiness.js');
const journalsMod = require('./journals.js');
const rd = require('./standin-readiness.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const CONTROLLER = path.join(__dirname, 'controller.js');
const FAKE_GP = path.join(__dirname, 'fake-gp.js');
const OWNED = path.join(__dirname, 'owned-processes.ps1');
const scratch = fs.mkdtempSync(path.join(REPO, '.scratch-ms18d-c-rd-'));

let passed = 0;
const failed = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + ': ' + (err && err.stack));
  }
}

const jsonOf = (v) => JSON.parse(JSON.stringify(v));
const key = (p) => p.pid + ':' + p.createdMs;
const NOW = rd.T0;

// ---------------------------------------------------------------------------------------------------------
// the binding record and the exact named host instance
// ---------------------------------------------------------------------------------------------------------

function pureBindingTests() {
  const hostOver = { pid: 5555, parentPid: 4001, dotNetStartTime: '2026-02-02T07:00:00.1111111+07:00',
    cimCreationDateUtcMicroseconds: '2026-02-02T00:00:00.111111Z' };
  const jr = require('./journals.js');
  const bad = (opts, why) => {
    const s = rd.journalWorld(opts).hostBinding();
    assert.strictEqual(s.ok, false, why);
    assert.strictEqual(s.current, null, 'no binding is in force');
    assert.strictEqual(s.expected, null);
    return s.problems.join(' | ');
  };

  return Promise.all([
    test('journal: the committed first binding is in force; the tuple is derived and recorded', () => {
      const s = rd.journalWorld({}).hostBinding();
      assert.ok(s.ok, s.problems.join());
      assert.deepStrictEqual(s.expected, rd.HOST);
      assert.strictEqual(s.reference.bindingId, 'host-1');
      assert.strictEqual(s.reference.journal.entryCount, 1);
      assert.strictEqual(s.reference.journal.commit, rd.HEAD);
      assert.strictEqual(s.reference.journal.baseCommit, rd.BASE);
      assert.ok(/^[0-9a-f]{64}$/.test(s.reference.journal.sha256));
      assert.strictEqual(s.reference.journal.sha256, s.reference.journal.baseSha256,
        'nothing appended since B');
      assert.strictEqual(s.reference.evidence.verified, true);
    }),
    test('journal: the LAST entry is in force; the earlier entry stays in the chain with its tuple', () => {
      const w = rd.journalWorld({ bindings: [{}, { host: hostOver }] });
      const s = w.hostBinding();
      assert.ok(s.ok, s.problems.join());
      assert.strictEqual(s.current.bindingId, 'host-2');
      assert.strictEqual(s.current.replaces, 'host-1');
      assert.strictEqual(s.expected.pid, 5555);
      assert.strictEqual(s.expected.netStartUtc, '2026-02-02T00:00:00.1111111Z');
      assert.strictEqual(s.reference.journal.entryCount, 2);
      assert.notStrictEqual(s.reference.journal.sha256, s.reference.journal.baseSha256);
      assert.deepStrictEqual(s.journal.entries.map((e) => jr.bindingTuple(e).pid), [rd.HOST.pid, 5555]);
    }),
    test('journal: an empty journal means NO host binding is configured: a hold reason, no fall-back', () => {
      assert.ok(/host-binding journal is empty: no host binding is configured/.test(
        bad({ bindings: [], baseBindings: 0 }, 'empty')));
      assert.ok(/host-binding journal is empty/.test(
        bad({ rawBindings: '\n\r\n', baseBindings: 0 }, 'blank')));
    }),
    test('journal: a line that is not JSON, not a binding, or not exactly the shape is never skipped', () => {
      const cases = [[{ rawBindings: '{not json\n', baseBindings: 0 }, /binding line 1 is not JSON/],
        [{ bindings: [{ over: { extra: 1 } }] }, /unknown member extra/],
        [{ bindings: [{ over: { bindingId: 'bad id' } }] }, /bindingId/],
        [{ bindings: [{ over: { replaces: 'host-0' } }] }, /replaces/],
        [{ bindings: [{}, { replaces: 'host-0' }] }, /replaces host-0, the exact prior binding is host-1/],
        [{ bindings: [{}, { bindingId: 'host-1' }] }, /bindingId repeats/],
        [{ bindings: [{ host: { pid: 4 } }] }, /host\.pid/],
        [{ bindings: [{ host: { pid: '4242' } }] }, /host\.pid/],
        [{ bindings: [{ host: { dotNetStartTime: '2026-01-01T07:00:00.123456+07:00' } }] },
          /dotNetStartTime/],
        [{ bindings: [{ host: { dotNetStartTime: '2026-01-01T07:00:00.1234567' } }] }, /dotNetStartTime/],
        [{ bindings: [{ host: { cimCreationDateUtcMicroseconds: '2026-01-01T00:00:00.1234567Z' } }] },
          /cimCreation/],
        [{ bindings: [{ host: { cimCreationDateUtcMicroseconds: '2026-01-01T07:00:00.123456+07:00' } }] },
          /cimCreation/],
        [{ bindings: [{ host: { executablePath: '' } }] }, /executablePath/],
        [{ bindings: [{ host: { surprise: 1 } }] }, /unknown host member surprise/],
        [{ bindings: [{ over: { at: '2026-01-01T00:00:00.000Z' } }] }, /at is before observedAt/],
        [{ bindings: [{ over: { observedAt: '2026-01-02T10:00:00' } }] }, /observedAt/],
        [{ bindings: [{ over: { ref: ' ' } }] }, /ref/],
        [{ bindings: [{ over: { evidence: { file: 'tasks/other.json', sha256: 'a'.repeat(64) } } }] },
          /evidence/],
        [{ bindings: [{ over: { evidence: { file: jr.EVIDENCE_DIR + 'host-1.json', sha256: 'A' } } }] },
          /evidence/]];
      cases.forEach(([opts, why]) => assert.ok(why.test(bad(opts, why)), String(why)));
    }),
    test('journal: ProcessName may be recorded as a diagnostic and never takes part in any match', () => {
      const s = rd.journalWorld({ bindings: [{ host: { processName: 'copilot.exe.old-25148-1' } }] })
        .hostBinding();
      assert.ok(s.ok, s.problems.join());
      assert.deepStrictEqual(s.expected, rd.HOST);
    }),
    test('journal: the evidence is committed, is JSON and is exactly the cited bytes (CRLF-agnostic)', () => {
      assert.ok(/is not committed at/.test(bad({ noEvidence: true }, 'no evidence')));
      assert.ok(/is not the cited bytes/.test(
        bad({ bindings: [{ evidenceText: '{"x": 1}\n' }] }, 'other bytes')));
      const w = rd.journalWorld({});
      const text = w.committed[jr.EVIDENCE_DIR + 'host-1.json'];
      w.committed[jr.EVIDENCE_DIR + 'host-1.json'] = text.replace(/\n/g, '\r\n');
      assert.ok(w.hostBinding().ok, 'CRLF working copy and LF blob agree');
      const notJson = rd.bindingEntry({});
      const cited = jr.normalizedSha256('not json\n');
      const cites = { evidence: { file: notJson.entry.evidence.file, sha256: cited } };
      const w2 = rd.journalWorld({ bindings: [{ over: cites, evidenceText: 'not json\n' }] });
      assert.ok(/is not JSON/.test(w2.hostBinding().problems.join()));
    }),
    test('journal: only the COMMITTED text counts: a journal that is not committed has no binding', () => {
      const w = rd.journalWorld({});
      delete w.committed[jr.BINDINGS_REL];
      const s = w.hostBinding();
      assert.strictEqual(s.ok, false);
      assert.ok(/is not committed at/.test(s.problems.join()));
    }),
    test('journal: the version committed at the campaign base must remain an exact line prefix', () => {
      const ok = rd.journalWorld({ bindings: [{}, { host: hostOver }], baseBindings: 1 }).hostBinding();
      assert.ok(ok.ok, ok.problems.join());
      const rewritten = rd.journalWorld({ bindings: [{}, { host: hostOver }] });
      rewritten.committedBase[jr.BINDINGS_REL] = rewritten.committedBase[jr.BINDINGS_REL]
        .replace('host-1', 'host-X');
      const s = rewritten.hostBinding();
      assert.strictEqual(s.ok, false);
      assert.ok(/does not keep the version committed at the base/.test(s.problems.join()));
      const dropped = rd.journalWorld({ bindings: [{}] });
      dropped.committedBase[jr.BINDINGS_REL] += dropped.committedBase[jr.BINDINGS_REL];
      assert.ok(/does not keep the version committed/.test(dropped.hostBinding().problems.join()));
      const noBase = rd.journalWorld({ bindings: [{}] });
      delete noBase.committedBase[jr.BINDINGS_REL];
      assert.ok(/is not committed at the campaign base/.test(noBase.hostBinding().problems.join()));
    }),
    test('journal: the digest of a journal does not depend on CRLF or LF line ends', () => {
      const lf = rd.journalWorld({});
      const crlf = rd.journalWorld({});
      crlf.committed[jr.BINDINGS_REL] = crlf.committed[jr.BINDINGS_REL].replace(/\n/g, '\r\n');
      crlf.committedBase[jr.BINDINGS_REL] = crlf.committedBase[jr.BINDINGS_REL].replace(/\n/g, '\r\n');
      assert.strictEqual(crlf.hostBinding().reference.journal.sha256,
        lf.hostBinding().reference.journal.sha256);
    }),
    test('rulings: an empty journal is valid; lines have exactly the F3 shape; repeats contradict', () => {
      const empty = rd.journalWorld({}).rulings();
      assert.ok(empty.ok);
      assert.strictEqual(empty.entries.length, 0);
      const one = rd.journalWorld({ rulings: [rd.ruling('c1', 'c1.a1')] }).rulings();
      assert.ok(one.ok, one.problems.join());
      assert.strictEqual(one.entries.length, 1);
      assert.strictEqual(one.reference.entryCount, 1);
      const badLines = [[rd.ruling('c1', 'c1.a1', { allowAttempt: 3 }), /not exactly/],
        [rd.ruling('c1', 'c1.a1', { allowAttempt: '2' }), /not exactly/],
        [rd.ruling('c1', 'c1.a1', { ref: '' }), /not exactly/],
        [rd.ruling('c1', 'c1.a1', { at: 't' }), /not exactly/],
        [rd.ruling('c1', 'c1.a1', { at: '2026-01-02T12:00:00' }), /not exactly/],
        [rd.ruling('c1', 'c1.a1', { extra: 1 }), /not exactly/], [rd.ruling('', 'c1.a1'), /not exactly/]];
      badLines.forEach(([r, why]) => {
        const s = rd.journalWorld({ rulings: [r] }).rulings();
        assert.strictEqual(s.ok, false);
        assert.deepStrictEqual(s.entries, []);
        assert.ok(why.test(s.problems.join()), s.problems.join());
      });
      const twice = rd.journalWorld({ rulings: [rd.ruling('c1', 'c1.a1'),
        rd.ruling('c1', 'c1.a1', { ref: 'again' })] }).rulings();
      assert.ok(/ruling line 2 repeats/.test(twice.problems.join()));
      assert.ok(/is not JSON/.test(rd.journalWorld({ rawRulings: '{x\n' }).rulings().problems.join()));
      assert.ok(/is not committed at/.test((() => {
        const w = rd.journalWorld({});
        delete w.committed[jr.RULINGS_REL];
        return w.rulings().problems.join();
      })()));
    }),
    test('rulings: the version at the campaign base must remain an exact line prefix', () => {
      const ok = rd.journalWorld({ rulings: [rd.ruling('c1', 'c1.a1'), rd.ruling('c2', 'c2.a1')],
        baseRulings: 1 }).rulings();
      assert.ok(ok.ok, ok.problems.join());
      const w = rd.journalWorld({ rulings: [rd.ruling('c1', 'c1.a1')], baseRulings: 1 });
      w.committedBase[jr.RULINGS_REL] = JSON.stringify(rd.ruling('c1', 'c1.a1', { ref: 'rewritten' })) + '\n';
      assert.ok(/does not keep the version committed at the base/.test(w.rulings().problems.join()));
    }),
    test('journal: utcTicks7 keeps the 100 ns of the .NET start time and converts the zone to UTC', () => {
      assert.strictEqual(jr.utcTicks7('2026-11-13T19:26:33.6916441+07:00'), '2026-11-13T12:26:33.6916441Z');
      assert.strictEqual(jr.utcTicks7('2026-11-13T12:26:33.6916441Z'), '2026-11-13T12:26:33.6916441Z');
      assert.strictEqual(jr.utcTicks7('2026-11-13T12:26:33.691644Z'), '2026-11-13T12:26:33.6916440Z');
      assert.strictEqual(jr.utcTicks7('2026-11-13T12:26:33'), null);
    }),
    test('host: the exact instance verifies; the display name and the CIM name are never compared', () => {
      const e = core.evaluateHost(rd.HOST, rd.hostFacts(rd.HOST, { displayName: 'copilot.exe.old-25148-1',
        name: 'copilot.exe.old-25148-1' }));
      assert.strictEqual(e.verified, true);
      assert.strictEqual(e.kind, 'verified');
      assert.ok(Object.values(e.checks).every(Boolean));
      assert.deepStrictEqual(Object.keys(e.checks).sort(),
        ['cimCreationUtc', 'exePath', 'netStartUtc', 'parentPid', 'pid']);
    }),
    test('host: a missing process is `absent`; no binding is `unbound`', () => {
      assert.strictEqual(core.evaluateHost(rd.HOST, { found: false, pid: rd.HOST.pid }).kind, 'absent');
      assert.strictEqual(core.evaluateHost(rd.HOST, null).kind, 'absent');
      assert.strictEqual(core.evaluateHost(null, rd.hostFacts(rd.HOST)).kind, 'unbound');
    }),
    test('host: every fact is compared on its own: a different one is a replaced instance', () => {
      const cases = [['pid', 1], ['parentPid', 3], ['exePath', 'C:\\other\\copilot.exe'],
        ['netStartUtc', '2026-01-01T00:00:00.1234568Z'], ['cimCreationUtc', '2026-01-01T00:00:00.123457Z']];
      cases.forEach(([k, v]) => {
        const e = core.evaluateHost(rd.HOST, rd.hostFacts(rd.HOST, { [k]: v }));
        assert.strictEqual(e.verified, false, k);
        assert.strictEqual(e.checks[k], false, k);
        assert.strictEqual(e.kind, 'replaced', k);
      });
    }),
    test('host: a fact the probe could not read (null) or an error is `unreadable`, never verified', () => {
      assert.strictEqual(core.evaluateHost(rd.HOST, rd.hostFacts(rd.HOST, { netStartUtc: null })).kind,
        'unreadable');
      assert.strictEqual(core.evaluateHost(rd.HOST, rd.hostFacts(rd.HOST, { error: 'denied' })).verified,
        false);
    }),
    test('host: the path compares without case (Windows), the times exactly, the names never', () => {
      assert.ok(core.evaluateHost(rd.HOST, rd.hostFacts(rd.HOST, { name: 'OTHER.EXE', displayName: 'x',
        exePath: 'c:\\FAKE\\copilot.exe' })).verified);
    })
  ]);
}

// ---------------------------------------------------------------------------------------------------------
// the aggregate screen
// ---------------------------------------------------------------------------------------------------------

function pureCounterTests() {
  return Promise.all([
    test('counters: five valid intervals give the busy cores of each; mean, max and ready', () => {
      const r = core.intervalsFrom(rd.readings(16, [0.2, 0.3, 0.25, 0.4, 0.1]), 16);
      assert.ok(r.valid, r.problems.join());
      assert.deepStrictEqual(r.intervals.map((i) => i.busyCores), [0.2, 0.3, 0.25, 0.4, 0.1]);
      assert.ok(r.intervals.every((i) => i.instances === 16 && i.elapsedMs === 1000 && i.valid));
      const a = core.aggregateOf(r.intervals);
      assert.strictEqual(a.valid, true);
      assert.ok(Math.abs(a.mean - 0.25) < 1e-12);
      assert.strictEqual(a.max, 0.4);
      assert.strictEqual(a.ready, true);
    }),
    test('counters: busy cores sum over the logical processors, with no normalisation', () => {
      const r = core.intervalsFrom(rd.readings(16, [3, 3.5, 2, 16, 0]), 16);
      assert.deepStrictEqual(r.intervals.map((i) => i.busyCores), [3, 3.5, 2, 16, 0]);
      assert.strictEqual(core.aggregateOf(r.intervals).ready, false);
    }),
    test('ready: mean <= 0.5 and max <= 1.0 are inclusive, unrounded', () => {
      const at = (busy) => core.aggregateOf(core.intervalsFrom(rd.readings(16, busy), 16).intervals);
      assert.strictEqual(at([1, 0.5, 0.5, 0.5, 0]).ready, true, 'mean exactly 0.5, max exactly 1.0');
      assert.strictEqual(at([0.5, 0.5, 0.5, 0.5, 0.5]).ready, true);
      assert.strictEqual(at([1, 0.5, 0.5, 0.5, 0.0001]).ready, false, 'mean just above 0.5');
      assert.strictEqual(at([1.0001, 0, 0, 0, 0]).ready, false, 'max just above 1.0');
      assert.strictEqual(at([2.5, 0, 0, 0, 0]).ready, false, 'mean 0.5 but max 2.5');
    }),
    test('counters: the interval clock must say 900..1600 ms (the bounds are valid, outside is not)', () => {
      const at = (ms) => core.intervalsFrom(rd.readings(16, [0, 0, 0, 0, 0], ms), 16).valid;
      assert.strictEqual(at(900), true);
      assert.strictEqual(at(1600), true);
      assert.strictEqual(at(899), false);
      assert.strictEqual(at(1601), false);
    }),
    test('counters: a wrong processor count, a missing reading or a broken counter is invalid', () => {
      assert.strictEqual(core.intervalsFrom(rd.readings(8, [0, 0, 0, 0, 0]), 16).valid, false);
      assert.strictEqual(core.intervalsFrom(rd.readings(16, [0, 0, 0, 0, 0]).slice(1), 16).valid, false);
      assert.strictEqual(core.intervalsFrom(null, 16).valid, false);
      const r = rd.readings(16, [0.1, 0.1, 0.1, 0.1, 0.1]);
      r[3].cpus[5].idle = r[2].cpus[5].idle - 1; // a counter that went backwards: busy > total
      const broken = core.intervalsFrom(r, 16);
      assert.strictEqual(broken.valid, false);
      assert.strictEqual(core.aggregateOf(broken.intervals).valid, false);
      assert.strictEqual(core.aggregateOf(broken.intervals).ready, false);
      const stalled = rd.readings(16, [0, 0, 0, 0, 0]);
      stalled[2].cpus[0] = Object.assign({}, stalled[1].cpus[0]); // no time passed on one processor
      assert.strictEqual(core.intervalsFrom(stalled, 16).valid, false);
      const nan = rd.readings(16, [0, 0, 0, 0, 0]);
      nan[1].cpus[2].user = NaN;
      assert.strictEqual(core.intervalsFrom(nan, 16).valid, false);
    })
  ]);
}

// ---------------------------------------------------------------------------------------------------------
// the additional-consumer rule
// ---------------------------------------------------------------------------------------------------------

function classify(over, owned) {
  const input = rd.quietInput(over);
  const minWindowMs = 5000;
  const host = { pid: rd.HOST.pid, createdMs: input.after.processes.filter((p) => p.pid === rd.HOST.pid)[0]
    .createdMs };
  return core.classifyProcesses(input.before, input.after, { host, owned: owned || input.owned,
    minWindowMs });
}

const bystanderKey = key(rd.proc(310, 'bystander.exe', NOW - 7e6, 1000));

function pureConsumerTests() {
  return Promise.all([
    test('consumers: a quiet table has none; every process of the table was observed', () => {
      const c = classify();
      assert.ok(c.valid, c.problems.join());
      assert.strictEqual(c.consumers.length, 0);
      assert.strictEqual(c.windowMs, 8000);
      assert.ok(c.observed >= 2);
    }),
    test('consumers: >= 0.5 CPU-s per elapsed second is a consumer, exactly 0.5 included, 0.4999 not', () => {
      const at = (rate) => classify({ snapshotOptions: { rates: { [bystanderKey]: rate } } });
      assert.strictEqual(at(0.5).consumers.length, 1);
      assert.strictEqual(at(0.5).consumers[0].pid, 310);
      assert.strictEqual(at(0.5).consumers[0].cpuSecondsPerSecond, 0.5);
      assert.strictEqual(at(0.4999).consumers.length, 0);
      assert.strictEqual(at(0.5001).consumers.length, 1);
      assert.strictEqual(at(3).consumers.length, 1);
    }),
    test('consumers: only the host itself, the idle process and this run\'s own ones are excluded', () => {
      const host = rd.HOST.pid + ':' + (NOW - 8e6);
      const all = { snapshotOptions: { rates: { [host]: 4, ['0:' + (NOW - 9e6)]: 16,
        ['5000:' + (NOW - 100000)]: 1, ['5001:' + (NOW - 90000)]: 1, [bystanderKey]: 0.7 } } };
      const c = classify(all);
      assert.deepStrictEqual(c.consumers.map((p) => p.pid), [310]);
      const roles = c.excluded.map((e) => e.role).sort();
      assert.deepStrictEqual(roles, ['controller', 'host', 'idle', 'readiness-probe', 'wrapper']);
    }),
    test('consumers: the host\'s descendants and other Copilot/OS processes are NOT exempt', () => {
      const child = rd.proc(8001, 'node.exe', NOW - 5e6, 500, rd.HOST.pid);
      const service = rd.proc(8002, 'svchost.exe', NOW - 6e6, 500, 4);
      const copilot = rd.proc(8003, 'copilot.exe', NOW - 4e6, 500, 1);
      const rates = { [key(child)]: 0.9, [key(service)]: 0.6, [key(copilot)]: 0.55 };
      const c = classify({ snapshotOptions: { extra: [child, service, copilot], rates } });
      assert.deepStrictEqual(c.consumers.map((p) => p.pid).sort(), [8001, 8002, 8003]);
    }),
    test('consumers: a process is told apart by PID plus creation time: a reused PID is NEW', () => {
      const first = rd.proc(8100, 'a.exe', NOW - 5e6, 1000);
      const input = rd.quietInput({ snapshotOptions: { extra: [first] } });
      // the second snapshot holds a process with the same PID, created later, with a big CPU total
      input.after.processes = input.after.processes.filter((p) => p.pid !== 8100).concat(
        [rd.proc(8100, 'b.exe', NOW - 1000, 6000)]);
      const c = core.classifyProcesses(input.before, input.after, { host: { pid: rd.HOST.pid,
        createdMs: NOW - 8e6 }, owned: input.owned, minWindowMs: 5000 });
      const hit = c.consumers.filter((p) => p.pid === 8100)[0];
      assert.ok(hit && hit.newInWindow, 'its whole CPU total counts in the window');
      assert.ok(c.vanished.some((p) => p.pid === 8100 && p.name === 'a.exe'), 'the old instance vanished');
    }),
    test('consumers: a process that appeared in the window is judged on its CPU over the window', () => {
      const small = rd.proc(8200, 'burst.exe', NOW + 5000, 3999);
      const large = rd.proc(8201, 'burst.exe', NOW + 5000, 4000);
      const c = classify({ snapshotOptions: { afterOnly: [small, large] } });
      assert.deepStrictEqual(c.consumers.map((p) => p.pid), [8201]);
      assert.strictEqual(c.created >= 2, true);
    }),
    test('consumers: a process that vanished is recorded, never classified or invented', () => {
      const c = classify({ snapshotOptions: { vanish: [310] } });
      assert.ok(c.valid);
      assert.strictEqual(c.consumers.length, 0);
      assert.deepStrictEqual(c.vanished.map((p) => p.pid), [310]);
    }),
    test('consumers: unknown data is invalid: no creation or CPU time, a CPU time going backwards', () => {
      const noCpu = classify({ snapshotOptions: { afterOnly: [rd.proc(8300, 'x.exe', NOW, null)] } });
      assert.strictEqual(noCpu.valid, false);
      assert.ok(/no creation time or CPU time/.test(noCpu.problems.join()));
      const back = classify({ snapshotOptions: { rates: { [bystanderKey]: -0.2 } } });
      assert.strictEqual(back.valid, false);
      assert.ok(/went backwards/.test(back.problems.join()));
    }),
    test('consumers: an unusable snapshot, or a window shorter than the intervals, is invalid', () => {
      const input = rd.quietInput();
      const ctx = { host: null, owned: [], minWindowMs: 5000 };
      assert.strictEqual(core.classifyProcesses(null, input.after, ctx).valid, false);
      assert.strictEqual(core.classifyProcesses(input.before, Object.assign({}, input.after,
        { ok: false }), ctx).valid, false);
      assert.strictEqual(core.classifyProcesses(input.before, Object.assign({}, input.after,
        { processes: [] }), ctx).valid, false);
      const shortWindow = rd.snapshots({ windowMs: 4000 });
      const c = core.classifyProcesses(shortWindow.before, shortWindow.after, { host: null, owned: [],
        minWindowMs: 5000 });
      assert.strictEqual(c.valid, false);
      assert.ok(/does not cover the aggregate/.test(c.problems.join()));
    })
  ]);
}

// ---------------------------------------------------------------------------------------------------------
// the decision
// ---------------------------------------------------------------------------------------------------------

function pureDecisionTests() {
  return Promise.all([
    test('decision: a quiet run is ready, admitted, complete, not an eligible hold', () => {
      const d = rd.quietDecision();
      assert.deepStrictEqual([d.complete, d.ready, d.admitted, d.eligibleReAsk, d.kind],
        [true, true, true, false, 'admitted']);
      assert.deepStrictEqual(d.reasons, []);
      assert.strictEqual(d.policy.name, 'MS18d-GP-host-active');
      assert.strictEqual(d.host.verified, true);
      assert.strictEqual(d.counters.valid, true);
    }),
    test('decision: ready and admitted are apart: a busy host is admitted under A, not ready', () => {
      const d = rd.quietDecision({ input: { readings: rd.readings(16, [3, 3, 3, 3, 3]) } });
      assert.strictEqual(d.ready, false, 'the raw strict screen is recorded as it is');
      assert.strictEqual(d.admitted, true, 'no additional consumer, every fact valid');
      assert.strictEqual(d.complete, true);
      assert.strictEqual(d.counters.mean, 3);
    }),
    test('decision: the other direction: ready does not admit when a consumer is present', () => {
      const d = rd.quietDecision({ snapshotOptions: { rates: { [bystanderKey]: 0.8 } } });
      assert.strictEqual(d.ready, true);
      assert.strictEqual(d.admitted, false);
    }),
    test('decision: an additional consumer ONLY is an eligible re-ask (complete, not admitted)', () => {
      const d = rd.quietDecision({ snapshotOptions: { rates: { [bystanderKey]: 0.8 } } });
      assert.deepStrictEqual([d.complete, d.admitted, d.eligibleReAsk, d.kind],
        [true, false, true, 'additional-consumer-hold']);
      assert.deepStrictEqual(d.reasons.map((r) => r.kind), ['additional-consumer']);
      assert.strictEqual(d.processes.consumers[0].pid, 310);
    }),
    test('decision: a mixed hold is never eligible: a consumer AND a replaced host', () => {
      const other = Object.assign({}, rd.HOST, { pid: 4243 });
      const d = rd.quietDecision({ snapshotOptions: { rates: { [bystanderKey]: 0.8 },
        hostFacts: rd.hostFacts(other) } });
      assert.strictEqual(d.admitted, false);
      assert.strictEqual(d.eligibleReAsk, false);
      assert.strictEqual(d.complete, false);
      assert.ok(d.reasons.some((r) => r.kind === 'host'));
    }),
    test('decision: a replaced, absent or half-replaced host holds without eligibility', () => {
      const replaced = Object.assign({}, rd.HOST, { cimCreationUtc: '2026-03-03T00:00:00.000001Z' });
      const d1 = rd.quietDecision({ snapshotOptions: { hostFacts: rd.hostFacts(replaced) } });
      const d2 = rd.quietDecision({ snapshotOptions: { hostMissing: true } });
      const d3 = rd.quietDecision({ snapshotOptions: { afterHost: rd.hostFacts(replaced) } });
      [d1, d2, d3].forEach((d) => {
        assert.deepStrictEqual([d.admitted, d.eligibleReAsk, d.kind], [false, false, 'hold']);
        assert.strictEqual(d.host.verified, false);
      });
      assert.strictEqual(d3.host.first.verified, true, 'the host changed between the snapshots');
      assert.strictEqual(d3.host.second.verified, false);
    }),
    test('decision: the tooling does not rebind: a replaced host is held again and again', () => {
      const replaced = Object.assign({}, rd.HOST, { pid: 9999 });
      for (let i = 0; i < 3; i++) {
        const d = rd.quietDecision({ snapshotOptions: { hostFacts: rd.hostFacts(replaced) } });
        assert.strictEqual(d.admitted, false);
        assert.deepStrictEqual(d.host.expected, rd.HOST, 'the expected binding never moves to the new host');
      }
      const src = fs.readFileSync(path.join(__dirname, 'readiness-core.js'), 'utf8');
      assert.ok(!/writeFile|appendFile|require\('fs'\)/.test(src), 'the decision module cannot write');
    }),
    test('decision: bad facts hold with no eligibility: counters, snapshot, host, timeout, policy', () => {
      const cases = {
        counter: { input: { readings: rd.readings(16, [0, 0, 0, 0, 0], 2000) } },
        snapshot: { input: { before: null } },
        host: { input: { expected: null } },
        timeout: { input: { budget: { elapsedMs: 45001, queryDurationsMs: [600, 650] } } },
        timeoutQuery: { input: { budget: { elapsedMs: 8200, queryDurationsMs: [15001, 650] } } },
        policy: { input: { policy: { selector: 'S-OD15', choice: 'B' } } }
      };
      Object.keys(cases).forEach((name) => {
        const d = rd.quietDecision(Object.assign({ snapshotOptions: { rates: { [bystanderKey]: 0.8 } } },
          cases[name]));
        assert.strictEqual(d.admitted, false, name);
        assert.strictEqual(d.eligibleReAsk, false, name + ' is never eligible, even with a consumer');
        assert.strictEqual(d.complete, false, name);
      });
      const edge = rd.quietDecision({ input: { budget: { elapsedMs: 45000,
        queryDurationsMs: [15000, 15000] } } });
      assert.strictEqual(edge.admitted, true, 'the 45 s and 15 s budgets are inclusive');
    }),
    test('decision: both queries must be recorded', () => {
      const d = rd.quietDecision({ input: { budget: { elapsedMs: 8200, queryDurationsMs: [600] } } });
      assert.strictEqual(d.admitted, false);
    }),
    test('decision: the limits are the ones of the pack', () => {
      assert.deepStrictEqual([core.LIMITS.intervalCount, core.LIMITS.readyMeanMax, core.LIMITS.readyMaxMax,
        core.LIMITS.consumerCpuPerSecond, core.LIMITS.totalBudgetMs, core.LIMITS.queryBudgetMs,
        core.LIMITS.callToSpawnMs], [5, 0.5, 1.0, 0.5, 45000, 15000, 60000]);
      assert.strictEqual(core.POLICY.name, 'MS18d-GP-host-active');
    })
  ]);
}

// ---------------------------------------------------------------------------------------------------------
// the readiness run over a stand-in's facts
// ---------------------------------------------------------------------------------------------------------

let seq = 0;
function files(opts) {
  const o = opts || {};
  const dir = path.join(scratch, 'r' + (++seq));
  fs.mkdirSync(dir, { recursive: true });
  const pair = rd.snapshots(Object.assign({ extra: [rd.proc(process.pid, 'node.exe', NOW - 100000, 2000)] },
    o.snapshotOptions));
  const fixture = Object.assign({ readings: rd.readings(16, o.busy || [0.2, 0.3, 0.25, 0.4, 0.1]),
    snapshots: [pair.before, pair.after], queries: [{}, {}], elapsedMs: 8000 }, o.fixture);
  const fixtureFile = path.join(dir, 'fixture.json');
  fs.writeFileSync(fixtureFile, JSON.stringify(fixture));
  return { dir, fixtureFile, pair, world: o.world || rd.journalWorld({}) };
}

function readinessConfig(f, over) {
  return Object.assign({ fixture: f.fixtureFile, logicalCpus: 16, powershell: 'pwsh', probeScript: 'unused',
    policy: { selector: 'S-OD15', choice: 'A', name: core.POLICY.name } }, over || {});
}

// `binding` is the host-binding state of the committed journal (journals.hostBindingState); by default that
// of the world of `f`
const run = (f, over, request, binding) => readiness.runReadiness({
  request: Object.assign({ standin: true, wrapperPid: process.pid, readiness: readinessConfig(f, over) },
    request || {}), controllerPid: 5001, requestedAtMs: Date.now(),
  binding: binding === undefined ? f.world.hostBinding() : binding });

// the second binding of a rebinding journal and the facts of that host
const REBOUND = { pid: 5555, parentPid: 4001, dotNetStartTime: '2026-02-02T07:00:00.1111111+07:00',
  cimCreationDateUtcMicroseconds: '2026-02-02T00:00:00.111111Z' };

function runtimeTests() {
  return Promise.all([
    test('runtime: a quiet stand-in run is admitted; wrapper, controller and probes are owned', async () => {
      const f = files();
      const r = await run(f);
      assert.strictEqual(r.decision.admitted, true, JSON.stringify(r.decision.reasons));
      assert.deepStrictEqual(r.record.inputs.owned.map((o) => o.role).sort(),
        ['controller', 'readiness-probe', 'readiness-probe', 'wrapper']);
      assert.strictEqual(r.record.inputs.owned.filter((o) => o.role === 'wrapper')[0].pid, process.pid);
      assert.deepStrictEqual(r.record.inputs.expected, rd.HOST);
      assert.strictEqual(r.record.inputs.bindingSource, 'journal entry host-1');
      assert.strictEqual(r.record.inputs.binding.bindingId, 'host-1');
      assert.strictEqual(r.record.inputs.binding.journal.entryCount, 1);
      assert.strictEqual(r.record.inputs.binding.evidence.verified, true);
      assert.strictEqual(r.record.inputs.readings.length, 6);
      assert.deepStrictEqual(r.record.inputs.budget.queryDurationsMs, [600, 600]);
      assert.ok(r.before && r.after);
    }),
    test('runtime: an APPROVED rebinding (the last committed entry) is the binding in force', async () => {
      const world = rd.journalWorld({ bindings: [{}, { host: REBOUND }] });
      const f = files({ world, snapshotOptions: { binding: world.hostBinding().expected } });
      const r = await run(f);
      assert.strictEqual(r.decision.admitted, true, JSON.stringify(r.decision.reasons));
      assert.strictEqual(r.record.inputs.bindingSource, 'journal entry host-2');
      assert.strictEqual(r.record.inputs.binding.bindingId, 'host-2');
      assert.strictEqual(r.record.inputs.binding.journal.entryCount, 2);
      assert.strictEqual(r.record.inputs.expected.pid, 5555);
    }),
    test('runtime: the former host is NOT exempt after a rebinding; the prior binding stays in the journal',
      async () => {
      const world = rd.journalWorld({ bindings: [{}, { host: REBOUND }] });
      const f = files({ world });
      const r = await run(f);
      assert.strictEqual(r.decision.admitted, false);
      assert.strictEqual(r.decision.eligibleReAsk, false);
      assert.ok(r.decision.reasons.some((x) => x.kind === 'host'));
      assert.strictEqual(world.hostBinding().journal.entries[0].bindingId, 'host-1',
        'the prior binding is kept');
    }),
    test('runtime: an UNAPPROVED rebinding (not in the committed journal) changes nothing: held',
      async () => {
      const other = Object.assign({}, rd.HOST, { pid: 5555, parentPid: 4001,
        netStartUtc: '2026-02-02T00:00:00.1111111Z', cimCreationUtc: '2026-02-02T00:00:00.111111Z' });
      const f = files({ snapshotOptions: { hostFacts: rd.hostFacts(other) } });
      const before = JSON.stringify(f.world.committed);
      const r = await run(f);
      assert.strictEqual(r.decision.admitted, false);
      assert.strictEqual(r.decision.eligibleReAsk, false);
      assert.deepStrictEqual(r.decision.host.expected, rd.HOST, 'the expected binding never moves');
      assert.strictEqual(JSON.stringify(f.world.committed), before, 'the journals are untouched');
      assert.deepStrictEqual(fs.readdirSync(f.dir).sort(), ['fixture.json']);
    }),
    test('runtime: a ProcessName-only rename is no false hold; a restart or a reused PID holds', async () => {
      const renamed = await run(files({ snapshotOptions: { hostFacts: rd.hostFacts(rd.HOST, {
        name: 'copilot.exe.old-25148-1', displayName: 'copilot.exe.old-25148-1' }) } }));
      assert.strictEqual(renamed.decision.admitted, true, JSON.stringify(renamed.decision.reasons));
      const restarted = await run(files({ snapshotOptions: { hostFacts: rd.hostFacts(rd.HOST, {
        netStartUtc: '2026-01-05T00:00:00.5000000Z', cimCreationUtc: '2026-01-05T00:00:00.500000Z' }) } }));
      assert.strictEqual(restarted.decision.admitted, false);
      assert.strictEqual(restarted.decision.eligibleReAsk, false);
      assert.strictEqual(restarted.decision.host.first.kind, 'replaced');
      assert.strictEqual(restarted.decision.host.verified, false);
      const gone = await run(files({ snapshotOptions: { hostMissing: true } }));
      assert.strictEqual(gone.decision.host.first.kind, 'absent');
      assert.strictEqual(gone.decision.eligibleReAsk, false);
    }),
    test('runtime: an empty, invalid or missing host-binding journal holds: NO host binding, no fall-back',
      async () => {
      for (const opts of [{ bindings: [], baseBindings: 0 }, { rawBindings: '{broken\r\n' },
        { bindings: [{}], noEvidence: true }]) {
        const f = files({ world: rd.journalWorld(opts) });
        const r = await run(f);
        assert.strictEqual(r.decision.admitted, false, JSON.stringify(opts));
        assert.strictEqual(r.decision.eligibleReAsk, false);
        assert.ok(r.decision.reasons.some((x) => x.kind === 'host'));
        assert.strictEqual(r.record.inputs.expected, null);
        assert.strictEqual(r.record.inputs.binding, null);
      }
      const none = await run(files(), {}, {}, null);
      assert.strictEqual(none.decision.admitted, false);
      assert.ok(none.decision.reasons.some((x) => /no host binding was read/.test(x.text)));
    }),
    test('runtime: a policy other than A, a missing probe, an unusable processor count: holds', async () => {
      const f = files();
      let r = await run(f, { policy: { selector: 'S-OD15', choice: 'B', name: 'strict' } });
      assert.strictEqual(r.decision.admitted, false);
      assert.ok(r.decision.reasons.some((x) => x.kind === 'policy'));
      r = await run(f, { fixture: undefined, probeScript: '' });
      assert.strictEqual(r.decision.admitted, false);
      assert.ok(r.decision.reasons.some((x) => /no readiness probe/.test(x.text)));
      r = await run(f, { logicalCpus: 0 });
      assert.strictEqual(r.decision.admitted, false);
    }),
    test('runtime: a query that fails or times out is a hold that is not an eligible re-ask', async () => {
      const failed1 = await run(files({ fixture: { queries: [{ ok: false, error: 'cim failed' }, {}] } }));
      assert.strictEqual(failed1.decision.admitted, false);
      assert.strictEqual(failed1.decision.eligibleReAsk, false);
      assert.ok(failed1.decision.reasons.some((x) => /snapshot query 1 failed: cim failed/.test(x.text)));
      assert.strictEqual(failed1.record.inputs.readings, null, 'no interval after a failed first query');
      const lost2 = await run(files({ snapshotOptions: { rates: { [bystanderKey]: 0.9 } },
        fixture: { queries: [{}, { ok: false, timedOut: true, error: 'timed out', durationMs: 15000 }] } }));
      assert.strictEqual(lost2.decision.eligibleReAsk, false, 'a consumer cannot make a timeout eligible');
      assert.ok(lost2.decision.reasons.some((x) => x.kind === 'timeout'));
    }),
    test('runtime: counters that cannot be read, or a readiness over 45 s, hold', async () => {
      const thrown = await run(files({ fixture: { sampleThrows: true } }));
      assert.strictEqual(thrown.decision.admitted, false);
      assert.ok(thrown.decision.reasons.some((x) => x.kind === 'counter'));
      const slow = await run(files({ fixture: { elapsedMs: 46000 } }));
      assert.strictEqual(slow.decision.admitted, false);
      assert.strictEqual(slow.decision.eligibleReAsk, false);
      assert.ok(slow.decision.reasons.some((x) => x.kind === 'timeout'));
    }),
    test('runtime: an additional consumer, and only that, is an eligible hold', async () => {
      const r = await run(files({ snapshotOptions: { rates: { [bystanderKey]: 0.75 } } }));
      assert.strictEqual(r.decision.admitted, false);
      assert.strictEqual(r.decision.eligibleReAsk, true);
      assert.strictEqual(r.decision.processes.consumers[0].pid, 310);
    }),
    test('runtime: a REAL run takes the frozen probe and processor count and no fixture', async () => {
      const f = files();
      const real = await run(f, {}, { standin: false, repo: REPO,
        expected: { machine: { logicalProcessors: 16 } } });
      assert.strictEqual(real.decision.admitted, false);
      const text = real.decision.reasons.map((x) => x.text).join(' | ');
      assert.ok(/readiness probeScript of the request is not the frozen one/.test(text), text);
      assert.ok(/fixture is for stand-ins only/.test(text), text);
      assert.ok(!/bindingFile|bindingsFile/.test(text), 'no binding file of the request exists any more');
    }),
    test('runtime: readiness is required for every real recorder run and where asked', () => {
      const recorder = { type: 'gp-recorder' };
      const merge = { type: 'gp-merge' };
      assert.strictEqual(readiness.readinessRequired({ standin: false }, recorder), true);
      assert.strictEqual(readiness.readinessRequired({ standin: false }, merge), false);
      assert.strictEqual(readiness.readinessRequired({ standin: true }, recorder), false);
      assert.strictEqual(readiness.readinessRequired({ standin: true, readiness: {} }, recorder), true);
      assert.strictEqual(readiness.readinessRequired({ standin: true, requireReadiness: true }, merge), true);
    })
  ]);
}

// ---------------------------------------------------------------------------------------------------------
// the journal validator (validate-journals.js): the same reader, over a working tree or a commit
// ---------------------------------------------------------------------------------------------------------

function validatorTests() {
  const validator = require('./validate-journals.js');
  const jr = require('./journals.js');
  const tree = (world, name) => {
    const dir = path.join(scratch, name);
    Object.keys(world.committed).forEach((rel) => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), world.committed[rel]);
    });
    return dir;
  };
  return Promise.all([
    test('validator: a working tree with a valid binding is ok but is NOT authority', () => {
      const dir = tree(rd.journalWorld({ rulings: [rd.ruling('c1', 'c1.a1')], noBase: true }), 'v1');
      const { report, ok } = validator.validate(['--repo', dir, '--working']);
      assert.strictEqual(ok, true, JSON.stringify(report.hostBinding.problems));
      assert.strictEqual(report.authority, false);
      assert.strictEqual(report.hostBinding.bindingId, 'host-1');
      assert.deepStrictEqual(report.hostBinding.tuple, rd.HOST);
      assert.strictEqual(report.rulings.entryCount, 1);
      assert.strictEqual(report.live, null);
    }),
    test('validator: an empty binding journal, a missing evidence file or a broken line is not ok', () => {
      for (const [name, opts] of [['v2', { bindings: [], baseBindings: 0, noBase: true }],
        ['v3', { bindings: [{}], noEvidence: true, noBase: true }],
        ['v4', { rawBindings: '{broken\n', noBase: true }]]) {
        const { report, ok } = validator.validate(['--repo', tree(rd.journalWorld(opts), name), '--working']);
        assert.strictEqual(ok, false, name);
        assert.strictEqual(report.hostBinding.configured, false, name);
        assert.ok(report.hostBinding.problems.length > 0, name);
      }
    }),
    test('validator: a damaged rulings journal makes the result not ok', () => {
      const world = rd.journalWorld({ rawRulings: '{x\n', noBase: true });
      const { report, ok } = validator.validate(['--repo', tree(world, 'v5'), '--working']);
      assert.strictEqual(ok, false);
      assert.strictEqual(report.hostBinding.ok, true);
      assert.strictEqual(report.rulings.ok, false);
    }),
    test('validator: exit 0 valid, 2 a problem; --report-only 0 with the verdict in the last line', () => {
      const out = [];
      const real = process.stdout.write;
      process.stdout.write = (t) => { out.push(String(t)); return true; };
      let codes;
      try {
        const good = tree(rd.journalWorld({ noBase: true }), 'v6');
        const empty = tree(rd.journalWorld({ bindings: [], baseBindings: 0, noBase: true }), 'v7');
        codes = [validator.main(['--repo', good, '--working']),
          validator.main(['--repo', empty, '--working']),
          validator.main(['--repo', empty, '--working', '--report-only'])];
      } finally {
        process.stdout.write = real;
      }
      assert.deepStrictEqual(codes, [0, 2, 0]);
      const lasts = out.join('').split('\n').filter((l) => l.startsWith('VALIDATE-JOURNALS'));
      assert.ok(/ok=true authority=false hostBinding=host-1 rulings=0$/.test(lasts[0]), lasts[0]);
      assert.ok(/ok=false authority=false hostBinding=none rulings=0$/.test(lasts[1]), lasts[1]);
      assert.ok(/ok=false/.test(lasts[2]));
    }),
    test('validator: reads nothing but files; the paths are the pack files', () => {
      const src = fs.readFileSync(path.join(__dirname, 'validate-journals.js'), 'utf8');
      assert.ok(!/writeFile|appendFile|mkdir|unlink|rmSync/.test(src), 'it cannot write');
      assert.strictEqual(jr.BINDINGS_REL, 'tasks/difficulty-v3/MS18d-gp-host-bindings.jsonl');
    })
  ]);
}

// ---------------------------------------------------------------------------------------------------------
// the controller with readiness: the real controller, the real tee, a stand-in command
// ---------------------------------------------------------------------------------------------------------

const MACHINE = { cpu: 'AMD EPYC 7763 64-Core Processor', logicalProcessors: 16, memoryGb: 64,
  platform: 'win32 10.0.26300' };
const HEAD = 'a'.repeat(40);
const GP_ARGS = ['tests\\perf.js', '--variant=classic4', '--level=veryEasy', '--runs=50', '--warmup=0',
  '--seed=7000', '--gate', '--ascii'];
const manifestFiles = fs.readdirSync(__dirname).map((n) => 'generator\\tests\\artifacts\\difficulty-v3\\' +
  'MS18d\\phase-c\\' + n);
fs.writeFileSync(path.join(scratch, 'manifest.txt'), manifestFiles.map((rel) => require('./common.js').sha256(
  fs.readFileSync(path.join(REPO, rel))).toUpperCase() + '  ' + rel).join('\r\n') + '\r\n');

function world(name, rdOpts) {
  const root = path.join(scratch, name);
  fs.mkdirSync(path.join(root, 'generator', 'tests'), { recursive: true });
  fs.writeFileSync(path.join(root, 'generator', 'tests', 'perf.js'),
    'require(' + JSON.stringify(FAKE_GP) + ');\n');
  const tmp = path.join(root, 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const logs = path.join(root, 'logs');
  fs.mkdirSync(logs, { recursive: true });
  const stamp = (ms) => new Date(ms).toISOString();
  const now = Date.now();
  const jsonl = (file, rows) => fs.writeFileSync(file,
    rows.map((r) => JSON.stringify(r)).join('\r\n') + '\r\n');
  jsonl(path.join(logs, 'a.jsonl'), [{ finished: stamp(now - 3600000) }]);
  jsonl(path.join(logs, 'b.jsonl'), [{ finished: stamp(now - 1800000) }]);
  jsonl(path.join(logs, 'c.jsonl'),
    [{ finished: stamp(now - 900000), releaseObservedAt: stamp(now - 899000) }]);
  const f = files(Object.assign({ snapshotOptions: {} }, rdOpts));
  fs.writeFileSync(path.join(root, 'fixture.json'), JSON.stringify({ head: HEAD, statusPorcelainZ: '',
    identities: { hashIdentity: 'H', replayIdentity: 'R', sources: 'S' },
    table: { sha256: 'TABLE', positions: [{ key: 'classic4/veryEasy', target: 31 }],
      targets: { 'classic4/veryEasy': 31 } }, machine: MACHINE, node: 'v26.13.0',
    committed: f.world.committed, committedBase: f.world.committedBase, workingFiles: {} }));
  return { name, root, tmp, logs, f, runDir: path.join(scratch, 'ev', name), now };
}

function request(w, over, rdOver) {
  const requested = Date.now();
  const o = Object.assign({
    schema: 'ms18d-c-request-1', runId: w.name, task: 'stand-in ' + w.name, standin: true,
    profile: 'gp-cell', allowExit1: true, cell: { variant: 'classic4', level: 'veryEasy', targetMs: 31 },
    runDir: w.runDir, repo: w.root, command: { args: GP_ARGS },
    requestedAt: new Date(requested).toISOString(),
    wrapperPid: process.pid, slotBefore: { shared: false, timing: false },
    watch: { schema: 'ms18d-c-watch-1', firstCheckMs: requested - 200 - 15300, lastCheckMs: requested - 200,
      checks: 62, windowChecks: 62, maxIntervalMs: 260, windowSightings: 0, restartCount: 0, restarts: [],
      gaveUp: false },
    releaseSources: [{ label: 'A', file: path.join(w.logs, 'a.jsonl'), kind: 'log', required: true },
      { label: 'B', file: path.join(w.logs, 'b.jsonl'), kind: 'log', required: true },
      { label: 'C', file: path.join(w.logs, 'c.jsonl'), kind: 'log', required: false }],
    cLedger: path.join(w.logs, 'c.jsonl'),
    expected: { base: HEAD, identities: { hashIdentity: 'H', replayIdentity: 'R', sources: 'S' },
      tableSha256: 'TABLE', node: 'v26.13.0', machine: MACHINE },
    helpers: { manifestFile: path.join(scratch, 'manifest.txt'), manifestSha256: null,
      required: ['generator/tests/artifacts/difficulty-v3/MS18d/phase-c/controller.js'], repoRoot: REPO },
    bindingFixture: path.join(w.root, 'fixture.json'), powershell: 'pwsh', ownedProcesses: OWNED,
    readiness: readinessConfig(w.f, rdOver)
  }, over || {});
  w.requested = requested;
  fs.mkdirSync(w.runDir, { recursive: true });
  fs.writeFileSync(path.join(w.runDir, 'request.json'), JSON.stringify(o, null, 2));
  return o;
}

async function drive(w, over, rdOver) {
  request(w, over, rdOver);
  fs.writeFileSync(path.join(w.tmp, 'dv3-sudoku.lock'), process.pid + '|stand-in ' + w.name + '|' +
    new Date(w.requested + 5).toISOString());
  const proc = spawn(process.execPath, [CONTROLLER, '--request=' + path.join(w.runDir, 'request.json')], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: Object.assign({}, process.env, { TEMP: w.tmp, TMP: w.tmp, FAKE_GP_TARGET_MS: '31' }) });
  let out = '';
  proc.stdout.on('data', (d) => { out += d; });
  proc.stderr.on('data', (d) => { out += d; });
  const end = await new Promise((resolve) => proc.on('close', (code, signal) => resolve({ code, signal })));
  const file = (n) => path.join(w.runDir, n);
  const read = (n) => JSON.parse(fs.readFileSync(file(n), 'utf8'));
  return { code: end.code, out, file, read, exists: (n) => fs.existsSync(file(n)),
    result: fs.existsSync(file('result.json')) ? read('result.json') : null,
    admission: fs.existsSync(file('admission.json')) ? read('admission.json') : null };
}

const consumerOf = (rate) => ({ snapshotOptions: { rates: { [bystanderKey]: rate } } });

// the identities the stand-in requests expect, with the campaign base `base` (HEAD itself by default)
const expectedAt = (base) => ({ base, identities: { hashIdentity: 'H', replayIdentity: 'R', sources: 'S' },
  tableSha256: 'TABLE', node: 'v26.13.0', machine: MACHINE });

function controllerTests() {
  const seqTests = [];
  const add = (name, fn) => seqTests.push([name, fn]);
  const noPayload = (r) => {
    assert.strictEqual(r.code, 64, r.out);
    assert.strictEqual(r.result.outcome, 'control-hold');
    assert.strictEqual(r.result.payloadStarted, false);
    assert.ok(!r.exists('transcript.txt') && !r.exists('stdout.txt'), 'no payload ran');
    assert.ok(!fs.readFileSync(r.file('pids.jsonl'), 'utf8').includes('"role":"tee"'), 'no tee');
  };

  add('controller: an admitted readiness: every record is written, the payload runs', async () => {
    const w = world('adm');
    const r = await drive(w, { FAKE: 1 });
    assert.strictEqual(r.code, 0, r.out);
    assert.strictEqual(r.result.outcome, 'success');
    const s = r.admission.readiness;
    assert.deepStrictEqual([s.required, s.ran, s.complete, s.ready, s.admitted, s.eligibleReAsk],
      [true, true, true, true, true, false]);
    assert.strictEqual(r.admission.decision, 'proceed');
    assert.strictEqual(r.admission.lateStart, false);
    assert.ok(r.admission.callToSpawnMs >= 0 && r.admission.callToSpawnMs < 60000);
    ['readiness.json', 'readiness-before.json', 'readiness-after.json'].forEach((n) => {
      assert.ok(r.exists(n), n);
    });
    const rec = r.read('readiness.json');
    const sha = (n) => require('./common.js').sha256(fs.readFileSync(r.file(n)));
    assert.strictEqual(s.sha256, sha('readiness.json'));
    assert.strictEqual(rec.snapshots.before.sha256, sha('readiness-before.json'));
    assert.strictEqual(rec.snapshots.after.sha256, sha('readiness-after.json'));
    assert.deepStrictEqual(jsonOf(core.decideReadiness({ policy: rec.decision.policy,
      expected: rec.inputs.expected, bindingSource: rec.inputs.bindingSource,
      logicalCpus: rec.inputs.logicalCpus, readings: rec.inputs.readings,
      before: r.read('readiness-before.json'), after: r.read('readiness-after.json'),
      owned: rec.inputs.owned, budget: rec.inputs.budget })), jsonOf(rec.decision));
  });

  add('controller: a busy host with no additional consumer is admitted under A (ready is false)',
    async () => {
    const w = world('busy', { busy: [3, 3, 3, 3, 3] });
    const r = await drive(w);
    assert.strictEqual(r.code, 0, r.out);
    assert.strictEqual(r.admission.readiness.ready, false);
    assert.strictEqual(r.admission.readiness.admitted, true);
  });

  add('controller: an additional consumer is a hold with NO payload and an eligible re-ask', async () => {
    const w = world('consumer', consumerOf(0.8));
    const r = await drive(w);
    noPayload(r);
    assert.strictEqual(r.result.heldAt, 'readiness');
    assert.strictEqual(r.result.eligibleReAsk, true);
    assert.strictEqual(r.admission.decision, 'hold');
    assert.strictEqual(r.admission.readiness.eligibleReAsk, true);
    assert.ok(r.result.reasons.some((x) => /additional-consumer: process 310/.test(x)),
      r.result.reasons.join());
  });

  add('controller: the 0.5 CPU-s/s boundary: exactly 0.5 holds, 0.4999 proceeds', async () => {
    const at = await drive(world('edge-at', consumerOf(0.5)));
    noPayload(at);
    assert.strictEqual(at.result.eligibleReAsk, true);
    const below = await drive(world('edge-below', consumerOf(0.4999)));
    assert.strictEqual(below.code, 0, below.out);
  });

  add('controller: a replaced host holds with no payload, no eligibility and no rebinding', async () => {
    const other = Object.assign({}, rd.HOST, { cimCreationUtc: '2026-05-05T00:00:00.000001Z' });
    const w = world('replaced', { snapshotOptions: { hostFacts: rd.hostFacts(other) } });
    const journalBefore = JSON.stringify(w.f.world.committed);
    const r = await drive(w);
    noPayload(r);
    assert.strictEqual(r.result.eligibleReAsk, false);
    assert.strictEqual(r.result.heldAt, 'readiness');
    assert.ok(r.result.reasons.some((x) => /host: .*cimCreationUtc differs/.test(x)),
      r.result.reasons.join());
    assert.strictEqual(JSON.stringify(w.f.world.committed), journalBefore);
  });

  add('controller: a ProcessName-only rename is admitted and records the journal binding', async () => {
    const w = world('renamed', { snapshotOptions: { hostFacts: rd.hostFacts(rd.HOST, {
      name: 'copilot.exe.old-25148-1', displayName: 'copilot.exe.old-25148-1' }) } });
    const r = await drive(w);
    assert.strictEqual(r.code, 0, r.out);
    const b = r.admission.readiness.binding;
    assert.deepStrictEqual([b.bindingId, b.journal.entryCount, b.evidence.verified], ['host-1', 1, true]);
    assert.deepStrictEqual(b.host, rd.bindingEntry({}).entry.host);
    const j = r.read('journals.json');
    assert.strictEqual(j.hostBinding.ok, true);
    assert.strictEqual(j.rulings.ok, true);
    assert.deepStrictEqual(j.hostBinding.reference, b, 'journals.json and admission.json agree');
  });

  add('controller: a restart or a reused PID (same PID, another creation time) holds, never eligible',
    async () => {
    const w = world('restarted', { snapshotOptions: { hostFacts: rd.hostFacts(rd.HOST, {
      netStartUtc: '2026-01-05T00:00:00.5000000Z', cimCreationUtc: '2026-01-05T00:00:00.500000Z' }) } });
    const r = await drive(w);
    noPayload(r);
    assert.strictEqual(r.result.eligibleReAsk, false);
    assert.ok(r.result.reasons.some((x) => /host: .*(netStartUtc|cimCreationUtc) differs/.test(x)));
  });

  add('controller: an approved rebinding is the binding in force; its journal prefix is recorded',
    async () => {
    const jw = rd.journalWorld({ bindings: [{}, { host: REBOUND }], baseBindings: 1 });
    const w = world('rebound', { world: jw, snapshotOptions: { binding: jw.hostBinding().expected } });
    const r = await drive(w, { expected: expectedAt(rd.BASE) });
    assert.strictEqual(r.code, 0, r.out);
    const b = r.admission.readiness.binding;
    assert.deepStrictEqual([b.bindingId, b.journal.entryCount, b.journal.baseCommit], ['host-2', 2, rd.BASE]);
    assert.notStrictEqual(b.journal.sha256, b.journal.baseSha256, 'one entry was appended since B');
  });

  add('controller: the former host after a rebinding, and a journal that rewrote B, both hold', async () => {
    const jw = rd.journalWorld({ bindings: [{}, { host: REBOUND }], baseBindings: 1 });
    noPayload(await drive(world('former', { world: jw }), { expected: expectedAt(rd.BASE) }));
    const rewritten = rd.journalWorld({ bindings: [{}, { host: REBOUND }], baseBindings: 1 });
    rewritten.committedBase[journalsMod.BINDINGS_REL] = rewritten.committedBase[journalsMod.BINDINGS_REL]
      .replace('host-1', 'host-X');
    const w2 = world('rewritten', { world: rewritten });
    const r2 = await drive(w2, { expected: expectedAt(rd.BASE) });
    noPayload(r2);
    assert.ok(r2.result.reasons.some((x) => /does not keep the version committed at the base/.test(x)),
      r2.result.reasons.join());
    assert.ok(r2.exists('journals.json'));
    assert.strictEqual(r2.read('journals.json').hostBinding.ok, false);
  });

  add('controller: an empty, invalid or unevidenced host-binding journal holds: no host binding, no payload',
    async () => {
    let n = 0;
    for (const opts of [{ bindings: [], baseBindings: 0 }, { rawBindings: '{broken\n' },
      { bindings: [{}], noEvidence: true }]) {
      const w = world('nobinding' + (++n), { world: rd.journalWorld(opts) });
      const r = await drive(w);
      noPayload(r);
      assert.strictEqual(r.result.eligibleReAsk, false);
      assert.strictEqual(r.result.heldAt, 'readiness');
      assert.ok(r.result.reasons.some((x) => /^host:/.test(x)), r.result.reasons.join());
      assert.strictEqual(r.admission.readiness.ran, true);
    }
  });

  add('controller: a consumer together with a replaced host is mixed: not eligible', async () => {
    const other = Object.assign({}, rd.HOST, { pid: 4999 });
    const w = world('mixed', { snapshotOptions: { rates: { [bystanderKey]: 0.9 },
      hostFacts: rd.hostFacts(other) } });
    const r = await drive(w);
    noPayload(r);
    assert.strictEqual(r.result.eligibleReAsk, false);
  });

  add('controller: a failed or timed-out query is a hold, never idle, never eligible', async () => {
    const lost = await drive(world('q-fail', { fixture: { queries: [{ ok: false, error: 'cim failed' },
      {}] } }));
    noPayload(lost);
    assert.strictEqual(lost.result.eligibleReAsk, false);
    const slow = await drive(world('q-time', Object.assign(consumerOf(0.9),
      { fixture: { queries: [{}, { ok: false, timedOut: true, durationMs: 15000 }] } })));
    noPayload(slow);
    assert.strictEqual(slow.result.eligibleReAsk, false);
    assert.ok(slow.result.reasons.some((x) => /^timeout:/.test(x)));
  });

  add('controller: more than 45 s of readiness is a hold', async () => {
    const r = await drive(world('over45', { fixture: { elapsedMs: 45001 } }));
    noPayload(r);
    assert.strictEqual(r.result.eligibleReAsk, false);
  });

  add('controller: more than 60 s since the call holds rather than starting late (limit shortened)',
    async () => {
    const w = world('late', { fixture: { sleepMs: 900 } });
    const r = await drive(w, { callToSpawnLimitMs: 500 });
    noPayload(r);
    assert.strictEqual(r.result.heldAt, 'late-start');
    assert.strictEqual(r.admission.lateStart, true);
    assert.ok(r.admission.callToSpawnMs > 500);
    assert.strictEqual(r.result.eligibleReAsk, false);
    const consumerLate = world('late-consumer', Object.assign(consumerOf(0.9),
      { fixture: { sleepMs: 900 } }));
    const both = await drive(consumerLate, { callToSpawnLimitMs: 500 });
    noPayload(both);
    assert.strictEqual(both.result.eligibleReAsk, false, 'a consumer that is also late is not eligible');
  });

  add('controller: a real recorder run without a configured readiness is held, not started', async () => {
    const w = world('unconfigured');
    const r = await drive(w, { requireReadiness: true, readiness: undefined });
    noPayload(r);
    assert.strictEqual(r.result.heldAt, 'readiness');
    assert.strictEqual(r.result.eligibleReAsk, false);
    assert.strictEqual(r.admission.readiness.ran, false);
    assert.ok(r.result.reasons.some((x) => /readiness is not configured/.test(x)));
    assert.ok(!r.exists('readiness.json'));
  });

  add('controller: an earlier hold (source binding) means no sampling at all', async () => {
    const w = world('nobind');
    const r = await drive(w, { expected: { base: HEAD, identities: { hashIdentity: 'X', replayIdentity: 'R',
      sources: 'S' }, tableSha256: 'TABLE', node: 'v26.13.0', machine: MACHINE } });
    noPayload(r);
    assert.strictEqual(r.admission.readiness.ran, false);
    assert.ok(!r.exists('readiness.json') && !r.exists('readiness-before.json'), 'nothing was sampled');
    assert.strictEqual(r.result.eligibleReAsk, false);
  });

  add('controller: policy B (strict-quiet) is not built: a hold', async () => {
    const w = world('policyb');
    const r = await drive(w, {}, { policy: { selector: 'S-OD15', choice: 'B',
      name: 'MS18d-GP-strict-quiet' } });
    noPayload(r);
    assert.strictEqual(r.result.eligibleReAsk, false);
    assert.ok(r.result.reasons.some((x) => /^policy:/.test(x)));
  });

  return seqTests;
}

async function main() {
  try {
    await pureBindingTests();
    await pureCounterTests();
    await pureConsumerTests();
    await pureDecisionTests();
    await runtimeTests();
    await validatorTests();
    for (const [name, fn] of controllerTests()) await test(name, fn); // eslint-disable-line no-await-in-loop
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  console.log(passed + ' passed, ' + failed.length + ' failed');
  if (failed.length > 0) {
    console.log('FAILED: ' + failed.join('; '));
    process.exitCode = 1;
  }
}

main();
