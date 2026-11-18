'use strict';

/*
 * MS18b task-owned, read-only: the format of the files this task owns. Every file must be UTF-8 without
 * a BOM, use CRLF line ends only, end with a newline and have no trailing whitespace; the helpers of this
 * folder (`.cjs`, `.js`, `.ps1`) also keep their lines within 110 characters. The files checked are the
 * helpers, the evidence folder (any depth, the 110-character rule skipped for text and JSON data) and the
 * extra files named on the command line. With `--freeze <out>` it also writes the byte SHA-256 of every
 * helper.
 *   node generator/tests/artifacts/difficulty-v3/MS18b/check-format.cjs [--freeze <out>] [<out>] [files...]
 * A file that is missing is reported, not skipped silently. Exit 0 when no file has a problem.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const HELPERS = __dirname;
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18b');
const SKIP = /\.last-release$|\.part$/;

const args = process.argv.slice(2);
let freeze = null;
if (args[0] === '--freeze') {
  freeze = path.resolve(args[1]);
  args.splice(0, 2);
}
const out = args.length > 0 && !/\.(md|json|ps1|cjs|js)$/.test(args[0]) ? path.resolve(args.shift()) : null;

function walk(dir, list) {
  if (!fs.existsSync(dir)) return list;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, list);
    else if (!SKIP.test(entry.name)) list.push(full);
  });
  return list;
}

const helpers = walk(HELPERS, []);
const files = helpers.concat(walk(EVIDENCE, []), args.map((f) => path.resolve(f)));
const lines = [];
let bad = 0;
files.forEach((file) => {
  const rel = path.relative(REPO, file).replace(/\\/g, '/');
  if (!fs.existsSync(file)) {
    bad++;
    lines.push(rel + ': MISSING');
    return;
  }
  const bytes = fs.readFileSync(file);
  const text = bytes.toString('utf8');
  const problems = [];
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) problems.push('BOM');
  if (/\r(?!\n)/.test(text) || /(^|[^\r])\n/.test(text)) problems.push('a line end that is not CRLF');
  if (bytes.length > 0 && !text.endsWith('\r\n')) problems.push('no final newline');
  const rows = text.split('\r\n');
  const code = helpers.indexOf(file) !== -1 && /\.(cjs|js|ps1)$/.test(file);
  rows.forEach((row, i) => {
    if (/[ \t]+$/.test(row)) problems.push('trailing whitespace at line ' + (i + 1));
    if (code && row.length > 110) problems.push('line ' + (i + 1) + ' has ' + row.length + ' characters');
  });
  if (problems.length > 0) {
    bad++;
    lines.push(rel + ': ' + problems.slice(0, 6).join('; ') + (problems.length > 6 ? '; ...' : ''));
  }
});
lines.push('checked ' + files.length + ' files, ' + bad + ' with problems');
lines.forEach((line) => console.log(line));
if (out) fs.writeFileSync(out, lines.join('\r\n') + '\r\n', 'utf8');
if (freeze) {
  const sums = helpers.map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    .toUpperCase() + '  ' + path.relative(REPO, file).replace(/\//g, '\\'));
  fs.writeFileSync(freeze, sums.join('\r\n') + '\r\n', 'utf8');
}
process.exitCode = bad === 0 ? 0 : 1;
