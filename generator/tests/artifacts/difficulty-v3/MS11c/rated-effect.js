'use strict';
// Scratch (MS11c, adapted from MS11b's): the 26 reference puzzles of tests/fixtures/rated.js rated with and without
// bugPlusOne, to record the reclassification effect (R20: levels, scores, requiredness, hardest technique, bugPlusOne
// uses). The 'without' rating unregisters bugPlusOne for the duration of the rating (that is exactly the behaviour of
// the previous task) and registers it again; the weight table is not touched.
const SG = require('./load.js');
const D = SG.difficulty;
const H = SG.techHelper;
const m9 = H.model('classic9');

function rateAll() {
  return SG.fixtures.rated.entries.map((e) => {
    const givens = H.parsePuzzle(m9, e.puzzle);
    const r = D.rate(m9, givens);
    return { name: e.name, level: r.level, score: r.score, hardest: r.hardestTechnique, counts: r.techniqueCounts,
      required: D.requiredOf(r, e.v3Expected.level, m9).required, expected: e.v3Expected };
  });
}

const withNew = rateAll();
const def = SG.techniques.get('bugPlusOne');
SG.techniques.unregister('bugPlusOne');
const without = rateAll();
SG.techniques.register({ id: def.id, group: def.group, baseCost: def.baseCost, order: def.order, i18nKey: def.i18nKey,
  variantScope: def.variantScope, assumesUniqueness: def.assumesUniqueness, find: def.find });

let changed = 0;
let levelChanged = 0;
let requiredChanged = 0;
let hardestChanged = 0;
const rows = withNew.map((w, i) => {
  const o = without[i];
  const diff = w.score !== o.score || w.hardest !== o.hardest || w.level !== o.level || w.required !== o.required;
  if (diff) changed++;
  if (w.level !== o.level) levelChanged++;
  if (w.required !== o.required) requiredChanged++;
  if (w.hardest !== o.hardest) hardestChanged++;
  return { name: w.name, expectedLevel: w.expected.level, levelWithout: o.level, levelWith: w.level,
    scoreWithout: o.score, scoreWith: w.score, hardestWithout: o.hardest, hardestWith: w.hardest,
    bugUsesWithout: o.counts.bugPlusOne || 0, bugUsesWith: w.counts.bugPlusOne || 0,
    requiredWithout: o.required, requiredWith: w.required,
    expectedMatches: w.level === w.expected.level && w.required === w.expected.required };
});
rows.forEach((r) => console.log(JSON.stringify(r)));
console.log('puzzles ' + rows.length + ', rating changed ' + changed + ', level changed ' + levelChanged +
  ', requiredness changed ' + requiredChanged + ', hardest changed ' + hardestChanged + ', all match v3Expected: ' +
  rows.every((r) => r.expectedMatches));
