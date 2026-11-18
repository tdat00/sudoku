'use strict';

/*
 * MS17a scratch (from MS16's freeze-hashes.cjs, names only): prints the SHA-256 of EVERY file whose bytes the three E recorders depend
 * on, taken from the tools' own lists and not from a hand-picked one -- every existing entry of SOURCE_FILES (tests/node-runner.js of
 * the Generator), the four recorder files of replay-fixtures.js (RECORDER_FILES) and the three helper files of perf.js
 * (HASH_CODE_FILES) -- plus the eight source/loader entries of the brief, the history suite and the two HTML suite lists' files, and
 * one tree hash for each of core/js and generator/js. It then recomputes the two source identities the recorders write into a
 * ledger (the replay identity of replay-fixtures.js `nodeEnv().identity(RECORDER_FILES)` and the hash identity of perf.js
 * `hashIdentity`), so that a ledger's sourceHash can be compared with the freeze. A change after the freeze is detected by running
 * it again and comparing the text.
 * Usage (from generator/): node tests/artifacts/difficulty-v3/MS17a/freeze-hashes.cjs [label] [out file]
 * With an out file the text is also written there (UTF-8, CRLF, final newline).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const GEN = path.join(REPO, 'generator');
const RECORDER_FILES = ['tests/fixtures/tool-records.js', 'tests/fixtures/replay-recording.js', 'tests/replay-fixtures.js', 'tests/replay-goldens.js'];
const HASH_CODE_FILES = ['tests/fixtures/perf-helper.js', 'tests/fixtures/tool-records.js', 'tests/perf.js'];
const EIGHT_LISTS = ['generator/index.html', 'generator/tests.html', 'generator/tests/node-runner.js', 'generator/js/worker/gen.worker.js',
  'player/index.html', 'player/help.html', 'player/tests.html', 'player/tests/node-runner.js'];
const TREES = ['core/js', 'generator/js'];

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const SHA = (buf) => sha(buf).toUpperCase();
const read = (rel) => fs.readFileSync(path.join(GEN, rel), 'utf8').replace(/^\uFEFF/, '');

const runner = read('tests/node-runner.js');
const sources = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(runner)[1].match(/'[^']+'/g)).map((s) => s.slice(1, -1));
const existing = sources.filter((rel) => fs.existsSync(path.join(GEN, rel)));

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  });
  return out;
}

const replayIdentity = (() => {
  const h = crypto.createHash('sha256');
  existing.concat(RECORDER_FILES).forEach((rel) => h.update(rel + '\0' + read(rel).replace(/\r\n/g, '\n')));
  return h.digest('hex');
})();
const hashIdentity = (() => {
  const h = crypto.createHash('sha256');
  existing.filter((rel) => !/^js\/(ui|worker)\//.test(rel)).concat(HASH_CODE_FILES)
    .forEach((rel) => h.update(rel + '\0' + read(rel).replace(/\r\n/g, '\n')));
  return h.digest('hex');
})();

const stamp = new Date();
const pad = (n) => String(n).padStart(2, '0');
const offset = -stamp.getTimezoneOffset();
const iso = stamp.getFullYear() + '-' + pad(stamp.getMonth() + 1) + '-' + pad(stamp.getDate()) + 'T' +
  pad(stamp.getHours()) + ':' + pad(stamp.getMinutes()) + ':' + pad(stamp.getSeconds()) +
  (offset >= 0 ? '+' : '-') + pad(Math.floor(Math.abs(offset) / 60)) + ':' + pad(Math.abs(offset) % 60);
const lines = [];
lines.push('MS17a source bytes ' + (process.argv[2] || 'frozen before E') + ' (' + iso + '), SHA-256 of the file bytes:');
const named = [];
existing.forEach((rel) => named.push(path.relative(REPO, path.resolve(GEN, rel)).replace(/\\/g, '/')));
RECORDER_FILES.concat(HASH_CODE_FILES.filter((rel) => RECORDER_FILES.indexOf(rel) === -1))
  .forEach((rel) => named.push('generator/' + rel));
EIGHT_LISTS.forEach((rel) => { if (named.indexOf(rel) === -1) named.push(rel); });
named.push('generator/tests/suites/history.test.js');
named.forEach((rel) => {
  const tags = [];
  if (existing.some((e) => path.relative(REPO, path.resolve(GEN, e)).replace(/\\/g, '/') === rel)) tags.push('SOURCE_FILES');
  if (RECORDER_FILES.some((e) => 'generator/' + e === rel)) tags.push('recorder');
  if (HASH_CODE_FILES.some((e) => 'generator/' + e === rel)) tags.push('hash helper');
  if (EIGHT_LISTS.indexOf(rel) !== -1) tags.push('source list');
  lines.push(SHA(fs.readFileSync(path.join(REPO, rel))) + '  ' + rel.replace(/\//g, '\\') + '  [' + tags.join(', ') + ']');
});
lines.push('');
lines.push('SOURCE_FILES entries: ' + sources.length + ', existing ' + existing.length + ', js/ui/history.js listed: ' +
  (sources.indexOf('js/ui/history.js') !== -1));
lines.push('');
lines.push('tree hashes (SHA-256 of the sorted "relative path : file hash" lines):');
TREES.forEach((rel) => {
  const files = walk(path.join(REPO, rel), []).sort();
  const text = files.map((f) => path.relative(REPO, f).replace(/\\/g, '/') + ' : ' + SHA(fs.readFileSync(f)));
  lines.push(SHA(Buffer.from(text.join('\n'))) + '  ' + rel.replace(/\//g, '\\') + ' (' + files.length + ' files)');
});
lines.push('');
lines.push('source identities the recorders write (replay-fixtures.js/replay-goldens.js identity with RECORDER_FILES; perf.js hashIdentity):');
lines.push('replay identity (wire and analysis ledgers) sourceHash ' + replayIdentity);
lines.push('hash identity (hash ledgers) sourceHash ' + hashIdentity);
lines.forEach((l) => console.log(l));
if (process.argv[3]) fs.writeFileSync(path.resolve(process.argv[3]), lines.join('\r\n') + '\r\n', 'utf8');
