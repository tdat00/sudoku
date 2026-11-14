'use strict';

// MS07b scratch: the manifest hash of the default (Nightmare) manifest with the suite's stand-in digest, from the
// fixture at HEAD (read through git show) and from the working tree, to pin that the Nightmare identity is unchanged.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function digest(text) {
  let out = '';
  for (let round = 0; round < 8; round++) {
    let h = (0x811c9dc5 ^ Math.imul(round + 1, 0x9e3779b1)) >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += ('00000000' + h.toString(16)).slice(-8);
  }
  return out;
}

function hashOf(source) {
  const context = { SG: {} };
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync(path.join(repo, 'generator', 'tests', 'fixtures', 'tool-records.js'), 'utf8'), context);
  vm.runInNewContext(source, context);
  const M = context.SG.fixtures.megaContract;
  const out = { nightmare: M.manifestHash(digest) };
  if (M.MANIFESTS) out.hell1 = M.manifestHash(digest, M.MANIFESTS.hell1);
  return out;
}

const repo = path.resolve(__dirname, '..', '..', '..', '..', '..');
const head = execFileSync('git', ['show', 'HEAD:generator/tests/fixtures/mega-contract.js'], { cwd: repo, encoding: 'utf8' });
const work = fs.readFileSync(path.join(repo, 'generator', 'tests', 'fixtures', 'mega-contract.js'), 'utf8');
console.log('HEAD   ', JSON.stringify(hashOf(head)));
console.log('working', JSON.stringify(hashOf(work)));
