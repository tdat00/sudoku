'use strict';
// Scratch (MS07b): combines per-ID --sources maps into one file without touching a puzzle text; an ID given twice
// is an error. Usage: node combine-sources.js <out.json> <in.json> [<in.json> ...]
const fs = require('fs');
const path = require('path');

const [out, ...inputs] = process.argv.slice(2);
const sources = {};
inputs.forEach((file) => {
  const data = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8').replace(/^\uFEFF/, ''));
  if (data.schema !== 1 || typeof data.sources !== 'object') throw new Error(file + ': not a sources file');
  Object.keys(data.sources).forEach((id) => {
    if (Object.prototype.hasOwnProperty.call(sources, id)) throw new Error('duplicate ID ' + id + ' in ' + file);
    sources[id] = data.sources[id];
  });
});
const ids = Object.keys(sources);
const lines = ['{', '  "schema": 1,', '  "sources": {'];
ids.forEach((id, i) => {
  lines.push('    ' + JSON.stringify(id) + ': [');
  sources[id].forEach((e, j) => {
    const plain = { variantId: e.variantId, level: e.level, seed: e.seed, text: e.text };
    lines.push('      ' + JSON.stringify(plain) + (j < sources[id].length - 1 ? ',' : ''));
  });
  lines.push('    ]' + (i < ids.length - 1 ? ',' : ''));
});
lines.push('  }', '}');
fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
console.log('wrote', out, ids.join(', '));
