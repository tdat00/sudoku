'use strict';

/*
 * Plan of IG-S03 (scoped solver prototype and virtual-check parity): the headline population H3 again, plus the exact
 * audit population, as eleven shards. Everything is provisional (pre-freeze).
 *
 *  audit-1, audit-2   the audit: the focused synthetic tests and the 18 saved H3 puzzles of IG-S02 (the unmodified
 *                     native-w1 result of each request; the pooled arm returned the identical puzzle). Fixed states and
 *                     seeds, with the hash of every saved puzzle file and of every synthetic initial state, are in this
 *                     manifest before anything runs.
 *  sc-*               `scoped-attempts-w4`: every H3 request (18 observations) with the S3 prototype inside the S5a pool,
 *                     one shard per cell (mega16 holds its three seeds in one shard, as the task file plans).
 *  ser-*              `scoped-native-w1`: six requests (mega16:3, mega12:3, samurai:42, classic9:3, killer:3,
 *                     greaterThan:3) in one worker, to isolate the serial S3. Three shards.
 *
 * The baselines are IG-S02's matched native-w1 and attempts-w4 records (harness generation `dd759a22…`, reused with the
 * author's approval); no baseline is rerun here. Admission estimates are planning figures taken from IG-S02's plan, not
 * expectations.
 */
const fs = require('fs');
const path = require('path');
const C = require('../common.cjs');

const SEC = 1000;
const LEVEL = 'nightmare';
const TASK = 'IG-S03';
const BASELINE_ROUND = 'provisional-r1';
const BASELINE_TASK = 'IG-S02';

// Where the saved native-w1 puzzle of each (cell, seed) is: the IG-S02 shard folder and its attempt folder ('' = a1).
const SAVED = Object.freeze({
  mega16: { 1: ['m16-1', ''], 2: ['m16-2', ''], 3: ['m16-3', ''] },
  mega12: { 1: ['m12', ''], 2: ['m12', ''], 3: ['m12', ''] },
  samurai: { 1: ['sam', ''], 2: ['sam', ''], 42: ['sam', ''] },
  classic9: { 1: ['c9', 'a3'], 2: ['c9', 'a3'], 3: ['c9', 'a3'] },
  killer: { 1: ['killer', ''], 2: ['killer', ''], 3: ['killer', ''] },
  greaterThan: { 1: ['gt', ''], 2: ['gt', ''], 3: ['gt', ''] }
});

const CELLS = Object.freeze([
  { cell: 'mega16', seeds: [1, 2, 3], pool: 'sc-m16', audit: 'audit-2', auditEst: 30 * SEC,
    estimate: { native: 120 * SEC, pool: 55 * SEC } },
  { cell: 'mega12', seeds: [1, 2, 3], pool: 'sc-m12', audit: 'audit-2', auditEst: 20 * SEC,
    estimate: { native: 32 * SEC, pool: 15 * SEC } },
  { cell: 'samurai', seeds: [1, 2, 42], pool: 'sc-sam', audit: 'audit-2', auditEst: 20 * SEC,
    estimate: { native: 36 * SEC, pool: 24 * SEC } },
  { cell: 'classic9', seeds: [1, 2, 3], pool: 'sc-c9', audit: 'audit-1', auditEst: 8 * SEC,
    estimate: { native: 9 * SEC, pool: 5 * SEC } },
  { cell: 'killer', seeds: [1, 2, 3], pool: 'sc-killer', audit: 'audit-1', auditEst: 15 * SEC,
    estimate: { native: 32 * SEC, pool: 14 * SEC } },
  { cell: 'greaterThan', seeds: [1, 2, 3], pool: 'sc-gt', audit: 'audit-1', auditEst: 15 * SEC,
    estimate: { native: 22 * SEC, pool: 10 * SEC } }
]);

// The six serial observations and their shards.
const SERIAL = Object.freeze([
  { cell: 'mega16', seed: 3, shard: 'ser-m16' },
  { cell: 'mega12', seed: 3, shard: 'ser-m12-sam' },
  { cell: 'samurai', seed: 42, shard: 'ser-m12-sam' },
  { cell: 'classic9', seed: 3, shard: 'ser-small' },
  { cell: 'killer', seed: 3, shard: 'ser-small' },
  { cell: 'greaterThan', seed: 3, shard: 'ser-small' }
]);

const ARMS = Object.freeze({
  pool: Object.freeze({ id: 'scoped-attempts-w4', adapterIds: Object.freeze(['attempt-pool', 'scoped-solver']),
    solverMode: 'scoped-attempts-w4', executor: 'scoped-pool' }),
  serial: Object.freeze({ id: 'scoped-native-w1', adapterIds: Object.freeze(['scoped-solver']),
    solverMode: 'scoped-native-w1', executor: 'scoped-native' })
});

const AUDIT_ADAPTERS = Object.freeze(['scoped-solver', 'scoped-audit']);

function savedPuzzle(repoRoot, cell, seed) {
  const entry = SAVED[cell] && SAVED[cell][seed];
  if (!entry) throw new C.HarnessError('plan-missing', 'no saved puzzle listed for ' + cell + ':' + seed);
  const parts = [...C.EVIDENCE_REL.split('/'), BASELINE_ROUND, BASELINE_TASK, entry[0]];
  if (entry[1]) parts.push(entry[1]);
  const dir = path.join(repoRoot, ...parts);
  const file = path.join(dir, 'puzzles', 'native-w1__' + cell + '-' + seed + '.json');
  if (!fs.existsSync(file)) {
    throw new C.HarnessError('plan-missing', 'the saved IG-S02 puzzle is missing: ' + C.toPosix(path.relative(repoRoot, file)));
  }
  return { file: C.toPosix(path.relative(repoRoot, file)), sha256: C.sha256(fs.readFileSync(file)),
    recordsFile: C.toPosix(path.relative(repoRoot, path.join(dir, 'records.json'))), baselineShard: entry[0] };
}

function baseJob(shard, order, seedIndex, blockKey) {
  return { blockKey: blockKey, shard: shard, order: order, seedIndex: seedIndex, gridCluster: null, level: LEVEL,
    mode: 'native', guardScope: 'request' };
}

function requestJob(shard, cell, seed, seedIndex, order, arm, estimateMs) {
  const pairId = cell + ':' + LEVEL + ':' + seed;
  const blockKey = TASK + '/' + shard + '/' + pairId;
  return {
    blockKey: blockKey,
    jobs: [Object.assign(baseJob(shard, order, seedIndex, blockKey), {
      key: blockKey + '/' + arm.id,
      pairId: pairId,
      requestSeed: seed,
      variantId: arm.id,
      puzzleVariant: cell,
      arm: 'prototype',
      solverMode: arm.solverMode,
      executor: arm.executor,
      adapterIds: arm.adapterIds.slice(),
      request: { variantId: cell, difficulty: LEVEL, seed: seed, trace: 'off', symmetry: 'rotational180',
        digOrder: 'random' },
      estimateMs: estimateMs
    })]
  };
}

function auditJob(shard, cell, seed, seedIndex, order, estimateMs, saved) {
  const pairId = cell + ':' + LEVEL + ':' + seed;
  const blockKey = TASK + '/' + shard + '/' + pairId;
  return {
    blockKey: blockKey,
    jobs: [Object.assign(baseJob(shard, order, seedIndex, blockKey), {
      key: blockKey + '/audit',
      pairId: null,
      requestSeed: seed,
      variantId: 'solver-audit',
      puzzleVariant: cell,
      arm: 'audit',
      solverMode: 'scoped-audit',
      executor: 'solver-audit',
      adapterIds: AUDIT_ADAPTERS.slice(),
      request: null,
      audit: { kind: 'puzzle', cell: cell, seed: seed, file: saved.file, sha256: saved.sha256 },
      estimateMs: estimateMs
    })]
  };
}

function syntheticJob(shard, order, saved, scenarios) {
  const blockKey = TASK + '/' + shard + '/synthetic';
  return {
    blockKey: blockKey,
    jobs: [Object.assign(baseJob(shard, order, 0, blockKey), {
      key: blockKey + '/audit',
      pairId: null,
      requestSeed: 0,
      variantId: 'solver-audit',
      puzzleVariant: 'synthetic',
      arm: 'audit',
      solverMode: 'scoped-audit',
      executor: 'solver-audit',
      adapterIds: AUDIT_ADAPTERS.slice(),
      request: null,
      audit: { kind: 'synthetic', scenarios: scenarios, mutationPuzzle: { cell: 'classic9', seed: 1, file: saved.file,
        sha256: saved.sha256 } },
      estimateMs: 30 * SEC
    })]
  };
}

module.exports = {
  CELLS: CELLS,
  SERIAL: SERIAL,
  ARMS: ARMS,
  SAVED: SAVED,
  LEVEL: LEVEL,
  BASELINE_ROUND: BASELINE_ROUND,
  baselineRecordsFile: function baselineRecordsFile(repoRoot, cell, seed) {
    return savedPuzzle(repoRoot, cell, seed).recordsFile;
  },
  build: function build() {
    const repoRoot = C.DEFAULT_REPO_ROOT;
    const AU = require('../scoped-audit.cjs');
    const shards = [];
    const auditShards = { 'audit-1': [], 'audit-2': [] };
    const mutationSaved = savedPuzzle(repoRoot, 'classic9', 1);
    auditShards['audit-1'].push(syntheticJob('audit-1', 0, mutationSaved, AU.syntheticPlan()));
    // Smallest boards first inside each audit shard.
    ['classic9', 'killer', 'greaterThan', 'samurai', 'mega12', 'mega16'].forEach(function (cellName) {
      const cell = CELLS.find(function (c) { return c.cell === cellName; });
      cell.seeds.forEach(function (seed, i) {
        const list = auditShards[cell.audit];
        list.push(auditJob(cell.audit, cell.cell, seed, i, list.length * 2, cell.auditEst,
          savedPuzzle(repoRoot, cell.cell, seed)));
      });
    });
    shards.push({ shard: 'audit-1', kind: 'pipeline', blocks: auditShards['audit-1'] });
    shards.push({ shard: 'audit-2', kind: 'pipeline', blocks: auditShards['audit-2'] });
    // The pooled arm, one shard per cell; small boards first (the first is a plumbing check of the scoped pool).
    ['classic9', 'greaterThan', 'killer', 'mega12', 'samurai', 'mega16'].forEach(function (cellName) {
      const cell = CELLS.find(function (c) { return c.cell === cellName; });
      shards.push({ shard: cell.pool, kind: 'pipeline', blocks: cell.seeds.map(function (seed, i) {
        return requestJob(cell.pool, cell.cell, seed, i, i * 2, ARMS.pool, cell.estimate.pool);
      }) });
    });
    ['ser-small', 'ser-m12-sam', 'ser-m16'].forEach(function (shardName) {
      const rows = SERIAL.filter(function (r) { return r.shard === shardName; });
      shards.push({ shard: shardName, kind: 'pipeline', blocks: rows.map(function (row, i) {
        const cell = CELLS.find(function (c) { return c.cell === row.cell; });
        const seedIndex = cell.seeds.indexOf(row.seed);
        return requestJob(shardName, row.cell, row.seed, seedIndex, i * 2, ARMS.serial, cell.estimate.native);
      }) });
    });
    return { shards: shards };
  }
};
