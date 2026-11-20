'use strict';
// MS13c scratch: what the grouped Findings look like on seeded positions of several models: the kind, the length and
// where the groups are (start, end, inside), with the index of the first example of each class so that a test can pin
// it. Usage: node group-stats.js <model> <count> [seed]
const SG = require('./load.js');
const H = SG.techHelper;
const CP = SG.chainProofs;
const modelId = process.argv[2] || 'hyper';
const count = Number(process.argv[3] || 300);
const seed = Number(process.argv[4] || 77003);
const m = H.model(modelId);
const C = SG.chainSearch.SHORT_MAX;
const states = H.randomStatesWithKnownSolution(m, SG.testkit.rng.create(seed), count);
const classes = {};
const first = {};
states.forEach((item, i) => {
  for (const id of ['forcingChain', 'forcingChainLong']) {
    const f = SG.techniques.get(id).find(m, item.state, SG.techniques.createContext(m, {}));
    if (!f || f.i18nArgs.proofVersion !== 2) continue;
    const chains = f.i18nArgs.chains;
    const startGroup = chains[0][0].cells.length > 1;
    const last = chains[0][chains[0].length - 1];
    const endGroup = f.i18nArgs.kind === 'endpoints' && last.cells.length > 1;
    const inner = chains.some((c) => c.slice(1, f.i18nArgs.kind === 'endpoints' ? -1 : undefined).some((s) => s.cells.length > 1));
    const key = [id, f.i18nArgs.kind, 'len' + f.i18nArgs.length, startGroup ? 'startGroup' : '', endGroup ? 'endGroup' : '', inner ? 'innerGroup' : ''].filter(Boolean).join(' ');
    classes[key] = (classes[key] || 0) + 1;
    if (!first[key]) first[key] = { index: i, elim: f.eliminations, plc: f.placements, problems: CP.pathProblems(m, item.state, f, { canonical: true }).length };
  }
});
console.log(modelId, count, 'states, seed', seed);
Object.keys(classes).sort().forEach((k) => console.log(String(classes[k]).padStart(4), k, JSON.stringify(first[k])));
