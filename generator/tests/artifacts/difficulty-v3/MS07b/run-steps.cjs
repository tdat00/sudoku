'use strict';

/*
 * MS07b scratch: runs a short list of merge/check commands one after the other (each a child of this locked process,
 * none of them generating), writing each transcript with CRLF line ends as tee-run.cjs does, and continuing after an
 * exit code of 1 (the check before a write is expected to report differences).
 *
 *   Invoke-Dv3Node -Task '...' -NodeArgs @('tests\artifacts\difficulty-v3\MS07b\run-steps.cjs', '<steps.json>')
 *
 * steps.json: [ { "out": "<transcript file>", "args": [ "<script>", "<args>..." ] }, ... ]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const steps = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'));
let worst = 0;
steps.forEach((step) => {
  const started = Date.now();
  const r = spawnSync(process.execPath, step.args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  const code = r.status === null ? 1 : r.status;
  const body = ((r.stdout || '') + (r.stderr || '')).replace(/\r?\n/g, '\n').replace(/[ \t]+$/gm, '');
  const seconds = ((Date.now() - started) / 1000).toFixed(3);
  const text = '$ node ' + step.args.join(' ') + '\n' + body + (body.endsWith('\n') || body === '' ? '' : '\n') +
    'exit=' + code + ' seconds=' + seconds + '\n';
  fs.mkdirSync(path.dirname(path.resolve(step.out)), { recursive: true });
  fs.writeFileSync(path.resolve(step.out), text.replace(/\n/g, '\r\n'), 'utf8');
  process.stdout.write('exit=' + code + ' ' + seconds + ' s  ' + step.out + '\n');
  if (code > worst) worst = code;
});
process.exit(worst);
