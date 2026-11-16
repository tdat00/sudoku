'use strict';
// Scratch (MS12): builds a source map (schema 1) from the saved catalogue: for each requested technique id the candidate real
// sources are the puzzles of the saved examples of the listed owner ids (one entry per distinct puzzle text, the header of its
// export text kept as it is: level and seed). Nothing is written but the output file named by --out.
//   node tests/artifacts/difficulty-v3/MS12/extract-sources.js --for=nakedTriple,jellyfish --from=all|id,id --out=<file>
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const opt = (name) => { const a = args.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : null; };
const forIds = (opt('for') || '').split(',').filter(Boolean);
const from = opt('from') || 'all';
const out = opt('out');
const file = path.resolve(__dirname, '..', '..', '..', '..', 'js', 'ui', 'help-examples.js');
const sandbox = { SG: {}, self: undefined, globalThis: undefined };
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
const catalogue = sandbox.SG.helpExamples && sandbox.SG.helpExamples.byId ? sandbox.SG.helpExamples.byId : sandbox.SG.helpExamples;
const owners = from === 'all' ? Object.keys(catalogue) : from.split(',');
const seen = {};
const entries = [];
owners.forEach((id) => {
  const ex = catalogue[id];
  if (!ex || !ex.source) return;
  if (seen[ex.source.puzzle]) return;
  seen[ex.source.puzzle] = true;
  const header = ex.source.puzzle.split('\n')[0].split(',');
  entries.push({ variantId: ex.variant, level: header[2] === '' ? null : header[2], seed: header[3], text: ex.source.puzzle, owner: id });
});
const sources = {};
forIds.forEach((id) => { sources[id] = entries.map((e) => ({ variantId: e.variantId, level: e.level, seed: e.seed, text: e.text })); });
console.log('distinct source puzzles: ' + entries.length + ' (owners: ' + entries.map((e) => e.owner).join(', ') + ')');
if (out) {
  const lines = ['{', '  "schema": 1,', '  "sources": {'];
  const keys = Object.keys(sources);
  keys.forEach((k, ki) => {
    lines.push('    ' + JSON.stringify(k) + ': [');
    sources[k].forEach((e, i) => lines.push('      ' + JSON.stringify(e) + (i < sources[k].length - 1 ? ',' : '')));
    lines.push('    ]' + (ki < keys.length - 1 ? ',' : ''));
  });
  lines.push('  }', '}');
  fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
}
