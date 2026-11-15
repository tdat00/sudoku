# Improve generating (Sudoku): a faster generator for the upper levels

> **Version 3 (2026-11-15), after the analysts' review of version 2 and the owner's decisions.** Version 2 with
> its section 9 addendum is this file at commit `adb7184`; version 1 is at `1437774`. Version 3 folds in the
> joint report on version 2 ([plan-v2-joint-report.md](plan-v2-joint-report.md): its answers, its corrections
> JV2-S01 to JV2-S16, its candidate table and its frozen-round scope), the plan-author answers IG-S-Q19 to
> IG-S-Q25 and the owner decisions IG-S-D1 to IG-S-D6 ([clarifications.md](clarifications.md)). It is written
> as one current document: the layered "version 2" notes and the addendum are merged into the sections they
> belong to. The full mechanism text of the items that version 3 parks or drops stays in version 2.
>
> **Version 3 is smaller and retargeted.** On the rating-v3 source the Nightmare cells that versions 1 and 2
> aimed at pass by the rating change alone. What remains for this feature is tail and failure time, robustness
> and the diagnosis of what still fails.
>
> **No number here is a gate result or an offer.** The generator measurements are provisional and stale (the
> MS05e-era runtime `f7be90f`, three paired seeds per cell). The baseline is a difficulty-v3 checkpoint on a
> source that MS08 to MS18 will still change. The formal gate is `not-evaluable-pre-freeze`.

Plan author: claude-fable-5-2; version 1 on 2026-11-14, versions 2 and 3 on 2026-11-15. Analysts: Opus
(claude-opus-5.5) and Astra (gpt-6-astra). Status: **proposal; nothing implemented in production**; the
prototypes are test-side harnesses under `generator/tests/artifacts/improve-generating/`. This plan is the
input of a later feature ("improve-generating"), which starts after difficulty-v3 closes (MS18e), on the
frozen catalogue; architects turn it into a design and a task pack. Version 3 ran nothing.

Labels: **M** measured record; **D** derived arithmetic or an implication of the source's control flow; **P**
projection with assumptions. Projected ranges are scenarios, not confidence intervals. Sources of the measured
records:

- **R3:** [evidence/phase0/provisional-r1/report-r3.md](evidence/phase0/provisional-r1/report-r3.md), the
  provisional generator round on the old runtime, with errata E1 to E10.
- **Q:** the difficulty-v3 checkpoint `../difficulty-v3/qualification-checkpoint-2026-11-15.md` (MS07e, on the
  MS07d runtime).
- **Smoke:** `evidence/phase0/smoke-rating-v3-8b70875/smoke-report-r2.md`.

## 0. What version 3 changes

1. **The targets are re-derived** (section 2). Passing Nightmare cells become regression controls. The targets
   are the remaining time failures, Killer, the robustness tail and the diagnosis of Hell 1.
2. **S1, S2 and the Nightmare frontier screen leave the mandatory scope**, with the attempt sweep. They return
   only for a named cell that fails on the final catalogue. This is prioritisation, not a refutation.
3. **S5a is pursued selectively** (OD-S5, decided (B)): up to four workers, with an early-hit path and a serial
   fallback. It is a tail and failure-time item. "Up to 1.6 times the CPU" was not a bound and is withdrawn.
4. **No kernel factor is priced.** K2 is a conditional prototype after profiling, K4 a small diagnostic, K1 and
   the chain work parked, K3 dropped from this feature, K5 dropped as already present.
5. **A contract boundary** separates the rating's intrinsic finder semantics from generator-only quotas
   (section 3.1, IG-S-Q19). No generator version licenses a change of the canonical rating.
6. **The kernel gate is defined** (section 5.4, IG-S-Q20): a paired whole-request factor per named target.
7. **The frozen round is reduced and staged**, F0 to F6 (section 5), after a narrowed harness repair
   (IG-S-D2). Its protocol is inner width four at outer `--jobs=1` (IG-S-D4).
8. **Hell 1 stays unoffered and is diagnosed first** (IG-S-D3). No bank is designed before the final catalogue.
9. **Withdrawn statements.** The Nightmare band did not widen "from about 220 to about 590 points": it is
   `[1500, 2400)` before and after MS07 (JV2-S04). The "1,296 solves per sample" and "10 times fewer solves"
   costing is retired (JV2-S05). The other corrections of the joint report's section 6 are taken in where
   their subject appears.

## 1. Goal, non-goals and constraints

**Goal.** An exact (in band **and** required) puzzle of the upper levels in the browser within the existing
contracts: a qualification p95 of 2 s, 10 s or 30 s by size, at least 90 % exact hits, and the app's 120 s
guard. For this feature that means, on the final catalogue:

1. bring the cells that are exact but over their time budget inside it, where pooling or a proved same-result
   optimisation can;
2. shorten failed and late requests, and never answer a timeout with nothing when a valid puzzle exists;
3. bound the unbounded pieces of the search (the full-grid tail);
4. establish, by diagnosis, what the cells without exact yield need (Hell 1), without weakening any threshold.

**Non-goals.** No change to the rating: the canonical rating, technique weights, bands, the requiredness
predicate and the exact predicate stay those of rating v3 as frozen. Every returned puzzle is accepted by the
canonical rating and a uniqueness proof. Shortfalls that are tier, weight or calibration matters belong to the
feature that owns the rating: the Easy and mid-level shallow misses, and Killer Hard and Expert, which stay
withheld until a later calibration (S-OD7).

**Constraints.**

- Classic scripts on the `SG` global, no build step, pages work from `file://` (AGENTS.md). That excludes
  `SharedArrayBuffer` and makes a fetched `.wasm` unreliable; workers with message passing are fine.
- Determinism: a request (variant, level, seed, options) gives the same puzzle on every machine, whatever the
  number of workers. A timed result (S6) is the stated exception and is never the seed's canonical result.
- A changed search path changes recorded recipes, regression hashes and help snapshots, so it ships under a
  generator version (IG-S-Q01).
- This feature's measurement and qualification decisions do not amend active difficulty-v3 tasks, the routing
  of its six unlaunched cells (MS18c) or its official final population.

## 2. Where the generator stands on rating-v3

### 2.1 The baseline, and what it is

Q is a checkpoint, not a final qualification. It ran four independent requests side by side (`--jobs=4`), not
four workers inside a request. It holds **129 of 135 cells and 4,311 requests**, with early stops and one
expansion; forty was the first-round target, not the count in every cell. It publishes no live offer change.
"Pass" below is the observed checkpoint verdict. MS08 to MS18 can change it again.

The cause of the change is the rating, not the search: with the short-chain cutoff at 4, a proof of five or
more links is in the Nightmare tier, so a dug puzzle is usually exact at the first attempt
(`../difficulty-v3/chain-window-2026-11-15.md`). The generator still runs every request in one worker, and the
size-default attempts are still 8, 4 and 2.

### 2.2 Targets and controls (M: Q; treatment: joint)

| Group | Evidence | Treatment in this feature |
|---|---|---|
| Passing Nightmare controls | classic9, wordoku, mega12, samurai, sohei, flower, butterfly, Greater-Than and the other executed non-Killer cells pass (40 of 40 each on those named) | keep their path; no frontier experiment and no larger attempt count; regression controls |
| A demonstrated time target | Greater-Than Master: 40 of 40 exact, p95 14.478 s against 10 s | attribute its four slow exact requests before projecting any pool gain |
| Margin | Greater-Than Normal: 40 of 40, p95 9.627 s of 10 s; its separate CV6 Normal timing failure remains | keep the budgets and cohorts distinct |
| Missing qualification | mega16 Nightmare (pilot 4 of 4 exact, 4.8 to 26.5 s, mean 11.8 s); mega12, mega16, Greater-Than and butterfly Hell 1; Greater-Than Expert (pilot 1 of 2) | all six stay explicit; a pilot is not a qualification; their routing is MS18c |
| Killer Master and Nightmare | 5 of 13 and 19 of 24 exact; p95 22.781 and 24.903 s against 10 s | both latency and availability are open; their misses are not attributed to S-OD7 |
| Killer Hard and Expert | 0 of 14 and 1 of 14 exact | withheld by S-OD7; a speed gain does not re-offer them |
| Hell 1 | nine executed cells: 0 of 112 exact; every returned puzzle in band and shallow | diagnose cost and yield on the final tier; speed does not fix completed misses |
| Easy and mid-level misses | Q's named shallow shortfalls | not this feature's |
| The full-grid tail | Jigsaw Expert seed 1111 censored at 240 s on the old source, 99.5 % in the full-grid search; Q's 40 other seeds have a maximum of 2.63 s; `full-grid.js` is unchanged | keep S7; the newer cohort does not disprove the exceptional path |

mega16 Expert is not near its time budget: its p95 of 9.69 s is against 30 s. Its 36 of 40 exact hits are at
the hit-rate threshold. Hell 2's requiredness is still vacuous, which is not evidence that its tier is solved.

### 2.3 Which over-budget requests ran all their attempts (D, from Q)

The qualifier does not record attempts. `digger.generateSteps:2060-2184` leaves its outer loop only on an exact
result, so a normally completed non-exact request used all its configured attempts. That gives no per-attempt
duration, and nothing for exact requests.

| Cell | Over-budget requests | Completed misses (all attempts) | Slow exact requests (attempts unknown) |
|---|---:|---:|---:|
| Greater-Than Master | 4 | 0 | 4 |
| Greater-Than Normal | 1 | 0 | 1 |
| Killer Expert | 8 | 8, at 8 attempts | 0 |
| Killer Master | 8 | 8, at 8 attempts | 0 |
| Killer Nightmare | 8 | 5, at 8 attempts | 3 |
| diagonalX, hyper, Killer Hell 1 | 9 each | 9 each, at 8 attempts | 0 |
| Jigsaw Hell 1 | 8 | 8, at 8 attempts | 0 |
| samurai Hell 1 | 6 | 6, at 2 attempts | 0 |
| sohei Hell 1 | 1 | 1, at 2 attempts | 0 |

Killer Nightmare's p95 belongs to an exact request (indices 6, 15 and 18, at 33.690, 24.903 and 13.252 s).
Faster misses alone do not lower it.

### 2.4 What stays true of the generator (Fact)

- One worker serves every request (`worker-client.js` creates a single `Worker`); the engine is synchronous
  inside a cooperative step iterator.
- A request that finds no exact puzzle does all its work. Its time is a property of the count ceilings.
- A timed-out request returns nothing, although the keeper may hold a valid unique puzzle.
- The full-grid search has no ceiling from its 50th internal restart (`full-grid.js:241-261`).
- The pipeline already exposes a result's `attempts`, `timings` and `work` (`pipeline.js:253-266`); the
  qualifier does not keep them.

### 2.5 What the provisional round measured, and what it no longer supports (M: R3, old source)

| Item | Measured | Standing in version 3 |
|---|---|---|
| S5a at width min(4, attempts) | ready-wall medians of three pairs: mega16 x1.92, mega12 x3.22, samurai x1.79, classic9 x3.22, Killer x2.55, Greater-Than x2.62; identical puzzles on 18 of 18 pairs | the mechanism transfers; the factors are sensitivities for requests that exhaust their attempts |
| S5a's CPU | cell-median paired ratios 0.98 to 1.58; early-exact pairs reached 4.39 and 4.13; classic9's ratio of cohort CPU totals is 1.67 | the reason for selective pooling |
| S5a on a first-attempt hit | x0.91 on classic9 and x0.89 on Greater-Than, one pair each | the early-hit path is necessary |
| Partial S3 (singles and subsets) | cell medians 0.91 to 1.02; all paired values 0.89 to 1.04; check-sequence parity on 770 injected failures | no gain in the built scope; the full S3 and S4 were never built |
| S1 frontier screen | 0 verified exact puzzles in 192 frontier trials and 0 in 64 native control trials; samples at 0.12 to 0.38 of the native mix | cheap unsuccessful sample processing, not yield; neither support nor refutation |
| S2 in isolation | sample CPU x1.01 to 1.12 of the dig without it; 0 correctness problems in 120 removals | no speed claim |
| Stage and finder shares | `nishio` and `forcingChain` 53 to 81 % of a Nightmare request on four cells (one request per cell) | stale: the chain kernels were rewritten. Current Hell 1 shares are unmeasured |
| Solves per ordinary sample | 74 to 331 | the 1,296 figure is retired |
| Greater-Than, solve first | x1.03 on Normal, x0.17 on Nightmare (six pairs) | not adopted |

## 3. Items

### 3.1 The contract boundary (IG-S-Q19)

- **The rating's intrinsic contract.** A finder's findings, their order, its work units and its own caps
  (`NEW_FINDER_WORK_LIMIT`, the chain kernels' work cap) decide the canonical rating. No generator version may
  change them. A wanted change goes to the feature that owns the rating.
- **The generator-only contract.** The outer quotas the generator counts around the solver
  (`OBJECTIVE_STEPS`, `ANALYSIS_NODES`, `UNIQUE_NODES`, `REPAIR_NODES`) may move to another unit under
  `generatorVersion`, with canonical verification of every accepted puzzle kept (IG-S-Q03 (b), which covers
  this contract only).
- **Where the two cannot be separated** (a check site that serves both, such as the inherited budget called
  inside Nishio propagation), the family stays on its reference scan in this feature.
- **Equal-result items** prove parity of check sites and cap boundaries, not only of final scores. `refutes`
  calls `ctx.check()`, tests its work cap, then increments work; that order is part of the contract. A result
  ended by a cap or a budget is never stored or reused as a completed negative.

### 3.2 Dispositions

Cost classes are implementation effort without tests, documentation and qualification: **S** about 100 to 300
changed lines, **M** 300 to 800, **L** 800 to 1,600, **XL** larger or a new backend. They are sizing estimates.

| Item | Verdict | Expected effect on the rating-v3 workload | Cost | Contract |
|---|---|---|---|---|
| Version field, history v2, wire v2 | **pursue** | no search time; stored puzzles survive later changes | M | ship before generator version 2 |
| S5a attempt pool | **pursue selectively** | P: sensitivities on requests that exhaust their attempts: 2.07 to 3.43 (four and eight attempts), 1.66 to 1.96 (two attempts), Killer 2.07 to 2.65. Early hits may gain nothing or regress | L | the same puzzle at every width; early-hit path; frozen results before default enablement |
| S6 anytime result | **pursue, with a checkpoint precondition** | no computation saved; replaces an empty timeout by an already validated approximate puzzle | M | stored as timed, never the seed's canonical result |
| S7 full-grid ceiling | **pursue** | median unmeasured; bounds deterministic work, not seconds | S/M | new generator version; total work across restarts; explicit unknown outcome |
| S4 monotone-score exit | **prototype if the profile warrants** | P: 1.0 to 1.1 on bounded-oracle work, not a request factor | S/M | generator version 2 (the refusal reason in the log changes) |
| K2 trail and undo | **prototype only after profiling** | no bankable factor; a favourable request example is about 1.17 | M, plus substantial shared-state tests | identical trials, order, units and checks |
| K4 true-floor screen | **diagnostic only** | yield unknown; duplicated prefix work of 0 to 25 % gives P 0.8 to 1.0 on a fixed candidate set | S/M, test-side | no production filter; canonical acceptance and the keeper retained |
| S5b sample pool | **park pending consumed-prefix evidence** | unestablished; one long first sample gives no benefit | L/XL | new generator version; a serial quota reference first |
| S1 frontier dig, S2 early exit | **dropped from the mandatory scope** | no current-source yield or request factor | L if reopened | reopened only for a named final-catalogue target and an approved gate |
| S3 | **cheap scopes dropped as a speed item; chain work parked** | no bankable chain factor | L | MS08 to MS17 change the families; intrinsic contract |
| S8 local stock | **park, optional** | hides generation already paid; nothing for a first request | M/L | full effective request identity |
| S9 seed bank | **park for an owner decision** | no priced root supply or time range | M/L plus content search | no design before the final catalogue (IG-S-D3) |
| S10 WebAssembly | **park behind the profile and the kernel gate** | P: 1.2 to 2 on the affected kernel only; request factor unpriced | XL | frozen canonical semantics; JavaScript fallback |
| K1 negative Nishio cache | **park** | a completed negative depth-2 trial reads every open cell, so the cross-step cache does not hit; P near 0.9 to 1.0 | L | never cache caps as negatives |
| K3 bit-parallel chains | **dropped from this feature** | changes canonical findings, order or units | XL | only as a separate proposal to the rating's owner |
| K5 Killer cage masks and MRV | **dropped as already present** | none | none | `combo-table.js` and `dfs-solver.js` already implement them |

The recommended mix has **no priced increment beyond selective S5a**. S6 and S7 improve failure handling and
robustness; K2 and K4 are decision experiments, not multipliers to stack. Every admitted change keeps the
canonical rating, requiredness, exactness and uniqueness. Cache, stock, recipes and any bank content use the
full versioned request identity.

### 3.3 Generator version, history v2 and wire v2 (IG-S-Q01, confirmed)

- One integer `generatorVersion` (today's search is 1) goes into the history entry, the cache key, the wire
  (wire version 2) and every exported recipe. It is separate from the rating version and any schema version.
- History version 2 stores the puzzle (givens, solution, variant structure) and its provenance
  (`generatorVersion`, rating version, `exact`, later `timed`). Picking a v2 entry shows the stored puzzle and
  never regenerates. A v1 entry regenerates on the current path with a notice that it may differ.
- It ships while the search is still version 1, so that every entry made from then on survives the switch.
- The wire carries `exact` and `timed` explicitly, so an absent field can no longer read as false.

### 3.4 S5a: attempts on a worker pool, selectively (OD-S5: (B))

**Mechanism.** The outer attempts use independent RNG forks (`grid#a`, `extra#a`, `dig#a.t`, `search#a`) and
separate caps; they are coupled through `best` and the keeper, both "first strictly better wins". Run the
attempts on a pool, consume the results in attempt order, return the first exact one, else merge `best` and
the keeper in order. Later attempts are speculative and are cancelled when an earlier one is exact.

**Rules.**

- Pool size `min(4, hardwareConcurrency - 1)`, at least 1. The capacity a request can use is
  `min(4, attempts)`: two on the two-attempt boards. With `file://` or no `Worker`, the existing main-thread
  mode with one lane.
- **The early-hit path is mandatory.** For cells that usually hit in the first attempt, attempt 1 gets a head
  start or the cell stays serial; which, per cell, comes from the frozen data. The head start changes timing
  only, never the result.
- **Equivalence, on the frozen source.** The audit covers more than the RNG forks: the current target policy
  and the global keeper, including Killer's conditional uniqueness counts (`killer.js:907-913`), need an
  ordered-merge argument. The 18 matching pairs of the old round do not replace it.
- Events and the Generation Steps trace forward only the consumed tasks' events, in canonical order.
- The 120 s guard is the wall time of the request from its start (IG-S-Q02, confirmed). Cancellation
  terminates busy workers; the Pentomino pool (`core/browser/worker-pool.js` there) is a working reference.
- **Enablement.** Default only after the frozen CPU, cold-wall and ready-wall results; a phone-class check
  before it is enabled on mobile. The serial figure stays the regression control: a serial slowdown is a
  failure even if the pooled time passes.
- The architecture may be designed before the freeze. That neither establishes a speed or a CPU cost on the
  final source nor authorises a run (IG-S-D6: no preliminary width sweep).

### 3.5 S6: an anytime result at the time guard (OD-S2)

At the guard, return the best complete, unique candidate that the worker has **already posted as a validated
checkpoint**, with the existing `difficulty.approximate` and `difficulty.shallow` warnings and a new
"time limit" warning. If no validated checkpoint exists, for example when the initial full-grid search is what
timed out, the request still fails as today. The result depends on the device, so it is stored in history with
the complete puzzle and `timed: true`, never written to the result cache under its seed, and never presented
or exported as that seed's canonical result (IG-S-Q13).

### 3.6 S7: bound the unbounded pieces

The first ceiling is on the **total** work of the full-grid search, restarts included, with an explicit
"unknown" outcome and a deterministic reaction (the next fork `grid#a.k`), under the generator version
(IG-S-Q07). One censored request sizes no ceiling: the design needs the distribution of nodes per successful
full-grid attempt on the frozen catalogue, the known exceptional path included. A wall backstop stays. The
other pieces without a local ceiling (the sample safety check `secureUniqueness`, the per-sign DFS and
restricted solves of the Greater-Than sign dig, `buildJigsaw`, which does not receive the budget) follow in the
same version at lower priority.

### 3.7 S4, K2 and K4: conditional

- **S4.** The score never decreases when a step is added, so a bounded oracle can stop with "too hard" when
  the running score reaches its bound. Every puzzle is kept, but some `techniques` refusals become `tooHard`
  in the dig log, the Generation Steps and wires G09 to G13, hence the version (IG-S-Q04). Built only if the
  frozen profile shows bounded-oracle work worth it.
- **K2.** `refutes` already reuses one scratch buffer per depth; `cloneState` copies two arrays and
  `unsolvedCount`, about `8 * N` bytes per trial (2,048 bytes at 256 cells). A trail would have to cover every
  write through `SG.constraints.place`, `eliminate` and `propagate`, shared by both apps, and restore state and
  scratch through errors and caps. Measure the copying and the changed-cell volume first. Its gate is in 5.4.
- **K4.** The digger does not run a true-floor test today. Ordinary Stage A is a technique-bounded,
  uniqueness-free solve; Stage B's `boundedObjective` prefers `tierUsed` but is not canonical requiredness;
  the proposal Stage B (`removalObjective:689-713`) excludes all chain-group techniques, which is not the
  Hell 1 floor. `difficulty.certifyFloor:412-435` is the reference floor check and generation does not call
  it. The diagnostic uses the frozen `floorTechniques` with the canonical uniqueness assumptions, records all
  its work and uncertain budget exits, and changes no production path. It is what would point Hell 1 to a
  live-search hypothesis or to a bank (section 5.5).

### 3.8 Parked and dropped items: what would reopen them

| Item | Reopening condition |
|---|---|
| S1, S2 | a named cell that fails on the final catalogue, and an approved gate: verified exact puzzles per CPU second and per wall second on paired grids, against each current sample kind and a proposal-only control (IG-S-Q05). The allowlist of IG-S-Q11 and the floor and uniqueness rules of IG-S-Q08 to Q10 then apply |
| The attempt sweep (OD-S4) | an 81-cell cell that fails on the final catalogue |
| S5b | evidence that the consumed prefix of a slow request holds independent sample work; a 90 % aggregate sample share can be one long first sample. Then a serial quota reference before any pooled arm |
| S3's chain work, K1, S10 | a frozen profile with an eligible share that can reach the kernel gate, and the budget accounting of the chain propagation checks settled |
| S8 | a product wish for it; it extends `SG.cache` with a refreshed `COSTS` table (IG-S-Q14) |
| S9 | the owner's decision after the final catalogue, on a priced plan for distinct roots and verification. Then IG-S-Q15 applies: geometric symmetries only for Killer and Greater-Than, every served puzzle rated canonically and structure-checked, a defined exhaustion behaviour, the content id in the provenance |
| K3 | not in this feature |

## 4. Times before and after

M is Q in Node at outer jobs 4; times in seconds, `median / p95` of the recorded cohort, often early-stopped. A
pilot is not a percentile. The middle column transfers the old pool results under the assumption of comparable,
distributed attempt work (P). They are **not bounds**: a dominant single attempt, startup, contention or a weak
device can leave no gain or a regression. The last column holds only credited work.

| Cell | Today (M) | After phase 1: selective S5a (P) | After the recommended mix |
|---|---|---|---|
| classic9, wordoku Nightmare | 0.140 / 0.260 and 0.106 / 0.444; 40 of 40 each | about unchanged | the same; regression controls |
| mega12 Nightmare | 0.186 / 1.049; 40 of 40 | about unchanged | the same |
| samurai, sohei, flower, butterfly Nightmare | p95 7.558, 7.587, 5.917, 1.970; 40 of 40 each | median about unchanged; tail unpriced | the same |
| mega16 Nightmare | pilot mean 11.8, range 4.8 to 26.5; 4 of 4; no qualification | mean about 6 to 12, only if useful work spans both attempts | no further priced factor |
| Greater-Than Master | 0.744 / 14.478; 40 of 40 | p95 sensitivity about 5.5 to 14.5, by the slow hits' attempts | the same; crossing 10 s is not established |
| Greater-Than Normal, Nightmare | 1.922 / 9.627 and 1.326 / 5.181; 40 of 40 each | no median gain credited | the same |
| Greater-Than Expert | pilot about 3 and 15; 1 of 2 | unknown | unknown |
| Killer Hard, Expert | 5.355 / 6.578, 0 of 14; 10.243 / 17.773, 1 of 14 | Hard p95 sensitivity 2.5 to 3.2; Expert slow misses 3.8 to 8.6 | the same; both withheld by S-OD7 |
| Killer Master | 11.792 / 22.781; 5 of 13 | known slow exhausted misses about 4.2 to 11.0; not a cell p95 | the same; exact yield insufficient |
| Killer Nightmare | 4.108 / 24.903; 19 of 24 | median near 4.1; conditional p95 sensitivity 9.4 to 24.9 | the same |
| classic9, wordoku Hell 1 | p95 8.069, 8.061; 0 of 14 each | p95 sensitivity about 2.4 to 3.9 | the same; no exact hit gained |
| hyper, Jigsaw, diagonalX Hell 1 | p95 13.111, 15.498, 25.909; no hits | 3.8 to 6.3, 4.5 to 7.5, 7.6 to 12.5 | the same |
| Killer Hell 1 | 26.066 / 50.222; 0 of 9 | p95 sensitivity 19.0 to 24.3 | the same; above 10 s |
| samurai, sohei, flower Hell 1 | p95 37.925, 33.126, 27.429; 0 of 14 each | 19.3 to 22.8, 16.9 to 20.0, 14.0 to 16.5 | the same; a time margin is not offerability |
| mega12, Greater-Than, butterfly Hell 1 | pilots 36.5, 37.6 to 40.1, 38.3 to 39.5; no hits | completed-request scenarios 10.6 to 17.6, 11.0 to 19.4, 19.5 to 23.8 | the same scenarios |
| mega16 Hell 1 | censored beyond the 120 s guard | unknown | unknown |
| Jigsaw Expert, the tail | p95 2.29, maximum 2.63, 38 of 40; seed 1111 censored at 240 on the old source | no routine gain | S7's ceiling to be sized; no seconds forecast |

**Reading.**

- **Availability does not move.** A same-result speed change keeps the exact flag of every completed request.
  The nine executed Hell 1 cells gain no exact hit from the pool.
- **S5b has no number.** The old ideal estimates (mega16 about 29 s) price the old source. On the new source
  it needs the consumed-prefix test first.
- **No new offer is demonstrated**, in Node or in the browser. Old failure times are not upper bounds for
  future exact requests: MS08 to MS16 may change both the proof and its cost.

## 5. The frozen round

### 5.1 Order and preconditions

Approved in principle as a reduced, staged round (IG-S-D5). It follows the harness repair (IG-S-D2): a
narrowed, separately costed task after MS18e on the attested frozen source. The round is priced only after the
repair; no provisional time carries over; difficulty-v3 keeps machine priority.

**The repair.** Only the consumers the reduced round keeps: loaders, pool, telemetry, the full-grid hook and
any approved diagnostic hook. On rating-v3 `8b70875` the smoke found 5 of 8 adapters applying textually,
`profile`, `jigsaw-profile` and `gt-diagnostic` failing at digger anchors, a stale `refusalReason` exposure in
`frontier-hooks`, two suites timed out and native or no-op puzzle parity untested. That is not a parity pass.
The repair must show actual native and no-op puzzle parity and never falls back to the old engine.

| Step | Retained work | Stop or admission condition |
|---|---|---|
| F0: source and capability | attest runtime and catalogue; pin the harness; the repair above | an unsupported source stops the round; parity proved, not textual applicability |
| F1: baseline reconciliation | re-derive the failing and missing cells; reuse final records only where source, complete request and protocol match | missing attempts or stages stay missing; timing at outer jobs 4 is not a matched control |
| F2: selective pool (SM5) | native and widths 1, 2 and 4; early-hit controls; exhausted and late-hit targets; cold and ready timing; host CPU and discarded work; the named Greater-Than and Killer outliers as diagnostics | puzzle, keeper and event invariance; serial non-regression |
| F3: profiles | a small named cohort of classic-size Hell 1, multigrid Hell 1 and Killer, plus the Greater-Than tail: family and stage attribution, negative and capped calls, clone bytes and time, checks | sampling can choose a hotspot; it proves neither dependencies nor check equality. No cache or backend build without a material, eligible share |
| F4: the full-grid tail | the node distribution on the frozen catalogue, the exceptional path, restarts and censored cases | a total count ceiling sized, with the explicit unknown outcome |
| F5: the conditional floor diagnostic (K4) | a small Hell floor and proposal comparison, canonical disposition, fallback accounting | no production filter; no exact-yield forecast from final-request misses |
| F6: admitted prototypes only | K2 if copying is material; S4 or S5b only when their profiles justify them | a new costed plan; guard-binding equivalence; requalification of changed output |

**Not carried:** the old broad Nightmare population, a full frontier composition, the 81-cell attempt
expansion, the extra extension populations, the Greater-Than Nightmare 706 to 709 catch-up, a full
cheap-finder rewrite, K3, K5, a bank and the background stock.

### 5.2 Protocol (IG-S-D4, IG-S-Q22)

- Paired timing and budget verdicts: inner width four at outer `--jobs=1`; the serial control at width one and
  outer `--jobs=1`. Every condition of IG-S-Q02 stays, the serial `file://` caveat included.
- A throughput study at a higher outer count is labelled as one and never pooled into a p95 with these.
- Q's `--jobs=4` records are context, not matched timing controls. Puzzles and exact flags do not depend on
  the outer concurrency, so a final record with full identity can serve for outcomes.
- Nothing here changes difficulty-v3's qualification, its sample counts or the 120 s request-wall guard.

### 5.3 Telemetry and populations (IG-S-Q24)

**Fields.** From the pipeline's existing output: `attempts`, `timings`, `work`. Added: the origin of the
selected candidate; attempts started, consumed and discarded; per-attempt and per-sample stages; quotas and
stop reasons; cold and ready wall time; host CPU with speculation; outer jobs and inner width. A missing field
stays missing; it is not read as zero or inferred for exact hits. A returned fallback's origin need not equal
the number of consumed attempts.

**Cells for confirmation,** 20 or more independent paired requests each, named for good after F1. The plan
author's proposal: Greater-Than Master (the slow exact tail), Killer Nightmare and Killer Master, one
classic-size Hell 1 cell (diagonalX, the largest p95), one multigrid Hell 1 cell (samurai), and mega16
Nightmare if it is still unqualified. Classic9 and mega12 Nightmare are the early-hit controls for the pool.
This is a proposal to cost after the repair. It does not replace the official 40-request round and launches
none of the six omitted difficulty-v3 cells.

**Budget.** The manifest enumerates commands, populations, stopping limits, validation, startup and cleanup,
wrapper grace and permitted concurrency. Median request times are not an upper bound.

### 5.4 The kernel gate (IG-S-Q20)

- **Unit and comparator.** Each named target cell, paired on the same seeds, against the same post-phase-2
  generator, quotas and pool. The arms differ in the kernel only, so the pool's gain is not counted twice.
- **Statistic.** Ready wall time binds: the geometric mean of the per-request paired ratio, per target cell.
  CPU and cold wall are reported apart, and CPU may not rise. A kernel microbenchmark is never the gate.
- **Thresholds.** 1.5 for the large items (S3's chain work, K1, S10). 1.15 for a medium-sized equal-result
  item with a complete equivalence proof (K2).
- **Controls.** Named cells that call the kernel must not be slower (ratio at least 0.95). A cell that never
  calls it is checked for identical puzzles only.
- **Order.** Targets, controls and the statistic are named after F3 and before the optimisation is evaluated.
- **Admission from the profile.** For a kernel of share `f` sped up by `s` with overhead `u`, the request
  factor is `1 / (1 - f + f/s + u)`. A factor of 1.5 needs `f` of at least one third even for an unbounded
  `s`, and two thirds at `s` = 2. An item whose profile cannot reach its threshold is not built.

### 5.5 Hell 1 (IG-S-D3, IG-S-Q23)

After the final catalogue: reconcile the baseline, run only the approved diagnostics (F3, F5), and keep
unqualified cells unoffered. The 0 of 112 are completed shallow results; they do not show that intermediate
floor tests all fail or that exact puzzles cannot exist, and later finders may change both the hit rate and
the cost.

- If floor-stuck candidates turn up but end above the band, unsolved or capped, that is a specific steering
  hypothesis for a live-search programme, with its own yield, identity and budget gates.
- If almost none turn up, live search is not steering toward the tier, and the question becomes a bank, on a
  priced plan for distinct roots and their verification.
- No requiredness, rating or offer threshold is weakened.

## 6. Phases, tests and gates

| Phase | Content | Version | Gate to continue |
|---|---|---|---|
| 0. Frozen round | section 5, after the repair; no runtime change | none | the targets named on the final catalogue (F1); the pool's invariance, CPU and timing known (F2); the profile and the admissions of 5.4 (F3); the full-grid ceiling sized (F4) |
| 1. Equal results | `generatorVersion`, history v2 and wire v2; S5a, selective | identical puzzles | regression hashes unchanged; the same puzzle at widths 1, 2 and 4 and in the main-thread mode; serial time not slower; pooled and serial times reported; the phone-class check before mobile enablement |
| 2. Generator version 2 | S7 (the full-grid ceiling first); S6; S4 if admitted; S5b only if its evidence and serial quota reference exist | new version | qualification of every changed cell under the protocol of 5.2; the time-guard tests |
| 3. Kernel | K2 if admitted; the parked chain work or S10 only if reopened | identical, with check parity | step and check-sequence equality on guard-binding cases; the gate of 5.4 |
| 4. Residual | Hell 1's route by 5.5; S9 or S8 only by an owner decision | per item | per item |

The design of phase 1 does not wait for phase 0. Its default enablement does: it needs F2.

**Tests every phase keeps or adds.**

- **Check-sequence equality** (K2, any chain work, S10): for a corpus per variant the steps, the sequence of
  budget checks and the failure boundary under injected ceilings equal the reference; the reference stays
  reachable under `SG.DEBUG`.
- **Soundness:** every accepted puzzle has one solution (DFS) and the canonical rating claimed; the generic
  soundness and order-invariant suites run unchanged.
- **Pool invariance** (S5a): the puzzle, the keeper's result and the forwarded events of a request are the
  same for every pool size and for the main-thread mode.
- **Version** (IG-S-Q01): a history v2 entry shows its stored puzzle and never regenerates; a v1 entry
  regenerates with a notice; a timed result is never cached or exported as its seed's canonical result.
- **Schema migration** has its own wire and history fixtures.
- Regression hashes, help examples and qualification lists are regenerated once, in phase 2, by their own
  task. No heavy suite, hash or fixture is changed outside that task (AGENTS.md).

## 7. Decisions

**The owner's decisions in force.**

| Id | Decision | Date |
|---|---|---|
| IG-S-Q01 | `generatorVersion` and history v2 ship before the search changes; v1 entries regenerate with a notice | 2026-11-14 |
| IG-S-Q02 | With a pool, the 120 s guard is the wall time of the request from its start | 2026-11-14 |
| Phase 0 | Official measurements start once difficulty-v3 freezes; prototypes are test-side harnesses | 2026-11-14 |
| IG-S-D1 (OD-S5) | Selective pooling up to four workers with an early-hit path and a serial fallback; default enablement after the frozen results; a phone-class check before mobile | 2026-11-15 |
| IG-S-D2 (D10/A8) | A narrowed, separately costed harness repair after MS18e, with actual parity and no fallback to the old engine; the round priced afterwards | 2026-11-15 |
| IG-S-D3 (OD-S3) | Hell 1: bounded diagnosis while it stays unoffered; no bank designed before the final catalogue | 2026-11-15 |
| IG-S-D4 | Inner width four and outer `--jobs=1` for paired timing and budget verdicts | 2026-11-15 |
| IG-S-D5 | The reduced staged frozen round F0 to F6; the Nightmare screen and the attempt sweep retired | 2026-11-15 |
| IG-S-D6 | No preliminary width sweep before the freeze | 2026-11-15 |
| S-OD7 (difficulty-v3) | Killer Hard and Expert withheld until a later calibration; no weight change inside v3 | recorded there |

**Still to come to the owner.**

| Id | Decision | When |
|---|---|---|
| The repair and the manifest | The cost of the repair, then the price and envelope of the frozen round and its confirmation cohorts | after MS18e |
| OD-S1 | A new generator-algorithm version for phase 2; old seeds give other puzzles | before phase 2; the plan author's proposal is yes |
| OD-S2 | At the time guard, return the best validated puzzle with a warning (S6) | before phase 2; proposal: yes, stored with `timed: true` |
| OD-S5, enablement | Default and mobile enablement of the pool | with F2's results |
| OD-S3, route | Hell 1: a live-search programme or a bank feasibility plan, if the diagnosis points to one | after F5 |
| OD-S4 | More attempts by default | only if an 81-cell cell fails on the final catalogue |

**Plan-author answers in force** (the text is in `clarifications.md`): IG-S-Q03 (virtual checks; narrowed by
Q19), Q04 (S4 under the version), Q05 (the S1 gate), Q07 (S7 under the version, total ceiling), Q08 to Q11
(S1's floor, uniqueness, frontier semantics and allowlist, if S1 is reopened), Q13 (timed results), Q14 (S8),
Q15 (S9), Q16 (Greater-Than as a diagnostic only), Q19 to Q25. IG-S-Q06 (the S1 prototype in phase 0) and
IG-S-Q12 (the attempt sweep) are superseded by the retirement of both. The phrase about a widened window in
the answer to IG-S-Q08 is withdrawn (IG-S-Q21).

## 8. Risks

- **The baseline is a checkpoint on a moving source.** MS08 to MS16 are expected to add about 14 finders. The
  targets of section 2 are re-derived in F1 and may change.
- **The generator measurements are stale and small:** the old runtime, three seeds per cell, one request per
  profile. Only the pool's mechanism makes its factor likely to transfer, and its early-hit distribution is
  exactly what changed.
- **The pool can cost more than it gives:** more CPU for the same puzzle, and a slower answer when the first
  attempt hits. Single early-exact pairs reached 4.39 and 4.13 times the serial CPU. Weak devices are
  unmeasured; browser runs decide.
- **Hell 1 may have no generator-side remedy.** Speed does not make a shallow puzzle exact. If the floor
  diagnostic finds no floor-stuck candidates, the routes are the rating feature's later finders or a bank,
  which is a product decision.
- **Killer** has both a latency and an availability problem at Master and Nightmare, and its Nightmare p95 is
  an exact request of unknown attempt count. The pool may not move it across 10 s.
- **No kernel item may pass its gate.** Then the feature delivers the version field, the selective pool, the
  anytime result and the full-grid ceiling, and nothing more on time.
- **Shared code.** K2 writes into constraint code that both apps and every finder use; its proof and tests
  are most of its cost.
- **The harness no longer fits the source.** The round's cost is open until the repair is scoped.
- **Browser against Node.** Every number here is Node. The browser gates decide what is offered there.
