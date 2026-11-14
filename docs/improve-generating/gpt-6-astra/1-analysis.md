# Improve generating: independent analysis

SA2, gpt-6-astra. 2026-11-14. Worktree `improve-generating`, commit `f7be90f`.
Plan author: Fable. This is phase 1; I have not read the other analyst's improve-generating files.

Code was read, not executed. No tests, generation, benchmark, qualification, soak or timing-lock operation was
run. The calculations below read committed JSON only. No difficulty-v3 implementation change is proposed for
the current developers. This feature starts after MS18e and must be re-based on its frozen catalogue.

## 0. Verdict

The direction is good: reduce unsuccessful oracle work, deliberately seek requiredness, then parallelise
independent work. The plan is not yet a safe implementation specification or an availability forecast.

The important corrections are:

1. `G * B(N)` is an upper-count model, not an observed number of solves. Stage A hands over near 47% clues;
   floors, permanent refusals and proposal samples substantially change the actual count. The approximately
   1,296 expression is not an exact size-independent law.
2. S2 can rigorously preserve uniqueness only with deductions that do not assume uniqueness of the weakened
   puzzle. Knowing the parent is unique is insufficient. A cached *initial* candidate state is useful;
   retaining deductions from the parent is not.
3. S1 must distinguish a proved second solution from a resource-limited uniqueness check, and must recheck
   frontier entries evaluated after later removals. A unique snapshot need not stay unique after more digging.
4. S3 is a substantial solver refactoring. Canonical scan order, indirect peer changes, variant footprints and
   deterministic budget-check accounting all matter. Equal unrestricted traces alone do not prove equal
   bounded-generation results.
5. S5's browser pool does not automatically improve the current qualification measurement: `qualify.js`
   calls the synchronous pipeline inside each process. Its multi-process jobs parallelise *requests*, not
   the attempts of one request.
6. S6 explicitly relaxes seed determinism at the guard. It cannot promise a puzzle when no verified complete
   candidate exists, and a fallback does not become an exact qualification hit.
7. S8 largely already exists. `SG.cache` has result caching and idle pre-generation. Conversely, history does
   **not** generally store puzzles: the proposed default that old recipes keep their stored puzzle is not a
   migration for today's history.
8. S9's arbitrary Killer row/band permutations can disconnect cages; the analogous Greater-Than permutations
   can separate sign endpoints. Validity, presentation geometry, option compatibility and diversity all need
   checking. A bank is a possible product fallback, not an unconditional guarantee.

**Projection, likely scenario:** a comparable full-default Nightmare request falls from 23.7 to 1.6 s on
mega12 and 104.1 to 4.2 s on mega16 with S1-S6 and four useful lanes. These are about 14x and 25x, not measured
gains. The respective low-benefit/high-benefit median scenarios are 13.9/0.62 s and 41.4/1.46 s. The exact-hit
rate remains unmeasured. On Killer, where the proposed frontier has not replaced cage search, the comparable
gain is approximately 3.5x, with no established availability improvement.

## 1. Evidence and the baseline being estimated

### 1.1 Labels and populations

- **Measured (M):** a number directly recorded by the existing runs, or a code constant explicitly identified
  as such. It is not a new measurement.
- **Derived (D):** arithmetic over those records, including percentiles and time shares.
- **Projection (P):** any assumption about changed code, hardware, future tiers, hit probability or a proxy
  transferred between populations. Low/likely/high mean low/likely/high *benefit*, not confidence intervals.
- Times are seconds per generation request unless marked otherwise. The board table uses upper sample
  medians and nearest-rank p95, as the state report does. The actual qualification helper uses nearest-rank
  p50 as well as p95; an even-sample upper median here is not its p50. With two records, both displayed
  statistics are the maximum. These are not estimates of a production p95.
- `U` below means an unlocked historical timing. Correctness findings remain useful, but contention can
  distort its speed. Different seed formulas, attempts, trace settings and source identities are not pooled.

The engine in this worktree still has the MS05 recovery's 8/4/2 attempts and 256 allowance. It is not the final
rating-v3 catalogue. `difficulty.js` still reports rating version 2; cache schema is 2, history and wire are 1.
MS17b, not this analysis, owns the later rating/cache freeze. The new generator identity must be separate.

### 1.2 Measured evidence used, not discarded

Paths in this section are under `docs/difficulty-v3/`.

| Evidence | Measured or derived result | Consequence for these estimates |
|---|---|---|
| MS02, `baseline.md`, `evidence/MS02/*.json` | D: 202/204 score hits, only 91/204 required-qualified hits, including 12 vacuous Hell 1 hits. Classic9 Nightmare median/p95 0.121/0.467 s, but 0/12 required hits. Killer Hard 0.372/1.420, Expert 1.016/14.452, both 0/12 required hits | The old fast score-only path is not a successful exact-generation baseline |
| MS05r1, `recovery-profile.md`, `evidence/MS05r1/profile/*.json` | M: one attempt, no shallow allowance; the three decompositions below | Shows that local continuation once dominated G13, whereas mega16 already spent most time in samples |
| MS05r4, `shallow-cap-2026-11-13.md`, `evidence/MS05r4/selection.json` | D: at 256, classic9 Nightmare 2/12, 4.908/5.719 s, rating median 1,345; Master 12/12, 0.057/0.123; Killer Hard 0/12, 4.884/6.030; Expert 0/12, 9.671/16.074; Jigsaw Expert 11/12, 0.629/2.619 | Lowering the allowance is not a substitute for finding required candidates |
| R5 alternatives and large diagnostics | M/D: Nightmare hits at 64/128/256/none were 0/1/2/2 of 12. Mega16 seed 3 hit at attempt 6 at every allowance, taking 270.4/296.3/310.2/388.7 s respectively | Existence is established for that seed at six attempts, not availability under two attempts or 30 s |
| MS05r5p, `evidence/MS05r5p/{G13,mega12-nightmare,mega16-nightmare}.json` | M: current-default decompositions below, all shallow | Supplies the sample/local fractions; not a per-technique profile |
| MS05r5m, `evidence/MS05r5m/reconciled.json`, `records/*.json` | M: 14 valid unique deep occurrences, all shallow; all six relations pass. D: mega12 23.723/25.243 s, mega16 104.106/116.951 s | Exactness, not validity, is the problem; seven occurrences are only four distinct seeds per board |
| MS05b3, `evidence/MS05b3/outcomes.json` | M: 904 I5 and 309 supported CV3 requests; 167/186 selected tests passed, 19 availability assertions failed | Supplies the other board/level distributions in section 4; CV3 passing proves only at least one hit |
| MS05r6b, `evidence/MS05r6b/evidence.md`, `gd/*.json` | M: GD Nightmare 21/100 exact, Normal 86/100. Hard/Expert/Master hit assertions pass. D: Nightmare first-test time 429.951/100 = 4.300 s per request including test overhead, not a measured generation median | Stronger availability evidence than the tiny CV3 cohorts; no GD per-request p95 was retained for the full hundred |
| MS05r6b standing cost, `recovery-quick-cost.md`, `standing-quick-cost-final.json` | M: Generator 646.681 s, 3,262 tests in seven disjoint shards; Player 31.828 s, 1,683 tests. Pipeline verbosity benchmarks alone 225.3 s; Generator replay-player suite 139.0 s | Validation is itself costly. These are complete shard totals, not one unsharded command or generation latency |

The r6b GD pilot, `gd/pilot.json`, records eight seeds 7000-7007: Nightmare mean 4.128 s, upper median
5.065 s, maximum 5.841 s, 3/8 exact. It is separate from the hundred-request result. The confusion-matrix
test was not launched: 153/154 GD tests covered, 151 passing, two availability failures, one outstanding
cost item. A passing median-time assertion does not supply a recorded median.

The r6b compatibility records retain the deep and b3 evidence by exact-diff analysis, not by rewriting their
hashes. The deep generation hash remains `fee8b8d6...`; the broader current source hash differs because of
the store migration. The engine/variant paths were unchanged. This distinction must survive comparison.

| Profile (M), requests as named | Total | Samples | Local | Sample/local full ratings |
|---|---:|---:|---:|---:|
| r1 G13, samurai Nightmare seed 42, one attempt | 24.362 | 10.244 | 14.104 | 19 / 1,005 |
| r1 mega12 Nightmare seed 3, one attempt | 6.974 | 4.221 | 2.744 | 20 / 615 |
| r1 mega16 Nightmare seed 3, one attempt | 79.675 | 54.937 | 24.718 | 39 / 985 |
| r5p G13, two attempts, 24 samples | 21.556 | 15.473 | 6.066 | 53 / 512 |
| r5p mega12, four attempts, 48 samples | 23.775 | 19.792 | 3.971 | 89 / 887 |
| r5p mega16, two attempts, 24 samples | 107.225 | 96.958 | 10.252 | 95 / 512 |

D: sample shares are 0.718, 0.832 and 0.904 in the last three rows. D: 96.958/24 = 4.040 s per
mega16 sample, but this mixes proposal and ordinary samples and includes their rating/refinement work.
It is not the cost of 1,296 measured full logical solves. Even eliminating all samples would leave about
10.3 s serial in that request if the local path stayed unchanged.

Every deep occurrence is retained here; repeated seed 3 executions are not independent seed discoveries:

| Occurrence suffix (M, seconds) | mega12 | mega16 |
|---|---:|---:|
| invariant-1 | 23.721 | 116.951 |
| invariant-2 | 23.520 | 103.606 |
| invariant-3 | 23.637 | 107.517 |
| invariant-4 | 25.243 | 80.394 |
| cv5-a, seed 3 | 23.723 | 107.753 |
| cv5-b, seed 3 | 23.867 | 104.106 |
| cv5-other, seed 4 | 24.951 | 80.487 |

### 1.3 Availability and cost items still in force

| Item | Recorded finding and implication |
|---|---|
| S-AV01 | Greater-Than Normal: original CV6 p95 2.035 s against 1.400 s; b3 I5 mean/p95/max 1.958/5.280/6.690 s. Different protocols; S1 cells do not fix signs |
| S-AV02/03 | mega12/mega16 Nightmare: deep 0/7 each; b3 CV3 0/3 and 0/2. The former fits the observed 30 s timing sample but fails exactness; the latter fails both |
| S-AV04/12 | Samurai, Sohei, Flower and Butterfly Nightmare: b3 0/2 each. Butterfly's 32.823 s maximum also exceeds 30 s, contrary to a blanket “all other multigrids fail only hits” reading of PR-S2 |
| S-AV05/06/09 | Killer I5 Hard 0/20, Expert 1/8, Master 2/8, Nightmare 1/8; their b3 CV3 cells all 0/3. Do not describe every Expert cohort as zero-hit |
| S-AV07/10 | Classic9 Nightmare R5 2/12, GD 21/100; Wordoku Nightmare I5 4/20 and CV3 0/3. Wordoku Normal 15/20 |
| S-AV08 | Final standing quick cost is now known: 646.681/31.828 s. The earlier state report's “unknown” has been superseded |
| S-AV11 | Jigsaw Expert seed 1111: 325.313 s; other 19 requests at most 2.438 s. No attribution to a stage exists |
| S-AV13 | Butterfly/Flower Easy 0/2 each, despite subsecond times. A faster kernel alone cannot cure availability |
| S-AV14/15 | r6b adds classic9 Normal 86/100 and the unexecuted GD confusion matrix, respectively |

## 2. Proposal-by-proposal verification

Anchors name actual functions in this worktree. Line numbers are orientation, not dependencies on future edits.

### S1. Frontier dig

**Verified change:** replace the ordinary `digStageSteps`/`digGuidedSteps` path and the top-tier alternation
in `generator/js/engine/digger.js:751-911,1818-1948`; use floor/tier sets from
`generator/js/engine/difficulty.js:334-399` (`bandSets`, `requiredOf`). Reuse `refineDown`,
`createKeeper`, `runLocalSearch`/`localSearchSteps`, but do not assume their cost disappears.

The diagnosis of repeated from-givens oracles is correct. The claimed solve count is not measured:
`digGuidedSteps` permanently prunes refused groups already, and `digStageSteps` stops its initial descent
near 47% clues. At Nightmare, odd samples use `guardedKeepsUnique` plus the below-chain objective, not the
same full-set solve as an ordinary sample. Rounding, odd groups and non-rotational symmetry also change
`G * B(N)`. At 81 cells, 41 groups times 32 is 1,312, before considering the much smaller actual pool.

**Necessary design details:** retain the epoch of each frontier entry; either test its snapshot or recheck
uniqueness at the final parent. A proved ambiguous removal can be pruned monotonically; a capped count cannot
be called ambiguous or permanently impossible. All DFS checks, snapshot copies, floor-ladder passes,
deepening, canonical verification and the still-present local continuation need explicit counts.
One pass does not prove a global floor-minimal puzzle when solver behaviour is non-monotone.

The prefix theorem is about a canonical solve of the *same* puzzle, not monotonicity between different clue
sets. Floor-stuck is guidance. Final `isExact` at `digger.js:1720` must still use the complete canonical
rating and established uniqueness. Empty tiers need their existing vacuous treatment; blindly seeking a
floor frontier where floor equals allowed cannot find a full-solvable crossing.

The plan's statement that “S3 may give Hell 2” a tier is ambiguous: this feature's event-driven S3 cannot
add a tier while preserving ratings. If it means difficulty-v3's technique expansion, name that dependency
and inspect the final registered weights. No new Hell tier is authorised by a generator optimisation.

Killer's cage hook (`variants/killer.js:791`, `searchCagesSteps`) and Greater-Than's `digSignsSteps`
(`variants/greater-than.js:226`) are separate. The requested Hard/Expert Killer measurement is essential,
but a cell-frontier prototype alone does not implement a cage/sign optimisation.

### S2. Re-derivation early exit

**Verified change:** `logical-solver.js:124,185,237,318` (`loadGivens`, `applyFinding`, `iterate`, `solve`)
currently solves to termination. `digger.js:293` (`techniqueOracle`) and `removalObjective` obtain a full
report. A private early-stop condition for S1's floor oracle is feasible; it is not a canonical rating.

The uniqueness argument is valid when every deduction before re-derivation is valid for *all* solutions of
the weakened puzzle. Thus use `assumeUniqueness:false`, or first prove uniqueness of that weakened puzzle.
The floor can contain Unique Rectangle and future uniqueness techniques. Setting `assumeUniqueness:true`
merely because the parent was unique is circular.

`constraints.js:353-390` confirms that the logical solver's initial state uses only givens and peer
eliminations, not the DFS propagation closure. Updating only removed cells and peers is possible for that
initial state, but restoration must recompute candidate support from all remaining givens; simply OR-ing
back a digit can undo another clue's exclusion. Reset values, unsolved counts and per-run caches as well.
Do not reuse the solved parent's derived eliminations. S2 saves successful-test tails, not initialisation,
failed floor searches, uniqueness checks or scored deepening.

### S3. Event-driven ladder

**Verified change:** `logical-solver.js:237` restarts the ladder after each finding. For example,
`tech-basic.js:135,161,236` scans cells, units and box/line pairs. Dirty scopes can preserve the first result
if they preserve the exact existing nested order, including digit and tie order.

This needs changes in `constraints.js:365`/`applyFinding`: a placement also changes all affected peers.
The direct finding's `eliminations` list is not the complete changed-cell set. Per-solve ownership is needed
for recursive Nishio states and multiple technique sets. Cage Rule of 45 and inequality chains can depend
on more than one cage or local sign; use whole-grid footprints until a precise dependency proof exists.
Negative chain certificates need dependencies on possible newly-created links, not just visited nodes.

There is a second equivalence obligation. `boundedObjective` counts `budget.check()` calls up to 100,000;
Killer uses 30,000-check slices. Cage, inequality and chain finders call `ctx.check()`. Skipping checks with
clean scopes can make a previously capped search complete. Preserve virtual charges/cap boundaries or put
that change behind the new algorithm identity. Trace equality with an unlimited budget does not catch it.

### S4. Monotone-score early exit

**Verified change:** `difficulty.js:243` (`breakdown`) and `digger.js:293,711` currently classify after the
solve. With non-negative weights, fixed initial empties, growing work and non-decreasing peak, the calibrated
score is non-decreasing. Use the same single rounding and exclusive `spec.max` as `classify`.

The logical solver's own `run.score` is a different base-cost formula; it cannot be compared directly to
the calibrated band. Keep a generic callback or score-bound adapter rather than importing Generator rating
code into shared `core/`. Apply it only where rejection is all the caller needs. An early “too hard” result
may previously have ended stuck, so refusal reasons/logs can change even when both branches reject the
group. Canonical ratings, hints and complete replay traces must remain unbounded and equal.

### S5. Worker pool

**Verified change:** `worker/worker-client.js:create` has one foreground worker; `gen.worker.js` drives the
cooperative iterator. `digger.js:1852-1948` has the named independent forks and fresh attempt caps.
However `createKeeper` is outside the attempt loop, shared through the hooks; `best`, sample-vs-keeper
precedence, `unsound`, work totals and emitted context also need a serial-equivalence contract.

For S5a, merge separate sample-best/keeper candidates in the actual serial order, not arbitrary worker
completion order or merely “best score”. Preserve first strictly better, canonical `qualityOf` and the
first-sample exception after a hook has found an exact keeper. Treat speculation as extra CPU work,
not counted serial effort. Include full-grid seeds, model reconstruction, caps, error choice and trace events
in the invariance tests.

For S5b, per-sample quotas change paths; local continuation and cage-hook quotas need ownership too.
Cancelling or crashing an early lane must not permit returning a later result as if it were the serial one.
Models have derived arrays and per-model side data; use/rebuild the existing model wire semantics, including
cage/inequality propagation setup (`pipeline.js:269-365`), rather than posting live model objects blindly.

Four lanes are the proposed default maximum. The text's “up to 8 on 81-cell boards” describes a hypothetical
wider pool, not that default. S5a cannot use four independent attempts on a two-attempt board. `file://`
uses the one-lane main-thread path (`guessMode`, worker client:125), so it receives no pool speed-up.

### S6. Anytime result

**Verified change:** `generateSteps` currently catches only to attach work and rethrows; `generateAttempts`
publishes only at the end. Worker/client error handling currently rejects on budget exhaustion.
The keeper is private to the synchronous worker; termination does not magically deliver its candidate.

Publish owned checkpoints at completed verification boundaries, or use a deterministic resume record.
Only consumed-prefix candidates may count for the deterministic result. A clock-selected partial prefix is
an explicit OD-S2 exception: preserve its puzzle, warning, consumed ordinal and algorithm identity.
Cancellation/supersession is not a request for a fallback. No verified candidate means an honest no-result.
Do not cache a time-limited result as the canonical seed result or turn a shallow fallback into a hit.
The proposed active-time-to-wall-time guard change is a separate behavioural decision.

### S7. Bounds

**Verified change:** `full-grid.js:191,241` makes attempts after `maxRestarts` unlimited;
`digger.js:951` (`secureUniqueness`) has no local ceiling; `greater-than.js:291-299` performs per-sign DFS
and restricted solves; `jigsaw.js:715` (`buildJigsaw`) is outside the pipeline budget argument.
Jigsaw does have bounded layout attempts and solvability screens: “unbounded” must not erase those bounds.

A per-restart node ceiling plus infinitely many new restart forks is still unbounded. Bound total grid
restarts/work and specify what happens on exhaustion. A truncated safety count is unknown, never unique.
S7 can remove a pathological latency but also remove its exact hit. A guard that never triggers on the
regression corpus still changes other seeds; it belongs under OD-S1, not a globally “identical” phase.
The 325.313 s request cannot yet be attributed to one of these sites.

### S8. Idle stock

**Current-code claim is incomplete:** `generator/js/ui/cache.js` already implements this feature:
LRU 20 result cache, up to two pooled puzzles per configuration/four total, one worker-only background
client, one-second quiet delay, hidden-tab pause, cancellation on user changes, and cost-based admission.
`COSTS`, `MAX_PREGEN_COST_MS=3000` and `PREGEN_LIMIT_MS=8000` are important integration points.
Its old cost table is not a current requiredness measurement.

An IndexedDB stock and deterministic next-seed policy would extend/replace this implementation, not start
from zero. Preserve explicit-seed semantics, cross-tab ownership, foreground priority and replay consent.
An unrequested stock fill spends CPU, memory and battery. No first-request generation speed-up follows.

### S9. Bank

**New functionality:** add a versioned content/transform path ahead of `pipeline.executeSteps`, followed by
canonical `difficulty.rate`, `requiredOf` and validation. Integrate with cache, history, exports and replay.

Restrict transformations to automorphisms of all relevant constraints *and presentation contracts*.
Arbitrary Sudoku row permutations preserve row/box rules but not connected Killer cages or adjacent
Greater-Than signs (`killer.js:212,528`; `greater-than.js:21,132`). Reversing digits and flipping every
inequality is sound; arbitrary relabelling of sums is not. Preserve symmetry options, fixed cells, jigsaw
layout and multigrid overlaps. A changed scan order can change rating/requiredness even when validity holds.

Bound the transformation trials; retain the identity transform of a compatible exact bank entry as a
possible guaranteed fallback. Guaranteeing that requires such an entry for the requested options and the
frozen rating version. Specify finite diversity and what happens after history exhausts the stock.

### S10. WebAssembly

**New kernel implementation:** candidates are `core/js/engine/dfs-solver.js` and `tech-chain.js`; current
scripts are JavaScript. An embedded module can avoid `file://` fetch, but requires reproducible source,
build provenance and a maintained JavaScript fallback. Preserve traversal order, cap/check accounting,
integer widths, exceptions, cancellation and trace construction. Avoid changing floating-point rating
arithmetic while porting integer search. Benefit is Amdahl-limited and should be measured after S1-S5.

## 3. Feasibility, ownership and compatibility

### 3.1 Approximate implementation size

All counts here are **P engineering estimates**, changed production lines, excluding generated content;
test lines are additional. Files include directly affected integration files, not documentation mirrors.
They overlap and must not be summed into a precise project quote.

| Proposal | Production lines / files | Focused tests to add or extend | Owner dependency |
|---|---|---|---|
| S1 | 300-650 / 4-6 | 200-400 lines: frontier epochs, exact/shallow, empty tier, symmetry, capped uniqueness, keeper | OD-S1; OD-S4 only if attempts/sample volume rises |
| S2 | 100-220 / 2-3 | 100-220: multi-cell re-derivation, assumed-uniqueness refusal, candidate restoration, failed floor | OD-S1 with S1 |
| S3 | 450-1,200 / 8-15 | 300-700: reference traces, recursive states, every variant, bounded-check parity | No semantic decision if truly equal; OD-S1 if guard outcomes change |
| S4 | 70-160 / 2-4 | 80-180: rounded band edge, Infinity, incomplete reports, unchanged full solves | None for internal equal predicate; trace compatibility must be explicit |
| S5a / S5b | 450-800 / 5-8; plus 200-450 / 4-7 | 250-500: out-of-order results, ties, hooks, cancellation, 1/2/4 lanes, main mode | S5a identity/guard review; S5b OD-S1; OD-S4 for increased work |
| S6 | 120-250 / 5-8 | 150-250: no checkpoint, verified checkpoint, cancellation, stale worker, cache/history | OD-S2, plus OD-S1 identity integration |
| S7 | 100-250 / 4-7 | 100-220: deterministic exhaustion, restart total, unknown counts, unchanged corpus | OD-S1 for triggered guards |
| S8 | 200-450 / 4-8 if extending current cache | 120-250: idle priority, quotas, hidden tab, cross-tab, schema and seed matching | Algorithm/storage decision with OD-S1; not an exactness waiver |
| S9 | 250-600 / 5-9, plus content tooling/data | 200-400: transforms, bank version, options, exactness, finite exhaustion, replay | OD-S3 and OD-S1 |
| S10 | 500-1,500 / 7-12 plus reproducible build | Equality corpus, guard/error parity, unsupported-WebAssembly fallback | None if equal and gated; otherwise outside stated non-goals |

S3 touches shared core: both apps' script/test lists and Player hints/replay are part of the change.
Relevant suites already include `solver`, `tech-basic`, `tech-subsets`, `tech-fish`, `tech-chain`,
`difficulty-floor`, `pipeline`, `worker`, `cache`, `history`, `steps`, `replay` and `ui-contract`.
Killer, Greater-Than and broad availability tests have manual/deep ownership; do not silently migrate them.

### 3.2 Contracts that must not drift

- **Requiredness:** preserve the frozen floor-prefix theorem and canonical counts. Early oracle success,
  `tierUsed`, a failed bounded solve, or a cached old rating is not a new certificate.
- **Exactness:** `isExact`, `qualityOf`, keeper precedence and `qualify.hitOf` must stay aligned.
  Complete/unique/approximately in-band are different claims.
- **E:** current recovery E is five wires G09-G13, fourteen analyses G01-G14 and 520 hash keys in 104 ledgers.
  Keep the old ledgers historical. S1/S2/S5b/S7 need explicit new-version fixtures; S3's identity claim
  requires both solver equality and unchanged generator results. Saved puzzle equality does not imply
  equal generation steps or recorded work.
- **History/cache:** `history.js:19-23,57-116` saves configuration/seed/summary, not givens, solution or
  algorithm identity. `cache.js:120` keys no algorithm version. A 20-entry evictable cache cannot back
  the 100-entry history guarantee. Choose an old-engine route, a pre-switch materialisation/migration,
  or an explicitly revised old-recipe contract; do not pretend puzzle bytes already exist.
- **Wire/formats:** `pipeline.toWire/fromWire` currently remain version 1 and default missing `exact` to
  false. Future optional provenance must survive wire/cache/export readers, not be inferred from level
  names. Keep the final rating version 3 distinct from generator identity and bank/stock version.
- **Replay:** a cached result today regenerates the seed to reconstruct trace/dig log and drops mismatches.
  A stored puzzle alone cannot replay a retired search algorithm. S6 and S9 require truthful provenance
  or a clearly separate solve-only explanation.
- **Qualification:** at most 36 cells: 2 s; at most 81: 10 s; larger: 30 s p95, plus at least 90% exact.
  The requested 30 s comparison below is not permission to use 30 s for classic9/Killer/Jigsaw/Greater-Than.
  The app currently has a 120 s *active* generation budget; Node trace-off timing is not app wall time.

## 4. Speed model and before/after estimates

### 4.1 Reproducible scenario model

This is a fixed-work, current-catalogue comparison, **not time until an exact puzzle is guaranteed**.
Where the new search fails at the same sample/attempt count, the faster number is a faster failure.
No automatic increase of attempts or samples is assumed.

For a baseline median or p95 `t`, sample-time fraction `f`, and sample-cost divisor `r`:

```text
A(t,r,f) = t * (1 - f + f/r)
after S1+S2 = A(t,r12,f)
after S1-S4 = A(t,r12,f) / (g3*g4)
after S1-S6 median = 0.05 + after S1-S4 median / pm
after S1-S6 p95    = 0.10 + after S1-S4 p95 / pp
factor = baseline t / projected t
```

The added 0.05/0.10 s are **P warm coordination allowances**, not measured IPC costs. Cold start, browser
throttling, trace transport and a slower device are not included. Class F keeps its current early-hit
strategy and existing lane, so it has no added pool allowance. This is the conservative deployment policy
I recommend, rather than making fast Hard-Master cells pay a speculative search tax.

| Class / applicable cells | `f` and basis | `r12` low/likely/high (P) | `g3` (P) | `g4` (P) | `pm`; `pp` (P) |
|---|---|---|---|---|---|
| F: Hard-Master except Killer/sign strategy | 0: frontier left off | 1/1/1 | 0.9/1.25/1.8 | 1/1/1 | 1/1/1; 1/1/1 |
| C: classic9 Nightmare; Wordoku proxy | 0.65 P, no measured stage split | 2/5/10 | 1/1.5/2.5 | 1/1.05/1.1 | 1/2.8/3.5; 1/2/3 |
| J: Jigsaw Nightmare | 0.65 P proxy, no stage split | 2/5/10 | 1/1.5/2.5 | 1/1.05/1.1 | 1/1.5/2; 1/1.3/1.7 |
| L12: mega12 Nightmare | 0.832 D from r5p | 2/5/10 | 1/1.7/2.7 | 1/1.05/1.1 | 1/2.8/3.5; 1/2/3 |
| L16: mega16 Nightmare | 0.904 D from r5p | 3/8/15 | 1/1.8/3 | 1/1.05/1.1 | 1/2.8/3.5; 1/2/3 |
| MG: four multigrid Nightmare cells | 0.718 D for samurai; P transfer to others | 2/5/10 | 1/1.7/2.7 | 1/1.05/1.1 | 1/2.8/3.5; 1/2/3 |
| K: Killer Hard-Nightmare | 0: no cage-frontier port credited | 1/1/1 | 1/1.4/2 | 1/1/1 | 1/2.5/3.2; 1/2/2.8 |
| G: Greater-Than Hard-Nightmare | 0: no sign-frontier port credited | 1/1/1 | 1/1.5/2.5 | 1/1/1 | 1/2.5/3.2; 1/2/2.8 |

`g3` is a *whole residual-request* divisor, not the plan's 3-10x non-chain-kernel claim. The shares of
chains, successful floor re-derivations and DFS remain unmeasured. `g4` is small and not credited to the
separate sign/cage strategies. Pool p95 gains are lower than median gains because of ordered waiting.
The low scenario is not a worst-case bound; an unsuccessful prototype can be slower and should stay off.
Applying each column's low/likely/high parameters gives all three scenarios for every row below.

### 4.2 Effect attributable to each proposal

These formulas apply to **each board/level's baseline `t` and class above**, for median and p95 separately.
They prevent multiplying sample, whole-solve and whole-request improvements as if they were independent.

| Proposal | Low / likely / high effect and seconds formula (P unless D specified) | Availability |
|---|---|---|
| S1 alone | Set `r1=1.5/3/6` for C/J/L12/MG, `2/5/10` for L16; use `A(t,r1,f)`. L16 median 57.05/28.82/19.41 s, versus D 104.106 | Changed candidate distribution; hit probability unknown |
| S2 after S1 | Incremental factor `A(t,r1,f)/A(t,r12,f)`; do not divide the whole request by a re-derivation factor. L16 median becomes 41.36/21.76/16.27 s; likely incremental factor 1.32 | Preserves accepted uniqueness under the corrected contract; floor-solvability remains heuristic |
| S3 | Divide the relevant residual by `g3`; likely 1.25x F, 1.4x K, 1.5x C/J/G, 1.7x L12/MG, 1.8x L16 | Equal completed results if cap accounting also equal; only timeouts can recover |
| S4 | Divide by `g4`: 1/1.05/1.1x on the cell-frontier classes, 1x elsewhere. L16 after S1-S4: 41.36/11.51/4.93 s median | No hit increase for an unchanged count-limited search |
| S5a | Up to `min(A,4)`, not 8 with the proposed pool. For two attempts use median 1/1.7/2 and p95 1/1.5/2; other useful work uses the class pool factors | No new hits at unchanged attempt count; can recover guard-censored hits |
| S5b | Class `pm/pp` after quotas; L16 after S1-S6 likely 4.16/6.57 s | New quota allocation can raise or lower hits; invariance applies to the new serial reference |
| S6 | 1x computational speed; return at guard plus delivery cost only when a verified checkpoint exists | Returned-puzzle availability can improve, required-exact availability does not automatically improve |
| S7 | 1x on ordinary non-triggering requests. Tail cost is `bounded stage work + remaining work`, currently not numerically estimable | Can exchange an outlier for a rejected attempt or miss; SM3 must quantify |
| S8 | Miss: same generation time. Hit: storage/deserialisation time `epsilon`; factor `t/epsilon`. No recorded read latency supports a numerical median/p95 | Only settings/seed matches benefit; no increased intrinsic exact-hit probability |
| S9 | `nTransformRatings * cRating + validation`. D proxy from r5p local time/ratings: mega12 0.0045, mega16 0.0200, samurai 0.0118 s per charged rating, including other local work. P low/likely/high benefit, 10/3/1 trials plus 0.03 s validation: mega16 0.23/0.09/0.05 s; mega12 0.075/0.043/0.035; samurai 0.148/0.065/0.042 | Conditional on a compatible exact bank entry; not independently generated diversity. Other boards lack a comparable rating-cost split |
| S10 | If the remaining kernel share `h=0.5/0.6/0.75`, kernel gain `k=1.5/2/3`, whole divisor `1/(1-h+h/k)=1.2/1.43/2`. Applied to L16's likely 4.16 s: 3.47/2.91/2.08 s | Equal results only. The likely scenario fails the plan's 1.5x whole-request gate |

S9's local-time/charged-rating ratios are *not* isolated canonical-rating benchmarks: proposal scans,
counts and copies are included. Its small numerical scenario is consequently provisional and not a
promise for the final Hell catalogue. No credible rating-only p95 is present. For every other S8/S9 cell
the formula is the estimate; inventing a storage or single-rating latency would be less informative.

### 4.3 Required board-by-level table

`current` is **D** from the stated measured request populations. All after columns are **P likely** from
section 4.1. Each pair is median/p95 seconds. Current inputs are b3 I5 where present, otherwise b3 CV3,
except classic9 Master/Nightmare use R5/256 and the two mega Nightmares use the deep records.

`V` marks current **vacuous** Hell 1. Its future values are a deliberately separate **H scenario**:
use *twice that board's current Nightmare work*, then its Nightmare class formula. Small/central/large H work
multipliers are 1/2/4; combine large work with low benefit and small work with high benefit. This is a sensitivity envelope,
not evidence of final Hell 1 cost or a speed-up over V. A real Hell 1 median/p95 is not presently estimable.

Verdicts concern time only unless stated. `Q?` means new qualification/hits still required. Fast F rows
retain their current search; their small synthetic gains should not drive feature priorities.

| Board | Level | Class | Current D | S1+S2 P | S1-S4 P | S1-S6 P, pool wall | 30 s / 120 s verdict; actual qualification |
|---|---|---|---:|---:|---:|---:|---|
| classic9 | Hard | F | 0.028/0.071 | 0.028/0.071 | 0.022/0.057 | 0.022/0.057 | fits/fits; 10 s fits, retain |
| classic9 | Expert | F | 0.116/0.155 | 0.116/0.155 | 0.093/0.124 | 0.093/0.124 | fits/fits; 10 s fits, retain |
| classic9 | Master | F | 0.057/0.123 | 0.057/0.123 | 0.046/0.098 | 0.046/0.098 | fits/fits; 10 s fits, retain |
| classic9 | Nightmare | C | 4.91/5.72 | 2.36/2.75 | 1.50/1.74 | 0.584/0.971 | fits/fits; Q? exact rate |
| classic9 | Hell 1 | C/H | 1.54/2.03 V | 4.71/5.49 | 2.99/3.49 | 1.12/1.84 | H only; Q? |
| killer | Hard | K | 4.75/6.47 | 4.75/6.47 | 3.39/4.62 | 1.41/2.41 | fits/fits; exactness blocked |
| killer | Expert | K | 10.81/14.74 | 10.81/14.74 | 7.73/10.53 | 3.14/5.36 | fits/fits; serial 10 s still missed; hits blocked |
| killer | Master | K | 12.45/23.36 | 12.45/23.36 | 8.90/16.69 | 3.61/8.44 | fits/fits; serial 10 s missed; hits blocked |
| killer | Nightmare | K | 17.82/29.98 | 17.82/29.98 | 12.73/21.41 | 5.14/10.81 | fits/fits; even pooled 10 s missed; hits blocked |
| killer | Hell 1 | K/H | 0.945/1.85 V | 35.64/59.95 | 25.46/42.82 | 10.23/21.51 | H: pool fits30, serial not; 10 s fails |
| jigsaw9 | Hard | F | 0.019/0.078 | 0.019/0.078 | 0.015/0.062 | 0.015/0.062 | fits/fits; retain |
| jigsaw9 | Expert | F | 0.917/2.44 | 0.917/2.44 | 0.734/1.95 | 0.734/1.95 | p95 fits; 325.313 s outlier unresolved by S1-S6 |
| jigsaw9 | Master | F | 0.047/0.130 | 0.047/0.130 | 0.038/0.104 | 0.038/0.104 | fits/fits; retain |
| jigsaw9 | Nightmare | J | 0.953/2.33 | 0.457/1.12 | 0.290/0.709 | 0.244/0.645 | fits/fits; preserve existing >=90% I5 |
| jigsaw9 | Hell 1 | J/H | 0.038/0.156 V | 0.915/2.23 | 0.581/1.42 | 0.437/1.19 | H only; Q? |
| greaterThan | Hard | G | 0.182/4.83 | 0.182/4.83 | 0.121/3.22 | 0.099/1.71 | fits/fits; retain, U baseline |
| greaterThan | Expert | G | 2.40/14.20 | 2.40/14.20 | 1.60/9.47 | 0.691/4.83 | fits/fits; likely serial 10 s fits |
| greaterThan | Master | G | 4.07/6.85 | 4.07/6.85 | 2.71/4.56 | 1.14/2.38 | fits/fits; retain |
| greaterThan | Nightmare | G | 9.30/19.19 | 9.30/19.19 | 6.20/12.79 | 2.53/6.50 | pool fits10; serial qualification still misses |
| greaterThan | Hell 1 | G/H | 0.234/0.651 V | 18.60/38.38 | 12.40/25.59 | 5.01/12.89 | H: fits30/120, fails10 |
| mega12 | Hard | F | 0.065/0.068 | 0.065/0.068 | 0.052/0.054 | 0.052/0.054 | fits/fits; Q? tiny U cohort |
| mega12 | Expert | F | 0.081/0.117 | 0.081/0.117 | 0.065/0.094 | 0.065/0.094 | fits/fits; Q? |
| mega12 | Master | F | 0.170/0.448 | 0.170/0.448 | 0.136/0.358 | 0.136/0.358 | fits/fits; Q? |
| mega12 | Nightmare | L12 | 23.72/25.24 | 7.93/8.44 | 4.44/4.73 | 1.64/2.46 | fits/fits; exact rate unknown |
| mega12 | Hell 1 | L12/H | 0.048/1.29 V | 15.87/16.88 | 8.89/9.46 | 3.22/4.83 | H only; Q? |
| mega16 | Hard | F | 0.309/0.309 | 0.309/0.309 | 0.247/0.247 | 0.247/0.247 | fits/fits; Q? two U records |
| mega16 | Expert | F | 0.581/0.581 | 0.581/0.581 | 0.465/0.465 | 0.465/0.465 | fits/fits; Q? |
| mega16 | Master | F | 1.16/1.16 | 1.16/1.16 | 0.926/0.926 | 0.926/0.926 | fits/fits; Q? |
| mega16 | Nightmare | L16 | 104.11/116.95 | 21.76/24.44 | 11.51/12.93 | 4.16/6.57 | likely fits/fits; low scenario still >30; hits unknown |
| mega16 | Hell 1 | L16/H | 0.616/0.616 V | 43.52/48.89 | 23.02/25.87 | 8.27/13.03 | H only; low scenario can exceed120 |
| samurai | Hard | F | 0.229/0.229 | 0.229/0.229 | 0.183/0.183 | 0.183/0.183 | fits/fits; Q? two U records |
| samurai | Expert | F | 0.945/0.945 | 0.945/0.945 | 0.756/0.756 | 0.756/0.756 | fits/fits; Q? |
| samurai | Master | F | 0.965/0.965 | 0.965/0.965 | 0.772/0.772 | 0.772/0.772 | fits/fits; Q? |
| samurai | Nightmare | MG | 26.74/26.74 | 11.38/11.38 | 6.38/6.38 | 2.33/3.29 | fits/fits; exact rate unknown |
| samurai | Hell 1 | MG/H | 5.25/5.25 V | 22.76/22.76 | 12.75/12.75 | 4.60/6.48 | H only; Q? |
| sohei | Hard | F | 0.274/0.274 | 0.274/0.274 | 0.219/0.219 | 0.219/0.219 | fits/fits; Q? two U records |
| sohei | Expert | F | 0.193/0.193 | 0.193/0.193 | 0.154/0.154 | 0.154/0.154 | fits/fits; Q? |
| sohei | Master | F | 0.511/0.511 | 0.511/0.511 | 0.409/0.409 | 0.409/0.409 | fits/fits; Q? |
| sohei | Nightmare | MG | 27.49/27.49 | 11.70/11.70 | 6.55/6.55 | 2.39/3.38 | fits/fits; exact rate unknown |
| sohei | Hell 1 | MG/H | 0.300/0.300 V | 23.40/23.40 | 13.11/13.11 | 4.73/6.65 | H only; Q? |
| flower | Hard | F | 0.095/0.095 | 0.095/0.095 | 0.076/0.076 | 0.076/0.076 | fits/fits; Q? two U records |
| flower | Expert | F | 2.33/2.33 | 2.33/2.33 | 1.87/1.87 | 1.87/1.87 | fits/fits; Q? |
| flower | Master | F | 3.05/3.05 | 3.05/3.05 | 2.44/2.44 | 2.44/2.44 | fits/fits; Q? |
| flower | Nightmare | MG | 23.07/23.07 | 9.82/9.82 | 5.50/5.50 | 2.01/2.85 | fits/fits; exact rate unknown |
| flower | Hell 1 | MG/H | 4.78/4.78 V | 19.63/19.63 | 11.00/11.00 | 3.98/5.60 | H only; Q? |
| butterfly | Hard | F | 0.093/0.093 | 0.093/0.093 | 0.074/0.074 | 0.074/0.074 | fits/fits; Q? two U records |
| butterfly | Expert | F | 0.291/0.291 | 0.291/0.291 | 0.233/0.233 | 0.233/0.233 | fits/fits; Q? |
| butterfly | Master | F | 0.862/0.862 | 0.862/0.862 | 0.690/0.690 | 0.690/0.690 | fits/fits; Q? |
| butterfly | Nightmare | MG | 32.82/32.82 | 13.97/13.97 | 7.83/7.83 | 2.85/4.01 | likely becomes time-eligible; hits unknown |
| butterfly | Hell 1 | MG/H | 0.742/0.742 V | 27.94/27.94 | 15.65/15.65 | 5.64/7.93 | H only; Q? |

Most Hard-Master CV3 numbers are U; the larger I5 upper-level timings and R5/deep runs are locked.
The Jigsaw Expert maximum is not obtained by multiplying its ordinary p95. S7 must address it separately.

Two additional S-AV cells illustrate the limits of transfer. **P**, Wordoku Nightmare using class C on
its b3 I5 **D** 4.956/5.486 s gives 2.379/2.633 after S1+S2, 1.510/1.672 after S1-S4 and
0.589/0.936 after S1-S6. Its current 4/20 exact hits still need improvement. **P**, applying class G to
Greater-Than Normal's b3 I5 **D** 1.618/5.280 gives 1.079/3.520 after S3 and 0.481/1.860 with the pool.
Even that p95 is above the separate 1.400 s CV6 assertion; this different I5 cohort cannot establish a CV6 pass.

| Nightmare, S1-S6 (P) | Low-benefit median/p95 | Likely median/p95 | High-benefit median/p95 | Likely request median factor |
|---|---:|---:|---:|---:|
| classic9 | 3.36/3.96 | 0.584/0.971 | 0.262/0.388 | 8.4x |
| killer | 17.87/30.08 | 5.14/10.81 | 2.83/5.45 | 3.5x |
| jigsaw9 | 0.693/1.67 | 0.244/0.645 | 0.122/0.306 | 3.9x |
| greaterThan | 9.35/19.29 | 2.53/6.50 | 1.21/2.84 | 3.7x |
| mega12 | 13.90/14.84 | 1.64/2.46 | 0.623/0.812 | 14.5x |
| mega16 | 41.41/46.57 | 4.16/6.57 | 1.46/1.95 | 25.0x |
| samurai | 17.19/17.24 | 2.33/3.29 | 0.960/1.16 | 11.5x |
| sohei | 17.67/17.72 | 2.39/3.38 | 0.986/1.19 | 11.5x |
| flower | 14.84/14.89 | 2.01/2.85 | 0.835/1.02 | 11.5x |
| butterfly | 21.09/21.14 | 2.85/4.01 | 1.17/1.40 | 11.5x |

For Hard-Master and H rows, all low/high seconds follow the same published formulas and parameter table,
not an unreported second fit. For H specifically, combine the 4x Nightmare workload with low benefit,
2x with likely, 1x with high. Thus mega16 H has an illustrative pooled p95 of about 186/13.0/1.95 s:
the slow side would hit the app guard, not return after 186 s.

### 4.4 Availability is a separate estimate

Identical S3/S4/S5a/S10 cannot turn the deep 0/7 exact population into successes when requests already
complete. S6 improves “a usable puzzle returned”, not the required-exact rate. S8 caches the existing
distribution. S1/S2/S5b need a new measurement; S9 serves a different, finite-content distribution.

Two explicit sensitivity calculations are useful:

1. **P, not an inferred per-sample probability:** if an effective search opportunity has probability `p`,
   `H(n,p)=1-(1-p)^n`. Shared grids, local continuation and correlated samples violate independence.
   The formula is a planning sensitivity only.
2. **P, effective-yield multiplier `k`:** applying it to the measured GD request hit rate 0.21 gives
   `1-(1-0.21)^k`: low/likely/high `k=1/3/10` gives 21%/50.7%/90.5%.
   Wordoku's I5 0.20 gives 20%/48.8%/89.3%. A 3x `p/c` improvement does not imply 90% request hits.

| Default sample opportunities (D from 8/4/2 x 12) | H at p=0.5% (P) | H at p=2% (P) | H at p=5% (P) | p needed for 90% (D formula, conditional) |
|---|---:|---:|---:|---:|
| 96, 81-cell boards | 38.2% | 85.6% | 99.3% | 2.37% |
| 48, mega12/butterfly | 21.4% | 62.1% | 91.5% | 4.68% |
| 24, mega16/samurai/sohei/flower | 11.3% | 38.4% | 70.8% | 9.15% |

Zero hits in seven occurrences or two CV3 requests cannot supply `p=0`, a likely future hit rate, or an
impossibility proof. Under the likely latency model, mega16 could afford roughly four current-size search
batches inside 30 s (`floor(30/6.57)=4`, D arithmetic over a P p95), giving 96 opportunities in this
sensitivity. That is **not the existing maxAttempts contract** and requires OD-S4 and fresh evidence.

**Offerability verdict:** mega12/mega16 and multigrid Nightmare become plausible timing candidates, not
automatically offerable cells. Classic9/Wordoku still need roughly an order-of-magnitude effective-yield
increase for 90% in the simple sensitivity. Killer remains blocked on exactness/calibration, and
Greater-Than needs its separate strategy and the real 10 s criterion. No non-vacuous Hell 1 offer can be
predicted from current V results. Preserve current supported fast cells; requalify every changed cell.

### 4.5 Cumulative plan phases, in the order actually proposed

The column order S1-S6 above is by proposal number, not plan section 6's execution order.
The following is **P likely** for Nightmare, using the same parameters.

| Board | Current D | Phase 1: S3/S4, non-triggering S7 | Phase 2: plus S5a/S6 | Phase 3: plus S1/S2/S5b |
|---|---:|---:|---:|---:|
| classic9 | 4.91/5.72 | 3.12/3.63 | 1.16/1.92 | 0.584/0.971 |
| killer | 17.82/29.98 | 12.73/21.41 | 5.14/10.81 | 5.14/10.81 |
| jigsaw9 | 0.953/2.33 | 0.605/1.48 | 0.453/1.24 | 0.244/0.645 |
| greaterThan | 9.30/19.19 | 6.20/12.79 | 2.53/6.50 | 2.53/6.50 |
| mega12 | 23.72/25.24 | 13.29/14.14 | 4.80/7.17 | 1.64/2.46 |
| mega16 | 104.11/116.95 | 55.08/61.88 | 32.45/41.35 | 4.16/6.57 |
| samurai | 26.74/26.74 | 14.98/14.98 | 8.86/10.09 | 2.33/3.29 |
| sohei | 27.49/27.49 | 15.40/15.40 | 9.11/10.37 | 2.39/3.38 |
| flower | 23.07/23.07 | 12.92/12.92 | 7.65/8.72 | 2.01/2.85 |
| butterfly | 32.82/32.82 | 18.39/18.39 | 6.62/9.29 | 2.85/4.01 |

Phase 0 has 1x runtime effect. For every board/level, phase 1 is `t/(g3*g4)`, phase 2 adds the S5a
divisor in section 4.2, and phase 3 uses section 4.1. The low/high cases use the same low/high parameters;
two-attempt phase-2 divisors cannot exceed two. F rows stay single-lane. H rows use the H workload envelope.

Phase 4 does not speed a cold uncached request unless it chooses S9 instead of fresh generation; the S8/S9
formulas apply per cell. Phase 5 has the S10 Amdahl envelope and must still pass its whole-request gate.
The phase-2 mega16 likely result does not yet satisfy 30 s; sample parallelism is a meaningful dependency.

Do not divide the standing quick suite by these request factors. It includes replay, fixtures, assertions,
module loading and non-generation work, and Node tests do not automatically use browser worker lanes.
A provisional planning calculation, **P only**, reducing just the measured 225.3 s verbosity-generation
benchmarks by 3-8x gives `646.681-225.3+225.3/g = 496.5-449.5 s`. It is not a new standing-cost claim.
Likewise the GD Nightmare first test would be about 429.951/3 to /8 = 143.3-53.7 s under that narrow
assumption; validation overhead and changed hit paths require fresh accounting.

## 5. Measurement phase and gates

The measurement phase should confirm or refute the actual parameters, not merely demonstrate a fast seed.
No such measurement was run here.

| Measurement | Required additions / precise outputs | Estimate it tests |
|---|---|---|
| Freeze boundary | Record MS18e engine/catalogue/rating/cache identities, attempts, 256 winner or successor, target policy, chain windows and offered cells; include cold and warm cache conditions | Whether any current-catalogue baseline transfers at all |
| SM1 | Per request, attempt and sample: stage time, oracle kind, calls, checks, accepted/refused counts by reason, unique/unknown counts, canonical ratings, local proposals, sample and keeper exact hits, first exact ordinal; per-finder calls/hits/time with instrumentation overhead control | `f`, `g3`, the 1,296 upper-count story, local residual and actual `p/c` |
| SM2 | Paired seeds on the frozen code, no successful-seed filtering. Separate S1-only and S1+S2; measure re-derived deduction count, initialisation, rejected-floor fixpoint, DFS cost, frontier epoch/size, full-solve success, in-band and required shares; compare S2 early exits with full reference floors | `r1/r12`, exact-hit tradeoff, whether increased opportunities justify OD-S4 |
| SM2 population | Include mega16 explicitly in the stated 10x gate, all four multigrids, Killer Hard/Expert/Nightmare, sign strategy separately, coarse symmetry and non-vacuous Hell 1. Forty requests is a start, not a precision estimate of very rare p | The classes borrowed from samurai/classic9 and the H envelope |
| SM3 | Profile Jigsaw Expert seed 1111 through buildModel, grid, extraStructure, oracles, safety count, rating and local search; bounded diagnostic ownership; preserve the historical total | Attribution and usefulness of S7, not a guessed tail reduction |
| SM4 | Exact step/finding/count/rating equality, including capped budgets immediately before/after a deduction, candidate-state restoration, every variant and allowed set, trace off/summary/full; measure added invalidation cost | S3/S4 correctness and the small-board slowdown side |
| SM5 | 1/2/4 lanes, slow early/fast late tasks, keeper/sample ties, hooks, crashes, cancellation, cold start, trace transport, peak memory, discarded work and main-thread mode. Add a real browser comparison | `pm/pp`, active-vs-wall budget effects and pool identity |
| Qualification follow-up | Agree whether qualification remains serial CPU latency or measures the production per-request pool. Do not quietly reuse `qualify.js`'s multi-request concurrency as proof of S5 | Which after column can be used against 30/10 s |
| Stock/bank pilot | Cache-hit latency and hit ratio by actual user request keys; battery/idle cancellation; bank exact acceptance, compatible options and independent roots; retained replay provenance | S8/S9's missing numbers and finite availability |

SM2's `p/c >= 3x` gate is undefined or unstable when the baseline has zero observed exact samples.
Report absolute verified hits per CPU second and per wall second, request completion/hit rates, confidence
intervals with clustering by grid/seed, and a non-inferiority gate for already-good cells. Do not count
speculative unconsumed hits as user availability. A capped/incomplete solve is never “floor stuck”.

**Order recommendation:** keep the frozen-catalogue prerequisite. Run SM1/SM3 and the small S1/S2 feasibility
prototype early, before committing to the large S3 rewrite. S4 and genuinely equal local optimisations can
land independently. Establish version/storage/replay policy before S6 or any triggered S7. Then S5a, followed
by versioned S1/S2/S5b and the real per-cell qualification. Refresh E once for the new path, keeping old
compatibility artefacts. S8 should extend the existing cache after identity is safe. S9 and S10 remain gated.

The current order is therefore reasonable at the strategic level but needs two fixes: “non-triggering on
the corpus” cannot make S7 universally identical, and S6 cannot precede a concrete old-recipe/checkpoint
contract. The most uncertain availability lever, S1, should be feasibility-tested before the largest
performance engineering commitment.

## 6. Questions for Fable

1. **IG-S-ASTRA-Q1.** Should S2's floor tests explicitly disable uniqueness-assuming techniques until the
   weakened puzzle is independently proved unique, even though the canonical floor includes them? If so,
   how should the frontier distinguish “stuck without the uniqueness assumption” from a true floor frontier?
2. **IG-S-ASTRA-Q2.** Which frontier semantics should the design adopt: evaluate at the recorded snapshot,
   or revalidate against the final parent? What deterministic total budget covers failed floor tests,
   additional uniqueness checks and the ladder-of-floors passes, beyond `K_F` full solves?
3. **IG-S-ASTRA-Q3.** Is S3's “identical” gate intended to preserve the existing check-count cap boundaries
   as well as unrestricted traces? If preserving virtual checks is too costly, may that portion move under
   the new generator version rather than being described as an equal-result optimisation?
4. **IG-S-ASTRA-Q4.** May S7 move to the versioned phase, with a total restart ceiling and explicit unknown
   uniqueness outcomes? The current phase-1 corpus non-trigger condition does not preserve other seeds.
5. **IG-S-ASTRA-Q5.** Does OD-S2 also authorise changing 120 s active generation to 120 s request wall time?
   Separately, should the 10/30 s qualification contract measure the new per-request pool, or remain the
   serial pipeline that the current qualifier actually times?
6. **IG-S-ASTRA-Q6.** What is the intended treatment of existing history entries whose puzzle was never
   persisted or has been evicted? Is retaining the old engine required, or may those entries explicitly lose
   reproducible generation replay? “Keep the stored puzzle” does not cover this population.
7. **IG-S-ASTRA-Q7.** Should S8 be rewritten as an extension of `SG.cache` and its current worker-only
   pre-generation controller, with refreshed cost admission, rather than a second stock implementation?
   Which existing explicit-seed and replay-consent semantics may change?
8. **IG-S-ASTRA-Q8.** For S9, what minimum independent bank diversity and option coverage would the owner
   accept, and what should happen when that finite set is exhausted? May the transform list be restricted
   to geometry-preserving automorphisms rather than the stated arbitrary Killer/Greater-Than row moves?

No new offer, algorithm version, timeout exception, fixture update or owner decision is asserted here.
