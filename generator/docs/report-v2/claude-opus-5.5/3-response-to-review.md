# Response to gpt-6-astra's review, and position on the joint basis R1–R10

**Researcher:** claude-opus-5.5  
**Date:** 2026-10-19  
**Responds to:** [`../gpt-6-astra/2-review-of-claude-opus-5.5.md`](../gpt-6-astra/2-review-of-claude-opus-5.5.md) (read in full).  
**Unchanged:** my report ([`1-report.md`](1-report.md)) and review ([`2-review-of-gpt-6-astra.md`](2-review-of-gpt-6-astra.md)); both repositories (checked at the end, `git status --short`
empty for both); gpt-6-astra's folder (read only).  
**Notation:** `G\` generator repo, `P\` player repo, `CO\` = my `experiments\` folder (not part of the repository), "their review Lnn" = a line of
their review, "my report Lnn" / "my review §x" = my earlier documents. "G" = the agreed peak/log score
`V + P + 0.25·P·log₂(1+W/P)` with their weights; "C" = my withdrawn `Σ c·√n + 5√E`.

## 0. Summary

| Item | Answer |
|---|---|
| (a) `climb.js` has no completeness guard; 142/193 endpoints break the rotational180 clue mask | **Accept.** Reproduced exactly (142/193); my Phase-2 G climbs are also asymmetric (54/68). Re-run with symmetric moves: Killer middle bands still reachable (8/4/7 of 10), but classic9/Wordoku nightmare2 (0/10, 0/8) and classic6 evil (3/20) are **not** — I correct my review's maxima accordingly. |
| (b) Mega16 slowness is a strategy artefact | **Accept.** Under the agreed ladder: the existing evil strategy gives nightmare2 at once (10/10, median 0.2 s) and a downward refinement reaches nightmare1 10/10 and evil 10/10 (≤ 0.4 s extra). It does **not** transfer to Killer (0–1/10). |
| (c) 40-empty veryEasy puzzles exist on all six large boards | **Accept.** The blocker is Stage A, not the formula; I withdraw "or hide veryEasy". |
| (d) other critiques | Accepted, all of them (§1.4). No remaining disagreement blocks the joint report; two numeric remarks on caps (§1.5). |
| R1–R10 | **ACCEPT all ten**, with implementation notes on R1, R6, R7 and R10 (§2). |

---

## 1. Point-by-point response

### 1.1 (a) Local-search prototype: completeness and symmetry — ACCEPT

**Completeness guard.** Correct: `CO\climb.js` computes `solved` but neither its acceptance test nor `hit` reads it.
No saved endpoint is affected — `CO\xreview\out\symmetry-audit.txt` re-checks all of them: 193/193 Phase-1 and 68/68
Phase-2 endpoints record a complete proof. My Phase-2 `climb-g.js` scores an incomplete proof as −1, so it can never be
accepted over a complete one. A production search must still reject an incomplete proof explicitly, not by accident.

**Symmetry.** Correct and important. My audit (`CO\xreview\symmetry-audit.js`, rotational180 orbits from
`SG.symmetry.groups`) reproduces **142/193** asymmetric Phase-1 endpoints (classic9 28/28, Killer 17/60, …). It also
shows that the **Phase-2 climbs my review relied on are asymmetric too: 54/68** (classic9 10/10, Wordoku 8/8,
classic6 20/20, Killer 16/30). Single-cell remove/swap moves were the cause. I therefore added orbit moves (`--sym`:
remove a full clue orbit, or swap one clue orbit for one empty orbit) and a deterministic proposal cap to
`CO\xreview\climb-g.js`. Then I re-ran the same starts, bands and time budgets. All 68 new endpoints are symmetric and
completely proved:

| target (G band), starts, budget per start | Phase 2, single-cell moves (asymmetric) | Phase 3, orbit moves (symmetric) |
|---|---:|---:|
| classic9 nightmare2 [3600, ∞), 10, 4 s | 3/10 | **0/10** (best 3,099) |
| Wordoku nightmare2, 8, 4 s | 4/8 | **0/8** (best 3,281) |
| classic6 evil [1500, 2400), 20, 2 s | 9/20 | **3/20** |
| Killer veryHard [700, 1000), 10, 6 s | 5/10 | **8/10** |
| Killer expert [1000, 1500), 10, 6 s | 5/10 | **4/10** |
| Killer evil [1500, 2400), 10, 6 s | 4/10 | **7/10** |

Consequences for my review:

- **Killer middle levels:** the conclusion stands. Cage merge/boundary moves do not touch the clue mask, and with
  symmetric clue moves the bands are still reached (19/30 vs 14/30 before; both small samples).
- **classic9 / Wordoku nightmare2** were existence results without symmetry, not evidence for the default
  rotational180 setting. With symmetry, neither the plain digger (0/10, 0/10, review §2.12) nor orbit moves (0/10,
  0/8) reach them. The old evil strategy does not either: 1 of 270 pooled classic9 old-evil outputs scores ≥ 3600 under
  G, and it is the one from their `symmetry:none` run (3625.3). **My review's "nightmare-2 for every 9×9-or-larger
  variant (with local search for classic9, Wordoku …)" is withdrawn for classic9 and Wordoku:** under the default
  symmetry I now expect nightmare1 as their highest supported level; nightmare2 stays reachable with `none` symmetry or a
  stronger search.
- **classic6 evil:** 3/10 (plain digger) and 3/20 (symmetric search) — expect it hidden. The best-supported classic6
  levels are veryEasy and hard; veryHard/expert are borderline (5/10, 6/10). The R7 measurement decides.
- **Reproducibility:** with a move cap the runs are deterministic. Two runs of the same command gave identical
  endpoints (`CO\xreview\out\climb-g-cap.log`). The climb records now also store the final cage cells and sign pairs.

### 1.2 (b) Mega16 timings are a strategy artefact — ACCEPT

Their numbers match mine under my own formula (pooled Mega16 old-evil outputs: 76 % in C-nightmare3). The decisive check
is under the **agreed** ladder. `CO\xreview\mega16-refine.js` uses the **unpatched** existing evil strategy
(DFS-uniqueness dig + "stuck below chains" objective) as the candidate generator. It rates each candidate fully with G
rounded to an integer (R1), then refines **downward**: it re-adds rotational180 clue orbits of the solution in a seeded
order, keeps an addition while the score stays ≥ the band's upper edge, and undoes it if the score falls below the
lower edge or loses the complete proof. The cap is 64 ratings. Base seed is 20261019 and there are 10 requests per row:

| variant / target | proposal already ≥ target | final hits | median proposal | median / max refinement |
|---|---:|---:|---:|---:|
| Mega16 nightmare2 [3600, ∞) | 10/10 | **10/10** | 0.21 s | – |
| Mega16 nightmare1 [2400, 3600) | 10/10 | **10/10** (1–18 ratings, all unique, 102–118 clues) | 0.21 s | 0.09 / 0.37 s |
| Mega16 evil [1500, 2400) | 10/10 | **10/10** | 0.21 s | 0.09 / 0.38 s |
| Samurai nightmare1 | 5/10 (4 already in band) | **9/10** | 0.14 s | 0.05 / 0.24 s |
| Samurai evil | 9/10 | **10/10** | 0.15 s | 0.04 / 0.12 s |
| Killer evil / expert / veryHard | 6/10 each (4 proposals end below 700) | **0/10, 0/10, 1/10** | 1.3 s | 0.01 s |

So my 124 s / 150 s Mega16 figures came from forcing every candidate removal through the full technique oracle at the
top band; they say nothing about the board. **Propose high, then refine down by re-adding symmetric clue groups** is a
cheap and general way to fill the upper bands of large boards. Killer is the exception. One added clue orbit on a
zero-given Killer jumps from "needs Nishio" (≥ 2,400) straight below 1,500, so its middle levels need the cage-structure
search of §1.1. This supports R6 (ii) and (iii). I ask that R6 (iii) list **re-addition** explicitly (§2).

### 1.3 (c) veryEasy on large boards — ACCEPT

Their six 40-hole, rotational180, naked-single-only puzzles (G 42.3, C 37.947 on every board) settle it. Under both
formulas `veryEasy` is a matter of the dig stopping early enough. My review offered "apply the band edge in Stage A, *or
hide* veryEasy". I withdraw the "or hide" alternative: hiding a level because the current dig overshoots it would be the
wrong fix. Today these boards offer `veryEasy`; with the Stage-A edge test (R6 i) they keep it.

### 1.4 Other critiques — all accepted

| # | My claim (location) | Their correction | Response |
|---|---|---|---|
| 1 | "The registry keeps its own copy because it loads first" (my report L76) | Difficulty loads **before** the registry in `tests\node-runner.js` (50 vs 57), `index.html` (365 vs 372), `gen.worker.js` (74 vs 81) | Accept; verified. I repeated the stale comment of `G\js\variants\registry.js:16`. The duplicate lists are real; the stated reason is not. |
| 2 | Cage/inequality techniques "never count as hardest" (my report L365) | Tier 0 techniques win "hardest" against singles; 98 examples, e.g. Greater-Than 2781630311 | Accept. Correct statement: they never raise the floor, and never outrank a standard locked-or-higher technique. Moot under R4. |
| 3 | "√ … halves today's spread" (my report L462) | 1.00 → 0.65 is −35.7 % | Accept. |
| 4 | "Without it, samurai hard would be hit by ≈ 5 % of samples" (my report L337) | 2/40 *final* outputs stay in band after removing the floor; this is not a per-dig hit rate | Accept. Their regenerated run (median 35 samples) is the hit-rate evidence. |
| 5 | "every seed regenerates a different puzzle … all regression hashes" (my report L66, L683, L708; review §5.7 item 5) | classic4/classic9 veryEasy 20/20 hashes unchanged, classic9 hard 11/20 unchanged | Accept: "old seed-only reproduction is no longer guaranteed", not "every puzzle changes". This applies to my review's wording too. |
| 6 | My Phase-2 "common corpus of 9,425 generated puzzles" | 785 of their requests are already in my sample A | Accept; verified (`CO\xreview\out\phase3-checks.txt`): 785/785 identical givens, and 74/120 of their zero-floor classic6 rows equal the default row. The distinct default-generator corpus is 8,310. Their deduplicated replication gives the same conclusions (cross-size 0.398 vs 0.645; the monotonicity and relabelling data had no duplicates). |
| 7 | Review §2.6: "score varies G 26 vs C 36" | G's tenth rounding hid small changes | Accept; unrounded both vary for 6/40 (their probe) and 36/85 (mine). The intrinsic gain is the amplitude (worst ratio 1.097 vs 1.324; 1.104 vs 1.413). Level changes are partly a ladder effect: AA 0/0, AC 2/3, CA 0/3, CC 2/5 (their probe / mine). |
| 8 | `simulate.js` timings | No run budget; no `solved` field | Accept. `simulate-g.js` (Phase 2) records `solved` (0 incomplete of 872) but also ran without a production budget; its timings are not budget guarantees. |
| 9 | `nishio2` as a later depth refinement (my report C1) | Splitting an id into equal-cost aliases already raises C (Golden Nugget 8,007 → 10,276): breadth, not depth | Accept; G is alias-neutral, which is one more reason for the shape. Nishio depth stays "later". |
| 10 | C ladder: nightmare3 = [10000, ∞) next to a geometric rule (my report C2) | Internal ambiguity | Accept; moot (C withdrawn; R2 has an explicit open top band). |
| 11 | "Solver limits do not bind" (my report L392); guess term; "classic6 cannot produce easy/medium" | – | Already withdrawn in my review §3.2; their figures (42 C-easy, 7 C-medium, 25 C-evil among 1,020 classic6 outcomes) confirm it. |
| 12 | classic4 "veryEasy only" from sampling | Exhaustive check: all 565,820 unique clue subsets of the 12 canonical solutions are naked-single solvable (max 12 empties) | Welcome; this upgrades the claim to a result for the canonical solver. |

### 1.5 Qualifications (not objections)

1. **Move caps must count the expensive work.** Their initial cap of "1,024 proposed moves, rejected ones included"
   (their review §4.4) is too small for symmetric moves. On classic9 evil starts, most orbit removals fail the cheap
   uniqueness test: 1,024 proposals gave only 27–63 rated candidates in 25–46 ms, and 30,000 proposals gave 507–1,732
   rated candidates in 0.6–1.6 s (`CO\xreview\out\climb-g-cap.log`). Deterministic caps should bound **rated
   candidates** (the expensive step) and proposals separately, e.g. ≤ 1,024 ratings and ≤ 32,768 proposals per 9×9
   attempt. The figures are starting values for the R7 measurement, not tuned constants.
2. **Propose-then-refine has a known limit.** It needs a score landscape without cliffs. Killer at zero givens has
   cliffs (§1.2), so Killer's middle relies on cage moves. classic6/classic9 nightmare tiers are rarely proposed at all.
3. **Small samples.** Every new count above is 3–20 trials: feasibility evidence, not support (Wilson 95 % lower bound
   for 10/10 ≈ 72 %). Support comes from R7.

### 1.6 Remaining disagreements

None that blocks the joint report:

- **Display.** They prefer separate Peak/Workload/Empty rows; R3 records that as the alternative and chooses
  apportionment, which was my proposal.
- **Killer weights.** I still expect `ruleOf45` ≈ 145 and `cageSplit` ≈ 420 to match players better than 260/520.
  R8 implements theirs now and defers calibration. Under the agreed shape the weights move mid labels, not
  reachability (review §2.11–2.12).

---

## 2. Joint basis R1–R10

| R | Decision | Notes / evidence |
|---|---|---|
| **R1** integer score `Math.round(V+P+R)`, frozen G weights | **ACCEPT** | On 8,398 distinct complete proofs, integer instead of tenth rounding changes the level of **6** (3 vE→E, 1 M→H, 1 H→vH, 1 vH→X; `phase3-checks.txt`). `classic-easy-2` (44.7) becomes 45 = *easy*, its fixture label. Note: `Math.log2` is not guaranteed correctly rounded across JS engines. A flip needs a value within ~1e-12 of an x.5 boundary, so this is negligible, but exact cross-browser reproduction becomes "practical" rather than provable. Today's linear score has no transcendental term. |
| **R2** ids `nightmare1`, `nightmare2`; en "Very hard", "Nightmare 1/2"; vi "Rất khó", "Ác mộng 1/2"; bands 0/45/180/400/700/1000/1500/2400/3600, top open | **ACCEPT** | `G\design.md` §6.7 calls `evil` "Ác mộng" while the locale says "Địa ngục" (their review, A1). Fix the doc together with R2 so the vi names stay unambiguous. |
| **R3** existing table, exact apportionment, no bonus row | **ACCEPT** | Ties in the weight table (40: pointing/cageCombo/ineqChain; 260: nakedQuad/ruleOf45) are resolved by R4, so exactly one row carries `P`. The help text must say that row totals are shares of a whole-trace score, not per-use costs. The empty-cells row shows `V` (its points column becomes `V/E` or blank). `roundToTotal` keeps integer parts summing to the integer score. |
| **R4** hardest = largest weight; ties: later registration order, then id | **ACCEPT** | Same rule as the `P` row of R3. |
| **R5** incomplete proof: no level, never a hit; closest complete candidate + `difficulty.approximate` after deterministic caps; else the existing error; unrated replay step → existing null state | **ACCEPT** | Consistent with every measurement where acceptance required a complete proof: 0 incomplete final outputs among 872 simulated requests, 142 local-search endpoints and 80 propose/refine requests. |
| **R6** generation (i)–(vi) | **ACCEPT** | (i) `1.25·w_t < max` is a sound bound: `W ≥ P` gives `R ≥ 0.25P`, hence `S ≥ V + 1.25P`; with integer rounding, `V ≥ 1.95` (E ≥ 1) keeps the bound. (ii) strongly supported (§1.2). (iii) please list **re-addition of symmetric clue groups** (downward refinement) next to removal/swap; it fills nightmare1/evil on large boards in ≤ 0.4 s. Killer cage moves remain necessary for Killer's middle (8/4/7 of 10 at 6 s). (v) cap rated candidates and proposals separately (§1.5). (vi) fine. |
| **R7** 40 seeds, ≥ 36/40 and p95 ≤ 2 / 10 / 30 s; 30–35 → +60 seeds, ≥ 90/100; < 30 hidden | **ACCEPT** | My current expectation, to be replaced by the measurement: classic4 vE; classic6 vE, H (vH/X borderline); classic9 and Wordoku vE…nightmare1; diagonalX, hyper, jigsaw9, Greater-Than vE…nightmare2; Killer vE…H plus whatever the cage search lifts over 36/40 (vH likely, X/Ev/nightmare1 borderline at 6 s); large boards vE…nightmare2 once Stage A and propose/refine are in place. Record machine, profile and engine version with the table. |
| **R8** Killer 260/520 now, calibration later | **ACCEPT** | My preference is recorded under "later". |
| **R9** cache schema bump; export v1 + `ratingVersion: 2`; history keeps stored values; no URL version; player learns ids/names | **ACCEPT** | Wording for the user: old links/history "may" regenerate a different puzzle (§1.4 item 5). The player's text import maps localized names back to ids (`P\js\ui\importer.js:947-958`), so the new names must be in its locales. Player progress identity is content-based, so it is unaffected. |
| **R10** tests/docs rewritten; hashes regenerated once after review | **ACCEPT** | Also fix the stale "loads later" comment at `G\js\variants\registry.js:16` and the design.md naming of `evil` (R2 note). Some hashes will legitimately stay unchanged (§1.4 item 5), so review the hash diff instead of replacing it blindly. |

---

## Appendix — Phase-3 experiments (all under `CO\xreview\`, read-only inputs, outputs in `out\`)

| Command | Sample / seeds | Output |
|---|---|---|
| `node xreview/phase3-checks.js` | overlap of their 785 baseline/unsupported rows with sample A; integer vs tenth rounding on 8,398 distinct complete proofs; relabel solves (40×21, 85×11) unrounded, four formula×ladder combinations | `out\phase3-checks.txt` |
| `node xreview/symmetry-audit.js` | all 193 Phase-1, 68 Phase-2 and 68 Phase-3 endpoints | `out\symmetry-audit.txt` |
| `node xreview/climb-g.js … --sym --max-moves=1000000` with the Phase-2 targets/budgets (classic9 N2 10×4 s, Wordoku N2 8×4 s, classic6 evil 20×2 s, Killer vH/X/Ev 3×10×6 s; move seed 11) | 68 starts from sample A | `out\climb-g-sym.jsonl`, `out\climb-g-sym-k.jsonl`, `out\climb-g-sym-*.log` |
| `node xreview/climb-g.js … --sym --max-moves=1024` and `=30000` (classic9 evil starts 0–2, twice) | 6 runs, deterministic | `out\climb-g-cap.log`, `out\climb-g-cap.jsonl` |
| `node xreview/mega16-refine.js [--variant=… --lo=… --hi=…] --n=10 --seed=20261019` | Mega16 N1 / evil; Samurai N1 / evil; Killer evil / expert / veryHard; request seeds `seedFor(20261019, variant:evil:k)` | `out\mega16-refine.txt`, `out\large-refine.txt`, `out\killer-refine.txt` |

Every run took under 3 minutes. Both repositories were checked after writing this file:
`git status --short` in the sudoku-generator and in the sudoku-player repository both print
nothing.
