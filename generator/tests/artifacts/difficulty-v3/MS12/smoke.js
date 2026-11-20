'use strict';
// Scratch smoke (MS12): the vector of the brief on classic9 and its transpose.
const SG = require('./load.js');
const H = SG.techHelper;
const m = H.model('classic9');

function bit(d) { return 1 << (d - 1); }
function stateWith(edits) {
  const s = SG.model.initState(m);
  Object.keys(edits).forEach((c) => {
    let mask = 0;
    edits[c].forEach((d) => { mask |= bit(d); });
    s.candidates[Number(c)] = mask;
  });
  return s;
}
const cell = (r, c) => (r - 1) * 9 + (c - 1);
function vector(transpose) {
  const at = (r, c) => (transpose ? cell(c, r) : cell(r, c));
  const edits = {};
  edits[at(1, 1)] = [1, 4];
  edits[at(1, 5)] = [1, 2];
  edits[at(1, 9)] = [2, 3];
  edits[at(5, 9)] = [3, 4];
  return stateWith(edits);
}
[false, true].forEach((t) => {
  const s = vector(t);
  const f = SG.techniques.get('xyChain').find(m, s, SG.techniques.createContext(m, {}));
  console.log(t ? 'transposed' : 'vector', JSON.stringify(f));
});
console.log(SG.techniques.list().map((x) => x.id + ':' + x.order).join(' '));
