#!/usr/bin/env node
'use strict';

/*
 * MS05r6b, C (IR08): builds evidence/MS05r6b/gd/manual-compatibility.json, the exact-diff proof that MS05b3's 186 manual
 * results (53 I5, 118 CV3 level, 15 refusal rows; evidence fingerprint c3035e80) stand on the final tree. Nothing is typed in
 * by hand: every identity is read from the files it names, and the classification of each changed fingerprint file is
 * computed from its path and from static scans of the code the manual selections execute. Read-only apart from its one
 * output file; no generation.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6b/manual-compat.cjs --out=<new project-relative .json>
 *
 * The fingerprint of a manual-suite cell (`sourceHash` of its `--list-tests` and `--results`) hashes 167 files: the runner,
 * the harness, the engine and UI sources, the fixtures, the quick suites, the guides, the design and `generator/tests/manual`.
 * The b3 listing of one cell (`evidence/MS05b3/selectors/i5-killer-veryEasy.json`) carries the per-file hashes of b3's
 * state; a listing of the same selector on the final tree (`gd/manual-current-listing.json`) carries the current ones. The
 * difference of the two file lists is the complete changed-file list. A changed file keeps the 186 results valid only when it
 * is not executed by the manual selections: the one changed runtime file, `generator/js/ui/store.js`, is shown to be
 * the exact diff of `MS05r5p/legacy-8-fix/store-diff.patch` and to be referenced by no engine, variant, core, fixture or
 * manual-suite code; everything else is a document, a quick suite, a recorder or tool file or a published data fixture that
 * no selected manual suite reads. Exit 0 when every changed file is accounted for, 1 otherwise.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EV = 'docs/difficulty-v3/evidence/';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel).replace(/^\uFEFF/, ''));
const lf = (text) => text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');

function walk(dir, out) {
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach((entry) => {
    const rel = dir + '/' + entry.name;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.js$/.test(entry.name)) out.push(rel);
  });
  return out;
}

function changeLines(patch) {
  return lf(patch).split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---) /.test(l));
}

function classify(file, sourceFiles) {
  if (/^(AGENTS|README)\.md$|^(USERGUIDE|DEVELOPERGUIDE)(\.vn)?\.md$|\/design\.md$/.test(file)) return 'document';
  if (/^generator\/tests\/suites\/.+\.test\.js$|^core\/tests\/suites\/.+\.test\.js$|^player\/tests\/suites\//.test(file)) {
    return 'quick-suite';
  }
  if (/^generator\/tests\/fixtures\/(replay-wire|replay-goldens|regression)\.js$/.test(file)) return 'published-data-fixture';
  if (/^generator\/tests\/(replay-fixtures|replay-goldens|soak|perf|qualify)\.js$|^generator\/tests\/fixtures\/(replay-recording|tool-records|perf-helper)\.js$/.test(file)) {
    return 'recorder-or-tool-script';
  }
  if (/^generator\/tests\/manual\/|^generator\/tests\/fixtures\/manual-corpus\.js$/.test(file)) return 'manual-suite-or-helper';
  if (sourceFiles.indexOf(file.replace(/^generator\//, '')) !== -1 || /^core\/js\//.test(file)) return 'runtime-source';
  return 'other';
}

function main(argv) {
  const arg = (name, fallback) => { const hit = argv.find((a) => a.indexOf('--' + name + '=') === 0); return hit ? hit.slice(name.length + 3) : fallback; };
  const outArg = arg('out', '');
  const nowListing = arg('now', 'MS05r6b/gd/manual-current-listing.json');
  const mode = arg('mode', 'b3');
  if (!outArg || (mode !== 'b3' && mode !== 'gd')) throw new Error('usage: --out=<new .json> [--now=<listing under evidence/>] [--mode=b3|gd]');
  const outAbs = path.resolve(process.cwd(), outArg);
  if (fs.existsSync(outAbs)) throw new Error(outArg + ' exists already (an evidence file is never overwritten)');

  const before = mode === 'gd' ? json(EV + 'MS05r6b/gd/manual-current-listing.json') : json(EV + 'MS05b3/selectors/i5-killer-veryEasy.json');
  const now = json(EV + nowListing);
  const beforeFiles = new Map(before.files.map((f) => [f.path, f.hash]));
  const nowFiles = new Map(now.files.map((f) => [f.path, f.hash]));
  const changed = [];
  const added = [];
  const removed = [];
  nowFiles.forEach((hash, file) => {
    if (!beforeFiles.has(file)) added.push(file);
    else if (beforeFiles.get(file) !== hash) changed.push(file);
  });
  beforeFiles.forEach((hash, file) => {
    if (!nowFiles.has(file)) removed.push(file);
  });

  // The 186 results of MS05b3: one fingerprint, Node, factor, stable and complete.
  const cells = mode === 'gd'
    ? json(EV + 'MS05r6b/gd/gd-manifest.json').apps.generator.shards.filter((s) => !s.outstanding).map((s) => ({ id: s.id, kind: 'gd',
      resultsPath: s.resultPath, status: 'ran' }))
    : json(EV + 'MS05b3/outcomes.json').outcomes;
  const resultFiles = cells.map((c) => ({ id: c.id, kind: c.kind, path: mode === 'gd' ? c.resultsPath : EV + 'MS05b3/' + c.resultsPath, status: c.status }));
  const identities = new Map();
  const problems = [];
  resultFiles.forEach((cell) => {
    if (!fs.existsSync(path.join(ROOT, cell.path))) {
      problems.push('missing result ' + cell.path);
      return;
    }
    const doc = json(cell.path);
    const key = [doc.sourceHash, doc.node, doc.timeFactor, doc.complete, doc.sourceStable].join('|');
    identities.set(key, (identities.get(key) || 0) + 1);
    if (mode === 'b3' && (doc.selection.count !== 1 || doc.results.total !== 1)) problems.push(cell.id + ': selected total is not 1');
    if (doc.sourceHash !== before.sourceHash) problems.push(cell.id + ': the result fingerprint is not the original one');
  });
  const kinds = {};
  cells.forEach((c) => { kinds[c.kind] = (kinds[c.kind] || 0) + 1; });
  const statuses = {};
  cells.forEach((c) => { statuses[c.status] = (statuses[c.status] || 0) + 1; });

  // The one changed runtime file against the exact patch.
  const sourceFiles = (/const SOURCE_FILES = \[([\s\S]*?)\];/.exec(read('generator/tests/node-runner.js'))[1]
    .match(/'[^']+'/g) || []).map((s) => s.slice(1, -1));
  const patch = read(EV + 'MS05r5p/legacy-8-fix/store-diff.patch');
  const diffs = json(EV + 'MS05r6b/deep/snapshot-diff.json');
  const storeDiff = diffs.expectedPatches.filter((p) => p.path === 'generator/js/ui/store.js')[0];
  const storeSha = sha(lf(read('generator/js/ui/store.js')));

  // What the manual selections execute: a scan for the store and the changed fixtures, everywhere they could be reached.
  const scanDirs = ['generator/js/engine', 'generator/js/variants', 'core/js'];
  const scanFiles = [].concat(...scanDirs.map((d) => walk(d, [])), ['generator/tests/fixtures/manual-corpus.js'],
    walk('generator/tests/manual', []).filter((f) => !/perf\.test\.js$/.test(f)));
  const tokens = ['storedAttempts', 'SG.store', 'localStorage', 'SG.fixtures.regression', 'SG.fixtures.replayWire',
    'SG.fixtures.replayGoldens', 'SG.fixtures.replayRecording', 'SG.fixtures.toolRecords'];
  const hits = [];
  scanFiles.forEach((file) => {
    const text = read(file);
    tokens.forEach((token) => {
      if (text.indexOf(token) !== -1) hits.push({ file: file, token: token });
    });
  });
  // wordoku.test.js names 'localStorage' only inside a list of tokens that its own check forbids in the variant's code.
  const realHits = hits.filter((h) => !(h.file === 'generator/tests/manual/wordoku.test.js' && h.token === 'localStorage'));

  const rows = changed.concat(added, removed).sort().map((file) => ({
    file: file, status: changed.indexOf(file) !== -1 ? 'changed' : added.indexOf(file) !== -1 ? 'added' : 'removed',
    category: classify(file, sourceFiles), beforeHash: beforeFiles.get(file) || null, nowHash: nowFiles.get(file) || null
  }));
  const byCategory = {};
  rows.forEach((r) => { byCategory[r.category] = (byCategory[r.category] || 0) + 1; });
  const runtime = rows.filter((r) => r.category === 'runtime-source');
  const manualFiles = rows.filter((r) => r.category === 'manual-suite-or-helper');
  const other = rows.filter((r) => r.category === 'other');
  const runtimeIsStoreOnly = mode === 'gd' ? runtime.length === 0 : runtime.length === 1 && runtime[0].file === 'generator/js/ui/store.js';
  const storeProof = mode === 'gd' ? true : storeDiff && storeDiff.equal === true && changeLines(patch).length === storeDiff.changeLines;
  const accounted = problems.length === 0 && runtimeIsStoreOnly && storeProof && realHits.length === 0 &&
    manualFiles.length === 0 && other.length === 0 && identities.size === 1;

  const doc = {
    schema: 1, kind: 'manual-compatibility', task: 'MS05r6b', rule: mode === 'gd' ? 'test-only exact-diff proof for the classic9 GD results (22 executed shards of gd/gd-manifest.json)' : 'IR08 exact-diff proof for the 186 manual results of MS05b3', mode: mode,
    originalFingerprint: before.sourceHash, currentFingerprint: now.sourceHash,
    fingerprintFiles: { before: before.files.length, now: now.files.length },
    listings: { before: mode === 'gd' ? EV + 'MS05r6b/gd/manual-current-listing.json' : EV + 'MS05b3/selectors/i5-killer-veryEasy.json', now: EV + nowListing },
    b3Results: { cells: cells.length, kinds: kinds, statuses: statuses, identities: Array.from(identities.entries())
      .map((e) => { const p = e[0].split('|'); return { sourceHash: p[0], node: p[1], timeFactor: Number(p[2]), complete: p[3],
        sourceStable: p[4], cells: e[1] }; }), manifest: EV + 'MS05b3/manifest.json', outcomes: EV + 'MS05b3/outcomes.json',
      deferred: EV + 'MS05b3/deferred-cv3.json', resultsUnchanged: 'preserved byte for byte; read, never written' },
    changedFiles: { changed: changed.length, added: added.length, removed: removed.length, byCategory: byCategory, rows: rows },
    runtimeFile: { path: 'generator/js/ui/store.js', onlyChangedRuntimeSource: runtimeIsStoreOnly,
      exactPatch: EV + 'MS05r5p/legacy-8-fix/store-diff.patch', patchChangeLines: changeLines(patch).length,
      snapshotDiff: EV + 'MS05r6b/deep/snapshot-diff.json', sameChangeLinesAsSnapshotDiff: storeDiff ? storeDiff.equal : null,
      producerSnapshot: 'refs/dv3-wip/MS05r5m-done-20261114-0230 (ad77fdf)', storeSha256Lf: storeSha },
    executionScan: { directories: scanDirs.concat(['generator/tests/fixtures/manual-corpus.js',
      'generator/tests/manual (all but perf.test.js, not part of any b3 or GD selection)']), filesScanned: scanFiles.length,
      tokens: tokens, hits: hits, hitsExplained: hits.filter((h) => realHits.indexOf(h) === -1).map((h) => ({ file: h.file,
        token: h.token, reason: 'a list of forbidden tokens that the wordoku suite checks the variant source against' })),
      unexplainedHits: realHits },
    proof: [
      'The ' + cells.length + ' results carry one fingerprint (' + before.sourceHash.slice(0, 8) + '), Node, time factor and stability' + (mode === 'b3' ? ', selected total 1 each.' : '.'),
      'The fingerprint files that differ now are listed with their category; none is a manual suite or manual helper, an engine, a variant or a core source.',
      'The only changed runtime source is generator/js/ui/store.js, whose diff has the same +/- lines as store-diff.patch (storedAttempts: an unmarked legacy 8 is the default on every board).',
      'No engine, variant, core, manual-suite or manual-helper code references SG.store, storedAttempts, localStorage or the changed data fixtures: SG.pipeline.run and the manual corpora do not read sg.lastConfig.v1.',
      'The other changes are documents, quick suites, recorder and tool scripts and published data fixtures (E publication), which no selected manual suite executes or reads.'
    ],
    accounted: accounted, problems: problems
  };
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(doc, null, 2).replace(/\n/g, '\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  console.log('fingerprint ' + before.sourceHash.slice(0, 8) + ' -> ' + now.sourceHash.slice(0, 8) + ': ' + changed.length +
    ' changed, ' + added.length + ' added, ' + removed.length + ' removed of ' + before.files.length + ' files; categories ' +
    JSON.stringify(byCategory));
  console.log('b3 results: ' + cells.length + ' cells ' + JSON.stringify(kinds) + ' ' + JSON.stringify(statuses) +
    '; identities ' + identities.size);
  console.log('runtime store-only ' + runtimeIsStoreOnly + ', store patch equal ' + storeProof + ', scan hits ' + hits.length +
    ' (unexplained ' + realHits.length + '), accounted ' + accounted);
  problems.forEach((p) => console.log('PROBLEM: ' + p));
  console.log('written: ' + outArg);
  return accounted ? 0 : 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 2;
}
