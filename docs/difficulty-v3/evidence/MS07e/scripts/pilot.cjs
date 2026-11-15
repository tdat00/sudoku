#!/usr/bin/env node
'use strict';

/*
 * MS07e projection pilot (execution aid, not evidence of a cell): it runs the FIRST requests of named qualification
 * cells in one process, exactly as a worker of tests/qualify.js does (the same variant, level, derived seed of request k,
 * `SG.pipeline.run` with a 120000 ms budget and trace off, no maxAttempts, all levels enabled in the registry, the same
 * validity checks and the qualifier's own `hitOf`). It tests nothing, writes no shard and decides no verdict: it only
 * measures how long the first requests of a cell take on the current source, so that the one-cell qualification can be
 * projected before it is launched (MS07e step 1, S-AV27 rule). The generator tree is not touched.
 *
 *   node <this file> --json=<new project-relative .json> --cells=<variant/level:k>[,<variant/level:k>...]
 *        [--budget-seconds=<n>]
 *
 * Run it from generator/, under Invoke-Dv3Node: it generates puzzles and is not known to be short. Cells are run in the
 * order given; request k of a cell is the cell's own request index k (seed FNV-1a of "variant/level/k" on 20260601). Before
 * each request the pilot checks that the time used plus the slowest request seen so far fits the budget (default 420 s) and
 * otherwise stops, recording what was not reached. Exit 0 when it ran; 2 for a usage error or a path that is not fresh;
 * 3 when a request returned an invalid or non-unique puzzle (a correctness failure, the record is still written).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const USAGE = 'Usage: node pilot.cjs --json=<new .json> --cells=<variant/level:k>[,...] [--budget-seconds=<n>]';
const GUARD_MS = 120000;

function parseCells(text) {
  return text.split(',').map((item) => {
    const m = /^([A-Za-z0-9]+)\/([A-Za-z0-9]+):(\d+)(?:@(\d+))?$/.exec(item);
    if (!m || Number(m[3]) < 1 || Number(m[3]) > 40) throw new Error('bad cell ' + item + '\n' + USAGE);
    return { variant: m[1], level: m[2], k: Number(m[3]), start: m[4] ? Number(m[4]) : 0 };
  });
}

function main(argv) {
  let rel = null;
  let cells = null;
  let budget = 420;
  argv.forEach((arg) => {
    let m;
    if ((m = /^--json=(.+)$/.exec(arg))) rel = m[1];
    else if ((m = /^--cells=(.+)$/.exec(arg))) cells = parseCells(m[1]);
    else if ((m = /^--budget-seconds=(\d+)$/.exec(arg))) budget = Number(m[1]);
    else throw new Error('unknown argument ' + arg + '\n' + USAGE);
  });
  if (!rel || !cells) throw new Error(USAGE);
  if (!fs.existsSync(path.resolve('tests', 'qualify.js'))) throw new Error('run it from the generator folder');
  const qualify = require(path.resolve('tests', 'qualify.js'));
  const loader = require(path.resolve('tests', 'replay-fixtures.js'));
  const env = loader.nodeEnv();
  env.checkPath(rel, { extension: '.json' });
  const abs = path.resolve(process.cwd(), rel);
  if (fs.existsSync(abs) || fs.existsSync(abs + '.partial')) throw new Error(rel + ': exists already');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  env.engine();
  const SG = globalThis.SG;
  SG.variants.list().forEach((def) => { def.difficultySupport = SG.difficulty.LEVELS.slice(); });
  cells.forEach((cell) => {
    if (!SG.variants.get(cell.variant)) throw new Error('unknown variant ' + cell.variant);
    if (SG.difficulty.LEVELS.indexOf(cell.level) === -1) throw new Error('unknown level ' + cell.level);
  });
  const identity = env.identity([]);
  const record = {
    schema: 1, kind: 'ms07e-projection-pilot', task: 'MS07e', argv: argv.slice(), startedAt: new Date().toISOString(),
    identity: { sourceHash: identity.sourceHash, node: identity.node, commit: identity.commit, dirty: identity.dirty },
    machine: { platform: os.platform(), arch: os.arch(), cpu: os.cpus().length > 0 ? String(os.cpus()[0].model).trim() : null,
      cores: os.cpus().length, memoryGiB: Math.round(os.totalmem() / Math.pow(2, 30)) },
    call: 'SG.pipeline.run({ variantId, difficulty, seed, trace: "off" }, null, SG.budget.create({ ms: 120000 })), serial, one ' +
      'process; seed = FNV-1a("variant/level/index") on 20260601 (qualify.js seedFor); no maxAttempts',
    budgetSeconds: budget, cells: {}, notReached: [], correctness: []
  };
  const clock = process.hrtime.bigint();
  const used = () => Number(process.hrtime.bigint() - clock) / 1e9;
  let slowest = 0;
  let stopped = false;
  cells.forEach((cell) => {
    const key = cell.variant + '/' + cell.level;
    const entry = { variant: cell.variant, level: cell.level, asked: cell.k, start: cell.start, requests: [] };
    record.cells[key] = entry;
    for (let index = cell.start; index < cell.start + cell.k; index++) {
      if (stopped || used() + slowest > budget) {
        stopped = true;
        record.notReached.push(key + '#' + index);
        continue;
      }
      const seed = qualify.seedFor(key + '/' + index);
      const out = { index: index, seed: seed, hit: false };
      const t0 = process.hrtime.bigint();
      let result = null;
      try {
        result = SG.pipeline.run({ variantId: cell.variant, difficulty: cell.level, seed: seed, trace: 'off' },
          null, SG.budget.create({ ms: GUARD_MS }));
      } catch (err) {
        out.error = err && err.code ? err.code : String(err && err.message);
      }
      out.ms = Number(process.hrtime.bigint() - t0) / 1e6;
      if (result !== null) {
        const model = result.model;
        const rating = result.rating;
        out.achieved = rating.level;
        out.score = rating.score;
        out.solved = rating.solved === true;
        out.approximate = result.warnings.indexOf('difficulty.approximate') !== -1;
        out.exact = result.exact === true;
        let consistent = true;
        for (let c = 0; c < model.cellCount; c++) {
          if (result.givens[c] !== 0 && result.givens[c] !== result.solution[c]) consistent = false;
        }
        out.valid = consistent && SG.model.isSolution(model, result.solution) &&
          SG.dfs.countSolutions(model, result.givens, 2) === 1;
        out.hit = qualify.hitOf(out, cell.level);
        if (out.valid !== true) record.correctness.push(key + '#' + index + ': invalid or non-unique puzzle');
      }
      slowest = Math.max(slowest, out.ms / 1000);
      entry.requests.push(out);
      console.log(key + ' #' + index + ': ' + out.ms.toFixed(1) + ' ms, hit ' + out.hit + (out.error ? ', error ' + out.error
        : ', achieved ' + out.achieved + ', exact ' + out.exact + ', approximate ' + out.approximate));
    }
    const times = entry.requests.map((r) => r.ms).sort((a, b) => a - b);
    entry.n = times.length;
    entry.hits = entry.requests.filter((r) => r.hit).length;
    entry.meanMs = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length * 1000) / 1000 : null;
    entry.maxMs = times.length > 0 ? times[times.length - 1] : null;
  });
  record.endedAt = new Date().toISOString();
  record.seconds = Math.round(used() * 1000) / 1000;
  fs.writeFileSync(abs, JSON.stringify(record, null, 2).replace(/\n/g, '\r\n') + '\r\n', { encoding: 'utf8', flag: 'wx' });
  console.log('record: ' + rel + ' (' + record.seconds + ' s' + (record.notReached.length > 0 ? ', not reached: ' +
    record.notReached.join(' ') : '') + ')');
  return record.correctness.length > 0 ? 3 : 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(String(err && err.message || err));
  process.exitCode = 2;
}
