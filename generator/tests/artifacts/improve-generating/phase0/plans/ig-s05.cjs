'use strict';

/*
 * Plan of IG-S05 (paired SM2 grid screen and yield rates): the preregistered design of the task file, provisional
 * (pre-freeze). Four cells (classic9, mega12, mega16, samurai), Nightmare, eight literal grid-seed clusters 101-108
 * (40 clusters, 101-140, in the frozen round), the eight modes of IG-S04, at most two samples (`dig#1.1`, `dig#1.2`) per
 * grid trial: 32 grid clusters, 256 grid-mode trials and 512 sample observations in the provisional round.
 *
 * Logical blocks (priority = the suffix of the task file): (1) primary: proposal-only, ordinary-only, F1; (2) floors: FC,
 * FM; (3) reference: FU, FS; (4) s2-control: F0. A block is one tier of one cell and one seed block of four clusters:
 * 4 cells x 2 seed blocks x 4 tiers = 32 logical blocks. Inside a tier the seed block 101-104 is visited across the four
 * cells in the listed order, then 105-108; inside a block the arms rotate by the cluster index (the index of the seed in
 * the preregistered seed list), never by speed or outcome. The whole design is ONE shard (`screen`) so that the physical
 * packing (a separate, separately hashed layer: manifest.packCommands) flows across blocks and tiers and a logical block
 * may span commands; the priority order is the order of the keys, so a pause leaves the extension tiers unstarted.
 *
 * Budget: every frontier arm of a cell uses the vector of that cell in the frozen IG-S04 budgets (budgets-r2.json, the
 * hash below is checked here: a mismatch is a source/budget mismatch and nothing runs). The native-kind controls keep their
 * native guards and caps. Nothing is retuned after a result is seen.
 *
 * Admission estimates (ms) are pilot-based: the larger of the two IG-S04 pilot grids of the same cell and mode (cold wall of
 * a one-sample trial, independent verification; for a frontier mode the largest figure of any frontier mode of the cell, with a
 * floor), two samples, the post-timing parent classification and a margin; never the old 62 s/trial figures. They are planning
 * figures for packing, not expectations. Never splits a started trial.
 */
const fs = require('fs');
const path = require('path');
const C = require('../common.cjs');
const F = require('../frontier.cjs');

const HarnessError = C.HarnessError;

const TASK = 'IG-S05';
const SHARD = 'screen';
const LEVEL = 'nightmare';
const CELLS = Object.freeze(['classic9', 'mega12', 'mega16', 'samurai']);
const SEEDS_PROVISIONAL = Object.freeze([101, 102, 103, 104, 105, 106, 107, 108]);
const SEEDS_FROZEN = Object.freeze(Array.from({ length: 40 }, function (_x, i) { return 101 + i; }));
const BLOCK_SIZE = 4;
const SAMPLES = 2;

const TIERS = Object.freeze([
  Object.freeze({ id: 'primary', priority: 1, modes: Object.freeze(['proposal-only', 'ordinary-only', 'F1']) }),
  Object.freeze({ id: 'floors', priority: 2, modes: Object.freeze(['FC', 'FM']) }),
  Object.freeze({ id: 'reference', priority: 3, modes: Object.freeze(['FU', 'FS']) }),
  Object.freeze({ id: 's2-control', priority: 4, modes: Object.freeze(['F0']) })
]);

const BUDGET_REL = 'docs/improve-generating/evidence/phase0/provisional-r1/IG-S04/budgets-r2.json';
const BUDGET_HASH = 'f0a0c422032765250d4b8f5daa5f2cfb9c30dc8dcb7ebceab8036bd87a44c755';
const VARIANT_REL = 'docs/improve-generating/evidence/phase0/provisional-r1/IG-S04/variant-manifest-r2.json';
const VARIANT_HASH = '4b2aa26d4dbd4b8eb8bfab02d6cd8a5e0671a2710354e4e7029ef712f769d02b';
const FROZEN_BUDGET_REL = 'docs/improve-generating/evidence/phase0/frozen-gate/IG-S04/budgets.json';

// [cold wall of a one-sample trial, independent verification] in ms: the larger of the two IG-S04 pilot grids (11, 12), rounded
// up to 10 ms. The startup of a worker is about 100 ms.
const PILOT_MS = Object.freeze({
  classic9: Object.freeze({ 'proposal-only': [120, 100], 'ordinary-only': [340, 110], F0: [120, 100], F1: [120, 100],
    FC: [120, 100], FM: [130, 100], FU: [130, 100], FS: [130, 100] }),
  mega12: Object.freeze({ 'proposal-only': [250, 160], 'ordinary-only': [870, 160], F0: [5000, 140], F1: [5090, 140],
    FC: [5010, 140], FM: [5040, 140], FU: [220, 140], FS: [5060, 140] }),
  mega16: Object.freeze({ 'proposal-only': [1240, 190], 'ordinary-only': [9890, 200], F0: [400, 110], F1: [330, 110],
    FC: [720, 210], FM: [730, 200], FU: [360, 110], FS: [360, 100] }),
  samurai: Object.freeze({ 'proposal-only': [580, 200], 'ordinary-only': [600, 160], F0: [280, 110], F1: [260, 100],
    FC: [2870, 230], FM: [2880, 230], FU: [260, 120], FS: [270, 110] })
});
const STARTUP_MS = 100;
const PARENT_RESERVE_MS = Object.freeze({ classic9: 400, mega12: 1500, mega16: 2000, samurai: 2000 });
const MARGIN_FACTOR = 1.25;
const MARGIN_MS = 500;
// The frontier variants share phase A and differ in the tail (deepen, the FU filter, the snapshot), and two pilot grids cannot
// bound that tail: a frontier trial is estimated from the largest pilot figure of ANY frontier mode of its cell and never
// below this floor (the development check saw a mega16 FC trial at 3.8 s against a 0.7 s pilot).
const FRONTIER_FLOOR_MS = Object.freeze({ classic9: 1500, mega12: 8000, mega16: 8000, samurai: 8000 });

/** The admission estimate (ms) of one grid trial: two samples, verification, the parent classification, a margin. */
function estimateOf(cell, mode) {
  const row = PILOT_MS[cell] && PILOT_MS[cell][mode];
  if (!row) throw new HarnessError('plan-missing', 'no pilot figure for ' + cell + '/' + mode);
  const frontier = F.MODES[mode].kind === 'frontier';
  let cold = row[0];
  let verification = row[1];
  if (frontier) {
    F.FRONTIER_IDS.forEach(function (m) {
      cold = Math.max(cold, PILOT_MS[cell][m][0]);
      verification = Math.max(verification, PILOT_MS[cell][m][1]);
    });
  }
  const parent = frontier ? PARENT_RESERVE_MS[cell] : 0;
  const raw = 2 * cold - STARTUP_MS + verification + parent;
  const ms = Math.ceil((raw * MARGIN_FACTOR + MARGIN_MS) / 100) * 100;
  return frontier ? Math.max(ms, FRONTIER_FLOOR_MS[cell]) : ms;
}

/** The modes of a tier rotated left by the cluster index. */
function rotate(modes, index) {
  const k = index % modes.length;
  return modes.slice(k).concat(modes.slice(0, k));
}

function digestOfBudgets(doc) {
  const copy = Object.assign({}, doc);
  delete copy.hash;
  return C.digestOf(copy);
}

/**
 * The frozen budget vectors. The provisional round reads the file that IG-S04's acceptance froze and refuses any other
 * hash. The frozen round reads the budgets recomputed on the frozen pilot when that file exists; before it does (plan-only,
 * the cost projection) the provisional vectors stand in and the source says so: a frozen run never starts on a projection
 * (ig05-run.cjs `prepare`).
 */
function loadBudgets(round, repoRoot) {
  const root = repoRoot || C.DEFAULT_REPO_ROOT;
  const frozen = round === C.ROUND_FROZEN;
  const frozenFile = path.join(root, ...FROZEN_BUDGET_REL.split('/'));
  let rel = BUDGET_REL;
  let source = 'frozen-by-ig-s04-acceptance';
  if (frozen) {
    if (fs.existsSync(frozenFile)) {
      rel = FROZEN_BUDGET_REL;
      source = 'recomputed-on-the-frozen-pilot';
    } else {
      source = 'projection-from-provisional-r2 (the frozen pilot budgets are not recomputed yet)';
    }
  }
  const file = path.join(root, ...rel.split('/'));
  if (!fs.existsSync(file)) throw new HarnessError('plan-missing', 'the frozen budgets are missing: ' + rel);
  const doc = C.readJson(file);
  if (digestOfBudgets(doc) !== doc.hash) {
    throw new HarnessError('plan-missing', 'budget mismatch: ' + rel + ' does not match its own hash');
  }
  if (rel === BUDGET_REL && doc.hash !== BUDGET_HASH) {
    throw new HarnessError('plan-missing', 'budget mismatch: ' + rel + ' has hash ' + doc.hash + ', the frozen one is ' +
      BUDGET_HASH);
  }
  CELLS.forEach(function (cell) {
    const c = doc.cells && doc.cells[cell];
    if (!c || c.status !== 'fitted' || !c.limits) {
      throw new HarnessError('plan-missing', 'budget mismatch: the budget of ' + cell + ' is not a fitted vector');
    }
  });
  return { doc: doc, rel: rel, hash: doc.hash, source: source, projection: frozen && source.indexOf('projection') === 0 };
}

function seedsOf(round) {
  return round === C.ROUND_FROZEN ? SEEDS_FROZEN : SEEDS_PROVISIONAL;
}

function seedBlocks(seeds) {
  const out = [];
  for (let i = 0; i < seeds.length; i += BLOCK_SIZE) out.push(seeds.slice(i, i + BLOCK_SIZE));
  return out;
}

function build(spec) {
  const round = spec && spec.round ? spec.round : 'provisional-r1';
  const seeds = seedsOf(round);
  const budgets = loadBudgets(round, spec && spec.repoRoot);
  const blocks = [];
  let order = 0;
  TIERS.forEach(function (tier) {
    seedBlocks(seeds).forEach(function (seedBlock) {
      CELLS.forEach(function (cell) {
        const blockKey = TASK + '/' + SHARD + '/' + tier.id + '/' + cell + ':' + seedBlock[0] + '-' +
          seedBlock[seedBlock.length - 1];
        const jobs = [];
        seedBlock.forEach(function (seed) {
          const clusterIndex = seeds.indexOf(seed);
          rotate(tier.modes.slice(), clusterIndex).forEach(function (mode) {
            const kind = F.MODES[mode].kind;
            jobs.push({
              key: TASK + '/' + SHARD + '/' + cell + ':' + LEVEL + ':' + seed + '/' + mode,
              blockKey: blockKey,
              shard: SHARD,
              order: order++,
              seedIndex: clusterIndex,
              pairId: null,
              gridCluster: cell + ':' + seed,
              requestSeed: seed,
              variantId: mode,
              puzzleVariant: cell,
              level: LEVEL,
              mode: mode,
              arm: mode,
              tier: tier.id,
              priority: tier.priority,
              solverMode: 'reference',
              executor: 'screen-trial',
              adapterIds: ['frontier-hooks'],
              request: { variantId: cell, difficulty: LEVEL, seed: seed, trace: 'off', symmetry: 'rotational180',
                digOrder: 'random' },
              trial: { mode: mode, samples: SAMPLES, attempt: 1, forks: ['dig#1.1', 'dig#1.2'],
                limits: kind === 'frontier' ? Object.assign({}, budgets.doc.cells[cell].limits) : null,
                budgetHash: kind === 'frontier' ? budgets.hash : null },
              estimateMs: estimateOf(cell, mode),
              guardScope: 'sample'
            });
          });
        });
        blocks.push({ blockKey: blockKey, jobs: jobs });
      });
    });
  });
  return { shards: [{ shard: SHARD, kind: 'pipeline', blocks: blocks }] };
}

module.exports = {
  TASK, SHARD, LEVEL, CELLS, SEEDS_PROVISIONAL, SEEDS_FROZEN, BLOCK_SIZE, SAMPLES, TIERS, BUDGET_REL, BUDGET_HASH,
  VARIANT_REL, VARIANT_HASH, FROZEN_BUDGET_REL, PILOT_MS, STARTUP_MS, PARENT_RESERVE_MS, MARGIN_FACTOR, MARGIN_MS,
  FRONTIER_FLOOR_MS,
  estimateOf, rotate, loadBudgets, seedsOf, seedBlocks, digestOfBudgets, build
};
