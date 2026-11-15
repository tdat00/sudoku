'use strict';

/*
 * Plan of IG-S10 (results reconciliation and the frozen-rerun handoff; provisional (pre-freeze)): one analysis shard,
 * `reconcile`, one logical job. It reads the evidence of IG-S01 to IG-S09, runs the synthetic reporting and gate tests and
 * writes the round-level documents. It generates no puzzle and loads no engine: its `analysis` kind is run by
 * `ig10-run.cjs` (`runAnalysis`) inside the supplied low-priority wrapper, like every other command of the pack.
 *
 * The admission estimate is the task's own projection: under 3.25 min of analysis and validation (3 min here, so that the job fits the
 * 183 s request window of the 195 s deadline the 4-minute allocation leaves after the 45 s grace), 0.75 min of quiet-admission grace
 * (45 s) charged by the dispatcher: 225 s of the 240 s allocation.
 */
const SEC = 1000;
const TASK = 'IG-S10';
const SHARD = 'reconcile';
const KEY = TASK + '/' + SHARD + '/reconcile';

module.exports = {
  TASK: TASK,
  SHARD: SHARD,
  KEY: KEY,
  ESTIMATE_MS: 180 * SEC,
  build: function build() {
    const job = {
      key: KEY,
      blockKey: KEY,
      shard: SHARD,
      order: 0,
      seedIndex: 0,
      pairId: null,
      gridCluster: null,
      requestSeed: null,
      variantId: 'reconcile',
      puzzleVariant: null,
      level: null,
      mode: 'analysis',
      arm: null,
      recordKind: 'analysis',
      solverMode: 'analysis',
      executor: 'analysis',
      adapterIds: [],
      request: null,
      estimateMs: 180 * SEC,
      guardScope: 'command'
    };
    return { shards: [{ shard: SHARD, kind: 'analysis', blocks: [{ blockKey: KEY, jobs: [job] }] }] };
  }
};
