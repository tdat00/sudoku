# Improve generating (Sudoku): cross-review of Astra's analysis (SA1, claude-opus-5.5)

Phase 2, 2026-11-14. Worktree `improve-generating` at `f7be90f`. Reviewed: `docs/improve-generating/gpt-6-astra/1-analysis.md`
and `1-speed-summary.md` (SA2), against my `docs/improve-generating/claude-opus-5.5/1-analysis.md` and `1-speed-summary.md`
("Opus §n" and "Astra §n" below). Read-only: no test, generation, benchmark, qualification or timing run, no git action.
The checks read the code and the committed evidence; every number below is arithmetic on figures already in the two
analyses or in the evidence they cite. Labels as before: *Measured*, *Derived*, *Projection*.

---

## 0. Summary

- **Plan phases 1 and 2 (S3, S4, S5a: same puzzles).** The two analyses agree within about 25 % on every cell (mega16
  Nightmare 41 s and 32 s, mega12 5.1 s and 4.8 s, classic9 1.1 s and 1.2 s). Reconciled: mega16 104 to 35 s, mega12 24 to
  5.2 s, classic9 4.9 to 1.05 s.
- **Plan phase 3 (S1, S2, S5b).** Astra is 2 to 3 times more optimistic on the cell-dig boards (mega16 Nightmare 4.2 s
  against my 12 s). Two assumptions cause it, and the code and the evidence go against both:
  1. *The S1 + S2 per-sample divisor:* Astra 5 on 81 to 369 cells and 8 on mega16, applied to every sample; mine 0.8 to
     2.5. A frontier sample still makes one floor test per group, a DFS after each refused test and 8 to 16 full solves,
     and the plan replaces today's cheap proposal samples by frontier samples too. Counted in rating equivalents against
     today's measured per-sample cost, the likely divisor is about 1.0 on 81 cells, 1.2 on 144, 2 on the multigrids and 3
     on mega16; Astra's values are the high-benefit case.
  2. *The pool on the local search:* Astra divides the whole remaining request by 2.8 on four lanes. The local search runs
     once per attempt, after that attempt's samples (`generator/js/engine/digger.js:1936-1947`), so on two-attempt boards
     no pool divides it by more than 2. With Astra's other parameters unchanged this alone moves mega16 from 4.2 to 5.4 s.
- **Reconciled after all phases (failing request, likely):** mega16 Nightmare 9.8 / 11.7 s (range 3.1 to 26), mega12
  4.2 / 5.5, samurai 4.5 / 5.2, classic9 1.05 / 1.5 (S1 is a yield lever there, not a speed lever), Killer Nightmare
  4.4 / 9.5, Greater-Than Nightmare 2.1 / 5.4. Headline: mega16 Nightmare about 11 times faster (4 to 34), not 25 (Astra)
  or 8.7 (mine).
- **Availability.** No real disagreement once both are stated on the same basis: classic9 and wordoku Nightmare need
  about ten times more effective opportunities for 90 % exact hits. At the default attempts no phase changes the hit rate
  except through S1's p; raising the attempts inside 10 s (OD-S4) buys about nine times more after phases 1 and 2. mega12,
  mega16 and the multigrids depend on SM2's p in both analyses.
- **Findings and risks.** 11 of Astra's correctness findings repeat mine; 13 are new to me in whole or in part, and all
  hold against the code. One corrects my analysis: the plan's S9 transformations are not validity-preserving for Killer
  and Greater-Than (row and band permutations break cage connectivity and sign adjacency). I dispute three of Astra's
  modelling choices (§1) and none of its correctness findings.
- **Questions.** 6 of Astra's 8 questions are also mine; 2 are new and I support them (S7's total ceiling; S9's diversity
  and geometry-only transformations). A merged list has 14 questions.

---

## 1. Speed: where the two analyses differ

### 1.1 Side by side

Failing request (fixed default work), median / p95 seconds, Nightmare; Projection, likely. Today is Measured.

| Cell (attempts) | Today | Phases 1-2: Opus; Astra | All phases: Opus; Astra | Astra faster at the end by | Cause |
|---|---|---|---|---|---|
| classic9 (8) | 4.91 / 5.72 | 1.1 / 1.3; 1.16 / 1.92 | 1.2 / 1.4; 0.58 / 0.97 | 2.1 x | D1, D3 |
| mega12 (4) | 23.72 / 25.24 | 5.1 / 5.4; 4.80 / 7.17 | 5.1 / 5.4; 1.64 / 2.46 | 3.1 x | D1 |
| mega16 (2) | 104.11 / 116.95 | 41 / 46; 32.45 / 41.35 | 12 / 14; 4.16 / 6.57 | 2.9 x | D1, D2 |
| samurai (2) | 26.74 | 11; 8.86 / 10.09 | 6.5; 2.33 / 3.29 | 2.8 x | D1, D2 |
| sohei (2), flower (2) | 27.49, 23.07 | not tabulated; 9.11, 7.65 | 6.6, 5.6; 2.39, 2.01 | 2.8 x | D1, D2 |
| butterfly (4) | 32.82 | not tabulated; 6.62 / 9.29 | 6.0; 2.85 / 4.01 | 2.1 x | D1 |
| jigsaw9 (8) | 0.95 / 2.33 | not tabulated; 0.453 / 1.24 | p95 0.5 - 0.8; 0.244 / 0.645 | about 2 x | D1 (Astra applies S1 there) |
| killer (8) | 17.82 / 29.98 | 4.4 / 7.5; 5.14 / 10.81 | the same (no S1 credited in either) | 0.86 x (Astra slower) | D4 |
| greaterThan (8) | 9.30 / 19.19 | 2.3 / 4.8; 2.53 / 6.50 | the same | 0.9 x (Astra slower) | D4 |

The plan's own projection (plan §4: mega16's 97 s sample batch to about 1.6 s, with factors 10, 2 and 3) is rejected by
both analyses.

### 1.2 D1. The S1 + S2 per-sample divisor (the main disagreement)

**Astra's assumption** (Astra §4.1, §4.2). The sample fraction f of a request (proposals and score-targeted samples
together) is divided by r12 = 5 on classic9, Jigsaw, mega12 and the multigrids and by 8 on mega16 (low 2 or 3, high 10
or 15); S1 alone gives 3 or 5 and S2 a further 1.6 to 1.7 on the samples (1.32 on mega16's whole request). Basis: the
plan's "about 10 times fewer solves per sample", discounted.

**Mine** (Opus §5.1). A per-sample time factor of 0.8 (81 cells), 1.0 (144), 1.3 (multigrids), 2.5 (mega16), from the
work a frontier sample still does.

**Check against the code and the evidence.**

1. *Today's per-sample cost in canonical-rating equivalents* (Derived; Opus §2.1 - §2.2 from the MS05r4 R5 rows and the
   MS05r5p segments): classic9 about 25 per sample (27 ms against a 1.1 ms rating); mega12 proposals 5 to 6 and
   score-targeted 88 to 106, mean about 50; mega16 proposals 21 and score-targeted 350, mean about 185; samurai G13
   proposals 47 to 81 and score-targeted 270 to 335, mean 155 to 210. The plan's "1,296 full solves per sample" is an
   upper count the code does not reach (both analyses; at most about 190 on 81 cells).
2. *What a frontier sample does* (plan §2 S1 pseudo-code; today's stages `digger.js:605, 751-911`): one floor test per
   symmetry group (G about 41, 72, 128, 185), a DFS uniqueness check after each refused test, at most K_F = 8 to 16
   full-set solves, `deepen` with `boundedObjective`, and the canonical verification. At the top tiers the plan runs phase
   A as a "ladder of floors" (the cheap set first, then up to the full floor, which holds the forcing chains at
   Nightmare), so a group refused at one floor is tested again at the next. S2 shortens accepted tests only. Astra's own
   S2 section says so ("S2 saves successful-test tails, not initialisation, failed floor searches, uniqueness checks or
   scored deepening"), which does not fit a further factor 1.6 from S2.
3. *Proposals are replaced too.* The plan replaces the proposal / score-targeted alternation at the top tiers by
   frontier samples (`digger.js:1918`; plan S1 "Relation to today's code"). Half of today's top-tier samples are proposals
   at 1/14 to 1/19 of a score-targeted sample on mega12 and mega16 (Measured). A divisor on the whole f assumes that the
   cheap half also becomes cheaper.
4. *The cost of a frontier sample* (Projection). Per-test costs in rating equivalents, cheap / mid / dear: accepted floor
   test with S2 0.05 / 0.1 / 0.15; refused floor test, ladder included, 0.3 / 0.6 / 1.25; DFS check 0.1 / 0.2 / 0.3; full
   solve 0.7 / 0.85 / 1.0 with K_F 8 / 12 / 16; `deepen` and verification 2 - 3 / 3 - 6 / 5 - 10. Kept groups from typical
   Nightmare clue counts. The cheap column is the high-benefit case (a floor without chains, few frontier entries).

| Board | Groups G; kept at the end | Frontier sample, cheap / mid / dear | Today's mean sample | Divisor, high / likely / low benefit |
|---|---|---|---|---|
| classic9 | 41; about 12 | 14 / 26 / 44 | 25 | 1.8 / 1.0 / 0.57 |
| mega12 | 72; about 28 | 21 / 42 / 74 | 47 - 56 | 2.4 / 1.2 / 0.7 |
| mega16 | 128; about 50 | 33 / 64 / 115 | 185 | 5.6 / 2.9 / 1.6 |
| samurai | about 185; about 65 | 41 / 80 / 145 | 155 - 210 | 4.4 / 2.3 / 1.3 |

**Verdict.** Astra's likely divisors lie at or above the high-benefit end of this count on every board; mine lie in its
lower half. Reconciled divisor on the samples, likely (high to low benefit): **1.0 on 81 cells (4 to 0.6), 1.2 on mega12
(4 to 0.7), 1.5 on butterfly, 2 on samurai, sohei and flower (5 to 1.2), 3 on mega16 (8 to 1.6)**. The high ends keep
Astra's values for an implementation better than the cheap column (incremental floor tests through S3, K_F near 8). On
81 to 144 cells S1 is a lever for p (exact hits per sample), not for time per sample, which is what the plan's own gate
measures (p / c). SM1 and SM2 can settle the four per-test costs before any S1 code exists (§4).

### 1.3 D2. The pool and the local search

**Astra's assumption** (Astra §4.1). After S1 to S4 the whole remaining request is divided by pm = 2.8 (p95 pp = 2) on four
lanes for classic9, mega12, mega16 and the multigrids. Its own S5a row (Astra §4.2) limits two-attempt boards to 1.7.

**Check.** `generateAttempts` runs one local search per attempt, after that attempt's samples, from the attempt's closest
rated candidate (`digger.js:1936-1947`, fork `'search#' + attempt`). S5b runs the samples of an attempt in parallel (plan
S5b); it does not split a local search. On mega16, samurai, sohei and flower (two attempts) the local search runs at most
two-wide. Its share today is Measured (MS05r5p): mega16 10 %, mega12 17 %, samurai G13 28 %; it grows after S1. In
Astra's own mega16 S1-S4 residual of 11.51 s, 5.29 s is local search and 6.22 s samples.

**Verdict.** Mine is right on the mechanism. With all of Astra's other parameters and its own two-attempt factor 1.7 on the
local part: mega16 4.16 to 5.4 s, samurai 2.33 to 3.3 s, sohei 2.39 to 3.4 s, flower 2.01 to 2.9 s. mega12 (four attempts)
and the 81-cell boards (eight) are not affected.

### 1.4 D3. classic9's sample share

Astra uses f = 0.65 for classic9 and Wordoku ("P, no measured stage split"). A least-squares fit over the 43
eight-attempt R5 rows of MS05r4 (Opus §2.3; Derived, mean absolute residual 69 ms) splits the request into 2.6 s of
samples and 2.35 s of local search (1.4 s local ratings, 0.95 s local proposals): f = 0.53. The split is measured; with
Astra's other parameters its classic9 end value moves from 0.58 to 0.69 s. Small.

### 1.5 D4. S3, S4 and the pool on the other cells (small)

S3 and S4: Astra divides the whole residual by g3 x g4 = 1.58 (classic9), 1.79 (mega12, multigrids), 1.89 (mega16),
1.4 (Killer); I divided Nightmare-level solves by 1.5 and the request by 1.1 for S4, weighted by the solve share (0.85 of
samples, 0.7 of local search, 0.6 of Killer's structure work). Both are Projections of an unmeasured chain share, and the
effective factors differ by less than 25 %. Reconciled: 1.65 on solve-dominated requests, 1.45 on Killer. Pool on
eight-attempt boards: Astra 2.8 / 2 (median / p95), mine 3.2 (2.4 - 3.6); reconciled 2.8 to 3.0 on the median, 2.2 to 2.5
on the p95. These parameters explain the 10 to 30 % differences on Killer and Greater-Than, where neither analysis
credits S1.

### 1.6 Availability

Astra (Astra §4.4) keeps the default attempts and asks how much the effective yield must rise: GD's 21 % needs k = 10
for 90.5 %; per sample opportunity, p = 2.37 % (96 opportunities), 4.68 % (48), 9.15 % (24). I (Opus §5.5) raised the
attempts to what the budget allows (OD-S4): classic9 Nightmare needs about 72 attempts at p = 2.9 % per attempt for 88 %,
which phases 1 and 2 make affordable inside 10 s. The arithmetic is the same (`1 - 0.79^10 = 90.5 %`,
`1 - 0.971^72 = 88 %`): both say about ten times more effective opportunities.

Agreed position: at the default attempts, no phase changes the exact-hit rate except through S1's p (SM2). With OD-S4,
phases 1 and 2 alone bring classic9 and wordoku Nightmare near 90 % inside 10 s. With the budget filled after all phases
(reconciled times of §5), mega12 needs a per-attempt p gain of about 4 to 5, mega16 about 4 to 6.6, the multigrids about 5
to 8. Astra is right that 0 hits in 7 deep occurrences is not p = 0, and that the plan's "p / c at least 3 times" is
undefined at zero observed hits (§2 item 20).

### 1.7 Hard to Master, Hell 1

Agreement. S1 should stay off where today's hit rates pass (Astra's class F; my IG-S-OPUS-Q9); those cells change only by
S3 and S4 (1.25 to 2.5 times) and, on the p95, by the pool. Hell 1 is vacuous today in both analyses; neither gives more
than a sensitivity (Astra 1 / 2 / 4 times the Nightmare work, mine 1 to 3 times the Nightmare row). Astra's point that an
empty tier has no frontier (floor = allowed) makes S1 inapplicable to a vacuous level (§2 item 4).

---

## 2. Astra's findings and risks against mine

| # | Astra's finding (Astra section) | Status | Evidence, comment |
|---|---|---|---|
| 1 | "1,296 solves per sample" is an upper count; refused groups already leave the pool (S1) | confirmed, also mine | Opus §2.2; `digger.js:605, 786-788` |
| 2 | Frontier entries need an epoch: evaluate at the snapshot or recheck uniqueness at the final parent (S1) | confirmed, also mine | Opus S1 gaps |
| 3 | A capped uniqueness count is unknown, not ambiguous: it cannot be pruned as final (S1) | confirmed, new to me | the plan's "else: not unique, final" must exclude it; Killer's check already returns `{ unique: false, unknown: true }` on a cap (`generator/js/variants/killer.js:522`) |
| 4 | An empty tier makes floor = allowed: no crossing exists; keep the vacuous treatment (S1) | confirmed, new to me | follows from the plan's A = F + T; applies to Hell 1 today |
| 5 | "S3 may give Hell 2" (plan) is ambiguous: S3 cannot add a tier while keeping ratings (S1) | confirmed, new to me | |
| 6 | Killer's cage search and Greater-Than's sign dig are separate; a cell frontier does not speed them (S1) | confirmed, complements mine | S1 inside `digStage` still reaches Killer's cell dig (`killer.js:1010-1019`, IG-S-OPUS-Q10): Killer's puzzles change, its time does not |
| 7 | Floor tests need `assumeUniqueness: false`; the floor holds `uniqueRectangle` (S2) | confirmed, also mine | IG-S-OPUS-Q3; `digger.js:293-316` |
| 8 | Candidate restoration must recompute support from all givens; OR-ing a digit back can undo another clue's exclusion (S2) | confirmed, also mine | Opus S2 ("per-candidate elimination counts or a rebuild of the peers of g"); `core/js/engine/constraints.js:353-390` |
| 9 | Finders call `ctx.check()`; `OBJECTIVE_STEPS` (100,000) and Killer's 30,000-check slices count them (S3) | confirmed, also mine | IG-S-OPUS-Q4 |
| 10 | S3 footprints: a placement changes every peer (`constraints.js:365`), recursive Nishio states, multi-cage Rule of 45 and inequality footprints, negative chain certificates (S3) | confirmed, new detail | widens S3's work; supports whole-grid chain scans (Opus S3) |
| 11 | The solver's `run.score` is not the calibrated score; use a callback; reject reasons change (S4) | confirmed, also mine | Opus S4, IG-S-OPUS-Q5 |
| 12 | At most four lanes; `file://` one lane; keeper and sample precedence and `unsound` need a serial-equivalence contract (S5) | confirmed, also mine | Opus S5 |
| 13 | S5b: per-sample quotas change paths; models must be rebuilt or sent with their derived data, cage and inequality setup included (`generator/js/engine/pipeline.js:269-365`) (S5) | confirmed, new detail | |
| 14 | S6 needs checkpoints owned across workers; device-dependent results against the cache and history (S6) | confirmed; the cache and history part is mine (IG-S-OPUS-Q12), checkpoint ownership is new | |
| 15 | S7: a per-restart ceiling still allows unbounded restarts; bound the total; S7 belongs to the version (S7) | confirmed; the version part is mine, the total ceiling is new | `generator/js/engine/full-grid.js:241-261` |
| 16 | S8: `SG.cache` already pre-generates; its 20 entries cannot back a 100-entry history (S8, §3.2) | confirmed; the pre-generator is mine (IG-S-OPUS-Q11), the capacities are new | `generator/js/ui/cache.js:49` (`LIMIT = 20`), `generator/js/ui/history.js:20` (`LIMIT = 100`) |
| 17 | S9: Killer and Greater-Than row and band permutations break cage connectivity and sign adjacency (S9) | **confirmed; corrects my S9** | `killer.js:212` (cages are "connected groups"), `isConnected` `killer.js:528`; `generator/js/variants/greater-than.js:21` (a sign joins orthogonal neighbours). Only the geometric symmetries keep both. My sentence "transformations listed are validity-preserving" is wrong for these two variants |
| 18 | S9: a finite bank needs diversity, option coverage and exhaustion rules (S9) | confirmed, new | |
| 19 | S10: Amdahl on the remaining kernel share; the likely case fails the 1.5 x gate (S10) | plausible, new | Projection |
| 20 | SM2's "p / c at least 3 times" is undefined at zero observed hits (mega12, mega16 deep 0 / 7) (§5) | confirmed, new | my per-cell break-even gain (Opus §4.4 item 4) is one way to state the gate |
| 21 | Wire readers turn an absent `exact` into false (§3.2) | confirmed, new | `pipeline.js:336-351`; matters for S6 results and old wires |
| 22 | History stores configurations only; no generator-algorithm version in history or the cache key (§3.2) | confirmed, also mine | IG-S-OPUS-Q7 |
| 23 | Qualification is serial (`generator/tests/qualify.js`); 81-cell boards need 10 s, larger ones 30 s (§0, §3.2) | confirmed, also mine | IG-S-OPUS-Q6 |
| 24 | Do not divide the quick suite by request factors (§4.5) | confirmed, also mine | Opus §4.2 |
| 25 | S1 + S2 divisor 5 to 8 (§4.1) | **disputed** | §1.2 |
| 26 | Pool 2.8 on the whole residual of two-attempt boards (§4.1) | **disputed** | §1.3 |
| 27 | classic9 f = 0.65 (§4.1) | **disputed** (small) | §1.4 |

Counted: 11 repeat or complement mine (1, 2, 6 to 9, 11, 12, 22 to 24); 13 are new to me in whole or in part (3 to 5, 10,
13 to 21); 3 are disputed (25 to 27).

My risks that Astra does not raise, still standing:

- **The score window** (Opus §2.5): exact Nightmare today is one Nishio plus at most about 1,400 to 1,550 points of other
  work, so phase A at the full floor (forcing chains included) tends to cross the frontier above the band. A cheap floor is
  the natural design (IG-S-OPUS-Q2); MS07's weights change the window (about 220 to about 590 points) and may move p more
  than S1 does.
- **S4 has no bound** for the proposal objective or for Hell 2 (`max` infinite).
- **A proposal-only top tier** as a cheap SM2 baseline (IG-S-OPUS-Q1), and **OD-S4 before S1** on 81-cell boards
  (IG-S-OPUS-Q8).
- **The stale `COSTS` table** of `cache.js` (mega16 Nightmare 700 ms against about 105 s measured); Astra's IG-S-ASTRA-Q7
  touches it ("refreshed cost admission").

---

## 3. Questions

| Astra | Mine | Status |
|---|---|---|
| IG-S-ASTRA-Q1: floor without uniqueness-assuming techniques; frontier distinction | IG-S-OPUS-Q3 | same question; merge |
| IG-S-ASTRA-Q2: frontier semantics; a total deterministic budget beyond K_F | IG-S-OPUS-Q1 (related) | the total budget is new; support. It also bounds §1.2's per-sample cost |
| IG-S-ASTRA-Q3: S3 and check-count cap boundaries | IG-S-OPUS-Q4 | same; merge |
| IG-S-ASTRA-Q4: S7 in the versioned phase, with a total ceiling | none (Opus S7 gap) | new as a question; support |
| IG-S-ASTRA-Q5: OD-S2 and 120 s active time against wall time; qualification and the pool | IG-S-OPUS-Q6 | same; Astra adds the guard change my S5 gap noted; merge |
| IG-S-ASTRA-Q6: history entries without stored puzzles | IG-S-OPUS-Q7 | same; merge |
| IG-S-ASTRA-Q7: S8 as an extension of `SG.cache` | IG-S-OPUS-Q11 | same; merge, keeping the `COSTS` refresh |
| IG-S-ASTRA-Q8: S9 diversity, exhaustion, geometry-only transformations | none | new; support (§2 item 17) |
| none | IG-S-OPUS-Q2, Q5, Q8, Q9, Q10, Q12 | not in Astra's list; Astra's class F matches Q9's intent |

Merged: 8 + 12 - 6 overlaps = 14 questions.

---

## 4. What the measurement phase must settle here

- **SM1** (per sample kind and stage, on the frozen catalogue): the time of an accepted floor test, a refused floor test
  at each floor level, a DFS uniqueness check and a full solve, at 81, 144, 256 and 369 cells. These four numbers decide
  D1 (the table of §1.2) before any S1 code exists.
- **SM2**: per frontier sample, the counts of refused tests per floor level, DFS checks, frontier entries, full solves
  used and `deepen` calls, with p, against each current sample kind separately. Gate on the per-cell break-even gain or
  on absolute verified hits per CPU second (Astra), not on a ratio over zero hits.
- **SM5**: on mega16 Nightmare (two attempts), wall time of the samples and of the local search separately at 1, 2 and 4
  workers, S5a and an S5b prototype. Decides D2.
- **The R5 split again** for classic9 and wordoku after phase 1 (D3), and the OD-S4 attempt sweep (Opus SM6) for their
  availability.

---

## 5. Reconciled before/after speed table

Reading rules.

- *Today:* Measured, failing request at the default work (the ceiling a no-hit request pays), Node on the EPYC bench.
  Sources: **R5** = MS05r4 R5 cell, n = 12 (`docs/difficulty-v3/evidence/MS05r4/selection.json`); **I5** = MS05b3
  per-request I5 (`docs/difficulty-v3/evidence/MS05b3/`); **deep** = MS05r5m deep records, n = 7
  (`docs/difficulty-v3/evidence/MS05r5m/`); **CV3** = MS05b3 CV3, maximum of two; **GD** = MS05r6b, 21 / 100. Stage shares:
  MS05r5p segments (`docs/difficulty-v3/evidence/MS05r5p/`) and the R5 regression (Opus §2.3).
- *After:* Projection with §1's reconciled parameters. S3 x S4: 1.65 (1.2 - 2.75) on solve-dominated requests, 1.45 on
  Killer. S5a: min(4, attempts) lanes on attempt-level work, local search included: 3.0 for eight attempts, 2.8 for four,
  1.8 for two (p95 2.2 to 2.5; 1.6 for two). S5b: 3.0 on the samples. S1 + S2 divisor on the samples: 1.0 (81 cells), 1.2
  (mega12), 1.5 (butterfly), 2 (samurai, sohei, flower), 3 (mega16). Coordination 0.05 s (0.1 s on the p95). After all
  phases the p95 is the median times 1.15 to 1.3 on the large boards (today's ratio plus the pool's spread).
- *First phases* = plan phases 1 and 2 (S3, S4, S5a: same puzzles). *All phases* = plus phase 3 (S1, S2, S5b). S6 to S10
  add no compute speed to a cold request. *Range* = high-benefit to low-benefit median after all phases.
- *Confidence:* M = both analyses within about 25 % and the mechanism checked in the code; L = depends on SM1 / SM2; VL = no
  basis. *Source of the after numbers:* this review's parameters, with the two phase-1 values for comparison.

| Cell | Today median / p95 (source); exact hits | After first phases | After all phases | Range after all | Confidence | Source of the after numbers |
|---|---|---|---|---|---|---|
| classic9 Nightmare (8 attempts) | 4.91 / 5.72 (R5, n = 12); 21 / 100 (GD) | 1.05 / 1.5 | 1.05 / 1.5 | 0.36 - 2.3 | M; L for phase 3 | §1.2, §1.4; Opus 1.1 / 1.3 and 1.2 / 1.4; Astra 1.16 / 1.92 and 0.58 / 0.97 |
| wordoku Nightmare (8) | 5.0 / 5.5 (I5, n = 20); 4 / 20 | 1.05 / 1.45 | 1.05 / 1.45 | 0.37 - 2.4 | M; L | as classic9 |
| killer Hard (8) | 4.8 / 6.5 (I5, n = 20); 0 / 20 | 1.2 / 2.1 | 1.2 / 2.1 | 0.8 - 4.8 | M | §1.5; Opus 0.93 / 1.3; Astra 1.41 / 2.41 |
| killer Expert (8) | 10.8 / 14.7 (I5, n = 8); 1 / 8 | 2.7 / 4.7 | 2.7 / 4.7 | 1.7 - 10.8 | M | Opus 2.1 / 2.9; Astra 3.14 / 5.35 |
| killer Master (8) | 12.5 / 23.4 (I5, n = 8); 2 / 8 | 3.1 / 7.4 | 3.1 / 7.4 | 2.0 - 12.5 | M | Opus 3.1 / 5.8; Astra 3.61 / 8.44 |
| killer Nightmare (8) | 17.8 / 30.0 (I5, n = 8); 1 / 8 | 4.4 / 9.5 | 4.4 / 9.5 | 2.8 - 17.9 | M | Opus 4.4 / 7.5; Astra 5.14 / 10.81 |
| jigsaw9 Expert (8) | 0.92 / 2.44, max 325 (I5, n = 20); 90 % or more | 0.42 / 1.1 | 0.42 / 1.1 | 0.2 - 0.92 | M; the 325 s tail VL (S7, SM3) | Opus p95 0.6 - 0.8; Astra class F 0.74 / 1.95 |
| jigsaw9 Nightmare (8) | 0.95 / 2.33 (I5, n = 20); 90 % or more | 0.43 / 1.0 | 0.43 / 1.0 | 0.12 - 0.95 | M | Opus p95 0.5 - 0.8; Astra 0.453 / 1.24 and 0.244 / 0.645 |
| greaterThan Expert (8) | 2.4 / 14.2 (I5, n = 10); 90 % or more | 0.57 / 4.0 | 0.57 / 4.0 | 0.3 - 2.4 | M | Opus 0.48 / 2.8; Astra 0.69 / 4.83 |
| greaterThan Nightmare (8) | 9.3 / 19.2 (I5, n = 10); 90 % or more | 2.1 / 5.4 | 2.1 / 5.4 | 1.2 - 9.4 | M | Opus 2.3 / 4.8; Astra 2.53 / 6.50 |
| mega12 Nightmare (4) | 23.72 / 25.24 (deep, n = 7); 0 / 7 | 5.2 / 7.0 | 4.2 / 5.5 | 1.0 - 11 | M; L | Opus 5.1 / 5.4 twice; Astra 4.80 / 7.17 and 1.64 / 2.46 |
| mega16 Nightmare (2) | 104.11 / 116.95 (deep, n = 7); 0 / 7 | 35 / 44 | 9.8 / 11.7 | 3.1 - 26 | M; L | Opus 41 / 46 and 12 / 14; Astra 32.45 / 41.35 and 4.16 / 6.57 (5.4 with D2) |
| samurai Nightmare (2) | 26.74 (CV3, maximum of 2); 0 / 2 | 9.0 / 10.2 | 4.5 / 5.2 | 1.8 - 9.8 | M; L | Opus 11 and 6.5; Astra 8.86 / 10.09 and 2.33 / 3.29 (3.3 with D2) |
| sohei Nightmare (2) | 27.49 (CV3); 0 / 2 | 9.3 / 10.5 | 4.6 / 5.3 | 1.9 - 10.1 | L | samurai's stage shares transferred (both analyses) |
| flower Nightmare (2) | 23.07 (CV3); 0 / 2 | 7.8 / 8.8 | 3.9 / 4.5 | 1.6 - 8.5 | L | as sohei |
| butterfly Nightmare (4) | 32.82 (CV3); 0 / 2 | 7.1 / 9.1 | 5.2 / 6.8 | 1.6 - 13 | L | as sohei, four attempts |
| Hard to Master: classic9, jigsaw9, mega12, mega16, multigrids | 0.019 - 3.05 / 0.068 - 3.05 (CV3, I5); 90 % or more on most | x 1.25 - 2.5 (S3, S4); the p95 also by the pool | unchanged: S1 off | x 1 - 4 | M | Opus x 2 - 4; Astra x 1.25 (class F) |
| Hell 1, every board | 0.04 - 5.2, vacuous tier (CV3) | not comparable | no estimate; sensitivity: the Nightmare row x 2 (1 - 4) once MS07b gives a tier | | VL | both analyses: no defensible number |
