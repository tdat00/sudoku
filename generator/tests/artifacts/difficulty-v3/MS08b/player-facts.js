'use strict';
// Scratch (MS08b): the numbers and texts that generator/tests/suites/player.test.js pins for the goldens, as the current
// code and the refreshed fixtures give them. Usage (from generator/): node tests/artifacts/difficulty-v3/MS08b/player-facts.js
const SG = require('./load.js');
const P = SG.player;
const R = SG.replay;
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
function inLocale(code, fn) {
  SG.i18n.setLocale(code);
  try { return fn(); } finally { SG.i18n.setLocale('en'); }
}
const g01 = goldenResult('G01');
const analysis = R.analyse(g01);
const views = P.buildViews(g01, analysis);
const steps = views.compact.steps;
SG.i18n.setCellLabeler((c) => SG.model.cellLabel(g01.model, c));
['en', 'vi'].forEach((code) => inLocale(code, () => {
  console.log('== ' + code);
  steps.forEach((s, i) => console.log(i + ' ' + JSON.stringify([P.stepTitle(s), P.describeStep(s)])));
  [5, 3, 0, 6].forEach((i) => console.log('meta ' + i + ' ' + JSON.stringify(P.stepMeta(steps[i]))));
}));
console.log('scores ' + JSON.stringify(steps.map((s) => s.table.score)));
console.log('changes ' + JSON.stringify(steps.map((s) => s.table.change)));
console.log('step4 ' + JSON.stringify([steps[4].kind, steps[4].line, steps[4].key, steps[4].args.rated, steps[4].args.refused]));
console.log('step3 ' + JSON.stringify([steps[3].key, steps[3].args.rounds, steps[3].args.rated, steps[3].args.refused]));
console.log('kinds ' + JSON.stringify(steps.map((s) => s.kind)));
const t4 = steps[4].table.transition;
console.log('step4 transition to ' + t4.to + ' proofs[to] ' + (analysis.proofs[t4.to] ? 'yes' : 'no') +
  ' proofKeys ' + JSON.stringify(Object.keys(analysis.proofs)) + ' table.proof is proofs[to] ' + (steps[4].table.proof === analysis.proofs[t4.to]));
console.log('step4 marks ' + JSON.stringify({ cause: steps[4].marks.cause, dug: steps[4].marks.dug, restore: steps[4].marks.causeRestore }));
console.log('step5 marks cause ' + JSON.stringify(steps[5].marks.cause));
const label = (c) => SG.model.cellLabel(g01.model, c);
console.log('labels cause ' + steps[4].marks.cause.map(label) + ' dug ' + steps[4].marks.dug.map(label));
const g11 = P.buildViews(goldenResult('G11'), R.analyse(goldenResult('G11')));
const f = g11.compact.steps[2];
console.log('G11 compact 2 folded ' + JSON.stringify(f.parts[f.parts.length - 1]));
inLocale('en', () => { SG.i18n.setCellLabeler((c) => SG.model.cellLabel(goldenResult('G11').model, c)); console.log('G11 text ' + P.describeStep(f)); });
const g12 = P.buildViews(goldenResult('G12'), R.analyse(goldenResult('G12')));
const p12 = g12.compact.steps[2];
console.log('G12 compact 2 last part ' + JSON.stringify(p12.parts[p12.parts.length - 1]));
let jumps = 0;
let framed = 0;
GOLDENS.forEach((g) => {
  const v = P.buildViews(goldenResult(g.id), R.analyse(goldenResult(g.id)));
  ['compact', 'details'].forEach((name) => v[name].steps.forEach((s) => {
    const t = s.table.transition;
    const frame = t !== null && t.tier === 'jump' && t.cause ? t.cause.frame : null;
    if (t !== null && t.tier === 'jump') { jumps++; if (frame) framed++; }
  }));
});
console.log('jumps ' + jumps + ' framed ' + framed);
