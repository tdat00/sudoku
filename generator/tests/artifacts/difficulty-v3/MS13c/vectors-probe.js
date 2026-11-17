'use strict';
// MS13c scratch: the registered grouped finders on the vectors of MS13a/MS13b (the endpoints vector on classic9 where the 5
// stays only in the cells of the proof and R3C1-3, and SA2's 4x4 position), with every Finding checked.
const SG = require('./load.js');
const H = SG.techHelper;
const CP = SG.chainProofs;
const bit = (d) => 1 << (d - 1);
function show(label, m, state) {
  for (const id of ['forcingChain', 'forcingChainLong']) {
    for (const C of [4, 6]) {
      SG.chainSearch.SHORT_MAX = C;
      const recs = [];
      const f = SG.techniques.get(id).find(m, state, SG.techniques.createContext(m, { onPatternWork: (r) => recs.push(r) }));
      console.log(label, id, 'C', C, f ? JSON.stringify({ kind: f.i18nArgs.kind, len: f.i18nArgs.length, v2: f.i18nArgs.proofVersion === 2,
        cells: f.cells, elim: f.eliminations, plc: f.placements, problems: CP.pathProblems(m, state, f, { canonical: true }),
        chains: f.i18nArgs.chains }) : 'null', recs[0].domain);
    }
  }
  SG.chainSearch.SHORT_MAX = 4;
}
{
  const m = H.model('classic9');
  const open = [0, 1, 4, 9, 13, 18, 19, 20];
  const state = SG.model.initState(m);
  for (let c = 0; c < m.cellCount; c++) state.candidates[c] = open.indexOf(c) === -1 ? 0 : bit(5);
  show('endpoints-vector', m, state);
}
{
  const m = SG.model.create({ variantId: 'chain-sa2-vector', digits: 4,
    units: [[0, 1, 2, 10], [0, 3, 4, 11], [1, 3, 8, 12], [0, 5, 6, 13], [5, 2, 7, 14], [0, 1, 9, 15]],
    unitMeta: [{ kind: 'box', label: 'B1' }, { label: 'X1' }, { label: 'X2' }, { label: 'X3' }, { label: 'X4' },
      { kind: 'row', label: 'R1' }],
    layout: { rows: 4, cols: 4, cellRow: [0, 0, 1, 1, 1, 2, 2, 2, 2, 0, 1, 3, 3, 3, 3, 0],
      cellCol: [0, 1, 0, 2, 3, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 3] } });
  const state = SG.model.initState(m);
  [[1, 2], [1, 2, 3], [1, 2, 3], [1, 3], [2, 3], [1, 2], [1, 3], [1, 2, 3], [1, 2, 3], [2, 3]].forEach((digits, c) => {
    state.candidates[c] = digits.reduce((mask, d) => mask | bit(d), 0);
  });
  for (let c = 10; c < 16; c++) { state.value[c] = 4; state.candidates[c] = bit(4); }
  state.unsolvedCount = 10;
  show('sa2', m, state);
}
