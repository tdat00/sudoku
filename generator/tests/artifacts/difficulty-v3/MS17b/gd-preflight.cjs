'use strict';

/*
 * MS17b scratch: the GD selector preflight. For each of the 23 planned commands of evidence/MS17b/gd-plan.json it runs the runner in
 * registration-only mode (`--suite=difficulty --filter=<text> --list-tests=<file>`: no test, hook or benchmark runs) into
 * evidence/MS17b/gd/selectors/<id>.json, reads the selected test names back and compares them with the plan: the count must be the
 * planned one (nonzero) and the names must be exactly the planned names. It prints one line per command and a final check that the
 * union of the 23 selections is the 154 inventory names exactly once. Exit 1 on any mismatch.
 *   node generator/tests/artifacts/difficulty-v3/MS17b/gd-preflight.cjs            (from the repository root; each runner call ~0.4 s)
 */
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS17b');
const plan = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'gd-plan.json'), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'gd-inventory.json'), 'utf8'));
fs.mkdirSync(path.join(EVIDENCE, 'gd', 'selectors'), { recursive: true });

let bad = 0;
const seen = {};
plan.forEach((p) => {
  const rel = path.join('..', 'docs', 'difficulty-v3', 'evidence', 'MS17b', 'gd', 'selectors', p.id + '.json');
  const started = Date.now();
  const run = cp.spawnSync(process.execPath, ['tests/node-runner.js', '--suite=difficulty', '--filter=' + p.filter, '--list-tests=' + rel],
    { cwd: path.join(REPO, 'generator'), encoding: 'utf8' });
  const seconds = (Date.now() - started) / 1000;
  let names = [];
  if (run.status === 0) {
    names = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'gd', 'selectors', p.id + '.json'), 'utf8')).tests.map((t) => t.fullName);
  }
  names.forEach((n) => { seen[n] = (seen[n] || 0) + 1; });
  const same = names.length === p.selected && names.length > 0 && names.every((n, i) => n === p.names[i]);
  if (!same) bad++;
  console.log(String(p.order).padStart(2) + ' ' + p.id.padEnd(20) + ' selects ' + String(names.length).padStart(2) + ' (planned ' + p.selected +
    ') ' + (same ? 'same names' : 'MISMATCH') + '  exit ' + run.status + '  ' + seconds.toFixed(2) + ' s');
});
const union = Object.keys(seen).length;
const duplicated = Object.keys(seen).filter((k) => seen[k] > 1).length;
const missing = inventory.tests.filter((t) => !seen[t.fullName]).length;
console.log('union ' + union + ' names, duplicated ' + duplicated + ', inventory names not selected ' + missing + ', inventory ' + inventory.tests.length);
if (union !== 154 || duplicated || missing) bad++;
process.exit(bad ? 1 : 0);
