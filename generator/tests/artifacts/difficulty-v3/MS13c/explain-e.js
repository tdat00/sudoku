'use strict';
// MS13c scratch: a readable account of what changed in the E ledgers against the saved canonical outputs (the fixtures of the
// previous task), for the evidence: the wires (the puzzle, its rating, its technique counts, the dig log), the analyses (the
// counts, the rows whose hardest technique or score changed, the final scores) and the hashes (which keys). Nothing is written to
// the repository; the text goes to stdout (and to --out=<file> with CRLF).
// Usage (from generator/): node tests/artifacts/difficulty-v3/MS13c/explain-e.js --ledgers=<evidence folder> [--out=<file>]
const fs = require('fs');
const path = require('path');
const SG = require('./load.js');

const arg = (name) => { const a = process.argv.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : null; };
const dir = arg('ledgers');
const lines = [];
const out = (s) => { lines.push(s); console.log(s); };
const read = (sub, field) => {
  const map = {};
  fs.readdirSync(path.join(dir, sub)).filter((n) => n.endsWith('.json')).forEach((n) => {
    JSON.parse(fs.readFileSync(path.join(dir, sub, n), 'utf8')).records.forEach((r) => { map[r.key] = r[field]; });
  });
  return map;
};

out('== wires');
const wires = read('wire', 'value');
Object.keys(wires).sort().forEach((id) => {
  const saved = SG.fixtures.replayWire[id];
  const fresh = JSON.parse(JSON.stringify(wires[id]));
  const sameGivens = JSON.stringify(saved.givens) === JSON.stringify(fresh.givens);
  const cnt = (w) => w.rating && w.rating.techniqueCounts ? JSON.stringify(w.rating.techniqueCounts) : 'n/a';
  const givensDiffer = saved.givens.filter((v, i) => v !== fresh.givens[i]).length;
  const clues = (w) => w.givens.filter((v) => v !== 0).length;
  out(id + ': ' + (JSON.stringify(saved) === JSON.stringify(fresh) ? 'unchanged' : (sameGivens ? 'SAME PUZZLE' : 'ANOTHER PUZZLE')) +
    '; givens differ in ' + givensDiffer + ' cells; clues ' + clues(saved) + ' -> ' + clues(fresh) + '; score ' + saved.rating.score +
    ' -> ' + fresh.rating.score + '; level ' + saved.rating.level + ' -> ' + fresh.rating.level + '; hardest ' +
    saved.rating.hardestTechnique + ' -> ' + fresh.rating.hardestTechnique + '; dig log ' + (saved.digLog || []).length + ' -> ' +
    (fresh.digLog || []).length + '; attempts ' + saved.attempts + ' -> ' + fresh.attempts + '; exact ' + saved.exact + ' -> ' + fresh.exact);
  out('   technique counts: ' + cnt(saved) + '  ->  ' + cnt(fresh));
});

out('== analyses');
const goldens = read('analysis', 'value');
Object.keys(goldens).sort().forEach((id) => {
  const saved = SG.fixtures.replayGoldens.filter((g) => g.id === id)[0];
  const fresh = JSON.parse(JSON.stringify(goldens[id]));
  if (JSON.stringify(saved) === JSON.stringify(fresh)) { out(id + ': unchanged'); return; }
  const finalOf = (g) => g.details[g.details.length - 1];
  const changedRows = [];
  const n = Math.max(saved.rows.length, fresh.rows.length);
  for (let i = 0; i < n; i++) {
    const a = saved.rows[i];
    const b = fresh.rows[i];
    if (!a || !b) { changedRows.push('row ' + i + (a ? ' lost' : ' new')); continue; }
    if (a[6] !== b[6]) changedRows.push('row ' + i + ' hardest ' + a[6] + ' -> ' + b[6]);
    else if (a[4] !== b[4]) changedRows.push('row ' + i + ' score ' + a[4] + ' -> ' + b[4]);
  }
  out(id + ': CHANGED ' + saved.request.variantId + ' ' + saved.request.difficulty + ' ' + saved.request.seed + '; counts ' +
    JSON.stringify(saved.counts) + ' -> ' + JSON.stringify(fresh.counts) + '; last detail ' + finalOf(saved) + ' -> ' + finalOf(fresh) +
    '; jumps ' + (saved.jumps || []).length + ' -> ' + (fresh.jumps || []).length + '; compact rows ' + saved.rows.length + ' -> ' + fresh.rows.length);
  out(changedRows.length === 0 ? '   (no compact row differs; the detail rows and the folds do)' : '   ' + changedRows.slice(0, 12).join('; ') + (changedRows.length > 12 ? '; ... ' + changedRows.length + ' rows in all' : ''));
});

out('== hashes');
const hashes = read('hashes', 'hash');
const byCell = {};
Object.keys(hashes).sort().forEach((key) => {
  const [cell, seed] = key.split('#');
  const i = SG.fixtures.perfTools.SEEDS.indexOf(Number(seed));
  const old = SG.fixtures.regression.hashes[cell][i];
  byCell[cell] = byCell[cell] || { total: 0, changed: [] };
  byCell[cell].total++;
  if (old !== hashes[key]) byCell[cell].changed.push(seed);
});
Object.keys(byCell).sort().forEach((cell) => {
  if (byCell[cell].changed.length > 0) out(cell + ': ' + byCell[cell].changed.length + ' of ' + byCell[cell].total + ' changed (seeds ' + byCell[cell].changed.join(', ') + ')');
});
out('cells with no change: ' + Object.keys(byCell).filter((c) => byCell[c].changed.length === 0).length + ' of ' + Object.keys(byCell).length +
  '; keys changed ' + Object.keys(byCell).reduce((n, c) => n + byCell[c].changed.length, 0) + ' of ' + Object.keys(hashes).length);
if (arg('out')) fs.writeFileSync(path.resolve(arg('out')), lines.join('\r\n') + '\r\n', 'utf8');
