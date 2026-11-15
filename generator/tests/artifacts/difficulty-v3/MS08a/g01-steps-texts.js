'use strict';
// Scratch (MS08a): the texts of the example of the steps suite (G01, compact step 4) in English and Vietnamese, and the
// other texts the suite pins for G01 and G11, as the current code gives them.
const SG = require('./load.js');
const V = SG.stepView;
const g = SG.fixtures.replayGoldens.filter((x) => x.id === 'G01')[0];
const res = SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
const analysis = SG.replay.analyse(res);
const views = SG.player.buildViews(res, analysis);
const steps = views.compact.steps;
function inLocale(code, fn) {
  SG.i18n.setLocale(code);
  try { return fn(); } finally { SG.i18n.setLocale('en'); }
}
SG.i18n.setCellLabeler((c) => SG.model.cellLabel(res.model, c));
const show = (label, value) => console.log(label + ' ' + JSON.stringify(value, null, 1));
['en', 'vi'].forEach((code) => inLocale(code, () => {
  const step = steps[4];
  const text = V.explain(step.table, step);
  console.log('=== ' + code + ' step 4');
  show('total', text.total);
  show('badge', text.badge);
  show('line', text.line);
  show('heading', text.callout.heading);
  show('sentences', text.callout.sentences);
  show('why', text.callout.why);
  show('rowLabel', text.rowLabel);
  show('totalHighlight', text.totalHighlight);
  const proof = step.table.proof;
  show('firstUse', { key: proof.firstUse.i18nKey, args: proof.firstUse.i18nArgs, text: SG.i18n.t(proof.firstUse.i18nKey, proof.firstUse.i18nArgs) });
  show('why[10]', text.callout.why[10]);
}));
inLocale('en', () => {
  [1, 2, 3, 6].forEach((k) => {
    const text = V.explain(steps[k].table, steps[k]);
    show('en step ' + k, { total: text.total, badge: text.badge, line: text.line, rowLabel: text.rowLabel, callout: text.callout && text.callout.heading });
  });
});
inLocale('vi', () => {
  [1, 2, 3, 6].forEach((k) => {
    const text = V.explain(steps[k].table, steps[k]);
    show('vi step ' + k, { total: text.total, badge: text.badge, line: text.line, rowLabel: text.rowLabel });
  });
});
