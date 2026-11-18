'use strict';

/*
 * MS17b scratch: proves that the write of generator/tests/fixtures/replay-wire.js changed nothing but the five version fields.
 * It takes the file as committed at HEAD, replaces every `"ratingVersion":2` by `"ratingVersion":3`, and compares the result with
 * the working-tree file byte for byte (file-only: git show, no generation). Line endings are normalized to LF on both sides first
 * (the repository stores LF; the working tree is CRLF).
 *   node generator/tests/artifacts/difficulty-v3/MS17b/fixture-version-only.cjs
 */
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const old = cp.execSync('git show HEAD:generator/tests/fixtures/replay-wire.js', { cwd: REPO, maxBuffer: 1e8, encoding: 'utf8' })
  .replace(/\r\n/g, '\n');
const current = fs.readFileSync(path.join(REPO, 'generator', 'tests', 'fixtures', 'replay-wire.js'), 'utf8').replace(/\r\n/g, '\n');
const count = (text, needle) => text.split(needle).length - 1;
const swapped = old.split('"ratingVersion":2').join('"ratingVersion":3');
console.log('HEAD file: "ratingVersion":2 x ' + count(old, '"ratingVersion":2') + ', "ratingVersion":3 x ' + count(old, '"ratingVersion":3'));
console.log('working file: "ratingVersion":2 x ' + count(current, '"ratingVersion":2') + ', "ratingVersion":3 x ' +
  count(current, '"ratingVersion":3'));
console.log('HEAD file with each "ratingVersion":2 replaced by 3 equals the working file byte for byte: ' + (swapped === current));
console.log('lines ' + old.split('\n').length + ' -> ' + current.split('\n').length + ', length ' + old.length + ' -> ' + current.length);
process.exit(swapped === current ? 0 : 1);
