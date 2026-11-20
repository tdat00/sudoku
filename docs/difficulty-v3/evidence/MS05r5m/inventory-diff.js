#!/usr/bin/env node
'use strict';

/*
 * MS05r5m: what the mega Nightmare replacement did to the Generator quick inventory, test by test, from the two
 * complete inventories (MS05r5, before; this folder, after). Built-in modules only; nothing here runs a test.
 *
 *   node inventory-diff.js [--write]    print the comparison; with --write, write inventory-diff.json (never overwritten)
 *
 * The comparison is by full name ("suite > describe > test"): the removed tests, the added tests, the tests that
 * kept their name but moved to another ordinal (the mega suite after the replaced tests), and the check that
 * nothing else changed. Exit 0 only when the removed tests are exactly the four full-attempt Nightmare tests and
 * every other test of the before inventory is in the after inventory under the same full name.
 */
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const BEFORE = path.join(HERE, '..', 'MS05r5', 'generator-inventory.json');
const AFTER = path.join(HERE, 'generator-inventory.json');
const OUT = path.join(HERE, 'inventory-diff.json');
const EXPECTED_REMOVED = [
  'mega > mega puzzles > mega12 nightmare: 4 puzzles are unique, valid and inside the 9.1 time budget',
  'mega > mega puzzles > mega12 nightmare: the same seed gives the same puzzle (CV5)',
  'mega > mega puzzles > mega16 nightmare: 4 puzzles are unique, valid and inside the 9.1 time budget',
  'mega > mega puzzles > mega16 nightmare: the same seed gives the same puzzle (CV5)'
];

function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function byName(inventory) {
  const map = new Map();
  inventory.tests.forEach((t) => {
    if (map.has(t.fullName)) throw new Error('repeated full name: ' + t.fullName);
    map.set(t.fullName, t);
  });
  return map;
}

function main() {
  const before = read(BEFORE);
  const after = read(AFTER);
  const old = byName(before);
  const now = byName(after);
  const removed = [];
  const added = [];
  const moved = [];
  old.forEach((t, name) => {
    const n = now.get(name);
    if (!n) removed.push({ key: before.app + '/' + t.suite + '/' + t.ordinal, fullName: name });
    else if (n.ordinal !== t.ordinal) moved.push({ fullName: name, from: t.ordinal, to: n.ordinal, suite: t.suite });
    else if (n.timeoutMs !== t.timeoutMs || n.kind !== t.kind || n.skipped !== t.skipped) {
      throw new Error('changed row: ' + name);
    }
  });
  now.forEach((t, name) => {
    if (!old.has(name)) added.push({ key: after.app + '/' + t.suite + '/' + t.ordinal, fullName: name, timeoutMs: t.timeoutMs });
  });
  const suitesBefore = new Set(before.tests.map((t) => t.suite));
  const newSuites = Array.from(new Set(after.tests.map((t) => t.suite))).filter((s) => !suitesBefore.has(s));
  const movedSuites = Array.from(new Set(moved.map((m) => m.suite)));
  const removedOk = JSON.stringify(removed.map((r) => r.fullName).sort()) === JSON.stringify(EXPECTED_REMOVED.slice().sort());
  const document = {
    schema: 1,
    before: { path: 'docs/difficulty-v3/evidence/MS05r5/generator-inventory.json', sourceHash: before.sourceHash,
      tests: before.tests.length, suites: new Set(before.tests.map((t) => t.suite)).size },
    after: { path: 'docs/difficulty-v3/evidence/MS05r5m/generator-inventory.json', sourceHash: after.sourceHash,
      tests: after.tests.length, suites: new Set(after.tests.map((t) => t.suite)).size },
    removedIsExactlyTheFourNightmareTests: removedOk,
    removed: removed,
    added: added,
    newSuites: newSuites,
    movedOnlyWithinSuites: movedSuites,
    moved: moved.length,
    movedFirst: moved.slice(0, 3),
    movedLast: moved.slice(-3),
    unchangedUnmoved: old.size - removed.length - moved.length
  };
  const text = JSON.stringify(document, null, 2).replace(/\n/g, '\r\n') + '\r\n';
  console.log(text);
  if (process.argv.includes('--write')) fs.writeFileSync(OUT, text, { encoding: 'utf8', flag: 'wx' });
  return removedOk && removed.length === 4 ? 0 : 1;
}

process.exitCode = main();
