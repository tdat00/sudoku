'use strict';
// Scratch (MS13a): the work, the node counts and the cap hits of the grouped graph builder at its DEFAULT limits (4096 groups,
// 50000 tested combinations) on fixed populations: the seeded states of the shared test kit (every kind of
// H.randomStatesWithKnownSolution, pruned states with many wrong candidates, the real stuck positions of the evil puzzles
// after the techniques below the chains) and, apart, the constructed blank boards. Latency is the mean build time in one
// locked process (not a protected measurement). Output: one JSON object and a table.
//   node tests/artifacts/difficulty-v3/MS13a/work-census.js [json file]
const fs = require('fs');
const SG = require('./load.js');
const H = SG.techHelper;

function pruned(model, count, seed, low, span) {
  const out = [];
  const rng = SG.testkit.rng.create(seed);
  for (let i = 0; i < count; i++) {
    const r = rng.fork('pruned.' + i);
    const solution = SG.testkit.randomSolution(model, r.fork('grid'));
    const state = SG.model.initState(model);
    const share = 0.02 + 0.1 * r.next();
    const st = r.fork('state');
    for (let c = 0; c < model.cellCount; c++) if (st.next() < share) SG.constraints.assign(model, state, c, solution[c]);
    const keepShare = low + span * r.next();
    for (let c = 0; c < model.cellCount; c++) {
      if (state.value[c] !== 0) continue;
      let keep = 1 << (solution[c] - 1);
      for (let v = 1; v <= model.digits; v++) if (v !== solution[c] && st.next() < keepShare) keep |= 1 << (v - 1);
      state.candidates[c] &= keep;
    }
    out.push(state);
  }
  return out;
}

function summarize(model, states) {
  const ctx = SG.techniques.createContext(model, {});
  const rows = [];
  const t0 = process.hrtime.bigint();
  states.forEach((state) => {
    const g = SG.chainGraph.build(model, state, ctx);
    rows.push({ nodes: g.nodes.length, groups: g.nodes.filter((n) => n.cells.length > 1).length, work: g.work,
      capHit: g.capHit, complete: g.complete });
  });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const sorted = (key) => rows.map((r) => r[key]).sort((a, b) => a - b);
  const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
  const work = sorted('work');
  const nodes = rows.filter((r) => r.complete).map((r) => r.nodes).sort((a, b) => a - b);
  return { calls: rows.length, complete: rows.filter((r) => r.complete).length,
    capWork: rows.filter((r) => r.capHit === 'work').length, capNodes: rows.filter((r) => r.capHit === 'nodes').length,
    workMin: work[0], workMedian: q(work, 0.5), workP95: q(work, 0.95), workMax: work[work.length - 1],
    nodesMax: nodes.length ? nodes[nodes.length - 1] : null, groupsMax: Math.max.apply(null, rows.map((r) => r.groups)),
    meanMs: Number((ms / rows.length).toFixed(3)) };
}

const result = {};
function add(name, model, states) {
  result[name] = summarize(model, states);
}
const m9 = H.model('classic9');
const items9 = H.randomStatesWithKnownSolution(m9, SG.testkit.rng.create(4242), 160);
['initial', 'propagated', 'pruned'].forEach((kind) => add('classic9 ' + kind, m9,
  items9.filter((i) => i.kind === kind).map((i) => i.state)));
add('classic9 many wrong candidates', m9, pruned(m9, 60, 8001, 0.04, 0.2));
const stuck = ['escargot', 'worlds-hardest-2012', 'hard-platinum', 'hard-nugget', 'hard-b', 'hard-c'].map((name) => {
  const fx = SG.fixtures.classic.unique.filter((f) => f.name === name)[0];
  const lower = SG.techniques.list().filter((t) => t.group !== 'chain' && t.variantScope === null).map((t) => t.id);
  const state = H.stateAfter(m9, fx.puzzle, lower);
  SG.constraints.propagate(m9, state);
  return state;
});
add('classic9 stuck positions of 6 evil puzzles', m9, stuck);
const m6 = H.model('classic6');
add('classic6 many wrong candidates', m6, pruned(m6, 60, 8002, 0.05, 0.3));
const m4 = H.model('classic4');
add('classic4 many wrong candidates', m4, pruned(m4, 60, 8003, 0.05, 0.5));
const m12 = SG.fixtures.models.boxGrid('census-12', 3, 4);
add('12 digits many wrong candidates', m12, pruned(m12, 6, 8004, 0.02, 0.1));
const m16 = SG.fixtures.models.boxGrid('census-16', 4, 4);
add('16 digits many wrong candidates', m16, pruned(m16, 6, 8005, 0.02, 0.1));
const sam = SG.fixtures.models.samurai();
add('samurai many wrong candidates', sam, pruned(sam, 6, 8006, 0.02, 0.1));
result.constructed = {};
[['blank classic9', m9], ['blank classic4', m4], ['blank 16 digits', m16], ['blank samurai', sam]].forEach(([name, model]) => {
  result.constructed[name] = summarize(model, [SG.model.initState(model)]);
});
const text = JSON.stringify(result, null, 2);
if (process.argv[2]) fs.writeFileSync(process.argv[2], text.replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(text);
