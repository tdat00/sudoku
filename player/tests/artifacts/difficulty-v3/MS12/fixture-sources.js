'use strict';
// Scratch (MS12): a sources file (schema 1) for one technique id from the already identified puzzles of the repository's test
// fixtures: every distinct 81-character classic puzzle string ('.' or a digit) in core/tests/fixtures/*.js and
// generator/tests/fixtures/*.js that has exactly one solution, except the puzzles of --skip (a sources file whose texts were
// already tried). Provenance is the truth: not a Generator output (level null, the export header's level empty) and a non-numeric
// origin marker `fixture-<file>-L<line>` naming the fixture file and the line of its first occurrence. Nothing is generated.
//   node tests/artifacts/difficulty-v3/MS12/fixture-sources.js --for=jellyfish --out=<file> [--skip=<file>]
const fs = require('fs');
const path = require('path');
const SG = require('../../../../../generator/tests/artifacts/difficulty-v3/MS12/load.js');
const H = SG.techHelper;
const model = H.model('classic9');

const args = process.argv.slice(2);
const opt = (name) => { const a = args.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : null; };
const id = opt('for');
const out = opt('out');
const skip = opt('skip');
if (!id || !out) throw new Error('usage: --for=<id> --out=<file> [--skip=<file>]');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const skipTexts = {};
if (skip) {
  const data = JSON.parse(fs.readFileSync(path.resolve(skip), 'utf8'));
  Object.keys(data.sources).forEach((k) => data.sources[k].forEach((s) => {
    skipTexts[s.text.split('\n').slice(1).join('')] = true;
  }));
}
const seen = {};
const entries = [];
['core', 'generator'].forEach((app) => {
  const dir = path.join(ROOT, app, 'tests', 'fixtures');
  fs.readdirSync(dir).filter((n) => n.endsWith('.js')).sort().forEach((name) => {
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    const re = /['"]([.0-9]{81})['"]/g;
    let m;
    while ((m = re.exec(text))) {
      const puzzle = m[1];
      if (seen[puzzle]) continue;
      seen[puzzle] = true;
      if (skipTexts[puzzle]) continue;
      if (SG.dfs.countSolutions(model, H.parsePuzzle(model, puzzle), 2) !== 1) continue;
      const line = text.slice(0, m.index).split('\n').length;
      const marker = 'fixture-' + name.replace(/\.js$/, '') + '-L' + line;
      const rows = [];
      const shown = puzzle.replace(/0/g, '.');
      for (let r = 0; r < 9; r++) rows.push(shown.slice(r * 9, r * 9 + 9));
      entries.push({ variantId: 'classic9', level: null, seed: marker, text: '#1,Classic Sudoku 9x9,,' + marker + '\n' + rows.join('\n') });
    }
  });
});
console.log('unique fixture puzzles not skipped: ' + entries.length);
const lines = ['{', '  "schema": 1,', '  "sources": {', '    ' + JSON.stringify(id) + ': ['];
entries.forEach((e, i) => lines.push('      ' + JSON.stringify(e) + (i < entries.length - 1 ? ',' : '')));
lines.push('    ]', '  }', '}');
fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
