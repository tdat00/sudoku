'use strict';

/*
 * MS17b scratch: the GD plan (file-only, no generation). Builds the list of commands of the bounded GD of the current manual
 * `difficulty` suite from the registration-only inventory (evidence/MS17b/gd-inventory.json): one command per offered classic9 level
 * batch (Nightmare first, Hell 1 early), one for the confusion-matrix test, and one per remaining top-level group, each with its
 * exact `--filter` text, the number of tests it selects (case-insensitive substring of the full name, as the runner does), the
 * MS07e process seconds that serve as the OLDER-SOURCE planning basis and the conservative bound derived from it:
 *     bound = ceil(older-source seconds * GROWTH) + STARTUP
 * where GROWTH = 8 is the worst observed classic9 whole-generation growth between the MS07e and MS16 hash families (x5.31 at
 * classic9/nightmare, hash-growth.cjs) times a margin of 1.5, rounded up. A command is admitted only when its bound is <= 450 s.
 * It checks that the selections are disjoint and cover all 154 inventory tests exactly once, and writes gd-plan.json.
 *   node generator/tests/artifacts/difficulty-v3/MS17b/gd-plan.cjs
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS17b');
const inventory = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'gd-inventory.json'), 'utf8'));
const GROWTH = 8;
const STARTUP = 10;
const ADMIT = 450;
const BATCH = 'difficulty > digger.generate: classic9 puzzles per level (hit rate, invariants I1-I7, time) > ';

/* [id, filter, MS07e process seconds (docs/difficulty-v3/evidence/MS07e/gd/reconciled.md)] in the order of execution. */
const groups = [
  ['classic9-nightmare', BATCH + 'nightmare >', 17.317],
  ['classic9-hell1', BATCH + 'hell1 >', 113.613],
  ['classic9-veryEasy', BATCH + 'veryEasy >', 0.734],
  ['classic9-easy', BATCH + 'easy >', 23.911],
  ['classic9-normal', BATCH + 'normal >', 30.464],
  ['classic9-hard', BATCH + 'hard >', 3.509],
  ['classic9-expert', BATCH + 'expert >', 3.514],
  ['classic9-master', BATCH + 'master >', 8.227],
  ['confusion-matrix', BATCH + 'is a confusion matrix', 191.687],
  ['levels', 'difficulty > difficulty: levels >', 0.943],
  ['spec9', 'difficulty > difficulty: spec(level, model) on a 9x9 board >', 0.463],
  ['spec-other', 'difficulty > difficulty: spec on other boards, and difficultySupport >', 0.486],
  ['qualification', 'difficulty > qualification: tests/qualify.js counts every request', 3.782],
  ['clue-floor', 'difficulty > difficulty: the clue floor of a variant (clueFloor) >', 0.495],
  ['score-v3', 'difficulty > difficulty: the score of rating v3 >', 0.612],
  ['score-table', 'difficulty > difficulty: the Difficulty Score table (section 5.6) >', 0.493],
  ['labelled', 'difficulty > difficulty: labelled puzzles (fixtures/rated.js) >', 1.381],
  ['removing', 'difficulty > difficulty: removing a clue (the score is not monotone under clue removal, section 5.1) >', 0.716],
  ['oracle', 'difficulty > digger: technique-bounded oracle >', 0.936],
  ['guarantees', 'difficulty > digger.generate: guarantees >', 41.681],
  ['cap', 'difficulty > digger.generate: the full-rating cap of an attempt (section 5.7 (9)) >', 5.688],
  ['unreachable', 'difficulty > digger.generate: when the level cannot be reached >', 0.753],
  ['safety', 'difficulty > digger.generate: safety net against a technique bug (risk R3) >', 5.213]
];

const plan = groups.map((g, i) => {
  const lower = g[1].toLowerCase();
  const names = inventory.tests.filter((t) => t.fullName.toLowerCase().indexOf(lower) !== -1).map((t) => t.fullName);
  const bound = Math.ceil(g[2] * GROWTH) + STARTUP;
  return {
    order: i + 1, id: g[0], filter: g[1], selected: names.length, older: g[2], bound: bound,
    admitted: bound <= ADMIT, names: names
  };
});

const seen = {};
let duplicated = 0;
plan.forEach((p) => p.names.forEach((n) => { if (seen[n]) duplicated++; seen[n] = (seen[n] || 0) + 1; }));
const missing = inventory.tests.filter((t) => !seen[t.fullName]).length;
const total = plan.reduce((s, p) => s + p.selected, 0);

console.log('| # | command | filter | selects | MS07e s | bound s | admitted |');
console.log('|---:|---|---|---:|---:|---:|---|');
plan.forEach((p) => console.log('| ' + p.order + ' | ' + p.id + ' | `' + p.filter + '` | ' + p.selected + ' | ' + p.older + ' | ' + p.bound +
  ' | ' + (p.admitted ? 'yes' : 'NO (> ' + ADMIT + ' s)') + ' |'));
console.log('');
console.log('inventory ' + inventory.tests.length + ', selected in all ' + total + ', duplicated ' + duplicated + ', missing ' + missing +
  ', empty selectors ' + plan.filter((p) => p.selected === 0).length +
  ', admitted ' + plan.filter((p) => p.admitted).length + ' of ' + plan.length +
  ', admitted tests ' + plan.filter((p) => p.admitted).reduce((s, p) => s + p.selected, 0));
fs.writeFileSync(path.join(EVIDENCE, 'gd-plan.json'), JSON.stringify(plan.map((p) => ({
  order: p.order, id: p.id, filter: p.filter, selected: p.selected, olderSourceSeconds: p.older, boundSeconds: p.bound,
  admitted: p.admitted, names: p.names
})), null, 1).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
process.exit(duplicated === 0 && missing === 0 && plan.every((p) => p.selected > 0) ? 0 : 1);
