'use strict';
// Scratch (MS08b): does skyscraper find anything on the positions of the existing xWing / simpleColouring fixtures?
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const F = SG.fixtures.techniques;
const ctx = SG.techniques.createContext(m9, { assumeUniqueness: false });
['xWing', 'simpleColouring', 'swordfish', 'jellyfish'].forEach((id) => {
  const entry = F.historyV2.byId[id];
  entry.positive.concat(entry.negative).forEach((fx) => {
    const state = fx.after !== null ? H.stateAfter(m9, fx.puzzle, fx.after) : H.makeState(m9, fx.puzzle, { propagate: fx.propagate });
    const sky = SG.techniques.get('skyscraper').find(m9, state, ctx);
    const own = SG.techniques.get(id).find(m9, state, ctx);
    console.log(id, fx.name, '| own:', own ? JSON.stringify(own.eliminations) : null, '| skyscraper:', sky ? JSON.stringify(sky.eliminations) : null);
  });
});
