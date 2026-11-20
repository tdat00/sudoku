'use strict';
// MS13c scratch: runs mutant-file.cjs and survivor-scan.js for the mutations given as arguments, on the corpora of the tests
// (classic9 900 and classic6 800 from seed 5151; jigsaw9, hyper and diagonalX 150 each from seed 77003), in one process tree so
// that one lock turn covers them. Usage: node survivor-all.cjs <mutation index> [...]
const cp = require('child_process');
const path = require('path');
const dir = __dirname;
const scratch = path.join(dir, 'scan');
require('fs').mkdirSync(scratch, { recursive: true });
const CORPORA = [['classic9', '900', '5151'], ['classic6', '800', '5151'], ['jigsaw9', '150', '77003'], ['hyper', '150', '77003'],
  ['diagonalX', '150', '77003'], ['pruned:classic9:0.03:0.3', '3000', '1'], ['pruned:classic9:0.1:0.5', '3000', '2'],
  ['pruned:jigsaw9:0.03:0.3', '1500', '3'], ['pruned:diagonalX:0.03:0.3', '1500', '4'], ['pruned:classic6:0.05:0.5', '2000', '5'],
  ['digit:classic9:8:16:1', '40000', '6'], ['digit:classic9:10:20:2', '30000', '7'], ['digit:jigsaw9:8:16:1', '40000', '8'],
  ['digit:jigsaw9:10:20:2', '30000', '11'], ['sa2', '200000', '12'], ['digit:classic9:12:22:3', '100000', '13']];
const only = process.env.SCAN_ONLY ? process.env.SCAN_ONLY.split(',') : null;
process.argv.slice(2).forEach((index) => {
  const out = path.join(scratch, 'm' + index + '.js');
  console.log(cp.execFileSync(process.execPath, [path.join(dir, 'mutant-file.cjs'), index, out], { encoding: 'utf8' }).trim());
  CORPORA.forEach((c) => {
    if (only !== null && only.indexOf(c[0]) === -1) return;
    console.log('== mutation ' + index + ' on ' + c.join(' '));
    console.log(cp.execFileSync(process.execPath, [path.join(dir, 'survivor-scan.js'), out, c[0], c[1], c[2], '3'],
      { encoding: 'utf8', maxBuffer: 1 << 26 }).trim());
  });
});
