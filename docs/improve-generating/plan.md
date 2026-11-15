# Improve generating (Sudoku): a faster generator for the upper levels

> **Version 2 (2026-11-15), revised after the provisional phase-0 round.** Version 1 is this file at commit
> `1437774`. Version 2 folds in the joint analysis ([report.md](report.md)), the plan-author answers IG-S-Q01 to
> IG-S-Q16 ([clarifications.md](clarifications.md)) and the provisional measurements
> ([evidence/phase0/provisional-r1/report-r3.md](evidence/phase0/provisional-r1/report-r3.md), with its errata E1
> to E10). Section 0 lists what changed and why. **Every measured number is provisional and stale:** the
> MS05e-era runtime (`f7be90f`) on the rating-version-2 catalogue, Node, three paired seeds per cell (eight grid
> clusters for SM2), no browser run. Rating v3 (MS06, MS07) has since changed tiers, weights and the chain
> kernels. The formal gate is `not-evaluable-pre-freeze`; nothing here is a gate result or an offer.
>
> **Addendum, section 9 (2026-11-15): read it first.** On the `rating-v3` source (`7fe14fb`) the Nightmare cells
> this plan targets now pass by the rating change alone, so section 9 supersedes sections 0.1, 1 and 4 where
> they name the failing cells and their times. It also lists five further candidates (K1 to K5) and questions
> for the analysts.

Plan author: claude-fable-5-2, 2026-11-14; version 2 on 2026-11-15. Written with the answer to **PR-S2**
([clarifications.md](../difficulty-v3/clarifications.md)). Status: **proposal; nothing implemented in production**;
the prototypes are test-side harnesses under `generator/tests/artifacts/improve-generating/`.
It is the input of a later feature ("improve-generating"); architects turn it into a design and a task pack.

Inputs read: [generator-state-2026-11-14.md](../difficulty-v3/generator-state-2026-11-14.md) (pipeline, cost
model, every recorded timing) and the code of the snapshot `1d19101` (`generator/js/engine/digger.js`,
`difficulty.js`, `pipeline.js`, `core/js/engine/logical-solver.js`, `dfs-solver.js`,
`generator/js/worker/worker-client.js`, `gen.worker.js`).

Labels, as in the state report: **Fact** (measured or read from the code), **Analysis** (derived, derivation
given), **Projection** (expected, not measured), and from version 2 **Measured (provisional)**: a row of
`report-r3.md`. Version 1 ran nothing; version 2 ran nothing either and only reads the records of the prototype
pack. Each proposal keeps a gate.

## 0. What version 2 changes

### 0.1 Estimate against provisional measurement

Nightmare at the default work, ready wall time in Node, median of three paired seeds, trace off. "First phases"
is the report's estimate for full S3 x S4 x S5a. Only S5a and a partial S3 (singles and subsets) were built.

| Cell (attempts) | Today, report | Today, re-measured | Report: after the first phases | Measured: S5a at width 4 | S5a factor: estimated; measured (range) | Exact, before and after |
|---|---|---|---|---|---|---|
| mega16 (2) | 104.1 s | 107.5 s | 39 s | 55.9 s | 1.7 to 1.8; 1.92 (1.66 to 1.96) | 0 of 3; 0 of 3 |
| mega12 (4) | 23.7 s | 23.4 s | 5.4 s | 7.1 s | 2.8 to 3.0; 3.22 (3.04 to 3.43) | 0 of 3; 0 of 3 |
| samurai (2) | 26.7 s (the larger of two) | 24.9 s | 10.3 s | 13.6 s | 1.7 to 1.8; 1.79 (1.70 to 1.83) | 0 of 3; 0 of 3 |
| classic9 (8) | 4.91 s | 4.98 s | 1.17 s | 1.55 s | 2.8 to 3.0; 3.22 (0.91 to 3.25) | 1 of 3; 1 of 3 |
| Killer (8) | 17.8 s | 21.1 s | 4.5 s | 8.0 s | 2.8 to 3.0; 2.55 (2.07 to 2.65) | 0 of 3; 0 of 3 |
| Greater-Than (8) | 9.3 s | 11.6 s | 2.2 s | 4.4 s | 2.8 to 3.0; 2.62 (0.89 to 3.06) | 3 of 3; 3 of 3 |

| Item | Plan v1 | Report | Measured (provisional) | Against the estimate |
|---|---|---|---|---|
| S5a pool | up to min(P, A) times | x2.8 to 3.0, x1.7 to 1.8 on two-attempt boards | the table above; the same puzzles on 18 of 18 pairs; CPU x0.98 to 1.58 of the serial run; x0.89 to 0.91 on requests whose first attempt is exact | as estimated on four cells; below on Killer; mixed on Greater-Than |
| S3 | 3 to 10 times on the non-chain part of a solve | x1.3 to 1.65 on solve work | partial S3: x0.91 to 1.04 over the pool, x0.94 to 1.03 serially; check-sequence parity holds (770 injected failures equal) | no gain in the scope built; the full S3 is untested |
| Where a solve's time is | unknown (SM1) | chains suspected | the covered finders are 3.9 to 12.7 % of a Nightmare request; `nishio` and `forcingChain` are 53 to 81 % on classic9, mega12, mega16 and samurai, 17 to 24 % on Killer and Greater-Than (n 1 per cell) | the non-chain part is small: S3 as planned aims at the wrong part |
| S1 frontier dig | 10 times fewer solves per sample; more exact puzzles | time per sample divided by 1 to 3; hit rate unmeasured | a frontier sample costs 0.12 to 0.38 of the native sample mix, but **0 verified exact puzzles in 192 frontier trials** and 0 in the 64 native control trials; 45 of the 64 F1 samples ended on an empty frontier, and mega16's candidates lay above the band | cheap because it fails; no yield shown, none refuted |
| S2 early exit | "a few deductions, not a solve" | inside S1's divisor | 85 to 96 % of accepted removals are decided by re-derivation, yet sample CPU is x1.01 to 1.12 of the same dig without it; 0 correctness problems | no CPU saving on this cohort |
| Solves per sample | about 1,296 on every board | about 25 to 185 rating equivalents | 74 to 331 solves per ordinary sample (SM1) | the plan's figure is withdrawn as a cost (E6) |
| S7, Jigsaw seed 1111 | stage unknown | unknown | censored at 240 s; 99.5 % of the time in the full-grid search | the stage is found; no ceiling sized |
| Greater-Than, solve first | not in the plan | a diagnostic (IG-S-Q16) | x1.03 on Normal, x0.17 on Nightmare (six pairs) | not adopted |

Not measured: the full S3, S4, S5b, a whole request with S1 (IG-S06, deferred), the pool at widths 1, 2 and 4
(SM5), the restricted-floor probes, and the cells wordoku, sohei, flower and butterfly.

**Verdict.** The measured improvement is the pool's and it is what the analysts estimated, not more: 1.8 to 3.2
times on the wall clock for the same puzzles, at up to 1.6 times the CPU. The first phases as built reach 54.7,
6.8, 13.4, 1.7, 8.5 and 4.7 s on the six cells against 39, 5.4, 10.3, 1.17, 4.5 and 2.2 s estimated, 1.3 to 2.1
times short, because S3 has added nothing yet. Nothing measured supports version 1's larger projections, and
no cell gained an exact puzzle: speed is not what keeps mega12, mega16 and the multigrids from Nightmare.

### 0.2 The baseline has moved under the measurements

Rating v3 (`8b70875`: MS06a-d, MS07a-d) changed 11 runtime files, split the chain techniques
(`forcingChainLong`, `nishioDeep`) and widened the Nightmare window from about 220 to about 590 points. MS07c
reports classic9 Nightmare at 12 of 12 exact with a p50 of 0.15 s, samurai seed 42 exact at the first attempt
and a non-vacuous Hell 1. Those are another source, cohort and cap, not paired with this round. They mean that
(1) the list of failing cells in section 1 must be re-derived on the frozen catalogue before any item is
justified by it, and (2) the rating change may move the hit rate more than any search item here. Three of the
eight harness adapters no longer apply to that source; repairing them is uncosted (decision D10).

### 0.3 Changes to the plan

1. **Phase 1 is the version field, history v2 and S5a only.** S5a is the one measured, rating-independent gain.
2. **S3 leaves phase 1 and is re-scoped** to the chain kernels, behind a frozen profile (section 3, S3).
3. **S1 and S2 are no longer the plan's centre.** They stay undecided until the frozen SM2 screen, with a stop
   rule (section 3, S1).
4. **S5b is promoted and decoupled from S1**: samples are 57 to 90 % of a Nightmare request, and on the
   two-attempt boards S5a cannot use more than two workers.
5. **S7 targets the full-grid search first.**
6. The cost premises "1,296 solves per sample" and "10 times fewer solves" are withdrawn (section 2.2).
7. Availability on the large boards is expected from the rating v3 window and, failing that, from the bank
   (S9), not from search speed.

## 1. Goal, non-goals and constraints

**Goal.** Make an exact (in band **and** required) puzzle of the upper levels in the browser within the existing
contracts: qualification p95 of 2 s / 10 s / 30 s by size and at least 90 % exact hits, and the app's 120 s guard.
The cells that fail today are Nightmare on mega12, mega16, samurai, sohei, butterfly, flower, classic9, wordoku
and Killer Hard to Nightmare; the levels that must stay reachable when they stop being vacuous are Hell 1 and
Hell 2 (MS07b gives Hell 1 a real tier; S3 may give Hell 2 one).

**Non-goals.** No change to the rating: the canonical rating, technique weights, bands, the requiredness
predicate and the exact predicate stay those of rating v3 as frozen by MS17b. Every returned puzzle is still
accepted by the canonical rating and a uniqueness proof. The feature changes **how candidates are found**, not
what counts as a hit.

**Constraints.**

- Classic scripts on the `SG` global, no build step, pages work from `file://` (AGENTS.md). That excludes
  `SharedArrayBuffer` (needs cross-origin isolation headers) and makes a fetched `.wasm` unreliable; workers
  with message passing are fine (one is already used).
- Determinism: a request (variant, level, seed, options) gives the same puzzle on every machine, whatever the
  number of workers.
- The search path changes, so recorded recipes, regression hashes and help snapshots change. The feature needs its
  own generator-algorithm version, and starts **after** difficulty-v3 is closed (MS18e), on the frozen catalogue.

## 2. Diagnosis

### 2.1 Where the time goes (Fact)

- mega16 Nightmare, seed 3, defaults (2 attempts x 12 samples): 107.2 s, of which **97.0 s in ordinary samples**
  and 10.3 s in the local continuation; 95 + 512 canonical ratings. So about 4.0 s per sample, and the samples
  contain only 95 canonical ratings: their time is the **uncounted oracle solves** of Stage A and Stage B.
- classic9 Nightmare: about 5 s per request with a median of 1,345 canonical ratings, 2 exact of 12.
- All requests run in **one** worker (`worker-client.js` creates a single `Worker`); the engine is synchronous
  inside a cooperative step iterator.
- A request that finds no exact puzzle does all its work: mega12 Nightmare is 23.5 to 25.2 s with 0 of 7 exact.
  That time is a property of the count ceilings, not a latency distribution.
- A timed-out request returns nothing, although the keeper may hold a valid unique puzzle.

### 2.2 The cost formula (Analysis)

Per sample of the default cell strategy:

```text
solves per sample  <=  G            (Stage A, technique oracle)
                    +  G * B(N)     (Stage B, guided objective)        B(N) = clamp(round(32*81/N), 4, 32)
cost of one solve  ~=  d * sum_i F_i(N, q)
```

- G is about N/2 (rotational symmetry), so `G * B(N)` is about **1,296 solves per sample for every board** from 81
  to 648 cells: the pool shrinks exactly as the board grows. The board size therefore enters only through the cost
  of one solve.
- One solve (`logical-solver.js`, `iterate`) starts from the givens, and after **every** effective deduction
  restarts the ladder at its first technique; each `find` scans the whole grid. With d deductions (about the
  number of empty cells plus the eliminations needed) and whole-grid finders F_i, a solve is `d * sum F_i`; d
  grows with N, the cheap finders with N*q, and the chain finders faster.
- Per request: `A * S * 1,296 * d * sum F_i`, plus the capped ratings and local proposals. Measured ratio of the
  per-sample time, mega16 to classic9: about 4.0 s to about 0.05 s, 80 times, for 3.2 times the cells.

The expected time to a hit is `c / p` (c: cost of one sample, p: probability that a sample is exact), cut off at
`A * S` samples. Both factors are bad at the upper levels:

1. **p is small because the search is blind to the property it needs.** Requiredness needs a tier technique in
   the canonical proof. The Stage A oracle accepts every removal that the whole allowed set can prove; the guided
   objective maximises the score. Whether the tier is needed is left to chance (MS06 adds a `tierUsed` preference
   inside the pool; it keeps the same solve count).
2. **c is large because hardness is introduced early and paid for in every later solve.** Once an accepted
   removal makes the puzzle need a chain, each of the remaining hundreds of oracle solves of that sample runs the
   chain finders again, from scratch.
3. **Nothing is reused or shared**: one worker; every solve from the givens; a failed request discards its work.

p per sample is **not recorded** anywhere (only hits per request). It is the first number the measurement phase
must produce.

### 2.3 What the provisional round confirmed and corrected (Measured, provisional)

- **The "1,296 solves per sample" of 2.2 is withdrawn as a cost** (erratum E6). SM1 counted 74 to 331 solves
  per ordinary sample on classic9, mega12, mega16 and samurai. `G * B(N)` stays only as a loose upper bound;
  the "10 times fewer solves" built on it in S1 and section 4 goes with it.
- **Where the time is** (one profiled request per cell). Samples are 90.5 % of the mega16 request, 83.5 % of
  mega12, 72.8 % of samurai, 60.3 % of classic9 and 57 to 58 % of Killer and Greater-Than; the local search is
  the rest, up to 43 % on Greater-Than. Killer spends 45 % in the DFS.
- **Inside the solver, the chains.** `nishio` and `forcingChain` take 81 % of the mega16 request, 77 % of mega12,
  55 % of classic9 and 53 % of samurai. The cheap finders that an event-driven ladder serves best (singles and
  subsets) take 3.9 to 12.7 %. That is consistent with cause 2 of 2.2 (hardness is paid in every later solve),
  and it puts the remedy in the chain finders, not in the scans of the cheap ones.
- **p is still unknown.** The SM2 screen found no exact puzzle in any mode, the native controls included, on
  eight grids per cell. That says the cohort was too small to measure p on these cells, not that p is zero.
- **Cause 1 of 2.2 (the search is blind to requiredness) is neither confirmed nor refuted.** The frontier
  mostly found nothing to cross: after the floor descent every remaining removal broke uniqueness in 45 of 64
  samples.

## 3. Proposals

Summary. "Identical" means: the same puzzles as today for the same request. The effect column is version 2's:
Measured (provisional) where `report-r3.md` has a row, otherwise a Projection.

| Id | Proposal | Acts on | Result | Effect (version 2) | Status |
|---|---|---|---|---|---|
| S1 | Frontier dig: floor descent, then cross the requiredness frontier | p | new algorithm version | samples at 0.12 to 0.38 of today's cost, with no exact puzzle in 192 trials | undecided; a hit-rate item only; stop rule below |
| S2 | Re-derivation early exit of removal tests | c | new version (heuristic) | no CPU saving measured (x1.01 to 1.12) | only as part of S1; no speed claim |
| S3 | Event-driven ladder | c | identical only with check parity | cheap finders: x0.91 to 1.04. Chain kernels: unmeasured | cheap-finder part dropped as a speed item; chain part gated by the frozen SM1 |
| S4 | Monotone-score early exit in bounded oracles | c | new version (the log changes) | x1.0 to 1.1 on bounded oracles (Projection) | with the version (IG-S-Q04) |
| S5a | Attempts on a worker pool, ordered merge | wall time | identical | x1.8 to 3.2 measured, at x1.0 to 1.6 the CPU | **go: phase 1** |
| S5b | Samples on the pool, per-sample quotas | wall time | new version | mega16 about 29 s, samurai about 8 s (Projection, ideal scaling) | promoted; independent of S1 |
| S6 | Anytime result at the time guard | availability | behaviour change | no empty answer after 120 s | with the version; stored as IG-S-Q13 says |
| S7 | Bound the unbounded pieces | tail | new version | the Jigsaw tail is the full-grid search (99.5 %) | with the version; full grid first |
| S8 | Idle pre-generation, as an extension of `SG.cache` | perceived time | identical | next seedless puzzle of the same settings is instant | late, low priority |
| S9 | Seed bank with validity-preserving transformations | availability | product decision | one rating per puzzle for the rarest cells | the fallback for the large boards; needs the owner |
| S10 | WebAssembly kernels (DFS, chain search) | c | identical only with equal check and node order | 1.2 to 2 times on the kernel share (Projection) | after the frozen SM1; the chain share makes it eligible |

### S1. Frontier dig

**Idea.** Write F for the floor techniques of the level, T for its tier, A = F + T for the allowed set. For a
unique puzzle P let `floor(P)` mean "F alone solves P" and `full(P)` mean "A solves P". With the prefix property
that `requiredOf` already relies on, an exact puzzle is one with `not floor(P)`, `full(P)` and the score in band.
Along a chain of clue removals, `floor` switches from true to false once and `full` later (monotone inference;
used as guidance only, see "Soundness"). Exact puzzles sit **just past the floor frontier**. So: stay floor-solvable
as long as possible with cheap tests, then cross the frontier deliberately, and run the expensive tier finders
only on the few puzzles that are known to need them.

```text
frontierSample(model, solution, spec, rng):
  P = full grid as givens
  frontier = []
  # Phase A: descend on the floor. One pass over the symmetry groups in dig order.
  for g in groups (order from rng, clue floors as today):
    r = floorTest(P - g)                 # S2: stops when the cells of g are re-derived
    if r == SOLVED:      P = P - g
    elif stillUnique(P - g):             # DFS check, already allocation-free
      frontier.push({ g, at: snapshot of P })   # unique, floor stuck: needs something beyond the floor
    # else: not unique. Final: removing more clues never restores uniqueness. Never retried.
  # P is now floor-minimal for this order.

  # Phase B: cross the frontier. At most K_F full solves per sample (K_F about 8 to 16).
  for g in frontier still removable from P (order: fewest cells left open by the floor first), up to K_F:
    Q = P - g
    report = solve(Q, allowed = A, score bound = spec.max)      # S4: stops when the score reaches max
    if not report.solved: continue                              # stuck even with the tier, or too hard
    # solved, and floor(Q) is false: a tier technique was used
    if score(report) in band:  return verify(Q)                 # canonical rating + uniqueness, as today
    if score(report) < min:    Q' = deepen(Q)                   # few more removals with the existing
                                                                # bounded objective; target policy of MS06
      if Q' in band and tier used: return verify(Q')
    offer Q (and Q') to the keeper
  return best candidate (not exact)
```

**Why it is cheaper (Analysis).**

- Phase A makes at most G floor tests, and **no** tier finder ever runs in it. With S2 most tests end after a
  handful of deductions.
- The removals refused for uniqueness are final, so they are tested once. Today's Stage B re-tests the pool every
  round.
- Phase B makes at most K_F solves with the whole allowed set, each on a puzzle that is unique and floor-stuck:
  every one is a real candidate for exactness.
- Count per sample: about `G` cheap tests + `<= G` uniqueness checks + `K_F` full solves, against `G + 1,296` full
  solves today. On mega16 (G about 128): 128 + 16 against about 1,400; on classic9 (G about 40): 40 + 16.
- A sample whose floor-minimal puzzle has an empty frontier (every remaining removal breaks uniqueness) fails
  after phase A alone, in milliseconds on 81 cells. Failures become cheap, so many more grids and orders can be
  tried in the same time. This is the main lever for cells where exact puzzles are rare.

**For the top tiers**, where the floor itself contains expensive techniques (Nightmare's floor includes the
forcing chains), phase A is run as a ladder of floors: first with the cheap groups (singles, locked candidates,
subsets), then from that minimal puzzle with the next group, up to F. Each more expensive set runs only where the
cheaper one is exhausted.

**Soundness.** The frontier logic is guidance. Uniqueness of every accepted removal in phase A is rigorous (see
S2). The exact flag still comes from the canonical rating of the final puzzle and `requiredOf`, unchanged. If
monotonicity fails for some technique, the cost is a wasted candidate, never a wrong puzzle.

**Relation to today's code.** Phase A replaces `digStageSteps` + `digGuidedSteps` for non-proposal samples;
`deepen` reuses `boundedObjective` and MS06's target policy; the keeper, `refineDown`, the local search and the
variant strategies (Greater-Than signs, Killer structure) stay as fallbacks. The alternation of proposal and
score-targeted samples at the top tiers is replaced by frontier samples, with the existing kinds kept behind the
version switch for comparison.

**Open design points for the architect.** K_F; the phase B order; whether a frontier entry is evaluated
immediately at its snapshot (more clues, easier, more likely solvable) or at the end (fewer clues, harder);
symmetry groups larger than two cells; the Greater-Than sign dig and Killer cages (the same idea applies to
"remove a sign" and to the clue reveal, but they are separate strategies); how many frontier samples replace the
12 or 30 samples per attempt.

**Gate (SM2).** On classic9, mega12 and Killer at Nightmare and Hard: p per sample and time per sample of the
frontier prototype against the current samples. Go when `p / c` improves by at least 3 times in every measured cell
and by 10 times in mega16 Nightmare.

**Version 2: status and stop rule.**

- The ratio gate above is withdrawn (IG-S-Q05): it is undefined over zero hits. The gate is verified exact
  puzzles per CPU second and per wall second on paired grids, against each current sample kind and a
  proposal-only control, with uncertainty clustered by grid.
- Measured (provisional, SM2; six variants F0, F1, FC, FM, FU, FS on classic9, mega12, mega16 and samurai, eight
  grids each, two samples per trial): **no verified exact puzzle in any of 192 frontier trials, nor in the 64
  native control trials.** A frontier sample is cheap (0.38, 0.28, 0.12 and 0.23 of the native sample mix), but
  the cheap work is failure: classic9 16 of 16 samples and samurai 15 of 16 ended on an empty frontier; mega12
  12 of 16, with 7 candidates above the band; mega16 had 24 candidates above the band and 2 count-budget stops.
  No candidate was exact, shallow or below the band.
- What that does to the idea. "Exact puzzles sit just past the floor frontier" was not observed: on 81 and 144
  cells the floor-minimal puzzle usually has nothing left to cross, and on mega16 crossing overshoots the band.
  The observation is on the rating-v2 window (about 220 points); the v3 window is about 590 points and the floors
  change, so the frozen screen may differ. It is not a refutation, and it is not support.
- **S1 is a hit-rate item only.** No speed is claimed for it; the cost per exact puzzle is unknown until one is
  found.
- **Stop rule.** The frozen SM2 screen (40 grids per cell) decides. If no frontier variant has a verified exact
  puzzle, or none beats the native kinds at the gate of IG-S-Q05, S1 and S2 are dropped for that cell, the
  whole-request composition (IG-S06) is not built for it, and its route is the rating v3 window as measured,
  then S9. No design work on S1 before that screen. This is the plan author's answer to decision D2.
- The allowlist of IG-S-Q11 stands: S1 can only ever be switched on for (variant, board, level) cells that
  passed; Hard to Master, Killer, Greater-Than and Jigsaw keep today's path.

### S2. Re-derivation early exit

**Fact.** A removal test solves P - g from the givens to the end.

**Idea.** P is already known to be solvable by the test's technique set. Solve P - g and **stop as soon as every
cell of g has its value again**. From that moment the state is at least as strong as the initial state of P, which
the same techniques solve.

- Uniqueness is rigorous: the techniques are sound, so every solution of P - g has the values of g, hence is a
  solution of P, which is unique.
- "Still solvable by the set" is exact for a monotone technique set and a heuristic otherwise. It is only used in
  phase A of S1 (no score needed there). The scored oracles of `deepen` keep full solves.
- The initial candidate state of P is cached per sample; removing g changes only the cells of g and their peers.

**Complexity.** A successful test costs the deductions needed to recover g (typically local), not the d
deductions of a whole solve. A refused test still runs to its fixpoint.

**Version 2.** Measured in isolation (provisional; the same 16 samples per cell with and without the early
exit): 85 to 96 % of the accepted removals are decided by re-derivation, the decisions are identical, the audit
found no correctness problem in 120 removals, and the sample CPU is x1.07, 1.12, 1.01 and 1.06 of the dig without
it on classic9, mega12, mega16 and samurai. So the deductions saved do not show as time on this cohort: the
refused tests, the uniqueness checks and the state handling carry the cost. S2 keeps its correctness argument
and loses its speed claim; it is built only if S1 survives, and then measured again on whole requests.

### S3. Event-driven ladder

**Fact.** `iterate` calls `tech.find(model, state, ctx)` for technique 0, 1, 2, ... after every deduction; each
finder scans every unit, cell or digit.

**Idea.** Keep, per technique, a set of **dirty scopes**. A finder scans its scopes in the canonical order and
skips the clean ones. A scope is clean when the finder found nothing in it and no candidate changed in its
footprint since. After a deduction, the changed cells mark the scopes whose footprint contains them.

| Technique family | Scope | Footprint |
|---|---|---|
| naked single | cell | the cell |
| hidden single | (unit, digit) | the unit |
| locked candidates | (box-line pair, digit) | the two units |
| naked and hidden subsets | unit | the unit |
| fish, single-digit patterns | digit | every cell (for that digit) |
| wings, uniqueness patterns, chains, Nishio | the whole grid | everything (always dirty after a change) |
| cage, inequality techniques | cage or sign group | its cells and their units |

**Identical results.** If the clean scopes contain nothing, the first finding in canonical order lies in a dirty
scope, and scanning the dirty scopes in canonical order returns it. The step sequence, technique counts and score
are byte-identical. The proof obligation is the footprint of each finder; the test is trace equality on a corpus
(section 6).

**Effect (Projection).** Each deduction costs the scopes it touched instead of a full scan of every cheaper
technique. The whole-grid finders gain nothing by themselves; SM1 must show which share of a solve they are.
The same solver serves the oracles and the canonical rating, the Player's hints and the replay, so the gain
applies to all of them.

A negative cache for the chain finders (a literal whose bounded search visited no changed unit keeps its "no
chain" answer) is a possible extension; its hit rate is unknown and it is only worth designing if SM1 shows chains
above half of the solve time.

**Version 2: re-scoped.**

- *Identity.* "Byte-identical" covered the step trace only. Finders call `ctx.check()` inside their scans, and
  `OBJECTIVE_STEPS` and Killer's `ANALYSIS_NODES` count those calls, so a skipped scope must charge the checks
  its last scan made (IG-S-Q03). The prototype did that for nine finders (the naked and hidden singles and the
  six naked and hidden pair, triple and quad finders): 18 saved puzzles on four solver sets and 770 injected
  failures agree in ordinal, site and error. The mechanism works. Scopes that charge two or more virtual node
  checks are covered by engine-free tests only, and no naturally binding ceiling was captured.
- *Gain.* None in that scope: x0.91 to 1.04 per request over the pool and x0.94 to 1.03 serially; on the
  81-cell boards it is a small loss. The covered finders are 3.9 to 12.7 % of a Nightmare request, so even at
  zero cost they would give x1.04 to 1.15.
- *Consequence.* The dirty scopes of the cheap finders are **dropped as a speed item** and leave phase 1. They
  are not worth a parity proof per finder family for a few per cent.
- *What remains of S3 is the chain part.* The condition above is met on the old catalogue: `nishio` and
  `forcingChain` are 53 to 81 % of the request on classic9, mega12, mega16 and samurai. In the profile, the calls
  of the remaining finders that found nothing are 40 to 58 % of those requests; removing them entirely would
  give x1.7 to 2.4, and x1.09 to 1.30 without the chain group. Those are conditional zero-cost figures of one
  run, not what a cache achieves: a cache pays for lookups and invalidation, and neither is measured.
- *Gate for the chain part.* The frozen SM1 must split the v3 chain families (`forcingChain`,
  `forcingChainLong`, `nishio`, `nishioDeep`) and record, per call, what was scanned and what invalidated it.
  The chain propagation checks bypass `ctx.check`, so their budget accounting must be settled first. Only then
  is a negative cache or an incremental chain search designed, as its own item, with S10 as the alternative for
  the same kernel. The v3 chain kernels are already windowed (`SHORT_MAX` = 4), which may have changed the share.
- The report's x1.3 to 1.65 for a full S3 is neither confirmed nor refuted; no plan number rests on it any more.

### S4. Monotone-score early exit

**Fact.** The score is `empty + peak + 0.25 * peak * log2(1 + work / peak)` over the technique counts
(`difficulty.js`, `breakdown`); it never decreases when a step is added. `techniqueOracle` and `boundedObjective`
solve to the end and then compare with `spec.max`.

**Idea.** Give the solver an optional score bound and stop with "too hard" when the running score reaches it.
The answer of the oracle is identical; the remaining deductions are saved. Small and safe; do it with S3.

**Version 2.** S4 keeps every puzzle but turns some `techniques` refusals into `tooHard` in the dig log, the
Generation Steps and wires G09 to G13, so it ships under the generator version, not with the equal-result phase
(IG-S-Q04). It was not built or measured; the report's x1.0 to 1.1 on bounded removal oracles stands as a
Projection.

### S5. Worker pool

**S5a: attempts in parallel, identical results.** The outer attempts use independent RNG forks (`grid#a`,
`extra#a`, `dig#a.t`, `search#a`) and separate caps; they are coupled only through `best` and the keeper, and both
are "first strictly better wins". Run attempts 1..A on P workers, consume the results in attempt order, return the
first exact one, else merge `best` and the keeper in order. Later attempts are speculative and are cancelled
when an earlier one is exact. The puzzles are those of the serial algorithm; the architect must confirm the tie
rules of `qualityOf` and `createKeeper` when merging. Gain: up to min(P, A) on requests that fail or hit late: 4
on mega12, 2 on mega16 and samurai, up to 8 on 81-cell boards.

**S5b: samples in parallel, new version.** Samples of one attempt share `CAP_RATINGS` and `CAP_PROPOSALS` and
stop when the caps are exhausted, so they are not independent. Replace the shared caps by per-sample quotas
(deterministic, in counts), then run samples speculatively and consume them in (attempt, sample) order. With S1,
samples are short and uniform, which suits this. Gain: up to P on every board.

**Rules.**

- Pool size `min(4, hardwareConcurrency - 1)`, at least 1; with `file://` or no `Worker`, the existing
  main-thread mode with one lane. The result never depends on the size.
- A task is (request, attempt[, sample]); the model is built once and sent as data, or rebuilt in each worker from
  the same `model` fork (Jigsaw's partition must be identical: rebuild from the fork or transfer it).
- The 120 s guard becomes a wall-clock guard of the request; cancellation terminates busy workers, as the
  Pentomino pool does (`core/browser/worker-pool.js` there is a working reference for ordered consumption and
  deadlines).
- Events and the Generation Steps trace: only the consumed tasks' events are forwarded, in canonical order;
  speculative work is not shown.

**Version 2.**

- *S5a, measured (provisional):* x1.92 on mega16, x3.22 on mega12, x1.79 on samurai, x3.22 on classic9, x2.55
  on Killer and x2.62 on Greater-Than (ready wall, median of three pairs), with identical puzzles on 18 of 18
  pairs and the two-attempt ceiling respected. This is the plan's one confirmed gain, and it does not depend
  on the rating. S5a goes into phase 1.
- *Its costs.* CPU is x0.98 to 1.58 of the serial run (speculative attempts and startup). A request whose first
  attempt is exact gets slower: x0.91 on classic9 and x0.89 on Greater-Than, one pair each. Design points for
  the architect: keep the pool warm between requests, and for cells that usually hit in the first attempt (Hard
  to Master, Jigsaw, Greater-Than) start the later attempts only after a short head start of attempt 1. Both
  keep the result identical; the serial figure stays the regression control (IG-S-Q02).
- *Not measured:* the widths 1, 2 and 4 on classic9 and mega12 (SM5), which the pool design needs; it joins the
  frozen round (decision D9).
- *S5b is promoted.* It was tied to S1 ("with S1, samples are short and uniform"); it does not need S1. On the
  two-attempt boards S5a can use two workers, while the samples are 90.5 % (mega16) and 72.8 % (samurai) of the
  request. Projection, with samples at width 4, the local search at width 2 and ideal scaling:
  mega16 107.5 x (0.905 / 4 + 0.095 / 2) = about 29 s against 55.9 s with S5a; samurai 24.9 x (0.728 / 4 +
  0.272 / 2) = about 8 s against 13.6 s. It needs the per-sample quotas (a new version) and the deferred
  composition measurement, run with today's sample kinds rather than frontier samples.
- *The guard* is the wall time of the request from its start (owner, IG-S-Q02); qualification is read on a pool
  of width 4, with the serial figure beside it.

### S6. Anytime result

At the time guard, return the best complete, unique candidate held by `best` or the keeper with the existing
`difficulty.approximate` (and `difficulty.shallow`) warnings, plus a new "time limit" warning, instead of an
error. This makes the result depend on the machine's speed for those requests; the warning marks them and the
recipe records it. Owner decision OD-S2.

### S7. Bound the unbounded pieces

**Fact.** No local deterministic ceiling exists for: the full-grid search after its 50th internal restart; the
sample safety check `secureUniqueness`; the per-sign DFS and restricted solves of the Greater-Than sign dig; and
`buildJigsaw` does not receive the budget. The Jigsaw Expert request of seed 1111 took 325 s; its stage is
unknown.

**Idea.** A node ceiling for each, with a deterministic reaction: the full grid restarts on the next fork
`grid#a.k`; a safety check over its ceiling rejects the sample; a sign whose check exceeds its ceiling stays.
SM3 first attributes the 325 s request to a stage, so that the right piece is bounded.

**Version 2.** SM3 ran once, instrumented, and was censored by the 240 s guard: 99.5 % of the time was in the
full-grid search, in its unlimited last search after the 50th restart (at least 238 s), while three finished
full-grid stages took 0.32 s together. `buildJigsaw`, the safety count, the rating and the local search were not
the cause. So the first ceiling is the one on the **total** work of the full-grid search, restarts included,
with an explicit "unknown" outcome, under the version (IG-S-Q07). One censored request sizes no ceiling: the
design needs the distribution of nodes per successful full-grid attempt on the frozen catalogue. The other
ceilings of this section follow in the same version at lower priority.

### S8. Idle pre-generation and a local stock

After a request ends, the pool keeps working at idle priority on the **next seeds of the same settings** and
stores the finished puzzles (IndexedDB, a few per settings key, evicted by age). A later request whose (variant,
level, options, seed) is in the stock is answered at once. A stocked puzzle is exactly what the generator returns
for that seed, so nothing changes semantically. It gives way to every real request. It helps the user who plays
several puzzles of one level, not the first request.

### S9. Seed bank with transformations

For cells where exact puzzles stay rare even after S1 (candidates: mega16 and multigrid Nightmare, Hell 1 and
Hell 2 once they are not vacuous), ship a small bank of exact puzzles found offline, and derive the requested
puzzle from a bank entry chosen by the seed, through a validity-preserving transformation chosen by the seed.
The derived puzzle is rated canonically once and accepted only if exact (the rating can move through scan-order
ties); otherwise the next transformation is tried.

| Variant | Transformations that keep the rules |
|---|---|
| classic 4/6/9, mega, wordoku | digit relabelling; row permutations inside a band and band permutations; the same for columns; transposition where boxes allow |
| diagonalX, hyper | digit relabelling; the grid symmetries that keep the diagonals or windows |
| killer | geometric transformations and band/row permutations, the cages moving with their cells; **no** digit relabelling (sums) |
| greaterThan | the same, the signs moving with their cells; digit reversal d -> q + 1 - d with every sign flipped |
| jigsaw | digit relabelling; automorphisms of the stored layout (the layout is part of the entry) |
| multigrid | digit relabelling; symmetries of the overlap layout |

Cost per request: one transformation and one or a few ratings. This is a product decision (puzzles derived from
shipped seeds rather than generated from nothing), OD-S3. A variant without shipped content is the same bank
filled locally by S8.

**Version 2.** The table above is wrong for Killer and Greater-Than: row and band permutations break connected
cages and adjacent signs, and digit relabelling changes cage sums. For those two only the board's geometric
symmetries are used, and every puzzle served from the bank is rated canonically and structure-checked first
(IG-S-Q15). After the provisional round the bank matters more, not less: no search item has yet produced an
exact Nightmare puzzle on mega12, mega16 or samurai. It is still designed only for cells that stay below 90 %
on the frozen rating v3 catalogue, since the wider v3 window may make it unnecessary.

### S10. WebAssembly kernels

Only if SM1 shows one kernel (DFS uniqueness, the chain search) above half of the remaining time after S1 to S5.
The module would be shipped prebuilt and embedded as base64 in a classic script (no build step, `file://`), with
the JavaScript implementation kept as the reference and fallback, and trace equality as the test. Constant
factor only.

### Considered and not proposed

- **Truth maintenance across removal tests** (keep the parent's proof and retract what depends on the removed
  clue): in hard puzzles nearly every deduction depends on nearly every clue, so little survives; S2 gets the
  practical part of this cheaply.
- **Lower caps or fewer samples** (MS18b's possible sample-level bound): shortens failures but lowers hits; it
  does not make exact puzzles cheaper to find. Still useful as a guard once S1 defines a uniform sample.
- **Changing weights or bands to widen the target**: a rating change, out of scope here (the Killer weights are
  MS07e's question).

## 4. Cost after the change (version 2)

Version 1's count model (about 1,300 full-set solves per sample falling to K_F) and its projection for mega16
(a 97 s sample batch falling to about 1.6 s) are withdrawn: the first was not what SM1 counted (74 to 331 solves
per ordinary sample), and the second left out refused floor tests, uniqueness checks and the cheap proposal
samples that S1 replaces. What replaces them is a model of two parts with measured shares.

```text
request  =  samples (57 to 90 % of a Nightmare request)  +  local search (the rest, one per attempt)
S5a      :  both parts divide by min(4, attempts)                       measured: x1.8 to 3.2
S5b      :  the samples divide by the pool width; the local search by min(4, attempts)   not measured
chain kernel work (S3's chain part, S10): acts on 53 to 81 % of the request on the large boards   not measured
```

| Cell (attempts) | Today, re-measured | With S5a (Measured, provisional) | With S5b as well (Projection, ideal scaling at width 4) | Qualification p95 budget |
|---|---|---|---|---|
| mega16 Nightmare (2) | 107.5 s | 55.9 s | about 29 s | 30 s |
| samurai Nightmare (2) | 24.9 s | 13.6 s | about 8 s | 30 s |
| mega12 Nightmare (4) | 23.4 s | 7.1 s | about the same: four attempts already fill the pool | 30 s |
| classic9 Nightmare (8) | 4.98 s | 1.55 s | the same | 10 s |
| Killer Nightmare (8) | 21.1 s | 8.0 s | the same | 10 s |
| Greater-Than Nightmare (8) | 11.6 s | 4.4 s | the same | 10 s |

Reading, all on the old catalogue and with medians of three seeds, so none of it is a qualification result:

- **Time.** With S5a alone the medians of mega12, samurai and the 81-cell boards are inside their budgets;
  mega16 is not, and S5b alone would bring its median only to the edge of 30 s. mega16 needs the chain kernel
  work as well, or it stays outside. A p95 does not exist for any cell.
- **Exact hits.** Unchanged by every item measured: 0 of 3 on mega12, mega16, samurai and Killer before and
  after. Speed makes a failed request shorter; it does not make the cell offerable. On the frozen catalogue the
  hit rate comes first from rating v3 itself (section 0.2), then from more attempts on 81 cells (OD-S4), then
  from S1 where the frozen screen supports it, and otherwise from the bank (S9).
- **CPU.** The pool spends up to 1.6 times the serial CPU. On phones with two to four slow cores the wall-clock
  gain will be smaller; only browser runs say how much.

## 5. Measurements: done, and what the frozen round must add

**Done in the provisional round** (IG-S01 to IG-S10 without IG-S06; 6,610 s of machine time of 10,800 s; the
records under `evidence/phase0/provisional-r1/`, the reconciliation in `report-r3.md`):

| Id | What ran | Result |
|---|---|---|
| SM5, in part (IG-S02) | serial against the pool at width min(4, attempts), six Nightmare cells, three seeds | S5a's factors; identical puzzles |
| SM4, in part (IG-S03) | check-sequence parity and timing of a partial S3 (nine finders) | parity holds; no gain |
| SM2 screen (IG-S04, IG-S05) | six frontier variants and two native controls, four cells, eight grids, two samples | no exact puzzle in any mode; sample costs; S2 isolated |
| SM1 (IG-S07) | stage and finder profiles of nine requests, one per cell | the shares of section 2.3 |
| SM3 (IG-S08) | Jigsaw Expert seed 1111 under a 240 s guard | censored; the full-grid search |
| Greater-Than (IG-S09) | the miss split on Normal 300 to 319 and Nightmare 700 to 705; the solve-first order | 22.1 % of Normal misses end at the clue floor (as MS05e); solve-first x1.03 on Normal, x0.17 on Nightmare |

Never measured: the full S3, S4, S5b, the whole-request composition with S1 (IG-S06), the pool at widths 1, 2
and 4 on classic9 and mega12, the restricted-floor probes, and the cells wordoku, sohei, flower and butterfly.

**The frozen round** needs the freeze of difficulty-v3 (MS17b, MS18e), a freeze receipt and its own budget
(approvals A1 to A8 of `report-r3.md`), and first the repair of the harness on the frozen source: three of
eight adapters fail on rating v3 today, and that work is uncosted (D10). The plan author's positions on the
open decisions D1 to D10, for the pack author and the owner to confirm:

| Decision | Position |
|---|---|
| D1, order | (1) the baseline of every candidate cell on the frozen catalogue, with exact hits, before anything else: it re-derives the list of failing cells; (2) S5a again (IG-S02); (3) SM1 with the v3 chain families split and per-call scan data; (4) the SM2 screen at 40 grids, only on cells that still fail; (5) the rest |
| D2, composition (IG-S06) | not built for a cell whose frozen screen shows no exact frontier puzzle (the stop rule of S1). A composition of S5b with today's sample kinds is wanted instead, on mega16 and samurai |
| D3, projection assumptions and the non-inferiority margin | deferred until the frozen baseline shows which cells have a positive rate; no assumption set is approved on the old catalogue |
| D4, wordoku, sohei, flower, butterfly | their frozen baseline only (step 1 of D1); no SM2 population for them unless S1 passes on classic9 or samurai |
| D5, Greater-Than Nightmare 706 to 709 | drop the solve-first arm at Nightmare: x0.17 on six pairs is enough to end it. The pack author decides |
| D6, per-finder frontier profile | not wanted before S1 passes its screen; the chain-family split of SM1 is wanted now |
| D7, S7 | the total-work ceiling of the full-grid search, designed in phase 2 from a node distribution measured on the frozen catalogue |
| D8, carried points | the multi-check virtual charges need an engine test before any S3 scope ships; they matter only if the chain part goes ahead |
| D9, the two gaps | the width sweep (SM5) joins the frozen round, since phase 1's pool design rests on it; the restricted-floor probes only if S1 passes its screen |
| D10, source preparation | approve as a separate, costed task before the frozen budget is set |

## 6. Phases, tests and gates (version 2)

| Phase | Content | Version | Gate to continue |
|---|---|---|---|
| 0. Frozen round | section 5; no runtime change | none | the failing cells named on the frozen catalogue; S5a confirmed; the S1 screen decided per cell; the chain share known |
| 1. Equal results | the `generatorVersion` field, history v2 and wire v2 (IG-S-Q01); S5a | identical puzzles | regression hashes unchanged; pool-size invariance (1, 2, 4 workers and the main-thread mode give the same puzzle); serial time not slower; pooled and serial times reported (IG-S-Q02) |
| 1b. Attempts | a sweep of 16, 32 and 64 attempts on classic9 and wordoku Nightmare, only if they still fail on the frozen catalogue (IG-S-Q12) | none | the owner decides OD-S4 |
| 2. Generator version 2 | S5b with per-sample quotas; S7 (the full-grid ceiling first); S6; S4; S1 with S2 only on allowlisted cells that passed the frozen screen | new version | qualification of every changed cell on the pool; the time-guard tests |
| 3. Solver kernel | the chain part of S3, or S10 for the same kernel, if the frozen SM1 keeps the chain share above half | identical, with check parity | step and check-sequence equality on guard-binding cases; at least 1.5 times on a whole request |
| 4. Fallbacks and comfort | S9 for cells still below 90 %; S8 | content, storage | qualification of the cells S9 serves |

Phase 1 does not depend on phase 0 and may be designed now: the version field, history v2 and S5a are
independent of the rating and of every open measurement.

Tests that every phase must keep or add:

- **Check-sequence equality** (S3's chain part, S10): for a corpus of puzzles per variant the steps, the
  sequence of budget checks and the failure boundary under injected ceilings equal the reference; the reference
  scan stays reachable under `SG.DEBUG`.
- **Soundness**: every accepted puzzle has one solution (DFS) and the canonical rating claimed; the existing
  generic soundness and order-invariant suites run unchanged.
- **Pool invariance** (S5): the puzzle of a request is the same for every pool size and for the main-thread
  mode.
- **Version** (IG-S-Q01): a history v2 entry shows its stored puzzle and never regenerates; a v1 entry
  regenerates on the current path with a notice; a timed result is never cached or exported as its seed's
  canonical result.
- Regression hashes, help examples and qualification lists are regenerated once, in phase 2, by their own task.

## 7. Decisions for the owner

| Id | Decision | State and the plan author's proposal |
|---|---|---|
| IG-S-Q01 | `generatorVersion` and history v2 in phase 1; v1 entries regenerate with a notice | **confirmed** (2026-11-14). OD-S1's "old recipes keep their stored puzzle" is replaced by it |
| IG-S-Q02 | With a pool, the 120 s guard is the wall time of the request | **confirmed** (2026-11-14) |
| OD-S1 | A new generator-algorithm version after rating v3 is frozen; old seeds give other puzzles | yes, for phase 2 |
| OD-S2 | At the time guard, return the best valid puzzle with a warning (S6) | yes; stored with `timed: true`, never as the seed's canonical result (IG-S-Q13) |
| OD-S3 | A shipped seed bank for the rarest cells (S9) | only for cells below 90 % on the frozen catalogue after phase 2; at least 200 distinct roots per option set as the first proposal |
| OD-S4 | More attempts by default when attempts are cheap and parallel | decide with the sweep of phase 1b, if it is still needed |
| OD-S5 (new) | S5a's CPU cost: up to 1.6 times the serial CPU for 1.8 to 3.2 times less waiting | proposal: accept; the pool width stays at most 4 and one lane on `file://` |
| Frozen round | its budget, and the harness repair on the frozen source (D10) | proposal: approve the repair as its own task first; the round's budget after it |

## 8. Risks

- **The measurements are stale and small.** They describe the old runtime and catalogue, three seeds or eight
  grids per cell, one request per profile. Every factor here is to be re-measured on the frozen source; only
  S5a's mechanism (attempts are independent) makes its factor likely to transfer.
- **No search item has produced an exact puzzle on the large boards.** If the v3 window does not raise the hit
  rate there and the frozen S1 screen is empty again, the bank (S9) is the only route, and it is a product
  decision.
- **S1's premise may be wrong**, not just unmeasured: the frontier was empty in most samples on 81 and 144
  cells. The stop rule bounds what is spent on it.
- **The chain part of S3 may not pay.** A negative cache has lookup and invalidation costs, the chain checks
  bypass the budget counter today, and v3 already windows the chain kernels. Its gate is a whole-request factor
  of at least 1.5, not a kernel figure.
- **The pool's cost on weak devices**: more CPU for the same puzzle, and a slower answer when the first attempt
  hits. The head start for early-hit cells and the serial regression control address it; browser runs decide.
- **Variants with their own strategies** (Killer structure search, Greater-Than sign dig) gain from S5 only.
  Killer's S5a factor was below the estimate on all three pairs, and its misses may be a calibration matter
  that no search fixes (MS07e).
- **The harness no longer fits the source.** Three adapters fail on rating v3 and MS08 to MS16 add about 14
  finders before the freeze; the frozen round's cost is open until the repair is scoped.
- **Browser against Node**: every number here is Node. The browser gates decide what is offered there.

## 9. Addendum (2026-11-15): against the `rating-v3` source, and further candidates for analysis

Written by the plan author after reading the `rating-v3` branch at `7fe14fb` (MS07e). Nothing was run for this
section. 9.1 to 9.3 are a reading of committed records and of the source; 9.4 is a list of **hypotheses for the
analysts (Opus, Astra) to examine**, not decisions. Code references are to `rating-v3` at `7fe14fb`: this branch
still carries the older runtime (`f7be90f`), where `core/js/engine/tech-chain.js` differs.

**This addendum supersedes sections 0.1, 1 and 4 where they name the failing cells and their times.** A version
3 of the plan should be written after the analysts' review; until then sections 3 and 6 stand as mechanisms and
order, not as targets.

### 9.1 What `rating-v3` changes: the baseline of this plan no longer exists

Eleven runtime files differ from the measured source (+808 / -208 lines), chiefly `core/js/engine/tech-chain.js`
(windowed chain kernels, `forcingChainLong`, `nishioDeep`, short-chain cutoff C = 4) and
`generator/js/engine/digger.js` (the target policy of MS06). `generator/js/worker/` is unchanged: requests still
run in one worker, and the size-default attempts are still 8 / 4 / 2.

The first qualification checkpoint (`docs/difficulty-v3/qualification-checkpoint-2026-11-15.md`; 129 of 135
cells, 40 requests each, `--jobs=4`, so four requests run side by side) against the source this plan measured:

| Cell | Measured source (sections 0.1 and 2.1) | `rating-v3` |
|---|---|---|
| classic9 Nightmare | 4.98 s; 21 of 100 exact | p50 0.14 s, p95 0.26 s; 40 of 40, offered |
| wordoku Nightmare | 4.96 s; 4 of 20 | p95 0.44 s; 40 of 40, offered |
| mega12 Nightmare | 23.4 s; 0 of 7 | p50 0.19 s, p95 1.05 s; 40 of 40, offered |
| samurai, sohei, flower, butterfly Nightmare | 23 to 33 s; 0 of 2 each | p95 7.6, 7.6, 5.9 and 2.0 s; 40 of 40 each, offered |
| mega16 Nightmare | 107.5 s; 0 of 7 | not run (cost rule); pilot 4 of 4 exact, 4.8 to 26.5 s, mean 11.8 s (budget 30 s) |
| Greater-Than Nightmare | 11.6 s | p50 1.33 s, p95 5.18 s; 40 of 40, offered |
| Killer Nightmare | 21.1 s; 1 of 8 | p50 4.1 s, p95 24.9 s; 19 of 24; hidden on time (budget 10 s) |

The cause is the rating, not the search: with C = 4 a proof of five or more links is in the Nightmare tier, so
a dug puzzle is usually exact at the first attempt, with about a fifteenth of the work
(`docs/difficulty-v3/chain-window-2026-11-15.md`: 13 to 14 attempts for 12 requests, 2,182 full ratings against
32,300 at C = 6). Section 0.2 expected this; it is now measured.

**What still fails on `rating-v3`:**

| Group | Cells | Kind of failure |
|---|---|---|
| Hell 1 | 0 exact in 112 requests on the nine cells run (classic9, wordoku, diagonalX, hyper, jigsaw9, killer, samurai, sohei, flower); p50 5.6 to 28.9 s, p95 8.1 to 50 s; every result in band and shallow (no `nishioDeep` proof). mega16 Hell 1 exceeded the 120 s guard in its pilot; mega12, Greater-Than and butterfly pilots 36 to 40 s, 0 exact | hit rate, and time |
| Killer | Hard 0 of 14, Expert 1 of 14 (p95 17.8 s), Master 5 of 13 (22.8 s), Nightmare 19 of 24 (24.9 s), Hell 1 0 of 9 (50 s) | hit rate (weights, owner question Q-MS07e-1), and time |
| Time only | Greater-Than Master 40 of 40 but p95 14.5 s over 10 s; Greater-Than Normal p95 9.63 s of 10 s; mega16 Expert p95 9.7 s; mega16 Nightmare by its pilot | time |
| Easy | diagonalX 28 of 40, hyper 29 of 40, samurai 10 of 22, sohei 4 of 18, butterfly 1 of 15, flower 0 of 14 (shallow) | hit rate at sub-second times; not a speed matter |
| Mid levels | flower Expert 23 of 35 and Master 29 of 40, wordoku Normal 35 of 46 | hit rate |

The 325 s Jigsaw Expert request was not reproduced in 40 seeds (max 2.63 s); `full-grid.js` is unchanged, so the
unbounded search S7 names is still there.

### 9.2 What the plan's items are worth on `rating-v3` (Projection, nothing measured on this source)

- **S5a.** The pool helps a request in proportion to the attempts it uses. The Nightmare cells that now pass
  mostly hit at the first attempt, so their median is about unchanged (the old pairs showed x0.89 to 0.91 on
  first-attempt hits) and only their tail gains. Requests that run all their attempts still gain x1.8 to 3.2:
  that is now the failing requests (Hell 1, Killer) and the tails.
- **Cells S5a might move across a budget:** Greater-Than Master (p95 14.5 s; about 5 to 6 s if its tail is
  made of later attempts, unchanged if it is one long attempt or its local search); Greater-Than Normal and
  mega16 Expert gain margin. Killer Master and Nightmare would come near 9 to 10 s at p95 but stay below 90 %
  hits. No hit rate changes.
- **mega16 Nightmare.** Two attempts: S5a gives at most x1.9 on requests that use both (26.5 s to about 14 s).
  S5b on the samples could bring the mean of 11.8 s to about 4 to 6 s, if samples are still about 90 % of the
  request, which is not known on this source.
- **Hell 1.** Speed turns a 6 to 50 s failure into a 2 to 25 s failure. It offers nothing until exact puzzles
  exist; difficulty-v3 expects its later finder groups to add the missing proofs.
- **S1 and S2.** Their target cells (Nightmare on classic9, mega12, mega16, the multigrids) now pass without
  them. As designed they have no remaining target except, possibly, Hell 1 (9.4, K4).
- **S3's chain part and S10.** The chain kernels were rewritten; the 53 to 81 % share of section 2.3 is stale.
  The long Hell 1 requests are the place to profile first.
- **S9.** Its candidate cells change from "Nightmare on the large boards" to "Hell 1 everywhere", if the owner
  wants Hell 1 before the finders arrive.

### 9.3 Consequences for the plan (for version 3, after the analysts' review)

1. Section 1's list of failing cells is replaced by the table of 9.1.
2. Phase 1 (the version field, history v2, S5a) stays worth doing, but S5a is now a tail and failure-time item,
   not the plan's main gain; the head start for early-hit cells (section 3, S5) becomes necessary, not optional.
3. The frozen SM2 screen on Nightmare loses its purpose where the cell passes; the stop rule of S1 applies at
   once to those cells.
4. The frozen SM1 profile should be taken on Hell 1 requests and Killer, not on the old Nightmare cells.
5. The harness adapters that fail on this source (three of eight) need repair before any of it (decision D10).

### 9.4 Further candidates (hypotheses, unmeasured)

The rating is not frozen yet, but difficulty-v3 owns it: an item that changes a finding, the order of findings
or what a work unit counts is a rating change and belongs to that feature. "Same result" below means the same
findings and the same work and check sequence.

| Id | Candidate | Same result? | Guess of the gain | First check |
|---|---|---|---|---|
| K1 | A negative cache for `nishioDeep` trials across solver steps | only with the work and check sequence reproduced; otherwise a rating change | x2 to 5 on Hell 1 requests, if `nishioDeep` is their hot spot | a profile of three Hell 1 requests by finder |
| K2 | Trail and undo instead of a state copy in `refutes` | yes: same trials, same units | x1.2 to 2 on the nishio kernels, more on 256-cell boards | time of `cloneState` in that profile |
| K3 | Bit-parallel breadth-first search for the forcing chains | no: the work count decides the 50,000-unit cap | x5 to 20 on that kernel | only as a proposal to difficulty-v3 |
| K4 | A cheap "stuck without `nishioDeep`" screen before a candidate is rated, for Hell 1 | new generator version | unknown; it is a hit-rate item | whether the digger already does it; the share of Hell 1 candidates that pass |
| K5 | Killer's uniqueness search: cage-sum combination masks and fewest-candidate ordering | only if the node order is kept (`UNIQUE_NODES`, `REPAIR_NODES`) | x1.3 to 2 on Killer's search share | a Killer profile on this source |

**K1. Negative cache for `nishioDeep`.** `scanNishio` (`tech-chain.js:685`) tries every open cell and digit by
iterative deepening; at depth 2 `refutes` (`:643`) makes, inside each trial, nested trials on every cell of two
or three candidates and repeats until nothing changes. Each trial is a state copy and a propagation, one work
unit, up to `NEW_FINDER_WORK_LIMIT` = 50,000 per call. The solver restarts its ladder after every applied step,
so the finder runs again from nothing on a state that differs by one elimination. A trial that was not refuted,
and whose propagation touched no cell changed since, is still not refuted. Obligations: the footprint of a
trial (the cells its propagation read, nested trials included); the work units and `ctx.check()` calls a
skipped trial would have made, charged virtually as section 3's S3 note describes, so that the 50,000-unit cap
and the caller's budget bind at the same place; the same first refutation in the same order. If the footprint
of a depth-2 trial is most of the grid, the cache never hits: that is the first thing to measure.

**K2. Trail and undo.** `refutes` copies the whole state for each trial (`SG.model.cloneState(base, trial)`).
Recording the changed candidates and values and undoing them costs in proportion to what the trial touched. The
trials, their order and the units are unchanged, so this is an implementation change. It needs
`SG.constraints.place`, `eliminate` and `propagate` to write through a trail, which reaches shared code of both
apps.

**K3. Bit-parallel chains.** `scanForcing` (`:554`) runs one breadth-first search (`search`, `:480`) from every
literal and truth value, up to 12 links for `forcingChainLong`. Packing 32 starts into a word shares the
frontier work. But `run.work` counts the edges of the serial search and decides when `WORK_CAP` is thrown, and
the shortest proof with its tie order is what the rating records. A bit-parallel search does not reproduce that
count, so capped cases would change. It is recorded here as an idea for difficulty-v3, not for this feature.

**K4. A screen for Hell 1.** Every Hell 1 result is in band and shallow: the candidate did not need
`nishioDeep`. Before paying for a canonical rating, a candidate could be solved once with `nishioDeep` switched
off; only a candidate that gets stuck can be exact. The question for the analysts is whether the oracles of the
digger already amount to this, and what share of candidates pass. If almost none pass, the search is not
steering toward the tier at all, and Hell 1 is a matter for the bank (S9) or for difficulty-v3's finders, not
for speed.

**K5. Killer.** On the old source 45 % of a Killer Nightmare request was the depth-first search (section 2.3).
Precomputed masks of the digit combinations that reach a cage sum, and a fewest-candidates cell choice, are the
standard tools. The guards count nodes, so the node order must be kept or the change ships under the version.
Killer's hit rates are a weight question (Q-MS07e-1) that this does not touch.

### 9.5 Questions for the analysts

1. An independent reading of 9.1: which cells are this feature's targets on `rating-v3`, and which belong to
   difficulty-v3 (weights, finders) rather than to the generator's speed.
2. For S5a on `rating-v3`: from the MS07e shard records, which over-budget requests are multi-attempt (the
   records carry no `stats`; say what must be recorded to know).
3. For K1 and K2: where a Hell 1 request spends its time by finder and by stage; the footprint of a depth-2
   trial; whether a proof of equal work and check sequence is feasible.
4. For K4: what the digger already filters, read from `digger.js` on `rating-v3`.
5. Whether S1, S2 and the Nightmare SM2 screen should be dropped from the frozen round now, and what replaces
   them in its budget.
6. An estimate, with its envelope, of what Hell 1 and the Killer levels can reach in time, kept apart from
   what they can reach in hits.
