#!/usr/bin/env node
'use strict';

/*
 * The mega Nightmare deep tier (difficulty v3, MS05r5m; CV6-03, S-OD3 (a)). Node >= 18, built-in modules only.
 * It is a tool, not a discovered `*.test.js` suite, not a CI step and not product qualification: the full-attempt
 * Nightmare requests of mega12 and mega16 left the quick tier because one of them costs from seconds to minutes.
 *
 *   node tests/mega-contract.js --list
 *   node tests/mega-contract.js --request=<id> --record=<new.json>
 *   node tests/mega-contract.js --reconcile=<records directory> --json=<new.json>
 *
 *   --list                the 14 fixed requests (per board the invariant seeds 1 to 4 and the three independent
 *                         CV5 calls 3, 3 and 4, each at the default attempts of its board) and their relations
 *   --request=<id>        exactly one fixed request once, in its own process, and the independent checks of the
 *                         puzzle it returns; --record is a new project-relative <id>.json file (never overwritten)
 *   --reconcile=<dir>     no generation: every record of the directory against the manifest (each occurrence
 *                         exactly once, one identity, wires and digests, flags derived again) and the relations;
 *                         --json is a new project-relative .json file outside that directory
 *
 * A request and its checks share one 500000 ms budget, below the 540 s limit of a bounded command (run it through
 * `Invoke-Dv3Node`, one request per locked command). The record holds the request, the normalised configuration,
 * the effective attempts, the allowance, the source, tool and validation identities, the generation and the check
 * time apart, the outcome and error (a budget or cancellation error keeps its code), every check as true, false
 * or null (not evaluated), the digest of the puzzle and its plain wire (`SG.replay.toPlainWire`). A killed
 * process leaves no record. A level that qualification has hidden is offered for the run only and the override is
 * recorded. Exit codes: see `--help`.
 *
 * MS05b3 reads the records through `reuse(directory, { variantId, level, seed })` (below) or the pure
 * `SG.fixtures.megaContract.reuse`; the pure helpers are tested by the `mega-contract` suite on synthetic records.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const evidenceTools = require('../../core/tests/node-evidence.js');
const replayFixtures = require('./replay-fixtures.js');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const FIXTURES = ['tests/fixtures/tool-records.js', 'tests/fixtures/mega-contract.js'];
// The code that decides a record besides the engine sources (the engine is the sourceHash). The shared loader
// and the level guard of tests/replay-fixtures.js and tests/fixtures/tool-records.js are used unchanged.
const TOOL_FILES = ['tests/mega-contract.js', 'tests/fixtures/mega-contract.js'];
// Where an evidence file is never written: the sources and fixtures that a quick test loads or reads.
const EVIDENCE_INPUTS = {
  files: [],
  trees: ['core/js', 'core/css', 'core/assets', 'core/tests/fixtures', 'core/tests/suites', 'generator/js',
    'generator/css', 'generator/assets', 'generator/tests/fixtures', 'generator/tests/suites',
    { dir: 'generator/tests', recursive: false }]
};

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function helpers() {
  const SG = globalThis.SG;
  if (!SG || !SG.fixtures || !SG.fixtures.megaContract) replayFixtures.loadFixtures(FIXTURES);
  return globalThis.SG.fixtures.megaContract;
}

/** SHA-256 over the tool files as `<path>\0<text with LF line ends>`. */
function toolHash() {
  const hash = crypto.createHash('sha256');
  TOOL_FILES.forEach((rel) => {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    hash.update(rel + '\0' + text);
  });
  return hash.digest('hex');
}

function machine() {
  const cpus = os.cpus();
  return {
    platform: os.platform(), arch: os.arch(), cpu: cpus.length > 0 ? String(cpus[0].model).trim() : null,
    cores: cpus.length, memoryGiB: Math.round(os.totalmem() / Math.pow(2, 30))
  };
}

function seconds(ms) {
  return ms === null || ms === undefined ? 'n/a' : (ms / 1000).toFixed(3) + ' s';
}

function isInside(abs, folder) {
  const rel = path.relative(folder, abs);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function evidenceTool() {
  return evidenceTools.create({ app: 'generator', repoRoot: REPO, inputs: EVIDENCE_INPUTS });
}

/** The files of a records directory as { name, record } or { name, error }; nothing but `.json` files is expected. */
function readFiles(abs) {
  return fs.readdirSync(abs, { withFileTypes: true }).map((entry) => entry.name).sort().map((name) => {
    const file = path.join(abs, name);
    if (!name.endsWith('.json') || !fs.statSync(file).isFile()) {
      return { name: name, error: 'unexpected entry: only <id>.json record files belong in the directory' };
    }
    try {
      return { name: name, record: JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) };
    } catch (err) {
      return { name: name, error: 'not valid JSON (' + (err && err.message ? err.message : String(err)) + ')' };
    }
  });
}

function recordReport(record) {
  const lines = [
    record.id + ': outcome ' + record.outcome + (record.error ? ' (' + record.error.code + ' in ' +
      record.error.phase + ')' : '') + ', correctness ' + record.correctness + ', exact ' + record.exact +
      ', attempts ' + record.attempts + ' of ' + record.effectiveMaxAttempts + ', warnings ' +
      (record.warnings ? record.warnings.join(',') || 'none' : 'n/a'),
    '  generation ' + seconds(record.generationMs) + ', checks ' + seconds(record.checkMs) + ', guard margin ' +
      seconds(record.guardMarginMs) + ' of ' + seconds(record.diagnosticBudgetMs) + ', allowance ' +
      record.allowance + (record.overrides.length > 0 ? ', level override ' + record.overrides.join(',') : '')
  ];
  if (record.failedChecks.length > 0) lines.push('  FAILED checks: ' + record.failedChecks.join(', '));
  if (record.outcome !== 'generation-error' && record.unevaluatedChecks.length > 0) {
    lines.push('  not evaluated: ' + record.unevaluatedChecks.join(', '));
  }
  return lines.join('\n');
}

function reconcileReport(doc, target) {
  const lines = [
    'reconcile: ' + doc.generation.requested + ' requests, ' + doc.occurrences.filter((r) => r.present).length +
      ' records, complete ' + doc.complete + ', evidence sound ' + doc.evidenceSound + ', generation ' +
      doc.generation.produced + ' produced, correctness ' + doc.correctness + ', relations ' +
      doc.relationVerdicts.pass + ' pass / ' + doc.relationVerdicts.fail + ' fail / ' +
      doc.relationVerdicts.unevaluated + ' unevaluated'
  ];
  Object.keys(doc.boards).forEach((id) => {
    const b = doc.boards[id];
    const g = b.generationMs;
    lines.push('  ' + id + ': ' + b.produced + ' of ' + b.requests + ' produced, exact ' + b.exact + ', fallbacks ' +
      b.fallbacks + ' (shallow ' + b.shallow + '), unavailable ' + b.unavailable + ', generation ' +
      (g === null ? 'n/a' : 'min ' + seconds(g.min) + ' median ' + seconds(g.median) + ' max ' + seconds(g.max)) +
      ', over 120 s: ' + b.overApplicationGuard + ', over 30 s: ' + b.overQualificationP95 + ', guard ' +
      (b.guard.status === 'reported' ? seconds(b.guard.guardMs) + ' (margin ' + seconds(b.guard.marginMs) + ')'
        : 'unavailable'));
  });
  doc.problems.forEach((p) => lines.push('  PROBLEM ' + (p.id || '-') + ': ' + p.text));
  lines.push('json: ' + target.shown);
  return lines.join('\n');
}

function runRequest(M, env, args, argv) {
  const evidence = evidenceTool();
  let target;
  let entry;
  let identity;
  let hash;
  try {
    target = evidence.outputTarget('--record', args.record);
    if (path.basename(target.abs) !== args.id + '.json') {
      throw new Error('--record=' + args.record + ': the file must be named ' + args.id + '.json');
    }
    entry = M.MANIFEST.filter((e) => e.id === args.id)[0];
    env.engine();
    const source = env.identity([]);
    hash = M.manifestHash(sha256);
    identity = {
      sourceHash: source.sourceHash, toolHash: toolHash(), commit: source.commit, dirty: source.dirty,
      node: source.node, machine: machine(), argv: argv.slice(), startedAt: env.now()
    };
  } catch (err) {
    console.error(err && err.message ? err.message : String(err));
    return 2;
  }
  let record;
  try {
    const out = M.execute(entry, { clock: env.clock, sha256: sha256, budgetMs: M.BUDGET_MS });
    record = M.recordOf(entry, identity, out.run, hash, out.result);
  } catch (err) {
    if (err && err.code === 'usage') {
      console.error(err.message);
      return 2;
    }
    console.error('no record: ' + (err && err.stack ? err.stack : String(err)));
    return 1;
  }
  try {
    evidence.write(target, evidence.scrub(M.renderRecord(record)));
  } catch (err) {
    console.error('the record could not be written: ' + (err && err.message ? err.message : String(err)));
    return 1;
  }
  console.log(recordReport(record));
  console.log('record: ' + target.shown);
  return M.exitCodeOf(record);
}

function runReconcile(M, env, args) {
  const evidence = evidenceTool();
  let target;
  let directory;
  try {
    env.checkDirectory(args.directory);
    directory = path.resolve(process.cwd(), args.directory);
    target = evidence.outputTarget('--json', args.json);
    if (isInside(target.abs, directory)) {
      throw new Error('--json=' + args.json + ': not inside the records directory (it would be read as a record)');
    }
    env.engine();
  } catch (err) {
    console.error(err && err.message ? err.message : String(err));
    return 2;
  }
  let doc;
  try {
    const current = { sourceHash: env.identity([]).sourceHash, toolHash: toolHash() };
    doc = M.reconcile(readFiles(directory), { sha256: sha256, current: current });
    evidence.write(target, evidence.scrub(M.renderRecord(doc)));
  } catch (err) {
    console.error('no reconciliation: ' + (err && err.stack ? err.stack : String(err)));
    return 1;
  }
  console.log(reconcileReport(doc, target));
  return M.exitCodeOfReconciliation(doc);
}

function main(argv) {
  if (argv.indexOf('--help') !== -1 || argv.indexOf('-h') !== -1) {
    console.log(helpers().USAGE);
    return 0;
  }
  const env = replayFixtures.nodeEnv();
  const M = helpers();
  let args;
  try {
    args = M.parseArgs(argv);
  } catch (err) {
    console.error(err && err.message ? err.message : String(err));
    if (err && err.code === 'usage') console.error('\n' + M.USAGE);
    return 2;
  }
  if (args.mode === 'list') {
    console.log(M.listText(sha256));
    return 0;
  }
  return args.mode === 'request' ? runRequest(M, env, args, argv) : runReconcile(M, env, args);
}

/** The engine sources and tool identities now; loads no engine. */
function currentIdentity() {
  return { sourceHash: replayFixtures.nodeEnv().identity([]).sourceHash, toolHash: toolHash() };
}

/** The parsed records of a directory, read only: { files (as read), records (the parsed objects) }. */
function loadRecords(directory) {
  const files = readFiles(path.resolve(process.cwd(), directory));
  return { files: files, records: files.filter((f) => f.record !== undefined).map((f) => f.record) };
}

/**
 * For MS05b3: the puzzle of an invariant occurrence of a records directory for CV3, or the reasons for a refusal.
 * `query` is { variantId, level, seed }. The directory is only read. The engine (and the fixtures) must be
 * loaded in this process, as the runners do; it is loaded here only when it is absent. The result is
 * SG.fixtures.megaContract.reuse's (`ok`, `reasons`, `unavailable`, `recorded`, `generation: 'reused'`, `result`).
 */
function reuse(directory, query, current) {
  const M = helpers();
  if (!globalThis.SG.replay) replayFixtures.nodeEnv().engine();
  return M.reuse(loadRecords(directory).records, query, Object.assign(currentIdentity(), current || {}),
    { sha256: sha256 });
}

module.exports = {
  main: main, toolHash: toolHash, currentIdentity: currentIdentity, loadRecords: loadRecords, reuse: reuse,
  sha256: sha256
};

if (require.main === module) process.exitCode = main(process.argv.slice(2));
