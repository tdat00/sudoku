'use strict';
// Scratch (MS11b): the recorded values that two pins of tests/suites/replay.test.js read, printed from the code of the
// tree (the same calls as the test): the technique counts of the stuck board of section 2.3 and the moves of G14 whose
// span has unscored candidates (the witness of the unfinished checks), with the rating at each.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS11b/pins-replay.js
const SG = require('./load.js');
const R = SG.replay;
const GOLDENS = SG.fixtures.replayGoldens;
const golden = (id) => GOLDENS.filter((g) => g.id === id)[0];
const gen = (id) => SG.pipeline.run(SG.store.toConfig(golden(id).request), null, SG.budget.create({ ms: 120000 }));

const g01 = gen('G01');
const board = '004600000721000000900004070070061005400807002600520080060700009000000728000005600';
const rating = R.rateBoard(g01.model, Int32Array.from(board.split('').map(Number)));
console.log('stuck board: status ' + rating.status + ', reasons ' + JSON.stringify(rating.reasons) + ', empties ' +
  rating.empties + ', counts ' + JSON.stringify(rating.counts));

const analysis = R.analyse(gen('G14'));
console.log('G14 moves ' + analysis.moves.length);
analysis.moves.forEach((m, i) => {
  if (m.span && m.span.nulls > 0) {
    console.log('move ' + i + ': at ' + m.at + ', rated ' + m.span.rated + ', refused ' + m.span.refused + ', others ' +
      m.span.others + ', nulls ' + m.span.nulls + ', chosen ' + JSON.stringify(m.span.chosen));
  }
});
const m76 = analysis.moves[76];
console.log('move 76: ' + (m76 ? 'at ' + m76.at + ' span ' + JSON.stringify(m76.span) : 'none'));
