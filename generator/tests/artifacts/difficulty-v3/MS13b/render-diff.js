'use strict';
// MS13b scratch: the inactivity differential of the consumers of version-2 group proofs. It is MS13a's differential
// (generator/tests/artifacts/difficulty-v3/MS13a/legacy-diff.js: the same fixed populations, the same calls, the same hashed
// stream, so its engine digest is comparable with MS13a's published `8c0f69aa...42e3`) plus a second digest over what the
// consumers WRITE for every Finding and step of those populations, in both languages:
//   Generator: SG.i18n.t(key, args) with the board's cell labeler (what the trace and the step texts use),
//   Player:    SG.i18n.t(key, SG.play.localizeArgs(model, args, 'digits')) (what describeHint uses).
// Run once with the tree and once with the base commit read from git into memory (MS13B_BASE=git:7932132, load.js); the
// digests of the two runs must be equal. MS13B_APP=player runs the Player's sources (its engine is the same shared core; it
// has no SG.difficulty, so its populations use the logical solver for the steps, and its engine digest is labelled apart).
//   node tests/artifacts/difficulty-v3/MS13b/render-diff.js
const crypto = require('crypto');
const SG = require('./load.js');
const H = SG.techHelper;
const APP = process.env.MS13B_APP === 'player' ? 'player' : 'generator';
const LOCALES = ['en', 'vi'];

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

const engineHash = crypto.createHash('sha256');
const textHash = crypto.createHash('sha256');
const byKey = new Map();
const tally = { calls: 0, found: 0, ratings: 0, steps: 0, texts: 0, chainTexts: 0 };

function render(label, model, key, args) {
  LOCALES.forEach((code) => {
    SG.i18n.setLocale(code);
    let text;
    if (APP === 'player') {
      text = SG.i18n.t(key, SG.play.localizeArgs(model, args, 'digits'));
    } else {
      SG.i18n.setCellLabeler((cell) => SG.model.cellLabel(model, cell));
      text = SG.i18n.t(key, args);
      SG.i18n.setCellLabeler(null);
    }
    const line = label + '|' + code + '|' + text + '\n';
    textHash.update(line);
    if (!byKey.has(code + ' ' + key)) byKey.set(code + ' ' + key, { hash: crypto.createHash('sha256'), count: 0 });
    const entry = byKey.get(code + ' ' + key);
    entry.hash.update(line);
    entry.count++;
    tally.texts++;
    if (args && Array.isArray(args.chains)) tally.chainTexts++;
  });
  SG.i18n.setLocale('en');
}

function take(label, model, value) {
  engineHash.update(label + ':' + JSON.stringify(value) + '\n');
  tally.calls++;
  if (value && value.finding) {
    tally.found++;
    render(label, model, value.finding.i18nKey, value.finding.i18nArgs);
  }
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
    take(tag + ' seam ' + k, model, { finding, records });
  });
  ['xyChain', 'forcingChain', 'forcingChainLong'].forEach((id) => {
    [undefined, 2, 7].forEach((max) => {
      const records = [];
      const options = { onPatternWork: (r) => records.push(r) };
      if (max !== undefined) options.maxChainLength = max;
      const finding = SG.techniques.get(id).find(model, state, SG.techniques.createContext(model, options));
      take(tag + ' ' + id + ' ' + max, model, { finding, records });
    });
  });
  if (model.digits <= 6) {
    ['nishio', 'nishioDeep'].forEach((id) => {
      const records = [];
      const finding = SG.techniques.get(id).find(model, state,
        SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) }));
      take(tag + ' ' + id, model, { finding, records });
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
  take(id, H.model('classic9'), { finding, records });
});

// complete ratings (the Generator) or complete solver reports (the Player): every step with its Finding, and its text
function steps(label, model, givens) {
  const result = SG.difficulty
    ? SG.difficulty.rate(model, givens, { collectSteps: true })
    : SG.logicalSolver.solve(model, givens, { collectSteps: true, stopOnStuck: true });
  engineHash.update(label + ':' + JSON.stringify(result) + '\n');
  tally.ratings++;
  const list = result.steps || [];
  tally.steps += list.length;
  list.forEach((s, i) => { if (s.i18nKey) render(label + ' step ' + i, model, s.i18nKey, s.i18nArgs || {}); });
}
const rated = [['classic9', H.model('classic9'), 60, 8080], ['classic6', H.model('classic6'), 40, 8081],
  ['classic4', H.model('classic4'), 20, 8082], ['12 digits', SG.fixtures.models.boxGrid('legacy-12', 3, 4), 3, 8083]];
rated.forEach(([name, model, n, seed]) => {
  H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(seed), n).forEach((item, i) => {
    steps(name + ' rating #' + i, model, item.givens);
  });
});
SG.fixtures.classic.unique.slice(0, 12).forEach((fx) => {
  steps(fx.name + ' rating', H.model('classic9'), SG.fixtures.classic.parse(fx.puzzle));
});
const result = { app: APP, sources: (process.env.MS13B_BASE || 'tree') + (process.env.MS13B_TREE_LOCALES === '1' ? ' + the tree\'s language packs' : ''),
  calls: tally.calls, withFinding: tally.found, ratings: tally.ratings, steps: tally.steps, texts: tally.texts,
  chainTexts: tally.chainTexts, hasDifficulty: Boolean(SG.difficulty), engineSha256: engineHash.digest('hex'),
  textSha256: textHash.digest('hex'), byKey: {} };
Array.from(byKey.keys()).sort().forEach((k) => {
  result.byKey[k] = { count: byKey.get(k).count, sha256: byKey.get(k).hash.digest('hex') };
});
if (process.env.MS13B_OUT) require('fs').writeFileSync(process.env.MS13B_OUT, JSON.stringify(result) + '\r\n', 'utf8');
console.log('app ' + APP + ', sources ' + result.sources + ', calls ' + tally.calls + ', with a Finding ' +
  tally.found + ', ' + (SG.difficulty ? 'ratings' : 'solver reports') + ' ' + tally.ratings + ' (' + tally.steps + ' steps)' +
  ', texts ' + tally.texts + ' (' + tally.chainTexts + ' with chains)' +
  ', engine sha256 ' + result.engineSha256 + ', text sha256 ' + result.textSha256);
