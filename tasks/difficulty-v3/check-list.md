# Difficulty v3 — task index and overall acceptance

**Scope:** the accepted full Sudoku plan S0-S3, all six S3 groups and S2.3: required-tier exactness,
one band target through generation, the expanded solver, and rating/cache version 3.
**Status:** task-pack authoring resumed; MS01, MS02 and MS03a-MS03d are written for review in this
tranche. MS04-MS18 are indexed, not yet dispatchable. No implementation has started.
**Authority:** `docs/difficulty-v3/clarifications.md` Part F (AC01 accepted) and Part G at `2c665bb`;
owner acceptance, 2026-11-12 11:50. No open design question remains.
**Traceability:** [accepted report](../../docs/difficulty-v3/report-detailed.md), R1-R24;
[answers](../../docs/difficulty-v3/clarifications.md), parts A-G.
**Execution:** claude-sonnet-5.5 developers, one active task in this repository; branch `rating-v3`;
the orchestrator reviews and commits, nothing pushed.
**Code base:** `2c665bb` (application code unchanged from the analysed `6abcb9f`). Task anchors quote
the source text as well as a line number, so later developers can find moved code.

The pack uses execution-order IDs: **MS03 is tooling (old report MS04); MS04 is orders (old MS03)**.
The accepted order is unchanged. Historical analyst documents/answers keep their old labels.
MS03 is split into four independently accepted 20-60-active-minute tasks, not one large dispatch.
Later large parent rows will likewise be split before their files are dispatched.

Checkboxes mean implementation accepted and committed, never merely "task file exists".
An accepted prerequisite means its implementation and log are committed, not just visible on disk.

## 1. Task index

| Done | ID | File | Title | Depends on | Size | Owner role | Milestone | Wave |
|---|---|---|---|---|---|---|---|---:|
| [x] | MS01 | [MS01](MS01-tier-and-reference-api.md) | Tier algebra and reference floor API | accepted specification | M, 45-60 min | Generator engine | M1 reference available | 1 |
| [ ] | MS02 | [MS02](MS02-baseline-diagnostics.md) | Baseline diagnostics and matched manifest | MS01 | M, 45-60 min + GS | Tooling | M2 baseline captured | 2 |
| [ ] | MS03 | MS03a-MS03d below | Bounded evidence tooling (parent milestone; no separate commit) | MS02 | split | Tooling | M3 tooling ready | 3-6 |
| [ ] | MS03a | [MS03a](MS03a-replay-recorders.md) | Bounded wire/analysis golden recorders | MS02 | M, 45-60 min + checks | Generator tooling | M3a replay evidence | 3 |
| [ ] | MS03b | [MS03b](MS03b-bounded-help-examples.md) | Curated, bounded help-example tooling | MS03a | M, 45-60 min + checks | Player tooling | M3b bounded examples | 4 |
| [ ] | MS03c | [MS03c](MS03c-jigsaw-help-snapshots.md) | Region-aware Jigsaw snapshots | MS03b | S-M, 30-45 min | Player help | M3c Jigsaw ready | 5 |
| [ ] | MS03d | [MS03d](MS03d-bounded-regression-hashes.md) | Selected hash records and complete merge | MS03c | M, 45-60 min + GG check | Generator tooling | M3d bounded hashes | 6 |
| [ ] | MS04 | MS04-orders-and-requiredness.md — next tranche | Monotone orders, counter reset, derived certificate | MS03d | M; subdivide if needed | Shared solver | M4 prefix invariant | 7 |
| [ ] | MS05 | MS05-exactness-and-shallow-search.md — next tranche | Keeper, exactness consumers, warnings, measured cap | MS04 | L; split before dispatch | Generator | M5 required exactness | 8 |
| [ ] | MS06 | MS06-target-through-generation.md — next tranche | Target through dig/refine/local search | MS05 | L; split before dispatch | Generator | M6 coherent target | 9 |
| [ ] | MS07 | MS07-chain-windows.md — next tranche | Chain/depth IDs, measured cutoff, checkpoint | MS06 | L; split before dispatch | Shared solver | M7 split chains | 10 |
| [ ] | MS08 | MS08-single-digit-patterns.md — next tranche | Skyscraper, kite, empty rectangle | MS07 | L; split before dispatch | Shared solver | M8 S3 group 1 | 11 |
| [ ] | MS09 | MS09-finned-fish.md — next tranche | Finned X-Wing/Swordfish, sashimi | MS08 | L; split before dispatch | Shared solver | M9 S3 group 2 | 12 |
| [ ] | MS10 | MS10-remote-pairs-and-wxyz.md — next tranche | Remote pairs and WXYZ-Wing | MS09 | L; split before dispatch | Shared solver | M10 S3 group 3a | 13 |
| [ ] | MS11 | MS11-uniqueness-patterns.md — next tranche | UR extensions and BUG+1 | MS10 | L; split before dispatch | Shared solver | M11 S3 group 3b | 14 |
| [ ] | MS12 | MS12-xy-chain.md — next tranche | Restricted XY-chain | MS11 | M-L; split if needed | Shared solver | M12 S3 group 4a | 15 |
| [ ] | MS13 | MS13-grouped-chains.md — next tranche | Grouped graph, proof validation and display | MS12 | L; split before dispatch | Solver/Player | M13 S3 group 4b | 16 |
| [ ] | MS14 | MS14-leftovers-and-cages.md — next tranche | Leftovers and existing Killer interactions | MS13 | L; split before dispatch | Shared solver | M14 S3 group 5 | 17 |
| [ ] | MS15 | MS15-als-xz.md — next tranche | ALS enumerator and ALS-XZ | MS14 | L; split before dispatch | Shared solver | M15 S3 group 6a | 18 |
| [ ] | MS16 | MS16-sue-de-coq.md — next tranche | Sue de Coq | MS15 | L; split before dispatch | Shared solver | M16 S3 group 6b | 19 |
| [ ] | MS17 | MS17-version-and-persistence.md — next tranche | Version/cache/history, fixed reference expectations | MS16 | M-L; split if needed | Integration | M17 version 3 frozen | 20 |
| [ ] | MS18 | MS18-final-evidence.md — next tranche | Rechecks, final qualification and publication | MS17 | M + gate time | QA/release | M18 complete evidence | 21 |

S/M/L mean approximately 100-300 / 300-800 / 800-1,600 changed lines including tests, excluding bulky
generated evidence. Time allowances are active development, not unmeasured heavy-gate wall time.
Do not dispatch an unsplit task that cannot reasonably fit the 20-60-minute active-work target.

## 2. Ready waves and exclusive ownership

All waves are sequential. MS01 is first, after its file is reviewed. MS02 needs the reference API.
All four tooling subpacks precede MS04, the first production output change. MS05 cannot activate
requiredness until MS04 establishes the prefix invariant. The first GQ is after MS07; the final GQ
is after all S3 work and MS17. No intermediate support-list pruning.

The following are serial ownership transfers, not permission for parallel edits:

| Area / exclusive files | Owners in order |
|---|---|
| `generator/js/engine/difficulty.js`, tier/reference suite | MS01, MS04, MS05, each introducing-technique task, MS17 |
| `generator/tests/soak.js`, diagnostic fixture/suite | MS02, MS05, MS06, MS07; MS18 evidence only unless a tooling defect is assigned |
| Replay recorders, projection/ledger helper and tool suite | MS03a; later output-changing tasks use them, not redesign them |
| `player/tests/tools/make-technique-examples.js`, its tool suite | MS03b, MS03c; later new-ID tasks supply sources/use the tool |
| `player/js/ui/help.js`, help/text-board suites | MS03c, affected new-ID tasks |
| `generator/tests/perf.js`, `tests/fixtures/perf-helper.js`, ledger helper | MS03d; later owners use bounded modes |
| `core/js/engine/tech-cage.js`, `tech-ineq.js`, `tech-fish.js`, `tech-subset.js` order/counter fixes | MS04; then fish MS08/MS09, subset MS14 |
| `generator/js/engine/digger.js`, events/pipeline, result view/app and consumers | MS05, MS06 |
| `core/js/engine/tech-chain.js`, chain/proof suites | MS07, MS12, MS13 |
| `core/js/engine/tech-wing.js`, wing/uniqueness suites | MS10, MS11 |
| New `core/js/engine/tech-als.js`, ALS suite | MS15, MS16 |
| Generator/Player i18n/proof display | owning new-technique task; grouped consumers MS13 |
| Cache/history and version assertions | MS17 |
| Live qualification table, archived v2 table, final support lists | MS18 only |
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
7. MS03 is marked done after MS03a-MS03d are accepted; it has no additional implementation commit.

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
| Hard and other nonvacuous levels genuinely need their tier | MS01/MS04/MS05; R1-R5 | canonical/reference agreement, keeper and wire exactness |
| Scores are sought across the band without sacrificing requiredness | MS02/MS06/MS18; R6/R7/R23 | one target, both positions, hit/time comparison |
| Named techniques replace over-rated generic proofs | MS07-MS16; R8-R19 | sound fixtures, own IDs/windows, complete help/i18n integration |
| Old puzzles/claims are not misrepresented | MS17; R20/R22 | historical expectations, cache purge, preserved history/imports |
| Availability and cost are measured honestly | MS02/MS05/MS07/MS18; R5/R9/R24 | complete manifests, errors in denominators, no hidden retuning |
| Every changed output is reproducible and reviewed | MS03 and all output owners; R21 | bounded recorders, unchanged historical inputs, explicit diffs |

## 6. Technical acceptance — every task

- Its B/T acceptance IDs have evidence; targeted suites and both quick sets pass at the accepted boundary.
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
| GG | MS04 and every output-changing task | Full default: `node tests\perf.js --update-hashes`, then `--check-hashes`, only when each fits the bound; otherwise MS03d's selected records and complete merge below |
| GR | Every affected output/solver task | Existing wire: `node tests\replay-fixtures.js` then `--check`; analysis: `node tests\replay-goldens.js --write` then `--check`; use the bounded ledger route below when necessary |
| GH | MS04 if examples change; MS07-MS16 | `node tests\tools\make-technique-examples.js ..\generator --ids=<ids> --sources=<curated.json> --max-puzzles=<n> --max-hints=400 --write`, then same inputs with `--check`; Player help/quick checks |
| GQ-first | MS07 | `node tests\qualify.js --variant=<id> --level=<level> --jobs=4 --json=..\docs\difficulty-v3\evidence\MS07\qualification\<id>-<level>.json --markdown=..\docs\difficulty-v3\evidence\MS07\qualification\<id>-<level>.md`; cover all 135 cells, merge complete checkpoint records, never publish live offers |
| GD | MS04, MS05, MS07, MS14, MS17/MS18 | `node tests\node-runner.js --suite=difficulty`; MS04 also `--suite=killer,greater-than` for intended order pins; MS14 `--suite=killer` for its variant regression |
| GP | MS13/MS15 affected cells; MS18 full final matrix | `node tests\perf.js --variant=<id> --level=<level> --runs=50 --gate`; record p50/p95/max and each miss; aggregate all intended cells against the existing >=90% rule |
| GS selections | MS05/MS06/MS07 | MS05: six cells x 64/128/256/none via `--shallow-cap=<n|none>`; MS06: 17 cells before/after target; MS07: three Nightmare cells x `--chain-window=4` and `6`, using the GS-before seed/count recipe |
| GS-after | MS18 | Same 17 cells, then R5 cap and R9 window rechecks; report per-cell hit losses, both positions and costs; stop before GQ-final if an approved selection rule changes the value in force |
| GQ-final | MS18 | Same 135-cell/four-worker qualifier protocol as GQ-first, under MS18 evidence paths; archive v2 and update live table/support lists only from complete final evidence |

GD: I5 and `digLevel` contracts must pass; intermediate requiredness availability failures are recorded,
not repaired by lowering assertions. GQ worker errors or missing replies fail the run; hidden verdicts
do not. The 40/100-request protocol and p95 budgets stay intact.
GP: a scoped cell's exit 1 can be a recorded timing miss, but all cells must still be measured and the
aggregate assessed. A crash/invalid result is not merely a timing miss. Do not silently relax targets.
GS `--no-gate` suppresses the tool's failure exit, never the recorded invariant failures.

### Exact bounded recorder routes (MS03 contracts)

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
# For an intended output change, use --write on each complete merge, then --check.
```

GG records, one combination and at most five of the fixed seed indexes:

```powershell
node tests\perf.js --hash-key=classic9/hard --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\<task>\hashes\classic9-hard-00.json
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\<task>\hashes --check-hashes
# Intended complete replacement:
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\<task>\hashes --update-hashes
```

The complete hash manifest is all 26 `perfTools.COMBOS` x all 20 `perfTools.SEEDS` = 520 keys.
A partial check says exactly how many keys it checked; a write/complete merge rejects missing,
duplicate, unexpected or mismatched-source records. No current `--variant`/`--level` claim is made
about old hash modes; MS03d adds the explicit hash selectors.
Hash-corpus requests for a subsequently hidden level are diagnostic only and retain the same keys/seeds;
the helper may temporarily enable that requested level and must restore its support array afterwards.
This never republishes an offered level.

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
Any final cap/window re-selection is escalated before GQ-final; an inserted change must repeat its GG/GR/GH/GD.

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
