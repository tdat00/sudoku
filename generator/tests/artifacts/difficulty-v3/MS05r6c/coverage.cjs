#!/usr/bin/env node
'use strict';

/*
 * MS05r6c: the coverage reconciler of the final quick manifest. It checks the raw `--results` files of the shards of a
 * manifest (the shape of MS05r5's quick-manifest.json: per app an inventory, an identity and shards with their
 * expectedTestKeys) against the registration-only inventory of the same source. Nothing here runs a test.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6c/coverage.cjs --manifest=<manifest.json> --out=<new reconciled.json>
 *        [--app=generator|player]
 *
 * A shard result is ACCEPTED only when: its file exists and is schema 1 of the app; it is complete (every selected test
 * ran, no bail, no registration error, sources unchanged during the run); its sourceHash, Node and time factor are the
 * inventory's; the selection and the argv are the shard's; it has at least one test; and every row key
 * `(app, suite, ordinal)` with its full name is one of the shard's expected keys. Only accepted shards cover keys. The
 * coverage check is then over the whole inventory: every key exactly once, with no missing, duplicate or unexpected key
 * (a duplicate or unexpected row is reported even when its shard is otherwise accepted, and it makes the set incomplete).
 * A new skip (a skipped row whose inventory row is not skipped) is a problem. Failed rows are listed, never hidden, and the
 * verdict says whether the coverage is complete with every test passed, complete with failures, or incomplete.
 *
 * Exit code: 0 complete and every test passed; 1 complete with failed tests; 2 incomplete coverage or a problem.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const keyOf = (app, row) => app + '/' + row.suite + '/' + row.ordinal;

function argvWithoutOutput(argv) {
  return (argv || []).filter((a) => !/^--(results|verbose)(=|$)/.test(a));
}

/** Checks one shard result document; returns { reasons, rows } (rows only when the document is a usable result). */
function checkShard(app, section, shard, doc) {
  const reasons = [];
  if (doc === null || doc === undefined) return { reasons: ['the result file is missing'], rows: [] };
  if (doc.schema !== 1 || doc.app !== app) reasons.push('not a schema 1 result of ' + app);
  if (doc.complete !== true) reasons.push('complete is not true');
  if (doc.sourceStable !== true) reasons.push('sourceStable is not true');
  if (!doc.results || doc.results.bailed !== false) reasons.push('the run bailed or has no results');
  if (Array.isArray(doc.registrationErrors) ? doc.registrationErrors.length > 0 : !!doc.registrationErrors) {
    reasons.push('registration errors');
  }
  ['sourceHash', 'node', 'timeFactor'].forEach((field) => {
    if (doc[field] !== section[field]) reasons.push(field + ' differs from the inventory (mixed source)');
  });
  const rows = doc.results && Array.isArray(doc.results.tests) ? doc.results.tests : [];
  if (rows.length === 0) reasons.push('zero tests');
  if (doc.results && doc.results.total !== rows.length) reasons.push('results.total differs from the number of rows');
  if (doc.selection && doc.selection.count !== shard.expectedTestKeys.length) {
    reasons.push('the selection counts ' + doc.selection.count + ' tests, the shard expects ' +
      shard.expectedTestKeys.length);
  }
  if (JSON.stringify(argvWithoutOutput(doc.argv)) !== JSON.stringify(shard.args.slice(1))) {
    reasons.push('the argv is not the shard selector');
  }
  return { reasons: reasons, rows: rows };
}

/**
 * Reconciles one app. `load(shard)` returns the parsed result document of a shard or null when the file is missing.
 */
function reconcileApp(app, section, inventory, load) {
  const problems = [];
  const inventoryRows = new Map(inventory.tests.map((t) => [keyOf(app, t), t]));
  const covered = new Map();
  const duplicates = [];
  const unexpected = [];
  const failed = [];
  const shards = [];
  const counts = { total: 0, passed: 0, failed: 0, skipped: 0 };
  section.shards.forEach((shard) => {
    const doc = load(shard);
    const checked = checkShard(app, section, shard, doc);
    const expected = new Map(shard.expectedTestKeys.map((r) => [r.key, r.fullName]));
    const seen = new Set();
    const reasons = checked.reasons.slice();
    const tally = { tests: checked.rows.length, passed: 0, failed: 0, skipped: 0 };
    const shardFailed = [];
    const shardKeys = [];
    checked.rows.forEach((row) => {
      const key = keyOf(app, row);
      if (seen.has(key)) {
        duplicates.push({ key: key, shards: [shard.id, shard.id], reason: 'repeated inside one result' });
        return;
      }
      seen.add(key);
      if (!expected.has(key)) {
        unexpected.push({ key: key, shard: shard.id, reason: 'not an expected key of the shard' });
        return;
      }
      if (expected.get(key) !== row.fullName) {
        reasons.push(key + ': the full name differs from the manifest');
        return;
      }
      const inv = inventoryRows.get(key);
      if (!inv || inv.fullName !== row.fullName) {
        unexpected.push({ key: key, shard: shard.id, reason: 'not in the inventory' });
        return;
      }
      if (row.status === 'pass') tally.passed++;
      else if (row.status === 'fail') {
        tally.failed++;
        shardFailed.push({ key: key, shard: shard.id, fullName: row.fullName, error: row.error || null });
      } else if (row.status === 'skip') {
        tally.skipped++;
        if (inv.skipped !== true) reasons.push(key + ': a new skip (the inventory row is not skipped)');
      } else reasons.push(key + ': unknown status ' + row.status);
      shardKeys.push(key);
    });
    expected.forEach((name, key) => {
      if (!seen.has(key)) reasons.push(key + ': expected but missing from the result');
    });
    const accepted = reasons.length === 0;
    shards.push({ id: shard.id, resultPath: shard.resultPath, accepted: accepted, reasons: reasons,
      tests: tally.tests, passed: tally.passed, failed: tally.failed, skipped: tally.skipped,
      wallMs: doc && typeof doc.wallMs === 'number' ? doc.wallMs : null,
      resultsMs: doc && doc.results && typeof doc.results.ms === 'number' ? doc.results.ms : null,
      sourceHash: doc ? doc.sourceHash : null });
    if (accepted) {
      shardKeys.forEach((key) => {
        if (covered.has(key)) duplicates.push({ key: key, shards: [covered.get(key), shard.id], reason: 'in two shards' });
        else covered.set(key, shard.id);
      });
      counts.total += tally.tests;
      counts.passed += tally.passed;
      counts.failed += tally.failed;
      counts.skipped += tally.skipped;
      shardFailed.forEach((f) => failed.push(f));
    }
  });
  const missing = [];
  inventoryRows.forEach((row, key) => {
    if (!covered.has(key)) missing.push({ key: key, fullName: row.fullName });
  });
  shards.filter((s) => !s.accepted).forEach((s) => problems.push(s.id + ': ' + s.reasons.join('; ')));
  if (duplicates.length + unexpected.length > 0) {
    problems.push(duplicates.length + ' duplicate and ' + unexpected.length + ' unexpected key(s)');
  }
  const complete = missing.length === 0 && duplicates.length === 0 && unexpected.length === 0 &&
    shards.every((s) => s.accepted);
  let verdict = 'incomplete';
  if (complete) verdict = counts.failed === 0 && counts.skipped === 0 ? 'complete-green' : 'complete-with-failures';
  return { inventoryPath: section.inventoryPath, inventoryTests: inventoryRows.size, sourceHash: section.sourceHash,
    node: section.node, timeFactor: section.timeFactor, verdict: verdict, counts: counts, shards: shards,
    coverage: { missing: missing, duplicates: duplicates, unexpected: unexpected }, failed: failed,
    problems: problems };
}

function exitCodeOf(report) {
  const verdicts = Object.keys(report.apps).map((app) => report.apps[app].verdict);
  if (verdicts.some((v) => v === 'incomplete')) return 2;
  return verdicts.every((v) => v === 'complete-green') ? 0 : 1;
}

function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''));
}

function inside(abs) {
  const rel = path.relative(ROOT, abs);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function main(argv) {
  let manifestArg = null;
  let outArg = null;
  let only = null;
  argv.forEach((arg) => {
    let m;
    if ((m = /^--manifest=(.+)$/.exec(arg))) manifestArg = m[1];
    else if ((m = /^--out=(.+)$/.exec(arg))) outArg = m[1];
    else if ((m = /^--app=(generator|player)$/.exec(arg))) only = m[1];
    else throw new Error('unknown argument ' + arg);
  });
  if (!manifestArg || !outArg) throw new Error('usage: --manifest=<manifest.json> --out=<new file.json> [--app=...]');
  const manifestAbs = path.resolve(process.cwd(), manifestArg);
  const outAbs = path.resolve(process.cwd(), outArg);
  if (!inside(manifestAbs) || !inside(outAbs)) throw new Error('paths must be inside the repository');
  if (fs.existsSync(outAbs)) throw new Error(outArg + ' exists already (an evidence file is never overwritten)');
  const manifest = readJson(manifestAbs);
  const report = { schema: 1, kind: 'quick-coverage', manifest: path.relative(ROOT, manifestAbs).split(path.sep).join('/'),
    apps: {}, rule: 'accepted shards only; key = (app, suite, ordinal) with the full name; every inventory key once' };
  Object.keys(manifest.apps).filter((app) => !only || app === only).forEach((app) => {
    const section = manifest.apps[app];
    const inventory = readJson(path.join(ROOT, section.inventoryPath));
    report.apps[app] = reconcileApp(app, section, inventory, (shard) => {
      const abs = path.join(ROOT, shard.resultPath);
      return fs.existsSync(abs) ? readJson(abs) : null;
    });
  });
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(report, null, 2).replace(/\n/g, '\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  Object.keys(report.apps).forEach((app) => {
    const a = report.apps[app];
    console.log(app + ': ' + a.verdict + ', ' + a.counts.total + ' of ' + a.inventoryTests + ' tests in ' +
      a.shards.filter((s) => s.accepted).length + ' of ' + a.shards.length + ' accepted shards; passed ' + a.counts.passed +
      ', failed ' + a.counts.failed + ', skipped ' + a.counts.skipped + '; missing ' + a.coverage.missing.length +
      ', duplicates ' + a.coverage.duplicates.length + ', unexpected ' + a.coverage.unexpected.length);
    a.problems.forEach((p) => console.log('  PROBLEM: ' + p));
    a.failed.forEach((f) => console.log('  FAILED: ' + f.key + ' ' + f.fullName));
  });
  console.log('written: ' + outArg);
  return exitCodeOf(report);
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(String(err && err.message || err));
    process.exitCode = 2;
  }
}

module.exports = { reconcileApp: reconcileApp, checkShard: checkShard, exitCodeOf: exitCodeOf };
