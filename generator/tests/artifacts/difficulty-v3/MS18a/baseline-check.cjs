'use strict';

/*
 * MS18a task-owned, read-only: checks the 17 original MS02 ledgers (the baseline of GS-after) and writes the
 * key list of its 204 requests. File-only, no generation. Exit 0 when every check holds, 1 otherwise.
 *   node generator/tests/artifacts/difficulty-v3/MS18a/baseline-check.cjs <text out> <keys json out>
 * The expected numbers are those of docs/difficulty-v3/baseline.md (old hits 202, qualified 91, shallow
 * 111 of 202); the routes are those of the fixed GS manifest; the pipeline seeds are recomputed with the
 * FNV-1a `seedFor` of tests/soak.js over the tag and the base seed 20260101.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const MS02 = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS02');
const SEED = 20260101;
// variant, level, route; expected counts: in band (= old score-only hits), qualified, shallow
const CELLS = [
  ['classic9', 'normal', 'direct', 12, 3, 9], ['classic9', 'hard', 'direct', 12, 12, 0],
  ['classic9', 'expert', 'direct', 12, 12, 0], ['classic9', 'master', 'direct', 12, 10, 2],
  ['classic9', 'nightmare', 'direct', 12, 0, 12], ['classic9', 'hell1', 'direct', 12, 12, 0],
  ['killer', 'normal', 'pipeline', 12, 5, 7], ['killer', 'hard', 'pipeline', 12, 0, 12],
  ['killer', 'expert', 'pipeline', 12, 0, 12], ['jigsaw9', 'normal', 'pipeline', 12, 3, 9],
  ['jigsaw9', 'hard', 'pipeline', 12, 12, 0], ['jigsaw9', 'expert', 'pipeline', 12, 2, 10],
  ['jigsaw9', 'nightmare', 'pipeline', 12, 0, 12], ['greaterThan', 'normal', 'pipeline', 12, 1, 11],
  ['greaterThan', 'hard', 'pipeline', 12, 11, 1], ['greaterThan', 'expert', 'pipeline', 10, 8, 2],
  ['diagonalX', 'nightmare', 'direct', 12, 0, 12]
];
const REQUESTS = { classic9: 72, killer: 36, jigsaw9: 48, greaterThan: 36, diagonalX: 12 };

function seedFor(tag) {
  let h = (2166136261 ^ SEED) >>> 0;
  for (let k = 0; k < tag.length; k++) h = Math.imul(h ^ tag.charCodeAt(k), 16777619) >>> 0;
  return h;
}

const lines = [];
const problems = [];
const keys = [];
const totals = {
  rows: 0, inBand: 0, oldHits: 0, qualified: 0, shallow: 0, shallowOf: 0, refOk: 0, refVacuous: 0
};
const perVariant = {};
CELLS.forEach(([variant, level, route, inBand, qualified, shallow]) => {
  const name = variant + '-' + level;
  const file = path.join(MS02, name + '.json');
  const ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
  const fail = (text) => problems.push(name + ': ' + text);
  const cell = ledger.meta && ledger.meta.manifest && ledger.meta.manifest.cells[0];
  if (ledger.schema !== 1 || ledger.complete !== true) fail('not a complete schema 1 ledger');
  if (!ledger.summary || ledger.summary.checks.result !== 'PASS') fail('summary.checks.result is not PASS');
  if (ledger.meta.seedBase !== SEED) fail('seedBase ' + ledger.meta.seedBase);
  if (!cell || cell.variant !== variant || cell.level !== level || cell.route !== route ||
      cell.requests !== 12) {
    fail('manifest cell ' + JSON.stringify(cell));
  }
  if (ledger.rows.length !== 12) fail(ledger.rows.length + ' rows');
  const seen = new Set();
  ledger.rows.forEach((row) => {
    const tag = variant + ':' + level + ':' + row.index;
    if (row.tag !== tag || row.variant !== variant || row.requested !== level) {
      fail('row ' + row.index + ' tag ' + row.tag);
    }
    seen.add(row.index);
    const want = route === 'pipeline' ? seedFor(tag) : null;
    if (row.pipelineSeed !== want) {
      fail('row ' + row.index + ' pipelineSeed ' + row.pipelineSeed + ' (want ' + want + ')');
    }
    keys.push({ variant: variant, level: level, index: row.index, tag: tag, route: route,
      pipelineSeed: row.pipelineSeed, puzzleHash: row.puzzleHash });
  });
  for (let i = 0; i < 12; i++) if (!seen.has(i)) fail('index ' + i + ' missing');
  const rows = ledger.rows;
  const got = {
    inBand: rows.filter((r) => r.scoreHit === true).length,
    oldHits: rows.filter((r) => r.generationExact === true).length,
    qualified: rows.filter((r) => r.qualifiedHit === true).length,
    shallow: rows.filter((r) => r.scoreHit === true && r.shallow === true).length,
    refOk: rows.filter((r) => r.referenceStatus === 'ok').length,
    refVacuous: rows.filter((r) => r.referenceStatus === 'vacuous').length,
    errors: rows.filter((r) => r.outcome !== 'ok').length
  };
  if (got.inBand !== inBand) fail('in band ' + got.inBand + ' (want ' + inBand + ')');
  if (got.oldHits !== inBand) fail('old score-only hits ' + got.oldHits + ' (want ' + inBand + ')');
  if (got.qualified !== qualified) fail('qualified ' + got.qualified + ' (want ' + qualified + ')');
  if (got.shallow !== shallow) fail('shallow ' + got.shallow + ' (want ' + shallow + ')');
  if (got.errors !== 0) fail(got.errors + ' error rows');
  if (got.refOk + got.refVacuous !== 12 || (level === 'hell1') !== (got.refVacuous === 12)) {
    fail('references ok ' + got.refOk + ', vacuous ' + got.refVacuous);
  }
  perVariant[variant] = (perVariant[variant] || 0) + rows.length;
  totals.rows += rows.length;
  totals.inBand += got.inBand;
  totals.oldHits += got.oldHits;
  totals.qualified += got.qualified;
  totals.shallow += got.shallow;
  totals.shallowOf += got.inBand;
  totals.refOk += got.refOk;
  totals.refVacuous += got.refVacuous;
  lines.push(name.padEnd(24) + ' ' + route.padEnd(9) + ' rows ' + rows.length + ', in band ' + got.inBand +
    ', old hits ' + got.oldHits + ', qualified ' + got.qualified + ', shallow ' + got.shallow +
    ', reference ok/vacuous ' + got.refOk + '/' + got.refVacuous + ', checks ' +
    ledger.summary.checks.result + ', rating ' + ledger.meta.manifest.ratingVersion + ', source ' +
    ledger.meta.sourceHash.slice(0, 8));
});
Object.keys(REQUESTS).forEach((variant) => {
  if (perVariant[variant] !== REQUESTS[variant]) {
    problems.push(variant + ': ' + perVariant[variant] + ' requests');
  }
});
if (totals.rows !== 204 || totals.inBand !== 202 || totals.oldHits !== 202 || totals.qualified !== 91 ||
    totals.shallow !== 111 || totals.shallowOf !== 202 || totals.refOk !== 192 || totals.refVacuous !== 12) {
  problems.push('totals ' + JSON.stringify(totals));
}
lines.push('');
lines.push('totals: ' + JSON.stringify(totals) + '; requests per variant ' + JSON.stringify(perVariant));
lines.push('204 keys ' + (keys.length === 204 ? 'written' : 'WRONG COUNT ' + keys.length) +
  '; every pipeline seed recomputed with seedFor over the tag (base ' + SEED +
  '), every direct row has none');
lines.push(problems.length === 0 ? 'RESULT: all baseline checks hold' :
  'RESULT: ' + problems.length + ' PROBLEMS');
problems.forEach((p) => lines.push('  ' + p));
lines.forEach((line) => console.log(line));
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), lines.join('\r\n') + '\r\n', 'utf8');
if (process.argv[3]) {
  const text = JSON.stringify(keys, null, 2).replace(/\n/g, '\r\n') + '\r\n';
  fs.writeFileSync(path.resolve(process.argv[3]), text, 'utf8');
}
process.exitCode = problems.length === 0 ? 0 : 1;
