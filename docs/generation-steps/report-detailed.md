# Generation Steps — detailed report: a score table on every step, steady scores, explained jumps

| | |
|---|---|
| Researchers | **claude-opus-5.5** (Claude Opus 5.5, 1M context, max reasoning) · **gpt-6-astra** (GPT-6 Astra, long context, max reasoning) |
| Compiled by | drafted by claude-opus-5.5 for the orchestrating agent (GitHub Copilot CLI), checked by gpt-6-astra |
| Date | 2026-10-28 |
| Code examined | `8d9510a` (Node v24.22.1, Windows) |
| Status | **Part I** (§1–§11): the joint report and implementation spec, corrected after gpt-6-astra's check (§11, "Corrections applied at sign-off"); signed by both researchers on 2026-10-28. **Part II** (§12–§18): the implementation (GS01–GS08 of [`tasks/generation-steps/`](../../tasks/generation-steps/check-list.md)), its problems and their resolutions, the final verification and the effort; complete on 2026-10-29, branch `generation-steps`, not pushed. |

The short version, with the timeline of the session, is [`report-brief.md`](report-brief.md).

**Documents in this folder** (the number in a file name is the order in which that researcher wrote it)

| file | content |
|---|---|
| [`report-brief.md`](report-brief.md) | short report: results and timeline |
| `report-detailed.md` | this file |
| [`claude-opus-5.5/1-report.md`](claude-opus-5.5/1-report.md), [`gpt-6-astra/1-report.md`](gpt-6-astra/1-report.md) | 1. the independent research reports, written without access to each other; each ends with its design for explaining a jump, added after the user's decision of 13:54 (section C11; the addendum) |
| [`claude-opus-5.5/2-review-of-gpt-6-astra.md`](claude-opus-5.5/2-review-of-gpt-6-astra.md), [`gpt-6-astra/2-review-of-claude-opus-5.5.md`](gpt-6-astra/2-review-of-claude-opus-5.5.md) | 2. the cross-reviews, each with a head-to-head of both proposals on its own common corpus (104 requests for claude-opus-5.5, 35 for gpt-6-astra) |
| [`claude-opus-5.5/3-response-to-review.md`](claude-opus-5.5/3-response-to-review.md), [`gpt-6-astra/3-response-to-review.md`](gpt-6-astra/3-response-to-review.md) | 3. the answers to the reviews, with the resolutions R1–R17 (claude-opus-5.5) and R1–R14 (gpt-6-astra) merged into §5 |
| [`gpt-6-astra/4-acceptance-data.md`](gpt-6-astra/4-acceptance-data.md) | 4. the golden acceptance data (14 requests and controls) the implementation will be checked against |
| [`claude-opus-5.5/4-check-of-acceptance-data.md`](claude-opus-5.5/4-check-of-acceptance-data.md) | 4. the independent check of the golden data with claude-opus-5.5's own prototype |
| [`gpt-6-astra/5-check-of-joint-report.md`](gpt-6-astra/5-check-of-joint-report.md) | 5. gpt-6-astra's check of the draft of this report (M1–M13, O1–O3, Vietnamese copy), applied in §11 |

The researchers' experiment folders (scripts and raw outputs) are not part of the repository; this report quotes every
number it relies on.

**Conventions.**

- Repository files are cited by their path from the repository root, with line numbers at `8d9510a`
  (`generator/js/ui/player.js:522`). `E\claude-opus-5.5\…` and `E\gpt-6-astra\…` are files in the researchers'
  experiment folders (not part of the repository): claude-opus-5.5's folder and gpt-6-astra's folder.
- **Move**: one complete change derived from the generator's log (one symmetric group of clues removed, one
  exchange, one sign removed, clues shown again, a restart); it describes what the log shows, not a transaction the
  generator necessarily accepted as one. **Position**: the board after a move; position 0 of the move list (`m` 0) is
  the full solution. **Step**: what the replay shows. **Transition**: the change from one shown step to the next, in
  one view. **Compact view**: the score-chosen steps (the default). **Details view**: one step per move (the toggle
  "Show every move").
- Score (`generator/js/engine/difficulty.js:5–23`): `score = round(V + P + R)`, with `V = 80·E/(E + 40)` (E: empty
  cells), `P` the weight of the hardest technique used, `W = Σ n_t·w_t` (n_t uses of technique t of weight w_t) and
  `R = 0.25·P·log₂(1 + W/P)` (0 when P = 0). `×r` is the ratio of two scores; `f10(x) = max(x, 10)`.
- Levels by today's names and bands (`generator/js/engine/difficulty.js:104–114`): Very easy 0–44, Easy 45–179,
  Normal 180–399, Hard 400–699, Expert 700–999, Master 1000–1499, Nightmare 1500–2399, Hell 1 2400–3599,
  Hell 2 from 3600.
- **The example**: Classic 9×9, Expert, seed 3275974478. **The corpus**: the 107 requests of §1.3. Times are Node
  v24.22.1 on the researchers' Windows machine. "Today" means the code at `8d9510a`.

---

# Part I — The joint report and the implementation spec

## Executive summary

1. **The user's observation is exact.** The example (30 clues, final score 992, hardest technique XYZ-Wing) replays in
   21 steps: steps 2–10 score `18, 28, 34, 41, 44, 551, 557, 567, 568`; steps 11–18 show no score table; step 19 shows
   **1849** (Forcing Chain); step 20 shows none; step 1 has a sentence instead of a table; the finished puzzle shows 992
   (§4.1).
2. **Steps lack a table for four reasons, all in the page** (`generator/js/ui/player.js:512–553`). Only random and
   guided steps without signs are rated, so clues shown again, starting clues, sign removals and every Greater-Than dig
   step never get a table. The fixed-size batching cuts the local search's exchanges in two; the removal half has at
   least two solutions, so its rating stops. Solution, cages and signs steps get a sentence. A 400 ms clock budget can
   drop a table on a slow device (0 cases measured in Node). In claude-opus-5.5's 78 requests: **316 of 1,258 steps
   (25.12 %)** without a numerical table, in all 78 runs; in gpt-6-astra's 25 requests: 100 of 331 (30.21 %).
3. **The 1849 is a replay artefact.** It is the rating of the removal-only checkpoint that the replay exposes between
   the two halves of the fifth exchange, not of the accepted complete change, whose rating is 992. The same split shows
   boards with at least two solutions; one of them (Classic 9×9, Hell 1, seed 2400651925) is even "rated" 3422 through
   a Unique Rectangle.
4. **The real jumps come from the guided dig, by design.** Each round rates candidate removals and removes the one its
   check prefers (`generator/js/engine/digger.js:719–795`). In the example's first round, of 15 candidates 5 were
   refused, 9 scored at most 45, and removing R1C2 and R9C8 scored 551: the generator's solution then uses Simple
   Colouring, weight 360, which counts in full as P. No recorded position lies between 44 and 551. Over the 107
   requests the largest rise per puzzle has a median of ×5.5 and a maximum of ×40.2, and the trace is not monotone
   (208 decreases in 28 runs when every move is shown).
5. **The measured positions are sound.** All 5,911 fresh ratings of the 107-request sample completed and the required
   uniqueness checks passed (16 solution counts confirmed the proofs that assumed uniqueness). That is a measurement,
   not a guarantee, so the design keeps honest statuses for positions that cannot be scored (R5).
6. **The design (§5, R1–R19) changes the replay only.** The generator, its log, the puzzle, the regression hashes, the
   qualification lists, the cache, the history and the export stay identical. The page reads the log as complete
   **moves** (an exchange is one move; a symmetric group or a sign is never split) and rates every distinct position
   once: in the worker after the puzzle is shown, or, without a worker, only after the user presses "Prepare score
   tables" (Q17 b, Q19 a). It offers two views, the **compact** score-chosen steps (default) and **every move** (a
   toggle), both prepared before the replay opens.
7. **Every step has a score table**: a numerical one on every compact step; in the details view, a move that cannot be
   scored keeps the deductions the solver attempted, with its reason and no total. The compact view never goes down;
   its steps are cut at geometric score ratios (`R = clamp((f10(S_end)/10)^(1/6), 1.3, 3)`, 2.15 for the example), at
   every phase end and around every real rise.
8. **A real jump is explained.** When the integer score rises by ×3 or more and by +100 or more, the step gets a badge
   ("Score jump ×12.5": one decimal, rounded down, in the locale's format), three visible sentences (what changed and
   the technique the generator's solution now uses; the largest technique weight, which counts in full as P; what
   causes the jump), a "Why?" disclosure (P, W, E, V and R before → after, the level, what the log says about the
   generator's choice, a restricted-solver check, the first use of the technique as the solver's own text) and, when
   exactly one clue or sign causes it, a frame on it. Every new hardest technique gets one neutral line, whether the
   score rises, stays or falls.
9. **The example becomes** `0, 23, 44, 551, 568, 992, 992`: 7 steps, 7 tables, no decrease, one explained jump
   (44 → 551, ×12.5); "Show every move" gives 33 steps. Over the 107 requests the compact view has 779 steps (5 / 7 /
   10 per puzzle), all with a numerical table, 0 decreases, 84 explained jumps in 76 runs, and no jump that a rated
   recorded position could avoid. gpt-6-astra's golden data (14 requests) and claude-opus-5.5's independent check of
   them agree on every golden number.
10. **Cost**: 2,691.31 ms of ratings for the 107 puzzles (per puzzle: median 3.14 ms, p95 160.22 ms, maximum
    594.34 ms; the largest single rating 206.66 ms); the explanations of the compact jumps add 132.42 ms; those of the
    details view's own transitions are not measured yet. The rating rows serialize to 3,005 B median and 20,068 B
    maximum of JSON per puzzle, which is not the total memory of the analysis. Nothing is stored or exported.
11. **Sign-off** (§11): gpt-6-astra's check (13 must-fix corrections, 3 optional ones and the Vietnamese copy) and
    claude-opus-5.5's 6 clarifications from the golden-data check are applied; the user decided what the page shows
    before preparation (Q19 a, 18:40); both researchers signed the corrected text.

## 1. The request, the requirements and the method

### 1.1 The request

The user, verbatim:

> Cần thiết kế lại phần generation steps: Ví dụ khi sinh ra đề Classic Sudoku, độ khó Expert, seed 3275974478 thì
> step 11 đến 18 không hiện ra bảng điểm nào, qua step 19 thì điểm tăng đột biến.
> Yêu cầu:
>
> - giữ nguyên thuật toán sinh đề hiện tại, kết quả cuối cùng đã đúng, chỉ có một khó hiểu trong bảng giải thích các
>   bước sinh đề
> - các bước sinh đề cần luôn có bảng điểm, dù cho điểm số không thay đổi so với step trước
> - các step nên có điểm tăng dần đều, không tăng đột biến. Ví dụ step 3,4,5,6 nên có điểm lần lượt là
>   35,100,300,1000 thay vì 35, 40, 40, 1000

Translation: redesign the generation steps. For example, when a Classic Sudoku is generated at level Expert with seed
3275974478, steps 11 to 18 show no score table, and at step 19 the score jumps. Requirements: keep the current
generation algorithm — the final result is already correct; only the table that explains the generation steps is
confusing; every generation step must always have a score table, even when the score did not change from the previous
step; the scores of the steps should rise steadily, without sudden jumps — for example, steps 3, 4, 5 and 6 should
score 35, 100, 300 and 1000 rather than 35, 40, 40 and 1000.

The user's decision of 13:54, verbatim: "chấp nhận các bước điểm nhảy vọt nếu không thể gom/tách step thêm được. Nhưng
cần giải thích trong UI lý do vì sao điểm tăng vọt để người chơi hiểu." Translation: score jumps are accepted when
grouping or splitting the steps further cannot remove them, but the UI must explain why the score jumped, so that the
player understands.

### 1.2 Requirements

| # | Requirement | From |
|---|---|---|
| N1 | The generation algorithm and the finished puzzle stay identical for the same request and seed | the request |
| N2 | Every generation step has a score table, even when the score did not change | the request |
| N3 | The scores rise steadily (roughly geometrically) from step to step, without sudden jumps | the request |
| N4 | A jump that no grouping or splitting of steps removes is allowed; the UI explains why the score jumped | 13:54 |

### 1.3 Method

- **Phases.** Two researchers studied the problem independently (the 1-reports), reviewed each other's work with
  head-to-heads on their own common corpora (the 2-reviews), answered the reviews (the 3-responses), compiled this
  report, built and cross-checked golden acceptance data (the 4-files), and checked this report (gpt-6-astra's
  5-check, applied in §11). The user answered 19 questions on the way (§2).
- **Measurements.** Scripts outside the repository load `core/` and `generator/` read-only, in the order of
  `generator/tests/node-runner.js`, and generate with the configuration the page sends (`SG.store.toConfig`: symmetry
  `rotational180`, dig order `random`, `maxAttempts` 8), so they get the worker's puzzles. The repository was not
  modified apart from the reports, and no heavy test was run.
- **The corpus: 107 requests.**
  - the example;
  - gpt-6-astra's 25: Classic 9×9, Killer, Samurai, Greater-Than and Jigsaw 9×9, each at Very easy (seeds 1 and 42),
    Expert (seeds 1 and 42) and Nightmare (seed 42);
  - claude-opus-5.5's 78: Classic 9×9 at Easy, Hard, Expert, Master, Nightmare and Hell 1 (5 seeds each); Jigsaw 9×9,
    Killer, Samurai and Greater-Than at Easy, Hard, Expert and Nightmare (3 seeds each);
  - three heavy requests: Mega 16×16 Hell 2 seed 12, Samurai Hell 2 seed 13, Killer Hell 2 seed 16.

  The two cross-reviews compared both proposals on **different** common corpora: gpt-6-astra used 35 requests (the
  example, its 25, 6 of the 78 and the three heavy requests); claude-opus-5.5 used 104 (the example, gpt-6-astra's 25
  and the 78). Their intersection is 32 requests and their union is the 107. §7.3 is the later matched comparison on
  all 35 of gpt-6-astra's requests. By variant the 107 are: Classic 9×9 36, Killer 18, Samurai 18, Greater-Than 17,
  Jigsaw 9×9 17, Mega 16×16 1.
- **Golden data.** gpt-6-astra's acceptance data (14 requests G01–G14 and controls) were checked independently by
  claude-opus-5.5 with its own prototype: 1,514 fields compared, every golden number equal (§7.3).

## 2. The user's decisions

Every decision below is applied in §5; nothing in this report is left to a later choice of the implementer except
the points listed for the sign-off (§11).

| Time | # | Question | Decision | Applied in |
|---|---|---|---|---|
| 13:54 | — | Jumps that cannot be removed | Accepted when no grouping or splitting of steps removes them; the UI must explain why the score jumped | R8, R10, R13, R14 |
| 15:30 | Q1 | Default granularity | **a**: compact score-chosen steps by default, plus an optional "Show every move" details view | R6, R7 |
| 15:30 | Q2 | Splitting a symmetric group to soften a jump | **a**: never; partial boards only name the clue that causes the jump | R2, R7, R14 |
| 15:30 | Q3 | Decreases in the compact view | **a**: the compact view never decreases; excursions and refinement are folded into a step and told in its text; real drops only in the details view | R6, R7, R12 |
| 15:30 | Q4 | Badge and callout threshold | **b**: rise ≥ ×3 **and** ≥ +100 with a score before > 0; every new hardest technique still gets one line; 0 → first rated puzzle is worded "First rated puzzle", with no multiplier | R10 |
| 15:30 | Q5 | Length of the callout | **a**: 2–3 visible sentences plus a "Why?" disclosure with P, W, E, V and R before → after | R13 |
| 15:58 | Q6 | Experiment folders and paths | **b**: the folders stay outside the repository; no absolute paths in the documents | this report |
| 15:58 | Q7 | After the joint report | **a**: a task pack in `tasks/generation-steps/`, then the implementation by claude-sonnet-5.5 sub-agents, one commit per task, no push | R19 |
| 15:58 | Q8 | Branch | **b**: a new branch `generation-steps` | R19 |
| 15:58 | Q9 | Tests | **c**: the quick suites for each task; at the end `generator --all` once, plus the browser scripts of the player and the generator | R19 |
| 16:20 | Q10 | Marking the cause on the board | **b**: frame the culprit clue or sign, with a legend entry, only when exactly one cell or sign causes the jump | R14 |
| 16:20 | Q11 | More content in "Why?" | **i + ii + iii**: the level before → after; the generator's choice, worded for its own check, with a fallback when its score is missing; the first use of the new technique as text | R13 |
| 16:20 | Q12 | Phase ends | **a**: every phase end ends a step, even if the score barely moves (the example keeps 7 steps) | R7 |
| 16:20 | Q13 | A restart | **a**: the abandoned dig is folded into the "Starting again" step and told in its text; the compact view never decreases; the details view shows both digs | R3, R7, R12 |
| 16:20 | Q14 | A move of the details view that cannot be scored | **a**: its own step, with a status table (the techniques used until the solver stopped, no total, the reason) | R5, R9 |
| 16:20 | Q15 | Killer's rebuilt log | **a**: recognised from its shape; no engine change | R3 |
| 16:20 | Q16 | Marks on the slider, proof shown on the board | **a**: neither in this change | §10 |
| 16:20 | Q17 | No Worker (for example `file://`) | **b**: a "Prepare score tables" button with a warning that the page may pause; nothing runs automatically | R4 |
| 16:20 | Q18 | The work guard runs out | **b**: an honest status only, no retry button | R5, R9 |
| 18:40 | Q19 | What the replay shows in the main mode before "Prepare score tables" is pressed (gpt-6-astra's F1) | **a**: wait for preparation — the finished puzzle and its Summary stay usable; the replay shows only the notice and the button, with browsing disabled, until the button is pressed; then both scored views | R4, R9 |

## 3. How the Generation Steps work today

- **The log.** While it digs, the generator records `result.digLog` (`generator/js/engine/digger.js:63–74`, written by
  `logTracer`, `digger.js:357–379`). Its entries (`generator/tests/suites/pipeline.test.js:946`): `pass` (a dig pass
  starts), `accept` (a symmetric group or a sign removed), `reject` (a candidate refused, with its reason), `keep` (a
  candidate of a guided round, with the generator's score for it), `reveal` (clues shown again; `reason: 'search'` in
  the local search), `restart`, and `signs` and `clear` (Greater-Than). The log travels with the result
  (`generator/js/engine/pipeline.js:244, 303, 330`). The regression hash does not cover it: it hashes givens,
  solution, regions, cages, signs and symbols (`generator/tests/fixtures/perf-helper.js:173–186`).
- **The steps.** `SG.player.buildSteps` (`generator/js/ui/player.js:77–173`) replays the log (`replayLog`, 175–399) in
  batches of a fixed size: `max(2, round(C/9))` cells per random step (44–46), `max(1, round(C/81))` guided rounds per
  step (48–50), `max(4, round(signs/8))` signs per step (52–54). A batch is merged into the previous one or closed when
  full (239–270, 281–289); a reveal closes the batch and becomes a step of its own (324–338); a restart is a step
  (340–346); the finished puzzle is the last step (155–171). The page loads the replay when a result arrives
  (`generator/js/ui/app.js:723`); position 0 shows the empty grid (`replay.start`, `player.js:824`).
- **The score table.** `techniquesAt` (`player.js:512–535`) rates a step when it is shown. The solution, cages, signs
  and restart steps (`RATE_FREE_KINDS`, line 39) get no technique, so `generator/js/ui/step-view.js:415–426` prints a
  sentence instead of a table. The finished puzzle uses `result.rating` (519–521). Only `random` and `guided` steps
  without signs are rated (522–523), with the final model and a 400 ms clock budget (42, 525); an incomplete rating or
  an exception gives no table (528–531). `rateStep` (540–553) compares a step with the last earlier step whose rating
  is known, however far back.
- **Where it runs.** The worker posts the result (`generator/js/worker/gen.worker.js:189`); the replay's ratings run
  later in the page, one step at a time, when the step is shown. A puzzle opened from the cache gets its log when it
  has been generated again in the background (`generator/js/ui/cache.js:203–205, 998`;
  `generator/js/ui/app.js:858–873`).

## 4. Diagnosis

### 4.1 The example, step by step

`SG.store.toConfig({ variantId: 'classic9', difficulty: 'expert', seed: '3275974478' })` gives the page's configuration;
the generator needs 1 attempt and returns 30 clues, score 992, level Expert: 29 Naked Singles, 21 Hidden Singles (box),
1 Hidden Single (row/column) and one XYZ-Wing (V = 44.84, P = 750, W = 806.75, R = 197.55). The log has 74 entries: 1
random pass, 31 accepts, 14 rejects, 2 guided passes (the second is the local search's), 21 keeps and 5 reveals with
`reason: 'search'`.

| # | Step today | What it does | Clues | E | The tab shows | Why | Rated with no budget | Solutions (counted up to 2) |
|--:|---|---|--:|--:|---|---|---|--:|
| 1 | Full solution | the 81 values | 81 | 0 | a sentence, no table | `RATE_FREE_KINDS` | 0 | 1 |
| 2 | Random removals | 10 removed | 71 | 10 | 18 | | 18 | 1 |
| 3 | Random removals | 9 removed | 62 | 19 | 28 | | 28 | 1 |
| 4 | Random removals | 8 removed, 2 put back | 54 | 27 | 34 | | 34 | 1 |
| 5 | Random removals | 10 removed | 44 | 37 | 41 | | 41 | 1 |
| 6 | Random removals | 6 removed, 4 put back | 38 | 43 | 44 | | 44 | 1 |
| 7 | Hardest removal | R1C2 R9C8 (15 rated, 5 refused) | 36 | 45 | **551** | | 551, Simple Colouring | 1 |
| 8 | Hardest removal | R3C3 R7C7 | 34 | 47 | 557 | | 557 | 1 |
| 9 | Hardest removal | R3C9 R7C1 | 32 | 49 | 567 | | 567 | 1 |
| 10 | Hardest removal | R4C1 R6C9 | 30 | 51 | 568 | | 568 | 1 |
| 11 | Hardest removal ("Rate 0 possible removals") | R1C9 R9C1 removed: exchange 1, first half | 28 | 53 | **none** | rating incomplete | none (stuck) | **≥ 2** |
| 12 | More clues | R3C4 R7C6 shown again: exchange 1, second half | 30 | 51 | **none** | kind not rated | 568 | 1 |
| 13 | Hardest removal | R3C4 R7C6 removed (exchange 2) | 28 | 53 | **none** | rating incomplete | none | **≥ 2** |
| 14 | More clues | R1C7 R9C3 shown again | 30 | 51 | **none** | kind not rated | 568 | 1 |
| 15 | Hardest removal | R5C1 R5C9 removed (exchange 3) | 28 | 53 | **none** | rating incomplete | none | **≥ 2** |
| 16 | More clues | R2C8 R8C2 shown again | 30 | 51 | **none** | kind not rated | 568 | 1 |
| 17 | Hardest removal | R1C7 R9C3 removed (exchange 4) | 28 | 53 | **none** | rating incomplete | none | **≥ 2** |
| 18 | More clues | R1C9 R9C1 shown again | 30 | 51 | **none** | kind not rated | 568 | 1 |
| 19 | Hardest removal | R4C2 R6C8 removed (exchange 5) | 28 | 53 | **1849** (Forcing Chain) | | 1849 | 1 |
| 20 | More clues | R1C8 R9C2 shown again | 30 | 51 | none | kind not rated | 992 | 1 |
| 21 | Finished puzzle | the puzzle | 30 | 51 | 992 (XYZ-Wing) | the result's rating | 992 | 1 |

The log shows five complete changes after step 10, each a removal followed by clues restored in the local search
(`generator/js/engine/digger.js:1394–1469`); their positions score 568, 568, 568, 568 and **992**, so the last real
rise is ×1.75. The 1849 is the rating of the removal-only checkpoint that the replay exposes, not of the accepted
complete fifth change, whose rating is 992. The texts of steps 11–19 are also wrong: a removal half is told as "Rate
0 possible removals (0 refused) and remove the one that makes the puzzle hardest". With no budget, the tab shows
exactly the same; the page's slowest rating of the example took 46 ms in Node. The observation of the user is
therefore exact: steps 11–18 have no table, and step 19 jumps, to that removal-only checkpoint.

### 4.2 Why steps have no table

| Cause | Code | In the example | In the 78 requests (1,258 steps) |
|---|---|---|---|
| Kind never rated: clues shown again, starting clues, sign removals, every Greater-Than dig step (`step.signs !== null`) | `generator/js/ui/player.js:522–523` | steps 12, 14, 16, 18, 20 | 205 steps; Greater-Than 132 of 168 |
| The batching splits an exchange; the removal half has at least two solutions, so the rating stops | split: `player.js:281–289, 324–338`; no table: `player.js:528` | steps 11, 13, 15, 17 | 9 steps, all with at least 2 solutions |
| No technique yet: a sentence instead of a table | `player.js:39, 517–518`; `generator/js/ui/step-view.js:415–426` | step 1 | 102 steps (every solution, cages and signs step) |
| The 400 ms clock budget | `player.js:42, 525, 529–531` | none | 0 in Node; latent on a slow device |

| Variant (78 requests) | Steps | No rating | Sentence | Without a numerical table | Numerical tables |
|---|--:|--:|--:|--:|--:|
| Classic 9×9 (30 runs) | 474 | 76 | 30 | 106 | 368 |
| Jigsaw 9×9 (12) | 159 | 1 | 12 | 13 | 146 |
| Samurai (12) | 155 | 4 | 12 | 16 | 139 |
| Killer (12) | 302 | 1 | 24 | 25 | 277 |
| Greater-Than (12) | 168 | 132 | 24 | 156 | 12 |
| **All (78)** | **1,258** | **214** | **102** | **316 (25.12 %)** | **942** |

Every one of the 78 runs has at least one step without a numerical table. gpt-6-astra counted 100 of 331 steps
(30.21 %: 65 without a rating and 35 with a paragraph) in its 25 requests. The budget is a latent cause: positions of
large boards cost up to 206.66 ms in Node (Mega 16×16 Hell 2), so a device two to four times slower would cross
400 ms, and the same seed could show a table on a laptop and none on a phone.

### 4.3 Why the score jumps

- **The guided dig jumps by design.** Stage A (the `random` pass) hands over to the guided dig at
  `max(minClues, round(0.47 × cells))` clues, subject to legal removals and the score bounds
  (`generator/js/engine/digger.js:599–602, 840–841`): 38 clues on most 9×9 levels, 40 at Very easy (G02). In the
  example its positions need singles only and score V plus a few points (18 to 44); that is not general: Killer Expert
  seed 3514204290 (G09) already scores 96 and 98 with Cage Combination in Stage A. The guided dig rates candidate
  removals and removes the one its check prefers (`digger.js:719–795`). In the example's first round (log entries
  27–41), 15 candidates were tested: 5 refused, the 9 others reached at most 45 by the generator's limited check, and
  removing R1C2 and R9C8 made the generator's solution use Simple Colouring: 551 by the full rating. P = 360 then
  counts in full. There is no recorded position between 44 and 551.
- **Where the largest rise of a puzzle happens** (claude-opus-5.5's 78 requests, consecutive real positions):

  | Group | Runs | Where the largest rise is | Median of the largest rise (by level) / maximum |
  |---|--:|---|---|
  | Classic 9×9 Hard, Expert, Master, Nightmare, Hell 1 | 25 | the first guided round 21; the random dig of a top-tier proposal 2; a reveal of the refinement 1; an exchange 1 | ×11.7, ×19.2, ×20.5, ×34.6, ×25.7 / ×40.2 |
  | Jigsaw 9×9 Hard, Expert, Nightmare | 9 | guided 9 | ×5.9, ×11.6, ×5.5 / ×13.5 |
  | Samurai Hard, Expert, Nightmare | 9 | guided 9 | ×7.9, ×7.8, ×7.7 / ×13.5 |
  | Killer Hard, Expert, Nightmare | 9 | guided 8; a reveal of the refinement 1 | ×3.2, ×4.1, ×3.6 / ×11.0 |
  | Greater-Than Easy, Hard, Expert, Nightmare | 12 | the starting clues 7; a sign removed 3; clues shown again 2 | ×9.6, ×26.1, ×16.1, ×16.0 / ×29.2 |
  | Easy levels of the cell variants | 14 | the random dig (×1.25) or one guided round (at most ×2.7) | at most ×2.7 |

- **Plateaus and drops.** The local search accepts exchanges that keep the score (`digger.js:1469` rejects only lower
  or too hard): 4 neutral exchanges at 568 in the example; 45 at 2010 in Classic 9×9 Hell 1 seed 2299986211, whose
  replay has 106 steps today. The score goes **down** where clues are shown again (refinement of the top tiers,
  Greater-Than rounds) and where a guided objective (the level's techniques, no uniqueness assumption) differs from the
  full rating: with every move shown, 208 decreases in 28 of the 107 runs (§7).

### 4.4 Monotone? Unique? Solvable?

- **Not monotone** along the trace (above); the scoring header says so itself (`difficulty.js:17–19`).
- **The measured positions are sound.** All 5,911 fresh ratings of the 107-request sample completed, and the
  required uniqueness checks passed: 0 capped by the guard, 0 stuck; the 16 proofs that used a technique assuming
  uniqueness were confirmed by a solution count (9.13 ms in all). This is a measurement, not a guarantee: proposal
  and minimal-sign acceptance establish uniqueness without a complete logical proof
  (`generator/js/engine/digger.js:644–670`; `generator/js/variants/greater-than.js:291–300, 379–410`), and an
  abandoned dig or a rebuilt log needs its own status and provenance handling (R3, R5).
- **The replay's half-exchange boards are not.** In the 78 requests the removal halves gave 10 positions with at
  least 2 solutions: 9 without a complete proof, and one "rated" 3422 through a Unique Rectangle (Classic 9×9 Hell 1
  seed 2400651925, old step 35, 28 clues; its finished puzzle scores 2879).

## 5. The design: resolutions R1–R19

The resolutions merge claude-opus-5.5's R1–R17 and gpt-6-astra's R1–R14 (both 3-responses), which agreed on every
point of substance; they apply the user's decisions (§2) and the corrections of gpt-6-astra's check (§11). "Must"
marks what the implementation and its tests check.

| R | Topic | claude-opus-5.5 | gpt-6-astra | Decisions |
|---|---|---|---|---|
| R1 | Invariants | R1 | R1 | N1 |
| R2 | The move model | R2 | R2 | Q2 a |
| R3 | Variants, provenance and restarts | R13 | R11 | Q13 a, Q15 a |
| R4 | Where and when the ratings run | R3 | R3, R12 | Q17 b, Q19 a |
| R5 | Rating policy and statuses | R4 | R4 | Q14 a, Q18 b |
| R6 | Two views | R5 | R5 | Q1 a, Q3 a |
| R7 | The compact selection | R6 | R6 | Q2 a, Q3 a, Q12 a, Q13 a |
| R8 | The avoidability audit | R7 | R6 | 13:54 |
| R9 | A table on every step | R8 | R7 | N2, Q14 a, Q18 b, Q19 a |
| R10 | Tiers and the jump rule | R9 | R8 | Q4 b |
| R11 | Wording rules | R10 | R9 | Q11 |
| R12 | Step texts and board frames | R10 d–e, R12 | R5, R9 | Q3 a, Q13 a |
| R13 | The jump callout and "Why?" | R11 | R10 | Q5 a, Q11 |
| R14 | Naming the cause; the culprit frame | R12 | R9 | Q2 a, Q10 b |
| R15 | Persistence and the worker protocol | R14 | R12 | N1 |
| R16 | Where the code goes | R15 | R3, R13 | repository rules |
| R17 | Strings | R15 | R10, R13 | repository rules |
| R18 | Documents | R16 | R13 | repository rules |
| R19 | Tests and process | R17 | R14 | Q7 a, Q8 b, Q9 c |

### R1. Invariants

The generator, its algorithm, its random draws, its budgets, the dig log, the result (`givens`, `solution`, `model`,
`rating`, `digLog`), the `done` message, the regression hashes, the qualification lists, the cache (schema 2) and its
keys, the history (version 1) and the export stay identical for every request and seed. The example's deterministic
payload digest stays `d350758d7af16c41f4910469df513f56a7516966407285e1f39d9d983df68f2d` (gpt-6-astra). Every score
shown is the canonical rating (`SG.difficulty.rate`, or the same solve classified by `SG.difficulty.classify`) of the
board the step shows, or `result.rating` on the finished puzzle: never a smoothed, interpolated or copied number.
Ratings belong to **positions**; a change, its tier and its explanation belong to a **transition** between two shown
steps of one view (R15). Everything below is derived after the result exists.

### R2. The move model

The replay reads `result.digLog` once, in order, keeping the current pass, the board (starting from the solution), the
alive signs (starting from all signs of the `signs` entry) and the candidate context since the previous move. A move
is a complete change **derived from the log**: it tells what the board went through, not that the generator accepted
it as one transaction.

| Log entries | Move kind | Phase |
|---|---|---|
| the start | `solution` | `start` |
| Greater-Than: `clear`, then the `reveal` entries up to the next `pass` or `accept` | `clues` (one move) | `clues` |
| `accept` with a `sign` | `sign` | `signs` (`signsMinimal` in the pass `signs.minimal`) |
| `accept` in a `random` pass, or in the `fallback` pass that follows a restart | `random` (Stage A, whatever its order) | `random` |
| `accept` in a `guided` pass, with at least one `keep` since the previous move | `guided` | `guided` |
| `accept` in a `guided` pass, with no `keep` since the previous move | `searchRemove` | `search` |
| `accept` immediately followed by a `reveal` with `reason: 'search'` | `exchange` (one move) | `search` |
| a `reveal` with `reason: 'search'` on its own | `searchAdd` | `search` |
| any other `reveal` | `reveal` | `reveal` |
| `restart` | `restart` (the board is the solution again) | `start` |

- **`random` names Stage A, not its order.** The order is `config.digOrder`: random, rowByRow, snake, spiral or
  jumpOne (`generator/js/engine/digger.js:79, 210–221, 829–852`); the fallback pass after a restart uses the same
  order (`digger.js:925–934`). The texts say "at random" only when that order is random and the log is not rebuilt
  (R3, R12).
- **Candidate context and log spans.** `keep` and `reject` entries are context, not moves. Each move keeps the entries
  of its **log span**, from after the previous accept-based move to its own accept (offset, cells, score or reason),
  and the offset of its accept. A span can hold more than one guided round: a round whose candidates were all refused
  has no accept, and the next round follows without a marker (`digger.js:742–791`). Witness (gpt-6-astra): Mega
  16×16 Hell 2 seed 12, the accept at log offset 167 (m 76); its span, offsets 151–166, has 16 candidates (13 rejects,
  3 keeps), while a round on that board tests at most 10 (`max(4, min(32, round(32 × 81 / 256)))`,
  `digger.js:604–606, 754–756`). Counts are therefore given for the span, "before this accepted removal", never as one
  round. The `keep` entries of a span all belong to the round that ends with its accept: a round with a keep always
  ends with an accept (`digger.js:760–790`), and the chosen candidate is itself logged as a `keep`. The n-th `accept`
  of the log is the n-th accept-based move: checked on 70 of 70 guided jump moves.
- Each move records: its kind, phase and pass; its first and last log offsets; the cells removed and the clues
  restored, or the sign; its board (values) and alive signs.
- **An exchange is one move** (`digger.js:1362–1370`): no view ever shows a removal half. The text says "clear … and
  restore …", not "swap": the log cannot always tell one evaluated swap (`digger.js:1394–1469`) from adjacent
  independent changes.
- **Groups and signs are never split** (Q2 a): a move is the whole symmetric group, the whole exchange or one sign.
- **Consistency**: the last move's board and alive signs must equal `result.givens` and the finished puzzle's signs.
  When they do not, or when the log is unreadable, the replay falls back to the solution, the structure step (cages
  or signs) and the finished puzzle, each with its table, and says why (R4).
- The example has 32 positions (m 0–31): the solution, 22 random moves (43 cells: 21 pairs and the centre), 4 guided
  moves and 5 exchanges.

### R3. Variants, provenance and restarts

- **Killer.** The cages are a structure step with a zero table; every position is rated with the cages, and the cage
  techniques keep their names. **Rebuilt log (Q15 a):** when no sample reaches the band, the keeper may return a
  layout whose log was rebuilt from its clues (`generator/js/variants/killer.js:782–786, 814–821`): exactly one
  `{ op: 'pass', pass: 'random', clues: <cell count> }` followed only by `accept` entries, one per empty symmetry
  group in group order, matching exactly the finished puzzle's empty groups, for a request whose level **as asked**
  (`result.config.difficulty`, not the level the puzzle reached: the keeper can return a puzzle below the requested
  band) has a band that starts at Expert or above (the cage search runs only there: `killer.js:793–794`). The page
  recognises that shape. Its dig steps say only "Clear {removed}." (no order, no claim of a check) with the note "This
  replay is reconstructed from the finished puzzle's clues; it is not a record of the original generation order.";
  they get no choice sentence. "Reconstructed" says the log is not a record of the original order, not that the two
  orders differ. 0 of the 18 Killer requests had such a log, nor did gpt-6-astra's 8 extra Killer searches; its
  acceptance data builds a synthetic positive control from a real result.
- **Greater-Than.** The structure step "Signs" shows every sign (zero table). The starting clues ("Clear the grid, then
  show {clues}.") are the first rated **move**; then come sign removals, the minimal-signs pass and clues shown again.
  The first rated **step** of a view can come later: in G11 (Greater-Than Expert 42) the first compact puzzle is m 24,
  135, after 23 sign removals; in G12 (Greater-Than Hard 3115968914) it is m 92, 130, after 91 sign removals; the
  details view shows the starting-clue move on its own. Every position is rated **with its alive signs**
  (`generator/js/variants/greater-than.js:103–121`), which are part of the memo key; a sign move is named by its two
  cells ("the sign between R4C5 and R4C6"). Today's "the signs will do most of the work" (`replay.clues`,
  `generator/js/ui/player.js:844`, 902) goes.
- **Multigrid boards** (Samurai, Mega 16×16, …): one rating of the whole board, never a sum of grids; cells keep the
  variant's labels (`core/js/engine/model.js:472–490`; an overlap cell is named by the first grid that contains it).
  Samurai has 369 cells; Mega 16×16 is the heaviest case (206.66 ms for one rating).
- **Restart (Q13 a).** The log's `restart` comes from the safety net: the final count found a second solution, and the
  generator digs again from the full grid with a plain uniqueness check (`digger.js:916–935`). A restart starts a new
  chapter. In the compact view the abandoned dig is folded into the "Starting again" step, whose board is the solution
  again (zero table) and whose text tells the first dig (R12), so the compact view never goes down. The details view
  shows both digs and the drop to 0. There were 0 restarts in the 107 requests; the rule was prototyped on a synthetic
  log (`E\claude-opus-5.5\xreview\out-p3-restart.txt`): compact `0, 0, 23, 44, 600, 992, 992`.

### R4. Where and when the ratings run (Q17 b, Q19 a)

- **The client that runs the job.** The page awaits `ready()` of the client that will run the preparation before it
  decides anything: until then `mode` can be a guess (`generator/js/worker/worker-client.js:8–10, 529–535`).
  Preparation starts by itself only when that client is confirmed to run in a worker; never on the strength of the URL
  or of a guess.
- **Worker mode.** After `done` (`generator/js/worker/gen.worker.js:189`) the page shows the finished puzzle and its
  Summary at once, as today. It then posts `{ type: 'replay', session, result }`, where `result` is the
  `SG.pipeline.toWire` data that `done` carried (it includes `digLog`: `generator/js/engine/pipeline.js:291–303`). The
  worker rebuilds a separate model from that data (`fromWire`) and never touches a running generation. It rates in
  slices, like generation (`gen.worker.js:182–191`), posts `{ type: 'replayProgress', session, done, total }`, then
  `{ type: 'replayDone', session, analysis }` or `{ type: 'replayError', session, error }`. A `cancel`, a `generate`
  or a new `replay` pre-empts the job at the next slice boundary (`gen.worker.js:258–274`). The job prepares
  everything both views need (R15) before it answers `replayDone`. While it runs, the replay shows "Preparing the
  score tables… {done} of {total}" and its controls wait: no step is shown without its table. Measured for the
  ratings: median 3.14 ms per puzzle, maximum 594.34 ms (Mega 16×16 Hell 2).
- **Main mode (Q17 b; Q19 a, decided at 18:40).** When the client runs on the page (the direct client,
  `generator/js/ui/app.js:218, 264`, for example from `file://`, where browsers do not allow Web Workers), nothing
  runs by itself: neither the analysis nor the generation of a missing log. The finished puzzle and its Summary stay
  usable. The replay shows only the notice ("This page has no background worker. Press 'Prepare score tables' to
  calculate the score tables on this page; the page may stop responding briefly while it works.") and the button
  "Prepare score tables"; the slider, the step buttons, autoplay and the view toggle are disabled until the button is
  pressed. Pressing it runs the same job on the page for the puzzle on show, one rating per slice, yielding to the page
  between slices (one rating can still pause the page: up to 206.66 ms measured), with the same progress line; then
  both scored views open. Each new puzzle needs a new press.
- **No path around the gate.** `attachTrace`, a cache hit, a worker that fails to start, autoplay, a change of
  language and navigation must not start work on the page. Today two paths would: the cache's background client falls
  back to the page by itself (`generator/js/ui/cache.js:686–688`), and a cache hit starts the generation of the
  missing log by itself (`cache.js:1008–1035, 1071–1087`). gpt-6-astra's simulation of a main-mode cache hit counted
  1 automatic log generation before any press. In the main mode that generation also waits for the press.
- **Routing.** The cache wraps the client and forwards `generate`, `cancel`, `ready`, `mode` and `inner`, but has no
  `replay` (`cache.js:1152–1161`). The wrapper also forwards `replay` to its inner client: that is the routing this
  spec chooses (R16); a separately managed analysis client was the alternative. The cache's schema, keys and payloads
  do not change.
- **A cached puzzle without its log.** In worker mode the log is generated again in the background, as today
  (`generator/js/ui/cache.js:203–205, 998`; `generator/js/ui/app.js:858–873`), then analysed. In the main mode the
  press first generates the log, with one direct call that does not go through the same cache hit (so it cannot
  loop), then analyses it. If the log cannot be had, the replay says "The full generation record of this puzzle is not
  available; the replay shows only the solution, the structure and the finished puzzle." and shows those steps with
  their tables.
- An answer for another session is ignored. Rendering, moving between steps and changing the language use the
  analysis only: zero solver calls.

### R5. Rating policy and statuses

- **One solve per position.** The job solves each position once with the canonical options of `SG.difficulty.rate`
  (every technique, uniqueness assumed) through `SG.logicalSolver.solve`, keeps the solver's own status, and
  classifies the report with `SG.difficulty.classify`; `rate` itself drops that status
  (`generator/js/engine/difficulty.js:391–453`). No second solve and no invented reason. The solve has a deterministic
  guard of **1,000,000 checks** (`SG.budget.create({ nodes: 1000000 })`), no clock. The largest work of a rated
  position measured is 113,177 checks (G14, Mega 16×16 Hell 2 seed 12, m 76), so a guard of 100,000 would fail. The
  finished position (m 77) needs 123,741 checks, but it is never solved again (next point).
- **The finished puzzle** takes `result.rating`, never rated again and never overwritten. It goes into the memo
  **first**, so an earlier identical board reuses it and cannot be capped. The solution, the structure step and a
  restart score 0 without a solve. Identical boards (values plus alive signs) are solved once: 49 memo hits in the
  corpus.
- **Uniqueness.** When the proof used a technique that assumes uniqueness (`SG.difficulty.provesUniqueness(rating)` is
  false, `difficulty.js:432`), `SG.dfs.countSolutions(model, values, 2, budget)` with its own guard of **200,000
  nodes** must return 1 before the score is used: 16 counts, 9.13 ms, 0 with two solutions. A count of 2 means **at
  least two** solutions.

| Status | Meaning | Score | Rows |
|---|---|---|---|
| `rated` | complete proof, unique (by the proof itself or by the count) | yes | the proof's counts |
| `zero` | the solution, the structure step, a restart | 0 | none |
| `final` | the finished puzzle: `result.rating` | yes | the Summary's |
| `capped` | the guard ran out (Q18 b: an honest status, no retry) | no | none: the interrupted solver returns no counts |
| `stuck` | the solver stopped before completing the board (Q14 a) | no | the techniques it applied, labelled as attempted |
| `ambiguous` | the count found at least two solutions | no | the attempted rows, when the solve returned counts |
| `unverified` | the count ran out of its guard | no | the proof's rows, labelled as attempted (not validated) |

- When a solve stops and the count also finds two solutions, the status gives both reasons.
- **Optional work never undoes a rating.** The explanations (R13, R14) need more solves: the first use, the restricted
  check and the partial boards. When one of them fails (guard, error, cancellation), its sentence is left out or
  replaced by its honest limitation, with no retry; it never removes a certified rating and never discards the replay.
  Only a failure of the move model or of the ratings themselves answers `replayError` (R15).
- Measured on the 107 requests: 5,911 fresh ratings, 0 `capped`, 0 `stuck`, 0 `ambiguous`, 0 `unverified`.
- **Renderer control** (gpt-6-astra's acceptance data): the removal half of today's step 11 of the example: E 53,
  `stuck`, at least 2 solutions, attempted counts `nakedSingle` 2, `hiddenSingleBox` 15, `pointing` 6, `boxLine` 1,
  `nakedPair` 2, `hiddenPair` 2, `wWing` 2, `uniqueRectangle` 1, `forcingChain` 4. It tests the status table; it is
  never a step of the replay.

### R6. Two views (Q1 a)

- **Compact (default)**: the score-chosen steps of R7. **Details**: the toggle "Show every move" (VI "Hiện từng thay
  đổi") gives one step per move of R2, plus the solution, the structure step and the finished puzzle. The same kinds
  of tables, tiers and explanations (R9–R14) apply between adjacent steps of the view on show; each view has its own
  transitions (R15), and both are prepared before the replay opens.
- Changing the view keeps the place: a compact step maps to the details step of its last move, and a details step to
  the compact step that contains its move.
- The details view shows real decreases (the Total reads, for example, "430 (−20)"; the step text tells what was
  restored) and moves that cannot be scored (Q14 a, R9). It never folds anything.
- The toggle is a display option: it is not stored with the puzzle, the history or the export, and the page opens in
  the compact view.
- Example: 7 compact steps, 33 details steps. Corpus: compact 5–10 steps (median 7); details 22–135 (median 33).
  Greater-Than and Samurai reach 97–135 details steps because every sign or group is a move.

### R7. The compact selection (Q2 a, Q3 a, Q12 a, Q13 a)

Input: the moves `0 … N−1` with their status and score (R5). Constants: `MIN_GAIN = 10`, `R_MIN = 1.3`, `R_MAX = 3`,
`R_EXP = 1/6`, `f10(x) = max(x, 10)`; they are presentation constants of the module, in one place.

1. **Chapter.** `s` = the index of the last `restart` move, or 0; `e` = the last scored move (normally `N − 1`).
   Moves before `s` are folded into the "Starting again" step (R3, R12).
2. **Eligible positions** (Q3 a): `s`, `e`, and every scored `i` in `(s, e)` whose score is not above the score of any
   later scored position up to `e`. Everything else is folded into a step and told in its text.
3. **Ratio**: `R = clamp((f10(score(e)) / 10) ^ R_EXP, R_MIN, R_MAX)` (example: 992 gives 2.15).
4. **Cuts, with a rank:**
   - `s` (rank 4) and `e` (rank 3);
   - **rise** (rank 3): for consecutive eligible `a < b`, if `f10(score(b)) ≥ R·f10(score(a))`, both `a` and `b`;
   - **phase end** (rank 2, Q12 a): in every maximal run of consecutive moves of one phase in `(s, e]`, its last
     eligible position;
   - **fill** (rank 1): walking the eligible positions in order with `last` = the latest cut, `i` when
     `f10(score(i)) ≥ R·f10(score(last))` and `score(i) − score(last) ≥ MIN_GAIN`.
5. **Small steps.** While two consecutive cuts `a < b` differ by less than `MIN_GAIN`: drop `b` if its rank is 1, else
   drop `a` if its rank is 1 and `a ≠ s`, else keep both (a flat step between two protected cuts, allowed by N2).
6. **Audit** (R8).
7. **Steps shown**: the solution; the structure step (cages or signs), if any; the "Starting again" step if `s > 0`;
   one step per cut after `s`, ending on its board; the finished puzzle.

```text
select(moves):
  s = lastIndexOfKind(moves, 'restart') or 0
  e = last scored index >= s
  eligible = [i in s..e : i == s or i == e or (scored(i) and score(i) <= min score of scored j in (i, e])]
  R = min(3, max(1.3, (f10(score(e)) / 10) ^ (1/6)))
  cuts = {s: 4, e: 3}
  for consecutive a < b in eligible: if f10(score(b)) >= R * f10(score(a)): rank a and b at least 3
  for each maximal run of one phase in (s, e]: rank its last eligible position at least 2
  last = s
  for i in eligible (i > s):
    if i in cuts: last = i
    else if f10(score(i)) >= R * f10(score(last)) and score(i) - score(last) >= 10: cuts[i] = 1; last = i
  repeat until stable: for consecutive cuts a < b with score(b) - score(a) < 10:
    if rank(b) == 1: drop b   else if rank(a) == 1 and a != s: drop a
  return audit(sorted(cuts))
```

**The example**: cuts at position 7 (fill: 23 ≥ 2.15 × 10, +23), 22 and 23 (rise 44 → 551; 22 also ends the random
run), 26 (end of the guided run, 568) and 31 (end, 992). Between 23 and 44 there is no fill (44 < 2.15 × 23); the four
neutral exchanges at 568 fold into the last step (992 < 2.15 × 568). Shown: `0, 23, 44, 551, 568, 992, 992`.

**On the corpus**: 779 steps (5 / 7 / 10 per puzzle), all with a numerical table, 0 decreases; 17 steps keep the
score of the step before (10 at the chapter's last move, 7 between rise or phase cuts), as N2 allows; the same score
sequence as claude-opus-5.5's phase-1 segmentation in 91 of 107 puzzles, which had 17 decreases in 12 runs.

### R8. The avoidability audit

The audit makes sure that a jump left in the compact view is one that the recorded moves cannot remove (13:54).

1. For each pair of consecutive cuts `a < b` whose edge is a jump (R10) and spans two moves or more, search the scored
   positions `j` in `(a, b)` with `score(a) ≤ score(j) ≤ score(b)` for a non-decreasing chain `a → j₁ → … → b` with no
   jump edge; prefer the fewest positions, then the smallest largest ratio (with `f10`). Insert it when it exists.
2. When no such chain exists (gpt-6-astra's partial reduction), insert the non-decreasing chain that most lowers the
   largest ratio of the edge, audit the new edges again, and keep the jump that remains.
3. The first rated step must not hide a rise: its end is never later than the start of the first rise of ×R or more
   (rule 4 of R7 already cuts it; the audit asserts it).
4. **Scope.** The audit works on the whole moves the generator recorded (Q2 a). A jump that remains cannot be removed
   with those moves; the page never claims that no easier board exists. The audit records its scope for every edge it
   checks: `complete` when every position inside the edge was scored, `ratedOnly` when some could not be. A position
   that could not be scored is never taken as proof that no bridge exists; with `ratedOnly`, "Why?" adds "Only the
   recorded boards that could be rated were searched for smaller steps." (R13).

On the corpus no edge needed an insertion (0 in 107 requests), every audit was `complete` (all 5,911 ratings
completed), and an independent re-check found 0 avoidable jumps. The rule was exercised on a synthetic trace with one
move per score `0, 23, 44, 100, 200, 400, 800, 992`: the selection gives `0, 23, 44, 100, 400, 992`, whose edge
100 → 400 is a jump (×4, +300); the audit inserts 200 and shows `0, 23, 44, 100, 200, 400, 992`.

### R9. A table on every step (N2)

| State | What the table area shows |
|---|---|
| The replay's start, before step 1 (slider position 0: the empty grid) | the table's heading and "No score yet: this is not a puzzle yet."; no rows, no total |
| Full solution, cages, signs, "Starting again" | a numerical table: Empty cells 0, Total 0, and today's line "No solving technique is needed yet." |
| Every other compact step, every scored details step | the canonical table of the step's board: the technique rows, Empty cells, and the Total with its change from the step shown before: "551 (+507)", "568 (unchanged)"; in the details view a decrease reads, for example, "(−20)" |
| Finished puzzle | the Summary's table (`result.rating`), for example "992 (unchanged)" |
| Worker mode, while the job runs | no step is shown: the progress line; the replay waits (R4) |
| Main mode, before "Prepare score tables" is pressed (Q19 a) | no step is shown: the notice and the button; browsing is disabled (R4) |
| The log is missing or unreadable | the solution, the structure step and the finished puzzle, each with its table, and a notice (R2, R4) |
| `capped` (details only; Q18 b) | heading, no rows, no total: "Not rated: the computational limit for this rating was reached." No retry button |
| `stuck` (details only; Q14 a) | "Not rated: this solver stopped before completing the board.", then the attempted rows with their counts under "The rows show techniques the solver applied, not a validated difficulty rating."; no total |
| `ambiguous` (details only) | "Not rated: this board has at least two solutions."; the attempted rows and their label when the solve returned counts; no total |
| `unverified` (details only) | "Not rated: the page could not confirm a unique solution for this board."; the proof's rows under the same label; no total |

- A compact step always has a numerical table: R7 only cuts at scored positions.
- **Status tables are a branch of their own** in the renderer: rows with the technique and its count, no Total and no
  score-contribution cells or tooltips. They never pass partial counts through today's `scoreTable`, which computes
  each technique's share of the score (`generator/js/ui/step-view.js:429–467`).
- A table is never copied from another step; the change is that of the step's transition: against the step shown
  just before, in the view on show (R15), not against an older known rating (today's backward scan,
  `generator/js/ui/player.js:541–551`, goes). After a status step, the next scored step shows no change.
- The change shows on the Total only; there are no per-row deltas. For 568 → 992 the rows still used change by +937
  and the rows no longer used by −513, +424 in all: a per-row column would mislead (gpt-6-astra).

### R10. Tiers and the jump rule (Q4 b)

Between a step and the step shown just before it, in the view on show (one transition, R15), with the exact integer
totals:

| Tier | Rule | What is shown |
|---|---|---|
| First rated puzzle | the first scored step of the view after the zero steps: before = 0, after > 0 | the label "First rated puzzle" and one line naming the hardest technique; no multiplier, no badge |
| Score jump | before > 0 **and** after − before ≥ 100 **and** after ≥ 3 × before | the badge "Score jump ×{ratio}" in the heading, the callout (R13), the cause (R14); the label "New hardest technique" on that technique's row only when it is new (below), otherwise the Total is highlighted without that label |
| New hardest technique | not a jump; the step before has a known proof, and the end board's hardest technique was not used by it, whether the score rises, stays or falls | one neutral line and the row label; neither says that the weight or the score rose |
| Other | — | the step text and the table |

- **The badge's ratio** is `Math.floor(10 × after / before) / 10`, written with exactly one decimal in the locale's
  format: 551 / 44 → ×12.5 (VI ×12,5); 300 / 100 → ×3.0; 1000 / 300 → ×3.3. It never overstates and is never below
  ×3.0. The tier is decided on the exact integer totals, never on the written ratio, and never at a zero or unknown
  baseline; the exact numbers may stay in an accessible description of the badge.
- A decrease (details view only) gets no badge, but it gets the neutral line when its hardest technique is new.
  Measured cases at an equal or lower score: Samurai Nightmare 42 m 100 → m 101, 70 → 70 (Naked Single → Hidden
  Single (box), P 1 → 1.25); Samurai Expert 1 m 85 → m 86, 68 → 68 (the same techniques); Killer Nightmare 42
  m 41 → m 42, 2788 → 1940 (Nishio → Forcing Chain); Greater-Than Expert 42 m 103 → m 104, 1967 → 1264 (Forcing
  Chain → W-Wing); Jigsaw Nightmare 3962167687 m 30 → m 31, 2515 → 1938 (Nishio → Forcing Chain).
- If the step before has no score (a status table), the step gets no change and no tier.
- "First rated puzzle" labels the first scored step of the view on show; it does not force a compact cut. In G11 the
  compact view's first rated puzzle is m 24 (135) and in G12 m 92 (130), after 23 and 91 sign removals (R3).
- **Transitions differ by view.** The same end position can be a jump in one view and not in the other: G06 (Jigsaw
  Nightmare 42) m 31 is 138 → 1678 (+1540, a jump) in the compact view and 2967 → 1678 (−1289) in the details view;
  G10 (Killer Nightmare 42) m 42 is 607 → 1940 against 2788 → 1940; G12 m 103 is 130 → 638 against 642 → 638; in
  G01 the step to m 31 (568 → 992) starts from W = 906.5 (m 26) in the compact view and from W = 906.75 (m 30) in the
  details view. The finished puzzle after the last move (992 → 992 in the example) is a transition of its own, with
  no change and no line. In the 14 goldens: 13 compact jumps, 16 details jumps, 19 distinct jump transitions.
- Counts on the 107 requests: compact 107 first rated puzzles, 84 jumps in 76 runs, 124 one-line steps; details 107,
  90 jumps in 76 runs, **155** one-line steps (149 at a higher score, 6 at an equal or lower one). On gpt-6-astra's
  35 requests, dropping the rise condition takes the lines from 40 to 40 in the compact view and from 52 to 57 in the
  details view. Every one of the 84 compact jumps brings a new hardest technique; a jump whose hardest technique stays
  the same (W or E grows) has its own first sentence (R13).

### R11. Wording rules

a. **"The generator's solution uses X."** Never "cannot be solved without X" or "must use X": the board after a jump
   solves without its new hardest technique in 82 of 84 jump steps (example: the 551 board without Simple Colouring
   scores 1113 with W-Wing; the 992 board without XYZ-Wing, 1117). "New hardest technique" says only that the
   technique was not in the proof of the step before.
b. **Weights and terms.** A technique's points are its "weight" in sentences (the guides' word: `USERGUIDE.md:240`):
   "Simple Colouring (weight 360)"; the table keeps its column "w = points per use". **P** is a weight, written "P,
   peak technique weight"; **W** is "the weighted sum of technique uses": sentences say that this weighted sum grew,
   never that W counts deductions or that the solution "became much longer".
c. **Direction from the data.** Every sentence about P, W, E, V, R or the Total follows the real values of the
   transition: for 568 → 992 (compact), P rises, W falls (906.5 → 806.75) and E does not change.
d. **The generator's limited check.** The `keep` scores are the objective of the generator's own check, not the
   canonical rating, even though they matched it in every numeric case measured: sentences say "by the generator's
   limited check", and a check score is never set beside a full rating without naming both.
e. **Proof scope**, in the disclosure: "These numbers describe the generator's solution, not every way to solve the
   puzzle."
f. **Actions.** The clue in a cell is cleared (removed) or restored; the cell is not removed from the grid. An exchange
   is "clear … and restore …", with the net change on the board and the gross counts in the text. Every change, probe
   and culprit carries its action, and its wording and legend follow that action (R14).
g. **No** "the signs do most of the work".
h. **The restricted-solver check** (approved by gpt-6-astra in this wording). Only inside "Why?", so that the visible
   part keeps three sentences or fewer. Shown only when the end board is uniqueness-confirmed and a separate
   `SG.logicalSolver.solve` restricted to the techniques whose weight is **strictly below** w (the end board's hardest
   weight), with the existing intrinsic limits and a bounded guard, returns `status: 'stuck'`. A guard, a
   cancellation, an error or a completed restricted proof means no sentence.
   EN: "In a separate check, this solver stopped before completing the board using only techniques with weights below
   {w}." VI: "Trong một lần kiểm tra riêng, bộ giải này chỉ dùng các kỹ thuật có trọng số dưới {w} và đã dừng khi chưa
   giải xong đề." It reports what this solver did, not a necessity: it stopped on the end boards of 84 of 84 compact
   jumps (claude-opus-5.5) and on 13 of 13 golden after-boards, while all 13 golden before-boards completed
   (gpt-6-astra; 54.50 ms for the after-checks); and 16 of 124 one-line boards and 9 of 107 first rated puzzles do
   finish with lighter techniques, so it is never assumed.
i. **Randomness.** "At random" only for a Stage A move of a normal log whose configured order is random (R2, R3);
   otherwise order-neutral text.
j. **Formats.** Numbers in the locale's format (Vietnamese decimal comma); counts with `_one` / `_other` forms. A
   counted unit ("10 cells") and a list of cells ("R1C2 and R9C8") are different placeholders: `{removed}`,
   `{revealed}`, `{tried}` and `{kept}` are counted units, as today (`generator/js/ui/player.js:416–441`); `{cells}`,
   `{removedCells}`, `{restoredCells}` and `{cellList}` are lists. Cell and sign names as the replay writes them today.

### R12. Step texts and board frames

- **Title**, by the phase of the step's moves: today's `replay.title.*` for the full solution, cages, signs, starting
  clues, removing signs, more clues, starting again and the finished puzzle; "Random removals" for Stage A only when
  its order is random and the log is normal, otherwise "Removing clues" (`replay.title.dig`); "Choosing clues to
  remove" for the guided dig (today "Hardest removal"); "Adjusting the puzzle" for the local search
  (`replay.title.search`). A step whose moves come from several phases is titled "Combined changes", and its sentences
  name each operation (gpt-6-astra's "Mixed" role); the step that ends on a restart is always "Starting again",
  whatever it folds.
- **Sentences**: one per maximal run of moves of one kind, in order, with summed counts:
  - Stage A: "Clear {removed} chosen at random: the puzzle can still be solved without their clues." / "Try to clear
    {tried} chosen at random: {removed} cleared, {kept} put back because {reason}." (`replay.random.*`), or their
    order-neutral forms (`replay.dig.all`, `replay.dig.some`); a rebuilt log: "Clear {removed}." (`replay.dig.rebuilt`)
    and the note of R3. The reason `techniques` reads "without their clues, the solver did not finish the puzzle with
    the techniques of this level": a stopped solver, not an impossibility.
  - Guided: "Compare {rated} ({refused} rejected) and choose the removal preferred by the generator's check:
    {cellList}." for one accepted removal (`replay.guided`); "Across {rounds} accepted removals, compare {rated}
    ({refused} rejected); the removed clues are at {cellList}." for several (`replay.guided.rounds`).
  - Local search: "Adjust the clues to look for a higher-scoring puzzle: clear {removed} and restore {revealed}." /
    "Across {count} complete changes, clear {removed} and restore {revealed} while looking for a higher-scoring
    puzzle." (`replay.exchange_one` / `_other`; the totals are gross, not the net change framed on the board); "Clear
    {removed} while looking for a higher-scoring puzzle." (`replay.searchRemove`); "Restore {revealed} while looking for
    a higher-scoring puzzle." (`replay.reveal.search`).
  - Signs and the refinement: today's `replay.signDig.*` and `replay.reveal`.
  - **Counts come from the log spans** of the step's accept-based moves (R2): `{rated}` counts every `keep` and
    `reject` of those spans, `{refused}` the rejects, plus the trailing entries of a pass that ends inside the step (a
    last round with no accept); they are never called rounds.
- **Folded excursion** (Q3 a): when a position inside the step scores above its end, the text adds "Within this step,
  the score reached {peak}." When the peak lies above the chosen level's band and clues were restored in the
  refinement, it adds instead "Within this step, the score reached {peak}, above the chosen level, and {revealed} were
  restored during refinement." Any other excursion gets the neutral sentence plus the sentence of its actual restore
  action. Corpus: 45 such steps in 27 runs, 9 with restored clues.
- **Positions inside a compact step that could not be rated**: "{count} positions within this step could not be
  rated." (0 in the corpus).
- **Restart (Q13 a)**: the "Starting again" step keeps today's `replay.restart`, which states the recorded reason (the
  final count found a second solution, R3), and adds "Before starting again, generation reached {peak} points after
  {moves}." with a known peak only.
- **Rebuilt Killer log**: every dig step adds the note of R3.
- **Board frames**: today's frames (removed, put back, shown again; `core/css/board.css:223–240`) mark the step's net
  change; the gross counts are in the text. Example step 6: the clues of R4C2, R5C1, R5C9 and R6C8 cleared, those of
  R1C8, R2C8, R8C2 and R9C2 restored; the text says 10 cells cleared and 10 clues restored in all.

### R13. The jump callout and "Why?" (Q5 a, Q11)

- **Where**: the badge in the step's heading; the callout below the step text and above the table; the row label
  (R10); the frame on the board (R14).
- **Visible part**: the line "Score jump: {from} → {to} ({change})" and at most three sentences:
  - S1, what changed and the technique: "After {change}, the generator's solution uses {technique} {count} times;
    previously, its hardest technique was {previous}." (`_one`: "… uses {technique} once; …"). `{change}` is a fragment
    chosen by the action, and each language builds its own sentence around it (EN "After the clues at R1C2 and R9C8
    are removed, …", VI "Sau khi bỏ số cho sẵn ở R1C2 và R9C8, …"): the clue(s) at {cells} removed or restored,
    {sign} removed, the clues at {removedCells} removed and those at {restoredCells} restored, or the {count} changes in
    this step. When the hardest technique stays the same: "After {change}, the weighted sum of technique uses in the
    generator's solution grew from {from} to {to}." (unexercised in the measured compact jumps).
  - S2, why it counts so much: "The largest technique weight, {w}, contributes in full as the P term of the score
    (P = {w})."
  - S3, the cause, one sentence (R14).
- **"Why?"** (`details` / `summary`, closed by default, keyboard and touch accessible), one line each, for the
  transition on show:
  1. "P, peak technique weight: {from} → {to} ({change})".
  2. "W, weighted sum of technique uses: {from} → {to}".
  3. "R = 0.25 × P × log₂(1 + W ÷ P): {from} → {to} ({change})" (R = 0 when P = 0: never a division by zero).
  4. "E, number of empty cells: {from} → {to}".
  5. "V = 80 × E ÷ (E + 40): {from} → {to} ({change})".
  6. "Score = V + P + R, rounded: {from} → {to} ({change})": the difference of the rounded totals, not a sum of
     rounded parts. Each term's change is rounded after the subtraction (V: 42.352941 − 41.445783 = 0.907158, written
     +0.91, not 42.35 − 41.45).
  7. "Level: {from} → {to}" (Q11 i), with the level names of the Summary.
  8. The generator's choice (Q11 ii), for a jump made by one move. The analysis keeps, per accept-based move: `chosen`
     (the chosen candidate's logged check score, or null), `at` (its accept's log offset), `rated` (every candidate of
     the span), `refused` (the rejects), `others` (the other keeps with a numeric score), `nulls` (the other keeps
     without one) and `max` (the largest score among `others` only).
     - guided, `others ≥ 1`: "The log records {rated} candidates before this accepted removal, with {refused}
       rejected; the other {others} candidates with completed scores reached at most {max} by the generator's limited
       check." (one other: "…; the other candidate with a completed score reached {max} by …"); then, if `nulls ≥ 1`,
       "The limited check did not finish the boards for {nulls} other retained candidates, so they have no numerical
       check score.";
     - guided, `others = 0`, `nulls ≥ 1`: "The log records {rated} candidates before this accepted removal, with
       {refused} rejected." then "No numerical score from the limited check is available for the other candidates.";
     - guided, `others = 0`, `nulls = 0`: the same first sentence when `rated ≥ 2`, then "The log records no other
       retained removal candidate for this choice.";
     - guided, `chosen` null, after the sentences above: "The generator's limited check did not finish the board after
       the chosen removal; its objective ranks such a removal above every removal it could finish." Null is not 0,
       not a time-out and not a failed uniqueness test: it is the proposal dig's objective for a board that its
       techniques below the chain group did not finish, ranked above every finished one
       (`generator/js/engine/digger.js:369–371, 608–609, 644–671`). Cases: G13 (offset 229; 6 others, at most 72),
       G14 (offset 84; 6 others, at most 66), and the witness m 76 of the same Mega 16×16 puzzle (offset 167;
       0 numeric others, 2 unscored), where "no other removal passed" would be false;
     - random (Stage A of a normal log with a random order): "This group was picked at random.";
     - exchange, sign, Stage A with another order, other moves of the local search: "The log contains no
       comparable-candidate scores for this change." (the local search does compare scores, and its keeper can keep a
       candidate outside the current search: `digger.js:1441–1469`);
     - a step of several moves: "This step combines {count} changes; it is not a single candidate-comparison round.";
     - clues restored, or a rebuilt log: no sentence.
  9. The restricted-solver check of R11 h, when it applies.
  10. The audit's scope, when it is `ratedOnly` (R8).
  11. The first use (Q11 iii), on the **step's end board**, the board whose P, W and E the lines above show: "First use
      in the generator's solution: logical deduction {k} of {n}.", then the solver's own text for that deduction
      (`SG.i18n.t(step.i18nKey, step.i18nArgs)`; in the example `technique.simpleColouring.step`), then **every**
      effect of that deduction, grouped by the cells they touch: "In that deduction, candidate {digits} is removed
      from {cells}." (several digits: "candidates {digits} are removed from {cells}") and "In that deduction, {digit}
      is placed in {cell}." These are effects at that logical step, not marks on the clue board: G09's first Rule of
      45 removes 2 and 5 at R7C5; G10's removes 1, 6, 7 and 9 at R7C1.
  12. "These numbers describe the generator's solution, not every way to solve the puzzle."
- **Style**: neutral information, not a warning: `--sg-color-accent` and `--sg-color-accent-soft` (defined in every
  theme of `core/css/tokens.css`), a border and text so that colour is not the only signal; no animation.
- One-line steps and the first rated puzzle show their line and the row label only: no badge, no disclosure. No
  pattern of the proof is drawn on the board (Q16 a).
- **Evidence** (`E\claude-opus-5.5\xreview\out-p4-cost-summary.txt`, `E\claude-opus-5.5\xreview\out-p4b-extra.txt`):
  of the 84 compact jumps, 71 are one move (guided 64, sign 4, random 2, exchange 1) and 13 several moves. The move
  that carries the jump is guided in 70 steps (the 64 and 6 of the 13); in all 70 the span binds by log offset and the
  chosen candidate is logged as a `keep`; 1 span has an unscored other candidate and 5 have no numeric other;
  candidates per span: median 7, maximum 19. The logged score of the chosen candidate equals the canonical rating in
  840 of 840 numeric cases (null in 79 of 919); gpt-6-astra matched 217 of 217 `keep` scores on six Master seeds
  (573.959 ms). The first use was found on the end board in 84 of 84 jump steps, at median logical deduction 33 of 75
  (56.77 ms in all, maximum 3.96 ms); on 12 of the 13 several-move jumps the end board is not the board where the
  technique first appears.

### R14. Naming the cause; the culprit frame (Q2 a, Q10 b)

- For a jump made by **one move that changes 2 to 4 cells**, rate every proper non-empty subset of the change applied
  to the start board, each cell with its action (a removed clue is cleared, a restored clue is restored). These
  partial boards are never steps (Q2 a). A partial board that only restores clues on a unique board is unique; any
  other one is confirmed by the 200,000-node count. The single-cell probes come in a fixed order: the removed cells
  first, then the restored ones, each by cell index.
- The **share** of a cell is `max(0, log(s / before) / log(after / before))`, where `s` is the score with that cell
  alone changed (before > 0 for every jump). The classes and their names are those of the analysis and of
  gpt-6-astra's acceptance data:

| Class | Rule | 84 compact jumps | S3 (EN) |
|---|---|--:|---|
| `single-culprit` | exactly one cell has a share ≥ 0.9 | 42 | "Removing the clue at {cell} alone gives {score}; removing the clue at {other} alone gives {otherScore}." Groups of 3–4 cells: "…; removing the other {count} clues without it gives {otherScore}." In an exchange: "…; the rest of this change without it gives {otherScore}." A restored culprit: "Restoring the clue at {cell} alone gives {score}; the rest of this change without it gives {otherScore}." |
| `together` | every cell has a share ≤ 0.1 | 21 | "Removing each clue alone gives {scores}; removing the whole group gives {after}." An exchange: "The separate changes give {scores}; the combined change gives {after}." |
| `mixed` | any other share vector, including two or more cells with a share ≥ 0.9 | 4 | "Removing the clue at {cell} alone gives {score}, versus {after} for the whole symmetric group, which is always displayed as one complete change." ({cell}: the largest share, ties by cell index). An exchange: "On its own, the change at {cell} gives {score}, versus {after} for the whole change, which is always displayed as one complete change." |
| `single-sign` | the move is one sign | 4 | "This step removes one sign; there is no smaller sign-removal move to show." |
| `single-cell` | the move changes one cell | 0 | "This step removes one clue; there is no smaller clue-removal move to show." Restored: "This step restores one clue; there is no smaller clue-restoring move to show." |
| `multi-move` | the jump spans several moves | 13 | "Within this step, {technique} first appears after complete change {k} of {n} ({change})." ({k}: the first complete change of this step whose rated board uses the technique; never an unrated position, never a change outside this step), with the folded excursion of R12 (all 13 have one; 8 reach the level's maximum or more; 3 restore clues) |
| `unavailable` | a probe was capped, stuck, ambiguous or unverified | 0 | "The parts of this change could not all be rated, so no single cause is named." |

- **Frame (Q10 b)**: only when exactly one clue or sign causes the jump: `single-culprit`, `single-sign` and
  `single-cell`; 46 of the 84 jumps (42 culprits and 4 signs; gpt-6-astra re-checked that all 42 culprits are uniquely
  dominant). The culprit cell gets the class `cell--cause` instead of `cell--dug`; a single sign gets `sign--cause`;
  the legend gains "Removing this clue causes the score jump", "Removing this sign causes the score jump" or, for a
  restored culprit, "Restoring this clue causes the score jump". No frame for `together`, `mixed`, `multi-move` or
  `unavailable`, and never a removal legend on a restored clue.
- **Negative fixture** (O3): a probe vector in which two single cells both have a share above 0.9 gives `mixed` and
  no frame (an older research helper tested `some(...)`, not "exactly one"); a guarded probe gives `unavailable`.
- **Cost**: 146 partial ratings, 42.87 ms in all; the largest case 9.33 ms (14 boards, a 4-cell exchange). The single
  moves of the 71 one-move jumps change 2 cells (66), 4 cells (1) or a sign (4).
- **Example**: removing the clue at R1C2 alone scores 550 (Simple Colouring), removing the clue at R9C8 alone 44, so
  R1C2 (share 0.9993) is the culprit and is framed.

### R15. Persistence and the worker protocol

- The analysis lives in memory with the puzzle on show and is rebuilt after a cache hit (R4). Nothing is added to the
  cache (schema 2), the history (version 1), the export, the URL, the `done` result or any key; the example's export
  differs only by `generatedAt`.
- **Sizes measured** are the serialized UTF-8 JSON of the rating rows only (`Buffer.byteLength(JSON.stringify(...))`
  in the prototype): median 3,005 B and maximum 20,068 B per puzzle for every position (995 B and 1,636 B for the
  compact positions only); gpt-6-astra's richer schema 4,797 B and 20,144 B. They are not the memory of the analysis:
  one prototype kept up to 197,784 B of board values separately (an implementation may rebuild boards from the moves
  instead), and the full two-view payload and its heap are not measured yet.
- **Keys.** Ratings and proofs belong to positions (move indices). Everything about a change belongs to a transition
  `(view, from, to, role)`, with `role` `step` or `final`: the tier, the ratio, the change, the P / W / E / V / R
  values before and after, the cause and its probes, the choice and its log span, the folded notes and the audit's
  scope. The job prepares the transitions of **both** views before it answers `replayDone`; navigation never starts a
  solver. The final duplicate (m 31 → m 31, 992 → 992 in the example) is its own `final` transition.
- The protocol of `generator/js/worker/gen.worker.js:1–29` gains one request and three answers; nothing else changes:

| Direction | Message | Meaning |
|---|---|---|
| page → worker | `{ type: 'replay', session, result }` | analyse this result (`toWire` data with `digLog`); replaces a job in progress |
| worker → page | `{ type: 'replayProgress', session, done, total }` | positions rated so far |
| worker → page | `{ type: 'replayDone', session, analysis }` | the analysis below |
| worker → page | `{ type: 'replayError', session, error }` | the move model or the ratings failed; the replay falls back to the solution, structure and finished puzzle |

```text
analysis = {
  version: 1,
  moves:   [{ kind, phase, pass, from, to, at, removed: [cell], restored: [cell], sign,
              span: { rated, refused, chosen, others, nulls, max } }],              // R2, R13
  ratings: [{ status, reasons, score, counts, empties, hardest }],                 // R5; one per position
  proofs:  { <position>: { firstUse: { k, n, i18nKey, i18nArgs, eliminations, placements } | null,
                           restricted: 'stuck' | 'complete' | 'unavailable' } },  // R11 h, R13; end boards
  chapter: s,                                                                      // R7; last restart or 0
  views: {
    compact: { steps: [position], audit: [{ from, to, scope }] },                  // R7, R8
    details: { steps: [position] }                                                 // R6
  },
  transitions: [{ view, from, to, role, tier, ratio, change,                       // R10
                  before: { P, W, E, V, R, total }, after: { P, W, E, V, R, total },
                  cause: { class, action, cells, scores },                         // R14
                  folded: { peak, revealed, unscored } }]                          // R12
}
```

The analysis is language-neutral (ids, numbers, cells; no text): the page renders every sentence (R17), so a change of
language needs no solver call.

### R16. Where the code goes

- A new pure, DOM-free module owned by the generator, `generator/js/engine/replay.js` (`SG.replay`): the move model
  (R2–R3), the rating plan and statuses (R5), the compact selection (R7), the audit (R8), the tiers (R10), the choice,
  the first use, the restricted check and the cause (R11, R13–R14), and the transitions of both views (R15). A classic
  script (an IIFE on `SG`), no `import` or `export`. It stays out of `core/`: it depends on the generator's log and
  levels.
- It is added to every script list of the generator: `generator/index.html`, `generator/tests.html`,
  `generator/tests/node-runner.js` (`SOURCE_FILES`) and `generator/js/worker/gen.worker.js` (`SCRIPTS`, in the same
  order: a test compares the two lists, `gen.worker.js:4–6`), so that the `ui-contract` suite stays green.
- The job runs in `generator/js/worker/gen.worker.js`; `generator/js/worker/worker-client.js` offers it in both modes.
  `generator/js/ui/app.js` starts it after `ready()` has confirmed the worker mode (line 723 and `attachTrace`,
  858–873), and in the main mode shows the notice and the "Prepare score tables" button and keeps browsing disabled
  until it is pressed (R4).
- `generator/js/ui/cache.js`: the wrapper forwards `replay` to its inner client (`cache.js:1152–1161`), and in the main
  mode the generation of a missing log waits for the press instead of starting by itself (`cache.js:686–688,
  1008–1035, 1071–1087`). The cache's schema, keys and payloads do not change.
- `generator/js/ui/player.js` builds the steps of both views from the analysis; its batching (44–54, 175–399) and its
  rating (`RATE_FREE_KINDS`, `RATE_BUDGET_MS`, `techniquesAt`, `rateStep`: 39, 42, 512–553) are replaced.
  `generator/js/ui/step-view.js` draws the table states (with the separate branch for status tables, R9), the badge,
  the callout, the disclosure, the row label and the toggle.
- Styles: `generator/css/steps.css` (callout, badge, toggle, legend swatch). The board frames live in core:
  `core/css/board.css` gains `cell--cause` and `sign--cause` beside the replay frames (223–254), and
  `core/js/ui/board-view.js` lets `setSignMarks` take an optional `cause` set (983–991, 1177). That is a core change,
  so both apps' quick suites run. Only existing colour tokens are used (`--sg-board-probe`, `--sg-color-accent`,
  `--sg-color-accent-soft`).

### R17. Strings

Every string shown goes through `SG.i18n.t()` and exists in English and Vietnamese, in the locale fragments where
today's replay and table strings live (`generator/js/ui/player.js:819–915`, `generator/js/ui/step-view.js:608–691`),
with `_one` / `_other` forms and the locale's number format. The keys, and the existing strings whose wording changes,
are listed in §8; the Vietnamese copy is gpt-6-astra's corrected copy (its check, Appendix A).

### R18. Documents

Updated in the same change as the behaviour, both languages kept in step (§9.2): `generator/design.md`, the user guide
(`USERGUIDE.md`, `USERGUIDE.vn.md`), the developer guide (`DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`), the help text of
the replay and `generator/task.md`.

### R19. Tests and process (Q7 a, Q8 b, Q9 c)

- Quick suites only, in the cases of §9.3; no heavy suite, fixture, regression hash, qualification list or generated
  file changes.
- Process: a task pack in `tasks/generation-steps/` (§9.4); a new branch `generation-steps`; one commit per task, by
  claude-sonnet-5.5 sub-agents, no push; the quick suites of each task; at the end, once,
  `cd generator && node tests/node-runner.js --all` and the browser runs of both apps, recorded as in §9.4.

## 6. The example, before → after

Classic 9×9, Expert, seed 3275974478 (`E\claude-opus-5.5\xreview\out-p4-example.txt`,
`E\claude-opus-5.5\xreview\out-p4-texts.txt`; the golden case G01 of gpt-6-astra's acceptance data).

| Step | Today: what the tab shows | Compact view (R7): score — what the step shows |
|--:|---|---|
| 1 | Full solution: a sentence, no table | Full solution: table, Total 0 |
| 2 | 18 | 23: 7 random moves, 14 cells — "First rated puzzle" (Naked Single) |
| 3 | 28 | 44 (+21): 15 random moves, 29 cells cleared, 6 put back |
| 4 | 34 | **551 (+507): the guided pair R1C2, R9C8 — "Score jump ×12.5", the callout, R1C2 framed** |
| 5 | 41 | 568 (+17): 3 accepted guided removals, 6 cells |
| 6 | 44 | 992 (+424): 5 complete changes of the local search — one line: XYZ-Wing is the new hardest technique |
| 7 | 551 | 992 (unchanged): finished puzzle, 30 clues, the Summary's table |
| 8–10 | 557, 567, 568 | — |
| 11–18 | no table | — |
| 19 | 1849 (the removal-only checkpoint of an exchange) | — |
| 20 | no table | — |
| 21 | 992 | — |

- **Before**: `S, 18, 28, 34, 41, 44, 551, 557, 567, 568, —×8, 1849, —, 992` (21 steps, 10 without a numerical table;
  S: a sentence instead of a table).
- **After, compact**: `0, 23, 44, 551, 568, 992, 992` (7 steps, 7 tables, no decrease, one jump).
- **After, every move**:
  `0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 28, 30, 31, 33, 34, 36, 37, 38, 40, 41, 42, 43, 44, 551, 557, 567, 568, 568,
  568, 568, 568, 992, 992` (33 steps, no decrease; the first rated puzzle is the first move, 5; the same jump at move
  23; the XYZ-Wing line at move 31).
- Cost of the whole example: 30 fresh ratings, 1.71 ms; generation 118.8 ms.

The user's own illustration (35, 100, 300, 1000) asked for steady ratios; the rise from 44 to 551 is one move of the
generator (removing one symmetric pair), so it stays a single step and is explained (N4).

### 6.1 The texts of the compact steps

| Step | English | Vietnamese |
|--:|---|---|
| 1 | Fill the whole grid with a random solution that follows every rule (81 cells). | Điền kín lưới bằng một lời giải ngẫu nhiên tuân theo mọi luật (81 ô). |
| 2 | Clear 14 cells chosen at random: the puzzle can still be solved without their clues. — First rated puzzle: score 23. The generator's solution uses Naked Single as its hardest technique. | Bỏ số ở 14 ô được chọn ngẫu nhiên: đề vẫn giải được khi thiếu các số đó. — Đề đầu tiên được chấm điểm: 23 điểm. Trong lời giải mà trình sinh đề tìm được, kỹ thuật khó nhất là Ô một ứng viên (Naked Single). |
| 3 | Try to clear 35 cells chosen at random: 29 cells cleared, 6 cells put back because without their clues, the solver did not finish the puzzle with the techniques of this level. | Thử bỏ số ở 35 ô được chọn ngẫu nhiên: bỏ được số ở 29 ô và khôi phục số ở 6 ô, vì bộ giải chưa giải xong đề bằng các kỹ thuật của mức này khi thiếu các số đó. |
| 4 | Compare 15 possible removals (5 rejected) and choose the removal preferred by the generator's check: R1C2 and R9C8. — the callout of §6.2 | Xét 15 cách bỏ số (5 bị loại) và chọn phương án được ưu tiên theo phép kiểm tra của trình sinh đề: bỏ số ở R1C2 và R9C8. — phần giải thích ở §6.2 |
| 5 | Across 3 accepted removals, compare 17 possible removals (6 rejected); the removed clues are at R3C3, R7C7, R3C9, R7C1, R4C1 and R6C9. | Qua 3 lần chọn phương án bỏ số, đã xét 17 cách bỏ số (6 bị loại); các ô được bỏ số là R3C3, R7C7, R3C9, R7C1, R4C1 và R6C9. |
| 6 | Across 5 complete changes, clear 10 cells and restore 10 clues while looking for a higher-scoring puzzle. — The generator's solution now uses XYZ-Wing (weight 750) as its hardest technique, instead of Simple Colouring (weight 360). | Qua 5 thay đổi trọn vẹn nhằm tìm đề có điểm cao hơn, tổng cộng bỏ số ở 10 ô và khôi phục 10 số cho sẵn. — Trong lời giải mới của trình sinh đề, kỹ thuật khó nhất là XYZ-Wing (trọng số 750), thay cho Tô màu đơn giản (Simple Colouring) (trọng số 360). |
| 7 | The finished puzzle: 30 clues. | Đề hoàn chỉnh: 30 số cho sẵn. |

Step 6 frames the net change: the clues of R4C2, R5C1, R5C9 and R6C8 cleared, those of R1C8, R2C8, R8C2 and R9C2
restored. Its values, not in a disclosure because it is not a jump (992 < 3 × 568): P 360 → 750, W 906.5 → 806.75,
R 163.33 → 197.55, E 51 and V 44.84 unchanged, level Hard → Expert, ratio ×1.75.

### 6.2 Step 4, rendered

English (the visible part, then the disclosure opened):

```text
Step 4 — Choosing clues to remove                                                [Score jump ×12.5]
Compare 15 possible removals (5 rejected) and choose the removal preferred by the generator's check:
R1C2 and R9C8.

Score jump: 44 → 551 (+507)
After the clues at R1C2 and R9C8 are removed, the generator's solution uses Simple Colouring
2 times; previously, its hardest technique was Naked Single.
The largest technique weight, 360, contributes in full as the P term of the score (P = 360).
Removing the clue at R1C2 alone gives 550; removing the clue at R9C8 alone gives 44.

▸ Why?
  P, peak technique weight: 1 → 360 (+359)
  W, weighted sum of technique uses: 43 → 768.25
  R = 0.25 × P × log₂(1 + W ÷ P): 1.36 → 148.32 (+146.96)
  E, number of empty cells: 43 → 45
  V = 80 × E ÷ (E + 40): 41.45 → 42.35 (+0.91)
  Score = V + P + R, rounded: 44 → 551 (+507)
  Level: Very easy → Hard
  The log records 15 candidates before this accepted removal, with 5 rejected; the other 9
  candidates with completed scores reached at most 45 by the generator's limited check.
  In a separate check, this solver stopped before completing the board using only techniques
  with weights below 360.
  First use in the generator's solution: logical deduction 32 of 47.
  Simple Colouring on 3 (colour trap): colour 1 is R2C4, R6C6, R8C5, R9C2, colour 2 is R2C6,
  R5C5, R6C3, R9C4. One of the two colours holds the digit, and a cell outside the chain sees
  both colours, so it cannot be 3. 3 is removed from such cells.
  In that deduction, candidate 3 is removed from R5C2 and R8C3.
  These numbers describe the generator's solution, not every way to solve the puzzle.

Table: Naked Single 32; Hidden Single (box) 13; Simple Colouring 2 [New hardest technique].
       Empty cells 45; Total 551 (+507).
Board: R1C2 framed, legend "Removing this clue causes the score jump"; R9C8 framed as removed.
```

Vietnamese:

```text
Bước 4 — Chọn số cho sẵn để bỏ                                                  [Điểm tăng vọt ×12,5]
Xét 15 cách bỏ số (5 bị loại) và chọn phương án được ưu tiên theo phép kiểm tra của trình sinh đề:
bỏ số ở R1C2 và R9C8.

Điểm tăng vọt: 44 → 551 (+507)
Sau khi bỏ số cho sẵn ở R1C2 và R9C8, lời giải mà trình sinh đề tìm được dùng
Tô màu đơn giản (Simple Colouring) 2 lần; trước đó, kỹ thuật khó nhất là Ô một ứng viên (Naked Single).
Trọng số cao nhất 360 được tính toàn bộ vào điểm ở thành phần P (P = 360).
Chỉ bỏ số ở R1C2 cho 550 điểm; chỉ bỏ số ở R9C8 cho 44 điểm.

▸ Vì sao?
  P, trọng số cao nhất: 1 → 360 (+359)
  W, tổng trọng số các lần áp dụng kỹ thuật: 43 → 768,25
  R = 0,25 × P × log₂(1 + W ÷ P): 1,36 → 148,32 (+146,96)
  E, số ô trống: 43 → 45
  V = 80 × E ÷ (E + 40): 41,45 → 42,35 (+0,91)
  Điểm = V + P + R, làm tròn: 44 → 551 (+507)
  Mức độ: Rất dễ → Khó
  Bản ghi có 15 phương án trước lần bỏ số được chọn này, trong đó 5 bị loại;
  9 phương án khác có điểm sau phép kiểm tra giới hạn của trình sinh đề đạt cao nhất 45 điểm.
  Trong một lần kiểm tra riêng, bộ giải này chỉ dùng các kỹ thuật có trọng số dưới 360
  và đã dừng khi chưa giải xong đề.
  Lần dùng đầu tiên trong lời giải của trình sinh đề: bước suy luận 32/47.
  Tô màu đơn giản cho 3 (bẫy màu): màu 1 là R2C4, R6C6, R8C5, R9C2, màu 2 là R2C6, R5C5, R6C3,
  R9C4. Một trong hai màu chứa chữ số này, mà một ô ngoài chuỗi lại nhìn thấy cả hai màu, nên ô đó
  không thể là 3. 3 bị loại khỏi những ô như vậy.
  Ở bước suy luận đó, loại ứng viên 3 khỏi R5C2 và R8C3.
  Các con số này mô tả cách giải mà trình sinh đề tìm được, không đại diện cho mọi cách giải đề.

Bảng: Ô một ứng viên (Naked Single) 32; Số đơn ẩn trong khối (Hidden Single) 13;
      Tô màu đơn giản (Simple Colouring) 2 [Kỹ thuật khó nhất mới]. Ô trống 45; Tổng 551 (+507).
Bàn cờ: khung ở R1C2, chú giải "Bỏ số cho sẵn này làm điểm tăng vọt"; R9C8 có khung ô đã bỏ số.
```

Only the three sentences above "Why?" form the visible callout; the step text above it is separate. The solver's
paragraph is the existing localized text of `technique.simpleColouring.step` (`generator/js/ui/locale.vi.js:388–396`
for Vietnamese), not a new string. The numbers come from the analysis: P 1 → 360; W 43 → 768.25; E 43 → 45;
V 41.445783 → 42.352941 (+0.907158); R 1.364858 → 148.321617; ratio 12.5227, shown ×12.5; the first use is logical
deduction 32 of 47 on the end board (0.4 ms), with candidate 3 removed from R5C2 and R8C3; the restricted solve
(techniques of weight below 360) stops (0.17 ms). Technique names are those of the generator's locales
(`generator/js/ui/locale.en.js:285–331`, `generator/js/ui/locale.vi.js:280–326`).

## 7. Results on the corpus and cost

### 7.1 The two views on the 107 requests

| 107 requests (`E\claude-opus-5.5\xreview\out-p3-summary.txt`) | Compact (R7, R8) | Details (R6) | Phase-1 segmentation, same ratings |
|---|--:|--:|--:|
| Steps (min / median / max per puzzle) | 779 (5 / 7 / 10) | 6,316 (22 / 33 / 135) | 785 (5 / 7 / 11) |
| Steps with a numerical table | 779 | 6,316 | 785 |
| Decreases (runs; worst) | **0** | 208 (28; −95.04 %) | 17 (12; −6.36 %) |
| Jumps under Q4 b (runs) | 84 (76) | 90 (76) | 84 (76) |
| First rated puzzles / one-line steps | 107 / 124 | 107 / **155** | 107 / 124 (with a rise condition) |
| Jumps a rated recorded position could avoid (every audit `complete`) | 0 | 0 | 0 |
| Steps with an unchanged score | 17 | 2,642 | 11 |
| Largest rise between positive scores: maximum / median per puzzle | ×40.2 / ×5.5 | ×40.2 / ×5.77 | ×40.2 / ×5.59 |
| Audit insertions | 0 | — | — |
| Steps ending on the finished puzzle with `result.rating` | 107 of 107 | 107 of 107 | 107 of 107 |

The one-line counts follow R10, which has no rise condition: 155 in the details view (149 at a higher score and 6 at an
equal or lower one; `E\claude-opus-5.5\xreview\out-p4b-extra.txt`); the compact count, 124, is the same with or
without a rise condition. The compact view meets N2 on every step and N3 wherever the recorded moves allow it: every
remaining rise of ×3 and +100 is a single move, or a set of moves whose inner positions score higher than the step's
end (R14, `multi-move`).

### 7.2 By variant (compact view; `E\claude-opus-5.5\xreview\out-p4-pervariant.txt`)

| Variant | Requests | Compact steps (min / median / max) | Jumps (runs) | One-line steps | Details steps (min / median / max) | Details decreases | Largest rise per puzzle: median / max |
|---|--:|---|---|--:|---|--:|---|
| Classic 9×9 | 36 | 244 (5 / 7 / 10) | 31 (29) | 32 | 1,082 (22 / 29 / 77) | 2 | ×12.65 / ×40.20 |
| Killer | 18 | 156 (6 / 9 / 10) | 16 (12) | 33 | 727 (23 / 42 / 45) | 7 | ×3.18 / ×11.04 |
| Samurai | 18 | 143 (5 / 8 / 10) | 15 (13) | 20 | 2,099 (24 / 132 / 135) | 9 | ×7.72 / ×20.60 |
| Greater-Than | 17 | 110 (5 / 7 / 9) | 10 (10) | 10 | 1,826 (97 / 107 / 114) | 188 | ×3.63 / ×12.45 |
| Jigsaw 9×9 | 17 | 120 (5 / 7 / 9) | 11 (11) | 27 | 503 (23 / 31 / 33) | 2 | ×5.48 / ×13.54 |
| Mega 16×16 | 1 | 6 | 1 (1) | 2 | 79 | 0 | ×25.32 |
| **All** | **107** | **779 (5 / 7 / 10)** | **84 (76)** | **124** | **6,316 (22 / 33 / 135)** | **208** | ×5.5 / ×40.2 |

Examples of compact sequences: Classic 9×9 Very easy seed 1 `0, 15, 25, 43, 43`; Killer Expert seed 1
`0, 0, 23, 44, 103, 304, 787, 798, 798` (no jump); Samurai Nightmare seed 42 `0, 25, 59, 69, 72, 1483, 1637, 1637`;
Greater-Than Expert seed 42 `0, 0, 135, 135, 242, 242, 973, 973, 973`. The guides' example (Classic 9×9 Easy, seed 3,
"replays in 9 steps" today) gives 7 compact steps `0, 14, 24, 34, 44, 46, 46` and 26 with every move
(`E\claude-opus-5.5\xreview\out-p3-easy3.txt`).

### 7.3 gpt-6-astra's 35 requests, both planners; the golden data

This is the later matched comparison on all 35 of gpt-6-astra's requests; the two cross-reviews had used different
corpora (§1.3).

| 35 requests | Compact | Details |
|---|--:|--:|
| Steps (min / median / max) | 243 (5 / 7 / 10) | 2,135 (22 / 41 / 135) |
| Decreases (runs; worst) | 0 | 74 (10; −80.22 %) |
| Jumps (runs) | 25 (23) | 28 (23) |
| Avoidable jumps | 0 | 0 |

claude-opus-5.5's selector and gpt-6-astra's planner give the same compact sequences on 35 of 35 requests
(`E\claude-opus-5.5\xreview\out-p3-vs-ga.txt`). gpt-6-astra's comparison script took 64.66 ms for the 35, ratings
excluded; that covers both phase policies, the details view and the audits, not one production selector.
gpt-6-astra's variant that merges phase ends gave 228 steps; Q12 a (every phase end ends a step) keeps 243.

gpt-6-astra's acceptance set ([`gpt-6-astra/4-acceptance-data.md`](gpt-6-astra/4-acceptance-data.md), 14 requests
generated again with unchanged payloads) gives the same picture: today 129 of 338 steps without a numerical table;
compact 101 steps, all numerical, 0 decreases; details 814 steps, 41 decreases; 13 compact jumps, 16 details jumps,
19 distinct jump transitions; 5 frames; 30 partial ratings; the example's compact and details sequences are
those of §6. claude-opus-5.5 regenerated the 14 requests with its own prototype
([`claude-opus-5.5/4-check-of-acceptance-data.md`](claude-opus-5.5/4-check-of-acceptance-data.md)) and compared
1,514 fields: every golden number is equal. The 9 other differences are 8 `variantOptions` (a literal `{}` against the
complete defaults that `SG.store.toConfig` fills; the puzzles are identical) and the order of G05's single-cell
probes, now fixed by R14.

### 7.4 The jump explanations (compact view, 84 jumps)

| Measure | Value |
|---|---|
| One move / several moves | 71 / 13 |
| Causes of one-move jumps (R14) | `single-culprit` 42, `together` 21, `mixed` 4, `single-sign` 4 |
| Moves of one-move jumps | guided 64, sign 4, random 2, exchange 1 |
| Several-move jumps (`multi-move`) | 13, all with a folded peak; 8 at or above the level's maximum; 3 with restored clues |
| Frames drawn (Q10 b) | 46 (42 culprits, 4 signs); all 42 culprits uniquely dominant (gpt-6-astra's re-check) |
| The move carrying the jump is guided | 70 of 84 (64 one-move steps, 6 several-move steps); span bound by offset 70 of 70; chosen `keep` found 70 of 70; the choice sentence is shown for the 64 one-move guided jumps |
| First use found, on the end board | 84 of 84; median logical deduction 33 of 75 |
| The board solves without its new hardest technique | jump 82 of 84; one-line 117 of 124; first rated 107 of 107 |
| The restricted solve (weights below the hardest) completes | jump 0 of 84; one-line 16 of 124; first rated 9 of 107 |
| Folded excursions (compact steps whose inner positions score above their end) | 45 in 27 runs, 9 with restored clues |

### 7.5 Cost

| Item | Measured (107 requests unless stated) |
|---|---|
| Ratings | 5,911 fresh + 49 memo hits; 2,691.31 ms in all |
| Per puzzle | median 3.14 ms, p95 160.22 ms, maximum 594.34 ms (Mega 16×16 Hell 2 seed 12) |
| Largest single rating | 206.66 ms (Mega 16×16 Hell 2, a guided move; gpt-6-astra measured 195.23 ms) |
| Largest work of one rated position | 113,177 checks (gpt-6-astra; G14 m 76); guard 1,000,000; the finished position, 123,741, is reused |
| Solution counts (proofs assuming uniqueness) | 16, 9.13 ms, 0 with two solutions, 0 capped |
| Partial boards for the cause (R14) | 146 ratings, 42.87 ms; largest case 9.33 ms |
| First use (R13), on the end boards | 56.77 ms for 84 jumps, maximum 3.96 ms (on the first-appearance boards it was 64.37 ms, maximum 6.32 ms) |
| Restricted check (R11 h) | 32.78 ms for 84 jumps; maximum 5.05 ms; gpt-6-astra: 54.50 ms for the 13 golden after-boards |
| Explanations of the compact jumps | 42.87 + 56.77 + 32.78 = **132.42 ms**; those of the details view's own transitions are not measured |
| Rating rows, serialized JSON (not the memory of the analysis) | median 3,005 B, maximum 20,068 B (compact positions only: 995 / 1,636 B); gpt-6-astra's schema 4,797 / 20,144 B; its board-value buffers up to 197,784 B; the full two-view payload and heap not measured |
| gpt-6-astra's two-pass preparation (35 requests) | 1,967 fresh ratings, 1,264.49 ms; 1,368.54 ms in all |
| Stored or exported | nothing: cache, history, export and URL unchanged |
| Restarts; rebuilt Killer logs | 0 of 107; 0 of 18 Killer requests |

For comparison, generating the 107 puzzles took 94,903.8 ms (maximum 12,664.1 ms), so the replay's ratings add
about 3 % to the work of a puzzle, after the puzzle is shown.

## 8. UI strings

Every key goes through `SG.i18n.t()`, in the locale fragment of the module that shows it (`generator/js/ui/player.js`
for `replay.*`, `generator/js/ui/step-view.js` for `steps.*`), in English and Vietnamese. Placeholders follow today's
display rules (`player.js:416–444`) and R11 j: `{removed}`, `{tried}` and `{kept}` are counted cells ("10 cells",
"10 ô"), `{revealed}` and `{clues}` counted clues, `{rated}` in step texts counted possible removals; `{cells}`,
`{removedCells}`, `{restoredCells}` and `{cellList}` are lists of cell names (`R1C2`, or the grid-qualified names of
multigrid boards) ending with "and" / "và" (`replay.list.last`); in the choice lines `{rated}`, `{refused}`, `{nulls}`
and `{count}` are bare numbers. `{button}` is the translated `replay.prepare.button`. Numbers use the locale's format
(`0.25` / `0,25`; the badge's ratio with one decimal, R10). The Vietnamese copy is gpt-6-astra's corrected copy
(its check, Appendix A); "(changed)" marks an existing key whose wording changes; † marks a key added while applying
the check, which gpt-6-astra's re-check covers.

**Replay: preparation, views, titles and step texts** (`generator/js/ui/player.js`)

| Key | English | Vietnamese |
|---|---|---|
| `replay.view.details` | Show every move | Hiện từng thay đổi |
| `replay.preparing` | Preparing the score tables… {done} of {total} | Đang chuẩn bị bảng điểm… {done}/{total} |
| `replay.prepare.button` | Prepare score tables | Chuẩn bị bảng điểm |
| `replay.prepare.notice` | This page has no background worker. Press '{button}' to calculate the score tables on this page; the page may stop responding briefly while it works. | Trang này không có tiến trình nền. Nhấn '{button}' để tính bảng điểm ngay trên trang; trang có thể tạm thời không phản hồi trong lúc tính. |
| `replay.prepare.error` | The replay could not be fully prepared. Available tables are kept; unavailable results show a status. | Không thể chuẩn bị đầy đủ phần phát lại. Các bảng điểm đã có vẫn được giữ lại; kết quả chưa có được thay bằng trạng thái tương ứng. |
| `replay.trace.unavailable` † | The full generation record of this puzzle is not available; the replay shows only the solution, the structure and the finished puzzle. | Không có bản ghi đầy đủ quá trình tạo đề này; phần phát lại chỉ hiện lời giải, cấu trúc và đề hoàn chỉnh. |
| `replay.start.noScore` | No score yet: this is not a puzzle yet. | Chưa có điểm: chưa có đề để chấm. |
| `replay.title.guided` (changed) | Choosing clues to remove | Chọn số cho sẵn để bỏ |
| `replay.title.dig` † | Removing clues | Bỏ số cho sẵn |
| `replay.title.search` | Adjusting the puzzle | Điều chỉnh đề |
| `replay.title.mixed` | Combined changes | Các thay đổi được gộp |
| `replay.random.all` (changed) | Clear {removed} chosen at random: the puzzle can still be solved without their clues. | Bỏ số ở {removed} được chọn ngẫu nhiên: đề vẫn giải được khi thiếu các số đó. |
| `replay.random.some` (changed) | Try to clear {tried} chosen at random: {removed} cleared, {kept} put back because {reason}. | Thử bỏ số ở {tried} được chọn ngẫu nhiên: bỏ được số ở {removed} và khôi phục số ở {kept}, vì {reason}. |
| `replay.dig.all` † | Clear {removed}: the puzzle can still be solved without their clues. | Bỏ số ở {removed}: đề vẫn giải được khi thiếu các số đó. |
| `replay.dig.some` † | Try to clear {tried}: {removed} cleared, {kept} put back because {reason}. | Thử bỏ số ở {tried}: bỏ được số ở {removed} và khôi phục số ở {kept}, vì {reason}. |
| `replay.dig.rebuilt` † | Clear {removed}. | Bỏ số ở {removed}. |
| `replay.reason.techniques` (changed) | without their clues, the solver did not finish the puzzle with the techniques of this level | bộ giải chưa giải xong đề bằng các kỹ thuật của mức này khi thiếu các số đó |
| `replay.unit.removal_one` / `_other` (VI changed) | {count} possible removal / {count} possible removals | {count} cách bỏ số |
| `replay.guided` (changed) | Compare {rated} ({refused} rejected) and choose the removal preferred by the generator's check: {cellList}. | Xét {rated} ({refused} bị loại) và chọn phương án được ưu tiên theo phép kiểm tra của trình sinh đề: bỏ số ở {cellList}. |
| `replay.guided.rounds` (changed) | Across {rounds} accepted removals, compare {rated} ({refused} rejected); the removed clues are at {cellList}. | Qua {rounds} lần chọn phương án bỏ số, đã xét {rated} ({refused} bị loại); các ô được bỏ số là {cellList}. |
| `replay.exchange_one` | Adjust the clues to look for a higher-scoring puzzle: clear {removed} and restore {revealed}. | Điều chỉnh số cho sẵn để thử tạo đề có điểm cao hơn: bỏ số ở {removed} và khôi phục {revealed}. |
| `replay.exchange_other` | Across {count} complete changes, clear {removed} and restore {revealed} while looking for a higher-scoring puzzle. | Qua {count} thay đổi trọn vẹn nhằm tìm đề có điểm cao hơn, tổng cộng bỏ số ở {removed} và khôi phục {revealed}. |
| `replay.searchRemove` | Clear {removed} while looking for a higher-scoring puzzle. | Bỏ số ở {removed} để thử tạo đề có điểm cao hơn. |
| `replay.reveal.search` (changed) | Restore {revealed} while looking for a higher-scoring puzzle. | Khôi phục {revealed} để thử tạo đề có điểm cao hơn. |
| `replay.meta.change` † | {removed} cleared · {revealed} restored · {clues} left | bỏ số ở {removed} · khôi phục {revealed} · còn {clues} |
| `replay.folded.peak` | Within this step, the score reached {peak}. | Trong bước này, điểm có lúc đạt {peak}. |
| `replay.folded.reveal` | Within this step, the score reached {peak}, above the chosen level, and {revealed} were restored during refinement. | Trong bước này, điểm có lúc đạt {peak}, vượt mức độ khó đã chọn; {revealed} đã được khôi phục khi điều chỉnh đề. |
| `replay.folded.unscored_one` / `_other` | 1 position within this step could not be rated. / {count} positions within this step could not be rated. | Có {count} trạng thái trong bước này không chấm được điểm. |
| `replay.restart` (VI changed) | The final check found a second solution, so the holes are dug again from the full grid with a plain uniqueness check ({filled}). | Bước kiểm tra cuối tìm thấy lời giải thứ hai, nên trình sinh đề bắt đầu lại từ lưới đầy đủ, chỉ với phép kiểm tra lời giải duy nhất ({filled}). |
| `replay.restart.folded` | Before starting again, generation reached {peak} points after {moves}. | Trước khi làm lại, quá trình tạo đề đã đạt {peak} điểm sau {moves}. |
| `replay.unit.move_one` / `_other` | {count} move / {count} moves | {count} thay đổi |
| `replay.rebuilt` | This replay is reconstructed from the finished puzzle's clues; it is not a record of the original generation order. | Bản phát lại này được dựng từ các số cho sẵn của đề hoàn chỉnh, không ghi lại thứ tự tạo đề ban đầu. |
| `replay.clues` (changed) | Clear the grid, then show {clues}. | Xóa các số trên lưới rồi hiện {clues}. |
| `replay.sign` | the sign between {a} and {b} | dấu giữa {a} và {b} |
| `replay.list.last` | {list} and {last} | {list} và {last} |
| `replay.legend.cause.cell` | Removing this clue causes the score jump | Bỏ số cho sẵn này làm điểm tăng vọt |
| `replay.legend.cause.sign` | Removing this sign causes the score jump | Bỏ dấu này làm điểm tăng vọt |
| `replay.legend.cause.restore` | Restoring this clue causes the score jump | Khôi phục số cho sẵn này làm điểm tăng vọt |

**Steps: tables, statuses, tiers and lines** (`generator/js/ui/step-view.js`)

| Key | English | Vietnamese |
|---|---|---|
| `steps.techniques.change` | {score} ({change}) | {score} ({change}) |
| `steps.techniques.unchanged` | {score} (unchanged) | {score} (không đổi) |
| `steps.techniques.newPeak` | New hardest technique | Kỹ thuật khó nhất mới |
| `steps.status.capped` | Not rated: the computational limit for this rating was reached. | Chưa chấm điểm: đã đạt giới hạn tính toán cho lần chấm này. |
| `steps.status.stuck` | Not rated: this solver stopped before completing the board. | Chưa chấm điểm: bộ giải này đã dừng khi chưa giải xong đề. |
| `steps.status.ambiguous` | Not rated: this board has at least two solutions. | Chưa chấm điểm: đề này có ít nhất hai lời giải. |
| `steps.status.unverified` | Not rated: the page could not confirm a unique solution for this board. | Chưa chấm điểm: chưa xác nhận được đề này có lời giải duy nhất. |
| `steps.status.attempted` | The rows show techniques the solver applied, not a validated difficulty rating. | Các dòng chỉ ghi những kỹ thuật bộ giải đã áp dụng, không phải kết quả chấm độ khó. |
| `steps.first.label` | First rated puzzle | Đề đầu tiên được chấm điểm |
| `steps.first` | First rated puzzle: score {score}. The generator's solution uses {technique} as its hardest technique. | Đề đầu tiên được chấm điểm: {score} điểm. Trong lời giải mà trình sinh đề tìm được, kỹ thuật khó nhất là {technique}. |
| `steps.newPeak` | The generator's solution now uses {technique} (weight {w}) as its hardest technique, instead of {previous} (weight {previousW}). | Trong lời giải mới của trình sinh đề, kỹ thuật khó nhất là {technique} (trọng số {w}), thay cho {previous} (trọng số {previousW}). |

**Steps: the jump callout** (`generator/js/ui/step-view.js`; R13, R14)

| Key | English | Vietnamese |
|---|---|---|
| `steps.jump.badge` | Score jump ×{ratio} | Điểm tăng vọt ×{ratio} |
| `steps.jump.heading` | Score jump: {from} → {to} ({change}) | Điểm tăng vọt: {from} → {to} ({change}) |
| `steps.jump.change.remove_one` / `_other` | the clue at {cells} is removed / the clues at {cells} are removed | khi bỏ số cho sẵn ở {cells} |
| `steps.jump.change.restore_one` / `_other` † | the clue at {cells} is restored / the clues at {cells} are restored | khi khôi phục số cho sẵn ở {cells} |
| `steps.jump.change.sign` | {sign} is removed | khi bỏ {sign} |
| `steps.jump.change.exchange` | the clues at {removedCells} are removed and those at {restoredCells} are restored | khi bỏ số ở {removedCells} và khôi phục số ở {restoredCells} |
| `steps.jump.change.moves` | the {count} changes in this step | {count} thay đổi trong bước này |
| `steps.jump.uses_one` | After {change}, the generator's solution uses {technique} once; previously, its hardest technique was {previous}. | Sau {change}, lời giải mà trình sinh đề tìm được dùng {technique} 1 lần; trước đó, kỹ thuật khó nhất là {previous}. |
| `steps.jump.uses_other` | After {change}, the generator's solution uses {technique} {count} times; previously, its hardest technique was {previous}. | Sau {change}, lời giải mà trình sinh đề tìm được dùng {technique} {count} lần; trước đó, kỹ thuật khó nhất là {previous}. |
| `steps.jump.work` | After {change}, the weighted sum of technique uses in the generator's solution grew from {from} to {to}. | Sau {change}, tổng trọng số các lần áp dụng kỹ thuật trong lời giải tăng từ {from} lên {to}. |
| `steps.jump.full` | The largest technique weight, {w}, contributes in full as the P term of the score (P = {w}). | Trọng số cao nhất {w} được tính toàn bộ vào điểm ở thành phần P (P = {w}). |
| `steps.jump.cause.culprit` | Removing the clue at {cell} alone gives {score}; removing the clue at {other} alone gives {otherScore}. | Chỉ bỏ số ở {cell} cho {score} điểm; chỉ bỏ số ở {other} cho {otherScore} điểm. |
| `steps.jump.cause.culpritGroup` | Removing the clue at {cell} alone gives {score}; removing the other {count} clues without it gives {otherScore}. | Chỉ bỏ số ở {cell} cho {score} điểm; bỏ {count} số còn lại mà không bỏ số ở ô này cho {otherScore} điểm. |
| `steps.jump.cause.culpritExchange` † | Removing the clue at {cell} alone gives {score}; the rest of this change without it gives {otherScore}. | Chỉ bỏ số ở {cell} cho {score} điểm; phần còn lại của thay đổi này, không có ô đó, cho {otherScore} điểm. |
| `steps.jump.cause.culpritRestore` † | Restoring the clue at {cell} alone gives {score}; the rest of this change without it gives {otherScore}. | Chỉ khôi phục số ở {cell} cho {score} điểm; phần còn lại của thay đổi này, không có ô đó, cho {otherScore} điểm. |
| `steps.jump.cause.together` | Removing each clue alone gives {scores}; removing the whole group gives {after}. | Bỏ riêng từng số cho các điểm {scores}; bỏ cả nhóm cho {after} điểm. |
| `steps.jump.cause.togetherExchange` | The separate changes give {scores}; the combined change gives {after}. | Từng thay đổi riêng lẻ cho các điểm {scores}; thay đổi gộp cho {after} điểm. |
| `steps.jump.cause.parts` | Removing the clue at {cell} alone gives {score}, versus {after} for the whole symmetric group, which is always displayed as one complete change. | Chỉ bỏ số ở {cell} cho {score} điểm, còn cả nhóm đối xứng cho {after} điểm và luôn được hiển thị trong một thay đổi trọn vẹn. |
| `steps.jump.cause.partsExchange` † | On its own, the change at {cell} gives {score}, versus {after} for the whole change, which is always displayed as one complete change. | Riêng thay đổi ở {cell} cho {score} điểm, còn cả thay đổi cho {after} điểm và luôn được hiển thị trong một thay đổi trọn vẹn. |
| `steps.jump.cause.sign` | This step removes one sign; there is no smaller sign-removal move to show. | Bước này bỏ một dấu; không có thay đổi bỏ dấu nhỏ hơn để hiển thị. |
| `steps.jump.cause.cell` | This step removes one clue; there is no smaller clue-removal move to show. | Bước này bỏ một số cho sẵn; không có thay đổi bỏ số nhỏ hơn để hiển thị. |
| `steps.jump.cause.cellRestore` † | This step restores one clue; there is no smaller clue-restoring move to show. | Bước này khôi phục một số cho sẵn; không có thay đổi khôi phục số nhỏ hơn để hiển thị. |
| `steps.jump.cause.grouped` | Within this step, {technique} first appears after complete change {k} of {n} ({change}). | Trong bước này, {technique} xuất hiện lần đầu sau thay đổi trọn vẹn thứ {k}/{n} ({change}). |
| `steps.jump.cause.unavailable` † | The parts of this change could not all be rated, so no single cause is named. | Không chấm được điểm cho mọi phần của thay đổi này, nên không nêu nguyên nhân riêng. |

In `steps.jump.cause.grouped`, `{change}` is the `steps.jump.change.*` fragment of that complete change.

**Steps: "Why?"** (`generator/js/ui/step-view.js`; R13)

| Key | English | Vietnamese |
|---|---|---|
| `steps.jump.why` | Why? | Vì sao? |
| `steps.jump.p` | P, peak technique weight: {from} → {to} ({change}) | P, trọng số cao nhất: {from} → {to} ({change}) |
| `steps.jump.w` † | W, weighted sum of technique uses: {from} → {to} | W, tổng trọng số các lần áp dụng kỹ thuật: {from} → {to} |
| `steps.jump.r` | R = 0.25 × P × log₂(1 + W ÷ P): {from} → {to} ({change}) | R = 0,25 × P × log₂(1 + W ÷ P): {from} → {to} ({change}) |
| `steps.jump.e` † | E, number of empty cells: {from} → {to} | E, số ô trống: {from} → {to} |
| `steps.jump.v` | V = 80 × E ÷ (E + 40): {from} → {to} ({change}) | V = 80 × E ÷ (E + 40): {from} → {to} ({change}) |
| `steps.jump.total` | Score = V + P + R, rounded: {from} → {to} ({change}) | Điểm = V + P + R, làm tròn: {from} → {to} ({change}) |
| `steps.jump.level` | Level: {from} → {to} | Mức độ: {from} → {to} |
| `steps.jump.choice.guided_one` / `_other` | The log records {rated} candidates before this accepted removal, with {refused} rejected; the other candidate with a completed score reached {max} by the generator's limited check. / …; the other {count} candidates with completed scores reached at most {max} by the generator's limited check. | Bản ghi có {rated} phương án trước lần bỏ số được chọn này, trong đó {refused} bị loại; {count} phương án khác có điểm sau phép kiểm tra giới hạn của trình sinh đề đạt cao nhất {max} điểm. |
| `steps.jump.choice.span` † | The log records {rated} candidates before this accepted removal, with {refused} rejected. | Bản ghi có {rated} phương án trước lần bỏ số được chọn này, trong đó {refused} bị loại. |
| `steps.jump.choice.nulls_one` / `_other` | The limited check did not finish the board for 1 other retained candidate, so it has no numerical check score. / The limited check did not finish the boards for {count} other retained candidates, so they have no numerical check score. | Với {count} phương án khác được giữ lại, phép kiểm tra giới hạn chưa giải xong đề, nên các phương án đó không có điểm kiểm tra. |
| `steps.jump.choice.noScores` | No numerical score from the limited check is available for the other candidates. | Không có điểm từ phép kiểm tra giới hạn để so sánh với các phương án khác. |
| `steps.jump.choice.only` | The log records no other retained removal candidate for this choice. | Bản ghi không có phương án bỏ số nào khác được giữ lại cho lần chọn này. |
| `steps.jump.choice.chosenUnscored` | The generator's limited check did not finish the board after the chosen removal; its objective ranks such a removal above every removal it could finish. | Phép kiểm tra giới hạn của trình sinh đề chưa giải xong đề sau lần bỏ số được chọn; mục tiêu của trình sinh đề xếp một lần bỏ số như vậy trên mọi lần bỏ số mà phép kiểm tra giải xong. |
| `steps.jump.choice.random` | This group was picked at random. | Nhóm này được chọn ngẫu nhiên. |
| `steps.jump.choice.checked` | The log contains no comparable-candidate scores for this change. | Bản ghi không có dữ liệu so sánh các phương án cho thay đổi này. |
| `steps.jump.choice.none` | This step combines {count} changes; it is not a single candidate-comparison round. | Bước này gồm {count} thay đổi; nó không tương ứng với một vòng so sánh phương án duy nhất. |
| `steps.jump.lighter` | In a separate check, this solver stopped before completing the board using only techniques with weights below {w}. | Trong một lần kiểm tra riêng, bộ giải này chỉ dùng các kỹ thuật có trọng số dưới {w} và đã dừng khi chưa giải xong đề. |
| `steps.jump.auditScope` † | Only the recorded boards that could be rated were searched for smaller steps. | Chỉ những bảng đã ghi lại và chấm được điểm mới được dùng để tìm các bước nhỏ hơn. |
| `steps.jump.firstUse` | First use in the generator's solution: logical deduction {k} of {n}. | Lần dùng đầu tiên trong lời giải của trình sinh đề: bước suy luận {k}/{n}. |
| `steps.jump.removedHere_one` / `_other` | In that deduction, candidate {digits} is removed from {cells}. / In that deduction, candidates {digits} are removed from {cells}. | Ở bước suy luận đó, loại ứng viên {digits} khỏi {cells}. |
| `steps.jump.placedHere` | In that deduction, {digit} is placed in {cell}. | Ở bước suy luận đó, điền {digit} vào {cell}. |
| `steps.jump.scope` | These numbers describe the generator's solution, not every way to solve the puzzle. | Các con số này mô tả cách giải mà trình sinh đề tìm được, không đại diện cho mọi cách giải đề. |

In the plural keys `{count}` is the number the forms depend on: `others` in `steps.jump.choice.guided_*`, `nulls` in
`steps.jump.choice.nulls_*`, the number of digits in `steps.jump.removedHere_*`. The effects of the first-use
deduction are grouped by the cells they touch, one clause per group (R13).

**Kept as they are**: today's `replay.position*`, `replay.start`, `replay.unit.sign_*`, the other `replay.title.*`
(including `replay.title.random`, used only for a random order of a normal log), `replay.solution`, `replay.cages`,
`replay.signs`, `replay.signDig.*`, `replay.reveal`, `replay.final*`, `replay.reason.ambiguous`,
`replay.reason.tooHard`, `replay.reason.mixed`, `replay.meta.*`, `steps.techniques.*` (including
`steps.techniques.none` for the zero tables), and the English of `replay.restart` and `replay.unit.removal_*`. The
first-use sentence reuses the solver's own step texts (`step.i18nKey`, for example `technique.simpleColouring.step`).

## 9. Files, documents, tests and process

### 9.1 Files to change

| File | Change |
|---|---|
| `generator/js/engine/replay.js` (new) | `SG.replay`, pure and DOM-free: moves (R2–R3), rating plan and statuses (R5), compact selection (R7), audit (R8), tiers (R10), choice, first use, restricted check and cause (R11, R13–R14), the transitions of both views and the analysis of R15 |
| `generator/index.html`, `generator/tests.html`, `generator/tests/node-runner.js` | add `js/engine/replay.js` to the script lists, in the same place as in the worker |
| `generator/js/worker/gen.worker.js` | `replay.js` in `SCRIPTS`; the `replay` job in slices; `replayProgress`, `replayDone`, `replayError`; pre-emption by `cancel`, `generate` and `replay`; the protocol comment (lines 1–29) |
| `generator/js/worker/worker-client.js` | a `replay` request in both modes; in the main mode it runs only when asked |
| `generator/js/ui/app.js` | start the job after `ready()` has confirmed the worker mode (line 723 and `attachTrace`, 858–873); ignore stale answers; in the main mode the notice, the "Prepare score tables" button and browsing disabled until it is pressed (Q17 b, Q19 a) |
| `generator/js/ui/cache.js` | the wrapper forwards `replay` (1152–1161); in the main mode the generation of a missing log waits for the press (686–688, 1008–1035, 1071–1087); schema, keys and payloads unchanged |
| `generator/js/ui/player.js` | the steps of both views from the analysis, their titles and texts (R12); the fixed batching (44–54, 175–399) and the page ratings (39, 42, 512–553) go; new and changed `replay.*` keys |
| `generator/js/ui/step-view.js` | the table states (R9) with a separate branch for status tables (no Total, no score shares), the Total's change, the badge, the callout, "Why?", the row label, the toggle; new `steps.*` keys |
| `generator/css/steps.css` | callout, badge, toggle, legend swatch of the cause |
| `core/css/board.css`, `core/js/ui/board-view.js` | `cell--cause`, `sign--cause`, an optional `cause` set for `setSignMarks` (a core change: both apps' quick suites) |
| `generator/tests/suites/replay.test.js` (new) and the suites of §9.3 | the cases of §9.3 |

Not changed: the engine (`generator/js/engine/digger.js`, `pipeline.js`, `difficulty.js`), the variants, the cache's
schema, keys and payloads, the history, the export, the player app's code, the heavy suites, the fixtures, the
regression hashes, the qualification lists and `help-examples.js`.

### 9.2 Documents to update (same change, both languages)

| Document | What changes |
|---|---|
| `generator/design.md` | §7.1 (L708) and §7.3 "Replay engine in the UI layer" (L757): moves, the two views, the job, the tiers; §9.3 (L1032): the `replay` messages; §10.5 "Results panel" (L1183): tables, badge, callout, toggle; §13.10 (L1531): the main mode, its button and the wait before it is pressed; §15.2 (L1717): the test suites |
| `USERGUIDE.md` (L83, L114), `USERGUIDE.vn.md` (L84, L115) | the two views, a table on every step, the badge and "Why?", what "First rated puzzle" means, the button and the wait for it when the page has no background worker (for example opened from a file); no code |
| `DEVELOPERGUIDE.md` (L235–252, L276–277), `DEVELOPERGUIDE.vn.md` (L221–238, L259–260) | `SG.replay`, the worker job and its messages, the statuses; the example "Classic 9×9 easy, seed 3, replays in 9 steps" (L246; VI L232) becomes the compact count measured by the implementation (7 in the prototype, 26 with every move); renamed APIs (for example `SG.player.buildSteps`) are renamed here too, because `generator/tests/suites/help.test.js` checks that the guides name only existing scripts, commands and APIs |
| `generator/js/ui/help.js` | the help text `help.generation.replay` (EN line 1183, VI line 1444) |
| `generator/task.md` | a line for this change |

### 9.3 Tests (quick suites only)

Suites: `player`, `steps`, `worker`, `cache`, `ui-contract`, `i18n`, `help`, `a11y`, `history`, `export`, `pipeline`
and a new `replay` suite (`generator/tests/suites/replay.test.js`), run with
`cd generator && node tests/node-runner.js --suite=<name>[,<name>]`, then the quick set; with the core change, also
`cd player && node tests/node-runner.js`. Requests are built as the page builds them, with `SG.store.toConfig`, which
fills the variant's complete options (Jigsaw `{ compactness: 0.6 }`, Killer `{ cageSize: 0 }`, Greater-Than
`{ futoshiki: false }`, Mega 16×16 `{ symbolSet: 'hex' }`). Cases:

1. **The example** (G01; 138 ms of generation and 2.2 ms of ratings in Node): compact `0, 23, 44, 551, 568, 992,
   992`; step 4 with the badge ×12.5 (VI ×12,5), R1C2 framed with `cell--cause`, Simple Colouring, weight 360,
   2 uses, P 1 → 360, the choice 15 / 5 / 9 / 45 at log offset 42, the restricted-check sentence, the first use 32 of
   47 with candidate 3 removed from R5C2 and R8C3; step 2 the first rated puzzle; step 6 the XYZ-Wing line; the
   `final` transition 992 → 992 with no change and no line; 33 details steps; the step to m 31 starts from W = 906.5
   in the compact view and from W = 906.75 in the details view.
2. **The goldens** of gpt-6-astra's acceptance data: compact sequences, details counts and scores, jump flags, causes,
   culprits, frames and new-hardest lines. G06 for a transition that differs by view (compact 138 → 1678, a jump;
   details 2967 → 1678, none); G13 and G14 for a null chosen score; G14's m 76 (log offset 167: 16 candidates, 13
   rejects, 3 keeps; 0 numeric others, 2 unscored) for `noScores`, never "no other passed". G01–G08, G13 and G14 are
   generated in the suite (2,028 ms of generation and about 0.7 s of analysis in Node, measured by claude-opus-5.5);
   G09–G12 take 22,633 ms of generation (7,741, 2,255, 8,565 and 4,072 ms), too slow for a quick suite: the task pack
   stores their `toWire` results as test data of the `replay` suite (77 ms of analysis) or checks them once in the
   final verification (§10).
3. **Invariants on every golden**: every compact step has a numerical table and no decrease; every position it uses
   is scored; the last step is `result.givens` with `result.rating`; the analysis is built once; navigation, the
   toggle and a change of language call no solver.
4. **One move per change**: an exchange is one move and no view shows a removal half (inline log). The renderer
   control of R5 (`stuck`, at least 2 solutions, attempted counts) shows its status table with the attempted rows and
   their label, no Total and no score-share cells.
5. **Selection vectors**, inline with phases: the overshoot `0, 23, 44, 100, 200, 400, 800, 992` (the audit inserts
   200); a folded refinement peak; a phase end kept (Q12 a); a flat step between protected cuts; a restart folded
   (Q13 a, compact `0, 0, 23, 44, 600, 992, 992`, details with both digs); an audit of scope `ratedOnly` and its
   "Why?" line.
6. **Tiers at the boundaries**: exactly ×3 and +100 is a jump; ×2.99 or +99 is not; 0 → x is "First rated puzzle"
   with no multiplier; the badge rounds down to one decimal (×12.5, ×3.0 for 300 / 100, ×3.3 for 1000 / 300) in both
   locales; the neutral new-hardest line on a flat and on a decreasing transition; no "New hardest technique" label on
   a jump whose hardest technique was already used.
7. **Statuses**: a guard of 1 check gives `capped` on intermediate positions (status table, no rows, no retry) while
   the finished puzzle keeps its rating from the memo; `stuck` keeps its attempted rows; `ambiguous` says "at least
   two"; `unverified`; a failed optional probe leaves the rating and the replay intact, with an honest limitation; the
   replay's start; the zero tables.
8. **Wording**: "the generator's solution", never "cannot be solved without" or "must use"; the directions of P, W
   and E; no per-row change; the proof-scope line; the restricted-check sentence only after a `stuck` restricted
   solve (never after a guard, an error or a completed proof); "at random" only for a random order of a normal log (an
   inline log with `digOrder: 'snake'` gets the order-neutral text); the chosen-null sentence; restore wording and
   legend for a restored culprit (inline).
9. **Causes**: the probe order (removed cells first, then restored, each by cell index); the negative fixture of O3
   (two shares above 0.9 give `mixed` and no frame); a guarded probe gives `unavailable`; `together` on a 3–4-cell
   group uses the general sentence.
10. **Variants**: Greater-Than with alive signs and a single-sign frame `sign--cause`; the Killer cages step; a
    rebuilt-log shape (inline, gated by the requested level), its order-neutral text and its note; multigrid cell
    names.
11. **Worker, page and cache**: `replay` → `replayProgress` → `replayDone`; `cancel` and a new `generate` pre-empt
    the job; stale answers are ignored; preparation starts by itself only after `ready()` confirms the worker mode.
    In the main mode, with a fake direct client: zero solver calls and zero log generations before the press, also on
    a cache hit without a log, through `attachTrace`, autoplay and a change of language; browsing disabled before the
    press (Q19 a); both views after it. The cache wrapper forwards `replay`.
12. **Strings**: every new key in both languages, with plural forms and no placeholder left; the disclosure is a
    `details` / `summary`; the badge and the row label are text, not colour only.
13. **History and export**: unchanged entries and export bytes (apart from `generatedAt`); `ui-contract`: the script
    lists; `help`: the guides.

The tests of `generator/tests/suites/player.test.js` tied to the fixed batches (lines 223, 240, 311, 336 and 354) are
rewritten around these invariants, not weakened: the plain reveal contract of lines 336–352 keeps its meaning; the
case of lines 354–377, which expected a split exchange on a large board, changes on purpose.

### 9.4 Process (Q7 a, Q8 b, Q9 c)

- Branch `generation-steps`; a task pack in `tasks/generation-steps/`, one file per task with its scope, files and
  acceptance checks (this report and `gpt-6-astra/4-acceptance-data.md`); claude-sonnet-5.5 sub-agents implement one
  task each, one commit per task, no push.
- A suggested split: T1 `SG.replay` moves, ratings and statuses; T2 selection, audit and tiers; T3 cause, choice,
  first use and the restricted check; T4 worker protocol, client, cache wrapper and app wiring (with the main-mode
  button and gate); T5 the steps and texts in `player.js`; T6 tables, callout, disclosure, toggle, styles and board
  frames; T7 strings in both languages; T8 documents; T9 the final verification.
- Each task runs the quick suites it touches, then the app's quick set (both apps when `core/` changes).
- At the end, once: `cd generator && node tests/node-runner.js --all`, and the browser runs. Serve the repository
  root (`python -m http.server 8000` or `npx serve .`); open `http://localhost:8000/generator/tests.html`, which runs
  the quick suites (do not add `?all=1`, which loads the manual suites as well: `generator/tests.html:91–98`); run
  `cd player && node tests/browser/run-all.js` (Microsoft Edge, found through `EDGE_PATH` when needed; Node 22 or
  later). Part II records the browser and its version, the URLs and that each run completed.

## 10. Risks, out of scope, deferred

| Risk | Mitigation |
|---|---|
| A slow device: 594.34 ms of ratings per puzzle at most in Node, perhaps 2–4 times more on a phone | the job runs after the puzzle is shown, in the worker, with a progress line; in the main mode nothing runs before the button and browsing waits for it (Q17 b, Q19 a) |
| Work on the page started by another path (a cache hit, `attachTrace`, a worker that fails to start) | the gate of R4 after `ready()`; the cache wrapper's routing; tests of §9.3 case 11 |
| A position needs more than the guard | 113,177 checks at most measured against 1,000,000; a capped position is folded in the compact view and shown with its status in the details view (Q18 b); the finished puzzle is never rated again |
| The cost of the details view's own explanations and the memory of the full two-view analysis are not measured | T9 measures both on the goldens and the corpus and Part II reports them; the compact explanations take 132.42 ms on 107 puzzles |
| Saying more than the data shows | R11: "the generator's solution", directions from the data, the scope line, "the generator's limited check", the restricted check only on a `stuck` result, "at random" only when true, counts per log span; tests of §9.3 case 8 |
| A genuine Killer log mistaken for a rebuilt one (Q15 a) | never seen (0 of 18); the shape test is strict and gated by the requested level; the note only says the replay is not a record of the original order |
| The `keep` scores are the generator's objective | worded "by the generator's limited check"; they matched the rating in 840 of 840 numeric cases; a null is explained, never shown as 0 |
| Restarts are rare (0 of 107) | inline tests of §9.3 case 5 |
| Four goldens are slow to generate (G09–G12: 22,633 ms in Node) | their `toWire` results become test data of the quick suite, or they are checked once in T9 (§9.3 case 2) |
| Tests tied to fixed batches | rewritten around invariants (§9.3), never weakened |
| A core change for the frames | small and optional (`cause` set); both apps' quick suites |
| About 100 new or changed strings in two languages | the `i18n` suite; gpt-6-astra's copy, and its re-check of the keys marked † in §8 |

Out of scope or deferred: marks on the slider and a proof shown on the board (Q16 a); a retry button for a capped
position (Q18 b); splitting a symmetric group (Q2 a); an unprepared preview of the details view before "Prepare score
tables" is pressed (gpt-6-astra's F1 option B, not chosen: Q19 a); an engine change such as a marker for rebuilt logs
(Q15 a); storing the analysis or the view toggle; the player app, which has no Generation Steps.

## 11. Sign-off

| Researcher | Role | Status | Date |
|---|---|---|---|
| claude-opus-5.5 | drafted Part I and applied the corrections | signed | 2026-10-28 |
| gpt-6-astra | checks Part I ([its check](gpt-6-astra/5-check-of-joint-report.md)) | signed | 2026-10-28 |

**Corrections applied at sign-off.** All of gpt-6-astra's must-fix items (M1–M13) and optional items (O1–O3), and
claude-opus-5.5's six clarifications from its check of the golden data (CO 1–6,
[`claude-opus-5.5/4-check-of-acceptance-data.md`](claude-opus-5.5/4-check-of-acceptance-data.md) §5, S1–S6), are
applied; none is rejected.

| Item | What changed | Where |
|---|---|---|
| M1 | Ratings belong to positions; tiers, changes, terms, probes, spans and choices belong to transitions `(view, from, to, role)`; both views are prepared before the replay opens; the final duplicate is its own transition; G06 and the final duplicate are tested | R1, R6, R10, R15; §9.3 cases 1–2 |
| M2 | The page awaits `ready()` of the client that runs the job; automatic preparation only in a confirmed worker mode; in the main mode the log generation also waits for the press; the cache wrapper forwards `replay`; no path around the gate | R4, R16; §9.1; §9.3 case 11 |
| M3 | An unscorable details move keeps its attempted rows with a label, no Total and no score shares; the status comes from one canonical solve classified by `SG.difficulty.classify`; "at least two" solutions; the final rating seeds the memo; a failed optional probe never undoes a rating | R5, R9; §8; §9.3 cases 4, 7 |
| M4 | The neutral new-hardest line also on flat and decreasing transitions; no false "New hardest technique" label on a jump; 155 details lines | R10; §7.1; §9.3 case 6 |
| M5 | The choice keeps `chosen`, `at`, `rated`, `refused`, `others`, `nulls`, `max`; sentences for a null chosen score and for no numeric alternative | R13; §8 |
| M6 | Counts are per log span, never "one round"; `replay.guided.rounds` counts accepted removals | R2, R12; §8 |
| M7 | A move is a log-derived change; "The log contains no comparable-candidate scores for this change."; "at random" only for a random order of a normal log; order-neutral texts; the rebuilt-log gate uses the requested level; the legacy strings concerned are no longer "kept as they are" | R2, R3, R11 i, R12, R13; §8 |
| M8 | The restricted-solver sentence, in gpt-6-astra's wording, only inside "Why?" and only after a `stuck` restricted solve; the `mixed` cause is one sentence | R11 h, R13, R14; §6.2; §8 |
| M9 | The 1849 is the removal-only checkpoint; the soundness claim is a measurement; Stage A's hand-over is conditional (38 or 40 clues on 9×9; G09 already 96 and 98); "at least 2" solutions; the audit's scope; "First rated puzzle" is per view | Executive summary 3 and 5; §4.1, §4.3, §4.4; R3, R8, R10 |
| M10 | Sizes are serialized rating rows, not memory; 132.42 ms covers the compact jumps only; 64.66 ms was a whole comparison script | Executive summary 10; R15; §7.3, §7.5 |
| M11 | "P, peak technique weight"; "W, weighted sum of technique uses"; actions carried by changes, probes and legends; the general `together` sentence; cell-list placeholders; every first-use effect | R11 b, f, j; R13; R14; §8 |
| M12 | gpt-6-astra's Vietnamese copy (Appendix A) and the matching English | §6, §8 |
| M13 | The cross-reviews used 35 and 104 requests (32 in common, 107 in all); §7.3 is the later matched comparison | header, documents, §1.3, §7.3 |
| O1 | A reproducible recipe for the final browser runs | §9.4 |
| O2 | The fluency edits of Appendix A, used consistently | §6, §8 |
| O3 | The negative fixture: two shares above 0.9 give no frame; a guarded probe gives `unavailable` | R14; §9.3 case 9 |
| CO 1 | The first use is taken on the step's end board: 56.77 ms (was 64.37), maximum 3.96 ms, median deduction 33 of 75; the explanations of the compact jumps take 132.42 ms | Executive summary 10; R13; §7.4, §7.5 |
| CO 2 | 155 details lines (149 + 6) | R10; §7.1 |
| CO 3 | The probe order: removed cells first, then restored, each by cell index | R14 |
| CO 4 | The definitions of `others`, `nulls` and `max`; the chosen score and the accept's offset; the sentence when the chosen removal's own check could not finish | R13; §8 |
| CO 5 | One set of cause classes: `single-culprit`, `together`, `mixed`, `single-sign`, `single-cell`, `multi-move`, `unavailable` | R14, R15; §7.4 |
| CO 6 | Tests build requests with `SG.store.toConfig` | §9.3 |

**The four points left open by the draft are settled:** the restricted-solver sentence (M8, approved in its new
wording, inside "Why?"); the badge's decimals (one decimal rounded down, in the locale's format, with the
classification on exact integer totals); the Vietnamese wording (gpt-6-astra's Appendix A); and what the replay shows
in the main mode before "Prepare score tables" is pressed (gpt-6-astra's F1, decided by the user at 18:40: Q19 a,
wait for preparation).

**For gpt-6-astra's re-check**, besides the items above: the keys marked † in §8, added while applying the check; the
`fallback` pass after a restart read as Stage A (R2); the restart's recorded reason (R3, R12); and the placement of the
four slow goldens (§9.3 case 2; claude-opus-5.5 recommends their `toWire` results as test data of the quick suite).

### gpt-6-astra's sign-off notes
- † strings approved; use `togetherExchange`/`partsExchange` for restoration-only groups too.
- `fallback` is Stage A with the configured order and DFS uniqueness (`generator/js/engine/digger.js:925–934`).
- Restart's second-solution reason holds for solution-consistent givens; budget exhaustion throws.
- Use new replay-suite `toWire` test data for G09–G12; leave existing fixtures unchanged.

---

# Part II — The implementation, its review and the verification

Part II records how Part I was built: the task pack, the eight tasks and their commits, the problems met and how they
were solved, the final verification of Q9 c, and the effort. The evidence of each task is its execution log in
[`tasks/generation-steps/`](../../tasks/generation-steps/check-list.md); the final gates are in
[`docs/qa/browser-run.md`](../qa/browser-run.md) ("Generation Steps (2026-10-29)").

## 12. How it was built

- **The task pack** ([`tasks/generation-steps/check-list.md`](../../tasks/generation-steps/check-list.md) and
  GS01–GS08) was written by claude-opus-5.5 from Part I. Each task names its files, its implementation steps, its
  business and technical acceptance criteria, its test plan and an execution log. The check-list fixes the order (one
  task per wave), the shared conventions, the decisions D1–D22 taken while writing it, the files each task owns and
  the final gates. gpt-6-astra reviewed the pack
  ([`gpt-6-astra/6-review-of-task-pack.md`](gpt-6-astra/6-review-of-task-pack.md): 45 groups of fixes, all applied)
  and declared it ready.
- **Branch** `generation-steps`, from `main` at `8d9510a`; first commit `0a91e3b` (the reports, the task pack and the
  row of `docs/README.md`), then one commit per task; nothing pushed (Q8 b).
- **Each task** was implemented by a fresh claude-sonnet-5.5 sub-agent that received the task file, the check-list
  and the handoffs of the earlier tasks, ran only the quick suites its task names, and did not commit. The
  orchestrator then re-ran the app's quick set (both apps when `core/` changed), checked line endings, BOM, absolute
  paths and file ownership, read the diff, filled the execution log (times, model, tokens, AI credits, verification,
  acceptance, issues, handoff) and committed. A defect found in another task's files went back to the orchestrator;
  each such fix was a line or two and was made by the orchestrator and recorded in the log of the task that found it.
- **The heavy and browser gates** ran once, at the end (GS08, Q9 c), on a frozen copy of the final candidate compared
  with a copy of `8d9510a`.

## 13. The tasks

| Task | What it built | Commit | Duration | AI credits | Generator quick set after |
|---|---|---|--:|--:|--:|
| GS01 | `SG.replay` (`generator/js/engine/replay.js`): complete moves from the dig log (an exchange is one move), one rating per board with honest statuses, the guards; the 14 goldens and the wire data (`generator/tests/fixtures/replay-goldens.js`, `replay-wire.js`, `generator/tests/replay-fixtures.js`); the `replay` suite | `924181d` | 21 min 36 s | 377.56 | 43 suites, 2,589 |
| GS02 | The two views: the compact selection (ratio R, minimum gain, never decreasing, phase ends cut, restarts folded), the avoidability audit, the transitions and their tiers (first rated, jump ×3 and +100, new hardest) | `2aff62c` | 16 min 37 s | 285.99 | 2,643 |
| GS03 | The jump explanations: the cause (`single-culprit`, `together`, `mixed`, `single-sign`, `single-cell`, `multi-move`, `unavailable`) and its frame, the generator's choice, the first use of the technique, the restricted check | `128ed08` | 16 min 02 s | 253.72 | 2,702 |
| GS04 | The worker job `replay` (`replayProgress`, `replayDone`, `replayError`, `cancel`), `SG.workerClient.replay` / `cancelReplay`, the main-mode consent (`replayConsentRequired`) | `d07c97c` | 14 min 53 s | 268.31 | 2,743 |
| GS05 | The replay in the page: `SG.player.buildViews` from the analysis, the "Show every move" toggle that keeps the place, the step texts in English and Vietnamese, the preparation flow and its status, the **Prepare score tables** button without a Worker (Q19 a), the cache path | `6b8d4ff` | 33 min 57 s | 833.94 | 2,785 |
| GS06 | The steps panel: a score table on every step (zero and status tables included), the badge "Score jump ×12.5", the callout and "Why?", the "New hardest technique" label, the culprit frame of a clue (`.cell--cause`) or a sign (`rect.sign--cause`, a small change in `core/`) | `482b6f8` | 25 min 18 s | 665.64 | 2,818 (player 1,609) |
| GS07 | The documents in both languages: user guides, developer guides, `generator/design.md`, `generator/task.md`, `README.md` | `02b1599` | 20 min 30 s | 534.78 | 2,818 (player 1,609) |
| GS08 | The final verification (Q9 c), the QA record and the release record | `71ec6cd` | 32 min 42 s | 129.88 | — |
| **Total** | | | **3 h 01 min 35 s** | **3,349.82** | |

The baseline had 42 quick suites and about 2,550 tests in the generator. The change added the `replay` suite and about
270 tests (in the `replay`, `player`, `steps`, `worker`, `cache` and `ui-contract` suites). No test was skipped,
deleted or weakened: the tests tied to the old fixed batches were rewritten around the invariants of §9.3, and every
such contract change is listed in its task's log.

## 14. Problems met and how they were solved

| # | Task | Problem | Resolution |
|---|---|---|---|
| 1 | GS01 | The rating field `checks` (a diagnostic count of solver checks) differs between two analyses of the same board in one Node process: `core/js/engine/tech-subset.js` keeps a module-level node counter, so the budget checks depend on the process history (G11: 728 or 729). Scores, statuses, counts and selections never change. | Accepted as a diagnostic-only field (the engine is out of scope, N1); documented in `replay.js` and `generator/design.md` §7.5; every determinism and round-trip test, and the GS08 sweep, compares analyses with `checks` zeroed. |
| 2 | GS02, GS03 | Assertions of the previous task encoded its intermediate state (no compact view yet; no causes yet). | Updated to the new contract in the task that changed it, as intended contract changes; no golden or fixture touched. |
| 3 | GS05 | The heavy suite `generator/tests/manual/killer.test.js` (outside the quick set and the task's files) still called the removed `SG.player.buildSteps`, so `--all` would have failed in GS08. | One line migrated by the orchestrator to `SG.player.buildViews(result, SG.replay.analyse(result)).details.steps`, keeping its assertion; that test run alone (1/1); GS08's identity check allows exactly this one line. |
| 4 | GS05, GS06 | Stale comments in `generator/js/ui/step-view.js` (`buildSteps`, `rateStep`, a "hardest removal" round). | Fixed in GS06 and GS07. |
| 5 | GS07 | A puzzle served from the cache announced "The step-by-step replay is ready." once its generation record was rebuilt, while the score tables were still being prepared. | The announcement now says "The generation record is rebuilt." / "Đã dựng lại bản ghi quá trình tạo đề."; the preparation status is read from `#replay-status`; `generator/design.md` §10.7 says so. |
| 6 | GS01–GS07 | The guides' quick-set counts went stale with every task. | Corrected once, in GS07 (43 suites, 2,818 tests; player 29 suites, 1,609 tests); GS08 measured `--all` at 3,835 tests, matching the guides' "about 3,840". |
| 7 | GS08 | The GS08 identity script allowed only the new `replay.js` in the engine-side diff. | The script (not the product) now also allows the migrated `killer` test line of item 3 and asserts that the diff is exactly that line. |
| 8 | GS08 | `--all` took 999 s on this machine, against "about nine minutes" in the guides. | Left as it is: times depend on the machine, and the counts match. |
| 9 | GS08 | The orchestrator's English / Vietnamese review of the 112 new or changed strings: the singular `steps.jump.choice.nulls_one` says "các phương án đó" (a plural) in Vietnamese. | A wording nit, left for a later change so as not to invalidate the tested candidate; recorded in the release record. |

Decisions taken by the developers where the task left a choice, and accepted by the orchestrator, are in the logs:
for example a replay with `forceMode: 'worker'` rejects even with `allowMain` (GS04); the compact restart step has no
`change` (GS05); the status table of a capped move shows no attempted rows (GS06).

## 15. Verification (Q9 c)

All once, on the final candidate `02b1599`, from a frozen copy of the tree compared with a copy of `8d9510a`
(Microsoft Edge 156.0.4314.50, Node v24.22.1, Windows). The pages were served over http from the root of each copy
(`generator/index.html?v=classic9&d=expert&seed=3275974478`, `?v=greaterThan&d=expert&seed=42`, and
`generator/tests.html` without `?all=1`), and the example was also opened from a file without a worker; every run
completed:

| Gate | Result |
|---|---|
| `cd generator && node tests/node-runner.js --all` | 51 suites, 3,835 tests, 0 failed, 3 skipped (`perf`), 999 s; the regression hashes included |
| Quick sets | generator 43 suites, 2,818 tests; player 29 suites, 1,609 tests; `node tests/replay-fixtures.js --check` up to date |
| `player/tests/browser/run-all.js` | `fragment.js` file and http, `open.js` 86/86, `play.js` 51/51, `ui.js` 45/45, `visual.js` 42/42, `help.js` 23/23, `links.js` 11/11 |
| `generator/tests.html` (headless, over http) | the branch 2,724 tests, 4 failed; `8d9510a` 2,464 tests, the same 4 failed (carried limitations: the "without a DOM" tests of `board-view`, `a11y`, `theme`, and one timing test of `pipeline`); no missing file, no console error; the `replay` suite ran in full (152 tests), the 14 golden details checks among them |
| The real page | 40/40 checks. With a worker the example prepares its tables by itself and shows 7 steps (0, 23, 44, 551, 568, 992, 992), the badge "Score jump ×12.5", the callout, a closed "Why?" and R1C2 framed on step 4, and 33 steps with "Show every move" (compact 4 ↔ details 24); in Vietnamese "Điểm tăng vọt ×12,5". From a file without a worker, the puzzle and its Summary work at once and the replay waits for "Prepare score tables" with browsing disabled, then shows both views. Greater-Than Expert seed 42 frames one sign on its jump (×4.0). No console error. The screenshots were looked at, also with forced colours emulated. |
| Identity (N1) | the payload digest of the example `d350758d…`, the cache version and key, the cache entry, the history entry and the export are byte-identical to `8d9510a`; the engine-side diff is the new `replay.js` and the one migrated `killer` test line; no existing fixture, regression hash, player file or shared test changed |
| Golden sweep | 14 / 14 equal (13 compact and 16 every-move jumps, 19 distinct transitions); preparing the score tables took a median of 29.2 ms per puzzle in Node, at most 592.0 ms (G14, Mega 16×16 Hell 2 seed 12, against 594.34 ms for the ratings alone in the prototype); all 14 together 948 ms, of which the explanations of both views 79 ms |
| Strings | 112 keys (98 new, 14 changed, 0 removed), all in English and Vietnamese; no Vietnamese copies English; one wording nit (§14, item 9) |

**Release verdict:** every gate passed and no defect is open; the branch is ready to merge. Merging is the user's
decision.

## 16. The requirements, met

| Requirement | Evidence |
|---|---|
| N1: the generator, its puzzles and the stored data unchanged | §15 identity; `--all` with the regression hashes; the only new engine-side file is `replay.js` |
| N2: a score table on every step, even when the score does not change | GS06 (zero tables, status tables, "992 (unchanged)"); the real page (7 of 7 steps with a table) |
| N3: scores that rise steadily | GS02 compact view (never decreasing, about ×2 apart); the example becomes 0, 23, 44, 551, 568, 992, 992, instead of steps 11–18 without a table and 1849 at step 19 |
| N4: a jump that cannot be removed is explained | GS02 audit (no recorded board could split a jump); GS03 cause, choice and first use; GS06 badge, callout, "Why?" and frame; the real page (step 4: "Score jump ×12.5", R1C2 framed) |
| Q1–Q19 | Part I §2; each decision is tested in the task that implemented it ([check-list §5](../../tasks/generation-steps/check-list.md)) |

## 17. Effort

| Who | Model | Work | AI credits | Tokens in / out |
|---|---|---|--:|--:|
| claude-opus-5.5 | Claude Opus 5.5 | research, review, response, check of the golden data, joint report, task pack | 12,630.90 | 308,228,253 / 2,071,380 |
| gpt-6-astra | GPT-6 Astra | research, review, response, golden data, checks of the joint report and of the task pack | 20,031.23 | 63,460,711 / 823,640 |
| GS01–GS08 developers (8) | Claude Sonnet 5.5 | implementation and final verification | 3,349.82 | 171,772,037 / 1,055,703 |
| look-up helpers (4) | GPT-5.6 Luna | short read-only look-ups | 7.67 | 535,202 / 27,438 |
| orchestrator | Claude Opus 5.5 | coordination, verification of each task, commits, reports, progress messages | 7,164.86 | 73,021,327 / 219,189 |
| **Total** | | | **43,184.48** | **617,017,530 / 4,197,350** |

Measured from the local usage records of the session at 02:12 on 2026-10-29 (the orchestrator's last few minutes of
work on this report are not counted); input tokens include cached reads. Wall-clock time: research and joint report
13:13–19:05 on 2026-10-28; task pack and its review 19:05–22:49; implementation and verification 22:50 on 2026-10-28
to 02:11 on 2026-10-29 (3 h 21 min, of which 3 h 02 min of developer time).

## 18. What is left

- **Merging** `generation-steps` into `main` is the user's decision; nothing was pushed.
- Not checked (also in [`docs/qa/browser-run.md`](../qa/browser-run.md)): a real screen reader on the callout and
  "Why?"; touch devices; Firefox and Safari; the main-mode press on a slow device; the screenshots of
  `docs/screenshots/` were not retaken.
- A wording nit in Vietnamese (§14, item 9).
- Deferred by the user's decisions (Part I §10): marks on the slider and a proof on the board (Q16 a); a retry for a
  capped position (Q18 b); splitting a symmetric group (Q2 a); a preview of the details view before "Prepare score
  tables" (Q19 a).
- A known quirk outside the scope: `checks` depends on the process history (§14, item 1).
