'use strict';

/*
 * MS18d Phase C0 task-owned STAND-IN command of the `standin-ledger` payload (the hook test of payloads.js):
 * it writes a ledger-shaped JSON file and exits 0 only after writing it. Not the recorder, never a
 * measurement.
 *   node fake-writer.js --out=<file.json> --records=<n> [--mode=ok|short|nowrite|exit1]
 *   ok       writes n records, exits 0       short   writes n-1 records, exits 0
 *   nowrite  exits 0 without writing         exit1   writes n records, then exits 1
 */
const fs = require('fs');

const opt = {};
process.argv.slice(2).forEach((a) => {
  const m = /^--([a-z]+)=(.+)$/.exec(a);
  if (m) opt[m[1]] = m[2];
});
const n = Number(opt.records || 3);
const mode = opt.mode || 'ok';
console.log('writing ' + n + ' stand-in records');
if (mode !== 'nowrite') {
  const count = mode === 'short' ? n - 1 : n;
  const records = [];
  for (let i = 0; i < count; i++) records.push({ key: 'stand-in#' + (i + 1), ms: i + 1 });
  fs.writeFileSync(opt.out, JSON.stringify({ records }) + '\r\n');
}
process.exitCode = mode === 'exit1' ? 1 : 0;
