'use strict';
// Scratch (MS07b): where are forcingChainLong (>= 7), nishio and nishioDeep reached on the unique fixture puzzles?
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const lower = SG.techniques.list().filter((t) => t.group !== 'chain' && t.variantScope === null).map((t) => t.id);
const before = {
  forcingChain: lower,
  forcingChainLong: lower.concat(['forcingChain']),
  nishio: lower.concat(['forcingChain', 'forcingChainLong']),
  nishioDeep: lower.concat(['forcingChain', 'forcingChainLong', 'nishio'])
};
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
const seen = {};
function row(name, text) {
  const puzzle = text.replace(/0/g, '.');
  if (seen[puzzle]) return;
  seen[puzzle] = true;
  const out = { name, puzzle };
  Object.keys(before).forEach((id) => {
    let state;
    try { state = H.stateAfter(m9, puzzle, before[id]); } catch (e) { out[id] = 'err ' + e.message; return; }
    if (state.unsolvedCount === 0) { out[id] = 'solved'; return; }
    const f = SG.techniques.get(id).find(m9, state, ctx);
    out[id] = f === null ? null : { len: f.i18nArgs.length, kind: f.i18nArgs.kind, depth: f.i18nArgs.depth,
      el: f.eliminations, pl: f.placements, left: state.unsolvedCount };
  });
  console.log(JSON.stringify(out));
}
SG.fixtures.classic.unique.forEach((fx) => row(fx.name, fx.puzzle));
SG.fixtures.rated.entries.forEach((fx) => row('rated:' + fx.name, fx.puzzle));
