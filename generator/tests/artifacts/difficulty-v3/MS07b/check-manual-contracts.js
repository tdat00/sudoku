'use strict';
// Scratch (MS07b): the contracts of the manual difficulty suite that the new IDs touch, checked without running the
// heavy suite: allowed techniques per level, one expensive step, the hardest technique of the famous puzzles and the
// family certificates of the constructed puzzles.
const SG = require('./load.js');
const H = SG.techHelper;
const D = SG.difficulty;
const m9 = H.model('classic9');
const LEVELS = D.LEVELS;
const out = [];
LEVELS.forEach((level) => {
  let spec;
  try { spec = D.spec(level, m9); } catch (e) { out.push([level, 'unsupported']); return; }
  out.push([level, spec.min, spec.max, spec.tierTechniques.join(','), spec.allowedTechniques.length]);
});
console.log(out.map((r) => r.join(' | ')).join('\n'));
function fake(counts, empties) {
  return { solved: true, status: 'solved', techniqueCounts: counts, steps: [], state: null, empties };
}
[['forcingChain', 'master'], ['forcingChainLong', 'nightmare'], ['nishio', 'nightmare'], ['nishioDeep', 'hell1']]
  .forEach(([id, level]) => {
    const counts = { nakedSingle: 3 };
    counts[id] = 1;
    const parts = D.breakdown(counts, 4);
    console.log(id, parts.score, D.levelOfScore(parts.score), level, D.levelOfScore(parts.score) === level);
  });
['escargot', 'worlds-hardest-2012', 'platinum-blonde', 'golden-nugget'].forEach((name) => {
  const entry = SG.fixtures.rated.entries.filter((e) => e.name === name)[0];
  const rating = D.rate(m9, H.parsePuzzle(m9, entry.puzzle));
  console.log(name, rating.level, rating.hardestTechnique, rating.solved);
});
const sets = SG.fixtures.rated.techniqueSets;
SG.fixtures.rated.constructed.forEach((e) => {
  const givens = H.parsePuzzle(m9, e.puzzle);
  const run = (set) => SG.logicalSolver.solve(m9, givens, { allowedTechniques: set, collectSteps: false,
    assumeUniqueness: false }).solved;
  if (e.label === 'nightmare') {
    console.log(e.name, 'solvable with CHAINS (old ids)', run(sets.chains), 'with the four', run(sets.chains.concat(['forcingChainLong', 'nishioDeep'])),
      'wings stuck', !run(sets.wings));
  }
});
