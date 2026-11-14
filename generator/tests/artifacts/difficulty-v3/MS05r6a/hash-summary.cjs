'use strict';

/*
 * MS05r6a, B item 4: the changed keys of the regression hashes, per combination, against `git show <rev>:` of the
 * fixture (HEAD) and against the interim record of MS05b1 (docs/difficulty-v3/notes.md, "Regression hashes (520 keys)"),
 * which was taken with no allowance and 8 attempts everywhere. Read-only; no generation.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6a/hash-summary.cjs --json=<file.json> [--rev=HEAD]
 *
 * A key is a combination and a seed index; "changed" is a different puzzle hash. The b1 column is the number of
 * changed keys per combination that MS05b1 recorded (149 in all, 56 more were the same puzzle as a shallow fallback).
 * The size-default column says whether the combination is on a board above 81 cells (4 or 2 attempts since MS05r5p).
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
// MS05b1's interim record (notes.md): changed keys of 20 per combination.
const B1 = {
  'classic9/easy': 19, 'classic9/normal': 13, 'classic9/master': 7, 'classic9/nightmare': 6, 'mega12/normal': 5,
  'mega16/easy': 1, 'diagonalX/easy': 14, 'diagonalX/nightmare': 11, 'jigsaw9/normal': 10, 'jigsaw9/master': 8,
  'greaterThan/normal': 10, 'greaterThan/hard': 2, 'samurai/easy': 19, 'butterfly/normal': 10, 'flower/normal': 8,
  'wordoku/normal': 6
};
const LARGE = ['mega12', 'mega16', 'samurai', 'butterfly', 'flower', 'sohei'];

function parseArgs(argv) {
  const out = { rev: 'HEAD', json: null };
  argv.forEach((arg) => {
    let m;
    if ((m = /^--rev=(.+)$/.exec(arg))) out.rev = m[1];
    else if ((m = /^--json=(.+)$/.exec(arg))) out.json = m[1];
    else throw new Error('unknown argument ' + arg);
  });
  return out;
}

function evaluate(text) {
  const context = { self: undefined, globalThis: undefined };
  context.self = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(text.replace(/^\uFEFF/, ''), context);
  return context.SG.fixtures.regression;
}

function main(argv) {
  const opts = parseArgs(argv);
  const rel = 'generator/tests/fixtures/regression.js';
  const old = evaluate(childProcess.execFileSync('git', ['show', opts.rev + ':' + rel], {
    cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 }));
  const now = evaluate(fs.readFileSync(path.join(REPO, rel), 'utf8'));
  const keys = Object.keys(old.hashes);
  const rows = keys.map((key) => {
    const changed = [];
    old.hashes[key].forEach((h, i) => { if (now.hashes[key][i] !== h) changed.push(i); });
    const variant = key.split('/')[0];
    return { key: key, changed: changed.length, indexes: changed, b1Changed: B1[key] === undefined ? 0 : B1[key],
      largeBoard: LARGE.includes(variant) };
  });
  const total = rows.reduce((n, r) => n + r.changed, 0);
  const report = {
    rev: opts.rev, seedsSame: JSON.stringify(old.seeds) === JSON.stringify(now.seeds),
    combinationsSame: JSON.stringify(keys) === JSON.stringify(Object.keys(now.hashes)),
    totals: { keys: rows.length * 20, changedVsHead: total, b1Interim: Object.values(B1).reduce((a, b) => a + b, 0) },
    rows: rows
  };
  if (opts.json) fs.writeFileSync(path.resolve(process.cwd(), opts.json), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log('seeds same ' + report.seedsSame + ', combinations same ' + report.combinationsSame + ', keys ' +
    report.totals.keys + ', changed against ' + opts.rev + ': ' + total + ' (b1 interim: ' + report.totals.b1Interim + ')');
  rows.forEach((r) => console.log(('  ' + r.key).padEnd(26) + String(r.changed).padStart(3) + ' of 20   b1 ' +
    String(r.b1Changed).padStart(3) + (r.largeBoard ? '   (size default 4 or 2 attempts)' : '')));
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 1;
}
