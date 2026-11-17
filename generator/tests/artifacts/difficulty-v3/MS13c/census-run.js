'use strict';
// MS13c scratch (S-AV36, MS13c): the cost of the registered grouped forcing calls on the activation source, on populations that
// are labelled as what they are, each with its denominator:
//   base-ladder        the positions of MS13a's census (docs/difficulty-v3/evidence/MS13a/census-all/), dumped from the base source
//                      by census-dump.js: where a ladder solve of the six propagated puzzles of
//                      H.randomStatesWithKnownSolution(m, rng(77003), 24) reaches the chain group under the SINGLETON ladder;
//   activation-ladder  the same six puzzles solved with the tree's ladder (grouped forcing included), every position where the chain
//                      group is reached: the calls the registered ids actually get;
//   wire               the same for the givens of the golden wires G09-G13 (tests/fixtures/replay-wire.js);
//   fixtures           the typed-in chain positions of tech-chain.test.js (CHAIN_FIXTURES).
// For every position and each of forcingChain and forcingChainLong (C as registered) it records the call's observer record (both
// stages, the fallback, the domain), the warm latency (median of 3 calls), the latency of the singleton fallback kernel when the short
// id fell back, the full-build work (the lifted builder: the S-AV36 figure) and, for the R10 decision, the same call with the
// candidate allowance (4096 nodes, CANDIDATE units, same fallback policy) through the grouped seam.
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS13c/census-run.js <out dir> <positions dir> [id,id,...]
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const H = SG.techHelper;
const CS = SG.chainSearch;
const CANDIDATE = Number(process.env.CENSUS_CANDIDATE || 200000);
const MAX_STEPS = 3000;
const REPS = 3;
const LIFT = { workLimit: 1000000000, groupLimit: 1000000000 };

function applyFinding(model, state, finding) {
  for (const p of finding.placements) if (!SG.constraints.assign(model, state, p[0], p[1])) return false;
  for (const e of finding.eliminations) if (!SG.constraints.eliminate(model, state, e[0], e[1])) return false;
  return SG.constraints.propagate(model, state);
}

function ladderPositions(model, start, ctx, techs) {
  const positions = [];
  const state = SG.model.cloneState(start);
  let steps = 0;
  while (state.unsolvedCount > 0 && steps < MAX_STEPS) {
    let fired = null;
    for (const tech of techs) {
      if (tech.id === 'xyChain') positions.push({ step: steps, state: SG.model.cloneState(state) });
      fired = tech.find(model, state, ctx);
      if (fired) break;
    }
    if (!fired || !applyFinding(model, state, fired)) break;
    steps++;
  }
  return positions;
}

const ms = (t) => Number(process.hrtime.bigint() - t) / 1e6;
const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function windowOf(id) {
  const c = CS.SHORT_MAX;
  return id === 'forcingChain' ? { minLength: 1, maxLength: c } : { minLength: c + 1, maxLength: 12 };
}

function measure(model, state, label) {
  const row = { label, open: state.unsolvedCount };
  const t0 = process.hrtime.bigint();
  const full = SG.chainGraph.build(model, state, SG.techniques.createContext(model, {}), LIFT);
  row.fullBuild = { work: full.work, nodes: full.nodes.length, additional: full.nodes.filter((n) => n.cells.length > 1).length,
    ms: Number(ms(t0).toFixed(3)) };
  for (const id of ['forcingChain', 'forcingChainLong']) {
    const out = {};
    // the registered call: the record of the first call, the median latency of REPS calls
    const times = [];
    let rec = null;
    let finding = null;
    for (let k = 0; k < REPS; k++) {
      const records = [];
      const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
      const t = process.hrtime.bigint();
      const f = SG.techniques.get(id).find(model, state, ctx);
      times.push(ms(t));
      if (k === 0) { rec = records[0]; finding = f; }
    }
    out.found = finding !== null;
    out.length = finding === null ? null : finding.i18nArgs.length;
    out.v2 = finding !== null && finding.i18nArgs.proofVersion === 2;
    out.domain = rec.domain;
    out.stop = rec.grouped.stop;
    out.graph = rec.grouped.graph;
    out.minimum = rec.grouped.minimum;
    out.construction = rec.grouped.construction;
    out.search = rec.grouped.search;
    out.additional = rec.grouped.additional;
    out.fallback = rec.fallback;
    out.work = rec.work;
    out.capHit = rec.capHit;
    out.ms = Number(median(times).toFixed(3));
    if (rec.fallback !== null && rec.fallback.entered) {
      const ft = [];
      for (let k = 0; k < REPS; k++) {
        const w = windowOf(id);
        const t = process.hrtime.bigint();
        CS.forcing(model, state, SG.techniques.createContext(model, {}),
          { id, minLength: w.minLength, maxLength: w.maxLength, workLimit: null });
        ft.push(ms(t));
      }
      out.fallbackKernelMs = Number(median(ft).toFixed(3));
    }
    // the candidate allowance through the grouped seam, with the policy of the id
    const ctimes = [];
    let crec = null;
    let cfinding = null;
    for (let k = 0; k < REPS; k++) {
      const records = [];
      const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
      const w = windowOf(id);
      const t = process.hrtime.bigint();
      const f = CS.groupedForcing(model, state, ctx, { id, minLength: w.minLength, maxLength: w.maxLength,
        groupLimit: 4096, workLimit: CANDIDATE, fallback: id === 'forcingChain' });
      ctimes.push(ms(t));
      if (k === 0) { crec = records[0]; cfinding = f; }
    }
    out.candidate = { found: cfinding !== null, length: cfinding === null ? null : cfinding.i18nArgs.length,
      v2: cfinding !== null && cfinding.i18nArgs.proofVersion === 2, domain: crec.domain, stop: crec.grouped.stop,
      construction: crec.grouped.construction, search: crec.grouped.search,
      fallbackEntered: crec.fallback !== null && crec.fallback.entered, work: crec.work, ms: Number(median(ctimes).toFixed(3)),
      sameFinding: JSON.stringify(cfinding) === JSON.stringify(finding) };
    row[id] = out;
  }
  return row;
}

function population(model, states, name) {
  const rows = states.map((s, i) => measure(model, s.state || s, name + '#' + i + (s.step !== undefined ? '/step' + s.step : '')));
  return { name, calls: rows.length, rows };
}

const outDir = process.argv[2];
const posDir = process.argv[3];
if (!outDir || !posDir) throw new Error('usage: census-run.js <out dir> <positions dir> [id,id,...]');
const ids = process.argv[4] ? process.argv[4].split(',') : SG.testkit.VARIANT_IDS;
fs.mkdirSync(outDir, { recursive: true });
const wires = SG.fixtures.replayWire || {};
const text = fs.readFileSync(path.resolve(__dirname, '../../../../../core/tests/suites/tech-chain.test.js'), 'utf8');
const FIXTURES = eval(/var CHAIN_FIXTURES = (\[[\s\S]*?\n  \]);\r?\n\r?\n  function fixtureState/.exec(text)[1]);
ids.forEach((id) => {
  const t0 = Date.now();
  const model = H.model(id);
  const ctx = SG.techniques.createContext(model, { assumeUniqueness: true });
  const techs = SG.techniques.list().filter((t) => SG.techniques.appliesTo(t, model.variantId));
  const result = { id, source: 'tree', candidate: CANDIDATE, shortMax: CS.SHORT_MAX, limits: SG.chainGraph.LIMITS, populations: [] };
  const file = path.join(posDir, id + '.json');
  if (fs.existsSync(file)) {
    const dump = JSON.parse(fs.readFileSync(file, 'utf8'));
    const states = dump.positions.map((p) => {
      const s = SG.model.initState(model);
      s.candidates.set(p.candidates);
      s.value.set(p.value);
      s.unsolvedCount = p.value.filter((v) => v === 0).length;
      return { state: s, step: p.step };
    });
    result.populations.push(population(model, states, 'base-ladder'));
  }
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(77003), 24).filter((i) => i.kind === 'propagated');
  const own = [];
  items.forEach((item) => ladderPositions(model, item.state, ctx, techs).forEach((p) => own.push(p)));
  result.populations.push(population(model, own, 'activation-ladder'));
  const wireStates = [];
  Object.keys(wires).forEach((wid) => {
    const w = wires[wid];
    if (!w || !w.model || w.model.variantId !== id) return;
    const r = SG.replay.fromPlainWire(w);
    const start = H.makeState(r.model, r.givens);
    ladderPositions(r.model, start, SG.techniques.createContext(r.model, { assumeUniqueness: true }),
      SG.techniques.list().filter((t) => SG.techniques.appliesTo(t, r.model.variantId))).forEach((p) => {
      wireStates.push({ state: p.state, step: wid + '/' + p.step });
    });
  });
  if (wireStates.length > 0) result.populations.push(population(model, wireStates, 'wire'));
  if (id === 'classic9') {
    const fx = FIXTURES.map((f) => H.makeState(model, f.puzzle, { candidates: f.grid.join(' ').split(' ') }));
    result.populations.push(population(model, fx, 'fixtures'));
  }
  result.seconds = Number(((Date.now() - t0) / 1000).toFixed(1));
  fs.writeFileSync(path.join(outDir, id + '.json'), JSON.stringify(result).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
  console.log('== ' + id + ' ' + result.seconds + ' s: ' + result.populations.map((p) => p.name + ' ' + p.calls).join(', '));
});
