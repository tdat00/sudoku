'use strict';
// Scratch (MS15b): the alsXz Finding of every real classic 9 x 9 fixture puzzle at the position where the registry
// reaches order 194 (every unscoped technique of order < 194 exhausted), checked against the unique solution.
const SG = require('./load.js');
const H = SG.techHelper;
const F = SG.fixtures.techniques;
const model = H.model('classic9');
const ids = SG.techniques.list().filter((t) => t.variantScope === null && t.order < 194).map((t) => t.id);
const puzzles = new Map();
function add(entry, tag) {
  if (entry && typeof entry.puzzle === 'string' && entry.puzzle.length === 81 && !puzzles.has(entry.puzzle)) {
    puzzles.set(entry.puzzle, tag);
  }
}
Object.keys(F.byId).forEach((id) => {
  const e = F.byId[id];
  (e.positive || []).forEach((x) => add(x, id + '+'));
  (e.negative || []).forEach((x) => add(x, id + '-'));
});
Object.keys(F.supplements).forEach((id) => F.supplements[id].forEach((x) => add(x, id + 's')));
puzzles.forEach((tag, puzzle) => {
  const givens = H.parsePuzzle(model, puzzle);
  if (SG.dfs.countSolutions(model, givens, 2) !== 1) return;
  const solution = SG.dfs.solve(model, givens);
  const state = H.stateAfter(model, puzzle, ids);
  let open = 0;
  for (let c = 0; c < model.cellCount; c++) if (state.value[c] === 0) open++;
  if (open === 0) return;
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const f = SG.alsPatterns.findXz(model, state, ctx);
  const unsound = f === null ? 0 : f.eliminations.filter((e) => solution[e[0]] === e[1]).length;
  console.log(JSON.stringify({ tag, puzzle, open, record: records[0],
    cells: f && f.cells.map((c) => SG.model.cellLabel(model, c)),
    x: f && f.i18nArgs.digitX, z: f && f.i18nArgs.digitY, elims: f && f.eliminations, unsound }));
});
