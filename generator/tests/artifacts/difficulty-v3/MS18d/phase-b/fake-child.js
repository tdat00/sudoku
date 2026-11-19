'use strict';

/*
 * MS18d Phase B task-owned STAND-IN for the verification of the incremental transcript wrapper: a short-lived
 * fake command, never a generator and never a measurement. `node fake-child.js <mode> [code]`:
 *   ok       prints `line one`, holds FAKE_HOLD ms (default 1200), prints `line two`, exits 0
 *   fail     prints a line on stdout and one on stderr and exits with <code> (default 3)
 *   chunks   prints 200 numbered lines at once
 *   ws       prints text whose lines end in spaces, a last line without a line end, and CRLF line ends
 *   split    writes the two bytes of one UTF-8 letter in two separate writes
 *   hang     prints a line and then waits for 60 s (it is stopped by whoever owns it)
 *   grand    starts a grandchild that hangs, prints a line, then hangs itself
 * With FAKE_PIDFILE set it appends `<role> <pid>` lines (role: FAKE_ROLE, default `child`) so that the owner
 * of the stand-in can verify that it, and its grandchild, are gone afterwards.
 */
const fs = require('fs');
const { spawn } = require('child_process');

const mode = process.argv[2];
const role = process.env.FAKE_ROLE || 'child';
if (process.env.FAKE_PIDFILE) fs.appendFileSync(process.env.FAKE_PIDFILE, role + ' ' + process.pid + '\n');
const hold = Number(process.env.FAKE_HOLD || 1200);

function hang() {
  setInterval(() => {}, 1000);
  setTimeout(() => process.exit(0), 60000);
}

if (mode === 'ok') {
  console.log('line one');
  setTimeout(() => {
    console.log('line two');
    process.exit(0);
  }, hold);
} else if (mode === 'fail') {
  console.log('before the failure');
  console.error('an error line');
  setTimeout(() => process.exit(Number(process.argv[3] || 3)), 50);
} else if (mode === 'chunks') {
  let text = '';
  for (let i = 1; i <= 200; i++) text += 'line ' + i + '\n';
  process.stdout.write(text);
  setTimeout(() => process.exit(0), 50);
} else if (mode === 'ws') {
  process.stdout.write('a  \nb \t \r\nc\r\n');
  setTimeout(() => {
    process.stdout.write('last line without a line end   ');
    setTimeout(() => process.exit(0), 50);
  }, 100);
} else if (mode === 'split') {
  const bytes = Buffer.from('\u00e9', 'utf8');
  process.stdout.write(bytes.slice(0, 1));
  setTimeout(() => {
    process.stdout.write(bytes.slice(1));
    process.stdout.write('\n');
    setTimeout(() => process.exit(0), 50);
  }, 150);
} else if (mode === 'hang') {
  console.log('line before the hang');
  hang();
} else if (mode === 'grand') {
  const grandchild = spawn(process.execPath, [__filename, 'hang'], {
    stdio: 'ignore', env: Object.assign({}, process.env, { FAKE_ROLE: 'grandchild' })
  });
  grandchild.unref();
  console.log('line before the hang, grandchild started');
  hang();
} else {
  console.error('unknown mode ' + mode);
  process.exit(9);
}
