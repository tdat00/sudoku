# Sudoku generator state and time complexity — 2026-11-14

Prepared by SA2 for Fable's **PR-S2** review, at the owner's request.

## 1. Scope, identity and principal findings

**Code snapshot:** `1d191019bc718431d237a97fd57056865af08d20` (`1d19101`), backup
`refs/dv3-wip/MS05b3-done-20261114-0705`, committed 2026-11-14 07:07:05 +07:00.
It contains MS05b3 and the MS05r5p legacy-8 fix. It is an S-OD2 safeguard, **not acceptance**.
All code anchors and existing measurements below were read from that commit with
`git show 1d19101:<repository-relative-path>`. They do not describe MS05r6a's concurrent
working-tree edits. Links are convenience paths; the snapshot is authoritative.

Requiredness, the keeper, the 256 local allowance and size-default attempts are active. Targets,
split chain windows and S3 additions are not. The rating/cache version bump to 3 is still MS17b's work.
This document performs no generation, tests or timing experiment; its new statistics are arithmetic
over already recorded JSON.

The principal facts for review are:

- The cheap derived requiredness certificate removed a second solve, but changed **when search stops**.
  A shallow in-band puzzle no longer ends the request. Unsuccessful searches can exhaust all samples,
  local continuation and attempts.
- `CAP_RATINGS=1024` counts canonical full ratings, **not every logical solve**. Ordinary random/guided
  digging calls logical oracles outside that counter. The 256 allowance does not constrain those calls.
- At the current size defaults, the seven mega16 Nightmare deep occurrences take **80.394-116.951 s**,
  with **0/7 exact**. Mega12 takes **23.520-25.243 s**, also **0/7 exact**: its current failure is hit rate,
  not an observed breach of the 30 s p95 budget in that population.
- There is a separate small-board tail: Jigsaw Expert seed 1111 takes **325.313 s** in an unguarded I5
  request. Its 20-request cell's upper median is 0.917 s and p95 is 2.438 s. No stage profile of that
  particular outlier exists; its cause must not be inferred from its total alone.
- Current Hell results are not a forecast of the final Hell cost: Hell 1 and Hell 2 have empty tiers at
  this snapshot. MS07b makes Hell 1 non-vacuous.

**Owner decision S-OD5, 2026-11-14 07:15:** Fable reviews complexity now while work continues;
Pentomino pauses after MP12b1 until Sudoku reaches MS07e, giving Sudoku a contention-free window.
This does not retroactively protect earlier timings or waive the existing lock, request-budget or
correctness rules. This document proposes no decision as already adopted.

## 2. Generation pipeline at the snapshot

### 2.1 Configuration, model and full grid

1. **Normalize configuration.** `generator/js/engine/pipeline.js:55-106`, `normalizeConfig`, validates
   the variant, offered level, seed, symmetry, dig order, trace, symbol mode and plain variant options.
   The unspecified level is Normal, subject to the variant's support check. Missing `maxAttempts` uses
   `SG.digger.defaultMaxAttempts(SG.variants.cellCountOf(def))`; this reads size metadata, not a second
   generated model. The pipeline's public numeric default 8 is only the small-board reference.
2. **Choose the attempt count.** `generator/js/engine/digger.js:624-638`, `defaultMaxAttempts`:

   | Native boards | Cells, not layout bounding-box area | Default attempts |
   |---|---:|---:|
   | classic4, classic6 | 16, 36 | 8 |
   | classic9, diagonalX, hyper, jigsaw9, killer, greaterThan, wordoku | 81 | 8 |
   | mega12, butterfly | 144 | 4 |
   | flower, mega16, sohei, samurai | 189, 256, 288, 369 | 2 |

   Boundaries are <=81 / 82-144 / >144. An explicit positive integer wins; the pipeline itself has no
   upper clamp of 20 (the advanced UI control does). CV6-04 changes only the UI store: an unmarked old 8
   is default intent on every board. Explicit settings and recorded recipes remain explicit/recorded.
3. **Build once per request.** `pipeline.js:168-240`, `executeSteps`, selects the variant's dig strategy,
   calls `def.build(variantOptions, rng.fork('model'))`, obtains its difficulty specification and delegates
   to `SG.digger.generateSteps`. Jigsaw's partition is built here, not rebuilt on every full-grid attempt.
4. **Generate a solution on every attempt.** `digger.js:1852-1869`, `generateAttempts`, calls
   `SG.fullGrid.generate` with `rng.fork('grid#' + attempt)`. The full-grid solver propagates fixed cells,
   optionally applies the variant's `fastSeed`, and searches with randomized values/MRV.
   `generator/js/engine/full-grid.js:191-292`, `generate`, initially permits `50 * cellCount`
   backtracks per search unless the variant supplies a threshold. The first 50 internal search attempts
   are limited; once their loop index reaches 50, the search has **no backtrack limit** and only an
   inherited caller budget can stop it. Mega12/mega16 instead use thresholds **300/400** and seed
   diagonal boxes (`generator/js/variants/mega.js:67-84,188-205,234-236`). A failed prefill can
   also be discarded and searched without the prefill. The outer 8/4/2 count is not a bound of 8/4/2
   DFS searches.
5. **Add structure per attempt.** `digger.js:1871-1905` calls `postGenerate` with the solution, level,
   shared attempt caps and keeper. Killer constructs/repairs/searches cages; Greater-Than creates signs.
   Other variants may simply keep the base model.

The pipeline records configure/buildModel/fullGrid/extraStructure/dig/rate/tune separately.
`run` drives the step iterator synchronously; the browser can drive `runSteps` cooperatively.
Individual solves, solution counts and full-grid searches are not arbitrarily preemptible between
their internal operations (`pipeline.js:128-164`; `digger.js:1791-1816`).

### 2.2 Samples, dig orders and the ordinary cell dig

6. **Sample the same solved grid repeatedly.** `digger.js:1818-1935` defaults to **12 samples per
   attempt**, or **30** when symmetry has a group larger than two cells. Each sample has its own
   `dig#attempt.sample` RNG fork. Nightmare, Hell 1 and Hell 2 alternate: odd samples are proposals,
   even samples are score-targeted digs (`difficulty.js:126-127,449-480`).
7. **Dig order.** `digger.js:155-243`, `cellSequence`/`groupSequence`, implements random, rowByRow,
   snake, spiral and jumpOne (even positions then odd positions). It orders symmetry groups by their
   first encountered cell. Order affects Stage A; the guided stage subsequently shuffles its candidate
   pool rather than following the original order blindly.
8. **Stage A: random removal.** `digStageSteps` and `digSteps`
   (`digger.js:452-597,853-911`) visit each symmetry group once, applying cheap rejection,
   clue-floor and per-unit-floor checks. Guided digging takes over at
   `max(minClues, round(0.47 * N))`.
   - Ordinary samples use `techniqueOracle` (`293-316`): a restricted logical solve with
     `assumeUniqueness: false`, requiring a complete proof and score below the band's upper edge.
     These oracle solves are **not `rateCounted` calls**.
   - Top-tier proposals use guarded DFS uniqueness (`250-284`), with at most 200,000 budget-check
     units for the removal's uniqueness search. Hitting this deterministic guard rejects the removal.
9. **Stage B: guided removal.** `digGuidedSteps` (`751-825`) repeatedly examines a shuffled pool of
   remaining feasible groups, keeps the best objective, and removes that group. Refused groups are
   permanently pruned for the pass; valid losers can be reconsidered. Pool size is
   `B(N) = max(4, min(32, round(32 * 81 / N)))`.
   - Ordinary `boundedObjective` (`686-733`) solves with the allowed techniques and no uniqueness
     assumption. It rejects stuck/too-hard candidates and has a **100,000 budget-check** limit per
     objective solve. This is not a count of complete ratings or of uniform-cost deductions.
   - Proposal objective: guarded uniqueness followed by a logical solve excluding the chain group;
     priority is score if solved, otherwise `1e9 + unsolvedCount`. This logical solve is not covered by
     the ordinary objective's 100,000 guard; it still inherits the request budget.
   - These objective solves also bypass the full-rating counter.
10. **Safety net.** Every sample is checked by `secureUniqueness` (`951-968`) using
    `SG.dfs.countSolutions(..., 2, requestBudget)`. This check has **no local 200,000-node cap**.
    If a technique-based dig was unsound, the code performs a plain DFS dig and adds an unsound-technique
    warning. That path is a correctness finding, not normal performance fallback.

The Stage-B comment at `digger.js:739-746` records an older experiment: reconsidering refused groups
made qualification 4.6 times slower with essentially unchanged hits (94.4% versus 94.5%). It is historical
context, not a new measurement of this snapshot.

### 2.3 Rating, requiredness, keeper and local continuation

11. **Canonical rating.** `digLevelSteps` (`1319-1450`) reuses a strategy's already obtained rating
    when it belongs to the exact returned puzzle; otherwise it calls `rateCounted`. Proposals are rated
    immediately and may be refined downward. `rateCounted` (`1028-1051`) calls `SG.difficulty.rate`
    and accounts for every invocation, including one that throws.
    `difficulty.js:554-564` calls the complete applicable technique ladder with uniqueness assumed and
    without collected steps by default. `core/js/engine/logical-solver.js:237-344` restarts scanning the
    ladder from its first technique after every effective deduction, until solved, contradictory or stuck.
    A canonical rating does not invoke DFS to fill a stuck logical proof.
12. **Requiredness is derived, not solved again.** `difficulty.js:334-399`, `requiredOf`, obtains the
    previous global level's technique prefix and asks whether the complete canonical rating used any
    technique outside it. VeryEasy and an empty tier are vacuous. It scans metadata/counts; it performs
    **no additional solve or uniqueness count**. Its prerequisites are a rating of these exact
    givens/model, known uniqueness, and the verified prefix property of technique order.
    `certifyFloor` (`409-433`) is the separate restricted-solve reference for tests/tools, not the
    generation hot path.
13. **Exactness and ordering.** `digger.js:1696-1735`: exact means complete canonical proof in the
    requested band **and required**. Quality is 0 exact, 0.5 shallow in-band, otherwise the old off-band
    distance (at least a whole-level gap); incomplete proofs are infinite quality. An ordinary sample
    exits early only on exactness, not merely on its band label.
14. **Downward refinement.** `refineDown` (`1247-1293`) adds empty symmetry groups back in seeded
    order when a solved candidate is above the band. It uses at most **64 full ratings per refinement**,
    also charged to the attempt cap. It stops upon reaching the band, undoes incomplete/below-minimum
    results, and offers complete intermediate results to the keeper. It does not add clues on
    inequality models. A shallow result can still enter local search afterwards.
15. **Keeper.** `createKeeper` (`1188-1218`) keeps a strictly better complete candidate from refinement,
    layout/tuning or local search, even if the current search path rejects that move. It independently
    counts solutions with `countWithin` before keeping a candidate; equal quality keeps the first.
    Thus a required lower-score neighbour is not lost merely because local search prefers nondecreasing
    scores. Its uniqueness work is additional to the rating work.
16. **Local search: at most one continuation per outer attempt.** `generateAttempts:1936-1948` starts
    from that attempt's best completely rated sample only if no exact result/keeper was found and the
    attempt caps remain. `localSearchSteps`/`runLocalSearch` (`1484-1692`) can remove, swap or add clue
    groups; on Greater-Than it can remove a sign and forbids clue additions. It:
    - counts every proposal, including invalid, repeated and skipped ones;
    - memoizes givens, checking/rating a repeated candidate only once; sign changes reset that memo;
    - guards removal/swap uniqueness at 200,000 check units, offers complete unique candidates to the
      keeper, and follows only complete, nondecreasing-score moves below the upper band edge;
    - stops on exactness, an exact keeper, an attempt cap, or inability to start another allowed rating.
17. **Allowance 256.** `enterLocal`/`rateCounted` (`1028-1074`) permit 256 **additional full ratings
    after the first shallow state in that local search**. A shallow entry has ordinal zero; the rating
    that first reveals shallowness does not consume that post-shallow allowance. Ratings before it are
    bounded by the attempt cap. This allowance does not cover ordinary samples, their logical oracles,
    layout work outside the collector, or the number of attempts. Memo hits still consume proposals,
    not allowance.
18. **Request end and fallback.** `generateAttempts:1911-2012` considers samples, the keeper and local
    results and stops outer attempts only when the chosen result is exact. A non-exact complete best
    gets `difficulty.approximate`; if it is in-band but shallow, it also gets `difficulty.shallow`.
    No complete rated candidate produces `digger.noRatedPuzzle`. Budget/cancellation errors propagate;
    **a timed-out request does not return the keeper's best-so-far puzzle**.

### 2.4 Variant-specific work

| Variant hook at `1d19101` | Work and bounds relevant to time |
|---|---|
| Killer, `generator/js/variants/killer.js:469-527,695-747,791-919,945-1018` | Per-attempt cage growth, split/merge repair (12 repairs from Hard upward), analyses with 30,000 checks each, a 250,000 accumulated repair-check threshold, and up to 24 clue-reveal analyses. The repair threshold is checked between repairs, not a hard aggregate bound over every reveal. From Expert, cage-layout search permits 8,192 proposals/256 ratings, sharing the attempt's larger caps; its ratings/counts have 30,000-check slices. The cell dig then uses cage-specific low clue floors (zero except VeryEasy) and no per-unit minimum. These extra constraints and searches can dominate an 81-cell board. |
| Greater-Than, `generator/js/variants/greater-than.js:177-199,226-426` | `postGenerate` places signs; `digSignsSteps` starts with few clues, can make up to N preliminary restricted solves/reveals, and makes up to 9 tuning rounds (`round=0..8`). A round tries a technique/uniqueness sign pass and a uniqueness-minimality pass, then rates/reveals if too hard. Per-sign DFS and restricted logical solves are not full-rating-cap entries and have no local 200,000-node guard; they inherit the caller budget. MS05e has not replaced the first pass with a pool yet. |
| Jigsaw, `generator/js/variants/jigsaw.js:33-62,481-531,607-718` | Model construction tries up to 200 layouts, with a configured 60-growth-backtrack limit per attempt. Seed placement can shuffle up to 201 permutations (`tries=0..200`); growth also performs connectivity/matching feasibility checks. Accepted layouts pass a randomized solvability screen (4,000-node budget, restart threshold 200) and a plain DFS screen (5,000 nodes). These local screens do not bound every later full-grid seed or rating. `buildJigsaw` does not receive the pipeline budget as an argument; its bounded construction is a separate synchronous piece. The 325 s request has no stage profile. |
| Multigrid, `generator/js/variants/multigrid.js:53-69,238-280,303-332` | Shared-cell geometry yields 144/189/288/369 real cells; these are still 9-digit puzzles. `fastSeedOverlaps` pre-fills most-shared cells first. Many units/peer links make propagation and logical scans different from a single 9x9 grid. Clue floors are scaled separately. There is no separate magic multigrid rating cap: the same samples, full ratings and local continuation operate on the larger model. |

## 3. Cost model: counts rather than a promised wall time

Let N be cells, q digits, G the number of symmetry groups, A the attempted full grids, S the samples
per attempt, T the applicable techniques, and L(N,q,allowed,state) the cost of one logical solve.
Let D(N,q,state) be the cost of a uniqueness/full-grid DFS. Both vary sharply with the puzzle state.

The constants are together at `generator/js/engine/digger.js:640-668`:
`DEFAULT_DIG_TRIES=12`, `DEFAULT_DIG_TRIES_COARSE=30`, `CAP_RATINGS=1024`,
`CAP_PROPOSALS=32768`, `REFINE_RATINGS=64`, `UNIQUE_NODES=200000`,
`OBJECTIVE_STEPS=100000`, and `SHALLOW_SEARCH_DEFAULT=256`. Their scopes differ as described above.

For the default cell strategy, a useful decomposition is:

```text
request work =
  buildModel
  + sum over A attempts [
      fullGrid + variant extraStructure
      + sum over <= S samples [
          <= G Stage-A oracle calls
          + <= G * B(N) guided objective evaluations
          + sample uniqueness safety check
          + sample/refinement canonical ratings
        ]
      + local proposals, uniqueness checks and canonical ratings
    ]

canonical full ratings per attempt <= 1024
search proposals per attempt <= 32768
post-shallow canonical ratings in one local continuation <= 256
one downward refinement <= 64 canonical ratings (also inside 1024)
```

In the guided loop each round removes a group or permanently rejects at least one, so at most G
rounds are needed; valid losing candidates can recur in later pools. G and B are upper-count
arguments, not measurements. Floors/rejections usually reduce them.

For orientation, default 180-degree symmetry has approximately N/2 groups. B is 32 at N=81,
18 at 144, 14 at 189, 10 at 256, 9 at 288 and 7 at 369. The pool shrinks to offset board size,
but that does **not** make a logical solve linear or constant-cost on a larger board.

| Default size class | A maximum | Samples, ordinary/coarse maximum | Canonical full-rating maximum |
|---|---:|---:|---:|
| <=81 cells | 8 | 96 / 240 | 8,192 |
| 82-144 cells | 4 | 48 / 120 | 4,096 |
| >144 cells | 2 | 24 / 60 | 2,048 |

These are default count ceilings, not work/time guarantees. Samples can stop early; hook work shares
the caps. `t > 1` guards at `digger.js:1914-1915` mean the first sample is still entered even if the
hook consumed a cap or found a keeper candidate. Explicit attempt/dig-sample options can exceed the
defaults. Counted canonical ratings must **not** be multiplied by all samples again: 1,024 is
shared across that attempt, whereas Stage-A/B oracle solves sit outside it.

One logical solve has repeated ordered finder scans. Each successful deduction makes progress,
but one finder can itself enumerate combinations, traverse a graph, clone states or branch.
An abstract bound is `O(number of effective deductions * sum of finder costs + state/constraint work)`;
monotone candidate removal bounds progress by the candidate/placement space, not finder cost.
Current forcing chains use a breadth-first literal search with default length 12, and Nishio has
default depth 2 (ceiling 3); `core/js/engine/tech-chain.js:25-50,62-69,117-130`.
Neither a full rating nor every ordinary oracle has a universal fixed count of cheap operations.

DFS remains a combinatorial/exponential worst-case component. In particular, the last full-grid
restart and sample safety uniqueness count have no separate deterministic node ceiling. The
200,000 uniqueness and 100,000 objective guards apply only at the sites described above.
One proposed move can therefore cost much more than another. Allocation/memo work also survives
even when ratings are avoided: local search copies N givens and scans groups per proposal.

### Why requiredness changed the order of magnitude (working-status D2)

`working-status.md:368-376` records the causal change: an in-band shallow result previously stopped
as a score-only hit; now sampling and continuation keep looking for a required proof. If none appears,
the request runs every outer attempt. Its original eight-attempt examples were:
G13 approximately 0.16 s to 220 s; classic9 Easy about 3.6 ms to 250 ms; and the 149 changed GG keys
averaged 2.38 attempts instead of 1.13. These are historical observations, not current 8/4/2 timings.

The derived certificate saves a second floor solve, but cannot undo that repetition. A more faithful
intuition than “one cheap check per puzzle” is:

```text
attempts actually consumed
  x samples actually consumed
  x many bounded/unbounded oracle solves per sample
  x cost of their applicable logical finders / DFS
plus separately capped full ratings and local proposals
```

Observed dominance is cohort-specific:

- Large-board Nightmare: ordinary samples dominate after 256; mega16 seed 3 spends 96.958 of
  107.225 s there at two attempts. Increasing/decreasing only local continuation cannot remove it.
- Killer Hard/Expert: cage/solve work plus repeated attempts and proposal-bound continuation matter.
  In R5 at 256 all 96 local searches per cell ended at the proposal cap, not the shallow allowance.
- Greater-Than: repeated sign DFS/logical oracles and retrying missed bands are current risks;
  MS05e targets a documented Normal trap, not a generic engine speedup.
- Jigsaw: most requests are short, but one 325 s tail dominates its Expert cell. No component
  attribution for that particular request is established.
- Lower levels and current vacuous Hell cells often stop early. Their observed speed does not
  bound required Nightmare or the future non-vacuous Hell 1.

Only the three named Nightmare requests have the decomposed profiles used here. The other
component attributions are structural cost risks, not measured per-stage breakdowns.

## 4. Measurements and their limits

### Reading the tables

Times are **seconds of recorded generation**, not whole test-suite or process wall time, unless
explicitly labelled otherwise. Derived median is the **upper sample median** (sorted index floor(n/2));
p95 is nearest rank (index ceil(0.95*n)-1), matching the qualification percentile rule. With n=2,
this median and p95 both equal the maximum; with n=12, p95 equals the maximum. These tiny cohorts
are not qualification experiments or reliable estimates of a production tail.

The snapshot records Node v26.13.0 on Windows x64, AMD EPYC 7763, 16 logical processors and 64 GiB.
Keep different sources, seeds, trace modes, request budgets and attempts separate. In particular:

| Family | Identity and interpretation |
|---|---|
| MS02 | Pre-order/pre-requiredness rating-v2 generation, source `43848f9c…`; 17 fixed cells x 12 tagged requests, seed base 20260101. Old score hits differ from reference-required qualified hits. |
| MS05r1 | Requiredness-active source `70036faf…`, no shallow allowance yet; deliberately forced **one attempt**, 12 samples. G13 trace summary; mega trace off. Not the old eight-attempt default request. |
| MS05r4 | Source `19afa6ee…` with explicit allowance 64/128/256/none; small-board R5 cells still eight default attempts. Separate large-board diagnostics also use eight attempts, with a 500 s diagnostic ceiling. |
| MS05r5p / MS05r5m | Generation source `fee8b8d6…`, allowance 256, defaults 2/4/2 on G13/mega12/mega16. Their raw hashes remain historical after the later store-only CV6-04 fix; its exact diff preserves generation-path compatibility, not byte-hash equality. |
| MS05b3 | All 186 manual results carry runner/evidence fingerprint `c3035e80…`, which is broader than the generation hash. 1,213 requests: 904 I5 + 309 supported CV3. Different I5 seed formulas must not be pooled with CV3's literal seeds 1..N. |

Sources are the JSON and reports under `evidence/MS02/`, `evidence/MS05r1/`,
`evidence/MS05r4/`, `evidence/MS05r5p/`, `evidence/MS05r5m/` and `evidence/MS05b3/`,
all at `1d19101`. The store-only proof is
`evidence/MS05r5p/legacy-8-fix/store-diff.patch`.

**Timing protection:** L below means the completed cell ran locked; U means `slot: none`.
MS05b3 finished 134 cells unlocked, and stopped 25 unlocked trials before rerunning them locked.
SA1 recorded 112 overlapping windows/351.3 s of overlap with Pentomino. Correctness/availability
results stand, but U timings are descriptive, not protected performance measurements. Stopped
attempts are not included as successful generation samples. S-OD5 does not change those facts.

### 4.1 MS02 baseline: generation times and the old/qualified distinction

Source: [baseline.md](baseline.md), the 17 `evidence/MS02/<variant>-<level>.json` ledgers,
`rows[].generationMs`. Each row below has n=12. The complete invocation set took 176.2 s wall time,
including soak checks/loading; that is not the sum of generation medians.

| Board / level | Median | p95 | Max | Old score hits | Requiredness-qualified hits |
|---|---:|---:|---:|---:|---:|
| classic9 Expert | 0.011 | 0.149 | 0.149 | 12 | 12 |
| classic9 Hard | 0.014 | 0.051 | 0.051 | 12 | 12 |
| classic9 Hell 1 | 0.511 | 1.467 | 1.467 | 12 | 12, vacuous |
| classic9 Master | 0.052 | 0.093 | 0.093 | 12 | 10 |
| classic9 Nightmare | 0.121 | 0.467 | 0.467 | 12 | 0 |
| classic9 Normal | 0.018 | 0.161 | 0.161 | 12 | 3 |
| diagonalX Nightmare | 0.032 | 0.123 | 0.123 | 12 | 0 |
| greaterThan Expert | 4.209 | 15.620 | 15.620 | 10 | 8 |
| greaterThan Hard | 0.227 | 4.272 | 4.272 | 12 | 11 |
| greaterThan Normal | 0.070 | 0.112 | 0.112 | 12 | 1 |
| jigsaw9 Expert | 0.083 | 0.248 | 0.248 | 12 | 2 |
| jigsaw9 Hard | 0.036 | 0.103 | 0.103 | 12 | 12 |
| jigsaw9 Nightmare | 0.028 | 0.099 | 0.099 | 12 | 0 |
| jigsaw9 Normal | 0.026 | 0.053 | 0.053 | 12 | 3 |
| killer Expert | 1.016 | 14.452 | 14.452 | 12 | 0 |
| killer Hard | 0.372 | 1.420 | 1.420 | 12 | 0 |
| killer Normal | 0.639 | 1.350 | 1.350 | 12 | 5 |

Total: **202/204 old hits, 91/204 qualified**, including 12 vacuous Hell 1 hits.
111/202 in-band results were shallow. These fast old hits are not a required-exactness baseline success.

### 4.2 MS05r1 one-attempt work profiles and MS05r5p closure diagnostics

Sources: `evidence/MS05r1/profile/{G13,mega12-nightmare,mega16-nightmare}.json`,
`evidence/MS05r5p/{G13,mega12-nightmare,mega16-nightmare}.json`, and
[recovery-profile.md](recovery-profile.md). Ordinary sample time includes dig/rate/tune triplets;
local time is the continuation triplet. Small residuals are grid/setup/other stage work.
G13 is samurai Nightmare **seed 42**; both mega requests use **seed 3**.

| Phase / request | Attempts / samples | Generation | Ordinary samples | Local continuation | Full ratings, sample / local | Local proposals |
|---|---:|---:|---:|---:|---:|---:|
| r1 G13, no allowance | 1 / 12 | 24.362 | 10.244 | 14.104 | 19 / 1005 | 7,532 |
| r1 mega12, no allowance | 1 / 12 | 6.974 | 4.221 | 2.744 | 20 / 615 | 32,768 |
| r1 mega16, no allowance | 1 / 12 | 79.675 | 54.937 | 24.718 | 39 / 985 | 3,108 |
| r5p G13, 256 | 2 / 24 | 21.556 | 15.473 | 6.066 | 53 / 512 | 3,407 |
| r5p mega12, 256 | 4 / 48 | 23.775 | 19.792 | 3.971 | 89 / 887 | 37,223 |
| r5p mega16, 256 | 2 / 24 | 107.225 | 96.958 | 10.252 | 95 / 512 | 1,720 |

All six produced valid unique shallow fallbacks, **exact=false, required=false**, with both
approximate/shallow warnings. Validation took about 1-5 ms per record. These are single requests:
their median/p95 cannot be interpreted as a distribution. The r1 G13 full-grid stage was 7.456 ms
against 24.362 s total; that profile's dominant work was digging, not building its solution.

The r1 evidence separately admits an unlocked, non-evidence diagnostic (mega12 eight attempts,
69.6 s). It is not pooled into any table or used as a protected performance result.

### 4.3 MS05r4: fixed R5 selection and time distributions

Sources: [shallow-cap-2026-11-13.md](shallow-cap-2026-11-13.md),
`evidence/MS05r4/selection.json` and the ledgers named by each cell's `shards`.
Every row is 12 requests; the R5 criterion uses exact hits and the **upper median full-rating count**,
not the time columns. Times below are recomputed from those existing rows.

| Cell | Allowance | Exact / 12 | Rating median | Time median | p95 = max | Total generation |
|---|---|---:|---:|---:|---:|---:|
| classic9 Normal | none | 10 | 75 | 0.156 | 1.025 | 2.790 |
| classic9 Normal | 256 | 10 | 75 | 0.166 | 1.003 | 2.741 |
| classic9 Normal | 128 | 10 | 75 | 0.151 | 0.883 | 2.691 |
| classic9 Normal | 64 | 10 | 75 | 0.183 | 0.789 | 2.617 |
| classic9 Master | none | 12 | 4 | 0.060 | 0.113 | 0.776 |
| classic9 Master | 256 | 12 | 4 | 0.057 | 0.123 | 0.782 |
| classic9 Master | 128 | 12 | 4 | 0.051 | 0.108 | 0.712 |
| classic9 Master | 64 | 12 | 4 | 0.058 | 0.109 | 0.766 |
| classic9 Nightmare | none | 2 | 1417 | 5.251 | 8.001 | 61.093 |
| classic9 Nightmare | 256 | 2 | 1345 | 4.908 | 5.719 | 54.643 |
| classic9 Nightmare | 128 | 1 | 1000 | 3.988 | 4.889 | 47.785 |
| classic9 Nightmare | 64 | 0 | 616 | 3.494 | 4.098 | 39.647 |
| killer Hard | none | 0 | 512 | 4.907 | 6.006 | 58.620 |
| killer Hard | 256 | 0 | 512 | 4.884 | 6.030 | 58.359 |
| killer Hard | 128 | 0 | 512 | 4.844 | 6.025 | 58.195 |
| killer Hard | 64 | 0 | 497 | 4.649 | 5.737 | 56.768 |
| killer Expert | none | 0 | 2250 | 9.625 | 15.712 | 119.598 |
| killer Expert | 256 | 0 | 2250 | 9.671 | 16.074 | 120.852 |
| killer Expert | 128 | 0 | 2250 | 9.635 | 15.775 | 120.054 |
| killer Expert | 64 | 0 | 2238 | 9.642 | 15.700 | 119.545 |
| jigsaw9 Expert | none | 11 | 318 | 0.616 | 2.555 | 9.310 |
| jigsaw9 Expert | 256 | 11 | 318 | 0.629 | 2.619 | 8.126 |
| jigsaw9 Expert | 128 | 11 | 260 | 0.386 | 1.658 | 5.591 |
| jigsaw9 Expert | 64 | 11 | 170 | 0.309 | 1.069 | 4.011 |

**256 was selected.** It loses no hit against none and reduces classic9 Nightmare's rating median
1,417 -> 1,345 (5.08%). 64 and 128 lose its hits and are ineligible. This is one improving median
in a six-cell, 12-request-per-cell selector, not evidence that 256 is globally time-optimal.
At 256, Killer Hard/Expert's 96 local searches per cell all hit the proposal limit; the allowance
does not shorten them. All these selection boards have 81 cells, so the later size defaults do not
change their eight-attempt basis.

The separate eight-attempt large-board diagnostics, each a single fixed request under 500 s:

| Request | Allowance | Generation | Samples | Local | Full ratings (local) | Exact |
|---|---|---:|---:|---:|---:|---|
| G13 | none | 220.5 | 73.7 | 146.7 | 8192 (8009) | no |
| G13 | 256 | 104.6 | 73.9 | 30.6 | 2231 (2048) | no |
| G13 | 128 | 86.7 | 73.9 | 12.8 | 1207 (1024) | no |
| G13 | 64 | 80.0 | 73.9 | 6.1 | 695 (512) | no |
| mega12 seed 3 | none | 65.1 | 38.0 | 27.1 | 5461 (5260) | no |
| mega12 seed 3 | 256 | 47.1 | 37.7 | 9.4 | 2112 (1911) | no |
| mega12 seed 3 | 128 | 43.8 | 39.1 | 4.7 | 1216 (1015) | no |
| mega12 seed 3 | 64 | 39.4 | 37.5 | 1.9 | 713 (512) | no |
| mega16 seed 3 | none | 388.7 | 264.2 | 124.5 | 5163 (4915) | yes, attempt 6 |
| mega16 seed 3 | 256 | 310.2 | 278.1 | 32.1 | 1535 (1287) | yes, attempt 6 |
| mega16 seed 3 | 128 | 296.3 | 281.3 | 15.0 | 895 (647) | yes, attempt 6 |
| mega16 seed 3 | 64 | 270.4 | 263.2 | 7.2 | 575 (327) | yes, attempt 6 |

All four settings returned the same puzzle for each diagnostic request. The mega16 exact hit
at attempt 6 is knowingly unavailable with today's two-attempt default.
Original-limit preflights are also retained, not relabelled passes: G13 104.7 s under 120 s;
mega12 seed 1 48.2 s against its old 6 s assertion (CV5 test 137.7 s); both old mega16 tests
ended at their 60 s generation guards. S-OD3 replaced the quick-tier contract, not those results.

### 4.4 MS05r5m: every deep occurrence

Source: `evidence/MS05r5m/reconciled.json`, `records/<occurrence>.json`, and its evidence report.
Each occurrence is a fresh independent process; CV5's repeated seed 3 is not an alias.
All use 256, trace off, 4 attempts on mega12 / 2 on mega16, and the 500 s diagnostic budget.
All 14 are valid/unique, all 15 independent checks per record pass, all six recorded relations pass;
all 14 are shallow, not exact. The seven occurrences per board contain only four distinct seeds.

| Occurrence | Generation | Independent checks |
|---|---:|---:|
| mega12-invariant-1 | 23.721 | 0.012 |
| mega12-invariant-2 | 23.520 | 0.017 |
| mega12-invariant-3 | 23.637 | 0.014 |
| mega12-invariant-4 | 25.243 | 0.016 |
| mega12-cv5-a (seed 3) | 23.723 | 0.016 |
| mega12-cv5-b (seed 3) | 23.867 | 0.016 |
| mega12-cv5-other (seed 4) | 24.951 | 0.015 |
| mega16-invariant-1 | 116.951 | 0.031 |
| mega16-invariant-2 | 103.606 | 0.030 |
| mega16-invariant-3 | 107.517 | 0.014 |
| mega16-invariant-4 | 80.394 | 0.030 |
| mega16-cv5-a (seed 3) | 107.753 | 0.013 |
| mega16-cv5-b (seed 3) | 104.106 | 0.015 |
| mega16-cv5-other (seed 4) | 80.487 | 0.028 |

| Board / Nightmare | n | Median | p95 | Max | Exact | Above 30 s |
|---|---:|---:|---:|---:|---:|---:|
| mega12 | 7 | 23.723 | 25.243 | 25.243 | 0/7 | 0/7 |
| mega16 | 7 | 104.106 | 116.951 | 116.951 | 0/7 | 7/7 |

The tool reported diagnostic guard recommendations of 40 s / 180 s using 1.5 times the largest
generation-plus-check duration, rounded up to 5 s. These are **not changes to the app's 120 s guard**
or qualification's 30 s p95 budget. The real one-attempt mega12 quick smoke was about 5.2 s; the
scripted mega16 controls were about 0.1 s together. They are distinct from the full deep population.

### 4.5 MS05b3: all current per-board/per-level request distributions

Source: [evidence/MS05b3/outcomes.json](evidence/MS05b3/outcomes.json), `outcomes[].requestMs`,
with request identities in `manifest.json` and raw selected-test results/transcripts beside them.
There are **53 I5 + 118 supported CV3 + 15 refusal cells = 186**: 167 pass, 6 fail their hit-rate
assertion, 13 fail only “none of N puzzles hit it”. Every per-puzzle assertion passed.
The 15 refusal cells cover 17 unsupported requests; they are not generated-puzzle timing rows.

CV3 uses literal seeds 1..N and a 240 s per-request guard. I5 uses each suite's own fixed formulas;
its timed generation has no equivalent universal 240 s guard. Request times are integer milliseconds,
not test-body/process wall times. Total completed-cell process time was 2,376.762 s; recorded wall
time was 10,324.6 s. The sequencer's wall-minus-process “lockWaitSeconds” can include killed trials
and fairness gaps and is not pure lock waiting.

**Exact information is deliberately limited.** CV3 pass proves at least one exact hit, not N hits.
Passing Killer I5 proves >80%; passing Jigsaw/Greater-Than/Wordoku I5 proves >=90%.
Extra-regions I5 records no aggregate exact count. Actual counts are shown where failures expose them;
NR means not recorded, not zero. These thresholds are not qualification verdicts.

#### I5 (904 requests; separate seed populations from CV3)

| Board | Level | n | Median | p95 | Max | Exact information | Slot |
|---|---|---:|---:|---:|---:|---|---|
| killer | veryEasy | 20 | 0.003 | 0.005 | 0.016 | >80% | U |
| killer | easy | 20 | 0.019 | 0.031 | 0.057 | >80% | U |
| killer | normal | 20 | 0.305 | 1.708 | 1.758 | >80% | L |
| killer | hard | 20 | 4.751 | 6.468 | 6.492 | 0/20 | L |
| killer | expert | 8 | 10.815 | 14.738 | 14.738 | 1/8 | L |
| killer | master | 8 | 12.454 | 23.365 | 23.365 | 2/8 | L |
| killer | nightmare | 8 | 17.820 | 29.976 | 29.976 | 1/8 | L |
| killer | hell1 | 8 | 0.945 | 1.850 | 1.850 | >80% | L |
| killer | hell2 | 8 | 1.442 | 7.427 | 7.427 | >80% | L |
| jigsaw9 | veryEasy | 20 | 0.006 | 0.041 | 0.051 | >=90% | U |
| jigsaw9 | easy | 20 | 0.148 | 0.631 | 0.897 | >=90% | U |
| jigsaw9 | normal | 20 | 0.032 | 0.319 | 0.397 | >=90% | U |
| jigsaw9 | hard | 20 | 0.019 | 0.078 | 0.086 | >=90% | U |
| jigsaw9 | expert | 20 | 0.917 | 2.438 | 325.313 | >=90% | L |
| jigsaw9 | master | 20 | 0.047 | 0.130 | 0.156 | >=90% | L |
| jigsaw9 | nightmare | 20 | 0.953 | 2.325 | 2.736 | >=90% | L |
| jigsaw9 | hell1 | 20 | 0.038 | 0.156 | 0.192 | >=90% | L |
| jigsaw9 | hell2 | 8 | 0.523 | 0.903 | 0.903 | >=90% | L |
| greaterThan | veryEasy | 20 | 0.017 | 0.024 | 0.039 | >=90% | U |
| greaterThan | easy | 20 | 0.022 | 0.049 | 0.049 | >=90% | U |
| greaterThan | normal | 20 | 1.618 | 5.280 | 6.690 | >=90% | L |
| greaterThan | hard | 10 | 0.182 | 4.829 | 4.829 | >=90% | U |
| greaterThan | expert | 10 | 2.402 | 14.204 | 14.204 | >=90% | L |
| greaterThan | master | 10 | 4.071 | 6.847 | 6.847 | >=90% | L |
| greaterThan | nightmare | 10 | 9.299 | 19.192 | 19.192 | >=90% | L |
| greaterThan | hell1 | 10 | 0.234 | 0.651 | 0.651 | >=90% | L |
| greaterThan | hell2 | 10 | 0.668 | 4.662 | 4.662 | >=90% | L |
| diagonalX | veryEasy | 20 | 0.002 | 0.004 | 0.012 | NR | U |
| diagonalX | easy | 20 | 0.587 | 0.945 | 1.011 | NR | L |
| diagonalX | normal | 20 | 0.017 | 0.038 | 0.057 | NR | U |
| diagonalX | hard | 20 | 0.009 | 0.017 | 0.032 | NR | U |
| diagonalX | expert | 20 | 0.358 | 1.253 | 1.835 | NR | U |
| diagonalX | master | 20 | 0.065 | 0.221 | 0.235 | NR | U |
| diagonalX | nightmare | 20 | 5.556 | 13.499 | 14.665 | NR | L |
| diagonalX | hell1 | 20 | 0.045 | 0.093 | 0.631 | NR | L |
| diagonalX | hell2 | 8 | 0.226 | 0.606 | 0.606 | NR | U |
| hyper | veryEasy | 20 | 0.002 | 0.003 | 0.012 | NR | U |
| hyper | easy | 20 | 0.488 | 0.996 | 1.030 | NR | L |
| hyper | normal | 20 | 0.023 | 0.255 | 0.514 | NR | U |
| hyper | hard | 20 | 0.009 | 0.023 | 0.036 | NR | U |
| hyper | expert | 20 | 0.577 | 1.338 | 1.428 | NR | L |
| hyper | master | 20 | 0.115 | 0.435 | 0.498 | NR | U |
| hyper | nightmare | 20 | 0.683 | 2.212 | 2.582 | NR | L |
| hyper | hell1 | 20 | 0.042 | 0.257 | 0.404 | NR | U |
| hyper | hell2 | 8 | 0.481 | 1.689 | 1.689 | NR | U |
| wordoku | veryEasy | 20 | 0.002 | 0.004 | 0.014 | >=90% | U |
| wordoku | easy | 20 | 0.235 | 0.491 | 0.946 | >=90% | U |
| wordoku | normal | 20 | 0.250 | 0.636 | 0.761 | 15/20 | U |
| wordoku | hard | 20 | 0.022 | 0.102 | 0.250 | >=90% | U |
| wordoku | expert | 20 | 0.026 | 0.137 | 0.305 | >=90% | U |
| wordoku | master | 20 | 0.118 | 0.348 | 0.435 | >=90% | U |
| wordoku | nightmare | 20 | 4.956 | 5.486 | 5.645 | 4/20 | L |
| wordoku | hell1 | 20 | 0.573 | 1.519 | 2.105 | >=90% | L |

Jigsaw Expert's outlier is request 12, **seed 1111**; the other 19 requests range from 0.007 to
2.438 s. The cell took 341.78 s in its test, 342.4 s as a process. A median or p95 alone hides
that extreme request. Greater-Than Normal's literal seeds 300-319 have **mean 1.958 s, p95 5.280 s,
max 6.690 s**. This is I5 generation telemetry, not a new execution of CV6; the scaled CV6 assertion
is still 1.400 s (design 0.700 s times factor 2).

#### Supported CV3 (309 requests)

| Board | Level | n | Median | p95 | Max | Exact information | Slot |
|---|---|---:|---:|---:|---:|---|---|
| classic4 | veryEasy | 3 | 0.002 | 0.008 | 0.008 | >=1/3 | U |
| classic6 | veryEasy | 3 | 0.003 | 0.009 | 0.009 | >=1/3 | U |
| classic6 | hard | 3 | 0.075 | 0.190 | 0.190 | >=1/3 | U |
| classic9 | veryEasy | 3 | 0.003 | 0.012 | 0.012 | >=1/3 | U |
| classic9 | easy | 3 | 0.314 | 0.521 | 0.521 | >=1/3 | U |
| classic9 | normal | 3 | 0.140 | 0.247 | 0.247 | >=1/3 | U |
| classic9 | hard | 3 | 0.028 | 0.071 | 0.071 | >=1/3 | U |
| classic9 | expert | 3 | 0.116 | 0.155 | 0.155 | >=1/3 | U |
| classic9 | master | 3 | 0.220 | 0.489 | 0.489 | >=1/3 | U |
| classic9 | nightmare | 3 | 5.051 | 5.593 | 5.593 | >=1/3 | L |
| classic9 | hell1 | 3 | 1.538 | 2.031 | 2.031 | >=1/3 | U |
| mega12 | veryEasy | 3 | 0.006 | 0.019 | 0.019 | >=1/3 | U |
| mega12 | easy | 3 | 0.011 | 0.027 | 0.027 | >=1/3 | U |
| mega12 | normal | 3 | 0.016 | 0.047 | 0.047 | >=1/3 | U |
| mega12 | hard | 3 | 0.065 | 0.068 | 0.068 | >=1/3 | U |
| mega12 | expert | 3 | 0.081 | 0.117 | 0.117 | >=1/3 | U |
| mega12 | master | 3 | 0.170 | 0.448 | 0.448 | >=1/3 | U |
| mega12 | nightmare | 3 | 23.067 | 23.509 | 23.509 | 0/3 | L |
| mega12 | hell1 | 3 | 0.048 | 1.293 | 1.293 | >=1/3 | L |
| mega12 | hell2 | 3 | 1.975 | 3.075 | 3.075 | >=1/3 | U |
| mega16 | veryEasy | 2 | 0.027 | 0.027 | 0.027 | >=1/2 | U |
| mega16 | easy | 2 | 0.045 | 0.045 | 0.045 | >=1/2 | U |
| mega16 | normal | 2 | 0.070 | 0.070 | 0.070 | >=1/2 | U |
| mega16 | hard | 2 | 0.309 | 0.309 | 0.309 | >=1/2 | U |
| mega16 | expert | 2 | 0.581 | 0.581 | 0.581 | >=1/2 | U |
| mega16 | master | 2 | 1.158 | 1.158 | 1.158 | >=1/2 | U |
| mega16 | nightmare | 2 | 116.787 | 116.787 | 116.787 | 0/2 | L |
| mega16 | hell1 | 2 | 0.616 | 0.616 | 0.616 | >=1/2 | L |
| mega16 | hell2 | 2 | 0.394 | 0.394 | 0.394 | >=1/2 | U |
| diagonalX | veryEasy | 3 | 0.002 | 0.012 | 0.012 | >=1/3 | U |
| diagonalX | easy | 3 | 0.851 | 1.032 | 1.032 | >=1/3 | U |
| diagonalX | normal | 3 | 0.248 | 0.317 | 0.317 | >=1/3 | U |
| diagonalX | hard | 3 | 0.018 | 0.053 | 0.053 | >=1/3 | U |
| diagonalX | expert | 3 | 1.146 | 3.225 | 3.225 | >=1/3 | U |
| diagonalX | master | 3 | 0.183 | 0.645 | 0.645 | >=1/3 | U |
| diagonalX | nightmare | 3 | 13.309 | 14.761 | 14.761 | >=1/3 | L |
| diagonalX | hell1 | 3 | 0.028 | 0.058 | 0.058 | >=1/3 | L |
| diagonalX | hell2 | 3 | 0.660 | 1.912 | 1.912 | >=1/3 | U |
| hyper | veryEasy | 3 | 0.004 | 0.014 | 0.014 | >=1/3 | U |
| hyper | easy | 3 | 0.253 | 0.659 | 0.659 | >=1/3 | U |
| hyper | normal | 3 | 0.214 | 0.420 | 0.420 | >=1/3 | U |
| hyper | hard | 3 | 0.035 | 0.038 | 0.038 | >=1/3 | U |
| hyper | expert | 3 | 0.595 | 2.302 | 2.302 | >=1/3 | U |
| hyper | master | 3 | 0.049 | 0.225 | 0.225 | >=1/3 | U |
| hyper | nightmare | 3 | 1.041 | 2.451 | 2.451 | >=1/3 | U |
| hyper | hell1 | 3 | 0.078 | 0.081 | 0.081 | >=1/3 | U |
| hyper | hell2 | 3 | 0.777 | 2.872 | 2.872 | >=1/3 | U |
| jigsaw9 | veryEasy | 3 | 0.012 | 0.031 | 0.031 | >=1/3 | U |
| jigsaw9 | easy | 3 | 0.347 | 0.665 | 0.665 | >=1/3 | U |
| jigsaw9 | normal | 3 | 0.018 | 0.766 | 0.766 | >=1/3 | U |
| jigsaw9 | hard | 3 | 0.032 | 0.050 | 0.050 | >=1/3 | U |
| jigsaw9 | expert | 3 | 0.761 | 1.428 | 1.428 | >=1/3 | U |
| jigsaw9 | master | 3 | 0.084 | 0.095 | 0.095 | >=1/3 | U |
| jigsaw9 | nightmare | 3 | 1.225 | 1.647 | 1.647 | >=1/3 | U |
| jigsaw9 | hell1 | 3 | 0.060 | 0.079 | 0.079 | >=1/3 | U |
| jigsaw9 | hell2 | 3 | 0.839 | 0.955 | 0.955 | >=1/3 | U |
| killer | veryEasy | 3 | 0.005 | 0.015 | 0.015 | >=1/3 | U |
| killer | easy | 3 | 0.032 | 0.054 | 0.054 | >=1/3 | U |
| killer | normal | 3 | 0.395 | 1.838 | 1.838 | >=1/3 | U |
| killer | hard | 3 | 4.804 | 5.436 | 5.436 | 0/3 | L |
| killer | expert | 3 | 10.744 | 11.011 | 11.011 | 0/3 | L |
| killer | master | 3 | 12.110 | 23.682 | 23.682 | 0/3 | L |
| killer | nightmare | 3 | 21.449 | 30.665 | 30.665 | 0/3 | L |
| killer | hell1 | 3 | 0.962 | 1.878 | 1.878 | >=1/3 | L |
| killer | hell2 | 3 | 0.963 | 2.779 | 2.779 | >=1/3 | U |
| greaterThan | veryEasy | 3 | 0.023 | 0.044 | 0.044 | >=1/3 | U |
| greaterThan | easy | 3 | 0.050 | 0.054 | 0.054 | >=1/3 | U |
| greaterThan | normal | 3 | 2.323 | 9.203 | 9.203 | >=1/3 | L |
| greaterThan | hard | 3 | 2.246 | 4.792 | 4.792 | >=1/3 | U |
| greaterThan | expert | 3 | 6.296 | 12.850 | 12.850 | >=1/3 | L |
| greaterThan | master | 3 | 0.942 | 1.122 | 1.122 | >=1/3 | U |
| greaterThan | nightmare | 3 | 11.676 | 19.731 | 19.731 | >=1/3 | L |
| greaterThan | hell1 | 3 | 0.152 | 0.758 | 0.758 | >=1/3 | L |
| greaterThan | hell2 | 3 | 0.702 | 1.397 | 1.397 | >=1/3 | U |
| samurai | veryEasy | 2 | 0.033 | 0.033 | 0.033 | >=1/2 | U |
| samurai | easy | 2 | 0.330 | 0.330 | 0.330 | >=1/2 | U |
| samurai | normal | 2 | 1.379 | 1.379 | 1.379 | >=1/2 | U |
| samurai | hard | 2 | 0.229 | 0.229 | 0.229 | >=1/2 | U |
| samurai | expert | 2 | 0.945 | 0.945 | 0.945 | >=1/2 | U |
| samurai | master | 2 | 0.965 | 0.965 | 0.965 | >=1/2 | U |
| samurai | nightmare | 2 | 26.741 | 26.741 | 26.741 | 0/2 | L |
| samurai | hell1 | 2 | 5.246 | 5.246 | 5.246 | >=1/2 | L |
| samurai | hell2 | 2 | 5.999 | 5.999 | 5.999 | >=1/2 | U |
| sohei | veryEasy | 2 | 0.029 | 0.029 | 0.029 | >=1/2 | U |
| sohei | easy | 2 | 0.411 | 0.411 | 0.411 | >=1/2 | U |
| sohei | normal | 2 | 0.193 | 0.193 | 0.193 | >=1/2 | U |
| sohei | hard | 2 | 0.274 | 0.274 | 0.274 | >=1/2 | U |
| sohei | expert | 2 | 0.193 | 0.193 | 0.193 | >=1/2 | U |
| sohei | master | 2 | 0.511 | 0.511 | 0.511 | >=1/2 | U |
| sohei | nightmare | 2 | 27.486 | 27.486 | 27.486 | 0/2 | L |
| sohei | hell1 | 2 | 0.300 | 0.300 | 0.300 | >=1/2 | L |
| sohei | hell2 | 2 | 2.865 | 2.865 | 2.865 | >=1/2 | U |
| butterfly | veryEasy | 2 | 0.021 | 0.021 | 0.021 | >=1/2 | U |
| butterfly | easy | 2 | 0.767 | 0.767 | 0.767 | 0/2 | U |
| butterfly | normal | 2 | 0.061 | 0.061 | 0.061 | >=1/2 | U |
| butterfly | hard | 2 | 0.093 | 0.093 | 0.093 | >=1/2 | U |
| butterfly | expert | 2 | 0.291 | 0.291 | 0.291 | >=1/2 | U |
| butterfly | master | 2 | 0.862 | 0.862 | 0.862 | >=1/2 | U |
| butterfly | nightmare | 2 | 32.823 | 32.823 | 32.823 | 0/2 | L |
| butterfly | hell1 | 2 | 0.742 | 0.742 | 0.742 | >=1/2 | L |
| butterfly | hell2 | 2 | 5.130 | 5.130 | 5.130 | >=1/2 | U |
| flower | veryEasy | 2 | 0.024 | 0.024 | 0.024 | >=1/2 | U |
| flower | easy | 2 | 0.632 | 0.632 | 0.632 | 0/2 | U |
| flower | normal | 2 | 0.642 | 0.642 | 0.642 | >=1/2 | U |
| flower | hard | 2 | 0.095 | 0.095 | 0.095 | >=1/2 | U |
| flower | expert | 2 | 2.335 | 2.335 | 2.335 | >=1/2 | U |
| flower | master | 2 | 3.047 | 3.047 | 3.047 | >=1/2 | U |
| flower | nightmare | 2 | 23.067 | 23.067 | 23.067 | 0/2 | L |
| flower | hell1 | 2 | 4.780 | 4.780 | 4.780 | >=1/2 | L |
| flower | hell2 | 2 | 6.219 | 6.219 | 6.219 | >=1/2 | L |
| wordoku | veryEasy | 3 | 0.003 | 0.014 | 0.014 | >=1/3 | U |
| wordoku | easy | 3 | 0.176 | 0.773 | 0.773 | >=1/3 | U |
| wordoku | normal | 3 | 0.306 | 0.473 | 0.473 | >=1/3 | U |
| wordoku | hard | 3 | 0.017 | 0.032 | 0.032 | >=1/3 | U |
| wordoku | expert | 3 | 0.110 | 0.196 | 0.196 | >=1/3 | U |
| wordoku | master | 3 | 0.042 | 0.214 | 0.214 | >=1/3 | U |
| wordoku | nightmare | 3 | 5.128 | 5.441 | 5.441 | 0/3 | L |
| wordoku | hell1 | 3 | 0.817 | 1.517 | 1.517 | >=1/3 | U |

The live mega requests are separate from the deep calls: mega16 seeds 1/2 took 116.787/103.904 s;
mega12 seeds 1/2/3 took 23.509/23.067/22.790 s. Their cells took 220.69/69.37 s in the tests.
The repeated-request protocols differ (several requests share the live cell process), so small
time differences are not evidence of an algorithm change.

### 4.6 Standing quick-set cost

Sources: `working-status.md:434-442,520`, `evidence/MS05r5m/evidence.md` (S-AV08),
`evidence/MS05b3/evidence.md` and `evidence/MS05r5p/evidence.md`.

| Observation | Measured time / status |
|---|---|
| Earlier complete Generator / Player quick sets | About 111-112 s / 25-30 s in the original report; later Player 29.3 s. Historical source, not a current guarantee. |
| MS05b1 Generator chunks | 713.8 s across three disjoint **partial** chunks; whole replay/player consumers could reach 540 s. Not a completed final quick baseline. |
| r5m quick replacements | One real one-attempt mega12 smoke about 5.2 s; scripted controls about 0.1 s together; pure mega-contract suite about 1.7 s. Full-attempt Nightmare work is offline deep evidence, not silently deleted. |
| r5m draft inventory | 3,207 tests / 49 suites; 1,740 s summed projections are planning ceilings, **not measured standing cost**. |
| b3 addition | 46 manual-corpus quick tests, 2.2-2.4 s alone, 6.3 s with help/ui-contract. |
| legacy-8 addition | Six store cases; the full store suite is 85 cases, about 74-82 ms of test-body time. |
| Final cost at this snapshot | **Unknown.** r6a has not yet supplied the saved G13 wire/final pins; r6b must execute and reconcile the complete disjoint quick sets per app. |

Persisting G13 removes repeated quick-consumer generation, not its fresh recording/analysis
obligation. Sharding bounds a command but can repeat cache setup/generation between processes.
The new S3 tasks also add acceptance, help and final-output work; its total future cost is not measured.

### 4.7 S-AV01 to S-AV13, without merging unlike cohorts

Source: `evidence/MS05b3/evidence.md` item table, carrying earlier r4/r5p/r5m observations.
Before the checkpoint these route to MS07e, then MS18c for availability/MS18d for cost; MS18e audits them.

| Item | Recorded fact / outstanding issue |
|---|---|
| S-AV01 Greater-Than Normal | Original CV6 p95 2.035 s against 1.400 s. MS05e's recorded context also gives 2.088/2.216 s on literal 300-319 and 5.043 s on 7000-7039. Current b3 I5 300-319: mean 1.958, p95 5.280, max 6.690 s. CV6 itself was not rerun by b3. |
| S-AV02 mega12 Nightmare | r5p seed 3: 23.775 s; r5m 0/7 exact, 23.520-25.243 s; live CV3 0/3, 22.790-23.509 s. Current deep sample is under 30 s but has no exact hits. |
| S-AV03 mega16 Nightmare | r5p seed 3: 107.225 s; r5m 0/7 exact, 80.394-116.951 s; CV3 0/2, 103.904/116.787 s. Far over 30 s and close to the app's different 120 s conditions. |
| S-AV04 samurai Nightmare | G13 seed 42: 21.556 s at two attempts; live CV3 seeds 1/2: 26.741/25.230 s, 0/2. G13 quick persistence belongs to r6a. |
| S-AV05 Killer Hard | R5 0/12 at every allowance; I5 0/20, p95 6.468/max 6.492 s; CV3 0/3, 3.825-5.436 s. Not proof that no seed can ever hit. |
| S-AV06 Killer Expert | R5 0/12 at every allowance; CV3 0/3, 7.057-11.011 s; I5 has **1/8**, max 14.738 s. “No hits” is cohort-specific. |
| S-AV07 classic9 Nightmare | R5 at 256: 2/12. CV3 now passes with at least 1/3, request times 5.051/0.615/5.593 s; it does not establish a qualifying hit rate. |
| S-AV08 quick-set cost | Historical partial 713.8 s; current complete per-app measurement still owed by r6b. The above cheap additions do not supply that total. |
| S-AV09 Killer Master/Nightmare | I5 2/8 and 1/8; cells 96.56/148.66 s. CV3 0/3 each, maxima 23.682/30.665 s. |
| S-AV10 Wordoku | I5 Normal 15/20, 0.007-0.761 s (U); Nightmare 4/20, max 5.645 s; Nightmare CV3 0/3, 4.712-5.441 s. |
| S-AV11 Jigsaw tail | Expert seed 1111: 325.313 s in an unguarded I5 request; cell 341.78 s, other requests <=2.438 s. Attribution to a stage is unknown. |
| S-AV12 multigrid Nightmare | Sohei 0/2, 19.702/27.486 s; Butterfly 0/2, 26.275/32.823 s; Flower 0/2, 23.067/20.405 s. |
| S-AV13 low-level multigrid misses | Butterfly Easy 0/2, 0.767/0.652 s; Flower Easy 0/2, 0.375/0.632 s. U timings; availability findings, not slow cases. |

## 5. What can still change runtime before the final

These are **projections**, not measured improvements or new authorizations. The named task files at
`1d19101` define the current plan; an answer to PR-S2 may recommend amendments.

| Planned work / source | Expected time effect — projection only |
|---|---|
| MS05e, `tasks/difficulty-v3/MS05e-guided-sign-dig.md:12-38,56-83` | Replace only the technique-oracle sign pass with a pool initially 8, using solves the oracle already performs and preferring tier use. It can evaluate more signs per accepted removal, but may avoid wrong-band/minimal-sign traps and repeated samples/attempts. Net time is unproved; the fixed pool comparison may use 4/8/16 under S-OD1. It does not fix cell digging or add a new global cap. First place PR-S2 could affect implementation. |
| MS06, `MS06b-target-policy-primitives.md`, `MS06c1-target-transport.md`, `MS06c2-activate-target-policy.md`, `MS06d-target-comparison.md` | MS06b/c1 prepare the policy/transport; c2 activates one originating raw-band target per sample through guided cells/signs, already-entered refinement, keeper comparisons and local search. Comparisons are cheap, but altered paths can increase or decrease solves, refinements and attempts. Requiredness stays ahead of target proximity; first-exact outer stopping remains; no unconditional polishing. Full-grid generation and untargeted Killer structure-only offers do not gain a separate target search. |
| MS07a-c, chain windows/Hell 1/C | Split forcing chains into 1..C and C+1..12 (weights 1100/1400), and Nishio depth 1 versus deep default 2 (weight 2600). Long/deep wrappers must prove the minimum, so overlapping search work is a cost risk. Hell 1 gains a real deep-Nishio tier and can newly exhaust all attempts. C=4 versus 6 is chosen by exact hits over 72 requests, not speed; C6 wins ties. A two-request Hell 1 pilot and cost evidence precede broader planning. |
| MS08-MS16, S3 | Single-digit patterns/finned fish, wings/uniqueness extensions, restricted XY-chain, grouped chains, leftovers, ALS-XZ and Sue de Coq add finder scans and potentially costly negative searches to ratings and bounded oracles. They can also finish puzzles earlier and create required hits, reducing outer repetition. Conversely, a stronger floor can make a formerly required puzzle shallow and increase retries. Neither direction nor magnitude is established. Inactive-kernel tasks are not activation. All six S3 groups remain in scope. |
| MS17b, `MS17b-version-cache-and-freeze.md:28-58` | Freeze actual measured finder limits, cap/C and sign-pool choices; bump rating/cache to 3, preserve history/wire 1. No retuning is owned here. Cache invalidation can cause one-time regeneration; cache comparison adds no solve. The planned final catalogue has 40 IDs/34 unscoped. Freezing limits stabilizes the cost contract, not the measured latency. |
| MS18b, `MS18b-recheck-cap-and-window.md:24-56` | Repeat 288 allowance and 72 cutoff requests with the completed catalogue, one dimension at a time. A different winner requires the owner's keep/change decision before implementation and renewed affected evidence. This task itself changes no generator/solver logic. A sample-level bound, if indicated, remains a separate proposed decision, not an already approved optimization. |

MS07e is the first qualification checkpoint, not permission to hide cells or recalibrate weights early.
If Killer Hard/Expert are hidden there, its task asks the owner whether to recalibrate within v3 or
leave them hidden. No answer is assumed here.

## 6. Performance facts and complexity risks for Fable to judge

1. **Qualification and app budgets are different contracts.** `generator/tests/qualify.js:19-33,67,130-139`
   uses p95 budgets 2 s for <=36 cells, 10 s for <=81, and 30 s above 81; normally 36/40 exact hits,
   or 90/100 in its extension. Bounded fallback/timeouts are misses. The browser's worker budget is
   120,000 ms of active generation (`worker-client.js:45,198`; `gen.worker.js:97,261`), with default
   summary trace and cooperative scheduling. The deep records are synchronous trace-off Node runs.
   A 116.951 s Node result has about 3 s numerical headroom against 120 s, **not proof that the app
   completes it**. No actual application run of that request is supplied here.
2. **A local rating allowance cannot bound ordinary sample cost.** The 96.958 s ordinary portion of
   the current mega16 seed-3 diagnostic remains outside 256. Lower local allowances were faster in
   r4's diagnostics but lost required hits in the fixed selector. There is no approved common
   sample/oracle bound beyond the existing site-specific controls.
3. **No-hit cells consume work without gaining availability.** Killer Hard and the specified Expert
   cohorts illustrate this; proposal-cap endings and a rating-count cap are not the same resource.
   Low-level Butterfly/Flower misses also show that unavailable is not synonymous with slow.
   The current ordinary guided objective maximizes score, not tier use; the top-tier proposal rewards
   being stuck without chains, not specifically needing the requested tier. This differs from the
   stricter final acceptance objective. Its separate contribution to retry cost has not been measured.
4. **Non-vacuous Hell 1 and S3 can move the bottleneck.** Current Hell speed does not settle the
   future contract. New finders increase the cost of every failed search as well as successful ratings;
   better proofs/early exits may offset it, but the offset has not been measured.
5. **Tail behavior is not summarized by a median.** The Jigsaw outlier survives the current local
   guards; the final full-grid search and sample uniqueness check can be large. Its stage is unknown.
   Even the 20-request p95 misses that single 325 s observation. Tests without request budgets are
   not evidence that the application's guard is met.
6. **Budget units are not uniform time units.** A proposal, solver budget check or DFS node costs
   different amounts across q=9/q=16, cages, inequalities and overlapping grids. Requiredness metadata,
   repeated candidate allocation and memo hits also consume work outside the full-rating total.
7. **Validation cost remains open.** r6a/r6b will establish the final recovery output/quick state.
   The 713.8 s partial history, 1,740 s projection and 2,376.762 s manual process total are different
   populations; none is a current complete quick-set measurement. Offline deep coverage and G13
   persistence reduce repeated validation work but do not optimize the generator's hot path.
8. **The evidence is deliberately small and heterogeneous.** R5 uses 12 tagged requests per cell;
   deep tests repeat four literal seeds; CV3 uses 2/3 requests; I5 uses other seeds and unguarded
   populations. U timings and older-source results must retain their caveats. They identify risks,
   not final offer decisions or machine-independent latency guarantees.

The old qualification comments in `generator/js/variants/mega.js:60-61` and
`generator/js/variants/multigrid.js:320-323` are historical, not current evidence that every offered
level fits 30 s under requiredness. The current support arrays remain pending the prescribed final
qualification; this report does not silently prune them.

PR-S2 asks whether this cost structure changes the remaining MS05e-MS18e tasks, first MS05e/MS06.
Until Fable answers and any required decision is recorded, existing requiredness, budgets, allowance,
scope and qualification rules remain in force. Work continues under the existing task plan.
