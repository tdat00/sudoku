'use strict';
// Scratch (MS10b): the last moves of G04 (the exchanges and the final search removal), for the pin of replay.test.js.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS10b/facts-g04.js
const SG = require('./load.js');
const R = SG.replay;
const g = SG.fixtures.replayGoldens.filter((x) => x.id === 'G04')[0];
const result = SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
const moves = R.moves(result).moves;
moves.slice(26).forEach((m, k) => {
  console.log('move ' + (k + 26) + ' kind ' + m.kind + ' phase ' + m.phase + ' pass ' + m.pass + ' from ' + m.from + ' to ' + m.to +
    ' at ' + m.at + ' removed ' + m.removed.length + ' restored ' + m.restored.length + ' sign ' + m.sign);
});
const boards = moves.map((m) => Array.from(m.values).join(','));
const exchanges = [];
moves.forEach((m, i) => {
  if (m.kind !== 'exchange') return;
  const half = Int32Array.from(moves[i - 1].values);
  m.removed.forEach((c) => { half[c] = 0; });
  exchanges.push(i + ':' + (boards.indexOf(Array.from(half).join(',')) === -1 ? 'half-not-a-position' : 'HALF IS A POSITION'));
});
console.log('exchanges ' + exchanges.join(' '));
console.log('digLog ' + (result.digLog || []).length);
const unsafe = '070301000405060130100000008052008000000604000000200890600000004043070609000406080';
console.log('unsafe board among positions: ' + moves.map((m) => Array.from(m.values).join('')).includes(unsafe));
