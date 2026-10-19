# Difficulty scoring and difficulty generation in sudoku-generator — research report

- **Researcher:** claude-opus-5.5
- **Date:** 2026-10-19
- **Scope:** how `sudoku-generator` scores a puzzle and generates a requested level today (Part A), what is wrong with it
  for a universal, score-defined ladder (Part B), and a research proposal for one scoring formula used by every variant,
  a longer ladder (`veryEasy` … `evil` + `veryHard` + nightmare tiers) defined only by score bands, and generation that
  reaches the highest level each variant can support (Part C). Research only: nothing in the sudoku-generator
  or sudoku-player repository was modified (both `git status --short` empty before and after). All numbers come from
  scripts in `experiments\` that load the engine read-only (Appendix); that folder is the researcher's experiment
  folder and is not part of the repository.
- **Conventions:** `path:line` refers to the sudoku-generator repository (paths from its root) unless prefixed with
  `player:` (= the sudoku-player repository). "S" is the proposed universal score, "score" alone is today's `rating.score`. "E" is the
  number of empty cells at the start. Levels written `vE, E, M, H, vH, X, Ev, N1, N2, N3` in dense tables.

---

## Executive summary

1. **Today the code has six levels, not seven.** `LEVELS = ['veryEasy','easy','medium','hard','expert','evil']`
   (`js/core/difficulty.js:100`, mirrored in `js/variants/registry.js:17` and `player:js/ui/importer.js:70`). The
   requested "very hard" does not exist yet; adding it is a format change for the URL, history, cache, export and player.
2. **Today's score** is `Σ cost(t)·(n_t + 0.5) + 0.6·E`, then raised to the band minimum of the hardest technique's
   group (the "technique floor", the UI row *"Bonus points for difficult techniques"*), and the bands are multiplied by
   `cellCount / 81` (`difficulty.js:402-479`, `:272-280`). Level = band of the floored score. Only classic 9×9 was
   calibrated; Killer/Greater-Than techniques keep their uncalibrated design costs (10–40) next to calibrated classic costs
   (63–1120) and are "tier 0", so they never trigger the floor.
3. **The floor makes the label partly technique-defined and masks a size bug.** Removing it alone (same costs, same
   scaled bands) lowers the level of 45 % of samurai, 33 % of sohei, 12.5 % of mega16 puzzles but only 1.4 % of classic9
   (7,800 sampled puzzles, `data/B1-floor-removal.tsv`). On samurai *hard* 95 % of today's scores are exactly the floor:
   band scaling ×4.56 assumes work grows with cell count, but hard steps do not.
4. **Size scaling of the bands mislabels small boards too:** on 6×6 a single Simple Colouring step (the usual 6×6 fish)
   lands in *expert* (band 355–666) while *medium/hard* are almost unreachable (1–2 %), i.e. a non-monotone ladder
   (`data/A-baseline-summary.tsv`).
5. **Most "missing" high levels are gating, not impossibility.** With `difficultySupport` widened in memory, today's
   generator hits *evil* for Wordoku and Greater-Than 100/100, *expert*/*evil* for mega12/mega16/butterfly/flower/sohei/
   samurai 40/40 each, Killer *evil* 48/60 (80 %). The lists stop at *expert*/*hard* because design.md §9.1's budget table
   had no column for them (`js/variants/multigrid.js:345`, `js/variants/mega.js:65-69`). Real limits: classic4 (every 4×4
   puzzle is singles-only) and classic6 (gap at medium/hard).
6. **Proposed universal score (inputs: E and technique counts only):**
   **S = Σ_t c_t·√n_t + 5·√E**, with today's calibrated classic costs `c_t` unchanged and the variant techniques put on
   the same scale (`cageCombo 7, ineqChain 5, ruleOf45 63, minMaxForcing 70, cageSplit 160`). No floor, no size scaling,
   no level term; a stuck solve adds a terminal "guess" term (never observed in 7,800 puzzles).
7. **Why √n and √E:** they resolve the volume-vs-peak tension measurably: the cross-size spread of scores for puzzles
   with the same hardest technique tier drops from mean |log2 shift| 1.00 (today's terms) to 0.65; a singles-only samurai
   scores 82–89 (*easy*) where today's terms give 300–345 (*medium* on unscaled bands); a 6×6 needing a W-Wing stays a
   hard puzzle (*expert*). Monotonicity under clue removal is on par with today's raw score (4.4 % vs 3.7 % of 3,983
   removals lower the score). The UI table stays additive (one row per technique + one "empty cells" row, no bonus row).
8. **Proposed ladder (one band table for every variant):** veryEasy [0,40) · easy [40,100) · medium [100,240) ·
   hard [240,420) · **veryHard [420,600)** · expert [600,1000) · evil [1000,2500) · **nightmare1 [2500,5000) ·
   nightmare2 [5000,10000) · nightmare3 [10000,∞)** (geometric ×2 above evil). On classic9 it reproduces today's labels
   for 98–100 % of veryEasy/easy/medium puzzles; the famous hardest 9×9 puzzles (Escargot, Inkala 2012, Platinum Blonde,
   Golden Nugget) land in nightmare2 (6.9k–8.0k).
9. **Technique groups stay only as a search aid:** the allowed set of a level becomes `{t : c_t < band max}`, which is an
   exact pruning (one use of t already costs c_t), not a level definition.
10. **End-to-end simulation (existing digger, new score/ladder patched in memory):** classic9 hits veryEasy…nightmare1
    20/20 each and nightmare2 15/20; diagonalX all ten levels 10/10; hyper/jigsaw9/Greater-Than up to nightmare2 10/10;
    mega12/butterfly/flower/sohei/samurai easy…nightmare2 100 %; Killer up to veryHard 10/10, expert 7/10, evil 8/10.
11. **Killer reaches evil/nightmare when the cage layout is searched:** a band-capped local search that merges cages /
    moves boundary cells hit expert 10/10, evil 10/10, nightmare1 9/10, nightmare2 9/10, nightmare3 9/10 within 6–8 s.
12. **Expected maximum level** under the proposal: classic4 veryEasy only; classic6 expert (evil only with extra search);
    classic9 and Wordoku nightmare2; diagonalX, hyper, jigsaw9, Greater-Than, Killer nightmare3; mega12, butterfly,
    flower, sohei, samurai nightmare2 by digging alone and nightmare3 with local search; mega16 nightmare1 by digging
    (43 s), higher only with local search (tens of seconds). Large boards lose veryEasy (≈ 100+ givens needed).
13. **Main risks:** variant-technique costs are hypotheses (no human data), top tiers measure tedium (many chain steps)
    more than depth unless nishio depth is scored (optional refinement moves 3 of the 4 famous puzzles to nightmare3 and
    leaves generated puzzles unchanged), every seed regenerates a different puzzle (URL/history/cache/regression hashes),
    and the player must learn the new level ids.

---

## Part A — How it works today

### A1. Levels

**Ids and order.** `LEVELS = Object.freeze(['veryEasy','easy','medium','hard','expert','evil'])`
(`js/core/difficulty.js:100`). The registry keeps its own copy because it loads first:
`js/variants/registry.js:16-17`. Variants validate `difficultySupport` against it (`registry.js:137-142`). There is **no
`veryHard`** anywhere in code or locales; design.md §6.7 also lists six levels (`design.md:543-550`) and the help page says
"The six levels" (`js/ui/help.js:1196`).

**Names / descriptions** (`js/ui/locale.en.js:117-130`, `js/ui/locale.vi.js:115-128`):

| id | en | vi | description (en, abridged) |
|---|---|---|---|
| veryEasy | Very easy | Rất dễ | many clues, naked and hidden singles |
| easy | Easy | Dễ | adds locked candidates (pointing, box/line) |
| medium | Medium | Trung bình | needs naked/hidden pairs, triples, quads |
| hard | Hard | Khó | needs fish (X-Wing, Swordfish, Jellyfish) and simple colouring |
| expert | Expert | Chuyên gia | needs wings (XY, XYZ, W) and Unique Rectangles |
| evil | Evil | **Địa ngục** | forcing chains and trial and error (Nishio), very few clues |

Note: design.md §6.7 gives the Vietnamese name of `evil` as "Ác mộng" (= "nightmare", `design.md:550`), which contradicts
the locale ("Địa ngục" = "hell"). This matters if a "nightmare" level is added (C2).

**Per-level parameters** (`difficulty.js:207-214`, scaled per board in `spec`, `difficulty.js:351-382`):

| level | band min (classic9) | technique groups (`BASE_GROUPS[0..i]` + cage/ineq) | minClues / maxClues (9×9) | minCluesPerUnit | oracle | guided dig |
|---|---:|---|---|---:|---|---|
| veryEasy | 0 | basic | 40 / 50 | 2 | techniques | no (Killer: yes) |
| easy | 72 | + locked | 34 / 40 | 2 | techniques | no (Killer: yes) |
| medium | 180 | + subset | 29 / 34 | 1 | techniques | yes |
| hard | 400 | + fish | 25 / 30 | 1 | techniques | yes |
| expert | 800 | + wing | 22 / 27 | 0 | techniques | yes |
| evil | 1500 (open) | + chain | 17 / 24 | 0 | `unique` (DFS) | yes |

Sources: groups `difficulty.js:103,110,316-318`; oracle `difficulty.js:378`; guided from index 2 `js/core/digger.js:645`
and Killer's `guided: true` at every level (`js/variants/killer.js:896-902`); `minCluesPerUnit` scaled by `digits/9`
(`difficulty.js:373`); `extraPasses` is unused (`difficulty.js:335-336`). Other per-level knobs: symmetry default
`rotational180` for all (`difficulty.js:216`); controls warn for `rotational90`/`mirrorBoth` from `expert` up
(`js/ui/controls.js:43`, compared by ladder index `:81-84`); Killer cage-size shares per level and repair attempts
(`killer.js:44-51`, `:519`, veryEasy/easy/medium skip the layout uniqueness check); Killer clue floor `{veryEasy: 40}`
(`killer.js:888`); per-variant `clueFloorScale` (`extra-regions.js:177`, `jigsaw.js:786`, `greater-than.js:519`,
`multigrid.js:319-320`); pre-generation cost table per level (`js/ui/cache.js:105-121`); p95 budgets per level
(`tests/fixtures/perf-helper.js:46-62`, design.md §9.1 `design.md:953-967`).

**Per-board scaling** (`difficulty.js:233-235, 249-280`): band edges and clue floors are multiplied by
`scale = cellCount / 81`, then `clueFloorScale` / `clueFloor` adjust the floor.

### A2. Scoring

**Solver.** `SG.logicalSolver.solve` applies the registered techniques cheapest-first (`order`), one finding at a time,
restarting from the cheapest after each step (`js/core/logical-solver.js:282-347`). Singles are ordinary techniques; the
solver never calls propagation (`logical-solver.js:10-21`). It counts uses per technique (`techniqueCounts`) and keeps
its own **uncalibrated** score: `Σ baseCost·(first ? 1.5 : 1) + 0.6·E` (`logical-solver.js:39, 327-328, 374, 393`).

**Technique registry** (registered `baseCost` → calibrated `COSTS`, `difficulty.js:175-197`; registrations
`tech-basic.js:406-412`, `tech-subset.js:249-256`, `tech-fish.js:568-577`, `tech-wing.js:589-625`, `tech-chain.js:588-605`,
`tech-cage.js:645-660`, `tech-ineq.js:533-551`):

| group | technique (order) | baseCost → COSTS |
|---|---|---|
| basic | nakedSingle (10), hiddenSingleBox (20), hiddenSingleLine (30) | 1→1, 2→1.25, 3→1.5 |
| locked | pointing (40), boxLine (50) | 7→7, 7→8 |
| subset | nakedPair (60), hiddenPair (70), nakedTriple (80), hiddenTriple (90), nakedQuad (100), hiddenQuad (105) | 9→63, 11→77, 15→105, 18→126, 24→168, 24→182 |
| fish | xWing (110), simpleColouring (120), swordfish (130), jellyfish (160) | 32→190, 36→215, 42→250, 56→335 |
| wing | xyWing (140), xyzWing (150), wWing (170), uniqueRectangle (180, assumes uniqueness) | 48→480, 54→540, 60→600, 66→660 |
| chain | forcingChain (190, ≤ 12 links), nishio (200, depth ≤ 2) | 90→720, 140→1120 |
| cage (Killer) | cageCombo (55), ruleOf45 (95), cageSplit (135) | 10, 28, 40 (no override) |
| ineq (Greater-Than) | ineqChain (65), minMaxForcing (85) | 12, 22 (no override) |

(The table in the header of `js/core/techniques.js:93-95` still shows planned names/orders such as `cageRule45` and
`ineqMinMax`; the registrations above are authoritative.)

**`SG.difficulty.classify(report, model)`** (`difficulty.js:402-479`), written as formulas:

```
n_t        = techniqueCounts[t]                      (full ladder, assumeUniqueness: true — rate(), :491-502)
cost(t)    = COSTS[t] if present else baseCost(t)    (:299-302)
technique  = Σ_t cost(t) · (n_t − 1 + 1.5)           (:412; firstUseMultiplier 1.5, :116)
E          = round((report.score − Σ_t baseCost(t)·(n_t + 0.5)) / 0.6)   (:413, :421 — recovered from the solver score)
rawScore   = technique + 0.6 · E                     (:451; emptyCellBonus 0.6, :116)
scale      = cellCount / 81                          (:233-235)
tier(t)    = index of group(t) in BASE_GROUPS, 0 for cage/ineq   (:393-396)
hardest    = used technique with max (tier, cost, order)          (:414-418)
floorLevel = tier(hardest); unsolved ⇒ top level                  (:453-454)
score      = max(rawScore, TABLE[floorLevel].min · scale)         (:455)   ← "technique floor"
level      = max i with score ≥ TABLE[i].min · scale              (:384-390, :456)
confidence = distance to the nearest band edge / half band width, clamped to [0,1] (:460-466)
```

No rounding is applied to `score` (only the solver score is rounded to 1e-6, `logical-solver.js:393`); the UI rounds for
display. Depends on variant only through `scale` and the technique set the variant admits (`variantScope`); depends on
level through the floor.

**Worked example (real puzzle, `experiments/example.js`).** classic9, requested *hard*, seed 1592778586, 28 clues
(`4.371.5...17....2.8.....1.....49..1....6.3....9..85.....9.....1.5....64...1.562.8`):

| technique | n | cost × (n − 1 + 1.5) |
|---|---:|---:|
| nakedSingle | 29 | 1 × 29.5 = 29.50 |
| hiddenSingleBox | 19 | 1.25 × 19.5 = 24.38 |
| hiddenSingleLine | 5 | 1.5 × 5.5 = 8.25 |
| pointing | 5 | 7 × 5.5 = 38.50 |
| nakedPair | 1 | 63 × 1.5 = 94.50 |
| xWing | 1 | 190 × 1.5 = 285.00 |
| **technique part** | | **480.125** |
| empty cells | E = 53 | 53 × 0.6 = 31.8 |
| **rawScore** | | **511.925** |

Solver score (baseCosts) = 216.8 → E = round((216.8 − 185.0)/0.6) = 53. Hardest = xWing (fish, tier 3) → floor = 400;
score = max(511.9, 400) = 511.9 → *hard* (400 ≤ 511.9 < 800).

Same computation on samurai *hard* (seed 2073087849, 369 cells, E = 263): rawScore = 1201.175 (singles alone 283.9, empty
cells 157.8, xWing 285, simpleColouring 322.5, nakedPair 94.5, locked 57.5); scale = 4.5556 so the bands are 0 / 328 /
820 / 1822 / 3644 / 6833; raw would be *medium*, the floor raises it to **1822.22** (*hard*). The 621 extra points are
exactly the UI row "Bonus points for difficult techniques" (`js/ui/result-view.js:125-148, 360-366`, strings `:553-556`).

### A3. Generating a target level

**Pipeline** (`js/core/pipeline.js:1-31, 229-326`): configure (normalise, validate the level against
`difficultySupport`, `:84-87`) → buildModel (`variant.build`, spec event `:269-278`) → `SG.digger.generateSteps`
(`:290-301`) which, per attempt, runs fullGrid → extraStructure (`postGenerate`, e.g. Killer cages, Greater-Than signs) →
up to `digTries` × (dig → rate → tune).

**Full grid** (`js/core/full-grid.js:229-332`): randomised DFS with MRV, variant `fastSeed` (diagonal boxes, multigrid
overlaps), restart after `restartThreshold` failed guesses (variant value, else `cellCount·50`, `:27, :241-252`).

**Digger** (`js/core/digger.js`):
- *Stage A* (`digSteps`, `:494-638`): cells are shuffled once (`order` = random/rowByRow/snake/spiral/jumpOne,
  `:71, :229-242`), grouped by symmetry (`SG.symmetry.groups`, kinds at `js/core/symmetry.js:19`), each group tried once.
  Cheap filters first: already rejected, `clues − |group| < minClues`, per-unit minimum (`:582-596`). Acceptance oracle:
  the bounded logical solve with the level's allowed techniques (`assumeUniqueness: false`, `:295-307`), or for `evil`
  the DFS `stillUnique` check (`:273-284`). For guided levels stage A stops at `max(minClues, round(0.47·n))` clues
  (`:648, :883`).
- *Stage B, guided* (`digGuidedSteps`, `:736-811`): repeatedly rates up to `max(4, min(32, round(32·81/n)))` random
  candidate removals (`:651-652, :769-773`) with `removalObjective` (`:685-718`): below evil the objective is
  `classify(report).score` of the bounded solve; stuck ⇒ refused, `score ≥ spec.max` ⇒ refused ("tooHard"). For evil:
  DFS uniqueness, then the objective is the score when the non-chain techniques finish, else `1e9 + unsolvedCount`
  ("as stuck as possible", `:686-703`). The best candidate is applied; refused cells stay refused; ends when nothing can
  be removed.
- *Safety net*: `SG.dfs.countSolutions(...) === 1`, else a plain DFS dig and warning `digger.unsoundTechnique`
  (`:974-992`).
- *Rate / tune* (`digLevelSteps`, `:1122-1147`): `SG.difficulty.rate` with every technique; `exact = rating.level ===
  level` (`:1129`).
- *Restart loop* (`generateSteps`, `:1253-1385`): `maxAttempts` grids (default 8, `:667`, UI 1–20) × `digTries` samples
  (12, or 30 for symmetries with groups > 2 cells, `:668-670, :1259-1263`); stops at the first exact sample; otherwise the
  closest sample by `distanceToLevel = 1000·|Δlevel| + relative distance to the band` (`:1166-1172`) and warning
  `difficulty.approximate` (`:1356-1368`). Budget: the page passes a 120 s active-time budget
  (`js/worker/gen.worker.js:97, :263`; `js/ui/app.js:122, :290`).

**Variant strategies.** Killer: cages grown from the solution with level-dependent size shares, layout uniqueness check
and split/merge/reveal repair for hard+ (`killer.js:837-876, 747-800`), then the cell digger with `guided: true`, no
per-unit minimum and a clue floor only for veryEasy (`:888-902`). Greater-Than: signs on every pair inside a box, then
digs **signs** not cells: reveals clue groups up to `minClues`, digs signs with the technique oracle and then to
minimality, and reveals one more clue group (≤ 8 rounds) while the rating is above the level (`greater-than.js:314-494`).

**Where a level can be missed** (each backed in Part B):
1. The band is (almost) empty in the reachable puzzle space (classic4 above easy; classic6 medium/hard).
2. Stage A of non-guided levels digs to the clue floor without a score check, so a low band can be overshot
   (veryEasy on big boards under any size-free ladder, C3).
3. The oracle's restricted ladder ≠ the rating's full ladder (e.g. `jellyfish` order 160 is allowed at hard while
   `xyWing` order 140 is not, so the rating may take a wing first; `uniqueRectangle` is never used by the oracle).
4. The evil objective maximises "stuckness", not score, and has no upper bound — fine with an open top band, wrong once
   bands exist above evil.
5. Killer: once every clue is dug, difficulty depends only on the cage layout, which is grown before digging from the
   expert size shares; the digger cannot make it harder (12/12 of the measured evil misses ended at 0–2 clues, B3).
6. Coarse symmetries dig 4 cells at a time (more misses; 30 samples per grid, warning from expert).

### A4. Per-variant matrix (today's scoring, measured)

Sample A (`experiments/sample.js`, seed 20261019, `--include-unsupported`, 7,800 puzzles: classic4/6 150 per level,
classic9 200, the other 9×9 boards 100, killer 60, large boards 40; full table `data/A-baseline-summary.tsv`).
"hit" = exact level; levels marked * are not offered today.

| variant | cells | E (median, veryEasy→evil) | variant techniques | `difficultySupport` | floor settings | hit, unoffered levels | floor-bound share (hard / expert) |
|---|---:|---|---|---|---|---|---|
| classic4 | 16 | 8–12 | – | vE, E (`classic.js:128`) | derived ×16/81 | M*, H*, X*, Ev* 0 % | – |
| classic6 | 36 | 18–24 | – | vE, E (`classic.js:129`) | derived | M* 1 %, H* 2 %, X* 93 %, Ev* 85 % | 0 % |
| classic9 | 81 | 41–53 | – | all six (`classic.js:130`) | reference | – | 3 % / 0 % |
| diagonalX, hyper | 81 | 41–61 | – | all six (`extra-regions.js:36,185`) | scale .83/.80/.80 | – | ≤ 1 % |
| jigsaw9 | 81 | 41–59 | – | all six (`jigsaw.js:783`) | scale .83/.80/.80 | – | 0 % |
| wordoku | 81 | 41–53 | – | up to X (`wordoku.js:580`) | derived | Ev* 100 % | 1 % / 0 % |
| greaterThan | 81 | 38–63 | ineqChain, minMaxForcing | up to X (`greater-than.js:515`) | scale .83/.80/.80 | Ev* 100 % | 0 % |
| killer | 81 | 41–81 (median clues: hard 4, expert 2, evil 0) | cageCombo, ruleOf45, cageSplit | up to X (`killer.js:1092`) | `{veryEasy: 40}` | Ev* 80 % (48/60) | 0 % |
| mega12 | 144 | 72–90 | – | up to H (`mega.js:69`) | derived | X* 100 %, Ev* 100 % | 20 % / 20 % |
| mega16 | 256 | 130–152 | – | up to H | derived | X* 100 %, Ev* 100 % | 18 % / 48 % |
| butterfly | 144 | 72–110 | – | up to H (`multigrid.js:347`) | scale .6/.6 | X* 100 %, Ev* 100 % | 8 % / 15 % |
| flower | 189 | 96–149 | – | up to H | easy .8, .6/.6 | X* 100 %, Ev* 100 % | 10 % / 35 % |
| sohei | 288 | 146–210 | – | up to H | scale .6/.6 | X* 100 %, Ev* 100 % | 80 % / 63 % |
| samurai | 369 | 187–263 | – | up to H | scale .6/.6 | X* 100 %, Ev* 100 % | 95 % / 80 % |

Score distributions (today's score divided by `scale`, p10–p50–p90; `data/A-baseline-summary.tsv`): classic9 medium
191–219–334, hard 418–566–732, expert 834–1111–1419, evil 1845–3644–10082; killer hard 616–723–784, expert
868–1052–1370 with hardest technique `locked` (30 %) or `subset` (70 %) — Killer reaches "expert" by volume only.
Generation time is far below the budgets on this machine (max killer evil 5.5 s, mega16 evil 0.7 s).

### A5. Where level and score are surfaced or persisted

- **Summary tab:** two cards (achieved level, score) and the "Difficulty Score" table: one row per technique (uses,
  unit cost `costOf`, `techniqueScore`), the empty-cell row, and the floor row "Bonus points for difficult techniques"
  (`js/ui/result-view.js:93-148, 161-199, 347-369`; strings en `:539-556`, vi `:575-596`). Rows are rounded to add up
  to the total (`SG.stepView.roundToTotal`).
- **Generation Steps tab:** the same table for the puzzle at each replay step (`js/ui/step-view.js:309-380`, strings
  `:510-519`, `:538-546`), fed by `SG.player.rateStep`, which re-rates each position with a 400 ms budget
  (`js/ui/player.js:74, 568-622`).
- **History list:** entry `{id, at, variantId, requested, level, seed, clues, cells, score (rounded), …}` in
  `localStorage` `sg.history.v1` (`js/ui/history.js:25-26, 75-99`); shown as "Hard: score 1234, seed …"
  (`:321-325`, `:468-480`); key includes the requested level (`:61-67`).
- **Level picker:** only levels the variant supports are listed; the select is disabled with one choice
  (`js/ui/controls.js:178-189`); unsupported URL/stored levels snap to the closest supported one
  (`js/ui/store.js:218-232, 250-251`) with a note (`controls.js:280-301`). Help shows a per-variant level list
  (`js/ui/help.js:115`) and a ladder table that assumes one technique group per level (`help.js:275-306`, texts
  `:1192-1236`).
- **URL:** `d=<level>` accepted iff in `SG.difficulty.LEVELS` (`store.js:374, 387, 451`; design.md §14.2). design.md
  promises the same URL "must always reproduce the exact same puzzle" (`design.md` §14.2).
- **Cache:** `sg.cache.v1`, schema 1 (`js/ui/cache.js:82-83`); key = variant, level, seed, … (`:150-152`); a cached
  rating must have finite score and string level (`:289-292`); a regenerated puzzle must equal the cached one including
  `rating.level` and `rating.score` (`:331-339`); pre-generation cost table per level (`:105-121`).
- **Export / exchange:** JSON `format: 'sudoku-generator/v1'` (`js/ui/export.js:79`) with `difficulty {requested,
  achieved, score, hardestTechnique, techniqueCounts, rawScore, hardestGroup, confidence, solved, empties}`
  (`:177-191`) and translated `labels` (`:244-249`); text export header `#n,variant,level,seed` with the translated
  level name (`:418-428`). Worker wire format passes `rating` unchanged (`pipeline.js:373-424`).
- **Player:** `LEVELS` fixed list (`player:js/ui/importer.js:70`); `readDifficulty` drops unknown level ids silently
  (`:703-714`); the text import maps translated level names back to ids through the locale packs (`:947-958, :1176-1177`);
  only the level name is displayed (`player:js/ui/app.js:145-148, 462-475`); locale strings
  `player:js/ui/locale.en.js:93-106`, `locale.vi.js:93-106`.
- **Tests that pin today's numbers:** `tests/suites/difficulty.test.js` (six levels `:85-96`, floor `:428-444`,
  unsolved ⇒ evil `:464-469`, band scaling `:471-481`, group-ordered costs `:512-522`, I5 `:811-826`), level lists in
  `controls.test.js:98-104`, `model.test.js:643-646`, `killer.test.js:936`, `wordoku.test.js:488`,
  `multigrid.test.js:207,1032`, `extra-regions.test.js:245`, `greater-than.test.js:779`, `jigsaw.test.js:208`,
  `mega.test.js:127`; the floor row in `result-view.test.js:97-115`; regression hashes of 25 (variant, level)
  combinations × 20 seeds (`tests/fixtures/regression.js`, combos `tests/fixtures/perf-helper.js:141-152`);
  `tests/soak.js` gates (classic9 ≥ 90 %, others ≥ 80 %, `soak.js:24-28, 119-122`), `--bands` expects exactly six
  numbers (`:156-161`); labelled fixtures `tests/fixtures/rated.js`; invariant I5 in design.md (`design.md:1700`).

---

## Part B — Diagnosis

### B1. The technique floor makes the score depend on the level

The floor is `score = max(rawScore, bandMin(level(hardest group)))` (`difficulty.js:453-455`). `bandMin` is a property of
a **level**, and the level that "owns" a group is a fixed table (`BASE_GROUPS[i]` ↔ `LEVELS[i]`, `:103`). So the
reported score is computed from a level, and the level is then read back from that score: score → level → score. It was
introduced on purpose so that invariant I5 ("score in band **and** hardest technique allowed") holds by construction
(`difficulty.js:21-27`, `design.md:535`, `:1700`). Consequences:

- The *label* of many puzzles is decided by the hardest technique, not by the score; the score is then whatever makes the
  label consistent ("nearly all medium puzzles scored exactly 180" before calibration, `difficulty.js:149-153`).
- The share of puzzles whose shown score is the floor (data A): classic9 0–5 %, mega16 18–48 %, flower 10–35 %, sohei
  55–80 %, samurai 73–95 % (hard: 95 %). `docs/report-v1.md:57-58, 169` already notes 16–84 % for big boards.
- **Removing only the floor** (today's costs and scaled bands; `experiments/floor.js`, exact puzzles of sample A):

| variant | exact puzzles | level drops | drops > 1 level | worst requested level |
|---|---:|---:|---:|---|
| classic9 | 1,200 | 1.4 % | 0 % | evil 5 %, hard 3 % |
| wordoku | 600 | 1.2 % | 0 % | evil* 5 % |
| diagonalX / hyper / jigsaw9 / greaterThan / killer / classic4 / classic6 | 600 / 600 / 600 / 600 / 348 / 300 / 571 | 0–0.2 % | 0 % | – |
| mega12 | 240 | 7.9 % | 0 % | hard / expert* 20 % |
| mega16 | 240 | 12.5 % | 0 % | expert* 48 % |
| butterfly / flower | 240 / 240 | 3.8 % / 7.5 % | 0 % | expert* 15 % / 35 % |
| sohei | 240 | 33.3 % | 2.1 % | hard 80 % |
| samurai | 240 | 45.0 % | 6.3 % | hard 95 % |

- **Effect on the digger:** the guided objective already uses the floored score (`digger.js:715`); the floor never pushes
  a candidate above `spec.max` (hardest group ≤ level), so it does not refuse removals, but it does make the `tune` step
  accept puzzles whose raw score is below the band. Without it, samurai *hard* would be hit by ≈ 5 % of samples instead
  of 100 %, i.e. the size-scaled bands are wrong for big boards and the floor hides it. On classic9 the floor is almost
  inert (it binds for 2 % of medium and 5 % of evil puzzles, `difficulty.js:152-153`).
- **Unsolved puzzles** are pushed to the top level by the same mechanism (`:454`); without a floor they need a
  score-based rule (C1; 0 of 7,800 sampled puzzles were unsolved).
- Removing the floor also removes the guarantee "hardest technique ∈ allowed groups" of I5 — it must be redefined as
  "score in band" (C4).

### B2. Cross-variant inconsistencies of today's scoring

1. **Size dependence through the bands, not the score.** Bands scale with `cellCount/81` (`difficulty.js:272-280`), the
   technique costs do not. Small boards: the typical 6×6 fish is one Simple Colouring step, whose first use (322.5) plus
   ≈ 35 points of singles and empty cells exceeds the 6×6 *hard* band (178–355), so the guided dig refuses it at *hard*
   ("too hard"); 6×6 *hard* is reached by 2 % of samples while *expert* (355–666) is reached by 93 %: the 6×6 ladder is
   non-monotone, and a puzzle needing one colouring step is labelled "expert" (`data/J-compare.md`, classic6 expert #0:
   simpleColouring 1, score 370 → expert). Large boards: hard steps do not multiply with cells, so raw scores fall below
   the ×4.56 bands (B1).
2. **Empty-cell weight vs technique weight.** Every empty cell costs 0.6 plus ≈ 1.1 for the single that fills it, i.e.
   ≈ 1.7 points per cell, linear. On classic9 that is ≈ 90 points (veryEasy/easy are decided by it), on samurai ≈ 450 —
   the whole classic9 *hard* band — for singles alone. The spread of median scores between variants for puzzles with the
   same hardest tier is ×17 for singles-only puzzles and ×2.6–×34 for the other tiers with today's terms
   (`data/F-rescore-current-group.txt`).
3. **Calibration only on classic9.** The cost factors (subset ×7, fish ×6, wing ×10, chain ×8) were grid-searched on
   ≈ 2,700 classic9 puzzles (`difficulty.js:118-172`, design.md §18 D6 `:1771`); other variants only got clue-floor
   factors (`difficulty.js:52-92`).
4. **Variant techniques are off-scale.** `cageCombo 10, ruleOf45 28, cageSplit 40, ineqChain 12, minMaxForcing 22` keep
   their design costs (no entry in `COSTS`), although their `order` places them at subset/fish level (55–135) where the
   classic costs were multiplied by 6–10. They are also tier 0 (`difficulty.js:393-396`), so they never raise the floor
   and never count as "hardest". Result: Killer and Greater-Than levels are decided by **volume** of cheap steps. Killer
   *expert* has no wing in 60/60 puzzles (hardest `locked` 30 %, `subset` 70 %; ≈ 41 cageCombo and 9 ruleOf45 uses);
   Greater-Than *hard* puzzles are 85 % subset-peak puzzles pushed up by ≈ 13 `ineqChain` uses (19 at expert, 29 at
   evil) (`data/A-technique-counts.txt`).
5. **Linear repetition rewards tedium.** The famous hardest 9×9 puzzles score 26.8k–37.6k today, a generated evil puzzle
   with 7 forcing chains 6.5k; a mega16 evil puzzle with ≈ 47 nishio steps 69.5k (raw). The top band is open, so this
   does not matter today, but it would decide nightmare tiers.
6. **Two copies of the scoring constants** (`difficulty.js:116`, `logical-solver.js:39`) and a solver "hardest" by
   `baseCost` (`logical-solver.js:330`) that differs from the rating's "hardest" by tier (`difficulty.js:414-418`).

### B3. Why some variants stop below the top level

| variant | offered top | measured with today's generator (levels widened in memory) | root cause |
|---|---|---|---|
| wordoku | expert | evil 100/100 (p50 5 ms, max 12 ms) | **gating only** (design.md §9.1 had no evil budget) |
| greaterThan | expert | evil 100/100 (p50 28 ms, max 167 ms) | **gating only**; scoring of `ineq` steps is off-scale (B2.4) |
| mega12, mega16 | hard | expert 40/40, evil 40/40 (mega16 evil max 0.7 s) | **gating** (`mega.js:65-69`: "budgets up to 'hard' only"); expert partly floor-made (mega16 48 %) |
| butterfly, flower, sohei, samurai | hard | expert 40/40, evil 40/40 each | **gating** (`multigrid.js:345`); expert floor-made for 15–80 % |
| killer | expert | evil 48/60 (80 %), 1.6 s p50, 5.5 s max | partly gating; the 12 misses all ended at 0–2 clues with score 1240–1492 (< 1500): the cage layout, grown before digging with the *expert* size shares (`killer.js:47-50`), is too informative and the digger can only remove clues. **Hard instances exist**: a cage-merge local search reached 12.1k–17.9k (proposed scale) in 6 s from 10/10 evil puzzles. |
| classic6 | easy | medium 1 %, hard 2 %, expert 93 %, evil 85 % | puzzle space (≈ 79 % of 6×6 digs need only singles, `classic.js:121-125`) **plus** band scaling (B2.1) |
| classic4 | easy | medium+ 0/600 | puzzle space: every one of 900 sampled 4×4 puzzles is solved by naked singles |

Separation of the two kinds of cause:
- *Instances are rare/absent:* any 4×4 puzzle beyond naked singles, 6×6 subset-level puzzles. No search change fixes these.
- *Search/limits prevent finding them:* Killer evil+ (fixed layout), every gated level of Wordoku/Greater-Than/Mega/
  multigrid (not offered although reachable), classic6 *hard* under scaled bands (refused as "too hard" by the band).
- *Budgets/timeouts* are not the binding limit today: every measured cell is far below the 120 s page budget and the
  §9.1 targets. *Solver limits* do not bind either (0 unsolved of 7,800); they matter for scoring the top (B2.5, C5).

---

## Part C — Proposal (research only)

### C1. Universal scoring formula

**Definition.** For a puzzle P, run the same solve as today's `rate()` (full ladder, cheapest first, uniqueness assumed;
`difficulty.js:491-502`). Let `n_t` be the uses of technique t and E the empty cells at the start.

```
S(P) = Σ_t  c_t · √n_t   +   w_E · √E          with w_E = 5
level(P) = the level whose band [min, max) contains S(P)       (one band table, C2)
```

- No technique floor, no `cellCount` scaling, no variant or level input. Only E and `{n_t}` (and the technique ids,
  through `c_t`). **Is the board size indispensable?** We conclude no: the only measured consequence of leaving it out is
  that boards larger than 81 cells cannot reach *veryEasy* without ≈ 100+ givens (singles-only S = 51–82, C3); every
  other level is reachable on every board that can produce it at all. We therefore propose no deviation; a density term
  (E / cellCount) would only be worth adding if product wants "very easy" Samurai/Mega puzzles.
- **Stuck solve** (never observed): add a terminal pseudo-technique `guess` with `c = 2 · c_nishio = 2240` and
  n = cells left open, so S stays a function of techniques and the label stays score-derived (replaces `difficulty.js:454`).
- **Costs `c_t`:** the classic costs stay exactly as calibrated (`difficulty.js:175-197`); they now act as the cost of
  one (first) use. The variant techniques are put on the same scale by a *peer technique* — the classic technique whose
  reasoning burden is closest:

| technique | today | proposed c_t | peer and reason |
|---|---:|---:|---|
| ineqChain | 12 | **5** | between hidden single (1.5) and pointing (7): bound propagation along a chain of signs is the most basic Greater-Than move (13–29 uses per puzzle) |
| cageCombo | 10 | **7** | = pointing: a combination lookup per cage (incl. "pointing out of a cage"), the bread-and-butter Killer move (≈ 40 uses) |
| ruleOf45 | 28 | **63** | = nakedPair: innies/outies need region bookkeeping and sum arithmetic, the first Killer technique beyond combinations |
| minMaxForcing | 22 | **70** | ≈ nakedPair/hiddenPair: combines signs with all-different units by counting |
| cageSplit | 40 | **160** | between hiddenTriple (126) and xWing (190): two virtual cages with disjoint digit sets |

  These five values are hypotheses (no human data exists in the repos); C5 gives a procedure to validate them.
- **Optional refinement (recommended for the top tiers):** count nishio steps that needed a nested trial
  (`i18nArgs.depth ≥ 2`, `tech-chain.js:56-73, 577`) as their own technique `nishio2` with `c = 2240`. Needs the solver to
  count a per-finding grade (it only counts per technique id today, `logical-solver.js:327`).

**Calibration rationale.**
- *√n (diminishing repetitions):* the first use carries the full cost (the "can you do it at all" step); 4 uses count as
  2, 9 as 3. This is the continuous version of today's first-use multiplier (`n + 0.5`) and of the first/subsequent-use
  idea of common graders, but sub-linear, so long boards do not run away.
- *w_E·√E:* E must stay an input (the brief), and it is what separates the two easiest classic9 levels (40 vs 34 clues:
  S = 38 vs 41–43). A concave term keeps very large boards from being promoted by size alone: a singles-only samurai with
  E = 215 scores 88 (*easy*); with today's linear terms it scores 345 (*medium* on unscaled bands) and a singles-only
  samurai with E = 263 would reach ≈ 450 (*hard*). w_E = 5 puts E ∈ [8, 263] at 14–81 points: below one pair step (63)
  up to E ≈ 159 (every board except sohei and samurai), about one pair step on those two.
- *Classic costs unchanged:* they were fitted so that groups separate (`difficulty.js:138-155`); under √n they become
  peak costs, and the bands of C2 are re-fitted around them on classic9.

**Measured properties** (`experiments/rescore.js`, `shift.js`, `monoeval.js`; 7,800 puzzles of sample A, 3,983
single-clue removals of sample C):

| formula (all without floor/scaling) | cross-size shift mean / max (log2 vs classic9, same hardest tier) | clue removals that lower the score |
|---|---|---|
| today's terms `c(n+0.5) + 0.6E`, today's cage/ineq costs | 1.00 / 3.91 | 3.74 % |
| linear, no first-use bonus | 1.11 / 4.24 | – |
| n^0.7 | 0.77 / 3.02 | 4.77 % |
| **√n + 5√E (proposed)** | **0.65 / 2.43** | **4.44 %** (level drops 21 = 0.5 %) |
| √n + 0.6·E (linear E) | 0.76 / 2.43 | 3.99 % |
| n^0.4 | 0.59 / 2.08 | – |
| n^0.3 | 0.55 / 1.82 | 4.04 % |
| 1 + ln n | 0.64 / 1.97 | 4.67 % |
| per group: max cost × √(group uses) | 0.62 / 2.25 | – |
| √n, every term but the largest × 0.5 ("breadth damping") | 0.57 / 2.42 | – |

The residual shifts above 1 are almost all chain-tier puzzles of hybrids and big boards (their evil generation produces
10–47 chain/nishio steps) and mega16 subset puzzles (several distinct subset techniques on a large board). Smaller
exponents compress further but also flatten the nightmare tiers; √ is the simplest choice that halves today's spread.
Monotonicity: S is monotone in every n_t and in E; clue-removal violations come from the greedy solver path (also 3.74 %
for today's raw score; worst drops ≈ 50 % in both), and only 0.5 % change the level. On classic9 the rate depends on
density: puzzles with ≥ 30 clues 0.70 % (today's raw score) vs 1.12 % (S), puzzles with < 30 clues 3.77 % for both
(`data/C-mono-by-clues.txt`, 1,429 / 265 removals). The calibration log reports 0 of 2,848 removals above 30 clues for
today's costs (`difficulty.js:157-163`) on natural puzzles; our sample consists of generated, score-maximised puzzles,
which explains the higher rate for both formulas.

Robustness to solver order: S uses the same cheapest-first counts as today, so it inherits the solver's order. Two
order effects remain. (a) Among cheap techniques (naked vs hidden singles, pointing vs box/line) the split depends on the
order; with √n and costs of 1–8 a shift of 5 placements between singles changes S by < 3 points, and E does not depend
on order at all. (b) When two expensive techniques both apply, the cheaper `order` wins (e.g. `xyWing` 140 before
`jellyfish` 160), which can change the peak term; this is the same today and is consistent with "a person uses the
easiest step available".

**Alternatives rejected:**
- *Normalising by E (difficulty per cell):* adding one empty cell filled by a single lowers the average, so removing a
  clue would lower the score — breaks digging (the guided stage maximises the score) and intuition.
- *Scaling bands by `cellCount`:* not an allowed input, and the data shows it mislabels both ends (B2.1).
- *Peak only (max step cost, Sudoku-Explainer-like):* ignores E and repetitions, makes the guided dig plateau, and cannot
  separate nightmare tiers.
- *p-norm aggregation:* the "Difficulty Score" table would no longer add up.
- *Breadth damping / per-group aggregation:* small gain (0.57–0.62) for extra rules; kept as calibration options.

**Volume vs peak, resolved:** low-cost repetitions (singles, locked, cage combinations, inequality chains) are damped
twice (small c_t and √n), so a 16×16 or samurai with hundreds of easy steps stays easy/medium; a single expensive step
enters with its full cost, so one W-Wing makes even a 6×6 puzzle *expert*. For the same hardest tier, boards larger than
81 cells score +0.3 to +1.1 log2 units above classic9 for the basic…wing tiers (≈ up to one level; exception mega16
subset +1.7), 9×9 variants −0.2 to +0.5 (Killer subset +1.5, volume of rule-of-45 steps), classic6 −0.2 to −0.6
(`data/F-shift-detail.txt`). That matches "same skill, longer puzzle ⇒ at most one level more". Chain-tier puzzles of
big boards and hybrids rise +0.9 to +2.4 because their evil generation needs 10–47 chain/nishio steps — tedium that the
nightmare tiers are meant to absorb.

**Behaviour by size** (medians of sample A rescored; `data/F-rescore-sqrt-level.txt`, `data/K-ladder-eval.txt`):

| board | E | singles-only S | hardest-tier behaviour |
|---|---:|---:|---|
| classic4 | 8–12 | 17–21 | always veryEasy (no 4×4 needs more than singles) |
| classic6 | 18–24 | 25–33 | colouring/X-Wing ≈ 250 (hard), wings ≈ 450–850 (veryHard–expert) |
| classic9 | 41–53 | 38–43 | see C2 table |
| killer | 41–81 (0–2 givens from expert up) | 38 (veryEasy, 40 givens) | cage combinations + locked ≈ 100–150 (medium); rule of 45 ×≈9 + pairs ≈ 200–550 (hard–veryHard); nishio ×4 ≈ 2.7k (nightmare1) |
| mega12 | 72–90 | 51–60 | subset puzzles 169–367 (p10–p90; medium–hard), fish 371–701, wings 722–1606 |
| mega16 | 130–152 | 68–73 | subset puzzles 254–543 (p10–p90; medium–veryHard) |
| samurai | 187–263 | 82–89 | X-Wing + colouring ≈ 600 (expert) |

**Worked examples, old vs new** (`data/J-compare.md`; real puzzles of sample A):

| puzzle | E | today | new terms | new S → level |
|---|---:|---|---|---|
| classic9 veryEasy #0 (seed 713242689) | 41 | 66 → veryEasy | nakedSingle 6, 5√E 32 | 38 → veryEasy |
| classic9 medium #0 (seed 2827300656) | 51 | 224 → medium | hiddenPair 77, boxLine 11, singles 13, 5√E 36 | 136 → medium |
| classic9 hard #0 (seed 1592778586) | 53 | 512 → hard | xWing 190, nakedPair 63, pointing 16, singles 14, 5√E 36 | 319 → hard |
| classic9 expert #0 (seed 2408912199) | 51 | 830 → expert | xyWing 480, locked 15, singles 12, 5√E 36 | 543 → veryHard |
| classic9 evil #0 (seed 3868800265) | 53 | 6507 → evil | forcingChain 1905 (7 uses), xyWing 480, pairs 166, … | 2611 → nightmare1 |
| classic6 expert #0 (seed 1130229580) | 22 | 370 → expert | simpleColouring 215, pointing 7, singles 6, 5√E 23 | 252 → hard |
| classic6 evil #1 (seed 4092676929) | 24 | 1273 → evil | wWing 600, simpleColouring 215, … | 853 → expert |
| samurai easy #0 (seed 4223197158) | 215 | 345 → easy | nakedSingle 15, 5√E 73 | 88 → easy |
| samurai hard #0 (seed 2073087849) | 263 | 1822 (raw 1201, floor) → hard | simpleColouring 215, xWing 190, nakedPair 63, other 54, 5√E 81 | 603 → expert |
| mega16 medium #0 (seed 2101011394) | 150 | 1037 → medium | hiddenTriple 126, nakedPair 109, hiddenPair 109, other 73, 5√E 61 | 478 → veryHard |
| killer medium #0 (seed 2632349908) | 65 | 381 → medium | cageCombo 31, locked 33, … | 116 → medium |
| killer expert #0 (seed 1071503499) | 75 | 816 → expert | nakedPair 63, ruleOf45 63, cageCombo 45, … | 273 → hard |
| killer evil #0 (seed 2160184381) | 81 | 6286 → evil | nishio 2240 (4), ruleOf45 236, hiddenPair 109, … | 2726 → nightmare1 |
| greaterThan hard #0 (seed 3707876688) | 61 | 600 → hard | nakedPair 63, ineqChain 25 (25 uses), pointing 21, … | 176 → medium |
| greaterThan evil #0 (seed 1662262927) | 63 | 14541 → evil | nishio 2743, forcingChain 1905, simpleColouring 430, … | 5396 → nightmare2 |
| sohei expert #0 (seed 2418247730) | 208 | 2844 (raw 1982, floor) → expert | xyzWing 540, xyWing 480, … | 1154 → evil |

Anchors outside the generator (`tests/fixtures/rated.js`, `data/E-anchors.txt`): all 18 constructed fixtures keep their
label except `constructed-expert-3` (535, one XY-Wing → veryHard) and the three constructed evil puzzles (3.8k–4.3k →
nightmare1); Wikipedia example and "classic-easy" stay easy; Escargot 6,936, Inkala 2012 7,980, Platinum Blonde 7,474,
Golden Nugget 8,007 → nightmare2 (with the `nishio2` refinement 9,854 / 12,029 / 13,787 / 13,444).

### C2. Level ladder defined by score bands only

| # | id | en / vi | band [min, max) | semantic anchor (9×9) | classic9 today → new (sample A, 200 per level) |
|---|---|---|---|---|---|
| 0 | veryEasy | Very easy / Rất dễ | [0, 40) | singles only, ≤ ≈ 44 empty cells | veryEasy 98 %, easy 2 % |
| 1 | easy | Easy / Dễ | [40, 100) | more empty cells; locked candidates; cage combinations, inequality chains | easy 100 % |
| 2 | medium | Medium / Trung bình | [100, 240) | one or two subset steps (≈ B + 63…); rule of 45 | medium 99 % |
| 3 | hard | Hard / Khó | [240, 420) | one fish-level step (X-Wing 190, colouring 215) + subsets | hard 80 % |
| 4 | **veryHard** | Very hard / Rất khó | [420, 600) | several fish-level steps, or one XY-Wing on a light baseline | hard 21 %, expert 29 % |
| 5 | expert | Expert / Chuyên gia | [600, 1000) | wing-level steps plus other advanced steps | expert 71 %, evil 7 % |
| 6 | evil | Evil / Địa ngục | [1000, 2500) | 1–5 chain steps, or many wings | evil 57 % |
| 7 | **nightmare1** | Nightmare 1 / Ác mộng 1 | [2500, 5000) | sustained chains, first trial-and-error | evil 35 % |
| 8 | **nightmare2** | Nightmare 2 / Ác mộng 2 | [5000, 10000) | heavy trial and error; the famous hardest 9×9 puzzles | evil 3 % |
| 9 | **nightmare3** | Nightmare 3 / Ác mộng 3 | [10000, ∞) | beyond that (big boards, hybrids, Killer by volume; famous 9×9 only with `nishio2`) | – |

(B ≈ 40 is the 9×9 baseline of singles + 5√E.) Rationale for the edges: 40 separates 40- from 34-clue singles puzzles;
100 and 240 sit at "one step of the cheapest technique of the next group (pair 63, X-Wing 190) + baseline"; 600 sits just
above a lone XY-Wing on a 9×9 baseline (≈ 520–560), so *expert* means a wing plus other advanced steps or a dearer wing
(W-Wing 600, UR 660); 420 splits the old hard/expert
gap at classic9's old-hard p90 (442) so `veryHard` collects long fish puzzles and the lightest wing puzzles; 1000 sits
between classic9's old-expert p90 (908) and old-evil p10 (1071). Above evil the tiers are **geometric (×2)**: with √n
a doubling of S needs four times the chain steps, which is the natural unit of "more nightmare". The scaling rule is
open (`nightmareK = [2500·2^(K−1), 2500·2^K)`); three tiers are proposed because no variant reached 20,000 reliably
(highest measured 18.6k, mega16) and classic9 itself tops out in nightmare2 (C3). Edge sensitivity: moving evil to 1200
moves classic9 old-evil→expert from 7 % to 14 % and large-board wing puzzles out of evil (`ladder-eval.js --bands`).

**Technique groups after the change.** The label never looks at groups. Groups remain useful (a) as a **search
strategy**: the dig of level L may only use `{t : c_t < max(L)}` — exact pruning, since any puzzle using t has
S ≥ c_t; (b) to explain the ladder in help ("techniques you will typically meet"), computed from the bands, not stored per
level. For the open top band all techniques are allowed. Invariant I5 becomes "an exact puzzle has `S` in the band of
the level" (no group clause).

### C3. Generation strategy: reach the highest level each variant can support

**What was simulated.** `experiments/simulate.js` patches `SG.difficulty` *in memory* (levels, `classify`/`rate` → S
and its level, `spec` → new band, derived technique set, clue floor of the nearest old level, technique oracle for every
level) and runs the unchanged pipeline/digger. This measures the proposal **without** new search code. Hit = exact level;
times include all retries (`maxAttempts` 8; 3–4 for big boards); seed 5.

| variant | vE | E | M | H | vH | X | Ev | N1 | N2 | N3 |
|---|---|---|---|---|---|---|---|---|---|---|
| classic4 (n=10) | 10/10 | 0/10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| classic6 (n=20) | 20/20 | 0/20 | 1/20 | 14/20 | 13/20 | 11/20 | 6/20 | 0 | 0 | 0 |
| classic9 (n=20) | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 | 20/20 (0.1 s) | 20/20 (0.3 s) | 15/20 (1.7 s) | 0/20 (4 s) |
| wordoku (n=10) | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 7/10 (2.7 s) | 0/10 |
| diagonalX (n=10) | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 (2.5 s) |
| hyper (n=10) | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 5/10 (9.9 s) |
| jigsaw9 (n=10) | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 7/10 (6.0 s) |
| greaterThan (n=10) | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 8/10 (2.7 s) |
| killer (n=10) | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 7/10 (2.0 s) | 8/10 | 4/10 | 3/10 | 2/10 |
| mega12 (n=5) | 0/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 (1.1 s) | 2/5 (37 s) |
| butterfly (n=5) | 0/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 (3.6 s) | 2/4 (74 s, partial) |
| flower (n=4) | 0/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 (0.9 s) | – |
| sohei (n=4) | 0/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 (5.8 s) | – |
| samurai (n=4) | 0/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 (2.2 s) | 4/4 | 4/4 (9.0 s, max 62 s) | – |
| mega16 (n=4) | 0/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 (1.0 s) | 4/4 (18 s) | 4/4 (43 s) | 1/1 (79 s) | – |

Local search ("climb", `experiments/climb.js`): from puzzles made by today's evil generator, first-improvement moves that
keep uniqueness — remove a clue / swap a clue for another solution cell (all), remove a sign (Greater-Than), merge two
adjacent cages or hand a boundary cell to the neighbour cage (Killer); keep the move when S does not drop.

| variant | starts | budget | best S reached (range) | ≥ 10,000 (N3) |
|---|---:|---:|---|---:|
| classic9 | 20 + 8 | 3 s / 15 s | 2.7k–8.7k / 4.8k–8.4k | 0/28 |
| wordoku | 8 | 3 s | 5.0k–7.9k | 0/8 |
| classic6 | 20 | 1 s | 0.43k–2.46k | 0/20 (evil band 12/20 in 2 s) |
| classic4 | 10 | 0.3 s | 21 (no move ever helps) | 0/10 |
| killer | 10 | 6 s | 12.1k–17.9k | 10/10 |
| greaterThan | 10 | 3 s | 7.0k–11.3k | 3/10 |
| jigsaw9 / hyper / diagonalX | 6 each | 3 s | 10.7k–15.9k / 10.0k–13.5k / 12.2k–14.1k | 18/18 |
| mega12 / butterfly | 4 / 3 | 10 s | 9.4k–13.7k / 8.0k–12.6k | 3/4, 2/3 |
| mega16 / samurai | 3 / 3 | 20 s | 18.2k–18.6k / 12.5k–18.2k | 3/3, 3/3 |
| sohei / flower | 3 / 3 | 15 s | 12.0k–17.3k / 12.8k–17.9k | 3/3, 3/3 |

Band-capped climbs for Killer (`data/I-band-climb.jsonl`; moves that would reach the band maximum are refused, stop on
entering the band): **expert 10/10, evil 10/10, nightmare1 9/10, nightmare2 9/10, nightmare3 9/10** within 6–8 s (the
non-hits: one start already above the band, one stuck at 775, one at 7,962).

**Proposed generation changes** (in order of payoff):
1. **Score-targeted guided dig at every level** (Killer already runs the guided stage everywhere,
   `killer.js:896-902`): objective = S of the bounded solve, refuse S ≥ band max, technique set `{t : c_t < max}`;
   for the open top band, all techniques. Drop the special "stuck" objective for evil (`digger.js:686-703`), which
   overshoots once evil has an upper edge (today's evil run lands 35 % in nightmare1 on classic9).
2. **Stage A must respect low bands** on large boards (score check in stage A, or a hand-over computed from the band
   instead of 47 % of cells): today's stage A digs to the clue floor first, which is why veryEasy is 0/4–0/5 on every big
   board (S 51–82 > 40); with the guided stage at every level and no clue floor, mega12 is still 0/5 (S 52,
   `data/G-sim-guided.jsonl`).
3. **Local search after the dig** when the sample ends below the band: clue swaps (all), sign removal (Greater-Than),
   cage merges/boundary moves and, downwards, splits/extra clue (Killer). Cheap on 9×9 (0.4 ms per rating of an evil
   classic9 puzzle; Killer 2.7 ms + ≈ 10 ms uniqueness), expensive on big boards (49 ms samurai, 64 ms mega16 per rating,
   `experiments/ratetime.js`) — use it there only for the top tiers, with a time budget.
4. **Killer cage design by target band:** size shares for veryHard and above should shift to larger cages (today evil
   uses the expert shares, `killer.js:47-50`), and the layout should be searched (step 3) rather than fixed before the dig.
5. **Clue floors become optional aesthetics.** With score targeting the band stops the dig; the per-level floors (and the
   "mean clues fall with the level" tests) can be kept for veryEasy/easy only.
6. **Budgets:** keep `maxAttempts × digTries`; add a per-level time budget (e.g. 10 s for 9×9, 30–60 s for big boards at
   evil+), because mega16 evil/N1 by digging alone took 18 s / 43 s median.

**Empirical procedure for `difficultySupport`.** For every (variant, level): generate N puzzles with fixed seeds (N ≥ 100
for boards ≤ 81 cells, ≥ 25 for big boards) through the real pipeline; offer the level iff the exact-hit rate ≥ 90 % and
p95 time ≤ the level's budget; re-run whenever costs, bands or search change (extend `tests/soak.js`, which already has
`--include-unsupported`). The UI already hides unsupported levels (`controls.js:178-189`, `store.js:218-232`); for
non-contiguous results (classic6) offer only the reachable levels and say so in the help.

**Expected maximum level per variant** (derivation: simulation table + climbs; "reliable" = ≥ 90 % in our samples):

| variant | lowest offered | highest, digging only | highest with local search | notes |
|---|---|---|---|---|
| classic4 | veryEasy | veryEasy | veryEasy | one level only — every 4×4 is singles-only (S 17–21) |
| classic6 | veryEasy | (hard/veryHard/expert 55–75 %) | **expert** (more samples / climb; evil 60 % in 2 s) | easy/medium ≤ 15 %: hide |
| classic9 | veryEasy | nightmare1 | **nightmare2** | N3 0/20 sim, 0/28 climbs (up to 15 s) |
| wordoku | veryEasy | nightmare1 | **nightmare2** | behaves like classic9 |
| diagonalX | veryEasy | **nightmare3** | nightmare3 | |
| hyper, jigsaw9 | veryEasy | nightmare2 | **nightmare3** | climbs 6/6 ≥ 10k each |
| greaterThan | veryEasy | nightmare2 | **nightmare3** | N3 8/10 sim |
| killer | veryEasy | veryHard (expert 70 %, evil 80 %) | **nightmare3** | needs cage-layout search (band climbs 9–10/10 per tier) |
| mega12, butterfly | easy | nightmare2 | **nightmare3** (slow: 37–74 s) | veryEasy needs ≈ 100 givens: hide |
| flower, sohei, samurai | easy | nightmare2 | **nightmare3** | climbs 3/3 each ≥ 10k in ≤ 20 s |
| mega16 | easy | evil (18 s) – nightmare1 (43 s) | nightmare2–3 (climbs ≥ 18k in 20 s) | budget-bound; offer N1/N2 only if a faster top-tier search is built |

### C4. Impact analysis (no task list; what changes and what it touches)

- **Core:** `js/core/difficulty.js` — `LEVELS` (+ `veryHard`, `nightmare1-3`; header comments), `BASE_GROUPS`/`groupsFor`
  (no longer one group per level), `SCORING` (√n, w_E√E), `COSTS` (+ cage/ineq entries, optional `nishio2`), `TABLE`
  (new edges, no scaling; floors only where kept), `classify` (no floor, no scale, `guess` term), `spec` (unscaled band,
  derived technique set, oracle), `techniqueScore` (`c·√n`), `confidence` (log-width bands). `js/core/logical-solver.js`
  (optional per-finding grade counts; its own uncalibrated `SCORING`, `:39`, should follow or be documented as legacy).
  `js/core/digger.js` (guided at every level, evil objective `:686-703`, stage-A band check, `distanceToLevel`, local
  search hook). `js/variants/registry.js:17` (level list). Every variant's `difficultySupport` and level-keyed tables
  (`classic.js:128-131`, `mega.js:69`, `extra-regions.js:36,177`, `jigsaw.js:783-786`, `killer.js:44-51,519,888,1092`,
  `greater-than.js:515-519`, `multigrid.js:319-320,347-354`, `wordoku.js:580`).
- **UI:** remove the floor row and its strings (`result-view.js:131-145, 360-366, 553-556, 589-592`;
  `step-view.js:339-345, 374-376, 516-519, 544-546`); technique rows show `c·√n` and the "empty cells" row `5·√E`
  (`result-view.js:93-148`, `step-view.js:314-345`); `player.js:568-622` unchanged in shape. Level names/descriptions for
  10 levels in `locale.en.js:117-130`, `locale.vi.js:115-128` (descriptions become "typically needs …"; vi: evil stays
  "Địa ngục", nightmare = "Ác mộng N"). Help: `help.js:275-306` (ladder table built from bands, not `BASE_GROUPS[i]`),
  texts `:1192-1236` ("The six levels", "hardest technique belongs to the requested level", evil oracle) and vi
  counterparts. `controls.js:43` (`STRICT_SYMMETRY` thresholds by index still work; re-check which level should warn).
  `cache.js:105-121` (pre-generation costs per new level).
- **Formats / persistence:** URL `d=` accepts new ids; old ids stay valid (`store.js:387`). History entries keep
  `requested` (still valid) but `level`/`score` are old-scale (`history.js:75-99`) — mark as legacy or recompute on
  replay; consider `sg.history.v2`. Cache: bump `sg.cache.v1` → v2 (`cache.js:82-83`); `sameResult` would otherwise drop
  every old entry after a mismatch (`:331-339`). Export JSON: add `difficulty.scoring: 2` (additive, keeps
  `sudoku-generator/v1` readable by the player) or bump the format (the player rejects other versions, `design.md`
  §14.1). `rawScore`/`hardestGroup`/`confidence` lose their floor meaning (`export.js:187-189`).
- **Player:** `player:js/ui/importer.js:70` (`LEVELS`), `:703-714` (unknown ids are silently dropped today),
  `:947-958, 1176` (name→id mapping needs the new names in both locales), `player:js/ui/locale.*.js:93-106`, tests
  fixtures `player:tests/fixtures/puzzles/*.json` and `player:tests/tools/make-technique-examples.js:30-39`.
- **Tests/fixtures/docs:** `difficulty.test.js` (level list, floor, unsolved⇒evil, scaling, I5, group-ordered costs —
  the latter still holds), the level-list assertions listed in A5, `result-view.test.js:97-115`, `rated.js` labels
  (evil fixtures become nightmare1/2), all regression hashes (`node tests/perf.js --update-hashes` after the change —
  this script **writes** `tests/fixtures/regression.js`), `soak.js` (`--bands` with ten numbers, histogram edges
  `:368`, gates), `perf-helper.js` targets/combos per level; design.md §6.6–6.8, §8.2, §9.1, §14.1–14.3, §15.3 (I5, I6),
  §18; README calibration notes (`README.md:695`, `:767`); `docs/report-v1.md` tables.
- **Backward compatibility:** every (variant, level, seed) produces a different puzzle once the score drives the dig, so
  design.md's "same URL ⇒ same puzzle" holds only within one scoring version. Options: accept and announce; or add a
  scoring version to the URL/history/cache key (`v2` default, old links without it regenerate with v2 and show a note).
  Old exported files remain importable (level ids `veryEasy`…`evil` still exist; their scores are on the old scale).

### C5. Risks, open questions, validation plan

**Risks / open questions**
1. *Variant technique costs* (cageCombo 7, ruleOf45 63, cageSplit 160, ineqChain 5, minMaxForcing 70) are expert
   judgement. Killer/Greater-Than labels move with them (e.g. ruleOf45 at 40 instead of 63 lowers a Killer puzzle by
   23·√n: ≈ 25 points for one use, ≈ 70 for the 9 uses of a typical expert-type puzzle, ≈ 100 for 18 uses).
2. *Tedium vs depth at the top:* generated nightmare puzzles get their score from many forcing chains (classic9 climbs:
   7–29 chains, 0 % depth-2 nishio) while the famous puzzles need nested trial (2–12 depth-2 steps). Without `nishio2` the
   two are on par; chain length is not scored at all.
3. *Big boards rise ≈ +1 level* for the same hardest technique and can cross into evil without chains (sohei expert #0:
   two wings → 1154). If perceived as too high: breadth damping, γ = 0.4, or evil at 1200.
4. *Small-board gaps:* classic6 cannot produce easy/medium; classic4 is a one-level variant.
5. *Path dependence:* 4.4 % of clue removals lower S (0.5 % the level); the greedy solver, not the formula, causes it.
6. *E is size-confounded:* a 16×16 with 47 empty cells and a 9×9 with 47 empty cells get the same E term; acceptable
   because it only matters for veryEasy/easy, which big boards lose anyway.
7. *Performance* of top tiers on big boards (mega16 evil 18 s, N1 43 s, N2 79 s by digging; mega12 N3 37 s).
8. *Reproducibility break* for every old seed/link/history entry and all regression hashes.
9. *jellyfish* is still uncalibrated (never seen on a solving path, `difficulty.js:170-172`).

**Validation / calibration plan**
1. Re-score: run `tests/soak.js`-style samples (≥ 200 per variant×level for ≤ 81 cells, ≥ 40 for big boards) and check
   (a) classic9 agreement with today's labels ≥ 95 % for veryEasy…medium, (b) cross-size shift ≤ 1 level for basic…wing
   tiers, (c) clue-removal level drops ≤ 1 %.
2. External anchors: rate published puzzles with known grades (Sudoku Explainer / HoDoKu ratings for classic9, published
   Killer and Futoshiki-style collections) and require monotone agreement (Spearman ρ) — this is the main check for the
   variant technique costs.
3. Human timing: a small blind study (solve time and self-rated difficulty) on 5 puzzles per (variant, level); fit
   `w_E`, γ and the five variant costs by least squares on log time.
4. Generator acceptance: per (variant, level) hit rate ≥ 90 % and p95 within budget with fixed seeds before a level is
   offered; record the measured table in the variant file next to `difficultySupport`.
5. Regression discipline: update the regression hashes once, together with a scoring-version field, and pin the new
   ladder with labelled fixtures (including the four famous puzzles as N2/N3 anchors).

---

## Appendix — experiments

All scripts live in `experiments\` and load the engine read-only through `experiments\engine.js` (same file list as
`tests/node-runner.js`, `vm.runInThisContext`, UI files skipped). Outputs are only written under `experiments\data\`
(scripts refuse other paths). No repository script that writes files was run (`tests/perf.js --update-hashes` and
`SG_UPDATE_HASHES` were avoided). Machine: AMD Ryzen 7 9800X3D, Node v26.8.2. Per-puzzle seeds are FNV-1a of
(base seed, `"variant:level:i"`) as in `tests/soak.js:213-217`.

| id | command (from `experiments\`) | sample | output |
|---|---|---|---|
| A | `node sample.js --variants=classic4,classic6 --levels=all --count=150 --seed=20261019 --include-unsupported --out=data/A-classic46.jsonl` (likewise classic9 `--count=200`; diagonalX,hyper,jigsaw9,wordoku,greaterThan `--count=100`; killer `--count=60`; mega12,mega16,butterfly,flower,sohei,samurai `--count=40`) | 7,800 puzzles, all 15 variants × 6 levels (levels widened in memory like soak's `--include-unsupported`) | `data/A-*.jsonl`; summaries `node baseline.js` → `A-baseline-summary.tsv`, `node counts.js` → `A-technique-counts.txt` |
| B1 | `node floor.js data/A-*.jsonl` | exact puzzles of A | `data/B1-floor-removal.tsv` |
| C | `node monotonic.js --in=data/A-classic9.jsonl --per=25 --max-removals=20 --out=data/C-mono-classic9.jsonl` (+ greaterThan/jigsaw9/hyper `--per=8 --max-removals=15`, killer easy–expert `--per=10 --max-removals=10`, mega16/samurai `--per=4 --max-removals=10`); `node monoeval.js data/C-mono-*.jsonl`; `node mono-by-clues.js` | 3,983 single-clue removals (unique after removal), removal order seed 7 | `data/C-mono-*.jsonl`, `C-mono-eval.txt`, `C-mono-by-clues.txt` |
| D | `node climb.js --in=data/A-classic9.jsonl --variant=classic9 --level=evil --n=20 --budget-ms=3000 --out=data/D-climb.jsonl` (classic6 20×1 s, classic4 10×0.3 s; killer 10×6 s, greaterThan 10×3 s, wordoku 8×3 s → `D-climb-k.jsonl`; jigsaw9/hyper/diagonalX 6×3 s, mega12 4×10 s, butterfly 3×10 s, mega16 3×20 s, samurai 3×20 s, sohei/flower 3×15 s → `D-climb-l.jsonl`), move seed 11; `node depth.js data/D-climb.jsonl` | 115 climbs | `data/D-climb*.jsonl`, `D-nishio-depth.txt` |
| E | `node anchors.js` | 26 fixtures of `tests/fixtures/rated.js` | `data/E-anchors.txt` |
| F | `node rescore.js <formula> --by=group` (or `--by=level`), `node shift.js <formulas>`, `node shift-detail.js` | sample A | `data/F-*.txt` |
| G | `node simulate.js --variants=classic9 --levels=all --n=20 --seed=5 --out=data/G-sim.jsonl` (classic6 n=20, classic4 n=10; diagonalX,hyper,jigsaw9,wordoku n=10 → `G-sim2`; killer,greaterThan n=10 → `G-sim3`; mega12,butterfly n=5 `--max-attempts=4` → `G-sim4` (butterfly N3 stopped after 4 puzzles); mega16 n=4 `--max-attempts=3` → `G-sim5` (stopped after N2 #1 to respect the 15-min limit); samurai → `G-sim6`; sohei,flower → `G-sim7`; classic6/classic4/mega12 with `--guided-all --no-floor` → `G-sim-guided`); `node sim-summary.js data/G-sim*.jsonl` | 1,505 simulated generations | `data/G-sim*.jsonl`, `G-sim-summary.md` |
| H | `node depth2.js --anchors --files=data/A-classic9.jsonl,data/A-9x9variants.jsonl,data/A-large.jsonl,data/D-climb.jsonl,data/D-climb-l.jsonl --levels=evil` | evil puzzles of fixed-model variants + climbs | `data/H-nishio-depth.txt` |
| I | `node climb.js --in=data/A-killer.jsonl --variant=killer --level=expert --n=10 --budget-ms=6000 --lo=600 --hi=1000 --out=data/I-band-climb.jsonl` (+ evil band from expert starts `--skip=10`, N1/N2/N3 from evil starts `--skip=10/20/30`; classic9 N3 8×15 s `--skip=20`; classic6 evil band 20×2 s `--skip=20`) | 78 band-capped climbs | `data/I-band-climb.jsonl` |
| J | `node compare.js classic9:hard:0 …`; `node example.js --in=data/A-classic9.jsonl --variant=classic9 --level=hard --i=0` | 16 + 2 puzzles | `data/J-compare.md` |
| K | `node ladder-eval.js sqrt [--bands=…]` | sample A | `data/K-ladder-eval.txt` |
| – | `node ratetime.js --in=data/A-large.jsonl --levels=evil --per=4` (and classic9, killer, 9×9 variants) | 4–10 per variant | console (numbers quoted in C3) |

Key raw results are quoted in the sections above; `ladder.js` holds the band table and `rescore.js` the formulas and cost
tables used everywhere.
