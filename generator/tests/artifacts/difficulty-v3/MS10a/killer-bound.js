'use strict';
// Scratch (MS10a): the work bound of remotePairs on ASSEMBLED caged Killer models (RP-01 / S-AV32's known exception: a cage is a
// partial all-different unit, so its cells are real peers). The earlier structural figures of structural-max.js and the census
// of work-census.js used the uncaged 27-unit `killer` model (H.model('killer') = build()), which has no cage peers; they are kept
// and labelled as that population. Here: (1) two assembled layouts, the Killer puzzle of the help catalogue (25 cages, some of
// them spanning boxes, so with cage-only peer edges) and the generator help's 27 three-cell box cages (no peer beyond the boxes);
// (2) the structural bound per layout and for ANY layout (cages of at most MAX_CAGE_CELLS = 7 cells: a cell has at most 6 cage-mates;
// and the absolute bound of an 81-cell model, every cell a peer of every other); (3) observations on layout A: the solve
// trajectory of its puzzle, pruned random states of its solution, the constructed cage-only chains, and the flood where every cell
// holds {1, 2} (the work is the sum of the peers). One call = one find(model, state, ctx) of the registered finder.
//   node tests/artifacts/difficulty-v3/MS10a/killer-bound.js [--json=<file>]
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const H = SG.techHelper;

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const text = fs.readFileSync(path.join(ROOT, 'player/js/ui/help-examples.js'), 'utf8');
const start = text.indexOf('cageSplit: {');
const example = JSON.parse(text.slice(start, text.indexOf('\n', start)).slice('cageSplit: '.length).replace(/,\s*$/, ''));
const solutionOf = (model, givens) => SG.dfs.solve(model, givens);
const find = SG.techniques.get('remotePairs').find;
const out = { layouts: [], observed: {}, universal: {} };

function structural(name, model) {
  const n = model.cellCount;
  const U = model.units.length;
  const completeKinds = { row: 1, col: 1, box: 1, region: 1 };
  let peerSum = 0;
  let fewest = Infinity;
  let mostPeers = 0;
  let cageOnlyEdges = 0;
  const classic = new Uint8Array(n * n);
  model.units.forEach((cells, u) => {
    if (!completeKinds[model.unitMeta[u].kind]) return;
    for (const a of cells) for (const b of cells) if (a !== b) classic[a * n + b] = 1;
  });
  for (let c = 0; c < n; c++) {
    peerSum += model.peers[c].length;
    fewest = Math.min(fewest, model.cellUnits[c].length);
    mostPeers = Math.max(mostPeers, model.peers[c].length);
    model.peers[c].forEach((d) => { if (d > c && !classic[c * n + d]) cageOnlyEdges++; });
  }
  const kmax = Math.min(n, Math.floor((2 * U) / fewest));
  const pairs = Math.floor((n * kmax) / 4);
  const walk = 2 * U;
  const row = { layout: name, cells: n, units: U, cageUnits: model.unitMeta.filter((m) => m.kind === 'cage').length,
    peerSum, mostPeersOfACell: mostPeers, cageOnlyPeerEdges: cageOnlyEdges, fewestUnitsOfACell: fewest, kmax, pairs, walk,
    maximum: peerSum + pairs + walk, limit: 50000 };
  console.log(JSON.stringify(row));
  out.layouts.push(row);
  return row;
}

const modelA = SG.killer.modelFromCages(example.cages);
const solutionA = solutionOf(modelA, H.parsePuzzle(modelA, example.givens));
const boxCages = [];
for (let box = 0; box < 9; box++) {
  const top = Math.floor(box / 3) * 3;
  const left = (box % 3) * 3;
  [[[0, 0], [0, 1], [1, 0]], [[0, 2], [1, 2], [2, 2]], [[1, 1], [2, 1], [2, 0]]].forEach((shape) => {
    boxCages.push({ cells: shape.map((rc) => (top + rc[0]) * 9 + left + rc[1]).sort((a, b) => a - b), sum: 15 });
  });
}
const modelB = SG.killer.modelFromCages(boxCages);
const rowA = structural('A: the Killer puzzle of the help catalogue (25 cages)', modelA);
const rowB = structural('B: 27 three-cell box cages (the generator help)', modelB);
structural('uncaged killer build() (the earlier 27-unit population)', H.model('killer'));

// Any layout: cages of at most 7 cells (the generator's MAX_CAGE_CELLS) and the absolute bound of an 81-cell model.
const n = 81;
const generated = { peersPerCell: 20 + 6, cages: Math.floor(81 / 2) };
const gU = 27 + generated.cages;
const gPeerSum = n * generated.peersPerCell;
const gKmax = Math.min(n, Math.floor((2 * gU) / 3));
out.universal.generatedLayouts = { rule: 'cages of 2 to 7 cells: a cell has at most 20 box/row/column peers and 6 cage-mates, at most 40 cages',
  units: gU, peerSum: gPeerSum, kmax: gKmax, pairs: Math.floor((n * gKmax) / 4), walk: 2 * gU,
  maximum: gPeerSum + Math.floor((n * gKmax) / 4) + 2 * gU };
const aPeerSum = n * (n - 1);
out.universal.absolute = { rule: 'imported cages of any shape: every cell a peer of every other', units: gU, peerSum: aPeerSum, kmax: gKmax,
  pairs: Math.floor((n * gKmax) / 4), walk: 2 * gU, maximum: aPeerSum + Math.floor((n * gKmax) / 4) + 2 * gU };
console.log(JSON.stringify(out.universal));

function summarise(name, records, latencies, found, extra) {
  latencies.sort((a, b) => a - b);
  const works = records.map((r) => r.work);
  const row = Object.assign({ population: name, calls: records.length, found, capped: records.filter((r) => r.capHit !== null).length,
    largestWork: Math.max.apply(null, works), latencyMsMax: Number(latencies[latencies.length - 1].toFixed(3)) }, extra || {});
  console.log(JSON.stringify(row));
  out.observed[name] = row;
}
function call(model, state, records, latencies) {
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const t0 = process.hrtime.bigint();
  const f = find(model, state, ctx);
  latencies.push(Number(process.hrtime.bigint() - t0) / 1e6);
  return f;
}

// (a) the solve trajectory of the puzzle of layout A: the state before every step of the complete ladder
{
  const records = [];
  const latencies = [];
  let found = 0;
  const givens = H.parsePuzzle(modelA, example.givens);
  const state = H.makeState(modelA, givens);
  const ctxSolve = SG.techniques.createContext(modelA, { assumeUniqueness: true });
  for (let step = 0; step < 200 && state.unsolvedCount > 0; step++) {
    if (call(modelA, state, records, latencies) !== null) found++;
    let moved = null;
    for (const tech of SG.techniques.list()) {
      if (!SG.techniques.appliesTo(tech, 'killer') || tech.id === 'remotePairs') continue;
      moved = tech.find(modelA, state, ctxSolve);
      if (moved) break;
    }
    if (!moved) break;
    moved.placements.forEach((p) => SG.constraints.assign(modelA, state, p[0], p[1]));
    moved.eliminations.forEach((e) => SG.constraints.eliminate(modelA, state, e[0], e[1]));
    SG.constraints.propagate(modelA, state);
  }
  summarise('layout A: states of the solve trajectory of its puzzle', records, latencies, found);
}

// (b) pruned random states of the solution of layout A (a share of the wrong candidates removed, as H.randomStatesWithKnownSolution)
{
  const records = [];
  const latencies = [];
  let found = 0;
  const rng = SG.testkit.rng.create(4242);
  for (let k = 0; k < 400; k++) {
    const r = rng.fork('killer-bound.' + k);
    const state = H.makeState(modelA, H.parsePuzzle(modelA, example.givens));
    const share = 0.02 + 0.2 * r.next();
    for (let c = 0; c < n; c++) {
      if (state.value[c] !== 0) continue;
      for (let v = 1; v <= 9; v++) {
        if (v !== solutionA[c] && (state.candidates[c] & (1 << (v - 1))) !== 0 && r.next() < share) SG.constraints.eliminate(modelA, state, c, v);
      }
    }
    const f = call(modelA, state, records, latencies);
    if (f !== null) {
      found++;
      const problems = H.findingProblems(modelA, state, f, { technique: 'remotePairs', solution: solutionA });
      if (problems.length > 0) throw new Error('unsound on pruned state ' + k + ': ' + problems.join('; '));
    }
  }
  summarise('layout A: 400 pruned random states of the solution (seed 4242), every Finding sound against the solution', records, latencies, found);
}

// (c) the flood on both layouts: every cell holds {1, 2}; the work is the sum of the peers
[['A', modelA, rowA], ['B', modelB, rowB]].forEach(([name, model, row]) => {
  const state = SG.model.initState(model);
  for (let c = 0; c < n; c++) state.candidates[c] = 3;
  const records = [];
  const latencies = [];
  const f = call(model, state, records, latencies);
  summarise('layout ' + name + ': flood, every cell {1, 2}', records, latencies, f !== null ? 1 : 0,
    { workEqualsPeerSum: records[0].work === row.peerSum, peerSum: row.peerSum });
});

if (process.argv.some((a) => a.startsWith('--json='))) {
  const file = process.argv.find((a) => a.startsWith('--json=')).slice(7);
  fs.writeFileSync(file, JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
}
