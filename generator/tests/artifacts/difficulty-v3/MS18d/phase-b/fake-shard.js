'use strict';

/*
 * MS18d Phase B task-owned STAND-IN for the verification of run-gg.js: a short-lived fake of one `perf.js`
 * hash shard, never a generator and never a measurement. It takes the arguments of the real shard
 * (`--hash-key=variant/level --hash-from=N --hash-count=N --hash-record=<file.json>`) and the mode of
 * `--fake=<mode>` (else FAKE_SHARD, default `ok`):
 *   ok         writes a complete ledger of the shard (atomically: .partial, then rename), exits 0
 *   fail       prints an error line and exits 1 (the MISS-or-crash exit of the real tool), no ledger
 *   partial    exits 0 after a ledger of one record fewer than asked (an incomplete ledger)
 *   badsource  a complete ledger with another sourceHash, exits 0
 *   nofile     exits 0 and writes no ledger
 *   hang       prints a line and waits for 60 s (it is stopped by whoever owns it), no ledger
 * FAKE_SOURCE_HASH sets the sourceHash of the ledger, FAKE_HOLD_MS (default 30) the time it takes to exit.
 * With FAKE_PIDFILE set it appends `shard <pid>`.
 */
const fs = require('fs');
const path = require('path');

const argvMode = process.argv.slice(2).map((a) => /^--fake=(.+)$/.exec(a)).filter(Boolean)[0];
const mode = argvMode ? argvMode[1] : (process.env.FAKE_SHARD || 'ok');
if (process.env.FAKE_PIDFILE) fs.appendFileSync(process.env.FAKE_PIDFILE, 'shard ' + process.pid + '\n');

const opts = {};
process.argv.slice(2).forEach((arg) => {
  const m = /^--hash-(key|from|count|record)=(.+)$/.exec(arg);
  if (m) opts[m[1]] = m[2];
});
const [variant, level] = String(opts.key).split('/');
const from = Number(opts.from);
const count = Number(opts.count);
const source = process.env.FAKE_SOURCE_HASH || 'f'.repeat(64);

function ledger(records) {
  return JSON.stringify({
    schema: 1, kind: 'regression-hashes', sourceHash: mode === 'badsource' ? '0'.repeat(64) : source,
    argv: process.argv.slice(2), records
  }, null, 2).replace(/\n/g, '\r\n') + '\r\n';
}

function write(records) {
  const file = path.resolve(opts.record);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.partial', ledger(records), 'utf8');
  fs.renameSync(file + '.partial', file);
}

const records = [];
for (let i = 0; i < count; i++) {
  const seed = from + i + 1;
  records.push({ key: variant + '/' + level + '#' + seed, variant, level, seed,
    hash: String(seed).padStart(16, '0'), ms: 1, overrides: [] });
}

console.log(variant + '/' + level + ': seeds ' + records.map((r) => r.seed).join(', '));
if (mode === 'fail') {
  console.error('stand-in failure');
  setTimeout(() => process.exit(1), 30);
} else if (mode === 'hang') {
  setInterval(() => {}, 1000);
  setTimeout(() => process.exit(0), 60000);
} else {
  if (mode === 'partial') write(records.slice(0, -1));
  else if (mode !== 'nofile') write(records);
  console.log('recorded ' + records.length + ' stand-in keys');
  setTimeout(() => process.exit(0), Number(process.env.FAKE_HOLD_MS || 30));
}
