# Cross-review of gpt-6-astra's report — difficulty scoring and difficulty generation

> **Paths.** Written when the generator and the player were two repositories (`sudoku-generator`, `sudoku-player`):
> paths such as `js/core/…`, `js/ui/…`, `tests/…` and `design.md` belong to those repositories, and line numbers to the commits named below.
> In this repository they are `generator/…` or `player/…`, and the files both projects share are in `core/` — see
> [where the old paths went](../../architecture.md#where-the-old-paths-went). Commands such as `node tests/node-runner.js` run in `generator/` or `player/`.

**Reviewer:** claude-opus-5.5  
**Date:** 2026-10-19  
**Reviewed:** [`../gpt-6-astra/1-report.md`](../gpt-6-astra/1-report.md) (read in full) and its experiment folder (read-only; not part of the repository).  
**Scope:** critical review section by section (A1–C5), a quantitative head-to-head of both proposals on a common corpus,
new bounded experiments where the two reports disagree, and my revised positions. Research only: neither repository was
modified (verified at the end, appendix X4). My report ([`1-report.md`](1-report.md)) is unchanged; it documents my independent phase.

**Notation.** `G\` = the sudoku-generator repository (paths from its root), `P\` = the sudoku-player repository,
`GA\` = gpt-6-astra's experiment folder, `CO\` = my experiment folder (`experiments\` in my report); the two experiment
folders are not part of the repository. "GA report Lnn" is a line of their report ([`../gpt-6-astra/1-report.md`](../gpt-6-astra/1-report.md)),
"CO report Lnn" a line of mine. Formula **C** = my proposal `S = Σ c_t·√n_t + 5·√E` (ladder 0/40/100/240/420/600/1000/
2500/5000/10000); formula **G** = theirs, `S = round₀.₁(80E/(E+40) + P + 0.25·P·log₂(1+W/P))`, `P = max w_t`,
`W = Σ w_t·n_t` (ladder 0/45/180/400/700/1000/1500/2400/3600, then ×1.5). Level abbreviations: vE, E, M, H, vH, X (expert),
Ev, N1 (nightmare / nightmare1), N2, N3.

## 0. Verdict in brief

1. **Their report is careful and its code claims hold.** Every claim I re-checked in the source is correct (✔ items in
   §1); no arithmetic or citation errors were found. They found several facts I missed (tier-first `hardestTechnique`,
   budget errors discarding the best sample, hits not requiring `solved`, the floor's tie effect, `sg.lastConfig.v1`).
2. **Their errors are of interpretation, not of fact:** classic6 "evil routinely / nightmare rare target" rests on old
   labels (under their own ladder: evil 5/30, pooled 11 %, one boundary nightmare puzzle); the loss of `veryEasy` on every
   board larger than 9×9 is not mentioned; the ×1.5 nightmare tiers above nightmare-2 are unreachable under their own
   shape; the Killer middle-level gap their shape creates is not discussed; the 500-seed validation is not budgeted.
3. **Formula: I change my position to theirs.** On a common corpus of 9,425 generated puzzles (+193 climbs, 3,983
   removal pairs, 125 relabelled puzzles, 26 fixtures) their peak + log-work shape beats my `Σ c√n + 5√E` on cross-size
   consistency (mean |log₂| 0.38 vs 0.63), path robustness (0 vs 5 level changes), monotonicity (>5 % drops 0.4 % vs
   1.9 %), tier separation (classic9 AUC 1.000) and the top end (famous puzzles in the top populated tier; no tedium
   tier above them).
4. **The shape, not their weight table, does the work:** their shape with today's `COSTS` performs the same. I accept their
   table for implementation now and flag only the Killer weights (`ruleOf45 260`, `cageSplit 520`) for later calibration.
5. **Their score fits the existing Difficulty Score table** (rows per technique + empty cells, Total = score) by exact
   apportionment of the peak and work terms; an additive variant (PW) exists but is slightly worse. UI changes are listed
   in §5.7.
6. **Ladder: their edges 0/45/180/400/700/1000/1500/2400/3600**, with only `nightmare` and `nightmare-2` defined now
   (0 of 61 simulated nightmare-3 requests succeed; nothing in more than 10,000 puzzles exceeds 5,028).
7. **Incomplete proofs: I concede** — unrated, never a hit. The technique oracle at the top levels avoids them (0 of 872
   simulated requests).
8. **New evidence (simulation of their ladder with today's digger, 872 requests):** easy … nightmare-2 on diagonalX,
   hyper, jigsaw9, Greater-Than and all large boards; classic9/Wordoku up to nightmare (nightmare-2 needs local search:
   3/10, 4/8 in 4 s); `veryEasy` fails on every large board; Killer veryHard/expert/evil 2/1/2 of 10 → 5/5/4 of 10 with
   6 s of cage-move local search; Mega16 nightmare tiers take 2–2.5 min.
9. **Max level per variant (revised):** nightmare-2 for every 9×9-or-larger variant (with local search for classic9,
   Wordoku and Killer; time-bound on Mega16), evil for classic6 (with search), veryEasy only for classic4.
10. **Errors in my report** (§3.2): the unsolved "guess" term, the √n formula, an evil/nightmare edge that mislabels the
    constructed evil fixtures, and "classic6 cannot produce easy/medium" (they are rare, not absent).

---

## 1. Section-by-section review

Each subsection lists agreements, disagreements with a verdict, what they found that I missed, and errors (theirs and,
where their report exposes them, mine). Code claims marked ✔ were re-checked by me in the source.

### A1 — Levels

- **Agree.** Six ids, no `veryHard` (✔ `G\js\core\difficulty.js:100`, `G\js\variants\registry.js:17`); cumulative
  `BASE_GROUPS` with `cage`/`ineq` allowed at every level (✔ `difficulty.js:103,110`); classic9 bands 0/72/180/400/800/1500
  scaled by `cellCount/81`; clue floors, `clueFloorScale`/`clueFloor` semantics. Their table of names/descriptions (en/vi)
  matches the locales.
- **They found, I under-reported.** The Killer cage-size shares are chosen **by requested level**
  (✔ `G\js\variants\killer.js:44-51`, hard/expert/evil identical) — I mentioned "level-dependent size shares" in passing
  (CO report L221) but not that `evil` settings already exist behind the support list. This matters for C3 (Killer
  profile search).
- **No errors found.** The p95 performance-target table is a useful addition; it is test policy, not a difficulty band.

### A2 — Scoring

- **Agree** on every term: `rawScore = Σ c_t(n_t + 0.5) + 0.6·Ê` (✔ `difficulty.js:412,451`), `Ê` reconstructed from the
  solver's own score (✔ `:421`), floor `max(raw, a·B_h)` (✔ `:455`), unsolved → top floor (✔ `:454`), no level input to
  `rate` (✔ `:491-503`). Cage/inequality techniques fall back to `baseCost` 10/28/40/12/22 because `COSTS` has no entry
  (✔ `:175-197`); my report says the same (CO report L138-139).
- **They found, I missed.** `hardestTechnique` is chosen **tier first** and cage/ineq have tier 0 (✔ `difficulty.js:393-396,
  415-418`), so a `cageSplit` loses "hardest" to a `pointing`. Correct and relevant: the UI and the floor read that field.
- **No errors found.** Their worked example (classic9 seed 1592778586, 511.925 → hard) and the Samurai floor example
  (2073087849, raise 621.05 = `400·369/81 − 1201.175`) are arithmetically right.

### A3 — Generating a target level

- **Agree** on the pipeline, Stage A/B, the guided candidate pool `max(4, min(32, round(32·81/n)))`, the "strictly below
  the band's upper edge" acceptance and the evil objective "solve without chains; stuck = `1e9 + open cells`"
  (✔ `G\js\core\digger.js:685-717`).
- **They found, I missed.** (1) Within one pipeline call a new attempt re-grows Killer cages and Greater-Than signs but
  **not** the Jigsaw regions or the Wordoku word. (2) A budget exception propagates as an error and **discards the best
  sample found so far** (✔ `G\js\core\pipeline.js:221-227`: catch → `em.error` → rethrow). (3) A hit only requires
  `rating.level === requested`, not `rating.solved` — the root of the unsolved-Killer problem (B3).
- **I found, they did not stress.** Stage A of non-guided levels digs to the clue floor with no score check, so any
  size-free ladder makes `veryEasy` unreachable on large boards with today's digger (CO report L229); this is now
  measured under their ladder (§2.12: Mega12/Butterfly `veryEasy` 0/3 each).

### A4 — Per-variant matrix

- **Agree; the two samples are mutually consistent** although independent (their seeds 20261019/20261020, 670 + 115 +
  390 trials; mine 7,800 at seed 20261019 with other derivations). Ungated old-level hit rates: Killer evil 24/30 = 80 %
  (theirs) vs 48/60 = 80 % (mine); classic6 expert/evil 4/5 and 4/5 vs 93 %/85 %; classic4 above easy 0/5 vs 0 %;
  Greater-Than, Wordoku, Mega, multigrid expert/evil 5/5 and 30/30 vs 100 %.
- **They did better.** Wilson intervals on small samples (GA report L337). My report gave hit rates without intervals.
- **No errors found.**

### A5 — Where level and score surface or persist

- **Agree** on all rows I can check (Summary/Steps tables, history `level: score, seed`, picker, URL `d`, cache key and
  equality test, export v1 fields, player `LEVELS` and silent drop of unknown ids).
- **They found, I missed.** `sg.lastConfig.v1` persists the difficulty (`G\js\ui\store.js:48-65`); pre-generation
  estimates `Infinity` for an unknown level, so new levels would silently never be pre-generated
  (✔ `G\js\ui\cache.js:193-194`); their explicit list of version fields to add.
- **I found, they missed.** (1) The player's **text** import maps translated level **names** back to ids through its
  locale packs (`P\js\ui\importer.js:947-958,1176-1177`): new names must exist in the player's locales or a text import
  of a new-level puzzle loses its level. (2) Level lists are pinned in nine test suites, not only `difficulty.test.js`
  (CO report L297-300). (3) `design.md` §14.2 promises that a URL "must always reproduce the exact same puzzle"; every
  generator change breaks that promise for old links (CO report L284-285, L688).

### B1 — The floor's circularity

- **Agree** on the mechanism and, importantly, on the acceptance argument: below evil the floor cannot push an admissible
  candidate over `spec.max`, because the floor of a restricted solve is at most the requested band's minimum (their
  derivation GA report L404-415; my report says the same at CO report L335-337).
- **They found, I missed.** The floor still changes the **objective ordering**: floor-bound candidates tie at the floor,
  which flattens the guided dig's "keep the hardest" choice. Their paired no-floor ablation is the better evidence of
  the search cost (Samurai hard: median dig samples 2 → 35, 10/10 hits only after raising the work limit to 10⁸,
  GA report L417-429); my report only estimated it (≈ 5 % hit per sample ⇒ ≈ 20 samples, consistent).
- **Numbers agree.** Floor-raised share: their 45/670 overall and 10/10 Samurai hard vs my sample-A shares (Samurai hard
  95 %, Sohei hard 80 %, classic9 ≤ 5 %, CO report L320-321).

### B2 — Cross-variant inconsistencies

- **Agree** with all eight points; points 1–4 match my B2.
- **Small-sample caveat (their point 7).** "All ten sampled hyper medium outputs rescore as easy" (GA report L439) holds
  for their ten; on the pooled 110 hyper old-medium puzzles it is **70 % easy / 30 % medium** under their own formula and
  ladder (`CO\xreview\out\h2h-levels.txt`). The conclusion (old hyper medium is mostly locked-candidate volume) stands.
- **Their point 8 extended** (path dependence): on their own 40×21 relabelling probe my formula C changes the score of
  6 puzzles and the level of 2 (worst max/min 1.324); theirs 3 and 0 (1.097). §2.6 adds 85 puzzles from seven variants.
  This is a defect of my proposal that their probe exposed.

### B3 — Why variants stop below the top

- **Agree** with the four-question decomposition (exists / solver proves / generator finds / UI offers) and with the
  Killer diagnosis (cage layout is the bottleneck at zero givens). Their cage-size tilt experiment is a cheap, effective
  lever that I did not test; my cage-move local search is the complementary lever (§2.12).
- **Unsolved Killer — they are right, I was wrong.** I re-ran seed 3203566290 (`CO\xreview\killer-unsolved.js`): unique,
  0 clues, 21 cages, `solved:false`; with `maxNishioDepth 3` and `maxChainLength 24` it is still unsolved with 81 open
  cells. The second unsolved puzzle in their data (killer-tilt seed 3220343909, `cageSize 2`) **is** solved at Nishio
  depth 3 (111 Nishio uses; G 4675.4 = nightmare-2, C 12532 = N3): "unsolved" is a property of solver limits, not of the
  puzzle, which is exactly why a partial proof must stay **unrated**. My report's "0 of 7,800 unsolved, add a guess term"
  (CO report L340-341, C1) was the wrong policy.
- **Wordoku isomorph construction** (four published hard puzzles relabelled into valid Wordoku instances, all
  nightmare-2) is a neat existence proof I did not have.
- **classic6 — disagreement on the conclusion.** Their table (GA report L488-492) counts **old** labels (expert 27/30,
  evil 29/30). Under **their own** formula and ladder the same puzzles are mostly hard/veryHard: classic6-default
  old-evil → `[E:1 H:4 vH:14 X:5 Ev:5 N1:1]`, classic6-free old-evil → `[H:4 vH:12 X:9 Ev:5]`
  (`CO\xreview\out\claims-check.txt`); pooled over 245 old-evil requests: **Ev 11 %, N1 0.8 %** (2 rows, one distinct
  puzzle present in two of their files). The executive summary
  (GA report L24) and the C3 table entry "evil routinely; nightmare as a rare target" (L689) do not follow from their
  data. The one nightmare puzzle (694974463, 24 empties, one depth-1 Nishio) scores 2475.5 — 3 % above their N1 edge —
  and 2499.4 under C, 0.6 below my N1 edge: a boundary case in both systems, not a demonstrated tier. Their narrower
  claim ("6×6 has no low mathematical ceiling") is fine.

### C1 — Universal score

- **Their shape is better than mine; I change my position** (§2.3–2.6, §2.10, §4). On the common corpus G beats C on
  cross-size consistency (mean |log₂ shift| 0.38 vs 0.63), path robustness (0 vs 5 level changes over 85 relabelled
  puzzles), monotonicity (>5 % score drops after one clue removal: 0.4 % vs 1.9 % of 3,983 removals), tier separation
  on classic9 (AUC 1.000 for every adjacent hardest-tier pair vs 0.961–0.998) and placement of the reference puzzles
  (constructed evil stays evil, the famous four are nightmare-2; C pushes constructed evil into N1).
- **The shape does the work, not the new weight table.** G's shape with today's calibrated `COSTS` scores as well as G
  itself (cross-size 0.35, relabelling worst 1.105, monotonicity 2.6 %; §2.10). Their weights are therefore a choice, not
  a finding.
- **Verified properties.** `dS/dP = 1 + 0.25[ln(1+x) − x/(1+x)]/ln 2 > 0` (GA report L576) holds; pure singles on 369
  cells stay below 77 (L563) holds.
- **Omission.** Under both proposals every puzzle on a board larger than 81 cells, at today's clue counts, is at least
  *easy*: `veryEasy` needs `E ≲ 43` absolute empty cells (a Mega12 with ≥ 101 of 144 clues). Their old→new table and C2/C3
  never say that large boards lose `veryEasy`; measured under their ladder in §2.12.
- **Logical gap: "scalable nightmare tiers".** They reject "peak plus bounded workload" because repeated high-end
  deductions "eventually stop differentiating nightmare tiers" (L594), but their own shape has the same property in
  practice: reaching nightmare-3 (5400) needs `0.25·P·log₂(1+W/P) ≥ 5400 − 1700 − 80`, i.e. `W/P ≥ 2^8.5 ≈ 360`
  Nishio-equivalents. No complete proof among more than 10,000 generated, simulated or climbed puzzles exceeds 5,028,
  and in my simulation of their ladder (§2.12) all 61 nightmare-3 requests on 9×9-or-larger boards fail (medians
  3,250–4,245). Tiers above nightmare-2 are nominal until a finer chain taxonomy raises the peak (e.g. Nishio depth).
- **Variant weights.** `ruleOf45 260` sits between `nakedQuad` and `hiddenQuad`; innies/outies is the first technique
  taught after cage combinations. It causes the largest cross-size deviation in their own table (Killer subset-tier
  median +1.38 log₂ above classic9; 0.62–0.73 with 120–145). It changes mid-level labels but not reachability (§2.11,
  §2.12). This is a calibration question for later, not an error.

### C2 — Ladder

- **Agree** with their edges as the companion of their formula: fixtures land well (constructed expert → veryHard 3/3,
  constructed evil → evil 3/3, the famous four → nightmare-2 4/4); `classic-easy-2` → veryEasy (44.7 vs edge 45) is a
  knife-edge miss, exactly as today (73 vs edge 72) and as under C (40 vs edge 40, a knife-edge hit).
- **veryHard placement.** They put one or two wing steps in veryHard and more/harder wings in expert (classic9
  wing-peak: vH 59 % / X 41 %); I had put wings in expert. I accept theirs: it gives `veryHard` a technique meaning and
  keeps `hard = fish` intact (classic9 fish-peak → H 100 %).
- **Ids.** `nightmare`, `nightmare-2` are technically safe (history and cache keys join fields with `|`,
  `G\js\ui\history.js:65-66`, `G\js\ui\cache.js:151-152`; `-` is URL-safe). The only cost is style (camelCase ids
  elsewhere). I can accept either spelling; what matters is to **list only nightmare and nightmare-2 now** (C1 gap above).
- **Names.** They give English only. Proposal for vi: veryHard "Rất khó", nightmare "Ác mộng", nightmare-2 "Ác mộng II".

### C3 — Generation and supported levels

- **Agree** with the direction: score-targeted search, best-so-far return, reversible clue search with state-sensitive
  rejection, Killer cage-structure search, Greater-Than joint sign/given search, support sets that need not be a prefix.
- **Disagree: classic6** "evil routinely" (see B3; the G-ladder simulation in §2.12 gives evil 3/10 and nightmare 0/10).
- **Disagree: the validation protocol is not budgeted.** "At least 500 seeds per candidate supported interval" with
  "≥ 95 % exact and a 95 % lower bound ≥ 90 %" (GA report L710-712) means ~67,000 generations for 15 variants × 9 levels
  before option profiles, and top tiers on large boards take 1–10 s each (§2.12). A sequential rule (40 seeds; accept at
  ≥ 36/40, escalate borderline cells to 100) gives the same decision for clear cases at a tenth of the cost (§5.6).
- **Their maxima agree with mine under their ladder:** nightmare-2 for every 9×9-or-larger variant, classic4 veryEasy.
  For classic6 the observed maximum is one boundary nightmare puzzle; my estimate is evil.
- **Missing: the Killer middle.** With their shape the current generator almost never produces Killer veryHard/expert/evil
  (G-ladder simulation: 2/10, 1/10, 2/10; only 30 of 683 Killer puzzles from all sources fall there), while it reaches
  nightmare (6/10). My cage-move local search fills these bands in seconds (5/10, 5/10, 4/10 at 6 s) — §2.12. Without
  such a search, Killer support would be non-contiguous (…, hard, nightmare).

### C4 — Impact analysis

- **Agree**; their versioning advice (rating/generator/catalogue versions in exports, version in cache identity, legacy
  rating badge) is more complete than mine. To add: the player's text-import name mapping (A5), the nine test suites,
  the `design.md` §14.2 URL promise, and the Summary/Steps tables (§5.7: their formula can keep the table structure with
  an apportioned peak/work split — their C4 row says the table must change shape; it does not have to).

### C5 — Risks and validation

- **Agree.** Additions: (1) Killer middle-level gap (above); (2) N3+ unreachable under the chosen shape; (3) coarse
  technique ids (`nishio` depth 1 vs 2, one `ruleOf45` for 1–4 innies, one `cageCombo` for 2- to 7-cell cages) cap the
  peak and therefore the top tiers — refinement is "later" but it is the only way to make tiers above nightmare-2 real.

---

## 2. Head-to-head on a common corpus

### 2.1 Corpus and method

| Item | Content | Source (read-only) |
|---|---|---|
| Generated puzzles | **9,425** (9,423 with a complete logical proof): my sample A 7,800 (all 15 variants × 6 old levels, levels widened in memory, seed 20261019) + theirs: baseline 670, unsupported 115, high-heldout 390, classic6 default / zero-floor / free 3 × 120, killer-tilt 30, asymmetric9 60 | `CO\data\A-*.jsonl`, `GA\*.jsonl` |
| Local-search results | my 193 climbs (C objective, cage/sign moves) | `CO\data\D-*.jsonl`, `CO\data\I-band-climb.jsonl` |
| Removal pairs | 3,983 single-clue removals (classic9, hyper, jigsaw9, greaterThan, killer, mega16, samurai) | `CO\data\C-mono-*.jsonl` |
| Relabelling | their 40 classic9 × 21 solves + mine 85 puzzles × 11 solves (7 variants, permutation seed 31) | `GA\order-probe.json`, `CO\xreview\relabel.js` |
| Reference puzzles | the 26 entries of `G\tests\fixtures\rated.js`, rated with the engine | `CO\xreview\anchors-h2h.js` |

Both formulas are re-implemented as pure functions of `(E, technique counts)` in `CO\xreview\formulas.js`; G is
checked against three values recorded by gpt-6-astra (499.4, 2475.5, 42.8). Only the cross-size grouping needs a peer
tier for variant techniques: `cageCombo`, `ineqChain` → locked; `ruleOf45`, `cageSplit`, `minMaxForcing` → subset.
Each formula is read on its own ladder unless stated. Scripts and outputs: appendix X1.

### 2.2 Level distribution per variant (requested old level → new level, % of complete proofs)

Selected rows of `CO\xreview\out\h2h-levels.txt` (all 90 rows there):

| variant | old level | n | C ladder | G ladder |
|---|---|---:|---|---|
| classic9 | hard | 210 | H 80, vH 20 | M 2, H 98 |
| classic9 | expert | 210 | vH 30, X 70 | H 24, vH 55, X 21 |
| classic9 | evil | 270 | X 6, Ev 51, N1 39, N2 4 | vH 1, X 17, Ev 69, N1 12 |
| classic6 | expert | 245 | vE 5, E 2, H 84, vH 9 | vE 4, E 2, M 1, H 93 |
| classic6 | evil | 245 | E 1, H 11, vH 31, X 39, Ev 17 | E 1, H 26, vH 43, X 18, Ev 11, N1 1 |
| hyper | medium | 110 | E 70, M 30 | E 70, M 30 |
| diagonalX | evil | 140 | Ev 4, N1 16, N2 70, N3 10 | Ev 9, N1 48, N2 43 |
| greaterThan | veryEasy | 110 | vE 96, E 4 | vE 74, E 26 |
| greaterThan | evil | 135 | X 1, Ev 6, N1 39, N2 52, N3 2 | Ev 6, N1 69, N2 25 |
| killer | medium | 70 | M 100 | E 100 |
| killer | hard | 70 | M 70, H 30 | E 51, M 3, H 46 |
| killer | expert | 70 | M 1, H 51, vH 43, X 4 | E 1, M 1, H 97 |
| killer | evil | 123 | H 1, vH 15, X 11, Ev 29, N1 24, N2 18, N3 2 | H 24, vH 2, X 1, Ev 1, N1 54, N2 20 |
| mega12 | veryEasy | 50 | E 100 | E 100 |
| mega16 | medium | 50 | M 10, H 56, vH 32, X 2 | M 66, H 34 |
| mega16 | evil | 75 | N2 24, N3 76 | N2 100 |
| samurai | hard | 50 | H 34, vH 40, X 24, Ev 2 | H 94, vH 6 |
| samurai | evil | 75 | Ev 7, N1 17, N2 59, N3 17 | Ev 27, N1 29, N2 44 |

Reading: on classic9 both ladders reproduce the old levels up to hard; old expert splits into veryHard/expert under
both (G pushes 24 % of it down to hard: fish-only puzzles that reached old expert by volume). On large boards C lifts the
same old level by one or two new levels (Samurai old hard → vH/X 64 %), G keeps it (H 94 %). Killer is where the two
differ most: G makes old Killer medium *easy* and splits old Killer evil into hard (24 %) or nightmare (74 %) with almost
nothing between; C spreads it over vH…N2.

### 2.3 Cross-size consistency (same hardest tier, different boards)

Median score of each variant divided by the classic9 median for the same hardest tier; 63 variant × tier cells with
n ≥ 10 (`h2h-crosssize.txt`):

| | C | G |
|---|---:|---:|
| mean / max \|log₂ ratio\| | 0.63 / 2.27 | **0.38 / 1.38** |
| mean \|Δ level\| (own ladder) / cells with \|Δ\| ≥ 2 | 0.59 / 3 | **0.52 / 2** |
| fish peak, Mega16 vs classic9 | 735 (X) vs 365 (H): +2 levels | 692 (H) vs 555 (H): 0 |
| wing peak, Samurai vs classic9 | 1349 (Ev) vs 814 (X): +1 | 1354 (X) vs 986 (vH): +1 |
| chain peak, Mega16 vs classic9 | 12130 (N3) vs 2514 (N1): +2 | 4217 (N2) vs 1915 (Ev): +2 |
| subset peak, Killer vs classic9 | 402 (H) vs 132 (M): +1, log₂ 1.61 | 589 (H) vs 227 (M): +1, log₂ 1.38 |

G is clearly more size-consistent. Both still lift chain-peak puzzles on large boards by up to two levels (volume of
chains) and both lift Killer's subset tier by one level (cage volume and, under G, `ruleOf45 = 260`; §2.11).

### 2.4 Volume vs peak

| case (complete proofs) | C | G |
|---|---|---|
| singles only, classic4 / classic6 / classic9 (median E 10 / 24 / 41) | vE / vE / vE 49 %, E 51 % | vE / vE / vE 50 %, E 50 % |
| singles only, every board > 81 cells (E 72–214) | **E 100 %** | **E 100 %** |
| locked peak, Killer (n = 177) | E 40 %, M 60 % | E 100 % |
| locked peak, Butterfly / Flower | M 100 % / M 100 % | E 100 % / E 78 % |
| exactly one wing step, classic6 / classic9 | vH 82 % / vH 81 % | vH 82 % / vH 78 % |
| exactly one fish step, classic6 / classic9 / Samurai | H 98 % / H 100 % / H 100 % | H 100 % / H 100 % / H 100 % |
| chain peak, Samurai (n = 75) | Ev 7, N1 17, N2 59, N3 17 | Ev 27, N1 29, N2 44 |

Both formulas solve the tension the brief asked about in the same way at the bottom (singles volume never exceeds easy)
and for one hard step in a small grid (one wing → veryHard on 6×6 and 9×9 alike). They differ in how much repeated
lower-tier work counts: C turns locked-candidate volume on 144–189-cell boards into *medium* and chain volume into N3;
G keeps both one level lower. **Neither report said explicitly that, at today's clue counts, every board larger than
9×9 loses `veryEasy`** (`veryEasy` requires about E ≤ 43 under either formula).

### 2.5 Monotonicity under clue removal (3,983 single-clue removals)

| | score lowered | lowered by > 5 % | worst | level lowered |
|---|---:|---:|---:|---:|
| today's raw score (no floor) | 3.7 % | 1.8 % | −53 % | – |
| C | 4.4 % | 1.9 % | −55 % | 21 (0.53 %) |
| G | 3.5 % | **0.4 %** | −51 % | **9 (0.23 %)** |

Sources: `mono-h2h.txt`, `candidates.txt`. Greater-Than is the worst variant under both (sign-chain counts are path
dependent: level drops 8 vs 6 of 482).

### 2.6 Robustness to the solver path (digit relabelling)

| probe | C: score varies / level varies / worst max÷min | G |
|---|---|---|
| theirs, 40 classic9 × 21 solves | 6 / 2 / 1.324 | 3 / **0** / 1.097 |
| mine, 85 puzzles × 11 solves (classic9 40, diagonalX 10, hyper 10, mega12 10, samurai 8, sohei 4, mega16 3) | 36 / 5 / 1.413 (mega12) | 26 / **0** / 1.104 |

G's `log₂(1+W/P)` damps the count differences that a different route produces; C's `√n` per technique does not.

### 2.7 Reference puzzles (`G\tests\fixtures\rated.js`)

| group (label) | today | C | G |
|---|---|---|---|
| wikipedia-example, classic-easy (easy) | easy 82, 79 | 43, 42 easy | 47.3, 46.5 easy |
| classic-easy-2 (easy) | easy 73 (edge 72) | 40 easy (edge 40) | **44.7 veryEasy** (edge 45) |
| classic-medium (medium) | easy 85 | 46 easy | 47.8 easy |
| constructed veryEasy ×3 / easy ×3 / medium ×3 / hard ×3 | all match | all match | all match |
| constructed expert ×3 (expert) | expert 1202, 938, 820 | 790 X, 611 X, 535 vH | 940, 909, 879 **vH ×3** |
| constructed evil ×3 (evil) | evil 9279–10252 | 3845–4281 **N1** | 2148–2178 **evil** |
| escargot, worlds-hardest-2012, platinum-blonde, golden-nugget (evil) | evil 26832–37603 | 6936–8007 N2 | 3689–3905 N2 |

Both order the groups correctly. G keeps the constructed evil certificates inside *evil* and leaves a ×1.69 gap up to the
famous four (C ×1.62); C's large gap between constructed evil and expert (×4.87 vs ×2.28) exists because its evil
certificates already score in its nightmare1 band, i.e. C's evil band is too low relative to its own chain costs. The
one-wing "expert" certificates become veryHard under G, which is the intended meaning of the inserted level.

### 2.8 Reachable maximum per variant (complete proofs)

From `h2h-maxima.txt` (generated, simulated and climbed puzzles; climbs maximised C):

| variant | max G (level) | puzzles ≥ G nightmare-2 | max C (level) | puzzles ≥ C N3 |
|---|---|---:|---|---:|
| classic4 | 20.4 vE | 0 | 21 vE | 0 |
| classic6 | 2475.5 N1 (one puzzle) | 0 | 2680 N1 | 0 |
| classic9 | 3746.3 N2 | 4 | 8699 N2 | 0 |
| wordoku | 3663.1 N2 | 3 | 7858 N2 | 0 |
| diagonalX / hyper / jigsaw9 | 4450.7 / 4296.6 / 4539.6 N2 | 81 / 32 / 41 | 14118 / 13459 / 15938 N3 | 30 / 12 / 15 |
| greaterThan | 4258.5 N2 | 54 | 11278 N3 | 14 |
| killer | 5028.3 N2 | 61 | 17916 N3 | 24 |
| mega12 / mega16 | 4300.3 / 4825.0 N2 | 25 / 79 | 13739 / 18587 N3 | 6 / 60 |
| butterfly / flower / sohei / samurai | 4272.6 / 4657.1 / 4565.5 / 4547.4 N2 | 24 / 44 / 26 / 39 | 12628–18176 N3 | 6–16 |

Under C, nightmare3 (≥ 10,000) is populated almost only by large boards and diagonal/Killer puzzles with tens of chain
steps — "tedium" ranked above Escargot (6,936). Under G nothing reaches 5,400 (nightmare-3), and the famous four sit
inside the top populated tier. This is the property I now consider decisive for the top of the ladder.

### 2.9 Incomplete proofs

Two of 9,425 generated puzzles have no complete proof, both Killer old-evil requests at zero givens from their runs:
3203566290 `{cageCombo 5, ruleOf45 3, nishio 7}` → C 3133 (N1), G 3071.2 (N1); 3220343909 (`cageSize 2`)
`{cageCombo 9, ruleOf45 2, nishio 44}` → C 7584 (N2), G 4094.6 (N2). **Both formulas would award a nightmare tier to a
partial proof**; my proposed "guess" term would even push the first to N3. The policy must be: no complete proof ⇒ no
score band ("unrated"), never a generator hit (their position, GA report L30). My own data contained none (0 of 7,800
sample-A puzzles, 0 of 193 climbs, 0 of 1,505 simulations; `CO\xreview\out\unsolved-check.txt`), which is consistent
with a rate of about 2 in 125 pooled Killer evil requests.

### 2.10 What does the work in their proposal: shape or weights? And the closest additive variant

`CO\xreview\candidates.js` scores the same corpus with seven formulas (all inputs: E and technique counts only) and
fits each a ladder by matching the classic9 quantiles of the G edges, so classic9 levels are identical by construction
and the other variants show the differences (`candidates.txt`):

| formula | cross-size mean / max \|log₂\| | removals lowering > 5 % | relabel p90 / worst ratio | classic9 tier AUC (fish>subset, wing>fish, chain>wing) | puzzles ≥ famous-min | max level (fitted ladder) |
|---|---|---:|---|---|---:|---|
| today's raw, no floor | 0.97 / 3.58 | 1.8 % | 1.076 / 1.648 | .995 / .955 / .961 | 358 | N3 everywhere ≥ 9×9 |
| **C** (mine) | 0.63 / 2.27 | 1.9 % | 1.079 / 1.413 | .998 / .974 / .961 | 462 | N3 on 11 variants |
| **G** (theirs) | 0.38 / 1.38 | 0.4 % | 1.013 / 1.104 | **1 / 1 / 1** | 359 | **N2** (classic6 N1) |
| G shape + today's `COSTS` (+ my variant costs) | **0.35 / 1.29** | 0.5 % | 1.013 / 1.105 | 1 / 1 / .997 | 353 | N2 (classic6 N1) |
| G weights, `√n` per technique, V(E) | 0.68 / 2.35 | 1.9 % | 1.073 / 1.392 | .988 / .927 / .966 | 489 | N3 on 11 variants |
| PW = V(E) + P + 0.25·Σ w_t·log₂(1+n_t) (G weights) | 0.42 / 1.54 | 1.2 % | 1.042 / 1.217 | 1 / 1 / .995 | 553 | N3 on 8 variants |
| PW with today's `COSTS` | 0.37 / 1.40 | 1.1 % | 1.046 / 1.227 | 1 / 1 / .989 | 527 | N3 on 6 variants |

Conclusions:

1. **The shape (peak + logarithm of the total work + bounded empty term) is what wins.** Swapping their weight table
   for today's calibrated `COSTS` changes nothing material; swapping their shape for per-technique `√n` (with their
   weights) loses everything. So the weight-table debate (headline 2) is secondary.
2. **The closest additive variant is PW**: `S = V(E) + P + 0.25·Σ_t w_t·log₂(1+n_t)`. It can be shown as one row per
   technique (`0.25·w·log₂(1+n)`, plus `w` once on the hardest technique's row) and an empty-cells row. For
   single-technique puzzles it equals G; with several techniques it adds breadth more generously. It is a little worse
   than G on every metric (robustness p90 1.04 vs 1.01, monotonicity, more puzzles above the famous four, N3 again
   reachable on 6–8 variants). Since additivity is only a tie-breaker and G's total can still be displayed in the
   existing table by apportionment (§5.7), I prefer G.

### 2.11 Killer / Greater-Than weights (the only weights in substantive dispute)

`CO\xreview\variant-weights.js`, G shape and ladder, Killer and Greater-Than puzzles of both corpora (`variant-weights.txt`):

| weights | Killer old hard | Killer old expert | Killer subset-tier log₂ vs classic9 | GT old veryEasy | GT old expert |
|---|---|---|---:|---|---|
| G as proposed (`ruleOf45 260, cageSplit 520, ineqChain 40, minMax 180`) | E 51, M 3, H 46 | H 97 | 1.38 | vE 74, E 26 | M 9, H 43, vH 11, X 37 |
| `ineqChain 10` | – | – | – | vE 74, E 26 | M 11, H 42, vH 34, X 14 |
| `ruleOf45 145` | E 51, M 47, H 1 | M 61, H 37 | 0.73 | – | – |
| peer set (`ruleOf45 120, cageSplit 320, ineqChain 20, minMax 145`) | E 51, M 47, H 1 | M 61, H 37 | 0.62 | vE 74, E 26 | M 11, H 42, vH 26, X 21 |

- The Greater-Than *veryEasy → easy* shift (26 %) is not specific to `ineqChain = 40`, as I suggested earlier in this
  phase: 10 and 20 give the same 26 %. The `veryEasy` band only has room for singles (and E ≲ 43), so any sign step
  weighted like a locked candidate moves the puzzle to *easy*; only today's much smaller scale (`ineqChain 5`,
  `pointing 7`, the "G shape + today's COSTS" run of §2.10) keeps 91 % of them veryEasy.
- `ruleOf45` decides whether old Killer hard/expert puzzles are *medium* or *hard* and halves the Killer cross-size
  deviation when lowered to the pair level. I still think 260 (quad level) over-rates innies/outies, but this is a human
  calibration question; it does not change any reachability result (§2.12, peer-weight run).

### 2.12 Generation under their ladder (new simulation, current digger) and targeted local search

`CO\xreview\simulate-g.js` patches `SG.difficulty` **in memory** (as my Phase-1 `simulate.js` did for my proposal): their
score and ladder (nightmare-3 as open top band), allowed techniques `{t : w_t < band max}` (exact, because `S > w_t` for
every used technique), the technique oracle — complete proof required — at **every** level including the top ones,
clue floors/symmetry/cage profile of the nearest old level, `maxAttempts` 8 (3–4 for large boards), seed 7. The existing
guided dig then maximises their score below the band maximum. 872 requests; **0 outputs without a complete proof** (the
technique oracle at the top prevents them by construction). `CO\xreview\climb-g.js` is my Phase-1 local search
(clue remove/swap; Killer cage merge and boundary moves) with their score as objective. Full table:
`CO\xreview\out\sim-g-summary.md`.

| variant (requests per cell) | vE | E | M | H | vH | X | Ev | N1 | N2 | N3 |
|---|---|---|---|---|---|---|---|---|---|---|
| classic4 (10) | 10 | 0 | 0 | 0 | | | | | | |
| classic6 (10) | 10 | 0 | 1 | 9 | 5 | 6 | 3 | 0 | 0 | 0 |
| classic9 (10) | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 (0.6 s) | 0 | 0 |
| wordoku (10) | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 (0.8 s) | 0 | 0 |
| greaterThan (10) | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 10 (0.4 s) | 0 |
| killer (10) | 10 | 10 | 10 | 10 | **2** | **1** | **2** | 6 (0.8 s) | 2 (2.1 s) | 0 |
| killer, peer weights (10) | | | | | 2 | 0 | 2 | 6 | 2 | |
| diagonalX / hyper / jigsaw9 (5 each) | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 (0.3–0.8 s) | 0 |
| mega12 / butterfly (3 each) | **0** | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 (2.4 / 4.0 s) | 0 |
| samurai / sohei / flower (2 each) | **0** | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 (10.2 / 2.2 / 8.2 s) | |
| mega16 (2) | **0** | 2 | 2 | 2 | 2 | 2 | 2 (20 s) | 2 (**124 s**) | 2 (**150 s**) | |

Targeted local search (`climb-g.js`, budget per start):

| target | starts | hits | budget |
|---|---|---:|---:|
| classic9 nightmare-2 [3600, ∞) from old-evil puzzles | 10 | 3 | 4 s |
| wordoku nightmare-2 | 8 | 4 | 4 s |
| classic6 evil [1500, 2400) | 20 | 9 | 2 s |
| Killer veryHard [700, 1000) from old-expert puzzles, cage moves | 10 | 5 | 6 s |
| Killer expert [1000, 1500) | 10 | 5 | 6 s |
| Killer evil [1500, 2400) | 10 | 4 | 6 s |

Findings (cells of 2–10 requests are indicative only; the support decision needs §5.6):

1. With their score as the objective, **today's digger already reaches easy … nightmare-2** on diagonalX, hyper, jigsaw9,
   greaterThan and every large board, and easy … nightmare on classic9 and wordoku. The old caps are policy.
2. **`veryEasy` fails on every board larger than 9×9** (Stage A digs to the clue floor first; score 54–69 against an edge
   of 45). Fix: test the band's upper edge in Stage A as well (§5.5), or hide `veryEasy` there.
3. **Killer's middle is a search gap**: veryHard/expert/evil 2/1/2 of 10 with either weight set, but 5/5/4 of 10 with
   6 s of cage-move local search.
4. **classic9 / wordoku nightmare-2** need local search (3/10, 4/8 at 4 s); **classic6** is non-contiguous (easy 0,
   medium 1, nightmare 0 of 10) and its evil needs search (3/10 → 9/20).
5. **Time is the limit on Mega16** (nightmare 124 s, nightmare-2 150 s median, above a 120 s worker budget) and is
   noticeable on Samurai/Flower nightmare-2 (8–10 s).
6. **nightmare-3: 0 of 61** requests on 9×9-or-larger boards (medians 3,250–4,245); highest score in all simulations and
   climbs of this phase 4,469.


---

## 3. Errors found

### 3.1 In gpt-6-astra's report

| # | Claim | Finding | Evidence |
|---|---|---|---|
| 1 | classic6: "evil routinely; nightmare as a rare target" (GA report L689; also L24) | Conflates old labels with their new ladder. Under their own formula, old-evil classic6 requests give evil 5/30 (default) and 5/30 (free); pooled 245 requests: evil-or-above 11 % (28 rows, 21 distinct seeds — their default and zero-floor runs share seeds and often yield the same puzzle). The only nightmare is one distinct puzzle (694974463, present in two of their files) 75 points above the edge. My score-targeted simulation of their ladder: evil 3/10, nightmare 0/10. | `claims-check.txt`, §2.12 |
| 2 | Large boards (C1 size behaviour) | Omitted that every board larger than 9×9 loses `veryEasy` at today's clue counts (100 % *easy*, §2.4); measured under their ladder: Mega12, Butterfly, Samurai, Sohei, Flower, Mega16 `veryEasy` 0 hits (§2.12). Needs a digger change or hiding. | `h2h-volume-peak.txt`, `sim-g-summary.md` |
| 3 | "Scalable" nightmare tiers via the ×1.5 rule (L594, L634-641) | Their shape compresses volume so strongly that nightmare-3 needs ≈ 360 Nishio-equivalents; nothing in more than 10,000 puzzles reaches 5,400, and 0 of 61 simulated nightmare-3 requests on 9×9-or-larger boards succeed. The rule defines ids no generator can fill. | §2.8, §2.12 |
| 4 | "All ten sampled hyper medium outputs rescore as easy" (L439) | 70 % on the pooled 110; a small-sample statement presented without its interval. | `h2h-levels.txt` |
| 5 | Killer reaches high tiers (C3 table) | True for nightmare; not discussed that their shape leaves Killer's veryHard/expert/evil almost empty with today's generator (2/10, 1/10, 2/10), i.e. a non-contiguous Killer ladder unless a layout search is added. | §2.12 |
| 6 | Validation protocol (L710-712) | Sound statistics, but ≈ 67,000 generations before option profiles; not budgeted against measured generation times. | §2.12 timings |
| 7 | C4 "the new score is nonlinear, so technique rows should show … a separate peak, diminished work, and empty workload breakdown, not falsely additive old per-technique points" (L730) | Over-states the UI impact: their total can be apportioned exactly over the existing rows (peak row carries `P`, `R` is shared in proportion to `w_t·n_t`), so the table keeps its structure (§5.7). | – |

No arithmetic or code-citation errors were found in the parts I re-checked (all ✔ items in §1, their worked examples,
their recorded G values).

### 3.2 In my report (exposed by theirs or by this head-to-head)

| # | My claim / choice | Correction |
|---|---|---|
| 1 | Unsolved puzzles: "0 of 7,800 … without a floor they need a score-based rule" and a terminal "guess" term `2240·√cells left` (CO report L340-341, C1) | Wrong policy. Unsolved outputs exist (2 of ~125 pooled Killer evil requests); a partial proof must be **unrated** and never a generator hit. A guess term would label a solver failure nightmare3. |
| 2 | Formula `Σ c_t·√n_t + 5·√E` | Worse than G on size consistency (0.63 vs 0.38), path robustness (5 vs 0 level changes), monotonicity (>5 % drops 1.9 % vs 0.4 %) and the top end (N3 filled by chain volume on big boards, above Escargot). Withdrawn in favour of G's shape (§4). |
| 3 | Ladder edge evil/nightmare1 at 2500 with evil from 1000 | Puts the three constructed evil certificates in nightmare1 (3845–4281); with G's shape and edges they stay evil. |
| 4 | "classic6 cannot produce easy/medium" (CO report L703; "easy/medium ≤ 15 %: hide", L642) | Too strong: 16–19 % of pooled classic6 old-medium/old-hard requests score *easy* and 2–4 % *medium* under my formula (20–27 % and 4–5 % under G). They are rare outputs of today's score-targeted digger (0/10 and 1/10 in §2.12), not absent from the puzzle space. Hiding them is a measured support decision, not a ceiling. |
| 5 | Not reported | Jigsaw/Wordoku structure fixed per pipeline call; budget errors discard the best-so-far; hits do not require `solved`; `sg.lastConfig.v1`; floor flattens the guided objective (ties). |
| 6 | Earlier in this phase I attributed Greater-Than *veryEasy → easy* under G to `ineqChain = 40` | Only partly: 10, 20 and 40 all give the same 26 % (§2.11); the cause is the narrow veryEasy band, which any locked-level step leaves. |

---

## 4. Revised positions on the eight headline differences

| # | Topic | My Phase-1 position | Revised position | Why |
|---|---|---|---|---|
| 1 | Formula shape | `Σ c_t√n_t + 5√E` | **Change → G's shape** `80E/(E+40) + P + 0.25·P·log₂(1+W/P)`; incomplete proof ⇒ unrated | Better on every invariant measured (§2.3–2.6, §2.10), monotone in its inputs (their derivation verified), top end anchored on the famous puzzles. The closest additive form (PW) is a fallback only if exact per-row independence is required. |
| 2 | Weights | today's `COSTS` + variant costs 7/63/160/5/70 | **Merge → adopt their table** for implementation now; keep two flagged items: `ruleOf45` (260 vs my 120–145) and `cageSplit` (520 vs my 320–420) are the first human-calibration targets | The shape, not the table, carries the gains (G with today's `COSTS` is as good, §2.10); their table is designed for the shape, gives round band edges and is the one my simulations validated. The Killer weights change mid labels, not reachability (§2.11–2.12). |
| 3 | Ladder & ids | 0/40/100/240/420/600/1000/2500/5000/10000, ids `nightmare1..3` | **Change → their edges 0/45/180/400/700/1000/1500/2400/3600**, but **only two nightmare tiers now** (`nightmare` [2400,3600), `nightmare-2` [3600,∞)); ids as theirs (`nightmare`, `nightmare-2`) or `nightmare2` — either works technically | Fixture placement (§2.7), wing → veryHard semantics, and N3+ being unreachable under this shape (§2.8, §2.12). |
| 4 | classic6 ceiling | expert; "cannot produce easy/medium" | **Merge**: evil is reachable but not routine (simulation 3/10; with local search 9/20 in 2 s); nightmare not supported (one boundary puzzle in ≈ 1,700); easy/medium rare (0/10, 1/10) → measure, expect them hidden; support is non-contiguous | Both reports over-stated: I under-stated reachability of evil and the existence of easy/medium puzzles, they over-stated evil and nightmare. |
| 5 | Killer | cage-layout local search | **Merge**: (a) incomplete proof = unrated (concede); (b) cage-size profile tilt for the top tiers (their evidence); (c) cage merge/boundary local search for veryHard/expert/evil (my evidence: 5/10, 5/10, 4/10 at 6 s where the plain digger gives 2/10, 1/10, 2/10) | Under G's shape the Killer middle is a search problem, not an empty band (30 of 683 Killer puzzles from all sources already sit there). |
| 6 | Large boards | lose veryEasy; rise ≈ 1 level for the same peak | **Keep, corrected for G**: both proposals lose `veryEasy` at today's clue counts; under G, same-peak puzzles on large boards rise at most one level except chain volume (+2 on Mega16/Flower). Fix: apply the band's upper edge in Stage A so `veryEasy` (E ≲ 43) stays reachable, or hide it | §2.3, §2.4, §2.12. |
| 7 | Floor-removal numbers | 45 % Samurai, 33 % Sohei, 1.4 % classic9 level drops | **Keep — consistent** with their 45/670 and 10/10 Samurai hard; their 2 → 35 samples measurement is the better search-cost evidence | §1 B1. |
| 8 | Max level per variant | nightmare3 for most | **Change → nightmare-2 for every 9×9-or-larger variant** (reliably with today's digger for diagonalX, hyper, jigsaw9, greaterThan and the large boards; classic9, wordoku and Killer need the local search; Mega16 is time-bound), classic6 evil (search), classic4 veryEasy | §2.8, §2.12. |

---

## 5. The converged proposal I would sign (implementable now)

Everything below uses only the inputs allowed by the brief (empty cells and technique counts), has no level-dependent
term, and was exercised end to end in §2.12 except where marked *later*.

### 5.1 Score

```text
complete proof required (rating.solved === true)
E   = cells empty at the start                       (rating.empties)
n_t = uses of technique t                            (rating.techniqueCounts)
w_t = weight of t (5.2)
P   = max { w_t : n_t > 0 }        (0 if no technique was needed)
W   = Σ_t w_t · n_t
V   = 80 · E / (E + 40)
R   = 0.25 · P · log₂(1 + W / P)   (0 if P = 0)
score = round(10 · (V + P + R)) / 10        level = highest level whose lower edge ≤ score
```

No floor, no `cellCount/81` scaling, no variant or level input. `rawScore` becomes equal to `score` (field kept for
format compatibility). `hardestTechnique` becomes the technique that provides `P` (ties: the later one in solver
order), so the "hardest" shown and the score agree; today's tier-first rule (`difficulty.js:415-418`) goes.

### 5.2 Weights (their table)

| family | weights |
|---|---|
| singles | nakedSingle 1, hiddenSingleBox 1.25, hiddenSingleLine 1.5 |
| locked | pointing 40, boxLine 50 |
| subsets | nakedPair 120, hiddenPair 145, nakedTriple 180, hiddenTriple 220, nakedQuad 260, hiddenQuad 300 |
| fish / colouring | xWing 320, simpleColouring 360, swordfish 420, jellyfish 520 |
| wings / uniqueness | xyWing 650, xyzWing 750, wWing 850, uniqueRectangle 900 |
| chains / trial | forcingChain 1100, nishio 1700 |
| Killer | cageCombo 40, ruleOf45 260 *(I would use 145; later)*, cageSplit 520 *(I would use 420; later)* |
| Greater-Than | ineqChain 40, minMaxForcing 180 |

They replace `COSTS` and the `baseCost` fallback in rating; the solver's internal raw score is untouched.

### 5.3 Ladder, ids and names

| id | en | vi | band | typical hardest technique on classic9 (measured) |
|---|---|---|---|---|
| veryEasy | Very easy | Rất dễ | [0, 45) | singles, ≥ 37 clues |
| easy | Easy | Dễ | [45, 180) | singles with fewer clues, locked candidates |
| medium | Medium | Trung bình | [180, 400) | subsets |
| hard | Hard | Khó | [400, 700) | fish / simple colouring (100 % of fish-peak puzzles) |
| **veryHard** (new) | Very hard | Rất khó | [700, 1000) | one or two wings (59 % of wing-peak puzzles) |
| expert | Expert | Chuyên gia | [1000, 1500) | several wings (41 %), short chains |
| evil | Evil | Địa ngục | [1500, 2400) | forcing chains, a Nishio step (82 % of chain-peak puzzles) |
| **nightmare** (new) | Nightmare | Ác mộng | [2400, 3600) | many chains and Nishio steps |
| **nightmare-2** (new) | Nightmare II | Ác mộng II | [3600, ∞) | level of the published hardest puzzles (Escargot, Golden Nugget …) |

Further tiers (`nightmare-3` = [5400, 8100) by their ×1.5 rule) are *later*: unreachable under this shape until the
technique taxonomy can raise the peak. `confidence` keeps its definition on the new bands.

### 5.4 Incomplete proofs

The generator never returns a puzzle without a complete proof: a hit requires `rating.solved` (today it does not,
`digger.js:1129`), unsolved samples rank after every solved one in the closest-sample fallback, and the top levels use
the technique oracle (5.5) so such samples do not arise (0 of 872 in §2.12). `classify` keeps its shape and its
`solved` flag; no new UI state is needed because the UI only shows generator results and easier replay positions.

### 5.5 Generation changes

1. `spec(level)`: band from 5.3; allowed techniques `{ t : w_t < band max }` (all at the top band); the technique
   oracle (complete proof, `assumeUniqueness: false`) at **every** level — the DFS-uniqueness "stuck" objective for evil
   (`digger.js:685-703`) is what produces incomplete proofs and is retired; clue floors as today, mapped
   veryHard → hard, nightmare/nightmare-2 → evil (as simulated). `BASE_GROUPS` stops defining levels.
2. Score-targeted (guided) dig at every level, with the band's upper-edge test applied in Stage A too (one `classify` per
   accepted removal) so `veryEasy` (E ≲ 43) is reachable on boards larger than 9×9.
3. A local-search phase after the dig samples of an attempt when no exact sample exists: remove a clue or swap it for
   another solution cell; Killer: merge two adjacent cages or move a boundary cell (cages stay connected, digit-distinct,
   ≥ 2 cells); Greater-Than: remove a sign; accept if unique, score not lower and below the band maximum; stop at the band
   minimum. Measured budgets: 2 s (classic6 evil), 4 s (classic9/wordoku nightmare-2), 6 s (Killer middle).
4. Killer top tiers: shift the cage-size shares toward small cages (their `cageSize: 2` result).
5. Budget exhaustion returns the best sample so far with the existing `difficulty.approximate` warning instead of an
   error (user cancellation still aborts).
6. Greater-Than's "too hard → reveal" loop keeps its logic on the new levels.

### 5.6 How `difficultySupport` is measured

Offline, with a soak-like tool, per variant (default options and symmetry) × level: 40 fixed seeds under the production
budget; a hit is exact level ∧ complete proof ∧ unique. Supported if ≥ 36/40 and p95 time ≤ budget; 30–35/40 → 60 more
seeds, supported if ≥ 90/100. The result is written into each variant's static `difficultySupport` (non-prefix lists
allowed) and re-measured whenever weights, edges or the generator change. Expected outcome from §2.12 (to confirm):

| variant | expected support |
|---|---|
| classic4 | veryEasy |
| classic6 | veryEasy, hard, veryHard?, expert?, evil? (with local search); easy, medium, nightmare hidden |
| classic9, wordoku | veryEasy … nightmare; nightmare-2 only if local search reaches 90 % within budget |
| diagonalX, hyper, jigsaw9, greaterThan | veryEasy … nightmare-2 |
| killer | veryEasy … hard, nightmare; veryHard, expert, evil, nightmare-2 with cage-move search |
| mega12, butterfly, samurai, sohei, flower | easy … nightmare-2; veryEasy with the Stage-A test |
| mega16 | easy … evil; veryEasy with the Stage-A test; nightmare, nightmare-2 only with a budget > 2.5 min |

### 5.7 UI, display and behaviour changes to report to the user

1. **Difficulty Score table (Summary and Generation Steps)** — same structure: one row per technique (uses, points,
   total), an "Empty cells" row, Total = score. Changes: the "Bonus points for difficult techniques" row and its help
   text disappear (en/vi; row `result-view.js:362`, `step-view.js:374-376`; strings `result-view.js:553-556,589-592`,
   `step-view.js:516-519,544-547`); "Points" shows the new
   weights; a technique row's total is `R·w_t·n_t/W`, plus `P` on the hardest technique's row (exact apportionment, the
   existing `roundToTotal` keeps integer parts summing to the score); the empty-cells row shows `V` (its per-cell
   "points" becomes `V/E`); the note "The first use of a technique counts 1.5 times" and the empty-cells description
   ("Every cell … adds {points} points") get new wording. If the user prefers each row to be computable on its own, the
   additive PW form (§2.10) fits the old wording better at a small cost in robustness.
2. **Help**: scoring section (`help.js:681`, multiplier/bonus; text `help.js:1205`) and the ladder table
   (`help.js:268-305`, one technique group per level, scaled bands) are rewritten; same layout.
3. **Level picker**: gains `veryHard`, `nightmare`, `nightmare-2` where supported; per-variant lists change (classic4
   loses easy; classic6 loses easy and gains hard … expert/evil; Killer, Greater-Than, Wordoku and the large boards gain
   evil and nightmare tiers; lists may be non-contiguous). Level descriptions (en/vi) are new for the three ids and
   reworded for expert/evil.
4. **Scores and labels**: every score changes scale (puzzles labelled evil today score 1,500–37,600, famous fixtures
   included; under the new formula the same classic9 puzzles score below ≈ 3,900 and spread over veryHard …
   nightmare-2); the same puzzle can change level (old expert → veryHard; old Samurai hard stays hard but loses its floor
   points; old Killer medium → easy).
5. **History, URLs, cache**: format unchanged; old entries keep their old score/level; an old URL or history entry
   regenerates a **different** puzzle (breaks `design.md` §14.2 across versions); the pre-generated cache must be
   invalidated (schema bump) and the pre-generation cost table extended, otherwise new levels are never pre-generated.
6. **Export / exchange**: same v1 fields (`rawScore = score`); recommended additive field `ratingVersion`.
7. **Player**: `LEVELS` (`P\js\ui\importer.js:70`) and its locales (names, also used by text import) gain the three ids;
   without that an old player imports the puzzle but drops its difficulty. No gameplay change.
8. **Generation time**: top tiers take longer (classic9 nightmare ≈ 0.6 s median; large-board nightmare-2 2–10 s;
   Mega16 nightmare minutes) and the "closest puzzle found" notice may appear more often near budget limits.
9. **Symmetry warning** (`controls.js:43`, from `expert`): unchanged rule; it will also cover the nightmare tiers.

### 5.8 Later (needs human calibration or new technique ids)

Blinded human calibration of weights and edges; the Killer weights (`ruleOf45`, `cageSplit`); Nishio depth and chain
length as separate technique ids (the only route to real tiers above nightmare-2); cage-technique subtypes (number of
innies, cage size); a proof portfolio (minimum score over solver strategies) for further path robustness; per-option
support profiles (Killer `cageSize`, Greater-Than scope, Jigsaw shapes, symmetries).

---

## Appendix X — Experiments of this phase (all under `CO\xreview\`)

All scripts load the generator read-only through `CO\engine.js` (the `tests/node-runner.js` file list, run with
`vm.runInThisContext`), read gpt-6-astra's files read-only, and write only to `CO\xreview\out\`. Run from `CO\`.

### X1. Scripts, inputs, outputs

| script | what it does | output |
|---|---|---|
| `formulas.js` | both proposals as pure functions of (E, counts); both ladders; self-test against 3 values recorded by gpt-6-astra | – |
| `corpus.js` | loads the common corpus (my `data\A-*`, `D-*`, `I-*`, `G-sim*`; their baseline, unsupported, high-heldout, classic6-*, killer-tilt, asymmetric9, nofloor) | – |
| `h2h.js` | level distributions, cross-size, volume vs peak, maxima | `out\h2h-corpus.txt`, `h2h-levels.txt`, `h2h-crosssize.txt`, `h2h-volume-peak.txt`, `h2h-maxima.txt` |
| `mono-h2h.js` | 3,983 single-clue removals under both formulas | `out\mono-h2h.txt` |
| `relabel.js` | their 40×21 relabelling probe re-scored; new probe 85 puzzles × 11 solves, permutation seed 31 | `out\relabel.txt`, `out\relabel-solves.json` |
| `anchors-h2h.js` | the 26 rated fixtures under both | `out\anchors-h2h.txt` |
| `claims-check.js` | their classic6 / Killer claims re-labelled with both | `out\claims-check.txt` |
| `unsolved-check.js` | incomplete proofs in my Phase-1 data | `out\unsolved-check.txt` |
| `killer-unsolved.js` | seeds 3203566290 and 3220343909 regenerated, re-solved with Nishio depth 3 / chain 24 | `out\killer-unsolved.txt` |
| `candidates.js` | seven formulas on invariant metrics + quantile-fitted ladders | `out\candidates.txt` |
| `variant-weights.js` | sensitivity of G to Killer/Greater-Than weights | `out\variant-weights.txt` |
| `killer-g-levels.js` | G levels of every Killer puzzle by source | `out\killer-g-levels.txt` |
| `simulate-g.js` | in-memory simulation of their score + ladder with today's digger | `out\sim-g*.jsonl`, `out\sim-g-run*.log` |
| `climb-g.js` | my Phase-1 local search with their score as objective | `out\climb-g*.jsonl`, `out\climb-g*.log` |
| `sim-g-summary.js` | hit table of the simulations and climbs | `out\sim-g-summary.md` |

### X2. Commands, sample sizes, seeds

```text
node xreview/h2h.js                                   # 9,425 generated puzzles; 193 climbs; 1,505 simulations (C ladder)
node xreview/mono-h2h.js > xreview/out/mono-h2h.txt   # 3,983 removal pairs
node xreview/relabel.js > xreview/out/relabel.txt     # 40×21 (theirs) + 85×11 solves, permutation seed 31
node xreview/anchors-h2h.js > xreview/out/anchors-h2h.txt
node xreview/claims-check.js > xreview/out/claims-check.txt
node xreview/unsolved-check.js > xreview/out/unsolved-check.txt
node xreview/killer-unsolved.js > xreview/out/killer-unsolved.txt
node xreview/candidates.js > xreview/out/candidates.txt
node xreview/variant-weights.js > xreview/out/variant-weights.txt
node xreview/simulate-g.js --variants=classic9,classic6 --levels=all --n=10 --seed=7 --out=xreview/out/sim-g.jsonl
node xreview/simulate-g.js --variants=classic4 --levels=veryEasy,easy,medium,hard --n=10 --seed=7 --out=xreview/out/sim-g.jsonl
node xreview/simulate-g.js --variants=killer --levels=all --n=10 --seed=7 --out=xreview/out/sim-g.jsonl
node xreview/simulate-g.js --variants=killer --levels=veryHard,expert,evil,nightmare,nightmare-2 --n=10 --seed=7 --weights=peer --out=xreview/out/sim-g-peer.jsonl
node xreview/simulate-g.js --variants=greaterThan,wordoku --levels=all --n=10 --seed=7 --out=xreview/out/sim-g-4.jsonl
node xreview/simulate-g.js --variants=hyper,jigsaw9,diagonalX --levels=all --n=5 --seed=7 --out=xreview/out/sim-g-4.jsonl
node xreview/simulate-g.js --variants=mega12,butterfly --levels=all --n=3 --seed=7 --max-attempts=4 --out=xreview/out/sim-g-5.jsonl
node xreview/simulate-g.js --variants=<samurai|sohei|flower|mega16> --levels=veryEasy,…,nightmare-2 --n=2 --seed=7 --max-attempts=3 --out=xreview/out/sim-g-6.jsonl   # one process per variant
node xreview/climb-g.js --in=data/A-killer.jsonl --variant=killer --level=expert --n=10 --budget-ms=6000 --lo=700 --hi=1000 --out=xreview/out/climb-g.jsonl
#   same with --skip=10 --lo=1000 --hi=1500 and --skip=20 --lo=1500 --hi=2400
node xreview/climb-g.js --in=data/A-classic9.jsonl --variant=classic9 --level=evil --n=10 --budget-ms=4000 --lo=3600 --out=xreview/out/climb-g-n2.jsonl
node xreview/climb-g.js --in=data/A-9x9variants.jsonl --variant=wordoku --level=evil --n=8 --budget-ms=4000 --lo=3600 --out=xreview/out/climb-g-n2.jsonl
node xreview/climb-g.js --in=data/A-classic46.jsonl --variant=classic6 --level=evil --n=20 --budget-ms=2000 --lo=1500 --hi=2400 --out=xreview/out/climb-g-n2.jsonl
node xreview/killer-g-levels.js > xreview/out/killer-g-levels.txt
node xreview/sim-g-summary.js > xreview/out/sim-g-summary.md
```

Seeds: simulations derive each request's seed with `seedFor(7, variant:level:k)` (FNV-1a, as `tests/soak.js`); climbs
start from the puzzles of my sample A (seed 20261019) with move seed 11. Longest single process: the Mega16 simulation
(≈ 10 min); everything else ≤ 6 min. Two processes at most ran concurrently.

### X3. Raw results summarised

- Corpus: 9,425 generated, 9,423 complete proofs; unsolved: Killer 3203566290 and 3220343909 (`h2h-corpus.txt`).
- Simulation of their ladder: 872 requests, 0 incomplete proofs, highest score 4,469 (`sim-g-summary.md`).
- Climbs with their objective: 78 starts, highest score 3,721.7; hit counts in §2.12.
- Highest complete-proof score under their formula anywhere in my data: 5,028.3 (a Killer climb of Phase 1).

### X4. Repository integrity

`git status --short` in the sudoku-generator and in the sudoku-player repository were
run after writing this review; both printed nothing (clean). Nothing in gpt-6-astra's folder was modified.
