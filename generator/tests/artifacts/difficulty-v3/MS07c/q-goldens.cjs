'use strict';

// MS07c scratch: facts about the 14 goldens at the selected cutoff, read-only (the results of G09-G13 come from the wire
// fixture, the others are generated like the replay suite does): the moves (kinds, exchanges), the avoided jumps of the
// compact audit, the jumps per view with their cause class and choice kind, and the final rating.
const SG = globalThis.SG;
const R = SG.replay;
const GOLDENS = SG.fixtures.replayGoldens;
const WIRE = SG.fixtures.replayWire;
const only = process.argv.slice(3);

function resultOf(g) {
  return WIRE[g.id] ? R.fromPlainWire(WIRE[g.id])
    : SG.pipeline.run(SG.store.toConfig(g.request), null, SG.budget.create({ ms: 120000 }));
}

let compact = 0;
let details = 0;
const distinct = {};
GOLDENS.forEach((g) => {
  if (only.length > 0 && only.indexOf(g.id) === -1) return;
  const result = resultOf(g);
  const analysis = R.analyse(result);
  const mm = R.moves(result);
  const kinds = {};
  mm.moves.forEach((m) => { kinds[m.kind] = (kinds[m.kind] || 0) + 1; });
  const audit = analysis.views.compact.audit;
  const avoided = audit.filter((e) => e.inserted.length > 0).length;
  const jumps = analysis.transitions.filter((t) => t.tier === 'jump');
  jumps.forEach((t) => {
    if (t.view === 'compact') compact++; else details++;
    distinct[g.id + ':' + t.from + '>' + t.to + ':' + t.before.total + '>' + t.after.total] = true;
  });
  const exchanges = mm.moves.map((m, i) => (m.kind === 'exchange' ? i : -1)).filter((i) => i >= 0);
  console.log(g.id + ' ' + JSON.stringify(g.request).slice(0, 110) + ' moves ' + mm.moves.length + ' kinds ' +
    JSON.stringify(kinds) + ' exchanges at ' + JSON.stringify(exchanges) + ' compact ' + analysis.views.compact.steps.length +
    ' details ' + analysis.views.details.steps.length + ' avoided ' + avoided + ' score ' + result.rating.score + ' ' +
    result.rating.level + ' exact ' + result.exact);
  jumps.forEach((t) => {
    console.log('    jump ' + t.view + ' ' + t.from + '>' + t.to + ' ' + t.before.total + '>' + t.after.total + ' hardest ' +
      t.after.hardest + (t.cause ? ' cause ' + t.cause.class : '') + (t.choice ? ' choice ' + t.choice.kind : ''));
  });
});
console.log('jumps compact ' + compact + ' details ' + details + ' distinct ' + Object.keys(distinct).length);
