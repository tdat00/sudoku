'use strict';
// Scratch (MS07b): the real sources of the saved examples of forcingChain and nishio, as a --sources file for the
// two new ids (to try the existing real help sources first, before any discovery).
// Usage: node make-existing-sources.js <out.json>
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repo = path.resolve(__dirname, '..', '..', '..', '..', '..');
const sandbox = { SG: {} };
vm.runInNewContext(fs.readFileSync(path.join(repo, 'player', 'js', 'ui', 'help-examples.js'), 'utf8'), sandbox);
const examples = sandbox.SG.helpExamples;
function entry(id) {
  const ex = examples[id];
  const text = ex.source.puzzle;
  const header = /^#\d+,([^,]+),([^,]+),([^\n]*)/.exec(text);
  return { variantId: ex.variant, level: header ? header[2] : null, seed: header ? header[3].trim() : null, text };
}
const sources = {};
const pairs = process.argv.slice(3).length > 0 ? process.argv.slice(3) : ['forcingChainLong=forcingChain,nishio',
  'nishioDeep=forcingChain,nishio'];
pairs.forEach((pair) => {
  const [id, from] = pair.split('=');
  sources[id] = from.split(',').map(entry);
});
const out = path.resolve(process.argv[2]);
fs.mkdirSync(path.dirname(out), { recursive: true });
const lines = ['{', '  "schema": 1,', '  "sources": {'];
Object.keys(sources).forEach((id, i, ids) => {
  lines.push('    ' + JSON.stringify(id) + ': [');
  sources[id].forEach((e, j) => lines.push('      ' + JSON.stringify(e) + (j < sources[id].length - 1 ? ',' : '')));
  lines.push('    ]' + (i < ids.length - 1 ? ',' : ''));
});
lines.push('  }', '}');
fs.writeFileSync(out, lines.join('\r\n') + '\r\n', 'utf8');
console.log('wrote', out);
