'use strict';

/*
 * MS06c2 scratch: why does the MS05b1-T02 sign-memo scenario rate the same (givens, signs) pair twice under the
 * strictly-better local predicate? Prints the first duplicate with the move kind of its two proposals.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const runner = fs.readFileSync(path.join(ROOT, 'tests/node-runner.js'), 'utf8');
const match = /const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner);
for (const rel of (match[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1))) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) vm.runInThisContext(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''), { filename: abs });
}
const SG = globalThis.SG;
const D = SG.difficulty;
const Z = SG.digger;
const model9 = SG.variants.get('classic9').build({}, null);
const greater = SG.variants.get('greaterThan');
const BASIC = { nakedSingle: 40, hiddenSingleBox: 8, pointing: 3, nakedPair: 2 };

function rated(level, score, counts) {
  return { level, score, rawScore: score, hardestTechnique: 'nakedSingle', hardestGroup: 'basic', confidence: 1,
    solved: true, empties: 50, techniqueCounts: counts, ratingVersion: D.RATING_VERSION };
}

let signs0 = 0;
const calls = [];
const real = D.rate;
D.rate = function (model, givens) {
  const call = { signs: model.inequalities.length, key: Array.from(givens).join('') };
  calls.push(call);
  return rated('normal', 250 + Math.min(100, signs0 - model.inequalities.length), BASIC);
};
SG.digger.SHALLOW_SEARCH_RATINGS = Infinity;
const strategy = function (model, solution, level, rng, o) {
  signs0 = model.inequalities.length;
  const dug = Z.dig(model, solution, rng.fork('base'), { minClues: 40 });
  o.log.push({ op: 'signs', signs: model.inequalities.map((s) => [s.a, s.b]) });
  return { givens: dug.givens, clues: dug.clues, stats: dug.stats, rating: rated('normal', 250, BASIC) };
};
const out = Z.generate(greater.build({}, SG.rng.create(1)), 'normal', SG.rng.create(11), {
  strategy, postGenerate: greater.postGenerate, maxAttempts: 1, digTries: 1, maxProposals: 400
});
D.rate = real;
const seen = new Map();
let dup = null;
calls.forEach((c, i) => {
  const k = c.key + '|' + c.signs;
  if (seen.has(k) && dup === null) dup = [seen.get(k), i, c.signs];
  seen.set(k, i);
});
console.log('signs0', signs0, 'ratings', calls.length, 'signs sequence', calls.map((c) => c.signs).join(','));
console.log('first duplicate (index, index, signs):', JSON.stringify(dup), 'accepted', out.stats.accepted, 'warnings', out.warnings.join(','));
