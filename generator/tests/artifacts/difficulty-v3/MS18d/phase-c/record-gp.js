#!/usr/bin/env node
'use strict';

/*
 * MS18d Phase C0b task-owned (R24): the RAW-TIME RECORDER of the final GP matrix. It measures ONE planned
 * chunk of ONE cell with exactly one call of the unchanged measuring function and writes the unrounded
 * request times as one new `ms18d-gp-request-ledger-v1` file. It is not a permanent CLI and patches neither
 * perf.js nor perf-helper.js.
 *
 *   node tests/artifacts/difficulty-v3/MS18d/phase-c/record-gp.js --plan=<manifest, repo-relative>
 *        --chunk=<chunk id> --out=<run directory>/ledger.json
 *
 * It runs only under the transport (controller.js): the sibling request.json, binding.json, acquisition.json
 * and admission.json of its run folder are what it records as the transport references. Before the measured
 * call it does ALL its metadata work and nothing is measured:
 *   - R5: `process.execArgv` is empty and NODE_OPTIONS is absent (the ledger records both, as an empty
 *     array and an empty string; the transport refuses to spawn when NODE_OPTIONS is set);
 *   - the plan manifest (raw and canonical digest), the chunk against its entry, the run folder against the
 *     declared slot of that chunk, the helper manifest against its hash and every listed file;
 *   - the source loader (loader.js): each file read once, hashed as the exact string the VM gets, E's
 *     identities derived from the same captured texts, all compared with the manifest; then the VM runs
 *     those captured strings and every executed frozen target is compared with the manifest.
 * Then, exactly once:
 *     SG.fixtures.perfTools.measure(variant, level, n, { seedBase: 7000 + 101 * i0 })
 * (trace summary, warm-up 0, jobs 1, no caller budget, no attempt override; no loop, warm-up, sleep, retry or
 * re-seeding). The returned raw `times` (request order, exactly n finite non-negative numbers) are written,
 * unrounded, to a NEW ledger created exclusively (`wx`, never overwritten), flushed and closed; only then the
 * completion line is printed and the exit code is 0. Exit 0 means "acquired and persisted", never a verdict:
 * there is no percentile, target comparison or MISS code here.
 *
 * stdout is exactly two lines:
 *   ms18d-gp-recorder-start chunk=<id> i0=<i0> n=<n> seedBase=<seedBase>
 *   ms18d-gp-ledger-complete chunk=<id> bytes=<bytes of ledger.json> sha256=<lowercase hex of those bytes>
 * stderr stays empty on success. Exit codes: 0 persisted; 2 refused before the measured call (nothing was
 * measured); 3 the measured call failed or returned something that is not n valid times (no ledger);
 * 4 the ledger could not be written completely (a partial file is kept, no marker); 5 anything unexpected.
 *
 * A stand-in (request.standin and --standin-root=<fake generator folder>) loads the sources of a fake project
 * through this same code; its ledger says so (`provenance.standin`) and the merger never accepts it.
 */
const T0 = Date.now();
const fs = require('fs');
const path = require('path');
const plan = require('./plan-data.js');
const loader = require('./loader.js');
const { sha256, machineFacts, CRLF } = require('./common.js');
const { IDENTITY_METHOD, buildLedger } = require('./ledger-schema.js');
const { verifyManifest: verifyHelpers } = require('./source-binding.js');

const REAL_REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const REAL_GENERATOR = path.join(REAL_REPO, 'generator');
const EXIT = { OK: 0, REFUSED: 2, MEASURE: 3, WRITE: 4, UNEXPECTED: 5 };

class Refusal extends Error {}

const same = (a, b) => plan.canonicalJson(a) === plan.canonicalJson(b);
const sameDir = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

function parseArgs(argv) {
  const out = {};
  argv.forEach((arg) => {
    const m = /^--(plan|chunk|out|standin-root)=(.+)$/.exec(arg);
    if (!m || out[m[1]] !== undefined) throw new Refusal('unknown or repeated argument: ' + arg);
    out[m[1]] = m[2];
  });
  ['plan', 'chunk', 'out'].forEach((k) => { if (out[k] === undefined) throw new Refusal('missing --' + k); });
  return out;
}

function readJsonFile(file, what) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    throw new Refusal('cannot read ' + what + ': ' + err.message);
  }
}

/** Everything that is checked and captured before the measured call. Throws Refusal on any difference. */
function prepare(args) {
  if (process.execArgv.length !== 0) throw new Refusal('process.execArgv is not empty: ' + process.execArgv);
  if (process.env.NODE_OPTIONS !== undefined && process.env.NODE_OPTIONS !== '') {
    throw new Refusal('NODE_OPTIONS is set; it is never silently cleared');
  }
  const out = path.resolve(args.out);
  const dir = path.dirname(out);
  if (path.basename(out) !== 'ledger.json') throw new Refusal('the output is <run directory>/ledger.json');
  if (fs.existsSync(out)) throw new Refusal('the ledger exists; it is never overwritten');
  const requestFile = path.join(dir, 'request.json');
  const request = readJsonFile(requestFile, 'request.json');
  if (request.schema !== 'ms18d-c-request-1' || request.profile !== 'gp-recorder') {
    throw new Refusal('the request is not a gp-recorder request');
  }
  const standin = request.standin === true;
  if (standin !== (args['standin-root'] !== undefined)) {
    throw new Refusal('the request and the command line disagree on a stand-in');
  }
  if (!standin && !sameDir(request.repo, REAL_REPO)) throw new Refusal('a real run uses the real repository');
  const repo = path.resolve(request.repo);
  const sourcesRoot = standin ? path.resolve(args['standin-root']) : REAL_GENERATOR;

  const planFile = path.resolve(repo, args.plan);
  if (path.relative(repo, planFile).startsWith('..')) throw new Refusal('the plan is outside the repository');
  const planBytes = fs.readFileSync(planFile);
  const doc = readJsonFile(planFile, 'the plan manifest');
  const planProblems = plan.verifyManifest(doc);
  if (planProblems.length > 0) throw new Refusal('the plan manifest is unsound: ' + planProblems[0]);
  if (!request.plan || request.plan.manifestSha256 !== doc.manifestSha256 ||
    request.plan.rawSha256 !== sha256(planBytes)) {
    throw new Refusal('the plan is not the one the request names');
  }
  const chunk = doc.chunks.filter((c) => c.chunkId === args.chunk)[0];
  if (!chunk) throw new Refusal('no such chunk in the plan: ' + args.chunk);
  if (!same(chunk, request.chunk)) throw new Refusal('the request chunk differs from the plan entry');
  const rel = path.relative(repo, dir).replace(/\\/g, '/');
  const slot = plan.slotForDir(doc, rel);
  if (!slot || slot.role !== 'chunk' || slot.chunkId !== chunk.chunkId || slot.attempt !== request.attempt) {
    throw new Refusal('the run folder is not the declared slot of this chunk: ' + rel);
  }

  const helpers = request.helpers || {};
  const helperFile = helpers.manifestFile ? path.resolve(helpers.manifestFile) : null;
  if (!helperFile || !fs.existsSync(helperFile)) throw new Refusal('the helper manifest is missing');
  const helperSha = sha256(fs.readFileSync(helperFile));
  if (!standin && !/^[0-9a-f]{64}$/.test(String(helpers.manifestSha256))) {
    throw new Refusal('a real run names the reviewed helper manifest hash');
  }
  const helperCheck = verifyHelpers(helperFile, helpers.repoRoot || repo, helpers.manifestSha256 || helperSha,
    helpers.required || []);
  if (helperCheck.problems.length > 0) throw new Refusal('helpers: ' + helperCheck.problems[0]);

  const transport = {};
  ['request', 'acquisition', 'binding', 'admission'].forEach((name) => {
    const file = path.join(dir, name + '.json');
    if (!fs.existsSync(file)) throw new Refusal('the transport record ' + name + '.json is missing');
    transport[name] = { file: name + '.json', sha256: sha256(fs.readFileSync(file)) };
  });
  const binding = readJsonFile(path.join(dir, 'binding.json'), 'binding.json');
  const admission = readJsonFile(path.join(dir, 'admission.json'), 'admission.json');
  if (binding.ok !== true || admission.decision !== 'proceed') {
    throw new Refusal('the transport did not prove the binding and the admission');
  }

  const cap = loader.captureAll(sourcesRoot);
  const ids = loader.identitiesOf(cap);
  const files = loader.loadedManifest(cap);
  if (ids.hashIdentity !== doc.sources.hashIdentity || ids.hashIdentity !== doc.loader.hashIdentity) {
    throw new Refusal('the E hash identity of the captured sources is ' + ids.hashIdentity);
  }
  if (ids.sources !== doc.sources.sources || ids.sources !== doc.loader.sources) {
    throw new Refusal('the published sources hash of the captured sources is ' + ids.sources);
  }
  if (!same(cap.recipe, doc.loader.recipe) || !same(files, doc.loader.files)) {
    throw new Refusal('the loaded-file manifest differs from the plan manifest');
  }
  if (process.version !== doc.environment.node) throw new Refusal('Node is ' + process.version);
  const machine = machineFacts();
  if (!same(machine, doc.environment.machine)) throw new Refusal('the machine differs from the plan');

  return { out, dir, request, doc, chunk, standin, helperSha, transport, binding, cap, ids, files, machine,
    sourcesRoot, standinRoot: args['standin-root'] || null };
}

/** The frozen targets as the loaded code declares them, against the manifest (the 79 offered cells). */
function checkExecutedTargets(SG, doc) {
  const tools = SG && SG.fixtures && SG.fixtures.perfTools;
  if (!tools || typeof tools.measure !== 'function') throw new Refusal('the loaded code has no measure');
  const targets = tools.PERF_TARGETS;
  let offered = 0;
  Object.keys(targets).forEach((variant) => tools.TARGET_LEVELS.forEach((level) => {
    if (typeof targets[variant][level] === 'number') offered++;
  }));
  if (offered !== doc.targets.offered) throw new Refusal('the loaded code offers ' + offered + ' cells');
  const cells = new Map(doc.chunks.map((c) => [c.cell, c.target]));
  cells.forEach((target, cell) => {
    const [variant, level] = cell.split('/');
    if (!targets[variant] || targets[variant][level] !== target) {
      throw new Refusal('the loaded target of ' + cell + ' is not ' + target);
    }
  });
  return { offered, matched: cells.size };
}

function writeWhole(out, bytes) {
  const fd = fs.openSync(out, 'wx');
  try {
    let done = 0;
    while (done < bytes.length) done += fs.writeSync(fd, bytes, done, bytes.length - done);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function say(text) {
  process.stdout.write(text + '\n');
}

function main(argv) {
  let ctx;
  let targets;
  let SG;
  try {
    ctx = prepare(parseArgs(argv));
    SG = loader.execute(ctx.cap);
    targets = checkExecutedTargets(SG, ctx.doc);
  } catch (err) {
    if (!(err instanceof Refusal)) throw err;
    process.stderr.write('refused before the measured call: ' + err.message + '\n');
    return EXIT.REFUSED;
  }
  const { chunk } = ctx;
  const seedBase = 7000 + 101 * chunk.i0;
  if (seedBase !== chunk.seedBase) {
    process.stderr.write('refused before the measured call: seedBase of the chunk\n');
    return EXIT.REFUSED;
  }
  say('ms18d-gp-recorder-start chunk=' + chunk.chunkId + ' i0=' + chunk.i0 + ' n=' + chunk.n +
    ' seedBase=' + seedBase);

  const measureStartedMs = Date.now();
  let measured;
  try {
    measured = SG.fixtures.perfTools.measure(chunk.variant, chunk.level, chunk.n, { seedBase });
  } catch (err) {
    process.stderr.write('the measured call failed: ' + (err && err.stack ? err.stack : err) + '\n');
    return EXIT.MEASURE;
  }
  const measureFinishedMs = Date.now();
  const times = measured && measured.times;
  const valid = Array.isArray(times) && times.length === chunk.n &&
    times.every((t) => typeof t === 'number' && Number.isFinite(t) && t >= 0);
  if (!valid) {
    process.stderr.write('the measured call did not return ' + chunk.n + ' finite non-negative times\n');
    return EXIT.MEASURE;
  }

  const ledger = buildLedger(chunk, times, {
    planManifestSha256: ctx.doc.manifestSha256, helperManifestSha256: ctx.helperSha,
    hashIdentity: ctx.ids.hashIdentity, tableSha256: ctx.doc.targets.tableSha256,
    sourcesPublished: ctx.ids.sources, loadedFiles: ctx.files, loaderRecipe: ctx.cap.recipe,
    node: process.version, machine: ctx.machine, execArgv: process.execArgv.slice(), nodeOptions: '',
    base: ctx.request.expected.base || null, selectedPolicy: ctx.doc.policy, identityMethod: IDENTITY_METHOD
  }, {
    argv: process.argv.slice(2), pid: process.pid, execPath: process.execPath,
    startedAt: new Date(T0).toISOString(), measureStartedAt: new Date(measureStartedMs).toISOString(),
    measureFinishedAt: new Date(measureFinishedMs).toISOString(),
    measureElapsedMs: measureFinishedMs - measureStartedMs,
    head: ctx.binding.head ? ctx.binding.head.actual : null,
    provenance: { standin: ctx.standin, standinRoot: ctx.standinRoot },
    executedTargets: targets, transport: ctx.transport, runDir: path.basename(ctx.dir),
    attempt: ctx.request.attempt
  }, ctx.doc.policy);
  const bytes = Buffer.from(CRLF(JSON.stringify(ledger, null, 2)) + '\r\n', 'utf8');
  try {
    writeWhole(ctx.out, bytes);
  } catch (err) {
    process.stderr.write('the ledger was not written completely: ' + err.message + '\n');
    return EXIT.WRITE;
  }
  say('ms18d-gp-ledger-complete chunk=' + chunk.chunkId + ' bytes=' + bytes.length + ' sha256=' +
    sha256(bytes));
  return EXIT.OK;
}

if (require.main === module) {
  process.on('uncaughtException', (err) => {
    try {
      process.stderr.write('unexpected: ' + (err && err.stack ? err.stack : err) + '\n');
    } catch (inner) { /* nothing more to do */ }
    process.exitCode = EXIT.UNEXPECTED;
  });
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main, prepare, parseArgs, checkExecutedTargets, EXIT, Refusal };
