'use strict';

/*
 * Manifests of the phase-0 harness: the immutable logical jobs (keys, order, expected keys, reference/prototype
 * order by seed-list index), the physical packing of whole logical blocks into admitted commands (a separate,
 * separately fingerprinted layer) and the budget arithmetic (allocations, the effective host deadline, admission).
 * A manifest is built before anything is generated and never changes with an outcome.
 * Later tasks register a plan in `plans/<task>.cjs` ({ build({ round }) -> { shards } }), loaded lazily.
 */
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');

const HarnessError = C.HarnessError;

const MIN = 60000;

// The pack's machine allocations (check-list section 2), admission grace included; the reserve is separate.
const ALLOCATIONS_MS = Object.freeze({
  'IG-S01': 4 * MIN, 'IG-S02': 25 * MIN, 'IG-S03': 22 * MIN, 'IG-S04': 12 * MIN, 'IG-S05': 48 * MIN,
  'IG-S06': 24 * MIN, 'IG-S07': 12 * MIN, 'IG-S08': 6 * MIN, 'IG-S09': 15 * MIN, 'IG-S10': 4 * MIN
});
const RESERVE_MS = 8 * MIN;
const TOTAL_MS = 180 * MIN;

/** Reference and prototype alternate by the index in the preregistered seed list, never by outcome. */
function pairOrderFor(seedIndex) {
  return seedIndex % 2 === 0 ? ['reference', 'prototype'] : ['prototype', 'reference'];
}

// --- IG-S01 ------------------------------------------------------------------------------------------------

// Two fixed correctness controls: native defaults, trace off, one result per loader. Not timing observations.
const PARITY_PUZZLES = Object.freeze([
  Object.freeze({ variantId: 'classic4', level: 'veryEasy', seed: 1 }),
  Object.freeze({ variantId: 'classic9', level: 'hard', seed: 1 })
]);
const PARITY_ARMS = Object.freeze({
  reference: Object.freeze({ id: 'native', adapterIds: Object.freeze([]) }),
  prototype: Object.freeze({ id: 'noop-expose', adapterIds: Object.freeze(['noop-expose']) })
});
const PARITY_ESTIMATE_MS = 10000;

function ig01Plan() {
  return {
    build: function build() {
      const shard = 'loader-parity';
      const blocks = PARITY_PUZZLES.map(function (p, index) {
        const pairId = p.variantId + ':' + p.level + ':' + p.seed;
        const blockKey = 'IG-S01/' + shard + '/' + pairId;
        const jobs = pairOrderFor(index).map(function (arm, position) {
          return {
            key: blockKey + '/' + PARITY_ARMS[arm].id,
            blockKey: blockKey,
            shard: shard,
            order: index * 2 + position,
            seedIndex: index,
            pairId: pairId,
            gridCluster: null,
            requestSeed: p.seed,
            variantId: PARITY_ARMS[arm].id,
            puzzleVariant: p.variantId,
            level: p.level,
            mode: 'native-default',
            arm: arm,
            adapterIds: PARITY_ARMS[arm].adapterIds.slice(),
            request: { variantId: p.variantId, difficulty: p.level, seed: p.seed, trace: 'off' },
            estimateMs: PARITY_ESTIMATE_MS,
            guardScope: 'request'
          };
        });
        return { blockKey: blockKey, jobs: jobs };
      });
      return {
        shards: [
          { shard: 'self-test', kind: 'synthetic', blocks: [] },
          { shard: shard, kind: 'pipeline', blocks: blocks }
        ]
      };
    }
  };
}

function taskPlan(task) {
  if (task === 'IG-S01') return ig01Plan();
  const file = path.join(C.HARNESS_DIR, 'plans', task.toLowerCase() + '.cjs');
  if (!fs.existsSync(file)) {
    throw new HarnessError('plan-missing', task + ' has no plan in this harness yet (plans/' +
      task.toLowerCase() + '.cjs is added by that task)');
  }
  const plan = require(file);
  if (!plan || typeof plan.build !== 'function') {
    throw new HarnessError('plan-missing', 'plans/' + task.toLowerCase() + '.cjs does not export build()');
  }
  return plan;
}

/** Fails closed on duplicate keys, orphan jobs, a test-only setting or guards that are not the production ones. */
function validateManifest(manifest) {
  const keys = new Set();
  manifest.jobs.forEach(function (job) {
    if (keys.has(job.key)) throw new HarnessError('duplicate-key', 'duplicate row key ' + job.key);
    keys.add(job.key);
    if (!(Number.isFinite(job.estimateMs) && job.estimateMs > 0)) {
      throw new HarnessError('manifest-shape', 'no admission estimate for ' + job.key);
    }
  });
  const blockKeys = new Set();
  manifest.blocks.forEach(function (block) {
    if (blockKeys.has(block.blockKey)) throw new HarnessError('duplicate-key', 'duplicate block ' + block.blockKey);
    blockKeys.add(block.blockKey);
    block.jobKeys.forEach(function (k) {
      if (!keys.has(k)) throw new HarnessError('manifest-shape', 'block ' + block.blockKey + ' names unknown ' + k);
    });
  });
  if (C.hasKeyDeep(manifest, 'testOnly')) {
    throw new HarnessError('test-only-leak', 'a test-only setting is in a generation manifest');
  }
  if (C.canonicalJson(manifest.guards) !== C.canonicalJson(C.GUARDS)) {
    throw new HarnessError('test-only-leak', 'manifest guards differ from the production guards');
  }
  return manifest;
}

function buildManifest(task, round) {
  if (!Object.prototype.hasOwnProperty.call(ALLOCATIONS_MS, task)) {
    throw new HarnessError('plan-missing', 'unknown task ' + task);
  }
  const spec = taskPlan(task).build({ round: round });
  const shards = [];
  const blocks = [];
  const jobs = [];
  spec.shards.forEach(function (s) {
    const jobKeys = [];
    s.blocks.forEach(function (b) {
      b.jobs.forEach(function (j) { jobs.push(j); jobKeys.push(j.key); });
      blocks.push({
        blockKey: b.blockKey,
        shard: s.shard,
        jobKeys: b.jobs.map(function (j) { return j.key; }),
        estimateMs: b.jobs.reduce(function (sum, j) { return sum + j.estimateMs; }, 0)
      });
    });
    shards.push({ shard: s.shard, kind: s.kind, blockKeys: s.blocks.map(function (b) { return b.blockKey; }),
      jobKeys: jobKeys });
  });
  const pairOrder = [];
  const seen = new Set();
  jobs.forEach(function (j) {
    if (j.pairId && !seen.has(j.pairId)) {
      seen.add(j.pairId);
      pairOrder.push({ pairId: j.pairId, seedIndex: j.seedIndex, order: pairOrderFor(j.seedIndex) });
    }
  });
  const manifest = {
    schema: C.SCHEMA,
    task: task,
    round: round,
    evidenceStatus: round === C.ROUND_FROZEN ? C.EVIDENCE_FROZEN : C.EVIDENCE_PROVISIONAL,
    guards: Object.assign({}, C.GUARDS),
    pairOrder: pairOrder,
    shards: shards,
    blocks: blocks,
    jobs: jobs
  };
  validateManifest(manifest);
  manifest.manifestHash = C.digestOf(manifest);
  return manifest;
}

function shardOf(manifest, name) {
  return manifest.shards.find(function (s) { return s.shard === name; }) || null;
}

function jobsOf(manifest, keys) {
  const wanted = new Set(keys);
  return manifest.jobs.filter(function (j) { return wanted.has(j.key); });
}

// --- physical packing ---------------------------------------------------------------------------------------

/** The usable request window of a command with this host deadline: the finalize reserve and a start margin kept. */
function commandWindowMs(deadlineMs) {
  return Math.max(0, deadlineMs - C.GUARDS.finalizeReserveMs - 2 * C.GUARDS.startMarginMs);
}

/**
 * Packs consecutive complete logical blocks into commands up to the window, in order, never reordering or
 * splitting a block that fits. A block larger than the window is split into its (never-started) jobs; a single job
 * larger than the window is reported as oversize and is never started. The physical plan has its own hash; the
 * logical manifest hash does not change with the packing.
 */
function packCommands(blocks, windowMs) {
  const items = [];
  blocks.forEach(function (b) {
    if (b.estimateMs <= windowMs || !b.jobs) {
      items.push({ blockKey: b.blockKey, jobKeys: b.jobKeys.slice(), estimateMs: b.estimateMs, split: false });
    } else {
      b.jobs.forEach(function (j) {
        items.push({ blockKey: b.blockKey, jobKeys: [j.key], estimateMs: j.estimateMs, split: true });
      });
    }
  });
  const commands = [];
  let current = null;
  items.forEach(function (it) {
    if (current && current.estimateMs + it.estimateMs <= windowMs) {
      if (current.blockKeys.indexOf(it.blockKey) < 0) current.blockKeys.push(it.blockKey);
      current.jobKeys = current.jobKeys.concat(it.jobKeys);
      current.estimateMs += it.estimateMs;
      current.split = current.split || it.split;
    } else {
      current = { index: commands.length, blockKeys: [it.blockKey], jobKeys: it.jobKeys.slice(),
        estimateMs: it.estimateMs, split: it.split };
      commands.push(current);
    }
  });
  const oversize = [];
  items.forEach(function (it) { if (it.estimateMs > windowMs) oversize.push.apply(oversize, it.jobKeys); });
  return { windowMs: windowMs, commands: commands, oversize: oversize,
    hash: C.digestOf({ windowMs: windowMs, commands: commands, oversize: oversize }) };
}

/** The blocks of a manifest that still hold keys to run, narrowed to those keys, with their jobs. */
function blocksFor(manifest, keys) {
  const wanted = new Set(keys);
  const out = [];
  manifest.blocks.forEach(function (b) {
    const jobs = manifest.jobs.filter(function (j) { return j.blockKey === b.blockKey && wanted.has(j.key); });
    if (jobs.length === 0) return;
    out.push({
      blockKey: b.blockKey,
      jobKeys: jobs.map(function (j) { return j.key; }),
      estimateMs: jobs.reduce(function (sum, j) { return sum + j.estimateMs; }, 0),
      jobs: jobs
    });
  });
  return out;
}

function projectedMachineMs(physicalPlan) {
  return physicalPlan.commands.reduce(function (sum, c) { return sum + c.estimateMs + C.GUARDS.graceMs; }, 0);
}

// --- budget ---------------------------------------------------------------------------------------------------

/**
 * The host deadline of a command: 270 s, but never beyond the remaining task or round time once this command's
 * quiet-admission grace is charged. The finalize reserve stays inside it.
 */
function effectiveDeadlineMs(remainingTaskMs, remainingRoundMs) {
  const grace = C.GUARDS.graceMs;
  return Math.max(0, Math.floor(Math.min(C.GUARDS.commandMs, remainingTaskMs - grace, remainingRoundMs - grace)));
}

function sumMs(items, field) {
  return items.reduce(function (sum, item) { return sum + (Number.isFinite(item[field]) ? item[field] : 0); }, 0);
}

/**
 * Remaining machine time of a task and of the round. A provisional round uses the pack's allocations; a frozen
 * round only what its budget receipt authorises (nothing without one). Extra time needs an approval entry the
 * orchestrator wrote into the ledger: { task | 'round', extraMs, by }.
 */
function budgetState(input) {
  const task = input.task;
  const frozen = input.round === C.ROUND_FROZEN;
  const receipt = input.receipt || null;
  let allocationMs;
  let roundAllocationMs;
  if (frozen) {
    allocationMs = receipt && receipt.perTaskMs && Number.isFinite(receipt.perTaskMs[task]) ? receipt.perTaskMs[task] : 0;
    roundAllocationMs = receipt && Number.isFinite(receipt.authorisedTotalMs) ? receipt.authorisedTotalMs : 0;
  } else {
    allocationMs = ALLOCATIONS_MS[task] || 0;
    roundAllocationMs = TOTAL_MS;
  }
  const approvals = input.approvals || [];
  const taskApproved = sumMs(approvals.filter(function (a) { return a.task === task; }), 'extraMs');
  const roundApproved = sumMs(approvals.filter(function (a) { return a.task === 'round'; }), 'extraMs');
  const charges = input.charges || [];
  const taskCharged = sumMs(charges.filter(function (c) { return c.task === task; }), 'chargedMs');
  const roundCharged = sumMs(charges, 'chargedMs');
  const remainingTaskMs = Math.max(0, allocationMs + taskApproved - taskCharged);
  const remainingRoundMs = Math.max(0, roundAllocationMs + roundApproved - roundCharged);
  const deadline = effectiveDeadlineMs(remainingTaskMs, remainingRoundMs);
  return {
    task: task,
    round: input.round,
    allocationMs: allocationMs,
    approvedExtraMs: taskApproved,
    chargedMs: taskCharged,
    remainingTaskMs: remainingTaskMs,
    roundAllocationMs: roundAllocationMs,
    roundApprovedMs: roundApproved,
    roundChargedMs: roundCharged,
    remainingRoundMs: remainingRoundMs,
    effectiveDeadlineMs: deadline,
    canAdmit: deadline >= C.GUARDS.minWindowMs + C.GUARDS.finalizeReserveMs
  };
}

module.exports = {
  ALLOCATIONS_MS, RESERVE_MS, TOTAL_MS, PARITY_PUZZLES, PARITY_ARMS, pairOrderFor, buildManifest, validateManifest,
  shardOf, jobsOf, commandWindowMs, packCommands, blocksFor, projectedMachineMs, effectiveDeadlineMs, budgetState
};
