'use strict';
// Scratch (MS08c): the cells of the sign jumps of the refreshed G11 (details positions 66 and 103), to refresh the pin of the
// steps suite that names the sign of the callout.
const SG = require('./load.js');
const R = SG.replay;
const g = SG.fixtures.replayGoldens.filter((x) => x.id === 'G11')[0];
const result = R.fromPlainWire(SG.fixtures.replayWire.G11);
const label = (c) => SG.model.cellLabel(result.model, c);
[67, 5].forEach((s) => {
  const ineq = result.model.inequalities[s];
  console.log('sign ' + s + ' ' + JSON.stringify(ineq) + ' ' + (ineq ? label(ineq.a) + ' ' + label(ineq.b) : ''));
});
