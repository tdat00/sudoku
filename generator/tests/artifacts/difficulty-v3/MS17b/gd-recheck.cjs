'use strict';

/*
 * MS17b scratch (file-only): the retention proof of the GD #15 repair. It compares
 *  (1) the original inventory (gd-inventory.json, before) with the one taken after the edit (gd-inventory-after-repair.json):
 *      154 tests each and exactly which full names differ, as an old-name -> new-name mapping;
 *  (2) the 23 planned selections (gd-plan.json) with what the same `--filter` texts select from the new inventory (case-insensitive
 *      substring of the full name, as the runner does), with the renamed test substituted: counts and names;
 *  (3) the pre-repair copy of the manual test (gd/before/difficulty.test.js.pre-repair) with the working file, hunk by hunk
 *      (`git diff --no-index -U0`, read-only), and whether every changed line of the new file lies inside the one repaired test.
 *   node generator/tests/artifacts/difficulty-v3/MS17b/gd-recheck.cjs        (from the repository root)
 */
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS17b');
const before = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'gd-inventory.json'), 'utf8')).tests.map((t) => t.fullName);
const after = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'gd-inventory-after-repair.json'), 'utf8')).tests.map((t) => t.fullName);
const plan = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'gd-plan.json'), 'utf8'));
let bad = 0;

const onlyBefore = before.filter((n) => after.indexOf(n) === -1);
const onlyAfter = after.filter((n) => before.indexOf(n) === -1);
console.log('inventory before ' + before.length + ', after ' + after.length + '; names only before ' + onlyBefore.length + ', only after ' +
  onlyAfter.length);
onlyBefore.forEach((n, i) => console.log('  ' + n + '\n  -> ' + onlyAfter[i]));
if (before.length !== 154 || after.length !== 154 || onlyBefore.length !== 1 || onlyAfter.length !== 1) bad++;
const rename = {};
if (onlyBefore.length === 1 && onlyAfter.length === 1) rename[onlyBefore[0]] = onlyAfter[0];

plan.forEach((p) => {
  const lower = p.filter.toLowerCase();
  const names = after.filter((n) => n.toLowerCase().indexOf(lower) !== -1);
  const expected = p.names.map((n) => rename[n] || n);
  const same = names.length === expected.length && names.every((n, i) => n === expected[i]);
  if (!same) bad++;
  console.log(String(p.order).padStart(2) + ' ' + p.id.padEnd(20) + ' selects ' + String(names.length).padStart(2) + ' (planned ' + p.selected +
    ') ' + (same ? 'same names (renamed substituted)' : 'MISMATCH'));
});

const beforeFile = path.join(EVIDENCE, 'gd', 'before', 'difficulty.test.js.pre-repair');
const afterFile = path.join(REPO, 'generator', 'tests', 'manual', 'difficulty.test.js');
const diff = cp.spawnSync('git', ['--no-pager', 'diff', '--no-index', '--no-color', '-U0', beforeFile, afterFile], { encoding: 'utf8', maxBuffer: 1 << 26 });
const lines = fs.readFileSync(afterFile, 'utf8').split(/\r?\n/);
const start = lines.findIndex((l) => l.indexOf("it('reproduces the worked examples: published 499 and 633, current 499 and 593'") !== -1) + 1;
let end = start;
while (end <= lines.length && lines[end - 1] !== '    });') end++;
console.log('the repaired test occupies lines ' + start + '-' + end + ' of the new file');
const hunks = diff.stdout.split('\n').filter((l) => l.indexOf('@@') === 0);
hunks.forEach((h) => {
  const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(h);
  const first = Number(m[3]);
  const count = m[4] === undefined ? 1 : Number(m[4]);
  const last = count === 0 ? first : first + count - 1;
  const inside = first >= start && last <= end;
  if (!inside) bad++;
  console.log('  hunk ' + h.split(' @@')[0] + ' @@: new lines ' + first + '-' + last + (inside ? ' inside the test' : ' OUTSIDE the test'));
});
const added = diff.stdout.split('\n').filter((l) => /^\+[^+]/.test(l)).length;
const removed = diff.stdout.split('\n').filter((l) => /^-[^-]/.test(l)).length;
console.log(hunks.length + ' hunk(s), ' + added + ' line(s) added, ' + removed + ' removed');
process.exit(bad ? 1 : 0);
