'use strict';
// Scratch (MS14b): prints the data of the fixtures of lawOfLeftovers (layout rows, puzzle, expected eliminations as [cell, digit] and
// the lines/regions/cells of the Finding) for the chosen seeded puzzles, to be copied into core/tests/fixtures/jigsaw-techniques.js.
//   node fixture-data.js
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
const H = SG.techHelper;
const tech = SG.techniques.get('lawOfLeftovers');
const BELOW = SG.techniques.list().filter((t) => t.order < tech.order &&
  (t.variantScope === null || t.variantScope.indexOf('jigsaw9') !== -1)).map((t) => t.id);

function rowsOf(layout) {
  const rows = [];
  for (let r = 0; r < 9; r++) rows.push(layout.slice(r * 9, r * 9 + 9).join(''));
  return rows;
}
function transposeText(text) {
  let out = '';
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) out += text[c * 9 + r];
  return out;
}

function dugPuzzle(name, seed) {
  const model = J.build(J.parse(J.LAYOUTS[name]));
  const rng = SG.testkit.rng.create(seed * 7919);
  const solution = J.solve(model, rng.fork('grid'));
  const dug = SG.testkit.dig(model, solution, rng.fork('dig'), { minClues: 0 });
  return H.puzzleString(model, dug.givens);
}

function describe(title, layout, text, through) {
  const model = J.build(layout);
  const state = H.stateAfter(model, H.parsePuzzle(model, text), BELOW.concat(through ? ['lawOfLeftovers'] : []));
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const f = tech.find(model, state, ctx);
  console.log('// ' + title);
  console.log('layout ' + JSON.stringify(rowsOf(layout)));
  console.log('puzzle ' + JSON.stringify(text));
  console.log('solutions ' + SG.dfs.countSolutions(model, H.parsePuzzle(model, text), 2) + ', open ' + state.unsolvedCount + ', work ' + records[0].work);
  if (f === null) { console.log('finding null'); return; }
  console.log('eliminations ' + JSON.stringify(f.eliminations));
  console.log('cells ' + JSON.stringify(f.cells));
  console.log('args ' + JSON.stringify(f.i18nArgs));
  console.log('removes ' + f.eliminations.map((e) => SG.model.cellLabel(model, e[0]) + ':' + e[1]).join(' '));
}

const wavy = J.parse(J.LAYOUTS.wavy);
const crossed = J.parse(J.LAYOUTS.crossed);
const boxes = J.parse(J.LAYOUTS.boxes);
const wavyText = dugPuzzle('wavy', 3);
const crossedText = dugPuzzle('crossed', 2);
describe('wavy rows', wavy, wavyText, false);
describe('wavy columns (the transpose)', J.transpose(wavy), transposeText(wavyText), false);
describe('crossed rows', crossed, crossedText, false);
describe('crossed columns (the transpose)', J.transpose(crossed), transposeText(crossedText), false);
describe('wavy rows after the technique itself', wavy, wavyText, true);
describe('wavy columns after the technique itself', J.transpose(wavy), transposeText(wavyText), true);
describe('boxes', boxes, dugPuzzle('boxes', 2), false);
