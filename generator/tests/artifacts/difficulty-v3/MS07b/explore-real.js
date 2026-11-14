'use strict';
// Scratch (MS07b): real positions (random minimal classic9 puzzles, seeded) where forcingChainLong (>= 7 links),
// nishio (depth 1) and nishioDeep (depth 2) are reached after every ID registered before them.
// Usage: node explore-real.js <seed> <from> <count>
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const seed = Number(process.argv[2] || 161);
const from = Number(process.argv[3] || 0);
const count = Number(process.argv[4] || 100);
const lower = SG.techniques.list().filter((t) => t.group !== 'chain' && t.variantScope === null).map((t) => t.id);
const before = {
  forcingChainLong: lower.concat(['forcingChain']),
  nishio: lower.concat(['forcingChain', 'forcingChainLong']),
  nishioDeep: lower.concat(['forcingChain', 'forcingChainLong', 'nishio'])
};
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
const rng = SG.testkit.rng.create(seed);
const t0 = Date.now();
for (let i = from; i < from + count; i++) {
  const r = rng.fork('minimal.' + i);
  const solution = SG.testkit.randomSolution(m9, r.fork('grid'));
  const dug = SG.testkit.dig(m9, solution, r.fork('dig'), { symmetry: 'none', minClues: 0 });
  const puzzle = H.puzzleString(m9, dug.givens);
  const row = { seed, i, puzzle };
  Object.keys(before).forEach((id) => {
    const state = H.stateAfter(m9, puzzle, before[id]);
    if (state.unsolvedCount === 0) { row[id] = 'solved'; return; }
    const f = SG.techniques.get(id).find(m9, state, ctx);
    if (f === null) { row[id] = null; return; }
    row[id] = { len: f.i18nArgs.length, kind: f.i18nArgs.kind, depth: f.i18nArgs.depth,
      el: f.eliminations, pl: f.placements, left: state.unsolvedCount };
  });
  console.log(JSON.stringify(row));
}
console.error('ms', Date.now() - t0);
