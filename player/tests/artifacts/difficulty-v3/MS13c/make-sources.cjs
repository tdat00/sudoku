'use strict';
// MS13c scratch (GH, IR72 H1): the candidate sources of the help examples that no longer come from their own source. The
// candidates, in this order, for every ID given by --ids: (1) every other real source of the catalogue (the distinct puzzles of
// player/js/ui/help-examples.js, in the catalogue's order), (2) optionally the test-kit corpus of classic9 (rng seed 4242, the
// puzzle of index i is the givens of state #4i of H.randomStatesWithKnownSolution; provenance
// {"variantId":"classic9","level":null,"seed":"testkit-4242-<index>"}), from --testkit-from for --testkit-count indices.
// The output is the sources file of tests/tools/make-technique-examples.js: {schema:1, sources:{id:[{variantId, level, seed,
// text}]}}. Usage (from player/): node tests/artifacts/difficulty-v3/MS13c/make-sources.cjs --ids=jellyfish,xyChain,nishio
//   --out=<file.json> [--testkit-from=0 --testkit-count=64]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : fallback; };
const ids = opt('ids', '').split(',').filter(Boolean);
const out = opt('out', null);
const kitFrom = Number(opt('testkit-from', 0));
const kitCount = Number(opt('testkit-count', 0));
if (ids.length === 0 || !out) throw new Error('usage: --ids=<id,id> --out=<file.json> [--testkit-from=<n> --testkit-count=<n>]');

const root = path.resolve(__dirname, '..', '..', '..', '..');
const sandbox = { SG: undefined };
sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'ui', 'help-examples.js'), 'utf8'), sandbox);
const catalogue = sandbox.SG.helpExamples;
const seen = {};
const real = [];
Object.keys(catalogue).forEach((id) => {
  const e = catalogue[id];
  const text = e.source.puzzle;
  if (seen[text]) return;
  seen[text] = true;
  const header = text.split('\n')[0].split(',');
  real.push({ variantId: e.variant, level: header[2] === '' ? null : header[2], seed: header[3], text: text });
});

const candidates = real.slice();
if (kitCount > 0) {
  const SG = require(path.join(root, '..', 'generator', 'tests', 'artifacts', 'difficulty-v3', 'MS13c', 'load.js'));
  const H = SG.techHelper;
  const model = H.model('classic9');
  const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(4242), (kitFrom + kitCount) * 4);
  for (let i = kitFrom; i < kitFrom + kitCount; i++) {
    const rows = H.puzzleString(model, items[i * 4].givens).match(/.{9}/g).join('\n');
    candidates.push({ variantId: 'classic9', level: null, seed: 'testkit-4242-' + i,
      text: '#1,Classic Sudoku 9x9,,testkit-4242-' + i + '\n' + rows });
  }
}
const sources = {};
ids.forEach((id) => { sources[id] = candidates; });
fs.writeFileSync(path.resolve(out), JSON.stringify({ schema: 1, sources: sources }) + '\r\n', 'utf8');
console.log('wrote ' + out + ': ' + ids.length + ' id(s), ' + real.length + ' catalogue sources' + (kitCount > 0 ? ' and ' + kitCount +
  ' test-kit puzzles from index ' + kitFrom : ''));
