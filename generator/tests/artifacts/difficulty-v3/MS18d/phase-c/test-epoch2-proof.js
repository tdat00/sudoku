#!/usr/bin/env node
'use strict';

/*
 * MS18d epoch-2 transport repair (B2) task-owned tooling: the data and the proof file that the base-2 record
 * (tasks/difficulty-v3/MS18d-gp-campaign-base-2.jsonl) cites, computed with the very functions the check-only
 * merger uses (merge-core.js), and the read-only validation of the checkpointed epoch-1 records. It writes
 * nothing but the one file --out names, never a run folder, never a ledger, never the C log; it reads Git
 * (read-only commands) and the repository files.
 *
 *   --data --h1=<helper manifest of epoch 1> --h2=<helper manifest of epoch 2> [--out=<file>]
 *       the exact change list of the two manifests (path, class, before/after SHA-256), the number of
 *       byte-identical entries and the problems (exit 2 when a difference is not allowed)
 *   --proof --b2=<commit> --h1=<file> --h2=<file> --out=<proof file>
 *       the transition proof of merge-core.js (ancestry B1 -> checkpoint -> B2, the committed B1 -> B2 diff,
 *       the change list, the identical count), written with CRLF and a final CRLF: the SHA-256 of the file as
 *       written (the checkout bytes) is the digest the record cites. Exit 2 when anything is not allowed.
 *   --retained
 *       the complete epoch-1 runs of the real run base judged by the merger's own checks against the declared
 *       pair (B1, H1) only: the retained successes { chunkId, runId, ledgerSha256 } for the base-2 record,
 *       and the problems of every other declared slot (a run that is not complete). Read-only.
 *   --draft --b2=<commit> --h1=<file> --h2=<file> --proof=<proof file> [--out=<file>]
 *       the one-line base-2 record with every field the merger validates computed (the change list, the
 *       proof digest, the retained successes, the plan, identities, environment and policy copied from the
 *       base record), for the orchestrator to review, complete (`reviews`, `suites`) and commit. Printed, and
 *       written (CRLF) only when --out names a new file.
 *   --check --b2=<commit> --h2=<file> [--record=<draft file>]
 *       the base-2 record as the final merge reads it (merge-gp.js epochsOf, the very code, real Git): the
 *       committed record at HEAD, or, with --record, a DRAFT file that is not committed yet (a dry run: the
 *       one-commit rule is taken as met), and its retained successes against the real run folders. Run the
 *       dry run before the record is committed (a committed record is never edited) and the plain check
 *       after. Exit 0 valid, 2 invalid (the reason is printed).
 */
const fs = require('fs');
const path = require('path');
const core = require('./merge-core.js');
const mergeGp = require('./merge-gp.js');
const plan = require('./plan-data.js');
const { gitReader } = require('./source-io.js');
const { LEDGER } = require('./source-binding.js');
const { sha256, CRLF } = require('./common.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const PLAN_REL = 'docs\\difficulty-v3\\evidence\\MS18d\\phase-c\\gp-chunk-manifest.json';
const BASE1_RECORD_REL = 'tasks/difficulty-v3/MS18d-gp-campaign-base.jsonl';

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

/** The change list of two manifest files and what is needed to cite them. */
function manifestData(h1File, h2File) {
  const b1 = read(h1File);
  const b2 = read(h2File);
  const m1 = core.parseHelperManifest(b1.toString('utf8'));
  const m2 = core.parseHelperManifest(b2.toString('utf8'));
  const t = core.manifestTransition(m1, m2);
  return { m1, m2, transition: t, previousHelperManifest: { file: h1File.replace(/\\/g, '/'),
    sha256: sha256(b1), entries: m1.entries.size },
  helperManifest: { file: h2File.replace(/\\/g, '/'), sha256: sha256(b2), entries: m2.entries.size },
  problems: m1.problems.concat(m2.problems, t.problems) };
}

function writeExclusive(file, text) {
  const bytes = Buffer.from(CRLF(text) + '\r\n', 'utf8');
  fs.writeFileSync(file, bytes, { flag: 'wx' });
  return sha256(bytes);
}

function dataMode(args) {
  const d = manifestData(args.h1, args.h2);
  const doc = { schema: 'ms18d-gp-epoch-2-transition-data-v1',
    previousHelperManifest: d.previousHelperManifest, helperManifest: d.helperManifest,
    allowedHelperChanges: d.transition.changes,
    identicalEntries: d.transition.identical, problems: d.problems };
  const text = JSON.stringify(doc, null, 2);
  if (args.out) doc.outputSha256 = writeExclusive(path.resolve(REPO, args.out), text);
  console.log(JSON.stringify(doc, null, 2));
  return d.problems.length === 0 ? 0 : 2;
}

function proofMode(args) {
  const git = gitReader(REPO);
  const e1 = core.EPOCH1;
  const b2 = String(args.b2);
  const d = manifestData(args.h1, args.h2);
  const problems = d.problems.slice();
  if (!/^[0-9a-f]{40}$/.test(b2)) problems.push('--b2 is not a full commit id');
  if (d.previousHelperManifest.sha256 !== e1.helperManifestSha256) {
    problems.push('--h1 is not the declared manifest of epoch 1');
  }
  [[e1.base, e1.checkpoint], [e1.checkpoint, b2]].forEach(([a, b]) => {
    try {
      git(['merge-base', '--is-ancestor', a, b]);
    } catch (err) {
      problems.push(a + ' is not an ancestor of ' + b);
    }
  });
  let names = [];
  try {
    names = core.diffEntries(git, e1.base, b2);
    core.transitionDiffProblems(names, d.transition.changes, LEDGER).forEach((p) => problems.push(p));
  } catch (err) {
    problems.push('the B1 -> B2 diff cannot be read: ' + err.message);
  }
  const proof = { schema: core.PROOF_SCHEMA, previousBase: e1.base, checkpoint: e1.checkpoint,
    campaignBase: b2, previousHelperManifestSha256: d.previousHelperManifest.sha256,
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

/** The complete runs of the real run base, judged exactly as the merger judges an epoch-1 run. */
function judgeRetained() {
  const git = gitReader(REPO);
  const e1 = core.EPOCH1;
  const doc = JSON.parse(read(PLAN_REL).toString('utf8').replace(/^\uFEFF/, ''));
  const problems = plan.verifyManifest(doc);
  if (problems.length > 0) throw new Error('the plan is unsound: ' + problems[0]);
  const bindingJournal = mergeGp.bindingJournalOf({ standin: false, request: {}, base: e1.base }, git, null);
  const epochs = core.buildEpochs(doc, [{ id: 1, base: e1.base,
    helperManifestSha256: e1.helperManifestSha256 }], git, LEDGER);
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
      retained.push({ chunkId: slot.chunkId, runId: slot.runId, ledgerSha256: verdict.ledgerSha256 });
      requests += chunk.n;
    } else others.push({ runId: slot.runId, status: verdict.status, problems: verdict.problems.slice(0, 5) });
  });
  return { doc, retained, others, requests };
}

function retainedMode() {
  const e1 = core.EPOCH1;
  const { doc, retained, others, requests } = judgeRetained();
  const cells = new Set(doc.chunks.filter((c) => retained.some((r) => r.chunkId === c.chunkId))
    .map((c) => c.cell));
  const complete = Array.from(cells).filter((cell) => doc.chunks.filter((c) => c.cell === cell)
    .every((c) => retained.some((r) => r.chunkId === c.chunkId)));
  console.log(JSON.stringify({ pair: { base: e1.base, helperManifestSha256: e1.helperManifestSha256 },
    retained: retained.length, requests, cellsWithAChunk: cells.size, completeCells: complete.length,
    others, retainedSuccesses: retained }, null, 2));
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
  const e1 = core.EPOCH1;
  const b2 = String(args.b2);
  const d = manifestData(args.h1, args.h2);
  const r = judgeRetained();
  const first = JSON.parse(read(BASE1_RECORD_REL).toString('utf8').replace(/^\uFEFF/, ''));
  const proofFile = String(args.proof).replace(/\\/g, '/');
  const logBytes = fs.readFileSync(path.join(REPO, LEDGER));
  const record = { schema: core.EPOCH2_SCHEMA, campaignBase: b2, previousBase: e1.base,
    checkpoint: e1.checkpoint,
    reason: 'Pre-window freshness starvation in the transport recheck loop; no failed measurement',
    recordedAt: stamp(new Date()), recordedBy: 'orchestrator',
    previousHelperManifest: Object.assign({ hashOf: 'checkout bytes' }, d.previousHelperManifest),
    helperManifest: Object.assign({ hashOf: 'checkout bytes' }, d.helperManifest),
    allowedHelperChanges: d.transition.changes,
    transitionProof: { file: proofFile, sha256: sha256(read(proofFile)) },
    retainedEvidence: { checkpoint: e1.checkpoint, successes: r.retained,
      holds: r.others.filter((o) => o.status === 'hold').map((o) => o.runId),
      cLog: { file: LEDGER, bytes: logBytes.length, sha256: sha256(logBytes) } },
    plan: first.plan, identities: first.identities, environment: first.environment, policy: first.policy,
    journals: { hostBindings: journalState('tasks/difficulty-v3/MS18d-gp-host-bindings.jsonl'),
      rulings: journalState('tasks/difficulty-v3/MS18d-gp-rulings.jsonl') },
    cutover: { successes: r.retained.length, requests: r.requests, nextChunk: 'mega16-easy.i0.n50',
      nextAttempt: 2 },
    reviews: [], suites: [] };
  const line = JSON.stringify(record);
  if (args.out) writeExclusive(path.resolve(REPO, args.out), line);
  console.log(line);
  return d.problems.length === 0 ? 0 : 2;
}

function checkMode(args) {
  const real = gitReader(REPO);
  const h2 = path.resolve(REPO, String(args.h2));
  const planBytes = read(PLAN_REL);
  const doc = JSON.parse(planBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const ctx = { standin: false, repo: REPO, base: String(args.b2), doc,
    helperSha: sha256(fs.readFileSync(h2)),
    request: { plan: { rawSha256: sha256(planBytes) }, helpers: { manifestFile: h2 } } };
  let git = real;
  if (typeof args.record === 'string') {
    // a dry run over a draft that is not committed yet: the record text from the file, one commit of it
    ctx.standin = true;
    ctx.request.epoch1 = Object.assign({}, core.EPOCH1);
    ctx.request.epoch2Text = fs.readFileSync(path.resolve(REPO, args.record), 'utf8');
    git = (a) => (a[0] === 'rev-list' ? '1\n' : real(a));
  }
  let info;
  try {
    info = mergeGp.epochsOf(ctx, git);
  } catch (err) {
    console.log(JSON.stringify({ ok: false, problem: err.message }, null, 2));
    return 2;
  }
  const now = judgeRetained().retained;
  const kept = info.record ? info.record.retainedEvidence.successes : [];
  const same = plan.canonicalJson(now) === plan.canonicalJson(kept);
  console.log(JSON.stringify({ ok: same, dryRun: ctx.standin, pairs: info.pairs, record: info.file,
    recordSha256: info.recordSha256, retainedSuccesses: kept.length, retainedMatchTheRunFolders: same },
  null, 2));
  return same ? 0 : 2;
}

function main(argv) {
  const args = parse(argv);
  if (args.data) return dataMode(args);
  if (args.draft) return draftMode(args);
  if (args.check) return checkMode(args);
  if (args.proof) return proofMode(args);
  if (args.retained) return retainedMode();
  throw new Error('one of --data, --proof, --retained, --draft, --check');
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.log('ms18d-epoch2-proof error: ' + (err && err.message));
  process.exitCode = 3;
}
