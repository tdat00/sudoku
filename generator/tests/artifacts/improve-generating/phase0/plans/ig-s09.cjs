'use strict';

/*
 * Plan of IG-S09 (Greater-Than miss predicate and solve-first diagnostic; provisional (pre-freeze)): the fixed cohorts and shards of
 * the task file. Every request is native `greaterThan`, trace SUMMARY (the historical diagnostic population; not comparable with a
 * trace-off headline without the label), the other options and defaults native (default symmetry, random dig order, default
 * attempts).
 *
 *   Greater-Than Normal    literal seeds 300-319 (20 paired requests): shards normal-300-304, 305-309, 310-314, 315-319
 *   Greater-Than Nightmare literal seeds 700-709 (10 paired requests): shards nightmare-700-701, 702-703, 704-705, 706-707, 708-709
 *   observer-control       one observer-free native request each of Normal seed 300 and Nightmare seed 700 (no capture hooks, still
 *                          inside the runner and the priority wrapper), compared with the captured G0 records of the same seeds
 *
 * The arms are G0 (the native first-allowed sign pass) and G1 (the solve-first order in the first technique sign pass), both with
 * the same capture. Their order alternates by the index in the preregistered seed list (even index: G0 first), never by outcome.
 * No other seed is searched. Admission estimates are planning figures; the post-timing diagnosis of a request has its own 30 s
 * host budget, so a started request can occupy more than its estimate.
 */
const SEC = 1000;
const TASK = 'IG-S09';

const COHORTS = Object.freeze({
  normal: Object.freeze({ level: 'normal', cellKind: 'normal', seeds: Object.freeze(Array.from({ length: 20 }, function (_v, i) {
    return 300 + i;
  })), perShard: 5, estimateMs: 8 * SEC, prefix: 'normal' }),
  nightmare: Object.freeze({ level: 'nightmare', cellKind: 'nightmare', seeds: Object.freeze(Array.from({ length: 10 }, function (_v, i) {
    return 700 + i;
  })), perShard: 2, estimateMs: 24 * SEC, prefix: 'nightmare' })
});

const ARMS = Object.freeze({
  g0: Object.freeze({ id: 'g0', arm: 'reference', gtArm: 'g0', solverMode: 'gt-g0 (native order, capture)' }),
  g1: Object.freeze({ id: 'g1', arm: 'prototype', gtArm: 'g1', solverMode: 'gt-g1 (solve first in the first technique pass, capture)' })
});

const CONTROL_SHARD = 'observer-control';
const CONTROL_SEEDS = Object.freeze({ normal: 300, nightmare: 700 });

function requestOf(level, seed) {
  return { variantId: 'greaterThan', difficulty: level, seed: seed, trace: 'summary' };
}

function shardName(cohort, first, last) {
  return COHORTS[cohort].prefix + '-' + first + '-' + last;
}

function jobOf(shard, cohort, seed, seedIndex, arm, blockKey, order) {
  const c = COHORTS[cohort];
  return {
    key: blockKey + '/' + arm.id,
    blockKey: blockKey,
    shard: shard,
    order: order,
    seedIndex: seedIndex,
    pairId: 'greaterThan:' + c.level + ':' + seed,
    gridCluster: null,
    requestSeed: seed,
    variantId: arm.id,
    puzzleVariant: 'greaterThan',
    level: c.level,
    mode: 'native',
    arm: arm.arm,
    gtArm: arm.gtArm,
    solverMode: arm.solverMode,
    executor: 'gt',
    adapterIds: ['gt-diagnostic'],
    cellKind: c.cellKind,
    request: requestOf(c.level, seed),
    estimateMs: c.estimateMs,
    guardScope: 'request'
  };
}

function controlJob(cohort, seed, blockKey, order) {
  const c = COHORTS[cohort];
  return {
    key: blockKey + '/native',
    blockKey: blockKey,
    shard: CONTROL_SHARD,
    order: order,
    seedIndex: c.seeds.indexOf(seed),
    pairId: 'control:greaterThan:' + c.level + ':' + seed,
    gridCluster: null,
    requestSeed: seed,
    variantId: 'native-observer-free',
    puzzleVariant: 'greaterThan',
    level: c.level,
    mode: 'native',
    arm: 'reference',
    gtArm: null,
    solverMode: 'native-w1 (observer-free, no capture hooks)',
    executor: null,
    adapterIds: [],
    cellKind: 'control',
    controlOf: c.level,
    request: requestOf(c.level, seed),
    estimateMs: c.estimateMs,
    guardScope: 'request'
  };
}

function shardList() {
  const out = [];
  ['normal', 'nightmare'].forEach(function (cohort) {
    const c = COHORTS[cohort];
    for (let i = 0; i < c.seeds.length; i += c.perShard) {
      const seeds = c.seeds.slice(i, i + c.perShard);
      out.push({ shard: shardName(cohort, seeds[0], seeds[seeds.length - 1]), cohort: cohort, seeds: seeds, firstIndex: i });
    }
  });
  return out;
}

module.exports = {
  TASK: TASK,
  COHORTS: COHORTS,
  ARMS: ARMS,
  CONTROL_SHARD: CONTROL_SHARD,
  CONTROL_SEEDS: CONTROL_SEEDS,
  requestOf: requestOf,
  shardList: shardList,
  shardName: shardName,
  build: function build() {
    const shards = shardList().map(function (s) {
      const c = COHORTS[s.cohort];
      const blocks = s.seeds.map(function (seed, k) {
        const seedIndex = s.firstIndex + k;
        const blockKey = TASK + '/' + s.shard + '/greaterThan:' + c.level + ':' + seed;
        const order = seedIndex % 2 === 0 ? ['g0', 'g1'] : ['g1', 'g0'];
        return { blockKey: blockKey, jobs: order.map(function (id, position) {
          return jobOf(s.shard, s.cohort, seed, seedIndex, ARMS[id], blockKey, k * 2 + position);
        }) };
      });
      return { shard: s.shard, kind: 'pipeline', blocks: blocks };
    });
    const controls = ['normal', 'nightmare'].map(function (cohort, index) {
      const seed = CONTROL_SEEDS[cohort];
      const blockKey = TASK + '/' + CONTROL_SHARD + '/greaterThan:' + COHORTS[cohort].level + ':' + seed;
      return { blockKey: blockKey, jobs: [controlJob(cohort, seed, blockKey, index)] };
    });
    shards.push({ shard: CONTROL_SHARD, kind: 'pipeline', blocks: controls });
    return { shards: shards };
  }
};
