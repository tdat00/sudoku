'use strict';
// Scratch (MS15a): a first look at SG.alsPatterns.enumerate on a few positions.
const SG = require('./load.js');
const H = SG.techHelper;
const A = SG.alsPatterns;
const model = H.model('classic9');
const ctx = SG.techniques.createContext(model, {});

function show(name, state, limits) {
  const work = A.createWork();
  const out = A.enumerate(model, state, ctx, work, limits);
  console.log(name, 'records', out.records.length, 'complete', out.complete, 'capHit', out.capHit, 'work', work.used);
  return out;
}

const state = SG.model.initState(model);
show('blank', state);
const r1 = H.cell(model, 'R1C1');
const r2 = H.cell(model, 'R1C2');
function setCand(s, ref, digits) {
  let mask = 0;
  digits.split('').forEach((d) => { mask |= 1 << (Number(d) - 1); });
  s.candidates[H.cell(model, ref)] = mask;
}
setCand(state, 'R1C1', '12');
setCand(state, 'R1C2', '23');
const out = show('two cells', state);
console.log(JSON.stringify(out.records));
