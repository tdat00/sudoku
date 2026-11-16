# MS11a pre-E record (Unique Rectangle types 3 and 4)

Developer agent claude-sonnet-5.5, branch `rating-v3`, base commit `dadd747` (MS10b accepted), working tree not staged or committed.
Start 2026-11-16T11:37:55+07:00. This file records the state at the stop before E (QUESTION to SA2); the final `evidence.md` replaces it.
The bytes below were **not** frozen: the freeze is part of E and waits for the ruling.

**After SA2's ruling (cap lifted, 2026-11-16 13:08):** this file is history. `pattern-cost`, `work-census`, `structural-max` and `rated-effect` were renamed
with the suffix `-cap3` (the preliminary measurements of the cap-3 source) and measured again on the corrected source; `mutations-1.txt` to `mutations-4.txt`
are the 89 mutations of the cap-3 source, `mutations-corrected-1.txt` to `-5.txt` those of the corrected one. The reach statement below is corrected: the new
types 3 and 4 are (146 + 332) / 5,118 = 9.34 %; the 20.0 % includes all four types.

**Lock.** Every command that could take over about 10 s ran through `Invoke-Dv3Node` (`invoke-dv3node.ps1`, byte-equal to the check-list block,
SHA-256 `FC7298D3...951D`), one command per lock, through `run-locked.ps1` (15 s fairness gap, `lock-log.jsonl`). Short commands of a measured duration
under 10 s ran without the lock (vector smoke, the plan writers, the format check, the manual-difficulty pure check).

## What exists

- Engine: `uniqueRectangle` in `core/js/engine/tech-wing.js` (id, order 180, weight 900, base cost 66, `assumesUniqueness: true` all unchanged). The old
  finder is kept as the first pass (types 1 and 2, over every rectangle, unbounded, its own `ctx.check()` every 64 rectangles); only when it finds nothing
  does the bounded second pass run, rectangle by rectangle in the same order. A rectangle qualifies when exactly two corners (the floors) hold exactly the
  pair {X, Y} (the AND of the four candidate sets) and the other two (the roofs) are proper supersets; the extras E are the roofs' candidates outside the pair.
  - Type 3: in any unit that holds both roofs (ascending unit index), k = max(1, |E| - 1) .. 3 other open cells (the real cells, subsets in ascending
    cell order, size first) whose candidates with E are exactly k + 1 digits D; D leaves every other open cell of the unit (the roofs and the real cells
    keep theirs). Findings: `cells` = the four rectangle cells in rectangle order, then the real cells ascending; eliminations cell then digit ascending.
  - Type 4: in a complete unit that holds both roofs (ascending), the digit L of the pair (low to high) whose only holders are the two roofs; the other digit
    leaves both roofs.
  - Work: 50,000 per call (`SG.wingSearch.UNIQUE_RECTANGLE_WORK_LIMIT`, seam `SG.wingSearch.uniqueRectangle`), one unit = one tested pool cell (type 3) or
    one tested digit (type 4), entry check and at most 256 units between parent-budget checks, `capHit: 'work'`, per-call observer
    `{ id: 'uniqueRectangle', work, limit, capHit, retained: null }` emitted only for a call that runs the second pass.
  - Keys: `technique.uniqueRectangle.type3.step` (args `roof1`, `roof2`, `digits`, `partDigits`, `cells`, `unit`) and `.type4.step` (`roof1`, `roof2`, `digits`,
    `digit`, `unit`), EN and VI in both apps.
- Tests: `core/tests/suites/tech-wing.test.js` 319 to 387 tests (independent enumeration `urRectangles`/`urSubtypesOf`/`urExpectedFinding`, unit-shape,
  real-position, work/budget/cancellation and agreement describes); fixtures `CURRENT.uniqueRectangle` (four real positives, types 3, 4, 1, 2, at the position
  where the registry reaches it; two negatives) and `SUPPLEMENTS.uniqueRectangle` (three); `techniques.test.js` "replaced" list; render tests in both i18n suites.

## Gates so far

- Generator `tech-wing,techniques,technique-weights,difficulty-floor,tech-chain`: 805 of 805 (`logs/gate-generator-2.txt`, 48.7 s).
- Player `help,help-example-tools,play,i18n,tech-chain,tech-wing,techniques`: 956 of 957 (`logs/gate-player-2.txt`, 26.5 s); the one failure is the `help` replay
  test for `remotePairs` ("expected hiddenSingleBox to be remotePairs"), by design until GH.
- Mutations: 89 mutants (`mutations-1.txt` to `mutations-4.txt`), 86 detected, 3 survivors, all equivalent (#13 guard `popcount(extras) <= UR_MAX_REAL + 1` is
  implied by the start size; #34 and #35 `=== k + 1` after `> k + 1 continue`, a union smaller than k + 1 cannot occur because a smaller subset with a target
  would have fired first).
- Reachability (seed 4242): 30,000 dug positions, 24,882 solved by the 25 techniques below the rectangle, 5,118 open; the first Unique Rectangle Finding of the open
  ones: type 1 452, type 2 95, **type 3 146, type 4 332** (all four types 20.0 % of the open positions; the new types 3 and 4: 478 / 5,118 = 9.34 %). 20,000 complete solves: type 3 in 152 (0.76 %), type 4 in 321 (1.605 %),
  type 1 in 377, type 2 in 81; the Unique Rectangle is the hardest technique in 231 solves. No unsound Finding, no work cap, largest work 94 (`logs/explore-*`).
- Work census (7,168 calls over 5 grids): 6,842 ran the second pass, none capped, largest work 52; mean latency classic9 0.019-0.026 ms (base 0.010-0.014 ms)
  (`work-census.txt`, `work-census-base.txt`). Pattern cost (`pattern-cost.txt`): work 2/9/19/0, p95 <= 0.6 ms. Structural bound: 88,452 on classic9, 5,289,984 on 16
  digits (a crude upper bound, not an observation, `structural-max.txt`); a constructed 16-digit flood row costs 613 units.
- R20 (`rated-effect.txt`): **0 of 26** references change score, level, hardest technique or requiredness (all match `v3Expected`); `escargot` has one type 2 use,
  unchanged.
- Pins preview before E (`logs/pins-preview.txt`, replay, steps, player, cache, worker, pipeline): 679 of 681; the two failures are **G14** only (mega16 Nightmare, seed
  12): same puzzle, 5 of 78 analysis positions differ because the Unique Rectangle now fires (counts with minus without {uniqueRectangle: +1 or +2}, one position boxLine -1;
  scores 1,766 to 1,887, 2,635 to 2,666, 3,675 to 3,688, 3,894 to 3,904, 6,473 to 6,479) (`logs/g-cause-preview-g14.txt`). Cache, pipeline, worker, steps, player pass.
- GH (`logs/gh-check-all-1.txt`, read-only `--check` of all 35, 27 puzzles): **2 of 35 differ**: `remotePairs` (no example found in its 1 source puzzle within 400 hints,
  the first hint at the step is now another technique) and `forcingChainLong` (3 fields: `notes.67` 14 to 6, `notes.69` 7 to 6, `source.step` 27 to 29); `uniqueRectangle`
  matches (its example is a type 1/2 and keeps priority). Nothing was written.
- Format check of the 78 changed or new files: 0 problems (the 110-column limit of the engine files holds).
