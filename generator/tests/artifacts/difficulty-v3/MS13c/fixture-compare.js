'use strict';
// MS13c scratch: what the registered grouped finders say on the typed-in fixtures of tech-chain.test.js (CHAIN_FIXTURES),
// on the famous puzzles' states and on hard-b, against the singleton seam over the same windows.
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const H = SG.techHelper;
const CP = SG.chainProofs;
const m = H.model('classic9');
const text = fs.readFileSync(path.resolve(__dirname, '../../../../../core/tests/suites/tech-chain.test.js'), 'utf8');
const block = /var CHAIN_FIXTURES = (\[[\s\S]*?\n  \]);\r?\n\r?\n  function fixtureState/.exec(text)[1];
const FIXTURES = eval(block);
const C = SG.chainSearch.SHORT_MAX;
function show(f) {
  if (f === null) return 'null';
  return (f.i18nArgs.proofVersion === 2 ? 'v2 ' : 'v1 ') + f.i18nArgs.kind + ' len ' + f.i18nArgs.length + ' elim ' +
    JSON.stringify(f.eliminations) + ' plc ' + JSON.stringify(f.placements) + ' cells ' + JSON.stringify(f.cells);
}
function row(label, state) {
  for (const [id, min, max] of [['forcingChain', 1, C], ['forcingChainLong', C + 1, 12]]) {
    const recs = [];
    const got = SG.techniques.get(id).find(m, state, SG.techniques.createContext(m, { onPatternWork: (r) => recs.push(r) }));
    const old = SG.chainSearch.forcing(m, state, SG.techniques.createContext(m, {}), { id, minLength: min, maxLength: max, workLimit: null });
    const problems = got ? CP.pathProblems(m, state, got, { canonical: true }) : [];
    console.log(label + ' ' + id + ': NEW ' + show(got) + ' [' + recs[0].domain + ' work ' + recs[0].work + ']' + (problems.length ? ' PROBLEMS ' + problems[0] : '') + '\n      OLD ' + show(old));
  }
}
FIXTURES.forEach((fx, i) => row('fixture#' + i + ' ' + fx.name, H.makeState(m, fx.puzzle, { candidates: fx.grid.join(' ').split(' ') })));
['escargot', 'worlds-hardest-2012', 'hard-platinum', 'hard-nugget', 'hard-b', 'hard-c'].forEach((name) => {
  const fx = SG.fixtures.classic.unique.filter((x) => x.name === name)[0];
  row(name, H.makeState(m, fx.puzzle));
});
