'use strict';

/*
 * MS18b task-owned test of the two literal selection rules and of the reporter's analysis (rules.cjs,
 * report.cjs), on FAKE rows and ledgers: no generation, no lock, no process. It loads the engine sources only
 * for the real `SG.fixtures.difficultyDiagnostics.mergeShards`, and reads the plan and the manifest keys
 * written by make-plan.cjs (the real 44 entries and 360 request keys).
 *   node generator/tests/artifacts/difficulty-v3/MS18b/test-select.cjs [out file]
 * Exit 0 when every case holds.
 */
const fs = require('fs');
const path = require('path');
const rules = require('./rules.cjs');
const report = require('./report.cjs');
const admission = require('./admission.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18b');
const PLAN = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'plan-recheck.json'), 'utf8'));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-keys.json'), 'utf8'));
const ENV = report.loadEnv();

const results = [];
const check = (name, ok, detail) => results.push({ name: name, ok: ok === true, detail: detail || '' });
const R5_KEYS = ['classic9/normal', 'classic9/master', 'classic9/nightmare', 'killer/hard', 'killer/expert',
  'jigsaw9/expert'];
const R9_KEYS = ['classic9/nightmare', 'diagonalX/nightmare', 'jigsaw9/nightmare'];
const clone = (x) => JSON.parse(JSON.stringify(x));

// ---- fake rows and the pure rules ------------------------------------------------------------------------
function statsOf(hitIndexes, ratings, extra) {
  const rows = ratings.map((r, i) => Object.assign({
    index: i, outcome: 'ok', generationExact: hitIndexes.indexOf(i) !== -1, scoreHit: true, shallow: false,
    fullRatings: r, workCheck: { status: 'ok' }, work: [{ localSearches: [{ capHit: null }] }],
    capHits: { shallow: 0, ratings: 0, proposals: 0 }, generationMs: 100
  }, extra && extra[i] ? extra[i] : {}));
  return rules.cellStats(rows, 12);
}
const flat = (hits, med) => statsOf(Array.from({ length: hits }, (_, i) => i), new Array(12).fill(med));
const make = (spec) => {
  const t = {};
  Object.keys(spec).forEach((setting) => {
    t[setting] = {};
    Object.keys(spec[setting]).forEach((key) => {
      const [hits, med] = spec[setting][key];
      t[setting][key] = flat(hits, med).stats;
    });
  });
  return t;
};
const cellSpec = (fn) => {
  const o = {};
  R5_KEYS.forEach((k, i) => { o[k] = fn(k, i); });
  return o;
};
const MS05R4 = {
  none: cellSpec((k, i) => [[10, 12, 2, 0, 0, 11][i], [75, 4, 1417, 512, 2250, 318][i]]),
  256: cellSpec((k, i) => [[10, 12, 2, 0, 0, 11][i], [75, 4, 1345, 512, 2250, 318][i]]),
  128: cellSpec((k, i) => [[10, 12, 1, 0, 0, 11][i], [75, 4, 1000, 512, 2250, 260][i]]),
  64: cellSpec((k, i) => [[10, 12, 0, 0, 0, 11][i], [75, 4, 616, 497, 2238, 170][i]])
};
{
  const sorted = [5, 3, 9, 1, 7, 12, 2, 8, 4, 10, 6, 11];
  check('the upper median of twelve values is the sorted index 6 (7 of 1..12), not the average 6.5',
    rules.upperMedian(sorted) === 7 && rules.upperMedian([1, 1, 1, 1, 1, 1, 9, 9, 9, 9, 9, 9]) === 9);
  const d = rules.decideCap(make(MS05R4), R5_KEYS);
  check('MS05r4 as written: 64 and 128 lose hits at classic9 nightmare, 256 reduces its median: winner 256',
    d.status === 'determined' && d.winner === '256' && d.eligible.join() === '256' &&
    d.comparisons[0].hitLossCells.join() === 'classic9/nightmare' &&
    d.comparisons[2].reductionCells.join() === 'classic9/nightmare', JSON.stringify(d.eligible));
  check('256 is the in-force value: disposition same', rules.dispositionOf('256', d) === 'same');
}
{
  const spec = clone(MS05R4);
  spec['64']['classic9/nightmare'] = [2, 600];
  spec['128']['classic9/nightmare'] = [2, 900];
  const d = rules.decideCap(make(spec), R5_KEYS);
  check('the smallest eligible finite cap wins (64 and 128 and 256 all eligible: 64)', d.winner === '64' &&
    d.eligible.join() === '64,128,256', d.eligible.join());
  check('a changed winner is an owner decision pending',
    rules.dispositionOf('256', d) === 'owner decision pending');
  const spec2 = clone(MS05R4);
  spec2['64']['classic9/nightmare'] = [0, 600];
  const d2 = rules.decideCap(make(spec2), R5_KEYS);
  check('64 with a hit loss is skipped, the next eligible (128 with its own hits kept) wins',
    d2.comparisons[0].eligible === false && d2.winner !== '64', d2.winner);
}
{
  const spec = clone(MS05R4);
  ['256', '128', '64'].forEach((s) => {
    spec[s]['classic9/nightmare'] = [spec[s]['classic9/nightmare'][0], 1417];
  });
  spec['128']['classic9/nightmare'][0] = 1;
  spec['64']['classic9/nightmare'][0] = 0;
  spec['256']['jigsaw9/expert'] = [11, 318];
  const d = rules.decideCap(make(spec), R5_KEYS);
  check('no finite cap qualifies on complete valid evidence (no strict reduction, or a hit loss): none',
    d.status === 'determined' && d.winner === 'none' && d.eligible.length === 0, JSON.stringify(d.eligible));
  check('the legitimate winner none against the in-force 256 is an owner decision pending',
    rules.dispositionOf('256', d) === 'owner decision pending');
  check('an equal median is not a strict reduction', d.comparisons[2].reductionCells.length === 0);
}
{
  // Zero-exact cells: both zero is no loss, and a work reduction there may satisfy the predicate.
  const spec = clone(MS05R4);
  ['256', '128', '64'].forEach((s) => {
    spec[s] = cellSpec((k, i) => [[10, 12, 2, 0, 0, 11][i], [75, 4, 1417, 512, 2250, 318][i]]);
  });
  spec['256']['killer/hard'] = [0, 480];
  const d = rules.decideCap(make(spec), R5_KEYS);
  check('Killer Hard 0 exact at none and at 256: no hit loss, the median reduction there makes 256 eligible',
    d.comparisons[2].hitLossCells.length === 0 && d.comparisons[2].reductionCells.join() === 'killer/hard' &&
    d.comparisons[2].eligible === true && d.eligible.join() === '256', JSON.stringify(d.comparisons[2]));
  const spec2 = clone(spec);
  spec2['64']['classic9/normal'] = [9, 1];
  const d2 = rules.decideCap(make(spec2), R5_KEYS);
  check('zero-exact cells never disqualify a cap by themselves; a loss elsewhere does',
    d2.comparisons[0].hitLossCells.join() === 'classic9/normal' && d2.comparisons[0].eligible === false);
}
{
  // Incomplete evidence: no winner, never the measured winner none.
  const t = make(MS05R4);
  delete t['256']['killer/expert'];
  const d = rules.decideCap(t, R5_KEYS);
  check('a missing (setting, cell) makes R5 undetermined: winner null, never none',
    d.status === 'undetermined' && d.winner === null && d.eligible === null &&
    d.missing.join() === '256 killer/expert', JSON.stringify(d));
  check('an undetermined choice has the disposition undetermined',
    rules.dispositionOf('256', d) === 'undetermined');
  check('a cap with a hit loss in a complete pair is still known ineligible; missing evidence is not ' +
    'determinable',
  d.comparisons[0].eligible === false && d.comparisons[1].eligible === false &&
    d.comparisons[2].eligible === null);
  const t2 = make(MS05R4);
  delete t2.none['classic9/normal'];
  const d2 = rules.decideCap(t2, R5_KEYS);
  check('a missing none cell leaves every cap undetermined for that cell', d2.status === 'undetermined' &&
    d2.comparisons.every((c) => c.perCell[0].known === false));
}
{
  // The median is of all twelve requests and all attempts, not of the exact-only cohort.
  const ratings = [3000, 3000, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const s = statsOf([0, 1], ratings);
  check('the upper median is computed from all twelve rows, not the exact-only cohort (3000, 3000)',
    s.stats.upperMedian !== 3000, String(s.stats.upperMedian));
  const sorted = ratings.slice().sort((a, b) => a - b);
  check('it is the sorted index 6 of the twelve', s.stats.upperMedian === sorted[6], String(sorted[6]));
  const withError = statsOf([], new Array(12).fill(40), [{ outcome: 'error', generationExact: false }]);
  check('an error row is a miss that stays in the twelve with its work (hits 0, errors 1, median 40)',
    withError.ok && withError.stats.errors === 1 && withError.stats.hits === 0 &&
    withError.stats.upperMedian === 40);
  const noWork = statsOf([0], new Array(12).fill(40), [null, { workCheck: { status: 'unavailable' } }]);
  check('a request whose work is unavailable has no statistics (not a zero)', noWork.ok === false &&
    /unavailable/.test(noWork.problems.join()));
  const missingRows = rules.cellStats(new Array(11).fill({}), 12);
  check('fewer than twelve rows have no statistics', missingRows.ok === false);
}
{
  const t = (h4, h6) => {
    const mk = (hits) => R9_KEYS.reduce((o, k, i) => { o[k] = flat(hits[i], 5).stats; return o; }, {});
    return { '4': mk(h4), '6': mk(h6) };
  };
  const a = rules.decideWindow(t([12, 12, 12], [2, 10, 12]), R9_KEYS);
  check('C4 36/36 against C6 24/36: C4 wins (MS07c)', a.winner === '4' && a.totals['4'] === 36 &&
    a.totals['6'] === 24 && a.tie === false && rules.dispositionOf('4', a) === 'same');
  const b = rules.decideWindow(t([0, 0, 0], [0, 0, 0]), R9_KEYS);
  check('0/36 against 0/36 is a tie: C6, a changed winner (never reconfirmed C4)', b.winner === '6' &&
    b.tie === true && rules.dispositionOf('4', b) === 'owner decision pending');
  const c = rules.decideWindow(t([11, 12, 12], [12, 12, 11]), R9_KEYS);
  check('equal totals 35 and 35 with different cells: tie, C6', c.winner === '6' && c.tie === true);
  const d = rules.decideWindow(t([10, 12, 12], [12, 12, 12]), R9_KEYS);
  check('C6 with more exact hits wins', d.winner === '6' && d.tie === false);
  const e = rules.decideWindow(t([12, 12, 11], [12, 12, 12]), R9_KEYS);
  check('C6 36/36 against C4 35/36: C6', e.winner === '6');
  const tt = t([12, 12, 12], [2, 10, 12]);
  delete tt['6']['jigsaw9/nightmare'];
  const f = rules.decideWindow(tt, R9_KEYS);
  check('a missing C6 cell: undetermined, totals of the incomplete variant are null, no winner',
    f.status === 'undetermined' && f.winner === null && f.totals['6'] === null && f.totals['4'] === 36);
}

// ---- fake ledgers through the real merge and the reporter's analysis --------------------------------------
const LABEL = admission.LABEL;
const keysOf = (name, variant, level) => MANIFEST.experiments[name].cells
  .find((c) => c.variant === variant && c.level === level).keys;
const CHECKS_PASS = {
  invariantViolations: { I1: 0, I2: 0, I3: 0, I4: 0, I5: 0, I6: 0, I7: 0 }, requestErrors: 0, checkErrors: [],
  referenceErrors: 0, pathErrors: 0, pathMismatches: 0, workUnavailable: 0, failed: false, result: 'PASS'
};

function fakeLedger(entry, rowFn, mutate) {
  const keys = keysOf(entry.experiment, entry.variant, entry.level);
  const rows = entry.requests.map((i) => Object.assign({
    variant: entry.variant, requested: entry.level, index: i, tag: keys[i].tag,
    pipelineSeed: keys[i].pipelineSeed,
    outcome: 'ok', generationExact: false, scoreHit: true, shallow: false, fullRatings: 10,
    workCheck: { status: 'ok', reason: null }, work: [{ localSearches: [{ capHit: null }] }],
    capHits: { shallow: 0, ratings: 0, proposals: 0 }, generationMs: 50, puzzleHash: 'h' + i
  }, rowFn(i)));
  const cap = entry.family === 'cap';
  const ledger = {
    schema: 1, complete: true, rows: rows, summary: { checks: clone(CHECKS_PASS) },
    meta: {
      acceptance: 'canonical-required-tier', sourceHash: PLAN.expected.sourceHash, sourceFiles: ['a'],
      toolHash: PLAN.expected.toolHash, commit: 'abcdef0123456789', dirty: true, node: PLAN.expected.node,
      machine: { cpuModel: 'fake', cpus: 16 }, argv: entry.payload.slice(1), seedBase: 20260101,
      shallowCap: cap ? entry.setting : null,
      shallowSearchRatings: cap ? (entry.setting === 'none' ? null : Number(entry.setting)) : 256,
      chainWindow: cap ? null : Number(entry.setting), chainShortMax: cap ? 4 : Number(entry.setting),
      manifest: {
        requests: entry.count, logicalRequests: 12, shard: null, count: entry.count, perCombo: null,
        quick: false, includeUnsupported: false, weights: null, bands: null, gate: false, ratingVersion: 3,
        referenceBudgetMs: 120000,
        cells: [{ variant: entry.variant, level: entry.level, requests: entry.count, from: entry.from,
          logicalTotal: 12, referenceIndexes: [0, 11], route: entry.route, unsupported: false }]
      }
    }
  };
  if (mutate) mutate(ledger, entry);
  return ledger;
}

function fakeInput(valueOf, options) {
  const o = options || {};
  const input = {
    plan: PLAN, manifest: MANIFEST, ledgers: {}, ledgerFiles: {}, readiness: {}, transcripts: {}, lockLog: [],
    ms18a: null
  };
  PLAN.entries.forEach((entry) => {
    if (o.skip && o.skip.indexOf(entry.id) !== -1) return;
    const key = entry.variant + '/' + entry.level;
    input.ledgers[entry.id] = fakeLedger(entry, (i) => valueOf(entry.family, entry.setting, key, i),
      o.mutate ? (l, e) => o.mutate(l, e) : null);
    input.ledgerFiles[entry.id] = { file: entry.json, sha256: 'AA' };
    input.readiness[entry.id] = {
      policy: admission.POLICY, admitted: true, ready: false, environmentLabel: LABEL,
      payloadStartedAt: '2026-11-18T20:00:00.000+07:00', payloadEndedAt: '2026-11-18T20:00:10.000+07:00',
      payloadExit: 0, payloadSeconds: 10, readinessSeconds: 7, meanBusyCores: 1, maxBusyCores: 1.5
    };
    input.transcripts[entry.id] = '$ node x\r\nSTART t\r\nDIAGNOSTICS: PASS (...)\r\nEND t\r\n' +
      'exit=0 seconds=10.5\r\n';
  });
  if (o.after) o.after(input);
  return input;
}

/** Row values from per-(family, setting, cell) [hits, median] tables: exact for the first `hits` indexes. */
const valuesFrom = (capTable, windowTable) => (family, setting, key, i) => {
  const [hits, med] = (family === 'cap' ? capTable[setting] : windowTable[setting])[key];
  return { generationExact: i < hits, fullRatings: med, shallow: i >= hits };
};
const WINDOW_OK = { 4: { 'classic9/nightmare': [12, 5], 'diagonalX/nightmare': [12, 5],
  'jigsaw9/nightmare': [12, 5] }, 6: { 'classic9/nightmare': [2, 50], 'diagonalX/nightmare': [10, 50],
  'jigsaw9/nightmare': [12, 50] } };
const specOf = (capSpec) => {
  const t = {};
  Object.keys(capSpec).forEach((s) => { t[s] = capSpec[s]; });
  return t;
};

{
  const out = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK)), ENV);
  check('reconfirmation: 360 outcomes, R5 256 and C4, both same, no owner question',
    out.coverage.recorded.total === 360 && out.R5.winner === '256' && out.C.winner === '4' &&
    out.R5.disposition === 'same' && out.C.disposition === 'same' && out.milestone === 'complete' &&
    out.decisionStatus === 'reconfirmed (256 / C4)',
    out.decisionStatus + ' ' + out.R5.winner + ' ' + out.C.winner);
  check('reconfirmation: every reporter check passes', out.failedChecks.length === 0,
    out.failedChecks.map((c) => c.label + ' ' + c.detail).join(' | '));
  check('reconfirmation: no Discord question', report.discordText(out, 'x') === null);
  const md = report.renderMarkdown(out, PLAN);
  check('the packet states the status, the 24 + 6 rows and the label',
    /reconfirmed \(256 \/ C4\)/.test(md) &&
    (md.match(/\| (64|128|256|none) \| (classic9|killer|jigsaw9) /g) || []).length >= 24 &&
    md.indexOf(LABEL) !== -1 && /### Cap 64 against none/.test(md) && /### Cap 256 against none/.test(md),
    md.slice(0, 200));
  check('the packet is CRLF only', !/(^|[^\r])\n/.test(md));
  check('the packet has no trailing whitespace', md.split('\r\n').every((l) => !/[ \t]+$/.test(l)));
  check('a complete sound run exits 0', report.exitCodeOf(out) === 0);
}
{
  // Both choices change: 64 is the smallest eligible cap; 0/36 against 0/36 is a tie, so C6.
  const capSpec = clone(MS05R4);
  capSpec['64']['classic9/nightmare'] = [2, 600];
  capSpec['128']['classic9/nightmare'] = [2, 900];
  const zero = {};
  [4, 6].forEach((s) => { zero[s] = {}; R9_KEYS.forEach((k) => { zero[s][k] = [0, 100]; }); });
  const out = report.analyse(fakeInput(valuesFrom(capSpec, zero)), ENV);
  check('changed R5 (64) and changed C (tie, 6): complete, owner decision pending for both',
    out.R5.winner === '64' && out.C.winner === '6' && out.C.tie === true && out.milestone === 'complete' &&
    out.decisionStatus === 'measurements complete; owner decision pending' &&
    out.pendingChoices.join() === 'R5,C', out.decisionStatus);
  const text = report.discordText(out, 'docs\\difficulty-v3\\evidence\\MS18b\\decision-packet.md');
  check('the Vietnamese question follows the template with the data',
    text !== null && /MS18b đã đo đủ 360 lượt\. R5: hiện tại 256; quy tắc chọn 64;/.test(text) &&
    /C4=0\/36, C6=0\/36; quy tắc chọn 6 \(hòa chọn 6\)\./.test(text) &&
    /Chưa đổi mã; GQ-final dừng chờ quyết định/.test(text) &&
    /Bằng chứng: docs\\difficulty-v3\\evidence\\MS18b\\decision-packet\.md\./.test(text) &&
    /classic9 nightmare: 1417 -> 600/.test(text), text);
  const md = report.renderMarkdown(out, PLAN);
  check('the packet names the tie as a changed winner and the stop status',
    /a tie, so C6/.test(md) && /measurements complete; owner decision pending/.test(md));
}
{
  // No finite cap qualifies: none, an owner decision pending against 256; C4 reconfirmed.
  const capSpec = clone(MS05R4);
  capSpec['256']['classic9/nightmare'] = [2, 1417];
  const out = report.analyse(fakeInput(valuesFrom(capSpec, WINDOW_OK)), ENV);
  check('no eligible cap on complete evidence: winner none, owner decision pending (C4 same)',
    out.R5.winner === 'none' && out.R5.disposition === 'owner decision pending' &&
    out.C.disposition === 'same' &&
    out.pendingChoices.join() === 'R5', out.R5.winner);
}
{
  // One entry missing: both experiments are kept apart, no winner for the incomplete one.
  const missing = 'cap-none-killer-expert-6-6';
  const out = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK), {
    skip: [missing] }), ENV);
  const slot = out.coverage.missing.find((m) => m.slot === 'cap|none|killer/expert');
  check('a missing shard: recorded below 360, the cell is incomplete with its exact indexes 6..11',
    out.coverage.recorded.total === 360 - 12 && slot && slot.indexes.join() === '6,7,8,9,10,11' &&
    out.milestone === 'incomplete', JSON.stringify(out.coverage.missing));
  check('R5 is undetermined (no winner, not none) while C stays complete and valid',
    out.R5.status === 'undetermined' && out.R5.winner === null && out.R5.disposition === 'undetermined' &&
    out.C.status === 'determined' && out.C.winner === '4', out.R5.status + ' ' + out.C.status);
  check('the status is undetermined / incomplete and no Discord question is made',
    out.decisionStatus === 'undetermined / incomplete milestone' && report.discordText(out, 'x') === null);
  check('the missing entry is not a pass',
    out.failedChecks.some((c) => /every plan entry has a ledger/.test(c.label)));
  const md = report.renderMarkdown(out, PLAN);
  check('the packet says UNDETERMINED and lists the missing evidence', /R5 result: UNDETERMINED/.test(md) &&
    /none killer\/expert/.test(md));
  check('incomplete evidence with nothing defective exits 4 (not 1)', report.exitCodeOf(out) === 4,
    String(report.exitCodeOf(out)));
}
{
  // A changed C winner stays visible although R5 is incomplete; the milestone is still incomplete.
  const zero = {};
  [4, 6].forEach((s) => { zero[s] = {}; R9_KEYS.forEach((k) => { zero[s][k] = [3, 100]; }); });
  const out = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), zero), {
    skip: ['cap-64-killer-hard'] }), ENV);
  check('a changed C winner is shown as owner decision pending although the milestone is incomplete',
    out.C.winner === '6' && out.C.disposition === 'owner decision pending' &&
    out.R5.disposition === 'undetermined' &&
    out.milestone === 'incomplete' && out.decisionStatus === 'undetermined / incomplete milestone');
  check('no Discord question without complete validated data', report.discordText(out, 'x') === null);
}
{
  // Two held attempts and no ledger: a named gap, never a pass.
  const id = 'window-6-jigsaw9-nightmare-0-1';
  const gapInput = fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK), { skip: [id], after: (input) => {
    const hold = () => ({ policy: admission.POLICY, admitted: false, ready: false, admissionHolds: ['h'],
      meanBusyCores: 2, maxBusyCores: 3 });
    input.readiness[id] = hold();
    input.readiness[id + '-admission2'] = hold();
  } });
  const out = report.analyse(gapInput, ENV);
  check('two holds without a ledger are a gap of the experiment and the milestone is incomplete',
    out.admission.gaps.join() === id && out.milestone === 'incomplete' && out.C.winner === null,
    out.admission.gaps.join());
  check('a gap after two holds exits 4 (an incomplete milestone, nothing defective)',
    report.exitCodeOf(out) === 4, String(report.exitCodeOf(out)));
}
{
  // A ledger of another setting, a request error with work, and unavailable work.
  const out = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK), {
    mutate: (ledger, entry) => {
      if (entry.id === 'cap-128-classic9-master') ledger.meta.shallowCap = '64';
    } }), ENV);
  check('a ledger that says another shallowCap is a defect: that cell is not merged, R5 undetermined',
    out.defects > 0 && out.R5.status === 'undetermined' &&
    out.cells['cap|128|classic9/master'].status === 'defect' &&
    /shallowCap 64/.test(out.cells['cap|128|classic9/master'].problems.join()),
    out.cells['cap|128|classic9/master'].problems.join());
  check('a defective ledger exits 1', report.exitCodeOf(out) === 1, String(report.exitCodeOf(out)));
  const err = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK), {
    mutate: (ledger, entry) => {
      if (entry.id === 'cap-none-classic9-normal') {
        ledger.rows[5].outcome = 'error';
        ledger.rows[5].generationExact = false;
        ledger.summary.checks.requestErrors = 1;
        ledger.summary.checks.failed = true;
        ledger.summary.checks.result = 'FAIL';
      }
    } }), ENV);
  const cell = err.cells['cap|none|classic9/normal'];
  check('a request error with its work is a miss inside the fixed twelve: valid, errors 1, not erased',
    cell.status === 'valid' && cell.stats.errors === 1 && cell.stats.errorIndexes.join() === '5' &&
    err.coverage.errorRows.length === 1 && err.coverage.recorded.total === 360, cell.status);
  const noWork = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK), {
    mutate: (ledger, entry) => {
      if (entry.id === 'cap-none-classic9-normal') {
        ledger.rows[2].workCheck = { status: 'unavailable', reason: 'x' };
        ledger.summary.checks.workUnavailable = 1;
        ledger.summary.checks.result = 'INCOMPLETE';
      }
    } }), ENV);
  check('a request whose work is unavailable is a defect (never a zero): the cell has no statistics',
    noWork.cells['cap|none|classic9/normal'].status === 'defect' && noWork.R5.winner === null);
  const dup = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK), {
    mutate: (ledger, entry) => {
      if (entry.id === 'cap-64-killer-expert-6-6') ledger.rows[0].index = 5;
    } }), ENV);
  check('a row outside its span is a merge defect: never merged, no winner',
    dup.cells['cap|64|killer/expert'].status === 'defect' && dup.R5.winner === null &&
    /outside its span/.test(dup.cells['cap|64|killer/expert'].problems.join()));
  const mixed = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK), {
    mutate: (ledger, entry) => {
      if (entry.id === 'window-6-classic9-nightmare-6-6') ledger.meta.chainShortMax = 4;
    } }), ENV);
  check('shards of mixed cutoffs never merge (chainShortMax 4 inside a C6 cell)',
    mixed.cells['window|6|classic9/nightmare'].status === 'defect' && mixed.C.winner === null);
  const src = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK), {
    mutate: (ledger, entry) => {
      if (entry.id === 'cap-256-jigsaw9-expert') ledger.meta.sourceHash = 'other';
    } }), ENV);
  check('a ledger of another source is a defect and the identity check fails', src.defects > 0 &&
    src.failedChecks.some((c) => /one source, tool and Node identity/.test(c.label)));
  const two = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK), {
    after: (input) => {
      const id = 'cap-64-classic9-normal';
      input.readiness[id + '-admission2'] = Object.assign({}, input.readiness[id], { payloadStartedAt: 'x' });
    } }), ENV);
  check('two attempts that both started the payload are not accepted (a payload is never rerun)',
    two.failedChecks.some((c) => /cap-64-classic9-normal: one executed attempt/.test(c.label)));
  check('a failed correctness check on otherwise complete data exits 1', report.exitCodeOf(two) === 1,
    String(report.exitCodeOf(two)));
}
{
  // The transcript of the attempt that started the payload is the measurement, not the held one.
  const id = 'cap-64-classic9-normal';
  const out = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK), { after: (input) => {
    input.readiness[id + '-admission2'] = input.readiness[id];
    input.readiness[id] = { policy: admission.POLICY, admitted: false, ready: false, admissionHolds: ['h'] };
    input.transcripts[id + '-admission2'] = input.transcripts[id].replace('seconds=10.5', 'seconds=77.0');
    input.transcripts[id] = '$ node x\r\nNOT STARTED: held\r\n';
  } }), ENV);
  const entry = out.entries.find((e) => e.id === id);
  check('the held attempt is not the measurement: the started attempt (admission2) is read',
    entry.executedId === id + '-admission2' && entry.transcript.processSeconds === 77 &&
    out.admission.reAsked.join() === id && out.failedChecks.length === 0, JSON.stringify(entry.transcript));
}
{
  const out = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK)), ENV);
  check('the commit list shows every distinct commit with its ledger count',
    out.commits.length === 1 && out.commits[0].ledgers === PLAN.entries.length, JSON.stringify(out.commits));
  const withTwo = report.analyse(fakeInput(valuesFrom(specOf(MS05R4), WINDOW_OK), {
    mutate: (ledger, entry) => {
      if (entry.id === 'cap-64-classic9-normal') ledger.meta.commit = 'fedcba9876543210';
    } }), ENV);
  check('two commits are both listed', withTwo.commits.length === 2);
}

const failed = results.filter((r) => !r.ok);
const lines = results.map((r) => (r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' [' + r.detail + ']'));
lines.push('');
lines.push(results.length + ' cases, ' + (results.length - failed.length) + ' pass, ' + failed.length +
  ' fail');
lines.forEach((line) => console.log(line));
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), lines.join('\r\n') + '\r\n', 'utf8');
process.exitCode = failed.length === 0 ? 0 : 1;
