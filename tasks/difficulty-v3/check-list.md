# Difficulty v3 — task index and overall acceptance

**Scope:** the accepted full Sudoku plan S0-S3, all six S3 groups and S2.3: required-tier exactness,
one band target through generation, the expanded solver, and rating/cache version 3.
**Status:** the first tranche is accepted and implementation is under orchestration. All remaining
executable files are written for cross-review; dispatch still requires the orchestrator's review.
Only the orchestrator changes Done marks, Execution logs and the execution summary.
**Authority:** `docs/difficulty-v3/clarifications.md` Part F (AC01 accepted) and Part G at `2c665bb`;
owner acceptance, 2026-11-12 11:50. No open design question remains.
**Traceability:** [accepted report](../../docs/difficulty-v3/report-detailed.md), R1-R24;
[answers](../../docs/difficulty-v3/clarifications.md), parts A-G.
**Execution:** claude-sonnet-5.5 developers, one active task in this repository; branch `rating-v3`;
the orchestrator reviews and commits, nothing pushed.
**Anchor baseline:** `2c665bb` (its application code equals the analysed `6abcb9f`). Implementation
advances from it. Task anchors quote source text as well as a line number to find moved code.

The pack uses execution-order IDs: **MS03 is tooling (old report MS04); MS04 is orders (old MS03)**.
The accepted order is unchanged. Historical analyst documents/answers keep their old labels.
Large parent rows are milestones, not dispatches or extra commits. Their suffixed files are
independently accepted 20-60-active-minute tasks. Gate wall time is additional and estimated in each file.

Checkboxes mean implementation accepted and committed, never merely "task file exists".
An accepted prerequisite means its implementation and log are committed, not just visible on disk.

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
| [ ] | MS05 | MS05a-MS05d | Required exactness (parent) | MS04 | split | Generator | M5 | 8-11 |
| [x] | MS05a | [MS05a](MS05a-exactness-transport-and-messages.md) | Exactness transport/messages | MS04 | M, 40-55 min | Generator UI | M5a | 8 |
| [ ] | MS05b | [MS05b](MS05b-required-keeper-and-search.md) | Required keeper/search activation | MS05a | M, 55-60 min | Generator engine | M5b | 9 |
| [ ] | MS05c | [MS05c](MS05c-shallow-budget-instrumentation.md) | Shallow allowance/work instrumentation | MS05b | M, 45-60 min | Generator/tools | M5c | 10 |
| [ ] | MS05d | [MS05d](MS05d-select-shallow-budget.md) | Measure/select common allowance | MS05c | S, 25-40 min | Evidence | M5 | 11 |
| [ ] | MS06 | MS06a-MS06d | One target through all stages (parent) | MS05d | split | Generator | M6 | 12-15 |
| [ ] | MS06a | [MS06a](MS06a-pre-target-evidence.md) | Isolated pre-target evidence | MS05d | S, 20-30 min | Evidence | M6a | 12 |
| [ ] | MS06b | [MS06b](MS06b-target-policy-primitives.md) | Inactive target policy primitives | MS06a | M, 35-50 min | Generator engine | M6b | 13 |
| [ ] | MS06c | [MS06c](MS06c-target-through-all-stages.md) | Atomic three-stage target activation | MS06b | M, 55-60 min | Generator engine | M6c | 14 |
| [ ] | MS06d | [MS06d](MS06d-target-comparison.md) | Isolated target comparison | MS06c | S, 20-30 min | Evidence | M6 | 15 |
| [ ] | MS07 | MS07a-MS07e | Windows/selection/checkpoint (parent) | MS06d | split | Solver/tools | M7 | 16-20 |
| [ ] | MS07a | [MS07a](MS07a-window-kernels-and-pattern-metrics.md) | Window kernels and pattern metrics | MS06d | M, 50-60 min | Shared solver/tools | M7a | 16 |
| [ ] | MS07b | [MS07b](MS07b-register-chain-windows.md) | Chain/depth ID integration | MS07a | M, 55-60 min | Shared solver | M7b | 17 |
| [ ] | MS07c | [MS07c](MS07c-select-chain-cutoff.md) | Measured chain cutoff | MS07b | S, 25-35 min | Evidence | M7c | 18 |
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
| [ ] | MS11a | [MS11a](MS11a-rectangle-types-three-four.md) | UR types3/4 | MS10b | M, 50-60 min | Shared wings | M11a | 28 |
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
| [ ] | MS17a | [MS17a](MS17a-history-version-marker.md) | History marker, store1 | MS16 | S-M, 30-45 min | Generator UI | M17a | 41 |
| [ ] | MS17b | [MS17b](MS17b-version-cache-and-freeze.md) | Rating/cache3 and limit freeze | MS17a | M, 50-60 min | Integration | M17 | 42 |
| [ ] | MS18 | MS18a-MS18e | Final evidence (parent) | MS17b | split | Evidence/release | M18 | 43-47 |
| [ ] | MS18a | [MS18a](MS18a-final-matched-soak.md) | Matched final soak | MS17b | S, 25-35 min | Evidence | M18a | 43 |
| [ ] | MS18b | [MS18b](MS18b-recheck-cap-and-window.md) | Cap/window final rechecks | MS18a | S, 25-40 min | Evidence | M18b | 44 |
| [ ] | MS18c | [MS18c](MS18c-qualify-and-publish-offers.md) | Qualify and publish offers | MS18b + owner actions | M, 35-50 min | Qualification | M18c | 45 |
| [ ] | MS18d | [MS18d](MS18d-performance-and-final-hashes.md) | Final performance/hashes | MS18c | S-M, 25-40 min | Evidence | M18d | 46 |
| [ ] | MS18e | [MS18e](MS18e-release-evidence-closure.md) | Final correctness/release evidence | MS18d | S, 25-40 min | Release evidence | M18 | 47 |

S/M/L mean approximately 100-300 / 300-800 / 800-1,600 changed lines including tests, excluding bulky
generated evidence. Time allowances are active development, not unmeasured heavy-gate wall time.
Do not dispatch an unsplit task that cannot reasonably fit the 20-60-minute active-work target.

## 2. Ready waves and exclusive ownership

All47 executable waves are sequential; keep the orchestrator's current accepted boundary.
All four tooling subpacks precede MS04. MS05a transports the existing flag; MS05b activates
requiredness after MS04. MS06a captures before-data, MS06b is inactive, MS06c connects all stages.
MS07a kernels precede registration MS07b, selection MS07c, merger MS07d and first GQ MS07e.
MS13a graph stays inactive until consumers MS13b and activation MS13c. MS14a/MS15a kernels likewise
precede their registrations. Final GQ is MS18c, after all S3, MS17b and final rechecks MS18b.
No intermediate pruning. Parent milestones are not additional waves or commits.

The following are serial ownership transfers, not permission for parallel edits:

| Area / exclusive files | Owners in order |
|---|---|
| `generator/js/engine/difficulty.js`, tier/reference suite | MS01, MS04, introducing tasks below, MS17b |
| `generator/tests/soak.js`, diagnostic fixture/suite | MS02, MS05b/c, MS06c, MS07b; evidence tasks read only |
| Replay recorders, projection/ledger helper and tool suite | MS03a; later output-changing tasks use them, not redesign them |
| `player/tests/tools/make-technique-examples.js`, its tool suite | MS03b, MS03c; later new-ID tasks supply sources/use the tool |
| `player/js/ui/help.js`, help/text-board suites | MS03c, affected new-ID tasks |
| `generator/tests/perf.js`, `tests/fixtures/perf-helper.js`, ledger helper | MS03d; later owners use bounded modes |
| Order/counter fixes in cage/ineq/fish/subset engines | MS04 |
| Fish engine/suite | MS08a/b/c, MS09a/b |
| Subset engine/suite | MS14a/b after MS04; MS14c changes existing Killer tests only |
| Digger | MS05b/c/d (d default only), MS06b/c |
| Events/pipeline/result view/app | MS05a transport, MS05b activation, MS05c work, MS06c target |
| Chain engine/proof suites | MS07a/b/c (c default only), MS12, MS13a/c |
| Wing engine/uniqueness suites | MS10a/b, MS11a/b/c |
| New ALS engine/suite | MS15a/b, MS16 |
| Generator/Player i18n/proof display | introducing task; grouped consumers MS13b |
| Pattern-cost tool/suite | MS07a, scoped adapter MS14b |
| Qualifier/record helper/suite | MS05b predicate, MS07d merger; MS07e/MS18c use it |
| Cache/history/version | MS17a history; MS17b rating/cache/reference freeze |
| Live qualification table, v2 archive, support lists | MS18c only |
| Qualification-authorized performance targets | MS18d only; no post-GP relaxation |
| Regression/replay fixtures and `player/js/ui/help-examples.js` | task causing the intentional change, using its gate; no separate fixture writer |
| Living guides/designs and test HTML lists | the current task only, for the facts/files it changes |

The task's detailed file list controls. An unlisted file needs orchestrator assignment; report a defect
outside the scope rather than quietly taking another task's work.

### Per-task protocol and commits

1. Orchestrator confirms branch `rating-v3` and the accepted prerequisite commits, reviews the task
   file, then dispatches one named task (including a suffix where present).
2. Developer reads `AGENTS.md`, this checklist and the task. Implement only its scope; run its targeted
   checks and owned gates, recording actual commands, exit codes, counts and durations.
3. **Developer never stages, commits, stashes, resets, pushes or switches branches; never edits the
   task pack, checklist or Execution log.** Do not change unrelated work in this shared checkout.
4. Orchestrator re-runs the task's quick checks, reviews the diff and acceptance IDs, fills the empty
   Execution log and summary, then commits once per accepted dispatch on `rating-v3`:
   `difficulty-v3 MSnn: <title>` (use `MS03a`, etc. for a suffix). Nothing is pushed.
5. Heavy gates are not routinely run twice. Orchestrator reviews their complete artifacts, exit codes,
   source identity and coverage; repeat only for a changed candidate or a recorded evidence defect.
6. A rejected task gets a bounded fix round. An unexpected baseline failure is reported, not hidden by
   rewriting assertions. A later source change invalidating evidence requires replacement evidence.
7. Each split parent is marked done after all its suffixes are accepted; no additional parent commit.

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
No parallel translation/fixture writer owns B. L means all eight source lists in section3.

For each new ID: fixed order/weight/baseCost/group/scope/uniqueness, exact nonempty Finding, both
apps' name/description/actual subtype keys in EN+VI, two real positive exact-Finding fixtures and
one negative (scoped equivalents for leftovers), independent completion checks and a real Player
example. Uniqueness fixtures prove uniqueness, not just one completion. Keep all existing random
soundness inputs/minFirings; add deterministic real supplemental states if rare patterns need them.
No all-cell32-bit mask, input-state mutation, stale state-identity cache or swallowed cancellation.

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

At most four distinct discovery batches of12 attempted requests per introducing task (48 total),
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

Pattern-cost recordings use the MS07a CLI,20 runs/case, both positive and negative fixtures.
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

- While developing use the task's combined `--suite=` selector. At acceptance run both quick sets,
  from their respective app directories: `node tests\node-runner.js`.
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
| Confirmed status rows / Part D | Oracle tierUsed is a proxy; counter reset per call; task-owned expectation refreshes; all 16 errata accepted |

Tool CLI/ledger names below are implementation contracts of this pack, not new scoring policies.
The first three groups keep production generation, scoring, orders, support lists and stored data unchanged.

## 5. Business traceability

| Need | Tasks / resolutions | Acceptance focus |
|---|---|---|
| Hard and other nonvacuous levels need their tier | MS01, MS04, MS05a/b; R1-R4 | canonical/reference agreement, keeper and wire exactness |
| Continued search has a justified cost | MS05c/d, MS18b; R5/R23 | exact allowance counting and fixed selection rule |
| Scores are sought across the band | MS02, MS06a/b/c/d, MS18a; R6/R7/R23 | one target, both positions, isolated/matched comparisons |
| Honest chain/depth labels | MS07a/b/c; R9/R10 | shortest represented proof, enforced windows, measured C |
| Named techniques replace generic proofs | MS08a/b/c, MS09a/b, MS10a/b, MS11a/b/c, MS12, MS13a/b/c, MS14a/b/c, MS15a/b, MS16; R11-R19 | each algorithm, soundness/coverage, full B |
| Old puzzles/claims/history stay honest | MS04 and introducing tasks, MS17a/b; R20/R22 | separate references, cache3, history1 and compatible imports |
| Availability/cost are measured and published honestly | MS07d/e, MS18a/b/c/d/e; R24 | complete matrices, errors retained, no intermediate pruning |
| Every changed output is reproducible | MS03a/b/c/d and each E owner; R21 | bounded recorders, fixed manifests, explicit differences |

### Plan-to-executable-task traceability

| Plan / resolutions | Executable owners | Clarification authority |
|---|---|---|
| S0.1 / R1/R2/R20 | MS01, MS04, MS17b | SA2-Q-S01/S02/S10, SA1-Q-S2/S7 |
| S0.2 / R23 | MS02, MS05c, MS06a/d, MS18a | PROC-S1, AC01 |
| S2.1 / R8/R21 | MS03a/b/c/d, MS04 | AUTH-S2, PROC-S1 |
| S1.1 / R3-R5 | MS05a/b/c/d | SA1-Q-S3/S7, SA2-Q-S06/S12 |
| S1.2 / R6/R7 | MS06a/b/c/d | SA1-Q-S4, SA2-Q-S03, AC01 |
| S2.2 / R9/R10 | MS07a/b/c/d/e | SA1-Q-S1, SA2-Q-S04, PROC-S1 |
| S3 group1 / R11 | MS08a/b/c | confirmed R10 costs/limits, Part D |
| S3 group2 / R12 | MS09a/b | SA2-Q-S05/S08/S11 |
| S3 group3 / R13/R14 | MS10a/b, MS11a/b/c | SA2-Q-S05/S08/S11 |
| S3 group4 / R15/R16 | MS12, MS13a/b/c | Part D grouped-proof correction |
| S3 group5 / R17 | MS14a/b/c | SA2-Q-S09/S11 |
| S3 group6 / R18/R19 | MS15a/b, MS16 | SA2-Q-S05/S08/S11 |
| S2.3 / R20/R22 | MS17a/b | SA1-Q-S6, SA2-Q-S07/S10 |
| Final evidence / R5/R9/R23/R24 | MS18a/b/c/d/e | AUTH-S1, SA1-Q-S5, AC01 |

## 6. Technical acceptance — every task

- Its B/T acceptance IDs have evidence; targeted suites and both quick sets pass at the accepted boundary.
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

## 7. Gates and evidence

### Scheduling and recording

**Never two heavy/timing runs at once on this machine.** Pentomino is developed in parallel.
Before a heavy gate, announce to the orchestrator: task/gate, exact shard/cases, expected duration and
output paths. Wait for the shared-machine slot before starting. Release the slot on completion/failure.
No overlapping quick runs inside this checkout either.

Run each bounded command attached and monitored. Stop/investigate any invocation reaching ten minutes;
do not simply rerun it or discard slow requests. Complete larger matrices through bounded shards.
A missing outcome is not a pass. Raw evidence records command, code/source identity, dirty state,
Node/machine, worker count, config, seeds, counts, duration, exit code and differences.
Use task-relative evidence directories, for example `docs/difficulty-v3/evidence/MS07/`.

Commands below run from `generator/` except GH (from `player/`). Replace task/variant/level/file
placeholders explicitly. Execute one bounded shard at a time, not an unbounded whole-matrix shell loop.
New flags are available only after the indicated tooling prerequisite is accepted.

### Gate ownership

| Gate | Owner | Required command / result |
|---|---|---|
| GS-before | MS02 | `node tests\soak.js --variant=<id> --level=<level> --count=12 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\MS02\<id>-<level>.json`; all 17 cells below |
| GG | MS04, MS05b/d, MS06c, MS07b/c, MS08a/b/c, MS09a/b, MS10a/b, MS11a/b/c, MS12, MS13c, MS14b, MS15b, MS16 | Complete E520-key recording; inspect intended differences before write/check. Selection tasks refresh only if default changed. Check-only owners: MS07e and MS18d. |
| GR | Same behavior owners, plus MS05a/c and MS17b | Complete E four-wire/fourteen-analysis record/merge/write/check; intended replay/steps pins reviewed in the owner. |
| GH | MS04 if affected; MS07b/c, all introducing/enhanced-proof tasks through MS16 | B bounded real sources, E write/check for every affected ID. No GH for inactive kernels; MS14c changes no finder. |
| GQ-first | MS07e, merger prepared in MS07d | All Q135 cells, `--jobs=4`, per-cell JSON/markdown, checked complete merge; checkpoint-only report, no support changes. |
| GD | MS04; MS05d; MS07e; MS14c; MS17b; MS18e | `node tests\node-runner.js --suite=difficulty`; MS04 adds killer,greater-than; MS14c runs killer only. MS07d runs fast fake-worker `--filter="qualification:"`. MS18e also owns individually bounded I5 selectors for killer/jigsaw/greater-than/extra-regions/wordoku and variants CV3, corrected in MS05b. |
| GP-cost | MS07b, MS08a/b/c, MS09a/b, MS10a/b, MS11a/b/c, MS12, MS13c, MS14b, MS15b, MS16 | `node tests\pattern-cost.js --ids=<owned-ids> --runs=20 --json=<owned-evidence>`; real positive/negative cases, work/cap/latency records, no timing assertion in quick tests. |
| GP | MS13c and MS15b affected cells; MS18d entire final offered matrix | `node tests\perf.js --variant=<id> --level=<level> --runs=50 --warmup=0 --seed=7000 --gate`; final aggregate >=90%, all individual misses reported. |
| GS cap | MS05d, repeated MS18b | Six cells x64/128/256/none,12 requests each, seed20260101; fixed selection rule, no guessed value. |
| GS target | MS06a before / MS06d after | All17 cells before/after atomic MS06c; retain isolated comparison and report every hit loss. |
| GS window | MS07c, repeated MS18b | Three Nightmare cells xC4/C6,12 requests each; more exact hits, tie6. |
| GS-after | MS18a | All17 original cells; current vs old reference-qualified cohorts, not old score-only exactness. |
| GQ-final | MS18c after MS18b reconfirmation/owner action | Same Q135/jobs4 protocol; archive v2 then publish live table/support arrays together; no tuning. |

GD: I5 and `digLevel` contracts must pass; intermediate requiredness availability failures are recorded,
not repaired by lowering assertions. GQ worker errors or missing replies fail the run; hidden verdicts
do not. The 40/100-request protocol and p95 budgets stay intact.
GP: a scoped cell's exit 1 can be a recorded timing miss, but all cells must still be measured and the
aggregate assessed. A crash/invalid result is not merely a timing miss. Do not silently relax targets.
GS `--no-gate` suppresses the tool's failure exit, never the recorded invariant failures.

### E — exact bounded recorder routes (MS03 contracts)

E is the mandatory complete recipe referred to by task files, not permission to stop after their
example first shard. Substitute the owning task ID for `<task>`. Create its project-relative
directories before writing. Run one bounded command at a time; all commands here are jobs1 and
do not accept --jobs. Check every exit code. Typical planning allowance is1-120 seconds/shard,
5-35 minutes for GR,10-90 minutes for full E; actual durations and incomplete outcomes are recorded.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Do not invoke an unmeasured unbounded full-corpus run merely to reduce command count.

GR wire shard, one of G09-G12:

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\<task>\wire\G09.json
```

GR analysis shard, one of G01-G14:

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

Complete GG manifest (four five-seed shards per cell, from indexes0/5/10/15; split smaller only
when necessary, retaining all20 identities and avoiding duplicate completed rows):

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
Wire IDs G09-G12; analysis IDs G01-G14. Read their unchanged request objects from the fixtures;
never replace hidden-level requests with another level. Input/reference history stays unchanged.

GH from Player, after bounded source acquisition in B:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=<affected-ids> --sources=tests\artifacts\difficulty-v3\<task>\sources.json --max-puzzles=16 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=<affected-ids> --sources=tests\artifacts\difficulty-v3\<task>\sources.json --max-puzzles=16 --max-hints=400 --check
```

Use the task's narrower cap8 where specified;16 is the multi-ID recipe. Existing IDs' default
curated sources can also be checked with --ids/--max-puzzles/--check, without discovery.
Check mode writes nothing. Source-record mode is not a partial catalogue write. Old unselected IDs
still need to pass the complete Player help suite; acquire/refresh other affected IDs as necessary.

### Q — qualification manifest and protocol

Both checkpoints cover the cross product of these15 IDs and all9 global levels:

```text
classic4 classic6 classic9 mega12 mega16 diagonalX hyper jigsaw9
killer greaterThan samurai sohei butterfly flower wordoku
veryEasy easy normal hard expert master nightmare hell1 hell2
```

Use one complete cell per invocation unless a larger proven-bounded shard preserves the same
protocol. Jobs is always4, explicitly `--jobs=4`; never run two qualifier invocations together.
Seed base20260601, FNV tag variant/level/index; this is not GS's20260101. First40, expand30-35 hits
to100, offer>=36/40 or>=90/100 plus p95; 120000ms request guard; p95 budgets2/10/30 seconds by
<=36/<=81/larger cells. Protocol-proved early hidden stops are valid; arbitrary truncation is not.
Capture every completed in-flight request after an early stop. Worker/IPC failure fails the run.
MS07d merge checks all135 cells, source/tool/Node/jobs/protocol, request keys/seeds and summaries.

```powershell
node tests\qualify.js --variant=<id> --level=<level> --jobs=4 --json=..\docs\difficulty-v3\evidence\<task>\qualification\<id>-<level>.json --markdown=..\docs\difficulty-v3\evidence\<task>\qualification\<id>-<level>.md
node tests\qualify.js --merge=..\docs\difficulty-v3\evidence\<task>\qualification --jobs=4 --json=..\docs\difficulty-v3\evidence\<task>\complete.json --markdown=..\docs\difficulty-v3\evidence\<task>\table.md
```

No --probe or diagnostic overrides. First checkpoint MS07e never touches live offers. Final MS18c
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
