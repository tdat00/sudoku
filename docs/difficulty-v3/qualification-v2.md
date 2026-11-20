# Levels offered per variant (rating v2 qualification)

Every variant offers exactly the difficulty levels that pass the qualification protocol of the joint report
([report-detailed.md](report-detailed.md) §6). The lists below are the `difficultySupport` of
the variant definitions (`generator/js/variants/*.js`); `generator/tests/manual/difficulty.test.js` (a manual suite: `node tests/node-runner.js --suite=difficulty`, run in `generator/`) checks that they are the same.

## Protocol

`node tests/qualify.js` (run in `generator/`) runs it (options: `--variant`, `--level`, `--jobs`, `--json`, `--markdown`, `--probe`, `--no-early-stop`, `--quiet`, `--help`).

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

- Date: 2026-10-19, 377 s with 4 worker processes (the first run after the levels were renamed used 7 and gave the
  same lists, but a busy machine made the time of `greaterThan expert` exceed its budget; see below).
- Machine: AMD Ryzen 7 9800X3D (8 cores, 16 logical processors), 61 GB, Windows (10.0.26300), Node v26.8.2.
- Engine: the commit `562eb5d` with the level renaming of the working tree (hash of the sources `0799884fbadd42bc`,
  the files of `core/js/engine`, `generator/js/engine` and `generator/js/variants` that `tests/qualify.js` loads).
- The seed of a request is derived from the level name (`variant/level/k`), so renaming the levels changed the
  puzzles of every cell: the numbers below are not those of the runs before the renaming, and the lists are the same.
  The runs before the renaming (rating v2 as first built) offered the same 118 (variant, level) pairs.
- 5,001 requests: no error, no invalid or ambiguous puzzle, no unrated result; 241 approximate results, of which
  236 on hidden levels. On the 118 offered (variant, level) pairs: 4,715 hits of 4,720 requests (the misses:
  classic6 hard, Killer normal and Wordoku normal, 39 of 40 each; Greater-Than expert, 38 of 40).
- Slowest 95th percentiles of the offered levels: Greater-Than expert 9.5 s (budget 10 s), Killer expert 8.6 s,
  Killer nightmare 8.2 s; slowest single request 13.1 s. **Greater-Than expert is borderline in time**: its tail is
  heavy, and its p95 was 5.8–6.7 s with the seeds before the renaming and 7.3 s (1 worker), 8.0 s (3 workers),
  9.5 s (4 workers) and 10.9 s (7 workers) with these; it is offered because it hits 38 of 40 and stays inside its
  budget when the machine is not busy.
- Work caps per full-grid attempt (`generator/js/engine/digger.js`, report §5.7 (9)), unchanged by the qualification: 1,024
  full ratings (the 64 of the downward refinement included) and 32,768 proposed moves; every uniqueness check of
  a search candidate or of a proposal removal is guarded at 200,000 search nodes. Every full rating of an attempt
  goes through one counted entry point (`SG.digger.rateCounted`), also those of Killer's layout search and of
  Greater-Than's sign tuning, so the cap holds for them too. Killer's layout search (`generator/js/variants/killer.js`) has
  its own caps inside them: 8,192 proposed moves and 256 ratings per attempt, every rating or count a piece of at
  most 30,000 checks.
- When no attempt hits the level, the result is the closest completely rated, valid, unique candidate the run met
  anywhere (dig samples, local search, downward refinement, Killer's layout search, Greater-Than's sign tuning),
  with its replay, marked `difficulty.approximate`. Such a candidate does not go through the dig step's safety net,
  so the run counts its solutions (within the 200,000-node guard) before keeping it, whatever its proof claims.
- Adjustments made while qualifying (all deterministic, counted in work, never in time):
  - the bounded solve of the guided dig's objective is guarded at 100,000 budget checks (a Monster 16×16
    hell 2 request went from 106 s to 8 s with the same puzzle);
  - the 200,000-node uniqueness guard also covers the proposal dig of the top tiers (Killer nightmare outliers of
    11–21 s went down to 2–5 s);
  - the local search judges a repeated candidate from a memo instead of checking and rating it again, and adds no
    clues on Greater-Than (its sign set stays minimal);
  - Killer's layout search rates the layout with the revealed digits completed to whole symmetry groups, and when
    it ends inside the band the dig keeps those clues: Killer expert went from 80 hits of 91 (hidden) to 39 of
    40 (offered).
- Measured and not adopted: the guided dig treats a removal it refused because the puzzle got stuck or too hard
  as refused for the rest of that dig, although another removal can make it acceptable later (only a lost
  uniqueness is final in principle). Re-checking those refusals after every accepted removal was qualified on the
  same seeds: the first 40 requests of every level took 4.6 times as long in total (7,021 s against 1,531 s), the
  share of exact hits stayed the same (94.5 % against 94.4 %), and seven top levels lost their place for time
  (classic9 hell 1; hell 2 of Mega 12×12, Hyper, Jigsaw, Samurai, Sohei and Butterfly; classic9
  hell 1 went from a 95th percentile of 0.7 s to 18 s). The pruning stays, as a search heuristic.

## Levels offered

| variant | levels |
|---|---|
| classic4 | veryEasy |
| classic6 | veryEasy, hard |
| classic9 | veryEasy … hell1 |
| wordoku | veryEasy … hell1 |
| mega12, mega16, diagonalX, hyper, jigsaw9, killer, greaterThan, samurai, sohei, butterfly, flower | all nine, veryEasy … hell2 |

Hidden, and why: classic4 reaches no level above very easy (no hit in 14 requests at any other level: its puzzles
need nothing beyond singles); classic6 never reaches easy, normal or the hell levels, and reaches expert (9 of 22),
master (23 of 36) and nightmare (11 of 25) in only about half of the requests; classic9 and Wordoku reach hell 2 in
1 of 15 requests each under the default rotational symmetry. "Hidden" means "not generated reliably under these
settings", never "impossible": a puzzle keeps its real level even where that level is not offered.

## Table

`n` requests, `hits`, the hit `rate`, the 50th and 95th percentiles and the maximum of the generation time
(every request), the time `budget` and the verdict.
| variant | level | n | hits | rate | p50 | p95 | max | budget | verdict |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| classic4 | veryEasy | 40 | 40 | 100 % | 0 ms | 1 ms | 4 ms | 2.00 s | offered |
| classic4 | easy | 14 | 0 | 0 % | 45 ms | 71 ms | 71 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | normal | 14 | 0 | 0 % | 39 ms | 58 ms | 58 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | hard | 14 | 0 | 0 % | 45 ms | 81 ms | 81 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | expert | 14 | 0 | 0 % | 51 ms | 77 ms | 77 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | master | 14 | 0 | 0 % | 45 ms | 69 ms | 69 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | nightmare | 14 | 0 | 0 % | 51 ms | 72 ms | 72 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | hell1 | 14 | 0 | 0 % | 52 ms | 80 ms | 80 ms | 2.00 s | hidden (stopped: misses) |
| classic4 | hell2 | 14 | 0 | 0 % | 47 ms | 115 ms | 115 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | veryEasy | 40 | 40 | 100 % | 0 ms | 1 ms | 1 ms | 2.00 s | offered |
| classic6 | easy | 14 | 0 | 0 % | 113 ms | 155 ms | 155 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | normal | 14 | 0 | 0 % | 109 ms | 128 ms | 128 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | hard | 40 | 39 | 98 % | 17 ms | 90 ms | 110 ms | 2.00 s | offered |
| classic6 | expert | 22 | 9 | 41 % | 122 ms | 179 ms | 188 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | master | 36 | 23 | 64 % | 148 ms | 275 ms | 305 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | nightmare | 25 | 11 | 44 % | 369 ms | 433 ms | 445 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | hell1 | 14 | 0 | 0 % | 370 ms | 424 ms | 424 ms | 2.00 s | hidden (stopped: misses) |
| classic6 | hell2 | 14 | 0 | 0 % | 363 ms | 423 ms | 423 ms | 2.00 s | hidden (stopped: misses) |
| classic9 | veryEasy | 40 | 40 | 100 % | 0 ms | 1 ms | 1 ms | 10.0 s | offered |
| classic9 | easy | 40 | 40 | 100 % | 1 ms | 1 ms | 1 ms | 10.0 s | offered |
| classic9 | normal | 40 | 40 | 100 % | 38 ms | 172 ms | 225 ms | 10.0 s | offered |
| classic9 | hard | 40 | 40 | 100 % | 10 ms | 48 ms | 117 ms | 10.0 s | offered |
| classic9 | expert | 40 | 40 | 100 % | 8 ms | 170 ms | 221 ms | 10.0 s | offered |
| classic9 | master | 40 | 40 | 100 % | 40 ms | 121 ms | 179 ms | 10.0 s | offered |
| classic9 | nightmare | 40 | 40 | 100 % | 49 ms | 226 ms | 365 ms | 10.0 s | offered |
| classic9 | hell1 | 40 | 40 | 100 % | 272 ms | 758 ms | 1.92 s | 10.0 s | offered |
| classic9 | hell2 | 15 | 1 | 7 % | 2.92 s | 3.60 s | 3.60 s | 10.0 s | hidden (stopped: misses) |
| mega12 | veryEasy | 40 | 40 | 100 % | 2 ms | 2 ms | 3 ms | 30.0 s | offered |
| mega12 | easy | 40 | 40 | 100 % | 3 ms | 4 ms | 5 ms | 30.0 s | offered |
| mega12 | normal | 40 | 40 | 100 % | 6 ms | 12 ms | 15 ms | 30.0 s | offered |
| mega12 | hard | 40 | 40 | 100 % | 13 ms | 39 ms | 85 ms | 30.0 s | offered |
| mega12 | expert | 40 | 40 | 100 % | 31 ms | 186 ms | 554 ms | 30.0 s | offered |
| mega12 | master | 40 | 40 | 100 % | 80 ms | 164 ms | 356 ms | 30.0 s | offered |
| mega12 | nightmare | 40 | 40 | 100 % | 31 ms | 268 ms | 1.24 s | 30.0 s | offered |
| mega12 | hell1 | 40 | 40 | 100 % | 46 ms | 1.08 s | 1.30 s | 30.0 s | offered |
| mega12 | hell2 | 40 | 40 | 100 % | 1.33 s | 4.08 s | 5.48 s | 30.0 s | offered |
| mega16 | veryEasy | 40 | 40 | 100 % | 4 ms | 5 ms | 5 ms | 30.0 s | offered |
| mega16 | easy | 40 | 40 | 100 % | 11 ms | 14 ms | 14 ms | 30.0 s | offered |
| mega16 | normal | 40 | 40 | 100 % | 21 ms | 26 ms | 30 ms | 30.0 s | offered |
| mega16 | hard | 40 | 40 | 100 % | 42 ms | 106 ms | 134 ms | 30.0 s | offered |
| mega16 | expert | 40 | 40 | 100 % | 139 ms | 349 ms | 836 ms | 30.0 s | offered |
| mega16 | master | 40 | 40 | 100 % | 453 ms | 1.26 s | 2.08 s | 30.0 s | offered |
| mega16 | nightmare | 40 | 40 | 100 % | 290 ms | 944 ms | 1.54 s | 30.0 s | offered |
| mega16 | hell1 | 40 | 40 | 100 % | 246 ms | 744 ms | 932 ms | 30.0 s | offered |
| mega16 | hell2 | 40 | 40 | 100 % | 236 ms | 7.28 s | 9.02 s | 30.0 s | offered |
| diagonalX | veryEasy | 40 | 40 | 100 % | 0 ms | 1 ms | 1 ms | 10.0 s | offered |
| diagonalX | easy | 40 | 40 | 100 % | 1 ms | 1 ms | 1 ms | 10.0 s | offered |
| diagonalX | normal | 40 | 40 | 100 % | 4 ms | 15 ms | 52 ms | 10.0 s | offered |
| diagonalX | hard | 40 | 40 | 100 % | 4 ms | 6 ms | 8 ms | 10.0 s | offered |
| diagonalX | expert | 40 | 40 | 100 % | 17 ms | 35 ms | 49 ms | 10.0 s | offered |
| diagonalX | master | 40 | 40 | 100 % | 24 ms | 83 ms | 91 ms | 10.0 s | offered |
| diagonalX | nightmare | 40 | 40 | 100 % | 21 ms | 51 ms | 258 ms | 10.0 s | offered |
| diagonalX | hell1 | 40 | 40 | 100 % | 15 ms | 139 ms | 269 ms | 10.0 s | offered |
| diagonalX | hell2 | 40 | 40 | 100 % | 36 ms | 669 ms | 743 ms | 10.0 s | offered |
| hyper | veryEasy | 40 | 40 | 100 % | 0 ms | 1 ms | 1 ms | 10.0 s | offered |
| hyper | easy | 40 | 40 | 100 % | 1 ms | 1 ms | 3 ms | 10.0 s | offered |
| hyper | normal | 40 | 40 | 100 % | 12 ms | 102 ms | 147 ms | 10.0 s | offered |
| hyper | hard | 40 | 40 | 100 % | 7 ms | 18 ms | 20 ms | 10.0 s | offered |
| hyper | expert | 40 | 40 | 100 % | 46 ms | 270 ms | 495 ms | 10.0 s | offered |
| hyper | master | 40 | 40 | 100 % | 26 ms | 77 ms | 142 ms | 10.0 s | offered |
| hyper | nightmare | 40 | 40 | 100 % | 14 ms | 102 ms | 296 ms | 10.0 s | offered |
| hyper | hell1 | 40 | 40 | 100 % | 11 ms | 170 ms | 319 ms | 10.0 s | offered |
| hyper | hell2 | 40 | 40 | 100 % | 426 ms | 963 ms | 1.70 s | 10.0 s | offered |
| jigsaw9 | veryEasy | 40 | 40 | 100 % | 6 ms | 27 ms | 35 ms | 10.0 s | offered |
| jigsaw9 | easy | 40 | 40 | 100 % | 5 ms | 24 ms | 27 ms | 10.0 s | offered |
| jigsaw9 | normal | 40 | 40 | 100 % | 10 ms | 43 ms | 54 ms | 10.0 s | offered |
| jigsaw9 | hard | 40 | 40 | 100 % | 8 ms | 26 ms | 28 ms | 10.0 s | offered |
| jigsaw9 | expert | 40 | 40 | 100 % | 31 ms | 310 ms | 571 ms | 10.0 s | offered |
| jigsaw9 | master | 40 | 40 | 100 % | 39 ms | 88 ms | 128 ms | 10.0 s | offered |
| jigsaw9 | nightmare | 40 | 40 | 100 % | 23 ms | 57 ms | 236 ms | 10.0 s | offered |
| jigsaw9 | hell1 | 40 | 40 | 100 % | 20 ms | 145 ms | 154 ms | 10.0 s | offered |
| jigsaw9 | hell2 | 40 | 40 | 100 % | 387 ms | 1.30 s | 2.63 s | 10.0 s | offered |
| killer | veryEasy | 40 | 40 | 100 % | 1 ms | 1 ms | 6 ms | 10.0 s | offered |
| killer | easy | 40 | 40 | 100 % | 15 ms | 20 ms | 23 ms | 10.0 s | offered |
| killer | normal | 40 | 39 | 98 % | 210 ms | 752 ms | 1.70 s | 10.0 s | offered |
| killer | hard | 40 | 40 | 100 % | 246 ms | 518 ms | 1.31 s | 10.0 s | offered |
| killer | expert | 40 | 40 | 100 % | 1.78 s | 8.65 s | 9.69 s | 10.0 s | offered |
| killer | master | 40 | 40 | 100 % | 581 ms | 5.04 s | 7.85 s | 10.0 s | offered |
| killer | nightmare | 40 | 40 | 100 % | 673 ms | 8.16 s | 13.1 s | 10.0 s | offered |
| killer | hell1 | 40 | 40 | 100 % | 588 ms | 1.13 s | 1.92 s | 10.0 s | offered |
| killer | hell2 | 40 | 40 | 100 % | 972 ms | 3.02 s | 4.74 s | 10.0 s | offered |
| greaterThan | veryEasy | 40 | 40 | 100 % | 9 ms | 12 ms | 13 ms | 10.0 s | offered |
| greaterThan | easy | 40 | 40 | 100 % | 12 ms | 32 ms | 40 ms | 10.0 s | offered |
| greaterThan | normal | 40 | 40 | 100 % | 24 ms | 73 ms | 112 ms | 10.0 s | offered |
| greaterThan | hard | 40 | 40 | 100 % | 174 ms | 2.00 s | 7.42 s | 10.0 s | offered |
| greaterThan | expert | 40 | 38 | 95 % | 1.68 s | 9.50 s | 10.9 s | 10.0 s | offered |
| greaterThan | master | 40 | 40 | 100 % | 597 ms | 3.63 s | 4.38 s | 10.0 s | offered |
| greaterThan | nightmare | 40 | 40 | 100 % | 257 ms | 999 ms | 1.34 s | 10.0 s | offered |
| greaterThan | hell1 | 40 | 40 | 100 % | 144 ms | 473 ms | 644 ms | 10.0 s | offered |
| greaterThan | hell2 | 40 | 40 | 100 % | 559 ms | 2.64 s | 3.71 s | 10.0 s | offered |
| samurai | veryEasy | 40 | 40 | 100 % | 6 ms | 7 ms | 13 ms | 30.0 s | offered |
| samurai | easy | 40 | 40 | 100 % | 12 ms | 17 ms | 19 ms | 30.0 s | offered |
| samurai | normal | 40 | 40 | 100 % | 65 ms | 175 ms | 236 ms | 30.0 s | offered |
| samurai | hard | 40 | 40 | 100 % | 106 ms | 318 ms | 416 ms | 30.0 s | offered |
| samurai | expert | 40 | 40 | 100 % | 144 ms | 506 ms | 769 ms | 30.0 s | offered |
| samurai | master | 40 | 40 | 100 % | 217 ms | 716 ms | 928 ms | 30.0 s | offered |
| samurai | nightmare | 40 | 40 | 100 % | 108 ms | 891 ms | 2.32 s | 30.0 s | offered |
| samurai | hell1 | 40 | 40 | 100 % | 598 ms | 2.84 s | 3.27 s | 30.0 s | offered |
| samurai | hell2 | 40 | 40 | 100 % | 1.82 s | 6.36 s | 7.87 s | 30.0 s | offered |
| sohei | veryEasy | 40 | 40 | 100 % | 4 ms | 5 ms | 5 ms | 30.0 s | offered |
| sohei | easy | 40 | 40 | 100 % | 8 ms | 10 ms | 13 ms | 30.0 s | offered |
| sohei | normal | 40 | 40 | 100 % | 51 ms | 164 ms | 299 ms | 30.0 s | offered |
| sohei | hard | 40 | 40 | 100 % | 77 ms | 184 ms | 439 ms | 30.0 s | offered |
| sohei | expert | 40 | 40 | 100 % | 90 ms | 272 ms | 359 ms | 30.0 s | offered |
| sohei | master | 40 | 40 | 100 % | 192 ms | 435 ms | 571 ms | 30.0 s | offered |
| sohei | nightmare | 40 | 40 | 100 % | 139 ms | 704 ms | 1.30 s | 30.0 s | offered |
| sohei | hell1 | 40 | 40 | 100 % | 263 ms | 1.73 s | 2.83 s | 30.0 s | offered |
| sohei | hell2 | 40 | 40 | 100 % | 1.03 s | 2.81 s | 5.27 s | 30.0 s | offered |
| butterfly | veryEasy | 40 | 40 | 100 % | 1 ms | 2 ms | 3 ms | 30.0 s | offered |
| butterfly | easy | 40 | 40 | 100 % | 3 ms | 3 ms | 4 ms | 30.0 s | offered |
| butterfly | normal | 40 | 40 | 100 % | 23 ms | 79 ms | 86 ms | 30.0 s | offered |
| butterfly | hard | 40 | 40 | 100 % | 38 ms | 105 ms | 161 ms | 30.0 s | offered |
| butterfly | expert | 40 | 40 | 100 % | 74 ms | 463 ms | 478 ms | 30.0 s | offered |
| butterfly | master | 40 | 40 | 100 % | 103 ms | 267 ms | 708 ms | 30.0 s | offered |
| butterfly | nightmare | 40 | 40 | 100 % | 90 ms | 443 ms | 599 ms | 30.0 s | offered |
| butterfly | hell1 | 40 | 40 | 100 % | 112 ms | 1.78 s | 2.26 s | 30.0 s | offered |
| butterfly | hell2 | 40 | 40 | 100 % | 1.53 s | 3.79 s | 5.96 s | 30.0 s | offered |
| flower | veryEasy | 40 | 40 | 100 % | 2 ms | 3 ms | 4 ms | 30.0 s | offered |
| flower | easy | 40 | 40 | 100 % | 8 ms | 10 ms | 11 ms | 30.0 s | offered |
| flower | normal | 40 | 40 | 100 % | 45 ms | 185 ms | 459 ms | 30.0 s | offered |
| flower | hard | 40 | 40 | 100 % | 76 ms | 197 ms | 1.22 s | 30.0 s | offered |
| flower | expert | 40 | 40 | 100 % | 113 ms | 398 ms | 1.51 s | 30.0 s | offered |
| flower | master | 40 | 40 | 100 % | 169 ms | 496 ms | 963 ms | 30.0 s | offered |
| flower | nightmare | 40 | 40 | 100 % | 201 ms | 384 ms | 1.15 s | 30.0 s | offered |
| flower | hell1 | 40 | 40 | 100 % | 189 ms | 1.05 s | 1.72 s | 30.0 s | offered |
| flower | hell2 | 40 | 40 | 100 % | 1.02 s | 3.58 s | 5.75 s | 30.0 s | offered |
| wordoku | veryEasy | 40 | 40 | 100 % | 1 ms | 1 ms | 2 ms | 10.0 s | offered |
| wordoku | easy | 40 | 40 | 100 % | 1 ms | 1 ms | 2 ms | 10.0 s | offered |
| wordoku | normal | 40 | 39 | 98 % | 15 ms | 112 ms | 301 ms | 10.0 s | offered |
| wordoku | hard | 40 | 40 | 100 % | 8 ms | 91 ms | 283 ms | 10.0 s | offered |
| wordoku | expert | 40 | 40 | 100 % | 13 ms | 125 ms | 266 ms | 10.0 s | offered |
| wordoku | master | 40 | 40 | 100 % | 49 ms | 118 ms | 134 ms | 10.0 s | offered |
| wordoku | nightmare | 40 | 40 | 100 % | 51 ms | 263 ms | 310 ms | 10.0 s | offered |
| wordoku | hell1 | 40 | 40 | 100 % | 280 ms | 715 ms | 1.01 s | 10.0 s | offered |
| wordoku | hell2 | 15 | 1 | 7 % | 3.31 s | 4.40 s | 4.40 s | 10.0 s | hidden (stopped: misses) |
