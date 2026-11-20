'use strict';
// Read-only identities of the accepted MS07a input of tech-chain.js (IR55 item 1).
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (args) => cp.execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const toCrlf = (b) => Buffer.from(b.toString('utf8').replace(/\r?\n/g, '\r\n'), 'utf8');
const rel = 'core/js/engine/tech-chain.js';

const out = [];
for (const rev of ['9dfc9a3', '959aae0']) {
  const blob = git(['show', rev + ':' + rel]);
  out.push({
    what: rev + ' raw blob',
    gitBlob: git(['rev-parse', rev + ':' + rel]).toString().trim(),
    bytes: blob.length,
    crlfInBlob: /\r\n/.test(blob.toString('utf8')),
    sha256: sha(blob),
    sha256CrlfMaterialization: sha(toCrlf(blob))
  });
}
const wt = fs.readFileSync(path.join(root, rel));
out.push({ what: 'working tree file now', bytes: wt.length, sha256: sha(wt) });
console.log(JSON.stringify(out, null, 2));
