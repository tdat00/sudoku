# Rating v2 — detailed report: difficulty scoring and difficulty generation

> **Paths.** Written when the generator and the player were two repositories (`sudoku-generator`, `sudoku-player`):
> paths such as `js/core/…`, `js/ui/…`, `tests/…` and `design.md` belong to those repositories, and line numbers to the commits named below.
> In this repository they are `generator/…` or `player/…`, and the files both projects share are in `core/` — see
> [where the old paths went](../architecture.md#where-the-old-paths-went). Commands such as `node tests/node-runner.js` run in `generator/` or `player/`.

| | |
|---|---|
| Researchers | **claude-opus-5.5** (Claude Opus 5.5, 1M context, max reasoning) · **gpt-6-astra** (GPT-6 Astra, long context, max reasoning) |
| Compiled by | the orchestrating agent (GitHub Copilot CLI) from the two independent reports, the two cross-reviews, the two responses, the implementation reports and the review |
| Date | 2026-10-19 |
| Code examined | sudoku-generator `fb07fef`, sudoku-player `e64b01e` (Node v26.8.2, Windows) |
| Status | **Part I** (§1–§11): the joint report, agreed by both researchers (§11) and used as the implementation spec — unchanged apart from file names. **Part II** (§12–§17): the implementation, its review and the verification. |

The short version, with the timeline of the session, is [`report-brief.md`](report-brief.md).

> **Level names.** After the work described here, the levels were renamed for names that are easier to understand. The
> reports of this folder, written before, use the old names; read them with this table. Only the names changed — not the
> bands, the weights or the generation.
>
> | old id (this report) | new id (code, URLs, exports) | EN / VI name today |
> |---|---|---|
> | `veryEasy`, `easy`, `hard` | unchanged | Very easy / Rất dễ · Easy / Dễ · Hard / Khó |
> | `medium` | `normal` | Normal / Trung bình |
> | `veryHard` | `expert` | Expert / Chuyên gia |
> | `expert` | `master` | Master / Bậc thầy |
> | `evil` | `nightmare` | Nightmare / Ác mộng |
> | `nightmare1`, `nightmare2` | `hell1`, `hell2` | Hell 1 / Địa ngục 1 · Hell 2 / Địa ngục 2 |
>
> The old `expert` and the new `expert` are different levels: the new `expert` is the old `veryHard`. Version 1 of the
> generator ([`../qa/final-review-v1.md`](../qa/final-review-v1.md)) had the six old names `veryEasy`, `easy`, `medium`, `hard`, `expert`,
> `evil`. [`qualification.md`](qualification.md) already uses the new names.

**Documents in this folder** (the number in a file name is the order in which that researcher wrote it)

| file | content |
|---|---|
| [`report-brief.md`](report-brief.md) | short report: results, timeline, problems found and how they were fixed |
| `report-detailed.md` | this file |
| [`qualification.md`](qualification.md) | which levels each variant offers, measured by `node tests/qualify.js` (read by the tests) |
| [`claude-opus-5.5/1-report.md`](claude-opus-5.5/1-report.md), [`gpt-6-astra/1-report.md`](gpt-6-astra/1-report.md) | 1. the independent research reports, written without access to each other |
| [`claude-opus-5.5/2-review-of-gpt-6-astra.md`](claude-opus-5.5/2-review-of-gpt-6-astra.md), [`gpt-6-astra/2-review-of-claude-opus-5.5.md`](gpt-6-astra/2-review-of-claude-opus-5.5.md) | 2. the cross-reviews, each with a head-to-head of both proposals on a common corpus |
| [`claude-opus-5.5/3-response-to-review.md`](claude-opus-5.5/3-response-to-review.md), [`gpt-6-astra/3-response-to-review.md`](gpt-6-astra/3-response-to-review.md) | 3. the answers to the reviews and to the resolutions R1–R10 on which Part I is built |
| [`claude-opus-5.5/4-implementation-report.md`](claude-opus-5.5/4-implementation-report.md) | 4. the generator implementation |
| [`gpt-6-astra/4-player-implementation-report.md`](gpt-6-astra/4-player-implementation-report.md) | 4. the player implementation |
| [`gpt-6-astra/5-implementation-review.md`](gpt-6-astra/5-implementation-review.md) | 5. the review of the generator implementation (B1–B4, S1–S5, N1–N2) and its re-check (B5) |
| [`gpt-6-astra/evidence/`](gpt-6-astra/evidence/) | the review's probe scripts and recorded outputs for B1–B5 (see its `README.md`) |
| [`claude-opus-5.5/5-fix-report.md`](claude-opus-5.5/5-fix-report.md) | 5. the fixes of the review findings, B5 and the robust timing tests |

The joint report and the session summary of the first version of this folder are merged into this file and
`report-brief.md`. Paths in the researchers' reports were made relative to the repository when the reports were moved
here (`G\` = this repository, `P\` = the sudoku-player repository). Their experiment folders (scripts and raw data,
about 20 MB of JSONL) are not part of the repository — the reports quote every number they rely on — except the
evidence of the review's blocking findings, copied to [`gpt-6-astra/evidence/`](gpt-6-astra/evidence/).

**Conventions.** Paths are relative to `sudoku-generator/` unless prefixed `player:`. `E` = number of empty cells at the
start, `C` = number of cells of the board, `n_t` = uses of technique `t` in the logical solve, `w_t` = weight of `t`.
Level abbreviations in dense tables: vE, E, M, H, vH, X (expert), Ev, N1, N2.

---

# Part I — The joint report (agreed by both researchers)

## Executive summary

1. **Six levels today, not seven.** `LEVELS = veryEasy, easy, medium, hard, expert, evil` (`js/core/difficulty.js:100`,
   `js/variants/registry.js:17`, `player:js/ui/importer.js:70`). The requested *very hard* does not exist yet.
2. **Today's score** is `Σ_t COSTS[t]·(n_t + 0.5) + 0.6·E`, raised to a *technique floor* — the lower edge of the band of
   the level that owns the group of the hardest technique — and compared with bands multiplied by `C/81`. The floor is
   the row "Bonus points for difficult techniques". The score is computed from a level, and the level is read back from
   the score.
3. **The floor masks a size bug.** Removing only the floor (same costs, same scaled bands) lowers the level of 45 % of
   Samurai, 33 % of Sohei and 12.5 % of Mega16 puzzles, but only 1.4 % of classic 9×9 ones; on Samurai *hard* 95–100 %
   of the scores are exactly the floor. Band scaling also breaks small boards: on 6×6 one Simple Colouring step lands in
   *expert*, while *medium*/*hard* are reached by 0–3 % of requests.
4. **Variant techniques are off-scale.** Killer and Greater-Than techniques keep design costs of 10–40 next to calibrated
   classic costs of 63–1120; they never raise the floor and never outrank a locked-or-higher technique as "hardest".
   Killer *expert* is reached by the volume of cheap cage steps (no wing in 60 of 60 sampled puzzles).
5. **Most missing high levels are policy, not impossibility.** With `difficultySupport` widened in memory, today's
   generator produces old-*evil* puzzles for Wordoku, Greater-Than, Mega12/16 and every multigrid (100 %), and for Killer
   in 80 % of requests. Real limits: classic4 (every sampled 4×4 puzzle needs only singles) and the sparse middle of
   classic6.
6. **Agreed universal score (rating v2).** Inputs: only `E` and the technique counts.
   `score = round( 80·E/(E+40) + P + 0.25·P·log₂(1 + W/P) )` with `P = max w_t` over the techniques used and
   `W = Σ_t w_t·n_t`. No floor, no size scaling, no variant or level input. A puzzle without a complete logical proof is
   *unrated* and never generated.
7. **Why this formula.** On the pooled corpus of the cross-review (9,425 records; separately, 8,310 deduplicated
   default-generator requests, 8,309 with a complete proof) it beat the other candidate (`Σ c_t·√n_t + 5·√E`) on the
   selected aggregate criteria: cross-size consistency (mean |log₂| shift 0.38 vs 0.63), solver-path robustness (0 vs 5
   level changes under digit relabelling), clue-removal stability (score drops above 5 %: 0.4 % vs 1.9 % of removals; its
   worst single level drop is two levels against one), technique-tier separation (AUC 1.000) and the top end (the famous
   hardest 9×9 puzzles land in the highest populated tier, together with generated puzzles up to 5,028). The *shape* —
   peak + logarithmic work + bounded empty-cell term — drove most of the measured gains; the weights still matter for
   the labels.
8. **Agreed ladder, one table for every variant (9 levels):** veryEasy [0,45) · easy [45,180) · medium [180,400) ·
   hard [400,700) · **veryHard** [700,1000) · expert [1000,1500) · evil [1500,2400) · **nightmare1** [2400,3600) ·
   **nightmare2** [3600,∞).
9. **Generation becomes score-targeted at every level:** technique oracle with a complete proof, the band's upper edge
   enforced from the first removal (so *veryEasy* works on large boards), fast uniqueness-dig proposals for the top
   tiers refined downward by re-adding symmetric clue groups, symmetry-preserving local search (clue additions, removals
   and swaps, Greater-Than signs, Killer cage moves) where digging alone misses, deterministic work caps.
10. **Each variant offers the levels it can generate reliably** (≥ 90 % exact hits within its time budget, measured with
    fixed seeds) and hides the rest. Expected: classic4 *veryEasy* only; classic6 a non-contiguous subset (*veryEasy*,
    *hard*, perhaps *veryHard*/*expert*); classic9 and Wordoku up to *nightmare1*; diagonalX, hyper, jigsaw9,
    Greater-Than and the large boards up to *nightmare2*; Killer up to *hard* plus the middle and top levels its cage
    search qualifies.
11. **Visible changes** (§7): the bonus row disappears; the Difficulty Score table keeps its layout with new numbers;
    three new level names; different level lists per variant; scores on a new scale; old links and history entries may
    regenerate a different puzzle (cross-version reproduction is not guaranteed); the cache is reset once; exports carry
    `ratingVersion: 2`; the player learns the new
    levels.

---

## 1. Method

| Phase | claude-opus-5.5 | gpt-6-astra |
|---|---|---|
| Independent research | 7,800 generated puzzles (15 variants × 6 levels, unoffered levels widened in memory), 3,983 single-clue removals, 1,505 simulated generations of its own proposal, 193 local-search climbs, the 26 reference fixtures | 670 baseline generations (every offered variant × level), 115 hidden-level and 390 held-out old-*evil* generations, 360 classic6 ablations, a 670-request floor-removal ablation, Killer cage-profile and symmetry probes, digit-relabelling probes, the 26 fixtures |
| Cross-review | pooled 9,425 records (both corpora plus intervention runs; 785 requests appear in both); separately, 8,310 deduplicated default-generator requests (8,309 complete proofs) + 193 climbs + 3,983 removal pairs + 125 relabelled puzzles; seven candidate formulas compared; simulation of the agreed ladder with today's digger (872 requests); targeted local search | the deduplicated default-generator corpus; dense large-board constructions; a Mega16 top-tier proposal experiment; an audit of the Killer climbs (proof completeness, symmetry) |
| Response | answers to the review of its report and to resolutions R1–R10; symmetric re-runs of the local search; Mega16/Samurai propose-and-refine runs | the same; tie and rounding checks; reproduction of the Mega16 refinement |

All experiments loaded the engine read-only (the file list of `tests/node-runner.js` through `vm.runInThisContext`) and
wrote only into the researchers' own folders; both repositories were verified clean after every phase.

---

## 2. How it works today

### 2.1 Levels

| id | en / vi | band (9×9) | min / max clues (9×9) | min clues per unit | groups allowed (cumulative; `cage`, `ineq` always) | dig oracle |
|---|---|---:|---:|---:|---|---|
| veryEasy | Very easy / Rất dễ | [0, 72) | 40 / 50 | 2 | basic | techniques |
| easy | Easy / Dễ | [72, 180) | 34 / 40 | 2 | + locked | techniques |
| medium | Medium / Trung bình | [180, 400) | 29 / 34 | 1 | + subset | techniques |
| hard | Hard / Khó | [400, 800) | 25 / 30 | 1 | + fish | techniques |
| expert | Expert / Chuyên gia | [800, 1500) | 22 / 27 | 0 | + wing | techniques |
| evil | Evil / Địa ngục | [1500, ∞) | 17 / 24 | 0 | + chain | uniqueness (DFS) |

Sources: `js/core/difficulty.js:100-116, 207-216, 315-318, 351-379`; names and descriptions `js/ui/locale.en.js:117-130`,
`js/ui/locale.vi.js:115-128`. design.md §6.7 calls *evil* "Ác mộng" (`design.md:550`), the locale "Địa ngục"; the locale
is what users see, and "Ác mộng" is free for the new nightmare tiers.

**Scaling** (`difficulty.js:233-289`): for a board of `C` cells and `D` digits the band edges are multiplied by `C/81`;
the minimum clue count is `max(1, floor(ref·C/81))`, then adjusted by the variant's `clueFloorScale` or replaced by its
`clueFloor`; unit minima are `floor(ref·D/9)`; `maxClues` is informative only.

**Other level-dependent settings:** guided digging from *medium* (Killer at every level, `js/variants/killer.js:896-902`);
Killer cage-size shares per level and layout repairs from *hard* (`killer.js:44-51, 519`); the warning for the
`rotational90`/`mirrorBoth` symmetries from *expert* (`js/ui/controls.js:43`); the pre-generation cost table
(`js/ui/cache.js:105-121`); the p95 budgets per level (`tests/fixtures/perf-helper.js:46-62`, design.md §9.1).

### 2.2 Scoring

`SG.difficulty.rate(model, givens)` solves with every technique (`assumeUniqueness: true`, `difficulty.js:491-503`). The
solver applies the techniques by registered `order`, one finding at a time, restarting from the first technique after
each finding (`js/core/logical-solver.js:128-144, 280-347`); it does not order by the calibrated costs. Every technique
has a registered `baseCost`; `SG.difficulty.COSTS` overrides it for the rating (`difficulty.js:175-198`; the table of
§5.2 lists both). `classify` then computes (`difficulty.js:384-479`):

```text
technique = Σ_t COSTS[t]·(n_t + 0.5)            first-use multiplier 1.5 (difficulty.js:116)
rawScore  = technique + 0.6·E                   E is recovered from the solver's own score (:413, :421)
tier(t)   = index of the group of t in BASE_GROUPS; cage and ineq techniques are tier 0
hardest   = the used technique with the largest (tier, cost, order)
floor     = TABLE[tier(hardest)].min · C/81     an unsolved report takes the top level's minimum (:453-454)
score     = max(rawScore, floor)                score − rawScore = "Bonus points for difficult techniques"
level     = the highest level with TABLE[i].min · C/81 ≤ score
```

The logical solver keeps a second, uncalibrated score built from `baseCost` (`logical-solver.js:39, 327-333, 393`); it
is not the rating. `confidence` is the distance to the nearest band edge over half a band width, clamped to [0, 1].

**Worked example** (both researchers reproduced it): classic9, requested *hard*, seed 1592778586, 28 clues, E = 53.

| technique | n | COSTS × (n + 0.5) |
|---|---:|---:|
| nakedSingle | 29 | 1 × 29.5 = 29.50 |
| hiddenSingleBox | 19 | 1.25 × 19.5 = 24.38 |
| hiddenSingleLine | 5 | 1.5 × 5.5 = 8.25 |
| pointing | 5 | 7 × 5.5 = 38.50 |
| nakedPair | 1 | 63 × 1.5 = 94.50 |
| xWing | 1 | 190 × 1.5 = 285.00 |
| empty cells | 53 | 0.6 × 53 = 31.80 |
| **rawScore** | | **511.93** — the floor (400) does not bind → *hard* |

**Floor example:** Samurai, requested *hard*, seed 2073087849, 369 cells, E = 263. rawScore = 1201.18, which the bands
× 4.556 place in *medium*; the hardest technique is a fish, so the floor raises the score to 400 × 4.556 = **1822.22**
(*hard*). The 621.05 added points are the "Bonus points for difficult techniques" row (`js/ui/result-view.js:125-148,
360-366`).

### 2.3 Generation

- **Pipeline** (`js/core/pipeline.js:38-42, 77-126, 229-326`): configure (the level must be in `difficultySupport`) →
  build the model → for each attempt (default 8): full grid (randomised DFS with MRV, `js/core/full-grid.js`) →
  `postGenerate` (Killer cages, Greater-Than signs) → up to 12 dig samples (30 when symmetry groups have more than two
  cells), each rated; the first exact sample wins (`js/core/digger.js:1253-1385`).
- **Stage A** (`digger.js:494-638`): cells grouped by symmetry orbit (default `rotational180`) and visited once in the
  chosen removal order; an orbit is skipped below the clue floor or the unit minimum; the acceptance oracle is the
  restricted logical solve (allowed groups, `assumeUniqueness: false`), or the DFS uniqueness test for *evil*.
- **Stage B, guided** (`digger.js:645-813`), from *medium* (Killer always): Stage A hands over at
  `max(minClues, round(0.47·C))` clues; then up to `max(4, min(32, round(32·81/C)))` random candidate removals are rated
  and the best score strictly below the band's maximum is applied; refused cells stay refused. For *evil* the objective
  is the score when the non-chain solve completes, otherwise `1e9 + unsolved cells` ("as stuck as possible"), with no
  upper bound.
- **Safety net:** `SG.dfs.countSolutions(…, 2) === 1`, otherwise a plain DFS dig and the warning
  `digger.unsoundTechnique` (`digger.js:974-992`).
- **Rate and accept:** full rating; a sample is exact when `rating.level === requested` (`digger.js:1129`) — it does not
  require `rating.solved`.
- **Fallback:** after every attempt, the closest sample by `1000·|Δlevel| + relative distance to the band`, with the
  warning `difficulty.approximate` (`digger.js:1166-1172, 1356-1368`). An exhausted budget raises an error and discards
  the best sample (`pipeline.js:212-223`, `js/core/budget.js`); the page gives the worker 120 s of active time
  (`js/worker/worker-client.js:39-40`).
- **Killer** (`killer.js:749-903`): cages grown from the solution with the level's size shares, layout repair from
  *hard*, then the cell dig with guided search at every level, no unit minima and a clue floor only at *veryEasy* (40).
  At 0–2 givens the cage layout alone decides the difficulty and the dig cannot raise it.
- **Greater-Than** (`js/variants/greater-than.js:314-494`): signs between neighbours of a box, clue groups revealed up to
  the floor, signs dug with the technique oracle and then to minimality, one more clue group revealed while the rating
  is above the requested level (at most 8 rounds).
- **Jigsaw / Wordoku:** the region shape (Jigsaw) and the word (Wordoku) are fixed per pipeline call; the Wordoku word is
  presentation only and gives the solver no information.

### 2.4 Variants today

| variant | cells | offered today | measured beyond the offered list (today's scoring, list widened in memory) |
|---|---:|---|---|
| classic4 | 16 | vE, E | medium and above 0 % (every sampled 4×4 puzzle needs only singles) |
| classic6 | 36 | vE, E | medium 1–3 %, hard 0–2 %, expert 90–93 %, evil 85–97 % — non-monotone |
| classic9, diagonalX, hyper, jigsaw9 | 81 | all six | — |
| wordoku | 81 | vE … X | evil 100 % |
| greaterThan | 81 | vE … X | evil 100 % |
| killer | 81 | vE … X | evil 80 % (48/60), 24/30 held out; 30/30 with `cageSize: +2` (larger cages) |
| mega12, mega16 | 144, 256 | vE … H | expert 100 %, evil 100 % |
| butterfly, flower, sohei, samurai | 144–369 | vE … H | expert 100 %, evil 100 % |

Lists: `js/variants/classic.js:128-130`, `mega.js:65-90`, `extra-regions.js:36, 185`, `jigsaw.js:783`,
`killer.js:1092`, `greater-than.js:515`, `multigrid.js:319-354`, `wordoku.js:580`. The caps of Mega and the multigrids
come from design.md §9.1 having no budget column for those levels (`mega.js:65-69`, `multigrid.js:345`), not from a
limit of the puzzle space. Measurements: claude-opus-5.5 sample A (7,800 puzzles); gpt-6-astra baseline, hidden-level
and held-out runs (1,175 puzzles).

### 2.5 Where level and score appear

| surface | today |
|---|---|
| Summary tab | cards "level reached" and "score"; the Difficulty Score table: a row per technique (uses, points, subtotal `COSTS·(n + 0.5)`), an Empty cells row (`0.6·E`), the floor row, Total (`js/ui/result-view.js:93-199, 347-369, 539-596`) |
| Generation Steps tab | the same table for each replay position, from `SG.player.rateStep` (400 ms budget, `null` when unratable; `js/ui/step-view.js:307-380`, `js/ui/player.js:568-622`) |
| Level picker | global levels filtered by `difficultySupport` (`js/ui/controls.js:178-189`); unsupported stored or URL levels snap to the nearest supported one (`js/ui/store.js:217-254`) |
| URL | `d=<level>`, accepted only if the id is known (`store.js:374-451`) |
| History | `sg.history.v1`; requested and achieved level, rounded score; shown as "level: score, seed" (`js/ui/history.js:25-123, 316-334`) |
| Cache | `sg.cache.v1`, schema 1; a regenerated puzzle must match the cached level and score (`js/ui/cache.js:82-83, 150-179, 289-339`); pre-generation cost table per level (`:88-121`) |
| Export / exchange | JSON `sudoku-generator/v1` with `difficulty {requested, achieved, score, hardestTechnique, techniqueCounts, rawScore, hardestGroup, confidence, solved, empties}` (`js/ui/export.js:177-191`); text header `#n,variant,level,seed` with the translated level; worker wire format passes `rating` through (`pipeline.js:371-424`) |
| Help | per-variant level list (`js/ui/help.js:115`); a ladder table that assumes one technique group per level and the scaled bands (`help.js:268-306`, texts `:1192-1236`) |
| Player | fixed `LEVELS` (`player:js/ui/importer.js:70`); unknown level ids are dropped silently, the puzzle still imports (`:703-714`); text import maps translated names back to ids (`:947-958, 1176-1177`); names in `player:js/ui/locale.*.js:93-106` |
| Tests pinning today's numbers | `tests/suites/difficulty.test.js` (six ids, floor, unsolved ⇒ evil, band scaling, I5), level lists in nine variant/UI suites, the floor row in `result-view.test.js`, regression hashes (25 combinations × 20 seeds, `tests/fixtures/regression.js`), soak gates (classic9 ≥ 90 %, others ≥ 80 %, `tests/soak.js`), labels of `tests/fixtures/rated.js` |

---

## 3. Diagnosis

### 3.1 The technique floor makes the score depend on the level

The dependency is: technique group → the level that owns the group (`BASE_GROUPS[i]` ↔ `LEVELS[i]`) → that level's band
minimum → the score → the level. It is not a runtime recursion and `rate` does not read the requested level, but the
number shown as the score is defined through the ladder it is supposed to determine: moving a band edge changes the
score of an unchanged puzzle. It was introduced on purpose so that invariant I5 ("score in the band **and** hardest
technique allowed") holds by construction (`difficulty.js:21-27`, `design.md:535, 1700`).

**How much the floor decides today** (share of exact puzzles whose shown score is the floor; claude-opus-5.5 sample A):
classic9 0–5 %, butterfly 8–15 %, flower 10–35 %, mega16 18–48 %, sohei 55–80 %, samurai 73–95 % (*hard*: 95 %).
gpt-6-astra: 45 of 670 baseline puzzles floor-raised, including 10/10 Samurai *hard*.

**Removing only the floor** (same costs, same scaled bands), static relabelling: level drops for classic9 1.4 %,
wordoku 1.2 %, butterfly 3.8 %, flower 7.5 %, mega12 7.9 %, mega16 12.5 %, sohei 33.3 %, samurai 45.0 %; the other
9×9 variants and the small boards 0–0.2 %. Regenerating with the floor removed (gpt-6-astra, 670 requests): six
Samurai *hard* requests fail on the work budget; with a 100-million-unit budget all ten succeed but need a median of 35
dig samples instead of 2 (≈ 70 ms → 1.1 s).

**What removal does not change:** below *evil*, a candidate removal is admissible iff the restricted solve completes
and `score < band max`; since the floor of an allowed technique is at most the band minimum,
`max(raw, floor) < max ⇔ raw < max`. Removing the floor changes the objective's ties, the dig path, the final labels and
the retry count, not the admissibility of one removal. **Conclusion of both researchers:** removing the floor and
replacing the size-scaled bands are one change; removing the floor alone would make large boards miss their levels.

### 3.2 Inconsistencies across variants

1. **Size enters through the bands, not the score.** Technique costs do not grow with the board, the bands do (× `C/81`).
   Large boards: one fish on a Samurai is "worth" medium and gets hundreds of floor points. Small boards: on 6×6 the
   first Simple Colouring step (322.5) plus singles exceeds the scaled *hard* band (178–355), so the guided dig refuses
   it at *hard* and the puzzle is labelled *expert*.
2. **The empty-cell term is linear.** Each empty cell costs 0.6 plus about 1.1 for the single that fills it: about 90
   points on classic9, about 450 on Samurai — the whole classic9 *hard* band — for singles alone.
3. **Calibration was done on classic9 only.** The cost multipliers (subset ×7, fish ×6, wing ×10, chain ×8) were fitted
   on about 2,700 classic9 puzzles (`difficulty.js:118-172`, design.md §18 D6); the other variants only tuned clue
   floors.
4. **Variant techniques are off-scale.** `cageCombo 10, ruleOf45 28, cageSplit 40, ineqChain 12, minMaxForcing 22` keep
   their design costs while their solver order places them among subsets and fish (orders 55–135). They are tier 0, so
   they never raise the floor and never outrank a locked-or-higher technique as hardest (they do beat singles). Killer
   *expert* has no wing in 60/60 puzzles (hardest: locked 30 %,
   subset 70 %; about 41 `cageCombo` and 9 `ruleOf45` uses); Greater-Than *hard* is mostly subset-peak puzzles pushed up
   by about 13 `ineqChain` uses.
5. **"Hardest" is tier-first.** A pointing step outranks any cage technique (`difficulty.js:393-424`), and the solver's
   own "hardest" is base-cost-first (`logical-solver.js:329-333`): the two disagree.
6. **Linear repetition rewards tedium.** The famous hardest 9×9 puzzles score 26.8k–37.6k today, a Mega16 *evil* with
   about 47 Nishio steps 69.5k. With an open top band this does not matter today; it would decide nightmare tiers.
7. **The solver path is not invariant.** Digit relabelling changes today's score for 6 of 40 classic9 puzzles (worst
   max/min ratio 1.65 over the larger probe); 3.7 % of single-clue removals lower the raw score (worst −53 %).
8. **Two copies of the scoring constants** (`difficulty.js:116`, `logical-solver.js:39`).

### 3.3 Why variants stop below the top level

| variant | offered top | measured | root cause |
|---|---|---|---|
| wordoku, greaterThan | expert | evil 100 % | gating only (design.md §9.1 had no *evil* budget) |
| mega12, mega16 | hard | expert, evil 100 % | gating (`mega.js:65-69`: "budgets up to 'hard' only") |
| butterfly, flower, sohei, samurai | hard | expert, evil 100 % | gating (`multigrid.js:345`); their *expert* is floor-made for 15–80 % of puzzles |
| killer | expert | evil 80 % | partly gating; the misses end at 0–2 givens with a fixed, too informative cage layout grown with the *expert* shares; larger cages (`cageSize: +2`) raise old-*evil* hits from 24/30 to 30/30 on held-out seeds |
| classic6 | easy | medium 1–3 %, hard 0–2 %, expert/evil ≈ 90 % | about 79 % of 6×6 digs need only singles (`classic.js:121-125`) plus the band scaling of §3.2.1 |
| classic4 | easy | medium+ 0 % | puzzle space: all 900 sampled 4×4 puzzles are solved by naked singles |

Budgets are not the binding constraint today: every measured combination stayed far below the 120 s
page budget. Two old-*evil* Killer outputs at zero givens (seeds 3203566290 and 3220343909) have **no complete logical
proof** yet are labelled *evil* today. Nishio depth 3 with chains of 24 still leaves 3203566290 unsolved (81 open cells);
3220343909 is solved at depth 3 (111 Nishio steps, score 4,675) — a depth-2 partial proof is not rateable either way. Solver
limits therefore do bind in some cases.

---

## 4. Choosing the formula

### 4.1 Candidates

| | claude-opus-5.5 (independent) | gpt-6-astra (independent) |
|---|---|---|
| score | `Σ_t c_t·√n_t + 5·√E` | `80·E/(E+40) + P + 0.25·P·log₂(1 + W/P)`, `P = max w_t`, `W = Σ w_t·n_t` |
| weights | today's `COSTS`; cageCombo 7, ineqChain 5, ruleOf45 63, minMaxForcing 70, cageSplit 160 | new table (§5.2) |
| ladder | 0 / 40 / 100 / 240 / 420 / 600 / 1000 / 2500 / 5000 / 10000 (nightmare1–3) | 0 / 45 / 180 / 400 / 700 / 1000 / 1500 / 2400 / 3600, then ×1.5 |
| unsolved | a "guess" pseudo-technique | unrated |

In the cross-review claude-opus-5.5 scored the common corpus with seven formulas (all with only `E` and the counts as
inputs), each with a ladder fitted to the same classic9 quantiles, so that only the shape differs:

| formula | cross-size mean / max \|log₂\| | removals lowering the score > 5 % | relabelling p90 / worst ratio | classic9 tier separation (AUC fish>subset, wing>fish, chain>wing) | highest level |
|---|---|---:|---|---|---|
| today's raw terms, no floor | 0.97 / 3.58 | 1.8 % | 1.076 / 1.648 | .995 / .955 / .961 | N3 everywhere ≥ 9×9 |
| `Σ c√n + 5√E` (claude-opus-5.5) | 0.63 / 2.27 | 1.9 % | 1.079 / 1.413 | .998 / .974 / .961 | N3 on 11 variants |
| **peak + log work + V(E)** (gpt-6-astra) | **0.38 / 1.38** | **0.4 %** | **1.013 / 1.104** | **1 / 1 / 1** | N2 |
| same shape, today's `COSTS` | 0.35 / 1.29 | 0.5 % | 1.013 / 1.105 | 1 / 1 / .997 | N2 |
| gpt-6-astra weights, `√n` per technique | 0.68 / 2.35 | 1.9 % | 1.073 / 1.392 | .988 / .927 / .966 | N3 on 11 variants |
| additive "PW": `V + P + 0.25·Σ w_t·log₂(1+n_t)` | 0.42 / 1.54 | 1.2 % | 1.042 / 1.217 | 1 / 1 / .995 | N3 on 8 variants |

gpt-6-astra's independent measurements agree: on matched hardest-technique ids across sizes the shift is 0.326 vs 0.672;
over the 3,983 removals 141 vs 177 score decreases and 9 vs 21 level decreases (but a worst single drop of two levels
against one); under 20 digit permutations of 40 classic9 puzzles the worst max/min ratio is 1.097 vs 1.324, with 0 vs 2
level changes (all with the tenth-point prototype). **The shape drove most of the measured invariance gains** (the same
shape with today's costs performs about the same); the weights still materially affect the labels.

### 4.2 Volume versus peak

| case (complete proofs) | `Σ c√n + 5√E` | peak + log work (agreed) |
|---|---|---|
| singles only: classic4 / classic6 / classic9 | vE / vE / vE–E | vE / vE / vE–E |
| singles only, every board larger than 81 cells (E 72–215) | easy (scores 51–95) | easy (scores 54–72) |
| exactly one fish step: classic6 / classic9 / Samurai | H 98 % / 100 % / 100 % | H 100 % / 100 % / 100 % |
| exactly one wing step: classic6 / classic9 | vH 82 % / 81 % | vH 82 % / 78 % |
| locked-candidate peak, Killer (177 puzzles) | E 40 %, M 60 % | E 100 % |
| chain peak, Samurai (75 puzzles) | Ev 7, N1 17, N2 59, N3 17 % | Ev 27, N1 29, N2 44 % |
| fish peak, Mega16 vs classic9 (medians) | +2 levels | 0 levels |

Both formulas keep hundreds of easy steps below *medium* and let one hard step decide a small puzzle; the agreed shape
lets repeated lower-tier work count much less, so a large board rises at most one level for the same hardest technique
(two only for long chain sequences on Mega16 and Flower).

### 4.3 Reference puzzles (`tests/fixtures/rated.js`)

| fixture (label) | today | `Σ c√n + 5√E` | agreed formula |
|---|---|---|---|
| wikipedia-example, classic-easy (easy) | easy 82, 79 | easy 43, 42 | easy 47, 46 |
| classic-easy-2 (easy) | easy 73 | easy 40 | easy 45 (44.7 before integer rounding; *veryEasy* with tenths) |
| classic-medium (medium) | easy 85 | easy 46 | easy 48 |
| constructed veryEasy / easy / medium / hard (×3 each) | all match | all match | all match |
| constructed expert ×3 (one wing each) | expert 820–1202 | 535–790: vH, X, X | 879–940: **veryHard ×3** |
| constructed evil ×3 | evil 9,279–10,252 | 3,845–4,281: **nightmare1** | 2,148–2,178: **evil** |
| Escargot, Inkala 2012, Platinum Blonde, Golden Nugget | evil 26,832–37,603 | 6,936–8,007: N2 | 3,689–3,905: **nightmare2** |

Under the agreed formula the constructed *evil* certificates stay *evil*, one-wing puzzles become *veryHard* (the
intended meaning of the inserted level), and the famous four sit in the highest populated tier, which higher-scoring
generated puzzles share (highest complete-proof score in more than 10,000 puzzles: 5,028). Under the other candidate,
generated puzzles with long chain sequences ranked a tier above the famous four.

### 4.4 Decision

Both researchers adopt the **peak + logarithmic work + bounded empty-cell** shape with gpt-6-astra's weight table.
claude-opus-5.5 withdrew `Σ c√n + 5√E` after the head-to-head; the additive "PW" variant is the documented fallback if
independent per-row subtotals ever become a hard requirement.

---

## 5. Agreed design (rating v2) — specification for the implementation

### 5.1 Score

```text
precondition  a complete logical proof (rating.solved === true); otherwise the puzzle is unrated (§5.5)
E   = empty cells at the start                        (rating.empties)
n_t = uses of technique t                             (rating.techniqueCounts)
w_t = weight of t (§5.2); a technique without a weight is an error, never a guessed cost
P   = max { w_t : n_t > 0 }                           0 when no technique is used
W   = Σ_t w_t · n_t
V   = 80 · E / (E + 40)                               bounded by 80; 40 at E = 40
R   = 0.25 · P · log₂(1 + W / P)                      0 when P = 0
score = Math.round(V + P + R)                         one rounding of the unrounded sum (never round the parts or a
                                                      tenth-rounded value again); an integer, so classification,
                                                      Summary, history and export agree
level = the level whose band [min, max) contains score   (one table, §5.3)
```

- **Rounding:** integer instead of the tenths of gpt-6-astra's prototype changes the level of 6 of 8,398 complete
  proofs and none in the relabelling probes; `classic-easy-2` (44.7) becomes 45, i.e. *easy*, its fixture label. Double
  rounding would change 296 of the 8,309 primary scores (302 of the 8,398 in the expanded corpus; e.g. 2475.48 → 2475.5
  → 2476), so it is forbidden. `Math.log2` is not guaranteed to
  be correctly rounded across JavaScript engines; a flip needs a value within about 1e-12 of an x.5 boundary, so
  reproduction across browsers is practical rather than provable.
- **Inputs:** `E` and the technique counts only. **Not inputs:** requested or achieved level, variant id, cell count,
  digits, clue density, time, symmetry, cage or sign counts.
- **Properties:** identical `E` and counts give the identical score in every variant; the score never decreases when a
  count, `E` or the weight of the hardest technique grows (for fixed `W`, `d/dP (P + 0.25·P·log₂(1+W/P)) > 0`); it does
  not depend on the order of an unchanged multiset of steps. It is **not** monotone under clue removal (the proof
  changes; with the tenth-point prototype 3.5 % of removals lowered it and 0.23 % lowered the level) — the digger must
  not assume it is.
- **Size:** `V(10) = 16`, `V(41) = 40.5`, `V(81) = 53.6`, `V(263) = 69.4`, `V(369) = 72.2`. A singles-only proof on any
  board up to 369 cells stays below about 77 (at most *easy*); one expensive step counts in full on any board through
  `P`. A Killer with zero givens simply has `E = 81`.
- **Worked example** (classic9 *hard*, seed 1592778586): `P = 320` (xWing),
  `W = 29 + 19·1.25 + 5·1.5 + 5·40 + 120 + 320 = 700.25`, `V = 80·53/93 = 45.59`,
  `R = 80·log₂(1 + 700.25/320) = 133.82`; score `= round(499.41) = 499` → *hard*. Samurai seed 2073087849:
  `P = 360`, `W = 1372`, `V = 69.44` → **633** (*hard*, without any floor; today 1822.22).

### 5.2 Weights

The weights replace `COSTS` and the `baseCost` fallback **in the rating only**; the solver's order and its own raw score
are unchanged. The last column is a necessary lower bound on the unrounded technique contribution `P + R` of any
puzzle that uses the technique (`R ≥ 0.25·P` because `W ≥ P`), not an attainable minimum score; it justifies the
pruning rule of §5.7.

| technique | group | solver order | registered baseCost | COSTS today | **v2 weight `w_t`** | 1.25·w_t |
|---|---|---:|---:|---:|---:|---:|
| nakedSingle | basic | 10 | 1 | 1 | **1** | 1.25 |
| hiddenSingleBox | basic | 20 | 2 | 1.25 | **1.25** | 1.56 |
| hiddenSingleLine | basic | 30 | 3 | 1.5 | **1.5** | 1.88 |
| pointing | locked | 40 | 7 | 7 | **40** | 50 |
| boxLine | locked | 50 | 7 | 8 | **50** | 62.5 |
| nakedPair | subset | 60 | 9 | 63 | **120** | 150 |
| hiddenPair | subset | 70 | 11 | 77 | **145** | 181.25 |
| nakedTriple | subset | 80 | 15 | 105 | **180** | 225 |
| hiddenTriple | subset | 90 | 18 | 126 | **220** | 275 |
| nakedQuad | subset | 100 | 24 | 168 | **260** | 325 |
| hiddenQuad | subset | 105 | 24 | 182 | **300** | 375 |
| xWing | fish | 110 | 32 | 190 | **320** | 400 |
| simpleColouring | fish | 120 | 36 | 215 | **360** | 450 |
| swordfish | fish | 130 | 42 | 250 | **420** | 525 |
| jellyfish | fish | 160 | 56 | 335 | **520** | 650 |
| xyWing | wing | 140 | 48 | 480 | **650** | 812.5 |
| xyzWing | wing | 150 | 54 | 540 | **750** | 937.5 |
| wWing | wing | 170 | 60 | 600 | **850** | 1062.5 |
| uniqueRectangle | wing | 180 | 66 | 660 | **900** | 1125 |
| forcingChain | chain | 190 | 90 | 720 | **1100** | 1375 |
| nishio | chain | 200 | 140 | 1120 | **1700** | 2125 |
| cageCombo | cage | 55 | 10 | – | **40** | 50 |
| ruleOf45 | cage | 95 | 28 | – | **260** | 325 |
| cageSplit | cage | 135 | 40 | – | **520** | 650 |
| ineqChain | ineq | 65 | 12 | – | **40** | 50 |
| minMaxForcing | ineq | 85 | 22 | – | **180** | 225 |

Rationale (gpt-6-astra): singles stay close together so that their order does not matter; cage combinations and
inequality chains start at the locked-candidate level; rule of 45 (region bookkeeping plus arithmetic) and cage
splitting (two virtual cages) sit among strong subsets and fish. The weights are engineering priors, not human
measurements; `ruleOf45` and `cageSplit` are the first human-calibration targets (claude-opus-5.5 would use about 145
and 420; this moves old Killer *hard*/*expert* puzzles between *medium* and *hard* but changes no reachability result).

### 5.3 Ladder

| # | id | en | vi | band | typical content (classic9, measured) |
|---:|---|---|---|---|---|
| 0 | veryEasy | Very easy | Rất dễ | [0, 45) | singles only, at most about 43 empty cells |
| 1 | easy | Easy | Dễ | [45, 180) | more empty cells; locked candidates; first cage-sum and inequality steps |
| 2 | medium | Medium | Trung bình | [180, 400) | pairs and triples (all naked-pair-peak puzzles); min/max forcing |
| 3 | hard | Hard | Khó | [400, 700) | hidden triples, quads; X-Wing, Swordfish, simple colouring; rule of 45 (all rule-of-45-peak puzzles) |
| 4 | **veryHard** | Very hard | Rất khó | [700, 1000) | one or two XY/XYZ-Wings (59 % of wing-peak puzzles); Jellyfish; cage splitting (both score at least 650 + V) |
| 5 | expert | Expert | Chuyên gia | [1000, 1500) | several wings, W-Wing, Unique Rectangle, short forcing chains |
| 6 | evil | Evil | Địa ngục | [1500, 2400) | forcing chains, a Nishio step (82 % of chain-peak puzzles) |
| 7 | **nightmare1** | Nightmare 1 | Ác mộng 1 | [2400, 3600) | many chains and Nishio steps |
| 8 | **nightmare2** | Nightmare 2 | Ác mộng 2 | [3600, ∞) | the level of the hardest published 9×9 puzzles (Escargot, Golden Nugget …) |

- No further tiers in this release. Under this formula volume is compressed: no generated puzzle reached 5,400 (maximum
  observed 5,028; 0 of 61 simulated nightmare-3 requests). Higher tiers are unvalidated and excluded from v2, not
  mathematically excluded; finer technique ids (Nishio depth, chain length) are one possible route to them.
- Level descriptions follow this table; `BASE_GROUPS` no longer defines levels.

**Level texts (canonical; both apps use them verbatim).** Unchanged: the names and descriptions of veryEasy and easy.
New or reworded — the level comes from the score, so the texts say what a level *typically* uses; medium and hard no
longer name quads or Jellyfish, which now score a level higher:

| id | en name | en description | vi name | vi description |
|---|---|---|---|---|
| medium | Medium | Typically uses pairs and triples of candidates (naked and hidden subsets). | Trung bình | Thường dùng các cặp và bộ ba ứng viên (tập con trần và ẩn). |
| hard | Hard | Typically uses quads, fish patterns (X-Wing, Swordfish) and simple colouring. | Khó | Thường dùng bộ bốn ứng viên, các mẫu “cá” (X-Wing, Swordfish) và tô màu đơn giản. |
| veryHard | Very hard | Typically uses a wing (XY-Wing, XYZ-Wing), a Jellyfish or several fish patterns. | Rất khó | Thường dùng một kỹ thuật cánh (XY-Wing, XYZ-Wing), Jellyfish hoặc nhiều mẫu “cá”. |
| expert | Expert | Typically uses several wings, the W-Wing or Unique Rectangles, sometimes a short forcing chain. | Chuyên gia | Thường dùng nhiều kỹ thuật cánh, W-Wing hoặc Unique Rectangle, đôi khi một chuỗi suy luận ngắn. |
| evil | Evil | Typically uses forcing chains and trial and error (Nishio), with very few clues. | Địa ngục | Thường dùng chuỗi suy luận và thử–sai (Nishio), với rất ít số cho sẵn. |
| nightmare1 | Nightmare 1 | Typically uses many forcing chains and trial-and-error steps. | Ác mộng 1 | Thường dùng nhiều chuỗi suy luận và bước thử–sai. |
| nightmare2 | Nightmare 2 | Highest score band; typically involves substantial advanced reasoning. | Ác mộng 2 | Khoảng điểm cao nhất; thường cần nhiều suy luận nâng cao. |

### 5.4 Rating metadata

- `hardestTechnique` = the used technique with the largest weight, i.e. the technique that provides `P`. Ties are broken
  by the larger numeric registration `order`, then by the id in ascending code-unit order: `nakedQuad` beats `ruleOf45`
  (both 260; order 100 vs 95), `jellyfish` beats `cageSplit` (520; 160 vs 135), `ineqChain` beats `pointing` (40; 65 vs
  40). This only selects metadata and the row that carries `P`; it never reorders the solver. `hardestGroup` is the group
  of that technique.
- `rawScore` = `score` (kept for format compatibility); `confidence` keeps its definition (margin to the nearest band
  edge) on the new bands; `solved`, `empties`, `techniqueCounts` are unchanged; ratings carry `ratingVersion: 2`.
- The single-technique subtotal `techniqueScore(t, n)` no longer exists as an independent quantity; the table uses §5.6.

### 5.5 Incomplete proofs

- A rating without a complete logical proof has no level and no band; it is never a generator hit (today it can be,
  `digger.js:1129`). The final completion test stays explicit even though the technique oracle made incomplete outputs
  vanish in every measurement (0 of 872 simulated requests): the oracle and the final rating use different options and
  budgets.
- The generator returns only completely rated puzzles: the first exact sample; otherwise, after the deterministic caps of
  §5.7, the closest completely rated sample with the existing `difficulty.approximate` warning; otherwise the existing
  error path. No score is ever derived from the number of unsolved cells.
- Replay positions that cannot be rated completely show the existing "not available" (`null`) state.
- Imported and legacy puzzles keep their stored metadata; nothing is rejected because of its rating.

### 5.6 Display: the Difficulty Score table keeps its layout

- **Technique rows:** Uses `n_t`, Points `w_t`, Total `q_t = R·w_t·n_t / W`, plus `P` on the row of
  `hardestTechnique`; `Σ_t q_t + V = P + R + V`.
- **Empty cells row:** `V` (its "points" value, if shown, is the average `V/E`, or blank when `E = 0`). **Total row:** the
  score. One application of the existing `roundToTotal` to all technique shares and the empty-cell share, targeting the
  integer score, gives whole numbers that add up to the total. `W = 0` (no technique) needs no division: the score is
  `round(V)`. Summary and Generation Steps use the same allocation helper and row order.
- **Removed:** the "Bonus points for difficult techniques" row, its strings and its help text (en/vi).
- **Reworded:** the first-use note ("The first use of a technique counts 1.5 times") becomes, in English, "The hardest
  technique counts its points once in full; the rest grows with the logarithm of the total work (points × uses) and is
  shared among the techniques in proportion to it — a row's total is its allocated share of the score, not points ×
  uses", and in Vietnamese "Kỹ thuật khó nhất được tính đủ điểm một lần; phần còn lại tăng theo logarit của tổng khối
  lượng (điểm × số lần dùng) và được chia cho các kỹ thuật theo tỉ lệ đó — tổng của một dòng là phần được phân bổ của
  điểm, không phải điểm × số lần dùng". The empty-cells description becomes "Empty cells add 80 × E ÷ (E + 40) points,
  at most 80" / "Các ô trống cộng 80 × E ÷ (E + 40) điểm, tối đa 80".
- Recorded alternative (gpt-6-astra's preference, not chosen because the user asked for slight UI changes): technique
  rows showing points × uses as "work", plus separate Peak `P`, Workload `R` and Empty cells `V` contribution rows.

### 5.7 Generation

1. **Level spec** (`SG.difficulty.spec`): the band of §5.3 without scaling; allowed techniques
   `{ t : 1.25·w_t < band max }` (exact pruning; every technique for nightmare2); the technique oracle with a complete
   proof (`assumeUniqueness: false`) at every level; clue floors as today (9×9 references 40, 34, 29, 25, **25**, 22,
   17, **17**, **17** for the nine levels, scaled as today), unit minima and variant `clueFloorScale` entries mapped
   veryHard → hard and nightmare1/2 → evil.
2. **Stage A** checks the band's upper edge for each accepted orbit removal when the band is bounded, so *veryEasy* and
   *easy* stop in time on large boards (dense *veryEasy* puzzles were constructed on all six large boards).
3. **Guided Stage B at every level** (as Killer does today), maximising the score strictly below the band maximum.
4. **Exact sample** = complete proof **and** `level === requested`.
5. **Top tiers** (evil, nightmare1, nightmare2): candidates from the fast uniqueness-based dig (today's *evil* strategy)
   are rated in full and accepted when completely solved and in the band. A candidate **above** the band is refined
   downward by re-adding symmetric clue groups from the solution (deterministic cap: 64 full ratings) until it enters the
   band: groups are tried in a seeded order; a completely rated addition is kept when the score is ≥ the band minimum —
   if the score is also < the band maximum it is accepted and the refinement stops, otherwise refining continues;
   additions that leave the proof incomplete or the score below the band minimum are undone. On Mega16 the proposals land
   in nightmare2 10/10 (median 0.2 s) and the refinement brings them into nightmare1
   or evil 10/10 with at most 0.4 s extra (Samurai 9/10 and 10/10), whereas the guided oracle path needed 124–150 s. The
   refinement does not work for Killer at zero givens, where one added clue pair drops the score past the whole band.
6. **Local search** when no sample of an attempt is exact: symmetry-preserving **addition, removal and swap** of clue
   orbits; Greater-Than sign removal; Killer merge of two adjacent cages or transfer of a boundary cell (cages stay
   connected, digit-distinct, ≥ 2 cells; the solution stays unique). A move is kept iff the puzzle stays unique with a
   complete proof and the score does not decrease and stays below the band maximum; above-band candidates use the
   refinement of item 5. The closest complete candidate is kept throughout and the search stops on entering the band.
   Cage changes happen in the structure phase (before the replayable dig) or are logged truthfully, so the Generation
   Steps replay stays correct. The configured symmetry is always preserved. Measured with symmetric moves (Killer 6 s,
   classic9/Wordoku 4 s, classic6 2 s per start): Killer veryHard / expert / evil 8 / 4 / 7 of 10 (cage moves do not touch
   the clue symmetry); classic9 nightmare2 0/10, Wordoku nightmare2 0/8, classic6 evil 3/20 — the earlier 3/10, 4/8 and
   9/20 came from moves that broke the symmetry.
7. **Killer cage profile:** veryHard uses the *hard* shares; evil keeps its shares at the user's tilt (its middle band is
   filled by the cage search of item 6); nightmare1 and nightmare2 use the *evil* shares (identical to *hard*'s today)
   with tilt `clamp(cageSize + 2, −2, 2)`, i.e. the measured `+2` (larger cages) at the default slider position
   (held-out run: old-*evil* hits 24/30 → 30/30, complete proofs 29/30). If *evil* fails its qualification, the
   implementation may also test it with the `+2` tilt (gpt-6-astra's variant) and keep whichever qualifies. Every new id
   needs an explicit entry: `SIZE_SHARES[level] || SIZE_SHARES.medium` (`killer.js:198`) would otherwise silently give it
   the *medium* shares.
8. **Greater-Than:** the "too hard → reveal a clue group" loop compares levels by index on the new ladder.
9. **Determinism:** attempts, samples, proposed moves and full ratings are counted separately. Starting values, per
   full-grid attempt and for every variant: at most 1,024 full ratings (the 64 ratings of the downward refinement count
   toward them) and 32,768 proposals — with symmetric moves 1,024 proposals gave only 27–63 rated candidates on 9×9 —
   and a 200,000-unit uniqueness guard per candidate; the current attempt and sample defaults are kept. Any adjustment
   the qualification makes (for a variant whose p95 exceeds its budget) is recorded with its results. Rejected and
   invalid proposals count too, so no loop runs until a clock expires. The objective compares the integer score with the
   band edges; a deterministic tie-breaker on the unrounded sum is allowed. Once the caps are exhausted the closest
   completely rated sample is returned (§5.5). The 120 s active-time guard and user cancellation remain errors, so a seed
   never depends on machine speed. The caps are starting values for the qualification (§6), not tuned constants.

### 5.8 Compatibility and versioning

- **Level ids:** the six existing ids remain valid in URLs, history, export and the player; `d=` accepts the new ids.
- **Cache:** key/schema bump, so cached v1 puzzles are dropped once; the pre-generation cost table covers the new levels.
- **History:** entries keep their stored level and score; reopening one regenerates with v2, possibly a different puzzle.
- **URLs:** no version parameter in this release; an old link may regenerate a different puzzle with the same settings.
- **Export:** format `sudoku-generator/v1` kept; `difficulty.ratingVersion: 2` added; `rawScore = score`.
- **Player:** `LEVELS` and the en/vi names gain veryHard, nightmare1, nightmare2 (also used by the text import); unknown
  or legacy metadata stays non-fatal; nothing in gameplay changes.

### 5.9 Tests and documentation

- Rewrite the tests that pin the floor, band scaling, six levels, "unsolved ⇒ evil", tier-first "hardest" and
  group-owned levels; UI and gameplay tests stay unchanged apart from the score-table contract.
- New tests: score purity (same `E` and counts → same score in every variant), the worked examples (499, 633), band
  edges, monotonicity in the inputs, the unrated policy, the hardest-technique rule, apportioned rows summing to the
  total, support lists equal to the qualification results.
- Regression hashes regenerated once after review (`node tests/perf.js --update-hashes`); the hash diff is reviewed rather
  than replaced blindly, because some combinations legitimately keep their puzzles (gpt-6-astra: 20/20 classic4 and
  classic9 *veryEasy* and 11/20 classic9 *hard* hashes unchanged in its probe). `tests/soak.js` bands, gates and
  histograms move to nine levels.
- Documentation: design.md §6 (scoring, ladder, no floor; also its "Ác mộng" name for *evil*, which would clash with the
  nightmare tiers), §9.1 budgets, §14 formats, §15 invariants (I5 becomes "score in band"); README (levels, scoring,
  calibration, adding a variant or a technique); help texts (en/vi); the stale load-order comment at
  `js/variants/registry.js:16`.
- Tests that must not be weakened: uniqueness, valid solutions and givens, configured symmetry, determinism under the
  same work caps, faithful replay, allocated rows summing to the total, import/export compatibility, unchanged gameplay.

---

## 6. Supported levels per variant

**Qualification protocol** (offline, re-run whenever weights, bands or the generator change): for each variant with its
default options and symmetry, and each level, generate 40 puzzles with fixed seeds through the real pipeline. A hit is a
valid, unique puzzle with a complete proof whose level is exactly the requested one; timeouts, approximate results and
unrated outputs count as misses. Offer the level if at least 36/40 hit and the p95 generation time is within 2 s
(classic4, classic6), 10 s (other boards up to 81 cells) or 30 s (larger boards). With 30–35 hits, run 60 more seeds and
offer the level if at least 90/100 hit (the first 40 included). Below 30, hide it. Every request counts, including
timeouts and approximate or unrated outputs; p95 is computed over all requests; a level that meets the hit threshold but
not the time budget is hidden. The published table records the sample size, the observed rate, the profile (default
options and symmetry), the machine and the engine version. Lists may have gaps; the picker already shows only the listed
levels and snaps other requests to the nearest listed one. The protocol is a compromise between claude-opus-5.5's 40 and
gpt-6-astra's 200 seeds that keeps the compute bounded.

**Expected outcome** — to be confirmed by the qualification. Columns: the simulation of the agreed ladder with *today's*
digger (claude-opus-5.5, 872 requests, 0 incomplete proofs), and both researchers' expectation once §5.7 is in place
(symmetric local search and propose-and-refine runs of phase 3):

| variant | simulation with today's digger (hits per level) | expected support after §5.7 |
|---|---|---|
| classic4 | vE 10/10, everything else 0 | veryEasy only (the 4×4 space needs only singles) |
| classic6 | vE 10, E 0, M 1, H 9, vH 5, X 6, Ev 3, N1 0 (of 10) | veryEasy, hard; veryHard/expert borderline; easy, medium, evil (3/20 with symmetric search), nightmare hidden |
| classic9, wordoku | 10/10 from vE to N1 (N1 ≈ 0.6–0.8 s); N2 0/10 | veryEasy … nightmare1; nightmare2 not reliable under the default symmetry (0/10, 0/8 with symmetric search; an asymmetric classic9 dig produced a 3,625 witness) |
| diagonalX, hyper, jigsaw9 | 5/5 at every level up to N2 (0.3–0.8 s) | veryEasy … nightmare2 |
| greaterThan | 10/10 at every level up to N2 (0.4 s) | veryEasy … nightmare2 |
| killer | vE–H 10/10, vH 2, X 1, Ev 2, N1 6, N2 2 (of 10) | veryEasy … hard; veryHard likely and expert / evil / nightmare1 borderline with the cage search (8 / 4 / 7 of 10 within 6 s) and the larger-cage profile |
| mega12, butterfly | vE 0; easy … N2 3/3 (N2 2.4–4.0 s) | veryEasy (Stage-A check) … nightmare2 |
| samurai, sohei, flower | vE 0; easy … N2 2/2 (N2 2–10 s) | veryEasy (Stage-A check) … nightmare2 |
| mega16 | vE 0; easy … N2 2/2, but evil 20 s, N1 124 s, N2 150 s | veryEasy (Stage-A check) … nightmare2, the top tiers through propose-and-refine (≈ 0.2–0.6 s) |

A *maximum observed* score is only a lower bound of what exists; "hidden" means "not generated reliably under these
settings", never "impossible". A valid exceptional puzzle keeps its real label even if its level is not offered.

---

## 7. Visible changes (to report to the user)

The formula has priority; these are the user-visible consequences, all inside the existing screens and controls.

1. **Difficulty Score table** (Summary and Generation Steps): same layout. The "Bonus points for difficult techniques"
   row disappears; "Points" shows the new weights; a technique's total is its share of the score (the hardest technique's
   row also carries the peak `P`); the Empty cells row shows `80·E/(E+40)`; two explanatory texts are reworded (§5.6).
2. **Level names:** three new levels in English and Vietnamese (Very hard / Rất khó, Nightmare 1 / Ác mộng 1,
   Nightmare 2 / Ác mộng 2); the descriptions of *medium*, *hard*, *expert* and *evil* are reworded (quads and Jellyfish
   moved up a level; *evil* is no longer "the hardest level"); see the canonical texts in §5.3.
3. **Level picker per variant:** the lists change and may have gaps: classic4 keeps only *veryEasy*; classic6 changes
   (loses *easy*, gains harder levels); Killer, Greater-Than, Wordoku, Mega and the multigrids gain *evil* and nightmare
   levels where they qualify.
4. **Scores and labels:** every score is on a new, smaller scale (puzzles labelled *evil* today, scored 1,500–37,600,
   spread over *veryHard* … *nightmare2* with scores below about 5,000); some puzzles change level (old *expert* with one
   wing → *veryHard*; old Killer *medium* → *easy*; old Samurai *hard* stays *hard* without its floor points).
5. **Generated puzzles:** for the same settings and seed the clues, Killer cage shapes and Greater-Than signs can differ
   from today; top levels can take longer to generate (classic9 nightmare1 ≈ 0.6 s; large-board nightmare2 2–10 s), and the
   "closest puzzle found" notice may appear more often near the work limits.
6. **History, links, cache:** formats unchanged; old history entries keep their old score and level; reopening an old
   entry or an old link **may** produce a different puzzle (exact reproduction across versions is no longer guaranteed,
   although some combinations, such as classic9 *veryEasy*, keep their puzzles); the pre-generated puzzle cache is
   emptied once.
7. **Help:** the scoring section and the ladder table are rewritten for the new formula and the nine levels (same
   layout).
8. **Export:** JSON gains `difficulty.ratingVersion: 2`; `rawScore` equals `score`.
9. **Player:** recognises and names the three new levels (en/vi); an old player still imports new puzzles but drops
   their difficulty info. No gameplay change.
10. **Symmetry warning:** still shown from *expert* upward, now including the nightmare levels.

---

## 8. Disagreements and how they were resolved

| topic | claude-opus-5.5 (independent) | gpt-6-astra (independent) | resolution |
|---|---|---|---|
| score formula | `Σ c_t√n_t + 5√E` | peak + log work + `V(E)` | gpt-6-astra's shape; claude-opus-5.5 switched after the head-to-head (§4) |
| weights | today's `COSTS` + variant costs 7/63/160/5/70 | new table | gpt-6-astra's table, frozen for v2; Killer `ruleOf45`/`cageSplit` calibration later |
| rounding | none | tenths | integer (`Math.round`), so the shown score always matches the band |
| ladder | 0/40/100/240/420/600/1000/2500/5000/10000 | 0/45/180/400/700/1000/1500/2400/3600, ×1.5 above | gpt-6-astra's edges, two nightmare tiers only |
| nightmare ids | nightmare1–3 | nightmare, nightmare-2, … | `nightmare1`, `nightmare2` |
| unsolved proofs | a "guess" term | unrated | unrated; never a hit |
| classic6 | ceiling *expert*; no easy/medium | *evil* routinely, *nightmare* rarely | both overstated: easy/medium are rare (not absent); *evil* stays rare even with symmetric search (3/20); support is measured |
| large-board *veryEasy* | lost, hide it | not discussed | reachable with the Stage-A edge check (dense puzzles exist on all six boards) |
| Killer | cage-layout local search | larger cages; reject partial proofs | merged: larger-cage profile for top tiers + symmetry-preserving cage moves + complete-proof guard |
| Mega16 top tiers | slow (43–150 s) | strategy artefact; fast proposals | fast uniqueness-dig proposals, refined downward by re-adding symmetric clue groups (amendment to R6 requested by both) |
| classic9 / Wordoku nightmare2 | reachable with local search (3/10, 4/8) | reachable (asymmetric witness) | not reliable under the default symmetry (0/10, 0/8 with symmetric moves); expected top: nightmare1 |
| score display | additive table | separate Peak / Workload / Empty rows | apportionment in the existing table (slight UI change); the other form recorded |
| support protocol | 40 seeds, ≥ 90 % | 200 seeds, ≥ 95 % with Wilson bound ≥ 90 % | 40 seeds, extended by 60 when borderline |
| budget fallback | best-so-far on budget exhaustion | deterministic work caps; time limit stays an error | deterministic caps |

---

## 9. Errors found by the cross-review

**In claude-opus-5.5's report** (acknowledged): the "guess" term for unsolved proofs (it would label a solver failure
nightmare3); the √n formula (worse on the selected aggregate criteria); an *evil*/nightmare1 edge at 2,500 that put the constructed *evil*
certificates in nightmare1; "classic6 cannot produce easy/medium" (rare, not absent); the climb prototype accepted moves
without checking the proof was complete and broke the configured symmetry in 142 of 193 endpoints (54 of 68 in the
review's extra runs), which inflated the classic9/Wordoku nightmare2 and classic6 *evil* results; the Mega16 top-tier
times measured one slow strategy, not the board; the review's 9,425-record pool counted 785 overlapping requests twice
(no conclusion changes); facts missed: hits do not require `solved`, budget errors discard the best sample,
Jigsaw/Wordoku structure is fixed per call, `sg.lastConfig.v1`, the floor's tie effect. Its review also wrote that the
top Killer tiers should shift to *smaller* cages; the code (`killer.js:27-28, 189-205`) shows that `cageSize: +2` means
**larger** cages, which is what this report uses.

**In gpt-6-astra's report** (acknowledged): classic6 "evil routinely, nightmare rare" rested on old labels (under its own
ladder: evil 5/30, one nightmare puzzle 75 points above the edge); the loss of *veryEasy* on large boards at today's clue
counts was not stated; tiers above nightmare-2 were proposed without validation (none observed; they are excluded from v2,
not proven impossible); the Killer middle-level gap was not
discussed; the 200–500-seed validation was not costed; the UI impact of the formula was overstated (apportionment keeps
the table); "all ten hyper medium outputs rescore as easy" was a small-sample statement (70 % on 110); the path-robustness
advantage was partly due to tenth-point rounding (unrounded, both formulas change 6 of 40 cases; the amplitude advantage
1.097 vs 1.324 stands).

No code citation or arithmetic error was found in either report.

---

## 10. Risks, open questions and later work

**Risks**

- **Human validity** is the largest open question: weights and edges are engineering priors checked against traces and
  reference puzzles, not against human solving times.
- **Technique granularity:** one id covers depth-1 and depth-2 Nishio, short and long chains, easy and hard cage
  arithmetic; tiers above nightmare2 need finer ids.
- **"Used" is not "required":** the greedy solver gives one proof; a different route can change the score (relabelling
  worst ratio 1.10).
- **Search cost** after removing the floor and adding top tiers: the qualification must hold the time budgets in a
  browser worker; Mega16 and Samurai top tiers are the tightest.
- **Reproducibility break:** many (variant, level, seed) combinations produce a different puzzle than before; affected
  regression hashes and old links change once.

**Later (not part of this release)**

- Blinded human calibration of the weights and band edges (solve times, error rates, perceived difficulty).
- Killer `ruleOf45` and `cageSplit` weights; cage-technique subtypes.
- Nishio depth and chain length as separate technique ids, one possible route to nightmare3 and above.
- A proof portfolio (minimum score over several solver strategies) for more path robustness.
- Support profiles per variant option (Killer cage size, Greater-Than scope, Jigsaw shapes, strict symmetries).
- A rating/generator version in URLs and history for exact reproduction of old puzzles.

---

## 11. Sign-off

| | claude-opus-5.5 | gpt-6-astra |
|---|---|---|
| Point-by-point response to the review of its report | all points accepted (`claude-opus-5.5/3-response-to-review.md`) | most points accepted; withdrew "classic6 evil routinely" and the unbudgeted validation; kept documented disagreements — the hyper observation as a correct finite-sample statement, its preference for separate display rows, higher tiers as unvalidated rather than impossible (`gpt-6-astra/3-response-to-review.md`) |
| R1 integer score, frozen weights | accept | accept (one rounding of the unrounded sum) |
| R2 nine ids, en/vi names, bands | accept (fix design.md's name for *evil*) | accept |
| R3 existing table with exact apportionment | accept | accept (its separate-rows display recorded as the alternative) |
| R4 hardest = largest weight, tie by `order`, then id | accept | accept |
| R5 incomplete proof = unrated, never a hit | accept | accept |
| R6 generation | accept, asked to add symmetric clue re-addition and separate caps for ratings and proposals | object to (iii) only: add symmetric clue-group addition / downward refinement — **adopted in §5.7** |
| R7 qualification (40 + 60 seeds, 2/10/30 s) | accept | accept (count every request; p95 over all requests) |
| R8 Killer weights 260/520 now, calibration later | accept (prefers ≈ 145 / 420 later) | accept |
| R9 compatibility | accept ("may" regenerate a different puzzle) | accept |
| R10 tests and docs | accept (review the hash diff) | accept (keep the non-score invariants) |

Final confirmation of this document (2026-10-19): **claude-opus-5.5 — AGREE**; **gpt-6-astra — AGREE**, after one
clarification of the refinement rule in §5.7.5, applied verbatim.

---

# Part II — Implementation, review and verification

Part I was the specification. This part records what was built from it, what the independent review found and how it
was fixed, and how the result was verified. The time line of these steps is in [`report-brief.md`](report-brief.md).

## 12. Implementation

### 12.1 Generator (claude-opus-5.5, 13:35 – 16:43; fixes until 20:05)

- **Scoring core** — `js/core/difficulty.js`: the nine levels and their bands (§5.3); `SG.difficulty.WEIGHTS` (§5.2)
  instead of `COSTS`; `classify` with one rounding of `V + P + R`, no floor, no size scaling, unrated without a complete
  proof, `hardestTechnique` by weight → `order` → id, `rawScore = score`, `ratingVersion: 2`; `spec(level)` with the
  allowed techniques `{t : 1.25·w_t < band max}`, the technique oracle at every level and the clue floors of §5.7 (1);
  the shared allocation helper of the Difficulty Score table (§5.6).
- **Generation** — `js/core/digger.js`: the Stage-A edge check; the guided dig at every level; exact = complete proof ∧
  requested level; the top-tier propose-and-refine path (§5.7 (5)); the local search (§5.7 (6)); one counted,
  capacity-checked rating entry point `SG.digger.rateCounted` (1,024 full ratings and 32,768 proposals per full-grid
  attempt, 200,000-node uniqueness guard); the closest completely rated, unique, symmetric, DFS-verified candidate as
  fallback with `difficulty.approximate`.
- **Variants** — `killer.js`: cage profiles of §5.7 (7) for the new levels and a cage-layout search (merges and boundary
  moves) inside the structure phase; `greater-than.js`: the sign-tuning loop on the new ladder through the counted
  rating; `classic.js`, `mega.js`, `extra-regions.js`, `jigsaw.js`, `multigrid.js`, `wordoku.js`: support lists and
  clue-floor entries; `registry.js`: the level list.
- **Adjustments made while qualifying** (all deterministic, counted in work, never in time): the bounded solve of the
  guided dig is guarded at 100,000 checks (a Mega16 nightmare 2 request: 106 s → 8 s, same puzzle); the uniqueness guard
  also covers the proposal dig of the top tiers (Killer evil outliers 11–21 s → 2–5 s); repeated local-search candidates
  come from a memo; Greater-Than's local search adds no clues; Killer's layout search rates and keeps the revealed
  digits widened to whole symmetry groups (Killer very hard: 80 hits of 91 → 39 of 40).
- **UI** — `result-view.js`, `step-view.js` (score table through the allocation helper, no bonus row), `player.js`
  (replay of searches and re-revealed clues), `help.js`, `locale.en.js`, `locale.vi.js` (§5.3 texts, new error strings),
  `export.js` (`ratingVersion`), `cache.js` (schema 2, pre-generation cost table).
- **Tests and tools** — new `tests/qualify.js` (the qualification of §6); `tests/harness.js` (`SG.test.timeLimit`);
  `soak.js`, `perf-helper.js`, `rated.js`, `regression.js`; 24 suites updated, `difficulty.test.js` rewritten (it also
  checks every support list against `qualification.md`).
- **Docs** — README (EN, VI), design.md, this folder. In total 51 files modified (+3,840 / −1,730 lines) and new files.

### 12.2 Player (gpt-6-astra, 13:35 – 13:56)

`js/ui/importer.js` (the nine level ids in ladder order; `difficulty.ratingVersion` read and kept; unknown metadata stays
non-fatal), `js/ui/locale.en.js` and `locale.vi.js` (the three new names and the §5.3 descriptions, identical to the
generator's), tests (`importer`, `i18n`, `progress`, `rated.js`, three fixture tools), `README.md`, `design.md`,
`docs/fixtures.md`, `docs/qa.md` — 14 files. Nothing else changes in the player.

## 13. Levels offered per variant

Measured with the protocol of §6 by `node tests/qualify.js` on the final engine; full table, protocol details, machine
and engine fingerprint in [`qualification.md`](qualification.md).

| variant | levels offered (v2) | v1 offered |
|---|---|---|
| classic4 | very easy | very easy, easy |
| classic6 | very easy, hard | very easy, easy |
| classic9, wordoku | very easy … nightmare 1 (8 levels) | classic9: 6 · wordoku: 5 |
| killer, greaterThan | all nine | 5 |
| diagonalX, hyper, jigsaw9 | all nine | 6 |
| mega12, mega16, samurai, sohei, butterfly, flower | all nine | 4 |

About 5,050 requests per run, no error, no invalid, ambiguous or unrated puzzle; 4,718 hits in 4,720 requests on the
118 offered levels (the two misses: classic6 hard and Killer very hard, 39 of 40 each); slowest p95 Greater-Than very
hard ≈ 5.8 s (budget 10 s); slowest single request 11.2 s. The same lists came out of every qualification run of the
session. Compared with §6's expectation, Killer qualified all nine levels thanks to the layout search, and classic6
offers only very easy and hard.

## 14. Review findings and how they were fixed

gpt-6-astra reviewed the generator implementation (17:42) and re-checked the fixes (19:22) with its own reproduction
probes; the orchestrator's test runs added the timing finding. Details:
[`gpt-6-astra/5-implementation-review.md`](gpt-6-astra/5-implementation-review.md),
[`claude-opus-5.5/5-fix-report.md`](claude-opus-5.5/5-fix-report.md); the probe scripts and their recorded outputs,
before and after each fix, are in [`gpt-6-astra/evidence/`](gpt-6-astra/evidence/).

| id | severity | finding (how it was found) | fix | verified by |
|---|---|---|---|---|
| B1 | blocking | When the level was missed, the fallback could return a farther puzzle and drop a nearer valid one met during the Killer cage search (killer / expert, seed 61843, diagonal symmetry, 2 attempts: returned very hard 790 although evil 1581 had been rated) | every completely rated, unique, symmetric candidate met anywhere in the attempt is kept with its model, givens, rating and replay; the fallback compares all of them | the same request now returns evil 1581; `closest` probe 4/4; regression test |
| B2 | blocking | The full-rating cap was not complete: Greater-Than's tuning ratings bypassed the counter (14 real calls, 7 counted), and the final rating after local search could exceed the cap | one counted, capacity-checked entry point `SG.digger.rateCounted` for the digger, Killer and Greater-Than; known ratings are carried out instead of re-rated | real calls = counted calls (99 / 13 / 7 / 258; 20 with a cap of 20); 5 tests |
| B3 | blocking | Replay: clues re-added by the search appeared one step early (Mega16 evil seed 478576959, nightmare 1 seed 2422420669) | the pending batch of removals is flushed before a reveal is applied | `replay` probe: 9 cases, 0 errors; 3 tests |
| B4 | blocking | `qualify.js` could publish "offered" after a worker crashed and its request was lost (fault injection: 39 outcomes, "offered") | a worker exit, IPC error or lost request fails the whole run; an offered verdict needs exactly 40 or 100 outcomes | the fault injection now exits with code 1; 6 tests |
| B5 | blocking (re-check) | The new Killer fallback path skipped the independent DFS uniqueness check: with a deliberately unsound test technique, killer / expert seed 61843 returned a puzzle with two solutions | every candidate is counted by DFS (200,000-node guard) before it may replace the closest one, whatever its proof claims; a contradicted proof adds `digger.unsoundTechnique` | `keeper-safety` probe on seeds 61843, 3680590658 and 1: one solution each (run by the implementer and again by the orchestrator); regression test |
| S1 | should-fix | Refused cells stay refused for the rest of a dig, justified by a monotonicity claim that §5.1 rules out | kept as a **measured heuristic** and documented: re-checking the refusals was 4.6× slower (7,021 s vs 1,531 s) for the same hit rate (94.5 % vs 94.4 %) and would have hidden 7 top levels for time | qualification A/B runs |
| S2 | should-fix | `rated.js` certificates had been weakened to the new bands | the score-independent certificates use explicit technique-id sets again | difficulty suite |
| S3 | should-fix | README/Help still promised "same seed, same puzzle" without the version caveat and said "cheapest technique first" | EN/VI compatibility note (same puzzle only within a rating version; old links may differ; old scores not re-rated; cache v1 dropped; `ratingVersion: 2`); "fixed technique-priority order" | re-check |
| S4 | should-fix | The published qualification fingerprint did not match the reviewed source | re-qualified on the final source and published the matching fingerprint | re-check |
| S5 | should-fix | A per-technique "points" badge added to Help was not needed | removed | re-check |
| N1, N2 | nit | design.md format example (612 instead of 502); stale full-soak size (≈ 2,000 instead of ≈ 3,550) | corrected | re-check |
| T1 | test robustness | Orchestrator's full run with a busy CPU: Greater-Than very hard CV6 p95 10,674 ms > 10,000 ms; the GitHub workflow runs the suite on slower machines after every push | `SG.test.timeLimit(budget)`: unit-suite time checks use the design budget × 2, × 3 when `CI` is set, or × `SG_TIME_FACTOR`; the budgets themselves stay enforced by `qualify.js` and measured by `perf.js` | the four tight suites pass under load (520 / 520); full suite passes |

## 15. Visible changes (final)

**Generator — planned in §7:**
1. Difficulty Score table (Summary and Generation Steps): same layout; the "Bonus points for difficult techniques" row
   is gone; "Points" shows the new weights; a technique's total is its share of the score (the hardest technique's row
   carries the peak `P`); the "Empty cells" row shows `80·E/(E+40)`; the two explanatory texts are reworded (§5.6).
2. Level names Very hard, Nightmare 1, Nightmare 2 (vi: Rất khó, Ác mộng 1, Ác mộng 2); the descriptions of medium,
   hard, expert and evil reworded ("Typically uses …"), §5.3.
3. The level picker of each variant follows §13 (classic4 and classic6 lose *easy*; most variants gain higher levels;
   lists may have gaps).
4. Scores on the new, smaller scale; some puzzles change level (an old *expert* needing one wing → *very hard*).
5. Generated puzzles can differ for the same settings and seed (clues, Killer cages, Greater-Than signs); old links
   and history entries may give a different puzzle; old history entries keep their stored score and level.
6. The pre-generated puzzle cache is emptied once (schema 2).
7. Help: the scoring section and the level table rewritten (same layout).
8. Export JSON: `difficulty.ratingVersion: 2`; `rawScore` equals `score`.
9. The symmetry warning (rotational 90° / mirror both) also covers the nightmare levels.

**Generator — beyond §7 (reported by the implementer, accepted by the review):**
1. A new replay sentence when the search shows clues again ("The puzzle was still too easy for this level: {revealed}
   shown again while searching nearby for a harder one.").
2. Reworded Explain texts for the build-model and rating steps (with their pseudocode line); Help and Explain say the
   solver tries techniques in a "fixed technique-priority order".
3. Help: the variants note, the classic 9×9 description and the ladder introduction reworded; the seed paragraph says
   that the same seed gives the same puzzle only within one rating version.
4. Four new error messages, shown only when generation fails.
5. Fewer top levels are pre-generated (expected over 3 s, e.g. Killer from very hard, Greater-Than from hard), so
   Generate is less often instant there.
6. Replay steps that logic cannot finish show no score table (an existing state, possibly more frequent).
7. When Killer returns a candidate kept from its cage-layout search, the replay builds that puzzle as random-removal
   steps from the full solution (a faithful construction of the returned puzzle, not a chronological replay of the
   search).
8. Fixed: clues re-added by the search no longer appear one replay step early (B3).

**Player:** the three new level names and the reworded descriptions (en/vi); puzzles with the new levels import with
their difficulty; layout, gameplay, hints and saved progress are unchanged.

## 16. Verification

| check | result |
|---|---|
| Generator full suite (`node tests/node-runner.js`, ≈ 9 min) | 3,513 / 3,513 pass (orchestrator's final run, 525 s) |
| Generator soak (`node tests/soak.js --quick`) | 710 puzzles, invariants I1–I7 hold, PASS |
| Qualification (`node tests/qualify.js`) | §13; lists identical in every run of the session |
| Regression hashes (26 combinations × 20 seeds) | regenerated once after the implementation (71 of 460 shared entries unchanged, e.g. classic4 and classic9 very easy 20 / 20); unchanged by all later fixes (520 / 520) |
| Timing tests under CPU load | the four suites with time checks near their budget: 520 / 520 |
| Review (gpt-6-astra) | B1–B5, S1–S5, N1–N2 resolved (§14) |
| Player full suite | 1,628 / 1,628 (orchestrator's run); 7 / 7 Edge browser runs (implementer) |
| Generator → player | five real v2 exports (all three new level ids; classic9, Killer, Greater-Than, Mega16) import with `ratingVersion: 2` and unchanged givens |

## 17. How to test, and what is left

**How to test**
- Generator (`index.html`): pick each variant and check its level list (§13); generate a nightmare 1 / 2 puzzle on
  Killer, Greater-Than or Samurai; check the Summary table (no bonus row, rows add up to the score), the Generation
  Steps replay, Help → scoring, the history list, the JSON export (`ratingVersion: 2`) and the "Play" link.
- Player: import a puzzle exported with a new level and check its name in both languages; old exported files still
  import.
- Commands: `node tests/node-runner.js` in each repository; `node tests/qualify.js --variant=<id>` to re-measure the
  levels of one variant; `node tests/soak.js --quick`. Time checks use the design budget × 2 locally and × 3 when `CI`
  is set; `SG_TIME_FACTOR=1` checks the exact budgets.

**Left for later** (§10): human calibration of weights and bands; the Killer weights of `ruleOf45` and `cageSplit`;
Nishio depth and chain length as separate techniques (the route to tiers above nightmare 2); support profiles per
variant option; a rating version in links and history for exact reproduction of old puzzles. Nothing is committed or
pushed yet: the changes wait in the working trees for the user's tests.
