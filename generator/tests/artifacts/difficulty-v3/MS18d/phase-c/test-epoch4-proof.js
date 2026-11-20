#!/usr/bin/env node
'use strict';

/*
 * MS18d epoch-4 (B4: the owner-approved a3 exceptions) task-owned FILE-ONLY proof tooling, modeled on
 * test-epoch3-proof.js (which stays as it was). It computes the data and the proof the base-4 record
 * (tasks/difficulty-v3/MS18d-gp-campaign-base-4.jsonl) cites with the very functions the check-only merger
 * uses, and the read-only pre-launch check of an a3. It writes nothing but the one new file --out names,
 * never a run folder, a ledger, the C log, a journal or a manifest; it reads Git (read-only) and files.
 * The subset S is never named here: it comes from the owner selectors read AT the owner commit
 * (--owner-commit, the FULL id of the commit that adds them) and the V2 manifest's own `admissionExceptions`.
 *
 *   --build-v2 --v1=<V1 manifest> --owner-commit=<full id> --out=<new V2 manifest file>
 *       reads the owner selectors at the owner commit (never HEAD), resolves S, builds the V2 in memory and
 *       writes it (CRLF, like V1) to a NEW file; prints the hashes. Nothing is written when S is empty
 *   --data --h3=<helper manifest of epoch 3> --h4=<helper manifest of epoch 4> [--out=<file>]
 *       the exact change list of the two manifests under the EXACT-path allowlist of epoch 4 (six helpers,
 *       five tests, the V2 plan file added), the identical count and the problems (exit 2 when not allowed)
 *   --delta --v1=<V1 manifest> --v2=<V2 manifest> [--out=<file>]
 *       the exact V1 -> V2 proof for S: the V2 is exactly the permitted delta of the V1 (parent, exceptions,
 *       appended a3 slots, counts), and the owner selectors at the commit its references cite grant exactly
 *       its exceptions (every candidate resolved, never a missing or ambiguous reply taken as B). Exit 2
 *       when anything differs
 *   --proof --b4=<commit> --h3=<file> --h4=<file> --out=<proof file>
 *       the transition proof of merge-core.js (ancestry B3 -> checkpoint -> B4, the committed B3 -> B4 diff,
 *       the change list), written with CRLF: its SHA-256 is the digest the record cites
 *   --retained
 *       the complete runs of the real run base judged under the declared pairs up to B3 (record 3): the
 *       retained successes tagged with their epoch, every hold, the requests
 *   --draft --b4=<commit> --h3=<file> --h4=<file> --proof=<proof file> --v1=<file> --v2=<file> [--out=<file>]
 *       the one-line base-4 record with every field the merger validates computed from B4 and the
 *       checkpoint; printed, and written (CRLF) only when --out names a new file. `reviews`, `suites`, the
 *       time and the real review references are the orchestrator's: a draft is provisional, never authority
 *   --check --b4=<commit> --h4=<file> [--record=<draft file>] [--plan=<V2 manifest>]
 *       the chain of base records as the final merge reads it at B4 (merge-gp.js epochsOf, real Git): the
 *       committed records at HEAD, or, with --record, a DRAFT of the base-4 record not committed yet (a dry
 *       run), and the retained successes against the real run folders. Exit 0 valid, 2 invalid
 *   --preview --b4=<commit> --h4=<file> [--record=<draft file>] [--plan=<V2 manifest>]
 *       the evaluation of the final merge, read-only: the complete cells (76 + k), the requests
 *       (3,800 + 50 k) and the holds (every hold still a hold), without a report
 *   --history --chunk=<id> [--attempt=<n>] [--plan=<manifest>] [--base=<commit>] [--expect=allow|refuse]
 *       the pre-launch dry run, read-only: release-history.js over the wrapper's exact sources and
 *       attempts.js chunkAttempts for the slot of the chunk with the exception its manifest declares (an
 *       a3 needs the V2). `--attempt=3 --expect=allow` under B4 before each a3. It never admits anything:
 *       F4/F2, the readiness and the status checks of the wrapper stay in force
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
const { manifestText } = require('./make-chunk-manifest.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const PLAN1_REL = 'docs\\difficulty-v3\\evidence\\MS18d\\phase-c\\gp-chunk-manifest.json';
const PLAN2_REL = core.V2_PLAN_REL.replace(/\//g, '\\');
const RUN_BASE_REL = 'docs/difficulty-v3/evidence/MS18d/gp';
const STEP = core.EPOCH_STEPS[4];
// where the wording of each owner question is recorded in the pack (the section is a heading of the file).
// Q2 and Q3 keep their wording at the owner commit; Q4's exact posted wording was archived later, by the pack
// commit W, in a section whose text fence (joined with LF) has the recorded SHA-256
const WORDING = [
  { decisionId: 'S-OD16', question: 'MS18d-Q2',
    file: 'tasks/difficulty-v3/MS18d-epoch3-release-history-repair.md',
    section: 'Exact owner question for Discord' },
  { decisionId: 'S-OD17', question: 'MS18d-Q3',
    file: 'tasks/difficulty-v3/MS18d-hyper-hard-holds-and-scheduling.md',
    section: 'Owner question — separate MS18d-Q3' },
  { decisionId: 'S-OD18', question: 'MS18d-Q4', file: 'tasks/difficulty-v3/MS18d-gate-wide-stability.md',
    section: 'Exact MS18d-Q4 wording', commit: 'd0b746bbcb1cf698b20b89804093991f4e977ded',
    messageId: '1573073374584774872',
    fenceSha256: '3f96aa3d29674375cdbd52532c2275ae030ea7b8ec1a7783bc36f21e89b123f7' }];

function parse(argv) {
  const out = {};
  argv.forEach((arg) => {
    const m = /^--([a-z0-9-]+)(?:=(.*))?$/.exec(arg);
    if (!m || out[m[1]] !== undefined) throw new Error('unknown or repeated argument: ' + arg);
    out[m[1]] = m[2] === undefined ? true : m[2];
  });
  return out;
}

const readAt = (repo, file) => fs.readFileSync(path.resolve(repo, file));
const json = (bytes) => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const fwd = (file) => String(file).replace(/\\/g, '/');

/** A committed base record at HEAD: { record, text }. */
function committedRecord(git, n) {
  const step = core.EPOCH_STEPS[n];
  const text = String(git(['show', 'HEAD:' + step.recordRel]));
  const parsed = core.parseEpochRecord(text, step.label);
  if (parsed.problems.length > 0) throw new Error(parsed.problems[0]);
  return { record: parsed.record, text };
}

/** The change list of two manifest files under the exact-path allowlist of epoch 4. */
function manifestData(repo, h3File, h4File) {
  const b3 = readAt(repo, h3File);
  const b4 = readAt(repo, h4File);
  const m3 = core.parseHelperManifest(b3.toString('utf8'));
  const m4 = core.parseHelperManifest(b4.toString('utf8'));
  const t = core.manifestTransition(m3, m4, STEP.production, STEP.tests, STEP.dataFiles, STEP.addedTests);
  return { m3, m4, transition: t,
    previousHelperManifest: { file: fwd(h3File), sha256: sha256(b3), entries: m3.entries.size },
    helperManifest: { file: fwd(h4File), sha256: sha256(b4), entries: m4.entries.size },
    problems: m3.problems.concat(m4.problems, t.problems) };
}

function writeExclusive(file, text) {
  const bytes = Buffer.from(CRLF(text) + '\r\n', 'utf8');
  fs.writeFileSync(file, bytes, { flag: 'wx' });
  return sha256(bytes);
}

/**
 * The exact V1 -> V2 proof for S from the file bytes and the text of the owner records AT the owner commit:
 * nothing is read from disk here. { ok, problems, subset, m, declined, unresolved, ownerCommit, v1, v2,
 * expected }.
 */
function deltaReport(v1Bytes, v2Bytes, ownerText) {
  const v1 = json(v1Bytes);
  const v2 = json(v2Bytes);
  const delta = plan.v2DeltaProblems(v2, v1, sha256(v1Bytes));
  const parsed = plan.parseOwnerSelectors(ownerText);
  const authority = parsed.problems.concat(plan.v2AuthorityProblems(v2, parsed.entries));
  const commit = plan.ownerCommitOf(v2);
  const res = plan.resolveSubset(parsed.entries, commit === null ? undefined : commit);
  const m = plan.subsetOf(v2).length;
  return { schema: 'ms18d-gp-v2-delta-proof-v1', ok: delta.length === 0 && authority.length === 0,
    problems: delta.concat(authority), subset: plan.subsetOf(v2), m, declined: res.declined,
    unresolved: res.unresolved, ownerCommit: commit,
    v1: { rawSha256: sha256(v1Bytes), manifestSha256: v1.manifestSha256, runSlots: v1.runSlots.length },
    v2: { rawSha256: sha256(v2Bytes), manifestSha256: v2.manifestSha256, runSlots: v2.runSlots.length,
      requests: v2.counts && v2.counts.requests, cells: v2.counts && v2.counts.cells },
    expected: { runSlots: v1.runSlots.length + m, requests: v1.counts.requests } };
}

/** The owner records as committed at `commit` (a FULL id): the text of the pack file there, never at HEAD. */
function ownerTextAt(git, commit) {
  if (!/^[0-9a-f]{40}$/.test(String(commit))) throw new Error('the owner commit is not a full 40-hex id');
  return String(git(['show', commit + ':' + plan.OWNER_FILE]));
}

/**
 * The pointer to the wording of one owner question: { file, section, commit }, proven at `spec.commit` (else
 * `commit`): the file has the heading once and the question id is in the heading or its section. When the
 * spec records the archived text (`messageId`, `fenceSha256`), the section names that message and its text
 * fence, joined with LF, has exactly that SHA-256. Throws on any difference.
 */
function wordingOf(git, commit, spec) {
  const at = spec.commit || commit;
  const lines = String(git(['show', at + ':' + spec.file])).split(/\r?\n/);
  const heads = [];
  lines.forEach((l, i) => {
    const m = /^(#{1,6})\s+(.*?)\s*$/.exec(l);
    if (m) heads.push({ i, level: m[1].length, text: m[2] });
  });
  const mine = heads.filter((h) => h.text === spec.section);
  if (mine.length !== 1) throw new Error(spec.file + ' has no unique section "' + spec.section + '"');
  const next = heads.filter((h) => h.i > mine[0].i && h.level <= mine[0].level)[0];
  const section = lines.slice(mine[0].i, next ? next.i : lines.length);
  const body = section.join('\n');
  if (body.indexOf(spec.question) === -1) {
    throw new Error('the section "' + spec.section + '" does not mention ' + spec.question);
  }
  if (spec.messageId !== undefined && body.indexOf(spec.messageId) === -1) {
    throw new Error('the section "' + spec.section + '" does not name the message ' + spec.messageId);
  }
  if (spec.fenceSha256 !== undefined) {
    const open = section.findIndex((l) => /^`{3,}text\s*$/.test(l));
    const ticks = open < 0 ? null : /^(`{3,})/.exec(section[open])[1];
    const close = open < 0 ? -1 : section.findIndex((l, i) => i > open && l.trim() === ticks);
    if (open < 0 || close < 0) throw new Error('the section "' + spec.section + '" has no text fence');
    const text = section.slice(open + 1, close).join('\n');
    if (sha256(Buffer.from(text, 'utf8')) !== spec.fenceSha256) {
      throw new Error('the text fence of "' + spec.section + '" does not hash to ' + spec.fenceSha256);
    }
  }
  return { file: spec.file, section: spec.section, commit: at };
}

/**
 * The base-4 `ownerDecisions`: for each candidate the selector exactly as committed at `commit`, with the
 * S-OD id, the reference (anchored to `commit`) and the pointer to the question wording in front (the source
 * fields are untouched). `wordings` is the table of the question wordings (default WORDING).
 */
function ownerDecisionsAt(git, commit, wordings) {
  const parsed = plan.parseOwnerSelectors(ownerTextAt(git, commit));
  if (parsed.problems.length > 0) throw new Error(parsed.problems[0]);
  return plan.CANDIDATES.map((cand) => {
    const entry = parsed.entries.filter((e) => e.id === cand.decisionId)[0];
    if (!entry) throw new Error(cand.decisionId + ' is not in the owner records at ' + commit);
    const spec = (wordings || WORDING).filter((w) => w.decisionId === cand.decisionId)[0];
    return Object.assign({ id: cand.decisionId, ref: plan.ownerRefOf(commit, cand.decisionId),
      questionWording: wordingOf(git, commit, spec) }, entry.selector);
  });
}

function dataMode(args) {
  const d = manifestData(REPO, args.h3, args.h4);
  const doc = { schema: 'ms18d-gp-epoch-4-transition-data-v1',
    previousHelperManifest: d.previousHelperManifest, helperManifest: d.helperManifest,
    allowedHelperChanges: d.transition.changes, identicalEntries: d.transition.identical,
    problems: d.problems };
  if (args.out) doc.outputSha256 = writeExclusive(path.resolve(REPO, args.out), JSON.stringify(doc, null, 2));
  console.log(JSON.stringify(doc, null, 2));
  return d.problems.length === 0 ? 0 : 2;
}

function buildV2Mode(args) {
  const git = gitReader(REPO);
  const commit = String(args['owner-commit']);
  const v1Bytes = readAt(REPO, args.v1);
  const v1 = json(v1Bytes);
  const parsed = plan.parseOwnerSelectors(ownerTextAt(git, commit));
  if (parsed.problems.length > 0) throw new Error(parsed.problems[0]);
  const res = plan.resolveSubset(parsed.entries, commit);
  if (res.unresolved.length > 0) {
    throw new Error('unresolved: ' + res.unresolved.map((u) => 'Q' + u.question + ' ' + u.reason).join('; '));
  }
  const v2 = plan.buildManifestV2(v1, { file: fwd(args.v1), rawSha256: sha256(v1Bytes) }, res.granted);
  if (v2 === null) throw new Error('S is empty: there is no V2');
  const text = manifestText(v2);
  const bytes = Buffer.from(text, 'utf8');
  const proof = deltaReport(v1Bytes, bytes, ownerTextAt(git, commit));
  if (!proof.ok) throw new Error('the built V2 is not the exact delta: ' + proof.problems.join('; '));
  fs.writeFileSync(path.resolve(REPO, args.out), bytes, { flag: 'wx' });
  console.log(JSON.stringify({ written: fwd(args.out), subset: proof.subset, delta: proof }, null, 2));
  return 0;
}

function deltaMode(args) {
  const v2Bytes = readAt(REPO, args.v2);
  const commit = plan.ownerCommitOf(json(v2Bytes));
  const report = deltaReport(readAt(REPO, args.v1), v2Bytes,
    commit === null ? '' : ownerTextAt(gitReader(REPO), commit));
  if (report.ok && args.out) {
    report.outputSha256 = writeExclusive(path.resolve(REPO, args.out), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
  return report.ok ? 0 : 2;
}

function proofMode(args) {
  const git = gitReader(REPO);
  const b4 = String(args.b4);
  const { record: r3 } = committedRecord(git, 3);
  const prev = { base: r3.campaignBase, checkpoint: core.EPOCH3_CHECKPOINT };
  const d = manifestData(REPO, args.h3, args.h4);
  const problems = d.problems.slice();
  if (!/^[0-9a-f]{40}$/.test(b4)) problems.push('--b4 is not a full commit id');
  if (d.previousHelperManifest.sha256 !== r3.helperManifest.sha256) {
    problems.push('--h3 is not the declared manifest of epoch 3');
  }
  [[prev.base, prev.checkpoint], [prev.checkpoint, b4]].forEach(([a, b]) => {
    try {
      git(['merge-base', '--is-ancestor', a, b]);
    } catch (err) {
      problems.push(a + ' is not an ancestor of ' + b);
    }
  });
  let names = [];
  try {
    names = core.diffEntries(git, prev.base, b4);
    core.transitionDiffProblems(names, d.transition.changes, LEDGER).forEach((p) => problems.push(p));
  } catch (err) {
    problems.push('the B3 -> B4 diff cannot be read: ' + err.message);
  }
  const proof = { schema: STEP.proofSchema, previousBase: prev.base, checkpoint: prev.checkpoint,
    campaignBase: b4, previousHelperManifestSha256: d.previousHelperManifest.sha256,
    helperManifestSha256: d.helperManifest.sha256, changes: d.transition.changes,
    identicalEntries: d.transition.identical,
    committedDiff: names.map((n) => n.status + ' ' + fwd(n.file)).sort() };
  const result = { proof, problems, previousHelperManifest: d.previousHelperManifest,
    helperManifest: d.helperManifest };
  if (problems.length === 0 && args.out) {
    result.proofFile = fwd(args.out);
    result.proofSha256 = writeExclusive(path.resolve(REPO, args.out), JSON.stringify(proof, null, 2));
  }
  console.log(JSON.stringify(result, null, 2));
  return problems.length === 0 ? 0 : 2;
}

/** The context of a merge at the base of epoch 3 (B3, the V1 plan): the committed pairs up to it. */
function contextAtEpoch3(repo, git) {
  const { record: r3 } = committedRecord(git, 3);
  const h3 = path.resolve(repo, r3.helperManifest.file);
  const planBytes = readAt(repo, PLAN1_REL);
  return { r3, ctx: { standin: false, repo, base: r3.campaignBase, doc: json(planBytes),
    helperSha: sha256(fs.readFileSync(h3)), planRawSha256: sha256(planBytes), args: { plan: PLAN1_REL },
    request: { plan: { file: PLAN1_REL, rawSha256: sha256(planBytes) }, helpers: { manifestFile: h3 } } } };
}

/** The complete runs of the real run base under the V1 pairs up to B3, judged as the merger judges them. */
function judgeRetained(repo, git) {
  const { r3, ctx } = contextAtEpoch3(repo, git);
  const doc = ctx.doc;
  const problems = plan.verifyManifest(doc);
  if (problems.length > 0) throw new Error('the plan is unsound: ' + problems[0]);
  const info = mergeGp.epochsOf(ctx, git);
  const bindingJournal = mergeGp.bindingJournalOf({ standin: false, request: {}, base: r3.campaignBase },
    git, null);
  const epochs = core.buildEpochs(doc, info.pairs, git, LEDGER);
  const retained = [];
  const others = [];
  let requests = 0;
  doc.runSlots.filter((s) => s.role === 'chunk').forEach((slot) => {
    const dir = path.join(repo, slot.dir);
    if (!fs.existsSync(dir)) return;
    const chunk = doc.chunks.filter((c) => c.chunkId === slot.chunkId)[0];
    const verdict = core.judgeRun(core.readRunFolder(dir), { doc, slot, chunk, epochs, realRun: true,
      planRel: PLAN1_REL, bindingJournal });
    if (verdict.status === 'complete') {
      retained.push({ chunkId: slot.chunkId, runId: slot.runId, ledgerSha256: verdict.ledgerSha256,
        epoch: verdict.epoch.id });
      requests += chunk.n;
    } else others.push({ runId: slot.runId, status: verdict.status, problems: verdict.problems.slice(0, 5) });
  });
  return { doc, retained, others, requests, pairs: info.pairs, r3 };
}

function retainedMode() {
  const git = gitReader(REPO);
  const { doc, retained, others, requests, pairs } = judgeRetained(REPO, git);
  const cells = new Set(doc.chunks.filter((c) => retained.some((r) => r.chunkId === c.chunkId))
    .map((c) => c.cell));
  const complete = Array.from(cells).filter((cell) => doc.chunks.filter((c) => c.cell === cell)
    .every((c) => retained.some((r) => r.chunkId === c.chunkId)));
  const perEpoch = {};
  retained.forEach((r) => { perEpoch[r.epoch] = (perEpoch[r.epoch] || 0) + 1; });
  console.log(JSON.stringify({ pairs, retained: retained.length, perEpoch, requests,
    completeCells: complete.length, holds: others.filter((o) => o.status === 'hold').map((o) => o.runId),
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

/**
 * One journal of the pack as committed at `commit`: the blob id, entry count, byte length and SHA-256 of that
 * very version (git blob content bytes, no newline conversion).
 */
function journalAt(git, commit, rel) {
  const text = String(git(['show', commit + ':' + rel]));
  const bytes = Buffer.from(text, 'utf8');
  return { file: rel, commit, blob: String(git(['rev-parse', commit + ':' + rel])).trim(),
    hashOf: 'git blob content bytes at B4',
    entryCount: text.split(/\r?\n/).filter((l) => l.trim() !== '').length,
    blobBytes: bytes.length, blobSha256: sha256(bytes) };
}

/**
 * What the base-4 record retains of the campaign up to the checkpoint: every complete ledger with its epoch,
 * every hold, the pre-window event, the git tree id of EVERY retained folder (successes and holds) at the
 * checkpoint, the identity of the C log at the checkpoint and the tree of the run base there. Every byte
 * comparison uses ONE declared representation: git blob content bytes, never the checkout (the log of the
 * checkpoint must be a byte prefix of the log at B4). Later, a retained folder is compared with its
 * checkpoint tree id, never the whole run base (it grows). `judged` = judgeRetained(); `b4` the commit the
 * retained folders and the log are read at. { evidence, problems }.
 */
function retainedEvidenceAt(git, judged, b4) {
  const chk = core.EPOCH3_CHECKPOINT;
  const problems = [];
  const tree = (commit, rel) => String(git(['rev-parse', commit + ':' + rel])).trim();
  const atChk = String(git(['show', chk + ':' + LEDGER]));
  if (!String(git(['show', b4 + ':' + LEDGER])).startsWith(atChk)) {
    problems.push('the C lock log at B4 does not keep the checkpoint log as a prefix (git blob bytes)');
  }
  const logLines = atChk.split(/\r?\n/).filter((l) => l.trim() !== '');
  const blob = Buffer.from(atChk, 'utf8');
  const events = judged.r3.retainedEvidence.skippedEvents;
  events.forEach((event) => {
    let row = null;
    try {
      row = JSON.parse(logLines[event.line - 1]);
    } catch (err) {
      row = null;
    }
    if (!row || row.type !== event.type) {
      problems.push('the pre-window event is not line ' + event.line + ' of the checkpoint C lock log');
    }
  });
  const holds = judged.others.filter((o) => o.status === 'hold').map((o) => o.runId);
  judged.others.filter((o) => o.status !== 'hold').forEach((o) => {
    problems.push(o.runId + ' is neither a complete run nor a hold (' + o.status + ')');
  });
  const dirOf = (runId) => judged.doc.runSlots.filter((s) => s.runId === runId)[0].dir;
  const folders = (ids) => {
    const out = {};
    ids.forEach((id) => {
      out[id] = tree(chk, dirOf(id));
      if (tree(b4, dirOf(id)) !== out[id]) {
        problems.push(id + ': the folder at B4 is not that of the checkpoint');
      }
    });
    return out;
  };
  const successFolders = folders(judged.retained.map((r) => r.runId));
  const holdFolders = folders(holds);
  return { problems, evidence: { checkpoint: chk, successes: judged.retained, holds,
    cLog: { file: LEDGER, lines: logLines.length, blob: tree(chk, LEDGER), blobBytes: blob.length,
      blobSha256: sha256(blob), hashOf: 'git blob content bytes at the checkpoint' },
    skippedEvents: events, treesOf: 'git tree ids of the folders at the checkpoint', successFolders,
    holdFolders, gpTree: { commit: chk, path: RUN_BASE_REL, tree: tree(chk, RUN_BASE_REL) } } };
}

function draftMode(args) {
  const git = gitReader(REPO);
  const b4 = String(args.b4);
  const d = manifestData(REPO, args.h3, args.h4);
  const r = judgeRetained(REPO, git);
  const v1Bytes = readAt(REPO, args.v1);
  const v2Bytes = readAt(REPO, args.v2);
  const v2 = json(v2Bytes);
  const commit = plan.ownerCommitOf(v2);
  if (commit === null) throw new Error('the V2 owner references do not cite one full commit');
  const delta = deltaReport(v1Bytes, v2Bytes, ownerTextAt(git, commit));
  const kept = retainedEvidenceAt(git, r, b4);
  const problems = d.problems.concat(delta.problems, kept.problems);
  if (d.previousHelperManifest.file !== r.r3.helperManifest.file) {
    problems.push('--h3 is not the manifest file the base-3 record names');
  }
  if (sha256(v1Bytes) !== r.r3.plan.rawSha256) problems.push('--v1 is not the plan the base-3 record names');
  let transitionProof = null;
  if (typeof args.proof === 'string') {
    transitionProof = { file: fwd(args.proof), sha256: sha256(readAt(REPO, args.proof)) };
  } else problems.push('no --proof: the transition proof is not cited');
  const record = { schema: STEP.schema, campaignBase: b4, previousBase: r.r3.campaignBase,
    campaignRoot: core.EPOCH1.base, checkpoint: core.EPOCH3_CHECKPOINT,
    reason: 'Owner-approved exceptional third admissions (a3) for ' + plan.subsetOf(v2).join(', ') +
      ' (S-OD16, S-OD17, S-OD18); two admissions each were spent on proven-unstarted holds, no failed ' +
      'measurement',
    recordedAt: stamp(new Date()), recordedBy: 'orchestrator',
    previousHelperManifest: Object.assign({ hashOf: 'checkout bytes' }, d.previousHelperManifest),
    helperManifest: Object.assign({ hashOf: 'checkout bytes' }, d.helperManifest),
    allowedHelperChanges: d.transition.changes, transitionProof,
    previousPlan: { file: r.r3.plan.file, rawSha256: r.r3.plan.rawSha256, rawHashOf: 'checkout bytes',
      manifestSha256: r.r3.plan.manifestSha256 },
    plan: { file: fwd(args.v2), rawSha256: sha256(v2Bytes), rawHashOf: 'checkout bytes',
      manifestSha256: v2.manifestSha256 },
    ownerDecisionCommit: commit, ownerDecisions: ownerDecisionsAt(git, commit),
    admissionExceptions: v2.admissionExceptions, exceptionOrder: v2.admissionExceptions.map((e) => e.runId),
    retainedEvidence: kept.evidence,
    identities: r.r3.identities, environment: r.r3.environment, policy: r.r3.policy,
    journals: { hostBindings: journalAt(git, b4, 'tasks/difficulty-v3/MS18d-gp-host-bindings.jsonl'),
      rulings: journalAt(git, b4, 'tasks/difficulty-v3/MS18d-gp-rulings.jsonl'),
      describes: 'B4 ' + b4.slice(0, 8) + ', the journals as committed there' },
    cutover: { successes: r.retained.length, requests: r.requests,
      nextChunk: v2.admissionExceptions[0].chunkId, nextAttempt: 3 },
    reviews: [], suites: [] };
  const line = JSON.stringify(record);
  if (args.out) writeExclusive(path.resolve(REPO, args.out), line);
  console.log(line);
  if (problems.length > 0) console.log('problems: ' + problems.join('; '));
  return problems.length === 0 ? 0 : 2;
}

/** The context of a merge AT B4 (the V2 plan), for epochsOf: committed records, or a draft (dry run). */
function contextAtEpoch4(repo, git, args) {
  const h4 = path.resolve(repo, String(args.h4));
  const planRel = typeof args.plan === 'string' ? args.plan : PLAN2_REL;
  const planBytes = readAt(repo, planRel);
  const ctx = { standin: false, repo, base: String(args.b4), doc: json(planBytes),
    helperSha: sha256(fs.readFileSync(h4)), planRawSha256: sha256(planBytes), args: { plan: planRel },
    request: { plan: { file: planRel, rawSha256: sha256(planBytes) }, helpers: { manifestFile: h4 } } };
  let gitFn = git;
  if (typeof args.record === 'string') {
    // a dry run over a draft that is not committed yet: the record text from the file, one commit of it
    ctx.standin = true;
    ctx.request.epoch1 = Object.assign({}, core.EPOCH1);
    ctx.request.epoch4Text = fs.readFileSync(path.resolve(repo, args.record), 'utf8');
    gitFn = (a) => (a[0] === 'rev-list' && a.indexOf(STEP.recordRel) !== -1 ? '1\n' : git(a));
  }
  return { ctx, git: gitFn };
}

function checkMode(args) {
  const real = gitReader(REPO);
  const { ctx, git } = contextAtEpoch4(REPO, real, args);
  let info;
  try {
    info = mergeGp.epochsOf(ctx, git);
  } catch (err) {
    console.log(JSON.stringify({ ok: false, problem: err.message }, null, 2));
    return 2;
  }
  const now = judgeRetained(REPO, real).retained;
  const kept = info.record ? core.retainedOf(info.record) : [];
  const same = plan.canonicalJson(now) === plan.canonicalJson(kept);
  console.log(JSON.stringify({ ok: same, dryRun: ctx.standin, pairs: info.pairs,
    records: info.records.map((x) => ({ epoch: x.epoch, file: x.file, sha256: x.sha256 })),
    subset: plan.subsetOf(ctx.doc), retainedSuccesses: kept.length, retainedMatchTheRunFolders: same },
  null, 2));
  return same ? 0 : 2;
}

/** The run folders of a repository as collectRunFolders reads them. */
const repoFs = (repo) => ({
  listDir: (rel) => (fs.existsSync(path.join(repo, rel)) ? fs.readdirSync(path.join(repo, rel),
    { withFileTypes: true }).map((e) => ({ name: e.name, dir: e.isDirectory() })) : []),
  exists: (rel) => fs.existsSync(path.join(repo, rel)),
  readDir: (rel) => core.readRunFolder(path.join(repo, rel)) });

/**
 * The evaluation of the final all-79 merge, read-only and without a report: complete cells (76 + k), the raw
 * requests they carry (3,800 + 50 k) and every hold. `env`: { repo, doc, epochs (core.buildEpochs), planRel,
 * bindingJournal }.
 */
function previewReport(env) {
  const folders = core.collectRunFolders(env.doc, { type: 'all' }, repoFs(env.repo));
  const ev = core.evaluate({ doc: env.doc, scope: { type: 'all' }, runFolders: folders.folders,
    epochs: env.epochs, realRun: env.realRun !== false, planRel: env.planRel,
    bindingJournal: env.bindingJournal });
  const done = ev.cells.filter((c) => c.complete && c.stats);
  const holds = [];
  ev.cells.forEach((c) => (c.chunks || []).forEach((d) => (d.holdRuns || [])
    .forEach((id) => holds.push(id))));
  const problems = ev.problems.concat(folders.problems);
  return { schema: 'ms18d-gp-merge-preview-v1', cells: ev.cells.length, completeCells: done.length,
    requests: done.reduce((sum, c) => sum + c.stats.n, 0), holds, complete: ev.complete &&
      folders.problems.length === 0, problems: problems.slice(0, 20), problemCount: problems.length };
}

function previewMode(args) {
  const real = gitReader(REPO);
  const { ctx, git } = contextAtEpoch4(REPO, real, args);
  const info = mergeGp.epochsOf(ctx, git);
  const bindingJournal = mergeGp.bindingJournalOf({ standin: false, request: {}, base: ctx.base }, real,
    null);
  const epochs = core.buildEpochs(ctx.doc, info.pairs, git, LEDGER);
  const report = previewReport({ repo: REPO, doc: ctx.doc, epochs, planRel: ctx.args.plan, bindingJournal });
  console.log(JSON.stringify(report, null, 2));
  return 0;
}

/**
 * The pre-launch dry run, read-only. `env`: { repo, git, doc (the manifest the chunk is read from), chunkId,
 * attempt, base, nowMs }. The exception is the one `doc` declares for the chunk (null for V1 and for every
 * other chunk); an a3 slot must exist in `doc`.
 */
function historyReport(env) {
  const doc = env.doc;
  const chunk = doc.chunks.filter((c) => c.chunkId === env.chunkId)[0];
  if (!chunk) throw new Error('--chunk is no chunk of the plan');
  const runId = chunk.chunkId + '.a' + env.attempt;
  const evidence = path.join(env.repo, 'docs', 'difficulty-v3', 'evidence', 'MS18d');
  const slot = doc.runSlots.filter((s) => s.role === 'chunk' && s.runId === runId)[0] || null;
  const exception = plan.exceptionFor(doc, chunk.chunkId);
  const sources = [
    { label: 'A', file: path.join(evidence, 'lock-log.jsonl'), kind: 'log', required: true },
    { label: 'B', file: path.join(evidence, 'phase-b', 'lock-log.jsonl'), kind: 'log', required: true },
    { label: 'C', file: path.join(evidence, 'phase-c', 'lock-log.jsonl'), kind: 'log', required: false }];
  const h = collectReleases(sources);
  const skipped = {};
  h.files.forEach((f) => { if (f.skippedLines) skipped[f.label] = f.skippedLines; });
  const head = String(env.git(['rev-parse', 'HEAD'])).trim();
  const rulings = journals.rulingsState(env.git, head, env.base || null);
  const attempts = chunkAttempts({ baseDir: path.join(evidence, 'gp', chunk.cell.replace('/', '-')),
    chunkId: chunk.chunkId, runId, ledgerFile: path.join(evidence, 'phase-c', 'lock-log.jsonl'), rulings,
    nowMs: env.nowMs === undefined ? Date.now() : env.nowMs, exception });
  const clean = h.problems.length === 0 && attempts.problems.length === 0 && slot !== null;
  return { clean, head, slot: runId, slotDeclared: slot !== null, exception: exception ? exception.id : null,
    history: { problems: h.problems, releases: h.releases.length,
      latest: h.latest ? { label: h.latest.label, line: h.latest.line, atMs: h.latest.atMs } : null,
      skippedPreWindowLines: skipped },
    attempts: { decision: attempts.decision, reasons: attempts.reasons, problems: attempts.problems,
      admissions: attempts.admissions, payloads: attempts.payloads, runs: attempts.runs,
      ruling: attempts.ruling, rulingsJournal: attempts.rulingsJournal },
    note: 'read-only dry run; F4/F2, the readiness and the status checks of the wrapper stay in force' };
}

function historyMode(args) {
  const git = gitReader(REPO);
  const attempt = args.attempt === undefined ? 1 : Number(args.attempt);
  const planRel = typeof args.plan === 'string' ? args.plan : (attempt === 3 ? PLAN2_REL : PLAN1_REL);
  const doc = json(readAt(REPO, planRel));
  const problems = plan.verifyManifest(doc);
  if (problems.length > 0) throw new Error('the plan is unsound: ' + problems[0]);
  const report = historyReport({ repo: REPO, git, doc, chunkId: String(args.chunk), attempt,
    base: typeof args.base === 'string' ? args.base : null });
  const expected = typeof args.expect === 'string' ? args.expect : null;
  report.ok = report.clean && (expected === null || report.attempts.decision === expected);
  console.log(JSON.stringify(report, null, 2));
  return report.ok ? 0 : 2;
}

function main(argv) {
  const args = parse(argv);
  if (args['build-v2']) return buildV2Mode(args);
  if (args.data) return dataMode(args);
  if (args.delta) return deltaMode(args);
  if (args.draft) return draftMode(args);
  if (args.check) return checkMode(args);
  if (args.preview) return previewMode(args);
  if (args.proof) return proofMode(args);
  if (args.retained) return retainedMode();
  if (args.history) return historyMode(args);
  throw new Error('one of --build-v2, --data, --delta, --proof, --retained, --draft, --check, --preview, ' +
    '--history');
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.log('ms18d-epoch4-proof error: ' + (err && err.message));
    process.exitCode = 3;
  }
}

module.exports = { parse, main, manifestData, deltaReport, historyReport, previewReport, committedRecord,
  contextAtEpoch4, ownerTextAt, ownerDecisionsAt, wordingOf, retainedEvidenceAt, journalAt, WORDING,
  PLAN1_REL, PLAN2_REL };
