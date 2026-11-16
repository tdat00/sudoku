'use strict';
// Scratch (MS10a): real positions with a remote pair among seeded dug puzzles (unique by construction). The position is the
// one after every unscoped technique of the registry below remotePairs (the logical solver restricted to them), found with the
// registered finder. The cutoff is the order of the registered remotePairs (116 since RP-01 / S-OD9, it was 132): it is asserted,
// and so is that the prefix does not contain remotePairs. Every position is counted; the first PRINT_LIMIT hits are printed.
// A bounded scan: seeds and counts come from the arguments.
//   node tests/artifacts/difficulty-v3/MS10a/explore-dug.js <seed> <count> [from] [below|propagated|initial]
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const seed = Number(process.argv[2] || 777);
const count = Number(process.argv[3] || 100);
const from = Number(process.argv[4] || 0);
const mode = process.argv[5] || 'below';
const PRINT_LIMIT = 25;
const cutoff = SG.techniques.get('remotePairs').order;
if (cutoff !== 116) throw new Error('remotePairs is registered at order ' + cutoff + ', not 116');
const before = SG.techniques.list().filter((t) => t.order < cutoff && t.variantScope === null).map((t) => t.id);
if (before.indexOf('remotePairs') !== -1) throw new Error('the prefix holds remotePairs');
console.log('explore-dug: seed ' + seed + ', puzzles ' + count + ' from ' + from + ', mode ' + mode + ', model ' + model.variantId + ', cutoff = order of remotePairs = ' + cutoff +
  ', prefix of ' + before.length + ' techniques (' + before.join(' ') + '), print limit ' + PRINT_LIMIT);
const find = SG.techniques.get('remotePairs').find;
const rng = SG.testkit.rng.create(seed);
const t0 = Date.now();
const items = H.randomStatesWithKnownSolution(model, rng, count * 4);
let hits = 0;
let attempted = 0;
let solvedBefore = 0;
for (let i = 0; i < items.length; i += 4) {
  const index = i / 4;
  if (index < from) continue;
  const item = items[i];
  attempted++;
  const puzzle = H.puzzleString(model, item.givens);
  const state = mode === 'below' ? H.stateAfter(model, puzzle, before) : H.makeState(model, puzzle, { propagate: mode === 'propagated' });
  if (state.unsolvedCount === 0) solvedBefore++;
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const f = find(model, state, ctx);
  if (f === null) continue;
  hits++;
  if (hits <= PRINT_LIMIT) console.log('#' + index + ' ' + puzzle + ' length ' + f.i18nArgs.length + ' ends ' + f.i18nArgs.ends.join(',') + ' digits ' +
    f.i18nArgs.digits.join('') + ' cells ' + f.cells.map((c) => H.label(model, c)).join(' ') + ' elim ' +
    f.eliminations.map((e) => H.label(model, e[0]) + '-' + e[1]).join(' ') + ' work ' + records[0].work);
}
console.log('seed ' + seed + ' puzzles ' + count + ' (from ' + from + '): attempted ' + attempted + ', fully solved by the prefix ' + solvedBefore + ', ' + hits +
  ' positions with a remote pair (' + (100 * hits / attempted).toFixed(3) + ' % of the attempted), ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
