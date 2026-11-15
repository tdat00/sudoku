'use strict';
// Scratch (MS09b): why does finnedXWing on the n = 2 vector with the decoy R9C2 remove two cells in a lonely-digit state?
const SG = require('./load.js');
const { referenceFinned } = require('./reference.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
function lonely(model, digit, labels) {
  const state = H.makeState(model, '.'.repeat(model.cellCount), { propagate: false });
  const keep = new Set(labels.map((l) => H.cell(model, l)));
  for (let c = 0; c < model.cellCount; c++) state.candidates[c] = keep.has(c) ? 1 << (digit - 1) : 0;
  return state;
}
const labels = ['R1C2', 'R1C8', 'R4C2', 'R4C8', 'R4C9', 'R5C8', 'R9C2'];
const state = lonely(m9, 5, labels);
const f = SG.techniques.get('finnedXWing').find(m9, state, SG.techniques.createContext(m9, {}));
console.log(JSON.stringify(f));
console.log(referenceFinned(SG, m9, state, 2).map((p) => JSON.stringify({ kind: p.kind, bases: p.bases.map((u) => m9.unitMeta[u].label), covers: p.covers.map((u) => m9.unitMeta[u].label), fins: p.fins.map((c) => H.label(m9, c)), targets: p.targets.map((c) => H.label(m9, c)) })).join('\n'));
