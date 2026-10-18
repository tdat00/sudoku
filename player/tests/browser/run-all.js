'use strict';
// Runs every browser script one after the other and prints one line each. Needs Edge (EDGE_PATH) and Node 22+.
// Usage: node tests/browser/run-all.js
const cp = require('child_process');
const path = require('path');

const RUNS = [['fragment.js', 'file'], ['fragment.js', 'http'], ['open.js'], ['play.js'], ['ui.js'], ['visual.js'],
  ['help.js']];
let failed = 0;
RUNS.forEach(function (run) {
  const started = Date.now();
  const result = cp.spawnSync(process.execPath, [path.join(__dirname, run[0])].concat(run.slice(1)),
    { encoding: 'utf8', maxBuffer: 1 << 26 });
  const lines = (result.stdout || '').trim().split('\n');
  const summary = lines.filter(function (line) { return /checks passed|^failed:/.test(line); }).pop() || lines.pop();
  const ok = result.status === 0;
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + run.join(' ').padEnd(20) + ((Date.now() - started) / 1000).toFixed(0).padStart(4) +
    ' s  ' + summary);
  if (!ok) console.log((result.stdout || '') + (result.stderr || ''));
});
process.exitCode = failed > 0 ? 1 : 0;
