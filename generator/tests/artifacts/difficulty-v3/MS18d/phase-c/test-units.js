'use strict';

/*
 * MS18d Phase C0 task-owned tests of the pure and file-level parts of the Phase C transport, on synthetic
 * inputs and short-lived stand-ins only: time parsing, the release history (G2), the acquisition rule with
 * its exact 2.000 s and 15 s boundaries (G1), the complete-result classifier (G3), the source binding with
 * its clean-input allowlist and helper manifest (G4), and the Phase C tee against the frozen Phase B tee.
 * One group runs against the real tree read-only (identities, target table, machine of the Phase A/B
 * records). Run it through the lock wrapper:
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-c/test-units.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { parseIsoMs, sha256 } = require('./common.js');
const { collectReleases } = require('./release-history.js');
const { decideAcquisition } = require('./acquisition.js');
const { chunkAttempts } = require('./attempts.js');
const { classifyGpRun, classifyGenericRun, parseStock } = require('./classify.js');
const { stockOutput } = require('./stock-fixtures.js');
const sb = require('./source-binding.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const scratch = fs.mkdtempSync(path.join(REPO, '.scratch-ms18d-c-units-'));
const at = (name) => path.join(scratch, name);

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

const jsonl = (file, rows) => fs.writeFileSync(file,
  rows.map((r) => (typeof r === 'string' ? r : JSON.stringify(r))).join('\r\n') + '\r\n');
const T = Date.parse('2026-11-19T10:00:00.000Z');
const iso = (ms) => new Date(ms).toISOString();

// ---------------------------------------------------------------------------------------------------------
// time parsing and the release history (G2)
// ---------------------------------------------------------------------------------------------------------

async function timeAndHistory() {
  await test('time parsing is strict: an explicit zone, a real instant, ms kept, nothing guessed', () => {
    assert.strictEqual(parseIsoMs('2026-11-19T11:44:03.013+07:00'), Date.parse('2026-11-19T04:44:03.013Z'));
    assert.strictEqual(parseIsoMs('2026-11-19T04:44:03Z'), Date.parse('2026-11-19T04:44:03Z'));
    assert.strictEqual(parseIsoMs('2026-11-19T06:38:48.2945527Z'), Date.parse('2026-11-19T06:38:48.294Z'));
    ['2026-11-19T11:44:03', '2026-02-30T00:00:00Z', '2026-11-19T24:00:00Z', '2026-11-19 11:44:03Z', '', null,
      undefined, 5, '2026-11-19T11:44:03+25:00', 'yesterday'].forEach((bad) => {
      assert.strictEqual(parseIsoMs(bad), null, String(bad));
    });
  });

  await test('the release history reads every log, takes the latest, and a new log is not a reset', () => {
    jsonl(at('a.jsonl'), [{ finished: iso(T - 600000) }, { finished: iso(T - 500000) }]);
    jsonl(at('b.jsonl'), [{ finished: iso(T - 300000) },
      { finished: iso(T - 400000), task: 'out of order' }]);
    const sources = [{ label: 'A', file: at('a.jsonl'), kind: 'log', required: true },
      { label: 'B', file: at('b.jsonl'), kind: 'log', required: true },
      { label: 'C', file: at('c.jsonl'), kind: 'log', required: false }];
    let h = collectReleases(sources);
    assert.deepStrictEqual(h.problems, []);
    assert.strictEqual(h.latest.atMs, T - 300000);
    assert.strictEqual(h.latest.label, 'B');
    jsonl(at('c.jsonl'), [{ finished: iso(T - 100000), releaseObservedAt: iso(T - 99000) },
      { finished: iso(T - 200000), releaseObservedAt: iso(T - 250000) }]);
    h = collectReleases(sources);
    assert.strictEqual(h.latest.atMs, T - 99000, 'the verified observation is the later of the two');
    assert.strictEqual(h.latestOwn.label, 'C');
    assert.strictEqual(h.latestForeign, null);
    const withoutC = collectReleases(sources.slice(0, 2));
    assert.strictEqual(withoutC.latest.atMs, T - 300000, 'dropping a log cannot hide the others');
  });

  await test('the release history: coordinator evidence is foreign; unproved input is a problem', () => {
    jsonl(at('a2.jsonl'), [{ finished: iso(T - 600000) }]);
    jsonl(at('co.jsonl'), [{ at: iso(T - 5000), source: 'orchestrator saw it', note: 'x' }]);
    const base = [{ label: 'A', file: at('a2.jsonl'), kind: 'log', required: true },
      { label: 'coord', file: at('co.jsonl'), kind: 'coordinator', required: true }];
    const h = collectReleases(base);
    assert.deepStrictEqual(h.problems, []);
    assert.strictEqual(h.latest.origin, 'coordinator');
    assert.strictEqual(h.latestForeign.atMs, T - 5000);
    assert.strictEqual(h.latestOwn.atMs, T - 600000);
    const missing = collectReleases([{ label: 'B', file: at('no-such.jsonl'), kind: 'log', required: true }]);
    assert.ok(missing.problems.some((p) => /missing/.test(p)));
    jsonl(at('bad.jsonl'), [{ finished: iso(T) }, 'not json', { task: 'no time' }, { finished: 'soon' }]);
    const bad = collectReleases([{ label: 'X', file: at('bad.jsonl'), kind: 'log', required: true }]);
    assert.strictEqual(bad.problems.length, 3, bad.problems.join(' | '));
    jsonl(at('co2.jsonl'), [{ at: iso(T), source: '' }, { at: 'never', source: 's' }]);
    const co = collectReleases([{ label: 'K', file: at('co2.jsonl'), kind: 'coordinator', required: true }]);
    assert.strictEqual(co.problems.length, 2);
    assert.strictEqual(co.latest, null);
    jsonl(at('obs.jsonl'), [{ finished: iso(T), releaseObservedAt: 'later' }]);
    const obs = collectReleases([{ label: 'C', file: at('obs.jsonl'), kind: 'log', required: false }]);
    assert.ok(obs.problems.some((p) => /releaseObservedAt/.test(p)));
  });
}

// ---------------------------------------------------------------------------------------------------------
// the acquisition rule (G1)
// ---------------------------------------------------------------------------------------------------------

function history(releases, problems) {
  return { releases, problems: problems || [], latest: null };
}
const own = (atMs) => ({ atMs, label: 'B', origin: 'own' });
const foreign = (atMs) => ({ atMs, label: 'coord', origin: 'coordinator', source: 'seen' });

function goodWatch(requestedAtMs, over) {
  return Object.assign({ schema: 'ms18d-c-watch-1', firstCheckMs: requestedAtMs - 200 - 15300,
    lastCheckMs: requestedAtMs - 200, checks: 62, windowChecks: 62, maxIntervalMs: 260, windowSightings: 0,
    restartCount: 0, restarts: [], gaveUp: false }, over || {});
}

function acquire(over) {
  const start = T;
  const request = over.delay === undefined ? start - 500 : start - over.delay;
  return decideAcquisition(Object.assign({
    requestedAtMs: request, startedAtMs: start, lockAcquiredAtMs: Math.max(request, start - 100),
    slotBefore: { shared: false, timing: false }, history: history([own(start - 60000)]),
    watch: goodWatch(request, over.watch)
  }, over.input || {}));
}

async function acquisitionRule() {
  await test('C0-1: the lock watch proves the last release for locks of others: exact boundaries', () => {
    const request = T - 500;
    const at = (over) => decideAcquisition({ requestedAtMs: request, startedAtMs: T,
      lockAcquiredAtMs: T - 100, slotBefore: { shared: false, timing: false },
      history: history([own(T - 60000)]), watch: goodWatch(request, over) });
    assert.strictEqual(at({}).decision, 'proceed');
    assert.strictEqual(at({ firstCheckMs: request - 200 - 15300 }).watch.ok, true,
      'a window of exactly 15.300 s');
    const short = at({ firstCheckMs: request - 200 - 15299 });
    assert.deepStrictEqual(short.reasons, ['foreign-lock-watch-under-15.3s'], '15.299 s is too short');
    assert.strictEqual(at({ maxIntervalMs: 1000 }).decision, 'proceed',
      'checks 1.000 s apart are at least once a second');
    assert.deepStrictEqual(at({ maxIntervalMs: 1001 }).reasons, ['foreign-lock-watch-interval-over-1s']);
    assert.strictEqual(at({ lastCheckMs: request - 1000, firstCheckMs: request - 1000 - 15300 }).decision,
      'proceed', 'the last check one second before the call');
    assert.deepStrictEqual(at({ lastCheckMs: request - 1001, firstCheckMs: request - 1001 - 15300 }).reasons,
      ['foreign-lock-watch-not-right-before-the-call']);
    assert.deepStrictEqual(at({ lastCheckMs: request + 1, firstCheckMs: request + 1 - 15300 }).reasons,
      ['foreign-lock-watch-not-right-before-the-call'], 'a check after the request proves nothing about it');
    assert.deepStrictEqual(at({ windowSightings: 1 }).reasons, ['foreign-lock-seen-in-the-window']);
    assert.ok(at({ gaveUp: true }).reasons.indexOf('foreign-lock-watch-gave-up') !== -1,
      'a bounded wait that gave up holds');
    assert.deepStrictEqual(at({ firstCheckMs: null }).reasons, ['foreign-lock-watch-record-unusable']);
    assert.deepStrictEqual(at({ schema: 'other' }).reasons, ['foreign-lock-watch-missing']);
    assert.strictEqual(at({}).watch.firstCheckMs, request - 200 - 15300, 'the first check is recorded');
    assert.strictEqual(at({}).watch.lastCheckMs, request - 200);
  });

  await test('C0-1: no watch record at all is a hold; the logs alone never prove a free slot', () => {
    const r = acquire({ input: { watch: undefined } });
    assert.deepStrictEqual(r.reasons, ['foreign-lock-watch-missing']);
    assert.strictEqual(r.watch, null);
    assert.ok(acquire({ input: { watch: null } }).reasons.indexOf('foreign-lock-watch-missing') !== -1);
  });

  await test('G1: a free slot, a start within 2 s and a release 15 s or more before proceed', () => {
    const r = acquire({});
    assert.strictEqual(r.decision, 'proceed', r.reasons.join());
    assert.strictEqual(r.busyAtRequest, false);
    assert.strictEqual(r.late, false);
    assert.strictEqual(r.thresholds.lateStartMs, 2000);
    assert.strictEqual(r.thresholds.releaseGapMs, 15000);
  });

  await test('G1: the late-start boundary is exact: 2.000 s is on time, 2.001 s is late and held', () => {
    const on = acquire({ delay: 2000, input: { history: history([own(T - 60000)]) } });
    assert.strictEqual(on.late, false);
    assert.strictEqual(on.decision, 'proceed', on.reasons.join());
    const late = acquire({ delay: 2001 });
    assert.strictEqual(late.late, true);
    assert.strictEqual(late.decision, 'hold');
    assert.ok(late.reasons.indexOf('late-start-and-foreign-release-unproved') !== -1);
  });

  await test('G1: the release boundary is exact: 15.000 s before the start proceeds, 14.999 s holds', () => {
    const ok = acquire({ input: { history: history([own(T - 15000)]) } });
    assert.strictEqual(ok.decision, 'proceed', ok.reasons.join());
    assert.strictEqual(ok.releaseGapMs, 15000);
    const short = acquire({ input: { history: history([own(T - 14999)]) } });
    assert.strictEqual(short.decision, 'hold');
    assert.deepStrictEqual(short.reasons, ['release-gap-under-15s']);
  });

  await test('G1: another job\'s recent release holds despite an old own log (coordinator evidence)', () => {
    const r = acquire({ input: { history: history([own(T - 600000), foreign(T - 5000)]) } });
    assert.strictEqual(r.decision, 'hold');
    assert.ok(r.reasons.indexOf('release-gap-under-15s') !== -1);
    assert.strictEqual(r.latestRelease.origin, 'coordinator');
  });

  await test('G1: a busy slot is held; only a foreign release after the request, 15 s old, excuses', () => {
    const busy = { shared: true, timing: false };
    const noProof = acquire({ delay: 20000,
      input: { slotBefore: busy, history: history([own(T - 60000)]) } });
    assert.strictEqual(noProof.decision, 'hold');
    assert.ok(noProof.reasons.indexOf('slot-busy-and-foreign-release-unproved') !== -1,
      'an old own release excuses nothing');
    const before = acquire({ delay: 20000, input: { slotBefore: busy,
      history: history([own(T - 60000), foreign(T - 20000 - 1000)]) } });
    assert.strictEqual(before.decision, 'hold', 'a foreign release before the request proves nothing');
    const proved = acquire({ delay: 20000, input: { slotBefore: busy,
      history: history([own(T - 60000), foreign(T - 16000)]) } });
    assert.strictEqual(proved.decision, 'proceed', proved.reasons.join());
    assert.strictEqual(proved.foreignReleaseProof.length, 1);
    const tooFresh = acquire({ delay: 20000, input: { slotBefore: busy,
      history: history([foreign(T - 14000)]) } });
    assert.strictEqual(tooFresh.decision, 'hold');
    const timing = acquire({ delay: 20000, input: { slotBefore: { shared: false, timing: true },
      history: history([own(T - 60000)]) } });
    assert.ok(timing.reasons.indexOf('slot-busy-and-foreign-release-unproved') !== -1,
      'the timing lock counts as busy');
  });

  await test('G1: unknown, negative, future and unproved facts hold; nothing is fabricated', () => {
    const reasons = (over) => acquire(over).reasons;
    const has = (over, reason) => assert.ok(reasons(over).indexOf(reason) !== -1, reason);
    has({ input: { requestedAtMs: null } }, 'unknown-times');
    has({ input: { startedAtMs: NaN } }, 'unknown-times');
    has({ input: { requestedAtMs: T + 5, lockAcquiredAtMs: T + 5 } }, 'negative-start-delay');
    has({ input: { slotBefore: null } }, 'slot-state-unknown');
    has({ input: { slotBefore: { shared: null, timing: false } } }, 'slot-state-unknown');
    has({ input: { lockAcquiredAtMs: null } }, 'lock-acquisition-instant-unknown');
    has({ input: { lockAcquiredAtMs: T + 1 } }, 'lock-instant-outside-request-and-start');
    has({ input: { lockAcquiredAtMs: T - 10000 } }, 'lock-instant-outside-request-and-start');
    has({ input: { history: history([own(T - 60000)], ['A:1: no usable finished time']) } },
      'release-history-unproved');
    has({ input: { history: history([]) } }, 'no-release-history');
    has({ input: { history: history([own(T + 1000), own(T - 60000)]) } }, 'release-in-the-future');
    has({ input: { history: null } }, 'release-history-unproved');
    const r = acquire({ input: { requestedAtMs: null } });
    assert.strictEqual(r.requestedAtMs, null, 'an unknown instant stays null in the record');
  });
}

// ---------------------------------------------------------------------------------------------------------
// the result classifier (G3)
// ---------------------------------------------------------------------------------------------------------

const CELL = { variant: 'classic9', level: 'easy', targetMs: 2342, runs: 50, seed: 7000, node: 'v26.13.0',
  cpu: 'AMD EPYC 7763 64-Core Processor' };
const OK_NUMBERS = { variant: 'classic9', level: 'easy', targetMs: 2342, p50: 700.4, p95: 1900.2, max: 2100,
  mean: 800 };
const MISS_NUMBERS = Object.assign({}, OK_NUMBERS, { p95: 2500.7, max: 3100 });
const ARGV = '$ node tests\\perf.js --variant=classic9 --level=easy --runs=50 --warmup=0 --seed=7000 ' +
  '--gate --ascii';

function gp(over) {
  const o = over || {};
  const exit = o.exit === undefined ? 0 : o.exit;
  return classifyGpRun(Object.assign({
    expected: CELL, stdout: stockOutput(OK_NUMBERS), stderr: '', stderrBytes: 0, cli: { exit, signal: null },
    tee: { marker: 'exit=' + exit + ' seconds=12.345', exit }, argvLine: ARGV, barrier: { verdict: 'clean' },
    binding: { ok: true }, acquisition: { decision: 'proceed' }
  }, o.input || {}));
}

async function classifier() {
  await test('G3: ok + 1 of 1 + real exit 0 is a complete success, controller exit 0', () => {
    const r = gp({});
    assert.strictEqual(r.outcome, 'success', r.problems.join());
    assert.strictEqual(r.complete, true);
    assert.strictEqual(r.controllerExit, 0);
    assert.strictEqual(r.row.mark, 'ok');
    assert.deepStrictEqual(r.summary, { met: 1, cells: 1, percent: '100' });
    assert.strictEqual(r.cli.exit, 0);
    assert.strictEqual(r.tee.exit, 0);
  });

  await test('G3: MISS + 0 of 1 + its Misses: entry + real exit 1: a complete miss, exit 1 kept', () => {
    const r = gp({ exit: 1, input: { stdout: stockOutput(MISS_NUMBERS) } });
    assert.strictEqual(r.outcome, 'miss', r.problems.join());
    assert.strictEqual(r.complete, true);
    assert.strictEqual(r.controllerExit, 1, 'a completed MISS is propagated as 1, never turned into 0');
    assert.strictEqual(r.row.mark, 'MISS');
    assert.strictEqual(r.miss.key, 'classic9/easy');
    assert.strictEqual(r.cli.exit, 1);
  });

  await test('G3: the mark is authoritative: a rounded p95 equal to the target decides nothing', () => {
    const okOut = stockOutput(Object.assign({}, OK_NUMBERS, { p95: 2341.9, mark: 'ok' }));
    const ok = gp({ input: { stdout: okOut } });
    assert.strictEqual(ok.outcome, 'success');
    const missOut = stockOutput(Object.assign({}, MISS_NUMBERS, { p95: 2342.4, mark: 'MISS' }));
    const miss = gp({ exit: 1, input: { stdout: missOut } });
    assert.strictEqual(miss.outcome, 'miss', miss.problems.join());
  });

  await test('G3: exit 1 with a stack and no complete output is a crash, never a miss', () => {
    const stdout = stockOutput(OK_NUMBERS).split('\n').slice(0, 3).join('\n') + '\n';
    const r = gp({ exit: 1, input: { stdout, stderr: 'Error: boom\n    at x (y.js:1:1)\n' } });
    assert.strictEqual(r.outcome, 'stop');
    assert.strictEqual(r.controllerExit, 65);
    assert.ok(r.kinds.indexOf('crash') !== -1 && r.kinds.indexOf('partial-output') !== -1, r.kinds.join());
    assert.strictEqual(r.cli.exit, 1, 'the real exit code is preserved');
  });

  const okWith = (extra) => ({ stdout: stockOutput(Object.assign({}, OK_NUMBERS, extra)) });
  const missWith = (extra) => ({ stdout: stockOutput(Object.assign({}, MISS_NUMBERS, extra)) });
  const stops = [
    ['partial output (no row)', { stdout: stockOutput(OK_NUMBERS).split('\n').slice(0, 4).join('\n') + '\n' },
      0, 'partial-output'],
    ['empty stdout', { stdout: '' }, 0, 'partial-output'],
    ['a row for another cell', okWith({ variant: 'killer', level: 'easy' }), 0, 'wrong-cell'],
    ['another target', okWith({ targetMs: 2343 }), 0, 'wrong-target'],
    ['two cells', okWith({ met: 2, cells: 2 }), 0, 'wrong-count'],
    ['a MISS without its Misses: entry', missWith({ misses: false }), 1, 'missing-miss-entry'],
    ['a Misses: entry for another cell', missWith({ missKey: 'killer/easy' }), 1, 'missing-miss-entry'],
    ['an ok row with a Misses: block', okWith({ misses: true }), 0, 'extra-output'],
    ['an ok row but 0 of 1', okWith({ met: 0 }), 0, 'contradiction'],
    ['a MISS row but 1 of 1', missWith({ met: 1, misses: true }), 1, 'contradiction'],
    ['a percentage that does not fit', okWith({ percent: '50' }), 0, 'contradiction'],
    ['ok and 1 of 1 but exit 1', { stdout: stockOutput(OK_NUMBERS) }, 1, 'contradiction'],
    ['MISS and 0 of 1 but exit 0', { stdout: stockOutput(MISS_NUMBERS) }, 0, 'contradiction'],
    ['a header with 8 runs', okWith({ runs: 8 }), 0, 'wrong-header'],
    ['a header with another seed', okWith({ seed: 1 }), 0, 'wrong-header'],
    ['a header with a warm-up', okWith({ warmup: 2 }), 0, 'wrong-header'],
    ['another Node', okWith({ node: 'v24.0.0' }), 0, 'wrong-header'],
    ['another CPU', okWith({ cpu: 'Other CPU' }), 0, 'wrong-header'],
    ['a row that is not stock padded',
      { stdout: stockOutput(OK_NUMBERS).replace('classic9    easy', 'classic9   easy') }, 0, 'wrong-format'],
    ['a line after the result', { stdout: stockOutput(OK_NUMBERS) + 'done\n' }, 0, 'extra-output'],
    ['unexplained stderr', { stderr: 'ExperimentalWarning: x\n', stderrBytes: 23 }, 0, 'stderr-output'],
    ['one stray byte on stderr that normalisation would drop (a lone CR)',
      { stderr: '', stderrBytes: 1 }, 0, 'stderr-output'],
    ['stderr bytes with no retained text', { stderr: '', stderrBytes: 14 }, 0, 'stderr-output'],
    ['no raw stderr byte count', { stderrBytes: null }, 0, 'stderr-output'],
    ['a missing stderr record', { stderr: null }, 0, 'stderr-output'],
    ['not the frozen command line', { argvLine: ARGV.replace('--runs=50', '--runs=8') }, 0, 'wrong-argv'],
    ['a transcript without its end line', { tee: { marker: 'line before the hang', exit: 0 } }, 0,
      'marker-missing'],
    ['a tee that says another exit', { tee: { marker: 'exit=1 seconds=1.000', exit: 0 } }, 0,
      'tee-status-mismatch'],
    ['a tee process exit that differs', { tee: { marker: 'exit=0 seconds=1.000', exit: 1 } }, 0,
      'tee-status-mismatch'],
    ['a survivor of the barrier', { barrier: { verdict: 'stopped-owned' } }, 0, 'orphan'],
    ['an unproved barrier', { barrier: { verdict: 'hold-unknown' } }, 0, 'orphan'],
    ['no barrier record', { barrier: null }, 0, 'orphan'],
    ['an unbound source', { binding: { ok: false } }, 0, 'binding'],
    ['no admission', { acquisition: { decision: 'hold' } }, 0, 'admission']
  ];
  for (const [name, input, exit, kind] of stops) {
    await test('G3: STOP, never complete: ' + name, () => {
      const r = gp({ exit, input });
      assert.strictEqual(r.outcome, 'stop', 'got ' + r.outcome);
      assert.strictEqual(r.complete, false);
      assert.strictEqual(r.controllerExit, 65);
      assert.ok(r.kinds.indexOf(kind) !== -1, 'kinds ' + r.kinds.join() + ' lack ' + kind);
      assert.ok(r.problems.length > 0);
    });
  }

  await test('G3: a signal or a missing exit code is a stop and keeps what was seen', () => {
    const s = gp({ input: { cli: { exit: null, signal: 'SIGKILL' },
      tee: { marker: 'signal=SIGKILL seconds=1.000', exit: 1 } } });
    assert.strictEqual(s.outcome, 'stop');
    assert.ok(s.kinds.indexOf('cli-signal') !== -1);
    assert.strictEqual(s.cli.signal, 'SIGKILL');
    const n = gp({ input: { cli: { exit: null, signal: null } } });
    assert.ok(n.kinds.indexOf('cli-no-exit') !== -1);
  });

  await test('G3: every reason found is listed, not only the first', () => {
    const r = gp({ input: { stderr: 'x', stderrBytes: 1, argvLine: 'node other',
      barrier: { verdict: 'hold-unknown' } } });
    ['stderr-output', 'wrong-argv', 'orphan'].forEach((k) => assert.ok(r.kinds.indexOf(k) !== -1, k));
  });

  await test('G3: a Windows-style CRLF stdout (the retained file) is read like the console one', () => {
    const r = gp({ input: { stdout: stockOutput(OK_NUMBERS).replace(/\n/g, '\r\n') } });
    assert.strictEqual(r.outcome, 'success', r.problems.join());
  });

  await test('G3: the targets are printed as the stock CLI prints them (ms below 1 s, seconds above)', () => {
    [[31, '31 ms'], [999, '999 ms'], [1000, '1 s'], [2342, '2.342 s'], [30000, '30 s'], [18842, '18.842 s']]
      .forEach(([ms, text]) => {
        const out = stockOutput(Object.assign({}, OK_NUMBERS, { targetMs: ms, p95: ms / 2 }));
        const parsed = parseStock(out, Object.assign({}, CELL, { targetMs: ms }));
        assert.deepStrictEqual(parsed.problems, [], text);
        assert.strictEqual(parsed.row.target, text);
      });
  });

  await test('G3: the generic profile accepts exit 0 only: no universal "allow exit 1"', () => {
    const base = { cli: { exit: 0, signal: null }, tee: { marker: 'exit=0 seconds=1.000', exit: 0 },
      stderrBytes: 0, barrier: { verdict: 'clean' }, binding: { ok: true },
      acquisition: { decision: 'proceed' } };
    const outcome = (over) => classifyGenericRun(Object.assign({}, base, over)).outcome;
    assert.strictEqual(classifyGenericRun(base).outcome, 'success');
    assert.strictEqual(outcome({ stderrBytes: 1 }), 'stop');
    assert.strictEqual(outcome({ stderrBytes: undefined }), 'stop');
    const one = classifyGenericRun(Object.assign({}, base, { cli: { exit: 1, signal: null },
      tee: { marker: 'exit=1 seconds=1.000', exit: 1 } }));
    assert.strictEqual(one.outcome, 'stop');
    assert.strictEqual(one.controllerExit, 65);
    assert.ok(one.kinds.indexOf('cli-nonzero') !== -1);
    assert.strictEqual(outcome({ barrier: { verdict: 'hold-survivor' } }), 'stop');
  });
}

// ---------------------------------------------------------------------------------------------------------
// the source binding (G4)
// ---------------------------------------------------------------------------------------------------------

const RUN = 'docs/difficulty-v3/evidence/MS18d/gp/classic4-veryEasy/r1';
const LEDGER = 'docs/difficulty-v3/evidence/MS18d/phase-c/lock-log.jsonl';

async function binding() {
  await test('G4: git status -z is parsed, renames carry both paths, spaces survive', () => {
    const e = sb.parsePorcelainZ(' M a b.js\0?? c.txt\0R  new.js\0old.js\0');
    assert.deepStrictEqual(e.map((x) => [x.xy, x.path, x.from]), [[' M', 'a b.js', null],
      ['??', 'c.txt', null], ['R ', 'new.js', 'old.js']]);
    assert.deepStrictEqual(sb.parsePorcelainZ(''), []);
  });

  await test('G4: raw status and the reviewed clean-input check are separate; only appends pass', () => {
    const allow = { declaredRuns: [RUN], ledgerIsPrefix: (f) => f === LEDGER };
    const entries = sb.parsePorcelainZ('?? ' + RUN + '/request.json\0?? ' + RUN + '/result.json\0 M ' +
      LEDGER + '\0');
    const s = sb.evaluateStatus(entries, allow);
    assert.strictEqual(s.rawClean, false, 'run outputs make the raw status dirty');
    assert.strictEqual(s.reviewedClean, true, JSON.stringify(s.violations));
    assert.strictEqual(s.allowed.length, 3);
    assert.strictEqual(sb.evaluateStatus([], allow).rawClean, true);
  });

  await test('C0-4: the release ledger is allowed only as ` M` of a committed exact prefix', () => {
    const entry = (line) => sb.parsePorcelainZ(line + '\0');
    const yes = { declaredRuns: [], ledgerIsPrefix: () => true };
    const no = { declaredRuns: [], ledgerIsPrefix: () => false };
    const reviewed = (line, allow) => sb.evaluateStatus(entry(line), allow).reviewedClean;
    assert.strictEqual(reviewed(' M ' + LEDGER, yes), true);
    assert.strictEqual(reviewed(' M ' + LEDGER, no), false, 'a rewritten ledger');
    assert.strictEqual(reviewed(' M ' + LEDGER, { declaredRuns: [] }), false, 'no way to tell');
    assert.strictEqual(reviewed('?? ' + LEDGER, yes), false,
      'an untracked ledger was not committed before the first timed command');
    assert.strictEqual(reviewed('M  ' + LEDGER, yes), false, 'nothing staged');
    assert.strictEqual(reviewed('MM ' + LEDGER, yes), false);
    assert.strictEqual(reviewed('R  ' + LEDGER + '\0old.jsonl', yes), false, 'nothing renamed');
    assert.strictEqual(reviewed(' D ' + LEDGER, yes), false);
  });

  const EVIDENCE_DIR = 'docs/difficulty-v3/evidence/MS18d/';
  const violations = [
    ['a modified executable helper',
      ' M generator/tests/artifacts/difficulty-v3/MS18d/phase-c/controller.js'],
    ['a modified tracked input', ' M generator/tests/fixtures/perf-helper.js'],
    ['a modified accepted record', ' M ' + EVIDENCE_DIR + 'phase-b/handoff.md'],
    ['an untracked file in the artifacts tree',
      '?? generator/tests/artifacts/difficulty-v3/MS18d/phase-c/extra.js'],
    ['an untracked file in the evidence tree', '?? ' + EVIDENCE_DIR + 'phase-c/tooling/x.json'],
    ['an output of an undeclared run', '?? ' + EVIDENCE_DIR + 'gp/classic4-veryEasy/r2/request.json'],
    ['a nested file under a declared run', '?? ' + RUN + '/sub/x.json'],
    ['a modified (tracked) file of a declared run', ' M ' + RUN + '/request.json'],
    ['a staged change', 'M  generator/design.md'],
    ['a deleted file', ' D generator/design.md'],
    ['the ledger deleted', ' D ' + LEDGER]
  ];
  for (const [name, line] of violations) {
    await test('G4: the reviewed check rejects ' + name, () => {
      const allow = { declaredRuns: [RUN], ledgerIsPrefix: () => true };
      const s = sb.evaluateStatus(sb.parsePorcelainZ(line + '\0'), allow);
      assert.strictEqual(s.reviewedClean, false);
      assert.strictEqual(s.violations.length, 1);
      assert.strictEqual(s.rawClean, false);
    });
  }

  await test('R2: only literally declared run directories count; no pattern, guess or traversal', () => {
    const base = 'docs/difficulty-v3/evidence/MS18d/gp/';
    const declared = [base + 'classic4-veryEasy/r1', base + 'mega12-easy/r9', base + 'all-79/final.m1'];
    const out = sb.declaredRunDirs([base + 'classic4-veryEasy/r1', base + 'classic4-veryEasy/r2',
      base + 'nocell-x/r1', base + 'classic4-veryEasy/..', 'generator/tests/x/y/z', base + 'killer-easy/a b',
      base + 'all-79/final.m1/', base + 'all-79/other'], base + 'mega12-easy/r9', declared);
    assert.deepStrictEqual(out, [base + 'classic4-veryEasy/r1', base + 'all-79/final.m1',
      base + 'mega12-easy/r9']);
    assert.deepStrictEqual(sb.declaredRunDirs([base + 'classic4-veryEasy/r1'], null, []), []);
  });

  await test('R3: the diff since the base may list only declared run files, the ledger, pack files', () => {
    const dirs = ['docs/difficulty-v3/evidence/MS18d/gp/classic4-veryEasy/r1',
      'docs/difficulty-v3/evidence/MS18d/gp/all-79/final.m1'];
    const check = (paths) => sb.campaignDiffViolations(paths, { declaredDirs: dirs });
    assert.deepStrictEqual(check([dirs[0] + '/ledger.json', dirs[1] + '/report.json', LEDGER,
      'tasks/difficulty-v3/check-list.md', 'tasks/difficulty-v3/sub/x.md']), []);
    const bad = [dirs[0] + '/sub/x.json', dirs[0].replace('r1', 'r2') + '/ledger.json',
      'docs/difficulty-v3/evidence/MS18d/gp/classic4-veryEasy/ledger.json',
      'generator/tests/artifacts/difficulty-v3/MS18d/phase-c/controller.js', 'generator/design.md',
      'docs/difficulty-v3/evidence/MS18d/phase-b/handoff.md', 'tasks/difficulty-v3/../../generator/x.js',
      'tasks/other/x.md', 'docs/difficulty-v3/evidence/MS18d/phase-c/gp-chunk-manifest.json'];
    assert.deepStrictEqual(check(bad), bad);
    assert.deepStrictEqual(sb.campaignDiffViolations([LEDGER + '.bak'], { declaredDirs: dirs }),
      [LEDGER + '.bak']);
  });

  await test('G4: the helper manifest is verified by hash; a changed, missing, unlisted helper holds', () => {
    fs.mkdirSync(at('repo/h'), { recursive: true });
    fs.writeFileSync(at('repo/h/a.js'), 'one');
    fs.writeFileSync(at('repo/h/b.js'), 'two');
    const line = (rel, text) => sha256(text).toUpperCase() + '  ' + rel;
    fs.writeFileSync(at('m1.txt'), [line('h\\a.js', 'one'), line('h\\b.js', 'two')].join('\r\n') + '\r\n');
    const manifestSha = sha256(fs.readFileSync(at('m1.txt')));
    let v = sb.verifyManifest(at('m1.txt'), at('repo'), manifestSha, ['h/a.js', 'h/b.js']);
    assert.deepStrictEqual(v.problems, []);
    assert.strictEqual(v.result.entries, 2);
    v = sb.verifyManifest(at('m1.txt'), at('repo'), 'f'.repeat(64), []);
    assert.ok(v.problems.some((p) => /not the reviewed one/.test(p)));
    fs.writeFileSync(at('repo/h/b.js'), 'two!');
    v = sb.verifyManifest(at('m1.txt'), at('repo'), manifestSha, []);
    assert.ok(v.problems.some((p) => /differ/.test(p)) && v.result.mismatches[0] === 'h/b.js');
    fs.writeFileSync(at('repo/h/b.js'), 'two');
    v = sb.verifyManifest(at('m1.txt'), at('repo'), manifestSha, ['h/c.js']);
    assert.ok(v.problems.some((p) => /missing or unlisted/.test(p)));
    fs.writeFileSync(at('m2.txt'), line('h\\gone.js', 'x') + '\r\nnot a line\r\n');
    v = sb.verifyManifest(at('m2.txt'), at('repo'), null, []);
    assert.ok(v.problems.length >= 2);
    assert.ok(sb.verifyManifest(at('nope.txt'), at('repo'), null, [])
      .problems[0].indexOf('cannot be read') !== -1);
  });

  const HEAD = 'a'.repeat(40);
  const MACHINE = { cpu: 'CPU', logicalProcessors: 16, memoryGb: 64, platform: 'win32 10.0.26300' };
  const GOOD_IO = () => ({
    git: (args) => {
      if (args[0] === 'rev-parse') return HEAD + '\n';
      if (args[0] === 'status') return '';
      return '';
    },
    identities: () => ({ hashIdentity: 'H', replayIdentity: 'R', sources: 'S', qualifierHash: 'Q' }),
    table: () => ({ sha256: 'TABLE', targetOf: (key) => (key === 'classic4/veryEasy' ? 31 : null),
      positions: [] }),
    machine: () => Object.assign({}, MACHINE),
    readWorking: () => '',
    node: () => 'v26.13.0'
  });
  const EXPECTED = () => ({ base: HEAD, identities: { hashIdentity: 'H', replayIdentity: 'R', sources: 'S' },
    tableSha256: 'TABLE', node: 'v26.13.0', machine: Object.assign({}, MACHINE),
    cell: { variant: 'classic4', level: 'veryEasy', targetMs: 31 } });
  fs.writeFileSync(at('mm.txt'), '');
  const HELPERS = () => ({ manifestFile: at('mm.txt'), manifestSha256: null, required: [],
    repoRoot: at('repo') });
  const bind = (over) => sb.bindSource(Object.assign({ expected: EXPECTED(), allow: { declaredRuns: [] },
    helpers: HELPERS(), io: GOOD_IO() }, over || {}));

  await test('G4: everything bound: HEAD, a clean reviewed status, identities, table, target, Node, machine',
    () => {
      const r = bind();
      assert.deepStrictEqual(r.problems, []);
      assert.strictEqual(r.ok, true);
      assert.strictEqual(r.head.ok, true);
      assert.strictEqual(r.status.rawClean, true);
      assert.strictEqual(r.status.reviewedClean, true);
      assert.strictEqual(r.cell.target, 31);
    });

  const gitReturns = (io, command, text) => {
    const g = io.git;
    io.git = (a) => (a[0] === command ? text : g(a));
  };
  const machineIs = (io, over) => { io.machine = () => Object.assign({}, MACHINE, over); };
  const notDescendant = (io) => {
    const g = io.git;
    io.git = (a) => {
      if (a[0] === 'merge-base') throw new Error('not an ancestor');
      return g(a);
    };
  };
  const mismatches = [
    ['a HEAD that is not a descendant of the base',
      (e, io) => { e.base = 'b'.repeat(40); notDescendant(io); },
      /neither the campaign base/],
    ['a base that is not a commit id', (e, io) => { e.base = 'main'; }, /campaign base is not a full commit/],
    ['a HEAD that is not a commit id', (e, io) => gitReturns(io, 'rev-parse', 'HEAD\n'), /full commit id/],
    ['a descendant that changed a helper', (e, io) => {
      e.base = 'b'.repeat(40);
      gitReturns(io, 'diff', 'generator/tests/artifacts/difficulty-v3/MS18d/phase-c/controller.js\0');
    }, /not campaign outputs or pack files/],
    ['a changed tracked file', (e, io) => gitReturns(io, 'status', ' M generator/design.md\0'),
      /reviewed clean-input/],
    ['a different E hash identity', (e, io) => { e.identities.hashIdentity = 'X'; }, /hashIdentity/],
    ['a different replay identity', (e, io) => { e.identities.replayIdentity = 'X'; }, /replayIdentity/],
    ['different producer sources', (e, io) => { e.identities.sources = 'X'; }, /sources/],
    ['a different target table', (e, io) => { e.tableSha256 = 'X'; }, /target table/],
    ['another target for the cell', (e, io) => { e.cell.targetMs = 32; }, /target of classic4\/veryEasy/],
    ['another Node', (e, io) => { io.node = () => 'v24.0.0'; }, /node v24/],
    ['another CPU', (e, io) => machineIs(io, { cpu: 'X' }), /machine cpu/],
    ['fewer logical processors', (e, io) => machineIs(io, { logicalProcessors: 8 }), /logicalProcessors/],
    ['another memory size', (e, io) => machineIs(io, { memoryGb: 32 }), /memoryGb/],
    ['another platform', (e, io) => machineIs(io, { platform: 'win32 10.0.19045' }), /platform/],
    ['git that fails', (e, io) => { io.git = () => { throw new Error('no git'); }; }, /git HEAD: no git/],
    ['identities that cannot be computed', (e, io) => { io.identities = () => { throw new Error('boom'); }; },
      /identities: boom/]
  ];
  for (const [name, change, pattern] of mismatches) {
    await test('G4: a mismatch holds: ' + name, () => {
      const e = EXPECTED();
      const io = GOOD_IO();
      change(e, io);
      const r = bind({ expected: e, io });
      assert.strictEqual(r.ok, false);
      assert.ok(r.problems.some((p) => pattern.test(p)), r.problems.join(' | '));
    });
  }

  await test('R3: a descendant of the base with only campaign outputs and pack files is bound', () => {
    const dirs = [RUN];
    const io = GOOD_IO();
    gitReturns(io, 'diff', RUN + '/ledger.json\0' + LEDGER + '\0tasks/difficulty-v3/check-list.md\0');
    const e = EXPECTED();
    e.base = 'b'.repeat(40);
    const r = bind({ expected: e, io, allow: { declaredRuns: [], declaredDirs: dirs } });
    assert.strictEqual(r.ok, true, r.problems.join());
    assert.strictEqual(r.head.descendant, true);
    assert.strictEqual(r.head.base, 'b'.repeat(40));
    assert.strictEqual(r.head.actual, HEAD);
    assert.deepStrictEqual(r.head.diff.violations, []);
    assert.strictEqual(r.head.diff.paths.length, 3);
  });

  await test('G4: no helper manifest, or a changed helper, is a hold; raw status shown when dirty', () => {
    const none = bind({ allow: { declaredRuns: [RUN] }, helpers: null });
    assert.ok(none.problems.some((p) => /no helper manifest/.test(p)));
    const io = GOOD_IO();
    gitReturns(io, 'status', '?? ' + RUN + '/request.json\0');
    const r = bind({ allow: { declaredRuns: [RUN] }, io });
    assert.strictEqual(r.ok, true, r.problems.join());
    assert.strictEqual(r.status.rawClean, false, 'a status with run outputs is never called clean');
    assert.strictEqual(r.status.reviewedClean, true);
    assert.deepStrictEqual(r.status.rawText, ['?? ' + RUN + '/request.json']);
  });

  await test('C0-4: the ledger is decided by its committed bytes: exact prefix (modulo CRLF) or not', () => {
    const committed = '{"a":1}\n{"b":2}\n';
    const make = (working, showFails) => {
      const io = GOOD_IO();
      const g = io.git;
      io.git = (a) => {
        if (a[0] === 'status') return ' M ' + LEDGER + '\0';
        if (a[0] === 'show') {
          if (showFails) throw new Error('not committed');
          assert.strictEqual(a[1], 'HEAD:' + LEDGER);
          return committed;
        }
        return g(a);
      };
      io.readWorking = () => working;
      return sb.bindSource({ expected: EXPECTED(), allow: { declaredRuns: [] }, helpers: HELPERS(), io });
    };
    const crlf = '{"a":1}\r\n{"b":2}\r\n{"c":3}\r\n';
    assert.strictEqual(make(crlf).ok, true, 'appended lines, CRLF working file');
    assert.strictEqual(make(committed + '{"c":3}\n').ok, true, 'appended lines, LF working file');
    assert.strictEqual(make('{"a":1}\r\n{"b":2}\r\n').ok, true, 'unchanged content');
    assert.strictEqual(make('{"a":9}\r\n{"b":2}\r\n{"c":3}\r\n').ok, false, 'an earlier line was edited');
    assert.strictEqual(make('{"a":1}\r\n').ok, false, 'the file was truncated');
    assert.strictEqual(make('{"a":1}\r\n{"b":2}').ok, false, 'the last committed line lost its end');
    assert.strictEqual(make('{"a":1}\r\n{"b":2}\r\n', true).ok, false, 'a ledger that is not committed');
    assert.ok(make('x').problems.some((p) => /reviewed clean-input/.test(p)));
  });

  await test('R3: a real run needs the campaign base commit (a stand-in may go without)', () => {
    const e = EXPECTED();
    e.base = null;
    const real = bind({ expected: e, requireHead: true });
    assert.ok(real.problems.some((p) => /no campaign base commit/.test(p)));
    const standin = bind({ expected: e });
    assert.strictEqual(standin.ok, true, standin.problems.join());
  });

  await test('G4 (the real tree, read only): identities, target table, targets, Node, machine', () => {
    const { liveIo } = require('./source-io.js');
    const io = liveIo(REPO);
    const ids = io.identities();
    assert.strictEqual(ids.hashIdentity, '344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1');
    assert.strictEqual(ids.replayIdentity,
      '1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc');
    assert.strictEqual(ids.sources, '75b0955e3e356bd1');
    const table = io.table();
    assert.strictEqual(table.sha256, '3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a');
    assert.strictEqual(table.positions.length, 135);
    assert.strictEqual(table.positions.filter((p) => p.target !== null).length, 79);
    assert.strictEqual(table.targetOf('classic9/easy'), 2342);
    assert.strictEqual(table.targetOf('mega12/hell1'), null);
    assert.strictEqual(io.node(), 'v26.13.0');
    const m = io.machine();
    assert.deepStrictEqual(m, { cpu: 'AMD EPYC 7763 64-Core Processor', logicalProcessors: 16, memoryGb: 64,
      platform: 'win32 10.0.26300' });
    const head = io.git(['rev-parse', 'HEAD']).trim();
    assert.ok(/^[0-9a-f]{40}$/.test(head));
    const status = sb.parsePorcelainZ(io.git(['status', '--porcelain=v1', '-z', '--untracked-files=all']));
    const evaluated = sb.evaluateStatus(status, { declaredRuns: [] });
    assert.strictEqual(evaluated.rawClean, status.length === 0);
    assert.strictEqual(evaluated.reviewedClean, evaluated.violations.length === 0);
  });
}

// ---------------------------------------------------------------------------------------------------------
// the Phase C tee against the frozen Phase B tee
// ---------------------------------------------------------------------------------------------------------

const PB = path.join(__dirname, '..', 'phase-b');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runTee(script, out, args, env) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [script, out].concat(args), {
      stdio: ['ignore', 'pipe', 'pipe'], env: Object.assign({}, process.env, { TEE_QUIET: '1' }, env || {})
    });
    proc.on('close', (code, signal) => resolve({ code, signal }));
  });
}
const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
const norm = (text) => text.replace(/seconds=[0-9.]+/g, 'seconds=N')
  .replace(/\\[^\s]*phase-b[\\/]/g, '<fake>\\');

async function teeCopy() {
  await test('the frozen Phase B bytes are the ones this phase references', () => {
    const recordFile = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18d', 'phase-b',
      'helpers-b-sha256.txt');
    const frozen = new Map(fs.readFileSync(recordFile, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => {
      const m = /^([0-9A-F]{64})  (.+)$/.exec(l);
      return [m[2].replace(/\\/g, '/'), m[1]];
    }));
    ['append-writer.js', 'tee-append.js', 'fake-child.js', 'run-locked.ps1'].forEach((name) => {
      const rel = 'generator/tests/artifacts/difficulty-v3/MS18d/phase-b/' + name;
      assert.ok(frozen.has(rel), rel + ' is not in the Phase B record');
      assert.strictEqual(sha256(fs.readFileSync(path.join(REPO, rel))).toUpperCase(), frozen.get(rel), rel);
    });
  });

  const modes = [['ok'], ['fail', '7'], ['chunks'], ['ws'], ['split']];
  for (const mode of modes) {
    await test('the Phase C tee writes the transcript and exit code of the Phase B tee: ' + mode.join(' '),
      async () => {
        const fake = path.join(PB, 'fake-child.js');
        const env = { FAKE_HOLD: '200' };
        const bOut = at('b-' + mode[0] + '.txt');
        const cOut = at('c-' + mode[0] + '.txt');
        const b = await runTee(path.join(PB, 'tee-append.js'), bOut, [fake].concat(mode), env);
        const c = await runTee(path.join(__dirname, 'tee-c.js'), cOut, [fake].concat(mode), env);
        assert.strictEqual(c.code, b.code);
        assert.strictEqual(norm(readText(cOut)), norm(readText(bOut)));
      });
  }

  await test('the Phase C tee: spawn record of the command (pid, time window, real exit), streams apart',
    async () => {
      const fake = path.join(PB, 'fake-child.js');
      const rec = at('spawn.jsonl');
      const dir = at('streams');
      const r = await runTee(path.join(__dirname, 'tee-c.js'), at('rec.txt'), [fake, 'fail', '4'],
        { TEE_SPAWN_RECORD: rec, TEE_STREAMS_DIR: dir });
      assert.strictEqual(r.code, 4);
      const lines = readText(rec).split('\r\n').filter(Boolean).map((l) => JSON.parse(l));
      assert.strictEqual(lines.length, 3);
      assert.strictEqual(lines[0].role, 'command');
      assert.ok(Number.isInteger(lines[0].pid) && lines[0].pid > 0);
      assert.ok(lines[0].beforeMs <= lines[0].afterMs);
      assert.strictEqual(lines[0].startedAtIso, new Date(lines[0].afterMs).toISOString(),
        'child-pid and started, ISO');
      assert.ok(lines[0].argv[lines[0].argv.length - 2] === 'fail');
      assert.strictEqual(lines[1].event, 'command-exit');
      assert.strictEqual(lines[1].code, 4);
      assert.strictEqual(lines[1].signal, null);
      assert.ok(lines[1].atMs >= lines[0].afterMs);
      assert.strictEqual(lines[2].event, 'tee-exit');
      assert.strictEqual(lines[2].stdoutBytes, 'before the failure\n'.length, 'the raw bytes of stdout');
      assert.strictEqual(lines[2].stderrBytes, 'an error line\n'.length, 'the raw bytes of stderr');
      assert.ok(Number.isInteger(lines[2].cpuUserMicros) && lines[2].cpuUserMicros >= 0, 'tee CPU at exit');
      assert.ok(Number.isInteger(lines[2].cpuSystemMicros) && lines[2].cpuSystemMicros >= 0);
      assert.ok(lines[2].atMs >= lines[1].atMs);
      assert.strictEqual(readText(path.join(dir, 'stdout.txt')), 'before the failure\r\n');
      assert.strictEqual(readText(path.join(dir, 'stderr.txt')), 'an error line\r\n');
      assert.ok(/before the failure\r\nan error line\r\nexit=4 seconds=/.test(readText(at('rec.txt'))) ||
        /an error line\r\nbefore the failure\r\nexit=4 seconds=/.test(readText(at('rec.txt'))));
    });

  await test('C0-3: stderr stays apart; a byte that normalisation drops is still counted raw', async () => {
    const fake = path.join(PB, 'fake-child.js');
    const rec = at('bytes.jsonl');
    const dir = at('streams-ws');
    const r = await runTee(path.join(__dirname, 'tee-c.js'), at('ws-c.txt'), [fake, 'ws'],
      { TEE_SPAWN_RECORD: rec, TEE_STREAMS_DIR: dir });
    assert.strictEqual(r.code, 0);
    const exit = readText(rec).split('\r\n').filter(Boolean).map((l) => JSON.parse(l)).pop();
    assert.strictEqual(exit.event, 'tee-exit');
    assert.strictEqual(exit.stderrBytes, 0, 'nothing arrived on stderr');
    assert.ok(exit.stdoutBytes > 20);
    assert.ok(readText(path.join(dir, 'stdout.txt')).indexOf('last line without a line end') !== -1);
    assert.strictEqual(readText(path.join(dir, 'stderr.txt')), '');
    // a command whose only stderr output is a carriage return: no line in any file, but one raw byte
    fs.writeFileSync(at('cr-only.js'), 'process.stderr.write("\\r");');
    const rec2 = at('cr.jsonl');
    const dir2 = at('streams-cr');
    const c = await runTee(path.join(__dirname, 'tee-c.js'), at('cr.txt'), [at('cr-only.js')],
      { TEE_SPAWN_RECORD: rec2, TEE_STREAMS_DIR: dir2 });
    assert.strictEqual(c.code, 0);
    const end = readText(rec2).split('\r\n').filter(Boolean).map((l) => JSON.parse(l)).pop();
    assert.strictEqual(end.stderrBytes, 1, 'the stray byte is counted');
    assert.strictEqual(readText(path.join(dir2, 'stderr.txt')), '', 'the normalised file has lost it');
  });

  await test('C0-2 and C0-5: controller and tee do no periodic work and query no process during a payload',
    () => {
      const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      ['tee-c.js', 'controller.js'].forEach((name) => {
        const code = strip(fs.readFileSync(path.join(__dirname, name), 'utf8'));
        assert.ok(!/\b(setTimeout|setInterval|setImmediate)\b/.test(code), name + ' uses a timer');
        assert.ok(!/\bAtomics\.wait\b/.test(code), name + ' waits busily');
        assert.ok(!/Get-CimInstance|wmic|tasklist/.test(code), name + ' queries processes');
      });
      const tee = strip(fs.readFileSync(path.join(__dirname, 'tee-c.js'), 'utf8'));
      assert.ok(!/execFile|execSync|spawnSync|exec\(/.test(tee), 'the tee starts only the command');
      const controller = strip(fs.readFileSync(path.join(__dirname, 'controller.js'), 'utf8'));
      const uses = controller.split('spawnSync').length - 1;
      assert.strictEqual(uses, 1, 'the one spawnSync of the controller is the barrier, after the tee closed');
      const barrierFunction = /function runBarrier[\s\S]*?\r?\n}\r?\n/.exec(controller);
      assert.ok(barrierFunction && barrierFunction[0].indexOf('spawnSync') !== -1);
      const afterClose = controller.slice(controller.indexOf("tee.on('close'"));
      assert.ok(afterClose.indexOf('runBarrier(request') > 0, 'the barrier runs after the close event');
    });

  await test('the Phase C tee: a command that cannot start has a spawn-error line, 127, no record',
    async () => {
      const rec = at('nospawn.jsonl');
      const r = await runTee(path.join(__dirname, 'tee-c.js'), at('nospawn.txt'), ['x'],
        { TEE_SPAWN_RECORD: rec, TEE_EXEC: at('no-such-node.exe') });
      assert.strictEqual(r.code, 127);
      const last = readText(at('nospawn.txt')).split('\r\n').filter(Boolean).pop();
      assert.ok(/^spawn-error=.* seconds=\d/.test(last));
      assert.ok(!/"role":"command"/.test(readText(rec)));
    });

  await test('the Phase C tee: an existing transcript or stream file is code 2, unchanged', async () => {
    const fakeChild = path.join(PB, 'fake-child.js');
    fs.writeFileSync(at('exists.txt'), 'old\r\n');
    const r = await runTee(path.join(__dirname, 'tee-c.js'), at('exists.txt'), [fakeChild, 'ok']);
    assert.strictEqual(r.code, 2);
    assert.strictEqual(readText(at('exists.txt')), 'old\r\n');
    fs.mkdirSync(at('streams2'));
    fs.writeFileSync(path.join(at('streams2'), 'stdout.txt'), 'old');
    const s = await runTee(path.join(__dirname, 'tee-c.js'), at('t2.txt'), [fakeChild, 'ok'],
      { TEE_STREAMS_DIR: at('streams2') });
    assert.strictEqual(s.code, 2);
    assert.strictEqual(readText(path.join(at('streams2'), 'stdout.txt')), 'old');
    await sleep(10);
  });
}

async function payloadHook() {
  const payloads = require('./payloads.js');
  const bounded = (type, result) => payloads.boundedResult(type, result);
  await test('C0-6: the registered payload types say whether exit 1 is defined (gp-cell, gp-merge)', () => {
    assert.deepStrictEqual(payloads.types().sort(), ['generic', 'gp-cell', 'gp-merge', 'gp-recorder']);
    assert.strictEqual(payloads.payloadFor({ profile: 'gp-cell' }).allowsMissExit, true);
    assert.strictEqual(payloads.payloadFor({ profile: 'gp-merge' }).allowsMissExit, true);
    assert.strictEqual(payloads.payloadFor({ profile: 'gp-recorder' }).allowsMissExit, false);
    assert.strictEqual(payloads.payloadFor({ profile: 'generic' }).allowsMissExit, false);
    assert.throws(() => payloads.payloadFor({ profile: 'recorder' }), /unknown payload type/);
    assert.throws(() => payloads.payloadFor({ profile: 'gp-cell', standin: false, classifierModule: 'x.js' })
      .validateRequest({}), /names its cell/, 'a module is ignored unless the request is a stand-in');
    assert.throws(() => payloads.payloadFor({ profile: 'gp-cell' })
      .validateRequest({ cell: { variant: 'a' } }), /names its cell/);
    assert.throws(() => payloads.register({ type: 'x', validateRequest() {}, cellOf() {}, classify() {} }),
      /says whether/);
    assert.throws(() => payloads.register({ type: 'generic', allowsMissExit: false, validateRequest() {},
      cellOf() {}, classify() {} }), /twice/);
  });

  await test('C0-6: exit 1 is a controller exit only for a type that defines it, and a complete miss', () => {
    const gpType = payloads.payloadFor({ profile: 'gp-cell' });
    const genType = payloads.payloadFor({ profile: 'generic' });
    const miss = { outcome: 'miss', complete: true, controllerExit: 1, kinds: [], problems: [] };
    assert.strictEqual(bounded(gpType, miss).controllerExit, 1);
    const denied = bounded(genType, miss);
    assert.strictEqual(denied.outcome, 'stop');
    assert.strictEqual(denied.controllerExit, 65);
    assert.ok(denied.kinds.indexOf('undefined-exit') !== -1);
    assert.strictEqual(bounded(gpType, { outcome: 'miss', complete: false, controllerExit: 1 }).outcome,
      'stop');
    assert.strictEqual(bounded(gpType, { outcome: 'success', complete: true, controllerExit: 1 }).outcome,
      'stop');
    assert.strictEqual(bounded(gpType, { outcome: 'success', complete: true, controllerExit: 7 })
      .controllerExit, 65);
    assert.strictEqual(bounded(gpType, { outcome: 'success', complete: true, controllerExit: 0 })
      .controllerExit, 0);
    assert.strictEqual(bounded(gpType, { outcome: 'stop', complete: false, controllerExit: 65 })
      .controllerExit, 65);
    assert.strictEqual(bounded(gpType, null).outcome, 'stop');
    assert.strictEqual(bounded(gpType, { outcome: 'success', complete: false, controllerExit: 0 })
      .controllerExit, 65, 'an incomplete result is never exit 0');
  });

  await test('C0-6: a stand-in classifier module plugs in beside the perf.js one and reads the run files',
    () => {
      const module = path.join(__dirname, 'standin-payload-classifier.js');
      const impl = payloads.payloadFor({ profile: 'standin-ledger', standin: true,
        classifierModule: module });
      impl.validateRequest({ expectedRecords: 3 });
      assert.throws(() => impl.validateRequest({}), /expectedRecords/);
      assert.throws(() => payloads.payloadFor({ profile: 'standin-ledger' }), /unknown payload type/,
        'not a real run');
      assert.throws(() => payloads.payloadFor({ profile: 'other', standin: true, classifierModule: module }),
        /not of type/);
      const evidence = (over) => Object.assign({ request: { expectedRecords: 3 }, stderrBytes: 0,
        cli: { exit: 0, signal: null }, tee: { marker: 'exit=0 seconds=1.000', exit: 0 },
        barrier: { verdict: 'clean' }, binding: { ok: true }, acquisition: { decision: 'proceed' },
        readRunFile: () => JSON.stringify({ records: [{}, {}, {}] }) }, over || {});
      const ok = bounded(impl, impl.classify(evidence()));
      assert.strictEqual(ok.outcome, 'success', ok.problems.join());
      assert.strictEqual(ok.records, 3);
      const short = impl.classify(evidence({ readRunFile: () => JSON.stringify({ records: [{}] }) }));
      assert.ok(short.kinds.indexOf('ledger-incomplete') !== -1);
      assert.ok(impl.classify(evidence({ readRunFile: () => null })).kinds.indexOf('ledger-missing') !== -1);
      assert.ok(impl.classify(evidence({ stderrBytes: 2 })).kinds.indexOf('stderr-output') !== -1);
      assert.strictEqual(bounded(impl, impl.classify(evidence({ cli: { exit: 1, signal: null } })))
        .controllerExit, 65);
    });
}

// ---------------------------------------------------------------------------------------------------------
// epoch 3: the typed pre-window event is no release (release-history.js), replayed over the retained data
// ---------------------------------------------------------------------------------------------------------

const EV = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18d');
// the exact bytes of line 24 of the real Phase C log: the first give-up the wrapper ever wrote (19:09:20 +07)
const LINE24 = '{"schema":"ms18d-c-run-1","type":"pre-window-hold",' +
  '"task":"MS18d GP record mega16-easy.i0.n50 a2","runId":"mega16-easy.i0.n50.a2","cell":"mega16/easy",' +
  '"payload":"gp-recorder","chunkId":"mega16-easy.i0.n50","attempt":2,"scope":null,"standin":false,' +
  '"outcome":"pre-window-hold","heldAt":"foreign-lock-watch","at":"2026-11-19T19:09:20.061+07:00",' +
  '"reasons":["a lock of another job did not leave a 15.3 s quiet window within the bounded wait"],' +
  '"watch":{"startedAtMs":1795090155748,"lastCheckMs":1795090160060,"checks":18,' +
  '"restartCount":0,"giveUpSeconds":4.2332728,"gaveUp":true},"problems":[]}';
const realLines = () => fs.readFileSync(path.join(EV, 'phase-c', 'lock-log.jsonl'), 'utf8')
  .split(/\r?\n/).filter((l) => l.trim() !== '');
const realSources = (cFile) => [
  { label: 'A', file: path.join(EV, 'lock-log.jsonl'), kind: 'log', required: true },
  { label: 'B', file: path.join(EV, 'phase-b', 'lock-log.jsonl'), kind: 'log', required: true },
  { label: 'C', file: cFile, kind: 'log', required: false }];

async function preWindowEvents() {
  await test('epoch 3: the exact bytes of real line 24 are a pre-window event: skipped, no release', () => {
    assert.strictEqual(realLines()[23], LINE24, 'the retained line is the one this test names');
    jsonl(at('pw1.jsonl'), [{ finished: iso(T - 90000), releaseObservedAt: iso(T - 89000) }, LINE24]);
    const h = collectReleases([{ label: 'C', file: at('pw1.jsonl'), kind: 'log', required: false }]);
    assert.deepStrictEqual(h.problems, []);
    assert.strictEqual(h.releases.length, 1, 'the event adds no release');
    assert.strictEqual(h.latest.atMs, T - 89000);
    assert.deepStrictEqual(h.files[0].skippedLines, [2]);
    assert.deepStrictEqual(h.files[0].skippedEvents, [{ line: 2, type: 'pre-window-hold',
      heldAt: 'foreign-lock-watch', runId: 'mega16-easy.i0.n50.a2', at: '2026-11-19T19:09:20.061+07:00' }]);
    const alone = collectReleases([{ label: 'C', file: at('pw1.jsonl'), kind: 'log', required: false }]);
    assert.strictEqual(alone.latest.atMs, T - 89000, 'the give-up at 19:09 never becomes the latest release');
  });

  await test('epoch 3: the first 24 real lines are the pre-a2 history: 24 excluded, 23 the release', () => {
    fs.writeFileSync(at('real24.jsonl'), realLines().slice(0, 24).join('\r\n') + '\r\n');
    const h = collectReleases(realSources(at('real24.jsonl')));
    assert.deepStrictEqual(h.problems, []);
    assert.strictEqual(h.latest.label, 'C');
    assert.strictEqual(h.latest.atMs, Date.parse('2026-11-19T18:47:51.850+07:00'), 'line 23 release');
    assert.strictEqual(h.latest.line, 23);
    assert.deepStrictEqual(h.files[2].skippedLines, [24]);
    assert.strictEqual(h.files[0].skippedLines, undefined, 'only the Phase C log has the exemption');
    assert.strictEqual(h.files[1].skippedLines, undefined);
    assert.strictEqual(h.releases.filter((r) => r.label === 'C').length, 23, 'each earlier run of C');
  });

  await test('epoch 3: the 25-line history excludes only line 24 and takes the line 25 release', () => {
    fs.writeFileSync(at('real25.jsonl'), realLines().slice(0, 25).join('\r\n') + '\r\n');
    const h = collectReleases(realSources(at('real25.jsonl')));
    assert.deepStrictEqual(h.problems, []);
    assert.strictEqual(h.latest.line, 25);
    assert.strictEqual(h.latest.atMs, Date.parse('2026-11-19T20:50:13.563+07:00'));
    assert.deepStrictEqual(h.files[2].skippedLines, [24]);
  });

  await test('epoch 3: the saved a2 acquisition facts replayed over the pre-a2 history now proceed', () => {
    const saved = JSON.parse(fs.readFileSync(path.join(EV, 'gp', 'mega16-easy', 'mega16-easy.i0.n50.a2',
      'acquisition.json'), 'utf8'));
    assert.strictEqual(saved.decision, 'hold');
    assert.deepStrictEqual(saved.historyProblems, ['C:24: no usable finished time']);
    const history24 = collectReleases(realSources(at('real24.jsonl')));
    const again = decideAcquisition({ requestedAtMs: saved.requestedAtMs, startedAtMs: saved.startedAtMs,
      lockAcquiredAtMs: saved.lockAcquiredAtMs, slotBefore: saved.slotBefore, history: history24,
      watch: saved.watch });
    assert.deepStrictEqual(again.reasons, []);
    assert.strictEqual(again.decision, 'proceed');
    assert.deepStrictEqual(again.historyProblems, []);
    // the watch, the start delay and the slot facts are the saved ones; nothing else was relaxed
    assert.strictEqual(again.startDelayMs, saved.startDelayMs);
    assert.strictEqual(again.releaseGapMs, saved.startedAtMs - Date.parse('2026-11-19T18:47:51.850+07:00'));
  });

  await test('epoch 3: old and new typed pre-window rows, with or without a diagnostic finished', () => {
    const old = JSON.parse(LINE24);
    const meta = { lockAcquired: false, admissionConsumed: false, payloadStarted: false };
    const rows = [
      { finished: iso(T - 90000) },
      Object.assign({}, old, { heldAt: 'pre-window-recheck' }),
      Object.assign({}, old, meta, { watchCycles: 3, repeatedCycles: 2, omittedCycles: 0, cycles: [] }),
      Object.assign({}, old, meta, { finished: iso(T + 500000) }),
      Object.assign({}, old, meta, { heldAt: 'pre-window-recheck', finished: iso(T + 600000) }),
      Object.assign({}, old, meta, { finished: old.at })];
    jsonl(at('pw2.jsonl'), rows);
    const h = collectReleases([{ label: 'C', file: at('pw2.jsonl'), kind: 'log', required: false }]);
    assert.deepStrictEqual(h.problems, []);
    assert.strictEqual(h.releases.length, 1);
    assert.strictEqual(h.latest.atMs, T - 90000, 'a diagnostic finished is not a release');
    assert.deepStrictEqual(h.files[0].skippedLines, [2, 3, 4, 5, 6]);
  });

  await test('epoch 3: variants of the shape and contradictory claims are problems, never skipped', () => {
    const old = JSON.parse(LINE24);
    const meta = { lockAcquired: false, admissionConsumed: false, payloadStarted: false };
    const variants = [
      ['another schema', { schema: 'other' }, 'schema'], ['no heldAt', { heldAt: undefined }, 'heldAt'],
      ['another heldAt', { heldAt: 'lock' }, 'heldAt'], ['no at', { at: undefined }, 'at'],
      ['an unusable at', { at: 'soon' }, 'at'], ['an at without a zone', { at: '2026-11-19T19:09:20' }, 'at'],
      ['outcome only', { type: undefined }, 'type and outcome'],
      ['type only', { outcome: 'success' }, 'type and outcome'],
      ['a release time', { releaseObservedAt: iso(T) }, 'key releaseObservedAt'],
      ['a run directory', { runDir: 'docs/x' }, 'key runDir'], ['an exit', { exit: 64 }, 'key exit'],
      ['a controller outcome', { controllerOutcome: 'control-hold' }, 'key controllerOutcome'],
      ['an unknown key', { note: 'x' }, 'key note'],
      ['a lock acquired', { lockAcquired: true }, 'claim lockAcquired'],
      ['an admission consumed', { admissionConsumed: true }, 'claim admissionConsumed'],
      ['a payload started', { payloadStarted: true }, 'claim payloadStarted'],
      ['a metadata that is no boolean', { lockAcquired: 'no' }, 'claim lockAcquired'],
      ['a finished without the metadata', { finished: iso(T) }, 'finished without metadata'],
      ['a finished with partial metadata', { finished: iso(T), lockAcquired: false },
        'finished without metadata'],
      ['an unusable finished', Object.assign({ finished: 'soon' }, meta), 'finished']];
    variants.forEach(([what, over, why]) => {
      jsonl(at('pw3.jsonl'), [{ finished: iso(T - 90000) }, Object.assign({}, old, over)]);
      const h = collectReleases([{ label: 'C', file: at('pw3.jsonl'), kind: 'log', required: false }]);
      assert.deepStrictEqual(h.problems, ['C:2: not a valid pre-window event (' + why + ')'], what);
      assert.strictEqual(h.releases.length, 1, what + ': it is no release');
      assert.strictEqual(h.files[0].skippedLines, undefined, what + ': it is not skipped');
    });
  });

  await test('epoch 3: only the Phase C log has the exemption; an ordinary row still needs finished', () => {
    const old = JSON.parse(LINE24);
    jsonl(at('pw4.jsonl'), [{ finished: iso(T - 90000) }, old]);
    const asA = collectReleases([{ label: 'A', file: at('pw4.jsonl'), kind: 'log', required: true }]);
    assert.deepStrictEqual(asA.problems, ['A:2: no usable finished time'], 'no such event in Phase A/B');
    const run = Object.assign({}, old, { type: undefined, outcome: 'control-hold', runDir: 'x' });
    const others = [JSON.stringify(run), JSON.stringify({ schema: 'ms18d-c-run-1', outcome: 'success' })];
    ['5', 'null', '"x"', '[]'].concat(others)
      .forEach((row) => {
        jsonl(at('pw5.jsonl'), [{ finished: iso(T - 90000) }, row]);
        const h = collectReleases([{ label: 'C', file: at('pw5.jsonl'), kind: 'log', required: false }]);
        assert.deepStrictEqual(h.problems, ['C:2: no usable finished time'], row);
      });
    jsonl(at('pw6.jsonl'), [{ finished: iso(T - 90000) }, '{"broken', old]);
    const mixed = collectReleases([{ label: 'C', file: at('pw6.jsonl'), kind: 'log', required: false }]);
    assert.deepStrictEqual(mixed.problems, ['C: pw6.jsonl:2: not JSON'], 'a broken line is still a problem');
    assert.deepStrictEqual(mixed.files[0].skippedLines, [3]);
  });

  await test('epoch 3: the line-only ruling releases no admission: mega16-easy is still refused', () => {
    const easy = 'mega16-easy.i0.n50';
    fs.writeFileSync(at('real25c.jsonl'), realLines().slice(0, 25).join('\r\n') + '\r\n');
    // the template: it names the held run a2, carries the fixed allowAttempt 2 and releases the F4 line only
    const ruling = { chunkId: easy, heldRunId: easy + '.a2', allowAttempt: 2,
      ref: 'tasks/difficulty-v3/MS18d-gp-campaign-base-3.jsonl', at: '2026-11-19T21:00:00+07:00' };
    const journal = (entries) => ({ entries, problems: [], reference: null });
    const ask = (chunkId, cell, runId, entries) => chunkAttempts({ baseDir: path.join(EV, 'gp', cell),
      chunkId, runId, ledgerFile: at('real25c.jsonl'), rulings: journal(entries),
      nowMs: Date.parse('2026-11-19T22:30:00+07:00') });
    [[], [ruling]].forEach((entries) => {
      const a3 = ask(easy, 'mega16-easy', easy + '.a3', entries);
      assert.strictEqual(a3.decision, 'refuse', 'a3 with ' + entries.length + ' ruling(s)');
      assert.deepStrictEqual(a3.reasons, ['chunk-admissions-used: at most two per chunk']);
      assert.deepStrictEqual(a3.problems, [], 'the retained records are consistent');
      assert.strictEqual(a3.admissions, 2, 'a1 and a2 stay spent');
      assert.strictEqual(a3.payloads, 0);
      assert.strictEqual(a3.ruling, null, 'the ruling stands in for nothing');
      ['mega16-normal.i0.n50', 'mega16-hard.i0.n50'].forEach((next) => {
        const r = ask(next, 'mega16-' + next.split('-')[1].split('.')[0], next + '.a1', entries);
        assert.strictEqual(r.decision, 'allow', next + ' still needs every check, and passes them');
        assert.strictEqual(r.admissions, 0);
      });
    });
  });
}

async function main() {
  await timeAndHistory();
  await preWindowEvents();
  await acquisitionRule();
  await classifier();
  await payloadHook();
  await binding();
  await teeCopy();
}

main().then(() => {
  console.log(passed + ' passed, ' + failed.length + ' failed');
  if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
  process.exitCode = failed.length === 0 ? 0 : 1;
}, (err) => {
  console.log('ERROR ' + (err && err.stack));
  process.exitCode = 1;
}).then(() => {
  fs.rmSync(scratch, { recursive: true, force: true });
});
