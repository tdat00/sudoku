# Improve generating: cross-review of Opus's analysis

SA2, gpt-6-astra. 2026-11-14. Phase 2, against the supplied `f7be90f` worktree.

Reviewed `docs/improve-generating/claude-opus-5.5/1-analysis.md` and `1-speed-summary.md`, my phase-1 reports,
the relevant code and committed evidence. No engine, test, generation, benchmark or timing experiment was
run; no timing lock or git operation was used. Arithmetic only reads existing evidence. Phase-1 files
remain unchanged. This report supersedes my phase-1 *planning judgement*, not its historical measurements.

**Measured (M)** means existing observations; **Derived (D)** is arithmetic on them; **Projection (P)**
requires a stated assumption. Code constants are identified separately. Proposed times are not measurements,
confidence intervals, qualification passes or promises of an exact puzzle.

## 0. Reconciled judgement

Opus is substantially right about the cause of the speed-estimate disagreement. My likely S1+S2 sample
divisors were too optimistic, and I divided the local continuation by a pool width it cannot use on
two-attempt boards. His proposal/ordinary sample split is a valuable addition supported by the saved segments.

For a comparable, fixed-default-work mega16 Nightmare request, I would now plan around **12 s median and
16 s tail scenario**, rather than my 4.2/6.6 s. The explicitly parameterised range is approximately
**6-44 s median, 8-65 s tail**, not a probabilistic interval. Opus's 12/14 s sits inside it. My original
approximately 25x headline should be retained only as an optimistic hypothesis needing a prototype,
not the likely outcome.

There are also material corrections to Opus:

- The three named guard families are not all charged by logical finders. The accumulated Killer repair
  meter follows DFS-only analyses; S3 alone does not change it. S10's DFS kernel can.
- `replay.js:180` checks a special reconstructed Killer log; it is not a general requirement that every
  replay start with `random`. New frontier passes would currently be mislabelled as random, not necessarily
  rejected. Replay integration remains necessary.
- “S1 must raise p by 5-8x” is conditional modelling, not a result derived from measured per-sample p.
  The large-board p values are assumed or inferred from a very small selected attempt population.
  The known mega16 exact hit came from local search, so multiplying its per-attempt hit rate by a
  per-sample frontier gain is not justified without another assumption.
- A guard not triggered by regression/qualification seeds still changes other seeds. S7 needs an algorithm
  identity when it changes behaviour.
- Arbitrary Killer/Greater-Than row permutations do not preserve their connected-cage/adjacent-sign
  presentation contracts. The unconditional approval of the S9 transform list needs revision.

Both reports agree on the main safety obligations: canonical requiredness/exactness, virtual check
accounting or a versioned guard change, history migration, pool-qualified measurement, real checkpoint
ownership, and measuring on the final difficulty-v3 catalogue.

## 1. Evidence checks that matter to the disagreement

### 1.1 The sample split is confirmed

Source: `docs/difficulty-v3/evidence/MS05r5p/{G13,mega12-nightmare,mega16-nightmare}.json`,
`segments` grouped by `(attempt,sample)`, summing `dig`, `rate` and `tune`. Odd/even semantics are verified
in `generator/js/engine/digger.js:1918-1925`.

| Saved request | Trace (M) | Proposal samples: count, mean (D) | Ordinary samples: count, mean (D) | Proposal / ordinary / local seconds (D) |
|---|---|---:|---:|---:|
| Samurai G13, seed42 | summary | 12, 249.668 ms | 12, 1,039.731 ms | 2.996 / 12.477 / 6.066 |
| mega12 Nightmare, seed3 | off | 24, 42.069 ms | 24, 782.604 ms | 1.010 / 18.782 / 3.971 |
| mega16 Nightmare, seed3 | off | 12, 464.797 ms | 12, 7,614.997 ms | 5.578 / 91.380 / 10.252 |

These are not three new runs. They reproduce Opus's principal decomposition. In particular:

- D: proposal/ordinary cost ratio is about 1:18.6 for mega12 and 1:16.4 for mega16.
- D: mega16's ordinary samples are about 85.2% of its 107.225 s request.
- D: replacing *both* kinds means comparing a frontier sample with their weighted average, not just
  replacing each expensive ordinary sample with a cheap floor test.
- G13 is summary-traced, not directly the same trace population as the two mega profiles.

### 1.2 Counts are upper bounds or cost equivalents, not observations

`digger.js:605,751-825,853-911` confirms the 0.47 clue hand-over, `min(B,candidates)` pool, and permanent
refusal pruning. For ordinary 180-degree symmetry and upper-level defaults, a tighter Stage-B-only ceiling is:

```text
h approximately remaining groups at hand-over
Stage-B evaluations <= sum(j=1..h) min(B,j)
```

This gives approximately 190, 459, 555 and 588 for 81, 144, 256 and 369 cells. Opus is right to replace
the plan's loose approximately1,296 count with this tighter argument.

Two qualifications:

1. These are **Stage B** ceilings, not all solves of the sample. Stage A adds up to roughly N/2 oracle
   calls; clue floors and refusals usually reduce both bounds. Non-default symmetry changes the argument.
2. `7.615 s / 21.6 ms approximately353` is a **rating-cost equivalent**, not an oracle-call count.
   A final canonical rating, an easy restricted oracle and a failed floor fixpoint have different costs.
   “350-500 solves” is consequently a projection, not a measured count.

Opus's classic9 regression gives a conditional estimate of about2.6 s sample work in a4.9 s request,
against my assumed65% sample share. Its local ratings/proposals are present in R5, and the current code
really performs both. I have not independently refitted the43-row regression. I use approximately53%
as a **P component-share estimate**, not a newly measured stage split. Collinearity, seed effects and
the altered allowance remain limitations of attributing time through a regression.

## 2. Disagreements, assumptions, checks and disposition

### 2.1 S1/S2's likely saving

| Item | My phase1 | Opus phase1 | Code/evidence check | Disposition |
|---|---|---|---|---|
| Average sample divisor, classic9 | 5x likely | 0.8x | Existing proposals are cheap; S2 ends successful tests early but not rejected floor fixpoints. No prototype timing exists | My5x is not a justified likely value. Use0.6/0.9/1.5 low/likely/high benefit for planning |
| mega12 | 5x | 1x | Existing mean is approximately0.412 s, including very cheap proposals. Multiple failed floors/DFS checks can consume that saving | Use0.7/1.2/1.6; time-neutral S1 is plausible |
| mega16 | 8x | 2.5x | Existing mean is4.04 s, but half the new samples replace0.465 s proposals; full floor refusals and verification remain | Prefer Opus's order of magnitude; use1.2/3/4, not8 as likely |
| Multigrids | 5x | 1.3x | G13 mean0.645 s; approximately28% local continuation. There is no per-kind profile for the other multigrids | Use0.7/1.5/2.3, explicitly transferred from G13 |

The remaining dispute cannot be resolved from code alone: neither report measures how many frontier
groups fail, how expensive their floor fixpoint is, or how often S2 re-derives a removed group quickly.
Opus's “about half the groups” and my original large divisors are competing assumptions, not facts.
SM2 must measure each sample kind, successful/failed floor tests and DFS separately.

There is a useful new control in Opus Q1: compare with proposal-only sampling. It is cheaper, but the
current records do not show that it has competitive exact yield. It is a diagnostics comparison, not a
reason to remove ordinary samples from production now.

### 2.2 Serial local search and Amdahl accounting

**Opus is right; I revise my model.** `generateAttempts:1936-1948` runs one local continuation per attempt.
`localSearchSteps` evolves one state sequentially; its proposal acceptance depends on the preceding move.
S5b parallelises samples, not those moves. On mega16/Samurai/Sohei/Flower, two default attempts allow at
most two simultaneous local searches, even with four workers.

For mega16, my model gave the10.252 s residual the approximately2.8x full pool benefit. A conservative
effective attempt divisor is approximately1.7x, with a stricter tail scenario. This matters even if
frontier samples become very cheap. Amdahl accounting must also leave proposal bookkeeping, DFS,
initialisation and message work outside a purely logical-finder divisor.

Opus's formula has a smaller over-credit in the other direction: applying `f3*f4` to the logical fraction
of *local search* gives S4 credit where canonical `rateCounted` must still finish. S4 applies to bounded
removal oracles, not canonical local ratings. The reconciled model below gives separate sample/local
divisors and credits S4 only inside the sample-side assumption.

**Additional shared uncertainty:** the256 allowance begins only after the first shallow local state.
`digger.js:1028-1074` does not cap all local work at256 ratings. A new frontier may enter local search
off-band and reach the1,024-rating attempt ceiling instead. Both phase1 models held local cost fixed;
that needs SM2's `firstShallowAt`, cap reason and continuation-cost distributions.

### 2.3 S3/S10 and the “three guards”

The general conclusion is confirmed, and was already in my S3 review: equal unbounded Findings do not
prove identical capped generation. The precise dependency is:

| Guard/code | What increments it | S3 logical dirty scopes | S10 kernel change |
|---|---|---|---|
| `OBJECTIVE_STEPS=100000`, `digger.js:659,711-728` | Solver/finder `budget.check()` calls | Affected unless virtual checks/cap boundaries are preserved | Chain kernel can affect it |
| `ANALYSIS_NODES=30000`, `killer.js:469,483-490,836-854` | `nodeSlice` checks; used by both DFS analysis and logical layout ratings | Logical-rating uses are affected | DFS and chain uses can be affected |
| `REPAIR_NODES=250000`, `killer.js:471,695-745` | The repair loop's own meter, passed to `analyseSteps` | **Not directly affected** by S3 | DFS kernel can affect it |
| `UNIQUE_NODES=200000`, `digger.js:653`; DFS guards elsewhere | DFS/propagation check sequence | Not changed merely by skipping logical finder scopes | Must also be preserved |

`analyseSteps:507-524` calls `SG.dfs.solve` and `countSolutions`, not `logicalSolver`. The layout search
has a **different** `meter` at `killer.js:836`. The repair meter is not the accumulation of its later
logical ratings. `dfs-solver.js:112-195` confirms the independent DFS/propagation path.

Thus Opus is right about the identity obligation, but “three guards count finders' checks” overstates
S3's current reach. For S10 the wider set of DFS and propagation charges is genuinely in scope.
Changing guards to another unit is a versioned behaviour change, not a way to retain the identity claim.
Compare failure boundary/outcome as well as total counts; preserving only a final total is insufficient.

### 2.4 S4 and replay

We agree that an early bound can change a `techniques` rejection into `tooHard` while preserving the
boolean refusal. `techniqueOracle` checks `report.solved` before classifying. Regression puzzle hashes
therefore do not cover the whole log/replay contract.

Opus adds a useful integration finding, but its claimed hard parser restriction is incorrect:

- `replay.js:171-194`, `isRebuilt`, recognises a synthetic **Killer** log. Its first-pass `random`
  check is not a general replay admission rule.
- `moves:321-329` accepts a string pass name.
- `moves:368-379` classifies accepted cell removals as `guided` only for that literal pass; other
  cell passes are treated as `random`.

A frontier pass could therefore reconstruct the final board yet tell the wrong generation story.
Correct phase labels, summary/trail meanings, tests, five wires and fourteen analyses still need work.
This is a semantic replay risk, not the stated unconditional rejection at line180.

### 2.5 Fast cells, Killer and Greater-Than

**Killer reach: Opus is right and sharpens my scope assumption.** `digKiller:1010-1018` calls
`SG.digger.digStage`. Replacing that function reaches Killer's cell stage unless explicitly excluded.
It does not replace `repairLayoutSteps` or `searchCagesSteps`, and structure can dominate. My “no cage
frontier port credited” was a conservative estimate, not proof that S1 cannot run there.

Keep Killer explicitly gated until its cell-stage and structure-stage effects are separately measured.
Both reports' whole-request kernel gains here remain projections. Zero Hard hits do not prove that
calibration is the only possible solution or authorise a weight change.

On already-good Hard-Master/Jigsaw cells, I retain the existing strategy unless a non-regression gate
shows a benefit. Opus agrees this needs an explicit level/cell scope. A four-worker pool cannot deliver
a4x median gain on a request already ending in its first short sample; startup and ordered early stopping
matter. His2-4x fast-cell estimates are possible upper cases, not established likely results.

Greater-Than really uses the separate `signs` strategy. Its lower projected wall time comes from kernels
and attempts, not S1. Both estimates can put Nightmare's19.192 s p95 under10 s, but this depends on how
qualification measures the pool. Without that decision the synchronous qualifier gets no S5 benefit.

### 2.6 Availability and the claimed required p multiplier

The measured facts agree: classic9 GD21/100, Wordoku I5 4/20, deep mega12/mega16 0/7, the small multigrid
CV3 cohorts0/2. Repeated deep/CV3 seeds are not new independent trials.

Opus uses `pa = 1-(1-Q)^(1/A)` and then `pa' = 1-(1-pa)^g`. The arithmetic is valid **conditional on**
identically distributed independent attempts and a gain acting on the entire attempt. The probability
interpretation is P, not M or unconditional D.

Three assumptions limit its conclusions:

1. Mega12's2% and the multigrids'3% attempt probabilities are explicitly assumed. The selected mega16
   one-hit/twelve-attempt reconstruction is extremely thin and includes a known successful diagnostic.
2. An attempt includes local search. The saved mega16 hit at attempt6 came from that continuation.
   A factor applied to frontier sample success need not multiply the unchanged local-search hazard.
3. Fitting more attempts with `budget / median-time-per-attempt` does not establish a p95-budget pass.
   Additional attempts can have different full grids, cap binding and longer ordered stragglers.

For illustration only, Q=0.21, A=8 gives effective pa approximately2.9%. Seventy-three attempts produce
`1-0.79^(73/8) approximately88.4%` in that model. It does **not** make them fit10 s at p95. With the
reconciled default-request tail1.76 s, a crude linear-work calculation admits
`floor(10*8/1.76)=45` attempts and predicts only about73.4%. Neither is a measured capacity.
The UI currently exposes1-20 attempts (`controls.js:201-209,998`, `store.MAX_ATTEMPTS`); the backend
accepts a larger explicit integer. A64/73-attempt product policy needs the OD-S4 and UI/history decisions.

Likewise, `g_needed=ln(0.1)/(Anew*ln(1-pa))` gives about6.6 for pa=1/12 and four attempts, but that is
an assumption-specific scenario. It does not show that “S1 needs a measured6.6x per-sample improvement”.
Keep the proposed SM6 attempt-budget experiment, not the asserted offer decisions.

My phase1 request-opportunity sensitivity was also not a forecast. The reconciled availability verdict is:
**timing eligibility becomes plausible; exact availability remains unmeasured**. No cell is newly
offerable from either analyst's probability model. SM2 must report sample-origin and local-origin hits
separately, and the final qualification must retain requiredness and the real10/30 s budgets.

### 2.7 Nightmare's score window

Opus's narrow-window explanation is new and useful. `difficulty.js:76-116,243-280` confirms:

```text
score = round(V + P + 0.25*P*log2(1+W/P))
V = 80*E/(E+40)
```

For one Nishio, P=1700 and W>=1700; the minimum technique term is **2125**, not2135
(the report's `435` contribution should be425). For illustrative V=46-63, the exclusive rounded2400
edge permits total W of approximately3100-3236, leaving about1400-1536 beyond Nishio.
That supports the qualitative “one tier use and little else” diagnosis.

However a parent's floor proof is not the child's canonical proof. Removing a clue can change deductions
and their order, so two forcing chains in the parent do not prove the child must pay for those same
chains plus Nishio. A cheap-floor policy is worth comparing, not a theorem.

MS07's long-chain tier can lower the required peak. The full later catalogue also adds other techniques
and changes paths. Neither the old narrow score window nor its geometric widening establishes a numeric
hit-rate multiplier at the feature's frozen start.

### 2.8 Guard, cache, bank and browser conclusions

- **S6:** both recognise a deliberate device-dependent exception. “Answers with a puzzle” still needs a
  completed unique checkpoint. Worker termination cannot recover private keeper state, and cancellation
  must not be reinterpreted as fallback acceptance.
- **S7:** agreeing on the tested corpus is not universal identity. A total restart budget is needed;
  endlessly restarting a bounded grid search remains unbounded. The325.313 s Jigsaw stage is still unknown.
- **S8:** both correctly identify existing pre-generation and stale `COSTS`. Refreshing it in this later
  feature is sensible; that does not authorise an unrelated change during ongoing difficulty-v3.
- **S9:** disagree with “all listed transformations are validity-preserving”. Swapping rows1 and2 inside
  a Sudoku band sends a cage/sign joining rows0 and1 to rows0 and2. Sudoku units are preserved, but the
  cage becomes disconnected and the sign endpoints non-adjacent. See `killer.js:212,528` and
  `greater-than.js:21,132`. Restrict automorphisms or validate these contracts. Bank versioning is confirmed.
- **Browser:** Opus's desktop1.2-2x/phone3-5x factors are assumptions without Sudoku measurements. They
  cannot make “fits120” a measured conclusion, especially for future Hell or main-thread `file://`.
  Slow/guard-censored outcomes must remain visible.
- **Implementation size:** our S1/S2/S3/S5 estimates largely overlap. His S10 “300 lines plus module”
  and mine500-1500 including implementation/glue are different scopes, not a genuine numerical conflict.
  Neither is an implementation quote before the equality contract is fixed.

## 3. Risk and question crosswalk

“New” means useful detail absent from my phase1, not necessarily a new code defect.

| Opus risk/question | Status against my review | Reconciled action |
|---|---|---|
| Q1: per-kind baseline/proposal-only control | **Confirmed; new quantitative decomposition** | Preserve proposal/ordinary/local strata; treat cost equivalents as projections, not calls |
| Q2: cheap versus full floor | **New, retain as experiment** | Correct425 term; compare on the final catalogue, do not transfer the parent's proof cost literally |
| Q3: uniqueness-assuming floor | **Confirmed**, my Q1/Q2 | Disable circular assumptions or prove the weakened puzzle unique before using them |
| Q4: virtual checks/guard unit | **Confirmed with attribution correction**, my Q3 | S3 affects logical objective/layout checks; accumulated repair is DFS-only. S10 covers the wider set |
| Q5: S4 log-only change | **Confirmed**, my S4/E risk | Decide log identity separately from puzzle hashes; version or explicitly accept new log semantics |
| Q6: qualification/pool resource protocol | **Confirmed**, my Q5 | Fix per-request pool width and total concurrency; do not oversubscribe qualifying jobs |
| Q7: history/version home | **Confirmed**, my Q6 | Migrate or retain an old path; a20-entry evictable result cache cannot back100 history entries |
| Q8: more attempts before S1 | **New measurement option; disputed numerical promise** | Retain SM6/OD-S4 question, not88% within p95 or automatic offering; include UI's current20 ceiling |
| Q9: scope S1 to failing cells | **Confirmed**, my classF policy | Explicitly protect working cells, or extend SM2 to every changed level |
| Q10: Killer reaches generic dig | **Confirmed; correction to overly broad exclusion** | The code reaches it. Deliberate opt-out or a measured Killer-specific frontier gate is required |
| Q11: existing pool/COSTS | **Confirmed**, my Q7 | Extend one cache/controller, preserve foreground priority/seed/replay consent |
| Q12: timeout storage | **Confirmed**, my S6/history risk | Store complete puzzle/provenance if retained; do not call a timed prefix the canonical seed result |
| Replay starts with random | **Disputed premise; integration risk confirmed** | The check is Killer `isRebuilt`; general new passes risk wrong labels, not necessarily parser rejection |
| S9 transformations and subsecond service | **Disputed as blanket claims**, my Q8 | Validate geometry/options; bound trials; measure rating/lookup cost and finite bank diversity |
| S7 non-triggering corpus exception | **Disputed**, my Q4 | New behaviour on any admissible seed needs an algorithm identity |
| Same seed/final rating/E | **Confirmed** | Keep old compatibility artefacts and the canonical rating separate from generator/log versions |
| Local continuation always costs its old256 block | **Additional shared uncertainty** | Record off-band entry, first-shallow ordinal and possibly1024-rating continuation after S1 |

The common measurement priorities are SM1/SM2 early on the frozen catalogue, budget-boundary parity in
SM4, pool/cancellation/ordered-merge tests in SM5, and an independently scoped OD-S4 experiment.
No new timing is requested as part of this cross-review.

## 4. Reconciled numerical model

This model is an explicit planning scenario, not an assertion that the changed search preserves a fixed
workload or hit rate. It deliberately corrects my phase1 full-pool treatment of local continuation.

For current median or p95 `t`, sample fraction `f`, sample-cost divisor `r`, effective sample/local
solver divisors `Gs/Gl`, sample pool `Ps` and attempt/local pool `Pl`:

```text
First phases (S3/S4/S5a):
  epsilon + t * (f/Gs + (1-f)/Gl) / Pl

All fresh-generation phases (S1-S7, including S5b):
  epsilon + t * ( f/(r*Gs*Ps) + (1-f)/(Gl*Pl) )
```

S4 is included only in `Gs`; it gets no canonical-local-rating credit.
Warm coordination allowance epsilon is P0.05 s for a median,0.10 s for a tail.

| Parameter | Low benefit P | Likely P | High benefit P | Basis |
|---|---:|---:|---:|---|
| Gs, effective whole sample-side improvement | 1.1 | 1.45 | 2.0 | Amdahl discount for DFS/bookkeeping and unoptimised chains; not a measured finder gain |
| Gl, effective local continuation improvement | 1.0 | 1.3 | 1.7 | Canonical ratings plus sequential proposals/counts; no S4 |
| Ps, median / tail | 2 /1.5 | 3 /2.5 | 3.5 /3 | Four workers, lower gain for ordered tails |
| Pl for two attempts, median / tail | 1.2 /1 | 1.7 /1.5 | 2 /1.8 | Never more than two simultaneous continuations |
| Pl for four/eight attempts | same as Ps | same as Ps | same as Ps | Sufficient independent attempts, not8 workers |
| r, classic9/Wordoku | 0.6 | 0.9 | 1.5 | Includes cheap current proposals and failed new floors |
| r, mega12 | 0.7 | 1.2 | 1.6 | Frontier may be roughly time-neutral |
| r, mega16 | 1.2 | 3 | 4 | Expensive ordinary samples supply the opportunity |
| r, multigrid | 0.7 | 1.5 | 2.3 | G13 proxy, weak transfer to other layouts |

Fractions: `f=0.904` mega16 and0.832 mega12 are D from r5p;0.718 is D for G13 and P for other
multigrids;0.53 is P from Opus's classic9 fit and transferred to Wordoku. Uniformly scaling a p95 remains
a tail sensitivity, not a new distribution. With only two CV3 requests, displayed median/p95 are both
the upper observation.

**K/G model:** leave the frontier off pending a separate gate; use a P whole-request median divisor4
and tail divisor3 for the combined equal-kernel/attempt work, plus epsilon. Range: median divisors2-6,
tail divisors1.5-5. This covers the two reports' competing unprofiled hook assumptions.

**Protected fast/Jigsaw model F:** keep its search/lane; whole-request divisor1.5 likely,1-2.5 range.
This is not a claim that extra workers speed a first-sample hit. Jigsaw's maximum tail is excluded from
this ordinary-latency model until SM3.

“All phases” in the table means a **cold, fresh, non-bank request after the feature**, with optional
S10 giving no unconditional extra credit: it must meet its later gate. S8 cannot speed that miss.
S9/stock hits are separate rows because they have different distributions and identity/diversity contracts.
S7 is credited with no numerical ordinary gain before its offending stage is known.

### Source keys for the final table

- **R5:** `docs/difficulty-v3/evidence/MS05r4/selection.json` and the selected256 ledgers:
  classic9 Nightmare4.908/5.719, Master0.057/0.123.
- **D14:** `docs/difficulty-v3/evidence/MS05r5m/records/*.json`, reconciled seven occurrences per mega.
- **B3-I/B3-C:** `docs/difficulty-v3/evidence/MS05b3/outcomes.json`, I5 or CV3 `requestMs`.
- **P5:** saved r5p segment fractions in section1; **R:** section4 reconciled component formula.
- **K/G/F:** the explicit model variants immediately above. Every after/range number is P.
- **V:** vacuous current Hell1, not a measurement of the future non-vacuous tier.

Ranges below are high-to-low benefit **median / tail-scenario ranges**, not guarantees. They omit a
prototype that makes availability worse or never returns; that remains possible. Confidence “low” concerns
the future seconds, not whether the quoted baseline was recorded. No offers change on these projections.

## 5. Reconciled before/after speed table

| Cell | Today median/p95, seconds (D from M) | After first phases S3/S4/S5a (P) | After all phases, fresh request (P) | Range after all: median / tail (P) | Confidence and verdict | Source of current; source of projections |
|---|---:|---:|---:|---|---|---|
| classic9 Nightmare | 4.91/5.72 | 1.24/1.76 | 1.31/1.86 | 0.69-3.17 /0.96-4.95 | Low; time plausible,21/100 exact remains unresolved | R5; R with fitted f0.53 |
| Wordoku Nightmare | 4.96/5.49 | 1.25/1.70 | 1.32/1.78 | 0.69-3.20 /0.93-4.76 | Low;4/20 exact, no availability promise | B3-I; R, classic9 share proxy |
| mega12 Nightmare | 23.72/25.24 | 5.61/7.20 | 4.85/6.23 | 2.48-14.86 /3.12-21.11 | Low; likely approximately4.9x, exact0/7 | D14 +P5; R |
| mega16 Nightmare | 104.11/116.95 | 42.75/54.47 | 11.78/15.58 | 6.35-44.03 /8.17-64.72 | Low; likely approximately8.8x;30 s only likely, exact0/7 | D14 +P5; R, two local lanes |
| Samurai Nightmare | 26.74/26.74 | 11.25/12.79 | 6.40/7.50 | 3.46-18.80 /3.96-24.26 | Low;0/2 exact; n2 tail not a population p95 | B3-C +G13/P5; R |
| Sohei Nightmare | 27.49/27.49 | 11.56/13.15 | 6.58/7.70 | 3.56-19.32 /4.06-24.94 | Very low transfer;0/2 exact | B3-C; R, G13 proxy |
| Flower Nightmare | 23.07/23.07 | 9.71/11.05 | 5.53/6.48 | 2.99-16.23 /3.43-20.94 | Very low transfer;0/2 exact | B3-C; R, G13 proxy |
| Butterfly Nightmare | 32.82/32.82 | 7.84/9.45 | 6.04/7.28 | 3.07-19.98 /3.62-26.67 | Very low transfer;0/2 exact | B3-C; R, four attempts/G13 proxy |
| Killer Hard | 4.75/6.47 | 1.24/2.26 | 1.24/2.26 | 0.84-2.43 /1.39-4.41 | Low;0/20 exact still blocks | B3-I; K/G, no frontier credit |
| Killer Expert | 10.81/14.74 | 2.75/5.01 | 2.75/5.01 | 1.85-5.46 /3.05-9.93 | Low;1/8 exact still blocks | B3-I; K/G |
| Killer Master | 12.45/23.36 | 3.16/7.89 | 3.16/7.89 | 2.13-6.28 /4.77-15.68 | Low;2/8 exact;10 s not robust | B3-I; K/G |
| Killer Nightmare | 17.82/29.98 | 4.51/10.09 | 4.51/10.09 | 3.02-8.96 /6.10-20.08 | Low;1/8 exact; likely tail still near10 s | B3-I; K/G |
| Greater-Than Expert | 2.40/14.20 | 0.65/4.83 | 0.65/4.83 | 0.45-1.25 /2.94-9.57 | Low; preserved hits, pool qualification decision needed | B3-I; K/G |
| Greater-Than Nightmare | 9.30/19.19 | 2.37/6.50 | 2.37/6.50 | 1.60-4.70 /3.94-12.89 | Low; time-only candidate, not S1 gain | B3-I; K/G |
| Jigsaw Expert, ordinary requests | 0.917/2.438; max325.313 | 0.611/1.625 | 0.611/1.625 | 0.367-0.917 /0.975-2.438; extreme maximum unknown | Low; S7's tail benefit cannot yet be priced | B3-I; F; separate S-AV11 |
| Jigsaw Nightmare, protected search | 0.953/2.325 | 0.635/1.550 | 0.635/1.550 | 0.381-0.953 /0.930-2.325 | Low; preserve already-good I5 hits | B3-I; F |
| classic9 Hard-Master, cell-statistic ranges | 0.028-0.116 /0.071-0.155 | 0.019-0.077 /0.047-0.103 | same | 0.011-0.116 /0.028-0.155 | Low gain estimate; already-fast search protected | B3-C +R5 Master; F |
| mega12 Hard-Master, cell-statistic ranges | 0.065-0.170 /0.068-0.448 | 0.043-0.113 /0.045-0.299 | same | 0.026-0.170 /0.027-0.448 | Low; tiny CV3 cohorts do not qualify hits | B3-C; F |
| mega16 Hard-Master, cell-statistic ranges | 0.309-1.158 /0.309-1.158 | 0.206-0.772 /0.206-0.772 | same | 0.124-1.158 /0.124-1.158 | Low; n2 per cell | B3-C; F |
| Four multigrids Hard-Master, cell-statistic ranges | 0.093-3.047 /0.093-3.047 | 0.062-2.031 /0.062-2.031 | same | 0.037-3.047 /0.037-3.047 | Low; n2 per cell, no pooled percentile intended | B3-C; F |
| Hell1, all requested boards | 0.038-5.246 /0.156-5.246 V | Future tier unestimated | Future tier unestimated | Unknown; Nightmare x1-4 is sensitivity only | No confidence in final-tier availability | B3-I/C V; no non-vacuous baseline |
| Matching S8 stock hit / S9 bank-served request | No common measured latency | Not served by early phases | Lookup epsilon, or bounded trials x canonical-rating cost +validation | Not measured; finite content/options required | No seconds/p95 claim; not interchangeable with fresh generation | Existing cache/code, P5 rating-cost proxies; S8/S9 gates |
