'use strict';

/*
 * MS18c Stage 3 FAKE-DATA tests of monitor.cjs (revision 2 of the runtime monitor): the lower bound
 * R <= W-Q, the invalid R, a negative Q-S that is kept and passes, the three premises of a cell
 * (cellCount, budget, attempts), the mandatory canonical validation and the header of the record. No
 * solver, no payload, no file written; the existing pure records helper only builds and checks fake
 * records. The Stage 1 result of test-rules.cjs (21/21) is not claimed for any of these checks.
 *   node generator/tests/artifacts/difficulty-v3/MS18c/test-monitor.cjs
 */
const assert = require('assert');
const rules = require('./rules.cjs');
const monitor = require('./monitor.cjs');
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
    console.log('FAIL ' + name + ': ' + (err && err.message));
  }
}

const lib = inputs.recordsConstants();
const ROW = { key: 'classic4/veryEasy', cellCount: 16, attempts: 8, b: 2, budgetMs: 2000, A: 1770 };
const POLICY = { function: 'SG.digger.defaultMaxAttempts', explicitMaxAttempts: false,
  sources: { 'js/engine/digger.js': 'd'.repeat(64), 'js/engine/pipeline.js': 'e'.repeat(64),
    'js/variants/registry.js': 'f'.repeat(64) } };
const MACHINE = { cpu: 'AMD EPYC 7763 64-Core Processor', logicalProcessors: 16, memoryGb: 64,
  platform: 'win32 10.0.26300', node: 'v26.13.0', jobs: 4 };
const EXP = { protocol: lib.PROTOCOL.document, seedBase: 20260601, qualifierHash: 'a'.repeat(64),
  acceptance: lib.PROTOCOL.acceptance, ratingVersion: 3, guardMs: 120000, attemptPolicy: POLICY,
  machine: MACHINE, engineSources: '0ca29eaeebc295b6' };
const START = '2026-11-20T01:00:00.000Z';
const iso = (ms) => new Date(Date.parse(START) + ms).toISOString();

function libCell(outcomes, stopped, over) {
  const key = ROW.key;
  const requests = outcomes.map((o, i) => ({ key: key, index: i, seed: lib.seedFor(key + '/' + i),
    ms: o.ms, hit: o.hit, valid: true, solved: true, approximate: false, exact: o.hit,
    achieved: 'veryEasy', score: 1 }));
  const cell = { variant: 'classic4', level: 'veryEasy', cellCount: 16, budget: lib.budgetOf(16), attempts: 8,
    summary: lib.decide({ done: requests, budget: lib.budgetOf(16), stopped: stopped }, false),
    requests: requests };
  return Object.assign(cell, over);
}

const fastHits = (n, ms) => Array.from({ length: n }, () => ({ ms: ms === undefined ? 100 : ms, hit: true }));

/** A record whose Q is S plus `qMinusS` seconds; `over` patches the record, `cellOver` the cell. */
function recordOf(outcomes, stopped, qMinusS, over, cellOver) {
  const cell = libCell(outcomes, stopped, cellOver);
  const sMs = rules.simulate(cell.requests, 4, 40).totalMs;
  const qMs = Math.round(sMs + qMinusS * 1000);
  return Object.assign({
    protocol: EXP.protocol, seedBase: 20260601, machine: MACHINE,
    engine: { sources: EXP.engineSources, commit: null, dirty: null }, qualifierHash: EXP.qualifierHash,
    acceptance: EXP.acceptance, ratingVersion: 3, probe: 0, earlyStop: true, guardMs: 120000,
    attemptPolicy: POLICY, started: START, finished: iso(qMs), seconds: Math.round(qMs / 1000),
    cells: [cell], support: {}
  }, over);
}

const qOf = (record) => Date.parse(record.finished) - Date.parse(record.started);
function run(record, wMinusQ, r, over) {
  const w = (qOf(record) + wMinusQ * 1000) / 1000;
  return monitor.evaluate(Object.assign({ row: ROW, record: record, wSeconds: w, rSeconds: r, records: lib,
    expectation: EXP }, over));
}
const hasText = (list, text) => list.some((p) => p.indexOf(text) !== -1);

test('a record with R <= W-Q <= 60 and Q-S <= 11 proceeds, and the residuals are kept', () => {
  const record = recordOf(fastHits(40), null, 0.5);
  const r = run(record, 3, 2);
  assert.ok(r.proceed, JSON.stringify(r));
  assert.strictEqual(r.metrics.rSeconds, 2);
  assert.strictEqual(r.metrics.qMinusS, 0.5);
  assert.strictEqual(r.metrics.wMinusQ, 3);
  assert.deepStrictEqual([r.invalid, r.invalidTiming, r.breaches], [[], [], []]);
});

test('R must be present, finite, non-negative and not larger than W', () => {
  const record = recordOf(fastHits(40), null, 0.5);
  [[undefined, 'missing'], [null, 'missing'], [NaN, 'missing'], [Infinity, 'missing'], ['2', 'missing'],
    [-0.001, 'negative']].forEach(([value, text]) => {
    const r = run(record, 3, value);
    assert.ok(!r.proceed && hasText(r.invalidTiming, text),
      String(value) + ' ' + JSON.stringify(r.invalidTiming));
  });
  const bigger = monitor.evaluate({ row: ROW, record: record, wSeconds: 1.5, rSeconds: 2, records: lib,
    expectation: EXP });
  assert.ok(!bigger.proceed && hasText(bigger.invalidTiming, 'larger than W'));
});

test('W-Q exactly R and exactly 60 are accepted; below R or above 60 is rejected', () => {
  const record = recordOf(fastHits(40), null, 0.5);
  assert.ok(run(record, 2, 2).proceed, 'W-Q equals R');
  assert.ok(run(record, 60, 2).proceed, 'W-Q equals 60');
  const below = run(record, 1.999, 2);
  assert.ok(!below.proceed && hasText(below.invalidTiming, 'below R') && below.breaches.length === 0);
  const above = run(record, 60.001, 2);
  assert.ok(!above.proceed && hasText(above.breaches, 'W-Q 60.001'));
  assert.strictEqual(above.invalidTiming.length, 0);
  // R at the top of its range: R may be as large as W-Q (and 60).
  assert.ok(run(record, 60, 60).proceed);
  assert.ok(!run(record, 59.5, 60).proceed);
});

test('a negative W-Q is invalid timing whatever R is, and is kept as recorded', () => {
  const record = recordOf(fastHits(40), null, 0.5);
  [0, 0.5].forEach((r) => {
    const result = run(record, -0.25, r);
    assert.ok(!result.proceed && hasText(result.invalidTiming, 'below R'), JSON.stringify(result));
    assert.strictEqual(result.metrics.wMinusQ, -0.25);
  });
});

test('an unknown W (a supervisor that was lost) is invalid timing: the record is kept for review', () => {
  const record = recordOf(fastHits(40), null, 0.5);
  [null, undefined, NaN].forEach((w) => {
    const result = monitor.evaluate({ row: ROW, record: record, wSeconds: w, rSeconds: 2, records: lib,
      expectation: EXP });
    assert.ok(!result.proceed && hasText(result.invalidTiming, 'W'), String(w) + JSON.stringify(result));
    assert.deepStrictEqual(result.invalid, [], 'the record itself is still valid');
  });
});

test('a negative Q-S is retained and passes; Q-S above 11 s is a breach, exactly 11 passes', () => {
  const negative = run(recordOf(fastHits(40, 2000), null, -7.25), 3, 2);
  assert.ok(negative.proceed, JSON.stringify(negative));
  assert.strictEqual(negative.metrics.qMinusS, -7.25);
  assert.ok(run(recordOf(fastHits(40), null, 11), 3, 2).proceed);
  const over = run(recordOf(fastHits(40), null, 11.001), 3, 2);
  assert.ok(!over.proceed && hasText(over.breaches, 'Q-S 11.001'));
});

test('cellCount, budget and attempts of the record must equal the row; each mismatch is rejected', () => {
  const base = recordOf(fastHits(40), null, 0.5);
  [[{ cellCount: 36 }, 'cellCount'], [{ budget: 10000 }, 'budget'], [{ attempts: 4 }, 'attempts']].forEach(
    ([patch, text]) => {
      const r = run(recordOf(fastHits(40), null, 0.5, {}, patch), 3, 2);
      assert.ok(!r.proceed && hasText(r.invalid, 'premise: ' + text), text + ' ' + JSON.stringify(r.invalid));
    });
  assert.ok(run(base, 3, 2).proceed);
  const other = recordOf(fastHits(40), null, 0.5, {}, { level: 'easy' });
  assert.ok(hasText(run(other, 3, 2).invalid, 'is not the approved classic4/veryEasy'));
});

test('the canonical validation is mandatory: absent, failing or throwing is a failure', () => {
  const record = recordOf(fastHits(40), null, 0.5);
  const missing = monitor.evaluate({ row: ROW, record: record, wSeconds: 5, rSeconds: 2, expectation: EXP });
  assert.ok(!missing.proceed && hasText(missing.invalid, 'mandatory'));
  const noMethod = monitor.evaluate({ row: ROW, record: record, wSeconds: 5, rSeconds: 2, records: {},
    expectation: EXP });
  assert.ok(!noMethod.proceed && hasText(noMethod.invalid, 'mandatory'));
  const forged = JSON.parse(JSON.stringify(record));
  forged.cells[0].requests[7].seed += 1;
  const bad = run(forged, 3, 2);
  assert.ok(!bad.proceed && hasText(bad.invalid, 'canonical: request #7 seed'), JSON.stringify(bad.invalid));
  const throwing = run(record, 3, 2, { records: { checkCell: () => { throw new Error('boom'); } } });
  assert.ok(!throwing.proceed && hasText(throwing.invalid, 'canonical validation threw: boom'));
  const hidden = run(record, 3, 2, { expectation: undefined });
  assert.ok(!hidden.proceed && hasText(hidden.invalid, 'expectation'));
});

test('the header must be the approved one: identities, machine, options and the single cell', () => {
  const good = recordOf(fastHits(40), null, 0.5);
  const cases = [
    [{ qualifierHash: 'b'.repeat(64) }, 'qualifierHash'],
    [{ engine: { sources: '0'.repeat(16) } }, 'engine.sources'],
    [{ machine: Object.assign({}, MACHINE, { node: 'v24.0.0' }) }, 'machine'],
    [{ attemptPolicy: Object.assign({}, POLICY, { explicitMaxAttempts: true }) }, 'attemptPolicy'],
    [{ probe: 5 }, 'probe'], [{ earlyStop: false }, 'earlyStop'], [{ guardMs: 60000 }, 'guardMs'],
    [{ seedBase: 1 }, 'seedBase'], [{ ratingVersion: 2 }, 'ratingVersion'],
    [{ protocol: 'other' }, 'protocol'],
    [{ acceptance: 'loose' }, 'acceptance'], [{ started: 'yesterday' }, 'started is not an ISO'],
    [{ shards: [] }, 'merged record'], [{ cells: good.cells.concat(good.cells) }, 'exactly one cell']
  ];
  cases.forEach(([patch, text]) => {
    const r = run(Object.assign({}, good, patch), 3, 2);
    assert.ok(!r.proceed && hasText(r.invalid, text), text + ' in ' + JSON.stringify(r.invalid));
  });
});

test('the structural counts and the request bound still apply to the record', () => {
  const six = Array.from({ length: 10 }, (_, i) => ({ ms: i < 6 ? 3000 : 100, hit: true }));
  const stopped = run(recordOf(six, 'time', 0.5), 3, 2);
  assert.ok(stopped.proceed, JSON.stringify(stopped));
  assert.strictEqual(stopped.metrics.slowTotal, 6);
  const slow = [{ ms: 130000.5, hit: true }].concat(fastHits(39));
  const r = run(recordOf(slow, null, 0.5), 3, 2);
  assert.ok(!r.proceed && hasText(r.breaches, 'above 130000'), JSON.stringify(r));
  const six2 = Array.from({ length: 40 }, (_, i) => ({ ms: i < 6 ? 3000 : 100, hit: true }));
  const noStop = run(recordOf(six2, null, 0.5), 3, 2);
  assert.ok(!noStop.proceed, 'six slow outcomes without a stop is not a valid record');
});

test('the rounded seconds field is never the Q of the monitor and nothing is clamped', () => {
  const record = recordOf(fastHits(40), null, 0.5, { seconds: 99999 });
  const r = run(record, 3, 2);
  assert.ok(r.proceed);
  assert.strictEqual(r.metrics.qSeconds, 1.5);
  assert.notStrictEqual(r.metrics.qSeconds, record.seconds);
  assert.deepStrictEqual(rules.approvalOffences(r), []);
});

console.log(passed + ' passed, ' + failed.length + ' failed');
if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
process.exitCode = failed.length === 0 ? 0 : 1;
