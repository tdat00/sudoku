#!/usr/bin/env node
'use strict';

/*
 * MS05r6b: writes evidence/MS05r6b/quick/final-manifest.json, the manifest handed to MS05r6c: per app the frozen identity,
 * and per shard the exact command, its suites, the test count, the executed outcome and the process seconds. The final full
 * names are those of quick-manifest.json (`expectedTestKeys`), the migration from the draft is inventory-migration.json and
 * the executed status is reconciled.json; this file only joins them. Read-only apart from its output; no generation.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6b/final-manifest.cjs --out=<new project-relative .json>
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EV = 'docs/difficulty-v3/evidence/MS05r6b/';
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));

function main(argv) {
  const arg = (name, fallback) => { const hit = argv.find((a) => a.indexOf('--' + name + '=') === 0); return hit ? hit.slice(name.length + 3) : fallback; };
  const outArg = arg('out', '');
  const quickDir = arg('quick', 'quick');
  const costFile = arg('cost', 'standing-quick-cost.json');
  if (!outArg) throw new Error('usage: --out=<new project-relative .json> [--quick=<dir>] [--cost=<file>]');
  const outAbs = path.resolve(process.cwd(), outArg);
  if (fs.existsSync(outAbs)) throw new Error(outArg + ' exists already (an evidence file is never overwritten)');
  const manifest = json(EV + quickDir + '/quick-manifest.json');
  const rec = json(EV + quickDir + '/reconciled.json');
  const cost = json(EV + costFile);
  const migration = json(EV + quickDir + '/inventory-migration.json');
  const out = { schema: 1, kind: 'final-quick-manifest', task: 'MS05r6b', forTask: 'MS05r6c',
    note: 'Selectors are exact commands run from the app folder; full names are those of quick-manifest.json (expectedTestKeys). A shard is a whole-suite selector, so a CI group may use the same --suite lists. The executed outcome is from reconciled.json.',
    manifest: EV + quickDir + '/quick-manifest.json', reconciliation: EV + quickDir + '/reconciled.json',
    migration: EV + quickDir + '/inventory-migration.json', standingCost: EV + costFile,
    inventoryMigration: { generator: { oldTests: migration.generator.oldTests, finalTests: migration.generator.finalTests,
      unchangedName: migration.generator.identicalName, renamed: migration.generator.renamed, added: migration.generator.added },
      player: { oldTests: migration.player.oldTests, finalTests: migration.player.finalTests } },
    apps: {} };
  Object.keys(manifest.apps).forEach((app) => {
    const section = manifest.apps[app];
    const a = rec.apps[app];
    out.apps[app] = {
      sourceHash: section.sourceHash, node: section.node, timeFactor: section.timeFactor, inventory: section.inventoryPath,
      verdict: a.verdict, counts: a.counts, shards: section.shards.map((s) => {
        const r = a.shards.filter((x) => x.id === s.id)[0];
        const c = cost.apps[app].perShard.filter((x) => x.id === s.id)[0];
        const suites = (s.args.filter((x) => /^--suite=/.test(x))[0] || '').replace(/^--suite=/, '');
        return { id: s.id, command: 'node ' + s.args.join(' '), suites: suites === '' ? 'all' : suites.split(','),
          tests: s.expectedTestKeys.length, resultPath: s.resultPath, accepted: r.accepted, passed: r.passed, failed: r.failed,
          skipped: r.skipped, processSeconds: c.processSeconds, projectionSeconds: s.projectionSeconds };
      }), failed: a.failed.map((f) => f.key + ' ' + f.fullName) };
  });
  fs.writeFileSync(outAbs, JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  Object.keys(out.apps).forEach((app) => console.log(app + ': ' + out.apps[app].verdict + ', ' + out.apps[app].shards.length + ' shards'));
  console.log('written: ' + outArg);
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 2;
}
