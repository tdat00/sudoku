'use strict';
// Scratch (MS08c): the facts that the replay, steps and player suites pin for G11 and G12 (and the counts over the 14
// goldens), read from the refreshed fixtures with the current code. Usage (from generator/):
//   node tests/artifacts/difficulty-v3/MS08c/pin-facts.js
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
const analyses = {};
const views = {};
GOLDENS.forEach((g) => {
  const result = goldenResult(g.id);
  analyses[g.id] = R.analyse(result);
  R.prepare ? null : null;
  views[g.id] = P.buildViews(result, analyses[g.id]);
});

let compact = 0;
let details = 0;
const distinct = {};
GOLDENS.forEach((g) => {
  analyses[g.id].transitions.forEach((t) => {
    if (t.tier !== 'jump') return;
    if (t.view === 'compact') compact++; else details++;
    distinct[g.id + ':' + t.from + '>' + t.to + ':' + t.before.total + '>' + t.after.total] = true;
  });
});
console.log('jump transitions compact ' + compact + ' details ' + details + ' distinct ' + Object.keys(distinct).length);

['G11', 'G12'].forEach((id) => {
  const a = analyses[id];
  const v = views[id];
  console.log('== ' + id + ' compact ' + v.compact.steps.length + ' details ' + v.details.steps.length +
    ' final score ' + a.ratings[a.ratings.length - 1].score);
  v.compact.steps.forEach((s, i) => {
    const t = s.table.transition;
    const last = s.parts && s.parts.length ? s.parts[s.parts.length - 1] : null;
    console.log('compact ' + i + ' pos ' + s.position + ' role ' + s.role + ' tier ' + (t ? t.tier : null) + ' ' +
      (t ? t.before.total + '>' + t.after.total + ' from ' + t.from + ' to ' + t.to + ' class ' + (t.cause ? t.cause.class : null) +
        ' hardest ' + t.before.hardest + '>' + t.after.hardest + ' new ' + t.newHardest : '') +
      (last ? ' lastpart ' + last.key + ' ' + JSON.stringify(last.args) : ''));
  });
  const jumpSteps = [];
  v.details.steps.forEach((s, i) => {
    const t = s.table.transition;
    if (t && t.tier === 'jump') jumpSteps.push('details#' + i + ' ' + t.before.total + '>' + t.after.total + ' class ' +
      t.cause.class + ' frame ' + JSON.stringify(t.cause.frame) + ' signs.cause ' + JSON.stringify(s.signs && s.signs.cause));
    if (t && t.tier === 'newPeak' && t.after.total <= t.before.total) {
      console.log('details#' + i + ' newPeak flat/lower ' + t.before.total + '>' + t.after.total + ' change ' + t.change +
        ' hardest ' + t.before.hardest + '>' + t.after.hardest + ' ratio ' + t.ratio);
    }
  });
  console.log(jumpSteps.join('\n'));
});

// a position that is the end of a compact jump and not a jump in the details view
['G11', 'G12'].forEach((id) => {
  const a = analyses[id];
  a.transitions.filter((t) => t.view === 'compact' && t.tier === 'jump').forEach((t) => {
    const d = a.transitions.filter((x) => x.view === 'details' && x.to === t.to && x.from !== undefined);
    console.log(id + ' compact jump to ' + t.to + ' (' + t.before.total + '>' + t.after.total + ') details transitions to the same end ' +
      JSON.stringify(d.map((x) => ({ from: x.from, tier: x.tier, b: x.before.total, a: x.after.total, change: x.change, ratio: x.ratio }))));
  });
});

// every compact fold of every golden: the kind of its last part
GOLDENS.forEach((g) => {
  views[g.id].compact.steps.forEach((s, i) => {
    const last = s.parts && s.parts.length ? s.parts[s.parts.length - 1] : null;
    if (last && /^replay\.folded\./.test(last.key)) console.log('fold ' + g.id + ' compact ' + i + ' ' + last.key + ' ' + JSON.stringify(last.args));
  });
});

let jumps = 0;
let framed = 0;
GOLDENS.forEach((g) => {
  ['compact', 'details'].forEach((name) => views[g.id][name].steps.forEach((s) => {
    const t = s.table.transition;
    const frame = t !== null && t.tier === 'jump' && t.cause ? t.cause.frame : null;
    if (t !== null && t.tier === 'jump') { jumps++; if (frame) framed++; }
  }));
});
console.log('player jumps ' + jumps + ' framed ' + framed);
