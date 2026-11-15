# Cross-review of Astra's plan version 2 analysis (Sudoku), phase 2

Reviewer: Opus (claude-opus-5.5), 2026-11-15.

**Compared.**

- Astra: `docs/improve-generating/gpt-6-astra/3-plan-v2-analysis.md`.
- Mine: `docs/improve-generating/claude-opus-5.5/3-plan-v2-analysis.md`.

**How disputes were settled.** Every disputed fact was checked against `rating-v3` at `7ab77b1`, through
`git show`, read only: `core/js/engine/combo-table.js`, `dfs-solver.js` and `tech-chain.js`, and
`generator/js/engine/digger.js` and `pipeline.js`. The MS07e records were also read. No runs.

## 1. Where we differ, and the proposed joint position

| # | Topic | Opus (phase 1) | Astra (phase 1) | Settled against | Verdict on my side | Joint position |
|---|---|---|---|---|---|---|
| 1 | K5: does the mechanism exist? | park until S-OD7's calibration; mask speed-ups that keep the node order could go with phase 1 | drop as stated: combination masks, changed-cage propagation and fewest-candidate ordering already exist | `combo-table.js:4-5, 37-50` builds `table[size][sum]` masks ("what makes Killer affordable"); `dfs-solver.js` picks the cell with the fewest candidates (`bestCount`, popcount) | **I was wrong** to treat K5 as new | **drop K5 as stated.** Any further Killer search work needs a Killer profile and a distinct mechanism. Stronger shared propagation can change Nishio findings too, so it may be a rating change. Killer's hits wait for S-OD7 |
| 2 | K2's gain | the copy is O(n) per trial against a local propagation: x1.2 to 2 on the nishio kernel | the per-depth buffers are already reused; if copying is 2 to 20 % of Nishio time, the kernel gains x0.95 to 1.22 and the request at most about 1.17 | `tech-chain.js:643-653` (`r.pool[level]`, `cloneState(base, trial)`): no allocation per trial, an O(n) copy | partially: my range was a guess without a profile | no bankable factor. Measure copy bytes and time with a V8 profile (no adapter needed), and prototype only if the copy is material. Shared `SG.constraints` touches both apps and every finder |
| 3 | K1 | park; depth-1 trials cacheable with an exact virtual charge; depth 2 never hits | park; full read footprints invalidate depth-2 entries; never cache a cap as a negative | `tech-chain.js:643-683` | agree | park until MS08 to MS16 land and a frozen profile shows a depth-1 share worth caching |
| 4 | K4 | park until difficulty-v3's finders change Hell 1's floor | prototype the diagnostic (floor outcome, proof, disposition) on a small frozen cohort, not a filter; the proposal oracle excludes all chains, not only the tier | `digger.js:689-747` (`removalObjective`, `tierUsed`, the proposal dig below the chain group) | partially: same dependency | after the final tier is known, a small Hell 1 floor and proposal diagnostic, independent of the retired S1 screen; no filter, no speed credit |
| 5 | S5a factor for exhausted failures | 2.5 to 3.2 on 81-cell boards; Killer 2.07 to 2.65; two-attempt 1.7 to 1.9 | an illustrative 1.8 to 3.2 for eight- and four-attempt failures | report-r3 section 3: Killer's three pairs (all exhausted) 2.07 to 2.65; mega12 3.04 to 3.43; classic9 and Greater-Than up to 3.25 and 3.06 | partially | eight- and four-attempt exhausted failures x2.07 to 3.43 (the measured pair range of such cells); two-attempt boards x1.66 to 1.96; all transferred from the old source as scenarios |
| 6 | Killer Nightmare p95 | misses 5.4 to 11.2 s; slow hits 5 to 16 s | the p95 (24.9 s) belongs to an exact request; speeding only the misses leaves it; scenario 9.4 to 24.9 s | MS07e record: the three slow exact requests take 33.7, 24.9 and 13.3 s | agree | p95 scenario 9.4 to 24.9 s, conditional on the slow hits' attempts, which are unrecorded; no promise of 10 s |
| 7 | Hell 1's route and S9 | (a) wait for the finders, then (c) bank design if below 90 % on the frozen catalogue | wait; "before the finders arrive" is incoherent for a feature that starts after MS18e | plan section 1 constraint (start after MS18e) | agree with the sharper logic | no Hell 1 bank design before the frozen catalogue; then OD-S3 with a priced root supply and verification |
| 8 | Recording for the next measurement | `result.attempts`, the hit's attempt, per-attempt times, `capHit`, `budget.exceeded` | the same, plus `timings` and `work` (already exposed, `pipeline.js:253-266`), samples' origin, quotas, cold and ready wall, host CPU, outer `jobs` and inner width apart, finder calls and clone cost | `pipeline.js:253-276, 334` | agree; Astra's list is fuller | the qualifier and the frozen baseline keep `attempts`, `timings` and `work` first, before invasive observers |
| 9 | Over-budget split | eight cells listed | eleven, with the control-flow proof that a non-exact completed request exhausted its attempts (`digger.js:2060-2184`) | MS07e records | agree | use Astra's table (hyper, jigsaw and sohei Hell 1 added) |
| 10 | The qualification protocol with a pool | a new owner decision: report `--jobs` 4 and 1, gate on `--jobs=1` with width 4 | IG-S-Q01, Q02 and Q13 already decide pooled qualification with serial reporting; `--jobs=4` is not a pool | IG-S-Q02's answer (a pool of width 4, the serial figure beside) | partially: Q02 fixes the inner width, not the outer `jobs` | keep IG-S-Q02 and ask Fable only about the outer `jobs` (merged IG-S-Q22) |
| 11 | v2 body items Astra adds | not flagged | S5a's ceiling is `min(4, A)`, not "up to 8"; S6's "no empty answer" needs a validated checkpoint; partial S3's range is medians 0.91 to 1.02 within pairs 0.89 to 1.04; Greater-Than Expert missing from 9.1's table; reuse compatible MS18 records rather than paying for the baseline twice | plan S5, S6; report-r3 section 3 | agree with all | add them to the joint findings |
| 12 | Phase 1 timing and SM5 | run SM5 on the current source when difficulty-v3 allows | version, history and selective S5a can be designed early; shipping needs the frozen source | D9 | compatible | design phase 1 now; SM5 before the freeze if allowed (IG-S-Q25), its result rechecked on the frozen source |

Points where we already agree (no change):

- Retire S1, S2 and the Nightmare SM2 screen for passing cells: a priority decision, not a refutation.
- K3 belongs to difficulty-v3.
- OD-S5: approve the pool conditionally, with an early-hit path or head start, width 4 at most, and CPU
  reported per cell; the 1.6 is not a ceiling (4.39 and 4.13 per pair).
- A bounded, costed harness repair at the freeze, before the frozen budget.
- mega16 Expert is a hit-rate cell (budget 30 s).
- Hell 1's hits belong to difficulty-v3, and no speed item makes it offerable.
- D1 to D10 as assessed. Astra adds the reuse of MS18 records (D1) and a Hell 1 floor diagnostic independent
  of S1 (D9). I accept both.

## 2. Errors in Astra's analysis

- **`gpt-6-astra/3-plan-v2-analysis.md:313`.** The row 'CPU "up to 1.6"' carries the verdict word
  "**Correct.**", while its text shows the claim is not a bound (per pair 4.39 and 4.13; classic9's cohort
  total 1.67). Read as a verdict, it says the opposite of the evidence. It should say "incorrect as a bound".
- **`:267`.** The illustrative factor 1.8 to 3.2 for eight- and four-attempt exhausted failures takes its lower
  end from the two-attempt boards. Such cells measured 2.07 to 3.43 per pair. This is conservative rather
  than wrong, and it widens the phase 1 ranges of section 5.

Neither changes a recommendation.

## 3. Merged questions for Fable (Sudoku)

| No. | Question | Origin | Status |
|---|---|---|---|
| IG-S-Q19 | Which check changes belong to which version? Section 9 puts any change of findings, finding order or work units under difficulty-v3, while IG-S-Q03 (b) let a family that cannot keep its checks move under the generator version with a new guard unit. Does section 9 supersede that option, or separate intrinsic finder units from generator-only quotas? | Astra Q19 | agreed (Opus endorses) |
| IG-S-Q20 | What does phase 3's whole-request x1.5 kernel gate compare? Per target cell or pooled; against the same post-phase-2 generator, quotas and pool, or the old serial baseline; which wall or CPU statistic binds? | Astra Q20 | agreed (Opus endorses) |
| IG-S-Q21 | Where does "the Nightmare window widened from about 220 to about 590 points" (0.2; S1's version 2 note) come from, and what quantity is it? The level minima in `difficulty.js` are unchanged at `f7be90f` and `7ab77b1` | Opus Q19 | Opus only |
| IG-S-Q22 | With a pool of width 4 per request (IG-S-Q02), which outer parallelism defines a budget verdict: the checkpoint's `--jobs=4` (16 threads) or solo requests? | Opus Q20; Astra's caution in its section 2 | agreed in substance |
| IG-S-Q23 | Version 3's Hell 1 route: keep Hell 1's time targets (S5a, K2) while hits wait for difficulty-v3's finders, or drop Hell 1 from the plan until the frozen catalogue shows exact puzzles? A bank for Hell 1 is not designed before then (joint position) | Opus Q21 | Opus only |
| IG-S-Q24 | The frozen baseline keeps `attempts`, `timings` and `work` per request (the qualifier discards them), reuses compatible MS18 records, and runs 20 or more requests on each time-limited and unlaunched cell. Agreed? | Opus Q22; Astra A2 and A5 | agreed |
| IG-S-Q25 | May SM5 (pool widths 1, 2 and 4) run on the current source as soon as difficulty-v3 allows, since S5a is rating-independent and phase 1's pool design rests on it? | Opus Q23 | Opus only |
