'use strict';

/*
 * MS17b scratch: per-suite test seconds of retained quick results (file-only, no test runs). Sums `ms` of every test of the named
 * suites over all the result files of a folder, as a planning basis for the projection of a focused gate.
 *   node generator/tests/artifacts/difficulty-v3/MS17b/suite-times.cjs <results folder> <app prefix: generator|player> <suite,suite,...>
 */
const fs = require('fs');
const path = require('path');

const folder = path.resolve(process.argv[2]);
const app = process.argv[3];
const wanted = process.argv[4].split(',');
const sums = {};
const counts = {};
fs.readdirSync(folder).filter((f) => f.indexOf(app + '-') === 0 && f.endsWith('.json')).forEach((f) => {
  const j = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'));
  j.results.tests.forEach((t) => {
    if (wanted.indexOf(t.suite) === -1) return;
    sums[t.suite] = (sums[t.suite] || 0) + t.ms;
    counts[t.suite] = (counts[t.suite] || 0) + 1;
  });
});
let total = 0;
wanted.forEach((s) => {
  total += sums[s] || 0;
  console.log(s.padEnd(22) + String(counts[s] || 0).padStart(6) + ' tests' + ((sums[s] || 0) / 1000).toFixed(1).padStart(9) + ' s');
});
console.log('sum'.padEnd(22) + ''.padStart(12) + (total / 1000).toFixed(1).padStart(9) + ' s');
