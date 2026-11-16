'use strict';
// Scratch (MS11b): why the goldens change in the analysis. Every changed golden (and, for the record, the unchanged ones) is
// regenerated from its request twice, once as registered and once without the hidden form of the Unique Rectangle (finder
// wrapped so that a `hidden.step` Finding becomes null, restored afterwards), and analysed. For each golden: whether the two results are the same puzzle (givens), the rating positions
// whose score, hardest technique or technique counts differ, and the technique counts that differ (with minus without).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11b/g-cause.js [G03,G04,...]
const SG = require('./load.js');
const R = SG.replay;
const D = SG.difficulty;
const ids = (process.argv[2] || 'G01,G02,G03,G04,G05,G06,G07,G08,G10,G12,G13,G14').split(',');
const def = SG.techniques.get('uniqueRectangle');
const withoutDef = {
  id: def.id, group: def.group, baseCost: def.baseCost, order: def.order, i18nKey: def.i18nKey,
  variantScope: def.variantScope, assumesUniqueness: def.assumesUniqueness,
  find: (model, state, ctx) => {
    const f = def.find(model, state, ctx);
    return f !== null && /hidden\.step$/.test(f.i18nKey) ? null : f;
  }
};
const diffCounts = (a, b) => {
  const out = {};
  Object.keys(Object.assign({}, a, b)).forEach((k) => { const d = (a[k] || 0) - (b[k] || 0); if (d !== 0) out[k] = d; });
  return out;
};
ids.forEach((id) => {
  const g = SG.fixtures.replayGoldens.filter((x) => x.id === id)[0];
  const t0 = Date.now();
  const run = () => SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
  const resultWith = run();
  const withA = R.analyse(resultWith);
  SG.techniques.unregister('uniqueRectangle');
  SG.techniques.register(withoutDef);
  let withoutA;
  let resultWithout;
  try {
    resultWithout = run();
    withoutA = R.analyse(resultWithout);
  } finally {
    SG.techniques.unregister('uniqueRectangle');
    SG.techniques.register(def);
  }
  const same = JSON.stringify(Array.from(resultWith.givens || resultWith.puzzle || [])) ===
    JSON.stringify(Array.from(resultWithout.givens || resultWithout.puzzle || []));
  console.log(id + ' ' + g.request.variantId + ' ' + g.request.difficulty + ' seed ' + g.request.seed + ': same puzzle with and without: ' + same +
    '; positions ' + withA.ratings.length + ' / ' + withoutA.ratings.length + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  let differing = 0;
  withA.ratings.forEach((r, i) => {
    const o = withoutA.ratings[i];
    if (!o) return;
    const d = diffCounts(r.counts || {}, o.counts || {});
    if (r.score === o.score && r.hardest === o.hardest && Object.keys(d).length === 0) return;
    differing++;
    if (differing <= 12) {
      console.log('  position ' + i + ': score without ' + o.score + ', with ' + r.score + '; hardest without ' + o.hardest + ', with ' + r.hardest +
        '; counts with minus without ' + JSON.stringify(d));
    }
  });
  console.log('  positions that differ: ' + differing);
});
