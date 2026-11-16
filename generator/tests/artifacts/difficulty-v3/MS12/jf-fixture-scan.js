'use strict';
// Scratch (MS12): which already identified puzzles of the repository's test fixtures reach a Jellyfish in a complete logical solve
// with the registered ladder (assumeUniqueness true, every technique allowed)? Candidates: every distinct 81-character classic
// puzzle string ('.' or a digit) in core/tests/fixtures/*.js and generator/tests/fixtures/*.js that has exactly one solution.
// Nothing is generated and nothing is written; this only reads the fixtures.
//   node tests/artifacts/difficulty-v3/MS12/jf-fixture-scan.js
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const dirs = [path.join(ROOT, 'core', 'tests', 'fixtures'), path.join(ROOT, 'generator', 'tests', 'fixtures')];
const seen = {};
const candidates = [];
dirs.forEach((dir) => fs.readdirSync(dir).filter((n) => n.endsWith('.js')).sort().forEach((name) => {
  const text = fs.readFileSync(path.join(dir, name), 'utf8');
  const re = /['"]([.0-9]{81})['"]/g;
  let m;
  while ((m = re.exec(text))) {
    if (seen[m[1]]) continue;
    seen[m[1]] = true;
    candidates.push({ puzzle: m[1], file: path.relative(ROOT, path.join(dir, name)).replace(/\\/g, '/'),
      line: text.slice(0, m.index).split('\n').length });
  }
}));
console.log('distinct 81-character puzzle strings in the fixtures: ' + candidates.length);
let unique = 0;
let solved = 0;
const hits = [];
candidates.forEach((c) => {
  const givens = H.parsePuzzle(model, c.puzzle);
  let count;
  try { count = SG.dfs.countSolutions(model, givens, 2); } catch (e) { return; }
  if (count !== 1) return;
  unique++;
  const report = SG.logicalSolver.solve(model, givens, { allowedTechniques: null, assumeUniqueness: true });
  if (report.solved) solved++;
  const at = report.steps.findIndex((s) => s.technique === 'jellyfish');
  if (at >= 0) hits.push({ file: c.file, line: c.line, puzzle: c.puzzle, solved: report.solved, step: at + 1, of: report.steps.length });
});
console.log('unique: ' + unique + ', solved by the ladder: ' + solved + ', with a jellyfish step: ' + hits.length);
hits.forEach((h) => console.log(JSON.stringify(h)));
