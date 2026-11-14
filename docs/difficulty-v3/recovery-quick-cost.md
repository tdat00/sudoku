# Recovery quick cost: what a complete quick run costs, per app

**Status: measured by MS05r6b on 2026-11-14 on the final source, with every quick test passing in both apps.** The numbers
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
