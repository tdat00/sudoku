'use strict';
// Scratch (MS11c): the rated level, score and hardest technique of the two real positive puzzles (with the registry of the
// tree), to label their export-text header honestly for the help example source.
const SG = require('./load.js');
const D = SG.difficulty;
const H = SG.techHelper;
const m9 = H.model('classic9');
const puzzles = {
  BUG_LOW: '.12843...3.......2...2....7.24.7.........9..8.7...2.3.....1..6...9..64........1.9',
  BUG_HIGH: '..32.4.6.....5.8..6...93....2......74.........6.1.........4..9....31.2...12..97.3'
};
Object.keys(puzzles).forEach((name) => {
  const givens = H.parsePuzzle(m9, puzzles[name]);
  const r = D.rate(m9, givens);
  const clues = Array.from(givens).filter((v) => v !== 0).length;
  console.log(name + ': clues ' + clues + ', level ' + r.level + ', score ' + r.score + ', hardest ' + r.hardestTechnique +
    ', bugPlusOne uses ' + (r.techniqueCounts.bugPlusOne || 0));
});
