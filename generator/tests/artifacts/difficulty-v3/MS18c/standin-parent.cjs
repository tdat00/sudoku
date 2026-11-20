'use strict';

/*
 * MS18c Stage 3 STAND-IN for the qualifier's process tree (never a payload): a Node parent that forks N Node
 * children, like qualify.js forks its workers, so the Job Object, nesting, T expiry and
 * supervisor-loss proofs run
 * the same shape of tree without any generation. The children only wait; the parent exits 0 when
 * they all have.
 *   node standin-parent.cjs parent <runSeconds> <children> <members.json> [ignored trailing arguments]
 */
const fs = require('fs');
const childProcess = require('child_process');

const [mode, runSeconds, count, membersFile] = process.argv.slice(2);

if (mode === 'child') {
  const timer = setTimeout(() => process.exit(0), Number(runSeconds) * 1000);
  process.on('message', () => { /* keeps the IPC channel, and so the child, alive until the timer */ });
  process.send({ pid: process.pid });
  void timer;
} else if (mode === 'parent') {
  const n = Number(count);
  const children = [];
  let reported = 0;
  let exited = 0;
  const finish = () => {
    fs.writeFileSync(membersFile, JSON.stringify({ parent: process.pid, children: children.map((c) => c.pid),
      at: new Date().toISOString() }) + '\r\n');
  };
  for (let i = 0; i < n; i++) {
    const child = childProcess.fork(__filename, ['child', runSeconds], { silent: true });
    children.push(child);
    child.on('message', () => { if (++reported === n) finish(); });
    child.on('exit', () => { if (++exited === n) process.exit(0); });
  }
} else {
  process.stderr.write('usage: standin-parent.cjs parent <runSeconds> <children> <members.json>\n');
  process.exit(2);
}
