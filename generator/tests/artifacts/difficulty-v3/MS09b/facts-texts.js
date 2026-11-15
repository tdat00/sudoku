'use strict';
// Scratch (MS09b): the texts and numbers of the pins of steps.test.js, player.test.js and replay.test.js that the refreshed
// goldens change, read with the current code. Usage (from generator/): node tests/artifacts/difficulty-v3/MS09b/facts-texts.js
const SG = require('./load.js');
const P = SG.player;
const R = SG.replay;
const V = SG.stepView;
const GOLDENS = SG.fixtures.replayGoldens;
const WIRE = SG.fixtures.replayWire;
const cache = {};
function goldenResult(id) {
  if (!cache[id]) {
    const g = GOLDENS.filter((x) => x.id === id)[0];
    cache[id] = WIRE[id] ? R.fromPlainWire(WIRE[id])
      : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
  }
  return cache[id];
}
const analyses = {};
function analysisOf(id) { return analyses[id] || (analyses[id] = R.analyse(goldenResult(id))); }
function viewsOf(id) { return P.buildViews(goldenResult(id), analysisOf(id)); }
function stepAt(steps, position) { return steps.filter((s) => s.position === position)[0]; }
function withLabels(id, fn) {
  SG.i18n.setCellLabeler((c) => SG.model.cellLabel(goldenResult(id).model, c));
  try { return fn(); } finally { SG.i18n.setCellLabeler(null); }
}
function inLocale(code, fn) {
  SG.i18n.setLocale(code);
  try { return fn(); } finally { SG.i18n.setLocale('en'); }
}
function text(id, view, position) {
  const step = stepAt(viewsOf(id)[view].steps, position);
  return withLabels(id, () => inLocale('en', () => V.explain(step.table, step)));
}

const g09 = text('G09', 'compact', 35);
console.log('G09 compact 35 sentences ' + JSON.stringify(g09.callout.sentences));
console.log('G09 compact 35 why ' + JSON.stringify(g09.callout.why));
const g11 = text('G11', 'details', 70);
console.log('G11 details 70 sentences ' + JSON.stringify(g11.callout.sentences));
const g12 = text('G12', 'details', 103);
const st = stepAt(viewsOf('G12').details.steps, 103);
console.log('G12 details 103 ' + JSON.stringify({ total: g12.total, badge: g12.badge, line: g12.line, rowLabel: g12.rowLabel,
  totalHighlight: g12.totalHighlight, before: st.table.transition.before.total, after: st.table.transition.after.total }));
const g05 = text('G05', 'compact', 29);
console.log('G05 compact 29 sentences ' + JSON.stringify(g05.callout.sentences));
const g06 = analysisOf('G06').transitions.filter((t) => t.view === 'details' && t.to === 29 && t.role === 'step')[0];
console.log('G06 details 29 ' + JSON.stringify({ before: g06.before.total, after: g06.after.total, class: g06.cause.class,
  culprit: g06.cause.culprit, frame: g06.cause.frame }));
['G07', 'G10', 'G12'].forEach((id) => {
  const a = analysisOf(id);
  a.transitions.filter((t) => t.view === 'compact' && t.tier === 'jump').forEach((t) => {
    console.log(id + ' compact jump ' + JSON.stringify({ to: t.to, cause: { class: t.cause.class, n: t.cause.n, k: t.cause.k, kMove: t.cause.kMove },
      choice: t.choice.kind }));
  });
});

// the compact folds of every golden
GOLDENS.forEach((g) => {
  viewsOf(g.id).compact.steps.forEach((s, i) => {
    const last = s.parts && s.parts.length ? s.parts[s.parts.length - 1] : null;
    if (last && /^replay\.folded\./.test(last.key)) console.log('fold ' + g.id + ' compact ' + i + ' pos ' + s.position + ' ' + last.key + ' ' + JSON.stringify(last.args));
  });
});
const f = viewsOf('G12').compact.steps[2];
console.log('G12 compact 2 last part ' + JSON.stringify(f.parts[f.parts.length - 1]));

// the stuck board and G06
const model = goldenResult('G01').model;
const board = '004600000721000000900004070070061005400807002600520080060700009000000728000005600';
const rating = R.rateBoard(model, Int32Array.from(board.split('').map(Number)));
console.log('stuck counts ' + JSON.stringify(rating.counts) + ' status ' + rating.status + ' reasons ' + JSON.stringify(rating.reasons));
const g06r = goldenResult('G06');
console.log('G06 rated ' + R.rateBoard(g06r.model, g06r.givens, { forceCount: true }).score);

// G11 details: step indexes of sign jumps and the seek positions
const g11d = viewsOf('G11').details.steps;
g11d.forEach((s, i) => { if (s.signs && s.signs.cause.length) console.log('G11 details signs.cause at #' + i + ' ' + JSON.stringify(s.signs.cause) + ' pos ' + s.position); });
// G09 first deductions
console.log('G09 groups ' + SG.symmetry.groups(goldenResult('G09').model, goldenResult('G09').config.symmetry).length);
