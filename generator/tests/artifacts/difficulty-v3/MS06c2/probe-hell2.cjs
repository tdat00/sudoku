'use strict';

/*
 * MS06c2 scratch: the Hell 2 local-search scenario of `pipeline.test.js` (a level without an upper bound has no
 * target): prints the ratings the search asks for and how the local search ended.
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
const open = SG.variants.get('diagonalX').build({}, null);
const BASIC = { nakedSingle: 40, hiddenSingleBox: 8, pointing: 3, nakedPair: 2 };
const tier = D.spec('hell2', open).tierTechniques[0];
console.log('tier', tier, 'spec.proposal', D.spec('hell2', open).proposal);

function rated(level, score, counts) {
  return { level, score, rawScore: score, hardestTechnique: 'nakedSingle', hardestGroup: 'basic', confidence: 1,
    solved: true, empties: 50, techniqueCounts: counts, ratingVersion: D.RATING_VERSION };
}
const req = Object.assign({}, BASIC);
req[tier] = 1;
const seq = [rated('hell2', 5000, BASIC), rated('hell2', 5100, BASIC), rated('hell2', 5050, BASIC),
  rated('hell2', 5100, BASIC), rated('hell2', 5200, BASIC), rated('hell2', 5000, req)];
let n = 0;
const real = D.rate;
D.rate = function () {
  const r = seq[n] || null;
  console.log('rate call', n, r ? r.score : 'beyond');
  n++;
  if (!r) throw new Error('rating beyond the script');
  return r;
};
const strategy = function (model, solution, level, rng, o) {
  const base = Z.dig(model, solution, rng.fork('base'), { minClues: 58 });
  return { givens: base.givens, clues: base.clues, stats: base.stats };
};
let out;
try {
  out = Z.generate(open, 'hell2', SG.rng.create(11), { strategy, maxAttempts: 1, digTries: 1 });
} finally {
  D.rate = real;
}
console.log('exact', out.exact, 'target', out.target, 'accepted', out.stats.accepted, 'work', JSON.stringify(out.work));
