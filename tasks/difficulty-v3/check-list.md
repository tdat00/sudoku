# Difficulty v3 — task index and overall acceptance

**Scope:** the accepted full Sudoku plan S0-S3, all six S3 groups and S2.3: required-tier exactness,
one band target through generation, the expanded solver, and rating/cache version 3.
**Status:** the first tranche is accepted and implementation is under orchestration. All remaining
executable files are written for serial dispatch; review follows the S-OD4 matrix below.
Only the orchestrator changes Done marks, Execution logs and the execution summary.
**Authority:** `docs/difficulty-v3/clarifications-resolved.md` Parts F/G (AC01 and acceptance),
owner acceptance, 2026-11-12 11:50; Part H, PR-S1/PR-S2, CV6-03 to CV6-05, RP-01, JF-01, GC-01, JF-02 and S-OD1 through S-OD14 also bind.
S-OD3/S-OD4 supersede the earlier performance-only recovery stops, not correctness or evidence integrity.
**Traceability:** [accepted report](../../docs/difficulty-v3/report-detailed.md), R1-R24;
[answers](../../docs/difficulty-v3/clarifications-resolved.md), Parts A-H, PR-S1/PR-S2, CV6-03 to CV6-05, RP-01, JF-01, GC-01 and JF-02;
[open questions](../../docs/difficulty-v3/clarifications.md).
**Execution:** claude-sonnet-5.5 developers, one active task in this repository; branch `rating-v3`;
the orchestrator reviews and commits, nothing pushed.
**Resume baseline:** `c9935cd` on `rating-v3`, after pause commit `a7f6660`. Neither checkpoint accepts
MS05b1/recovery. Remaining-task anchors were checked at this HEAD; quoted symbols remain the locator
after a prerequisite moves lines. Historical dispatched files and their Execution logs stay unchanged.
**Post-MS05e disposition (CV6-05):** measured, set aside. The orchestrator restored the
fingerprinted source/artifacts to `f7be90f` (runtime `00647f9`) and proved identity without a run.
The first-allowed sign pass is the MS06a baseline; the rejected candidate remains evidence only.

The pack uses execution-order IDs: **MS03 is tooling (old report MS04); MS04 is orders (old MS03)**.
The accepted order is unchanged. Historical analyst documents/answers keep their old labels.
Section 2's GC-01 scheduling exception moves only inactive MS14a preparation ahead of MS13c;
IDs stay stable and the active-technique/milestone completion order remains unchanged.
Large parent rows are milestones, not dispatches or extra commits. Their suffixed files are
normally independently accepted 20-60-active-minute tasks. **S-OD2 recovery is the explicit
exception:** r1-r5 (including r5p/r5m), post-selection b3 and r6a have step evidence only.
r6b audits combined acceptance; r6c closes CI inside that same boundary before the combined commit.
Gate wall time is additional and estimated in each file.

Checkboxes mean implementation accepted and committed, never merely "task file exists".
An accepted prerequisite normally means its implementation and log are committed, not just visible
on disk. The recovery handoff is instead reviewed **step evidence complete** on the preserved
candidate, with no checkbox before r6b's combined acceptance and r6c's CI closure. The owner-ordered
pause commit saved non-green step evidence; it did not turn that evidence into accepted tasks.

## 1. Task index

| Done | ID | File | Title | Depends on | Size | Owner role | Milestone | Wave |
|---|---|---|---|---|---|---|---|---:|
| [x] | MS01 | [MS01](MS01-tier-and-reference-api.md) | Tier algebra and reference floor API | accepted specification | M, 45-60 min | Generator engine | M1 reference available | 1 |
| [x] | MS02 | [MS02](MS02-baseline-diagnostics.md) | Baseline diagnostics and matched manifest | MS01 | M, 45-60 min + GS | Tooling | M2 baseline captured | 2 |
| [x] | MS03 | MS03a-MS03d below | Bounded evidence tooling (parent milestone; no separate commit) | MS02 | split | Tooling | M3 tooling ready | 3-6 |
| [x] | MS03a | [MS03a](MS03a-replay-recorders.md) | Bounded wire/analysis golden recorders | MS02 | M, 45-60 min + checks | Generator tooling | M3a replay evidence | 3 |
| [x] | MS03b | [MS03b](MS03b-bounded-help-examples.md) | Curated, bounded help-example tooling | MS03a | M, 45-60 min + checks | Player tooling | M3b bounded examples | 4 |
| [x] | MS03c | [MS03c](MS03c-jigsaw-help-snapshots.md) | Region-aware Jigsaw snapshots | MS03b | S-M, 30-45 min | Player help | M3c Jigsaw ready | 5 |
| [x] | MS03d | [MS03d](MS03d-bounded-regression-hashes.md) | Selected hash records and complete merge | MS03c | M, 45-60 min + GG check | Generator tooling | M3d bounded hashes | 6 |
| [x] | MS04 | [MS04](MS04-orders-and-requiredness.md) | Orders, counter and derived certificate | MS03d | M, 45-60 min | Shared solver | M4 prefix invariant | 7 |
| [ ] | MS05 | MS05a, recovery, MS05e | Required exactness and CV6 disposition (parent) | MS04 | split | Generator | M5 | 8-11a |
| [x] | MS05a | [MS05a](MS05a-exactness-transport-and-messages.md) | Exactness transport/messages | MS04 | M, 40-55 min | Generator UI | M5a | 8 |
| [x] | MS05b1 | [MS05b1](MS05b1-required-exactness-engine.md) | Preserve implemented engine; closure at r6b, not a redispatch | MS05a | retained | Generator engine/UI | M5b1 in recovery | — |
| [x] | MS05b2 | [MS05b2](MS05b2-required-exactness-consumers.md) | Absorbed consumer scope; not a dispatch | MS05r2/r6b | absorbed | Generator tools/tests | M5b2 in recovery | — |
| [x] | MS05c | [MS05c](MS05c-shallow-budget-instrumentation.md) | Absorbed allowance/work scope; not a dispatch | MS05r3/r6a/r6b | absorbed | Generator/tools | M5c in recovery | — |
| [x] | MS05d | [MS05d](MS05d-select-shallow-budget.md) | Absorbed selection/GD/closure; not a dispatch | MS05r4/r6a/r6b | absorbed | Evidence | M5 recovery | — |
| [x] | MS05r1 | [MS05r1](MS05r1-profile-active-recovery.md) | One-attempt work profiles on the preserved active tree | MS05a + retained MS05b1 | M, 45-60 min | Diagnostic tooling | step evidence complete, not accepted | 9r1 |
| [x] | MS05r2 | [MS05r2](MS05r2-recovery-consumers.md) | Correct measurement/manual consumers and prefixes | MS05r1 step evidence | M, 35-50 min | Generator tools/tests | step evidence complete, not accepted | 9r2 |
| [x] | MS05r3 | [MS05r3](MS05r3-recovery-allowance-instrumentation.md) | Allowance/work/shard instrumentation at Infinity | MS05r2 step evidence | M, 45-60 min | Generator/tools | step evidence complete, not accepted | 9r3 |
| [x] | MS05r4 | [MS05r4](MS05r4-select-recovery-allowance.md) | Fixed selection, quick-pin triage and original-limit preflights | MS05r3 step evidence | M, 45-60 min + GS/guards | Evidence/default literal | 256 selected; historical stop answered by S-OD3/S-OD4 | 9r4 |
| [x] | MS05r5p | [MS05r5p](MS05r5p-size-dependent-default-attempts.md) | Size-dependent default attempts | retained r4 selection + S-OD3/S-OD4 | S-M, 40-60 min + diagnostics | Generator engine/store | step evidence only | 9r4p |
| [x] | MS05r5 | [MS05r5](MS05r5-bounded-quick-coverage.md) | Inventory/results and bounded full-quick plan | MS05r5p + S-OD3/S-OD4 contracts | M, 40-60 min | Both test runners/harness | step evidence only | 9r5 |
| [x] | MS05r5m | [MS05r5m](MS05r5m-mega-nightmare-validation.md) | Mega Nightmare quick/deep contract | MS05r5 step evidence; r5p final engine | M, 1.5-2 h + deep records | Generator test tooling | step evidence only | 9r5m |
| [x] | MS05b3 | [MS05b3](MS05b3-bounded-manual-corpora.md) | Post-selection lazy corpora and early I5/CV3 | MS05r5m step evidence | M, 45-60 min + GD | Generator tests | step evidence only | 9r5b |
| [x] | MS05r6 | [MS05r6](MS05r6-combined-recovery-acceptance.md) | Closing recovery milestone; not a dispatch | MS05r6a/MS05r6b/MS05r6c | split | Evidence/CI | one combined boundary | — |
| [x] | MS05r6a | [MS05r6a](MS05r6a-final-evidence-and-pins.md) | Persist G13, final-source recheck, complete E and pins | MS05b3 + all earlier recovery evidence; S-OD3/S-OD4 | M code; 2-3 h operation + gates | Recorders/evidence/pins | step evidence only | 9r6a |
| [x] | MS05r6b | [MS05r6b](MS05r6b-quick-gd-and-combined-acceptance.md) | Full quick/GD, deep reconciliation, standing cost and audit | MS05r6a step evidence | 1.5-2.5 h operation + gates | Evidence/acceptance docs | combined audit; r6c still required | 9r6b |
| [x] | MS05r6c | [MS05r6c](MS05r6c-ci-test-tiers.md) | CI workflows for the v3 test tiers | MS05r6b evidence and final quick manifest | S-M, 30-50 min + checks | CI | inside combined commit | 9r6c |
| [x] | MS05e | [MS05e](MS05e-guided-sign-dig.md) | Closed: guided sign dig measured, set aside (CV6-05) | r6b/r6c combined commit | M, 50-60 min + gates | Greater-Than | M5e | 11a |
| [x] | MS06 | MS06a-MS06d | One target through all stages (parent) | MS05e closed, set aside, identity proved | split | Generator | M6 | 12-15 |
| [x] | MS06a | [MS06a](MS06a-pre-target-evidence.md) | Isolated pre-target evidence | MS05e closed, set aside, identity proved | S, 20-30 min | Evidence | M6a | 12 |
| [x] | MS06b | [MS06b](MS06b-target-policy-primitives.md) | Inactive target policy primitives | MS06a | M, 35-50 min | Generator engine | M6b | 13 |
| [ ] | MS06c | MS06c1-MS06c2 below | Target transport and atomic activation (parent) | MS06b | split | Generator | M6c | 14a-14b |
| [x] | MS06c1 | [MS06c1](MS06c1-target-transport.md) | Nullable target transport; no policy activation | MS06b | M, 45-60 min + GG check/GR | Generator plumbing | M6c1 | 14a |
| [x] | MS06c2 | [MS06c2](MS06c2-activate-target-policy.md) | Atomic all-stage target activation | MS06c1 | M, 50-60 min + GG/GR | Generator engine | M6c2 | 14b |
| [x] | MS06d | [MS06d](MS06d-target-comparison.md) | Isolated target comparison | MS06c2 | S, 20-30 min | Evidence | M6 | 15 |
| [ ] | MS07 | MS07a-MS07f | Windows/selection/checkpoint and approved tier move (parent) | MS06d | split | Solver/tools | M7 | 16-21a |
| [x] | MS07a | [MS07a](MS07a-window-kernels-and-pattern-metrics.md) | Window kernels and pattern metrics | MS06d | M, 50-60 min | Shared solver/tools | M7a | 16 |
| [x] | MS07b | [MS07b](MS07b-register-chain-windows.md) | Chain/depth integration and Hell 1 pilot | MS07a | M, 50-60 min + E/GH/pilot | Shared solver | M7b | 17 |
| [x] | MS07c | [MS07c](MS07c-select-chain-cutoff.md) | Cutoff tooling, cost and measured selection | MS07b | M, 40-55 min + GS/GP-cost | Tools/evidence | M7c | 18 |
| [x] | MS07d | [MS07d](MS07d-qualification-record-merger.md) | Checked qualification merger | MS07c | M, 40-55 min | Tooling | M7d | 19 |
| [x] | MS07e | [MS07e](MS07e-first-qualification.md) | Complete first checkpoint | MS07d | S, 25-40 min | Evidence | M7 | 20 |
| [ ] | MS08 | MS08a-MS08c | Single-digit patterns (parent) | MS07e | split | Shared solver | M8 | 21-23 |
| [x] | MS08a | [MS08a](MS08a-skyscraper.md) | Skyscraper | MS07e | M, 40-55 min | Shared fish | M8a | 21 |
| [x] | MS07f | [MS07f](MS07f-quick-tier-move.md) | Approved slow quick cases to manual, assertions preserved | MS08a + S-OD8 | S-M, 30-45 min + bounded checks | Generator tooling | M7f | 21a |
| [x] | MS08b | [MS08b](MS08b-two-string-kite.md) | Two-string kite | MS07f (after MS08a) | M, 40-55 min | Shared fish | M8b | 22 |
| [x] | MS08c | [MS08c](MS08c-empty-rectangle.md) | Empty rectangle | MS08b | M, 50-60 min | Shared fish | M8 | 23 |
| [ ] | MS09 | MS09a-MS09b | Finned fish (parent) | MS08c | split | Shared fish | M9 | 24-25 |
| [x] | MS09a | [MS09a](MS09a-finned-x-wing.md) | Finned X-Wing/sashimi | MS08c | M, 50-60 min | Shared fish | M9a | 24 |
| [x] | MS09b | [MS09b](MS09b-finned-swordfish.md) | Finned Swordfish | MS09a | M, 40-55 min | Shared fish | M9 | 25 |
| [ ] | MS10 | MS10a-MS10b | Pairs/WXYZ (parent) | MS09b | split | Shared wings | M10 | 26-27 |
| [x] | MS10a | [MS10a](MS10a-remote-pairs.md) | Remote pairs | MS09b | M, 40-55 min | Shared wings | M10a | 26 |
| [x] | MS10b | [MS10b](MS10b-wxyz-wing.md) | WXYZ-Wing | MS10a | M, 45-60 min | Shared wings | M10 | 27 |
| [x] | MS11 | MS11a-MS11c | Uniqueness patterns (parent) | MS10b | split | Shared wings | M11 | 28-30 |
| [x] | MS11a | [MS11a](MS11a-rectangle-types-three-four.md) | UR types 3/4 | MS10b | M, 50-60 min | Shared wings | M11a | 28 |
| [x] | MS11b | [MS11b](MS11b-hidden-rectangle.md) | Hidden UR | MS11a | M, 35-50 min | Shared wings | M11b | 29 |
| [x] | MS11c | [MS11c](MS11c-bug-plus-one.md) | BUG+1 | MS11b | M, 45-60 min | Shared wings | M11 | 30 |
| [x] | MS12 | [MS12](MS12-xy-chain.md) | Restricted XY-chain | MS11c | M, 50-60 min | Shared chains | M12 | 31 |
| [x] | MS13 | MS13a-MS13c | Grouped chains (parent) | MS12 | split | Solver/UI | M13 | 32-33,35 |
| [x] | MS13a | [MS13a](MS13a-group-graph-and-proof-checker.md) | Inactive graph/proof checker | MS12 | M, 50-60 min | Shared chains | M13a | 32 |
| [x] | MS13b | [MS13b](MS13b-group-proof-consumers.md) | Group-proof consumers | MS13a | M, 35-50 min | Both app UI | M13b | 33 |
| [x] | MS13c | [MS13c](MS13c-activate-grouped-chains.md) | Grouped-chain activation | MS13b + MS14a; S-OD11 recorded | M, 50-60 min | Shared chains | M13 | 35 |
| [x] | MS14 | MS14a-MS14c | Leftovers/cage regressions (parent) | MS13c for activation/closure; MS14a prep may precede | split | Shared solver | M14 | 34,36-37 |
| [x] | MS14a | [MS14a](MS14a-leftover-support-kernel.md) | Inactive multiset support | MS13b | M, 50-60 min + inactive E | Shared subsets | M14a | 34 |
| [x] | MS14b | [MS14b](MS14b-register-law-of-leftovers.md) | Law of leftovers integration | MS14a + MS13c | M, 40-55 min | Shared subsets | M14b | 36 |
| [x] | MS14c | [MS14c](MS14c-killer-interaction-regressions.md) | Existing Killer regressions | MS14b | S, 25-40 min | Core tests | M14 | 37 |
| [x] | MS15 | MS15a-MS15b | ALS-XZ (parent) | MS14c | split | Shared ALS | M15 | 38-39 |
| [x] | MS15a | [MS15a](MS15a-als-enumerator.md) | Inactive bounded ALS enumerator | MS14c | M, 45-60 min + inactive E | Shared ALS | M15a | 38 |
| [x] | MS15b | [MS15b](MS15b-als-xz.md) | ALS-XZ integration | MS15a | M, 50-60 min | Shared ALS | M15 | 39 |
| [x] | MS16 | [MS16](MS16-sue-de-coq.md) | Sue de Coq | MS15b | M, 50-60 min | Shared ALS | M16 | 40 |
| [x] | MS17 | MS17a-MS17b | Persistence/version (parent) | MS16 | split | Integration | M17 | 41-42 |
| [x] | MS17a | [MS17a](MS17a-history-version-marker.md) | History marker, store 1 | MS16 | S-M, 30-45 min | Generator UI | M17a | 41 |
| [x] | MS17b | [MS17b](MS17b-version-cache-and-freeze.md) | Rating/cache 3 and limit freeze | MS17a | M, 50-60 min | Integration | M17 | 42 |
| [ ] | MS18 | MS18a-MS18e | Final evidence (parent) | MS17b | split | Evidence/release | M18 | 43-47 |
| [x] | MS18a | [MS18a](MS18a-final-matched-soak.md) | Matched final soak | MS17b | S, 25-35 min | Evidence | M18a | 43 |
| [x] | MS18b | [MS18b](MS18b-recheck-cap-and-window.md) | Cap/window final rechecks | MS18a | S, 25-40 min | Evidence | M18b | 44 |
| [ ] | MS18c | [MS18c](MS18c-qualify-and-publish-offers.md) | Qualify and publish offers | MS18b; S-OD13/S-OD14; Stage 2 bindings published; staged release, supervisor and canary reviews | M, 35-50 min | Qualification | M18c | 45 |
| [ ] | MS18d | [MS18d](MS18d-performance-and-final-hashes.md) | Final GP preflight/performance/hashes | MS18c | M, 40-55 min + GP/GG | Evidence | M18d | 46 |
| [ ] | MS18e | [MS18e](MS18e-release-evidence-closure.md) | Final correctness/items/workflows and PR CI | MS18d | M, 40-60 min + GD/deep/CI | Release evidence/CI | M18 | 47 |

S/M/L mean approximately 100-300 / 300-800 / 800-1,600 changed lines including tests, excluding bulky
generated evidence. Time allowances are active development, not unmeasured heavy-gate wall time.
Do not disguise an oversized implementation as a 20-60-minute coding task. The reviewed
evidence-heavy r6a/r6b operations use their explicit multi-hour hands-on estimates, not that
coding allowance; their machine time and command ceilings remain separate.

## 2. Ready waves and exclusive ownership

All executable waves are sequential; keep the orchestrator's current accepted boundary.
S-OD2's recovery is amended by S-OD3/S-OD4. The retained r1-r4 evidence is not redispatched.
Resume **MS05r5p -> MS05r5 -> MS05r5m -> MS05b3 -> MS05r6a -> MS05r6b -> MS05r6c**,
then the combined acceptance/commit. Wave 11a (MS05e) follows that commit and precedes 12.
MS05r6 is a routing milestone only; historical “r6 acceptance” means r6b's audit with r6c's CI closure.
Suffixed wave labels never permit parallel execution. Historical/frozen references to MS05b
mean its retained engine and absorbed consumer scopes, not a second dispatch.
All four tooling subpacks precede MS04. MS05a transports the existing flag; MS05b1 activates
requiredness and messages in the preserved implementation. r1-r4 profiled, corrected consumers,
instrumented and selected 256. r4's failed original mega preflights remain historical evidence,
not fictional passes. r5p installs 8/4/2 default attempts; r5 supplies inventory/results; r5m
implements the approved quick/deep mega contract. b3 makes the five I5 corpora plus CV3 lazy,
checks both mega Nightmare CV3 cells live under binding Addendum B1, and cites the matching
deep occurrence ids without supplying their puzzles to the runner.
r6a persists G13 first, then rechecks the approved contracts and records complete 520/5/14 E/pins.
r6a/r6b explicitly inspect both deep `identity.currentMatches` fields; an exact-diff proof for
non-generation-file changes permits retention, otherwise their named MEGA-REFRESH step replaces
invalidated coverage. Exit 0 alone is not compatibility.
r6b reconciles deep/live-CV3/manual/quick evidence and reports per-app standing cost. r6c closes CI before
the one combined commit. **MS05e is closed "measured, set aside", not an accepted repair
(CV6-05 / S-OD6).** Fable chose Q1(b), withdraw the pool, and Q2(a), keep the contracts.
The orchestrator saved `docs/difficulty-v3/evidence/MS05e/candidate-pool-4.patch`, restored
the 12 existing files from `f7be90f`, deleted the added guided suite and proved identity over
the fingerprinted source/artifact surface, with no untracked fingerprinted input and no run.
After the developer's report/evidence/notes corrections and SA1's cross-check of these pack
edits, MS06a captures all 17 cells/204 requests on the restored first-allowed sign pass.
Its prerequisite is **MS05e closed, set aside, identity proved**, not an accepted pool or a
passing Normal CV6. S-AV01 remains open under the fixed Q2(a) endings below.
MS06b's pure policy helpers are inactive; its sole production-path edit forwards an explicitly
present strategy target and is tested for number/null/absence. MS06c1 adds nullable transport
and typed objectives with unchanged numeric ranking, but draws no target and activates no
policy. MS06c2 draws the one target and activates all candidate-comparing stages atomically.
Under CV6-05 the real `signs` strategy receives `options.target` and ignores it; its keeper view
preserves the originating target for local acceptance and `attemptBest` continuation.
MS06 makes no edit to `greater-than.js` and adds no pool, constant or comparator there.
Refinement is still not entered for models with inequalities. Waves 14a/14b
replace 14; historical references to MS06c mean both parts, not a dispatchable old file.
MS07a kernels precede registration MS07b, selection MS07c, merger MS07d and first GQ MS07e.
**Post-MS07e owner decisions, 2026-11-15 14:42:** S-OD7 leaves Killer Hard/Expert hidden until
later calibration, with no Killer weight recalibration in v3; MS18c owns publication and MS18e
the audit. S-OD8 approves only section 9's four-case tier proposal. The next serial order is
**MS08a (already running) -> MS07f (wave 21a) -> MS08b**. MS07f uses the accepted post-MS08a
tree and owns its CI-manifest handoff; do not interrupt MS08a or run the two writers together.
All six S3 groups still run; neither decision drops a qualification cell or changes an assertion.
The grouped graph prepared in MS13a is now active in accepted MS13c, with MS13b's consumers.
**GC-01 is resolved by
S-OD11:** owner, Discord, 2026-11-17 04:30 (+07:00), **"GC-01: chọn A."** MS13c implements a
bounded grouped attempt first and a short-only, uncapped singleton fallback on a local cap,
under the same parent budget/window; IR54 is preserved and the long ID remains bounded.
The original question/answer are in the resolved archive; MS13c holds the binding contract
and S-AV36's numerical handoff. The policy hold is lifted, and MS14a's serial prerequisite is now satisfied by `ea14798`.
MS14a/MS15a kernels likewise precede their registrations. Final GQ is MS18c,
after all S3, MS17b and final rechecks MS18b.
No intermediate pruning. Parent milestones are not additional waves or commits.

**Current serial handoff, 2026-11-18.** MS18b is accepted and committed at **`14d8c903`**
after orchestrator template review, independent derivation of both rules, 24 reproduced
decisive rows and the passing CI check. **360/360** outcomes, 44 commands, all DIAGNOSTICS
PASS, 145 reporter checks; R5 **256** reconfirmed (Jigsaw Expert median **1215 -> 1104**),
C **4** reconfirmed (**36/36 vs 20/36**). **No R5/C owner action or change task is open.**
MS18a (`484b8a52`) remains accepted. Runtime/soak remain MS17b's **`57c1b10`** candidate;
these commits also contain evidence, helpers and notes, not only pack files.
M17 remains complete. MS17a (`5b94904`), MS16
(`d41a6dd`), MS15b (`8b26e83`), MS15a (`b958a58`, SA1 accepted), MS14c (`6a9fbf6`),
MS14b (`0e3a0c4`), MS13c (`9d58d86`) and resolved JF-02/S-OD12 (A + S0) remain prior
boundaries. Next: **MS18c -> MS18d -> MS18e**, one developer at a time. **MS18c
Stage 1 finished and stopped at `42e0d239`; both analysts approve all 135 Stage 2
bindings.** `MS18c-gq-approved-ceilings.json` contains the separate immutable
authority; the Stage 1 pending rows/reports stay unchanged. Await **SA1 final
confirmation of the convergence and the orchestrator's Stage 3 preparation
release**. Before real GQ: capability/focused gates, SA1 supervisor review, then a
separate canary/window GO; after `classic4/veryEasy`, stop for SA1's file-only
acceptance before the other 134. **S-OD14 satisfies Q3's owner-answer gate**, not
any actual recovery approval. The developer chooses no ceiling, epoch reset or
recovery authorization. SA1 remains the final cross-reviewer.
**MS18a and MS18b receive orchestrator template/contract review; SA1 cross-review is
at MS18c**, including its now-agreed supervisor and canary checkpoints. A specific unresolved question still
goes through the orchestrator and the QUESTION pause.

MS17b's final records are `docs/difficulty-v3/evidence/MS17b/evidence.md`, especially
sections 12, 18 and 20. The accepted Generator run is **`quick-final-2/`**; the accepted
Player run remains **`quick-final/player-quick.json`**. The superseded Generator first
pair is history, not the current fingerprint. Baseline: **4,784 Generator tests (542.0 s) /
2,981 Player tests (117.2 s)**, **55/32** suites, catalogue **40 / 34 unscoped**.
Fingerprints are Generator **`274067a0...`**, Player **`5e55cec6...`** (full values in
MS18a). Projections remain **core-shared 170, steps 70, replay 70, mega 50, own-fast 330,
digger-target 30, pipeline 80, Generator player shard 90, Player job 180**. Preserve the
four bounded Generator groups, suite membership, assertions, tiers, factors and workflow
limits. Final CI metadata was saved before its passing check.

MS17b freshly recorded all **5 wires / 14 analyses / 520 hashes**. Replay identity is
**`ff55cbce...`**, hash identity **`b1c78ecb...`**. Only the five wires'
`rating.ratingVersion` changed **2 -> 3**; analyses and hashes were unchanged, and all
**40** GH examples match. Rating/cache are now **3**, history/worker wire stay **1**,
grouped `proofVersion` stays **2**. MS17a's explanation belongs only to an earlier
history entry's open button. Old positive imports, recipes and v2 certificates remain
their own evidence; keep the pre-ALS specimens unchanged. Evidence-only MS18a/b verify
unchanged source/fingerprints, not needless fresh E/GH/quick runs or CI metadata edits.

`limits-v3.md` freezes **only section 1's new-pattern limits with the version**, not
every production constant. Its dispatch inventory retains the independent fish/wing
counters, UR's separate 50,000 passes (no three-real-cell cap), nishioDeep/XY, grouped
**4,096/50,000** and S-OD11's short-only uncapped singleton fallback, leftovers
**2/4/50,000**, shared ALS **4/4,096/50,000**, and Sue de Coq's own **50,000**.
Section 3 records C **4** (short 1..4 / long 5..12), R5 **256**, attempts **8/4/2**, dig
bounds and the restored first-allowed sign pass separately. MS18b rechecks only R5/C;
a changed winner requires the owner's keep/change decision before GQ. No silent tuning,
new attempt-count experiment or unused introducing-task adjustment follows.

**GD handoff:** of the current manual `difficulty` inventory's **154 tests**, **145 were
executed: 144 passed, one failed**, Normal's **83/100** aggregate (**S-AV14**).
Hell 1's **8 tests / 20-request batch** and the confusion matrix's **1 test** were not
started: stated bounds **919 s / 1,544 s**, not current-source measurements or passes.
Keep them named with S-AV25/S-AV15 for MS18c/d handoff and MS18e's GD/audit. Nightmare
passed 8/8 in 96.2 s; do not inherit an older source's bound without a current plan.
The ruled Samurai and one-call cap-witness repairs passed on their new paths; both
original failures remain. MS17b's task-local standing pin rule does not roll forward.
**MS17b-GD21-PROCESS** retains the 36.5 s unlocked diagnosis, unknown overlap/unsaved raw
output, locked bisect IR12 defects and mislabelled footers for MS18e, not protected timing.

Carry **S-AV36-S-AV39, MS15b-Q6, MS15b-GP-J, MS15b-GP-U and MS16-Q6**, their distinct
populations and all earlier items under their recorded dispositions. MS15b's **37-cell**
GP remains one full record, one pilot-only cell and **35 unmeasured**, not S-AV38's
**50-cell** population. MS16/MS17a/MS17b added no generation-GP campaign. Accepted
MS18a has **17/17 cells, 204/204 outcomes**, 32 completed payload commands and 159
reporter checks. Exact **91 -> 163/204** (without old vacuous Hell 1, **79 -> 163/192**),
in band **202 -> 204**, shallow **111/202 -> 41/204**. The thirteen same-request losses
are twelve old-vacuous Hell 1 hits plus `greaterThan:expert:0`; 85 requests gained
exactness. Generation **128.81 -> 828.43 s** is descriptive, not GQ/GP.
Its old qualified cohort is not the old score-only 202/204. Keep the separate MS06
target comparison and historical timing caveats. Use the final Q3 reporter/freeze;
its successful-attempt transcript and multi-commit display fixes changed no ledger.

**MS18b completed scope and decision boundary:** 288 fresh R5 outcomes at 64/128/256/none
with C4 fixed, plus 72 fresh C4/C6 outcomes with R5 256 fixed. No combined provisional
pair, 8/4/2 experiment or re-use/retagging of MS18a as comparison rows. Complete both
independent bounded experiments and the read-only packet under current defaults.
R5 selects the smallest finite no-per-cell-hit-loss setting with a strict upper-median
full-rating reduction somewhere, else none on complete evidence; C selects more exact
hits, **6 on a tie**. A different winner stops before default edits and GQ/MS18c for
the owner's keep-current or separately implemented/refreshed change decision. Missing
data means undetermined, not the measured winner none or a reconfirmation.
Both rules reconfirmed their current values, so that stop branch was not taken.
The leaf/evidence retain the tables and decision mechanism as history.

MS18a's zero-exact cells are **classic9 Hell 1, Killer Hard and Killer Expert (0/12,
12/12 shallow, eight attempts each)**. Killer Hard/Expert remain in every fixed R5
setting, with no invented minimum-hit condition; Hell 1 is not added to either
experiment. Their availability/offer consequences remain MS18c, including S-OD7's
separate Killer withholding. No new tuning, calibration, pruning or owner question
follows merely from the zero counts.

**Machine availability, owner at 16:42 (+07:00), relayed at 16:44:**
"Các task pentomino đã dừng hoàn toàn, hãy tùy ý sử dụng resource của máy."
Pentomino tasks have fully stopped; no further owner pause question is needed.
Before each MS18a-MS18d timed cell/shard, use section 7's quiet-machine precondition.
MS17b's 470.8/385.6/550.7 s lock waits remain wait metadata, not request timings.
The shared slot, locks, >=15 s gaps and <=450 s admission/540 s ceiling remain.

**MS18a-Q1, 2026-11-18, before any timed cell:** the absolute-CPU self-test failed
(mean 1.049779 / max 1.425585 busy cores of 16; exit 3, payload unstarted). The
orchestrator confirms this session's persistent Copilot host PID 1968 is active and
other known jobs are idle; the available counters do not prove host-only attribution.
SA2 authorizes **option (c) for MS18a only**, under the leaf's exact named-host admission
rules: retain the raw failed screen, no CPU subtraction or whole-tree exemption, label
all GS timings shared-slot/CLI-host-active and descriptive, refreeze owned helpers and
run one new locked no-generation self-test before GS. Carry **MS18a-Q1-HOST** to
MS18b's dispatch preparation and MS18e audit. The exception does not roll forward
to MS18b/c/d or waive any final timing/offer gate. The original records stay unchanged.

**MS18a-Q2, same day:** after 14/32 commands (105/204 request rows), an additional
OS-service CPU consumer held `killer-expert-9-3` before its payload. The leaf now permits
**one fresh-slot re-ask per eligible logical GS entry**, >=60 s after releasing the
first slot, two admission attempts total across restarts. Q1's host/consumer rules and
thresholds stay; no OS-service exemption. Preserve distinct attempt records. A second
eligible hold becomes a named unexecuted gap and independent entries continue without
another QUESTION for that recurrence. Unknown/evidence/identity/payload failures still
stop. **MS18a-Q2-ADMISSION** carries every attempt/gap to the final report, MS18b
readiness preparation and MS18e; missing outcomes never become a complete-matrix pass.

**MS18b readiness renewal, before dispatch on `484b8a52`:** the leaf explicitly
authorizes **`MS18b-host-active`**, preserving Q1's verified PID-1968 instance,
separate raw strict screen/admission, >=0.5 CPU-s/s additional-consumer hold and
descriptive timing label. It renews Q2's one fresh-slot re-ask per fixed logical entry
after >=60 s outside locks; a second eligible hold is a gap and safe entries continue.
MS18a had 24/32 executed strict screens fail and two holds resolved at attempt 2;
no payload rerun or remaining gap. Both named items remain audit history; this renewal
settles their MS18b readiness handoff, not their attribution limits or later GQ/GP.
**Attempt identity must include experiment/setting/seed as well as the absolute span**:
MS18a's helper key omits the overrides and cannot be copied unchanged. Same-span
different-setting entries are distinct; aliases cannot reset the same entry's quota.
Use the accepted Q2 driver and Q3 reporting fixes, not superseded helper copies.
No automatic readiness waiver is granted to MS18c/MS18d.

**MS18b's new handoff items:** **MS18b-HOST-ACTIVE** records 40/44 strict-screen
failures, four passes and **zero holds/re-asks/gaps**; attribution is incomplete and
there is no GQ/GP waiver. **MS18b-R5-C result** records reconfirmation, not another
owner question. Killer Hard/Expert stayed **0/12 at all four caps** (the same twelve
keys, not 48 independent seeds); S-OD7 and final GQ remain. R5 six-cell generation
totals **371.4/388.6/410.9/423.1 s** and C6 **526.1 vs C4 139.3 s (3.8x)** are
descriptive GS cost observations, not GQ/GP verdicts or command bounds. Keep all
MS18a and older items in MS18c's complete handoff.

**S-OD13 — owner, Discord author `amicably8850`, 2026-11-18 21:31:46 (+07:00):**

> Q1: A. Q2: chọn phương án B nhưng giao SA-Opus và SA-Astra chọn mức trần, không cần thông qua Fable.

- **Q1-A approved:** explicit **`MS18c-GQ-host-active`** admission. Actual raw p95,
  2/10/30 s budgets, jobs 4, 40/100 seeds and 120000 ms generation guard remain
  binding. No subtraction/relaxation; additional-consumer hold and one >=60 s
  re-ask only for a verified unstarted eligible hold remain.
- **Q2-B approved, numbers delegated:** a GQ-only longer bounded command route,
  with numeric authority **jointly SA1/Opus + SA2/Astra, not Fable or the developer**.
  The qualifier/scheduler/protocol do not change. No numeric ceiling was selected
  by the owner; the old six projections and 560 s example are not approved limits.

**Joint SA1/SA2 agreement, relayed 2026-11-18 22:42 (+07:00):** replace P1's
empirical B4/B1 proposal with **H=60, D=10, V=10, epsilon=1 s; G=141,
F=b+11; P=H+6*G+65*F**. R30 rounding and T=R30(1.25*A) give:

| Board budget b | Admission A | Process-tree T | Outer T+2700 |
|---:|---:|---:|---:|
| 2 s | 1770 s | 2220 s | 4920 s |
| 10 s | 2280 s | 2850 s | 5550 s |
| 30 s | 3600 s | 4500 s | 7200 s |

This is a universal structural worst-case argument under monitored allowances,
**not advance credit for a predicted early stop**. Actual early-stop proof still
applies. 9600/12000 remain outer caps, never default cell settings; other gates
remain **450/540**. No cell lacks a class because a pilot is missing.
Stage 1 recorded all 135 keys/classes/identities and audited premises/deadlines,
then **stopped**. Both analysts approve all 135 P/A/T/O assignments in the exact
source-bound **`MS18c-gq-approved-ceilings.json`**. The leaf records the actual
approvals **MS18c-S2-SA1-20261118 / MS18c-S2-SA2-20261118**, the four preflight
hashes and the convergence accepting SA1's conditions. Epoch
**`MS18c-GQ-20261118-01`** is for explicit orchestrator assignment in the release;
no developer allocation/reset, approval or timeout choice.

The monitor checks **every request ms<=130000**, the structural slow counts
(<=5 with no stop, <=9 at first-round stop, <=6 total if round 2 ran), and
**Q-S<=11, R<=W-Q<=60, W<=A** using unrounded Q and monotonic W/R. R is the
T-start-to-qualifier-create interval, finite and 0<=R<=W. S simulates
index-order generation with four workers ready together, then the serial round.
Q-S includes post-started forks/Git/hash work, validation/IPC and rescheduling;
it is not a per-request V measurement. Negative Q-S is retained and passes;
**W-Q<R, including negative W-Q, is invalid timing** and stops subsequent GQ for
joint review of provenance and possibly affected request clocks. Preserve all
raw values, never clamp/subtract. This supersedes SA2's earlier upper-only ruling;
Stage 3 corrects/freezes the monitor/tests while retaining the historical Stage 1
bytes and 21/21 log. Require each cell's count/budget/attempts to equal its row,
plus canonical `checkCell` and header/protocol validation.

Freeze the exact `SOURCE_FILES` declaration and all engine/tool/policy/Node/machine
inputs before **every admission**, not just the first payload. HEAD remains at
`42e0d239` or pack-only descendants throughout GQ; authorized unhashed compatibility
and helper working-tree edits await the normal task acceptance commit. Changes
to frozen inputs or code commits need re-derived rows and joint reapproval.
Pin the full host tuple in the manifest: exact .NET StartTime, CIM UTC creation
to microseconds, PID/parent/executable/CIM name; .NET ProcessName is ignored.
Readiness queries are <=15 s each and the cumulative pre-qualifier T-clock limit
is 45 s, with H still checked at 60. Timeouts are unstarted holds, not eligible
CPU re-asks by themselves. Compile/hash before admission sampling.

**MS18c-Q3 resolved by S-OD14 — owner, Discord `amicably8850`,
2026-11-18 23:05:53 (+07:00), verbatim:**

> Q3: chọn B

The owner-answer precondition is satisfied. **Stage 1 has stopped; the published
Stage 2 binding still requires the staged releases/reviews above.** The original
S-OD14 answer did not expand Stage 1 or require changes to its files. S-OD14 permits only one prior-joint-authorized
recovery per GQ cell after T-kill, worker/supervisor fault or session loss, with no
complete record, unchanged qualified source/seed/protocol and every trace preserved.
A live supervisor is adopted; a complete record (including valid early stop, hidden
or a correctness/review outcome) is never rerun. Missing JSON alone proves no such
eligibility, and a faster result is never selected.

The leaf defines stable epoch/cell accounting: **payload slot 1 primary; slot 2
the single recovery**, each with its separately recorded **admission 1/2** budget.
The joint recovery authorization must expressly grant slot 2's bounded admission
budget; old counters are never reset by restarts, aliases, helper or limit revisions.
Ordinary exhausted CPU holds do not justify recovery. At most two payload opportunities
and four admissions if both slots are legitimately authorized; no slot 3.

Preserve attempt-specific outputs under
`evidence/MS18c/runs/<cell>/payload-<p>/admission-<a>/`, including partials.
A complete checked record is copied byte-for-byte once into the canonical qualification
folder with a receipt, never mixed with another attempt. The diagnosis proposal
under `evidence/MS18c/recovery/<cell>/diagnosis-rN.*` must pin all traces/identities,
fault/eligibility and no-live/no-complete checks. **Both SA1 and SA2 approve it before
relaunch**, recorded by the pack author/orchestrator in committed
`tasks/difficulty-v3/MS18c-gq-recovery/<cell>.json`. A developer cannot issue that
authorization; the supervisor checks its HEAD blob and one-use journal.
S-OD14 does not raise a deadline; any changed A/T/O separately needs S-OD13 joint
reapproval. A failed second payload or exhausted recovery admissions is a
**permanent gap for the epoch**, blocking complete publication, not a hidden verdict.

**Detachment approval:** the orchestrator's 22:42 relay approves a bounded detached
per-cell supervisor for Stage 3. Use the powershell tool with **mode=async,
detach=true**, then verify/adopt the same PID **plus creation time** from its durable
status. It owns Q1, gaps, T/O and a non-inheritable kill-on-close Job Object:
suspended child -> assign -> resume, no breakaway/uncontained workers. All output
is in project files. Only the orchestrator clears a proved dead own-run lock after
checking no owned process remains. No foreign/live/uncertain lock deletion.

Stage 3 also requires the declared GQ window. No agent CPU commands during a
payload, including sub-ten-second Node/test/hash/format/aggregation work. Small
file/status reads and small-file view/grep are allowed; the existing negligible
Discord HTTP poller and lightweight 30-minute HTTP report are explicit operational
exceptions, not permission for report computation. No during-payload CPU sampler.
Verify that the approval manifest exists in HEAD and its working-tree `git hash-object`
equals the committed blob, with both approval references; diff-only misses untracked
files. Recompute all frozen identities before each admission. Refuse nondefault
early-stop, probes, multi-cell lists and timeout overrides. The inherited 1800 s
`spawnSync` timeout cannot govern these runs; the maximum current O is 7200 s.

The prepared questions and verbatim answer are archived with S-OD13. S-OD7 and (c1)
still settle the zero-exact offer rules. **CV6-05's separate conditional Normal-budget
delegation to Fable is unchanged**; it is not the GQ ceiling authority. The old 1-12 h
range is not a verified full-matrix total, and reading a running command does not
reset its approved deadline. No partial publication or GP waiver follows.

Write/read back bounded plans before phases and format owned helpers before their
freeze; no post-freeze source adjustment disguised as housekeeping. **S-OD12/S0**
grants no standing scan, source-acquisition exception or new-ID discovery quota.
Full scope and final I5/CV3/deep/qualification/cost/audit obligations remain.
Preserve completed logs, IDs/waves and owner archives; never park a dirty task,
change Done marks in a pack amendment or start a second developer.

**Preservation:** no reset/discard of b1, provisional allowance, off-by-default switch, seed
substitution, browser-budget raise or further checkpoint branch commit. G13 persistence and
the measured mega tier replacement are now expressly allowed, not loopholes in S-OD2.
The orchestrator keeps private backups, starting at
`refs/dv3-wip/MS05b1-20261113-0650`, including new files at later handoffs. Developers do not
modify refs or restore the backup over the tree. READY means specification ready, not execution
accepted. The owner-ordered pause commit `a7f6660` was not green; preserve it as history.

| Resume decision | Binding rule |
|---|---|
| S-OD3 (a), (d) | Full-attempt mega Nightmare leaves quick coverage; every original request/relation remains in the mandatory tool-based deep inventory. Quick: one real one-attempt mega12 request and scripted mega16 stop control. G13 persistence is allowed at r6a; its request and 120000 ms recorder guard stay. |
| S-OD4 (c1), (c2) | Every offer requires final qualification; a bounded fallback is a miss. S-OD7 additionally withholds Killer Hard/Expert until later calibration; no other qualification exception is authorized. Default attempts are 8/4/2 by <=81/82-144/>144 cells; explicit settings win; R5 remains 256 until the final recheck. |
| S-OD4 stops/evidence | Correctness or a proposed recorded-decision change stops for the owner. Performance/availability is a named numerical item, first MS07e then MS18c/MS18d, and work continues within existing bounds. No new evidence class/tooling task for a slow intermediate cell. |
| S-OD4 reviews/scope | All six S3 groups remain. Analyst cross-review only on the named semantics tasks below; MS08a supplies the technique template. |
| S-OD6 (MS05e D1), answered CV6-05 | Owner delegated both choices to Fable on 2026-11-14 at 16:38. Fable chose Q1(b), withdraw the pool, and Q2(a), keep the contracts and let final qualification decide the offer. MS05e closes "measured, set aside"; the candidate patch and all measurements remain history, baseline identity is proved without a run. Greater-Than transports but does not consume the target in its first-allowed sign dig; MS06 edits no `greater-than.js`. S-AV01 follows the three fixed endings below; no present budget/offer change or future improvement feature is authorized. |
| S-OD7 (Q-MS07e-1) | Owner, 2026-11-15 14:42 through `ask_user` and email: Killer Hard (0/14) and Expert (1/14) stay **hidden until later calibration**; no Killer weight recalibration inside v3. Keep both in the complete final qualification and preserve its raw verdicts. MS18c records the owner-directed withholding separately from qualification if necessary; MS18e audits S-AV05/S-AV06. No interim live-list edit is assigned here. |
| S-OD8 (S-AV08) | Owner, same time/channel: approve MS07e report section 9's three generation-cost ratio tests to manual `perf` and its replay split (classic9 Hell 1 stays quick, the two mega16 requests go to manual `variants`). Requests/seeds/assertions/limits stay byte for byte; the CI consequence is accepted. MS07f follows MS08a, then MS08b; it updates r6c grouping metadata, both guides/design and measured before/after quick cost. No other tier move is approved. |
| S-OD9 (RP-01 / S-AV32) | Owner confirmed Fable's corrected Remote Pairs prior on 2026-11-16 at 06:23 (+07:00): 116/350/35 replaces 132/440/44; wing, Hard, unscoped, no uniqueness stay. MS10a applies its amended gate and normal-hint GH route before E. A complete zero-hit gate stops for the owner ((B) or removal), not Fable; no alternate prior trial. GH/IR72 H1/bundle B/discovery limits are unchanged. S-AV32 stays open for MS18e; all later tasks remain behind MS10a's acceptance. |
| S-OD10 (JF-01 / S-AV35) | Owner, Discord, 2026-11-16 22:20 (+07:00): "Chọn A." One-off MS12/Jellyfish corpus route: classic9 seed 4242, ascending indices 0-19,999 (<=20,000), original givens, level null and `testkit-4242-<index>` provenance; reuse/materialize the prefix once and account for construction. Player replay chunks <=64, <=400 hints/puzzle, eight-minute tool deadline, credible <=450 s admission, 540 s process ceiling and existing locks/15 s gaps. Stop acquisition after the first chunk supplies a verified source, publish/check it, then require all 37 GH checks and final quick/CI gates. At exhaustion or inability to stay within bounds, report completed/incomplete ranges and stop. No automatic expansion, additional Generator discovery or reset of B's ceiling; no other ID/task inherits it. GH acceptance, finders, priors, availability and tests stay unchanged. |
| S-OD11 (GC-01 / S-AV36) | Owner, Discord, 2026-11-17 04:30 (+07:00): "GC-01: chọn A." Bounded grouped attempt first for both forcing IDs, initially 4,096 additional nodes and 50,000 shared construction/search units. Only a local work/node cap permits short-only complete-singleton fallback with `workLimit:null`, the same caller-clamped short window and the same parent budget. No reset or fallback for parent exhaustion, cancellation/errors, completed negatives or window rejection. The fallback certifies a singleton-graph minimum, not a grouped minimum. `forcingChainLong` stays bounded with no fallback/second allowance; incomplete construction/minimum returns null. IR54 is preserved; option B is not approved. Record both phases and total cost, retain R10's once-only own-new-limit rule and all proof/E/GH/quick/CI/qualification gates. No numeric adjustment or availability guarantee follows. Finish accepted/committed MS14a, then MS13c -> MS14b -> MS14c; no change to MS14a. S-AV36 stays open for measurements/cost/audit, not for another GC-01 answer. |
| S-OD12 (JF-02 A + S0) | Owner, Discord, 2026-11-17 13:46 (+07:00): "tôi chọn A và S0". Retroactively approve retention of MS13c's verified Jellyfish source `testkit-4242-8657`, snapshot and all acquisition records, for MS13c only. Explicitly preserve that the scan lacked authorization when performed; S-OD10 did not authorize it. No further scan, unused quota, budget reset or gate waiver. **S0 keeps case-by-case permission; the proposed standing S1 rule is not approved.** Ordinary B/IR72 acquisition remains unchanged; every future exception/expansion needs separate prior owner authorization. The owner hold is resolved, but reviewed fixes and final GH/both quick sets/CI still precede MS13c acceptance/commit and later dispatch. S-OD11, cost items and final qualification/performance obligations are unchanged. |
| S-OD13 (MS18c-Q1/Q2) | Owner, Discord author `amicably8850`, **2026-11-18 21:31:46 (+07:00)**: **"Q1: A. Q2: chọn phương án B nhưng giao SA-Opus và SA-Astra chọn mức trần, không cần thông qua Fable."** Q1-A approves declared host-active GQ with raw p95/budgets/jobs/seeds/120000 ms guard unchanged and the existing unstarted-hold re-ask. Q2-B delegates GQ-only finite ceilings **jointly to SA1/Opus and SA2/Astra, not Fable/developer**. The 22:42 structural agreement is now bound by both analysts' 135-row Stage 2 manifest and its staged release/review conditions. Q3's later recovery exception is S-OD14 below. Other gates keep 450/540; no scheduler/protocol/offer/partial-publication/acquisition waiver. The owner's original statement selected no number itself. |
| S-OD14 (MS18c-Q3) | Owner, Discord author `amicably8850`, **2026-11-18 23:05:53 (+07:00)**, verbatim **"Q3: chọn B"**. At most one GQ recovery relaunch per cell after T-kill, worker/supervisor fault or session loss, only with no complete record and prior **joint SA1/SA2 diagnosis/approval**. Same qualified source/seed/protocol; all traces remain; no completed-record rerun, correctness erasure or faster-result selection. Adopt a live supervisor. Primary/recovery slots and their admission budgets are explicit and durable; a committed one-use case authorization is required before slot 2. Failure/exhaustion of recovery is a permanent gap; no third run or implicit reset. This satisfies the Q3 owner-answer gate, not Stage 2 binding or actual recovery approval. |

The following are serial ownership transfers, not permission for parallel edits:

| Area / exclusive files | Owners in order |
|---|---|
| `generator/js/engine/difficulty.js`, tier/reference suite | MS01, MS04, introducing tasks below, MS17b |
| `generator/tests/soak.js`, diagnostic fixture/suite | MS02, MS05r2/r3, MS05r5p default-contract header/tests, MS06c1, MS07c; evidence tasks read only |
| Replay recorders, projection/ledger helper and tool suite | MS03a; MS05r6a adds only G13 persistence before final E; later behavior owners use them |
| `player/tests/tools/make-technique-examples.js`, its tool suite | MS03b, MS03c; later new-ID tasks supply sources/use the tool |
| `player/js/ui/help.js`, help/text-board suites | MS03c, affected new-ID tasks |
| `generator/tests/perf.js`, `tests/fixtures/perf-helper.js`, ledger helper | MS03d; later owners use bounded modes |
| Order/counter fixes in cage/ineq/fish/subset engines | MS04 |
| Fish engine/suite | MS08a/b/c, MS09a/b |
| Subset engine/suite | MS14a/b after MS04; MS14c changes existing Killer tests only |
| Digger | retained MS05b1, MS05r3, MS05r4 (allowance literal), MS05r5p (attempt default), MS06b/c1/c2 |
| Pipeline/store attempt defaults and controls | MS05r5p: one size policy, default/explicit intent, once-only legacy migration and effective controls; recorded-attempt history/cache/export replay, with narrowly coupled app/history/cache/export handoff edits only if needed (RS01) |
| Greater-Than first-allowed sign dig and target transport | MS05e measured/set aside under CV6-05; no retained guided suite. MS06b tests inert caller forwarding; MS06c1 uses the keeper view; MS06c2 proves the real `signs` route in `digger-target`, with target use only in later local/attemptBest continuation. No MS06 edit to `greater-than.js`. |
| Events/pipeline/result view/app | MS05a transport, retained MS05b1 activation, MS05r3 work, MS06c1 nullable target transport; MS06c2 activates value production |
| `generator/js/engine/explain-data.js`, tune explanation, shallow-warning grammar | MS05b1 finishes MS05a's handoff; MS06c2 later target facts |
| Seven manual exactness/warning consumer contracts | MS05r2 absorbs MS05b2; GD owners run them, no threshold relaxation |
| S-OD8's three `pipeline` ratio cases and Generator `player` replay split; manual `perf`/`variants` destinations | MS07f after MS08a only; existing assertions/requests unchanged. MS18c owns later hidden-level diagnostic compatibility; MS18e checks the four manual cases on final source |
| Recovery profile driver/pure suite | MS05r1; r3 alone extends copied richer work, preserving immutable r1 evidence/protocol; r4 reads it without new policy |
| Work-schema and no-extra-allowance quick premises | MS05r3, including exact `work.localSearches` literals and sign-memo setup; all MS05b1 pipeline cases run before selection |
| Selected-default quick assertion triage and pins | MS05r4 records genuine default-coupled pins; premise fixes return to r3; MS05r6a explicitly owns listed pins; r6b validates without weakening contracts |
| Shared harness and both Node runners, inventory/result/exact-selection tooling | MS05r5; existing semantics/guards retained, r6a uses focused selections and r6b the complete manifest |
| Mega Nightmare quick/deep contract | MS05r5m after r5p/r5; 14 independent default-attempt requests, original relations, quick replacements and reuse interface; MS07b applies the same authorized rule to non-vacuous mega hell1 |
| Six manual corpus adapters; Killer I5; per-level/refusal CV3 registration and lazy helper/suite | MS05b3 after r5m; preserve aggregate sweep/eager corpus(); binding B1 checks mega CV3 live, one locked command per cell, with deep occurrence-id references and no reuse code; r6b reconciles; performance items go to MS07e/MS18c, not an owner stop |
| Chain engine/proof suites | MS07a/b/c (c default only), MS12, MS13a/c |
| Wing engine/uniqueness suites | MS10a/b, MS11a/b/c |
| New ALS engine/suite | MS15a/b, MS16 |
| Generator/Player i18n/proof display | introducing task; grouped consumers MS13b |
| Pattern-cost tool/suite | MS07a, scoped adapter MS14b |
| Qualifier/record helper/suite | MS05r2 predicate, MS05r5p default-contract header/tests, MS07d merger; MS07e/MS18c use it |
| Cache/history/version | MS05r5p recorded-attempt replay/intent handoff only (no version or history migration); MS17a history marker; MS17b rating/cache/reference freeze |
| Live qualification table, v2 archive, support lists | MS18c only |
| Qualification-authorized performance targets | MS18d under the existing rule; CV6-05's conditional final Normal contract is decided through MS18c and implemented in one assigned step before MS18d timing, never after GP |
| Regression/replay fixtures and `player/js/ui/help-examples.js` | behavior owner using its gate; recovery final GG/GR/pins exclusively MS05r6a, r6b checks current merges; no recovery GH or separate fixture writer |
| Standing quick cost, AGENTS quick comments and both developer-guide testing paragraphs | MS05r6b before final quick freeze; actual cost data afterwards in the separate report, acknowledged with combined acceptance. MS07f owns S-OD8's before/after per-app costs and guide/design tier descriptions; no unrelated AGENTS edit |
| `.github/scripts/generator-suites.sh`, both workflows and bounded CI manifest | MS05r6c first; each later suite-adding task owns its group/membership update; MS07f owns S-OD8's tier move. From MS10a, every remaining task that owns quick verification also owns bounded timing/projection metadata maintenance under "Maintaining CI quick projections" below, even without adding a suite; no other ownership expands. MS18e owns the final-tree audit and v3 PR CI |
| Living guides/designs and test HTML lists | the current task only, for the facts/files it changes |

The task's detailed file list controls, with the explicit timing-metadata exception below. Any other
unlisted file needs orchestrator assignment; report a defect outside the scope rather than quietly
taking another task's work.

### Per-task protocol and commits

1. Orchestrator confirms branch `rating-v3` and accepted prerequisite commits (or S-OD2's reviewed
   step evidence on the same preserved tree), then dispatches one named task.
2. Developer reads `AGENTS.md`, this checklist and the task. Implement only its scope; run its targeted
   checks and owned gates, recording actual commands, exit codes, counts and durations.
   **CV6-05 diagnosis-gate rule:** where a task has a diagnosis gate, the developer reports it
   as a table using the gate's exact predicate, every condition included, and waits for the
   orchestrator before the first production edit. This also applies when the table supports
   proceeding; S-OD4's performance-only rule does not waive the gate. No task scope changes.
   **QUESTION pause, from MS14b onward:** any `QUESTION:` stops the task for the orchestrator.
   Stop before the undecided action; do not apply a proposed default, continue independent
   edits/runs or start more gates/acquisition until the answer and resumption are explicit.
   Return state, evidence, options and the default as a proposal. Preserve/finish or safely
   interrupt an already-running owned bounded command through the normal helper; do not
   orphan a process or leave a stale lock. An unresolved permission/contract still needs
   this pause if labelled "informational" instead. This is not a new owner stop for every
   timing miss: settled performance findings use numbered items under S-OD4, while any
   needed owner authorization (including an acquisition exception under S-OD12/S0) must
   be obtained before acting. MS14c and later serial dispatches inherit this same rule.
   **Strengthening at MS15b:** the trigger is an unresolved decision, not its label.
   "D1-D8", "assumption", "default" or "for the reviewer to settle" is not a way to implement
   it first. Raise the question before the first dependent edit/run; check again before E
   freezes. An end-of-task decision list or later template/SA1 review is not prior approval.
   Routine choices within a settled contract remain developer work; no unresolved point
   may be hidden in that category or in a performance-item handoff.
3. **Developer never stages, commits, stashes, resets, pushes or switches branches; never edits the
   task pack, checklist or Execution log.** Do not change unrelated work in this shared checkout.
4. Orchestrator re-runs the task's quick checks, reviews the diff and acceptance IDs, fills the empty
   Execution log and summary, then commits once per accepted dispatch on `rating-v3`:
   `difficulty-v3 MSnn: <title>` (use `MS03a`, etc. for a suffix). **During recovery no branch
   commit occurs before r6b's audit and r6c's CI closure; use the combined commit below.** Nothing is pushed.
5. Heavy gates are not routinely run twice. Orchestrator reviews their complete artifacts, exit codes,
   source identity and coverage; repeat only for a changed candidate or a recorded evidence defect.
6. A rejected task gets a bounded fix round. An unexpected baseline failure is reported, not hidden by
   rewriting assertions. A later source change invalidating evidence requires replacement evidence.
7. Each split parent is marked done after all its suffixes are accepted; no additional parent commit.

### Maintaining CI quick projections — SA2 ruling, 2026-11-16

**Decision (a), starting with the active MS10a task.** Maintain planning estimates in the task
that changes the quick workload; neither a new quick-tier task now nor deferral of stale estimates
to MS18e is required. This supersedes IR72 I1's "projections only when it adds a suite" restriction
for timing/projection metadata only, and the MS10a dispatch instruction to stop with `QUESTION:`
solely because a measured shard exceeds its projection. It adds no test run or generation gate.

**Scope.** Every remaining task that already owns quick verification may edit
`.github/scripts/generator-quick.json`'s Generator-shard and Player `projectionSeconds`, together
with the already-owned counts, measured seconds and provenance. This permission applies even
when the task adds no suite and its file list names no manifest. It does not authorize changing
group/job/shard IDs, suite membership, commands, test tiers, `outOfCi`, assertions, test timeouts,
`SG_TIME_FACTOR`, the CI slowdown factor, job overhead or workflow timeouts. Separately assigned
suite additions keep their existing ownership; do not use that route merely to hide a slowdown.

**Rule, raises only.** Let `m` be the largest already-recorded process-wall duration in seconds
from successful complete-coverage runs of the same shard selection on the relevant source and
normal settings, excluding lock wait and inter-command gaps. For the Player use its whole
quick-process wall time. Do not substitute a Generator group total, runner body time or a
per-test percentile for a shard's process time.
Keep the timing conventions explicit when the existing informational fields use another clock.

```text
newProjectionSeconds = max(oldProjectionSeconds, 10 * ceil(1.5 * m / 10))
```

Apply the 1.5 planning margin, rounded up to ten seconds, proactively when the old projection
lacks that margin, not only after it is exceeded. Never lower a projection under this permission.
Before the first run, the latest accepted predecessor's comparable measurement may supply a
labelled provisional basis; after final-source quick verification, recompute using that source's
completed measurements. Do not run a benchmark campaign, rerun a valid check merely for a
projection edit, choose the fastest repeat or change test settings to make the estimate fit.
The margin is an estimate, not a statistical guarantee or a test-performance assertion.
For example, MS09b's Player process wall of 56.3 s would raise 60 to 90 s; MS10a must use its
own final measurements for its final revision, not relabel this historical example as current.

**Admission and fixed ceilings.** Each projection must remain <=450 s (the manifest's existing
per-shard ceiling). With the unchanged overhead 180 s and slowdown factor 3, each Generator
group must satisfy `180 + 3 * sum(projectionSeconds) <= 1800`. Check the actual workflow limits
as well: **both Player jobs are 15 minutes, so `180 + 3 * player.projectionSeconds <= 900`**.
The helper currently prints/checks the Player against the generic 1800 s manifest ceiling;
that is not permission to use 30 minutes for the Player. Preserve all smaller workflow limits.
Run the existing registration/group CI check and record the additional actual-workflow arithmetic.

**Fingerprint versus CI ordering — MS15b Q7, 2026-11-18.** The current app fingerprints
exclude `.github/scripts/generator-quick.json`; this does not make CI evidence independent
of that file. Keep selections/grouping fixed for the tested runs. Counts, measured seconds,
permitted projection raises and provenance may be finalized after the quick measurements,
but **before** the final manifest/coverage/job-budget check. If the manifest changes again,
repeat that check; a metadata-only edit does not by itself require another quick run.
Continue to verify actual workflow limits, all intended coverage and matching current app
fingerprints. This grants no extra membership/tier/timeout or CI-tooling changes.

If the formula would exceed a shard or actual job ceiling, do not clamp it, lower the margin,
write an invalid manifest or raise a ceiling. Report the measured/proposed values and the
unsatisfied constraint with `QUESTION:` for an orchestrator-assigned bounded regrouping or other
approved action. Continue independent safe work under S-OD4, but leave CI-cost readiness unresolved.
No new test move, assertion change or timeout increase is authorized by this ruling.

**Estimation misses are not failed assertions.** Retain the actual duration/outcome and record
the projection revision with `old projection | m | source/command/machine/time factor | calculation |
new projection | affected job total/actual limit | CI check`. Carry actual quick-cost growth in
S-AV08 and the task's item list; raising a forecast does not reduce or resolve that cost.
A completed green run above its old estimate stays a measured green run, not a timing-contract
failure. A real timeout, failed assertion, incomplete coverage or stale fingerprint stays failed
or incomplete; no metadata edit repairs it.

**IR72 G/J stay intact.** CI projections do not replace IR12's recorder-item projections or its
450 s admission rule, and they never raise the 540 s process ceiling, lock/gap rules, individual
test limits or any GD/GQ/GP/CV6 contract. Re-plan before a later command if its bound is no longer
credible. Use existing authorized disjoint quick shards when a whole group is unsafe; this is
local execution planning, not permission to change CI membership or omit a test.

The manifest is outside both current quick fingerprints: a timing-metadata-only edit after a
valid final quick run needs the CI check and fingerprint confirmation, not another quick run.
If fingerprinted code, fixtures, guides or runner inputs change, replace the affected evidence
as usual. MS18e audits every revision, the final margin and actual workflow limits, plus the
matching-head remote durations; a local projection or registration check is not a remote-CI pass.

### S-OD4 stop, item and review protocol

This replaces conflicting performance-only stops throughout the active pack; archived task bodies and
completed logs describe their own historical decisions. The 540-second process ceiling, <=450-second
compound projection, one locked command and 15-second gap are unchanged. Stop an overlong command;
do not confuse that with stopping the task for an owner decision.
**Later narrow exception, S-OD13:** only GQ cells with a source-bound per-cell plan
jointly approved by SA1/SA2 use their approved A/T instead of 450/540. The common
helper and all non-GQ limits remain unchanged; S-OD13 does not itself assign numbers.

- **Owner stop:** invalid/non-unique puzzle, unsound deduction, incorrect exact flag/warning,
  lost/corrupted or misrepresented evidence, or work requiring a change to a recorded decision.
  Correctness includes dishonest coverage/source identities. Do not waive mandatory fixture/proof
  requirements, expand a bounded search or fabricate a real example to complete a task.
- **Continue with an item:** guard/latency/projection exceeded, few/no exact hits or a slow intermediate
  cell. Retain the actual failed/incomplete outcome; do not lower counts, change assertions, call a
  timeout a pass, or launch a command whose bound is not credible. Use existing authorized shards;
  otherwise record the unexecuted population and continue independent work. No new evidence class
  or tooling task solely to work around that intermediate cost.
- **Item handoff:** use stable IDs `S-AV01`, `S-AV02`, etc. Keep each item's origin, request/cell/seed,
  source/defaults, measured numbers or labelled projection, limit, outcome, evidence path, next owner
  and disposition in the task's existing report/evidence and final reply. Carry inherited open items,
  even when this task finds none. Before MS07e route to MS07e and the final MS18c (availability) or
  MS18d (cost); afterwards route directly to those final owners unless a recorded owner decision
  assigns a specific follow-up (S-OD8 routes S-AV08 to MS07f). MS18e reconciles the entire list.
  A correctly recorded unavailable outcome is not lost evidence; missing/corrupted records are.
- **Final gates stay honest:** an item does not authorize an offer, a green test/CI claim, an incomplete
  qualification publication or a release. MS18c applies (c1); MS18d reports the actual GP verdict;
  MS18e reports any unsatisfied release gate. Changing a recorded gate/decision still needs the owner.
- **Review:** analysts cross-review MS05r5p/r5/r5m/b3/r6a/r6b/r6c, MS05e, MS06b/c1/c2,
  MS07a/b/c, MS13a/b/c, MS15a, MS17b and MS18c. MS08a is cross-reviewed as the technique template.
  The orchestrator checks MS08b-MS12, MS14a-c, MS15b and MS16 against that template and the generic
  soundness/order-invariant suites. Other tasks receive orchestrator review, not routine analyst review.

Carried findings (pause-origin numbers remain historical unless a later source/disposition is stated):

| Item | Source-qualified evidence and current disposition | First/final owner |
|---|---|---|
| S-AV01 Greater-Than Normal CV6 | **Open, CV6-05 Q2(a).** Restored `f7be90f` source: 5,209 ms p95 against 1,400 ms on seeds 300-319; 10.6 s p95 on 7000-7039. `BUDGET_MS.normal` stays 700 ms and GP rules stay unchanged. These cohorts are not final qualification; the three fixed endings below govern. Origin: CV6-01, 2,035 ms at MS04 | MS07e, then MS18c/MS18d; MS18e audit |
| S-AV02 mega12 Nightmare | r4 seed 1: 48.202 s against 6 s; seed 3: 47.1 s, shallow at 8 attempts | r5p/r5m update, MS07e, MS18c/MS18d |
| S-AV03 mega16 Nightmare | r4 quick: 60 s timeouts; seed 3 diagnostic: 310.2 s, exact at attempt 6; app 120 s. **PR-S2 remark:** on the reviewed size-default search, mega16 Nightmare fails the 30 s qualification budget by its work ceiling, not as a tail | r5p/r5m update, MS07e, MS18c/MS18d |
| S-AV04 samurai Nightmare/G13 | r4: 104.712 s of 120 s, shallow at 8 attempts (history). **MS13c candidate re-measurement, SA1 review 2026-11-17:** the same G13 request (Samurai Nightmare seed 42), accepted MS14a chain engine versus candidate `5EBA1AE5...AC9D1`, about **11.0 -> 94.2 s**; the activation changes the puzzle and attempts (1 -> 2). One wire-request observation, not a population p95: above the 30 s qualification reference and near the 120 s guard for this request, not a final qualification verdict. See S-AV38 for the wider activation cost/partial GP record. | r5p/r6a/MS07e history; MS13c re-measurement; MS18c/MS18d; MS18e audit |
| S-AV05 Killer Hard | **S-OD7: hidden until later calibration; no in-v3 Killer weight recalibration.** MS07e: 0/14 exact, all in band and shallow, p95 6.6 s; observed hidden. Earlier R5: 0/12 at every setting; MS05b3: 0/20. Owner question Q-MS07e-1 is answered, not pending | Later calibration; MS18c publication, MS18e audit |
| S-AV06 Killer Expert | **S-OD7: hidden until later calibration; no in-v3 Killer weight recalibration.** MS07e: 1/14 exact, 13 shallow, p95 17.8 s, stopped on time; observed hidden. Earlier R5: 0/12 at every setting. Owner question Q-MS07e-1 is answered, not pending | Later calibration; MS18c publication, MS18e audit |
| S-AV07 classic9 Nightmare | 2/12 exact at none and 256; S2.2 is expected to add the missing tier | MS07e, MS18c |
| S-AV08 standing quick cost | **MS07f implemented S-OD8: 296.670 s Generator (3,560 tests; sum of the four group commands), 35.012 s Player (1,807), measured 2026-11-15; within the run-to-run spread of the five-minute mark, no further move approved.** Earlier: S-OD8 approved; implementation is MS07f after MS08a. MS07e: **692.1 s** Generator, **33.5 s** Player; section 9's three ratio tests plus combined replay case cost 392.1 s, but the classic9 request stays quick. No five-minute promise or further move follows. Earlier: **679.4 s** at MS07d (+46 merger tests). Earlier: **684.3 s** at MS07c (C = 4 makes the Nightmare work smaller). Earlier: **744.9 s** at MS07b (+7.9 % over MS07a's 690.2 s; G14 now rates `nishioDeep`). Earlier: **690.7 s** at MS06c2 (MS06b 652.9 s, MS06c1 650.7 s; the activation adds about 40 s: `pipeline` +35.8 s in four puzzle-generating tests, +15-21 %; `mega` +40 %; IR47). Earlier: **648.0 s**, MS05r6c Generator quick baseline retained by the CV6-05 restoration/identity proof. Rejected pool: 726.2 s, historical only. Earlier b1's 713.8 s was partial, not a complete baseline | MS07f; MS18e final cost/tier audit |
| S-AV16 Greater-Than Nightmare CV6 | **Withdrawn as a current-source item (CV6-05).** Rejected pool p95 40,396 ms against 20,000 ms remains historical evidence. Restored source returns to the observed 19,192 ms pass; see the margin note below | History retained; MS18e audit, not an open pool regression |
| S-AV17 pool's neighbour and quick-cost regressions | **Withdrawn as a current-source item (CV6-05).** Preserve candidate Easy/Hard/Expert slowdowns and 726.2 s quick cost as measured history; do not describe them as the restored source | History retained; MS18e audit, not an open pool regression |
| S-AV18 Greater-Than Expert off-band misses | MS06a (restored source, seeds 20260101): 10/12 exact; requests 2 and 5 end off-band in Master (scores 1013 and 1046, about 14 s each); the same two requests missed in MS02 | MS06d comparison, MS07e, MS18c |
| S-AV19 design 9.1 p95 flags | MS06a: the soak's informational `SLOW` flag against the design section 9.1 p95 target fires in 9 of 17 cells at 12 samples each; not a gate | MS18d (GP decides), MS18e audit |
| S-AV20 shallow results without an inherited item | MS06a: jigsaw9 Expert 1/12 shallow, diagonalX Nightmare 2/12 shallow | MS06d comparison, MS07e, MS18c |
| S-AV21 jigsaw9 Expert exact loss | MS06d (target active): exact 11/12 -> 10/12; request 0 from exact (0.57 s, 2 attempts) to shallow (2.62 s, 8 attempts) | MS07e, MS18c |
| S-AV22 request-level exact losses | MS06d: four gains and three losses among the 76 changed puzzles (classic9 Nightmare 1, jigsaw9 Expert 0, diagonalX Nightmare 6: 2.39 -> 11.75 s); in band 202 -> 202 | MS07e, MS18c |
| S-AV23 jigsaw9 cost under the target | MS06d: Nightmare 1.53x generation time and 2.6x full ratings; Expert 1.29x | MS07e, MS18c/MS18d |
| S-AV24 mega Hell 1 request time | MS07b (14 records, final source): mega12 29.3-34.4 s, mega16 99.9-123.3 s; 120 s guard exceeded by 1 of 7 mega16; 30 s qualification budget exceeded by mega12 6 of 7 and mega16 7 of 7 | MS07e, MS18c/MS18d |
| S-AV25 Hell 1 exactness | MS07b: 0 of 14 mega Hell 1 records and 0 of 2 classic9 pilot requests exact (in band, shallow); SA1 expects the classic9 Hell 1 GD batch (at least 90 % exact) to fail at MS07e | MS07e, MS18c |
| S-AV26 classic9 Hell 1 cost (indication) | MS07b pilot: about 5 s per request against the 2.5 s design budget; two requests only; related to S-AV19 | MS07e, MS18d |
| S-AV27 qualification second round on one worker | MS07d (`round2-workers.txt`): in a one-level invocation the 60 second-round requests run on the single worker that finished round 1 (max in flight 1 for jobs 1/2/4/8, against 1/2/4/8 in round 1): about 60 request times of wall instead of about 15 per expanding cell; verdicts and the early-stop proof unchanged; scheduler untouched. MS07e left six cells unexecuted above the 450 s projection limit; Q-MS07e-2 below routes them to MS18c without a rule change. The p95 of an expanded cell mixes one-worker and up-to-four-worker timings: not comparable across cells, `--jobs` values or jobs-1 GP timings, and not a protected timing measurement | MS18c (six cells/current-source bounds); timing caveat to MS18d/MS18e |
| S-AV28 Easy availability | MS07e GQ: diagonalX Easy 28/40, hyper 29/40, samurai 10/22, sohei 4/18, butterfly 1/15, flower 0/14 (current offers lose Easy on six variants); 40/40 elsewhere | MS18c |
| S-AV29 Greater-Than Master time | MS07e GQ: 40/40 hits but p95 14.5 s over the 10 s budget (heavy tail; the cell took 35.3 s against a 27.5 s projection): hidden by time | MS18c, MS18d |
| S-AV30 mid-level shortfalls | MS07e GQ: flower Expert 23/35, flower Master 29/40, wordoku Normal 35/46; classic9 Normal and mega16 Expert at exactly 36/40 | MS18c |
| S-AV31 Finned Swordfish multigrid finder latency | MS09b, finder measurements of one process (`docs/difficulty-v3/evidence/MS09b/work-census.json`; not GP or qualification verdicts), limit 50,000 unchanged: 3,508 sampled calls on the agreement corpora, 0 capped; the largest cohort costs are the Samurai 23,466 units (47 % of the limit; p95 and max 212.353 ms of its 12 seed-4242 calls) and the Sohei 8,412 units (p95 and max 70.517 ms of its 12 seed-777 calls); 16 digits p95 21.813 ms, max 23.382 ms. Eight constructed calls kept apart: the blank Samurai with every digit open hits the cap (50,000 units, 3.781 s), the blank Sohei costs 14,688 units, 0.948 s. R10: no board-dependent limit, no rise to a structural bound (128,520 and 255,420) and no adjustment | MS18d; MS18e audit |
| S-AV32 remotePairs reachability | **Decided by RP-01 / S-OD9; open for measured closure/audit, not awaiting Fable.** Owner-confirmed 116/350/35 replaces 132/440/44. Keep the superseded prior and the question's four logs under `docs/difficulty-v3/evidence/MS10a/logs/` unchanged: `explore-dug-4242-30000.txt` (0/30,000 through the old prefix), `explore-solves-4242-20000.txt` (0/20,000 complete solves with the step), `explore-dug-777-3000-prop.txt` (67/3,000 first positions) and `explore-dug-777-3000.txt` (0/3,000 through the old prefix). MS10a adds `explore-dug-4242-30000-order116.txt` and `explore-solves-4242-20000-order116.txt`, with both full populations and the count/rate of completed solves containing a Remote Pairs step; no order-116 rate is claimed before measurement. Gate pass requires at least one such completed solve, followed by unchanged normal-hint GH. A complete zero-hit gate goes to the owner ((B) or removal), not another prior or Fable. Known exception: assembled Killer cages are partial units that supply real peers; a cage-only peer edge invalidates the complete-unit subsumption proof, but does not itself demonstrate normal-hint reachability. Record the caged-model soundness/bound check separately from the earlier uncaged 27-unit model; do not use the exception for GH. | MS10a gate/GH and numerical handoff; MS18e audit; owner if the gate fails |
| S-AV33 WXYZ-Wing bounded-prefix coverage/cost | MS10b pre-E on `c928472` plus the candidate (`docs/difficulty-v3/evidence/MS10b/work-census-first.json`); 50,000 units/call unchanged. **7,168 sampled finder calls, two capped**, both Samurai (one of twelve for seed 4242 and one of twelve for seed 777; largest cohort latency 0.566 ms). Sohei: **0/24 capped**, largest work 42,542, largest cohort latency 0.438 ms. A separate **17 constructed calls, fifteen capped**; equal-{1,2,3,4} floods have no WXYZ-Wing, so these hits are not demonstrated lost deductions or real-puzzle cap rates. `structural-max.txt`'s classic9 crude bound is 1,752,381, and its uncapped flood count is 93,035; neither is a reason for a limit increase. Killer's current 27-unit structural model and `H.model('killer')` census are uncaged, not assembled-cage observations. Retain the preliminary populations, distinguish sampled/flood/bound/latency evidence, and attach the already-planned final-source census and cost, with capped-state indices. Not a qualification/GP verdict, availability waiver, new gate or owner stop. | MS10b numerical handoff; MS18d; MS18e audit |
| S-AV34 UR second-pass bounded-prefix coverage/cost | MS11a accepted source `ef95fc5`; `docs/difficulty-v3/evidence/MS11a/evidence.md`, `work-census.json`, `structural-max.txt` and `pattern-cost.json`. The real-cell cap is removed; the **50,000-unit second-pass work limit stays unchanged**. Of 7,168 sampled finder calls, **6,842 entered pass 2; none was capped**. The crude unpruned bounds (9 digits 242,028; 16 digits 301,860,864) exceed the limit but do not prove an actual cap hit or missed deduction. A separate constructed 16-digit row costs 5,832 units, uncapped; the Type 4 vector costs 35 because Type 3 runs first (expected, pinned). Mean full finder-call latency on the 12-state 16-digit sample is about 1.75 ms, including one-time table construction, not a steady-state second-pass estimate. Correct capped-prefix/boundary tests exist; what is not established is exhaustive deduction coverage within 50,000 beyond the measured populations. Keep structural bounds, constructed work and sampled costs separate; do not describe this as absent coverage evidence, a demonstrated loss, or a GP/qualification failure. Track UR separately from WXYZ's S-AV33 and carry later UR measurements under this ID. No immediate campaign, limit change, new gate or hold on MS11b is authorized. | MS18d coverage/cost report under its existing protocol; MS18e audit |
| S-AV35 Jellyfish normal-hint source availability | MS12, JF-01 origin: GH 36/37; saved Nightmare-828 Jellyfish no longer replays. The known-source groups and all 48 authorized Generator discovery requests supplied no normal-hint source (`docs/difficulty-v3/evidence/MS12/logs/gh-check-all-37.txt`, `gh-jellyfish-*`; source sets may overlap). Owner decision S-OD10 approves only JF-01 option A's bounded corpus route; this is not a GH waiver or a claim that a source has been found. MS12 records construction/replay work, attempted/completed/incomplete index ranges, selected source provenance and the final all-37 GH/quick/CI results. If the bound fails, return to the owner rather than defer the missing example or extend the search. Keep the exception and its result for the final audit; no standing permission for later tasks. | MS12 completion under S-OD10; MS18e audit; owner if the approved route cannot finish |
| S-AV36 grouped-graph construction cost/cap exposure | MS13a final inactive engine SHA-256 `501481B415F1AD9B49D3BE355767C8922C5475FF2D93200A41DA1338705B9AEE`; SA1's locked review, relayed 2026-11-17 01:52 (+07:00), and corrected `docs/difficulty-v3/evidence/MS13a/census-all/table.md`/per-model JSONs. **Construction only**, default 50,000/4,096: seeded ladder chain-group positions over the work cap are Samurai **38/48** (median/max full-build 85,352/138,529), Sohei **43/51** (109,951/124,066), Flower **17/44** (44,057/70,583), mega16 **20/321** (23,349/57,089); classic9/mega12/Butterfly have none (max 6,117/13,644/31,008). Constructed blank maxima reach 1,715,391 (Samurai) and 1,209,344 (mega16), with no measured blank exceeding 4,096 groups. SA1's real G13 observations cost 6,764/1,708 and G10 660; keep them separate from seeded/synthetic/blank cohorts. These are not active-finder cap rates, demonstrated lost-deduction counts or GQ/GP failures. MS13c retains the full table, measures construction plus search, short fallback and whole-call cost, and uses the data in its once-only own-new-limit decision; no automatic increase or board-specific limit. **GC-01 policy resolved by S-OD11:** owner, Discord, 2026-11-17 04:30 (+07:00), "GC-01: chọn A." Short-only uncapped singleton fallback on a local grouped cap, same parent/window, singleton minimum domain; long remains bounded. The numerical item stays open for source-qualified activation/final cost and audit, not an unanswered policy choice. | MS13c cost/limit records; MS18d final cost; MS18e audit; MS18c for measured availability consequences |
| S-AV37 leftover kernel cost/caps on irregular Jigsaw layouts | **Active MS14b accepted at `0e3a0c4`**; `docs/difficulty-v3/evidence/MS14b/evidence.md` section 6 and `s-av37.json`. Limits stay **2 units/side, 4 difference cells/side, 50,000 work units/call**; the R10 adjustment was not used. Blank stress: **2/5 layouts cap**, `staggered` and `wavy`; origin `ea14798` / MS14a C4 full blank counts remain 98,530, 81,664, 33,784 (`mixed`), 6,469 (`crossed`), 3,436 (`boxes` control), with only the first two above the default. **60 seeded positions** (five layouts x two orientations x seeds 1-6): **0 caps, max 5,842**. **14 real puzzles** (twelve Jigsaw Hard discovery requests and two existing help sources), **38 calls: 0 caps, max 3,845**. Keep blank stress, seeded positions, real calls and MS14a's 480 agreement cases distinct; these are not a universal cap/availability claim, demonstrated lost-deduction count or GP verdict. Generated-layout cap rates, real positions beyond those fourteen puzzles and whole-generation cost remain unmeasured. No automatic limit increase, layout-specific bound, fallback, wider discovery/corpus campaign or new gate follows. MS14c carries only and remains corpus-free Killer regression; the item stays open, not an owner stop or gate waiver. | MS14b measured disposition complete; MS14c M14 handoff only; MS18c measured availability; MS18d cost; MS18e audit |
| S-AV38 grouped-activation generation cost and incomplete GP | **MS13c accepted at `9d58d86`**, measurements from its engine SHA-256 `5EBA1AE580D5F63AD0A1B2DA0FCC4CAD0C515C297C9391C691D4CB58626AC9D1`, accepted chain comparator `4aa3d11`/`ea14798`, not `main`; `docs/difficulty-v3/evidence/MS13c/evidence.md` section 11, GP table/ledgers/logs and SA1 review. **50 affected cells:** 21 complete 50-run records (15 meet, six miss); 16 with complete two-run pilots only (including the separate greaterThan/nightmare 50-run timeout); 13 with no complete pilot (12 unpiloted multi-grid cells and mega16/hell1's two aborted pilots). Mega16/easy is a separate successful control. Five paired 50-run p95s, ms base -> candidate: classic9/nightmare **3,061 -> 4,902**, diagonalX/nightmare **7,693 -> 16,534**, wordoku/nightmare **1,624 -> 3,371**, mega12/nightmare **5,485 -> 8,396**, killer/hell2 **8,806 -> 14,528** (only Killer crosses from meeting to missing among these five). Butterfly/nightmare **24,335 vs 8,000** is a current miss without a paired base-50 record. Two-run **observed maxima**, not population p95/GP verdicts: hyper/nightmare **658 -> 19,543**, jigsaw9/nightmare **4,272 -> 22,283**, greaterThan/nightmare **6,931 -> 11,450**. G13's single-request increase is S-AV04. Keep each cell's population/source/status/projection basis explicit; no copied Samurai timing as a bound for other models/levels, no pilot pass ticks or full-matrix aggregate. The item permits honest intermediate deferral of unsafe/unmeasured cells under S-OD4, not a complete GP/release claim, target/guard relaxation or new timing campaign. Inform the owner of the magnitude now; performance alone does not require a new policy decision. | MS13c corrected cell-qualified record/handoff; MS18c availability; MS18d full final GP/cost; MS18e audit |
| S-AV39 ALS cost/cap exposure | **Origin: inactive MS15a at `b958a58`**; its evidence sections 3/12/14 and `logs/probe-density-1.txt`, module `FCE57E99F98EA739A136A38BB85CD87C21D20D1BE8B2664B174E92DCD1656042`, with SA1's final-source rerun. Enumerator-only blank 9 x 9: 810 units; 16 x 16 `{1,2}` flood: 154,032. The 33-call seeded density probe (3 classic9, 12 twelve-digit, 15 sixteen-digit, 3 Samurai; seed 1504 reused; diagnostic work `1e9`, records `1e7`, cells 4) reaches 8,318 records on 12 digits, 33,557 records / 111,494 work on 16 digits and 8,962 records / 37,521 work on Samurai. **Active MS15b accepted at `8b26e83`**; `docs/difficulty-v3/evidence/MS15b/evidence.md` section 5 and `s-av39-*.json`. Shared **4 cells / 4,096 records / 50,000 work** retained; no adjustment used. Whole-call constructed stress: eighteen states, the 16 x 16 flood caps at 50,000, lifted work 154,073 with a Finding. Seeded/sweep: **344 calls / 22 groups, 251 Findings, zero work caps, four record caps** with identical lifted Findings. Repository sources: **58 input rows / 254 calls / 20 Findings**; fifteen rows reaching ALS-XZ are twelve distinct puzzles; three work caps in the xWing help puzzle yield no Finding when lifted either; maximum observed latency 7.9 ms. Keep these populations and enumerator-only/whole-call counters separate; not a generated-layout cap census, universal limit-sufficiency claim or GQ/GP verdict. Generated-position and whole-generation gaps remain. MS16 preserves shared limits/ALS-XZ; only its own new R19 work allowance has its existing measured once-only adjustment. No model-specific bound, fallback, wider acquisition or new gate follows. | MS15b measured disposition complete; MS16 inherited contract and own scoped coverage/cost; MS18c measured availability; MS18d cost; MS18e audit |
| MS15b-GP-J jigsaw9/nightmare unadmitted GP | **Accepted source `8b26e83`**, `docs/difficulty-v3/evidence/MS15b/evidence.md` section 20, `logs/gp-pilot-jigsaw9-nightmare.txt`. Only the two-run pilot (seeds 7000/7001): 9.065 s command wall, observed maximum 6,854 ms. The prescribed 50-run command was **not launched**: projected 227 s expected, **680 s conservative >450 s admission**. The two-run maximum is not a qualifying p95 or verdict; no timeout of a 50-run job occurred. Do not retry unchanged, use the expected value alone as a bound or copy another cell/source timing. No interim target/guard/run-count change or new evidence class. MS16 carries it, not a new GP campaign. | MS18c availability consequences; MS18d current-source admission and final GP; MS18e audit |
| MS15b-GP-U unmeasured affected cells | **Accepted source `8b26e83`**, MS15b evidence section 20 and `logs/affected-cells.txt`: **37** performance cells admit ALS-XZ. Classic9/nightmare alone has a full 50-run record (p95 2,312 ms / 2.5 s, meets); jigsaw9/nightmare is the pilot-only item above; **35** listed cells have no GP measurement or pilot. Their admission/cost is unknown, not proved unsafe and not a pass/fail verdict. No subset aggregate or comparison with MS13c's different-source 50-cell denominator; no paired base-50 record for the one complete cell. MS16 carries these gaps without silently assuming or acquiring fresh generation coverage. | MS18c availability consequences; MS18d entire final offered matrix; MS18e audit |

**S-AV39 — accepted MS16 extension at `d41a6dd`.**
The table's MS15a/MS15b populations remain their own historical measurements; MS16's
whole-call `sueDeCoq` results are in its evidence sections 5/9 and the final-byte S1-S3
rechecks. Own **50,000 retained**, shared ALS bounds unchanged. Seeded/sweep: **488 calls,
115 Findings, two work caps, three record caps**. One sparse 16-digit work cap hides a
Finding completed at **101,791** lifted units (100,000 still caps; 200,000 recovers it);
the other sparse 12-digit call completes at 173,880 without a Finding. The three
record-cap Findings match the lifted ones. Repository-source measurement: **301 calls
on 23 reached puzzles, no Finding or cap**, max work 3,326; the later seed-377 GH source
is a different observation. Constructed floods remain separate (12/16 digits cap, lifted
89,916/375,088 units, no Finding). These are not generated-layout cap rates or proof of
exhaustive coverage. MS17a carries only; MS17b freezes the selected limits, not a new
selection. MS18c/d/e retain the availability/cost/audit disposition.

**MS15b-Q6 — accepted consumer coverage disposition; carry to MS18e audit.**
At accepted `8b26e83`, replay identity
`e1278c0b4e6966996ac79648b2210dd87acf714de8c08f485e6aab680f11ed26`
has fifteen compact golden jump first uses, all with removal effects. Q6's controlled
placement-only rating/first-use/Why regression is implemented, with the mixed case and
real-golden checks retained/current (including G10 and G13). Q7 corrected SA2's erroneous
G10/details/37 selector: G13/details/129 and G14/compact/69 are the accepted unfinished
guided-jump specimens; G10's raw-span witnesses are a separate premise.
Record constructed coverage honestly, not a real current-golden placement claim or a
new level-availability failure. Both views have fifteen jump occurrences, eighteen distinct
transitions overall; the compact inventory is not an all-view absence proof. No new source
hunt or golden-manifest change is assigned. Final fingerprinted docs/counts precede final
quick runs; this disposition does not waive E, current GH or any other integration gate.

**MS16-Q6 — fixed-source lineage and missing QUESTION pause; MS18e audit.**
The single already-owned E request `classic9/nightmare#377` may supply the real GH example
through its recorded normal-pipeline materialization, hash/givens identity and Player
normal-hint replay. This is ordinary B/H1, not I2 pin replacement, a corpus scan or a new
S0 exception. MS16's leaf specifies the source/ledger/export/log cross-references and the
old-base/new-candidate distinction. Keep the legitimate example, but disclose that the
developer executed the permission interpretation before asking and presented it for
review only at completion. Evidence/report corrections and audit disposition are required;
no new generation, source replacement, evidence class or automatic E/quick rerun follows.
Other template-review gates/bounds and the orchestrator's acceptance remain outstanding.

**Q-MS07e-2 — SA2 ruling, 2026-11-15: no rule change; route to MS18c.**
Do not reopen MS07e or launch the six cells once speculatively. Its section 4 source/projections
remain: mega12/hell1 **556 s**, mega16/nightmare **1,246 s**, mega16/hell1 **1,808 s**,
greaterThan/expert **919 s**, greaterThan/hell1 **3,957 s**, butterfly/hell1 **4,032 s**.
These are unexecuted cells with labelled projections, not hidden verdicts. Keep each in the final
135-cell manifest. MS18c reassesses from its final-source evidence, including the serial second
round, startup and variance margin; launch only with a credible <=450 s projection and the
unchanged 540 s ceiling. Protocol-proved early stopping during a run remains valid, but the
129 cells' 13% aggregate cost is not a bound for these six and authorizes no advance early-stop
credit. No scheduler fix, jobs change, new evidence class or new tooling task is assigned.
If a complete bounded route is still unavailable, report the final gap and leave publication/
release unsatisfied; any later proposal to change the recorded rule goes through the orchestrator,
not an implementer's exception. No request to Fable is initiated by this ruling.

**Final-dispatch follow-up, 2026-11-18:** S-OD13 answers MS18c-Q1/Q2: declared
host-active GQ and a GQ-only longer route with **joint SA1/SA2 numerical authority**.
The old six observations remain historical; no outcome is relabelled. The Stage 1
preflight and Stage 2 joint approval must precede any GQ-specific higher limit;
no early-stop credit, scheduler change or incomplete publication is authorized.

**CV6-05: S-AV01's three fixed endings.** Nobody now edits, skips or wraps the Normal CV6
assertion. It is manual, outside the quick set and CI, and its honest red outcome blocks no
task. Keep Greater-Than Normal offered until final qualification; no interim pruning.

| Final outcome | Binding S-AV01 disposition |
|---|---|
| Normal fails final qualification at MS18c | Hide it by the existing rule and close S-AV01 as **"not offered"**. Its CV6 timing case follows the same recorded MS18c population treatment as every hidden cell's manual cases; no special treatment. |
| Normal qualifies but final-source CV6 still exceeds its assertion | MS18c returns through the orchestrator to the plan author with final-source numbers **before MS18d's final timing runs**; decide the first branch of fallback (b) once on those data. Its fixed form is one base value in milliseconds for `BUDGET_MS.normal`, the same base for a Greater-Than Normal GP target if GP has one, the machine factor left to `SG.test.timeLimit`, never above 10,000 ms (Expert and the qualification budget). Change the test, corresponding GP target, `generator/design.md` section 9.1 (the `greaterThan` Normal cell) and both developer guides in that same assigned step. Until that recorded decision the 700 ms stands. Qualification never makes a failed CV6 assertion pass. |
| CV6 passes on the final source | Close S-AV01 with the measured final-source result; no contract adjustment is inferred. |

**Greater-Than Nightmare margin for MS07e (CV6-05):** the restored-source observation is
19,192 ms of 20,000 ms, a pass with about **4% margin**, not a reusable upper bound. MS07's
chain work will move it. If it fails later, the task that moved it records a new named item
with its own source/numbers; do not attribute that to the withdrawn pool or revive S-AV16
as though the candidate remained active. This note adds no measurement to the CV6-05 closure.

**PR-S2 remark (Fable, `92a7693`, archived in `docs/difficulty-v3/clarifications-resolved.md`):** MS05e-MS18e
were confirmed as written at that review; CV6-05 subsequently closes MS05e and amends the sign-target
handoff as above. MS18d profiles the single S-AV11 Jigsaw request when doing its performance
work; until then its stage/cause is unknown, not a dig cost. MS07e/MS18d retain the existing
per-request `stats` counters (`samples`, `attempts`, `oracleCalls`) as the later feature's baseline.
These are reporting/evidence notes, not new scope, caps or budgets.
`docs/improve-generating/plan.md` is saved for later and is not authorized now.

### S-OD2 recovery boundary and dispatch estimates

The sequence originally started from MS05b1's uncommitted implementation at `f788e02`. It now resumes
from `c9935cd`, retaining the owner-ordered non-green pause commit `a7f6660`; do not recreate or
reset it. r1-r5 (including r5p/r5m), b3 and r6a complete **step evidence**, not independent acceptance. r6b can
close the retained b1 and absorbed b2/c/d duties. Their old files are reference/routing records,
not extra tasks, prerequisite commits or extra gate passes. The old r6 file is also now a
milestone/routing record, not another dispatch. r6c's CI changes are inside the same combined acceptance.

| Dispatch | Owned outcome | Active time | Machine estimate (serial, conditional on completing gates) |
|---|---|---:|---:|
| MS05r1 | Three one-attempt work profiles; ordinary samples versus local continuation | 45-60 min | 3-15 min |
| MS05r2 | Correct consumers/prefix checks; seven manual contracts | 35-50 min | 1-5 min |
| MS05r3 | Work/allowance/transport/shards; Infinity default | 45-60 min | 2-10 min |
| MS05r4 | Twelve non-selecting diagnostics, exact 288-request selector, focused triage and original-limit guards | 45-60 min | 25-90 min |
| MS05r5p | One size default, store migration/control, focused checks, three replacement diagnostics | 40-60 min | 5-15 min, not yet measured |
| MS05r5 | Non-running inventory, exact/results tooling, planned full-quick shards | 40-60 min | 1-5 min |
| MS05r5m | Quick replacements and 14 independently keyed deep records/relations | 1.5-2 h operation | 20-40 min at new defaults, projection only; former 45-65 min estimate used 8 attempts |
| MS05b3 | Post-selection lazy corpora, early I5/CV3/refusal evidence | 45-60 min | 20-90 min |
| MS05r6a | G13 persistence first, final-source approved-contract recheck, complete 520/5/14 E/pins | 2-3 h operation | 20-45 min |
| MS05r6b | Complete quick/GD, measured standing cost and combined audit | 1.5-2.5 h operation | 25-60 min |
| MS05r6c | Bounded quick CI groups, deep-evidence replacement comments and coverage check | 30-50 min | 2-10 min locally; remote jobs <=30 min |

These are planning ranges, not added time budgets or a promise to recover performance.
Every invocation is <=540 s; project compound cases <=450 s before launch. Announce/acquire the
shared slot and lock for all possibly >10-second work. No concurrent work or loop of unbounded
commands. Source changes invalidate affected evidence. The expressly authorized r5p size policy
replaces r4's large-board diagnostic times, not its six-cell selector (all six boards have 81 cells).
Keep 256; no R5 rerun before MS18b merely because r5p changes the large-board defaults.

**Historical mandatory stops (S-OD2, now superseded):** r4 originally stopped on remaining
G13/mega/quick failures and forbade persistence or tier changes. That explains its stopped log.
S-OD3 now permits G13 persistence and the mega quick/deep replacement; S-OD4 permits the size
default and replaces performance-only owner stops with the item protocol above. No automatic
allowance change, discarded seed, global time-factor increase or dishonest exactness is allowed.
An unexecuted or failed check is still reported as such, never silently passed.

Specifically reviewed genuine changed data pins may await r6a as r4's manifest says; this is
the normal intentional-expectation refresh, not a waiver of a contractual quick failure.
r6b makes no ad hoc assertion repair. Its measured quick cost is presented **per app** with normal
acceptance. If Generator remains above about five minutes, carry S-AV08 to MS07e for a proposal of
which generation-heavy quick cases should move to the manual tier; do not move them without approval.
That proposal was approved in S-OD8 on 2026-11-15 for the four named cases only; MS07f now owns
the move after MS08a, preserving the original assertions and recording actual before/after costs.

After r6b's audit and r6c's CI closure, the orchestrator makes **one** meaningful combined commit:
`difficulty-v3 MS05: required exactness with measured bounded recovery`.
Include retained b1, r1-r5 (including r5p/r5m), b3, r6a/r6b/r6c changes/evidence/docs and required trailers.
The commit body must say: **"The earlier pause commit a7f6660 was not green and was not acceptance."**
Do not construct independently green intermediate commits retrospectively. Fill step-evidence
logs at their reviewed handoff; complete combined acceptance/absorbed-scope coverage only then.
Private backups are safeguards, not acceptance. MS05e starts only after this commit.

### B — complete technique integration bundle

Every file saying "full B" owns the applicable parts below during its sequential wave:

```text
generator/js/engine/difficulty.js
core/tests/fixtures/techniques.js
core/tests/suites/techniques.test.js
generator/tests/suites/technique-weights.test.js
generator/tests/suites/difficulty-floor.test.js
generator/tests/fixtures/rated.js
generator/tests/manual/difficulty.test.js   (current reference contracts only)
generator/js/ui/locale.en.js
generator/js/ui/locale.vi.js
player/js/ui/locale.en.js
player/js/ui/locale.vi.js
generator/js/ui/help.js
player/js/ui/help.js
generator/tests/suites/help.test.js
player/tests/suites/help.test.js
player/js/ui/help-examples.js
docs/difficulty-v3/notes.md
```

Also own E's generated fixtures when behavior changes: regression.js, replay-wire.js,
replay-goldens.js under Generator fixtures, and intentional replay/steps assertions.
The task's engine/group suite and directly affected designs/guides are additional exclusive files.
No parallel translation/fixture writer owns B. L means all eight source lists in section 3.

For each new ID: fixed order/weight/baseCost/group/scope/uniqueness, exact nonempty Finding, both
apps' name/description/actual subtype keys in EN+VI, two real positive exact-Finding fixtures and
one negative (scoped equivalents for leftovers), independent completion checks and a real Player
example. Uniqueness fixtures prove uniqueness, not just one completion. Keep all existing random
soundness inputs/minFirings; add deterministic real supplemental states if rare patterns need them.
No 32-bit mask for all board cells, input-state mutation, stale state-identity cache or swallowed cancellation.

Preserve original `LADDER`, preprocessing arrays and v2 records. MS04 supplies current registry
order/active overrides and v3Expected reference data. New positions use explicit copied `after`
arrays or initial real puzzle states; never dynamic `before(newId)` from the frozen old ladder.
**MS15b Q5:** an isolated predecessor-finder specimen displaced solely by valid ALS-XZ
pre-emption may retain its accepted pre-ALS preparatory ID sequence as a new explicit local
recipe, under the leaf's proof/inventory/standing conditions. Keep the puzzles, population,
assertions and predecessor implementation unchanged; do not edit the existing frozen data
or turn a current-ladder claim into a historical one. Current normal hints, GH, replay,
ratings, E, generation, qualification and GP are not covered. No new scan/source is selected,
so no replacement-seed search is inferred. This is task-local test-fixture maintenance,
not a change to S-OD12/S0 or a standing acquisition exception.
Document intentional current-fixture/reclassification changes, never fit weights to historical labels.
`v3Expected.required` is checked at `v3Expected.level`, not at the historical label. A test deliberately
checking an old requested level names that level and its separate expected verdict explicitly.
Both quick sets must pass at every accepted introducing task, including old examples affected by
an earlier new technique; refresh every affected ID, not only the new ID.

**Finite source acquisition.** First try existing real help source puzzles and known unique fixture
puzzles; record provenance. For help, retain the established Generator export-text format. Use
MS03b's --record-sources to capture successful sources per ID without requiring a partial help
catalogue to be publishable. Combine per-ID source maps without altering puzzle text or accepting
duplicate IDs, then publish/check the complete selected catalogue. For newly registered multiple
IDs, collect their sources separately and write them together.

At most four distinct discovery batches of 12 attempted requests per introducing task (48 total),
each one variant/level and <=400 hints/puzzle, <=8-minute tool deadline. Start with the levels
named in its file, then other existing PLAN levels if needed; Jigsaw PLAN has hard/expert/master,
not normal. A batch that fails still consumes its attempts. No identical no-progress reruns,
unbounded search, synthetic production example or weakened one-example-per-ID assertion.
If the bound cannot supply the required real data, report the exact missing ID/source attempts
and stop for assigned additional input/work, not a dishonest completed task.

**One-off owner exception — JF-01 / S-OD10:** MS12's Jellyfish acquisition alone may use the
classic9 seed-4242 corpus route in its amended brief (indices 0-19,999, chunks <=64 and the
unchanged hint/time/lock bounds). Reuse/materialize the prefix once; stop acquisition at the first
verified-source chunk, or report/stop at exhaustion or unsafe execution. The ordinary four-batch
Generator discovery ceiling is not reset or expanded; no other ID/task inherits the exception.
Normal-hint GH acceptance and final quick/CI gates remain mandatory. S-AV35 carries the result.
**JF-02 / S-OD12, A + S0:** owner, Discord, 2026-11-17 13:46 (+07:00), "tôi chọn A và S0".
Retain MS13c's verified `testkit-4242-8657` snapshot and completed 0-8,703 acquisition record
retroactively, explicitly stating that the scan lacked authorization when performed.
S0 preserves case-by-case permission; no standing S1 route, further scan or unused quota is
approved. Ordinary B/IR72 remains, and future exceptions need separate prior owner approval.
The authorization hold is resolved, not the reviewed fixes or final GH/quick/CI requirements.

From Player, exact template (replace only T/ID/variant/level with the owning task's stated values):

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=skyscraper --discover --variants=classic9 --levels=hard --max-puzzles=12 --max-hints=400 --record-sources=tests\artifacts\difficulty-v3\MS08a\source-hard.json
```

Pattern-cost recordings use the MS07a CLI, 20 runs/case, both positive and negative fixtures.
They are GP cost evidence, not a new wall-time assertion in quick tests. Starting limits are the
accepted R10 values; only the introducing finder can adjust its own new limit once, with
before/after data and resulting E/GH. MS15b selects shared ALS defaults; MS16 cannot retune them.
**MS15b Q1-Q4 clarification:** once its work definition is fixed, the developer may retain
defaults or make that single common own-limit adjustment on recorded before/after cap and
latency evidence, with values/rationale in the task record and notes before final E. This is
the existing delegated R10 choice, not a new approval gate. It is not one change per model,
phase or failed gate; unused permission does not transfer to MS16. A second adjustment,
work-unit redefinition, permission expansion or genuinely unresolved choice needs a QUESTION
before acting. P0's small lifted-limit probe is not a global cap/latency study.
MS17b freezes the actual new-pattern limits with v3.

## 3. Shared conventions

- Classic IIFE scripts on `SG`; no `import`, `export` or `require` in application `js/` files. Node
  tools may use the existing CommonJS style. Shared engine code must not know either app or the DOM.
- 2-space indent, single quotes, semicolons, English explanatory comments only where needed; engine
  lines at most 110 characters. Use existing CSS tokens, not colour literals.
- User-visible strings go through i18n and exist in EN and VI with matching placeholders. Generator
  and Player locale files are under their respective `js/ui/` directories.
- Every new core module goes into all eight source lists: `generator/index.html`, `generator/tests.html`,
  `generator/tests/node-runner.js`, `generator/js/worker/gen.worker.js`, `player/index.html`,
  `player/help.html`, `player/tests.html`, `player/tests/node-runner.js`. Test/fixture lists in both
  HTML test pages also follow any new shared suite/fixture. Node suite discovery is automatic.
- After MS05r6c, every task adding a suite also owns its bounded CI group and current quick-manifest
  membership. No catch-all may silently pull manual/deep generation into CI. Keep both workflows'
  intended quick coverage complete. A changed explicit selector/test name also owns its coupled
  CI manifest update; do not wait for MS18e to discover stale names. MS18e performs the final audit.
- Every task updates directly affected living facts in `generator/design.md`, `player/design.md`,
  `USERGUIDE.md` / `.vn.md`, `DEVELOPERGUIDE.md` / `.vn.md` in the same change; do not defer it to MS17.
  Update only applicable sections. Help suites check paths, commands, anchors and public API names.
- Never edit dated reports under `docs/difficulty-rating/`. **R24 exception:** MS18 first archives the
  v2 live table as `docs/difficulty-v3/qualification-v2.md`, then updates
  `docs/difficulty-rating/qualification.md` in place. Reader paths do not change.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace. `core.autocrlf=true` and
  `core.safecrlf=true` reject mixed endings. Preserve explicit `.gitattributes` LF exceptions for
  shell scripts/export-text fixtures; new pack documents and JavaScript use CRLF.
  Check each changed ordinary file:

  ```powershell
  node -e "const t=require('fs').readFileSync(process.argv[1],'utf8');if(t.charCodeAt(0)===65279||/(?<!\r)\n|\r(?!\n)|[ \t]+\r?$/m.test(t)||!t.endsWith('\r\n'))throw Error('Check BOM, CRLF, final newline and trailing whitespace');console.log('format OK')" <file>
  ```

- While developing use the task's focused `--suite=` selector. At an accepted boundary cover both
  complete quick sets in their app environments. A whole `node tests\node-runner.js` is allowed
  only if projected <=450 s; otherwise use MS05r5's disjoint checked suite/full-name manifest,
  retaining every assertion and result. Recovery's final quick-evidence owner is MS05r6b; intermediate steps
  run only their focused checks. No unbounded whole Generator run or selective-green substitute.
  Only an explicitly owned gate permits a heavy tool, manual suite, fixture/hash/example update.
  No blanket `--all`, `--manual`, browser script, `tests.html`, `SG_DEEP=1` or `SG_UPDATE_HASHES`.
- New quick suites use global `describe`, `it`, `expect`, not `SG.test.describe`. Node-only tests use
  `SG.test.node` and skip explicitly in a browser; no `require` in classic fixture scripts.
- No dependency installation is needed. No scratch/temp-system directories: tool artifacts go under
  project-relative `tests/artifacts/difficulty-v3/` or the task's owned evidence directory.
  Delete only intermediates this task created; keep the evidence required for review.
- PowerShell native-command failure does not stop subsequent commands automatically. Check
  `$LASTEXITCODE`; fail dependent work on nonzero. Record an expected GP cell miss separately, not as success.
  Stop only processes this task started, by PID/session ID.

## 4. Decisions taken

**S-OD13, 2026-11-18 21:31:46 (+07:00):** Q1-A and Q2-B are owner-approved,
with GQ ceiling authority delegated **jointly to SA1/Opus and SA2/Astra, not Fable**.
The canonical verbatim owner record and section 2 govern. Stage 1 has finished
file-only and stopped; both analysts approve the exact 135-row manifest, with
the strengthened R monitor, full identity freeze and supervisor/canary review
conditions in the leaf. **S-OD14 records Q3-B at 23:05:53 (+07:00):** one recovery
opportunity only after prior joint diagnosis/committed case authorization, separate
counters and preserved traces. The owner-answer gate is satisfied; final convergence
confirmation and explicit staged releases remain. All non-GQ ceilings and
qualification predicates are unchanged.

No implementer chooses an alternative from the original reports.

| Question IDs | Accepted decision |
|---|---|
| SA2-Q-S01; SA1-Q-S2 | VeryEasy singles tier is vacuous with null floor; Easy is not exempt |
| SA1-Q-S7; SA2-Q-S02 | Requiredness derived from complete canonical ratings after prefix invariant; reference `certifyFloor` uses inherited budget; failures never mean stuck |
| SA2-Q-S03; SA1-Q-S4 | Owner: raw-band target through guided dig, refinement and local search; no post-exact polishing; report every cell's hit loss |
| SA1-Q-S1; SA2-Q-S04 | Owner: measure C=4/6, more exact hits over 36 requests wins, 6 on tie; Nishio depth 1, deep default 2, explicit 3 only |
| SA2-Q-S12 | Compare 64/128/256/none on six cells; smallest cap with no per-cell hit loss and a strict median-work reduction, otherwise none |
| SA2-Q-S05 | R10 starting limits; one evidenced own-limit adjustment in introducing task; freeze with v3 at MS17 |
| SA2-Q-S08 | R10 cost table B; ALS group `chain`; fixed rating priors and bands, with only Remote Pairs' prior superseded by RP-01/S-OD9 (116/350/35). Preserve the original answer and append its supersession. |
| SA2-Q-S06; SA1-Q-S3 | Both approximate/shallow warnings and `tune.shallow`; exactness shared by all consumers |
| SA2-Q-S07; SA1-Q-S6 | Rating/cache 3, history store 1; entry ratingVersion, truthful earlier-version note; no floor in exports |
| SA2-Q-S09 | Existing cageCombo covers both interactions; quick regressions, no cageLocked |
| SA2-Q-S10 | Preserve v2 history, add v3 expectations and explain reclassification; no weight fitting to labels |
| SA2-Q-S11 | Bounded curated real help examples; stop/report if a required example cannot be obtained |
| SA1-Q-S5 | Final qualification governs offers, with S-OD7's later owner-directed withholding of Killer Hard/Expert; no intermediate pruning or weight calibration |
| AUTH-S1 | Live qualification table updated in place, v2 archived first |
| AUTH-S2; PROC-S1 | Baseline/tooling, orders, S1, split chains, all S3, version/final evidence |
| AC01, Parts F/G | Analytic lower bound, null/reason when undefined, defined values unclamped, raw position retained; bounded search is not a global-minimum proof |
| CV6-01 / S-OD1, Part H; superseding disposition CV6-05 / S-OD6 | The guided sign dig was measured and set aside (CV6-05); fallback (b) applies. Q1(b) restores the first-allowed sign pass by proved identity; Q2(a) keeps Normal's 700 ms base and GP rules, with S-AV01's three fixed endings in section 2. No new strategy, IR29 optimization, cap/floor/order/weight/band or qualification change. The target is transported, not consumed, by the sign dig; MS06 edits no `greater-than.js`, uses the keeper view and later local/attemptBest continuation, and never enters inequality refinement. |
| CV6-02 / S-OD2, Part H; historical stop rule superseded | Preserve active b1 and r1-r4 evidence, unchanged R5 selector and private backups. The pause commit is not acceptance. r6b audits the combined bundle, r6c closes CI, then one combined commit. No dark switch, provisional allowance or further checkpoint commit. S-OD3/S-OD4 below replace the former bans on G13 persistence/mega tier changes and performance-only stops. |
| CV6-03 / S-OD3 | 256 retained. G13 persistence at r6a is allowed with its seed 42, Nightmare request and 120 s recorder guard unchanged. Full-attempt mega Nightmare leaves quick coverage (mega16 has only scripted quick stop control); a tool-based deep tier keeps all 14 original calls and every invariant/CV5 relation. Quick retains a real one-attempt mega12 request; SA1 conditions (i)-(iii) apply. |
| CV6-03 / S-OD4 (c1), (c2) | Every offer follows final qualification; bounded fallbacks are misses. One exported defaultMaxAttempts(cellCount) gives 8/4/2 at <=81/82-144/>144. CV6-04 corrects (c2): a stored value equal to the old default 8 without the intent marker is read as default on every board; other stored numbers and marked explicit settings remain. The same-task [MS05r5p legacy-8 fix round](MS05r5p-legacy-8-fix-round.md) completes before r6b, with no engine change or new diagnostic/deep measurement. No interim pruning, browser-budget raise or R5 re-selection. |
| PR-S1 / S-OD4 stop/evidence rule | Only correctness or changing a recorded decision stops for the owner. Performance/availability findings become numbered items with numbers and MS07e/MS18c/MS18d ownership; every task reports them and MS18e audits them. Continue within bounded commands; no new evidence class/tooling task for slow intermediate cells. |
| PR-S1 / S-OD4 review/full-scope rule | All six S3 groups remain. Analyst reviews: remaining MS05, MS05e, MS06b-c2, MS07a-c, MS13a-c, MS15a, MS17b, MS18c; MS08a as template. Orchestrator template/generic-soundness/order checks for the other technique tasks. |
| CV6-03 sub-questions (1)-(3) / S-OD4 | CV3 mega16 Nightmare is not deferred; matching r5m puzzles may be reused with CV3's checks. Implementation: B1 selects the live route for MS05b3 instead. >240 s is an availability item, not a stop. Apply the same authorized contract to mega hell1 at MS07b. r6c owns bounded quick CI before the combined commit; every later suite owner updates its group, and MS18e owns the final PR CI. |
| Q-MS07e-1 / S-OD7 | Owner, 2026-11-15 14:42, `ask_user` and email: Killer Hard (0/14) and Expert (1/14) stay **hidden until later calibration**; no Killer weight recalibration inside v3. MS18c preserves both cells' raw final qualification and separately records the owner-directed withholding, even if a raw cell later qualifies; MS18e audits S-AV05/S-AV06. This narrows the product offer, never offers an unqualified cell or reduces the 135-cell protocol. No interim live-list change is assigned. |
| MS07e section 9 / S-OD8 | Owner, same time/channel, approves the three `pipeline` generation-cost ratios moving to manual `perf`, plus the replay split: classic9 Hell 1 seed 3 stays quick; mega16 Nightmare seed 478576959 and Hell 1 seed 2422420669 move to manual `variants`. Requests/seeds/assertions/limits remain byte for byte; the loss of their PR-CI coverage is accepted. Dispatch MS07f after MS08a and before MS08b; update r6c CI manifest/group metadata, both developer guides/design and measured before/after per-app quick cost. No other tier move, asserted saving or five-minute guarantee is approved. |
| Q-MS07e-2 / SA2 implementation ruling | No projection-rule change or speculative one-off launch; the six named unexecuted cells and their projections in section 2 route to MS18c. Final-source bounds, including the serial second round, must credibly fit <=450 s under the unchanged 540 s ceiling. No early-stop credit, scheduler fix, changed jobs or new tooling/evidence class is authorized. Incomplete final qualification still cannot be published. |
| RP-01 / S-OD9 | Owner confirmed at 06:23 (+07:00), 2026-11-16: Remote Pairs 116/350/35, between Two-String Kite and Simple Colouring, Hard tier unchanged. Apply MS10a's exact two-scan gate, curated export-text source format and bounded GH fallback; a zero-hit complete gate stops for the owner. GH, IR72 H1, bundle B and SA2-Q-S11 are unchanged. The pack author owns plan/report/task/decision amendments; the developer owns live guides/design updates with the code before the relevant fingerprint freezes. |
| JF-01 / S-OD10 | Owner, Discord, 2026-11-16 22:20 (+07:00), "Chọn A.": MS12/Jellyfish only, approve option A exactly (classic9 corpus seed 4242, indices 0-19,999 ascending, <=64 sources/chunk, <=400 hints, eight-minute tool deadline, credible <=450 s admission, 540 s process ceiling, locks/15 s gaps; reuse/materialize once and account for construction). Stop at the first verified-source chunk and complete all 37 GH/quick/CI gates; otherwise report ranges and stop at the bound. No option B, budget reset, changed GH contract or permission for another task. The unchanged question and adjacent owner answer are in `clarifications-resolved.md`; S-AV35 tracks completion/audit. |
| IR72 I1/G/J / CI projection maintenance, SA2 2026-11-16 | From MS10a, tasks owning quick verification may raise manifest timing projections without adding a suite: `max(old, 10 * ceil(1.5 * measured process seconds / 10))`, with source-qualified before/after evidence and the section 2 guards. A projection miss alone is not a stop. Each shard stays <=450 s; unchanged CI arithmetic must fit actual workflow limits (Generator 1800 s, Player 900 s). No tier/membership, factor, overhead, timeout or test-contract change; no change to IR12/GQ/GP planning rules. MS18e audits final projections and actual remote durations. |
| IR72 inactive source-identity closure, SA2 at MS13a | "No update" means no changed canonical output, not stale-source E acceptance. Starting MS13a, record each complete E family whose required identity changed and merge-check without fixture writes; retain/check still-current families. MS13a needs all five wires, fourteen analyses and 520 hashes; MS13b is conditional on its actual identities; MS13c owns activation E. This overrides conflicting no-heavy wording for E provenance only, adds no GP/GQ/GS/discovery, and never authorizes hash retagging, partial-corpus substitution or unexplained output updates. See section 7. |
| GC-01 / S-OD11 — resolved; MS14a scheduling retained | Owner, Discord, 2026-11-17 04:30 (+07:00): "GC-01: chọn A." The unchanged question and adjacent answer are archived. IR54 is preserved: bounded grouped attempt first, short-only complete-singleton fallback on an explicit local work/node cap, same parent budget/window and no local fallback work cap; no fallback for parent exhaustion/errors/cancellation/completed negatives/window rejection. The fallback proves only its singleton-graph minimum; long stays bounded with no second route. Record both phases and total cost; R10's once-only new-limit rule is not permission to change this policy. The GC-01 policy hold is lifted, but MS13c still starts only after accepted/committed MS14a; MS14b requires both. MS14a's running brief/scope and its own complete inactive E/GH/quick/CI closure stay unchanged. Order remains MS14a -> MS13c -> MS14b -> MS14c; S-AV36 remains open for measured cost/availability and final audit. |
| JF-02 / S-OD12 — resolved, A + S0 | Owner, Discord, 2026-11-17 13:46 (+07:00): "tôi chọn A và S0". Keep MS13c's verified `testkit-4242-8657` source/snapshot and all records (10,000 puzzles materialized, 0-8,703 replayed in 136 chunks), with explicit disclosure that acquisition was unauthorized when performed. This is separate retrospective approval for MS13c, not inheritance of S-OD10. S0 retains case-by-case permission; S1 is not approved. No further scan, new quota, budget reset or gate waiver. The original question and adjacent answer are archived unchanged. Complete the reviewed fixes and final GH/both quick sets/CI before acceptance/commit and later dispatch. S-AV38 remains a numerical cost item; S-OD12 waives none of its final obligations. |
| MS13c final-report rulings, SA2 with SA1 review, 2026-11-17 | Q1's explicitly constructed unit vectors and Q2's two real multi-move cases are accepted as reviewed, with honest premise/coverage descriptions. Q3 retains 50,000/4,096 with both IDs' coverage/cost trade-off, not E-rerun inconvenience as its rationale. Q4 is S-AV38 plus the S-AV04 re-measurement; inform the owner, no performance-only policy stop. SA1 resolves the four remaining mutants as equivalent (73 detected + 8 equivalent); no mutant S-AV item or new test is required. Correct the A3 census/checker claim, GP classifications/projections, protocol record and living docs as specified in MS13c. S-OD12 now selects A + S0: retain the Jellyfish snapshot, disclose the initially unauthorized scan, and complete one fingerprinted doc/fix pass followed by final GH/both quick sets/CI. No further scan, standing S1 rule, S-OD11 change or final measurement waiver. |
| FS22 implementation disposition, updated by S-OD3/S-OD4 and B1 | MS05r2 absorbed consumers; b3 follows r5p/r5/r5m under the approved contracts, not passed original mega limits. Lazy per-level I5/CV3 remains; the mega CV3 cells run live under B1 with their own checks. Syntax is not GD evidence. MS14c stays corpus-free; final I5 remains per level. |
| SA1 IR02 / IR04, implementation review 2026-11-14 | Binding B1 is copied into MS05b3: live mega CV3, no record provider/replay entry point/reuse code or edits to the deep tool/fixture/SOURCE_FILES. r6a/r6b check both currentMatches hashes explicitly; retain only a proved exact-diff non-generation-file mismatch, else execute their named MEGA-REFRESH step. Original hashes/records remain untouched. |
| FS12-FS16 / FS20 implementation dispositions; CV6-05 sign handoff | `acceptReveal` receives current/next exact flags. A cells guided winner refused by the apply table ends that pass; local acceptance retains `next.score < spec.max`. MS06c1 transports null/inert metadata with no production draw; MS06c2 draws once and activates all candidate-comparing stages. The real `signs` strategy receives but ignores `options.target`; `digger-target` proves its originating target reaches the selected result. No partial intermediate policy, sign comparator, new RNG stream or post-exact polishing. |
| FS17-FS19 implementation dispositions | Supplemental soundness inputs concatenate the complete existing seeded random population. MS07b keeps coupled registration/help and records a two-request non-vacuous Hell 1 pilot; MS07c owns the cutoff CLI/GP-cost and repeats the pilot only if C changes. GD/GQ planning uses these actuals without extending the 540-second ceiling. |
| FS23, updated by S-OD4 | MS18d projects every final offered GP cell from GQ raw means before timing. A >450-second projection stops that command and becomes a named final-cost item; continue safe cells. No automatic tooling task, unsupported seed split, merged p95s, fewer requests or changed cold/warm protocol. Report an incomplete matrix honestly. |
| FS25/FS26, updated by S-OD4 | Anchor I5/CV6 filters with `> `; selected total 1. b3 preserves 2/3 requests and eager aggregate API. No mega16 Nightmare deferral: use the approved per-request deep route when needed. Other unsafe commands are recorded with full populations as named items, not passed coverage or owner stops solely for time. |
| FS27/FS28, updated by S-OD3/S-OD4 | r4's original-limit preflights are retained failures answered by CV6-03. r6a persists G13 first, rechecks approved replacement contracts and records 520/5/14 E/pins; r6b audits full quick/GD/deep evidence; r6c closes CI inside the combined commit. |
| FS29/FS31 | r3 owns work-schema and explicit/implicit no-allowance premises, running every MS05b1 pipeline case. r4 repeats widened locked checks, returns premise fixes to r3 and records only genuine data pins. r6a owns that reviewed list; no contractual failure is reclassified to pass. |
| FS30 | r6b reports actual per-app standing quick time/shard counts for acknowledgement with acceptance; correct AGENTS/guides before the final fingerprint, fill the separate cost report afterwards. A slower total alone is not a new stop; individual guards remain unchanged. |
| FS32/FS33 | Backup-recipe correction belongs solely to the orchestrator in clarifications; developers perform no backup/ref action. r1 stays frozen. Its evidence/protocol are immutable, while r3 is expressly allowed to extend owned work copying and record a new driver hash; no r1 addendum required. |
| Confirmed status rows / Part D | Oracle tierUsed is a proxy; counter reset per call; task-owned expectation refreshes; all 16 errata accepted |

Tool CLI/ledger names below are implementation contracts of this pack, not new scoring policies.
The first three groups keep production generation, scoring, orders, support lists and stored data unchanged.

## 5. Business traceability

| Need | Tasks / resolutions | Acceptance focus |
|---|---|---|
| Hard and other nonvacuous levels need their tier | MS01, MS04, MS05a, retained b1, MS05r2/r6a/r6b; R1-R4 | canonical/reference agreement, keeper and wire exactness |
| Continued search has a justified cost | MS05r1/r3/r4/r5p/r6a/r6b, MS18b; R5/R23/S-OD4 | measured local work, fixed selector, size-dependent attempts and approved-contract evidence |
| Activation has a reachable but honest acceptance boundary | MS05r1-r5m, MS05b3, MS05r6a-c; S-OD2-S-OD4 | preserved failures, owned pins, complete bounded quick/E/deep accounting, per-app cost, CI and one combined commit |
| Greater-Than Normal remains honest without hiding CV6 | MS05e closed/set aside, MS06a/b/c, MS07e, MS18c/d/e; CV6-05 / S-OD6 | rejected candidate and identity proof preserved; unchanged contracts, no interim pruning, three fixed S-AV01 endings |
| Scores are sought across the band | MS02, MS06a/b/c1/c2/d, MS18a; R6/R7/R23, CV6-05 | one target through comparing stages; sign dig transports/ignores it, later local continuation uses it; both positions and isolated/matched comparisons, including a valid null Greater-Than effect |
| Honest chain/depth labels | MS07a/b/c; R9/R10 | shortest represented proof, enforced windows, measured C |
| Named techniques replace generic proofs | MS08a/b/c, MS09a/b, MS10a/b, MS11a/b/c, MS12, MS13a/b/c, MS14a/b/c, MS15a/b, MS16; R11-R19 | each algorithm, soundness/coverage, full B |
| Old puzzles/claims/history stay honest | MS04 and introducing tasks, MS17a/b; R20/R22 | separate references, cache 3, history 1 and compatible imports |
| Availability/cost are measured and published honestly | MS07d/e, MS18a/b/c/d/e; R24 | complete matrices, errors retained, no intermediate pruning |
| Owner-approved availability/tier decisions remain explicit | MS07f, MS18c/e; S-OD7/S-OD8 | Killer Hard/Expert hidden until later calibration; preserved slow checks, accepted CI loss and measured before/after quick costs |
| Every changed output is reproducible | MS03a/b/c/d and each E owner; R21 | bounded recorders, fixed manifests, explicit differences |
| Manual contract changes are tested early and in bounded populations | MS05r2, MS05b3, MS05r6b, MS05e, MS18e; FS22/FS25/FS26/S-OD2 | same seeds/counts, boundary-prefixed filters, post-selection I5/CV3/refusals, complete closure then final current-source rerun |

### Plan-to-executable-task traceability

| Plan / resolutions | Executable owners | Clarification authority |
|---|---|---|
| S0.1 / R1/R2/R20 | MS01, MS04, MS17b | SA2-Q-S01/S02/S10, SA1-Q-S2/S7 |
| S0.2 / R23 | MS02, MS05r1/r3/r4, MS06a/d, MS18a | PROC-S1, AC01, S-OD2 |
| S2.1 / R8/R21 | MS03a/b/c/d, MS04 | AUTH-S2, PROC-S1 |
| S1.1 / R3-R5 | MS05a, retained b1, MS05r1-r5m, MS05b3, MS05r6a-c | S-OD2 absorbs b2/c/d; S-OD3/S-OD4 retain 256 and add the size default/approved validation contracts |
| Recovery validation / R21 | MS05r4/r5/r5m/r6a-c, post-selection MS05b3 | S-OD3/S-OD4: old failures preserved, 520/5/14 E, full quick/deep/GD accounting, measured per-app cost and bounded CI |
| Measured Greater-Than experiment and restored sign-target route | MS05e closed/set aside; tested transport MS06b/c1/c2; item review MS07e and final disposition MS18c/d/e | CV6-01 / S-OD1, superseded for the pool/handoff by CV6-05 / S-OD6 |
| S1.2 / R6/R7 | MS06a/b/c1/c2/d | SA1-Q-S4, SA2-Q-S03, AC01; FS12-FS16/FS20 |
| S2.2 / R9/R10 | MS07a/b/c/d/e | SA1-Q-S1, SA2-Q-S04, PROC-S1 |
| Approved quick-tier follow-up | MS07f after MS08a; final audit/checks MS18e | S-OD8, MS07e report section 9; no assertion/request change |
| S3 group 1 / R11 | MS08a/b/c | confirmed R10 costs/limits, Part D |
| S3 group 2 / R12 | MS09a/b | SA2-Q-S05/S08/S11 |
| S3 group 3 / R13/R14 | MS10a/b, MS11a/b/c | SA2-Q-S05/S08/S11 |
| S3 group 4 / R15/R16 | MS12, MS13a/b/c | Part D grouped-proof correction |
| S3 group 5 / R17 | MS14a/b/c | SA2-Q-S09/S11 |
| S3 group 6 / R18/R19 | MS15a/b, MS16 | SA2-Q-S05/S08/S11 |
| S2.3 / R20/R22 | MS17a/b | SA1-Q-S6, SA2-Q-S07/S10 |
| Final evidence / R5/R9/R23/R24 | MS18a/b/c/d/e | AUTH-S1, SA1-Q-S5, AC01 |

## 6. Technical acceptance — every task

- Its B/T acceptance IDs have truthful evidence and the full intended quick coverage is accounted for.
  Correctness assertions must pass. Any S-OD4 performance/availability outcome remains a named failed
  or incomplete item, never a green claim. Intermediate recovery steps supply focused step evidence;
  r6b owns the combined audit and r6c CI closure, not the failed/interim b1 checkpoint.
- Every executable file owns its own MSnn-Bxx/MSnn-Txx tables; none is optional. Inactive preparation
  tasks additionally prove no production activation/output change. Evidence-only tasks change no code;
  the orchestrator verifies their unchanged quick baseline instead of manufacturing new unit tests.
- `ui-contract`, `purity`, `i18n` and `help` remain green; no source/fixture/suite list drift.
- A new technique ships with its weight, registration, exact Findings, EN+VI strings in both apps,
  two positive and one negative unscoped fixtures (scoped equivalents where appropriate), and a real help example.
- Soundness, cancellation, uniqueness and canonical-rating preconditions are not weakened to improve hit rate.
- Source hashes, fixed seeds, request counts and failures are recorded. Expected-output changes are deliberate
  and belong to this task; never bulk-refresh data to hide an unexplained failure.
- No production output changes in MS01-MS03. MS04 onward refreshes affected fixtures in the owning task.
- Rating version 3 is released atomically after MS17/MS18; intermediate development is not deployed.
- All documentation, file-format and Git/ownership rules of sections 2-3 hold.
- A hidden final level is a valid qualification outcome, not permission to fake exactness.
- Apply section 2's S-OD4 stop/review/item rules. The item list is mandatory in every final reply;
  after r6c a suite-adding task also accounts for its CI group.

## 7. Gates and evidence

### Scheduling and recording

**Never two heavy/timing runs at once on this machine.** Pentomino's separate session
formerly overlapped this project; the owner confirmed it fully stopped at 16:42 (+07:00)
on 2026-11-18 (section 2). Resource availability does not waive this protocol.
Before a heavy gate, announce to the orchestrator: task/gate, exact shard/cases, expected duration and
output paths. Wait for the shared-machine slot before starting. Release the slot on completion/failure.
No overlapping quick runs inside this checkout either.

### Final-gate quiet-machine precondition — MS18a-MS18d

GS, the R5/C rechecks, GQ and GP are timed measurements. The owner's resource-release
statement resolves the known Pentomino contention; **do not ask the owner to pause it again**.
Still check readiness before **each timed cell or authorized shard**, not once per matrix:

**MS18a-only amendment, Q1 (2026-11-18):** follow the detailed ruling in
`MS18a-final-matched-soak.md`. The raw numerical screen below is still recorded, but
its failure alone does not block GS when the named-host admission conditions hold.
Keep strict-screen `ready` and policy-specific `admitted` separate; no whole-host-tree
exclusion or CPU subtraction. Timings are explicitly **not strict-quiet-machine**.
This is not a permanent replacement of the readiness contract for MS18b/c/d; settle
MS18a-Q1-HOST in the next dispatch preparation rather than inheriting a waiver.
**MS18a-Q2** adds only the leaf's bounded fresh-slot re-ask and continuation for an
unstarted additional-consumer CPU hold: one re-ask, >=60 s after release, distinct
records, no third attempt. A second hold stays an unexecuted gap; no service exemption,
relaxed predicate, repeated payload or complete-matrix claim follows.

**MS18b dispatch renewal at `484b8a52`:** its own brief explicitly authorizes the same
host-active admission and bounded re-ask behavior under **`MS18b-host-active`**, with
experiment-aware identities and fresh task records. This is a new task-scoped grant,
not retroactive extension of MS18a's ruling. Read the MS18b leaf before running; the
raw numerical screen below remains recorded, not silently turned into a quiet pass.
The later GQ/GP readiness contract still needs its own dispatch disposition.

**MS18c / S-OD13:** Q1-A explicitly approves **`MS18c-GQ-host-active`**, raw p95
binding. Stage 1 has stopped and all 135 Stage 2 bindings are approved.
Stage 3 needs the unchanged committed manifest, final confirmation and explicit
staged releases/reviews (supervisor, then one original-cell canary); **S-OD14**
has satisfied Q3's owner-answer gate but pre-approves no individual recovery.
The approved detached GQ supervisor owns admission/gaps/T/O and job-contained workers;
agent replacement adopts it rather than relaunching. The leaf's GQ-window whitelist,
monitor and immutable-manifest checks bind. The shared helper below remains unchanged
at 540 s for non-GQ work; no global timeout or product-budget increase follows.

- Obtain the normal shared slot/mutex and establish that no foreign timing-lock holder or
  known foreign CPU-heavy job is active. Never delete another lock, kill another session's
  process or infer permission to ignore an occupied/stale lock from the owner statement.
- If a foreign timed job has just released its lock, allow at least **15 s** after the
  observed release before sampling. Record any such release/wait; unknown historical
  release times remain unknown, not invented timestamps.
- Immediately before the payload, **while our lock is held**, take **five one-second host
  CPU intervals** from real cumulative CPU counters (not Windows `os.loadavg`). Record CPU
  count, interval busy-core equivalents, mean/max and timestamps. Busy cores = logical
  CPU count times the interval's aggregate non-idle fraction. The readiness screen is
  **mean <=0.5 busy logical cores and max <=1.0**, with no known foreign heavy job.
  This is an operational noise screen, not a puzzle/performance budget or proof of isolation.
  Record unavailable/invalid counters as not ready, never as idle. Do not change the screen
  after inspecting a cell's result.
- A task-owned bounded read-only launch wrapper may make these observations under
  `Invoke-Dv3Node` before launching the original CLI payload. The shared helper/cleanup
  contract stays unchanged. No generation warmup, probe, scheduler change, process-priority
  change or permanent measurement-tool edit is assigned. Include wrapper/readiness time
  in the whole-command/per-item projection and 540 s ceiling when it is inside that command.
  Preserve the 15 s gap between lock acquisitions and the tool's original request clocks.
- If admission fails (for MS18a/MS18b, the explicitly authorized host-active admission
  rather than the raw numerical screen alone), **do not start the timed payload**;
  record the reason, release our
  slot and inform the orchestrator. It is an environmental hold/unstarted command, not a
  slow puzzle, availability miss or owner policy question. Continue permitted non-timed
  work; obtain a new planned slot/check rather than polling indefinitely under our mutex.
  A check taken before a lock wait is stale and must be repeated after acquisition.
- Keep readiness/lock waits separately from generation, diagnostics and process time.
  If foreign contention is actually observed during a measurement, retain the entire raw
  run and mark its timing compromised; report the evidence defect for an assigned repeat
  of the affected whole cell/shard. Do not silently drop slow requests, normalize times,
  retry until fast, or replace a legitimate performance miss without evidence of contention.

Use the existing task evidence/transcripts for these observations; they are execution
metadata, not a new slow-cell evidence class or an excuse to alter counts, seeds, guards,
cold/warm semantics or GQ jobs 4 / GP jobs 1. Historical evidence gets no retroactive
quiet label: MS02 recorded concurrent Pentomino quick tests, and MS17b's lock waits alone
neither prove nor disprove interference during its payloads.

### Shared-machine lock protocol (possibly >10-second work, including unknown generation projections)

The orchestrator's slot and the file locks are both required. Wait until
`$env:TEMP\dv3-timing.lock` is absent, create `$env:TEMP\dv3-sudoku.lock` exclusively, then recheck
the other lock before launching. Never delete another task's lock. A stale/occupied lock is
reported to the orchestrator, not guessed away. Only mutex files use this coordinator location;
scripts, browser profiles, logs and measurement artifacts remain in the project.

Fairness (orchestrator, 2026-11-13, after MS05r1's lock starvation): a loop of locked runs in either repository
leaves at least 15 seconds between releasing its lock and taking it again, so that the other repository's
5-second poll can take the slot. New helper copies wait up to 20 minutes for a timing slot: a Pentomino run can
last 590 seconds, too close to the former 10-minute wait. Only the acquisition wait changes; the 540-second
Node limit and the 15-second gap stay unchanged. MS05r4's dispatched helper copy remains frozen.

**IR07 clarification (SA1, 2026-11-14):**

> Without the lock, run only commands known to be short: registration-only listings (`--list-tests`),
> `--reconcile`, parity or plan scripts that generate nothing, and commands measured under 10 s on the
> same source. A command that generates puzzles and whose projection is above 10 s, or unknown, runs
> under `Invoke-Dv3Node` from the start. A kill timer is no exemption: no unlocked trial runs.

Apply this to the complete command, including setup/registration, and to inline `node -e` generation
as well. A stopped ten-second probe is not a completed short-command measurement. The examples above
are not flag-based exemptions for work whose short duration is unproved.
**Later tasks must not reuse MS05b3's unlocked-trial path** in
`generator/tests/artifacts/difficulty-v3/MS05b3/run-cells.ps1:72-82,153-171`. A task-owned sequencer
must choose the locked route before starting any above-10-second or unknown generation command;
it must not try unlocked first and escalate only after a timeout.

**Recorded lock-protocol incident — MS05b3 / IR07, 2026-11-14 03:09-06:12 (+07:00).**
134 cells finished unlocked (224.5 s of process time); another 25 unlocked attempts were stopped
at ten seconds and repeated under the lock. Of the resulting 159 unlocked windows (474.5 s), 112
overlapped Pentomino's MP12b1: **351.3 s (about 351 s)** across 22 cases. This was a deviation, not an authorized
short-command exception. Source: `docs/difficulty-v3/claude-opus-5.5/10-review-of-recovery-steps.md`
sections 7.2-7.3, based on the two projects' invocation logs.

SA1 found that the correctness/availability evidence stands; stopped attempts supplied no accepted
results and were completed again under the lock. Preserve the actual pass/failure statuses and the
`slot: none` labels. The unlocked times are descriptive, **not slot-protected measurements**:
MS07e, MS18c, MS18d and MS18e must not use them as protected measurements. Do not rerun or relabel
the evidence merely to erase this incident. Pentomino's follow-up remains with its own evidence owner.

**IR12 — compound drivers (SA1, 2026-11-14).** A compound is one locked `Invoke-Dv3Node`
invocation running several independent items serially. A task-owned driver may be used or reused only if:

- Every item carries its own finite projection: a measurement on the same source, otherwise a stated
  conservative bound for that complete item, including process startup and registration.
- Before starting each item, the driver requires
  `elapsedSeconds + max(item.projectionSeconds, genericFloorSeconds) <= 450`.
  Elapsed time is the actual time since the compound started, not the sum of earlier projections.
- An item whose own projection exceeds 450 s runs alone, never inside a compound. This does not
  waive its task's launch/request limits or the helper's unchanged 540 s process-tree ceiling.
  An unknown, missing or non-finite projection is not zero or the generic floor and cannot enter a compound.
- Items are independent; each has its own results or ledger, transcript, actual duration and exit code.
  Do not compound a producer/publication step with a consumer that depends on its output.
- The driver stops at the first unexpected exit. Any expected nonzero exit is declared per item and
  keeps its actual failure/status; no automatic retries or skipped failure presented as success.

Record the generic floor and its rule, but never let it replace an item's projection. MS05r6a's
driver used `max(60 s, twice the slowest child so far)`; a known 139.1 s `player` item must not be
admitted on 60 s merely because it has not yet run in this compound. If the next item does not fit,
leave it explicitly unstarted for a later invocation; do not extend 450 s to finish the list.
The 540 s helper limit covers driver and children together, and the 15 s fairness gap still applies
between lock acquisitions. MS05r6a's completed compounds/evidence remain valid; this rule governs reuse.

Use this PowerShell helper in the current app directory. It preserves arguments without shell
re-quoting, limits each Node invocation to 540 seconds, and cleans up only its own mutex/processes.
`-AllowExit1` is solely for an explicitly recorded expected failure (for example CV6 or an S-OD4
availability assertion); it does not make that gate pass. A nonzero exit stops actions that require
that result; classify it under S-OD4 before continuing independent task work. Never publish from
corrupt/incomplete records or suppress the actual exit code.
Define it in the **same PowerShell invocation** as the command: shell functions do not persist
between tool calls. Alternatively save it verbatim in the task's project-relative artifact folder
and dot-source that owned script in each call. Do not assume a helper installed elsewhere.

```powershell
function Invoke-Dv3Node {
  param([string]$Task, [string[]]$NodeArgs, [switch]$AllowExit1)
  $other = Join-Path $env:TEMP 'dv3-timing.lock'
  $mine = Join-Path $env:TEMP 'dv3-sudoku.lock'
  $until = (Get-Date).AddMinutes(20)
  while ((Test-Path $other) -or (Test-Path $mine)) {
    if ((Get-Date) -ge $until) { throw 'No timing slot; report to the orchestrator' }
    Start-Sleep -Seconds 5
  }
  $lock = $null
  $p = $null
  try {
    $lock = [IO.File]::Open($mine, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $bytes = [Text.Encoding]::UTF8.GetBytes("$PID|$Task|$([DateTime]::UtcNow.ToString('o'))")
    $lock.Write($bytes, 0, $bytes.Length)
    $lock.Flush()
    if (Test-Path $other) { throw 'Timing-slot race; no command started' }
    $si = [Diagnostics.ProcessStartInfo]::new('node')
    $si.UseShellExecute = $false
    $si.WorkingDirectory = (Get-Location).Path
    foreach ($arg in $NodeArgs) { $si.ArgumentList.Add($arg) }
    $start = Get-Date
    $p = [Diagnostics.Process]::Start($si)
    if (-not $p.WaitForExit(540000)) { throw '540-second limit reached; record the timeout' }
    $global:LASTEXITCODE = $p.ExitCode
    Write-Host "$Task exit=$($p.ExitCode) seconds=$([math]::Round(((Get-Date)-$start).TotalSeconds,3))"
    if ($p.ExitCode -ne 0 -and -not ($AllowExit1 -and $p.ExitCode -eq 1)) {
      throw "$Task command failed: $($p.ExitCode)"
    }
  } finally {
    if ($p -and -not $p.HasExited) {
      $all = Get-CimInstance Win32_Process
      $owned = [Collections.Generic.List[int]]::new()
      $owned.Add($p.Id)
      for ($i = 0; $i -lt $owned.Count; $i++) {
        foreach ($child in ($all | Where-Object ParentProcessId -EQ $owned[$i])) {
          if (-not $owned.Contains([int]$child.ProcessId)) { $owned.Add([int]$child.ProcessId) }
        }
      }
      for ($i = $owned.Count - 1; $i -ge 0; $i--) {
        Stop-Process -Id $owned[$i] -Force -ErrorAction SilentlyContinue
      }
    }
    if ($lock) {
      $lock.Dispose()
      Remove-Item -LiteralPath $mine -ErrorAction Stop
    }
  }
}
```

Existing command blocks below/in tasks are the Node argument payload: run them through this helper
when they may exceed 10 seconds. No agent starts a competing quick set during another task's slot.
Record a forcibly stopped command as a failure/incomplete outcome; never reuse its partial evidence.

Run each bounded command attached and monitored. Enforce the 540-second process ceiling;
do not simply rerun it or discard slow requests. Complete larger matrices through bounded shards.
A missing outcome is not a pass. Raw evidence records command, code/source identity, dirty state,
Node/machine, worker count, config, seeds, counts, duration, exit code and differences.
Use task-relative evidence directories, for example `docs/difficulty-v3/evidence/MS07/`.

Commands below run from `generator/` except GH (from `player/`). Replace task/variant/level/file
placeholders explicitly. Execute one bounded shard at a time, not an unbounded whole-matrix shell loop.
New flags are available only after the indicated tooling prerequisite is accepted, or its
S-OD2 **step evidence complete** handoff is reviewed for use inside the retained recovery candidate.

### Source-aware inactive E closure — IR72, SA2 ruling at MS13a

Starting with MS13a, IR72's inactive-task "no update" means no changed canonical output, not
permission to reuse ledgers under a different required source identity. This reconciles the
older inactive briefs' "no heavy gate" wording with the later IR72 closure rule; it adds only
the existing E recording/check route, no qualification, GP, soak, discovery or new evidence class.

- If an E family's required identities are unchanged, retain its accepted ledgers and run its
  current-source merge-check. Do not regenerate merely for a new task ID.
- If an identity differs, record that **whole affected family** on final source (all five wires,
  all fourteen analyses and/or all 520 hashes, as applicable), then merge-check against the
  unchanged published fixtures. For MS13a all three identities differ, so it owns full E
  recording/check-only. Verify fresh wires against the unchanged wire before analysis.
- A source-identity refusal is not a green check. Do not retag records, omit fingerprint inputs,
  bypass the identity check, substitute a sampled subset for a complete family, or treat a
  differential/GH check as current-source E. Keep those complementary inactivity proofs too.
- Inactive tasks may not write changed canonical E fixtures or run `--update-hashes`. Unexpected
  output differences require investigation under the inactivity contract, not pin refreshes.
  Final acceptance requires all three merge-checks on current source, complete GH `--check`,
  both quick sets and CI. GH check-only does not authorize discovery or catalogue writes.
- Announce/coordinate added recorder work and use the existing E/IR12 recipe, per-item source-
  qualified projections, <=450 s compound admission, <=540 s process ceiling and >=15 s gaps.
  MS07a's earlier no-E acceptance remains historical; it predates IR72. MS13b follows this rule
  for identities actually changed by its consumer edits; MS13c still owns full activation E.

This rule supersedes conflicting later inactive/test-only brief wording solely for E provenance.
It does not broaden output-change, finder-activation or fixture-update authority.

### Gate ownership

| Gate | Owner | Required command / result |
|---|---|---|
| GS-before | MS02 | `node tests\soak.js --variant=<id> --level=<level> --count=12 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\MS02\<id>-<level>.json`; all 17 cells below |
| GG | MS04, MS05r6a, MS06c2, MS07b/c, MS08a/b/c, MS09a/b, MS10a/b, MS11a/b/c, MS12, MS13c, MS14b, MS15b, MS16, MS17b; source-changed inactive tasks under the rule above | Complete E 520-key recording; inspect intended differences before write/check. Inactive closure: fresh ledgers/check-only, no canonical updates. MS17b also needs fresh 520-key ledgers because the version literal changes the source identity; serialized puzzle hashes exclude the rating/version, so values are expected unchanged and no hash write is authorized merely by the bump. Recovery always records final-source E; b1/r3/r4 has no independent GG acceptance. Later selectors refresh if the default changes. Check-only reuse: MS05r6b, MS06c1, MS07e, MS17a (current-identity MS16 ledgers); MS18d owns final-source closure. |
| GR | Same behavior owners, plus MS05a, MS06c1, MS17a and MS17b; source-changed inactive tasks under the rule above | After r6a: complete E five-wire/fourteen-analysis record/merge/write/check; G09-G13 wires, G01-G14 analyses. Inactive closure records/checks affected complete families without canonical updates. MS17a's UI edit needed fresh 5+14 records, values unchanged. MS17b expects five wire producer-version changes 2 -> 3: explain/publish/check the complete family before analyses. Analyses are freshly recorded but expected unchanged; no version field is projected. Earlier four-wire evidence stays historical. r6b checks current merges. MS06c1 permits only target metadata, not changed puzzles/ratings/old operations. |
| GH | MS04 if affected; MS07b/c, all introducing/enhanced-proof tasks through MS16; inactive check-only closure under IR72; MS17a/MS17b all-40 check-only | B bounded real sources, E write/check for every affected ID. Inactive kernels/tests-only tasks run complete GH --check, with no discovery or write; MS14c changes no finder. MS17a/MS17b retain the catalogue and own only their current all-ID checks, no acquisition or refresh. |
| GQ-first | MS07e, merger prepared in MS07d | All Q135 cells, `--jobs=4`, per-cell JSON/markdown, checked complete merge; checkpoint-only report, no support changes. |
| GD | MS04; MS05r6b; MS07e; MS17b; MS18e | Bounded difficulty coverage below; historical MS04 also ran killer/greater-than. MS05r2/MS07d use only fast fake-worker `--filter="qualification:"`. Post-selection b3 owns early I5/CV3/refusals; r6b closes its named outstanding CV3 list. MS18e owns full final GD; MS14c is corpus-free. MS05e's GD-CV6 experiment is closed/set aside; MS18c's conditional Normal CV6 below supplies the CV6-05 decision before GP. |
| GD-I5/CV3 early | MS05b3 after r5p/r5/r5m; r6b reconciliation | Per-level I5 with `> <level>: <count> puzzles > I5:` (extra-regions includes variant); `> variants: <id> > CV3 <level>:` plus `> variants: <id> > CV3 unsupported:`. Selected total 1, same seeds/counts, jobs 1, locked <=540 s. B1 requires live mega Nightmare CV3, one locked command per cell, with deep occurrence-id references; >240 s is a named availability item. |
| Recovery profiles | MS05r1 | G13, mega12 Nightmare seed 3, mega16 Nightmare seed 3; maxAttempts 1, actual per-attempt work and sample/local stage time; one bounded request/invocation. |
| Recovery non-selecting diagnostics | MS05r4 | The same three requests at all 64/128/256/none, full normal attempts: 12 outcomes outside R5's matrix. Report all four even if none wins; do not change the selector. |
| Recovery original-limit history | MS05r4, retained unchanged | G13 passed 120000 ms; original mega groups failed their 60000 ms guard/6 s or 20 s latency contract. S-OD3/S-OD4 replace that prerequisite; never rewrite those failures as passes. |
| Recovery size diagnostics | MS05r5p | G13 seed 42, mega12/mega16 Nightmare seed 3, once each, current default attempts 2/4/2 and allowance 256; existing diagnostic driver/500 s budget, locked one request per process. No new R5 selection. |
| Recovery mega contract | MS05r5m, reconciled by r6a/r6b | Tool, not a deep `*.test.js` suite; 14 independent default-attempt requests, seeds 1-4 plus CV5 calls 3/3/4 per board, original correctness/relations, 500 s diagnostic budget. Quick replacements have separate membership. No blanket SG_DEEP. |
| Recovery final-source recheck | MS05r6a; r6b revalidates | Persist G13 first; fresh G13 recording still under 120000 ms, complete five wires/fourteen analyses. Check deep identity.currentMatches.sourceHash and .toolHash explicitly. Retain a mismatch only with the exact-diff non-generation-file proof in r6a A/r6b B1; otherwise use MS05r6a-MEGA-REFRESH or MS05r6b-MEGA-REFRESH. No generation just for a new task ID. |
| Recovery focused quick/pin triage | MS05r3, MS05r4; listed repairs MS05r6a | r3's schema/premise checks include all `MS05b1-` pipeline cases. r4 repeats the wider six-suite set and both pipeline filters at the chosen default, under the helper. Premise fixes return to r3; only explained genuine data pins await r6a. No contractual failure becomes a pin. |
| Full quick manifest | MS05r5 tooling; r6b execution; later accepting owners reuse | Registration-only no-options inventory per app; disjoint <=450-second-projected suite/full-name shards, <=540 s/process. Machine-readable results reconcile every key once, same source/Node/factor, zero omissions/new skips. Listing is not executed coverage. |
| Standing quick cost / FS30 | MS05r6b | Per-app measured process-wall sum/max and shard/test counts, fixed source/Node/factor and actual final coverage. Correct AGENTS/guides before freeze; fill report afterwards. If Generator stays above about 5 minutes, MS07e proposes named generation-heavy quick-to-manual moves; no automatic move. |
| CI tiers | MS05r6c; later suite owners; MS18e final | Both workflows run the bounded quick manifest in jobs <=30 minutes, with deep evidence explicitly replaced by the reviewed offline records. No SG_TIME_FACTOR or timeout raise; no silent manual/deep catch-all. |
| GP-cost | MS07c, MS08a/b/c, MS09a/b, MS10a/b, MS11a/b/c, MS12, MS13c, MS14b, MS15b, MS16 | `node tests\pattern-cost.js --ids=<owned-ids> --runs=20 --json=<owned-evidence>`; real positive/negative cases, work/cap/latency records, no timing assertion in quick tests. MS07c owns the split-ID recording moved from MS07b. MS16 owns this cost gate, not a new whole-generation GP campaign; carry MS15b-GP-J/GP-U to the final owners below. |
| GP | MS13c and MS15b affected cells; MS18d entire final offered matrix | `node tests\perf.js --variant=<id> --level=<level> --runs=50 --warmup=0 --seed=7000 --gate`; final aggregate >=90%, all misses visible. Project before launch. Unsafe commands become named cost items, not automatic new tooling tasks; continue other cells without claiming an incomplete matrix passed. |
| GS cap | MS05r4 (absorbed MS05d), repeated MS18b | Six cells x 64/128/256/none, 12 requests each, seed 20260101: 288 primary requests. r4 selected 256; the final changed winner needs the recorded owner decision. Closure diagnostics never become selecting cells. |
| Mega hell1 / final deep | MS07b extends r5m; MS18e final-source closure | MS07b preserves fourteen additional hell1 occurrences/relations under the same quick/deep rule. Final current-source inventory: 28 Nightmare/hell1 occurrences, one per locked request. MS18e's offered mega CV3 cells run live, one locked cell at a time as in B1, with deep occurrence ids only as cross-references; no CV3 record-provider/reuse route, deep generation in CI or blanket per-technique deep rerun. |
| GS-CV6 / GD-CV6 | MS05e, historical experiment closed/set aside | Preserve literal Normal 300-319/7000-7039 and Easy/Hard/Expert 300-319 comparisons, tried pools 4/8/16 and the 18 CV6/I5 selector outcomes. CV6-05 restores the first-allowed pass and keeps the failed candidate's evidence, not its algorithm. No repeat for this answer; subsequent tasks use the restored baseline and their own authorized evidence. |
| GG/GR/GH-CV6 | MS05e, historical experiment closed/set aside | Candidate E and 12 pins stay recorded; the saved patch rebuilds their source. Production fixtures, pins, suite/CI lists and guides return to `f7be90f`; earlier E/quick/GD stand only after the orchestrator's exact-identity proof. Do not mix the rejected candidate with restored expectations or relabel its ledgers. |
| Final Normal GD-CV6 disposition | MS18c, conditional under CV6-05 | If Normal qualifies, use compatible final-source CV6 evidence or collect only `--suite=greater-than --filter="> normal: 20 puzzles > CV6:"` before MS18d timing, with selected total 1, unchanged seeds/count/budget and existing lock/projection rules. This is not full GD or permission to alter an assertion; apply section 2's three endings. MS18e accounts for the final selector under the normal source-identity rules. |
| GS target | MS06a before / MS06d after | All 17 cells before/after MS06c1 transport + atomic MS06c2 activation; retain isolated comparison and report every hit loss. |
| GS window | MS07c, repeated MS18b | Three Nightmare cells x C4/C6, 12 requests each; more exact hits, tie 6. |
| GS Hell 1 pilot | MS07b; MS07c repeats only if default C changes | `node tests\soak.js --variant=classic9 --level=hell1 --from=0 --count=2 --total-count=2 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\<task>\hell1-pilot.json`; exact two-request shard (bare --count=2 runs at least five at HEAD). Jobs 1/no --jobs; 540 s ceiling. Project unchanged 20-request GD/40-request GQ cost; pilot is not selection evidence. |
| GS-after | MS18a | All 17 original cells; current vs old reference-qualified cohorts, not old score-only exactness. |
| GQ-final | MS18c after MS18b (done), S-OD13/S-OD14, file-only preflight, joint Stage 2 binding and explicit release | Q135/jobs 4/default early stop; structural A/T/monitor, raw p95 unchanged; bounded detached supervisor/committed manifest/window. Recovery only by prior joint diagnosis and one-use case authorization; no completed-record rerun, implicit reset or partial publication. |

GD: per-puzzle I5 and `digLevel` correctness contracts must pass; performance/availability failures
are recorded and routed under S-OD4, not repaired by lowering assertions. GQ worker errors or missing replies fail the run; hidden verdicts
do not. The 40/100-request protocol and p95 budgets stay intact.
GP: a scoped cell's exit 1 can be a recorded timing miss, but all cells must still be measured and the
aggregate assessed. A crash/invalid result is not merely a timing miss. Do not silently relax targets.
The final complete-matrix obligation is unchanged. For MS13c's intermediate S-OD4 handoff,
unsafe/unmeasured cells may remain explicitly incomplete as S-AV38 after the full intended
population and genuine projection/unknown basis are reconciled; that is not a complete GP
pass or permission to publish an aggregate from only the completed subset.
GS `--no-gate` suppresses the tool's failure exit, never the recorded invariant failures.

### GD — complete coverage in bounded invocations (FS09)

MS05r6b (absorbed MS05d), MS07e, MS17b and MS18e use the same coverage-preserving procedure; no ceiling above
540 seconds is granted. At the MS05 milestone allow roughly 6-10 minutes **total**, not one command;
later owners re-project from actual per-group measurements, especially after Hell 1 becomes nonvacuous.
MS07b supplies its two-request pilot; use MS07c's replacement if selecting C changed the default.
Run/retain Nightmare and Hell 1 separately early when offered; project the unchanged Hell 1
20-request batch before starting. A >450-second projection stops that command and becomes a named item,
not a ceiling increase or automatic tooling task. Continue other evidence. A two-request pilot is never
substituted for a manual or qualification batch.

Run the Nightmare group first as a retained shard when it is offered. After final qualification
it may be hidden: then start with the first actually offered level. If classic9 offers none,
record that empty generation-group manifest and still run every non-batch group; do not call a
zero-test Nightmare selector a pass.

```powershell
Invoke-Dv3Node -Task <task> -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=time) > nightmare >')
```

`generator/tests/manual/difficulty.test.js`'s `batch(level)` cache is per level. Repeat the selector
for every currently offered classic9 level **not already covered by a retained Nightmare/Hell 1
shard**, once, preserving its original 100-request
count (20 for Hell 1/Hell 2). Do not rerun the full suite afterwards. Also cover every non-batch
top-level group below, one command each with the exact filter prefix `difficulty > ` plus its
name; example:

```powershell
Invoke-Dv3Node -Task <task> -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=difficulty > digger.generate: guarantees')
```

| Non-batch group at the MS05 boundary |
|---|
| `difficulty: levels` |
| `difficulty: spec(level, model) on a 9x9 board` |
| `difficulty: spec on other boards, and difficultySupport` |
| `qualification: tests/qualify.js counts every request (Node only, fake workers)` |
| `difficulty: the clue floor of a variant (clueFloor)` |
| `difficulty: the score of rating v2` |
| `difficulty: the Difficulty Score table (section 5.6)` |
| `difficulty: labelled puzzles (fixtures/rated.js)` |
| `difficulty: removing a clue (the score is not monotone under clue removal, section 5.1)` |
| `digger: technique-bounded oracle` |
| `digger.generate: guarantees` |
| `digger.generate: the full-rating cap of an attempt (section 5.7 (9))` |
| `digger.generate: when the level cannot be reached` |
| `digger.generate: safety net against a technique bug (risk R3)` |

At dispatch inspect the current top-level describes and offered levels, retain their manifest
and match it against the command/result table. A renamed heading uses its current literal name
and records the rename; never accept a zero-test selector or silently omit a new group. The union
must cover the unchanged suite exactly once. Record counts, failures and durations per shard.
If a single unchanged-count group reaches 540 seconds, stop that command, retain its incomplete outcome
and report a named item; do not lower its count, extend the ceiling or restart it blindly.

Per-puzzle I5/digLevel/soundness failures block. An aggregate hit-rate or timing failure remains a
**failed assertion**, with old/new exact counts, timings and source identities. Under S-OD4 it is
routed first to MS07e, finally to MS18c/MS18d, and does not by itself stop the task. Classify exceptions:
a recorded generation timeout is availability; lost/corrupt evidence or a wrong puzzle is correctness.
Never change `BUDGET_MS` without a recorded contract decision or call failed GD green. Release
gates remain unsatisfied until honestly disposed of. CV6-05 leaves Normal's base at 700 ms,
with no skipped/wrapped assertion; its sole conditional final contract decision follows section 2
before MS18d timing. The sign repair was set aside, and S-OD4 still supersedes performance-only stops.

**Variant GD after MS05b3:** lazy access isolates a level; it does not prove that level fits the
time ceiling, nor bound every aggregate test. The harness uses case-insensitive substring
matching. Use `> <level>: <count> puzzles > I5:` for Killer/Jigsaw/Greater-Than/Wordoku and
`> <id> <level>: <count> puzzles > I5:` for extra-regions. CV6 has the same boundary prefix.
Keep `> ` inside the quoted filter value: without it, Easy also matches Very Easy.

CV3 is split into `> variants: <id> > CV3 <level>:` and one
`> variants: <id> > CV3 unsupported:` test per variant. The latter preserves refusal coverage
without building the supported corpus. Level tests retain seeds 1..perLevel (2 for the existing
heavy variants, 3 otherwise), the 240000 ms request guard and every original assertion.
The aggregate CHECKS/sweepVariant API and eager `corpus()` remain unchanged for other callers.
Never use a whole-variant CV3 selector as a bounded level command.

Inventory every test/seed/count and verify the runner summary's selected total **1** and full
test name before recording a completed cell; use `--verbose` to retain passing names in its
transcript. Zero, multiple or skipped tests are not a pass.
Project all CV3 levels before launching: use current source/allowance evidence where available,
label older estimates, and never infer zero cost from missing data or a completed timing bound
from an aborted request. MS05b3 runs after r5p/r5m and does **not** defer mega16 Nightmare: match
its live seeds 1/2 to the deep occurrence ids; mega12's live seeds 1/2/3 follow the same binding B1.
Run each normal CV3 cell in its own locked command, after a selected-total-1 `--list-tests`
preflight, with `-AllowExit1`, `--verbose` and fresh `--results`. Current projections are about
221 s for mega16 and 71 s for mega12 plus registration/checks. Keep every per-puzzle assertion
before the aggregate `exact === 0` failure. Expected "none of N puzzles hit it" outcomes remain
failed availability assertions S-AV03 (0 of 2) and S-AV02 (0 of 3); any other failing assertion is
a correctness stop. A request over 240 s is a named availability item.

First run B1's no-generation `mega-contract.js --reconcile` command (currently under a second;
no lock required) and inspect `identity.currentMatches.sourceHash` and `.toolHash`, not just exit 0.
When both are true, cite the deep records' additional checks; otherwise record the changed files
for r6a/r6b's audit. B3 builds no reuse code and edits neither the tool/fixture nor `SOURCE_FILES`.
Its CV3 manifest labels both cells `generation: live` and names the matching invariant occurrence ids;
live times stay separate from the earlier deep measurements.

r6a/r6b may retain mismatched deep source hashes only with an exact-diff proof that all changed
source files are outside the normalization/generation path and have no effects on it, with the
tool/check/request/default identities unchanged. A proven UI/store-only change can qualify;
preserve the raw false match fields and old hashes. Otherwise the named MEGA-REFRESH step generates
the affected coverage, one locked occurrence at a time; a changed common source/tool identity requires
a coherent fourteen-record cohort, not a mixed old/new directory. This exception does not relax
E publication or final quick result identities.

Other unsafe/unexecuted commands stay explicit in `evidence/MS05b3/deferred-cv3.json` with their
full request identities, projections, S-OD4 item IDs and MS07e/MS18c owners. r6b reconciles this list;
no row is a passed deferral, no cap change is promised, and no new tooling class is authorized.

MS18e rebuilds/reconciles the manifest and reruns it for final sources; no inherited deferral is
a final pass. Whole `--filter=I5:` or whole-variant invocations are not substitutes. MS14c only
runs its corpus-free combination-table selector, with no generated Killer corpus.

### E — exact bounded recorder routes (MS03 contracts)

E is the mandatory complete recipe referred to by task files, not permission to stop after their
example first shard. Substitute the owning task ID for `<task>`. Create its project-relative
directories before writing. Run one bounded command at a time; all commands here are jobs 1 and
do not accept --jobs. Check every exit code. Typical planning allowance is 1-120 seconds/shard,
5-35 minutes for GR, 10-90 minutes for full E; actual durations and incomplete outcomes are recorded.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Do not invoke an unmeasured unbounded full-corpus run merely to reduce command count.

GR wire shard, one of G09-G13 after MS05r6a (G09-G12 only in the historical pre-resume records):

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\<task>\wire\G09.json
```

Complete, inspect, publish and check the five wire records first. **Only then** record analysis
against that published wire; do not make analysis ledgers from the old wire and publish them after
changing it. GR analysis shard, one of G01-G14:

```powershell
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\<task>\analysis\G01.json
```

After every expected key has an outcome, merge/check or intentionally write:

```powershell
node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\<task>\wire --check
node tests\replay-goldens.js --merge=..\docs\difficulty-v3\evidence\<task>\analysis --check
# Only after reviewing the intended differences:
node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\<task>\wire --write
node tests\replay-goldens.js --merge=..\docs\difficulty-v3\evidence\<task>\analysis --write
node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\<task>\wire --check
node tests\replay-goldens.js --merge=..\docs\difficulty-v3\evidence\<task>\analysis --check
```

GG records, one combination and at most five of the fixed seed indexes:

```powershell
node tests\perf.js --hash-key=classic9/hard --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\<task>\hashes\classic9-hard-00.json
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\<task>\hashes --check-hashes
# Intended complete replacement:
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\<task>\hashes --update-hashes
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\<task>\hashes --check-hashes
```

The complete hash manifest is all 26 `perfTools.COMBOS` x all 20 `perfTools.SEEDS` = 520 keys.
A partial check says exactly how many keys it checked; a write/complete merge rejects missing,
duplicate, unexpected or mismatched-source records. No current `--variant`/`--level` claim is made
about old hash modes; MS03d adds the explicit hash selectors.
Hash-corpus requests for a subsequently hidden level are diagnostic only and retain the same keys/seeds;
the helper may temporarily enable that requested level and must restore its support array afterwards.
This never republishes an offered level.

Complete GG manifest (four five-seed shards per cell, from indexes 0/5/10/15; split smaller only
when necessary, retaining all 20 identities and avoiding duplicate completed rows):

| Variant | Levels |
|---|---|
| classic4 | veryEasy |
| classic6 | veryEasy, hard |
| classic9 | veryEasy, easy, normal, hard, expert, master, nightmare |
| mega12 | normal |
| mega16 | easy |
| diagonalX | easy, nightmare |
| hyper | hard |
| jigsaw9 | normal, master |
| killer | easy, hard |
| greaterThan | normal, hard |
| samurai | easy |
| sohei | veryEasy |
| butterfly | normal |
| flower | normal |
| wordoku | normal |

Fixed seeds:1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584,4181,6765,10946.
Wire IDs G09-G13; analysis IDs G01-G14. Read their unchanged request objects from the fixtures;
never replace hidden-level requests with another level. Input/reference history stays unchanged.

GH from Player, after bounded source acquisition in B:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=<affected-ids> --sources=tests\artifacts\difficulty-v3\<task>\sources.json --max-puzzles=16 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=<affected-ids> --sources=tests\artifacts\difficulty-v3\<task>\sources.json --max-puzzles=16 --max-hints=400 --check
```

Use the task's narrower cap 8 where specified; 16 is the multi-ID recipe. Existing IDs' default
curated sources can also be checked with --ids/--max-puzzles/--check, without discovery.
Check mode writes nothing. Source-record mode is not a partial catalogue write. Old unselected IDs
still need to pass the complete Player help suite; acquire/refresh other affected IDs as necessary.

### Q — qualification manifest and protocol

Both checkpoints cover the cross product of these 15 IDs and all 9 global levels:

```text
classic4 classic6 classic9 mega12 mega16 diagonalX hyper jigsaw9
killer greaterThan samurai sohei butterfly flower wordoku
veryEasy easy normal hard expert master nightmare hell1 hell2
```

Use one complete cell per invocation unless a larger proven-bounded shard preserves the same
protocol. Jobs is always 4, explicitly `--jobs=4`; never run two qualifier invocations together.
Seed base 20260601, FNV tag variant/level/index; this is not GS's 20260101. First 40, expand 30-35 hits
to 100, offer >=36/40 or >=90/100 plus p95; 120000 ms request guard; p95 budgets 2/10/30 seconds by
<=36/<=81/larger cells. Protocol-proved early hidden stops are valid; arbitrary truncation is not.
Capture every completed in-flight request after an early stop. Worker/IPC failure fails the run.
MS07d merge checks all 135 cells, source/tool/Node/jobs/protocol, request keys/seeds and summaries.

```powershell
node tests\qualify.js --variant=<id> --level=<level> --jobs=4 --json=..\docs\difficulty-v3\evidence\<task>\qualification\<id>-<level>.json --markdown=..\docs\difficulty-v3\evidence\<task>\qualification\<id>-<level>.md
node tests\qualify.js --merge=..\docs\difficulty-v3\evidence\<task>\qualification --jobs=4 --json=..\docs\difficulty-v3\evidence\<task>\complete.json --markdown=..\docs\difficulty-v3\evidence\<task>\table.md
```

No --probe or diagnostic overrides, and never explicit `maxAttempts: 8`: use the per-board default.
First checkpoint MS07e never touches live offers. A slow cell that cannot complete within the existing
bounded protocol is a named item and an incomplete cell, not a fabricated hidden verdict or a new
tooling task; continue other cells. Final publication still needs a complete valid matrix. Final MS18c
archives v2 first and composes the live report around the table body. Record the measured identity
and publication's support-array-only difference; algorithm changes require new qualification.
S-OD7 keeps Killer Hard/Expert in this full protocol but withholds them from the product until
later calibration; never overwrite a raw qualification verdict to encode that owner disposition.
S-OD8 changes only quick/manual test membership. Q-MS07e-2's six cells follow the unchanged
projection rule in section 2; no early-stop credit is a new permission to launch them.

### Fixed GS manifest

| Variant | Levels (12 requests each, one command/cell) |
|---|---|
| classic9 | normal, hard, expert, master, nightmare, hell1 |
| killer | normal, hard, expert |
| jigsaw9 | normal, hard, expert, nightmare |
| greaterThan | normal, hard, expert |
| diagonalX | nightmare |

Total 17 cells / 204 requests per baseline or final pass. Cap comparison: classic9 normal/master/nightmare,
killer hard/expert, jigsaw9 expert = 288 requests across four settings. Window comparison: classic9,
diagonalX, jigsaw9 nightmare = 72 requests across two cutoffs. All use seed base 20260101; these are
derived request streams, not literal puzzle seeds 1-12. Unsupported final cells use `--include-unsupported`.
Any final cap/window re-selection is escalated by MS18b before MS18c; an inserted change must repeat
GG/GR/GH/GD and replace stale affected final evidence. MS18 tasks never change tuning constants.

## 8. Developer evidence and sign-off

Final reply from every developer:

1. Exact task ID and changed/created files; confirm nothing outside assigned ownership was edited.
2. Delivered APIs/data shapes/options and downstream handoff; identify any inactive feature.
3. Every command, suite/count, exit code and duration; gate artifact paths and complete case coverage.
4. B/T acceptance IDs met or not met, with evidence; no blanket "all green" after a suppressed exit.
5. Problems, fixes and deviations; unexpected failures or unresolved blockers explicitly.
6. Source/seed identities, intentional fixture diffs and remaining risks.
7. Actual model, start/end/duration and available token/credit usage, or "unavailable"; never invent usage.
8. The inherited/new S-OD4 item list (or explicitly none), with numbers, evidence, status and named
   MS07e/MS18c/MS18d route; CI group/membership changes when adding a suite. MS18e audits all items.

The orchestrator owns logs, acceptance and commits. All Execution logs below the task documents remain
empty until that review. The analyst reports are traceability, not additional design research for the developer.

## 9. Release record

| Gate / decision | Status | Evidence / remaining action |
|---|---|---|

## Orchestrated execution summary

| Task | Status | Duration | AI credits | Commit |
|---|---|---|---|---|
| MS01 | Accepted | 18 min developer + 7 min review | about 346 | `difficulty-v3 MS01` |
| MS02 | Accepted | 33 min developer (GS-before 176 s) + 9 min review | about 676 | `difficulty-v3 MS02` |
| MS03a | Accepted | 41 min developer + 7 min review | about 779 | `difficulty-v3 MS03a` |
| MS03b | Accepted | 33 min developer + 6 min review | about 728 | `difficulty-v3 MS03b` |
| MS03c | Accepted | 16 min developer + 6 min review | about 362 | `difficulty-v3 MS03c` |
| MS03d | Accepted | 25 min developer + 7 min review | about 513 | `difficulty-v3 MS03d` |
| MS04 | Accepted with open CV6 finding | 66 min developer (E bundle, GD 338 s) + 12 min review | about 1,046 | `difficulty-v3 MS04` |
| MS05a | Accepted | 22 min developer + 8 min review | about 438 | `difficulty-v3 MS05a` |
| MS05r1 | Step evidence complete (S-OD2; combined commit after MS05r6b) | 41 min developer (12 min lock wait) + 5 min review | about 747 | (combined) |
| MS05r2 | Step evidence complete (S-OD2; combined commit after MS05r6b) | 20 min developer + 2 min review | about 473 | (combined) |
| MS05r3 | Step evidence complete (S-OD2; combined commit after MS05r6b) | 68 min developer + 3 min review | about 1,317 | (combined) |
| MS05r4 | Stopped at S-OD2 stop point: 256 selected, mega preflights fail (CV6-03 to the owner) | 1 h 48 min developer (Node 61.5 min) + 3 min review | about 640 | (combined) |
| MS05r5p | Step evidence complete (S-OD2; combined commit after MS05r6b and MS05r6c); Addendum A1; CV6-04 answered (b), legacy-8 fix round 2026-11-14 | 1 h 42 min developer in two rounds + 20 min review | about 1,747 | (combined) |
| MS05r5 | Step evidence complete (S-OD2; combined commit after MS05r6b and MS05r6c) | 52 min developer + 12 min review | about 919 | (combined) |
| MS05r5m | Step evidence complete (S-OD2; combined commit after MS05r6b and MS05r6c); 14 deep records, 0 exact (S-AV02, S-AV03); SA1 review IR01-IR04 | 1 h 38 min developer in two rounds + 15 min review | about 1,739 | (combined) |
| MS05b3 | Step evidence complete (S-OD2; combined commit after MS05r6b and MS05r6c); 186 cells, 19 availability-only failures (S-AV02..S-AV13); incident IR07 (unlocked cells) | 3 h 45 min developer + 20 min review | about 1,828 | (combined) |
| MS05r6a | Step evidence complete (S-OD2; combined commit after MS05r6b and MS05r6c); G13 persisted; complete E (520/5/14); 13 pins; COV01 for MS18e | 2 h 17 min developer in two rounds + 25 min review | about 1,748 | (combined) |
| MS05r6b | Audit complete (S-OD2; combined commit with MS05r6c); quick sets green (Generator 3,262, Player 1,683); R6B-F01 fixed by MS05r5p; GD with S-AV07, S-AV14, S-AV15; standing cost measured (S-AV08) | 1 h 14 min developer in two runs + 15 min review | about 1,582 | (combined) |
| MS05r6c | Accepted in the combined commit; CI groups over the bounded quick manifest; final quick runs green (Generator 3,262, Player 1,683); SA1's IR14/IR15/IR19 applied | 48 min developer + 15 min review | about 506 | `difficulty-v3 MS05` |
| MS05e | Closed: measured, set aside (CV6-05, Q1(b) withdraw the pool, Q2(a) keep the contracts); runtime restored byte for byte to `f7be90f` with identity proof, no run; candidate kept as `candidate-pool-4.patch`; IR23 gate met and not taken | 2 h 51 min developer + about 25 min document rounds; SA1 review and cross-check | about 2,223 | `difficulty-v3 MS05e` |
| MS06a | Accepted (evidence only): 17 cells, 204 outcomes on the restored source (163 exact / 39 shallow / 2 miss), identity with MS05e's before-records; S-AV18-S-AV20 new | 26 min developer + 10 min review | about 220 | `difficulty-v3 MS06a` |
| MS06b | Accepted: pure target policy helpers and inert forwarding; 28 tests in `digger-target`; quick sets green (Generator 3,290, Player 1,683; 652.9 s); SA1 IR31-IR38, IR31/IR32 carried to MS06c1 | 28 min developer + 16 min review | about 405 | `difficulty-v3 MS06b` |
| MS06c1 | Accepted: nullable target transport, keeper views and typed objectives without activation; GG 520/520 unchanged, GR wires `target: null` only; quick sets green (Generator 3,323, Player 1,683; 650.7 s); SA1 IR39-IR44 | 63 min developer + 12 min review | about 1,190 | `difficulty-v3 MS06c1` |
| MS06c2 | Accepted: one originating target per sample activated in every candidate-comparing stage; complete E (194 of 520 hashes changed, wires `target`, analyses G01/G04/G05/G06); quick sets green (Generator 3,346, 690.7 s; Player 1,683); SA1 IR45-IR51, fix round applied | 2 h 38 min developer (incl. fix round) + 16 min review | about 2,558 | `difficulty-v3 MS06c2` |
| MS06d | Accepted (evidence only): 204 outcomes after the target, 163/39/2 -> 164/38/2, adjusted exact median lower in 8 of 14 cells (pooled 0.623 -> 0.560), time unchanged, Greater-Than null effect; S-AV21-S-AV23 new | 27 min developer + 10 min review | about 326 | `difficulty-v3 MS06d` |
| MS07a | Accepted: unregistered windowed chain/Nishio kernels and the pattern-cost CLI; differential 35,020 finds identical; quick sets green (Generator 3,405, 690.2 s; Player 1,714); SA1 IR52-IR55 (IR52 to MS07b) | 1 h 19 min developer + 20 min review | about 1,379 | `difficulty-v3 MS07a` |
| MS07b | Accepted: four chain/depth IDs registered with explicit windows and limits in both apps; E 6 of 520 hashes changed (all Nightmare), G14; Hell 1 non-vacuous (pilot and mega 0 exact); quick sets green (Generator 3,449, 744.9 s; Player 1,749); SA1 IR56-IR61, text fix round applied | 3 h 38 min developer (incl. fix round) + 21 min review | about 3,086 | `difficulty-v3 MS07b` |
| MS07c | Accepted: `SHORT_MAX` = 4 from the 72-request experiment (36 of 36 exact against 24 of 36 at C = 6); E 37 of 520 hashes changed (all Nightmare); quick sets green (Generator 3,459, 684.3 s; Player 1,750); SA1 IR62-IR66, text fix round applied | 1 h 57 min developer (incl. fix round) + 16 min review | about 1,594 | `difficulty-v3 MS07c` |
| MS07d | Accepted: checked 135-cell qualification merger (`qualify.js --merge`, pure helper shared with the scheduler, shard metadata incl. `qualifierHash` and attempt policy); 46 synthetic-record tests; pair-atomic output after SA2 finding; new S-AV27; quick sets green (Generator 3,505, 679.4 s; Player 1,750) | 1 h 33 min developer (incl. fix round) + 10 min SA2 rulings | about 1,646 | `difficulty-v3 MS07d` |
| MS07e | Accepted (incomplete checkpoint by the S-AV27 rule): GQ 129 of 135 cells (6 not launched above 450 s), 4,311 requests, 3,794 exact, 0 errors or invalid puzzles; 89 offered, 40 hidden, 23 current offers observed hidden; GG 520/520 unchanged; GD 152/154 (Hell 1 0/20, Normal 83/100; 0 correctness); quick sets green (Generator 3,505, 692.1 s; Player 1,750); owner requests Q-MS07e-1 (Killer) and the quick-tier proposal | 3 h 7 min developer | about 1,551 | `difficulty-v3 MS07e` |
| MS08a | Accepted: Skyscraper (fish group, weight 330, Hard tier); 66 of 520 hashes changed (all admitting the technique), four reference ratings changed, no level change; 29 help examples; quick sets green (Generator 3,563, 699.8 s; Player 1,807); SA1 IR67-IR72 (IR72 = technique template checklist) | 2 h 3 min developer + 17 min review | about 2,105 | `difficulty-v3 MS08a` |
| MS07f | Accepted: four slow quick tests moved to the manual tier (S-OD8), assertions byte-identical (33/33 relocation checks); Generator quick 699.8 -> 296.7 s (3,560 tests), Player 1,807; IR67 totals updated; CI check | 29 min developer + 5 min check | about 462 | `difficulty-v3 MS07f` |
| MS08b | Accepted: Two-String Kite (fish group, weight 340), box-like = box or region after SA2 ruling (b) with a fix round; 18 of 520 hashes changed, four reference ratings changed by 1-13 points, no level change; 30 help examples; quick sets green (Generator 3,651, 303.4 s; Player 1,897, 38.1 s); IR72 A-J | 3 h 4 min developer (incl. 1 h 15 min fix round) + 4 min ruling + 6 min check | about 3,015 | `difficulty-v3 MS08b` |
| MS08c | Accepted: Empty Rectangle (fish group, weight 380, Hard tier); questions before E, SA2 accepted all as implemented; 29 of 520 hashes changed (none below Hard), two reference ratings changed, no level change; 31 help examples; quick sets green (Generator 3,742, 308.4 s; Player 1,987, 39.9 s); IR72 A-J | 1 h 43 min developer + 9 min ruling + 5 min check | about 1,891 | `difficulty-v3 MS08c` |
| MS09a | Accepted: Finned X-Wing incl. sashimi (fish group, weight 400, Hard tier); eight questions before E, SA2 accepted the implementation and changed the wording; 23 of 520 hashes changed (none below Hard), four reference ratings changed, no level change; 32 help examples; quick sets green (Generator 3,830, 324.0 s; Player 2,074, 45.3 s); IR72 A-J | 2 h 14 min developer + 4 min ruling + 5 min check | about 2,154 | `difficulty-v3 MS09a` |
| MS09b | Accepted: Finned Swordfish (fish group, weight 480, Hard tier) with an independent n=3 work limit of 50,000; five questions before E, SA2 accepted with test and report corrections; S-AV31 (multigrid finder latency, to MS18d); 13 of 520 hashes changed (none below Hard), three reference ratings changed, no level change; 33 help examples; quick sets green (Generator 3,928, 368.3 s; Player 2,171, 56.3 s); IR72 A-J | 2 h 15 min developer + 17 min ruling + 5 min check | about 2,109 | `difficulty-v3 MS09b` |
| MS10a | Accepted: Remote Pairs (wing group, order 116, weight 350, Hard tier) after RP-01/S-OD9 corrected the prior from 132/440/44; reachability gate passed (45 of 20,000 classic9 solves); 0 of 520 hashes changed, G10 wire and G06 analysis only; reference ratings unchanged; 34 help examples (remotePairs from a real solve); quick sets green (Generator 4,018, 379.9 s; Player 2,260, 61.1 s; seven projections raised); IR72 A-J | 2 h 27 min developer + about 2 h waiting for RP-01 + 12 min check | about 2,456 | `difficulty-v3 MS10a` |
| MS10b | Accepted: WXYZ-Wing (wing group, order 155, weight 800, Master tier); four questions before E, SA2 accepted the defaults with reporting corrections and reserved S-AV33 (bounded-prefix coverage/cost); 36 of 520 hashes changed, all in the four admitting Master/Nightmare cells; four reference scores changed, no level change; 35 help examples (five moved to other real sources); quick sets green (Generator 4,097, 390.0 s; Player 2,338, 63.8 s); IR72 A-J | 1 h 52 min developer + about 1 h 30 min waiting for rulings + 6 min check | about 2,293 | `difficulty-v3 MS10b` |
| MS11a | Accepted: Unique Rectangle Types 3 and 4 (ID, order, cost and weight unchanged); eight points before E, SA2 removed the unstated Type 3 cap of 3 (R14) and required a #34 negative; 3 of 520 hashes changed (classic9/nightmare), analysis G14 only; reference ratings unchanged; 35 help examples (remotePairs moved to Hell 1 seed 644); quick sets green (Generator 4,171, 397.0 s; Player 2,412, 65.4 s); IR72 A-J | 2 h 29 min developer + 21 min ruling + 5 min check | about 2,190 | `difficulty-v3 MS11a` |
| MS11b | Accepted: hidden Unique Rectangle as a bounded third pass (same ID, order and weight); eight points before E, SA2 accepted with buffered observer records; 5 of 520 hashes changed (classic9 and diagonalX Nightmare), analysis G14 only; three reference scores changed, no level change; 35 help examples (emptyRectangle refreshed); digger-target seed 11 -> 14 by SA2 ruling; quick sets green (Generator 4,218, 395.0 s; Player 2,459, 65.8 s); IR72 A-J | 2 h 15 min developer + 25 min rulings + 5 min check | about 2,369 | `difficulty-v3 MS11b` |
| MS11c | Accepted: guarded BUG+1 (wing group, order 182, weight 920, Master, assumes uniqueness); eight points before E, SA2 changed the solution-count text and the GH provenance; 3 of 520 hashes changed (classic9 and diagonalX Nightmare), wires and analyses unchanged; reference ratings unchanged; 36 help examples; digger-target seed 16 -> 30 by SA2 ruling; quick sets green (Generator 4,289, 395.0 s; Player 2,529, 65.8 s); IR72 A-J | 1 h 46 min developer + 17 min ruling + 4 min check | about 2,023 | `difficulty-v3 MS11c` |
| MS12 | Accepted: restricted XY-chain (chain group, order 186, weight 1000, Master) as a restricted-edge mode of the shared chain search; eight points before E accepted by SA2; 18 of 520 hashes changed (Master and above); three reference scores changed, no level change; 37 help examples, Jellyfish from testkit-4242-5335 under owner decision S-OD10 (JF-01); quick sets green (Generator 4,368, 407.4 s; Player 2,607, 72.7 s; two projections raised); IR72 A-J | 2 h 51 min developer + about 34 min ruling + about 30 min JF-01 + 6 min check | about 2,444 | `difficulty-v3 MS12` |
| MS13a | Accepted after SA1 review: inactive grouped chain graph and independent proof checker; eight points ruled by SA2 (box/region x line groups, pair-charged work, nodes quota, full E check-only); output byte-identical (differential, E merge-checks with no writes, GH 37/37); all-model census shows the 50,000 default reached at multi-grid and 16-digit chain positions, escalated to the owner as GC-01 (S-AV36); quick sets green (Generator 4,408, 410.0 s; Player 2,647, 73.3 s) | 1 h 55 min developer + 48 min ruling + 20 min SA1 review + 3 min check | about 2,085 (developer) + 2,257 (SA1) | `difficulty-v3 MS13a` |
| MS13b | Accepted after SA1 review: inactive group-proof consumers in both apps (one-cell node as the legacy literal, true group with ∨, false group with ∧, Player `localizeStep`); five points ruled by SA2 (conditional descriptions and corrected subtype explanations, 32 locale entries; MS13a allowance sentence scoped; `Finding.cells` authoritative); engine and canonical data unchanged (differential, E merge-checks with no writes, GH 37/37); quick sets green (Generator 4,416, 431.8 s; Player 2,658, 74.2 s); own-fast 320, Player job 120 | 1 h 10 min developer + 10 min ruling + 10 min SA1 review + 3 min check | about 1,625 (developer) + 839 (SA1) + 290 (SA2) | `difficulty-v3 MS13b` |
| MS14a | Accepted after orchestrator review: inactive complete multiset-support kernel for Law of Leftovers (jigsaw9, unregistered), run ahead of MS13c while GC-01 waited; two points ruled by SA2 (Finding fields; empty intersection declines the call); output unchanged (differentials, E merge-checks with no writes, GH 37/37); quick sets green (Generator 4,456, 415.5 s; Player 2,698, 79.9 s); core-shared 110; Jigsaw blank-state cost above 50,000 on two test layouts sent to SA2 for numbering | 1 h 53 min developer + 15 min ruling + 4 min review | about 2,199 (developer) + 953 (SA2) | `difficulty-v3 MS14a` |
| MS13c | Accepted after SA1 review (two rounds): grouped forcing chains active under S-OD11 option A (bounded grouped attempt, short-only uncapped singleton fallback on a local cap); four developer questions ruled by SA2 (`a4262fb`); Jellyfish corpus route approved retroactively by the owner (JF-02 A + S0, S-OD12); activation E explained and written, GH 37/37; generation slower in some cells (S-AV38, owner informed); quick sets green (Generator 4,483, 476.0 s; Player 2,722, 93.6 s) | 6 h 08 min developer + 1 h 18 min SA2 + 47 min SA1 + owner wait | about 3,995 (developer) + 2,546 (SA1) + 5,741 (SA2) | `difficulty-v3 MS13c` |
| MS14b | Accepted after orchestrator review: Law of Leftovers registered for jigsaw9 (order 87, weight 200) with locales, fixture, cost adapter and a real Jigsaw help example (catalogue 38); one QUESTION ruled by SA2 (113-column comment: re-wrap and complete E-2, outputs equal to E-1); developer hand-over after a network outage; G06 and 22 jigsaw9 hashes changed; S-AV37 limits kept; quick sets green (Generator 4,526, 501.9 s; Player 2,753, 96.4 s) | 2 h 02 min + 48 min developers + 5 min ruling + 4 min review (30 min outage) | about 2,658 (developers) + 170 (SA2) | `difficulty-v3 MS14b` |
| MS14c | Accepted after orchestrator review: 33 quick Killer regressions per app for the existing required-digit and pair interactions (positives, near misses, transposes; oracle and exact-solver checks), registration pin with no cageLocked; no production change, E check-only, GH 38/38; quick sets green (Generator 4,559, 500.9 s; Player 2,786, 97.1 s) | 1 h 02 min developer + 2 min review | about 1,081 (developer) | `difficulty-v3 MS14c` |
| MS15a | Accepted after SA1 review: inactive bounded ALS enumerator `SG.alsPatterns` (4 cells / 4,096 records / 50,000 work, canonical prefix, exact-4,096 probe); D1-D8 settled without a pause and accepted by SA2 (`01e06629`); S-AV39 opened; output unchanged (differentials, fresh E merge-checked with no writes, GH 38/38); test file rewrapped; quick sets green (Generator 4,618, 505.4 s; Player 2,844, 100.5 s) | 2 h 07 min developer + 27 min SA2 + 18 min SA1 | about 2,158 (developer) + 1,206 (SA1) + 674 (SA2) | `difficulty-v3 MS15a` |
| MS15b | Accepted after orchestrator review: ALS-XZ registered (order 194, weight 1250) on the MS15a enumerator with one shared work guard; seven questions paused and ruled by SA2 (Q1-Q7; Q7 corrected SA2's own Q6 pin); S-AV39 limits retained; activation E explained (base engine) and written; GH 39/39 with a real ALS-XZ example; GP partial (classic9/nightmare meets; jigsaw9 pilot only; 35 cells unmeasured); quick sets green (Generator 4,682, 520.4 s; Player 2,906, 107.7 s) | 6 h 05 min developer (about 2 h 40 min question waits) + 4 min review | about 3,363 (developer) + 7,958 (SA2) | `difficulty-v3 MS15b` |
| MS16 | Accepted after orchestrator review: Sue de Coq registered (order 196, weight 1300) with its own 50,000 work guard on the shared ALS enumerator; Q1-Q5 paused and ruled by SA2; help example from the fixed E request classic9/nightmare#377 accepted as ordinary-B reuse (missing pause recorded as MS16-Q6); E: 1 of 520 hashes changed, explained; GH 40/40; quick sets green (Generator 4,755, 549.4 s; Player 2,978, 116.8 s) | 3 h 20 min developer + 5 min review | about 3,019 (developer) + 1,040 (SA2) | `difficulty-v3 MS16` |
| MS17a | Accepted after orchestrator review: history entries store the producer `ratingVersion` (store version 1) and earlier or unmarked entries show SA2's EN/VI note and title; Q1-Q5 paused and ruled by SA2 (`d8bd407`); E wires/analyses recorded fresh and unchanged, MS16 hashes merge-checked, nothing written; GH 40/40; quick sets green (Generator 4,769, 543.9 s; Player 2,978, 118.9 s) | 57 min developer + 2 min review | about 803 (developer) + 1,525 (SA2) | `difficulty-v3 MS17a` |
| MS17b | Accepted after SA1 review (two rounds): rating and cache version 3 with strict cache admission and full-tuple comparison; limit-freeze record `limits-v3.md` (section 1 frozen with the version, C/R5/8-4-2 under MS18b); E: wires version-only 2 -> 3, analyses and hashes unchanged; GD 144/145 executed passed (S-AV14), Hell 1 and confusion matrix not admitted; two stale manual pins repaired by SA2 ruling; quick sets green (Generator 4,784, 542.0 s; Player 2,981, 117.2 s) | 4 h 38 min developer (about 1 h question waits) + 26 min SA1 | about 3,167 (developer) + 1,851 (SA1) + 10,201 (SA2) | `difficulty-v3 MS17b` |
| MS18a | Accepted (evidence only): final matched soak, 204 of 204 outcomes, exact 91 -> 163 (79 -> 163 of 192 without vacuous Hell 1), in band 202 -> 204, misses 2 -> 0, shallow 55% -> 20%; 13 losses (12 vacuous Hell 1, `greaterThan:expert:0`); zero-exact cells classic9 Hell 1, killer Hard, killer Expert; timings host-active and descriptive (MS18a-Q1-HOST); two CPU holds re-asked once and admitted (MS18a-Q2-ADMISSION) | 1 h 45 min developer (about 22 min question waits) + 4 min review | about 1,835 (developer) + 3,867 (SA2) | `difficulty-v3 MS18a` |
| MS18b | Accepted (evidence only): R5 256 and C = 4 reconfirmed on 360 fresh outcomes (288 R5, 72 R9); 64 and 128 lose classic9 exact hits, 256 loses none and lowers the Jigsaw 9 Expert median 1,215 -> 1,104; C4 36/36 vs C6 20/36; no owner decision; Killer Hard/Expert 0/12 at every cap; 44 commands admitted at attempt 1 (host-active, 0 holds) | 1 h 35 min developer + 3 min review | about 1,039 (developer) + 768 (SA2) | `difficulty-v3 MS18b` |
| MS05 (combined) | Accepted: retained MS05b1, MS05r1-r4, MS05r5p, MS05r5, MS05r5m, MS05b3, MS05r6a, MS05r6b, MS05r6c in one commit (S-OD2); the pause commit `a7f6660` was not green and was not acceptance | recovery developers 2026-11-13/14 + reviews | about 13,400 (developers of MS05r1-MS05r6c and the fix rounds; MS05b1 not recorded) | `difficulty-v3 MS05: required exactness with measured bounded recovery` |
