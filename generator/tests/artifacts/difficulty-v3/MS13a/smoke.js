'use strict';
// MS13a scratch: a first look at the graph builder (a blank classic9 board and a few states). Short (well under 10 s).
const SG = require('./load.js');
const H = SG.techHelper;
const m = H.model('classic9');
const blank = SG.model.initState(m);
const ctx = SG.techniques.createContext(m, {});
let t = process.hrtime.bigint();
const g = SG.chainGraph.build(m, blank, ctx);
t = Number(process.hrtime.bigint() - t) / 1e6;
const edges = (lists) => lists.reduce((s, l) => s + l.length, 0) / 2;
console.log('blank classic9: nodes', g.nodes.length, 'complete', g.complete, 'work', g.work, 'capHit', g.capHit,
  'weak', edges(g.weak), 'strong', edges(g.strong), 'ms', t.toFixed(2));
console.log('first groups', JSON.stringify(g.nodes.slice(729, 735)));
const F = SG.fixtures.classic.unique[0];
const s = H.makeState(m, F.puzzle);
const ctx2 = SG.techniques.createContext(m, {});
const g2 = SG.chainGraph.build(m, s, ctx2);
console.log(F.name, 'nodes', g2.nodes.length, 'work', g2.work, 'complete', g2.complete, 'weak', edges(g2.weak), 'strong', edges(g2.strong));
