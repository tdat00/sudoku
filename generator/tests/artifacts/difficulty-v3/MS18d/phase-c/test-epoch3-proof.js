#!/usr/bin/env node
'use strict';

/*
 * MS18d epoch-3 release-history repair (B3) task-owned tooling: the data and the proof file that the base-3
 * record (tasks/difficulty-v3/MS18d-gp-campaign-base-3.jsonl) cites, computed with the very functions the
 * check-only merger uses (merge-core.js, merge-gp.js), the read-only validation of the checkpointed runs of
 * both earlier epochs, and the read-only pre-launch check of the release history and the attempt state. It
 * writes nothing but the one file --out names, never a run folder, never a ledger, never the C log; it reads
 * Git (read-only commands) and the repository files. test-epoch2-proof.js stays as it was (epoch 2 only).
 *
 *   --data --h2=<helper manifest of epoch 2> --h3=<helper manifest of epoch 3> [--out=<file>]
 *       the exact change list of the two manifests (path, class, before/after SHA-256), the number of
 *       byte-identical entries and the problems (exit 2 when a difference is not allowed)
 *   --proof --b3=<commit> --h2=<file> --h3=<file> --out=<proof file>
 *       the transition proof of merge-core.js (ancestry B2 -> checkpoint -> B3, the committed B2 -> B3 diff,
 *       the change list, the identical count), written with CRLF and a final CRLF: the SHA-256 of the file as
 *       written (the checkout bytes) is the digest the record cites. Exit 2 when anything is not allowed.
 *   --retained
 *       the complete runs of the real run base judged by the merger's own checks against the declared pairs
 *       (B1/H1 and B2/H2, from the committed base-2 record): the retained successes { chunkId, runId,
 *       ledgerSha256, epoch } for the base-3 record, the holds, and the problems of every other slot.
 *   --draft --b3=<commit> --h2=<file> --h3=<file> --proof=<proof file> [--out=<file>]
 *       the one-line base-3 record with every field the merger validates computed (change list, proof digest,
 *       retained successes tagged with their epoch, holds, plan, identities, environment and policy copied
 *       from the base record), for the orchestrator to review, complete (`ownerDecision`, `reviews`,
 *       `suites`, the cutover chunk) and commit. Printed, and written (CRLF) only when --out names a new
 *       file.
 *   --check --b3=<commit> --h3=<file> [--record=<draft file>]
 *       the chain of base records as the final merge reads it (merge-gp.js epochsOf, the very code, real
 *       Git): the committed records at HEAD, or, with --record, a DRAFT of the base-3 record that is not
 *       committed yet (a dry run: the one-commit rule is taken as met), and the retained successes against
 *       the real run folders. Exit 0 valid, 2 invalid (the reason is printed).
 *   --history --chunk=<id> [--attempt=<n>] [--base=<commit>] [--expect=allow|refuse]
 *       the pre-launch dry run, read-only: release-history.js collectReleases over the wrapper's exact
 *       sources (the Phase A and B logs required, the Phase C log optional, no coordinator evidence) and
 *       attempts.js chunkAttempts for the slot of the chunk (the committed rulings journal at HEAD). Exit 0
 *       when the history has no problem and the attempt records are consistent (and, with --expect, the
 *       decision is the expected one); 2 otherwise. It never admits anything: F4 still stops the line.
 */
const fs = require('fs');
const path = require('path');
const core = require('./merge-core.js');
const mergeGp = require('./merge-gp.js');
const plan = require('./plan-data.js');
const journals = require('./journals.js');
const { collectReleases } = require('./release-history.js');
const { chunkAttempts } = require('./attempts.js');
const { gitReader } = require('./source-io.js');
const { LEDGER } = require('./source-binding.js');
const { sha256, CRLF } = require('./common.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const PLAN_REL = 'docs\\difficulty-v3\\evidence\\MS18d\\phase-c\\gp-chunk-manifest.json';
const BASE1_RECORD_REL = 'tasks/difficulty-v3/MS18d-gp-campaign-base.jsonl';
const STEP = core.EPOCH_STEPS[3];
const EVIDENCE = path.join(REPO, 'docs', 'difficulty-v3', 'evidence', 'MS18d');

function parse(argv) {
  const out = {};
  argv.forEach((arg) => {
    const m = /^--([a-z0-9]+)(?:=(.*))?$/.exec(arg);
    if (!m || out[m[1]] !== undefined) throw new Error('unknown or repeated argument: ' + arg);
    out[m[1]] = m[2] === undefined ? true : m[2];
  });
  return out;
}

const read = (file) => fs.readFileSync(path.resolve(REPO, file));
const json = (bytes) => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));

/** The committed base-2 record at HEAD (the previous epoch of this step): { record, text }. */
function committedRecord2(git) {
  const text = String(git(['show', 'HEAD:' + core.EPOCH_STEPS[2].recordRel]));
  const parsed = core.parseEpochRecord(text, 'base-2');
  if (parsed.problems.length > 0) throw new Error(parsed.problems[0]);
  return { record: parsed.record, text };
}

/** The change list of two manifest files and what is needed to cite them. */
function manifestData(h2File, h3File) {
  const b2 = read(h2File);
  const b3 = read(h3File);
  const m2 = core.parseHelperManifest(b2.toString('utf8'));
  const m3 = core.parseHelperManifest(b3.toString('utf8'));
  const t = core.manifestTransition(m2, m3, STEP.production);
  return { m2, m3, transition: t,
    previousHelperManifest: { file: h2File.replace(/\\/g, '/'), sha256: sha256(b2),
      entries: m2.entries.size },
    helperManifest: { file: h3File.replace(/\\/g, '/'), sha256: sha256(b3), entries: m3.entries.size },
    problems: m2.problems.concat(m3.problems, t.problems) };
}

function writeExclusive(file, text) {
  const bytes = Buffer.from(CRLF(text) + '\r\n', 'utf8');
  fs.writeFileSync(file, bytes, { flag: 'wx' });
  return sha256(bytes);
}

function dataMode(args) {
  const d = manifestData(args.h2, args.h3);
  const doc = { schema: 'ms18d-gp-epoch-3-transition-data-v1',
    previousHelperManifest: d.previousHelperManifest, helperManifest: d.helperManifest,
    allowedHelperChanges: d.transition.changes,
    identicalEntries: d.transition.identical, problems: d.problems };
  if (args.out) doc.outputSha256 = writeExclusive(path.resolve(REPO, args.out), JSON.stringify(doc, null, 2));
  console.log(JSON.stringify(doc, null, 2));
  return d.problems.length === 0 ? 0 : 2;
}

function proofMode(args) {
  const git = gitReader(REPO);
  const b3 = String(args.b3);
  const { record: r2 } = committedRecord2(git);
  const prev = { base: r2.campaignBase, checkpoint: core.EPOCH2_CHECKPOINT };
  const d = manifestData(args.h2, args.h3);
  const problems = d.problems.slice();
  if (!/^[0-9a-f]{40}$/.test(b3)) problems.push('--b3 is not a full commit id');
  if (d.previousHelperManifest.sha256 !== r2.helperManifest.sha256) {
    problems.push('--h2 is not the declared manifest of epoch 2');
  }
  [[prev.base, prev.checkpoint], [prev.checkpoint, b3]].forEach(([a, b]) => {
    try {
      git(['merge-base', '--is-ancestor', a, b]);
    } catch (err) {
      problems.push(a + ' is not an ancestor of ' + b);
    }
  });
  let names = [];
  try {
    names = core.diffEntries(git, prev.base, b3);
    core.transitionDiffProblems(names, d.transition.changes, LEDGER).forEach((p) => problems.push(p));
  } catch (err) {
    problems.push('the B2 -> B3 diff cannot be read: ' + err.message);
  }
  const proof = { schema: STEP.proofSchema, previousBase: prev.base, checkpoint: prev.checkpoint,
    campaignBase: b3, previousHelperManifestSha256: d.previousHelperManifest.sha256,
    helperManifestSha256: d.helperManifest.sha256,
    changes: d.transition.changes, identicalEntries: d.transition.identical,
    committedDiff: names.map((n) => n.status + ' ' + n.file.replace(/\\/g, '/')).sort() };
  const result = { proof, problems, previousHelperManifest: d.previousHelperManifest,
    helperManifest: d.helperManifest };
  if (problems.length === 0 && args.out) {
    result.proofFile = args.out.replace(/\\/g, '/');
    result.proofSha256 = writeExclusive(path.resolve(REPO, args.out), JSON.stringify(proof, null, 2));
  }
  console.log(JSON.stringify(result, null, 2));
  return problems.length === 0 ? 0 : 2;
}

/** The context of a merge at the base of epoch 2 (the committed pairs up to it), for epochsOf. */
function contextAtEpoch2(git) {
  const { record: r2 } = committedRecord2(git);
  const h2 = path.resolve(REPO, r2.helperManifest.file);
  const planBytes = read(PLAN_REL);
  return { r2, ctx: { standin: false, repo: REPO, base: r2.campaignBase, doc: json(planBytes),
    helperSha: sha256(fs.readFileSync(h2)),
    request: { plan: { rawSha256: sha256(planBytes) }, helpers: { manifestFile: h2 } } } };
}

/** The complete runs of the real run base, judged exactly as the merger judges them, each under its epoch. */
function judgeRetained() {
  const git = gitReader(REPO);
  const { r2, ctx } = contextAtEpoch2(git);
  const doc = ctx.doc;
  const problems = plan.verifyManifest(doc);
  if (problems.length > 0) throw new Error('the plan is unsound: ' + problems[0]);
  const info = mergeGp.epochsOf(ctx, git);
  const bindingJournal = mergeGp.bindingJournalOf({ standin: false, request: {}, base: r2.campaignBase },
    git, null);
  const epochs = core.buildEpochs(doc, info.pairs, git, LEDGER);
  const retained = [];
  const others = [];
  let requests = 0;
  doc.runSlots.filter((s) => s.role === 'chunk').forEach((slot) => {
    const dir = path.join(REPO, slot.dir);
    if (!fs.existsSync(dir)) return;
    const chunk = doc.chunks.filter((c) => c.chunkId === slot.chunkId)[0];
    const verdict = core.judgeRun(core.readRunFolder(dir), { doc, slot, chunk, epochs, realRun: true,
      planRel: PLAN_REL, bindingJournal });
    if (verdict.status === 'complete') {
      retained.push({ chunkId: slot.chunkId, runId: slot.runId, ledgerSha256: verdict.ledgerSha256,
        epoch: verdict.epoch.id });
      requests += chunk.n;
    } else others.push({ runId: slot.runId, status: verdict.status, problems: verdict.problems.slice(0, 5) });
  });
  return { doc, retained, others, requests, pairs: info.pairs, r2 };
}

function retainedMode() {
  const { doc, retained, others, requests, pairs } = judgeRetained();
  const cells = new Set(doc.chunks.filter((c) => retained.some((r) => r.chunkId === c.chunkId))
    .map((c) => c.cell));
  const complete = Array.from(cells).filter((cell) => doc.chunks.filter((c) => c.cell === cell)
    .every((c) => retained.some((r) => r.chunkId === c.chunkId)));
  const perEpoch = {};
  retained.forEach((r) => { perEpoch[r.epoch] = (perEpoch[r.epoch] || 0) + 1; });
  console.log(JSON.stringify({ pairs, retained: retained.length, perEpoch, requests,
    cellsWithAChunk: cells.size, completeCells: complete.length,
    holds: others.filter((o) => o.status === 'hold').map((o) => o.runId), others,
    retainedSuccesses: retained }, null, 2));
  return 0;
}

/** An ISO instant with the local zone offset. */
function stamp(d) {
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return new Date(d.getTime() + off * 60000).toISOString().replace(/\.\d+Z$/, '') +
    (off < 0 ? '-' : '+') + pad(Math.trunc(off / 60)) + ':' + pad(off % 60);
}

/** One committed journal of the pack as the checkout holds it: line count, bytes and digest. */
function journalState(rel) {
  const bytes = read(rel);
  const lines = bytes.toString('utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
  return { file: rel, entryCount: lines.length, checkoutBytes: bytes.length, checkoutSha256: sha256(bytes) };
}

function draftMode(args) {
  const b3 = String(args.b3);
  const d = manifestData(args.h2, args.h3);
  const r = judgeRetained();
  const first = json(read(BASE1_RECORD_REL));
  const proofFile = String(args.proof).replace(/\\/g, '/');
  const logBytes = fs.readFileSync(path.join(REPO, LEDGER));
  const problems = d.problems.slice();
  if (d.previousHelperManifest.file !== r.r2.helperManifest.file) {
    problems.push('--h2 is not the manifest file the base-2 record names');
  }
  const record = { schema: STEP.schema, campaignBase: b3, previousBase: r.r2.campaignBase,
    checkpoint: core.EPOCH2_CHECKPOINT,
    reason: 'The release-history reader refused the typed pre-window-hold event of the epoch-1 wrapper; ' +
      'no failed measurement',
    recordedAt: stamp(new Date()), recordedBy: 'orchestrator',
    previousHelperManifest: Object.assign({ hashOf: 'checkout bytes' }, d.previousHelperManifest),
    helperManifest: Object.assign({ hashOf: 'checkout bytes' }, d.helperManifest),
    allowedHelperChanges: d.transition.changes,
    transitionProof: { file: proofFile, sha256: sha256(read(proofFile)) },
    retainedEvidence: { checkpoint: core.EPOCH2_CHECKPOINT, successes: r.retained,
      holds: r.others.filter((o) => o.status === 'hold').map((o) => o.runId),
      cLog: { file: LEDGER, bytes: logBytes.length, sha256: sha256(logBytes) } },
    plan: first.plan, identities: first.identities, environment: first.environment, policy: first.policy,
    journals: { hostBindings: journalState('tasks/difficulty-v3/MS18d-gp-host-bindings.jsonl'),
      rulings: journalState('tasks/difficulty-v3/MS18d-gp-rulings.jsonl') },
    cutover: { successes: r.retained.length, requests: r.requests, nextChunk: null, nextAttempt: null },
    ownerDecision: null, reviews: [], suites: [] };
  const line = JSON.stringify(record);
  if (args.out) writeExclusive(path.resolve(REPO, args.out), line);
  console.log(line);
  if (problems.length > 0) console.log('problems: ' + problems.join('; '));
  return problems.length === 0 ? 0 : 2;
}

function checkMode(args) {
  const real = gitReader(REPO);
  const h3 = path.resolve(REPO, String(args.h3));
  const planBytes = read(PLAN_REL);
  const ctx = { standin: false, repo: REPO, base: String(args.b3), doc: json(planBytes),
    helperSha: sha256(fs.readFileSync(h3)),
    request: { plan: { rawSha256: sha256(planBytes) }, helpers: { manifestFile: h3 } } };
  let git = real;
  if (typeof args.record === 'string') {
    // a dry run over a draft that is not committed yet: the record text from the file, one commit of it
    ctx.standin = true;
    ctx.request.epoch1 = Object.assign({}, core.EPOCH1);
    ctx.request.epoch3Text = fs.readFileSync(path.resolve(REPO, args.record), 'utf8');
    git = (a) => (a[0] === 'rev-list' && a.indexOf(STEP.recordRel) !== -1 ? '1\n' : real(a));
  }
  let info;
  try {
    info = mergeGp.epochsOf(ctx, git);
  } catch (err) {
    console.log(JSON.stringify({ ok: false, problem: err.message }, null, 2));
    return 2;
  }
  const now = judgeRetained().retained;
  const kept = info.record ? core.retainedOf(info.record) : [];
  const same = plan.canonicalJson(now) === plan.canonicalJson(kept);
  console.log(JSON.stringify({ ok: same, dryRun: ctx.standin, pairs: info.pairs,
    records: info.records.map((x) => ({ epoch: x.epoch, file: x.file, sha256: x.sha256 })),
    retainedSuccesses: kept.length, retainedMatchTheRunFolders: same }, null, 2));
  return same ? 0 : 2;
}

function historyMode(args) {
  const git = gitReader(REPO);
  const doc = json(read(PLAN_REL));
  const chunk = doc.chunks.filter((c) => c.chunkId === args.chunk)[0];
  if (!chunk) throw new Error('--chunk is no chunk of the plan');
  const attempt = args.attempt === undefined ? 1 : Number(args.attempt);
  const runId = chunk.chunkId + '.a' + attempt;
  const sources = [
    { label: 'A', file: path.join(EVIDENCE, 'lock-log.jsonl'), kind: 'log', required: true },
    { label: 'B', file: path.join(EVIDENCE, 'phase-b', 'lock-log.jsonl'), kind: 'log', required: true },
    { label: 'C', file: path.join(EVIDENCE, 'phase-c', 'lock-log.jsonl'), kind: 'log', required: false }];
  const h = collectReleases(sources);
  const skipped = {};
  h.files.forEach((f) => { if (f.skippedLines) skipped[f.label] = f.skippedLines; });
  const head = String(git(['rev-parse', 'HEAD'])).trim();
  const rulings = journals.rulingsState(git, head, typeof args.base === 'string' ? args.base : null);
  const attempts = chunkAttempts({ baseDir: path.join(EVIDENCE, 'gp', chunk.cell.replace('/', '-')),
    chunkId: chunk.chunkId, runId, ledgerFile: path.join(REPO, LEDGER), rulings, nowMs: Date.now() });
  const clean = h.problems.length === 0 && attempts.problems.length === 0;
  const expected = typeof args.expect === 'string' ? args.expect : null;
  const ok = clean && (expected === null || attempts.decision === expected);
  console.log(JSON.stringify({ ok, head, slot: runId,
    history: { problems: h.problems, releases: h.releases.length,
      latest: h.latest ? { label: h.latest.label, line: h.latest.line, atMs: h.latest.atMs } : null,
      skippedPreWindowLines: skipped,
      files: h.files.map((f) => ({ label: f.label, present: f.present !== false,
        releases: h.releases.filter((r) => r.label === f.label).length, skippedLines: f.skippedLines,
        skippedEvents: f.skippedEvents })) },
    attempts: { decision: attempts.decision, reasons: attempts.reasons, problems: attempts.problems,
      admissions: attempts.admissions, payloads: attempts.payloads, runs: attempts.runs,
      ruling: attempts.ruling, rulingsJournal: attempts.rulingsJournal },
    note: 'read-only dry run; F4 still stops the real line until a disposition is committed' }, null, 2));
  return ok ? 0 : 2;
}

function main(argv) {
  const args = parse(argv);
  if (args.data) return dataMode(args);
  if (args.draft) return draftMode(args);
  if (args.check) return checkMode(args);
  if (args.proof) return proofMode(args);
  if (args.retained) return retainedMode();
  if (args.history) return historyMode(args);
  throw new Error('one of --data, --proof, --retained, --draft, --check, --history');
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.log('ms18d-epoch3-proof error: ' + (err && err.message));
  process.exitCode = 3;
}
