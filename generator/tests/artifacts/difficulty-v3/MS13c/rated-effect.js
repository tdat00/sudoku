'use strict';
// MS13c scratch (from MS12's rated-effect.js): the 26 reference puzzles of tests/fixtures/rated.js rated by the accepted base
// engine (MS13C_CHAIN=git:4aa3d11: no grouped forcing) and by the tree's, to record the reclassification effect (R20: levels,
// scores, requiredness, hardest technique) and whether every reference still matches its v3Expected level and requiredness.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS13c/rated-effect.js   (it runs itself twice; RATE_CHILD=1 is
// the single-engine mode that prints one JSON line per puzzle)
const cp = require('child_process');
if (process.env.RATE_CHILD === '1') {
  const SG = require('./load.js');
  const D = SG.difficulty;
  const H = SG.techHelper;
  const m9 = H.model('classic9');
  SG.fixtures.rated.entries.forEach((e) => {
    const givens = H.parsePuzzle(m9, e.puzzle);
    const r = D.rate(m9, givens);
    console.log(JSON.stringify({ name: e.name, level: r.level, score: r.score, hardest: r.hardestTechnique, counts: r.techniqueCounts,
      required: D.requiredOf(r, e.v3Expected.level, m9).required, expected: e.v3Expected }));
  });
} else {
  const run = (env) => cp.execFileSync(process.execPath, [__filename], { env: Object.assign({}, process.env, env, { RATE_CHILD: '1' }),
    encoding: 'utf8', maxBuffer: 1 << 26 }).trim().split(/\r?\n/).map((l) => JSON.parse(l));
  const base = run({ MS13C_CHAIN: 'git:4aa3d11' });
  const tree = run({ MS13C_CHAIN: '' });
  let changed = 0;
  let levelChanged = 0;
  let requiredChanged = 0;
  let hardestChanged = 0;
  const rows = tree.map((w, i) => {
    const o = base[i];
    const diff = w.score !== o.score || w.hardest !== o.hardest || w.level !== o.level || w.required !== o.required ||
      JSON.stringify(w.counts) !== JSON.stringify(o.counts);
    if (diff) changed++;
    if (w.level !== o.level) levelChanged++;
    if (w.required !== o.required) requiredChanged++;
    if (w.hardest !== o.hardest) hardestChanged++;
    return { name: w.name, expectedLevel: w.expected.level, levelBase: o.level, levelTree: w.level, scoreBase: o.score, scoreTree: w.score,
      hardestBase: o.hardest, hardestTree: w.hardest, requiredBase: o.required, requiredTree: w.required,
      countsDiffer: JSON.stringify(w.counts) !== JSON.stringify(o.counts),
      expectedMatchesBase: o.level === o.expected.level && o.required === o.expected.required,
      expectedMatchesTree: w.level === w.expected.level && w.required === w.expected.required };
  });
  rows.forEach((r) => console.log(JSON.stringify(r)));
  console.log('puzzles ' + rows.length + ', rating changed ' + changed + ', level changed ' + levelChanged + ', requiredness changed ' +
    requiredChanged + ', hardest changed ' + hardestChanged + ', all match v3Expected on the base: ' + rows.every((r) => r.expectedMatchesBase) +
    ', on the tree: ' + rows.every((r) => r.expectedMatchesTree));
}
