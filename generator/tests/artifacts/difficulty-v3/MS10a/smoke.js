'use strict';
// Scratch (MS10a): the brief's vector through the registered finder, a few states, no loops.
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');

function blank() {
  return SG.model.initState(model);
}
function setMask(state, ref, digits) {
  let m = 0;
  String(digits).split('').forEach((ch) => { m |= 1 << (parseInt(ch, 10) - 1); });
  state.candidates[H.cell(model, ref)] = m;
}
function run(state, opts) {
  const records = [];
  const ctx = SG.techniques.createContext(model, Object.assign({ onPatternWork: (r) => records.push(r) }, opts));
  const finding = SG.techniques.get('remotePairs').find(model, state, ctx);
  return { finding, records };
}

const s = blank();
['R1C1', 'R2C2', 'R2C5', 'R5C5'].forEach((c) => setMask(s, c, '27'));
const out = run(s);
console.log(JSON.stringify(out.finding));
console.log(JSON.stringify(out.records));
console.log(SG.techniques.get('remotePairs') && JSON.stringify(SG.techniques.list().filter((t) => t.order > 125 && t.order < 140).map((t) => [t.id, t.order])));
