'use strict';

/*
 * MS17b scratch (file-only): the retention proof of the GD #21 repair. It compares
 *  (1) the inventory after the #15 repair (gd-inventory-after-repair.json) with the one after the #21 repair
 *      (gd-inventory-after-cap-repair.json): the test names do not change, so they must be equal name for name and in order;
 *  (2) the 23 planned selections (gd-plan.json, with the #15 rename substituted) with what the same `--filter` texts select
 *      from the new inventory;
 *  (3) the pre-repair copy of the manual test (gd/before/difficulty.test.js.pre-cap-repair) with the working file, hunk by hunk
 *      (`git diff --no-index -U0`, read-only): the hunks must lie inside the helper `exhaustedIn` and the one call of the
 *      downward-refinement test, and the other three call sites must be byte-identical.
 *   node generator/tests/artifacts/difficulty-v3/MS17b/gd-recheck-cap.cjs        (from the repository root)
 */
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS17b');
const names = (file) => JSON.parse(fs.readFileSync(path.join(EVIDENCE, file), 'utf8')).tests.map((t) => t.fullName);
const before = names('gd-inventory-after-repair.json');
const after = names('gd-inventory-after-cap-repair.json');
const plan = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'gd-plan.json'), 'utf8'));
let bad = 0;

const equal = before.length === after.length && before.every((n, i) => n === after[i]);
console.log('inventory after the #15 repair ' + before.length + ', after the #21 repair ' + after.length + ', equal name for name and order: ' + equal);
if (!equal || after.length !== 154) bad++;
const rename = { 'difficulty > difficulty: the score of rating v3 > reproduces the worked examples: classic9 499 and Samurai 633':
  'difficulty > difficulty: the score of rating v3 > reproduces the worked examples: published 499 and 633, current 499 and 593' };
plan.forEach((p) => {
  const lower = p.filter.toLowerCase();
  const selected = after.filter((n) => n.toLowerCase().indexOf(lower) !== -1);
  const expected = p.names.map((n) => rename[n] || n);
  const same = selected.length === expected.length && selected.every((n, i) => n === expected[i]);
  if (!same) bad++;
  console.log(String(p.order).padStart(2) + ' ' + p.id.padEnd(20) + ' selects ' + String(selected.length).padStart(2) + ' (planned ' + p.selected + ') ' +
    (same ? 'same names' : 'MISMATCH'));
});

const beforeFile = path.join(EVIDENCE, 'gd', 'before', 'difficulty.test.js.pre-cap-repair');
const afterFile = path.join(REPO, 'generator', 'tests', 'manual', 'difficulty.test.js');
const lines = fs.readFileSync(afterFile, 'utf8').split(/\r?\n/);
const helperAt = lines.findIndex((l) => l.indexOf('function exhaustedIn(') !== -1) + 1;
const helperStart = (() => { let i = helperAt; while (i > 1 && lines[i - 2].indexOf('/**') === -1 && lines[i - 2].indexOf('*') !== -1) i--; return i - 1; })();
let helperEnd = helperAt;
while (helperEnd <= lines.length && lines[helperEnd - 1] !== '    }') helperEnd++;
const itAt = lines.findIndex((l) => l.indexOf("it('runs out inside the downward refinement without passing the cap'") !== -1) + 1;
let itEnd = itAt;
while (itEnd <= lines.length && lines[itEnd - 1].indexOf('}, 60000);') === -1) itEnd++;
console.log('helper lines ' + helperStart + '-' + helperEnd + ', the refinement test lines ' + itAt + '-' + itEnd);
const diff = cp.spawnSync('git', ['--no-pager', 'diff', '--no-index', '--no-color', '-U0', beforeFile, afterFile], { encoding: 'utf8', maxBuffer: 1 << 26 });
const hunks = diff.stdout.split('\n').filter((l) => l.indexOf('@@') === 0);
hunks.forEach((h) => {
  const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(h);
  const first = Number(m[3]);
  const count = m[4] === undefined ? 1 : Number(m[4]);
  const last = count === 0 ? first : first + count - 1;
  const inside = (first >= helperStart && last <= helperEnd) || (first >= itAt && last <= itEnd);
  if (!inside) bad++;
  console.log('  hunk ' + h.split(' @@')[0] + ' @@: new lines ' + first + '-' + last + (inside ? ' inside the helper or the one test' : ' OUTSIDE'));
});
const added = diff.stdout.split('\n').filter((l) => /^\+[^+]/.test(l)).length;
const removed = diff.stdout.split('\n').filter((l) => /^-[^-]/.test(l)).length;
console.log(hunks.length + ' hunk(s), ' + added + ' line(s) added, ' + removed + ' removed');
const calls = lines.filter((l) => l.indexOf('exhaustedIn(') !== -1 && l.indexOf('function exhaustedIn') === -1).map((l) => l.trim());
console.log('call sites now:\n  ' + calls.join('\n  '));
const expectedCalls = ["exhaustedIn('classic9', 'nightmare', 3, 'refine', 1, 24);", "var run = exhaustedIn('classic9', 'hard', 3, 'search', 1);",
  "exhaustedIn('greaterThan', 'hard', 2, 'signs');", "exhaustedIn('killer', 'expert', 6, 'cages');"];
const callsOk = calls.length === 4 && calls.every((c, i) => c === expectedCalls[i]);
console.log('exactly the ruled call sites (only the first has the sixth argument 24): ' + callsOk);
if (!callsOk) bad++;
process.exit(bad ? 1 : 0);
