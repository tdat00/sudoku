'use strict';
// Scratch (MS13a): renders census-all/<id>.json (work-census-all.js) as one markdown file, census-all/table.md, in the order of
// SG.testkit.VARIANT_IDS. Usage (from generator/): node tests/artifacts/difficulty-v3/MS13a/work-census-table.js <census dir>
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) throw new Error('usage: work-census-table.js <census dir>');
const ORDER = ['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX', 'hyper', 'jigsaw9', 'killer',
  'greaterThan', 'samurai', 'sohei', 'butterfly', 'flower', 'wordoku'];
const data = ORDER.map((id) => JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8')));
const f = (n) => (n === null || n === undefined ? '-' : n.toLocaleString('en-US'));
const quant = (q) => (q === null ? '-' : [q.min, q.median, q.p95, q.max].map(f).join(' / '));
const lines = [];

lines.push('# MS13a census of the grouped graph builder on the 15 models of SG.testkit.VARIANT_IDS', '');
lines.push('Default limits 4,096 groups / 50,000 units; "lifted" = no limit (the true work). Work quantiles are min / median / p95 / max.',
  'Populations: **constructed** = the blank state; **synthetic** = states of the test kit (seed 77003, 6 puzzles dug from random',
  'solutions, 24 states: 6 initial, 6 propagated, 12 pruned) and 6 states with many wrong candidates (seed 8001); **ladder** = every',
  'position at which a ladder solve of the 6 propagated states reaches the chain group (xyChain is tried because every earlier',
  'technique found nothing) on those seeded puzzles. Killer and Greater-Than are the uncaged / uninequalitied models of the test kit.', '');

lines.push('## Structural maximum (blank state, constructed)', '');
lines.push('| Model | cells | digits | blank work | x 50,000 | additional groups | nodes | default result | checker work |');
lines.push('|---|---|---|---|---|---|---|---|---|');
data.forEach((d) => {
  const b = d.populations['constructed: blank'];
  lines.push('| ' + [d.id, d.cellCount, d.digits, f(d.notes.blank.work), (d.notes.blank.work / 50000).toFixed(2),
    f(d.notes.blank.groups), f(d.notes.blank.nodes), b.defaultComplete === 1 ? 'complete' : 'capped (' +
      (b.cappedWork ? 'work' : 'nodes') + ')', f(d.notes.blank.expectedWork)].join(' | ') + ' |');
});

lines.push('', '## Ladder positions at the chain group (seeded puzzles)', '');
lines.push('| Model | puzzles reaching the chain group | positions | complete at default | capped (work / nodes) | over 50,000 | default work | lifted work |');
lines.push('|---|---|---|---|---|---|---|---|');
data.forEach((d) => {
  const p = d.populations['ladder: chain-group positions'];
  const n = d.notes.ladder;
  if (p === null) {
    lines.push('| ' + [d.id, n.puzzlesReachingChains + ' of ' + n.puzzles, 0, '-', '-', '-', '-', '-'].join(' | ') + ' |');
    return;
  }
  lines.push('| ' + [d.id, n.puzzlesReachingChains + ' of ' + n.puzzles, f(p.calls), f(p.defaultComplete),
    p.cappedWork + ' / ' + p.cappedNodes, p.over50000, quant(p.defaultWork), quant(p.liftedWork)].join(' | ') + ' |');
});

lines.push('', '## Synthetic states (30 per model: initial, propagated, pruned and many wrong candidates), summary', '');
lines.push('| Model | calls | complete at default | capped (work / nodes) | lifted work median / p95 / max |');
lines.push('|---|---|---|---|---|');
data.forEach((d) => {
  const pops = Object.keys(d.populations).filter((k) => k.startsWith('synthetic')).map((k) => d.populations[k]);
  const sum = (key) => pops.reduce((n, p) => n + p[key], 0);
  const all = [];
  pops.forEach((p) => all.push(p));
  const maxLifted = Math.max.apply(null, pops.map((p) => p.liftedWork.max));
  const medians = pops.map((p) => p.liftedWork.median).sort((a, b) => a - b);
  const p95s = pops.map((p) => p.liftedWork.p95).sort((a, b) => a - b);
  lines.push('| ' + [d.id, sum('calls'), sum('defaultComplete'), sum('cappedWork') + ' / ' + sum('cappedNodes'),
    'population medians ' + f(medians[0]) + ' to ' + f(medians[medians.length - 1]) + '; p95s up to ' + f(p95s[p95s.length - 1]) +
    '; max ' + f(maxLifted)].join(' | ') + ' |');
});

lines.push('', '## Synthetic states by kind and constructed blank', '');
lines.push('| Model | population | calls | complete at default | capped (work / nodes) | over 50,000 | default work | lifted work | mean ms lifted |');
lines.push('|---|---|---|---|---|---|---|---|---|');
data.forEach((d) => {
  Object.keys(d.populations).filter((k) => !k.startsWith('ladder')).forEach((k) => {
    const p = d.populations[k];
    lines.push('| ' + [d.id, k, f(p.calls), f(p.defaultComplete), p.cappedWork + ' / ' + p.cappedNodes, p.over50000,
      quant(p.defaultWork), quant(p.liftedWork), p.liftedMeanMs].join(' | ') + ' |');
  });
});
const text = lines.join('\r\n') + '\r\n';
fs.writeFileSync(path.join(dir, 'table.md'), text, 'utf8');
console.log(text);
