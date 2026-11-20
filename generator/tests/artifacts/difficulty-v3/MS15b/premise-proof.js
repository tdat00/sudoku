'use strict';
// Scratch (MS15b): proof that the literal PRE_ALS_BEFORE_LONG ladder of tech-chain.test.js gives, on the tree, exactly the stuck positions of the
// live ladder of the base engine b958a58 (MS15B_BASE=git:b958a58, no alsXz registered), for every specimen the changed tests derive:
// the 12 LONG_CHAIN_PUZZLES at C = 6 (windows test), PUZZLE_530 at C = 6 and C = 4, PUZZLE_24 at C = 4. It also prints the premises
// of the PUZZLE_530 tests (forcingChainLong's grouped record at C = 6, the singleton proof of 7 links).
//   node premise-proof.js            -> tree, literal list read from the test file
//   MS15B_BASE=git:b958a58 node ...  -> base, live idsBefore('forcingChainLong')
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SG = require('./load.js');
const H = SG.techHelper;
const model9 = H.model('classic9');
const text = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'core', 'tests', 'suites', 'tech-chain.test.js'), 'utf8');
const literal = (name) => new Function('return ' + /var PRE_ALS_BEFORE_LONG = (\[[\s\S]*?\]);/.exec(text)[1])();
const long = new Function('return ' + /var LONG_CHAIN_PUZZLES = (\[[\s\S]*?\]);/.exec(text)[1])();
const P530 = /var PUZZLE_530 = '([^']+)'/.exec(text)[1];
const P24 = /var PUZZLE_24 = '([^']+)'/.exec(text)[1];
function idsBefore(id) {
  const below = [];
  SG.techniques.list().forEach((t) => { if (t.variantScope === null && SG.techniques.get(id).order > t.order) below.push(t.id); });
  return below;
}
const base = !!process.env.MS15B_BASE;
const ids = base ? idsBefore('forcingChainLong') : literal();
console.log('ladder ' + (base ? 'live idsBefore of the base engine' : 'literal PRE_ALS_BEFORE_LONG') + ': ' + ids.length + ' ids, sha256 ' +
  crypto.createHash('sha256').update(JSON.stringify(ids)).digest('hex'));
function stuck(puzzle, c) {
  const before = SG.chainSearch.SHORT_MAX;
  SG.chainSearch.SHORT_MAX = c;
  try { return H.stateAfter(model9, puzzle, ids); } finally { SG.chainSearch.SHORT_MAX = before; }
}
const digest = (s) => crypto.createHash('sha256').update(JSON.stringify([Array.from(s.candidates), Array.from(s.value)])).digest('hex').slice(0, 16);
long.forEach((p, i) => console.log('long #' + i + ' C=6 ' + digest(stuck(p, 6))));
console.log('P530 C=6 ' + digest(stuck(P530, 6)));
console.log('P530 C=4 ' + digest(stuck(P530, 4)));
console.log('P24 C=4 ' + digest(stuck(P24, 4)));
// the premises of the PUZZLE_530 tests
const before = SG.chainSearch.SHORT_MAX;
SG.chainSearch.SHORT_MAX = 6;
const state = H.stateAfter(model9, P530, ids);
const recs = [];
const out = SG.techniques.get('forcingChainLong').find(model9, state, SG.techniques.createContext(model9, { onPatternWork: (r) => recs.push(r) }));
const single = SG.chainSearch.forcing(model9, state, SG.techniques.createContext(model9, {}), { id: 'forcingChainLong', minLength: 7, maxLength: 12, workLimit: 50000 });
console.log('P530 C=6 forcingChainLong ' + (out === null ? 'null' : 'found') + ' record ' + JSON.stringify({ stop: recs[0].grouped.stop, graph: recs[0].grouped.graph,
  minimum: recs[0].grouped.minimum, capHit: recs[0].capHit, work: recs[0].work }) + ' singleton ' + (single === null ? 'null' : single.i18nArgs.length + ' links'));
SG.chainSearch.SHORT_MAX = before;
