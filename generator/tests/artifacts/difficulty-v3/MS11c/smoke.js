'use strict';
// Scratch (MS11c): a first look at the finder on a constructed BUG+1 state (two solutions that differ in every cell,
// the first is S, the second a digit permutation of it, plus a third candidate in one cell).
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const solution = SG.fixtures.classic.unique[0].solution;
const state = SG.model.initState(model);
const perm = (d) => (d % 9) + 1;
for (let c = 0; c < model.cellCount; c++) {
  state.candidates[c] = (1 << (solution[c] - 1)) | (1 << (perm(solution[c]) - 1));
}
const target = 40;
let extra = 1;
while (extra === solution[target] || extra === perm(solution[target])) extra++;
state.candidates[target] |= 1 << (extra - 1);
const records = [];
const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
const f = SG.techniques.get('bugPlusOne').find(model, state, ctx);
console.log('target', target, 'S', solution[target], 'perm', perm(solution[target]), 'extra', extra);
console.log(JSON.stringify(f), JSON.stringify(records));
const off = SG.techniques.createContext(model, { assumeUniqueness: false });
console.log('assumeUniqueness false:', SG.techniques.get('bugPlusOne').find(model, state, off));
