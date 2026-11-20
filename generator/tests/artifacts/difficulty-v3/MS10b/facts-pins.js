'use strict';
// Scratch (MS10b): the facts of the pins of replay.test.js, steps.test.js and player.test.js that the refreshed goldens
// change, read with the current code and the published goldens (G13 and G10 from their wires, the others regenerated).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS10b/facts-pins.js
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

// G04: the moves and the exchanges
{
  const moves = R.moves(goldenResult('G04')).moves;
  const kinds = moves.map((m) => m.kind);
  const runs = [];
  kinds.forEach((k, i) => { if (i === 0 || kinds[i - 1] !== k) runs.push([k, i, 1]); else runs[runs.length - 1][2]++; });
  console.log('G04 moves ' + moves.length + ' kinds (kind, start, length) ' + JSON.stringify(runs));
  moves.forEach((m, i) => {
    if (m.kind === 'exchange') {
      console.log('G04 exchange at ' + i + ' removed ' + m.removed.length + ' restored ' + m.restored.length + ' phase ' + m.phase +
        ' to ' + m.to + ' at ' + m.at);
    }
  });
  const analysis = analysisOf('G04');
  const steps = P.buildViews(goldenResult('G04'), analysis).details.steps;
  console.log('G04 details steps ' + steps.length + ' exchanges among the moves steps ' +
    steps.filter((s) => s.role === 'moves' && analysis.moves[s.position].kind === 'exchange').length);
  console.log('G04 compact audit ' + JSON.stringify(analysis.views.compact.audit));
  console.log('G04 counts compact ' + analysis.views.compact.steps.length + ' details ' + analysis.views.details.steps.length);
}

// the steps of G13 and G14: chosen removal null
['G13', 'G14', 'G10'].forEach((id) => {
  const analysis = analysisOf(id);
  const views = viewsOf(id);
  console.log('== ' + id + ' compact steps ' + views.compact.steps.map((s) => s.position).join(','));
  ['compact', 'details'].forEach((name) => {
    views[name].steps.forEach((s) => {
      const t = s.table.transition;
      if (t && t.choice && t.choice.chosen === null && t.choice.kind !== 'none') {
        console.log('  ' + name + ' pos ' + s.position + ' choice ' + JSON.stringify(t.choice) + ' tier ' + t.tier);
      }
    });
  });
  analysis.moves.forEach((m, i) => {
    if (m.span && m.span.chosen === null && m.span.rated !== undefined && m.kind === 'guided') {
      console.log('  move ' + i + ' at ' + m.at + ' span ' + JSON.stringify([m.span.rated, m.span.refused, m.span.others, m.span.nulls]));
    }
  });
});
{
  const a13 = analysisOf('G13');
  const compact = a13.views.compact.steps;
  console.log('G13 compact step 5 to ' + (compact[5] ? a13.transitions[compact[5].transition].to : null) + ' chosen ' +
    JSON.stringify(a13.moves[a13.transitions[compact[5].transition].to].span && a13.moves[a13.transitions[compact[5].transition].to].span.chosen));
  const a14 = analysisOf('G14');
  console.log('G14 move 76 ' + JSON.stringify({ at: a14.moves[76].at, span: a14.moves[76].span && [a14.moves[76].span.rated,
    a14.moves[76].span.refused, a14.moves[76].span.others, a14.moves[76].span.nulls] }));
}
// texts at the jumps
[['G13', 111], ['G10', 49], ['G13', 114]].forEach(([id, pos]) => {
  const step = stepAt(viewsOf(id).compact.steps, pos);
  if (!step) { console.log(id + ' compact ' + pos + ': no step'); return; }
  const t = text(id, 'compact', pos);
  console.log(id + ' compact ' + pos + ' sentences ' + JSON.stringify(t.callout && t.callout.sentences));
  console.log(id + ' compact ' + pos + ' why ' + JSON.stringify(t.callout && t.callout.why));
});
// G12 folded step
{
  const steps = P.buildViews(goldenResult('G12'), analysisOf('G12')).compact.steps;
  console.log('G12 compact folded parts ' + steps.map((s, i) => i + ':' + JSON.stringify(s.parts && s.parts[s.parts.length - 1])).join(' | '));
  console.log('G12 describeStep 4 ' + inLocale('en', () => P.describeStep(steps[4])));
}
// G12 details 103
{
  const t = text('G12', 'details', 103);
  console.log('G12 details 103 ' + JSON.stringify({ total: t.total, line: t.line, badge: t.badge, rowLabel: t.rowLabel,
    totalHighlight: t.totalHighlight }));
}
// G13 details 101
{
  const t = text('G13', 'details', 101);
  console.log('G13 details 101 ' + JSON.stringify({ total: t.total, line: t.line, badge: t.badge, rowLabel: t.rowLabel }));
  const tr = stepAt(viewsOf('G13').details.steps, 101).table.transition;
  console.log('G13 details 101 transition ' + JSON.stringify({ before: tr.before.total, after: tr.after.total, tier: tr.tier,
    newHardest: tr.newHardest, bh: tr.before.hardest, ah: tr.after.hardest }));
}
