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
 *
 * Epochs (the B2 transport repair): a merge at the base of the declared epoch 1 judges its one pair. The
 * merge of epoch 2 (any other base) needs the one committed base-2 record (merge-core.js,
 * epochRecordProblems) and judges the ledgers of BOTH declared pairs, each against its own pair; the report
 * names the pairs, the record digest and the epoch of every consumed ledger. An invalid or missing record is
 * exit 2 (no report).
 */
const fs = require('fs');
const path = require('path');
const plan = require('./plan-data.js');
const core = require('./merge-core.js');
const journals = require('./journals.js');
const { sha256, CRLF } = require('./common.js');
const { gitReader } = require('./source-io.js');
const { LEDGER } = require('./source-binding.js');

const REAL_REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const EXIT = { PASS: 0, MISS: 1, INVALID: 2, UNEXPECTED: 3 };
const RESULT = 'ms18d-gp-merge-result';
const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;

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
    epochs: ctx.epochInfo && ctx.epochInfo.record ? { pairs: ctx.epochInfo.pairs,
      record: { file: ctx.epochInfo.file, sha256: ctx.epochInfo.recordSha256 } } : null,
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

/**
 * The host-binding journal as committed at the merge HEAD (a stand-in request may carry its own text): the
 * entries and lines the admissions' binding references are checked against; Invalid when it is absent, empty
 * or not a valid append-only chain. The journal is read only from the committed state.
 */
function bindingJournalOf(ctx, git, deps) {
  if (deps && deps.bindingJournal) return deps.bindingJournal;
  let text = null;
  if (ctx.standin && typeof ctx.request.bindingJournalText === 'string') {
    text = ctx.request.bindingJournalText;
  } else {
    let head;
    try {
      head = String(git(['rev-parse', 'HEAD'])).trim();
    } catch (err) {
      throw new Invalid('HEAD cannot be read: ' + err.message);
    }
    // the committed journal must keep its version at B as a line prefix, and every entry's evidence must be
    // committed with the cited digest
    const j = journals.loadJournal({ git, head, base: ctx.base, rel: journals.BINDINGS_REL,
      parse: journals.parseBindings });
    if (j.problems.length > 0) {
      throw new Invalid('the host-binding journal is invalid at HEAD: ' + j.problems[0]);
    }
    const bad = [];
    j.entries.forEach((e) => journals.evidenceProblems(git, head, e).forEach((p) => bad.push(p)));
    if (bad.length > 0) throw new Invalid('the host-binding evidence is invalid: ' + bad[0]);
    if (j.entries.length === 0) throw new Invalid('the host-binding journal is empty or invalid: no entry');
    return { entries: j.entries, lines: j.lines, problems: [] };
  }
  const lines = journals.linesOf(text);
  const parsed = journals.parseBindings(lines);
  if (parsed.problems.length > 0 || parsed.entries.length === 0) {
    throw new Invalid('the host-binding journal is empty or invalid: ' + (parsed.problems[0] || 'no entry'));
  }
  return { entries: parsed.entries, lines, problems: [] };
}

/**
 * The epochs of this merge (the B2 transport repair). A merge that runs at the base of the declared
 * epoch 1 has that one pair. Any other merge is the merge of epoch 2: its campaign base B2 and helper
 * manifest H2 must be exactly the pair of the one never-edited record committed at EPOCH2_RECORD_REL (read
 * from HEAD, with every proof it cites validated: merge-core.js epochRecordProblems), and the campaign then
 * has TWO pairs, epoch 1 and epoch 2, and no third. Epoch 1 is the frozen declaration of merge-core.js
 * (EPOCH1); a stand-in request carries its own `epoch1` (absent: a single-pair stand-in merge) and its
 * record as `epoch2Text`. Invalid when the pair is declared nowhere, or the record is missing, edited, or
 * does not verify.
 */
function declaredEpoch1(ctx) {
  if (!ctx.standin) return core.EPOCH1;
  const o = ctx.request.epoch1;
  if (o === undefined) return { id: 1, base: ctx.base, helperManifestSha256: ctx.helperSha };
  if (!o || !HEX40.test(String(o.base)) || !HEX64.test(String(o.helperManifestSha256))) {
    throw new Invalid('the stand-in epoch 1 is not a declared pair');
  }
  return Object.assign({ id: 1 }, o);
}

function epochsOf(ctx, git) {
  const e1 = declaredEpoch1(ctx);
  const first = { id: 1, base: e1.base, helperManifestSha256: e1.helperManifestSha256 };
  if (ctx.base === e1.base) {
    if (ctx.helperSha !== e1.helperManifestSha256) {
      throw new Invalid('the helper manifest of the request is not the declared one of epoch 1');
    }
    return { pairs: [first], record: null, file: null, recordSha256: null };
  }
  let head;
  let text;
  let commits;
  try {
    head = String(git(['rev-parse', 'HEAD'])).trim();
    text = ctx.standin && typeof ctx.request.epoch2Text === 'string' ? ctx.request.epoch2Text :
      String(git(['show', head + ':' + core.EPOCH2_RECORD_REL]));
    commits = Number(String(git(['rev-list', '--count', 'HEAD', '--', core.EPOCH2_RECORD_REL])).trim());
  } catch (err) {
    throw new Invalid('the base-2 record is not committed at HEAD (' + core.EPOCH2_RECORD_REL + '): ' +
      String(err.message).split(/\r?\n/)[0]);
  }
  const parsed = core.parseEpochRecord(text);
  if (parsed.problems.length > 0) throw new Invalid(parsed.problems[0]);
  const readText = (file) => {
    try {
      return fs.readFileSync(file, 'utf8');
    } catch (err) {
      throw new Invalid('cannot read ' + file + ': ' + err.message);
    }
  };
  const manifest1Text = readText(path.join(ctx.repo, String(e1.manifestRel)));
  if (sha256(Buffer.from(manifest1Text, 'utf8')) !== e1.helperManifestSha256) {
    throw new Invalid('the helper manifest of epoch 1 is not the declared one');
  }
  const checked = core.epochRecordProblems({ record: parsed.record, base: ctx.base, helperSha: ctx.helperSha,
    epoch1: e1, doc: ctx.doc, planRawSha256: ctx.request.plan.rawSha256, manifest1Text,
    manifest2Text: readText(ctx.request.helpers.manifestFile), git, head, commits,
    readProof: (rel) => {
      const file = path.resolve(ctx.repo, rel);
      return path.relative(ctx.repo, file).startsWith('..') || !fs.existsSync(file) ? null :
        fs.readFileSync(file);
    } });
  if (checked.problems.length > 0) {
    throw new Invalid(checked.problems.slice(0, 5).join('; '));
  }
  return { pairs: [first, { id: 2, base: ctx.base, helperManifestSha256: ctx.helperSha }],
    record: parsed.record, file: core.EPOCH2_RECORD_REL, recordSha256: sha256(Buffer.from(text, 'utf8')) };
}

/** Runs the merge. `deps.git` replaces the Git reader and `deps.out` the stdout writer (stand-in tests). */
function main(argv, deps) {
  const out = (deps && deps.out) || ((text) => process.stdout.write(text + '\n'));
  let ctx;
  let bindingJournal;
  let git;
  let epochInfo;
  try {
    ctx = prepare(parseArgs(argv));
    git = (deps && deps.git) || gitReader(ctx.repo);
    bindingJournal = bindingJournalOf(ctx, git, deps);
    epochInfo = epochsOf(ctx, git);
  } catch (err) {
    if (!(err instanceof Invalid)) throw err;
    out('ms18d-gp-merge-invalid ' + err.message);
    return EXIT.INVALID;
  }
  ctx.epochInfo = epochInfo;
  const ledgerPath = (deps && deps.ledger) || LEDGER;
  const scope = ctx.args.scopeObject;
  const folders = core.collectRunFolders(ctx.doc, scope, repoFs(ctx.repo));
  const epochs = core.buildEpochs(ctx.doc, epochInfo.pairs, git, ledgerPath);
  const evaluation = core.evaluate({ doc: ctx.doc, scope, runFolders: folders.folders, epochs,
    realRun: !ctx.standin, planRel: ctx.args.plan, bindingJournal });
  folders.problems.forEach((p) => evaluation.problems.push(p));
  if (folders.problems.length > 0) evaluation.complete = false;
  if (epochInfo.record) {
    const consumed = [];
    evaluation.cells.forEach((c) => (c.consumed || []).forEach((x) => consumed.push(x)));
    core.epochAccounting(consumed, epochInfo.record, evaluation.complete && scope.type === 'all')
      .forEach((p) => evaluation.problems.push(p));
    if (evaluation.problems.length > 0) evaluation.complete = false;
  }

  out('ms18d-gp-merge-start scope=' + scopeLabel(scope) + ' manifest=' + ctx.doc.manifestSha256 +
    ' base=' + ctx.base);
  if (epochInfo.record) {
    out('ms18d-gp-merge-epochs ' + epochInfo.pairs.map((p) => p.id + '=' + p.base.slice(0, 8) + ':' +
      p.helperManifestSha256.slice(0, 8)).join(' ') + ' record=' + epochInfo.recordSha256.slice(0, 16));
  }
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

module.exports = { main: guarded, prepare, parseArgs, resultLine, bindingJournalOf, epochsOf, EXIT, RESULT };
