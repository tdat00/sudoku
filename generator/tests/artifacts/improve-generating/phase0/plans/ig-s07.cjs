'use strict';

/*
 * Plan of IG-S07 (SM1 stage and finder profiles): the nine fixed shards of the task file, twelve requests. Six headline
 * cells and three control cells, every request trace off, rotational180, random order, the native variant options and the
 * native default attempts (no override), exactly the request of IG-S02's native-w1 arm. A profiled request is the native
 * pipeline on an engine instance with the adapter `profile` (arm `prototype`, executor `profile`); the three control shards
 * also hold one new unprofiled request (arm `reference`, the unchanged Host.runRequest path) run before it, as the index 0
 * of the seed list orders. The six headline shards have no unprofiled arm: their comparator is IG-S02's matched native-w1
 * record (harness generation dd759a22..., reused with the author's approval, never rerun).
 *
 * Execution order: the table order of the task file, except that classic9 (the cheapest) goes first as the plumbing check of
 * the first command, as in IG-S02 and IG-S03. Admission estimates are planning figures for the 270 s window (the matched
 * IG-S02 native ready wall plus a margin for the instrumentation and the independent audit), not expectations. Everything is
 * provisional (pre-freeze). The revision r2 adds the request-free shard `lc`, whose command runs only the loop-check comparison.
 */
const path = require('path');
const C = require('../common.cjs');
const PLAN03 = require('./ig-s03.cjs');

const SEC = 1000;
const TASK = 'IG-S07';

// Literal seeds of the task file, in execution order.
const CELLS = Object.freeze([
  { shard: 'c9', cell: 'classic9', level: 'nightmare', seed: 3, kind: 'headline', estimate: 14 * SEC },
  { shard: 'm16', cell: 'mega16', level: 'nightmare', seed: 3, kind: 'headline', estimate: 135 * SEC },
  { shard: 'm12', cell: 'mega12', level: 'nightmare', seed: 3, kind: 'headline', estimate: 33 * SEC },
  { shard: 'sam', cell: 'samurai', level: 'nightmare', seed: 42, kind: 'headline', estimate: 32 * SEC },
  { shard: 'killer-n', cell: 'killer', level: 'nightmare', seed: 3, kind: 'headline', estimate: 31 * SEC },
  { shard: 'gt-n', cell: 'greaterThan', level: 'nightmare', seed: 3, kind: 'headline', estimate: 20 * SEC },
  { shard: 'killer-h', cell: 'killer', level: 'hard', seed: 1, kind: 'control', estimate: 12 * SEC },
  { shard: 'killer-e', cell: 'killer', level: 'expert', seed: 1, kind: 'control', estimate: 15 * SEC },
  { shard: 'gt-normal', cell: 'greaterThan', level: 'normal', seed: 300, kind: 'control', estimate: 8 * SEC }
]);

const ARMS = Object.freeze({
  profiled: Object.freeze({ id: 'profiled', arm: 'prototype', solverMode: 'profiled', executor: 'profile',
    adapterIds: Object.freeze(['profile']) }),
  unprofiled: Object.freeze({ id: 'unprofiled', arm: 'reference', solverMode: 'native-w1', executor: null,
    adapterIds: Object.freeze([]) })
});

// The revision r2: one command with no request at all. Its `prepare` runs the loop-check comparison on the real engine
// (see ig07-run.cjs); it adds no cell, no seed and no cohort.
const LOOP_SHARD = 'lc';

function requestOf(cell) {
  return { variantId: cell.cell, difficulty: cell.level, seed: cell.seed, trace: 'off', symmetry: 'rotational180',
    digOrder: 'random' };
}

function jobOf(cell, arm, blockKey, order) {
  const pairId = cell.cell + ':' + cell.level + ':' + cell.seed;
  return {
    key: blockKey + '/' + arm.id,
    blockKey: blockKey,
    shard: cell.shard,
    order: order,
    seedIndex: 0,
    pairId: pairId,
    gridCluster: null,
    requestSeed: cell.seed,
    variantId: arm.id,
    puzzleVariant: cell.cell,
    level: cell.level,
    mode: 'native',
    arm: arm.arm,
    solverMode: arm.solverMode,
    executor: arm.executor,
    adapterIds: arm.adapterIds.slice(),
    cellKind: cell.kind,
    request: requestOf(cell),
    estimateMs: cell.estimate,
    guardScope: 'request'
  };
}

/** The IG-S02 native-w1 records file of a headline cell (shard folder and attempt folder of its evidence). */
function baselineRecordsFile(repoRoot, cell, seed) {
  const entry = PLAN03.SAVED[cell] && PLAN03.SAVED[cell][seed];
  if (!entry) throw new C.HarnessError('plan-missing', 'no IG-S02 baseline listed for ' + cell + ':' + seed);
  const parts = [...C.EVIDENCE_REL.split('/'), PLAN03.BASELINE_ROUND, 'IG-S02', entry[0]];
  if (entry[1]) parts.push(entry[1]);
  parts.push('records.json');
  return { file: C.toPosix(path.relative(repoRoot, path.join(repoRoot, ...parts))), shard: entry[0], attemptDir: entry[1],
    key: 'IG-S02/' + entry[0] + '/' + cell + ':nightmare:' + seed + '/native-w1' };
}

module.exports = {
  TASK: TASK,
  CELLS: CELLS,
  ARMS: ARMS,
  LOOP_SHARD: LOOP_SHARD,
  baselineRecordsFile: baselineRecordsFile,
  build: function build() {
    const cellShards = CELLS.map(function (cell) {
      const blockKey = TASK + '/' + cell.shard + '/' + cell.cell + ':' + cell.level + ':' + cell.seed;
      const jobs = cell.kind === 'control' ?
        [jobOf(cell, ARMS.unprofiled, blockKey, 0), jobOf(cell, ARMS.profiled, blockKey, 1)] :
        [jobOf(cell, ARMS.profiled, blockKey, 0)];
      return { shard: cell.shard, kind: 'pipeline', blocks: [{ blockKey: blockKey, jobs: jobs }] };
    });
    return { shards: cellShards.concat([{ shard: LOOP_SHARD, kind: 'pipeline', blocks: [] }]) };
  }
};
