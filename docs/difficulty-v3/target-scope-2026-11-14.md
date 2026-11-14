# Target scope: the isolated pre-target before-record (MS06a)

This is the before-data of MS06: all 17 fixed cells (204 requests) on the runtime that the target change will start
from, captured before any target code is written ([R7](report-detailed.md): "preserve the pre-change record before
editing the objective"). It is evidence only: no application, fixture, test, guide or task-pack file was touched, and
no hit, miss or undefined position is dropped from it. MS06d repeats exactly these 17 commands after the atomic
activation of MS06c2 and compares against this record; MS06b and MS06c1/c2 must not edit it. If a source change
makes a replacement genuinely necessary, it is a separately labelled file, never an edit of this one.

The numbers are one 12-request sample per cell on a fixed seed (derived request streams, not literal puzzle seeds 1-12),
for matched before/after comparison, not a rate estimate. Times are of a shared Windows machine: indicative, not CI
measurements, and not the GP gate of MS18d.

## Identity of the run

| Item | Value |
|---|---|
| Commit, tree | `ef8a9cca1fc2dd7d6d7311ad11a79f7b16ab91dc` (`difficulty-v3 MS05e: guided sign dig measured and set aside (CV6-05)`), `dirty: false`, `dirtyFiles: []` in all 17 ledgers (`meta.commit`, `meta.dirty`, written by the tool) |
| Source hash | `a073f9bdaac0a425d6e4af30643dab56d4c1ea2576aa151e79cc079f6be3cdb7`: 63 `SOURCE_FILES`, the same in all 17 ledgers and **identical to the `sourceHash` of MS05e's ten `before/` measurement records on `f7be90f`** (`evidence/MS05e/before/*-r1.json`, `*-r2.json`) |
| Tool hash | `882f027fe8f5a2f2b2a457d0f5b224cdedaa91f8c0b6d7ae1b7bf3fbab5d8ab2` (`meta.toolHash`: `tests/soak.js`, `perf-helper.js`, `difficulty-diagnostics.js`), the same in all 17 ledgers |
| Sign pass and digger | `generator/js/variants/greater-than.js` SHA-256 `24dbbe37e4e4d8fd312eb1bb514a6152f6492d692bdfe5fd4816c717988f3d39` and `generator/js/engine/digger.js` `3be14d5e355a2ad3fdde408a0a4b3d83cee97c5a7f5a50bf1b57ee1a3cd768b7` (LF-normalised text, hashed by this task from the files on disk): both equal the `greaterThanHash` and `diggerHash` of MS05e's `before/` records |
| Node, machine | v26.13.0; Windows 10.0.26300 x64; AMD EPYC 7763 (16 logical CPUs), 64 GiB. One process per cell, one request at a time (`soak.js` has no `--jobs`; jobs = 1, no worker threads) |
| Seed, count | `--seed=20260101 --count=12 --no-gate`; no `--quick`, `--per-combo`, `--weights`, `--bands`, `--shallow-cap`, `--include-unsupported`, `--from` or `--total-count` (`meta.shallowCap: null`, `meta.manifest.shard: null`, 12 logical = 12 recorded requests per cell) |
| Reference budget | 120,000 ms per request for the sampled reference floor and the final-path re-rating together (`meta.manifest.referenceBudgetMs`); none was exhausted |
| Run window | 2026-11-14, 17:46:52 to 18:02:17 (+07:00): 17 locked commands, one cell each, in manifest order |
| Machine slot | Every command ran under the sudoku lock helper of check-list section 7 (a verbatim copy, outside the repository), which also waits for the pentomino lock. Pentomino was paused: no lock was held by anyone, each Node process started 0.5 s after its command (1.1 s once), well under the helper's 5 s poll, so **no lock wait occurred**. Every gap from one release to the next acquisition was at least 15.6 s |

## The configuration measured: the accepted default and the restored sign pass

- **Allowance:** the MS05r4 selection accepted at MS05r6b (the absorbed MS05d selection, R5): the shallow-search allowance
  `SHALLOW_SEARCH_DEFAULT = 256` (`generator/js/engine/digger.js`), with no override: every ledger has
  `meta.shallowSearchRatings: 256` and `meta.shallowCap: null`.
- **Attempts:** the size-dependent default of MS05r5p (8, 4, 2 attempts for at most 81, 82-144 and more than 144 cells).
  All 17 boards have 81 cells and `soak.js` passes no `maxAttempts` on either route, so the default of eight applies;
  no request of the 204 recorded more than eight attempts (`work` has at most 8 entries; seven cells have a request
  that used all eight).
- **Greater-Than sign dig:** the restored first-allowed sign pass. MS05e measured a guided pool of 4, 8 and 16 and set it
  aside (Fable's CV6-05, Q1(b) withdraw the pool, Q2(a) keep the contracts and let final qualification decide the offer);
  the orchestrator restored the 12 existing files from `f7be90f` (runtime `00647f9`), deleted the guided suite and
  proved identity over the fingerprinted source and artifact surface without a run (MS05e Execution log, "Verification").
  That proof is cited, not repeated; this task made no Git action to prove it. It is corroborated independently here by the
  three equal hashes above. On Greater-Than the target is transported but **not consumed** by the first-allowed sign
  pass (MS06 edits no `greater-than.js`), so MS06d may find a small or null effect on the three Greater-Than cells.
- **Target:** not exposed at this source: `target` is `null` in all 204 rows, and `ratingVersion` is 2 in all of them.
- **Not loaded:** the rejected `candidate-pool-4.patch` and its evidence were neither applied nor regenerated.

## Manifest and commands

Seed base 20260101, 12 requests per cell, the route the soak uses unchanged (`direct` for classic9 and diagonalX,
`pipeline` for killer, jigsaw9 and greaterThan; a pipeline row has its `pipelineSeed`, a direct row has none). Per cell,
from `generator/`, one locked command (the helper is the check-list's `Invoke-Dv3Node`, `-AllowExit1`):

```powershell
Invoke-Dv3Node -Task 'MS06a <id>-<level>' -NodeArgs @('tests\soak.js','--variant=<id>','--level=<level>','--count=12','--seed=20260101','--no-gate','--json=..\docs\difficulty-v3\evidence\MS06a\<id>-<level>.json') -AllowExit1
```

Each command ran in a child `pwsh -NoProfile -Command`, with its console output piped through `Tee-Object` to
`<id>-<level>.txt` beside the ledger (the transcript has a `START` and an `END` line and the helper's
`<task> exit=<code> seconds=<n>` line). **Every command exited 0** (`--no-gate` silences the soak's own gate status, never
the recorded invariant failures); no command came near the 540-second ceiling (the longest, killer expert, 150.7 s), so
**no cell was sharded** (`--from/--total-count` were not needed) and there is nothing to merge: each ledger holds its
cell's 12 requests once, with absolute indexes 0 to 11 and tags `<variant>:<level>:<index>`.

Projection before launch (IR12; one cell per command, each below the 450 s limit). A measured figure is the MS05r4 time of the
same cell at the same default (256, eight attempts) or MS05e's per-request time on the restored source; "bound" is a
conservative figure stated here for a cell without such a measurement at this source (the pre-v3 MS02 times are only
a lower hint).

| Cell | Route | Projection (s) | Basis | Helper s (actual) |
|---|---|---:|---|---:|
| classic9 normal | direct | 3 | MS05r4, 2.7 s | 3.4 |
| classic9 hard | direct | 60 | bound (MS02 0.3 s) | 0.8 |
| classic9 expert | direct | 60 | bound (MS02 0.4 s) | 0.9 |
| classic9 master | direct | 1 | MS05r4, 0.8 s | 1.4 |
| classic9 nightmare | direct | 56 | MS05r4, 54.6 s | 66.0 |
| classic9 hell1 | direct | 120 | bound (MS02 10.6 s) | 11.2 |
| killer normal | pipeline | 120 | bound (MS02 7.7 s) | 6.1 |
| killer hard | pipeline | 59 | MS05r4, 58.4 s | 73.8 |
| killer expert | pipeline | 122 | MS05r4, 120.9 s | 150.7 |
| jigsaw9 normal | pipeline | 60 | bound (MS02 0.4 s) | 1.8 |
| jigsaw9 hard | pipeline | 60 | bound (MS02 0.6 s) | 1.1 |
| jigsaw9 expert | pipeline | 9 | MS05r4, 8.1 s | 10.4 |
| jigsaw9 nightmare | pipeline | 120 | bound (MS02 0.8 s) | 7.2 |
| greaterThan normal | pipeline | 120 | bound (MS05e 2.0 s per request, about 24 s) | 39.0 |
| greaterThan hard | pipeline | 60 | bound (MS05e 0.9 s per request, about 10 s) | 10.9 |
| greaterThan expert | pipeline | 200 | bound (MS05e 3.5 s per request, about 42 s) | 89.3 |
| diagonalX nightmare | direct | 120 | bound (classic9 nightmare 54.6 s) | 96.1 |
| **Total** | | | | **570.1** (9 min 30 s) |

Two mistyped invocations preceded the classic9 Nightmare command (a loop that passed `c`, `l` and `n`, `i` as the variant and
level): `soak.js` answered `nothing to do` with exit 2 after 0.18 s each, generated nothing and wrote no ledger. They
held the lock for those 0.18 s and left no evidence, and their stray transcripts were deleted; the Nightmare cell was then
run correctly, once.

## Accounting: 17 cells, 204 requests, nothing dropped

All 17 ledgers have `complete: true`, `schema: 1` and exactly 12 rows: **204 primary outcomes**, 204 `outcome: ok`, **0 request
errors**. Terms, per request: **exact** is the generator's own strict `exact` flag (`generationExact === true`, the hit
of every earlier gate); **shallow** is a solved puzzle in the requested band that is not exact (the derived certificate
says the tier is not required: `shallow: true`); **miss** is no puzzle in the requested band (off-band, unrated or an
error). Exact + shallow + miss = 12 in every cell. The qualified hits (in band and required by the derived certificate)
equal the exact ones in every cell: 0 disagreements.

| Cell | Requests | Errors | In band | Exact | Shallow | Miss | Exact share | Soak gate line |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| classic9 normal | 12 | 0 | 12 | 10 | 2 | 0 | 83% | FAIL (below 90%) |
| classic9 hard | 12 | 0 | 12 | 12 | 0 | 0 | 100% | PASS |
| classic9 expert | 12 | 0 | 12 | 12 | 0 | 0 | 100% | PASS |
| classic9 master | 12 | 0 | 12 | 12 | 0 | 0 | 100% | PASS |
| classic9 nightmare | 12 | 0 | 12 | 2 | 10 | 0 | 17% | FAIL (below 90%) |
| classic9 hell1 | 12 | 0 | 12 | 12 (vacuous) | 0 | 0 | 100% | PASS |
| killer normal | 12 | 0 | 12 | 12 | 0 | 0 | 100% | PASS |
| killer hard | 12 | 0 | 12 | 0 | 12 | 0 | 0% | FAIL (below 80%) |
| killer expert | 12 | 0 | 12 | 0 | 12 | 0 | 0% | FAIL (below 80%) |
| jigsaw9 normal | 12 | 0 | 12 | 12 | 0 | 0 | 100% | PASS |
| jigsaw9 hard | 12 | 0 | 12 | 12 | 0 | 0 | 100% | PASS |
| jigsaw9 expert | 12 | 0 | 12 | 11 | 1 | 0 | 92% | PASS |
| jigsaw9 nightmare | 12 | 0 | 12 | 12 | 0 | 0 | 100% | PASS |
| greaterThan normal | 12 | 0 | 12 | 12 | 0 | 0 | 100% | PASS |
| greaterThan hard | 12 | 0 | 12 | 12 | 0 | 0 | 100% | PASS |
| greaterThan expert | 12 | 0 | **10** | 10 | 0 | **2** | 83% | PASS |
| diagonalX nightmare | 12 | 0 | 12 | 10 | 2 | 0 | 83% | PASS |
| **Total** | **204** | **0** | **202** | **163** (79.9%) | **39** | **2** | | |

Denominators: the exact share is over the 12 requests of the cell, never over the in-band ones; the shallow share is over
the solved in-band puzzles (the ledger's `summary.cells[...].shallow` has `count`, `denominator` and `checked`: 12 of 12
with a derived verdict in 16 cells, 10 of 10 in greaterThan expert); the position cohorts are the exact puzzles and the
in-band puzzles (their sizes are in the position tables). Hell 1's 12 exact hits are the 12 in-band ones of an empty tier:
at this source the Hell 1 tier is empty (Nishio sits in Nightmare's), the certificate is **vacuous** (`required: true`
without a solve), so they are not a measured requiredness, and the sampled references of that cell say `vacuous`.
The soak's gate line is the old 90% (classic9) / 80% (other boards) hit-rate gate; the four FAIL lines are recorded
facts, not exit codes.

Every non-exact request, so that none disappears (index within the cell; `fr` is the full ratings of the request):

| Request | Outcome | Score | Time | Attempts | Notes |
|---|---|---:|---:|---:|---|
| classic9:normal:9 | shallow, Normal | 220 | 0.95 s | 8 | 615 fr, 8 proposal-cap hits |
| classic9:normal:11 | shallow, Normal | 220 | 0.64 s | 8 | 361 fr, 8 proposal-cap hits |
| jigsaw9:expert:6 | shallow, Expert | 718 | 2.58 s | 8 | 1,633 fr, 8 proposal-cap hits |
| diagonalX:nightmare:2 | shallow, Nightmare | 1514 | 13.77 s | 8 | 2,142 fr, 5 allowance hits, 3 proposal-cap hits |
| diagonalX:nightmare:5 | shallow, Nightmare | 1569 | 12.98 s | 8 | 2,326 fr, 8 allowance hits |
| greaterThan:expert:2 | **miss**, off-band (Master) | 1013 | 14.12 s | 8 | required: true; raw 1.043, adjusted null (`off-band`) |
| greaterThan:expert:5 | **miss**, off-band (Master) | 1046 | 14.34 s | 8 | required: true; raw 1.153, adjusted null (`off-band`) |
| classic9 nightmare (10 requests) | shallow, Nightmare | | | 3 to 8 | the two exact ones are the 2 of 12 |
| killer hard (12), killer expert (12) | shallow, Hard / Expert | | | 8 each | every attempt ended at the proposal cap (96 hits each) |

The two Greater-Than Expert misses are the same two requests (indexes 2 and 5) that MS02's pre-v3 record had come out
Master (scores 1014 and 1059 there, 1013 and 1046 now).

## Generation time

"Generation" is the sum of `generationMs` over the 12 rows (the time of the request itself); "soak" is the soak header's
time (generation plus the I1-I7 invariant checks); "helper" is the wall time of the whole locked command, source
loading and the diagnostic solves included. With 12 requests the nearest-rank p95 of the soak is the maximum.
The budget is the p95 target of [design.md](../../generator/design.md) 9.1 that the soak prints (the table of
`tests/perf.js`): `SLOW` is the soak's own informational flag on 12 samples, not the GP gate.

| Cell | Generation s | Mean s | Upper median s | Max s | Soak s | Helper s | Budget ms | Flag |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| classic9 normal | 2.62 | 0.22 | 0.14 | 0.95 | 2.9 | 3.37 | 150 | SLOW |
| classic9 hard | 0.22 | 0.02 | 0.01 | 0.05 | 0.3 | 0.77 | 400 | ok |
| classic9 expert | 0.35 | 0.03 | 0.01 | 0.15 | 0.4 | 0.90 | 400 | ok |
| classic9 master | 0.73 | 0.06 | 0.05 | 0.11 | 0.9 | 1.42 | 900 | ok |
| classic9 nightmare | 54.12 | 4.51 | 4.87 | 5.67 | 65.4 | 65.98 | 2,500 | SLOW |
| classic9 hell1 | 7.73 | 0.64 | 0.51 | 1.46 | 10.6 | 11.18 | 2,500 | ok |
| killer normal | 5.26 | 0.44 | 0.33 | 1.08 | 5.6 | 6.08 | 700 | SLOW |
| killer hard | 58.64 | 4.89 | 4.86 | 5.98 | 73.3 | 73.78 | 1,800 | SLOW |
| killer expert | 120.21 | 10.02 | 9.64 | 15.80 | 149.5 | 150.66 | 10,000 | SLOW |
| jigsaw9 normal | 1.02 | 0.08 | 0.06 | 0.21 | 1.3 | 1.80 | 350 | ok |
| jigsaw9 hard | 0.43 | 0.04 | 0.03 | 0.09 | 0.6 | 1.11 | 900 | ok |
| jigsaw9 expert | 7.98 | 0.66 | 0.57 | 2.58 | 9.9 | 10.42 | 900 | SLOW |
| jigsaw9 nightmare | 5.94 | 0.49 | 0.45 | 1.72 | 6.7 | 7.24 | 5,000 | ok |
| greaterThan normal | 34.35 | 2.86 | 1.96 | 7.71 | 38.5 | 39.01 | 700 | SLOW |
| greaterThan hard | 9.83 | 0.82 | 0.26 | 3.99 | 10.4 | 10.94 | 6,000 | ok |
| greaterThan expert | 63.24 | 5.27 | 5.48 | 14.34 | 88.8 | 89.27 | 10,000 | SLOW |
| diagonalX nightmare | 81.96 | 6.83 | 7.17 | 13.77 | 95.6 | 96.13 | 3,000 | SLOW |
| **Total** | **454.6** | | | | **560.7** | **570.1** | | 9 SLOW of 17 |

Per-request times, work and puzzle hashes are in the ledgers (`rows[].generationMs`, `fullRatings`, `puzzleHash`).

## Work (`fullRatings` and the local search)

`fullRatings` is the sum of the full ratings of the work of every attempt (the independent `ratingCalls` count agrees in
every request: `work` conservation `ok` 12 of 12 in all 17 cells, 0 mismatches, 0 unavailable). `attempts` counts the
entries of `work`; `cap hits` are the local searches ended by the allowance, the rating cap and the proposal cap.

| Cell | Full ratings | Mean | Upper median | Max | Attempts (per request) | Proposals | Local ratings | Shallow ratings | Cap hits: allowance / ratings / proposals |
|---|---:|---:|---:|---:|---|---:|---:|---:|---|
| classic9 normal | 1,657 | 138.1 | 75 | 615 | 35 (1-8) | 822,401 | 1,290 | 787 | 0 / 0 / 25 |
| classic9 hard | 137 | 11.4 | 5 | 93 | 12 (1) | 599 | 81 | 0 | 0 / 0 / 0 |
| classic9 expert | 389 | 32.4 | 3 | 259 | 13 (1-2) | 33,415 | 340 | 0 | 0 / 0 / 1 |
| classic9 master | 53 | 4.4 | 4 | 9 | 12 (1) | 0 | 0 | 0 | 0 / 0 / 0 |
| classic9 nightmare | 15,010 | 1,250.8 | 1,345 | 1,790 | 88 (3-8) | 2,347,289 | 13,839 | 13,736 | 17 / 0 / 69 |
| classic9 hell1 | 1,892 | 157.7 | 108 | 462 | 20 (1-4) | 272,124 | 1,665 | 0 | 0 / 0 / 8 |
| killer normal | 1,073 | 89.4 | 65 | 254 | 29 (1-5) | 557,056 | 802 | 100 | 0 / 0 / 17 |
| killer hard | 6,160 | 513.3 | 512 | 569 | 96 (8) | 3,145,728 | 5,008 | 3,883 | 0 / 0 / 96 |
| killer expert | 25,990 | 2,165.8 | 2,250 | 2,658 | 96 (8) | 3,145,728 | 5,046 | 1,805 | 0 / 0 / 96 |
| jigsaw9 normal | 309 | 25.8 | 11 | 84 | 16 (1-2) | 131,332 | 179 | 179 | 0 / 0 / 4 |
| jigsaw9 hard | 34 | 2.8 | 3 | 6 | 12 (1) | 0 | 0 | 0 | 0 / 0 / 0 |
| jigsaw9 expert | 5,615 | 467.9 | 318 | 1,633 | 37 (1-8) | 675,849 | 5,214 | 3,864 | 6 / 0 / 20 |
| jigsaw9 nightmare | 1,062 | 88.5 | 93 | 296 | 14 (1-2) | 67,285 | 655 | 655 | 0 / 0 / 2 |
| greaterThan normal | 319 | 26.6 | 24 | 61 | 31 (1-5) | 622,592 | 20 | 8 | 0 / 0 / 19 |
| greaterThan hard | 103 | 8.6 | 5 | 28 | 16 (1-3) | 131,072 | 0 | 0 | 0 / 0 / 4 |
| greaterThan expert | 518 | 43.2 | 47 | 115 | 44 (1-8) | 1,114,112 | 28 | 0 | 0 / 0 / 34 |
| diagonalX nightmare | 13,072 | 1,089.3 | 1,200 | 2,326 | 53 (1-8) | 375,614 | 10,990 | 10,990 | 33 / 0 / 10 |
| **Total** | **73,393** | | | | **624** | | | | |

## Positions (AC01: raw and adjusted side by side)

`raw = (score - min) / (max - min)` and `adjusted = (score - lower) / (max - lower)` with
`lower = max(min, 1.25 * wMin + V)`, `wMin` the lightest weight of the level's tier and `V` the empty-cell part of the
score. Neither is rounded or clamped (a negative adjusted value is a score below the analytic lower bound and stays as
computed; a raw value above 1 is a score above the band); the bound is not a claim that the bounded search can reach
it. An adjusted value is defined only where the request is rated and in the band, with a finite positive width and a
non-empty, non-vacuous tier; otherwise it is `null` with a reason, and the raw value stays. Per cell and cohort:
minimum, upper median (sorted index floor(n / 2)) and maximum; the full deciles are in each ledger
(`summary.cells["<variant>/<level>"].cohorts.exact` and `.inBand`, `raw` and `adjusted`).

**Exact cohort** (the puzzles with `generationExact`, `n` of each cell as in the accounting):

| Cell | n | Raw min / median / max | Adjusted n | Adjusted min / median / max | Null reasons |
|---|---:|---|---:|---|---|
| classic9 normal | 10 | 0.277 / 0.386 / 0.677 | 10 | 0.086 / 0.222 / 0.592 | none |
| classic9 hard | 12 | 0.310 / 0.530 / 0.747 | 12 | 0.190 / 0.447 / 0.701 | none |
| classic9 expert | 12 | 0.623 / 0.827 / 0.963 | 12 | 0.208 / 0.636 / 0.922 | none |
| classic9 master | 12 | 0.374 / 0.614 / 0.990 | 12 | 0.201 / 0.511 / 0.987 | none |
| classic9 nightmare | 2 | 0.911 / 0.972 / 0.972 | 2 | 0.652 / 0.891 / 0.891 | none |
| classic9 hell1 | 12 | 0.469 / 0.666 / 0.986 | 0 | undefined | `empty-tier` x 12 |
| killer normal | 12 | 0.695 / 0.732 / 0.773 | 12 | 0.598 / 0.647 / 0.700 | none |
| killer hard | 0 | empty cohort | 0 | empty cohort | none (no exact puzzle) |
| killer expert | 0 | empty cohort | 0 | empty cohort | none (no exact puzzle) |
| jigsaw9 normal | 12 | 0.405 / 0.536 / 0.777 | 12 | 0.239 / 0.406 / 0.715 | none |
| jigsaw9 hard | 12 | 0.380 / 0.837 / 0.997 | 12 | 0.261 / 0.806 / 0.996 | none |
| jigsaw9 expert | 11 | 0.617 / 0.920 / 0.993 | 11 | 0.178 / 0.829 / 0.986 | none |
| jigsaw9 nightmare | 12 | 0.842 / 0.906 / 0.990 | 12 | 0.378 / 0.628 / 0.961 | none |
| greaterThan normal | 12 | 0.427 / 0.568 / 0.814 | 12 | 0.271 / 0.448 / 0.762 | none |
| greaterThan hard | 12 | 0.623 / 0.767 / 0.877 | 12 | 0.556 / 0.724 / 0.854 | none |
| greaterThan expert | 10 | 0.850 / 0.927 / 0.973 | 10 | 0.681 / 0.844 / 0.943 | none |
| diagonalX nightmare | 10 | 0.798 / 0.904 / 0.988 | 10 | 0.199 / 0.623 / 0.952 | none |

**All-in-band cohort** (the solved puzzles in the requested band: the exact ones and the shallow ones):

| Cell | n | Raw min / median / max | Adjusted n | Adjusted min / median / max | Null reasons |
|---|---:|---|---:|---|---|
| classic9 normal | 12 | 0.182 / 0.368 / 0.677 | 12 | -0.037 / 0.201 / 0.592 | none |
| classic9 hard | 12 | 0.310 / 0.530 / 0.747 | 12 | 0.190 / 0.447 / 0.701 | none |
| classic9 expert | 12 | 0.623 / 0.827 / 0.963 | 12 | 0.208 / 0.636 / 0.922 | none |
| classic9 master | 12 | 0.374 / 0.614 / 0.990 | 12 | 0.201 / 0.511 / 0.987 | none |
| classic9 nightmare | 12 | 0.124 / 0.497 / 0.972 | 12 | -2.429 / -0.971 / 0.891 | none |
| classic9 hell1 | 12 | 0.469 / 0.666 / 0.986 | 0 | undefined | `empty-tier` x 12 |
| killer normal | 12 | 0.695 / 0.732 / 0.773 | 12 | 0.598 / 0.647 / 0.700 | none |
| killer hard | 12 | 0.440 / 0.647 / 0.773 | 12 | 0.320 / 0.571 / 0.724 | none |
| killer expert | 12 | 0.007 / 0.267 / 0.980 | 12 | -1.186 / -0.642 / 0.956 | none |
| jigsaw9 normal | 12 | 0.405 / 0.536 / 0.777 | 12 | 0.239 / 0.406 / 0.715 | none |
| jigsaw9 hard | 12 | 0.380 / 0.837 / 0.997 | 12 | 0.261 / 0.806 / 0.996 | none |
| jigsaw9 expert | 12 | 0.060 / 0.920 / 0.993 | 12 | -1.022 / 0.829 / 0.986 | none |
| jigsaw9 nightmare | 12 | 0.842 / 0.906 / 0.990 | 12 | 0.378 / 0.628 / 0.961 | none |
| greaterThan normal | 12 | 0.427 / 0.568 / 0.814 | 12 | 0.271 / 0.448 / 0.762 | none |
| greaterThan hard | 12 | 0.623 / 0.767 / 0.877 | 12 | 0.556 / 0.724 / 0.854 | none |
| greaterThan expert | 10 | 0.850 / 0.927 / 0.973 | 10 | 0.681 / 0.844 / 0.943 | none |
| diagonalX nightmare | 12 | 0.016 / 0.897 / 0.988 | 12 | -2.886 / 0.592 / 0.952 | none |

Undefined or out-of-cohort positions in the 204 rows (none is dropped): the adjusted position of the **12 Hell 1 rows** is
`null` with reason `empty-tier` (their raw positions are defined and listed above), and the **2 off-band Greater-Than Expert
rows** (indexes 2 and 5) have raw 1.043 and 1.153 (above the band) and adjusted `null` with reason `off-band`; they belong to
neither cohort. The other 190 rows have both positions. No row has any other reason (`unrated`, `non-finite-band`,
`non-positive-width` or `vacuous-tier`).

## Checks and errors

| Check | Result in all 17 ledgers |
|---|---|
| `summary.checks.result` / soak `DIAGNOSTICS` line | `PASS` / `DIAGNOSTICS: PASS` x 17 |
| Request errors | 0 (204 of 204 rows `outcome: ok`) |
| Invariants I1-I7 | 0 violations each, 7 x 17 |
| Check errors, reference errors | 0 and 0 |
| Final-path re-rating (`pathCheck`) | `ok` 12 of 12 per cell (204), mismatch 0, error 0, not run 0 |
| Work conservation (`workCheck`) | `ok` 204, mismatch 0, unavailable 0 |
| Exact flag against the derived verdict | 0 disagreements (163 exact = 163 qualified) |
| Sampled reference floor (indexes 0 and 11 of each cell) | `ok` 32, `vacuous` 2 (Hell 1), error 0, skipped 0; the other 170 rows are `not-selected`, never an unmeasured verdict |

There is no invariant failure, no error and no evidence-integrity problem. The soak's four `RESULT: FAIL` hit-rate lines
(classic9 normal and nightmare below 90%, killer hard and expert below 80%) are availability outcomes, kept as measured
(see the items below).

## Cross-checks of the identity

1. **The restored source.** The 63-file source hash, the Greater-Than file hash and the digger hash equal those of MS05e's
   `before/` records on `f7be90f` (section "Identity").
2. **The accepted default.** Six cells of this record were also generated by MS05r4 with `--shallow-cap=256`
   ([shallow-cap-2026-11-13.md](shallow-cap-2026-11-13.md)); this record uses the literal default and reproduces its
   counts exactly: classic9 normal 10 hits, median 75, 1,657 full ratings; master 12 hits, 53; nightmare 2 hits, median
   1,345, 15,010; killer hard 0 hits, median 512, 6,160; killer expert 0 hits, median 2,250, 25,990; jigsaw9 expert 11
   hits, median 318, 5,615. The generation times agree to within 3% (54.6 s against 54.1 s, 58.4 against 58.6, 120.9
   against 120.2, 8.1 against 8.0 and 2.7 against 2.6; the sub-second Master cell, 0.8 against 0.7, to its rounding).
3. **Not comparable:** MS02's record ([baseline.md](baseline.md)) is the pre-requiredness code (rating v2 before MS04/MS05);
   this one is a new before-record on the requiredness-active runtime and replaces it for MS06.

## Items (S-OD4)

No stop was needed: nothing above is a correctness or evidence-integrity problem. Performance and availability
shortfalls are named, with numbers, for MS07e and then MS18c (availability) and MS18d (cost); none authorizes an offer, a
green claim or a budget change (check-list section 2), and none was repaired, skipped or reported as a pass.

**New, found by this record:**

| ID | Origin and numbers | Limit | Evidence | Next owner / disposition |
|---|---|---|---|---|
| S-AV18 | greaterThan Expert, seed base 20260101, requests 2 and 5: no in-band puzzle in eight attempts each, both Master (scores 1013 and 1046), 14.12 s and 14.34 s, required: true; 10 of 12 exact; the same two requests had missed in MS02 | an in-band result (soak gate 80%: met at 83%) | `evidence/MS06a/greaterThan-expert.json` | MS07e, MS18c (qualification decides the offer), MS18d; open |
| S-AV19 | Soak p95 (the maximum of 12) against the design 9.1 target, `SLOW` in 9 of 17 cells: classic9 normal 950 ms against 150; classic9 nightmare 5,674 against 2,500; killer normal 1,076 against 700; killer hard 5,980 against 1,800; killer expert 15,795 against 10,000; jigsaw9 expert 2,584 against 900; greaterThan normal 7,706 against 700 (also S-AV01); greaterThan expert 14,338 against 10,000; diagonalX nightmare 13,769 against 3,000. The other 8 cells pass | the design 9.1 p95 targets (GP, 50 runs, is the gate) | the 17 `.txt` transcripts and the time table above | MS07e proposal, MS18d (the actual GP verdict); open, informational at 12 samples |
| S-AV20 | In-band but not exact (shallow) in cells with no earlier item: jigsaw9 expert 1 of 12 (request 6, score 718, 2.58 s) and diagonalX nightmare 2 of 12 (requests 2 and 5, scores 1514 and 1569, 13.77 s and 12.98 s, every attempt used); the 10 requests of those two cells that are exact stay as measured | exact result for every request (a shallow fallback is a miss for final qualification) | `jigsaw9-expert.json`, `diagonalX-nightmare.json` | MS07e, MS18c (final qualification alone decides the offer); open |

**Carried and re-measured here** (numbers of this 12-request cell added to the inherited item; the item itself is unchanged):

| ID | This record |
|---|---|
| S-AV01 Greater-Than Normal CV6 (open, CV6-05 Q2(a); 5,209 ms against 1,400 ms on seeds 300-319, 10.6 s p95 on 7000-7039) | A third, different cohort and not a CV6 or final-qualification reading: this 12-request stream has generation 34.35 s, upper median 1.96 s and max (the soak p95) 7.71 s against the 700 ms target; 12 of 12 exact. The three fixed endings of CV6-05 still govern; contracts unchanged |
| S-AV05 Killer Hard (0 of 12 exact at every R5 setting) | 0 of 12 again, 12 shallow, 96 attempts, every one ended at the proposal cap (96 hits); 58.64 s |
| S-AV06 Killer Expert (0 of 12 exact) | 0 of 12 again, 12 shallow, 96 attempts, 96 proposal-cap hits; 120.21 s, slowest request 15.80 s |
| S-AV07 classic9 Nightmare (2 of 12 exact at none and at 256) | 2 of 12 exact, 10 shallow, 88 attempts, 17 allowance hits; 54.12 s |
| S-AV14 classic9 Normal aggregate hit rate (86/100 in MS05r6b's GD) | this cell: 10 of 12 (83%, soak gate FAIL below 90%), requests 9 and 11 shallow at 220 |

**Carried unchanged** (not measured by this manifest or task; see check-list section 2 and the logs of MS05b3, MS05r6a and MS05r6b):
S-AV02 mega12 Nightmare, S-AV03 mega16 Nightmare, S-AV04 samurai Nightmare/G13, S-AV08 standing quick cost (648.0 s; this
task ran no quick suite, and the orchestrator verifies the unchanged baseline), S-AV09 Killer Master/Nightmare I5,
S-AV10 Wordoku I5, S-AV11 the 325.3 s jigsaw9 Expert I5 request (MS18d profiles it), S-AV12 sohei/butterfly/flower Nightmare,
S-AV13 butterfly/flower Easy, S-AV15 the unrun GD confusion matrix, and MS05r6a-COV01 for MS18e. S-AV16 and S-AV17 stay
**withdrawn** as current-source items (CV6-05; the rejected pool's numbers are history).

## Deviations and process notes

- No deviation from the task's implementation steps and test plan. The two mistyped no-op invocations are described above.
- The console transcripts (`*.txt`) are the soak's output as piped by `Tee-Object`; a whitespace-only pass removed the
  trailing spaces of 152 lines (the empty bars of the histogram rows) to meet the repository's whitespace rule. The
  ledgers (`*.json`) are byte for byte as the tool wrote them.
- This task read the Git state once, read-only (`git log --oneline -5` and `git status --short`: HEAD `ef8a9cc`, clean) before
  starting; it made no other Git action and changed no file outside `docs/difficulty-v3/`.
- A scratch analysis file written under `generator/tests/artifacts/` while compiling these tables was deleted.

## Files and immutability

`docs/difficulty-v3/evidence/MS06a/`: for each of the 17 cells `<id>-<level>.json` (the ledger, schema 1, UTF-8, CRLF,
`complete: true`) and `<id>-<level>.txt` (the console transcript). SHA-256 of the ledgers, so that MS06d can verify it reads
the same record:

| Ledger | SHA-256 |
|---|---|
| classic9-normal.json | `be6d49e7a3ea8a271d648dc7a7bdc650a5cfbc9e45b409a748482d48d3f2c104` |
| classic9-hard.json | `a0067e1867630044bacf5c403c47c136e4227427ff470104bfd321fa64220ed0` |
| classic9-expert.json | `1bc6653510ec6d590d75070fe49934854be1b18046ac1cbc3e680a3530cfcb9b` |
| classic9-master.json | `dd41076aebb9ddab5741b9feaf18f9e7ab4fea56fe1adbdc7aefbb79010ae978` |
| classic9-nightmare.json | `1658568aa948b54acad835202a0b7e4cff12684e45456d0467178c0a3111abed` |
| classic9-hell1.json | `b11c36f46fd2cecf394b0f74be95b1b1abc00be38443dcaced04991dfbdcdd1a` |
| killer-normal.json | `a3fef527af1319a13be794f7266d0308055a2e113f1dea46757c7a74135eea2f` |
| killer-hard.json | `df98b0002066694266d2f0dde74403d0d71acb63520e245856fb329c235fc54a` |
| killer-expert.json | `035c0dfee57aa61ec21fc900d818f3c141272d8595683fc62569b5fb5d8764be` |
| jigsaw9-normal.json | `fae3ed53047c5f4d620d6b45bdff4a9fa7ce80563bb33dccf13d6364c2901f42` |
| jigsaw9-hard.json | `1c1b926cb8600c7845d5947776c04351a4e088db762104dba40640ad8aeb37df` |
| jigsaw9-expert.json | `0b4ad6914c65119e14afc76731eec444d66fa5cd2b764112392f68fd8d53365e` |
| jigsaw9-nightmare.json | `413383e9ebb8f4ba3bef8a228819284a34bca077379a5f936d4c3bf95727b50a` |
| greaterThan-normal.json | `af27c1bdd488fba1170e493004ad7ef0fb0c96f3bde2216d24e73a092f651933` |
| greaterThan-hard.json | `e0990e3c8cb1130f8f91b7c401a44727115d93a993672a19466cade302aea1a6` |
| greaterThan-expert.json | `dfe04a474ef1004748488e06a3520a3dbf1bdcba02fb8886a44d3f5ead319493` |
| diagonalX-nightmare.json | `9d6f2af70980b3c984cc88585d6e4869c7bfac04b9b51e74965c18b691106e35` |

Reading a ledger: [baseline.md](baseline.md) ("Reading a ledger") describes the schema; this tool version adds, per row,
`capHits`, `proposals`, `localRatings`, `shallowRatings` and the per-attempt `work`, and in `meta` the `acceptance`,
`shallowCap` and `shallowSearchRatings` fields. MS06d must run the same 17 commands, compare `meta.sourceHash`, `toolHash`
and the `puzzleHash` of each request before reading any distribution difference, and report every hit lost, every
undefined position and every time change against the tables above.
