'use strict';
// Scratch (MS08a): the cuts, ratio and folded data of the compact view of G01 (the example of the replay suite).
const SG = require('./load.js');
const R = SG.replay;
const g = SG.fixtures.replayGoldens.filter((x) => x.id === 'G01')[0];
const result = SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
const analysis = R.analyse(result);
const entries = analysis.ratings.map((r, i) => ({ score: r.score, phase: analysis.moves[i].phase, kind: analysis.moves[i].kind }));
const sel = R.select(entries);
console.log('cuts ' + JSON.stringify(sel.cuts.map((c) => c.position)) + ' ranks ' + JSON.stringify(sel.cuts.map((c) => c.rank)) +
  ' ratio ' + sel.ratio);
const into = (name, k) => analysis.transitions[analysis.views[name].steps[k].transition];
const t4 = into('compact', 4);
const t5 = into('compact', 5);
console.log('jump4 ' + JSON.stringify({ ratio: t4.ratio, newHardest: t4.newHardest, change: t4.change, auditScope: t4.auditScope }));
console.log('folded5 ' + JSON.stringify(t5.folded) + ' tier5 ' + t5.tier);
console.log('audit ' + JSON.stringify(analysis.views.compact.audit));
const toPos = (name, position) => analysis.transitions.filter((t) => t.view === name && t.to === position && t.role === 'step')[0];
console.log('pos27 compact before.W ' + toPos('compact', 27).before.W + ' details ' + toPos('details', 27).before.W);
const full = (() => { const steps = R.prepare(result); let n = steps.next(); while (!n.done) n = steps.next(); return n.value; })();
const f4 = full.transitions[full.views.compact.steps[4].transition];
console.log('cause ' + JSON.stringify(f4.cause));
console.log('choice ' + JSON.stringify(f4.choice));
const proof = full.proofs[f4.to];
console.log('proof ' + JSON.stringify({ restricted: proof.restricted, k: proof.firstUse.k, n: proof.firstUse.n, technique: proof.firstUse.technique,
  key: proof.firstUse.i18nKey, placements: proof.firstUse.placements, args: proof.firstUse.i18nArgs }));
console.log('before ' + JSON.stringify([f4.before.total, f4.after.total, f4.before.level, f4.after.level]));
const f5 = full.transitions[full.views.compact.steps[5].transition];
console.log('step5 ' + JSON.stringify({ tier: f5.tier, cause: f5.cause, before: f5.before.total, after: f5.after.total }));
const label = (c) => SG.model.cellLabel(result.model, c);
console.log('culprit label ' + (f4.cause.culprit ? label(f4.cause.culprit.cell) : null));
