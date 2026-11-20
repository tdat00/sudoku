'use strict';

/*
 * SA1 (MS18d Phase D review), READ-ONLY: an independent recomputation of the final GP merge
 * docs/difficulty-v3/evidence/MS18d/gp/all-79/final.m1/report.json from the raw chunk ledgers. It does not
 * load merge-core.js or merge-gp.js. It reads the V2 plan (chunks and run slots), every declared slot folder
 * (ledger.json, stdout.txt, result.json) and the report, and writes only the new --out file (JSON, CRLF).
 *
 *   node docs/difficulty-v3/evidence/MS18d/phase-d/sa1-recompute/sa1-gp-recompute.cjs --out=<new file>
 *        [--root=<repository>]   (default: the repository that contains this file)
 *
 * Checks: each ledger's stdout completion marker (chunk, byte count, SHA-256 of the ledger bytes) and chunk;
 * its (base, helper manifest) pair is one of the report's declared epochs, with that epoch's plan and an
 * allowed attempt; one ledger per chunk; the report's consumed list (SHA-256, run folder, epoch); per cell,
 * the 50 original indices exactly once with finite non-negative times and one target; p50/p95/max =
 * sorted[24]/[47]/[49], mean in index order, strict p95 < target; the first request of each ledger flagged
 * when its time >= sorted[47] (ties included); holds = declared folders without a ledger; and equality of all
 * of it with the report. Exit 0: no problem; 1: a problem (listed); 2: usage error or missing input.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PLAN_REL = 'docs/difficulty-v3/evidence/MS18d/phase-c/gp-chunk-manifest-a3-v2.json';
const REPORT_REL = 'docs/difficulty-v3/evidence/MS18d/gp/all-79/final.m1/report.json';
const MARKER = /ms18d-gp-ledger-complete chunk=(\S+) bytes=(\d+) sha256=([0-9a-f]{64})/;

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const parse = (bytes) => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));

function usage(text) {
  console.error(text);
  console.error('usage: sa1-gp-recompute.cjs --out=<new file> [--root=<repository>]');
  process.exit(2);
}

const opts = { out: null, root: path.resolve(__dirname, '..', '..', '..', '..', '..', '..') };
process.argv.slice(2).forEach((arg) => {
  let m;
  if ((m = /^--out=(.+)$/.exec(arg))) opts.out = path.resolve(m[1]);
  else if ((m = /^--root=(.+)$/.exec(arg))) opts.root = path.resolve(m[1]);
  else usage('unknown argument ' + arg);
});
if (!opts.out) usage('--out is required');
if (fs.existsSync(opts.out)) usage('--out exists already (never overwritten): ' + opts.out);
const abs = (rel) => path.join(opts.root, rel.replace(/\//g, path.sep));
[PLAN_REL, REPORT_REL].forEach((rel) => { if (!fs.existsSync(abs(rel))) usage('missing input ' + rel); });

const problems = [];
const bad = (text) => problems.push(text);
const planBytes = fs.readFileSync(abs(PLAN_REL));
const reportBytes = fs.readFileSync(abs(REPORT_REL));
const plan = parse(planBytes);
const report = parse(reportBytes);
const pairs = report.epochs.pairs;

const byCell = new Map();
plan.chunks.forEach((c) => {
  if (!byCell.has(c.cell)) byCell.set(c.cell, []);
  byCell.get(c.cell).push(c);
});

const ledgerOf = new Map();
const holds = [];
plan.runSlots.filter((s) => s.role === 'chunk').forEach((s) => {
  const dir = abs(s.dir);
  if (!fs.existsSync(dir)) return;
  const ledgerFile = path.join(dir, 'ledger.json');
  if (!fs.existsSync(ledgerFile)) {
    const resultFile = path.join(dir, 'result.json');
    const result = fs.existsSync(resultFile) ? parse(fs.readFileSync(resultFile)) : {};
    holds.push({ runId: s.runId, outcome: result.outcome || null, heldAt: result.heldAt || null,
      payloadStarted: result.payloadStarted === undefined ? null : result.payloadStarted });
    return;
  }
  const bytes = fs.readFileSync(ledgerFile);
  const ledger = parse(bytes);
  const stdoutFile = path.join(dir, 'stdout.txt');
  const stdout = fs.existsSync(stdoutFile) ? fs.readFileSync(stdoutFile, 'utf8') : '';
  const m = MARKER.exec(stdout);
  if (!m || m[1] !== s.chunkId || Number(m[2]) !== bytes.length || m[3] !== sha256(bytes)) {
    bad('ledger completion marker does not bind the ledger bytes: ' + s.dir);
  }
  if (!ledger.chunk || ledger.chunk.chunkId !== s.chunkId) bad('ledger of another chunk: ' + s.dir);
  const id = ledger.identity || {};
  const pair = pairs.filter((p) => p.base === id.base && p.helperManifestSha256 === id.helperManifestSha256)[0];
  if (!pair) bad('ledger identity is not a declared epoch pair: ' + s.dir);
  else {
    if (id.planManifestSha256 !== pair.plan.manifestSha256) bad('ledger plan is not its epoch plan: ' + s.dir);
    if (pair.attempts.indexOf(s.attempt) === -1) bad('attempt not allowed in epoch ' + pair.id + ': ' + s.dir);
  }
  if (ledgerOf.has(s.chunkId)) bad('two ledgers for ' + s.chunkId);
  ledgerOf.set(s.chunkId, { dir: s.dir, runId: s.runId, sha: sha256(bytes), ledger, attempt: s.attempt,
    epoch: pair ? pair.id : null });
});
plan.chunks.filter((c) => !ledgerOf.has(c.chunkId)).forEach((c) => bad('no ledger for chunk ' + c.chunkId));

const perEpoch = {};
ledgerOf.forEach((v) => { perEpoch[v.epoch] = (perEpoch[v.epoch] || 0) + 1; });
const a3 = Array.from(ledgerOf.values()).filter((v) => v.attempt === 3).map((v) => v.runId);

const consumed = new Map(report.consumed.map((c) => [c.chunkId, c]));
let consumedEqual = 0;
ledgerOf.forEach((v, chunkId) => {
  const c = consumed.get(chunkId);
  if (!c) return bad('ledger not consumed by the report: ' + chunkId);
  if (c.ledgerSha256 !== v.sha || c.runDir !== v.dir || !c.epoch || c.epoch.id !== v.epoch) {
    return bad('report consumed entry differs: ' + chunkId);
  }
  consumedEqual++;
});
if (report.consumed.length !== ledgerOf.size) bad('report consumed ' + report.consumed.length + ' ledgers');

const reportCells = new Map(report.cells.map((c) => [c.cell, c]));
const cells = [];
let requests = 0;
let extraStarts = 0;
byCell.forEach((list, cell) => {
  const times = new Array(50).fill(null);
  const firsts = [];
  const target = list[0].target;
  if (list.some((c) => c.target !== target)) bad(cell + ': chunk targets differ');
  list.forEach((c) => {
    const entry = ledgerOf.get(c.chunkId);
    if (!entry) return;
    const reqs = entry.ledger.requests || [];
    if (reqs.length !== c.n) bad(cell + ': ' + c.chunkId + ' has ' + reqs.length + ' requests, not ' + c.n);
    if (reqs.length > 0) firsts.push(reqs[0]);
    reqs.forEach((q) => {
      if (!Number.isInteger(q.index) || q.index < c.i0 || q.index >= c.i0 + c.n) {
        return bad(cell + ': index ' + q.index + ' outside ' + c.chunkId);
      }
      if (times[q.index] !== null) bad(cell + ': index ' + q.index + ' twice');
      if (typeof q.ms !== 'number' || !Number.isFinite(q.ms) || q.ms < 0) bad(cell + ': bad time at ' + q.index);
      times[q.index] = q.ms;
    });
  });
  if (times.some((t) => t === null)) return bad(cell + ': incomplete');
  requests += 50;
  extraStarts += list.length - 1;
  const sorted = times.slice().sort((a, b) => a - b);
  const row = { cell, chunks: list.length, target, p50: sorted[24], p95: sorted[47], max: sorted[49],
    mean: times.reduce((a, b) => a + b, 0) / 50, meets: sorted[47] < target,
    coldStart: firsts.filter((q) => q.ms >= sorted[47])
      .map((q) => ({ index: q.index, ms: q.ms, extraStart: q.index > 0 })) };
  const rc = reportCells.get(cell);
  const st = rc && rc.stats;
  row.reportEqual = Boolean(rc && rc.complete === true && st && st.n === 50 && st.p50 === row.p50 &&
    st.p95 === row.p95 && st.max === row.max && st.mean === row.mean && st.target === row.target &&
    st.meets === row.meets && JSON.stringify(rc.coldStart) === JSON.stringify(row.coldStart) &&
    rc.coldStartSensitive === (row.coldStart.length > 0));
  if (!row.reportEqual) bad(cell + ': the report differs from the recomputation');
  cells.push(row);
});
if (report.cells.length !== cells.length) bad('report has ' + report.cells.length + ' cells');

const successes = cells.filter((c) => c.meets).length;
const required = plan.gate.requiredSuccesses;
const totals = { cells: byCell.size, completeCells: cells.length, requests, successes, required,
  meets: successes >= required, extraStarts, coldStartSensitiveCells: cells.filter((c) => c.coldStart.length).length,
  ledgers: ledgerOf.size, holds: holds.length };
const reportHolds = (report.totals && report.totals.holds) || [];
const holdsEqual = JSON.stringify(reportHolds.slice().sort()) === JSON.stringify(holds.map((h) => h.runId).sort());
if (!holdsEqual) bad('report holds differ from the declared folders without a ledger');
const totalsEqual = report.complete === true && report.meets === totals.meets && report.successes === successes &&
  report.required === required && report.extraColdStarts === extraStarts && report.totals.cells === totals.cells &&
  report.totals.completeCells === totals.completeCells && report.totals.requests === requests &&
  Array.isArray(report.problems) && report.problems.length === 0;
if (!totalsEqual) bad('report totals differ from the recomputation');

const misses = cells.filter((c) => !c.meets).map((c) => ({ cell: c.cell, p95: c.p95, target: c.target }));
const output = {
  schema: 1,
  kind: 'ms18d-sa1-gp-recompute',
  note: 'SA1 independent read-only recomputation from the raw ledgers, without merge-core/merge-gp; ' +
    'the report and its bound records stay the authority; SHA-256 of the bytes as read',
  inputs: { plan: { file: PLAN_REL, sha256: sha256(planBytes) },
    report: { file: REPORT_REL, sha256: sha256(reportBytes) } },
  ledgers: { count: ledgerOf.size, perEpoch, a3 },
  holds,
  totals,
  equality: { cells: cells.filter((c) => c.reportEqual).length + '/' + cells.length,
    consumed: consumedEqual + '/' + report.consumed.length, totals: totalsEqual, holds: holdsEqual },
  misses,
  cells,
  problems
};
const text = JSON.stringify(output, null, 2).replace(/\n/g, '\r\n') + '\r\n';
fs.mkdirSync(path.dirname(opts.out), { recursive: true });
fs.writeFileSync(opts.out, text, { encoding: 'utf8', flag: 'wx' });

const fmt = (o) => Object.keys(o).map((k) => k + ' ' + o[k]).join(', ');
console.log('inputs: plan ' + output.inputs.plan.sha256 + ', report ' + output.inputs.report.sha256);
console.log('ledgers ' + ledgerOf.size + ' (per epoch: ' + fmt(perEpoch) + '); a3: ' + a3.join(', '));
console.log('holds ' + holds.length + ': ' + holds.map((h) => h.runId + ' ' + h.outcome + '@' + h.heldAt).join(', '));
console.log('cells ' + totals.cells + ', complete ' + totals.completeCells + ', requests ' + requests +
  ', successes ' + successes + ' (required ' + required + '), meets ' + totals.meets + ', extra starts ' +
  extraStarts + ', cold-start-sensitive cells ' + totals.coldStartSensitiveCells);
console.log('misses ' + misses.length + ': ' + misses.map((x) => x.cell + ' p95 ' + x.p95 + ' >= ' + x.target)
  .join(' | '));
console.log('equal to the report: cells ' + output.equality.cells + ', consumed ' + output.equality.consumed +
  ', totals ' + totalsEqual + ', holds ' + holdsEqual);
problems.forEach((p) => console.log('PROBLEM ' + p));
console.log('problems ' + problems.length);
console.log('wrote ' + path.relative(opts.root, opts.out).replace(/\\/g, '/') + ' sha256 ' + sha256(Buffer.from(text)));
process.exitCode = problems.length === 0 ? 0 : 1;
