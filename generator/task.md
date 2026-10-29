# Sudoku Generator — Task Breakdown

> **Note (one repository).** This document describes the app as built when it was a repository of its own, and it is kept as written. The generator and the player now live in one repository: paths such as `js/core/…`, `docs/…` or `tests/harness.js` are in `core/`, `generator/…`, `player/…` or `docs/` — see [where the old paths went](../docs/architecture.md#where-the-old-paths-went).

> **For:** the executing AI agents. **Source document:** [`design.md`](./design.md) — **must be read before starting any task.**
> **Version:** 1.2 · **Total tasks:** 60 cards (the 59 of the combined project + `T-7.8`; `T-7.5` moved to sudoku-player, so 59 are done here) · **Root directory:** `sudoku-generator/` (this repository holds the generator only; the combined project was split, see `T-7.5` and `T-7.8`)
> **Status: all tasks of this repository are done** (per-task status in [Appendix A](#appendix-a--task-summary-table), summary of what shipped and the test counts in [Appendix E](#appendix-e--completion-summary)). `T-7.5` (trial play mode) **moved to the sudoku-player repository**; `T-7.8` (exchange / "Play online") was added here. The task cards below are kept as they were written; only facts that turned out wrong (file ownership, the number of script lists) were corrected, and where the implementation deviated from a card the note is in Appendix A and in [`design.md`](./design.md) §18. This file was translated from the original Vietnamese at the user's request.

---

## 0. Agent instructions (read first)

### 0.1 Golden rules

| # | Rule |
|---|------|
| A1 | **Edit only the files listed under "Owned files" of your task.** If you need to edit another file ⇒ stop and report. |
| A2 | **The API contract in `design.md` section 13 is invariant.** If you want to change a signature ⇒ state it explicitly in the report; never change it on your own. |
| A3 | **`import` / `export` / `require()` are forbidden in `js/`.** Use the IIFE pattern + the `SG` namespace (design.md §2.1). |
| A4 | **`js/core/` and `js/variants/` must never touch the DOM** (`document`, `window`, `localStorage`, `alert`…). |
| A5 | **Every displayed string must go through `SG.i18n.t()`.** Do not hard-code English or Vietnamese in JS/HTML. |
| A6 | **A task is not done until the tests are green.** Run `node tests/node-runner.js` before reporting completion. |
| A7 | **Do not install npm packages.** Do not add a build step. Do not add external libraries. |
| A8 | **Adding a new JS file ⇒ you must register it in all 4 places:** `index.html`, `tests.html` (`SOURCE_FILES`), `js/worker/gen.worker.js` (core, variants and word lists only) and `tests/node-runner.js` (`SOURCE_FILES`, the single source of truth). `ui-contract.test.js` fails when they drift apart. |
| A9 | Code comments are written in **English**; UI strings exist in both `en` and `vi`. |
| A10 | If stuck after > 2 different attempts: stop, record what you tried, and report. **Do not** "patch around it" by loosening tests. |

### 0.2 Definition of Done

A task is considered done when **all** of the following hold:

1. ✅ Every acceptance criterion of the task is satisfied.
2. ✅ `node tests/node-runner.js` runs **fully green** (not just your own suite).
3. ✅ No new errors/warnings in the browser console (for tasks with UI).
4. ✅ The code follows the conventions in `design.md` §12.2.
5. ✅ New public APIs have JSDoc.
6. ✅ No file outside the "Owned files" list has been changed.

### 0.3 How to read a task card

```
### T-x.y — Task name
**Depends on:** tasks that must be done first   **Parallel:** yes/no   **Estimate:** S/M/L/XL
**Owned files:** paths (the agent may ONLY edit these files)
**Description:** work to be done
**Acceptance criteria:** verifiable conditions
```

Estimates: `S` ≈ < 1 h · `M` ≈ 1–3 h · `L` ≈ 3–6 h · `XL` ≈ > 6 h (agent effort).

### 0.4 Phase dependency graph

```
P0 Foundation
   └─► P1 Classic core
          └─► P2 Logical solver
                 └─► P3 Pipeline & events
                        ├─► P4 UI shell ──► P6 Worker & performance ──► P7 Polish
                        └─► P5 Variants  (up to 8 agents can run IN PARALLEL)
```

*As executed:* P0 → P1 → P2 → P3 → **P5 (`T-5.1…5.8`)** → P4 (with `T-5.9` and `T-5.10` after it had started) → P6 → P7 → `T-7.7`. The variants went first so that the UI work could not conflict with them on the "hot files" ([Appendix B](#appendix-b--file-ownership-matrix)); they declared their strings in `SG.localeFragments` (see [`design.md`](./design.md) §11.1).

### 0.5 Parallelization points

| When | Can run in parallel |
|------|---------------------|
| After `T-0.4` | T-0.5, T-0.6 |
| After `T-2.1` | All of T-2.x (one agent per technique group — 6 agents) |
| After `T-3.4` | All of P5 (one agent per variant file — up to 8 agents) **and** all of P4 |
| After `T-4.2` | T-4.3 … T-4.8 (partially) |
| After all `T-5.x` are done | P6, P7 |

---

## PHASE P0 — Foundation

> Goal: have a runnable skeleton and test infrastructure, so that every later task can be validated.

### T-0.1 — Project scaffolding
**Depends on:** — **Parallel:** no **Estimate:** S
**Owned files:** the entire empty directory tree, `README.md`, `.gitignore`

**Description:** Create the exact directory tree per `design.md` §12.1. Create a bilingual `README.md` containing: an introduction, how to run (`python -m http.server 8080` or `npx serve`), notes on the limitations of `file://`, how to run the tests, and an architecture overview.

**Acceptance criteria:**
- Every directory in §12.1 exists (empty placeholder files are acceptable).
- `README.md` has both a Vietnamese and an English section.
- `.gitignore` excludes `.DS_Store`, `Thumbs.db`, `node_modules/`, `*.log`.

---

### T-0.2 — Core namespace, constants, debug flag
**Depends on:** T-0.1 **Parallel:** no **Estimate:** S
**Owned files:** `js/core/ns.js`, `js/core/errors.js`

**Description:** Create the `SG` namespace so that it is safe to load multiple times (idempotent) and works in window, worker and Node alike. Define `SG.VERSION`, `SG.DEBUG` (enabled via `?debug=1`, but **core must not read the URL** — it receives the value from outside via `SG.setDebug()`), `SG.MAX_DIGITS = 16`, and `SG.errors.GenerationError` with `code` and `i18nArgs` fields.

**Acceptance criteria:**
- Loading the file twice does not overwrite data already present on `SG`.
- `new SG.errors.GenerationError('x.y', {a:1}) instanceof Error === true`, with `.code === 'x.y'`.
- No direct reference to `document`/`window` (use `typeof self !== 'undefined' ? self : globalThis`).

---

### T-0.3 — Seeded random number generator
**Depends on:** T-0.2 **Parallel:** no **Estimate:** S
**Owned files:** `js/core/rng.js`

**Description:** Implement mulberry32 per the `design.md` §13.1 contract. `fork(tag)` must create an independent child RNG by hashing `(seed, tag)` — for example, use a 32-bit FNV-1a-style string hash and then mix it with the seed.

**Acceptance criteria:**
- Same seed ⇒ identical sequence of 1000 numbers.
- `fork('a')` and `fork('b')` yield different sequences; consuming a child RNG does **not** affect the parent RNG.
- `shuffle` on an 8-element array, 100,000 times: each element appears at each position with a frequency deviation < 3% (χ² test).
- `int(n)` is always in `[0, n)` for `n` from 1 to 1000.

---

### T-0.4 — Bit utilities & budget
**Depends on:** T-0.2 **Parallel:** no **Estimate:** S
**Owned files:** `js/core/bits.js`, `js/core/budget.js`

**Description:** `bits` per §13.2 — `popcount` uses a branchless Hamming weight, `lowestBitIndex` uses `Math.clz32`. `budget` provides: `create({ms, nodes, onCancel})`, `check()` (throws `GenerationError('budget.exceeded')`), `tick()`, `cancel()`, `isCancelled`, and `check()` reads the clock only once every 1024 ticks (reducing the cost of `Date.now`).

**Acceptance criteria:**
- `popcount` is correct for every `mask ∈ [0, 65536)` (compared against a naive count).
- `bits.forEach` yields **1-based** values, in ascending order.
- An expired `budget` ⇒ throws the correct error type; `cancel()` makes `check()` throw immediately.

---

### T-0.5 — Test harness
**Depends on:** T-0.4 **Parallel:** yes (with T-0.6) **Estimate:** M
**Owned files:** `tests/harness.js`, `tests.html`

**Description:** A minimal harness with no dependencies: `describe`, `it`, `expect` (`toBe`, `toEqual` with deep comparison including TypedArrays, `toBeTruthy`, `toBeFalsy`, `toThrow`, `toBeCloseTo`, `toContain`, `toHaveLength`), `beforeEach`/`afterEach`, `bench(name, fn, iterations)`. Collect results into `SG.testResults`.
`tests.html` loads all scripts in order, shows colour-coded results, has a per-suite filter box, shows the total time, and lists the failed tests with their stacks.

**Acceptance criteria:**
- A deliberately failing test is reported in red with a clear message and does not stop the other tests.
- `toEqual` correctly compares `Int32Array` and nested objects.
- Opening `tests.html` via `file://` still works.

---

### T-0.6 — Headless test runner for Node
**Depends on:** T-0.4 **Parallel:** yes (with T-0.5) **Estimate:** M
**Owned files:** `tests/node-runner.js`

**Description:** A Node script (no dependencies) that reads the list of source files in order, loads them with `vm.runInThisContext(fs.readFileSync(...))`, and then loads the suites in `tests/suites/`. It prints results to the console and calls `process.exit(1)` if any test fails. Supports the flags `--suite=<name>`, `--bail`, `--verbose`, `--filter=<string>`.
**Important:** the list of source files lives in a single array at the top of the file, with a comment reminding that it must be kept in sync with `index.html` and `gen.worker.js`.

**Acceptance criteria:**
- `node tests/node-runner.js` runs from the `sudoku-generator/` directory.
- Exit code 0 when green, 1 when red.
- `--suite=rng` runs only that suite.
- Clearly prints: total number of tests, number passed/failed, time.

---

### T-0.7 — Foundation test suites
**Depends on:** T-0.5, T-0.6 **Parallel:** no **Estimate:** S
**Owned files:** `tests/suites/rng.test.js`, `tests/suites/bits.test.js`, `tests/suites/purity.test.js`

**Description:** Write tests for T-0.3, T-0.4. `purity.test.js` reads every file in `js/core/` and `js/variants/` using `fs` (runs only in Node, skipped in the browser) and asserts that none of them contains: `document.`, `window.`, `localStorage`, `alert(`, `import `, `export `, `require(`.

**Acceptance criteria:**
- Every criterion of T-0.3, T-0.4 is covered by automated tests.
- `purity.test.js` skips itself gracefully when run in the browser.

---

## PHASE P1 — Classic core

> Goal: generate `classic9` puzzles with a unique solution, running entirely in Node.

### T-1.1 — Puzzle model & validation
**Depends on:** T-0.7 **Parallel:** no **Estimate:** L
**Owned files:** `js/core/model.js`

**Description:** Implement `PuzzleModel` per `design.md` §4.2 and the §13.3 API. It includes: `create(spec)` precomputes `cellUnits` and `peers`; `validate` checks V1–V7 (V8 is added later by `T-1.5`); `initState`; `cloneState` accepts an existing buffer for reuse; `cellLabel` produces labels like `R4C7`, with a sub-grid prefix for multi-grid.

**Acceptance criteria:**
- Standard 9×9 model: 27 units, `peers[0]` has exactly 20 cells, all `peers` are symmetric.
- `validate` detects: a unit with the wrong number of cells, indices out of range, orphan cells, duplicate coordinates.
- `cloneState(s, buf)` allocates nothing new when `buf` is passed (verify by comparing references).
- Passes the criteria of `tests/suites/model.test.js`.

---

### T-1.2 — Classic variant builder + registry
**Depends on:** T-1.1 **Parallel:** no **Estimate:** M
**Owned files:** `js/variants/registry.js`, `js/variants/classic.js`

**Description:** `registry` per §13.8, with schema validation on registration (a missing required field ⇒ throw) and rejection of duplicate `id` registration. `classic.js` registers `classic4` (2×2 box), `classic6` (2×3 box), `classic9` (3×3 box), using one shared builder function parameterised by `(boxRows, boxCols)`.

**Acceptance criteria:**
- All 3 variants, once built, pass `SG.model.validate`.
- `classic6` has boxes of **2 rows × 3 columns** (not 3×2) — verify with `cellRegion`.
- `registry.list()` returns exactly 3 entries; registering a duplicate id ⇒ throws.

---

### T-1.3 — Constraint propagation
**Depends on:** T-1.2 **Parallel:** no **Estimate:** L
**Owned files:** `js/core/constraints.js`

**Description:** Implement P1, P2, P3, P6 per `design.md` §6.3 and the §13.4 API (P4, P5 are left for `T-5.5`/`T-5.6` — but **a hook point must be reserved** so they can be added without modifying the core). Use a work queue; do not rescan everything. No allocation in the hot loop.

**Acceptance criteria:**
- `assign` followed by `propagate` removes the value from all peers correctly.
- Hidden singles are detected in row/col/box alike.
- A contradictory state ⇒ returns `false`, does not throw.
- **Soundness:** on 100 random full grids, propagating from a subset of the clues **never** removes a value that belongs to the true solution.
- The hook point for additional constraints exists and has a mock test.

---

### T-1.4 — DFS solver & unique-solution check
**Depends on:** T-1.3 **Parallel:** no **Estimate:** L
**Owned files:** `js/core/dfs-solver.js`

**Description:** Implement `solve`, `countSolutions`, `stillUnique` per §13.5. `stillUnique` **must** use the optimised "try alternative values" algorithm in `design.md` §6.5 and must not re-solve from scratch. Choose variables by MRV; randomise the value order when an `rng` is given.

**Acceptance criteria:**
- Correctly solves ≥ 10 sample puzzles in `tests/fixtures/`, including the "world's hardest" puzzle (Escargot).
- `countSolutions(limit=2)` returns `2` for a multi-solution puzzle (stops early, does not count them all), `1` for a standard puzzle, `0` for a contradictory puzzle.
- **Equivalence assertion:** over 200 random cases, `stillUnique(...)` gives results **identical** to `countSolutions(givensAfterRemoval, 2) === 1`.
- **Performance milestone:** `stillUnique` is at least **3×** faster than the naive approach (measured with `bench`).

---

### T-1.5 — Full grid generation
**Depends on:** T-1.4 **Parallel:** no **Estimate:** M
**Owned files:** `js/core/full-grid.js`

**Description:** Implement `design.md` §6.2: randomised DFS + MRV + propagation, with a `budget` and a restart when `restartThreshold` is exceeded. Support `fixedCells`. Support the `variant.fastSeed` hook (pre-fill the diagonal boxes for `classic9`). Add the V8 check to `model.validate`.

**Acceptance criteria:**
- 1000 generated `classic9` grids are 100% valid.
- Same seed ⇒ identical grid.
- Uniform distribution: over 1000 grids, the value in cell R1C1 appears nearly uniformly across all 9 values (deviation < 5%).
- With `fastSeed` enabled ⇒ ≥ 25% faster than with it disabled (measured with `bench`).
- A `classic4` grid generates in < 2 ms.

---

### T-1.6 — Symmetry
**Depends on:** T-1.5 **Parallel:** no **Estimate:** S
**Owned files:** `js/core/symmetry.js`

**Description:** `SG.symmetry.groups(model, kind)` returns an array of cell groups (`Int32Array[]`) that must be dug or restored together. Supports: `none`, `rotational180`, `rotational90`, `mirrorH`, `mirrorV`, `mirrorBoth`, `diagonal`, `antiDiagonal`. Use **canvas** coordinates (`layout.cellRow/cellCol`) so that it also works with multi-grid. A cell at the centre forms a group of 1 element.

**Acceptance criteria:**
- `rotational180` on 9×9: 40 pair groups + 1 single group (the centre cell) = 41 groups, covering all 81 cells.
- `rotational90` on 9×9: groups of 4 elements + the centre cell.
- Every kind: the union of the groups = exactly the set of all cells, with no duplicates.
- With `samurai` (a 21×21 canvas with holes): a group contains only cells that **actually exist**; if the mirror-image cell does not exist, the group shrinks instead of erroring.

---

### T-1.7 — Basic hole digger
**Depends on:** T-1.6 **Parallel:** no **Estimate:** L
**Owned files:** `js/core/digger.js`

**Description:** Implement **phase A** of `design.md` §6.8 with the interim oracle `dfs.stillUnique` (the technique-based oracle will replace it in `T-2.8`). It includes: predefined dig sequences (5 kinds), symmetry groups, and the 3 cheap filters (④ in §6.8). Emit events through the `emit` callback (a `null` `emit` is ignored — no scattered if-else checks; substitute a no-op function).

**Acceptance criteria:**
- 200 generated `classic9` puzzles: **100%** return 1 from the `countSolutions(..., 2)` check (invariant I1).
- `givens ⊆ solution` always holds (I2).
- `rotational180` symmetry ⇒ the pattern of empty cells is truly centrally symmetric.
- Same seed ⇒ same `givens` (I4).
- Respects `minClues` and `minCluesPerUnit`.

---

### T-1.8 — Test suites for the P1 core
**Depends on:** T-1.7 **Parallel:** no **Estimate:** M
**Owned files:** `tests/suites/model.test.js`, `constraints.test.js`, `solver.test.js`, `full-grid.test.js`, `digger.test.js`, `tests/fixtures/classic.js`

**Description:** Write complete tests for T-1.1 → T-1.7. `fixtures/classic.js` holds ≥ 10 classic Sudoku puzzles with answers, ≥ 2 multi-solution puzzles, and ≥ 2 unsolvable puzzles.

**Acceptance criteria:**
- Every acceptance criterion of T-1.1…T-1.7 is covered by automated tests.
- Invariants I1, I2, I3, I4, I6 are asserted in `digger.test.js`.
- The whole run finishes in < 30 seconds on Node.

---

## PHASE P2 — Logical solver & difficulty

> Goal: measure difficulty and **guarantee** it. This phase determines the quality of the product.

### T-2.1 — Logical solver framework
**Depends on:** T-1.8 **Parallel:** no **Estimate:** L
**Owned files:** `js/core/logical-solver.js`, `js/core/techniques.js` (technique registry)

**Description:** The loop per `design.md` §6.6 and the §13.6 API. `techniques.js` is the registry: `SG.techniques.register({ id, group, baseCost, i18nKey, order, variantScope, find(model, state, ctx) → Finding|null })`. The solver sorts by `order` ascending, applies the **cheapest technique found**, records the step, then repeats from the start of the ladder.

`Finding = { technique, cells, placements: [[cell,value]], eliminations: [[cell,value]], i18nKey, i18nArgs }`

**Acceptance criteria:**
- With `allowedTechniques = ['nakedSingle','hiddenSingle']`, solves every Easy-level puzzle in the fixtures.
- A puzzle that needs a higher technique ⇒ returns `solved:false` + `state` in the stuck state (does not throw).
- `collectSteps:false` ⇒ ≥ 15% faster than `true` (no step array is created).
- A technique registered with `variantScope:['killer']` must **not** run for `classic9`.

---

### T-2.2 — Techniques: `basic` and `locked` groups
**Depends on:** T-2.1 **Parallel:** yes **Estimate:** M
**Owned files:** `js/core/tech-basic.js`

**Description:** Naked Single · Hidden Single (scored separately by unit type: box/region = 2 points, row/col = 3 points) · Pointing Pair/Triple · Box/Line Reduction. Apply generically to **every kind of unit** (including Jigsaw regions, diagonals, Hyper windows) — do not assume rectangles.

**Acceptance criteria:**
- Each technique has ≥ 2 positive fixtures and ≥ 1 negative fixture.
- **Soundness (I7):** on 300 random states taken from puzzles with a unique solution, no technique removes a value that belongs to the true solution.
- Pointing/Box-Line work correctly on a mock Jigsaw model (units that are not rectangles).

---

### T-2.3 — Techniques: `subset` group
**Depends on:** T-2.1 **Parallel:** yes **Estimate:** L
**Owned files:** `js/core/tech-subset.js`

**Description:** Naked Pair/Triple/Quad and Hidden Pair/Triple/Quad. Implement them generically over the size `k ∈ {2,3,4}` by enumerating combinations over bitmasks; do **not** write 6 separate functions. Be careful: a naked subset finds `k` cells whose union of candidates has exactly `k` values; a hidden subset finds `k` values that appear in exactly `k` cells only.

**Acceptance criteria:**
- Positive/negative fixtures for all 6 technique variants.
- Soundness I7 on 300 states.
- No duplicate reports: a naked pair that has already been handled is not reported again as a naked triple containing it.
- Performance: scanning all 27 units on 9×9 takes < 1 ms.

---

### T-2.4 — Techniques: `fish` group
**Depends on:** T-2.1 **Parallel:** yes **Estimate:** L
**Owned files:** `js/core/tech-fish.js`

**Description:** X-Wing · Swordfish · Jellyfish (generalised over the size `n ∈ {2,3,4}`, running in both directions row↔column) and Simple Colouring (chains of strong links, with two elimination rules: "two cells of the same colour in one unit" and "a cell that sees both colours").

**Acceptance criteria:**
- Positive/negative fixtures for each technique, taken from well-known public examples.
- Soundness I7.
- Generic fish: the same function handles `n=2,3,4` and both directions.
- Simple Colouring reports no wrong results on a grid with no strong links.

---

### T-2.5 — Techniques: `wing` group
**Depends on:** T-2.1 **Parallel:** yes **Estimate:** L
**Owned files:** `js/core/tech-wing.js`

**Description:** XY-Wing · XYZ-Wing · W-Wing · Unique Rectangle (only the Type 1–2 forms, which are sufficient).
⚠️ **Warning:** Unique Rectangle relies on the assumption "the puzzle has a unique solution" — which is valid here because we only generate unique-solution puzzles, but this technique **must be disabled** when the solver is used to *validate* uniqueness. Add the flag `assumesUniqueness: true` to the technique declaration and have the solver filter on that flag.

**Acceptance criteria:**
- Positive/negative fixtures for each technique.
- Soundness I7 (under the unique-solution assumption).
- `options.assumeUniqueness === false` ⇒ Unique Rectangle is skipped.
- UR fires only when the 4 cells lie in exactly 2 rows, 2 columns and 2 regions.

---

### T-2.6 — Techniques: `chain` group
**Depends on:** T-2.1 **Parallel:** yes **Estimate:** XL
**Owned files:** `js/core/tech-chain.js`

**Description:** Forcing Chain (forcing chains on a graph of strong/weak links, with the length limited by `maxChainLength`, default 12) and Nishio (try a value, propagate, and eliminate it if a contradiction arises). A `budget` is mandatory because this is the most expensive technique group.

**Acceptance criteria:**
- Solves ≥ 3 "evil" puzzles in the fixtures on which the lower technique groups get stuck.
- Soundness I7 — especially strict, because chains are easy to implement wrongly.
- Respects `maxChainLength`; when the budget is exceeded ⇒ returns `null` gracefully instead of throwing.
- Does not fall into an infinite loop on graphs with cycles.

---

### T-2.7 — Difficulty scoring & classification
**Depends on:** T-2.2 … T-2.6 **Parallel:** no **Estimate:** M
**Owned files:** `js/core/difficulty.js`

**Description:** Implement the scoring table §6.6, the level bands §6.7, and the §13.7 API. `spec(level, model)` must **scale** `minClues`/`maxClues`/the score band by `model.cellCount / 81` and clip by `variant.difficultySupport`. `classify` additionally returns `confidence` (0–1), indicating whether the score lies deep inside the band or right at its edge.

**Acceptance criteria:**
- `classify` matches the labels of ≥ 20 labelled sample puzzles in the fixtures with a maximum deviation of **1 level**.
- **Monotonicity:** removing one more clue ⇒ `score` does not decrease (checked on 100 cases).
- `spec('evil', model_classic4)` ⇒ throws or returns `null` (the variant does not support it).
- The band for `samurai` is scaled in the correct proportion (369/81).

---

### T-2.8 — Technique-limited oracle for the hole digger
**Depends on:** T-2.7 **Parallel:** no **Estimate:** L
**Owned files:** `js/core/digger.js` *(modifies the file created in T-1.7)*

**Description:** Replace the oracle in `digger` with the strategy in `design.md` §6.8 ④: use `logicalSolver.solve(..., allowedTechniques: spec.allowedTechniques, collectSteps: false, assumeUniqueness: false)` for the levels `veryEasy`…`expert`; keep `dfs.stillUnique` for `evil`. Add **phase B** (calibration: restore clues when the puzzle is too hard, dig more when it is too easy) and the **outer restart loop** §6.8 ⑥.
**Mandatory:** before returning the final result, **always** re-verify with `dfs.countSolutions(..., 2) === 1` — this is the safety net against technique implementation bugs (risk R3).

**Acceptance criteria:**
- 100 puzzles per difficulty level (`veryEasy`…`evil`) on `classic9`: **≥ 90%** reach exactly the requested level, **100%** have a unique solution.
- The `hardestTechnique` of the generated puzzle always belongs to `spec.allowedGroups` when `achieved === requested`.
- When `maxAttempts` is exhausted ⇒ returns the closest result with `warnings` containing `'difficulty.approximate'`, and does **not** throw.
- Invariants I1–I7 all hold.
- Meets the `classic9` performance milestone in `design.md` §9.1.

---

### T-2.9 — Test suites for P2
**Depends on:** T-2.8 **Parallel:** no **Estimate:** M
**Owned files:** `tests/suites/techniques.test.js`, `tests/suites/difficulty.test.js`, `tests/fixtures/techniques.js`, `tests/fixtures/rated.js`

**Description:** Fixtures for each technique (a state + the expectation of found/not found) and ≥ 20 puzzles labelled with their difficulty. The soundness I7 test runs on **every** registered technique through a loop over `SG.techniques.list()` — so techniques added later are also tested automatically.

**Acceptance criteria:**
- The soundness test runs automatically for every technique in the registry (no need to edit the test when a new technique is added).
- Every criterion of T-2.2…T-2.8 is covered.

---

### T-2.10 — Scoring table calibration (soak test)
**Depends on:** T-2.9 **Parallel:** no **Estimate:** L
**Owned files:** `tests/soak.js`, `js/core/difficulty.js` *(constants only)*

**Description:** Write `soak.js` to generate 500 puzzles over every combination (existing variants × difficulties), check I1–I7, and print a **confusion matrix** between the requested level and the achieved level, plus a score histogram. Based on the results, **tune the constants** `baseCost` and the score bands in `difficulty.js` so that the exact-level hit rate is ≥ 90%. Record the before/after values and the reasons in comments in the file.

**Acceptance criteria:**
- `node tests/soak.js` runs and prints a clear report.
- After calibration: exact-level hit rate ≥ 90% for `classic9` at all 6 levels.
- No level has a 0% rate.
- The changed constants have comments explaining their rationale.

---

## PHASE P3 — Pipeline & event system

> Goal: turn the puzzle generation process into an event stream that the UI can replay.

### T-3.1 — Event schema & emitter
**Depends on:** T-2.10 **Parallel:** no **Estimate:** M
**Owned files:** `js/core/events.js`

**Description:** Define `GenerationEvent` (`design.md` §7.2), the event factory, the `seq` counter, and `SG.events.createEmitter(verbosity, sink)`, which automatically filters by verbosity (`off`/`summary`/`full`) and throttles `metric` events on a 50 ms cycle. Provide `makePatch(changes)` and `invertPatch(patch, prevState)`.

**Acceptance criteria:**
- `verbosity:'off'` ⇒ emits only `step` start/end, `done`, `error`.
- `seq` increases monotonically, with no duplicates.
- `invertPatch` applied to the post-state ⇒ restores the pre-state exactly (verified on 100 random patches).
- An emitter with a `null` sink does not throw.

---

### T-3.2 — Event emission in the grid generator & digger
**Depends on:** T-3.1 **Parallel:** no **Estimate:** M
**Owned files:** `js/core/full-grid.js`, `js/core/digger.js` *(modifies existing files)*

**Description:** Insert `emit(...)` at the landmarks: placing a value, backtracking, trying a dig, accepting, rejecting, start/end of a round, calibration. Use **delta**-style `patch`es; never send the whole grid. When `verbosity === 'off'`, the cost of emitting must be close to zero.

**Acceptance criteria:**
- Applying every patch from the events sequentially ⇒ reconstructs the final grid **exactly**.
- `verbosity:'off'` slows things down by < 2% compared with a build without emit (measured with `bench`).
- `verbosity:'full'` slows things down by < 35%.
- No `patch` contains more than 8 cells (this forces deltas).

---

### T-3.3 — Per-step explanation content
**Depends on:** T-3.1 **Parallel:** yes **Estimate:** M
**Owned files:** `js/core/explain-data.js`

**Description:** Pure data (no DOM) for the 7 steps: i18n keys for `what`/`why`/`how`, a pseudocode snippet as an array of lines with labels for highlighting, and a `live(metrics)` function that returns a key + parameters for the real-time status line. It contains **keys** only, no text.

**Acceptance criteria:**
- All 7 steps are present, each with `what`/`why`/`how`/`pseudocode`/`live`.
- No displayed string appears in the file (grep test).
- Every key used here exists in both locale packs (checked in `i18n.test.js`).

---

### T-3.4 — Pipeline orchestration
**Depends on:** T-3.2, T-3.3 **Parallel:** no **Estimate:** L
**Owned files:** `js/core/pipeline.js`

**Description:** Implement `SG.pipeline.run` per §13.9, running exactly the 7 steps in `design.md` §7.1. Handle: the retry loop (emit a `retry` event with the reason), per-step timing, collecting `warnings`, propagating `budget`/cancellation, calling the `variant.postGenerate` hook at step 4 and `variant.digStrategy` at step 5. Package the `PuzzleResult`.

**Acceptance criteria:**
- The 7 steps are emitted in the correct order, each with a `start`/`end` pair.
- `timings` has all 7 keys, and their sum ≈ the real elapsed time (error < 5%).
- Cancelling midway ⇒ stops in < 100 ms, with no leaks.
- A puzzle generated through the pipeline is identical to one generated by calling the functions directly with the same seed.
- A variant without `postGenerate` still passes through step 4 (emitting a "nothing to do" event).

---

### T-3.5 — Test suites for the pipeline
**Depends on:** T-3.4 **Parallel:** no **Estimate:** S
**Owned files:** `tests/suites/pipeline.test.js`, `tests/suites/events.test.js`

**Acceptance criteria:** Covers every criterion of T-3.1…T-3.4, including reconstructing the grid from a sequence of patches.

---

## PHASE P4 — UI shell

> Goal: a usable website for `classic9`, bilingual, with per-step visualisation.
> **Can run in parallel with P5.**

### T-4.1 — i18n system + two locale packs
**Depends on:** T-3.4 **Parallel:** no **Estimate:** L
**Owned files:** `js/ui/i18n.js`, `js/ui/locale.en.js`, `js/ui/locale.vi.js`

**Description:** Implement per `design.md` §11 and the §13.11 API. The two locale packs must cover: the names of 15 variants, 6 difficulty levels, 8 symmetry kinds, 5 symbol sets, 7 steps, ~25 techniques (name + short description), all control labels, error messages, explanation content, and accessibility strings.
The Vietnamese translation must be **natural**, not crude machine translation; keep established terms (X-Wing, Swordfish, Jigsaw) as they are, accompanied by a Vietnamese explanation.

**Acceptance criteria:**
- The two packs have an **identical key set** (automated test).
- `t()` interpolates parameters correctly; a missing key ⇒ returns the key + `console.warn` when DEBUG.
- `applyTo(root)` updates both `textContent` and attributes via `data-i18n-attr`.
- Switching language updates `<html lang>` and does not reload the page.
- No key has an empty value.

---

### T-4.2 — HTML page & CSS shell
**Depends on:** T-4.1 **Parallel:** no **Estimate:** L
**Owned files:** `index.html`, `css/tokens.css`, `css/base.css`, `css/layout.css`, `css/components.css`, `js/ui/locale.shell.js` *(the strings of the static page frame, a `SG.localeFragments` fragment)*

**Description:** Build the 3-column layout of `design.md` §10.1 with responsiveness at 3 breakpoints. `tokens.css` declares all variables for the 3 themes (`light`/`dark`/`high-contrast`). `index.html` loads the scripts in the order of §12.2, attaches `data-i18n` to every label, and has a skip-link and ARIA landmarks.

**Acceptance criteria:**
- The layout is correct at 3 width breakpoints: 1440px, 900px, 375px.
- **No colour code outside `tokens.css`** (grep test).
- Switching theme requires only changing `data-theme` on `<html>`.
- No hard-coded displayed strings in `index.html`.
- The page loads with no console errors before anything is clicked.

---

### T-4.3 — Grid view (SVG)
**Depends on:** T-4.2 **Parallel:** yes **Estimate:** XL
**Owned files:** `js/ui/board-view.js`, `css/board.css`, `css/tokens-board.css` *(the `--sg-board-*` tokens of the 3 themes: board colours, the symbol palette, animation durations)*

**Description:** Implement per `design.md` §10.2 and the §13.12 API. It must handle **every** geometric feature: irregular region borders (build the path from `cellRegion`), thick/thin lines, overlapping multi-grid regions, dashed-outline cages + sum numbers, inequality signs (`<`/`>`) on edges, background fill for Hyper windows/diagonals. `applyPatch` modifies only the DOM nodes that changed.

**Acceptance criteria:**
- Draws `classic9` correctly when empty, partially filled and complete.
- **Jigsaw region borders are correct**: verified with a mock Jigsaw model — thick lines appear exactly at the boundary between two different regions.
- `applyPatch` for 1 cell touches ≤ 3 DOM nodes.
- `toSvgString()` yields a valid SVG string that opens standalone.
- `toPngBlob()` returns a PNG image of the correct size.
- Changing `symbolMode` does not require rebuilding the whole SVG tree.

---

### T-4.4 — Schema-driven generation control panel
**Depends on:** T-4.2 **Parallel:** yes **Estimate:** L
**Owned files:** `js/ui/controls.js`, `js/ui/store.js`

**Description:** `store` manages the application state, syncs two-way with the URL (§14.2) and `localStorage` (§14.3), and has `subscribe`. `controls` **auto-generates the form** from the `variant.options` schema; it handles cross-option constraints: changing the variant ⇒ re-filter the difficulty list by `difficultySupport`, filter the symbol sets, show/hide variant-specific options, and warn on strict symmetry + high difficulty.

**Acceptance criteria:**
- Selecting `classic4` ⇒ the difficulty list contains only `veryEasy`, `easy`.
- Selecting `killer` ⇒ the cage-size distribution slider appears; re-selecting `classic9` ⇒ it is hidden.
- The URL updates when an option changes; pasting the URL into a new tab ⇒ restores the exact state.
- The 🎲 button generates a new seed; the 📋 button copies it.
- Every control has a correct label and is keyboard-accessible.
- `localStorage` blocked ⇒ the app still works normally.

---

### T-4.5 — Steps panel & explanation card
**Depends on:** T-4.2, T-3.3 **Parallel:** yes **Estimate:** L
**Owned files:** `js/ui/step-view.js`, `js/ui/explain.js`, `css/steps.css`

**Description:** A panel of the 7 steps with their status (pending/running/done/error/skipped), real-time metrics, and the time of each step. The explanation card shows `what`/`why`/`how` + pseudocode with the running line highlighted. Clicking a step ⇒ seeks the replay player to that step. A bar chart of technique frequency at step 6 (plain SVG, no library).

**Acceptance criteria:**
- The statuses of the 7 steps accurately reflect the event stream.
- Switching language midway ⇒ the explanation content changes immediately, without losing state.
- The pseudocode highlights the line that corresponds to the running phase.
- The bar chart displays `techniqueCounts` correctly.
- Clicking a completed step ⇒ seeks to the exact position.

---

### T-4.6 — Replay player
**Depends on:** T-4.3, T-4.5 **Parallel:** no **Estimate:** L
**Owned files:** `js/ui/player.js`

**Description:** Implement per `design.md` §7.3: trace buffering, the ▶ ⏸ ⏭ ⏮ controls, 4 speeds (`instant`/`fast`/`step`/`manual`), a scrubber, batching via `requestAnimationFrame`, a checkpoint every 500 events for fast jumps, and stepping backward via `inversePatch`.

**Acceptance criteria:**
- `instant` mode ⇒ the grid shows the final result immediately, with no animation.
- `manual` mode ⇒ each press of ⏭ advances exactly one meaningful event.
- Seeking forward/backward to any position ⇒ the grid matches the state at that point **exactly**.
- A 20,000-event trace: seeking is smooth (< 100 ms per jump).
- Generating a new puzzle during replay ⇒ the old session is cancelled cleanly.

---

### T-4.7 — App wiring
**Depends on:** T-4.4, T-4.6 **Parallel:** no **Estimate:** M
**Owned files:** `js/ui/app.js`

**Description:** Startup: read the URL → set the language/theme → build the controls → wire the "Generate" button to `workerClient` (temporarily calling `pipeline` directly until T-6.1 is done) → push events into the `player` → display the result. Handle `?auto=1`. Handle errors with translated messages. A Cancel button.

**Acceptance criteria:**
- Pressing "Generate" ⇒ runs to completion and shows the finished puzzle.
- The UI does not freeze while generating (even without a worker — thanks to splitting the work into small chunks).
- Errors are shown as a translatable message, not a raw stack trace.
- `?v=classic9&d=hard&seed=42&lang=vi&auto=1` ⇒ automatically generates exactly that puzzle.
- Pressing "Generate" repeatedly causes no errors or leaks.

---

### T-4.8 — Result panel & warning state
**Depends on:** T-4.7 **Parallel:** yes **Estimate:** M
**Owned files:** `js/ui/result-view.js`, `css/components.css` *(additions)*

**Description:** The result panel of `design.md` §10.5: number of clues, score, achieved level, hardest technique, chart, time, number of attempts, copyable seed, share link. If `warnings` contains `difficulty.approximate` ⇒ a yellow warning badge + a "Retry with a different seed" button.

**Acceptance criteria:**
- Every field displays correctly and is translated.
- The copy seed/link buttons work (with a fallback when the Clipboard API is unavailable).
- The warning appears only when there are actually `warnings`.

---

### T-4.9 — Test suites for the UI
**Depends on:** T-4.8 **Parallel:** no **Estimate:** M
**Owned files:** `tests/suites/i18n.test.js`, `tests/suites/ui-contract.test.js`

**Description:** `i18n.test.js` checks that the key sets are identical, that no value is empty, and that **every `data-i18n` in `index.html` has a matching key** (reading the HTML with `fs` in Node). `ui-contract.test.js` checks that the UI modules expose exactly the API declared in §13 (a function-surface check, no real DOM needed).

**Acceptance criteria:** Runs on Node without a DOM; detects a missing key when a key is deliberately deleted.

---

## PHASE P5 — Variants (maximum parallelism)

> **Each task below can be assigned to a separate agent running in parallel**, because they own different files and depend only on T-3.4.
> **Common acceptance template for every variant (CV — Common Variant criteria):**
>
> | # | Common criterion |
> |---|------------------|
> | CV1 | `SG.model.validate(model).ok === true` |
> | CV2 | Generates a valid full grid for 50 different seeds |
> | CV3 | Generates puzzles at **every** level in `difficultySupport`; 20 puzzles per level |
> | CV4 | Invariants I1–I7 hold 100% of the time |
> | CV5 | Same seed ⇒ same puzzle (I4) |
> | CV6 | Meets the performance milestone in `design.md` §9.1 |
> | CV7 | The variant name + its specific options have i18n keys in **both** locale packs |
> | CV8 | Added to `tests/suites/variants.test.js` following the existing template |
> | CV9 | Renders correctly in `board-view` (manual check + a screenshot described in the report) |

### T-5.1 — Mega 12×12 & 16×16
**Depends on:** T-3.4 **Parallel:** ✅ **Estimate:** M
**Owned files:** `js/variants/mega.js`
**Description:** `mega12` (3×4 box) and `mega16` (4×4 box). Symbol sets: `mega12` → `1-9,A,B,C` or `1-12`; `mega16` → `0-9,A-F` (default) or `1-9,A-G`. Set a lower `restartThreshold` and set `difficultySupport` to go only up to `hard`.
**Acceptance:** CV1–CV9. Additionally: the `mega12` box is exactly 3 rows × 4 columns; the 16-bit bitmask works correctly with `D=16`.

### T-5.2 — Diagonal X & Hyper (Windoku)
**Depends on:** T-3.4 **Parallel:** ✅ **Estimate:** S
**Owned files:** `js/variants/extra-regions.js`
**Description:** `diagonalX` (2 diagonal units), `hyper` (4 window units of 3×3 at `(1,1),(1,5),(5,1),(5,5)`), and an option to enable both at once. Declare `overlays` in the layout so that the renderer paints the background.
**Acceptance:** CV1–CV9. Additionally: `diagonalX` has 29 units; `hyper` has 31 units; generated puzzles genuinely **need** the additional constraints (check: drop the additional units and the puzzle has > 1 solution, for ≥ 70% of puzzles).

### T-5.3 — Jigsaw (Nonomino)
**Depends on:** T-3.4 **Parallel:** ✅ **Estimate:** L
**Owned files:** `js/variants/jigsaw.js`
**Description:** Generate irregular regions per `design.md` §8.1, with a `compactness` parameter, a connectivity check via flood-fill, split prevention, backtracking, and **validation that the layout has a solution**.
**Acceptance:** CV1–CV9. Additionally: all 200 generated layouts have 9 connected regions of exactly 9 cells each; no unsolvable layout slips through; high `compactness` ⇒ visibly more compact regions (measured by average perimeter).

### T-5.4 — Wordoku
**Depends on:** T-3.4 **Parallel:** ✅ **Estimate:** M
**Owned files:** `js/variants/wordoku.js`, `assets/wordlists/isograms.en.js`, `assets/wordlists/isograms.vi.js`
**Description:** Per `design.md` §8.5. The EN list has ≥ 40 nine-letter isograms. The VI list uses compound words without diacritics, may be empty, and automatically falls back to EN. An option for the word placement: main diagonal / row / column.
**Acceptance:** CV1–CV9. Additionally: **every entry in both lists has exactly 9 distinct characters** (automated test); the word appears at the chosen position in the solution; an empty VI list ⇒ graceful fallback.

### T-5.5 — Killer Sudoku
**Depends on:** T-3.4 **Parallel:** ✅ **Estimate:** XL
**Owned files:** `js/variants/killer.js`, `js/core/combo-table.js`, `js/core/tech-cage.js`, and the cage-constraint portion of `js/core/constraints.js` *(via the hook reserved in T-1.3)*
**Description:** A sum-combination lookup table (§6.3 P4), cage propagation, cage generation (§8.2) with a size distribution by difficulty, a 3-step repair strategy for when the puzzle is not unique, the `cage` technique (K1 sum combinations, K2 the 45 rule, K3 cage splitting), and cage colouring using graph colouring.
**Acceptance:** CV1–CV9. Additionally: the values within each cage are pairwise distinct; `Σ cage.sum === Σ solution`; the lookup table matches a brute-force check for `size ≤ 4`; the colouring has no two adjacent cages with the same colour; meets the Killer performance milestone in §9.1.

### T-5.6 — Greater-Than Sudoku
**Depends on:** T-3.4 **Parallel:** ✅ **Estimate:** L
**Owned files:** `js/variants/greater-than.js`, `js/core/tech-ineq.js`, and the inequality-constraint portion of `js/core/constraints.js` *(via hook)*
**Description:** Per `design.md` §8.3: two-way min/max bound propagation, the strategy `digStrategy: 'signs'` digs **signs** instead of cells, the `ineq` technique (I1 inequality chains, I2 bound forcing). An option for the scope of sign placement: within a region / across the whole grid (Futoshiki).
**Acceptance:** CV1–CV9. Additionally: every sign is consistent with the solution; removing any remaining sign ⇒ the puzzle loses uniqueness (minimality of the sign set); bound propagation genuinely prunes (measure the number of candidates eliminated).

### T-5.7 — Multi-grid: Samurai & Sohei
**Depends on:** T-3.4 **Parallel:** ✅ **Estimate:** XL
**Owned files:** `js/variants/multigrid.js` *(the samurai and sohei part)*
**Description:** Per `design.md` §8.4 and the §5.2 table. Build the canvas→cell mapping table, share cells in the overlap regions, prioritise overlap-region cells when choosing variables in DFS, and use a dig sequence by sub-grid.
**Acceptance:** CV1–CV9. Additionally: `samurai` has **exactly 369** unique cells and 5×27=135 units; `sohei` has **exactly 288** cells (4×81 minus 4 shared 3×3 boxes); each sub-grid, when separated out, is a valid 9×9 Sudoku; overlap-region cells genuinely share the same index (changing a value in grid A ⇒ it shows up in grid B).

### T-5.8 — Multi-grid: Butterfly & Flower
**Depends on:** T-5.7 **Parallel:** ✅ (after T-5.7) **Estimate:** M
**Owned files:** `js/variants/multigrid.js` *(the butterfly and flower part)*
**Description:** Reuse the infrastructure of T-5.7, differing only in the origin-coordinate table. Geometry validation is mandatory: offsets divisible by 3, and the unique cell count matching the §5.2 table.
**Acceptance:** CV1–CV9. Additionally: `butterfly` has exactly **144** cells, 4 grids, and a 6×6 central overlap region; `flower` has exactly **189** cells (15×15 canvas minus 4 empty 3×3 corners) and 5 grids; throws a clear error if the geometry does not match.

### T-5.9 — Presentation symbol sets (colour / shape / letter)
**Depends on:** T-4.3 **Parallel:** ✅ **Estimate:** M
**Owned files:** `js/ui/symbols.js`, `css/board.css` *(additions)*
**Description:** A value→display mapping layer for `digits`/`letters`/`colors`/`shapes`/`word`. The `colors` mode **must** draw a small geometric symbol alongside, to support colour-blind users (it can be turned off in Settings but is on by default). The palette is verifiable against the 3 common types of colour blindness.
**Acceptance:** Switching mode does not require regenerating the puzzle; `colors` has an auxiliary symbol; the palette achieves a contrast of ≥ 3:1 between adjacent colours; the legend displays correctly and is translated.

### T-5.10 — Variant test suite
**Depends on:** T-5.1 … T-5.9 **Parallel:** no **Estimate:** M
**Owned files:** `tests/suites/variants.test.js`
**Description:** A single test suite that **runs automatically over `SG.variants.list()`**, applying CV1–CV8 to every registered variant. This way, variants added later are tested automatically without editing the test.
**Acceptance:** All 15 variants pass CV1–CV8; adding a fake variant to the registry ⇒ the test runs for it automatically.

---

## PHASE P6 — Worker & performance

### T-6.1 — Web Worker & fallback mechanism
**Depends on:** T-4.7, T-5.10 **Parallel:** no **Estimate:** L
**Owned files:** `js/worker/gen.worker.js`, `js/worker/worker-client.js`; the resumable (`*Steps`) twins also touched `js/core/budget.js`, `js/core/digger.js`, `js/core/pipeline.js`, `js/variants/killer.js` and `js/variants/greater-than.js` *(behaviour unchanged, see [`design.md`](./design.md) §9.3)*

**Description:** The worker uses `importScripts` to load the files in the exact order (it must match `index.html`), handles the `generate`/`cancel` messages, and emits events back. `worker-client` per §13.10: try to create a worker; on failure ⇒ switch to main-thread mode with a cooperative scheduler (`chunkMs = 12 ms`). Batch events before `postMessage` (to avoid congesting the channel).

**Acceptance criteria:**
- Running over `http://` ⇒ `mode === 'worker'`; the UI is smooth (no frame > 50 ms) when generating `samurai`.
- Opening via `file://` ⇒ `mode === 'main'`, puzzles can still be generated, and the UI still responds.
- `cancel()` stops in < 200 ms in both modes.
- Results are **identical** between the two modes with the same seed.
- Overlapping `generate` calls ⇒ the old session is cancelled cleanly, with no mixing of events.

---

### T-6.2 — Performance optimisation & hitting the milestones
**Depends on:** T-6.1 **Parallel:** no **Estimate:** L
**Owned files:** `tests/perf.js`, `tests/suites/perf.test.js`, `tests/fixtures/perf-helper.js`, `tests/fixtures/regression.js` *(generated: the regression hashes)*, + the core files *(modify only to optimise; do not change behaviour)*

**Description:** Measure performance across the whole `design.md` §9.1 table. For every table cell that does not yet meet its target, optimise following rules R1–R7 (§9.2): reuse buffers, remove allocation in hot loops, reduce state copying, add caching for `peers`. **Behaviour must not change** — puzzles generated with the same seed must remain the same.

**Acceptance criteria:**
- ≥ 90% of the cells in the §9.1 table meet the milestone; any cell that does not must come with a written justification.
- After optimisation: with 20 fixed seeds, the generated puzzles are **unchanged** compared with before (a regression test by hash).
- No allocation in the hot loops of `propagate` and `dfs` (manual review + notes).

---

### T-6.3 — Background pre-generation & cache
**Depends on:** T-6.1 **Parallel:** yes **Estimate:** M
**Owned files:** `js/ui/cache.js` *(the independent generation client it needs, `SG.workerClient.create`, shipped with `T-6.1`, so `worker-client.js` needed no addition)*

**Description:** After a puzzle is displayed, the worker quietly pre-generates 1–2 puzzles with the same configuration. A `localStorage` cache of at most 20 puzzles (LRU, with a schema version check). When the user presses "Generate" for a configuration that is already available ⇒ show it instantly, **but the trace can still be replayed** (the trace must be stored alongside, or regenerated from the seed).

**Acceptance criteria:**
- The second generation with the same configuration takes < 50 ms.
- Background generation does **not** make the UI stutter.
- `localStorage` full/blocked ⇒ handled gracefully, with no error.
- Changing the schema version ⇒ the old cache is purged.
- A puzzle served from the cache can still have its steps replayed (by regenerating from the seed).

---

## PHASE P7 — Polish

### T-7.1 — Export & print
**Depends on:** T-6.1 **Parallel:** ✅ **Estimate:** L
**Owned files:** `js/ui/export.js`, `css/print.css`
**Description:** The 6 formats in `design.md` §10.6 + batch printing (2/4/6 puzzles per page). `print.css` hides all controls, lays out the puzzle (and, optionally, the solution on a separate page), and ensures sharp line rendering.
**Acceptance:** Prints to PDF sharply, without overflowing the page and without exposing the controls; PNG/SVG/JSON/Text download correctly; JSON exported and then re-imported gives an **identical** puzzle; batch printing lays out the correct number of puzzles per page.

### T-7.2 — Import & validation
**Depends on:** T-7.1 **Parallel:** ✅ **Estimate:** M
**Owned files:** `js/ui/import.js`, `tests/suites/format.test.js`
**Description:** Import JSON (§14.1) and 81-character text strings. Check `format`, validate well-formedness, redisplay the puzzle, and provide an "Analyse difficulty" button that runs the scorer on the imported puzzle.
**Acceptance:** Round-trip loses no data; a corrupted/wrong-version file ⇒ a **translatable** error message, no crash; an imported puzzle can be scored for difficulty.

### T-7.3 — Accessibility
**Depends on:** T-4.8 **Parallel:** ✅ **Estimate:** L
**Owned files:** `js/ui/a11y.js`, + ARIA additions to the existing UI files
**Description:** All of `design.md` §10.7: keyboard navigation on the grid, `role="grid"`, bilingual ARIA labels, `aria-live` for step transitions (do not announce micro-events), focus trapping in modals, a skip-link, high-contrast mode, font-size adjustment, and respecting `prefers-reduced-motion`.
**Acceptance:** Everything is operable by keyboard; tested with a screen reader (NVDA or VoiceOver) — record the results in the report; contrast meets WCAG AA; `prefers-reduced-motion` turns off all animation effects; no unintended "focus traps".

### T-7.4 — Themes & visual polish
**Depends on:** T-7.3 **Parallel:** ✅ **Estimate:** M
**Owned files:** `css/tokens.css`, `css/board.css`, `css/components.css`, `css/tokens-board.css`, `js/ui/theme.js`, `assets/favicon.svg`
**Description:** Finish the 3 themes, respect `prefers-color-scheme`, the effects language of §10.3, loading/empty/error states, and an inline SVG favicon.
**Acceptance:** All 3 themes meet the contrast requirements; theme switching is smooth, with no flicker; the effects match the §10.3 table; no colour codes outside `tokens.css`.

### T-7.5 — Trial play mode (optional) — ➡️ moved to sudoku-player
**Depends on:** T-7.4 **Parallel:** ✅ **Estimate:** L
**Owned files (in the combined project):** `js/ui/play.js`, `css/play.css`
**Status:** moved to the **sudoku-player** repository ([github.com/tdat00/sudoku-player](https://github.com/tdat00/sudoku-player)). This repository contains no play mode: the files, the `sg.play.v1` key, the play shortcuts of the help and the tests were removed here; solving a puzzle is done by the player, which receives it through `T-7.8`.
**Description (kept for reference):** A basic play mode: enter values by keyboard/mouse, candidate notes, undo/redo, error checking, hints (use `logicalSolver` to point out the next step **together with an explanation of the technique being used** — a nice fit with the educational spirit of the product), and a timer.
**Acceptance (kept for reference):** Input is smooth on both desktop and mobile; hints are always correct and state the name + description of the technique; undo/redo is exact; it does **not** interfere with the puzzle generation flow.

### T-7.6 — Documentation & in-app help
**Depends on:** T-7.4 **Parallel:** ✅ **Estimate:** M
**Owned files:** `README.md`, `js/ui/help.js`, `css/help.css`, `docs/` *(the screenshots)*
**Description:** Finish the bilingual `README.md` (screenshots, architecture, how to add a new variant, how to run the tests). An in-app Help modal: the rules of each variant (bilingual), an explanation of the technique ladder, keyboard shortcuts. A first-time intro tour (3–4 steps, skippable).
**Acceptance:** The README is sufficient for a new developer to add a variant; the help modal has the rules for **all 15** variants, bilingual; the tour appears only the first time and has a skip button.

### T-7.7 — Final review & soak run
**Depends on:** all **Parallel:** no **Estimate:** L
**Owned files:** `tests/soak.js` *(extended)*, `docs/report-v1.md` *(the final report)*; the calibration also changed `js/core/difficulty.js` and the `clueFloor` / `clueFloorScale` fields of the variant files
**Description:** Run a soak of 500+ puzzles over **all** variants × difficulties. Carry out the full manual checklist in `design.md` §15.5. Produce a report: the difficulty hit rate per variant, the measured performance compared with the milestones, remaining issues, and known limitations.
**Acceptance:** 100% of puzzles have a unique solution (I1); ≥ 90% hit the exact difficulty for `classic9`, ≥ 80% for the other variants; the entire §15.5 checklist is carried out and recorded; `node tests/node-runner.js` is fully green.

### T-7.8 — Exchange / "Play online" (added after the split)
**Depends on:** T-7.1, T-7.2 **Parallel:** ✗ **Estimate:** M
**Owned files:** `js/ui/exchange.js` and `tests/suites/exchange.test.js` *(shared byte for byte with sudoku-player)*, `js/ui/export.js` *(the `model` block, the Play-online section)*, `index.html` *(the `sg-player-url` meta tag)*, the `export.playOnline.*` and `error.exchange.*` strings, and the tests in `export.test.js`, `format.test.js`, `i18n.test.js`
**Description:** Hand the puzzle on screen to the separate sudoku-player app without a server (design.md §10.9). `SG.exportUi.toJson` gains the additive block `model` (`SG.exchange.plain(SG.pipeline.toWire(result).model)`), so the player rebuilds the board with no variant code; the Export dialog gets a **Play online** section that encodes the current puzzle document (`SG.exchange.encode`), builds `SG.exchange.playerUrl(base, token)` with `base` read from `<meta name="sg-player-url">` (default `https://tdat00.github.io/sudoku-player/`), shows the link with a Copy button, warns when it is longer than 100 000 characters (and offers the JSON file) and opens it with `window.open(url, '_blank', 'noopener')`.
**Acceptance:** For every variant `SG.model.create(doc.model)` rebuilds a model equal to the original, also after the token round trip, and the document passes through `encode` / `decode` unchanged; the generator's own import is unchanged (it ignores `model`, also when it is damaged); the player address comes from the meta tag with a hard-coded fallback, and an invalid one is a translated error; the five `error.exchange.*` messages exist in English and Vietnamese (the i18n suite requires them); no new storage key; `node tests/node-runner.js` is fully green.

---

## Appendix A — Task summary table

All tasks of this repository are **✅ done** (59 cards in the combined project; `T-7.5` moved to the sudoku-player repository and `T-7.8` was added here); the last column says how the implementation relates to the card (only where it deviates or adds something worth knowing). Detail: [`design.md`](./design.md) §18.

| ID | Name | Phase | Depends on | Parallel | Estimate | Status |
|----|------|-------|------------|----------|----------|--------|
| T-0.1 | Project scaffolding | P0 | — | ✗ | S | ✅ Tree and `.gitignore` first; the bilingual `README.md` was first written under `T-7.6` |
| T-0.2 | Namespace & errors | P0 | T-0.1 | ✗ | S | ✅ |
| T-0.3 | Seeded RNG | P0 | T-0.2 | ✗ | S | ✅ mulberry32; `fork` = FNV-1a of `(seed, tag)`; `randomSeed()` |
| T-0.4 | Bits & budget | P0 | T-0.2 | ✗ | S | ✅ `SG.budget` later gained `createClock` / `drive` (`T-6.1`) |
| T-0.5 | Test harness | P0 | T-0.4 | ✓ | M | ✅ More matchers than the card lists; `SG.test.skip` |
| T-0.6 | Node runner | P0 | T-0.4 | ✓ | M | ✅ `SOURCE_FILES` lists every planned file and skips missing ones, so later phases never edited it |
| T-0.7 | Foundation tests | P0 | T-0.5,T-0.6 | ✗ | S | ✅ |
| T-1.1 | Puzzle model | P1 | T-0.7 | ✗ | L | ✅ `validate` returns `warnings` too; `isSolution` |
| T-1.2 | Registry + classic | P1 | T-1.1 | ✗ | M | ✅ Registry later gained `optionsOf` / `defaultOptions` / `sanitizeOptions` (D5) |
| T-1.3 | Constraint propagation | P1 | T-1.2 | ✗ | L | ✅ Extension hook `registerExtension` (used by cages and signs) |
| T-1.4 | DFS & unique solution | P1 | T-1.3 | ✗ | L | ✅ `stillUnique` ≈ 3.7–4× faster than counting on stays-unique calls, ≈ 1.8× over a whole dig (the "≥ 3×" criterion was accepted in that narrower reading) |
| T-1.5 | Full grid generation | P1 | T-1.4 | ✗ | M | ✅ V8 added to `validate`; variant `fastSeed` / `restartThreshold` read by `SG.fullGrid` (D4) |
| T-1.6 | Symmetry | P1 | T-1.5 | ✗ | S | ✅ 8 kinds, including `antiDiagonal` |
| T-1.7 | Basic hole digging | P1 | T-1.6 | ✗ | L | ✅ |
| T-1.8 | P1 core tests | P1 | T-1.7 | ✗ | M | ✅ |
| T-2.1 | Logical solver framework | P2 | T-1.8 | ✗ | L | ✅ Singles are ordinary techniques: the solver never calls `propagate` |
| T-2.2 | Basic/locked techniques | P2 | T-2.1 | ✓ | M | ✅ Hidden Single split by unit kind (`hiddenSingleBox` / `hiddenSingleLine`) |
| T-2.3 | Subset techniques | P2 | T-2.1 | ✓ | L | ✅ Quads split Naked / Hidden: 6 techniques, one engine |
| T-2.4 | Fish techniques | P2 | T-2.1 | ✓ | L | ✅ `xWing`, `simpleColouring`, `swordfish`, `jellyfish` (orders 110, 120, 130, 160) |
| T-2.5 | Wing techniques | P2 | T-2.1 | ✓ | L | ✅ `uniqueRectangle` is the only `assumesUniqueness` technique |
| T-2.6 | Chain techniques | P2 | T-2.1 | ✓ | XL | ✅ `forcingChain` (≤ 12 links), `nishio` (depth ≤ 2) |
| T-2.7 | Difficulty scoring | P2 | T-2.2…2.6 | ✗ | M | ✅ Calibrated `COSTS` / `TABLE` are overrides held in `difficulty.js`; technique floor; `rawScore`; later per-variant `clueFloor` / `clueFloorScale` (D1) |
| T-2.8 | Difficulty oracle | P2 | T-2.7 | ✗ | L | ✅ Stage B is a *guided* dig, not "restore / relax"; DFS re-verification as safety net |
| T-2.9 | P2 tests | P2 | T-2.8 | ✗ | M | ✅ |
| T-2.10 | Score scale calibration | P2 | T-2.9 | ✗ | L | ✅ Subset ×7, fish ×6, wing ×10, chain ×8, singles 1 / 1.25 / 1.5; easy band edge 80 → 72; classic9 hit rate 99–100 % at every level |
| T-3.1 | Event schema | P3 | T-2.10 | ✗ | M | ✅ `SG.events.VOCABULARY` is the contract |
| T-3.2 | Event emission in core | P3 | T-3.1 | ✗ | M | ✅ |
| T-3.3 | Explanation content | P3 | T-3.1 | ✓ | M | ✅ `SG.explain` (core data) |
| T-3.4 | Pipeline orchestration | P3 | T-3.2,T-3.3 | ✗ | L | ✅ `dig` / `rate` / `tune` are three steps; up to 12 dig samples per grid (`dig.start` `sample`, `tune.miss`, `retry.difficulty`) |
| T-3.5 | Pipeline tests | P3 | T-3.4 | ✗ | S | ✅ |
| T-4.1 | i18n + 2 locale packs | P4 | T-3.4 | ✗ | L | ✅ Done after P5; merges `SG.localeFragments`; extras `detect`, `tError`, `eventText`, `setCellLabeler` |
| T-4.2 | HTML & CSS shell | P4 | T-4.1 | ✗ | L | ✅ Also owns `js/ui/locale.shell.js` |
| T-4.3 | SVG grid view | P4 | T-4.2 | ✓ | XL | ✅ Also owns `css/tokens-board.css`; geometry is a pure function |
| T-4.4 | Controls + store | P4 | T-4.2 | ✓ | L | ✅ |
| T-4.5 | Steps panel & explanation | P4 | T-4.2,T-3.3 | ✓ | L | ✅ `explain.js` exports `SG.explainCard` (not `SG.explain`) |
| T-4.6 | Replay player | P4 | T-4.3,T-4.5 | ✗ | L | ✅ |
| T-4.7 | App wiring | P4 | T-4.4,T-4.6 | ✗ | M | ✅ `SG.app` extension API: optional modules plug in through `init(SG.app)` |
| T-4.8 | Result panel | P4 | T-4.7 | ✓ | M | ✅ |
| T-4.9 | UI tests | P4 | T-4.8 | ✗ | M | ✅ |
| T-5.1 | Mega 12/16 | P5 | T-3.4 | ✅ | M | ✅ Run before P4. Symbol set = option `symbolSet`; `restartThreshold` 300 / 400 (read by `SG.fullGrid`, D4) |
| T-5.2 | Diagonal X & Hyper | P5 | T-3.4 | ✅ | S | ✅ Run before P4. 29 / 31 units; hybrid via `withHyper` / `withDiagonals` |
| T-5.3 | Jigsaw | P5 | T-3.4 | ✅ | L | ✅ Run before P4 |
| T-5.4 | Wordoku | P5 | T-3.4 | ✅ | M | ✅ Run before P4. Letters in alphabetical order; short VI list falls back to EN; the VI examples of the spec were wrong (real entries: `HOANGKIEM`, `BACHTUYEN`, `TRUNGBACH`) |
| T-5.5 | Killer | P5 | T-3.4 | ✅ | XL | ✅ Run before P4. Clue floor `{ veryEasy: 40 }` only, via `clueFloor` (D1) |
| T-5.6 | Greater-Than | P5 | T-3.4 | ✅ | L | ✅ Run before P4 |
| T-5.7 | Samurai & Sohei | P5 | T-3.4 | ✅ | XL | ✅ Run before P4. `sohei` has **288** cells (the spec said 324) |
| T-5.8 | Butterfly & Flower | P5 | T-5.7 | ✅ | M | ✅ Run before P4. `flower` has **189** cells (the spec said 225); its `medium` level came back with the T-7.7 calibration (D2) |
| T-5.9 | Presentation symbol sets | P5 | T-4.3 | ✅ | M | ✅ Done after P4 had started (it needs `board-view`) |
| T-5.10 | Variant tests | P5 | T-5.1…5.9 | ✗ | M | ✅ Done after P4 had started; I6 uses the variant's own floor (`spec().minClues`) |
| T-6.1 | Worker & fallback | P6 | T-4.7,T-5.10 | ✗ | L | ✅ Also added the resumable `*Steps` twins to the core; cooperative cancel (terminate after 150 ms); no `SharedArrayBuffer` |
| T-6.2 | Performance optimisation | P6 | T-6.1 | ✗ | L | ✅ Results: every cell of §9.1 meets its p95 target in Node, most by ≥ 10× (slowest relative: Killer expert, ≈ 1.3 s of 4 s); regression hashes for 20 seeds guard the optimisations |
| T-6.3 | Pre-generation & cache | P6 | T-6.1 | ✓ | M | ✅ The trace is regenerated from the seed, never stored; pool of ≤ 2 puzzles per configuration; none in main-thread mode |
| T-7.1 | Export & print | P7 | T-6.1 | ✅ | L | ✅ Also hosts the import section; batch print up to 60 puzzles |
| T-7.2 | Import & validation | P7 | T-7.1 | ✅ | M | ✅ |
| T-7.3 | Accessibility | P7 | T-4.8 | ✅ | L | ✅ **No real screen-reader run** (NVDA / VoiceOver); keyboard and ARIA checked in headless Edge and Node |
| T-7.4 | Themes & visuals | P7 | T-7.3 | ✅ | M | ✅ Also `css/tokens-board.css` and `assets/favicon.svg` |
| T-7.5 | Trial play mode | P7 | T-7.4 | ✅ | L | ➡️ **Moved to the sudoku-player repository**: `js/ui/play.js`, `css/play.css`, `play.test.js`, `sg.play.v1` and the play shortcuts of the help are not in this one |
| T-7.6 | Docs & help | P7 | T-7.4 | ✅ | M | ✅ Own stylesheet `css/help.css`; the README is checked mechanically by `help.test.js`; after the split the README is bilingual, without the play mode, with the "Play online with sudoku-player" section |
| T-7.7 | Final review & soak | P7 | all | ✗ | L | ✅ `--full` soak: 2 125 puzzles, no invariant violation; clue-floor calibration (D1–D3); `docs/report-v1.md` (written before the split); manual checklist done in Edge only (see Appendix E) |
| T-7.8 | Exchange / Play online | P7 | T-7.1, T-7.2 | ✗ | M | ✅ Added after the split: `js/ui/exchange.js` (shared byte for byte with the player), the `model` block of the JSON, the Play-online section of the Export dialog and a button in the result panel, `error.exchange.*` strings, tests; checked in headless Edge over `http` and `file://` |

---

## Appendix B — File ownership matrix

> Used to avoid conflicts when multiple agents run in parallel. **A file has only one owner at any given time.**

| File | Primary owner | Supplemented by |
|------|---------------|-----------------|
| `js/core/ns.js`, `errors.js` | T-0.2 | — |
| `js/core/rng.js` | T-0.3 | — |
| `js/core/bits.js`, `budget.js` | T-0.4 | T-6.1 (`createClock`, `drive`) |
| `js/core/model.js` | T-1.1 | T-1.5 (V8) |
| `js/core/constraints.js` | T-1.3 | T-5.5 (cage), T-5.6 (ineq) — **via hook**; in the end both live in their own files (`combo-table.js`, `tech-ineq.js`) and register as extensions |
| `js/core/dfs-solver.js` | T-1.4 | T-6.2 |
| `js/core/full-grid.js` | T-1.5 | T-3.2, T-6.2 |
| `js/core/symmetry.js` | T-1.6 | — |
| `js/core/digger.js` | T-1.7 | T-2.8, T-3.2, T-6.1 (`*Steps`), T-6.2 |
| `js/core/techniques.js`, `logical-solver.js` | T-2.1 | T-6.2 |
| `js/core/tech-*.js` | T-2.2…T-2.6, T-5.5, T-5.6 | — (one owner per file) |
| `js/core/difficulty.js` | T-2.7 | T-2.10 (constants), T-7.7 (per-variant clue floors) |
| `js/core/events.js` | T-3.1 | variants append their own `VOCABULARY` entries |
| `js/core/explain-data.js` | T-3.3 | — |
| `js/core/pipeline.js` | T-3.4 | T-6.1 (`runSteps`, `toWire`, `fromWire`) |
| `js/core/combo-table.js` | T-5.5 | — |
| `js/variants/registry.js`, `classic.js` | T-1.2 | `optionsOf` / `defaultOptions` / `sanitizeOptions` added later |
| `js/variants/*.js` (remaining) | T-5.1…T-5.8 | — (one owner per file); T-6.1 (resumable twins in `killer.js`, `greater-than.js`); T-7.7 (`clueFloorScale`) |
| `js/worker/*` | T-6.1 | — (`T-6.3` used `SG.workerClient.create`) |
| `js/ui/i18n.js`, `locale.en.js`, `locale.vi.js` | T-4.1 | in practice nobody: every task added its keys as a `SG.localeFragments` fragment in its own file |
| `js/ui/locale.shell.js` | T-4.2 | — |
| `index.html`, `tests.html` | T-4.2 | the task that added a JS file or a stylesheet |
| `css/tokens.css` | T-4.2 | T-7.4 |
| `css/tokens-board.css` | T-4.3 | T-7.4 |
| `css/help.css` | T-7.6 | — |
| `js/ui/exchange.js`, `tests/suites/exchange.test.js` | T-7.8 | — (the same two files exist byte for byte in sudoku-player) |
| `assets/favicon.svg` | T-7.4 | — |
| `js/ui/*` (remaining) | T-4.3…T-4.8, T-5.9, T-6.3, T-7.x | — |
| `tests/node-runner.js` | T-0.6 | the task that added a JS file |
| `tests/fixtures/regression.js` | T-6.2 | regenerated by `node tests/perf.js --update-hashes` after a change that is meant to alter puzzles |
| `tests/suites/*.test.js` | the corresponding test task | — |
| `README.md` | T-7.6 | the final documentation pass |
| `design.md`, `task.md` | the documentation pass after T-7.7 | — |
| `docs/report-v1.md` | T-7.7 | — |

⚠️ **Three hot files** (`locale.*.js`, `index.html`, `node-runner.js`) were expected to be touched by many tasks at once. What actually kept them calm: `SOURCE_FILES` lists every planned file up front and skips missing ones (so `node-runner.js` and `tests.html` needed no edits for a planned file), and strings went into `SG.localeFragments` instead of the locale packs. The rules that were given to the agents:
- Only **add new lines**; do not reorder or reformat the file.
- Add i18n keys to the **correct existing group**, in alphabetical order within the group *(superseded by fragments)*.
- Add `<script>`/paths at the **end of the corresponding group**, keeping the relative order unchanged.

---

## Appendix C — Task completion report template

Each agent, when it finishes a task, must report using this template:

```markdown
## T-x.y — <Task name> — ✅ COMPLETED / ⚠️ PARTIALLY COMPLETED / ❌ BLOCKED

### Files changed
- `path/to/file.js` (new · +120 lines)
- `path/to/other.js` (modified · +8 / −3)

### Validation
- `node tests/node-runner.js` → ✅ 184/184 green (2.4 s)
- Acceptance criteria: 5/5 met
  - [x] <criterion 1> — evidence: <measurement / test name>
  - [x] <criterion 2> — …

### Design decisions
- <decision to record + reason>

### Deviations from design.md
- <none> OR <clear description of the deviation and the reason>

### Open issues / risks for later tasks
- <notes>
```

---

## Appendix D — Smoke checkpoints

After each phase, run the corresponding checkpoint. If it fails, you **must not** move on to the next phase.

| After phase | Command / action | Expectation |
|-------------|------------------|-------------|
| P0 | `node tests/node-runner.js` | Green, ≥ 20 tests |
| P1 | `node -e "..."` generating 1 `classic9` puzzle | Prints an 81-cell grid, unique solution |
| P2 | `node tests/soak.js --quick` | ≥ 90% hit the exact difficulty on `classic9` |
| P3 | Generate via the pipeline, count the events | 7 steps, patches reconstruct the final grid correctly |
| P4 | Open `index.html` through a server, click Generate | The puzzle appears, each step can be viewed, VI/EN switching works |
| P5 | `node tests/node-runner.js --suite=variants` | 15/15 variants pass CV1–CV8 |
| P6 | Generate `samurai` in the browser | Smooth UI, a live status is shown, can be cancelled |
| P7 | `design.md` §15.5 checklist | All items carried out (in Edge; see Appendix E for what was not) |

*The commands above are the real ones (`node tests/soak.js --quick`, `node tests/node-runner.js --suite=variants`).*

---

## Appendix E — Completion summary

**State:** all tasks of this repository are done; everything is implemented and in the repository — see `git log` (the history was rebuilt after the split, in steps that follow the phases below). `T-7.5` moved to sudoku-player; `T-7.8` was added. Per-task status: Appendix A. Deviations and decisions: [`design.md`](./design.md) §18. Final QA of the combined project, the last soak and the open points: `docs/report-v1.md`.

### What shipped, per phase

| Phase | Shipped |
|-------|---------|
| **P0 Foundation** | The `SG` namespace and errors, seeded RNG with forked child streams, bit tools, the budget / cancellation token, the test harness, the Node runner (`SOURCE_FILES`, auto-discovered suites), `tests.html` |
| **P1 Classic core** | `PuzzleModel` + validation V1–V8, the variant registry and the classic 4 / 6 / 9 variants, constraint propagation with an extension hook, the DFS solver and the `stillUnique` check, full-grid generation, symmetry groups, the basic digger |
| **P2 Logical solver & difficulty** | 21 classic techniques (basic, locked, subset, fish, wing, chain) + 3 cage + 2 inequality techniques, the technique registry and solver, calibrated costs and score bands with the technique floor, the technique-bounded oracle and the guided dig, the soak tool |
| **P3 Pipeline & events** | The event system (`VOCABULARY`, patches, trace buffer), the explanation data, the 7-step pipeline with dig / rate / tune and dig samples |
| **P5 Variants** | All 15 variants: classic 4/6/9, Mega 12/16, Diagonal X, Hyper, Jigsaw, Killer, Greater-Than, Samurai, Sohei, Butterfly, Flower, Wordoku — and the symbol-set layer and the generic variants sweep (`T-5.9`, `T-5.10`) |
| **P4 UI shell** | Bilingual `SG.i18n` with fragments, the page shell and three themes, the SVG board view for every geometry, the schema-driven controls and the URL / storage store, the steps panel and explanation cards, the replay player, `SG.app`, the result panel |
| **P6 Worker & performance** | The generation worker and the client with its cooperative main-thread mode, the resumable pipeline, `tests/perf.js` + regression hashes, the puzzle cache with background pre-generation and trace regeneration |
| **P7 Polish** | Export (print / PNG / SVG / JSON / text / link / batch print) and import, accessibility (ARIA grid, keyboard, live announcements, Settings), themes and the favicon, help and the first-visit tour, the bilingual README, the final soak and clue-floor calibration — and, after the split, the exchange module with the "Play online" hand-off to sudoku-player (`T-7.8`). The trial play mode (`T-7.5`) is part of sudoku-player |

### Test counts

`node tests/node-runner.js` (about a minute) runs the **43 quick suites**: **2,818 tests, 0 failed, 0 skipped** (the 27 suites of `tests/suites/` and the 16 shared ones of `../core/tests/suites/`); `--all` adds the 8 heavy suites of `tests/manual/` (51 suites, about 3,840 tests, about nine minutes). The Generation Steps redesign added the `replay` suite and new tests to the `player`, `steps`, `worker` and `cache` suites (and a changed `ui-contract`) (42 → 43 quick suites, about 2,550 → 2,818 tests). Earlier counts, from before the suites were split into a quick and a heavy set: 3,367 tests in 43 suites at the tip of the repository at the time (after the split into two repositories it was 3,498 in 42 suites; the later UI rework replaced the tests of the removed result / steps-list features, and added `history.test.js`; the combined project had 3,524 before `play.test.js` left and `exchange.test.js`, the Play-online tests and the model-block tests came; `docs/report-v1.md` has the numbers of the combined project at its final review). The baseline before the UI existed was 2,348 tests in 25 suites (2,344 passed, 4 skipped: browser-only checks that needed the locale packs).

### Changes after the task cards

The task cards describe the first UI (a status line, a list of steps, a result panel with a thumbnail, seed and share link, a one-puzzle print dialog and a text-code export). A later rework, recorded in [`design.md`](./design.md) §10.1, §10.5, §10.6 and §18, changed it: the status line and the steps list are gone; the Summary (result) and Generation Steps (step description) are tabs of one box, with a "Difficulty Score" table; the puzzle options are on the right; a list of generated puzzles (`SG.history`, `js/ui/history.js`, `tests/suites/history.test.js`) is on the left; Print and Export choose their puzzles from that list, and Export writes readable text; a footer links to the repository. The cards T-4.x (steps panel, result panel), T-7.1 (export) and the like are kept as they were written.

**Generation Steps redesign (2026-10-28 and later).** The replay of the Generation steps tab was redesigned so that every step has a score table, the score of the steps rises steadily, and the jumps that remain are explained. The design and its decisions are in [`docs/generation-steps/report-detailed.md`](../docs/generation-steps/report-detailed.md) (short version: [`report-brief.md`](../docs/generation-steps/report-brief.md)), the task pack that built it in `tasks/generation-steps/`, and the result in [`design.md`](./design.md) §7.3, §7.5, §9.3, §10.1, §10.5, §13.10 and §13.14. What changed: the analysis `SG.replay` (`js/engine/replay.js`: complete moves from the dig log, one rating per board, honest statuses, the compact and details views, the explained jumps; its data in `tests/fixtures/replay-goldens.js` and `replay-wire.js`, generated by `tests/replay-fixtures.js`); the worker job `replay` and `SG.workerClient.replay` / `cancelReplay`; the replay steps now built by `SG.player.buildViews` from the analysis, with the "Show every move" view and a score table on every step; the badge, the callout and "Why?" of a score jump and the frame of its one culprit clue or sign (`SG.stepView.explain`, `cell--cause`, `rect.sign--cause`); and, where the page has no Worker, the **Prepare score tables** button (nothing is calculated before the press). The generation algorithm, the puzzles and the stored data did not change.

Other evidence: `node tests/soak.js --full` — 2,125 puzzles over every (variant × level) combination, **no violation of I1–I7**, 100 % exact-level hits everywhere except classic9 medium (99 %); `node tests/perf.js` — every cell of the §9.1 budget table met in Node; `tests/fixtures/regression.js` — 20 seeds × combinations of regression hashes.

### Not done / open

Real screen-reader test; Firefox, Safari and a real mobile device; a print to a physical printer; the ideas listed at the end of [`design.md`](./design.md) §18. Main-thread (`file://`) mode can still stall the page for up to the length of one unsplittable piece of work (70–86 ms for a Killer DFS slice, up to ~300 ms for the cage layout of a hard Killer), and the score tables of the replay are calculated there on the page, only after the user presses **Prepare score tables**. "Play online" was checked in headless Edge (over `http` and `file://`) up to the opening of the new tab; opening the puzzle in the player is verified from the player's side.
