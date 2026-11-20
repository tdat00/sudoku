'use strict';

/*
 * MS18c post-GQ task-owned, FILE-ONLY validation of the official merge (no generation, no solver, no
 * writes):
 *   node generator/tests/artifacts/difficulty-v3/MS18c/merge-check.cjs
 * It reads the merged record `evidence/MS18c/merge/qualification-v3.json`, the 135 promoted cell records of
 * `evidence/MS18c/qualification/`, the receipts and journals of `evidence/MS18c/runs/` and the committed
 * manifest, and reports every problem. Checked: the measured identities, `totals.invalid === 0`, the 135
 * keys exactly once, the per-request validation (no `valid:false`; every non-error outcome valid and
 * solved; exactly the 27 documented `budget.exceeded` errors, by cell), the canonical validation of every
 * merged cell, the verdict and summary of every cell against its receipt and its promoted cell record, the
 * journals (hash chains, one accepted record per cell, 140 attempts, 960 events, five eligible holds each
 * re-asked once), the headline timing bounds, the agreement of R in the journal, the receipt and the final
 * status, the removals against the v2 archive and SA2's reviewed-set digest. Exit 0 only when there is no
 * problem.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const util = require('./util.cjs');
const rules = require('./rules.cjs');
const inputs = require('./inputs.cjs');
const journal = require('./journal.cjs');

const EVIDENCE = path.join(util.REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18c');
const SA2_DIGEST = '00d611b7760cdbe435cf74c76420a49aa527c90d32c4daf496fcb02b195d308a';
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const problems = [];
const notes = [];
const check = (ok, text) => { if (!ok) problems.push(text); };
const same = (a, b) => rules.canon(a) === rules.canon(b);
const round7 = (x) => Math.round(x * 1e7) / 1e7;

const manifest = readJson(path.join(util.REPO, util.MANIFEST_PATH));
const merged = readJson(path.join(EVIDENCE, 'merge', 'qualification-v3.json'));
const lib = inputs.recordsConstants();
const id = manifest.identities;
const keys = manifest.rows.map((r) => r.key);
const cellKey = (c) => c.variant + '/' + c.level;
const cellOf = (k) => merged.cells.filter((c) => cellKey(c) === k)[0];

// ---- identities and totals ------------------------------------------------------------------------------
check(merged.engine.sources === id.source.engineSources, 'engine sources ' + merged.engine.sources);
check(merged.qualifierHash === id.tool.qualifierHash, 'qualifierHash ' + merged.qualifierHash);
check(merged.ratingVersion === 3 && merged.probe === 0 && merged.earlyStop === true, 'rating/probe/stop');
check(merged.seedBase === 20260601 && merged.guardMs === 120000, 'seed base or guard');
check(same(merged.machine, id.machine.object), 'the merged machine differs from the manifest');
check(same(merged.attemptPolicy, id.attemptPolicy.object), 'the merged attempt policy differs');
check(merged.engine.commit === 'ed2fe50c' && merged.engine.dirty === true, 'measured identity differs');
const wantTotals = { cells: 135, requests: 4313, hits: 3783, errors: 27, approximate: 503, invalid: 0,
  offered: 79, hidden: 56, stopped: 54 };
check(same(merged.totals, wantTotals), 'totals ' + JSON.stringify(merged.totals));
check(merged.totals.invalid === 0, 'totals.invalid is not 0');

// ---- keys, requests, canonical validation -----------------------------------------------------------------
const seen = new Map();
merged.cells.forEach((c) => seen.set(cellKey(c), (seen.get(cellKey(c)) || 0) + 1));
check(merged.cells.length === 135 && seen.size === 135, 'the merged record has ' + merged.cells.length);
keys.forEach((k) => check(seen.get(k) === 1, 'key ' + k + ' appears ' + (seen.get(k) || 0) + ' times'));
seen.forEach((n, k) => check(keys.indexOf(k) !== -1, 'unexpected key ' + k));
const errorsByCell = {};
let errorCount = 0;
let maxErrorMs = 0;
let invalidFlags = 0;
const counts = { hit: 0, approximate: 0, requests: 0 };
merged.cells.forEach((c) => {
  const k = cellKey(c);
  const row = manifest.rows.filter((r) => r.key === k)[0];
  check(Boolean(row), 'no manifest row for ' + k);
  check(c.summary.n === c.requests.length, k + ' summary.n ' + c.summary.n + ' vs ' + c.requests.length);
  const indexes = new Set();
  c.requests.forEach((q, i) => {
    counts.requests++;
    // The first round is indexes 0..39 in order; a second round records its own indexes (40..99).
    const inOrder = i < 40 ? q.index === i : q.index >= 40 && q.index < 100;
    check(q.key === k && inOrder, k + ' request ' + i + ' key/index');
    check(!indexes.has(q.index), k + ' request index ' + q.index + ' twice');
    indexes.add(q.index);
    check(q.seed === lib.seedFor(k + '/' + q.index), k + ' request ' + i + ' seed');
    if (q.valid === false) invalidFlags++;
    if (q.error) {
      errorCount++;
      errorsByCell[k] = (errorsByCell[k] || 0) + 1;
      maxErrorMs = Math.max(maxErrorMs, q.ms);
      check(q.error === 'budget.exceeded' && q.hit === false, k + ' request ' + i + ' error ' + q.error);
    } else {
      check(q.valid === true && q.solved === true, k + ' request ' + i + ' is not valid and solved');
      if (q.hit) counts.hit++;
      if (q.approximate) counts.approximate++;
    }
  });
  let found = [];
  try {
    found = Array.from(lib.checkCell(c, { cellCount: row.cellCount, attempts: row.attempts, jobs: 4,
      earlyStop: true }));
  } catch (err) {
    found = ['threw: ' + err.message];
  }
  found.forEach((p) => problems.push('canonical ' + k + ': ' + p));
  check(c.cellCount === row.cellCount && c.attempts === row.attempts, k + ' cellCount/attempts premise');
});
check(invalidFlags === 0, invalidFlags + ' requests with valid:false');
check(errorCount === 27, errorCount + ' error outcomes, not 27');
const wantErrors = { 'mega16/hell1': 9, 'samurai/hell1': 9, 'sohei/hell1': 6, 'greaterThan/hell1': 2,
  'samurai/nightmare': 1 };
check(same(errorsByCell, wantErrors), 'errors by cell ' + JSON.stringify(errorsByCell));
check(maxErrorMs < 130000 && Math.abs(maxErrorMs - 120051.7349) < 1e-6, 'max error ms ' + maxErrorMs);
check(counts.hit === 3783 && counts.approximate === 503 && counts.requests === 4313, 'outcome counts');
notes.push('requests ' + counts.requests + ', exact hits ' + counts.hit + ', approximate ' +
  counts.approximate + ', errors ' + errorCount + ' ' + JSON.stringify(errorsByCell) +
  ', max error ms ' + maxErrorMs);

// ---- receipts, promoted cells, journals -----------------------------------------------------------------
const digestLines = [];
const metrics = [];
const second = [];
let attempts = 0;
let events = 0;
let holds = 0;
let nullHeartbeatR = 0;
keys.forEach((k) => {
  const name = util.cellDirName(k);
  const dir = path.join(EVIDENCE, 'runs', name);
  const receiptFile = path.join(dir, 'acceptance-receipt.json');
  const canonFile = path.join(EVIDENCE, 'qualification', name + '.json');
  const receipt = readJson(receiptFile);
  const mergedCell = cellOf(k);
  const shard = readJson(canonFile);
  check(receipt.cell === k && receipt.verdict === 'accepted', k + ' receipt cell/verdict');
  check(receipt.monitor.proceed === true && receipt.leftover === false && receipt.tExpired === false &&
    receipt.fault === false && receipt.supervisorLost === false && receipt.launcherExit === 0,
  k + ' receipt flags');
  check(same(receipt.summary, mergedCell.summary), k + ' receipt summary differs from the merged cell');
  check(same(shard.cells[0], mergedCell), k + ' promoted cell record differs from the merged cell');
  const canonHash = sha256(fs.readFileSync(canonFile));
  check(receipt.canonical.json.sha256.toLowerCase() === canonHash &&
    receipt.original.json.sha256.toLowerCase() === canonHash, k + ' canonical/original hash');
  const read = journal.readJournal(path.join(dir, 'journal.jsonl'));
  const state = journal.reduce(read.events);
  check(read.problems.length === 0 && state.problems.length === 0,
    k + ' journal: ' + read.problems.concat(state.problems).slice(0, 2).join('; '));
  check(state.complete && state.complete.accepted === true && !state.permanentGap && !state.recoveryClaimed,
    k + ' journal state');
  const begins = read.events.filter((e) => e.type === 'admission-begin');
  const holdEvents = read.events.filter((e) => e.type === 'admission-hold');
  attempts += begins.length;
  events += read.events.length;
  holds += holdEvents.length;
  check(begins.every((b) => b.slot === 1) && begins.length === 1 + holdEvents.length, k + ' attempts');
  holdEvents.forEach((h) => check(h.eligible === true && h.kind === 'additional-consumer', k + ' hold'));
  const created = read.events.filter((e) => e.type === 'qualifier-created')[0];
  const attemptDir = path.join(dir, 'payload-' + receipt.slot, 'admission-' + receipt.ordinal);
  const final = readJson(path.join(attemptDir, 'status.json'));
  const rFinal = final.post.monitor.metrics.rSeconds;
  check(created.rSeconds === receipt.rSeconds && rFinal === receipt.rSeconds, k + ' R differs by source');
  if (final.clocks.rSeconds === null) nullHeartbeatR++;
  const m = receipt.monitor.metrics;
  metrics.push({ k: k, r: m.rSeconds, w: m.wSeconds, wq: m.wMinusQ, qs: m.qMinusS });
  if (m.secondRoundRan) second.push(k + ' ' + m.requests);
  const tip = read.events[read.events.length - 1].hash;
  digestLines.push([k, canonHash, sha256(fs.readFileSync(receiptFile)), tip].join('\t') + '\n');
});
const shape = [attempts, events, holds].join('/');
check(attempts === 140 && events === 960 && holds === 5, 'attempts/events/holds ' + shape);
check(nullHeartbeatR === 53, nullHeartbeatR + ' final status files with a null heartbeat R, not 53');
const digest = sha256(Buffer.from(digestLines.join(''), 'utf8'));
check(digest === SA2_DIGEST, 'reviewed-set digest ' + digest);

// ---- headline timing bounds -------------------------------------------------------------------------------
const maxR = Math.max(...metrics.map((m) => m.r));
const minSlack = Math.min(...metrics.map((m) => m.wq - m.r));
const maxQS = Math.max(...metrics.map((m) => m.qs));
const wq = metrics.map((m) => m.wq);
const maxW = metrics.reduce((a, m) => (m.w > a.w ? m : a), metrics[0]);
const sumW = metrics.reduce((s, m) => s + m.w, 0);
check(round7(maxR) === 7.8444534, 'max R ' + maxR);
check(round7(minSlack) === 0.1795489, 'min W-Q-R ' + minSlack);
check(round7(maxQS) === 1.0731562, 'max Q-S ' + maxQS);
check(round7(Math.min(...wq)) === 7.3844708 && round7(Math.max(...wq)) === 8.034013, 'W-Q range');
check(round7(maxW.w) === 368.08897 && maxW.k === 'samurai/hell1', 'max W ' + maxW.w + ' ' + maxW.k);
check(Math.abs(sumW - 6760.276141) < 1e-5, 'sum W ' + sumW);
check(metrics.every((m) => m.r <= 45), 'an R above 45 s');
const wantSecond = ['flower/nightmare 50', 'hyper/expert 53', 'wordoku/normal 46'];
check(same(second.slice().sort(), wantSecond), 'second rounds ' + second);
notes.push('R max ' + maxR + ', min W-Q-R ' + minSlack + ', Q-S max ' + maxQS);
notes.push('W-Q ' + Math.min(...wq) + '..' + Math.max(...wq) + ', W max ' + maxW.w + ' (' + maxW.k +
  '), W sum ' + sumW + ', second rounds ' + second.join('; '));
notes.push('SA2 reviewed-set digest ' + digest);

// ---- offers, support, removals against the v2 archive ----------------------------------------------------
const offered = merged.cells.filter((c) => c.summary.verdict === 'offered').map(cellKey);
check(offered.length === 79, offered.length + ' offered');
check(merged.cells.filter((c) => c.summary.verdict === 'hidden').length === 56, 'hidden count');
let supportTotal = 0;
Object.keys(merged.support).forEach((v) => {
  supportTotal += merged.support[v].length;
  const own = merged.cells.filter((c) => c.variant === v && c.summary.verdict === 'offered')
    .map((c) => c.level);
  check(same(own, merged.support[v]), 'support of ' + v + ' differs from the offered verdicts');
});
check(supportTotal === 79 && Object.keys(merged.support).length === 15, 'support lists');
const v2Text = fs.readFileSync(path.join(util.REPO, 'docs', 'difficulty-v3', 'qualification-v2.md'), 'utf8');
const v2Offered = [];
v2Text.split(/\r?\n/).forEach((line) => {
  const m = /^\| (\w+) \| (\w+) \| \d+ \|.*\| (offered|hidden[^|]*) \|$/.exec(line);
  if (m && m[3] === 'offered') v2Offered.push(m[1] + '/' + m[2]);
});
const removed = v2Offered.filter((k) => offered.indexOf(k) === -1);
const added = offered.filter((k) => v2Offered.indexOf(k) === -1);
check(v2Offered.length === 118 && removed.length === 39 && added.length === 0,
  'v2 offers ' + v2Offered.length + ', removed ' + removed.length + ', added ' + added.length);
notes.push('v2 offers ' + v2Offered.length + ' -> removed ' + removed.length + ': ' + removed.join(', '));
['killer/hard', 'killer/expert', 'greaterThan/normal', 'diagonalX/expert'].forEach((k) => {
  const s = cellOf(k).summary;
  notes.push(k + ': n ' + s.n + ', hits ' + s.hits + ', p95 ' + s.p95 + ' ms, ' + s.verdict +
    ' (stopped: ' + s.stopped + ')');
});
const gt = cellOf('greaterThan/normal').summary;
const dx = cellOf('diagonalX/expert').summary;
check(gt.hits === 40 && gt.p95 === 10192.4051, 'Greater-Than Normal numbers');
check(dx.hits === 37 && dx.p95 === 11795.9214, 'diagonalX Expert numbers');

// ---- the derived log (a convenience copy of the orchestrator's TSV, never an authority) ----------
const tsvFile = path.join(EVIDENCE, 'gq-cell-log.tsv');
if (fs.existsSync(tsvFile)) {
  const bytes = fs.readFileSync(tsvFile);
  check(sha256(bytes) === '09b83de1b174ac5f9e7504bd1b03ef5bd9961d96063d156a99a20add05d98148' &&
    bytes.length === 26231, 'the derived log is not the orchestrator\'s moved file');
  const rows = bytes.toString('utf8').split('\r\n').filter((l) => l !== '').slice(1)
    .map((l) => l.split('\t'));
  check(rows.length === 135, 'the derived log has ' + rows.length + ' rows');
  rows.forEach((f, i) => {
    const k = keys[i];
    const s = cellOf(k).summary;
    const receipt = readJson(path.join(EVIDENCE, 'runs', util.cellDirName(k), 'acceptance-receipt.json'));
    const m = receipt.monitor.metrics;
    const near = (text, x) => {
      const digits = text.indexOf('.') === -1 ? 0 : text.split('.')[1].length;
      return Math.abs(Number(text) - x) <= 0.5 * Math.pow(10, -digits) + 1e-9;
    };
    check(Number(f[0]) === i && f[1] === k, 'derived log row ' + i + ' is ' + f[1]);
    check(Number(f[3]) === receipt.slot && Number(f[4]) === receipt.ordinal && f[5] === '0', k + ' log slot');
    check(f[6] === s.verdict && f[7] === (s.stopped || '') && Number(f[8]) === s.n, k + ' log verdict');
    check(near(f[11], m.rSeconds) && near(f[12], m.qMinusS) && near(f[13], m.wSeconds) &&
      near(f[14], m.wMinusQ), k + ' log times');
  });
}

notes.forEach((n) => console.log('NOTE ' + n));
problems.slice(0, 60).forEach((p) => console.log('PROBLEM ' + p));
console.log(problems.length === 0 ? 'OK: no problem in ' + keys.length + ' cells' :
  problems.length + ' problems');
process.exitCode = problems.length === 0 ? 0 : 1;
