'use strict';
// Scratch (MS11a): the 26 reference puzzles of tests/fixtures/rated.js rated with and without the Unique Rectangle types 3 and
// 4, to record the reclassification effect (levels, scores, hardest technique, uniqueRectangle uses by subtype). The
// 'without' rating re-registers uniqueRectangle with a finder that returns nothing where the real one returns a type 3 or a
// type 4 (types 3 and 4 only run after the first pass found nothing, so this is exactly the previous behaviour) for the duration of
// that pass only; the weight is unchanged.
const SG = require('./load.js');
const D = SG.difficulty;
const H = SG.techHelper;
const m9 = H.model('classic9');

function rateAll() {
  return SG.fixtures.rated.entries.map((e) => {
    const givens = H.parsePuzzle(m9, e.puzzle);
    const r = D.rate(m9, givens);
    const steps = SG.logicalSolver.solve(m9, givens, { collectSteps: true }).steps.filter((s) => s.technique === 'uniqueRectangle');
    const bySubtype = {};
    steps.forEach((s) => { const k = s.i18nKey.replace('technique.uniqueRectangle.', '').replace('.step', ''); bySubtype[k] = (bySubtype[k] || 0) + 1; });
    return { name: e.name, level: r.level, score: r.score, hardest: r.hardestTechnique, counts: r.techniqueCounts, bySubtype,
      required: D.requiredOf(r, e.v3Expected.level, m9).required, expected: e.v3Expected };
  });
}

const withNew = rateAll();
const def = SG.techniques.get('uniqueRectangle');
SG.techniques.unregister('uniqueRectangle');
SG.techniques.register({ id: def.id, group: def.group, baseCost: def.baseCost, order: def.order, i18nKey: def.i18nKey,
  variantScope: def.variantScope, assumesUniqueness: def.assumesUniqueness,
  find: (model, state, ctx) => {
    const f = def.find(model, state, ctx);
    return f !== null && /type[34]\.step$/.test(f.i18nKey) ? null : f;
  } });
const without = rateAll();
SG.techniques.unregister('uniqueRectangle');
SG.techniques.register(def);

let changed = 0;
let levelChanged = 0;
const rows = withNew.map((w, i) => {
  const o = without[i];
  const diff = w.score !== o.score || w.hardest !== o.hardest || w.level !== o.level || w.required !== o.required;
  if (diff) changed++;
  if (w.level !== o.level) levelChanged++;
  return { name: w.name, expectedLevel: w.expected.level, levelWithout: o.level, levelWith: w.level,
    scoreWithout: o.score, scoreWith: w.score, hardestWithout: o.hardest, hardestWith: w.hardest,
    urUsesWithout: o.counts.uniqueRectangle || 0, urUsesWith: w.counts.uniqueRectangle || 0, subtypesWith: w.bySubtype,
    requiredWithout: o.required, requiredWith: w.required,
    expectedMatches: w.level === w.expected.level && w.required === w.expected.required };
});
rows.forEach((r) => console.log(JSON.stringify(r)));
console.log('puzzles ' + rows.length + ', rating changed ' + changed + ', level changed ' + levelChanged +
  ', all match v3Expected: ' + rows.every((r) => r.expectedMatches));
