'use strict';
// Scratch (MS16, from MS15b's): evaluates, without the manual runner, the pure assertions of
// generator/tests/manual/difficulty.test.js that this task edited or that the registration of sueDeCoq could change, against the
// real registry: the weight table of section 5.2 and the `firsts` of the allowed-techniques rule (both literals are read from the
// test file itself, so the pins evaluated are the pins written), the rule of the allowed techniques at every level of a plain 3x3
// board, and the level that first admits sueDeCoq. The manual suite itself is not run.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS16/manual-difficulty-pure.js
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const D = SG.difficulty;
const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];
const board9 = SG.fixtures.models.boxGrid('boxGrid9', 3, 3);
const specs = LEVELS.map((level) => D.spec(level, board9));
const idx = (level) => D.levelIndex(level);
const text = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'manual', 'difficulty.test.js'), 'utf8');
let ok = true;
const report = (label, value) => { console.log(label + ': ' + value); if (value !== true) ok = false; };

const literal = /expect\(D\.WEIGHTS\)\.toEqual\((\{[\s\S]*?\})\);/.exec(text);
if (!literal) throw new Error('the weight table pin was not found');
const table = new Function('return ' + literal[1])();
const sameTable = JSON.stringify(Object.keys(table).sort()) === JSON.stringify(Object.keys(D.WEIGHTS).sort()) &&
  Object.keys(table).every((k) => table[k] === D.WEIGHTS[k]);
console.log('weight table of the test: ' + Object.keys(table).length + ' entries, alsXz ' + table.alsXz + ', sueDeCoq ' + table.sueDeCoq);
report('weight table of the test equals SG.difficulty.WEIGHTS', sameTable);

const allowedOk = specs.every((spec) => {
  const expected = SG.techniques.list().filter((t) => SG.techniques.appliesTo(t, 'boxGrid9') &&
    (spec.max === Infinity || 1.25 * D.WEIGHTS[t.id] < spec.max)).map((t) => t.id);
  return JSON.stringify(spec.allowedTechniques) === JSON.stringify(expected);
});
report('allowed techniques follow the rule at every level of a boxGrid9 board', allowedOk);
report('the first level allows the three singles only',
  JSON.stringify(specs[0].allowedTechniques) === JSON.stringify(['nakedSingle', 'hiddenSingleBox', 'hiddenSingleLine']));

const firstsText = /var firsts = (\{[\s\S]*?\});/.exec(text);
if (!firstsText) throw new Error('the firsts pin was not found');
const firsts = new Function('return ' + firstsText[1])();
let firstsOk = true;
Object.keys(firsts).forEach((level) => {
  const i = idx(level);
  firsts[level].forEach((id) => {
    const inLevel = specs[i].allowedTechniques.indexOf(id) !== -1;
    const notBefore = specs[i - 1].allowedTechniques.indexOf(id) === -1;
    if (!(inLevel && notBefore)) { firstsOk = false; console.log('FIRST FAILS ' + level + ' ' + id); }
  });
});
console.log('nightmare firsts of the test: ' + JSON.stringify(firsts.nightmare));
report('firsts per level hold', firstsOk);
report('hiddenPair is not allowed at easy', specs[1].allowedTechniques.indexOf('hiddenPair') === -1);
report('xWing is not allowed at normal', specs[2].allowedTechniques.indexOf('xWing') === -1);
report('hell1 and hell2 allow the same techniques',
  JSON.stringify(specs[7].allowedTechniques) === JSON.stringify(specs[8].allowedTechniques));
console.log('sueDeCoq is first allowed at: ' + LEVELS.find((level) => specs[idx(level)].allowedTechniques.indexOf('sueDeCoq') !== -1) +
  '; weight x 1.25 = ' + 1.25 * D.WEIGHTS.sueDeCoq + ', nightmare band ' + specs[idx('nightmare')].min + '..' + specs[idx('nightmare')].max);
process.exit(ok ? 0 : 1);
