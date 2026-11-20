'use strict';
// Scratch (MS07b): a --sources file whose real sources are known unique fixture puzzles of
// core/tests/fixtures/classic.js, in the Export box format ('#1,<variant name>,<level name>,<seed>' and the grid).
// The seed field names the fixture (the importer ignores a seed that is not a number).
// Usage: node make-fixture-sources.js <out.json> <id> <fixture name>[,<fixture name>...] [<level name>]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repo = path.resolve(__dirname, '..', '..', '..', '..', '..');
const sandbox = { SG: {} };
vm.runInNewContext(fs.readFileSync(path.join(repo, 'core', 'tests', 'fixtures', 'classic.js'), 'utf8'), sandbox);
const unique = sandbox.SG.fixtures.classic.unique;
const [out, id, names, levelName = 'Hell 2'] = process.argv.slice(2);
const entries = names.split(',').map((name) => {
  const fx = unique.filter((p) => p.name === name)[0];
  if (!fx) throw new Error('no fixture named ' + name);
  const grid = fx.puzzle.replace(/0/g, '.');
  const rows = [];
  for (let r = 0; r < 9; r++) rows.push(grid.slice(r * 9, r * 9 + 9));
  const text = ['#1,Classic Sudoku 9x9,' + levelName + ',' + name].concat(rows).join('\n');
  return { variantId: 'classic9', level: levelName, seed: name, text };
});
const lines = ['{', '  "schema": 1,', '  "sources": {', '    ' + JSON.stringify(id) + ': ['];
entries.forEach((e, j) => lines.push('      ' + JSON.stringify(e) + (j < entries.length - 1 ? ',' : '')));
lines.push('    ]', '  }', '}');
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
console.log('wrote', out, entries.length, 'sources');
