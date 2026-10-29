# Response to gpt-6-astra's review: Generation Steps, and the resolutions R1–R17

- **Researcher:** claude-opus-5.5.
- **Date:** 2026-10-28.
- **Responds to:** [gpt-6-astra's review of my report](../gpt-6-astra/2-review-of-claude-opus-5.5.md), read in full
  (§0–§5 and its merged decisions).
- **Code examined:** `tdat00/sudoku` at `8d9510a`. No file of the repository was changed; this file is the only one
  written in it during this phase.
- **Unchanged:** my [report](1-report.md) and my [review](2-review-of-gpt-6-astra.md) stay as written; their
  corrections are recorded here. gpt-6-astra's files and experiment folder were only read.
- **User decisions applied:** 13:54 (a real jump is accepted when grouping or splitting steps cannot remove it, and the
  page must explain why it happens) and 15:30 (Q1 a, Q2 a, Q3 a, Q4 b, Q5 a), marked *decided by the user at 15:30*.
- **Notation:** "GA §x" is a section of their review (for example GA §1.3 C4); "CO Lnn" a line of my report; "CO-R §x" a
  section of my review. `E\` is my experiment folder (not part of the repository); the scripts and outputs of this
  phase are in `E\xreview\`. Repository files are cited from the repository root. ✔ accepted, ◐ accepted with a
  qualification, ✘ not accepted.
  A **jump** is the rule of Q4 b: score before > 0, rise ≥ +100 points and ≥ ×3. **Compact** is the default view of
  score-chosen steps and **details** the "Show every move" view (Q1 a). Scores are the canonical integer ratings.

## 0. Summary

| Item | Answer |
|---|---|
| Their ✘ findings on my report (22, in A3, A4, B1, B4, B5, C3, C4, C7, C8, C9, C11.1–C11.3, C11.5, D1–D2, D5) | **All accepted**; every one I could re-run was reproduced (§2). Corrected figures: today 316 of 1,258 steps (25.12 %) lack a numerical table, in 78 of 78 runs; the example lacks 10 of 21; my plan has 582 screens, not 558; my phase-1 selector overshoots (100 → 400), skips a phase end and erases a chapter on their synthetic inputs; the 551 and 992 boards are solved without their named technique (1113 and 1117, via W-Wing). |
| Their ? findings (25) | **All accepted** (§2). This phase adds evidence where it settles them: e.g. with lighter techniques only, the solver gets stuck on 84 of 84 boards after a jump; the cause of a jump is named from partial boards at 42.87 ms for 146 ratings in all. |
| Disagreements left | **None on the design.** Two qualifications (§2.7): rating every position is the cost of Q1 a, not an option; Q3 a reopens how a restart is shown (O3). |
| User decisions of 15:30 | Applied (§1). I withdraw my phase-2 ×3.5 threshold and my "dips ≤ 10 %" rule. |
| Converged prototype (`E\xreview\converged.js`) | On 107 requests: compact 779 steps (5 / 7 / 10 per puzzle), 779 numerical tables, 0 decreases, 84 jumps in 76 runs, 0 avoidable jumps left. On the 35 common requests its score sequences equal their revised selector's in **35 of 35** (243 steps, 0 decreases, 25 jumps). |
| Resolutions | R1–R17 (§3), concrete for Q1 a–Q5 a, proposed for both researchers to sign. The example before → after is §3.18. |
| Still open for the user | O1–O6 (§4): a frame on the culprit clue; extra content in "Why?"; restarts under Q3 a; a move of the details view that cannot be scored; Killer's rebuilt logs; deferred extras. |

---

## 1. The user's decisions of 15:30

| Q | Decided by the user at 15:30 | Change to my phase-2 position | Effect (107 requests, `E\xreview\out-p3-summary.txt`) |
|---|---|---|---|
| Q1 | (a) compact score-chosen steps (about 7) by default, plus an optional "show every move" toggle (details view) | none (CO-R §5 #1–#2) | compact 779 steps, median 7 (5–10); details 6,316 steps, median 33 (22–135) |
| Q2 | (a) a symmetric clue group is never split; partial boards only name the clue that causes a jump | none (CO-R, agreed point A3) | 4 jump steps where one cell alone gives an intermediate score stay whole and are named (e.g. Jigsaw nightmare 3962167687: 46 → 136 → 252, Killer expert 3514204290: 168 → 340 → 533) |
| Q3 | (a) the compact view never shows a decrease; excursions and refinement are folded into a step and told in its text; real drops only in the details view | **withdraws** my "dips ≤ 10 %" (CO-R §5 #12) | compact 0 decreases (my phase-1 rule: 17 in 12 runs, worst −6.36 %); 45 folded excursions in 27 runs; details 208 decreases in 28 runs (worst −95.04 %) |
| Q4 | (b) "score jump" badge and full callout at ≥ ×3 and ≥ +100 with a score before > 0; every new hardest technique still gets one line; 0 → first rated puzzle reads "first rated puzzle", no multiplier | **withdraws** my ×3.5 (CO-R §5 #3) | 84 jumps in 76 of 107 runs; 124 one-line steps; 107 "first rated puzzle" steps (one per puzzle) |
| Q5 | (a) 2–3 visible sentences plus a "Why?" disclosure with P / W / E (and V, R) before → after | none (CO-R §5 #6) | R11; the example in §3.18 |

Under Q4 b the user's own illustrative ladder 35, 100, 300, 1000 shows two badges (×3.0 and ×3.33); that is the rule
as decided, and R9 applies it without change.

---

## 2. Point-by-point response

### 2.1 Part A — how the replay works today (GA §1.1)

| Point | Their finding | Response |
|---|---|---|
| A1 ? | "Every board shown was a board the generator visited, in its actual order" (CO C1) is too broad: Killer's keeper log is synthetic (`generator/js/variants/killer.js:784–788, 814–834`). | ✔ Accept. The contract is "a faithful replay of the recorded log". A log rebuilt by `logOfClues` (one `pass:random`, then one `accept` per empty symmetric group in group order, `generator/js/variants/killer.js:814–821`) gets neutral wording (R13, O5). It only occurs when no sample reaches the band (`generator/js/variants/killer.js:780–788`): 0 of the 18 Killer requests of my corpus. |
| A2 | The every-move view of the example has 33 screens (31 changes + solution + final), not 31. | ✔ Accept; `E\xreview\out-p3-example.txt` lists the 33. |
| A3 ✘ | My B5 measurement counted the sentence of a free kind as a 0 table, although the renderer returns before the table (`generator/js/ui/step-view.js:415–426`). | ✔ Accept; corrected under B5. |
| A4 ✘ | "Downward refinement: the score goes down" is not an invariant: Killer 2997 → 2780 → 2788 → 1940 (`generator/js/engine/digger.js:1092–1143`). | ✔ Accept, reproduced: the details view of Killer nightmare 42 has exactly these two decreases (−7.24 % and −30.42 %). Texts follow the data, never the operation kind (R10 c). |
| A4 ? | Random Stage A is "often", not always, singles-only (Killer uses cage techniques). | ✔ Accept; no resolution depends on it. |
| A5 | "One use adds at least 1.25 w" holds only when that technique sets P; `w × n` is work W, not the row's share. | ✔ Accept. New sentences say "w = 360" and "counts its 360 points in full (P)", never "360 points per use" (R10 i). The table's existing column "Points per use" is not part of this change. |

### 2.2 Part B — diagnosis (GA §1.2)

| Point | Their finding | Response |
|---|---|---|
| B1 ✘ | The example has 10 steps without a numerical table, not 9. | ✔ Accept: step 1 (a sentence), steps 11–18 and step 20. |
| B2 | Classic9 hell1 2400651925, old step 35: rated 3422 through Unique Rectangle, yet it has two or more solutions. | ✔ Adopted in phase 2. R4 counts solutions whenever the proof used a technique that assumes uniqueness: 16 of 5,911 positions needed it, 0 ambiguous (a complete move is never a half-exchange). |
| B3 ? | 47 of 52 is a sample frequency. | ✔ Accept: "in my 78-request sample". |
| B3 ? | `keep` scores are the generator's objective; a proposal can log `score: null` (`generator/js/engine/digger.js:357–371, 646–697`). | ✔ Accept. They are exact in 840 of 840 numeric cases and null for 79 of 919 chosen candidates (CO-R §3.8); 4 of my 52 guided jump records have a null chosen score. If the user wants the choice sentence (O2), it says "by the generator's own check" and has a null fallback. |
| B4 ✘ | "Every real position is unique and completely rated" is not established. | ✔ Accept. Uniqueness: every position of a complete move passed the generator's check, except in a dig that a restart abandons (its final check found a second solution). Completeness: not guaranteed, since proposals and Greater-Than's minimal-sign pass accept on uniqueness alone (`generator/js/engine/digger.js:654–673`, `generator/js/variants/greater-than.js:291–300, 379–410`). Measured: 0 capped, 0 stuck, 0 ambiguous among 5,911 fresh ratings; R4 keeps the statuses; O4 asks how the details view shows such a move. |
| B5 ✘ | 316 of 1,258 steps (25.12 %) lack a table, in 78 of 78 runs, not 214 and 21. | ✔ Accept, reproduced (`E\xreview\out-p3-accounting.txt`): classic9 106 of 474, jigsaw9 13 of 159, samurai 16 of 155, killer 25 of 302, greaterThan 156 of 168. Greater-Than shows 12 numerical tables in 12 runs, all finals, so my Greater-Than "largest rise shown" ratios were not between two tables. My `full` comparison used a 20,000 ms guard, not an unlimited budget (no rating reached it). |

### 2.3 Part C — the proposal (GA §1.3)

| Point | Their finding | Response |
|---|---|---|
| C1 ? | The order is the order of the (possibly rebuilt) log; "no drop over 10 %" was not decided. | ✔ Accept; the second is now settled by Q3 a (no decrease at all in the compact view). |
| C2 ? and gaps | An `accept` followed by a search `reveal` has no transaction id. A missing log ends on the solution; a restart needs chapters. | ✔ Accept. Wording "removed … and showed … again" (R10 e). Fixed in `E\xreview\converged.js`: without a log the replay is solution, structure, finished puzzle (`E\xreview\out-p3-synthetic.txt` §4); a restart opens a chapter (the compact view is O3). |
| C3 ✘ | The prototype defaults to 2,000,000 checks (`E\moves.js:108`) and re-rates the final (111 calls for Greater-Than expert 42); a guard failure at the final gives null; page slices do not keep the page responsive (one rating took 195.23 ms). | ✔ Accept, reproduced: 111 calls, 110 with the final reused; with a guard of 1 check the phase-1 prototype ends on `0, null` while the converged one keeps 992 (`E\xreview\out-p3-synthetic.txt` §2–§3). The largest single rating here is 206.66 ms (Mega16 hell2 12), so R3 runs the job in the worker. |
| C3 ? | A fixed guard proves nothing for future positions; the extra DFS count needs its own guard. | ✔ Accept: 1,000,000 checks per rating, 200,000 nodes per count, statuses instead of numbers (R4). |
| C4 ✘ | The fill overshoots (100 → 400 on `0,23,44,100,200,400,800,992`); the last eligible position of a phase is missed (Greater-Than expert 42, index 35, score 135; `0,23,24,200,25,80` gives `0,23,25,80`); a restart erases a chapter. `≤ suffixMin × 1.1` allows −9.09 % against every later minimum. | ✔ Accept all, reproduced on my phase-1 `segment` and fixed in `select` (`E\xreview\out-p3-synthetic.txt` §1): `0,23,44,100,200,400,992` (one audit insertion), `0,23,24,25,80`, both chapters kept. Greater-Than expert 42 becomes `0,0,135,135,242,242,973,973,973`. The tolerance is 0 under Q3 a. |
| C5 ? | Per-row deltas do not add up (568 → 992: visible rows +937, rows no longer used −513); the peak sentence must follow the operations. | ✔ Accept, reproduced (`E\xreview\out-p3-example.txt`). Only the Total shows a change, for example "992 (+424)"; no per-row deltas (R8). The folded-excursion sentence is chosen from the operations inside the step (R10 d). |
| C7 ✘ | 582 screens (480 positions + 78 finals + 24 structure screens), 5–10 per run, median 7 on my 78; 11 on the 35. | ✔ Accept. Converged rule (zero decreases): 581 on my 78, 779 on 107 requests (5 / 7 / 10). |
| C7 ? | "Largest rise is the smallest possible in 66 of 78" is conditional. | ✔ Accept; replaced by the audit (R7), which checks every flagged step against the recorded positions. |
| C8 ✘ / ? | "≤ 45" should read "below 50" (46 and 47 exist); the 2,151 supersets are a sample. | ✔ Accept both. |
| C9 ✘ / ? | "≤ 3.7 ms per jump" was partial-rating time only; a worker message is a protocol change. | ✔ Accept. Measured separately on 107 requests: partial boards 146 ratings, 42.87 ms in all (largest 9.33 ms: a 4-cell exchange, 14 boards); the two wording checks 630 solves, 248.5 ms. The message is additive (R14). |
| C10 ? | The pure module belongs to the generator and its script lists. | ✔ Accept (R15). |

### 2.4 C11 — explaining a jump (GA §1.4)

| Point | Their finding | Response |
|---|---|---|
| C11.1 ✘ | "No board in between is easier" is false (550 < 551). | ✔ Accept. Not said any more: the cause sentence quotes the partial scores (R12). |
| C11.1 ✘ | "Grouping never helps": merging the two halves of an exchange is what removes 1849. | ✔ Accept; withdrawn. |
| C11.1 ✘ | My exhaustion argument for C4 fails because the fill overshoots. | ✔ Accept; replaced by the audit (R7): 0 repairs needed on the 107 real requests, 1 on the synthetic input, 0 avoidable jumps left. |
| C11.1 | Partial-board splits (46 → 136 → 252; 168 → 340 → 533) depend on the subdivision policy. | Settled by Q2 a: never split; such cases are named (R12, "in between": 4 jump steps). |
| C11.2 ? / ✘ | Neither threshold was user-approved; "×13.4" from 0 is not a multiplier (10 of my 74 flags started at 0). | ✔ Accept; settled by Q4 b. No multiplier from 0: "first rated puzzle" instead (R9). |
| C11.3 ✘ | "Cannot be finished without X" is false: the 551 board solves at 1113 via W-Wing without Simple Colouring, the 992 board at 1117 without XYZ-Wing. | ✔ Accept, reproduced with the same counts (`E\xreview\out-p3-example.txt`). On 107 requests the board after a jump solves without its new hardest technique in **82 of 84** jump steps, so the old sentence would almost always be false (R10 a). |
| C11.3 ? | "W grows" is not generic (568 → 992: W 906.5 → 806.75 over the compact step, 906.75 → 806.75 over the last exchange). | ✔ Accept: the disclosure prints the step's own before and after values, and the sentences follow their direction (R10 c). |
| C11.3 ? | Candidate-choice text needs provenance and the move's log offset (`E\jump-explain.js:102–114` takes the last matching accept). | ✔ Accept: every move records its log offset (R2); the choice sentence itself is O2. |
| C11.4 ? | Use neutral information styling; 2 sentences and a disclosure; a first-use highlight on the board shown is not sound. | ✔ Accept: accent tokens (R11); Q5 a decided the length; the highlight was dropped in CO-R §4.2 #5. |
| C11.5 ✘ | Replace "cannot be finished without Simple Colouring" and "no board in between is easier". | ✔ Accept; the new texts are in §3.18. |
| C11.6 ? | Do not assert "the signs do most of the work". | ✔ Accept, and today's `replay.clues` says it too (`generator/js/ui/player.js:844`, VI `:902`): R15 rewords it. |
| C11.7 ? | Keep probe and witness timings apart; a failed probe must not read as "checked"; enumerate every subset of a change of up to 4 cells. | ✔ Accept: every proper subset is rated (14 boards for a 4-cell exchange); a capped or ambiguous probe drops the sentence (R12). |

### 2.5 Part D and the decisions (GA §1.5)

| Point | Their finding | Response |
|---|---|---|
| D1–D2 ✘ / ? | Fix the necessity, "W grows" and "no easier board" wording; do not infer direction from the operation kind; row deltas, styling, overlays and slider marks are separate choices. | ✔ Accept (R10); the extras are O1, O2 and O6. |
| D3 ? | Do not publish example step counts before the policy is chosen. | ✔ Accept. The policy is now decided; the counts in R16 come from the prototype and are measured again on the implementation. |
| D4 | Add tests for the 3422 board, a missing log, the final under a guard failure, a restart, the last eligible phase end, the 100 → 400 overshoot, the row-delta accounting, proof-scope wording and the from-zero exception. | ✔ Accept all (R17); no per-row deltas are shown, so that test checks their absence. |
| D5 ✘ / ? | Slicing does not make the page responsive; Killer provenance is not out of scope. | ✔ Accept (R3, R13, O5). |

### 2.6 Their head-to-head and revised selector (GA §3–§4), re-checked

- **My phase-1 selector on their 35 requests:** 250 steps, 8 decreases in 5 runs, worst −6.36 % — the same as GA §3.3.
  Fresh ratings 1,967 (theirs 1,967), identical-board hits 49 (theirs 50), rating time 1,195.18 ms (theirs 1,264.49 ms),
  largest single rating 206.66 ms (theirs 195.23 ms); the differences are machine noise.
- **Their zero-decrease sequences** are reproduced: Greater-Than expert 1 `0,0,269,276,986,990,990`, Greater-Than hard
  3115968914 `0,0,130,638,638`, Jigsaw nightmare 42 `0,25,44,49,138,1678,1678`.
- **Their revised selector against my converged `select`:** identical score sequences on **35 of 35** requests
  (`E\xreview\out-p3-vs-ga.txt`); both give 243 steps, 0 decreases, 25 jumps (in 23 runs), 0 avoidable, 0 real repairs.
- **Mega16 hell2 12, position 76 (113,177 checks):** not re-run; consistent with 0 capped ratings at 1,000,000 checks.

### 2.7 Qualifications and remaining disagreements

1. **Cost.** Their "319.52 ms against 1,264.49 ms" compares rating the shown steps of today's batches with rating every
   position. Under Q1 a every position is rated anyway: the details view shows every move and the compact rule needs
   every score. The converged cost is 2,691.31 ms of rating for 107 requests: median 3.14 ms, p95 160.22 ms and
   maximum 594.34 ms per puzzle, off the main thread (R3).
2. **Restarts under Q3 a.** Their revised selector keeps both chapters (`0,23,44,551,0,23,44,600,992`), which shows a
   decrease to 0 in the compact view; Q3 a as worded excludes it. The prototype supports both readings
   (`E\xreview\out-p3-restart.txt`); the choice is O3. No restart occurred in the 107 requests.
3. **New for both to sign:** the "lighter techniques" sentence (R10 b), shown only after a bounded check of that step.

There is no other disagreement.

---

## 3. Resolutions R1–R17 (proposed for both researchers to sign)

### R1. Invariants

The generator, its algorithm, the dig log, the result (`givens`, `solution`, `model`, `rating`), the wire, the
regression hashes (`generator/tests/fixtures/perf-helper.js:173–186` hash givens, solution, regions, cages, signs and
symbols), the qualification lists, the cache (schema 2) and its keys, the history (version 1) and the export stay
identical for every request and seed. Every score shown is the canonical rating (`SG.difficulty.rate`) of the board the
step shows, or `result.rating` on the finished puzzle: never a smoothed, interpolated or copied number.

### R2. Move model

- The replay reads `result.digLog` move by move: a random or guided accept (one symmetric group); an `accept` followed
  by a `reveal` with reason `search` is **one exchange** (`generator/js/engine/digger.js:1362–1370`); a refinement
  reveal; Greater-Than's opening clues and each sign accept; a restart.
- Each move keeps its log offset, kind, phase, changed cells or sign, and the rejected and kept candidates since the
  previous move (for today's texts such as "Rate 15 possible removals (5 refused)").
- A missing or partial log keeps today's fallback (solution, structure, finished puzzle), each with a table. The last
  step is always the finished puzzle: `result.givens` with `result.rating`.
- Killer's rebuilt logs: R13 and O5.

### R3. Rating: where and when

- The page shows the finished puzzle and its Summary as soon as the worker posts `done`
  (`generator/js/worker/gen.worker.js:189`). The replay analysis then runs as a separate job, requested and answered by
  one additive message pair in the same slices as generation, so a `cancel` or a new `generate` pre-empts it
  (`generator/js/worker/gen.worker.js:16–29, 258–274`).
- Until the answer arrives, the replay controls show "Preparing the steps… k of N" and no step is shown without its
  table.
- Without a worker (the direct client, `generator/js/ui/app.js:218`; the `file://` case), the same job runs in the
  page, one rating per slice; a single rating can still pause the page (up to 206.66 ms here).
- After a cache hit, the job starts when `SG.app.attachTrace` gives the puzzle its log
  (`generator/js/ui/cache.js:998`, `generator/js/ui/app.js:858–873`). An answer for another request is ignored; a
  language change re-renders without rating again.

### R4. Rating: guard, reuse, uniqueness, statuses

- Each rating has a deterministic guard of **1,000,000 checks** (`SG.budget.create({ nodes })`, no clock).
- The finished puzzle reuses `result.rating`; the solution, the structure step and a restart score 0 without a solve;
  identical boards (values plus alive signs) are rated once.
- When the complete proof used a technique that assumes uniqueness (`provesUniqueness` false,
  `generator/js/engine/difficulty.js:432`), a solution count with its own guard of **200,000 nodes** confirms the board
  before its score is used.
- Statuses: rated, zero, final, capped, stuck, ambiguous, unverified. Only rated, zero and final positions carry a
  score.
- Measured on 107 requests: 5,911 fresh ratings, 49 identical-board hits, 16 solution counts (9.13 ms), 0 capped,
  0 stuck, 0 ambiguous, 0 unverified.

### R5. Two views (Q1 a, decided by the user at 15:30)

- **Default: compact** (R6). A toggle "Show every move" switches to the **details** view: every move of R2 is a step,
  real decreases are shown with direction-aware text, and the same tables and explanation rules (R8–R12) apply per
  move.
- The toggle is a display option: it changes no puzzle data and is not stored with the puzzle, the history or the
  export.
- Example: 7 compact steps, 33 detail steps. Corpus: compact 5–10 (median 7); details 22–135 (median 33). Greater-Than
  and Samurai reach 135 because every sign or group is a move.

### R6. Compact segmentation (Q2 a, Q3 a)

Within a chapter (a restart starts one; see O3), the steps are cut as follows (`E\xreview\converged.js`, `select`):

1. **Eligible** positions are scored and never followed, within the chapter, by a lower score (Q3 a). Everything in
   between is folded into a step and told in its text.
2. Both ends of every rise of ×R or more between consecutive eligible positions are cuts (a jump is its own step).
3. The last eligible position of every run of one phase is a cut (phases stay visible).
4. Geometric fill: from the last cut, the next eligible position at ≥ R × its score (scores below 10 count as 10) and
   ≥ +10 points is a cut, with `R = clamp((max(S_end, 10) / 10)^(1/6), 1.3, 3)` (`S_end`: the chapter's last score).
5. A step that gains < 10 points joins its neighbour, unless both of its ends are chapter ends or cuts of rules 2–3.
6. The audit of R7.

Whole moves only: a symmetric group, an exchange or a sign is never split (Q2 a), and partial boards never become
steps.

| 107 requests | Compact (R6) | My phase-1 `segment`, same ratings | Details (R5) |
|---|---:|---:|---:|
| Steps (min / median / max per puzzle) | 779 (5 / 7 / 10) | 785 (5 / 7 / 11) | 6,316 (22 / 33 / 135) |
| Steps with a numerical table | 779 | 785 | 6,316 |
| Decreases (runs; worst) | **0** | 17 (12; −6.36 %) | 208 (28; −95.04 %) |
| Jumps under Q4 b (runs) | 84 (76) | 84 (76) | 90 (76) |
| Avoidable jumps left | 0 | 0 | 0 |
| Steps with an unchanged score | 17 | 11 | 2,642 |
| Largest rise between positive scores: maximum / median per puzzle | ×40.2 / ×5.5 | ×40.2 / ×5.59 | ×40.2 / ×5.77 |
| Same score sequence as phase 1 | 91 of 107 | — | — |

On the 35 common requests: compact 243 steps (5 / 7 / 10), 0 decreases, 25 jumps in 23 runs, 0 avoidable; details
2,135 steps (22 / 41 / 135), 74 decreases in 10 runs (worst −80.22 %), 28 jumps. The 17 steps with an unchanged score
lie between two positions the rules keep: 10 end at the chapter's last move (for example Greater-Than very easy 1,
`0,0,42,42,42`, whose sign removals leave the score at 42), 7 lie between ends of a ×R rise or of a phase run (for
example Greater-Than expert 42: `0,0,135,135,242,242,973,973,973`; `E\xreview\out-p3-flat.txt`). The user's second
requirement allows them ("even when the score did not change").

### R7. Avoidability audit, and what "unavoidable" means

- For every compact edge a → b that is a jump and spans two moves or more, the audit searches the scored recorded
  positions between a and b, with scores in [s_a, s_b], for a non-decreasing chain with no jump edge (fewest positions
  first, then the smallest worst ratio), and inserts it when one exists.
- Real corpus: 0 insertions needed in 107 requests. Synthetic input `0,23,44,100,200,400,800,992`: one insertion gives
  `0,23,44,100,200,400,992`. After the audit, an independent re-check finds 0 avoidable jumps.
- Scope: a jump that remains cannot be removed **with the whole moves the generator recorded** (Q2 a). The page never
  claims that no easier board exists.

### R8. A table on every step

| Position | What the page shows |
|---|---|
| Position 0 ("Start", not a step) | no table: today's hint (`replay.start`, `generator/js/ui/player.js:824`) and "No score yet: this is not a puzzle yet." |
| Full solution; cages; signs | a numerical table: Empty cells 0, Total 0, and "Nothing to solve yet." (today: a sentence only, `generator/js/ui/step-view.js:415–426`) |
| Every other compact step | the canonical table of its end board; the Total with its change, for example "551 (+507)", or "568 (unchanged)" |
| Finished puzzle | the Summary's table (`result.rating`) |
| While the job runs | the controls wait ("Preparing the steps… k of N"); no step without a table |
| A details move that cannot be scored | O4 (never in the compact view, which only uses scored positions) |

A table is never copied from another step, and there are no per-row deltas: the change shows on the Total only
(GA §1.3 C5).

### R9. Jumps and the three explanation tiers (Q4 b, decided by the user at 15:30)

| Tier | Rule between two adjacent shown steps | Shown | Compact | Details |
|---|---|---|---:|---:|
| First rated puzzle | score before 0, after > 0 | the label "First rated puzzle" and one line naming the hardest technique; no multiplier | 107 | 107 |
| Score jump | before > 0, rise ≥ +100 and ≥ ×3 | heading badge "Score jump ×12.5", the callout (R11), the cause (R12), a label on the new hardest technique's row | 84 (76 runs) | 90 (76 runs) |
| New hardest technique | the end board's hardest technique is not used at the start board; not a jump | one line (R10 a) and the row label | 124 | 149 |

All 84 compact jumps bring a new hardest technique, but the callout's first sentence also has a template for a jump
whose hardest technique stays the same (W or E grows), as a fallback.

### R10. Wording rules

a. **"The generator's logical solution (now) uses X."** Never "cannot be solved / finished without X": the board after
   a jump solves without its new hardest technique in 82 of 84 jump steps (example: 1113 via W-Wing).
b. **"The lighter techniques alone no longer finish this board"**, only when a bounded solve with the techniques lighter
   than X was run for that step and got stuck. It got stuck in 84 of 84 jump steps, but 16 of 124 one-line boards and 9
   of 107 first rated puzzles do finish with lighter techniques, so it is never assumed.
c. **Direction from the data:** P, W, E, V and R sentences and the change of the Total follow their real values
   (568 → 992: P rises, W falls 906.5 → 806.75, E unchanged); never from whether clues were added or removed.
d. **Folded excursions** (45 compact steps in 27 runs) are told from the operations inside the step: with clues shown
   again (9 of them), "On the way the score reached {peak}, too hard for this level, so {n} clues were shown again" (as
   today's `replay.reveal`); without, "On the way the score reached {peak}".
e. **Exchanges:** "removed … and showed … again", with the net change on the board and the gross counts in the text;
   no claim that it was one swap.
f. **Proof scope**, in the disclosure: "These numbers describe the generator's logical solution, not every way to solve
   the puzzle."
g. **Provenance:** a choice sentence (if O2 adds it) says "by the generator's own check"; a rebuilt Killer log says so
   (R13).
h. No "the signs do most of the work", including today's `replay.clues`.
i. A technique's weight is written `w = 360`, and P as "counts its 360 points in full"; never "360 points per use".

### R11. The callout (Q5 a, decided by the user at 15:30)

- **Where:** the badge in the step heading; the callout below the step text and above the table; the new hardest
  technique's row labelled "New hardest technique" in the table.
- **Visible:** the heading "Score jump: 44 → 551 (+507)" and 2–3 sentences: S1 what changed and the technique the
  solution now uses (R10 a); S2 P counted in full, plus R10 b when verified; S3 the cause (R12).
- **"Why?" disclosure** (`details`/`summary`, keyboard accessible): P, W → R and E → V before → after, the rounded sum,
  and the proof-scope line (R10 f). Nothing else unless the user adds it (O2).
- **Style:** neutral information, not a warning: `--sg-color-accent` and `--sg-color-accent-soft` (both in the light
  and dark tokens), with text and a border so that colour is not the only signal.
- No overlay of the proof's pattern on the board shown (it appears mid-proof: Simple Colouring at proof step 31 of 47 in
  the example, CO-R X3).
- A one-line step shows its line and the row label, with no badge and no disclosure. The first rated puzzle shows its
  label and one line.

### R12. Naming the cause (Q2 a, decided by the user at 15:30)

For a jump made by one move of 2 to 4 cells, every proper non-empty subset of the change is rated as a partial board
(a board that only re-adds clues of a unique board is unique; others are counted with the 200,000-node guard). Partial
boards are never shown as steps. A capped or ambiguous probe removes the sentence.

| Case (compact jump steps, 107 requests) | Count | Sentence (EN) |
|---|---:|---|
| One move; one cell alone carries ≥ 90 % of the rise (log scale) | 42 | "Removing {cell} alone already scores {score}; removing {other} alone gives {otherScore}." |
| One move; each cell alone carries ≤ 10 % | 21 | "Neither clue alone raises the score much ({scores}); removing them together does." (an exchange says "no single clue of this exchange …") |
| One move; in between | 4 | "Removing {cell} alone gives {score}; the whole symmetric group gives {after}. A symmetric group is always shown whole." |
| One sign (Greater-Than), or a group of one cell | 4 | "This step removes a single sign." / "… a single clue." |
| Several moves (no recorded chain below ×3, R7) | 13 | "{technique} first appears at move {k} of {n} of this step ({change})." plus R10 d (all 13 have a folded peak; 8 at or above the level's maximum; 3 with clues shown again) |

Cost: 146 partial ratings, 42.87 ms in all; the largest single case is 9.33 ms (a 4-cell exchange, 14 boards). The 90 %
and 10 % limits are presentation constants. Example: R1C2 alone 550, R9C8 alone 44, so R1C2 is named.

### R13. Killer, Greater-Than and multigrid boards

- **Killer:** the cages step is a structure step with a zero table; cage techniques keep their existing names (Rule of
  45, Cage Split, …). A rebuilt log (one `pass:random`, then accepts only, at levels from Expert up;
  `generator/js/variants/killer.js:814–821`) is labelled "Rebuilt from the clues of the finished puzzle; the order is
  not the generator's", and gets no choice sentence (detection: O5).
- **Greater-Than:** every position is rated with its alive signs (`generator/js/variants/greater-than.js:103–121`); a
  sign move names its two cells ("the sign between R4C5 and R4C6"); the opening clues step is the first rated puzzle;
  four corpus jumps are single signs. No "the signs do most of the work".
- **Multigrid (Samurai, …):** one solve of the whole board, never a sum per grid; cells keep the variant's existing
  labels (today's `{cellList}`). Mega16 is the heaviest case: 206.66 ms for one rating, 594.34 ms for one puzzle.

### R14. Persistence and protocol

- The ratings live in memory with the puzzle on show: 3,005 B median and 20,068 B maximum per puzzle (every position;
  995 and 1,636 B for the compact steps only). They are rebuilt after a cache hit (R3).
- Nothing is added to the cache, the history, the export, the URL or any key.
- The worker protocol gains one additive request and answer pair; existing messages and the `done` result are
  unchanged.

### R15. Code placement and strings

- A pure module owned by the generator (for example `generator/js/engine/replay.js`): move model, rating plan,
  selection, audit, tiers and the cause. It is listed in `generator/index.html`, `generator/tests.html`,
  `generator/tests/node-runner.js` and `generator/js/worker/gen.worker.js`, so `ui-contract` stays green; `core/` is
  not touched.
- Rendering stays in `generator/js/ui/player.js` (its rating path — `RATE_FREE_KINDS`, `RATE_BUDGET_MS`, `techniquesAt`
  and `rateStep`, lines 39, 42 and 512–553 — is replaced) and `generator/js/ui/step-view.js`. Styling goes into
  generator CSS; if `core/css` had to change, both apps' quick suites run.
- Every shown string goes through `SG.i18n.t()`, in English and Vietnamese, with `_one` / `_other` forms and the
  locale's number format.

| Key (draft) | English | Vietnamese |
|---|---|---|
| `replay.view.details` | Show every move | Hiện từng thao tác |
| `replay.preparing` | Preparing the steps… {done} of {total} | Đang chuẩn bị các bước… {done}/{total} |
| `replay.start.noScore` | No score yet: this is not a puzzle yet. | Chưa có điểm: đây chưa phải là đề. |
| `replay.title.exchange` | Clue exchanges | Đổi số cho sẵn |
| `replay.exchange_one` / `_other` | Exchange clues once / {count} times while searching nearby for a harder puzzle: {removed} removed and {revealed} shown again in all. | Đổi số cho sẵn {count} lần khi tìm quanh đó một đề khó hơn: tổng cộng xóa {removed} và hiện lại {revealed}. |
| `replay.folded.reveal` | On the way the score reached {peak}, too hard for this level, so {revealed} were shown again. | Trên đường đi điểm đã lên {peak}, khó hơn mức đã chọn, nên {revealed} được hiện lại. |
| `replay.folded.peak` | On the way the score reached {peak}. | Trên đường đi điểm đã lên {peak}. |
| `replay.rebuilt` | Rebuilt from the clues of the finished puzzle; the order is not the generator's. | Dựng lại từ các số cho sẵn của đề hoàn chỉnh; thứ tự không phải của trình sinh đề. |
| `replay.clues` (reworded) | Empty the grid and keep {clues}. | Xóa trống lưới và chỉ giữ {clues}. |
| `steps.techniques.zero` | Nothing to solve yet. | Chưa có gì để giải. |
| `steps.techniques.change` / `.unchanged` | {score} ({change}) / {score} (unchanged) | {score} ({change}) / {score} (không đổi) |
| `steps.techniques.newPeak` | New hardest technique | Kỹ thuật khó nhất mới |
| `steps.first` | First rated puzzle: score {score}; the generator's logical solution uses {technique} as its hardest technique. | Đề đầu tiên có điểm: {score}; lời giải logic của trình sinh đề dùng {technique} làm kỹ thuật khó nhất. |
| `steps.newPeak` | The generator's logical solution now uses {technique} (w = {w}) as its hardest technique, instead of {previous} (w = {previousW}). | Lời giải logic của trình sinh đề giờ dùng {technique} (w = {w}) làm kỹ thuật khó nhất, thay cho {previous} (w = {previousW}). |
| `steps.jump.badge` | Score jump ×{ratio} | Điểm tăng vọt ×{ratio} |
| `steps.jump.heading` | Score jump: {from} → {to} ({change}) | Điểm tăng vọt: {from} → {to} ({change}) |
| `steps.jump.uses_one` / `_other` | {move} made the generator's logical solution use {technique} (1 use / {count} uses); before, its hardest technique was {previous}. | {move} khiến lời giải logic của trình sinh đề phải dùng {technique} ({count} lần); trước đó kỹ thuật khó nhất là {previous}. |
| `steps.jump.full` | As the hardest technique it counts its {w} points in full (P). | Là kỹ thuật khó nhất, nó được tính đủ {w} điểm (P). |
| `steps.jump.lighter` | The lighter techniques alone no longer finish this board. | Riêng các kỹ thuật nhẹ hơn không còn giải hết được đề này. |
| `steps.jump.culprit` / `.together` / `.parts` / `.sign` / `.grouped` | the five sentences of R12 | the same five, in Vietnamese |
| `steps.jump.why` | Why? | Vì sao? |
| `steps.jump.p` / `.r` / `.v` / `.total` / `.scope` | the disclosure lines of §3.18 | the same lines, in Vietnamese |

### R16. Documents (same change, both languages)

- `generator/design.md`: §7.3 "Replay engine in the UI layer" (L757: move model, views, job, tiers), §7.1 (L708) where
  it describes the replay, §10.5 "Results panel" (L1183: tables, badge, callout, toggle), §15.2 "Test suites" (L1717).
- `USERGUIDE.md` L83 and L114, `USERGUIDE.vn.md` L84 and L115: the two views, a table on every step, the badge and
  "Why?", what "First rated puzzle" means; no code.
- `DEVELOPERGUIDE.md` L235–252 and L276–277, and `DEVELOPERGUIDE.vn.md` L226–232 with its cache paragraph: the module,
  the worker job, the statuses. Its example "Classic 9×9 easy, seed 3, replays in 9 steps" becomes, in the prototype,
  7 compact steps (`0, 14, 24, 34, 44, 46, 46`) and 26 with every move (`E\xreview\out-p3-easy3.txt`); the
  implementation measures it again. `generator/tests/suites/help.test.js` checks that the guides name only existing
  scripts, commands and APIs, so an API renamed by R15 (for example `SG.player.buildSteps`) is renamed there too.
- Help text `help.generation.replay` (`generator/js/ui/help.js:1183` EN, `:1444` VI); a note in `generator/task.md`.

### R17. Tests (quick suites only)

Suites: `player`, `steps`, `worker`, `cache`, `ui-contract`, `i18n`, `help`, plus a new suite for the module of R15
(`cd generator && node tests/node-runner.js --suite=…`, then the quick set). Cases:

1. The example: compact `0, 23, 44, 551, 568, 992, 992`; one jump, at step 4, naming R1C2, Simple Colouring, w = 360,
   2 uses and P 1 → 360; step 6 has the XYZ-Wing line; the details view has 33 steps.
2. Every compact step has a numerical table and no decrease; every position it ends on is unique and completely rated;
   the last step is `result.givens` with `result.rating`.
3. No half-exchange board appears (the 1849 board of today's step 19 is gone).
4. The 3422 board (classic9 hell1 2400651925) never receives a score.
5. A missing log gives solution, structure and finished puzzle; with a guard of 1 check the finished puzzle keeps 992.
6. A restart, per O3; the last eligible phase end (`0,23,24,200,25,80` gives `0,23,24,25,80`); the overshoot
   (`…,100,200,400,800,992` gives `…,100,200,400,992`).
7. Wording: "now uses", never "cannot be solved without"; R10 b only after a stuck solve; W and E sentences by
   direction; no multiplier from 0; the proof-scope line; no per-row deltas.
8. Greater-Than alive signs and sign-only steps; the Killer cages step; multigrid labels.
9. Stale worker answers ignored; no solver call on a language change; the cache-hit path through `attachTrace`.
10. Every new key in both languages, with plural forms.

The tests of `generator/tests/suites/player.test.js` tied to fixed batch sizes (lines 223, 240, 311, 336, 354) are
rewritten around these invariants, not weakened. No heavy suite, fixture, regression hash or qualification list
changes.

### 3.18 The example (classic9, Expert, seed 3275974478), before → after

| Step | Today: score | Compact (R6): score — what the step shows |
|---:|---|---|
| 1 | Full solution: a sentence, no table | Full solution: table, Total 0 |
| 2 | 18 | 23: 7 random moves, 14 removed — "First rated puzzle" (Naked Single) |
| 3 | 28 | 44 (+21): 15 random moves, 29 removed |
| 4 | 34 | **551 (+507): the guided pair R1C2, R9C8 — "Score jump ×12.5" and the callout** |
| 5 | 41 | 568 (+17): 3 guided moves, 6 removed |
| 6 | 44 | 992 (+424): 5 exchanges — one line: XYZ-Wing |
| 7 | 551 | 992: finished puzzle, 30 clues, the Summary's table |
| 8–10 | 557, 567, 568 | — |
| 11–18 | no table | — |
| 19 | 1849 (half of an exchange, two solutions) | — |
| 20 | no table | — |
| 21 | 992 | — |

Before: `P, 18, 28, 34, 41, 44, 551, 557, 567, 568, —×8, 1849, —, 992` (21 steps, 10 without a numerical table).
After: `0, 23, 44, 551, 568, 992, 992` (7 steps, 7 tables, no decrease). Details:
`0,5,9,12,15,18,20,23,25,27,28,30,31,33,34,36,37,38,40,41,42,43,44,551,557,567,568,568,568,568,568,992,992`
(33 steps, no decrease). Rating cost of the whole example: 30 fresh ratings, 1.76 ms.

Step 4, English (visible part, then the disclosure opened):

```text
Step 4 – Hardest removal                                                        [ Score jump ×12.5 ]
Rate 15 possible removals (5 refused) and remove the one that makes the puzzle hardest: R1C2, R9C8.
Score jump: 44 → 551 (+507)
Removing R1C2 and R9C8 made the generator's logical solution use Simple Colouring (2 uses); before, its
hardest technique was Naked Single.
As the hardest technique it counts its 360 points in full (P). The lighter techniques alone no longer
finish this board.
Removing R1C2 alone already scores 550; removing R9C8 alone gives 44.
▾ Why?
  P, hardest technique: 1 → 360 (+359)
  W, work: 43 → 768.25; R = 0.25 × P × log₂(1 + W ÷ P): 1.36 → 148.32 (+146.96)
  E, empty cells: 43 → 45; V = 80 × E ÷ (E + 40): 41.45 → 42.35 (+0.91)
  Score = V + P + R, rounded: 44 → 551 (+507)
  These numbers describe the generator's logical solution, not every way to solve the puzzle.
Table: the Simple Colouring row labelled "New hardest technique"; Total 551 (+507).
```

Vietnamese:

```text
Bước 4 – Xóa ô làm đề khó nhất                                                  [ Điểm tăng vọt ×12,5 ]
Đánh giá 15 cách xóa (5 bị loại) và xóa cách làm đề khó nhất: R1C2, R9C8.
Điểm tăng vọt: 44 → 551 (+507)
Bỏ R1C2 và R9C8 khiến lời giải logic của trình sinh đề phải dùng Tô màu đơn giản (Simple Colouring)
(2 lần); trước đó kỹ thuật khó nhất là Ô một ứng viên (Naked Single).
Là kỹ thuật khó nhất, nó được tính đủ 360 điểm (P). Riêng các kỹ thuật nhẹ hơn không còn giải hết được
đề này.
Chỉ bỏ R1C2 thôi đã được 550 điểm; chỉ bỏ R9C8 thì được 44.
▾ Vì sao?
  P, kỹ thuật khó nhất: 1 → 360 (+359)
  W, khối lượng: 43 → 768,25; R = 0,25 × P × log₂(1 + W ÷ P): 1,36 → 148,32 (+146,96)
  E, ô trống: 43 → 45; V = 80 × E ÷ (E + 40): 41,45 → 42,35 (+0,91)
  Điểm = V + P + R, làm tròn: 44 → 551 (+507)
  Các số này mô tả lời giải logic của trình sinh đề, không phải mọi cách giải đề.
```

Step 6 (568 → 992, ×1.75: one line, no badge):

- EN: "Exchange clues 5 times while searching nearby for a harder puzzle: 10 removed and 10 shown again in all." —
  "The generator's logical solution now uses XYZ-Wing (w = 750) as its hardest technique, instead of Simple Colouring
  (w = 360)." The board frames the net change: R4C2, R5C1, R5C9 and R6C8 removed; R1C8, R2C8, R8C2 and R9C2 shown.
- VI: "Đổi số cho sẵn 5 lần khi tìm quanh đó một đề khó hơn: tổng cộng xóa 10 và hiện lại 10." — "Lời giải logic của
  trình sinh đề giờ dùng XYZ-Wing (w = 750) làm kỹ thuật khó nhất, thay cho Tô màu đơn giản (Simple Colouring)
  (w = 360)."
- Its values for the Total's tip: P 360 → 750, W 906.5 → 806.75, R 163.33 → 197.55, E 51 and V 44.84 unchanged.

Step 2: EN "First rated puzzle: score 23; the generator's logical solution uses Naked Single as its hardest
technique." — VI "Đề đầu tiên có điểm: 23; lời giải logic của trình sinh đề dùng Ô một ứng viên (Naked Single) làm kỹ
thuật khó nhất."

---

## 4. Still open for the user

These are not covered by the decisions of 13:54 and 15:30; neither researcher should settle them. Each option keeps
R1–R17 valid; "changes" lists what differs.

| # | Question | Options and what changes | Evidence | Recommendation |
|---|---|---|---|---|
| O1 | Frame the culprit clue on the board? (Q2 a says partial boards *name* the clue.) | (a) text only (R12); (b) also a frame on the culprit clue, with a legend entry "Removing this clue causes the jump" (generator CSS, one string, one test) | a single culprit exists in 42 of 84 jump steps (example: R1C2); no single cell in 21 "together" cases; 4 single signs | (b), for the culprit and single-sign cases only |
| O2 | More content in "Why?" (Q5 a lists P / W / E, V, R) | (a) nothing more; (b) the level before → after; (c) the generator's choice: "the other 9 removals rated in this round scored at most 45 by the generator's own check", with a null fallback; (d) the first use as text (the solver's own sentence, one more bounded solve per jump) | (c) is exact in 840 of 840 numeric cases, null in 79 of 919 chosen candidates; not available for rebuilt logs; (d) appears mid-proof (step 31 of 47) | (b), (c) and (d), all inside the disclosure |
| O3 | A restart (the final check found a second solution) under Q3 a | (a) the abandoned dig is folded into the "Starting again" step and told there ("a first dig reached 551, but the final check found a second solution"): compact `0, 0, 23, 44, 600, 992, 992`; the details view shows both digs and the drop; (b) both digs stay in the compact view: `0, 23, 44, 551, 0, 23, 44, 600, 992, 992`, one drop to 0 | 0 restarts in 107 requests; both prototyped (`E\xreview\out-p3-restart.txt`); (b) is their revised selector | (a), the literal reading of Q3 a |
| O4 | A move of the details view that cannot be scored (capped, stuck, or not unique before a restart) | (a) its own step with a status table (the techniques used until stuck, no total, the reason); (b) joined to the next scored move, with "includes 1 move the solver could not rate", so every step shows a score | 0 such moves among 5,911 fresh ratings; the compact view never shows one | (b), which keeps a score on every step (requirement 2) |
| O5 | How the page recognises Killer's rebuilt log | (a) from its shape (no engine change); (b) an additive marker written by `generator/js/variants/killer.js` (an engine file changes; puzzles, regression hashes, qualification and cache keys do not) | 0 of 18 Killer requests; only when no sample reaches the band | (a) |
| O6 | Extras: marks on the slider for jump steps; a "show the proof on the board" view | (a) not in this change; (b) include (the proof view must rebuild the solver's state at the first use) | both researchers defer them | (a) |

---

## Appendix — Phase-3 experiments

All scripts are in `E\xreview\`. They load `generator/` and `core/` read-only through my phase-1 helpers `E\lib.js`
(the `SOURCE_FILES` order of `generator/tests/node-runner.js`) and `E\moves.js`, read gpt-6-astra's experiment folder
read-only, and write only their output files. Node v24.22.1.

| Script | What it does | Output |
|---|---|---|
| `p3-accounting.js` | today's missing tables recounted with sentences as non-tables; screens of my plan; flags from 0; null chosen scores | `out-p3-accounting.txt` |
| `converged.js` | the converged design: `rateAll` (R4), `select` (R6–R7, option `restart: 'fold'`), `display`, `repairPath`, `isJump` | module |
| `p3-synthetic.js` | their synthetic inputs, the guard of 1 check, rating calls for Greater-Than expert 42, a result without a log | `out-p3-synthetic.txt` |
| `p3-restart.js` | the synthetic restart under both readings of Q3 a | `out-p3-restart.txt` |
| `p3-converged.js` | 107 requests: compact, details and phase-1 views; tiers; audit; partial boards; wording checks; rebuilt logs; costs; sizes | `out-p3-converged.jsonl` (107 lines), `out-p3-converged.err` (empty) |
| `p3-summary.js` | the tables of §1, §2.6, §3 R6–R14 | `out-p3-summary.txt` |
| `p3-example.js` | the example: compact steps with P, W, E, V, R; ablations; partial boards; union of rows; details | `out-p3-example.txt` |
| `p3-example-counts.js` | gross and net changes of the example's compact steps | `out-p3-example-counts.txt` |
| `p3-vs-ga.js` | my `select` against their `cross-revised-selector.json` | `out-p3-vs-ga.txt` |
| `p3-easy3.js` | classic9 easy seed 3 (the guides' example) today, compact and details | `out-p3-easy3.txt` |
| `p3-flat.js` | why each compact step with an unchanged score was kept; the decreases of Killer nightmare 42 | `out-p3-flat.txt` |
| `p3-docfix.js` | applies the path rule of 15:58 to this file | — |

Commands, run from `E\`:

```text
node xreview\p3-accounting.js > xreview\out-p3-accounting.txt
node xreview\p3-synthetic.js > xreview\out-p3-synthetic.txt
node xreview\p3-restart.js > xreview\out-p3-restart.txt
node xreview\p3-converged.js > xreview\out-p3-converged.jsonl 2> xreview\out-p3-converged.err   # 98 s
node xreview\p3-summary.js > xreview\out-p3-summary.txt
node xreview\p3-example.js > xreview\out-p3-example.txt
node xreview\p3-example-counts.js > xreview\out-p3-example-counts.txt
node xreview\p3-vs-ga.js > xreview\out-p3-vs-ga.txt
node xreview\p3-easy3.js > xreview\out-p3-easy3.txt
node xreview\p3-flat.js > xreview\out-p3-flat.txt
```

Corpus of `p3-converged.js`: the example; their 25 requests (`sample.json` of their experiment folder); my 78 phase-1
requests (`E\out-sample.jsonl`); the three heavy requests of their 35 (Mega16 hell2 12, Samurai hell2 13, Killer hell2
16). The 35 common requests are the example, their 25, six of my 78 and those three. Generation took 94.9 s in all
(longest 12.66 s), with the generator's usual 120 s guard.

Raw results quoted:

```text
out-p3-accounting.txt  missing tables 316 of 1258 (25.12 %), 78 of 78 runs; plan screens 480 + 78 + 24 = 582
                       (5 / 7 / 10); jump flags 74, from 0: 10; guided single-move jumps 52, null chosen score 4
out-p3-synthetic.txt   overshoot: phase 1 0,23,44,100,400,992 | converged 0,23,44,100,200,400,992 (1 insertion)
                       phase end: phase 1 0,23,25,80 | converged 0,23,24,25,80
                       restart: phase 1 0,0,23,44,600,992 | converged 0,23,44,551,0,23,44,600,992
                       guard 1: phase 1 final null, segment "0, null" | converged capped 30, final 992
                       Greater-Than expert 42: 112 moves; phase 1 111 calls; converged 110 fresh ratings
                       no log: 1 move; converged display: solution 0, final 992
out-p3-restart.txt     keep: ..., guided 551, restart 0, ... | drops 1; fold: solution 0, restart 0, 23, 44, 600,
                       992, final 992 | drops 0
out-p3-summary.txt     107 requests: compact 779 (5/7/10), drops 0, jumps 84 in 76 runs, first rated 107,
                       one-line 124, avoidable 0, flat 17; phase 1 785 (5/7/11), drops 17 in 12 runs (-6.36 %);
                       details 6316 (22/33/135), drops 208 in 28 runs (-95.04 %), jumps 90, one-line 149
                       35 common: compact 243, drops 0, jumps 25 in 23 runs; phase 1 250, drops 8 in 5 runs
                       jump steps: one move 71 (culprit 42, together 21, in between 4, single sign 4), several 13
                       (folded peak 13, at or above the band maximum 8, clues shown again 3)
                       partial boards 146 ratings, 42.87 ms; folded excursions 45 in 27 runs, with reveals 9
                       wording: jump 84, solved without X 82, lighter only 0; one-line 124: 117, 16;
                       first rated 107: 107, 9; 630 solves 248.5 ms
                       rebuilt Killer logs 0 of 18; fresh 5911, memo 49, capped 0, stuck 0, counts 16 (9.13 ms),
                       ambiguous 0; rating 2691.31 ms, per puzzle median 3.14, p95 160.22, max 594.34 ms;
                       largest single 206.66 ms (mega16 hell2 12); sizes median 3005 B, max 20068 B,
                       compact only 995 / 1636 B
out-p3-example.txt     compact 0, 23, 44, 551, 568, 992, 992; 30 fresh ratings, 1.76 ms
                       44 -> 551: P 1 -> 360, W 43 -> 768.25, E 43 -> 45, V 41.4458 -> 42.3529,
                       R 1.3649 -> 148.3216; without Simple Colouring 1113 (W-Wing; NS 32, HSB 13, W-Wing 1);
                       lighter than 360 only: stuck; R1C2 alone 550, R9C8 alone 44
                       568 -> 992: P 360 -> 750, W 906.5 -> 806.75, R 163.33 -> 197.5453; without XYZ-Wing 1117
                       (W-Wing; NS 28, HSB 22, HSL 1, W-Wing 1); lighter than 750 only: stuck;
                       rows: visible +937, no longer used -513, total +424; details 33 steps, 0 drops
out-p3-example-counts  step 6: 5 exchanges, 10 removed and 10 shown again; step 4: 10 kept and 5 refused
out-p3-vs-ga.txt       GA revised selector vs converged compact: same 35 of 35
out-p3-easy3.txt       classic9 easy 3: today 9 steps; compact 7: 0, 14, 24, 34, 44, 46, 46; details 26
out-p3-flat.txt        17 unchanged-score steps: 10 end at the chapter's last move; 7 between two ends of a xR rise
                       or a phase run; Killer nightmare 42 details: 2997 -> 2780 (-7.24 %), 2788 -> 1940 (-30.42 %)
```

Repository state:

- At the start of this phase, `git status --short`: `?? docs/generation-steps/`; with `-uall`: my `1-report.md` and
  `2-review-of-gpt-6-astra.md`, gpt-6-astra's `1-report.md` and `2-review-of-claude-opus-5.5.md`. HEAD `8d9510a`,
  `git diff --name-only` empty.
- At the end (after writing this file), `git status --short`: `?? docs/generation-steps/`; with `-uall`, the same four
  files plus my `3-response-to-review.md` and gpt-6-astra's `3-response-to-review.md` (written in parallel, not read
  for this response); `git diff --name-only` empty; HEAD still `8d9510a`.
- No test suite, heavy test, hash update or browser script was run; no commit, stash or index change.
