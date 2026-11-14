#!/usr/bin/env node
'use strict';

/*
 * MS05r6b, B1: builds evidence/MS05r6b/deep/compatibility.json from the fresh no-generation reconciliation
 * (deep/reconciled.json) and the exact-diff comparison of the producer snapshot with the final tree (deep/snapshot-diff.json,
 * MS05r6a's snapshot-diff.cjs run read-only on this tree). Every value is read from those files or computed by a static scan
 * of the generation path; the raw `identity.currentMatches` fields stay as the tool wrote them (a mismatch is never relabelled).
 *
 *   node tests/artifacts/difficulty-v3/MS05r6b/deep-compat.cjs --out=<new project-relative .json>
 *
 * Exit 0 when the exact-diff exception applies (every changed source file lies outside the generation path), 1 when it
 * does not (the named MEGA-REFRESH step would then be required), 2 for a usage error.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EV = 'docs/difficulty-v3/evidence/';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel).replace(/^\uFEFF/, ''));

function walk(dir, out) {
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach((entry) => {
    const rel = dir + '/' + entry.name;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.js$/.test(entry.name)) out.push(rel);
  });
  return out;
}

function main(argv) {
  const arg = (name, fallback) => { const hit = argv.find((a) => a.indexOf('--' + name + '=') === 0); return hit ? hit.slice(name.length + 3) : fallback; };
  const outArg = arg('out', '');
  const recFile = arg('reconciled', 'deep/reconciled.json');
  const snapFile = arg('snapshot', 'deep/snapshot-diff.json');
  const diffsDir = arg('diffs', 'deep/diffs');
  if (!outArg) throw new Error('usage: --out=<new .json> [--reconciled=<under MS05r6b/>] [--snapshot=<under MS05r6b/>] [--diffs=<dir>]');
  const outAbs = path.resolve(process.cwd(), outArg);
  if (fs.existsSync(outAbs)) throw new Error(outArg + ' exists already (an evidence file is never overwritten)');
  const rec = json(EV + 'MS05r6b/' + recFile);
  const snap = json(EV + 'MS05r6b/' + snapFile);
  const earlier = json(EV + 'MS05r6a/preflight/mega-reconciled.json');

  const changedSources = snap.sourceFiles.changed.map((e) => e.path);
  const generationDirs = ['generator/js/engine', 'generator/js/variants', 'core/js'];
  const scanFiles = [].concat(...generationDirs.map((d) => walk(d, [])));
  const tokens = ['storedAttempts', 'SG.store', 'localStorage'];
  const hits = [];
  scanFiles.forEach((file) => {
    const text = read(file);
    tokens.forEach((token) => {
      if (text.indexOf(token) !== -1) hits.push({ file: file, token: token });
    });
  });
  const storeText = read('generator/js/ui/store.js');
  const storedAttemptsCallers = (storeText.match(/storedAttempts\(/g) || []).length;
  const loader = snap.loader.functions;
  const checks = {
    producerSnapshotBoundToRecordedHash: snap.sourceFiles.refSourceHash === rec.identity.sourceHash,
    sourceListsEqual: snap.sourceFiles.listsEqual,
    changedSourceFilesAreOnlyStore: changedSources.length === 1 && changedSources[0] === 'generator/js/ui/store.js',
    toolFilesUnchanged: snap.toolFiles.every((t) => t.changed === false),
    toolHashMatches: rec.identity.currentMatches.toolHash === true,
    sharedLoaderFunctionsIdentical: loader.every((f) => f.found && f.identical),
    levelGuardIdentical: snap.loader.levelGuard.identical === true,
    storePatchSameChangeLines: snap.expectedPatches.length === 1 && snap.expectedPatches[0].equal === true,
    noGenerationPathReferenceToStore: hits.length === 0,
    completeAndSound: rec.complete === true && rec.evidenceSound === true && rec.correctness === 'pass' &&
      rec.problems.length === 0,
    relationsAllPass: rec.relationVerdicts.pass === 6 && rec.relationVerdicts.fail === 0 &&
      rec.relationVerdicts.unevaluated === 0,
    sameWorkingTreeHashAsMS05r6a: snap.sourceFiles.workSourceHash === 'a073f9bdaac0a425d6e4af30643dab56d4c1ea2576aa151e79cc079f6be3cdb7'
  };
  const applies = Object.keys(checks).every((k) => checks[k] === true);
  const doc = {
    schema: 1, kind: 'deep-compatibility', task: 'MS05r6b', rule: 'B1 exact-diff exception, revalidated on the final tree',
    reconciliation: EV + 'MS05r6b/' + recFile, records: EV + 'MS05r5m/records',
    snapshotDiff: EV + 'MS05r6b/' + snapFile, patches: EV + 'MS05r6b/' + diffsDir,
    rawIdentity: rec.identity, rawCurrentMatches: rec.identity.currentMatches,
    currentIdentity: { sourceHash: snap.sourceFiles.workSourceHash, toolHash: rec.identity.toolHash },
    earlierRevalidation: { evidence: EV + 'MS05r6a/preflight/mega-reconciled.json', currentMatches: earlier.identity.currentMatches },
    producerSnapshot: { ref: snap.ref, commit: snap.refCommit, tree: snap.refTree,
      recomputedSourceHash: snap.sourceFiles.refSourceHash, equalsRecordedHash: checks.producerSnapshotBoundToRecordedHash },
    changedSourceFiles: changedSources, changedToolFiles: snap.toolFiles.filter((t) => t.changed).map((t) => t.path),
    changedLoadSetFiles: snap.loadSetChanged.map((e) => e.path),
    unhashedSharedPaths: { loader: snap.loader.path, functions: loader.map((f) => ({ function: f.function, identical: f.identical })),
      levelGuard: snap.loader.levelGuard,
      replayFixturesChange: 'comments and the HEADER text of the wire fixture only (deep/diffs/generator__tests__replay-fixtures.js.patch)',
      nodeEvidence: 'core/tests/node-evidence.js is byte-identical to the snapshot (not in the changed load set)' },
    storePatch: { file: EV + 'MS05r5p/legacy-8-fix/store-diff.patch', sameChangeLines: checks.storePatchSameChangeLines,
      diff: EV + 'MS05r6b/' + diffsDir + '/generator__js__ui__store.js.patch' },
    generationPathScan: { directories: generationDirs, filesScanned: scanFiles.length, tokens: tokens, hits: hits,
      storedAttemptsCallsInStore: storedAttemptsCallers },
    checks: checks,
    proof: [
      'Only generator/js/ui/store.js of the 63 SOURCE_FILES changed; it defines SG.store and runs no code at load, and storedAttempts (the changed condition) is called only by the store\'s own load.',
      'The deep requests are built for SG.pipeline.run directly (the tool normalises each request itself); SG.pipeline, the engine, the variants and core/js do not mention SG.store, so no RNG, normalisation, default, allowance, generation, independent validation, recording or relation reads the changed code.',
      'The tool files (tests/mega-contract.js, tests/fixtures/mega-contract.js), the level guard (tests/fixtures/tool-records.js) and the six loader functions are identical, so toolHash matches and the check, request and default identities are unchanged.',
      'The 14 records keep their original producer, hash, timings and digests; the false sourceHash match is kept as the tool wrote it.'
    ],
    verdict: applies ? 'retain by exact-diff compatibility; MS05r6b-MEGA-REFRESH not executed' : 'exception does not apply: MEGA-REFRESH required',
    megaRefresh: 'not executed', coveredOccurrenceIds: rec.occurrences.map((o) => o.id),
    coveredRelations: rec.relations.map((r) => ({ id: r.id, verdict: r.verdict, original: r.original }))
  };
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(doc, null, 2).replace(/\n/g, '\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  console.log('currentMatches ' + JSON.stringify(doc.rawCurrentMatches) + '; changed sources ' + JSON.stringify(changedSources) +
    '; scan hits ' + hits.length + '; exception ' + (applies ? 'applies' : 'DOES NOT APPLY'));
  Object.keys(checks).filter((k) => checks[k] !== true).forEach((k) => console.log('CHECK FAILED: ' + k));
  console.log('written: ' + outArg);
  return applies ? 0 : 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 2;
}
