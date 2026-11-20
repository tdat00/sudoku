'use strict';

/*
 * MS18d Phase C0b task-owned: the shape of the one record type of the final GP matrix,
 * `ms18d-gp-request-ledger-v1` (raw per-request times of ONE planned chunk), and of the completion marker
 * the recorder prints after the ledger is durably closed. Shared by the recorder, the typed G3 classifier of
 * the recorder payload and the check-only merger, so that all three read the same contract. Pure.
 *
 *   { schema, kind: 'raw-request-times',
 *     chunk:       { chunkId, cell, variant, level, target, i0, n, seedBase, projectionSeconds },
 *     policy:      { trace: 'summary', warmup: 0, jobs: 1, budget: null, defaultAttempts: true, selected },
 *     protocol:    { call, measureCalls: 1 },
 *     requests:    [{ index, seed, ms }, ... n entries in request order, the unrounded times],
 *     identity:    the facts every ledger of the campaign shares (plan, helpers, sources, table, loaded
 *                  files, Node, machine, execArgv, NODE_OPTIONS, campaign base, selected policy),
 *     observation: what this one process saw (argv, pid, clock, repository head, transport files) }
 */
const { SEED_BASE, SEED_STEP } = require('./plan-data.js');

const LEDGER_SCHEMA = 'ms18d-gp-request-ledger-v1';
const MARKER = /^ms18d-gp-ledger-complete chunk=(\S+) bytes=(\d+) sha256=([0-9a-f]{64})$/;
const START = /^ms18d-gp-recorder-start chunk=(\S+) i0=(\d+) n=(\d+) seedBase=(\d+)$/;
const MEASURE_CALL = 'SG.fixtures.perfTools.measure(variant, level, n, { seedBase: 7000 + 101 * i0 })';
const IDENTITY_METHOD = 'captured-exec-v1';
const IDENTITY_KEYS = ['planManifestSha256', 'helperManifestSha256', 'hashIdentity', 'tableSha256',
  'sourcesPublished', 'loadedFiles', 'loaderRecipe', 'node', 'machine', 'execArgv', 'nodeOptions', 'base',
  'selectedPolicy', 'identityMethod'];

const isHex64 = (text) => /^[0-9a-f]{64}$/.test(String(text));
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Problems of the ledger against its planned chunk entry (the manifest's); [] when it is exactly that. */
function validateLedgerShape(ledger, chunk, options) {
  const opts = options || {};
  const problems = [];
  if (!isObject(ledger)) return ['the ledger is not an object'];
  if (ledger.schema !== LEDGER_SCHEMA) problems.push('schema ' + ledger.schema + ' is not ' + LEDGER_SCHEMA);
  if (ledger.kind !== 'raw-request-times') problems.push('kind ' + ledger.kind);
  const c = ledger.chunk;
  if (!isObject(c)) problems.push('no chunk record');
  else {
    ['chunkId', 'cell', 'variant', 'level', 'target', 'i0', 'n', 'seedBase', 'projectionSeconds']
      .forEach((k) => {
        if (c[k] !== chunk[k]) problems.push('chunk.' + k + ' ' + c[k] + ' is not the planned ' + chunk[k]);
      });
  }
  const p = ledger.policy;
  if (!isObject(p) || p.trace !== 'summary' || p.warmup !== 0 || p.jobs !== 1 || p.budget !== null ||
    p.defaultAttempts !== true) {
    problems.push('the policy is not trace summary, warm-up 0, jobs 1, no budget');
  }
  if (!isObject(ledger.protocol) || ledger.protocol.measureCalls !== 1 ||
    ledger.protocol.call !== MEASURE_CALL) {
    problems.push('the protocol is not exactly one measure call');
  }
  if (!Array.isArray(ledger.requests) || ledger.requests.length !== chunk.n) {
    problems.push('requests are ' + (Array.isArray(ledger.requests) ? ledger.requests.length : 'missing') +
      ', not ' + chunk.n);
  } else {
    ledger.requests.forEach((r, j) => {
      const index = chunk.i0 + j;
      if (!isObject(r) || r.index !== index) problems.push('request ' + j + ' has index ' + (r && r.index));
      else if (r.seed !== SEED_BASE + SEED_STEP * index) {
        problems.push('request ' + index + ' has seed ' + r.seed);
      }
      if (!isObject(r) || typeof r.ms !== 'number' || !isFinite(r.ms) || r.ms < 0) {
        problems.push('request ' + index + ' has no finite non-negative time');
      }
    });
  }
  const id = ledger.identity;
  if (!isObject(id)) problems.push('no identity record');
  else {
    IDENTITY_KEYS.forEach((k) => {
      if (id[k] === undefined) problems.push('identity.' + k + ' is missing');
    });
    if (!Array.isArray(id.execArgv) || id.execArgv.length !== 0) problems.push('execArgv is not empty');
    if (id.nodeOptions !== '') problems.push('NODE_OPTIONS is not empty');
    ['planManifestSha256', 'helperManifestSha256', 'hashIdentity', 'tableSha256'].forEach((k) => {
      if (!isHex64(id[k])) problems.push('identity.' + k + ' is not lowercase hex');
    });
    if (!Array.isArray(id.loadedFiles) || id.loadedFiles.length === 0 ||
      !id.loadedFiles.every((f) => isObject(f) && isHex64(f.sha256) && typeof f.rel === 'string')) {
      problems.push('identity.loadedFiles is not an ordered list of executed buffers');
    }
  }
  const o = ledger.observation;
  if (!isObject(o) || !isObject(o.provenance) || typeof o.provenance.standin !== 'boolean') {
    problems.push('no observation/provenance record');
  } else if (o.provenance.standin === true && !opts.allowStandin) {
    problems.push('stand-in provenance is never a campaign record');
  }
  return problems;
}

/**
 * The ledger of one chunk. `times` are the raw request times in order; `identity` and `observation` are the
 * records of the caller (the recorder, or a stand-in fixture that mimics it). Pure.
 */
function buildLedger(chunk, times, identity, observation, policy) {
  return {
    schema: LEDGER_SCHEMA, kind: 'raw-request-times',
    chunk: { chunkId: chunk.chunkId, cell: chunk.cell, variant: chunk.variant, level: chunk.level,
      target: chunk.target, i0: chunk.i0, n: chunk.n, seedBase: chunk.seedBase,
      projectionSeconds: chunk.projectionSeconds },
    policy: { trace: 'summary', warmup: 0, jobs: 1, budget: null, defaultAttempts: true, selected: policy },
    protocol: { call: MEASURE_CALL, measureCalls: 1 },
    requests: times.map((ms, j) => ({ index: chunk.i0 + j, seed: SEED_BASE + SEED_STEP * (chunk.i0 + j),
      ms })),
    identity, observation
  };
}

module.exports = { LEDGER_SCHEMA, MARKER, START, MEASURE_CALL, IDENTITY_METHOD, IDENTITY_KEYS,
  validateLedgerShape, buildLedger };
