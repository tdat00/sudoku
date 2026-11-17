'use strict';
// Scratch (MS14b): looks for REAL positions for the fixtures of lawOfLeftovers: a seeded random solution of a named Jigsaw layout
// (J.solve), a unique puzzle dug from it (SG.testkit.dig, which keeps exactly one solution), the position where the registry
// reaches lawOfLeftovers (H.stateAfter with the registered techniques below it that apply to jigsaw9), and the first Finding of the
// registered finder there (with its work and its cap flag). Bounded: LAYOUTS x orientations x seeds, nothing else.
//   node search-fixtures.js <seed-from> <seed-count> [layout,layout...]
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
const H = SG.techHelper;
const tech = SG.techniques.get('lawOfLeftovers');

const from = Number(process.argv[2] || 1);
const count = Number(process.argv[3] || 6);
const names = (process.argv[4] || 'staggered,wavy,mixed,ordered,crossed').split(',');
const BELOW = SG.techniques.list().filter((t) => t.order < tech.order &&
  (t.variantScope === null || t.variantScope.indexOf('jigsaw9') !== -1)).map((t) => t.id);
console.log('below: ' + BELOW.join(','));

const t0 = Date.now();
let puzzles = 0;
let hits = 0;
names.forEach((name) => {
  [false, true].forEach((transposed) => {
    let layout = J.parse(J.LAYOUTS[name]);
    if (transposed) layout = J.transpose(layout);
    const model = J.build(layout);
    for (let seed = from; seed < from + count; seed++) {
      const rng = SG.testkit.rng.create(seed * 7919 + (transposed ? 1 : 0));
      const solution = J.solve(model, rng.fork('grid'));
      const dug = SG.testkit.dig(model, solution, rng.fork('dig'), { minClues: 0 });
      puzzles++;
      const state = H.stateAfter(model, dug.givens, BELOW);
      const records = [];
      const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
      const found = tech.find(model, state, ctx);
      const r = records[0];
      if (found === null && r.capHit === null) continue;
      hits++;
      console.log([name + (transposed ? ' (T)' : ''), 'seed ' + seed, 'clues ' + dug.clues, 'open ' + state.unsolvedCount,
        found ? 'FOUND ' + found.i18nArgs.lines.join('+') + '/' + found.i18nArgs.regions.join('+') + ' cells ' +
          found.i18nArgs.cells.join(' ') + ' removes ' + found.eliminations.map((e) => SG.model.cellLabel(model, e[0]) + ':' + e[1]).join(' ')
          : 'null', 'work ' + r.work, 'cap ' + r.capHit, 'puzzle ' + H.puzzleString(model, dug.givens)].join(' | '));
    }
  });
});
console.log('puzzles ' + puzzles + ', positions with a Finding or a cap ' + hits + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
