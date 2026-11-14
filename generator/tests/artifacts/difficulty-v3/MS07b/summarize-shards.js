'use strict';

// MS07b scratch: summarises shard-runs.jsonl (compounds, per group, shards over their own projection) for the
// evidence file. Read-only.
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', '..', '..', '..', '..', 'docs', 'difficulty-v3', 'evidence', 'MS07b', 'shard-runs.jsonl');
const rows = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
console.log('fields', Object.keys(rows[0]).join(','));
const groups = {};
rows.forEach((r) => {
  const g = r.label.split('-').slice(0, 2).join('-');
  (groups[g] = groups[g] || []).push(r);
});
Object.keys(groups).forEach((g) => {
  const list = groups[g];
  const total = list.reduce((n, r) => n + r.nodeSeconds, 0);
  const over = list.filter((r) => r.withinProjection === false);
  console.log(g + ': ' + list.length + ' shards, node ' + total.toFixed(1) + ' s, max ' +
    Math.max.apply(null, list.map((r) => r.nodeSeconds)).toFixed(1) + ' s, over their projection: ' + over.length +
    (over.length ? ' (' + over.map((r) => r.label + ' ' + r.nodeSeconds + '>' + r.projectionSeconds).join('; ') + ')' : '') +
    ', exits ' + JSON.stringify(list.reduce((m, r) => { m[r.exit] = (m[r.exit] || 0) + 1; return m; }, {})));
});
const slow = rows.slice().sort((a, b) => b.nodeSeconds - a.nodeSeconds).slice(0, 5);
console.log('slowest: ' + slow.map((r) => r.label + ' ' + r.nodeSeconds + ' s').join('; '));
