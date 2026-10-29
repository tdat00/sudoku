# Generation Steps: a score table on every step, and scores that rise step by step — research report

- **Researcher:** claude-opus-5.5
- **Date:** 2026-10-28
- **Code examined:** `tdat00/sudoku` at commit `8d9510a` ("Add SEO and social sharing metadata…"). Research only:
  nothing in the repository was changed except this report's folder (`git status --short` was empty before; after,
  it lists only the new folder `?? docs/generation-steps/`, see the Appendix).
- **Scope:** how the Generation Steps replay of the generator builds its steps and their Difficulty Score tables today
  (Part A); why some steps have no table and why the score jumps, on the user's example (Classic 9×9, Expert, seed
  3275974478) and on a bounded sample of 78 requests over 5 variants and 4–6 levels, plus 10 heavy configurations
  (Part B); a redesign that keeps the generation algorithm and every puzzle bit for bit, puts a table on every step and
  makes the scores rise as evenly as the real generation allows, with alternatives, costs and prototypes (Part C);
  after the user's decision of 13:54 (a jump is accepted when no grouping or splitting of steps removes it, but the
  page must explain it), which jumps are unavoidable and how the page explains them (C11); the impact on the UI,
  strings, documents and quick tests (Part D); the decisions left to the user.
- **Conventions:** `path:line` is relative to the repository root at `8d9510a`. A **move** is one change of the board
  recorded in the dig log (a symmetric group removed or shown again, a sign removed, a local-search swap); a
  **position** is the board after a move (clues, and for Greater-Than the signs still present); a **step** is what the
  Generation Steps tab shows. **Score** is `SG.difficulty.rate(model, values).score` with every technique, the number
  the step table and the Summary show (`generator/js/engine/difficulty.js:442-453`). The **ratio** of a rise `a → b`
  is `max(b,10) / max(a,10)`; the user's wish 35 → 100 → 300 → 1000 is about ×3 per step. Times are Node 24.22.1, one
  process, AMD EPYC 7763 (16 logical processors); a phone is slower. Experiment scripts and raw outputs are outside the
  repository (Appendix).

---

## Executive summary

1. **The user's observation is confirmed exactly.** The example replays in 21 steps (`classic9`, `expert`, seed
   3275974478, score 992, 30 clues). Step 1 shows a sentence instead of a table; steps 2–10 show 18, 28, 34, 41, 44,
   551, 557, 567, 568; **steps 11–18 show no table**; step 19 shows **1849**; step 20 no table; step 21 shows 992
   (B1). An unlimited rating time changes nothing: none of these steps lost its table to the 400 ms budget.
2. **Four causes of a missing table** (B2). (a) Only steps of kind `random` and `guided` without signs are rated
   (`generator/js/ui/player.js:522`): every `reveal`, `clues`, `signDig` and every Greater-Than dig step has no table
   (steps 12, 14, 16, 18, 20 of the example). (b) The replay splits each **local-search swap** (remove a group, show
   another one again) into two steps (`player.js:281-289, 324-338`); the first shows a board the generator never had
   — in the example it has **2 solutions**, so the rating is not complete and the step has no table (steps 11, 13, 15,
   17). (c) The 400 ms wall-clock budget (`player.js:42, 525`): never hit in Node in the sample, but device-dependent.
   (d) The solution / cages / signs steps print "No solving technique is needed yet." instead of a table
   (`player.js:39`, `generator/js/ui/step-view.js:423-426`).
3. **The jump at step 19 is an artifact of the replay, not of the generator:** step 19 is the removal half of the
   fifth swap (unique, but rated 1849, in the *nightmare* band); the real move went 568 → 992 (×1.75). Worse, the
   same splitting can show a **table for a puzzle with two solutions**: `classic9` *hell1* seed 2400651925, step 35,
   is rated 3422 with a Unique Rectangle although it has 2 solutions (the finished puzzle is 2879).
4. **How general (78 requests, B5):** 214 of 1,258 steps (17 %) have no table today, in 21 of 78 runs; Greater-Than
   75–82 % of its steps, `classic9` *hell1* 37 % (one run has 106 steps, 49 without a table). Reasons: 205 kind not
   rated, 9 rating incomplete, 0 budget. The replay shows 10 positions with two solutions.
5. **The real jump is the first "hardest removal".** Random removals (stage A, until 38 of 81 cells are clues) leave
   puzzles that need only singles, scored by their empty cells (≤ 80, about 45 at 38 clues); the guided dig then takes
   the candidate that makes the puzzle hardest (`generator/js/engine/digger.js:773-790`), and one use of the hardest
   technique counts in full (P). In the example one removal (R1C2, R9C8) takes 44 → 551 (Simple Colouring); in 47 of
   52 hard-or-higher runs of the cell variants the largest rise of the whole dig is that first guided round
   (B3). Median largest rise between consecutive real positions: ×11.7 (`classic9` hard) to ×34.6 (nightmare).
6. **Requirement 3 cannot be met in general with real positions.** Re-cutting the steps cannot create a position that
   the dig did not visit, and the obvious substitute — supersets of the finished puzzle — is bimodal: for the example,
   all 2,151 tried supersets (1 to 8 groups shown again) score either ≤ 45 or ≥ 900; two other puzzles whose proofs
   also use Pointing, pairs and Simple Colouring give the same picture (C8). Only 15 of 78 runs can be shown with
   every rise ≤ ×3 in the real order (all at easy levels or Killer easy), 23 of 67 with the superset ladder.
7. **Proposal (Part C): a score-driven replay built from moves.** Replay the dig log move by move (a swap is one
   move), rate every position once with a deterministic work guard instead of a wall clock, and choose the steps among
   the rated positions: the move that jumps is a step of its own, every phase (random dig, hardest removals, search,
   clues shown again, signs) ends a step, inside a phase a step ends when the score has grown by an adaptive ratio
   (≈ 6 rises from 10 points to the final score, between ×1.3 and ×3), tiny steps are merged, and the shown score never
   drops by more than 10 % (larger excursions stay inside a step and are told in its text). No engine change. A jump
   that remains is unavoidable: one move, or a step whose inner boards are higher than its end (C11.1).
8. **Every step gets a table.** Of 5,162 positions rated in the prototypes (78 sample runs and 10 heavy runs), none
   lacked a complete proof or was ambiguous; the solution and structure steps get a table with total 0. Steps drop from
   9–106 (median 13) to 4–10 (median 7; Killer and Greater-Than add their cages/signs step).
9. **Example, before → after:** today 21 steps, 9 without a table, `—, 18, 28, 34, 41, 44, 551, 557, 567, 568, —×8,
   1849, —, 992`; proposed 7 steps, all with a table: **0, 23, 44, 551, 568, 992, 992** (solution, two batches of random
   removals, the hardest removal that needs Simple Colouring, three more hardest removals, five search swaps, the
   finished puzzle). The one real jump (44 → 551) stays, alone in its step, and the step explains it (item 13).
10. **Cost:** rating every position takes ≤ 10 ms for most 9×9 puzzles (max 148 ms), 0.1–0.4 s for Samurai, Killer
    and Greater-Than nightmare, 0.84 s for the slowest heavy case (mega16 hell2, of which 0.24 s is the finished puzzle,
    already rated by the generator); at most 134,627 budget checks per rating, so a guard of 1,000,000 never cuts a real
    position. Done in the page in slices; nothing is stored, exported or sent: cache, history, export, worker protocol,
    regression hashes, qualification and cache keys are untouched.
11. **Alternatives (C8):** a minimal fix of today's batches (tables everywhere, jumps and long plateaus stay; 16 steps
    for the example), a superset "difficulty ladder" (re-orders the removals; smoother for 22 of 67 runs, useless for
    most classic puzzles), an invented smooth path (not recommended), scores logged by the digger (an optimisation that
    touches the engine), a different dig (forbidden by requirement 1).
12. **Impact (Part D):** `generator/js/ui/player.js` (moves, ratings, segmentation, jump data), `step-view.js` (always
    a table, the change, the jump callout, a "preparing" state), CSS with existing colour tokens, about forty new
    strings in English and Vietnamese, `design.md` §7.1/§7.3/§10.5/§15.2, both user guides and both developer guides,
    the Help text of the replay; quick tests in `player.test.js` and `steps.test.js` rewritten around the new
    invariants. Main risk: users who expect smoothness still see one big rise on most hard puzzles — explained, not
    hidden (Decision 1, decided by the user on 13:54).
13. **Explaining the jumps that remain (user decision of 13:54; C11).** A step is a *score jump* when it rises at least
    ×3 (the user's own steady step) and by at least 100 points: 74 of the 402 changes of the sample, in 61 of 78 runs
    (none in 16 of the 17 easy runs). Each is unavoidable — 67 single moves, 7 steps whose inner boards are higher than
    their end; splitting a symmetric pair would soften only 3 of 55 and shows boards the generator never had — and each
    brings in a new hardest technique (in the median P is two thirds of the rise, R one third, V nothing). The step gets
    a badge, a callout "Why the score jumps here" (the move; the clue that causes it; what the other candidates of the
    round would have given; the technique now needed with its points and uses; P, W → R and V before → after; the
    level change; why it cannot be smaller; its first use), the row of that technique highlighted, the change in the
    Score column and in the help tips, and the clue framed on the board. Example, step 4: R1C2 alone gives 550 (R9C8
    only keeps the symmetry), the other 9 candidates at most 45, Simple Colouring 2 × 360 points: P 1 → 360,
    R 1.4 → 148.3, V 41.4 → 42.4, score 44 → 551 (×12.5), Very easy → Hard (C11.5). Cost at most 3.7 ms per jump.

---

## Part A — How the Generation Steps work today

### A1. From the dig to the result

- The digger records its decisions in a **dig log**, independent of the event trace
  (`generator/js/engine/digger.js:63-74`): `pass` (a pass starts, with the clue count), `accept` (a group removed),
  `reject` (a group put back, with the reason), `keep` (a guided candidate that could go but was not the hardest, with
  its objective score), `restart` (safety net), `reveal` (a group shown again: downward refinement, or the local search
  with `reason: 'search'`); Greater-Than adds `signs`, `clear` and sign verdicts. The recorder is `logTracer`
  (`digger.js:357-379`). "The log never feeds back into the algorithm."
- `generate` returns the log of the sample that became the puzzle; the pipeline publishes it as `result.digLog`
  (`generator/js/engine/pipeline.js:244`), `toWire` / `fromWire` carry it across the worker (`pipeline.js:303, 330`).
- The cache never stores it (`generator/js/ui/cache.js:205`); a cached puzzle gets its log from a background
  regeneration through `SG.app.attachTrace` (`generator/js/ui/app.js:858-873`). History stores only the configuration
  and seed (`generator/js/ui/history.js:1-9`); export has no dig log.

### A2. From the dig log to the steps

`app.js:634-638` `loadReplay` → `player.load(result)` → `SG.player.buildSteps(result)` (`player.js:77-173`, pure):

- `solution` (the full grid), then `cages` (Killer) or `signs` (Greater-Than), then `replayLog` (`player.js:175-399`),
  then `final` (the givens of the result, `player.js:155-171`).
- `replayLog` groups the log into **batches**: random removals until about a ninth of the board was tried
  (`batchCells(n) = max(2, round(n/9))`, `player.js:44-46`); one guided round per step on boards up to about 120 cells
  (`roundsPerStep(n) = max(1, round(n/81))`, `player.js:48-50`); signs `batchSigns(s) = max(4, round(s/8))`
  (`player.js:52-54`). `closeIfFull` (`player.js:281-289`) ends a batch; refusals after the last removal of a pass join
  the previous step (`mergeIntoLast`, `player.js:239-270`).
- Every `reveal` outside the Greater-Than opening **closes the pending batch and becomes a step of its own**
  (`player.js:324-338`; the comment at 330-331: "The pending batch shows the board after its own removals: it is
  closed before the clues of this step come back"). `restart` resets the board (`player.js:340-346`).
- Step kinds: `solution, cages, signs, clues, random, guided, signDig, reveal, restart, final` (`player.js:29-30`).

### A3. The score table of a step

- `SG.stepView.create(els.stepsRoot, { stats: p => player.rateStep(p) })` (`app.js:1083-1085`).
- `rateStep(p)` (`player.js:540-553`) returns `{ counts, before, empties, score }` from `techniquesAt(p)`
  (`player.js:512-535`), computed **lazily when the step is shown, on the main thread**, and cached in `rated`:
  - `RATE_FREE_KINDS = ['solution','cages','signs','restart']` (`player.js:39`) → `{ counts: {} }`;
  - `final` → the rating of the result (`player.js:519-521`);
  - `random` / `guided` **with `step.signs === null`** (`player.js:522`) → `SG.difficulty.rate` with a budget of
    `RATE_BUDGET_MS = 400` ms of wall clock (`player.js:42, 525`); an error or `rating.solved !== true` → null
    (`player.js:528-531`);
  - **every other kind → null** (`reveal`, `clues`, `signDig`, and all Greater-Than dig steps, whose `signs` is set).
- `before` is the last earlier step that has a rating (`player.js:544-551`); the "(+n)" of the uses column comes
  from it.
- `techniquesBlock` (`step-view.js:415-…`): `stats` null → **no table and no message** (`step-view.js:416-417`); no
  technique → the sentence "No solving technique is needed yet." (`step-view.js:423-426`) instead of a table.

### A4. The generation phases that make the trace

| Phase | Code | What the positions look like |
|---|---|---|
| Stage A, random dig | `digStageSteps` `digger.js:821-…`; hand-over at `round(0.47·n)` clues (`digger.js:602, 841`) | Each removal kept only if the level's techniques still finish the puzzle and the score stays under the band (`techniqueOracle`, `digger.js:290-…`); mostly singles-only |
| Stage B, guided dig | `digGuidedSteps` `digger.js:719-795` | Each round rates ≤ 32 candidates (fewer on big boards, `digger.js:754`) and takes the highest objective (`digger.js:773-790`) |
| Top tiers: proposal + downward refinement | `removalObjective` (proposal) `digger.js:654-…`, `refineDown` `digger.js:1100-1150` | DFS-unique removals, then groups shown again until the score falls into the band: the score goes **down** |
| Local search (an attempt without an exact sample) | `localSearchSteps` `digger.js:1320-1490`; log entries `entriesOf` `digger.js:1362-1371` | Removal, swap (remove + add) or addition; kept iff unique, completely rated, score not lower and under the band (`digger.js:1469`): plateaus |
| Greater-Than | `digSignsSteps` `generator/js/variants/greater-than.js:226-430` | Clues cleared, a few shown, signs removed with the level's techniques then for uniqueness only, clues shown again while too hard (up to 8 rounds): up and down |
| Killer layout search (keeper) | `generator/js/variants/killer.js:814-821` | A synthetic log that removes every group without a clue, in group order |

### A5. The score

`score = round(V + P + R)` with `V = 80·E/(E+40)` (empty cells, ≤ 80), `P` = the weight of the hardest technique used,
`R = 0.25·P·log2(1 + W/P)` (`difficulty.js:8-14`, `breakdown` `difficulty.js:233-…`). One use of a technique of
weight `w` adds at least `1.25·w`: Pointing 40, pairs 120–145, X-Wing 320, Simple Colouring 360, XY-Wing 650, XYZ-Wing
750, W-Wing 850, Forcing Chain 1100, Nishio 1700. The levels are score bands; Expert is [700, 1000). The formula and
the bands come from the rating study ([report-detailed.md](../../difficulty-rating/report-detailed.md)); the bands
used by the jump explanation (C11) are Very easy [0, 45), Easy [45, 180), Normal [180, 400), Hard [400, 700), Expert
[700, 1000), Master [1000, 1500), Nightmare [1500, 2400), Hell 1 [2400, 3600), Hell 2 from 3600
(`difficulty.js:104-114`).

---

## Part B — Diagnosis

### B1. The example, step by step

`SG.store.toConfig({ variantId: 'classic9', difficulty: 'expert', seed: '3275974478' })` gives the configuration the
page sends (`symmetry: 'rotational180'`, `digOrder: 'random'`, `maxAttempts: 8`, seed 3275974478); `SG.pipeline.run`
returns the same puzzle as the worker. Generation: 141 ms, 1 attempt, level *expert*, score 992, 30 clues; the finished
puzzle needs 29 Naked Singles, 21 Hidden Singles (box), 1 Hidden Single (line) and **one XYZ-Wing** (V = 44.8,
P = 750, W = 806.75, R = 197.5). The dig log has 74 entries: 1 random pass, 31 accepts, 14 rejects, 2 guided passes
(the second one is the local search's), 21 keeps, 5 reveals with `reason: 'search'`.

| # | Step today | What it does | Clues | E | Tab shows | Why | Rated without budget | Solutions |
|--:|---|---|--:|--:|---|---|---|--:|
| 1 | Full solution | the 81 values | 81 | 0 | sentence, no table | `RATE_FREE_KINDS` | 0 | 1 |
| 2 | Random removals | 10 removed | 71 | 10 | 18 | | 18 | 1 |
| 3 | Random removals | 9 removed | 62 | 19 | 28 | | 28 | 1 |
| 4 | Random removals | 8 removed, 2 put back | 54 | 27 | 34 | | 34 | 1 |
| 5 | Random removals | 10 removed | 44 | 37 | 41 | | 41 | 1 |
| 6 | Random removals | 6 removed, 4 put back | 38 | 43 | 44 | | 44 | 1 |
| 7 | Hardest removal | R1C2 R9C8 (15 rated, 5 refused) | 36 | 45 | **551** | | 551, Simple Colouring | 1 |
| 8 | Hardest removal | R3C3 R7C7 | 34 | 47 | 557 | | 557 | 1 |
| 9 | Hardest removal | R3C9 R7C1 | 32 | 49 | 567 | | 567 | 1 |
| 10 | Hardest removal | R4C1 R6C9 | 30 | 51 | 568 | | 568 | 1 |
| 11 | Hardest removal ("Rate 0 possible removals") | R1C9 R9C1 removed: swap 1, first half | 28 | 53 | **none** | rating incomplete | none (stuck) | **2** |
| 12 | More clues | R3C4 R7C6 shown again: swap 1, second half | 30 | 51 | **none** | kind not rated | 568 | 1 |
| 13 | Hardest removal | R3C4 R7C6 removed (swap 2) | 28 | 53 | **none** | rating incomplete | none | **2** |
| 14 | More clues | R1C7 R9C3 shown again | 30 | 51 | **none** | kind not rated | 568 | 1 |
| 15 | Hardest removal | R5C1 R5C9 removed (swap 3) | 28 | 53 | **none** | rating incomplete | none | **2** |
| 16 | More clues | R2C8 R8C2 shown again | 30 | 51 | **none** | kind not rated | 568 | 1 |
| 17 | Hardest removal | R1C7 R9C3 removed (swap 4) | 28 | 53 | **none** | rating incomplete | none | **2** |
| 18 | More clues | R1C9 R9C1 shown again | 30 | 51 | **none** | kind not rated | 568 | 1 |
| 19 | Hardest removal | R4C2 R6C8 removed (swap 5) | 28 | 53 | **1849** (Forcing Chain) | | 1849 | 1 |
| 20 | More clues | R1C8 R9C2 shown again | 30 | 51 | none | kind not rated | 992 | 1 |
| 21 | Finished puzzle | the puzzle | 30 | 51 | 992 (XYZ-Wing) | rating of the result | 992 | 1 |

The page's `rateStep` took at most 46 ms per step (step 17) in Node; with a 400 ms budget and with no budget the tab
shows exactly the same. The texts of steps 11–19 are also wrong: the removal half of a swap is told as "Rate 0 possible
removals (0 refused) and remove the one that makes the puzzle hardest" and the addition half as "The puzzle was still
too easy for this level: 2 clues shown again…" (`out-repro-texts.txt`). What the generator really did after step 10 is
five swaps whose positions score 568, 568, 568, 568 and **992**: the last real rise is ×1.75, not 568 → 1849.

### B2. Why steps have no table

| Cause | Code | Example | Sample (1,258 steps) |
|---|---|---|---|
| Kind never rated: `reveal`, `clues`, `signDig`, every Greater-Than dig step (`step.signs !== null`) | `player.js:522` | steps 12, 14, 16, 18, 20 | 205 steps; Greater-Than 132 of 168 steps |
| Rating incomplete on a position the generator never had (removal half of a swap) | split: `player.js:281-289, 347-364, 324-338`; null: `player.js:528` | steps 11, 13, 15, 17 (2 solutions each) | 9 steps, all with 2 solutions |
| Wall-clock budget of 400 ms | `player.js:42, 525, 529-531` | none | 0 in Node (slowest page rating 134 ms) |
| No technique yet: a sentence instead of a table | `player.js:39`, `step-view.js:423-426` | step 1 | every solution / cages / signs step |

Notes on the causes:

- **Why the split creates impossible boards.** The local search evaluates a swap as one candidate: the board with the
  group removed *and* the other group added is checked for uniqueness and rated (`digger.js:1440-1469`). Its log is
  `accept` then `reveal` (`digger.js:1362-1371`). The replay closes the guided batch on the accept (one round per step
  on 9×9) and then pushes the reveal as a new step, so the first step shows the board without either group — never
  checked, here ambiguous. On larger boards (`roundsPerStep > 1`) the same happens with several removals.
- **A table for an invalid board.** `classic9` *hell1* seed 2400651925, step 35 (28 clues): 2 solutions, yet
  `SG.difficulty.rate` completes with one Unique Rectangle (a technique that assumes uniqueness) and the page shows a
  table totalling **3422**; the finished puzzle is 2879 (`out-artifact.txt`).
- **The budget is a latent cause.** Positions of large boards cost up to 104 ms (Samurai nightmare), 128 ms (Killer
  hell2) and 243 ms (mega16 hell2) in Node; a phone 2–4× slower crosses 400 ms. It also makes the tables depend on the
  device: the same seed can show a table on a laptop and none on a phone.

### B3. Why the score jumps

**The guided dig jumps by design.** Stage A stops at 38 clues on 9×9 (`digger.js:602, 841`); its positions need
singles only, so their score is V plus a few points: 18, 28, 34, 41, 44 in the example. Stage B rates the candidates
and takes the highest (`digger.js:773-790`): in the first round of the example, of 15 candidates 5 were refused and 10
acceptable — 9 kept the score at 45 and one (R1C2, R9C8) needed Simple Colouring, 551 (log entries 27–41). The dig
takes it, and P = 360 counts in full. There is no position between 45 and 551 for the replay to show.

**Where the largest rise happens** (consecutive real positions, the 78 sample runs, `out-jumps.txt`):

| Group | Runs | Largest rise at | Median / max of the largest rise |
|---|--:|---|---|
| `classic9` hard, expert, master, nightmare, hell1 | 25 | first guided round 21, random dig of a top-tier proposal 2, refinement reveal 1, search swap 1 | ×11.7, ×19.2, ×20.5, ×34.6, ×25.7 / ×40.2 |
| `jigsaw9` hard, expert, nightmare | 9 | guided 9 | ×5.9, ×11.6, ×5.5 / ×13.5 |
| `samurai` hard, expert, nightmare | 9 | guided 9 | ×7.9, ×7.8, ×7.7 / ×13.5 |
| `killer` hard, expert, nightmare | 9 | guided 8, refinement reveal 1 | ×3.2, ×4.1, ×3.6 / ×11.0 |
| `greaterThan` easy, hard, expert, nightmare | 12 | starting clues 7, sign dig 3, clues shown again 2 | ×9.6, ×26.1, ×16.1, ×16.0 / ×29.2 |
| easy levels of the cell variants | 14 | random dig (×1.25) or one guided round (≤ ×2.7) | ≤ ×2.7 |

**Plateaus and drops.** The local search accepts swaps that leave the score unchanged (`digger.js:1469`: rejected only
when lower or too hard): 4 neutral swaps at 568 in the example, 45 at 2010 in `classic9` *hell1* seed 2299986211, whose
replay has 106 steps today. The score goes **down** where clues are shown again (top-tier refinement, Greater-Than
rounds) and where a guided objective (the level's techniques, no uniqueness assumption) differs from the full rating:
22 of 78 runs have at least one drop between consecutive steps when every step is rated.

### B4. Monotone? Unique? Solvable?

- **Not monotone** along the trace (22 of 78 runs drop at least once); the scoring header says so itself
  (`difficulty.js:17-19`).
- **Every real position is unique and completely rated.** Each kept removal passed an oracle: the technique oracle
  (unique and solvable with the level's techniques, `digger.js:290-…`), the DFS (proposals, `digger.js:247-…, 265-…`),
  or the local search's own check (`uniqueWithin`, `digger.js:983`) and rating. Rating every position of every run with
  all techniques: 0 of 4,483 positions (78 runs) and 0 of 679 (10 heavy runs) lacked a complete proof; the 48 positions
  whose proof used a Unique Rectangle were confirmed unique by a DFS count.
- **Replay artifacts are not:** the removal halves of swaps gave 10 positions with 2 solutions in the sample (9 without
  a complete proof, 1 "rated" 3422 through a Unique Rectangle).

### B5. How general — today's tab on the sample

78 requests (seeds: FNV-1a of `variant/level/k` on 20261028; `classic9` ×5 per level, the others ×3), rated as the page
does (`player.rateStep`, 400 ms) and with no budget (`out-sample-summary.md`):

| Variant, level | Runs | Steps (median / max) | Steps without table | Max rise shown (median / max) | Page rating time per run (sum; max one) |
|---|--:|---|---|---|---|
| classic9 easy | 5 | 9 / 9 | 0 of 45 | ×1.8 / ×1.8 | 0 ms; 0 ms |
| classic9 hard | 5 | 12 / 12 | 0 of 60 | ×11.7 / ×12.6 | 0 ms; 1 ms |
| classic9 expert | 5 | 12 / 13 | 0 of 61 | ×19.2 / ×20.1 | 1 ms; 1 ms |
| classic9 master | 5 | 12 / 18 | 6 of 65 (9 %) | ×20.6 / ×27.5 | 1 ms (max 74); 26 ms |
| classic9 nightmare | 5 | 13 / 14 | 3 of 63 (5 %) | ×34.6 / ×37.1 | 3 ms; 2 ms |
| classic9 hell1 | 5 | 12 / 106 | 67 of 180 (37 %) | ×25.7 / ×40.2 | 15 ms (max 454); 134 ms |
| jigsaw9 easy / hard / expert / nightmare | 12 | 9–15 | 1 of 159 | ×1.8 – ×11.6 / ×13.5 | ≤ 6 ms; 2 ms |
| samurai easy / hard / expert / nightmare | 12 | 9–16 | 4 of 155 | ×4.3 – ×13.4 / ×13.9 | ≤ 292 ms; 111 ms |
| killer easy / hard / expert / nightmare | 12 | 23–27 | 1 of 302 | ×2.6 – ×5.7 / ×11.0 | ≤ 116 ms; 100 ms |
| greaterThan easy | 3 | 12 / 18 | 33 of 42 (79 %) | ×9.6 / ×11.4 | 1 ms; 0 ms |
| greaterThan hard | 3 | 12 / 12 | 27 of 36 (75 %) | ×63.8 / ×64.7 | 2 ms; 0 ms |
| greaterThan expert | 3 | 12 / 15 | 30 of 39 (77 %) | ×98.8 / ×99.8 | 3 ms; 1 ms |
| greaterThan nightmare | 3 | 18 / 21 | 42 of 51 (82 %) | ×189.1 / ×239.0 | 34 ms (max 57); 13 ms |
| **all** | **78** | 9 / 13 / 106 (min / med / max) | **214 of 1,258 (17 %)**, in 21 runs | | |

Greater-Than's huge "max rise shown" comes from its tables being skipped: the tab goes from the 0 of the signs step
straight to the final score.

---

## Part C — Proposal: a score-driven replay built from moves

### C1. Requirements → principles

1. **Keep the algorithm and the puzzles** (requirement 1): everything happens in the page, after generation, from what
   the result already carries (`model`, `solution`, `givens`, `rating`, `digLog`). No change to the digger, the
   pipeline, the worker or the dig log: the regression hashes (givens, solution, regions, cages, signs, symbols:
   `generator/tests/fixtures/perf-helper.js:174-189`), the qualification, the cache keys (`cache.js:113-136`) and the
   history keys cannot change.
2. **A table on every step** (requirement 2): a step may only end on a position that has a complete logical proof (and
   is unique); the solution and structure steps get a table with total 0.
3. **Scores that rise step by step** (requirement 3, as far as the real generation allows): the steps are chosen by
   score, not by a fixed number of cells; the shown score never drops by more than 10 %; a jump the generator really
   made is a step of its own and the page explains it (accepted by the user on 13:54 when no grouping or splitting of
   steps removes it; C11).
4. **The steps stay true:** every board shown was a board of the generation, in the order the generator made it.

### C2. The move-level replay

Replay the dig log one board change at a time (prototype `moves.js`, `movesOf`):

| Move | From the log | Phase |
|---|---|---|
| `random` | `accept` in the random (or fallback) pass | random |
| `guided` | `accept` in the guided pass after its candidates (`keep` / `reject`) | guided |
| `searchRemove` | `accept` in a guided pass with no `keep` before it (the local search logs no candidates) | search |
| `swap` | `accept` immediately followed by `reveal` with `reason: 'search'`: **one move** | search |
| `searchAdd` | `reveal` with `reason: 'search'` alone | search |
| `reveal` | `reveal` without reason (refinement; Greater-Than "too hard") | reveal |
| `clues` | Greater-Than `clear` and the opening reveals, together | clues |
| `sign` | Greater-Than sign `accept` (`signs` or `signs.minimal` pass) | signs |
| `restart` | `restart` | start |

`reject` and `keep` entries change nothing on the board; they are counted on the next move (for the texts and the
"put back" frames). The example has 31 moves after the solution: 22 random, 4 guided, 5 swaps. Every one of the 78
sample logs and 10 heavy logs ends exactly on the result's givens.

### C3. Rating every position once

- Rate the position after every move with `SG.difficulty.rate` (as today), the final position with `result.rating`
  (never re-rated: it is the most expensive one), the solution and restart positions as 0.
- Replace the 400 ms wall clock by a **work guard**: `SG.budget.create({ nodes: 1000000 })`. The most a rating needed in
  the prototypes was 134,627 budget checks (the finished Killer hell2 puzzle; 123,742 mega16 hell2, 100,338 Samurai
  hell2; `out-nodes.txt`), so no real position is cut, and the steps are the same on every device.
- A rating whose proof used a technique that assumes uniqueness (`SG.difficulty.provesUniqueness` false) is confirmed by
  a DFS count (as the digger's keeper does); a position that fails either test cannot end a step.
- Greater-Than positions are rated with the signs still present at that move, the model the board already draws
  (`SG.greaterThan.withSigns(result.model, aliveSigns)`, as `player.js` does for display).
- In the page: in slices (a few ms each, `setTimeout` / idle callback) right after `load`; 9×9 boards finish within
  one slice. Until it is done the tab says "Preparing the steps… k of N", the board already shows the finished puzzle.

### C4. Choosing the steps

Among the **eligible** positions — rated, and not more than 10 % above any later rated position (so the shown scores
never drop by more than 10 %) — with `R = clamp((max(S_final,10)/10)^(1/6), 1.3, 3)` (≈ 6 rises to the final score;
×2.15 for the example) and a minimum gain of 10 points:

1. **Jumps stand alone:** when two consecutive eligible positions differ by ×R or more, both are step ends, so the move
   that jumps is a step of its own.
2. **Phases end steps:** the last eligible position of each phase (random, guided, search, reveal, clues, signs) ends a
   step.
3. **Geometric fill:** inside a stretch, a step ends at the first position whose score reached ×R and +10 points.
4. **No tiny steps:** a step that gained less than 10 points loses its end if that end came from rule 3 (it joins the
   next step); ends from rules 1 and 2 stay, so a short phase stays a step even when its score barely moves (the user
   accepts unchanged scores).
5. **The finished puzzle** stays a separate last step whose table is the Summary's.
6. **Excursions** (positions above the final band, then clues shown again) fall inside a step; its text names the peak.
   A `restart` (the safety net; not seen in the sample) is a step of its own with total 0 and the rest is chosen anew.

Structure steps (solution, cages, signs) are kept as today. All of this is pure and deterministic. A rise that
survives these rules cannot be removed by grouping or splitting steps (C11.1); the page explains it (C11).

### C5. What a step shows

- **Heading** "Step k – Title": one title per phase as today, plus **Search nearby** for swaps; a step that spans two
  phases joins the titles ("Hardest removals + More clues").
- **Summary line** with the score: "2 removed · 36 clues left · score 551 (+507)".
- **Sentence(s)**: per phase, the counts of the step (removed, put back and why, rounds and candidates rated, swaps,
  clues shown again, signs removed and kept). For a search step the board frames show the **net** change (cells that
  are empty now and were clues before the step, and the reverse); the sentence gives the gross counts.
- **Why the score rose**: a *score jump* (×3 and +100 points) gets the callout of C11; a smaller rise whose hardest
  technique is new and weighs at least 40 (Pointing) gets one line: "From this step on the puzzle needs XYZ-Wing
  (750 points per use): the score goes from 568 to 992."
- **Peak**, when the step contained a higher position: "On the way the puzzle became harder than this level (4337), so
  clues were shown again."
- **The table, always**: today's columns; the uses keep their "(+n)"; the Score column and the Total gain the change
  ("499 (+499)", "551 (+507)"). At score 0 a table with Empty cells 0 and Total 0 (the "No solving technique is needed
  yet." sentence can stay as a note).
- **Optional** (Decision 12): on a step that introduces a new hardest technique, highlight on the board the cells of
  its first use (one more solve with `collectSteps: true` for that step only).

### C6. Before and after for the example

| Today (21 steps) | | Proposed (7 steps) | |
|---|---|---|---|
| 1 Full solution | sentence | 1 Full solution | **0** |
| 2–6 Random removals ×5 | 18, 28, 34, 41, 44 | 2 Random removals: 14 cells | **23** (+23) |
| | | 3 Random removals: 29 cells, 3 groups put back | **44** (+21) |
| 7 Hardest removal | 551 | 4 Hardest removal: R1C2 R9C8 | **551** (+507), score jump explained (C11.5) |
| 8–10 Hardest removal ×3 | 557, 567, 568 | 5 Hardest removals: 3 rounds | **568** (+17) |
| 11–20 swaps split in 10 steps | none ×8, 1849, none | 6 Search nearby: 5 swaps, net R5C1 R5C9 R4C2 R6C8 removed, R2C8 R8C2 R1C8 R9C2 shown again | **992** (+424), "needs an XYZ-Wing" |
| 21 Finished puzzle | 992 | 7 Finished puzzle | **992** |

Rendered by the prototype (`render-after.js`, `out-render-example.txt`), English draft texts:

```
4. Hardest removal: 2 removed · 36 clues left · score 551 (+507)
   Rate 15 possible removals and remove the one that makes the puzzle hardest: R1C2, R9C8.
   From this step on the puzzle needs Simple Colouring (360 points per use): the score goes from 44 to 551.
   Naked Single                 32      1       32     6
   Hidden Single (box)    13 (+13)   1.25    16.25     3
   Simple Colouring         2 (+2)    360      720   499  hardest
   Empty cells                  45                    43
   Total                                             551  (+507)
6. Search nearby: 30 clues left · score 992 (+424)
   Still too easy: 5 times a pair of clues is removed and another one shown again, searching nearby for a
   harder puzzle.
   From this step on the puzzle needs XYZ-Wing (750 points per use): the score goes from 568 to 992.
   Naked Single 29 · Hidden Single (box) 21 · Hidden Single (row/column) 1 (+1) · XYZ-Wing 1 (+1)
   Empty cells 51 → 45 · Total 992 (+424)
```

The rise 44 → 551 (×12.5) remains: it is what the generator did in one move, and no position between them exists
(C8, C11.1). In the final design its "From this step on…" line becomes the score-jump callout of C11.5; step 6
(×1.75) keeps the one line. Compared with today, the 1849 artifact, the eight missing tables and the 568 plateau
disappear; the other rises are ×2.3, ×1.9, ×1.03 and ×1.75.

### C7. Results on the sample

Prototype `compare-sample.js` on the 78 requests (`out-compare-auto-summary.md`; "steps" include the solution and the
finished puzzle, Killer and Greater-Than add one cages/signs step):

| Variant, level | Steps today → proposed (median) | Max rise today → proposed (median) | Smallest possible (median / max) | Positions rated per run (median) | Rating all positions (median, max; slowest one) |
|---|---|---|---|--:|---|
| classic9 easy | 9 → 6 | ×1.8 → ×1.8 | ×1.3 / ×1.3 | 25 | 0.8 ms (1.1); 0.4 ms |
| classic9 hard | 12 → 7 | ×11.7 → ×11.7 | ×11.7 / ×12.6 | 28 | 0.9 ms (1.1); 0.3 ms |
| classic9 expert | 12 → 7 | ×19.2 → ×19.2 | ×19.2 / ×20.1 | 28 | 0.7 ms (1.1); 0.3 ms |
| classic9 master | 12 → 7 | ×20.6 → ×20.5 | ×20.5 / ×27.5 | 28 | 1.1 ms (1.4); 0.4 ms |
| classic9 nightmare | 13 → 7 | ×34.6 → ×34.6 | ×34.6 / ×37.1 | 29 | 2.7 ms (8.2); 1.9 ms |
| classic9 hell1 | 12 → 7 | ×25.7 → ×25.7 | ×25.7 / ×40.2 | 28 | 10.2 ms (147.9); 8.4 ms |
| jigsaw9 easy / hard / expert / nightmare | 9–15 → 6–9 | ×1.8–×11.6 → same | ×1.3–×11.6 / ×13.5 | 25–31 | ≤ 3.3 ms (4.5); 2.3 ms |
| samurai easy / hard / expert / nightmare | 9–16 → 8 | ×4.3–×13.4 → ×1.7–×7.9 | ×1.3–×7.9 / ×13.5 | 109–133 | 6.8–260.7 ms (405.7); 104.1 ms |
| killer easy / hard / expert / nightmare | 24–26 → 7–9 | ×2.6–×5.7 → ×2.6–×4.1 | ×2.6–×4.1 / ×11 | 39–41 | 3.6–9.2 ms (106.8); 93.6 ms |
| greaterThan easy / hard / expert / nightmare | 12–18 → 4–6 | ×9.6–×189 → ×9.6–×26.1 | ×9.6–×26.1 / ×29.2 | 104–110 | 11–157.7 ms (179.2); 13.4 ms |

- **Tables:** every proposed step has one (0 positions without a complete proof among 4,483).
- **Steps:** 4–10, median 7, against 9–106, median 13 today (558 steps in all instead of 1,258).
- **Rises:** the largest rise equals the smallest one the real order allows in 66 of 78 runs; in the other 12 (easy
  levels, two Killer nightmare) it is slightly larger because rule 3 groups small moves on purpose (×1.76 instead of
  ×1.25 on 9×9 easy). Distribution of the largest rise — today: ≤ ×2: 7, ×2–3: 4, ×3–5: 12, ×5–10: 14, ×10–20: 20,
  > ×20: 21; proposed: 10, 5, 10, 13, 25, 15 runs.
- **Drops:** 9 runs show a dip, all within the 10 % tolerance (e.g. Killer hard 615 → 608, Greater-Than expert
  1025 → 998); 22 runs drop when today's steps are all rated.
- **Heavy configurations** (`out-cost.txt`): mega16 expert 79 positions 13 ms; mega16 hell2 78 / 844 ms (243 ms is the
  finished puzzle); samurai hell2 134 / 291 ms; sohei hell1 106 / 356 ms; flower hell2 76 / 224 ms; killer hell2
  42 / 140 ms; butterfly nightmare 54 / 24 ms; mega12 hell2 46 / 48 ms; wordoku hell1 33 / 23 ms; diagonalX hell2
  31 / 40 ms; 0 positions without a proof; 6–9 steps.

### C8. Alternatives and trade-offs

**Why no re-cutting can satisfy requirement 3 everywhere.** Steps can only end on positions; between two consecutive
real positions there is nothing to show. The natural substitute is a *difficulty ladder*: the clues of the finished
puzzle given back in a chosen order, so every board is a superset of the puzzle (unique, rated). `supersets.js` rated
every superset with 1 or 2 groups given back and 600 random ones with 3, 5 and 8 groups:

| Finished puzzle (its harder techniques) | Supersets rated | Below 50 | 50 – 899 | ≥ 900 (or ≥ 500) |
|---|--:|--:|--:|--:|
| Example, 992 (one XYZ-Wing) | 2,151 | 2,119 | **0** | 32 |
| `classic9` expert 2478938795, 930 (Pointing, Simple Colouring, XY-Wing) | 2,206 | 2,001 | **0** | 205 |
| `classic9` hard 1940352050, 569 (Pointing, Box/Line, Simple Colouring ×2) | 2,151 | 2,103 | **0** (below 500) | 48 |

The hardest step of a guided-dig puzzle is its bottleneck: give back a clue that removes it and the rest becomes
singles. So for most hard classic puzzles no honest path rises evenly.

| Option | What changes | Requirement 2 | Requirement 3 | Truthful order | Cost | Verdict |
|---|---|---|---|---|---|---|
| A. Minimal fix of today's batches | rate every kind (Greater-Than with its sign model), keep a swap in one step, work guard instead of 400 ms, table at score 0 | yes | no: same jumps; plateaus stay (example: 16 steps, 0 … 44, 551, 557, 567, 568 ×5, 992, 992) | yes | lazy, as today | good first step if the user wants the least change |
| **B. Score-driven replay (this proposal)** | C2–C5 | yes | as far as the real order allows: largest rise = the unavoidable one in 66/78 runs; ≤ ×3 in 15/78; no drop > 10 % | yes | all positions up front: ≤ 10 ms on most 9×9, ≤ 0.85 s worst case | **recommended** |
| C. Superset ladder ("how the difficulty builds up") | display order chosen by score among supersets of the puzzle (`ladder.js`) | yes | ≤ ×3 in 23/67 runs; ≥ 1.5× smoother than B in 22/67 (jigsaw9 hard 2.61 vs 11.27, Samurai ≈ ×4 vs ×8); worse than B for the example (×24 vs ×12.5) and most classic puzzles | no: re-orders the removals, hides the guided dig and the search | 253–2,868 ratings per puzzle, 3–733 ms | not as default; possible as a second view |
| D. B or C per puzzle, whichever is smoother | both | yes | ≤ ×3 in 23/78 | depends on the puzzle | B + C | not recommended: the story changes from puzzle to puzzle |
| E. Invented smooth path (search for positions at 100, 300, … near the dig) | a display-only generator | yes | possible, not guaranteed | no: boards the generator never made | a search of thousands of ratings, unbounded success | not recommended |
| F. Scores logged by the digger | add the score the oracle / objective already computed to each `accept` | — | — | yes | no extra solve; the page rates only the step ends (≈ 7) | optional later optimisation of B; touches the engine log (not the puzzles), and the oracle's score differs from the full rating where a Unique Rectangle applies (master and up) |
| G. Dig towards an even rise | change the guided objective | — | — | — | — | forbidden by requirement 1 (new puzzles, hashes, qualification) |

### C9. Cost

| Item | Today | Proposed (B) |
|---|---|---|
| Ratings | lazily, one per step visited, on the main thread, ≤ 400 ms each (wall clock) | one per move once per load (25–134 per puzzle; the final reused), in slices, ≤ 1,000,000 checks each |
| Time (Node) | per step ≤ 134 ms in the sample | per puzzle: median ≤ 10 ms on 9×9, ≤ 148 ms; Samurai / Killer / Greater-Than nightmare 0.1–0.4 s; worst heavy case 0.84 s (0.6 s without re-rating the final) |
| Memory | one snapshot per step | one snapshot per move: ≤ 134 × 369 × 4 B ≈ 198 KB (Samurai), plus the technique counts; freed with the puzzle |
| Stored / exported data | none | none (no new field in the result, the cache, the history or the export) |
| Formats, keys, protocols | — | unchanged: `toWire`, worker messages, cache schema 2, history v1, regression hashes, qualification |
| Determinism | the tables depend on the device (wall clock) | the same steps and tables everywhere |
| Jump explanation (C11) | — | per jump: 2 partial ratings (default symmetry; at most 14 for groups of 4) and one solve with steps; ≤ 3.7 ms per jump, 34.8 ms for the 74 jumps of the sample; nothing stored |

### C10. Implementation outline (for a later phase)

1. `generator/js/ui/player.js`: `movesOf(result)` (pure; replaces the batching of `replayLog`), `rateMoves`
   (resumable, work guard, uniqueness confirmation), `segment(moves, scores)` (pure, C4), `buildSteps(result, ratings)`
   building display steps (same step object, plus `rating`, `before`, `peak`, `newHardest`, and on a score jump
   `jump`: ratio, move, cause from the partial boards, the round's `keep` scores, both breakdowns; C11);
   `rateStep(p)` returns the precomputed rating; `RATE_BUDGET_MS`, `batchCells`, `roundsPerStep`, `batchSigns` go.
   `load` starts the rating job; `state()` gains `ready`.
2. `generator/js/ui/step-view.js`: a table at score 0, the change in the Score column, the "rise" and "peak" lines,
   the score-jump badge and callout (`jumpBlock`), the highlighted row, "at the previous step" in the help tips, the
   `cause` mark and its legend entry, the "Preparing the steps…" state; `generator/css/steps.css` and
   `core/css/board.css` with existing colour tokens only.
3. `generator/js/ui/app.js`: only waits for `ready` before enabling the replay controls (the board already shows the
   finished puzzle). No change to the engine, the variants, the worker, the cache, the history or the export.
4. Strings, documents and quick tests as in Part D. A new engine file is not needed; if the pure functions are moved
   to `generator/js/engine/`, the script lists of `index.html`, `tests.html`, `tests/node-runner.js` and
   `js/worker/gen.worker.js` must list it (`ui-contract.test.js`).

### C11. Explaining a jump that cannot be avoided (user decision of 13:54)

The user accepted (13:54) that a step may still jump **when no further grouping or splitting of the steps removes
it**, provided that the page tells the player **why** the score jumps there. This section makes "cannot be removed"
precise (C11.1), fixes when a step counts as a jump (C11.2), and designs what the explanation says (C11.3), where it
appears (C11.4), the example (C11.5), the other boards (C11.6) and the cost (C11.7). Prototypes: `jump-explain.js`,
`jump-summary.js` and `jump-light.js`, on the example and on the 78 sample requests. The scores stay the real
ratings of boards the generator really had.

#### C11.1 Which jumps are unavoidable

1. **Grouping never helps:** joining steps can only make a rise larger.
2. **Splitting by moves is already exhausted by C4.** Rule 1 gives every move that rises by ×R or more (R ≤ 3) a step
   of its own and rule 3 cuts every stretch at ×R, so a step that still rises by ×3 or more is either **one move**
   (67 of the 74 jumps of the sample) or a step whose inner boards are **all higher than its end** (7 of 74: their 1
   to 101 inner boards score 146 to 4,337 against ends of 134 to 2,022, none unrated; `out-jump-multi.txt`), which
   cannot be shown without a fall of more than 10 % right after the jump (Decision 3).
3. **Splitting inside a move almost never helps.** A move removes a symmetric group: 2 cells with the default
   rotational symmetry, at most 4 (`generator/js/engine/symmetry.js:12-31`). Showing its cells one at a time shows a
   board the generator never had, without the symmetry the user chose. Rating every such partial board for the 55
   jump moves that allow it (54 pairs, 1 swap): only 3 get a board in between that makes the larger half-rise 1.5
   times smaller, and only 2 fall below ×3 (Jigsaw nightmare 46 → 136 → 252, Killer expert 168 → 340 → 533). In the
   example the halves score 550 (R1C2 alone) and 44 (R9C8 alone): no board lies between 44 and 551.
4. **Re-ordering** the removals is not a regrouping (it changes the story) and does not help either: the supersets of
   the finished puzzle are bimodal (C8; none of 2,151 between 45 and 900 for the example).
5. **The generator makes the jump on purpose.** For a guided move the dig log keeps the other candidates of the round
   with the score the digger gave them (`keep` entries; the choice is `digger.js:773-790`). In 35 of the 52 guided jump
   moves every other candidate stays within 10 % of the rise (example: 15 candidates, 5 refused, the other 9 at most
   45); in 8 another candidate covers at least half of the rise too; 4 rounds had a single candidate. At such a round
   the hardest removal is the only way up, and requirement 1 keeps the guided dig as it is.

So every jump that C4 leaves is unavoidable in the user's sense, and requirement 3 holds everywhere else.
Recommended: keep symmetric groups whole (Decision 11) and use the partial boards only to **name the clue that causes
the jump** (C11.3).

#### C11.2 When a step is a "score jump"

A step is a **score jump** when its score is **at least 3 times** that of the step before (a score below 10 counts as
10, as for every ratio in this report) **and at least 100 points higher**.

- ×3 is the rise the user calls steady (35 → 100 → 300 → 1000 is ×2.9, ×3.0, ×3.3) and the largest the segmentation
  aims at (R ≤ 3), so every flagged step is one that C11.1 shows to be unavoidable.
- The 100-point floor keeps quiet the small rises at the start (Greater-Than easy 0 → 96, Killer nightmare
  25 → 102); it is less than the width of the Easy band (45 to 180).
- It depends on the two shown scores only: deterministic, no extra rating.

| Rule (sample: 402 changes between shown steps, 78 runs) | Steps flagged | Comment |
|---|--:|---|
| **×3 and +100 points (recommended)** | **74**, in 61 runs (one in 48 runs, two in 13) | none in 16 of the 17 easy runs and in Jigsaw expert 4171007542 (0, 23, 44, 49, 115, 311, 714) |
| ×3 only | 79 | adds 5 small rises of +45 to +96 points |
| ×2 and +100 points | 89 | adds rises the user calls steady, e.g. 516 → 1444 (×2.8) |
| ×R, the segmentation's ratio (1.3 to 3) | 223 | more than half of the rises: no longer an exception |
| two levels apart or more | 74 (64 jumps + 10 others) | misses 10 jumps that move up one level only (e.g. Easy → Normal, ×5.5) |

What the 74 jumps have in common (`out-jump-summary.txt`): every one brings in a **new hardest technique** (74 of 74;
Simple Colouring 21, Forcing Chain 14, XY-Wing 13, Naked Pair 6, Rule of 45 6, Box/Line 4, W-Wing 3, Hidden Pair 2,
Inequality Chain 2, X-Wing 1, Nishio 1, Cage Splitting 1); in the median two thirds of the rise is P (the new weight,
counted in full) and one third R (its uses), the empty cells V add nothing (median shares 0.67, 0.33, 0.001);
×3.02 to ×40.2 (median ×11.0), +115 to +1,960 points (median +521); 64 of 74 skip at least one whole level; the first
jump is the largest rise of its run in 57 of 61 runs. Every change that is not flagged is at most ×2.91, apart from the
5 small rises above.

Below the rule nothing is hidden: a rise that brings a new hardest technique of 40 points or more gets the one line of
C5 (`replay.rise`; 61 steps of the sample, e.g. the example's 568 → 992 "needs XYZ-Wing"); every step shows its
change in the Score column; a small dip (13 in 9 runs, at most −6.0 %) gets the line `replay.dip` (D2).

#### C11.3 What the explanation says

It uses the ratings of the step's two end boards (C3), the dig log entries of the move, and for a jump only: the
2^k − 2 partial boards of a group of k ≥ 2 cells (2 ratings with the default symmetry) and one solve of the end board
with `collectSteps: true` for the first use of the new technique (`generator/js/engine/difficulty.js:442-453`). In
this order (keys and both languages in D2):

1. **The move** (`steps.jump.move.*`): the clues removed — a pair "together, to keep the symmetry", a single clue, a
   search swap (removed and shown again), a Greater-Than sign ("the sign between R3C5 and R3C4"), the Greater-Than
   opening ("emptied the grid except 22 clues; from now on the signs do most of the work"). For a step of several
   moves (the step sentence lists them), why they are not separate steps: "on the way the puzzle reached 2714, more
   than at the end of the step; the score would go down".
2. **The clue that causes it** (pairs and larger groups): one cell alone reaches at least 90 % of the rise on the log
   scale → "Removing R1C2 alone already gives 550; R9C8 went with it only for the symmetry" (36 of the 54 pairs of the
   sample); every cell alone stays within 10 % → "it takes both" (14); otherwise the scores one at a time (4).
3. **The generator's choice**: for a guided move, "In this round the generator rated 15 possible removals (5 refused):
   the other 9 would have given at most 45. At this level it takes the one that makes the puzzle hardest." (48 of the
   52 guided jumps have other candidates); for a random move (2 jumps), "picked at random: the puzzle can still be
   finished with the techniques of this level".
4. **Before**: the hardest technique, score and level before the step ("singles were enough … score 44, Very easy";
   "Box/Line Reduction, 50 points per use"; for the Greater-Than opening "the grid was full: nothing to solve").
5. **After**: the technique the puzzle can no longer be finished without, with its points per use and its uses — the
   one that sets P; the other new techniques are marked in the table. If the hardest technique did not change (never
   in the sample): "still X, but needed n times instead of m".
6. **The formula**: P before → after (the hardest weight counts in full), W before → after and hence R, E (empty
   cells) before → after and hence V, the score and the ratio — the numbers of the table's help tips, so the sum can
   be checked by hand.
7. **The level**: "from Very easy to Hard" when the level changes.
8. **Why not smaller** (single moves): "the smallest change the generator made, and no board in between is easier".
9. **First use** (Decision 12): the solver's own sentence for the first use of the new technique, which exists in both
   languages already (`technique.<id>.step*`, e.g. `generator/js/ui/locale.en.js:401-407`,
   `generator/js/ui/locale.vi.js:388-394`), shown folded.

#### C11.4 Where it appears

| Place | What | Built from |
|---|---|---|
| Step heading | badge "Score jump ×12.5" after "Step 4 – Hardest removal" (visible text, not colour alone) | `steps.jump.badge`; `renderHeading` (`step-view.js:322-330`) |
| Summary line | "2 removed · 36 clues left · score 551 (+507)", on every step | `replay.meta.score` (D2) |
| Callout under the step sentence | title "Why the score jumps here", sentences 1–8, the first use folded (`<details>`) | new `jumpBlock(position)` inserted between the text and the table (`step-view.js:534-537`); `<aside role="note">` styled with the existing `--sg-color-warning` / `--sg-color-warning-bg` tokens (light and dark) in `generator/css/steps.css` |
| Score table | the row of the technique that causes the jump highlighted, with "causes the jump" in its accessible name; techniques new at this step marked "new"; the change in the Score column ("499 (+499)", Total "551 (+507)") on every step | `techniquesBlock` (`step-view.js:415-518`); class `result-table__row--jump` |
| Help tips of the table | the highlighted row and the Total add a line "At the previous step" and the change | `scoreTip` (`step-view.js:84-140`) given the previous table |
| Board | the clue that causes the jump framed with a new mark `cause` and a legend entry; the other cells of the move keep the "Removed in this step" frame; optional: the cells of the first use, as the hint highlights | `LEGEND` (`step-view.js:28-30`); `.hl.cell--cause` next to the replay frames of `core/css/board.css:221-240`, with the existing `--sg-board-backtrack` |
| Step slider (optional) | a mark on the jump steps | Decision 13 |

#### C11.5 The example: step 4, 44 → 551

As rendered by `jump-explain.js` (`out-jump-example.txt`), English:

```text
Step 4 – Hardest removal                                                        [ Score jump ×12.5 ]
2 removed · 36 clues left · score 551 (+507)
Rate 15 possible removals (5 refused) and remove the one that makes the puzzle hardest: R1C2, R9C8.

▌ Why the score jumps here
▌ This step is a single move of the generator: it removed the clues at R1C2 and R9C8 together, to keep the
▌ symmetry. Removing R1C2 alone already gives 550; R9C8 went with it only for the symmetry.
▌ In this round the generator rated 15 possible removals (5 refused): the other 9 would have given at most 45.
▌ At this level it takes the one that makes the puzzle hardest.
▌ Before this step, singles were enough to finish the puzzle (score 44, Very easy).
▌ After it, the puzzle cannot be finished without Simple Colouring: 2 uses at 360 points each.
▌ The hardest technique counts in full: P 1 → 360 (+359). The work W grows from 43 to 768.25, so the work term
▌ R goes from 1.4 to 148.3 (+147). Empty cells: E 43 → 45, so V 41.4 → 42.4 (+0.9). Score 44 → 551 (+507, ×12.5).
▌ In this one step the puzzle goes from Very easy to Hard.
▌ It cannot be shown in smaller steps: this is the smallest change the generator made, and no board in between
▌ is easier.
▌ ▸ First use: Simple Colouring on 3 (colour trap): colour 1 is R2C4, R6C6, R8C5, R9C2, colour 2 is R2C6, R5C5,
▌   R6C3, R9C4. One of the two colours holds the digit, and a cell outside the chain sees both colours, so it
▌   cannot be 3. 3 is removed from such cells.

Techniques needed at this step               n        w          W             q
 Technique
   Naked Single                             32        1         32        6 (+4)
   Hidden Single (box)       new      13 (+13)     1.25      16.25        3 (+3)
 ▶ Simple Colouring          new        2 (+2)      360        720    499 (+499)   ← causes the jump
 Other
   Empty cells                         45 (+2)                           43 (+1)
 Total                                                      768.25    551 (+507)

Tip of 499:  Hardest technique: its points in full + its share of the work term = 360 + 139.01 = 499.01 ≈ 499.
             At the previous step: 0 (not needed).
Tip of 551:  S = V + P + R = 42.35 + 360 + 148.32 = 550.67 ≈ 551.
             At the previous step: 41.45 + 1 + 1.36 = 43.81 ≈ 44. Change: +507.
Board:       R1C2 framed "Removing this clue causes the jump"; R9C8 framed "Removed in this step".
```

Vietnamese (the callout):

```text
Bước 4 – Xóa ô làm đề khó nhất                                                [ Điểm tăng vọt ×12,5 ]
▌ Vì sao điểm tăng vọt ở đây
▌ Bước này là một thao tác duy nhất của trình sinh đề: xóa cùng lúc các số cho sẵn ở R1C2 và R9C8 để giữ
▌ đối xứng. Chỉ riêng việc xóa R1C2 đã cho 550 điểm; R9C8 bị xóa theo chỉ để giữ đối xứng.
▌ Ở vòng này trình sinh đề đã chấm 15 cách xóa (5 bị loại): 9 cách còn lại cho tối đa 45 điểm. Ở mức này nó
▌ chọn cách làm đề khó nhất.
▌ Trước bước này, chỉ cần các kỹ thuật số đơn là giải xong đề (điểm 44, mức Rất dễ).
▌ Sau đó, đề không thể giải xong nếu không dùng Tô màu đơn giản (Simple Colouring): 2 lần, mỗi lần 360 điểm.
▌ Kỹ thuật khó nhất được tính đủ điểm: P 1 → 360 (+359). Khối lượng W tăng từ 43 lên 768,25 nên phần khối
▌ lượng R đi từ 1,4 lên 148,3 (+147). Ô trống: E 43 → 45 nên V 41,4 → 42,4 (+0,9). Điểm 44 → 551 (+507,
▌ ×12,5).
▌ Chỉ trong bước này, đề đi từ mức Rất dễ lên mức Khó.
▌ Không thể chia nhỏ hơn: đây là thay đổi nhỏ nhất mà trình sinh đề đã làm, và không có bàn cờ nào ở giữa
▌ dễ hơn.
▌ ▸ Lần dùng đầu tiên: Tô màu đơn giản cho 3 (bẫy màu): màu 1 là R2C4, R6C6, R8C5, R9C2, màu 2 là R2C6,
▌   R5C5, R6C3, R9C4. Một trong hai màu chứa chữ số này, mà một ô ngoài chuỗi lại nhìn thấy cả hai màu, nên ô
▌   đó không thể là 3. 3 bị loại khỏi những ô như vậy.
```

The sums check: +359 (P) + 147.0 (R) + 0.9 (V) = +506.9, and the unrounded totals 43.81 → 550.67 round to 44 → 551.
The other steps of the example get no callout: step 2 (0 → 23, ×2.3), step 3 (×1.9), step 5 (551 → 568, ×1.03) and
step 6 (568 → 992, ×1.75, +424) are below ×3; step 6 gets the `replay.rise` line "From this step on the puzzle needs
XYZ-Wing (750 points per use): the score goes from 568 to 992." / "Từ bước này đề cần đến kỹ thuật XYZ-Wing (750 điểm
mỗi lần dùng): điểm tăng từ 568 lên 992."

#### C11.6 Killer, Greater-Than and multigrid boards

| Request | Step | Move | Cause and choice shown | New technique (points × uses) | P / R / V change | Level |
|---|---|---|---|---|---|---|
| Killer hard 2449675408 | 172 → 615 (×3.6) | R1C2 + R9C8 | R9C8 alone 548; the other 2 candidates up to 573 (they jump too) | Rule of 45 (260 × 16) | +210 / +232.6 / +0.5 | Easy → Hard |
| Killer expert 3530981909 | 162 → 905 (×5.6) | R3C6 + R7C4 | one at a time 528 and 163; other 3 candidates up to 163 | Cage Splitting (520 × 1) | +470 / +272.4 / +0.5 | Easy → Expert |
| Greater-Than hard 3115968914 | 130 → 649 (×5.0) | the sign between R3C5 and R3C4 | one sign: nothing to split | Simple Colouring (360 × 2) | +320 / +199.4 / 0 | Easy → Hard |
| Greater-Than hard 3099191295 | 0 → 271 (×27.1) | the opening: grid emptied except 22 clues | "the signs do most of the work" | Naked Pair (120 × 2) | +120 / +103.6 / +47.7 | Very easy → Normal |
| Greater-Than hard 3115968914 | 0 → 134 (×13.4) | 64 moves (opening and 63 signs) | "reached 154 on the way" | Inequality Chain (40 × 19) | +40 / +47.3 / +47.0 | Very easy → Easy |
| Samurai expert 4262381150 | 72 → 975 (×13.5) | G1-R9C3 + G4-R1C7 | G4-R1C7 alone 974; the other 5 candidates up to 73 | XY-Wing (650 × 1), first use in grid 4 | +648.5 / +253.5 / +0.1 | Easy → Expert |
| Jigsaw nightmare 3962167687 | 46 → 252 (×5.5) | R1C4 + R9C6 | one at a time 136 and 47; other 12 up to 47 | Naked Pair (120 × 1) | +118.5 / +86.2 / +0.8 | Easy → Normal |
| Classic 9×9 master 3393461861 | 42 → 861 (×20.5) | R2C9 + R8C1, random | "it takes both" (43 and 43); "picked at random" | XY-Wing (650 × 1) | +649 / +169.1 / +1.0 | Very easy → Expert |
| Classic 9×9 nightmare 1191943706 | 126 → 1926 (×15.3) | 2 moves (removal, clues shown again) | "reached 2714 on the way" | Forcing Chain (1100 × 4) | +1050 / +750.8 / 0 | Easy → Nightmare |

- **Killer** (11 jumps in 9 of 12 runs): the cages step is a structure step (score 0, C5), so the first rises come
  from the empty cells and Cage Sum Combination (40 points); the jumps come with Rule of 45 (6), Forcing Chain (3),
  Cage Splitting (1) and Simple Colouring (1). The move, the cause and the choice read as for 9×9; the first-use
  sentence names the cage ("The cage with sum 38 sticks out of B1 and splits in two …"), which is what a Killer
  player needs. Optional: the cell names in the callout followed by their cage sum.
- **Greater-Than** (17 jumps in 10 of 12 runs): 10 are the opening (6 single moves that empty the grid except 18 to
  34 clues, the signs doing the work; 4 steps that also hold sign removals and went higher on the way), 6 are one
  removed sign, 1 is a run of sign removals followed by clues shown again. A sign cannot be split, so sentence 2 is
  left out; the board already frames the removed sign (`signRemoved`); the ratings are those of the model with the
  signs still present (C3), so the explanation needs nothing more.
- **Multigrid** (Samurai: 11 jumps in 9 of 12 runs): cell names carry the sub-grid (`G4-R1C7`,
  `core/js/engine/model.js:472-490`); a symmetric pair can sit in two sub-grids (G1-R9C3 with G4-R1C7, mirrored about
  the canvas centre), and the callout says which cell causes the jump and, through the first use, in which sub-grid
  the new technique is needed (G4).

#### C11.7 Cost

- Per jump: 2^k − 2 partial ratings (2 by default, at most 14 for a group of 4) and one solve with steps; the round's
  other candidates are read from the dig log (no rating). Measured: partial ratings at most 3.7 ms per jump, 34.8 ms
  for all 74 jumps of the sample; the first-use solve 0.4 to 2.4 ms on the 10 boards of C11.5–C11.6 (0.5 ms for the
  example). Done at the end of the rating job of C3, or lazily when a jump step is first shown.
- Nothing is stored, exported or sent; no engine change (the `keep` scores are already in the dig log); about thirty
  new strings in each language (D2).

---

## Part D — Impact

### D1. What the user sees

- Fewer, meaningful steps (example 21 → 7; median 13 → 7; the 106-step `classic9` hell1 replay → 7) and fewer notches
  on the slider; every step with its table; the Total shows the change from the step before.
- The steps follow the score: random removals in 2–4 steps, the hardest removal that introduces a technique alone,
  "Search nearby" in one step instead of pairs of misleading steps, Greater-Than's sign batches with tables.
- A **score jump** (×3 and +100 points: one or two on most hard puzzles, none on most easy ones) carries a badge and a
  callout that says which move and which clue caused it, what the generator could have done instead, which technique
  the puzzle now needs and how P, R and V add up to the new score; that technique's row is highlighted, the help tips
  give the previous step's numbers, and the clue is framed on the board (C11). A smaller rise with a new technique gets
  one line; a step that went above the level and came back says so.
- On big boards the steps appear after a short "Preparing the steps…" (Node: ≤ 0.85 s worst case, ≤ 0.4 s for
  Samurai / Killer / Greater-Than nightmare; a phone slower); the finished puzzle is on screen at once as today.

### D2. Strings (`SG.i18n.t()`, English and Vietnamese, drafts)

| Key | English | Tiếng Việt |
|---|---|---|
| `replay.title.search` | Search nearby | Tìm quanh đó |
| `replay.title.guided.many` | Hardest removals | Các lần xóa ô làm đề khó nhất |
| `replay.search` | Still too easy for this level: {swaps} times a group of clues is removed and another one shown again while searching nearby for a harder puzzle. | Đề vẫn dễ hơn mức đã chọn: {swaps} lần bỏ một nhóm số cho sẵn và hiện lại một nhóm khác để tìm quanh đó một đề khó hơn. |
| `replay.rise` | From this step on the puzzle needs {technique} ({points} points per use): the score goes from {from} to {to}. | Từ bước này đề cần đến kỹ thuật {technique} ({points} điểm mỗi lần dùng): điểm tăng từ {from} lên {to}. |
| `replay.peak` | On the way the puzzle became harder than this level ({peak}), so clues were shown again. | Giữa chừng đề đã khó hơn mức đã chọn ({peak}) nên một số số cho sẵn được hiện lại. |
| `replay.meta.score` | score {score} ({delta}) | điểm {score} ({delta}) |
| `replay.join` | {first} Then {second} | {first} Sau đó {second} |
| `steps.preparing` | Rating the puzzle of every step… {done} of {total} | Đang chấm điểm đề ở từng bước… {done}/{total} |
| `steps.techniques.change` | Change from the previous step | Thay đổi so với bước trước |
| `replay.dip` | The score goes down a little ({from} → {to}): after this change the solver finds an easier way through the puzzle. | Điểm giảm nhẹ ({from} → {to}): sau thay đổi này bộ giải tìm được cách giải dễ hơn. |
| **Score jump (C11)** | | |
| `steps.jump.badge` | Score jump ×{ratio} | Điểm tăng vọt ×{ratio} |
| `steps.jump.title` | Why the score jumps here | Vì sao điểm tăng vọt ở đây |
| `steps.jump.move.group` | This step is a single move of the generator: it removed the clues at {cellList} together, to keep the symmetry. | Bước này là một thao tác duy nhất của trình sinh đề: xóa cùng lúc các số cho sẵn ở {cellList} để giữ đối xứng. |
| `steps.jump.move.cell` | This step is a single move of the generator: it removed the clue at {cell}. | Bước này là một thao tác duy nhất của trình sinh đề: xóa số cho sẵn ở {cell}. |
| `steps.jump.move.swap` | This step is a single move of the generator: it removed the clues at {removedList} and showed {addedList} again. | Bước này là một thao tác duy nhất của trình sinh đề: xóa các số cho sẵn ở {removedList} và hiện lại {addedList}. |
| `steps.jump.move.sign` | This step is a single move of the generator: it removed the sign between {cellA} and {cellB}. | Bước này là một thao tác duy nhất của trình sinh đề: bỏ dấu giữa {cellA} và {cellB}. |
| `steps.jump.move.clues` | This step is a single move of the generator: it emptied the grid except {clues}; from now on the signs do most of the work. | Bước này là một thao tác duy nhất của trình sinh đề: xóa trống lưới, chỉ giữ {clues}; từ đây các dấu gánh phần lớn việc giải. |
| `steps.jump.move.peak` | This step has {moves} moves. On the way the puzzle reached a score of {peak}, more than at the end of the step, so the boards in between are not shown on their own: the score would go down. | Bước này gồm {moves} thao tác. Giữa chừng đề đã lên tới {peak} điểm, cao hơn ở cuối bước, nên các bàn cờ ở giữa không được tách thành bước riêng: điểm sẽ bị giảm. |
| `steps.jump.culprit` | Removing {culprit} alone already gives {culpritScore}; {others} went with it only for the symmetry. | Chỉ riêng việc xóa {culprit} đã cho {culpritScore} điểm; {others} bị xóa theo chỉ để giữ đối xứng. |
| `steps.jump.together` | Removing only one of these clues would give {partScores}: it takes all of them to make {technique} necessary. | Nếu chỉ xóa một trong các số này thì điểm là {partScores}: phải xóa tất cả mới cần đến {technique}. |
| `steps.jump.parts` | Removing them one at a time would give: {partList}. | Nếu xóa từng số một thì điểm là: {partList}. |
| `steps.jump.choice_one` | In this round the generator rated {rated} possible removals ({refused} refused): the other one would have given {otherMax}. At this level it takes the one that makes the puzzle hardest. | Ở vòng này trình sinh đề đã chấm {rated} cách xóa ({refused} bị loại): cách còn lại chỉ cho {otherMax} điểm. Ở mức này nó chọn cách làm đề khó nhất. |
| `steps.jump.choice_other` | In this round the generator rated {rated} possible removals ({refused} refused): the other {count} would have given at most {otherMax}. At this level it takes the one that makes the puzzle hardest. | Ở vòng này trình sinh đề đã chấm {rated} cách xóa ({refused} bị loại): {count} cách còn lại cho tối đa {otherMax} điểm. Ở mức này nó chọn cách làm đề khó nhất. |
| `steps.jump.random` | This removal was picked at random: the puzzle can still be finished with the techniques of this level, so it is kept. | Lần xóa này được chọn ngẫu nhiên: đề vẫn giải được bằng các kỹ thuật của mức này nên được giữ lại. |
| `steps.jump.before.none` | Before this step the grid was full: there was nothing to solve (score 0). | Trước bước này lưới còn đầy đủ, không có gì để giải (điểm 0). |
| `steps.jump.before.singles` | Before this step, singles were enough to finish the puzzle (score {from}, {levelFrom}). | Trước bước này, chỉ cần các kỹ thuật số đơn là giải xong đề (điểm {from}, mức {levelFrom}). |
| `steps.jump.before.hardest` | Before this step, the hardest technique needed was {before} ({beforePoints} points per use; score {from}, {levelFrom}). | Trước bước này, kỹ thuật khó nhất cần dùng là {before} ({beforePoints} điểm mỗi lần; điểm {from}, mức {levelFrom}). |
| `steps.jump.after.new_one` | After it, the puzzle cannot be finished without {technique}: {uses} use at {points} points. | Sau đó, đề không thể giải xong nếu không dùng {technique}: {uses} lần, {points} điểm. |
| `steps.jump.after.new_other` | After it, the puzzle cannot be finished without {technique}: {uses} uses at {points} points each. | Sau đó, đề không thể giải xong nếu không dùng {technique}: {uses} lần, mỗi lần {points} điểm. |
| `steps.jump.after.more` | After it, {technique} is still the hardest technique but is needed {uses} times instead of {usesBefore}. | Sau đó, {technique} vẫn là kỹ thuật khó nhất nhưng phải dùng {uses} lần thay vì {usesBefore} lần. |
| `steps.jump.formula` | The hardest technique counts in full: P {pFrom} → {pTo} ({pDelta}). The work W grows from {wFrom} to {wTo}, so the work term R goes from {rFrom} to {rTo} ({rDelta}). Empty cells: E {eFrom} → {eTo}, so V {vFrom} → {vTo} ({vDelta}). Score {from} → {to} ({delta}, ×{ratio}). | Kỹ thuật khó nhất được tính đủ điểm: P {pFrom} → {pTo} ({pDelta}). Khối lượng W tăng từ {wFrom} lên {wTo} nên phần khối lượng R đi từ {rFrom} lên {rTo} ({rDelta}). Ô trống: E {eFrom} → {eTo} nên V {vFrom} → {vTo} ({vDelta}). Điểm {from} → {to} ({delta}, ×{ratio}). |
| `steps.jump.level` | In this one step the puzzle goes from {levelFrom} to {levelTo}. | Chỉ trong bước này, đề đi từ mức {levelFrom} lên mức {levelTo}. |
| `steps.jump.smallest` | It cannot be shown in smaller steps: this is the smallest change the generator made, and no board in between is easier. | Không thể chia nhỏ hơn: đây là thay đổi nhỏ nhất mà trình sinh đề đã làm, và không có bàn cờ nào ở giữa dễ hơn. |
| `steps.jump.firstUse` | First use: {finding} | Lần dùng đầu tiên: {finding} |
| `steps.techniques.new` | new | mới |
| `steps.techniques.cause` | causes the jump | gây ra bước tăng vọt |
| `steps.techniques.tip.before` | At the previous step | Ở bước trước |
| `steps.techniques.tip.change` | Change | Thay đổi |
| `steps.legend.cause` | Removing this clue causes the jump | Xóa số này gây ra bước tăng vọt |

Changed: `replay.guided` / `replay.guided.rounds` (no "Rate 0 possible removals" any more), `replay.reveal.search`
(only for a lone addition), `steps.techniques.none` (a note under the score-0 table). Removed if Decision 2 drops the
batches: none of the existing keys need to go (the batch texts still describe a random step). Plural pairs (`_one` /
`_other`) where a count is shown, as `i18n.test.js` requires. The score-jump keys format their numbers with
`SG.i18n.formatNumber` (decimal comma in Vietnamese), take level and technique names from the existing
`difficulty.<level>` and `technique.<id>` keys, and show the solver's existing `technique.<id>.step*` sentence as the
first use; cell names come from `SG.i18n.cellLabel` (`G4-R1C7` on multigrid boards).

### D3. Documents to update (same change, both languages)

- `generator/design.md`: §7.1 (column "Shown in the replay" of the dig and tune rows), §7.3 (the step model: moves,
  ratings, segmentation; the kinds table; "a step whose puzzle has no complete proof gets no table" becomes "every step
  has a table"; the examples "Classic 9×9, easy, seed 3 replays in 9 steps" → 7 steps, "Killer, hell 2, seed 11 takes
  21 steps" → 9 steps, from the prototype), §10.5 (the step table always present, the change column), §15.2 (the
  player / steps rows).
- `USERGUIDE.md` / `USERGUIDE.vn.md`: "What it is" item 3 and the "Step-by-step replay" and "Difficulty score you can
  read" features (steps chosen by score, a table on every step, the rise explained).
- `DEVELOPERGUIDE.md` / `DEVELOPERGUIDE.vn.md`: the replay paragraph of "How it works" (`buildSteps`, the example of
  seed 3: full solution, four batches of random removals, the hardest removals, the finished puzzle — 7 steps).
- Help text `help.generation.replay` (`generator/js/ui/help.js:1183, 1444`): it describes batches and rounds, and still
  says "Click a step in the Generation steps list", a list that no longer exists (`design.md` §7.3: "There is no list
  of steps").
- The score jump (C11), in the same places: the user guides (what the badge and the callout mean, the ×3 and
  +100 points rule, that every score is the real one), the developer guides (the rule, the data it reads, that it
  never changes the steps or the puzzle), `design.md` §7.3 and §10.5 (callout, highlighted row, `cause` mark), the Help
  text.

### D4. Quick tests to change or add (no heavy suite, no hash, no fixture)

- `generator/tests/suites/player.test.js`: keep "starts from the full solution and ends on the puzzle", "counts …
  add up", "without a dig log", "is deterministic", "real top-level results … replay faithfully"; replace the tests
  tied to fixed batches ("summarizes the random removals in batches of about a ninth", "one guided round per step",
  "sizes its batches by the board", the synthetic "closes a batch … before the clues of a reveal come back" and the
  mega16 one) by tests of the new invariants: a search swap is one move; every step ends on a unique, completely rated
  position; shown scores never drop by more than 10 %; a move that rises by ×R is a step of its own; the example seed
  gives 0, 23, 44, 551, 568, 992, 992.
- `generator/tests/suites/steps.test.js`: "rates the puzzle of each step" (step 1 gets a score-0 table, every step a
  rating), "shows the techniques … view.setPosition(1)" (the note instead of the bare sentence), the change in the
  Total row.
- Score jump (C11), in the same two suites: the example's step 4 is a jump (×12.5) and step 6 (×1.75) is not; its
  callout names R1C2 as the cause, Simple Colouring with 360 points and 2 uses, P 1 → 360 and Very easy → Hard; a
  Greater-Than sign jump names the sign's two cells; a step of several moves uses the peak sentence; the badge, the
  highlighted row and the `cause` mark appear on jump steps only.
- `i18n.test.js` checks the new keys in both languages by itself; `ui-contract.test.js` only if a file is added (the
  player's declared surface stays); `help.test.js` if a guide names a new path or command.

### D5. Risks

1. **Expectation:** most hard puzzles keep one large rise (×8–×35 on hard classic levels). The redesign explains it
   instead of hiding it (C11), as the user decided on 13:54; only an invented path could remove it (Decision 1).
2. **Different story granularity:** single rejections and guided rounds are no longer one step each; the counts stay in
   the sentences and the "put back" frames stay on the board.
3. **Time on big boards:** up to 0.85 s in Node (mega16 hell2) before the steps are ready; sliced, so the page stays
   responsive. If phones are too slow, the rating can move to the worker after `runSteps` (C8, a protocol change) or use
   option F.
4. **Small dips** (≤ 10 %) are shown honestly; a user may read "the score went down" (Decision 3).
5. **Tests that encoded the batch sizes** must be rewritten, not weakened; the invariants above replace them.
6. **Killer layout-search puzzles** carry a synthetic log (`killer.js:814-821`) whose "random removals" never happened
   in that order; out of scope, unchanged by this proposal (it still shows real, rated boards). On such a puzzle the
   "picked at random" sentence of a jump would be as approximate as today's titles; a flag in the result could turn it
   off.
7. **A long callout on a phone:** up to nine sentences; the first use is folded, and the formula sentence can be
   folded too (Decision 14).
8. **What-if scores** ("R1C2 alone already gives 550") are ratings of boards the replay does not show; the sentence
   says so, and no such board ever becomes a step (Decision 11).
9. **Edges of the rule:** a ×2.9 rise gets the one-line explanation only; the rule is one pair of constants (×3,
   +100 points) that can be tuned (Decision 10).

---

## Decisions for the user

1. **Even rise vs true order.** *Decided by the user (13:54):* keep the true order; a jump that no grouping or
   splitting of steps removes is accepted and explained in the page (C11). Still open as an extra view: a re-ordered
   "difficulty ladder" (C; smoother for 22 of 67 sampled puzzles, not for most classic puzzles, and no longer the
   order the generator worked in); an invented smooth path (E) stays not recommended.
2. **How many steps.** *Recommended:* adaptive ratio, about six rises from 10 points to the final score, between ×1.3
   and ×3 per step (7 steps for the example). Alternatives: a fixed ×2 or ×3, or one step per move (31 for the example).
3. **Small dips.** *Recommended:* show dips up to 10 % with their real score and fold bigger excursions into the step
   with a "peak" sentence. Alternatives: strictly non-decreasing (hides the Greater-Than starting clues behind a 1-point
   dip) or every drop as a step.
4. **Phases.** *Recommended:* every phase ends a step even if its score barely moves (example: 551 → 568), which keeps
   the titles simple. Alternative: merge such phases into a neighbour for a more even rise (mixed titles).
5. **Where to rate.** *Recommended:* in the page, in slices, with a work guard of 1,000,000 checks and no wall clock.
   Alternatives: in the worker before the result is sent (longer wait for the puzzle) or scores logged by the digger
   (option F, touches the engine log).
6. **Solution and structure steps.** *Recommended:* a table with total 0 (requirement 2), the sentence kept as a note.
7. **Explaining a rise.** *Recommended:* the change in the Score column on every step, one line for a smaller rise
   that brings a new technique, and the callout of C11 for a score jump; details in questions 10–14.
8. **"Finished puzzle" step.** *Recommended:* keep it as the last step, with the Summary's table.
9. **Search swaps.** *Recommended:* one step with the net change framed on the board and the number of swaps in the
   sentence.
10. **What counts as a score jump.** *Recommended:* at least ×3 and at least +100 points (74 steps in 61 of the 78
    sampled runs). Alternatives: ×3 only (79), ×2 and +100 (89), the segmentation's ×R (223), two levels apart (74,
    but it misses 10 large rises).
11. **Splitting a symmetric group to soften a jump.** *Recommended:* no: it helps 3 of 55 jumps (2 fall below ×3) and
    would show boards without the chosen symmetry that the generator never had; the partial boards only serve to name
    the clue that causes the jump. Alternative: split when that brings the rise under ×3, saying "shown one cell at a
    time".
12. **First use of the new technique.** *Recommended:* the solver's own sentence, folded in the callout; a "Show on
    the board" button as a later option. Alternative: leave it out for a shorter callout.
13. **Mark the jump steps on the step slider.** *Recommended:* not at first (the badge says it on the step); later if
    users ask.
14. **Where the formula goes.** *Recommended:* in the callout, as asked (P, W → R and V before → after), with the same
    numbers in the help tips. Alternative: only in the help tips, keeping the callout to the move, the cause and the
    technique.

---

## Appendix — experiments

All scripts are in my experiment folder (`experiments\claude-opus-5.5\` in the session folder of the orchestrating
agent), which is **not part of the repository**. `lib.js` loads `generator/` and `core/` read-only, in the order of `SOURCE_FILES` of
`generator/tests/node-runner.js`, and builds the page's configuration with `SG.store.toConfig`. Run from that folder:

| Script | Command | Output | What it shows |
|---|---|---|---|
| `repro.js` | `node repro.js classic9 expert 3275974478 --json=out-repro-classic9-expert-3275974478.json` | `out-repro-classic9-expert-3275974478.txt`, `.json` | B1: every step, page score, 400 ms and unlimited ratings |
| `repro-texts.js` | `node repro-texts.js` | `out-repro-texts.txt` | B1: step texts, DFS solution counts, the dig log from entry 26 |
| `artifact.js` | `node artifact.js` | `out-artifact.txt` | B2: the 2-solution step rated 3422 |
| `sample.js` | `node sample.js --set=classic9:easy,hard,expert,master,nightmare,hell1:5 --set=jigsaw9:easy,hard,expert,nightmare:3 --set=samurai:easy,hard,expert,nightmare:3 --set=killer:easy,hard,expert,nightmare:3 --set=greaterThan:easy,hard,expert,nightmare:3 --out=out-sample.jsonl` | `out-sample.jsonl`, `out-sample.txt` | B5: today's tab on 78 requests |
| `summarise.js` | `node summarise.js out-sample.jsonl` | `out-sample-summary.md` | B5 table |
| `jumps.js` | `node jumps.js out-sample.jsonl` | `out-jumps.txt` | B3: where the largest rise happens |
| `supersets.js` | `node supersets.js classic9 expert 3275974478 600` (also `… expert 2478938795`, `… hard 1940352050`) | `out-supersets-*.txt` | C8: supersets are bimodal |
| `moves.js` | `node moves.js classic9 expert 3275974478` | (stdout) | C2–C4 prototype: moves, ratings, steps |
| `render-after.js` | `node render-after.js classic9 expert 3275974478` | `out-render-example.txt` | C6: today vs proposed, with tables |
| `ladder.js`, `hybrid.js` | `node ladder.js classic9 expert 3275974478`; `node hybrid.js jigsaw9 hard 529928543 8` | (stdout) | C8: ladder and hybrid prototypes |
| `compare-sample.js` | `node compare-sample.js out-sample.jsonl --ratio=auto --out=out-compare-auto.jsonl` | `out-compare-auto.jsonl`, `.txt` | C7: today, proposed, smallest possible, ladder |
| `summarise-compare.js` | `node summarise-compare.js out-compare-auto.jsonl` | `out-compare-auto-summary.md` | C7 table |
| `cost.js` | `node cost.js mega16:expert:11 mega16:hell2:12 samurai:hell2:13 sohei:hell1:14 flower:hell2:15 killer:hell2:16 butterfly:nightmare:17 mega12:hell2:18 wordoku:hell1:19 diagonalX:hell2:20` | `out-cost.txt` | C7, C9: heavy configurations |
| `nodes.js` | `node nodes.js` | `out-nodes.txt` | C3: budget checks per rating |
| `jump-explain.js` | `node jump-explain.js` (the example); `node jump-explain.js killer hard 2449675408` (and the other requests of C11.6); `node jump-explain.js --sample out-sample.jsonl > out-jump-sample.jsonl` | `out-jump-example.txt`, `out-jump-cases.txt`, `out-jump-sample.jsonl` | C11: jump steps, partial boards, the round's candidates, first use, EN / VI drafts, table and tips |
| `jump-summary.js` | `node jump-summary.js out-jump-sample.jsonl` | `out-jump-summary.txt` | C11.1–C11.2: rule counts, causes, splits, levels, dips |
| `jump-light.js` | `node jump-light.js` | `out-jump-light.txt` | C11.2: one-line rises and dips |
| `jump-multi.js` | `node jump-multi.js > out-jump-multi.txt` | `out-jump-multi.txt` | C11.1: their inner boards are all above the step's end |

Raw numbers quoted above:

- Example generation: `generated in 141 ms: level=expert score=992 solved=true clues=30 attempts=1 warnings=[]`;
  `digLog entries 74 {"pass:random":1,"accept":31,"reject:techniques":14,"pass:guided":2,"keep":21,"reveal:search":5}`;
  `final counts {"nakedSingle":29,"hiddenSingleBox":21,"hiddenSingleLine":1,"xyzWing":1} empties 51`.
- Example moves (`moves.js`): `0 5 9 12 15 18 20 23 25 27 28 30 31 33 34 36 37 38 40 41 42 43 44 551h 557h 567h 568h
  568s 568s 568s 568s 992s` (h = guided, s = swap); 31 ratings in 1.9 ms; display `0 23 44 551 568 992`.
- Supersets of the example: 1 group 26 (19 below 50, 7 in 900–999); 2 groups 325 (304, 21); 3 groups 600 (596, 4);
  5 groups 600 (600, 0); 8 groups 600 (600, 0); 0.02–0.08 ms per rating.
- Artifact: `step 35 guided replay.guided clues 28`, `solutions 2`, `rating true 3422 hell1 {… "uniqueRectangle":1,
  "forcingChain":15,"nishio":3}`, `page rateStep score 3422`, `final score 2879`.
- Sample totals: `214 of 1258 (17 %) | 205 / 9 / 0 | 21 runs`; 10 non-unique positions; proposed `runs 78 positions
  4483 unrated 0 display steps 558 today steps 1258`; `proposed maxRatio == irreducible: 66 of 78`; `ladder at least
  1.5x smoother in 22 runs of 67`; ladder `ms min/med/max 3 16 733 ratings min/med/max 253 406 2868`.
- Budget checks per rating (`out-nodes.txt`): mega16 hell2 max 123,741 (final 123,742); samurai hell2 100,337
  (100,338); killer hell2 134,627 (134,627); classic9 hell1 2400651925 8,829; greaterThan nightmare 733709325 18,858;
  the example 430.
- Score jumps (`out-jump-summary.txt`): `TOTAL jump steps 74 in 61 runs; per run: {"0":17,"1":48,"2":13}`;
  `steps >= xR 223  >= x3 79  >= x2 & +100 89`; `moves per jump step {"1":67,"2":1,"3":1,"12":1,"64":1,"67":1,
  "76":1,"102":1}`; `cause {"newHardest":74}`; `ratio min/med/max 3.02 11.04 40.2`; `gain min/med/max 115 521 1960`;
  `dP share of the gain (median) 0.67  dR share (median) 0.33  dV share (median) 0.001`; `jump moves that can be
  split (group >= 2 or swap): 55 of 74 ; an intermediate board makes the worst sub-rise 1.5x smaller: 3 ; brings it
  under x3: 2`; `split check time: total 34.8 ms, max 3.7 ms`; `guided jump rounds 52 ; every other candidate stays
  within 10% of the rise (log): 35 ; another candidate also covers >= half of the rise: 8 ; no other candidate: 4 ;
  candidates rated per round (kept+refused) min/med/max 1 7 19`; `random jump moves 2`; `group removals among jumps
  54 {"together":14,"culprit":36,"parts":4}`; `jumps two levels apart or more 64 ; other changes two levels apart or
  more 10 ; unflagged changes of x3 or more (all below +100 points): ["25->102","24->98","25->98","0->96","0->45"] ;
  largest other unflagged change x2.91 ; dips 13 in 9 runs, worst 6.0%`; `runs whose first jump is their largest
  rise 57 of 61`; `out-jump-light.txt`: `transitions 402 rises 384 jumps 74 light new-technique lines 61 flat 5
  dips 13`.
- The example's jump (`out-jump-example.txt`): `step 4 44 -> 551 x12.52 +507 JUMP moves 1 guided`; `V 41.446 ->
  42.353  P 1 -> 360  R 1.365 -> 148.322  W 43 -> 768.25  E 43 -> 45  unrounded 43.811 -> 550.675`; partial boards
  `R1C2 550`, `R9C8 44`; first use `technique.simpleColouring.step` on digit 3, rule `trap` (0.5 ms); the round in the
  dig log: entries 27–41, 10 `keep` (scores 45 ×9 and 551 for cells [1,79]) and 5 `reject`.
- `git status --short`: empty before the work; after it, `?? docs/generation-steps/` only (the folder is new and also
  holds the other researcher's folder, not opened here); limited to this report's folder, `git status --short --
  docs/generation-steps/claude-opus-5.5` gives `?? docs/generation-steps/claude-opus-5.5/`.
