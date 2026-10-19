# Difficulty and scoring in the Sudoku generator — independent research

**Researcher:** gpt-6-astra  
**Date:** 2026-10-19  
**Scope:** Research, source inspection, and isolated experiments only. No implementation changes, task creation, or edits to either application repository. This report is in English following the superseding language instruction.

## Reading guide and evidence

- `G\…` means the sudoku-generator repository (paths from its root); `P\…` means the sudoku-player repository. Thus `G\js\core\difficulty.js:448–479` is a source `path:line` citation.
- `E\…` means my experiment folder (scripts and raw data), which is not part of the repository. JSONL line numbers identify individual reproducible trials. Aggregate tables are reproducible with `E\summarize.cjs` and `E\evidence.cjs`.
- Generator revision: `fb07fef5cc466705989525e697fb0ddfedc287cd`; player revision: `e64b01e6b9f5f92b4d10fcef26d46809b6e610fe`. Runtime: Node `v26.8.2`, Windows.
- **Observation**, **inference**, and **proposal** are distinguished throughout. Existing labels are not human ground truth; successfully generating an old `evil` puzzle is not the same as validating the proposed `nightmare` tier.
- No other researcher's directory was read during this independent phase.

## Executive summary

1. The application has **six**, not seven, levels. `veryHard` is missing. It must be added between `hard` and `expert`, rather than treated as an existing ID. See A1.
2. The current numerical rating is a calibrated technique sum plus `0.6 × empty cells`, raised to a minimum taken from the **level table**. Both that floor and the score bands scale by `cellCount / 81`. This is the modeling circularity the user wants removed. See A2/B1.
3. The logical solver's `report.score` is **not** the puzzle's `rating.score`: it uses different costs. Its technique order also follows registered `order`, not the calibrated costs. See A2.
4. All **670 supported-configuration trials** hit their requested old level and independently passed uniqueness, valid-solution, and givens/subset checks. This is 10 trials per each of 67 configurations, not evidence of universal 100% reliability. See A4/Appendix.
5. **45/670** baseline ratings were floor-raised, including **10/10 Samurai hard**. Removing the floor while retaining the other settings materially changes search cost: Samurai hard's median sample count rose from 2 to 35 when enough work budget was supplied. See B1.
6. The present upper-level menus are often **policy/search gates, not mathematical ceilings**. Ungating alone produced old `evil` puzzles for Killer, Greater-Than, Wordoku, both Mega grids, and every multigrid. See A4/B3.
7. Killer needs more than a menu change for robust high-end generation. On 30 held-out seeds, default cage sizing gave 24 old-`evil` labels, but only 23 were fully logically solved; `cageSize: 2` gave 30 labels and 29 complete logical solutions. See B3.
8. **Do not assume 6×6 cannot be difficult.** Its current medium/hard targets are poor, but ungated expert/evil targets work much more often. A concrete 6×6 instance requires Nishio under this solver and scores in the proposed first nightmare band. Hiding high tiers solely because the grid is small would contradict the evidence. See B3/C3.
9. I propose one score using **only empty-cell count and technique-use counts**:  
   `S = round₀.₁(80E/(E+40) + P + 0.25P log₂(1+W/P))`,  
   where `P = max used technique weight` and `W = Σ weight × uses`; the technique term is zero when no technique is used. There is no level-, variant-, or grid-size-dependent score term. See C1.
10. Proposed band starts are **0, 45, 180, 400, 700, 1000, 1500, 2400, 3600**, corresponding to the seven required levels, `nightmare`, and `nightmare-2`. Further nightmare boundaries multiply by 1.5; initially only the first two extra tiers should be candidates for exposure. See C2.
11. These are **prototype weights and thresholds, not validated human difficulty measurements**. They distinguish peak reasoning from workload, but technique granularity, especially Nishio depth and cage arithmetic, needs human calibration. See C1/C5.
12. Importantly, `solved: false` must mean **unrated/incomplete proof**, not “automatically top difficulty.” A real zero-given Killer example remains unsolved even after increasing the existing chain/depth limits. See B3.
13. Versioning the rater, technique catalogue, generator, links, history, and cache is necessary. Old seeds alone cannot guarantee the same puzzle after the digging objective changes. The old player drops unknown difficulty metadata rather than necessarily rejecting the puzzle. See A5/C4.
14. The existing difficulty suite passed **114/114** tests. Repository cleanliness is checked separately; all experiment scripts and outputs are outside both repositories. See Appendix.

# Part A — How it works today

## A1. Levels and every level-dependent generation setting

### The actual ladder

`SG.difficulty.LEVELS` and the variant registry both contain exactly:

```text
veryEasy, easy, medium, hard, expert, evil
```

`BASE_GROUPS` has six entries in matching positions: `basic, locked, subset, fish, wing, chain`. Allowed groups are cumulative, with `cage` and `ineq` appended at **every** level; technique `variantScope` then limits their applicability. There is no `veryHard` entry. [G\js\core\difficulty.js:100–116,315–318,351–379; G\js\variants\registry.js:17,137–145]

The following bands and clue counts are the **9×9 reference**, not universal numbers:

| ID | English / Vietnamese name | Score band | `minClues` / `maxClues` | `minCluesPerUnit` | Newly allowed standard group | Oracle |
|---|---|---:|---:|---:|---|---|
| `veryEasy` | Very easy / Rất dễ | `[0,72)` | 40 / 50 | 2 | `basic` | techniques |
| `easy` | Easy / Dễ | `[72,180)` | 34 / 40 | 2 | `locked` | techniques |
| `medium` | Medium / Trung bình | `[180,400)` | 29 / 34 | 1 | `subset` | techniques |
| `hard` | Hard / Khó | `[400,800)` | 25 / 30 | 1 | `fish` | techniques |
| `expert` | Expert / Chuyên gia | `[800,1500)` | 22 / 27 | 0 | `wing` | techniques |
| `evil` | Evil / Địa ngục | `[1500,∞)` | 17 / 24 | 0 | `chain` | unique/DFS |

Source: G\js\core\difficulty.js:207–216,351–379; G\js\ui\locale.en.js:117–130; G\js\ui\locale.vi.js:115–128.

The displayed descriptions are:

| ID | English description | Vietnamese description |
|---|---|---|
| `veryEasy` | “Many clues. Only single-digit moves are needed: naked and hidden singles.” | “Nhiều số cho sẵn. Chỉ cần các nước đi đơn giản: ô một ứng viên và số đơn ẩn (Naked / Hidden Single).” |
| `easy` | “Slightly fewer clues. Adds locked candidates: pointing pairs and box/line reduction.” | “Ít số cho sẵn hơn một chút. Thêm kỹ thuật ứng viên bị khóa: cặp chỉ hướng (Pointing) và loại trừ khối–hàng/cột.” |
| `medium` | “Needs pairs, triples and quads of candidates (naked and hidden subsets).” | “Cần các cặp, bộ ba và bộ bốn ứng viên (tập con trần và ẩn).” |
| `hard` | “Needs fish patterns (X-Wing, Swordfish, Jellyfish) and simple colouring.” | “Cần các mẫu ‘cá’ (X-Wing, Swordfish, Jellyfish) và tô màu đơn giản.” |
| `expert` | “Needs wings (XY-Wing, XYZ-Wing, W-Wing) and Unique Rectangles.” | “Cần các kỹ thuật cánh (XY-Wing, XYZ-Wing, W-Wing) và Unique Rectangle.” |
| `evil` | “The hardest level: forcing chains and trial and error (Nishio), with very few clues.” | “Mức khó nhất: chuỗi suy luận và thử–sai (Nishio), với rất ít số cho sẵn.” |

The quoted wording is descriptive UI text, **not an exact classifier contract**: a long sequence of easier techniques can already score into a higher band. [G\js\ui\locale.en.js:117–130; G\js\ui\locale.vi.js:115–128; G\tests\suites\difficulty.test.js:446–451]

### Scaling and clue-floor overrides

For `C = model.cellCount`, `D = model.digits`, let `a = C/81`.

- Every lower and upper score boundary is multiplied by `a`; there is no rounding of the band boundary.
- The standard minimum clue count is `max(1, floor(referenceMinClues × a))`.
- If the variant declares `clueFloorScale[level]`, that integer minimum is multiplied by the factor, rounded to six decimal places to avoid floating-point artifacts, floored, and bounded below by 1.
- A declared `clueFloor` table or function then overrides that result. A missing key in a declared table means **0**, not “use the default.” A function receives `(level, model, derivedFloor)`.
- `maxClues = max(minClues, max(1, round(referenceMaxClues × a)))`.
- Unit minima are `floor(referenceMinCluesPerUnit × D/9)`.
- `maxClues` is informative; the digger actually enforces the minimum, not the nominal maximum. `extraPasses` is 1 for every level, but the guided digger does not use it. [G\js\core\difficulty.js:234–289,321–379; G\js\core\digger.js:875–913]

All levels use `rotational180` by default. The same five removal orders are available: `random`, `rowByRow`, `snake`, `spiral`, `jumpOne`. The normal cell strategy enables guided digging from `medium` upward; Killer overrides this to guide every level. Default limits are eight full-grid attempts and twelve digs per grid, increased to thirty digs when symmetry orbits contain more than two cells. These are search settings, not scoring terms. [G\js\core\difficulty.js:216,375; G\js\core\digger.js:71,645–670,866–913,1253–1267; G\js\variants\killer.js:891–903]

The UI warns about `rotational90` and `mirrorBoth` from `expert` upward. That is another hard-coded level-dependent policy to revisit when inserting `veryHard`. [G\js\ui\controls.js:36–46]

### Killer's additional level-dependent settings

The intended cage-size distribution is itself selected by requested level:

| Requested level | Target percentages for cage sizes |
|---|---|
| `veryEasy`, `easy` | 2:45%, 3:40%, 4:15% |
| `medium` | 2:30%, 3:35%, 4:25%, 5:10% |
| `hard`, `expert`, `evil` | 2:15%, 3:30%, 4:30%, 5:20%, 6:5% |

The `cageSize` option shifts this distribution by a bounded tilt `-2…2`. Targets are 2–6 cells; absorbing leftovers can grow a cage to 7. The layout-repair phase allows 0 repairs for very easy/easy/medium and 12 for hard/expert/evil; individual analyses are bounded at 30,000 work units, the repair effort at 250,000, and the reveal fallback at 24 cells. Notably, `evil` settings already exist although the UI support list excludes `evil`. [G\js\variants\killer.js:44–60,515–521,749–799]

### Performance targets are not run-time difficulty bands

The repository's p95 targets, in milliseconds, are:

| Variant family | veryEasy | medium | hard | expert | evil |
|---|---:|---:|---:|---:|---:|
| classic9 | 60 | 150 | 400 | 900 | 2500 |
| diagonalX, hyper | 80 | 200 | 500 | 1200 | 3000 |
| jigsaw9 | 150 | 350 | 900 | 2000 | 5000 |
| wordoku | 100 | 250 | 600 | 1500 | — |
| killer, greaterThan | 300 | 700 | 1800 | 4000 | — |
| mega12 | 400 | 1000 | 3000 | — | — |
| mega16 | 1500 | 4000 | 10000 | — | — |
| butterfly | 1000 | 3000 | 8000 | — | — |
| samurai, sohei, flower | 3000 | 8000 | 20000 | — | — |

Classic4/classic6 instead have 10 ms veryEasy and 20 ms easy targets. The formal table generally omits easy. These targets are test/calibration expectations; the worker's ordinary run budget is **120,000 active milliseconds**, not the individual table cell. A core pipeline call without a supplied budget has no such automatic timeout. [G\tests\fixtures\perf-helper.js:29–60; G\tests\soak.js:113–122; G\js\worker\worker-client.js:39–40,91,469; G\js\core\pipeline.js:203–223]

## A2. Exact scoring computation

### Costs and application order

`baseCost` belongs to a technique registration. `SG.difficulty.COSTS` overrides it for puzzle rating, falling back to `baseCost` if absent. Both the raw solver and the rater use a **global** first-use multiplier of 1.5; there is no per-technique `firstUseMultiplier` registration field. [G\js\core\difficulty.js:116,175–198,298–312; G\js\core\logical-solver.js:34–39; G\js\core\techniques.js:113–114,215–222]

| Technique ID | Group | Registered `baseCost` | Current rating cost |
|---|---|---:|---:|
| nakedSingle | basic | 1 | 1 |
| hiddenSingleBox | basic | 2 | 1.25 |
| hiddenSingleLine | basic | 3 | 1.5 |
| pointing | locked | 7 | 7 |
| boxLine | locked | 7 | 8 |
| nakedPair | subset | 9 | 63 |
| hiddenPair | subset | 11 | 77 |
| nakedTriple | subset | 15 | 105 |
| hiddenTriple | subset | 18 | 126 |
| nakedQuad | subset | 24 | 168 |
| hiddenQuad | subset | 24 | 182 |
| xWing | fish | 32 | 190 |
| simpleColouring | fish | 36 | 215 |
| swordfish | fish | 42 | 250 |
| jellyfish | fish | 56 | 335 |
| xyWing | wing | 48 | 480 |
| xyzWing | wing | 54 | 540 |
| wWing | wing | 60 | 600 |
| uniqueRectangle | wing | 66 | 660 |
| forcingChain | chain | 90 | 720 |
| nishio | chain | 140 | 1120 |
| cageCombo | cage | 10 | 10 |
| ruleOf45 | cage | 28 | 28 |
| cageSplit | cage | 40 | 40 |
| ineqChain | ineq | 12 | 12 |
| minMaxForcing | ineq | 22 | 22 |

Sources: G\js\core\difficulty.js:175–198; G\js\core\tech-basic.js:407–420; G\js\core\tech-subset.js:248–275; G\js\core\tech-fish.js:553–578; G\js\core\tech-wing.js:588–626; G\js\core\tech-chain.js:588–605; G\js\core\tech-cage.js:644–659; G\js\core\tech-ineq.js:534–550. `E\inventory.json` records the loaded definitions independently.

The solving loop sorts by `order`, then `baseCost`, then ID. It applies the first effective finding and restarts at the beginning. It **does not reorder by `COSTS`**. For example, `cageCombo` has order 55; `nakedPair` 60; `ineqChain` 65; `ruleOf45` 95; `cageSplit` 135; `xyWing` 140; `jellyfish` 160. Thus “cheapest first” in comments does not mean cheapest under the calibrated score, and a full unrestricted solve can follow a different path from a restricted oracle. [G\js\core\techniques.js:167–176; G\js\core\logical-solver.js:128–144,280–334; technique registrations cited above]

### Mathematical form

Let:

- `n_t > 0` be the recorded number of applications of technique `t`;
- `b_t` its registered cost, `c_t` its calibrated/fallback cost;
- `E` the actual initial empty-cell count;
- `B = [0,72,180,400,800,1500]`;
- `a = C/81`;
- `g(t)` the index of its standard group, with `cage` and `ineq` mapped to 0.

The solver produces:

```text
R_solver = round_to_6_decimals(0.6E + Σ b_t(n_t + 0.5)).
```

The rater reconstructs the empties rather than receiving them directly:

```text
Ê       = max(0, round((R_solver − Σ b_t(n_t + 0.5)) / 0.6))
T       = Σ c_t(n_t + 0.5)
rawScore = T + 0.6Ê
h       = max_t g(t), or 0 if no technique was used
h       = 5 instead if report.solved !== true
score   = max(rawScore, a B_h)
level   = LEVELS[max { i : score ≥ a B_i }].
```

There is no final integer rounding in `classify`. The solver rounds to six decimals; the empty count uses integer rounding; the UI/history then apply their own display/persistence rounding. `techniqueScore(id,count)` returns `c_t(count + 0.5)` for a positive count and 0 otherwise. [G\js\core\logical-solver.js:327–333,371–406; G\js\core\difficulty.js:311–318,384–424,448–479]

`hardestTechnique` in the rater is selected by **group tier first**, calibrated cost second, and registration order third. This differs from the solver's base-cost-first choice. A `cageSplit` can lose the “hardest” field to a lower-cost `pointing` because `cage` is tier 0 and `locked` tier 1. The selected highest tier drives the floor. [G\js\core\difficulty.js:393–424; G\js\core\logical-solver.js:329–333]

`confidence` is distance from the nearest band boundary, normalized by half a band width and clamped to `[0,1]`. The top band uses its lower bound as the width. It is **not statistical confidence**, proof completeness, or measured human agreement. `solved:false` still receives a top-band rating. [G\js\core\difficulty.js:448–477]

`rate(model,givens)` runs the full logical technique set with `assumeUniqueness:true`. It does not itself prove uniqueness. Generation supplies that guarantee separately. Variant ID affects applicable techniques and the constraint model; cell count affects bands/floor; the **requested level is not an argument to `rate`**. [G\js\core\difficulty.js:491–503; G\js\core\logical-solver.js:128–144; G\js\core\digger.js:974–990]

### Worked example from a generated puzzle

`classic9`, requested `hard`, seed **1592778586**, 53 empty cells:

```text
nakedSingle       29 uses:  1 × 29.5    =  29.500
hiddenSingleBox   19 uses:  1.25 × 19.5 =  24.375
hiddenSingleLine   5 uses:  1.5 × 5.5   =   8.250
pointing           5 uses:  7 × 5.5     =  38.500
nakedPair          1 use : 63 × 1.5    =  94.500
xWing              1 use :190 × 1.5    = 285.000
53 empty cells             53 × 0.6    =  31.800
rawScore                                511.925
fish floor                              400.000
rating.score = max(511.925,400)          511.925 → hard
```

The raw solver score is **216.8**, not 511.925, because it charges 2/3 for hidden singles, 9 for a naked pair, and 32 for X-Wing. The puzzle is unique, solved logically, and required seven dig samples in this run. [E\baseline.jsonl:71; E\evidence.json, `examples` entry with this seed]

A floor-bound example is Samurai seed **2073087849**: 263 empties, `rawScore=1201.175`, but `score=400×369/81=1822.222222…`. The extra **621.047222…** points are exactly the UI's “Bonus points for difficult techniques.” [E\baseline.jsonl:491]

## A3. Generation toward a requested level

### Pipeline and random streams

The seven steps are `configure → buildModel → fullGrid → extraStructure → dig → rate → tune`.

1. Configuration validation checks that the requested level is supported **before generation**. Default level is medium; default `maxAttempts` is 8. The model is built once using the `model` random stream.
2. For each attempt, the digger generates a complete solution using `grid#A`, then runs a variant hook using `extra#A`.
3. It digs several samples of that solution using `dig#A.T`, rates each, and returns the first exact level match.
4. Thus a new attempt can change Killer cages or Greater-Than signs, but does not rebuild a Jigsaw region model or reselect the Wordoku word/line within the same pipeline call. [G\js\core\pipeline.js:38–42,77–126,229–300; G\js\core\digger.js:1253–1348]

The full grid is randomized DFS with MRV branching and propagation. Generic restart threshold is `cellCount × 50` failed guesses; after 50 restarts the final search has no backtrack cutoff, though a supplied budget still applies. Classic9 seeds independent diagonal boxes; Mega12/Mega16 use their own diagonal-box seed and thresholds 300/400; multigrids seed overlaps. Wordoku `fixedCells` constrain full-grid construction, not later solving or clue retention. [G\js\core\full-grid.js:1–29,210–300; G\js\variants\classic.js:79–100; G\js\variants\mega.js:21–29,65–90; G\js\variants\multigrid.js:275–304; G\js\variants\wordoku.js:7–12]

### The normal cell dig

**Stage A:** start from the full solution; construct a cell order; combine cells into symmetry orbits; process each group once. Groups are skipped if already rejected, below the minimum clue count, or violating a unit minimum. Removed groups are restored on failure.

- For the technique oracle, the puzzle must be completely solved with the requested technique set and `assumeUniqueness:false`.
- For a uniqueness oracle, `dfs.stillUnique` checks removed values against alternatives.
- The argument for uniqueness from a complete logical proof depends on the techniques being sound; uniqueness-dependent deductions are deliberately disabled in that oracle. [G\js\core\digger.js:229–260,265–330,494–627]

**Stage B:** from medium upward, Stage A hands over at `max(minClues, round(0.47 × cellCount))` remaining clues. The guided pass scores candidate removals and keeps the best:

```text
candidatePoolLimit =
  max(4, min(32, round(32 × 81 / cellCount))).
```

This means up to 32 candidates for 9×9, 18 for 144-cell boards, 10 for Mega16, and 7 for Samurai. Candidates are shuffled first; rejected cells remain blacklisted for the rest of the pass. [G\js\core\digger.js:645–652,736–813,866–913]

For levels below evil, a removal is admissible only if the restricted solver finishes and the classified score is **strictly below the requested band's upper edge**. Among admissible removals, the greatest score wins. There is no lower-bound requirement per removal.

For evil, removal must preserve uniqueness. The objective solves **without chain techniques**: a completed lower-technique solve contributes its rating; otherwise the objective is `1e9 + remainingUnsolvedCells`. This deliberately searches for bottlenecks beyond wings, rather than directly optimizing the final full-rater score. [G\js\core\digger.js:673–717]

Every dug candidate is checked again with `dfs.countSolutions(...,2)`. An ambiguous logical dig triggers a safe DFS dig and the warning `digger.unsoundTechnique`. Then the full unrestricted rater runs. A hit is simply `rating.level === requested`; it does **not additionally require `rating.solved`**. [G\js\core\digger.js:974–990,1106–1150]

### Variant strategies

- **Killer:** grow cages from the solution, optionally repair layout ambiguity, then run the cell dig with unit clue minima disabled and guided digging always on. The only absolute numeric clue floor is 40 for veryEasy, otherwise 0. Layout repair optimizes uniqueness/ambiguity, not the final human-technique score. [G\js\variants\killer.js:749–799,837–903]
- **Greater-Than:** start with every eligible sign, remove numeric clues, reveal enough symmetric clue groups to satisfy floors/solvability, remove signs with technique and then uniqueness checks, and reveal more clues if the result is too hard. It allows up to eight additional tuning rounds. The sign pattern itself is not symmetric. Its final “too hard” test compares rating level indices. [G\js\variants\greater-than.js:8–27,47–48,314–493]
- **Jigsaw:** the shape is generated in `build`, including feasibility checks, then the common cell strategy operates on that model. [G\js\variants\jigsaw.js:647–657,698–751,773–801]
- **Wordoku:** its word is a solution-construction/presentation device, not a clue that the logical solver can use. The word line is dug like any other line. [G\js\variants\wordoku.js:2–12,259–280,387–401]

### Retries, fallback, and failures

The search returns the first exact hit or, after all attempts, the closest sample by:

```text
1000 × absolute level-index gap + normalized score distance outside the target band.
```

A non-exact result carries `difficulty.approximate`. This is a **valid puzzle fallback**, not an exception. But an exhausted/cancelled budget propagates as an error; it does not automatically return the best puzzle found so far. `budget.check()` counts work units on every call and samples elapsed time every 1024 checks. These “nodes” are work ticks across several routines, not a hardware-independent difficulty measure. [G\js\core\digger.js:1166–1173,1337–1382; G\js\core\pipeline.js:212–223; G\js\core\budget.js:16,42–98]

Reasons for a missed level include upper/lower band mismatch, clue/unit floors, symmetry granularity, insufficient or path-dependent technique coverage, a limited candidate pool, greedy/no-backtracking removals, a cage/sign structure that contains insufficient or excessive information, attempts exhausted, or a budget error. These are distinct from proving that no puzzle of the requested difficulty exists. The examples in B3 demonstrate several of these distinctions.

## A4. Per-variant matrix and measured attainability

### Current configuration

`VE/E/M/H/X/V` below abbreviate `veryEasy/easy/medium/hard/expert/evil`. “Empty range” is the observed min–max across the supported-level baseline, **not a theoretical range**. Every supported combination was sampled ten times; full distributions and raw line ranges are in Appendix 2.

| Variant ID | Digits; cells; canvas | Currently offered | Effective minimum clues in offered order | Extra technique family | Observed empty range | Definition evidence |
|---|---|---|---|---|---:|---|
| classic4 | 4;16;4×4 | VE,E | 7,6 | none | 8–10 | G\js\variants\classic.js:18–22,125–130 |
| classic6 | 6;36;6×6 | VE,E | 17,15 | none | 18–20 | G\js\variants\classic.js:118–130 |
| classic9 | 9;81;9×9 | VE,E,M,H,X,V | 40,34,29,25,22,17 | none | 41–56 | G\js\variants\classic.js:125–130 |
| mega12 | 12;144;12×12 | VE,E,M,H | 71,60,51,44 | none | 72–92 | G\js\variants\mega.js:65–90 |
| mega16 | 16;256;16×16 | VE,E,M,H | 126,107,91,79 | none | 130–158 | G\js\variants\mega.js:65–90 |
| diagonalX | 9;81;9×9 | VE,E,M,H,X,V | 40,34,24,20,17,17 | generic unit techniques | 41–61 | G\js\variants\extra-regions.js:36,177–203 |
| hyper | 9;81;9×9 | VE,E,M,H,X,V | 40,34,24,20,17,17 | generic unit techniques | 40–63 | same |
| jigsaw9 | 9;81;9×9 | VE,E,M,H,X,V | 40,34,24,20,17,17 | generic unit techniques | 41–63 | G\js\variants\jigsaw.js:773–801 |
| killer | 9;81;9×9 | VE,E,M,H,X | 40,0,0,0,0 | cageCombo, ruleOf45, cageSplit | 41–81 | G\js\variants\killer.js:888–903,1087–1100 |
| greaterThan | 9;81;9×9 | VE,E,M,H,X | 40,34,24,20,17 | ineqChain, minMaxForcing | 32–63 | G\js\variants\greater-than.js:511–531 |
| samurai | 9;369;21×21, 5 grids | VE,E,M,H | 182,154,79,67 | generic unit techniques | 186–266 | G\js\variants\multigrid.js:56–72,319–353 |
| sohei | 9;288;21×21, 4 grids | VE,E,M,H | 142,120,61,52 | generic unit techniques | 146–210 | same |
| butterfly | 9;144;12×12, 4 grids | VE,E,M,H | 71,60,30,26 | generic unit techniques | 72–114 | same |
| flower | 9;189;15×15, 5 grids | VE,E,M,H | 93,63,40,34 | generic unit techniques | 95–150 | same |
| wordoku | 9;81;9×9 | VE,E,M,H,X | 40,34,29,25,22 | none | 40–55 | G\js\variants\wordoku.js:211–280,575–585 |

The above actual model sizes/specifications are also recorded by `E\inventory.cjs` in `E\inventory.json`. Defaults were used: e.g. Jigsaw compactness 0.6, Killer cageSize 0, Greater-Than box-local signs, and Wordoku's default placement. Combined diagonal/hyper options and other profiles are not covered by the 670-puzzle baseline.

`clueFloorScale` is `{medium:.83,hard:.8,expert:.8}` for diagonalX, hyper, jigsaw9, and greaterThan. Multigrids use `{medium:.6,hard:.6}`, with flower additionally `easy:.8`. Killer declares `{veryEasy:40}` as an absolute table. The other variants have no such override. These are generation adjustments; they do not change `rate`'s coefficients. [Definition citations above; G\js\core\difficulty.js:249–271]

### First hidden-level probe

Only `difficultySupport` was widened **in process memory**. All other generation settings remained unchanged. Five samples per each of the 23 unoffered combinations; base seed `20261019`; 115 trials, all returned unique valid puzzles and all completed their logical solve.

| Variant(s) | Hidden target | Exact old-level hits | Interpretation |
|---|---|---:|---|
| classic4 | M,H,X,V | 0/5 each | Small-board high targets not found |
| classic6 | M,H | 0/5 each | Does not establish that X/V are impossible |
| classic6 | X,V | 4/5 each | Counterexample to a simple size ceiling |
| mega12, mega16 | X,V | 5/5 each | Current cap is not a demonstrated puzzle-space limit |
| samurai, sohei, butterfly, flower | X,V | 5/5 each | Same |
| killer, greaterThan, wordoku | V | 5/5 each | All three can already generate old evil |

Source: `E\unsupported.jsonl:1–115`; exact score/empty distributions in `E\unsupported-summary.json`.

### Held-out high-level probe

A second base seed, **20261020**, and 30 trials per variant were used to challenge the optimistic 5/5 findings. These are **old evil targets**, not a new-score generator:

| Variant | Exact old evil | Old score min / median / max | Complete logical proofs | E\high-heldout.jsonl lines |
|---|---:|---:|---:|---:|
| classic9 | 30/30 | 1500.0 / 4517.4 / 12412.3 | 30/30 | 1–30 |
| mega12 | 30/30 | 2666.7 / 12289.2 / 37169.4 | 30/30 | 31–60 |
| mega16 | 30/30 | 28702.2 / 54032.4 / 129525.1 | 30/30 | 61–90 |
| diagonalX | 30/30 | 4759.8 / 21020.5 / 52307.0 | 30/30 | 91–120 |
| hyper | 30/30 | 2048.0 / 8982.0 / 28748.7 | 30/30 | 121–150 |
| jigsaw9 | 30/30 | 1500.0 / 13550.9 / 40995.2 | 30/30 | 151–180 |
| killer | **24/30** | 1080.5 / 3813.8 / 64129.5 | **29/30** | 181–210 |
| greaterThan | 30/30 | 2574.2 / 16364.0 / 50119.3 | 30/30 | 211–240 |
| samurai | 30/30 | 6833.3 / 23404.4 / 46182.0 | 30/30 | 241–270 |
| sohei | 30/30 | 5333.3 / 16739.2 / 82744.4 | 30/30 | 271–300 |
| butterfly | 30/30 | 2880.3 / 14807.0 / 35333.9 | 30/30 | 301–330 |
| flower | 30/30 | 5497.8 / 20988.6 / 40547.4 | 30/30 | 331–360 |
| wordoku | 30/30 | 1511.9 / 3455.4 / 12411.9 | 30/30 | 361–390 |

All 390 puzzles passed independent uniqueness/solution/givens checks. For Killer, the intersection “exact evil **and** complete proof” is **23/30**, not 29/30 or 24/30.

**Uncertainty:** 10/10 successes have a two-sided 95% Wilson lower bound of about 72.2%; 5/5 about 56.6%; 30/30 about 88.6%. Consequently these runs establish examples and search behavior, not production support certification. “Maximum observed” is a lower bound on attainability, never a proof of an absolute maximum.

## A5. Where levels and scores appear or persist

| Surface | Current behavior and evidence |
|---|---|
| Summary / “Difficulty Score” table | Technique uses, unit cost, per-technique contribution, empty-cell contribution, and residual raise to the floor. The raise is shown when ≥0.5; displayed integer parts are apportioned to sum to the rounded total. G\js\ui\result-view.js:94–153,167–180,553–559 |
| Generation Steps score table | Reconstructs the same additive breakdown and floor residual for intermediate puzzles. G\js\ui\step-view.js:307–355,516–523 |
| Replay `rateStep` | Intermediate ordinary cell-dig states may be rerated, with a 400 ms budget; final state reuses result rating; unratable steps return null. G\js\ui\player.js:74,568–622 |
| History list | Saves requested and achieved level and **rounded integer** score. Renders “level: score, seed”, with the last six seed characters. Reopening regenerates from stored configuration. G\js\ui\history.js:79–123,316–334 |
| Difficulty picker | Iterates global levels and filters `isSupported`; its hint is `difficulty.<id>.desc`. G\js\ui\controls.js:178–187 |
| State adjustment | Changing variant chooses the nearest supported level; ties go to the easier one. G\js\ui\store.js:217–232,250–254 |
| Generator URLs | The `d` parameter is read only when present in the known level list; export of configuration writes `d`. G\js\ui\store.js:387,451 |
| Preferences/configuration | `sg.prefs.v1`, `sg.lastConfig.v1`, storage version 1; difficulty is part of persisted configuration. G\js\ui\store.js:48–65,691–694 |
| History identity | `sg.history.v1`; key includes variant, requested difficulty, seed, symmetry, removal order, attempts, variant options, but no rater/generator version. G\js\ui\history.js:25–26,60–66 |
| Cache identity/result | `sg.cache.v1`, schema 1, 20 results. Keys include variant/difficulty/seed/symbols/symmetry/order/attempts/options, not algorithm version. Equality compares level and score as well as puzzle content. G\js\ui\cache.js:82–83,150–179,289–295,330–338 |
| Pre-generation scheduling | A separate variant/level cost table controls eligibility. Unknown levels estimate Infinity and are not pre-generated; ordinary pool work has an 8 s limit. This is not a rating table. G\js\ui\cache.js:88–119,191–195 |
| JSON export | `sudoku-generator/v1`; difficulty includes `requested`, `achieved`, `score`, `hardestTechnique`, `techniqueCounts`, and optional rawScore/group/confidence/solved/empties. G\js\ui\export.js:177–190,200–244 |
| Readable text export / print | Uses achieved/localized level alongside variant and seed; readable header format is documented as `#n,variant,level,seed`. G\js\ui\export.js:145–155; G\design.md:1795 |
| Exchange tokens | JSON/text compressed or plain payloads in `#puzzle=…`; exchange transports data, rather than interpreting a difficulty ladder. G\js\ui\exchange.js:3–26,39–51 |
| Worker wire format | Version 1 transports rating and config directly; it reconstructs the model, not the difficulty semantics. G\js\core\pipeline.js:330–332,371–422 |
| Player import | Separate six-ID `LEVELS`; unknown requested/achieved values become null. If both are unknown, difficulty info becomes null; **this is not a whole-puzzle rejection**. P\js\ui\importer.js:70,703–713 |
| Player translations / techniques | Its locales repeat the six names/descriptions. Its own solver supplies hints and retains only the raw design score; it does not classify puzzles. Technique-ID/meaning changes affect its copy too. P\js\ui\locale.en.js:93–106; P\js\ui\locale.vi.js:93–106; P\js\core\logical-solver.js:1–20; P\js\core\tech-chain.js:1–9 |
| Help | Assumes level index corresponds one-for-one to a `BASE_GROUPS` entry; lists current scaled score/clue rules. G\js\ui\help.js:268–305,1198–1210 |

The floor row's English label is exactly **“Bonus points for difficult techniques”**, Vietnamese **“Điểm thưởng cho kỹ thuật khó.”** Removing only these strings/rows would hide the circularity without removing it. [G\js\ui\result-view.js:553,589; G\js\ui\step-view.js:516,544]

### Tests, fixtures, and documentation pinning the current behavior

- `difficulty.test.js` asserts the exact six IDs, the clue ranges, scaled bands, cumulative groups, technique floor, and the rule that unsolved puzzles are evil. These are expected behavior changes, not tests to preserve blindly under a new specification. [G\tests\suites\difficulty.test.js:85–95,125–157,184–212,428–480]
- Rated fixtures distinguish eight externally named/reference puzzles from eighteen constructed technique-certificate examples. Their labels are not all independent human calibration data. [G\tests\fixtures\rated.js:8–25,43–95,98–139]
- Soak gates classic9 at ≥90% and other supported configurations at ≥80%; invariant I5 couples score-band membership and allowed technique groups. A score-only classification requires revising that second conjunct, not just changing six numbers. [G\tests\soak.js:24–27,119–122,268–276,407–428]
- Regression hashes intentionally exclude rating/timings/trace but include puzzle/solution, cage/sign structure, regions, and symbols. A changed score objective can therefore change hashes **indirectly**, through different digging choices. The fixture uses 20 Fibonacci seeds and 25 variant/level combinations. [G\tests\fixtures\perf-helper.js:10–17,132–150,174 onward]
- Relevant documentation includes design §§6.6/6.7/6.8/9.1, README scoring/calibration and variant/technique extension guidance, and the final report's explicit acceptance of floor-heavy multigrid scoring. [G\README.md:90–94,295,583,695,723–731,767–775; G\design.md:468–523,1766–1772,1803; G\docs\report-v1.md:57–58]

# Part B — Diagnosis

## B1. The floor's circularity and the consequences of removal

The exact dependency is:

```text
technique group → the level index introducing that group
               → that level's band minimum
               → numerical score
               → level classification.
```

This is **not an infinite computational recursion**, nor direct use of `config.difficulty` inside `rate`. It is a specification-level dependence of numerical score on the very ladder it is supposed to determine. Editing a band edge can change an unchanged puzzle's numerical score. `cage`/`ineq` do not receive a specialized floor because their tier is 0; unsolved reports receive the top level's floor. [G\js\core\difficulty.js:393–424,448–456]

### Observed dependence

45/670 baseline puzzles receive a raise. Every one would move down at least one old band if the same trace were simply rescored without the floor. Major affected cells:

| Configuration | Floor-raised / sampled |
|---|---:|
| samurai medium | 8/10 |
| samurai hard | **10/10** |
| sohei medium | 8/10 |
| sohei hard | 9/10 |
| mega12 hard | 4/10 |
| mega16 medium / hard | 1/10 / 2/10 |
| butterfly hard | 2/10 |
| diagonalX hard | 1/10 |

Source: E\baseline-summary.json; E\evidence.json `demotions`; raw ranges in Appendix 2. The sampled classic9 cells had no floor-bound outputs; that does not prove the floor never binds on classic9.

### Important acceptance-test distinction

For an already solved **restricted** candidate below evil, its used groups cannot exceed the allowed tier. Therefore its technique floor `F` satisfies:

```text
F ≤ requestedBand.min < requestedBand.max
max(rawScore,F) < requestedBand.max  ⇔  rawScore < requestedBand.max.
```

So **removing the floor does not, by itself, change that individual candidate's upper-bound admissibility at a fixed state**. It does change the **objective ordering/ties**, the subsequent path, final classification, required retries, and how quickly the target's lower bound is reached. For evil, the DFS admissibility predicate likewise stays the same; the solved-below-chains objective can change. Greater-Than's full-rating “too hard” decisions can change more directly, because it is a separate strategy using the achieved level. [G\js\core\digger.js:685–717; G\js\variants\greater-than.js:453–480]

This distinction matters: “remove the floor and every dig acceptance changes” would be an incorrect description of the code.

### Paired generation ablation

`E\measure.cjs --nofloor` replaces exported `classify` and `rate` **only in memory**, using `rawScore` and the unchanged old scaled bands. Same 670 seeds/configurations; same 15 s / 5,000,000-work-unit per-puzzle guard:

- Baseline: 670 exact results; floor-free: 664 exact results and six `budget.exceeded` errors, all Samurai hard.
- Samurai medium median samples: **2 → 6**.
- Sohei medium median samples: **2 → 4**; hard: **4 → 11**.
- A repeat capturing error details confirms the Samurai failures hit the **node/work limit**, not the 15 s timeout.
- Raising only Samurai's work limit to 100,000,000 gave **10/10 exact hard** again, but median samples **35**, maximum **83**, versus baseline median 2. Measured median wall time was approximately **70 ms → 1146 ms**. These are observations on the shared host, not portable performance claims.

Sources: E\nofloor.jsonl:1–670; E\nofloor-samurai-detail.jsonl:1–10; E\nofloor-samurai-generous.jsonl:1–10; E\evidence.json `floorPairs`.

**Conclusion:** removal is feasible, but keeping the old size-scaled bands is a poor “minimal fix.” Removing the floor and redesigning the scale/search objective belong to the same conceptual change.

## B2. Cross-variant inconsistencies

1. **The score and the level use different size treatment.** Technique costs and `0.6E` are unnormalized, while band edges and technique floors grow linearly with total cells. One fish on a large board can be numerically too weak for its advertised tier and acquire hundreds of synthetic floor points. Samurai seed 2073087849 illustrates this directly.
2. **Easy volume is both rewarded and normalized.** Solving a larger board creates more placements plus a larger empty term, but higher bands then compensate for size. Peak reasoning is not compensated in the same way. This produces the floor-heavy large-board clusters rather than one coherent workload or peak-difficulty interpretation.
3. **Costs were calibrated on classic9.** The documented multipliers are subset ×7, fish approximately ×6, wing ×10, chain ×8, with compressed single costs. Other variants mainly calibrate clue floors, not a shared human scale. This is explicitly admitted in the source/README, not independently reproduced historical calibration. [G\js\core\difficulty.js:121–173; G\README.md:767–775]
4. **Variant techniques remained on the old base-cost scale.** A cage split costs 40 versus a naked pair's 63 and an X-Wing's 190; Rule of 45 costs 28; min/max forcing 22. These ratios were not established by the classic-only multiplier search. Moreover, all cage/inequality techniques are allowed even at veryEasy. [A1/A2 sources]
5. **“Hardest” has variant bias.** A locked-candidate step outranks any cage technique in `hardestTechnique` because of tier, regardless of actual cognitive complexity. That field is not currently a cross-variant peak-difficulty measure. [G\js\core\difficulty.js:393–424]
6. **Application counts are not standardized units of mental work.** A finding can contain several placements/eliminations; one cage combination or inequality chain may summarize a substantial deduction. Nishio silently uses propagation, including registered variant extensions, inside a trial. Same technique ID does not necessarily mean equal proof length or effort. [G\js\core\logical-solver.js:220–264,335–344; G\js\core\tech-cage.js:11–28; G\js\core\tech-chain.js:56–72]
7. **Labels can be driven by repetitions rather than a new technique.** The real Killer hard example at E\baseline.jsonl:391 has 48 `cageCombo`, eight pointing, seven boxLine applications, and no standard technique above locked. Similarly, all ten sampled hyper medium outputs rescore as easy under the proposed peak-aware metric. This is a change of intended meaning, not proof the old labels were subjectively wrong.
8. **Deterministic does not mean path-independent.** Source comments already acknowledge score decreases after some clue removals. In my 800 digit-relabelling solves of 40 classic9 puzzles, old numerical score changed for six puzzles, with a worst within-puzzle max/min ratio 1.611; the prototype changed for three, worst ratio 1.097. Neither system changed a level in this specific probe. This is limited evidence of improved numerical robustness, not invariance to all solver strategies. [G\js\core\difficulty.js:156–164; E\order-probe-summary.json; E\order-probe.json]

## B3. Why some variants do not reach high levels

### Separate the four questions

1. Does a suitably hard **unique puzzle exist** in the variant space?
2. Does the implemented logical solver find a **complete explanatory proof**?
3. Does the generator find it **within its search/budget/profile**?
4. Does `difficultySupport` let the user **request** it?

The current cap often answers only question 4. The data must not be interpreted as a theorem about question 1.

### Killer

The `expert` cap is a literal support-list entry; an `evil` cage distribution, repair policy, and generic DFS-oriented dig already exist. Ungating worked on 5/5 discovery seeds and 24/30 held-out seeds. But the held-out result is less robust than the discovery run, and one exact label has no complete logical proof. [G\js\variants\killer.js:44–51,519,1092; E\unsupported.jsonl:61–65; E\high-heldout.jsonl:181–210]

The remaining search bottleneck is **cage structure**, not just numeric clue removal. At zero givens, a fixed cage layout cannot be made harder by removing another digit. Repairs mostly improve uniqueness, and a layout can be unique yet easy under cage techniques. Reusing twelve dig samples of essentially the same zero-given layout has limited benefit. This is an inference from the strategy and zero-given observations, not a claim that every repeated sample is identical. [G\js\variants\killer.js:749–799,837–903; E\unsupported.jsonl:61–65]

**Controlled cage-size ablation:** same 30 held-out seeds, with only `variantOptions:{cageSize:2}` changed:

| Metric | Default `cageSize:0` | `cageSize:2` |
|---|---:|---:|
| Exact old evil label | 24/30 | 30/30 |
| Exact old evil and complete proof | 23/30 | 29/30 |
| Complete proof, score ≥2400 under proposal | 19/30 | 22/30 |
| Complete proof, score ≥3600 under proposal | 3/30 | 5/30 |
| Median generation ms | 1284.7 | 1089.1 |
| Maximum generation ms | 3647.3 | 4369.8 |

Sources: E\high-heldout.jsonl:181–210; E\killer-tilt.jsonl:1–30; corresponding summary JSON. This is evidence for **searching cage profiles**, not a universal recommendation to set every cage-size option to 2.

A concrete solver-limit failure is Killer seed **3203566290**: zero givens, 21 cages, unique, old score **8601.6**, `solved:false`, no warning. After the solver's 15 deductions, **81 cells are still unfilled**. Chain-length 24 instead of 12 does not solve it; Nishio depth 3 instead of 2 produces more eliminations but still no completed solution. It must not be certified as an even harder tier merely because those partial deductions scored more points. [E\high-heldout.jsonl:209; E\solver-limit-probe.json; G\js\core\tech-chain.js:83–91]

### Greater-Than and Wordoku

Greater-Than ungated evil was 30/30 on held-out seeds. Its cap is not evidence of absent hard instances. Its present sign-removal strategy reveals clues to meet level-related minima and tunes too-hard samples by adding clues; it does not search the joint sign/given structure toward a fine high-score interval. [G\js\variants\greater-than.js:314–493,515; E\high-heldout.jsonl:211–240]

Wordoku also hit old evil 30/30 when ungated. The hidden word contributes no solving constraint, so no Wordoku-specific human technique is needed to explain that success. With `placement:'row'`, any ordinary 9×9 puzzle can be relabelled to align one solution row with the fixed word. I constructed four such valid, unique Wordoku instances from the repository's published hard classic fixtures: all have complete proofs and proposed `nightmare-2` scores **3689.4–3895.3**. This is an **existence construction**, not a claim about pipeline hit rate. [G\js\variants\wordoku.js:7–12,211–280; E\high-heldout.jsonl:361–390; E\wordoku-isomorph.json]

### Mega and multigrids

The source explains their caps partly by missing expert/evil performance milestones, not forbidden technique applicability. The generic techniques already apply. All hidden expert/evil pilot cells hit 5/5; every held-out evil cell hit 30/30 with complete proofs. Large-board candidate pools, scaled floors, and repeated oracle calls still influence cost and score composition; the measurements do not mean future nightmare-targeted generation is automatically cheap. [G\js\variants\mega.js:65–69; G\js\variants\multigrid.js:338–347; E\unsupported.jsonl:41–60,71–110; A4 held-out table]

### Small grids: the important counterexample

For classic6, 30 matched trials per requested level gave:

| Search configuration | medium | hard | expert | evil |
|---|---:|---:|---:|---:|
| Current floors, rotational180 | 1/30 | 0/30 | **27/30** | **29/30** |
| Zero total-clue floor, rotational180 | 2/30 | 0/30 | 27/30 | 29/30 |
| Zero total-clue floor, no symmetry | 6/30 | 4/30 | 30/30 | 30/30 |

Sources: E\classic6-default.jsonl, E\classic6-zero-floor.jsonl, E\classic6-free.jsonl, 120 rows each; base seed 20261020.

This **non-monotone target reachability** comes from score-band jumps, restricted technique ladders, symmetry, and the search space. Merely lowering the clue floor hardly helps the failing medium/hard targets. It does not follow that 6×6 has a low mathematical ceiling.

Seed **694974463** is a particularly useful falsification example:

```text
classic6, 24 empties
counts = { nakedSingle:23, hiddenSingleBox:1, pointing:1,
           nakedPair:1, xyWing:2, wWing:1, nishio:1 }
old score = 3924.775; proposed score = 2475.5.
```

It is unique and logically solved. One hundred digit relabellings all retain the proposed score 2475.5. Excluding Nishio makes the implemented solver stuck immediately; excluding wings instead gives a complete but higher-scored chain-based route. The Nishio step is depth 1. Thus its proposed nightmare rating is a real consequence of the chosen **technique weighting**, not large-board volume or a technique floor. Whether humans should call this particular 6×6 puzzle nightmare is an open calibration question, especially because depth-1 and depth-2 Nishio currently share one ID. [E\classic6-default.jsonl:106; E\small-order-probe.json]

For classic4, none of 20 hidden-level pilot requests found anything beyond old easy; all sampled proofs use singles. Under the proposed absolute scale those puzzles are all veryEasy. This is evidence for a low practical ceiling, not an exhaustive enumeration theorem. [E\unsupported.jsonl:1–20]

# Part C — Proposal, not repository implementation

## C1. One universal score

### Definition and admissible inputs

For a **complete, verified logical solve**:

```text
E = number of initially empty cells
n_t = number of effective applications of technique t
w_t = fixed, versioned, variant-independent weight assigned to technique t

P = max { w_t : n_t > 0 }, or 0 when no technique is used
W = Σ w_t n_t
V = 80E/(E+40)
R = 0.25P log₂(1+W/P), or 0 when P=0
S = round(10(V+P+R))/10.
```

The score function in `E\proposal.cjs` has exactly two data arguments, `empty` and `counts`. Validity/completeness is a precondition enforced by the caller, **not a third score term**. An unsolved report is not passed to this function for a published difficulty.

No requested level, achieved level, variant ID, total cells, digit count, clue density, elapsed time, DFS nodes, symmetry, cage count, or sign count is an input. The `w_t` constants are model parameters, just as weights in any fixed scoring model are; they are not looked up from level minima. The label is computed from `S` afterward.

### Proposed initial weights

These values are explicit **research starting points**. Their rationale is increasing structural reasoning burden, followed by a sanity check against actual traces—not a claim of already measured human seconds.

| Family | Weights |
|---|---|
| Singles | nakedSingle **1**; hiddenSingleBox **1.25**; hiddenSingleLine **1.5** |
| Locked candidates | pointing **40**; boxLine **50** |
| Subsets | nakedPair **120**; hiddenPair **145**; nakedTriple **180**; hiddenTriple **220**; nakedQuad **260**; hiddenQuad **300** |
| Fish/coloring | xWing **320**; simpleColouring **360**; swordfish **420**; jellyfish **520** |
| Wings/uniqueness | xyWing **650**; xyzWing **750**; wWing **850**; uniqueRectangle **900** |
| Chains/trial | forcingChain **1100**; nishio **1700** |
| Cage techniques | cageCombo **40**; ruleOf45 **260**; cageSplit **520** |
| Inequality techniques | ineqChain **40**; minMaxForcing **180** |

Reasoning behind the choices:

- Close single weights preserve the useful existing distinction without letting harmless single-order changes dominate.
- Cage combination/bound propagation start near locked candidates, rather than inheriting unscaled “design” costs accidentally. Rule of 45 involves region selection plus arithmetic; cage splitting couples virtual sums, so their provisional anchors are near stronger subsets/fish.
- The sum `W` acknowledges repetition and diversity, but its **logarithmic** contribution has diminishing returns. Repeating 100 simple steps does not create the same peak as a single difficult deduction.
- The separate peak `P` recognizes that understanding one advanced deduction can dominate a short puzzle. This is **not a technique floor in disguise**: it never reads a level index, a band minimum, or a requested label.
- `80` bounds the entire empty-cell contribution; `40` gives half of that contribution at 40 empty cells, close to the existing classic9 easy-boundary workload. `0.25` limits repetition's influence without discarding it. These are tunable global parameters, not per-size adjustments.
- Under these parameters, the baseline classic9 veryEasy anchor is 42.8, easy is 45.6–46.1, medium is 209.0–278.0, and hard is 499.4–579.3. This supports a useful initial separation, but is not sufficient human calibration. [E\baseline-summary.json]

**Variant-specific techniques must be calibrated on the same human effort scale.** The process should use blinded examples of a deduction, solution time/error rates, and comparison to standard patterns—not “this is an expert variant, give it expert points.” If `cageCombo` mixes trivial single-remainder arithmetic with difficult multi-cell enumeration, distinguish stable technique subtypes. Likewise `nishioDepth1` versus deeper proofs may be more faithful than one umbrella ID. Such subtypes remain “which technique was used”; deriving a cost from the desired level would not.

### Size behavior and the peak-versus-volume tension

- Pure singles on any currently supported board up to **369 cells** have score below approximately **77**, even in the deliberately pessimistic case that every placement has weight 1.5. They cannot become hard/expert merely by being numerous.
- A single high-weight technique contributes through `P` regardless of whether the board has 36, 81, or 369 cells. This avoids diluting a localized difficult bottleneck across several easy subgrids.
- The empty-cell term is 16 at `E=10`, 26.67 at `E=20`, 40.49 at `E=41`, 53.55 at `E=81`, and 72.18 at `E=369`.
- A zero-given Killer has `E=81`, not a special penalty or multiplier. Cages' informational content is reflected through the techniques actually used.
- Mega12/Mega16 and multigrids can still progress to higher grades through **many genuinely expensive deductions**, because `R` grows logarithmically without a hard cap.
- Small boards' former relative “easy” labels need not survive: the sampled classic4 easy puzzle becomes veryEasy. With only `E` and technique counts as inputs, a scorer cannot distinguish identical traces merely because one comes from a denser/larger board. Preserving every old size-relative label would require extra information or inconsistent thresholds.

I do **not** regard total grid size as indispensable for the requested proof-difficulty scale. It would be useful for predicting visual-search burden or solving duration, but that is a different objective. A density-normalized alternative such as `E/C` explicitly violates the strict input requirement and can again dilute a hard local bottleneck. If desired, total size/time estimates can be displayed separately without entering the grade.

### Properties and limitations

- Identical `E` and technique-count maps receive identical scores across every variant.
- Adding uses of an existing technique cannot lower the score. Adding a stronger used technique also cannot lower it: for fixed `W`, with `x=W/P`,
  `d(P + .25P log₂(1+W/P))/dP = 1 + .25[ln(1+x)−x/(1+x)]/ln2 > 0`.
  The empty term is monotone too; final rounding preserves non-decrease.
- The score is independent of the **order of an unchanged multiset of steps**. It is not invariant to a solver choosing a different proof.
- It does **not** guarantee score monotonicity when removing a given: that changes the proof and can reduce some technique counts. The digger must not assume such a guarantee.
- Repetition is compressed, not ignored. Granularity of findings must be stable; splitting one elimination batch into ten artificial steps can still alter `W`.
- This model measures an explanatory proof's difficulty, not the mathematically minimum possible human solution. A deterministic portfolio of proof strategies, and taking the least score among complete valid proofs, would reduce “unnecessary hard technique” inflation. Portfolio choice/version must not depend on the requested target.
- The digit-relabelling experiment suggests reduced numerical sensitivity, but neither it nor the 6×6 Nishio exclusion test proves global minimality of a proof. [E\order-probe-summary.json; E\small-order-probe.json]

### Alternatives considered

| Alternative | Why not the primary proposal |
|---|---|
| Existing raw linear sum, no floor | Simple, but leaves easy volume dominant and variant costs on incompatible calibrations; retaining old scaled bands greatly increases large-board search cost |
| Hardest technique only | Prevents volume inflation but assigns the same score to one and fifty hard deductions; poor basis for scalable nightmare tiers |
| Per-technique `log(1+uses)` sum without peak | Helpful damping, but many distinct easy techniques can outweigh one hard bottleneck; requires careful control of technique taxonomy |
| Score divided by `cellCount/81` | Violates the strict allowed inputs and underweights a single hard step in Samurai |
| Arbitrary per-variant multiplier | Violates universality and conceals calibration defects |
| Global log of the old sum | Reduces huge numbers but does not fix relative importance of easy workload and peak reasoning |
| Peak plus bounded workload only | Strong size protection, but repeated high-end deductions eventually stop differentiating nightmare tiers |
| Peak plus logarithmic relative work, bounded empty term | Chosen compromise: peak-aware, monotone in inputs, scalable at the high end, no size/level/variant input |

### Worked old-versus-new examples

These are **rescored actual puzzles**, not claims of generation hit rate under a new objective.

| Puzzle / seed | E | Old level; score | Proposed level; score | Evidence |
|---|---:|---|---|---|
| classic4 / 1550715876 | 10 | easy; 16.5 | veryEasy; 17.9 | E\baseline.jsonl:11 |
| classic6 / 1114907542 | 20 | easy; 32.5 | veryEasy; 28.8 | E\baseline.jsonl:31 |
| classic9 / 713242689 | 41 | veryEasy; 66.1 | veryEasy; 42.8 | E\baseline.jsonl:41 |
| classic9 / 1592778586 | 53 | hard; 511.925 | hard; 499.4 | E\baseline.jsonl:71 |
| samurai / 2073087849 | 263 | hard; 1822.222… | hard; 633.4 | E\baseline.jsonl:491 |
| killer / 2549811806 | 77 | hard; 719.575 | easy; 174.6 | E\baseline.jsonl:391 |
| killer / 2160184381 | 81 | evil; 6286.475 | nightmare; 3078.0 | E\unsupported.jsonl:61 |
| mega16 / 4051528455 | 156 | evil; 48353.975 | nightmare-2; 4078.0 | E\unsupported.jsonl:56 |
| greaterThan / 2386265213 | 53 | expert; 923.925 | veryHard; 928.5 | E\baseline.jsonl:451 |
| classic6 / 694974463 | 24 | evil; 3924.775 | nightmare; 2475.5 | E\classic6-default.jsonl:106 |

For the worked classic9 hard puzzle, `P=320`, `W=700.25`, `V=80×53/93≈45.5914`; hence `S=round₀.₁(45.5914+320+80log₂(1+700.25/320))=499.4`.

For the Samurai example, `P=360`, `W=1372`, and `V≈69.439`; the result is 633.4 without any board-size multiplier or level-derived bonus. For the zero-given Killer example, `P=1700` because Nishio is used four times; the score is 3078.0, not a consequence of having no givens alone. Full term decompositions are in `E\evidence.json`.

## C2. A ladder defined only by score

### Concrete initial bands

| ID | Proposed English name | Score interval |
|---|---|---:|
| `veryEasy` | Very easy | `[0,45)` |
| `easy` | Easy | `[45,180)` |
| `medium` | Medium | `[180,400)` |
| `hard` | Hard | `[400,700)` |
| `veryHard` | Very hard | `[700,1000)` |
| `expert` | Expert | `[1000,1500)` |
| `evil` | Evil | `[1500,2400)` |
| `nightmare` | Nightmare | `[2400,3600)` |
| `nightmare-2` | Nightmare II | `[3600,5400)` |

For further tiers, define a fixed mathematical rule:

```text
nightmare-k lower boundary = 2400 × 1.5^(k−1), k≥1
nightmare-1 is serialized as "nightmare"
```

For example nightmare-3 would be `[5400,8100)`. The **classification rule may recognize these tiers**, while the picker exposes only empirically supported ones. Initially I recommend investigating/exposing at most two added tiers, not an unlimited menu: no complete measured generated proof in these samples exceeded 5400.

The first boundary preserves the measured classic9 veryEasy/easy anchors. Subset and fish anchors support the 180/400 separation. The inserted 700–1000 band gives room for ordinary wings without conflating them with stronger/multiple techniques. The 1500 boundary separates stronger repeated reasoning, and 2400/3600 separate observed chain/Nishio-heavy tails. These boundaries are **co-designed provisional calibration**, not a fit to a representative human-labelled corpus.

Additional sanity evidence: the three frozen constructed expert fixtures score **879.2–940.4**, now `veryHard`; constructed evil fixtures **2148.0–2177.9**, still `evil`; four published hard reference fixtures score **3689.4–3904.6**, `nightmare-2`. These fixtures have selection bias and are checks, not sufficient calibration data. [E\fixture-probe.json; G\tests\fixtures\rated.js:8–25]

**Technique groups can remain a search strategy**, but not the definition of a label:

- A strategy may start with singles/subsets to find lower scores cheaply, then expand its oracle repertoire.
- A final verified full-proof score determines the published label, irrespective of the initial search strategy.
- A long enough valid proof using an earlier technique can cross a band; conversely, a single technique must not receive points because some old group table says “expert.”
- `BASE_GROUPS[levelIndex]` must no longer be the conceptual linkage between labels and available proofs. It cannot naturally accommodate `veryHard` and multiple nightmare tiers.

## C3. Generation and empirical supported-level policy

### Score-targeted search rather than label-forcing

A suitable design would keep a strict boundary between:

1. **Feasibility:** rules satisfied, unique solution, complete sound explanatory proof.
2. **Score:** only the C1 inputs.
3. **Search objective:** proximity to a requested score interval.
4. **Capability policy:** which intervals can be generated reliably under a particular configuration and budget.

The search objective can minimize distance to the target interval, then prefer a margin from band edges. It should retain the best feasible candidates instead of only the first current-band hit. A two-stage strategy can use cheap restricted oracles first and canonical full rating only for promising candidates. The final proof must not be selected to artificially inflate the target score.

Useful search changes, as research directions rather than implementation tasks:

- **Reversible clue search:** beam/local search with removing and re-adding clue groups; multiple removal orders; explicit symmetry choices; restarts that explore genuinely new structures.
- **State-sensitive rejection:** permanent ambiguity rejection is justified only while constraints are being removed from the same state lineage. Technique failure/score-too-high is not guaranteed monotone; do not permanently cache it across changed states or re-added clues.
- **Targeted restarts:** a first old-evil hit need not be a useful nightmare candidate. Accumulate score distributions and sample until the requested interval is reached or the real budget is exhausted.
- **Budgeted best-so-far return:** separate “exact,” “valid approximate,” “search exhausted,” “unrated proof,” and “cancelled.” Current hard budget exceptions discard a usable best candidate.
- **Clue floors as safeguards/priors:** tune or soften them where they demonstrably restrict search, rather than derive difficulty from clues. No numeric-given minimum is intrinsically required for Killer.
- **Killer structure search:** optimize cage merge/split/boundary moves jointly with givens, preserving sums/distinctness/uniqueness; rank candidate layouts by the actual complete-proof score. Vary cage-size profile and unit-crossing structure. The controlled tilt experiment already demonstrates a useful direction.
- **Greater-Than joint search:** remove/reinsert signs and givens together, maintaining the original inequality meaning; search sign-density/placement profiles and both box-local/grid-wide modes. Sign count itself must not enter the difficulty score.
- **Wordoku:** apply the same high-end score search as classic9; its row-placement isomorphs prove the absence of an inherent low ceiling.
- **Large/multigrid boards:** retain optimized full-grid seeds; use staged ratings and an adaptive candidate pool, not necessarily the current inverse-cell-count quota. High-score bottlenecks can be localized in one subgrid.
- **Technique coverage:** stronger cage relationships, chain coverage, and a better-explained trial taxonomy can expand the region of *ratable* puzzles. Raising chain/depth limits alone did not solve the concrete Killer failure, so that is not a sufficient general solution.

The current asymmetric experiment supports the search argument: 30 matched old-evil requests with `symmetry:none` reached a generated classic9 score of **3625.3** (`nightmare-2`), versus a rotational held-out maximum of 3200.4. Wordoku's count of proposed nightmare results rose from **3/30 to 10/30**, though none reached nightmare-2 in these pipeline samples. This is not a claim that asymmetry always makes a puzzle harder. [E\asymmetric9.jsonl:1–60; E\high-heldout-summary.json]

### Best estimate of the high end, with explicit confidence limits

The following is an **attainability estimate under the prototype scale**, not a promise that every listed tier should immediately appear in the UI. “Observed maximum” is only a lower bound on what exists.

| Variant | Highest complete proof observed under proposal | Best estimate to investigate | Main qualification |
|---|---:|---|---|
| classic4 | 20.4, veryEasy | veryEasy | Only singles in samples; do not preserve a size-relative easy label by special scoring |
| classic6 | 2475.5, nightmare | evil routinely; nightmare as a rare target | No size-only cap; nightmare is rare and Nishio taxonomy/human calibration is especially important |
| classic9 | 3625.3 generated; 3904.6 reference fixture | nightmare-2 | Upper-tail targeted search/asymmetry needed; current first-hit old-evil generator is not a nightmare-II generator |
| mega12 | 3894.1, nightmare-2 | nightmare-2 | New-target hit rate and browser budget still unmeasured |
| mega16 | 4680.9, nightmare-2 | nightmare-2 | Large expensive-proof workload; do not promote pure singles |
| diagonalX | 4206.8, nightmare-2 | nightmare-2 | Optional combined-region profiles need their own validation |
| hyper | 3742.1, nightmare-2 | nightmare-2 | Same |
| jigsaw9 | 3951.5, nightmare-2 | nightmare-2 | Shape/compactness stratification needed |
| killer | 4458.3, nightmare-2 | nightmare-2 | Cage-layout search and complete-proof rejection are necessary for reliable support |
| greaterThan | 4085.4, nightmare-2 | nightmare-2 | Sign/given joint tuning; validate both sign scopes |
| samurai | 4051.3, nightmare-2 | nightmare-2 | Distinguish easy aggregate volume from localized peak |
| sohei | 4412.7, nightmare-2 | nightmare-2 | Same |
| butterfly | 3895.1, nightmare-2 | nightmare-2 | Same |
| flower | 3965.0, nightmare-2 | nightmare-2 | Same |
| wordoku | 3442.6 generated; 3895.3 constructed row isomorph | nightmare-2 | Existence proved constructively; production/default-diagonal hit rate not proved |

Sources for generated maxima, seeds, and exact raw-line locations: E\evidence.json `maxima`; for fixtures/isomorphs E\fixture-probe.json and E\wordoku-isomorph.json. The extra tiers above nightmare-2 remain **unvalidated**, not declared mathematically impossible.

### How to decide what the picker exposes

Capability is **per configuration/profile**, not merely a guess based on size. For each variant, relevant options, symmetry policy, generation budget, and rater/generator version:

- Use a discovery corpus to find possible target intervals, followed by a **separate validation corpus**, e.g. at least 500 seeds per candidate supported interval.
- Count success only when uniqueness, correctness, complete proof, and exact score interval all pass. Include timeouts, approximate outputs, and unsolved labels in the denominator.
- A reasonable initial production criterion is ≥95% exact verified success, with a 95% confidence lower bound ≥90%, and a measured p95 within the declared device/browser budget.
- Consider within-band margin and score dispersion as well as hit rate; a heap exactly at one edge can conceal another artificial floor.
- Hide unsupported/unvalidated picker choices for that configuration. Explain “not reliably generated under these settings” rather than “this variant is mathematically incapable.”
- Do not clamp the label of a valid imported or exceptionally generated puzzle to the picker's support list.
- Do not assume support is a prefix of the ladder: classic6's observed target behavior is a direct counterexample. A new score-targeted search may fill such gaps; until verified, a per-tier support set is more honest.

For hard rare tiers, an advanced longer-budget mode or a curated pool of already verified puzzles may be more practical than making the interactive generator perform many correlated restarts. These change availability, not score.

## C4. Impact analysis and backward compatibility

This is an impact analysis, **not a task list**.

| Area | Consequence of the proposal |
|---|---|
| `difficulty.js` | The floor disappears; a common score replaces scaled bands; peak/work/empty terms become explicit; `veryHard` and extensible nightmare IDs are recognized; unknown/incomplete proofs are not coerced to the top band |
| `logical-solver.js`, techniques | Consistent trace/count semantics, versioned technique taxonomy, and complete-proof handling matter more than raw solver score; cognitive cost must not accidentally reorder the proof search without a declared solver version |
| `digger.js`, `pipeline.js` | Target intervals and strategy repertoire become separate concepts; exactness includes proof status; search objective, retries, best-so-far policy, and candidate rejection assumptions change |
| Variant definitions | Capability data cannot remain historical caps; Killer cage profiles, Greater-Than signs, and option/symmetry-specific support need evidence; `veryHard` must not accidentally shift an index-based group mapping |
| Summary / Steps UI | Remove the “Bonus points for difficult techniques” row and explanation. The new score is nonlinear, so technique rows should show weights/counts/work, with a separate **peak**, **diminished work**, and **empty workload** breakdown, not falsely additive old per-technique points |
| Replay scoring | Intermediate states must use the same rater version as the final result; incomplete/time-limited evaluation remains “unknown,” not a top-tier badge |
| Help / locales | Current claims tying each label to one introduced technique group and scaled bands need different wording. Add `veryHard`, nightmare tier names, and proof-status explanations in both languages |
| Store / URLs | Keep all old IDs. Add explicit generator/rater versions for deterministic reproduction; a new ID must not silently become medium merely because an old parser ignores `d` |
| History | Store a puzzle snapshot or retain an old generator implementation for exact reopening. Existing rounded score + seed/config is insufficient to reconstruct an old puzzle under a changed search algorithm |
| Cache / pre-generation | Include generator/rating/catalogue versions in cache identity or invalidate old entries on version change; update scheduling costs for new tiers, independently of scoring |
| JSON / wire / exchange | Add `ratingVersion`, `techniqueCatalogVersion`, `generatorVersion`, proof status, and score parts. An additive metadata change need not change compression/token encoding, but consumers must not misread old scores as new |
| Player | Recognize the new IDs/metadata and preserve legacy ratings. Unknown difficulty metadata should remain nonfatal. New technique IDs or proof subtypes also affect its separate technique/hint implementation |
| Tests / fixtures / hashes | Replace floor/index-coupling assertions with score-purity, cross-variant equivalence, boundary, proof-status, and capability tests. Rebaseline generator hashes only after a documented intentional change, not to suppress failures |
| Documentation | Design §§6.6–6.8/9.1 and invariants, README's score/variant/technique/calibration guidance, export examples, and final-report claims about floor-dependent validity all change |

Backward-compatible interpretation should be explicit:

1. **Legacy stored puzzle + old score:** retain the old score with a “legacy rating” version badge. A new score, if computed, is a distinct field/result, not a silent replacement.
2. **Legacy seed-only link/history:** either execute the matching legacy generator or warn that regeneration uses a newer algorithm and may differ. Merely keeping `d=hard` does not preserve the puzzle.
3. **Old export consumed by new player:** continue to parse the v1 puzzle document; missing rating version means legacy, not “latest.”
4. **New export consumed by old player:** the present importer may lose all or part of difficulty info, while still importing the puzzle. Preserve basic payload compatibility, but do not promise new labels will render in an unmodified old client.
5. **Same stored puzzle, new labels:** a move from old expert to new veryHard—or old small-grid easy to veryEasy—is legitimate only with explicit rating-version context. The seven required labels remain globally available; not every variant must expose every label.

## C5. Risks, open questions, and validation/calibration

### Principal risks

- **Human validity is the largest uncertainty.** The proposed constants make engineering sense and behave usefully on traces, but there is no blinded human rating/timing study here.
- **Technique identity may be too coarse.** A depth-1 Nishio on a 6×6 grid and a deep cage-dependent Nishio can share one weight; one `cageCombo` application can hide very different mental work. Refining IDs is preferable to sneaking size or target level into costs.
- **“Used” is not “required in every solution.”** A greedy solver supplies one proof. Exclusion tests and portfolios improve evidence but do not solve global minimum-proof search.
- **Generator-distribution bias:** samples were generated by the old target system, and all Jigsaw/combined-region/sign/cage profiles were not swept. Rescoring this corpus is not an unbiased study of each variant's entire puzzle space.
- **Search cost after removing floors:** the Samurai ablation demonstrates a real risk even though sufficiently generous budgets recovered 10/10 hits. CPU/memory cost, cancellation granularity, and browser responsiveness need measurement.
- **Rare-tier inflation:** adding a nightmare label must not turn incomplete proofs or pure workload into fake high difficulty. The observed unsolved Killer examples are a concrete warning.
- **Compatibility loss:** regenerating old seeds with a new scoring objective can change the puzzle, not only its label.
- **Determinism/versioning:** technique order, taxonomy, tie-breaking, numeric rounding, and search algorithm are part of reproducibility.

### Validation/calibration design

An appropriate research-to-production validation would use:

1. **A frozen multi-variant corpus**, including every size, multigrids, low/zero-given Killer, both inequality scopes, Jigsaw shapes, symmetric/asymmetric configurations, and published/hand-constructed hard examples. Keep discovery/calibration/hold-out seeds separate.
2. **Soundness and completeness checks:** unique solution; valid givens; every recorded placement/elimination consistent with the independent solution; full logical completion; deterministic rerating with/without collected steps; no rating from a partial proof.
3. **Pure-score properties:** same `E` and counts give the same score for all variants; changing requested level, support list, or band thresholds never changes numerical score; adding counts/empties cannot lower it; exact boundary and rounding tests.
4. **Proof-robustness tests:** digit relabelling, geometric isomorphs where valid, different tie-breaks, alternative complete proofs, and exclusion of purported high-end techniques. Track score spread and band changes, not only exact equality.
5. **Human calibration:** blinded relative comparisons, completion times, error rates, and perceived peak difficulty from multiple skill groups. Fit global weights/parameters to those observations with regularization and hold-out validation, rather than fitting to the old generator's labels.
6. **Cross-size checks:** hundreds of singles should not outrank a demonstrably difficult small proof purely by volume; conversely a huge board's repetitive workload should remain visible as a secondary metric if users care about duration.
7. **Capability validation:** at least the per-profile/per-tier seed sweep described in C3, with confidence intervals and a declared wall/active/work budget. Search failures must remain failures in the denominator.
8. **Browser performance and migration trials:** representative devices/workers, cache invalidation, legacy-link behavior, export/import round trips between app versions, and interruption/best-so-far behavior.

The existing 114 passing difficulty tests establish a trustworthy starting baseline, not approval of the proposed changes. The isolated proposal code only rescored traces; it did not implement or validate the future score-targeted generator.

# Appendix — Experiments and reproducibility

## Appendix 1. Method, commands, sample sizes, and retained artifacts

All commands below ran from the workspace folder that held both repositories and the experiment folder (`E\`, not part of the repository). The helper loader extracts the source list from `G\tests\node-runner.js`, loads only core/variant/word-list files with `vm.runInThisContext`, and writes outputs **only beside the helper scripts**. No application source file is patched or evaluated from a modified on-disk copy.

Seed derivation for generation experiments:

```text
h = (2166136261 xor baseSeed) unsigned-32
tag = variantId + ":" + requestedLevel + ":" + zeroBasedSampleIndex
for each UTF-16 character c in tag:
    h = imul(h xor charCode(c), 16777619) unsigned-32
pipeline seed = h
```

Default experiment settings: `trace:'off'`, `maxAttempts:8`, default rotational180 symmetry, default variant options, 15,000 ms and 5,000,000 work checks per generated puzzle. An additional independent DFS uniqueness check has 5,000 ms / 5,000,000 checks. Every run has a 720,000 ms outer stop and records whether it stopped partially. **No recorded run was partial.** Durations are host observations; another researcher shared the machine, and these are not isolated performance benchmarks.

`measure.cjs` records each trial's seed, givens, actual score/raw score/technique counts, proof completeness, clues/empties, cage sizes/sign count, attempts/samples, warnings/errors, and independent invariant checks. `*-meta.json` records exact arguments/runtime/duration; `*-summary.json` gives distributions. Median/percentiles in this report use **nearest-rank** (`ceil(pn)−1`); the progress console's middle-element range may differ for even sample counts.

Define the script path for the following PowerShell commands (`E\`, the experiment folder):

```powershell
$p = '<experiment folder of gpt-6-astra>'
```

| Dataset / retained files | Reproduction command | Trials / purpose |
|---|---|---|
| inventory.json | `node "$p\inventory.cjs"` | 15 built default models; 26 techniques; current specs |
| baseline.jsonl, baseline-meta.json, baseline-summary.json | `node "$p\measure.cjs" --name=baseline --n=10 --seed=20261019` | 670, all 67 supported combinations |
| unsupported.* | `node "$p\measure.cjs" --name=unsupported --unsupported --n=5 --seed=20261019 --ms=15000` | 115, all 23 hidden combinations, support list widened in memory |
| nofloor.* | `node "$p\measure.cjs" --name=nofloor --nofloor --n=10 --seed=20261019 --ms=15000` | 670 paired attempts; 6 budget errors, 664 completed |
| classic6-default.* | `node "$p\measure.cjs" --name=classic6-default --variants=classic6 --levels=medium,hard,expert,evil --force --n=30 --seed=20261020` | 120 |
| classic6-zero-floor.* | previous command with `--name=classic6-zero-floor --zero-floors` | 120 paired |
| classic6-free.* | previous command with `--name=classic6-free --zero-floors --symmetry=none` | 120 paired |
| high-heldout.* | `node "$p\measure.cjs" --name=high-heldout --variants=classic9,mega12,mega16,diagonalX,hyper,jigsaw9,killer,greaterThan,samurai,sohei,butterfly,flower,wordoku --levels=evil --force --n=30 --seed=20261020` | 390 |
| nofloor-samurai-detail.* | `node "$p\measure.cjs" --name=nofloor-samurai-detail --variants=samurai --levels=hard --nofloor --n=10 --seed=20261019` | 10; reproduce node-limit errors with detailed error arguments |
| nofloor-samurai-generous.* | same command with `--name=nofloor-samurai-generous --nodes=100000000` | 10; isolate budget sensitivity |
| killer-tilt.* | `node "$p\measure.cjs" --name=killer-tilt --variants=killer --levels=evil --force --n=30 --seed=20261020 '--options={"cageSize":2}'` | 30 paired cage-profile trials |
| asymmetric9.* | `node "$p\measure.cjs" --name=asymmetric9 --variants=classic9,wordoku --levels=evil --force --symmetry=none --n=30 --seed=20261020` | 60 paired symmetry trials |
| order-probe.json, order-probe-summary.json | `node "$p\order-probe.cjs"` | 40 classic9 baseline cases ×20 digit permutations =800 solves; permutation base seed 20261020 |
| small-order-probe.json | `node "$p\small-order-probe.cjs"` | Highest sampled classic6 prototype case; 100 digit permutations plus four exclusion solves |
| solver-limit-probe.json | `node "$p\solver-limit-probe.cjs"` | One unsolved held-out Killer case ×four chain/depth combinations |
| fixture-probe.json, wordoku-isomorph.json | `node "$p\fixture-probe.cjs"` | 26 rated fixtures; four constructive Wordoku relabellings, model RNG seed 20261020 |
| evidence.json | `node "$p\evidence.cjs"` | Reproducible worked examples, maxima, floor demotions, paired sample counts |
| tests-difficulty.txt | `node .\sudoku-generator\tests\node-runner.js --suite=difficulty` | 114/114 pass; no repository writes |
| repository-state.txt | read-only git revision/status commands | Revision and cleanliness evidence |

`engine.cjs`, `proposal.cjs`, and `summarize.cjs` are the shared helpers. For example:

```powershell
node "$p\summarize.cjs" baseline unsupported nofloor classic6-default classic6-zero-floor classic6-free high-heldout nofloor-samurai-detail nofloor-samurai-generous killer-tilt asymmetric9
```

The chosen repository test runner, fixture files, and selected difficulty suite were inspected for writes before execution. Hash-update/performance rewrite options were **not** used.

## Appendix 2. Full baseline score distributions

Every row is **10/10 exact old-level hits**, 10/10 valid/unique/subset checks, and 10/10 complete logical proofs. Score numbers are rounded here for readability; raw JSONL contains full precision. `Floor` is the count of raised scores. “p95 ms” with n=10 is the sample maximum under nearest-rank; it is not a stable production p95 estimate. All line ranges refer to **E\baseline.jsonl**.

| Variant / target | Hits | Score min / median / max | Empty range | Floor | p95 ms | Raw lines |
|---|---:|---:|---:|---:|---:|---:|
| classic4/veryEasy | 10/10 | 13.3 / 13.3 / 13.3 | 8–8 | 0 | 4.1 | 1–10 |
| classic4/easy | 10/10 | 16.5 / 16.5 / 16.5 | 10–10 | 0 | 0.7 | 11–20 |
| classic6/veryEasy | 10/10 | 29.3 / 29.3 / 29.3 | 18–18 | 0 | 0.5 | 21–30 |
| classic6/easy | 10/10 | 32.5 / 32.5 / 32.5 | 20–20 | 0 | 0.6 | 31–40 |
| classic9/veryEasy | 10/10 | 66.1 / 66.1 / 66.1 | 41–41 | 0 | 0.8 | 41–50 |
| classic9/easy | 10/10 | 75.7 / 77.1 / 78.3 | 47–47 | 0 | 1.1 | 51–60 |
| classic9/medium | 10/10 | 190.7 / 204.6 / 396.7 | 49–52 | 0 | 40.3 | 61–70 |
| classic9/hard | 10/10 | 411.9 / 511.9 / 747.1 | 48–54 | 0 | 18.8 | 71–80 |
| classic9/expert | 10/10 | 819.4 / 1063.9 / 1290.0 | 51–55 | 0 | 32.3 | 81–90 |
| classic9/evil | 10/10 | 1867.7 / 3946.9 / 9043.4 | 51–56 | 0 | 16.8 | 91–100 |
| mega12/veryEasy | 10/10 | 115.7 / 115.7 / 119.8 | 72–72 | 0 | 1.1 | 101–110 |
| mega12/easy | 10/10 | 136.8 / 140.8 / 154.3 | 84–84 | 0 | 1.4 | 111–120 |
| mega12/medium | 10/10 | 377.6 / 509.5 / 676.2 | 86–92 | 0 | 10.6 | 121–130 |
| mega12/hard | 10/10 | 711.1 / 761.1 / 1045.3 | 86–92 | 4 | 41.8 | 131–140 |
| mega16/veryEasy | 10/10 | 208.5 / 212.4 / 220.9 | 130–130 | 0 | 2.9 | 141–150 |
| mega16/easy | 10/10 | 249.7 / 254.7 / 341.2 | 148–148 | 0 | 4.4 | 151–160 |
| mega16/medium | 10/10 | 568.9 / 710.4 / 1037.1 | 148–156 | 1 | 19.3 | 161–170 |
| mega16/hard | 10/10 | 1264.2 / 1331.7 / 2500.9 | 150–158 | 2 | 81.1 | 171–180 |
| diagonalX/veryEasy | 10/10 | 66.1 / 66.1 / 66.1 | 41–41 | 0 | 1.0 | 181–190 |
| diagonalX/easy | 10/10 | 75.7 / 75.7 / 79.6 | 47–47 | 0 | 0.8 | 191–200 |
| diagonalX/medium | 10/10 | 198.0 / 279.6 / 363.6 | 55–57 | 0 | 7.6 | 201–210 |
| diagonalX/hard | 10/10 | 400.0 / 700.0 / 799.9 | 50–59 | 1 | 6.3 | 211–220 |
| diagonalX/expert | 10/10 | 1129.3 / 1386.4 / 1499.2 | 53–59 | 0 | 7.0 | 221–230 |
| diagonalX/evil | 10/10 | 2957.7 / 16829.5 / 61834.3 | 59–61 | 0 | 29.4 | 231–240 |
| hyper/veryEasy | 10/10 | 64.5 / 66.1 / 66.1 | 40–41 | 0 | 0.6 | 241–250 |
| hyper/easy | 10/10 | 74.1 / 75.7 / 78.6 | 46–47 | 0 | 1.0 | 251–260 |
| hyper/medium | 10/10 | 184.8 / 206.6 / 238.7 | 56–57 | 0 | 6.8 | 261–270 |
| hyper/hard | 10/10 | 489.5 / 673.0 / 799.6 | 55–61 | 0 | 11.5 | 271–280 |
| hyper/expert | 10/10 | 823.4 / 1073.8 / 1297.8 | 57–61 | 0 | 19.4 | 281–290 |
| hyper/evil | 10/10 | 1736.0 / 7236.0 / 12202.5 | 59–63 | 0 | 14.7 | 291–300 |
| jigsaw9/veryEasy | 10/10 | 66.1 / 66.1 / 67.2 | 41–41 | 0 | 28.8 | 301–310 |
| jigsaw9/easy | 10/10 | 74.1 / 75.7 / 80.1 | 46–47 | 0 | 28.6 | 311–320 |
| jigsaw9/medium | 10/10 | 181.1 / 209.5 / 236.4 | 55–57 | 0 | 23.7 | 321–330 |
| jigsaw9/hard | 10/10 | 416.2 / 587.3 / 799.1 | 55–61 | 0 | 13.2 | 331–340 |
| jigsaw9/expert | 10/10 | 870.7 / 1193.0 / 1482.3 | 55–61 | 0 | 20.9 | 341–350 |
| jigsaw9/evil | 10/10 | 5134.6 / 13245.8 / 27063.7 | 55–63 | 0 | 26.6 | 351–360 |
| killer/veryEasy | 10/10 | 66.1 / 66.1 / 66.1 | 41–41 | 0 | 3.7 | 361–370 |
| killer/easy | 10/10 | 162.0 / 175.2 / 180.0 | 49–55 | 0 | 8.6 | 371–380 |
| killer/medium | 10/10 | 377.3 / 391.1 / 399.4 | 65–71 | 0 | 13.7 | 381–390 |
| killer/hard | 10/10 | 615.5 / 699.8 / 790.6 | 75–79 | 0 | 295.8 | 391–400 |
| killer/expert | 10/10 | 816.4 / 1049.1 / 1380.8 | 75–81 | 0 | 619.4 | 401–410 |
| greaterThan/veryEasy | 10/10 | 51.7 / 66.1 / 71.3 | 32–41 | 0 | 16.4 | 411–420 |
| greaterThan/easy | 10/10 | 76.1 / 98.6 / 120.6 | 36–47 | 0 | 18.6 | 421–430 |
| greaterThan/medium | 10/10 | 187.4 / 321.5 / 377.1 | 51–57 | 0 | 32.5 | 431–440 |
| greaterThan/hard | 10/10 | 426.2 / 447.9 / 600.5 | 53–61 | 0 | 115.4 | 441–450 |
| greaterThan/expert | 10/10 | 856.8 / 1103.7 / 1389.8 | 53–63 | 0 | 388.0 | 451–460 |
| samurai/veryEasy | 10/10 | 298.1 / 299.7 / 299.7 | 186–187 | 0 | 8.6 | 461–470 |
| samurai/easy | 10/10 | 344.3 / 344.5 / 347.4 | 214–215 | 0 | 7.6 | 471–480 |
| samurai/medium | 10/10 | 820.0 / 820.0 / 1068.0 | 256–266 | 8 | 145.6 | 481–490 |
| samurai/hard | 10/10 | 1822.2 / 1822.2 / 1822.2 | 254–266 | 10 | 319.5 | 491–500 |
| sohei/veryEasy | 10/10 | 234.1 / 234.1 / 234.1 | 146–146 | 0 | 3.8 | 501–510 |
| sohei/easy | 10/10 | 269.3 / 269.3 / 270.4 | 168–168 | 0 | 4.0 | 511–520 |
| sohei/medium | 10/10 | 640.0 / 640.0 / 1026.4 | 204–208 | 8 | 156.5 | 521–530 |
| sohei/hard | 10/10 | 1422.2 / 1422.2 / 1463.8 | 202–210 | 9 | 197.7 | 531–540 |
| butterfly/veryEasy | 10/10 | 115.7 / 115.7 / 115.7 | 72–72 | 0 | 1.4 | 541–550 |
| butterfly/easy | 10/10 | 134.9 / 134.9 / 134.9 | 84–84 | 0 | 1.5 | 551–560 |
| butterfly/medium | 10/10 | 330.6 / 500.9 / 701.2 | 106–112 | 0 | 33.0 | 561–570 |
| butterfly/hard | 10/10 | 711.1 / 993.3 / 1391.2 | 104–114 | 2 | 82.1 | 571–580 |
| flower/veryEasy | 10/10 | 152.5 / 154.1 / 154.1 | 95–96 | 0 | 2.2 | 581–590 |
| flower/easy | 10/10 | 200.5 / 202.1 / 203.0 | 125–126 | 0 | 2.8 | 591–600 |
| flower/medium | 10/10 | 424.5 / 473.3 / 741.8 | 144–149 | 0 | 31.4 | 601–610 |
| flower/hard | 10/10 | 941.7 / 1360.9 / 1742.2 | 142–150 | 0 | 88.5 | 611–620 |
| wordoku/veryEasy | 10/10 | 64.5 / 66.1 / 66.1 | 40–41 | 0 | 1.8 | 621–630 |
| wordoku/easy | 10/10 | 75.7 / 75.7 / 78.8 | 47–47 | 0 | 1.6 | 631–640 |
| wordoku/medium | 10/10 | 190.4 / 219.2 / 390.0 | 49–52 | 0 | 18.7 | 641–650 |
| wordoku/hard | 10/10 | 408.0 / 533.7 / 764.0 | 51–53 | 0 | 27.0 | 651–660 |
| wordoku/expert | 10/10 | 821.4 / 990.2 / 1417.4 | 51–55 | 0 | 33.8 | 661–670 |

## Appendix 3. Repository integrity

Both repositories were clean before research. Final read-only checks are `git status --short` in each repository:

```powershell
git status --short                        # in sudoku-generator
git -C ..\sudoku-player status --short    # the sudoku-player checkout next to it
```

Their final output is recorded in `E\repository-state.txt`. No code, documentation, tasks, commits, branches, stashes, or other repository state were created or changed. All retained research artifacts are listed above or are the `*-meta.json` / `*-summary.json` companions of those datasets.
