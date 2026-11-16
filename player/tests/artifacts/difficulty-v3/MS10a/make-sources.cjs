'use strict';
// Scratch (MS10a): player/tests/artifacts/difficulty-v3/MS10a/sources.json, the curated normal-hint sources of remotePairs
// (SA2-Q-S11, RP-01 / S-OD9): the lowest-index qualifying solves (solved, with a remotePairs step) of the complete scan
// docs/difficulty-v3/evidence/MS10a/logs/explore-solves-4242-20000-order116.txt, at most eight, with their original givens.
// The level is null and the header field empty, the seed is the non-numeric `testkit-4242-<index>` (test-kit corpus seed 4242
// and the index of the puzzle in H.randomStatesWithKnownSolution(classic9, rng 4242, ...); no Generator seed or level is invented).
//   node player/tests/artifacts/difficulty-v3/MS10a/make-sources.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const LOG = path.join(ROOT, 'docs', 'difficulty-v3', 'evidence', 'MS10a', 'logs', 'explore-solves-4242-20000-order116.txt');
const picked = [];
fs.readFileSync(LOG, 'utf8').split(/\r?\n/).forEach((line) => {
  const m = /^#(\d+) ([.1-9]{81}) remotePairs steps (\d+) of (\d+);/.exec(line);
  if (m && picked.length < 8) picked.push({ index: Number(m[1]), puzzle: m[2] });
});
if (picked.length === 0) throw new Error('no qualifying solve in the log');
picked.sort((a, b) => a.index - b.index);
const entries = picked.map((p) => {
  const seed = 'testkit-4242-' + p.index;
  const rows = [];
  for (let r = 0; r < 9; r++) rows.push(p.puzzle.slice(r * 9, r * 9 + 9));
  return { variantId: 'classic9', level: null, seed: seed, text: '#1,Classic Sudoku 9x9,,' + seed + '\n' + rows.join('\n') };
});
const lines = entries.map((e) => '      ' + JSON.stringify(e)).join(',\r\n');
fs.writeFileSync(path.join(__dirname, 'sources.json'),
  '{\r\n  "schema": 1,\r\n  "sources": {\r\n    "remotePairs": [\r\n' + lines + '\r\n    ]\r\n  }\r\n}\r\n', 'utf8');
console.log('remotePairs ' + entries.length + ' sources, indices ' + picked.map((p) => p.index).join(','));
