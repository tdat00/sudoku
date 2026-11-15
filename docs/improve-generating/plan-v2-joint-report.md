# Improve generating (Sudoku): joint report on plan version 2 and section 9

Analysts: Opus (claude-opus-5.5, SA1) and Astra (gpt-6-astra, SA2).
Report author: Astra. 2026-11-15.

**Status:** input to plan version 3, not an implementation approval, qualification result or run authorisation.
Joint positions incorporate both phase-1 analyses and both cross-reviews. Remaining differences are named.
The four analyst files are retained unchanged.

**Scope and evidence.**

- `plan.md` at `adb7184`; line references below refer to that version.
- `gpt-6-astra\3-plan-v2-analysis.md`, `gpt-6-astra\4-cross-review-of-plan-v2-analysis.md`,
  `claude-opus-5.5\3-plan-v2-analysis.md`, `claude-opus-5.5\4-cross-review-of-plan-v2-analysis.md`.
- The corrected provisional report:
  `evidence\phase0\provisional-r1\report-r3.md` (**R3** below), on the MS05e-era runtime.
- The partial compatibility smoke:
  `evidence\phase0\smoke-rating-v3-8b70875\smoke-report-r2.md` (**Smoke**).
- The rating-v3 checkpoint:
  `..\difficulty-v3\qualification-checkpoint-2026-11-15.md` and
  `..\difficulty-v3\evidence\MS07e\qualification\*.json` (**Q**).
- `..\difficulty-v3\chain-window-2026-11-15.md` and the S-OD7/S-OD8 decisions in
  `..\difficulty-v3\clarifications-resolved.md`.

No engine, generation, test, profile, benchmark or qualification run was made for this report, and no git
command was run. Numbers are from committed evidence or the analysts' read-only calculations.

**Labels:** **M** = measured record; **D** = derived arithmetic or a source-control-flow implication;
**P** = projection with assumptions. Projected ranges are scenarios, not confidence intervals.

## 1. Verdict

**Revise v2 into a smaller, retargeted v3. Do not implement its old scope or price its old frozen manifest
unchanged.**

Section 9 correctly changes the main premise: the rating-v3 source already solves the old Nightmare
availability problem on the executed mainstream cells. The measured generator improvement remains S5a's
attempt pool on an older source. On the newer workload it is chiefly a tail/failure-time item, with many
early hits that can lose time and spend unnecessary CPU.

The recommended direction is:

1. Keep generator-version/history/wire preparation and **selective S5a**, with mandatory early-hit protection.
2. Retire the mandatory S1/S2 Nightmare screen and the higher-attempt sweep on cells that pass the final
   baseline. This is prioritisation, not a proof that frontier search can never help.
3. Keep S7's full-grid robustness work and S6's validated-checkpoint fallback. Treat S4 as a bounded,
   versioned prototype, and S5b as conditional on actual parallelisable sample work.
4. Profile the residual slow cases. K2 is the first conditional kernel prototype; K4 is only a small
   post-freeze diagnostic. Park K1, drop non-equivalent K3 from this feature, and **drop K5 as already present**.
5. Make no additional bankable kernel multiplier or exact-yield promise. No bank is designed before the
   final catalogue and a priced supply/verification proposal.

The feature remains after difficulty-v3 closes at MS18e. Its future measurement/qualification decisions do
not amend active difficulty-v3 tasks, the six unlaunched cells' routing, or the official final population.

### What the cross-review settled

| Point | Joint disposition |
|---|---|
| K5 | Sum masks, changed-cage propagation and MRV already exist. Opus withdrew its treatment of K5 as new |
| K2 | Existing per-depth buffers avoid allocation per trial. Neither analyst now claims a bankable current-source factor |
| K4 | A small frozen floor/proposal diagnostic may proceed if approved; no default filter or speed credit |
| Pool factors | Use the old exhausted-request pair ranges as labelled sensitivities: 2.07-3.43 on the measured four/eight-attempt examples; 1.66-1.96 on two-attempt examples; Killer specifically 2.07-2.65 |
| Killer Nightmare | Its p95 is an exact request. Faster misses alone do not lower it |
| Missing telemetry | Keep actual attempts, timings and work first; add origin, per-sample/stage, CPU and finder observations as needed |
| Harness | Narrow the repair to retained consumers; three textual failures plus a stale exposure is not a parity pass |

Two corrections to the analyst records are carried here without rewriting them. Astra's phase-1 CPU row
used "**Correct.**" as an edit instruction; as a verdict that is misleading: "up to 1.6x" is **incorrect as a
bound**. S-OD7 is now settled, not an open in-v3 recalibration question.

## 2. What "today on rating-v3" means

The timing baseline in this report is **Q**, the MS07e checkpoint on the MS07d runtime, not a new run of the
moving branch. The reviewed source at `7ab77b1` added owner decisions to the addendum's `7fe14fb` snapshot,
without changing the engine used for that checkpoint. MS08-MS18 can change it again.

Q ran four independent requests side by side (`--jobs=4`), not four workers inside each request.
It contains **129 of 135 cells and 4,311 requests**, with early stops and one expansion. Forty was the
first-round target, not the actual count in every cell. The incomplete checkpoint publishes **no live offer
change**. "Pass" below means the observed checkpoint verdict, not final release qualification.

The branch is named rating-v3, but these development records still carry rating-version-2 labels.
Source/catalogue identity, not that label alone, separates Q from the older provisional R3 measurements.

**S-OD7:** Killer Hard and Expert remain withheld until a later calibration, with no weight recalibration
inside v3. They remain in the full final qualification, with raw verdict and owner withholding reported
separately. This decision does not cover Killer Master/Nightmare. S-OD8 changes the quick-tier disposition,
not the qualification rules.

## 3. Joint answers to Fable's section 9.5

### Q1. Which cells are this feature's targets?

| Group | M: checkpoint/pilot evidence | Joint treatment |
|---|---|---|
| Passing Nightmare controls | classic9, Wordoku, mega12, Samurai, Sohei, Flower, Butterfly, Greater-Than and the other executed real-tier non-Killer cells pass | Preserve their path; no mandatory frontier experiment or larger attempt count |
| Demonstrated time target | Greater-Than Master: 40/40 exact, p95 14.478 s against 10 s | Attribute the four slow exact requests before projecting pool gains |
| Margin / separate regression | Greater-Than Normal: 40/40, p95 9.627 s; its separate CV6 Normal timing failure remains | Keep the different budgets/cohorts distinct |
| Missing qualification | mega16 Nightmare; mega12/mega16/Greater-Than/Butterfly Hell 1; Greater-Than Expert | Keep all six explicit. Their pilots are not qualification; active difficulty-v3 routing remains MS18c |
| Killer Master / Nightmare | 5/13 and 19/24 exact; p95 22.781 and 24.903 s | Both latency and availability remain open. No blanket attribution of their misses to S-OD7 |
| Killer Hard / Expert | 0/14 and 1/14 exact | Respect S-OD7. A speed improvement would not automatically re-offer them |
| Hell 1 | Nine executed cells: 0/112 exact, all returned puzzles in band and shallow | Diagnose remaining cost and yield after the final tier exists; pure speed does not fix those completed misses |
| Easy / mid-level misses | Q's named shallow shortfalls | Not evidence for this speed programme; tier/weight/availability ownership remains with the relevant feature |
| Jigsaw tail | Old seed 1111: censored at 240 s in IG-S08, 99.5% in full-grid search; Q's different 40 seeds max at 2.63 s | Keep S7. The newer cohort does not disprove the exceptional path |

mega16 Expert is **not** close to its time budget: 9.69 s p95 is against 30 s. Its 36/40 exact hits are at
the hit-rate threshold. Hell 2's currently vacuous requiredness is not evidence that its eventual tier is solved.

### Q2. Which over-budget requests are multi-attempt?

The qualifier does not record actual attempts. The source supplies one limited inference:
`digger.generateSteps:2060-2184` breaks its outer loop only on an exact result, so a normally completed
non-exact request exhausted its configured attempts. This gives no per-attempt duration.

The following are **D**, from Q rows satisfying `ms > cell.budget`:

| Cell | Over-budget requests | Completed misses: all attempts | Slow exact requests: attempt count unknown |
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

The slow exact Killer Nightmare requests are indices 6, 15 and 18, at 33.690, 24.903 and 13.252 s.
The p95 is therefore not a known exhausted miss.

The future recorder should keep `result.attempts`, `timings` and `work` (already exposed by
`pipeline.js:253-266`), plus the selected candidate's origin, attempts started/consumed/discarded,
per-attempt/sample stages, quotas and stop reasons. Record cold and ready wall time, host CPU including
speculation, and outer jobs separately from inner pool width. A returned fallback's origin need not equal
the total number of consumed attempts.

### Q3. K1/K2 time, footprints and equality

**Current Hell 1 stage/finder shares are unmeasured.** Final technique counts do not measure failed finder
calls inside the search. V8 sampling can locate hot functions without repairing the old profile adapter,
but does not by itself supply stage/origin attribution, family call/cap counts, dependencies or check traces.

For K1, a completed negative depth-2 root trial scans the candidate count of every open cell. Its conservative
read footprint includes the cell changed by the next solver step, even when propagation wrote nothing there.
That defeats the proposed cross-step root cache. Depth-1 or identical-state reuse is a separate, unmeasured
possibility, not support for a request factor of 2-5.

Check parity must follow the actual order: `refutes` calls `ctx.check()`, tests its work cap, then increments
work. Propagation extensions can also call the inherited budget directly. Preserve every applicable check
site and cap boundary; a capped/budget-ended null result is not a completed negative.

K2 is more straightforward but not automatically profitable. `refutes` already reuses one scratch buffer
per depth. `cloneState` copies two arrays and `unsolvedCount`, about `8*N` bytes per trial, only 2,048 bytes
at 256 cells. A trail must cover all writes, restore state and scratch through errors/caps, and leave the
same trials, propagation order and checks. Measure copying and changed-cell volume before implementation.

**Settled:** profile first; prototype K2 only if material; no bankable factor.
The previous x1.2-2 kernel guess and Astra's x0.95-1.22 overhead sensitivity are not measurements to average.

### Q4. Does the digger already run K4?

| Path | Current filter | Relation to K4 |
|---|---|---|
| Ordinary Stage A | Technique-bounded, uniqueness-free logical solve; solved and below the upper score bound | Not a requiredness test |
| Ordinary Stage B | `boundedObjective`: restricted solve, score bound, `tierUsed` preference | The restricted proof is not canonical requiredness; no separate proposal-style DFS ambiguity check |
| Proposal Stage A | Guarded DFS uniqueness | No requiredness filter |
| Proposal Stage B | `removalObjective:689-713` excludes **all chain-group techniques** and prefers stuck states | Not the Hell 1 floor: a short chain may suffice |
| Candidate acceptance | Canonical rating and `requiredOf` | Still decides exactness |

`difficulty.certifyFloor:412-435` is the reference floor check; generation does not currently call it.
Use the frozen `floorTechniques`, not a hard-coded `nishioDeep` exclusion, with the canonical uniqueness
assumptions and prefix contract.

The final 0/112 exact results do **not** measure the intermediate screen's pass rate. Floor-stuck candidates
can be above band, unsolved or capped. A solved floor on a shallow candidate does much the same work that
the canonical solver would already do; a separate floor solve plus canonical restart can add work.

**Joint recommendation:** only a small post-freeze floor/proposal diagnostic, independent of the retired
S1 screen. No default filter, speed credit or requiredness shortcut. Keep the validated best-effort keeper,
and record all diagnostic work and uncertain budget exits.

### Q5. Retire S1/S2/SM2, and replace their budget with what?

Retire the mandatory Nightmare frontier screen, its broad floor sweep and the attempt-count expansion for
cells passing the final baseline. mega16's missing qualification remains explicit. A different final failure
can reopen a scoped experiment; no general hypothesis is statistically refuted.

Use the reduced staged scope in section 8: source preparation, compatible baseline reuse, missing work
telemetry, selective pooling/SM5, targeted profiles, S7 tails and a conditional Hell floor diagnostic.
The old frozen scenarios are **not allocated or saved machine hours**. A new manifest and budget follow repair.

**Remaining difference:** Opus would request a bounded preliminary SM5 before the freeze if resources permit;
Astra prefers to wait. Both require explicit authorisation and final-source rechecking. Architecture can be
designed now without authorising a run.

### Q6. What can Hell 1 and Killer reach in time and hits?

Section 5 contains the common scenarios. Old pool factors plausibly shorten exhausted failures, but do not
give the unknown successful-request tail a measured factor. For completed requests, a proved same-result
optimisation preserves exactness. Recovery of a previously censored request has an unknown eventual outcome.

No new offer is demonstrated. Do not turn old failure times into upper bounds for future exact requests:
MS08-MS16 may change both the proof and its cost.

## 4. Candidate table for version 3

Cost classes below are **P, implementation effort**, excluding tests, documentation and broad qualification:
**S** about 100-300 changed lines; **M** about 300-800; **L** about 800-1,600; **XL** larger or a new backend.
They are sizing estimates, not task budgets. Existing private prototypes do not remove production integration
and proof costs.

For a kernel taking fraction `f`, sped up by `s`, with added overhead `u`, the request factor is
`F = 1/(1-f+f/s+u)`. A kernel factor cannot simply be multiplied by its time share.

| Item | Verdict | Expected gain/range on the rating-v3 workload | Cost and measurement | Dependency / contract |
|---|---|---|---|---|
| Version field, history v2, wire v2 | **Pursue** | P: about 1x search time; preserves stored puzzles across later changes | M, storage/cache/wire/UI tests | After closure; ship before generator version 2. Distinguish generator, rating and schema versions |
| S1 frontier dig | **Drop from the mandatory passing-cell scope** | No current-source yield or request factor. Old cheap samples, 0 verified frontier hits, are not successful-puzzle throughput | L if reopened; no automatic 40-grid rerun | Reopen only for a named final-catalogue target and approved gate |
| S2 re-derivation exit | **Park with S1** | Old CPU cost ratio 1.01-1.12, equivalent speed about 0.89-0.99; current gain unmeasured | S/M if reopened, proof/screen tests | Final floor and same canonical acceptance; no standalone speed claim |
| S3 cheap scopes / chain work | **Drop cheap scopes as a speed item; park chain work** | Old partial incremental factors 0.89-1.04; no bankable current chain factor | L, family-specific dependency/check proofs | MS08-MS17 change families; preserve intrinsic units, direct checks and guard boundaries |
| S4 monotone-score exit | **Prototype if the profile warrants it** | P: 1.0-1.1 on bounded-oracle work, not a measured request factor | S/M, score-bound and refusal/log tests | Frozen scoring; generator version 2 for changed refusal/log/wire behaviour |
| S5a attempt pool | **Pursue selectively** | P: old exhausted-example sensitivity 2.07-3.43; two-attempt 1.66-1.96; Killer 2.07-2.65. Early hits may gain nothing or regress | L integration; widths 1/2/4, main-thread, ordered events/keeper, cancellation, CPU/device tests | Frozen source; mandatory early-hit protection; same uncensored puzzle and count-based behaviour |
| S5b sample pool | **Park pending consumed-prefix evidence** | Current range unestablished. Ideal compute factor 1-4 requires sufficient independent consumed work; one long first sample gives no benefit | L/XL, serial quota reference plus pooled quota arm | New generator version; caps/quotas and yield requalified after MS18 |
| S6 anytime result | **Pursue with checkpoint precondition** | About 1x computation; may replace an empty timeout with an already-validated approximate puzzle | M, checkpoint/history/cache/export/guard tests | Stored as timed, never the canonical seed result; no fallback exists before any valid checkpoint |
| S7 full-grid ceiling | **Pursue** | Median gain unmeasured; bounds deterministic work, not wall seconds by itself | S/M plus a frozen node distribution and tail tests | Total work across restarts, explicit unknown/failure, seeded reaction; new generator version |
| S8 local stock | **Park / optional** | No generation-work reduction; a stock hit hides previously paid generation | M/L, storage/idle/cancel/identity tests | Full effective request, versions and resource policy; not a solution to a first request |
| S9 seed bank | **Park for an owner decision** | Delivery avoids search but still needs canonical/structure verification; no priced current root supply or time range | M/L plus separately costed content search and verification | Final catalogue, distinct roots, valid transforms, content identity, novelty and exhaustion; no pre-freeze design commitment |
| S10 WebAssembly | **Park behind profile and whole-request gate** | Historical P: 1.2-2 on the affected kernel only; current request factor unpriced | XL, backend/toolchain, JS fallback, traces/checks, browser/static deployment | Frozen canonical semantics; both apps/script lists as applicable; no independent multiplier over the same kernel work |
| K1 negative Nishio cache | **Park** | Completed negative depth-2 roots invalidate across steps. A no-hit cache plus 0-10% tracking overhead gives a P sensitivity near 0.9-1.0; depth-1 reuse unknown | L proof/cache; small dependency/reuse diagnostic first | Final finder set; complete read footprints and full check transcript; never cache caps as negatives |
| K2 trail and undo | **Prototype only after profiling** | No bankable factor. Example P: copying 2-20%, 50-90% removed, 0-6% upkeep gives kernel 0.95-1.22; at an assumed 80% request share the favourable request factor is about 1.17 | M implementation, substantial shared-state/undo/cap tests; paired saved-corpus pilot before broad runs | Shared constraints affect both apps and finders; freeze and complete equivalence proof |
| K3 bit-parallel chains | **Drop the non-equivalent proposal from this feature** | Fable's raw kernel 5-20 is unmeasured and receives no delivery credit | XL if a distinct proposal is later approved | Changed canonical findings/order/units require the owning rating feature; a future proved-identical design is a separate proposal |
| K4 true-floor screen | **Prototype the diagnostic only** | Yield unknown. For a fixed candidate set, duplicated prefix work of 0-25% gives P speed 0.8-1.0, not a gain; steering benefit unmeasured | S/M test-side observation, snapshot/verification/cap accounting | Final floor/tier and uniqueness premises; canonical acceptance and keeper retained |
| K5 cage masks / MRV | **Drop as already present** | 1x additional gain from adding these existing mechanisms | No implementation. A different idea needs a profile and new scope | `combo-table.js` and `dfs-solver.js` already implement it; stronger shared propagation may change the rating |

Every admitted change keeps canonical rating, requiredness, exactness and uniqueness. Equal-result work
keeps puzzle hashes and needs reference trace/guard tests; schema migration needs its own planned wire/history
fixtures. Generator-version changes receive their own regression/golden/help and qualification task, rather
than silently rewriting E. Cache, stock, recipes and bank content use the full versioned request identity.

S5a's audit must cover more than independent RNG forks. The current target policy and global keeper,
including Killer's conditional uniqueness counts (`generator\js\variants\killer.js:907-913`), need an ordered
merge/equivalence argument on the frozen source. The old 18 matching pairs do not replace that proof.

K2's build/measure boundary matters: copied buffers are reused, and a trail adds writes to hot shared code.
A small paired pilot might contain 12 requests, not a full landscape. At the observed 6-50 s request
anchors that alone is about 1-10 minutes of payload, before validation, wrapper grace and censoring.
It is a **P**, not permission or a charged ceiling. The full frozen package must be priced separately.

The recommended mix therefore has **no priced increment beyond selective S5a today**. S6/S7 improve failure
handling and robustness; K2/K4 remain decision experiments, not multipliers to stack into a headline.

## 5. Speed before and after on rating-v3

**One table, three stages.** M is the Q snapshot in Node, at outer jobs 4; times are seconds.
Where shown, `median / p95` is the recorded cohort, often early-stopped. A pilot is not a percentile.
Passing cells retain the serial/lazy-start path, so their priced range is unchanged.

Phase-1 ranges are **P**, transferring the older pool results under an assumption of comparable, distributed
attempt work. For generic completed four/eight-attempt failures use 2.07-3.43, for Killer 2.07-2.65, and for
two-attempt failures 1.66-1.96. They are **not bounds** on the new runtime: a dominant single attempt,
startup/contention or a weak device can leave no gain or a regression.

The recommended-mix column includes only credited work. "Same priced range" means **no extra factor is
claimed before the conditional experiments pass**, not that kernels cannot eventually improve it.

| Headline cell | Today on the measured rating-v3 snapshot (M) | After phase 1: selective S5a (P) | After recommended mix (P unless noted) |
|---|---|---|---|
| classic9 / Wordoku Nightmare | 0.140 / 0.260 and 0.106 / 0.444; 40/40 each | About unchanged | Same priced range; regression controls |
| mega12 Nightmare | 0.186 / 1.049; 40/40 | About unchanged | Same priced range |
| Samurai / Sohei / Flower / Butterfly Nightmare | p95 7.558 / 7.587 / 5.917 / 1.970; 40/40 each | Median about unchanged; tail benefit unpriced | Same priced range; no obsolete frontier programme |
| mega16 Nightmare | Pilot mean 11.8, range 4.8-26.5; 4/4; no qualification | Mean scenario about 6-12 only if useful work spans attempts | No additional priced factor; S5b requires the consumed-prefix test |
| Greater-Than Master | 0.744 / 14.478; 40/40 | p95 sensitivity about 5.5-14.5, depending on slow hits' attempts | Same priced range; 10 s crossing not established |
| Greater-Than Normal / Nightmare | 1.922 / 9.627 and 1.326 / 5.181; 40/40 each | No median gain credited; tail/margin unpriced | Same priced range; separate CV6 Normal failure retained |
| Greater-Than Expert | Pilot about 3 and 15; 1/2; no qualification | Unknown | Unknown; missing final record remains explicit |
| Killer Hard / Expert | 5.355 / 6.578, 0/14; 10.243 / 17.773, 1/14 | Hard p95 sensitivity 2.5-3.2; Expert slow-miss envelope 3.8-8.6 | Same priced ranges; both remain withheld by S-OD7 |
| Killer Master | 11.792 / 22.781; 5/13 | Known slow exhausted misses: about 4.2-11.0; not a new whole-cell p95 | Same priced range; exact yield still insufficient |
| Killer Nightmare | 4.108 / 24.903; 19/24 | Median may stay near 4.1; conditional p95 sensitivity 9.4-24.9 | Same priced range; no K5 multiplier |
| classic9 / Wordoku Hell 1 | p95 8.069 / 8.061; 0/14 each | p95 sensitivity about 2.4-3.9 | Same priced range; zero demonstrated exact-hit benefit |
| Hyper / Jigsaw / diagonalX Hell 1 | p95 13.111 / 15.498 / 25.909; zero hits | p95 sensitivities 3.8-6.3 / 4.5-7.5 / 7.6-12.5 | Same priced ranges; K2 unpriced |
| Killer Hell 1 | 26.066 / 50.222; 0/9 | p95 sensitivity 19.0-24.3 | Same priced range; still above 10 s in this scenario |
| Samurai / Sohei / Flower Hell 1 | p95 37.925 / 33.126 / 27.429; 0/14 each | p95 sensitivities 19.3-22.8 / 16.9-20.0 / 14.0-16.5 | Same priced ranges; time margin is not offerability |
| mega12 / Greater-Than / Butterfly Hell 1 | Pilots 36.5 / 37.6-40.1 / 38.3-39.5; no hits | Completed-request scenarios 10.6-17.6 / 11.0-19.4 / 19.5-23.8 | Same scenarios, not percentile or offer forecasts |
| mega16 Hell 1 | Censored beyond the 120 s guard | Completed time and outcome unknown | Unknown; do not divide a timeout into a completed-time forecast |
| Jigsaw Expert robustness | Q p95 2.29, max 2.63, 38/40; old exceptional seed separately censored at 240 | No routine gain credited | S7's count ceiling is to be sized; no new seconds forecast |

**Why S5b has no extra number:** a 90% aggregate sample share can be one long first sample. Samples only
parallelise usefully when the consumed prefix contains independent work; quotas can also change the work and
yield. The old 29 s ideal mega16 estimate, or a transferred-efficiency case near 36 s, prices the old source,
not this pilot. A 4-6 s new-source mean remains an unmeasured special case, not the joint plan's expectation.

**Availability:** a same-result speed change preserves the exact flags of completed requests. The nine
executed Hell 1 cells therefore gain no demonstrated exact hit from the pool. Future finders, new search
policies, timed-result recovery and bank content have separate evidence requirements. Node scenarios do not
qualify a browser option, nor override Killer withholding.

## 6. Consolidated corrections for plan version 3

These are corrections to the plan, not edits to historical raw evidence. Some are superseded decisions or
unsupported interpretations rather than arithmetic errors.

| ID | Plan reference | Correction |
|---|---|---|
| JV2-S01 | `plan.md:50,63,192,427-430,556,632` | "Up to 1.6x CPU" is not a bound. Cell-median paired ratios are 0.98-1.58; early-exact pairs reached 4.39/4.13, and classic9's ratio of cohort CPU totals is 1.67 |
| JV2-S02 | `plan.md:51,190,365-367` | Partial S3's cell medians span about 0.91-1.02; all paired incremental values span 0.89-1.04. No material gain in the implemented scope |
| JV2-S03 | `plan.md:63-65` | Full S3 **and S4** were outside the built first-phases scope; do not attribute the entire gap only to S3 |
| JV2-S04 | `plan.md:71,289` | The Nightmare score band did not widen from 220 to 590. If these are effective headroom illustrations, supply their assumptions; otherwise remove them |
| JV2-S05 | `plan.md:138-145,245` | Retire the representative 1,296/10x costing as operative text, as the later erratum already requires. Retaining it as an unqualified model confuses the revision |
| JV2-S06 | `plan.md:404,413-414` | At the specified maximum width four, the capacity ceiling is `min(4,A)`, not eight for 81-cell boards |
| JV2-S07 | `plan.md:194,445-450` | S6 avoids an empty timeout only when a validated complete/unique checkpoint exists; an initial full-grid timeout can have none |
| JV2-S08 | `plan.md:75-76,577-578,653-654,736` | Smoke: three textual failures **plus** the stale frontier exposure, two incomplete suites and no native/no-op puzzle parity. Repair only retained consumers, but do not call the smoke a parity pass |
| JV2-S09 | `plan.md:674-685` | Q ran 4,311 requests across 129 cells, not 40 in every cell, and published no live offers. State checkpoint verdicts, early stops and omissions |
| JV2-S10 | `plan.md:699,714` | mega16 Expert's p95 9.7 s is against 30 s, not a near-limit time failure. Its hit rate is at the threshold |
| JV2-S11 | `plan.md:697-701,721-723` | Add Greater-Than Expert to unresolved targets. mega16 Nightmare is promising in four pilots, not already qualified |
| JV2-S12 | `plan.md:713-718` | Killer Nightmare's p95 belongs to an exact request with unknown attempt count. S5b also needs the number and duration of consumed samples, not only an old aggregate sample share |
| JV2-S13 | `plan.md:698,785` | Q-MS07e-1 was answered by S-OD7: only Killer Hard/Expert are withheld until later calibration, with no in-v3 weight change. Do not generalise it to every Killer level |
| JV2-S14 | `plan.md:725-726`, against `plan.md:110-112` | A bank "before the finders arrive" is not the scope of a feature starting after MS18e. Decide only against the final catalogue and a priced root supply |
| JV2-S15 | `plan.md:750,782-785` | K5's combination masks and MRV already exist; remove the new-mechanism/gain claim. Guard equivalence includes propagation checks, and stronger shared propagation can change canonical Nishio findings |
| JV2-S16 | `plan.md:605-606,709-711` | Early architecture design does not establish rating-independent speed or CPU cost, or authorise SM5. The changed early-hit distribution is precisely why fresh measurement is needed |

The 220/590 illustration has a plausible **D**, but not a fixed-band interpretation. With
`score >= V + 1.25*w + extra`, ideal headroom to 2400 is `275-V-extra` for weight 1700 and
`650-V-extra` for weight 1400. The one-step contribution differs by 375; the actual headroom depends on
empties and other deductions. Opus requests an explicit author clarification; Astra considers removal or
this labelled derivation sufficient.

K1/K2/K3 numbers in section 9 are already labelled hypotheses. They are not measurements to "correct" into
different measured values. The joint decision is to withdraw their use as priced gains until the relevant
mechanism, share and equivalence are established.

## 7. Owner decisions: verbatim texts

These are proposed questions, not recorded approvals. Existing Q01/Q02/Q13 and S-OD7/S-OD8 are not reopened
except for the explicitly requested future-feature protocol detail.

### Decision 1 — OD-S5: pool CPU and enablement

> Choose (A) eager pooling up to four workers, (B) selective pooling up to four with a mandatory early-hit path/head start and serial fallback, or (C) serial until browser evidence. We recommend B, with frozen CPU/cold/ready-wall results before default enablement and a phone-class check before mobile enablement. The observed 1.6x is not a CPU ceiling; individual pairs reached 4.39x and 4.13x.

### Decision 2 — D10/A8: repair before the frozen budget

> Choose (A) repair the old full package now, (B) approve a separately costed, narrowed repair after MS18e on the attested frozen source, then price the measurement round, or (C) defer the feature. We recommend B. Require actual loader parity and capability checks; never fall back to the old engine. No provisional unused time carries over.

### Decision 3 — Hell 1 route / OD-S3

> If Hell 1 still lacks reliable exact yield on the final catalogue, choose (A) bounded diagnosis while it remains unoffered, (B) a separately funded live-search/kernel programme, or (C) a separately costed seed-bank feasibility plan. We recommend A first; consider B only with a specific viable hypothesis, and C only with a priced distinct-root supply and verification plan. No bank design or supply commitment precedes the final catalogue.

### Decision 4 — IG-S-Q02 detail: outer concurrency

> For improve-generating only, confirm (A) inner width four and outer --jobs=1 for paired timing and budget verdicts, with serial controls at outer --jobs=1, or (B) another fixed, non-oversubscribed outer concurrency. We recommend A; any throughput study is separate. This refines IG-S-Q02, does not alter active difficulty-v3 qualification, and does not change its sample counts or the 120 s request-wall guard.

### Decision 5 — Reduced frozen-round scope

> Choose (A) a reduced staged frozen round, (B) the old full package, or (C) deferral. We recommend A: compatible baseline reuse, missing work telemetry, selective S5a/SM5, targeted profiles, S7 tails and a conditional Hell 1 floor diagnostic. Retire the passing-cell Nightmare screen and attempt sweep. Prototype cohorts of 20+ are a costed proposal, not a replacement for official qualification. Approve machine time only after repair.

### Decision 6 — Optional early SM5: remaining analyst difference

> Should SM5 wait for the freeze (A), or receive a separately approved, bounded preliminary run on a named current source, with mandatory frozen rechecking (B)? Opus requests B when resources permit; Astra recommends A. There is no joint request to execute it now. A remains the default unless an explicit scope, priority and machine-budget exception is recorded.

## 8. Recommended frozen-round scope

This is a sequence of decision gates, not a new executable manifest or allocation.

| Step | Retained work | Stop / admission condition |
|---|---|---|
| F0: source and capability | After closure, attest runtime/catalogue, pin the harness, recheck transforms and repair only retained loaders, pool, telemetry and full-grid/approved diagnostic hooks | Unsupported source stops; no old-engine fallback. Prove actual native/no-op parity, not merely textual applicability or self-test success |
| F1: baseline reconciliation | Re-derive final failing/missing cells. Reuse final records only where source, complete request and measurement protocol match; otherwise retain them as context | Missing attempts/stages stay missing, not zero or inferred for exact hits. Outer-jobs-4 timing is not a matched outer-jobs-1 control |
| F2: selective pool / SM5 | Native and widths 1/2/4, early-hit controls, exhausted/late-hit targets, cold/ready timing, host CPU and discarded work; named GT/Killer outliers as diagnostics | Puzzle/keeper/event invariance and serial non-regression. State actual outer concurrency, warm/cold policy and early-hit scheduling |
| F3: profiles | A small, named classic Hell 1, multigrid Hell 1 and Killer cohort, plus the GT tail where needed; family/stage attribution, negative/capped calls, clone bytes/time and checks | Sampling can choose a hotspot; it does not prove dependencies or check equality. No large cache/backend build without a material, eligible share |
| F4: full-grid tail | Frozen node distribution including the known exceptional path, successful attempts, restarts and censored cases | Size a total count ceiling with explicit unknown/failure and deterministic reaction; retain wall backstop and availability checks |
| F5: conditional floor diagnostic | A small post-freeze Hell floor/proposal comparison, canonical disposition and fallback accounting | Independent of retired S1; no production filter or exact-yield forecast from final-request misses |
| F6: admitted prototype only | K2 if copying is material; S4 or native-kind S5b only when their profiles justify them; serial quota reference for S5b | New costed plan, guard-binding equivalence, requiredness/uniqueness and changed-output qualification as applicable |

**Not carried automatically:** IG-S05's old broad Nightmare population, a full frontier composition, the
81-cell attempt expansion, extra extension populations, IG-S09 706-709 catch-up, a full cheap-finder rewrite,
K3, duplicate K5, a bank or S8 background stock.

For selected prototype confirmation, **20+ independent paired requests per cell is a proposal**, after smaller
diagnostic admission and costing. It does not replace the official 40-request first round/possible expansion,
or authorise the six unlaunched difficulty-v3 cells. Those retain their existing MS18c route and ceilings.

The new budget must enumerate commands, populations, stopping limits, validation, startup/cleanup, wrapper
grace and permitted concurrency. Median request times alone are not an upper bound. The closed provisional
allocation and its unused balance are not transferred. Current difficulty-v3 work keeps priority.

## 9. Final questions for Fable

The full questions, options and answer placeholders are appended to `clarifications.md` under
"Questions after plan version 2 (analysts, 2026-11-15)". This numbering supersedes both local cross-review
numberings.

| ID | Question | Status |
|---|---|---|
| IG-S-Q19 | Separate intrinsic finder/rating semantics from generator-only quotas/check policies | Joint |
| IG-S-Q20 | Define the per-cell/comparator/statistic of the whole-request 1.5x kernel gate | Joint |
| IG-S-Q21 | Define/source or remove the 220-to-590 headroom illustration | Opus-only request; Astra supplies the derivation/removal alternative |
| IG-S-Q22 | Pin outer jobs for the future pooled qualification/timing protocol without reopening Q02 | Joint |
| IG-S-Q23 | Choose the scale of residual zero-hit Hell 1 work after the final catalogue | Joint |
| IG-S-Q24 | Confirm reduced recording, compatible baseline reuse and the costed prototype population | Joint; official qualification unchanged |
| IG-S-Q25 | Decide whether to request an exceptional preliminary SM5 before the freeze | Opus-only request; Astra prefers waiting |

The remaining differences do not authorise work. In particular, "Opus-only" is not a joint request to change
the active schedule or a substitute for an owner budget receipt.
