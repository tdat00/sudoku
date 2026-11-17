'use strict';
// Scratch (MS14b): the distribution of the seeded dug positions that the suite `tech-subset` ("law of leftovers registered: seeded
// dug puzzles ...") uses: for each layout and orientation the number of seeds 1-6 whose position at the registry position has a
// Finding, with the number of units and the kind of line; to set the minimum counts of that test from a recorded scan.
//   node seeded-distribution.js [seeds]
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
const H = SG.techHelper;
const tech = SG.techniques.get('lawOfLeftovers');
const BELOW = SG.techniques.list().filter((t) => t.order < tech.order &&
  (t.variantScope === null || t.variantScope.indexOf('jigsaw9') !== -1)).map((t) => t.id);
const seeds = Number(process.argv[2] || 6);
const seen = { positions: 0, found: 0, capped: 0, units: { 1: 0, 2: 0 }, kind: { R: 0, C: 0 } };
['staggered', 'wavy', 'mixed', 'ordered', 'crossed'].forEach((name) => {
  [false, true].forEach((transposed) => {
    let layout = J.parse(J.LAYOUTS[name]);
    if (transposed) layout = J.transpose(layout);
    const model = J.build(layout);
    const row = [];
    for (let seed = 1; seed <= seeds; seed++) {
      const rng = SG.testkit.rng.create(seed * 7919 + (transposed ? 1 : 0));
      const solution = J.solve(model, rng.fork('grid'));
      const dug = SG.testkit.dig(model, solution, rng.fork('dig'), { minClues: 0 });
      const state = H.stateAfter(model, dug.givens, BELOW);
      const records = [];
      const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
      const found = tech.find(model, state, ctx);
      seen.positions++;
      if (records[0].capHit !== null) seen.capped++;
      if (found !== null) {
        seen.found++;
        seen.units[found.i18nArgs.lines.length]++;
        seen.kind[found.i18nArgs.lines[0].charAt(0)]++;
        row.push(found.i18nArgs.lines.join('+') + ' w' + records[0].work);
      } else row.push('-');
    }
    console.log(name + (transposed ? ' (T)' : '') + ': ' + row.join(' | '));
  });
});
console.log(JSON.stringify(seen));
