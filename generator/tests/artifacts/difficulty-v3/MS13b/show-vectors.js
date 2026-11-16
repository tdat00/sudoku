'use strict';
// MS13b scratch: prints the exact display vectors of the task (each a proof that the independent checker SG.chainProofs
// accepts, canonical nodes included) and what both apps write for it in English and Vietnamese, for the evidence:
//   Generator: SG.i18n.t(key, args) with the cell labeler of the board (raw numeric nodes),
//   Player:    SG.i18n.t(key, SG.play.localizeArgs(model, args, mode)) (labels and the symbols of the board).
//   MS13B_APP=player node generator/tests/artifacts/difficulty-v3/MS13b/show-vectors.js   (default: generator)
const SG = require('./load.js');
const CP = SG.chainProofs;
const H = SG.techHelper;
const APP = process.env.MS13B_APP === 'player' ? 'player' : 'generator';
const node = (cells, digit, truth) => ({ cells, digit, truth });

function position(model, digit, open) {
  const state = SG.model.initState(model);
  for (let c = 0; c < model.cellCount; c++) state.candidates[c] = open.indexOf(c) === -1 ? 0 : 1 << (digit - 1);
  return state;
}
function endpoints(model, digit, open, cells) {
  const state = position(model, digit, open);
  const nodes = [node([cells[0], cells[1]], digit, 0), node([cells[2]], digit, 1), node([cells[3]], digit, 0),
    node([cells[4]], digit, 1)];
  const union = [];
  nodes.forEach((n) => n.cells.forEach((c) => { if (!union.includes(c)) union.push(c); }));
  const finding = { technique: 'forcingChain', cells: union.sort((a, b) => a - b), placements: [],
    eliminations: CP.targets(model, state, nodes[0], nodes[3]), i18nKey: 'technique.forcingChain.step.endpoints',
    i18nArgs: { proofVersion: 2, kind: 'endpoints', length: 3, chains: [nodes] } };
  return { model, state, finding };
}
function sa2() {
  const model = SG.model.create({ variantId: 'chain-sa2-vector', digits: 4,
    units: [[0, 1, 2, 10], [0, 3, 4, 11], [1, 3, 8, 12], [0, 5, 6, 13], [5, 2, 7, 14], [0, 1, 9, 15]],
    unitMeta: [{ kind: 'box', label: 'B1' }, { label: 'X1' }, { label: 'X2' }, { label: 'X3' }, { label: 'X4' },
      { kind: 'row', label: 'R1' }],
    layout: { rows: 4, cols: 4, cellRow: [0, 0, 1, 1, 1, 2, 2, 2, 2, 0, 1, 3, 3, 3, 3, 0],
      cellCol: [0, 1, 0, 2, 3, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 3] } });
  const state = SG.model.initState(model);
  [[1, 2], [1, 2, 3], [1, 2, 3], [1, 3], [2, 3], [1, 2], [1, 3], [1, 2, 3], [1, 2, 3], [2, 3]].forEach((d, c) => {
    state.candidates[c] = d.reduce((m, x) => m | (1 << (x - 1)), 0);
  });
  for (let c = 10; c < 16; c++) { state.value[c] = 4; state.candidates[c] = 1 << 3; }
  state.unsolvedCount = 10;
  return { model, state };
}
const vectors = [];
const classic = H.model('classic9');
let v = endpoints(classic, 5, [0, 1, 4, 9, 13, 18, 19, 20], [0, 1, 4, 13, 9]);
vectors.push(['endpoints on classic9 (a false group start), the checker\'s vector', v, 'digits']);
const position2 = sa2();
vectors.push(['forced, two paths mixing singletons and a group (SA2\'s MS13a vector)', Object.assign({}, position2, { finding: {
  technique: 'forcingChain', cells: [0, 1, 2, 3, 5], placements: [[0, 1]], eliminations: [],
  i18nKey: 'technique.forcingChain.step.forced', i18nArgs: { proofVersion: 2, kind: 'forced', length: 5, chains: [
    [node([0], 1, 0), node([0], 2, 1), node([5], 2, 0), node([5], 1, 1), node([2], 1, 0), node([0, 1], 1, 1)],
    [node([0], 1, 0), node([3], 1, 1), node([0, 1], 1, 0)]] } } }), 'digits']);
vectors.push(['contradiction, two paths mixing singletons and a group (found by a search of the canonical graph)',
  Object.assign({}, position2, { finding: {
    technique: 'forcingChain', cells: [0, 1, 2, 3], placements: [], eliminations: [[1, 1]],
    i18nKey: 'technique.forcingChain.step.contradiction', i18nArgs: { proofVersion: 2, kind: 'contradiction', length: 3, chains: [
      [node([1], 1, 1), node([2], 1, 0), node([0, 1], 1, 1)],
      [node([1], 1, 1), node([0], 1, 0), node([3], 1, 1), node([0, 1], 1, 0)]] } } }), 'digits']);
if (APP === 'player') {
  const hexDoc = SG.testkit.document('mega16');
  const hex = SG.importer.openDocument(JSON.parse(JSON.stringify(hexDoc))).puzzle.model;
  vectors.push(['endpoints on 16 digits, the value 1 written 0', endpoints(hex, 1, [0, 1, 4, 16, 20, 32, 33, 34, 35, 48, 49, 50, 51],
    [0, 1, 4, 20, 16]), 'digits']);
  const wordDoc = SG.testkit.document('wordoku');
  const word = SG.importer.openDocument(JSON.parse(JSON.stringify(wordDoc))).puzzle.model;
  vectors.push(['endpoints on a Wordoku in letter mode, the value 5 written as its letter', endpoints(word, 5, [0, 1, 4, 9, 13, 18, 19, 20],
    [0, 1, 4, 13, 9]), 'word']);
}
vectors.forEach(([name, vec, mode]) => {
  const problems = CP.pathProblems(vec.model, vec.state, vec.finding).concat(CP.pathProblems(vec.model, vec.state, vec.finding, { canonical: true }));
  console.log('### ' + name);
  console.log('checker problems: ' + (problems.length === 0 ? 'none' : problems.join(' | ')));
  console.log('cells ' + JSON.stringify(vec.finding.cells) + ', placements ' + JSON.stringify(vec.finding.placements) +
    ', eliminations ' + JSON.stringify(vec.finding.eliminations));
  console.log('args ' + JSON.stringify(vec.finding.i18nArgs));
  ['en', 'vi'].forEach((code) => {
    SG.i18n.setLocale(code);
    let text;
    if (APP === 'player') {
      text = SG.i18n.t(vec.finding.i18nKey, SG.play.localizeArgs(vec.model, vec.finding.i18nArgs, mode));
    } else {
      SG.i18n.setCellLabeler((cell) => SG.model.cellLabel(vec.model, cell));
      text = SG.i18n.t(vec.finding.i18nKey, vec.finding.i18nArgs);
      SG.i18n.setCellLabeler(null);
    }
    console.log(code + ': ' + text);
  });
  console.log('');
});
SG.i18n.setLocale('en');
