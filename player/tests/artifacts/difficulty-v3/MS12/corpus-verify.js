'use strict';
// Scratch (MS12, JF-01): checks the materialized corpus cache (corpus-4242-0-19999.json, built once by corpus-materialize.js)
// against every `testkit-4242-<index>` puzzle that the sources files of the earlier help-example runs name (all of
// player/tests/artifacts/difficulty-v3/*/*.json, schema 1): they must be identical. No puzzle is constructed here.
//   node tests/artifacts/difficulty-v3/MS12/corpus-verify.js
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cache = JSON.parse(fs.readFileSync(path.join(__dirname, 'corpus-4242-0-19999.json'), 'utf8'));
let compared = 0;
const indices = {};
fs.readdirSync(root).sort().forEach((d) => {
  const dir = path.join(root, d);
  if (!fs.statSync(dir).isDirectory()) return;
  fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f.startsWith('sources')).sort().forEach((f) => {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return; }
    if (!data || !data.sources) return;
    Object.keys(data.sources).forEach((id) => data.sources[id].forEach((s) => {
      const m = /^testkit-4242-(\d+)$/.exec(String(s.seed));
      if (!m || Number(m[1]) >= cache.count) return;
      const rows = s.text.split('\n').slice(1).join('');
      if (rows !== cache.givens[Number(m[1])]) throw new Error(d + '/' + f + ': testkit-4242-' + m[1] + ' differs from the cache');
      compared++;
      indices[m[1]] = true;
    }));
  });
});
console.log('cache: seed ' + cache.seed + ', ' + cache.count + ' puzzles from ' + cache.from + ', ' + cache.constructedStates +
  ' constructed states; compared ' + compared + ' entries of the earlier sources files (' + Object.keys(indices).length +
  ' distinct indices: ' + Object.keys(indices).sort((a, b) => a - b).join(', ') + '): all identical');
