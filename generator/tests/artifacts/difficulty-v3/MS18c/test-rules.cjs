'use strict';

/*
 * MS18c Stage 1 task-owned FAKE-DATA tests of rules.cjs: no solver, no generator, no qualifier, no payload,
 * no file written. They cover the three classes and their rounding, the 135-key completeness and the
 * 18 / 63 / 54 split, invalid premises, the structural slow-count cases (also by simulating adversarial fake
 * durations), signed residuals and timing/record failures of the reference monitor, and that nothing built
 * here carries an approval. The existing pure records helper (SG.fixtures.qualificationRecords) is loaded
 * only to build and check fake cell records.
 *   node generator/tests/artifacts/difficulty-v3/MS18c/test-rules.cjs
 * Exit code 0 when every test passes.
 */
const assert = require('assert');
const rules = require('./rules.cjs');
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
const throwsRange = (fn) => assert.throws(fn, RangeError);

const BOARDS = {
  classic4: 16, classic6: 36, classic9: 81, mega12: 144, mega16: 256, diagonalX: 81, hyper: 81, jigsaw9: 81,
  killer: 81, greaterThan: 81, samurai: 369, sohei: 288, butterfly: 144, flower: 189, wordoku: 81
};
const boards = {};
Object.keys(BOARDS).forEach((id) => { boards[id] = { cellCount: BOARDS[id], digits: 9 }; });
const EXPANDED = {
  source: { engineSources: '0123456789abcdef' }, tool: { qualifierHash: 'a'.repeat(64) },
  attemptPolicy: { digest: 'b'.repeat(64) }, node: { version: 'v26.13.0' },
  machine: { digest: 'c'.repeat(64) }
};
const fakeDoc = () => rules.buildDocument(boards, EXPANDED, { head: 'fake' });
const IDS = rules.idsOf(EXPANDED);

// ---------------------------------------------------------------------------------------------------------
// Classes, rounding, outer envelope
// ---------------------------------------------------------------------------------------------------------

test('the derived P/A/T/O of the three classes equal the brief table', () => {
  [2, 10, 30].forEach((b) => {
    const e = rules.envelopeOf(b);
    assert.strictEqual(e.G, 141);
    assert.strictEqual(e.F, b + 11);
    assert.strictEqual(e.P, 60 + 6 * 141 + 65 * (b + 11));
    ['P', 'A', 'T', 'O'].forEach((n) => assert.strictEqual(e[n], rules.BRIEF_TABLE[b][n], b + ' ' + n));
  });
  assert.deepStrictEqual(rules.envelopeOf(2), { b: 2, H: 60, D: 10, V: 10, epsilon: 1, G: 141, F: 13,
    P: 1751, A: 1770, T: 2220, O: 4920 });
});

test('R30 rounds up to a multiple of 30 in exact integer arithmetic', () => {
  const cases = [[0, 0], [1, 30], [29, 30], [30, 30], [31, 60], [1751, 1770], [2271, 2280], [3571, 3600]];
  cases.forEach(([x, want]) => assert.strictEqual(rules.roundUp30(x), want, 'R30(' + x + ')'));
  // T = R30(1.25 A) = R30(5A/4): 2212.5 -> 2220, an exact 2850 stays 2850, 4500 stays 4500, 37.5 -> 60.
  assert.strictEqual(rules.roundUp30(5 * 1770, 4), 2220);
  assert.strictEqual(rules.roundUp30(5 * 2280, 4), 2850);
  assert.strictEqual(rules.roundUp30(5 * 3600, 4), 4500);
  assert.strictEqual(rules.roundUp30(5 * 30, 4), 60);
  throwsRange(() => rules.roundUp30(-1));
  throwsRange(() => rules.roundUp30(1.5));
  throwsRange(() => rules.roundUp30(10, 0));
});

test('A and T are multiples of 30, O = T + 2700, and no class takes an outer cap', () => {
  assert.strictEqual(rules.OUTER_EXTRA, 2700);
  [2, 10, 30].forEach((b) => {
    const e = rules.envelopeOf(b);
    assert.strictEqual(e.A % 30, 0);
    assert.strictEqual(e.T % 30, 0);
    assert.strictEqual(e.O, e.T + 2700);
    assert.ok(e.P <= e.A && e.A < e.P + 30 && e.T >= 1.25 * e.A && e.T < 1.25 * e.A + 30);
    assert.ok(e.A < rules.OUTER_CAPS.A && e.T < rules.OUTER_CAPS.T && e.O <= 7200);
  });
});

test('a board budget outside 2 / 10 / 30 has no class', () => {
  [0, 1, 3, 5, 11, 31, 60, '10', NaN, null, undefined, 2.5].forEach((b) => {
    throwsRange(() => rules.envelopeOf(b));
  });
});

test('board size gives the budget class and the default attempts at every boundary', () => {
  [[1, 2], [36, 2], [37, 10], [81, 10], [82, 30], [441, 30]].forEach(([n, b]) => {
    assert.strictEqual(rules.budgetSecondsOf(n), b, n + ' cells');
  });
  [[1, 8], [81, 8], [82, 4], [144, 4], [145, 2], [369, 2]].forEach(([n, a]) => {
    assert.strictEqual(rules.defaultAttemptsOf(n), a, n + ' cells');
  });
  [0, -1, 1.5, '81', NaN, null, undefined].forEach((n) => {
    throwsRange(() => rules.budgetSecondsOf(n));
    throwsRange(() => rules.defaultAttemptsOf(n));
  });
});

// ---------------------------------------------------------------------------------------------------------
// 135 rows
// ---------------------------------------------------------------------------------------------------------

test('fake boards give 135 unique keys in manifest order, 18 / 63 / 54, no problem', () => {
  const doc = fakeDoc();
  assert.strictEqual(doc.rows.length, 135);
  assert.deepStrictEqual(doc.rows.map((r) => r.key), rules.expectedKeys());
  assert.strictEqual(new Set(doc.rows.map((r) => r.key)).size, 135);
  assert.deepStrictEqual(doc.table.map((c) => c.cells), [18, 63, 54]);
  assert.deepStrictEqual(rules.validateRows(doc.rows), []);
  const sums = doc.structuralSums;
  assert.deepStrictEqual([sums.cells, sums.P, sums.A, sums.T, sums.O], [135, 367425, 369900, 462510, 827010]);
  doc.rows.forEach((r) => {
    assert.strictEqual(r.method, 'MS18c-GQ-structural-v1');
    assert.strictEqual(r.binding, 'awaiting Stage 2');
    assert.strictEqual(r.jobs, 4);
    assert.strictEqual(r.seedBase, 20260601);
    assert.deepStrictEqual(r.protocol, { firstSeeds: 40, moreSeeds: 60, earlyStop: 'default',
      singleCell: true, probe: 0, guardMs: 120000, explicitMaxAttempts: false });
    assert.deepStrictEqual(r.blockers, []);
  });
});

test('an incomplete, duplicated, foreign, reordered or tampered row set is rejected', () => {
  const has = (rows, text) => {
    assert.ok(rules.validateRows(rows).some((p) => p.indexOf(text) !== -1), text);
  };
  const rows = () => fakeDoc().rows;
  let r = rows();
  r.splice(10, 1);
  has(r, 'has 134 rows');
  has(r, 'missing keys: classic6/easy');
  r = rows();
  r[5] = r[4];
  has(r, 'duplicate keys: classic4/expert');
  r = rows();
  r[0] = Object.assign({}, r[0], { key: 'classic5/veryEasy' });
  has(r, 'keys outside the matrix: classic5/veryEasy');
  r = rows();
  const first = r[0];
  r[0] = r[1];
  r[1] = first;
  has(r, 'not in manifest order');
  r = rows();
  r[7] = Object.assign({}, r[7], { P: r[7].P + 1 });
  has(r, 'P/A/T/O are not the table values');
  r = rows();
  r[8] = Object.assign({}, r[8], { binding: 'approved' });
  has(r, 'binding is not "awaiting Stage 2"');
  has(r, 'approval-like content');
  r = rows();
  const other = Object.assign({}, r[9].identities, { source: 'f'.repeat(16) });
  r[9] = Object.assign({}, r[9], { identities: other });
  has(r, 'identities differ');
  r = rows();
  r[20] = Object.assign({}, r[20], { board: { cellCount: 300, digits: 9 } });
  has(r, 'budget is not 30 s');
  has(rows().slice(0, 134).concat([null]), 'a row is not an object');
  assert.deepStrictEqual(rules.validateRows('nope'), ['rows is not an array']);
});

test('a board map that breaks the 18 / 63 / 54 split is rejected', () => {
  const moved = Object.assign({}, boards, { classic6: { cellCount: 37, digits: 6 } });
  const doc = rules.buildDocument(moved, EXPANDED, {});
  assert.deepStrictEqual(doc.table.map((c) => c.cells), [9, 72, 54]);
  const problems = rules.validateRows(doc.rows);
  assert.ok(problems.some((p) => p.indexOf('class 2 s has 9 cells, not 18') !== -1));
});

// ---------------------------------------------------------------------------------------------------------
// Invalid premises
// ---------------------------------------------------------------------------------------------------------

test('every invalid premise is rejected with its own reason', () => {
  const base = () => rules.premisesOf({ variant: 'classic9', level: 'normal', cellCount: 81 });
  assert.deepStrictEqual(rules.premiseProblems(base()), []);
  const cases = [
    [{ jobs: 3 }, 'jobs 3 is not 4'], [{ jobs: 8 }, 'jobs 8 is not 4'],
    [{ seedBase: 1 }, 'seed base 1'], [{ firstSeeds: 36 }, 'first-round seeds 36'],
    [{ moreSeeds: 0 }, 'second-round seeds 0'], [{ guardMs: 60000 }, 'request guard (ms) 60000'],
    [{ earlyStop: 'off' }, 'early stop off is not the default'], [{ probe: 5 }, 'probe 5 is not 0'],
    [{ cellsInPayload: 2 }, 'names 2 cells'], [{ cellsInPayload: 0 }, 'names 0 cells'],
    [{ explicitMaxAttempts: true }, 'explicit maxAttempts'], [{ attempts: 4 }, 'is not the size default 8'],
    [{ budgetSeconds: 5 }, 'no structural class for the board budget 5'],
    [{ budgetSeconds: 30 }, 'is not 10 s of a board of 81 cells'],
    [{ variant: 'classic5', key: 'classic5/normal' }, 'variant classic5 is not one of the 15'],
    [{ level: 'hell3', key: 'classic9/hell3' }, 'level hell3 is not one of the 9'],
    [{ key: 'classic9/easy' }, 'key classic9/easy is not variant/level'],
    [{ cellCount: 0 }, 'cellCount 0 is not a whole number'],
    [{ cellCount: '81' }, 'cellCount 81 is not a whole']
  ];
  cases.forEach(([change, text]) => {
    const found = rules.premiseProblems(Object.assign(base(), change));
    assert.ok(found.some((p) => p.indexOf(text) !== -1), text + ' in ' + JSON.stringify(found));
  });
  assert.deepStrictEqual(rules.premiseProblems(null), ['premises are not an object']);
});

test('a cell or identity that cannot be bound keeps blockers and no numbers', () => {
  const bad = rules.rowOf({ variant: 'classic9', level: 'normal', cellCount: 0, digits: 9 }, IDS);
  assert.ok(bad.blockers.length > 0);
  assert.deepStrictEqual([bad.P, bad.A, bad.T, bad.O, bad.constants, bad.identities],
    [null, null, null, null, null, null]);
  assert.strictEqual(bad.binding, 'awaiting Stage 2');
  const unknown = rules.rowOf({ variant: 'classic9', level: 'normal', cellCount: 81, digits: 9 },
    { source: null, tool: 'zz', attemptPolicy: undefined, node: '26', machine: 'c'.repeat(63) });
  assert.strictEqual(unknown.blockers.length, 5);
  assert.strictEqual(unknown.P, null);
  const rows = fakeDoc().rows;
  rows[3] = bad;
  assert.ok(rules.validateRows(rows).some((p) => p.indexOf('is blocked') !== -1));
  assert.deepStrictEqual(rules.identityProblems(null), ['identities are not an object']);
});

// ---------------------------------------------------------------------------------------------------------
// Structural slow-count cases
// ---------------------------------------------------------------------------------------------------------

test('the counting bounds never exceed 6G + 65F; worst case k = 1; k = 0 gives 6G + 64F', () => {
  [2, 10, 30].forEach((b) => {
    const e = rules.envelopeOf(b);
    const bounds = rules.structuralBounds(b);
    const cap = 6 * e.G + 65 * e.F;
    assert.strictEqual(e.P - e.H, cap);
    assert.ok(bounds.firstRoundStop <= cap, 'first-round stop');
    assert.strictEqual(bounds.firstRoundStop, 3 * e.G + 7.75 * e.F);
    assert.strictEqual(bounds.secondRound[0].seconds, 6 * e.G + 64 * e.F);
    assert.strictEqual(bounds.secondRound[1].seconds, 6 * e.G + 64.75 * e.F);
    bounds.secondRound.forEach((s) => {
      assert.ok(s.seconds <= cap, 'k=' + s.k);
      assert.ok(s.seconds <= bounds.secondRound[1].seconds + 1e-9, 'k=' + s.k + ' is not above k=1');
    });
    for (let k = 1; k <= 5; k++) {
      const formula = (6.75 - 0.75 * k) * e.G + (64 + 0.75 * k) * e.F;
      assert.ok(Math.abs(bounds.secondRound[k].seconds - formula) < 1e-9, 'brief formula k=' + k);
    }
  });
});

const slowMs = 130000;
function fakeRequests(b, firstPattern, secondCount, secondSlow) {
  const fast = b * 1000;
  const requests = [];
  firstPattern.forEach((slow, i) => requests.push({ index: i, ms: slow ? slowMs : fast }));
  for (let i = 0; i < secondCount; i++) requests.push({ index: 40 + i, ms: i < secondSlow ? slowMs : fast });
  return requests;
}
const pattern = (n, k, where) => {
  const flags = new Array(n).fill(false);
  for (let i = 0; i < k; i++) {
    flags[where === 'front' ? i : where === 'back' ? n - 1 - i : Math.floor((i * n) / Math.max(k, 1))] = true;
  }
  return flags;
};

test('simulated worst-case durations stay within the generation-only bounds of the structure', () => {
  [2, 10, 30].forEach((b) => {
    const bound = (6 * (120 + 10) + 65 * b) * 1000;
    ['front', 'back', 'spread'].forEach((where) => {
      for (let k = 0; k <= 5; k++) {
        const s = rules.simulate(fakeRequests(b, pattern(40, k, where), 60, 6 - k), 4, 40);
        assert.ok(s.totalMs <= bound, 'b=' + b + ' k=' + k + ' ' + where + ': ' + s.totalMs + ' > ' + bound);
      }
      // A first-round stop: nine slow among at most forty outcomes, no second round.
      const stop = rules.simulate(fakeRequests(b, pattern(40, 9, where), 0, 0), 4, 40);
      assert.ok(stop.totalMs <= (3 * 130 + 7.75 * b) * 1000, 'first-round stop b=' + b + ' ' + where);
    });
  });
  // Four workers, all ready at once: 40 equal requests take exactly 10 rounds; the second round is serial.
  const equal = new Array(40).fill(false);
  assert.strictEqual(rules.simulate(fakeRequests(2, equal, 0, 0), 4, 40).totalMs, 20000);
  const withSecond = rules.simulate(fakeRequests(2, equal, 3, 0), 4, 40);
  assert.deepStrictEqual([withSecond.firstMs, withSecond.secondMs, withSecond.totalMs],
    [20000, 6000, 26000]);
});

// A fake qualifier cell record and the instants that give a chosen residual (all in whole milliseconds).
const START = '2026-11-20T01:00:00.000Z';
const iso = (ms) => new Date(Date.parse(START) + ms).toISOString();
function monitor(b, requests, stopped, options) {
  const o = Object.assign({ qMinusS: 0.5, wMinusQ: 2 }, options);
  const sMs = rules.simulate(requests, 4, 40).totalMs;
  const qMs = Math.round(sMs + o.qMinusS * 1000);
  const w = o.w !== undefined ? o.w : (qMs + Math.round(o.wMinusQ * 1000)) / 1000;
  return rules.evaluateMonitor({
    envelope: rules.envelopeOf(b),
    cell: { requests: requests, summary: { stopped: stopped }, seconds: 12345 },
    started: START, finished: iso(qMs), wSeconds: w, validate: o.validate
  });
}
const fastFirst = (n, slowIdx, b) => Array.from({ length: n }, (_, i) => ({ index: i,
  ms: slowIdx.indexOf(i) !== -1 ? slowMs : b * 1000 }));
const breached = (result, text) => {
  const found = result.breaches.some((p) => p.indexOf(text) !== -1);
  assert.ok(!result.proceed && found, text + ' in ' + JSON.stringify(result.breaches));
};

test('monitor slow counts: <= 5 with no stop, <= 9 at a first-round stop, <= 6 if round 2 ran', () => {
  const b = 10;
  assert.ok(monitor(b, fastFirst(40, [0, 1, 2, 3, 4], b), null).proceed);
  breached(monitor(b, fastFirst(40, [0, 1, 2, 3, 4, 5], b), null), '6 slow outcomes, above 5 (no stop)');
  assert.ok(monitor(b, fastFirst(30, [0, 1, 2, 3, 4, 5, 6, 7, 8], b), 'time').proceed);
  breached(monitor(b, fastFirst(30, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], b), 'time'),
    '10 slow outcomes, above 9 (first-round stop)');
  const round2 = (firstSlow, secondSlow) => fakeRequests(b, pattern(40, firstSlow, 'front'), 60, secondSlow);
  assert.ok(monitor(b, round2(5, 1), 'time').proceed);
  breached(monitor(b, round2(5, 2), 'time'), '7 slow outcomes, above 6 (stop after round 2 ran)');
  breached(monitor(b, round2(6, 0), 'time'), '6 slow outcomes in round 1 before the expansion, above 5');
  assert.ok(monitor(b, round2(3, 2), null).proceed);
  breached(monitor(b, round2(3, 3), null), '6 slow outcomes, above 5 (no stop)');
});

test('a request is slow only above its budget; over 130000 ms is a breach whatever its outcome', () => {
  const b = 2;
  const edge = (ms) => [{ index: 0, ms: ms }].concat(
    Array.from({ length: 39 }, (_, i) => ({ index: i + 1, ms: 100 })));
  assert.strictEqual(monitor(b, edge(2000), null).metrics.slowTotal, 0);
  assert.strictEqual(monitor(b, edge(2000.001), null).metrics.slowTotal, 1);
  assert.ok(monitor(b, edge(130000), null).proceed);
  breached(monitor(b, edge(130000.001), null), 'request ms 130000.001 is above 130000');
  const errored = edge(131000);
  errored[0].error = 'timeout';
  breached(monitor(b, errored, null), 'above 130000 (successful or errored alike)');
});

// ---------------------------------------------------------------------------------------------------------
// Signed residuals and timing failures
// ---------------------------------------------------------------------------------------------------------

const clean = (b) => fastFirst(40, [], b);

test('Q-S <= 11 s, W-Q <= 60 s and W <= A hold exactly at their limits and fail just above', () => {
  const b = 2;
  const r = monitor(b, clean(b), null, { qMinusS: 11, wMinusQ: 60 });
  assert.ok(r.proceed, JSON.stringify(r.breaches));
  assert.strictEqual(r.metrics.qMinusS, 11);
  assert.strictEqual(r.metrics.wMinusQ, 60);
  breached(monitor(b, clean(b), null, { qMinusS: 11.001 }), 'Q-S 11.001 s is above 11 s');
  breached(monitor(b, clean(b), null, { wMinusQ: 60.001 }), 'W-Q 60.001');
  const a = rules.envelopeOf(b).A;
  const atA = monitor(b, clean(b), null, { w: a, qMinusS: 0, wMinusQ: 0 });
  assert.ok(atA.breaches.every((x) => x.indexOf('above A') === -1));
  breached(monitor(b, clean(b), null, { w: a + 0.001 }), 'above A 1770');
  const all = monitor(b, clean(b), null, { qMinusS: 12, wMinusQ: 61, w: a + 1 });
  assert.strictEqual(all.breaches.length, 3);
});

test('negative residuals are kept exactly as recorded, never clamped, and do not fail a check', () => {
  const b = 10;
  const r = monitor(b, clean(b), null, { qMinusS: -7.25, wMinusQ: -0.5 });
  assert.ok(r.proceed, JSON.stringify(r.breaches));
  assert.strictEqual(r.metrics.qMinusS, -7.25);
  assert.strictEqual(r.metrics.wMinusQ, -0.5);
  assert.strictEqual(r.metrics.qSeconds, r.metrics.sSeconds - 7.25);
  // The rounded `seconds` of the record (12345 in these fakes) is never the Q of the monitor.
  assert.notStrictEqual(r.metrics.qSeconds, 12345);
  assert.deepStrictEqual(rules.approvalOffences(r), []);
});

test('invalid timing or record data is rejected, not clamped, and stops the next cell', () => {
  const b = 10;
  const okRequests = clean(b);
  const withRequest = (patch) => okRequests.map((r, i) => (i === 3 ? Object.assign({}, r, patch) : r));
  const cellOf = (requests) => ({ requests: requests, summary: { stopped: null } });
  const run = (args) => rules.evaluateMonitor(Object.assign({ envelope: rules.envelopeOf(b),
    cell: cellOf(okRequests), started: START, finished: iso(45000), wSeconds: 46 }, args));
  assert.ok(run({}).proceed);
  const bad = [
    [{ cell: cellOf(withRequest({ ms: NaN })) }, 'ms NaN'],
    [{ cell: cellOf(withRequest({ ms: Infinity })) }, 'ms Infinity'],
    [{ cell: cellOf(withRequest({ ms: -1 })) }, 'ms -1'],
    [{ cell: cellOf(withRequest({ ms: '5' })) }, 'ms 5'],
    [{ cell: cellOf(withRequest({ ms: null })) }, 'ms null'],
    [{ cell: cellOf(withRequest({ index: 1.5 })) }, 'no whole index'],
    [{ cell: cellOf([]) }, 'has no requests'],
    [{ cell: { summary: { stopped: null } } }, 'has no requests'],
    [{ cell: { requests: okRequests } }, 'has no summary'],
    [{ cell: { requests: okRequests, summary: { stopped: 'incomplete' } } }, 'not a completed record'],
    [{ cell: { requests: okRequests, summary: {} } }, 'not a completed record'],
    [{ started: undefined }, 'not ISO instants'], [{ started: '2026-11-20 01:00:00' }, 'not ISO instants'],
    [{ finished: 'soon' }, 'not ISO instants'], [{ finished: iso(-1) }, 'finished is before started'],
    [{ wSeconds: NaN }, 'W is not a finite'], [{ wSeconds: -0.001 }, 'W is not a finite'],
    [{ wSeconds: '46' }, 'W is not a finite'], [{ wSeconds: undefined }, 'W is not a finite'],
    [{ validate: () => ['seed 1 is not the derived 2'] }, 'record: seed 1 is not the derived 2']
  ];
  bad.forEach(([change, text]) => {
    const r = run(change);
    assert.ok(!r.proceed && r.metrics === null && r.invalid.some((p) => p.indexOf(text) !== -1),
      text + ' in ' + JSON.stringify(r.invalid));
  });
});

// ---------------------------------------------------------------------------------------------------------
// The existing records helper, on fake records only
// ---------------------------------------------------------------------------------------------------------

function libCell(lib, variant, level, cellCount, outcomes, stopped) {
  const key = variant + '/' + level;
  const requests = outcomes.map((o, i) => ({ key: key, index: i, seed: lib.seedFor(key + '/' + i), ms: o.ms,
    hit: o.hit, valid: true, solved: true, approximate: false, exact: o.hit, achieved: level, score: 1 }));
  const budget = lib.budgetOf(cellCount);
  return { variant: variant, level: level, cellCount: cellCount, budget: budget, attempts: 8,
    summary: lib.decide({ done: requests, budget: budget, stopped: stopped }, false), requests: requests };
}

test('the monitor accepts a record the existing cell checks accept and flags one they reject', () => {
  const lib = inputs.recordsConstants();
  const expect = { cellCount: 16, attempts: 8, jobs: 4, earlyStop: true };
  // The helper runs in another realm: its arrays are copied before they are compared.
  const validate = (cell) => Array.from(lib.checkCell(cell, expect));
  const hits = (n) => Array.from({ length: n }, () => ({ ms: 100, hit: true }));
  const good = libCell(lib, 'classic4', 'veryEasy', 16, hits(40), null);
  assert.deepStrictEqual(validate(good), []);
  const fake = (cell, wMinus) => {
    const qMs = Math.round(rules.simulate(cell.requests, 4, 40).totalMs) + 500;
    return rules.evaluateMonitor({ envelope: rules.envelopeOf(2), cell: cell, started: START,
      finished: iso(qMs), wSeconds: qMs / 1000 + wMinus, validate: validate });
  };
  assert.ok(fake(good, 3).proceed);
  const forged = JSON.parse(JSON.stringify(good));
  forged.requests[7].seed += 1;
  const r = fake(forged, 3);
  assert.ok(!r.proceed && r.invalid.some((p) => p.indexOf('record: request #7 seed') !== -1),
    JSON.stringify(r));
  // A first-round time stop: six slow requests (hits all the same) end the level at once.
  const outcomes = Array.from({ length: 10 }, (_, i) => ({ ms: i < 6 ? 3000 : 100, hit: true }));
  const stopped = libCell(lib, 'classic4', 'veryEasy', 16, outcomes, 'time');
  assert.deepStrictEqual(validate(stopped), []);
  const s = fake(stopped, 3);
  assert.ok(s.proceed, JSON.stringify(s));
  assert.strictEqual(s.metrics.slowTotal, 6);
});

// ---------------------------------------------------------------------------------------------------------
// No approval, renderers
// ---------------------------------------------------------------------------------------------------------

test('the planner output carries no approval and the approval detector sees every spelling', () => {
  const doc = fakeDoc();
  assert.deepStrictEqual(rules.approvalOffences(doc), []);
  assert.ok(!/"approved"/i.test(rules.renderJson(doc)));
  assert.ok(doc.rows.every((r) => r.binding === 'awaiting Stage 2' && !('approved' in r)));
  [{ approved: true }, { approved: false }, { x: { approvals: ['SA1'] } }, { status: 'approved' },
    { status: 'Approved:true' }, [{ approvedBy: 'SA2' }]].forEach((value) => {
    assert.ok(rules.approvalOffences(value).length > 0, JSON.stringify(value));
  });
  assert.deepStrictEqual(rules.approvalOffences({ approvals: [], approval: null, authority: 'none' }), []);
});

test('the renderers are deterministic, CRLF only, without trailing blanks; the JSON reads back', () => {
  const doc = fakeDoc();
  const json = rules.renderJson(doc);
  const md = rules.renderMarkdown(doc);
  assert.strictEqual(json, rules.renderJson(fakeDoc()));
  assert.strictEqual(md, rules.renderMarkdown(fakeDoc()));
  [json, md].forEach((text) => {
    assert.ok(text.endsWith('\r\n') && !/(^|[^\r])\n/.test(text) && !/\r(?!\n)/.test(text));
    assert.ok(!/[ \t]+\r\n/.test(text));
  });
  assert.strictEqual(rules.canon(JSON.parse(json)), rules.canon(doc));
  assert.strictEqual(json.split('\r\n').filter((l) => /^ {4}\{"key":/.test(l)).length, 135);
  assert.strictEqual(md.split('\r\n').filter((l) => /^\| \d+ \| \w+\/\w+ \|/.test(l)).length, 135);
});

test('the Git guard of the planner allows only the read-only commands it uses', () => {
  const ok = [['rev-parse', 'HEAD'], ['rev-parse', '--short', 'HEAD'], ['rev-parse', 'HEAD~1'],
    ['rev-parse', '--verify', '--quiet', 'HEAD:tasks/x.json'], ['rev-parse', '3d166c79:tasks/x.md'],
    ['status', '--porcelain'], ['hash-object', 'tasks/x.md'], ['config', '--get', 'core.autocrlf'],
    ['diff', '--quiet', 'HEAD', '--', 'tasks/x.json'], ['diff', '--name-only', '3d166c79', 'HEAD']];
  ok.forEach((args) => assert.ok(inputs.readOnlyGit(args), args.join(' ')));
  const refused = [['add', '.'], ['commit', '-m', 'x'], ['checkout', 'HEAD'], ['stash'], ['push'],
    ['reset', '--hard'], ['hash-object', '-w', 'x'], ['hash-object', '--stdin'], ['hash-object', 'a', 'b'],
    ['config', 'core.autocrlf', 'false'], ['config', '--unset', 'x'], ['status'], ['status', '--short'],
    ['diff', 'HEAD'], ['diff', '--name-only', 'HEAD', '--output=x'], ['rev-parse', '--git-dir; x'],
    ['update-index', '--refresh'], ['gc'], []];
  refused.forEach((args) => assert.ok(!inputs.readOnlyGit(args), 'must refuse: ' + args.join(' ')));
  assert.throws(() => inputs.git(['add', '.']), /refused/);
});

console.log(passed + ' passed, ' + failed.length + ' failed');
if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
process.exitCode = failed.length === 0 ? 0 : 1;
