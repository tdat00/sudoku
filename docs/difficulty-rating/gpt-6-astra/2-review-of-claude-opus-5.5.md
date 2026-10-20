# Cross-review of claude-opus-5.5: difficulty scoring and generation

> **Paths.** Written when the generator and the player were two repositories (`sudoku-generator`, `sudoku-player`):
> paths such as `js/core/…`, `js/ui/…`, `tests/…` and `design.md` belong to those repositories, and line numbers to the commits named below.
> In this repository they are `generator/…` or `player/…`, and the files both projects share are in `core/` — see
> [where the old paths went](../../architecture.md#where-the-old-paths-went). Commands such as `node tests/node-runner.js` run in `generator/` or `player/`.

**Reviewer:** gpt-6-astra  
**Date:** 2026-10-19  
**Phase:** Independent-report cross-review, not implementation.

The other report was read in full. Neither independent report has been edited. Neither application repository has been modified. Experiments and derived data are confined to my own `experiments` directory.

**Latest product constraint:** the new formula takes priority; small UI/behaviour changes are acceptable if explicitly reported. Accordingly, I treat additivity of the existing score table as a tie-breaker, not a reason to reject a better formula. Section 5 lists the proposed display and behaviour changes.

## Evidence conventions

- `G\…` = the sudoku-generator repository (paths from its root).
- `P\…` = the sudoku-player repository.
- `A\…` = my folder: its reports are in this folder of the repository (now numbered: `report.md` → [`1-report.md`](1-report.md)); its `experiments` are not part of the repository.
- `C\…` = claude-opus-5.5's folder: its reports are in [`../claude-opus-5.5/`](../claude-opus-5.5/) (`report.md` → [`1-report.md`](../claude-opus-5.5/1-report.md)); its `experiments` are not part of the repository.
- `E\…` = `A\experiments\…`.
- “A formula” means my independently proposed peak/log formula **with my weights**. “C formula” means Claude's square-root formula **with Claude's weights**. A formula, a weight table, a ladder, and a generator search strategy are four different things.
- Findings below distinguish **source facts**, **measured outcomes**, and **implementation recommendations**. Numerical agreement with a chosen engineering objective is not proof of human difficulty accuracy.

## Executive verdict

1. We agree on the central diagnosis: six current levels, missing `veryHard`, level-derived technique floor, size-scaled bands, classic-only cost calibration, and historical upper-level gating.
2. Claude contributes substantially better breadth: **7,800 baseline puzzles, 3,983 clue-removal pairs, a score-targeted generator simulation, and actual cage-layout local search**. Those are valuable additions to my report.
3. Our baseline samples are not disjoint: **785 generation requests overlap and match exactly**. The deduplicated common default-generator corpus has **8,310 outcomes, 8,309 with complete logical proofs**.
4. On matched **exact hardest-technique IDs across grid sizes**, the peak/log bundle has mean absolute log₂ score shift **0.326**, versus **0.672** for the square-root bundle. This favours peak/log for the requested cross-size consistency objective.
5. On all 3,983 clue removals, A has **141 score decreases / 9 level decreases**, versus C's **177 / 21**. Neither is clue-removal monotone. A's worst level decrease is two levels, C's one.
6. My “three versus six changed scores” solver-path result needs qualification: without my tenth-point rounding, **both formulas change six of 40 cases**. The compression benefit remains: worst max/min ratio **1.097 versus 1.324**.
7. “Classic6 cannot produce easy/medium” is false even under C's own formula and ladder. Its own corpus contains independently rechecked examples. “Expert ceiling” is a support-policy hypothesis, not a puzzle-space limit.
8. Large boards do not intrinsically lose veryEasy under either formula. I generated symmetric, unique **40-empty-cell** puzzles on all six large boards: A=**42.3**, C=**37.947**, both veryEasy. The failed low-tier simulations expose Stage A's stopping policy.
9. Claude's saved Killer climb successes are real complete-proof endpoints; I do not dismiss them. However, its climb acceptance code lacks a completeness guard, and **142/193 saved climb endpoints break the original rotational clue-mask symmetry**. These prototypes are not drop-in production generators.
10. The proposed fake `guess` term must be rejected. A real unsolved Killer receives **23,293 points** under that fallback without a completed proof. No level should be manufactured from the number of unsolved cells.
11. Mega16's reported high-end digging limitation is a strategy artifact: **53/70 ordinary old-evil outputs already fall in C's nightmare3 band**. A bounded filter/restart experiment reached C-nightmare2 and C-nightmare3 **10/10 each**, with median times **461 ms and 204 ms** respectively.
12. Most “nightmare3 versus nightmare2” disagreements are different numerical scales applied to the same puzzles. They are not disagreements about whether those puzzles exist.
13. My revised recommendation is to retain the **frozen A score bundle** as the implementation candidate, adopt **uniform `nightmare1`, `nightmare2` IDs**, merge Claude's useful search ideas with explicit proof/symmetry/determinism safeguards, and qualify supported tiers empirically. The score table needs a disclosed change; human calibration and new technique IDs are later work.

# 1. Section-by-section review

## A1. Levels

**Agreement.** The six current IDs, order, cumulative groups, reference bands, clue floors, unit minima, symmetry defaults, and Killer overrides are accurately described by both reports. `veryHard` must be inserted as a new level, not assumed to exist. [G\js\core\difficulty.js:100–116,207–216,351–379]

**What Claude found that I missed.** The documentation calls `evil` **“Ác mộng”**, whereas the actual Vietnamese locale calls it **“Địa ngục.”** That is a genuine naming inconsistency relevant to adding nightmare tiers. The existing locale should remain authoritative for the old level; nightmare tiers can use “Ác mộng 1/2.” [C\report.md:90–91; G\design.md:543–550; G\js\ui\locale.vi.js:125–128]

**Correction to Claude.** “The registry keeps its own copy because it loads first” repeats a stale source comment, not the actual load order. Difficulty loads before the variant registry in all three inspected entry points:

- `tests\node-runner.js`: difficulty at line 50, registry at 57.
- `index.html`: difficulty at 365, registry at 372.
- `gen.worker.js`: difficulty at 74, registry at 81.

The duplicated lists are real; the stated reason is not. [C\report.md:75–77; G\js\variants\registry.js:16–17]

**My revision.** Add the Vietnamese naming inconsistency to the eventual documentation impact. No numerical correction to my A1 is required.

## A2. Scoring

**Agreement.** Both reports reproduce the actual formula, cost overrides, global 1.5 first-use multiplier, `0.6E`, empty-count reconstruction, group-based floor, half-open bands, and solver/rater score distinction correctly. The worked classic9 and Samurai examples agree exactly because they use the same deterministic requests. [G\js\core\difficulty.js:298–318,402–479; G\js\core\logical-solver.js:327–333,371–406]

**Useful addition from Claude.** Its note that the header of `techniques.js` contains obsolete planned names/orders is correct. Registrations, rather than that comment table, are authoritative. [C\report.md:145–146; G\js\core\techniques.js:93–95]

**Precision needed in both discussions.** “Cheapest first” means registered `order`, not calibrated cost. In particular XY-Wing is tried before Jellyfish although their calibrated costs are 480 and 335. Therefore the fixed solver priority is not evidence that it always selects the cheapest proof under either new score. [G\js\core\techniques.js:167–176; G\js\core\tech-wing.js:588–605; G\js\core\tech-fish.js:568–577]

**My revision.** Preserve solver order in the first implementation and describe it as a deterministic heuristic priority. Finding a globally cheapest proof is not part of either implemented solver.

## A3. Generating a target level

**Agreement.** The two-stage dig, 47% hand-over, candidate pool, restricted logical oracle, special evil objective, final uniqueness check, retries, and approximate fallback are correctly traced. The floor does not by itself change upper-band admissibility for an already solved restricted candidate; it changes objective values/ties and final target acceptance. [G\js\core\digger.js:685–717,736–811,866–913,974–990,1122–1150]

**What Claude found that I underemphasized.** A size-free low band can already be overshot before guided digging starts. Turning on `guided:true` alone does not fix this: Stage A still removes clues down to about 47% givens. The generator then needs to *restore* clues, or avoid overshooting in the first place. This must be addressed for low tiers, not deferred as a high-end optimization. [C\report.md:224–225,618–621; G\js\core\digger.js:883–889]

**Qualification to Claude's experiments.** `simulate.js` invokes `pipeline.run(..., null)` without a run budget; its measured times are not production budget guarantees. Its output also omits `solved`. This does not invalidate its measured hit counts, but a future acceptance benchmark must record proof status and count budget failures explicitly. I found no synthetic-guess residual in the 1,505 saved simulation rows; that is reassuring, but is weaker than explicitly recording complete proof status. [C\experiments\simulate.js:120–136; E\cross-summary.json]

**My revision.** The generation proposal must include a score-aware low-tier start from the full grid, and must distinguish a cheap high-difficulty *candidate generator* from final score-band acceptance.

## A4. Per-variant matrix

**Agreement / independently checked numbers.** The five A-files contain exactly **7,800** rows; all have `solved:true`. The reported variant counts, current support lists, hidden-level hits, and floor shares match the data. Its larger baseline is better evidence about frequency than my ten-per-cell baseline.

**Important denominator correction for a joint report.** My 670 supported baseline requests and 115 first hidden-level requests are already in Claude's A corpus. All **785** overlaps have identical givens, empty counts, proof counts, and completion status. Adding the two sample sizes as independent evidence would overcount them. The primary union adds my 390 held-out high-level trials and 120 default classic6 trials, yielding **8,310**, not 9,095. [E\cross-summary.json, `integrity`; E\cross-common.cjs]

**A stronger result than either report originally established.** Claude's universal claim about classic4 was originally supported only by sampling. I exhaustively checked it:

- 288 valid complete 4×4 solutions.
- 12 solutions after fixing the first row to `1,2,3,4`; digit relabelling covers the rest.
- All **786,432** clue subsets of those 12 solutions examined.
- **565,820** uniquely solvable subsets; zero failures of naked-single-only solving.
- Maximum empty count among those unique subsets: 12.

Thus, for the classic4 rule set and the canonical solver, all valid unique puzzles really are naked-singles-only. Its maximum is A=20.4 or C≈20.785, hence veryEasy under either proposed ladder. [E\cross-classic4-exhaustive.json; E\cross-counterexamples.cjs]

**My revision.** Replace my sampling-only uncertainty about classic4 with this bounded exhaustive result. This does **not** generalize to classic6.

## A5. Surfaces and persistence

**Agreement.** Both reports correctly identify Summary, Generation Steps, replay scoring, history, pickers, URL `d`, store/cache keys, export/wire formats, and the player's fixed level list. Claude adds a useful broader inventory of level-list assertions in variant/UI tests. [C\report.md:267–304]

**Important compatibility precision.**

- The current player drops unknown difficulty metadata; it does not necessarily reject an otherwise valid puzzle.
- A known-but-unsupported generator level is snapped to a supported level. An unknown `d` ID is instead ignored by the old URL reader. These are different cases.
- The player's puzzle identity is derived from puzzle/model content, not rating. New rating versions should not reset progress for an unchanged imported puzzle. [P\js\ui\importer.js:690–713; G\js\ui\store.js:217–232,387]

**My revision.** Add explicit protection of player puzzle IDs/progress, and spell out the score-table/precision changes instead of treating UI impact as just deleting the floor row. See section 5.

## B1. Floor circularity and floor removal

**Agreement.** The precise dependency is technique group → owning level's minimum → numerical score → classification. It is not an infinite runtime recursion and does not directly read the requested difficulty in `rate`. [G\js\core\difficulty.js:393–424,448–456]

**Claude's percentages are correct, with their stated denominator.** The floor analysis includes **6,859 exact old-level results** out of 7,800 requests. Of those, **289** drop a level when the same trace is rescored without the floor:

| Variant | Exact results | Floor-raised / drop count | Share |
|---|---:|---:|---:|
| classic9 | 1200 | 17 | 1.42% |
| mega16 | 240 | 30 | 12.50% |
| sohei | 240 | 80 | 33.33% |
| samurai | 240 | 108 | 45.00% |

Samurai hard has **38/40** floor-bound outputs. [C\experiments\data\B1-floor-removal.tsv; E\cross-summary.json, `floor`]

**The apparent conflict with my report is not a conflict.**

- My 45/670 is across the offered combinations only, with different per-variant sampling weights.
- My “2 → 35 median samples” measures **regeneration using a changed objective**, not post-hoc relabelling.
- Claude's “about 5% Samurai hard without the floor” means that only 2/40 *previously selected final puzzles* remain in the band. It is not a measured per-dig hit rate or a prediction of the regenerated pipeline's success rate. [C\report.md:335–339]

My paired floor-free Samurai run returned 10/10 old-hard puzzles when the work budget was sufficient, but used median 35 samples, maximum 83. The lower five-million-work-unit guard caused six errors; the more generous run recovered them. [A\report.md:414–427; E\nofloor-samurai-generous.jsonl]

**My revision.** Keep both results, label their populations and operations explicitly, and do not infer regeneration hit rates from a static floor-removal table.

## B2. Cross-variant inconsistencies

**Agreement.** The mismatch between linearly scaled bands and unscaled hard-technique costs, uncalibrated variant costs, duplicate raw/rating constants, and repetition-driven high scores are all real.

**Factual correction to Claude.** Tier 0 does **not** mean a variant technique can never be `hardestTechnique`. It can beat basic techniques on cost when no higher standard tier was used. I found **98 examples** in its own A corpus. For example Greater-Than seed **2781630311** has:

```text
{ nakedSingle:29, hiddenSingleBox:3, ineqChain:1 }
hardestTechnique = "ineqChain"
```

It does not trigger a positive technique floor, but it is selected as hardest. [C\report.md:363–365; C\experiments\data\A-9x9variants.jsonl:2401; G\js\core\difficulty.js:393–418; E\cross-summary.json]

**Numerical qualification.** I reproduce the 1.00 → 0.65 cross-size statistic, but “halves the spread” is loose wording: the mean absolute log₂ shift falls by about **35.7%**, not 50%. More importantly, that statistic groups by **tier**, not exact technique, and a log₂ shift is not necessarily one level on a non-geometric lower ladder. [C\report.md:446–462]

**My correction.** My solver-path “six changed scores versus three” comparison masked three small changes with tenth-point rounding. On unrounded numerical scores, both A and C change six of the forty classic9 cases. The materially smaller amplitude under peak/log remains real. [A\report.md:440; E\cross-path.json]

## B3. Roots of the ceilings

**Agreement.** Wordoku, Greater-Than, Mega, and multigrid upper menus are largely historical gating, while Killer needs structure search once numeric clue removal has little room left.

**Classic6: Claude's categorical claim is wrong.** Its own corpus contains valid unique puzzles that score as:

| Seed | C score | C grade | Independently rerated source |
|---|---:|---|---|
| 17388822 | 40.179865 | easy | C\experiments\data\A-classic46.jsonl:1204 |
| 3665261682 | 103.853796 | medium | C\experiments\data\A-classic46.jsonl:1356 |
| 131226100 | 1524.117881 | evil | C\experiments\data\A-classic46.jsonl:1675 |

The first two have 24 empty cells. Their proofs and uniqueness were rechecked; the precise source paths, counts, and givens are in `E\cross-classic6-cases.json`. In the common 1,020 classic6 outcomes there are **42 C-easy, 7 C-medium, and 25 C-evil** results. Its own guided/no-floor simulation also finds easy 3/20 and medium 1/20. “Rare under this search” is defensible; “cannot produce” is not. [C\report.md:388–392,703; C\experiments\data\G-sim-summary.md]

**Our famous classic6 disagreement is mainly a band/availability distinction.** Seed **694974463** scores A=2475.5 → A-nightmare1, but C=2499.363239 → C-evil, only 0.637 below C-nightmare1. A hundred digit relabellings preserve both scores. This does not justify an absolute expert ceiling; nor does one instance certify a reliable nightmare picker entry. [E\cross-classic6-cases.json; E\cross-path.json]

**Solver limits do bind outside Claude's initial sample.** Killer seed **3203566290** is unique but logically unsolved. My previous depth/chain-limit test and the new rerun agree. “0/7800 observed” is correct; the conclusion “solver limits do not bind” is too broad. [C\report.md:392; E\cross-incomplete.json; A\report.md:472]

**My correction.** “Evil routinely” in my classic6 forecast was too confident. In my thirty default old-evil trials, only five were A-evil and one A-nightmare1. Targeted new-score search may improve that, but I did not establish a new-score generation success rate. My maxima must remain **observed attainable grades**, not certified support ceilings. [A\report.md:689; E\classic6-default-summary.json]

## C1. Universal formula

**Both ordinary formulas satisfy the allowed-input rule.** They use only empty cells and technique-use counts with fixed weights. Both are monotone in those inputs; neither guarantees monotonicity when clue removal changes the proof.

**Verdict on the formula shape:** prefer peak/log for the user's stated size/peak balance, on the common-corpus evidence in section 2. This is not a claim that it has been validated as a human psychometric scale.

**Verdict on weights:** both tables contain unvalidated cognitive judgments. Keeping old standard costs is operationally conservative, but those costs were fitted to the old classic9 group/band system, not to human measurements of the new formula. My larger replacement weights are also priors, not experimentally established human costs. The crossed-weight analysis is included rather than hiding this confound.

**Reject the terminal fake-guess policy.** Claude proposes `2240√remainingCells`. For the real unsolved Killer above:

```text
C score of the partial trace   =  3133.013145
remaining cells               = 81
invented guess contribution   = 20160
promoted score                = 23293.013145 → C-nightmare3
completed proof               = false
```

Remaining cells are not the number of guesses required to solve. In the prototype the extra term is not even materialized in `techniqueCounts`, so the advertised additive table would not explain that total. An incomplete proof must be unrated/rejected, not assigned a larger score. [C\report.md:413–414; C\experiments\simulate.js:61–78; E\cross-incomplete.json]

**Taxonomy sensitivity needs to be acknowledged, not mistaken for depth calibration.** Splitting Nishio into depth-1/depth-2 IDs while giving both the **same** cost already raises C's Golden Nugget score from **8007.26 to 10276.19**, crossing into nightmare3. The later doubled depth-2 weight raises it further to 13444.03. Peak/log is invariant to splitting an ID into equal-weight aliases with the same total uses. [E\cross-taxonomy.json]

This is a trade-off, not proof that all breadth rewards are wrong: learning distinct techniques can reasonably deserve weight. Conversely, peak/log ignores the distinction between equal-weight skills at equal total work. The point is that the apparent benefit of `nishio2` mixes a depth weight with a taxonomy/breadth effect. New technique IDs and human depth calibration should be **later work**, not required for the first implementation.

**My revision.** Keep the peak/log law, explicitly disclose rounding and breadth limitations, and separate proof completeness from scoring. The UI consequence is now an explicit design choice, not an omission.

## C2. Ladder

**Agreement.** Seven required IDs, including `veryHard`, should remain, and labels should be pure score-band lookups. Group-based label ownership must go.

**The numerical ladders cannot be exchanged without recalibration.** Section 2 includes all four formula/ladder combinations. For example A's constructed veryEasy fixtures become easy under C's 40-point boundary; C's published-hard scores become a higher nightmare tier under A's numerically smaller upper thresholds. These are unit/scale effects, not proof that either puzzle changed difficulty.

**Internal ambiguity in C's top-band description.** Its executable ladder and table define `nightmare3` as `[10000,∞)`, while the general geometric rule would end it at 20000 and create nightmare4. The current implementation should choose one explicit versioned interpretation. [C\report.md:546–555; C\experiments\ladder.js:7–15]

**My revision.** Adopt the uniform IDs **`nightmare1`, `nightmare2`**, rather than my mixed `nightmare` / `nightmare-2` spelling. For a bounded, implementable first release, use two added tiers and make nightmare2 open-ended. Future boundaries at 5400, 8100, … are a possible versioned extension, not automatically exposed tiers. No complete observed A-scored puzzle in the combined verified corpus reaches 5400, so this changes none of the measured native A classifications.

## C3. Generation strategy and maxima

**Claude's principal contribution is strong.** Its 115 uncapped and 78 band-capped climb endpoints all record `solved:true`. The fifty Killer band-target trials really show **10/10, 10/10, 9/10, 9/10, 9/10** successes for C-expert through C-nightmare3. I checked the data rather than assuming these were inflated by unsolved traces.

I reran the first three saved Killer starts for each of C-nightmare2 and C-nightmare3 with an explicit incomplete-proof rejection:

- Two of three reached each target.
- The two selected misses reproduce the characteristic plateaus around **774.64** and **7961.89** described in the report.
- All six final endpoints are unique, valid, and completely solved.
- Full model/givens/solution witnesses were saved and reloaded; all technique counts matched rerating.

These six starts are a targeted audit of saved cases, **not an independent estimate of the 9/10 population success rate**. [E\cross-climb.json; E\cross-climb-witnesses.json; E\cross-validation.json]

**Two production gaps in the prototype:**

1. Its `evaluate` returns `solved`, but acceptance and `hit` do not check it. No saved final endpoint is invalid for this reason, but the policy is unsafe for other seeds. [C\experiments\climb.js:54–57,159–177]
2. Single-clue removal/swaps ignore the requested symmetry. **142/193** saved endpoints are not rotationally symmetric in their clue mask, although their starting pipeline configuration used the default rotational180. This includes 28/28 classic9, 3/3 Mega16, 3/3 Samurai, and 17/60 Killer endpoints. A valid asymmetric witness proves existence, not support under the original symmetric setting. [C\experiments\climb.js:150–155; E\cross-symmetry.json]

The saved final cage/sign layouts are also not fully serialized by the peer climb script; time-bounded runs may stop at different moves on another machine. Full witnesses or accepted-move transcripts and deterministic work caps are needed for reproducible production validation.

**Mega16 ceiling correction.** On the common corpus, all 70 old-evil Mega16 outputs are C-nightmare2 or C-nightmare3; **53 are nightmare3**, with median old-generator time 136 ms across the 70. The slow 43 s nightmare1 simulation measures a particular bounded strategy trying to hit a lower/narrower band, not the board's high-end capacity.

A fresh fixed-seed experiment using the existing old-evil generator as a candidate source, rejecting incomplete/out-of-band candidates, found:

| C target | Requests | Verified hits | Candidate calls min / median / max | Time min / median / max |
|---|---:|---:|---:|---:|
| nightmare2 | 10 | 10/10 | 1 / 3 / 5 | 43 / 461 / 1103 ms |
| nightmare3 | 10 | 10/10 | 1 / 1 / 2 | 78 / 204 / 533 ms |

Base seed is 20261023; all actual puzzle seeds are saved. These are complete, unique, valid puzzles, not score-only records. This is a compelling reason to retain a cheap uniqueness-oriented high-puzzle proposal strategy, rather than force every high-tier removal through an expensive tightly capped full solver. [E\cross-legacy-portfolio.json; E\cross-search.cjs]

**My revision.** Merge cage/sign local search and score-derived pruning into the proposal, retain cheap high-puzzle proposal generation, preserve configured symmetry, and qualify actual target success rather than inferring ceilings from one strategy. I did not run a full A-scored end-to-end generation sweep in phase 1; rescoring success must not be advertised as such a sweep.

## C4. Impact and compatibility

**Agreement.** Both reports correctly require versioning and coordinated generator/player changes. A score-model change can alter the puzzle as well as its label.

**Correction to C's universal wording.** Not *every* seed changes and not *every* regression hash changes. I reproduced the relevant C scorer/spec patch in memory and compared the actual repository hash function on its twenty Fibonacci seeds:

| Configuration | Unchanged puzzle hashes |
|---|---:|
| classic4 veryEasy | 20/20 |
| classic9 veryEasy | 20/20 |
| classic9 hard | 11/20 |

Rating is deliberately excluded from that hash. The correct statement is “old seed-only reproduction is no longer guaranteed,” not “all puzzles change.” The nine changed hard puzzles still justify versioning. [C\report.md:66,683–689,708; G\tests\fixtures\perf-helper.js:171–189; E\cross-compatibility.json]

**My revision.** Make UI changes explicit and limited, protect player identity/progress, and avoid promising reproducible seed-only history for a timing-dependent local-search result. See sections 4–5.

## C5. Risks and validation

**Agreement.** Human calibration, variant-technique weights, top-tier tedium versus depth, solver-path dependence, rare-tier search cost, and legacy compatibility are genuine open issues.

**Corrections / qualifications.**

- Classic6 easy/medium are not absent.
- Large-board veryEasy is not absent.
- “0 unsolved in the old sample” does not justify inventing a score for future unsolved puzzles.
- Tiny all-success samples are feasibility evidence, not robust support certification. A 3/3 result has a two-sided 95% Wilson lower bound about 43.9%; 10/10 about 72.2%; 25/25 about 86.7%.
- Human validation cannot be claimed from agreement with the old generator's labels. Those labels were partly created by the mechanism being removed.

**My revision.** Human calibration/new technique IDs are later work. Before shipping particular picker entries, mechanical correctness, complete-proof checks, deterministic generation, versioning, and a fixed-seed support/budget qualification are essential now.

# 2. Quantitative head-to-head

## 2.1 Corpus and experimental controls

The comparison scripts only read the peer's files. They do not execute its writer scripts. The imported `rescore.js` and `ladder.js` modules have no writer side effects when required.

| Cohort | Returned outcomes | Complete proof recorded | Use in comparison |
|---|---:|---:|---|
| Peer A baseline | 7800 | 7800 | Primary corpus |
| My independent experiment files | 2303, plus 12 recorded budget errors | 2301 | Primary additions and separate sensitivity distributions |
| Deduplicated default-generator union | **8310** | **8309** | Main distribution / cross-size analysis |
| Peer D/I local-search endpoints | 193 | 193 | Feasibility/maxima and guarded reproduction |
| Peer G simulations | 1505 | not stored | Separate provisional distribution; not silently counted as verified proofs |
| Peer clue-removal pairs | 3983 | both endpoints complete in all pairs | Monotonicity comparison |
| My digit-relabelling corpus | 40 classic9 cases ×20; one classic6 case ×100 | all complete | Path robustness |
| Rated fixtures | 26 | 26 | Anchor comparison |

The 785 duplicate generation requests are removed by variant, requested level, seed, and default configuration. Their actual givens/counts match, so this is not merely assuming duplicate seeds imply duplicate puzzles. Different search interventions remain separate cohorts.

The primary corpus is **not a uniform sample of Sudoku space** and is not balanced equally across variants or old target levels. Every formula is nevertheless applied to the **same rows**. Distributions for each original author/cohort are also saved, rather than blending all intervention samples into the primary comparison.

Source hashes, script/runtime information, and derived results are retained in `E\cross-input-manifest.json`, `E\cross-initial-integrity.json`, and `E\cross-summary.json`.

## 2.2 What is being crossed

```text
A(E,n) = round₀.₁(80E/(E+40) + P_A + .25 P_A log₂(1+W_A/P_A))
         P_A=max used w_A; W_A=Σ w_A n

C(E,n) = Σ c_C √n + 5√E
```

The zero-technique term is zero in A. Only complete proofs receive published grades in the verified comparisons.

| Code | Formula and weight table | Ladder |
|---|---|---|
| AA | A peak/log, A weights | Original A ladder |
| AC | A peak/log, A weights | C ladder |
| CA | C square-root, C weights | Original A ladder |
| CC | C square-root, C weights | C ladder |

Additionally, the experiment evaluates **peak/log with C weights** and **square-root with A weights**, under both ladders. These factorial controls isolate the formula shape from the cost table. They are diagnostics, not separately calibrated release proposals.

Original A band starts: `0,45,180,400,700,1000,1500,2400,3600`, with the originally described ×1.5 continuation. C band starts: `0,40,100,240,420,600,1000,2500,5000,10000`, with the executable last band open.

## 2.3 Level distributions, all four combinations

Each vector is:

```text
[veryEasy, easy, medium, hard, veryHard, expert, evil, nightmare1, nightmare2, nightmare3+]
```

Nightmare spellings are normalized for comparison. The `nightmare3+` bucket combines higher original-A tiers reached by the artificial cross-ladder CA combination. Such cross-ladder results illustrate scale mismatch; they are not proposed production labels.

| Variant | n | AA | AC | CA | CC |
|---|---:|---|---|---|---|
| classic4 | 900 | 900,0,0,0,0,0,0,0,0,0 | 900,0,0,0,0,0,0,0,0,0 | 900,0,0,0,0,0,0,0,0,0 | 900,0,0,0,0,0,0,0,0,0 |
| classic6 | 1020 | 597,66,10,222,79,29,16,1,0,0 | 597,66,10,0,221,80,46,0,0,0 | 663,10,168,101,53,11,12,2,0,0 | 626,42,7,173,82,65,25,0,0,0 |
| classic9 | 1230 | 200,200,204,241,116,85,160,24,0,0 | 0,399,141,64,212,145,246,23,0,0 | 395,179,176,146,120,44,76,55,35,4 | 196,204,198,161,99,158,125,84,5,0 |
| mega12 | 270 | 0,80,38,44,4,35,19,36,14,0 | 0,73,8,40,17,28,54,50,0,0 | 0,87,41,32,17,18,11,10,16,38 | 0,80,23,29,18,27,29,23,40,1 |
| mega16 | 270 | 0,80,26,39,15,34,6,0,70,0 | 0,51,29,31,15,34,40,70,0,0 | 0,81,22,35,26,19,16,1,0,70 | 0,62,22,20,22,38,35,1,17,53 |
| diagonalX | 630 | 100,100,101,192,3,4,11,63,56,0 | 0,200,40,62,100,94,15,119,0,0 | 198,75,86,124,17,0,2,12,23,93 | 99,101,99,67,84,50,5,20,92,13 |
| hyper | 630 | 100,167,46,167,6,18,28,84,14,0 | 0,200,69,45,58,114,46,98,0,0 | 199,92,87,90,33,8,15,26,45,35 | 100,167,39,75,67,53,26,58,44,1 |
| jigsaw9 | 630 | 100,155,56,178,6,13,26,74,22,0 | 0,200,61,52,61,121,40,95,0,0 | 197,95,78,97,35,7,16,22,36,47 | 98,157,50,70,69,58,27,46,53,2 |
| killer | 389 | 60,151,3,110,2,0,0,45,18,0 | 0,60,151,3,65,47,0,63,0,0 | 60,151,58,55,2,0,22,13,10,18 | 58,62,102,52,40,12,24,20,18,1 |
| greaterThan | 630 | 77,167,153,54,11,38,8,88,34,0 | 12,139,110,138,14,49,47,121,0,0 | 122,219,79,59,22,0,8,14,46,61 | 97,145,137,42,38,42,8,51,67,3 |
| samurai | 270 | 0,80,40,37,6,29,28,20,30,0 | 0,80,0,40,10,33,58,49,0,0 | 0,80,46,32,10,18,12,14,12,46 | 0,80,24,25,22,17,31,19,39,13 |
| sohei | 270 | 0,80,37,40,6,33,34,20,20,0 | 0,80,0,38,12,33,72,35,0,0 | 0,85,38,34,16,12,15,15,17,38 | 0,80,25,24,19,25,28,28,31,10 |
| butterfly | 270 | 0,94,27,39,5,37,19,34,15,0 | 0,80,14,27,2,42,57,48,0,0 | 0,97,28,37,9,24,10,9,18,38 | 0,80,29,18,24,20,35,24,38,2 |
| flower | 270 | 0,96,27,16,30,29,6,30,36,0 | 0,80,21,23,1,44,36,65,0,0 | 0,101,22,34,17,17,9,5,14,51 | 0,80,31,15,13,35,26,11,51,8 |
| wordoku | 630 | 100,100,101,123,58,48,88,12,0,0 | 0,199,69,33,104,77,138,10,0,0 | 196,92,86,74,63,25,44,34,16,0 | 97,103,98,81,48,84,74,43,2,0 |
| **All** | **8309** | **2234,1616,869,1502,347,432,449,531,329,0** | **1509,1907,723,596,892,941,895,846,0,0** | **2930,1444,1015,950,440,203,268,232,288,539** | **2271,1443,884,852,645,684,498,428,497,107** |

The native AA/CC grades agree on **6081/8309 = 73.19%**. A is one level higher on 124 cases, one lower on 1845, and two lower on 259. This is disagreement between grading conventions, not an error rate against human ground truth.

Full per-cohort and all eight factorial distributions: `E\cross-distributions.json` and `.tsv`.

## 2.4 Cross-size consistency

I reproduced Claude's metric exactly: for each eligible variant/peer-tier cell with at least ten cases, take the median score relative to the classic9 median of that tier; average the absolute log₂ ratios, equally weighting cells. It excludes classic4, just as its script does.

| Score model | Mean absolute log₂ shift | Maximum | Cells above one log₂ unit |
|---|---:|---:|---:|
| Current raw terms, no floor/scaling | 1.003 | 3.911 | 29/61 |
| C square-root, C weights | 0.645 | 2.429 | 13/61 |
| A peak/log, A weights | **0.398** | **1.363** | **3/61** |
| Peak/log, C weights | 0.347 | 1.204 | 1/61 |
| Square-root, A weights | 0.744 | 2.451 | 15/61 |

The shape advantage is not just a different weight scale: peak/log remains more size-compressed when both use C's weights.

The stricter comparison uses **exact hardest standard-technique IDs**, rather than broad tiers, on the geometry families: classic4, classic6, classic9, Mega12, Mega16, Samurai, Sohei, Butterfly, Flower. It includes classic4 and has 53 eligible comparison cells:

| Native bundle | Mean absolute log₂ shift | Mean absolute median-grade shift | Maximum median-grade shift |
|---|---:|---:|---:|
| AA | **0.326** | **0.321** | **1** |
| CC | 0.672 | 0.755 | 2 |

CC's two-grade shifts occur for Mega16/simpleColouring, Mega16/nishio, and Flower/simpleColouring. Thus “same skill, at most one level more” is an aspiration, not a property demonstrated by C's ladder.

**Limitations:** matching the hardest ID does not match the rest of the proof. A large puzzle may genuinely require a broader or longer repertoire. A nearly constant scorer could also make this statistic artificially good. That is why these numbers are considered alongside anchors, monotonicity, and controlled peak/volume cases rather than used as the sole objective. [E\cross-size.json]

## 2.5 Volume versus peak, and low tiers on large boards

### Real singles-only outputs

| Variant | Singles-only cases | E range | A score min–max | C score min–max | Native grades |
|---|---:|---:|---:|---:|---|
| classic4 | 900 | 8–12 | 15.1–20.4 | 17.0–20.8 | both veryEasy |
| classic6 | 597 | 18–26 | 26.9–34.6 | 25.5–34.7 | both veryEasy |
| classic9 | 399 | 40–47 | 42.3–46.6 | 37.9–46.1 | both veryEasy/easy |
| mega12 | 73 | 72–84 | 54.0–57.9 | 50.9–63.6 | both easy |
| mega16 | 51 | 130–148 | 63.9–67.0 | 68.4–84.7 | both easy |
| samurai | 80 | 186–215 | 68.7–71.7 | 81.8–95.2 | both easy |
| sohei | 80 | 146–168 | 65.6–68.1 | 72.5–81.9 | both easy |
| butterfly | 80 | 72–84 | 54.0–57.4 | 50.9–57.7 | both easy |
| flower | 80 | 95–126 | 58.9–64.1 | 58.5–69.9 | both easy |

Both formulas successfully avoid calling these large singles-only puzzles hard/expert. The distinction is how much repeated/broader moderate work can promote a puzzle, not whether square-root completely fails the basic volume test. [E\cross-singles.json]

My own ladder also relabels the current large-board veryEasy outputs as easy. I should have quantified this more prominently in phase 1.

### Low grades are still feasible on the same large boards

I constructed puzzles from full solutions using a naked-single-only removal oracle. For **40 holes with rotational180 symmetry**, every large variant below is valid, unique, and solved by exactly 40 naked singles:

| Variant | Seed | Clues | A score / grade | C score / grade |
|---|---:|---:|---|---|
| mega12 | 4136147405 | 104 | 42.3 / veryEasy | 37.947 / veryEasy |
| mega16 | 4069036929 | 216 | 42.3 / veryEasy | 37.947 / veryEasy |
| samurai | 310623034 | 329 | 42.3 / veryEasy | 37.947 / veryEasy |
| sohei | 3604891360 | 248 | 42.3 / veryEasy | 37.947 / veryEasy |
| butterfly | 4251666723 | 104 | 42.3 / veryEasy | 37.947 / veryEasy |
| flower | 1222074455 | 149 | 42.3 / veryEasy | 37.947 / veryEasy |

There are also 20-hole and approximately 47-hole controls under both none/rotational180 symmetry in `E\cross-dense.json`. Dense puzzles may be an aesthetic choice, but their existence means “hide veryEasy because the current dig overshoots” is the wrong fix.

### Controlled stress vectors

`E\cross-controlled.json` holds identical count vectors across E=8,20,41,53,92,156,263,369, with either singles alone or one X-Wing/W-Wing/forcingChain/Nishio added. These are **arithmetic controls, not claimed unique puzzles**; an all-empty 369-cell multigrid is not a valid singles-only Sudoku.

They show both models let a genuinely expensive step outrank hundreds of cheap placements. A additionally bounds the entire empty term by 80 and keeps any all-singles trace on the current ≤369-cell boards below about 77. C can eventually promote a sufficiently long mixed-singles trace to medium, but still not to an extreme tier on these sizes.

The real classic6 example is the useful small-grid stress case: it has one Nishio and several wings, not merely a tiny puzzle with a large empty fraction. Both formulas recognize it as high-end; they disagree by one adjacent band.

## 2.6 Monotonicity under clue removal

All 3,983 supplied pairs are unique after removal and have complete logical proofs before and after.

| Formula | Numerical score decreases | Percentage | Native level decreases | Worst level decrease |
|---|---:|---:|---:|---:|
| Current raw terms | 149 | 3.741% | not compared here | — |
| A peak/log, tenth-point score | **141** | **3.540%** | **9 (0.226%)** | 2 |
| A peak/log, unrounded | 144 | 3.615% | — | — |
| C square-root | 177 | 4.444% | 21 (0.527%) | 1 |
| Peak/log with C weights | 102 | 2.561% | ladder-dependent | — |
| Square-root with A weights | 185 | 4.645% | ladder-dependent | — |

Cross-ladder level-drop counts are AA=9, AC=13, CA=22, CC=21. Thus both law and thresholds matter.

Neither report should present input monotonicity as clue-removal monotonicity. The proof trace can change drastically. The worst relative numerical decreases are about 50.7% for A and 55.3% for C. The generator should not permanently blacklist a removal solely because it was too hard or technique-stuck at an earlier state. [E\cross-monotonic.json]

## 2.7 Solver-path robustness

For the same forty classic9 puzzles and twenty digit permutations per puzzle:

| Quantity | A | C |
|---|---:|---:|
| Cases with an unrounded score change | 6/40 | 6/40 |
| Cases with a changed published numerical score | 3/40, due partly to rounding | 6/40 |
| Worst within-case max/min score ratio | **1.097** | 1.324 |
| Cases with native grade changes | 0/40 | 2/40 |

The cross-ladder counts are revealing: AA=0, AC=2, CA=0, CC=2. In this probe the no-grade-change result is substantially attributable to the A band's boundary positions, not solely the formula.

The special classic6 instance remains unchanged under all 100 relabellings for both formulas. Digit relabelling tests scan-order sensitivity; they do not test every alternative proof strategy or establish that a used technique is necessary in all human solutions. [E\cross-path.json; E\cross-summary.json]

## 2.8 Reference puzzles

The original labels are not all independent human anchors: eighteen are constructed fixtures with technique certificates. Both models put the four famous hard references in their native second nightmare tier.

| Fixture | A score → native grade | C score → native grade |
|---|---|---|
| wikipedia-example | 47.3 → easy | 42.849 → easy |
| classic-easy | 46.5 → easy | 42.000 → easy |
| classic-easy-2 | 44.7 → veryEasy | 40.249 → easy |
| classic-medium | 47.8 → easy | 46.177 → easy |
| escargot | 3689.4 → nightmare2 | 6936.338 → nightmare2 |
| worlds-hardest-2012 | 3894.6 → nightmare2 | 7980.378 → nightmare2 |
| platinum-blonde | 3860.9 → nightmare2 | 7474.160 → nightmare2 |
| golden-nugget | 3904.6 → nightmare2 | 8007.256 → nightmare2 |
| constructed-veryEasy-1/2/3 | 42.8 each → veryEasy | 38.419 each → veryEasy |
| constructed-easy-1/2/3 | 45.6 / 46.1 / 45.6 → easy | 41.134 / 43.077 / 41.134 → easy |
| constructed-medium-1/2/3 | 226.9 / 295.1 / 222.5 → medium | 132.223 / 165.224 / 143.892 → medium |
| constructed-hard-1/2/3 | 559.6 / 563.5 / 553.7 → hard | 360.590 / 367.254 / 384.930 → hard |
| constructed-expert-1 | 940.4 → veryHard | 790.152 → expert |
| constructed-expert-2 | 908.5 → veryHard | 611.311 → expert |
| constructed-expert-3 | 879.2 → veryHard | 535.312 → veryHard |
| constructed-evil-1/2/3 | 2177.9 / 2148.7 / 2148.0 → evil | 4280.574 / 4053.738 / 3844.524 → nightmare1 |

All four crossed mappings are preserved in `E\cross-anchors.json`. Preserving old labels more often is not, by itself, evidence that one formula is more human-accurate.

## 2.9 Highest observed complete-proof scores

This table includes verified-status baseline/intervention/climb records, not simulation rows lacking a `solved` field. Maxima for the two formulas need not be the same individual puzzle.

| Variant | Highest A score / grade | Highest C score / grade |
|---|---|---|
| classic4 | 20.4 / veryEasy | 20.78 / veryEasy |
| classic6 | 2475.5 / nightmare1 | 2499.36 / evil |
| classic9 | 3746.3 / nightmare2 | 8698.59 / nightmare2 |
| mega12 | 4300.3 / nightmare2 | 13739.19 / nightmare3 |
| mega16 | 4825.0 / nightmare2 | 18586.86 / nightmare3 |
| diagonalX | 4450.7 / nightmare2 | 14117.95 / nightmare3 |
| hyper | 4296.6 / nightmare2 | 13459.13 / nightmare3 |
| jigsaw9 | 4539.6 / nightmare2 | 15937.64 / nightmare3 |
| killer | 5028.3 / nightmare2 | 17915.56 / nightmare3 |
| greaterThan | 4258.5 / nightmare2 | 11278.41 / nightmare3 |
| samurai | 4547.4 / nightmare2 | 18176.26 / nightmare3 |
| sohei | 4565.5 / nightmare2 | 17345.38 / nightmare3 |
| butterfly | 4272.6 / nightmare2 | 12628.10 / nightmare3 |
| flower | 4657.1 / nightmare2 | 17896.80 / nightmare3 |
| wordoku | 3658.5 / nightmare2 | 7857.89 / nightmare2 |

Seeds, exact source files/lines, and counts for every maximum are in `E\cross-maxima.json`.

**Interpretation:** these are lower bounds on what is attainable, not absolute maximum theorems or a finished `difficultySupport` table. Some climb witnesses are asymmetric. The labels “nightmare2” and “nightmare3” are not comparable physical units across models.

# 3. Revised position on the eight headline differences

| Headline | Decision | Reason |
|---|---|---|
| 1. Formula shape | **Keep peak/log; retain square-root as the additive alternative** | Better cross-size compression and numerical clue-removal/path behaviour on the common corpus; neither has human validation |
| 2. Weights | **Keep the frozen A table for the initial candidate; merge the peer-technique calibration rationale** | Both tables are hypotheses. The crossed-weight peak/C model is promising, but copying its weights/bands without refitting can lose useful lower-band coverage; lower variance alone is not a human-calibration objective |
| 3. Ladder / IDs | **Keep A thresholds; change IDs to `nightmare1`, `nightmare2`; bound the initial catalogue** | Uniform serialization is simpler. Two extra tiers suffice for the observed A range; future tier changes must be explicit/versioned |
| 4. Classic6 | **Change the “routine/ceiling” language on both sides** | Valid easy/medium/evil under C exist; rare A-nightmare1 exists. No size-only expert ceiling; production support requires target-generation validation |
| 5. Killer | **Merge local structure search; reject synthetic guesses** | All saved climb endpoints are complete, and selected high-tier results reproduce; proof/symmetry guards and reproducible witnesses still need production treatment |
| 6. Large boards | **Keep size-free scoring; change the low-tier generator** | Both original formula bundles relabel today's large veryEasy outputs as easy; dense symmetric veryEasy puzzles demonstrably exist |
| 7. Floor-removal numbers | **Merge, with corrected denominators and operations** | Static relabelling and regenerated-search cost are different experiments; the percentages and the 2→35 sample result are compatible |
| 8. Generation / maxima | **Merge complementary strategies; reject hard ceilings inferred from one strategy** | Existing high-candidate generation reaches C-nightmare3 Mega16 quickly; local search extends structures; native tier names differ mainly because score scales differ |

I am **not** claiming that all of A's individual weights are superior to C's. The factorial result is explicit: peak/log with C weights has even smaller spread/decrease counts. That is a useful calibration candidate, but it is not a complete independently calibrated ladder/generator package. For example simply combining peak/log, C weights, and C's unchanged ladder promotes classic9's old veryEasy anchor to easy and leaves no veryHard in the primary classic9 sample. A new hybrid deserves its own calibration rather than being presented as an established improvement.

# 4. Concrete implementation candidate after this review

This section is a recommendation for the later implementation phase. No repository implementation has been made here.

## 4.1 Score and constants — now

Keep the A numerical score exactly:

```text
P = max used weight, or 0
W = Σ weight × uses
V = 80E/(E+40)
R = .25P log₂(1+W/P), or 0 when P=0
score = round(10(P+R+V))/10
```

Only `E` and technique counts enter it. The numerical score must not read level bands, requested level, variant ID, or total board size. Unknown technique IDs without a versioned weight are not silently assigned a guessed cost.

For v2 metadata, `hardestTechnique` should be the used technique with the highest weight, with ties broken by higher existing registration `order`, then ID. The group remains descriptive, not a level owner. This changes rating metadata, not the solver's application order.

| Techniques | Weights |
|---|---|
| nakedSingle, hiddenSingleBox, hiddenSingleLine | 1, 1.25, 1.5 |
| pointing, boxLine | 40, 50 |
| nakedPair, hiddenPair, nakedTriple, hiddenTriple, nakedQuad, hiddenQuad | 120,145,180,220,260,300 |
| xWing, simpleColouring, swordfish, jellyfish | 320,360,420,520 |
| xyWing, xyzWing, wWing, uniqueRectangle | 650,750,850,900 |
| forcingChain, nishio | 1100,1700 |
| cageCombo, ruleOf45, cageSplit | 40,260,520 |
| ineqChain, minMaxForcing | 40,180 |

These constants are pinned engineering priors for a first version, **not claimed human measurements**. Keep the existing 26 technique IDs, registered solving order, maximum chain length 12, and Nishio depth 2. New IDs such as `nishio2`, altered hint strategies, and human-fitted weights are later work.

## 4.2 Exact initial ladder and names — now

| ID | English | Vietnamese | Score band |
|---|---|---|---:|
| `veryEasy` | Very easy | Rất dễ | `[0,45)` |
| `easy` | Easy | Dễ | `[45,180)` |
| `medium` | Medium | Trung bình | `[180,400)` |
| `hard` | Hard | Khó | `[400,700)` |
| `veryHard` | Very hard | Rất khó | `[700,1000)` |
| `expert` | Expert | Chuyên gia | `[1000,1500)` |
| `evil` | Evil | Địa ngục | `[1500,2400)` |
| `nightmare1` | Nightmare 1 | Ác mộng 1 | `[2400,3600)` |
| `nightmare2` | Nightmare 2 | Ác mộng 2 | `[3600,∞)` |

This explicitly revises my original unbounded ID scheme: **nine IDs in the first implemented catalogue**, two nightmare tiers, no automatically growing picker. A later version can split at 5400, 8100, … if actual complete-proof distributions warrant it. This bounded catalogue is simpler to validate and serialize now. It does not change the grades of any measured complete A-scored puzzle.

## 4.3 Complete-proof policy — now

- A generated puzzle is eligible for publication only after valid givens, independent uniqueness verification, and a complete canonical logical solve.
- `solved:false`, contradiction, unknown technique weight, or exhausted rating budget means **unrated**, not evil/nightmare. Do not score a partial trace as if it solved the puzzle.
- A generation search may retain the best **fully rated** puzzle and return it with the existing approximate-difficulty warning after deterministic work caps are exhausted.
- If there is no fully rated candidate, return a controlled generation error through the existing error UI. Do not fabricate a guess count.
- Legacy imported puzzles with old metadata remain playable. Proof certification for *newly generated v2 ratings* must not become a reason to delete old player progress or reject an otherwise valid old puzzle document.

## 4.4 Search design and initial limits — now, followed by mechanical qualification

**Low tiers:** start from the full solution and check the score ceiling during removal; do not blindly remove about 53% of the cells before the first score-aware phase. This permits veryEasy on large boards without changing the scorer.

**Middle tiers:** retain bounded logical oracles and guided removal. Technique-cost pruning can be derived from the score law instead of level-owned groups. For A, a used weight `w` implies at least `round₀.₁(1.25w)` points before additional work/empties, so a technique can be excluded from a candidate trace when that lower bound is already outside the requested upper edge. Final acceptance still uses the full canonical rater.

**High tiers:** retain a cheap uniqueness/bottleneck proposal strategy as well as bounded digging. The proposal heuristic is not the published difficulty score and must not assign labels. Rate proposed endpoints once, then accept by the actual target interval or refine them. Do not force every high-tier candidate through the slow tightly capped strategy that produced the Mega16 simulation timings.

**Local search:** clue-group removal/re-addition/swaps; sign removal/reinsertion; Killer cage merges/boundary moves and downward refinements where necessary. Preserve connected, distinct-digit cages and configured clue-mask symmetry. Do not silently turn a rotational180 request into `none`. Larger legal Killer cages may be a visible change in generated puzzle structure, not in the rules of play.

For an initial deterministic implementation, retain or use:

| Control | Proposed initial value / treatment |
|---|---|
| Full-grid attempts | Existing default 8; respect the current user setting |
| Dig samples per grid | Existing 12; 30 for coarse symmetry groups |
| Guided candidate pool | Keep the current `max(4,min(32,round(32×81/cells)))` initially |
| Local proposed moves, including rejected ones | Maximum 1024 for ≤81 cells; 256 for larger boards |
| Local-candidate uniqueness work guard | 200,000 checks, as in the useful peer prototype |
| Logical rating work guard | Initial 5,000,000 checks; incomplete/budget-limited candidate is ineligible, not top-rated |
| Outer cancellation/time protection | Keep the existing 120,000 active-ms hard guard |
| Qualification p95 goals | 2 s for classic4/6; 10 s for other ≤81-cell boards; 30 s for larger boards |

The last row is a **performance qualification target**, not a wall-clock rule that silently changes which “best” puzzle a seed returns.

Determinism matters: stop at the first target hit, or after fixed work caps; return the closest complete candidate only after those deterministic caps. An outer time cancellation should remain an error, as now, rather than returning a machine-speed-dependent best puzzle under an apparently reproducible seed. This revises the overly broad wall-time best-so-far suggestion in my independent report.

These move/guard constants are proposed starting limits, not already measured production success guarantees for every A-target band. The prototype and common-corpus results establish feasibility and promising strategies; the implemented pipeline must still be qualified.

## 4.5 `difficultySupport` — now, measured rather than guessed

- Do not set a theoretical maximum from board size, except where it is actually established, as for classic4.
- Measure each candidate variant/tier with **200 fixed validation seeds**, distinct from tuning seeds, under declared options, symmetry, engine version, and work/time limits.
- Count success only if the puzzle is valid, unique, completely rated, and in the exact target band. Timeouts, unsolved traces, approximate results, and unsupported/missing outputs remain failures in the denominator.
- Initial exposure criterion: at least **95% success**, two-sided 95% Wilson lower bound at least **90%**, and p95 within the table above. For n=200, 190/200 has a lower bound about 91.0%.
- Treat support as a set, not necessarily a prefix. Hide tiers that fail qualification; keep valid exceptional/imported puzzle labels unclamped.
- Start with default profiles and existing `none`/rotational180 settings; record which profile was validated. Stricter symmetries and additional variant options need separate evidence rather than an unconditional promise.
- The picker uses the resulting capability table. No new “advanced difficulty” screen or budget control is required.

Under the current evidence, discovery should investigate veryEasy only for classic4; through rare nightmare1 for classic6; and through nightmare2 for the other thirteen variants. **This is a discovery range, not the release support matrix.**

# 5. Explicit UI, display, compatibility, and behaviour changes

The preferred score is **not separable** as `Σ techniqueSubtotal(t,n_t) + emptySubtotal(E)`: `P` and `W` couple techniques. It therefore does not honestly fit the existing independent per-technique subtotal semantics without a change. I do not hide that behind the word “additive.”

## 5.1 Recommended transparent score display

Keep the existing Summary and Generation Steps locations and the technique inventory, but:

1. Remove **“Bonus points for difficult techniques.”**
2. Show each technique's uses, fixed **weight**, and **weighted uses/input work** `w_t n_t`, rather than claiming that raw work is its independent final-point subtotal.
3. Add explicit contribution rows for **Peak technique contribution `P`**, **Reasoning workload `R`**, and **Empty cells `V`**.
4. The displayed Total is the canonical score and equals the sum of the displayed contribution rows. Use the existing rounding/apportionment idea in tenths so displayed parts add exactly.
5. Change relevant column/help text to distinguish input work units from score contributions. Do not let readers sum the input-work column and obtain a different apparent Total.
6. Show the canonical tenth-point score where needed, trimming `.0`. Otherwise a displayed integer 45 could misleadingly accompany a true 44.9 veryEasy rating. History should preserve the v2 canonical score, not round it to a different band boundary.

This is a **limited score-table redesign**, not a new screen, control, or game mechanic.

### Minimal-layout alternative without changing the formula

If retaining one subtotal per technique is strongly preferred, allocate the computed technique total explicitly:

```text
q_t = R × (w_t n_t / W)
      + P/m if t is one of the m used IDs tied for maximum weight,
        otherwise +0.
```

Then `Σq_t + V = P+R+V`. The same existing rows can add to the score after tenth-point apportionment. However, `q_t` is an **allocated score share depending on the whole trace**, not an independent marginal/unit cost. The column/help must say so. This preserves layout more closely but is less transparent than separate peak/work rows; I prefer the transparent version under the user's latest clarification.

### Closest evaluated genuinely additive fallback

If independent technique subtotals become a hard requirement again, Claude's
`Σ c_t√n_t + 5√E`, with its matching weights and ladder, is the fully evaluated separable alternative. Its table can show `c_t√n_t` per technique and `5√E` for empties. Do not keep A's bands while swapping in that formula.

## 5.2 All other implied changes

| Surface / behaviour | Explicit change, or explicit preservation |
|---|---|
| Level picker | Add veryHard/nightmare1/nightmare2 in the existing control; hide unsupported entries using measured capability data. No new screen/control |
| Level names and hints | Add the exact en/vi names above; descriptions become typical-technique guidance plus score meaning, not one group owned by each level |
| Help | Replace first-use/linear-empty/floor/size-scaling explanations with the new formula and clearly explain the input-work versus final-contribution distinction |
| Summary and Steps | Use the same rater/version and contribution display. Unrated intermediate steps remain unavailable, not fake top-tier scores |
| Generation Steps replay | Local cage/sign changes require truthful model/log handling. Prefer choosing the cage structure in `extraStructure` before ordinary digging, or restart the replay segment on the chosen final structure. Do not reuse a pre-search dig log against a different final cage model |
| History row | Keep its current location and “level, score, seed” style; preserve decimal v2 scores and identify legacy ratings when ambiguous. Do not silently relabel a saved v1 score using v2 bands |
| Default adjustment messages | Existing nearest-supported-level handling remains; if a capability change adjusts a selection, use the existing notification mechanism with accurate text |
| Symmetry and options | Preserve the user's selected settings. The research climb's symmetry-breaking behavior must not be copied silently |
| Generated puzzle structure | Clues, cage shapes/sizes, signs, and selected proofs can change; these are intended generation changes. Sudoku/Killer/inequality rules do not change |
| Generation timing/fallback | More/different candidate searches can change time and attempt counts. Fixed work caps preserve reproducibility; the existing approximate warning and error/cancel UI are reused |
| Cache and pre-generation | Version cache identity and update measured time estimates. Some newly heavy tiers may not be prefetched under the existing pre-generation limit |
| Generator URLs | Add generator/rating version metadata while retaining `d`. No visible version selector is required |
| Old seed-only URLs/history | Exact old reproduction cannot be promised without a preserved legacy generator or a puzzle snapshot. A minimal release may regenerate with v2 and show a legacy-regeneration note; it must not silently reuse the old score |
| JSON/wire/exchange | Keep existing puzzle geometry/givens/solution and token encoding; add generator/rating/catalogue version and score-part metadata. Missing rating version means legacy |
| Rating metadata | `hardestTechnique` follows the new weights instead of the old group-first order. Any retained `confidence` is only band margin, not statistical or human confidence |
| Player importer/locales | Recognize the new IDs and names, retain old files, and treat unknown/legacy rating metadata nonfatally |
| Player puzzle IDs/progress | Do **not** include the rating version in content identity. An unchanged puzzle must retain its save/progress identity |
| Gameplay, input, hints | No new rules, keypad, note mode, shortcuts, timer behaviour, or hint technique ordering in this release |
| Tests/docs | New numerical expectations and deliberate generator hash changes are expected, but unrelated UI/gameplay tests should continue to pass; changed hashes must be reviewed, not blindly all replaced |

Use distinct version concepts: the **rating version** covers weights/bands/catalogue interpretation; the **generator version** covers search, seed forks, and work caps. Both belong in reproduction/cache metadata. Old exported puzzle arrays remain authoritative and playable even when their rating is legacy.

# 6. What remains later, and what is essential before implementation is accepted

## Essential now

- One pure scorer with the exact constants above; no technique floor or size-scaled grade table.
- Complete-proof eligibility, independent uniqueness, and truthful approximate/error handling.
- Correct low-tier construction and score-targeted/high-proposal search.
- Respect for configured symmetry and accurate replay/model data.
- Deterministic work limits and explicit versioning.
- Common score precision across classification, Summary, Steps, history, and export.
- Qualification of offered tiers on the implemented pipeline, not only rescoring.
- Existing gameplay/interaction/import tests remain valid except for explicitly changed score/level/display contracts.

## Later, not blockers for the first version

- Blinded human timing and perceived-difficulty calibration.
- New Nishio-depth/chain-length/cage-complexity technique IDs.
- Alternative-proof portfolios or minimum-proof scoring, which would also need alignment with player hints.
- Additional nightmare tiers beyond the initial two.
- Further weight-table changes, including the promising peak/log + C-weight hybrid, after fitting and validating a complete matching ladder.

## Candid summary of corrections to my independent report

1. My small classic6 support forecast used “routinely” too loosely; observed high scores are not a measured new-generator success rate.
2. My endpoint maxima and short final summary needed stronger existence-versus-support wording.
3. I did not quantify the loss of the old large-board veryEasy labels prominently enough or isolate Stage A as the immediate low-band blocker.
4. My three-versus-six path-change count comparison partly benefited from rounding; the unrounded amplitude comparison is the fair intrinsic result.
5. I lacked the clue-removal experiment and actual cage local-search prototype that Claude supplied.
6. My original unbounded/mixed nightmare ID scheme was not the simplest implement-now format; the revised finite, uniformly named catalogue is preferable.
7. A time-limited best-so-far return can break seed reproducibility; the revised recommendation uses deterministic work exhaustion for approximate returns.
8. My cost table remains a hypothesis. The positive engineering comparisons do not turn it into validated human difficulty.

# Appendix — Reproduction, files, and integrity

All new scripts are in `A\experiments` (not part of the repository), use only built-in Node modules, and write only `cross-*` files there. No dependency installation or application-code modification was needed.

From the workspace folder that held the repositories and the experiment folders:

```powershell
$p = '<experiment folder of gpt-6-astra>'
node "$p\cross-compare.cjs"
node "$p\cross-counterexamples.cjs"
node "$p\cross-search.cjs"
node "$p\cross-compatibility.cjs"
node "$p\cross-audit.cjs"
```

`cross-common.cjs` is the shared read-only corpus/formula loader. The compare script uses the peer's upper-median convention (`floor(p×n)`) to reproduce its shift statistic; the phase-1 report used nearest-rank, so even-sample medians should not be compared without noticing that convention.

| Script / outputs | Contents and bounds |
|---|---|
| `cross-common.cjs`; `cross-initial-integrity.json` | Formula/ladder definitions, corpus normalization, duplicate matching, hashes of both independent reports |
| `cross-compare.cjs`; `cross-summary.json` | Counts, overlap audit, floors, cross-size, monotonicity, path summary, native grade agreement |
| `cross-distributions.json` / `.tsv` | Both authors' corpora, primary deduplicated corpus, search/simulation cohorts; all eight formula-weight-ladder combinations |
| `cross-size.json` | Peer metric replication, exact-technique geometry/all-variant comparisons, cell-level medians/shifts |
| `cross-monotonic.json` | All 3,983 pairs, by variant; worst examples with peer source line references |
| `cross-path.json` | Forty classic9 cases/800 permutations and one classic6 case/100 permutations |
| `cross-anchors.json` | All 26 fixtures with both formulas and both ladders |
| `cross-maxima.json` | Maximum complete-proof observations with seed, counts, original file/line |
| `cross-singles.json`; `cross-controlled.json` | Real singles-only subsets; separately marked synthetic peak/volume controls |
| `cross-counterexamples.cjs`; `cross-classic4-exhaustive.json` | Exhaustive classic4 check; ten-minute outer safeguard, completed in well under one second here |
| `cross-dense.json` | 36 actual large-board puzzles: six boards ×three hole targets ×two symmetry settings; generation guards 15 s /5m work checks |
| `cross-classic6-cases.json` | Validity/uniqueness/rerating of easy, medium, evil and the disputed nightmare example |
| `cross-incomplete.json` | Reproduced zero-given Killer failure and exact fictitious-guess arithmetic |
| `cross-taxonomy.json` | Four published anchors, Nishio depth counts, alias-splitting and doubled-weight controls |
| `cross-search.cjs`; `cross-legacy-portfolio.json` | Twenty Mega16 requests, at most twelve old-evil proposals each; base seed 20261023; 15 s /20m per proposal, ten-minute outer safeguard |
| `cross-climb.json`; `cross-climb-witnesses.json` | Six selected Killer audits; eight seconds per local search, at most two seconds per candidate rating; full final puzzle models retained |
| `cross-compatibility.cjs`; `cross-compatibility.json` | Sixty before/after requests using the twenty existing Fibonacci seeds and the repository's actual hash function |
| `cross-audit.cjs`; `cross-symmetry.json` | Rotational-mask audit of all 193 peer search endpoints |
| `cross-validation.json` | Reloaded/rerated six full witnesses; unchanged independent reports and input hashes |
| `cross-input-manifest.json` | SHA-256 and sizes of the input datasets and scorer modules |
| `cross-repository-state.txt` | Final read-only repository status checks |

The timings were measured on the shared machine, not in an isolated browser benchmark. New search samples are small feasibility/audit experiments, not release support certification. Every individual run was bounded below approximately fifteen minutes.

Final integrity requirements:

```powershell
git status --short                        # in sudoku-generator
git -C ..\sudoku-player status --short    # the sudoku-player checkout next to it
```

Both must remain empty. Both independent `report.md` hashes must remain unchanged. The recorded checks are in the files above.
