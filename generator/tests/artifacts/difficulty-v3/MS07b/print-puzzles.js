'use strict';
// Scratch (MS07b): prints the puzzles of the long-chain positions of the seed 161 scan as a JavaScript array.
const lines = require('fs').readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter((l) => l.startsWith('{')).map(JSON.parse);
const want = process.argv[3].split(',').map(Number);
want.forEach((i) => {
  const r = lines.find((x) => x.i === i);
  console.log("    '" + r.puzzle + "', // #" + i + ': ' + r.forcingChainLong.len + ' links ' + r.forcingChainLong.kind);
});
