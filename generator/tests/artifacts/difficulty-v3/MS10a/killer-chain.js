'use strict';
// Scratch (MS10a): the Finding of the registered remotePairs on the chains of killer-find.js (a same-pair chain on the assembled
// caged Killer model of the help catalogue with a cage-only edge), every other cell holding all digits. Prints the Finding, the
// peers of the ends and whether the same state on the classic model (no cages) finds anything.
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const H = SG.techHelper;
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const text = fs.readFileSync(path.join(ROOT, 'player/js/ui/help-examples.js'), 'utf8');
const start = text.indexOf('cageSplit: {');
const example = JSON.parse(text.slice(start, text.indexOf('\n', start)).slice('cageSplit: '.length).replace(/,\s*$/, ''));
const model = SG.killer.modelFromCages(example.cages);
const solution = SG.dfs.solve(model, H.parsePuzzle(model, example.givens));
const classic = H.model('classic9');
const find = (m, s) => SG.techniques.get('remotePairs').find(m, s, SG.techniques.createContext(m, {}));
const refs = process.argv.slice(2).length ? process.argv.slice(2).map((a) => a.split(',')) : [['R1C2', 'R2C3', 'R7C3', 'R8C4']];
refs.forEach((chain) => {
  const cells = chain.map((r) => H.cell(model, r));
  const mask = (1 << (solution[cells[0]] - 1)) | (1 << (solution[cells[1]] - 1));
  const state = SG.model.initState(model);
  cells.forEach((c) => { state.candidates[c] = mask; });
  const f = find(model, state);
  console.log(chain.join(',') + ' solution digits ' + cells.map((c) => solution[c]).join('') + ' -> ' + JSON.stringify(f));
  if (f) {
    console.log('  eliminations ' + f.eliminations.map((e) => H.label(model, e[0]) + '-' + e[1]).join(' ') + '; problems vs solution: ' +
      JSON.stringify(H.findingProblems(model, state, f, { technique: 'remotePairs', solution })));
    console.log('  peer relation of the cage-only edge R7C3/R8C4 in the caged model: ' + (model.peers[H.cell(model, 'R7C3')].indexOf(H.cell(model, 'R8C4')) !== -1) +
      ', classic9: ' + (classic.peers[H.cell(model, 'R7C3')].indexOf(H.cell(model, 'R8C4')) !== -1));
  }
  const s2 = SG.model.initState(classic);
  cells.forEach((c) => { s2.candidates[c] = mask; });
  console.log('  the same state on the uncaged classic model: ' + JSON.stringify(find(classic, s2)));
});
console.log('solution ' + Array.from(solution).join(''));
