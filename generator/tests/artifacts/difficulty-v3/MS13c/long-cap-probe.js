'use strict';
// MS13c scratch: the old long-chain puzzle #530 (and the other replaced ones) at their stuck positions under the grouped
// ladder (C = 6): the registered forcingChainLong with its record, against the singleton search over the same window.
const SG = require('./load.js');
const H = SG.techHelper;
const m9 = H.model('classic9');
const CS = SG.chainSearch;
const below = SG.techniques.list().filter((t) => t.variantScope === null &&
  SG.techniques.get('forcingChainLong').order > t.order).map((t) => t.id);
const olds = {
  '#29': '...5....94.....31....39.6....7.......6...35...8..6.9...4....86..1.28.......6.9.7.',
  '#155': '...284.....51..83.....53....9.........8.....6.6..351.437.....6....4.2..88.......7',
  '#1036': '.1...6.393.6............2.45.8.1....2.........7.6.4..89.....85.8.7.....2.3...29..',
  '#521': '.....5..3..7....16...23....2.....8....5.4....4...1...2.9..875..8..1..6.9...3.....',
  '#530': '...5.94...4...2..82.71.....7.....26...3.....7.1.6...95...........92.5..1.36......',
  '#713': '2.6..7..4....3..1.45.......6........8329...7..4..2.3.....4.9...1......6...8.1..9.',
  '#1003': '.2......6..892.7..1...8..3...6.74...2..5.6.........1..95......76..3..9...84.....5'
};
for (const [name, p] of Object.entries(olds)) {
  const before = CS.SHORT_MAX;
  CS.SHORT_MAX = 6;
  let state;
  try { state = H.stateAfter(m9, p, below); } finally { CS.SHORT_MAX = before; }
  if (state.unsolvedCount === 0) { console.log(name, 'solved'); continue; }
  const records = [];
  CS.SHORT_MAX = 6;
  let reg; let sing;
  try {
    reg = SG.techniques.get('forcingChainLong').find(m9, state, SG.techniques.createContext(m9, { onPatternWork: (r) => records.push(r) }));
    sing = CS.forcing(m9, state, SG.techniques.createContext(m9, {}), { id: 'forcingChainLong', minLength: 7, maxLength: 12, workLimit: 50000 });
  } finally { CS.SHORT_MAX = before; }
  console.log(name, 'open', state.unsolvedCount, 'registered', reg ? reg.i18nArgs.length : null, JSON.stringify(records[0].grouped),
    'work', records[0].work, 'capHit', records[0].capHit, '| singleton', sing ? sing.i18nArgs.length : null);
}
