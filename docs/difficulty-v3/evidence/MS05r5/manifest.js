#!/usr/bin/env node
'use strict';

/*
 * MS05r5: builds and checks the draft quick-test shard manifest (quick-manifest.json) from the inventories.
 * Built-in modules only; the plan (shard-plan.json) says which shards exist, the preflight files
 * (preflight/<app>-<id>.json, written by `node tests/node-runner.js <the shard's selector> --list-tests=...`) say
 * which tests each shard selects. The rows, not the spelling of a selector, define the coverage.
 *
 *   node manifest.js --build   write quick-manifest.json (refuses to overwrite) and check it
 *   node manifest.js --check   check the written quick-manifest.json against its inventories and preflights
 *
 * Run from anywhere. Exit 0 only when, in each app, the disjoint union of the shards equals the no-options quick
 * inventory (no missing, duplicate or unexpected test key), every file belongs to one frozen source identity and
 * every inventory and preflight is complete. Nothing here runs a test.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const REPO = path.resolve(HERE, '..', '..', '..', '..');
const PLAN = path.join(HERE, 'shard-plan.json');
const MANIFEST = path.join(HERE, 'quick-manifest.json');

function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, ''));
}

function sha256(abs) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
}

const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');
const keyOf = (app, row) => app + '/' + row.suite + '/' + row.ordinal;

/** The rows of a preflight or inventory file as [{ key, fullName }], after checking its identity. */
function rowsOf(app, abs, inventory, problems) {
  const doc = readJson(abs);
  const where = rel(abs);
  if (doc.schema !== 1 || doc.app !== app) problems.push(where + ': not a schema 1 file of ' + app);
  if (doc.complete !== true) problems.push(where + ': not complete (registration errors)');
  if (doc.registrationErrors && doc.registrationErrors.length > 0) problems.push(where + ': registration errors');
  if (inventory) {
    ['sourceHash', 'node', 'timeFactor'].forEach((field) => {
      if (doc[field] !== inventory[field]) problems.push(where + ': ' + field + ' differs from the inventory');
    });
    const full = new Map(inventory.tests.map((t) => [keyOf(app, t), t.fullName]));
    doc.tests.forEach((t) => {
      if (full.get(keyOf(app, t)) !== t.fullName) problems.push(where + ': ' + keyOf(app, t) + ' differs from the inventory');
    });
  }
  return { doc: doc, rows: doc.tests.map((t) => ({ key: keyOf(app, t), fullName: t.fullName })) };
}

function checkApp(app, section, plan, problems) {
  const inventoryAbs = path.join(REPO, section.inventoryPath);
  const inventory = readJson(inventoryAbs);
  rowsOf(app, inventoryAbs, null, problems);
  if (section.inventoryHash !== sha256(inventoryAbs)) problems.push(section.inventoryPath + ': inventoryHash is stale');
  if (section.sourceHash !== inventory.sourceHash || section.node !== inventory.node ||
      section.timeFactor !== inventory.timeFactor) problems.push(app + ': identity differs from its inventory');
  const all = new Map(inventory.tests.map((t) => [keyOf(app, t), t.fullName]));
  const owners = new Map();
  section.shards.forEach((shard) => {
    const preflight = rowsOf(app, path.join(HERE, 'preflight', app + '-' + shard.id + '.json'), inventory, problems);
    const given = JSON.stringify(shard.expectedTestKeys);
    if (given !== JSON.stringify(preflight.rows)) problems.push(app + '/' + shard.id + ': expectedTestKeys differ from its preflight');
    const wanted = shard.args.concat(['--list-tests=<file>']);
    const argv = preflight.doc.argv.map((a) => (/^--list-tests=/.test(a) ? '--list-tests=<file>' : a));
    if (JSON.stringify(argv) !== JSON.stringify(wanted.slice(1))) problems.push(app + '/' + shard.id + ': args differ from the preflight command');
    shard.expectedTestKeys.forEach((row) => {
      if (!owners.has(row.key)) owners.set(row.key, []);
      owners.get(row.key).push(shard.id);
    });
  });
  const coverage = { missing: [], duplicates: [], unexpected: [] };
  all.forEach((name, key) => { if (!owners.has(key)) coverage.missing.push(key); });
  owners.forEach((ids, key) => {
    if (ids.length > 1) coverage.duplicates.push({ key: key, shards: ids });
    if (!all.has(key)) coverage.unexpected.push(key);
  });
  return { coverage: coverage, tests: all.size, claimed: owners.size };
}

function build(plan, problems) {
  const manifest = { schema: 1, status: 'planned', plan: rel(PLAN), apps: {} };
  Object.keys(plan.apps).forEach((app) => {
    const spec = plan.apps[app];
    const inventoryAbs = path.join(REPO, spec.inventoryPath);
    const inventory = readJson(inventoryAbs);
    manifest.apps[app] = {
      inventoryPath: spec.inventoryPath, inventoryHash: sha256(inventoryAbs), sourceHash: inventory.sourceHash,
      node: inventory.node, timeFactor: inventory.timeFactor,
      shards: spec.shards.map((shard) => ({
        id: shard.id, app: app, args: shard.args,
        expectedTestKeys: rowsOf(app, path.join(HERE, 'preflight', app + '-' + shard.id + '.json'), inventory,
          problems).rows,
        projectionSeconds: shard.projectionSeconds, projectionBasis: shard.projectionBasis,
        resultPath: 'docs/difficulty-v3/evidence/MS05r6b/quick/' + app + '-' + shard.id + '.json'
      })),
      coverage: { missing: [], duplicates: [], unexpected: [] }, status: 'planned'
    };
  });
  return manifest;
}

/** One line per field, per shard and per expected key; CRLF, a final line end. */
function render(manifest) {
  const lines = ['{'];
  const top = ['schema', 'status', 'plan'];
  top.forEach((k) => lines.push('  ' + JSON.stringify(k) + ': ' + JSON.stringify(manifest[k]) + ','));
  lines.push('  "apps": {');
  const apps = Object.keys(manifest.apps);
  apps.forEach((app, ai) => {
    const s = manifest.apps[app];
    lines.push('    ' + JSON.stringify(app) + ': {');
    ['inventoryPath', 'inventoryHash', 'sourceHash', 'node', 'timeFactor'].forEach((k) => {
      lines.push('      ' + JSON.stringify(k) + ': ' + JSON.stringify(s[k]) + ',');
    });
    lines.push('      "shards": [');
    s.shards.forEach((shard, si) => {
      lines.push('        {');
      ['id', 'app', 'args', 'projectionSeconds', 'projectionBasis', 'resultPath'].forEach((k) => {
        lines.push('          ' + JSON.stringify(k) + ': ' + JSON.stringify(shard[k]) + ',');
      });
      lines.push('          "expectedTestKeys": [');
      shard.expectedTestKeys.forEach((row, ri) => {
        lines.push('            ' + JSON.stringify(row) + (ri < shard.expectedTestKeys.length - 1 ? ',' : ''));
      });
      lines.push('          ]');
      lines.push('        }' + (si < s.shards.length - 1 ? ',' : ''));
    });
    lines.push('      ],');
    lines.push('      "coverage": ' + JSON.stringify(s.coverage) + ',');
    lines.push('      "status": ' + JSON.stringify(s.status));
    lines.push('    }' + (ai < apps.length - 1 ? ',' : ''));
  });
  lines.push('  }');
  lines.push('}');
  return lines.join('\r\n') + '\r\n';
}

function main() {
  const mode = process.argv[2];
  if (mode !== '--build' && mode !== '--check') {
    console.error('Usage: node manifest.js --build | --check');
    return 2;
  }
  const problems = [];
  let manifest;
  if (mode === '--build') {
    if (fs.existsSync(MANIFEST)) {
      console.error(rel(MANIFEST) + ' exists already (an evidence file is never overwritten)');
      return 2;
    }
    manifest = build(readJson(PLAN), problems);
    Object.keys(manifest.apps).forEach((app) => {
      manifest.apps[app].coverage = checkApp(app, manifest.apps[app], null, problems).coverage;
    });
  } else {
    manifest = readJson(MANIFEST);
  }
  Object.keys(manifest.apps).forEach((app) => {
    const result = checkApp(app, manifest.apps[app], null, problems);
    const c = result.coverage;
    if (JSON.stringify(c) !== JSON.stringify(manifest.apps[app].coverage)) problems.push(app + ': coverage differs from the manifest');
    if (c.missing.length + c.duplicates.length + c.unexpected.length > 0) {
      problems.push(app + ': coverage errors: ' + c.missing.length + ' missing, ' + c.duplicates.length +
        ' duplicate, ' + c.unexpected.length + ' unexpected');
    }
    const projected = manifest.apps[app].shards.reduce((sum, s) => sum + s.projectionSeconds, 0);
    const longest = Math.max.apply(null, manifest.apps[app].shards.map((s) => s.projectionSeconds));
    console.log(app + ': ' + result.tests + ' tests in the inventory, ' + result.claimed + ' claimed by ' +
      manifest.apps[app].shards.length + ' shards; missing ' + c.missing.length + ', duplicates ' +
      c.duplicates.length + ', unexpected ' + c.unexpected.length + '; projected sum ' + projected +
      ' s, longest shard ' + longest + ' s');
    manifest.apps[app].shards.forEach((s) => {
      if (s.projectionSeconds > 450) problems.push(app + '/' + s.id + ': projection above 450 s');
    });
  });
  if (mode === '--build' && problems.length === 0) {
    fs.writeFileSync(MANIFEST, render(manifest), { encoding: 'utf8', flag: 'wx' });
    console.log('written: ' + rel(MANIFEST));
  }
  problems.forEach((p) => console.error('PROBLEM: ' + p));
  return problems.length === 0 ? 0 : 1;
}

if (require.main === module) process.exitCode = main();
module.exports = { checkApp: checkApp };
