'use strict';

/*
 * MS11c scratch (from MS11b's): prints the SHA-256 of the engine bytes that the E recorders depend on (the wing engine, the
 * weights, the four locale packs) and one tree hash for each of core/js and generator/js, so that a change after the freeze
 * is detected. Usage (from generator/): node tests/artifacts/difficulty-v3/MS11c/freeze-hashes.cjs
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const FILES = [
  'core/js/engine/tech-wing.js', 'generator/js/engine/difficulty.js', 'generator/js/ui/locale.en.js',
  'generator/js/ui/locale.vi.js', 'player/js/ui/locale.en.js', 'player/js/ui/locale.vi.js'
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
console.log('MS11c engine bytes ' + (process.argv[2] || 'frozen before E') + ' (' + iso + '), SHA-256:');
FILES.forEach((rel) => console.log(sha(fs.readFileSync(path.join(REPO, rel))) + '  ' + rel.replace(/\//g, '\\')));
console.log('');
console.log('tree hashes (SHA-256 of the sorted "relative path : file hash" lines):');
TREES.forEach((rel) => {
  const files = walk(path.join(REPO, rel), []).sort();
  const lines = files.map((f) => path.relative(REPO, f).replace(/\\/g, '/') + ' : ' + sha(fs.readFileSync(f)));
  console.log(sha(Buffer.from(lines.join('\n'))) + '  ' + rel.replace(/\//g, '\\') + ' (' + files.length + ' files)');
});
