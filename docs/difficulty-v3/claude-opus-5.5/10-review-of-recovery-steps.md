# Sudoku difficulty-v3 — review of the recovery steps MS05r5p, MS05r5 and MS05r5m

| Field | Value |
|---|---|
| Date | 2026-11-14, 02:20 (+07:00) |
| Reviewer | SA1, claude-opus-5.5 (S-OD4: the analysts cross-review the remaining MS05 steps) |
| Author of the pack | SA2, gpt-6-astra |
| Basis | The task files at `1ae831c` (MS05r5p with Addendum A1), the plan author's answer to CV6-03 ((c1), (c2), sub-questions (1)-(3)), SA1's conditions (i)-(iii) for the deep tier, check-list section 7 |
| Code examined | The uncommitted working tree on `rating-v3` at `1ae831c`. The steps were told apart with the backup refs: `refs/dv3-wip/MS05r4-stop-20261113-1335` has the same code as `1ae831c`; MS05r5p is `1ae831c` to `MS05r5p-done-20261113-2320`; MS05r5 is that ref to `MS05r5-done-20261114-0025`; MS05r5m is that ref to the working tree. The 63 files that are tracked in the MS05r5 ref but untracked in the tree are unchanged since then |
| Runs | None. Read-only `git` and file reads; no test, generation or tool run (the developers' locked runs are in progress) |
| Changes made | This file only. No code, task, record or evidence was edited; nothing was staged or committed |
| Result | 0 Blocking, 1 Major (IR02, resolved by Addendum B1 to MS05b3 in section 5), 3 Minor (IR01, IR03, IR04) |

## 1. What holds

Line numbers are those of the working tree unless a commit is named.

**MS05r5p (size defaults, store intent, A1, replays).**

- (c2) is implemented as one function:
  - `SG.digger.defaultMaxAttempts(cellCount)` returns 8 up to 81 cells, 4 up to 144 and 2 above
    (`generator/js/engine/digger.js:632`). The direct digger uses it with `model.cellCount` (1818ff).
  - The pipeline uses it through `SG.variants.cellCountOf(def)` (`pipeline.js:77`, `registry.js:324`), with no model
    build and no random draw. The multi-grids declare their sizes (`multigrid.js`) and the registry validates them.
  - An explicit number wins. `digger.js` loads before `pipeline.js` in all four script lists.
- The store keeps `attemptsExplicit`:
  - `storedAttempts` migrates a legacy 8 once (`store.js:503-511`).
  - A URL `attempts` is explicit (`applyUrlPatch`, 372-380), and a link carries `attempts` only when it is explicit
    (410).
  - Replays follow RS01: `nextAttempts` keeps the intent when the recorded number equals the replayed board's default
    and `source` is `'app'` (550-559).
  - A cleared field sends `{ attemptsExplicit: false }` (Addendum A1; `controls.js:210,799-804`).
- The history and cache routes run the real `SG.app.generate`, and a mutation check rejects a changed source label.
  The export route runs the real merge of `defaults()` with the overrides.
- The three closure diagnostics ran once each at 256. All are valid, unique, not exact and carry both warnings:
  - G13 at 2 attempts: 21.6 s;
  - mega12 seed 3 at 4 attempts: 23.8 s;
  - mega16 seed 3 at 2 attempts: 107.2 s.
- (c1) is untouched: no offer, budget or level changes.
- CV6-04 (the legacy 8 on boards of at most 81 cells) is open and non-blocking, as recorded.

**MS05r5 (inventory, exact selection, results, shard plan).**

- `SG.test.list` is the read-only twin of `run`. Result rows carry `ordinal`, which MS05r6b's key
  `(app, suite, ordinal)` needs.
- The substring filter is unchanged (`core/tests/harness.js:499,509`). `--exact` is case-sensitive.
- `--results` is `complete` only for a full, unbailed run on an unchanged fingerprint. A zero selection exits 1 and
  writes nothing.
- Both inventories are complete. The manifest claims every row exactly once; MS05r5m refreshed it (3,207 rows).
- MS05r6a's `--exact` pin runs and MS05r6b's shard reconciliation can use these flags as written.

**MS05r5m (the mega Nightmare contract).** SA1's conditions all hold:

- **(i) A tool, not a suite.** `generator/tests/mega-contract.js` is not a discovered suite, a CI step or the
  `SG_DEEP` branch. The quick suite `mega-contract` tests the pure helpers on synthetic records and small classic6
  requests.
- **(ii) One request per locked run.**
  - Each of the 14 occurrences ran once, serially, in its own process, under one 500,000 ms budget.
  - The records are keyed by occurrence id, and a CV5 repeat is an independent generation.
  - `--reconcile` generates nothing, and the reuse interface refuses any identity mismatch.
- **(iii) The quick tier keeps two real checks:**
  - a real one-attempt mega12 Nightmare request (seed 3, `{ maxAttempts: 1 }`, all invariants and the
    requiredness and warning contract; `mega.test.js:810-818`);
  - a scripted mega16 stop control (but see IR01).

Every assertion of the old `checkInvariants` (`mega.test.js:682-707`) is one of the 15 deep checks, and so are the
CV5 relations. The deep checks rate each puzzle again independently for the exact flag and the warnings. All 14 records
pass; 0 of 14 are exact, all shallow fallbacks. The inventory difference is exactly four removed Nightmare tests and
4 + 37 added tests.

## 2. The four points asked

### 2.1 The mega16 control at the Expert tier

**Yes**, the control proves the four properties. Each one lives in code that does not depend on the level:

- **Attempts:** `defaultMaxAttempts(model.cellCount)`.
- **Warnings:** `digger.js:1991-1996`, from `best.exact` and `isComplete`.
- **Override:** `options.maxAttempts !== undefined`.
- **Errors:** no `catch` in `digger.js` (lines 279, 726, 1008, 1137, 1811) can swallow a budget or cancellation error.
  Each rethrows everything except its own guard code, or only attaches the work and rethrows.

The control does not run the one Nightmare-only branch: the odd samples on the top tiers (`spec.proposal`,
`digger.js:1918`). Their dig step rates for real, refines downward and offers to the keeper (1375-1392). That branch
is exercised elsewhere:

- in the quick tier, by the real mega12 one-attempt smoke;
- on mega16, by the seven deep records (2 of 2 attempts and both warnings in each).

The remaining gap is fidelity: the three tests are named "mega16 nightmare" but run Expert. That is IR01.

### 2.2 MS05b3 and the record reuse

**Not ready.** The task prefers reusing r5m's records, but the reuse cannot be computed inside the runner-loaded
`variants` suite, and the task does not specify the Node-side route (IR02). Since MS05r5p, the live path is bounded,
and the task already allows it (lines 256-257). Addendum B1 (section 5) binds that route and the checks around it.

### 2.3 The mega16 deep times and the guards

The reporting is honest and nothing hides a timeout:

- A budget or cancellation error of a request becomes a `generation-error` record with its code
  (`fixtures/mega-contract.js:521-527`).
- A check that runs out of budget leaves its checks `null` and the correctness `unevaluated`, never `pass` (375-388).
- `overApplicationGuard` counts every produced request over 120 s. It is 0 of 7 on mega16, with a maximum of
  116,951 ms.
- The per-board guard is reported only when all seven requests of the board completed (`guardOf`, 917-936).
- The numbers recompute exactly:

| Board | Rule | Guard | Margin | Share |
|---|---|---:|---:|---:|
| mega16 | 1.5 × 116,982 ms = 175,473, rounded up | 180 s | 63.0 s | 35.0 % |
| mega12 | 1.5 × 25,259 ms, rounded up | 40 s | 14.7 s | 36.9 % |

The 97.5 % of the application guard is 116,982 / 120,000. The evidence states it, together with S-AV03.

One caveat is about the conditions of the measurement, not the arithmetic (IR03): "none over 120 s" was measured
synchronously, with trace off, in Node on this server. It is not the application's run.

### 2.4 MS05r5p and MS05r5 against MS05r6a and MS05r6b

Nothing breaks a contract. The expected consequences hold:

- G13 and G14 regenerate at 2 attempts, as MS05r6a plans.
- The large-board hashes change, as MS05r6a B.4 already accounts for.
- G13's persistence touches neither `SOURCE_FILES` nor the two tool files, so it does not affect r5m's records.

Two weaknesses of the hand-over to MS05r6a and MS05r6b remain (IR04):

- `--reconcile` exits 0 even when the records no longer match the sources.
- The open CV6-04 fix round would change `generator/js/ui/store.js`. That file is in `SOURCE_FILES` and so in the
  records' `sourceHash`, but generation never calls it.

## 3. Findings

| Id | Severity | File:line | Summary |
|---|---|---|---|
| IR01 | Minor | `generator/tests/suites/mega.test.js:820-950` | The "mega16 nightmare" control runs at Expert, so the Nightmare-only proposal branch never runs on a mega16 model in the quick tier |
| IR02 | Major (resolved by Addendum B1) | `tasks/difficulty-v3/MS05b3-bounded-manual-corpora.md:204-218, 311`; `MS05r6b-quick-gd-and-combined-acceptance.md:128, 250` | The preferred record reuse cannot run in the runner-loaded suite, and the task leaves the alternative unspecified |
| IR03 | Minor | `docs/difficulty-v3/evidence/MS05r5m/evidence.md` (guards table, S-AV03 row) | The 120 s application guard is compared with a synchronous trace-off Node measurement |
| IR04 | Minor | `generator/tests/fixtures/mega-contract.js:1007-1011, 1128-1131`; `MS05r6a-final-evidence-and-pins.md:92-95`; `MS05r6b-quick-gd-and-combined-acceptance.md:123-126` | The deep-record compatibility check is not enforced by the exit code, and a store-only change would void all 14 records |

### IR01 — Minor: the mega16 control runs at Expert

`mega.test.js:881,932,945` run `difficulty: 'expert'`. The reason (line 822) is that the Nightmare tier rates its
proposal samples for real. The properties are proven (section 2.1), but the test names claim Nightmare and the quick
tier never runs a top-tier attempt loop on a 256-cell model.

**Fix.** With the scripted full-grid sample, a Nightmare run is cheap. Each proposal's real rating is of a solved full
grid, and `refineDown` returns at once because that score is below the band. So, preferably, add one Nightmare-tier
run of the size-default test. It asserts:

- 2 attempts, `exact` false and both warnings;
- `rated.calls` equal to the proposal samples it ran (the odd ones) instead of 0.

Otherwise rename the describe so that it says it runs the policy at the Expert tier.

**When.** Before MS05r6b freezes the quick manifest, because the names are inventory keys. This does not block MS05b3.

### IR02 — Major: MS05b3's record reuse cannot run as the task assumes

MS05b3 prefers the records `mega16-invariant-1/2` and `mega12-invariant-1/2/3` (lines 206, 311). It must match the
source, default and tool identities before decoding, and share CV3's exact checker (lines 212-213). Every route it
allows needs a design the task does not give:

- **Inside the `variants` suite.** The runner gives suites `SG.test.node = { fs, path, vm, root }` and no `require`
  (`generator/tests/node-runner.js:271`). So the suite cannot compute the current `sourceHash` or `toolHash`, nor
  supply the `sha256` that `SG.fixtures.megaContract.reuse` requires (`fixtures/mega-contract.js:1156-1189`).
- **A task-owned Node replay entry point.** It would have to load the harness, the fixtures and the manual suite
  outside the runner to call the registered CV3 checker. The task does not specify how.
- **The tool files.** The task does not forbid editing `generator/tests/mega-contract.js` or
  `generator/tests/fixtures/mega-contract.js`. Either edit changes `toolHash` and makes all 14 records stale.

A developer would have to invent this route, or skip the identity match.

The live route is bounded now. The CV3 corpus runs
`SG.pipeline.run({ variantId, difficulty, seed, trace: 'off' }, null, 240 s)` (`tests/manual/variants.test.js:75-78`).
These are the same requests as the deep records, on the same engine source `fee8b8d6…`, so r5m's times are their
projection:

- mega16, seeds 1 and 2: 116.951 + 103.606 ≈ 221 s;
- mega12, seeds 1 to 3: ≈ 71 s.

Step 4 of the task already allows this route (lines 256-257).

**Fix.**

- **MS05b3:** Addendum B1 (section 5).
- **MS05r6b (Astra):** B1 line 128 and T06 (line 250) should read "b3's mega16 seeds 1/2 and mega12 seeds 1/2/3 CV3
  outcomes (live under Addendum B1), reconciled with the deep records of the same requests". They should not read
  "reuse".
- **Anchor:** MS05b3's harness reference (line 106, `core/tests/harness.js:503,518-519`) is now at 499 and 509 after
  MS05r5, with its meaning unchanged.

### IR03 — Minor: the measurement behind "97.5 % of the 120 s guard"

The deep tool drives `SG.pipeline.run` synchronously, with `trace: 'off'` (`fixtures/mega-contract.js:506`), in Node on
the development server. The application guard is 120,000 ms of active worker time (`js/worker/gen.worker.js:97`,
`worker-client.js:45`). It applies to a cooperative worker run with the default trace `'summary'`, because
`SG.store.toConfig` leaves `trace` out (`app.js:874`), and it runs on the user's machine.

So "3.0 s left" says that `mega16-invariant-1` sits at the guard, not that it fits under it in the application.

**Fix.** Add one sentence to S-AV03 when MS05r6b reconciles the items, or to `notes.md`: "measured synchronously, with
trace off, on the development server; under the application's conditions the seed-1 request is at or over its 120 s
guard; availability is decided by MS18c's (c1) qualification (7 of 7 over the 30 s p95)". No new measurement is needed.

### IR04 — Minor: the deep-record compatibility check

`reconcile` reports `identity.currentMatches`, but `exitCodeOfReconciliation` ignores it
(`fixtures/mega-contract.js:1007-1011,1128-1131`). Stale records therefore still exit 0.

The records' `sourceHash` covers the whole `SOURCE_FILES` list (`tests/node-runner.js:39-103`), including
`js/ui/store.js` and the other UI modules. The open CV6-04 "MS05r5p legacy-8 migration fix round" (before MS05r6b)
would change only `store.js`, which `SG.pipeline.run` never executes. Even so, all 14 records would fail the match.

MS05r6a (lines 92-95) and MS05r6b B1 (lines 123-126) allow a compatibility proof only for G13-only recorder or loader
changes.

**Fix (pack text for MS05r6a and MS05r6b, Astra).**

- Read `identity.currentMatches` explicitly: exit 0 is not compatibility.
- When it is false, list the changed `SOURCE_FILES`.
- A change confined to files that `SG.pipeline.normalizeConfig` and `SG.pipeline.run` do not execute keeps the
  records, by that exact-diff compatibility proof. Examples are the store and the other UI modules.
- Any other change regenerates the affected records with the one-request tool. Never patch a digest.

## 4. Not findings

- The three tool helpers that are not hashed are deliberate and recorded: the loader of `tests/replay-fixtures.js` and
  the level guard of `tests/fixtures/tool-records.js` are used unchanged. MS05r6a's G13 work touches the recorder parts
  of `replay-fixtures.js`, not `loadFixtures` or `nodeEnv`.
- The MS05r5p normalize rule makes a number that is not its board's default explicit, even when the state carries the
  `defaults()` marker (`store.js:254`). It is consistent with RS01: the export merge keeps a recorded number. Every
  caller that combines `defaults()` with another variant also passes a number. The only exceptions are the store's own
  `set` and `applyUrlPatch`, which set the number first.
- MS05r6c can use r5m's refreshed manifest (`mega-contract` in `own-fast`, the four new `mega` tests).

## 5. Addendum B1 to MS05b3 (binding; SA1, 2026-11-14)

**The mega Nightmare CV3 cells.** Check them through the normal live selectors. Do not reuse r5m's records in this
task. The reason: a runner-loaded suite has no `require` (`SG.test.node` is only `fs`, `path`, `vm` and `root`), so the
`variants` suite cannot compute the `sourceHash` and `toolHash` that `SG.fixtures.megaContract.reuse` must compare. A
Node replay entry point would also have to load the harness, the fixtures and the manual suite outside the runner. The
live path is bounded since MS05r5p, and step 4 already allows it.

1. **Run the two cells live.** After the CV3 split, run one locked `Invoke-Dv3Node` command per cell, with
   `-AllowExit1`, `--verbose` and a fresh `--results` file under `docs/difficulty-v3/evidence/MS05b3/cv3/`:
   - `'--suite=variants','--filter=> variants: mega16 > CV3 nightmare:'`
   - `'--suite=variants','--filter=> variants: mega12 > CV3 nightmare:'`

   Preflight each with `--list-tests` (selected total 1).
2. **Projection.** It comes from MS05r5m's records of exactly these requests: `{ variantId, difficulty: 'nightmare',
   seed, trace: 'off' }` through `SG.pipeline.run`, engine source `fee8b8d6…`.
   - mega16, seeds 1 and 2: 116.951 + 103.606 s, about 221 s;
   - mega12, seeds 1 to 3: about 71 s;
   - plus registration and checks.

   Both are under the 450-second projection rule and far from the unchanged 240 s request guard.
3. **Expected outcome.** In the extracted `checkSupportedLevel`, keep the current order: every per-puzzle assertion of
   the level first (`variants.test.js:193-208` at `1ae831c`), then the aggregate `exact === 0` failure (209-211).
   Each cell should then pass every per-puzzle assertion and fail only the aggregate: "mega16 nightmare: none of 2
   puzzles hit it", and for mega12 "none of 3". MS05r5m found every one of these requests to be a shallow fallback.
   Record each as a failed availability assertion:
   - S-AV03: 0 of 2;
   - S-AV02: 0 of 3.

   Give the per-request times from the transcript, route both to MS07e and then MS18c, and continue; it is not a stop.
   The task's own rules still apply: any other failing assertion is a correctness stop, and a request over 240 s is a
   named item.
4. **Confirm the records match.** Before the two commands, run this from `generator`. It generates nothing and takes
   under a second, so check-list section 7 does not require the lock:

   ```powershell
   node tests\mega-contract.js --reconcile=..\docs\difficulty-v3\evidence\MS05r5m\records --json=..\docs\difficulty-v3\evidence\MS05b3\mega-reconciled.json
   ```

   - **If `identity.currentMatches` is true for both hashes:** r5m's records of the same requests on the same engine
     carry the invariant, uniqueness, soundness, requiredness and warning checks that the task asks for in these
     cells beside CV3. Cite them by occurrence id.
   - **If either is false:** record the changed files. The live CV3 outcomes stand on their own, and MS05r6b
     reconciles them.
5. **What not to touch.**
   - Do not edit `generator/tests/mega-contract.js`, `generator/tests/fixtures/mega-contract.js` or any file of
     `SOURCE_FILES`.
   - Build no record provider, no replay entry point and no reuse code.
   - In the CV3 manifest, label both cells `generation: live` and name the r5m occurrence ids of the same requests
     (`mega16-invariant-1`, `-2`; `mega12-invariant-1`, `-2`, `-3`). MS05r6b then reconciles live outcomes, without
     double-counting generation.
6. **Anchor.** The harness's substring filter is now at `core/tests/harness.js:499,509` (it was 503 and 518-519); its
   meaning is unchanged.

RECOVERY STEPS REVIEWED: 0 blocking, 1 major (IR02, resolved by Addendum B1), 3 minor (IR01, IR03, IR04)

## 6. Verification of IR02/IR04

Checked on 2026-11-14 at 02:45 (+07:00). Basis: SA2's uncommitted pack edits on top of `1ae831c` in
`tasks/difficulty-v3/` (`MS05b3`, `MS05r6a`, `MS05r6b`, `check-list.md`), read with `git diff` and in the working
tree. The orchestrator's summary rows and the MS05r5, MS05r5m and MS05r5p Execution logs were not reviewed. Nothing
was edited, staged or committed. The only run was one read-only Node computation (about 2 s; no engine, no
generation) that recomputed the two record identities (see "The producer snapshot").

| Check | Status | Evidence (working-tree lines) |
|---|---|---|
| 1. B1 is recorded faithfully in MS05b3 | Verified | MS05b3:343-395 is identical, line for line, to section 5 (53 lines). The note at 27-30 makes it binding and retires the reuse route |
| 2. MS05r6a and MS05r6b say "b3's live CV3 outcomes" | Verified | MS05r6a:43-44, 102, 128-130, 311-312; MS05r6b:44-46, 122, 160-168, 220, 290-291, 309 (T02), 313 (T06), 342 |
| 3. Explicit `currentMatches`, exact-diff proof, named refresh | Verified | MS05r6a:93-125 (audit) and 151-176 (MS05r6a-MEGA-REFRESH); MS05r6b:122-168 (audit), 170-193 (MS05r6b-MEGA-REFRESH) and 333-334 (stop rule) |

**Check 1 in detail.**

- The body of MS05b3 now follows B1 without a contradiction:
  - the scope (36) and the assertion order (133);
  - the rewritten CV3 section (199-230): live selectors, a `--list-tests` preflight, `-AllowExit1`, `--verbose`,
    fresh `--results`, the reconcile first and without the lock, both `currentMatches` members read explicitly,
    S-AV03 and S-AV02, `generation: live`, and the deep times kept apart from the live ones;
  - the file list (243, 251-252), step 4 (263-264), T04 (282), the test plan (318) and the handoff (331).
- The word "reuse" left at 93, 279 and 292 is about the corpus caches, not the deep records.
- Checked against the code:
  - the CV3 request is r5m's request (`generator/tests/manual/variants.test.js:77-78`), and the expected failure text
    is the one at 209-211;
  - the CLI always fills `currentMatches` as `{ sourceHash, toolHash }` (`generator/tests/mega-contract.js:213-214`;
    `fixtures/mega-contract.js:1007-1011`);
  - the `--json` target is project-relative from `generator`, its folder is created and an existing file is refused
    (`core/tests/node-evidence.js:210-232, 244`);
  - check-list section 7 requires the lock only above 10 s (line 568), and the reconcile took 0.499 s of Node time
    in MS05r5m.

**Check 2 in detail.** The former MS05r6b lines 128 and 250 named in IR02 are replaced. The check-list follows at
135-141, 194, 473, 658, 664 and 769-791. Row 471 keeps the recorded CV6-03 text ("may be reused") and adds that B1
implements the live route. That is right: the decision allows the reuse, it does not require it.

**Check 3 in detail.**

- MS05r6a A, items 1 to 5:
  - both members must be `=== true`, and exit 0 is no compatibility;
  - the changed files are listed against the hash-bound producer snapshot, not against HEAD or the records' commit;
  - the proof: neither `SG.pipeline.normalizeConfig` nor `SG.pipeline.run` executes the change, and initialization,
    normalization, RNG, generation, independent validation, recording and relations are unchanged, with the tool
    identity matching;
  - a store-only CV6-04 fix can qualify; a `js/ui/` path alone is no proof;
  - otherwise the named step MS05r6a-MEGA-REFRESH.
- MS05r6b B1 repeats the audit on the final tree ("Revalidate r6a's IR04 compatibility proof against the actual final
  tree", line 136), with its own named step MS05r6b-MEGA-REFRESH. This also catches a change made after r6a's audit.
- Both refresh steps: one locked request per occurrence, the unchanged 500 s budget, a complete new cohort under one
  identity, the old records kept, and an exit 3 inspected rather than taken at face value.
- Checked against the code:
  - a mixed identity is an evidence problem (`fixtures/mega-contract.js:952, 1076-1094`), so a partly refreshed
    directory exits 1; the whole-cohort rule is right;
  - `exitCodeOf` returns 3 for an error or unfinished checks (683-686);
  - `currentIdentity()` is exported, and requiring the tool runs nothing (`mega-contract.js:247-249, 270-275`);
  - the tool hashes only its two files and passes no extra file to `identity([])`, so `replay-fixtures.js` and
    `tool-records.js` are outside both hashes (`mega-contract.js:41-44, 64-71`; `replay-fixtures.js:33-36, 123-129`);
  - G13's persistence touches only recorder files outside both hashes, so "changes neither mega hash" holds.

**The producer snapshot.** MS05r6a (109-111) and MS05r6b (140-143) ask the orchestrator for "the hash-bound producer
snapshot". It exists: `refs/dv3-wip/MS05r5m-done-20261114-0230` (`ad77fdf`). Recomputed with the tool's formula over
that ref's blobs, the identities are sourceHash `fee8b8d6…` and toolHash `2bff3a04…`, equal to all 14 records. The
working tree gives the same two values now. So:

- name this ref in the MS05r6a and MS05r6b dispatch briefs;
- MS05b3's reconcile should report both members true unless a `SOURCE_FILES` or tool file changes. If it does not,
  give the developer the ref for the diff.

**Unhashed helpers.** Besides `loadFixtures`, `nodeEnv` and `withRequestedLevel`, the tool uses
`toolRecords.canonicalJson` (the wire digests, the manifest hash and the comparisons;
`fixtures/mega-contract.js:112-119, 254, 538, 822`) and `core/tests/node-evidence.js` (output only). The tasks'
general clause ("any changed tool/shared-loader/helper files") covers both, and a `canonicalJson` change would show
up as digest problems at the reconcile. No change is needed.

**IR01 and IR03** are closed as well: the controls are renamed "mega16 size-default controls (scripted, Expert
tier)", with the reason (`generator/tests/suites/mega.test.js:820-829`), and the S-AV03 row states the measurement
conditions (`docs/difficulty-v3/evidence/MS05r5m/evidence.md:253`).

### New minor items

| Id | Severity | File:line | Finding and fix |
|---|---|---|---|
| IR05 | Minor | `MS05r6c-ci-test-tiers.md:67`; `MS05b2-required-exactness-consumers.md:15`; `MS05d-select-shallow-budget.md:20`; `MS05r6-combined-recovery-acceptance.md:21` | They still say "b3's CV3 checks/reuse", "its CV3 deep reuse", "b3 CV3 reuse/items" and "b3's own CV3 checks of reused puzzles". MS05r6c copies its wording into both CI workflows. Fix: "b3's live CV3 outcomes (Addendum B1)"; before MS05r6c is dispatched |
| IR06 | Minor | `MS18e-release-evidence-closure.md:99-101, 171`; `check-list.md:672` | MS18e may reuse compatible records for the final CV3 mega cells and "apply its own checks to those records". IR02's cause applies there too: the runner-loaded `variants` suite cannot compute the identities. Fix before MS18e: run the final CV3 mega cells live as in B1, with the deep records as cross-references, or specify a Node-side route with its own tests. Line 171: "r6b's live CV3 outcomes" |

Neither item blocks MS05b3, MS05r6a or MS05r6b. MS05b3 needs no further addendum.

IR VERIFIED: IR02 and IR04 are fixed as intended; minor follow-ups IR05 and IR06 for SA2.

## 7. Review of MS05b3

Reviewed on 2026-11-14 at 06:50 (+07:00). MS05b3 is implemented and uncommitted (S-OD2 step evidence). Its changes are
the difference against `refs/dv3-wip/MS05r5m-done-20261114-0230` in the six manual suites, `generator/tests.html`,
`generator/design.md` and both developer guides, plus the new `generator/tests/fixtures/manual-corpus.js`,
`generator/tests/suites/manual-corpus.test.js`, the task tools in `generator/tests/artifacts/difficulty-v3/MS05b3/` and
`docs/difficulty-v3/evidence/MS05b3/`. The tree also holds the running MS05r5p legacy-8 round (`store.js`,
`store.test.js`, some design text); that round is not reviewed here. Nothing was run, edited, staged or committed. The
overlap figures of 7.3 were computed in PowerShell from `runs.jsonl` and Pentomino's
`tests/artifacts/MP12b1/invocations.jsonl`, which share the local clock.

### 7.1 Point 1: correctness and contract fidelity

**Order and seeds: the lazy getters keep both.**

- `SG.test.lazyCorpus(keys, build)` (`generator/tests/fixtures/manual-corpus.js:42-66`) defines one getter per key, in
  key order. The first read calls `build(key, originalIndex)` once and keeps the array. A build that throws publishes
  nothing, so the next read starts again from the first request, as the old caches did.
- Every adapter takes the seed from the original index, with the old formula:
  - Killer: seeds 1 to `countOf(level)` per level (`killer.test.js:70-78`);
  - Jigsaw: `700 + li * 100 + i`;
  - Greater-Than and Wordoku: `100 * (li + 1) + i`, Wordoku with its placement cycle by `i`;
  - extra-regions: `10000 * (vi + 1) + 100 * li + i`;
  - `variants`: seeds 1 to `perLevel` for each supported level (`variants.test.js:87-120`).
- The parity baseline is the right one: the old snapshots come from `HEAD`, and `HEAD`'s six manual suites equal the
  tree before MS05b3 (no difference against the MS05r5m backup ref). 1,213 request plans and 8 real prefixes are
  identical.
- The quick suite writes the seed formulas from the task's table, not from the code. It checks one key alone, the
  natural order, the reverse order and the aggregate, and it notices a changed formula.
- No consumer in the six suites sorts, splices or otherwise changes a cached array in place. So Killer's `corpusOf` may
  return the cached array instead of the old filtered copy.
- What stays assumed is the engine invariant that a request's result does not depend on the earlier requests of the
  process (I4, CV5). Every MS05b3 cell generated its level alone in a fresh process, and the 1,213 request counts show
  that no level-selected test generated another level.

**The aggregate still forces every level.**

- Killer's `corpus()` reads every level in `LEVELS` order (`killer.test.js:83-90`). The `allPuzzles` helpers of
  Greater-Than (210-214), extra-regions (191-195) and Wordoku (124-128) do the same. `variants`' `ctx.corpus()` reads
  every supported level before it returns (`variants.test.js:112-116`).
- `checkLevels` (240-243) runs every supported level, then the refusals. Two quick tests confirm that
  `sweepVariant(def, { only: ['CV3'] })` still gives one verdict, and that the `sweepMoving` regression (corpus first,
  floor raised, CV4 fails on I6) still holds.
- One nuance, not a finding: the aggregate now generates level by level, so after the first failing level it no longer
  generates the later ones in that call. The first failure message is the same, and CV4 to CV6 still force every level
  through `corpus()`.

**The refusals still bind.**

- `checkUnsupportedLevels` (`variants.test.js:230-238`) is the old loop. Every level of `SG.difficulty.LEVELS` that the
  variant does not list goes through the real `SG.pipeline.run`, and only a `GenerationError` with the code
  `difficulty.unsupportedLevel` passes (`isCode`). A returned puzzle or any other error fails.
- It is registered as `CV3 unsupported:` for every variant and reads no corpus (434-445). The 17 refused requests of the
  four variants with unsupported levels passed.
- For the 11 variants that support every level, the test asserts nothing, exactly as the old loop did for them. It
  binds as soon as a level leaves `difficultySupport`.

**The rest of the contract.**

- `checkSupportedLevel` (205-227) keeps every per-puzzle assertion before the aggregate `exact === 0` failure and the
  DEEP threshold (B1 item 3). `CHECKS` keeps one CV3 entry.
- Killer I5 is registered per level, with the strict `hits > countOf(level) * 0.8` as its last assertion
  (`killer.test.js:1070-1095`). Wordoku's hit-rate assertion is also the last one (`wordoku.test.js:786`). So the 19
  cells that fail only their aggregate assertion passed every per-puzzle assertion. `outcomes.json` has 167 passes,
  6 failed hit rates and 13 "none of N".
- Addendum B1:
  - the reconciliation ran before the first cell (02:37) and after the last one (06:15), with both `currentMatches`
    members `true`;
  - the two mega cells ran live and locked, with `-AllowExit1`, `--verbose`, a fresh `--results` file and a preflight
    of selected total 1;
  - their manifest rows say `generation: live` and list `r5mOccurrences`;
  - no file of the tool, its fixture or `SOURCE_FILES` changed.
- (c1): no offer, level, count, threshold or guard changed. Every miss is a named availability item.
- `SG_CORPUS_TIMES=1` (beyond the brief) only prints request times in Node and does nothing in a browser. It is
  documented in design §15.4 and both guides. Accepted.
- The two lifted deferrals (`-RetryDeferred`) were explicit and recorded. The CV3 one is bounded by the 240 s request
  guard. The I5 Jigsaw Master revision rested only on the helper's 540 s limit, because the I5 corpora pass no guard.
  It took 2.8 s, which is acceptable here, but a lifted deferral should name a bound.

### 7.2 Findings

| Id | Severity | File:line | Summary |
|---|---|---|---|
| IR07 | Major | `generator/tests/artifacts/difficulty-v3/MS05b3/run-cells.ps1:72-82, 153-171`; `docs/difficulty-v3/evidence/MS05b3/manifest.json` (`timingSlot`); `tasks/difficulty-v3/check-list.md:298, 555-569` | Generation cells projected above 10 s ran unlocked under a 10 s kill timer. The evidence stands, but the rule needs a clear sentence before MS05r6b |
| IR08 | Minor | `tasks/difficulty-v3/MS05r6b-quick-gd-and-combined-acceptance.md:212-216`; `tasks/difficulty-v3/MS05r5p-legacy-8-fix-round.md:125-137` | MS05b3's 186 early manual results need the store-only exact-diff proof stated explicitly |
| IR09 | Minor | `docs/difficulty-v3/evidence/MS05b3/evidence.md:96-102, 139`; `run-cells.ps1:187` | Two statements of the evidence are inaccurate |

#### IR07 — Major: unlocked generation under a 10-second kill timer

**What happened.**

- `manifest.json`, written before the first cell, planned 129 cells as "first tried for at most 10 s without the
  lock". Many had projections above 10 s, for example `i5-killer-normal` 31 s and `i5-jigsaw-expert` 39 s.
- 134 cells finished unlocked: 224.5 s of process time, the longest 10.011 s.
- 25 were stopped at 10 s (250 s) and run again under the lock.
- The preflights (`--list-tests`, about 190, under a second each) also ran unlocked; that is allowed.

**The rule.** Check-list §7 puts every command "expected to exceed 10 seconds" under the helper (lines 555 and 568),
and §2 every "possibly >10-second" one (line 298). A generation command projected above 10 s is such a command. A kill
timer does not make it short, as the 25 stopped attempts show. Pentomino's check-list has the same rule ("can take more
than about 10 seconds").

**Effect on MS05b3's evidence: none of it is invalidated.**

- Correctness and availability are deterministic here. The digger's limits are work limits (allowance 256; 8, 4 or 2
  attempts), and the only clock in these requests is the 240 s CV3 guard, which no unlocked cell came near.
- A stopped attempt left no results: the sequencer deletes the file, and the cell ran again under the lock.
- Only the times of the 134 unlocked cells are not slot-protected. They are marked `slot: none` in `runs.jsonl` and
  `outcomes.json`.
  - The time numbers of the S-AV items come from locked runs. The exceptions are the descriptive request times of
    S-AV10 (Wordoku Normal) and S-AV13, which are availability items.
  - MS07e, MS18c, MS18d and MS18e must not use a `slot: none` time as a protected measurement.
- The contention was real: `i5-killer-normal` was stopped at 10 s while Pentomino's `22x22-master` ran, and then took
  9.5 s under the lock.

**Effect on Pentomino:** section 7.3. The stakes are higher for what comes next: MP12b2's captures have wall-clock
limits (180 to 570 s).

**Fix.**

- Before MS05r6b is dispatched (it runs many shards and may copy this sequencer), Astra adds the following to
  check-list §7, and the orchestrator to MS05r6b's dispatch brief: "Without the lock, run only commands known to be
  short: registration-only listings (`--list-tests`), `--reconcile`, parity or plan scripts that generate nothing, and
  commands measured under 10 s on the same source. A command that generates puzzles and whose projection is above
  10 s, or unknown, runs under `Invoke-Dv3Node` from the start. A kill timer is no exemption: no unlocked trial runs."
- Later tasks do not reuse the unlocked-trial path of `run-cells.ps1` (lines 153-171).

#### IR08 — Minor: the store-only proof for MS05b3's manual results

- MS05b3's 186 results carry the evidence fingerprint `c3035e80…`. It covers the runner, the harness, the sources, the
  fixtures, the quick suites, the guides, the design and the manual suites.
- The legacy-8 round now edits `generator/js/ui/store.js`, `store.test.js` and design text. So that fingerprint
  changes before MS05r6b, together with the deep `sourceHash`.
- The round's hand-off (`MS05r5p-legacy-8-fix-round.md:125-137`) names only the deep records and MS05r5p's diagnostics.
- MS05r6b C (lines 212-216) keeps early manual data only when "its application ... identities match", and names the
  file-diff proof only for "golden/pin/instruction publication". Read strictly, a store change is an application
  change, and 186 cells (about 2,380 s of process time plus lock waits) would run again.

**Fix (Astra, before MS05r6b).** State in MS05r6b C that the same file-diff proof as B1's exact-diff exception covers
MS05b3's I5, CV3 and refusal rows for that round's changes: the approved store-only CV6-04 change, its documentation
and its quick-suite changes. The reason: the manual corpora call `SG.pipeline.run` with explicit requests, and the
changed `storedAttempts` is not on that path. Record the diff, and keep MS05b3's JSON unchanged.

#### IR09 — Minor: two inaccurate statements in the evidence

- `evidence.md:139` says the live mega times are "within 0.3 % of the deep ones".
  - That holds for mega16 (−0.14 % and +0.29 %).
  - mega12's live requests are 0.9 %, 1.9 % and 3.6 % faster: 23.509, 23.067 and 22.790 s against 23.721, 23.520 and
    23.637 s. The likely reason is that the three live requests share one warm process, while each deep record had its
    own.
- `lockWaitSeconds` is wall time minus process time (`run-cells.ps1:187`).
  - For the 25 escalated cells it includes the stopped 10 s attempt and the 15 s gap, so "7,948 s of waiting" (line
    102) is not pure lock waiting.
  - MS05r6b's standing-cost report (`excludedWork.lockWait`) must not import these values as lock waits.

**Fix:** correct both sentences in the step evidence before the combined commit.

### 7.3 Point 2: can it matter for Pentomino's MP12b1? (the pentomino pack author's view, for MP12b2)

**What overlapped.** Of the 159 unlocked windows (474.5 s of single-thread work, 03:09 to 06:12), 112 overlapped an
MP12b1 invocation: 351.3 s in all, in 22 cases.

| Pentomino case | Overlap (s) | Case's invocation time (s) | What the criteria use |
|---|---:|---:|---|
| `22x22-master` | 11.4 | 197.8 | 20 of 20 rows complete, max T10 16.2 s |
| `24x24-nightmare` | 18.6 | 601.8 | 20 of 20, max T10 64.0 s |
| `26x26-hard` | 4.0 | 82.0 | 20 of 20, max T10 4.9 s (reference bound 9.4 s: pass) |
| `26x26-master` | 19.0 | 256.0 | 20 of 20, max T10 23.3 s |
| `26x26-nightmare` | 1.0 | 496.7 | 20 of 20, max T10 35.8 s |
| `14x14-hell-1` prescreen | 28.0 | 422.3 | 1 accepted puzzle: it goes on to its 20 requests |
| 16 other Hell prescreens | 1.5 to 45.4 | about 347 each | no puzzle in 3 requests, each to the 115 s dispatch stop |

The 16 other prescreens, with their overlap in seconds:

- Hell 1: 15x15b10 2.0, 16x16 21.5, 15x20 33.9, 18x18 1.5, 18x20 45.4, 20x20 7.0, 20x21 12.0, 32x15 10.0, 22x22 15.9;
- Hell 2: 15x20 27.3, 18x18 20.1, 18x20 6.0, 20x20 26.5, 20x21 18.8, 32x15 18.3;
- Hell 3: 32x15 3.0.

`24x24-hell-1` (2 puzzles) ran after the last Sudoku cell.

**What is sensitive to time.**

- A landscape request has a wall-clock limit (`core/engine/policy.js:68`, `TIME`: dispatch stop 115 s, response
  120 s). The T10 and response times are wall times.
- Everything else is work-bounded and deterministic for a seed:
  - the generation client folds candidates in a fixed slot order, whatever the workers' timing
    (`core/browser/generation-client.js:1057-1061`);
  - the census (`DEDUCE.census` 80,000,000), the caps (C5), the proved real choice (C3) and a puzzle's score count
    work, not time.
- So contention can change an outcome only for a request that reaches its limit.

**How much contention.** The machine has 8 cores and 16 logical processors (EPYC 7763). A landscape row uses a main
thread and 4 workers (`--workers 4`), and the Sudoku process one thread: at most about 6 busy threads, so no
oversubscription. What remains is shared cache, memory and clock speed: a few percent at most during the overlap. The
`i5-killer-normal` observation of IR07 points the same way.

**The criteria.**

- **C2** (Hard and Expert completion): the only overlapped Hard or Expert cell is `26x26-hard` (4.0 s). All its rows
  finished, the slowest in 4.9 s, far below the 115 s stop. Unaffected.
- **C1, C3, C4, C5:** all five overlapped cells that are not Hell finished 20 of 20 rows, the slowest in 64.0 s, far
  below the stop. So their puzzles and ratings are those of an idle machine. Unaffected.
- **Hell prescreens** (P-OD9, D36 (i); MP12b3's `AREAS`):
  - Contention only removes work. Its only possible bias is therefore towards "no puzzle", that is towards not
    offering a level, never towards a false offer.
  - The worst case is `18x20-hell-1`: 45.4 of 346.7 s overlapped (13 %). With a few percent of slowdown during the
    overlap, the lost work is under 1 % of the case. That is immaterial for an outcome of no puzzle in three requests
    that each ran to the stop.
  - `14x14-hell-1` made its puzzle anyway.
- **Times** (T10, response times, the "long times" items):
  - The 22 cases may carry up to a few percent more inside the overlapped seconds. These times are descriptive
    (P-OD9) and decide no criterion.
  - The maximum of the 16 no-puzzle Hell rows is the 115 s stop itself.
  - No reference-row status is near its bound: `26x26-hard` has 4.9 s against 9.4 s, and the 22x22 and 26x26 Master
    rows already fail by more than twice their bounds.

**View for MP12b2's record.**

- MP12b1's evidence stands. No re-run, and no C1 to C5 verdict, list or `AREAS` input changes.
- MP12b2 records a named item (P-OD9), "MP12b1 measurement-slot exception (MS05b3, 2026-11-14 03:09 to 06:12)", in
  §1 (machine time and lock waits) and §13, with the table above. It marks the T10 and response times of these
  22 cases "not slot-protected for the overlapped seconds".
- One safeguard. MP12b2's captures, under the lock, cover the 16 no-puzzle cases: HL covers 13 of them with the
  landscape's seed, and H covers the other 3 (15x20 and 18x18 Hell 2, 32x15 Hell 3) with D21's seed. If one of those
  captures accepts a puzzle, MP12b2 runs that case's prescreen again under the lock, with MP12b1's command and the
  same seeds. The clean prescreen then decides, by MP12b1's rule, whether the case gets its 20 requests for D39.
  Without such a capture, nothing more is needed.

### 7.4 Point 3: what MS05r6a and MS05r6b need from MS05b3

- **The 46 quick tests** of `manual-corpus` (`quick-additions.json`; 2.2 to 2.4 s alone) are not in MS05r5m's
  3,207-row draft.
  - MS05r6b B lists both quick sets again after MS05b3 and reconciles "including every new case" (lines 72-74), so
    they join the final inventory there. No extra step is needed.
  - MS05r6c must give the suite a CI group; its coverage check fails a suite without one.
  - 40 of the 46 are Node-only and skip explicitly in a browser, as check-list §3 allows (line 435). In Node they run,
    so MS05r6b's "no new skip" holds. In a browser run they are explicit environment skips with their reason.
  - The quick suite probes private helper names of the six manual suites (`corpus`, `corpusOf`, `puzzleRun`,
    `allPuzzles`, `contextOf`, the CV3 helpers). A later task that renames one updates `manual-corpus.test.js` with
    it.
- **The empty `deferred-cv3.json` is right.**
  - Every one of the 186 cells has a `ran` record. The two `deferred` lines of `runs.jsonl` (`i5-jigsaw-master`,
    `cv3-mega16-hell1`) were superseded by recorded `-RetryDeferred` runs, and `outcomes.json` takes the last record of
    each cell.
  - MS05r6b C's outstanding list is therefore empty. It reconciles the 186 rows (IR08) and runs its own classic9 GD.
- **The manual inventory changed.** Killer I5 is now 9 tests. `variants` CV3 is now 118 level tests and 15 refusal
  tests, instead of 15 tests. MS05r6b C and MS18e use these names (design §15.4).
- **MS05r6a** links `cv3/cv3-mega16-nightmare.json`, `cv3/cv3-mega12-nightmare.json`, `mega-reconciled.json` and
  `mega-reconciled-after.json` (both members `true` at 02:37 and at 06:15). After the legacy-8 round,
  `currentMatches.sourceHash` is `false` by design, and MS05r6a A item 4 applies.
- **For MS18e's planning:** the final-source rerun of Jigsaw's `> expert: 20 puzzles > I5:` contains the 325 s request
  (S-AV11; the cell took 342 s). Plan it from that measurement, as one locked command. A projection from a multiple of
  the mean would refuse it.

MS05b3 REVIEWED: 0 blocking, 1 major (IR07), 2 minor (IR08, IR09)

## 8. Review of MS05r6a

Reviewed on 2026-11-14 at about 09:40 (+07:00). MS05r6a is implemented and uncommitted (S-OD2 step evidence). Its
changes are the difference against `refs/dv3-wip/MS05b3-done-20261114-0705` (`1d19101`):

- 14 changed files: the `steps`, `replay`, `player` and `replay-recorders` suites, the three E fixtures,
  `replay-recording.js`, the two recorder tools, both developer guides, `generator/design.md` and `notes.md`;
- 366 new files: `docs/difficulty-v3/evidence/MS05r6a/` and `generator/tests/artifacts/difficulty-v3/MS05r6a/`.

No engine, default, guard or tool file changed against that ref. The two clarifications files changed too, by the
orchestrator (S-OD5), not by the step. I ran nothing, and edited, staged or committed nothing. The checks below are
read-only: comparisons of the ledgers with `node`, and `git` (`ls-tree`, `diff`, `hash-object` without `-w`).

### 8.1 Point 1: correctness and contract fidelity

**A0 and A hold.**

- G13 is persisted as S-OD3 (d) asks:
  - `WIRE_IDS` is G09-G13 (`generator/tests/fixtures/replay-recording.js:32`). The recorders' headers, and the text
    they render into the fixtures, say five. The recorder still generates G13 under `BUDGET_MS` 120,000.
  - The three spy tests (`steps` #0, `replay` #25, `player` #0) empty their suite's cache for G13, replace
    `SG.pipeline.run` with a thrower and compare the result with `SG.fixtures.replayWire.G13`. They ran under the lock
    after B.1 and before B.2 (`pins/g13-branch.json`, 3 of 3).
  - The refusal case now uses `--ids=G14`, a golden id that is no wire. The old case used `G13` in that same role, so
    the negative test keeps its meaning.
- G13's guard: r4's eight-attempt preflight is rightly incompatible. The rerun of the unchanged `g13-closure.cjs` took
  21.872 s of 120 s, at 2 attempts.
- The IR04 audit: `preflight/mega-reconciled.json` has `currentMatches` `{ sourceHash: false, toolHash: true }`,
  14 of 14 records and 6 relations passing. I checked the exact-diff proof again:
  - against `ad77fdf`, the tool and its fixture, `tool-records.js`, `core/tests/node-evidence.js`, `node-runner.js`,
    `core/tests/harness.js`, `mega.test.js` and `mega-contract.test.js` are byte-identical (`git hash-object`
    against the ref's blobs);
  - in `generator/js` and `core/js` only `generator/js/ui/store.js` differs, by the legacy-8 change, and
    `replay-fixtures.js` differs only in comments and its rendered header;
  - no file of `generator/js/engine`, `generator/js/variants` or `core/js` mentions `SG.store`, and `storedAttempts`
    has one caller, the store's `load` (`store.js:733`).

  So "retained by exact-diff compatibility", with the false match value kept, is right. No MEGA-REFRESH was needed.

**E is complete and strict, and every difference has an expected cause.**

- Identities:
  - one wire and analysis `sourceHash` (`c8601561…`) in all 19 ledgers;
  - one hash `sourceHash` (`a675f650…`) and one manifest in all 104 hash ledgers;
  - 520 keys, each once; no record with an override; Node v26.13.0.
- Wires: against MS05b1's four wire ledgers, G09-G12 differ only at `/work`, the work counts that MS05r3 added. G13 is
  new.
- Analyses: the 13 analyses that MS05b1 recorded (G01-G12 and G14) are identical to MS05r6a's, request and value.
  - So the G06 and G07 change against `HEAD` is exactly MS05b1's requiredness change: the old shallow puzzles become
    required ones.
  - Neither the allowance nor the size default touches them: both are 81-cell Jigsaw requests, and MS05r6a gives
    MS05b1's values.
  - G13 and G14 equal `HEAD`'s goldens.
- Hashes: `HEAD`'s fixture equals MS05b1's ledgers. Since MS05b1 recorded them, generation changed in two ways only:
  - the allowance 256, with its passive work records;
  - since `HEAD`, the size default: `git diff 1ae831c` of the engine touches only `defaultMaxAttempts`,
    `cellCountOf` and the declared `cellCount`.

  The data fit this exactly:
  - none of the 371 keys that MS05b1 left alone changed ("new-change" 0), MS05b1's 56 shallow fallbacks included;
  - all 9 changed keys are keys that MS05b1 had improved: 5 return to MS04's puzzle and 4 give a third one.

| Key | Cells, attempts now | Hash, MS05b1 → now | Class | ms, MS05b1 → now |
|---|---|---|---|---|
| `classic9/nightmare#8` | 81, 8 | `7c4a68aa` → `345c0e52` (MS04's) | lost | 4,257 → 4,651 |
| `diagonalX/nightmare#5` | 81, 8 | `223349ab` → `5b8f8f4f` (MS04's) | lost | 1,818 → 11,942 |
| `diagonalX/nightmare#1597` | 81, 8 | `14ba46aa` → `d74675d9` | third | 4,807 → 7,741 |
| `samurai/easy#8` | 369, 2 | `41ccc16c` → `7d341450` (MS04's) | lost | 262 → 491 |
| `samurai/easy#610` | 369, 2 | `232b9a6d` → `81bfcc4c` | third | 311 → 296 |
| `samurai/easy#987` | 369, 2 | `87f119da` → `36644920` (MS04's) | lost | 353 → 429 |
| `samurai/easy#2584` | 369, 2 | `08f20279` → `957046ee` (MS04's) | lost | 1,062 → 512 |
| `butterfly/normal#610` | 144, 4 | `35c5769f` → `4598f71f` | third | 665 → 554 |
| `butterfly/normal#10946` | 144, 4 | `75b1f9cd` → `e3122262` | third | 583 → 775 |

- On the three 81-cell keys only the allowance can act. `diagonalX/nightmare#5` shows the mechanism: MS05b1 found its
  required puzzle in 1.8 s; now the capped search misses it, so the request runs all eight attempts (11.9 s) and keeps
  MS04's puzzle.
- On the six large-board keys the allowance and the size default are confounded. The evidence calls the size default
  a likely share, "an inference"; nothing recorded supports either direction (IR10).

**C holds.**

- The 13 entries take each new datum from the fresh analysis, and strict equalities stay strict.
- Every exact selection is one passed test. P10, a data table, is covered by the complete `replay` run.
- The guides' example (`classic9` easy seed 3) changed because its puzzle did: the hash key `classic9/easy#3` is one of
  MS05b1's improved and kept keys.

### 8.2 Point 2: the coverage reductions

- **No test is weakened.**
  - Each of the four branches keeps at least one exact specimen.
  - The remaining assertions are unchanged or stronger: P04 now asserts the signed details change for G11 (-5) and
    G12 (-4), and P12 asserts G11's peak 1,967 and its sentence.
  - The removed rows asserted data that the changed goldens no longer contain; kept, they would pin a falsehood.
  - These are owned pin repairs under FS29, reported in `pins/resolved.json` and in the evidence (lines 153-156), not
    edits made to let a run pass. AGENTS.md's rule holds.
- **The single reveal-fold specimen is a real check.**
  - G11's compact step 2 must fold `replay.folded.reveal`, with the sentence and the exact peak.
  - G12's plain peak, and the no-fold checks on G06, stay as well.
  - Its weakness is robustness, not strength. If G11 changes, the test fails loudly, because the row and its peak are
    asserted by name.
- **The search for replacements is incomplete for that one branch (IR11).**
  - `explore-pins.cjs` searched the 14 goldens and the guides' example only (lines 5-6, 69-125).
  - The `steps` and `replay` suites have no fixed results other than the goldens, so "none" holds for P03, P04, P06
    and P09.
  - The `player` suite, which owns the reveal-fold test, has 11 more fixed real results (`realResult`,
    `player.test.js:19-26`, and the `CASES` list at lines 220-222). They are memoised in `resultCache` and generated
    by the suite in any case.
  - One of them is a Nightmare request (`classic9` seed 5), the likeliest to fold a reveal.
  - The task asks to preserve the assertion against such an existing example before reporting "none" (task
    line 266).
- **No new golden or request.**
  - A sixth wire or another analysis request is outside the task: S-OD3 (d) adds only G13, and "any other
    request-manifest expansion" is out of scope.
  - A synthetic, non-generating test of the fold rendering would protect the branch independently of the goldens. If
    wanted, it is a named coverage item for MS18e, not this task's work.

### 8.3 Point 3: the compounds

- **They fit check-list §7 (lines 297 and 670) and IR07.**
  - Each compound is one locked `Invoke-Dv3Node` call. The evidence copy of the helper is the check-list function,
    unchanged.
  - The driver refuses a budget above 450 s (`run-shards.cjs:44`). It starts an item only when the elapsed time plus
    the item's projection fits that budget (lines 60-61).
  - Children run one at a time, each with its E route's exact arguments, and each with its own ledger or results
    file, exit code and transcript. The driver stops at the first unexpected exit and retries nothing.
  - Actual: 339.5 s (69 hash shards), 227.8 s, 220.7 s, 161.3 s, 56.0 s and 35.3 s; the longest child 139.1 s.
  - The helper's 540 s limit stops the whole process tree, children included.
  - Each Sudoku acquisition came 121 to 350 s after its previous release, with the other repository holding the slot
    in between, so the 15-second fairness gap held.
  - No generation ran unlocked. The unlocked commands generate nothing: the listings, `--reconcile`, the merges with
    `--check` or `--write`, the hash summaries, and two git-reading comparison scripts of about 10 s.
- **Nothing needs redoing.** Every shard's ledger stands on its own identity, and every compound ended far below
  450 s.
- **One weakness, for reuse (IR12).**
  - The projection is generic: the larger of 60 s and twice the slowest child so far, not the item's own.
  - In `c3` the last item, the complete `player` suite, was admitted on a 60 s projection. It took 139.1 s, and had
    already taken 138.8 s in `c1`.
  - It fitted only because it started at 88.7 s.

### 8.4 Point 4: what MS05r6b needs

See IR13.

### 8.5 Findings

| Id | Severity | File:line | Summary |
|---|---|---|---|
| IR10 | Minor | `docs/difficulty-v3/evidence/MS05r6a/evidence.md:111-129`; `tasks/difficulty-v3/MS05r6a-final-evidence-and-pins.md:222-225` | B.4's split between the allowance and the size default is an unmeasured inference on the large boards; two of B.4's points are not stated |
| IR11 | Major | `generator/tests/suites/player.test.js:691-716`; `generator/tests/artifacts/difficulty-v3/MS05r6a/explore-pins.cjs:5-6, 69-125`; `evidence.md:153-156`; `pins/resolved.json` (P12) | The reveal-fold branch was cut to one specimen without searching the player suite's 11 other fixed results |
| IR12 | Minor | `generator/tests/artifacts/difficulty-v3/MS05r6a/run-shards.cjs:60-61`; `tasks/difficulty-v3/check-list.md:297` | The compound driver's projection is generic; reuse needs per-item projections |
| IR13 | Minor | `tasks/difficulty-v3/MS05r6b-quick-gd-and-combined-acceptance.md:85-125, 312-314` | Hand-off points for MS05r6b |

#### IR10 — Minor: B.4's accounting

- B.4 asks to "account separately for the selected allowance and r5p's size-default change".
  - For the 20 combinations of at most 81 cells this is done: only the allowance acts there.
  - For the 6 large ones, the evidence says that the two causes "are not separable at E", and that the larger loss
    "points to a share of the size default, an inference".
- Nothing recorded supports that direction.
  - MS05b1 kept only aggregate attempt counts (`MS05b1/evidence.md:68`), not counts per key.
  - Its short times for three of the four samurai keys (262 to 353 ms) would rather fit an early find, which the
    two-attempt default does not remove.
  - Neither reading is measured.
- Two more points of B.4 hold but are not stated:
  - MS05b1's 56 shallow fallbacks are among the 371 unchanged keys (no key is "new-change");
  - r4's mega16 attempt-6 diagnostic hit is knowingly unavailable at the new default.

**Fix.** The orchestrator chooses (a) or (b). No E file changes in either case.

- (a) State in the evidence that the large-board split is not measured, without a direction, and add the two
  sentences.
- (b) Measure the split outside E, then add the two sentences. One locked, task-owned diagnostic uses `perf.js`'s
  requests and hash for the 9 keys:
  - (i) all 9 keys with `SG.digger.SHALLOW_SEARCH_RATINGS = Infinity` at the size default;
  - (ii) the 6 large keys at 256 with an explicit `maxAttempts` of 8.

  For the three 81-cell keys, (i) is MS05b1's configuration and must give MS05b1's hashes; this also measures
  "nothing else". It is 15 requests and a few minutes. The records are diagnostic, never E.

#### IR11 — Major: the reveal-fold replacement search

**What.**

- P12 cut the reveal-fold branch of `tells what a compact step folds …` (`player.test.js:691-716`) from three
  specimens to one (G11). The evidence says that "no other existing fixed example of the suites has those branches".
- The search behind that sentence covered the 14 goldens and the guides' example only.
- The `player` suite has 11 more fixed real results, generated by the suite anyway:
  - `classic9`: normal 3, veryEasy 1, nightmare 5;
  - `classic4` veryEasy 2; `killer`: easy 1, normal 2; `greaterThan` normal 4;
  - `jigsaw9` easy 6, `wordoku` easy 1, `mega12` easy 2, `mega16` veryEasy 1.
- The task's FS29 rule (line 266) asks to preserve an assertion against an existing appropriate fixed example before
  reporting that none exists.

**Binding fix (a short returned-fix round of MS05r6a, before MS05r6b's B inventory):**

1. In one locked command, explore those 11 requests on the current source. Use an extension of `explore-pins.cjs` or
   a new owned script, with `realResult`'s route: `SG.pipeline.run({ variantId, difficulty, seed, trace: 'off' },
   null)`, then the suite's compact view.
   - Record, per request, every compact step whose last part is `replay.folded.reveal`: its position, peak and
     restored clues.
   - Record also, for information, whether a result has a multi-move jump, a view-dependent jump or a new hardest
     technique at a flat or lower score.
2. If a request carries the reveal fold, add the first one in the order above as a second specimen of the test. Use
   its exact position and peak, `replay.folded.reveal` and the sentence pattern, and keep G11. Then:
   - run the test with `--exact` (one passed) and the complete `player` suite;
   - update P12 in `pins/resolved.json` (before, after, reason, verification) and the evidence's coverage sentence;
   - record the new quick fingerprint. The earlier focused results keep their old fingerprint as historical rows;
     MS05r6b reruns every key in any case.

   No E ledger changes, because no hashed file changes.
3. If none carries it, write the searched scope into P12 and into the evidence: "the 14 goldens, the guides' example
   and the player suite's 11 other fixed real results; none". The single specimen then becomes a named coverage item
   for MS18e.
4. For P03, P04, P06 and P09, add one sentence: the `steps` and `replay` suites have no fixed results besides the
   goldens.

No new golden, wire or request.

#### IR12 — Minor: per-item projections when the compound driver is reused

MS05r6a's evidence needs no change. MS05r6b runs many quick shards of very different sizes and may reuse
`run-shards.cjs`.

**Fix.** The orchestrator puts the following in MS05r6b's dispatch brief, and Astra puts it in check-list §7 if she
agrees:

> A task-owned compound driver may be reused only if:
>
> - every item carries its own projection: a measurement on the same source, else a stated conservative bound;
> - the driver admits an item only when the elapsed time, plus the larger of that projection and the generic floor,
>   fits 450 s;
> - an item whose own projection exceeds 450 s runs alone;
> - the items are independent, and each writes its own results or ledger and exit code;
> - the driver stops at the first unexpected exit.

#### IR13 — Minor: hand-off points for MS05r6b

- **Order.** IR11's returned fix, if it edits `player.test.js`, comes before MS05r6b's B inventory. MS05r6a records
  the new fingerprint with its P12 runs; MS05r6b does not relabel older rows.
- **Names.** MS05r6b B reconciles r5's draft (its lines 85-86) with:
  - three new full names: the G13 spy tests, `steps` #0, `replay` #25 and `player` #0;
  - seven renamed ones, six in `replay` and one in `steps`: the jump counts and the specimen lists in test names.

  Treat the seven as renames, not as missing plus unexpected keys. MS05b3's 46 new tests join as before. If a
  MS05r6c CI group selects by full name, it uses the final names.
- **E stays valid through MS05r6b's A.** The guides, AGENTS.md and the designs are not in E's hashes; MS05r6b's three
  merge checks (lines 312-314) confirm it. Any engine, UI or recorder change needs fresh affected ledgers.
- **Standing cost.** MS05r6a's suite times are a first locked sample at fingerprint `00345dc1…`, not the final report:
  - S-AV08: `steps` 11.5 s, `replay` 11.1 s, Generator `player` 139.1 s, `mega-contract` 2.0 s, `replay-recorders`
    8.0 s, `perf-tooling` 11.6 s;
  - the Generator `player` suite is the longest single shard.
- **Coverage.** The reductions of P03, P04, P06, P09 and P12 (or IR11's outcome) go into MS05r6b's combined audit
  (T03) as named coverage notes, and on to MS18e.
- **Carried items.** MS05r6b keeps IR07's `slot: none` labels and IR08's store-only proof, as the step's hand-off
  says, and its B1 revalidates the deep proof on the final tree.

### 8.6 For Pentomino (the pentomino pack author's view)

- MS05r6a's locked commands alternated with MP12b1's 20-request Hell runs.
- Its unlocked commands generated nothing; the largest were the two git-reading scripts, of about 10 s each on one
  thread.
- Neither can move a completion verdict or a 115 s time-limit outcome of MP12b1. No new item for MP12b2.

MS05r6a REVIEWED: 0 blocking, 1 major (IR11), 3 minor (IR10, IR12, IR13)

## 9. Review of MS05r6b

Reviewed on 2026-11-14 at about 11:50 (+07:00). MS05r6b's changes are the difference between
`refs/dv3-wip/MS05r6a-done-20261114-1005` (`2c58d93`) and `refs/dv3-wip/MS05r6b-done-20261114-1130` (`cba0ca6`); the
working tree has moved on since (MS05r6c is running, and PR-S2 is committed as `92a7693`, the parent of the r6b ref).
I ran nothing, and edited, staged or committed nothing in the sudoku tree apart from this section. Every check is
read-only: `node` over the evidence JSON (scripts piped on stdin, no file written) and `git` (`diff`, `ls-tree`,
`cat-file`, `hash-object --stdin-paths` without `-w`).

What the step changed, ref against ref:

- documents: `AGENTS.md`, both developer guides, `generator/design.md`, `player/design.md`, `notes.md` and the new
  `docs/difficulty-v3/recovery-quick-cost.md`;
- `docs/difficulty-v3/evidence/MS05r6b/` and the scripts of `generator/tests/artifacts/difficulty-v3/MS05r6b/`;
- MS05r5p's returned fix for R6B-F01 (`history.test.js`, `cache.test.js`, its evidence under `MS05r5p/r6b-f01-fix/`)
  and the orchestrator's log rows.

No file of `generator/js`, `core/js`, `player/js`, the fixtures, the manual suites, the runner or the tools changed.

### 9.1 Point (a): the audit's claims

Checked against the final result files, apart from the step's own reconciler:

- MS05b1: every cited key exists with that title and passed on `7d3102d3…`: `pipeline` #97-#101 (T01), #102-#107 (T02),
  #108-#119 (T03) and #120-#126 (T04); `events` #64, `i18n` #57, `cache` #19 and `worker` #54.
- The absorbed duties, with the counts the audit gives, all passed:
  - `difficulty-diagnostics` 82, `recovery-profile` 27, and the 20 `MS05r3` tests (`pipeline` 16, `worker` 2, `cache` 1,
    `recovery-profile` 1);
  - the 45 `MS05r5p` tests, with the six `MS05r5p-CV6-04` cases at `store` #73-#78; `store` 85, `controls` 46, `history`
    15, `export` 78, `variants-registry` 12;
  - `harness` 25, `mega` 111, `mega-contract` 37, `manual-corpus` 46, `steps` 57, `replay` 153, `player` 69,
    `replay-recorders` 39, `help` and `ui-contract` 97.
- `SHALLOW_SEARCH_DEFAULT = 256` is at `generator/js/engine/digger.js:668`; `defaultMaxAttempts` gives 8, 4 and 2.
- E: the three final merge checks (`logs/e4` to `e6`) say "recorded from the current sources": 5 wires, 14 analyses,
  104 ledgers with all 520 keys unchanged.
- GD: one identity (`d33389ac…`), complete, stable, no bail. 153 of 154 keys, 151 passed; the two failures are the
  hit-rate assertions (`expected 21 to be >= 90`, `expected 86 to be >= 90`); `generator/difficulty/130` (the
  confusion matrix) is missing, and the tool's verdict is `incomplete`.

The claims hold; one verdict word overstates (IR16).

### 9.2 Point (b): quick coverage, renames and compounds

- **Coverage, recomputed.**
  - Generator: the 7 final shards carry one identity (`7d3102d3…`, Node v26.13.0, factor 2, complete, stable, no
    bail, no registration error). Their 3,262 keys equal the final inventory's: 0 missing, duplicate or unexpected, 0
    full-name differences, 0 skipped, all passed.
  - Player: `quick/player-all.json` equals the final inventory listed after the fix (`1d0724c3…`), 1,683 of 1,683.
  - The 159 Generator and 130 Player fingerprint files in the r6b ref hash exactly to the inventories' per-file SHA-256.
- **Renames.** From MS05r5m's inventory (3,207 tests) to the final one (3,262):
  - exactly 10 full names disappear (`replay` 6, `steps` 1, `replay-recorders` 3);
  - 65 appear: the same 10 renamed, plus 46 `manual-corpus`, 6 `store` and the 3 G13 spy tests.

  The 10 pairs of `quick-final/inventory-migration.json` are one-to-one; each differs only in a specimen list, a count
  or G13. R6B-F02's three `replay-recorders` pairs (#1, #16, #38, from MS05r6a A0) were missing from my IR13 list. The
  step treats them correctly.
- **Compounds (IR12).**
  - All 39 admission records satisfy `elapsed + max(projection, 60) <= 450`, with the elapsed time taken before the
    item; gd1, projected at 449 s, ran as a compound of one.
  - Every child stayed within its projection, and no compound passed 450 s (gd1 430.6 s, f1 309.0 s, f2 337.5 s). No
    item was left unstarted.
  - Expected nonzero exits (the two GD hit-rate children, the diagnostics) were declared in advance and kept as
    failures.
  - The final f1 and f2 projections are the first run's measurements of the same suites, with stated margins of 1.2
    to 2.7 times. The `player` suite was admitted on its own 180 s.
  - One projection was not conservative (IR17).

### 9.3 Point (c): the compatibility proofs

- **Deep records: the proof holds.**
  - `git diff ad77fdf cba0ca6` of `generator/js` and `core/js` is `store.js` alone (+8 -6).
  - The tool, its fixture, `tool-records.js`, `node-evidence.js` and the runner are unchanged; `replay-fixtures.js`
    differs only in comments and the header text.
  - `rawCurrentMatches` `{ sourceHash: false, toolHash: true }` stays as the tool wrote it. MEGA-REFRESH was rightly not
    run.
- **The 22 GD results: the proof holds.** Only `history.test.js` and `cache.test.js` differ from `d33389ac…`. The
  runner loads only the selected suites' files (`generator/tests/node-runner.js:325-332`), so a `--suite=difficulty`
  process does not even load them.
- **b3's 186 results: the proof holds**, with one wording correction (IR18).
  - The six documents and the seven quick suites are not loaded by a manual selection.
  - `store.js` is the legacy-8 patch, which no engine, variant, core or manual code calls.
  - The two tools (`tests/replay-fixtures.js`, `tests/replay-goldens.js`) are not loaded by the runner.
  - The four changed files under `tests/fixtures/` are loaded but never read (IR18).

### 9.4 Point (d): the combined commit

Nothing in the step's evidence blocks the combined commit. Two things around it need action first:

- IR14 and IR15: stale durations, and one CI claim that is false on the combined tree, in `AGENTS.md`, the guides and
  the Generator design. Fix them before MS05r6c's final quick runs.
- IR19: MS05r6c's document edits since the r6b ref change all three fingerprints, so MS05r6c's own rule makes it run
  both complete quick sets again.

### 9.5 Findings

#### IR14 — Major: `AGENTS.md` promises "about eight minutes" for the heavy tier and says CI runs `--all`

- `AGENTS.md:26-27`, which r6b did not change: "`node tests/node-runner.js --all` and `--manual` in `generator/` (the 8
  suites of `generator/tests/manual/`: about eight minutes; CI runs `--all` before each deploy);".
- Both halves are false on the combined tree:
  - the duration: the Generator quick set alone measured 646.7 s; the GD runs of the `difficulty` suite took 579.9 s
    of process time without the confusion matrix (the Nightmare batch 430.5 s); b3's 186 manual cells took about
    2,380 s;
  - the CI claim: MS05r6c's workflows run the quick tier only (`.github/workflows/pages.yml:3-17`), and the developer
    guide already says "CI does not run `--all`" (`DEVELOPERGUIDE.md:873-874`).
- A's rule is "the report reference, not a guessed inline duration in AGENTS/guides", and this line is such a
  duration. `AGENTS.md` is r6b's exclusive file, and MS05r6c's file list does not include it, so MS05r6c cannot fix it.
- `AGENTS.md` is an input of both quick fingerprints. Fix it **before** MS05r6c's final complete quick runs, which
  MS05r6c must make anyway (IR19); a fix afterwards costs another complete run of both apps.
- Fix (binding text; by an addendum that adds this one line to MS05r6c's files, or by a returned fix of r6b):

  ```text
    - `node tests/node-runner.js --all` and `--manual` in `generator/` (the 8 suites of `generator/tests/manual/`: the
      heavy tier, far longer than the quick set; CI does not run it, see DEVELOPERGUIDE.md "Continuous integration");
  ```

#### IR15 — Minor: the same stale durations in the guides and the Generator design

- `DEVELOPERGUIDE.md:855-856` ("8, about eight minutes"; "about nine minutes") and `:870-871` ("about eight minutes
  together"; "quick and manual, about nine minutes").
- `DEVELOPERGUIDE.vn.md:610-611` and `:625-626` ("khoảng tám phút", "khoảng chín phút").
- `generator/design.md:1888` ("about 1,020 tests and eight minutes together"; "58 suites, about nine minutes").
- "About nine minutes" for `--all` is less than the measured quick set alone (646.7 s), and the heavy-tier figure is
  far below its measured parts.
- Fix: remove the durations and keep the counts that are true (8 suites, 58 suites), at the same time as IR14.
  MS05r6c owns these paragraphs now (workflow and tier facts), so this belongs in the same addendum.

#### IR16 — Minor: `audit.md` §4 marks MS05d-T04 "Met", but the classic9 GD is not complete

- MS05d routes "complete classic9" GD to MS05r6b. One test did not run: `generator/difficulty/130`, the confusion
  matrix. Its eight batches in one process project to about 505 s, above C's 450 s rule. `gd/reconciled.json` says
  `incomplete`.
- The step recorded this honestly (S-AV15, `evidence.md`, the Execution log). Only the audit's verdict word overstates.
- The matrix counts `p.achieved` (`generator/tests/manual/difficulty.test.js:1334`), and a shallow fallback's
  `achieved` is its requested level (`:1266`). So Nightmare's 21 of 100 exact does not predict the matrix's outcome;
  the outcome is unknown.
- Fix: relabel the row "Met except one unexecuted test (S-AV15, not passing coverage)" when the orchestrator fills the
  acceptance. No rerun.

#### IR17 — Minor: the GD Nightmare projection was not conservative

- Every other level shard was projected as the pilot mean x requests x 2 + 10 s. Nightmare used the pooled mean of 20
  requests x 100 + 10 s = 448.4 s, "rounded up to 449 s, just under the 450 s limit" (`shard-runs.jsonl`,
  `gd-classic9-nightmare`). By the formula of the other levels it is more than 830 s, which C makes an unexecuted
  population.
- The run is valid, and I do not ask for a redo: it ran alone, took 430.551 s under the 540 s ceiling, and the IR12
  admission arithmetic holds.
- For MS07e and MS18c: at this source the classic9 GD Nightmare batch takes 430.5 s, 96 % of the 450 s budget and 80 %
  of the 540 s ceiling. A rerun states a margin, or treats the batch as a population above 450 s; 449 s is not a bound
  to reuse.

#### IR18 — Minor: one sentence of the b3 manual proof

- `gd/manual-compatibility.json` and `-final.json` say the changed fixtures are files "which no selected manual suite
  executes or reads".
- But `generator/tests/node-runner.js:290-299` loads every file of `tests/fixtures/` in every process. So
  `regression.js`, the `replay-goldens.js` fixture, `replay-wire.js` and `replay-recording.js` run at load in each
  manual process.
- The conclusion stands, for three reasons:
  - their changes are data under `SG.fixtures`: E's hash values, the G13 wire and analysis records, `WIRE_IDS`;
  - none of them calls into generation at load: each defines data or helpers and nothing else;
  - no selected manual suite reads them (the step's scan).
- Fix: none required. MS18e reads "loaded, never read" when it audits the proof.

#### IR19 — Info, for the MS05r6c review: r6b's quick rows no longer match the tree

- Since the r6b ref, MS05r6c changed `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` and `generator/design.md`. They are
  inputs of the Generator, Player and manual fingerprints. Hashed with CRLF normalised against the inventories, 3, 2 and
  3 files differ.
- MS05r6c's own rule applies (its lines 75-80 and step 4): regenerate both inventories, and run both complete quick
  manifests with new results.
- The b3, GD and deep proofs need only a re-check without generation on the final fingerprints: the change is documents
  only.
- The hand-off says "any grouping now passes". That was checked only in the default order and the three diagnostic
  pairs. MS05r6c's CI groups are new combinations, so its final run should execute them as grouped.
- Make the edits of IR14 and IR15 first, so that these runs happen once.

MS05r6b REVIEWED: 0 blocking, 1 major (IR14), 4 minor (IR15, IR16, IR17, IR18), 1 info (IR19)

## 10. Review of MS05r6c

Reviewed on 2026-11-14 at about 12:40 (+07:00), against `refs/dv3-wip/MS05r6b-done-20261114-1130` (`cba0ca6`).
MS05r6c's own changes:

- `.github/scripts/generator-suites.sh`, both workflows, and the new `generator-quick.json`, `generator-quick.js` and
  `generator-quick.selftest.js`;
- `AGENTS.md`, both developer guides, `generator/design.md` and `notes.md`;
- `docs/difficulty-v3/evidence/MS05r6c/` and `generator/tests/artifacts/difficulty-v3/MS05r6c/`.

The orchestrator's edits are left out: `docs/architecture.md` (R6C-I03), the IR16 relabel in `MS05r6b/audit.md`, the
task files and the clarifications. I ran nothing, and edited, staged or committed nothing in the sudoku tree apart
from this section. The checks are read-only: `node` over the evidence JSON (piped on stdin), `git`, and reading the
scripts and workflows.

### 10.1 Point (a): fidelity to MS05r6c, CV6-03 (2) and S-OD4

- **One manifest, both workflows.** Both run `bash .github/scripts/generator-suites.sh` (`selftest`, `check`, `matrix`,
  then `run "$GROUP"`). The test matrix is built from the plan job's output, so the jobs and the manifest cannot
  drift apart.
- **Shared coverage in both apps.** The 16 shared suites run in the Generator environment (shard `core-shared`) and in
  the Player environment (`node tests/node-runner.js`). `test-core` is kept beside them, not instead of them.
- **Shards.** The 7 shards are MS05r6b's whole-suite shards. Each runs as its own node command, from an argument
  array (`spawnSync`, no shell, no `eval`).
- **Time limits and factor.** Nothing is raised:
  - pull request: core 15, generator 30, player 15 and browser 30 minutes, as before;
  - Pages, which had no limits: core 15, generator 30 and player 15 minutes; the new plan job has 10 on both;
  - `SG_TIME_FACTOR` and `continue-on-error` appear nowhere outside comments.
- **Budgets.** Projection = 180 s + 3 x the shard bounds: 630, 840, 1,260 and 720 s, and 360 s for the Player, all
  under 1,800 s. Every bound covers r6c's final measurement (pipeline 287.2 s of 360 s, the Generator `player` suite
  138.0 of 180, own-fast 165.1 of 220).
- **What stays out of CI.** The deep tier and the manual suites stay out, and both workflow headers name what replaces
  them:
  - r5m's 14 records, reconciled by r6b;
  - b3's live CV3 outcomes;
  - r6b's GD and b3's corpora;
  - r6a's E;
  - the owners MS07e, MS17b, MS18c, MS18d and MS18e.

  `outOfCi` lists the 8 manual suites and the 4 tools, and `check` fails if a manual suite enters a shard.

### 10.2 Point (b): the coverage check and its self-test

- **`check` registers** the whole Generator quick set, each shard and the Player's quick set with `--list-tests`, so no
  test runs.
- **`validateCoverage` then fails on any of these:**
  - the runner's quick suites differ from the folders;
  - a quick suite has no shard;
  - a shard names a manual or an unknown suite;
  - a shard's runner selection differs from the manifest, selects another suite's test, or a suite in it selects no
    test;
  - a key is missing, appears twice or is unexpected (key and full name), or a full name repeats;
  - an inventory is incomplete or has a registration error;
  - a manual suite is undeclared, or a declaration is stale;
  - a tool is missing;
  - a shared suite is missing from the Player;
  - a job exceeds 30 minutes, or a bound is missing or above 450 s.
- **The self-test** has exactly 50 expectations. It covers each failure above on synthetic plans, and the runner's exit
  rules: every shard runs after a failure; a signal or a failed start is a failure; the exit is 0 only when all pass.
  The parser is strict.
- **The real check** (`logs/check.txt`, kept in `check/`) passed on the final fingerprints: 3,262 of 3,262 keys in
  exactly one shard; 1,683 Player tests in 30 suites.
- **The paths CI uses also work.** The temporary folder `generator/tests/artifacts/ci-quick-*` is outside every
  fingerprint: `artifacts` is a skipped folder, and the Player fingerprint has no `generator/` path. So the Player's
  registration there is accepted. No such folder was left behind.

### 10.3 Point (c): the workflow logic

- `plan-generator` runs `selftest` and `check`, and writes `matrix` as one JSON line
  (`{"include":[{"group","name"}...]}`) to `$GITHUB_OUTPUT`.
- `test-generator` takes `needs: [test-core, plan-generator]` and
  `matrix: ${{ fromJSON(needs.plan-generator.outputs.matrix) }}`, with `fail-fast: false`. The group reaches the shell
  through `env`, not by expression.
- If the plan fails, `test-generator` is skipped, and Pages' `deploy` (`needs: [test-generator, test-player]`) is
  skipped with it. An empty output would fail `fromJSON`, so the gate fails closed.
- Unchanged, and still in place:
  - `deploy`, its environment and its publication steps, main-only triggers and `concurrency`;
  - the pull request's triggers, permissions, `concurrency` and `test-browser` with its screenshot upload.

  Pages never had a browser job.

### 10.4 Point (d): the final quick runs as evidence for the combined commit

- **Recomputed results.** The 7 shard results carry one identity: `6b40d218…`, Node v26.13.0, factor 2, complete,
  stable, no bail.
  - Their 3,262 keys equal the final inventory: 0 missing, duplicated or unexpected, 0 full-name differences, all
    passed.
  - Player: 1,683 of 1,683 on `547e4a4e…`.
  - Each shard's argv is the CI command plus `--results`.
  - The runs were locked (`runs.jsonl`, waits of about 0.1 s); the preflights were unlocked, registration-only and
    under 1 s.
- **The tree still matches.** All 159 Generator and 130 Player fingerprint files hash, line ends normalised, to the r6c
  inventories. `docs/architecture.md`, `notes.md` and the evidence are in neither fingerprint, so the orchestrator's
  later edits do not touch these rows.
- **Compared with r6b.** The test keys, names, kinds and skips are identical. Only `AGENTS.md`, both guides and (for
  the Generator) `generator/design.md` differ.
- **The proofs that need no generation** (IR19 asked for this re-check; r6c did not record it). I checked it here:
  - r6b's manual fingerprint `549646ee…` (167 files) differs from the final tree in exactly those four documents.
    Documents are hashed, never executed, so b3's 186 results and the 22 GD results stay retained under the same
    exact-diff exception;
  - no runtime source changed, so the deep records' proof (`store.js` only) and E's three merge checks stand as r6b
    recorded them.

### 10.5 Point (e): the combined commit

Nothing blocks it. The addendum is applied:

- IR14: `AGENTS.md:26-28`. Its pointer to "Running the tests", paragraph "Continuous integration", is right; my text
  named a heading that does not exist.
- IR15: no stale suite duration remains in `AGENTS.md`, the guides or the designs.
- IR19: one final pass on the frozen documents.

### 10.6 Findings

#### IR20 — Minor: `generator-suites.sh` has no final newline

- `.github/scripts/generator-suites.sh` ends without a line feed (`git diff`: "No newline at end of file"); the r6b
  version had one. Its LF endings are right (`.gitattributes`).
- Fix: add the final LF. The file is in neither quick fingerprint, so no run is repeated; the orchestrator can do it
  before the commit.

#### IR21 — Info: what the first pull-request run tests for the first time (R6C-I01, R6C-I02)

- The local evidence is Node 26 on Windows with factor 2. CI is Node 24 on Linux with factor 3, so the first pull
  request run is the first execution on that platform.
- One known difference:
  - Node 26 has a global `localStorage` (the `ExperimentalWarning` in the logs), and Node 24 does not;
  - `generator/js/ui/cache.js:334` and `generator/js/ui/history.js:135` fall back to `root.localStorage || null`;
  - the recovery's new store, history and cache tests inject `storage: null`, so I expect no difference.

  A failure there is a platform finding under S-OD4, not a reason to edit a test.
- Required checks: besides the four renamed generator jobs (R6C-I01), the new job "Plan generator tests" may need to
  be added to them.

#### IR22 — Info, for MS18e: two stale facts in fingerprinted designs

- `generator/design.md:2073` (§18, the "Tests (§15)" row) still says "56 suites … 48 quick … about 2,900 tests …
  about 3,910", against §15.1's 58, 50 and 3,262. r6c changed only its CI clause, correctly.
- `player/design.md:437` says the browser scripts are not part of CI (R6C-I04).
- Both files are fingerprinted, so a fix costs a quick run of the affected app. Leave them to the next task that runs
  it anyway, or to MS18e.

MS05r6c REVIEWED: 0 blocking, 0 major, 1 minor (IR20), 2 info (IR21, IR22)
