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
  return { out, dir, request, repo, doc, standin, base, helperSha, rel, args,
    planRawSha256: sha256(planBytes) };
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
  // what the matrix holds: complete cells, the raw requests they carry (each complete chunk once, whatever
  // slot it ran in) and every hold (a hold is never a success): 76 + k cells and 3,800 + 50 k requests at B4
  const done = evaluation.cells.filter((c) => c.complete && c.stats);
  const holds = [];
  evaluation.cells.forEach((c) => (c.chunks || []).forEach((d) => (d.holdRuns || [])
    .forEach((id) => holds.push(id))));
  return {
    schema: 'ms18d-gp-merge-report-v1', scope: scopeLabel(evaluation.scope), complete: evaluation.complete,
    meets: evaluation.complete ? evaluation.meets : null, successes: evaluation.successes,
    required: evaluation.required, extraColdStarts: evaluation.extraStarts === undefined ? null :
      evaluation.extraStarts, resultLine: line, problems: evaluation.problems,
    totals: { cells: evaluation.cells.length, completeCells: done.length,
      requests: done.reduce((sum, c) => sum + c.stats.n, 0), holds },
    cells: evaluation.cells.map((c) => ({ cell: c.cell, complete: c.complete,
      stats: core.publicStats(c.stats), chunks: c.chunks, coldStartSensitive: c.coldStartSensitive === true,
      coldStart: c.coldStart, problems: c.complete ? [] : c.problems })),
    consumed,
    identity: { manifestSha256: ctx.doc.manifestSha256, helperManifestSha256: ctx.helperSha, base: ctx.base },
    epochs: ctx.epochInfo && ctx.epochInfo.record ? { pairs: ctx.epochInfo.pairs.map((p) => ({ id: p.id,
      base: p.base, helperManifestSha256: p.helperManifestSha256, attempts: p.attempts || null,
      plan: p.plan ? { file: p.plan.file, rawSha256: p.plan.rawSha256, manifestSha256: p.plan.manifestSha256 }
        : null })),
      record: { file: ctx.epochInfo.file, sha256: ctx.epochInfo.recordSha256 },
      chain: ctx.epochInfo.records.map((r) => ({ epoch: r.epoch, file: r.file, sha256: r.sha256 })) } : null,
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
 * The epochs of this merge. A merge that runs at the base of the declared epoch 1 has that one pair. Any
 * other merge belongs to a later epoch, declared by one never-edited record committed per step (EPOCH_STEPS:
 * epoch 2 at EPOCH2_RECORD_REL, epoch 3 at EPOCH3_RECORD_REL), read from HEAD and validated with every proof
 * it cites (merge-core.js epochRecordProblems) against the epoch before it. The chain is followed from epoch
 * 1 until the pair of the merge request is reached: the campaign then has exactly the declared pairs up to
 * it, and no other. Epoch 1 is the frozen declaration of merge-core.js (EPOCH1); a stand-in request carries
 * its own `epoch1` (absent: a single-pair stand-in merge), the records as `epoch2Text` and `epoch3Text` and,
 * for epoch 3, the checkpoint as `epoch3Checkpoint`. Invalid when the pair is declared nowhere, or a record
 * is missing, edited, or does not verify.
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

const readText = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new Invalid('cannot read ' + file + ': ' + err.message);
  }
};

/**
 * One epoch's plan: { file, planRel, rawSha256, manifestSha256 } and the parsed `doc` (non-enumerable, so a
 * printed or serialized pair never carries a whole manifest).
 */
const withDoc = (info, doc) => Object.defineProperty(info, 'doc', { value: doc, enumerable: false });

/** The plan of the merge request as one epoch's plan. */
function currentPlanOf(ctx) {
  const given = ctx.request && ctx.request.plan ? ctx.request.plan : {};
  const rel = ctx.args && ctx.args.plan ? ctx.args.plan : given.file;
  return withDoc({ file: typeof rel === 'string' ? rel.replace(/\\/g, '/') : undefined,
    planRel: typeof rel === 'string' ? rel : undefined, rawSha256: ctx.planRawSha256 || given.rawSha256,
    manifestSha256: ctx.doc ? ctx.doc.manifestSha256 : undefined }, ctx.doc);
}

function epochsOf(ctx, git) {
  const e1 = declaredEpoch1(ctx);
  const current = currentPlanOf(ctx);
  const pairs = [{ id: 1, base: e1.base, helperManifestSha256: e1.helperManifestSha256, plan: current }];
  if (ctx.base === e1.base) {
    if (ctx.helperSha !== e1.helperManifestSha256) {
      throw new Invalid('the helper manifest of the request is not the declared one of epoch 1');
    }
    return { pairs, record: null, records: [], file: null, recordSha256: null };
  }
  const inside = (rel) => {
    const file = path.resolve(ctx.repo, rel);
    if (path.relative(ctx.repo, file).startsWith('..')) {
      throw new Invalid('a path leaves the repository: ' + rel);
    }
    return file;
  };
  let head;
  try {
    head = String(git(['rev-parse', 'HEAD'])).trim();
  } catch (err) {
    throw new Invalid('HEAD cannot be read: ' + String(err.message).split(/\r?\n/)[0]);
  }
  const records = [];
  let previous = e1;
  let previousRecord = null;
  let previousPlan = null;
  // the plan an earlier record names (its own file, raw hash and canonical hash, read and proved here): V1
  // for epochs 1 to 3 even when the merge request is for the V2 manifest of epoch 4; a record without a plan
  // file (a stand-in) and the record of the request's own epoch use the plan of the request
  const planOf = (own, rec, label) => {
    if (own || !rec.plan || typeof rec.plan.file !== 'string') return current;
    let bytes;
    try {
      bytes = fs.readFileSync(inside(rec.plan.file));
    } catch (err) {
      throw new Invalid('cannot read the plan of the ' + label + ' record: ' + err.message);
    }
    let doc;
    try {
      doc = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    } catch (err) {
      throw new Invalid('the plan of the ' + label + ' record is not JSON');
    }
    const problems = plan.verifyManifest(doc);
    if (problems.length > 0) {
      throw new Invalid('the plan of the ' + label + ' record is unsound: ' + problems[0]);
    }
    const raw = sha256(bytes);
    if (raw !== rec.plan.rawSha256 || doc.manifestSha256 !== rec.plan.manifestSha256) {
      throw new Invalid('the plan file ' + rec.plan.file + ' is not the one the ' + label + ' record names');
    }
    return withDoc({ file: rec.plan.file, planRel: rec.plan.file.replace(/\//g, '\\'), rawSha256: raw,
      manifestSha256: doc.manifestSha256 }, doc);
  };
  // when the chain reaches epoch 4 (the V2 plan) the V1 epochs run attempts 1 and 2 only and epoch 4 runs the
  // exceptional attempt 3 only; every epoch before has the V1 plan of the first record that names one
  const finish = (rec, last) => {
    pairs[0].plan = pairs.length > 1 ? pairs[1].plan : current;
    if (pairs.length === 4) {
      pairs.forEach((p, i) => { p.attempts = i < 3 ? [1, 2] : [3]; });
    }
    return { pairs, record: rec, records, file: last.file, recordSha256: last.sha256 };
  };
  for (const n of [2, 3, 4]) {
    const step = core.EPOCH_STEPS[n];
    let text;
    let commits;
    try {
      const own = ctx.standin ? ctx.request['epoch' + n + 'Text'] : undefined;
      text = typeof own === 'string' ? own : String(git(['show', head + ':' + step.recordRel]));
      commits = Number(String(git(['rev-list', '--count', 'HEAD', '--', step.recordRel])).trim());
    } catch (err) {
      const why = 'the ' + step.label + ' record is not committed at HEAD (' + step.recordRel + '): ' +
        String(err.message).split(/\r?\n/)[0];
      throw new Invalid(n === 2 ? why : 'the campaign base ' + ctx.base + ' is not a declared epoch: ' + why);
    }
    const parsed = core.parseEpochRecord(text, step.label);
    if (parsed.problems.length > 0) throw new Invalid(parsed.problems[0]);
    const rec = parsed.record;
    const own = rec.campaignBase === ctx.base;
    let base = ctx.base;
    let helperSha = ctx.helperSha;
    let manifest2Text;
    if (own) manifest2Text = readText(ctx.request.helpers.manifestFile);
    else {
      const rel = rec.helperManifest && rec.helperManifest.file;
      if (typeof rel !== 'string') {
        throw new Invalid(step.label + ' record: helperManifest.file is not a path');
      }
      manifest2Text = readText(inside(rel));
      base = rec.campaignBase;
      helperSha = sha256(Buffer.from(manifest2Text, 'utf8'));
    }
    const manifest1Text = readText(inside(String(previous.manifestRel)));
    if (sha256(Buffer.from(manifest1Text, 'utf8')) !== previous.helperManifestSha256) {
      throw new Invalid('the helper manifest of epoch ' + (n - 1) + ' is not the declared one');
    }
    const checkpoint = n === 2 ? previous.checkpoint : n === 3 ? (ctx.standin &&
      ctx.request.epoch3Checkpoint) || core.EPOCH2_CHECKPOINT : (ctx.standin &&
      ctx.request.epoch4Checkpoint) || core.EPOCH3_CHECKPOINT;
    const planInfo = planOf(own, rec, step.label);
    const checked = core.epochRecordProblems({ step, record: rec, base, helperSha,
      epoch1: Object.assign({}, previous, { checkpoint }), previousRecord, previousPlan, root: e1.base,
      doc: planInfo.doc,
      planRawSha256: planInfo.rawSha256, manifest1Text, manifest2Text, git, head, commits,
      readProof: (rel) => {
        const file = path.resolve(ctx.repo, rel);
        return path.relative(ctx.repo, file).startsWith('..') || !fs.existsSync(file) ? null :
          fs.readFileSync(file);
      } });
    if (checked.problems.length > 0) throw new Invalid(checked.problems.slice(0, 5).join('; '));
    pairs.push({ id: n, base: rec.campaignBase, helperManifestSha256: helperSha, plan: planInfo });
    records.push({ epoch: n, record: rec, file: step.recordRel, sha256: sha256(Buffer.from(text, 'utf8')) });
    if (own) return finish(rec, records[records.length - 1]);
    previous = { id: n, base: rec.campaignBase, helperManifestSha256: helperSha,
      entries: rec.helperManifest.entries, manifestRel: rec.helperManifest.file };
    previousRecord = rec;
    previousPlan = planInfo;
  }
  throw new Invalid('the campaign base ' + ctx.base + ' is not a declared epoch');
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
    // from epoch 4 on the only incomplete cells are the candidates' (no retained success lives in one), so
    // the retained successes of every earlier epoch must be consumed exactly even if the merge is incomplete
    const strict = scope.type === 'all' && (evaluation.complete || epochInfo.pairs.length >= 4);
    core.epochAccountingChain(consumed, core.retainedOf(epochInfo.record), epochInfo.pairs.length, strict)
      .forEach((p) => evaluation.problems.push(p));
    if (scope.type === 'all') {
      // every hold a record retains (a1 of epoch 1, the a2 hold of epoch 2) must still be a hold
      const holdRuns = [];
      evaluation.cells.forEach((c) => (c.chunks || []).forEach((d) => (d.holdRuns || [])
        .forEach((id) => holdRuns.push(id))));
      core.holdProblems(holdRuns, epochInfo.records.map((r) => r.record.retainedEvidence.holds))
        .forEach((p) => evaluation.problems.push(p));
    }
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
