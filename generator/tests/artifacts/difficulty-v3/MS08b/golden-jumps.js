'use strict';
// Scratch (MS08b fix round): prints the jumps of the G06 and G07 goldens (step, cause class, choice kind, first use).
const SG = require('./load.js');
const goldens = SG.fixtures.replayGoldens;
const list = Array.isArray(goldens) ? goldens : Object.keys(goldens).map((k) => goldens[k]);
list.filter((g) => g && (g.id === 'G06' || g.id === 'G07')).forEach((g) => {
  console.log(g.id, 'rows', g.rows.length, 'final', JSON.stringify(g.rows[g.rows.length - 1]));
  (g.jumps || []).forEach((j) => console.log('  jump step ' + j.step + ' cause ' + j.cause + ' choice ' +
    JSON.stringify(j.choice) + ' firstUse ' + JSON.stringify(j.firstUse) + ' key ' + j.key));
});
