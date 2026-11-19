'use strict';

/*
 * MS18d Phase C0 task-owned, read-only (adapted from phase-b/check-format.js, which it does not modify):
 * the format of the Phase C files. Every file must be UTF-8 without a BOM, use CRLF line ends only, end
 * with a newline and have no trailing whitespace; the helpers of this folder (`.js`, `.ps1`) also keep
 * their lines within 110 characters. The files checked are the helpers of this folder, the Phase C
 * evidence folder (any depth, including the stand-in records kept under tooling/; the 110-character rule
 * is skipped for text and JSON data) and the extra files named on the command line (their line length is
 * not checked).
 *   --freeze <out>   writes the byte SHA-256 of every helper of this folder, then of every frozen file of
 *                    an earlier phase they read or run (common.js REFERENCED_FROZEN) and the frozen chunk
 *                    manifest (FROZEN_PLAN): the helper manifest;
 *   --outputs <out>  writes that of every file of the Phase C evidence folder except <out> itself, the two
 *                    lock logs (lock-log.jsonl is the append-only ledger, tooling-lock-log.jsonl records
 *                    this folder's own runs; both keep growing) and the transcripts named freeze-*.txt;
 *   --verify <rec>   re-hashes every file a freeze record lists (HASH  path relative to the repository)
 *                    and reports each mismatch or missing file; it writes nothing.
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-c/check-format.js [--freeze <out>]
 *        [--outputs <out>] [--verify <record>] [<out>] [files...]
 * The Phase A and Phase B records are not touched. A missing file is reported. Exit 0 when no file has a
 * problem.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { REFERENCED_FROZEN, FROZEN_PLAN } = require('./common.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const HELPERS = __dirname;
const EVIDENCE_ROOT = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18d');
const EVIDENCE = path.join(EVIDENCE_ROOT, 'phase-c');
const SKIP = /\.part$/;
const UNFROZEN = /(^|[\\/])((tooling-)?lock-log\.jsonl|transcripts[\\/]freeze-.*\.txt)$/;

const args = process.argv.slice(2);
let freeze = null;
let outputs = null;
const verify = [];
while (args[0] === '--freeze' || args[0] === '--outputs' || args[0] === '--verify') {
  if (args[0] === '--freeze') freeze = path.resolve(args[1]);
  else if (args[0] === '--outputs') outputs = path.resolve(args[1]);
  else verify.push(path.resolve(args[1]));
  args.splice(0, 2);
}
const out = args.length > 0 && !/\.(md|json|ps1|js)$/.test(args[0]) ? path.resolve(args.shift()) : null;

const sumOf = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  .toUpperCase() + '  ' + path.relative(REPO, file).replace(/\//g, '\\');

if (verify.length > 0) {
  let bad = 0;
  verify.forEach((record) => {
    const rows = fs.readFileSync(record, 'utf8').split(/\r?\n/).filter((row) => row.trim() !== '');
    let wrong = 0;
    rows.forEach((row) => {
      const m = /^([0-9A-Fa-f]{64})  (.+)$/.exec(row);
      const file = m ? path.join(REPO, m[2]) : null;
      let why = null;
      if (!m) why = 'MALFORMED';
      else if (!fs.existsSync(file)) why = 'MISSING';
      else if (sumOf(file).split('  ')[0] !== m[1].toUpperCase()) why = 'DIFFERENT';
      if (why) {
        wrong++;
        console.log(path.relative(REPO, record) + ': ' + (m ? m[2] : row) + ': ' + why);
      }
    });
    console.log(path.relative(REPO, record) + ': ' + rows.length + ' entries, ' + wrong + ' not matching');
    bad += wrong;
  });
  process.exit(bad === 0 ? 0 : 1);
}

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
const evidence = walk(EVIDENCE, []);
const files = helpers.concat(evidence, args.map((f) => path.resolve(f)));
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
  const code = helpers.indexOf(file) !== -1 && /\.(js|ps1)$/.test(file);
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
  const listed = helpers.concat(REFERENCED_FROZEN.concat(FROZEN_PLAN).map((rel) => path.join(REPO, rel)));
  fs.writeFileSync(freeze, listed.map(sumOf).join('\r\n') + '\r\n', 'utf8');
}
if (outputs) {
  const frozen = evidence.filter((file) => file !== outputs &&
    !UNFROZEN.test(path.relative(EVIDENCE_ROOT, file)));
  fs.writeFileSync(outputs, frozen.map(sumOf).join('\r\n') + '\r\n', 'utf8');
}
process.exitCode = bad === 0 ? 0 : 1;
