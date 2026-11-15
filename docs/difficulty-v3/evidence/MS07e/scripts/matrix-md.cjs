#!/usr/bin/env node
'use strict';

/*
 * MS07e compact matrix (reads only): gq-summary.json as one row per variant and one column per level, written to gq-matrix.md.
 * A cell reads `hits/n verdict p95`; verdict o = offered, h = hidden (the stop reason in a footnote letter), - = not executed.
 */
const fs = require('fs');
const path = require('path');

const EVIDENCE = 'Q:\\git\\sudoku\\docs\\difficulty-v3\\evidence\\MS07e';
const summary = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'gq-summary.json'), 'utf8'));
const LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1', 'hell2'];
const VARIANTS = ['classic4', 'classic6', 'classic9', 'mega12', 'mega16', 'diagonalX', 'hyper', 'jigsaw9', 'killer', 'greaterThan',
  'samurai', 'sohei', 'butterfly', 'flower', 'wordoku'];
const fmt = (ms) => (ms >= 10000 ? (ms / 1000).toFixed(0) + 's' : ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms.toFixed(0) + 'ms');
const lines = ['| variant | ' + LEVELS.join(' | ') + ' |', '|---|' + LEVELS.map(() => '---').join('|') + '|'];
VARIANTS.forEach((v) => {
  const cells = LEVELS.map((l) => {
    const r = summary.rows.find((x) => x.variant === v && x.level === l);
    if (r.status !== 'executed') return 'not run';
    const stop = r.stopped === 'misses' ? 'm' : r.stopped === 'time' ? 't' : '';
    const tag = r.verdict === 'offered' ? 'o' : (r.stopped ? 'h' + stop : (r.p95 > r.budget ? 'h*' : 'h'));
    return r.hits + '/' + r.n + ' ' + tag + ' ' + fmt(r.p95);
  });
  lines.push('| ' + v + ' | ' + cells.join(' | ') + ' |');
});
lines.push('');
lines.push('o offered; hm hidden, stopped at the 11th miss; ht hidden, stopped at the 6th request over the budget; h* hidden by the p95 with all ' +
  'requests run; not run = no cell record (projection above 450 s).');
fs.writeFileSync(path.join(EVIDENCE, 'gq-matrix.md'), lines.join('\r\n') + '\r\n');
console.log(lines.join('\n'));
