'use strict';
// MS13c scratch: runs one of the repository's Node tools (tests/perf.js, tests/pattern-cost.js, ...) with the chain engine of the
// accepted base commit (git show 4aa3d11:core/js/engine/tech-chain.js, read into memory; nothing is written) instead of the tree's:
// fs.readFileSync is wrapped for that one path, the tool loads the sources as usual. Used to compare the cost of a cell with the
// accepted base engine. Usage (from generator/): node tests/artifacts/difficulty-v3/MS13c/base-run.cjs <tool script> [tool args]
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const TARGET = path.join(REPO, 'core', 'js', 'engine', 'tech-chain.js');
const BASE = cp.execFileSync('git', ['show', (process.env.MS13C_BASE || '4aa3d11') + ':core/js/engine/tech-chain.js'],
  { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
const original = fs.readFileSync;
fs.readFileSync = function (file, ...rest) {
  if (typeof file === 'string' && path.resolve(file) === TARGET) {
    const wanted = rest[0];
    return typeof wanted === 'string' || (wanted && wanted.encoding) ? BASE : Buffer.from(BASE, 'utf8');
  }
  return original.call(fs, file, ...rest);
};
const script = path.resolve(process.cwd(), process.argv[2]);
process.argv = [process.argv[0], script].concat(process.argv.slice(3));
require(script);
