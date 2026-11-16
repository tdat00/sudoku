'use strict';
// Scratch (MS10a): real positions with a remote pair. Every 81-character puzzle string found in the fixture, suite and
// help-source files is checked for a unique solution; the position after every technique before remotePairs in the
// registry (the position a person has when the pair is asked for) is searched with the registered finder.
//   node tests/artifacts/difficulty-v3/MS10a/explore-real.js [--limit=N]
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

const files = [
  'core/tests/fixtures/techniques.js', 'core/tests/fixtures/puzzles.js', 'generator/tests/fixtures/rated.js',
  'core/tests/suites/tech-wing.test.js', 'core/tests/suites/tech-fish.test.js', 'core/tests/suites/tech-chain.test.js',
  'core/tests/suites/logical-solver.test.js', 'player/tests/artifacts/difficulty-v3/MS09b/sources.json',
  'player/tests/artifacts/difficulty-v3/MS09b/sources-fsf-existing.json'
];
const puzzles = new Set();
files.forEach((rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;
  const text = fs.readFileSync(abs, 'utf8');
  (text.match(/[.0-9]{81}/g) || []).forEach((p) => puzzles.add(p));
});
const before = SG.techniques.list().filter((t) => t.order < 132 && t.variantScope === null).map((t) => t.id);
console.log('puzzle strings: ' + puzzles.size + '; techniques before remotePairs: ' + before.join(' '));
const find = SG.techniques.get('remotePairs').find;
let unique = 0;
let hits = 0;
puzzles.forEach((p) => {
  const givens = H.parsePuzzle(model, p);
  if (SG.dfs.countSolutions(model, givens, 2) !== 1) return;
  unique++;
  const state = H.stateAfter(model, p, before);
  const records = [];
  const ctx = SG.techniques.createContext(model, { onPatternWork: (r) => records.push(r) });
  const f = find(model, state, ctx);
  if (f === null) return;
  hits++;
  console.log(p + ' length ' + f.i18nArgs.length + ' ends ' + f.i18nArgs.ends.join(',') + ' digits ' + f.i18nArgs.digits.join('') +
    ' cells ' + f.cells.map((c) => H.label(model, c)).join(' ') + ' elim ' +
    f.eliminations.map((e) => H.label(model, e[0]) + '-' + e[1]).join(' ') + ' work ' + records[0].work);
});
console.log('unique puzzles ' + unique + ', positions with a remote pair ' + hits);
