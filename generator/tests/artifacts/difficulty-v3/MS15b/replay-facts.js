'use strict';
// MS15b scratch (I2 pin refresh of replay.test.js, steps.test.js, player.test.js): the facts of the 14 goldens that those suites
// pin, computed with the suites' own helpers (analysis of the golden's result, the wire fixture for G09-G13). Prints, per golden,
// the jump transitions of both views with the compact-view end position matched in the details view, the unrecorded choices, and
// the witness moves of unfinished checks. Usage (from generator/): node tests/artifacts/difficulty-v3/MS15b/replay-facts.js [G06,G13]
const SG = require('./load.js');
const R = SG.replay;
const GOLDENS = SG.fixtures.replayGoldens;
const WIRE = SG.fixtures.replayWire;
const only = process.argv[2] ? process.argv[2].split(',') : null;
const cache = {};
const entry = (id) => {
  if (!cache[id]) {
    const g = GOLDENS.filter((x) => x.id === id)[0];
    const result = WIRE[id] ? R.fromPlainWire(WIRE[id]) : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
    cache[id] = { golden: g, result, analysis: R.analyse(result) };
  }
  return cache[id];
};
const label = (id, cell) => SG.model.cellLabel(entry(id).result.model, cell);
const frame = (id, f) => {
  if (f === null) return '-';
  if (f.kind === 'cell') return label(id, f.cell);
  const pair = entry(id).analysis.signs[f.sign];
  return 's' + f.sign + '(' + label(id, pair[0]) + '<' + label(id, pair[1]) + ')';
};
const total = { compact: 0, details: 0 };
const distinct = {};
GOLDENS.forEach((g) => {
  if (only && only.indexOf(g.id) < 0) return;
  const a = entry(g.id).analysis;
  console.log('== ' + g.id + ' ' + g.request.variantId + ' ' + g.request.difficulty + ' (moves ' + a.moves.length + ', compact steps ' + a.views.compact.steps.length + ', details steps ' + a.views.details.steps.length + ')');
  a.transitions.filter((t) => t.tier === 'jump').forEach((t) => {
    total[t.view]++;
    distinct[g.id + ':' + t.from + '>' + t.to + ':' + t.before.total + '>' + t.after.total] = true;
    const stepIndex = a.views[t.view].steps.findIndex((s) => s.transition === a.transitions.indexOf(t));
    const other = a.transitions.filter((u) => u.view !== t.view && u.to === t.to && u.role === 'step')[0];
    console.log('  jump ' + t.view + ' step ' + stepIndex + ' ' + t.from + '>' + t.to + ' total ' + t.before.total + '>' + t.after.total + ' change ' + t.change + ' ratio ' + t.ratio +
      ' newHardest ' + t.newHardest + ' hardest ' + t.before.hardest + '>' + t.after.hardest + ' cause ' + (t.cause && t.cause.class) + ' frame ' + (t.cause ? frame(g.id, t.cause.frame) : '-') +
      (t.cause && t.cause.culprit ? ' culprit.other ' + t.cause.culprit.otherScore : '') + ' choice ' + (t.choice && t.choice.kind) + (t.choice && t.choice.kind === 'guided' ? ' chosen ' + t.choice.chosen + ' rated ' + t.choice.rated + ' refused ' + t.choice.refused + ' others ' + t.choice.others : '') +
      ' | other view at the same end: ' + (other ? other.view + ' ' + other.before.total + '>' + other.after.total + ' tier ' + other.tier + ' change ' + other.change : 'none'));
  });
  g.jumps.forEach((j) => {
    if (j.choice !== null) return;
    const t = a.transitions[a.views.compact.steps[j.step - 1].transition];
    console.log('  unrecorded choice ' + g.id + ':' + j.step + ' kind ' + t.choice.kind);
  });
  a.moves.forEach((m, i) => {
    if (m.span && m.span.chosen === null && m.span.rated > 0) {
      console.log('  witness move ' + i + ' at ' + m.at + ' span rated ' + m.span.rated + ' refused ' + m.span.refused + ' others ' + m.span.others + ' nulls ' + m.span.nulls);
    }
  });
});
console.log('jump transitions ' + JSON.stringify(total) + ', distinct ' + Object.keys(distinct).length);
