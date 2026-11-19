#!/usr/bin/env node
'use strict';

/*
 * MS18d Phase C0b task-owned (R24): the CHECK-ONLY MERGER of the final GP matrix (merge-core.js has the
 * rules).
 *
 *   node tests/artifacts/difficulty-v3/MS18d/phase-c/merge-gp.js --plan=<manifest, repo-relative>
 *        --scope=<all-79 | cell:<variant>/<level>> --out=<run directory>/report.json
 *
 * It runs only under the transport as a `gp-merge` payload: the sibling request.json of its run folder names
 * the campaign base, the helper manifest and the plan, and the run folder must be the DECLARED merge slot of
 * its scope (R2: the final merge `gp/all-79/final.m1`, a selected-cell merge `gp/<cell>/merge.m1`; the
 * allowlist is literal). It reads the declared run folders of the manifest, never writes anything but its own
 * report.json (created exclusively), and generates nothing.
 *
 * Exit codes (R1): 0 a complete pass; 1 a complete numerical MISS or gate failure ONLY, with stdout ending in
 * one complete machine-readable result line; 2 incomplete or invalid input (nothing is inferred); 3 an
 * unexpected exception, caught at the top level, because Node's own exit code for an uncaught exception is 1,
 * which must never masquerade as a MISS. The result line is
 *   ms18d-gp-merge-result scope=cell:<v>/<l> complete=true meets=<true|false> p95=<raw ms> target=<ms>
 *   ms18d-gp-merge-result scope=all-79 complete=true meets=<true|false> successes=<k> cells=<n> required=<r>
 * and the same facts are in report.json. A selected-cell pass is not the final gate; only the all-79 scope
 * is.
 */
const fs = require('fs');
const path = require('path');
const plan = require('./plan-data.js');
const core = require('./merge-core.js');
const { sha256, CRLF } = require('./common.js');
const { gitReader } = require('./source-io.js');
const { LEDGER } = require('./source-binding.js');

const REAL_REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const EXIT = { PASS: 0, MISS: 1, INVALID: 2, UNEXPECTED: 3 };
const RESULT = 'ms18d-gp-merge-result';

class Invalid extends Error {}

const sameDir = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

function parseArgs(argv) {
  const out = {};
  argv.forEach((arg) => {
    const m = /^--(plan|scope|out)=(.+)$/.exec(arg);
    if (!m || out[m[1]] !== undefined) throw new Invalid('unknown or repeated argument: ' + arg);
    out[m[1]] = m[2];
  });
  ['plan', 'scope', 'out'].forEach((k) => { if (out[k] === undefined) throw new Invalid('missing --' + k); });
  const scope = out.scope === 'all-79' ? { type: 'all' }
    : /^cell:([A-Za-z0-9]+\/[A-Za-z0-9]+)$/.exec(out.scope);
  if (!scope) throw new Invalid('the scope is all-79 or cell:<variant>/<level>');
  out.scopeObject = scope.type === 'all' ? scope : { type: 'cell', cell: scope[1] };
  return out;
}

function readJson(file, what) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    throw new Invalid('cannot read ' + what + ': ' + err.message);
  }
}

/** The numbers of one raw statistic as printed: the full-precision decimal text, never rounded. */
const num = (x) => String(x);

/** The context of this merge run: request, plan, slot, base, helper hash. Throws Invalid. */
function prepare(args) {
  const flags = process.env.NODE_OPTIONS;
  if (process.execArgv.length !== 0 || (flags !== undefined && flags !== '')) {
    throw new Invalid('Node flags are set (execArgv or NODE_OPTIONS)');
  }
  const out = path.resolve(args.out);
  const dir = path.dirname(out);
  if (path.basename(out) !== 'report.json') throw new Invalid('the output is <run directory>/report.json');
  if (fs.existsSync(out)) throw new Invalid('the report exists; it is never overwritten');
  const request = readJson(path.join(dir, 'request.json'), 'request.json');
  if (request.schema !== 'ms18d-c-request-1' || request.profile !== 'gp-merge') {
    throw new Invalid('the request is not a gp-merge request');
  }
  const standin = request.standin === true;
  if (!standin && !sameDir(request.repo, REAL_REPO)) throw new Invalid('a real run uses the real repository');
  const repo = path.resolve(request.repo);
  const planFile = path.resolve(repo, args.plan);
  if (path.relative(repo, planFile).startsWith('..')) throw new Invalid('the plan is outside the repository');
  const planBytes = fs.readFileSync(planFile);
  const doc = readJson(planFile, 'the plan manifest');
  const problems = plan.verifyManifest(doc);
  if (problems.length > 0) throw new Invalid('the plan manifest is unsound: ' + problems[0]);
  if (!request.plan || request.plan.manifestSha256 !== doc.manifestSha256 ||
    request.plan.rawSha256 !== sha256(planBytes)) {
    throw new Invalid('the plan is not the one the request names');
  }
  const rel = path.relative(repo, dir).replace(/\\/g, '/');
  const slot = plan.slotForDir(doc, rel);
  const scope = args.scopeObject;
  const wanted = scope.type === 'all' ? ['final-merge', null] : ['cell-merge', scope.cell];
  if (!slot || slot.role !== wanted[0] || slot.cell !== wanted[1]) {
    throw new Invalid('the run folder is not the declared merge slot of this scope: ' + rel);
  }
  if (request.scope !== args.scope) throw new Invalid('the request names another scope');
  const base = request.expected && request.expected.base;
  if (!/^[0-9a-f]{40}$/.test(String(base))) throw new Invalid('the request names no campaign base');
  const helpers = request.helpers || {};
  if (!helpers.manifestFile || !fs.existsSync(helpers.manifestFile)) throw new Invalid('no helper manifest');
  const helperSha = sha256(fs.readFileSync(helpers.manifestFile));
  if (helpers.manifestSha256 && helpers.manifestSha256 !== helperSha) {
    throw new Invalid('the helper manifest is not the reviewed one');
  }
  if (!standin && !helpers.manifestSha256) throw new Invalid('a real run names the helper manifest hash');
  return { out, dir, request, repo, doc, standin, base, helperSha, rel, args };
}

function repoFs(repo) {
  const abs = (rel) => path.join(repo, rel);
  return {
    listDir: (rel) => (fs.existsSync(abs(rel))
      ? fs.readdirSync(abs(rel), { withFileTypes: true }).map((e) => ({ name: e.name, dir: e.isDirectory() }))
      : []),
    exists: (rel) => fs.existsSync(abs(rel)),
    readDir: (rel) => core.readRunFolder(abs(rel))
  };
}

const scopeLabel = (scope) => (scope.type === 'all' ? 'all-79' : 'cell:' + scope.cell);

/** The result line of a complete evaluation. */
function resultLine(evaluation, doc) {
  const label = scopeLabel(evaluation.scope);
  if (evaluation.scope.type === 'all') {
    return RESULT + ' scope=' + label + ' complete=true meets=' + evaluation.meets + ' successes=' +
      evaluation.successes + ' cells=' + evaluation.cells.length + ' required=' + doc.gate.requiredSuccesses;
  }
  const s = evaluation.cells[0].stats;
  return RESULT + ' scope=' + label + ' complete=true meets=' + evaluation.meets + ' p95=' + num(s.p95) +
    ' target=' + num(s.target);
}

function reportOf(ctx, evaluation, line) {
  const consumed = [];
  evaluation.cells.forEach((c) => (c.consumed || []).forEach((x) => consumed.push(x)));
  return {
    schema: 'ms18d-gp-merge-report-v1', scope: scopeLabel(evaluation.scope), complete: evaluation.complete,
    meets: evaluation.complete ? evaluation.meets : null, successes: evaluation.successes,
    required: evaluation.required, extraColdStarts: evaluation.extraStarts === undefined ? null :
      evaluation.extraStarts, resultLine: line, problems: evaluation.problems,
    cells: evaluation.cells.map((c) => ({ cell: c.cell, complete: c.complete,
      stats: core.publicStats(c.stats), chunks: c.chunks, coldStartSensitive: c.coldStartSensitive === true,
      coldStart: c.coldStart, problems: c.complete ? [] : c.problems })),
    consumed,
    identity: { manifestSha256: ctx.doc.manifestSha256, helperManifestSha256: ctx.helperSha, base: ctx.base },
    observation: { argv: process.argv.slice(2), pid: process.pid, at: new Date().toISOString(),
      standin: ctx.standin }
  };
}

function writeReport(file, report) {
  const bytes = Buffer.from(CRLF(JSON.stringify(report, null, 2)) + '\r\n', 'utf8');
  const fd = fs.openSync(file, 'wx');
  try {
    let done = 0;
    while (done < bytes.length) done += fs.writeSync(fd, bytes, done, bytes.length - done);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

/** Runs the merge. `deps.git` replaces the Git reader and `deps.out` the stdout writer (stand-in tests). */
function main(argv, deps) {
  const out = (deps && deps.out) || ((text) => process.stdout.write(text + '\n'));
  let ctx;
  try {
    ctx = prepare(parseArgs(argv));
  } catch (err) {
    if (!(err instanceof Invalid)) throw err;
    out('ms18d-gp-merge-invalid ' + err.message);
    return EXIT.INVALID;
  }
  const git = (deps && deps.git) || gitReader(ctx.repo);
  const ledgerPath = (deps && deps.ledger) || LEDGER;
  const scope = ctx.args.scopeObject;
  const folders = core.collectRunFolders(ctx.doc, scope, repoFs(ctx.repo));
  const headChecker = core.makeHeadChecker(git, ctx.base, ctx.doc, ledgerPath);
  const evaluation = core.evaluate({ doc: ctx.doc, scope, runFolders: folders.folders,
    expectedIdentity: core.expectedIdentityOf(ctx.doc, ctx.helperSha, ctx.base), base: ctx.base,
    checkHead: headChecker, realRun: !ctx.standin, planRel: ctx.args.plan });
  folders.problems.forEach((p) => evaluation.problems.push(p));
  if (folders.problems.length > 0) evaluation.complete = false;

  out('ms18d-gp-merge-start scope=' + scopeLabel(scope) + ' manifest=' + ctx.doc.manifestSha256 +
    ' base=' + ctx.base);
  evaluation.cells.forEach((c) => {
    if (c.complete) {
      const s = c.stats;
      out('cell ' + c.cell + ' chunks=' + c.chunks.length + ' p50=' + num(s.p50) + ' p95=' + num(s.p95) +
        ' max=' + num(s.max) + ' mean=' + num(s.mean) + ' target=' + num(s.target) + ' meets=' + s.meets);
      c.coldStart.forEach((q) => out('cold-start-sensitive cell=' + c.cell + ' first-request-index=' +
        q.index + ' ms=' + num(q.ms) + ' extra-start=' + q.extraStart));
    } else out('cell ' + c.cell + ' INCOMPLETE');
  });
  let line = null;
  let code = EXIT.INVALID;
  if (evaluation.complete) {
    line = resultLine(evaluation, ctx.doc);
    code = evaluation.meets ? EXIT.PASS : EXIT.MISS;
  }
  writeReport(ctx.out, reportOf(ctx, evaluation, line));
  if (!evaluation.complete) {
    evaluation.problems.slice(0, 50).forEach((p) => out('problem: ' + p));
    out('ms18d-gp-merge-incomplete scope=' + scopeLabel(scope) + ' problems=' + evaluation.problems.length);
    return EXIT.INVALID;
  }
  out(line);
  return code;
}

function guarded(argv, deps) {
  try {
    return main(argv, deps);
  } catch (err) {
    try {
      process.stderr.write('unexpected: ' + (err && err.stack ? err.stack : err) + '\n');
    } catch (inner) { /* the exit code says it */ }
    return EXIT.UNEXPECTED;
  }
}

if (require.main === module) {
  process.on('uncaughtException', (err) => {
    try {
      process.stderr.write('unexpected: ' + (err && err.stack ? err.stack : err) + '\n');
    } catch (inner) { /* the exit code says it */ }
    process.exitCode = EXIT.UNEXPECTED;
  });
  process.on('unhandledRejection', (err) => {
    try {
      process.stderr.write('unexpected rejection: ' + (err && err.stack ? err.stack : err) + '\n');
    } catch (inner) { /* the exit code says it */ }
    process.exitCode = EXIT.UNEXPECTED;
  });
  process.exitCode = guarded(process.argv.slice(2));
}

module.exports = { main: guarded, prepare, parseArgs, resultLine, EXIT, RESULT };
