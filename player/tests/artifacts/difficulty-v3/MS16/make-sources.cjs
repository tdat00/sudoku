'use strict';
// MS16 scratch (GH, from MS15b's make-sources.cjs): the candidate real sources of a help example, from the saved catalogue only
// (no generation, no corpus scan). For the technique ids of --ids, the candidates are the distinct source puzzles of
// player/js/ui/help-examples.js, in this order: the saved examples named by --from (in that order), or every saved example in the
// catalogue's order when --from is absent. Provenance (variantId, level, seed) is read from the header line of the puzzle, as the
// Generator's Export box wrote it. The output is the sources file of tests/tools/make-technique-examples.js:
// {schema:1, sources:{id:[{variantId, level, seed, text}]}}.
// Usage (from player/): node tests/artifacts/difficulty-v3/MS16/make-sources.cjs --ids=sueDeCoq
//   --out=tests/artifacts/difficulty-v3/MS16/sources-saved.json
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : fallback; };
const ids = opt('ids', '').split(',').filter(Boolean);
const from = opt('from', '').split(',').filter(Boolean);
const out = opt('out', null);
if (ids.length === 0 || !out) throw new Error('usage: --ids=<id,id> [--from=<saved id,id>] --out=<file.json>');

const root = path.resolve(__dirname, '..', '..', '..', '..');
const sandbox = { SG: undefined };
sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'ui', 'help-examples.js'), 'utf8'), sandbox);
const catalogue = sandbox.SG.helpExamples;
const order = from.length > 0 ? from : Object.keys(catalogue);
const seen = {};
const list = [];
order.forEach((id) => {
  const e = catalogue[id];
  if (!e) throw new Error('no saved example for ' + id);
  const text = e.source.puzzle;
  if (seen[text]) return;
  seen[text] = true;
  const header = text.split('\n')[0].split(',');
  list.push({ variantId: e.variant, level: header[2] === '' ? null : header[2], seed: header[3], text: text });
});
const sources = {};
ids.forEach((id) => { sources[id] = list; });
const body = '{\r\n  "schema": 1,\r\n  "sources": {\r\n' + ids.map((id) => '    "' + id + '": [\r\n' +
  list.map((item) => '      ' + JSON.stringify(item)).join(',\r\n') + '\r\n    ]').join(',\r\n') + '\r\n  }\r\n}\r\n';
fs.writeFileSync(path.resolve(out), body, 'utf8');
console.log('wrote ' + out + ': ' + ids.length + ' id(s), ' + list.length + ' distinct saved source(s)');
