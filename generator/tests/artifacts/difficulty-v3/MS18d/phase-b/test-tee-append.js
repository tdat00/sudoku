'use strict';

/*
 * MS18d Phase B task-owned tests of the incremental transcript wrapper (append-writer.js, tee-append.js)
 * on short-lived STAND-INS (fake-child.js): never a generator, never a measurement. They show that the
 * bytes of a command are in the transcript while it still runs and stay after it was killed, that every
 * way of ending has its own final line (and that a cut-off transcript has none), that the real exit code
 * is returned, and that the stand-ins they start are gone afterwards. Run it through the lock wrapper:
 *   node generator/tests/artifacts/difficulty-v3/MS18d/phase-b/test-tee-append.js
 */
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { createAppender } = require('./append-writer.js');

const TEE = path.join(__dirname, 'tee-append.js');
const FAKE = path.join(__dirname, 'fake-child.js');
const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
};

async function until(test, what, limitMs) {
  const end = Date.now() + (limitMs || 8000);
  for (;;) {
    const value = test();
    if (value) return value;
    if (Date.now() > end) throw new Error('timed out waiting for ' + what);
    await sleep(30);
  }
}

/** Starts the tee on a stand-in; `done` resolves with the exit of the tee when it ends. */
function startTee(out, args, env) {
  const proc = spawn(process.execPath, [TEE, out].concat(args), {
    stdio: ['ignore', 'pipe', 'pipe'], env: Object.assign({}, process.env, { TEE_QUIET: '1' }, env || {})
  });
  const run = { proc, closed: false, stdout: '', stderr: '' };
  proc.stdout.on('data', (d) => { run.stdout += d; });
  proc.stderr.on('data', (d) => { run.stderr += d; });
  run.done = new Promise((resolve) => proc.on('close', (code, signal) => {
    run.closed = true;
    resolve({ code, signal });
  }));
  return run;
}

const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
const lastLine = (file) => readText(file).split('\r\n').filter((l) => l !== '').pop();

let passed = 0;
const failed = [];
const scratch = fs.mkdtempSync(path.join(REPO, '.scratch-ms18d-b-tee-'));
const at = (name) => path.join(scratch, name);
const pidsOf = (file) => readText(file).split('\n').filter((l) => l !== '').map((l) => {
  const [role, pid] = l.split(' ');
  return { role, pid: Number(pid) };
});

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + ': ' + (err && err.stack));
  }
}

async function main() {
  await test('append-writer: CRLF only, trailing blanks dropped, a partial line is kept, create is exclusive',
    async () => {
      const file = at('writer.txt');
      const w = createAppender(file);
      w.write('a  \nb \t \r\nc');
      w.write('d   ');
      assert.strictEqual(readText(file), 'a\r\nb\r\ncd', 'the held blanks are not written yet');
      w.write('\r\n\r\nlast  ');
      w.line('marker');
      w.close();
      w.close();
      assert.strictEqual(readText(file), 'a\r\nb\r\ncd\r\n\r\nlast\r\nmarker\r\n');
      assert.throws(() => createAppender(file), (err) => err.code === 'EEXIST');
      assert.throws(() => w.write('x'), /is closed/);
    });

  await test('a command that runs: its first line is in the file BEFORE it ends, the final line is exit=0',
    async () => {
      const out = at('ok.txt');
      const run = startTee(out, [FAKE, 'ok'], { FAKE_HOLD: '1500' });
      await until(() => /line one/.test(readText(out)), 'the first line');
      assert.strictEqual(run.closed, false, 'the child has not ended yet');
      assert.ok(!/exit=/.test(readText(out)), 'no final line while it runs');
      assert.ok(fs.statSync(out).size > 0);
      const end = await run.done;
      assert.strictEqual(end.code, 0);
      const text = readText(out);
      const shape = /^\$ node .*fake-child\.js ok\r\nline one\r\nline two\r\nexit=0 seconds=\d+\.\d{3}\r\n$/;
      assert.ok(shape.test(text), JSON.stringify(text));
    });

  await test('a nonzero exit is returned as it is, stdout and stderr are both kept, nothing is retried',
    async () => {
      const out = at('fail.txt');
      const end = await startTee(out, [FAKE, 'fail', '7']).done;
      assert.strictEqual(end.code, 7);
      const text = readText(out);
      assert.ok(/before the failure/.test(text) && /an error line/.test(text));
      assert.strictEqual(lastLine(out).replace(/ seconds=.*/, ''), 'exit=7');
    });

  await test('long output, blanks, a missing last line end, CRLF input, a split UTF-8 letter', async () => {
    const chunks = at('chunks.txt');
    assert.strictEqual((await startTee(chunks, [FAKE, 'chunks']).done).code, 0);
    const lines = readText(chunks).split('\r\n');
    assert.strictEqual(lines.filter((l) => /^line \d+$/.test(l)).length, 200);
    assert.ok(lines.indexOf('line 200') > lines.indexOf('line 1'));
    const ws = at('ws.txt');
    assert.strictEqual((await startTee(ws, [FAKE, 'ws']).done).code, 0);
    const wsText = readText(ws);
    assert.ok(/\r\na\r\nb\r\nc\r\nlast line without a line end\r\nexit=0 /.test(wsText),
      JSON.stringify(wsText));
    assert.ok(!/[ \t]\r\n/.test(wsText) && !/(^|[^\r])\n/.test(wsText) && !/\r(?!\n)/.test(wsText));
    const split = at('split.txt');
    assert.strictEqual((await startTee(split, [FAKE, 'split']).done).code, 0);
    assert.ok(/\r\n\u00e9\r\nexit=0 /.test(readText(split)), JSON.stringify(readText(split)));
  });

  await test('the tee is killed mid-output: the bytes written so far stay and there is NO final line',
    async () => {
      const out = at('killed-tee.txt');
      const pids = at('killed-tee-pids.txt');
      const run = startTee(out, [FAKE, 'hang'], { FAKE_PIDFILE: pids });
      await until(() => /line before the hang/.test(readText(out)), 'the first line');
      const before = readText(out);
      run.proc.kill('SIGKILL');
      await run.done;
      const after = readText(out);
      assert.ok(after.startsWith(before) && /line before the hang\r\n$/.test(after), JSON.stringify(after));
      assert.ok(!/(^|\r\n)(exit=|signal=|spawn-error=|tee-interrupted)/.test(after), 'no invented marker');
      const orphan = pidsOf(pids).filter((p) => p.role === 'child')[0];
      assert.ok(orphan, 'the stand-in recorded its pid');
      if (alive(orphan.pid)) process.kill(orphan.pid, 'SIGKILL');
      await until(() => !alive(orphan.pid), 'the stand-in to be gone');
    });

  await test('the owned command is killed while the tee lives: the partial output stays, no success ' +
    'line', async () => {
    const out = at('killed-child.txt');
    const pids = at('killed-child-pids.txt');
    const run = startTee(out, [FAKE, 'hang'], { FAKE_PIDFILE: pids });
    await until(() => /line before the hang/.test(readText(out)), 'the first line');
    const child = (await until(() => pidsOf(pids).filter((p) => p.role === 'child')[0], 'the pid')).pid;
    process.kill(child, 'SIGKILL');
    const end = await run.done;
    assert.notStrictEqual(end.code, 0);
    const text = readText(out);
    assert.ok(/line before the hang\r\n/.test(text));
    assert.ok(/^(exit=[1-9]\d*|signal=\w+) seconds=/.test(lastLine(out)), lastLine(out));
    assert.ok(!/exit=0 /.test(text));
    await until(() => !alive(child), 'the stand-in to be gone');
  });

  await test('a command that cannot be started ends with spawn-error and 127, never with an exit line',
    async () => {
      const out = at('spawn.txt');
      const noNode = path.join(scratch, 'no-such-node.exe');
      const end = await startTee(out, [FAKE, 'ok'], { TEE_EXEC: noNode }).done;
      assert.strictEqual(end.code, 127);
      assert.ok(/^spawn-error=.* seconds=\d/.test(lastLine(out)), lastLine(out));
      assert.ok(!/(^|\r\n)exit=/.test(readText(out)));
    });

  await test('usage errors and an existing transcript give code 2 and change nothing', async () => {
    const none = await startTee(at('never.txt'), []).done;
    assert.strictEqual(none.code, 2);
    assert.strictEqual(fs.existsSync(at('never.txt')), false);
    const out = at('exists.txt');
    fs.writeFileSync(out, 'earlier evidence\r\n', 'utf8');
    const before = sha(out);
    const second = startTee(out, [FAKE, 'ok'], { FAKE_HOLD: '10' });
    assert.strictEqual((await second.done).code, 2);
    assert.strictEqual(sha(out), before);
    assert.ok(/cannot create the transcript/.test(second.stderr));
  });

  console.log(passed + ' passed, ' + failed.length + ' failed');
  if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((err) => {
  console.log('ERROR ' + (err && err.stack));
  process.exitCode = 1;
}).finally(() => {
  fs.rmSync(scratch, { recursive: true, force: true });
});
