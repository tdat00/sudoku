'use strict';
// Scratch (MS11b): the totals of work-census.json for the documents (calls, second passes, first Findings by subtype, the
// largest work per population and the classic9 latency) and the work of one unit of 7 other cells (the structural unit).
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'difficulty-v3', 'evidence', 'MS11b', 'work-census.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const rows = data.populations || data.rows || data;
let calls = 0;
let second = 0;
let capped = 0;
const found = { type1: 0, type2: 0, type3: 0, type4: 0, hidden: 0 };
const hiddenTotals = { calls: 0, capped: 0, largest: 0 };
const largest = [];
rows.forEach((r) => {
  calls += r.calls;
  second += r.secondPass;
  capped += r.capped;
  Object.keys(r.found).forEach((k) => { found[k] += r.found[k]; });
  if (r.hiddenPass) {
    hiddenTotals.calls += r.hiddenPass.calls;
    hiddenTotals.capped += r.hiddenPass.capped;
    hiddenTotals.largest = Math.max(hiddenTotals.largest, r.hiddenPass.largestWork);
  }
  largest.push(r.population + ': ' + r.largestWork + ' (mean ' + r.meanWork + ', latency mean ' + r.latencyMs.mean + ' ms, p95 ' + r.latencyMs.p95 + ')' +
    (r.hiddenPass ? '; hidden pass ' + r.hiddenPass.calls + ' runs, largest ' + r.hiddenPass.largestWork + ', mean ' + r.hiddenPass.meanWork : ''));
});
console.log('calls ' + calls + ', second pass ' + second + ', capped ' + capped + ', first Findings ' + JSON.stringify(found));
console.log('hidden pass: ' + hiddenTotals.calls + ' runs, capped ' + hiddenTotals.capped + ', largest work ' + hiddenTotals.largest);
largest.forEach((l) => console.log('  ' + l));
function tests(m, k, depth, from) {
  let t = 0;
  for (let i = from; i <= m - (k - depth); i++) {
    t++;
    if (depth < k - 1) t += tests(m, k, depth + 1, i + 1);
  }
  return t;
}
const W = (m, digits) => { let t = 0; for (let k = 1; k <= Math.min(m, digits - 1); k++) t += tests(m, k, 0, 0); return t; };
console.log('unit of 7 other cells on 9 digits: ' + W(7, 9) + '; 10 other cells on 12 digits: ' + W(10, 12) + '; 14 on 16: ' + W(14, 16) + '; 4 on 6: ' + W(4, 6) + '; 2 on 4: ' + W(2, 4));
