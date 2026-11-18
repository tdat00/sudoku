'use strict';

/*
 * MS18c post-GQ task-owned, file-only: the checkpoint records of the helpers and the new evidence. It never
 * reads, lists, formats or hashes anything under the frozen `evidence/MS18c/runs` and `.../qualification`
 * (their integrity is `outputs-sha256-gq.txt`, see inventory.cjs).
 *   node generator/tests/artifacts/difficulty-v3/MS18c/freeze.cjs merge-hashes
 *   node generator/tests/artifacts/difficulty-v3/MS18c/freeze.cjs <label>
 * `merge-hashes` writes `evidence/MS18c/merge/merge-sha256.txt` (every other file of that folder).
 * `<label>` writes `evidence/MS18c/helpers-sha256-<label>.txt` (every file of this folder),
 * `outputs-sha256-<label>.txt` (every evidence file outside the frozen trees except these three records) and
 * `format-check-<label>.txt`. Format rules as in the earlier records: UTF-8 without a BOM, CRLF only, a final
 * newline, no trailing whitespace, helpers (`.cjs`, `.js`, `.ps1`) within 110 characters; the verbatim copy
 * `gq-cell-log.tsv` is hashed but not format-checked. It also verifies that every older record
 * of the evidence
 * (`outputs-sha256-s3.txt`, `outputs-sha256-s3b.txt`) still matches and reports the helpers changed since
 * `helpers-sha256-s3b.txt`. Records are written once and never overwritten. Exit 0 when no problem is found.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const HELPERS = __dirname;
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18c');
const FROZEN = ['runs', 'qualification'].map((name) => path.join(EVIDENCE, name));
const SKIP = /\.last-release$|\.part$/;
const VERBATIM = ['gq-cell-log.tsv'];

const rel = (file) => path.relative(REPO, file);
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const line = (file) => sha(file) + '  ' + rel(file);

function walk(dir, list, skipFrozen) {
  if (!fs.existsSync(dir)) return list;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (skipFrozen && FROZEN.indexOf(full) !== -1) return;
    if (entry.isDirectory()) walk(full, list, skipFrozen);
    else if (!SKIP.test(entry.name)) list.push(full);
  });
  return list;
}

function writeOnce(file, text) {
  if (fs.existsSync(file)) throw new Error('REFUSED: ' + rel(file) + ' exists and is never overwritten');
  fs.writeFileSync(file, text, { flag: 'wx' });
}

function oldRecord(file, problems, notes) {
  if (!fs.existsSync(file)) return;
  const rows = fs.readFileSync(file, 'utf8').split('\r\n').filter((l) => l !== '');
  let same = 0;
  rows.forEach((row) => {
    const m = /^([0-9A-F]{64}) {2}(.+)$/.exec(row);
    const target = m && path.join(REPO, m[2]);
    if (!m || !fs.existsSync(target) || sha(target) !== m[1]) problems.push('older record ' +
      path.basename(file) + ': ' + (m ? m[2] : row) + ' differs or is missing');
    else same++;
  });
  notes.push(path.basename(file) + ': ' + same + ' of ' + rows.length + ' entries still match');
}

const mode = process.argv[2];
if (mode === 'merge-hashes') {
  const dir = path.join(EVIDENCE, 'merge');
  const out = path.join(dir, 'merge-sha256.txt');
  const files = fs.readdirSync(dir).filter((n) => n !== 'merge-sha256.txt').sort()
    .map((n) => path.join(dir, n));
  writeOnce(out, files.map(line).join('\r\n') + '\r\n');
  console.log('written ' + rel(out) + ': ' + files.length + ' files');
} else if (/^[a-z0-9]+$/.test(String(mode))) {
  const helpersOut = path.join(EVIDENCE, 'helpers-sha256-' + mode + '.txt');
  const outputsOut = path.join(EVIDENCE, 'outputs-sha256-' + mode + '.txt');
  const formatOut = path.join(EVIDENCE, 'format-check-' + mode + '.txt');
  [helpersOut, outputsOut, formatOut].forEach((f) => {
    if (fs.existsSync(f)) throw new Error('REFUSED: ' + rel(f) + ' exists and is never overwritten');
  });
  const helpers = walk(HELPERS, [], false).sort();
  const evidence = walk(EVIDENCE, [], true).sort();
  const notes = [];
  const problems = [];
  const lines = [];
  helpers.concat(evidence).forEach((file) => {
    if (VERBATIM.indexOf(path.basename(file)) !== -1) return;
    const bytes = fs.readFileSync(file);
    const text = bytes.toString('utf8');
    const found = [];
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) found.push('BOM');
    if (/\r(?!\n)/.test(text) || /(^|[^\r])\n/.test(text)) found.push('a line end that is not CRLF');
    if (bytes.length > 0 && !text.endsWith('\r\n')) found.push('no final newline');
    const code = helpers.indexOf(file) !== -1 && /\.(cjs|js|ps1)$/.test(file);
    text.split('\r\n').forEach((row, i) => {
      if (/[ \t]+$/.test(row)) found.push('trailing whitespace at line ' + (i + 1));
      if (code && row.length > 110) found.push('line ' + (i + 1) + ' has ' + row.length + ' characters');
    });
    if (found.length > 0) problems.push(rel(file).replace(/\\/g, '/') + ': ' + found.slice(0, 6).join('; '));
  });
  oldRecord(path.join(EVIDENCE, 'outputs-sha256-s3.txt'), problems, notes);
  oldRecord(path.join(EVIDENCE, 'outputs-sha256-s3b.txt'), problems, notes);
  const s3b = new Map();
  fs.readFileSync(path.join(EVIDENCE, 'helpers-sha256-s3b.txt'), 'utf8').split('\r\n').filter((l) => l)
    .forEach((l) => s3b.set(l.slice(66), l.slice(0, 64)));
  const changed = [];
  const added = [];
  helpers.forEach((f) => {
    const was = s3b.get(rel(f));
    if (was === undefined) added.push(path.basename(f));
    else if (was !== sha(f)) changed.push(path.basename(f));
  });
  notes.push('helpers since helpers-sha256-s3b.txt: ' + (helpers.length - added.length - changed.length) +
    ' unchanged, changed [' + changed.join(', ') + '], new [' + added.join(', ') + ']');
  const summary = notes.concat(problems.length === 0 ? [] : problems);
  summary.push('checked ' + (helpers.length + evidence.length) + ' files, ' + problems.length +
    ' problems (the frozen runs and qualification trees are not read here)');
  writeOnce(helpersOut, helpers.map(line).join('\r\n') + '\r\n');
  const outputs = evidence.filter((f) => [helpersOut, outputsOut, formatOut].indexOf(f) === -1);
  writeOnce(outputsOut, outputs.map(line).join('\r\n') + '\r\n');
  writeOnce(formatOut, summary.join('\r\n') + '\r\n');
  summary.forEach((l) => console.log(l));
  console.log('written ' + rel(helpersOut) + ' (' + helpers.length + '), ' + rel(outputsOut) + ' (' +
    outputs.length + '), ' + rel(formatOut));
  process.exitCode = problems.length === 0 ? 0 : 1;
} else {
  console.log('usage: freeze.cjs merge-hashes | <label>');
  process.exitCode = 2;
}
