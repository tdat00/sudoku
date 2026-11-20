'use strict';

/*
 * MS14a scratch (from MS13a's/MS13b's): prints the SHA-256 of the engine bytes that the E recorders depend on (the subset
 * engine that this task changes, the chain engine, the weights, the four locale packs, the UI files of the replay identity,
 * the recorder files) and one tree hash for each of core/js and generator/js, so that a change after the freeze is detected.
 * Usage (from generator/): node tests/artifacts/difficulty-v3/MS14a/freeze-hashes.cjs [label]
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const FILES = [
  'core/js/engine/tech-subset.js', 'core/js/engine/tech-chain.js', 'generator/js/engine/difficulty.js',
  'generator/js/ui/i18n.js', 'generator/js/ui/locale.en.js', 'generator/js/ui/locale.vi.js', 'player/js/ui/i18n.js',
  'player/js/ui/play.js', 'player/js/ui/locale.en.js', 'player/js/ui/locale.vi.js',
  'generator/tests/fixtures/perf-helper.js', 'generator/tests/fixtures/tool-records.js', 'generator/tests/perf.js',
  'generator/tests/replay-fixtures.js', 'generator/tests/replay-goldens.js', 'generator/tests/fixtures/replay-recording.js'
];
const TREES = ['core/js', 'generator/js'];

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  });
  return out;
}

const stamp = new Date();
const pad = (n) => String(n).padStart(2, '0');
const offset = -stamp.getTimezoneOffset();
const iso = stamp.getFullYear() + '-' + pad(stamp.getMonth() + 1) + '-' + pad(stamp.getDate()) + 'T' +
  pad(stamp.getHours()) + ':' + pad(stamp.getMinutes()) + ':' + pad(stamp.getSeconds()) +
  (offset >= 0 ? '+' : '-') + pad(Math.floor(Math.abs(offset) / 60)) + ':' + pad(Math.abs(offset) % 60);
console.log('MS14a source bytes ' + (process.argv[2] || 'frozen before E') + ' (' + iso + '), SHA-256:');
FILES.forEach((rel) => console.log(sha(fs.readFileSync(path.join(REPO, rel))) + '  ' + rel.replace(/\//g, '\\')));
console.log('');
console.log('tree hashes (SHA-256 of the sorted "relative path : file hash" lines):');
TREES.forEach((rel) => {
  const files = walk(path.join(REPO, rel), []).sort();
  const lines = files.map((f) => path.relative(REPO, f).replace(/\\/g, '/') + ' : ' + sha(fs.readFileSync(f)));
  console.log(sha(Buffer.from(lines.join('\n'))) + '  ' + rel.replace(/\//g, '\\') + ' (' + files.length + ' files)');
});
