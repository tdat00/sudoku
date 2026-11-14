#!/usr/bin/env node
'use strict';

/*
 * MS05r6b: reads the final quick results and prints, for the combined audit, (1) the tests carrying a recovery tag
 * (MS05b1-, MS05r3-, MS05r5p-, the 46 manual-corpus tests, ...) with their keys and statuses and (2) the pass counts of the
 * suites that carry a retained duty. Read-only; no generation.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6b/audit.cjs [--out=<new project-relative .json>]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EV = 'docs/difficulty-v3/evidence/MS05r6b/';
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));

function main(argv) {
  const outArg = (argv.find((a) => /^--out=/.test(a)) || '').slice('--out='.length);
  const quickDir = ((argv.find((a) => /^--quick=/.test(a)) || '').slice('--quick='.length)) || 'quick';
  const rec = json(EV + quickDir + '/reconciled.json');
  const rows = [];
  ['generator', 'player'].forEach((app) => rec.apps[app].shards.forEach((s) => {
    json(s.resultPath).results.tests.forEach((t) => rows.push({ app: app, suite: t.suite, ordinal: t.ordinal,
      status: t.status, fullName: t.fullName }));
  }));
  const tagGroups = [
    ['MS05b1-T01', /MS05b1-T01/], ['MS05b1-T02', /MS05b1-T02/], ['MS05b1-T03', /MS05b1-T03/], ['MS05b1-T04', /MS05b1-T04/],
    ['MS05b1-T05', /MS05b1-T05/], ['MS05r3', /MS05r3/], ['MS05r5p', /MS05r5p/], ['MS05r5p-CV6-04', /MS05r5p-CV6-04/],
    ['G13 saved-wire spy', /reads G13 from the saved wire and never regenerates it/]
  ];
  const tags = {};
  tagGroups.forEach((g) => {
    const hit = rows.filter((r) => r.app === 'generator' && g[1].test(r.fullName));
    const suites = {};
    hit.forEach((r) => { suites[r.suite] = (suites[r.suite] || 0) + 1; });
    tags[g[0]] = { tests: hit.length, passed: hit.filter((r) => r.status === 'pass').length, suites: suites,
      keys: hit.map((r) => 'generator/' + r.suite + '/' + r.ordinal) };
  });
  const suiteNames = ['pipeline', 'difficulty-diagnostics', 'difficulty-floor', 'recovery-profile', 'digger', 'events', 'worker',
    'cache', 'store', 'controls', 'history', 'export', 'variants-registry', 'mega', 'mega-contract', 'manual-corpus', 'harness',
    'replay-recorders', 'perf-tooling', 'steps', 'replay', 'player', 'i18n', 'help', 'ui-contract'];
  const suites = {};
  suiteNames.forEach((name) => {
    const hit = rows.filter((r) => r.app === 'generator' && r.suite === name);
    suites[name] = { tests: hit.length, passed: hit.filter((r) => r.status === 'pass').length,
      failed: hit.filter((r) => r.status === 'fail').map((r) => 'generator/' + r.suite + '/' + r.ordinal) };
  });
  const doc = { schema: 1, kind: 'audit-counts', task: 'MS05r6b', tags: tags, suites: suites };
  Object.keys(tags).forEach((k) => console.log(k + ': ' + tags[k].passed + ' of ' + tags[k].tests + ' passed ' + JSON.stringify(tags[k].suites)));
  Object.keys(suites).forEach((k) => console.log('suite ' + k + ': ' + suites[k].passed + ' of ' + suites[k].tests +
    (suites[k].failed.length ? ' FAILED ' + suites[k].failed.join(',') : '')));
  if (outArg) {
    const abs = path.resolve(process.cwd(), outArg);
    fs.writeFileSync(abs, JSON.stringify(doc, null, 2).replace(/\n/g, '\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
    console.log('written: ' + outArg);
  }
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 2;
}
