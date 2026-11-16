'use strict';
// Scratch (MS12): the union of every puzzle named by the sources files of the earlier help-example runs of this pack
// (player/tests/artifacts/difficulty-v3/*/*.json, schema 1), one entry per distinct export text, with the header kept as it is
// (variant, level, seed). These are puzzles that were already identified and used as help-example sources, not a new search.
// The entries are written for the one technique id given by --for. Nothing is written but the output file named by --out.
//   node tests/artifacts/difficulty-v3/MS12/union-sources.js --for=jellyfish --out=<file>
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name) => { const a = args.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : null; };
const id = opt('for');
const out = opt('out');
if (!id || !out) throw new Error('usage: --for=<id> --out=<file>');
const root = path.resolve(__dirname, '..');
const seen = {};
const entries = [];
fs.readdirSync(root).sort().forEach((d) => {
  const dir = path.join(root, d);
  if (!fs.statSync(dir).isDirectory() || d === 'MS12') return;
  fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().forEach((f) => {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return; }
    if (!data || !data.sources) return;
    Object.keys(data.sources).forEach((owner) => (data.sources[owner] || []).forEach((s) => {
      if (!s || !s.text || seen[s.text]) return;
      seen[s.text] = true;
      entries.push({ variantId: s.variantId, level: s.level, seed: s.seed, text: s.text });
    }));
  });
});
const catalogueSources = JSON.parse(fs.readFileSync(path.join(__dirname, 'sources-refresh.json'), 'utf8')).sources[id] || [];
const known = {};
catalogueSources.forEach((s) => { known[s.text] = true; });
const fresh = entries.filter((e) => !known[e.text]);
console.log('distinct puzzles of the earlier sources files: ' + entries.length + '; already tried in sources-refresh.json: ' +
  (entries.length - fresh.length) + '; not yet tried: ' + fresh.length);
const lines = ['{', '  "schema": 1,', '  "sources": {', '    ' + JSON.stringify(id) + ': ['];
fresh.forEach((e, i) => lines.push('      ' + JSON.stringify(e) + (i < fresh.length - 1 ? ',' : '')));
lines.push('    ]', '  }', '}');
fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
