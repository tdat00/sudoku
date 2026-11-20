'use strict';
// Scratch (MS09a): the vector of the brief on classic9: digit 5, bases R1 {C2, C8} and R4 {C2, C8, C9}, covers C2
// and C8, fin R4C9; R5C8 loses the 5. Then the sashimi (R4C2 removed) and a second fin in the same box (R4C7).
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

function show(name, labels) {
  const state = digitsMap(m9, { 5: labels });
  const records = [];
  const ctx = SG.techniques.createContext(m9, { onPatternWork: (r) => records.push(r) });
  const f = SG.techniques.get('finnedXWing').find(m9, state, ctx);
  console.log(name, f === null ? 'null' : JSON.stringify(f), JSON.stringify(records));
}

console.log('registered', SG.techniques.has('finnedXWing'), SG.techniques.get('finnedXWing').order,
  SG.techniques.get('finnedXWing').baseCost, SG.techniques.get('finnedXWing').group);
show('vector', ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C9', 'R5C8']);
show('sashimi', ['R1C2', 'R1C8', 'R4C8', 'R4C9', 'R5C8']);
show('two fins', ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C7', 'R4C9', 'R5C8']);
show('off-cover target', ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C9', 'R5C7']);
show('target missing the fin', ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C9', 'R7C8']);
console.log(Object.keys(SG.fishSearch));
