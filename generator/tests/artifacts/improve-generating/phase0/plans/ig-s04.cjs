'use strict';

/*
 * Plan of IG-S04 (frontier prototype and staged budget pilot): the maximum planned population of the task file, 64 grid
 * trials = 4 cells x grid seeds 11, 12 (attempt 1) x 8 modes (proposal-only, ordinary-only, F0, F1, FC, FM, FU, FS) at
 * sample ordinal 1, in the fixed priority order of the task as six shards. Everything is provisional (pre-freeze).
 *
 *   s1-large-controls     1. mega16/11 and samurai/11: the two native controls and F1 (the large-board probes); the
 *                            mandatory reprojection is emitted after it and before any other real trial
 *   s2-small-all          2. classic9 and mega12, seeds 11 and 12, all eight modes
 *   s3-large-native-f1    3. the remaining mega16/samurai native and F1 keys (seed 12)
 *   s4-large-floors       4. FC and FM on the large cells
 *   s5-large-reference    5. FU and FS on the large cells
 *   s6-large-s2-control   6. F0 on the large cells
 *
 * Arms rotate inside a priority block by the grid index (the index of the seed in the preregistered seed list), never by
 * speed or outcome. A logical block is one grid (cell, seed) of one shard; whole trials are packed into commands by the
 * admission estimates below (planning figures for the 45 s trial guard, never expectations). Keys that are not reached
 * stay explicitly unstarted/inconclusive: they are not zero-cost trials and not censored observations. The seeds 11, 12 are
 * disjoint from the screening (101-140) and held-out (201-240) requests.
 */
const F = require('../frontier.cjs');

const SEC = 1000;
const TASK = 'IG-S04';
const LEVEL = 'nightmare';
const SEEDS = Object.freeze([11, 12]);
const SMALL = Object.freeze(['classic9', 'mega12']);
const LARGE = Object.freeze(['mega16', 'samurai']);
const CELLS = Object.freeze(SMALL.concat(LARGE));
const PRIMARY = Object.freeze(['proposal-only', 'ordinary-only', 'F1']);

// Admission estimates (ms) per cell and mode kind, validation and the post-timing audit reserve included.
const ESTIMATE_MS = Object.freeze({
  classic9: Object.freeze({ proposal: 4 * SEC, ordinary: 5 * SEC, frontier: 12 * SEC }),
  mega12: Object.freeze({ proposal: 8 * SEC, ordinary: 16 * SEC, frontier: 34 * SEC }),
  mega16: Object.freeze({ proposal: 14 * SEC, ordinary: 32 * SEC, frontier: 62 * SEC }),
  samurai: Object.freeze({ proposal: 14 * SEC, ordinary: 32 * SEC, frontier: 62 * SEC })
});

const SHARDS = Object.freeze([
  Object.freeze({ shard: 's1-large-controls', priority: 1, cells: LARGE, seeds: Object.freeze([11]), modes: PRIMARY }),
  Object.freeze({ shard: 's2-small-all', priority: 2, cells: SMALL, seeds: SEEDS, modes: F.MODE_ORDER }),
  Object.freeze({ shard: 's3-large-native-f1', priority: 3, cells: LARGE, seeds: Object.freeze([12]), modes: PRIMARY }),
  Object.freeze({ shard: 's4-large-floors', priority: 4, cells: LARGE, seeds: SEEDS, modes: Object.freeze(['FC', 'FM']) }),
  Object.freeze({ shard: 's5-large-reference', priority: 5, cells: LARGE, seeds: SEEDS, modes: Object.freeze(['FU', 'FS']) }),
  Object.freeze({ shard: 's6-large-s2-control', priority: 6, cells: LARGE, seeds: SEEDS, modes: Object.freeze(['F0']) })
]);

function estimateOf(cell, mode) {
  const row = ESTIMATE_MS[cell];
  if (mode === 'proposal-only') return row.proposal;
  if (mode === 'ordinary-only') return row.ordinary;
  return row.frontier;
}

/** The modes of a block rotated left by the grid index. */
function rotate(modes, index) {
  const k = index % modes.length;
  return modes.slice(k).concat(modes.slice(0, k));
}

function block(spec, cell, seed, order0) {
  const seedIndex = SEEDS.indexOf(seed);
  const cluster = cell + ':' + LEVEL + ':' + seed;
  const blockKey = TASK + '/' + spec.shard + '/' + cluster;
  return {
    blockKey: blockKey,
    jobs: rotate(spec.modes.slice(), seedIndex).map(function (mode, position) {
      return {
        key: blockKey + '/' + mode,
        blockKey: blockKey,
        shard: spec.shard,
        order: order0 + position,
        seedIndex: seedIndex,
        pairId: null,
        gridCluster: cell + ':' + seed,
        requestSeed: seed,
        variantId: mode,
        puzzleVariant: cell,
        level: LEVEL,
        mode: mode,
        arm: mode,
        solverMode: 'reference',
        executor: 'frontier-trial',
        adapterIds: ['frontier-hooks'],
        request: { variantId: cell, difficulty: LEVEL, seed: seed, trace: 'off', symmetry: 'rotational180',
          digOrder: 'random' },
        trial: { mode: mode, sample: 1, attempt: 1 },
        estimateMs: estimateOf(cell, mode),
        guardScope: 'sample'
      };
    })
  };
}

module.exports = {
  TASK: TASK,
  LEVEL: LEVEL,
  SEEDS: SEEDS,
  CELLS: CELLS,
  SMALL: SMALL,
  LARGE: LARGE,
  SHARDS: SHARDS,
  ESTIMATE_MS: ESTIMATE_MS,
  estimateOf: estimateOf,
  rotate: rotate,
  build: function build() {
    return {
      shards: SHARDS.map(function (spec) {
        const blocks = [];
        let order = 0;
        spec.cells.forEach(function (cell) {
          spec.seeds.forEach(function (seed) {
            const b = block(spec, cell, seed, order);
            order += b.jobs.length;
            blocks.push(b);
          });
        });
        return { shard: spec.shard, kind: 'pipeline', blocks: blocks };
      })
    };
  }
};
