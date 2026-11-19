# Levels offered per variant (rating v3 qualification)

Every variant offers exactly the difficulty levels that pass the qualification protocol of the joint
report ([report-detailed.md](../difficulty-v3/report-detailed.md), R24; the rating v2 protocol is
section 6 of [report-detailed.md](report-detailed.md)). The lists below are the `difficultySupport` of
the variant definitions (`generator/js/variants/*.js`); `generator/tests/manual/difficulty.test.js` (a
manual suite: `node tests/node-runner.js --suite=difficulty`, run in `generator/`) checks that they are
the same. The rating v2 record, with the machine, the engine and the numbers it was measured with, is
kept unchanged in [qualification-v2.md](../difficulty-v3/qualification-v2.md).

## Protocol

`node tests/qualify.js` (run in `generator/`) runs it (options: `--variant`, `--level`, `--jobs`,
`--json`, `--markdown`, `--probe`, `--no-early-stop`, `--quiet`, `--merge`, `--help`). The protocol is
unchanged from rating v2 except where marked v3.

- For every variant with its default options and symmetry, and every level, 40 puzzles are generated
  with fixed seeds through the real pipeline (`SG.pipeline.run`, with the 120 s active-time guard of the
  application). Request *k* of (variant, level) uses the FNV-1a hash of `variant/level/k` on the base
  seed 20260601, so a re-run makes the same puzzles.
- v3: a request never names `maxAttempts`. It takes the default number of attempts of the size of its
  board (`SG.digger.defaultMaxAttempts`: 8 up to 81 cells, 4 up to 144, 2 above), so a large board that
  meets no exact puzzle in those attempts ends in the fallback, which is a miss.
- A request is a **hit** when it returns a valid puzzle (the givens belong to the solution, the solution
  is valid, the DFS counts exactly one solution) with a complete logical proof whose level is exactly
  the requested one, without the warning `difficulty.approximate`, and the result is `exact` (v3: the
  proof also needs a technique of the tier of the level; an absent flag is a miss). Timeouts, errors,
  approximate and unrated results are misses, and every request counts, also in the time percentile.
- **Offered** with at least 36 hits of 40 and a 95th percentile of the generation time within the
  budget: 2 s for boards of at most 36 cells (classic4, classic6), 10 s for the other boards of at most
  81 cells, 30 s for larger boards. With 30 to 35 hits, 60 more seeds run, and the level is offered with
  at least 90 hits of the 100 and the 95th percentile of all 100 within the budget. Fewer than 30 hits:
  hidden. Lists may have gaps.
- Early stop: a level stops as soon as its verdict cannot change any more (more than 10 misses among the
  first 40, more than 10 misses of 100, or more slow requests than the percentile of 100 requests
  allows); the column `n` shows how many requests ran. Such a level is hidden either way
  (`--no-early-stop` runs every seed).
- A level is offered only from exactly 40 or 100 recorded outcomes. A worker process that stops
  unexpectedly, a message that cannot be sent or a request left without an outcome fails the whole run:
  nothing is written and the exit code is 1 (2 for a usage error).
- Four worker processes, always: the 95th percentile is part of the verdict, so runs with different job
  counts are not comparable, and the merge accepts only `--jobs=4`.
- The qualification enables every level in its workers, whatever `difficultySupport` says, so publishing
  the lists after the measurement does not enter the measurement.

## Last run: the final rating v3 qualification

- Date: 2026-11-19 02:39 to 05:30 (UTC+7), which is 2026-11-18 19:39 to 22:30 UTC. The first start to
  the last end is 10,252 s, and the 135 runs of one cell each add up to 5,759 s. Every cell ran on its
  own with four worker processes, 140 attempts in all: five cells were first held before any request
  started (see below).
- Machine: AMD EPYC 7763 64-Core Processor, 16 logical processors, 64 GB, Windows (10.0.26300), Node
  v26.13.0, 4 jobs.
- **Environment: host-active, not strict-quiet.** The machine was running the agent session that drove
  the qualification, so it could not be made quiescent. The declared policy is `MS18c-GQ-host-active`
  (owner decision S-OD13). The raw strict screen (five one-second CPU intervals, mean at most 0.5 and
  maximum at most 1.0 busy cores) failed in all 140 admissions. Under the named policy a cell is
  admitted unless another process uses at least 0.5 CPU-seconds per elapsed second; five cells were held
  for such a process and started at their second admission at least 60 s later (mega12 hell2, killer
  hell2, butterfly very easy, flower nightmare, wordoku hard). The times below were measured as they
  were: no CPU was subtracted, no time was normalized, and they are not strict-quiet timings. They
  decide the offers.
- Engine (measured): the commit `ed2fe50c`, with a working tree that had changes outside the engine
  files. The hash of the sources is `0ca29eaeebc295b6` (the 46 files of `core/js/engine`,
  `generator/js/engine` and `generator/js/variants` that `tests/qualify.js` loads), the same as at
  `14d8c903`. The qualifier tool hash (`qualify.js` and `fixtures/qualification-records.js`) is
  `c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77`. The attempt policy recorded in
  every record is the board default, with no explicit attempt count.
- Engine (publication): after the `difficultySupport` arrays of eight variant files were edited to the
  lists below, the same 46 files hash to `75b0955e3e356bd1`. That edit changes support lists only, no
  solver, default, weight, limit or protocol, and the qualification does not read them. The measured
  identity `0ca29eaeebc295b6` is never retagged, and the records are not merged again against the
  published sources.
- Raw record: `docs/difficulty-v3/evidence/MS18c/merge/qualification-v3.json` (SHA-256
  `B8E546FC0BA5BD1F79F408984BF3BF8F82559305EA6BD63CBE6DC53BEFF0DF04`) and the table below
  (`merge/table.md`, SHA-256 `55FA37C244218DC16FB61A21E93B9E250B8B894708E7918843A17922CDEE0965`), from
  the complete 135-cell merge (`node tests/qualify.js --merge --jobs=4`, exit 0, no invalid request).
- 4,313 requests: 3,783 exact hits, 503 approximate results (10 on offered levels, 493 on hidden
  levels), **27 timeouts** and no invalid or ambiguous puzzle. All 4,286 other outcomes are valid and
  solved.
- The 27 timeouts are `budget.exceeded` results at the 120 s guard (the longest took 120,051.7349 ms).
  They are misses and count in the percentiles: mega16/hell1 9, greaterThan/hell1 2, samurai/nightmare
  1, samurai/hell1 9, sohei/hell1 6.
- 79 (variant, level) pairs are offered and 56 hidden; 54 hidden levels stopped early. Three levels
  needed a second round and were hidden: hyper/expert (53 requests), flower/nightmare (50 requests),
  wordoku/normal (46 requests).
- On the 79 offered pairs: 3,150 hits of 3,160 requests (the misses: classic6/hard 39 of 40,
  classic9/normal 36 of 40, killer/normal 38 of 40, sohei/normal 39 of 40, sohei/expert 39 of 40,
  butterfly/expert 39 of 40). Closest to their budget are the 95th percentiles of sohei/hell2 27.16 s of
  30 s, greaterThan/hell2 8.83 s of 10 s, hyper/nightmare 8.50 s of 10 s; the slowest single request of
  an offered level took 66.79 s (samurai/master).

## Levels offered

The `difficultySupport` lists, in global level order: 79 of the 135 pairs (rating v2: 118).

| variant | levels offered | count in v2 | count now |
|---|---|---:|---:|
| classic4 | veryEasy | 1 | 1 |
| classic6 | veryEasy, hard | 2 | 2 |
| classic9 | veryEasy, easy, normal, hard, expert, master, nightmare | 8 | 7 |
| mega12 | veryEasy, easy, normal, hard, expert, master, nightmare, hell2 | 9 | 8 |
| mega16 | veryEasy, easy, normal, hard, master, hell2 | 9 | 6 |
| diagonalX | veryEasy, normal, hard, master, nightmare, hell2 | 9 | 6 |
| hyper | veryEasy, normal, hard, master, nightmare, hell2 | 9 | 6 |
| jigsaw9 | veryEasy, easy, normal, hard, master, hell2 | 9 | 6 |
| killer | veryEasy, easy, normal | 9 | 3 |
| greaterThan | veryEasy, easy, hard, master, hell2 | 9 | 5 |
| samurai | veryEasy, normal, hard, expert, master | 9 | 5 |
| sohei | veryEasy, normal, hard, expert, master, hell2 | 9 | 6 |
| butterfly | veryEasy, normal, hard, expert, master, nightmare, hell2 | 9 | 7 |
| flower | veryEasy, normal, hard, master, hell2 | 9 | 5 |
| wordoku | veryEasy, easy, hard, expert, master, nightmare | 8 | 6 |

classic4 and classic6 are unchanged. No level that rating v2 hid is offered now.

### Killer Hard and Expert: withheld by owner decision S-OD7

Killer Hard (0 hits of 14, hidden: misses) and Killer Expert (2 of 12, hidden: time) did not pass the
qualification either, and the table keeps those raw verdicts. The owner decision S-OD7 withholds both
levels, **hidden until later calibration (S-OD7)**, whatever a later raw verdict says. That product
restriction is separate from the qualification, and no weight or rating change in rating v3 follows from
it. No other level is withheld by decision: every other hidden level failed its qualification.

## Removed levels: offered in rating v2, hidden now (39)

Each row is a level of the rating v2 table that this qualification does not confirm. v2 and now give
hits of requests and the 95th percentile of the generation time (every request counts); the budget is
the time budget of the board.

| cell | v2 hits | v2 p95 | now hits | now p95 | budget | why hidden now |
|---|---:|---:|---:|---:|---:|---|
| classic9/hell1 | 40/40 | 758 ms | 0/9 | 16.0 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| mega12/hell1 | 40/40 | 1.08 s | 0/9 | 105.8 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| mega16/expert | 40/40 | 349 ms | 35/40 | 40.1 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| mega16/nightmare | 40/40 | 944 ms | 25/25 | 60.8 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| mega16/hell1 | 40/40 | 744 ms | 0/9 | 120.0 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| diagonalX/easy | 40/40 | 1 ms | 28/40 | 1.54 s | 10.0 s | too many misses (stopped early) |
| diagonalX/expert | 40/40 | 35 ms | 37/40 | 11.8 s | 10.0 s | p95 above the budget |
| diagonalX/hell1 | 40/40 | 139 ms | 0/9 | 101.0 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| hyper/easy | 40/40 | 1 ms | 29/40 | 1.48 s | 10.0 s | too many misses (stopped early) |
| hyper/expert | 40/40 | 270 ms | 42/53 | 4.98 s | 10.0 s | too many misses (stopped early) |
| hyper/hell1 | 40/40 | 170 ms | 0/9 | 49.4 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| jigsaw9/expert | 40/40 | 310 ms | 30/34 | 13.7 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| jigsaw9/nightmare | 40/40 | 57 ms | 27/27 | 18.1 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| jigsaw9/hell1 | 40/40 | 145 ms | 0/9 | 80.5 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| killer/hard | 40/40 | 518 ms | 0/14 | 6.89 s | 10.0 s | too many misses (stopped early) |
| killer/expert | 40/40 | 8.65 s | 2/12 | 34.4 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| killer/master | 40/40 | 5.04 s | 11/14 | 42.7 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| killer/nightmare | 40/40 | 8.16 s | 18/22 | 32.7 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| killer/hell1 | 40/40 | 1.13 s | 0/9 | 100.5 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| killer/hell2 | 40/40 | 3.02 s | 40/40 | 21.2 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| greaterThan/normal | 40/40 | 73 ms | 40/40 | 10.2 s | 10.0 s | p95 above the budget |
| greaterThan/expert | 38/40 | 9.50 s | 38/40 | 14.3 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| greaterThan/nightmare | 40/40 | 999 ms | 13/13 | 46.1 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| greaterThan/hell1 | 40/40 | 473 ms | 0/9 | 120.0 s | 10.0 s | p95 cannot fit the budget (stopped early) |
| samurai/easy | 40/40 | 17 ms | 10/22 | 1.13 s | 30.0 s | too many misses (stopped early) |
| samurai/nightmare | 40/40 | 891 ms | 14/17 | 120.0 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| samurai/hell1 | 40/40 | 2.84 s | 0/9 | 120.1 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| samurai/hell2 | 40/40 | 6.36 s | 40/40 | 43.6 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| sohei/easy | 40/40 | 10 ms | 4/18 | 899 ms | 30.0 s | too many misses (stopped early) |
| sohei/nightmare | 40/40 | 704 ms | 29/30 | 78.8 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| sohei/hell1 | 40/40 | 1.73 s | 0/9 | 120.0 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| butterfly/easy | 40/40 | 3 ms | 1/15 | 1.12 s | 30.0 s | too many misses (stopped early) |
| butterfly/hell1 | 40/40 | 1.78 s | 0/9 | 89.7 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| flower/easy | 40/40 | 10 ms | 0/14 | 902 ms | 30.0 s | too many misses (stopped early) |
| flower/expert | 40/40 | 398 ms | 23/35 | 7.72 s | 30.0 s | too many misses (stopped early) |
| flower/nightmare | 40/40 | 384 ms | 42/50 | 32.5 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| flower/hell1 | 40/40 | 1.05 s | 0/9 | 74.2 s | 30.0 s | p95 cannot fit the budget (stopped early) |
| wordoku/normal | 39/40 | 112 ms | 35/46 | 904 ms | 10.0 s | too many misses (stopped early) |
| wordoku/hell1 | 40/40 | 715 ms | 0/9 | 15.8 s | 10.0 s | p95 cannot fit the budget (stopped early) |

### Two close misses

- **Greater-Than Normal**: 40 hits of 40, but a 95th percentile of 10,192.4051 ms against its budget of
  10,000 ms (about 1.9 % over). Hidden, with no early stop.
- **diagonalX Expert**: 37 hits of 40, and a 95th percentile of 11,795.9214 ms against 10,000 ms.
  Hidden, with no early stop.

Both fail the unchanged protocol by their time, as measured, and are not repeated for a faster run.

## Hidden in rating v2 and still hidden (17)

- classic4: easy 0/14, normal 0/14, hard 0/14, expert 0/14, master 0/14, nightmare 0/14, hell1 0/14,
  hell2 0/14.
- classic6: easy 0/14, normal 0/14, expert 11/23, master 5/19, nightmare 0/14, hell1 0/14, hell2 0/14.
- classic9: hell2 3/17.
- wordoku: hell2 1/14.

"Hidden" means "not generated reliably under these settings", never "impossible": a puzzle keeps its
real level even where that level is not offered. A bounded fallback, a shallow result or a timeout is a
miss, and no hidden level is kept offered.

## Table

`n` requests, `hits`, the hit `rate`, the 50th and 95th percentiles and the maximum of the generation
time (every request), the time `budget` and the verdict. It is the table of the merge, line for line.

| variant | level | n | hits | rate | p50 | p95 | max | budget | verdict |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| classic4 | veryEasy | 40 | 40 | 100 % | 1 ms | 10 ms | 13 ms | 2.00 s | offered |
| classic4 | easy | 14 | 0 | 0 % | 126 ms | 184 ms | 184 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | normal | 14 | 0 | 0 % | 131 ms | 185 ms | 185 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | hard | 14 | 0 | 0 % | 182 ms | 265 ms | 265 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | expert | 14 | 0 | 0 % | 161 ms | 277 ms | 277 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | master | 14 | 0 | 0 % | 195 ms | 321 ms | 321 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | nightmare | 14 | 0 | 0 % | 209 ms | 303 ms | 303 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | hell1 | 14 | 0 | 0 % | 217 ms | 370 ms | 370 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | hell2 | 14 | 0 | 0 % | 234 ms | 420 ms | 420 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | veryEasy | 40 | 40 | 100 % | 2 ms | 13 ms | 14 ms | 2.00 s | offered |
| classic6 | easy | 14 | 0 | 0 % | 346 ms | 387 ms | 387 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | normal | 14 | 0 | 0 % | 288 ms | 390 ms | 390 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | hard | 40 | 39 | 98 % | 65 ms | 321 ms | 399 ms | 2.00 s | offered |
| classic6 | expert | 23 | 11 | 48 % | 317 ms | 581 ms | 582 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | master | 19 | 5 | 26 % | 501 ms | 789 ms | 789 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | nightmare | 14 | 0 | 0 % | 660 ms | 1.21 s | 1.21 s | 2.00 s | hidden (stopped: misses) |
| classic6 | hell1 | 14 | 0 | 0 % | 800 ms | 1.15 s | 1.15 s | 2.00 s | hidden (stopped: misses) |
| classic6 | hell2 | 14 | 0 | 0 % | 770 ms | 1.20 s | 1.20 s | 2.00 s | hidden (stopped: misses) |
| classic9 | veryEasy | 40 | 40 | 100 % | 3 ms | 18 ms | 20 ms | 10.0 s | offered |
| classic9 | easy | 40 | 40 | 100 % | 218 ms | 780 ms | 1.32 s | 10.0 s | offered |
| classic9 | normal | 40 | 36 | 90 % | 398 ms | 876 ms | 953 ms | 10.0 s | offered |
| classic9 | hard | 40 | 40 | 100 % | 34 ms | 256 ms | 493 ms | 10.0 s | offered |
| classic9 | expert | 40 | 40 | 100 % | 39 ms | 441 ms | 545 ms | 10.0 s | offered |
| classic9 | master | 40 | 40 | 100 % | 114 ms | 352 ms | 469 ms | 10.0 s | offered |
| classic9 | nightmare | 40 | 40 | 100 % | 942 ms | 2.79 s | 3.23 s | 10.0 s | offered |
| classic9 | hell1 | 9 | 0 | 0 % | 12.6 s | 16.0 s | 16.0 s | 10.0 s | hidden (stopped: time) |
| classic9 | hell2 | 17 | 3 | 18 % | 9.54 s | 10.9 s | 10.9 s | 10.0 s | hidden (stopped: misses) |
| mega12 | veryEasy | 40 | 40 | 100 % | 6 ms | 25 ms | 27 ms | 30.0 s | offered |
| mega12 | easy | 40 | 40 | 100 % | 12 ms | 49 ms | 54 ms | 30.0 s | offered |
| mega12 | normal | 40 | 40 | 100 % | 22 ms | 70 ms | 128 ms | 30.0 s | offered |
| mega12 | hard | 40 | 40 | 100 % | 54 ms | 220 ms | 372 ms | 30.0 s | offered |
| mega12 | expert | 40 | 40 | 100 % | 247 ms | 2.59 s | 7.95 s | 30.0 s | offered |
| mega12 | master | 40 | 40 | 100 % | 211 ms | 842 ms | 1.11 s | 30.0 s | offered |
| mega12 | nightmare | 40 | 40 | 100 % | 2.36 s | 6.28 s | 8.74 s | 30.0 s | offered |
| mega12 | hell1 | 9 | 0 | 0 % | 96.1 s | 105.8 s | 105.8 s | 30.0 s | hidden (stopped: time) |
| mega12 | hell2 | 40 | 40 | 100 % | 5.29 s | 9.46 s | 11.5 s | 30.0 s | offered |
| mega16 | veryEasy | 40 | 40 | 100 % | 13 ms | 37 ms | 40 ms | 30.0 s | offered |
| mega16 | easy | 40 | 40 | 100 % | 20 ms | 56 ms | 61 ms | 30.0 s | offered |
| mega16 | normal | 40 | 40 | 100 % | 39 ms | 90 ms | 135 ms | 30.0 s | offered |
| mega16 | hard | 40 | 40 | 100 % | 361 ms | 1.72 s | 2.02 s | 30.0 s | offered |
| mega16 | expert | 40 | 35 | 88 % | 2.42 s | 40.1 s | 56.3 s | 30.0 s | hidden (stopped: time) |
| mega16 | master | 40 | 40 | 100 % | 1.82 s | 5.53 s | 6.38 s | 30.0 s | offered |
| mega16 | nightmare | 25 | 25 | 100 % | 15.1 s | 60.8 s | 65.9 s | 30.0 s | hidden (stopped: time) |
| mega16 | hell1 | 9 | 0 | 0 % | 120.0 s | 120.0 s | 120.0 s | 30.0 s | hidden (stopped: time) |
| mega16 | hell2 | 40 | 40 | 100 % | 1.59 s | 25.2 s | 43.0 s | 30.0 s | offered |
| diagonalX | veryEasy | 40 | 40 | 100 % | 3 ms | 18 ms | 20 ms | 10.0 s | offered |
| diagonalX | easy | 40 | 28 | 70 % | 575 ms | 1.54 s | 1.55 s | 10.0 s | hidden (stopped: misses) |
| diagonalX | normal | 40 | 40 | 100 % | 22 ms | 190 ms | 400 ms | 10.0 s | offered |
| diagonalX | hard | 40 | 40 | 100 % | 23 ms | 77 ms | 98 ms | 10.0 s | offered |
| diagonalX | expert | 40 | 37 | 93 % | 2.22 s | 11.8 s | 16.2 s | 10.0 s | hidden |
| diagonalX | master | 40 | 40 | 100 % | 94 ms | 663 ms | 915 ms | 10.0 s | offered |
| diagonalX | nightmare | 40 | 40 | 100 % | 1.72 s | 5.37 s | 7.41 s | 10.0 s | offered |
| diagonalX | hell1 | 9 | 0 | 0 % | 89.2 s | 101.0 s | 101.0 s | 10.0 s | hidden (stopped: time) |
| diagonalX | hell2 | 40 | 40 | 100 % | 343 ms | 2.89 s | 3.37 s | 10.0 s | offered |
| hyper | veryEasy | 40 | 40 | 100 % | 3 ms | 18 ms | 19 ms | 10.0 s | offered |
| hyper | easy | 40 | 29 | 73 % | 769 ms | 1.48 s | 1.57 s | 10.0 s | hidden (stopped: misses) |
| hyper | normal | 40 | 40 | 100 % | 128 ms | 524 ms | 806 ms | 10.0 s | offered |
| hyper | hard | 40 | 40 | 100 % | 23 ms | 80 ms | 139 ms | 10.0 s | offered |
| hyper | expert | 53 | 42 | 79 % | 1.47 s | 4.98 s | 5.93 s | 10.0 s | hidden (stopped: misses) |
| hyper | master | 40 | 40 | 100 % | 196 ms | 507 ms | 1.55 s | 10.0 s | offered |
| hyper | nightmare | 40 | 40 | 100 % | 1.83 s | 8.50 s | 11.3 s | 10.0 s | offered |
| hyper | hell1 | 9 | 0 | 0 % | 41.8 s | 49.4 s | 49.4 s | 10.0 s | hidden (stopped: time) |
| hyper | hell2 | 40 | 40 | 100 % | 1.48 s | 4.84 s | 6.73 s | 10.0 s | offered |
| jigsaw9 | veryEasy | 40 | 40 | 100 % | 15 ms | 54 ms | 74 ms | 10.0 s | offered |
| jigsaw9 | easy | 40 | 40 | 100 % | 70 ms | 635 ms | 769 ms | 10.0 s | offered |
| jigsaw9 | normal | 40 | 40 | 100 % | 47 ms | 225 ms | 414 ms | 10.0 s | offered |
| jigsaw9 | hard | 40 | 40 | 100 % | 69 ms | 145 ms | 161 ms | 10.0 s | offered |
| jigsaw9 | expert | 34 | 30 | 88 % | 4.63 s | 13.7 s | 14.7 s | 10.0 s | hidden (stopped: time) |
| jigsaw9 | master | 40 | 40 | 100 % | 502 ms | 1.74 s | 2.72 s | 10.0 s | offered |
| jigsaw9 | nightmare | 27 | 27 | 100 % | 4.86 s | 18.1 s | 20.4 s | 10.0 s | hidden (stopped: time) |
| jigsaw9 | hell1 | 9 | 0 | 0 % | 65.6 s | 80.5 s | 80.5 s | 10.0 s | hidden (stopped: time) |
| jigsaw9 | hell2 | 40 | 40 | 100 % | 2.98 s | 6.10 s | 9.90 s | 10.0 s | offered |
| killer | veryEasy | 40 | 40 | 100 % | 3 ms | 22 ms | 26 ms | 10.0 s | offered |
| killer | easy | 40 | 40 | 100 % | 13 ms | 39 ms | 65 ms | 10.0 s | offered |
| killer | normal | 40 | 38 | 95 % | 369 ms | 1.81 s | 2.25 s | 10.0 s | offered |
| killer | hard | 14 | 0 | 0 % | 5.82 s | 6.89 s | 6.89 s | 10.0 s | hidden (stopped: misses) |
| killer | expert | 12 | 2 | 17 % | 13.5 s | 34.4 s | 34.4 s | 10.0 s | hidden (stopped: time) |
| killer | master | 14 | 11 | 79 % | 17.3 s | 42.7 s | 42.7 s | 10.0 s | hidden (stopped: time) |
| killer | nightmare | 22 | 18 | 82 % | 5.74 s | 32.7 s | 64.8 s | 10.0 s | hidden (stopped: time) |
| killer | hell1 | 9 | 0 | 0 % | 40.8 s | 100.5 s | 100.5 s | 10.0 s | hidden (stopped: time) |
| killer | hell2 | 40 | 40 | 100 % | 2.95 s | 21.2 s | 40.5 s | 10.0 s | hidden (stopped: time) |
| greaterThan | veryEasy | 40 | 40 | 100 % | 24 ms | 54 ms | 55 ms | 10.0 s | offered |
| greaterThan | easy | 40 | 40 | 100 % | 36 ms | 92 ms | 113 ms | 10.0 s | offered |
| greaterThan | normal | 40 | 40 | 100 % | 2.00 s | 10.2 s | 10.6 s | 10.0 s | hidden |
| greaterThan | hard | 40 | 40 | 100 % | 163 ms | 2.83 s | 3.21 s | 10.0 s | offered |
| greaterThan | expert | 40 | 38 | 95 % | 4.35 s | 14.3 s | 19.9 s | 10.0 s | hidden (stopped: time) |
| greaterThan | master | 40 | 40 | 100 % | 979 ms | 5.95 s | 7.83 s | 10.0 s | offered |
| greaterThan | nightmare | 13 | 13 | 100 % | 12.9 s | 46.1 s | 46.1 s | 10.0 s | hidden (stopped: time) |
| greaterThan | hell1 | 9 | 0 | 0 % | 110.6 s | 120.0 s | 120.0 s | 10.0 s | hidden (stopped: time) |
| greaterThan | hell2 | 40 | 40 | 100 % | 3.83 s | 8.83 s | 19.4 s | 10.0 s | offered |
| samurai | veryEasy | 40 | 40 | 100 % | 17 ms | 47 ms | 50 ms | 30.0 s | offered |
| samurai | easy | 22 | 10 | 45 % | 864 ms | 1.13 s | 1.17 s | 30.0 s | hidden (stopped: misses) |
| samurai | normal | 40 | 40 | 100 % | 231 ms | 837 ms | 2.72 s | 30.0 s | offered |
| samurai | hard | 40 | 40 | 100 % | 166 ms | 887 ms | 1.14 s | 30.0 s | offered |
| samurai | expert | 40 | 40 | 100 % | 513 ms | 4.03 s | 9.05 s | 30.0 s | offered |
| samurai | master | 40 | 40 | 100 % | 1.65 s | 6.69 s | 66.8 s | 30.0 s | offered |
| samurai | nightmare | 17 | 14 | 82 % | 32.3 s | 120.0 s | 120.0 s | 30.0 s | hidden (stopped: time) |
| samurai | hell1 | 9 | 0 | 0 % | 120.0 s | 120.1 s | 120.1 s | 30.0 s | hidden (stopped: time) |
| samurai | hell2 | 40 | 40 | 100 % | 16.2 s | 43.6 s | 47.8 s | 30.0 s | hidden (stopped: time) |
| sohei | veryEasy | 40 | 40 | 100 % | 14 ms | 41 ms | 44 ms | 30.0 s | offered |
| sohei | easy | 18 | 4 | 22 % | 708 ms | 899 ms | 899 ms | 30.0 s | hidden (stopped: misses) |
| sohei | normal | 40 | 39 | 98 % | 213 ms | 3.73 s | 9.02 s | 30.0 s | offered |
| sohei | hard | 40 | 40 | 100 % | 135 ms | 516 ms | 606 ms | 30.0 s | offered |
| sohei | expert | 40 | 39 | 98 % | 308 ms | 7.01 s | 13.9 s | 30.0 s | offered |
| sohei | master | 40 | 40 | 100 % | 952 ms | 4.70 s | 8.09 s | 30.0 s | offered |
| sohei | nightmare | 30 | 29 | 97 % | 17.2 s | 78.8 s | 100.2 s | 30.0 s | hidden (stopped: time) |
| sohei | hell1 | 9 | 0 | 0 % | 120.0 s | 120.0 s | 120.0 s | 30.0 s | hidden (stopped: time) |
| sohei | hell2 | 40 | 40 | 100 % | 6.29 s | 27.2 s | 41.7 s | 30.0 s | offered |
| butterfly | veryEasy | 40 | 40 | 100 % | 7 ms | 29 ms | 34 ms | 30.0 s | offered |
| butterfly | easy | 15 | 1 | 7 % | 972 ms | 1.12 s | 1.12 s | 30.0 s | hidden (stopped: misses) |
| butterfly | normal | 40 | 40 | 100 % | 98 ms | 1.04 s | 1.49 s | 30.0 s | offered |
| butterfly | hard | 40 | 40 | 100 % | 83 ms | 211 ms | 309 ms | 30.0 s | offered |
| butterfly | expert | 40 | 39 | 98 % | 330 ms | 4.44 s | 4.97 s | 30.0 s | offered |
| butterfly | master | 40 | 40 | 100 % | 272 ms | 728 ms | 948 ms | 30.0 s | offered |
| butterfly | nightmare | 40 | 40 | 100 % | 3.94 s | 16.1 s | 21.2 s | 30.0 s | offered |
| butterfly | hell1 | 9 | 0 | 0 % | 84.6 s | 89.7 s | 89.7 s | 30.0 s | hidden (stopped: time) |
| butterfly | hell2 | 40 | 40 | 100 % | 3.41 s | 11.0 s | 14.3 s | 30.0 s | offered |
| flower | veryEasy | 40 | 40 | 100 % | 9 ms | 34 ms | 35 ms | 30.0 s | offered |
| flower | easy | 14 | 0 | 0 % | 714 ms | 902 ms | 902 ms | 30.0 s | hidden (stopped: misses) |
| flower | normal | 40 | 40 | 100 % | 135 ms | 767 ms | 2.03 s | 30.0 s | offered |
| flower | hard | 40 | 40 | 100 % | 160 ms | 516 ms | 3.52 s | 30.0 s | offered |
| flower | expert | 35 | 23 | 66 % | 2.20 s | 7.72 s | 8.47 s | 30.0 s | hidden (stopped: misses) |
| flower | master | 40 | 40 | 100 % | 429 ms | 1.07 s | 2.36 s | 30.0 s | offered |
| flower | nightmare | 50 | 42 | 84 % | 11.0 s | 32.5 s | 36.7 s | 30.0 s | hidden (stopped: time) |
| flower | hell1 | 9 | 0 | 0 % | 62.1 s | 74.2 s | 74.2 s | 30.0 s | hidden (stopped: time) |
| flower | hell2 | 40 | 40 | 100 % | 1.18 s | 9.08 s | 13.9 s | 30.0 s | offered |
| wordoku | veryEasy | 40 | 40 | 100 % | 4 ms | 18 ms | 21 ms | 10.0 s | offered |
| wordoku | easy | 40 | 40 | 100 % | 211 ms | 974 ms | 1.34 s | 10.0 s | offered |
| wordoku | normal | 46 | 35 | 76 % | 377 ms | 904 ms | 1.33 s | 10.0 s | hidden (stopped: misses) |
| wordoku | hard | 40 | 40 | 100 % | 40 ms | 283 ms | 710 ms | 10.0 s | offered |
| wordoku | expert | 40 | 40 | 100 % | 85 ms | 393 ms | 599 ms | 10.0 s | offered |
| wordoku | master | 40 | 40 | 100 % | 142 ms | 345 ms | 437 ms | 10.0 s | offered |
| wordoku | nightmare | 40 | 40 | 100 % | 550 ms | 1.32 s | 4.22 s | 10.0 s | offered |
| wordoku | hell1 | 9 | 0 | 0 % | 12.7 s | 15.8 s | 15.8 s | 10.0 s | hidden (stopped: time) |
| wordoku | hell2 | 14 | 1 | 7 % | 10.3 s | 14.1 s | 14.1 s | 10.0 s | hidden (stopped: time) |
