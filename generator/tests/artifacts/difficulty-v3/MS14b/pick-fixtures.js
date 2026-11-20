'use strict';
// Scratch (MS14b): checks candidate fixture positions: the puzzle (given as a string of 81 characters) on a named layout, its
// transpose, the number of solutions, the first Finding of the registered finder at the position where the registry reaches it and
// whether the transposed position gives the transposed Finding. Prints the data in the shape of the fixture.
//   node pick-fixtures.js <layout> <seed> [more <layout> <seed> pairs]
const SG = require('./load.js');
const J = SG.fixtures.jigsawModels;
const H = SG.techHelper;
const tech = SG.techniques.get('lawOfLeftovers');
const BELOW = SG.techniques.list().filter((t) => t.order < tech.order &&
  (t.variantScope === null || t.variantScope.indexOf('jigsaw9') !== -1)).map((t) => t.id);

function transposeText(text) {
  let out = '';
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) out += text[c * 9 + r];
  return out;
}

function firstFinding(layout, text, through) {
  const model = J.build(layout);
  const givens = H.parsePuzzle(model, text);
  const state = H.stateAfter(model, givens, BELOW.concat(through ? ['lawOfLeftovers'] : []));
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  return { model, givens, state, finding: tech.find(model, state, ctx), record: records[0], solutions: SG.dfs.countSolutions(model, givens, 2) };
}

const args = process.argv.slice(2);
for (let i = 0; i + 1 < args.length; i += 2) {
  const name = args[i];
  const seed = Number(args[i + 1]);
  const layout = J.parse(J.LAYOUTS[name]);
  const model = J.build(layout);
  const rng = SG.testkit.rng.create(seed * 7919);
  const solution = J.solve(model, rng.fork('grid'));
  const dug = SG.testkit.dig(model, solution, rng.fork('dig'), { minClues: 0 });
  const text = H.puzzleString(model, dug.givens);
  const a = firstFinding(layout, text, false);
  const tLayout = J.transpose(layout);
  const tText = transposeText(text);
  const b = firstFinding(tLayout, tText, false);
  const show = (x) => x.finding === null ? 'null (work ' + x.record.work + ', cap ' + x.record.capHit + ')' :
    x.finding.i18nArgs.lines.join('+') + '/' + x.finding.i18nArgs.regions.join('+') + ' cells ' + x.finding.i18nArgs.cells.join(' ') +
    ' removes ' + x.finding.eliminations.map((e) => SG.model.cellLabel(x.model, e[0]) + ':' + e[1]).join(' ') + ' work ' + x.record.work;
  const tr = (cell) => (cell % 9) * 9 + Math.floor(cell / 9);
  let dual = 'n/a';
  if (a.finding !== null && b.finding !== null) {
    const want = a.finding.eliminations.map((e) => tr(e[0]) + ':' + e[1]).sort().join(' ');
    const got = b.finding.eliminations.map((e) => e[0] + ':' + e[1]).sort().join(' ');
    dual = want === got ? 'EXACT DUAL' : 'different (' + want + ' vs ' + got + ')';
  }
  const done = firstFinding(layout, text, true);
  console.log('== ' + name + ' seed ' + seed + ': clues ' + dug.clues + ', solutions ' + a.solutions + ' / ' + b.solutions + ', open ' + a.state.unsolvedCount);
  console.log('   puzzle  ' + text);
  console.log('   T puzzle ' + tText);
  console.log('   A ' + show(a));
  console.log('   B ' + show(b));
  console.log('   dual ' + dual + '; after the technique itself: ' + (done.finding === null ? 'nothing' : 'STILL FINDS'));
}
