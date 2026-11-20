'use strict';
// Scratch (MS13c, from MS12's corpus-materialize.js): materializes the prefix of the seeded test-kit corpus ONCE: classic9, rng
// seed 4242, indices 0 to count-1, where the puzzle of index i is the givens of state #4i of H.randomStatesWithKnownSolution(
// classic9, rng 4242, 4 * count) (dug by SG.testkit.dig, unique by construction), the corpus of the `testkit-4242-<index>`
// help-example sources. The construction work is 4 * count states, built once and kept in --out (a cache of the original givens,
// one 81-character string per index); scan-chunks.cjs reads the cache and never regenerates the prefix.
//   node tests/artifacts/difficulty-v3/MS13c/corpus-materialize.js --count=20000 --out=<file>
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');
const H = SG.techHelper;

const args = process.argv.slice(2);
const opt = (name) => { const a = args.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : null; };
const count = Number(opt('count') || 20000);
const out = opt('out');
if (!out) throw new Error('usage: --count=<n> --out=<file>');
const SEED = 4242;
const model = H.model('classic9');
const t0 = Date.now();
const items = H.randomStatesWithKnownSolution(model, SG.testkit.rng.create(SEED), count * 4);
const seconds = (Date.now() - t0) / 1000;
const puzzles = [];
for (let i = 0; i < count; i++) puzzles.push(H.puzzleString(model, items[i * 4].givens));
console.log('constructed ' + items.length + ' states (' + count + ' puzzles, seed ' + SEED + ') in ' + seconds.toFixed(1) + ' s');
if (puzzles.some((p) => !/^[.1-9]{81}$/.test(p))) throw new Error('a puzzle string is not 81 characters of . and 1-9');
const body = JSON.stringify({ seed: SEED, variant: 'classic9', from: 0, count, constructedStates: items.length, givens: puzzles });
fs.writeFileSync(path.resolve(out), body, 'utf8');
console.log('wrote ' + out + ' (' + body.length + ' bytes), SHA-256 ' + crypto.createHash('sha256').update(body).digest('hex'));
