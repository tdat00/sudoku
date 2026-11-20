# Recovery quick cost: what a complete quick run costs, per app

**Status: the current standing cost is the MS07f section at the end of this report (measured 2026-11-15 after the
owner-approved move of four slow cases to the manual tier, S-OD8): the Generator 296.7 s as the sum of its four group commands
and the Player 35.0 s, every quick test passing. The sections before it are the measurement of MS05r6b on 2026-11-14, kept as
the history of the source they name.** The numbers
below are measurements of one named source on one named machine, never a promise, a guard or a timing assertion. Both
guides and `AGENTS.md` point here instead of quoting a duration. The report is data only: it is not an input of any quick
fingerprint, and no test reads it. The orchestrator acknowledges the standing cost with the normal combined acceptance
(`orchestratorAcknowledgement` is `pending normal acceptance` in `evidence/MS05r6b/standing-quick-cost-final.json`).

## What it reports

The **quick set** of an app is what `node tests/node-runner.js` selects with no option: the suites of the app's own
`tests/suites/` plus the shared suites of `core/tests/suites/`, each shared case run in the app's own environment. A whole
quick command may take longer than one bounded command may last (540 seconds for a process, at most 450 seconds projected
for a command that holds the shared-machine lock together with others). The complete quick set is then run as **disjoint
shards** (`--suite=<names>`, and a describe or full-name selector where one suite alone is too long), every shard being one
command with its own result file. The shards cover every test exactly once, with no `--bail`, no omitted slow test and no
new skip, and a coverage reconciler checks that against the registration-only inventory of the same source. The standing
cost is the sum of the wall times of those shards, which is a different thing from the 540-second ceiling of one command.

## Schema (one entry per app; `docs/difficulty-v3/evidence/MS05r6b/standing-quick-cost.json` has the same fields)

| Field | Meaning |
|---|---|
| `sourceHash`, `node`, `machine`, `timeFactor`, `default` | The quick fingerprint of the app, Node version, machine and time factor of the measured shards, and the default attempt/allowance rule in force |
| `manifestPath` | The final manifest of shards and expected test keys |
| `suiteCount`, `testCounts` | Suites and `{ total, passed, failed, skipped }` of the accepted coverage set |
| `shardCount` | Number of disjoint shards of the accepted coverage set |
| `sumWallMs`, `maxShardWallMs` | The sum and the largest of the process wall times of the accepted shards, start-up and registration included |
| `registrationIncluded` | Always true: the time is the process, not the harness body (`results.ms` is kept apart as `wallMs`) |
| `measurement` | `sum of the accepted disjoint shard executions`; never a measured unsharded command |
| `excludedWork` | Superseded attempts, replaced runs, inventory and tooling, and lock wait, each counted apart |
| `orchestratorAcknowledgement` | `pending normal acceptance`: the orchestrator records it with the combined acceptance |

## Generator (the Sudoku Generator app, with the shared suites)

Source `7d3102d3dd327f13c7d72800c2b1d157bf8c18fb20fa821cd77514bb880fdb93` (the quick fingerprint, 159 files), Node
v26.13.0, Windows x64, AMD EPYC 7763 (16 cores, 64 GiB), time factor 2 (`CI` and `SG_TIME_FACTOR` unset). Defaults in
force: allowance 256, attempts 8 up to 81 cells, 4 for 82 to 144, 2 above, no override.

| | Generator |
|---|---|
| Suites, tests | 50 suites (34 own, 16 shared), 3,262 tests (28 are benchmarks) |
| Outcome | 3,262 passed, 0 failed, 0 skipped; every key exactly once, no bail, no new skip |
| Shards, locked commands | 7 disjoint shards in 2 locked compounds |
| **Standing cost** | **646.681 s (10 min 47 s)**: the sum of the process seconds of the two locked helper commands (309.125 s and 337.556 s), start-up and registration included |
| Longest shard | `pipeline`, 286.453 s |
| Children and driver | the 7 child processes sum 646.464 s; the compound driver added 0.217 s |
| Runner own times | `wallMs` sum 644.841 s, harness `results.ms` sum 643.266 s (kept apart, not substituted) |
| Lock wait | 0.107 and 0.134 s (the machine was free); not part of the cost |

| Shard | Tests | Result | Process s | Projected s |
|---|---:|---|---:|---:|
| `steps` | 57 | 57 passed | 11.507 | 30 |
| `replay` | 153 | 153 passed | 11.062 | 30 |
| `pipeline` | 150 | 150 passed | 286.453 | 360 |
| `player` (the replay player of the Generator, not the Player app) | 69 | 69 passed | 139.399 | 180 |
| `core-shared` (16 shared suites) | 1,143 | 1,143 passed | 24.610 | 60 |
| `mega` | 111 | 111 passed | 11.400 | 30 |
| `own-fast` (29 own suites) | 1,579 | 1,579 passed | 162.033 | 220 |

**An earlier run is history.** The first complete run of MS05r6b (fingerprint `bee132a8…`, 7 shards, 661.725 s, longest
shard 296.200 s) had one failing test, `i18n > i18n: locale fragments > has no key defined twice …`: a test-order defect of
the `history` and `cache` tests of MS05r5p, whose private copy of `app.js` pushed a second locale fragment into the shared
`SG.localeFragments`. MS05r5p's fix round isolated the private copies; every Generator shard was then run again on the new
fingerprint, and the figures above replace the first run's. The first run stays as evidence in `evidence/MS05r6b/quick/` and
`standing-quick-cost.json`; it is not a second standing cost.

Where the time goes (suite `results.ms`): `pipeline` 286.0 s, of which the three verbosity-cost benchmarks `generating
puzzles: verbosity 'off'`, `'summary'` and `'full'` take 75.0, 74.7 and 75.6 s (225.3 s together); the `player` suite
139.0 s; `worker` 48.7 s; `difficulty-floor` 24.9 s; `multigrid` 15.5 s; `perf-tooling` 11.3 s; `steps` 11.1 s;
`difficulty-diagnostics` 11.1 s; `mega` 11.0 s; `replay` 10.7 s. The complete table of suites is in
`evidence/MS05r6b/standing-quick-cost-final.json`.

## Player (the Sudoku Player app, with the shared suites)

Source `1d0724c34f669fddf4b6d5f5739bb42cd2c9f41332202b60335fe890f02d1dfa`, the same Node, machine and factor. The result is
the one measured in the first run and retained: the R6B-F01 fix changed two Generator test files, which are no part of the
Player fingerprint (listed again after the fix: the same hash).

| | Player |
|---|---|
| Suites, tests | 30 suites (14 own, 16 shared), 1,683 tests (19 are benchmarks) |
| Outcome | 1,683 passed, 0 failed, 0 skipped |
| Shards, locked commands | 1: the whole command fits one bounded command |
| **Standing cost** | **31.828 s** (process seconds of the one locked command; runner `wallMs` 31.618 s, harness 31.362 s) |
| Lock wait | 0.101 s |

Largest Player suites: `tech-chain` 6.5 s, `tech-fish` 6.4 s, `help-example-tools` 4.7 s, `solver` 2.7 s.

## Context

- **Not a baseline.** The earlier Generator number of 713.8 s (MS05b1) covered three command groups only (172.7 s,
  294.8 s and 246.3 s) and not the complete set. The partial samples of MS05r6a (`steps` 11.5 s, `replay` 11.1 s, the
  Generator `player` suite 139.1 s) agree with the final 11.5, 11.1 and 139.4 s.
- **No unsharded run.** No whole Generator command was run: the total is the sum of its shards, and it is not a promise
  that any single command stays within 540 seconds.

## How to read it

- A longer total is not a new stop or a performance criterion: complete bounded shards were allowed from the start. It is
  the visible validation cost of the recovery, acknowledged with the combined acceptance.
- No per-test guard, request, seed or assertion changed because of this cost.
- A later task re-projects the shards for its own source; it does not treat these numbers as a permanent timing promise.
- If the Generator's complete quick time stays above about five minutes, S-AV08 carries the per-suite breakdown to MS07e,
  which proposes which generation-heavy cases belong in the manual tier. Nothing is moved without that approval.

## MS07f: the standing cost after the quick-tier move (current)

MS07f moved four slow quick cases to the manual tier on the owner's approval (S-OD8, from section 9 of
`docs/difficulty-v3/qualification-checkpoint-2026-11-15.md`) and changed no request, seed, limit or assertion. Measured on
2026-11-15, 17:06-17:13 (+07:00), under the shared-machine lock with no lock wait (0.08 to 0.09 s of helper overhead per
command), Windows x64, AMD EPYC 7763 (16 cores, 64 GiB), Node v26.13.0, time factor 2; results in
`docs/difficulty-v3/evidence/MS07f/quick/`, the reconciliation in `evidence/MS07f/reconcile.txt`. Every test passed, none was
skipped, and every inventory key appears exactly once.

| | Before (MS08a `quick-final-2`) | After (MS07f `quick`) | Change |
|---|---:|---:|---:|
| Generator fingerprint | `519cd6653180d243…` | `b8ba10267ffe8650a6e0d48f5251f1d495e3c33ff01bb144549ffee6ee35ca40` (165 files) | MS07f's edits to tests, guides and designs |
| Generator tests, shards | 3,563 in 8 | 3,560 in 8 | -3 |
| Generator standing cost, **sum of the four group commands** | 699.833 s (71.582 + 170.353 + 317.976 + 139.922) | **296.670 s** (71.326 + 170.900 + 30.622 + 23.822) | -403.163 s (-57.6 %) |
| Generator, sum of the per-shard process seconds (the manifest's convention) | 696.1 s | 293.5 s | -402.6 s (-57.8 %) |
| Longest Generator shard | `pipeline` 317.3 s | `own-fast` 168.2 s | -149.1 s |
| Player fingerprint | `222e69cffbc2ea1c…` | `d1581ee06644a982cc5673df12e49822fad8c978df5f3b0ef4276a7aa75a0058` (130 files) | guides and `player/design.md` (counts) |
| Player tests | 1,807 | 1,807 | none |
| Player, command wall | 35.295 s | 35.012 s | -0.283 s (run-to-run noise; the Player is unchanged) |
| Player, runner body ("running tests") | 34.66 s | 34.54 s | -0.12 s |

**Conventions, so that like is compared with like (IR68).** The Generator figures are sums of the helper's seconds for the
four locked group commands, and the second row is the group runner's per-shard process seconds (the values of
`.github/scripts/generator-quick.json`). The Player's wall is the helper's seconds for its one command, and its body is the
runner's own time; the manifest's 34.7 s is a body time. Both sides of every comparison above use the same convention.

| Shard | Tests before | Tests after | Process s before | Process s after |
|---|---:|---:|---:|---:|
| `core-shared` | 1,267 | 1,267 | 28.3 | 28.2 |
| `steps` | 57 | 57 | 15.8 | 15.8 |
| `replay` | 154 | 154 | 15.0 | 15.0 |
| `mega` | 108 | 108 | 11.0 | 10.9 |
| `own-fast` | 1,679 | 1,679 | 167.5 | 168.2 |
| `digger-target` | 75 | 75 | 1.8 | 1.8 |
| `pipeline` | 154 | **151** | 317.3 | **30.2** |
| `player` (the replay player of the Generator) | 69 | 69 | 139.4 | **23.4** |

**What moved.** The three tests `pipeline > instrumented generators: what the events cost > generating puzzles: verbosity 'off' costs
less than 2%`, `'summary' costs less than 10%` and `'full' costs less than 35%` are now in the manual `perf` suite under the same
describe name. `player > player: the replay steps of a result > real top-level results with clues shown again replay faithfully
(mega16, classic9)` is now `(classic9)` in the quick `player` suite (one request, Hell 1 seed 3) and `(mega16)` in the manual
`variants` suite under a describe of the same name (Nightmare seed 478576959, then Hell 1 seed 2422420669). The Generator `player`
suite still has 69 tests, `pipeline` 151, and the manual tier 1,148 tests (1,144 before).

**What the four cases cost on the same source, one locked command each, from a fresh process.**

| Case (manual) | Before, inside the quick shard (MS08a) | After, selected alone |
|---|---:|---:|
| `generating puzzles: verbosity 'off'` | 95.30 s | 95.84 s |
| `generating puzzles: verbosity 'summary'` | 95.39 s | 95.16 s |
| `generating puzzles: verbosity 'full'` | 96.15 s | 96.89 s |
| `(mega16)`, two requests | 116.03 s (the whole case: the classic9 request is generated earlier, by the test that checks the 13 kinds of title, and the case reuses it) | 118.04 s |

The three ratios take 287.89 s together (process 288.311 s) and the mega16 case 119.088 s of process time, both projected from the
MS08a rows (286.84 s and 116.03 s plus start-up) before they ran, each far under the 450 s limit. The classic9 case that stays quick
now takes 0.5 ms inside its own shard, since its result is the one that the earlier test generated. By group wall, `pipeline` lost
287.4 s and `replay-player` 116.1 s, 403.5 s together, and the other two groups gained 0.3 s together: the 403.2 s of the table.

**Where the time goes now (suite `results.ms`).** `worker` 45.9 s, `pipeline` 29.8 s, `difficulty-floor` 27.3 s (16.5 s of it the
case "equals the reference on small generated samples", a further candidate that S-OD8 does not move), `player` 23.0 s, `multigrid`
19.1 s, `steps` 15.4 s, `replay` 14.6 s, `difficulty-diagnostics` 12.8 s, `perf-tooling` 11.5 s; the Player's longest suites are
`tech-fish` and `tech-chain` (7.7 s each).

**Reading.** The Generator standing cost is now **296.7 s, 4 min 57 s**, and the proposal's "about 300 s" was a projection, not a
promise: its margin to five minutes is 3.3 s, less than the run-to-run spread seen between MS08a's two complete runs (691.6 s and
699.8 s), so a later source or machine can land on either side of it. No further move is approved. The three ratios and the two mega16
replays no longer gate a pull request (the accepted loss of S-OD8); their manual outcomes are in
`evidence/MS07f/manual/ratios.json` and `mega-replay.json`, and MS18e reruns the four cases on the final source.
