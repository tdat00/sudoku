'use strict';

/*
 * Revision r2 of the smoke report: WORDING CORRECTIONS ONLY, derived from the original smoke-report.json and
 * smoke-report.md of this archive (which stay unchanged) and from the unchanged raw receipts. No rerun, no admission,
 * no retry, no repair, no git, no write outside the archive folder. Pure: reads files, writes smoke-report-r2.json
 * and smoke-report-r2.md.
 *
 *   node make-report-r2.cjs <archive folder>
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const archive = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const sha256 = function (data) { return crypto.createHash('sha256').update(data).digest('hex'); };

function normalise(text) {
  const lines = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(function (l) { return l.replace(/[ \t]+$/, ''); });
  return (lines.join('\n').replace(/\n+$/, '') + '\n').replace(/\n/g, '\r\n');
}

function write(rel, text) {
  fs.writeFileSync(path.join(archive, rel), normalise(text), { encoding: 'utf8', flag: 'w' });
}

const origJsonBytes = fs.readFileSync(path.join(archive, 'smoke-report.json'));
const origMdBytes = fs.readFileSync(path.join(archive, 'smoke-report.md'));
const orig = JSON.parse(origJsonBytes.toString('utf8').replace(/^\uFEFF/, ''));
let md = origMdBytes.toString('utf8').replace(/\r\n/g, '\n');

const ONE_LINE = 'Compatibility smoke of harness `8f0018b5c36d\u2026` against rating-v3 `8b70875`: self-test 36/36; 5/8 adapters apply ' +
  'textually, while `profile`, `jigsaw-profile` and `gt-diagnostic` fail at digger anchors, and `frontier-hooks` has a stale ' +
  '`refusalReason` exposure; two pure suites timed out and native/no-op puzzle parity remains untested (1/4 loader rows ' +
  'completed); 144.472 s separately charged, with no adapter repairs or performance conclusions.';

const PACK_FP = orig.identity.harness.packFilesOnlyFingerprint;
const REF_HARNESS = orig.identity.harness.referenceHarness;
const origMdSha = sha256(origMdBytes);
const origJsonSha = sha256(origJsonBytes);

// --- markdown: every replacement must match exactly once ----------------------------------------------------------

function rep(oldText, newText) {
  const first = md.indexOf(oldText);
  if (first < 0) throw new Error('r2: text not found: ' + oldText.slice(0, 90));
  if (md.indexOf(oldText, first + 1) >= 0) throw new Error('r2: text found twice: ' + oldText.slice(0, 90));
  md = md.slice(0, first) + newText + md.slice(first + oldText.length);
}

function repLine(prefix, newLine) {
  const lines = md.split('\n');
  const hits = lines.map(function (l, i) { return l.indexOf(prefix) === 0 ? i : -1; }).filter(function (i) { return i >= 0; });
  if (hits.length !== 1) throw new Error('r2: line prefix matched ' + hits.length + ' times: ' + prefix);
  lines[hits[0]] = typeof newLine === 'function' ? newLine(lines[hits[0]]) : newLine;
  md = lines.join('\n');
}

function repSection(startHeading, endHeading, newBody) {
  const a = md.indexOf(startHeading);
  const b = md.indexOf(endHeading, a + 1);
  if (a < 0 || b < 0) throw new Error('r2: section not found: ' + startHeading);
  md = md.slice(0, a) + newBody + '\n' + md.slice(b);
}

const stale = REF_HARNESS ? REF_HARNESS : {};
const diffList = (stale.differing || []).map(function (f) { return '`' + f + '`'; }).join(', ');
const onlyRef = (stale.onlyInReference || []).map(function (f) { return '`' + f + '`'; }).join(', ');

const top = [
  ONE_LINE,
  '',
  '**Status (astra-ig):** accepted as a **partial capability smoke, not a compatibility or parity pass**.',
  '',
  'Revision r2 of the smoke report: wording corrections only. The original `smoke-report.md` (SHA-256 `' + origMdSha + '`) and `smoke-report.json` (SHA-256 `' + origJsonSha + '`) and every raw receipt are unchanged; there was no rerun, no admission, no retry and no repair. The corrections:',
  '',
  '1. `ig05-test` and the `gate` group of `ig10-test` **started and timed out** (they ran 1956.1 ms and 1616.2 ms and were killed by PID at the 4,000 ms inventory deadline, termination verified). They are **incomplete**, not "unstarted", and are not proven source failures. Only the three loader-parity rows that never began are unstarted.',
  '2. No claim remains that loader-parity exercised `noop-expose`: the only completed loader-parity row is **native** (classic4 Very Easy seed 1); both `noop-expose` rows were unstarted; native-versus-no-op **puzzle parity is untested**.',
  '3. `frontier-hooks` applies textually and compiles, but it exposes `refusalReason`, which rating-v3 `js/engine/digger.js` no longer declares: a **stale exposure** (see the highlighted section below). `frontier-test` `adapter.anchors` fails on it.',
  '4. The pinned harness is the accepted **IG-S10 r2 snapshot** (pack-file fingerprint `' + PACK_FP + '`, i.e. `8f0018b5c36d\u2026`), **not the r3 harness**; the harness directory in the smoke worktree is **untracked, not git-ignored** (`?? generator/tests/artifacts/improve-generating/` in `git status --short`).',
  ''
].join('\n');

repLine('# Smoke report ', '# Smoke report smoke-rating-v3-8b70875 \u2014 revision r2 (wording corrections)\n\n' + top);

repLine('**Result:** ', '**Counts:** textual: 5 of 8 adapters apply (`frontier-hooks` only textually, with a stale exposure); pure tests: 2 passed, 5 failed (4 on stale or missing digger anchors / identifiers, 1 on absent `provisional-r1` evidence), 2 started and timed out (incomplete); self-test 36/36; loader-parity 1 of 4 rows (native only); charged 144,472 of 180,000 ms in 3 of 3 admissions.\n\n' +
  '## Stale exposure: `frontier-hooks` and `refusalReason`\n\n' +
  '**`frontier-hooks` compiles textually (5/5 transforms apply, the patched text compiles) but its exposure list names `refusalReason`, an identifier that rating-v3 `js/engine/digger.js` no longer declares.** The function header `function refusalReason(value) {` occurs once in the older pack runtime and 0 times in rating-v3, and the identifier appears nowhere in the three files the adapter patches. The `profile` adapter\'s `profile.refusal` transform fails for the same reason (its anchor is that missing header). `frontier-test` `adapter.anchors` fails with `digger.js declares refusalReason`. Textual applicability therefore does **not** make `frontier-hooks` usable on rating-v3: loading the patched digger would likely name an undeclared identifier (not run here; no adapter was repaired).');

repLine('- Harness copy: ', '- **Pinned harness: the accepted IG-S10 r2 snapshot**, pack-file fingerprint `' + PACK_FP + '` (`8f0018b5c36d\u2026`, equal to the r2 writer fingerprint recorded for IG-S10 in the pack check-list). With the smoke files added the fingerprint is `' + orig.identity.harness.fingerprintWithSmokeFiles + '` (what the child commands record as `harnessFingerprint`). **It is not the r3 harness.**');
repLine('- Harness in the improve-generating worktree', '- The improve-generating worktree harness (read only at the inspection; fingerprint `' + (stale.harnessFingerprint || '').slice(0, 16) + '`, the r3 harness per astra-ig) is **not identical** to the pinned snapshot; differing files: ' + diffList + '; only there: ' + onlyRef + '. It was still changing during the smoke. Nothing in this smoke speaks for those files; the smoke tested the pinned r2 snapshot.\n- The harness directory in the smoke worktree is **untracked, not git-ignored**: `git status --short` shows `?? generator/tests/artifacts/improve-generating/` (and `?? docs/improve-generating/evidence/`).');

// textual table and per-task wording
rep('| frontier-hooks | IG-S04, IG-S05 | 5 | 5/5 | all 5 | - | - |', '| frontier-hooks | IG-S04, IG-S05 | 5 | 5/5 | all 5 (textual only) | **stale exposure: `refusalReason` is not declared in rating-v3 `js/engine/digger.js`** | none from the loader; `frontier-test` `adapter.anchors` fails |');
rep('| frontier-hooks | IG-S04, IG-S05 | manifest; static (manifest not buildable here) | applies | - |', '| frontier-hooks | IG-S04, IG-S05 | manifest; static (manifest not buildable here) | applies textually; stale `refusalReason` exposure | - |');
rep('| IG-S04 | frontier-hooks | applies | ok |', '| IG-S04 | frontier-hooks | applies textually; **stale `refusalReason` exposure** | ok |');
rep('| IG-S05 | frontier-hooks (static (manifest not buildable here)) | applies |', '| IG-S05 | frontier-hooks (static (manifest not buildable here)) | applies textually; **stale `refusalReason` exposure** |');

// pure tests: started and timed out
rep('| ig05-test.pure | IG-S05 | timeout (terminated at the payload deadline) |', '| ig05-test.pure | IG-S05 | **started, timed out: incomplete** (killed by PID at the payload deadline, termination verified) |');
rep('| ig10-test.gate | IG-S10 | timeout (terminated at the payload deadline) |', '| ig10-test.gate | IG-S10 | **started, timed out: incomplete** (killed by PID at the payload deadline, termination verified) |');
rep('A timed-out unit was terminated by PID at the payload deadline and verified gone; it is unstarted coverage, not a failure.', 'A timed-out unit **started**, ran until the 4,000 ms inventory deadline and was terminated by PID and verified gone: it is **incomplete**, produced no pass or fail, and is not a proven source failure; it is not "unstarted".');
rep('- `frontier-test.pure` failing cases by cause: 1 x "Error: digger.js declares refusalReason".', '- `frontier-test.pure` failing cases by cause: 1 x "Error: digger.js declares refusalReason" (the stale exposure highlighted above).');

// source drift bullet
repLine('- `frontier-hooks` exposes the identifier `refusalReason`', '- **Stale exposure:** `frontier-hooks` exposes the identifier `refusalReason`, which is no longer in the rating-v3 sources of the files it patches (in the older runtime: true). Its transforms apply textually and compile, but the exposure names an identifier the source no longer declares (not run here).');

// canaries
repLine('- **IG-S01/self-test**: ', function (line) {
  return line + ' The case `engine-loads-and-discovers-catalogue` is where a `noop-expose` instance was loaded and its hook checked (no puzzle generated); that is a self-test canary, not loader-parity.';
});
repLine('- **IG-S01/loader-parity**: ', '- **IG-S01/loader-parity**: ran, child passed (exit 0, 1438.4 ms), command status `paused-unstarted`, rows completed **1 of 4 \u2014 the native classic4 Very Easy seed 1 row only** (generated and independently verified); given --deadline-ms=25000. **No `noop-expose` row ran, so loader-parity did not exercise `noop-expose`, and no native/no-op pair was compared: puzzle parity is untested.**');
repLine('  - parity report: ', function (line) {
  return line + ' (no pair was compared; the verdicts are deferred / not started, not parity-ok).';
});

// failures table
rep('| frontier-test.pure (IG-S04) | pure-test | adapter.anchors | exit 1 | Error: digger.js declares refusalReason |', '| frontier-test.pure (IG-S04) | pure-test | adapter.anchors | stale exposure (test exit 1) | Error: digger.js declares refusalReason |');
rep('| ig07-test.pure (IG-S07) |', '| adapter frontier-hooks (used by IG-S04, IG-S05) | stale exposure (applies textually) | js/engine/digger.js :: exposes `refusalReason`, which is no longer declared | none from the loader | the exposure names an identifier absent from rating-v3 `digger.js` |\n| ig07-test.pure (IG-S07) |');

// incomplete / unstarted
const ig05 = orig.pureTests.find(function (t) { return t.id === 'ig05-test.pure'; });
const ig10 = orig.pureTests.find(function (t) { return t.id === 'ig10-test.gate'; });
const unstartedRows = orig.unstartedOrTimedOut.filter(function (u) { return u.kind === 'unstarted row'; });
repSection('## Unstarted work and timeouts', '## Not tested',
  '## Incomplete (started, timed out) and unstarted work\n\n' +
  '**Started and timed out (incomplete; not unstarted; not proven source failures):**\n\n' +
  '| what | ran for | outcome |\n| --- | --- | --- |\n' +
  '| ig05-test.pure (IG-S05) | ' + ig05.wallMs + ' ms | killed by PID at the payload deadline, termination verified; no result (these files write their output only at the end) |\n' +
  '| ig10-test.gate (IG-S10) | ' + ig10.wallMs + ' ms | killed by PID at the payload deadline, termination verified; no result |\n\n' +
  '**Unstarted** (never began):\n\n' +
  '| what | reason |\n| --- | --- |\n' +
  unstartedRows.map(function (u) { return '| ' + u.what + ' | ' + u.reason + ' (a 25,000 ms `--deadline-ms` admits only the first physical command of the shard) |'; }).join('\n') + '\n\n' +
  'Not run to completion because the process stopped early: the cases of `ig07-test` after its crash. No phase was skipped; all three admissions were used.\n');

repSection('## Not tested', '## Driver files',
  '## Not tested\n\n' +
  '- **puzzle parity between the native and the no-op-patched loader is NOT tested**: the only completed loader-parity row is native; both `noop-expose` rows were unstarted, so loader-parity did not exercise `noop-expose` and no pair was compared\n' +
  '- semantic parity of any adapter (same puzzles, ratings, checks and work as the native engine on the rating-v3 runtime) is NOT tested\n' +
  '- textual applicability means the private string transforms find unique anchors and the patched text compiles (vm.Script); it does not run the patched code. `frontier-hooks` shows that this is not enough: it applies textually but exposes the missing `refusalReason`\n' +
  '- `ig05-test` and the `gate` group of `ig10-test` are incomplete (started, timed out); `ig07-test` crashed on its first adapter transform; no result of these three is a pass\n' +
  '- the engine-free tests that completed use fakes and the real source text; none generates a puzzle, and the groups that need accepted evidence (reconcile, the historical IG-S10 cases) were not run\n' +
  '- no performance, timing, throughput or pool-width figure was measured or is meaningful here; no adapter was repaired\n' +
  '- IG-S06, rows 706-709 and every frozen-gate run are out of scope; IG-S03 and IG-S05 plan-only is blocked by prerequisite evidence of `provisional-r1` that the smoke worktree does not hold\n');

// driver files and worktree
rep('## Worktree', 'Revision r2 (this report) was generated from the unchanged `smoke-report.json` and raw receipts by `driver/r2/make-report-r2.cjs` (its hash is in `hash-manifest-r2.json`); it reruns nothing.\n\n## Worktree');
repLine('- `git status --short` of the smoke worktree after the smoke', function (line) {
  return line + ' The harness directory is **untracked, not git-ignored** (it appears as `??`, not as an ignored path).';
});

write('smoke-report-r2.md', md);

// --- json -------------------------------------------------------------------------------------------------------

const r2 = JSON.parse(JSON.stringify(orig));
r2.schema = 'ig-smoke-report/2';
r2.revision = {
  id: 'r2', kind: 'wording corrections only: no rerun, no admission, no retry, no repair',
  supersedes: [{ file: 'smoke-report.json', sha256: origJsonSha }, { file: 'smoke-report.md', sha256: origMdSha }],
  originalFilesUnchanged: true, generatedAt: new Date().toISOString(), generator: 'driver/r2/make-report-r2.cjs',
  corrections: [
    'ig05-test and the ig10-test gate group started and timed out: incomplete, not unstarted, not proven source failures',
    'no claim that loader-parity exercised noop-expose: the only completed row is native; puzzle parity untested',
    'frontier-hooks applies textually but has a stale refusalReason exposure (not declared in rating-v3 digger.js)',
    'the pinned harness is the accepted IG-S10 r2 snapshot (' + PACK_FP + '), not the r3 harness; the harness directory is untracked, not git-ignored'
  ]
};
r2.overall = { oneLine: ONE_LINE, status: 'partial-capability-smoke', acceptedAs: 'partial capability smoke, not a compatibility or parity pass (astra-ig)',
  originalOneLine: orig.overall.oneLine, originalStatus: orig.overall.status };
r2.harnessPin = {
  identity: 'accepted IG-S10 r2 snapshot', packFilesOnlyFingerprint: PACK_FP, shortFingerprint: '8f0018b5c36d',
  equalsIgS10R2WriterFingerprintInPackChecklist: true, isR3Harness: false,
  fingerprintWithSmokeFiles: orig.identity.harness.fingerprintWithSmokeFiles,
  currentImproveGeneratingHarness: { fingerprint: stale.harnessFingerprint || null, differingFiles: stale.differing || null, onlyThere: stale.onlyInReference || null,
    note: 'read only at the inspection; the r3 harness per astra-ig; not what the smoke tested; still changing during the smoke' },
  harnessDirectoryInSmokeWorktree: { path: 'generator/tests/artifacts/improve-generating/', gitStatusEntry: '?? generator/tests/artifacts/improve-generating/', trackedByGit: false, gitIgnored: false }
};
const gitLines = (orig.git && orig.git.statusShortAfter) || [];
if (gitLines.indexOf('?? generator/tests/artifacts/improve-generating/') < 0) throw new Error('r2: harness status line not in the recorded git status');
const refExposure = orig.textualApplicability.exposedIdentifiers.find(function (e) { return e.adapter === 'frontier-hooks' && e.name === 'refusalReason'; }) || {};
r2.staleExposure = [{ adapter: 'frontier-hooks', identifier: 'refusalReason', textualApplicability: 'applies (5/5, compiles)',
  declaredInRating_v3Sources: refExposure.inSmokeSources === true, declaredInOlderRuntime: refExposure.inOlderSources === true,
  evidence: ['frontier-test.pure adapter.anchors: "digger.js declares refusalReason"', 'profile.refusal anchor `function refusalReason(value) {`: 1 occurrence in the older runtime, 0 in rating-v3'],
  executed: false }];
r2.textualApplicability.adapters.forEach(function (a) {
  if (a.id === 'frontier-hooks') {
    a.textualStatus = 'applies-textually-with-stale-exposure';
    a.staleExposure = 'refusalReason is exposed but no longer declared in rating-v3 js/engine/digger.js';
  }
});
r2.textualApplicability.combinations.forEach(function (c) {
  if (c.adapterIds.indexOf('frontier-hooks') >= 0) c.note = 'applies textually; stale refusalReason exposure';
});
r2.perTask.forEach(function (t) {
  if (t.task === 'IG-S04' || t.task === 'IG-S05') t.textual = 'applies textually; stale refusalReason exposure';
});
r2.pureTests.forEach(function (t) {
  if (t.status === 'timeout') {
    t.classification = 'started-timed-out-incomplete';
    t.unstarted = false;
    t.provenSourceFailure = false;
    t.terminationVerified = t.termination ? t.termination.verifiedGone === true : null;
  }
  if (t.id === 'frontier-test.pure') t.classification = 'failed-on-stale-exposure';
});
r2.failures.forEach(function (f) {
  if (/^frontier-test\.pure/.test(f.where)) f.code = 'stale-exposure (test exit 1)';
});
r2.failures.unshift({ where: 'adapter frontier-hooks (used by IG-S04, IG-S05)', kind: 'stale exposure (applies textually)', firstFailingFile: 'js/engine/digger.js',
  firstFailingAnchor: 'exposes refusalReason, which is no longer declared', code: 'none from the loader', detail: 'the exposure names an identifier absent from rating-v3 digger.js (not run)' });
const lp = r2.canaries.loaderParity;
lp.noopExposeExercised = false;
lp.completedRows = lp.completedKeys;
lp.puzzleParity = 'untested (only the native row completed; both noop-expose rows unstarted; no pair compared)';
r2.canaries.selfTest.noopExposeNote = 'the self-test case engine-loads-and-discovers-catalogue loaded a noop-expose instance and checked its hook (no puzzle generated); a self-test canary, not loader-parity';
r2.incomplete = {
  startedAndTimedOut: orig.pureTests.filter(function (t) { return t.status === 'timeout'; }).map(function (t) {
    return { what: t.id, ranMs: t.wallMs, terminatedByPid: true, terminationVerified: t.termination ? t.termination.verifiedGone === true : null,
      classification: 'started-timed-out-incomplete', provenSourceFailure: false };
  }),
  unstarted: unstartedRows.map(function (u) { return { what: u.what, kind: 'unstarted row', reason: u.reason }; }),
  notRunToCompletion: ['the cases of ig07-test after its crash on profile.objective']
};
delete r2.unstartedOrTimedOut;
r2.notTested = [
  'puzzle parity between the native and the no-op-patched loader is NOT tested: the only completed loader-parity row is native; both noop-expose rows were unstarted',
  'semantic parity of any adapter on the rating-v3 runtime is NOT tested',
  'textual applicability does not run the patched code; frontier-hooks applies textually but exposes the missing refusalReason',
  'ig05-test and the gate group of ig10-test are incomplete (started, timed out); ig07-test crashed on its first adapter transform; none is a pass',
  'the completed engine-free tests use fakes and the real source text; none generates a puzzle; the evidence-dependent groups were not run',
  'no performance, timing, throughput or pool-width figure was measured; no adapter was repaired',
  'IG-S06, rows 706-709 and every frozen-gate run are out of scope; IG-S03 and IG-S05 plan-only is blocked by absent provisional-r1 evidence'
];
r2.git.harnessDirectoryUntrackedNotIgnored = true;
r2.driver.revisionR2 = { generator: 'driver/r2/make-report-r2.cjs', note: 'pure derivation from the unchanged smoke-report.json and raw receipts; its hash is in hash-manifest-r2.json' };
write('smoke-report-r2.json', JSON.stringify(r2, null, 2));
process.stdout.write('smoke-report-r2 written\n');
