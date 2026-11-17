'use strict';
// MS14b scratch: reads the three mechanism dumps and prints one line per Jigsaw hash key (the readable account for the evidence).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS14b/mechanism-table.js [--out=<file>]
const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'difficulty-v3', 'evidence', 'MS14b');
const read = (n) => JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
const base = read('mechanism-base.json');
const tree = read('mechanism-tree.json');
const baseCross = read('mechanism-base-cross.json');
const lines = [];
const out = (s) => { lines.push(s); console.log(s); };
const f = (p) => (p.solved ? p.level + '/' + p.score + (p.leftovers ? ' L' + p.leftovers : '') + (p.needsTier === false ? ' floor-solved' : '') : 'unsolved');
let changed = 0;
let same = 0;
const stats = { changedOldUsesLeftovers: 0, changedNewUsesLeftovers: 0, changedOldRatedOtherwise: 0, sameRegions: 0, unchangedOldUsesLeftovers: 0, unchangedTotal: 0 };
out('key | clues old->new | old puzzle: base rating -> tree rating | new puzzle: base rating -> tree rating | regions equal');
base.rows.forEach((b, i) => {
  const t = tree.rows[i];
  const crossT = tree.rows[i].otherPuzzle;
  const crossB = baseCross.rows[i].otherPuzzle;
  const differs = b.hash !== t.hash;
  const line = b.key + ' | ' + b.clues + '->' + t.clues + ' | ' + f(b.own) + ' -> ' + f(crossT) + ' | ' + f(crossB) + ' -> ' + f(t.own) +
    ' | ' + (t.sameRegions && baseCross.rows[i].sameRegions ? 'yes' : 'NO');
  if (t.sameRegions && baseCross.rows[i].sameRegions) stats.sameRegions++;
  if (differs) {
    changed++;
    out('CHANGED   ' + line);
    if (crossT.leftovers > 0) stats.changedOldUsesLeftovers++;
    if (t.own.leftovers > 0) stats.changedNewUsesLeftovers++;
    if (crossT.score !== b.own.score || crossT.level !== b.own.level) stats.changedOldRatedOtherwise++;
  } else {
    same++;
    stats.unchangedTotal++;
    if (crossT.leftovers > 0) stats.unchangedOldUsesLeftovers++;
    out('unchanged ' + line);
  }
});
out('changed ' + changed + ', unchanged ' + same + ' of ' + base.rows.length + '; ' + JSON.stringify(stats));
if (process.argv.some((a) => a.startsWith('--out='))) {
  fs.writeFileSync(path.resolve(process.argv.find((a) => a.startsWith('--out=')).slice(6)), lines.join('\r\n') + '\r\n', 'utf8');
}
