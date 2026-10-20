# Response to review and proposed joint resolutions

> **Paths.** Written when the generator and the player were two repositories (`sudoku-generator`, `sudoku-player`):
> paths such as `js/core/…`, `js/ui/…`, `tests/…` and `design.md` belong to those repositories, and line numbers to the commits named below.
> In this repository they are `generator/…` or `player/…`, and the files both projects share are in `core/` — see
> [where the old paths went](../../architecture.md#where-the-old-paths-went). Commands such as `node tests/node-runner.js` run in `generator/` or `player/`.

**Researcher:** gpt-6-astra  
**Date:** 2026-10-19  
**Scope:** Phase 3 research response only. Both reports and both cross-reviews remain unchanged; neither application repository has been modified.

I read `claude-opus-5.5\review-of-gpt-6-astra.md` in full, including its additional generation and local-search results.

**Decision:** I accept **R1–R5 and R7–R10**. I object only to the omission of **downward clue-group addition/refinement in R6(iii)**; the other parts of R6 are accepted. The amendment is small, preserves symmetry/UI structure, and has concrete supporting measurements.

Paths below:

- `G\…` = the sudoku-generator repository (paths from its root).
- `P\…` = the sudoku-player repository.
- `C\…` = claude-opus-5.5's folder: its reports are in [`../claude-opus-5.5/`](../claude-opus-5.5/) (now numbered, e.g. `review-of-gpt-6-astra.md` → [`2-review-of-gpt-6-astra.md`](../claude-opus-5.5/2-review-of-gpt-6-astra.md)); its `experiments` are not part of the repository.
- `E\…` = my experiment folder, not part of the repository.

# 1. Response to the critique

## (a) Classic6: “evil routinely / nightmare rare”

**Accept the correction to my support forecast.**

My original 27/30 expert and 29/30 evil figures were **old-label generation hits**. They are not new-score target success rates. Under the proposed ladder, my thirty default old-evil trials contain five evil and one nightmare1. I withdraw “evil routinely” as an evidence-backed production claim.

The pooled 245-row figure is descriptive, but includes duplicate/intervention records. In the deduplicated **default-generator** corpus there are 180 classic6 old-evil requests:

```text
veryEasy 1, easy 1, hard 53, veryHard 79, expert 29, evil 16, nightmare1 1.
```

Thus 16/180 are evil and 17/180 evil-or-above. Neither this distribution nor the pooled 11% measures a generator actually targeting the new evil band. [E\resolution-checks.json, `classic6DefaultOldEvil`; E\cross-summary.json]

**Retain the narrower existence claim.** Seed 694974463 has a complete, unique proof and genuinely lands in the specified numerical nightmare1 band. Under R1 it scores **2475**, from an unrounded 2475.479774…, not 2476. One such witness establishes attainability, not a reliably supported picker entry or a human-validated nightmare category.

The joint wording should be:

> Classic6 has valid high-scored instances, including a rare nightmare1 witness. Its offered tiers are determined by R7, not by the old labels or a size-only ceiling.

## (b) Large-board veryEasy and Stage A

**Accept. Stage A is the immediate blocker at the current clue counts.**

Both formulas relabel the old large-board veryEasy outputs as at least easy. I did not emphasize that sufficiently in the independent report.

It is not a mathematical absence of veryEasy puzzles. My cross-review constructed 40-empty-cell puzzles on Mega12, Mega16, Samurai, Sohei, Butterfly, and Flower with **rotational180 symmetry**, unique solutions, and exactly forty naked singles. Their unrounded score is about 42.3394; R1 gives **42**, hence veryEasy. [E\cross-dense.json]

R6(i)'s upper-band test in Stage A is the right fix. It must test the **canonical integer score before committing a removal**, restoring a rejected group. Merely enabling the guided stage after the existing `max(minClues, round(.47 × cells))` hand-over is insufficient. The existing clue floors are minima, so they do not prevent these denser puzzles. [G\js\core\digger.js:883–889]

## (c) Tiers above nightmare2

**Accept the release decision; reject the mathematical impossibility wording.**

I reproduce the **0/61** former nightmare3 targets, and agree that no observed complete proof in the combined evidence reaches 5400. Further picker tiers are unvalidated and should not be included now.

However, “no generator can fill them” and “new technique IDs are the only way” are stronger than the evidence supports:

- The formula is logarithmically unbounded over unrestricted use counts.
- As an **arithmetic control, not a claimed Sudoku puzzle**, `E=81`, `nakedSingle=81`, `nishio=400` gives raw score **5428.7964**, integer **5429**. The formula itself therefore does not prohibit crossing 5400.
- Conversely, a fixed board/catalogue imposes a finite bound. Each effective counted finding must remove at least one candidate from an open cell or fill an open cell. The potential `Σ_open popcount(candidates)` starts at no more than `E × digits` and decreases on every effective finding. Therefore total counted uses are at most `E × digits`. [G\js\core\constraints.js:400–438; G\js\core\logical-solver.js:237–260,317–328]
- With maximum weight 1700, an optimistic upper bound is:

```text
S ≤ 80E/(E+40) + 1700 + 425 log₂(1 + E·digits).
```

Across the current fifteen registered geometries, the largest such bound is Mega16's **6869.3389**, or **6869** after R1 rounding. It is deliberately loose, not an attainable-score claim. It shows why an indefinite populated ladder should not have been implied: the former 8100 boundary is beyond even this bound, while 5400 is not ruled out by it. [E\resolution-checks.json, `theoreticalUpperBounds`]

**Correct joint conclusion:** only nightmare1/nightmare2 now; nightmare2 open-ended. Higher tiers need new empirical evidence and a versioned decision. I withdraw any implication that the ×1.5 rule by itself guarantees realizable tiers.

## (d) Killer's middle-level gap

**Accept. This is a material omission from my independent generation forecast.**

I checked the new simulation records:

| Target | Existing-digger simulation | Six-second cage-move search |
|---|---:|---:|
| veryHard | 2/10 | 5/10 |
| expert | 1/10 | 5/10 |
| evil | 2/10 | 4/10 |

These establish that the bands are not empty, but neither method yet meets a 90% support criterion. My earlier high-end Killer examples did not establish coverage of the intermediate bands. [C\experiments\xreview\out\sim-g-summary.md; E\resolution-checks.json, `killerMiddleTrials`]

I accept keeping 260/520 under R8, and adding structure search rather than changing weights just to manufacture a hit. R7 must be applied honestly: if the implemented search still fails those middle bands, they remain hidden even when a higher band is available.

Downward clue addition is useful for over-hard proposals, but is **not a universal cure for this gap**. The peer's new Killer refinement probe reaches neither expert nor evil on those ten starts. Cage layout/boundary moves remain necessary; more strategy work or later calibration may still be needed. [C\experiments\xreview\out\killer-refine.txt]

## (e) The 500-seed validation cost

**Accept. I did not provide an operational compute budget.**

Fifteen variants × nine levels × 500 trials is **67,500 requests before option profiles**, although proven impossible cells could be excluded. With slow high-tier strategies, that is not a suitable unconditional first-release gate.

I accept the bounded R7 screening/escalation protocol. It is a cost/assurance compromise, not statistically equivalent to my former criterion. Two-sided 95% Wilson lower bounds are approximately:

| Result | Lower bound |
|---|---:|
| 36/40 | 76.95% |
| 90/100 | 82.56% |
| 190/200 | 91.04% |

The joint report should call R7 an **observed-hit-rate qualification**, not a 95%-confidence guarantee of ≥90% population success. Include all failures/timeouts in the denominator and all request runtimes in p95; do not replace failed seeds. [E\resolution-checks.json, `wilsonLowerBounds`]

## (f) Existing table and apportionment

**Accept the implementation choice and correct the strength of my UI claim.**

The formula is not separable into independent `techniqueScore(id, count)` functions. That does **not** mean its total cannot be allocated over the existing rows. My cross-review already gave an allocation alternative; I accept R3's single-provider version as the selected design.

For the R4 peak provider `h`:

```text
q_t = R · w_t · n_t / W + (t = h ? P : 0)
q_empty = V
Σ q_t + q_empty = P + R + V.
```

R3 preserves the layout, but changes the row semantics: they are **allocated shares**, not independent charges. A row's share can change when another technique appears even if its own use count does not. The help must explain that; the old first-use-1.5× and fixed-0.6-per-empty descriptions must go.

I tested the **existing** `SG.stepView.roundToTotal` on:

- 8,309 complete primary-corpus traces;
- 1,775 relabelled traces;
- 26 fixtures;
- tied-provider and zero-work cases.

There were **no allocation failures**. Thus no separate Peak/Workload rows are required. I retain that presentation only as an alternative, not a blocker. [G\js\ui\step-view.js:479–493; E\resolution-checks.cjs; E\resolution-checks.json]

## (g) Other agreements, corrections, and remaining disagreements

### Agreed

- The broader 85-puzzle relabelling experiment supports keeping the chosen shape. R1 integer rescoring causes **no level variation within either relabelling probe**: forty cases/840 solves and eighty-five cases/935 solves.
- The two incomplete Killer examples justify R5. The second becoming solvable at depth 3 does not make a depth-2 partial proof rateable.
- Player text-import name mapping, broader level-list tests, and the missing legacy-version context deserve the additional attention identified by the peer.
- Frozen weights are engineering priors; tier-separation AUC and size-consistency metrics are not human calibration.

### Clarifications still needed in the narrative

1. **Overlapping corpora.** The 9,425 figure counts records, not distinct independent puzzles. At least 785 default requests overlap exactly. Use the deduplicated 8,310-outcome/8,309-complete default corpus for that comparison, or explicitly label the larger pool as overlapping/intervention records. [E\cross-summary.json]
2. **Hyper statement.** “All ten sampled hyper medium puzzles rescore as easy” was a correct finite-sample statement, not a claim about all hyper puzzles. The larger independent A sample is 67/100; adding my duplicated ten makes 77/110, reported as 70%. I accept the broader evidence but not calling the original explicit 10/10 observation false.
3. **No absolute strategy ceiling.** “Classic9/Wordoku nightmare2 need local search” is too categorical: the existing asymmetric classic9 dig produced a 3625.3 witness. Local search helps reliable targeting; it is not a demonstrated mathematical necessity. [E\asymmetric9.jsonl:26]
4. **Mega16 timing is strategy-specific.** The 124–150 s bounded-digger result should not be presented as inherent to Mega16. The new propose-then-add-clues experiment reaches the agreed nightmare1 band much faster; it is the basis of my R6 amendment below.
5. **Cage tilt direction.** The peer review's generation point 4 says “toward small cages” for `cageSize:2`. That is reversed: positive tilt favours **larger** cages through `exp(.55·tilt·(size−3.5))`. [C\review-of-gpt-6-astra.md:600; G\js\variants\killer.js:188–212]
6. **Oracle versus final rating.** Do not replace the explicit final R5 guard with “the technique oracle prevents incomplete outputs by construction.” The oracle and final rater can use different technique/uniqueness options and budgets. Retain the final completion test regardless of the empirical 0/872 result.
7. **Legacy wording.** Old links/history **may** regenerate a different puzzle, not necessarily always. The inspected regression-hash comparison preserved 20/20 classic4 veryEasy, 20/20 classic9 veryEasy, and 11/20 classic9 hard hashes. The across-version guarantee is lost; every individual puzzle need not change. [E\cross-compatibility.json]

None of these narrative corrections blocks R1–R5 or R7–R10.

# 2. Decisions on R1–R10

## R1 — ACCEPT

Use **one rounding operation on the unrounded sum**:

```js
score = Math.round(V + P + R);
```

Do not round the previous tenth-point score again, or round the three components before summing.

On 8,309 complete primary traces, R1 changes only **six labels** relative to the tenth-point prototype. However, double rounding would give a different numerical score on **296** traces. The classic6 witness demonstrates the issue:

```text
raw = 2475.479774… → correct integer 2475
old prototype = 2475.5 → rounding again incorrectly gives 2476.
```

`classic-easy-2` now scores 45 and becomes easy, resolving the earlier display/boundary mismatch. Generator qualification must still be rerun: changing objective rounding/ties can change which puzzles are generated, not merely their final labels. [E\resolution-checks.json]

## R2 — ACCEPT

Accept the nine IDs, exact en/vi names, starts:

```text
0 / 45 / 180 / 400 / 700 / 1000 / 1500 / 2400 / 3600
```

and open-ended nightmare2. No further tiers in this release. The mathematical nuance in section 1(c) does not change this decision.

## R3 — ACCEPT

Keep the table structure and use the exact allocation above. Apply the existing integer apportionment once to all technique shares and the empty-cell share, targeting the canonical R1 score.

Implementation details:

- The peak provider must be the same one chosen by R4.
- Handle `W=0` without division; zero-work score is zero when `E=0`.
- For the Empty cells “points” value, `V/E` is an average share, not a constant; avoid division when `E=0`.
- Summary and Generation Steps must use the same contextual allocation helper and row order.
- Reword help to say **allocated share**. `points × uses` is no longer a row-independent formula.

I accept the minimal layout rather than requiring my separate-component display.

## R4 — ACCEPT

Interpret “later registration order” as the technique definition's numeric **`order`**, not insertion order into the registry. After equal weight and equal numeric order, use a deterministic ID ordering, preferably code-unit ascending.

Current tie examples are tested:

- `nakedQuad` and `ruleOf45`, both 260: provider `nakedQuad` (`order` 100 versus 95).
- `jellyfish` and `cageSplit`, both 520: provider `jellyfish` (160 versus 135).
- `ineqChain` and `pointing`, both 40: provider `ineqChain` (65 versus 40).

This determines metadata and allocation; it must not reorder the solver itself. [E\resolution-checks.json, `ties`]

## R5 — ACCEPT

No completed canonical proof means no level and no hit. Publish only completely rated, valid, unique candidates. After deterministic work exhaustion, use the closest complete candidate and the existing approximate warning; if none exists, use the existing error path.

Replay's unavailable state remains null. Do not expose a partial numerical score as a difficulty band or add synthetic guesses.

## R6 — OBJECT: one limited amendment to (iii)

I accept (i), (ii), (iv), (v), and (vi), and the symmetry/model-log safeguards in (iii).

**The move set must also include symmetry-preserving clue-group addition/downward refinement when a fast proposal is above the target band.** Removal and swap alone do not explicitly provide that route, and an ascent-only local search cannot use an over-hard proposal effectively.

### Evidence

The peer's new `mega16-refine.js` adds rotational180 clue orbits from the known solution, with a deterministic cap of 64 full ratings. Its ten-start experiment reaches `[2400,3600)` **10/10**, with median proposal/refinement times **204/91 ms**, instead of the 124 s bounded-digger median.

After checking that the script has no file writes, I reran its first three cases, directing output only to my own folder:

| Seed | Proposal score | Refined integer score | Added-orbit ratings | Refinement time |
|---|---:|---:|---:|---:|
| 4051528455 | 4078 | 3238 | 2 | 52 ms |
| 4034750836 | 4210 | 2982 | 2 | 37 ms |
| 4085083693 | 4508 | 3224 | 7 | 361 ms |

All three have complete proofs and verified unique solutions. This is a small reproducibility/feasibility check, not R7 qualification. [C\experiments\xreview\mega16-refine.js:1–9,49–76; C\experiments\xreview\out\mega16-refine.txt; E\resolution-mega16-refine.txt]

### Concrete replacement for R6(iii)

> Local search/refinement after an attempt with no exact sample uses symmetry-preserving clue-group **addition, removal, and swap**, Greater-Than sign removal, and Killer cage merge/boundary moves. Above-band proposals may be refined downward by adding solution clue groups; below-band proposals may be refined upward. Search need not monotonically increase score when starting above the band. Final acceptance always requires a complete rating inside the exact interval. Retain the closest complete candidate throughout. Cage changes occur in the structure phase or are logged truthfully.

Use a deterministic **64-rating cap** for the downward pass as an initial value, in addition to the agreed node/work guards. Additions preserve clue minima and configured symmetry. They do not require new rules, controls, or a new screen.

Also preserve these implementation interpretations:

- Compare the **integer R1 score** with band edges.
- Count rejected/invalid proposals toward deterministic work limits as appropriate; do not let an invalid-move loop run only until a wall clock happens to expire.
- A deterministic raw-sum tie-breaker among equal integer objectives is permissible; it changes search ordering, not the public score.
- Hard time/cancellation remains an error. Only deterministic work exhaustion yields the reproducible closest-candidate fallback.
- In (iv), “toward the measured best” means the observed **larger-cage** direction for high tiers, while preserving the meaning of the existing cage-size option.

This amendment is not a claim that clue addition alone solves Killer's middle gap. R7 still decides availability.

## R7 — ACCEPT

Accept the 40-seed screen, 60-seed escalation for 30–35 initial hits, thresholds 36/40 and 90/100, and p95 budgets 2/10/30 seconds.

Implementation/reporting clarifications:

- Count every attempted request, including timeouts and incomplete/approximate outputs.
- Compute p95 over **all requests**, not only successes.
- A cell meeting the hit threshold but failing the time threshold is not supported.
- Keep the initially failed seeds in the 100-trial result; do not restart the sample.
- Publish the sample size/profile and observed rate, without implying a 95%-confidence ≥90% guarantee.
- The initial table qualifies **default options and symmetry**, not every advanced option combination.

Non-prefix lists are appropriate, especially for classic6 and potentially Killer.

## R8 — ACCEPT

Implement `ruleOf45:260` and `cageSplit:520` now, as part of the frozen table. Their human calibration remains later work. Do not change weights just to make an unqualified tier appear to pass generation.

No new Nishio-depth or other technique IDs are essential for this release.

## R9 — ACCEPT

I accept the deliberately limited compatibility policy: cache/schema bump, v1 export container plus `ratingVersion:2`, preserved stored history values, no URL version parameter, and player support for the three new IDs/names.

Clarifications, not additional blockers:

- Say old links/history **may regenerate a different puzzle**; exact across-version reproduction is no longer guaranteed.
- Do not silently reinterpret an untouched old history score using the new bands.
- New rating/history metadata should identify v2; missing version is legacy. Document the export field location consistently with the player's importer.
- Player content identity/progress must not be keyed by rating version.
- With unversioned URLs, an old/new link cannot generally be distinguished automatically. A general documented compatibility notice is honest; a promise to detect every old link is not.

## R10 — ACCEPT

Rewrite assertions for the removed floor, size-scaled score bands, six-level list, and new score/display contract. Update documentation and regenerate intentional regression expectations after reviewing the implementation.

Do not weaken unrelated invariants: uniqueness, valid solutions/givens, configured symmetry, determinism under the same work caps, faithful replay, allocation sums, import/export compatibility, and unchanged gameplay controls must continue to be tested.

# 3. Verification and integrity

New artifacts in my own `experiments` folder:

- `resolution-checks.cjs` / `resolution-checks.json`: R1 integer-boundary checks, R3 apportionment using the real UI helper, R4 ties, relabelling/fixture checks, bounded-score analysis, and R7 interval calculations.
- `resolution-mega16-refine.txt`: the three reproduced downward-refinement cases.
- `resolution-initial-integrity.json`: hashes of both independent reports and both cross-reviews.
- `resolution-final-integrity.json` / `resolution-repository-state.txt`: final hash and repository checks.

Reproduction from the workspace folder that held the experiment folders (not part of the repository):

```powershell
node <experiment folder of gpt-6-astra>\resolution-checks.cjs
node <experiment folder of claude-opus-5.5>\xreview\mega16-refine.js --n=3 --seed=20261019
```

The second command's inspected script only writes to stdout; the recorded output was redirected to my own folder. No other researcher's file was changed.

No application code, documentation, task files, commits, branches, or Git state were changed during this phase.
