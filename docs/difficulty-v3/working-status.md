# Difficulty v3 (Sudoku): working status at the pause

| | |
|---|---|
| Pause | Ordered by the owner on 2026-11-13 at 17:52 (+07:00). This document describes the state at that moment |
| For | Fable (claude-fable-5-2), the plan author, to review the progress before choosing the next direction: question PR-S1 in [clarifications.md](clarifications.md) |
| Who | owner: @ledat_microsoft (decisions S-OD1 to S-OD3) · orchestrator: GitHub Copilot CLI (dispatch, re-verification, review, Execution logs, local commits, progress mails) · analysts: SA1 claude-opus-5.5 (cross-reviews, FS findings) and SA2 gpt-6-astra (task pack, recovery tasks, CV6 questions) · developers: claude-sonnet-5.5, one per task, strictly serial in this repository; the Pentomino repository ran in parallel |
| Branch | `rating-v3`, HEAD `f788e02` (MS05a), equal to `origin/rating-v3`; the pause-state commit follows (section 1) |
| State | 8 of 51 tasks committed (MS01 to MS05a). MS05b1 and the recovery steps MS05r1 to MS05r4 have their step evidence and no commit of their own; MS05r4 stopped at an S-OD2 stop point at 13:34. Sudoku has waited since 13:35 for the plan author's design of CV6-03 (c) |
| Method | Read-only: the repository files cited, read-only Git output and the orchestrator's session records. No test, generation, timing run or tool ran for this document. "Not recorded" means that no file records the value |

Terms. **Step evidence complete** is the S-OD2 status of a recovery step: reviewed by the orchestrator, with no
acceptance and no commit of its own (`tasks/difficulty-v3/check-list.md` §1). **E** is the complete recorder
recipe: 520 regression-hash keys (GG), four wire and fourteen analysis goldens (GR). **R1 to R24** are the
resolutions of [report-detailed.md](report-detailed.md). "Check-list" is `tasks/difficulty-v3/check-list.md`.
Paths in backticks are relative to the repository root; links are relative to this document.

## 1. Snapshot

| Item | State at the pause |
|---|---|
| Time | 2026-11-13, 17:52 (+07:00), the owner's pause order. Sudoku had already been stopped since 13:35: MS05r4 stopped at 13:34 and its question CV6-03 waits for the plan author |
| Branch, HEAD | `rating-v3`, HEAD `f788e02` ("difficulty-v3 MS05a: Exactness transport and prepared shallow messages"), equal to `origin/rating-v3` |
| Committed per task | MS01 `50eeec5`, MS02 `ce0f259`, MS03a `d790dd6`, MS03b `8252433`, MS03c `db716f7`, MS03d `6685d8f`, MS04 `6165c42`, MS05a `f788e02`: one commit per accepted dispatch, each with its filled Execution log (table 1.1) |
| Not committed before the pause | 76 tracked files changed (5,894 insertions, 1,804 deletions; the old task files `MS05b-required-keeper-and-search.md` and `MS06c-target-through-all-stages.md` deleted) and 27 untracked paths besides this document. They hold the MS05b1 implementation; the tools, tests, documents and evidence of MS05r1 to MS05r4; every pack revision written after `f788e02` (FS01 to FS33, the new task files MS05b1, MS05b2, MS05b3, MS05e, MS06c1, MS06c2 and the eight recovery files); CV6-02, CV6-03 and the 18:03 split of the clarifications; SA1's later review rounds and SA2's response file |
| Why not committed | Owner decision S-OD2 (2026-11-13 06:45): MS05b1 and the recovery steps get no commit of their own; one combined commit, `difficulty-v3 MS05: required exactness with measured bounded recovery`, follows MS05r6b's acceptance (check-list §2, "S-OD2 recovery boundary and dispatch estimates"; [clarifications-resolved.md](clarifications-resolved.md) Part H, CV6-02) |
| Step records | After each recovery step the orchestrator filled its Execution log ("Step evidence complete"; MS05r4 "Stopped"), added a summary row with commit "(combined)" and made a backup ref (table 1.2). MS05b1's Execution log is empty: its closure belongs to MS05r6b |
| Pause-state commit | At the pause the owner ordered the whole working tree, this document included, to be committed directly on `rating-v3` as one pause-state (WIP) commit and pushed to `origin rating-v3`. **The pause state is committed on `rating-v3` in the commit that adds this document** |
| How it differs from S-OD2 | It overrides S-OD2's single commit after MS05r6b: MS05b1 and MS05r1 to MS05r4 are committed in their step-complete state, and MS05r4 in its stopped state. It is not an acceptance. The last recorded runs fail: both mega Nightmare groups (MS05r4 preflights) and the Generator suites `steps`, `replay` and `player` on G06, G07 and G13 (MS05b1 evidence). The complete Generator quick set last passed at MS05a; MS05b1 could run it only in chunks, with failures, and no complete run has happened since. The G13 analysis golden does not exist. `generator/tests/fixtures/regression.js` and `replay-wire.js` were written from MS05b1's source with no extra allowance; the default of 256 may change some puzzles (MS05r4 log, issue 5), and MS05r6a re-records the complete E |
| Temporary branch | `origin/fable-q/cv6-03`, commit `69a3efd` (17:47, pushed 17:50), parent `f788e02`. It holds only `docs/difficulty-v3` and `tasks/difficulty-v3`, so that Fable can answer CV6-03 (c). It predates the 18:03 split, so its `clarifications.md` is the single older file. Owner's rule: the branch is deleted once the answer has been read |
| Where things are | Section 9 |

### 1.1 Commits on `rating-v3` since the plan

| Commit | Time (+07:00) | Content |
|---|---|---|
| `6abcb9f` | 2026-11-12 06:25 | The plan, [plan.md](plan.md) |
| `26f2fb8` | 09:48 | Analyses, cross-reviews, joint report draft, clarifications |
| `1398dde` | 10:00 | Fable's answers (Parts A to E) |
| `61da39a` | 11:16 | Final joint report, brief, acceptance concern AC01 |
| `2c665bb` | 11:49 | Fable's AC01 answer and acceptance (Parts F, G) |
| `f8fcf5d` | 12:40 | Report ACCEPTED; first pack tranche: check-list, MS01 to MS03d |
| `50eeec5` | 13:02 | MS01 |
| `ce0f259` | 13:38 | MS02 |
| `d790dd6` | 14:23 | MS03a |
| `7c2b524` | 14:32 | Pack MS04 to MS18e and revisions of MS03b to MS03d (47 dispatches in all with the first tranche) |
| `8252433` | 15:02 | MS03b |
| `db716f7` | 15:22 | MS03c |
| `6685d8f` | 15:51 | MS03d |
| `6165c42` | 17:28 | MS04 |
| `a4ad414` | 18:34 | CV6-01 with Fable's answer and S-OD1; SA1's review of the pack as of that time |
| `f788e02` | 18:34 | MS05a (HEAD) |

Times are Git commit times. The Execution logs give developer and review times; a log's "review and commit" time
can be later than the commit (MS04: log 17:45, commit 17:28).

### 1.2 Backup refs (local)

| Ref | Commit | Snapshot of |
|---|---|---|
| `refs/dv3-wip/MS05b1-20261113-0650` | `fc37b14` | The MS05b1 implementation as left on 2026-11-12, taken after S-OD2 |
| `refs/dv3-wip/MS05r1-start-20261113-0929` | `53c9533` | The tree just before MS05r1 started |
| `refs/dv3-wip/MS05r1-done-20261113-1013` | `9e88caf` | MS05r1 step evidence |
| `refs/dv3-wip/MS05r2-done-20261113-1034` | `2920d2b` | MS05r2 step evidence |
| `refs/dv3-wip/MS05r3-done-20261113-1144` | `316f170` | MS05r3 step evidence |
| `refs/dv3-wip/MS05r4-stop-20261113-1335` | `943630e` | MS05r4 at its stop |

Each ref is a local snapshot commit of the whole working tree, new files included, on top of `f788e02`. It is
built from a temporary index (`git read-tree HEAD`, `git add -A`, `git write-tree`, `git commit-tree -p HEAD`,
`git update-ref`), so the real index and the branch are untouched. The recipe is recorded in
[clarifications-resolved.md](clarifications-resolved.md) Part H, CV6-02, the orchestrator's note 3, after SA1's
FS32 showed that `git stash create` would miss new files. The refs are safeguards, not acceptances.

## 2. At a glance

| Question | Answer |
|---|---|
| Tasks done | **8 of 51** committed: MS01, MS02, MS03a to MS03d, MS04, MS05a. 51 is the pack after SA1's first two review rounds: the 47 dispatches of `7c2b524`, with MS05b split into MS05b1 and MS05b2 (FS04), MS05b3 added (FS22), MS06c split into MS06c1 and MS06c2 (FS15) and MS05e added (CV6-01). S-OD2 then added eight files (MS05r1 to MS05r5, MS05r6, MS05r6a, MS05r6b) and turned MS05b2, MS05c, MS05d and MS05r6 into routing records. The index now lists 59 task files and 55 executable entries: 8 committed, MS05b1 implemented and retained, MS05r1 to MS05r3 step evidence complete, MS05r4 stopped, 42 not started |
| Plan steps | Done: S0.1 (MS01), S0.2 (MS02), R21's tooling (MS03a to MS03d), S2.1 (MS04). In the recovery: S1.1 (MS05a committed; MS05b1 activation implemented; allowance 256 selected by MS05r4; acceptance open). Not started: S1.2 (MS06), S2.2 (MS07), S3 (MS08 to MS16), S2.3 (MS17), final evidence (MS18) |
| Recovery step reached | MS05r4, the fourth of r1, r2, r3, r4, r5, b3, r6a, r6b. R5 selected 256; the original-limit preflights pass for G13 and fail for mega12 and mega16 Nightmare. That is an S-OD2 stop (13:34), which became CV6-03 |
| Waiting on whom | **Fable:** the design of CV6-03 (c) with its three sub-questions, and the review PR-S1 ([clarifications.md](clarifications.md)). Then SA2 writes or amends the tasks (MS05r5, the new MS05r5m, MS05r6a with (d), any (c) task), SA1 cross-checks them, and the orchestrator dispatches. The owner lifts the pause |
| Remaining work | MS05r5, MS05r5m, MS05b3, MS05r6a, MS05r6b and the combined commit; MS05e; MS06a to MS18e (37 tasks). Section 7 |
| Remaining estimate | About 50 to 65 hours of serial work after the (c) answer, if nothing else stops and the machine stays awake (the orchestrator's estimate before the pause). The accepted report planned 59 to 92 agent-hours for the whole plan, gate wall time excluded (report §7) |
| Spent so far | Developer time in the Execution logs: 254 minutes for MS01 to MS05a and 237 minutes for MS05r1 to MS05r4; MS05b1 about 2 h 45 min (the orchestrator's record; its log is empty). Developer AI credits in the logs: about 4,888 for MS01 to MS05a and about 3,177 for MS05r1 to MS05r4; MS05b1 not recorded. Analyst and orchestrator usage is shared with the Pentomino work and not recorded per repository |

## 3. Task progress

One row per task file, in the order of the index (`tasks/difficulty-v3/check-list.md` §1); parent milestone rows
(MS03, MS05, MS06, MS06c, MS07 to MS18) are left out. Date is the commit time for a committed task and the
developer's start and end for the others. Developer time and AI credits are those of the Execution log.

| ID | Title | Status | Date (+07:00) | Developer time | AI credits | Result | Notes |
|---|---|---|---|---|---|---|---|
| MS01 | Tier algebra and reference floor API | committed `50eeec5` | 2026-11-12 13:02 | 18 min | about 346 | `floorTechniques`, `tierTechniques`, reference `certifyFloor`; no output change | 3.1 |
| MS02 | Baseline diagnostics and matched manifest | committed `ce0f259` | 2026-11-12 13:38 | 33 min (GS-before 176 s) | about 676 | GS-before, 17 cells: old hits 202 of 204, requiredness-qualified 91, shallow 111 of 202 in band | [baseline.md](baseline.md); 3.1 |
| MS03a | Bounded wire/analysis golden recorders | committed `d790dd6` | 2026-11-12 14:23 | 41 min | about 779 | Wire and analysis recorders with checked merges; fixtures unchanged | 3.1 |
| MS03b | Curated, bounded help-example tooling | committed `8252433` | 2026-11-12 15:02 | 33 min | about 728 | Bounded help-example tool: check by default, capped discovery, source records | 3.1 |
| MS03c | Region-aware Jigsaw snapshots | committed `db716f7` | 2026-11-12 15:22 | 16 min | about 362 | Jigsaw `cellRegion` in help snapshots and its rebuild in the Player help | none |
| MS03d | Selected hash records and complete merge | committed `6685d8f` | 2026-11-12 15:51 | 25 min | about 513 | `perf.js` hash shards and the checked 520-key merge | 3.1 |
| MS04 | Orders, counter and derived certificate | committed `6165c42`, with one open finding | 2026-11-12 17:28 | 66 min | about 1,046 | Orders 44/46/137, per-call subset counter, `requiredOf`; 27 of 520 hashes changed; CV6 fails | notes.md MS04; 3.1; CV6-01 |
| MS05a | Exactness transport/messages | committed `f788e02` | 2026-11-12 18:34 | 22 min | about 438 | `PuzzleResult.exact` over the wire, `required` and `target` event arguments, prepared `difficulty.shallow` | 3.1 |
| MS05b1 | Required exactness engine (retained; closure at MS05r6b) | implemented, not accepted; in the pause-state commit | 2026-11-12 18:57 to about 22:10 | about 2 h 45 min (orchestrator's record) | not recorded | Requiredness active; GG 149 of 520 changed; G13 analysis blocked; Generator quick set over 540 s | notes.md MS05b1; 3.1; CV6-02 |
| MS05b2 | Absorbed consumer scope | routing record, absorbed by MS05r2 | none | none | none | none | its "Current routing" section |
| MS05c | Absorbed allowance/work scope | routing record, absorbed by MS05r3 | none | none | none | none | the same |
| MS05d | Absorbed selection/GD/closure | routing record, absorbed by MS05r4, MS05r6a and MS05r6b | none | none | none | none | the same |
| MS05r1 | One-attempt work profiles on the preserved active tree | step evidence complete, in the pause-state commit | 2026-11-13 09:30 to 10:11 | 41 min (12 min lock wait) | about 747 | Ordinary samples against local continuation: G13 42/58 %, mega12 61/39 %, mega16 69/31 % | [recovery-profile.md](recovery-profile.md); 3.1 |
| MS05r2 | Correct measurement/manual consumers and prefixes | step evidence complete, in the pause-state commit | 2026-11-13 10:13 to 10:33 | 20 min | about 473 | Strict `exact` in the soak (both routes, `soak.js:281` included) and the qualifier; seven manual sites; prefix check | 3.1 |
| MS05r3 | Allowance/work/shard instrumentation at Infinity | step evidence complete, in the pause-state commit | 2026-11-13 10:34 to 11:42 | 68 min | about 1,317 | `SG.digger.SHALLOW_SEARCH_RATINGS` (default `Infinity`), `work.localSearches` over the wire and the cache, soak setting and shards | 3.1 |
| MS05r4 | Fixed selection, quick-pin triage and original-limit preflights | stopped at an S-OD2 stop point, in the pause-state commit | 2026-11-13 11:46 to 13:34 | 1 h 48 min (Node 61.5 min, lock waits 17.7 min) | about 640 | R5 selects 256, now the default; G13 104.7 s of 120 s passes; mega12 48.2 s against 6 s and mega16 `budget.exceeded` at 60 s fail | [shallow-cap-2026-11-13.md](shallow-cap-2026-11-13.md); 3.1; CV6-03 |
| MS05r5 | Inventory/results and bounded full-quick plan | not started; its prerequisite "passed original-limit preflights" is unmet | none | none | none | none | CV6-03 "Resume path" |
| MS05b3 | Post-selection lazy corpora and early I5/CV3 | not started; same prerequisite | none | none | none | none | FS22, FS25, FS26 |
| MS05r6 | Closing recovery milestone | routing record, not a dispatch | none | none | none | none | split by FS28 |
| MS05r6a | Final-source guard recheck, complete E and listed pins | not started | none | none | none | none | S-OD3 (d) adds G13 persistence |
| MS05r6b | Full quick/GD, standing cost and combined audit | not started | none | none | none | none | the sole combined acceptance |
| MS05e | Guided sign dig; CV6 closure or owner fallback | not started; waits for MS05r6b's commit | none | none | none | none | CV6-01, S-OD1 |
| MS06a | Isolated pre-target evidence | not started | none | none | none | none | S, 20-30 min + GS |
| MS06b | Inactive target policy primitives | not started | none | none | none | none | M, 35-50 min |
| MS06c1 | Nullable target transport; no policy activation | not started | none | none | none | none | M, 45-60 min + GG check/GR |
| MS06c2 | Atomic all-stage target activation | not started | none | none | none | none | M, 50-60 min + GG/GR |
| MS06d | Isolated target comparison | not started | none | none | none | none | S, 20-30 min |
| MS07a | Window kernels and pattern metrics | not started | none | none | none | none | M, 50-60 min |
| MS07b | Chain/depth integration and Hell 1 pilot | not started | none | none | none | none | M, 50-60 min + E/GH/pilot |
| MS07c | Cutoff tooling, cost and measured selection | not started | none | none | none | none | M, 40-55 min + GS/GP-cost |
| MS07d | Checked qualification merger | not started | none | none | none | none | M, 40-55 min |
| MS07e | Complete first checkpoint | not started | none | none | none | none | S, 25-40 min (GQ-first, 135 cells) |
| MS08a | Skyscraper | not started | none | none | none | none | M, 40-55 min |
| MS08b | Two-string kite | not started | none | none | none | none | M, 40-55 min |
| MS08c | Empty rectangle | not started | none | none | none | none | M, 50-60 min |
| MS09a | Finned X-Wing/sashimi | not started | none | none | none | none | M, 50-60 min |
| MS09b | Finned Swordfish | not started | none | none | none | none | M, 40-55 min |
| MS10a | Remote pairs | not started | none | none | none | none | M, 40-55 min |
| MS10b | WXYZ-Wing | not started | none | none | none | none | M, 45-60 min |
| MS11a | UR types 3/4 | not started | none | none | none | none | M, 50-60 min |
| MS11b | Hidden UR | not started | none | none | none | none | M, 35-50 min |
| MS11c | BUG+1 | not started | none | none | none | none | M, 45-60 min |
| MS12 | Restricted XY-chain | not started | none | none | none | none | M, 50-60 min |
| MS13a | Inactive graph/proof checker | not started | none | none | none | none | M, 50-60 min |
| MS13b | Group-proof consumers | not started | none | none | none | none | M, 35-50 min |
| MS13c | Grouped-chain activation | not started | none | none | none | none | M, 50-60 min |
| MS14a | Inactive multiset support | not started | none | none | none | none | M, 50-60 min |
| MS14b | Law of leftovers integration | not started | none | none | none | none | M, 40-55 min |
| MS14c | Existing Killer regressions | not started | none | none | none | none | S, 25-40 min |
| MS15a | Inactive bounded ALS enumerator | not started | none | none | none | none | M, 45-60 min |
| MS15b | ALS-XZ integration | not started | none | none | none | none | M, 50-60 min |
| MS16 | Sue de Coq | not started | none | none | none | none | M, 50-60 min |
| MS17a | History marker, store 1 | not started | none | none | none | none | S-M, 30-45 min |
| MS17b | Rating/cache 3 and limit freeze | not started | none | none | none | none | M, 50-60 min |
| MS18a | Matched final soak | not started | none | none | none | none | S, 25-35 min |
| MS18b | Cap/window final rechecks | not started | none | none | none | none | S, 25-40 min |
| MS18c | Qualify and publish offers | not started | none | none | none | none | M, 35-50 min + owner actions |
| MS18d | Final GP preflight/performance/hashes | not started | none | none | none | none | M, 40-55 min + GP/GG |
| MS18e | Final correctness/release evidence | not started | none | none | none | none | S, 25-40 min |

The sizes of the tasks not started are the index's active-time allowances; gate machine time is additional.

### 3.1 Notes per task

| Task | Note |
|---|---|
| MS01 | The developer also updated the suite counts in `generator/design.md` §15 and both developer guides (accepted as living facts). Finding: at the baseline Hell 1's tier is empty too (Nishio sits in Nightmare's tier), so Hell 1 stays vacuous until MS07b registers `nishioDeep` |
| MS02 | `soak.js` printed the absolute path of its ledger; the orchestrator changed it to a repository-relative path and rewrote the 17 `.txt` evidence files. SA2 added a planning paragraph to the task file while it ran (informational) |
| MS03a | A first recording set was discarded after an edit changed the source hash (in it wire G10 and G11 had overlapped in one tool call); all 18 records were made again, one at a time |
| MS03b | The orchestrator corrected a stale paragraph of `docs/puzzle-exchange/fixtures.md`, outside the task's file list |
| MS03d | Accepted legacy changes of `perf.js`: `--check-hashes` with `--update-hashes` now conflict, `--alloc` and timing flags are refused in hash modes, the unfiltered write is atomic and CRLF, generation failures exit 1. Editing `tool-records.js` made MS03a's ledgers stale, as expected; MS04 recorded fresh ones |
| MS04 | Accepted with one open finding: the manual `greater-than` suite fails `normal: CV6 p95 within the 700 ms budget` (2,035 ms against the 1,400 ms limit). The cause is `ineqChain` 65 to 46 alone (97 ms with 65 restored). Seeds 7000-7039: p95 5,043 ms against 125 ms. Raised as CV6-01. All 27 changed hashes are explained by the orders; `classic-medium` (label Normal) rates Easy, recorded in `v3Expected` with the label kept |
| MS05a | SA1's FS01 (worker and cache suites) and FS05 (`required: null` on `tune.miss`) were given to the developer as binding addenda because the task file was frozen at dispatch. Only the four wire records changed (`"exact":true` added). The English warning read "a Easy technique"; MS05b1 rewords it (section 5, D13) |
| MS05b1 | Dispatched 2026-11-12 at 18:57 and stopped at about 22:10 without acceptance. It makes exactness require the tier (`isExact`, `qualityOf`: 0 exact, 0.5 shallow), ranks the keeper by that quality, stops at the first exact sample or keeper, continues after a shallow refinement, emits `tune.hit`/`tune.shallow`/`tune.miss` with `required`, and adds the shallow warning and explanation texts. E: the complete GG (149 of 520 changed, every one an old shallow puzzle replaced by a different required one; mean attempts 1.13 to 2.38) and the four wires were written; the analysis merge is refused because G13 needs 220 s against the recorder's 120 s. Three recordings were made; an attribution found a tie-order defect (`wordoku/normal#10946`), fixed by asking the keeper before the search's last state. SA2 raised RF01 (Blocker), which became CV6-02. Its evidence says mega's test budget is 120 s; SA2 and SA1 corrected this to 60 s (`generator/tests/suites/mega.test.js:654`) |
| MS05r1 | One inline `node -e` of about 70 s ran outside the lock helper (incident; its numbers are not in the evidence). Lock starvation: Pentomino's page loop freed the timing lock for about 1 s every 40-80 s, so the first G13 call timed out after 10 minutes without starting. The task's unregister/register wrapper of the `cells` strategy is impossible (the registry refuses both); the developer wrapped `SG.digger.getStrategy` instead, with no production edit |
| MS05r2 | No incident. Its summary row was once dropped from the check-list by a PowerShell array-literal mistake of the orchestrator and added again |
| MS05r3 | The premise audit (not an acceptance command) preloaded the setting in the main realm only: three cross-realm worker failures were artifacts and the process hung to the 540 s limit, recorded as a timeout. The sign-memo test (MS05b1-T02) fails only at an allowance of 0 and keeps `Infinity` in its own scope. The developer removed a default-pinning assertion from its own new test so that MS05r4 could change the literal without a test edit |
| MS05r4 | The developer added `Run-Dv3Logged.ps1` and `runs.jsonl` (the helper unchanged, with transcripts and lock waits). The preflights ran with `-AllowExit1` to keep the failing output; the real exit code 1 is recorded. `default-pin-manifest.json` lists no pin and the two mega blockers. Not run, by scope: the full `pipeline`, `mega`, `steps`, `replay` and `player` suites, GG, GR and the manual corpora. The orchestrator did not re-run anything: the stop is a decision, not a defect |

## 4. Issues and the resolution chosen

### 4.1 Questions answered before the acceptance (2026-11-12)

All are in [clarifications-resolved.md](clarifications-resolved.md), Parts A to G. The answers were committed in
`1398dde` (10:00); AC01 and the plan author's acceptance (Part G) in `2c665bb` (11:49); the owner accepted at 11:50.

| Question | Decision | Decided by | Resolution |
|---|---|---|---|
| SA2-Q-S01 VeryEasy tier | (a) the three singles, with a vacuous certificate (`required: true`, `floorLevel: null`) | Fable | R1 |
| SA2-Q-S02 bound of the floor solve | Withdrawn with SA1-Q-S7: no second production solve; the reference `certifyFloor` uses the inherited budget only | Fable | R2 |
| SA2-Q-S03 / SA1-Q-S4 target scope | One target per sample through the guided dig, `refineDown` and local search; raw and attainable-range positions | Owner, on the command line | R6, R7, R23 |
| SA2-Q-S04 Nishio depth | `nishio` depth 1; `nishioDeep` minimum 2, default maximum 2, 3 only on request | Fable | R9 |
| SA1-Q-S1 chain cutoff | Measure C = 4 and C = 6 on 36 fresh requests each; more exact hits wins, 6 on a tie; recheck at MS18 | Owner | R9 |
| SA2-Q-S05 pattern limits | R10 starting values; one evidenced own-limit change in the introducing task; frozen with v3 at MS17 | Fable | R10 |
| SA2-Q-S06 / SA1-Q-S3 warnings | Both `difficulty.approximate` and `difficulty.shallow`, plus the `tune.shallow` event | Fable | R4 |
| SA2-Q-S07 / SA1-Q-S6 certificate and version | No floor certificate in exports; `ratingVersion` in new history entries; history store stays 1 | Fable | R22 |
| SA2-Q-S08 base costs, ALS group | Cost table B; group `chain` | Fable | R10 |
| SA2-Q-S09 Killer cage interaction | Keep `cageCombo` and add quick regressions; no `cageLocked` | Fable | R17 |
| SA2-Q-S10 reference labels | Keep the v2 labels and priors, add `v3Expected`, record reclassifications; the plan's "adjust the new weight" withdrawn | Fable | R20 |
| SA2-Q-S11 help examples | Curated real puzzles with bounded tooling; stop and report if one cannot be found | Fable | R21 |
| SA1-Q-S2 Easy tier | A singles-only Easy puzzle is shallow | Fable | R1 |
| SA1-Q-S5 levels no longer offered | The final qualification decides; no intermediate pruning or weight calibration | Fable | R24 |
| SA1-Q-S7 derived requiredness | Derive `required` from the canonical rating after the order fix; `certifyFloor` stays the reference | Fable | R2 |
| SA2-Q-S12 shallow-search budget | (c) a common cap measured by the R5 rule; existing caps until then | Fable | R5 |
| AUTH-S1 qualification record | Update the live table in place; archive v2 under `docs/difficulty-v3/` | Fable | R24 |
| AUTH-S2 tooling position | Tooling before S2.1 | Fable | R21 |
| PROC-S1 order of work | Baseline and tooling, S2.1, S1.1, S1.2, S2.2, S3, S2.3; first qualification after S2.2 | Fable | R24 |
| Part D, corrections 1 to 16 | All accepted; item 13 (the unmeasured cap of 128) replaced by SA2-Q-S12 | Fable | report §4 |
| AC01 attainable range | An analytic lower bound, null with a reason where undefined, values unclamped | Fable (Part F) | R7, R23 |

### 4.2 CV6-01: Greater-Than Normal generation performance (S-OD1)

| | |
|---|---|
| What happened | After MS04 the manual `greater-than` suite fails its CV6 assertion: p95 2,035 ms against a 1,400 ms limit (700 ms design budget). The cause is the contracted `ineqChain` order, 65 to 46: honest Normal puzzles are rarer and the sign dig has no guided stage (seed 308: 4 attempts and 604 steps instead of 1 and 27) |
| Options | (a) keep the order and the contracts; authorize a bounded Greater-Than strategy repair; (b) accept a slower Greater-Than Normal contract or not offer the cell; (c) revisit the ordering or requiredness design |
| Decision | Fable: (a), new task MS05e "guided sign dig" (a pool of `SIGN_POOL` = 8 signs, ranked by the R6 comparator, 4/8/16 compared once, no change of floors, caps, orders, weights, bands or the CV6 assertion), with (b) fixed in advance as the only fallback; (c) rejected. MS06b forwards the sample's target to the sign dig |
| Decided by, when | SA2 raised it on 2026-11-12 after MS04; Fable answered the same day; the owner confirmed both points at 18:20 (S-OD1). S-OD2 later moved MS05e's prerequisite to MS05r6b's combined commit |
| Recorded in | [clarifications-resolved.md](clarifications-resolved.md) Part H, CV6-01; check-list §4; `tasks/difficulty-v3/MS05e-guided-sign-dig.md`; notes.md MS04 |
| State | CV6 is still red and recorded as open. MS05e is not started |

### 4.3 CV6-02: requiredness activation cannot cross its own validation (S-OD2)

| | |
|---|---|
| What happened | MS05b1 activated requiredness with no extra allowance, as R5 required until the measurement. Attempts that never meet a required puzzle now use their whole caps and all eight attempts. G13 (samurai Nightmare, seed 42) went from 0.16 s to 220 s and cannot be recorded under the 120 s guard; the mega Nightmare quick tests fail at their 60 s guard; the Generator quick set no longer fits one 540 s command. The pack's order made this state an independently green prerequisite of the measurement that could bound it. SA2 recorded it as runtime finding RF01 (Blocker) |
| Options | (a) keep MS05b1 open; pull the consumers of MS05b2 and the instrumentation of MS05c forward on the active tree; run MS05d's R5 experiment unchanged; MS05b3 after the selection; one combined acceptance. (b) a provisional finite allowance in MS05b1. (c) select on the old inactive path (not valid). (d) a validation-tooling task (recorder and test guards, G13 persistence, bounded quick coverage). (e) accept a slower interim or product validation contract. (f) replace G13's seed or level. SA1 added (g): land MS05b1 behind an off-by-default switch so that every commit stays green |
| Recommendations | SA2: (a). SA1: (a) amended: (1) profile G13 and mega first; (2) measure them at all four R5 settings as non-selecting diagnostics; (3) persist G13; (4) the owner decides now what the mega tests assert for a fallback; (5) (g), or at least checkpoint commits labelled "not accepted", instead of one large uncommitted tree |
| Decision | Owner: (a), 2026-11-13 06:45 (S-OD2). A "none" winner or a remaining G13, mega or quick failure stops the recovery for a further decision |
| Execution | Orchestrator: SA1's points (1) and (2) adopted inside (a) (MS05r1 and MS05r4 part A); (3) and (4) kept for the owner at a stop; (5) and (g) not adopted; private backup refs instead of checkpoint commits. SA2 wrote MS05r1 to MS05r6 ("RECOVERY TASKS READY"); SA1 reviewed them (FS27 to FS33, "MS05r1 DISPATCHABLE"); SA2 accepted all seven and split MS05r6 ("MS05r5-r6 READY") |
| Plan author | "Not requested; the owner answered directly. The plan author may still comment" |
| Recorded in | [clarifications-resolved.md](clarifications-resolved.md) Part H, CV6-02; `docs/difficulty-v3/gpt-6-astra/7-response-to-task-pack-review.md` §8, §10, §11; check-list §2 and §4 |

### 4.4 CV6-03: R5 selects 256, but mega Nightmare exceeds the existing limits (S-OD3, (c) pending)

| | |
|---|---|
| What happened | MS05r4 selected 256 under the unchanged R5 rule and made it the default. The original-limit preflights then ran: G13 passes (104.7 s of 120 s, 8 attempts, a shallow fallback); mega12 Nightmare fails (seed 1: 48.2 s against `timeLimit(3000)` = 6 s); mega16 Nightmare fails (both tests `budget.exceeded` at the 60 s guard; the diagnostic of seed 3 took 310 s at 256 and finds an exact puzzle only at attempt 6). The ordinary samples alone take 38 s (mega12) and 263 to 281 s (mega16) at every setting, so no allowance can meet these limits. The app allows 120 s of active generation, then clears the result and shows "Generation took longer than allowed" |
| Options | (a) move normal-attempt mega Nightmare generation from the quick contract to a measured slow tier (new MS05r5m). (b) accept it as much slower quick work with new guards. (c) change the large-grid product policy (Fable; proposed MS05r5p): a deterministic bound on sample or attempt work with a truthful fallback, or stop offering mega16 Nightmare. (d) persist the same G13 (MS05r6a): five saved wires, fourteen analyses, 520 GG keys |
| Recommendations | SA2: (a) + (d), keep 256, and an explicit (c) disposition before publication; no silent raise of the browser budget. SA1: (a) under three conditions, (d), keep 256: (i) the slow tier is a tool, not a `*.test.js` suite; (ii) it runs once, after the last engine change, one full request per locked run with the 500 s diagnostic budget, keyed by request identity; (iii) the quick set keeps a one-attempt mega12 Nightmare request and a scripted mega16 stop control. SA1 disagrees that (c) needs a new policy in the recovery: final qualification (MS18c) already hides a level that misses. SA1 adds that CV3's mega16 Nightmare cell would stop MS05r6b a third time, and that no task owns the CI workflows |
| Decision | Owner, 2026-11-13 14:25 (S-OD3): (a) + (d), 256 stays the default; SA1's conditions (i) to (iii) are the execution detail of (a) (orchestrator); (c) is decided now, not deferred to publication, and the plan author designs it |
| Pending | Plan-author answer: the (c) design for mega12, mega16, samurai and any other large-grid cell the data shows, for Nightmare and Hell where it applies; and (1) whether (a) must still extend to MS05r6b's CV3 mega16 Nightmare cell, (2) whether the CI workflow item needs a task now, (3) where the change goes in MS05r5, MS05r5m, MS05b3, MS05r6a, MS05r6b |
| Recorded in | [clarifications.md](clarifications.md), CV6-03 (open); [shallow-cap-2026-11-13.md](shallow-cap-2026-11-13.md); `docs/difficulty-v3/evidence/MS05r4/`; `docs/difficulty-v3/gpt-6-astra/7-response-to-task-pack-review.md` §13 ("CV6-03 READY"); `docs/difficulty-v3/claude-opus-5.5/6-review-of-task-pack.md` §15 |

### 4.5 PR-S1: review of the progress at the pause (pending)

Raised by the orchestrator at the owner's request on 2026-11-13. It asks Fable (1) for the direction to take next,
including whether the recovery sequence and the rest of the pack continue as planned, together with the CV6-03 (c)
answer, and (2) for any difference in section 5 of this document that Fable does not accept, and what replaces it.
Recorded in [clarifications.md](clarifications.md), PR-S1. Plan-author answer: pending.

### 4.6 Findings of SA1's pack review that changed tasks

SA1 reviewed the pack in four rounds (2026-11-12 17:46 and 21:50; 2026-11-13 06:30 and 09:25). SA2 accepted all
33 findings and disputed none (16 Major, 17 Minor; `docs/difficulty-v3/gpt-6-astra/7-response-to-task-pack-review.md` §11.4). The
orchestrator reviewed the revisions before each dispatch. Details: `docs/difficulty-v3/claude-opus-5.5/6-review-of-task-pack.md`.

| Finding | Severity | Change made |
|---|---|---|
| FS01 | Minor | Worker and cache round trips added to the targeted suites (given to MS05a as an addendum) |
| FS02, FS03 | Major | MS05b1: an exact keeper ends the local search; the three outcomes of an above-band refinement are specified |
| FS04 | Major | MS05b split into MS05b1 (engine, UI, GG/GR) and MS05b2 (consumers, prefix check, manual contracts) |
| FS05 | Minor | `tune.miss` carries `required: null` (MS05a addendum, MS05b1) |
| FS06 | Minor | A stated algorithm for the ordered-prefix check, exit 2 before generation (now `prefixViolationOf`, MS05r2) |
| FS07, FS08 | Minor | Counting rules for refinement ratings and memo visits; current soak anchors and absolute-index shards (now MS05r3) |
| FS09 | Major | GD at the MS05 boundary in bounded, coverage-preserving shards instead of a longer command ceiling (check-list §7, "GD") |
| FS10, FS24 | Minor | Spaces before numerals in prose |
| FS11, FS21 | Minor | Stale anchors (MS06a, MS06d, MS08a, MS11c, MS17b, MS18a to MS18e) |
| FS12, FS16 | Minor | MS06b and MS06c2: `acceptReveal` takes the exactness of both states; the refinement example gets its band and entry point |
| FS13, FS14 | Major | MS06c2: a refused pool winner ends the cells guided pass; the local acceptance predicate is written out |
| FS15 | Major | MS06c split into MS06c1 (nullable transport, no draw) and MS06c2 (one draw, atomic activation) |
| FS17 | Minor | MS07a: supplementary soundness states are added to the random sweep, not substituted |
| FS18, FS19 | Major | MS07b made smaller: the soak `--chain-window` option and the cost runs move to MS07c; a two-request Hell 1 pilot before GD and GQ |
| FS20 | Major | The sample target's hand-off to the Greater-Than sign dig is tested (MS06b, MS06c2) |
| FS22 | Major | New MS05b3: lazy per-level manual corpora and an early run of the seven manual contracts |
| FS23 | Minor | MS18d projects every GP cell from GQ-final times before the first GP command |
| FS25 | Major | Selectors anchored with `> ` (the Easy selector also matched Very Easy) |
| FS26 | Major | CV3 registered per level plus one `CV3 unsupported:` test; projected cells over 450 s deferred to the closing task |
| FS27 | Major | The original-limit G13 and mega preflights move to the end of MS05r4, before MS05r5 and MS05b3 (this is why MS05r4 stopped) |
| FS28 | Major | MS05r6 split into MS05r6a (E and pins, step evidence) and MS05r6b (quick, GD, audit, sole acceptance) |
| FS29 | Major | MS05r3 owns schema and no-allowance premises; MS05r4 classifies failures; MS05r6a owns the listed default-coupled pins |
| FS30 | Minor | MS05r6b reports the standing quick cost for acknowledgement; AGENTS.md and the guides are corrected |
| FS31 | Minor | MS05r4's focused checks go through the lock helper |
| FS32 | Minor | The orchestrator's backup recipe corrected (temporary index instead of `git stash create`) |
| FS33 | Minor | MS05r3 alone may extend MS05r1's driver; MS05r1's evidence stays immutable |

Not adopted: SA1's suggestion (review §3) of a seventh, report-only Greater-Than Normal cell in the R5 run; SA2 kept
the selection unchanged because MS05e captures its own Greater-Than baseline (SA2's response §4).

### 4.7 Lock incidents

| Incident | When | What happened | Resolution | Recorded in |
|---|---|---|---|---|
| Lock starvation | MS05r1, 2026-11-13 morning | Pentomino's 20-run page loop freed its timing lock for about 1 s every 40-80 s; the sudoku helper polls every 5 s, so the first G13 call timed out after 10 minutes without starting (12 minutes of lock wait in all) | Orchestrator rule: a loop of locked runs leaves at least 15 s between release and re-take; new helper copies wait up to 20 minutes ("HELPER WAIT 20") | MS05r1 log; check-list §7 "Fairness"; SA2's response §12 |
| Unlocked run | MS05r1 | One inline `node -e` of about 70 s ran outside the helper, possibly overlapping a Pentomino timing slot | Logged as an incident; none of its numbers is evidence; an inline `node -e` that generates puzzles now counts as a command over 10 s | MS05r1 log; check-list §7 |
| Hung audit | MS05r3 | A premise-audit process hung until the helper's 540 s limit | Recorded as a timeout; not an acceptance command | MS05r3 log |
| Overlapping recordings | MS03a | Wire G10 and G11 overlapped in one tool call in a discarded first set | All 18 records made again, one at a time | MS03a log |

MS05r4 waited 17.7 minutes for locks over 54 locked commands, with no overlap with Pentomino and the 15 s pauses
kept (MS05r4 log).

### 4.8 Other incidents

| Incident | What happened | Handling | Recorded in |
|---|---|---|---|
| Machine sleep | The machine slept from 22:19 on 2026-11-12 to 05:59 on 2026-11-13; the agents resumed by themselves | The sleep is excluded from the Execution logs' durations | Orchestrator's records |
| Progress mails | The mail service has failed with 502, 503, 504 (and 500) since 22:16 on 2026-11-12; the last mail that went out was at 21:52 | Every 30-minute tick still tries; the reports were given in the CLI | Orchestrator's records |
| Lost summary row | A PowerShell array-literal mistake (the comma binds tighter than `+`) silently dropped the MS05r2 summary row from the check-list | Added again afterwards | Orchestrator's records; check-list summary |
| Absolute path in evidence | MS02's soak printed the absolute ledger path into 17 `.txt` files | Fixed by the orchestrator (repository-relative path) | MS02 log |
| Wrong mega guard in evidence | MS05b1's evidence says the mega quick tests have a 120 s budget | Corrected by SA2 and SA1: the guard is 60 s; 120 s is the harness argument and the unrequested `SG_DEEP` branch | CV6-02 text and SA1's cross-check |
| Tie-order defect | MS05b1's first recording returned a later fallback for `wordoku/normal#10946` | Fixed inside MS05b1 (the keeper is asked before the search's last state); recorded again | notes.md MS05b1 |

### 4.9 Orchestrator decisions

| Decision | When | Recorded in |
|---|---|---|
| MS05b1 held, not accepted; SA2 asked for a disposition | 2026-11-12, about 22:14 | Orchestrator's records; SA2's response §8 |
| SA1's diagnostic points (1) and (2) adopted inside CV6-02 (a); (3) and (4) kept for the owner at a stop; (5) and (g) not adopted; private backup refs | 2026-11-13, after 06:45 | clarifications-resolved.md Part H, CV6-02 |
| SA1's conditions (i) to (iii) treated as the execution detail of CV6-03 (a) | 2026-11-13, 14:25 | clarifications.md CV6-03 |
| Stay serial: no second worktree for Pentomino tasks, because the Sudoku repository is the critical path | 2026-11-13 | Orchestrator's records |
| Lock fairness (15 s gap) and the 20-minute acquisition wait | 2026-11-13, after MS05r1 | check-list §7 |
| Task files freeze at dispatch; corrections go to the developer as binding addenda (MS05a: FS01, FS05) | from 2026-11-12 | MS05a log |
| MS05r4: no re-run; the stop goes to the owner | 2026-11-13, 13:36 | MS05r4 log |

## 5. Differences from the original design

Three references are compared with what was built or decided: Fable's [plan.md](plan.md) (cited as "plan §n"),
the accepted [report-detailed.md](report-detailed.md) (R1 to R24, "report §n") and the accepted task pack (first
tranche `f8fcf5d`, the rest `7c2b524`; read with `git show <sha>:<path>`). The last column of each entry says who
approved the difference:

- **Approved by Fable**: Fable answered or accepted it in [clarifications-resolved.md](clarifications-resolved.md).
- **Owner, without the plan author**: an owner decision on which Fable was not asked, or not asked to answer.
- **Analysts or orchestrator**: a task-structure or process change made inside the pack's authority or an owner
  decision; Fable was not asked.
- **Pending Fable**: waits for a plan-author answer in [clarifications.md](clarifications.md).

### 5.1 Differences Fable approved before the implementation

These come from the analysis, are part of the accepted report and need no new decision. They are listed so that
the comparison with the plan is complete.

| Plan text | Now | Approved in | Built |
|---|---|---|---|
| Plan §2: VeryEasy's tier is "∅ (vacuous)" | The three singles, with an explicit vacuous certificate; Easy is not exempt (a singles-only Easy puzzle is shallow) | SA2-Q-S01, SA1-Q-S2; R1 | MS01 |
| Plan §5 S1.1 steps 1-2: `ensureFloor` runs a second restricted solve; `rating.floor === undefined` counts as exact | `requiredOf(rating, level, model)` derived from the complete canonical rating after the order fix, no second solve; `certifyFloor` stays the reference with the inherited budget; no missing-certificate fallback | SA1-Q-S7, SA2-Q-S02, Part D 3; R2 | MS01 (reference), MS04 (`requiredOf`), MS05b1 (use) |
| Plan §5 S1.1 step 3: `distanceToLevel` adds 0.5 for a shallow result | The same ranking (0 exact, 0.5 shallow, else the level distance), computed before every keeper prefilter | Part D 2; R3 | MS05b1 |
| Plan §5 S1.1 step 2: the local search continues within the existing caps | Plus a common extra allowance chosen by the measured R5 rule | SA2-Q-S12; R5 | MS05r3, MS05r4 (D1) |
| Plan §5 S1.1 step 4: tier-first steering of the guided dig in S1.1 | Moved to MS06 with discriminated objective results; proposal priorities are never compared with scores | Part D 4; R6 | not built |
| Plan §5 S1.1 step 5: "Decide: keep both or make shallow replace approximate" | Both warnings, plus the `tune.shallow` event | SA2-Q-S06, SA1-Q-S3; R4 | MS05a, MS05b1 |
| Plan §5 S1.2: target in the guided dig; refinement toward it optional | One target per sample through the guided dig, `refineDown` (same 64-rating cap) and local search; raw and attainable-range positions | Owner (SA2-Q-S03, SA1-Q-S4); AC01; R6, R7, R23 | not built |
| Plan §5 order S0, S1, S2; no tooling task | Baseline and tooling, S2.1, S1, S2.2, S3, S2.3; tooling (MS03) before the orders | PROC-S1, AUTH-S2; R21, R24 | followed |
| Plan §5 S2.2: `forcingChain` at most 6 links; `nishioDeep` depth 2-3; `forcingChainLong` order 192 until S3 | Cutoff C measured between 4 and 6 (more exact hits, 6 on a tie); `nishioDeep` default maximum 2; order 198 from MS07 | Owner (SA1-Q-S1); SA2-Q-S04; Part D 6; R9 | not built |
| Plan §5 S3, last paragraph: adjust a new weight so that reference puzzles keep their level | Priors kept; v2 labels kept as history; `v3Expected` added; reclassifications recorded in notes.md | SA2-Q-S10; R20 | MS04 began it (`classic-medium`) |
| Plan §5 S3 group 5: possibly a new `cageLocked` | Dropped; `cageCombo` regressions only (40 IDs in all) | SA2-Q-S09; R17 | not built |
| Plan §5 S3: base costs, ALS group and search bounds not given | Cost table B, group `chain`, R10 starting limits frozen with v3 | SA2-Q-S08, SA2-Q-S05; R10 | not built |
| Plan §4 rule 8 against the S1 gate's `qualification.md` | The live table is updated in place after a v2 archive | AUTH-S1; R24 | not built |
| Plan §1.1: scores hug the top of the band; a Hard puzzle can be published without needing a Hard technique | Classic9 Hard was already required in 24 of 24 (12 of 12 in MS02); requiredness bites at Normal, Master, Nightmare, Killer, Jigsaw and Greater-Than | Part D 5, 16 | MS02 confirmed it |
| Plan §5 S2.3: optional "rated with v2" marker | `ratingVersion` in new history entries, "made by an earlier version" for old ones; history store stays 1 | SA2-Q-S07, SA1-Q-S6; R22 | not built |
| Plan §4 rule 9: one commit per step (S0.1, S0.2, S1.1, ...) | One commit per accepted dispatch of the pack (report Part II: tasks over size L split into sequential parts) | Part G accepted the report | followed until MS05a |

### 5.2 Differences decided after the acceptance

#### D1. The shallow-search allowance is 256

| | |
|---|---|
| Original | Plan: no extra allowance; the local search runs while not exact within the existing caps (plan §5, S1.1 step 2). Report R5: compare 64, 128, 256 and no extra cap on six cells; "Choose the smallest finite cap with no exact-hit loss in any cell against no extra cap and a strict reduction in median full ratings in at least one cell. Otherwise choose no extra cap"; existing caps only until then; recheck at MS18. Pack: MS05c instruments at `Infinity`, MS05d selects |
| Now | `SHALLOW_SEARCH_DEFAULT = 256` (`generator/js/engine/digger.js` line 653), read through `SG.digger.SHALLOW_SEARCH_RATINGS`. Hits of 12 and upper median of full ratings, none against 256: classic9 Normal 10/75 and 10/75; Master 12/4 and 12/4; Nightmare 2/1,417 and 2/1,345; Killer Hard 0/512 and 0/512; Killer Expert 0/2,250 and 0/2,250; Jigsaw 9 Expert 11/318 and 11/318. 64 and 128 lose a classic9 Nightmare hit (0 and 1 of 12). The choice rests on one cell: a 5.08 % lower median (its 12-request totals: full ratings -15 %, time -11 %) |
| Reason | The approved rule, applied unchanged to 288 requests by MS05r4 |
| Decided by, when | Rule: Fable (SA2-Q-S12, 2026-11-12). Value: MS05r4's measurement (2026-11-13); the owner kept 256 in S-OD3 (14:25) |
| Recorded in | [shallow-cap-2026-11-13.md](shallow-cap-2026-11-13.md); `docs/difficulty-v3/evidence/MS05r4/selection.json`; notes.md MS05r4 |
| Plan author | The rule is approved. The value and its one-cell basis have not been reviewed by Fable |

#### D2. The cost of required exactness, and what the allowance can bound

| | |
|---|---|
| Original | Plan §8: "Cost: one extra restricted solve per rated sample of the requested level (`certifyFloor`), one extra bounded solve per guided dig [...]. Both are cheaper than a full rating"; "Hit rate at hard/expert may drop". R5: the allowance counts full ratings of one local search after its first in-band shallow candidate; "earlier layout/dig ratings do not consume it". Report §7: Nightmare/Hell 1 scarcity and shallow-search cost are mitigated by R5's measurements |
| Now | The derived certificate removed the extra solve (R2). But with R3's stops a shallow sample no longer ends an attempt: every sample runs (up to 12 per attempt), an attempt that meets no required puzzle uses its caps, and such a request runs all eight attempts. Measured at MS05b1 with no allowance: G13 0.16 s to 220 s; classic9 Easy about 3.6 ms to about 250 ms per request; the 149 changed GG keys need 2.38 attempts on average instead of 1.13. At 256 the ordinary samples are unchanged (G13 74 s, mega12 38 s, mega16 263 to 281 s); the allowance shortens only the local continuation (G13 220.5 s to 104.6 s) |
| Reason | A measured consequence of R3, not a defect |
| Decided by | A finding: the developers' evidence, SA2's RF01, SA1's CV6-02 cross-check (point 2) |
| Recorded in | notes.md MS05b1; [recovery-profile.md](recovery-profile.md); [shallow-cap-2026-11-13.md](shallow-cap-2026-11-13.md); clarifications-resolved.md Part H, CV6-02 |
| Plan author | Not reviewed. A common bound on sample or attempt work would change the meaning of the R5 selector and needs its own authorization and evidence (clarifications.md CV6-03, "The measured stop and the default") |

#### D3. MS05's task structure and acceptance boundary (S-OD2)

| | |
|---|---|
| Original | Pack at `7c2b524`, check-list §1: MS05a, MS05b (activation), MS05c (instrumentation at `Infinity`), MS05d (selection, GD, E) in waves 8 to 11, each "independently accepted" and committed; "An accepted prerequisite means its implementation and log are committed". Report §5.2: MS05 is one L task with GG, GR, GS and GD |
| Now | MS05b split into MS05b1 and MS05b2 (FS04); MS05b3 added (FS22). After RF01: MS05b1 kept uncommitted; MS05b2, MS05c and MS05d absorbed by MS05r2, MS05r3 and MS05r4 (and by MS05r6a and MS05r6b for E, GD and closure); new MS05r1 (profiles), MS05r5 (bounded quick tooling), MS05r6a and MS05r6b (FS28); MS05b3 after the selection. Waves 9r1 to 9r6b. Each step gives step evidence only; MS05r6b alone accepts, then one combined commit. The pack's own estimates for the recovery: 285 to 395 active minutes plus 82 to 310 machine minutes (SA2's response §10.1, before FS27 and FS28 raised r4, r6a and r6b) |
| Reason | The no-allowance activation could not pass its own validation, and the approved remedy (R5) was sequenced after it (RF01) |
| Decided by, when | Owner, S-OD2, 2026-11-13 06:45, on SA2's recommendation; SA1 cross-checked; the orchestrator set the execution (section 4.3) |
| Recorded in | clarifications-resolved.md Part H, CV6-02; check-list §1 and §2; the routing sections of MS05b1, MS05b2, MS05c, MS05d and MS05r6 |
| Plan author | Owner, without the plan author ("not requested; the owner answered directly") |

#### D4. The pause-state commit

| | |
|---|---|
| Original | Plan §4 rule 9: "One commit per step [...], each leaving the quick suites green". Check-list §2: one commit per accepted dispatch; under S-OD2 no branch commit before MS05r6b's acceptance |
| Now | One pause-state (WIP) commit on `rating-v3` with MS05b1 and MS05r1 to MS05r4 (MS05r4 stopped) and this document, pushed to `origin rating-v3`. The tree is not green (section 1). The combined acceptance at MS05r6b is still the acceptance boundary of the recovery |
| Reason | The owner's order at the pause, to save the pause state on the branch |
| Decided by, when | Owner, 2026-11-13, at the pause |
| Recorded in | This document, section 1 |
| Plan author | Owner, without the plan author |

#### D5. Mega Nightmare leaves the quick contract (S-OD3 (a))

| | |
|---|---|
| Original | `generator/tests/suites/mega.test.js`: quick generation guard 60,000 ms; Nightmare latency `timeLimit(3000)` (mega12) and `timeLimit(10000)` (mega16), factor 2 locally and 3 with CI; seeds 1 to 4 plus CV5 calls 3, 3 and 4 per board. Plan §4 rule 3: do not weaken or delete a test to make a run pass. Check-list §2 "Mandatory stops" (S-OD2): no guard or time-factor increase, test move or weaker mega assertion |
| Now (decided, not built) | Normal-attempt mega Nightmare generation leaves the quick contract for a measured deep tier: a tool, not a `*.test.js` suite, so that CI's `rest` job stays within its 30 minutes; it runs once, after the last engine change, one full request per locked run with the 500 s diagnostic budget, keyed by request identity (MS05r6b reconciles the records instead of rerunning them; reusing them for MS05b3's CV3 mega cells is SA1's proposed extension, sub-question (1)); the quick set keeps one real one-attempt mega12 Nightmare request (5 to 7 s measured, so it does not keep the old 6 s assertion) and a scripted mega16 stop control. New guards are chosen from complete measurements. Proposed owner MS05r5m, not yet written; SA1 estimates about 2 developer hours and 45 to 65 locked minutes |
| Reason | The ordinary samples alone exceed the old limits at every allowance; at seed 3's cost three mega16 calls take about 931 s and four about 1,241 s, beyond the 540 s command ceiling |
| Decided by, when | Owner, S-OD3, 2026-11-13 14:25; SA1's conditions (i) to (iii) adopted as the detail by the orchestrator |
| Recorded in | [clarifications.md](clarifications.md), CV6-03 |
| Plan author | Owner, without the plan author (Fable is asked only about (c)) |

#### D6. G13 is persisted (S-OD3 (d))

| | |
|---|---|
| Original | R21 and check-list §7 "E": four saved wires (G09 to G12); the fourteen analysis requests are regenerated by the recorder; `steps`, `replay` and `player` regenerate G13 with 120 s budgets. S-OD2 forbade G13 persistence |
| Now (decided, not built) | G13 (samurai Nightmare, seed 42) joins the saved-wire manifest and loader. MS05r6a, expanded, records five wires (G09 to G13), fourteen analyses and all 520 GG keys, wire before analysis. The recorder still regenerates G13 under its 120 s guard; a G13-specific margin would need a separate approval |
| Reason | G13 passes at 104.7 s of 120 s (87 %); persistence removes its repeated regeneration from three quick suites |
| Decided by, when | Owner, S-OD3, 2026-11-13 14:25 |
| Recorded in | [clarifications.md](clarifications.md), CV6-03 |
| Plan author | Owner, without the plan author |

#### D7. The product disposition for large grids is decided now (S-OD3 (c))

| | |
|---|---|
| Original | R24 and SA1-Q-S5: the final qualification (MS18c) decides the offered levels, with no intermediate pruning; a level that is no longer offered is a valid outcome. The apps' 120 s active-generation budget is not part of the plan. Under v2, mega12, mega16 and samurai offered Nightmare (40 of 40; p95 268 ms, 944 ms and 891 ms) |
| Now | The disposition is to be decided now, not at publication, and Fable designs it: pending. Data: mega16 Nightmare seed 3 needs 310 s at 256 and is exact only at attempt 6 (attempts 1 to 5 cost 36.5 to 59.2 s each, so 120 s holds two); mega12 Nightmare 47 s, a shallow fallback; G13 105 s, a shallow fallback. A budget failure is an error, never the best puzzle so far, because the digger counts work rather than time |
| Reason | The app's limit is reached before the puzzle is found; a test-tier decision does not settle what users get |
| Decided by, when | Owner (that it is decided now), S-OD3, 14:25; the design is Fable's |
| Recorded in | [clarifications.md](clarifications.md), CV6-03 |
| Plan author | Pending Fable |

#### D8. The Generator quick set is sharded and slower

| | |
|---|---|
| Original | AGENTS.md: Generator quick suites "about one minute"; report §2.1: 2,818 tests in 111 to 112 s; plan §4 rule 1; check-list §6: both complete quick sets pass at every accepted task |
| Now | The Generator quick set does not fit one 540 s command (MS05b1: three disjoint chunks took 713.8 s; `replay` and `player` each reached 540 s run whole). A whole run is allowed only if projected at most 450 s; otherwise a disjoint, checked suite and full-name manifest (MS05r5's tooling) runs every assertion (check-list §3). MS05r6b measures the standing quick cost per app and presents it for acknowledgement with the acceptance, not as a new gate; AGENTS.md and both developer guides are corrected before the final quick run (FS30). Under S-OD3 (a) the full mega Nightmare requests leave the quick set |
| Reason | The cost of required exactness (D2) |
| Decided by, when | SA2's recommendation 6 in CV6-02, chosen with (a) by the owner (S-OD2, 06:45); FS30 accepted by SA2 |
| Recorded in | check-list §3 and §7 ("Full quick manifest", "Standing quick cost / FS30"); MS05r5; MS05r6b |
| Plan author | Owner and analysts, without the plan author |

#### D9. Bounded commands and shared-machine locks

| | |
|---|---|
| Original | Report §6: stop and investigate a run that exceeds ten minutes. Report §1 item 7 and the check-list at `f788e02` §7: never two heavy or timing runs at once on the shared machine; announce and wait for the slot |
| Now | The `Invoke-Dv3Node` helper (check-list §7): every sudoku command over 10 s, an inline `node -e` that generates puzzles included, waits until `dv3-timing.lock` (Pentomino) is absent, takes `dv3-sudoku.lock`, and runs one bounded command per lock: at most 540 s per Node process, cases projected at most 450 s; at least 15 s between release and re-take; up to 20 minutes' wait for the slot (10 minutes before); a lock-fairness paragraph |
| Reason | Two repositories share one machine; MS05r1's lock starvation and unlocked run (section 4.7) |
| Decided by, when | SA2 (the helper, in the pack revisions); the orchestrator (fairness and the 20-minute wait, 2026-11-13) |
| Recorded in | check-list §3 and §7; SA2's response §12 ("HELPER WAIT 20") |
| Plan author | Analysts or orchestrator |

#### D10. Manual suites and GD reorganised for bounded evidence

| | |
|---|---|
| Original | R4: MS05 runs GD once with `node tests\node-runner.js --suite=difficulty`. The manual variant suites build their whole corpora on first use |
| Now (not built) | GD runs in disjoint, coverage-preserving shards, Nightmare first and every non-batch group once (FS09; check-list §7 "GD"). MS05b3 makes five manual corpora lazy per level, runs Killer's I5 per level, registers CV3 per level plus one `CV3 unsupported:` test, uses selectors anchored with `> ` and a selected total of 1, and defers a cell projected over 450 s to MS05r6b (FS22, FS25, FS26). Assertions, seeds, counts and the 240 s request guard are unchanged. MS05b3 now runs after the selection instead of before the allowance |
| Reason | A whole-corpus run cannot be bounded since requiredness (samurai Nightmare costs 220 s per request without an allowance) |
| Decided by, when | SA1's findings accepted by SA2 (2026-11-12 and 13); the position after the selection by S-OD2 |
| Recorded in | check-list §7; MS05b3 |
| Plan author | Analysts or orchestrator |

#### D11. The Greater-Than repair MS05e and its position

| | |
|---|---|
| Original | Plan §5 S2.1, "Side effects": hints change and regression hashes move; nothing about generation speed. The pack had no task for CV6 |
| Now | MS05e, a guided sign dig: diagnosis first, a pool of 8 signs ranked by the R6 comparator, 4, 8 and 16 compared once, no change of floors, caps, orders, weights, bands or the CV6 assertion; fallback (b) fixed in advance. Position: first "after MS05d, before MS06a"; now after MS05r6b's combined commit, before MS06a |
| Reason | CV6-01 (section 4.2) |
| Decided by, when | Fable (the design) and the owner (S-OD1, 2026-11-12 18:20); the position change by S-OD2 |
| Recorded in | clarifications-resolved.md Part H, CV6-01; `tasks/difficulty-v3/MS05e-guided-sign-dig.md` |
| Plan author | The design is approved (it is Fable's); the moved position follows S-OD2 and was not asked |

#### D12. MS06c split, MS07b trimmed; the target reaches the sign dig

| | |
|---|---|
| Original | Pack: MS06c "Atomic three-stage target activation" as one task (M, 55-60 min). Plan §5 S1.2 point 4: the sign dig "does not go through `digGuidedSteps`, so S1.2 does not apply to it" |
| Now (not built) | MS06c1 (nullable transport, no draw) and MS06c2 (one draw from the sample RNG, activation in all stages at once) (FS15). MS06b forwards an explicit `options.target` to the sign dig, tested for a number, null and absence (FS20). FS12 to FS14 and FS16 fix comparator details. MS07b's cutoff option and cost runs move to MS07c, with a two-request Hell 1 pilot (FS18, FS19) |
| Reason | Task size and testable hand-offs |
| Decided by, when | SA1's findings accepted by SA2 (2026-11-12); the forwarding itself by Fable's CV6-01 answer |
| Recorded in | `docs/difficulty-v3/claude-opus-5.5/6-review-of-task-pack.md` §5 to §7 and §12; SA2's response §7; MS06b, MS06c1, MS06c2, MS07b, MS07c |
| Plan author | The forwarding is approved; the splits are the analysts' |

#### D13. The wording of the shallow warning

| | |
|---|---|
| Original | Plan §5 S1.1 step 5 and R4: "The puzzle is in the requested score band but does not need a {level} technique" |
| Now | "The puzzle is in the requested score band but does not need a technique from the {level} tier." The Vietnamese text says the same. The original gave "a Easy technique" |
| Decided by, when | SA2 assigned the rewording to MS05b1 (SA2's response §2); built in MS05b1 |
| Recorded in | notes.md, MS05a "Wording kept from the task" and MS05b1 |
| Plan author | Analysts, without the plan author |

### 5.3 Values and limits

| Value | Original | Now | Source |
|---|---|---|---|
| Extra shallow-search allowance | None in the plan; R5 measures it, `Infinity` until then | **256** | D1 |
| `CAP_RATINGS`, `CAP_PROPOSALS`, `REFINE_RATINGS`, `UNIQUE_NODES`, `OBJECTIVE_STEPS` | 1,024; 32,768; 64; 200,000; 100,000 (R5) | Unchanged | R5; notes.md MS05b1 ("No new cap") |
| Attempts per request; samples per attempt | 8 by default (1 to 20 in the advanced control); up to 12 | Unchanged; all samples now run when none is exact | CV6-03; SA1's CV6-02 point 2 |
| App active-generation budget | 120,000 ms, both clients and the worker | Unchanged; the user sees "Generation took longer than allowed" | CV6-03 |
| Replay recorder `BUDGET_MS`; G13 budgets of `steps`, `replay`, `player` | 120,000 ms | Unchanged; G13 needs 104.7 s at 256 | MS05r4 |
| Mega quick generation guard | 60,000 ms | Unchanged in the code; to leave the quick contract for mega Nightmare (D5) | CV6-03 |
| Mega Nightmare latency assertions | 3,000 and 10,000 ms times the factor (2 locally, 3 with CI) | Unchanged in the code; failing; to be replaced by measured deep-tier guards (D5) | CV6-03 |
| Manual variants request guard | 240,000 ms | Unchanged | CV6-03 |
| Recovery diagnostic budget | None | 500,000 ms per request in the new driver | MS05r1 |
| Command ceiling | Stop and investigate at ten minutes | 540 s per Node process; projections at most 450 s | D9 |
| Lock wait and gap | None | 20 minutes (10 before); 15 s gap; 5 s polling | D9 |
| Orders `cageCombo`, `ineqChain`, `jellyfish` | 55, 65, 160 to 44, 46, 137 (plan §5 S2.1) | As planned | MS04 |
| Weights, bands, base costs of existing IDs | Kept (plan §1.3) | Unchanged | MS04 |
| CV6 budget | 700 ms design; the recorded run's assertion limit 1,400 ms | Unchanged; p95 2,035 ms fails | MS04 |
| `SIGN_POOL` | None | 8; 4, 8 and 16 may each be tried once, then the value is fixed (MS05e, not started) | D11 |
| Chain cutoff C | At most 6 (plan §5 S2.2) | Measured between 4 and 6 at MS07c (not started) | R9 |
| Pattern-search limits | None in the plan | R10 starting values (not started) | R10 |
| Quick-set time | Generator 111 to 112 s, Player 25 to 30 s (report §2.1) | Generator over 540 s (three chunks 713.8 s at MS05b1); Player 29.3 s | D8 |

### 5.4 Task structure: the accepted pack and now

| Accepted pack (`7c2b524`, 47 dispatches) | Now (59 task files, 55 executable) | Why | Decided by |
|---|---|---|---|
| MS05b, "Activate required exactness throughout generation" | MS05b1 (engine and UI; implemented, retained) and MS05b2 (consumers; absorbed by MS05r2) | FS04 (size); S-OD2 | Analysts; owner |
| None | MS05b3, lazy per-level manual corpora and early I5/CV3, after MS05r5 | FS22, FS25, FS26; S-OD2 moved it after the selection | Analysts; owner |
| MS05c, measurable shallow-search allowance | Absorbed by MS05r3 | S-OD2 | Owner |
| MS05d, select the allowance (with E and GD) | Selection and preflights: MS05r4; E and pins: MS05r6a; quick, GD and closure: MS05r6b | S-OD2; FS27 to FS29 | Owner; analysts |
| None | MS05r1, one-attempt profiles | S-OD2 (SA1's point 1) | Owner, orchestrator |
| None | MS05r5, inventory and results tooling for a bounded full quick set | S-OD2 (SA2's recommendation 6) | Owner |
| None | MS05r6, then split into MS05r6a and MS05r6b; MS05r6 kept as a routing record | FS28 | Analysts |
| None | MS05e, guided sign dig | CV6-01 | Fable; owner (S-OD1) |
| MS06c, atomic three-stage target activation | MS06c1 and MS06c2 | FS15 | Analysts |
| None | MS05r5m, mega Nightmare validation contract (proposed, not written) | S-OD3 (a) | Owner |
| None | A (c) product task (proposed as MS05r5p in CV6-03's options; not written) | S-OD3 (c) | Pending Fable |

### 5.5 Tooling added beyond the plan

| Tool | Added by | Purpose | State |
|---|---|---|---|
| `generator/tests/soak.js` diagnostics and `--json` ledgers | MS02 (R23) | Baseline metrics, both position measures | Committed |
| `generator/tests/replay-goldens.js`; recorder ledgers and merges in `replay-fixtures.js` | MS03a (R21) | Bounded wire and analysis goldens | Committed |
| `player/tests/tools/make-technique-examples.js`, bounded | MS03b, MS03c (R21) | Curated real help examples, Jigsaw included | Committed |
| `generator/tests/perf.js` hash selectors and ledgers | MS03d (R21) | The 520-key GG in shards | Committed |
| Soak exactness on both routes; `prefixViolationOf` | MS05r2 | Correct hits; reject overrides that break the ordered prefix | Pause-state commit |
| Soak `--shallow-cap` (64, 128, 256 or none), `--from`, `--count`, `--total-count`; `mergeShards`; `meta.toolHash`; work conservation | MS05r3 | The R5 measurement in shards | Pause-state commit |
| `generator/tests/difficulty-recovery.js`, `generator/tests/fixtures/recovery-profile.js`, suite `recovery-profile` | MS05r1, extended by MS05r3 | Profiles and diagnostics of G13 and mega | Pause-state commit |
| `generator/tests/artifacts/difficulty-v3/MS05r4/`: `select-cap.cjs`, `select-cap.selftest.cjs`, `g13-closure.cjs`, `Run-Dv3Logged.ps1` | MS05r4 | Selection, G13 preflight, logged helper | Pause-state commit |
| `Invoke-Dv3Node` helper | Check-list §7 | Lock and 540 s ceiling | In the check-list |
| Test inventory, exact selection and results tooling for both runners | MS05r5 | Full quick set in bounded shards | Not started |
| Deep-tier tool for mega Nightmare | MS05r5m (S-OD3 (a)) | Measured slow tier | Not written |
| G13 saved wire | MS05r6a (S-OD3 (d)) | Quick suites stop regenerating G13 | Not written |

### 5.6 Scope changes and deferred items

No item of the plan's scope has been dropped. Added: MS05e (CV6-01), the recovery steps, and the decided but not
written MS05r5m and (c) work. Moved or deferred:

| Item | Original owner | Now |
|---|---|---|
| Acceptance of MS05b1's B/T duties | MS05b1 | MS05r6b |
| Consumers (`soak.js:281`, qualifier, seven manual sites) | MS05b2 | MS05r2 (step evidence complete) |
| `tune.shallow` explanation line and wording | MS05a's handoff | MS05b1 (implemented, not accepted) |
| Early manual I5/CV3 evidence | MS05b3 before MS05c | MS05b3 after MS05r4 and MS05r5 |
| Classic9 GD and outstanding CV3 cells | MS05d | MS05r6b |
| Final E and the G06/G07 pins; G13 analysis | MS05b1, then MS05d | MS05r6a (with G13 persisted) |
| Original-limit G13/mega checks | MS05r6, phase A | End of MS05r4 (done: G13 passes, mega fails) |
| Tier-first steering of the guided dig | Plan S1.1 | MS06 (approved, R6) |
| CV6 closure | Open since MS04 | MS05e, after MS05r6b's commit |
| Large-grid offers | MS18c (R24) | Decided now under S-OD3 (c); design pending |
| CI workflows | None | No owner (section 6.3) |

### 5.7 Process rules

| Rule | Origin | Recorded in |
|---|---|---|
| One developer at a time in this repository; heavy and timing runs never overlap across the two repositories | Owner and report §1 item 7 | Check-list §7 |
| Developers never stage, commit, stash, reset, push or switch branches, nor edit the pack or the logs; the orchestrator re-runs checks, reviews, fills the log and commits | Pack | Check-list §2, "Per-task protocol and commits" |
| Gates pre-approved for their owning tasks; no other heavy run | Owner (report §1 item 6) | Check-list §3 |
| Task files freeze at dispatch; later corrections go to the developer as binding addenda | Orchestrator | MS05a log; MS05r4's frozen helper copy (check-list §7) |
| Execution logs record start, end, duration, model, tokens and AI credits; sleep time excluded | Orchestrator; check-list §8 item 7 | Every log |
| Timing locks, 540 s per command, 15 s gap, 20-minute wait, fairness, inline `node -e` counted | SA2 and orchestrator | Check-list §7 (D9) |
| S-OD2: step evidence, no checkpoint commit, private backup refs, one combined commit after MS05r6b | Owner and orchestrator | Check-list §2; clarifications-resolved.md Part H |
| Questions for Fable go into `clarifications.md` and are pushed so that Fable can answer (a temporary branch when needed) | Owner and orchestrator | This document, section 1 |
| `clarifications.md` keeps only the questions open for the plan author; resolved items move unchanged to `clarifications-resolved.md` | Owner, 2026-11-13 18:03 | Both files' headers |
| A decision that needs the owner goes as an Important mail and a CLI question, then the orchestrator waits; progress mails every 30 minutes (failing since 22:16 on 2026-11-12, reports in the CLI) | Owner and orchestrator | Orchestrator's records |
| Stay serial; the Sudoku repository is the critical path | Orchestrator | Orchestrator's records |

### 5.8 Summary of approvals

| Status | Differences |
|---|---|
| Approved by Fable | Section 5.1; D1's rule; D11's design; D12's target forwarding |
| Owner, without the plan author | D1's value (kept in S-OD3); D3 (S-OD2); D4 (pause commit); D5 and D6 (S-OD3 (a), (d)); D8 with S-OD2 |
| Analysts or orchestrator | D8's standing-cost report (FS30); D9; D10; D12's splits; D13; the process rules of 5.7 |
| Findings not yet reviewed | D2 |
| Pending Fable | D7 (S-OD3 (c)); CV6-03 sub-questions (1) to (3); PR-S1 |

## 6. Open items and risks

### 6.1 Answers pending from the plan author

| Item | What is asked | Where |
|---|---|---|
| CV6-03 (c) | The product disposition for the large grids (mega12, mega16, samurai and any other cell the measurements show), for Nightmare and for Hell where it applies, given the numbers of CV6-03 and the apps' 120 s active-generation budget: for example a size-dependent bound on attempts or work with an honest result, or the level not offered on that board, or another design. Also: (1) whether (a)'s extension to MS05r6b's CV3 mega16 Nightmare cell is still needed under that design; (2) whether the CI workflow item needs a task now; (3) where the change goes in MS05r5, MS05r5m, MS05b3, MS05r6a and MS05r6b. SA2 then writes the tasks and SA1 cross-checks them | [clarifications.md](clarifications.md), CV6-03, "Plan-author answer requested (Fable): design (c)" |
| PR-S1 | (1) The direction to take next, with the CV6-03 (c) answer; (2) any difference of section 5 that Fable does not accept, and what replaces it | [clarifications.md](clarifications.md), PR-S1 |

Sudoku has been stopped since 13:35 on 2026-11-13 for the first of these. The analysts' positions on (c) differ:
SA2 prefers a bounded-effort policy that returns a truthful result within the app's budget, and otherwise not
offering an unqualified mega16 Nightmare; SA1 holds that final qualification (MS18c) already hides a level that
misses, that a bounded fallback would not keep a level offered (fallbacks are misses), and that a large-board
generation-speed task after S3, measured against MS07e's checkpoint, is the alternative if hiding is not acceptable.

### 6.2 A likely third stop at MS05r6b

SA1 (CV6-03 cross-check, point 3): CV3's mega16 Nightmare cell (seeds 1 and 2) projects at about 620 s at seed 3's
cost. MS05b3 would defer it as projected over 450 s; MS05r6b must then close it or stop for the owner, and a request
over the 240 s guard of the manual variants suite blocks. SA1 proposes extending (a) to CV3 with the owner's explicit
consent: MS05b3 takes the mega Nightmare cells from MS05r5m's records with CV3's per-puzzle checks; a request over
240 s goes to MS07e and MS18c as a named availability item, while validity, uniqueness, requiredness and warnings
still block. This is sub-question (1). SA1 also notes that MS07b's non-vacuous Hell 1 raises the same question for
mega's `hell1` quick tests (CV6-02 cross-check, point 2).

### 6.3 CI workflows have no owner

SA1 (CV6-03 cross-check, point 4): `.github/workflows/pull-request.yml` runs every Generator suite, manual ones
included, in five jobs of at most 30 minutes with factor 3; `.github/workflows/pages.yml` runs them before it
deploys; the `rest` group picks up any new `tests/suites/*.test.js` or `tests/manual/*.test.js` file
(`.github/scripts/generator-suites.sh`). No task of the pack owns these workflows, and the v3 pull request needs a
named owner before the merge. This is sub-question (2). Intermediate work is not deployed (check-list §6).

### 6.4 Known issues

| Issue | Evidence | Owner now |
|---|---|---|
| Greater-Than Normal CV6 fails: p95 2,035 ms against the 1,400 ms limit (700 ms design budget) | notes.md MS04 | MS05e; fallback (b) if it fails |
| mega12 Nightmare seed 1 takes 48.2 s against 6 s; both mega16 Nightmare tests end in `budget.exceeded` at 60 s | shallow-cap-2026-11-13.md, "Original limits" | S-OD3 (a), MS05r5m (not written) |
| mega16 Nightmare seed 3 needs about 310 s at 256; the app stops at 120 s of active generation (an inference from recorded times, not a browser run) | clarifications.md CV6-03, "What the browser actually permits" | S-OD3 (c), pending |
| G13 uses 104.7 s of its 120 s guard (87 %) | `docs/difficulty-v3/evidence/MS05r4/preflight/G13.json` | S-OD3 (d) at MS05r6a; the recorder still regenerates it |
| The G13 analysis golden is missing; G06 and G07 goldens are stale; coupled pins fail in `steps`, `replay` and `player` | `docs/difficulty-v3/evidence/MS05b1/evidence.md` | MS05r6a |
| `regression.js` and `replay-wire.js` come from MS05b1's source | section 1 | MS05r6a re-records the complete E |
| The Generator quick set does not fit one 540 s command | `docs/difficulty-v3/evidence/MS05b1/evidence.md` | MS05r5 tooling, MS05r6b run and cost report |
| Availability: Killer Hard and Expert have 0 exact hits of 12 at every setting; classic9 Nightmare 2 of 12; at MS05b1's source 56 GG keys are shallow fallbacks (`killer/hard` 20 of 20) | shallow-cap-2026-11-13.md; notes.md MS05b1 | S3 (MS08 to MS16) may add the missing proofs; the final qualification decides (R24) |
| Large-board Nightmare is likely to be hidden at MS18c (SA1: mega16; very likely mega12 and samurai) | clarifications.md CV6-03, SA1's point 1 | S-OD3 (c), pending |
| CV3 mega16 Nightmare projected at about 620 s against a 240 s request guard | Section 6.2 | Sub-question (1) |
| CI workflows unowned | Section 6.3 | Sub-question (2) |

### 6.5 Records not yet consistent at the pause

| Point | Detail |
|---|---|
| Index checkboxes | The index marks MS05r1 to MS05r3 `[x]`, while check-list §1 (line 28) says the recovery handoff carries "no checkbox/branch-commit claim before r6b's combined acceptance" |
| MS05b1 | Its Execution log is empty and the execution summary has no MS05b1 row; its developer time and AI credits are not recorded in the repository |
| S-OD3 not in the pack | Check-list §2 ("S-OD2 preservation", "Mandatory stops") still forbids G13 persistence and weaker mega assertions; check-list §4 has no S-OD3 row; no task file names MS05r5m; MS05r5, MS05b3 and MS05r6a still require passed original-limit preflights. CV6-03's "Resume path" says the pack author replaces these with the chosen contract and keeps MS05r4's failures as the reason |
| MS05b1 evidence | It calls mega's guard "the 120 s budget of the test"; the guard is 60 s |
| Citations | Task files and records cite "clarifications.md Part H"; since 18:03 that part is in clarifications-resolved.md, with ids and part letters unchanged |
| Times | Some Execution logs give a "review and commit" time later than the Git commit time (section 1.1) |

### 6.6 Evidence still to produce

| Evidence | Owner |
|---|---|
| Registration-only inventory of both quick sets; results and exact-selection tooling; the bounded full-quick plan | MS05r5 |
| Deep-tier records of the full mega Nightmare requests (seeds 1 to 4 and CV5 calls per board; about 42 to 45 minutes at seed 3's cost by the analysts' projections) | MS05r5m |
| Early per-level I5, CV3 and refusal evidence; `deferred-cv3.json` | MS05b3 |
| Final-source guard recheck; complete E (520 keys, five wires with G13, fourteen analyses with a fresh G13); the listed pins and G06/G07 | MS05r6a |
| Every quick assertion of both apps in bounded shards; classic9 GD; closure of the deferred CV3 cells; the standing quick cost; the combined audit | MS05r6b |
| CV6 diagnosis and closure (seeds 300-319 and 7000-7039; Easy, Hard and Expert controls) | MS05e |
| 17-cell target comparison before and after | MS06a, MS06d |
| Hell 1 pilot; window comparison C = 4 and 6 (72 requests); GQ-first on 135 cells | MS07b, MS07c, MS07e |
| GG, GR, GH and pattern-cost records per new technique | MS08a to MS16 |
| GS-after; cap and window rechecks (R5 and R9 rules again); GQ-final; GP; GD; full GG check | MS18a to MS18e |
| Product evidence (browser budget, cancellation, error or fallback) if a (c) product task is added | The (c) task (CV6-03 "Resume path") |

## 7. Remaining plan

Order as proposed in S-OD3 and SA1's cross-check: MS05r5, MS05r5m, MS05b3, MS05r6a ((d) first), MS05r6b, the
combined commit, then MS05e, MS06a and the rest of the pack. The order and the MS05 tasks may change after the (c)
answer. Estimates are the task files' and the index's, active time first and machine time second.

| Order | Task | Estimate | Depends on the (c) answer |
|---|---|---|---|
| 0 | Fable answers CV6-03 (c) and PR-S1; SA2 writes or amends the tasks; SA1 cross-checks | Not estimated | It is the answer |
| 1 | MS05r5, inventory/results and bounded full-quick plan | 40-60 min; 1-5 min | Yes: amended prerequisite and the mega mapping |
| 2 | MS05r5m, mega Nightmare validation contract (not written) | About 2 h; 45-65 min locked (SA1) | Yes: scope and the CV3 extension |
| 3 | A (c) product task, if Fable designs one inside the recovery | Not estimated | Yes |
| 4 | MS05b3, lazy corpora and early I5/CV3 | 45-60 min; 20-90 min | Yes: the CV3 mega cells |
| 5 | MS05r6a, guard recheck, complete E, pins; (d) first | 2-3 h; 20-45 min | Yes: (d) and any engine change of (c) come before E |
| 6 | MS05r6b, full quick/GD, standing cost, audit; then the combined commit | 1.5-2.5 h; 25-60 min | Yes: CV3 closure and any product evidence |
| 7 | MS05e, guided sign dig | 50-60 min plus evidence runs | No (needs the combined commit) |
| 8 | MS06a to MS06d | 170-230 min in all, plus GS, GG and GR | No. MS06a goes with an FS11 addendum in the orchestrator's plan; SA1's third round records FS11 as fixed in the file |
| 9 | MS07a to MS07e | 205-270 min, plus E, GS, GP-cost and GQ-first | Not directly; MS07e records large-board availability |
| 10 | MS08a to MS16 (S3) | 880-1,135 min, plus GG, GR, GH and pattern-cost runs | No |
| 11 | MS17a, MS17b | 80-105 min, plus GG, GR, GH and GD | No |
| 12 | MS18a to MS18e | 150-220 min, plus GS, GQ-final, GP and GD | Partly: MS18c's offers and MS18d's targets for large grids follow (c) |

Sums of the file and index estimates: the MS05 remainder (rows 1, 2, 4 to 7) is about 7 h 45 min to 10 h 30 min of
active time plus 111 to 265 minutes of machine time before MS05e's runs; MS06a to MS18e is about 25 to 33 hours of
active time without gate machine time (the accepted report planned 48 to 74 agent-hours for MS06 to MS18). The
orchestrator's estimate for all remaining serial work after the (c) answer is about 50 to 65 hours, if nothing else
stops and the machine stays awake. For comparison, the report planned 4 to 6 agent-hours for MS05; its developers have
spent about 7 hours so far (MS05a 22 min, MS05b1 about 2 h 45 min, MS05r1 to MS05r4 3 h 57 min).

## 8. Points for the plan author's review

1. **CV6-03 (c), the large-grid disposition.** The data: mega16 Nightmare seed 3 is exact only at attempt 6, after
   about 310 s at 256 (ordinary samples 278 s; attempts 1 to 5 cost 36.5 to 59.2 s each); mega12 Nightmare and G13
   end as shallow fallbacks after 47 s and 105 s; the app allows 120 s of active generation; v2 offered these levels
   with p95 under 1 s. The choices on the table: a size-dependent bound on attempts or work with a truthful result,
   not offering the level on those boards now, leaving it to the final qualification (SA1), or a generation-speed
   task after S3 (SA1). With it, the three sub-questions: the CV3 extension, a CI task, and the place in the sequence.
2. **The allowance of 256.** It follows the approved rule, but on one cell (classic9 Nightmare, 2 hits of 12 at none
   and at 256, median 5 % lower) and it shortens only the local continuation. Is 256 acceptable as the v3 default,
   with MS18b's recheck as written?
3. **The cost beyond the allowance.** R3's stops make every sample and every attempt run when no required puzzle is
   found (D2). Should sample or attempt work get a common bound, knowing that this changes what R5 selected, or is the
   large-grid answer of point 1 enough?
4. **The S-OD2 recovery (D3) and the pause commit (D4).** Fable was not asked. Does the one-acceptance structure stand,
   with MS05r6b as the boundary now that a pause commit exists? SA1's dark-landing alternative (g), which keeps every
   commit green, was not adopted.
5. **The mega test contract (D5) and G13 persistence (D6).** These change test contracts that plan §4 rule 3 protects.
   The owner decided them; Fable may say whether they keep the plan's intent.
6. **Availability before S3.** Killer Hard and Expert give no exact puzzle in 12 requests at any setting; classic9
   Nightmare gives 2. The plan and R24 expect S3's named techniques and the final qualification to settle this, with
   no intermediate pruning. Is that still the intended path?
7. **The slower quick set (D8).** The Generator quick set will no longer run as one command; its measured cost will
   be acknowledged at MS05r6b. Is that acceptable for the rest of the plan, where every task runs both quick sets?
8. **MS05e's position (D11).** It now waits for the whole recovery; CV6 stays red until then.
9. **The shallow warning's wording (D13).**
10. **The CI workflows (section 6.3)**, if not covered by point 1.

## 9. Where to find things

| What | Path |
|---|---|
| The plan | `docs/difficulty-v3/plan.md` |
| Accepted report and brief | `docs/difficulty-v3/report-detailed.md`, `docs/difficulty-v3/report-brief.md` |
| Open questions for the plan author (PR-S1, CV6-03) | `docs/difficulty-v3/clarifications.md` |
| Resolved questions and decisions (Parts A to H: SA2-Q-S01 to S12, SA1-Q-S1 to S7, AUTH-S1/S2, PROC-S1, Part D, AC01, Part G, CV6-01/S-OD1, CV6-02/S-OD2) | `docs/difficulty-v3/clarifications-resolved.md` |
| This document | `docs/difficulty-v3/working-status.md` |
| Notes per task (explained output differences) | `docs/difficulty-v3/notes.md` |
| Baseline (MS02) | `docs/difficulty-v3/baseline.md`, `docs/difficulty-v3/evidence/MS02/` |
| Recovery profile (MS05r1) | `docs/difficulty-v3/recovery-profile.md` |
| Allowance selection (MS05r4) | `docs/difficulty-v3/shallow-cap-2026-11-13.md` |
| Evidence per task | `docs/difficulty-v3/evidence/MS02/` to `MS05r4/` (each with an `evidence.md`, or `recorders.md`, `help-tooling.md`, `jigsaw-help.md`, `hashes.md` for MS03a to MS03d) |
| SA1's analysis and reviews | `docs/difficulty-v3/claude-opus-5.5/` (1 to 5; `6-review-of-task-pack.md`: FS01 to FS33, CV6-02 and CV6-03 cross-checks) |
| SA2's analysis and responses | `docs/difficulty-v3/gpt-6-astra/` (1 to 3; `7-response-to-task-pack-review.md`: dispositions, RF01, the recovery plan, markers "RECOVERY TASKS READY", "MS05r5-r6 READY", "HELPER WAIT 20", "CV6-03 READY") |
| Task index, rules, gates, lock helper, execution summary | `tasks/difficulty-v3/check-list.md` (§1 index, §2 S-OD2 boundary and commit, §4 decisions, §7 gates and lock helper, "Orchestrated execution summary") |
| Task files and Execution logs | `tasks/difficulty-v3/MS*.md` |
| The allowance | `generator/js/engine/digger.js`, `SHALLOW_SEARCH_DEFAULT` at line 653; `SG.digger.SHALLOW_SEARCH_RATINGS` |
| Requiredness | `generator/js/engine/difficulty.js` (`floorTechniques`, `tierTechniques`, `certifyFloor`, `requiredOf`); `generator/js/engine/digger.js` (exactness, keeper, stops) |
| Recovery tools | `generator/tests/difficulty-recovery.js`, `generator/tests/fixtures/recovery-profile.js`, `generator/tests/suites/recovery-profile.test.js`, `generator/tests/artifacts/difficulty-v3/MS05r4/` |
| Measurement and qualification tools | `generator/tests/soak.js`, `generator/tests/fixtures/difficulty-diagnostics.js`, `generator/tests/qualify.js`, `generator/tests/perf.js` |
| Recorders and fixtures | `generator/tests/replay-fixtures.js`, `generator/tests/replay-goldens.js`, `generator/tests/fixtures/regression.js`, `replay-wire.js`, `replay-goldens.js`; `player/tests/tools/make-technique-examples.js` |
| Mega tests | `generator/tests/suites/mega.test.js` |
| CI workflows | `.github/workflows/pull-request.yml`, `.github/workflows/pages.yml`, `.github/scripts/generator-suites.sh` |
| Branch and refs | `rating-v3` (local and `origin`); backup refs `refs/dv3-wip/*` (local); temporary `origin/fable-q/cv6-03` |
| Orchestration history | The orchestrator's session checkpoints 001 to 004, outside the repository (they also cover the Pentomino repository) |
