'use strict';
// Scratch (MS13a, after SA1's review of the census): the work of the grouped graph builder on EVERY model of
// SG.testkit.VARIANT_IDS, at the default limits (4096 groups, 50000 units) and at lifted limits (the true work).
// Populations per model, labelled as what they are:
//   - constructed: the blank state (every candidate in every cell: the structural maximum of the board, since nodes, group
//     candidates and same-digit pairs only grow with the candidates);
//   - synthetic: the initial, propagated and pruned states of SG.techHelper.randomStatesWithKnownSolution(m, rng(77003), 24)
//     (6 puzzles dug from random solutions by the test kit) and 6 states with many wrong candidates;
//   - ladder: every position at which a ladder solve (the registered techniques in registry order, one Finding at a time,
//     starting from the propagated state of each of those 6 puzzles) reaches the chain group, i.e. the position where
//     xyChain is tried because every earlier technique found nothing; the final stuck position is one of them.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS13a/work-census-all.js <out dir> [id,id,...]
// Writes <out dir>/<id>.json (CRLF) and prints one line per population.
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const H = SG.techHelper;
const CP = SG.chainProofs;
const DEFAULT_WORK = SG.chainGraph.LIMITS.work;
const LIFT = { workLimit: 1000000000, groupLimit: 1000000000 };
const MAX_STEPS = 3000;

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

function applyFinding(model, state, finding) {
  for (const p of finding.placements) if (!SG.constraints.assign(model, state, p[0], p[1])) return false;
  for (const e of finding.eliminations) if (!SG.constraints.eliminate(model, state, e[0], e[1])) return false;
  return SG.constraints.propagate(model, state);
}

// Every position of one ladder solve at which the chain group is reached.
function ladderPositions(model, start, ctx, techs) {
  const positions = [];
  const state = SG.model.cloneState(start);
  let steps = 0;
  let outcome = 'solved';
  while (state.unsolvedCount > 0) {
    if (steps >= MAX_STEPS) { outcome = 'step cap'; break; }
    let fired = null;
    for (const tech of techs) {
      if (tech.id === 'xyChain') positions.push(SG.model.cloneState(state));
      fired = tech.find(model, state, ctx);
      if (fired) break;
    }
    if (!fired) { outcome = 'stuck'; break; }
    if (!applyFinding(model, state, fired)) { outcome = 'contradiction'; break; }
    steps++;
  }
  return { positions, steps, outcome };
}

function quantiles(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return sorted.length === 0 ? null : { min: sorted[0], median: q(0.5), p95: q(0.95), max: sorted[sorted.length - 1] };
}

function summarize(model, ctx, states) {
  const rows = [];
  let liftedMs = 0;
  states.forEach((state) => {
    const d = SG.chainGraph.build(model, state, ctx);
    const t0 = process.hrtime.bigint();
    const l = SG.chainGraph.build(model, state, ctx, LIFT);
    liftedMs += Number(process.hrtime.bigint() - t0) / 1e6;
    rows.push({ d, l });
  });
  const n = rows.length;
  return {
    calls: n,
    defaultComplete: rows.filter((r) => r.d.complete).length,
    cappedWork: rows.filter((r) => r.d.capHit === 'work').length,
    cappedNodes: rows.filter((r) => r.d.capHit === 'nodes').length,
    defaultWork: quantiles(rows.map((r) => r.d.work)),
    liftedComplete: rows.filter((r) => r.l.complete).length,
    liftedWork: quantiles(rows.map((r) => r.l.work)),
    over50000: rows.filter((r) => r.l.work > DEFAULT_WORK).length,
    nodesMax: Math.max.apply(null, rows.map((r) => r.l.nodes.length)),
    groupsMax: Math.max.apply(null, rows.map((r) => r.l.nodes.filter((x) => x.cells.length > 1).length)),
    liftedMeanMs: Number((liftedMs / n).toFixed(3))
  };
}

function census(id) {
  const model = H.model(id);
  const ctx = SG.techniques.createContext(model, { assumeUniqueness: true });
  const techs = SG.techniques.list().filter((t) => SG.techniques.appliesTo(t, model.variantId));
  const out = {
    id, cellCount: model.cellCount, digits: model.digits, units: model.units.length, populations: {}, notes: {}
  };
  const t0 = Date.now();
  const blank = SG.model.initState(model);
  out.populations['constructed: blank'] = summarize(model, ctx, [blank]);
  const lifted = SG.chainGraph.build(model, blank, ctx, LIFT);
  out.notes.blank = { work: lifted.work, nodes: lifted.nodes.length,
    expectedWork: CP.expectedWork(model, blank).total, groups: lifted.nodes.filter((x) => x.cells.length > 1).length };
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(77003), 24);
  ['initial', 'propagated', 'pruned'].forEach((kind) => {
    out.populations['synthetic: ' + kind] = summarize(model, ctx, items.filter((i) => i.kind === kind).map((i) => i.state));
  });
  out.populations['synthetic: many wrong candidates'] = summarize(model, ctx, pruned(model, 6, 8001, 0.04, 0.2));
  const solves = items.filter((i) => i.kind === 'propagated').map((i) => ladderPositions(model, i.state, ctx, techs));
  const positions = [].concat(...solves.map((s) => s.positions));
  out.notes.ladder = {
    puzzles: solves.length, puzzlesReachingChains: solves.filter((s) => s.positions.length > 0).length,
    positions: positions.length, stuckEnds: solves.filter((s) => s.outcome === 'stuck').length,
    outcomes: solves.map((s) => s.outcome), steps: solves.map((s) => s.steps)
  };
  out.populations['ladder: chain-group positions'] = positions.length > 0 ? summarize(model, ctx, positions) : null;
  out.seconds = Number(((Date.now() - t0) / 1000).toFixed(1));
  return out;
}

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: work-census-all.js <out dir> [id,id,...]');
const ids = process.argv[3] ? process.argv[3].split(',') : SG.testkit.VARIANT_IDS;
fs.mkdirSync(outDir, { recursive: true });
ids.forEach((id) => {
  const result = census(id);
  fs.writeFileSync(path.join(outDir, id + '.json'), JSON.stringify(result, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
  console.log('== ' + id + ' (' + result.cellCount + ' cells, ' + result.digits + ' digits, ' + result.seconds + ' s); blank work ' +
    result.notes.blank.work + ' (checker ' + result.notes.blank.expectedWork + '), ladder ' + JSON.stringify(result.notes.ladder));
  Object.keys(result.populations).forEach((name) => {
    const p = result.populations[name];
    if (p === null) { console.log('   ' + name + ': no position'); return; }
    console.log('   ' + name + ': calls ' + p.calls + ', default complete ' + p.defaultComplete + ' (capped work ' +
      p.cappedWork + ', nodes ' + p.cappedNodes + '), lifted work ' + JSON.stringify(p.liftedWork) + ', over 50000: ' + p.over50000);
  });
});
