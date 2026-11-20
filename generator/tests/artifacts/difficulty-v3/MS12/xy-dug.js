'use strict';
// Scratch (MS12, adapted from MS11c's explore-dug.js): real positions with an xyChain among seeded dug puzzles (unique by
// construction). The position is the one after every unscoped technique of the registry below xyChain (the logical solver
// restricted to them: through bugPlusOne). The cutoff is the order of the registered xyChain (186): it is asserted, and so
// is that the prefix does not contain it. The registered finder is asked with assumeUniqueness true (it ignores it); every
// Finding is checked against the known solution. Counted: the positions, the Findings by length, the most work and the capped
// calls; the first PRINT_LIMIT Findings are printed. A bounded scan: seed, count and first index come from the arguments.
//   node tests/artifacts/difficulty-v3/MS12/xy-dug.js <seed> <count> [from] [below|propagated|initial]
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const seed = Number(process.argv[2] || 4242);
const count = Number(process.argv[3] || 100);
const from = Number(process.argv[4] || 0);
const mode = process.argv[5] || 'below';
const PRINT_LIMIT = Number(process.env.PRINT_LIMIT || 40);
const cutoff = SG.techniques.get('xyChain').order;
if (cutoff !== 186) throw new Error('xyChain is registered at order ' + cutoff + ', not 186');
const before = SG.techniques.list().filter((t) => t.order < cutoff && t.variantScope === null).map((t) => t.id);
if (before.indexOf('xyChain') !== -1) throw new Error('the prefix holds xyChain');
console.log('xy-dug: seed ' + seed + ', puzzles ' + count + ' from ' + from + ', mode ' + mode + ', model ' +
  model.variantId + ', cutoff = order of xyChain = ' + cutoff + ', prefix of ' + before.length + ' techniques (' +
  before.join(' ') + '), print limit ' + PRINT_LIMIT);
const find = SG.techniques.get('xyChain').find;
const rng = SG.testkit.rng.create(seed);
const t0 = Date.now();
const items = H.randomStatesWithKnownSolution(model, rng, count * 4);
let attempted = 0;
let solvedBefore = 0;
let hits = 0;
let mostWork = 0;
let capped = 0;
let printed = 0;
const byLength = {};
for (let i = 0; i < items.length; i += 4) {
  const index = i / 4;
  if (index < from) continue;
  const item = items[i];
  attempted++;
  const puzzle = H.puzzleString(model, item.givens);
  const state = mode === 'below' ? H.stateAfter(model, puzzle, before) :
    H.makeState(model, puzzle, { propagate: mode === 'propagated' });
  if (state.unsolvedCount === 0) solvedBefore++;
  const records = [];
  const ctx = SG.techniques.createContext(model, { assumeUniqueness: true, onPatternWork: (r) => records.push(r) });
  const f = find(model, state, ctx);
  records.forEach((r) => {
    mostWork = Math.max(mostWork, r.work);
    if (r.capHit !== null) capped++;
  });
  if (f === null) continue;
  hits++;
  const bad = f.eliminations.filter((e) => item.solution[e[0]] === e[1]);
  if (bad.length > 0 || f.placements.length !== 0) {
    console.log('UNSOUND #' + index + ' ' + puzzle + ' ' + JSON.stringify(f));
    process.exitCode = 3;
  }
  const len = f.i18nArgs.length;
  byLength[len] = (byLength[len] || 0) + 1;
  if (++printed <= PRINT_LIMIT) {
    console.log('#' + index + ' ' + puzzle + ' open ' + state.unsolvedCount + ' digit ' + f.i18nArgs.digit +
      ' length ' + len + ' cells ' + f.cells.map((c) => H.label(model, c)).join(',') + ' removes ' +
      f.eliminations.map((e) => H.label(model, e[0]) + '<>' + e[1]).join(',') + ' work ' +
      records.map((r) => r.work).join('+'));
  }
}
console.log('seed ' + seed + ' puzzles ' + count + ' (from ' + from + '): attempted ' + attempted +
  ', fully solved by the prefix ' + solvedBefore + ', Findings ' + hits + ' by length ' + JSON.stringify(byLength) +
  ', most work ' + mostWork + ', capped calls ' + capped + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
