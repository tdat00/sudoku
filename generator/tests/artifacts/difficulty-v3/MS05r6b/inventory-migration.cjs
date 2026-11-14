#!/usr/bin/env node
'use strict';

/*
 * MS05r6b (IR13): the inventory migration from MS05r5m's draft inventory to the final registration-only inventory, as data.
 * Additions and renames are told apart; nothing is matched by a fuzzy name.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6b/inventory-migration.cjs --out=<new file.json>
 *
 * Declared from recorded evidence (never guessed):
 *  - the 46 `manual-corpus` tests of MS05b3 (evidence/MS05b3/quick-additions.json);
 *  - the 6 `MS05r5p-CV6-04` store cases of the legacy-8 fix round (evidence/MS05r5p/legacy-8-fix/store-final.json);
 *  - the 3 G13 saved-wire spy tests of MS05r6a (evidence/MS05r6a/pins/g13-branch.json: steps #0, replay #25, player #0);
 *  - the 7 one-to-one renames of MS05r6a, taken as the tests of the same (suite, ordinal) whose full name differs between
 *    its two recorded inventories (pins/replay-inventory.json before the pins, pins/replay-inventory-final.json after) and
 *    cross-checked against pins/resolved.json (entry suite, final ordinal and oldName).
 * Everything else must keep its full name inside its suite; any other loss, duplicate or new name is an error. Ordinals
 * that moved because of the insertions are listed per suite. Exit 0 only when the migration is exact.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EV = 'docs/difficulty-v3/evidence/';
const FILES = {
  oldGenerator: EV + 'MS05r5m/generator-inventory.json',
  oldPlayer: EV + 'MS05r5m/player-inventory.json',
  finalGenerator: EV + 'MS05r6b/quick/generator-inventory.json',
  finalPlayer: EV + 'MS05r6b/quick/player-inventory.json',
  corpus: EV + 'MS05b3/quick-additions.json',
  store: EV + 'MS05r5p/legacy-8-fix/store-final.json',
  spies: EV + 'MS05r6a/pins/g13-branch.json',
  preRename: EV + 'MS05r6a/pins/replay-inventory.json',
  postRename: EV + 'MS05r6a/pins/replay-inventory-final.json',
  resolved: EV + 'MS05r6a/pins/resolved.json'
};

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
}

const nameKey = (t) => t.suite + '|' + t.fullName;
const ref = (t) => ({ suite: t.suite, ordinal: t.ordinal, fullName: t.fullName });

/*
 * Three more one-to-one renames that the IR13 list does not name: MS05r6a's A0 (G13 persistence) changed the four wire
 * requests G09-G12 to five (G09-G13) in the names of three `replay-recorders` tests, at the same suite and ordinal (#1, #16,
 * #38). Evidence: evidence/MS05r6a/evidence.md section A0 ("the pinned IDs and REQUESTS.slice(8, 13)", the wire-file round
 * trip with five records, the analysis projection of the five saved results), focused/replay-recorders.json (39 of 39),
 * and `git diff refs/dv3-wip/MS05r5m-done-20261114-0230 -- generator/tests/suites/replay-recorders.test.js`, whose only
 * `it(` title changes are these three.
 */
const A0_PREFIX = 'replay-recorders > replay recorders: ';
const A0_RENAMES = [
  { group: 'MS05r6a A0: replay-recorders (found by this migration, not in the IR13 list)', suite: 'replay-recorders',
    oldOrdinalInR6a: 1, finalOrdinalInR6a: 1,
    oldName: A0_PREFIX + 'the corpora > keeps the four wire requests G09-G12 of the old recorder and the saved data of exactly those',
    newName: A0_PREFIX + 'the corpora > keeps the five wire requests G09-G13 (G13 saved since MS05r6a) and the saved data of exactly those' },
  { group: 'MS05r6a A0: replay-recorders (found by this migration, not in the IR13 list)', suite: 'replay-recorders',
    oldOrdinalInR6a: 16, finalOrdinalInR6a: 16,
    oldName: A0_PREFIX + 'the projection of an analysis > projects the analysis of the saved results G09-G12 to exactly their golden records',
    newName: A0_PREFIX + 'the projection of an analysis > projects the analysis of the saved results G09-G13 to exactly their golden records' },
  { group: 'MS05r6a A0: replay-recorders (found by this migration, not in the IR13 list)', suite: 'replay-recorders',
    oldOrdinalInR6a: 38, finalOrdinalInR6a: 38,
    oldName: A0_PREFIX + 'the tools (Node only) > rebuilds the saved wire file byte for byte from its four records (wire)',
    newName: A0_PREFIX + 'the tools (Node only) > rebuilds the saved wire file byte for byte from its five records (wire)' }
];

function duplicatesOf(rows) {
  const seen = new Set();
  const dup = [];
  rows.forEach((t) => {
    if (seen.has(nameKey(t))) dup.push(ref(t));
    seen.add(nameKey(t));
  });
  return dup;
}

function migrate(oldInv, finInv, declared) {
  const errors = [];
  const finByName = new Map(finInv.tests.map((t) => [nameKey(t), t]));
  const oldByName = new Map(oldInv.tests.map((t) => [nameKey(t), t]));
  duplicatesOf(oldInv.tests).forEach((t) => errors.push('repeated full name in the old inventory: ' + t.suite + '#' + t.ordinal));
  duplicatesOf(finInv.tests).forEach((t) => errors.push('repeated full name in the final inventory: ' + t.suite + '#' + t.ordinal));
  const renameByOld = new Map(declared.renames.map((r) => [r.suite + '|' + r.oldName, r]));
  const mappedFinal = new Set();
  const identical = [];
  const renamed = [];
  const lost = [];
  oldInv.tests.forEach((t) => {
    const same = finByName.get(nameKey(t));
    if (same) {
      identical.push({ old: t, fin: same });
      mappedFinal.add(nameKey(same));
      return;
    }
    const rename = renameByOld.get(nameKey(t));
    const target = rename ? finByName.get(rename.suite + '|' + rename.newName) : null;
    if (rename && target) {
      renamed.push({ old: t, fin: target });
      mappedFinal.add(nameKey(target));
    } else lost.push(ref(t));
  });
  const declaredAdditions = new Map();
  declared.additions.forEach((group) => {
    group.names.forEach((n) => declaredAdditions.set(group.suite + '|' + n, group.id));
  });
  const added = [];
  const unexplained = [];
  finInv.tests.forEach((t) => {
    if (mappedFinal.has(nameKey(t))) return;
    const group = declaredAdditions.get(nameKey(t));
    if (group) added.push({ group: group, fin: t });
    else unexplained.push(ref(t));
  });
  const addedKeys = new Set(added.map((a) => nameKey(a.fin)));
  const additionsNotFound = [];
  declaredAdditions.forEach((group, key) => {
    if (!addedKeys.has(key)) additionsNotFound.push({ group: group, key: key });
  });
  lost.forEach((t) => errors.push('lost: ' + t.suite + '#' + t.ordinal + ' ' + t.fullName));
  unexplained.forEach((t) => errors.push('new and undeclared: ' + t.suite + '#' + t.ordinal + ' ' + t.fullName));
  additionsNotFound.forEach((a) => errors.push('declared addition not in the final inventory (' + a.group + '): ' + a.key));
  declared.renames.forEach((r) => {
    if (!oldByName.has(r.suite + '|' + r.oldName)) errors.push('rename: the old name is not in the old inventory: ' + r.oldName);
    if (!finByName.has(r.suite + '|' + r.newName)) errors.push('rename: the new name is not in the final inventory: ' + r.newName);
  });
  const shifts = {};
  identical.concat(renamed).forEach((m) => {
    if (m.old.ordinal !== m.fin.ordinal) {
      shifts[m.old.suite] = shifts[m.old.suite] || { moved: 0, total: 0 };
      shifts[m.old.suite].moved++;
    }
  });
  identical.concat(renamed).forEach((m) => {
    if (shifts[m.old.suite]) shifts[m.old.suite].total++;
  });
  if (oldInv.tests.length - lost.length + added.length !== finInv.tests.length) {
    errors.push('the counts do not add up');
  }
  return { errors: errors, identical: identical, renamed: renamed, added: added, shifts: shifts };
}

function declaredFromEvidence() {
  const corpus = readJson(FILES.corpus);
  const store = readJson(FILES.store);
  const spies = readJson(FILES.spies);
  const pre = readJson(FILES.preRename);
  const post = readJson(FILES.postRename);
  const resolved = readJson(FILES.resolved);
  const preAt = new Map(pre.tests.map((t) => [t.suite + '/' + t.ordinal, t]));
  const renames = [];
  post.tests.forEach((t) => {
    const before = preAt.get(t.suite + '/' + t.ordinal);
    if (before && before.fullName !== t.fullName) {
      renames.push({ suite: t.suite, oldOrdinalInR6a: before.ordinal, finalOrdinalInR6a: t.ordinal,
        oldName: before.fullName, newName: t.fullName });
    }
  });
  const problems = [];
  renames.forEach((r) => {
    const entry = (resolved.entries || []).find((e) => e.suite === r.suite && e.ordinal === r.finalOrdinalInR6a &&
      e.oldName === r.oldName);
    if (!entry) problems.push('rename not in pins/resolved.json: ' + r.suite + '#' + r.finalOrdinalInR6a);
  });
  return {
    problems: problems,
    declared: {
      renames: renames.map((r) => Object.assign({ group: 'IR13: steps and replay, MS05r6a pins' }, r)).concat(A0_RENAMES),
      additions: [
        { id: 'MS05b3 manual-corpus', suite: 'manual-corpus', names: corpus.tests.map((t) => t.fullName) },
        { id: 'MS05r5p legacy-8 store cases', suite: 'store',
          names: store.results.tests.filter((t) => /MS05r5p-CV6-04/.test(t.fullName)).map((t) => t.fullName) },
        ...['steps', 'replay', 'player'].map((suite) => ({ id: 'MS05r6a G13 saved-wire spy (' + suite + ')',
          suite: suite, names: spies.results.tests.filter((t) => t.suite === suite).map((t) => t.fullName) }))
      ]
    }
  };
}

function main(argv) {
  const outArg = (argv.find((a) => /^--out=/.test(a)) || '').slice('--out='.length);
  const finalDir = ((argv.find((a) => /^--final=/.test(a)) || '').slice('--final='.length)) || 'quick';
  if (!outArg || argv.length > 2) throw new Error('usage: --out=<new project-relative .json> [--final=<quick folder>]');
  FILES.finalGenerator = EV + 'MS05r6b/' + finalDir + '/generator-inventory.json';
  FILES.finalPlayer = EV + 'MS05r6b/' + finalDir + '/player-inventory.json';
  const outAbs = path.resolve(process.cwd(), outArg);
  const rel = path.relative(ROOT, outAbs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('the output must be inside the repository');
  if (fs.existsSync(outAbs)) throw new Error(outArg + ' exists already (an evidence file is never overwritten)');
  const found = declaredFromEvidence();
  const gen = migrate(readJson(FILES.oldGenerator), readJson(FILES.finalGenerator), found.declared);
  const oldPlayer = readJson(FILES.oldPlayer);
  const finPlayer = readJson(FILES.finalPlayer);
  const play = migrate(oldPlayer, finPlayer, { renames: [], additions: [] });
  const expected = { manualCorpus: 46, store: 6, spies: 3, renames: 10, ir13Renames: 7, a0Renames: 3 };
  const counts = {
    manualCorpus: found.declared.additions[0].names.length, store: found.declared.additions[1].names.length,
    spies: found.declared.additions.slice(2).reduce((n, g) => n + g.names.length, 0), renames: found.declared.renames.length,
    ir13Renames: found.declared.renames.filter((r) => /^IR13/.test(r.group)).length,
    a0Renames: found.declared.renames.filter((r) => /^MS05r6a A0/.test(r.group)).length
  };
  const errors = found.problems.concat(gen.errors.map((e) => 'generator: ' + e), play.errors.map((e) => 'player: ' + e));
  Object.keys(expected).forEach((k) => {
    if (counts[k] !== expected[k]) errors.push('declared ' + k + ': ' + counts[k] + ', expected ' + expected[k]);
  });
  const playerSame = play.identical.every((m) => m.old.ordinal === m.fin.ordinal);
  if (!playerSame) errors.push('player: an ordinal moved');
  const doc = {
    schema: 1, kind: 'inventory-migration', task: 'MS05r6b', files: FILES, exact: errors.length === 0, errors: errors,
    generator: {
      oldTests: readJson(FILES.oldGenerator).tests.length, finalTests: readJson(FILES.finalGenerator).tests.length,
      identicalName: gen.identical.length, renamed: gen.renamed.length, added: gen.added.length,
      declaredCounts: counts,
      additions: gen.added.map((a) => ({ group: a.group, key: 'generator/' + a.fin.suite + '/' + a.fin.ordinal,
        fullName: a.fin.fullName })),
      renames: gen.renamed.map((m) => ({ group: (found.declared.renames.find((r) => r.suite === m.old.suite &&
        r.oldName === m.old.fullName) || {}).group,
        suite: m.old.suite, oldKeyInR5m: 'generator/' + m.old.suite + '/' + m.old.ordinal,
        newKey: 'generator/' + m.fin.suite + '/' + m.fin.ordinal, oldName: m.old.fullName, newName: m.fin.fullName })),
      ordinalShifts: gen.shifts
    },
    player: { oldTests: oldPlayer.tests.length, finalTests: finPlayer.tests.length, identicalName: play.identical.length,
      renamed: play.renamed.length, added: play.added.length, ordinalsUnchanged: playerSame }
  };
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(doc, null, 2).replace(/\n/g, '\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  console.log('generator: ' + doc.generator.oldTests + ' -> ' + doc.generator.finalTests + ': identical ' +
    doc.generator.identicalName + ', renamed ' + doc.generator.renamed + ', added ' + doc.generator.added +
    ' (manual-corpus ' + counts.manualCorpus + ', store ' + counts.store + ', G13 spies ' + counts.spies + ')');
  console.log('player: ' + doc.player.oldTests + ' -> ' + doc.player.finalTests + ': identical ' + doc.player.identicalName +
    ', renamed ' + doc.player.renamed + ', added ' + doc.player.added + ', ordinals unchanged ' + playerSame);
  errors.forEach((e) => console.log('ERROR: ' + e));
  console.log('written: ' + outArg);
  return errors.length === 0 ? 0 : 1;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(String(err && err.message || err));
    process.exitCode = 2;
  }
}

module.exports = { migrate: migrate };
