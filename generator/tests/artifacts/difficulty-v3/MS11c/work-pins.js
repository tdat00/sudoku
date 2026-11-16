'use strict';
// Scratch (MS11c): the work of the finder on the constructed graves, to pin the work rule in the tests (and the
// structural maximum per model).
const SG = require('./load.js');
const H = SG.techHelper;
const bit = (d) => 1 << (d - 1);
function solutionOf(model) { return Array.from(SG.dfs.solve(model, new Int32Array(model.cellCount))); }
function build(model, cell, opts) {
  const solution = solutionOf(model);
  const placed = opts.placed || [];
  const free = [];
  for (let d = 1; d <= model.digits; d++) if (placed.indexOf(d) === -1) free.push(d);
  const cycle = opts.cycle || free;
  const next = {};
  cycle.forEach((d, i) => { next[d] = cycle[(i + 1) % cycle.length]; });
  const state = SG.model.initState(model);
  for (let c = 0; c < model.cellCount; c++) {
    const s = solution[c];
    if (placed.indexOf(s) !== -1) { state.value[c] = s; state.candidates[c] = bit(s); state.unsolvedCount--; } else state.candidates[c] = bit(s) | bit(next[s]);
  }
  const pair = state.candidates[cell];
  const extra = opts.extra !== undefined ? opts.extra : free.filter((d) => (pair & bit(d)) === 0)[0];
  state.candidates[cell] |= bit(extra);
  return { state, extra, solution };
}
function work(model, state) {
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const f = SG.techniques.get('bugPlusOne').find(model, state, ctx);
  return { f, work: records[0].work };
}
const m9 = H.model('classic9');
const cycle = [1, 3, 5, 7, 9, 2, 4, 6, 8];
const row = (r) => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => r * 9 + c);
const withSol = (model, digit, cells) => { const s = solutionOf(model); return cells.find((c) => s[c] === digit); };
console.log('R5C5 default extra:', build(m9, 40, {}).extra, 'solution at R5C5', solutionOf(m9)[40]);
[[3, 1, 'lowest'], [1, 2, 'middle'], [1, 9, 'highest']].forEach(([s, extra, name]) => {
  const cell = withSol(m9, s, row(4));
  const b = build(m9, cell, { cycle, extra });
  const r = work(m9, b.state);
  console.log(name, 'row 5 cell', cell, 'extra', extra, 'work', r.work, JSON.stringify(r.f && r.f.placements));
});
[[3, 1, 'lowest'], [1, 2, 'middle'], [1, 9, 'highest']].forEach(([s, extra, name]) => {
  const cell = withSol(m9, s, row(8));
  const b = build(m9, cell, { cycle, extra });
  const r = work(m9, b.state);
  console.log(name, 'row 9 cell', cell, 'extra', extra, 'work', r.work);
});
['classic4', 'classic6', 'classic9'].forEach((id) => {
  const m = H.model(id);
  const b = build(m, 0, {});
  const r = work(m, b.state);
  console.log(id, 'cell 0 extra', b.extra, 'work', r.work, 'units', m.units.length, 'sum sizes', m.units.reduce((a, u) => a + u.length, 0));
});
const m16 = SG.fixtures.models.boxGrid('test-wing-16', 4, 4);
const last16 = m16.cellCount - 1;
const s16 = solutionOf(m16);
const pairHigh = build(m16, last16, { extra: 16 });
console.log('16 digits last cell, S', s16[last16], 'extra 16: work', work(m16, pairHigh.state).work, 'units', m16.units.length);
