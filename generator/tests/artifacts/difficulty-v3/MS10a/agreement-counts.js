'use strict';
// Scratch (MS10a): how many states of each corpus hold a remote pair (the registered finder, first call per state), to
// choose the sizes and the minima of the agreement tests. Bounded: the counts below are the whole run.
const SG = require('./load.js');
const H = SG.techHelper;
const find = SG.techniques.get('remotePairs').find;

function boxGrid(D) {
  return D === 12 ? SG.fixtures.models.boxGrid('probe-12', 3, 4) : SG.fixtures.models.boxGrid('probe-16', 4, 4);
}
const setups = [
  ['classic9', 'classic9', 800, 777], ['classic9', 'classic9', 800, 99], ['classic6', 'classic6', 400, 777],
  ['classic4', 'classic4', 400, 777], ['12 digits', boxGrid(12), 120, 2026], ['16 digits', boxGrid(16), 32, 2026],
  ['diagonalX', 'diagonalX', 120, 4242], ['hyper', 'hyper', 120, 4242], ['jigsaw9', 'jigsaw9', 120, 4242],
  ['samurai', 'samurai', 12, 4242], ['sohei', 'sohei', 12, 4242], ['flower', 'flower', 12, 4242],
  ['butterfly', 'butterfly', 12, 4242]
];
setups.forEach(([name, spec, count, seed]) => {
  if (typeof spec === 'string' && !SG.testkit.hasVariant(spec)) {
    console.log(name + ': no board');
    return;
  }
  const model = typeof spec === 'string' ? H.model(spec) : spec;
  const t0 = Date.now();
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), count);
  const ctx = SG.techniques.createContext(model, { assumeUniqueness: true });
  let fired = 0;
  let longest = 0;
  const byKind = {};
  items.forEach((item) => {
    const f = find(model, item.state, ctx);
    if (f === null) return;
    fired++;
    longest = Math.max(longest, f.i18nArgs.length);
    byKind[item.kind] = (byKind[item.kind] || 0) + 1;
  });
  console.log(name + ' seed ' + seed + ': ' + fired + ' of ' + items.length + ' states, longest ' + longest + ', ' +
    JSON.stringify(byKind) + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
});
