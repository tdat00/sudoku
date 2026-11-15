'use strict';
// Scratch (MS08b): the 26 reference puzzles of tests/fixtures/rated.js rated with and without twoStringKite, to record
// the reclassification effect (levels, scores, hardest technique, twoStringKite uses). The 'without' rating unregisters
// twoStringKite and removes its weight for the duration of that pass only.
const SG = require('./load.js');
const D = SG.difficulty;
const H = SG.techHelper;
const m9 = H.model('classic9');

function rateAll() {
  return SG.fixtures.rated.entries.map((e) => {
    const r = D.rate(m9, H.parsePuzzle(m9, e.puzzle));
    return { name: e.name, level: r.level, score: r.score, hardest: r.hardestTechnique, counts: r.techniqueCounts,
      required: D.requiredOf(r, e.v3Expected.level, m9).required, expected: e.v3Expected };
  });
}

const withKite = rateAll();
const def = SG.techniques.get('twoStringKite');
const weight = D.WEIGHTS.twoStringKite;
SG.techniques.unregister('twoStringKite');
delete D.WEIGHTS.twoStringKite;
const without = rateAll();
SG.techniques.register(def);
D.WEIGHTS.twoStringKite = weight;

let changed = 0;
let levelChanged = 0;
const rows = withKite.map((w, i) => {
  const o = without[i];
  const kite = w.counts.twoStringKite || 0;
  const diff = w.score !== o.score || w.hardest !== o.hardest || w.level !== o.level;
  if (diff) changed++;
  if (w.level !== o.level) levelChanged++;
  return { name: w.name, expectedLevel: w.expected.level, levelWithout: o.level, levelWith: w.level,
    scoreWithout: o.score, scoreWith: w.score, hardestWithout: o.hardest, hardestWith: w.hardest, twoStringKiteUses: kite,
    expectedMatches: w.level === w.expected.level && w.required === w.expected.required };
});
rows.forEach((r) => console.log(JSON.stringify(r)));
console.log('puzzles ' + rows.length + ', rating changed ' + changed + ', level changed ' + levelChanged +
  ', all match v3Expected: ' + rows.every((r) => r.expectedMatches));
