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

---

# After the target policy: the isolated comparison (MS06d)

MS06d appended this part after MS06c2 activated the one originating target in every search stage. Everything above the rule is
MS06a's before-record, unchanged: the first 31,631 bytes of this file are the file as MS06a left it (SHA-256
`bb69a677a38361484f75473c5b55910eb6d6ccec605b44cb2d2e0025c592d3c1`). This part repeats MS06a's 17 commands (the same 12 requests
per cell, seed base 20260101, routes, defaults and flags; only the ledger folder differs) and compares them with the before-record.
It is evidence only: no application, fixture, test, guide or task-pack file was touched, nothing was tuned, repaired or rerun to move
a number (R7: "Do not silently drop target propagation or broaden a budget to repair it"), and no hit, miss or undefined position
is dropped.

"Before" is `evidence/MS06a/`; "after" is `evidence/MS06d/`. Every figure below is recomputed from the ledger rows and cross-checked
against the tools' own summaries by `evidence/MS06d/compare.cjs` (917 checks, 0 disagreements); its whole output is
`evidence/MS06d/comparison-tables.md` (the tables here are copied from it verbatim, and it also holds the per-cell identity table,
the in-band target deviation, the eight slowest requests and the per-cell checks). Times are of a shared Windows machine:
indicative, not the GP gate of MS18d. One 12-request sample per cell: a matched comparison, not a rate estimate.

## Result in brief

- **Hits (all 204 requests in the denominator).** 164 exact / 38 shallow / 2 miss, against 163 / 39 / 2; in band 202 both times.
  By cell: classic9 Normal 10 to 11, classic9 Nightmare 2 to 3, **jigsaw9 Expert 11 to 10 (the only cell with fewer exact hits)**,
  the other 14 cells unchanged. Seven requests changed outcome (four gained exactness, three lost it); all seven are among the 76
  requests whose puzzle differs from the before-record. The 128 requests whose puzzle is byte-identical kept their outcome.
- **Positions.** The adjusted exact median fell in 8 of the 14 cells that have a non-empty cohort, rose in 1 (diagonalX Nightmare,
  0.623 to 0.711) and is unchanged in 5 (classic9 Normal, killer Normal, the three Greater-Than cells). Pooled over the cells
  (descriptive): median 0.623 to 0.560, top quarter (adjusted 0.75 or more) 35 of 151 to 31 of 152. The lower medians sit beside
  cohorts that are one puzzle smaller in jigsaw9 Expert (11 to 10) and larger in classic9 Normal and Nightmare (10 to 11, 2 to 3);
  no median is read without its n. Raw positions are in the tables; Hell 1's adjusted position stays undefined (`empty-tier`).
- **Time.** Generation 454.62 s to 454.42 s in all (1.00x): the 128 same-puzzle requests 360.76 to 359.47 s, the 76 changed ones
  93.85 to 94.95 s. jigsaw9 Nightmare (+3.14 s, 1.53x) and Expert (+2.33 s, 1.29x) are slower; classic9 Nightmare (-4.40 s) and
  diagonalX Nightmare (-6.33 s), both 0.92x, are faster; the other 13 cells are between 0.81x and 1.06x. The `SLOW` flags against
  the design 9.1 p95 targets are 9 of 17 before and after, the same cells.
- **Work.** Full ratings 73,393 to 79,170 (+7.9%), attempts 624 to 638, local searches 490 to 501; searches ended by the allowance
  56 to 68, by the proposal cap 405 to 406, by the rating cap 0 to 0.
- **Greater-Than (CV6-05).** All 36 requests of the three cells generate the identical puzzle; exact 12/12, 12/12 and 10/12 as
  before, requests 2 and 5 of Expert still miss (Master, 1013 and 1046). A null effect, as CV6-05 projected; nothing was added.
- **Errors.** 0 request errors, 0 invariant violations, 0 check, reference or final-path errors, 0 exact-flag disagreements in 204
  rows; all 17 commands exited 0.
- **Named items** (below): new S-AV21 (jigsaw9 Expert exact loss), S-AV22 (request-level exact churn), S-AV23 (jigsaw9 Nightmare and
  Expert cost); the inherited items re-measured.

## Identity of the after run

| Item | Value |
|---|---|
| Commit, tree | `091a44b6096a1312722f6113e3d3e8f17716ed2c` (`difficulty-v3 MS06c2: one originating target in every search stage`), `dirty: false`, `dirtyFiles: []` in all 17 ledgers (the tool's check excludes `docs/difficulty-v3/evidence`, where MS06d wrote) |
| Source hash | `e435640c2135e1d18a0249a67d9b7b30d877725f82477960567d8e47c2ae2d46`: 63 `SOURCE_FILES`, one value in all 17 ledgers. It differs from the before hash `a073f9bd...` by the source changes of MS06b, MS06c1 and MS06c2 (that is the point of the comparison) |
| Tool hash | `d97dda95567c14db445abc091aba1191efe89e140983b4d3b22ceddd12fe9716` in all 17 ledgers; before `882f027f...`: `tests/soak.js` changed in MS06c1 (it now writes the `target` of a row) |
| Sign pass and digger | `generator/js/variants/greater-than.js` SHA-256 `24dbbe37e4e4d8fd312eb1bb514a6152f6492d692bdfe5fd4816c717988f3d39`, **equal to the before value** (no edit, CV6-05); `generator/js/engine/digger.js` `5aea38ecd342a5b4c485b33f9164544467f7e37032c763401d687ed94fcdfc2c` (before `3be14d5e...`). LF-normalised text, hashed by this task from the files on disk |
| Defaults | Unchanged: `meta.shallowSearchRatings: 256`, `meta.shallowCap: null`, no override; the size-dependent default of eight attempts for these 81-cell boards (no row has more than eight attempts); `ratingVersion` 2 in all 204 rows. The one difference is the target: a finite number in **204 of 204 rows** after, `null` in all 204 before |
| Node, machine | v26.13.0; Windows 10.0.26300 x64; AMD EPYC 7763 (16 logical CPUs), 64 GiB: the same as before. One process per cell, one request at a time (jobs = 1) |
| Seed, count | `--seed=20260101 --count=12 --no-gate`; no `--quick`, `--per-combo`, `--weights`, `--bands`, `--shallow-cap`, `--include-unsupported`, `--from` or `--total-count`: `meta.manifest.shard` is `null`, 12 logical = 12 recorded requests per cell, **nothing sharded** |
| Run window | 2026-11-15, 00:00:18 to 00:14:22 (+07:00): 17 locked commands, one cell each, in manifest order, by the sequencer `evidence/MS06d/run-cells.ps1` |
| Machine slot | Every command ran under the sudoku lock helper of check-list section 7 (a verbatim copy, outside the repository), which also waits for the pentomino lock. An improve-generating job (`IG IGP-01`) held the timing lock when this task began (23:58); the helper was not touched and it was gone before the first command, which waited 0 s. No command waited for the lock: each Node process started 0.47 to 0.52 s after its command (1.13 s once), under the helper's 5 s poll. Between the end of one command and the start of the next there were 16.8 s at least |
| Time cost | 17 commands, 570.48 s of helper time (9 min 30 s; MS06a 570.1 s), longest killer Expert 151.06 s: far under 540 s and each under its projection |

Projection before launch (IR12; one cell per command): `max(20 s, 2 x the same cell's MS06a helper time)`, a conservative bound
for the complete command at a source that adds a policy and its draws; every projection is at most 302 s, under the 450 s limit,
so no cell was split. All 17 finished inside their projection.

| Cell | Start | End | Helper s (MS06a -> MS06d) | Projection s | Within projection | Soak s |
|---|---:|---:|---:|---:|---:|---:|
| classic9 normal | 00:00:18 | 00:00:21 | 3.37 -> 3.45 | 20 | yes | 3.0 |
| classic9 hard | 00:00:38 | 00:00:39 | 0.77 -> 0.78 | 20 | yes | 0.3 |
| classic9 expert | 00:00:56 | 00:00:57 | 0.90 -> 0.90 | 20 | yes | 0.4 |
| classic9 master | 00:01:15 | 00:01:17 | 1.42 -> 1.40 | 20 | yes | 0.9 |
| classic9 nightmare | 00:01:34 | 00:02:33 | 65.98 -> 59.39 | 132 | yes | 58.9 |
| classic9 hell1 | 00:02:51 | 00:03:01 | 11.18 -> 10.57 | 23 | yes | 10.0 |
| killer normal | 00:03:18 | 00:03:24 | 6.08 -> 6.03 | 20 | yes | 5.5 |
| killer hard | 00:03:41 | 00:04:55 | 73.78 -> 73.53 | 148 | yes | 73.0 |
| killer expert | 00:05:12 | 00:07:43 | 150.66 -> 151.06 | 302 | yes | 150.5 |
| jigsaw9 normal | 00:08:00 | 00:08:01 | 1.80 -> 1.50 | 20 | yes | 1.0 |
| jigsaw9 hard | 00:08:18 | 00:08:19 | 1.11 -> 1.08 | 20 | yes | 0.6 |
| jigsaw9 expert | 00:08:36 | 00:08:51 | 10.42 -> 14.98 | 21 | yes | 14.5 |
| jigsaw9 nightmare | 00:09:08 | 00:09:19 | 7.24 -> 11.02 | 20 | yes | 9.9 |
| greaterThan normal | 00:09:36 | 00:10:16 | 39.01 -> 39.26 | 79 | yes | 38.7 |
| greaterThan hard | 00:10:32 | 00:10:44 | 10.94 -> 11.38 | 22 | yes | 10.8 |
| greaterThan expert | 00:11:01 | 00:12:36 | 89.27 -> 95.55 | 179 | yes | 95.0 |
| diagonalX nightmare | 00:12:53 | 00:14:22 | 96.13 -> 88.61 | 193 | yes | 88.1 |

## Accounting: 204 outcomes, nothing dropped (MS06d-T01, T02)

All 17 ledgers have `complete: true`, `schema: 1` and exactly 12 rows with absolute indexes 0 to 11 and tags `<variant>:<level>:<index>`:
**204 outcomes**, 204 `outcome: ok`, **0 request errors**. All 204 request identities (variant, level, index, tag and, on the
pipeline route, the pipeline seed) equal MS06a's, the command line equals MS06a's apart from the ledger path in every cell, and the
manifest (route, reference indexes, reference budget, rating version) is equal. The before ledgers' SHA-256 values equal the table
above (17 of 17), so this reads the same record. Terms are those of the before-record: **exact** is the strict `exact` flag,
**shallow** a solved puzzle in the requested band that is not exact, **miss** no puzzle in the requested band; the three add up to
12 in every cell and the exact share is over the 12 requests, never over the in-band ones.

The policy draws a target, so a seed can give another puzzle by design; an equal puzzle hash means the policy changed nothing for
that request. Equal puzzle hashes, of 12: classic9 Normal 8, Hard 6, Expert 3, Master 7, Nightmare 8, Hell 1 10; killer Normal 8,
Hard 9, **Expert 12**; jigsaw9 Normal 7, **Hard 1**, Expert 4, Nightmare 4; **Greater-Than Normal, Hard and Expert 12 each**;
diagonalX Nightmare 5. In all, 128 of 204.

## Hits

Every cell, with the old soak gate line (the 90% classic9 and 80% other-boards line, informational under `--no-gate`, recorded as
measured):

| Cell | Before exact / shallow / miss | After exact / shallow / miss | Exact share | In band | Change in exact hits | Soak gate line (informational under --no-gate) |
|---|---:|---:|---:|---:|---|---|
| classic9 normal | 10 / 2 / 0 | 11 / 1 / 0 | 83% -> 92% | 12 -> 12 | gain +1 | FAIL -> PASS |
| classic9 hard | 12 / 0 / 0 | 12 / 0 / 0 | 100% -> 100% | 12 -> 12 | same | PASS -> PASS |
| classic9 expert | 12 / 0 / 0 | 12 / 0 / 0 | 100% -> 100% | 12 -> 12 | same | PASS -> PASS |
| classic9 master | 12 / 0 / 0 | 12 / 0 / 0 | 100% -> 100% | 12 -> 12 | same | PASS -> PASS |
| classic9 nightmare | 2 / 10 / 0 | 3 / 9 / 0 | 17% -> 25% | 12 -> 12 | gain +1 | FAIL -> FAIL |
| classic9 hell1 | 12 / 0 / 0 | 12 / 0 / 0 | 100% -> 100% | 12 -> 12 | same | PASS -> PASS |
| killer normal | 12 / 0 / 0 | 12 / 0 / 0 | 100% -> 100% | 12 -> 12 | same | PASS -> PASS |
| killer hard | 0 / 12 / 0 | 0 / 12 / 0 | 0% -> 0% | 12 -> 12 | same | FAIL -> FAIL |
| killer expert | 0 / 12 / 0 | 0 / 12 / 0 | 0% -> 0% | 12 -> 12 | same | FAIL -> FAIL |
| jigsaw9 normal | 12 / 0 / 0 | 12 / 0 / 0 | 100% -> 100% | 12 -> 12 | same | PASS -> PASS |
| jigsaw9 hard | 12 / 0 / 0 | 12 / 0 / 0 | 100% -> 100% | 12 -> 12 | same | PASS -> PASS |
| jigsaw9 expert | 11 / 1 / 0 | 10 / 2 / 0 | 92% -> 83% | 12 -> 12 | LOSS -1 | PASS -> PASS |
| jigsaw9 nightmare | 12 / 0 / 0 | 12 / 0 / 0 | 100% -> 100% | 12 -> 12 | same | PASS -> PASS |
| greaterThan normal | 12 / 0 / 0 | 12 / 0 / 0 | 100% -> 100% | 12 -> 12 | same | PASS -> PASS |
| greaterThan hard | 12 / 0 / 0 | 12 / 0 / 0 | 100% -> 100% | 12 -> 12 | same | PASS -> PASS |
| greaterThan expert | 10 / 0 / 2 | 10 / 0 / 2 | 83% -> 83% | 10 -> 10 | same | PASS -> PASS |
| diagonalX nightmare | 10 / 2 / 0 | 10 / 2 / 0 | 83% -> 83% | 12 -> 12 | same | PASS -> PASS |
| **Total (204)** | 163 / 39 / 2 | 164 / 38 / 2 | 80% -> 80% | 202 -> 202 | +1 exact | 4 FAIL -> 3 FAIL |

The requests with the same puzzle and with another puzzle:

| Group | Requests | Exact before -> after | Shallow before -> after | Miss before -> after | Generation s before -> after |
|---|---:|---:|---:|---:|---:|
| Same puzzle hash | 128 | 94 -> 94 | 32 -> 32 | 2 -> 2 | 360.76 -> 359.47 |
| Another puzzle | 76 | 69 -> 70 | 7 -> 6 | 0 -> 0 | 93.85 -> 94.95 |

Every request whose outcome changed (the gains and the losses are all here):

| Request | Before | After | Before: time s, attempts, full ratings | After: time s, attempts, full ratings | Change |
|---|---|---|---:|---:|---|
| classic9:normal:11 | shallow, 220 | exact, 245 | 0.64, 8, 361 | 0.45, 7, 661 | gain |
| classic9:nightmare:1 | exact, 2375 | shallow, 2113 | 2.90, 5, 883 | 4.17, 8, 1529 | LOSS |
| classic9:nightmare:2 | shallow, 2197 | exact, 2329 | 4.09, 8, 1409 | 4.40, 8, 976 | gain |
| classic9:nightmare:11 | shallow, 1812 | exact, 2200 | 4.41, 8, 1166 | 2.46, 5, 730 | gain |
| jigsaw9:expert:0 | exact, 929 | shallow, 709 | 0.57, 2, 204 | 2.62, 8, 1728 | LOSS |
| diagonalX:nightmare:2 | shallow, 1514 | exact, 2360 | 13.77, 8, 2142 | 11.73, 8, 2341 | gain |
| diagonalX:nightmare:6 | exact, 2306 | shallow, 1947 | 2.39, 2, 531 | 11.75, 8, 2315 | LOSS |

**R7 hit-loss report (counts and timings).** One cell lost exact hits: **jigsaw9 Expert, 11 of 12 to 10 of 12** (92% to 83%, still
above the soak's 80% line). Request 0 was exact (score 929, 0.57 s, 2 attempts, 204 full ratings) and is now shallow (709, 2.62 s,
all 8 attempts, 1,728 full ratings, target 935.9); request 6 is shallow in both runs (718, 2.58 s then 2.38 s). The cell's
generation time went from 7.98 s to 10.30 s. Two more requests lost exactness inside cells whose net is not negative (classic9
Nightmare 1, 2.90 s to 4.17 s; diagonalX Nightmare 6, 2.39 s to 11.75 s), so the per-cell net hides **three request-level losses
against four gains**. No cell has fewer in-band puzzles (202 to 202) and no request became a new miss. Nothing was reverted,
narrowed or repaired: the accepted full-scope policy ran as activated (MS06d-B02).

Every non-exact request after the policy (none is dropped; killer Hard and Expert are 12 shallow of 12 each, as before, with 96
attempts each ended at the proposal cap or, once in Hard, by the allowance):

| Request | Outcome (score) | Time s | Attempts | Full ratings | Target | Before |
|---|---|---:|---:|---:|---:|---|
| classic9:normal:9 | shallow, 220 | 0.92 | 8 | 367 | 379.7 | shallow, 220 |
| classic9:nightmare:1 | shallow, 2113 | 4.17 | 8 | 1529 | 1877.4 | exact, 2375 |
| classic9:nightmare:3 | shallow, 1865 | 4.61 | 8 | 1345 | 2347.9 | shallow, 1865 |
| classic9:nightmare:4 | shallow, 1851 | 4.95 | 8 | 1694 | 2176.2 | shallow, 1851 |
| classic9:nightmare:5 | shallow, 2166 | 4.65 | 8 | 1431 | 1761.6 | shallow, 2166 |
| classic9:nightmare:6 | shallow, 1941 | 4.48 | 8 | 1189 | 2094.2 | shallow, 1941 |
| classic9:nightmare:7 | shallow, 1793 | 5.34 | 8 | 1727 | 1876.6 | shallow, 1793 |
| classic9:nightmare:8 | shallow, 1612 | 5.38 | 8 | 1494 | 2307.8 | shallow, 1612 |
| classic9:nightmare:9 | shallow, 2221 | 4.77 | 8 | 1455 | 2031.6 | shallow, 2221 |
| classic9:nightmare:10 | shallow, 1947 | 3.84 | 8 | 1462 | 1937.3 | shallow, 1947 |
| jigsaw9:expert:0 | shallow, 709 | 2.62 | 8 | 1728 | 935.9 | exact, 929 |
| jigsaw9:expert:6 | shallow, 718 | 2.38 | 8 | 1547 | 813.8 | shallow, 718 |
| greaterThan:expert:2 | miss (master), 1013 | 14.87 | 8 | 115 | 946.5 | miss, 1013 |
| greaterThan:expert:5 | miss (master), 1046 | 15.23 | 8 | 109 | 761.0 | miss, 1046 |
| diagonalX:nightmare:5 | shallow, 1569 | 11.58 | 8 | 2326 | 2386.5 | shallow, 1569 |
| diagonalX:nightmare:6 | shallow, 1947 | 11.75 | 8 | 2315 | 2113.9 | exact, 2306 |

## Time

"Generation" is the sum of `generationMs` over the 12 rows; with 12 requests the nearest-rank p95 of the soak is the maximum.
"Soak" and "helper" are as in the before-record. `SLOW` is the soak's informational flag against the design 9.1 p95 target, not
the GP gate. (The before-record prints 15.80 s for killer Expert's slowest request, rounded from 15,795 ms; the ledger has
15,794.671 ms, which is 15.79 s at two decimals. This table reads the ledger; after, the same request is 15,793.45 ms.)

| Cell | Before s | After s | Change s | Ratio | Mean s | Upper median s | Max s (p95) | Soak s | Helper s | Flag vs 9.1 target |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| classic9 normal | 2.62 | 2.57 | -0.05 | 0.98x | 0.22 -> 0.21 | 0.14 -> 0.15 | 0.95 -> 0.92 | 2.9 -> 3.0 | 3.37 -> 3.45 | SLOW -> SLOW |
| classic9 hard | 0.22 | 0.22 | +0.01 | 1.03x | 0.02 -> 0.02 | 0.01 -> 0.01 | 0.05 -> 0.05 | 0.3 -> 0.3 | 0.77 -> 0.78 | ok -> ok |
| classic9 expert | 0.35 | 0.35 | +0.00 | 1.00x | 0.03 -> 0.03 | 0.01 -> 0.01 | 0.15 -> 0.14 | 0.4 -> 0.4 | 0.90 -> 0.90 | ok -> ok |
| classic9 master | 0.73 | 0.71 | -0.02 | 0.98x | 0.06 -> 0.06 | 0.05 -> 0.05 | 0.11 -> 0.11 | 0.9 -> 0.9 | 1.42 -> 1.40 | ok -> ok |
| classic9 nightmare | 54.12 | 49.72 | -4.40 | 0.92x | 4.51 -> 4.14 | 4.87 -> 4.61 | 5.67 -> 5.38 | 65.4 -> 58.9 | 65.98 -> 59.39 | SLOW -> SLOW |
| classic9 hell1 | 7.73 | 7.43 | -0.30 | 0.96x | 0.64 -> 0.62 | 0.51 -> 0.56 | 1.46 -> 1.27 | 10.6 -> 10.0 | 11.18 -> 10.57 | ok -> ok |
| killer normal | 5.26 | 5.23 | -0.03 | 0.99x | 0.44 -> 0.44 | 0.33 -> 0.33 | 1.08 -> 1.07 | 5.6 -> 5.5 | 6.08 -> 6.03 | SLOW -> SLOW |
| killer hard | 58.64 | 58.64 | +0.01 | 1.00x | 4.89 -> 4.89 | 4.86 -> 4.94 | 5.98 -> 6.05 | 73.3 -> 73.0 | 73.78 -> 73.53 | SLOW -> SLOW |
| killer expert | 120.21 | 121.20 | +0.99 | 1.01x | 10.02 -> 10.10 | 9.64 -> 9.66 | 15.79 -> 15.79 | 149.5 -> 150.5 | 150.66 -> 151.06 | SLOW -> SLOW |
| jigsaw9 normal | 1.02 | 0.82 | -0.20 | 0.81x | 0.08 -> 0.07 | 0.06 -> 0.05 | 0.21 -> 0.20 | 1.3 -> 1.0 | 1.80 -> 1.50 | ok -> ok |
| jigsaw9 hard | 0.43 | 0.41 | -0.02 | 0.96x | 0.04 -> 0.03 | 0.03 -> 0.03 | 0.09 -> 0.10 | 0.6 -> 0.6 | 1.11 -> 1.08 | ok -> ok |
| jigsaw9 expert | 7.98 | 10.30 | +2.33 | 1.29x | 0.66 -> 0.86 | 0.57 -> 0.73 | 2.58 -> 2.62 | 9.9 -> 14.5 | 10.42 -> 14.98 | SLOW -> SLOW |
| jigsaw9 nightmare | 5.94 | 9.08 | +3.14 | 1.53x | 0.49 -> 0.76 | 0.45 -> 0.49 | 1.72 -> 3.44 | 6.7 -> 9.9 | 7.24 -> 11.02 | ok -> ok |
| greaterThan normal | 34.35 | 34.65 | +0.30 | 1.01x | 2.86 -> 2.89 | 1.96 -> 1.99 | 7.71 -> 7.49 | 38.5 -> 38.7 | 39.01 -> 39.26 | SLOW -> SLOW |
| greaterThan hard | 9.83 | 10.22 | +0.39 | 1.04x | 0.82 -> 0.85 | 0.26 -> 0.27 | 3.99 -> 4.14 | 10.4 -> 10.8 | 10.94 -> 11.38 | ok -> ok |
| greaterThan expert | 63.24 | 67.21 | +3.97 | 1.06x | 5.27 -> 5.60 | 5.48 -> 5.73 | 14.34 -> 15.23 | 88.8 -> 95.0 | 89.27 -> 95.55 | SLOW -> SLOW |
| diagonalX nightmare | 81.96 | 75.63 | -6.33 | 0.92x | 6.83 -> 6.30 | 7.17 -> 6.30 | 13.77 -> 11.75 | 95.6 -> 88.1 | 96.13 -> 88.61 | SLOW -> SLOW |
| **Total** | 454.62 | 454.42 | -0.19 | 1.00x |  |  |  | 560.7 -> 561.1 | 570.1 -> 570.5 | 9 -> 9 SLOW |

How much of a cell's change is noise: the Greater-Than cells generate the identical puzzle in all 36 requests, and their generation
time still differs by +0.9%, +4.0% and +6.3% (Normal, Hard, Expert); killer Expert, also 12 of 12 identical, +0.8%. Over the 128
identical requests the time is 360.76 to 359.47 s (-0.4%). Only three requests are more than 1.5x and 0.5 s slower than before:
diagonalX:nightmare:6 (2.39 to 11.75 s), jigsaw9:nightmare:9 (0.30 to 3.44 s) and jigsaw9:expert:0 (0.57 to 2.62 s); three are as
much faster: classic9:nightmare:11 (4.41 to 2.46 s), diagonalX:nightmare:7 (8.22 to 2.44 s) and classic9:nightmare:0 (1.94 to 0.68 s).

## Work, and the plateau effect

`fullRatings` is the sum of the full ratings of every attempt; `attempts` counts the entries of `work`; "cap hits" are the local
searches ended by the allowance, the rating cap and the proposal cap. The work conservation check is `ok` 204 of 204 after.

| Cell | Full ratings before -> after | Upper median | Max | Attempts (per request) | Proposals | Local ratings | Shallow ratings | Cap hits allowance / ratings / proposals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| classic9 normal | 1,657 -> 1,752 | 75 -> 66 | 615 -> 661 | 35 (1-8) -> 36 (1-8) | 822,401 -> 759,313 | 1,290 -> 1,389 | 787 -> 958 | 0 / 0 / 25 -> 2 / 0 / 23 |
| classic9 hard | 137 -> 136 | 5 -> 5 | 93 -> 92 | 12 (1-1) -> 12 (1-1) | 599 -> 599 | 81 -> 80 | 0 -> 0 | 0 / 0 / 0 -> 0 / 0 / 0 |
| classic9 expert | 389 -> 226 | 3 -> 3 | 259 -> 107 | 13 (1-2) -> 13 (1-2) | 33,415 -> 33,415 | 340 -> 177 | 0 -> 0 | 0 / 0 / 1 -> 0 / 0 / 1 |
| classic9 master | 53 -> 53 | 4 -> 4 | 9 -> 9 | 12 (1-1) -> 12 (1-1) | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 / 0 / 0 -> 0 / 0 / 0 |
| classic9 nightmare | 15,010 -> 15,063 | 1,345 -> 1,455 | 1,790 -> 1,727 | 88 (3-8) -> 86 (1-8) | 2,347,289 -> 2,075,278 | 13,839 -> 13,916 | 13,736 -> 13,771 | 17 / 0 / 69 -> 21 / 0 / 62 |
| classic9 hell1 | 1,892 -> 1,609 | 108 -> 104 | 462 -> 368 | 20 (1-4) -> 21 (1-4) | 272,124 -> 300,016 | 1,665 -> 1,372 | 0 -> 0 | 0 / 0 / 8 -> 0 / 0 / 9 |
| killer normal | 1,073 -> 1,066 | 65 -> 65 | 254 -> 270 | 29 (1-5) -> 29 (1-5) | 557,056 -> 557,056 | 802 -> 795 | 100 -> 116 | 0 / 0 / 17 -> 0 / 0 / 17 |
| killer hard | 6,160 -> 7,525 | 512 -> 581 | 569 -> 852 | 96 (8-8) -> 96 (8-8) | 3,145,728 -> 3,114,876 | 5,008 -> 6,373 | 3,883 -> 5,357 | 0 / 0 / 96 -> 1 / 0 / 95 |
| killer expert | 25,990 -> 26,205 | 2,250 -> 2,250 | 2,658 -> 2,571 | 96 (8-8) -> 96 (8-8) | 3,145,728 -> 3,145,728 | 5,046 -> 5,261 | 1,805 -> 1,920 | 0 / 0 / 96 -> 0 / 0 / 96 |
| jigsaw9 normal | 309 -> 543 | 11 -> 11 | 84 -> 271 | 16 (1-2) -> 15 (1-2) | 131,332 -> 66,484 | 179 -> 416 | 179 -> 416 | 0 / 0 / 4 -> 1 / 0 / 2 |
| jigsaw9 hard | 34 -> 34 | 3 -> 3 | 6 -> 6 | 12 (1-1) -> 12 (1-1) | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 / 0 / 0 -> 0 / 0 / 0 |
| jigsaw9 expert | 5,615 -> 6,902 | 318 -> 433 | 1,633 -> 1,728 | 37 (1-8) -> 43 (1-8) | 675,849 -> 960,215 | 5,214 -> 6,429 | 3,864 -> 4,599 | 6 / 0 / 20 -> 4 / 0 / 29 |
| jigsaw9 nightmare | 1,062 -> 2,806 | 93 -> 107 | 296 -> 1,694 | 14 (1-2) -> 20 (1-7) | 67,285 -> 103,428 | 655 -> 2,035 | 655 -> 2,035 | 0 / 0 / 2 -> 5 / 0 / 3 |
| greaterThan normal | 319 -> 324 | 24 -> 24 | 61 -> 61 | 31 (1-5) -> 31 (1-5) | 622,592 -> 622,592 | 20 -> 25 | 8 -> 11 | 0 / 0 / 19 -> 0 / 0 / 19 |
| greaterThan hard | 103 -> 103 | 5 -> 5 | 28 -> 28 | 16 (1-3) -> 16 (1-3) | 131,072 -> 131,072 | 0 -> 0 | 0 -> 0 | 0 / 0 / 4 -> 0 / 0 / 4 |
| greaterThan expert | 518 -> 520 | 47 -> 47 | 115 -> 115 | 44 (1-8) -> 44 (1-8) | 1,114,112 -> 1,114,112 | 28 -> 30 | 0 -> 0 | 0 / 0 / 34 -> 0 / 0 / 34 |
| diagonalX nightmare | 13,072 -> 14,303 | 1,200 -> 1,197 | 2,326 -> 2,341 | 53 (1-8) -> 56 (1-8) | 375,614 -> 433,057 | 10,990 -> 12,066 | 10,990 -> 12,066 | 33 / 0 / 10 -> 34 / 0 / 12 |
| **Total** | 73,393 -> 79,170 |  |  | 624 -> 638 |  |  |  | 56 / 0 / 405 -> 68 / 0 / 406 |

The plateau effect of MS06c2 (SA1's IR50/IR51: a local search no longer follows an equal-quality move, and G10 was named as
worth watching). G10 is killer Nightmare, seed 42; no killer Nightmare cell is in these 17, so the nearest cells are killer Hard and
Expert. Per local search:

| Cell | Searches before -> after | Ended by allowance | Ended by rating cap | Ended by proposal cap | Ended without a cap | Proposals per search | Ratings per search |
|---|---:|---:|---:|---:|---:|---:|---:|
| classic9 normal | 27 -> 26 | 0 -> 2 | 0 -> 0 | 25 -> 23 | 2 -> 1 | 30,459 -> 29,204 | 47.8 -> 53.4 |
| classic9 hard | 1 -> 1 | 0 -> 0 | 0 -> 0 | 0 -> 0 | 1 -> 1 | 599 -> 599 | 81.0 -> 80.0 |
| classic9 expert | 2 -> 2 | 0 -> 0 | 0 -> 0 | 1 -> 1 | 1 -> 1 | 16,708 -> 16,708 | 170.0 -> 88.5 |
| classic9 master | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 | n/a -> n/a | n/a -> n/a |
| classic9 nightmare | 88 -> 86 | 17 -> 21 | 0 -> 0 | 69 -> 62 | 2 -> 3 | 26,674 -> 24,131 | 157.3 -> 161.8 |
| classic9 hell1 | 18 -> 18 | 0 -> 0 | 0 -> 0 | 8 -> 9 | 10 -> 9 | 15,118 -> 16,668 | 92.5 -> 76.2 |
| killer normal | 17 -> 17 | 0 -> 0 | 0 -> 0 | 17 -> 17 | 0 -> 0 | 32,768 -> 32,768 | 47.2 -> 46.8 |
| killer hard | 96 -> 96 | 0 -> 1 | 0 -> 0 | 96 -> 95 | 0 -> 0 | 32,768 -> 32,447 | 52.2 -> 66.4 |
| killer expert | 96 -> 96 | 0 -> 0 | 0 -> 0 | 96 -> 96 | 0 -> 0 | 31,981 -> 31,981 | 52.6 -> 54.8 |
| jigsaw9 normal | 5 -> 5 | 0 -> 1 | 0 -> 0 | 4 -> 2 | 1 -> 2 | 26,266 -> 13,297 | 35.8 -> 83.2 |
| jigsaw9 hard | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 | n/a -> n/a | n/a -> n/a |
| jigsaw9 expert | 28 -> 34 | 6 -> 4 | 0 -> 0 | 20 -> 29 | 2 -> 1 | 24,137 -> 28,242 | 186.2 -> 189.1 |
| jigsaw9 nightmare | 8 -> 13 | 0 -> 5 | 0 -> 0 | 2 -> 3 | 6 -> 5 | 8,411 -> 7,956 | 81.9 -> 156.5 |
| greaterThan normal | 19 -> 19 | 0 -> 0 | 0 -> 0 | 19 -> 19 | 0 -> 0 | 32,768 -> 32,768 | 1.1 -> 1.3 |
| greaterThan hard | 4 -> 4 | 0 -> 0 | 0 -> 0 | 4 -> 4 | 0 -> 0 | 32,768 -> 32,768 | 0.0 -> 0.0 |
| greaterThan expert | 34 -> 34 | 0 -> 0 | 0 -> 0 | 34 -> 34 | 0 -> 0 | 32,768 -> 32,768 | 0.8 -> 0.9 |
| diagonalX nightmare | 47 -> 50 | 33 -> 34 | 0 -> 0 | 10 -> 12 | 4 -> 4 | 7,992 -> 8,661 | 233.8 -> 241.3 |
| **Total** | 490 -> 501 | 56 -> 68 | 0 -> 0 | 405 -> 406 | 29 -> 27 |  |  |

What it shows, as measurement only (which mechanism moved a given request was not investigated; that is outside this task): the
G10 pattern, a search that used to end at the allowance now ending on the proposal cap with fewer ratings, is not what these cells
show. Killer Hard and Expert already ended every search on the proposal cap (96 of 96); after, 95 of 96 in Hard (one search now ends
by the allowance), ratings per search rise in Hard (52.2 to 66.4) and barely move in Expert (52.6 to 54.8), full ratings +22%
(6,160 to 7,525) and +0.8%, with no change in time (58.64 to 58.64 s, 120.21 to 121.20 s; the proposals dominate). In the Nightmare
cells the proposal-cap endings fall (classic9 69 to 62) and the allowance endings rise (classic9 17 to 21, diagonalX 33 to 34,
jigsaw9 0 to 5). The largest relative work increase is jigsaw9 Nightmare (1,062 to 2,806 full ratings, 2.6x).

## Positions (AC01: raw and adjusted side by side)

`raw = (score - min) / (max - min)`, `adjusted = (score - lower) / (max - lower)` with `lower = max(min, 1.25 * wMin + V)`, neither
rounded nor clamped (a negative adjusted value is a score below the analytic lower bound and stays as computed). The adjusted
position is defined only for a rated, in-band request with a finite positive width and a non-empty, non-vacuous tier; otherwise it is
`null` with a reason and the raw value stays. Per cell and cohort: minimum / upper median (sorted index floor(n / 2)) / maximum,
before and after. "Top quarter" counts the cohort puzzles with adjusted position 0.75 or more: a descriptive marker, not an
acceptance threshold (the raw-median 0.75 trigger was discarded; R7 judges upper bias on the adjusted exact cohort). The cohort
sizes differ between before and after, so a median is never read without its n. The pooled row is every cohort puzzle of the 17
cells together, Hell 1's adjusted positions excluded (undefined).

**Exact cohort** (the puzzles with the exact flag):

| Cell | n before -> after | Raw min / median / max before | Raw after | Adjusted n | Adjusted min / median / max before | Adjusted after | Adjusted >= 0.75 (top quarter) | Median change (adjusted) | Null reasons (adjusted) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| classic9 normal | 10 -> 11 | 0.277 / 0.386 / 0.677 | 0.273 / 0.386 / 0.677 | 10 -> 11 | 0.086 / 0.222 / 0.592 | 0.084 / 0.222 / 0.592 | 0/10 -> 0/11 | 0.000 | none |
| classic9 hard | 12 -> 12 | 0.310 / 0.530 / 0.747 | 0.290 / 0.513 / 0.587 | 12 -> 12 | 0.190 / 0.447 / 0.701 | 0.169 / 0.428 / 0.512 | 0/12 -> 0/12 | -0.020 | none |
| classic9 expert | 12 -> 12 | 0.623 / 0.827 / 0.963 | 0.567 / 0.790 / 0.953 | 12 -> 12 | 0.208 / 0.636 / 0.922 | 0.104 / 0.561 / 0.902 | 2/12 -> 2/12 | -0.075 | none |
| classic9 master | 12 -> 12 | 0.374 / 0.614 / 0.990 | 0.370 / 0.548 / 0.856 | 12 -> 12 | 0.201 / 0.511 / 0.987 | 0.198 / 0.426 / 0.817 | 2/12 -> 1/12 | -0.085 | none |
| classic9 nightmare | 2 -> 3 | 0.911 / 0.972 / 0.972 | 0.778 / 0.921 / 0.961 | 2 -> 3 | 0.652 / 0.891 / 0.891 | 0.131 / 0.691 / 0.848 | 1/2 -> 1/3 | -0.200 | none |
| classic9 hell1 | 12 -> 12 | 0.469 / 0.666 / 0.986 | 0.469 / 0.567 / 0.986 | 0 -> 0 | empty | empty | n/a -> n/a | n/a | empty-tier x 12 |
| killer normal | 12 -> 12 | 0.695 / 0.732 / 0.773 | 0.695 / 0.732 / 0.773 | 12 -> 12 | 0.598 / 0.647 / 0.700 | 0.598 / 0.647 / 0.700 | 0/12 -> 0/12 | 0.000 | none |
| killer hard | 0 -> 0 | empty | empty | 0 -> 0 | empty | empty | n/a -> n/a | n/a | none |
| killer expert | 0 -> 0 | empty | empty | 0 -> 0 | empty | empty | n/a -> n/a | n/a | none |
| jigsaw9 normal | 12 -> 12 | 0.405 / 0.536 / 0.777 | 0.405 / 0.523 / 0.745 | 12 -> 12 | 0.239 / 0.406 / 0.715 | 0.239 / 0.389 / 0.674 | 0/12 -> 0/12 | -0.017 | none |
| jigsaw9 hard | 12 -> 12 | 0.380 / 0.837 / 0.997 | 0.330 / 0.600 / 0.807 | 12 -> 12 | 0.261 / 0.806 / 0.996 | 0.203 / 0.528 / 0.771 | 6/12 -> 1/12 | -0.278 | none |
| jigsaw9 expert | 11 -> 10 | 0.617 / 0.920 / 0.993 | 0.603 / 0.880 / 0.993 | 11 -> 10 | 0.178 / 0.829 / 0.986 | 0.166 / 0.748 / 0.986 | 6/11 -> 4/10 | -0.082 | none |
| jigsaw9 nightmare | 12 -> 12 | 0.842 / 0.906 / 0.990 | 0.792 / 0.898 / 0.989 | 12 -> 12 | 0.378 / 0.628 / 0.961 | 0.192 / 0.595 / 0.956 | 1/12 -> 3/12 | -0.033 | none |
| greaterThan normal | 12 -> 12 | 0.427 / 0.568 / 0.814 | 0.427 / 0.568 / 0.814 | 12 -> 12 | 0.271 / 0.448 / 0.762 | 0.271 / 0.448 / 0.762 | 1/12 -> 1/12 | 0.000 | none |
| greaterThan hard | 12 -> 12 | 0.623 / 0.767 / 0.877 | 0.623 / 0.767 / 0.877 | 12 -> 12 | 0.556 / 0.724 / 0.854 | 0.556 / 0.724 / 0.854 | 5/12 -> 5/12 | 0.000 | none |
| greaterThan expert | 10 -> 10 | 0.850 / 0.927 / 0.973 | 0.850 / 0.927 / 0.973 | 10 -> 10 | 0.681 / 0.844 / 0.943 | 0.681 / 0.844 / 0.943 | 9/10 -> 9/10 | 0.000 | none |
| diagonalX nightmare | 10 -> 10 | 0.798 / 0.904 / 0.988 | 0.834 / 0.927 / 0.988 | 10 -> 10 | 0.199 / 0.623 / 0.952 | 0.346 / 0.711 / 0.952 | 2/10 -> 4/10 | +0.088 | none |
| **All cells (pooled)** | 163 -> 164 | 0.277 / 0.747 / 0.997 | 0.273 / 0.706 / 0.993 | 151 -> 152 | 0.086 / 0.623 / 0.996 | 0.084 / 0.560 / 0.986 | 35/151 -> 31/152 | -0.064 | Hell 1 undefined |

**All-in-band cohort** (the solved puzzles in the requested band: the exact ones and the shallow ones):

| Cell | n before -> after | Raw min / median / max before | Raw after | Adjusted n | Adjusted min / median / max before | Adjusted after | Adjusted >= 0.75 (top quarter) | Median change (adjusted) | Null reasons (adjusted) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| classic9 normal | 12 -> 12 | 0.182 / 0.368 / 0.677 | 0.182 / 0.386 / 0.677 | 12 -> 12 | -0.037 / 0.201 / 0.592 | -0.037 / 0.222 / 0.592 | 0/12 -> 0/12 | +0.021 | none |
| classic9 hard | 12 -> 12 | 0.310 / 0.530 / 0.747 | 0.290 / 0.513 / 0.587 | 12 -> 12 | 0.190 / 0.447 / 0.701 | 0.169 / 0.428 / 0.512 | 0/12 -> 0/12 | -0.020 | none |
| classic9 expert | 12 -> 12 | 0.623 / 0.827 / 0.963 | 0.567 / 0.790 / 0.953 | 12 -> 12 | 0.208 / 0.636 / 0.922 | 0.104 / 0.561 / 0.902 | 2/12 -> 2/12 | -0.075 | none |
| classic9 master | 12 -> 12 | 0.374 / 0.614 / 0.990 | 0.370 / 0.548 / 0.856 | 12 -> 12 | 0.201 / 0.511 / 0.987 | 0.198 / 0.426 / 0.817 | 2/12 -> 1/12 | -0.085 | none |
| classic9 nightmare | 12 -> 12 | 0.124 / 0.497 / 0.972 | 0.124 / 0.681 / 0.961 | 12 -> 12 | -2.429 / -0.971 / 0.891 | -2.429 / -0.255 / 0.848 | 1/12 -> 1/12 | +0.716 | none |
| classic9 hell1 | 12 -> 12 | 0.469 / 0.666 / 0.986 | 0.469 / 0.567 / 0.986 | 0 -> 0 | empty | empty | n/a -> n/a | n/a | empty-tier x 12 |
| killer normal | 12 -> 12 | 0.695 / 0.732 / 0.773 | 0.695 / 0.732 / 0.773 | 12 -> 12 | 0.598 / 0.647 / 0.700 | 0.598 / 0.647 / 0.700 | 0/12 -> 0/12 | 0.000 | none |
| killer hard | 12 -> 12 | 0.440 / 0.647 / 0.773 | 0.440 / 0.600 / 0.773 | 12 -> 12 | 0.320 / 0.571 / 0.724 | 0.320 / 0.514 / 0.724 | 0/12 -> 0/12 | -0.058 | none |
| killer expert | 12 -> 12 | 0.007 / 0.267 / 0.980 | 0.007 / 0.267 / 0.980 | 12 -> 12 | -1.186 / -0.642 / 0.956 | -1.186 / -0.642 / 0.956 | 1/12 -> 1/12 | 0.000 | none |
| jigsaw9 normal | 12 -> 12 | 0.405 / 0.536 / 0.777 | 0.405 / 0.523 / 0.745 | 12 -> 12 | 0.239 / 0.406 / 0.715 | 0.239 / 0.389 / 0.674 | 0/12 -> 0/12 | -0.017 | none |
| jigsaw9 hard | 12 -> 12 | 0.380 / 0.837 / 0.997 | 0.330 / 0.600 / 0.807 | 12 -> 12 | 0.261 / 0.806 / 0.996 | 0.203 / 0.528 / 0.771 | 6/12 -> 1/12 | -0.278 | none |
| jigsaw9 expert | 12 -> 12 | 0.060 / 0.920 / 0.993 | 0.030 / 0.870 / 0.993 | 12 -> 12 | -1.022 / 0.829 / 0.986 | -1.081 / 0.727 / 0.986 | 6/12 -> 4/12 | -0.103 | none |
| jigsaw9 nightmare | 12 -> 12 | 0.842 / 0.906 / 0.990 | 0.792 / 0.898 / 0.989 | 12 -> 12 | 0.378 / 0.628 / 0.961 | 0.192 / 0.595 / 0.956 | 1/12 -> 3/12 | -0.033 | none |
| greaterThan normal | 12 -> 12 | 0.427 / 0.568 / 0.814 | 0.427 / 0.568 / 0.814 | 12 -> 12 | 0.271 / 0.448 / 0.762 | 0.271 / 0.448 / 0.762 | 1/12 -> 1/12 | 0.000 | none |
| greaterThan hard | 12 -> 12 | 0.623 / 0.767 / 0.877 | 0.623 / 0.767 / 0.877 | 12 -> 12 | 0.556 / 0.724 / 0.854 | 0.556 / 0.724 / 0.854 | 5/12 -> 5/12 | 0.000 | none |
| greaterThan expert | 10 -> 10 | 0.850 / 0.927 / 0.973 | 0.850 / 0.927 / 0.973 | 10 -> 10 | 0.681 / 0.844 / 0.943 | 0.681 / 0.844 / 0.943 | 9/10 -> 9/10 | 0.000 | none |
| diagonalX nightmare | 12 -> 12 | 0.016 / 0.897 / 0.988 | 0.077 / 0.921 / 0.988 | 12 -> 12 | -2.886 / 0.592 / 0.952 | -2.592 / 0.689 / 0.952 | 2/12 -> 4/12 | +0.096 | none |
| **All cells (pooled)** | 202 -> 202 | 0.007 / 0.712 / 0.997 | 0.007 / 0.633 / 0.993 | 190 -> 190 | -2.886 / 0.566 / 0.996 | -2.592 / 0.505 / 0.986 | 36/190 -> 32/190 | -0.061 | Hell 1 undefined |

Reading: the adjusted exact median fell in classic9 Hard (0.447 to 0.428), Expert (0.636 to 0.561), Master (0.511 to 0.426) and
Nightmare (0.891 to 0.691, n 2 to 3), in jigsaw9 Normal (0.406 to 0.389), Hard (0.806 to 0.528; the top-quarter count 6 of 12 to 1 of
12), Expert (0.829 to 0.748, with n 11 to 10: the lower median comes with one fewer exact puzzle, S-AV21) and Nightmare (0.628 to
0.595); it rose in diagonalX Nightmare (0.623 to 0.711). Four cells had an adjusted exact median of 0.75 or more before (classic9
Nightmare, jigsaw9 Hard, jigsaw9 Expert and Greater-Than Expert) and one has after (Greater-Than Expert, 0.844 as before, 9 of 10 in
the top quarter). The all-in-band classic9 Nightmare median (-0.971 to -0.255) and the other negative adjusted values are scores
below the analytic lower bound, kept unclamped.

Undefined or out-of-cohort positions in the 204 rows (none is dropped); the reasons are the same before and after:

| Run | Rows with adjusted null | Reasons | Rows in neither cohort (off-band, unrated) | Which |
|---|---:|---|---:|---|
| Before | 14 | empty-tier x 12, off-band x 2 | 2 | greaterThan:expert:2 raw 1.043; greaterThan:expert:5 raw 1.153 |
| After | 14 | empty-tier x 12, off-band x 2 | 2 | greaterThan:expert:2 raw 1.043; greaterThan:expert:5 raw 1.153 |

The 12 Hell 1 rows have `empty-tier` (their raw positions are defined above), the two Greater-Than Expert misses `off-band`; no row has
any other reason (`unrated`, `non-finite-band`, `non-positive-width` or `vacuous-tier`).

## Target deviation (after only: the 204 before rows have `target: null`)

The target of a row is the draw of the sample (or search) that produced the selected result, uniform on the raw finite band (R7).
Target position `tp = (target - min) / (max - min)`; deviation `d = raw position - tp` in band widths (positive: the puzzle is above
its target). "Paired" is the mean absolute `d` of each puzzle against its own target; "shuffled" is the mean of
`|raw position of puzzle i - tp of puzzle j|` over all pairs i, j of the cell cohort (i = j included): what the figure would be if
each target were unrelated to the puzzle it was drawn for. Paired well below shuffled would be a pull towards the target; paired near
shuffled no visible pull. Descriptive, 12 requests per cell. The target is a finite number in 204 of 204 rows after and in 0 of 204 before.

**Exact cohort:**

| Cell | n | Mean target position | Mean puzzle position | Mean signed d | Paired mean abs d | Paired upper median abs d | Shuffled mean abs d |
|---|---:|---:|---:|---:|---:|---:|---:|
| classic9 normal | 11 | 0.490 | 0.424 | -0.065 | 0.152 | 0.096 | 0.245 |
| classic9 hard | 12 | 0.496 | 0.443 | -0.053 | 0.183 | 0.193 | 0.253 |
| classic9 expert | 12 | 0.520 | 0.782 | +0.261 | 0.272 | 0.244 | 0.303 |
| classic9 master | 12 | 0.472 | 0.558 | +0.086 | 0.208 | 0.221 | 0.237 |
| classic9 nightmare | 3 | 0.415 | 0.887 | +0.472 | 0.495 | 0.648 | 0.480 |
| classic9 hell1 | 12 | 0.500 | 0.637 | +0.137 | 0.264 | 0.261 | 0.342 |
| killer normal | 12 | 0.617 | 0.728 | +0.112 | 0.285 | 0.287 | 0.278 |
| killer hard | 0 | n/a | n/a | n/a | n/a | n/a | n/a |
| killer expert | 0 | n/a | n/a | n/a | n/a | n/a | n/a |
| jigsaw9 normal | 12 | 0.386 | 0.536 | +0.150 | 0.277 | 0.328 | 0.286 |
| jigsaw9 hard | 12 | 0.337 | 0.574 | +0.236 | 0.269 | 0.170 | 0.315 |
| jigsaw9 expert | 10 | 0.248 | 0.817 | +0.569 | 0.569 | 0.660 | 0.569 |
| jigsaw9 nightmare | 12 | 0.612 | 0.897 | +0.285 | 0.301 | 0.303 | 0.304 |
| greaterThan normal | 12 | 0.492 | 0.602 | +0.111 | 0.280 | 0.342 | 0.278 |
| greaterThan hard | 12 | 0.560 | 0.765 | +0.206 | 0.239 | 0.211 | 0.264 |
| greaterThan expert | 10 | 0.501 | 0.920 | +0.419 | 0.426 | 0.400 | 0.432 |
| diagonalX nightmare | 10 | 0.485 | 0.921 | +0.436 | 0.466 | 0.550 | 0.445 |
| **All cells** | 164 |  |  |  | 0.297 | 0.238 | 0.316 |

Reading: pooled, the paired deviation is 0.297 against 0.316 shuffled: a weak pull on aggregate. It is clear in classic9 Normal
(0.152 against 0.245), Hard (0.183 against 0.253) and Hell 1 (0.264 against 0.342) and absent in several cells. The puzzles sit above
their targets where the tier forces a high floor (classic9 Expert +0.261, Nightmare +0.472, jigsaw9 Expert +0.569, Greater-Than Expert
+0.419): a target drawn below the attainable lower bound steers to the lowest reachable score (R7), which is why the adjusted position
is the one to judge. The Greater-Than rows are a control: their puzzles are identical to the before-record's and their sign pass
ignores the target, yet they show paired 0.280 / 0.239 / 0.426 against shuffled 0.278 / 0.264 / 0.432, so differences of that size in
other cells are within chance at 12 requests. The all-in-band cohort is in `comparison-tables.md` (all cells 0.308 paired, 0.312
shuffled).

**Greater-Than cells (CV6-05: the target is transported, not consumed by the first-allowed sign pass):**

| Cell | Same puzzle hash | Exact | Generation s | Full ratings | Adjusted exact median |
|---|---:|---:|---:|---:|---:|
| greaterThan normal | 12/12 | 12 -> 12 | 34.35 -> 34.65 | 319 -> 324 | 0.448 -> 0.448 |
| greaterThan hard | 12/12 | 12 -> 12 | 9.83 -> 10.22 | 103 -> 103 | 0.724 -> 0.724 |
| greaterThan expert | 12/12 | 10 -> 10 | 63.24 -> 67.21 | 518 -> 520 | 0.844 -> 0.844 |

A null effect, which CV6-05 named a valid result: the 36 puzzles are identical, so exact counts, positions and both misses are
unchanged; the small differences in full ratings (+5, 0, +2) and local ratings are counters of the same searches. No sign comparator was
added, discovery was not rerun and nothing was tuned to move these cells (MS06d-B02).

## Checks and errors

| Check | Result in all 17 after ledgers |
|---|---|
| `summary.checks.result` / soak `DIAGNOSTICS` line | `PASS` / `DIAGNOSTICS: PASS` x 17 |
| Request errors | 0 (204 of 204 rows `outcome: ok`) |
| Invariants I1-I7 | 0 violations each, 7 x 17 |
| Check errors, reference errors | 0 and 0 |
| Final-path re-rating (`pathCheck`) | `ok` 12 of 12 per cell (204), mismatch 0, error 0, not run 0 |
| Work conservation (`workCheck`) | `ok` 204, mismatch 0, unavailable 0; per-row cap hits equal the per-search ones in every cell |
| Exact flag against the derived verdict | 0 disagreements in every cell |
| Sampled reference floor (indexes 0 and 11 of each cell) | `ok` 32, `vacuous` 2 (Hell 1), error 0, skipped 0; the other 170 rows `not-selected` |
| Process | 17 helper exits 0; no timeout, no retry, no stray run; the soak's own `RESULT: FAIL` lines (classic9 Nightmare, killer Hard, killer Expert) are measured availability outcomes under `--no-gate`, not exit codes |

There is no invariant failure, no error and no evidence-integrity problem. The per-cell table is in `comparison-tables.md`.

## Items (S-OD4)

No stop was needed: nothing above is a correctness or evidence-integrity problem. Hit, time and work changes are named with numbers
for MS07e and then MS18c (availability) and MS18d (cost); none authorizes an offer, a green claim or a budget change (check-list
section 2), and none was repaired, skipped or reported as a pass.

**New, found by this comparison:**

| ID | Origin and numbers | Limit | Evidence | Next owner / disposition |
|---|---|---|---|---|
| S-AV21 | jigsaw9 Expert, seed base 20260101: exact 11 of 12 to **10 of 12** (R7 hit loss). Request 0: exact (929, 0.57 s, 2 attempts, 204 full ratings) to shallow (709, 2.62 s, 8 attempts, 1,728 full ratings, target 935.9); request 6 shallow in both (718). Cell generation 7.98 to 10.30 s, helper 10.42 to 14.98 s; the soak gate stays PASS at 83% (80% line) | an exact result for every request (a shallow fallback is a miss at final qualification) | `evidence/MS06d/jigsaw9-expert.json` | MS07e; MS18c (final qualification decides the offer); open |
| S-AV22 | Request-level exact churn: three losses (classic9 Nightmare 1, exact 2375 in 2.90 s and 5 attempts to shallow 2113 in 4.17 s and 8; diagonalX Nightmare 6, exact 2306 in 2.39 s and 2 attempts to shallow 1947 in 11.75 s and 8; jigsaw9 Expert 0, above) against four gains (classic9 Normal 11, classic9 Nightmare 2 and 11, diagonalX Nightmare 2): net +1 exact over 204, all within the 76 requests whose puzzle changed | an exact result for every request | the four ledgers | MS07e, MS18c; open, informational at 12-request samples |
| S-AV23 | jigsaw9 cost: Nightmare generation 5.94 to 9.08 s (+3.14 s, 1.53x), p95 1.72 to 3.44 s against 5,000 ms (ok), full ratings 1,062 to 2,806 (2.6x), attempts 14 to 20, allowance-ended searches 0 to 5; Expert 7.98 to 10.30 s (+2.33 s, 1.29x), full ratings 5,615 to 6,902 (+23%), p95 2.58 to 2.62 s against 900 ms (`SLOW` both times). Nightmare is 12 of 12 exact; the Expert hit loss is S-AV21 | design 9.1 p95 targets (GP, 50 runs, is the gate) | `jigsaw9-nightmare.json`, `jigsaw9-expert.json` | MS07e proposal; MS18d (the actual GP verdict); open |

**Inherited, re-measured here** (this record's numbers added; the items themselves are unchanged):

| ID | This comparison |
|---|---|
| S-AV01 Greater-Than Normal CV6 (open, CV6-05 Q2(a)) | A 12-request stream, not a CV6 or final-qualification reading: 12 of 12 exact with identical puzzles, generation 34.35 to 34.65 s, upper median 1.96 to 1.99 s, p95 7.71 to 7.49 s against 700 ms. The three fixed endings still govern |
| S-AV05 Killer Hard (0 of 12 exact) | 0 of 12 again, 12 shallow, 58.64 to 58.64 s; full ratings 6,160 to 7,525 (+22%), shallow ratings 3,883 to 5,357, local ratings 5,008 to 6,373 at unchanged time; 9 of 12 puzzles identical |
| S-AV06 Killer Expert (0 of 12 exact) | 0 of 12 again, 12 shallow, 120.21 to 121.20 s, slowest request 15.79 s in both; 12 of 12 puzzles identical |
| S-AV07 classic9 Nightmare (2 of 12 exact) | **3 of 12** (requests 2 and 11 gained, request 1 lost), 9 shallow, 86 attempts, 21 allowance hits; 54.12 to 49.72 s |
| S-AV08 standing quick cost (690.7 s at MS06c2) | Not measured here (no quick suite was run; the orchestrator verifies the unchanged baseline). The 204 requests do not reproduce a rise: total generation 454.62 to 454.42 s, classic9 Normal / Hard / Expert / Master 0.98x / 1.03x / 1.00x / 0.98x; the +15 to +21% of the quick `pipeline` tests and +40% of `mega` (MS06c2 evidence) are on other requests (the tests' own seeds, classic9 Easy, mega boards) that this manifest does not contain |
| S-AV14 classic9 Normal aggregate hit rate | This cell 11 of 12 (92%): the soak gate line goes FAIL to PASS (90% line); request 9 still shallow (220, 0.92 s, 8 attempts), request 11 now exact (245) |
| S-AV18 Greater-Than Expert off-band misses | Unchanged: 10 of 12 exact, requests 2 and 5 off-band in Master (1013 and 1046), identical puzzles, 14.12 to 14.87 s and 14.34 to 15.23 s (+5% and +6%, the run-to-run floor of identical puzzles) |
| S-AV19 design 9.1 p95 flags | 9 of 17 cells before and 9 after, the same cells. After (p95 against target): classic9 normal 921 ms against 150; classic9 nightmare 5,382 against 2,500; killer normal 1,070 against 700; killer hard 6,047 against 1,800; killer expert 15,793 against 10,000; jigsaw9 expert 2,621 against 900; greaterThan normal 7,492 against 700; greaterThan expert 15,228 against 10,000; diagonalX nightmare 11,752 against 3,000. The other 8 pass (jigsaw9 Nightmare 3,436 ms against 5,000, from 1,719). Informational at 12 samples; GP decides |
| S-AV20 shallow results without an inherited item | jigsaw9 Expert 1 to 2 of 12 shallow (requests 0 and 6); diagonalX Nightmare 2 to 2 (requests 2 gained, 6 lost: now 5 and 6, 11.58 s and 11.75 s) |

**Carried unchanged** (not measured by this manifest): S-AV02 mega12 Nightmare, S-AV03 mega16 Nightmare, S-AV04 samurai
Nightmare/G13, S-AV09 Killer Master/Nightmare I5, S-AV10 Wordoku I5, S-AV11 the 325.3 s jigsaw9 Expert I5 request (MS18d profiles
it), S-AV12 sohei/butterfly/flower Nightmare, S-AV13 butterfly/flower Easy, S-AV15 the unrun GD confusion matrix and
MS05r6a-COV01 for MS18e; S-AV16 and S-AV17 stay **withdrawn** as current-source items. SA1's IR51 notes (no quick test reaches the
64-rating refinement cap; the manual suites have not run under the active policy, MS18e's `--all` is their first run) are for a
later test task and MS18e, not measured here; the plateau reading is in "Work, and the plateau effect".

## Deviations and process notes

- **This part is appended to the MS06a record**, as the MS06d task lists ("the MS06a target-scope record's after/comparison
  sections"). The before part is byte for byte as MS06a left it (the first 31,631 bytes, SHA-256 above); a diff of this file against
  HEAD is a pure addition. The ledgers and transcripts of `evidence/MS06a/` were not touched.
- No deviation from the commands: the 17 commands equal MS06a's apart from the output folder (`evidence/MS06d/`), run through the
  checklist wrapper with the same seed base, 12 requests per cell and routes. The sequencer `run-cells.ps1` runs them one locked
  command at a time, refuses to overwrite a ledger, checks HEAD and the tracked tree before each cell, and halts at the first anomaly
  (none occurred). Each transcript is the soak's output piped through the child `pwsh`, trailing blanks trimmed in the pipeline (not
  afterwards), between a START and an END line; the ledgers are byte for byte as the tool wrote them.
- The scratch scripts are in `evidence/MS06d/` (`run-cells.ps1`, `compare.cjs`) rather than under `generator/tests/artifacts/`, so
  that the tool's tracked-tree check (which excludes only `docs/difficulty-v3/evidence`) stayed clean: `dirty: false` in all 17 ledgers.
- The announcement to the orchestrator before starting was the dispatch itself; this task is non-interactive and sent no message
  during the run. No lock was held by anyone but the improve-generating job described above, which was not touched.
- No Git action was taken beyond read-only status, log and `diff --quiet` checks. No application, fixture, test, guide, task-pack or
  check-list file, and no Execution log, was edited.

## Files and immutability (after)

`docs/difficulty-v3/evidence/MS06d/`: for each of the 17 cells `<id>-<level>.json` (the ledger, schema 1, UTF-8, CRLF,
`complete: true`) and `<id>-<level>.txt` (the console transcript); `run-cells.ps1` (the sequencer), `compare.cjs` (the comparison
script: `node docs/difficulty-v3/evidence/MS06d/compare.cjs` rewrites `comparison-tables.md` from the two folders and checks it
against the tools' summaries) and `comparison-tables.md` (its output). SHA-256 of the after ledgers:

| Ledger | SHA-256 |
|---|---|
| classic9-normal.json | `ae4851fafc90ac9516afe0612d8ece33cb2585860a9a71d2f4bf91dd7d7f727f` |
| classic9-hard.json | `7b33bd5852ce6a3c3bacf6388e7c952be5660a51179a36fd42bf8817823bdfbd` |
| classic9-expert.json | `1097b09f932c3fb0d5398e3bdd13bd52d407d40cf1828cf1439b77da21817b00` |
| classic9-master.json | `c7d5a03d8205764fb8b8727a40ab66a6b644feed97f645e661dd549461c96eae` |
| classic9-nightmare.json | `4def26e5ba8f4fa8b03f4464807d14c1e8e026c67593243e9965037849f2028f` |
| classic9-hell1.json | `e83ffb2c03483a3c4f7d22f09211cf450bbb6c9d0ab2cd3f4f6085fdc29e71d0` |
| killer-normal.json | `b782c86a9624db6640b02fd648ddf60b5544fa363536ff8aa6784d82a02452ee` |
| killer-hard.json | `4ecf214545cf0d6b2d883232a5a7d7c1503c8ccaa7381370df0aadda93becee4` |
| killer-expert.json | `0a789a1f135b623f73cc8ee429ba40d17d7b8819e5db98dd54d4c45bd85e9a81` |
| jigsaw9-normal.json | `cba0726f190d078fdf6681d3eb7aea70f33ef13e72f1d0ff96270736f8055aa1` |
| jigsaw9-hard.json | `3dba87a75ab11074953bd10cc3b25ad83c9bbcccf2259046e7e9ab6815c9ecb1` |
| jigsaw9-expert.json | `520e681d9f3292199e779365a7f033d28243d5694f3da6e8fe1407822ef300a1` |
| jigsaw9-nightmare.json | `58534bd75502725041fd61bb06a91a7e39bbbb2f69579b2be1064fa80ef275d2` |
| greaterThan-normal.json | `49cc0943b96b2bf4b2c5eba6d27fdec94da9a60576d02dfdcecf8b679d50f32b` |
| greaterThan-hard.json | `cc086df41831ed757394dffad9bfea583c8adc0d1d54e814e79f1f36d78b69f9` |
| greaterThan-expert.json | `c6cda0027ecfea55bd29fb756a9ea4a21fb9db0987b6170922b635695de3d4f9` |
| diagonalX-nightmare.json | `5d36ff914d1ec8a8df12d478918f35242bbad0fd42cbfcb95c3480dda79f77c0` |

MS07 and MS18 read this part and `evidence/MS06d/` as the immutable isolated comparison: the policy's effect on these 17 cells at
the source above. A later source change is a separately labelled replacement, never an edit of this record.
