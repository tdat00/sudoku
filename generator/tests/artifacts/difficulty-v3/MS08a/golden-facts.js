'use strict';
// Scratch (MS08a): the facts of the replay goldens that the replay/steps suites pin, as the current code and the
// refreshed fixtures give them. Usage (from generator/): node tests/artifacts/difficulty-v3/MS08a/golden-facts.js
const SG = require('./load.js');
const R = SG.replay;
const GOLDENS = SG.fixtures.replayGoldens;
const WIRE = SG.fixtures.replayWire;
const built = {};
function golden(id) { return GOLDENS.filter((g) => g.id === id)[0]; }
function entry(id) {
  if (!built[id]) {
    const g = golden(id);
    built[id] = WIRE[id] ? R.fromPlainWire(WIRE[id])
      : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
  }
  return built[id];
}
const ids = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['G01', 'G04'];
ids.forEach((id) => {
  const result = entry(id);
  const mm = R.moves(result);
  const analysis = R.analyse(result);
  console.log('== ' + id + ' ok=' + mm.ok + ' positions=' + mm.moves.length + ' score=' + result.rating.score +
    ' level=' + result.rating.level + ' digLog=' + result.digLog.length + ' empties=' + analysis.ratings[analysis.ratings.length - 1].empties);
  console.log('givens ' + Array.from(result.givens).join(''));
  console.log('kinds ' + mm.moves.map((m) => m.kind[0]).join(''));
  const first = mm.moves.findIndex((m) => m.kind === 'guided');
  if (first > 0) {
    const m = mm.moves[first];
    console.log('first guided #' + first + ' at=' + m.at + ' span=' + JSON.stringify(m.span));
    let rated = 0;
    let refused = 0;
    mm.moves.slice(first + 1).filter((g) => g.kind === 'guided').forEach((g) => { rated += g.span.rated; refused += g.span.refused; });
    console.log('later guided: rated ' + rated + ' refused ' + refused);
  }
  const randomCells = mm.moves.filter((m) => m.kind === 'random').reduce((n, m) => n + m.removed.length, 0);
  console.log('random cells removed ' + randomCells);
  console.log('stats ' + JSON.stringify(analysis.stats) + ' transitions ' + analysis.transitions.length +
    ' compact ' + analysis.views.compact.steps.length + ' details ' + analysis.views.details.steps.length);
  console.log('compact scores ' + analysis.views.compact.steps.map((s) => analysis.ratings[s.position].score).join(',') +
    ' positions ' + analysis.views.compact.steps.map((s) => s.position).join(',') +
    ' roles ' + analysis.views.compact.steps.map((s) => s.role).join(','));
  console.log('tiers ' + JSON.stringify(analysis.views.compact.steps.map((s) => s.transition === null ? null : analysis.transitions[s.transition].tier)));
  const last = analysis.ratings.length - 1;
  console.log('ratings last ' + JSON.stringify({ status: analysis.ratings[last].status, score: analysis.ratings[last].score,
    memo: analysis.ratings[last].memo }));
  console.log('golden jumps ' + JSON.stringify(golden(id).jumps.map((j) => ({ step: j.step, from: j.from, to: j.to, key: j.key }))));
  const jumps = analysis.transitions.filter((t) => t.tier === 'jump').map((t) => t.view + ':' + t.from + '>' + t.to + ':' + t.before.total + '>' + t.after.total);
  console.log('jump transitions ' + jumps.join(' '));
});
