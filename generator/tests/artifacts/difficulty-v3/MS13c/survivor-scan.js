'use strict';
// MS13c scratch: where a mutated engine (mutant-file.cjs output, MS13C_CHAIN=file:<path>) and the registered one give different
// Findings, on the seeded positions of the models, to find real vectors that kill a surviving mutation.
// Usage: node survivor-scan.js <mutant engine file> <model>[,<model>...] [count] [seed] [maxShown]
// The positions are H.randomStatesWithKnownSolution(model, rng(seed), count); both finders are called with C = 4 (the default).
// Child mode (SCAN_CHILD=1) prints the Findings as JSON lines; the parent runs it twice and compares.
const cp = require('child_process');
const child = process.env.SCAN_CHILD === '1';
if (child) {
  const SG = require('./load.js');
  const H = SG.techHelper;
  const sa2Model = () => SG.model.create({ variantId: 'chain-sa2-vector', digits: 4,
    units: [[0, 1, 2, 10], [0, 3, 4, 11], [1, 3, 8, 12], [0, 5, 6, 13], [5, 2, 7, 14], [0, 1, 9, 15]],
    unitMeta: [{ kind: 'box', label: 'B1' }, { label: 'X1' }, { label: 'X2' }, { label: 'X3' }, { label: 'X4' },
      { kind: 'row', label: 'R1' }],
    layout: { rows: 4, cols: 4, cellRow: [0, 0, 1, 1, 1, 2, 2, 2, 2, 0, 1, 3, 3, 3, 3, 0],
      cellCol: [0, 1, 0, 2, 3, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 3] } });
  const models = process.argv[3].split(',');
  const count = Number(process.argv[4] || 300);
  const seed = Number(process.argv[5] || 77003);
  models.forEach((modelId) => {
    // pruned:<model>:<keepLow>:<keepHigh> is a sparse random position that keeps a solution (as prunedStates of tech-chain.test.js)
    const spec = modelId.split(':');
    const m = spec[0] === 'sa2' ? sa2Model() : H.model(spec[0] === 'pruned' || spec[0] === 'digit' ? spec[1] : modelId);
    let states;
    if (spec[0] === 'sa2') {
      // sa2:<model digits> is SA2's 4 x 4 vector model (vectors-probe.js) with random candidates {1,2,3} in the cells 0 to 9
      const bit = (d) => 1 << (d - 1);
      const rng = SG.testkit.rng.create(seed);
      states = [];
      for (let i = 0; i < count; i++) {
        const r = rng.fork('sa2.' + i);
        const state = SG.model.initState(m);
        for (let c = 0; c < 10; c++) {
          let mask = 0;
          while (mask === 0) for (let d = 1; d <= 3; d++) if (r.next() < 0.5) mask |= bit(d);
          state.candidates[c] = mask;
        }
        for (let c = 10; c < 16; c++) { state.value[c] = 4; state.candidates[c] = bit(4); }
        state.unsolvedCount = 10;
        states.push({ state: state });
      }
    } else if (spec[0] === 'digit') {
      // digit:<model>:<low>:<high>:<digits> is a position with <low> to <high> random open cells, each holding a random
      // non-empty subset of the digits 1..<digits> (all other cells closed): few digits give clean group structures
      const lo = Number(spec[2]);
      const hi = Number(spec[3]);
      const nd = Number(spec[4]);
      const rng = SG.testkit.rng.create(seed);
      states = [];
      for (let i = 0; i < count; i++) {
        const r = rng.fork('digit.' + i);
        const k = lo + Math.floor((hi - lo + 1) * r.next());
        const all = [];
        for (let c = 0; c < m.cellCount; c++) all.push(c);
        r.shuffle(all);
        const state = SG.model.initState(m);
        for (let c = 0; c < m.cellCount; c++) state.candidates[c] = 0;
        for (let j = 0; j < k; j++) {
          let mask = 0;
          while (mask === 0) for (let d = 0; d < nd; d++) if (r.next() < 0.5) mask |= 1 << d;
          state.candidates[all[j]] = mask;
        }
        states.push({ state: state });
      }
    } else if (spec[0] === 'pruned') {
      const lo = Number(spec[2]);
      const hi = Number(spec[3]);
      const rng = SG.testkit.rng.create(seed);
      states = [];
      for (let i = 0; i < count; i++) {
        const r = rng.fork('pruned.' + i);
        const solution = SG.testkit.randomSolution(m, r.fork('grid'));
        const rs = r.fork('state');
        const placedShare = 0.15 * r.next();
        const keepShare = lo + (hi - lo) * r.next();
        const state = SG.model.initState(m);
        for (let c = 0; c < m.cellCount; c++) {
          if (rs.next() < placedShare) SG.constraints.assign(m, state, c, solution[c]);
        }
        for (let c = 0; c < m.cellCount; c++) {
          if (state.value[c] !== 0) continue;
          let keep = 1 << (solution[c] - 1);
          for (let v = 1; v <= m.digits; v++) if (v !== solution[c] && rs.next() < keepShare) keep |= 1 << (v - 1);
          state.candidates[c] &= keep;
        }
        states.push({ state: state });
      }
    } else {
      states = H.randomStatesWithKnownSolution(m, SG.testkit.rng.create(seed), count);
    }
    states.forEach((item, i) => {
      ['forcingChain', 'forcingChainLong'].forEach((id) => {
        let out;
        try {
          out = SG.techniques.get(id).find(m, item.state, SG.techniques.createContext(m, {}));
        } catch (err) {
          out = { error: String(err && err.message || err) };
        }
        console.log(JSON.stringify([modelId, i, id, out]));
      });
    });
  });
} else {
  const file = process.argv[2];
  const rest = process.argv.slice(3);
  const run = (env) => cp.execFileSync(process.execPath, [__filename, file].concat(rest),
    { env: Object.assign({}, process.env, env, { SCAN_CHILD: '1' }), encoding: 'utf8', maxBuffer: 1 << 29 }).trim().split(/\r?\n/);
  const normal = run({});
  const mutated = run({ MS13C_CHAIN: 'file:' + file });
  const maxShown = Number(rest[3] || 6);
  let different = 0;
  let shown = 0;
  normal.forEach((line, i) => {
    if (line === mutated[i]) return;
    different++;
    if (shown++ < maxShown) {
      const a = JSON.parse(line);
      const b = JSON.parse(mutated[i]);
      console.log('DIFF ' + a[0] + ' index ' + a[1] + ' ' + a[2]);
      console.log('  registered: ' + JSON.stringify(a[3]).slice(0, 700));
      console.log('  mutated:    ' + JSON.stringify(b[3]).slice(0, 700));
    }
  });
  console.log(normal.length + ' calls, ' + different + ' differ');
}
