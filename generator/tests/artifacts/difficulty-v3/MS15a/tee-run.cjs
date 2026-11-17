'use strict';

/*
 * MS15a scratch (copied from MS14b's tee-run.cjs): the lock wrapper starts `node` with the console of the host, so
 * a pipeline cannot capture what a command prints. This runs the real command as a child of the locked process,
 * copies its output (stdout and stderr, in order of arrival) to the console and, when the child ends, writes it
 * to a file with CRLF line ends, and exits with the child's code. It also writes the first line `$ node <args>`
 * and the last line `exit=<code> seconds=<n>`.
 *
 *   Invoke-Dv3Node -Task '...' -NodeArgs @('tests\artifacts\difficulty-v3\MS15a\tee-run.cjs', '<out file>',
 *     '<node argument>', '<node argument>'...)
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const [out, ...args] = process.argv.slice(2);
if (!out || args.length === 0) {
  console.error('usage: tee-run.cjs <out file> <node argument> [more node arguments...]');
  process.exit(2);
}
const chunks = [];
const started = Date.now();
const child = spawn(process.execPath, args, { stdio: ['inherit', 'pipe', 'pipe'] });
const copy = (target) => (chunk) => {
  chunks.push(chunk);
  if (!process.env.TEE_QUIET) target.write(chunk);
};
child.stdout.on('data', copy(process.stdout));
child.stderr.on('data', copy(process.stderr));
child.on('close', (code) => {
  const seconds = ((Date.now() - started) / 1000).toFixed(3);
  const body = Buffer.concat(chunks).toString('utf8').replace(/\r?\n/g, '\n').replace(/[ \t]+$/gm, '');
  const text = '$ node ' + args.join(' ') + '\n' + body + (body.endsWith('\n') || body === '' ? '' : '\n') +
    'exit=' + (code === null ? 1 : code) + ' seconds=' + seconds + '\n';
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), text.replace(/\n/g, '\r\n'), 'utf8');
  process.exit(code === null ? 1 : code);
});
