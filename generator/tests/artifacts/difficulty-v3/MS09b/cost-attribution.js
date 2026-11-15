'use strict';
// Scratch (MS09b): what finnedSwordfish costs inside a rating, for the standing-cost record (S-AV08): the 26 reference
// puzzles of tests/fixtures/rated.js rated with and without it (it is unregistered for the 'without' passes, as in
// rated-effect.js), five alternating passes each, the wall seconds of every pass and their median.
//   node tests/artifacts/difficulty-v3/MS09b/cost-attribution.js
const SG = require('./load.js');
const D = SG.difficulty;
const H = SG.techHelper;
const m9 = H.model('classic9');

function rateAll() {
  const t0 = process.hrtime.bigint();
  SG.fixtures.rated.entries.forEach((e) => D.rate(m9, H.parsePuzzle(m9, e.puzzle)));
  return Number(process.hrtime.bigint() - t0) / 1e9;
}

const def = SG.techniques.get('finnedSwordfish');
const weight = D.WEIGHTS.finnedSwordfish;
const withTimes = [];
const withoutTimes = [];
rateAll();
for (let i = 0; i < 5; i++) {
  withTimes.push(rateAll());
  SG.techniques.unregister('finnedSwordfish');
  delete D.WEIGHTS.finnedSwordfish;
  withoutTimes.push(rateAll());
  SG.techniques.register(def);
  D.WEIGHTS.finnedSwordfish = weight;
}
const median = (list) => list.slice().sort((a, b) => a - b)[Math.floor(list.length / 2)];
const fmt = (list) => list.map((x) => x.toFixed(3)).join(' ');
console.log('26 references, wall seconds per pass');
console.log('with    : ' + fmt(withTimes) + '  median ' + median(withTimes).toFixed(3));
console.log('without : ' + fmt(withoutTimes) + '  median ' + median(withoutTimes).toFixed(3));
console.log('ratio of medians ' + (median(withTimes) / median(withoutTimes)).toFixed(3));
