'use strict';
// MS13c scratch: the facts the pins of replay.test.js and steps.test.js need from the NEW goldens, computed from the registered
// engine and the new fixtures (replay-wire.js, replay-goldens.js): the stuck board's technique counts, the score of G06, the
// compact jumps that are not jumps in the details view, the distinct jump transitions, the falling new-hardest positions of G12
// and the cause classes of the compact jumps of G07, G10 and G12. Usage (from generator/): node ...\replay-pins.js
const SG = require('./load.js');
const R = SG.replay;
const GOLDENS = SG.fixtures.replayGoldens;
const WIRE = SG.fixtures.replayWire;
const built = {};
function entry(id) {
  if (!built[id]) {
    const g = GOLDENS.filter((x) => x.id === id)[0];
    built[id] = WIRE[id] ? R.fromPlainWire(WIRE[id]) : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
  }
  return built[id];
}
const analyses = {};
const analysisOf = (id) => analyses[id] || (analyses[id] = R.analyse(entry(id)));
const into = (analysis, name, k) => analysis.transitions[analysis.views[name].steps[k].transition];
const toPosition = (analysis, name, position) => analysis.transitions.filter((t) => t.view === name && t.to === position && t.role === 'step')[0];

const g01 = entry('G01');
const board = '004600000721000000900004070070061005400807002600520080060700009000000728000005600';
const stuck = R.rateBoard(g01.model, Int32Array.from(board.split('').map(Number)));
console.log('stuck board counts', JSON.stringify(stuck.counts), stuck.status, stuck.empties);
const g06 = entry('G06');
console.log('G06 rated score', R.rateBoard(g06.model, g06.givens, { forceCount: true }).score);

const count = { compact: 0, details: 0 };
const distinct = {};
GOLDENS.forEach((g) => {
  analysisOf(g.id).transitions.forEach((t) => {
    if (t.tier !== 'jump') return;
    count[t.view]++;
    distinct[g.id + ':' + t.from + '>' + t.to + ':' + t.before.total + '>' + t.after.total] = true;
  });
});
console.log('jumps', JSON.stringify(count), Object.keys(distinct).length, Object.keys(distinct).join(' '));

// a position that is a jump in the compact view and not in the details view
GOLDENS.forEach((g) => {
  const a = analysisOf(g.id);
  a.transitions.filter((t) => t.view === 'compact' && t.tier === 'jump').forEach((t) => {
    const d = toPosition(a, 'details', t.to);
    if (d && d.tier !== 'jump') {
      console.log('compact-jump-only', g.id, 'to', t.to, 'compact', t.before.total, t.after.total, 'details', d.before.total, d.after.total, 'change', d.change, 'tier', d.tier, 'ratio', d.ratio);
    }
  });
});
// falling or flat new-hardest positions of G12 and G13 in the details view
['G12', 'G13', 'G07', 'G10'].forEach((id) => {
  const a = analysisOf(id);
  a.transitions.filter((t) => t.view === 'details' && t.newHardest && t.tier === 'newPeak' && t.change <= 0).forEach((t) => {
    console.log('falling-newHardest', id, 'to', t.to, t.before.total, t.after.total, t.change, t.after.hardest, t.before.hardest, t.tier, t.ratio);
  });
});
// the flat position of G13 (a flat step with Naked Single on both sides near the old 101)
(() => {
  const a = analysisOf('G13');
  a.transitions.filter((t) => t.view === 'details' && t.role === 'step' && t.to >= 90 && t.to <= 130).forEach((t) => {
    console.log('G13 details', t.to, t.before.total, t.after.total, t.change, t.before.hardest, t.after.hardest, t.tier, t.newHardest);
  });
  const g12 = analysisOf('G12');
  g12.transitions.filter((t) => t.view === 'details' && t.role === 'step' && t.to >= 98 && t.to <= 108).forEach((t) => {
    console.log('G12 details', t.to, t.before.total, t.after.total, t.change, t.before.hardest, t.after.hardest, t.tier, t.newHardest);
  });
})();
// cause classes of the compact jumps
['G07', 'G10', 'G12', 'G13', 'G06', 'G03', 'G04', 'G14', 'G01'].forEach((id) => {
  const a = analysisOf(id);
  a.views.compact.steps.forEach((s, k) => {
    const t = s.transition === null ? null : a.transitions[s.transition];
    if (t && t.tier === 'jump') console.log('compact jump', id, 'step', k, 'class', t.cause && t.cause.class, 'n', t.cause && t.cause.n, 'k', t.cause && t.cause.k, 'tech', t.after.hardest, 'from', t.from, 'to', t.to, t.before.total, '->', t.after.total);
  });
});
