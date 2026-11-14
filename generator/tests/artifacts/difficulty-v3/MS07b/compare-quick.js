'use strict';

// MS07b scratch: attributes the change of the quick-set cost between two result files per test (full name), for the
// evidence. Usage: node compare-quick.js <old.json> <new.json> [top]
const fs = require('fs');

const [oldFile, newFile, topArg] = process.argv.slice(2);
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8')).results;
const a = read(oldFile);
const b = read(newFile);
const index = new Map(a.tests.map((t) => [t.fullName + '#' + t.ordinal, t]));
const rows = [];
b.tests.forEach((t) => {
  const old = index.get(t.fullName + '#' + t.ordinal);
  if (old) rows.push({ name: t.fullName, was: old.ms, now: t.ms, delta: t.ms - old.ms });
});
rows.sort((x, y) => y.delta - x.delta);
const total = rows.reduce((n, r) => n + r.delta, 0);
console.log('tests in both ' + rows.length + ' of ' + b.tests.length + ' (new) / ' + a.tests.length + ' (old); total ms ' +
  a.ms.toFixed(0) + ' -> ' + b.ms.toFixed(0) + '; sum of per-test deltas ' + total.toFixed(0) + ' ms');
rows.slice(0, Number(topArg || 8)).forEach((r) => {
  console.log('  +' + (r.delta / 1000).toFixed(2) + ' s  (' + (r.was / 1000).toFixed(2) + ' -> ' + (r.now / 1000).toFixed(2) + ')  ' +
    r.name.slice(0, 150));
});
