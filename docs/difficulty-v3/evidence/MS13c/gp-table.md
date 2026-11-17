# MS13c GP account: all 50 affected cells

The 50 cells are the variant x level cells of the performance table (`SG.fixtures.perfTools`) whose level admits `forcingChain` or
`forcingChainLong` (Master and above). **Not a complete or passing GP matrix**: 21 complete 50-run records, 16 cells with a
complete two-run pilot only and 13 without a complete pilot. No aggregate is computed from the measured subset. The mega16/easy
control of the brief is a separate cell (last table), not one of the 50. Raw tool output is in `logs/`, never edited.

Candidate = the uncommitted MS13c tree, chain engine SHA-256 `5EBA1AE5...AC9D1`. Comparator = the accepted MS14a chain engine
(`4aa3d11`, read into memory by `base-run.cjs`), **not `main`**. A same seed does not give the same delivered puzzle or dig path.
Two-run numbers are **diagnostic maxima** of two runs (the p95 of two runs is the larger), never a population p95 estimate and no GP verdict.

## A. Complete 50-run records (GP verdicts): 21 cells, 15 meet, 6 miss

Request: `node tests\perf.js --variant=<v> --level=<l> --runs=50 --warmup=0 --seed=7000 --gate` (50 runs, seed 7000), candidate tree, one locked process per record (exit 0: all met, exit 1: a miss; both complete).
Projection = 25 x the two-run pilot seconds x 1.3 (a planning estimate; the pilot-based projection was too low in seven of these). Base-50 = the same request with the comparator engine, where it was run.

| cell | target | p50 ms | p95 ms | max ms | result | projected s | actual s | within projection | comparator 50-run p95 ms | evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| classic9/master | 900 ms | 83.7 | 298 | 526 | meets | 10 | 5.6 | yes | - | `logs/gp-classic9-master.txt`, `gp-runs.jsonl` |
| classic9/nightmare | 2.5 s | 678 | 4902 | 5443 | misses | 33 | 57.474 | **no** | 3061 (missed) | `logs/gp-classic9-nightmare.txt`, `logs/base50-classic9-nightmare.txt`, `gp-runs.jsonl` |
| diagonalX/master | 1.2 s | 111 | 363 | 403 | meets | 19 | 8.076 | yes | - | `logs/gp-diagonalX-master.txt`, `gp-runs.jsonl` |
| diagonalX/nightmare | 3 s | 2813 | 16534 | 25639 | misses | 157 | 221.912 | **no** | 7693 (missed) | `logs/gp-diagonalX-nightmare.txt`, `logs/base50-diagonalX-nightmare.txt`, `gp-runs.jsonl` |
| diagonalX/hell2 | 3 s | 229 | 2140 | 2518 | meets | 24 | 32.467 | **no** | - | `logs/gp-diagonalX-hell2.txt`, `gp-runs.jsonl` |
| hyper/master | 1.2 s | 160 | 548 | 765 | meets | 38 | 11.305 | yes | - | `logs/gp-hyper-master.txt`, `gp-runs.jsonl` |
| hyper/hell2 | 5 s | 846 | 3288 | 3413 | meets | 134 | 63.001 | yes | - | `logs/gp-hyper-hell2.txt`, `gp-runs.jsonl` |
| jigsaw9/master | 2 s | 157 | 1375 | 2508 | meets | 63 | 15.336 | yes | - | `logs/gp-jigsaw9-master.txt`, `gp-runs.jsonl` |
| jigsaw9/hell2 | 5 s | 1062 | 3225 | 3537 | meets | 98 | 61.796 | yes | - | `logs/gp-jigsaw9-hell2.txt`, `gp-runs.jsonl` |
| wordoku/master | 1.5 s | 105 | 513 | 673 | meets | 35 | 7.473 | yes | - | `logs/gp-wordoku-master.txt`, `gp-runs.jsonl` |
| wordoku/nightmare | 1.5 s | 729 | 3371 | 3419 | misses | 19 | 49.785 | **no** | 1624 (missed) | `logs/gp-wordoku-nightmare.txt`, `logs/base50-wordoku-nightmare.txt`, `gp-runs.jsonl` |
| killer/hell2 | 10 s | 3145 | 14528 | 21363 | misses | 132 | 247.819 | **no** | 8806 (met) | `logs/gp-killer-hell2.txt`, `logs/base50-killer-hell2.txt`, `gp-runs.jsonl` |
| greaterThan/master | 10 s | 1055 | 7774 | 15375 | meets | 130 | 103.799 | yes | - | `logs/gp-greaterThan-master.txt`, `gp-runs.jsonl` |
| greaterThan/hell2 | 10 s | 2681 | 8693 | 10014 | meets | 171 | 166.723 | yes | - | `logs/gp-greaterThan-hell2.txt`, `gp-runs.jsonl` |
| mega12/master | 3 s | 265 | 695 | 871 | meets | 23 | 15.409 | yes | - | `logs/gp-mega12-master.txt`, `gp-runs.jsonl` |
| mega12/nightmare | 3 s | 2841 | 8396 | 14121 | misses | 195 | 169.552 | yes | 5485 (missed) | `logs/gp-mega12-nightmare.txt`, `logs/base50-mega12-nightmare.txt`, `gp-runs.jsonl` |
| mega12/hell2 | 16 s | 3147 | 8504 | 10852 | meets | 154 | 155.477 | **no** | - | `logs/gp-mega12-hell2.txt`, `gp-runs.jsonl` |
| mega16/master | 10 s | 1805 | 8191 | 12221 | meets | 122 | 120.266 | yes | - | `logs/gp-mega16-master.txt`, `gp-runs.jsonl` |
| butterfly/master | 8 s | 148 | 491 | 924 | meets | 16 | 10.373 | yes | - | `logs/gp-butterfly-master.txt`, `gp-runs.jsonl` |
| butterfly/nightmare | 8 s | 6130 | 24335 | 33558 | misses | 209 | 471.175 | **no** | - | `logs/gp-butterfly-nightmare.txt`, `gp-runs.jsonl` |
| butterfly/hell2 | 15 s | 2560 | 9229 | 13572 | meets | 305 | 161.28 | yes | - | `logs/gp-butterfly-hell2.txt`, `gp-runs.jsonl` |

## B. Complete two-run pilot only: 16 cells (diagnostic maxima, **no GP verdict**)

Request: `node tests\perf.js --variant=<v> --level=<l> --runs=2 --warmup=0 --seed=7000` (no `--gate`), candidate tree. The "bound" is the pilot
duration I stated before the run (30, 60 or 120 s by the cell's target); it was **not** an upper bound (10 of the 37 completed pilots exceeded it; see the
pilot ledger). Fifteen of these cells were withheld from a 50-run request because 25 x pilot x 1.3 exceeds 450 s (a projection, not a measurement of 50 runs);
**greaterThan/nightmare** was admitted (projected 440 s) and its 50-run command was stopped by the 540-second ceiling with no output: that failed command is
kept apart from its valid pilot and is not one of the 21 complete records.

| cell | target (reference only) | two-run max ms | pilot s | stated bound s | within bound | projected 50-run s | status | comparator two-run max ms | evidence |
|---|---|---|---|---|---|---|---|---|---|
| classic9/hell1 | 2.5 s | 10494 | 17.39 | 30 | yes | 566 | withheld: projection above 450 s | 9800 | `logs/gp-pilot-classic9-hell1.txt`, `logs/base-classic9-hell1.txt`, `gp-pilot-runs.jsonl` |
| diagonalX/hell1 | 3 s | 74043 | 140.824 | 30 | **no** | 4577 | withheld: projection above 450 s | 52861 | `logs/gp-pilot-diagonalX-hell1.txt`, `logs/base-diagonalX-hell1.txt`, `gp-pilot-runs.jsonl` |
| hyper/nightmare | 3 s | 19543 | 31.778 | 30 | **no** | 1033 | withheld: projection above 450 s | 658 | `logs/gp-pilot-hyper-nightmare.txt`, `logs/base-hyper-nightmare.txt`, `gp-pilot-runs.jsonl` |
| hyper/hell1 | 3 s | 41079 | 77.687 | 30 | **no** | 2525 | withheld: projection above 450 s | - | `logs/gp-pilot-hyper-hell1.txt`, `gp-pilot-runs.jsonl` |
| jigsaw9/nightmare | 5 s | 22283 | 43.079 | 30 | **no** | 1401 | withheld: projection above 450 s | 4272 | `logs/gp-pilot-jigsaw9-nightmare.txt`, `logs/base-jigsaw9-nightmare.txt`, `gp-pilot-runs.jsonl` |
| jigsaw9/hell1 | 5 s | 43621 | 85.431 | 30 | **no** | 2777 | withheld: projection above 450 s | - | `logs/gp-pilot-jigsaw9-hell1.txt`, `gp-pilot-runs.jsonl` |
| wordoku/hell1 | 2.5 s | 9250 | 17.764 | 30 | yes | 578 | withheld: projection above 450 s | 8724 | `logs/gp-pilot-wordoku-hell1.txt`, `logs/base-wordoku-hell1.txt`, `gp-pilot-runs.jsonl` |
| killer/master | 10 s | 26891 | 46.564 | 60 | yes | 1514 | withheld: projection above 450 s | 24065 | `logs/gp-pilot-killer-master.txt`, `logs/base-killer-master.txt`, `gp-pilot-runs.jsonl` |
| killer/nightmare | 10 s | 25661 | 43.571 | 60 | yes | 1417 | withheld: projection above 450 s | - | `logs/gp-pilot-killer-nightmare.txt`, `gp-pilot-runs.jsonl` |
| killer/hell1 | 10 s | 55580 | 90.452 | 60 | **no** | 2940 | withheld: projection above 450 s | - | `logs/gp-pilot-killer-hell1.txt`, `gp-pilot-runs.jsonl` |
| greaterThan/nightmare | 10 s | 11450 | 13.531 | 60 | yes | 440 | pilot valid; 50-run command admitted and **aborted at 540 s** (lock-log `GP gp compound 4 from 13`), no output | 6931 | `logs/gp-pilot-greaterThan-nightmare.txt`, `logs/base-greaterThan-nightmare.txt`, `gp-pilot-runs.jsonl` |
| greaterThan/hell1 | 10 s | 110364 | 194.494 | 60 | **no** | 6322 | withheld: projection above 450 s | - | `logs/gp-pilot-greaterThan-hell1.txt`, `gp-pilot-runs.jsonl` |
| mega12/hell1 | 4.5 s | 67967 | 122.586 | 30 | **no** | 3985 | withheld: projection above 450 s | - | `logs/gp-pilot-mega12-hell1.txt`, `gp-pilot-runs.jsonl` |
| mega16/nightmare | 10 s | 66826 | 75.463 | 60 | **no** | 2453 | withheld: projection above 450 s | - | `logs/gp-pilot-mega16-nightmare.txt`, `gp-pilot-runs.jsonl` |
| mega16/hell2 | 10 s | 20465 | 22.077 | 60 | yes | 718 | withheld: projection above 450 s | - | `logs/gp-pilot-mega16-hell2.txt`, `gp-pilot-runs.jsonl` |
| butterfly/hell1 | 8 s | 58652 | 108.91 | 60 | **no** | 3540 | withheld: projection above 450 s | - | `logs/gp-pilot-butterfly-hell1.txt`, `gp-pilot-runs.jsonl` |

## C. No complete pilot: 13 cells (unmeasured; no time is assumed)

Twelve cells (Samurai, Sohei and Flower at master, nightmare, hell1 and hell2) were **never piloted**: my decision rested on one G13 wire request (Samurai Nightmare
42, about 94 to 97 s), which is not a cell-qualified measurement of these cells; their cost is unknown. **mega16/hell1**: the two-run pilot was attempted twice and
each attempt was stopped by the 540-second ceiling with no result (lock-log `GP pilot compound 3 from 25` and `GP pilot compound 1 from 32`; the second attempt was
unchanged); that is a failed request, not a measured duration of 50 runs.

| cell | target (reference only) | status | evidence |
|---|---|---|---|
| mega16/hell1 | 10 s | pilot attempted twice, each stopped at 540 s, no output | lock-log rows (no ledger row); no log |
| samurai/master | 20 s | never piloted; unmeasured | `gp-unsafe.txt` |
| samurai/nightmare | 20 s | never piloted; unmeasured | `gp-unsafe.txt` |
| samurai/hell1 | 20 s | never piloted; unmeasured | `gp-unsafe.txt` |
| samurai/hell2 | 30 s | never piloted; unmeasured | `gp-unsafe.txt` |
| flower/master | 20 s | never piloted; unmeasured | `gp-unsafe.txt` |
| flower/nightmare | 20 s | never piloted; unmeasured | `gp-unsafe.txt` |
| flower/hell1 | 20 s | never piloted; unmeasured | `gp-unsafe.txt` |
| flower/hell2 | 20 s | never piloted; unmeasured | `gp-unsafe.txt` |
| sohei/master | 20 s | never piloted; unmeasured | `gp-unsafe.txt` |
| sohei/nightmare | 20 s | never piloted; unmeasured | `gp-unsafe.txt` |
| sohei/hell1 | 20 s | never piloted; unmeasured | `gp-unsafe.txt` |
| sohei/hell2 | 20 s | never piloted; unmeasured | `gp-unsafe.txt` |

## Separate control: mega16/easy (the brief's command; not an affected cell, not in the 50)

| request | target | p50 ms | p95 ms | max ms | result | evidence |
|---|---|---|---|---|---|---|
| 2 runs (pilot) | 4 s | 17.6 | 44 | 44 | diagnostic, no verdict | `logs/gp-pilot-mega16-easy.txt` |
| 50 runs, `--gate` | 4 s | 14.6 | 31.2 | 46.1 | meets | `logs/gp-mega16-easy.txt` |

