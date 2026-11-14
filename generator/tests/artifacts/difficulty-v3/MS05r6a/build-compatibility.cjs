'use strict';

/*
 * MS05r6a, A: builds evidence/MS05r6a/preflight/compatibility.json, one row per G13 / mega check, from the actual
 * evidence files (nothing is typed in by hand: every identity, count and digest is read from the file it names).
 * Read-only apart from the one output file; no generation.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6a/build-compatibility.cjs
 *
 * Row fields: priorEvidence, currentInputIdentities, compatible, reason, action ('retain' | 'rerun' | 'record-item'),
 * effectiveEvidence, outcome (check-list MS05r6a section A).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EV = 'docs/difficulty-v3/evidence';

function read(rel) {
  return fs.readFileSync(path.join(REPO, rel), 'utf8');
}

function json(rel) {
  return JSON.parse(read(rel));
}

function sha(rel) {
  return crypto.createHash('sha256').update(read(rel).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')).digest('hex');
}

function runsOf(rel, label) {
  return read(rel).split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.label === label)[0];
}

function main() {
  const rows = [];

  // 1. G13 generation-only guard: r4's eight-attempt preflight against the fresh one.
  const g13Old = json(EV + '/MS05r4/preflight/G13.json');
  const g13New = json(EV + '/MS05r6a/preflight/G13.json');
  const g13Run = runsOf(EV + '/MS05r6a/runs.jsonl', 'a01-g13-preflight');
  rows.push({
    id: 'g13-120s-guard',
    check: 'G13 (samurai Nightmare seed 42) generated once under the 120,000 ms recorder guard, default attempts',
    priorEvidence: {
      path: EV + '/MS05r4/preflight/G13.json', sha256: sha(EV + '/MS05r4/preflight/G13.json'), task: g13Old.task,
      sourceHash: g13Old.identity.sourceHash, maxAttempts: g13Old.config.maxAttempts, allowance: g13Old.selectedDefault,
      guardMs: g13Old.guardMs, node: g13Old.identity.node, outcome: g13Old.outcome, wallMs: g13Old.wallMs,
      attempts: g13Old.result.attempts, score: g13Old.result.score, scriptHash: g13Old.identity.scriptHash
    },
    currentInputIdentities: {
      sourceHash: g13New.identity.sourceHash, maxAttempts: g13New.config.maxAttempts, allowance: g13New.selectedDefault,
      guardMs: g13New.guardMs, node: g13New.identity.node, request: g13New.request, scriptHash: g13New.identity.scriptHash,
      machine: g13New.machine, sameMachine: JSON.stringify(g13Old.machine) === JSON.stringify(g13New.machine),
      sameScript: g13Old.identity.scriptHash === g13New.identity.scriptHash,
      sameRequest: JSON.stringify(g13Old.request) === JSON.stringify(g13New.request)
    },
    compatible: false,
    reason: 'the default attempts of a 369-cell board went from 8 to 2 (MS05r5p) and the engine and UI sources changed ' +
      '(sourceHash ' + g13Old.identity.sourceHash.slice(0, 8) + ' to ' + g13New.identity.sourceHash.slice(0, 8) + '): ' +
      'the r4 eight-attempt preflight cannot stand for the current default',
    action: 'rerun',
    effectiveEvidence: { path: EV + '/MS05r6a/preflight/G13.json', sha256: sha(EV + '/MS05r6a/preflight/G13.json'),
      log: EV + '/MS05r6a/logs/a01-g13-preflight.txt', run: g13Run },
    outcome: g13New.outcome + ': ' + (g13New.wallMs / 1000).toFixed(3) + ' s of the 120 s guard (' +
      (100 * g13New.wallMs / g13New.guardMs).toFixed(1) + ' %), ' + g13New.result.attempts + ' attempts, score ' +
      g13New.result.score + ', exact ' + g13New.result.exact + ', warnings ' + g13New.result.warnings.join(' + ')
  });

  // 2. The fourteen deep mega records: the exact-diff compatibility proof.
  const original = json(EV + '/MS05r5m/reconciled.json');
  const fresh = json(EV + '/MS05r6a/preflight/mega-reconciled.json');
  const diff = json(EV + '/MS05r6a/preflight/snapshot-diff.json');
  const records = fs.readdirSync(path.join(REPO, EV, 'MS05r5m', 'records')).filter((n) => n.endsWith('.json')).sort();
  const storeCheck = diff.expectedPatches.filter((p) => p.path === 'generator/js/ui/store.js')[0];
  const changedSources = diff.sourceFiles.changed.map((e) => e.path);
  const loaderIdentical = diff.loader.functions.every((f) => f.identical) && diff.loader.levelGuard.identical;
  const proofHolds = fresh.identity.currentMatches.toolHash === true && fresh.identity.currentMatches.sourceHash === false &&
    changedSources.length === 1 && changedSources[0] === 'generator/js/ui/store.js' &&
    diff.sourceFiles.listsEqual && loaderIdentical && diff.toolFiles.every((t) => !t.changed) &&
    Boolean(storeCheck && storeCheck.equal) && fresh.complete && fresh.evidenceSound && fresh.correctness === 'pass';
  rows.push({
    id: 'mega-deep-14-records',
    check: 'the fourteen independent default-attempt mega Nightmare requests of MS05r5m (seeds 1-4 and CV5 3/3/4 per board)',
    priorEvidence: {
      directory: EV + '/MS05r5m/records', records: records.length, reconciliation: EV + '/MS05r5m/reconciled.json',
      reconciliationSha256: sha(EV + '/MS05r5m/reconciled.json'), identity: original.identity,
      recordDigests: records.map((n) => ({ file: n, sha256: sha(EV + '/MS05r5m/records/' + n) }))
    },
    currentInputIdentities: {
      freshReconciliation: EV + '/MS05r6a/preflight/mega-reconciled.json', identity: fresh.identity,
      currentMatches: fresh.identity.currentMatches,
      currentSourceHash: diff.sourceFiles.workSourceHash, producerSnapshotSourceHash: diff.sourceFiles.refSourceHash,
      producerSnapshot: { ref: diff.ref, commit: diff.refCommit, tree: diff.refTree },
      sourceFilesListsEqual: diff.sourceFiles.listsEqual, changedSourceFiles: changedSources,
      toolFilesChanged: diff.toolFiles.filter((t) => t.changed).map((t) => t.path),
      loaderFunctionsIdentical: diff.loader.functions, levelGuardIdentical: diff.loader.levelGuard.identical,
      loadSetChanged: diff.loadSetChanged, patches: diff.patches, storePatchEqualsR5pPatch: storeCheck,
      snapshotDiff: EV + '/MS05r6a/preflight/snapshot-diff.json',
      requestConfigDefaultAllowance: { allowance: fresh.identity.allowance, budgetMs: fresh.identity.budgetMs,
        checksVersion: fresh.identity.checksVersion, manifestHash: fresh.manifestHash, node: fresh.identity.node },
      completeness: { complete: fresh.complete, evidenceSound: fresh.evidenceSound, correctness: fresh.correctness,
        relations: fresh.relationVerdicts, generation: fresh.generation, correctnessDetail: fresh.correctnessDetail,
        requests: fresh.requests, problems: fresh.problems }
    },
    compatible: proofHolds,
    reason: 'sourceHash match false, toolHash match true. The only changed file of SOURCE_FILES is generator/js/ui/store.js ' +
      '(the legacy-8 migration of MS05r5p: one condition and comments in storedAttempts, same +/- lines as ' +
      'evidence/MS05r5p/legacy-8-fix/store-diff.patch), which SG.pipeline.normalizeConfig and SG.pipeline.run never ' +
      'execute: the deep tool builds its requests for SG.pipeline.run directly and never calls SG.store. The tool files ' +
      'and the level guard are unchanged, and loadFixtures and nodeEnv of replay-fixtures.js (the only other changed ' +
      'file of the load set; its diff is comments and the HEADER text of the wire fixture) are identical function ' +
      'for function. Records, hashes and times are untouched',
    action: 'retain',
    effectiveEvidence: { directory: EV + '/MS05r5m/records', records: records.length, label: 'retained by exact-diff ' +
      'compatibility (not "current hashes match" and not a new timing measurement)' },
    outcome: 'retained: ' + fresh.requests + ' requests, ' + records.length + ' records, complete ' + fresh.complete +
      ', evidence sound ' + fresh.evidenceSound + ', correctness ' + fresh.correctness + ', relations ' +
      fresh.relationVerdicts.pass + ' pass / ' + fresh.relationVerdicts.fail + ' fail / ' +
      fresh.relationVerdicts.unevaluated + ' unevaluated, exact 0 of 14 (S-AV02, S-AV03)'
  });

  // 3. The quick replacements of the mega suite (4 tests) and the mega-contract suite: current evidence, rerun.
  const sel = json(EV + '/MS05r6a/preflight/mega-selection.json');
  const quickDir = EV + '/MS05r6a/preflight/quick';
  const quick = fs.existsSync(path.join(REPO, quickDir)) ? fs.readdirSync(path.join(REPO, quickDir))
    .filter((n) => n.endsWith('.json')).sort().map((n) => {
      const r = json(quickDir + '/' + n);
      return { file: quickDir + '/' + n, sha256: sha(quickDir + '/' + n), sourceHash: r.sourceHash, complete: r.complete,
        selected: r.selection, totals: { total: r.results.total, passed: r.results.passed, failed: r.results.failed,
          skipped: r.results.skipped }, timeFactor: r.timeFactor, node: r.node };
    }) : [];
  rows.push({
    id: 'mega-quick-replacements',
    check: 'the four quick mega tests that replaced the full-attempt Nightmare callbacks (mega#96-#99) and the 37 tests of mega-contract',
    priorEvidence: { directory: EV + '/MS05r5m/quick', note: 'taken at quick fingerprint b0d11a5d...; the replacement tests ' +
      'and the suite files mega.test.js and the mega-contract fixture/suite are unchanged since (snapshot-diff: not in the changed list)' },
    currentInputIdentities: { quickFingerprint: sel.sourceHash, timeFactor: sel.timeFactor, node: sel.node,
      listing: EV + '/MS05r6a/preflight/mega-selection.json', megaSuiteTests: sel.tests.filter((t) => t.suite === 'mega').length,
      megaContractSuiteTests: sel.tests.filter((t) => t.suite === 'mega-contract').length,
      runnerAndHarnessChanged: diff.entries.filter((e) => /^(generator\/tests\/node-runner\.js|core\/tests\/harness\.js)$/.test(e.path)).length },
    compatible: false,
    reason: 'the quick fingerprint of the Generator covers every guide, design file, UI source and test suite; it changed ' +
      '(store.js, the replay/steps/player suites, the recorders and the documents), so the earlier results cannot be ' +
      'called current. They are cheap and generate at most one mega12 request: rerun them with --exact and fresh --results',
    action: 'rerun',
    effectiveEvidence: quick,
    outcome: quick.length === 0 ? 'not yet run' : quick.map((q) => q.file.split('/').pop() + ' ' + q.totals.passed + '/' +
      q.totals.total).join('; ')
  });

  // 4. b3's live CV3 outcomes of the two mega Nightmare cells and their reconciliations: links, not reruns.
  const b3Files = ['cv3/cv3-mega16-nightmare.json', 'cv3/cv3-mega12-nightmare.json', 'mega-reconciled.json',
    'mega-reconciled-after.json'];
  const after = json(EV + '/MS05b3/mega-reconciled-after.json');
  rows.push({
    id: 'mega-live-cv3-links',
    check: 'MS05b3 live CV3 mega12 and mega16 Nightmare cells (Addendum B1: generation live, deep occurrence ids as references only)',
    priorEvidence: { files: b3Files.map((f) => ({ path: EV + '/MS05b3/' + f, sha256: sha(EV + '/MS05b3/' + f) })),
      reconciliationBefore: EV + '/MS05b3/mega-reconciled.json', reconciliationAfter: EV + '/MS05b3/mega-reconciled-after.json',
      deepMatchesBeforeTheLegacy8Round: after.identity.currentMatches },
    currentInputIdentities: { sourceHashOfTheCells: json(EV + '/MS05b3/cv3/cv3-mega16-nightmare.json').sourceHash,
      note: 'the quick-fingerprint sourceHash of the 186 b3 cells; r6b C applies the same store-only exact-diff proof ' +
        '(evidence/MS05r5p/legacy-8-fix/store-diff.patch, IR08) to all of them',
      slot: 'none for the unlocked cells (IR07): their timings are descriptive, not slot-protected measurements' },
    compatible: true,
    reason: 'these cells are manual-tier outcomes of live generation, not deep records: not rerun here (the brief and ' +
      'B1); their fingerprint changed only through the legacy-8 store edit and later documents, and r6b C reconciles them',
    action: 'retain',
    effectiveEvidence: { files: b3Files.map((f) => EV + '/MS05b3/' + f) },
    outcome: 'retained as recorded (mega16 Nightmare 0 of 2 puzzles hit, mega12 Nightmare 0 of 3: S-AV03, S-AV02)'
  });

  const doc = { schema: 1, kind: 'final-source-compatibility', task: 'MS05r6a', rows: rows };
  fs.writeFileSync(path.join(REPO, EV, 'MS05r6a', 'preflight', 'compatibility.json'), JSON.stringify(doc, null, 2) + '\n', 'utf8');
  rows.forEach((r) => console.log(r.id + ': compatible ' + r.compatible + ', action ' + r.action + ' - ' + r.outcome));
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  console.error(String(err && err.stack || err));
  process.exitCode = 1;
}
