'use strict';
// MS16 scratch (GH): the one known source of the ordinary B route that E found. The E recording (evidence section 10) reports one
// changed hash, classic9/nightmare seed 377, and its mechanism run shows that the tree's puzzle of that request uses sueDeCoq once in
// its canonical rating. This script makes exactly that puzzle again (one request, no discovery, no corpus scan) through the
// Generator's own pipeline with the recorder's hidden-level guard and writes it, as the Generator's Export box writes it, into the
// sources file of tests/tools/make-technique-examples.js. It first checks that the puzzle's hash is the one in the E ledger of that key
// (provenance) and refuses to write when it is not. Nothing else is written.
// Usage (from player/): node tests/artifacts/difficulty-v3/MS16/make-source-e.js --ledgers=<hash ledger dir> --out=<file.json>
const fs = require('fs');
const path = require('path');
const SG = require('../../../../../generator/tests/artifacts/difficulty-v3/MS16/load.js');

const args = process.argv.slice(2);
const opt = (name) => { const a = args.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : null; };
const ledgerDir = opt('ledgers');
const out = opt('out');
if (!ledgerDir || !out) throw new Error('usage: --ledgers=<dir> --out=<file.json>');

const KEY = 'classic9/nightmare#377';
const ledger = {};
fs.readdirSync(ledgerDir).filter((n) => n.endsWith('.json')).forEach((n) => {
  (JSON.parse(fs.readFileSync(path.join(ledgerDir, n), 'utf8')).records || []).forEach((r) => { ledger[r.key] = r.hash; });
});
const T = SG.fixtures.perfTools;
SG.i18n.setLocale('en');
const run = SG.fixtures.toolRecords.withRequestedLevel('classic9', 'nightmare', () => SG.pipeline.run(
  { variantId: 'classic9', difficulty: 'nightmare', seed: 377, trace: 'off', variantOptions: {} }, null, SG.budget.create({ ms: 120000 })));
if (T.hash64(T.serialize(run.value)) !== ledger[KEY]) {
  throw new Error('the regenerated puzzle does not have the hash of the E ledger for ' + KEY);
}
const text = SG.exportUi.buildExportText([{ result: run.value }]).trim();
const header = text.split('\n')[0].split(',');
const item = { variantId: 'classic9', level: header[2], seed: header[3], text: text };
const body = '{\r\n  "schema": 1,\r\n  "sources": {\r\n    "sueDeCoq": [\r\n      ' + JSON.stringify(item) + '\r\n    ]\r\n  }\r\n}\r\n';
fs.writeFileSync(path.resolve(out), body, 'utf8');
console.log('regenerated ' + KEY + ' (hash equals the E ledger): ' + header.join(' | ') + '; clues ' +
  text.split('\n').slice(1).join('').replace(/[^1-9]/g, '').length + '; wrote ' + out);
