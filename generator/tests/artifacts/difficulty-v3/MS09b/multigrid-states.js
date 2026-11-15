'use strict';
// Scratch (MS09b): per state of the multi-grid agreement populations, whether the registered finder finds something and how
// much work it needs (to pick states whose witness is inside a prefix that the plain enumeration can afford).
const SG = require('./load.js');
const H = SG.techHelper;
['samurai', 'sohei', 'flower'].forEach((v) => {
  if (!SG.testkit.hasVariant(v)) return;
  const model = H.model(v);
  [4242, 777].forEach((seed) => {
    const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), 12);
    const row = items.map((it, i) => {
      const records = [];
      const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
      const f = SG.techniques.get('finnedSwordfish').find(model, it.state, ctx);
      return i + ':' + (f === null ? 'none' : 'found') + '@' + records[0].work;
    });
    console.log(v + ' seed ' + seed + ' ' + row.join(' '));
  });
});
