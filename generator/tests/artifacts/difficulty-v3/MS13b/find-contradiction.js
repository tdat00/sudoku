'use strict';
// MS13b scratch: looks for a CONTRADICTION proof with a group node in it on SA2's 4x4 position of MS13a (the position of the
// forced vector), by a breadth first search over the literals of the canonical grouped graph (SG.chainGraph.build), and
// verifies each one with the independent checker (SG.chainProofs.pathProblems, canonical). It prints the proofs found, so
// that the consumer tests can use a contradiction that the checker accepts. Not part of any gate.
//   node tests/artifacts/difficulty-v3/MS13b/find-contradiction.js
const SG = require('./load.js');
const CP = SG.chainProofs;

function bit(d) { return 1 << (d - 1); }
const model = SG.model.create({ variantId: 'chain-sa2-vector', digits: 4,
  units: [[0, 1, 2, 10], [0, 3, 4, 11], [1, 3, 8, 12], [0, 5, 6, 13], [5, 2, 7, 14], [0, 1, 9, 15]],
  unitMeta: [{ kind: 'box', label: 'B1' }, { label: 'X1' }, { label: 'X2' }, { label: 'X3' }, { label: 'X4' },
    { kind: 'row', label: 'R1' }],
  layout: { rows: 4, cols: 4, cellRow: [0, 0, 1, 1, 1, 2, 2, 2, 2, 0, 1, 3, 3, 3, 3, 0],
    cellCol: [0, 1, 0, 2, 3, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 3] } });
const state = SG.model.initState(model);
[[1, 2], [1, 2, 3], [1, 2, 3], [1, 3], [2, 3], [1, 2], [1, 3], [1, 2, 3], [1, 2, 3], [2, 3]].forEach((digits, c) => {
  state.candidates[c] = digits.reduce((mask, d) => mask | bit(d), 0);
});
for (let c = 10; c < 16; c++) { state.value[c] = 4; state.candidates[c] = bit(4); }
state.unsolvedCount = 10;

const ctx = SG.techniques.createContext(model);
const graph = SG.chainGraph.build(model, state, ctx);
console.log('graph complete', graph.complete, 'nodes', graph.nodes.length);
const nodeText = (i) => JSON.stringify(graph.nodes[i]);

// literals: 2 * node + truth (truth 1 = true). From a true literal weak edges lead to false ones, from a false literal strong
// edges lead to true ones.
function reach(startLit, maxEdges) {
  const parent = new Map([[startLit, -1]]);
  const depth = new Map([[startLit, 0]]);
  const queue = [startLit];
  for (let h = 0; h < queue.length; h++) {
    const lit = queue[h];
    if (depth.get(lit) >= maxEdges) continue;
    const n = lit >> 1;
    const truth = lit & 1;
    (truth === 1 ? graph.weak[n] : graph.strong[n]).forEach((to) => {
      const next = 2 * to + (truth ^ 1);
      if (!parent.has(next)) { parent.set(next, lit); depth.set(next, depth.get(lit) + 1); queue.push(next); }
    });
  }
  return { parent, depth };
}
function pathTo(parent, lit) {
  const out = [];
  for (let l = lit; l !== -1; l = parent.get(l)) out.unshift(l);
  return out;
}
const toStep = (lit) => ({ cells: graph.nodes[lit >> 1].cells.slice(), digit: graph.nodes[lit >> 1].digit, truth: lit & 1 });

const found = [];
graph.nodes.forEach((node, s) => {
  if (node.cells.length !== 1) return;
  const start = 2 * s + 1; // a contradiction starts from a true singleton
  const r = reach(start, 6);
  for (let m = 0; m < graph.nodes.length; m++) {
    const lt = 2 * m + 1;
    const lf = 2 * m;
    if (!r.parent.has(lt) || !r.parent.has(lf)) continue;
    const a = pathTo(r.parent, lt).map(toStep);
    const b = pathTo(r.parent, lf).map(toStep);
    const hasGroup = a.concat(b).some((x) => x.cells.length > 1);
    const root = graph.nodes[s];
    const finding = {
      technique: 'forcingChain', cells: [], placements: [], eliminations: [[root.cells[0], root.digit]],
      i18nKey: 'technique.forcingChain.step.contradiction',
      i18nArgs: { proofVersion: 2, kind: 'contradiction', length: Math.max(a.length, b.length) - 1, chains: [a, b] }
    };
    const union = [];
    a.concat(b).forEach((x) => x.cells.forEach((c) => { if (!union.includes(c)) union.push(c); }));
    finding.cells = union.sort((x, y) => x - y);
    const problems = CP.pathProblems(model, state, finding, { canonical: true });
    found.push({ hasGroup, problems, finding });
  }
});
console.log('contradiction candidates', found.length, 'valid', found.filter((f) => f.problems.length === 0).length,
  'valid with a group', found.filter((f) => f.problems.length === 0 && f.hasGroup).length);
found.filter((f) => f.problems.length === 0 && f.hasGroup).sort((x, y) => x.finding.i18nArgs.length - y.finding.i18nArgs.length)
  .slice(0, 5).forEach((f) => console.log(JSON.stringify(f.finding)));
found.filter((f) => f.problems.length > 0).slice(0, 3).forEach((f) => console.log('INVALID', f.problems.join(' | ')));
