'use strict';
// Scratch (MS15a, from MS14a's legacy-diff.js): the inactivity differential of the ALS enumerator on the populations of MS13a, MS13b and MS14a.
// Run once with the tree's sources and once with the base commit's (MS15A_BASE=git:8bd2487, loaded from git into memory by load.js:
// EVERY SOURCE_FILES entry as it is at that commit): the two digests must be equal. They are NOT compared with the digest of MS13a to
// MS14a (8c0f69aa...): MS13c and MS14b activated the grouped chains and the law of leftovers since, so the base's own digest is the
// reference. Over fixed populations (every kind of state of H.randomStatesWithKnownSolution on classic9, classic6, classic4 and a
// 12-digit board, and pruned states with many wrong candidates) it runs
//   - the general seam with four option sets and the restricted seam (xyChain) with three, each with its observer record,
//   - the five registered chain finders (xyChain, forcingChain, forcingChainLong, nishio on the small boards, nishioDeep on
//     the evil puzzle), with and without a maxChainLength, each with its observer record,
//   - the complete rating of puzzles (SG.difficulty.rate with steps: every step, its Finding, and the classification),
// and hashes the results. `SG.alsPatterns` is not touched here, and the base has none.
//   node tests/artifacts/difficulty-v3/MS15a/legacy-diff.js
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
const tally = { calls: 0, found: 0, ratings: 0, steps: 0 };
function take(label, value) {
  hash.update(label + ':' + JSON.stringify(value) + '\n');
  tally.calls++;
  if (value && value.finding) tally.found++;
}
function run(model, state, tag) {
  const seams = [{ id: 'forcingChain', minLength: 1, maxLength: 4, workLimit: null },
    { id: 'forcingChainLong', minLength: 5, maxLength: 12, workLimit: 50000 },
    { id: 'probe', minLength: 1, maxLength: 12 }, { id: 'probe', minLength: 1, maxLength: 3, workLimit: 900 },
    { id: 'xyChain', edges: 'restricted', minLength: 1, maxLength: 12 },
    { id: 'xyChain', edges: 'restricted', minLength: 1, maxLength: 5, workLimit: 700 },
    { id: 'probe', edges: 'restricted', minLength: 1, maxLength: 13, workLimit: null }];
  seams.forEach((opts, k) => {
    const records = [];
    const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
    const finding = SG.chainSearch.forcing(model, state, ctx, opts);
    take(tag + ' seam ' + k, { finding, records });
  });
  ['xyChain', 'forcingChain', 'forcingChainLong'].forEach((id) => {
    [undefined, 2, 7].forEach((max) => {
      const records = [];
      const options = { onPatternWork: (r) => records.push(r) };
      if (max !== undefined) options.maxChainLength = max;
      const finding = SG.techniques.get(id).find(model, state, SG.techniques.createContext(model, options));
      take(tag + ' ' + id + ' ' + max, { finding, records });
    });
  });
  if (model.digits <= 6) {
    ['nishio', 'nishioDeep'].forEach((id) => {
      const records = [];
      const finding = SG.techniques.get(id).find(model, state,
        SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) }));
      take(tag + ' ' + id, { finding, records });
    });
  }
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

// complete ratings: every step of the solver with every technique, then the classification
const rated = [['classic9', H.model('classic9'), 60, 8080], ['classic6', H.model('classic6'), 40, 8081],
  ['classic4', H.model('classic4'), 20, 8082], ['12 digits', SG.fixtures.models.boxGrid('legacy-12', 3, 4), 3, 8083]];
rated.forEach(([name, model, n, seed]) => {
  H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n).forEach((item, i) => {
    const rating = SG.difficulty.rate(model, item.givens, { collectSteps: true });
    hash.update(name + ' rating #' + i + ':' + JSON.stringify(rating) + '\n');
    tally.ratings++;
    tally.steps += (rating.steps || []).length;
  });
});
SG.fixtures.classic.unique.slice(0, 12).forEach((fx) => {
  const rating = SG.difficulty.rate(H.model('classic9'), SG.fixtures.classic.parse(fx.puzzle), { collectSteps: true });
  hash.update(fx.name + ' rating:' + JSON.stringify(rating) + '\n');
  tally.ratings++;
  tally.steps += (rating.steps || []).length;
});
console.log('engine: ' + (process.env.MS15A_BASE || 'tree') + ', calls ' + tally.calls + ', with a Finding ' + tally.found +
  ', ratings ' + tally.ratings + ' (' + tally.steps + ' steps), has alsPatterns ' + (SG.alsPatterns !== undefined) + ', sha256 ' +
  hash.digest('hex'));
