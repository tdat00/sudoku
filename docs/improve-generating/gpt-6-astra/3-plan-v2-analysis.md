# Improve generating: version 2 and its addendum

Independent analysis by Astra (SA2), 2026-11-15.

Reviewed plan: `adb7184`. Source reading: the `rating-v3` worktree at
`7ab77b1a1330b6c94bffbc905cf86cac4f6a77c6`. This is phase 1, before the cross-review.
I have not read the other analyst's phase-1 analysis.

No engine, generation, test, benchmark or qualification run was made. Calculations below only read recorded
JSON. No git command was run and no production file was changed.

## 1. Conclusion

The addendum makes the right large correction: the feature no longer has the old Nightmare problem.
Do not spend the frozen round reproducing a failed search experiment for cells whose native path now passes.
Keep the version/history work, a selectively scheduled attempt pool, and the full-grid tail work. Profile the
remaining expensive cases before choosing a solver optimisation.

The five candidates need substantial pruning:

- **K1:** park the proposed cross-step negative cache. A completed negative depth-2 trial reads every open
  cell, not merely the cells it changes. The proposed conservative footprint usually invalidates immediately.
- **K2:** a sound implementation experiment, but measure copying first. The current code already reuses its
  per-depth buffers; eliminating allocations per trial is not a new saving.
- **K3:** park. A different proof order or intrinsic work count is not licensed by a generator version.
- **K4:** useful as a requiredness diagnostic and possibly a search-direction experiment, not an established
  cheap rating filter. The existing proposal oracle excludes **all chains**, not just the Hell 1 tier.
- **K5:** drop as stated: combination masks, changed-cage propagation and MRV are already implemented.

The attempt pool remains useful for completed failures and later-attempt hits. It cannot turn the 112 observed
shallow Hell 1 results into exact puzzles. Its CPU cost was **not bounded by 1.6 times** in the provisional
experiment: individual first-attempt hits cost 4.39 and 4.13 times the serial CPU.

## 2. Evidence and its limits

Pointers used below are repository-relative:

| Short name | Evidence |
|---|---|
| Q | `docs\difficulty-v3\qualification-checkpoint-2026-11-15.md`, its JSON, and `evidence\MS07e\qualification\*.json` |
| Q-table | `docs\difficulty-v3\evidence\MS07e\gq-summary.md` |
| C | `docs\difficulty-v3\chain-window-2026-11-15.md` |
| R3 | `docs\improve-generating\evidence\phase0\provisional-r1\report-r3.md`, including its errata |
| Smoke | `docs\improve-generating\evidence\phase0\smoke-rating-v3-8b70875\smoke-report-r2.md` |

**Measured** means a stored observation, not a new measurement. **Derived** means arithmetic or an implication
of the inspected control flow. **Projection** means an explicit assumption. Projection ranges are scenarios,
not confidence intervals or new p95 measurements.

Q ran on the MS07d runtime, with four independent requests in parallel. Its `--jobs=4` is **not** a
four-worker pool inside each request. It is an incomplete checkpoint: 129 of 135 cells, 4,311 requests,
89 observed qualification passes, no merged checkpoint and **no live offer change**. Forty is the first-round
target, not the number actually run in every cell. Early stops and the Wordoku expansion matter.

R3 is another runtime and catalogue, with three paired requests per headline cell and one request per profile.
Its timings and shares must not be relabelled as measurements of the present source.

## 3. Answers to section 9.5

### A1. Targets on the current source

The numbers in the addendum mostly reproduce Q correctly. The following is the useful division of work:

| Target | Current observation (Measured) | What this feature can address |
|---|---|---|
| classic9, Wordoku, mega12, Samurai, Sohei, Flower, Butterfly Nightmare | 40/40 exact in each executed cell; p95 0.26, 0.44, 1.05, 7.56, 7.59, 5.92, 1.97 s respectively | Non-regression controls, not a reason for frontier digging or an attempt-count increase |
| mega16 Nightmare | Four pilot requests, four exact; 4.8-26.5 s, mean 11.8 s; no qualification shard | Retain its missing validation. A pilot is not a pass and does not establish a p95 |
| Greater-Than Master | 40/40 exact, median 0.744 s, p95 14.478 s against 10 s | A genuine latency target; establish whether its long requests use later attempts |
| Greater-Than Normal | 40/40 in Q, p95 9.627 s; the separate CV6 Normal timing assertion still fails | Margin and regression target; do not confuse the two budgets or seed cohorts |
| Greater-Than Expert | Not qualified; pilot 1/2 exact at about 3 and 15 s | Keep explicitly unresolved. It is missing from the addendum's target table |
| Killer Hard / Expert | 0/14 and 1/14 exact; p95 6.58 and 17.77 s | Failure-time savings are possible; the weight/requiredness decision Q-MS07e-1 belongs to difficulty-v3 |
| Killer Master / Nightmare | 5/13 and 19/24 exact; p95 22.78 and 24.90 s | Both latency and availability remain open. Speed alone preserves completed requests' exact flags |
| Hell 1, nine executed variants | 0/112 exact; every returned puzzle is in band and shallow | Reduce the cost of failure, or improve candidate selection after the final tier exists. New findings and weights remain difficulty-v3 work |
| Unexecuted Hell 1 cells | mega12 36.5 s; Greater-Than 37.6-40.1 s; Butterfly 38.3-39.5 s; mega16 censored by the 120 s guard | Missing measurements, not inferred completed-request times |
| Easy and the named mid-level shortfalls | Q's shallow misses, generally inexpensive | Availability/selection/calibration investigations, not evidence for a speed optimisation |
| Jigsaw Expert's exceptional seed | The old request was censored at 240 s in IG-S08; Q's different 40 seeds max at 2.63 s | Keep S7. The unchanged unbounded full-grid path is not disproved by those 40 seeds |

Two corrections are important. mega16 Expert's p95 of 9.69 s is against **30 s**, not 10 s; it is near the
exact-hit threshold, not the time threshold. Also, Hell 2's checkpoint hits are currently vacuous with respect
to its tier. They are not evidence that the final Hell 2 problem is solved.

MS08-MS16 add finders; MS17b and MS18 settle the catalogue, qualification and release. A failure's ownership
must be rechecked there. In particular, "shallow" does not by itself prove a weight bug rather than a
candidate-selection problem. The feature must not repair it by weakening requiredness.

### A2. Which slow requests used multiple attempts?

The stored qualifier rows do not say how many attempts a successful request consumed. A long exact request
can be one expensive attempt. Neither the cell's configured `attempts` nor its elapsed time answers that.

There is a narrower inference available from the source. `generateSteps` in
`generator\js\engine\digger.js:2060-2184` breaks the outer loop only on an exact result. Therefore a normally
completed, non-exact request exhausted its configured attempts. This is a **Derived control-flow fact**, not
a recovered `stats` measurement; it gives no per-attempt duration.

The following counts are derived from Q's individual rows using `ms > cell.budget`:

| Cell | Requests above its qualification budget | Completed misses: all configured attempts | Exact requests: attempt count unknown |
|---|---:|---:|---:|
| Greater-Than Master | 4 | 0 | 4 |
| Greater-Than Normal | 1 | 0 | 1 |
| Killer Expert | 8 | 8, each with 8 attempts | 0 |
| Killer Master | 8 | 8, each with 8 attempts | 0 |
| Killer Nightmare | 8 | 5, each with 8 attempts | 3 |
| diagonalX Hell 1 | 9 | 9, each with 8 attempts | 0 |
| Hyper Hell 1 | 9 | 9, each with 8 attempts | 0 |
| Jigsaw Hell 1 | 8 | 8, each with 8 attempts | 0 |
| Killer Hell 1 | 9 | 9, each with 8 attempts | 0 |
| Samurai Hell 1 | 6 | 6, each with 2 attempts | 0 |
| Sohei Hell 1 | 1 | 1, with 2 attempts | 0 |

Killer Hard and mega16 Expert have no over-budget row in Q. Classic9, Wordoku and Flower Hell 1 also have none;
they fail on exactness. Pilots are not included in this table.

The three slow exact Killer Nightmare requests are indices 6, 15 and 18, at 33.690, 24.903 and 13.252 s.
In particular, its p95 belongs to an **exact** request. Accelerating only the five known exhausted misses
does not lower that p95. The addendum's 9-10 s p95 is conditional on information that was not recorded.

Record in the next targeted measurement:

1. Attempts started, consumed and discarded; the attempt and sample/local/structure origin of the first exact
   keeper entry; its canonical ordinal, not merely its arrival time.
2. Per-attempt and per-sample stage times, quota use, stop reason and best-candidate changes; full-grid and
   extra-structure time separately.
3. Pool-ready and cold request wall time, host CPU including speculative work, worker startup/cleanup, and
   the outer `jobs` and inner pool width separately.
4. Finder calls including negative/capped calls, clone bytes/time, propagation time and check-site ordinals.

The pipeline already exposes `attempts`, `timings` and `work` (`pipeline.js:253-266`); the qualifier discards
them. Instrumentation should retain these before adding invasive observers. Q's four Greater-Than Master
outliers, and the three Killer Nightmare rows above, are named diagnostics, not a representative new sample.

### A3. K1/K2 time, footprint and equal-check proof

**Time by finder and stage is unknown on these Hell 1 requests.** Final `techniqueCounts` report findings
used, not unsuccessful finder calls inside removal oracles. Zero `nishioDeep` steps in the returned puzzles
does not mean zero time in that finder. Conversely, the old 53-81% chain share does not establish a new
`nishioDeep` share.

C supplies only fixture costs: `nishioDeep` used 5,184 and 775 units on two positives and 177 on a negative,
with p95 at most 10.5 ms in that fixture experiment. Those are not generation profiles.

**K1's footprint problem is already visible without a run.** In
`core\js\engine\tech-chain.js:643-722`, a negative depth-2 `refutes` call scans all cells for candidate counts
2 and 3, possibly repeatedly. It reads every open cell even when it changes none. An elimination elsewhere
can create a newly eligible nested trial. A write set, or merely the cells reached by successful propagation,
is not a sufficient negative-cache dependency. Nested elimination also calls full `constraints.propagate`.
The conservative cross-step footprint consequently includes the changed open cell on the next solver step.
For these completed negative trials, the expected conservative cross-step hit rate is essentially zero.
This does not prove that every depth-1 subtrial has a global footprint; that finer design is unmeasured
and cannot inherit the proposed x2-5 factor.

A more limited possible experiment is reuse on **identical states**, for example the repeated shallow scan
before the deep Nishio window, or the strong-link graph shared by short and long forcing calls. That is not
the proposed cross-step cache, and no gain is assigned to it here.

Check parity is demanding but not mystical:

- `refutes` calls `r.ctx.check()`, tests `r.work >= r.workLimit`, then increments work and propagates.
- Propagation extensions also call the inherited budget directly. Replaying only `ctx.check()` misses these
  checks, including Killer's generation guards.
- A null finder result can mean a complete negative, an empty window, a work cap or a swallowed
  `budget.exceeded` in `measured`. Only the appropriate completed result is cacheable.
- Cached work cannot be charged in one lump when a limit would bind inside it. Replay the reference
  sequence or recompute that entry. Preserve the first finding, units, check sites, failure boundary and
  `onPatternWork` result, not only the final score.

**K2 has a cleaner proof.** `model.cloneState` copies two typed arrays and `unsolvedCount`. `refutes` already
keeps one reusable buffer per nesting depth. A trail can replace the copies while leaving every trial,
propagation queue order and check unchanged. It must restore candidates, values and `unsolvedCount` in
`finally`, through contradictions and both kinds of cap, and leave the propagation queues and extension
scratch clean. The write sites include `createContext.restrict`, `runCore`, `assign`, `place` and `eliminate`
in `constraints.js`, not just the three exported entry points named in the addendum.

Copying is about `8 * N` bytes per trial, only 2,048 bytes at 256 cells. Whether trailing beats the existing
typed-array copies depends on the number of changed cells and the cost of instrumenting every write.

### A4. What the current digger already filters

| Path | Current behaviour and anchor | Relation to K4 |
|---|---|---|
| Ordinary Stage A | `techniqueOracle`, `digger.js:294`; allowed techniques, no uniqueness assumptions, solved and below the upper score bound | It proves solvability within the allowed set, not that the requested tier is necessary |
| Ordinary Stage B | `removalObjective:719-746`; bounded solve, typed `tierUsed`, target-policy preference | It favours use of a tier, but this restricted proof is not canonical requiredness |
| Proposal Stage A | `digStageSteps:913-942`; guarded DFS uniqueness | No requiredness filter |
| Proposal Stage B | `removalObjective:689-713`; removes every technique whose group is `chain`; favours the stuck result, otherwise its score | Broader and cheaper than the Hell 1 floor. Being stuck here may mean only a short chain is needed |
| Candidate acceptance | `rateCounted`, keeper and `difficulty.requiredOf` | Canonical rating and requiredness still decide exactness |

`difficulty.certifyFloor:412-435` already implements the reference floor check. It is not called by generation.
For a Hell 1 experiment, derive the floor from `spec.floorTechniques` rather than hard-coding
`nishioDeep` or excluding a group. Match canonical uniqueness assumptions and the frozen floor-prefix
contract. MS08-MS16 may change which IDs belong to the tier.

A solved floor proves "not required" under that contract. A stuck or budget-limited screen does **not** prove
an exact hit: the full canonical rating, band, requiredness and uniqueness checks remain.

K4 is not automatically cheaper. On a shallow candidate, the canonical solver already finishes using only
the floor. A floor solve does the same work; on a candidate that needs the tier, doing the floor and then
restarting the canonical solve adds work. Reusing the completed floor report or prefix can avoid duplication,
but does not by itself speed the same candidate set. The possible benefit is **steering toward different
candidates**, which must be measured as verified exact hits per request and per CPU second.

Keep the validated best-effort keeper while experimenting. Rejecting every shallow candidate with no retained
fallback could turn today's valid approximate answer into no answer, contrary to S6's purpose.

### A5. What replaces the Nightmare SM2 screen?

Remove the mandatory 40-grid frontier screen, restricted-floor sweep and higher-attempt sweep for the
currently passing Nightmare cells. This is a priority decision, not a statistical refutation of S1/S2.
Confirm the cell list on the final catalogue, preferably reusing compatible MS18 records rather than paying
for an identical baseline twice. Keep mega16's missing qualification explicit.

Replace the fixed old population by a small, approved sequence:

1. Frozen-source receipt, repaired adapters, actual native/no-op parity and capability inventory.
2. Baseline/late-attempt diagnostics on the residual cells; pool widths 1/2/4, including early-hit controls.
3. Stage/finder profiles on ordinary Hell 1, a multigrid Hell 1 and Killer; the named Greater-Than tail as a
   separate diagnostic. Record copy cost and read dependencies before implementing K1/K2.
4. A narrow Hell 1 floor/proposal comparison if it can answer K4 after the final tier is known.
5. Only then author a new request-level experiment for a promising mechanism, with held-out roots, explicit
   CPU and wall budgets, and complete canonical verification.

Do not roll the provisional round's unused time into this work, or substitute this sequence into the old
manifest without a new approval. The old frozen-round cost projection prices a different source and workload.

### A6. Reachable time versus reachable hits

Section 5 gives the scenarios. In short: the attempt pool plausibly makes completed failures two to three
times shorter, but the Killer Nightmare and Greater-Than Master tails are not established multi-attempt
work. Hell 1 remains **zero demonstrated exact hits**. The censored mega16 Hell 1 request has no completed
runtime or eventual outcome to extrapolate.

The best present recommendation is not a claimed fivefold Hell 1 kernel improvement. It is a bounded,
profile-led experiment with no positive availability forecast until the final finders and candidate yields
are known.

## 4. Candidate assessments and costs

For a kernel taking fraction `f` of a request, sped up by `s`, with additional overhead `u` as a fraction of
the old request, the sensitivity is `F = 1 / (1 - f + f/s + u)`. No current Hell 1 profile supplies `f`.
The ranges below are **Projections**, with assumptions stated, not independent multipliers to multiply.

| Candidate | Mechanism, risk and estimated gain | Build and measurement cost (Projection) | Recommendation and dependencies |
|---|---|---|---|
| K1 | Cache a complete negative trial and its dependencies/check transcript. Full read footprints invalidate the proposed depth-2 cross-step entries. With no saved trials and an assumed 0-10% lookup/tracking overhead, the factor is about 0.9-1.0; the proposed request x2-5 has no basis. Identical-state reuse is a separate, unpriced idea | A dependency-counting diagnostic might be 100-200 test-side lines. A complete cache/proof is roughly 600-1,200 implementation lines plus 400-700 test lines across solver, constraints and instrumentation; not justified before a positive reuse count | **Park** the cross-step cache. Revisit only after MS08-MS16 and the frozen profile; never cache a cap as a negative |
| K2 | Trail writes instead of copying the two state arrays. If copying is 2-20% of Nishio time, 50-90% of it is removed, and trail upkeep costs 0-6%, the kernel factor is roughly 0.95-1.22. Even at an assumed 80% request share the favourable request factor is only about 1.17. Neither share is measured | Roughly 350-700 implementation and 250-500 test lines, 4-6 affected source/test areas. First measure copy bytes, changed cells and copy time. Then 12 requests (six pairs) on selected cells plus guard-binding fixtures; a 6-50 s request anchor means roughly 1-10 minutes of payload, not a charged budget | **Profile, then prototype** if copying is material. Shared constraints affect both apps and other finders; freeze and full check/undo parity are prerequisites |
| K3 | Pack BFS starts and share edge work. It must still choose the reference shortest proof and tie order, preserve the serial work-cap boundary and parent checks. A raw kernel x5-20 is only a guess; with assumed request share 10-50%, even that gives about x1.09-1.90 overall | Roughly 1,000-2,000 implementation and 600-1,200 test lines, with a large capped/tie/budget corpus and browser work. Much larger than a loop optimisation | **Park**. A proved-identical virtual-accounting implementation is conceivable, not supplied. Any changed canonical findings/units go to difficulty-v3 or a later rating feature, not merely generator version 2 |
| K4 | Replace the all-chain preference by a true floor observation or candidate-ranking signal. For the same candidate set, a separate floor solve plus canonical restart is normally no faster. If duplicated prefixes add 0-25% of request work, `1/(1+overhead)` gives x0.8-1.0, not a yield forecast. No finite speed-up-to-an-exact-hit can be estimated from zero observed hits | Roughly 100-250 test-side implementation lines plus focused verification/cap tests. Record floor outcome, proof validity, canonical disposition and retained fallback on a small frozen cohort before a request arm | **Prototype the diagnostic**, not a default filter. Depends directly on the MS08-MS17 floor/tier and the prefix contract; protect the keeper and count all screen work |
| K5 | Combination-mask filtering and MRV are already present. The stated additions give x1.0. If a distinct future optimisation really sped the whole DFS share by x1.3-2 and the old 45% share still held, Amdahl gives only x1.12-1.29 per request; neither premise is new evidence | No implementation for the duplicate proposal. A separately justified same-result micro-optimisation might be 100-300 lines plus parity tests; first obtain the Killer stage profile | **Drop as stated**. `combo-table.js:36-75,151-282` precomputes masks and propagates changed cages; `dfs-solver.js:125-164` already uses MRV and ascending digit order. Stronger shared propagation can alter Nishio findings as well as DFS, so it may be a rating change |

K2's measurement estimate is a payload envelope, not permission to run it. Add wrapper grace, calibration,
validation and possible censoring when a real plan is approved. A 40-seed qualification is additional work.
Do not copy the same corpus for every speculative optimisation: gate the cheap diagnostic first.

K5 also needs the right guard terminology. `UNIQUE_NODES` and the repair/analysis limits are reached through
budget checks, including propagation checks, not only by counting DFS branching nodes. Preserving MRV alone
is not a guard-equivalence proof.

## 5. Current-source speed scenarios

All times are seconds. The measured column is Q's engine-request time at outer jobs 4; it is not browser
latency. `median / p95` refers to that measured cohort, often early-stopped. Pilot ranges are explicitly
different statistics.

The version/history work adds no intended search gain. The phase-1 projections below use:

- Passing, early-hit cells stay on a serial/lazy-start path: no gain is credited.
- Exhausted eight/four-attempt failures: an illustrative factor 1.8-3.2, transferred from old pool results.
- Two-attempt failures: 1.66-1.96, the old observed two-attempt range.
- Killer failures: 2.07-2.65, the old observed Killer range.

These are **capacity scenarios**, not validated factors on the new source. A dominant individual attempt,
startup, contention or CPU throttling can leave the result close to the serial time or worse. For fixed
attempt durations a pool cannot beat either total work divided by its width or the longest required attempt.

| Cell | Today (Measured): median / p95; exact | Phase 1, selective S5a (Projection) | Phase 2, native-kind S5b/S7/S6 (Projection) | Best candidate mix / verdict |
|---|---|---|---|---|
| classic9 Nightmare | 0.140 / 0.260; 40/40 | About unchanged | No new search enabled without need | Keep as a regression control; no new offer claim |
| Wordoku Nightmare | 0.106 / 0.444; 40/40 | About unchanged | Same | Same |
| mega12 Nightmare | 0.186 / 1.049; 40/40 | About unchanged | Same | Same; do not substitute the old 23 s baseline |
| Samurai Nightmare | 1.830 / 7.558; 40/40 | Median about unchanged; tail benefit unknown | No assumed gain from the old sample share | Keep current path unless a new bottleneck is measured |
| Sohei Nightmare | 1.516 / 7.587; 40/40 | Same | Same | Same |
| Flower Nightmare | 1.899 / 5.917; 40/40 | Same | Same | Same |
| Butterfly Nightmare | 0.537 / 1.970; 40/40 | Same | Same | Same |
| mega16 Nightmare | Pilot mean 11.8, range 4.8-26.5; 4/4 | Mean scenario about 6-12 if useful work spans both attempts; not a new mean measurement | About 4-6 is an ideal multi-sample scenario only; unchanged near 12 remains plausible | No p95 or offer verdict. Measure consumed sample count and the longest sample before promoting S5b |
| Greater-Than Nightmare | 1.326 / 5.181; 40/40 | Median about unchanged; tail not apportioned | No new search needed | Protect the pass |
| Greater-Than Master | 0.744 / 14.478; 40/40 | Median about unchanged; p95 scenario 4.5-14.5 depending on late-attempt work | No supported additional factor | Can cross 10 s only if the tail has exploitable parallel work |
| Killer Hard | 5.355 / 6.578; 0/14 | 2.0-2.6 / 2.5-3.2 | No supported additional factor | Faster failure, still no exactness benefit |
| Killer Expert | 10.243 / 17.773; 1/14 | Roughly 3.9-4.9 / 6.7-8.6 for the exhausted-failure distribution | No supported additional factor | Weight/availability decision still blocks an offer |
| Killer Master | 11.792 / 22.781; 5/13 | Roughly 4.4-5.7 / 8.6-11.0 for the exhausted failures | No supported additional factor | Time may approach 10 s; hits still far below 90% |
| Killer Nightmare | 4.108 / 24.903; 19/24 | Median may stay near 4.1; p95 scenario 9.4-24.9, with its slow exact requests unclassified | No supported additional factor | Do not promise 9-10 s p95. Faster misses alone leave p95 unchanged |
| classic9 / Wordoku Hell 1 | 6.254 / 8.069 and 5.546 / 8.061; 0/14 each | About 2.0-3.5 / 2.5-4.5 and 1.7-3.1 / 2.5-4.5 | Yield unknown; K4 is not credited as a speed multiplier | K2, if its favourable assumed share holds, adds at most about 17% in this scenario; still zero demonstrated hits |
| Jigsaw / Hyper / diagonalX Hell 1 | 11.083 / 15.498, 10.524 / 13.111, 23.783 / 25.909; zero hits | p95 scenarios 4.8-8.6, 4.1-7.3, 8.1-14.4 | S7 addresses a different, rare full-grid tail | No exact-hit gain from the pool |
| Killer Hell 1 | 26.066 / 50.222; 0/9 | 9.8-12.6 / 19.0-24.3 | No supported additional factor | Even the pool scenario misses the 10 s p95 budget |
| Samurai / Sohei / Flower Hell 1 | 28.895 / 37.925, 23.382 / 33.126, 24.208 / 27.429; 0/14 each | p95 scenarios 19.4-22.8, 16.9-20.0, 14.0-16.5 | Extra sample parallelism unmeasured | Plausible time margin under 30 s, not offerability |
| mega12 / Greater-Than / Butterfly Hell 1 | Pilots 36.5; 37.6-40.1; 38.3-39.5; no hits | Illustrative completed-request times 11.4-20.3; 11.8-22.3; 19.5-23.8 | No measured composition | Pilot scenarios, not percentiles |
| mega16 Hell 1 | Censored beyond the 120 s guard | Unknown | Unknown | Do not divide a timeout into a completed-time forecast |

The phase-2 column deliberately does not multiply the old 90.5% sample share into every request. If one
sample contains the work and is already exact, parallelising other samples cannot shorten that sample.
The old ideal formula requires a sufficiently long independent consumed prefix and tolerable quota changes,
not just a large aggregate "samples" fraction.

For a future K2-like kernel change, apply `1 - f + f/s` to the **post-pool critical work**, not blindly to the
old serial profile. None of K1-K5 currently supplies a measured post-pool factor. Phase 3 therefore has no
bankable numerical increment; phase 4's bank has no priced supply of verified roots. One fast lookup is not
evidence that a sufficiently large, diverse, frozen-catalogue bank exists.

## 6. The version-2 body: evidence fidelity and design

| Item | Assessment |
|---|---|
| Six S5a medians, paired wall ranges and exact counts in section 0 | Agree with R3, as historical measurements. Samurai's earlier 26.74 s is correctly labelled a maximum |
| CPU "up to 1.6" | **Correct.** 0.98-1.58 are cell medians of paired CPU ratios. Classic9 seed 2 is 4.39; Greater-Than seed 1 is 4.13; classic9's ratio of cohort CPU totals is 1.67. This directly changes OD-S5's description |
| Partial S3 "0.91-1.04 per request" | **Correct the range.** Cell medians are about 0.91-1.02; all paired incremental values span 0.89-1.04. R3 makes that distinction. The conclusion of no material gain stands |
| S1/S2 figures | Agree: 192 frontier grid trials and 64 native grid trials, two samples per trial; 45/64 F1 samples with empty unique frontiers; F1 CPU/native mix 0.12-0.38; isolated S2 CPU ratio 1.01-1.12. Cheap failures are not successful-puzzle throughput |
| 74-331 solves, stage shares, finder shares | Correctly recorded as old, small-sample observations. Keep the 1,296/10x premises withdrawn; do not leave their old formulas as the operative model in version 3 |
| S7 and Greater-Than diagnostic | Agree with the censored full-grid attribution and the rejection of solve-first Nightmare. The 240 s record does not size a full-grid work ceiling |
| S5a theoretical gain | With the specified maximum width 4, the general ceiling is `min(4,A)`, not the "up to 8" phrase for 81-cell boards |
| S6 "no empty answer after 120 s" | Only when a validated checkpoint exists. A timeout in the first full-grid search can have no candidate to return |
| S3 and S10 | Preserve complete findings and count-based check behaviour, including checks through propagation. The current broad chain share is unmeasured |
| Phase ordering | Version/history and selective S5a can be designed early; shipping still needs the frozen source, serial non-regression and pool invariance. Do not retain a mandatory, obsolete S1 gate in front of this work |
| Versions and storage | Keep generator version distinct from rating version and wire/history schema. Phase 1 stores version-1 puzzles in history v2; phase 2 changes generation identity. Cache keys, stock and bank identity must follow the full effective request |
| Goldens and determinism | Preserve puzzle hashes for equal-result work. Schema fixtures need their own planned update when wire/history v2 lands. Generation Steps, keeper ties, targets and ordered events are part of the proof, not merely final givens |

S5a also needs a fresh independence audit of the current target-policy and Killer paths. For example,
`killer.js:907-913` uses the global keeper to decide whether to pay for a uniqueness count. Independent RNG
forks alone do not prove equal guarded behaviour. The provisional 18 matching pairs are evidence, not a
universal proof for the revised source.

### D1-D10

| Decision | Position |
|---|---|
| D1 | Agree with baseline before selection. Retarget the profiles and screen as A5 says; reuse compatible final records where possible |
| D2 | Agree that native-kind S5b need not wait for S1. Do not build it merely because the old profile had many samples; measure the consumed prefix first |
| D3 | Agree to defer assumptions until the frozen rates are known. Any surviving experiment needs preregistered cluster units, margins and handling of zero-hit/censored cohorts |
| D4 | Agree: baseline for the four extensions, not four extra frontier experiments |
| D5 | Agree to end the Nightmare solve-first arm; 706-709 should not be run just to complete an obsolete manifest |
| D6 | Agree to split all four chain IDs now in the diagnostic design. No large per-finder frontier profile before a viable frontier target exists |
| D7 | Agree on a deterministic total full-grid ceiling across restarts. Measure its tail, preserve seeded restart order, and report a controlled failure when no valid checkpoint exists |
| D8 | Agree on real engine guard-boundary coverage before any skipping ships. K2 must also preserve direct inherited-budget checks and undo on failure |
| D9 | Agree on the width sweep. A small Hell 1 floor diagnostic for K4 should be independent of the retired Nightmare S1 screen; the old broad floor sweep remains deferred |
| D10 | Agree: source preparation and repair first, separately costed, then the measurement budget |

**Repair scope:** Smoke is a partial capability smoke, not parity. Three adapters fail textually; a fourth,
`frontier-hooks`, has a stale `refusalReason` exposure despite applying. Two suites started and timed out.
Only one native loader row completed; neither no-op row ran. The snapshot is the r2 harness, not r3.
Repair, capability checks and semantic reproof must use the final source and a pinned harness, without
falling back to the old engine. The coming finder additions make a full old-pack rerun budget premature.

## 7. Owner decisions

| Decision | Options and evidence | Recommendation |
|---|---|---|
| OD-S5, CPU cost | Unconditional eager pooling; selective/lazy pooling; serial default. The quoted 1.6 is not a ceiling, and the new workload contains many early hits | Approve the mechanism conditionally, not a blanket 1.6x bargain. Default to the early-hit path, cap width at 4, and require per-cell cold/ready/CPU results on target devices |
| Harness repair and frozen budget | Price the whole obsolete pack now, or approve a bounded repair/capability task and price a new population afterwards | The latter. Separate engineering work, pure checks, bounded parity work and timed measurement receipts; no automatic use of the old remaining budget |
| Retargeting phase 0 | Repeat the old Nightmare screen, or retire it for passing cells and buy the residual diagnostics | Retire it as a priority decision, with reopening only after the final baseline identifies a real target |
| S5b | Build on old sample shares, or wait for current consumed-prefix profiles and a serial quota reference | Wait. Compare native serial, attempt pool, serial quotas and pooled quotas so an algorithm change is not attributed to parallelism |
| K3 or stronger shared propagation | Change intrinsic findings/units here, or keep those changes with difficulty-v3/a later rating feature | Do not authorise a rating change under this feature's generator version |
| S9 / OD-S3 | Wait for the final catalogue, or introduce a separately versioned pre-freeze content product | Wait. The addendum's "before the finders arrive" is not authorised by a feature that starts after MS18e. No promise of 200 roots without a supply and verification budget |
| Existing guard/history decisions | IG-S-Q01/Q02/Q13 already decide stored history and pooled qualification with serial reporting | Keep them. State the agreed file-mode qualification caveat explicitly; a timed puzzle is not the seed's canonical cache/export entry |

## 8. Questions for Fable before version 3

### IG-S-Q19: Which check changes belong to which version?

Section 9 says a changed work/check sequence belongs to difficulty-v3, while IG-S-Q03(b) allowed a family
that cannot preserve checks to move under the generator version with a new generator guard unit.
Does section 9 supersede that option, or distinguish intrinsic finder units from generator-only quotas?

Recommendation: explicitly separate them. The 50,000-unit finder semantics, findings and canonical rating
cannot change under a generator version. A deliberately new generator-only quota policy can, with the
reference canonical solver retained and newly qualified outputs. No silent relaxation of either contract.

### IG-S-Q20: What does the whole-request 1.5x kernel gate compare?

Is the phase-3 factor required per selected target cell, and against the same post-phase-2 generator and
scheduler, or against the old serial baseline? Which wall/CPU statistic is binding?

Recommendation: name the cells and paired statistic after profiling, use the same generator, quotas and
pool on both sides, report CPU and cold/ready wall separately, and retain non-regression controls.
Do not require a Nishio optimisation to speed already-cheap cells that do not exercise it, or satisfy the
gate by counting S5's gain twice.
