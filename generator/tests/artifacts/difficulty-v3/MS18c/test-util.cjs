'use strict';

/*
 * MS18c Stage 3 FAKE-DATA tests of the retry helper of util.cjs (the journal and event appends of the
 * launcher and the planner must survive a reader that briefly holds a file): only EBUSY / EPERM / EACCES are
 * retried, a bounded number of times, with a pause between tries; every other error and the last busy one are
 * thrown; appendLine retries a busy append and writes exactly one CRLF line.
 *   node generator/tests/artifacts/difficulty-v3/MS18c/test-util.cjs
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('./util.cjs');

let passed = 0;
const failed = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok   ' + name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ' + name + ': ' + (err && err.stack));
  }
}

const busy = (code) => Object.assign(new Error('busy ' + code), { code: code });

test('only busy-file errors are retried, with a pause, and the first success is returned', () => {
  util.BUSY_CODES.forEach((code) => {
    const pauses = [];
    let calls = 0;
    const result = util.withRetry((attempt) => {
      calls++;
      if (attempt < 3) throw busy(code);
      return 'done-' + attempt;
    }, { tries: 5, delayMs: 7, sleep: (ms) => pauses.push(ms) });
    assert.strictEqual(result, 'done-3', code);
    assert.deepStrictEqual([calls, pauses], [3, [7, 7]], code);
  });
  assert.deepStrictEqual(util.BUSY_CODES, ['EBUSY', 'EPERM', 'EACCES']);
});

test('another error, or the last busy one, is thrown at once, and the tries are bounded', () => {
  let calls = 0;
  assert.throws(() => util.withRetry(() => { calls++; throw busy('ENOENT'); },
    { tries: 5, delayMs: 1, sleep: () => {} }), (err) => err.code === 'ENOENT');
  assert.strictEqual(calls, 1, 'not retried');
  calls = 0;
  assert.throws(() => util.withRetry(() => { calls++; throw busy('EBUSY'); },
    { tries: 4, delayMs: 1, sleep: () => {} }), (err) => err.code === 'EBUSY');
  assert.strictEqual(calls, 4, 'bounded');
  assert.throws(() => util.withRetry(() => { throw new TypeError('x'); }), TypeError);
});

test('appendLine writes one CRLF line without trailing blanks and creates the folder', () => {
  const dir = fs.mkdtempSync(path.join(util.REPO, '.scratch-ms18c-util-'));
  try {
    const file = path.join(dir, 'nested', 'log.jsonl');
    util.appendLine(file, '{"a":1}   ');
    util.appendLine(file, '{"b":2}');
    assert.strictEqual(fs.readFileSync(file, 'utf8'), '{"a":1}\r\n{"b":2}\r\n');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the sleep helper pauses for about the time asked and ignores zero', () => {
  const t0 = Date.now();
  util.sleepMs(60);
  assert.ok(Date.now() - t0 >= 50, 'paused');
  const t1 = Date.now();
  util.sleepMs(0);
  assert.ok(Date.now() - t1 < 40);
});

console.log(passed + ' passed, ' + failed.length + ' failed');
if (failed.length > 0) console.log('FAILED: ' + failed.join(' | '));
process.exitCode = failed.length === 0 ? 0 : 1;
