'use strict';

/*
 * MS18d Phase C0b task-owned: materializes the frozen 114-entry chunk manifest (gp-chunk-manifest.json) from
 * the frozen R24 plan data (plan-data.js) and the facts of the real tree, read only: the 79 offered frozen
 * targets and the target table, the E hash and replay identities, the loaded-source manifest, Node and the
 * machine (source-io.js), and the two plan documents of the pack. A pack-plan reference resolves its
 * RECORDED commit and blob (R3), never whatever later text occupies the path: the manifest keeps the full
 * pack commit, and for each document its blob id and the SHA-256 of that blob's bytes, read with git
 * cat-file. Every frozen cell and target must agree with the tree and every derived chunk with the frozen
 * table; any difference is an error and nothing is written. It generates nothing, measures nothing and never
 * overwrites a manifest. The real campaign declares the literal run slots of both attempts of every chunk
 * and the one final all-79 merge only (selected-cell merges are optional diagnostics and are not declared).
 * `r24Notice` (the delivered S1 status update) is recorded in the policy, before the campaign base is
 * frozen.
 *   node tests/artifacts/difficulty-v3/MS18d/phase-c/make-chunk-manifest.js --out=<new manifest.json>
 *        [--pack-commit=<commit-ish, default ee5bf91a>]
 * Exit code 0 written, 2 a refusal (the problems are on stderr).
 */
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const plan = require('./plan-data.js');
const { sha256 } = require('./common.js');
const { liveIo, gitReader } = require('./source-io.js');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const PACK_COMMIT = 'ee5bf91a';
const MERGE_BASE = 'docs/difficulty-v3/evidence/MS18d/gp';
const TARGETS_FILE = 'docs/difficulty-v3/evidence/MS18d/phase-b/targets-frozen-final.json';
const R24_SPEC = 'tasks/difficulty-v3/MS18d-r24-request-ledger.md';
const ADMISSION_SPEC = 'tasks/difficulty-v3/MS18d-phase-c-admission.md';
const POLICY = {
  selector: 'S-OD15', choice: 'A', name: 'MS18d-GP-host-active', owner: 'amicably8850',
  answeredAt: '2026-11-19T07:13:33.350Z',
  source: { channelId: '1571779348573323334', messageId: '1572872444602228798' },
  answerRef: 'S-OD15 of tasks/difficulty-v3/check-list.md (MS18d-Q1 answer A, host-active)',
  r24Notice: { channelId: '1571779348573323334', messageId: '1572878023034675262',
    sentAtApprox: '2026-11-19 14:37 +07:00', textRef: 'e4cd92d6:MS18d-r24-request-ledger.md lines 298-316' }
};
const EXPECTED = {
  targetsRawSha256: '9ec4ac6e576c81c0ea174d5465c99f480c26c4035771760f9009a6370a9de44f',
  tableSha256: '3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a',
  hashIdentity: '344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1',
  replayIdentity: '1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc',
  sources: '75b0955e3e356bd1',
  node: 'v26.13.0',
  machine: { cpu: 'AMD EPYC 7763 64-Core Processor', logicalProcessors: 16, memoryGb: 64,
    platform: 'win32 10.0.26300' },
  loaderRecipe: { declared: 64, excluded: 18, missing: 0, engine: 46, fixtures: 3, loaded: 49 }
};

/** The manifest text: the top-level keys pretty, each chunk, run slot and loaded file on one line (CRLF). */
function manifestText(doc) {
  const lines = (list) => '[\n' + list.map((c) => '    ' + JSON.stringify(c)).join(',\n') + '\n  ]';
  const parts = Object.keys(doc).map((key) => {
    if (key === 'chunks' || key === 'runSlots') return '  ' + JSON.stringify(key) + ': ' + lines(doc[key]);
    return '  ' + JSON.stringify(key) + ': ' + JSON.stringify(doc[key], null, 2).replace(/\n/g, '\n  ');
  });
  return ('{\n' + parts.join(',\n') + '\n}\n').replace(/\r?\n/g, '\r\n');
}

/**
 * The manifest of the real tree: { doc, problems }. `io` is a source-io.js object, `files` reads a
 * repository-relative working-tree file as bytes (the frozen targets file), `pack` is { commit (40 hex),
 * short, blob(rel) -> { blobId, sha256 } } for the recorded pack commit. Nothing is written.
 */
function makeManifest(io, files, pack) {
  const problems = [];
  plan.checkFrozen(plan.frozenRows()).forEach((p) => problems.push('frozen plan: ' + p));
  const table = io.table();
  const rows = plan.frozenRows();
  const offered = table.positions.filter((p) => p.target !== null);
  if (offered.length !== rows.length) {
    problems.push('the tree offers ' + offered.length + ' cells, not ' + rows.length);
  }
  rows.forEach((row) => {
    const target = table.targetOf(row.key);
    if (target !== row.target) problems.push(row.key + ': frozen target ' + row.target + ', tree ' + target);
  });
  const ids = io.identities();
  const machine = io.machine();
  const loaded = io.loader();
  const checks = [['table', table.sha256, EXPECTED.tableSha256], ['E hash', ids.hashIdentity,
    EXPECTED.hashIdentity], ['E replay', ids.replayIdentity, EXPECTED.replayIdentity],
  ['sources', ids.sources, EXPECTED.sources], ['Node', io.node(), EXPECTED.node],
  ['machine', JSON.stringify(machine), JSON.stringify(EXPECTED.machine)],
  ['loader E hash', loaded.hashIdentity, EXPECTED.hashIdentity],
  ['loader sources', loaded.sources, EXPECTED.sources],
  ['loader recipe', JSON.stringify(loaded.recipe), JSON.stringify(EXPECTED.loaderRecipe)]];
  checks.forEach(([what, actual, want]) => {
    if (actual !== want) problems.push(what + ' ' + actual + ' is not ' + want);
  });
  const targetsRaw = sha256(files(TARGETS_FILE));
  if (targetsRaw !== EXPECTED.targetsRawSha256) problems.push('targets-frozen-final.json ' + targetsRaw);
  if (!/^[0-9a-f]{40}$/.test(String(pack.commit))) problems.push('the pack commit is not a full commit id');
  if (problems.length > 0) return { doc: null, problems };
  const document = (rel) => Object.assign({ path: rel }, pack.blob(rel));
  const doc = plan.buildManifest({
    plan: { packCommit: pack.commit, packCommitShort: pack.short,
      documents: [document(R24_SPEC), document(ADMISSION_SPEC)],
      resolution: 'the recorded commit and blob, never the text that later occupies the path' },
    targets: { file: TARGETS_FILE, rawSha256: targetsRaw, tableSha256: table.sha256,
      offered: offered.length },
    sources: { hashIdentity: ids.hashIdentity, replayIdentity: ids.replayIdentity, sources: ids.sources,
      qualifierHash: ids.qualifierHash },
    loader: { recipe: loaded.recipe, hashIdentity: loaded.hashIdentity, sources: loaded.sources,
      files: loaded.files },
    environment: { node: io.node(), machine }, policy: POLICY, mergeBase: MERGE_BASE,
    cellMergeSlots: false
  });
  const bad = plan.verifyManifest(doc);
  return { doc: bad.length === 0 ? doc : null, problems: bad };
}

/** The recorded pack commit and the blobs of its documents, read with git (never the working tree). */
function packOf(ref) {
  const git = gitReader(REPO);
  const commit = git(['rev-parse', '--verify', ref + '^{commit}']).trim();
  git(['merge-base', '--is-ancestor', commit, 'HEAD']);
  return {
    commit, short: commit.slice(0, 8),
    blob: (rel) => {
      const blobId = git(['rev-parse', '--verify', commit + ':' + rel]).trim();
      const bytes = childProcess.execFileSync('git', ['--no-optional-locks', 'cat-file', 'blob', blobId],
        { cwd: REPO, maxBuffer: 1 << 26 });
      return { blobId, sha256: sha256(bytes) };
    }
  };
}

function main(argv) {
  const out = argv.map((a) => /^--out=(.+)$/.exec(a)).filter(Boolean)[0];
  const pack = argv.map((a) => /^--pack-commit=(.+)$/.exec(a)).filter(Boolean)[0];
  if (!out || argv.length !== (pack ? 2 : 1)) {
    console.error('usage: make-chunk-manifest.js --out=<new manifest.json> [--pack-commit=<commit-ish>]');
    return 2;
  }
  const target = path.resolve(out[1]);
  if (fs.existsSync(target)) {
    console.error('the manifest ' + target + ' exists; it is never overwritten');
    return 2;
  }
  const made = makeManifest(liveIo(REPO), (rel) => fs.readFileSync(path.join(REPO, rel)),
    packOf(pack ? pack[1] : PACK_COMMIT));
  if (!made.doc) {
    console.error(made.problems.join('\n'));
    return 2;
  }
  fs.writeFileSync(target, manifestText(made.doc), { flag: 'wx' });
  const c = made.doc.counts;
  console.log('manifest ' + made.doc.manifestSha256 + ': ' + c.cells + ' cells, ' + c.commands +
    ' commands, ' + c.requests + ' requests, ' + c.extraColdStarts + ' extra cold starts, ' + c.runSlots +
    ' run slots, ' + c.reservedSeconds + ' s reserved, max ' + c.maxProjectionSeconds + ' s');
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error('refused: ' + (err && err.message ? err.message : err));
    process.exitCode = 2;
  }
}

module.exports = { makeManifest, manifestText, packOf, EXPECTED, POLICY, MERGE_BASE, TARGETS_FILE,
  PACK_COMMIT };
