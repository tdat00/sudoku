'use strict';

/*
 * MS06c2 scratch: the lock wrapper starts `node` with the console of the host, so a pipeline cannot capture what a
 * suite prints. This runs the real command as a child of the locked process, writes its output (stdout and stderr, in
 * order of arrival) to a file and to the console, and exits with the child's code.
 *
 *   Invoke-Dv3Node -Task '...' -NodeArgs @('tests\artifacts\difficulty-v3\MS06c2\tee-run.cjs', '<out file>', '<script>', '<args>...')
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const [out, ...args] = process.argv.slice(2);
if (!out || args.length === 0) {
  console.error('usage: tee-run.cjs <out file> <script> [args...]');
  process.exit(2);
}
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const stream = fs.createWriteStream(path.resolve(out), { encoding: 'utf8' });
const child = spawn(process.execPath, args, { stdio: ['inherit', 'pipe', 'pipe'] });
const copy = (target) => (chunk) => {
  stream.write(chunk);
  target.write(chunk);
};
child.stdout.on('data', copy(process.stdout));
child.stderr.on('data', copy(process.stderr));
child.on('close', (code) => {
  stream.end(() => process.exit(code === null ? 1 : code));
});
