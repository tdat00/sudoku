'use strict';
// MS13c scratch: the exact record of the grouped attempt (construction, search, additional nodes) and the number of parent-budget
// checks on the real vectors of the tests, to pin them (B06, S02, S07 survivors of the first mutation run).
const SG = require('./load.js');
const H = SG.techHelper;
const CP = SG.chainProofs;
function call(m, state, id) {
  const records = [];
  const base = SG.techniques.createContext(m, { onPatternWork: (r) => records.push(r) });
  let checks = 0;
  const ctx = Object.assign({}, base, { check: function () { checks++; base.check.apply(this, arguments); } });
  const f = SG.techniques.get(id).find(m, state, ctx);
  return { f, r: records[0], checks };
}
const vectors = [
  ['classic9 #1', H.model('classic9'), H.randomStatesWithKnownSolution(H.model('classic9'), SG.testkit.rng.create(5151), 900), 1],
  ['classic9 #880', H.model('classic9'), null, 880],
  ['classic6 #121', H.model('classic6'), H.randomStatesWithKnownSolution(H.model('classic6'), SG.testkit.rng.create(5151), 800), 121]
];
vectors[1][2] = vectors[0][2];
vectors.forEach(([name, m, items, i]) => {
  ['forcingChain', 'forcingChainLong'].forEach((id) => {
    const out = call(m, items[i].state, id);
    const g = out.r.grouped;
    console.log(name, id, JSON.stringify({ found: out.f === null ? null : [out.f.i18nArgs.kind, out.f.i18nArgs.length, out.f.eliminations, out.f.placements],
      work: out.r.work, construction: g.construction, search: g.search, additional: g.additional, stop: g.stop, graph: g.graph, minimum: g.minimum,
      domain: out.r.domain, checks: out.checks }));
  });
});
