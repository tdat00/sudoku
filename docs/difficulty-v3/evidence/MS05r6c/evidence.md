# MS05r6c evidence: CI for the quick tier

CI closure of the S-OD2 recovery (S-OD4, CV6-03 sub-question 2): both workflows now run the bounded quick tier of the
v3 recovery, in jobs that each fit 30 minutes by a stated projection, and the deep and manual evidence that CI used to
claim by running it is named as replaced by reviewed offline records. **Everything here was run locally. No GitHub
Actions run, dispatch, push or deployment happened, and no remote pass is claimed**: the orchestrator verifies the jobs
on the pull request, and their actual durations are to be recorded next to the projections below, never in their place.

Tree: `rating-v3` at `92a7693` plus the uncommitted recovery tree plus this task (and MS05r6b's changes). Node v26.13.0,
Windows x64, AMD EPYC 7763 (16 cores, 64 GiB), time factor 2 (`CI` and `SG_TIME_FACTOR` unset). Paths are repository
relative; Generator commands run from `generator/`, Player commands from `player/`.

## Identity

| Identity | Value |
|---|---|
| Generator quick fingerprint (`sourceHash`, 159 files), final | `6b40d218629b4a75b2845a4d1a3e0835a764a5dfca42f33ac657a15e9909b1fb`: `generator-inventory.json`, the 7 shard results and the final `check` listing (`check/generator-all.json`) agree |
| Player quick fingerprint (130 files), final | `547e4a4e1f0163eed61ba5c2a97d0f7ca56e511f28ba74ad31da56c27edb1a90`: `player-inventory.json`, the result and `check/player-all.json` agree |
| MS05r6b's final fingerprints (the quick rows this task replaces) | Generator `7d3102d3…`, Player `1d0724c3…`. They differ here **only** by documents: the Generator by `AGENTS.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` and `generator/design.md`, the Player by the first three (no file added or removed, no engine, suite, fixture or test file, no manual suite). The 3,262 and 1,683 test keys (suite, ordinal, full name, kind, skipped) are identical to r6b's final inventories, compared one by one |
| First pass of this task (history, superseded) | Generator `7949138f…`, Player `fbb759b0…`: run after the first set of guide edits and before SA1's binding addendum (IR14, IR15, IR19). Kept unchanged in `superseded-pass1/` (inventories, preflights, results, reconciliation, logs, run records); it is not the final result |
| CI files | `.github/scripts/generator-quick.json` `5F7839B9…`, `generator-quick.js` `529C3332…` (the first 16 hex digits of the others: `generator-quick.selftest.js` `BE69D1F9…`, `generator-suites.sh` `70D02024…`, `pages.yml` `FA3F22EF…`, `pull-request.yml` `ED3751FB…`). The four final group runs used `generator-quick.js` `CAF6F107…`, which differs from the delivered file by one final line end only (the format one-liner found it missing; whitespace-only, the self-test and `check` were repeated on the delivered file) |

The CI files, the workflows, `docs/` and `tests/artifacts/` are outside both fingerprints, so editing them never
invalidated a result. The guides, `AGENTS.md` and `generator/design.md` are inside, so they were frozen first (IR19) and
both complete quick sets were then run once on the final tree.

## What was built

| File | Role |
|---|---|
| `.github/scripts/generator-quick.json` | The portable manifest: 4 groups of 7 disjoint whole-suite shards (the same 7 shards as MS05r6b's `quick-final/final-manifest.json`), per shard the suites, the tests and measured seconds of r6b (information), a finite `projectionSeconds` (checked), the job rule, the Player job, and `outOfCi` (the 8 manual suites and 4 tools). No result path, Windows path, hash or Node version |
| `.github/scripts/generator-quick.js` | Manifest reader and checker, built-in modules only: `check`, `matrix`, `list <group>`, `run <group> [--dry-run] [--results-dir]`. Executes `node tests/node-runner.js --suite=<suites>` as an argument array (`spawnSync`, no shell, no `eval`), every shard even after a failure, exit 1 if any failed |
| `.github/scripts/generator-quick.selftest.js` | 50 synthetic checks of the validator and the runner's exit semantics (below) |
| `.github/scripts/generator-suites.sh` | The one entry point of both workflows (LF, as `.gitattributes` declares): `check`, `matrix`, `list`, `run`, `selftest`; the old groups (`sweep`, `engine`, `rules`, `rating`, `rest`) and the `rest` discovery of manual suites are gone (`sweep` now exits 2) |
| `.github/workflows/pull-request.yml`, `pages.yml` | A `plan-generator` job (self-test, `check`, matrix output), `test-generator` from that matrix, the replacement statements in a header comment, and on Pages the test time limits |

**The groups** (one job each; the shards are MS05r6b's, run in order inside the job):

| Group (job name) | Shards (suites) | Tests | Final process s (sum of shards) | Bounds (local, r6b) | Projected job | Limit |
|---|---|---:|---:|---:|---:|---:|
| `shared-small` ("shared and small suites") | `core-shared` (16 shared suites), `steps`, `replay`, `mega` | 1,464 | 57.7 | 150 s | 630 s | 1,800 s |
| `own-suites` ("own suites") | `own-fast` (29 suites) | 1,579 | 165.1 | 220 s | 840 s | 1,800 s |
| `pipeline` | `pipeline` | 150 | 287.2 | 360 s | 1,260 s | 1,800 s |
| `replay-player` ("replay player") | `player` (the Generator's replay-player suite) | 69 | 138.0 | 180 s | 720 s | 1,800 s |
| Generator total | 7 shards, 50 suites | 3,262 | 648.0 | 910 s | | |
| Player job | `node tests/node-runner.js`, 30 suites | 1,683 | 31.2 | 60 s | 360 s | 1,800 s |

Projected job seconds = `jobOverheadSeconds` (180: checkout, setup-node, registration, the check) + `ciSlowdownFactor` (3, the
time factor the harness uses on CI, used here only as a stated margin) x the sum of the shard bounds. **These are
projections from local measurements, not CI measurements.** The longest job, `pipeline`, fits 30 minutes up to a slowdown of
5.6 times its measured 287 s ((1,800 - 180) / 287.2); the others have more room. The groups are split rather than the limit or
the factor raised: one job holding the whole measured 648 s at the same 3 times would project 2,124 s and not fit. The helper refuses a
manifest whose job limit is above 30 minutes, a shard bound above 450 s, a missing or non-finite bound, or a group over its limit.

## The coverage check

`bash .github/scripts/generator-suites.sh check --keep=docs/difficulty-v3/evidence/MS05r6c/check` (`logs/check.txt`, exit 0,
3.62 s, registration only, no test runs): the Generator quick set is registered whole (3,262 tests, 50 suites) and once per shard
(7 listings), the Player's once (1,683 tests, 30 suites); every one of the 3,262 keys `(suite, ordinal)` with its full name is in
exactly one shard; the runner's 50 quick suites equal the folders (34 own + 16 shared); no shard names a manual or an unknown
suite; no shard selects nothing; no registration error; the 8 manual suites on disk equal `outOfCi.manualSuites` and none is in a
shard; the 4 tools exist; every Player quick suite includes the 16 shared ones; every job projection fits. The kept inventories
are in `check/` (`generator-all.json`, `shard-<id>.json`, `player-all.json`).

**Negative coverage** (`logs/local-checks.txt`, `generator-suites.sh selftest`: 50 checks, 0 failed, 0.26 s; synthetic plans, no
generation): a complete plan passes; a quick suite without a group, an unknown suite, a suite in two shards, a test selected by two
shards, a test of another suite inside a shard, a test missing from its shard, a manual suite in a group, a new undeclared manual
suite, a stale manual declaration, a missing tool, a shard that selects nothing, a registration error, a failed registration, an
incomplete or filtered or repeated-name inventory, a runner selection that differs from the shard, a shared suite missing from the
Player, a new quick suite on disk that the runner also registers, a job limit above 30 minutes, a group over its limit, a comma or
`--all` in place of a suite name, a missing bound, no group, a repeated id: each fails with its own message. The shard runner
returns 1 when any shard fails (the next shard still runs), when a shard exits with a signal or cannot start, and 0 only when all
pass; the evidence option adds only `--results=...`; the command line is read strictly. Against the real tree: `run nope` and the
old group name `sweep` exit 2.

## The final complete quick runs (IR19; one pass, after IR14, IR15 and every other edit)

All Generator commands ran through the CI entry itself: `node .github\scripts\generator-quick.js run <group>
--results-dir=docs\difficulty-v3\evidence\MS05r6c\quick`, one group per `Invoke-Dv3Node` command (the check-list helper
verbatim, hash `9ED1F79D…`, 20-minute wait, 540-second limit) by `Run-Dv3Logged.ps1`, with 15 seconds between lock acquisitions. The
bound of each group (150, 220, 360 and 180 s) is far below the 450-second compound limit, each group is its own locked command (so
IR12's admission needs no driver), and each shard keeps its own bound and result. `--results-dir` adds
`--results=..\docs\...\quick\generator-<shard>.json` to the shard command; it is an evidence option, not used by CI. The Player ran
as its own locked command. No command ran unlocked that generates or was not known to be short; unlocked and short (IR07): the 8
preflights (0.28 to 0.51 s each, `runs.jsonl`), `check` (3.6 s), the self-tests, the manifest builder and the reconciler.

| Command (from the repository root unless noted) | Exit | Seconds (node) | Tests |
|---|---:|---:|---|
| `--list-tests` Generator inventory (`generator/`, locked) | 0 | 0.620 | 3,262 in 50 suites |
| `--list-tests` Player inventory (`player/`, locked) | 0 | 0.364 | 1,683 in 30 suites |
| `run pipeline` (locked; `ci-pipeline`) | 0 | 287.835 | 150 of 150 passed |
| `run shared-small` (locked; `ci-shared-small`): `core-shared` 24.5, `steps` 11.5, `replay` 11.0, `mega` 11.4 | 0 | 59.820 | 1,143 + 57 + 153 + 111 = 1,464 passed |
| `run own-suites` (locked; `ci-own-suites`): `own-fast` 165.3 | 0 | 165.898 | 1,579 of 1,579 passed |
| `run replay-player` (locked; `ci-replay-player`): `player` 138.2 | 0 | 138.538 | 69 of 69 passed |
| `node tests\node-runner.js --results=...` Player (`player/`, locked; `q-player-all`) | 0 | 31.416 | 1,683 of 1,683 passed |

The reconciler (`generator/tests/artifacts/difficulty-v3/MS05r6c/coverage.cjs`, a copy of MS05r6b's with the task name changed;
its 9 self-test checks and the driver's 7 passed on the copy; `quick/reconciled.json`): **Generator complete-green, 3,262 of 3,262
tests in 7 of 7 accepted shards, passed 3,262, failed 0, skipped 0, missing 0, duplicates 0, unexpected 0; Player complete-green,
1,683 of 1,683 in 1 of 1, 1,683 passed, 0 failed, 0 skipped.** Every result is complete, `sourceStable`, on the inventory's source
hash, Node and time factor, with the shard's selector as its argv. The totals equal MS05r6b's, so no count changed and nothing needs
explaining. Per-shard wall seconds: `core-shared` 24.317, `steps` 11.329, `replay` 10.850, `mega` 11.201, `own-fast` 165.080,
`pipeline` 287.250, `player` 137.983 (Generator sum 648.008; MS05r6b's final sum was 646.464); Player 31.208 (MS05r6b: 31.828).
`recovery-quick-cost.md` is MS05r6b's report and was not edited. The Node 26 `ExperimentalWarning` about `localStorage` on stderr
(`own-fast`, Player) is not an assertion and is Node 26's; CI uses Node 24.

The first-pass runs (`superseded-pass1/`, fingerprints `7949138f…` and `fbb759b0…`, also all green: 3,262 and 1,683 passed, 7 and 1
accepted shards, one `generator-quick.js run shared-small` representative run of 59.3 s) are history, replaced by the final ones above.

## What replaces the deep and manual evidence

Stated in the header of both workflows and in `outOfCi` of the manifest; nothing in CI generates a deep or manual corpus.

| Not in CI | Replaced by (reviewed, offline) | Owner for the current source |
|---|---|---|
| Deep tier: `generator/tests/mega-contract.js`, 14 requests and 6 relations of mega Nightmare | MS05r5m's 14 records (`docs/difficulty-v3/evidence/MS05r5m/records`) reconciled by MS05r6b (`evidence/MS05r6b/deep/reconciled-final.json`, `compatibility-final.json`; `currentMatches` `{ sourceHash: false, toolHash: true }` retained by the exact-diff proof) | later semantic tasks, MS07b (hell1), MS18e final-source closure |
| Live CV3 outcomes of mega Nightmare | MS05b3's live cells (Addendum B1; `evidence/MS05b3/outcomes.json`) and MS05r6b's reconciliation (`evidence/MS05r6b/deep/live-cv3.json`): 5 live requests, S-AV02 and S-AV03 | MS18e live cells, MS18c/MS18d |
| Manual suites and `--all` (`variants`, `killer`, `greater-than`, `perf`, `difficulty`, `extra-regions`, `wordoku`, `jigsaw`): GD, I5/CV3 corpora | MS05r6b's classic9 GD (`evidence/MS05r6b/gd`, 153 of 154 tests, S-AV14 and S-AV15) and MS05b3's 186 manual results | MS07e, MS17b, MS18e (GD reruns) |
| Regression hashes, replay wires and analyses (E: GG/GR/GH) | MS05r6a's complete E (`evidence/MS05r6a`; 520 keys, 5 wires, 14 analyses), checked current by MS05r6b's three merge checks | the behaviour-changing task of each change; MS18e |
| Qualification (`qualify.js`) and performance (`perf.js`, `soak.js`) | the GQ and GP gates of the check-list: GQ-first MS07e, GQ-final MS18c, GP MS18d | MS07e, MS18c, MS18d |

## The workflows

Preserved: names, triggers (pull request to `main`; push to `main` and manual dispatch on Pages), `permissions`, `concurrency`,
Node 24, `test-core` (the shared suites in the Player environment) and `test-player` (`node tests/node-runner.js`), the browser job
and its screenshot upload (pull request), `deploy` with its `needs` (`test-generator`, `test-player`), its environment and
publication steps (the Pages `ui-contract` test of both apps still finds the published paths), no `continue-on-error`, no change
to the existing time limits (pull request: core 15, generator 30, player 15, browser 30 minutes). Added: `plan-generator` (10
minutes, on both), which runs `selftest` and `check` and emits `{ "include": [{ "group", "name" }] }`, and `test-generator` built
from that output (`needs: [test-core, plan-generator]`, `fail-fast: false`, 30 minutes) so that the matrix cannot drift from the
manifest; on Pages, limits of 15 (core), 30 (generator) and 15 minutes (player) where there were none (a reduction of the implicit
limit; `deploy` is not a test job and was left alone). `SG_TIME_FACTOR` is set nowhere; the harness's 3 on `CI` is unchanged. The
group name reaches the shell through `env`, not an expression. `actionlint` 1.7.12: no finding (`shellcheck` is not installed, so its
check of the `run` blocks was not applied). PyYAML parses both files; `bash -n` passes the script.

## Documents

`DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` (same facts): the paragraph "Continuous integration" (in "Running the tests" of the
Generator part), the directory-tree line of `.github/`, the deployment paragraph, the sentence that said CI runs `--all`, and
(IR15) the stale durations "about eight minutes" and "about nine minutes" removed (the counts 8 and 58 stay). `generator/design.md`
15.1 (the same statement and removal) and the row of the table of differences (CI runs the quick set only). `AGENTS.md` (IR14): the
`--all` and `--manual` item now reads "the heavy tier, far longer than the quick set; CI does not run it, see DEVELOPERGUIDE.md "Running
the tests", paragraph "Continuous integration"". The text of IR14 says `DEVELOPERGUIDE.md "Continuous integration"`, but that is a bold
paragraph label of the section "Running the tests", not a heading (the neighbouring paragraphs are labelled the same way), so the
real location is named. `help` and `ui-contract`: Generator 97 of 97 and Player 89 of 89 after the edits.

## Acceptance

| ID | Verdict | Evidence |
|---|---|---|
| MS05r6c-B01 CI enforces the approved quick tier | Met locally; remote run pending | both workflows run only the 7 quick shards and the Player's quick set; the manual suites cannot enter (the check fails on one); the final local runs of exactly those commands: 3,262 and 1,683 passed |
| MS05r6c-B02 deep evidence has a visible owner and is not discarded | Met | the table above, the header comment of both workflows, `outOfCi` and the guides name the replacing records and the owners |
| MS05r6c-T01 same manifest, all keys reconcile, no catch-all | Met | both workflows call the same `generator-suites.sh`; 3,262 of 3,262 keys once (`check`, `quick/reconciled.json`); no `rest` discovery |
| MS05r6c-T02 jobs fit 30 minutes with margin; ceilings and factor not raised | Met as a projection; actual remote durations pending | projections 630 to 1,260 s of 1,800 s; limits and factor unchanged; Pages gained limits |
| MS05r6c-T03 unknown, missing, duplicate and zero-test groups fail; exit behaviour and identities truthful | Met | 50 synthetic checks, the real `run nope` and `sweep` exits (2), the real `check`; the runner's own exits 1 for an unknown suite, a load error or no test; results carry their identities |
| MS05r6c-T04 Player, core and browser coverage and deployment conditions remain; new-suite ownership and offline evidence documented | Met | see "The workflows" and "Documents"; the check also fails when a shared suite is missing from the Player's quick set |
| MS05r6c-T05 r6b audit plus CI closure, checks and durations and the item list ready for one combined commit | Met, pending the remote CI run of the pull request | this folder, `quick/reconciled.json`, the item list below |

## Items (S-OD4)

Inherited, carried unchanged (no availability or cost number moved; r6c ran no generation beyond the quick sets): S-AV01 to S-AV15 as
MS05r6b's `audit.md` and `evidence.md` list them (S-AV02 to S-AV13 b3's 19 failed availability assertions; S-AV07 classic9
Nightmare 21 of 100; S-AV14 Normal 86 of 100; S-AV15 the outstanding confusion matrix; S-AV08 the standing cost, now 648.0 s for the
Generator against r6b's 646.7 s, 31.2 s for the Player), and MS05r6a-COV01 for MS18e. New (process items, none a correctness failure):

| Id | Item | Next owner |
|---|---|---|
| R6C-I01 | The `test-generator` job names changed from five ("Test generator (variant sweep)", ...) to four ("Test generator (shared and small suites)", "(own suites)", "(pipeline)", "(replay player)"). A branch protection that requires the old names must be updated in the repository settings; nothing here can do that | orchestrator at the pull request, MS18e |
| R6C-I02 | Remote durations are unknown. The projections above are local measurements times a stated margin; record the first pull-request run's actual per-job times next to them (estimate and actual stay separate) | orchestrator, MS18e |
| R6C-I03 | `docs/architecture.md:84-85` still says the generator runs "in five jobs of about 2 to 4 minutes, grouped by `.github/scripts/generator-suites.sh`". It is outside this task's files and outside both fingerprints. Suggested: "in four parallel jobs of the quick tier, grouped by `.github/scripts/generator-quick.json`" | orchestrator |
| R6C-I04 | `player/design.md:437` says the browser scripts are "not part of CI"; the pull-request workflow runs them (the developer guide says so). Pre-existing and unrelated to the tiers, so left | orchestrator |
| R6C-I05 | A later suite-adding task must add its shard (with a measured bound) to `generator-quick.json` or `check` fails; a task that makes a shard slower must update its bound. The check cannot measure the bound | each suite-adding task, MS18e |
| R6C-I06 | The first pass (`superseded-pass1/`) and MS05r6b's quick rows (`7d3102d3…`, `1d0724c3…`) are superseded for the combined commit by this task's rows (`6b40d218…`, `547e4a4e…`). Any later edit of a fingerprinted document (`AGENTS.md`, the guides, the designs, `README.md`, `*.html` lists, any suite) invalidates them again | orchestrator |

## Files

Created: `.github/scripts/generator-quick.json`, `generator-quick.js`, `generator-quick.selftest.js`;
`generator/tests/artifacts/difficulty-v3/MS05r6c/` (`make-plans.cjs`, and copies of MS05r6b's `coverage.cjs`, `run-shards.cjs` and their
self-tests; the driver was used only on the first pass); this folder: `evidence.md`, `Invoke-Dv3Node.ps1` (verbatim), `Run-Dv3Logged.ps1`,
`generator-inventory.json`, `player-inventory.json`, `runs.jsonl`, `logs/`, `check/`, `quick/` (`shard-plan.json`, `manifest.js`,
`Run-Preflights.ps1`, `preflight/`, `quick-manifest.json`, the 8 results, `reconciled.json`), `superseded-pass1/`. Modified:
`.github/scripts/generator-suites.sh`, `.github/workflows/pull-request.yml`, `.github/workflows/pages.yml`, `AGENTS.md` (the one item of IR14),
`DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `generator/design.md`, `docs/difficulty-v3/notes.md`.
