'use strict';
// Scratch (MS08b): the vector of the brief on classic9: digit 5, row R2 pair C1/C8, column C2 pair R1/R7.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');

function digitsMap(model, spec) {
  const eliminate = [];
  Object.keys(spec).forEach((key) => {
    const keep = new Set(spec[key].map((label) => H.cell(model, label)));
    for (let c = 0; c < model.cellCount; c++) if (!keep.has(c)) eliminate.push([c, Number(key)]);
  });
  return H.makeState(model, '.'.repeat(model.cellCount), { eliminate, propagate: false });
}

console.log('registered', SG.techniques.has('twoStringKite'), SG.techniques.get('twoStringKite').order);
const state = digitsMap(m9, { 5: ['R2C1', 'R2C8', 'R1C2', 'R7C2', 'R7C8'] });
const ctx = SG.techniques.createContext(m9, { onPatternWork: (r) => console.log('work', JSON.stringify(r)) });
console.log(JSON.stringify(SG.techniques.get('twoStringKite').find(m9, state, ctx)));
console.log(Object.keys(SG.fishSearch), SG.fishSearch.KITE_WORK_LIMIT);
