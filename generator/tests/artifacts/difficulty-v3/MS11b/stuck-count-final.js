'use strict';
// Scratch (MS11b, after SA2's post-E ruling): the two aggregates of the digger-target test "those passes meet every kind of
// objective" (kept candidates with a score, stuck ones) over the real-pass CASES **read from the test file itself**
// (generator/tests/suites/digger-target.test.js, the updated list), by the same pass() construction as the test. Also prints
// the per-pass line, the refusal reasons met, the number of accepted removals ("applied") and the number of passes. With
// MS11b_BASE_WING=git:<commit> the wing engine of that commit is used instead of the tree's (the list stays the updated one).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11b/stuck-count-final.js
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const D = SG.difficulty;
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const source = fs.readFileSync(path.join(ROOT, 'tests/suites/digger-target.test.js'), 'utf8');
const text = /var CASES = (\[[\s\S]*?\n    \]);/.exec(source)[1];
const CASES = new Function('return ' + text)();
let scores = 0;
let stuck = 0;
let applied = 0;
const reasons = {};
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
  let a = 0;
  let seenGuided = false;
  log.forEach((e) => {
    if (e.op === 'pass' && e.pass === 'guided') seenGuided = true;
    if (e.op === 'reject') reasons[e.reason] = true;
    if (e.op === 'keep') { if (e.score === null) k++; else s++; }
    if (e.op === 'accept' && seenGuided) a++;
  });
  scores += s;
  stuck += k;
  applied += a;
  per.push(c.join('/') + ': scores ' + s + ', stuck ' + k + ', guided accepts ' + a);
});
console.log(process.env.MS11b_BASE_WING ? 'base ' + process.env.MS11b_BASE_WING : 'tree');
console.log('cases read from the test file: ' + CASES.length);
per.forEach((l) => console.log('  ' + l));
console.log('scores ' + scores + ', stuck ' + stuck + ', refusal reasons ' + Object.keys(reasons).sort().join('+') +
  ', guided accepts ' + applied);
