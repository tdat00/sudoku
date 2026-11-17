'use strict';
// MS13c scratch: the time of a registered forcing call (grouped attempt, fallback included) against the singleton seam
// (the accepted legacy search, same window, no limit) on the same states. Usage: node time-calls.js [count] [model]
const SG = require('./load.js');
const H = SG.techHelper;
const count = Number(process.argv[2] || 100);
const modelId = process.argv[3] || 'classic9';
const m = H.model(modelId);
const C = SG.chainSearch.SHORT_MAX;
const states = H.randomStatesWithKnownSolution(m, SG.testkit.rng.create(77003), count);
const ms = (t) => Number(process.hrtime.bigint() - t) / 1e6;
const total = { legacyShort: 0, legacyLong: 0, newShort: 0, newLong: 0 };
const work = { newShort: 0, newLong: 0, legacyShort: 0, legacyLong: 0 };
for (const item of states) {
  for (const [id, min, max, key] of [['forcingChain', 1, C, 'Short'], ['forcingChainLong', C + 1, 12, 'Long']]) {
    let t = process.hrtime.bigint();
    const records = [];
    SG.techniques.get(id).find(m, item.state, SG.techniques.createContext(m, { onPatternWork: (r) => records.push(r) }));
    total['new' + key] += ms(t);
    work['new' + key] += records[0].work;
    t = process.hrtime.bigint();
    const lr = [];
    SG.chainSearch.forcing(m, item.state, SG.techniques.createContext(m, { onPatternWork: (r) => lr.push(r) }),
      { id, minLength: min, maxLength: max, workLimit: null });
    total['legacy' + key] += ms(t);
    work['legacy' + key] += lr[0].work;
  }
}
const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v * 10) / 10]));
console.log(modelId, count, 'states; ms', JSON.stringify(round(total)), 'work', JSON.stringify(work));
