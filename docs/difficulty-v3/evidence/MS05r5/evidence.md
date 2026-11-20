# MS05r5 evidence: inventory and results tooling, and the bounded full-quick plan

Step evidence of the S-OD2 recovery, not an acceptance (S-OD3, S-OD4); no commit of its own, and no claim that any
quick set passed: nothing in this folder ran a quick suite beyond the three tooling suites. Tree: `rating-v3` at
`1ae831c` plus the uncommitted retained recovery tree and MS05r5p's changes, plus this task's changes (the files at
the end). Node v26.13.0, Windows, AMD EPYC 7763 (16 cores, 64 GiB), time factor 2 (`CI` and `SG_TIME_FACTOR` unset).
The identities below are the `sourceHash` of the quick fingerprint of each app; every record in this folder carries
it and `manifest.js --check` fails when one differs.

| App | Files hashed | `sourceHash` |
|---|---:|---|
| Generator | 154 | `dfc34b6710b5f4d2c3379fb4bb6630193548b85f0e4be080fefd70a6efce91ee` |
| Player | 130 | `0c9c78ce65e02b7480eef5fe49fd98083cf340bd3136cc57b69a715d140e3842` |

## What was added

| Where | What |
|---|---|
| `core/tests/harness.js` | `SG.test.list(options)`: the read-only twin of `SG.test.run` (same `suite`, `filter`, new `exact`), one shared walk, rows `{suite, ordinal, fullName, kind, skipped, timeoutMs}` plus the registration errors. `run` takes `exact` (full name, case-sensitive, not with `filter`) and puts `ordinal` in every result row. A describe that threw and a file that failed to load carry a `registrationError`. No other behaviour changed |
| `core/tests/node-evidence.js` (new, Node only, in no source list) | The option parser, the path rules, the source fingerprint, the inventory and the result documents, the atomic never-overwriting write; it knows neither app (the runner injects the repository root, its name and its fingerprint inputs) |
| `generator/tests/node-runner.js`, `player/tests/node-runner.js` | `--list-tests=<file.json>`, `--exact=<full name>`, `--results=<file.json>`; usage, header and the app's fingerprint inputs. Without the three options the output, the selection and the exit code are as before |
| `core/tests/suites/harness.test.js` | 13 new cases (12 old, 25 now): list without execution, ordinals, exact and the Easy/Very Easy substring, registration errors, results untouched by `list`, the option parser, the renderer, the fingerprint, the path rules, the write, the inventory and result commands on scripted suites, and the real runner on one bounded test |
| Documents | `DEVELOPERGUIDE.md` and `.vn.md` (the commands, a paragraph "Exact selection, inventory and results", the layout line, the Player part), `generator/design.md` (15.1 and the layout), `player/design.md` (section 10), `docs/difficulty-v3/notes.md` |

The harness suite has 25 cases (12 old and 13 new). The options of the two runners are the same; a path is a new
project-relative `.json` file inside the repository (resolved from the working folder, as `soak.js` and the recorders
do), never overwritten (the file, or a leftover `<file>.partial`), not inside a fingerprinted folder, and written whole
to `<file>.partial` before it is put in place. `--list-tests` and `--results` exclude each other, `--exact` and
`--filter` too; a missing, empty, absolute, non-`.json`, outside or existing path, an unknown option, an unknown suite
and a zero selection are exit 1 (a zero selection writes no file; a registration error writes the file with
`complete: false` and exits 1). `--results` also writes after failures and keeps exit 1. Its `complete` is true only
when every selected test ran (no `--bail`), nothing failed to register and the fingerprint is the same before and
after the run.

**Fingerprint** (one stable order, sorted by repository-relative path; files as `sha256` of the text with LF and no
BOM): `AGENTS.md`, `README.md`, the four guides, the app's `design.md`, `index.html`, `tests.html` (Player also
`help.html`), the harness and `node-evidence.js`, then every file of `core/js`, `core/css`, `core/assets`,
`core/tests/fixtures`, `core/tests/suites` and the app's `js`, `css`, `assets`, `tests/fixtures`, `tests/suites`
(Player also `tests/tools`) and the direct files of its `tests/` (the runner, the Generator's soak, perf, qualify and
recorders). It does not depend on the selection (a one-suite shard hashes the same files as the whole quick set;
the tooling result and the inventory of each app have the same `sourceHash`), and the Generator's `tests/manual`
counts only when a manual suite is selected. It leaves out `artifacts`, `node_modules` and `.git` folders, the
evidence folders, the task pack and `docs/difficulty-v3/recovery-quick-cost.md`. It is wider than the minimum the
task names (all of `js`, `css`, `assets`, the tool scripts, the Player fixtures and tools), because quick tests read
the CSS, scan folders and spawn the tools: a narrower list could miss a source change that matters.

## Commands (exit code, node seconds, wall seconds, lock wait)

Locked commands used `Invoke-Dv3Node` (the check-list helper, 20-minute wait; `Invoke-Dv3Node.ps1` verbatim) by way of
`Run-Dv3Logged.ps1`; every command is a record of `runs.jsonl`, transcripts are in `logs/`. Pentomino's MP12b1
held `dv3-timing.lock` the whole time. The final pass (after the last source change):

| Label | Command (from the app folder) | Result | Exit | Node s | Wall s | Lock wait s |
|---|---|---|---:|---:|---:|---:|
| g01-tooling | Generator `tests\node-runner.js --suite=harness,ui-contract,help --results=..\docs\difficulty-v3\evidence\MS05r5\generator-tooling.json` | 122 of 122, complete | 0 | 7.033 | 137.263 | 130.2 |
| g02-inventory | Generator `tests\node-runner.js --list-tests=...\generator-inventory.json` | 3,170 tests, 48 suites, registration 0.49 s | 0 | 0.617 | 155.832 | 155.2 |
| g03-mega12-selection | Generator `--suite=mega --filter="> mega puzzles > mega12 nightmare:" --list-tests=...\mega12-nightmare-selection.json` | 2 tests (`mega#76`, `mega#77`) | 0 | 0.277 | 0.380 | 0.1 |
| p01-tooling | Player `tests\node-runner.js --suite=harness,ui-contract,help --results=...\player-tooling.json` | 114 of 114, complete | 0 | 3.219 | 43.386 | 40.2 |
| p02-inventory | Player `tests\node-runner.js --list-tests=...\player-inventory.json` | 1,683 tests, 30 suites, registration 0.25 s | 0 | 0.370 | 35.551 | 35.2 |

The longest lock wait was 155 s (first pass: 270 s); no command came near 540 s. The eight shard preflights (7 Generator,
1 Player, `Run-Preflights.ps1`) each took 0.27 to 0.47 s of node time (whole registration of a shard, measured: the
registration of the whole Generator quick set is 0.49 s), so they were **not** locked: nothing that short can exceed
the 10 s of the protocol. `manifest.js --build` and `--check`, exit 0. After the last edit of a hashed file, both
fingerprints were computed again by a one-suite listing (scratch file deleted): they equal the recorded `sourceHash`es.
Not run: any quick suite other than `harness`,
`help` and `ui-contract`, the full quick sets, `--all`, `--manual`, GG, GR, GH, soak, qualification, `SG_DEEP`,
browser scripts. Development runs of the harness suite alone (under 3 s, unlocked) and of `bits`, `purity` (0.2 s)
are not recorded.

**Superseded first pass.** The first complete set of records (`runs-pass1-superseded.jsonl`, its transcripts and
files removed) was taken before the harness suite gained its last case (the real-runner case, 24 to 25 harness tests),
which changed a hashed file; all of it was recorded again, as the rules for a source change require. The records show
the first pass's lock waits (190 s, 270 s, 175 s, 230 s, 240 s) and one failed preflight of the Player shard
(`player-all`, exit 1, 0.145 s: a PowerShell array bug of `Run-Preflights.ps1` for a one-element selector, fixed and
repeated).

## The inventories (`generator-inventory.json`, `player-inventory.json`; the no-options quick sets)

Registration does what a run does (it loads the sources, the fixtures and the suites, so the set-up of `full-grid`
(1,000 grids), `digger` (200 puzzles), `solver` (200 cases, 20 grids) and `pipeline` (two seeds) still happens), and
runs no test, hook or benchmark. It is cheap on this tree: **0.49 s** for the Generator, **0.25 s** for the Player
(process 0.62 s and 0.37 s). Both inventories are `complete: true` (no registration error), have no static skip and no
repeated full name.

| App | Tests | Suites | Benchmarks | Static skips | Limits (ms): 5,000 / 20,000 / 30,000 / 60,000 / 120,000 |
|---|---:|---:|---:|---:|---|
| Generator | 3,170 | 48 (32 own, 16 shared) | 28 | 0 | 2,784 / 1 / 1 / 69 / 315 |
| Player | 1,683 | 30 (14 own, 16 shared) | 19 | 0 | 1,682 / 0 / 1 / 0 / 0 |

Tests per suite. Generator: a11y 31, bits 32, board-view 37, cache 105, constraints 43, controls 46,
difficulty-diagnostics 82, difficulty-floor 48, digger 64, events 68, exchange 20, export 78, format 18, full-grid 42,
harness 25, help 30, history 15, i18n 83, logical-solver 100, mega 111, model 49, multigrid 184, perf-tooling 31,
pipeline 150, player 68, purity 41, recovery-profile 27, replay 152, replay-recorders 39, result-view 22, rng 28,
smoke 44, solver 50, steps 56, store 79, symbols 12, tech-basic 167, tech-chain 62, tech-fish 106, tech-subset 100,
tech-wing 168, technique-weights 6, techniques 165, theme 57, ui-contract 67, variants-registry 12, wordbook 7,
worker 143. Player: a11y 24, app 15, bits 32, board-view 37, constraints 43, exchange 20, fixtures 21, harness 25,
help 27, help-example-tools 51, i18n 66, importer 88, logical-solver 100, model 49, model-aids 7, play 68, progress 26,
solver 50, store 17, symbols 12, tech-basic 167, tech-chain 62, tech-fish 106, tech-subset 100, tech-wing 168,
techniques 165, text-boards 14, theme 54, ui-contract 62, wordbook 7. The 16 shared suites are the same 1,143 tests in
both apps, so they run once in each app environment.

**Expensive registrations** (the tests with a limit of 60,000 ms or more; a limit is not a cost): Generator,
120,000 ms: `replay` 121, `worker` 62, `multigrid` 44, `mega` 40, `smoke` 28, `steps` 8, `pipeline` 5,
`perf-tooling` 4, `player` 3; 60,000 ms: `pipeline` 28, `player` 29, `steps` 10, `perf-tooling` 2. Player: none (one
test of `i18n` has 30,000 ms). The mega rows that matter to MS05r5m: `mega#76`/`#77` (mega12 Nightmare: 4 puzzles; CV5),
`#92`/`#93` (mega16 Nightmare), and the Hell 1 rows `#78`/`#79` and `#94`/`#95`, each 120,000 ms. A selection by the
pack's own filter, `--suite=mega --filter="> mega puzzles > mega12 nightmare:"`, is exactly the two mega12 Nightmare
rows (`mega12-nightmare-selection.json`).

## The draft shard plan (`shard-plan.json`, `quick-manifest.json`, status `planned`)

One command per shard (`node tests\node-runner.js <selector> --results=..\<resultPath>`, `resultPath` under
`docs/difficulty-v3/evidence/MS05r6b/quick/`); the disjoint union of the shards **is** the no-options inventory of
its app. A shard is a whole-suite selector because a single `--filter` or `--exact` cannot express a complement.
Every selector was preflighted with `--list-tests` (`preflight/`): its rows are the shard's `expectedTestKeys`
(`<app>/<suite>/<ordinal>` with the full name), checked against the inventory's rows for identity, source hash,
Node and time factor.

| Shard | Selector | Tests | Projection s | Basis |
|---|---|---:|---:|---|
| generator/core-shared | the 16 shared suites | 1,143 | 150 | UNMEASURED: no per-suite time exists. Ceiling: the whole Generator quick set took 111 to 112 s at the baseline (report 2.1) plus 40 s for the v3 additions |
| generator/own-fast | the other 27 own suites except the five below | 1,490 | 190 | STALE/MEASURED: 172.7 s for 26 of them at MS05b1; on this tree digger 1.0, difficulty-diagnostics 11.1, difficulty-floor 24.6, worker 44.1, cache 9, help 3.8, ui-contract 0.35, recovery-profile 0.7 s |
| generator/pipeline | `--suite=pipeline` | 150 | 300 | STALE: 294.8 s for 127 tests at MS05b1; the 23 added tests took under 4 s together; large boards cost less since r5p |
| generator/mega | `--suite=mega` | 111 | 250 | STALE: 246.3 s at MS05b1 (4 tests failed at their budgets); mega12 Nightmare is cheaper now (23.8 s per request at 4 attempts), the two mega16 Nightmare tests stop at their 60 s guard (120.2 s together, r4); r5m replaces them |
| generator/steps | `--suite=steps` | 56 | 250 | UNMEASURED: three G13 tests of 120 s each broke one command at MS05b1; G13 now regenerates in 21.6 s once per process (suite cache) |
| generator/replay | `--suite=replay` | 152 | 300 | UNMEASURED: the whole suite reached 540 s at MS05b1 through G13 failures; recorder check of the other 13 goldens 80.1 s; the analysis of G13 was never measured |
| generator/player | `--suite=player` (the replay player of the Generator) | 68 | 300 | UNMEASURED: as `replay` |
| player/all | no option (the Player app: 14 own and 16 shared suites) | 1,683 | 60 | STALE: 29.3 s for 1,670 tests at MS05b1 (the 13 new ones are the harness cases), doubled |

Coverage (`manifest.js --check`, exit 0): Generator 3,170 of 3,170 claimed by 7 shards, Player 1,683 of 1,683 by 1;
missing 0, duplicates 0, unexpected 0 in both. A scratch run that dropped, repeated and invented a key of the
manifest was reported as 1 missing, 1 duplicate and 1 unexpected (the script is deleted). The projected sum is 1,740 s
for the Generator (longest shard 300 s) and 60 s for the Player; it is a planning number, not a measurement, and
four of the Generator's seven shards (the shared suites, `steps`, `replay`, `player`) have no valid number at all. The cache boundary of
each projection is the process: `steps`, `replay` and `player` keep their goldens in a per-process cache
(`goldens`, `built`, `resultCache`), so G13 (and G14) regenerate once in each of the three shards; a shard that
loads a saved wire (G09 to G12 today, G13 after MS05r6a) pays nothing for it.

If MS05r6b measures a shard above 450 s, the fallback is a partition at describe boundaries (`--suite=<s> --filter=
"> <describe name>"`, each row set checked by a preflight; not done here): `replay` has 9 describes (explaining the
jumps 59, golden compact view and transitions 33, golden details 14, ratings 10, synthetic logs 9, views and
transitions 11, compact selection 7, moves of the example 6, jump rule 3); `steps` 12 (stepView description 8,
chartModel 7, the callout of a score jump 7, and nine smaller ones); `player` 9 (the replay steps 25, the score
tables 14, texts 8, manual navigation 6 and five smaller); `pipeline` 19 (the largest: recovery allowance 16, patch
rebuild 15, events cost 14, variant hooks 14, first exact result 12); `mega` 9 (the Nightmare tests sit in
`mega puzzles`, 32 rows). A filter is a substring, so a complement still needs its own describes, and a shard must be
one command.

## Acceptance

| ID | Result | Evidence |
|---|---|---|
| MS05r5-B01 | Met (the plan, not an execution) | Every current quick row of each app is in exactly one planned shard (3,170 and 1,683, `quick-manifest.json`); the rows `mega#76`/`#77`, `#92`/`#93` (and Hell 1 `#78`/`#79`, `#94`/`#95`) are listed for r5m to map; nothing was dropped, moved or counted as run |
| MS05r5-B02 | Met | No test, assertion, request, seed, guard, fixture, time factor or skip was edited; the shards select whole suites, so no filter can hide a slow test; no skip exists today (0 in both inventories) |
| MS05r5-T01 | Met | The harness cases check that listing twice calls no test, hook or benchmark and leaves `SG.testResults`, that an inherited `describe.skip`, `it.skip` and benchmarks are rows, and that a describe that threw and a file that failed to load stay in `registrationErrors` and make `complete` false (module cases with scripted suites); real inventories are complete |
| MS05r5-T02 | Met | Substring filter unchanged (Easy and Very Easy, the `> ` boundary), exact is one full name, case-sensitive, takes every duplicate, and refuses a filter; ordinals are per file, before filtering, equal under another suite order, and in the result rows; checked in the harness suite and by the real runners |
| MS05r5-T03 | Met | `--results` is written after failure, `complete` is false for a bail, a registration error and changed sources, a zero selection writes no file and exits 1, bad paths exit 1, and the real runner writes the inventory and the result of one bounded test (`complete`, same `sourceHash`); the two tooling results are complete with the inventory's `sourceHash` |
| MS05r5-T04 | Met | `manifest.js --check` (above); preflights are complete and equal to the inventory rows |

## Items (S-OD4)

Open items after this step. Route before MS07e: MS07e; final: MS18c (availability), MS18d (cost); MS18e audits all.
No new id was needed: this step found no new performance finding, only numbers for the standing cost.

| Item | Origin, request, source | Numbers and outcome now | Evidence | Next owner |
|---|---|---|---|---|
| S-AV01 Greater-Than Normal CV6 | inherited | 2,035 ms p95 against 1,400 ms; not run here | none new | MS05e, MS07e, MS18d |
| S-AV02 mega12 Nightmare | inherited from r5p; rows `mega#76`, `mega#77` | 23.8 s per request (seed 3) at 4 attempts (r5p) against the quick time assertion of 6 s (seed 1: 48.2 s at 8 attempts, r4, not measured at 4), so `mega#76` is expected to fail; `mega#77` ran in 137.7 s at 8 attempts (r4), unmeasured now. Both are in the planned shard `generator/mega`, unexecuted | `mega12-nightmare-selection.json` | MS05r5m (quick/deep contract), MS07e, MS18c/MS18d |
| S-AV03 mega16 Nightmare | inherited from r5p; rows `mega#92`, `mega#93` | one request 107.2 s at 2 attempts against the 60 s guard of the quick `generate`: both tests end in `budget.exceeded` at 60 s (120.2 s together, r4); 89 % of the 120 s application guard. Unexecuted here | none new | MS05r5m, MS07e, MS18c/MS18d |
| S-AV04 samurai Nightmare (G13) | inherited from r5p | 21.6 s at 2 attempts; `steps`, `replay`, `player` regenerate it once per process until MS05r6a persists it | none new | MS05r6a, MS07e, MS18c/MS18d |
| S-AV05 Killer Hard | inherited | 0 of 12 exact at every R5 setting | none new | MS07e, MS18c |
| S-AV06 Killer Expert | inherited | 0 of 12 | none new | MS07e, MS18c |
| S-AV07 classic9 Nightmare | inherited | 2 of 12 | none new | MS07e, MS18c |
| S-AV08 standing quick cost | inherited; updated here | Generator quick set: 3,170 tests, 48 suites, 28 benchmarks, registration 0.49 s; Player: 1,683 tests, 30 suites, registration 0.25 s. Planned Generator shards: 7, projected sum 1,740 s (about 29 minutes, longest 300 s), of which `steps`, `replay`, `player` and `core-shared` are unmeasured ceilings and `own-fast`, `pipeline`, `mega` stale ones from MS05b1; Player 60 s (stale 29.3 s). Still above about five minutes for the Generator: MS07e's proposal, after MS05r6b's measurement | `quick-manifest.json`, `shard-plan.json` | MS05r6b (per-app measurement), MS07e |

## Handoff

MS05r5m: the five mega rows above and the shard plan to refresh (`mega`); MS05b3: nothing to add to the tooling,
`--exact` and `--list-tests` check that a lazy per-level selector selects one test; MS05r6a: G13 and G14 regenerate at
2 attempts until persisted, and the `steps`/`replay`/`player` pins of G06, G07 and G13 are recorded failures it owns
(none was run here); MS05r6b: runs the shards (`--results=..\<resultPath>`, `-AllowExit1` only for an expected failure),
reconciles the keys, measures, and rebuilds the manifest after r5m, b3, r6a and r6b's own guide corrections (the
fingerprint covers the guides and `AGENTS.md`, so editing them changes it); MS05r6c: the shard list is the CI
manifest's input. The manifest is a draft: its status stays `planned`.

## Files

Changed: `core/tests/harness.js`, `core/tests/suites/harness.test.js`, `generator/tests/node-runner.js`,
`player/tests/node-runner.js`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `generator/design.md`, `player/design.md`,
`docs/difficulty-v3/notes.md`. Created: `core/tests/node-evidence.js` and this folder: `generator-inventory.json`,
`player-inventory.json`, `mega12-nightmare-selection.json`, `generator-tooling.json`, `player-tooling.json`,
`preflight/` (8 files), `shard-plan.json`, `quick-manifest.json`, `manifest.js`, `Invoke-Dv3Node.ps1`,
`Run-Dv3Logged.ps1`, `Run-Preflights.ps1`, `runs.jsonl`, `runs-pass1-superseded.jsonl`, `logs/`. Nothing else was
edited. The scratch files of development (`generator/tests/artifacts/difficulty-v3/MS05r5/dev`) are deleted.
