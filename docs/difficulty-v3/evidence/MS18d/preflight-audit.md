# MS18d Phase A: file-only preflight and protocol audit

Developer agent (claude-sonnet-5.5), 2026-11-19, times +07:00, Phase A started 10:40:57. Branch `rating-v3`, HEAD
`a13d3414` (clean tree; `gp-preflight.json` records it). **Phase A only: no sampling, no generation, no pilot, no GP,
no S-AV11 profile, no GG generation; no source, target, offer, old record or global setting was changed; nothing under
`tasks\`; no Git write.** Every Node command of this phase (tests, preflight, comparison, identities, format and
freeze) ran through `Invoke-Dv3Node` (shared slot, 450/540) by `run-locked.ps1`, transcripts in `transcripts\`, the
asked/finished times, node seconds and exit codes of every call in `lock-log.jsonl`, with the one disclosed exception
of section 12.

## 1. Bound identities

| Identity | Value | Equal to the brief / MS18c closure |
|---|---|---|
| `merge\qualification-v3.json` SHA-256 | `b8e546fc0ba5bd1f79f408984bf3bf8f82559305ea6bd63cbe6dc53beff0df04` | yes |
| `perf.js`, `perf-helper.js` (before target updates), `tool-records.js` SHA-256 | `7395472b...f9a60`, `d64f8b3c...b1724`, `eec5e268...7c6` | yes, all three |
| GQ measured sources (never retagged) | `0ca29eaeebc295b6` (commit `ed2fe50c`, dirty), jobs 4, guard 120000 ms, seed base 20260601, rating 3 | yes |
| Publication sources of the tree now | `75b0955e3e356bd1` (qualify.js recipe, 46 engine files) | yes; support-only proof `closure\final\publication-check-final-2.txt` (SHA-256 `a7c02e1d...49ce5`, names `75b0955e3e356bd1`, ends `OK: no problem`) |
| Qualifier tool hash (qualify.js plus qualification-records.js) | `c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77` | equal to the record and to the MS07e checkpoint |
| Generator / Player quick fingerprints | `fc31c9db...9ac2` / `4c21573f...d25a` (manual trees `13cd63bf...ef3f`) | yes (MS18c `identities-now.cjs`, run unchanged) |
| E replay identity / E hash identity | `1cf64919...0fcc` / `1032ab2f...58a0` | yes (both recomputed by `project-gp.js` and by `identities-now.cjs`) |
| Node / machine | v26.13.0; AMD EPYC 7763 64-Core Processor, 16 logical, 64 GB, win32 10.0.26300 | the same Node and machine class as GQ (GP will be jobs 1) |

GQ was measured at `0ca29eae...` and the tree now is `75b0955e...`: different identities by construction (support
arrays only: 8 files, 13 lists changed; the documented publication proof). They are not interchangeable and nothing
here retags GQ.

## 2. Population

79 published cells (`difficultySupport`, matrix order) and 56 hidden ones; the registry support equals the record's
`support`, every published key has an `offered` record with 40 requests (0 errors), every one has a positive
`PERF_TARGETS` entry and every hidden position is null. `cells()` of the helper returns the same 79 keys. Variants:
classic4 1, classic6 2, classic9 7, mega12 8, mega16 6, diagonalX 6, hyper 6, jigsaw9 6, killer 3, greaterThan 5,
samurai 5, sohei 6, butterfly 7, flower 5, wordoku 6. The intended GP matrix is 79 cells x 50 = 3,950 requests; a
complete pass needs all 79 complete and at least **72** successes (integer rule; 71 of 79 is 89.87 % and the stock
line would print `90 %`).

The MS13c 50-cell record (S-AV38: 21 complete 50-run records, 16 pilot-only, 13 unmeasured; accepted `9d58d86`,
different sources) and the MS15b 37-cell record (S-AV39/MS15b-GP-J/U: classic9/nightmare the only complete 50-run
record, jigsaw9/nightmare pilot-only, 35 unmeasured; `8b26e83`) are old-source partial histories. They are not in
this 79-cell denominator, not merged, not used as a planning basis and not compared here.

S-AV01: Greater-Than Normal is **not offered** (40/40 hits, p95 10,192.4051 ms above 10,000): it is not one of the 79
keys and no Normal run, budget or contract step exists. S-OD7: Killer Hard (0/14) and Expert (2/12) are hidden and
absent; killer offers veryEasy, easy and normal only (3 cells). S-AV16/S-AV17 are withdrawn; S-AV27 is closed.

## 3. The 79-row table and the 17 target proposals

The complete table (n, mean, p50, p95 = q, max, alert, old target, predecessor, unclamped `ceil(3q)`, budget,
proposed or kept) is in `gp-preflight.json` (`projections`, `targetProposal.rows`) and printed in
`transcripts\final-project-gp.txt`. Rule (the brief's, applied with integer arithmetic on the four-decimal times):
keep `t` when `q <= t`; else `min(b, max(predecessor, ceil(3q)))`, the predecessor being the selected target of the
previous published level of the variant (0 if none); no cascade into kept cells. Result: **62 kept, 17 changed, no
anomaly (no proposal below its old target), identical to the brief's 17 rows.**

| Cell | q (ms) | old | predecessor | `ceil(3q)` | budget | proposed | decided by |
|---|---:|---:|---:|---:|---:|---:|---|
| classic4/veryEasy | 10.1122 | 10 | 0 | 31 | 2000 | **31** | ceil(3q) |
| classic6/veryEasy | 12.9032 | 10 | 0 | 39 | 2000 | **39** | ceil(3q) |
| classic9/easy | 780.3884 | 150 | 60 | 2342 | 10000 | **2342** | ceil(3q) |
| classic9/normal | 875.5958 | 150 | 2342 | 2627 | 10000 | **2627** | ceil(3q) |
| classic9/expert | 440.7861 | 400 | 400 | 1323 | 10000 | **1323** | ceil(3q) |
| classic9/nightmare | 2792.0346 | 2500 | 900 | 8377 | 10000 | **8377** | ceil(3q) |
| mega12/nightmare | 6280.4697 | 3000 | 3000 | 18842 | 30000 | **18842** | ceil(3q) |
| mega16/hell2 | 25239.0671 | 10000 | 10000 | 75718 | 30000 | **30000** | budget cap |
| diagonalX/nightmare | 5368.3201 | 3000 | 1200 | 16105 | 10000 | **10000** | budget cap |
| hyper/normal | 524.3035 | 200 | 80 | 1573 | 10000 | **1573** | ceil(3q) |
| hyper/nightmare | 8503.0273 | 3000 | 1200 | 25510 | 10000 | **10000** | budget cap |
| jigsaw9/easy | 634.7225 | 350 | 150 | 1905 | 10000 | **1905** | ceil(3q) |
| jigsaw9/hell2 | 6102.2380 | 5000 | 2000 | 18307 | 10000 | **10000** | budget cap |
| killer/normal | 1808.2659 | 700 | 700 | 5425 | 10000 | **5425** | ceil(3q) |
| sohei/hell2 | 27155.5581 | 20000 | 20000 | 81467 | 30000 | **30000** | budget cap |
| butterfly/nightmare | 16120.4641 | 8000 | 8000 | 48362 | 30000 | **30000** | budget cap |
| wordoku/easy | 973.6330 | 250 | 100 | 2921 | 10000 | **2921** | ceil(3q) |

No predecessor floor decided any row. Informational only (not a rule input, no action): eight kept cells sit within
15 % of their target on the GQ p95 and GP uses a strict `p95 < target` on a different protocol: hyper/hell2 q/t 0.968,
diagonalX/hell2 0.962, diagonalX/normal 0.950, classic6/hard 0.918, greaterThan/hell2 0.883, wordoku/nightmare 0.882,
jigsaw9/master 0.871, mega12/expert 0.864. Targets are never adjusted after seeing GP.

## 4. FS23 alerts and per-cell admission bases

`50 * mean(requests.ms) / 1000` over all 40 requests of every published cell (arithmetic mean, exact decimal
arithmetic): sum **3,803.9658065 s**, a scheduling alert, not a bound or forecast (GQ was trace off, jobs 4,
guard 120 s, other seeds). Only **sohei/hell2** is above 450 s: n 40, mean 9,711.9411975 ms, **485.597059875 s**, before
setup, readiness and variance (named item `MS18d-GP-BOUND-sohei-hell2`; it stays in the 79 as unmeasured, no shorter
cohort, watchdog, pilot or longer deadline). The next alerts: butterfly/nightmare 303.421639375, mega12/hell2
238.706340625, butterfly/hell2 224.98218125, greaterThan/hell2 224.924644, mega16/hell2 205.9701415, samurai/master
205.780898125 s. Distribution of the 79 mean alerts: 37 at most 10 s, 25 in (10, 60], 8 in (60, 150], 7 in (150, 300],
1 in (300, 450], 1 above 450. Descriptive `50 * observed GQ maximum`: 13 cells above 450 s (samurai/master 3,339.5,
mega16/hell2 2,152.4, sohei/hell2 2,082.6, butterfly/nightmare 1,062.1, greaterThan/hell2 971.3, butterfly/hell2
713.0, flower/hell2 696.8, sohei/expert 692.6, mega12/hell2 576.3, hyper/nightmare 563.6, jigsaw9/hell2 495.2,
samurai/expert 452.4, sohei/normal 451.1 s); 66 cells at most 450 s. These maxima are not future bounds.

**Admission status of every cell: unadmitted, approval none, basis unknown, margin unknown.** For the 78 cells below
the alert limit there is no source-qualified whole-command planning basis in the pack and none was invented
(`admission.status` `unadmitted-no-reviewed-basis`; sohei/hell2 `flagged-mean-alert`). The only data per cell are the
two descriptive numbers above (mean alert and 50 x observed GQ maximum); each cell still needs the
orchestrator-reviewed whole-command plan with startup, readiness and variance margin inside 450 s and the 540 s
ceiling, and Q1. The helper emits no approval.

## 5. Stock CLI audit (`generator\tests\perf.js` at the accepted hash)

- Do not `require` it: its last line is `process.exitCode = main()`. The preflight loads declarations only through
  `replay-fixtures.loadFixtures` (47 files: 46 engine files and `perf-helper.js`; never `perf.js`, UI or worker
  files), and the test installs traps on `SG.pipeline` and `SG.digger` before any engine file runs: 0 calls.
- Timing mode options: `--variant`, `--level` (filters of `cells()`, which is published support intersected with
  `PERF_TARGETS`), `--runs`, `--warmup`, `--seed`, `--gate`, `--ascii`, `--quick`. No `--json`, `--from`, resume,
  ledger merge or `--jobs`; a hash selector together with a timing option is refused (exit 2). Jobs 1 is inherent
  (one synchronous loop).
  The unchanged GP command per cell is `--variant=<v> --level=<l> --runs=50 --warmup=0 --seed=7000 --gate --ascii`.
- `measure()` runs `SG.pipeline.run({ variantId, difficulty, seed: 7000 + i * 101, trace: 'summary' }, sink)` serially,
  no caller budget (the pipeline keeps `budget || null`), warmup 0 (the cold start and the first-request JIT are part
  of the cohort). The engine's own work caps and size-default attempts (classic/diagonalX/hyper/jigsaw9/killer/
  greaterThan/wordoku 8, mega12 and butterfly 4, mega16/samurai/sohei/flower 2) remain; there is no per-request
  timeout and GQ's 120,000 ms guard and structural ceiling are not imported.
- Output: a header (Node, CPU, `50 runs per cell`, `trace summary, seed 7000`), one row printed **after** the cell
  completes with **rounded** target, p50, p95, max, mean (`>= 100` 0 decimals, `>= 10` 1, else 2) and `ok`/`MISS`,
  then `N of M cells meet their p95 target (X %, acceptance ...)` (`X` is `(share * 100).toFixed(0)`) and a `Misses:`
  list. The `ok`/`MISS` decision is the unrounded `p95 < target`; the table cannot reproduce it from rounded text.
  Raw per-request times and per-request `stats` exist only in memory and are never persisted: no zeros or fake
  precision may be recorded. p95 over 50 is nearest-rank 48, the third slowest request (over 40 GQ requests it is
  also the third slowest).
- Exit code: with `--gate`, 1 when `met / cells < 0.9` (one cell: 0 of 1 gives 1, 1 of 1 gives 0), otherwise 0
  (a MISS exits 0 without `--gate`). A thrown generation error is not caught (`measure` has no recorder): Node ends
  with its uncaught-exception exit code 1 and a stack on stderr, indistinguishable from a MISS by the code alone.
  **Complete = header, row and the terminal `1 of 1` or `0 of 1` line.** Exit 1 with them is a performance miss;
  exit 1 without them, a timeout or a kill is incomplete, never a slow-cell verdict.
- The loading of the same files costs well under a second here (the file-only commands of this phase 0.19-0.72 s), a
  small, separately reportable share of the command.
- A wrapper for Phase C must append the transcript as output arrives. `tee-run.js` (this task's copy of MS18c's)
  writes the file only when its child closes: if the 540 s kill ends the tree first, the partial output is lost.
  `run-locked.ps1` of this task also clears `LASTEXITCODE` before the call (the verbatim helper sets it only after
  the process ends, so a timeout would otherwise log a stale code); the verbatim helper is unchanged.

## 6. Clocks

- GP request time: `performance.now()` (monotonic, sub-millisecond) in `perf-helper.js nowMs`, around
  `SG.pipeline.run` only; sink drops all events; loading, row printing and the wrapper are outside it. The pipeline's
  own event and step times use `performance.now()` too.
- GQ request time: `process.hrtime.bigint()` around `SG.pipeline.run` in a worker with `trace: 'off'`, a
  `SG.budget.create({ ms: 120000 })` guard, every level offered in the worker, up to 4 workers (host-active policy).
  GQ and GP clocks are both monotonic but their protocols differ; no time normalisation or subtraction follows.
- Whole-command clocks are wall clocks and separate: the helper's `seconds=` (PowerShell `Get-Date` around the
  process), `WaitForExit(540000)`, `tee-run.js` (`Date.now()`), and the lock log's `Get-Date` stamps. Lock waits,
  readiness and generation are recorded separately and never added to a request time.

## 7. Deadline chain (shared helper, unchanged)

1. Slot: wait until `dv3-timing.lock` and `dv3-sudoku.lock` are absent (5 s poll, up to 20 minutes, then `No timing
   slot`, nothing started); take `dv3-sudoku.lock` exclusively, recheck the other lock (`Timing-slot race`).
2. Gap: at least 15 s between this task's lock releases and the next acquisition (task wrapper; the helper does not
   enforce it).
3. Phase C readiness (task wrapper, inside the node command, so inside 540 s): each PowerShell/CIM query at most 15 s,
   readiness at most 45 s, five one-second intervals; a timeout is an unstarted hold.
4. Admission (policy): whole command including setup, readiness and variance margin projected at most 450 s.
5. Process: `WaitForExit(540000)` from `Process.Start` of the `node` process (wrapper plus CLI); at expiry the helper
   throws `540-second limit reached`, its `finally` kills the process tree (a CIM snapshot of the children) and
   removes the lock. Status reads and waits do not reset it.
6. CLI: no deadline of its own (section 5); the 540 s kill is the only backstop.
7. Tool layer: the orchestrator's synchronous wait ends at its `initial_wait` while the command keeps running; use
   attached async with `read_powershell`. `stop_powershell` (or a lost session) kills the PowerShell tree before the
   helper's `finally` can run, so `dv3-sudoku.lock` (created `CreateNew`, removed only by that `finally`) stays
   behind: a stale lock or orphan is reported to the orchestrator, never deleted or guessed away.

## 8. MS18d-Q1

**Recorded as unanswered.** The pack at `a13d3414` holds the prepared question (A `MS18d-GP-host-active`, B
strict-quiet) and the owner-ready Vietnamese wording in the leaf and in the check-list, with no answer. No readiness
campaign, pilot or timed measurement was made to choose a policy. Phase C and S-AV11 stay held for the verbatim owner
answer, the frozen targets and the orchestrator's per-cell admission plans. Option A would not admit sohei/hell2.

## 9. S-AV11 (assigned diagnostic, not run)

Original tuple: `jigsaw9`, `expert`, seed **1111** = `700 + li * 100 + i` with `li = 4` (Expert in the nine-level
`LEVELS` of `manual\jigsaw.test.js`) and `i = 11` (request 12 of 20); `generatePuzzle` at line 804 builds
`{ variantId: 'jigsaw9', difficulty, seed, trace: 'off' }` with no variant option and no `maxAttempts` (size default
**8**, the 81-cell rule, confirmed in the preflight), calls `SG.pipeline.run(config, null)` with no budget inside
`SG.fixtures.toolRecords.withRequestedLevel` (it offers the hidden level for that call and restores the exact support
array in `finally`); `puzzleRun` is at lines 814-820. Historical observation: **325.313 s** (the others of the cell
7 ms-2.438 s, cell 341.78 s), MS05b3 evidence section on S-AV11, source tree `1ae831c` plus the uncommitted recovery
tree (engine `sourceHash` `fee8b8d6...025d0`), long before the MS18c sources. Stage and cause are **unknown**; it must
not be called a dig cost. Current-source basis: **none** (no measurement since; the GQ cell jigsaw9/expert is hidden
on time with 34 requests on other seeds, p95 13.69 s, max 14.71 s, which says nothing about seed 1111). Admission
basis: **explicit unknown**: 325.313 s on an older source is not a bound and it may not reproduce; a profile needs a
defensible plan inside 450 s including startup and stage recording and Q1. Unadmitted until reviewed.

## 10. MS18c-GQ-ENGINE-COST reconciliation (`gq-engine-cost.json`, file-only)

Old run: MS07e checkpoint, rating 2, engine sources `029720df77c6c12a` (commit `8b70875`, dirty), 129 shard files each
verified against the SHA-256 the checkpoint lists, 129 cells. New run: the merged final record, rating 3, sources
`0ca29eaeebc295b6`. Same qualifier tool hash, machine and Node, jobs 4. A pair is the same cell, request index and
seed; ratio = new ms / old ms; the median of an even count is the mean of the middle two.

| Pair-selection rule (all four reported, never merged) | Pairs | Cells | Median | mega16/expert | jigsaw9/expert | sohei/master | mega12/expert | diagonalX/expert |
|---|---:|---:|---:|---|---|---|---|---|
| strict: every field but `ms` equal (score included), old ms > 0 | **2,122** | 96 | **1.1240** | 29 / 6.5530 | 15 / 4.7940 | 5 / 4.3160 | 18 / 2.6429 | 8 / 2.2272 |
| same hit, achieved level and score | 2,122 | 96 | 1.1240 | identical to strict | | | | |
| same hit and achieved level | 4,090 | 128 | 1.3313 | 39 / 6.5530 | 28 / 5.3675 | 40 / 4.1631 | 40 / 2.7728 | 35 / 3.3674 |
| same cell, index and seed only | 4,185 | 129 | 1.3398 | 40 / 6.5544 | 34 / 5.8774 | 40 / 4.1631 | 40 / 2.7728 | 40 / 3.4194 |

SA2's strict comparator is **reproduced exactly**: 2,122 pairs, median 1.1240, cohorts 29/15/5/18/8 with medians
6.5530 / 4.7940 / 4.3160 / 2.6429 / 2.2272 (the cohort id lists and digests are in the JSON). SA1's quoted figures
(about 1.13 overall; 6.6, 5.1, 4.3, 2.7, 2.1) are **not reproduced by any of the four rules**: they lie near the
strict values for the overall median, mega16/expert, sohei/master and mega12/expert but not for jigsaw9/expert (5.1
against 4.794 or 5.3675) or diagonalX/expert (2.1 against 2.2272 or 3.3674). SA1's exact filter is not in the pack, so
it stays an unreconciled quoted signal, kept separate; the strict check keeps only requests where the two engines
returned the same outcome and score, so requests with a different outcome or score are excluded by construction.
Also open in the same item, unchanged and not recomputed: mega16-replay 331.6 s against 118 s at MS07f (a different
clock, source and case, above its 300 s projection, inside 450) and the 17 cells above their targets (section 3). No
normalisation, tuning, budget relaxation or new GQ follows.

IR17 (classic9/nightmare stays offered; 430.5 s GD and 449 s are not bounds): carried; GQ mean alert 54.4 s for the
GP cell, no GD assignment here.

## 11. Files and commands

Helpers (`generator\tests\artifacts\difficulty-v3\MS18d\`): `project-gp.js`, `cost-compare.js`, `test-preflight.js`
(29 cases: synthetic 40/100-request inputs, every invalid/missing/duplicate case, nonfinite/negative ms, the 10,000 ms
mean, the exact 450 s boundary and the float path, unflagged-but-unadmitted, keep/equality/update, predecessor
floor/cap, hidden-null exclusion, no cascade, fake loader and trapped real load, exit codes, CRLF, determinism,
the real record), `check-format.js`, `run-locked.ps1`, `tee-run.js`. The MS18c folder was only read; `invoke-dv3node.ps1`
is dot-sourced unchanged and `identities-now.cjs` was run unchanged. Evidence (`docs\difficulty-v3\evidence\MS18d\`):
`gp-preflight.json`, `gq-engine-cost.json`, this file, `transcripts\`, `lock-log.jsonl`, `format-check.txt`,
`helpers-sha256.txt`, `outputs-sha256.txt`. `outputs-sha256.txt` covers every evidence file except itself,
`lock-log.jsonl` (append-only, records the freeze commands) and the `freeze-*` transcripts.

## 12. Disclosures

1. **One unlocked Node call.** At 10:40:57, as the first command of the session and before the locked wrapper existed,
   `node --version` was run directly (sub-second, no file read, printed `v26.13.0`). It is the one top-level Node
   command outside `Invoke-Dv3Node`; the Node version is bound again by the locked runs (`inputs.node`).
2. **Gap between my own lock acquisitions.** The first version of `run-locked.ps1` read the last release time through
   `ConvertFrom-Json`, which turns the ISO text into a `DateTime` and drops the milliseconds, so the sleep fell short:
   9 of the 13 gaps between my consecutive locked runs were 14.2-14.9 s (logged finish to logged ask) instead of at
   least 15 s; the other four were 19-260 s. No foreign lock was ever waited for (every wait was 0-0.1 s) and nothing
   else timed ran in the granted slot. The wrapper now parses the exact text; the freeze run used the corrected
   version.
3. **`run-locked.ps1` changed after the first runs** (clears `LASTEXITCODE` before the call; exact release time). The
   verbatim shared helper and the MS18c folder were not touched.
4. **Superseded transcripts are kept**, named by their step: `test-preflight-1.txt` (one synthetic case of mine was
   wrong: slicing 40 requests to 53 left 40), `test-preflight-2.txt`/`-3.txt` and `project-gp-1.txt`/`-2.txt` (before
   two cosmetic edits of the printed text of `project-gp.js`; the JSON is byte-identical in all runs, SHA-256
   `74FFD94D...69FC`),
   `cost-compare-1.txt` and `identities-now-1.txt` (identical results to the `final-*` runs), `format-probe-1.txt` and
   `format-check-run-2.txt` (the 110-character findings that were then fixed). The `final-*` files are the ones that
   belong to the frozen helpers.
5. **Numbers from read-only PowerShell queries, not from a helper:** the distribution buckets, the list of 13 cells with
   `50 x max` above 450 s, the eight kept cells near their target (section 3), the sums quoted in section 4, and the
   GQ statistics of jigsaw9/expert (34 requests) were read from `gp-preflight.json` and `qualification-v3.json` with
   `ConvertFrom-Json`. They are descriptive and reproducible from those frozen files; they are not outputs of
   `project-gp.js`.
6. The tests create and remove scratch folders `.scratch-ms18d-*` inside the repository (removed in `finally`; none
   remained); transcripts that were superseded were renamed with `Move-Item`. No file was written with PowerShell
   content commands; every file was created with the create/edit tools, or written by the helpers themselves.
