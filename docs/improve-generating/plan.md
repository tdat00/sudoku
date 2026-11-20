# Improve generating (Sudoku): a faster generator for the upper levels

Plan author: claude-fable-5-2, 2026-11-14. Written with the answer to **PR-S2**
([clarifications.md](../difficulty-v3/clarifications.md)). Status: **proposal, nothing implemented**.
It is the input of a later feature ("improve-generating"); architects turn it into a design and a task pack.

Inputs read: [generator-state-2026-11-14.md](../difficulty-v3/generator-state-2026-11-14.md) (pipeline, cost
model, every recorded timing) and the code of the snapshot `1d19101` (`generator/js/engine/digger.js`,
`difficulty.js`, `pipeline.js`, `core/js/engine/logical-solver.js`, `dfs-solver.js`,
`generator/js/worker/worker-client.js`, `gen.worker.js`).

Labels, as in the state report: **Fact** (measured or read from the code), **Analysis** (derived, derivation
given), **Projection** (expected, not measured). **No generation, test or timing was run for this plan.** Every
speed-up below is a projection until the measurement phase (section 5) confirms it; each proposal has a gate.

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

## 3. Proposals

Summary. "Identical" means: the same puzzles as today for the same request.

| Id | Proposal | Acts on | Result | Projected effect | Confidence |
|---|---|---|---|---|---|
| S1 | Frontier dig: floor descent, then cross the requiredness frontier | p and c | new algorithm version | 10x fewer solves per sample; failures become cheap | medium, gated by SM2 |
| S2 | Re-derivation early exit of removal tests | c | new version (heuristic) | a removal test costs a few deductions, not a solve | medium-high |
| S3 | Event-driven ladder (dirty scopes, negative cache) | c | identical | 3-10x on the non-chain part of a solve, more on large boards | high for correctness, gain gated by SM1 |
| S4 | Monotone-score early exit in bounded oracles | c | identical | saves the tail of every "too hard" solve | high, small |
| S5 | Worker pool, deterministic ordered consumption | wall time | S5a identical, S5b new version | up to P times (P = workers) on failed and late-hit requests | high |
| S6 | Anytime result at the time guard | availability | behaviour change | no empty answer after 120 s | high |
| S7 | Bound the unbounded pieces | tail | new version | removes tails like the 325 s Jigsaw request | high, cause gated by SM3 |
| S8 | Idle pre-generation and a local stock | perceived time | identical | next puzzle of the same settings is instant | high |
| S9 | Seed bank with validity-preserving transformations | availability | product decision | one rating per puzzle for the rarest cells | high, needs the owner |
| S10 | WebAssembly kernels (DFS, chain search) | c | identical | 1.5-3x on those kernels | low priority, gated by SM1 |

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

### S4. Monotone-score early exit

**Fact.** The score is `empty + peak + 0.25 * peak * log2(1 + work / peak)` over the technique counts
(`difficulty.js`, `breakdown`); it never decreases when a step is added. `techniqueOracle` and `boundedObjective`
solve to the end and then compare with `spec.max`.

**Idea.** Give the solver an optional score bound and stop with "too hard" when the running score reaches it.
The answer of the oracle is identical; the remaining deductions are saved. Small and safe; do it with S3.

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

## 4. Complexity after the change (Analysis, counts)

```text
today     per request  <=  A * S * (G + 1,296) full-set solves, each d * sum F_i (whole-grid scans)
                           + A * 1,024 canonical ratings                                  on 1 worker
proposed  per request  <=  A * S' * ( G floor tests of d_g * local scopes
                                      + G uniqueness checks
                                      + K_F full-set solves of d * (local scopes + whole-grid finders) )
                           + canonical ratings of the candidates only                     on P workers
```

d_g is the number of deductions that recover one removed group (far below d for an accepted removal). The number
of full-set solves per sample falls from about 1,300 to K_F (8 to 16). Wall time divides by up to P.

**Projection for the worst measured cell, mega16 Nightmare** (4.0 s per sample today): about 10 times fewer
full-set solves (S1), a further factor on each solve (S2, S3, S4), and 4 workers. If the three factors are 10, 2
and 3 (two attempts cannot use more than their samples allow under S5b), a sample batch that takes 97 s today
takes about 1.6 s, and the remaining budget buys roughly 15 times more samples within 30 s. Whether that reaches
90 % exact hits depends on p, which only SM2 can give. If it does not, S9 is the guarantee.

## 5. Measurement phase (before any design is fixed)

All runs are Node, under the machine lock, with the request budgets of the existing deep tools. Evidence goes to
`docs/improve-generating/evidence/<id>/` as JSON with the source hash.

| Id | Measurement | Output | Decides |
|---|---|---|---|
| SM1 | Profile of one request per cell, trace off, with new counters behind a diagnostics flag: time and calls per stage; per technique: `find` calls, hits and time; oracle solves by kind (Stage A, objective, proposal) with their time; DFS nodes; per sample: outcome (exact, shallow, stuck, too hard, not unique) | Cells: classic9, wordoku, mega12, mega16, samurai Nightmare; killer Hard and Expert; greaterThan Normal and Nightmare | the split oracle / rating / DFS; the share of chain finders (S3 extension, S10); p and c per sample (baseline of S1) |
| SM2 | Prototype of S1 + S2 as a diagnostics strategy (not registered for the app), same cells, 40 requests each | p per sample, time per sample, frontier size, share of frontier entries solved with the tier, in-band share | go / no-go of S1; K_F |
| SM3 | The Jigsaw Expert request of seed 1111 with the stage profile, under a 400 s budget | the stage and counter that hold the 325 s | which piece S7 bounds |
| SM4 | Trace equality of an S3 prototype on the regression corpus and the soundness suites; time per solve before and after on 81, 144 and 256 cells | equality, speed-up per board | go / no-go and priority of S3 |
| SM5 | S5a in Node `worker_threads` with 1, 2, 4 workers on mega12 and classic9 Nightmare | identical puzzles; wall time | pool design, message cost |

## 6. Phases, tests and gates

| Phase | Content | Version | Gate to continue |
|---|---|---|---|
| 0 | SM1, SM3 (measurement only, counters behind a flag) | none | profiles recorded |
| 1 | S3, S4, S7 ceilings that never trigger on the corpus | identical puzzles; S7 as a guard | SM4 equality; quick suites and regression hashes unchanged |
| 2 | S5a, S6 | identical puzzles; S6 behaviour change | pool-size invariance test (1, 2, 4 workers give the same puzzle on a seed list); time guard test |
| 3 | SM2, then S1 + S2 + S5b under the new algorithm version | new version | SM2 gate; soak and qualification of every offered cell on the new version |
| 4 | S8; S9 if the owner agrees and phase 3 leaves cells below 90 % | new storage / content | qualification of the cells S9 serves |
| 5 | S10 only if SM1 after phase 3 justifies it | identical | trace equality, measured gain at least 1.5x on a whole request |

Tests that every phase must keep or add:

- **Trace equality** (S3, S4, S10): for a corpus of puzzles per variant, the collected steps of the new solver
  equal the old ones exactly; kept permanently by leaving the reference scan reachable under `SG.DEBUG`.
- **Soundness**: every accepted puzzle has one solution (DFS) and the canonical rating claimed; the existing
  generic soundness and order-invariant suites run unchanged.
- **Pool invariance** (S5): the puzzle of a request is the same for every pool size and for the main-thread mode.
- **Version**: old recipes replay on the old search path, or are stored with their puzzle; the architect chooses
  and states which.
- Regression hashes, help examples and qualification lists are regenerated once, in phase 3, by their own task.

## 7. Decisions for the owner

| Id | Decision | Default proposed |
|---|---|---|
| OD-S1 | A new generator-algorithm version after rating v3 is frozen; old seeds give other puzzles | yes; old recipes keep their stored puzzle |
| OD-S2 | At the time guard, return the best valid puzzle with a warning (S6) | yes |
| OD-S3 | A shipped seed bank for the rarest cells (S9) | only for cells below 90 % after phase 3 |
| OD-S4 | Whether the default attempts by size (8 / 4 / 2) rise when samples are cheap and parallel | decide with phase 3's numbers |

## 8. Risks

- **p stays low after S1** for some cells (the frontier is empty or the tier cannot finish the puzzle). Then the
  feature makes failure cheap but not success common; S9 covers those cells. SM2 shows this before the build.
- **Monotonicity is not exact** for some technique (uniqueness-based ones are the candidates). It costs wasted
  candidates. SM2 counts the cases where the early exit of S2 said "solvable" and the full floor solve disagrees.
- **Footprints of S3 wrong for one finder**: caught by trace equality; a finder without a proved footprint keeps
  the whole-grid footprint and loses nothing.
- **Variants with their own strategies** (Killer structure search, Greater-Than sign dig) gain from S3 to S5 but
  not from S1 until their strategies are ported; Killer Hard and Expert may be a calibration matter that no
  search fixes (MS07e).
- **Browser against Node**: every number here is Node. The pool removes the cooperative slicing cost from the
  workers, but phones have 2 to 4 slow cores; the browser gates decide what is offered there.
