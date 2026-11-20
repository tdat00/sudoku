# CV6 guided sign dig: diagnosis, repair and measured effect (MS05e), set aside

| Field | Value |
|---|---|
| Task | MS05e, guided sign dig for Greater-Than (CV6-01 / S-OD1; S-OD4 for the timing outcome) |
| Date | 2026-11-14 |
| Outcome | **Measured, set aside** (CV6-05, the plan author's Q1(b), under S-OD6). MS05e closes as "set aside", not as an accepted repair. The source is the restored first-allowed sign pass; the candidate is kept as `evidence/MS05e/candidate-pool-4.patch` |
| Starting source | `rating-v3` at `f7be90f`, working tree clean, the label every before-measurement file records (`f7be90f` is the pack-notes commit on top of the runtime baseline `00647f9` and carries no source; it was committed at 05:35:55 UTC, five seconds before the first counted run, and the smoke run at 05:34:52 preceded it); `greater-than.js` `24dbbe37…`, all engine sources `a073f9bd…`. This is also the restored source (identity proof in `evidence/MS05e/evidence.md`, section I) |
| Candidate source (set aside) | `generator/js/variants/greater-than.js` `daecf790…` (`SIGN_POOL = 4`); the pool-4 files were measured on a source that differs from it by one wrapped line (`evidence/MS05e/prove-format-only.cjs`) |
| Machine | Windows x64, Node v26.13.0, 16 cores, time factor 2; every generating command ran under `Invoke-Dv3Node` (lock wait at most 0.15 s, Pentomino paused) |
| Evidence | [docs/difficulty-v3/evidence/MS05e/evidence.md](evidence/MS05e/evidence.md) and its folders |

## 1. Result in one paragraph

**The outcome: measured, set aside.** The plan author's answer CV6-05 (`docs/difficulty-v3/clarifications.md`, under
S-OD6) withdrew the pool (Q1(b)) and kept the Normal contracts (Q2(a)); the source was restored byte for byte and the
candidate saved as a patch. Everything below the outcome is the measurement that led there; all of it stands, and every
number of the candidate (the pool-4 E, quick, GD, GG, GR and pin records) is history only.

**S-OD1 step 1's stop-and-report condition was met before the production edit, and it was not taken.** The trap that the
plan author named is a sample that ends below the band **at the clue floor** with a minimal sign set, and step 1 says
that if it is not the dominant cause, the task stops and reports. On Normal, seeds 300-319, the trap is 83 of the 376
misses (22.1 %), and 94 of 484 (19.4 %) after the change. The largest class is a sample whose setup already ended two or
more clues above the floor (187, 49.7 %). An earlier version of this report counted every miss below the band as the trap
(355, "94 %") and wrote that the trap dominates; that dropped the floor condition (every sample is minimal by
construction), and the statement was wrong (section 2). The plan author acknowledges the gate as written (CV6-05: it
"should have been taken before the production edit"). The authorised repair (a pool of live signs per step, tier first)
was implemented as specified, and each of the permitted values 4, 8 and 16 was run once on the whole manifest.
**It does not restore the performance, it makes it worse**: on the diagnosed cohort (Normal 300-319) it does not raise the
share of exact samples (4.0 % of the dug samples at pool 4 against 4.6 % before); on the other cohorts it lowers the dug
samples per exact request on most values, by up to about half at pool 16, but not on all; and every sample costs about
`SIGN_POOL` times the ratings, so no value pays for itself (section 4). No value passes closure; pool 4 had the lowest
total time on four of the five cohorts and in their sum (pool 8 is lower on Normal 300-319), and it was the candidate
carried to the review. The manual CV6 assertion of Greater-Than Normal still failed with it (p95 17,014 ms against its
unchanged limit of 1,400 ms, 5,209 ms before the change), and **Greater-Than Nightmare CV6 failed too** (40,396 ms
against 20,000 ms). Under S-OD4 a timing-only failure is an item and the work went on; the decision on the pool itself
was D1 (section 7), answered by CV6-05. Correctness of the candidate was intact: 240 requests per source with no error,
no invalid or non-unique puzzle, every sign set minimal, every flag and warning in agreement.

## 2. Diagnosis (unchanged source, before any production edit)

`evidence/MS05e/before/diagnosis.json` and `diagnosis.md`: seeds 300-319, Normal, the registered `signs` strategy
wrapped in an isolated Node process, every dug sample captured, rated and checked after the timed request (unique,
minimality by removing each remaining sign; all 394 are unique and minimal). Request times of this file include the
extra work and are not headline latency.

| Outcome of a dug sample (disjoint) | Samples | Share |
|---|---:|---:|
| exact (in band, needs the tier) | 18 | 4.6 % |
| shallow (in band, tier not needed) | 21 | 5.3 % |
| below the band, no clue revealed after the setup (83 at the floor, 187 above it; split below) | 270 | 68.5 % |
| below the band, after a clue reveal | 85 | 21.6 % |
| above the band / not rated | 0 / 0 | 0 % |

394 samples in 20 requests (41 attempts); 376 missed, 21 of them shallow. No sample was above the band or stuck.

**The named trap and the split of the misses.** S-OD1 step 1 and the task's step 1 define the trap as a sample that ends
below the band **at the clue floor** with a minimal sign set. Minimality holds for every sample by construction (the
`signs.minimal` pass runs last in every round; 394 of 394 before and 504 of 504 after were verified), so "below the band
with a minimal sign set" alone is only the share of misses below the band (355 of 376, 94.4 %), not the trap. The driver
records the floor (`atFloor`: at most one clue above `spec.minClues`). From `before/diagnosis.json` and
`after/diagnosis.json` (fields `atFloor`, `tuneReveals`, `initialClues`; no new run):

| Miss | Before | Share of 376 | After, pool 4 | Share of 484 |
|---|---:|---:|---:|---:|
| Below the band, at the floor (at most one clue above it): the named trap | 83 | 22.1 % | 94 | 19.4 % |
| Below the band, no tune reveal, the setup itself two or more clues above the floor | 187 | 49.7 % | 217 | 44.8 % |
| Below the band after a tune reveal (all two or more clues above the floor) | 85 | 22.6 % | 142 | 29.3 % |
| Shallow | 21 | 5.6 % | 31 | 6.4 % |

By the plan's definition the named trap is about a fifth of the misses. The largest category is a sample whose setup
already ended two or more clues above the floor. **S-OD1 step 1 says that if the trap is not the dominant cause, the task
stops and reports before any production edit. That condition was met before the production edit, and the stop-and-report
was not made; the pool was implemented instead.** An earlier version of this report said that the trap dominates and that
no decision was needed; both statements were wrong. This is not a code defect, and every measurement stands.

What it means: the pool chooses among signs, while most misses carry clues above the floor that a sign-only dig never
removes. What holds those clues (the unit minimum, the setup's solvability help with every sign present, or uniqueness)
is not recorded, and is not inferred here. The plan author needs this split before proposing any further strategy; it is
carried into D1 (section 7).

Where the time goes: the sample digs account for 10.6 s of the 39.7 s; 21 local searches ran to the proposal cap
(32,768), and the requests that had one took 95 % of the time. An attempt whose 12 samples all miss runs the local
search, which may move clues, and finds nothing to improve; why it finds nothing was not measured.

## 3. The candidate repair (set aside)

The candidate is kept as `evidence/MS05e/candidate-pool-4.patch`; the restored source has none of it. It touched
`greater-than.js`, the technique pass only (`digPass(order, techniqueOracle, 'signs')` was replaced by `guidedPass`):

- Each step takes the next `SIGN_POOL` live signs of the shuffled order that this pass has not refused, rates the
  removal of each against the same current set (the uniqueness count, then the bounded solve with the level's
  techniques, classified without another solve) and removes the best. Refused: ambiguous, stuck, or a score at or above
  `spec.max`. Winner: `tierUsed` (a proxy from the technique counts and `spec.tierTechniques`, vacuous for Very Easy and
  an empty tier, never `requiredOf`), then the nearest to `options.target` when it is finite, otherwise the highest
  score; an exact tie keeps the shuffled order. A refused sign is not rated again in the pass (the mask is new in every
  tune round); an allowed loser is rated again by the next pool.
- One `stats.tried` and one `stats.oracleCalls` per rating, `budget.check()` once per rating, the same budget passed to
  both solvers, no new cap, clock or random draw; the rated sign is back in `finally` whatever happens.
- Log: `keep` (`cells`, `sign`, `score`) for every allowed member, the winner included, `reject` with the reason for a
  refused one, `accept` for the winner alone. The existing `dig.keep` event carries the score. The replay reads the keeps
  into the span of the next accepted sign without any change (sign `reject`s stay in `rejectedSigns`).
- `signs.minimal`, the reveals, `MAX_TUNE_ROUNDS`, the keeper offers, the clue floors and the final canonical rating were
  as the accepted recovery left them. The comparator's second key read `options.target` (a finite number only), absent in
  production; under CV6-05 the target is transported, not consumed, by the sign dig (section 8).

## 4. The pool comparison (each value once, whole manifest; candidate measurements, history only)

Every cohort ran twice (r1, r2) under the lock; `--repeat` labels independent invocations. Counts are identical in the
two repeats, times agree within a few per cent (the tables give r1 / r2). 240 requests per source, 0 errors, 0 failed
independent checks in all four sources. The pool-8 and pool-4 files are whole cohorts; for pool 16 the two slow
cohorts were split by literal seed range (expert 300-309 and 310-319, normal 7000-7019 and 7020-7039) and merged exactly
once per seed. Columns: p50 / p95 / max in ms (nearest rank, as the manual suite), total seconds, exact hits, attempts,
samples dug, oracle calls (all samples of the request), full ratings. The "before" rows measured the unchanged source,
which is the restored source (evidence section I); the "pool" rows measured the candidate and are history only.

**Normal, seeds 300-319 (CV6's population)**

| Source | p50 | p95 | max | Total s | Exact | Attempts | Samples | Oracle calls | Full ratings |
|---|---|---|---|---|---|---:|---:|---:|---:|
| before | 345 / 341 | 5,261 / 5,280 | 6,805 / 6,701 | 39.7 / 39.5 | 20/20 | 41 | 394 | 46,962 | 420 |
| pool 4 | 2,516 / 2,567 | 17,019 / 17,391 | 18,283 / 18,269 | 89.7 / 93.0 | 20/20 | 51 | 504 | 209,332 | 531 |
| pool 8 | 1,163 / 1,156 | 22,995 / 22,817 | 24,612 / 24,334 | 88.1 / 87.7 | 20/20 | 38 | 341 | 274,330 | 353 |
| pool 16 | 3,477 / 3,437 | 15,937 / 16,651 | 26,714 / 26,585 | 121.2 / 122.0 | 20/20 | 31 | 287 | 441,466 | 296 |

**Normal, seeds 7000-7039**

| Source | p50 | p95 | max | Total s | Exact | Attempts | Samples | Oracle calls | Full ratings |
|---|---|---|---|---|---|---:|---:|---:|---:|
| before | 3,363 / 3,341 | 10,613 / 10,584 | 13,468 / 13,491 | 164.5 / 164.2 | 39/40 | 134 | 1,399 | 167,029 | 1,465 |
| pool 4 | 3,508 / 3,540 | 10,706 / 10,667 | 11,292 / 11,316 | 167.1 / 167.3 | 40/40 | 98 | 945 | 391,735 | 989 |
| pool 8 | 4,923 / 4,936 | 15,292 / 15,367 | 18,938 / 18,765 | 224.7 / 224.5 | 40/40 | 89 | 831 | 667,246 | 874 |
| pool 16 | 4,420 / 4,458 | 20,037 / 19,928 | 30,207 / 30,156 | 295.3 / 297.0 | 40/40 | 75 | 678 | 1,041,869 | 706 |

**Easy, Hard and Expert, seeds 300-319 (the neighbours; no slowdown hidden)**

| Level | Source | p50 | p95 | max | Total s | Exact | Attempts | Oracle calls |
|---|---|---|---|---|---|---|---:|---:|
| Easy | before | 22 / 22 | 42 / 37 | 49 / 51 | 0.5 / 0.5 | 20/20 | 20 | 2,439 |
| Easy | pool 4 | 79 / 80 | 139 / 135 | 148 / 144 | 1.8 / 1.8 | 20/20 | 20 | 9,302 |
| Easy | pool 8 | 150 / 151 | 267 / 274 | 283 / 275 | 3.3 / 3.4 | 20/20 | 20 | 18,192 |
| Easy | pool 16 | 286 / 290 | 518 / 495 | 539 / 534 | 6.3 / 6.2 | 20/20 | 20 | 34,960 |
| Hard | before | 188 / 188 | 2,175 / 2,056 | 6,749 / 6,665 | 17.2 / 16.9 | 20/20 | 27 | 23,728 |
| Hard | pool 4 | 563 / 557 | 6,365 / 6,261 | 6,895 / 6,745 | 27.5 / 27.1 | 20/20 | 25 | 68,684 |
| Hard | pool 8 | 1,460 / 1,438 | 5,575 / 5,490 | 6,199 / 6,017 | 37.2 / 36.7 | 20/20 | 22 | 118,553 |
| Hard | pool 16 | 1,624 / 1,622 | 8,653 / 8,733 | 10,753 / 10,808 | 50.1 / 50.3 | 20/20 | 22 | 159,123 |
| Expert | before | 1,879 / 1,881 | 11,721 / 11,842 | 14,605 / 14,605 | 70.6 / 71.1 | 19/20 | 55 | 72,373 |
| Expert | pool 4 | 2,863 / 2,846 | 15,569 / 15,490 | 22,799 / 22,704 | 88.8 / 88.4 | 19/20 | 46 | 179,838 |
| Expert | pool 8 | 10,318 / 10,226 | 30,118 / 29,147 | 30,347 / 29,721 | 244.4 / 238.8 | 20/20 | 72 | 581,092 |
| Expert | pool 16 | 8,658 / 8,659 | 30,157 / 30,173 | 38,119 / 38,528 | 230.9 / 232.0 | 20/20 | 45 | 653,175 |

Reading: a pool multiplies the oracle calls of a request by 4.5 (pool 4), 5.8 (pool 8) and 9.4 (pool 16) on Normal
300-319. The guidance helps a little: the dug samples per exact request (below; the dug samples over the exact requests of
the tables above) fall on most cohorts and values, by up to about a half at pool 16, but not on all, and each sample
costs about `SIGN_POOL` times the ratings, so no value pays for itself. Only Normal 7000-7039 at pool 4 breaks even
(167 s against 164 s, with 98 attempts against 134 and one more exact hit). Pool 16 has the lowest CV6 p95 of the three
(15.9 s) and the fewest attempts, but it costs 3.1 times the time of the baseline on Normal 300-319 and 12 times on Easy.

| Dug samples per exact request | Before | Pool 4 | Pool 8 | Pool 16 |
|---|---:|---:|---:|---:|
| Normal 300-319 (the diagnosed cohort) | 19.7 | 25.2 | 17.1 | 14.3 |
| Normal 7000-7039 | 35.9 | 23.6 | 20.8 | 16.9 |
| Hard 300-319 | 9.3 | 8.3 | 7.5 | 5.3 |
| Expert 300-319 | 29.6 | 22.8 | 36.7 | 21.8 |

On the diagnosed cohort at pool 4 the hit rate per sample does not rise (the exact share of dug samples is 4.0 % against
4.6 %, and the samples per exact request rise from 19.7 to 25.2); that holds for that cohort and value only. Easy needs
1.1 samples per exact request at every value.

**The choice.** No value meets closure and none is free of a neighbour regression, so there is no "passing value" to
prefer. Pool 4 has the lowest total time on four of the five cohorts (Normal 7000-7039, Easy, Hard, Expert) and in their
sum; on Normal 300-319 pool 8 is lower (88.1 / 87.7 s against 89.7 / 93.0 s at pool 4). Pool 4 also has the lowest p95
on three of the five (Normal 7000-7039, Easy, Expert), is within 7 % of the best p95 on Normal 300-319 (17.0 s against
15.9 s at pool 16) and within 14 % on Hard (6.4 s against 5.6 s at pool 8), is the only value that breaks even on any
cohort, and has the smallest regression on the neighbours; it was fixed in the candidate (`SIGN_POOL = 4`). Values tried:
4, 8 and 16, once each. This is a recorded judgement among candidates, not an accepted trade-off, and the candidate was set
aside: section 7, D1.

After the change, the diagnosis was repeated once on the candidate (`after/diagnosis.json`, Normal 300-319): 504
dug samples in 51 attempts; 20 exact (4.0 %), 31 shallow, 453 of the 484 misses (93.6 %) below the band, and by the
floor condition only 94 of the 484 (19.4 %) are the named trap; the sign digs now take 49 s of the 91 s. The split of
the misses (section 2) after the change:

| Miss | Before (of 376) | After, pool 4 (of 484) |
|---|---:|---:|
| Below the band, at the floor (the named trap) | 83 (22.1 %) | 94 (19.4 %) |
| Below the band, no tune reveal, two or more clues above the floor | 187 (49.7 %) | 217 (44.8 %) |
| Below the band after a tune reveal | 85 (22.6 %) | 142 (29.3 %) |
| Shallow | 21 (5.6 %) | 31 (6.4 %) |

The largest class after the change is still a setup that ended two or more clues above the floor, which a sign-only dig
does not remove; what holds those clues is not recorded.

## 5. CV6 and I5 of the Greater-Than generated-puzzle group (unchanged assertions, per-level selectors; candidate, history only)

Eighteen selectors, each `> <level>: <count> puzzles > CV6:` or `> I5:` with selected total 1 (checked by a
registration-only listing before every run, `gd/final/manifest.jsonl`), seeds and counts as the suite has them
(20 for Very Easy, Easy and Normal; 10 for the others), `--verbose`, a fresh `--results` file, jobs 1, locked. The cells
measured the candidate tree: they ran with another manual fingerprint than the candidate's final tree, because pins and
documents changed afterwards, and none of those is loaded by this selection (statement and fingerprints in
`evidence/MS05e/evidence.md`, section E, "GD applicability"). The candidate is set aside, so these cells are history only;
they apply to nothing that is committed.

| Level | CV6 limit (ms, with the time factor 2) | CV6 | I5 | Cell time s |
|---|---:|---|---|---:|
| veryEasy | 600 | pass | pass | 1.4 |
| easy | 1,400 | pass | pass | 1.8 |
| normal | 1,400 | **FAIL: p95 17,014** (on the unchanged source: 5,209) | pass (20 of 20 exact) | 89 |
| hard | 12,000 | pass | pass | 20 |
| expert | 20,000 | pass | pass | 41 |
| master | 20,000 | pass | pass | 48 |
| nightmare | 20,000 | **FAIL: p95 40,396** | pass | 111 |
| hell1 | 20,000 | pass | pass | 6.6 |
| hell2 | 20,000 | pass | pass | 18 |

The "before" cell for Normal was run on the unchanged source (`gd/before`), which is the restored source: CV6 failed
with 5,209 ms, I5 passed. That cell is the current record of S-AV01. The other levels have no "before" cell of this task;
their nearest earlier record is MS05b3's I5 request times (same seeds, unguided pass; only the generation, not the
assertions, changed since): Nightmare seeds 700-709 had a slowest request of 19,192 ms, so its CV6 (the slowest of ten)
was inside 20,000 ms on the restored source (a pass with a 4 % margin, from that record, not from a cell of this task),
and the candidate's assertion failed at 40,396 ms. Earlier records: MS04 2,035 ms (the pause), MS05b3 5,280 ms. 700 ms is
the design budget, 1,400 ms the assertion in this run.

## 6. Deterministic output changes of the candidate (GG, GR, GH; Greater-Than only; history only)

On the restored source none of them applies: the fixtures, the pins and the help examples are byte-identical to
`f7be90f`, so the 520 hashes, the wires G09-G13, the analyses G01-G14 and the pins are the baseline's. The table is the
candidate's record.

| Gate | Result |
|---|---|
| GG: 520 regression hashes, 104 shards, 2 locked compounds | 30 of 520 changed: `greaterThan/normal` seeds 1, 2, 3, 5, 13, 21, 34, 144, 610, 987, 1597, 2584, 4181, 6765, 10946; `greaterThan/hard` seeds 2, 5, 8, 13, 21, 34, 55, 89, 377, 987, 1597, 2584, 4181, 6765, 10946. The other 490 keys (all 24 other combinations and 10 Greater-Than keys) unchanged. `--update-hashes`, then `--check-hashes`: all 520 unchanged |
| GR wires G09-G13 | G11 (Greater-Than expert, 1,418 fields) and G12 (hard, 552 fields) differ: a different puzzle from the same request; G09, G10, G13 match. Published, checked |
| GR analyses G01-G14 (recorded against the published wire) | G11 (167 fields) and G12 (131) differ; the other twelve match. Published, checked |
| GH `ineqChain`, `minMaxForcing` | both match `help-examples.js`; nothing written |

Why: the pool changes which signs are removed, so the same seed gives another puzzle; the unchanged keys of the other
combinations show that nothing else moved. Ten Greater-Than keys also keep their hash (`greaterThan/normal` seeds 8, 55,
89, 233, 377; `greaterThan/hard` seeds 1, 3, 144, 233, 610). **That is unexplained:** no measurement compares the removal
sequences of those seeds before and after, so the evidence does not say why the pool left them unchanged. Pinned replay,
steps and player assertions tied to the G11 and G12 goldens were re-derived from the
refreshed data (never fitted): in the candidate G11 had 2 details jumps instead of 4 (details total 14, distinct jumps 16), its sign
jumps were signs 67 and 5, its fall 2,862 to 1,084 at position 104, and its compact peak 2,862 with 4 clues
restored. Twelve tests in `replay.test.js` (5), `steps.test.js` (4) and `player.test.js` (3); the pins and their candidate values are listed
in `evidence/MS05e/evidence.md`.

## 7. Items, findings and decisions

**S-AV01, Greater-Than Normal CV6 (carried, open; owners MS07e, MS18c, MS18d; governed by Q2(a)).** On the restored source:
p95 5,209 ms against 1,400 ms (design 700; `gd/before`), and 10.6 s p95 on seeds 7000-7039. Earlier records 5,280 ms
(MS05b3) and 2,035 ms (pause). The candidate's 17,014 ms is history. Under Q2(a) `BUDGET_MS.normal` stays 700 ms and GP's
rules stay as they are; nobody edits, skips or wraps the assertion; Greater-Than Normal stays in the offered table, with no
interim removal. CV6 is in the manual tier, outside the quick set and CI, so it blocks no task. How it ends (CV6-05):

- *Normal fails final qualification at MS18c:* the cell is hidden by the existing rule and S-AV01 closes as "not offered".
- *Normal qualifies at MS18c but CV6 still exceeds its assertion on the final source:* MS18c returns to the plan author with
  the final-source numbers, before MS18d's final timing runs, and the first branch of S-OD1's fallback (b) is decided once, on
  that data. Its form is fixed now: one base value in milliseconds for `BUDGET_MS.normal`, the same base for a GP target of
  Greater-Than Normal if GP has one, the machine factor left to `SG.test.timeLimit`, never above 10,000 ms, with the test and
  both developer guides changed in that same step. Until then the 700 ms stands.
- *CV6 passes on the final source:* S-AV01 closes with the measurement (not expected).

**S-AV16, Greater-Than Nightmare CV6 (withdrawn as a current-source item).** The candidate's p95 of 40,396 ms against
20,000 ms (seeds 700-709, ten puzzles, `gd/final/nightmare-CV6-results.json`) is kept as history. On the restored source
Nightmare CV6 passes at 19,192 ms of 20,000 (a 4 % margin; MS05b3's same-seed I5 record, not a cell of this task). Noted for
MS07e: MS07's chain work will move that margin; if it fails later it is a named item of the task that moved it.

**S-AV17, generation cost of the pool on the other levels and in the quick tier (withdrawn as a current-source item).**
The candidate's observations are kept as history: Easy p95 42 to 139 ms (3.3 times), Hard 2,175 to 6,365 ms (2.9 times),
Expert 11,721 to 15,569 ms (1.3 times), Normal 7000-7039 unchanged at about 167 s; the Generator quick set 726 s in eight
shards against MS05r6c's 648 s (`own-fast` 218 s against 162 s, `pipeline` 307 s against 286 s).

**S-AV08 (standing quick cost)** returns to 648.0 s (MS05r6c: Generator 3,262 tests in 50 suites and 7 shards; the
candidate's 726.2 s is history). The shard bounds of `.github/scripts/generator-quick.json` return to the baseline's.

**D1, decision (CV6-05, the plan author under S-OD6, 2026-11-14): Q1(b), withdraw the pool; Q2(a), keep the contracts and
let final qualification decide the offer.** MS05e closes as "set aside", not as an accepted repair; MS05e-B02 holds
(CV6's verdict is retained). The two questions were separate, because S-OD1's fallback (b) acts on the Normal contract and
says nothing about the pool (IR28).

*The plan author's two errors, as he states them.* (1) *The premise:* CV6-01 described the miss as "a result below the band
at the clue floor ... with nothing left to remove", from one seed (308). IR23 shows that this is 83 of 376 misses (22.1 %);
half of the misses (187, 49.7 %) are setups that already hold two or more clues above the floor, and another 22.6 % follow a
tune reveal. A sign-only choice cannot act on either group: the repair was aimed at a fifth of the problem. (2) *The cost:*
step 2 said "each evaluation is the solve the oracle already runs", and PR-S2 confirmed that "the pool reuses solves the
oracle already makes". That is true for one evaluation and wrong for the pass: the losers are rated again, so a removal
costs about `SIGN_POOL` ratings instead of 1.15, over about 103 removals per sample. He specified that algorithm and did not
multiply it out; SA1's verdict stands: the slowdown is the specification's, not the developer's. IR23 is acknowledged as
written: step 1's stop-and-report condition was met and should have been taken before the production edit; S-OD4 removed
performance-only stops, not this gate. Every measurement stands.

*Why Q1(b), in short.* (1) It does not do what S-OD1 authorised it for: Normal CV6 5,209 to 17,014 ms against 1,400 ms, no
tried value closes it, and by step 4 no further value or strategy may be tried. (2) It is not neutral elsewhere: Nightmare
CV6 goes from a pass (19,192 ms of 20,000) to 40,396 ms, a second failing contract that no recorded decision covers; Easy
p95 rises 3.3 times, Hard 2.9 times, Expert by a third, the Generator quick set by 12 %. (3) Its real effect does not change
an outcome: the guidance lowers the samples per hit on most cohorts and Normal 7000-7039 goes from 39 to 40 exact requests
of 40, but the time there is unchanged (p95 10.6 against 10.7 s), so that cohort sits at the 10 s qualification budget with
or without the pool (a reading of two cohorts, not a qualification result). (4) MS06 is not a reason to keep it: a target
only ranks pool members with the same `tierUsed` and cannot pay back a dig that costs 3.6 times more per sample; Normal's
difficulty here is finding the tier, not the position inside the band. Not concluded: that sign guidance is useless (it
helps a little, at the wrong price), or what holds the extra setup clues (not measured). No second strategy, IR29's lever
included, is authorised; these observations are evidence for the later improve-generating feature and stay in this report.

*Why Q2(a), in short.* The restored source gives p95 5.2 s on CV6's 20 seeds and 10.6 s on the 40 seeds of 7000-7039, a
factor of two between two small cohorts; a `BUDGET_MS.normal` written now would be fitted to 20 seeds of a catalogue that
MS07 to MS16 still change. S-OD4 (c1) is already the rule for offers (at least 36 of 40 exact hits and p95 within 10 s for
this 81-cell board), and a looser CV6 contract would only turn a red assertion green for a cell that may be hidden. A red
assertion that is true is better than an adjusted green one. Neither branch touches Nightmare, the app guard, seeds, floors,
caps, requiredness, the target policy or the qualification budget.

*Disposition.* Restored from `f7be90f` by SA1's review, section 4, option (ii); the candidate saved as
`evidence/MS05e/candidate-pool-4.patch`; identity proved with no run (evidence section I). The report's outcome is
"measured, set aside"; IR23 to IR26 are applied to the report, the evidence and the notes, with the gate recorded as met
and not taken and the two errors above; IR27 is optional and left as it stands. IR29, IR30, F01 and F02 are moot and need no
owner. `generator/design.md` and both developer guides are back at baseline text: the experiment is described in the v3
notes and this report only, not in the guides. Process note from CV6-05 (SA2 may add it to the check-list; no task's scope
changes): where a task has a diagnosis gate, the developer reports the gate as a table that uses the gate's exact
predicate, every condition included, and waits for the orchestrator before the first production edit.

**The facts behind the two questions (IR28).** The candidate and the restored source, side by side; the second row is the
chosen one.

| Combination | Normal on CV6's seeds | Normal on seeds 7000-7039 | Nightmare CV6 | Quick set |
|---|---|---|---|---|
| Pool kept | 17.0 s (p95 17,014 ms against 1,400 ms and the design's 700 ms); a documented Normal contract would have had to cover it. S-OD1 gave "2-5 s would keep the cell offered", against the v2 10 s qualification budget, for scale | p95 10.7 s | 40,396 ms against 20,000 ms; fallback (b) names Normal only, so it would have needed its own disposition | 726.2 s; F01 to fix |
| **Pool set aside (chosen)** | 5.2 s (5,209 ms) | p95 10.6 s | back at its observed 19,192 ms, about 4 % inside 20,000 ms | 648.0 s |

The premise of the diagnosis (section 2) applied to both questions. A looser Normal contract would change neither
Nightmare's limit nor the qualification rule: final qualification alone decides the offer.

**The MS06 sign-target handoff (CV6-05 replaces S-OD1's sentence "MS06b passes the sample's target into the sign-dig
context", which is withdrawn with the comparator; it also ends the IR28 inconsistency between MS06b and MS06c2).** The rule
is: **on Greater-Than the target is transported, not consumed, by the sign dig.** MS06 makes no edit to `greater-than.js`
and adds no pool, constant or comparator there. The registered `signs` strategy still receives `options.target` through
MS06b's forwarding and ignores it; its keeper offers carry the target through MS06c1's keeper view, with no variant edit.
The target acts on Greater-Than only where candidates are compared in a stage that is already entered: the local search's
acceptance (`preferRated`) and the `attemptBest` continuation (refinement is not entered for models with inequalities, R7,
unchanged). The pack edits (MS06a to MS06c2 and the S-OD1 register row) belong to SA2 and are listed in CV6-05; nothing
here edits the pack. Expectation for MS06d, a projection: a small or null target effect on the three Greater-Than cells,
and a null effect is a valid result of the comparison, not a defect to repair.

**F01, F02 (and IR29, IR30): moot.** They concerned pooled sign moves in the replay text and the digger header; with the
pool set aside they need no owner. IR29's lever (counting uniqueness only after a bounded solve gets stuck) was outside
S-OD1 and is not authorised.

## 8. Handoff

MS06a: the source is the restored first-allowed sign pass, identical to `f7be90f` (identity proved, evidence section I);
MS06a takes its complete 17-cell, 204-request before-record on it, with Greater-Than Normal, Hard and Expert among the
cells. The `before/` and `gd/before/` records of this task measured that same source and are baseline history, not
MS06a's record. MS06 sign-target rule: transported, not consumed (section 7). S-AV01 stays open under Q2(a); S-AV16 and
S-AV17 are withdrawn as current-source items; S-AV08 is 648.0 s. The new suite `greater-than-guided` and its CI shard are
gone with the restore; the candidate is rebuildable from `evidence/MS05e/candidate-pool-4.patch`. Nothing was measured again
for the disposition.
