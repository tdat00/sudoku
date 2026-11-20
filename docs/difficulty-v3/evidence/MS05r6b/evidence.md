# MS05r6b evidence: the final quick sets, classic9 GD, the deep reconciliation, the standing cost and the combined audit

Evidence of the S-OD2 recovery's audit boundary (S-OD2 to S-OD4, FS28 to FS30), not an acceptance: the one combined commit
still needs MS05r6c's CI closure. **The audit is ready for the combined commit, pending MS05r6c.** The first full Generator
run found one real quick-test defect (`generator/i18n/9`, R6B-F01); SA2 decided (a), MS05r5p's fix round repaired the two
private `startApp()` helpers, and **every Generator shard was run again on the new fingerprint: 3,262 of 3,262 passed**
(sections "B" and "R6B-F01 fix and the final Generator run"; `audit.md`, "Findings"). Tree: `rating-v3` at `1ae831c` plus the uncommitted retained recovery tree (MS05b1, r1 to r4, r5p with
its legacy-8 round, r5, r5m, b3, r6a) plus this task's changes. Node v26.13.0, Windows x64, AMD EPYC 7763 (16 cores,
64 GiB), time factor 2 (`CI` and `SG_TIME_FACTOR` unset). Paths are relative to the repository root; commands run from
`generator/` (the Player quick set from `player/`). Nothing here changed an engine, a default, a guard, a request, a
fixture, an assertion, the task pack, a log, a reference or a backup.

| Identity | Value |
|---|---|
| Generator quick fingerprint (`sourceHash`, 159 files), **final** | `7d3102d3dd327f13c7d72800c2b1d157bf8c18fb20fa821cd77514bb880fdb93` (after the R6B-F01 fix: two test files changed); the same in `quick-final/generator-inventory.json`, the 7 final shard results and the tree |
| Generator quick fingerprint of the first run (history) | `bee132a83a35925cd37e4c1681ba8395103455781167b3733d4667ae019ff568` (`quick/`) |
| Player quick fingerprint (130 files) | `1d0724c34f669fddf4b6d5f5739bb42cd2c9f41332202b60335fe890f02d1dfa`, the same in the first run, after the fix and at the end: the result of the first run is the final one |
| Manual-suite fingerprint now / of the GD results / of b3's 186 results | `549646eef22a61256c7b26d3840a40a5697025e00092a9ad2b75571c512ea18e` (`gd/manual-current-listing-final.json`) / `d33389ac1bb5e8e8e81f9fedf6ee5074fd9222f364116e06a2a8abf2d7491b67` / `c3035e8032685c3ed4f5d92e0ffc0535062d460e6e6c45a908fa404ce4950bfa` |
| E identities (unchanged by A) | wires and analyses `c8601561…`, hashes `a675f650…` (r6a); the three merge checks pass on the current tree |
| Deep records (14): engine / tool hash | `fee8b8d6d7a2c47f6f2c8628a0e940da72a8c3789448a7700ad787bc044025d0` (now `a073f9bd…`) / `2bff3a04d716af19d870b82cc1760b95fe011ec1b5117735a5678e25ac48fdd8` (equal) |
| Defaults in force | allowance 256 (`SHALLOW_SEARCH_DEFAULT`, `digger.js:668`), attempts 8 up to 81 cells, 4 for 82 to 144, 2 above, no diagnostic override |

## Method and the shared-machine rule

Every command that generates a puzzle, or whose duration was not known to be under 10 s, ran under `Invoke-Dv3Node`
(`Invoke-Dv3Node.ps1`, the check-list helper, verbatim, hash `9ED1F79D…`, 20-minute wait, 540-second limit) by way of
`Run-Dv3Logged.ps1` (one record of `runs.jsonl` per helper command: exit code, process seconds, wall seconds, lock wait),
and, for several independent items in one lock turn, the task's compound driver
`generator/tests/artifacts/difficulty-v3/MS05r6b/run-shards.cjs` (IR12). No unlocked trial ran and the r6a driver and the
b3 sequencer were not reused. Not locked (IR07), each a no-generation command measured under 1 s: the registration-only
inventories and the 31 preflights (0.28 to 0.49 s each), `--reconcile`, the three E merge checks (0.41 to 0.52 s), the migration
check, the coverage reconciler, the read-only proof scripts (the git comparison took 9.5 s) and the self-tests; and
`--suite=help,ui-contract` in both apps after the guide edits (4.4 s and 1.4 s, measured at 4.5 s and 1.4 s on the same
suites before). The pilot, which generates, was locked.

**IR12 admission.** The driver refuses an item without a finite positive `projectionSeconds` and a stated basis, admits an item
only if `elapsed + max(own projection, 60 s floor) <= 450`, runs an item whose own projection exceeds 450 s alone, stops at the
first unexpected exit and retries nothing. The self-test (`run-shards.selftest.cjs`, 7 checks, scripted items, 1.2 s) covers
the refusal, the floor never replacing the projection (a 180 s item at 300 s elapsed is not admitted although 60 s would
be), the item that runs alone, the unstarted remainder and the stop. Each child's admission record (elapsed, projection,
floor, planned, verdict) is in `shard-runs.jsonl`; the generic `player` suite was admitted on its own 180 s bound
(`22.747 + 180 = 202.7 <= 450`). Compounds: `c1` (steps 30 s, replay 30 s, player 180 s), `c2` (pipeline 300 s, core-shared
150 s: `296.205 + 150 = 446.2 <= 450`), `c3` (mega 250 s, own-fast 240 s), `c4` (three 30 s diagnostics), `gd1` (Nightmare
449 s alone), `gd2` (7 levels), `gd3` (14 groups). All compounds stayed well inside 540 s; the longest helper command was
`gd1`, 430.651 s. After SA2's decision on R6B-F01 the final Generator run used two compounds with the first run's measured
times as per-item projections (stated margins, `quick-final/shard-plan.json`): `f1` (steps 30 s, replay 30 s, pipeline 360 s:
`22.575 + 360 = 382.6 <= 450`) and `f2` (player 180 s, core-shared 60 s, mega 30 s, own-fast 220 s: `175.417 + 220 = 395.4 <=
450`); every child stayed within its projection and every exit was 0.

## A: the standing instructions (FS30), before the quick inputs froze

`AGENTS.md`: the two quick comments are now "the complete Generator quick set" and "the complete Player quick set", with a
paragraph that a complete quick set is not necessarily one short command, that it is covered by disjoint shards when a
whole command cannot fit, every test once and none omitted, and a link to `docs/difficulty-v3/recovery-quick-cost.md`; the
quick-only policy, both environments for shared code and every heavy-test restriction are untouched. Both developer guides
(EN and VN, in step): the quick commands and counts (50 suites, 3,262 tests; 30 suites, 1,683 tests), the paragraph "Bounded
coverage of the quick set" (shard commands, `--list-tests` first, no `--bail`, no omission, no new skip, a stale shard run
again; the total is the sum of the shards and 540 s is a per-command limit) and the same report link in the Player tests part;
the `--all` line no longer states a test count it could not verify. `generator/design.md` 15.1 and `player/design.md` 10 say
the same. `docs/difficulty-v3/recovery-quick-cost.md` was created first with a pending status, then filled with data after
the runs. `help` and `ui-contract`: Generator 97 of 97, Player 89 of 89 after the edits. Format: CRLF, no BOM, no trailing
whitespace, final newline in all six files. These edits precede the frozen inventory, so the quick results carry their hashes.

## B: the final quick coverage

**Inventories** (registration-only, `quick/generator-inventory.json`, `quick/player-inventory.json`): Generator 3,262 tests
in 50 suites (34 own, 16 shared; 28 benchmarks, 0 skipped), Player 1,683 in 30 (19 benchmarks, 0 skipped); both complete, no
registration error, no repeated full name.

**Migration from MS05r5m's draft** (`quick/inventory-migration.json`, script `inventory-migration.cjs`; additions and renames
are distinct, never matched fuzzily): Generator 3,207 tests = 3,197 with the same full name in the same suite + 10 renames +
0 lost; 55 additions; 3,262 final. Player 1,683 = 1,683 identical, every ordinal unchanged.

| Group | Count | Source of the declaration |
|---|---:|---|
| Genuinely new: the G13 saved-wire spy tests | 3 | `steps` #0, `replay` #25, `player` #0 (`MS05r6a/pins/g13-branch.json`) |
| Genuinely new: MS05b3 `manual-corpus` | 46 | `MS05b3/quick-additions.json` |
| Genuinely new: legacy-8 store cases `MS05r5p-CV6-04` | 6 | `store` #73 to #78 (`MS05r5p/legacy-8-fix/store-final.json`) |
| One-to-one renames of IR13 (jump counts and specimen lists) | 7 | `steps` #17; `replay` #90, #91, #92, #143, #144, #145: the pairs by `(suite, ordinal)` of `pins/replay-inventory.json` against `pins/replay-inventory-final.json`, each also an entry of `pins/resolved.json` |
| One-to-one renames **not in the IR13 list** | 3 | `replay-recorders` #1, #16, #38 ("four wire requests G09-G12" became "five … G09-G13"), MS05r6a A0; the only `it(` title changes of `replay-recorders.test.js` against the r5m snapshot |

The full old and new names of the ten pairs are in `inventory-migration.json` (`generator.renames`). The ordinal shifts
caused by the insertions are listed per suite there. No other loss, duplicate or new name exists. This is inventory
provenance only: no old result row is reused.

**First run: shards and results (superseded by the final run below; kept as history)** (`quick/quick-manifest.json` built from the preflights: Generator 3,262 of 3,262 claimed by 7 shards,
Player 1,683 of 1,683 by 1; 0 missing, 0 duplicate, 0 unexpected). One command per shard, `--verbose`, a fresh `--results`
file, no `--bail`, no filter, whole-suite selectors only:

| Shard (command `node tests\node-runner.js --suite=…`) | Tests | Passed | Failed | Skipped | Process s | Projected s | Result file |
|---|---:|---:|---:|---:|---:|---:|---|
| `steps` | 57 | 57 | 0 | 0 | 11.717 | 30 | `quick/generator-steps.json` |
| `replay` | 153 | 153 | 0 | 0 | 11.025 | 30 | `quick/generator-replay.json` |
| `player` (the Generator's replay-player suite) | 69 | 69 | 0 | 0 | 139.515 | 180 | `quick/generator-player.json` |
| `pipeline` | 150 | 150 | 0 | 0 | 296.200 | 300 | `quick/generator-pipeline.json` |
| `core-shared` (16 shared suites) | 1,143 | 1,143 | 0 | 0 | 24.867 | 150 | `quick/generator-core-shared.json` |
| `mega` | 111 | 111 | 0 | 0 | 11.552 | 250 | `quick/generator-mega.json` |
| `own-fast` (29 own suites) | 1,579 | 1,578 | **1** | 0 | 166.528 | 240 | `quick/generator-own-fast.json` |
| Generator total | 3,262 | 3,261 | **1** | 0 | 661.404 (children) | | |
| Player, no option (30 suites) | 1,683 | 1,683 | 0 | 0 | 31.828 | 60 | `quick/player-all.json` |

Every result: `complete` true, `sourceStable` true, the inventory's `sourceHash`, Node and time factor, selection count equal
to the shard. The reconciler (`coverage.cjs`, `quick/reconciled.json`): Generator **complete with 1 failure**, 3,262 of 3,262 keys
once in 7 of 7 accepted shards; Player **complete and green**, 1,683 of 1,683 in 1 of 1; missing 0, duplicates 0, unexpected 0
in both. The reconciler was tested first on tiny synthetic data (`coverage.selftest.cjs`, 9 checks: complete, a failed test
kept, a gap, a duplicate row and a key in two shards, an unexpected key, a mixed source, Node or factor, a bail, an incomplete
run, a zero-test result, a missing file, a new skip, a changed full name, a wrong selector).

**The failed test of the first run** is `generator/i18n/9` (`i18n > i18n: locale fragments > has no key defined twice (base pack against
fragments, or two fragments)`), a real test-isolation defect and not a performance finding: `AssertionError`, 162 conflicts at
fragment 23. A bounded diagnostic compound (`c4`, `quick/diag/`, 12.323 s, not coverage): `--suite=i18n` 83 of 83
passed (0.523 s); `--suite=history,i18n` 97 of 98, `i18n#9` failed (2.132 s); `--suite=cache,i18n` 187 of 188, `i18n#9` failed
(9.569 s). The `history` and `cache` tests added by the MS05r5p fix round start a private copy of `js/ui/app.js` on
`Object.assign({}, SG)`, which shares the array `SG.localeFragments`, so its fragment is pushed a second time and the live
i18n records the conflicts. The runner's registration order (`cache` 17th, `history` 27th, `i18n` 28th) makes a whole run fail
the same way. r6b did not repair it (the files are MS05r5p's; no ad hoc assertion repair); SA2 decided (a) and the defect is
resolved in the next paragraph.

**R6B-F01 fix and the final Generator run.** SA2's binding decision (a) sent the defect back to MS05r5p, whose fix round gave
both private `startApp()` helpers (`history.test.js` around line 276, `cache.test.js` around line 1931) their own
`sg.localeFragments = []` and an assertion that the host fragments are unchanged; its locked runs are in
`MS05r5p/evidence.md`, "R6B-F01 fix" (`history,cache,i18n` in one process 203 of 203, `store,controls,help,ui-contract` 228 of
228). Only those two files changed: the file lists of the two Generator inventories differ in exactly them, and the 3,262 full
names and ordinals are identical to the first run's, so the migration is unchanged (3,197 + 10 + 55,
`quick-final/inventory-migration.json`). The Player fingerprint listed again is the same, so the Player result of the first run is
retained as the final one. Nothing was hidden, reordered or filtered: the same seven whole-suite shards, a fresh inventory
(`quick-final/generator-inventory.json`, fingerprint `7d3102d3…`), preflights (7 + 1, 0.285 to 0.489 s), manifest, plans and
fresh result files:

| Final shard (command `node tests\node-runner.js --suite=…`) | Tests | Passed | Failed | Skipped | Process s | Projected s | Result file |
|---|---:|---:|---:|---:|---:|---:|---|
| `steps` | 57 | 57 | 0 | 0 | 11.507 | 30 | `quick-final/generator-steps.json` |
| `replay` | 153 | 153 | 0 | 0 | 11.062 | 30 | `quick-final/generator-replay.json` |
| `pipeline` | 150 | 150 | 0 | 0 | 286.453 | 360 | `quick-final/generator-pipeline.json` |
| `player` (the Generator's replay-player suite) | 69 | 69 | 0 | 0 | 139.399 | 180 | `quick-final/generator-player.json` |
| `core-shared` (16 shared suites) | 1,143 | 1,143 | 0 | 0 | 24.610 | 60 | `quick-final/generator-core-shared.json` |
| `mega` | 111 | 111 | 0 | 0 | 11.400 | 30 | `quick-final/generator-mega.json` |
| `own-fast` (29 own suites) | 1,579 | 1,579 | 0 | 0 | 162.033 | 220 | `quick-final/generator-own-fast.json` |
| **Generator total** | **3,262** | **3,262** | **0** | **0** | 646.464 (children) | | |
| Player, no option (30 suites), retained from the first run | 1,683 | 1,683 | 0 | 0 | 31.828 | 60 | `quick/player-all.json` |

Every result: `complete` true, `sourceStable` true, the inventory's `sourceHash`, Node and time factor, selection count equal to
the shard. The reconciler (`quick-final/reconciled.json`, manifest `quick-final/quick-manifest.json`): Generator **complete and
green**, 3,262 of 3,262 keys once in 7 of 7 accepted shards, 3,262 passed, 0 failed, 0 skipped; Player **complete and green**,
1,683 of 1,683; missing 0, duplicates 0, unexpected 0 in both. `i18n` is 83 of 83, `cache` 105 of 105 and `history` 15 of 15 in
`own-fast`. Helper commands `f1` 309.125 s (lock wait 0.134 s) and `f2` 337.556 s (0.107 s), both exit 0. The final manifest handed
to r6c is `quick-final/final-manifest.json`; the first run's `quick/` files stay as history.

**Coverage notes carried on** (read from `MS05r6a/pins/resolved.json`; passing is not a claim that the earlier specimen counts
were preserved):

| Pin | Disposition |
|---|---|
| P03 / P09 | multi-move jump specimens 3 to 2 (G11, G12); the changed G06 is no longer that branch |
| P04 | view-dependent jump specimens 3 to 2; signed details changes asserted for G11 (-5) and G12 (-4) |
| P06 | new hardest at flat or lower score 3 to 2 (G13 flat, G11 fall) |
| P12 / IR11 | none found in the 14 goldens, the guides' example and the player suite's 11 other fixed real results: G11 is the single reveal-fold specimen (peak 1,967): **MS05r6a-COV01 for MS18e** (a non-generating synthetic test of the fold rendering would protect the branch independently of the goldens) |

All of these tests passed in the final run (`steps` 57, `replay` 153, `player` 69).

**E is still valid** (the guides, `AGENTS.md` and the designs are no inputs of its hashes): the three no-generation merge checks
pass on the current tree: 5 wires G09 to G13 "all 5 keys exactly once" and up to date (0.430 s), 14 analyses G01 to G14 up to
date (0.405 s), 104 ledgers, all 520 hash keys unchanged (0.520 s); the same three checks pass again after the R6B-F01 fix (`e4` to `e6`: 0.411, 0.412 and 0.500 s). Complete E was not rerun.

## B1: the deep records and b3's live CV3 cells

`node tests\mega-contract.js --reconcile=..\docs\difficulty-v3\evidence\MS05r5m\records --json=…\deep\reconciled.json`: exit 0
in 0.484 s, no lock (no generation): 14 requests and 14 records, complete, evidence sound, 14 produced, correctness **pass**, 6
relations pass / 0 fail / 0 unevaluated, no problem. mega12: 7 of 7 produced, 0 exact, 7 shallow fallbacks, 23.520 to 25.243 s
(median 23.723 s), none over 30 s or 120 s, guard 40 s (margin 14.741 s). mega16: 7 of 7, 0 exact, 80.394 to 116.951 s
(median 104.106 s), 7 of 7 over 30 s, none over 120 s, guard 180 s (margin 63.018 s).

**Raw `identity.currentMatches` (read, not inferred from the exit code):** `{ "sourceHash": false, "toolHash": true }`.
`deep/compatibility.json` (script `deep-compat.cjs` over `deep/reconciled.json` and `deep/snapshot-diff.json`, the MS05r6a
`snapshot-diff.cjs` run read-only on this tree against `refs/dv3-wip/MS05r5m-done-20261114-0230`, `ad77fdf`):

- the snapshot, with its own 63 `SOURCE_FILES` (the list unchanged), hashes to the recorded `fee8b8d6…`; the final tree hashes to
  `a073f9bd…`, the same as at MS05r6a;
- the only changed `SOURCE_FILES` entry is `generator/js/ui/store.js`; `deep/diffs/generator__js__ui__store.js.patch` has
  the same +/- lines as `MS05r5p/legacy-8-fix/store-diff.patch`, and the file's SHA-256 is the recorded
  `818d5db957414436efc822e7684a5e2cdd2980cec8c9f4d273ffcd19f4382917` (the legacy-8 condition only);
- the tool files (`tests/mega-contract.js`, `tests/fixtures/mega-contract.js`) are unchanged, so `toolHash` matches; the unhashed
  shared paths are checked: `tests/fixtures/tool-records.js` (`withRequestedLevel`) is identical, the six functions of
  `tests/replay-fixtures.js` (`readSource`, `sourceList`, `loadFixtures`, `inside`, `gitState`, `nodeEnv`) are identical, and its
  only change is comments and the `HEADER` text of the wire fixture (`deep/diffs/generator__tests__replay-fixtures.js.patch`);
  `core/tests/node-evidence.js` is unchanged;
- a scan of `generator/js/engine`, `generator/js/variants` and `core/js` (every file) finds no `SG.store`, `storedAttempts` or
  `localStorage`: neither `SG.pipeline.normalizeConfig` nor `SG.pipeline.run` executes the changed code, and the request,
  default, allowance, RNG, generation, validation, recording and relation identities are unchanged.

Rechecked after the R6B-F01 fix (`deep/reconciled-final.json`, 0.498 s; a fresh snapshot comparison `deep/snapshot-diff-final.json`,
10.5 s; `deep/compatibility-final.json`): the same result, `currentMatches` `{ false, true }`, the working-tree engine hash still
`a073f9bd…`, `store.js` still the only changed source, the exception applies.

Disposition: **retained by exact-diff compatibility**. The records keep their producer, hash and timing identity and the false
match stays false; no digest or `SOURCE_FILES` was patched. **MS05r6b-MEGA-REFRESH was not executed** (no occurrence was
invalidated). Covered: all 14 occurrence ids and the 6 relations (`mega12-cv5-same-seed`, `-other-seed`,
`mega12-invariant-3-same-seed`, and the mega16 three).

**b3's live CV3** (`deep/live-cv3.json`, script `live-cv3.cjs`): **five live requests**, counted apart from the fourteen deep
executions and from nothing else: mega16 Nightmare seeds 1 and 2 (116.787 s and 103.904 s, test 220.69 s) and mega12 Nightmare
seeds 1, 2 and 3 (23.509, 23.067 and 22.790 s, test 69.37 s), `generation: live`, selected total 1, exit 1 each, outcome
`mega16 nightmare: none of 2 puzzles hit it` (S-AV03, 0 of 2) and `mega12 nightmare: none of 3 puzzles hit it` (S-AV02, 0 of 3):
every per-puzzle assertion ran first and passed, the aggregate is the failing one. Their invariant occurrence ids
(`mega16-invariant-1`, `-2`; `mega12-invariant-1`, `-2`, `-3`) are cross-references only: the live times are within 0.3 % of the
deep ones for mega16 and 0.9 to 3.6 % faster for mega12; no request exceeded the 240 s guard; the CV5 repeats were not collapsed.

## C: classic9 GD (the unchanged manual `difficulty` suite) and b3's manual results

**Manifest** (`gd/gd-manifest.json`, `gd/difficulty-inventory.json`: 154 tests, 1 suite, registration 0.2 s; plan
`gd/shard-plan.json`): classic9 offers eight levels (veryEasy to nightmare and hell1); 100 requests per level, 20 for Hell 1;
the 14 non-batch groups and the confusion matrix are the rest of the 154 (64 level tests + 1 + 89). Every shard is one `--suite=difficulty
--filter=…` command, selected total checked by its preflight, `--verbose`, a fresh `--results`, jobs 1, no `--manual`/`--all`:
level shards `time) > <level> >` (the anchored describe of the per-level group), groups `difficulty > <group name>`.

**Projection before launching.** A locked same-seed pilot (`gd/pilot.json`, `gd-pilot.cjs`, 40.559 s): the first 8 requests of
each level, seeds 7000 to 7007, the exact call of `batch(level)`: mean ms veryEasy 2.4, easy 171.2, normal 212.6, hard 20.2,
expert 25.0, master 67.7, **nightmare 4,128.3** (3 of 8 exact), hell1 382.9. Level shards were projected as mean x requests x 2
+ 10 s. Nightmare was projected **449 s** from the pooled mean of the pilot and r4's 12 requests at the same defaults
(4.384 s x 100 = 438.4 s + 10 s), just under 450 s, and launched alone under the 540 s ceiling; the 14 non-batch groups
used stated conservative bounds (30 to 120 s, none measured on this source before).

| Shard | Tests | Result | Process s | Projected s |
|---|---:|---|---:|---:|
| Nightmare (100 requests; first test 429.95 s) | 8 | 7 passed, **1 failed**: `hits … at least 90 %`, 21 of 100 exact | 430.549 | 449 |
| Hell 1 (20 requests) | 8 | 8 passed | 9.953 | 26 |
| Very Easy | 8 | 8 passed | 0.489 | 11 |
| Easy | 8 | 8 passed | 21.139 | 45 |
| Normal | 8 | 7 passed, **1 failed**: `hits … at least 90 %`, 86 of 100 | 28.248 | 53 |
| Hard | 8 | 8 passed | 3.025 | 15 |
| Expert | 8 | 8 passed | 3.667 | 16 |
| Master | 8 | 8 passed | 9.336 | 24 |
| 14 non-batch groups (`levels` 4, `spec9` 8, `spec-other` 4, `qualification` 6, `clue-floor` 9, `score-v2` 15, `score-table` 4, `labelled` 7, `removing` 2, `oracle` 7, `guarantees` 10, `cap` 5, `unreachable` 5, `safety` 3) | 89 | 89 passed | 0.39 to 52.17 each | 30 to 120 |
| **Confusion matrix** (1 test) | 1 | **not launched** | | 500 (projected 505 s from this run's measured batches) |

`gd/reconciled.json`: **153 of 154 tests covered, 151 passed, 2 failed, 1 outstanding**, 0 duplicate, 0 unexpected; every result
complete, stable, fingerprint `d33389ac…`. Failures: both are the unchanged aggregate hit-rate assertion (availability, S-AV07
for Nightmare and a new item S-AV14 for Normal); every per-puzzle assertion (I1 unique solution, I2/I3/I6 givens and
minClues, I5 complete proof and band, the technique-set check, I7 sound deductions, the symmetry pattern) and every median-time
assertion passed in all eight levels. The confusion matrix is the one test of the group that reads the batches of all eight
levels in one process: the measured batches sum 504.8 s (430.5 + 9.7 + 0.3 + 20.9 + 28.0 + 2.8 + 3.5 + 9.1), above 450 s, so it is
an explicit outstanding population and a named cost item (S-AV15), not a pass and not a reduced count.

**b3's 186 manual results (IR08)**, `gd/manual-compatibility.json` (`manual-compat.cjs`): retained, none rerun, none rewritten:
53 I5, 118 CV3 level and 15 refusal rows, one fingerprint `c3035e80…`, selected total 1 each; **167 pass and 19 are failed
availability assertions** (S-AV02 to S-AV13), the exact list stays empty (`deferred-cv3.json`: none). The 167 fingerprint files
now hash to `d33389ac…`; 18 differ (6 documents, 5 quick suites, 3 published data fixtures, 3 recorder or tool scripts, and
`store.js`), 0 added, 0 removed. The manual suites, the corpus helper and every engine, variant and core source are identical;
`store.js` is the exact diff of `store-diff.patch`; a scan of the engine, variants, core, the helper and every manual suite
(except `perf`, which no b3 or GD selection uses) finds no use of `SG.store`, `storedAttempts` or the changed fixtures, apart from
a token list that `wordoku.test.js` checks the variant against. IR07's incident labels stay: the `slot: none` times (351.3 s
over Pentomino's MP12b1, 22 cases) are descriptions, not slot-protected measurements, and the `lockWaitSeconds` of b3 includes
stopped unlocked attempts and fairness gaps.

**After the R6B-F01 fix (test-only compatibility diff).** The fix changes the manual fingerprint again (`549646ee…`), so both
proofs were rebuilt on it, with their originals untouched: `gd/manual-compatibility-final.json` (b3's 186 results, still
`c3035e80…`, 167 pass and 19 failed, statuses and hashes preserved): 20 of the 167 files differ (7 quick suites, 6 documents, 3 data
fixtures, 3 recorder or tool scripts, `store.js`), 0 added, 0 removed, the runtime change is still `store.js` only and equal to
`store-diff.patch`, and no engine, variant, core, manual suite or helper file differs; `gd/gd-compatibility-final.json` (the 22 GD
results, `d33389ac…`, none rewritten): exactly 2 files differ, `history.test.js` and `cache.test.js`, no runtime file. Neither
quick suite is executed by a manual selector. No GD or b3 cell was rerun; the original hashes, times and statuses stay.

## D: the standing quick cost (S-AV08)

`standing-quick-cost-final.json` (the post-fix measurement; `standing-quick-cost.json` is the first run's and is history) and
`docs/difficulty-v3/recovery-quick-cost.md`: sums of the **process seconds the lock helper reported**, a compound's wall time
counted once, start-up and registration included, the runner's own `wallMs` and the harness `results.ms` kept apart.

| | Generator (`7d3102d3…`) | Player (`1d0724c3…`) |
|---|---|---|
| Suites, tests | 50, 3,262 (all passed) | 30, 1,683 (all passed) |
| Shards, helper commands | 7, 2 | 1, 1 |
| **Sum of process seconds** | **646.681 s (10 min 47 s)** | **31.828 s** |
| Longest shard | `pipeline` 286.453 s | the whole set |
| Children / driver overhead | 646.464 s / 0.217 s | n/a |
| Runner `wallMs` sum / harness `results.ms` sum | 644.841 s / 643.266 s | 31.618 s / 31.362 s |
| Lock wait | 0.134 and 0.107 s | 0.101 s |

No figure is derived. Excluded and counted apart: the first full Generator run (`quick/`, fingerprint `bee132a8…`, 661.725 s, one
failed test), superseded by this one and kept as history, the diagnostic compound `c4` (12.323 s), the pilot (40.559 s), the GD runs
(579.869 s), inventories and tooling (each under 1 s). It is not a measured unsharded command and not a promise. **S-AV08:** the
Generator total is above five minutes, so it carries the breakdown to **MS07e** for a proposal (nothing is moved here): `pipeline`
286.0 s of which the three verbosity-cost benchmarks `generating puzzles: verbosity 'off'`, `'summary'` and `'full'` are 75.0, 74.7
and 75.6 s (225.3 s), the Generator `player` suite 139.0 s, `worker` 48.7 s, `difficulty-floor` 24.9 s, `multigrid` 15.5 s,
`perf-tooling` 11.3 s. The orchestrator records the acknowledgement; the field says `pending normal acceptance`. The 661.7 s of the
first run is historical. The interim b1 713.8 s covered three command groups, not a complete set. MS05r6a's samples (11.5, 11.1,
139.1 s) agree with the final 11.5, 11.1 and 139.4 s.
## Commands (all; exit code, process seconds, lock wait)

Locked helper commands (11; 1,972.985 s of process time, lock waits of at most 0.143 s each, none near 20 minutes; the helper found
the slot free every time, so there was no wait to report). First run: `c1` Generator `steps`, `replay`, `player`: exit 0, 162.363 s,
0.143 s; `c2` `pipeline`, `core-shared`: 0, 321.181 s, 0.103 s; `c3` `mega`, `own-fast`: 1 (the failed i18n test), 178.18 s (derived), n/a;
`q-player-all` Player: 0, 31.828 s, 0.101 s; `c4` diagnostic: 0, 12.323 s, 0.103 s. GD: `g0` pilot: 0, 40.559 s, 0.102 s; `gd1`
Nightmare: 0 (the child exited 1, expected), 430.651 s, 0.136 s; `gd2` seven levels: 0 (the Normal child exited 1), 76.571 s, 0.108 s;
`gd3` fourteen groups: 0, 72.647 s, 0.101 s. **Final Generator run after the fix:** `f1` `steps`, `replay`, `pipeline`: 0, 309.125 s,
0.134 s; `f2` `player`, `core-shared`, `mega`, `own-fast`: 0, 337.556 s, 0.107 s. Unlocked: the preflights and inventories, `help`/`ui-contract`,
`--reconcile` (0.484 s, then 0.498 s), `e1` to `e6` (0.43, 0.405, 0.52 s; 0.411, 0.412, 0.5 s), `snapshot-diff.cjs` (9.52 s, then 10.54 s) and
the scripts of this folder. Records: `runs.jsonl`, `shard-runs.jsonl`, `compounds.jsonl`, transcripts in `logs/`.
## Items (S-OD4)

No correctness failure of the engine or its outputs; the one quick-test defect (R6B-F01) is resolved. Routes: MS07e first, then MS18c
(availability) and MS18d (cost); MS18e audits.

| Item | Numbers now | Evidence | Owner |
|---|---|---|---|
| S-AV01 Greater-Than Normal CV6 | carried: 2,035 ms p95 against 1,400 ms (pause); b3's I5 Normal p95 5,280 ms; not run here | `MS05b3/outcomes.md` | MS05e, MS07e, MS18d |
| S-AV02 mega12 Nightmare | deep 0 of 7 exact (23.520 to 25.243 s); live CV3 0 of 3 (23.509, 23.067, 22.790 s); the one-attempt quick request 4.975 s (first run) | `deep/reconciled.json`, `deep/live-cv3.json`, `quick-final/generator-mega.json` | MS07e, MS18c, MS18d |
| S-AV03 mega16 Nightmare | deep 0 of 7 (80.394 to 116.951 s, 7 of 7 over the 30 s p95); live 0 of 2 (116.787, 103.904 s) | as above | MS07e, MS18c, MS18d |
| S-AV04 samurai Nightmare (G13) | carried: 21.872 s of 120 s at 2 attempts (r6a); b3 live 0 of 2 (26.741, 25.230 s) | `MS05r6a/preflight/G13.json` | MS07e, MS18c, MS18d |
| S-AV05, S-AV06 Killer Hard, Expert | carried: 0 of 20 and 0 of 3 (Hard); 1 of 8 and 0 of 3 (Expert) | `MS05b3/outcomes.md` | MS07e, MS18c |
| S-AV07 classic9 Nightmare | **now 21 of 100 exact at the final defaults** (the GD assertion needs 90; 4.128 s mean per request in the pilot, batch 430.5 s); every per-puzzle assertion passes | `gd/classic9-nightmare.json` | MS07e, MS18c |
| S-AV08 standing quick cost | **measured on the final fingerprint**: Generator 646.681 s (10 min 47 s, above five minutes; the first run's 661.725 s is historical), Player 31.828 s; breakdown above | `standing-quick-cost-final.json` | MS07e (proposal), MS18d |
| S-AV09 to S-AV13 | carried from b3 (Killer Master and Nightmare I5; Wordoku Normal and Nightmare I5; a 325.3 s Jigsaw Expert request; Sohei, Butterfly, Flower Nightmare; Butterfly and Flower Easy) | `MS05b3/outcomes.md` | MS07e, MS18c |
| **S-AV14 classic9 Normal GD hit rate (new)** | 86 of 100 exact against 90 (batch 28.2 s, process); every per-puzzle assertion passes | `gd/classic9-normal.json` | MS07e, MS18c |
| **S-AV15 classic9 confusion matrix (new)** | not executed: it reads all eight level batches in one process, 504.8 s of measured batches (above 450 s); the 8 level groups already ran separately | `gd/gd-manifest.json`, `gd/reconciled.json` | MS07e, MS18e |
| MS05r6a-COV01 (coverage, owner MS18e) | one reveal-fold specimen (G11, peak 1,967) | `audit.md` section 6 | MS18e |

Not S-AV items: **R6B-F01** (the i18n test-order defect: **resolved** by MS05r5p's fix round, SA2's decision (a); the final
Generator quick run is green); R6B-F02 (the three renames omitted from IR13); R6B-F03 (a derived helper figure, first run only). Open inherited: CV6-04 is answered and implemented; the stale
sentence of `notes.md` about the legacy 8 had already been corrected.

## Acceptance

| ID | Result | Evidence |
|---|---|---|
| MS05r6b-B01 active requiredness model with the measured common default and truthful fallbacks | Met | allowance 256 and the size defaults in the tree and in every identity above; every returned fallback is a truthful `exact` false with both warnings (14 of 14 deep records, `mega#96`, GD per-puzzle I5, 186 manual per-puzzle assertions) |
| MS05r6b-B02 every fixed request and correctness contract survives; the slower total quick cost is visible | Met | no request, seed, guard or assertion changed; per-puzzle correctness passed everywhere it ran; the cost is reported per app |
| MS05r6b-B03 the recovery audit is honest; correctness blocks and performance findings keep numbers and owners | Met | `audit.md`; the one blocking finding (R6B-F01) was stated as such and is now resolved; the 2 GD hit-rate failures and the others are named items with numbers |
| MS05r6b-T01 both final inventories account for the three additions and the renames without false missing or unexpected keys; strict result identities; explicit verdicts | Met | migration exact (the seven renames plus three more); both final reconciliations complete; verdicts `complete-green` for both (the first run's `complete-with-failures` is history) |
| MS05r6b-T02 classic9 GD and every I5/CV3/refusal obligation have an honest outcome or item; b3's mega CV3 is live | Met | `gd/reconciled.json` (153 of 154, one outstanding named); 186 retained under IR08; `deep/live-cv3.json` |
| MS05r6b-T03 r6a's approved-contract, 520/5/14 E and pins are audited; P03/P04/P06/P09/P12 and COV01 carried to MS18e | Met | the three merge checks; `audit.md` sections 5 and 6 |
| MS05r6b-T04 actual per-app quick time and shard counts and truthful AGENTS/guides/report ready for acknowledgement | Met | `standing-quick-cost-final.json` (Generator 646.681 s on the post-fix fingerprint, Player 31.828 s), `recovery-quick-cost.md`; the instructions carry no duration |
| MS05r6b-T05 no source, guard, request, default or fixture drift, checkpoint commit or waiver | Met | the final Generator, Player and manual fingerprints are unchanged from their final inventories and listings to the end (the only change of a hashed file after the first run is MS05r5p's test-only fix of two quick suites, not an r6b edit); nothing staged or committed; only the files below changed |
| MS05r6b-T06 14 records and 6 relations and b3's live CV3 reconcile; both `currentMatches` read; exact-diff or MEGA-REFRESH; the final manifest goes to r6c | Met | `deep/*` (rechecked after the fix: `*-final.json`), `quick-final/final-manifest.json` |

## Handoff to MS05r6c and the orchestrator

- **Ready for the combined commit, pending MS05r6c's CI closure.** Both final quick sets are complete and green on their final
  fingerprints (Generator `7d3102d3…` 3,262 of 3,262, Player `1d0724c3…` 1,683 of 1,683); R6B-F01 is resolved by MS05r5p's fix
  round (SA2's decision (a)); E (5/14/520), the 14 deep records and the 186 manual results stand; classic9 GD has 153 of 154
  tests with the outstanding and failed ones named. The first run's Generator results stay as history in `quick/` and
  `standing-quick-cost.json`; they are not the final coverage.
- **r6c:** the final manifest is `quick-final/final-manifest.json` (exact commands, suites, counts, outcomes, process seconds) with
  the final full names in `quick-final/quick-manifest.json` (its Player shard points to the retained result `quick/player-all.json`,
  the same fingerprint). The shards are whole-suite `--suite=` lists, so CI groups may reuse them; the `pipeline` suite is the longest
  single suite (286.0 s) and the Generator `player` suite the second (139.0 s). Selectors that name a test use the final names (the ten
  renames in `quick-final/inventory-migration.json`). `i18n` must not be placed in a process before `history` or `cache` without the
  fix (it is fixed in the tree, so any grouping now passes). The deep tier is a tool outside CI (`mega-contract` 37 tests is quick).
- **MS18e:** COV01 and the two GD items (S-AV14 and S-AV15), and that the Normal and Nightmare GD batches cost 28.2 and 430.5 s
  at this source.

## Files

Changed: `AGENTS.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `generator/design.md`, `player/design.md`,
`docs/difficulty-v3/notes.md`. Created: `docs/difficulty-v3/recovery-quick-cost.md`; `generator/tests/artifacts/difficulty-v3/MS05r6b/`
(`run-shards.cjs` and its self-test, `coverage.cjs` and its self-test, `inventory-migration.cjs`, `gd-pilot.cjs`, `manual-compat.cjs`,
`deep-compat.cjs`, `live-cv3.cjs`, `standing-cost.cjs`, `audit.cjs`, `final-manifest.cjs`; the last five and the migration and compat
scripts gained a folder or file argument for the final run); this folder: `evidence.md`, `audit.md`, `audit-counts.json` and
`audit-counts-final.json`, `standing-quick-cost.json` (first run, history) and `standing-quick-cost-final.json`, `runs.jsonl`,
`shard-runs.jsonl`, `compounds.jsonl`, `Invoke-Dv3Node.ps1`, `Run-Dv3Logged.ps1`, `Run-Short.ps1`, `logs/`, `quick/` (the first run:
inventories, preflights, plan, manifest, 8 results, `diag/`, `inventory-migration.json`, `reconciled.json`, `final-manifest.json`),
`quick-final/` (the final run: inventories, preflights, plan and compound plans, manifest, 7 new results, `inventory-migration.json`,
`reconciled.json`, `final-manifest.json`), `gd/` (inventory, pilot, manifest, preflights, 22 results, `reconciled.json`,
`manual-compatibility.json` and `-final.json`, `gd-compatibility-final.json`, the two listings) and `deep/` (reconciliation, snapshot
diff, patches, `compatibility.json`, `live-cv3.json`, and the `-final` rechecks).
