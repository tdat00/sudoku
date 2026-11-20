# MS11c pre-E record (preliminary, before the ruling and before E)

Developer agent claude-sonnet-5.5 (role `dev`), branch `rating-v3`, base commit `1d702a5` (MS11b accepted; the tree was
clean at the start), nothing staged or committed. Start 2026-11-16 17:20 (+07:00); this record 18:05. Machine: Windows
x64, Node v26.13.0. Every command over about 10 s ran through `Invoke-Dv3Node` (verbatim helper `invoke-dv3node.ps1`,
byte-equal to the check-list block, SHA-256 `FC7298D3...951D`, equal to MS11b's copy), one command per lock, at least 15 s
apart, logged in `lock-log.jsonl` (11 locked commands so far, 516 node seconds, no lock wait above 0.1 s). Short commands
(under 10 s, measured: the suite runs of `techniques` and `technique-weights`, the manual-pure script, the stuck counts)
ran without the lock. All file changes used the edit and create tools. **The engine bytes are not frozen**: everything
below is on the pre-ruling source and is repeated on the final source after the ruling (`mutations-1.txt` and the `logs/`
below are preliminary history, not final-source validation).

## What is implemented (core/js/engine/tech-wing.js)

- `bugPlusOne` (group `wing`, base cost 72, order 182, weight 920 in `generator/js/engine/difficulty.js`, unscoped,
  `assumesUniqueness: true`), between `uniqueRectangle` (180) and `forcingChain` (190).
- The finder: exactly one open cell T with three candidates and every other open cell with exactly two (a guard that costs
  no work); a model with no cages, no inequalities and only complete units (`ctx.completeUnits`; one partial unit refuses the
  whole model); then the candidates X of T in ascending order: **with X left out of T, every unit of the model** (not only the
  units of T) holds each placed digit in its own solved cell only and every other digit in exactly two cells. The first X
  that passes is placed (at most one can: every other digit of T has one holder fewer than its own removal needs). A digit X
  that is placed in a unit of T is a stale candidate and never qualifies.
- Finding: `cells = [T]`, `placements = [[T, X]]`, no eliminations, key `technique.bugPlusOne.step`, args
  `{ cell: index of T, label: 'R4C7', digit: X }` (the shape of the nishio step, which has `cell`, `label` and `digit`).
- Work (R10): one unit = one cell of one unit tallied under one proposed digit; limit 50,000 per call
  (`SG.wingSearch.BUG_PLUS_ONE_WORK_LIMIT`), local counter, entry check and at most 256 units between checks; a spent limit is
  `null` with `capHit: 'work'`, a spent budget `null` with `capHit: null`; one observer record
  `{ id: 'bugPlusOne', work, limit, capHit, retained }` per call that the uniqueness context does not refuse, published only
  when the call returns normally (none on cancellation or error). `ctx.assumeUniqueness === false` returns `null` with no
  record. The seam is `SG.wingSearch.bugPlusOne(model, state, ctx, { workLimit })`.
- `boundedPass` of the Unique Rectangle dispatcher now takes the record id as its first argument (the two Unique Rectangle
  call sites pass `'uniqueRectangle'`; behaviour unchanged, all 435 earlier wing tests pass).

## Files changed so far

`core/js/engine/tech-wing.js`, `generator/js/engine/difficulty.js` (the weight and two comments), `core/tests/fixtures/techniques.js`
(`REGISTRY_ORDER`, `BELOW_CHAINS` with the new ID, `BELOW_BUG` / `THROUGH_BUG`, `CURRENT.bugPlusOne` with two real positives and two
negatives, three supplements), `core/tests/suites/tech-wing.test.js` (435 to 496 tests), `core/tests/suites/techniques.test.js`
(the counts 30 to 31, the added list, the uniqueness list now exactly `uniqueRectangle,bugPlusOne`, the replaced list),
`generator/tests/suites/technique-weights.test.js` (+1), the manual `difficulty.test.js` (the weight table and the first
techniques of Master, evaluated by script, not run), both `i18n.test.js` (+1 each), the four locale files (name, description,
step), the scratch folders. Designs, guides, `notes.md`, the help example, the quick manifest and the E fixtures are **not yet**
edited (after the ruling; GH and E come first for the generated parts).

## Measurements on the pre-ruling source

| Item | Result |
|---|---|
| Generator focused gate (`logs/gate-generator-1.txt`) | `tech-wing,techniques,technique-weights,difficulty-floor,tech-chain,i18n,pattern-cost-tools,digger-target` 1,115 of 1,116 in 55.3 s; the one failure is the **`digger-target` coverage pin `stuck > 30`** (27 stuck proposals now) |
| Player focused gate (`logs/gate-player-1.txt`) | 1,060 of 1,076: the 16 failures are the missing help example of `bugPlusOne` (`help` 6, `help-example-tools` 10) and the stated count 35 (expected before GH and the count edits) |
| Pin preview (`logs/pin-preview-1.txt`) | `pipeline,cache,worker,steps,replay,mega,player` 789 of 789, 194.6 s: no generation pin of those suites falls |
| Mutants (`mutations-1.txt`) | 67 in `mutations.cjs`: **62 detected, 5 equivalent** (mutations 16 to 20: the count comparison `!==` as `<`, `>` or "or three", and the first or the last digit not checked); argument: in a complete unit whose open cells all hold two candidates, a placed digit has exactly one solved cell and no open holder, so the cells split into the placed ones and U open ones, which give 2U holders to the U unplaced digits; any one comparison then forces every count, and one digit is implied by the others. `logs/equivalence-search.txt`: 850,557 guard-passing random states on classic4 and classic6, 517,182 accepted proposals, 0 disagreements |
| Reach, seed 4242, 30,000 dug puzzles (`logs/explore-dug-4242-30000.txt`) | 25,294 are solved by the techniques below `bugPlusOne`; **62** of the other 4,706 positions are a BUG+1 (0.2 % of the puzzles), the guard passed in exactly 62: all 62 are sound against the unique solution, no capped call, work 243 to 405 |
| Complete solves, seed 4242, 20,000 puzzles (`logs/explore-solves-4242-20000.txt`) | all solved; **98 (0.49 %) use a BUG+1 step**, 43 of them with `bugPlusOne` as the hardest technique; no unsolved trace with the step |
| R20, 26 references (`rated-effect-pre.txt`) | **0 scores, 0 levels, 0 requiredness, 0 hardest-technique and 0 `v3Expected` entries change**: no reference uses a BUG+1 |
| Work census (`work-census.txt`, `.json`) | 7,168 sampled finder calls on the agreement populations: 29 tallied (guard passed), all 29 found, none capped, largest work 288, latency mean 0.0004 to 0.004 ms |
| Structural bound (`structural-max.txt`) | 3 x the sum of the unit sizes: 729 on classic9, 2,304 on 16 digits, 3,645 on Samurai and Flower, far below 50,000; the constructed worst grave of each board costs at most 3,321 |
| Sweeps (`sweep-firings.txt`) | the random states of the shared corpus give no firing at 9, 12 and 16 digits and 4, 3 at 6 digits; the three supplements give the `techniques` sweep its minimum of 3 (an exact fit) |
| `stuck-count.txt` / `stuck-count-base.txt` | base `1d702a5`: 651 scored, **34 stuck**; tree: 659 scored, **27 stuck**; only the pass `['classic9', 'master', 16, true, null]` changes (9 stuck, 22 scored to 2 stuck, 30 scored: BUG+1 finishes the below-chain solve of seven stuck proposals) |
| GH feasibility (`logs/gh-feasibility-1.txt`, read only) | the Player hint replay of the fixture puzzle (seed 4242, index 14; 57 hints, solved) finds `bugPlusOne`; no discovery batch used |
