'use strict';

// MS07c scratch: the facts the replay suite pins on boards: the stuck board of the Classic 9x9 example, and which golden
// result has a uniqueness count that runs out of a 1-check guard (read-only).
const SG = globalThis.SG;
const R = SG.replay;
const WIRE = SG.fixtures.replayWire;
const GOLDENS = SG.fixtures.replayGoldens;
function resultOf(g) {
  return WIRE[g.id] ? R.fromPlainWire(WIRE[g.id])
    : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
}
const g01 = resultOf(GOLDENS.filter((g) => g.id === 'G01')[0]);
const board = '004600000721000000900004070070061005400807002600520080060700009000000728000005600';
const rating = R.rateBoard(g01.model, Int32Array.from(board.split('').map(Number)));
console.log('stuck board', rating.status, JSON.stringify(rating.reasons), rating.empties, JSON.stringify(rating.counts));
['G01', 'G03', 'G04', 'G05', 'G06', 'G07'].forEach((id) => {
  const result = resultOf(GOLDENS.filter((g) => g.id === id)[0]);
  const out = R.rateBoard(result.model, result.givens, { forceCount: true, countNodes: 1 });
  const rated = R.rateBoard(result.model, result.givens, { forceCount: true });
  console.log(id, 'countNodes 1:', out.status, 'default:', rated.status, rated.score, 'final', result.rating.score);
});
