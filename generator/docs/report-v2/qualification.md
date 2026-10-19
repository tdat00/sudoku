# Levels offered per variant (rating v2 qualification)

Every variant offers exactly the difficulty levels that pass the qualification protocol of the joint report
([report-detailed.md](report-detailed.md) §6). The lists below are the `difficultySupport` of
the variant definitions (`js/variants/*.js`); `tests/suites/difficulty.test.js` checks that they are the same.

## Protocol

`node tests/qualify.js` runs it (options: `--variant`, `--level`, `--jobs`, `--json`, `--markdown`, `--help`).

- For every variant with its default options and symmetry, and every level, 40 puzzles are generated with fixed
  seeds through the real pipeline (`SG.pipeline.run`, with the 120 s active-time guard of the application). Request
  *k* of (variant, level) uses the FNV-1a hash of `variant/level/k` on the base seed 20260601, so a re-run makes the
  same puzzles.
- A request is a **hit** when it returns a valid puzzle (the givens belong to the solution, the solution is valid,
  the DFS counts exactly one solution) with a complete logical proof whose level is exactly the requested one,
  without the warning `difficulty.approximate`. Timeouts, errors, approximate and unrated results are misses, and
  every request counts, also in the time percentile.
- **Offered** with at least 36 hits of 40 and a 95th percentile of the generation time within the budget: 2 s for
  boards of at most 36 cells (classic4, classic6), 10 s for the other boards of at most 81 cells, 30 s for larger
  boards. With 30 to 35 hits, 60 more seeds run, and the level is offered with at least 90 hits of the 100 and the
  95th percentile of all 100 within the budget. Fewer than 30 hits: hidden. Lists may have gaps.
- Early stop: a level stops as soon as its verdict cannot change any more (more than 10 misses among the first 40,
  more than 10 misses of 100, or more slow requests than the percentile of 100 requests allows); the column `n`
  shows how many requests ran. Such a level is hidden either way (`--no-early-stop` runs every seed).
- A level is offered only from exactly 40 or 100 recorded outcomes. A worker process that stops unexpectedly, a
  message that cannot be sent or a request left without an outcome fails the whole run: nothing is written and the
  exit code is 1 (2 for a usage error).

## Last run

- Date: 2026-10-19, 220 s with 7 worker processes.
- Machine: AMD Ryzen 7 9800X3D (8 cores, 16 logical processors), 61 GB, Windows (10.0.26300), Node v26.8.2.
- Engine: commit `fb07fef` with the rating v2 changes of the working tree (hash of the sources `ba9d2200c6b55446`,
  the files of `js/core` and `js/variants` that `tests/qualify.js` loads). This run follows the reorganisation of
  the documentation, which changed only comments since the previous run (`4891207ab97675e2`): every one of the
  5,053 outcomes (hit, level, score) is identical to that run; only the times differ.
- 5,053 requests: no error, no invalid or ambiguous puzzle, no unrated result; 282 approximate results, of which
  280 on hidden levels. On the 118 offered (variant, level) pairs: 4,718 hits of 4,720 requests (the two misses:
  classic6 hard and Killer very hard, 39 of 40 each).
- Work caps per full-grid attempt (`js/core/digger.js`, report §5.7 (9)), unchanged by the qualification: 1,024
  full ratings (the 64 of the downward refinement included) and 32,768 proposed moves; every uniqueness check of
  a search candidate or of a proposal removal is guarded at 200,000 search nodes. Every full rating of an attempt
  goes through one counted entry point (`SG.digger.rateCounted`), also those of Killer's layout search and of
  Greater-Than's sign tuning, so the cap holds for them too. Killer's layout search (`js/variants/killer.js`) has
  its own caps inside them: 8,192 proposed moves and 256 ratings per attempt, every rating or count a piece of at
  most 30,000 checks.
- When no attempt hits the level, the result is the closest completely rated, valid, unique candidate the run met
  anywhere (dig samples, local search, downward refinement, Killer's layout search, Greater-Than's sign tuning),
  with its replay, marked `difficulty.approximate`. Such a candidate does not go through the dig step's safety net,
  so the run counts its solutions (within the 200,000-node guard) before keeping it, whatever its proof claims.
- Adjustments made while qualifying (all deterministic, counted in work, never in time):
  - the bounded solve of the guided dig's objective is guarded at 100,000 budget checks (a Monster 16×16
    nightmare 2 request went from 106 s to 8 s with the same puzzle);
  - the 200,000-node uniqueness guard also covers the proposal dig of the top tiers (Killer evil outliers of
    11–21 s went down to 2–5 s);
  - the local search judges a repeated candidate from a memo instead of checking and rating it again, and adds no
    clues on Greater-Than (its sign set stays minimal);
  - Killer's layout search rates the layout with the revealed digits completed to whole symmetry groups, and when
    it ends inside the band the dig keeps those clues: Killer very hard went from 80 hits of 91 (hidden) to 39 of
    40 (offered).
- Measured and not adopted: the guided dig treats a removal it refused because the puzzle got stuck or too hard
  as refused for the rest of that dig, although another removal can make it acceptable later (only a lost
  uniqueness is final in principle). Re-checking those refusals after every accepted removal was qualified on the
  same seeds: the first 40 requests of every level took 4.6 times as long in total (7,021 s against 1,531 s), the
  share of exact hits stayed the same (94.5 % against 94.4 %), and seven top levels lost their place for time
  (classic9 nightmare 1; nightmare 2 of Mega 12×12, Hyper, Jigsaw, Samurai, Sohei and Butterfly; classic9
  nightmare 1 went from a 95th percentile of 0.7 s to 18 s). The pruning stays, as a search heuristic.

## Levels offered

| variant | levels |
|---|---|
| classic4 | veryEasy |
| classic6 | veryEasy, hard |
| classic9 | veryEasy … nightmare1 |
| wordoku | veryEasy … nightmare1 |
| mega12, mega16, diagonalX, hyper, jigsaw9, killer, greaterThan, samurai, sohei, butterfly, flower | all nine, veryEasy … nightmare2 |

Hidden, and why: classic4 reaches no level above very easy (0 hits of 17 at every other level: its puzzles need
nothing beyond singles); classic6 never reaches easy, medium or the nightmare levels, and reaches very hard,
expert and evil in only about half of the requests; classic9 and Wordoku reach nightmare 2 in 7 of 23 and 1 of 18
requests under the default rotational symmetry. "Hidden" means "not generated reliably under these settings",
never "impossible": a puzzle keeps its real level even where that level is not offered.

## Table

`n` requests, `hits`, the hit `rate`, the 50th and 95th percentiles and the maximum of the generation time
(every request), the time `budget` and the verdict.
| variant | level | n | hits | rate | p50 | p95 | max | budget | verdict |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| classic4 | veryEasy | 40 | 40 | 100 % | 0 ms | 4 ms | 4 ms | 2.00 s | offered |
| classic4 | easy | 17 | 0 | 0 % | 70 ms | 96 ms | 96 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | medium | 17 | 0 | 0 % | 53 ms | 74 ms | 74 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | hard | 17 | 0 | 0 % | 69 ms | 144 ms | 144 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | veryHard | 17 | 0 | 0 % | 64 ms | 108 ms | 108 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | expert | 17 | 0 | 0 % | 66 ms | 138 ms | 138 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | evil | 17 | 0 | 0 % | 72 ms | 101 ms | 101 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | nightmare1 | 17 | 0 | 0 % | 64 ms | 84 ms | 84 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | nightmare2 | 17 | 0 | 0 % | 82 ms | 146 ms | 146 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | veryEasy | 40 | 40 | 100 % | 0 ms | 1 ms | 1 ms | 2.00 s | offered |
| classic6 | easy | 17 | 0 | 0 % | 181 ms | 214 ms | 214 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | medium | 17 | 0 | 0 % | 147 ms | 174 ms | 174 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | hard | 40 | 39 | 98 % | 25 ms | 124 ms | 174 ms | 2.00 s | offered |
| classic6 | veryHard | 29 | 15 | 52 % | 147 ms | 202 ms | 204 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | expert | 33 | 19 | 58 % | 165 ms | 260 ms | 262 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | evil | 26 | 11 | 42 % | 302 ms | 363 ms | 366 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | nightmare1 | 17 | 0 | 0 % | 316 ms | 353 ms | 353 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | nightmare2 | 17 | 0 | 0 % | 320 ms | 355 ms | 355 ms | 2.00 s | hidden (stopped: misses) |
| classic9 | veryEasy | 40 | 40 | 100 % | 0 ms | 1 ms | 1 ms | 10.0 s | offered |
| classic9 | easy | 40 | 40 | 100 % | 1 ms | 1 ms | 1 ms | 10.0 s | offered |
| classic9 | medium | 40 | 40 | 100 % | 8 ms | 93 ms | 210 ms | 10.0 s | offered |
| classic9 | hard | 40 | 40 | 100 % | 7 ms | 42 ms | 90 ms | 10.0 s | offered |
| classic9 | veryHard | 40 | 40 | 100 % | 17 ms | 102 ms | 242 ms | 10.0 s | offered |
| classic9 | expert | 40 | 40 | 100 % | 27 ms | 74 ms | 165 ms | 10.0 s | offered |
| classic9 | evil | 40 | 40 | 100 % | 46 ms | 191 ms | 224 ms | 10.0 s | offered |
| classic9 | nightmare1 | 40 | 40 | 100 % | 245 ms | 544 ms | 632 ms | 10.0 s | offered |
| classic9 | nightmare2 | 23 | 7 | 30 % | 2.55 s | 3.06 s | 3.14 s | 10.0 s | hidden (stopped: misses) |
| mega12 | veryEasy | 40 | 40 | 100 % | 1 ms | 2 ms | 2 ms | 30.0 s | offered |
| mega12 | easy | 40 | 40 | 100 % | 2 ms | 3 ms | 4 ms | 30.0 s | offered |
| mega12 | medium | 40 | 40 | 100 % | 6 ms | 17 ms | 26 ms | 30.0 s | offered |
| mega12 | hard | 40 | 40 | 100 % | 11 ms | 31 ms | 75 ms | 30.0 s | offered |
| mega12 | veryHard | 40 | 40 | 100 % | 22 ms | 153 ms | 222 ms | 30.0 s | offered |
| mega12 | expert | 40 | 40 | 100 % | 63 ms | 184 ms | 211 ms | 30.0 s | offered |
| mega12 | evil | 40 | 40 | 100 % | 32 ms | 71 ms | 365 ms | 30.0 s | offered |
| mega12 | nightmare1 | 40 | 40 | 100 % | 24 ms | 1.05 s | 1.18 s | 30.0 s | offered |
| mega12 | nightmare2 | 40 | 40 | 100 % | 965 ms | 3.60 s | 3.71 s | 30.0 s | offered |
| mega16 | veryEasy | 40 | 40 | 100 % | 3 ms | 4 ms | 4 ms | 30.0 s | offered |
| mega16 | easy | 40 | 40 | 100 % | 8 ms | 13 ms | 15 ms | 30.0 s | offered |
| mega16 | medium | 40 | 40 | 100 % | 16 ms | 24 ms | 27 ms | 30.0 s | offered |
| mega16 | hard | 40 | 40 | 100 % | 33 ms | 81 ms | 115 ms | 30.0 s | offered |
| mega16 | veryHard | 40 | 40 | 100 % | 115 ms | 757 ms | 3.21 s | 30.0 s | offered |
| mega16 | expert | 40 | 40 | 100 % | 368 ms | 1.19 s | 1.28 s | 30.0 s | offered |
| mega16 | evil | 40 | 40 | 100 % | 258 ms | 630 ms | 716 ms | 30.0 s | offered |
| mega16 | nightmare1 | 40 | 40 | 100 % | 255 ms | 595 ms | 612 ms | 30.0 s | offered |
| mega16 | nightmare2 | 40 | 40 | 100 % | 185 ms | 1.38 s | 9.59 s | 30.0 s | offered |
| diagonalX | veryEasy | 40 | 40 | 100 % | 0 ms | 1 ms | 1 ms | 10.0 s | offered |
| diagonalX | easy | 40 | 40 | 100 % | 1 ms | 1 ms | 1 ms | 10.0 s | offered |
| diagonalX | medium | 40 | 40 | 100 % | 4 ms | 11 ms | 39 ms | 10.0 s | offered |
| diagonalX | hard | 40 | 40 | 100 % | 4 ms | 7 ms | 8 ms | 10.0 s | offered |
| diagonalX | veryHard | 40 | 40 | 100 % | 14 ms | 50 ms | 57 ms | 10.0 s | offered |
| diagonalX | expert | 40 | 40 | 100 % | 17 ms | 58 ms | 61 ms | 10.0 s | offered |
| diagonalX | evil | 40 | 40 | 100 % | 16 ms | 39 ms | 65 ms | 10.0 s | offered |
| diagonalX | nightmare1 | 40 | 40 | 100 % | 12 ms | 27 ms | 191 ms | 10.0 s | offered |
| diagonalX | nightmare2 | 40 | 40 | 100 % | 23 ms | 648 ms | 1.14 s | 10.0 s | offered |
| hyper | veryEasy | 40 | 40 | 100 % | 0 ms | 1 ms | 1 ms | 10.0 s | offered |
| hyper | easy | 40 | 40 | 100 % | 1 ms | 1 ms | 2 ms | 10.0 s | offered |
| hyper | medium | 40 | 40 | 100 % | 11 ms | 73 ms | 131 ms | 10.0 s | offered |
| hyper | hard | 40 | 40 | 100 % | 5 ms | 13 ms | 17 ms | 10.0 s | offered |
| hyper | veryHard | 40 | 40 | 100 % | 39 ms | 157 ms | 309 ms | 10.0 s | offered |
| hyper | expert | 40 | 40 | 100 % | 18 ms | 57 ms | 223 ms | 10.0 s | offered |
| hyper | evil | 40 | 40 | 100 % | 9 ms | 55 ms | 102 ms | 10.0 s | offered |
| hyper | nightmare1 | 40 | 40 | 100 % | 12 ms | 126 ms | 146 ms | 10.0 s | offered |
| hyper | nightmare2 | 40 | 40 | 100 % | 461 ms | 1.44 s | 1.95 s | 10.0 s | offered |
| jigsaw9 | veryEasy | 40 | 40 | 100 % | 6 ms | 35 ms | 40 ms | 10.0 s | offered |
| jigsaw9 | easy | 40 | 40 | 100 % | 5 ms | 24 ms | 25 ms | 10.0 s | offered |
| jigsaw9 | medium | 40 | 40 | 100 % | 16 ms | 73 ms | 94 ms | 10.0 s | offered |
| jigsaw9 | hard | 40 | 40 | 100 % | 11 ms | 33 ms | 33 ms | 10.0 s | offered |
| jigsaw9 | veryHard | 40 | 40 | 100 % | 27 ms | 82 ms | 214 ms | 10.0 s | offered |
| jigsaw9 | expert | 40 | 40 | 100 % | 38 ms | 98 ms | 118 ms | 10.0 s | offered |
| jigsaw9 | evil | 40 | 40 | 100 % | 21 ms | 110 ms | 143 ms | 10.0 s | offered |
| jigsaw9 | nightmare1 | 40 | 40 | 100 % | 25 ms | 142 ms | 158 ms | 10.0 s | offered |
| jigsaw9 | nightmare2 | 40 | 40 | 100 % | 308 ms | 977 ms | 2.44 s | 10.0 s | offered |
| killer | veryEasy | 40 | 40 | 100 % | 1 ms | 1 ms | 4 ms | 10.0 s | offered |
| killer | easy | 40 | 40 | 100 % | 17 ms | 25 ms | 28 ms | 10.0 s | offered |
| killer | medium | 40 | 40 | 100 % | 246 ms | 846 ms | 1.66 s | 10.0 s | offered |
| killer | hard | 40 | 40 | 100 % | 250 ms | 615 ms | 1.42 s | 10.0 s | offered |
| killer | veryHard | 40 | 39 | 98 % | 2.17 s | 8.08 s | 15.9 s | 10.0 s | offered |
| killer | expert | 40 | 40 | 100 % | 2.37 s | 7.72 s | 9.75 s | 10.0 s | offered |
| killer | evil | 40 | 40 | 100 % | 1.72 s | 5.24 s | 6.12 s | 10.0 s | offered |
| killer | nightmare1 | 40 | 40 | 100 % | 652 ms | 1.46 s | 2.25 s | 10.0 s | offered |
| killer | nightmare2 | 40 | 40 | 100 % | 1.04 s | 5.85 s | 7.90 s | 10.0 s | offered |
| greaterThan | veryEasy | 40 | 40 | 100 % | 10 ms | 14 ms | 15 ms | 10.0 s | offered |
| greaterThan | easy | 40 | 40 | 100 % | 16 ms | 28 ms | 34 ms | 10.0 s | offered |
| greaterThan | medium | 40 | 40 | 100 % | 38 ms | 94 ms | 145 ms | 10.0 s | offered |
| greaterThan | hard | 40 | 40 | 100 % | 190 ms | 2.03 s | 8.72 s | 10.0 s | offered |
| greaterThan | veryHard | 40 | 40 | 100 % | 1.62 s | 6.68 s | 8.13 s | 10.0 s | offered |
| greaterThan | expert | 40 | 40 | 100 % | 440 ms | 2.72 s | 3.96 s | 10.0 s | offered |
| greaterThan | evil | 40 | 40 | 100 % | 269 ms | 958 ms | 1.94 s | 10.0 s | offered |
| greaterThan | nightmare1 | 40 | 40 | 100 % | 112 ms | 343 ms | 555 ms | 10.0 s | offered |
| greaterThan | nightmare2 | 40 | 40 | 100 % | 555 ms | 3.33 s | 6.29 s | 10.0 s | offered |
| samurai | veryEasy | 40 | 40 | 100 % | 7 ms | 9 ms | 12 ms | 30.0 s | offered |
| samurai | easy | 40 | 40 | 100 % | 14 ms | 17 ms | 18 ms | 30.0 s | offered |
| samurai | medium | 40 | 40 | 100 % | 81 ms | 225 ms | 263 ms | 30.0 s | offered |
| samurai | hard | 40 | 40 | 100 % | 109 ms | 328 ms | 461 ms | 30.0 s | offered |
| samurai | veryHard | 40 | 40 | 100 % | 158 ms | 549 ms | 764 ms | 30.0 s | offered |
| samurai | expert | 40 | 40 | 100 % | 243 ms | 524 ms | 633 ms | 30.0 s | offered |
| samurai | evil | 40 | 40 | 100 % | 139 ms | 1.01 s | 1.27 s | 30.0 s | offered |
| samurai | nightmare1 | 40 | 40 | 100 % | 432 ms | 3.84 s | 4.13 s | 30.0 s | offered |
| samurai | nightmare2 | 40 | 40 | 100 % | 1.20 s | 6.34 s | 7.31 s | 30.0 s | offered |
| sohei | veryEasy | 40 | 40 | 100 % | 5 ms | 5 ms | 6 ms | 30.0 s | offered |
| sohei | easy | 40 | 40 | 100 % | 9 ms | 10 ms | 10 ms | 30.0 s | offered |
| sohei | medium | 40 | 40 | 100 % | 80 ms | 172 ms | 206 ms | 30.0 s | offered |
| sohei | hard | 40 | 40 | 100 % | 83 ms | 201 ms | 433 ms | 30.0 s | offered |
| sohei | veryHard | 40 | 40 | 100 % | 123 ms | 439 ms | 555 ms | 30.0 s | offered |
| sohei | expert | 40 | 40 | 100 % | 190 ms | 462 ms | 510 ms | 30.0 s | offered |
| sohei | evil | 40 | 40 | 100 % | 155 ms | 889 ms | 1.49 s | 30.0 s | offered |
| sohei | nightmare1 | 40 | 40 | 100 % | 183 ms | 1.53 s | 3.19 s | 30.0 s | offered |
| sohei | nightmare2 | 40 | 40 | 100 % | 942 ms | 3.54 s | 4.90 s | 30.0 s | offered |
| butterfly | veryEasy | 40 | 40 | 100 % | 2 ms | 2 ms | 2 ms | 30.0 s | offered |
| butterfly | easy | 40 | 40 | 100 % | 3 ms | 4 ms | 4 ms | 30.0 s | offered |
| butterfly | medium | 40 | 40 | 100 % | 28 ms | 82 ms | 103 ms | 30.0 s | offered |
| butterfly | hard | 40 | 40 | 100 % | 39 ms | 105 ms | 179 ms | 30.0 s | offered |
| butterfly | veryHard | 40 | 40 | 100 % | 110 ms | 436 ms | 786 ms | 30.0 s | offered |
| butterfly | expert | 40 | 40 | 100 % | 108 ms | 321 ms | 368 ms | 30.0 s | offered |
| butterfly | evil | 40 | 40 | 100 % | 128 ms | 779 ms | 1.20 s | 30.0 s | offered |
| butterfly | nightmare1 | 40 | 40 | 100 % | 105 ms | 1.20 s | 2.80 s | 30.0 s | offered |
| butterfly | nightmare2 | 40 | 40 | 100 % | 1.26 s | 3.83 s | 4.67 s | 30.0 s | offered |
| flower | veryEasy | 40 | 40 | 100 % | 3 ms | 3 ms | 4 ms | 30.0 s | offered |
| flower | easy | 40 | 40 | 100 % | 9 ms | 10 ms | 10 ms | 30.0 s | offered |
| flower | medium | 40 | 40 | 100 % | 48 ms | 161 ms | 189 ms | 30.0 s | offered |
| flower | hard | 40 | 40 | 100 % | 75 ms | 214 ms | 1.31 s | 30.0 s | offered |
| flower | veryHard | 40 | 40 | 100 % | 120 ms | 384 ms | 709 ms | 30.0 s | offered |
| flower | expert | 40 | 40 | 100 % | 158 ms | 444 ms | 571 ms | 30.0 s | offered |
| flower | evil | 40 | 40 | 100 % | 184 ms | 317 ms | 357 ms | 30.0 s | offered |
| flower | nightmare1 | 40 | 40 | 100 % | 213 ms | 1.03 s | 2.35 s | 30.0 s | offered |
| flower | nightmare2 | 40 | 40 | 100 % | 768 ms | 2.57 s | 4.90 s | 30.0 s | offered |
| wordoku | veryEasy | 40 | 40 | 100 % | 1 ms | 1 ms | 3 ms | 10.0 s | offered |
| wordoku | easy | 40 | 40 | 100 % | 1 ms | 1 ms | 1 ms | 10.0 s | offered |
| wordoku | medium | 40 | 40 | 100 % | 33 ms | 160 ms | 202 ms | 10.0 s | offered |
| wordoku | hard | 40 | 40 | 100 % | 9 ms | 88 ms | 279 ms | 10.0 s | offered |
| wordoku | veryHard | 40 | 40 | 100 % | 17 ms | 97 ms | 179 ms | 10.0 s | offered |
| wordoku | expert | 40 | 40 | 100 % | 30 ms | 103 ms | 228 ms | 10.0 s | offered |
| wordoku | evil | 40 | 40 | 100 % | 60 ms | 170 ms | 318 ms | 10.0 s | offered |
| wordoku | nightmare1 | 40 | 40 | 100 % | 280 ms | 987 ms | 1.07 s | 10.0 s | offered |
| wordoku | nightmare2 | 18 | 1 | 6 % | 3.04 s | 3.97 s | 3.97 s | 10.0 s | hidden (stopped: misses) |
