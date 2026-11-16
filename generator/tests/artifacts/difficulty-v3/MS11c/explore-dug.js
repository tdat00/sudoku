'use strict';
// Scratch (MS11c): real positions with a BUG+1 among seeded dug puzzles (unique by construction). The position is the
// one after every unscoped technique of the registry below bugPlusOne (the logical solver restricted to them: through
// uniqueRectangle). The cutoff is the order of the registered bugPlusOne (182): it is asserted, and so is that the prefix
// does not contain it. The registered finder is asked with assumeUniqueness true; every Finding is checked against the
// known solution. Counted: the positions, those with exactly one trivalue cell and every other open cell bivalue (the
// guard) and the Findings; the first PRINT_LIMIT Findings are printed. A bounded scan: seed, count and first index come
// from the arguments.
//   node tests/artifacts/difficulty-v3/MS11c/explore-dug.js <seed> <count> [from] [below|propagated|initial]
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const seed = Number(process.argv[2] || 777);
const count = Number(process.argv[3] || 100);
const from = Number(process.argv[4] || 0);
const mode = process.argv[5] || 'below';
const PRINT_LIMIT = 40;
const cutoff = SG.techniques.get('bugPlusOne').order;
if (cutoff !== 182) throw new Error('bugPlusOne is registered at order ' + cutoff + ', not 182');
const before = SG.techniques.list().filter((t) => t.order < cutoff && t.variantScope === null).map((t) => t.id);
if (before.indexOf('bugPlusOne') !== -1) throw new Error('the prefix holds bugPlusOne');
console.log('explore-dug: seed ' + seed + ', puzzles ' + count + ' from ' + from + ', mode ' + mode + ', model ' +
  model.variantId + ', cutoff = order of bugPlusOne = ' + cutoff + ', prefix of ' + before.length +
  ' techniques (' + before.join(' ') + '), print limit ' + PRINT_LIMIT);
const find = SG.techniques.get('bugPlusOne').find;
const rng = SG.testkit.rng.create(seed);
const t0 = Date.now();
const items = H.randomStatesWithKnownSolution(model, rng, count * 4);
let attempted = 0;
let solvedBefore = 0;
let guard = 0;
let hits = 0;
let mostWork = 0;
let capped = 0;
let printed = 0;
const open = {};
for (let i = 0; i < items.length; i += 4) {
  const index = i / 4;
  if (index < from) continue;
  const item = items[i];
  attempted++;
  const puzzle = H.puzzleString(model, item.givens);
  const state = mode === 'below' ? H.stateAfter(model, puzzle, before) :
    H.makeState(model, puzzle, { propagate: mode === 'propagated' });
  if (state.unsolvedCount === 0) solvedBefore++;
  let tri = 0;
  let bad = false;
  for (let c = 0; c < model.cellCount; c++) {
    if (state.value[c] !== 0) continue;
    const k = SG.bits.popcount(state.candidates[c]);
    if (k === 3) tri++;
    else if (k !== 2) bad = true;
  }
  if (!bad && tri === 1) guard++;
  const records = [];
  const ctx = SG.techniques.createContext(model, { assumeUniqueness: true, onPatternWork: (r) => records.push(r) });
  const f = find(model, state, ctx);
  records.forEach((r) => {
    mostWork = Math.max(mostWork, r.work);
    if (r.capHit !== null) capped++;
  });
  if (f === null) continue;
  hits++;
  const [cell, digit] = f.placements[0];
  if (item.solution[cell] !== digit || f.placements.length !== 1 || f.eliminations.length !== 0) {
    console.log('UNSOUND #' + index + ' ' + puzzle + ' ' + JSON.stringify(f));
    process.exitCode = 3;
  }
  open[state.unsolvedCount] = (open[state.unsolvedCount] || 0) + 1;
  if (++printed <= PRINT_LIMIT) {
    console.log('#' + index + ' ' + puzzle + ' ' + H.label(model, cell) + '=' + digit + ' (' + cell + ') open ' +
      state.unsolvedCount + ' cands ' + SG.bits.toArray(state.candidates[cell]).join('') + ' work ' +
      records.map((r) => r.work).join('+'));
  }
}
console.log('seed ' + seed + ' puzzles ' + count + ' (from ' + from + '): attempted ' + attempted +
  ', fully solved by the prefix ' + solvedBefore + ', positions with one trivalue cell and the rest bivalue ' + guard +
  ', Findings ' + hits + ', most work ' + mostWork + ', capped calls ' + capped + ', open cells of the Findings ' +
  JSON.stringify(open) + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
