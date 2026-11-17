'use strict';
// Scratch (MS14b, from MS10b's): evaluates, without the manual runner, the pure assertions of generator/tests/manual/difficulty.test.js
// that this task edited or that the registration could change, against the real registry: the weight table of section 5.2 (the object
// literal is read from the test file itself, so the pin evaluated is the pin written), the rule of the allowed techniques at every
// level of a plain 3x3 board (lawOfLeftovers is scoped to jigsaw9, so none changes there) and the first techniques of each level.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS14b/manual-difficulty-pure.js
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const D = SG.difficulty;
const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];
const board9 = SG.fixtures.models.boxGrid('boxGrid9', 3, 3);
const specs = LEVELS.map((level) => D.spec(level, board9));
const idx = (level) => D.levelIndex(level);
const text = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'manual', 'difficulty.test.js'), 'utf8');
const literal = /expect\(D\.WEIGHTS\)\.toEqual\((\{[\s\S]*?\})\);/.exec(text);
if (!literal) throw new Error('the weight table pin was not found');
const table = new Function('return ' + literal[1])();
const sameTable = JSON.stringify(Object.keys(table).sort()) === JSON.stringify(Object.keys(D.WEIGHTS).sort()) &&
  Object.keys(table).every((k) => table[k] === D.WEIGHTS[k]);
console.log('weight table of the test equals SG.difficulty.WEIGHTS (' + Object.keys(table).length + ' entries, lawOfLeftovers ' + table.lawOfLeftovers + '): ' + sameTable);
const allowedOk = specs.every((spec) => {
  const expected = SG.techniques.list().filter((t) => SG.techniques.appliesTo(t, 'boxGrid9') &&
    (spec.max === Infinity || 1.25 * D.WEIGHTS[t.id] < spec.max)).map((t) => t.id);
  return JSON.stringify(spec.allowedTechniques) === JSON.stringify(expected);
});
console.log('allowed techniques follow the rule at every level of a boxGrid9 board: ' + allowedOk);
const noLeftovers = specs.every((spec) => spec.allowedTechniques.indexOf('lawOfLeftovers') === -1);
console.log('no level of a boxGrid9 board allows lawOfLeftovers: ' + noLeftovers);
const firsts = { easy: ['pointing', 'boxLine', 'nakedPair'], normal: ['hiddenPair', 'hiddenQuad'],
  hard: ['xWing', 'skyscraper', 'twoStringKite', 'remotePairs', 'emptyRectangle', 'finnedXWing', 'finnedSwordfish', 'jellyfish'],
  expert: ['xyWing', 'xyzWing'], master: ['wxyzWing', 'wWing', 'bugPlusOne', 'xyChain', 'forcingChain'],
  nightmare: ['forcingChainLong', 'nishio'], hell1: ['nishioDeep'] };
let firstsOk = true;
Object.keys(firsts).forEach((level) => {
  const i = idx(level);
  firsts[level].forEach((id) => {
    const inLevel = specs[i].allowedTechniques.indexOf(id) !== -1;
    const notBefore = specs[i - 1].allowedTechniques.indexOf(id) === -1;
    if (!(inLevel && notBefore)) { firstsOk = false; console.log('FIRST FAILS ' + level + ' ' + id); }
  });
});
console.log('firsts per level hold: ' + firstsOk);
process.exit(sameTable && allowedOk && noLeftovers && firstsOk ? 0 : 1);
