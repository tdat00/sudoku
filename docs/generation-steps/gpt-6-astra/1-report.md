# Generation Steps: truthful ratings, atomic moves, and the limits of smoothing

- **Researcher:** gpt-6-astra.
- **Date:** 2026-10-28.
- **Code examined:** `8d9510aade5d99f4fec9fda3835245a31f411ede` in `tdat00/sudoku`.
- **Scope:** independent research, read-only engine experiments, and this report; no implementation changes.
- **Conventions:** source citations are repository-relative `path:line`; step numbers are the UI's one-based
  numbers. Cell IDs in the example are zero-based, row-major IDs: `0` is R1C1 and `80` is R9C9.
  Scores are the current integer rating-v2 scores, not the logical solver's raw score.
  `E` means actual empty cells, excluding the holes in a multigrid canvas.
- **Evidence:** `E\` below denotes the external experiment directory specified in the appendix.
  Measurements used Node **v24.22.1**, Windows, on this shared machine. They are observations, not browser SLAs.
- **Independence:** neither the other researcher's report directory nor experiment directory was read.

The [architecture](../../architecture.md), [developer guide](../../../DEVELOPERGUIDE.md),
[previous scoring specification](../../difficulty-rating/report-detailed.md), and current source were read.
The report follows the evidence/observation/proposal distinction of the
[earlier independent report](../../difficulty-rating/gpt-6-astra/1-report.md).

## Executive summary

1. **The reported example is reproduced exactly with default options.** Classic 9×9, Expert,
   seed `3275974478` produces **21 replay steps**, a **30-clue** final puzzle scoring **992**, and no warnings.
   Steps **11–18 have no table**. Step **19 shows 1849**, and the final step shows **992**.
2. **The principal defect is not the 400 ms limit.** Four local-search swaps are split into their removal
   and addition halves. The removal-only boards at **11, 13, 15, 17 have at least two solutions** and no
   complete logical rating, even without a budget. Their following, valid addition halves at
   **12, 14, 16, 18 score 568**, but `rateStep` excludes the `reveal` kind. Step **20**, scoring **992**,
   is excluded for the same reason.
3. **1849 is a misleading intermediate of the fifth swap, not an accepted Expert puzzle.**
   The algorithm evaluates the complete swap and accepts **992**. The UI invents a checkpoint between
   its two logged operations. The underlying generator and final puzzle are not wrong.
4. **There is also a genuine, earlier jump: 44 → 551, a 12.5227× increase.** One removed clue group
   makes the proof need Simple Colouring. This jump survives every accepted-log boundary and even
   splitting that group into individual cells. A truthful geometric progression cannot be guaranteed
   merely by regrouping this trace.
5. **Recommended default:** replay complete moves, always render the score-table container, rate actual
   checkpoint boards off the UI thread, retain unchanged scores, and offer score-aware milestones as a
   **best-effort summary**, with explicit explanations of genuine jumps. Do not interpolate a puzzle's score.
6. This fixes the example to **16 fully rated steps**, with scores:
   `0, 18, 28, 34, 41, 44, 551, 557, 567, 568, 568, 568, 568, 568, 992, 992`.
   The artificial **1849** peak and all missing tables disappear. The real **44 → 551** transition remains.
7. In a separate, bounded **25-request** sample across **five variants**, **100/331 steps (30.21%)**
   lack a numerical table today. All **331** boards are logically rateable and unique in that sample:
   missing tables there are entirely presentation-policy exclusions. No 400 ms timeout occurred.
   The largest adjacent true-score increase is **20.625×**; **21 decreasing edges** occur in **8/25** runs.
8. Postprocessing the example and sample produced **1,437 atomic checkpoints**. Independent re-rating
   reproduced all **1,437** scores/counts, and DFS verified all **1,437** as unique. Every final board,
   puzzle payload, cache serialization, history entry, and fixed-timestamp JSON export remained unchanged.
9. True-score smoothing has a product decision, not just an implementation solution. Additional
   clue-superset reconstruction and separately generated illustrative ladders improve some cases but
   fail others. If a geometric number is mandatory on every screen, it must be explicitly called
   **explanation progress**, not the board's Difficulty Score. See **Decisions for the user**.

# Part A — How the Generation Steps work today

## A1. The actual request and level mapping

The UI constructs a request with `SG.store.toConfig(state)` and passes it to the worker client.
The store recognizes the decimal seed as an unsigned integer, not a text hash.
Defaults are rotational-180 symmetry, random digging, and eight full-grid attempts.
The store omits `trace`; the pipeline defaults it to `summary`.

Sources:

- `generator/js/ui/store.js:112–122,148–159,258–272`.
- `generator/js/ui/app.js:753–766`.
- `generator/js/engine/pipeline.js:24–26,51–100`.

The experiment uses the **same store conversion**, not a hand-approximated lower-level generation call:

```text
variantId: classic9
difficulty: expert
seed: 3275974478
symbolMode: digits
symmetry: rotational180
digOrder: random
maxAttempts: 8
variantOptions: {}
trace after normalization: summary
```

The current nine band starts are:

```text
veryEasy 0; easy 45; normal 180; hard 400; expert 700;
master 1000; nightmare 1500; hell1 2400; hell2 3600.
```

Thus **Expert is [700,1000)**, not the older report's `expert` band. It is the former `veryHard`.
Source: `generator/js/engine/difficulty.js:48–50,103–114`.

## A2. What the number actually means

For the complete logical proof of the particular board:

```text
E = empty cells
P = largest technique weight used
W = sum(weight × uses)
V = 80E/(E+40)
R = 0.25P log2(1+W/P), or 0 when P=0
score = round(V + P + R)
```

The table apportions `R` across technique rows, adds `P` to the hardest row, and adds `V` for empty cells.
Its integer row totals are rounded together so they sum to the score.
The requested difficulty is not an input to this formula.

Sources: `generator/js/engine/difficulty.js:5–23,233–272,289–318`.

An incomplete logical proof gets **`solved:false`, `score:null`, `level:null`**, not a very large score.
`rate` uses all applicable techniques and `assumeUniqueness:true`; it does not itself prove uniqueness.
The generation machinery establishes uniqueness separately.

Sources: `generator/js/engine/difficulty.js:391–415,435–460`.

More empty cells do **not** imply a higher score. The counts come from a fresh proof and may change
discontinuously or decrease. The source explicitly documents this.
Source: `generator/js/engine/difficulty.js:15–23`.

## A3. The generator is a search, not an increasing difficulty animation

| Phase | What is evaluated/accepted | Implication for replay |
|---|---|---|
| Random digging | Symmetry groups, with the level's bounded logical oracle | Many early boards need only singles |
| Guided digging | Highest objective among the considered removals below the band maximum | May jump directly to an expensive technique |
| Top-tier proposal | Uniqueness-preserving removals; the below-chain proof may get stuck | A provisional board need not have a full logical rating |
| Downward refinement | Add clue groups; keep complete ratings at or above the band's minimum | Scores can fall; even an addition need not lower the score |
| Local search | Complete removal/addition/swap or sign-removal candidate | A swap must be replayed as one evaluated move |
| Safety-net restart | Replace a failed dug board with a fresh full-grid-based dig | A real restart is not monotone |

Important details:

- Guided digging begins at about **47%** of cells retained as clues; its pool is at most **32** on 9×9,
  at least **4**, scaled down on larger boards.
  `generator/js/engine/digger.js:597–605,740–790,840–879`.
- Ordinary objectives use a restricted logical proof with `assumeUniqueness:false`; the UI's unrestricted
  `rate` is not identical to that objective.
  `generator/js/engine/digger.js:646–697`.
- Proposals begin at **Nightmare**, not Expert.
  `generator/js/engine/difficulty.js:117–118,365–367`;
  `generator/js/engine/digger.js:1670–1674`.
- Refinement can retain an addition with a score above the previous one; its acceptance test is
  `next.solved && next.score >= spec.min`, not `next.score < current.score`.
  `generator/js/engine/digger.js:1092–1148`.
- Local search constructs **both halves of a swap before checking uniqueness and rating it**.
  It rejects incomplete proofs, decreases, and scores at/above the target maximum.
  `generator/js/engine/digger.js:1394–1467`.
- The final sample is verified by DFS; a fallback is logged as `restart`.
  `generator/js/engine/digger.js:916–937`.
- Deterministic work caps are **1,024 full ratings** and **32,768 proposals** per full-grid attempt.
  They must not be consumed by additional explanatory ratings.
  `generator/js/engine/digger.js:626–641,1016–1025`.

## A4. Replay uses the chosen dig log, not the event trace

`pipeline.run` returns the chosen puzzle's `digLog`. This records decisions independently of event
verbosity: `pass`, `accept`, `reject`, `keep`, `restart`, `reveal`, and Greater-Than's sign data.
It is **not the history of every attempted puzzle**.

Sources: `generator/js/engine/digger.js:62–72,351–377,1747–1759`;
`generator/js/engine/pipeline.js:101–107,208–244`.

After generation the app shows the finished puzzle immediately. It calls `player.load`, builds steps from
the result, and selects the last step. The description's stats callback calls `player.rateStep`.

Sources: `generator/js/ui/app.js:634–637,711–725,1081–1084`;
`generator/js/ui/player.js:689–705`.

The pure builder:

1. Shows the full solution.
2. Shows cages or signs as a separate structure step, if applicable.
3. Replays logged changes.
4. Forces the last snapshot to `result.givens` and the result's final signs.

Source: `generator/js/ui/player.js:75–165`.

Current segmentation is by **operation count**, not score:

| Batch | Rule | 9×9 | Samurai, 369 cells |
|---|---|---:|---:|
| Random dig | `max(2, round(cellCount/9))` cells tried | 9 | 41 |
| Guided dig | `max(1, round(cellCount/81))` accepted rounds | 1 | 5 |
| Sign dig | `max(4, round(initialSignCount/8))` signs tried | Depends on signs | Not applicable |

Refusals after the final removal are merged into the last batch. Guided `keep` entries only increment
the number of candidates considered; their `score` is not used to rate a displayed board.

Sources: `generator/js/ui/player.js:44–54,170–190,236–282,362–391`.

### The swap-boundary defect

Local search logs a swap as:

```text
accept removed group
reveal added group, reason: search
```

The replay treats the first operation as a completed removal step, then flushes before the reveal.
That creates an extra board which **was never the complete candidate evaluated by local search**.

Sources:

- Transaction construction: `generator/js/engine/digger.js:1362–1370,1422–1446`.
- Replay split: `generator/js/ui/player.js:322–336,347–364`.

An adjacent search reveal can also follow an independent accepted removal; the current log has no explicit
transaction ID. Conservatively combining such an adjacent pair still gives a genuine endpoint, but an
implementation should call it a **combined change**, rather than assert that every such pair was one
original transaction. The example's five pairs are identifiable as swaps from the search and board changes.

## A5. Every reason a numerical score table can be absent

| Condition | Current behavior | Source |
|---|---|---|
| `solution`, `cages`, `signs`, `restart` | `{counts:{}}`, then a paragraph instead of a table | `player.js:39,510–512`; `step-view.js:423–426` |
| `clues`, `reveal`, `signDig` | No rating branch; returns and caches `null` | `player.js:508–529` |
| Any ordinary dig step carrying sign-state data | Explicitly excluded by `step.signs === null` | `player.js:516–517` |
| Logical solver does not complete | Returned rating is discarded; `null` | `player.js:520–522` |
| Rating budget expires | Exception swallowed; `null` | `player.js:42,519–525` |
| Any other rating error | Same catch; no visible reason | `player.js:523–525` |
| Rater absent from the page | Rating branch is unavailable | `player.js:516–517` |
| Final rating missing, lacking counts, or explicitly unsolved | Final branch returns `null` | `player.js:513–515` |
| No stats callback, or stats returned `null` | Whole technique/table block omitted | `step-view.js:415–417` |
| A returned stats object has no positive technique counts | Paragraph; no numerical table, even if empties exist | `step-view.js:418–426` |

All short filenames in this table are under `generator/js/ui/`.

**There is no "hide unchanged scores" condition.** Repeated scores are already allowed when a supported
step kind is successfully rated.

`rated[p]` memoizes both successful results and `null`; it is reset on load/reset, not retried on navigation.
`rateStep` scans backward to the nearest *known* rating, not necessarily the immediately previous step.
This can both hide what the delta compares against and synchronously rate several earlier boards.

Sources: `generator/js/ui/player.js:505–553,695–715`.

The **400 ms** cap is not a hard interrupt: the budget samples its clock only after every **1,024 checks**.
Long individual operations and a short solve with few checks need not stop exactly at the deadline.
Source: `core/js/engine/budget.js:8,24–34,56–75`.

## A6. Worker, cache, history, and export boundaries

- The worker currently handles generation, not separate replay analysis. It loads engine/variant scripts,
  not `ui/player.js`, and posts `pipeline.toWire(result)` when done.
  `generator/js/worker/gen.worker.js:1–24,35–80,182–191`.
- The default generation guard is **120,000 active ms**, with **12 ms** scheduling slices. Additional
  explanatory work must not be added to that generation budget.
  `generator/js/worker/gen.worker.js:77–80,230–248`.
- The pipeline warns that solving the same model between cooperative-generation yields is not safe.
  Analysis should start **after completion**, on an independent model.
  `generator/js/engine/pipeline.js:116–130`.
- Wire version is **1**; `digLog` crosses the worker boundary. `fromWire` enables cage/sign extensions.
  `generator/js/engine/pipeline.js:247,289–330`.
- Cache schema is **2**, LRU limit **20**. It deliberately deletes the dig log before persisting.
  Cache keys ignore trace verbosity. A cache hit regenerates replay data from the same seed.
  `generator/js/ui/cache.js:39–44,115–143,199–207,981–998`.
- History version is **1**, limit **100**; it stores puzzle summary/configuration, not replay data.
  `generator/js/ui/history.js:17–22,58–96`.
- The JSON exporter explicitly selects puzzle/model/rating fields and does not export the dig log.
  `generator/js/ui/export.js:127–198`.

These are strong reasons for a **derived, in-memory replay sidecar**, not a generator/rater/cache version change.

# Part B — Diagnosis with measurements

## B1. Reproduction method and limits

`E\load.cjs` reads `SOURCE_FILES` from `generator/tests/node-runner.js` and evaluates those classic scripts.
It does **not** execute the test runner or any test suite.

`E\trace.cjs`:

1. Converts the request through `SG.store.toConfig`.
2. Runs the unchanged pipeline with the normal **120 s** generation guard and records the result/events.
3. Calls the actual `SG.player.create().rateStep(p)` sequentially for every step.
4. Observes the rating calls made by that API, including returned status, exceptions, and elapsed time.
5. Separately rates every board with **no supplied rating budget**.
6. Checks uniqueness with `countSolutions(...,2)` using **200,000 nodes / 2 s** as a verification guard.

For Greater-Than, the unbounded rating uses the sign set of that step, excluding both previously hidden
and currently removed signs. It does **not** rate every step against the final sparse sign set.
All uniqueness checks reported here completed before their guard.

"Unlimited" means no external time/work budget passed to `SG.difficulty.rate`. It does not remove the
techniques' intrinsic search limits. For example, the default chain length is **12**, Nishio depth **2**,
and maximum supported Nishio depth **3**.
Source: `core/js/engine/tech-chain.js:62–66,115–128`.

The page's numerical-table presence is inferred from the actual stats API and the renderer's explicit
positive-technique-count gate. No DOM/browser run was performed.

## B2. What generated this particular puzzle

Observed generation time in the first reproduction: **146.166 ms**.
The run used **one full grid**, **12 ordinary dig samples**, and then local search.
The complete sample ratings, in order, were:

```text
560, 109, 568, 50, 48, 111, 50, 49, 49, 124, 49, 49
then local search: 992.
```

The chosen starting sample is the third sample, scoring **568** with **30 clues**.
Its random/guided log is followed by **five accepted swaps**, ending at **992**.
This is **not** a Nightmare proposal or a downward-refinement trace.

Evidence: `E\example.events.json`, `E\example-details.txt`, `E\example.wire.json`.
The code path is `generator/js/engine/digger.js:1660–1717`.

The canonical puzzle/configuration/log digest, excluding timings, is:

```text
d350758d7af16c41f4910469df513f56a7516966407285e1f39d9d983df68f2d
```

Final givens:

```text
004600091
721000040
900004070
000061005
000807000
600520000
060700009
040000728
290005600
```

## B3. Every displayed step of the example

Legend:

- **P**: paragraph "No solving technique is needed yet", not a numerical table.
- **U**: no complete logical rating; unlimited rating still has `score:null`.
- **K**: kind excluded by `techniquesAt`.
- Removed/added IDs are changes from the preceding displayed board.
- `R`, `G`, `L` denote random digging, guided digging, and local-search serialization.
- No step timed out.

| # | Kind/phase | Removed IDs | Added IDs | E | UI score | Unlimited score |
|---:|---|---|---|---:|---:|---:|
| 1 | solution/fullGrid | — | all 81 cells | 0 | P | 0 |
| 2 | random/R | 4,17,24,34,38,42,46,56,63,76 | — | 10 | 18 | 18 |
| 3 | random/R | 0,19,21,29,40,51,59,61,80 | — | 19 | 28 | 28 |
| 4 | random/R | 12,13,33,37,43,47,67,68 | — | 27 | 34 | 34 |
| 5 | random/R | 6,7,14,16,22,58,64,66,73,74 | — | 37 | 41 | 41 |
| 6 | random/R | 5,15,30,50,65,75 | — | 43 | 44 | 44 |
| 7 | guided/G | 1,79 | — | 45 | 551 | 551 |
| 8 | guided/G | 20,60 | — | 47 | 557 | 557 |
| 9 | guided/G | 26,54 | — | 49 | 567 | 567 |
| 10 | guided/G | 27,53 | — | 51 | 568 | 568 |
| 11 | guided/L, first half | 8,72 | — | 53 | U | U |
| 12 | reveal/L, second half | — | 21,59 | 51 | K | 568 |
| 13 | guided/L, first half | 21,59 | — | 53 | U | U |
| 14 | reveal/L, second half | — | 6,74 | 51 | K | 568 |
| 15 | guided/L, first half | 36,44 | — | 53 | U | U |
| 16 | reveal/L, second half | — | 16,64 | 51 | K | 568 |
| 17 | guided/L, first half | 6,74 | — | 53 | U | U |
| 18 | reveal/L, second half | — | 8,72 | 51 | K | 568 |
| 19 | guided/L, first half | 28,52 | — | 53 | 1849 | 1849 |
| 20 | reveal/L, second half | — | 7,73 | 51 | K | 992 |
| 21 | final/verification | — | — | 51 | 992 | 992 |

Thus **10/21 (47.62%)** have no numerical table: **1** zero-technique paragraph,
**4** incomplete ratings, **5** excluded reveals.
The user's **eight consecutive missing tables at 11–18 are confirmed**.

DFS returned **2** at steps **11,13,15,17** (meaning at least two solutions), and **1** at every other step.
The four complete swap endpoints all score **568**, but their technique counts differ:

| Old step | Naked singles | Hidden singles in boxes | Pointing | Box/line | Simple Colouring | Score |
|---:|---:|---:|---:|---:|---:|---:|
| 10 | 29 | 22 | 2 | 1 | 2 | 568 |
| 12 | 30 | 21 | 2 | 1 | 2 | 568 |
| 14 | 30 | 21 | 2 | 1 | 2 | 568 |
| 16 | 31 | 20 | 2 | 1 | 2 | 568 |
| 18 | 28 | 23 | 2 | 1 | 2 | 568 |

This is why copying the previous table solely because the total looks unchanged is not correct.
The new table must describe the new board.

### Per-step rating times

Times below are milliseconds, indexed **1–21**, in the same order as the table:

```text
Actual rateStep API:
0.124, 0.365, 0.209, 0.255, 0.098, 0.107, 0.615,
0.645, 0.538, 0.332, 17.657, 0.006, 15.371, 0.005,
20.868, 0.005, 44.445, 0.004, 1.936, 0.002, 0.006

Independent unlimited rating:
0.063, 0.026, 0.021, 0.019, 0.023, 0.024, 0.382,
0.807, 0.711, 0.313, 16.903, 0.242, 15.318, 0.212,
18.801, 0.210, 43.068, 0.227, 1.607, 0.203, 0.136
```

The actual underlying page-rater calls totaled **102.890 ms**; unlimited ratings totaled **99.316 ms**.
The incomplete positions return in tens of milliseconds, not at the **400 ms** boundary.
The tiny UI times for excluded kinds mean **no rating was attempted**, not that a score was unavailable.

Evidence: `E\example.trace.json`, `E\extra-measurements.json`.

## B4. The two very different jumps

### A real jump at step 7

| Position | E | P | W | V | R | Rounded score |
|---|---:|---:|---:|---:|---:|---:|
| Step 6 | 43 | 1 | 43 | 41.4458 | 1.3649 | 44 |
| Step 7 | 45 | 360 | 768.25 | 42.3529 | 148.3216 | 551 |
| Step 10 | 51 | 360 | 906.5 | 44.8352 | 163.3300 | 568 |
| Step 19 | 53 | 1100 | 5379 | 45.5914 | 703.5236 | 1849 |
| Step 20/final | 51 | 750 | 806.75 | 44.8352 | 197.5453 | 992 |

Step 6 uses **43 Naked Singles**. Step 7 uses **32 Naked Singles, 13 Hidden Singles in boxes,
and 2 Simple Colouring applications**. The peak weight changes from **1 to 360**.

Even allowing the symmetry pair to be split:

| Removal from the step-6 board | Actual score |
|---|---:|
| Neither cell | 44 |
| Cell 1 only | 550 |
| Cell 79 only | 44 |
| Both cells 1 and 79 | 551 |

Therefore splitting the batch cannot insert scores near **100 or 300** here.
All finer accepted-log boundaries in this reproduction leave the same **44 → 551** gap.

### An artificial peak at step 19

The removal-only board uses **1 XYZ-Wing and 4 Forcing Chains**, plus singles/locked candidates.
After the other half of the swap restores cells **7 and 73**, its proof is:

```text
29 Naked Singles
21 Hidden Singles in boxes
1 Hidden Single in a line
1 XYZ-Wing
51 empty cells
score 992
```

The local-search endpoint goes **568 → 992**, a **1.7465×** increase.
The UI instead exposes **568 → 1849 → 992**, with the last intermediate table hidden.
The apparent increase to **1849** is **3.2553×** from the last visible **568**.

**Conclusion:** neither "increase the timeout" nor "fill in the missing reveals" alone fixes the
misleading local-search trajectory. Moves must be grouped at valid semantic boundaries.

Evidence: `E\gap-probe.json`, `E\example.trace.json`.

## B5. Bounded multi-variant sample

The predeclared sample is:

- `classic9`, `killer`, `samurai`, `greaterThan`, `jigsaw9`;
- `veryEasy` and `expert`, each with seeds **1 and 42**;
- `nightmare`, seed **42**, for each variant.

That is **25 requests**, separate from the reported seed.
Each child process had an outer **180 s** guard; none needed it.
No heavy test runner, soak, performance, qualification, hash-update, deep, or browser suite was run.

Columns:

- **Missing** counts no numerical table, including a zero-technique paragraph.
- **Rating ms** is unbounded per-step **median / nearest-rank p95 / maximum**.
- **UI ×** is the largest increase between successive available numerical tables; a dash means only one exists.
- **True ×** is the largest increase between adjacent positive true ratings; zero-to-positive is excluded.
- **Drops** gives the destination step indices of decreases.
- **Gen ms** measures generation only, not the replay analysis.

| Variant | Level | Seed | Final | Steps | Missing | Gen ms | Rating ms | UI × | True × | Drops |
|---|---|---:|---:|---:|---:|---:|---|---:|---:|---|
| classic9 | veryEasy | 1 | 43 | 7 | 1/7 | 16.5 | 0.08/0.13/0.13 | 1.61 | 1.61 | — |
| classic9 | veryEasy | 42 | 42 | 7 | 1/7 | 17.8 | 0.08/0.18/0.18 | 1.61 | 1.61 | — |
| classic9 | expert | 1 | 987 | 14 | 2/14 | 134.2 | 0.03/1.38/1.38 | 12.19 | 12.19 | 13 |
| classic9 | expert | 42 | 928 | 11 | 1/11 | 58.5 | 0.04/0.46/0.46 | 20.15 | 20.15 | — |
| classic9 | nightmare | 42 | 1572 | 12 | 1/12 | 297.7 | 0.08/1.03/1.03 | 19.77 | 19.77 | — |
| killer | veryEasy | 1 | 43 | 8 | 2/8 | 21.9 | 0.05/0.10/0.10 | 1.61 | 1.61 | — |
| killer | veryEasy | 42 | 42 | 8 | 2/8 | 22.7 | 0.06/0.11/0.11 | 1.61 | 1.61 | — |
| killer | expert | 1 | 798 | 24 | 2/24 | 13821.0 | 0.17/1.25/1.67 | 2.59 | 2.59 | — |
| killer | expert | 42 | 836 | 27 | 2/27 | 6635.3 | 0.15/1.86/1.88 | 3.26 | 3.26 | 25 |
| killer | nightmare | 42 | 1940 | 28 | 5/28 | 2628.5 | 0.22/1.78/3.04 | 4.94 | 4.94 | 25,27 |
| samurai | veryEasy | 1 | 44 | 4 | 1/4 | 45.0 | 0.08/0.13/0.13 | 1.02 | 1.02 | — |
| samurai | veryEasy | 42 | 44 | 4 | 1/4 | 42.1 | 0.08/0.13/0.13 | 1.02 | 1.02 | — |
| samurai | expert | 1 | 741 | 14 | 1/14 | 697.1 | 0.13/2.02/2.02 | 4.91 | 4.91 | 13 |
| samurai | expert | 42 | 997 | 14 | 1/14 | 307.4 | 0.16/1.18/1.18 | 13.35 | 13.35 | — |
| samurai | nightmare | 42 | 1637 | 14 | 1/14 | 188.3 | 0.14/1.25/1.25 | 20.63 | 20.63 | — |
| greaterThan | veryEasy | 1 | 42 | 12 | 11/12 | 56.0 | 0.11/0.34/0.34 | — | 1.00 | — |
| greaterThan | veryEasy | 42 | 41 | 12 | 11/12 | 48.3 | 0.09/0.34/0.34 | — | 1.00 | — |
| greaterThan | expert | 1 | 990 | 16 | 15/16 | 7685.4 | 0.50/1.58/1.58 | — | 3.93 | 6,8,11,12,14 |
| greaterThan | expert | 42 | 973 | 23 | 22/23 | 9425.5 | 0.66/1.56/3.81 | — | 4.07 | 4,5,7,11,13,14,17,19,21 |
| greaterThan | nightmare | 42 | 2287 | 12 | 11/12 | 451.5 | 0.62/7.61/7.61 | — | 13.64 | 6 |
| jigsaw9 | veryEasy | 1 | 43 | 7 | 1/7 | 37.0 | 0.09/0.20/0.20 | 1.61 | 1.61 | — |
| jigsaw9 | veryEasy | 42 | 43 | 7 | 1/7 | 26.4 | 0.08/0.15/0.15 | 1.61 | 1.61 | — |
| jigsaw9 | expert | 1 | 716 | 14 | 1/14 | 126.1 | 0.05/0.86/0.86 | 12.06 | 12.06 | — |
| jigsaw9 | expert | 42 | 718 | 16 | 1/16 | 118.9 | 0.04/0.84/0.84 | 12.51 | 12.51 | — |
| jigsaw9 | nightmare | 42 | 1678 | 16 | 2/16 | 74.1 | 0.06/4.40/4.40 | 12.88 | 12.88 | 15 |

Aggregate observations:

- **331 steps; 100 missing tables (30.2115%)**:
  **35** zero-technique paragraphs, **5** excluded reveals, **60** other excluded sign-state steps.
- All **25** final puzzles hit the requested band.
- **0** unbounded incomplete proofs, **0** ambiguous boards, **0** incomplete uniqueness checks.
- **0** 400 ms failures. There were **206 actual page-rater calls**, totaling **80.010 ms**.
- Unlimited rating of all **331** boards totaled **148.067 ms**:
  median **0.1169 ms**, p95 **1.6663 ms**, maximum **7.6132 ms**.
- Generation totaled **42,983.053 ms**; the slowest request was Killer Expert seed 1,
  **13,820.989 ms**.
- Largest true increase: Samurai Nightmare seed 42, **72 → 1485**, **20.625×**.
- **21 decreasing edges in 8 requests**. There is no global monotonicity invariant.
- Including the reported seed gives **110 missing tables out of 352 steps (31.25%)**.
  This combined count is descriptive, not a statistical estimate for the seed space.

Evidence: `E\sample.json`, per-case `.trace.json` files, `E\aggregate.json`, `E\summary.txt`.

## B6. Decreases and unrated positions are not one phenomenon

Concrete observations from the sample:

| Cause | Example | Observed transition |
|---|---|---|
| Split local-search swap | Classic Expert seed 1 | 1283 → 987 after the reveal |
| Different proof after removing clues | Killer Expert seed 42 | 599 → 595, removing cells 31 and 49 |
| Different proof on multigrid | Samurai Expert seed 1 | 755 → 741, removing 8 cells |
| Downward refinement | Killer Nightmare seed 42 | 2997 → 2780 → 2788 → 1940 |
| Downward refinement | Jigsaw Nightmare seed 42 | 2967 → 1678 |
| Sign removal and clue tuning | Greater-Than Expert seed 42 | 274 → 271 → 135 early; several later rises/falls |

Evidence: `E\decreases.txt`; all these boards were independently unique.

**Can an intermediate board be non-unique?** Yes: the four exposed half-swaps of the reported seed prove it.
Those are not accepted generator endpoints. Raw trials, a cleared Greater-Than setup, and a pre-fallback
board are also not promises of a unique playable puzzle.

**Can a unique position lack a complete logical rating?** The architecture allows it:
proposal removals are accepted by DFS uniqueness, while their below-chain solve may be stuck;
Greater-Than's minimal-sign pass also uses uniqueness alone. The finite logical technique portfolio is not
a completeness theorem for unique Sudoku. An unlimited wall-clock budget does not change this.
Sources: `generator/js/engine/digger.js:654–673`;
`generator/js/variants/greater-than.js:291–300,379–410`;
`core/js/engine/logical-solver.js:246–269,337–349`.

However, **no unique-but-unrated checkpoint was observed in the 25-request sample or the 1,437 atomic
checkpoints**. The observed four unrateable example boards were all non-unique. Do not generalize that
sample observation into a guarantee for every proposal, variant, or seed.

# Part C — Proposal, alternatives, feasibility, and cost

## C1. The requirement conflict that must be resolved explicitly

Three desirable properties are different:

1. Preserve the final generated puzzle and its algorithm.
2. Every displayed step has a score table.
3. Every table's real score follows a roughly geometric, steadily increasing sequence.

Properties **1 and 2** are straightforward with the design below.
Property **3 cannot be guaranteed while also requiring actual chronological generation states and the
unchanged scoring formula**. The example is a direct counterexample: its accepted trace has no checkpoint
with a score strictly between **44 and 551**.

Selection can omit states. It cannot manufacture a state scoring **100 or 300**.
An integer score has technique thresholds; there is no intermediate-value theorem on clue subsets.
The generator is explicitly allowed to restore clues and search sideways.

**Recommended interpretation:** make progress understandable and avoid artificial jumps, but preserve true
scores. Use approximately geometric milestones **where the available states support them**, and explain a
genuine threshold jump where they do not.

If literal smoothness is non-negotiable, the displayed smooth quantity must have different semantics,
or the explanation must be an explicitly illustrative route rather than the actual generation replay.
Neither should be silently presented as "the difficulty of the board at this step."

## C2. Recommended design: atomic replay plus an always-present truthful table

### Step 1 — Preserve the original result, log, and generation work

Treat `PuzzleResult` as immutable for this feature.
Build a separate `ReplayPlan` after generation:

```text
planVersion
puzzle identity
checkpoints:
  source log interval
  kind / phase / optional combined-change annotation
  board values or a delta reference
  constraint-state identity
  removed / added cells or signs
  rating status
  technique counts, E, score when rated
```

Do not:

- change RNG streams or consume the generator's RNG for display decisions;
- call extra ratings inside `generateSteps`, `rateCounted`, or a live cooperative generation slice;
- change difficulty weights, bands, clue floors, caps, qualification lists, or regression hashes;
- use display options in `GenerateConfig`, cache keys, seed URLs, or puzzle history identities;
- replace the final rating with an interpolated or independently rounded value.

If a later implementation adds explicit transaction tags, keep them presentation-only and additive.
The minimal default can instead conservatively bundle adjacent remove/search-reveal operations, with
accurate "combined change" wording, without changing `digLog` at all.

### Step 2 — Expose only complete board-changing moves as normal checkpoints

- Apply both removal and addition of a local-search swap before taking its visible snapshot.
- Show both sets of marks on that one board and say that the clues were exchanged.
- Keep independent `reveal` operations: downward refinement is real and should be explained.
- Keep setup/structure/verification checkpoints even when their score is unchanged.
- Never split a symmetry group merely to obtain an intermediate number.
- Do not display `keep` trials as accepted removals: their values are alternative candidates.
- A detailed troubleshooting view may show raw trials, but must label non-unique/unrated states honestly.

The current log's lack of transaction IDs deserves a focused test: conservative adjacent grouping is safe
as a display interval, but should not invent exact search-transaction provenance.

### Step 3 — Always render the table shell, including unchanged and zero scores

Use explicit states, rather than `stats === null` meaning "delete the table":

| State | Empty cells | Technique rows | Total |
|---|---|---|---|
| Rated | Actual E | Actual complete-proof counts | Actual score |
| Fully filled solution/structure | 0 | "No solving needed" row | 0 |
| Pending | Actual E | Computing indicator | — |
| Timed out | Actual E | Retry/status explanation | — |
| Unique but logically incomplete | Actual E | No complete proof; optional partial work clearly separated | — |
| Multiple solutions | Actual E | Trial/combined change warning | — |
| Missing replay/solver data | Known E if available | Explicit unavailable message | — |

For a rated position, call the existing `SG.difficulty.scoreTable`; do not recreate or scale the formula.
Cache by **board plus constraints plus rating version**, not just by total score.
Repeated **568** tables can have different counts.

A previous rating may be shown in a separate "last rated checkpoint" line, with its step number.
It must not be reused as the current board's score. Partial technique work must not be rounded into a
purported complete difficulty rating.

Position **0** is the empty pre-generation canvas, not an accepted puzzle: if the container is shown there,
use "Not a puzzle yet", not a fabricated difficulty of zero for an empty Sudoku.

### Step 4 — Score-aware milestones, not fabricated scores

Offer a compact milestone view and a detailed complete-move view.
Recommended initial policy, explicitly a proposal rather than a measured UX optimum:

- Aim for approximately **8–12 total display steps**, including setup and final verification.
- Allow fewer for trivial puzzles and more only in the detailed view.
- Keep setup/structure/final as mandatory landmarks.
- For positive target scores, use `T[j] = S0 × (Sfinal/S0)^(j/(k-1))`.
- Select chronologically ordered, completely rated checkpoints near these targets.
- Use a monotone dynamic-programming selection or explicit phase grouping, rather than assuming
  clue count or binary search on score is monotone.
- Permit equal scores. When a target interval has no candidate, show a gap annotation, not an invented number.
- Preserve the final actual score. Never clamp a previous overshoot to the final score.
- Keep genuine downward tuning in the detailed view. In a monotone summary, group the entire
  overshoot/refinement interval and describe the tuning that occurred inside it.

A summary that omits an overshoot is a **summary of a larger logged interval**, not a claim that the
underlying search was increasing. Its explanation should say how many changes it combines.
If no useful monotone summary exists, show the truthful complete-move sequence with phase labels.

## C3. Before/after for the reported seed

### Today

```text
P, 18, 28, 34, 41, 44, 551, 557, 567, 568,
U, K, U, K, U, K, U, K, 1849, K, 992
```

### Recommended minimal correction: complete moves and tables on all of them

```text
0, 18, 28, 34, 41, 44, 551, 557, 567, 568,
568, 568, 568, 568, 992, 992
```

Mapping: old steps **11+12**, **13+14**, **15+16**, **17+18**, **19+20** each become one complete
change. The final verification repeats **992** deliberately.
This gives **16/16 rated tables**, rather than **11/21**.

### A real-score milestone prototype

The prototype requested target scores:

```text
35, 80.7568, 186.3330, 429.9330, 992
```

The available, ordered checkpoints selected by nearest log-distance were:

```text
0, 36, 44, 551, 557, 992
```

The largest ratio stays **12.5227×**. This is a feasibility demonstration, not a proposed polished
six-screen sequence: selection improves brevity but cannot fill a missing score interval.
A more sophisticated selector cannot invent the absent **100/300** boards either.

### If the user instead chooses an explicitly smooth progress indicator

An illustrative geometric schedule could be:

```text
35, 107, 325, 992
```

Those are rounded targets, **not measured puzzle ratings**.
If used, label this as explanation progress/targets and keep the current board's true Difficulty Score
in the table. Do not replace table totals or technique shares with these values.

## C4. Prototype results on the example and sample

### Prototype A: complete-move checkpoints, then score-aware selection

`E\prototype.cjs` expands accepted removal boundaries, bundles adjacent search remove/reveal pairs,
handles sign removals with their actual models, and rates all resulting checkpoints.
It does not change the original result or log.

Across **26 puzzles** including the reported seed:

- **1,437 checkpoints**, all with complete ratings.
- **418.083 ms** total initial rating time for those checkpoints on this host.
- Per-puzzle rating total: **0.246–129.097 ms**.
- A second pass reproduced **1,437/1,437 scores and count maps** and verified **1,437/1,437 unique boards**.
- Maximum observed rating budget checks in that verification: **8,078**.
- Maximum observed DFS uniqueness nodes: **10,304**.
- All **26** reconstructed endpoints equal the exact original givens.

The checkpoint count excludes a separate cages/signs setup screen and duplicate final verification.
Those use existing zero/final ratings and need no extra solve.

Representative results:

| Case | Atomic checkpoints | Rating ms | Rating-sidecar bytes | Selected true scores |
|---|---:|---:|---:|---|
| Reported example | 32 | 18.22 | 3452 | 0,36,44,551,557,992 |
| Classic Expert 42 | 27 | 1.25 | 2612 | 0,35,46,927,928 |
| Killer Expert 1 | 39 | 21.66 | 4924 | 0,35,103,304,798 |
| Killer Expert 42 | 42 | 11.21 | 5497 | 0,35,127,170,836 |
| Samurai Expert 42 | 131 | 17.10 | 13166 | 0,35,73,73,960,997 |
| Greater-Than Expert 42 | 112 | 44.36 | 21115 | 0,135,135,242,242,973 |
| Jigsaw Expert 42 | 32 | 1.82 | 3647 | 0,35,49,613,718 |
| Greater-Than Nightmare 42 | 96 | 129.10 | 18365 | 0,142,142,164,164,2029,2287 |

Killer Expert seed 1 is a **positive** example where regrouping genuinely produces the requested style:
**35 → 103 → 304 → 798**. It does not justify promising the same shape for every seed.

Evidence: per-case `.prototype.json`, `E\prototype-summary.json`, `E\verification.json`.

### Prototype B: reconstruct a clue-removal path backward from the final puzzle

This alternative adds solution-valued symmetry groups to the final puzzle, seeking progressively lower
true ratings, then reverses the selected snapshots. Every board is a superset of the final clues,
so uniqueness is preserved; only completely rated boards are selected.

The experiment cap was **512 candidate evaluations / 4 s per puzzle**, checked between ratings.
It is a bounded greedy feasibility prototype, **not an exhaustive search or a completeness claim**.
All **26** cases were tried.

| Case | Resulting true scores | Evaluations | Time ms | Evaluation/time cap reached |
|---|---|---:|---:|---|
| Reported example | 0,39,41,992 | 198 | 18.23 | No |
| Classic Expert 1 | 0,40,47,209,987 | 207 | 10.90 | No |
| Classic Expert 42 | 0,34,928 | 260 | 17.90 | No |
| Killer Expert 1 | 0,46,112,171,798 | 441 | 86.36 | No |
| Killer Expert 42 | 0,46,114,168,836 | 512 | 156.78 | Yes |
| Samurai Expert 42 | 0,264,265,997 | 512 | 226.43 | Yes |
| Greater-Than Expert 42 | 0,40,43,973 | 154 | 7.24 | No |
| Jigsaw Expert 42 | 0,40,104,301,718 | 325 | 13.04 | No |

Totals: **5,892 candidate evaluations**, **1,418.698 ms**, **4 capped cases**.
The worst final sequence ratio in this experiment was **36.5581×**.
The example's ratio worsened to **992/41 = 24.1951×**.

An additional direct probe of the example:

- All **51 one-cell additions** to its final givens scored either **47 or 992**:
  **23** were singles-only, **0** were unrated.
- All **26 empty-symmetry-group additions** scored **46, 47, or 991**:
  **19** were singles-only, **0** were unrated.

This is evidence of a wide local gap, not a proof over all possible multi-group supersets.
It decisively rejects the assumption that "just add back a few clues" necessarily supplies a score near **300**.

Evidence: `E\gap-probe.json`, `E\prototype-summary.json`.

### Prototype C: separately generated illustrative difficulty ladders

For completeness, `E\ladder.cjs` creates additional puzzles from the **same full solution and final
constraint model**, using separate deterministic RNG forks and the public digger. It never replaces
the real result. The selected boards need not contain the final givens and may restore many clues.

This is **not a replay of the actual generation**. It is a possible, clearly labeled comparison feature.
The larger trial allowed **64 digs per target**, a **3 s** overall check between digs, and a
**500 ms** budget per dig.

| Case | True score sequence | Digs | Time ms | Largest ratio |
|---|---|---:|---:|---:|
| Reported example | 0,36,47,270,992 | 128 | 271.05 | 5.745 |
| Classic Expert 42 | 0,36,100,228,928 | 121 | 189.20 | 4.070 |
| Killer Expert 42 | 0,36,87,151,836 | 128 | 203.76 | 5.536 |
| Samurai Expert 42 | 0,35,72,352,997 | 66 | 1165.58 | 4.889 |
| Greater-Than Expert 42 | 0,36,117,280,973 | 36 | 114.66 | 3.475 |
| Jigsaw Expert 42 | 0,36,104,257,718 | 28 | 39.31 | 2.889 |

All selected boards were unique, all final result digests remained identical, and no overall cap was reached.
Total: **507 digs**, **1,983.568 ms**.
An initial **8-digs-per-target** run also failed to approach the example's desired middle scores;
its example sequence was the same **0,36,47,270,992** in **74.85 ms**.

The example's last transition replaces **22 clues with 22 other clues**. That is a poor account of
"how this puzzle was generated" despite its better score ratios.
The bounded search still does not guarantee a geometric sequence. **Not recommended as the default replay.**

Evidence: `E\ladder-summary.json`, `E\ladder-summary-64.json`, per-case `.ladder-64.json`.

## C5. Where to compute ratings

| Alternative | Benefit | Limitation | Recommendation |
|---|---|---|---|
| Keep lazy synchronous UI rating, raise 400 ms | Small change; more time for slow hardware | Excluded kinds and half-swaps remain; longer freezes | Not the primary fix |
| Always show a placeholder, retain current rating location | Immediately fixes disappearing layout | Still blocks on real ratings; cannot choose score-aware steps first | Useful first UI increment |
| Rate inside the existing generation search | Can reuse some work | Alters work/time budgets; restricted objective is not full rating; non-reentrancy risk | Reject |
| Postprocess after generation in worker | Final puzzle ready immediately; cheap navigation; deterministic analysis possible | New job/protocol and stale-result handling | Preferred |
| Worker on demand for current/neighboring checkpoints | Less work for unopened replay | Milestone plan must wait or use a deterministic coarse plan | Good scheduling refinement |
| Persist all replay ratings in localStorage | Reuse after reload | New storage/compatibility costs; cache currently omits replay | Defer |
| Clamp, interpolate, or carry forward score | Smooth numbers | Table no longer describes the displayed board | Reject as Difficulty Score |
| Logarithmic chart axis | Makes genuine jumps visually less dominant | Does not alter numerical jumps | Optional honest visualization |

### Recommended execution contract

1. Post the **unchanged generation result first**.
2. Queue replay analysis separately; prioritize it over background pre-generation when the replay is opened.
3. Use a freshly reconstructed model and the current checkpoint's actual constraints.
4. Prepare counts/rating status off the main thread; render localized strings in the UI only.
5. Return a versioned sidecar message carrying the session/puzzle identity, not a changed `PuzzleResult`.
6. Cancel/discard stale work on a new puzzle, import, reset, or cached-result mismatch.
7. Keep finalized checkpoint identities stable once navigation begins; do not unexpectedly renumber the slider
   while the user is reading.
8. For `file://`, use post-generation scheduled slices, with the same table states. A single logical solve
   remains non-resumable, so never pretend that scheduling alone removes its worst-case pause.

A proposed first deterministic rating guard is **100,000 budget checks per candidate**, with an explicit
retry up to **1,000,000** outside the generation budget. The maximum measured here was **8,078**.
These are proposed defaults to validate on slower browsers, not a guarantee of universal completion.
Use a wall-clock watchdog for responsiveness, but do not make a canonical milestone plan depend on a
machine-speed cutoff: a time-limited analysis may remain pending and retry.

Reuse complete final ratings, full-grid zero ratings, and identical-board ratings.
Do not cache a timeout forever. Cache keys must include the complete active sign/cage/model identity and
`ratingVersion`; no derived work may feed back into the puzzle search.

## C6. Variant and phase handling

### Killer

The final cage layout remains fixed while clue groups are replayed. Show a zero-score table for both the
full solution and the subsequent cage-construction step. Then rate the correct cage model for every dig
and reveal checkpoint. Do not imply that the log reconstructs all rejected cage-layout searches.
Killer's strategy delegates to the ordinary digger with its own floor/keep settings.
Source: `generator/js/variants/killer.js:996–1020`.

### Greater-Than

Use the logged initial sign list and the alive-sign set at each checkpoint.
A currently removed red-marked sign is explanatory decoration, not an active constraint.
Use `SG.greaterThan.withSigns` to create the correct model; never rate all intermediate boards with only
the final signs. The helper also enables the sign propagation extension.
Source: `generator/js/variants/greater-than.js:103–121`.

The clue-opening screen can have a substantial nonzero score immediately; sign removal may keep the
same score or lower it. The sample's low-level boards remain at **41 or 42** over repeated sign steps.
Every such step should retain a table.

Minimal-sign digging can overshoot, followed by clue reveals and another sign pass.
Use a labeled tuning interval, not a fake increasing clue-removal story.
Source: `generator/js/variants/greater-than.js:337–424`.

### Multigrids and irregular boards

Use `model.cellCount`, global cell IDs, layout coordinates, and actual units.
Samurai has **369 logical cells**, not the number of canvas squares.
Overlaps are not extra copies of the same cell. A checkpoint's score is one solve of the complete model,
not the sum of separate subgrid ratings.

The same fixed score formula applies; only candidate evaluation cost and useful checkpoint density differ.
Do not impose a scaled score target merely because the board is bigger.

### Downward refinement, additions, and restarts

Keep genuine score decreases in the complete-move view, with a sentence explaining that clues were restored
or the proof changed. An "upward-only" summary may merge the whole interval but must preserve a truthful
final board and say it includes tuning.

A restart begins a new phase, not a continuation of an increasing score line.
An unrated provisional state should be folded into a meaningful interval in the default view, or retain an
explicit unrated table in the detail view. Never claim a made-up value for it.

## C7. Time, memory, wire size, persistence, and compatibility

All byte counts below are UTF-8 compact JSON or typed-value buffers, not JS heap measurements.
Rating-sidecar sizes are prototype serializations; the current application does not persist such sidecars.

| Item | Reported example | Largest observed in sample/prototypes |
|---|---:|---:|
| Existing result wire JSON, including dig log | 6939 B | 32549 B |
| Existing dig-log JSON | 2972 B, 74 entries | 15017 B, 362 entries |
| Current displayed-step value buffers | 6804 B: 21×81×4 | 20664 B: 14×369×4 |
| Current-step rating sidecar, including statuses | 2622 B | 4129 B |
| Corrected complete-move value buffers | 5184 B: 16×81×4 | Depends on selected plan |
| Corrected complete-move rating sidecar | 1728 B | Not measured for every display plan |
| All atomic candidate value buffers, if retained | 10368 B: 32×81×4 | 196308 B: 133×369×4 |
| All atomic candidate rating sidecar | 3452 B | 21115 B |

The preferred implementation does **not** need to retain all candidate value arrays:
keep the source log, candidate ratings and log offsets, and materialize selected boards/deltas.
For example, **12 Samurai value snapshots require 17,712 B**, before JS object overhead.

Runtime observations:

- Reported example: actual UI rating calls **102.890 ms**, much of it spent on ambiguous half-swaps.
- Complete atomic analysis of that example: **32 ratings**, **18.22 ms** in the prototype batch.
- Across all **26** atomic analyses: **418.083 ms** total.
- The slowest per-puzzle atomic analysis was Greater-Than Nightmare 42, **129.097 ms**.
- In the independent verification pass, the largest single atomic rating was **13.1325 ms**.
  This was a different pass from the **7.6132 ms** maximum for the original 25 displayed-step traces.
- These figures include neither browser rendering nor a claim about mobile-device speed.

With an in-memory sidecar:

- **Persistent cache bytes added: 0.**
- **History bytes added: 0.**
- **Exported puzzle bytes added: 0.**
- Cache key, history identity, wire result version, rating version, regression hashes, and qualification
  outputs do not change.
- A new optional replay-analysis worker message does carry sidecar data, but the existing `done.result`
  can remain byte-for-byte unchanged apart from its already-variable timings.

The example's current cache payload is **4,718 B**, and its fixed-timestamp JSON export **4,544 B**.
Verification confirmed the same cache, history-entry, and export bytes before/after derived analysis for
all **26 puzzles**.

Persisting every candidate rating for **20 cache entries** at the observed maximum would add about
**422,300 B**, before list/object overhead, and would require compatibility/eviction decisions.
There is no demonstrated need for that in the first implementation.

# Part D — Impact

## D1. What the user will see

- Every normal replay step has the same stable score-table area.
- Setup shows **0** explicitly; unchanged steps retain a full, current table.
- A swap highlights removed and restored clues together and explains the exchange.
- The reported seed no longer shows unplayable intermediate boards or the spurious **1849** excursion.
- A real threshold transition names the newly required technique instead of implying a UI failure.
- Preparing, timed-out, and unrateable states have explicit text rather than disappearing content.
- A compact milestone summary remains optional and truthful; a detailed complete-move view explains tuning.
- Final Summary and the final replay table always agree.
- Manual navigation, no autoplay, keyboard controls, and relative-page behavior remain unchanged.

## D2. Strings and accessibility

Illustrative new keys/texts below must be supplied in both languages and shown through `SG.i18n.t()`.
Existing table headings/formula tooltips should be reused, not forked.

| Key suffix | English | Vietnamese |
|---|---|---|
| `rating.pending` | Computing difficulty… | Đang tính độ khó… |
| `rating.zero` | No solving is needed for a filled board. | Bàn cờ đã điền đầy đủ nên chưa cần giải. |
| `rating.unchanged` | Difficulty is unchanged. | Độ khó không đổi. |
| `rating.unrated` | No complete logical rating for this position. | Chưa có kết quả chấm điểm bằng lời giải logic đầy đủ cho trạng thái này. |
| `rating.nonunique` | Intermediate trial: more than one solution. | Bản thử trung gian: có nhiều lời giải. |
| `rating.timeout` | Rating paused. Try again. | Đã tạm dừng chấm điểm. Hãy thử lại. |
| `rating.previous` | Last rated checkpoint: step {step}. | Mốc được chấm điểm gần nhất: bước {step}. |
| `replay.swap` | Removed {removed} clues and restored {added} clues together. | Bỏ {removed} số cho sẵn và đồng thời thêm lại {added} số. |
| `replay.milestones` | Difficulty milestones | Các mốc độ khó |
| `replay.details` | Generation details | Chi tiết tạo đề |
| `rating.jump` | This change introduces {technique}; a real score can jump. | Thay đổi này làm xuất hiện kỹ thuật {technique}; điểm thực tế có thể tăng mạnh. |
| `rating.tuning` | Clues were restored while tuning the puzzle. | Một số số cho sẵn được thêm lại để điều chỉnh đề. |

Use the existing cell/technique labelers, pluralization helpers, tooltips, and design tokens.
Keep table headers accessible, announce status changes politely, and do not move focus when ratings arrive.
For decreases, show a signed change or neutral text; do not imply that a negative technique-count delta
is a missing statistic.

## D3. Likely implementation surfaces

- `generator/js/ui/player.js`: pure plan consumption, atomic changes, stable IDs, rating/status cache,
  and clear adjacent-checkpoint comparisons.
- `generator/js/ui/step-view.js`: unconditional table shell; zero, pending, failure, and tuning states.
- A **generator-owned** pure replay-plan/analysis module, usable by worker and main-thread fallback.
  This feature does not belong in shared `core` unless a genuinely shared use emerges.
- `generator/js/worker/gen.worker.js`, `worker-client.js`: optional post-generation analysis job/results,
  cancellation, identity checks, independent budgets.
- `generator/js/ui/app.js`: attach/update a plan without replacing the final puzzle or losing navigation.
- `generator/js/ui/cache.js`: scheduling and cached-replay attachment only; no key/schema change.
  Its regeneration currently calls `app.attachTrace(trace, fresh.digLog)`, so it must also trigger or
  attach derived analysis instead of forgetting it.

If a generator-owned script is added, update the generator's ordered script lists and their contract tests.
There is no reason to add it to the player's script lists or change shared engine behavior.
No such files were edited in this research.

## D4. Documentation and help to update with implementation

- `USERGUIDE.md` and `USERGUIDE.vn.md`: stable tables, pending/unavailable states, swaps, genuine jumps,
  summary versus detailed replay, and unchanged final generation behavior.
- `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`: source log versus derived plan, atomic grouping,
  rating statuses, worker/fallback jobs, serialization boundaries, and script order if changed.
- `generator/design.md`: especially **§7.3**, **§10.5**, worker/replay interfaces, and the existing
  statement that an incomplete proof gets no table.
  Relevant current lines: `757–789,1185,1588,1848,1864`.
- `generator/js/ui/help.js`, both language fragments, and relevant explanation strings.
  The current replay narrative lives at `1173–1193` and its Vietnamese counterpart.
- `generator/js/engine/explain-data.js`/locale pseudocode only if the Help's described phases are refined;
  do not change the seven pipeline stages to match an arbitrary number of display milestones.
- `generator/task.md`: record the replay redesign in the later-change notes, not a false change to the
  generation algorithm or old historical task cards.

No generated `help-examples.js`, regression fixtures, qualification lists, or screenshots need to change
merely to implement this behavior.

## D5. Focused quick tests for implementation

The research ran no test suites; its direct experiments are documented below.
Future tests should exercise the changed contracts, not force the algorithm to produce a smooth score.

| Quick suite | Focused additions/adjustments |
|---|---|
| `player` | The reported seed; complete swap boundaries; board/mark/counter consistency; no half-swap checkpoints |
| `steps` | Table present at zero and repeated scores; pending/error states; no fake score for an incomplete proof |
| `steps`, `result-view` | Table row totals still sum to true score; final replay equals Summary |
| `player`, `steps` | Greater-Than actual sign sets, reveals, unchanged scores; Samurai global cells |
| `worker` | Analysis after `done`; independent budgets; stale/cancelled jobs cannot modify the next puzzle |
| `pipeline` | Result/log identity with analysis on/off; trace modes and cooperative scheduling unchanged |
| `cache`, `history`, `export` | Same keys/schema/puzzle bytes; cache-regenerated replay also gets analysis |
| `help`, `i18n` | Updated guide/help facts and both languages of all shown strings |
| `ui-contract`, `purity` | Script order and no DOM/storage access in a pure generator analysis module |

The current tests deliberately assert the old split:
`generator/tests/suites/player.test.js:334–376`.
Update the **display contract** to complete moves while retaining independent checks that raw log
operations are faithful. Do not weaken uniqueness, final-board, score, or regression assertions.

Existing table tests are at `generator/tests/suites/steps.test.js:270–385`.
Use an injected/fake budget for timeout behavior, not real sleeps or expensive puzzles.

Example targeted command when the affected code exists:

```powershell
Set-Location generator   # from the repository root
node tests\node-runner.js --suite=player,steps,worker,pipeline,cache,history,export,help,i18n,ui-contract,purity
```

Run only changed-area quick selectors while working, then the generator quick set as appropriate.
No `--all`, `--manual`, soak, perf, qualify, hash updates, browser scripts, or `SG_DEEP=1` are needed.

## D6. Risks and safeguards

1. **Mislabeling smoothing:** an interpolated value is not a difficulty score. Preserve the formula and
   the provenance of every number.
2. **Losing the original story:** summary omissions and illustrative paths must be labeled.
   Do not silently sort chronological boards by score.
3. **Wrong model for signs/cages:** identical givens do not identify a puzzle when its constraints differ.
4. **Reentrancy:** no explanatory solve may run on a live generation model between yields.
5. **New generator work:** extra ratings must not consume deterministic caps, generation budgets, or RNG state.
6. **Async races:** use puzzle/session identities, cancellation, and immutable snapshots.
7. **Slow devices:** Node timings do not establish browser responsiveness; retain pending/retry states.
8. **Incorrect caching:** a timeout is retryable, and same score does not mean same count map or board.
9. **Plan changes during reading:** preserve selected checkpoint/focus rather than resetting to the end.
10. **Unrated does not mean hardest:** never classify partial work or a non-unique trial as a high-level puzzle.

# Decisions for the user

| Decision | Recommendation |
|---|---|
| Must the score describe the board, or may it be a smoothed presentation number? | **Resolved by the 13:54 decision:** retain true scores; unavoidable jumps are acceptable. |
| Is roughly geometric growth a preference or an unconditional promise? | **Resolved at 13:54:** first improve grouping/splitting; accept a remaining genuine jump and explain why in the UI. |
| Must a surviving genuine jump have a visible explanation? | **Resolved at 13:54: yes, mandatory.** Explain the changed proof/technique and clue or constraint change, not just the numerical difference. |
| Should a local-search swap be one displayed step? | **Yes.** This removes the example's ambiguity and artificial overshoot without changing generation. |
| Must "always a table" also mean a numeric score for genuinely unrated states? | **Always a table/status, not a fabricated number.** Prefer rated complete-move checkpoints in the default view. |
| How much replay detail should be shown? | **Compact milestones plus optional complete-move details**, initially aiming at 8–12 total steps where meaningful. |
| Where should ratings run? | **Post-generation worker analysis**, independent budget; scheduled fallback for `file://`. |
| Should replay data persist or change puzzle formats? | **No, initially.** Derived in-memory sidecar; unchanged cache keys, history, exports, and rating version. |
| Should downward tuning be hidden? | **Only summarized in a labeled interval.** Keep true decreases available in details. |
| If a smooth geometric number is mandatory, what changes? | **Resolved—not required after 13:54.** No synthetic progress number is needed to satisfy the revised requirement. |
| Should a different illustrative puzzle ladder replace actual replay? | **No by default.** It changes the explanation's meaning, restores many clues, costs more, and still has gaps. |

The recommended default throughout this research is the truthful, complete-move design.
The incompatibility of guaranteed smooth real scores is not left for an implementation to conceal.

# Appendix — Experiments, raw evidence, and repository state

## E1. Location and scripts

All scripts and raw outputs are in the researcher's experiment folder `E\` (`experiments\gpt-6-astra\` in the
session folder of the orchestrating agent), which is **not part of the repository**; the report quotes every
number it relies on.

| Script | Purpose |
|---|---|
| `load.cjs` | Read-only classic-script loader; store request conversion; serialization/fingerprints |
| `trace.cjs` | Actual replay API, unlimited ratings, uniqueness, timings, wire/log size |
| `sample.cjs` | The 25-request bounded matrix, one isolated process per request |
| `prototype.cjs` | Atomic checkpoints, log-target selection, bounded reverse clue-superset reconstruction |
| `gap-probe.cjs` | Split the example's jump; examine all one-cell and one-group final-clue additions |
| `ladder.cjs` | Separate illustrative puzzles from the same solution; final result never replaced |
| `summarize.cjs` | Aggregate tables, ratios, quantiles, sizes, and prototype sequences |
| `verify.cjs` | Independent atomic re-rating/uniqueness; puzzle/cache/history/export identity; trace-mode comparison |

Additional raw outputs:

- `example.wire.json`, `example.events.json`, `example.trace.json`, `example-details.txt`.
- Each sample prefix's `.wire.json`, `.events.json`, `.trace.json`, `.stdout.txt`, `.stderr.txt`.
- `sample.json`, `aggregate.json`, `summary.txt`, `decreases.txt`.
- Each prefix's `.prototype.json`, `prototype-summary.json`, `prototypes.stdout.txt`.
- `gap-probe.json`, `gap-probe.stdout.txt`.
- `ladder-summary.json` from the first 8-trial experiment; `.ladder.json` files from that run.
- `ladder-summary-64.json`, `.ladder-64.json` files, `ladder-64.stdout.txt`.
- `verification.json`, `verification.stdout.txt`, `extra-measurements.json`.

There are no dependencies to install and no network calls.

## E2. Re-run commands

Run from the experiment folder `E\` (not part of the repository):

```powershell
Set-Location <E>   # the experiment folder of gpt-6-astra

node .\trace.cjs classic9 expert 3275974478 example --unique
node .\sample.cjs
$prefixes = (Get-Content '.\sample.json' -Raw | ConvertFrom-Json).prefix
node .\prototype.cjs example $prefixes
node .\gap-probe.cjs
node .\summarize.cjs
node .\verify.cjs

$env:LADDER_TRIALS = '64'
node .\ladder.cjs example classic9-expert-42 killer-expert-42 samurai-expert-42 `
  greaterThan-expert-42 jigsaw9-expert-42
Remove-Item Env:\LADDER_TRIALS
```

`trace.cjs ... --reuse` reuses the saved wire result for rating-only inspection.
Timings will vary; puzzle identity and complete ratings should not.
The supplied scripts write only to their working directory, so keep that directory outside the repository.

## E3. Raw true-score sequences of the 25-request sample

These are **unlimited ratings**, not necessarily tables the current page shows.
They include zero-score setup/structure and duplicate final verification.

```text
classic9 / veryEasy / 1:
0,18,29,37,42,43,43
classic9 / veryEasy / 42:
0,18,29,37,41,42,42
classic9 / expert / 1:
0,18,29,37,41,44,45,46,47,48,585,1283,987,987
classic9 / expert / 42:
0,18,29,37,41,44,45,46,927,928,928
classic9 / nightmare / 42:
0,18,28,36,41,44,870,1234,1570,1571,1572,1572

killer / veryEasy / 1:
0,0,18,29,37,42,43,43
killer / veryEasy / 42:
0,0,18,29,37,41,42,42
killer / expert / 1:
0,0,18,29,37,42,44,103,131,140,146,150,154,160,164,165,166,166,167,170,304,787,798,798
killer / expert / 42:
0,0,18,29,37,42,44,127,135,141,144,147,150,153,156,158,160,161,163,165,168,170,555,599,595,836,836
killer / nightmare / 42:
0,0,18,29,37,96,98,116,132,137,144,148,151,154,160,162,164,165,165,168,529,568,607,2997,2780,2788,1940,1940

samurai / veryEasy / 1:
0,43,44,44
samurai / veryEasy / 42:
0,43,44,44
samurai / expert / 1:
0,43,57,63,67,70,71,137,673,692,713,755,741,741
samurai / expert / 42:
0,43,57,63,67,69,70,70,71,72,961,996,997,997
samurai / nightmare / 42:
0,43,57,63,67,69,70,71,72,1485,1619,1621,1637,1637

greaterThan / veryEasy / 1:
0,0,42,42,42,42,42,42,42,42,42,42
greaterThan / veryEasy / 42:
0,0,41,41,41,41,41,41,41,41,41,41
greaterThan / expert / 1:
0,0,269,271,281,277,277,275,276,1086,1067,1053,1053,986,990,990
greaterThan / expert / 42:
0,0,274,271,135,271,270,1039,1065,1109,1104,1109,1032,552,552,1967,1264,1264,250,1017,242,973,973
greaterThan / nightmare / 42:
0,0,159,159,160,142,142,164,2237,2287,2287,2287

jigsaw9 / veryEasy / 1:
0,18,29,37,42,43,43
jigsaw9 / veryEasy / 42:
0,18,29,37,42,43,43
jigsaw9 / expert / 1:
0,18,29,37,42,44,45,46,47,48,49,591,716,716
jigsaw9 / expert / 42:
0,18,29,37,43,44,45,46,48,48,49,613,673,691,718,718
jigsaw9 / nightmare / 42:
0,18,29,37,41,44,45,46,47,48,49,138,1778,2967,1678,1678
```

## E4. Identity verification

`verify.cjs` re-generated the reported seed in four modes and normalized only `config.trace` for comparison:

| Mode | Events observed | Time ms | Same puzzle/model/rating/log/config digest |
|---|---:|---:|---|
| off | 87 | 89.36 | Yes |
| summary | 175 | 70.87 | Yes |
| full | 2308 | 77.59 | Yes |
| cooperative generator driven to completion | 175 | 65.24 | Yes |

All four matched:

```text
d350758d7af16c41f4910469df513f56a7516966407285e1f39d9d983df68f2d
```

This tests the cooperative engine path, **not** a real browser Worker.
The experiment does not claim that timings are bit-identical.

The example cache key is unchanged:

```text
classic9|expert|3275974478|digits|rotational180|random|8|{}
```

Across the **26** analyzed results, verification returned:

```text
atomicStates: 1437
identicalRatings: 1437
unique: 1437
unknown: 0
allPayloadsSame: true
allEndpointsSame: true
allCacheSame: true
allHistorySame: true
allExportsSame: true
```

This is direct experimental evidence that the derived explanation can leave existing puzzle data and
formats untouched. No regression hashes or qualification data were regenerated.

## E5. Repository state and scope compliance

Start command:

```powershell
git --no-pager status --short
```

Start output: **empty** — working tree clean.
The following revision check returned
`8d9510aade5d99f4fec9fda3835245a31f411ede`.

End command:

```powershell
git --no-pager status --short
```

End output:

```text
?? docs/generation-steps/
```

`git --no-pager diff --name-only` returned no tracked-file changes.
The final revision check still returned
`8d9510aade5d99f4fec9fda3835245a31f411ede`.
The untracked directory can also contain reports being written independently in parallel; no other
researcher's report content was inspected.

No application source, tests, fixtures, guides, generated files, or git index state were changed.
All repository writes by this research are confined to this report directory.
The experiments and their raw data are persistent external session artifacts.
No commits, stashes, dependency installs, or prohibited heavy tests were performed.

# Addendum — after the user's decision of 13:54

**Added on 2026-10-28.** This section supplements the independent report above; its earlier findings and
measurements have not been rewritten. Only the resolved entries in **Decisions for the user** were updated.

The user's decision, verbatim:

> chấp nhận các bước điểm nhảy vọt nếu không thể gom/tách step thêm được. Nhưng cần giải thích trong UI lý do
> vì sao điểm tăng vọt để người chơi hiểu.

**Resulting contract:** retain real scores, first remove avoidable jumps through meaningful step grouping
or splitting, and **visibly explain every remaining large jump**. The explanation is part of the step UI,
not merely a Help-page caveat. No interpolation or alternative puzzle ladder is required.

## AD1. When to show the explanation

### A concrete initial trigger

Use the ratings of the **adjacent selected, complete-move checkpoints**, not the previous rating that happened
to be available in the old UI. Proposed defaults:

```text
delta = after.score - before.score

largeIncrease =
  both ratings are complete
  AND before.score > 0
  AND delta >= 100
  AND after.score / before.score >= 1.5
```

These are **proposed presentation thresholds**, not new score rules and not a threshold the user has already
approved. They select a prominent callout without marking every one-point singles increase as a jump.
They flag both requested examples:

- **44 → 551:** delta **+507**, ratio **12.5227**.
- **568 → 992:** delta **+424**, ratio **1.7465**.

Applying this rule to the existing complete-move prototypes for all **26** researched puzzles flagged
**25 increases**. All **25** involved a higher peak weight `P`. This is a useful sanity check, not human
validation of the threshold.

The threshold controls **prominence**, not whether the player can understand a change:

- Every new peak technique gets a small inline reason/new-peak badge, even below the large-jump threshold.
- A large increase with unchanged `P` still gets a callout explaining the changed repeated-work term or
  empty-cell contribution. Do not hard-code "a new technique" as the only possible explanation.
- Equal scores keep the full table and may say "Difficulty unchanged"; no jump callout.
- An unknown preceding rating does not yield a ratio or a guessed comparison. Show the current rating and
  the preceding checkpoint's pending/unavailable status.
- A transition from a full solution's **0** to the first puzzle is labeled **first rated puzzle**, not an
  infinite-ratio jump. Explain its newly introduced technique when relevant.
- Compute the badge from the same rounded scores the user sees, but compute the explanation's formula
  terms from the unrounded `SG.difficulty.breakdown` data.

The implementation must not change this trigger based on CPU time, the requested level, or board size.
Source of the reusable breakdown: `generator/js/engine/difficulty.js:233–272`.

## AD2. First remove avoidable jumps, then state exactly what was checked

The preparation order should be:

1. **Normalize transactions.** Combine a local-search removal and restoration into a complete change.
   Never attempt to smooth the erroneous **568 → 1849 → 992** half-swap trajectory.
2. **Inspect recorded legal boundaries.** For a displayed batch containing several accepted moves, inspect
   the already-rated complete-move checkpoints inside it. Insert useful intermediate checkpoints when they
   reduce the largest real increase. This is chronological selection, not interpolation or sorting by score.
3. **Merge bookkeeping/plateaus where appropriate.** Keep descriptions and counters honest. Combining equal
   or nearly equal scores improves pacing, but hiding the earlier low score is not a solution to a real jump.
4. **Preserve indivisible changes.** A symmetry group or a complete search swap is the smallest normal
   generation move. Do not manufacture a separate accepted generation step inside it.
5. **Optionally strengthen the explanation with a local split diagnostic.** For a small move, rate all subsets
   of its changed clues/constraints and inspect every order/grouping of those changes. These are diagnostic
   counterfactual boards, not a replacement replay or a modification of generation.

For the optional diagnostic, a practical initial limit is **at most 4 changed items**, hence at most
**16 subsets**, including both endpoints. Keep the existing independent rating/uniqueness guards and cancel
between states. For larger batches, use their actual recorded boundaries; do not launch an exponential
search over the whole board.

A finer diagnostic path is useful only if:

- every intermediate is valid, unique, completely rated, and has the correct active constraints;
- it progresses in the intended direction without an intervening overshoot/drop;
- it preserves the before/after boards and has no unverified rating;
- its largest increase is meaningfully smaller, ideally removing the large-increase trigger.

For small moves, form a subset DAG: an edge applies any nonempty group of remaining changes.
Choose a nondecreasing path minimizing the largest adjacent score ratio. This covers both further
**splitting** and regrouping of this move, not just one arbitrary single-cell order.

Use explicit result scopes:

| Diagnostic result | Permitted UI statement |
|---|---|
| All legal recorded boundaries checked; no useful intermediate | "No smaller accepted generation step removes this jump." |
| Every local subset/grouping checked; all still contain a large increase | "Splitting this change still leaves a large increase." |
| Only the atomic generation boundary is known | "This is one complete clue exchange/symmetry group." |
| A probe timed out, was incomplete, or was capped | "A smoother rated subdivision has not been verified." |

Never infer impossibility from a timeout, and never claim that all possible clue-removal orders across the
entire generation were searched. The scope is **this recorded change and these unchanged endpoints**.
The reason for the score increase can be shown immediately from the known ratings, even while the optional
diagnostic is pending.

## AD3. New local probes: both example jumps remain genuine

`E\jump-addendum.cjs` used the stored result read-only, compared actual adjacent endpoints, enumerated local
subsets, and ran independent uniqueness/rating checks. The final puzzle digest remained unchanged.

### 44 → 551: old steps 6 → 7

The removed symmetry pair is:

- **R1C2 = 3**, cell ID **1**;
- **R9C8 = 1**, cell ID **79**.

All **4 subset boards** are unique and completely rated:

| Subdivision from the step-6 board | Score |
|---|---:|
| No removal | 44 |
| Remove R1C2 only | 550 |
| Remove R9C8 only | 44 |
| Remove both | 551 |

Both single-cell orders and all **3 nondecreasing grouped paths** contain a large increase under AD1.
The best diagnostic path is **44 → 550 → 551**, whose largest ratio is **12.5**.
The alternative is **44 → 44 → 551**.

Thus a split can shave **one point** off the largest increase but cannot provide a middle difficulty such
as **100 or 300**. Preserve the symmetric move; explain that **removing R1C2 alone already scores 550**.
This identifies the locally decisive clue without asserting that this is the only possible human proof.

### 568 → 992: the final complete swap

Compare **old step 18 to old step 20**, not old step 10. Several earlier boards also score 568, but their
technique counts are not identical.
This becomes the **14 → 15** transition in the proposed 16-step complete-move replay.

The swap:

- removes **R4C2 = 7** and **R6C8 = 8**, cell IDs **28,52**;
- restores **R1C8 = 9** and **R9C2 = 9**, cell IDs **7,73**.

All **16 subset boards** are unique and completely rated. Their distinct scores are:

```text
47, 517, 553, 554, 568, 569, 992, 1167, 1680, 1849
```

There is **no intermediate score strictly between 569 and 992** among these subsets.
All **24 single-cell orders** are valid, but **none** is nondecreasing from 568 through to 992.
Allowing arbitrary grouping gives **3 nondecreasing paths**; all retain a large increase.
The best grouped diagnostic is **568 → 569 → 992**, largest ratio **1.7434**.

The best single-cell order if decreases are allowed is:

```text
568 → 569 → 554 → 1167 → 992
```

Its largest increase is **2.1065×**, worse than the complete swap's **1.7465×**.
At symmetry-group granularity, remove-first gives **568 → 1849 → 992**;
restore-first gives **568 → 47 → 992**.

Consequently, showing the complete swap as one step is both faithful and clearer.
The **+424** increase still needs an explanation, but the **1849** board is not a normal replay checkpoint.

These exhaustive statements are local to the changed clues. They do not claim that a different generated
puzzle or a different full generation order could not have intermediate scores.

## AD4. Explain the changed proof and the actual formula

An annotation is derived from:

- the before/after rating count maps and empties;
- the actual removed/restored clues or changed constraints;
- `SG.difficulty.breakdown` for both boards;
- optional subdivision evidence.

The comparison data must distinguish:

1. **Peak change:** the hardest technique used has a different weight.
2. **Work change:** `W = sum(weight × uses)` changed.
3. **Empty-cell change:** `E`, and hence `V`, changed.
4. **Combined effect on `R`:** `R` depends on **both P and W**.

Do not treat `delta W` as a directly additive score contribution.
The exact additive comparison is:

```text
delta V = Vafter - Vbefore
delta P = Pafter - Pbefore
delta R = Rafter - Rbefore

visible delta =
  round(Vafter + Pafter + Rafter) - round(Vbefore + Pbefore + Rbefore)
```

Do **not** substitute `round(delta V + delta P + delta R)` in general: rounding the two endpoint totals
and rounding their difference can disagree.
The existing table apportionment remains unchanged.

### Formula evidence for the two jumps

| Term | 44 → 551: before | After | 568 → 992: before | After |
|---|---:|---:|---:|---:|
| Empty cells E | 43 | 45 | 51 | 51 |
| Peak weight P | 1 | 360 | 360 | 750 |
| Weighted work W | 43 | 768.25 | 906.75 | 806.75 |
| Empty-cell term V | 41.4458 | 42.3529 | 44.8352 | 44.8352 |
| Repeated-work term R | 1.3649 | 148.3216 | 163.3557 | 197.5453 |
| Unrounded total | 43.8106 | 550.6746 | 568.1908 | 992.3804 |
| Displayed total | 44 | 551 | 568 | 992 |

For **44 → 551**:

- Before: **43 Naked Singles**.
- After: **32 Naked Singles, 13 Hidden Singles in boxes, 2 Simple Colouring applications**.
- Peak term: **+359**.
- Repeated-work term: **+146.9568**.
- Empty-cell term: only **+0.9072**, despite the visible two-clue removal.
- Therefore the explanation should emphasize **Simple Colouring's weight 360**, not "more empty cells".
- Its **2 uses** contribute **720 to W**, not 720 directly to the score.

For **568 → 992**:

- Before: **28 Naked Singles, 23 Hidden Singles in boxes, 2 Pointing, 1 Box/Line,
  2 Simple Colouring**.
- After: **29 Naked Singles, 21 Hidden Singles in boxes, 1 Hidden Single in a line, 1 XYZ-Wing**.
- Peak term: **+390**, from **360 to 750**.
- Repeated-work term: **+34.1896**.
- Empty-cell term: **0 change**.
- Weighted work actually **decreases by 100**, from **906.75 to 806.75**.
- The score rises because the proof uses a more expensive peak technique; a generic
  "there is more solving work" explanation would be **wrong**.

### What "needed" means

Use "the logical solution now uses…" in the main UI. These counts describe the generator's fixed logical
solver, not a proof that every human must use this exact named technique.

As an additional diagnostic, this experiment tried all applicable techniques with weights strictly below
the new peak. The solver was **stuck below 360** for the step-7 board and **stuck below 750** for the final
swap board. This supports the wording within the current solver, but is not a mathematical theorem about
all alternative Sudoku proofs.

Optional witness data was also collected:

- The first Simple Colouring use concerns **digit 3** and eliminates 3 from **R5C2 and R8C3**.
- The XYZ-Wing uses **R6C3** as pivot, **R4C1 and R6C6** as pincers, and eliminates **3 from R6C2**.

Those patterns occur **later in the logical solve**, after other deductions.
Do not highlight their candidate pattern on the initial replay board as if it were already present.
The normal replay highlights the changed clues; a separate technique detail may show a correctly
reconstructed proof state or the existing Help explanation.

## AD5. Concrete UI placement

### Step description: the reason is visible, not tooltip-only

Immediately after the operation sentence, above the score table, show a compact information callout:

```text
Why the score increased: 44 → 551 (+507)
The logical solution now uses Simple Colouring (weight 360; uses: 2).
The two extra empty cells add only about 0.91 points.
[Why this change?]
```

The removed/restored clue list belongs to the operation sentence and can be repeated or linked in the
expanded explanation. A zero-technique setup, an unchanged score, or an unknown rating retains the table
states already proposed in Part C.

### Score table: emphasize the cause without changing its numbers

- Add a text badge such as **New hardest technique** to the Simple Colouring or XYZ-Wing row.
- Use a token-based emphasis/border, not color alone. Associate the row and callout with
  `aria-describedby`.
- If `P` is unchanged and repeated work explains a large rise, emphasize the affected uses/work rows
  instead; do not falsely mark an already-present peak as newly introduced.
- If the earlier hardest technique is absent from the new proof, name it in the comparison callout.
  Do not add a fake current-table row with its old count.
- Keep every score-table subtotal and the Total derived from `SG.difficulty.scoreTable`.
  The new annotation is explanation, not an extra scoring row.

### Existing help icon / expandable detail

The Total's current formula tooltip can include a **Before / After / Change** comparison of `E,P,W,V,R`.
Reuse `SG.stepView.scoreTip` and existing formula/rounding wording where possible.
Sources: `generator/js/ui/step-view.js:76–127,394–406,415–497`.

The same information must be available from a keyboard/click-accessible **Why this change?** disclosure,
not hover alone. Include:

- the exact changed clue/constraint list;
- the new hardest technique and its weight/use count;
- how the `V`, `P`, and `R` changes account for the score difference;
- the local subdivision result and its scope;
- the current solver's proof-scope caveat.

Do not open a modal automatically, steal focus, animate the number through fictitious scores, or reset the
replay position when the optional diagnostic arrives.

## AD6. English/Vietnamese text and proposed i18n keys

All strings below are proposed entries in the generator's bilingual fragments and are shown through
`SG.i18n.t()`. Technique names reuse `technique.<id>`; clue labels use the existing cell/symbol labelers.
Numbers use `SG.i18n.formatNumber`, including Vietnamese decimal formatting.
No technique name or English sentence is assembled directly in rendering code.

### Shared keys

**`steps.jump.heading`**

- EN: `Why the score increased: {before} → {after} ({delta})`
- VI: `Vì sao điểm tăng: {before} → {after} ({delta})`

**`steps.jump.peak`**

- EN: `The logical solution now uses {technique} (weight {weight}; uses: {uses}).`
- VI: `Lời giải logic hiện dùng {technique} (trọng số {weight}; số lần dùng: {uses}).`

**`steps.jump.peakChange`**

- EN: `The hardest-technique weight changes from {before} to {after}.`
- VI: `Trọng số của kỹ thuật khó nhất đổi từ {before} lên {after}.`

**`steps.jump.peakReplaced`**

- EN: `The hardest technique changes from {beforeTechnique} ({beforeWeight}) to {afterTechnique} ({afterWeight}).`
- VI: `Kỹ thuật khó nhất đổi từ {beforeTechnique} ({beforeWeight}) sang {afterTechnique} ({afterWeight}).`

**`steps.jump.contributions`**

- EN: `Peak term: {deltaP}; repeated-work term: {deltaR}; empty-cell term: {deltaV}.`
- VI: `Phần kỹ thuật khó nhất: {deltaP}; phần khối lượng: {deltaR}; phần ô trống: {deltaV}.`

**`steps.jump.firstPuzzle`**

- EN: `This is the first puzzle with empty cells in this replay.`
- VI: `Đây là đề có ô trống đầu tiên trong phần phát lại này.`

**`steps.jump.clue`**

- EN: `{symbol} at {cell}`
- VI: `{symbol} ở {cell}`

**`steps.jump.removed`**

- EN: `Removed clues: {clues}.`
- VI: `Các số cho sẵn đã bỏ: {clues}.`

**`steps.jump.exchanged`**

- EN: `Removed {removed}; restored {added}. The complete exchange is one move.`
- VI: `Bỏ {removed}; thêm lại {added}. Cả lần đổi này là một bước.`

**`steps.jump.empties`**

- EN: `Empty cells: {before} → {after}; their score contribution changes by {delta}.`
- VI: `Ô trống: {before} → {after}; phần điểm từ ô trống thay đổi {delta}.`

**`steps.jump.emptiesUnchanged`**

- EN: `There are still {count} empty cells; they do not explain this increase.`
- VI: `Vẫn có {count} ô trống; điểm tăng không phải do số ô trống.`

**`steps.jump.workDecreased`**

- EN: `Weighted work fell from {before} to {after}, but the repeated-work term rose because P is higher.`
- VI: `Khối lượng có trọng số giảm từ {before} xuống {after}, nhưng phần điểm khối lượng tăng do P lớn hơn.`

**`steps.jump.workIncreased`** — only when the compared data actually supports this cause:

- EN: `The hardest weight is unchanged; the solution uses the techniques more often.`
- VI: `Trọng số lớn nhất không đổi; lời giải dùng các kỹ thuật nhiều lần hơn.`

**`steps.jump.splitChecked`**

- EN: `Every subdivision of this change was checked; a large increase remains.`
- VI: `Đã kiểm tra mọi cách chia nhỏ thay đổi này; vẫn còn một lần tăng điểm mạnh.`

**`steps.jump.splitLimited`**

- EN: `A smoother rated subdivision has not been verified.`
- VI: `Chưa xác nhận được cách chia nhỏ có điểm tăng đều hơn.`

**`steps.jump.splitWitness`**

- EN: `Removing {clue} alone already gives a score of {score}.`
- VI: `Chỉ bỏ {clue} cũng đã khiến điểm lên {score}.`

**`steps.jump.proofScope`**

- EN: `This describes the generator's logical solution, not every possible way a person could solve the puzzle.`
- VI: `Đây là lời giải logic của trình tạo đề, không phải mọi cách giải mà người chơi có thể dùng.`

**`steps.jump.newPeak`**

- EN: `New hardest technique`
- VI: `Kỹ thuật khó nhất mới`

**`steps.jump.more`**

- EN: `Why this change?`
- VI: `Vì sao có thay đổi này?`

**`steps.jump.signsRemoved`**

- EN: `Removed inequality constraints: {signs}.`
- VI: `Các ràng buộc bất đẳng thức đã bỏ: {signs}.`

**`steps.jump.constraintProof`**

- EN: `The number of empty cells is unchanged; the altered constraints change the logical proof.`
- VI: `Số ô trống không đổi; các ràng buộc đã thay đổi làm lời giải logic thay đổi.`

**`steps.drop.heading`**

- EN: `Why the score decreased: {before} → {after} ({delta})`
- VI: `Vì sao điểm giảm: {before} → {after} ({delta})`

**`steps.drop.refinement`**

- EN: `Clues were restored during tuning; the new logical solution has the lower score shown here.`
- VI: `Một số số cho sẵn được thêm lại khi điều chỉnh; lời giải logic mới có điểm thấp hơn như bảng này.`

**`steps.drop.proofChanged`**

- EN: `The changed puzzle has a different logical solution; fewer clues do not always mean a higher score.`
- VI: `Đề sau thay đổi có lời giải logic khác; ít số cho sẵn hơn không phải lúc nào cũng có điểm cao hơn.`

The `splitChecked` wording is used **only** after a complete local diagnostic, with the AD2 scope stated in
details. The normal atomic-boundary sentence and pending states can reuse the replay/status keys already
proposed in the main report. Existing formula labels need not be duplicated.

### Rendered example: step 7, 44 → 551

**English**

> **Why the score increased: 44 → 551 (+507)**  
> Removed clues: 3 at R1C2 and 1 at R9C8. The logical solution now uses Simple Colouring
> (weight 360; uses: 2). The hardest-technique weight rises from 1 to 360; the two extra empty cells
> add only about 0.91 points. Removing 3 at R1C2 alone already scores 550, so splitting the pair
> does not remove the large increase.

**Vietnamese**

> **Vì sao điểm tăng: 44 → 551 (+507)**  
> Bỏ số 3 ở R1C2 và số 1 ở R9C8. Lời giải logic hiện dùng Tô màu đơn giản (Simple Colouring)
> (trọng số 360; số lần dùng: 2). Trọng số của kỹ thuật khó nhất tăng từ 1 lên 360; hai ô trống
> thêm vào chỉ đóng góp khoảng 0,91 điểm. Chỉ bỏ số 3 ở R1C2 cũng đã khiến điểm lên 550,
> nên tách cặp này vẫn không loại bỏ được lần tăng mạnh.

The collapsed callout can show its first two explanatory sentences; the subdivision witness and
`V/P/R` arithmetic stay in the disclosure. The explanation itself must not be hidden entirely there.

### Rendered example: completed swap, 568 → 992

**English**

> **Why the score increased: 568 → 992 (+424)**  
> Removed 7 at R4C2 and 8 at R6C8; restored 9 at R1C8 and 9 at R9C2. The complete exchange is one move.
> Its logical solution now uses XYZ-Wing (weight 750; uses: 1), instead of Simple Colouring as its
> hardest technique (weight 360). There are still 51 empty cells. The higher peak contributes 390
> additional points, and the repeated-work term rises by about 34.19 points.

**Vietnamese**

> **Vì sao điểm tăng: 568 → 992 (+424)**  
> Bỏ số 7 ở R4C2 và số 8 ở R6C8; thêm lại số 9 ở R1C8 và số 9 ở R9C2. Cả lần đổi này là một bước.
> Lời giải logic mới dùng XYZ-Wing (trọng số 750; số lần dùng: 1) làm kỹ thuật khó nhất,
> thay cho Tô màu đơn giản (Simple Colouring), trọng số 360. Vẫn có 51 ô trống.
> Phần kỹ thuật khó nhất tăng 390 điểm, còn phần khối lượng trong công thức tăng khoảng 34,19 điểm.

Expanded detail adds:

- EN: `Weighted work fell from 906.75 to 806.75; R nevertheless rose because its formula also uses P.`
- VI: `Khối lượng có trọng số giảm từ 906,75 xuống 806,75; R vẫn tăng vì công thức của R còn phụ thuộc vào P.`

These examples are composed from the proposed generic keys and existing formula/technique labels;
the literal seed and numbers are not translation keys or hard-coded UI cases.
Use the existing canonical names:
`generator/js/ui/locale.en.js:321,331` and `generator/js/ui/locale.vi.js:316,326`.

## AD7. Killer, Greater-Than, multigrid, and score decreases

### Killer

The same comparison applies to cage techniques and ordinary techniques. If the peak changes to Rule of 45
or Cage Splitting, name that technique and its weight, not "fewer clues" alone.
Show the changed clue cells and, if a genuine structure-changing checkpoint exists, the affected cage
identities/sums. Do not infer a cage-layout change from a cell-only log.
The full solution and initial cage display both retain their valid zero-score tables.

### Greater-Than

Compare ratings against each endpoint's actual active sign set.
Use the logged ordered endpoints to identify removed inequalities, and highlight those signs.
An explanatory sentence may be:

```text
Removed inequality constraints: R2C3 < R2C4.
The number of empty cells is unchanged; the altered constraints change the logical proof.
```

The sign text uses `steps.jump.signsRemoved`; the second sentence uses `steps.jump.constraintProof`,
not an English-only variant special case.
Do not say that clues were removed when only signs changed.
For local diagnostics, each subset rebuilds its model with `SG.greaterThan.withSigns`.

### Multigrids and irregular layouts

Use global cell IDs and the existing model cell labeler. Count an overlapping cell once.
The peak and work are for the complete board, not five separate Samurai scores.
When a big display batch hides several complete removals, use those existing boundaries before concluding
that a jump is indivisible. A many-cell batch does not justify a many-cell exponential counterfactual search.

### Refinement and decreases

A corresponding prominent drop callout can use the mirrored trigger:

```text
both ratings complete
AND after.score > 0
AND before.score - after.score >= 100
AND before.score / after.score >= 1.5
```

However, **every actual refinement/reveal keeps its operation explanation**, even for a smaller decrease.
The trigger only decides whether to promote the explanation to a large-change callout.

- If restored clues remove a high-weight technique from the proof, name that change and compare `P/W/E`.
- If `P` is unchanged, explain the actual smaller repeated-work or empty-cell term.
- If removing clues/signs lowers the score, say the selected logical proof changed. Do not label it an error.
- If restoration raises the score, do not use `steps.drop.refinement`: retain a neutral tuning sentence
  and show the actual positive delta.
- In the measured Killer refinement **2780 → 2788**, the score rose despite restored clues.
  The sentence must follow the computed comparison, not assume a direction from the operation kind.
- A return to a filled board is a reset/restart explanation, not a divide-by-zero ratio.

The new explanation must not turn a genuine downward tuning interval into an upward-only fictitious curve.

## AD8. Cost and data contract

### Normal callout

Rendering the cause requires **no new logical solve** once before/after ratings exist:
it compares existing count maps and reuses their score breakdowns.
The current catalogue has **26 techniques**; this is small table-data work, not an engine search.
Language changes, hovering a help icon, or revisiting a prepared step must not rerun the rater.

An optional compact annotation can contain:

```text
before/after checkpoint IDs
score, E, P, W, R pairs
old/new peak technique IDs
removed/added cell or sign IDs
boundary type
diagnostic scope/status, best checked score sequence
```

The prototype serialized the two annotations in **336 B** and **389 B**, respectively.
They contain no translated strings or whole proof-state snapshots.
Persistent cache/history/export growth remains **0 B** with the recommended in-memory sidecar.
No generator setting, RNG, rating weight, regression hash, or qualification input changes.

### Optional worker diagnostics

Observed times for the final addendum run:

| Work | 44 → 551 | 568 → 992 |
|---|---:|---:|
| Subsets checked, endpoints included | 4 | 16 |
| Unique and completely rated subsets | 4 | 16 |
| Subset rating/uniqueness time | 10.290 ms | 32.395 ms |
| Largest rating budget-check count | 419 | 1911 |
| Collecting the complete proof for a witness | 1.097 ms | 0.287 ms |
| Lower-weight-only solver diagnostic | 0.319 ms | 0.265 ms |

These were fresh postprocessing measurements, not browser performance promises.
The prototype rerated endpoints; production can reuse them, leaving at most **2** and **14** extra subset
boards in these cases. Also reuse already-prepared interior checkpoint ratings.

Diagnostics stay off the UI thread, run only after the final result is fixed, use independent guards, and
are cancellable between candidate states. Their cap/failure state affects only the wording of subdivision
evidence, never the truth of the score explanation or the final puzzle.
Collect full proof steps only on demand; the basic callout needs technique counts, not a full solution trace.

## AD9. Focused quick tests and verification

Recommended additions to the existing quick suites:

1. **`player` / `steps`: reported seed.** The complete swap has before **568**, after **992**, and no
   standalone **1849** normal checkpoint. Both real increases get visible explanations.
2. **`steps`: correct cause, not just a badge.** For step 7, the callout names Simple Colouring,
   weight **360**, uses **2**, and the changed clue cells. Its new-peak row is associated with that text.
3. **`steps`: same empties, less work, higher score.** The final swap uses the adjacent old-step-18 counts:
   `E=51` on both sides, `W=906.75 → 806.75`, `P=360 → 750`.
   It must not say there are more empty cells or greater weighted work.
4. **Pure comparison tests:** positive threshold boundary, a smaller ordinary increase, equal scores,
   unknown predecessor, zero-to-first-puzzle, a genuine drop, and the sum/rounding convention.
   No division by zero or comparison against an unlabeled older known step.
5. **Planner/diagnostic tests:** both local subset probes retain a large increase; useful recorded
   intermediates are selected when supplied. A timed-out/unrated probe must never produce `splitChecked`.
6. **`steps` / `i18n`: both languages.** Headline, reason, changed clues, new-peak badge, disclosure,
   proof-scope caveat, and drop text have translations and accessible associations.
   Localized number formatting does not alter numerical scores.
7. **`player`: variant constraints.** Greater-Than uses actual alive signs; Killer uses actual cages;
   Samurai overlap IDs are not counted twice. A sign-only change does not claim a clue removal.
8. **`steps`: direction is data-driven.** A clue restoration that increases the score does not render
   a decrease explanation; a removal that decreases it does not claim the score must rise.
9. **`worker` / `cache` as needed:** stale diagnostic replies cannot annotate another puzzle.
   Rendering or locale changes consume **zero** new solver calls when the plan is prepared.
10. **`pipeline` / `export` / `history` as needed:** analysis on/off preserves the original puzzle and
    result serialization. Do not regenerate or modify regression fixtures.

Use the existing fake DOM, clocks, and injected rating/budget seams; do not add real-time sleeps or heavy
generation loops merely to test these UI states.
The narrow initial command for the UI implementation is:

```powershell
Set-Location generator   # from the repository root
node tests\node-runner.js --suite=player,steps,i18n
```

Add worker/cache/other quick selectors only when those modules are changed.
No heavy test suite is needed for this feature.

### Addendum experiment and preservation checks

New external files:

- `E\jump-addendum.cjs`: subset/grouping probes, exact formula comparisons, proof witnesses, trigger scan.
- `E\jump-addendum.json` and `E\jump-addendum.stdout.txt`: raw evidence.
- `E\addendum-before.json`: hashes protecting the earlier report text outside the Decisions section.

Re-run:

```powershell
Set-Location <E>   # the experiment folder of gpt-6-astra (not part of the repository)
node .\jump-addendum.cjs
```

The before/after puzzle digest is still:

```text
d350758d7af16c41f4910469df513f56a7516966407285e1f39d9d983df68f2d
```

This addendum changed no application code and ran no test suite.
The other researcher's folders remain unread.
Start `git --no-pager status --short` output for the addendum:

```text
?? docs/generation-steps/
```

Final validation confirmed:

- the earlier independent report body, before the Decisions section, is byte-identical;
- the earlier Appendix is unchanged, ignoring only trailing blank space at the append boundary;
- all **24** proposed i18n key blocks have both English and Vietnamese text;
- all **20** diagnostic subset boards are unique and completely rated;
- the original puzzle digest is unchanged;
- the report has consistent **CRLF** line endings, with no bare LF/CR.

End `git --no-pager status --short` output for the addendum:

```text
?? docs/generation-steps/
```

`git --no-pager diff --name-only` returned no tracked-file changes.
HEAD remains `8d9510aade5d99f4fec9fda3835245a31f411ede`.
