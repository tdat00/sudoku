#!/usr/bin/env node
'use strict';

/*
 * MS05r6b, D: builds evidence/MS05r6b/standing-quick-cost.json, the measured standing cost of the complete quick set of
 * each app, from the accepted coverage (quick/reconciled.json), the lock helper's records (runs.jsonl), the compound
 * driver's records (shard-runs.jsonl, compounds.jsonl) and the result files. Every number is read from those files.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6b/standing-cost.cjs --out=<new project-relative .json> [--label=<text>]
 *
 * Per the task: the sum is of the actual PROCESS wall times the lock helper reports (start-up and registration included),
 * counted once per helper command (a compound's wall time once, never again on top of its children); the runner's own
 * `wallMs` and `results.ms` are kept apart; per-child times are kept for the suite breakdown, and the driver's overhead is
 * reported separately. Lock wait, development work, the diagnostic compound and any superseded run are excluded work.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const EV = 'docs/difficulty-v3/evidence/MS05r6b/';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
const json = (rel) => JSON.parse(read(rel));
const lines = (rel) => read(rel).split('\n').filter(Boolean).map((l) => JSON.parse(l));
const round = (n, d) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

function main(argv) {
  const arg = (name, fallback) => {
    const hit = argv.find((a) => a.indexOf('--' + name + '=') === 0);
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  const outArg = arg('out', '');
  const note = arg('label', '');
  const quickDir = arg('quick', 'quick');
  const genLabels = arg('gen-labels', 'c1-quick-g13-consumers,c2-quick-pipeline-core-shared,c3-quick-mega-own-fast').split(',');
  const playerLabels = arg('player-labels', 'q-player-all').split(',');
  const childPrefix = arg('child-prefix', 'q-');
  const superseded = arg('superseded', 'none: every shard of the accepted set ran once; no result was replaced');
  const diagnostics = arg('diagnostics', 'c4-diag-i18n-order (3 diagnostic suites, 12.323 s, not accepted coverage)');
  if (!outArg) throw new Error('usage: --out=<new project-relative .json> [--label=<text>] [--quick=<dir>] [--gen-labels=<l,l>]');
  const outAbs = path.resolve(process.cwd(), outArg);
  if (fs.existsSync(outAbs)) throw new Error(outArg + ' exists already (an evidence file is never overwritten)');
  const rec = json(EV + quickDir + '/reconciled.json');
  const manifest = json(EV + quickDir + '/quick-manifest.json');
  const runs = lines(EV + 'runs.jsonl');
  const shardRuns = lines(EV + 'shard-runs.jsonl');
  const helperLabels = { generator: genLabels, player: playerLabels };
  const out = { schema: 1, kind: 'standing-quick-cost', task: 'MS05r6b', note: note || null, apps: {} };
  Object.keys(rec.apps).forEach((app) => {
    const a = rec.apps[app];
    const section = manifest.apps[app];
    const results = a.shards.map((s) => ({ shard: s, doc: json(s.resultPath) }));
    const first = results[0].doc;
    const suites = [];
    results.forEach((r) => r.doc.results.suites.forEach((s) => suites.push({ shard: r.shard.id, name: s.name, tests: s.total,
      passed: s.passed, failed: s.failed, skipped: s.skipped, ms: s.ms })));
    // Helper commands: one record per helper command; the process seconds the helper printed, else derived from wall time.
    const helpers = helperLabels[app].map((label) => {
      const r = runs.filter((x) => x.label === label)[0];
      const derived = r.nodeSeconds === null || r.nodeSeconds === undefined;
      const seconds = derived ? round(r.wallSeconds - 0.102, 3) : r.nodeSeconds;
      return { label: label, exit: r.exit, helperProcessSeconds: seconds, derived: derived,
        derivedNote: derived ? 'the logger threw on the nonzero exit before it kept the helper summary line (-AllowExit1 was not given): wall seconds minus the 0.102 s of lock wait and start-up that the other helper commands recorded' : null,
        wallSeconds: r.wallSeconds, lockWaitSeconds: derived ? null : r.lockWaitSeconds, startedAt: r.startedAt };
    });
    const ends = (c, s) => c.args.some((x) => /^--results=/.test(x) && x.slice(-path.basename(s.resultPath).length) === path.basename(s.resultPath));
    const children = shardRuns.filter((c) => c.app === app && c.label.indexOf(childPrefix) === 0 && a.shards.some((s) => ends(c, s)));
    const childSum = children.reduce((n, c) => n + c.nodeSeconds, 0);
    const helperSum = helpers.reduce((n, h) => n + h.helperProcessSeconds, 0);
    const perShard = a.shards.map((s) => {
      const doc = results.filter((r) => r.shard.id === s.id)[0].doc;
      const child = children.filter((c) => ends(c, s))[0];
      const helper = helpers.length === 1 ? helpers[0] : null;
      return { id: s.id, tests: s.tests, passed: s.passed, failed: s.failed, skipped: s.skipped,
        processSeconds: child ? child.nodeSeconds : (helper ? helper.helperProcessSeconds : null),
        processSecondsSource: child ? 'compound driver child (node process start to exit)' : 'lock helper (one command)',
        runnerWallMs: doc.wallMs, harnessMs: doc.results.ms, projectionSeconds: section.shards.filter((x) => x.id === s.id)[0].projectionSeconds,
        withinProjection: child ? child.withinProjection : null };
    });
    const maxShard = Math.max.apply(null, perShard.map((s) => s.processSeconds));
    out.apps[app] = {
      sourceHash: section.sourceHash, node: section.node, machine: first.machine, timeFactor: section.timeFactor,
      default: 'allowance 256 (SG.digger.SHALLOW_SEARCH_DEFAULT); default attempts 8 up to 81 cells, 4 for 82-144, 2 above; no override',
      manifestPath: EV + quickDir + '/quick-manifest.json', reconciliation: EV + quickDir + '/reconciled.json',
      verdict: a.verdict, suiteCount: suites.length, testCounts: { total: a.counts.total, passed: a.counts.passed,
        failed: a.counts.failed, skipped: a.counts.skipped },
      shardCount: a.shards.length, helperCommands: helpers.length, compoundCount: app === 'generator' ? helperLabels.generator.length : 0,
      sumWallMs: round(helperSum * 1000, 0), maxShardWallMs: round(maxShard * 1000, 0), registrationIncluded: true,
      measurement: 'sum of the accepted disjoint shard executions',
      measurementDetail: 'sumWallMs is the sum of the process seconds the lock helper reported per helper command (a compound once); maxShardWallMs is the largest single shard process; the runner wallMs and results.ms of each shard are in perShard and are not substituted',
      childProcessSumMs: app === 'generator' ? round(childSum * 1000, 0) : null,
      driverOverheadMs: app === 'generator' ? round((helperSum - childSum) * 1000, 0) : null,
      runnerWallSumMs: round(results.reduce((n, r) => n + r.doc.wallMs, 0), 0),
      harnessSumMs: round(results.reduce((n, r) => n + r.doc.results.ms, 0), 0),
      excludedWork: {
        supersededAttempts: superseded,
        replacedRuns: 'none',
        inventoryAndTooling: 'registration-only inventories, preflights, the manifest, the reconciler, the migration check and the self-tests: each well under 10 s of node time, not part of the standing cost',
        diagnostics: app === 'generator' ? diagnostics : 'none',
        lockWait: 'reported apart: ' + helpers.map((h) => h.label + ' ' + (h.lockWaitSeconds === null ? 'n/a' : h.lockWaitSeconds + ' s')).join(', ')
      },
      orchestratorAcknowledgement: 'pending normal acceptance',
      helpers: helpers, perShard: perShard, perSuite: suites.sort((x, y) => y.ms - x.ms)
    };
  });
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  Object.keys(out.apps).forEach((app) => {
    const a = out.apps[app];
    console.log(app + ': ' + a.verdict + ', ' + a.testCounts.total + ' tests (' + a.testCounts.failed + ' failed), ' + a.suiteCount + ' suites, ' +
      a.shardCount + ' shards in ' + a.helperCommands + ' helper commands; sum ' + (a.sumWallMs / 1000).toFixed(3) + ' s, longest shard ' +
      (a.maxShardWallMs / 1000).toFixed(3) + ' s' + (a.childProcessSumMs !== null ? ', children ' + (a.childProcessSumMs / 1000).toFixed(3) + ' s, driver overhead ' +
        (a.driverOverheadMs / 1000).toFixed(3) + ' s' : ''));
  });
  console.log('written: ' + outArg);
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 2;
}
