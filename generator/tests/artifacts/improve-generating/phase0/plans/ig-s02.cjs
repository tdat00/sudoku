'use strict';

/*
 * Plan of IG-S02 (paired headline baseline and S5a width-4 attempt pool): the population H3 of the check-list,
 * eighteen paired requests = 36 observations, as the eight shards of the task file. Every request is Nightmare,
 * trace off, rotational180, random order, the native variant options and default attempts (no override). The arms
 * are native-w1 (the full unmodified pipeline in one worker: arm `reference`) and attempts-w4 (S5a: arm `prototype`).
 * The order of the two arms of a pair alternates by the index in the preregistered seed list of its cell (AB, BA,
 * AB), never by an outcome. Admission estimates are planning figures for the 270 s window, not expectations.
 * Everything is provisional (pre-freeze).
 */
const SEC = 1000;

const ARMS = Object.freeze({
  reference: Object.freeze({ id: 'native-w1', adapterIds: Object.freeze([]), solverMode: 'native-w1', executor: null }),
  prototype: Object.freeze({ id: 'attempts-w4', adapterIds: Object.freeze(['attempt-pool']),
    solverMode: 'attempts-w4', executor: 'attempt-pool' })
});

// Literal seeds of the task file; a shard holds one cell (mega16: one seed per shard, as m16-1, m16-2, m16-3).
const CELLS = Object.freeze([
  { cell: 'mega16', seeds: [1, 2, 3], shards: ['m16-1', 'm16-2', 'm16-3'], estimate: { native: 120 * SEC, pool: 55 * SEC } },
  { cell: 'mega12', seeds: [1, 2, 3], shards: ['m12'], estimate: { native: 32 * SEC, pool: 15 * SEC } },
  { cell: 'samurai', seeds: [1, 2, 42], shards: ['sam'], estimate: { native: 36 * SEC, pool: 24 * SEC } },
  { cell: 'classic9', seeds: [1, 2, 3], shards: ['c9'], estimate: { native: 9 * SEC, pool: 5 * SEC } },
  { cell: 'killer', seeds: [1, 2, 3], shards: ['killer'], estimate: { native: 32 * SEC, pool: 14 * SEC } },
  { cell: 'greaterThan', seeds: [1, 2, 3], shards: ['gt'], estimate: { native: 22 * SEC, pool: 10 * SEC } }
]);

const LEVEL = 'nightmare';

function pairJobs(task, shard, cell, seed, seedIndex, base) {
  const pairId = cell.cell + ':' + LEVEL + ':' + seed;
  const blockKey = task + '/' + shard + '/' + pairId;
  const order2 = seedIndex % 2 === 0 ? ['reference', 'prototype'] : ['prototype', 'reference'];
  return {
    blockKey: blockKey,
    jobs: order2.map(function (arm, position) {
      const a = ARMS[arm];
      return {
        key: blockKey + '/' + a.id,
        blockKey: blockKey,
        shard: shard,
        order: base + position,
        seedIndex: seedIndex,
        pairId: pairId,
        gridCluster: null,
        requestSeed: seed,
        variantId: a.id,
        puzzleVariant: cell.cell,
        level: LEVEL,
        mode: 'native',
        arm: arm,
        solverMode: a.solverMode,
        executor: a.executor,
        adapterIds: a.adapterIds.slice(),
        request: { variantId: cell.cell, difficulty: LEVEL, seed: seed, trace: 'off', symmetry: 'rotational180',
          digOrder: 'random' },
        estimateMs: arm === 'reference' ? cell.estimate.native : cell.estimate.pool,
        guardScope: 'request'
      };
    })
  };
}

module.exports = {
  CELLS: CELLS,
  ARMS: ARMS,
  build: function build() {
    const task = 'IG-S02';
    const shards = [];
    CELLS.forEach(function (cell) {
      cell.shards.forEach(function (shard, shardIndex) {
        const seeds = cell.shards.length > 1 ? [cell.seeds[shardIndex]] : cell.seeds;
        const blocks = seeds.map(function (seed, i) {
          const seedIndex = cell.shards.length > 1 ? shardIndex : i;
          return pairJobs(task, shard, cell, seed, seedIndex, i * 2);
        });
        shards.push({ shard: shard, kind: 'pipeline', blocks: blocks });
      });
    });
    return { shards: shards };
  }
};
