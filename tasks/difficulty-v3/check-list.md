# Difficulty v3 — task index and overall acceptance

**Scope:** the accepted full Sudoku plan S0-S3, all six S3 groups and S2.3: required-tier exactness,
one band target through generation, the expanded solver, and rating/cache version 3.
**Status:** the first tranche is accepted and implementation is under orchestration. All remaining
executable files are written for serial dispatch; review follows the S-OD4 matrix below.
Only the orchestrator changes Done marks, Execution logs and the execution summary.
**Authority:** `docs/difficulty-v3/clarifications-resolved.md` Parts F/G (AC01 and acceptance),
owner acceptance, 2026-11-12 11:50; Part H and PR-S1/CV6-03, S-OD1 through S-OD4, also bind.
S-OD3/S-OD4 supersede the earlier performance-only recovery stops, not correctness or evidence integrity.
**Traceability:** [accepted report](../../docs/difficulty-v3/report-detailed.md), R1-R24;
[answers](../../docs/difficulty-v3/clarifications-resolved.md), Parts A-H, PR-S1 and CV6-03;
[open questions](../../docs/difficulty-v3/clarifications.md).
**Execution:** claude-sonnet-5.5 developers, one active task in this repository; branch `rating-v3`;
the orchestrator reviews and commits, nothing pushed.
**Resume baseline:** `c9935cd` on `rating-v3`, after pause commit `a7f6660`. Neither checkpoint accepts
MS05b1/recovery. Remaining-task anchors were checked at this HEAD; quoted symbols remain the locator
after a prerequisite moves lines. Historical dispatched files and their Execution logs stay unchanged.

The pack uses execution-order IDs: **MS03 is tooling (old report MS04); MS04 is orders (old MS03)**.
The accepted order is unchanged. Historical analyst documents/answers keep their old labels.
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
| [ ] | MS05 | MS05a, recovery, MS05e | Required exactness and CV6 repair (parent) | MS04 | split | Generator | M5 | 8-11a |
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
| [ ] | MS05e | [MS05e](MS05e-guided-sign-dig.md) | Guided sign dig; CV6 result and named findings | r6b/r6c combined commit | M, 50-60 min + gates | Greater-Than | M5e | 11a |
| [ ] | MS06 | MS06a-MS06d | One target through all stages (parent) | MS05e | split | Generator | M6 | 12-15 |
| [ ] | MS06a | [MS06a](MS06a-pre-target-evidence.md) | Isolated pre-target evidence | MS05e | S, 20-30 min | Evidence | M6a | 12 |
| [ ] | MS06b | [MS06b](MS06b-target-policy-primitives.md) | Inactive target policy primitives | MS06a | M, 35-50 min | Generator engine | M6b | 13 |
| [ ] | MS06c | MS06c1-MS06c2 below | Target transport and atomic activation (parent) | MS06b | split | Generator | M6c | 14a-14b |
| [ ] | MS06c1 | [MS06c1](MS06c1-target-transport.md) | Nullable target transport; no policy activation | MS06b | M, 45-60 min + GG check/GR | Generator plumbing | M6c1 | 14a |
| [ ] | MS06c2 | [MS06c2](MS06c2-activate-target-policy.md) | Atomic all-stage target activation | MS06c1 | M, 50-60 min + GG/GR | Generator engine | M6c2 | 14b |
| [ ] | MS06d | [MS06d](MS06d-target-comparison.md) | Isolated target comparison | MS06c2 | S, 20-30 min | Evidence | M6 | 15 |
| [ ] | MS07 | MS07a-MS07e | Windows/selection/checkpoint (parent) | MS06d | split | Solver/tools | M7 | 16-20 |
| [ ] | MS07a | [MS07a](MS07a-window-kernels-and-pattern-metrics.md) | Window kernels and pattern metrics | MS06d | M, 50-60 min | Shared solver/tools | M7a | 16 |
| [ ] | MS07b | [MS07b](MS07b-register-chain-windows.md) | Chain/depth integration and Hell 1 pilot | MS07a | M, 50-60 min + E/GH/pilot | Shared solver | M7b | 17 |
| [ ] | MS07c | [MS07c](MS07c-select-chain-cutoff.md) | Cutoff tooling, cost and measured selection | MS07b | M, 40-55 min + GS/GP-cost | Tools/evidence | M7c | 18 |
| [ ] | MS07d | [MS07d](MS07d-qualification-record-merger.md) | Checked qualification merger | MS07c | M, 40-55 min | Tooling | M7d | 19 |
| [ ] | MS07e | [MS07e](MS07e-first-qualification.md) | Complete first checkpoint | MS07d | S, 25-40 min | Evidence | M7 | 20 |
| [ ] | MS08 | MS08a-MS08c | Single-digit patterns (parent) | MS07e | split | Shared solver | M8 | 21-23 |
| [ ] | MS08a | [MS08a](MS08a-skyscraper.md) | Skyscraper | MS07e | M, 40-55 min | Shared fish | M8a | 21 |
| [ ] | MS08b | [MS08b](MS08b-two-string-kite.md) | Two-string kite | MS08a | M, 40-55 min | Shared fish | M8b | 22 |
| [ ] | MS08c | [MS08c](MS08c-empty-rectangle.md) | Empty rectangle | MS08b | M, 50-60 min | Shared fish | M8 | 23 |
| [ ] | MS09 | MS09a-MS09b | Finned fish (parent) | MS08c | split | Shared fish | M9 | 24-25 |
| [ ] | MS09a | [MS09a](MS09a-finned-x-wing.md) | Finned X-Wing/sashimi | MS08c | M, 50-60 min | Shared fish | M9a | 24 |
| [ ] | MS09b | [MS09b](MS09b-finned-swordfish.md) | Finned Swordfish | MS09a | M, 40-55 min | Shared fish | M9 | 25 |
| [ ] | MS10 | MS10a-MS10b | Pairs/WXYZ (parent) | MS09b | split | Shared wings | M10 | 26-27 |
| [ ] | MS10a | [MS10a](MS10a-remote-pairs.md) | Remote pairs | MS09b | M, 40-55 min | Shared wings | M10a | 26 |
| [ ] | MS10b | [MS10b](MS10b-wxyz-wing.md) | WXYZ-Wing | MS10a | M, 45-60 min | Shared wings | M10 | 27 |
| [ ] | MS11 | MS11a-MS11c | Uniqueness patterns (parent) | MS10b | split | Shared wings | M11 | 28-30 |
| [ ] | MS11a | [MS11a](MS11a-rectangle-types-three-four.md) | UR types 3/4 | MS10b | M, 50-60 min | Shared wings | M11a | 28 |
| [ ] | MS11b | [MS11b](MS11b-hidden-rectangle.md) | Hidden UR | MS11a | M, 35-50 min | Shared wings | M11b | 29 |
| [ ] | MS11c | [MS11c](MS11c-bug-plus-one.md) | BUG+1 | MS11b | M, 45-60 min | Shared wings | M11 | 30 |
| [ ] | MS12 | [MS12](MS12-xy-chain.md) | Restricted XY-chain | MS11c | M, 50-60 min | Shared chains | M12 | 31 |
| [ ] | MS13 | MS13a-MS13c | Grouped chains (parent) | MS12 | split | Solver/UI | M13 | 32-34 |
| [ ] | MS13a | [MS13a](MS13a-group-graph-and-proof-checker.md) | Inactive graph/proof checker | MS12 | M, 50-60 min | Shared chains | M13a | 32 |
| [ ] | MS13b | [MS13b](MS13b-group-proof-consumers.md) | Group-proof consumers | MS13a | M, 35-50 min | Both app UI | M13b | 33 |
| [ ] | MS13c | [MS13c](MS13c-activate-grouped-chains.md) | Grouped-chain activation | MS13b | M, 50-60 min | Shared chains | M13 | 34 |
| [ ] | MS14 | MS14a-MS14c | Leftovers/cage regressions (parent) | MS13c | split | Shared solver | M14 | 35-37 |
| [ ] | MS14a | [MS14a](MS14a-leftover-support-kernel.md) | Inactive multiset support | MS13c | M, 50-60 min | Shared subsets | M14a | 35 |
| [ ] | MS14b | [MS14b](MS14b-register-law-of-leftovers.md) | Law of leftovers integration | MS14a | M, 40-55 min | Shared subsets | M14b | 36 |
| [ ] | MS14c | [MS14c](MS14c-killer-interaction-regressions.md) | Existing Killer regressions | MS14b | S, 25-40 min | Core tests | M14 | 37 |
| [ ] | MS15 | MS15a-MS15b | ALS-XZ (parent) | MS14c | split | Shared ALS | M15 | 38-39 |
| [ ] | MS15a | [MS15a](MS15a-als-enumerator.md) | Inactive bounded ALS enumerator | MS14c | M, 45-60 min | Shared ALS | M15a | 38 |
| [ ] | MS15b | [MS15b](MS15b-als-xz.md) | ALS-XZ integration | MS15a | M, 50-60 min | Shared ALS | M15 | 39 |
| [ ] | MS16 | [MS16](MS16-sue-de-coq.md) | Sue de Coq | MS15b | M, 50-60 min | Shared ALS | M16 | 40 |
| [ ] | MS17 | MS17a-MS17b | Persistence/version (parent) | MS16 | split | Integration | M17 | 41-42 |
| [ ] | MS17a | [MS17a](MS17a-history-version-marker.md) | History marker, store 1 | MS16 | S-M, 30-45 min | Generator UI | M17a | 41 |
| [ ] | MS17b | [MS17b](MS17b-version-cache-and-freeze.md) | Rating/cache 3 and limit freeze | MS17a | M, 50-60 min | Integration | M17 | 42 |
| [ ] | MS18 | MS18a-MS18e | Final evidence (parent) | MS17b | split | Evidence/release | M18 | 43-47 |
| [ ] | MS18a | [MS18a](MS18a-final-matched-soak.md) | Matched final soak | MS17b | S, 25-35 min | Evidence | M18a | 43 |
| [ ] | MS18b | [MS18b](MS18b-recheck-cap-and-window.md) | Cap/window final rechecks | MS18a | S, 25-40 min | Evidence | M18b | 44 |
| [ ] | MS18c | [MS18c](MS18c-qualify-and-publish-offers.md) | Qualify and publish offers | MS18b + owner actions | M, 35-50 min | Qualification | M18c | 45 |
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
the one combined commit. MS05e then measures and implements the approved sign repair before
MS06a captures before-data. A remaining CV6 timing miss is a named S-OD4 item, not an owner stop;
changing its target, strategy or another recorded decision still needs the owner's answer.
MS06b's pure policy helpers are inactive; its sole production-path edit forwards an explicitly
present strategy target and is tested for number/null/absence. MS06c1 adds nullable transport
and typed objectives with unchanged numeric ranking, but draws no target and activates no
sign/cells policy. MS06c2 draws the one target and connects all stages atomically. Waves 14a/14b
replace 14; historical references to MS06c mean both parts, not a dispatchable old file.
MS07a kernels precede registration MS07b, selection MS07c, merger MS07d and first GQ MS07e.
MS13a graph stays inactive until consumers MS13b and activation MS13c. MS14a/MS15a kernels likewise
precede their registrations. Final GQ is MS18c, after all S3, MS17b and final rechecks MS18b.
No intermediate pruning. Parent milestones are not additional waves or commits.

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
| S-OD4 (c1), (c2) | Final qualification alone determines all offers; a bounded fallback is a miss. Default attempts are 8/4/2 by <=81/82-144/>144 cells; explicit settings win; R5 remains 256 until the final recheck. |
| S-OD4 stops/evidence | Correctness or a proposed recorded-decision change stops for the owner. Performance/availability is a named numerical item, first MS07e then MS18c/MS18d, and work continues within existing bounds. No new evidence class/tooling task for a slow intermediate cell. |
| S-OD4 reviews/scope | All six S3 groups remain. Analyst cross-review only on the named semantics tasks below; MS08a supplies the technique template. |

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
| Greater-Than technique-oracle sign dig and its focused quick suite | MS05e algorithm; MS06b tests inert caller forwarding; MS06c2 activates/tests the originating target without editing the sign algorithm |
| Events/pipeline/result view/app | MS05a transport, retained MS05b1 activation, MS05r3 work, MS06c1 nullable target transport; MS06c2 activates value production |
| `generator/js/engine/explain-data.js`, tune explanation, shallow-warning grammar | MS05b1 finishes MS05a's handoff; MS06c2 later target facts |
| Seven manual exactness/warning consumer contracts | MS05r2 absorbs MS05b2; GD owners run them, no threshold relaxation |
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
| Qualification-authorized performance targets | MS18d only; no post-GP relaxation |
| Regression/replay fixtures and `player/js/ui/help-examples.js` | behavior owner using its gate; recovery final GG/GR/pins exclusively MS05r6a, r6b checks current merges; no recovery GH or separate fixture writer |
| Standing quick cost, AGENTS quick comments and both developer-guide testing paragraphs | MS05r6b before final quick freeze; actual cost data afterwards in the separate report, acknowledged with combined acceptance |
| `.github/scripts/generator-suites.sh`, both workflows and bounded CI manifest | MS05r6c first; each later suite-adding task owns its group/membership update; MS18e owns the final-tree audit and v3 PR CI |
| Living guides/designs and test HTML lists | the current task only, for the facts/files it changes |

The task's detailed file list controls. An unlisted file needs orchestrator assignment; report a defect
outside the scope rather than quietly taking another task's work.

### Per-task protocol and commits

1. Orchestrator confirms branch `rating-v3` and accepted prerequisite commits (or S-OD2's reviewed
   step evidence on the same preserved tree), then dispatches one named task.
2. Developer reads `AGENTS.md`, this checklist and the task. Implement only its scope; run its targeted
   checks and owned gates, recording actual commands, exit codes, counts and durations.
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

### S-OD4 stop, item and review protocol

This replaces conflicting performance-only stops throughout the active pack; archived task bodies and
completed logs describe their own historical decisions. The 540-second process ceiling, <=450-second
compound projection, one locked command and 15-second gap are unchanged. Stop an overlong command;
do not confuse that with stopping the task for an owner decision.

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
  MS18d (cost); afterwards route directly to those final owners. MS18e reconciles the entire list.
  A correctly recorded unavailable outcome is not lost evidence; missing/corrupted records are.
- **Final gates stay honest:** an item does not authorize an offer, a green test/CI claim, an incomplete
  qualification publication or a release. MS18c applies (c1); MS18d reports the actual GP verdict;
  MS18e reports any unsatisfied release gate. Changing a recorded gate/decision still needs the owner.
- **Review:** analysts cross-review MS05r5p/r5/r5m/b3/r6a/r6b/r6c, MS05e, MS06b/c1/c2,
  MS07a/b/c, MS13a/b/c, MS15a, MS17b and MS18c. MS08a is cross-reviewed as the technique template.
  The orchestrator checks MS08b-MS12, MS14a-c, MS15b and MS16 against that template and the generic
  soundness/order-invariant suites. Other tasks receive orchestrator review, not routine analyst review.

Initial carried findings (historical numbers, not measurements of the resumed defaults):

| Item | Evidence at the pause | First/final owner |
|---|---|---|
| S-AV01 Greater-Than Normal CV6 | 2035 ms p95 against 1400 ms scaled assertion, 700 ms design target; CV6-01 | MS05e repair/result, MS07e, MS18d |
| S-AV02 mega12 Nightmare | r4 seed 1: 48.202 s against 6 s; seed 3: 47.1 s, shallow at 8 attempts | r5p/r5m update, MS07e, MS18c/MS18d |
| S-AV03 mega16 Nightmare | r4 quick: 60 s timeouts; seed 3 diagnostic: 310.2 s, exact at attempt 6; app 120 s. **PR-S2 remark:** on the reviewed size-default search, mega16 Nightmare fails the 30 s qualification budget by its work ceiling, not as a tail | r5p/r5m update, MS07e, MS18c/MS18d |
| S-AV04 samurai Nightmare/G13 | r4: 104.712 s of 120 s, shallow at 8 attempts | r5p/r6a update, MS07e, MS18c/MS18d |
| S-AV05 Killer Hard | 0/12 exact at every R5 setting; S3 is not expected to repair its weight problem | MS07e owner question if hidden, MS18c |
| S-AV06 Killer Expert | 0/12 exact at every R5 setting; no weight change without the later answer | MS07e owner question if hidden, MS18c |
| S-AV07 classic9 Nightmare | 2/12 exact at none and 256; S2.2 is expected to add the missing tier | MS07e, MS18c |
| S-AV08 standing quick cost | b1 partial Generator chunks 713.8 s, not a complete baseline | r6b per-app measurement; MS07e proposal if Generator remains above about 5 minutes |

**PR-S2 remark (Fable, `92a7693`, archived in `docs/difficulty-v3/clarifications-resolved.md`):** MS05e-MS18e
continue as written. MS18d profiles the single S-AV11 Jigsaw request when doing its performance
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

From Player, exact template (replace only T/ID/variant/level with the owning task's stated values):

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=skyscraper --discover --variants=classic9 --levels=hard --max-puzzles=12 --max-hints=400 --record-sources=tests\artifacts\difficulty-v3\MS08a\source-hard.json
```

Pattern-cost recordings use the MS07a CLI, 20 runs/case, both positive and negative fixtures.
They are GP cost evidence, not a new wall-time assertion in quick tests. Starting limits are the
accepted R10 values; only the introducing finder can adjust its own new limit once, with
before/after data and resulting E/GH. MS15b selects shared ALS defaults; MS16 cannot retune them.
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

No implementer chooses an alternative from the original reports.

| Question IDs | Accepted decision |
|---|---|
| SA2-Q-S01; SA1-Q-S2 | VeryEasy singles tier is vacuous with null floor; Easy is not exempt |
| SA1-Q-S7; SA2-Q-S02 | Requiredness derived from complete canonical ratings after prefix invariant; reference `certifyFloor` uses inherited budget; failures never mean stuck |
| SA2-Q-S03; SA1-Q-S4 | Owner: raw-band target through guided dig, refinement and local search; no post-exact polishing; report every cell's hit loss |
| SA1-Q-S1; SA2-Q-S04 | Owner: measure C=4/6, more exact hits over 36 requests wins, 6 on tie; Nishio depth 1, deep default 2, explicit 3 only |
| SA2-Q-S12 | Compare 64/128/256/none on six cells; smallest cap with no per-cell hit loss and a strict median-work reduction, otherwise none |
| SA2-Q-S05 | R10 starting limits; one evidenced own-limit adjustment in introducing task; freeze with v3 at MS17 |
| SA2-Q-S08 | R10 cost table B; ALS group `chain`; fixed rating priors and bands |
| SA2-Q-S06; SA1-Q-S3 | Both approximate/shallow warnings and `tune.shallow`; exactness shared by all consumers |
| SA2-Q-S07; SA1-Q-S6 | Rating/cache 3, history store 1; entry ratingVersion, truthful earlier-version note; no floor in exports |
| SA2-Q-S09 | Existing cageCombo covers both interactions; quick regressions, no cageLocked |
| SA2-Q-S10 | Preserve v2 history, add v3 expectations and explain reclassification; no weight fitting to labels |
| SA2-Q-S11 | Bounded curated real help examples; stop/report if a required example cannot be obtained |
| SA1-Q-S5 | Final qualification determines offers; no intermediate pruning or weight calibration |
| AUTH-S1 | Live qualification table updated in place, v2 archived first |
| AUTH-S2; PROC-S1 | Baseline/tooling, orders, S1, split chains, all S3, version/final evidence |
| AC01, Parts F/G | Analytic lower bound, null/reason when undefined, defined values unclamped, raw position retained; bounded search is not a global-minimum proof |
| CV6-01 / S-OD1, Part H; amended by S-OD4 | MS05e follows the r6b/r6c combined commit, before MS06a. Diagnose the trap, then technique-pass-only pool initially 8; at most one comparison each of 4/8/16. Keep R6 comparator, work and log semantics; no floors/caps/orders/weights/bands/exactness/CV6 change. A remaining timing miss is S-AV01 for MS07e/MS18d, not a stop. A different strategy or slower CV6/GP contract still needs the recorded fallback decision. MS06b forwards target; no inequality refinement. |
| CV6-02 / S-OD2, Part H; historical stop rule superseded | Preserve active b1 and r1-r4 evidence, unchanged R5 selector and private backups. The pause commit is not acceptance. r6b audits the combined bundle, r6c closes CI, then one combined commit. No dark switch, provisional allowance or further checkpoint commit. S-OD3/S-OD4 below replace the former bans on G13 persistence/mega tier changes and performance-only stops. |
| CV6-03 / S-OD3 | 256 retained. G13 persistence at r6a is allowed with its seed 42, Nightmare request and 120 s recorder guard unchanged. Full-attempt mega Nightmare leaves quick coverage (mega16 has only scripted quick stop control); a tool-based deep tier keeps all 14 original calls and every invariant/CV5 relation. Quick retains a real one-attempt mega12 request; SA1 conditions (i)-(iii) apply. |
| CV6-03 / S-OD4 (c1), (c2) | Every offer follows final qualification; bounded fallbacks are misses. One exported defaultMaxAttempts(cellCount) gives 8/4/2 at <=81/82-144/>144. CV6-04 corrects (c2): a stored value equal to the old default 8 without the intent marker is read as default on every board; other stored numbers and marked explicit settings remain. The same-task [MS05r5p legacy-8 fix round](MS05r5p-legacy-8-fix-round.md) completes before r6b, with no engine change or new diagnostic/deep measurement. No interim pruning, browser-budget raise or R5 re-selection. |
| PR-S1 / S-OD4 stop/evidence rule | Only correctness or changing a recorded decision stops for the owner. Performance/availability findings become numbered items with numbers and MS07e/MS18c/MS18d ownership; every task reports them and MS18e audits them. Continue within bounded commands; no new evidence class/tooling task for slow intermediate cells. |
| PR-S1 / S-OD4 review/full-scope rule | All six S3 groups remain. Analyst reviews: remaining MS05, MS05e, MS06b-c2, MS07a-c, MS13a-c, MS15a, MS17b, MS18c; MS08a as template. Orchestrator template/generic-soundness/order checks for the other technique tasks. |
| CV6-03 sub-questions (1)-(3) / S-OD4 | CV3 mega16 Nightmare is not deferred; matching r5m puzzles may be reused with CV3's checks. Implementation: B1 selects the live route for MS05b3 instead. >240 s is an availability item, not a stop. Apply the same authorized contract to mega hell1 at MS07b. r6c owns bounded quick CI before the combined commit; every later suite owner updates its group, and MS18e owns the final PR CI. |
| FS22 implementation disposition, updated by S-OD3/S-OD4 and B1 | MS05r2 absorbed consumers; b3 follows r5p/r5/r5m under the approved contracts, not passed original mega limits. Lazy per-level I5/CV3 remains; the mega CV3 cells run live under B1 with their own checks. Syntax is not GD evidence. MS14c stays corpus-free; final I5 remains per level. |
| SA1 IR02 / IR04, implementation review 2026-11-14 | Binding B1 is copied into MS05b3: live mega CV3, no record provider/replay entry point/reuse code or edits to the deep tool/fixture/SOURCE_FILES. r6a/r6b check both currentMatches hashes explicitly; retain only a proved exact-diff non-generation-file mismatch, else execute their named MEGA-REFRESH step. Original hashes/records remain untouched. |
| FS12-FS16 / FS20 implementation dispositions | `acceptReveal` receives current/next exact flags. A cells guided winner refused by the apply table ends that pass; local acceptance retains `next.score < spec.max`. MS06c1 transports null/inert metadata with no production draw; MS06c2 draws once and activates all stages, including strategy `options.target` for signs. No sign-only intermediate policy, new RNG stream or post-exact polishing. |
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
| Greater-Than Normal remains honest without hiding CV6 | MS05e, MS06a/b/c, MS18d/e; CV6-01/S-OD1 | diagnosis first, unchanged CV6, literal-seed comparisons and Easy/Hard/Expert controls, fixed fallback |
| Scores are sought across the band | MS02, MS06a/b/c1/c2/d, MS18a; R6/R7/R23 | one target, explicit strategy/sign connection, guarded all-stage policy, both positions, isolated/matched comparisons |
| Honest chain/depth labels | MS07a/b/c; R9/R10 | shortest represented proof, enforced windows, measured C |
| Named techniques replace generic proofs | MS08a/b/c, MS09a/b, MS10a/b, MS11a/b/c, MS12, MS13a/b/c, MS14a/b/c, MS15a/b, MS16; R11-R19 | each algorithm, soundness/coverage, full B |
| Old puzzles/claims/history stay honest | MS04 and introducing tasks, MS17a/b; R20/R22 | separate references, cache 3, history 1 and compatible imports |
| Availability/cost are measured and published honestly | MS07d/e, MS18a/b/c/d/e; R24 | complete matrices, errors retained, no intermediate pruning |
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
| Post-acceptance Greater-Than repair | MS05e; tested target forwarding MS06b/c2; final verification MS18d/e | CV6-01 / S-OD1 |
| S1.2 / R6/R7 | MS06a/b/c1/c2/d | SA1-Q-S4, SA2-Q-S03, AC01; FS12-FS16/FS20 |
| S2.2 / R9/R10 | MS07a/b/c/d/e | SA1-Q-S1, SA2-Q-S04, PROC-S1 |
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

**Never two heavy/timing runs at once on this machine.** Pentomino is developed in parallel.
Before a heavy gate, announce to the orchestrator: task/gate, exact shard/cases, expected duration and
output paths. Wait for the shared-machine slot before starting. Release the slot on completion/failure.
No overlapping quick runs inside this checkout either.

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

### Gate ownership

| Gate | Owner | Required command / result |
|---|---|---|
| GS-before | MS02 | `node tests\soak.js --variant=<id> --level=<level> --count=12 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\MS02\<id>-<level>.json`; all 17 cells below |
| GG | MS04, MS05r6a, MS06c2, MS07b/c, MS08a/b/c, MS09a/b, MS10a/b, MS11a/b/c, MS12, MS13c, MS14b, MS15b, MS16 | Complete E 520-key recording; inspect intended differences before write/check. Recovery always records final-source E; b1/r3/r4 has no independent GG acceptance. Later selectors refresh if the default changes. Check-only: MS05r6b, MS06c1, MS07e, MS18d. |
| GR | Same behavior owners, plus MS05a, MS06c1 and MS17b | After r6a: complete E five-wire/fourteen-analysis record/merge/write/check; G09-G13 wires, G01-G14 analyses. Earlier four-wire evidence stays historical. r6b checks current merges. MS06c1 permits only target metadata, not changed puzzles/ratings/old operations. |
| GH | MS04 if affected; MS07b/c, all introducing/enhanced-proof tasks through MS16 | B bounded real sources, E write/check for every affected ID. No GH for inactive kernels; MS14c changes no finder. |
| GQ-first | MS07e, merger prepared in MS07d | All Q135 cells, `--jobs=4`, per-cell JSON/markdown, checked complete merge; checkpoint-only report, no support changes. |
| GD | MS04; MS05r6b; MS07e; MS17b; MS18e | Bounded difficulty coverage below; historical MS04 also ran killer/greater-than. MS05r2/MS07d use only fast fake-worker `--filter="qualification:"`. Post-selection b3 owns early I5/CV3/refusals; r6b closes its named outstanding CV3 list. MS18e reruns current-source selectors; MS14c is corpus-free. MS05e owns GD-CV6 separately. |
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
| GP-cost | MS07c, MS08a/b/c, MS09a/b, MS10a/b, MS11a/b/c, MS12, MS13c, MS14b, MS15b, MS16 | `node tests\pattern-cost.js --ids=<owned-ids> --runs=20 --json=<owned-evidence>`; real positive/negative cases, work/cap/latency records, no timing assertion in quick tests. MS07c owns the split-ID recording moved from MS07b. |
| GP | MS13c and MS15b affected cells; MS18d entire final offered matrix | `node tests\perf.js --variant=<id> --level=<level> --runs=50 --warmup=0 --seed=7000 --gate`; final aggregate >=90%, all misses visible. Project before launch. Unsafe commands become named cost items, not automatic new tooling tasks; continue other cells without claiming an incomplete matrix passed. |
| GS cap | MS05r4 (absorbed MS05d), repeated MS18b | Six cells x 64/128/256/none, 12 requests each, seed 20260101: 288 primary requests. r4 selected 256; the final changed winner needs the recorded owner decision. Closure diagnostics never become selecting cells. |
| Mega hell1 / final deep | MS07b extends r5m; MS18e final-source closure | MS07b preserves fourteen additional hell1 occurrences/relations under the same quick/deep rule. Final current-source inventory: 28 Nightmare/hell1 occurrences, one per locked request. MS18e's offered mega CV3 cells run live, one locked cell at a time as in B1, with deep occurrence ids only as cross-references; no CV3 record-provider/reuse route, deep generation in CI or blanket per-technique deep rerun. |
| GS-CV6 / GD-CV6 | MS05e | Diagnosis first; literal Normal seeds 300-319/7000-7039, Easy/Hard/Expert 300-319, matched repeats per task; fixed pool from 4/8/16. After MS05b3 use `--suite=greater-than --filter="> <level>: <count> puzzles > CV6:"` and I5 equivalents: 18 existing assertions, selected total 1 each, unchanged seeds/counts/CV6. Keep the leading boundary. Announce, lock, jobs 1/no --jobs, 540-second shards; no whole-corpus invocation. |
| GG/GR/GH-CV6 | MS05e | Task's exact Greater-Than recipe. Complete current-source publication envelopes, but only 40 Greater-Than hash records, G11/G12 wire/analysis and Greater-Than help IDs may change; all other entries are invariant controls. Publish wire before recording analysis. |
| GS target | MS06a before / MS06d after | All 17 cells before/after MS06c1 transport + atomic MS06c2 activation; retain isolated comparison and report every hit loss. |
| GS window | MS07c, repeated MS18b | Three Nightmare cells x C4/C6, 12 requests each; more exact hits, tie 6. |
| GS Hell 1 pilot | MS07b; MS07c repeats only if default C changes | `node tests\soak.js --variant=classic9 --level=hell1 --from=0 --count=2 --total-count=2 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\<task>\hell1-pilot.json`; exact two-request shard (bare --count=2 runs at least five at HEAD). Jobs 1/no --jobs; 540 s ceiling. Project unchanged 20-request GD/40-request GQ cost; pilot is not selection evidence. |
| GS-after | MS18a | All 17 original cells; current vs old reference-qualified cohorts, not old score-only exactness. |
| GQ-final | MS18c after MS18b reconfirmation/owner action | Same Q135/jobs 4 protocol; archive v2 then publish live table/support arrays together; no tuning. |

GD: per-puzzle I5 and `digLevel` correctness contracts must pass; performance/availability failures
are recorded and routed under S-OD4, not repaired by lowering assertions. GQ worker errors or missing replies fail the run; hidden verdicts
do not. The 40/100-request protocol and p95 budgets stay intact.
GP: a scoped cell's exit 1 can be a recorded timing miss, but all cells must still be measured and the
aggregate assessed. A crash/invalid result is not merely a timing miss. Do not silently relax targets.
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
Never change `BUDGET_MS` or call failed GD green. Release gates remain unsatisfied until honestly
disposed of; changing one requires the owner. CV6's target/repair remain S-OD1; its timing-only stop
is superseded by S-OD4.

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
| MS05 (combined) | Accepted: retained MS05b1, MS05r1-r4, MS05r5p, MS05r5, MS05r5m, MS05b3, MS05r6a, MS05r6b, MS05r6c in one commit (S-OD2); the pause commit `a7f6660` was not green and was not acceptance | recovery developers 2026-11-13/14 + reviews | about 13,400 (developers of MS05r1-MS05r6c and the fix rounds; MS05b1 not recorded) | `difficulty-v3 MS05: required exactness with measured bounded recovery` |
