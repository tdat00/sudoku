'use strict';

/*
 * MS05r6a, B item 4: the 520 keys of the final-source hash ledgers against two earlier records, key by key. Read-only;
 * no generation.
 *   base     the fixture of MS04 (`6165c42`, the last commit before MS05b1: the old engine, no requiredness)
 *   interim  the fixture at HEAD, which is MS05b1's interim record (the pause commit `a7f6660` carries it; the 104
 *            ledgers of docs/difficulty-v3/evidence/MS05b1/hashes equal it key by key, no allowance, 8 attempts)
 *   now      the 104 ledgers of docs/difficulty-v3/evidence/MS05r6a/hashes (allowance 256, 8/4/2 default attempts)
 * Classes of one key:
 *   unchanged       now = interim = base                the puzzle never changed (exact before and after, or a
 *                                                       shallow fallback that is the first puzzle in the band)
 *   improved-kept   now = interim != base                the interim improvement (a different, exact puzzle) is found
 *   improved-lost   now != interim and now = base        the improvement is no longer found: the old puzzle is returned
 *   other-puzzle    now != interim, now != base, interim != base   a third puzzle
 *   new-change      now != interim and interim = base    a change that the interim run did not have
 * and, for the size default: whether the combination is on a board above 81 cells (4 or 2 attempts since MS05r5p).
 *
 *   node tests/artifacts/difficulty-v3/MS05r6a/hash-classes.cjs --json=<file.json>
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence');
const LARGE = ['mega12', 'mega16', 'samurai', 'butterfly', 'flower', 'sohei'];
const CLASSES = ['unchanged', 'improved-kept', 'improved-lost', 'other-puzzle', 'new-change'];

function ledgers(dir) {
  const map = new Map();
  fs.readdirSync(dir).filter((n) => n.endsWith('.json')).forEach((name) => {
    const ledger = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    ledger.records.forEach((r) => {
      if (map.has(r.key)) throw new Error(dir + ': duplicate ' + r.key);
      map.set(r.key, r.hash);
    });
  });
  return map;
}

function evaluate(text) {
  const context = { self: undefined, globalThis: undefined };
  context.self = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(text.replace(/^\uFEFF/, ''), context);
  return context.SG.fixtures.regression;
}

function fixtureAt(rev) {
  return evaluate(childProcess.execFileSync('git', ['show', rev + ':generator/tests/fixtures/regression.js'], {
    cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 }));
}

function main(argv) {
  const jsonArg = argv.map((a) => /^--json=(.+)$/.exec(a)).filter(Boolean)[0];
  const base = fixtureAt('6165c42');
  const interim = fixtureAt('HEAD');
  const now = ledgers(path.join(EVIDENCE, 'MS05r6a', 'hashes'));
  const b1 = ledgers(path.join(EVIDENCE, 'MS05b1', 'hashes'));
  const seeds = interim.seeds;
  let interimEqualsB1Ledgers = true;
  const rows = [];
  const total = {};
  CLASSES.forEach((c) => { total[c] = 0; });
  let keys = 0;
  let interimChanged = 0;
  Object.keys(interim.hashes).forEach((combo) => {
    const counts = {};
    CLASSES.forEach((c) => { counts[c] = 0; });
    seeds.forEach((seed, i) => {
      const key = combo + '#' + seed;
      const h = now.get(key);
      const i1 = interim.hashes[combo][i];
      const b0 = base.hashes[combo][i];
      if (h === undefined) throw new Error('missing ' + key);
      if (b1.get(key) !== i1) interimEqualsB1Ledgers = false;
      let cls;
      if (h === i1 && i1 === b0) cls = 'unchanged';
      else if (h === i1) cls = 'improved-kept';
      else if (h === b0) cls = 'improved-lost';
      else if (i1 !== b0) cls = 'other-puzzle';
      else cls = 'new-change';
      counts[cls]++;
      total[cls]++;
      keys++;
      if (i1 !== b0) interimChanged++;
    });
    rows.push({ combination: combo, largeBoard: LARGE.includes(combo.split('/')[0]), counts: counts });
  });
  const part = (list) => {
    const out = { combinations: list.length };
    CLASSES.forEach((c) => { out[c] = list.reduce((n, r) => n + r.counts[c], 0); });
    return out;
  };
  const report = {
    keys: keys, interimChangedVsBase: interimChanged, interimFixtureEqualsB1Ledgers: interimEqualsB1Ledgers,
    total: total,
    boardsUpTo81Cells: part(rows.filter((r) => !r.largeBoard)),
    boardsAbove81Cells: part(rows.filter((r) => r.largeBoard)),
    rows: rows
  };
  if (jsonArg) fs.writeFileSync(path.resolve(process.cwd(), jsonArg[1]), JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log('keys ' + keys + '; interim (HEAD) differs from the base (MS04) in ' + interimChanged +
    '; HEAD fixture equals the MS05b1 ledgers: ' + interimEqualsB1Ledgers);
  console.log('now: ' + JSON.stringify(total));
  console.log('boards up to 81 cells (8 attempts, as the interim): ' + JSON.stringify(report.boardsUpTo81Cells));
  console.log('boards above 81 cells (4 or 2 attempts):            ' + JSON.stringify(report.boardsAbove81Cells));
  rows.filter((r) => CLASSES.slice(1).some((c) => r.counts[c] > 0)).forEach((r) => console.log('  ' +
    r.combination.padEnd(22) + JSON.stringify(r.counts) + (r.largeBoard ? ' large' : '')));
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 1;
}
