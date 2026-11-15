# Plan version 2 and its addendum (Sudoku): analysis, phase 1

Analyst: Opus (claude-opus-5.5), 2026-11-15. Independent phase-1 analysis; Astra's files not read.

**Inputs.**

- **Plan:** `plan.md` at `adb7184`: version 2 (sections 0 to 8, from `f37bf9c`) and the section 9 addendum.
- **Evidence:**
  - `evidence/phase0/provisional-r1/report-r3.md` (errata E1 to E10);
  - `evidence/phase0/smoke-rating-v3-8b70875/smoke-report-r2.md`;
  - the cover note in `clarifications.md`.
- **Current source:** `rating-v3` at `7ab77b1`. Its `core/js` and `generator/js` equal `7fe14fb`, the commit the
  addendum read; `7ab77b1` adds the owner decisions S-OD7 and S-OD8.
  - `docs/difficulty-v3/qualification-checkpoint-2026-11-15.md`;
  - the MS07e per-request records (`evidence/MS07e/qualification/*.json`);
  - `core/js/engine/tech-chain.js` and `generator/js/engine/digger.js`.

**What was run.** Nothing timed, and nothing generated. One read-only script read the MS07e records for Q2.

**Labels.**

- *Measured* is a record of the round or of MS07e.
- *Derived* is computed from those records.
- *Projection* depends on a stated assumption.

## 1. Answers to section 9.5

### Q1. This feature's targets on `rating-v3`, and what belongs to difficulty-v3

| Group (checkpoint) | Cells and figures | Whose |
|---|---|---|
| Time, with hits at or near 90 % | Greater-Than Master 40 of 40, p95 14.5 s (budget 10 s); Greater-Than Normal p95 9.63 s (3.7 % margin) | **this feature** (S5a, the tail) |
| Time where nothing is offerable yet | every Hell 1 cell (0 exact in 112 requests; p95 8.1 to 50 s); Killer Master and Nightmare (p95 22.8 and 24.9 s, hits 5 of 13 and 19 of 24) | time: this feature, once there are hits. Hits: difficulty-v3 |
| Not launched (cost rule), routed to MS18c | mega16 Nightmare (pilot 4 of 4 exact, 4.8 to 26.5 s); mega16 Hell 1 (120 s guard exceeded); mega12 Hell 1 (36.5 s); Greater-Than Expert (3.0 and 15.0 s) and Hell 1 (37.6 to 40.1 s); butterfly Hell 1 (38.3 to 39.5 s) | the times are this feature's; a qualification run decides |
| Robustness | the unbounded full-grid search (`full-grid.js` unchanged; the 325 s request not reproduced in 40 seeds) | **this feature** (S7) |
| Hits only (sub-second or in budget) | Easy on diagonalX, hyper, samurai, sohei, butterfly and flower (shallow); flower Expert and Master; wordoku Normal; mega16 Expert (36 of 40, exactly the threshold; p95 9.7 s against a **30 s** budget) | difficulty-v3 (levels, tiers, finders) |
| Weights | Killer Hard and Expert: S-OD7 keeps them hidden until a later calibration | difficulty-v3, later |
| Vacuous tier | Hell 2: offered in 11 variants, its requiredness vacuous (MS07b) | difficulty-v3 |

**One correction to 9.1.** mega16 Expert is a hit-rate cell (36 of 40, exactly the threshold), not a time cell.
Its p95 of 9.7 s is a third of its 30 s budget (the record's `budget` is 30,000 ms).

### Q2. S5a on `rating-v3`: which over-budget requests are multi-attempt

The MS07e records carry, per request, `key, index, seed, hit, ms, achieved, score, solved, approximate, exact,
valid`. A miss runs every attempt, so it is multi-attempt by construction. A slow hit is not decidable from
these records.

| Cell (budget, attempts) | Requests over budget | Of which misses (all attempts run) | Slow hits | S5a on the misses (old-source factor) |
|---|---|---|---|---|
| Greater-Than Master (10 s, 8) | 4 of 40 | 0 | 4: 10.2 to 18.6 s | late-attempt hits gain up to x2.6; a long single attempt does not |
| Greater-Than Normal (10 s, 8) | 1 of 40 | 0 | 1: 10.3 s | as above |
| Killer Master (10 s, 8) | 8 of 13 | 8: 11.2 to 22.8 s | 0 | x2.07 to 2.65: 4.2 to 11.0 s |
| Killer Nightmare (10 s, 8) | 8 of 24 | 5: 14.4 to 23.1 s | 3: 13.3, 24.9, 33.7 s | misses 5.4 to 11.2 s |
| Killer Expert (10 s, 8; hidden, S-OD7) | 8 of 14 | 8: 10.2 to 17.8 s | 0 | 3.8 to 8.6 s |
| Killer Hell 1 (10 s, 8) | 9 of 9 | 9: 19.6 to 50.2 s | 0 | 7.4 to 24.3 s |
| diagonalX Hell 1 (10 s, 8) | 9 of 9 | 9: 21.1 to 25.9 s | 0 | x2.5 to 3.2: 6.6 to 10.4 s |
| samurai Hell 1 (30 s, 2) | 6 of 14 | 6: 30.2 to 37.9 s | 0 | x1.7 to 1.9: 16 to 22 s |

**What must be recorded.**

- `result.attempts`: the `PuzzleResult` already carries it (`pipeline.js:262, 334`), but the qualifier does
  not write it;
- the index of the attempt whose puzzle was returned;
- per-attempt wall time with the stage split (samples, local search);
- the local search's `capHit` (the shallow allowance of 256 ratings);
- `budget.exceeded`.

**Two cautions for any S5a projection on these cells.**

- The checkpoint ran `--jobs=4`: four requests side by side on 16 logical cores, so each per-request time
  includes contention. S5a's factors were measured on solo requests.
- A request whose first attempt hits gets slower under S5a (x0.89 to 0.91 on the old pairs). On `rating-v3`
  that is most requests, which makes the head start a requirement.

### Q3. K1 and K2: where a Hell 1 request spends its time; the footprint of a depth-2 trial; equality

**The profile.** No profile exists on `rating-v3`:

- SM1 ran on the old source;
- the `profile` adapter fails on `rating-v3` at a `digger.js` anchor (smoke r2).

The first measurement needs no adapter. V8's sampling profiler (`node --cpu-prof`) on three Hell 1 requests,
through the existing soak or qualify tools, attributed by function: `refutes`, `cloneState`,
`SG.constraints.place` and `propagate`, `scanNishio`, `scanForcing`, `search`, `expand`. This is the method of
Pentomino's PM2. It needs machine time, so not now.

**The footprint, from the code.**

- Each `refutes` call (`tech-chain.js:643`) is one work unit and one `ctx.check()`, after the cap test
  `r.work >= r.workLimit`.
- It copies the whole base state into a pooled scratch (`SG.model.cloneState(base, trial)`, `model.js:458`):
  O(n) per call.
- At depth 2 it loops, until no progress, over **every** open cell with two or three candidates
  (`NESTED_MAX_CANDIDATES` = 3), with a nested trial per candidate.
- So a depth-2 trial reads the candidate count of every open cell on every pass: its footprint is the whole
  open grid.
- The solver applies one step between finder calls. A negative cache of depth-2 trials therefore never hits.

Depth-1 trials (one placement and its propagation) have local footprints and are cacheable. `scanNishio`
(`:685`) re-runs all depth-1 trials before depth 2 on every call, by iterative deepening. That is K1's only
reusable part.

**Can equality of work and check sequence be proved?**

- **K1 at depth 1: yes.** A skipped trial costs exactly one unit, one `ctx.check()` and the cap test at the
  same index. These are cheap to reproduce virtually, as section 3's S3 note describes.
- **K1 at depth 2: not usefully,** for the footprint reason above.
- **K2: yes by construction.** The same trials in the same order give the same units and checks; only the
  copy becomes a trail and undo. A debug-mode deep-equality check after each undo (as Pentomino's `undo`
  check, `deduce.js:482`) gives the test.
- **K2's cost:** it rewrites `SG.constraints.place`, `eliminate` and `propagate`, shared code of both apps.

### Q4. K4: what the digger already filters

Read from `digger.js` at `7ab77b1`:

- **The score-targeted dig** (`boundedObjective`, `:724`):
  - solves with the level's allowed techniques;
  - refuses `ambiguous`, `techniques` (stuck) and `tooHard`;
  - returns the score and `tierUsed`, whether that restricted solve used a technique of the level's tier.
  - The comment (`:682`) is explicit: it "is not the requiredness of the puzzle and costs no solve". MS06's
    target policy prefers `tierUsed` within a pool.
- **The proposal dig of the top tiers** (`:689`): uniqueness by DFS, with the techniques below the chain group.
- **The local search:** an allowance of 256 full ratings after its first shallow state
  (`SHALLOW_SEARCH_DEFAULT`, `:664`).

Requiredness proper is computed only by the canonical rating. So the digger does not run K4's screen;
`tierUsed` is a cheaper proxy.

**What would pass the screen.** On `rating-v3` about none: 112 Hell 1 requests returned 0 exact puzzles, every
result in band and shallow. A candidate that needed `nishioDeep` and lay in band would have been exact.

**Consequences.**

- *As a hit-rate item,* K4 has nothing to select until the floor changes.
- *As a cost item,* it would make the 256-rating shallow allowance cheaper (a solve without `nishioDeep` first),
  shortening failures only.
- *Recommendation:* park K4 until difficulty-v3's finders (MS08 to MS16) change Hell 1's floor. Hell 1's hits
  are difficulty-v3's, as 9.2 says.

### Q5. S1, S2 and the Nightmare SM2 screen in the frozen round

**Drop them now** for every Nightmare cell. Each executed cell with a real tier is 40 of 40 and offered,
except Killer (time and hits). The stop rule of S1 applies at once. S1 is no Hell 1 item before the freeze
either: its premise (cross the requiredness frontier) needs a floor that MS08 to MS16 are still changing.

**What it frees.** IG-S04 and IG-S05 at 2,311 to 15,043 s, and IG-S06 at 5,759 to 103,740 s, in report-r3's
section 12 planning scenarios.

**What replaces it** (Projection, from the checkpoint's times):

1. The frozen baseline of the time-limited and unlaunched cells, with the attempts and per-attempt times of Q2
   recorded, 20 or more requests per cell: about 1 to 2 h.
2. S5a on the same requests, with CPU, the head start, and both `--jobs` settings: about 1 h.
3. V8 profiles of three Hell 1 requests, Killer Nightmare and Greater-Than Master: about 0.2 h.
4. The node distribution of full-grid attempts (S7) on Jigsaw and the variants with a full-grid search: about
   0.5 h.
5. SM5: about 0.2 h.

### Q6. Hell 1 and the Killer levels: time and hits apart

Time is a Projection: the S5a factors measured on the old source, applied to the checkpoint's per-request times.
Hits are measured.

| Cell | Time today (budget) | Time with S5a | Hits today | Hits after this feature |
|---|---|---|---|---|
| classic9, wordoku Hell 1 | p95 8.1 s (10 s) | about 2.5 to 3.2 s | 0 of 14 each | unchanged: needs a proof that requires `nishioDeep` (difficulty-v3's finders) or the bank (S9) |
| hyper, jigsaw9 Hell 1 | 13, 15 s (10 s) | about 4 to 6 s | 0 of 12 each | unchanged |
| diagonalX Hell 1 | 21.1 to 25.9 s (10 s) | about 6.6 to 10.4 s | 0 of 9 | unchanged |
| samurai, sohei, flower Hell 1 | 38, 33, 27 s (30 s) | about 14 to 22 s | 0 of 14 each | unchanged |
| mega16 Hell 1 | over the 120 s guard | still over 60 s (x1.9 at most); needs S5b and K2 | 0 of 1 (pilot) | unchanged |
| Killer Hell 1 | 19.6 to 50.2 s (10 s) | about 7.4 to 24.3 s; with K5 (x1.1 to 1.3) about 6 to 22 s | 0 of 9 | unchanged |
| Killer Nightmare | p95 24.9 s (10 s) | misses 5.4 to 11.2 s; slow hits 5 to 16 s | 19 of 24 (79 %) | unchanged: a weight question |
| Killer Master | p95 22.8 s (10 s) | 4.2 to 11.0 s | 5 of 13 | unchanged |

**Reading.**

- Speed can bring most Hell 1 cells inside their time budgets. The exceptions are Killer, mega16 and possibly
  diagonalX.
- No cell becomes offerable through speed. The hit rates are difficulty-v3's: finders for Hell 1, the
  calibration for Killer (S-OD7).
- Once hits exist, a request ends at its first exact attempt, so the times above are upper envelopes for
  requests that hit.

## 2. The candidates

| Id | Mechanism | Identity risk | Gain on the current source (model) | Cost to build / to measure | Dependence on MS08 to MS18 | Recommendation |
|---|---|---|---|---|---|---|
| K1 | negative cache of `nishioDeep` trials across solver steps | depth 1: exact with virtual charging (1 unit, 1 check, cap test per skipped trial); depth 2: never hits (whole-grid footprint) | only the depth-1 share of `nishioDeep`'s time: unknown, likely small; not x2 to 5 | footprint instrumentation of shared code / a V8 profile first | `tech-chain.js` may change again before MS17b | **park** until the profile shows a depth-1 share worth caching |
| K2 | trail and undo instead of `cloneState` per trial | none if the trail restores the state exactly (debug deep-equality) | the copy is O(n) per trial against a local propagation: x1.2 to 2 on the nishio kernel on 81 to 369 cells; the request gain is that times the kernel's share (unknown on `rating-v3`) | medium; touches `SG.constraints` (both apps) / a V8 profile, then equality on a corpus | the same files may move before the freeze | **prototype after the profile**; propose it to difficulty-v3 if it lands before MS17b |
| K3 | bit-parallel breadth-first chains | changes the work count, hence capped cases: a rating change | x5 to 20 on that kernel (Fable) | - | difficulty-v3's | **drop** from this feature (agree) |
| K4 | a "stuck without `nishioDeep`" screen before rating, for Hell 1 | new generator version; acceptance unchanged | hit rate: none on `rating-v3` (0 of 112 exact); cost: shorter failures only | small | waits for the finders | **park** (Q4) |
| K5 | Killer's uniqueness search: sum masks, fewest-candidate ordering | node order changes the guards (`UNIQUE_NODES` 200,000; `ANALYSIS_NODES` 30,000), so it ships under the version; pure mask speed-ups that keep the node order are identical | DFS 45 % of a Killer request (old source, n 1): request x1.1 to 1.3 | small to medium / a Killer profile | Killer's hit rate waits for S-OD7's calibration | **park** until S-OD7's calibration; masks that keep the order may go with phase 1 |

## 3. The version 2 body

**What section 9 supersedes.** It replaces sections 0.1, 1 and 4 where they name the failing cells and their
times. The reading is accurate: every row of the 9.1 table matches the checkpoint (sections 2 and 5), except
the mega16 Expert row (Q1).

These findings on the body still stand:

| Id | Where | Issue | Correction |
|---|---|---|---|
| F1 | 0.1, S5, 4, 7 (OD-S5) | S5a's CPU is given as "up to 1.6 times", which is the per-cell median. Per pair it reaches x4.39 (classic9) and x4.13 (Greater-Than), on requests whose first attempt is exact (report-r3 section 3). On `rating-v3` most requests are of that kind | state the per-pair maximum; the head start becomes a condition of OD-S5 |
| F2 | 0.2; S1's version 2 note | "the Nightmare window from about 220 to about 590 points": in neither report-r3 nor smoke r2, and not found in the difficulty-v3 documents; the level minima are unchanged (Nightmare 1500, Hell 1 2400 at `f7be90f` and `7ab77b1`) | cite the source, or drop the figure (IG-S-Q19) |
| F3 | 0.2, 5, 8, 9.3 | "three of eight adapters fail": smoke r2 also reports `frontier-hooks` exposing `refusalReason`, which `rating-v3` no longer declares (`frontier-test` fails), no native and no-op puzzle parity (1 of 4 loader rows), and two pure suites timed out | "three fail, one is stale, parity untested". With section 9 the frontier adapters lose their purpose, and a V8 profile replaces `profile` |
| F4 | 6 against D9 | "phase 1 does not depend on phase 0 and may be designed now", yet D9 says phase 1's pool design rests on SM5 | SM5 is rating-independent; run it on the current source when the machine allows (IG-S-Q23) |
| F5 | 0.1 verdict | "1.3 to 2.1 times short ... because S3 has added nothing": S4 is also outside the built scope (E5) | "because full S3 and S4 were not built" |
| F6 | S5b, 4, 9.2 | ideal scaling: at S5a's measured efficiency (0.80 at width 4, 0.90 to 0.96 at width 2) the old mega16 figure is about 36 s, not 29 s. On `rating-v3` the "4 to 6 s" rests on a sample share nobody has measured | label it ideal and give the efficiency case |

**The positions on D1 to D10** (section 5), revised by section 9:

| Decision | Position in version 2 | Assessment |
|---|---|---|
| D1 | baseline first, then S5a, SM1, SM2, the rest | agree on the order. Add the recording of Q2 (attempts, per-attempt times), at least 20 requests per time-limited cell, and drop SM2 (Q5) |
| D2 | no composition where the screen fails; S5b with today's samples on mega16 and samurai | samurai Nightmare now passes (p95 7.6 s), so S5b's composition matters only if mega16 Nightmare or Hell 1 need it after S5a |
| D3 | defer the assumptions and the margin | agree |
| D4 | the four extensions: baseline only | agree; all four pass at Nightmare now |
| D5 | drop the solve-first arm | agree |
| D6 | the chain-family split of SM1 now | agree, as V8 profiles of Hell 1 and Killer (9.3 item 4) |
| D7 | S7's ceiling from a node distribution | agree; make the distribution an explicit frozen step (Q5 item 4) |
| D8 | engine test before any S3 scope | agree; it now applies to K1 and K2 |
| D9 | SM5 in the frozen round; floor probes only if S1 passes | agree; SM5 earlier (F4); the floor probes go with S1 (dropped) |
| D10 | the repair as a costed task before the budget | agree, narrowed to what the reduced round needs: `attempt-pool`, a full-grid probe, the loaders; it starts at the freeze, since MS08 to MS16 will move the anchors again |

**Phases.**

- *Phase 1* (version field, history v2, S5a with a mandatory head start) stands, as a tail and failure-time
  item.
- *Phase 1b* (the attempt sweep on classic9 and wordoku) is moot: both pass.
- *Phase 2*:
  - drop S1;
  - S5b only if mega16 or Hell 1 need it;
  - keep S7 (robustness), S6 and S4.
- *Phase 3* (chain kernels): K2 first, then K1 at depth 1, aimed at Hell 1 once exact puzzles exist.
- *Phase 4:* the bank (S9) becomes the Hell 1 route, if the owner wants Hell 1 before the finders arrive.

## 4. Speed before and after on the current source

`rating-v3` today is the MS07e checkpoint (40 requests per cell, `--jobs=4`). "With S5a" applies the old-source
factors (a Projection). No `rating-v3` request has run with any item of this plan.

| Cell | Today: p50 / p95 (hits) | With S5a (Projection) | With S5a and S5b / K2 (Projection) | Budget | Kind |
|---|---|---|---|---|---|
| classic9 Nightmare | 0.14 / 0.26 s (40 of 40) | unchanged (first-attempt hits; x0.89 to 0.91 without a head start) | unchanged | 10 s | Measured; Projection |
| mega12 Nightmare | 0.19 / 1.05 s (40 of 40) | unchanged | unchanged | 30 s | as above |
| samurai Nightmare | p95 7.6 s (40 of 40) | the tail only | - | 30 s | as above |
| mega16 Nightmare | pilot 4.8 to 26.5 s, mean 11.8 s (4 of 4) | at most x1.9 on two-attempt requests: max about 14 s | mean about 4 to 6 s if samples are about 90 % (Fable) | 30 s | Projection |
| Greater-Than Master | 0.74 / 14.5 s (40 of 40) | 5.5 to 14.5 s, depending on the attempt of the slow hits (Q2) | - | 10 s | Projection |
| Greater-Than Normal | p95 9.63 s (40 of 40) | margin | - | 10 s | Projection |
| Killer Nightmare | 4.1 / 24.9 s (19 of 24) | misses 5.4 to 11.2 s; slow hits 5 to 16 s | K5 x1.1 to 1.3 more | 10 s | Projection; hits unchanged |
| Hell 1 (nine cells) | p95 8.1 to 50 s (0 of 112) | 2.5 to 24 s (Q6) | K2: kernel x1.2 to 2 times its unknown share | 10 / 30 s | Projection; hits unchanged |
| mega16 Hell 1 | over 120 s (0 of 1) | over 60 s | unknown | 30 s | Projection |

## 5. Owner decisions

| Decision | Options | Evidence | Recommendation |
|---|---|---|---|
| OD-S5 (the pool's CPU) | (a) accept as proposed (width at most 4; one lane on `file://`); (b) accept with a mandatory head start and CPU reported per request; (c) wait for browser runs | median CPU x0.98 to 1.58, per pair up to x4.39 and x4.13 on early-exact requests; on `rating-v3` most requests hit at the first attempt | **(b)**. The head start may be in time: the results are identical in any case. Report CPU p50 and p95 per cell in the frozen S5a run, and run a phone-class browser before enabling the pool on mobile |
| The harness repair before the frozen budget (D10, A8) | (a) repair now on `rating-v3`; (b) a costed task at the freeze; (c) test hooks in production under the equal-results phase | smoke r2: three adapters fail, one stale, parity untested; MS08 to MS16 add about 14 finders; section 9 removes the frontier adapters' purpose | **(b), narrowed** (D10 above): repair only what the reduced frozen round uses, at the freeze, costed then |
| New: Hell 1's route | (a) wait for difficulty-v3's finders; (b) design the bank (S9, OD-S3) for Hell 1 now; (c) both: the bank's design after the freeze if Hell 1 stays below 90 % | 0 of 112 exact, all shallow (checkpoint finding 3); difficulty-v3 expects later finders to supply the proofs | **(a), then (c)**: no bank design before the frozen catalogue shows Hell 1's hit rate |
| New: the qualification protocol with a pool | (a) `--jobs=4` with a width of 4 per request (16 threads); (b) `--jobs=1` with width 4; (c) report both | the checkpoint used `--jobs=4`; IG-S-Q02 reads qualification on a pool of width 4 | **(c)** for the frozen round, then (b) as the gate: it matches a user's single request. MS18c's call, with this feature |
| Killer (S-OD7, decided) | - | Hard and Expert stay hidden until a later calibration | K5 parked accordingly |

## 6. Questions for Fable

- **IG-S-Q19.** Where does "the Nightmare window widened from about 220 to about 590 points" (0.2; S1's version
  2 note) come from, and what quantity is it? The level minima in `difficulty.js` are unchanged at both commits.
- **IG-S-Q20.** Which qualification protocol decides a budget once the pool exists: four requests side by side,
  each with a pool of four (the checkpoint's `--jobs=4`), or a solo request with four workers? IG-S-Q02's answer
  does not say.
- **IG-S-Q21.** Version 3's Hell 1 route: does this feature keep Hell 1's time targets (S5a, K2) while hits
  wait for difficulty-v3's finders? Or does version 3 drop Hell 1 until the frozen catalogue shows exact
  puzzles, with the bank as the only design item?
- **IG-S-Q22.** May the frozen baseline record attempts, the attempt of the returned puzzle and per-attempt
  times (the qualifier records none), with 20 or more requests on each time-limited and unlaunched cell? Without
  them S5a's effect on the over-budget cells cannot be predicted.
- **IG-S-Q23.** S5a is rating-independent, and phase 1's pool design rests on SM5 (D9). May SM5 run on the
  current source as soon as difficulty-v3 allows, instead of waiting for the frozen round?
