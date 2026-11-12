# Difficulty v3 baseline (MS02, GS-before)

This is the before-data for the difficulty-v3 plan: the pre-order, pre-v3 code (rating v2, no change of any
order, counter, acceptance or output) measured on the fixed 17-cell manifest of
[R23](report-detailed.md) with the baseline diagnostics of `node tests/soak.js --json=<file>`
([generator/design.md](../../generator/design.md) 15.4). It describes this code at this commit; it is not a
guarantee for any later production behaviour. Score-only hits (the old gate) are kept apart from
requiredness-qualified hits (solved in band **and** the reference floor says the tier is required), and a raw
band position is kept apart from the analytic attainable position of AC01.

## Identity of the run

| Item | Value |
|---|---|
| Commit | `50eeec5dfd0dbdb8de0ac39c8521b0efd4511458` (difficulty-v3 MS01, accepted) |
| Working tree | dirty: the uncommitted MS02 tooling (`generator/tests/soak.js`, the new fixture and suite, `generator/tests.html`, the guides and `design.md`, this file) and the task-pack files; **no file of `core/js` or `generator/js`**, and `sourceHash` is the same in all 17 ledgers |
| Source hash | `43848f9c401b3d1f8bbf6c471b3c9055c5f1eb43466d64e982d1c7334c3d3b83`: SHA-256 over the 63 `SOURCE_FILES` of `generator/tests/node-runner.js`, each as `<path>\0<text>` with LF line ends, in load order |
| Node, machine | v26.13.0; Windows 10.0.26300 x64; AMD EPYC 7763 (16 logical CPUs), 64 GiB. One process per cell, no worker threads (`soak.js` has no `--jobs`); the Pentomino repository ran only its quick tests meanwhile (the orchestrator granted the shared-machine slot) |
| Run window | 2026-11-12, 13:28 to 13:33 (+07:00); one cell at a time |
| Seed and count | `--seed=20260101 --count=12 --no-gate`; no `--quick`, `--per-combo`, `--weights`, `--bands` or `--include-unsupported` (all 17 cells are offered at this commit) |
| Reference budget | one caller budget of 120,000 ms per request for the reference floor and the final-path rating together; no budget was exhausted |

Per cell, from `generator/`, one bounded command each (the output text went to the `.txt` file beside the ledger):

```powershell
node tests\soak.js --variant=<id> --level=<level> --count=12 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\MS02\<id>-<level>.json
```

Evidence: [evidence/MS02/](evidence/MS02/): `<id>-<level>.json` (the ledger, schema 1, UTF-8, CRLF) and
`<id>-<level>.txt` (the console output: the old text sections and the diagnostic summary) for each cell.

## Accounting: 17 cells, 204 requests, nothing dropped

All 17 commands exited 0 (`--no-gate` silences the exit status only). Every ledger has `complete: true`,
exactly 12 rows and `summary.checks.result: PASS`: **0 request errors, 0 violations of I1-I7, 0 check errors,
0 reference errors and 0 final-path errors or mismatches**. The old S0 line says `RESULT: PASS` in every cell
(no cell is below its 90% / 80% hit-rate gate). No cell reached the ten-minute limit and none is incomplete.
The reference ran on all 204 requests (192 `ok` and the 12 Hell 1 ones `vacuous`) and the final path was rated
again for all 204 solved results.

| Cell | Requests | Errors | Unrated | Solved in band | Old hits | Qualified hits | Shallow (of in band) | Reference | Soak s | Wall s |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|
| classic9 normal | 12 | 0 | 0 | 12 | 12 | 3 | 9 / 12 | ok 12 | 0.6 | 1.1 |
| classic9 hard | 12 | 0 | 0 | 12 | 12 | 12 | 0 / 12 | ok 12 | 0.3 | 0.8 |
| classic9 expert | 12 | 0 | 0 | 12 | 12 | 12 | 0 / 12 | ok 12 | 0.4 | 0.9 |
| classic9 master | 12 | 0 | 0 | 12 | 12 | 10 | 2 / 12 | ok 12 | 0.8 | 1.4 |
| classic9 nightmare | 12 | 0 | 0 | 12 | 12 | 0 | 12 / 12 | ok 12 | 2.0 | 2.6 |
| classic9 hell1 | 12 | 0 | 0 | 12 | 12 | 12 (vacuous) | 0 / 12 | vacuous 12 | 10.6 | 11.2 |
| killer normal | 12 | 0 | 0 | 12 | 12 | 5 | 7 / 12 | ok 12 | 7.7 | 8.2 |
| killer hard | 12 | 0 | 0 | 12 | 12 | 0 | 12 / 12 | ok 12 | 7.8 | 8.4 |
| killer expert | 12 | 0 | 0 | 12 | 12 | 0 | 12 / 12 | ok 12 | 28.0 | 28.6 |
| jigsaw9 normal | 12 | 0 | 0 | 12 | 12 | 3 | 9 / 12 | ok 12 | 0.4 | 1.0 |
| jigsaw9 hard | 12 | 0 | 0 | 12 | 12 | 12 | 0 / 12 | ok 12 | 0.6 | 1.1 |
| jigsaw9 expert | 12 | 0 | 0 | 12 | 12 | 2 | 10 / 12 | ok 12 | 1.5 | 2.0 |
| jigsaw9 nightmare | 12 | 0 | 0 | 12 | 12 | 0 | 12 / 12 | ok 12 | 0.8 | 1.3 |
| greaterThan normal | 12 | 0 | 0 | 12 | 12 | 1 | 11 / 12 | ok 12 | 1.0 | 1.5 |
| greaterThan hard | 12 | 0 | 0 | 12 | 12 | 11 | 1 / 12 | ok 12 | 11.4 | 11.9 |
| greaterThan expert | 12 | 0 | 0 | **10** | **10** | 8 | 2 / 10 | ok 12 | 92.4 | 92.9 |
| diagonalX nightmare | 12 | 0 | 0 | 12 | 12 | 0 | 12 / 12 | ok 12 | 0.7 | 1.3 |
| **Total** | **204** | **0** | **0** | **202** | **202** (99.0% of 204) | **91** (44.6% of 204) | **111 / 202** (55%) | | | 176.2 |

"Soak s" is the figure of the soak header (generation and the I1-I7 checks of the 12 requests, without the
deferred diagnostics, which took 3 to 69 ms per cell); "Wall s" is the whole command, source loading included
(measured by the caller). Qualified hits are over all 204 requests, never over the in-band ones; the shallow share
is over the solved in-band puzzles (qualified + shallow = in band: 91 + 111 = 202). The only requests that missed
their band are two Greater-Than Expert ones, which came out Master (off band: reference verdict "required", no
shallow flag, no hit of any kind).

Hell 1 note: at this commit the Hell 1 tier is empty (Nishio sits in Nightmare's tier), so its certificate is
**vacuous** (`required: true` without a solve): its 12 qualified hits are the 12 in-band ones, not a measured
requiredness, and its adjusted position is undefined (`empty-tier`).

## Positions (exact cohort = all-in-band cohort in every cell here)

`raw = (score - min) / (max - min)`; `adjusted = (score - lower) / (max - lower)` with
`lower = max(min, 1.25 * wMin + V)`, `wMin` the lightest weight of the level's tier and `V` the empty-cell part
of the score. Neither is rounded or clamped (so a negative adjusted value is a score below the analytic lower
bound, kept as computed); the bound is not a proof that the bounded search can reach it. Hell 2 has no finite band
and is not in this manifest. Per cell, over the 12 requests (10 for Greater-Than Expert), the minimum, the upper
median (sorted index floor(n / 2)) and the maximum; the full deciles are in each ledger
(`summary.cells[...].cohorts`).

| Cell | Raw min | Raw upper median | Raw max | Adjusted min | Adjusted upper median | Adjusted max |
|---|---:|---:|---:|---:|---:|---:|
| classic9 normal | 0.109 | 0.182 | 0.600 | -0.127 | -0.035 | 0.494 |
| classic9 hard | 0.310 | 0.530 | 0.747 | 0.190 | 0.447 | 0.701 |
| classic9 expert | 0.623 | 0.827 | 0.963 | 0.208 | 0.636 | 0.922 |
| classic9 master | 0.088 | 0.534 | 0.990 | -0.161 | 0.407 | 0.987 |
| classic9 nightmare | 0.124 | 0.490 | 0.801 | -2.429 | -1.007 | 0.222 |
| classic9 hell1 | 0.469 | 0.666 | 0.986 | undefined (`empty-tier` x 12) | | |
| killer normal | 0.545 | 0.577 | 0.995 | 0.400 | 0.443 | 0.994 |
| killer hard | 0.473 | 0.667 | 0.773 | 0.360 | 0.596 | 0.724 |
| killer expert | 0.017 | 0.240 | 0.960 | -1.202 | -0.679 | 0.912 |
| jigsaw9 normal | 0.227 | 0.345 | 0.745 | 0.018 | 0.162 | 0.674 |
| jigsaw9 hard | 0.380 | 0.837 | 0.997 | 0.261 | 0.806 | 0.996 |
| jigsaw9 expert | 0.017 | 0.057 | 0.810 | -1.110 | -1.022 | 0.600 |
| jigsaw9 nightmare | 0.137 | 0.403 | 0.732 | -2.418 | -1.372 | -0.060 |
| greaterThan normal | 0.282 | 0.350 | 0.795 | 0.088 | 0.171 | 0.740 |
| greaterThan hard | 0.083 | 0.803 | 0.893 | -0.091 | 0.766 | 0.873 |
| greaterThan expert | 0.003 | 0.927 | 0.987 | -1.148 | 0.844 | 0.972 |
| diagonalX nightmare | 0.016 | 0.497 | 0.852 | -2.886 | -0.981 | 0.418 |

## Peak techniques and the final path

Peak technique of the solved in-band puzzles per cell (count of the 12; the histogram of every cohort is in the
ledger):

| Cell | Peak technique |
|---|---|
| classic9 normal | nakedPair 9, hiddenPair 2, nakedTriple 1 |
| classic9 hard | simpleColouring 11, xWing 1 |
| classic9 expert | xyWing 12 |
| classic9 master | wWing 8, forcingChain 2, xyWing 2 |
| classic9 nightmare | forcingChain 12 |
| classic9 hell1 | nishio 12 |
| killer normal | nakedPair 7, hiddenPair 4, nakedTriple 1 |
| killer hard | ruleOf45 12 |
| killer expert | simpleColouring 8, cageSplit 2, hiddenQuad 1, xWing 1 |
| jigsaw9 normal | nakedPair 9, hiddenPair 2, nakedTriple 1 |
| jigsaw9 hard | simpleColouring 11, xWing 1 |
| jigsaw9 expert | simpleColouring 10, xyWing 2 |
| jigsaw9 nightmare | forcingChain 12 |
| greaterThan normal | nakedPair 11, nakedTriple 1 |
| greaterThan hard | simpleColouring 11, hiddenTriple 1 |
| greaterThan expert | xyWing 8, swordfish 1, simpleColouring 1 (10 in band) |
| diagonalX nightmare | forcingChain 10, wWing 2 |

Forcing-chain step lengths (`i18nArgs.length`) and Nishio depths (`i18nArgs.depth`) of the final path, counted as
steps and as puzzles (a puzzle counts once, by its longest step); the cells not listed have none:

| Cell | Forcing-chain steps (puzzles) | Step lengths | Per-puzzle maximum | Nishio steps (puzzles) |
|---|---|---|---|---|
| classic9 master | 2 (2) | 4: 1, 5: 1 | 4: 1, 5: 1 | none |
| classic9 nightmare | 63 (12) | 3: 8, 4: 33, 5: 18, 6: 4 | 3: 1, 4: 5, 5: 4, 6: 2 | none |
| classic9 hell1 | 136 (12) | 3: 11, 4: 55, 5: 55, 6: 7, 7: 5, 8: 3 | 5: 7, 6: 2, 7: 1, 8: 2 | 19 (12), depth 1 |
| jigsaw9 nightmare | 45 (12) | 3: 8, 4: 21, 5: 13, 6: 2, 7: 1 | 3: 3, 4: 4, 5: 4, 7: 1 | none |
| diagonalX nightmare | 45 (10) | 3: 9, 4: 27, 5: 9 | 3: 1, 4: 5, 5: 4 | none |

## Shallow, cap and work visibility

- **Shallow:** 111 of the 202 solved in-band puzzles (55%) do not need their tier by the reference floor: the
  classic9 Normal, Master and Nightmare cells, killer Normal, Hard and Expert, jigsaw9 Normal, Expert and
  Nightmare, greaterThan Normal, Hard and Expert, and diagonalX Nightmare all have some, and the three
  Nightmare cells and killer Hard and Expert have only shallow ones (12 of 12). classic9 Hard and Expert and
  jigsaw9 Hard have none. Hell 1 is vacuous (see above).
- **Work:** `fullRatings` (calls of `SG.difficulty.rate` during the one generation, I4 repetitions, diagnostic
  ratings and reference checks excluded) is exposed per request: mean / maximum per cell from 1.7 / 3
  (greaterThan normal) and 2.8 / 6 (jigsaw9 hard) up to 157.7 / 462 (classic9 hell1) and 374.6 / 1666 (killer
  expert).
- **Not exposed at this baseline:** `proposals`, `shallowRatings`, `capHits` and `target` are `null` in every
  row. `null` means "not exposed by this code", never zero work; the extra cap/search telemetry belongs to MS05,
  targets to MS06 and the split-window diagnostics to MS07.

## Reading a ledger (schema 1)

`{ schema, complete, meta, rows, summary }`; `complete` is false until the whole run, its deferred diagnostics
included, is done. `meta` has `sourceHash`, `sourceFiles`, `commit`, `dirty`, `dirtyFiles`, `startedAt`, `node`,
`machine`, `argv`, `seedBase` and `manifest` (requests, cells with their route `direct` or `pipeline`, count,
`perCombo`, `quick`, overrides, `ratingVersion`, `referenceBudgetMs`). Each row has the fields listed at the top of
`generator/tests/fixtures/difficulty-diagnostics.js`: among them `outcome` (`ok` | `error`), `scoreHit`,
`generationExact` (the old hit), `qualifiedHit`, `required`, `referenceStatus` (`not-run` | `ok` | `vacuous` |
`error` | `skipped-not-unique`), `shallow`, `position` (`raw`, `adjusted`, `lower`, `reason` and the inputs),
`fullRatings`, `chainLengths`, `nishioDepths`, `puzzleHash` (identity of the returned puzzle) and `pathCheck`.
`summary` has `all`, `cells` (one entry per cell) and `checks`. The diagnostic solves run only after every
generation and every I1-I7 check of the invocation, so a row says `not-run` while generation is in progress.

## Limits

The numbers are one 12-request sample per cell with a fixed seed: they are for matched before/after comparison,
not an estimate of a rate. Times come from a shared machine and are indicative only. The GS-after run must use the
same 17 cells, seed, count and command line, and compare `puzzleHash` before reading any distribution difference.
