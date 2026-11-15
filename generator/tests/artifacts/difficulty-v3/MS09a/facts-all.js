'use strict';
// Scratch (MS09a): the facts that the replay, steps and player suites pin about the 14 goldens, read from the refreshed
// fixtures with the current code: the jump transitions of both views (compact index, position, totals, cause class, frame,
// choice kind), the flat or lower new peaks of the details view, the compact jumps whose end is no jump in the details
// view, the multi-move jumps, and the Killer facts of G09. Usage (from generator/):
//   node tests/artifacts/difficulty-v3/MS09a/facts-all.js
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
const only = process.argv.slice(2);
GOLDENS.forEach((g) => {
  if (only.length > 0 && only.indexOf(g.id) === -1) return;
  const result = goldenResult(g.id);
  const analysis = R.analyse(result);
  const views = P.buildViews(result, analysis);
  const label = (c) => SG.model.cellLabel(result.model, c);
  const frameOf = (f) => (f === null ? null : f.kind === 'cell' ? f.action + ':' + label(f.cell) : 'sign ' + f.sign);
  console.log('== ' + g.id + ' final ' + analysis.ratings[analysis.ratings.length - 1].score + ' compact ' +
    views.compact.steps.length + ' details ' + views.details.steps.length + ' digLog ' + (result.digLog || []).length);
  ['compact', 'details'].forEach((name) => {
    views[name].steps.forEach((s, i) => {
      const t = s.table.transition;
      if (!t) return;
      if (t.tier === 'jump') {
        console.log('  ' + name + ' #' + i + ' pos ' + s.position + ' from ' + t.from + ' to ' + t.to + ' ' + t.before.total + '>' +
          t.after.total + ' class ' + t.cause.class + ' frame ' + frameOf(t.cause.frame) + ' choice ' + t.choice.kind +
          ' hardest ' + t.before.hardest + '>' + t.after.hardest + ' new ' + t.newHardest + ' n ' + (s.last - s.first + 1) +
          ' k ' + t.cause.k + ' signs.cause ' + JSON.stringify(s.signs && s.signs.cause));
      } else if (t.tier === 'newPeak' && t.after.total <= t.before.total) {
        console.log('  ' + name + ' #' + i + ' pos ' + s.position + ' newPeak flat/lower ' + t.before.total + '>' + t.after.total +
          ' change ' + t.change + ' hardest ' + t.before.hardest + '>' + t.after.hardest);
      }
    });
  });
  analysis.transitions.filter((t) => t.view === 'compact' && t.tier === 'jump').forEach((t) => {
    const d = analysis.transitions.filter((x) => x.view === 'details' && x.to === t.to);
    d.filter((x) => x.tier !== 'jump').forEach((x) => console.log('  compact jump end ' + t.to + ' (' + t.before.total + '>' + t.after.total +
      ') is no jump in details: ' + x.before.total + '>' + x.after.total + ' change ' + x.change + ' ratio ' + x.ratio));
  });
  if (g.id === 'G09') {
    const groups = SG.symmetry.groups(result.model, result.config.symmetry).filter((group) =>
      Array.from(group).every((c) => result.givens[c] === 0));
    console.log('  G09 rebuilt-log groups ' + groups.length);
    const steps = views.compact.steps;
    steps.forEach((s, i) => {
      if (s.table.transition && s.table.transition.tier === 'jump') {
        P.stepTitle; // keep the reference
      }
    });
  }
});
