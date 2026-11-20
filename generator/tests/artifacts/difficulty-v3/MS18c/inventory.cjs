'use strict';

/*
 * MS18c post-GQ task-owned, file-only: the SHA-256 inventory of the frozen GQ trees
 * (`docs/difficulty-v3/evidence/MS18c/runs` and `.../qualification`, every file at any depth, hidden files
 * included) and its verification. The inventory is one file outside both trees,
 * `docs/difficulty-v3/evidence/MS18c/outputs-sha256-gq.txt`: CRLF lines
 * `<SHA-256 upper case>  <repository-relative path with backslashes>`, sorted by path (UTF-16 code units),
 * written once and never overwritten.
 *   node generator/tests/artifacts/difficulty-v3/MS18c/inventory.cjs write
 *   node generator/tests/artifacts/difficulty-v3/MS18c/inventory.cjs verify
 * `write` refuses when the inventory exists. `verify` checks the line format and order, the file-set
 * equality with the trees as they are now (no missing, no extra file), every hash, and prints the file
 * count and bytes. Exit 0 when nothing differs.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18c');
const TREES = ['runs', 'qualification'].map((name) => path.join(EVIDENCE, name));
const INVENTORY = path.join(EVIDENCE, 'outputs-sha256-gq.txt');

const rel = (file) => path.relative(REPO, file);
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  .toUpperCase();

function walk(dir, list) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, list);
    else if (entry.isFile()) list.push(full);
    else throw new Error('not a regular file or directory: ' + rel(full));
  });
  return list;
}

function collect() {
  const files = [];
  TREES.forEach((tree) => walk(tree, files));
  return files.map((file) => ({ file: file, path: rel(file), bytes: fs.statSync(file).size }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

function parse(text) {
  if (!text.endsWith('\r\n') || /(^|[^\r])\n/.test(text)) throw new Error('the inventory is not CRLF text');
  return text.split('\r\n').slice(0, -1).map((line, i) => {
    const m = /^([0-9A-F]{64}) {2}(.+)$/.exec(line);
    if (!m) throw new Error('line ' + (i + 1) + ' is not "<SHA-256>  <path>"');
    return { hash: m[1], path: m[2] };
  });
}

const totalBytes = (files) => files.reduce((sum, f) => sum + f.bytes, 0);
const mode = process.argv[2];
if (mode === 'write') {
  if (fs.existsSync(INVENTORY)) {
    console.log('REFUSED: ' + rel(INVENTORY) + ' exists; it is verified, never overwritten');
    process.exit(2);
  }
  const files = collect();
  const text = files.map((f) => sha256(f.file) + '  ' + f.path).join('\r\n') + '\r\n';
  fs.writeFileSync(INVENTORY, text, { flag: 'wx' });
  console.log('written ' + rel(INVENTORY) + ': ' + files.length + ' files, ' + totalBytes(files) + ' bytes');
} else if (mode === 'verify') {
  const problems = [];
  const listed = parse(fs.readFileSync(INVENTORY, 'utf8'));
  for (let i = 1; i < listed.length; i++) {
    if (!(listed[i - 1].path < listed[i].path)) problems.push('not sorted/unique at line ' + (i + 1));
  }
  const now = collect();
  const have = new Map(now.map((f) => [f.path, f]));
  const want = new Map(listed.map((l) => [l.path, l]));
  now.forEach((f) => { if (!want.has(f.path)) problems.push('extra file: ' + f.path); });
  listed.forEach((l) => {
    const f = have.get(l.path);
    if (!f) problems.push('missing file: ' + l.path);
    else if (sha256(f.file) !== l.hash) problems.push('hash differs: ' + l.path);
  });
  console.log('inventory ' + rel(INVENTORY) + ': ' + listed.length + ' lines; tree now ' + now.length +
    ' files, ' + totalBytes(now) + ' bytes; inventory sha256 ' + sha256(INVENTORY));
  problems.slice(0, 20).forEach((p) => console.log('PROBLEM ' + p));
  console.log(problems.length === 0 ? 'OK: file set and every hash equal' : problems.length + ' problems');
  process.exitCode = problems.length === 0 ? 0 : 1;
} else {
  console.log('usage: inventory.cjs write|verify');
  process.exitCode = 2;
}
