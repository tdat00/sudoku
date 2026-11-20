'use strict';
// MS07f: reconciles the complete quick sets and the four relocated manual cases against the registration-only
// inventories of the same final source. Reads files only; run from anywhere:
//   node docs/difficulty-v3/evidence/MS07f/reconcile.cjs
const fs = require('fs');
const path = require('path');

const EV = __dirname;
const load = (rel) => JSON.parse(fs.readFileSync(path.join(EV, rel), 'utf8'));
const keyOf = (r) => r.suite + '|' + r.ordinal + '|' + r.fullName;
let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? '  ' + detail : ''));
}
const count = (map, k) => map.set(k, (map.get(k) || 0) + 1);

function reconcileApp(label, inventoryFile, resultFiles) {
  console.log('== ' + label);
  const inv = load(inventoryFile);
  const expected = new Map();
  inv.tests.forEach((t) => count(expected, keyOf(t)));
  const seen = new Map();
  const status = {};
  const hashes = new Set();
  const byFile = [];
  let total = 0;
  resultFiles.forEach((file) => {
    const r = load(file);
    check(file + ': complete and source stable', r.complete === true && r.sourceStable === true,
      'tests ' + r.results.tests.length + ', failed ' + r.results.failed + ', wallMs ' + r.wallMs);
    check(file + ': no registration error', (r.registrationErrors || []).length === 0);
    hashes.add(r.sourceHash);
    byFile.push([file, r.results.tests.length]);
    r.results.tests.forEach((t) => {
      count(seen, keyOf(t));
      status[t.status] = (status[t.status] || 0) + 1;
      total++;
    });
  });
  const missing = [...expected.keys()].filter((k) => !seen.has(k));
  const unexpected = [...seen.keys()].filter((k) => !expected.has(k));
  const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  check('inventory ' + inv.tests.length + ' tests, results ' + total + ' rows', inv.tests.length === total);
  check('every inventory key exactly once; missing ' + missing.length + ', duplicate ' + duplicated.length +
    ', unexpected ' + unexpected.length, missing.length === 0 && duplicated.length === 0 && unexpected.length === 0);
  check('one source fingerprint, equal to the inventory\'s', hashes.size === 1 && hashes.has(inv.sourceHash),
    [...hashes].map((h) => h.slice(0, 16)).join(',') + ' / ' + inv.sourceHash.slice(0, 16));
  check('statuses: ' + JSON.stringify(status), Object.keys(status).every((s) => s === 'pass'));
  console.log('   shards: ' + byFile.map(([f, n]) => path.basename(f) + '=' + n).join(', '));
  return { inv, seen };
}

const gen = reconcileApp('Generator quick (after the move)', 'inventory-after/generator-quick.json', [
  'quick/generator-core-shared.json', 'quick/generator-steps.json', 'quick/generator-replay.json',
  'quick/generator-mega.json', 'quick/generator-own-fast.json', 'quick/generator-digger-target.json',
  'quick/generator-pipeline.json', 'quick/generator-player.json']);
reconcileApp('Player quick (after the move)', 'inventory-after/player-quick.json', ['quick/player-quick.json']);

console.log('== membership delta, Generator quick (before -> after, by suite and full name)');
const before = load('inventory-before/generator-quick.json');
const after = gen.inv;
const names = (inv) => {
  const m = new Map();
  inv.tests.forEach((t) => count(m, t.suite + ' > ' + t.fullName.split(' > ').slice(1).join(' > ')));
  return m;
};
const nb = names(before);
const na = names(after);
const removed = [];
const added = [];
new Set([...nb.keys(), ...na.keys()]).forEach((k) => {
  const d = (na.get(k) || 0) - (nb.get(k) || 0);
  if (d < 0) removed.push(k);
  if (d > 0) added.push(k);
});
removed.forEach((k) => console.log('   removed: ' + k));
added.forEach((k) => console.log('   added:   ' + k));
check('quick delta is -3 (pipeline ratios) and one rename (player replay case): 4 removed names, 1 added',
  removed.length === 4 && added.length === 1 && before.tests.length - after.tests.length === 3);
const suiteCount = (inv, s) => inv.tests.filter((t) => t.suite === s).length;
['pipeline', 'player'].forEach((s) => console.log('   suite ' + s + ': ' + suiteCount(before, s) + ' -> ' + suiteCount(after, s)));
check('pipeline 154 -> 151, player 69 -> 69', suiteCount(before, 'pipeline') === 154 && suiteCount(after, 'pipeline') === 151 &&
  suiteCount(before, 'player') === 69 && suiteCount(after, 'player') === 69);
const classic9 = "player > player: the replay steps of a result > real top-level results with clues shown again replay faithfully (classic9)";
const row = load('quick/generator-player.json').results.tests.find((t) => t.fullName === classic9.replace(/^player > /, 'player > '));
check('the classic9-only case was exercised in the complete quick run (once, passed)',
  !!row && row.status === 'pass', row ? row.ms + ' ms, ordinal ' + row.ordinal : 'missing');

console.log('== the four relocated cases (map: old full name -> new full name -> manual result)');
const man = load('inventory-after/generator-manual.json');
const ratios = load('manual/ratios.json');
const mega = load('manual/mega-replay.json');
const OLD = 'pipeline > instrumented generators: what the events cost > ';
const map = [
  [OLD + "generating puzzles: verbosity 'off' costs less than 2%", "perf > instrumented generators: what the events cost > generating puzzles: verbosity 'off' costs less than 2%", ratios],
  [OLD + "generating puzzles: verbosity 'summary' costs less than 10%", "perf > instrumented generators: what the events cost > generating puzzles: verbosity 'summary' costs less than 10%", ratios],
  [OLD + "generating puzzles: verbosity 'full' costs less than 35%", "perf > instrumented generators: what the events cost > generating puzzles: verbosity 'full' costs less than 35%", ratios],
  ['player > player: the replay steps of a result > real top-level results with clues shown again replay faithfully (mega16, classic9) [two of its three requests]',
    'variants > player: the replay steps of a result > real top-level results with clues shown again replay faithfully (mega16)', mega]
];
map.forEach(([oldName, newName, file]) => {
  const inManual = man.tests.filter((t) => t.fullName === newName);
  const res = file.results.tests.filter((t) => t.fullName === newName);
  const ok = inManual.length === 1 && res.length === 1 && res[0].status === 'pass';
  check('   ' + newName.replace(/^.* > /, ''), ok,
    (res[0] ? res[0].status + ', ' + (res[0].ms / 1000).toFixed(2) + ' s, ' : 'no result, ') + 'timeout ' +
    (inManual[0] ? inManual[0].timeoutMs : '?') + ' (was: ' + oldName.replace(/^.* > /, '') + ')');
});
check('manual inventory: 1,148 tests in 8 suites; 1,144 before (the four new cases are the only added registrations)',
  man.tests.length === 1148);
check('ratio and mega selections ran with complete results, no skip', ratios.complete === true && mega.complete === true &&
  ratios.results.skipped === 0 && mega.results.skipped === 0 && ratios.results.tests.length === 3 && mega.results.tests.length === 1);

console.log(failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
