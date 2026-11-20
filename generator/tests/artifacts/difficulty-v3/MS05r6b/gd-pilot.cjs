#!/usr/bin/env node
'use strict';

/*
 * MS05r6b (GD): a bounded same-source projection of the classic9 difficulty batches. It generates the FIRST few requests of
 * each level of `generator/tests/manual/difficulty.test.js` exactly as `batch(level)` does (the model of
 * `SG.variants.get('classic9').build({}, null)`, `SG.rng.create(7000 + i)`, `SG.digger.generate(model, level, rng, {})`, the
 * same defaults and no override) and records the milliseconds of each, so that the full unchanged batch (100 requests, 20 for
 * Hell 1) can be projected from a measurement before it is launched. It tests nothing, changes no count, seed or assertion and is
 * not evidence of the batch: the batches themselves are the unchanged manual selectors.
 *
 *   node tests/artifacts/difficulty-v3/MS05r6b/gd-pilot.cjs --json=<new project-relative .json> [--count=<n>]
 *        [--levels=<comma list>]
 *
 * Run it from generator/ under Invoke-Dv3Node: it generates puzzles and is not known to be short. The record holds the
 * source identity, Node, the machine and, per level, the request times, the mean, the median, the maximum and how many
 * were exact. Exit 0 when it ran; 2 for a usage error or a path that is not fresh.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const USAGE = 'Usage: node tests/artifacts/difficulty-v3/MS05r6b/gd-pilot.cjs --json=<new .json> [--count=<n>] [--levels=<list>]';
const DEFAULT_LEVELS = ['veryEasy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell1'];

function main(argv) {
  let rel = null;
  let count = 8;
  let levels = DEFAULT_LEVELS;
  argv.forEach((arg) => {
    let m;
    if ((m = /^--json=(.+)$/.exec(arg))) rel = m[1];
    else if ((m = /^--count=(\d+)$/.exec(arg))) count = Number(m[1]);
    else if ((m = /^--levels=(.+)$/.exec(arg))) levels = m[1].split(',');
    else throw new Error('unknown argument ' + arg + '\n' + USAGE);
  });
  if (!rel || count < 1 || count > 20) throw new Error(USAGE);
  levels.forEach((level) => {
    if (DEFAULT_LEVELS.indexOf(level) === -1) throw new Error('unknown level ' + level);
  });
  if (!fs.existsSync(path.resolve('tests', 'replay-fixtures.js'))) throw new Error('run it from the generator folder');
  const loader = require(path.resolve('tests', 'replay-fixtures.js'));
  const env = loader.nodeEnv();
  env.checkPath(rel, { extension: '.json' });
  const abs = path.resolve(process.cwd(), rel);
  if (fs.existsSync(abs) || fs.existsSync(abs + '.partial')) throw new Error(rel + ': exists already');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  env.engine();
  const SG = globalThis.SG;
  const model9 = SG.variants.get('classic9').build({}, null);
  const offered = SG.variants.get('classic9').difficultySupport;
  const identity = env.identity([]);
  const record = {
    schema: 1, kind: 'gd-pilot', task: 'MS05r6b', complete: true, argv: argv.slice(), startedAt: new Date().toISOString(),
    identity: { sourceHash: identity.sourceHash, node: identity.node, commit: identity.commit, dirty: identity.dirty },
    machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus().length > 0 ? String(os.cpus()[0].model).trim() : null,
      cores: os.cpus().length, memoryGiB: Math.round(os.totalmem() / Math.pow(2, 30)) },
    seeds: '7000 + i, i = 0..' + (count - 1), call: 'SG.digger.generate(model9, level, SG.rng.create(7000 + i), {})',
    offered: offered.slice(), levels: {}
  };
  levels.forEach((level) => {
    const times = [];
    let exact = 0;
    const achieved = {};
    for (let i = 0; i < count; i++) {
      const rng = SG.rng.create(7000 + i);
      const t0 = process.hrtime.bigint();
      const p = SG.digger.generate(model9, level, rng, {});
      times.push(Math.round(Number(process.hrtime.bigint() - t0) / 1e3) / 1e3);
      if (p.exact === true) exact++;
      achieved[p.achieved] = (achieved[p.achieved] || 0) + 1;
    }
    const sorted = times.slice().sort((a, b) => a - b);
    record.levels[level] = {
      requests: count, ms: times, meanMs: Math.round(times.reduce((a, b) => a + b, 0) / count * 1000) / 1000,
      medianMs: sorted[count >> 1], maxMs: sorted[count - 1], exact: exact, achieved: achieved
    };
    console.log(level + ': ' + count + ' requests, mean ' + record.levels[level].meanMs + ' ms, median ' +
      record.levels[level].medianMs + ' ms, max ' + record.levels[level].maxMs + ' ms, exact ' + exact);
  });
  record.endedAt = new Date().toISOString();
  fs.writeFileSync(abs, JSON.stringify(record, null, 2).replace(/\n/g, '\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  console.log('record: ' + rel);
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 2;
}
