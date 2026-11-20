'use strict';

/*
 * MS17b scratch: the growth of whole-generation cost between two retained hash families, per classic9 level. Reads the `ms` of every
 * record of two hash ledgers folders (file-only, no generation): the cost of the same seeds 1..N of each cell, summed, and the ratio
 * of the newer to the older one. It is a labelled PLANNING BASIS for the GD projections (an older-source estimate scaled by the
 * observed growth), not a current-source measurement of the GD batches (those use seeds 7000+i and 100 requests).
 *   node generator/tests/artifacts/difficulty-v3/MS17b/hash-growth.cjs <older folder> <newer folder>
 */
const fs = require('fs');
const path = require('path');

function load(folder) {
  const sums = {};
  const maxes = {};
  fs.readdirSync(folder).filter((f) => f.endsWith('.json')).forEach((f) => {
    JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8')).records.forEach((r) => {
      const cell = r.variant + '/' + r.level;
      sums[cell] = (sums[cell] || 0) + r.ms;
      maxes[cell] = Math.max(maxes[cell] || 0, r.ms);
    });
  });
  return { sums, maxes };
}

const older = load(path.resolve(process.argv[2]));
const newer = load(path.resolve(process.argv[3]));
let totalOld = 0;
let totalNew = 0;
const rows = [];
Object.keys(older.sums).sort().forEach((cell) => {
  totalOld += older.sums[cell];
  totalNew += newer.sums[cell] || 0;
  if (/^classic9\//.test(cell)) {
    rows.push(cell.padEnd(20) + String(older.sums[cell]).padStart(9) + ' ms' + String(newer.sums[cell]).padStart(9) + ' ms  x' +
      (newer.sums[cell] / older.sums[cell]).toFixed(2) + '  max ' + older.maxes[cell] + ' -> ' + newer.maxes[cell] + ' ms');
  }
});
rows.forEach((r) => console.log(r));
console.log('all cells'.padEnd(20) + String(totalOld).padStart(9) + ' ms' + String(totalNew).padStart(9) + ' ms  x' +
  (totalNew / totalOld).toFixed(2));
