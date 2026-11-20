'use strict';
// Scratch (MS11c): a complete solution of the blank board of every model of the unit shapes (plain depth first search),
// its time, and the constructed BUG+1 state on it (cycle of the free digits, fixed digits placed).
const SG = require('./load.js');
const H = SG.techHelper;
const models = {
  classic4: H.model('classic4'), classic6: H.model('classic6'), classic9: H.model('classic9'),
  box12: SG.fixtures.models.boxGrid('test-wing-12', 3, 4), box16: SG.fixtures.models.boxGrid('test-wing-16', 4, 4)
};
['diagonalX', 'hyper', 'jigsaw9', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku', 'mega12', 'mega16', 'killer',
  'greaterThan'].forEach((id) => {
  if (SG.testkit.hasVariant(id)) models[id] = H.model(id);
  else console.log('no variant ' + id);
});
Object.keys(models).forEach((name) => {
  const model = models[name];
  const t0 = Date.now();
  const solution = SG.dfs.solve(model, new Int32Array(model.cellCount));
  const ms = Date.now() - t0;
  const ok = solution && SG.model.isSolution(model, solution);
  console.log(name + ': cells ' + model.cellCount + ', digits ' + model.digits + ', units ' + model.units.length +
    ', cages ' + model.cages.length + ', inequalities ' + model.inequalities.length + ', solution ' + ok + ' in ' + ms + ' ms');
});
