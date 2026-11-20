'use strict';
// Scratch (MS07a): the cost of the new wrappers against the original tech-chain.js on the same corpus.
// 8 rounds, alternating, one child process each (differential.js 2000 states); prints every time and the medians.
const { spawnSync } = require('child_process');
const orig = process.argv[2];
const rounds = Number(process.argv[3] || 8);
const out = { current: [], original: [] };
for (let i = 0; i < rounds; i++) {
  ['current', 'original'].forEach((which) => {
    const env = Object.assign({}, process.env);
    if (which === 'original') env.SG_CHAIN_FILE = orig;
    else delete env.SG_CHAIN_FILE;
    const r = spawnSync(process.execPath, ['tests/artifacts/difficulty-v3/MS07a/differential.js', '2000'],
      { env: env, encoding: 'utf8' });
    const m = /ms (\d+) findMs ([\d.]+) digest ([0-9a-f]{64})/.exec(r.stdout || '');
    if (!m) throw new Error(which + ': no result: ' + (r.stderr || r.stdout));
    out[which].push({ ms: Number(m[2]), total: Number(m[1]), digest: m[3].slice(0, 12) });
  });
}
function median(list) {
  const s = list.map((x) => x.ms).sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}
console.log(JSON.stringify(out));
const digests = new Set(out.current.concat(out.original).map((x) => x.digest));
console.log('digests', Array.from(digests).join(','), 'equal', digests.size === 1);
console.log('median ms current', median(out.current), 'original', median(out.original),
  'ratio', (median(out.current) / median(out.original)).toFixed(3));
