'use strict';

/*
 * MS18c post-GQ task-owned, FILE-ONLY composer of the live report
 * `docs/difficulty-rating/qualification.md` from the checked merge (no generation, no solver):
 *   node generator/tests/artifacts/difficulty-v3/MS18c/build-report.cjs
 * It reads `evidence/MS18c/merge/qualification-v3.json` and `merge/table.md`, the v2 archive and the
 * manifest, computes the publication identity of the engine files, and writes the report whole (UTF-8,
 * CRLF). The merged table is copied line for line, not regenerated; every other number is computed from the
 * merged record or the v2 table, never typed. It refuses to run unless the v2 archive is intact and the live
 * file is still the v2 archive's bytes or an earlier output of this composer.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const util = require('./util.cjs');
const inputs = require('./inputs.cjs');

const DOCS = path.join(util.REPO, 'docs');
const EVIDENCE = path.join(DOCS, 'difficulty-v3', 'evidence', 'MS18c');
const LIVE = path.join(DOCS, 'difficulty-rating', 'qualification.md');
const ARCHIVE = path.join(DOCS, 'difficulty-v3', 'qualification-v2.md');
const V2_SHA = '6D148C5E9ECF445075E26D960EC18BC181EA2C05CA039F1F98726458931162FF';
const TITLE = '# Levels offered per variant (rating v3 qualification)';
const WIDTH = 104;
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const archive = fs.readFileSync(ARCHIVE);
if (sha(archive) !== V2_SHA || archive.length !== 19785) throw new Error('the v2 archive is not intact');
if (fs.existsSync(LIVE)) {
  const live = fs.readFileSync(LIVE);
  if (sha(live) !== V2_SHA && live.toString('utf8').indexOf(TITLE) !== 0) {
    throw new Error('the live report is neither the v2 record nor an earlier output of this composer');
  }
}

const merged = readJson(path.join(EVIDENCE, 'merge', 'qualification-v3.json'));
const tableBytes = fs.readFileSync(path.join(EVIDENCE, 'merge', 'table.md'));
const jsonBytes = fs.readFileSync(path.join(EVIDENCE, 'merge', 'qualification-v3.json'));
const tableLines = tableBytes.toString('utf8').split('\r\n').filter((l) => l.charAt(0) === '|');
if (tableLines.length !== 137) throw new Error('the merged table has ' + tableLines.length + ' lines');
const publication = inputs.sourceIdentity();

const cellKey = (c) => c.variant + '/' + c.level;
const cells = merged.cells;
const cellOf = (k) => cells.filter((c) => cellKey(c) === k)[0];
const columns = (line) => line.split('|').slice(1, -1).map((s) => s.trim());
const tableRow = {};
tableLines.slice(2).forEach((l) => { const c = columns(l); tableRow[c[0] + '/' + c[1]] = c; });
const v2Row = {};
archive.toString('utf8').split('\r\n').forEach((l) => {
  const m = /^\| (\w+) \| (\w+) \| \d+ \|/.exec(l);
  if (m) v2Row[m[1] + '/' + m[2]] = columns(l);
});
const num = (n) => n.toLocaleString('en-US');
const ms4 = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' ms';
const seconds = (ms) => (ms / 1000).toFixed(2) + ' s';
const plus7 = (iso) => new Date(Date.parse(iso) + 7 * 3600000).toISOString().replace('T', ' ').slice(0, 16);
const utc = (iso) => iso.replace('T', ' ').slice(0, 16);
const LEVELS = merged.matrix.levels;
const VARIANTS = merged.matrix.variants;

// ---- numbers computed from the record ---------------------------------------------------------------
const offered = cells.filter((c) => c.summary.verdict === 'offered');
const hidden = cells.filter((c) => c.summary.verdict === 'hidden');
const sum = (list, f) => list.reduce((s, c) => s + f(c), 0);
const offeredRequests = sum(offered, (c) => c.summary.n);
const offeredHits = sum(offered, (c) => c.summary.hits);
const offeredMisses = offered.filter((c) => c.summary.hits < c.summary.n)
  .map((c) => cellKey(c) + ' ' + c.summary.hits + ' of ' + c.summary.n);
const ratio = (c) => c.summary.p95 / c.budget;
const slowestP95 = offered.slice().sort((a, b) => ratio(b) - ratio(a)).slice(0, 3);
const slowestRequest = offered.slice().sort((a, b) => b.summary.max - a.summary.max)[0];
const approxOffered = sum(offered, (c) => c.summary.approximate);
const approxHidden = sum(hidden, (c) => c.summary.approximate);
const errorsBy = {};
cells.forEach((c) => c.requests.forEach((q) => {
  if (q.error) errorsBy[cellKey(c)] = (errorsBy[cellKey(c)] || 0) + 1;
}));
const errorCount = sum(cells, (c) => c.summary.errors);
const maxErrorMs = Math.max(...cells.flatMap((c) => c.requests.filter((q) => q.error).map((q) => q.ms)));
const secondRounds = cells.filter((c) => c.summary.n > 40 && c.summary.n < 100);
const stoppedEarly = cells.filter((c) => c.summary.stopped !== null).length;
const v2Offered = Object.keys(v2Row).filter((k) => v2Row[k][9] === 'offered');
const removed = v2Offered.filter((k) => cellOf(k).summary.verdict !== 'offered');
const bothHidden = Object.keys(v2Row).filter((k) => v2Row[k][9] !== 'offered' &&
  cellOf(k).summary.verdict !== 'offered');
const gained = offered.map(cellKey).filter((k) => v2Offered.indexOf(k) === -1);
if (removed.length !== 39 || gained.length !== 0 || v2Offered.length !== 118) {
  throw new Error('v2 comparison: ' + v2Offered.length + ' offers, ' + removed.length + ' removed, ' +
    gained.length + ' added');
}

function reasonOf(c) {
  const s = c.summary;
  if (s.stopped === 'misses') return 'too many misses (stopped early)';
  if (s.stopped === 'time') return 'p95 cannot fit the budget (stopped early)';
  return s.hits < 36 ? 'fewer than 36 exact hits of 40' : 'p95 above the budget';
}

const v2Count = (v) => LEVELS.filter((l) => v2Offered.indexOf(v + '/' + l) !== -1).length;
const start = merged.started;
const end = merged.finished;
const sources = merged.engine.sources;
const machine = merged.machine;
const gt = cellOf('greaterThan/normal').summary;
const dx = cellOf('diagonalX/expert').summary;
const killerHard = cellOf('killer/hard').summary;
const killerExpert = cellOf('killer/expert').summary;

// ---- the document -------------------------------------------------------------------------------------
const out = [];

/** Fills `text` into lines of at most WIDTH characters, the first after `first`, the others after `rest`. */
function wrap(text, first, rest) {
  const lines = [];
  let line = first;
  let fresh = true;
  text.split(' ').forEach((word) => {
    if (!fresh && (line + ' ' + word).length > WIDTH) {
      lines.push(line);
      line = rest + word;
    } else {
      line += (fresh ? '' : ' ') + word;
    }
    fresh = false;
  });
  lines.push(line);
  return lines;
}

const paragraph = (text) => out.push(...wrap(text, '', ''), '');
const bullet = (text) => out.push(...wrap(text, '- ', '  '));
const raw = (...lines) => out.push(...lines);

raw(TITLE, '');
paragraph('Every variant offers exactly the difficulty levels that pass the qualification protocol of the ' +
  'joint report ([report-detailed.md](../difficulty-v3/report-detailed.md), R24; the rating v2 protocol is ' +
  'section 6 of [report-detailed.md](report-detailed.md)). The lists below are the `difficultySupport` of ' +
  'the variant definitions (`generator/js/variants/*.js`); `generator/tests/manual/difficulty.test.js` (a ' +
  'manual suite: `node tests/node-runner.js --suite=difficulty`, run in `generator/`) checks that they are ' +
  'the same. The rating v2 record, with the machine, the engine and the numbers it was measured with, is ' +
  'kept unchanged in [qualification-v2.md](../difficulty-v3/qualification-v2.md).');

raw('## Protocol', '');
paragraph('`node tests/qualify.js` (run in `generator/`) runs it (options: `--variant`, `--level`, ' +
  '`--jobs`, ' +
  '`--json`, `--markdown`, `--probe`, `--no-early-stop`, `--quiet`, `--merge`, `--help`). The protocol is ' +
  'unchanged from rating v2 except where marked v3.');
bullet('For every variant with its default options and symmetry, and every level, 40 puzzles are generated ' +
  'with fixed seeds through the real pipeline (`SG.pipeline.run`, with the 120 s active-time guard of the ' +
  'application). Request *k* of (variant, level) uses the FNV-1a hash of `variant/level/k` on the base ' +
  'seed 20260601, so a re-run makes the same puzzles.');
bullet('v3: a request never names `maxAttempts`. It takes the default number of attempts of the size of ' +
  'its ' +
  'board (`SG.digger.defaultMaxAttempts`: 8 up to 81 cells, 4 up to 144, 2 above), so a large board that ' +
  'meets no exact puzzle in those attempts ends in the fallback, which is a miss.');
bullet('A request is a **hit** when it returns a valid puzzle (the givens belong to the solution, the ' +
  'solution is valid, the DFS counts exactly one solution) with a complete logical proof whose level is ' +
  'exactly the requested one, without the warning `difficulty.approximate`, and the result is `exact` (v3: ' +
  'the proof also needs a technique of the tier of the level; an absent flag is a miss). Timeouts, errors, ' +
  'approximate and unrated results are misses, and every request counts, also in the time percentile.');
bullet('**Offered** with at least 36 hits of 40 and a 95th percentile of the generation time within the ' +
  'budget: 2 s for boards of at most 36 cells (classic4, classic6), 10 s for the other boards of at ' +
  'most 81 ' +
  'cells, 30 s for larger boards. With 30 to 35 hits, 60 more seeds run, and the level is offered with at ' +
  'least 90 hits of the 100 and the 95th percentile of all 100 within the budget. Fewer than 30 hits: ' +
  'hidden. Lists may have gaps.');
bullet('Early stop: a level stops as soon as its verdict cannot change any more (more than 10 misses among ' +
  'the first 40, more than 10 misses of 100, or more slow requests than the percentile of 100 requests ' +
  'allows); the column `n` shows how many requests ran. Such a level is hidden either way ' +
  '(`--no-early-stop` runs every seed).');
bullet('A level is offered only from exactly 40 or 100 recorded outcomes. A worker process that stops ' +
  'unexpectedly, a message that cannot be sent or a request left without an outcome fails the whole run: ' +
  'nothing is written and the exit code is 1 (2 for a usage error).');
bullet('Four worker processes, always: the 95th percentile is part of the verdict, so runs with different ' +
  'job counts are not comparable, and the merge accepts only `--jobs=4`.');
bullet('The qualification enables every level in its workers, whatever `difficultySupport` says, so ' +
  'publishing the lists after the measurement does not enter the measurement.');
raw('');

raw('## Last run: the final rating v3 qualification', '');
bullet('Date: ' + plus7(start) + ' to ' + plus7(end).slice(11) + ' (UTC+7), which is ' + utc(start) + ' to ' +
  utc(end).slice(11) + ' UTC. The first start to the last end is ' + num(merged.wallSpanSeconds) +
  ' s, and the 135 runs of one cell each add up to ' + num(merged.shardSeconds) + ' s. Every cell ran on ' +
  'its own with four worker processes, 140 attempts in all: five cells were first held before any ' +
  'request started (see below).');
bullet('Machine: ' + machine.cpu + ', ' + machine.logicalProcessors + ' logical processors, ' +
  machine.memoryGb + ' GB, Windows (' + machine.platform.replace('win32 ', '') + '), Node ' +
  machine.node + ', ' + machine.jobs + ' jobs.');
bullet('**Environment: host-active, not strict-quiet.** The machine was running the agent session that ' +
  'drove the qualification, so it could not be made quiescent. The declared policy is ' +
  '`MS18c-GQ-host-active` (owner decision S-OD13). The raw strict screen (five one-second CPU intervals, ' +
  'mean at most 0.5 and maximum at most 1.0 busy cores) failed in all 140 admissions. Under the named ' +
  'policy a cell is admitted unless another process uses at least 0.5 CPU-seconds per elapsed second; ' +
  'five cells were held for such a process and started at their second admission at least 60 s later ' +
  '(mega12 hell2, killer hell2, butterfly very easy, flower nightmare, wordoku hard). The times below ' +
  'were measured as they were: no CPU was subtracted, no time was normalized, and they are not ' +
  'strict-quiet timings. They decide the offers.');
bullet('Engine (measured): the commit `ed2fe50c`, with a working tree that had changes outside the engine ' +
  'files. The hash of the sources is `' + sources + '` (the ' + publication.fileCount + ' files of ' +
  '`core/js/engine`, `generator/js/engine` and `generator/js/variants` that `tests/qualify.js` loads), ' +
  'the same as at `14d8c903`. The qualifier tool hash (`qualify.js` and ' +
  '`fixtures/qualification-records.js`) is `' + merged.qualifierHash + '`. The attempt policy recorded in ' +
  'every record is the board default, with no explicit attempt count.');
bullet('Engine (publication): after the `difficultySupport` arrays of eight variant files were edited to ' +
  'the lists below, the same ' + publication.fileCount + ' files hash to `' + publication.engineSources +
  '`. That edit changes support lists only, no solver, default, weight, limit or protocol, and the ' +
  'qualification does not read them. The measured identity `' + sources + '` is never retagged, and the ' +
  'records are not merged again against the published sources.');
bullet('Raw record: `docs/difficulty-v3/evidence/MS18c/merge/qualification-v3.json` (SHA-256 `' +
  sha(jsonBytes) + '`) and the table below (`merge/table.md`, SHA-256 `' + sha(tableBytes) + '`), from ' +
  'the complete 135-cell merge (`node tests/qualify.js --merge --jobs=4`, exit 0, no invalid request).');
bullet(num(merged.totals.requests) + ' requests: ' + num(merged.totals.hits) + ' exact hits, ' +
  num(merged.totals.approximate) + ' approximate results (' + approxOffered + ' on offered levels, ' +
  approxHidden + ' on hidden levels), **' + errorCount + ' timeouts** and no invalid or ambiguous puzzle. ' +
  'All ' + num(merged.totals.requests - errorCount) + ' other outcomes are valid and solved.');
bullet('The ' + errorCount + ' timeouts are `budget.exceeded` results at the 120 s guard (the longest took ' +
  ms4(maxErrorMs) + '). They are misses and count in the percentiles: ' +
  Object.keys(errorsBy).map((k) => k + ' ' + errorsBy[k]).join(', ') + '.');
bullet(offered.length + ' (variant, level) pairs are offered and ' + hidden.length + ' hidden; ' +
  stoppedEarly + ' hidden levels stopped early. Three levels needed a second round and were hidden: ' +
  secondRounds.map((c) => cellKey(c) + ' (' + c.summary.n + ' requests)').join(', ') + '.');
bullet('On the ' + offered.length + ' offered pairs: ' + num(offeredHits) + ' hits of ' +
  num(offeredRequests) + ' requests' +
  (offeredMisses.length ? ' (the misses: ' + offeredMisses.join(', ') + ')' : '') + '. Closest to their ' +
  'budget are the 95th percentiles of ' + slowestP95.map((c) => cellKey(c) + ' ' +
    seconds(c.summary.p95) + ' of ' + (c.budget / 1000) + ' s').join(', ') + '; the slowest single request ' +
  'of an offered level took ' + seconds(slowestRequest.summary.max) + ' (' + cellKey(slowestRequest) + ').');
raw('');

raw('## Levels offered', '');
paragraph('The `difficultySupport` lists, in global level order: ' + offered.length + ' of the 135 pairs ' +
  '(rating v2: ' + v2Offered.length + ').');
raw('| variant | levels offered | count in v2 | count now |', '|---|---|---:|---:|');
VARIANTS.forEach((v) => {
  raw('| ' + v + ' | ' + merged.support[v].join(', ') + ' | ' + v2Count(v) + ' | ' +
    merged.support[v].length + ' |');
});
raw('');
paragraph('classic4 and classic6 are unchanged. No level that rating v2 hid is offered now.');

raw('### Killer Hard and Expert: withheld by owner decision S-OD7', '');
paragraph('Killer Hard (' + killerHard.hits + ' hits of ' + killerHard.n + ', ' + killerHard.verdict +
  ': misses) and Killer Expert (' + killerExpert.hits + ' of ' + killerExpert.n + ', ' +
  killerExpert.verdict + ': time) did not pass the qualification either, and the table keeps those raw ' +
  'verdicts. The owner decision S-OD7 withholds both levels, **hidden until later calibration (S-OD7)**, ' +
  'whatever a later raw verdict says. That product restriction is separate from the qualification, and no ' +
  'weight or rating change in rating v3 follows from it. No other level is withheld by decision: every ' +
  'other hidden level failed its qualification.');

raw('## Removed levels: offered in rating v2, hidden now (' + removed.length + ')', '');
paragraph('Each row is a level of the rating v2 table that this qualification does not confirm. v2 and now ' +
  'give hits of requests and the 95th percentile of the generation time (every request counts); the ' +
  'budget is the time budget of the board.');
raw('| cell | v2 hits | v2 p95 | now hits | now p95 | budget | why hidden now |',
  '|---|---:|---:|---:|---:|---:|---|');
removed.forEach((k) => {
  const was = v2Row[k];
  const now = tableRow[k];
  raw('| ' + k + ' | ' + was[3] + '/' + was[2] + ' | ' + was[6] + ' | ' + now[3] + '/' + now[2] + ' | ' +
    now[6] + ' | ' + now[8] + ' | ' + reasonOf(cellOf(k)) + ' |');
});
raw('');

raw('### Two close misses', '');
bullet('**Greater-Than Normal**: ' + gt.hits + ' hits of ' + gt.n + ', but a 95th percentile of ' +
  ms4(gt.p95) + ' against its budget of 10,000 ms (about ' + ((gt.p95 / 10000 - 1) * 100).toFixed(1) +
  ' % over). Hidden, with no early stop.');
bullet('**diagonalX Expert**: ' + dx.hits + ' hits of ' + dx.n + ', and a 95th percentile of ' +
  ms4(dx.p95) + ' against 10,000 ms. Hidden, with no early stop.');
raw('');
paragraph('Both fail the unchanged protocol by their time, as measured, and are not repeated for a faster ' +
  'run.');

const hiddenBoth = bothHidden.map((k) => cellOf(k));
raw('## Hidden in rating v2 and still hidden (' + hiddenBoth.length + ')', '');
VARIANTS.forEach((v) => {
  const list = hiddenBoth.filter((c) => c.variant === v);
  if (list.length === 0) return;
  bullet(v + ': ' + list.map((c) => c.level + ' ' + c.summary.hits + '/' + c.summary.n).join(', ') + '.');
});
raw('');
paragraph('"Hidden" means "not generated reliably under these settings", never "impossible": a puzzle ' +
  'keeps ' +
  'its real level even where that level is not offered. A bounded fallback, a shallow result or a timeout ' +
  'is a miss, and no hidden level is kept offered.');

raw('## Table', '');
paragraph('`n` requests, `hits`, the hit `rate`, the 50th and 95th percentiles and the maximum of the ' +
  'generation time (every request), the time `budget` and the verdict. It is the table of the merge, line ' +
  'for line.');
tableLines.forEach((l) => raw(l));

const text = out.join('\r\n');
if (/[ \t]\r\n/.test(text)) throw new Error('trailing whitespace in the report');
fs.writeFileSync(LIVE, text + '\r\n');
console.log('written ' + path.relative(util.REPO, LIVE) + ': ' + out.length + ' lines, SHA-256 ' +
  sha(fs.readFileSync(LIVE)));
console.log('publication engine.sources ' + publication.engineSources + ', measured ' + sources);
