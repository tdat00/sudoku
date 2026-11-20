'use strict';
// Scratch (MS12): legacy-proof compatibility of the shared builder. The general seam and the registered forcingChain,
// forcingChainLong and nishio are run over fixed populations (every kind of state of H.randomStatesWithKnownSolution on
// classic9, classic6, classic4 and a 12-digit board, pruned states with many wrong candidates, and the observer records of
// every call); the results and the records are hashed. Run once with the tree's engine and once with the base commit's
// (MS12_BASE_CHAIN=git:5d49130, loaded from git into memory by load.js): the two hashes must be equal.
//   node tests/artifacts/difficulty-v3/MS12/legacy-diff.js
const crypto = require('crypto');
const SG = require('./load.js');
const H = SG.techHelper;

function prunedFrom(model, rng, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = rng.fork('pruned.' + i);
    const solution = SG.testkit.randomSolution(model, r.fork('grid'));
    const state = SG.model.initState(model);
    const keepShare = 0.05 + 0.35 * r.next();
    const st = r.fork('keep');
    for (let c = 0; c < model.cellCount; c++) {
      let keep = 1 << (solution[c] - 1);
      for (let v = 1; v <= model.digits; v++) if (v !== solution[c] && st.next() < keepShare) keep |= 1 << (v - 1);
      state.candidates[c] &= keep;
    }
    out.push(state);
  }
  return out;
}

const hash = crypto.createHash('sha256');
let calls = 0;
let found = 0;
function take(label, value) {
  hash.update(label + ':' + JSON.stringify(value) + '\n');
  calls++;
  if (value && value.finding) found++;
}
function run(model, state, tag) {
  const seams = [{ id: 'forcingChain', minLength: 1, maxLength: 4, workLimit: null },
    { id: 'forcingChainLong', minLength: 5, maxLength: 12, workLimit: 50000 },
    { id: 'probe', minLength: 1, maxLength: 12 }, { id: 'probe', minLength: 1, maxLength: 3, workLimit: 900 }];
  seams.forEach((opts, k) => {
    const records = [];
    const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
    const finding = SG.chainSearch.forcing(model, state, ctx, opts);
    take(tag + ' seam ' + k, { finding, records });
  });
  ['forcingChain', 'forcingChainLong'].forEach((id) => {
    [undefined, 2, 7].forEach((max) => {
      const records = [];
      const options = { onPatternWork: (r) => records.push(r) };
      if (max !== undefined) options.maxChainLength = max;
      const finding = SG.techniques.get(id).find(model, state, SG.techniques.createContext(model, options));
      take(tag + ' ' + id + ' ' + max, { finding, records });
    });
  });
}

const populations = [['classic9', H.model('classic9'), 90, 4242], ['classic6', H.model('classic6'), 120, 61],
  ['classic4', H.model('classic4'), 60, 41], ['12 digits', SG.fixtures.models.boxGrid('legacy-12', 3, 4), 6, 2026]];
populations.forEach(([name, model, n, seed]) => {
  H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n).forEach((item, i) => {
    run(model, item.state, name + ' #' + i + ' ' + item.kind);
  });
  prunedFrom(model, SG.testkit.rng.create(seed + 1), Math.ceil(n / 3)).forEach((state, i) => run(model, state, name + ' pruned #' + i));
});
const escargot = H.makeState(H.model('classic9'), SG.fixtures.classic.unique.filter((f) => f.name === 'escargot')[0].puzzle);
['nishio', 'nishioDeep'].forEach((id) => {
  const records = [];
  const finding = SG.techniques.get(id).find(H.model('classic9'), escargot,
    SG.techniques.createContext(H.model('classic9'), { onPatternWork: (r) => records.push(r) }));
  take(id, { finding, records });
});
console.log('engine: ' + (process.env.MS12_BASE_CHAIN || 'tree') + ', calls ' + calls + ', with a Finding ' + found + ', sha256 ' +
  hash.digest('hex'));
