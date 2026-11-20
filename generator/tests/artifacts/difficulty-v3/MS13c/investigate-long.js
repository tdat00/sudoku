'use strict';
// MS13c scratch: the 12 LONG_CHAIN_PUZZLES stuck positions (C = 6, every technique below forcingChainLong) of the
// engine loaded by MS13C_CHAIN, dumped as JSON (mode dump), or read back and run with the loaded engine (mode run).
//   MS13C_CHAIN=git:HEAD node investigate-long.js dump out.json     (the base engine's stuck positions)
//   node investigate-long.js run out.json                             (the tree's engine on them)
//   node investigate-long.js own                                      (the tree's engine on its own stuck positions)
const fs = require('fs');
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const text = fs.readFileSync(require('path').resolve(__dirname, '../../../../../core/tests/suites/tech-chain.test.js'), 'utf8');
const block = /var LONG_CHAIN_PUZZLES = \[([\s\S]*?)\];/.exec(text)[1];
const puzzles = block.match(/'[^']+'/g).map((s) => s.slice(1, -1));
const below = [];
SG.techniques.list().forEach((t) => { if (t.variantScope === null && SG.techniques.get('forcingChainLong').order > t.order) below.push(t.id); });

function stuck(p) {
  const before = SG.chainSearch.SHORT_MAX;
  SG.chainSearch.SHORT_MAX = 6;
  try { return H.stateAfter(model, p, below); } finally { SG.chainSearch.SHORT_MAX = before; }
}
function describe(state, label) {
  const out = {};
  for (const id of ['forcingChain', 'forcingChainLong']) {
    const records = [];
    const f = SG.techniques.get(id).find(model, state, SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) }));
    out[id] = f ? { len: f.i18nArgs.length, v2: f.i18nArgs.proofVersion === 2, kind: f.i18nArgs.kind, elim: f.eliminations.length } : null;
    out[id + '#rec'] = records[0].domain + '/' + records[0].grouped.stop + '/' + records[0].work;
  }
  return label + ' ' + JSON.stringify(out);
}
const mode = process.argv[2];
if (mode === 'dump') {
  const data = puzzles.map((p) => { const s = stuck(p); return { p, candidates: Array.from(s.candidates), value: Array.from(s.value) }; });
  fs.writeFileSync(process.argv[3], JSON.stringify(data));
  console.log('dumped', data.length);
} else if (mode === 'run') {
  const data = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  data.forEach((d, i) => {
    const state = SG.model.cloneState(H.makeState(model, d.p));
    state.candidates.set(d.candidates); state.value.set(d.value);
    state.unsolvedCount = d.value.filter((v) => v === 0).length;
    console.log('#' + i, describe(state, 'base-stuck'));
  });
} else {
  puzzles.forEach((p, i) => console.log('#' + i, describe(stuck(p), 'own-stuck')));
}
