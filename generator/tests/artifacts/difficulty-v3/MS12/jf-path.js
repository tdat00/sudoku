'use strict';
// Scratch (MS12): the technique sequence of a complete logical solve (registered ladder, assumeUniqueness true) of the puzzle of
// a sources file entry, once with the tree's chain engine and once with the base commit's (MS12_BASE_CHAIN=git:5d49130), to show
// where the path of the old jellyfish help example (Nightmare 828) diverged. Prints the first step that differs and the index
// of the first jellyfish step in each.
//   node tests/artifacts/difficulty-v3/MS12/jf-path.js <sources file> <seed>
const fs = require('fs');
const SG = require('./load.js');
const H = SG.techHelper;
const model = H.model('classic9');
const file = process.argv[2];
const seed = process.argv[3];
const sources = JSON.parse(fs.readFileSync(file, 'utf8')).sources;
let entry = null;
Object.keys(sources).forEach((id) => sources[id].forEach((s) => { if (String(s.seed) === String(seed) && !entry) entry = s; }));
if (!entry) throw new Error('no source with seed ' + seed);
const rows = entry.text.split('\n').slice(1).join('');
const givens = H.parsePuzzle(model, rows);
const report = SG.logicalSolver.solve(model, givens, { allowedTechniques: null, assumeUniqueness: true });
const names = report.steps.map((s) => s.technique);
console.log((process.env.MS12_BASE_CHAIN ? 'base ' + process.env.MS12_BASE_CHAIN : 'tree') + ': ' + entry.variantId + ' ' + entry.level + ' ' +
  entry.seed + ', steps ' + names.length + ', solved ' + report.solved + ', first jellyfish step ' + (names.indexOf('jellyfish') + 1) +
  ', chain steps ' + names.map((n, i) => /xyChain|forcingChain|nishio/.test(n) ? (i + 1) + ':' + n : null).filter(Boolean).join(' '));
console.log(names.join(' '));
