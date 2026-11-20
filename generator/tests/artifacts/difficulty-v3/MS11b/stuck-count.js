'use strict';
// Scratch (MS11b): the two aggregates of the digger-target test "those passes meet every kind of objective" (the number of
// kept candidates with a score and the number of stuck ones, over the 29 real passes of the replay case list), printed for
// the tree and, with MS11b_BASE_WING=git:<commit>, for the wing engine of that commit (ef95fc5: MS11a, no hidden form).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11b/stuck-count.js
const SG = require('./load.js');
const D = SG.difficulty;
const CASES = [
  ['classic4', 'veryEasy', 4, false, 0.5], ['classic6', 'hard', 4, false, 0.25], ['diagonalX', 'hard', 4, false, null],
  ['classic9', 'veryEasy', 4, false, 0.5], ['classic9', 'veryEasy', 9, false, null], ['classic9', 'veryEasy', 14, false, 0.9],
  ['classic9', 'easy', 4, false, 0.5], ['classic9', 'easy', 9, false, 0.1], ['classic9', 'easy', 14, false, null],
  ['classic9', 'normal', 4, false, 0.5], ['classic9', 'normal', 9, false, 0.9], ['classic9', 'normal', 14, false, null],
  ['classic9', 'hard', 4, false, 0.5], ['classic9', 'hard', 9, false, 0.1], ['classic9', 'hard', 14, false, null],
  ['classic9', 'expert', 4, false, 0.5], ['classic9', 'expert', 9, false, 0.9], ['classic9', 'expert', 14, false, null],
  ['classic9', 'master', 4, false, 0.5], ['classic9', 'master', 9, false, 0.1], ['classic9', 'master', 14, false, null],
  ['classic9', 'normal', 4, true, null], ['classic9', 'expert', 9, true, 0.5], ['classic9', 'nightmare', 4, true, null],
  ['classic9', 'master', 7, true, 0.5], ['classic9', 'master', 16, true, null], ['classic9', 'hell1', 11, true, null],
  ['classic9', 'hell1', 13, true, null], ['classic9', 'hell1', 30, true, null]
];
let scores = 0;
let stuck = 0;
const per = [];
CASES.forEach((c) => {
  const model = SG.variants.get(c[0]).build({}, null);
  const rng = SG.rng.create(c[2]);
  const solution = SG.fullGrid.generate(model, rng.fork('grid'), null);
  const spec = D.spec(c[1], model);
  const target = c[4] === null || spec.max === Infinity ? null : spec.min + c[4] * (spec.max - spec.min);
  const log = [];
  SG.digger.digStage(model, solution, c[1], rng.fork('dig'), { log, proposal: c[3], target });
  let s = 0;
  let k = 0;
  log.forEach((e) => { if (e.op === 'keep') { if (e.score === null) k++; else s++; } });
  scores += s;
  stuck += k;
  per.push(c.join('/') + ': scores ' + s + ', stuck ' + k);
});
console.log(process.env.MS11b_BASE_WING ? 'base ' + process.env.MS11b_BASE_WING : 'tree');
per.forEach((l) => console.log('  ' + l));
console.log('scores ' + scores + ', stuck ' + stuck);
