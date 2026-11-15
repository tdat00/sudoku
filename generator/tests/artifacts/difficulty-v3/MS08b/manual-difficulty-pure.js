'use strict';
// Scratch (MS08b): evaluates, without the manual runner, the two pure assertions of generator/tests/manual/difficulty.test.js that
// this task edited (the weight table of section 5.2 and the first technique of each level), against the real registry.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS08b/manual-difficulty-pure.js
const SG = require('./load.js');
const D = SG.difficulty;
const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];
const board9 = SG.fixtures.models.boxGrid('boxGrid9', 3, 3);
const specs = LEVELS.map((level) => D.spec(level, board9));
const idx = (level) => D.levelIndex(level);
const table = {
  nakedSingle: 1, hiddenSingleBox: 1.25, hiddenSingleLine: 1.5, pointing: 40, boxLine: 50,
  nakedPair: 120, hiddenPair: 145, nakedTriple: 180, hiddenTriple: 220, nakedQuad: 260, hiddenQuad: 300,
  xWing: 320, skyscraper: 330, twoStringKite: 340, simpleColouring: 360, swordfish: 420, jellyfish: 520, xyWing: 650,
  xyzWing: 750, wWing: 850, uniqueRectangle: 900, forcingChain: 1100, forcingChainLong: 1400,
  nishio: 1700, nishioDeep: 2600, cageCombo: 40, ruleOf45: 260, cageSplit: 520, ineqChain: 40,
  minMaxForcing: 180
};
const sameTable = JSON.stringify(Object.keys(table).sort()) === JSON.stringify(Object.keys(D.WEIGHTS).sort()) &&
  Object.keys(table).every((k) => table[k] === D.WEIGHTS[k]);
console.log('weight table equal: ' + sameTable);
const allowedOk = specs.every((spec) => {
  const expected = SG.techniques.list().filter((t) => SG.techniques.appliesTo(t, 'boxGrid9') &&
    (spec.max === Infinity || 1.25 * D.WEIGHTS[t.id] < spec.max)).map((t) => t.id);
  return JSON.stringify(spec.allowedTechniques) === JSON.stringify(expected);
});
console.log('allowed techniques follow the rule at every level: ' + allowedOk);
const firsts = { easy: ['pointing', 'boxLine', 'nakedPair'], normal: ['hiddenPair', 'hiddenQuad'],
  hard: ['xWing', 'skyscraper', 'twoStringKite', 'jellyfish'], expert: ['xyWing', 'xyzWing'], master: ['wWing', 'forcingChain'],
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
process.exit(sameTable && allowedOk && firstsOk ? 0 : 1);
