'use strict';

/*
 * Plan of IG-S08 (bounded SM3 attribution of the Jigsaw Expert request of seed 1111; pre-MS07, provisional (pre-freeze)): the two
 * fixed shards of the task file, three real requests.
 *
 *   control  Jigsaw Expert seed 1100: one native request (arm `reference`, the unchanged host path, run first as the index 0 of
 *            the seed list orders) and one observed request (arm `prototype`, the adapter `jigsaw-profile`, the same default
 *            configuration). The first command also runs the unmeasured checks of the instrument and the synthetic
 *            short-timeout journal recovery test (ig08-run.cjs `prepare`). No other seed is searched.
 *   tail     Jigsaw Expert seed 1111: one observed request under the Jigsaw diagnostic guard (240 s). The result is whatever the
 *            window allows: a decision, or a censored lower bound at the limit actually applied.
 *
 * Every request is native `jigsaw9`, Expert, trace off, rotational180, random dig order, default variant options and default
 * attempts (no override). Admission estimates are planning figures for the 270 s window, not expectations: the tail's 180 s is the
 * least observation window worth starting (the dispatcher's remaining task time decides how long the host actually waits).
 */
const SEC = 1000;
const TASK = 'IG-S08';

const CONTROL_SEED = 1100;
const TAIL_SEED = 1111;

function requestOf(seed) {
  return { variantId: 'jigsaw9', difficulty: 'expert', seed: seed, trace: 'off', symmetry: 'rotational180', digOrder: 'random' };
}

const ARMS = Object.freeze({
  unprofiled: Object.freeze({ id: 'unprofiled', arm: 'reference', solverMode: 'native-w1', executor: null,
    adapterIds: Object.freeze([]) }),
  profiled: Object.freeze({ id: 'profiled', arm: 'prototype', solverMode: 'beacon', executor: 'jigsaw',
    adapterIds: Object.freeze(['jigsaw-profile']) })
});

function jobOf(shard, seed, arm, blockKey, order, seedIndex, estimateMs, guardScope) {
  return {
    key: blockKey + '/' + arm.id,
    blockKey: blockKey,
    shard: shard,
    order: order,
    seedIndex: seedIndex,
    pairId: 'jigsaw9:expert:' + seed,
    gridCluster: null,
    requestSeed: seed,
    variantId: arm.id,
    puzzleVariant: 'jigsaw9',
    level: 'expert',
    mode: 'native',
    arm: arm.arm,
    solverMode: arm.solverMode,
    executor: arm.executor,
    adapterIds: arm.adapterIds.slice(),
    cellKind: shard === 'tail' ? 'tail' : 'control',
    request: requestOf(seed),
    estimateMs: estimateMs,
    guardScope: guardScope
  };
}

module.exports = {
  TASK: TASK,
  CONTROL_SEED: CONTROL_SEED,
  TAIL_SEED: TAIL_SEED,
  CONTROL_SHARD: 'control',
  TAIL_SHARD: 'tail',
  ARMS: ARMS,
  requestOf: requestOf,
  build: function build() {
    const controlBlock = TASK + '/control/jigsaw9:expert:' + CONTROL_SEED;
    const tailBlock = TASK + '/tail/jigsaw9:expert:' + TAIL_SEED;
    return {
      shards: [
        { shard: 'control', kind: 'pipeline', blocks: [{ blockKey: controlBlock, jobs: [
          jobOf('control', CONTROL_SEED, ARMS.unprofiled, controlBlock, 0, 0, 5 * SEC, 'request'),
          jobOf('control', CONTROL_SEED, ARMS.profiled, controlBlock, 1, 0, 7 * SEC, 'request')] }] },
        { shard: 'tail', kind: 'pipeline', blocks: [{ blockKey: tailBlock, jobs: [
          jobOf('tail', TAIL_SEED, ARMS.profiled, tailBlock, 0, 1, 180 * SEC, 'jigsaw')] }] }
      ]
    };
  }
};
