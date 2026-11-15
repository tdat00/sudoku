# Difficulty v3: first qualification checkpoint (MS07e), 2026-11-15

**Status: incomplete, by cost.** 129 of the 135 cells of checklist Q ran to a complete, protocol-valid record at jobs 4; six cells
were not launched because their projection under the S-AV27 rule exceeds 450 s. The merger therefore rejects the folder (one
problem: `missing 6 of 135 cells`), writes no merged record, and no complete-checkpoint claim is made. This is a checkpoint-only
record (R24): it publishes **no offer**, changes no support list and no live table, removes no level, and carries no verdict for
the six cells. Machine-readable record: [qualification-checkpoint-2026-11-15.json](qualification-checkpoint-2026-11-15.json)
(`complete: false`, `merged: false`); every number below is in the 129 shard files and the logs of
`docs/difficulty-v3/evidence/MS07e/` (`plan.md` has the plan and the projections, `progress-log.txt` every command).

## 1. Identity

| Item | Value |
|---|---|
| Source | HEAD `8b70875` (rating-v2 development version, short-chain cutoff C = 4, size-default attempts 8 / 4 / 2); tracked tree clean, only the evidence folder untracked (every shard says `dirty: true`, provenance only) |
| Engine sources (qualifier hash of 45 files) | `029720df77c6c12a`; the 63 sources of the recorder tools `09f91d6db3fa3373307fed4bf175e9d48ce6cf0c0b98eccec1386dda7cb35ed9` |
| Qualifier tool | `c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77` (`tests/qualify.js` + `tests/fixtures/qualification-records.js`) |
| Machine | AMD EPYC 7763, 16 logical processors, 64 GiB, Windows 10.0.26300, Node v26.13.0, test time factor 2; `--jobs=4` in every shard |
| Protocol | seed base 20260601, 40 requests, 30 to 35 hits expand to 100, offered at >= 36 of 40 or >= 90 of 100 with p95 within 2 / 10 / 30 s, guard 120000 ms, early stop on, no `--probe`, no explicit `maxAttempts`, nothing overridden |
| Validation | `node tests\qualify.js --merge=...\qualification --jobs=4`: **1 problem, `missing 6 of 135 cells`** (`merge-attempt.txt`). The merger collects every problem of every shard, so the 129 shards are otherwise valid: identity, requests, derived seeds, summaries, rounds, stops, jobs, machine |
| Requests | 4,311 requests, 3,794 hits (all exact), **0 errors, 0 invalid or non-unique puzzles, 0 unsolved**, 517 approximate results (all misses); the slowest request 50.2 s (killer hell1 #5) |
| `stats` | the qualifier records carry no `stats` (samples, attempts, `oracleCalls`): **unavailable, not zero**; a cell's `attempts` is the configured maximum for its board (8 / 4 / 2), not the attempts a request used |

## 2. The 135 cells

Cell text: hits / requests, `o` offered, `hm` hidden after the 11th miss, `ht` hidden after the 6th request over the budget, `h*` hidden by
the p95 with all 40 requests run, p95. `not run` = no record (section 4). Full rows (p50, max, budget, exact and shallow counts, projected and
measured seconds): `evidence/MS07e/gq-summary.md`.

| variant | veryEasy | easy | normal | hard | expert | master | nightmare | hell1 | hell2 |
|---|---|---|---|---|---|---|---|---|---|
| classic4 | 40/40 o 9ms | 0/14 hm 176ms | 0/14 hm 190ms | 0/14 hm 228ms | 0/14 hm 279ms | 0/14 hm 298ms | 0/14 hm 238ms | 0/14 hm 328ms | 0/14 hm 279ms |
| classic6 | 40/40 o 14ms | 0/14 hm 333ms | 0/14 hm 361ms | 39/40 o 328ms | 9/22 hm 434ms | 10/23 hm 618ms | 4/18 hm 880ms | 0/14 hm 828ms | 0/14 hm 869ms |
| classic9 | 40/40 o 21ms | 40/40 o 634ms | 36/40 o 704ms | 40/40 o 180ms | 40/40 o 246ms | 40/40 o 253ms | 40/40 o 260ms | 0/14 hm 8.1s | 1/15 hm 5.7s |
| mega12 | 40/40 o 27ms | 40/40 o 51ms | 40/40 o 64ms | 40/40 o 128ms | 40/40 o 1.1s | 40/40 o 274ms | 40/40 o 1.0s | not run | 40/40 o 4.8s |
| mega16 | 40/40 o 35ms | 40/40 o 49ms | 40/40 o 86ms | 40/40 o 389ms | 36/40 o 9.7s | 40/40 o 1.3s | not run | not run | 40/40 o 2.0s |
| diagonalX | 40/40 o 18ms | 28/40 hm 1.2s | 40/40 o 160ms | 40/40 o 50ms | 38/40 o 2.8s | 40/40 o 298ms | 40/40 o 1.2s | 0/9 ht 26s | 40/40 o 1.1s |
| hyper | 40/40 o 17ms | 29/40 hm 1.2s | 40/40 o 431ms | 40/40 o 62ms | 39/40 o 1.3s | 40/40 o 491ms | 40/40 o 705ms | 0/12 ht 13s | 40/40 o 2.0s |
| jigsaw9 | 40/40 o 57ms | 40/40 o 500ms | 40/40 o 373ms | 40/40 o 79ms | 38/40 o 2.3s | 40/40 o 232ms | 40/40 o 429ms | 0/12 ht 15s | 40/40 o 2.0s |
| killer | 40/40 o 25ms | 40/40 o 36ms | 38/40 o 1.8s | 0/14 hm 6.6s | 1/14 ht 18s | 5/13 ht 23s | 19/24 ht 25s | 0/9 ht 50s | 40/40 o 6.4s |
| greaterThan | 40/40 o 56ms | 40/40 o 80ms | 40/40 o 9.6s | 40/40 o 3.2s | not run | 40/40 h* 14s | 40/40 o 5.2s | not run | 40/40 o 4.5s |
| samurai | 40/40 o 41ms | 10/22 hm 992ms | 40/40 o 750ms | 40/40 o 418ms | 40/40 o 979ms | 40/40 o 1.7s | 40/40 o 7.6s | 0/14 hm 38s | 40/40 o 7.9s |
| sohei | 40/40 o 41ms | 4/18 hm 837ms | 39/40 o 1.5s | 40/40 o 388ms | 40/40 o 1.0s | 40/40 o 1.2s | 40/40 o 7.6s | 0/14 hm 33s | 40/40 o 3.6s |
| butterfly | 40/40 o 28ms | 1/15 hm 1.1s | 40/40 o 791ms | 40/40 o 197ms | 39/40 o 3.1s | 40/40 o 1.0s | 40/40 o 2.0s | not run | 40/40 o 5.5s |
| flower | 40/40 o 31ms | 0/14 hm 769ms | 40/40 o 812ms | 40/40 o 436ms | 23/35 hm 4.2s | 29/40 hm 1.6s | 40/40 o 5.9s | 0/14 hm 27s | 40/40 o 4.1s |
| wordoku | 40/40 o 19ms | 40/40 o 734ms | 35/46 hm 814ms | 40/40 o 202ms | 40/40 o 247ms | 40/40 o 222ms | 40/40 o 444ms | 0/14 hm 8.1s | 4/18 hm 6.8s |

Of the 129: **89 offered, 40 hidden** (17 of the hidden were hidden at v2 too: classic4 and classic6 above the tier, classic9 and Wordoku Hell 2).
Only one cell expanded to a second round (wordoku/normal: 33 of its first 40 hit, 46 requests in all, 35 hits, stopped after the 11th miss; the
60 second-round requests run on the one worker left, S-AV27).

## 3. Observed offers against the current offers (not applied)

The current lists (rating v2, `difficultySupport`) are unchanged by this task. Observed against them:

| | Cells |
|---|---|
| Observed **offered** where the current list does not offer | none |
| Observed **hidden** where the current list offers (23) | classic9 hell1; diagonalX easy, hell1; hyper easy, hell1; jigsaw9 hell1; killer hard, expert, master, nightmare, hell1; greaterThan master (40 of 40, p95 14.5 s over 10 s); samurai easy, hell1; sohei easy, hell1; butterfly easy; flower easy, expert, master, hell1; wordoku normal, hell1 |
| **No verdict** where the current list offers (6, cost) | mega12 hell1; mega16 nightmare, hell1; greaterThan expert, hell1; butterfly hell1 |
| Unchanged | the other 106 cells |

Hidden cells keep their level: "hidden" means not reliably generated under these settings, never impossible. Final offers are decided only
by MS18c (S-OD4 c1); nothing is pruned here (B02).

## 4. The six cells not launched (cost, S-AV27)

The rule (SA2 after MS07d): a possibly expanding cell is projected as the first round at four workers plus **60 serial request times**
(S-AV27), a start-up and a variance margin, no early stop assumed, and launched only at <= 450 s (the 540 s ceiling is unchanged). The
projections came from a pilot of each cell's own first requests (24 pilot files, `pilot/`; `plan.md` section 6.3 for the rule and the three
refinements made before any cell ran). Six cells exceed 450 s; none was cut, retried, run with other jobs or given a verdict:

| Cell | Pilot on this source | Projection | Rule's reason |
|---|---|---:|---|
| mega12/hell1 | 1 request, 36.5 s, 0 exact (approximate) | 556 s | the first round alone, 10 x 36.5 x 1.5 + 8 |
| mega16/nightmare | 4 requests, 4 exact, 4.8 to 26.5 s (mean 11.8 s) | 1,246 s | expansion not excluded (4 of 4 exact), 70 x 11.8 x 1.5 + 8 |
| mega16/hell1 | 1 request, **120 s guard exceeded** (`budget.exceeded`), 0 exact | 1,808 s | the guard alone, 10 x 120 x 1.5 + 8 |
| greaterThan/expert | 2 requests, 1 exact, 3.0 and 15.0 s | 919 s | expansion not excluded, 70 x 8.7 x 1.5 + 8 |
| greaterThan/hell1 | 3 requests, 37.6 to 40.1 s, 0 exact | 3,957 s | 70 x 37.6 x 1.5 + 8 |
| butterfly/hell1 | 3 requests, 38.3 to 39.5 s, 0 exact | 4,032 s | 70 x 38.3 x 1.5 + 8 |

**Cost of the rule, measured.** The 129 launched cells had projections summing to 11,645 s and took 1,523 s of process time (13 %): early stops
(11 misses, or 6 slow requests) end hidden cells after 9 to 35 requests, and 128 of 129 cells never entered a second round. Only one cell exceeded
its projection (greaterThan/master, 35.3 s against 27.5 s: a heavy tail its pilot of three fast requests did not show). The rule is
conservative by design (no early stop assumed); these six cells stay named items, and a different rule is not this task's to invent.

## 5. Findings

1. **Correctness: nothing blocks.** 4,311 requests, 0 invalid or non-unique puzzles, 0 errors, 0 worker losses; every hit is `exact`. The GD
   per-puzzle contracts (I1, I2/I3/I6, I5, I7, symmetry, technique set) pass in all 8 classic9 levels. The Nightmare availability failures of
   the recovery sources are not reproduced at C = 4 (below).
2. **Nightmare is now reachable.** At C = 4 every executed Nightmare cell on a board with real tiers is 40 of 40 and offered, except Killer
   (19/24, hidden on time): classic9 (p95 260 ms), mega12 (1.0 s),
   diagonalX, hyper, jigsaw9, samurai (7.6 s), sohei (7.6 s), butterfly, flower (5.9 s), wordoku, greaterThan (5.2 s); classic4 and classic6 stay
   hidden as at v2. The earlier records
   (mega12 0 of 7 at 23.5 to 25.2 s, samurai 0 of 2 shallow, classic9 21 of 100) describe sources that no longer exist (IR65) and are not comparable.
   mega16 Nightmare was not launched but its pilot is 4 of 4 exact (4.8 to 26.5 s), no longer the 80 to 117 s and 0 of 7 of the old records.
3. **Hell 1 is non-vacuous and has no exact hit anywhere.** 0 hits in all nine executed Hell 1 cells (classic9 0/14, diagonalX 0/9, hyper 0/12,
   jigsaw9 0/12, killer 0/9, samurai 0/14, sohei 0/14, flower 0/14, wordoku 0/14; 112 requests), every request in band and shallow (no `nishioDeep` proof), at
   8.1 to 50 s p95 against 10 / 30 s budgets, and 0 of 8 plus 0 of 20 in the classic9 GD pilot and batch; the four cells not run have pilots at
   0 of 1, 0 of 1, 0 of 3 and 0 of 3. A hidden Hell 1 is the expected outcome until S3 adds the missing proofs.
4. **Hell 2 is offered in 11 variants and hidden in classic4, classic6, classic9 and wordoku** (40 of 40 in the 11): its requiredness is vacuous (MS07b), so these hits say nothing
   about a proof.
5. **Easy is not safe on six variants** (new, S-AV28): diagonalX 28/40, hyper 29/40, samurai 10/22, sohei 4/18, butterfly 1/15, flower 0/14 (classic6 and
   classic4 above the tier are hidden as at v2). Most requests of these cells are in band but shallow.
6. **Killer Hard 0/14 and Expert 1/14 are checkpoint-hidden** (owner question, section 7); Master is 5/13 and Nightmare 19/24, both stopped on time
   (p95 22.8 s and 24.9 s against 10 s).
7. **Offered but near a limit:** classic9 normal 36/40 and mega16 expert 36/40 (exactly the threshold), greaterThan normal p95 9.63 s of 10 s
   (3.7 % margin), killer normal 38/40, wordoku normal hidden at 35/46.

## 6. GG and GD (this source, check-only and unchanged tests)

* **GG:** 104 shards of five keys, 520 keys exactly once, all from the current sources; `perf.js --hash-merge --check-hashes`: **all 520 puzzles
  unchanged** (0 changed). Recording 104 commands and the check, 312.8 s together; no `--update-hashes`.
* **GD, classic9 `difficulty` manual suite, 154 tests, once each:** 152 passed, **2 failed**, 0 skipped, 0 missing, 0 duplicated. Both failures are
  the unchanged aggregate hit-rate assertion (availability, not correctness): **Hell 1 0 of 20 exact (needs 18, S-AV25)** and **Normal 83 of 100
  (needs 90, S-AV14)**. Every per-puzzle contract passed in all eight levels. Nightmare (IR17): **17.3 s for the 100 requests, all assertions passed**
  (projection 33 s; the recovery run took 430.5 s), so the unchanged batch needed no cut; Hell 1 took 113.6 s (projected 248 s); the confusion matrix,
  never executed before (S-AV15), ran 191.7 s and passed.
* Existing selectors, extra to the GD manifest: Greater-Than **Nightmare CV6 passed** (the batch of ten took 24.1 s; its restored-source p95 was
  19,192 ms of 20,000 ms), Greater-Than **Normal CV6 failed** at p95 5,361.5 ms against 1,400 ms (S-AV01; seeds 300-319).

## 7. Decision requests and proposals (not applied)

**Q-MS07e-1, Killer weights.** Killer **Hard** is hidden at 0 of 14 requests (stopped at the 11th miss; all 14 in band, shallow; p95 6.6 s) and **Expert**
at 1 of 14 (stopped on time at p95 17.8 s; 13 shallow). R5 found 0 of 12 in each at every setting and S3 is not expected to repair this
weight problem (Killer's tier is cageSplit / fish and its band is often reached through `ruleOf45` work). Question for the owner: are
Killer weights recalibrated **inside v3**, or do Killer Hard and Expert stay hidden until a later calibration? No weight change or calibration
task is started here; live offers are unchanged and all six S3 groups continue.

**Q-MS07e-2, the six cells (optional).** The projection rule left six cells without a record while the 129 that ran cost 13 % of their projection.
Whether those six may be launched once under the unchanged 540 s ceiling on a rule amended by the plan author (for example crediting the
early stop) is a decision for SA2 and the orchestrator; this task changes neither the rule nor a ceiling.

**S-AV08, quick-set tier (proposal, nothing moved).** The Generator quick set is above five minutes (692.1 s on the final tree); section 9 names the
four generation-heavy tests that make up 392.1 s of it, their shards, per-test seconds, preserved requests and assertions, proposed manual owners
and the CI consequences. It changes the recorded quick contract, so it needs the orchestrator's decision request; no test, suite or CI file is touched.

## 8. Item reconciliation (S-OD4)

Numbers are this checkpoint's own unless a source is named; earlier numbers stay labelled history. Routes: MS18c (availability), MS18d
(cost), MS18e audits all.

| Item | Now | Route |
|---|---|---|
| S-AV01 GT Normal CV6 | **open**: CV6 Normal p95 **5,361.5 ms against 1,400 ms** (seeds 300-319; restored source 5,209 ms); GQ greaterThan/normal 40/40, p50 1.92 s, p95 9.63 s of 10 s. Nightmare CV6 passed. 700 ms base and offers unchanged; fixed endings of check-list section 2 apply | MS18c / MS18d |
| S-AV02 mega12 Nightmare | **40/40 offered**, p50 186 ms, p95 1.05 s (history: 0 of 7 at 23.5-25.2 s, source differs) | MS18c |
| S-AV03 mega16 Nightmare | not launched (1,246 s); pilot 4 of 4 exact, 4.8-26.5 s, mean 11.8 s (30 s budget; history 80-117 s, 0 of 7, old source) | MS18c / MS18d |
| S-AV04 samurai Nightmare | 40/40 offered, p50 1.83 s, p95 7.56 s (G13's single request not re-run) | MS18c |
| S-AV05 Killer Hard | 0/14 hidden (R5 0/12; MS05b3 0/20), p95 6.6 s: **Q-MS07e-1** | owner, MS18c |
| S-AV06 Killer Expert | 1/14 hidden on time, p95 17.8 s: **Q-MS07e-1** | owner, MS18c |
| S-AV07 classic9 Nightmare | 40/40 offered, p95 260 ms; GD Nightmare passes its 90 % assertion (history 21 of 100) | MS18c |
| S-AV08 standing quick cost | **692.1 s** on this final tree (679.4 s at MS07d, 684.3 s MS07c, 744.9 s MS07b; 648.0 s restored baseline); proposal in section 9 | MS18d |
| S-AV09 Killer Master / Nightmare | Master 5/13 (38 %), p95 22.8 s; Nightmare 19/24 (79 %), p95 24.9 s: both hidden on time | MS18c |
| S-AV10 Wordoku Normal / Nightmare | Normal 35/46 hidden (33/40 first round); Nightmare 40/40 offered | MS18c |
| S-AV11 a 325 s Jigsaw Expert request | jigsaw9/expert 38/40, max 2.63 s: not reproduced in these 40 seeds; stage and cause stay unassigned until MS18d's profile | MS18d |
| S-AV12 Sohei / Butterfly / Flower Nightmare | 40/40 each, offered (p95 7.6 s, 2.0 s, 5.9 s) | MS18c |
| S-AV13 Butterfly / Flower Easy | butterfly 1/15, flower 0/14 hidden; wider in S-AV28 | MS18c |
| S-AV14 classic9 Normal GD hit rate | GD **83 of 100** (r6b 86); GQ 36/40 offered at the threshold | MS18c |
| S-AV15 confusion matrix | **executed, passed, 191.7 s** (no longer outstanding) | MS18e audit |
| S-AV16, S-AV17 | withdrawn (CV6-05), history only | MS18e audit |
| S-AV18 GT Expert off-band misses | greaterThan/expert not launched (919 s; pilot 1 of 2 exact, 3.0 and 15.0 s); MS06a's 10/12 is history | MS18c |
| S-AV19 design 9.1 p95 flags | informational; GD median-time assertions pass in all 8 levels (Hell 1 median about 5.9 s of 10 s); no GP run here | MS18d |
| S-AV20 shallow results | jigsaw9 expert 2 of 40 shallow, diagonalX nightmare 0 of 40; 517 approximate in all | MS18c |
| S-AV21 jigsaw9 Expert exact loss | 38/40 exact on other seeds (not the same request) | MS18c |
| S-AV22 request-level exact losses | classic9 nightmare 40/40, diagonalX nightmare 40/40, jigsaw9 expert 38/40 (different seeds from MS06d) | MS18c |
| S-AV23 jigsaw9 cost under the target | jigsaw9/nightmare p50 210 ms, p95 429 ms; expert p95 2.29 s (no ratio re-measured) | MS18c / MS18d |
| S-AV24 mega Hell 1 request time | pilots: mega12 36.5 s; mega16 **120 s guard exceeded**; not launched (history 29.3-123.3 s at C = 6) | MS18c / MS18d |
| S-AV25 Hell 1 exactness | **0 hits in every executed Hell 1 cell** (9 cells, 112 requests); GD Hell 1 0 of 20 (needs 18); pilots 0/8 elsewhere | MS18c |
| S-AV26 classic9 Hell 1 cost | GD 113.6 s for 20 (about 5.7 s per request), pilots 5.9 s and 6.8 s against the 2.5 s design budget; GQ p95 8.07 s | MS18d |
| S-AV27 second round on one worker | one cell expanded (wordoku/normal, 6 requests, 6.8 s); six cells above 450 s by the rule; actual cost 13 % of projection; p95 of an expanded cell mixes concurrency (timing caveat to MS18d/MS18e) | MS18c, MS18d |
| **S-AV28 Easy availability (new)** | diagonalX 28/40, hyper 29/40, samurai 10/22, sohei 4/18, butterfly 1/15, flower 0/14: current offers lose Easy; 40/40 elsewhere | MS18c |
| **S-AV29 Greater-Than Master time (new)** | 40/40 hits but p95 14.5 s over 10 s: hidden by time (heavy tail; the cell took 35.3 s against a 27.5 s projection) | MS18c / MS18d |
| **S-AV30 mid-level shortfalls (new)** | flower expert 23/35, flower master 29/40, wordoku normal 35/46, classic9 normal and mega16 expert 36/40 at the threshold | MS18c |

MS05r6a-COV01 (reveal-fold specimen) is carried unchanged to MS18e.

## 9. Quick sets, CI check and the quick-tier proposal (S-AV08)

**Final tree (after the last evidence file; no engine, tool, suite or CI file changed in this task).** One locked compound per CI group, results in
`evidence/MS07e/quick/`; every result file is `complete: true`, `sourceStable: true`, 0 failed, 0 skipped.

| Set | Tests | Process seconds | Fingerprint |
|---|---:|---:|---|
| Generator: shared-small (core-shared 1,210, steps 57, replay 154, mega 108) | 1,529 | 71.95 | `f7563e283712…` |
| Generator: own-suites (own-fast 1,678, digger-target 75) | 1,753 | 171.64 | same |
| Generator: pipeline | 154 | 312.71 | same |
| Generator: replay-player (the Generator's `player` suite) | 69 | 135.76 | same |
| **Generator total** | **3,505 of 3,505 passed** | **692.1** (12.7 s above MS07d's 679.4 s: run-to-run noise, no suite changed) | one fingerprint for all eight shards, the one of MS07d |
| **Player** (`node tests\node-runner.js`) | **1,750 of 1,750 passed** | 33.5 | `36e9bd60c9bc…`, the one of MS07d |

`bash .github/scripts/generator-suites.sh check` (Git bash): **exit 0**, "every quick test is in exactly one shard (3505 of 3505)". Both fingerprints equal MS07d's: the tree is
the accepted one.

**The proposal (nothing is moved, no test, suite or CI file is edited).** Four generation-heavy quick tests are 392.1 s of the 692.1 s; without them the Generator quick set is about
300 s:

| Test (current shard) | Seconds, final run | What it does and what a move preserves |
|---|---:|---|
| `pipeline > instrumented generators: what the events cost > generating puzzles: verbosity 'off' costs less than 2%` (shard `pipeline`) | 94.0 | best-of-6 interleaved timing of 24 classic9 Easy and 2 Normal generations (seeds 1-24, 1-2) with and without an emitter, up to 5 attempts; limit 1.02, timeout 120000 |
| `... verbosity 'summary' costs less than 10%` (`pipeline`) | 93.2 | the same workload, limit 1.10, 4 attempts |
| `... verbosity 'full' costs less than 35%` (`pipeline`) | 93.5 | the same workload, limit 1.35, 4 attempts |
| `player > player: the replay steps of a result > real top-level results with clues shown again replay faithfully (mega16, classic9)` (`player`) | 111.4 | three real `SG.pipeline.run` results (mega16 nightmare seed 478576959, mega16 hell1 seed 2422420669, classic9 hell1 seed 3) replayed step by step; `expectFaithful` and the final-values checks, timeout 60000 |

* **Preserved:** every request, seed, limit, attempt count and assertion, byte for byte in a new `describe`; nothing weakened. The structural event tests stay quick ("verbosity
  'off' builds no event in the loops", "'summary' builds metric events only", the digging and full-grid cost tests, the contract tests of every mode).
* **Proposed manual owners:** the three cost-ratio tests join `generator/tests/manual/perf.test.js` (the timing tier, its header already says "performance"); the replay test is split:
  the classic9 Hell 1 request (about 6 s) stays quick, and the two mega16 requests move to `generator/tests/manual/variants.test.js` (the large-board manual suite).
* **CI consequences:** `generator-quick.json`: shard `pipeline` 154 to 151 tests and about 312 to 32 s, shard `player` 69 to 69 tests (the split keeps the case count) and about 136 to 25 s;
  the two groups' projections fall by 280 and 90 s; the Generator quick set falls to about 300 s. The manual tier is not run by CI, so the three timing ratios and the two mega16 replays would no longer
  gate a pull request: a recorded loss of CI coverage that the owner must accept (their replacements in CI are the structural tests above and the replay goldens G01-G14, which include
  samurai Nightmare (G13) and mega16 Hell 2 (G14) but not mega16 Nightmare or Hell 1). Both guides' testing paragraphs and `recovery-quick-cost.md` would state the new standing cost. A further candidate if "about five minutes" is to be met with margin:
  `difficulty-floor` "equals the reference on small generated samples" (16.5 s, `own-fast`).
* **Decision needed:** this changes the recorded quick contract (S-AV08, FS30), so it is a decision request for the orchestrator, not an automatic move.

## 10. Commands, seconds and waits

289 commands ran (26 GD, 105 GG including the check, 24 pilots, 129 GQ cells, 5 quick; plus six items recorded UNEXECUTED and the registration-only listings), **0 timeouts at the 540 s ceiling, 0 failed
commands** (the only nonzero exits are the three expected GD availability failures: classic9 Hell 1 and Normal, Greater-Than Normal CV6); 4,414 s of process time. They ran in 30 locked
invocations: 10 single-item runs of the first driver and **20 IR12 compounds** (a disclosed departure from the brief's "one command per lock", accepted by the orchestrator: the single-item driver waited 290 s for a
0.9 s command behind pentomino's 590 s commands). **Lock waits: 4,054 s in all, the longest 561 s, none over 20 minutes**; a compound that halted at a preflight waited a further 275.6 s and one waiting item
was stopped after about 4 minutes (neither is in the total). Per-compound lines: `evidence/MS07e/commands.md`, `progress-log.txt`, `run-log.jsonl`.

## 11. Acceptance

| ID | Result | Evidence |
|---|---|---|
| MS07e-B01 | met | sections 3 to 8: honest outcomes (89 offered, 40 hidden, 6 cost-bounded) and every inherited and new item with numbers and a route |
| MS07e-B02 | met | no offer, list or table changed; observed offers are reported, not applied (section 3) |
| MS07e-T01 | met as written | all 135 cells accounted for at jobs 4: 129 protocol-valid records (the merger finds only the 6 missing) and 6 named cost items; no incomplete record merged, none invented |
| MS07e-T02 | met | 520 of 520 keys exactly once, all unchanged; classic9 GD 154 of 154 covered (152 passed, 2 named availability failures); 0 soundness or API failures |
| MS07e-T03 | met | live offers and table untouched; both quick sets complete and green; CI check exit 0 |
| MS07e-T04 | met | Killer Hard and Expert reported (Q-MS07e-1), quick cost and tier proposal (section 9), all items routed |

