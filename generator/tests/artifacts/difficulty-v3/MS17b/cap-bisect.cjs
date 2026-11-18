'use strict';

/*
 * MS17b scratch (read-only diagnosis of the GD #21 failure; run it locked, about 7 s per commit): for each commit given, loads that
 * commit's engine sources in memory (MS16_BASE=git:<commit>, tests/artifacts/difficulty-v3/MS16/load.js) and runs cap-diagnosis.cjs
 * for classic9 nightmare, seeds 1..12, maxRatings 3, digTries 1, then prints the lines of seeds 6 and 8 and the number of seeds
 * whose third rating is made inside the downward refinement (the manual test needs at least one). "tree" is the working tree.
 *   node tests/artifacts/difficulty-v3/MS17b/cap-bisect.cjs <commit|tree> [<commit|tree> ...]       (from generator/)
 */
const cp = require('child_process');
const path = require('path');

const script = path.join(__dirname, 'cap-diagnosis.cjs');
process.argv.slice(2).forEach((c) => {
  const env = Object.assign({}, process.env);
  if (c === 'tree') delete env.MS16_BASE; else env.MS16_BASE = 'git:' + c;
  const started = Date.now();
  const run = cp.spawnSync(process.execPath, [script, 'nightmare', 'refine'], { env, encoding: 'utf8' });
  const lines = (run.stdout || '').split('\n');
  const pick = (re) => (lines.filter((l) => re.test(l))[0] || '(no line) ' + (run.stderr || '').slice(0, 120));
  console.log('== ' + c + '  (' + ((Date.now() - started) / 1000).toFixed(1) + ' s, exit ' + run.status + ')');
  console.log('   ' + pick(/^seed  6:/));
  console.log('   ' + pick(/^seed  8:/));
  console.log('   ' + pick(/^seeds 1\.\.12/));
});
