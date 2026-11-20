#!/usr/bin/env node
'use strict';

/*
 * MS18d Phase B: proof that the two deep-registration filters (mega.test.js and multigrid.test.js) change
 * nothing in the quick inventory and remove exactly seven per-level registrations of the SG_DEEP=1 listing.
 *
 *   node compare-listings.js
 *
 * Reads the four listings written by `node tests/node-runner.js --list-tests=...` (no test ran) in
 * docs/difficulty-v3/evidence/MS18d/phase-b/deep-registration/ (before-quick, after-quick, before-deep,
 * after-deep) and the MS18c qualification record, then writes comparison.json beside them (never over an
 * existing file). Exit 0 when every check holds, 1 otherwise. Read-only except for that one new file.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const DIR = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18d', 'phase-b', 'deep-registration');
const QUAL = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18c', 'merge', 'qualification-v3.json');
const MEGA_LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'nightmare', 'hell1'];
const MULTI_LEVELS = ['veryEasy', 'easy', 'normal', 'hard'];

const MEGA_PREFIX = 'mega > mega deep run: 20 puzzles per level (SG_DEEP=1) > ';
const MULTI_PREFIX = 'multigrid > multigrid deep run: 20 puzzles per level (SG_DEEP=1) > ';
const MEGA_TAIL = ': 20 seeds, hit rate and p95 time against section 9.1';
const MULTI_TAIL = ': 20 seeds, hit rate and p95 time against \u00a79.1';

const EXPECTED = [
  { suite: 'mega', variant: 'mega12', level: 'hell1' },
  { suite: 'mega', variant: 'mega16', level: 'nightmare' },
  { suite: 'mega', variant: 'mega16', level: 'hell1' },
  { suite: 'multigrid', variant: 'samurai', level: 'easy' },
  { suite: 'multigrid', variant: 'sohei', level: 'easy' },
  { suite: 'multigrid', variant: 'butterfly', level: 'easy' },
  { suite: 'multigrid', variant: 'flower', level: 'easy' }
].map((e) => {
  const mega = e.suite === 'mega';
  return Object.assign(e, {
    fullName: (mega ? MEGA_PREFIX : MULTI_PREFIX) + e.variant + ' ' + e.level +
      (mega ? MEGA_TAIL : MULTI_TAIL),
    localLevelIndex: (mega ? MEGA_LEVELS : MULTI_LEVELS).indexOf(e.level)
  });
});

const failures = [];
const check = (ok, text) => { if (!ok) failures.push(text); return ok; };
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const load = (name) => JSON.parse(fs.readFileSync(path.join(DIR, name + '.json'), 'utf8'));
const key = (t) => [t.suite, t.fullName, t.kind, t.skipped, t.timeoutMs].join('\u0000');
const consecutive = (tests) => {
  const next = {};
  return tests.every((t) => {
    const want = next[t.suite] || 0;
    next[t.suite] = want + 1;
    return t.ordinal === want;
  });
};

function main() {
  const files = ['before-quick', 'after-quick', 'before-deep', 'after-deep'];
  const data = {};
  const hashes = {};
  for (const f of files) {
    data[f] = load(f);
    hashes[f + '.json'] = sha256(path.join(DIR, f + '.json'));
    check(data[f].complete === true, f + ': listing not complete');
    check((data[f].registrationErrors || []).length === 0, f + ': registration errors');
  }

  const bq = data['before-quick'].tests;
  const aq = data['after-quick'].tests;
  const quickIdentical = bq.length === aq.length && bq.every((t, i) => key(t) === key(aq[i]) &&
    t.ordinal === aq[i].ordinal);
  check(quickIdentical, 'quick inventory differs (names, order, ordinals, kind, skip or timeout)');
  check(bq.length === 4807, 'quick inventory is not 4807 tests: ' + bq.length);

  const bd = data['before-deep'].tests;
  const ad = data['after-deep'].tests;
  const afterNames = new Set(ad.map((t) => t.fullName));
  const beforeNames = new Set(bd.map((t) => t.fullName));
  const removed = bd.filter((t) => !afterNames.has(t.fullName));
  const added = ad.filter((t) => !beforeNames.has(t.fullName));
  check(added.length === 0, 'deep listing gained ' + added.length + ' tests');
  check(removed.length === 7, 'deep listing lost ' + removed.length + ' tests, expected 7');
  EXPECTED.forEach((e) => {
    check(removed.some((t) => t.fullName === e.fullName), 'expected removal missing: ' + e.fullName);
  });
  const kept = bd.filter((t) => afterNames.has(t.fullName));
  check(kept.length === ad.length && kept.every((t, i) => key(t) === key(ad[i])),
    'deep tests that remain differ in name, order, kind, skip or timeout');
  check(consecutive(bd) && consecutive(ad), 'deep ordinals are not consecutive per suite');

  // In a deep run the 4-puzzle (mega) and 2-puzzle (multigrid) per-level tests of the quick set are
  // replaced by 20-puzzle tests of the same cells (an earlier, unchanged difference); only the
  // "deep run" describes are ours.
  const deepRun = (tests, suite) => tests.filter((t) => t.suite === suite &&
    t.fullName.startsWith(suite === 'mega' ? MEGA_PREFIX : MULTI_PREFIX));
  const counts = {
    megaDeepBefore: deepRun(bd, 'mega').length, megaDeepAfter: deepRun(ad, 'mega').length,
    multigridDeepBefore: deepRun(bd, 'multigrid').length, multigridDeepAfter: deepRun(ad, 'multigrid').length
  };
  const others = (tests) => tests.filter((t) => !t.fullName.startsWith(MEGA_PREFIX) &&
    !t.fullName.startsWith(MULTI_PREFIX)).map(key);
  check(JSON.stringify(others(bd)) === JSON.stringify(others(ad)),
    'deep tests outside the two deep-run blocks differ');
  check(counts.megaDeepBefore === 12 && counts.megaDeepAfter === 9, 'mega deep counts ' +
    counts.megaDeepBefore + ' -> ' + counts.megaDeepAfter + ', expected 12 -> 9');
  check(counts.multigridDeepBefore === 16 && counts.multigridDeepAfter === 12, 'multigrid deep counts ' +
    counts.multigridDeepBefore + ' -> ' + counts.multigridDeepAfter + ', expected 16 -> 12');
  check(bd.length - ad.length === 7 && bd.length === 4835 && ad.length === 4828, 'deep totals differ');

  const qual = JSON.parse(fs.readFileSync(QUAL, 'utf8'));
  const cell = (variant, level) => qual.cells.find((c) => c.variant === variant && c.level === level);
  const map = EXPECTED.map((e) => {
    const c = cell(e.variant, e.level);
    const before = removed.find((t) => t.fullName === e.fullName);
    check(!!c && c.summary.verdict === 'hidden', e.variant + '/' + e.level + ': GQ verdict is not hidden');
    return {
      suite: e.suite, variant: e.variant, level: e.level, fullName: e.fullName,
      ordinalBefore: before ? before.ordinal : null, localLevelIndex: e.localLevelIndex,
      requested: { seeds: '1..20', count: 20, requestBudgetMs: 120000, trace: 'off' },
      gq: c ? {
        source: 'docs/difficulty-v3/evidence/MS18c/merge/qualification-v3.json', budgetMs: c.budget,
        n: c.summary.n, hits: c.summary.hits, verdict: c.summary.verdict, stopped: c.summary.stopped,
        p95: c.summary.p95
      } : null
    };
  });

  const output = {
    schema: 'ms18d-deep-registration-comparison-1',
    result: failures.length === 0 ? 'pass' : 'fail',
    failures: failures,
    listingHashes: hashes,
    qualificationSha256: sha256(QUAL),
    sourceHashes: {
      beforeQuick: data['before-quick'].sourceHash, afterQuick: data['after-quick'].sourceHash,
      beforeDeep: data['before-deep'].sourceHash, afterDeep: data['after-deep'].sourceHash
    },
    totals: { quick: bq.length, deepBefore: bd.length, deepAfter: ad.length },
    quickInventoryIdentical: quickIdentical,
    deepAdditions: added.length,
    deepRemovals: removed.length,
    counts: counts,
    removedRegistrations: map
  };
  const text = JSON.stringify(output, null, 2).replace(/\n/g, '\r\n') + '\r\n';
  fs.writeFileSync(path.join(DIR, 'comparison.json'), text, { encoding: 'utf8', flag: 'wx' });
  console.log(output.result + ': quick ' + bq.length + ' identical=' + quickIdentical + ', deep ' +
    bd.length + ' -> ' + ad.length + ', removed ' + removed.length + ', added ' + added.length);
  failures.forEach((f) => console.log('FAIL: ' + f));
  return failures.length === 0 ? 0 : 1;
}

process.exitCode = main();
