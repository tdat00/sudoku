'use strict';

/*
 * MS18d Phase C0b task-owned (R24): the CHECK-ONLY MERGE of the final GP matrix, the part that is pure or
 * reads only run folders. It never generates, never edits a ledger, never fills a gap and never writes a
 * canonical fixture or target (merge-gp.js writes the one report of its own run). Rules, from the R24 plan:
 *   - a chunk counts only through a run folder the frozen manifest DECLARES (R2: the two literal attempt
 *     slots of the chunk), and only when the whole run is complete: the recorder's ledger (exact planned
 *     chunk, n raw finite non-negative times in request order, indices and seeds, identity, no stand-in
 *     provenance) AND the exit-0 transport receipts (request, wrapper, controller result with a complete
 *     classification, pid records with the command exit 0 and zero stderr bytes, the orphan-barrier proof,
 *     admission, acquisition and binding, the completion marker whose size and digest are those of the
 *     ledger, an empty stderr). A killed recorder's apparently complete file is not rescued;
 *   - every planned chunk exactly once; no duplicate, extra, unknown or replacement run: a chunk with a
 *     complete ledger AND an earlier run that started its payload and failed is rejected (no replacement);
 *   - one common identity across the matrix: the manifest, the helpers, the executed sources, E, the table,
 *     Node, the machine, the policy, the campaign base and R5's empty flags. HEADs may differ only under R3
 *     (descendant of the base, only campaign outputs and pack files changed). The only exception is the
 *     declared transport epoch (see the epoch section below): the pair (campaign base, helper manifest) may
 *     be one of TWO declared pairs, each ledger is judged completely against its own pair, and every other
 *     identity field is still common;
 *   - the statistics come from the 50 raw times of a cell, sorted numerically: p50 = sorted[24], p95 =
 *     sorted[47], max = sorted[49], mean = sum in request order / 50, meets = p95 < target (strict,
 *     unrounded). No percentile of a chunk is ever combined. The final gate is 79 complete cells and at
 *     least `requiredSuccesses` (72) cells that meet, by integer comparison;
 *   - the cold-start disclosure: every chunk whose first request is not below sorted[47] (ties included).
 */
const fs = require('fs');
const path = require('path');
const plan = require('./plan-data.js');
const { sha256 } = require('./common.js');
const { MARKER, START, validateLedgerShape, IDENTITY_METHOD } = require('./ledger-schema.js');
const rcore = require('./readiness-core.js');
const journals = require('./journals.js');
const { campaignDiffViolations, LEDGER } = require('./source-binding.js');

const RECORDER_REL = 'tests\\artifacts\\difficulty-v3\\MS18d\\phase-c\\record-gp.js';

/** The command line the transport runs for one chunk of a real run (generator-relative output path). */
function frozenRecorderArgs(planRel, slot) {
  const out = ('..\\' + slot.dir + '\\ledger.json').replace(/\//g, '\\');
  return [RECORDER_REL, '--plan=' + planRel, '--chunk=' + slot.chunkId, '--out=' + out];
}

// a value that is not plain JSON data (a missing member, say) is a difference, never an exception
const same = (a, b) => {
  try {
    return plan.canonicalJson(a) === plan.canonicalJson(b);
  } catch (err) {
    return false;
  }
};

const OWNED_ROLES = ['wrapper', 'controller', 'readiness-probe'];

// ---------------------------------------------------------------------------------------------------------
// Epochs (the B2 transport repair). The campaign has TWO declared (campaign base, helper manifest) pairs and
// no others: epoch 1 = B1 with helpers-c1b (the 22 chunks recorded before the checkpoint), epoch 2 = B2 with
// the repaired helpers (every later chunk). Epoch 2 is declared by ONE never-edited line of the committed
// pack file EPOCH2_RECORD_REL, written after B2 was committed; nothing else adopts an epoch.
// ---------------------------------------------------------------------------------------------------------

const EPOCH1 = Object.freeze({
  id: 1, base: 'a2e6423a52a89dd36ee646aa14706dd2369e087f',
  helperManifestSha256: '5feeb42f31148b086105ac8579d7c3dbfab14193d460fa8a5a0bc05ce95def03', entries: 52,
  manifestRel: 'docs/difficulty-v3/evidence/MS18d/phase-c/helpers-c1b-sha256.txt',
  checkpoint: '4db0114e0acd325a34b29a7741ca8eb75e178813'
});
const EPOCH2_RECORD_REL = 'tasks/difficulty-v3/MS18d-gp-campaign-base-2.jsonl';
const EPOCH2_SCHEMA = 'ms18d-gp-transport-epoch-2-v1';
const PROOF_SCHEMA = 'ms18d-gp-epoch-2-transition-proof-v1';
const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const HELPER_DIR = 'generator/tests/artifacts/difficulty-v3/MS18d/phase-c/';
const PRODUCTION_FILES = ['run-locked-c.ps1', 'merge-core.js', 'merge-gp.js'];
const TEST_CLASS = /^(test|standin)-[A-Za-z0-9._-]+\.(js|ps1)$/;
const PACK_DIR = 'tasks/difficulty-v3/';
const EVIDENCE_DIR = 'docs/difficulty-v3/evidence/MS18d/';

/** A helper manifest (`HASH  path` lines): { entries: Map('/' path -> lower-case hash), problems } */
function parseHelperManifest(text) {
  const entries = new Map();
  const problems = [];
  String(text).split(/\r?\n/).forEach((line, i) => {
    if (line.trim() === '') return;
    const m = /^([0-9A-Fa-f]{64})  (.+)$/.exec(line);
    if (!m) {
      problems.push('manifest line ' + (i + 1) + ' is not "<sha256>  <path>"');
      return;
    }
    const rel = m[2].replace(/\\/g, '/');
    if (entries.has(rel)) problems.push('manifest entry ' + rel + ' twice');
    entries.set(rel, m[1].toLowerCase());
  });
  return { entries, problems };
}

/**
 * The difference of the two helper manifests, which may be ONLY: run-locked-c.ps1, merge-core.js and
 * merge-gp.js (changed, never added or removed) and test-* / standin-* files of the helper folder (changed,
 * added or removed). { changes: [{ path, class, before, after }] sorted by path ('/'), identical (the number
 * of byte-identical entries), problems }.
 */
function manifestTransition(m1, m2) {
  const problems = [];
  const changes = [];
  let identical = 0;
  const all = Array.from(m1.entries.keys()).concat(Array.from(m2.entries.keys()));
  const paths = Array.from(new Set(all)).sort();
  paths.forEach((p) => {
    const before = m1.entries.has(p) ? m1.entries.get(p) : null;
    const after = m2.entries.has(p) ? m2.entries.get(p) : null;
    if (before === after) {
      identical++;
      return;
    }
    const name = p.startsWith(HELPER_DIR) ? p.slice(HELPER_DIR.length) : '';
    let cls = null;
    if (name !== '' && name.indexOf('/') === -1) {
      if (PRODUCTION_FILES.indexOf(name) !== -1 && before !== null && after !== null) cls = 'production';
      else if (TEST_CLASS.test(name)) cls = 'test';
    }
    if (cls === null) problems.push('the helper manifests differ in ' + p + ', which is no allowed change');
    else changes.push({ path: p, class: cls, before, after });
  });
  return { changes, identical, problems };
}

/**
 * The committed B1 -> B2 diff (`git diff --name-status -z --no-renames`, as [{ status, file }]) holds only:
 * the helper files of the manifest transition (each of them, and no other file of the helper folder), pack
 * files, and ADDED evidence files under docs/difficulty-v3/evidence/MS18d/ (freeze, transcript, tooling and
 * run outputs; nothing recorded is modified or deleted) plus the append-only C log.
 */
function transitionDiffProblems(entries, changes, ledgerRel) {
  const problems = [];
  const wanted = new Set(changes.map((c) => c.path));
  const seen = new Set();
  entries.forEach(({ status, file }) => {
    const f = file.replace(/\\/g, '/');
    seen.add(f);
    if (f.split('/').indexOf('..') !== -1) problems.push(f + ': a path that leaves the repository');
    else if (f.startsWith(HELPER_DIR)) {
      if (!wanted.has(f)) problems.push(f + ': a helper file changed that is no change of the manifests');
    } else if (f.startsWith(PACK_DIR)) {
      // pack files: the journals, rulings, base records and notes
    } else if (f.startsWith(EVIDENCE_DIR)) {
      if (status !== 'A' && f !== ledgerRel) {
        problems.push(f + ': recorded evidence was changed (' + status + ')');
      }
    } else problems.push(f + ': outside the allowed B1 -> B2 set');
  });
  wanted.forEach((f) => {
    if (!seen.has(f)) problems.push(f + ': a manifest change that is not in the committed diff');
  });
  return problems;
}

/** `git diff --name-status -z --no-renames <a> <b>` as [{ status, file }] (the reader returns text). */
function diffEntries(git, a, b) {
  const tokens = String(git(['diff', '--name-status', '-z', '--no-renames', a, b])).split('\0');
  const out = [];
  for (let i = 0; i + 1 < tokens.length; i += 2) out.push({ status: tokens[i].trim(), file: tokens[i + 1] });
  return out;
}

/** The one line of the base-2 record: { record, problems }. */
function parseEpochRecord(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length !== 1) return { record: null, problems: ['the base-2 record is not exactly one line'] };
  try {
    const record = JSON.parse(lines[0]);
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error('not an object');
    }
    return { record, problems: [] };
  } catch (err) {
    return { record: null, problems: ['the base-2 record is not JSON: ' + err.message] };
  }
}

/**
 * The base-2 record against everything it names: the merge request (campaign base B2, helper manifest H2),
 * the declared epoch 1, the plan, both helper manifests, Git (ancestry B1 -> checkpoint -> B2 -> HEAD, and
 * the diff), and the proof file. `input`: { record, base, helperSha, epoch1, doc, planRawSha256,
 * manifest1Text, manifest2Text, git, head, commits (the commits that touched the record's path),
 * readProof(rel) -> Buffer }.
 * Returns the problems ([] when the record is valid) and the manifest transition it was checked with.
 */
function epochRecordProblems(input) {
  const rec = input.record;
  const e1 = input.epoch1;
  const problems = [];
  const bad = (t) => problems.push('base-2 record: ' + t);
  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  if (input.commits !== 1) bad('the file was committed ' + input.commits + ' times, not once (never edited)');
  if (rec.schema !== EPOCH2_SCHEMA) bad('schema is not ' + EPOCH2_SCHEMA);
  if (!HEX40.test(String(rec.campaignBase)) || rec.campaignBase !== input.base) {
    bad('campaignBase is not the campaign base of the merge request');
  }
  if (rec.campaignBase === e1.base) bad('campaignBase is the base of epoch 1');
  if (rec.previousBase !== e1.base) bad('previousBase is not the declared base of epoch 1');
  if (rec.checkpoint !== e1.checkpoint) bad('checkpoint is not the declared checkpoint');
  const m1 = parseHelperManifest(input.manifest1Text);
  const m2 = parseHelperManifest(input.manifest2Text);
  m1.problems.concat(m2.problems).forEach(bad);
  const helper = rec.helperManifest;
  if (!isObject(helper) || helper.sha256 !== input.helperSha || helper.entries !== m2.entries.size) {
    bad('helperManifest is not the manifest of the merge request (sha256, entries)');
  }
  const previous = rec.previousHelperManifest;
  if (!isObject(previous) || previous.sha256 !== e1.helperManifestSha256 ||
    previous.entries !== m1.entries.size || (e1.manifestRel && previous.file !== e1.manifestRel)) {
    bad('previousHelperManifest is not the declared manifest of epoch 1 (file, sha256, entries)');
  }
  if (e1.entries !== undefined && m1.entries.size !== e1.entries) {
    bad('the epoch-1 manifest has other entries');
  }
  const transition = manifestTransition(m1, m2);
  transition.problems.forEach(bad);
  if (!same(rec.allowedHelperChanges, transition.changes)) {
    bad('allowedHelperChanges is not the exact change list of the two manifests');
  }
  const ancestor = (a, b, what) => {
    try {
      input.git(['merge-base', '--is-ancestor', a, b]);
    } catch (err) {
      bad(what + ' is not an ancestor');
    }
  };
  ancestor(e1.base, e1.checkpoint, 'B1 of the checkpoint');
  ancestor(e1.checkpoint, input.base, 'the checkpoint of B2');
  ancestor(input.base, input.head, 'B2 of HEAD');
  let names = [];
  try {
    names = diffEntries(input.git, e1.base, input.base);
    transitionDiffProblems(names, transition.changes, LEDGER).forEach(bad);
  } catch (err) {
    bad('the B1 -> B2 diff cannot be read: ' + err.message);
  }
  const proof = rec.transitionProof;
  if (!isObject(proof) || typeof proof.file !== 'string' || !HEX64.test(String(proof.sha256))) {
    bad('transitionProof is not { file, sha256 }');
  } else if (proof.file.split(/[\\/]/).indexOf('..') !== -1) {
    bad('transitionProof leaves the repository');
  } else {
    const bytes = input.readProof(proof.file.replace(/\\/g, '/'));
    if (bytes === null || sha256(bytes) !== proof.sha256) {
      bad('the transition proof is missing or not the cited bytes');
    } else {
      let doc = null;
      try {
        doc = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
      } catch (err) {
        bad('the transition proof is not JSON');
      }
      if (doc) {
        const want = { schema: PROOF_SCHEMA, previousBase: e1.base, checkpoint: e1.checkpoint,
          campaignBase: input.base, previousHelperManifestSha256: e1.helperManifestSha256,
          helperManifestSha256: input.helperSha, changes: transition.changes,
          identicalEntries: transition.identical,
          committedDiff: names.map((n) => n.status + ' ' + n.file.replace(/\\/g, '/')).sort() };
        Object.keys(want).forEach((k) => {
          if (!same(doc[k], want[k])) bad('the transition proof differs from the recomputed ' + k);
        });
      }
    }
  }
  const p = rec.plan;
  if (!isObject(p) || p.manifestSha256 !== input.doc.manifestSha256 || p.rawSha256 !== input.planRawSha256) {
    bad('plan is not the plan of the merge request');
  }
  const id = rec.identities;
  if (!isObject(id) || id.hashIdentity !== input.doc.sources.hashIdentity ||
    id.sources !== input.doc.sources.sources || id.tableSha256 !== input.doc.targets.tableSha256) {
    bad('identities are not those of the plan');
  }
  if (!isObject(rec.environment) || !same(rec.environment.node, input.doc.environment.node)) {
    bad('environment is not that of the plan');
  }
  if (!isObject(rec.policy) || rec.policy.choice !== input.doc.policy.choice) {
    bad('policy is not that of the plan');
  }
  const kept = isObject(rec.retainedEvidence) ? rec.retainedEvidence.successes : null;
  const chunkIds = new Set(input.doc.chunks.map((c) => c.chunkId));
  if (!Array.isArray(kept) || kept.length === 0 || !kept.every((r) => isObject(r) &&
    chunkIds.has(r.chunkId) && typeof r.runId === 'string' && HEX64.test(String(r.ledgerSha256)))) {
    bad('retainedEvidence.successes is not a list of { chunkId, runId, ledgerSha256 }');
  } else {
    if (new Set(kept.map((r) => r.chunkId)).size !== kept.length) bad('retainedEvidence names a chunk twice');
    const requests = input.doc.chunks.filter((c) => kept.some((r) => r.chunkId === c.chunkId))
      .reduce((sum, c) => sum + c.n, 0);
    const cut = rec.cutover;
    if (!isObject(cut) || cut.successes !== kept.length || cut.requests !== requests) {
      bad('cutover is not the retained successes and their requests');
    }
  }
  return { problems, transition };
}

/**
 * The epoch-1 ledgers of a merge must be exactly the retained successes of the record (chunk, run, ledger
 * digest), no epoch-2 ledger may answer a retained chunk, and a complete all-79 merge consumes all of them.
 * `consumed`: [{ chunkId, runDir, ledgerSha256, epoch: { id } }].
 */
function epochAccounting(consumed, record, complete) {
  const problems = [];
  const kept = new Map(record.retainedEvidence.successes.map((r) => [r.chunkId, r]));
  let first = 0;
  consumed.forEach((c) => {
    const runId = String(c.runDir).split('/').pop();
    const retained = kept.get(c.chunkId);
    if (c.epoch.id === 1) {
      first++;
      if (!retained || retained.runId !== runId || retained.ledgerSha256 !== c.ledgerSha256) {
        problems.push(c.chunkId + ': an epoch-1 ledger that is not one of the retained successes');
      }
    } else if (retained) problems.push(c.chunkId + ': a retained success is answered by an epoch-2 ledger');
  });
  if (complete && first !== kept.size) {
    problems.push('the retained successes are ' + kept.size + ', the epoch-1 ledgers of the merge ' + first);
  }
  return problems;
}

/** The epochs of a merge as the evaluation uses them: identity and R3 HEAD checker of each declared pair. */
function buildEpochs(doc, pairs, git, ledgerPath) {
  return pairs.map((p) => ({ id: p.id, base: p.base, helperManifestSha256: p.helperManifestSha256,
    expectedIdentity: expectedIdentityOf(doc, p.helperManifestSha256, p.base),
    checkHead: makeHeadChecker(git, p.base, doc, ledgerPath) }));
}

/**
 * The host binding an admission used (pack section "Host-binding journal"): the id, tuple and journal
 * reference it recorded must be an entry of the COMMITTED journal at merge time, the very one in force at
 * that admission (the last of the `entryCount` entries it saw), and the journal it saw must be a line prefix
 * of the committed one (append-only). The binding approved FOR THAT ADMISSION is judged, not the latest
 * host: a later rebinding retags and rejects no earlier record. `chain` = { entries, lines, problems }.
 */
function bindingProblems(input, chain) {
  const p = [];
  const ref = input.binding;
  if (!chain || chain.problems.length > 0 || chain.entries.length === 0) {
    return ['the committed host-binding journal is empty or invalid'];
  }
  if (!ref || typeof ref.bindingId !== 'string' || !ref.journal ||
    !Number.isInteger(ref.journal.entryCount) || !ref.evidence || ref.evidence.verified !== true) {
    return ['the record names no verified host binding of the journal'];
  }
  const index = chain.entries.findIndex((e) => e.bindingId === ref.bindingId);
  if (index < 0) {
    return ['the host binding ' + ref.bindingId + ' is not in the committed journal (unapproved)'];
  }
  if (!same(journals.bindingTuple(chain.entries[index]), input.expected)) {
    p.push('the host tuple is not the one approved by entry ' + ref.bindingId);
  }
  const n = ref.journal.entryCount;
  if (index !== n - 1) p.push('the host binding was not the one in force at admission');
  if (n > chain.lines.length || journals.digestLines(chain.lines.slice(0, n)) !== ref.journal.sha256) {
    p.push('the journal the admission saw is not a prefix of the committed journal');
  }
  if (!same(ref.host, chain.entries[index].host)) p.push('the recorded host differs from the journal entry');
  return p;
}

/**
 * F6 and C1: the admission of a real recorder run must carry a COMPLETE, ADMITTED policy A readiness record,
 * and the retained raw data must give the same decision again: readiness.json (cited by size-exact SHA-256),
 * the two snapshots it cites, the host binding in force (one of the recorded bindings), the run's own
 * wrapper, controller and probe processes, the time since the call. Problems, [] when it holds.
 */
function readinessProblems(run, admission, request, pidRows, ctx) {
  const p = [];
  const bad = (text) => p.push('readiness: ' + text);
  const sum = admission && admission.readiness;
  if (!sum || sum.schema !== rcore.SCHEMA || sum.required !== true || sum.ran !== true) {
    bad('admission.json carries no readiness record of a run');
    return p;
  }
  if (sum.complete !== true || sum.admitted !== true || sum.eligibleReAsk === true) {
    bad('the record is not a complete admitted one');
  }
  const bytes = run.bytes('readiness.json');
  if (bytes === null || sum.sha256 !== sha256(bytes)) {
    bad('readiness.json is missing or not the cited bytes');
    return p;
  }
  const rec = run.json('readiness.json').value;
  if (!rec || rec.schema !== 'ms18d-c-readiness-record-1' || !rec.inputs || !rec.decision) {
    bad('readiness.json is not a readiness record');
    return p;
  }
  const snapshot = (name) => {
    const ref = rec.snapshots && rec.snapshots[name];
    const b = ref && typeof ref.file === 'string' ? run.bytes(ref.file) : null;
    if (b === null || sha256(b) !== ref.sha256) {
      bad('the ' + name + ' snapshot is missing or not the cited bytes');
      return null;
    }
    return run.json(ref.file).value;
  };
  const before = snapshot('before');
  const after = snapshot('after');
  if (!before || !after) return p;
  const input = rec.inputs;
  if (!ctx.doc.policy || ctx.doc.policy.choice !== rcore.POLICY.choice) bad('the manifest policy is not A');
  bindingProblems(input, ctx.bindingJournal).forEach(bad);
  if (input.logicalCpus !== ctx.doc.environment.machine.logicalProcessors) {
    bad('another logical processor count');
  }
  const controller = (pidRows || []).filter((x) => x && x.role === 'controller')[0];
  (input.owned || []).forEach((o) => {
    if (OWNED_ROLES.indexOf(o.role) === -1) bad('an excluded process has the role ' + o.role);
    if (o.role === 'wrapper' && (!request || o.pid !== request.wrapperPid)) {
      bad('the wrapper is not the run\'s');
    }
    if (o.role === 'controller' && (!controller || o.pid !== controller.pid)) {
      bad('the controller is not the run\'s');
    }
    if (o.role === 'readiness-probe' && ![before, after].some((s) => s.selfPid === o.pid &&
      s.selfCreatedMs === o.createdMs)) bad('a probe process is not that of a snapshot');
  });
  const again = JSON.parse(JSON.stringify(rcore.decideReadiness({ policy: ctx.doc.policy,
    expected: input.expected, bindingSource: input.bindingSource, logicalCpus: input.logicalCpus,
    readings: input.readings, before, after, owned: input.owned, budget: input.budget })));
  if (!same(again, rec.decision)) bad('the recorded decision is not the one the retained data give');
  if (again.complete !== true || again.admitted !== true) bad('the retained data do not admit the run');
  if (!admission || !(admission.callToSpawnMs <= rcore.LIMITS.callToSpawnMs) ||
    admission.lateStart !== false) {
    bad('more than 60 s between the call and the payload');
  }
  return p;
}

/** One run folder read as bytes and parsed JSON: { dir, files, subdirs, text(name), json(name), bytes }. */
function readRunFolder(dirAbs) {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const cache = new Map();
  const bytes = (name) => {
    if (!cache.has(name)) {
      cache.set(name, files.indexOf(name) === -1 ? null : fs.readFileSync(path.join(dirAbs, name)));
    }
    return cache.get(name);
  };
  const json = (name) => {
    const b = bytes(name);
    if (b === null) return { present: false, value: null, error: null };
    try {
      return { present: true, value: JSON.parse(b.toString('utf8').replace(/^\uFEFF/, '')), error: null };
    } catch (err) {
      return { present: true, value: null, error: err.message };
    }
  };
  const rows = (name) => {
    const b = bytes(name);
    if (b === null) return null;
    const out = [];
    b.toString('utf8').split(/\r?\n/).forEach((line) => {
      if (line.trim() === '') return;
      try {
        out.push(JSON.parse(line));
      } catch (err) {
        out.push({ unparsable: line });
      }
    });
    return out;
  };
  return { dir: dirAbs, files, subdirs, bytes, json, rows };
}

/**
 * The verdict of ONE declared run folder of a chunk: { status: 'absent' | 'hold' | 'complete' | 'failed',
 * problems, ledger, ledgerSha256, head }. `hold` is a control-hold that started no payload and wrote no
 * ledger; `failed` is anything else that is not a complete run (a payload that started, or an incomplete
 * or inconsistent folder). ctx: { doc, slot, chunk, expectedIdentity, base, checkHead(head), realRun }.
 */
function judgeRun(run, ctx) {
  const { doc, slot, chunk } = ctx;
  if (run === null) return { status: 'absent', problems: [] };
  const problems = [];
  const bad = (text) => problems.push(text);
  if (run.subdirs.length > 0) bad('the run folder is not flat: ' + run.subdirs.join(', '));

  const result = run.json('result.json');
  const wrapper = run.json('wrapper.json');
  const ledgerBytes = run.bytes('ledger.json');
  const ledger0 = run.json('ledger.json').value;
  const r = result.value;
  // F5: a hold is a control-hold that started no payload and left no payload sign at all: no tee/command
  // record, no transcript, stdout, stderr or ledger. (A wrapper.json that says `foreign-lock-watch` and is
  // the only file of the folder is the shape of a watch give-up and counts as a hold too.)
  const payloadSigns = ['transcript.txt', 'stdout.txt', 'stderr.txt', 'ledger.json']
    .filter((n) => run.files.indexOf(n) !== -1);
  const pidRows = run.rows('pids.jsonl') || [];
  const payloadRows = pidRows.filter((x) => x && (x.role === 'tee' || x.role === 'command' ||
    x.event === 'command-exit' || x.event === 'tee-exit'));
  if (r && r.outcome === 'control-hold' && r.payloadStarted === false && payloadSigns.length === 0 &&
    payloadRows.length === 0 && problems.length === 0) {
    return { status: 'hold', problems: [] };
  }
  const wv = wrapper.value;
  if (!result.present && wv && wv.outcome === 'control-hold' && wv.heldAt === 'foreign-lock-watch' &&
    run.files.length === 1 && run.files[0] === 'wrapper.json' && problems.length === 0) {
    return { status: 'hold', problems: [] };
  }
  [['result.json', result], ['wrapper.json', wrapper]].forEach(([name, parsed]) => {
    if (!parsed.present) bad(name + ' is missing');
    else if (parsed.error) bad(name + ' is not JSON: ' + parsed.error);
  });
  const w = wrapper.value;
  if (w) {
    if (w.schema !== 'ms18d-c-run-1' || w.payload !== 'gp-recorder') bad('wrapper.json: not a recorder run');
    if (w.standin !== false) bad('wrapper.json: stand-in provenance');
    if (w.outcome !== 'success' || w.exit !== 0) {
      bad('wrapper.json: outcome ' + w.outcome + ' exit ' + w.exit);
    }
    if (!Array.isArray(w.problems) || w.problems.length !== 0) bad('wrapper.json: problems recorded');
    if (w.barrierVerdict !== 'clean' || w.releaseVerified !== true) bad('wrapper.json: cleanup not proved');
  }
  if (r) {
    const cls = r.classification || {};
    if (r.outcome !== 'success' || r.controllerExit !== 0 || r.payloadStarted !== true ||
      cls.complete !== true) bad('result.json: not a complete success');
    if (r.standin !== false) bad('result.json: stand-in provenance');
    if (!r.cli || r.cli.exit !== 0 || r.cli.signal) bad('result.json: the command did not exit 0');
    if (!r.tee || !/^exit=0 seconds=[0-9.]+$/.test(String(r.tee.marker))) bad('result.json: tee marker');
    if (!r.rawBytes || r.rawBytes.stderr !== 0) bad('result.json: stderr bytes are not 0');
    if (!r.barrier || r.barrier.verdict !== 'clean') bad('result.json: barrier not clean');
  }
  const pids = run.rows('pids.jsonl');
  const exits = (pids || []).filter((x) => x && x.event === 'command-exit');
  const teeExits = (pids || []).filter((x) => x && x.event === 'tee-exit');
  if (!pids || exits.length !== 1 || exits[0].code !== 0 || exits[0].signal) bad('pids.jsonl: command exit');
  if (!pids || teeExits.length !== 1 || teeExits[0].stderrBytes !== 0) bad('pids.jsonl: tee exit / stderr');
  const cleanup = run.json('cleanup.json').value;
  if (!cleanup || cleanup.verdict !== 'clean') bad('cleanup.json: not clean');
  const admission = run.json('admission.json').value;
  const acquisition = run.json('acquisition.json').value;
  const binding = run.json('binding.json').value;
  if (!admission || admission.decision !== 'proceed') bad('admission.json: not proceed');
  if (!acquisition || acquisition.decision !== 'proceed') bad('acquisition.json: not proceed');
  if (!binding || binding.ok !== true) bad('binding.json: not ok');
  const request = run.json('request.json').value;
  // the epoch of the run: the declared (base, helper manifest) pair its ledger names. A ledger of another
  // pair is no record of this campaign; a single-epoch merge has the one pair
  const epochs = ctx.epochs;
  const named = ledger0 && ledger0.identity;
  let epoch = (named && epochs.filter((e) => named.base === e.base &&
    named.helperManifestSha256 === e.helperManifestSha256)[0]) || null;
  if (epoch === null) {
    if (named && epochs.length > 1) {
      bad('ledger: the identity pair (base, helper manifest) is no declared epoch');
    }
    const asked = request && request.expected && request.expected.base;
    epoch = epochs.filter((e) => e.base === asked)[0] || epochs[epochs.length - 1];
  }
  // F6: a complete A readiness record, re-decided here from the retained raw data
  readinessProblems(run, admission, request, pidRows, ctx).forEach(bad);

  if (!request) bad('request.json is missing or not JSON');
  else {
    if (request.profile !== 'gp-recorder' || request.standin !== false || request.allowExit1 !== false) {
      bad('request.json: not a real recorder request');
    }
    if (request.command && request.command.exec !== undefined) bad('request.json: command.exec is set');
    if (!request.plan || request.plan.manifestSha256 !== doc.manifestSha256) bad('request.json: plan');
    if (!same(request.chunk, chunk)) bad('request.json: the chunk differs from the manifest');
    if (request.attempt !== slot.attempt || request.runId !== slot.runId) bad('request.json: slot');
    if (!request.expected || request.expected.base !== epoch.base) bad('request.json: campaign base');
    if (request.helpers && request.helpers.manifestSha256 !== undefined &&
      request.helpers.manifestSha256 !== epoch.helperManifestSha256) bad('request.json: helper manifest');
    if (ctx.realRun && !same((request.command || {}).args, frozenRecorderArgs(ctx.planRel, slot))) {
      bad('request.json: the command line is not the frozen one');
    }
  }

  const stdout = run.bytes('stdout.txt');
  const stderr = run.bytes('stderr.txt');
  if (stderr === null || stderr.length !== 0) bad('stderr.txt is missing or not empty');
  let marker = null;
  if (stdout === null) bad('stdout.txt is missing');
  else {
    const lines = stdout.toString('utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
    const start = lines.length === 2 ? START.exec(lines[0]) : null;
    marker = lines.length === 2 ? MARKER.exec(lines[1]) : null;
    if (!start || !marker) bad('stdout.txt is not exactly the start line and the completion marker');
    else if (start[1] !== chunk.chunkId || Number(start[2]) !== chunk.i0 || Number(start[3]) !== chunk.n ||
      Number(start[4]) !== chunk.seedBase || marker[1] !== chunk.chunkId) bad('stdout.txt: another chunk');
  }

  let ledger = null;
  let ledgerSha256 = null;
  if (ledgerBytes === null) bad('ledger.json is missing');
  else {
    ledgerSha256 = sha256(ledgerBytes);
    if (marker && (Number(marker[2]) !== ledgerBytes.length || marker[3] !== ledgerSha256)) {
      bad('the completion marker is not the size and digest of ledger.json');
    }
    const parsed = run.json('ledger.json');
    if (parsed.error) bad('ledger.json is not JSON: ' + parsed.error);
    ledger = parsed.value;
  }
  if (ledger) {
    validateLedgerShape(ledger, chunk).forEach((p) => bad('ledger: ' + p));
    if (!same(ledger.identity, epoch.expectedIdentity)) {
      bad('ledger: identity differs from the campaign identity');
    }
    const o = ledger.observation || {};
    if (o.runDir !== slot.runId || o.attempt !== slot.attempt) bad('ledger: another run slot');
    const refs = o.transport || {};
    ['request', 'acquisition', 'binding', 'admission'].forEach((name) => {
      const b = run.bytes(name + '.json');
      if (!refs[name] || b === null || refs[name].sha256 !== sha256(b)) {
        bad('ledger: transport reference ' + name);
      }
    });
    if (binding && binding.head && o.head !== binding.head.actual) bad('ledger: HEAD is not the bound HEAD');
    if (binding && binding.head && binding.head.base !== epoch.base) bad('binding.json: campaign base');
    const headCheck = epoch.checkHead(o.head);
    headCheck.problems.forEach((p) => bad('HEAD ' + o.head + ': ' + p));
  }
  if (problems.length === 0) {
    return { status: 'complete', problems, ledger, ledgerSha256, head: ledger.observation.head,
      dir: slot.dir, epoch: { id: epoch.id, base: epoch.base,
        helperManifestSha256: epoch.helperManifestSha256 } };
  }
  const started = !(r && r.payloadStarted === false);
  return { status: 'failed', problems, payloadStarted: started };
}

/** The numeric order, ascending: a copy. */
const ascending = (list) => list.slice().sort((a, b) => a - b);

/** The statistics of one cell from its 50 raw times (request order). Decisions use the unrounded values. */
function cellStats(times, target) {
  const sorted = ascending(times);
  const sum = times.reduce((a, b) => a + b, 0);
  const p95 = sorted[47];
  return { n: times.length, p50: sorted[24], p95, max: sorted[49], mean: sum / times.length, target,
    meets: p95 < target, sorted };
}

/**
 * One cell: `chunks` (the manifest entries in order), `verdicts` (chunkId -> [{ slot, verdict }]). Returns
 * { cell, complete, problems, stats, chunks: [...] }.
 */
function mergeCell(cell, chunks, verdicts) {
  const problems = [];
  const accepted = [];
  const detail = [];
  chunks.forEach((chunk) => {
    const list = verdicts.get(chunk.chunkId) || [];
    const complete = list.filter((x) => x.verdict.status === 'complete');
    const failed = list.filter((x) => x.verdict.status === 'failed');
    const holds = list.filter((x) => x.verdict.status === 'hold');
    failed.forEach((f) => f.verdict.problems.forEach((p) => problems.push(chunk.chunkId + ' ' +
      f.slot.runId + ': ' + p)));
    if (complete.length > 1) problems.push(chunk.chunkId + ': ' + complete.length + ' complete ledgers');
    if (complete.length === 1 && failed.length > 0) {
      problems.push(chunk.chunkId + ': a complete run follows a run that failed; a started chunk is ' +
        'never replaced');
    }
    if (complete.length === 0) {
      problems.push(chunk.chunkId + ': no complete run (' + holds.length + ' hold(s), ' + failed.length +
        ' failed)');
    }
    if (complete.length === 1 && failed.length === 0) {
      accepted.push({ chunk, verdict: complete[0].verdict });
    }
    detail.push({ chunkId: chunk.chunkId, complete: complete.length, failed: failed.length,
      holds: holds.length });
  });
  if (accepted.length !== chunks.length || problems.length > 0) {
    return { cell, complete: false, problems, stats: null, chunks: detail, coldStart: [] };
  }
  const times = [];
  const seen = new Set();
  accepted.forEach(({ verdict }) => verdict.ledger.requests.forEach((q) => {
    if (seen.has(q.index)) problems.push(cell + ': index ' + q.index + ' twice');
    seen.add(q.index);
    times[q.index] = q.ms;
  }));
  for (let i = 0; i < 50; i++) if (!seen.has(i)) problems.push(cell + ': index ' + i + ' is missing');
  if (problems.length > 0) {
    return { cell, complete: false, problems, stats: null, chunks: detail, coldStart: [] };
  }
  const stats = cellStats(times, chunks[0].target);
  const coldStart = accepted.map(({ verdict }) => verdict.ledger.requests[0])
    .filter((q) => q.ms >= stats.sorted[47])
    .map((q) => ({ index: q.index, ms: q.ms, extraStart: q.index > 0 }));
  return { cell, complete: true, problems, stats, chunks: detail, coldStart,
    coldStartSensitive: coldStart.length > 0,
    consumed: accepted.map(({ chunk, verdict }) => ({ chunkId: chunk.chunkId, runDir: verdict.dir,
      ledgerSha256: verdict.ledgerSha256, head: verdict.head, epoch: verdict.epoch })) };
}

/**
 * The whole evaluation. `input`: { doc, scope: { type: 'cell', cell } | { type: 'all' }, runFolders (a Map of
 * declared dir -> readRunFolder result or null), realRun, and either `epochs` (the pairs of buildEpochs)
 * or expectedIdentity, base, checkHead (one pair) }. Each complete ledger is judged against the epoch whose
 * (base, helper manifest) pair its own identity names. Returns
 * { scope, complete, problems, cells, successes, required, meets, extraStarts }.
 */
function evaluate(input) {
  const { doc, scope } = input;
  const problems = [];
  const cells = scope.type === 'all' ? Array.from(new Set(doc.chunks.map((c) => c.cell))) : [scope.cell];
  if (scope.type === 'cell' && !doc.chunks.some((c) => c.cell === scope.cell)) {
    return { scope, complete: false, problems: ['no such cell in the manifest: ' + scope.cell], cells: [] };
  }
  if (scope.type === 'all' && cells.length !== doc.gate.cells) {
    problems.push('the manifest has ' + cells.length + ' cells, the gate expects ' + doc.gate.cells);
  }
  // a merge of one declared pair (the usual case) or of the two epochs of the campaign
  const epochs = input.epochs || [{ id: 1, base: input.base, expectedIdentity: input.expectedIdentity,
    helperManifestSha256: input.expectedIdentity.helperManifestSha256, checkHead: input.checkHead }];
  const results = cells.map((cell) => {
    const chunks = doc.chunks.filter((c) => c.cell === cell);
    const verdicts = new Map();
    chunks.forEach((chunk) => {
      const list = [];
      doc.runSlots.filter((s) => s.role === 'chunk' && s.chunkId === chunk.chunkId).forEach((slot) => {
        const run = input.runFolders.get(slot.dir) || null;
        list.push({ slot, verdict: judgeRun(run, { doc, slot, chunk, epochs, realRun: input.realRun,
          planRel: input.planRel, bindingJournal: input.bindingJournal }) });
      });
      verdicts.set(chunk.chunkId, list);
    });
    return mergeCell(cell, chunks, verdicts);
  });
  results.forEach((c) => c.problems.forEach((p) => problems.push(c.cell + ': ' + p)));
  const complete = problems.length === 0 && results.every((c) => c.complete);
  const successes = results.filter((c) => c.complete && c.stats.meets).length;
  const required = doc.gate.requiredSuccesses;
  const out = { scope, complete, problems, cells: results, successes, required };
  if (complete) {
    out.meets = scope.type === 'all' ? successes >= required : results[0].stats.meets;
    out.extraStarts = results.reduce((sum, c) => sum + c.chunks.length - 1, 0);
  }
  return out;
}

/** The R3 check of one recorded HEAD against the base, through `git` (read-only): { ok, problems }. */
function makeHeadChecker(git, base, doc, ledgerPath) {
  const cache = new Map();
  return (head) => {
    if (cache.has(head)) return cache.get(head);
    const problems = [];
    if (!/^[0-9a-f]{40}$/.test(String(head))) problems.push('not a full commit id');
    else if (head !== base) {
      let descendant = false;
      try {
        git(['merge-base', '--is-ancestor', base, head]);
        descendant = true;
      } catch (err) {
        problems.push('not a descendant of the campaign base ' + base);
      }
      if (descendant) {
        try {
          const names = git(['diff', '--name-only', '-z', base, head]).split('\0').filter(Boolean);
          const violations = campaignDiffViolations(names, { declaredDirs: plan.declaredDirsOf(doc),
            ledger: ledgerPath || LEDGER });
          if (violations.length > 0) {
            problems.push('changed since the base: ' + violations.slice(0, 5).join('; '));
          }
        } catch (err) {
          problems.push('git diff failed: ' + err.message);
        }
      }
    }
    const verdict = { ok: problems.length === 0, problems };
    cache.set(head, verdict);
    return verdict;
  };
}

/** The identity every ledger of the campaign must carry exactly (from the manifest and this run). */
function expectedIdentityOf(doc, helperManifestSha256, base) {
  return {
    planManifestSha256: doc.manifestSha256, helperManifestSha256, hashIdentity: doc.sources.hashIdentity,
    tableSha256: doc.targets.tableSha256, sourcesPublished: doc.sources.sources,
    loadedFiles: doc.loader.files, loaderRecipe: doc.loader.recipe, node: doc.environment.node,
    machine: doc.environment.machine, execArgv: [], nodeOptions: '', base, selectedPolicy: doc.policy,
    identityMethod: IDENTITY_METHOD
  };
}

/**
 * R2 at merge time: the declared run folders of the scope are read, and anything else under the run base
 * that the manifest does not declare (a folder, a loose file) is a problem. `listDir(rel)` -> [{ name,
 * dir }] and `readDir(rel)` -> readRunFolder result, both relative to the repository.
 */
function collectRunFolders(doc, scope, fsio) {
  const folders = new Map();
  const problems = [];
  const declared = new Set(plan.declaredDirsOf(doc));
  const base = doc.runBase;
  const wanted = scope.type === 'all' ? null : scope.cell.replace('/', '-');
  fsio.listDir(base).forEach((entry) => {
    if (wanted !== null && entry.name !== wanted) return;
    if (!entry.dir) {
      problems.push('a loose file under the run base: ' + base + '/' + entry.name);
      return;
    }
    fsio.listDir(base + '/' + entry.name).forEach((run) => {
      const rel = base + '/' + entry.name + '/' + run.name;
      if (!declared.has(rel)) problems.push('an undeclared run directory: ' + rel);
    });
  });
  doc.runSlots.filter((s) => s.role === 'chunk').forEach((slot) => {
    if (wanted !== null && slot.dir.split('/').slice(-2)[0] !== wanted) return;
    folders.set(slot.dir, fsio.exists(slot.dir) ? fsio.readDir(slot.dir) : null);
  });
  return { folders, problems };
}

/** The numbers of a cell for the report (the sorted copy is dropped). */
const publicStats = (s) => (s ? { n: s.n, p50: s.p50, p95: s.p95, max: s.max, mean: s.mean, target: s.target,
  meets: s.meets } : null);

module.exports = { judgeRun, mergeCell, evaluate, cellStats, makeHeadChecker, expectedIdentityOf,
  collectRunFolders, readRunFolder, frozenRecorderArgs, publicStats, ascending, EPOCH1, EPOCH2_RECORD_REL,
  EPOCH2_SCHEMA, PROOF_SCHEMA, HELPER_DIR, parseHelperManifest, manifestTransition, transitionDiffProblems,
  diffEntries, parseEpochRecord, epochRecordProblems, epochAccounting, buildEpochs };
