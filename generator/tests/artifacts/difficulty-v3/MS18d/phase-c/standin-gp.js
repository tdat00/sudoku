'use strict';

/*
 * MS18d Phase C0b task-owned STAND-IN support: a fake project for the raw-time recorder (a fake generator
 * folder with a fake node-runner.js source list, fake engine scripts, a fake perf-helper.js whose `measure`
 * returns invented times and records its calls, fake tool-records.js and regression.js, and a perf.js that
 * must never run), a reduced plan manifest over two invented cells, a helper manifest, and a builder of
 * complete or deliberately damaged run folders for the check-only merger. Nothing here measures anything:
 * every number is invented by the test that uses it, and a ledger written from here is marked as a fixture,
 * never a campaign record. The fake measure is steered by environment variables (FAKE_MEASURE_MODE,
 * FAKE_MEASURE_LOG, FAKE_MEASURE_BLOCK_OUT) that only the stand-in tests set.
 */
const fs = require('fs');
const path = require('path');
const plan = require('./plan-data.js');
const loader = require('./loader.js');
const { sha256, machineFacts, CRLF } = require('./common.js');
const { buildLedger, IDENTITY_METHOD } = require('./ledger-schema.js');
const { frozenRecorderArgs, expectedIdentityOf } = require('./merge-core.js');
const { manifestText } = require('./make-chunk-manifest.js');

const RUN_BASE = 'docs/difficulty-v3/evidence/MS18d/gp';
const PLAN_REL = 'docs\\difficulty-v3\\evidence\\MS18d\\phase-c\\gp-chunk-manifest.json';
const HEAD = 'a'.repeat(40);
const BASE = 'b'.repeat(40);

/** Two invented cells: one single-chunk, one of two chunks of 25 (the plan rows of plan-data.js). */
const FAKE_ROWS = [
  { key: 'fakea/easy', variant: 'fakea', level: 'easy', target: 100, chunks: [[0, 50, 70]] },
  { key: 'fakeb/easy', variant: 'fakeb', level: 'easy', target: 300, chunks: [[0, 25, 60], [25, 25, 60]] }
];

const FAKE_PERF_HELPER = (targetA) => [
  '(function () {',
  "  'use strict';",
  '  SG.fixtures = SG.fixtures || {};',
  '  function measure(variant, level, runs, options) {',
  "    var fs = process.getBuiltinModule('fs');",
  '    var seedBase = options && options.seedBase !== undefined ? options.seedBase : 7000;',
  "    var mode = process.env.FAKE_MEASURE_MODE || 'ok';",
  '    if (process.env.FAKE_MEASURE_LOG) {',
  '      fs.appendFileSync(process.env.FAKE_MEASURE_LOG, JSON.stringify({ variant: variant, level: level,',
  "        runs: runs, options: options, argc: arguments.length, order: SG.order }) + '\\n');",
  '    }',
  "    if (process.env.FAKE_MEASURE_BLOCK_OUT) {",
  "      fs.writeFileSync(process.env.FAKE_MEASURE_BLOCK_OUT, 'taken');",
  '    }',
  "    if (mode === 'throw') throw new Error('fake measure failure');",
  "    if (mode === 'hang') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 120000);",
  '    var times = [];',
  '    for (var i = 0; i < runs; i++) times.push(10 + ((seedBase + i * 101) % 37) + (i % 7) / 8);',
  "    if (mode === 'short') times.pop();",
  "    if (mode === 'nan') times[2] = NaN;",
  "    if (mode === 'negative') times[1] = -1;",
  "    if (mode === 'stderr') process.stderr.write('stray\\n');",
  '    return { runs: runs, p50: 0, p95: 0, max: 0, mean: 0, times: times };',
  '  }',
  '  SG.fixtures.perfTools = {',
  "    TARGET_LEVELS: ['easy', 'hard'],",
  '    PERF_TARGETS: { fakea: { easy: ' + (targetA || 100) + ', hard: 200 }, fakeb: { easy: 300 } },',
  '    measure: measure',
  '  };',
  '})();',
  ''
].join('\n');

function put(root, rel, text) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

/** The fake generator folder under `repoRoot`. Options: { bom: regression.js with a BOM, noRegression }. */
function makeFakeProject(repoRoot, options) {
  const o = options || {};
  const g = path.join(repoRoot, 'generator');
  put(g, 'tests/node-runner.js', "'use strict';\nconst SOURCE_FILES = [\n  'js/core/alpha.js',\n" +
    "  'js/core/beta.js',\n  'js/ui/screen.js',\n  'js/worker/thread.js',\n  'js/core/gamma.js',\n" +
    "  'js/core/absent.js'\n];\n");
  put(g, 'js/core/alpha.js', "globalThis.SG = globalThis.SG || {};\nSG.order = ['alpha'];\n");
  put(g, 'js/core/beta.js', "SG.order.push('beta');\n");
  put(g, 'js/core/gamma.js', "SG.order.push('gamma');\n");
  put(g, 'js/ui/screen.js', "throw new Error('a UI file must never load');\n");
  put(g, 'js/worker/thread.js', "throw new Error('a worker file must never load');\n");
  put(g, 'tests/fixtures/perf-helper.js', FAKE_PERF_HELPER(o.targetA));
  put(g, 'tests/fixtures/tool-records.js', 'SG.fixtures.toolRecords = {};\n');
  if (!o.noRegression) {
    put(g, 'tests/fixtures/regression.js', (o.bom ? '\uFEFF' : '') + "SG.order.push('regression');\n");
  }
  put(g, 'tests/perf.js', "throw new Error('perf.js must never run');\n");
  return g;
}

/** The helper manifest of the fake repo (one listed helper file): { file, sha256, required }. */
function makeHelperManifest(repoRoot) {
  put(repoRoot, 'helper-a.txt', 'helper a\n');
  const file = path.join(repoRoot, 'helpers.txt');
  fs.writeFileSync(file, sha256(fs.readFileSync(path.join(repoRoot, 'helper-a.txt'))).toUpperCase() +
    '  helper-a.txt\r\n');
  return { file, sha256: sha256(fs.readFileSync(file)), required: ['helper-a.txt'] };
}

/**
 * The reduced plan manifest of the fake project, written to the fake repo: { doc, planFile, planRel,
 * rawSha256 }. Options: { rows, cellMergeSlots }.
 */
function makeFakeManifest(repoRoot, options) {
  const o = options || {};
  const cap = loader.captureAll(path.join(repoRoot, 'generator'));
  const ids = loader.identitiesOf(cap);
  const doc = plan.buildManifest({
    rows: o.rows || FAKE_ROWS,
    plan: { packCommit: 'c'.repeat(40), packCommitShort: 'cccccccc', documents: [],
      resolution: 'fixture' },
    targets: { file: 'fixture', rawSha256: 'd'.repeat(64), tableSha256: 'e'.repeat(64), offered: 3 },
    sources: { hashIdentity: ids.hashIdentity, replayIdentity: 'f'.repeat(64), sources: ids.sources,
      qualifierHash: '1'.repeat(64) },
    loader: { recipe: cap.recipe, hashIdentity: ids.hashIdentity, sources: ids.sources,
      files: loader.loadedManifest(cap) },
    environment: { node: process.version, machine: machineFacts() },
    policy: { selector: 'S-OD15', choice: 'A', name: 'fixture' },
    mergeBase: RUN_BASE, cellMergeSlots: o.cellMergeSlots === true
  });
  const planFile = path.join(repoRoot, PLAN_REL);
  fs.mkdirSync(path.dirname(planFile), { recursive: true });
  fs.writeFileSync(planFile, manifestText(doc));
  return { doc, planFile, planRel: PLAN_REL, rawSha256: sha256(fs.readFileSync(planFile)) };
}

/** Invented raw times of a chunk: n distinct numbers below `ceiling`, fractional, in request order. */
function timesFor(chunk, ceiling, salt) {
  const out = [];
  for (let j = 0; j < chunk.n; j++) {
    out.push(((chunk.i0 + j) * 7 + (salt || 0)) % 40 / 40 * (ceiling - 1) + 1 + j / 1024);
  }
  return out;
}

const writeText = (dir, name, text) => fs.writeFileSync(path.join(dir, name), text);
const jsonText = (value) => CRLF(JSON.stringify(value, null, 2)) + '\r\n';

/**
 * A run folder of the fake campaign for `slot` (a chunk slot of `made.doc`): every file of a complete
 * recorder run, or a damaged one. `o`: { times, head, base, helper (makeHelperManifest result), planRel,
 * mutate: { <file>: (object) => object }, omit: [file names], raw: { <file>: text }, standin }.
 */
function writeRunFolder(repoRoot, made, slot, o) {
  const doc = made.doc;
  const chunk = doc.chunks.filter((c) => c.chunkId === slot.chunkId)[0];
  const dir = path.join(repoRoot, slot.dir);
  fs.mkdirSync(dir, { recursive: true });
  const mutate = o.mutate || {};
  const omit = new Set(o.omit || []);
  const base = o.base || BASE;
  const head = o.head || base;
  const emit = (name, object) => {
    const value = mutate[name] ? mutate[name](object) : object;
    if (omit.has(name)) return null;
    const text = o.raw && o.raw[name] !== undefined ? o.raw[name] : jsonText(value);
    writeText(dir, name, text);
    return Buffer.from(text, 'utf8');
  };
  const request = emit('request.json', {
    schema: 'ms18d-c-request-1', runId: slot.runId, task: 'fixture', standin: o.standin === true,
    profile: 'gp-recorder', allowExit1: false, runDir: dir, repo: repoRoot,
    command: { args: frozenRecorderArgs(made.planRel, slot) },
    plan: { file: made.planRel, rawSha256: made.rawSha256, manifestSha256: doc.manifestSha256 },
    chunk, attempt: slot.attempt, policy: doc.policy, expected: { base }
  });
  const acquisition = emit('acquisition.json', { decision: 'proceed' });
  const binding = emit('binding.json', { ok: true, head: { actual: head, base, descendant: true,
    diff: { paths: [], violations: [] }, ok: true } });
  const admission = emit('admission.json', { decision: 'proceed' });
  const sha = (b) => (b === null ? null : sha256(b));
  const helperSha = o.helper ? o.helper.sha256 : '9'.repeat(64);
  const identity = JSON.parse(JSON.stringify(expectedIdentityOf(doc, helperSha, base)));
  const times = o.times || timesFor(chunk, 50, 0);
  const ledger = buildLedger(chunk, times, identity, {
    argv: [], pid: 1, head, provenance: { standin: o.standin === true, standinRoot: null },
    executedTargets: { offered: 3, matched: 2 }, runDir: slot.runId, attempt: slot.attempt,
    transport: { request: { file: 'request.json', sha256: sha(request) },
      acquisition: { file: 'acquisition.json', sha256: sha(acquisition) },
      binding: { file: 'binding.json', sha256: sha(binding) },
      admission: { file: 'admission.json', sha256: sha(admission) } }
  }, doc.policy);
  const ledgerBytes = emit('ledger.json', ledger);
  const size = ledgerBytes ? ledgerBytes.length : 0;
  const digest = ledgerBytes ? sha256(ledgerBytes) : '0'.repeat(64);
  const marker = 'ms18d-gp-ledger-complete chunk=' + chunk.chunkId + ' bytes=' + size + ' sha256=' + digest;
  const start = 'ms18d-gp-recorder-start chunk=' + chunk.chunkId + ' i0=' + chunk.i0 + ' n=' + chunk.n +
    ' seedBase=' + chunk.seedBase;
  if (!omit.has('stdout.txt')) {
    writeText(dir, 'stdout.txt', o.raw && o.raw['stdout.txt'] !== undefined ? o.raw['stdout.txt'] :
      start + '\r\n' + marker + '\r\n');
  }
  if (!omit.has('stderr.txt')) writeText(dir, 'stderr.txt', o.raw && o.raw['stderr.txt'] || '');
  const rows = [{ role: 'controller', pid: 10 }, { role: 'tee', pid: 11 }, { role: 'command', pid: 12 },
    { event: 'command-exit', code: 0, signal: null },
    { event: 'tee-exit', stdoutBytes: 100, stderrBytes: 0 }];
  const rowText = (mutate['pids.jsonl'] ? mutate['pids.jsonl'](rows) : rows).map((r) => JSON.stringify(r))
    .join('\r\n') + '\r\n';
  if (!omit.has('pids.jsonl')) writeText(dir, 'pids.jsonl', rowText);
  emit('result.json', { schema: 'ms18d-c-result-1', outcome: 'success', controllerExit: 0,
    payloadStarted: true, standin: o.standin === true, classification: { complete: true },
    cli: { exit: 0, signal: null }, tee: { marker: 'exit=0 seconds=1.5' },
    rawBytes: { stdout: 100, stderr: 0 }, barrier: { verdict: 'clean' } });
  emit('cleanup.json', { verdict: 'clean' });
  emit('wrapper.json', { schema: 'ms18d-c-run-1', payload: 'gp-recorder', standin: o.standin === true,
    outcome: 'success', exit: 0, problems: [], barrierVerdict: 'clean', releaseVerified: true });
  return dir;
}

/** A control-hold run folder (no payload, no ledger): the lawful unstarted attempt. */
function writeHoldFolder(repoRoot, slot) {
  const dir = path.join(repoRoot, slot.dir);
  fs.mkdirSync(dir, { recursive: true });
  writeText(dir, 'result.json', jsonText({ schema: 'ms18d-c-result-1', outcome: 'control-hold',
    payloadStarted: false, controllerExit: 64 }));
  writeText(dir, 'wrapper.json', jsonText({ schema: 'ms18d-c-run-1', payload: 'gp-recorder',
    outcome: 'control-hold', standin: false, problems: [] }));
  return dir;
}

module.exports = { FAKE_ROWS, FAKE_PERF_HELPER, RUN_BASE, PLAN_REL, HEAD, BASE, IDENTITY_METHOD,
  makeFakeProject, makeHelperManifest, makeFakeManifest, timesFor, writeRunFolder, writeHoldFolder };
