'use strict';
// Scratch (MS08b fix round): compares one analysis ledger of pass 1 with pass 2 and prints the request, the final
// rows and the exactness fields of each. Usage (from generator/): node tests/artifacts/difficulty-v3/MS08b/compare-g.js G07
const fs = require('fs');
const path = require('path');
const id = process.argv[2] || 'G07';
const base = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'difficulty-v3', 'evidence', 'MS08b');
function load(dir) {
  const j = JSON.parse(fs.readFileSync(path.join(base, dir, 'analysis', id + '.json'), 'utf8'));
  return j.records[0];
}
const a = load('pass-1');
const b = load('.');
function show(label, r) {
  const rec = r.value || r;
  console.log(label + ' keys: ' + Object.keys(r).join(','));
  console.log(label + ' value keys: ' + Object.keys(rec).join(','));
  ['request', 'result', 'summary', 'meta'].forEach((k) => {
    if (rec[k] !== undefined) console.log(label + ' ' + k + ': ' + JSON.stringify(rec[k]).slice(0, 700));
  });
  if (rec.rows) console.log(label + ' rows: ' + rec.rows.map((x) => JSON.stringify(x)).join('\n    ').slice(0, 2600));
}
show('PASS1', a);
show('PASS2', b);
