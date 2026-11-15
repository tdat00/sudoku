'use strict';

// MS07c scratch: the golden fixture entries (jumps, rows) of the goldens named on the command line, read-only.
const SG = globalThis.SG;
process.argv.slice(3).forEach((id) => {
  const g = SG.fixtures.replayGoldens.filter((x) => x.id === id)[0];
  console.log('== ' + id + ' counts ' + JSON.stringify(g.counts));
  g.jumps.forEach((j) => console.log('jump step ' + j.step + ' ' + j.from + '>' + j.to + ' cause ' + j.cause + ' frame ' + j.frame +
    ' singles ' + JSON.stringify(j.singles) + ' choice ' + JSON.stringify(j.choice) + ' firstUse ' + JSON.stringify(j.firstUse) +
    ' key ' + j.key + ' effects ' + j.effects));
  g.rows.forEach((r, i) => console.log('row ' + i + ' ' + JSON.stringify(r)));
});
