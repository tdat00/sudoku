# Sudoku Generator — Design Document

> **Document language:** English (translated from the original Vietnamese specification at the user's request; the Vietnamese UI strings quoted in §7.4 and §11 are product copy and stay in Vietnamese).
> **Version:** 1.2 · **Status:** Implemented — all tasks of [`task.md`](./task.md) are done. The sections below describe the implementation as built. Where it differs from the first plan the text says so, and [§18](#18-implementation-notes--deviations) lists every deviation in one table. This repository holds **the generator only**: it was split off a combined project, and the trial-play mode now lives in the sibling repository [sudoku-player](https://github.com/tdat00/sudoku-player), which opens the puzzles this one hands over ([§10.9](#109-hand-off-to-the-player-exchange)).
> **Related documents:** [`task.md`](./task.md) — the task list the agents worked from, with a completion summary (Appendix E) · [`README.md`](./README.md) — how to run, test and extend · `docs/final-report.md` — final QA report (written before the split and before the UI rework of §10.1, so its screenshots and UI notes are a snapshot).

---

## Table of contents

1. [Overview & Goals](#1-overview--goals)
2. [Technical Constraints](#2-technical-constraints)
3. [Overall Architecture](#3-overall-architecture)
4. [Unified Puzzle Model](#4-unified-puzzle-model)
5. [Variant Catalogue & Mapping](#5-variant-catalogue--mapping)
6. [Core Algorithms](#6-core-algorithms)
7. [Generation Pipeline & Step Event System](#7-generation-pipeline--step-event-system)
8. [Variant-Specific Algorithms](#8-variant-specific-algorithms)
9. [Performance & Concurrency](#9-performance--concurrency)
10. [UI/UX Design](#10-uiux-design)
11. [Bilingual Support (i18n)](#11-bilingual-support-i18n)
12. [Directory Structure & Code Conventions](#12-directory-structure--code-conventions)
13. [Internal API Contracts](#13-internal-api-contracts)
14. [Data Formats](#14-data-formats)
15. [Testing Strategy](#15-testing-strategy)
16. [Risks & Mitigations](#16-risks--mitigations)
17. [Implementation Roadmap](#17-implementation-roadmap)
18. [Implementation notes & deviations](#18-implementation-notes--deviations)

---

## 1. Overview & Goals

### 1.1 Product description

A static web app written in **plain HTML + CSS + JavaScript** — no framework, no build step — that lets users:

- Generate Sudoku puzzles in **many different variants**.
- Choose a **target difficulty** and be guaranteed that the generated puzzle lands exactly at that difficulty.
- **Step through** the generation process — this is the key differentiator. The site does not just "spit out" a Sudoku puzzle; it **teaches users how a Sudoku puzzle is made**, one visible change of the board at a time.
- Switch instantly between **English and Vietnamese** across the entire UI and all explanatory content.

### 1.2 Goals

| # | Goal | Measurable criterion |
|---|------|----------------------|
| G1 | Fast generation | 9×9 Medium < 150 ms (p95) on a mid-range desktop |
| G2 | Guaranteed unique solution | 100% of generated puzzles have **exactly one solution** (unique solution) |
| G3 | Guaranteed difficulty | ≥ 95% of generated puzzles fall within the difficulty band the user selected |
| G4 | Support all 15 variants | See [§5](#5-variant-catalogue--mapping) |
| G5 | Visualise the process | Every replay step has: a title, a bilingual description, a visible change on the grid, and during the dig the running counters (§7.3) |
| G6 | Fully bilingual | 0 hard-coded strings; 100% of translation keys have both `en` and `vi` |
| G7 | Never block the UI | Every task > 50 ms runs in a Web Worker or is sliced across frames |
| G8 | Reproducible | Same `seed` + same configuration ⇒ the same Sudoku puzzle, 100% of the time |

**Status:** G1–G8 are met as far as they can be measured in Node (`tests/soak.js`: 99–100 % exact-level hits, no invariant violation; `tests/perf.js`: p95 inside every budget of §9.1; `tests/fixtures/regression.js`: the same seed gives the same puzzle). G7 holds in worker mode; in main-thread mode it holds up to the granularity limit of one unsplittable piece of work (§9.3). Real-browser timing on the reference machine of §9.1 was not measured.

### 1.3 Non-goals

- No backend, no user accounts, no cloud storage.
- No scoring or leaderboards. Solving the puzzles is the job of the separate **sudoku-player** app (notes, undo/redo, error checking, technique hints, a timer), which receives a puzzle from this app through the "Play online" hand-off ([§10.9](#109-hand-off-to-the-player-exchange)); this app contains no play mode.
- No support for IE11 or any browser without ES2020.
- No npm/bundler/transpiler in the final product.

---

## 2. Technical Constraints

### 2.1 What "pure HTML/JS/CSS" means

| Constraint | Decision |
|------------|----------|
| No bundler, no transpiler | Use classic `<script>` tags (classic script); **no ES Module syntax** (`import`/`export`) |
| No external libraries | Write everything ourselves: RNG, solver, test harness, i18n, SVG renderer |
| Modularity is still required | Use a **single global namespace `SG`** + one IIFE per file |
| Must run inside a Worker | `importScripts()` can only load classic scripts ⇒ reinforces the decision above |
| Must run when opened via `file://` | `new Worker()` and `fetch()` are blocked on `file://` ⇒ **a fallback mechanism is mandatory** |

> ⚠️ **Key architecture decision (ADR-001):**
> All code uses the following **UMD-lite** pattern, so that the same file runs in 3 environments: the main page, a Web Worker, and Node.js (for headless tests).
>
> ```js
> (function (root) {
>   'use strict';
>   const SG = root.SG = root.SG || {};
>   // ... definitions
>   SG.rng = { /* ... */ };
> })(typeof self !== 'undefined' ? self : globalThis);
> ```
>
> **Strictly forbidden:** `import`, `export`, `require()` in the `js/` directory. Files that hold state a running page must keep (`SG.i18n`, `SG.store`, `SG.app`, `SG.workerClient`, `SG.cache`, …) start with a guard such as `if (SG.i18n && typeof SG.i18n.t === 'function') return;`, so loading a file twice never replaces the live instance.

### 2.2 Environment matrix

| Environment | Worker | Status | Notes |
|-------------|--------|--------|-------|
| Chrome/Edge via `http(s)://` | ✅ | Full | Primary environment |
| Firefox / Safari via `http(s)://` | ✅ | Supported target | Not part of the manual checks: only Chromium-based Edge was run (see §18) |
| Opening `file://index.html` directly | ❌ | Has fallback | Runs on the main thread in cooperative slices of ≈12 ms (`SG.pipeline.runSteps` driven by `SG.workerClient`, yielding through a `MessageChannel` round trip); the pre-generator of `SG.cache` is off |
| Node.js ≥ 18 | — | Tests only | `tests/node-runner.js` loads files with `vm.runInThisContext` |

### 2.3 Target browsers

Chrome/Edge ≥ 100, Firefox ≥ 100, Safari ≥ 15.4. Allowed features: `BigInt`, optional chaining, `Array.prototype.flat`, `structuredClone` (with a small polyfill), CSS `:has()` (with a fallback), CSS Custom Properties, `Intl`. In practice the code uses ES2020 syntax, `Intl` (`NumberFormat`, `PluralRules`), `MessageChannel`, `localStorage`, `<dialog>`, SVG and, for one cosmetic highlight, CSS `:has()`; `structuredClone` is used only where it exists. No polyfill is shipped.

---

## 3. Overall Architecture

### 3.1 Layering

```
┌──────────────────────────────────────────────────────────────┐
│  UI LAYER  (js/ui/)                                          │
│  app · controls · board-view(SVG) · step-view · explain      │
│  player · result-view · symbols · i18n · store(URL+storage)  │
│  cache · export · exchange · a11y · theme · help             │
└───────────────▲──────────────────────────────┬───────────────┘
                │ GenerationEvent[]            │ GenerateRequest
                │ (progress/step/done/error)   │ (variant, difficulty, seed…)
┌───────────────┴──────────────────────────────▼───────────────┐
│  ORCHESTRATION LAYER  (js/worker/)                           │
│  worker-client  ──►  gen.worker.js   │  Main-thread fallback │
└───────────────▲──────────────────────────────┬───────────────┘
                │                               │
┌───────────────┴──────────────────────────────▼───────────────┐
│  GENERATION LAYER  (js/core/)                                │
│  pipeline · full-grid · digger · symmetry · difficulty       │
└───────────────▲──────────────────────────────┬───────────────┘
                │                               │
┌───────────────┴──────────────────────────────▼───────────────┐
│  SOLVER LAYER  (js/core/)                                    │
│  dfs-solver (counting) · logical-solver (human techniques)   │
│  tech-basic/subset/fish/wing/chain/cage/ineq                 │
└───────────────▲──────────────────────────────┬───────────────┘
                │                               │
┌───────────────┴──────────────────────────────▼───────────────┐
│  MODEL LAYER  (js/core/ + js/variants/)                      │
│  model (cells/units/constraints) · constraints · bits · rng  │
│  registry + 15 variant builders                              │
└──────────────────────────────────────────────────────────────┘
```

**Dependency rule:** a lower layer **never** knows about a higher layer. The core layers (`js/core/`, `js/variants/`) **must not** touch `document`, `window.location`, or any other DOM API — that is the precondition for headless testing with Node.

### 3.2 Main data flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as app.js
    participant WC as worker-client
    participant W as gen.worker
    participant P as pipeline
    U->>UI: Choose variant + difficulty → click "Generate"
    UI->>WC: generate(config, onEvent)
    WC->>W: postMessage({type:'generate', session, config})
    W->>P: runSteps(config, emit) — in slices of ≈12 ms
    loop Every step / progress milestone
        P-->>W: emit(GenerationEvent)
        W-->>WC: postMessage({type:'events', session, events})  — batches, ≈30 ms
        WC-->>UI: onEvent(event)  → trace buffer (and the app's `generate:progress` event)
        UI-->>U: The page shows the empty board and the Cancel button; no text follows the events
    end
    P-->>W: PuzzleResult
    W-->>WC: postMessage({type:'done', session, result})  — SG.pipeline.toWire
    WC-->>UI: resolve(puzzle)  — SG.pipeline.fromWire rebuilds the model
    UI-->>U: Show the finished puzzle + the replay steps (from result.digLog) + the Summary tab (score table) + a new entry in the list of generated puzzles
```

In main-thread mode the same `runSteps` generator is driven by the client itself, without `postMessage` ([§9.3](#93-web-worker--fallback-mechanism)).

### 3.3 Separating "real speed" from "viewing speed"

This is the part of the "show every step" requirement that is easiest to get wrong.

> **ADR-002 — Never slow the algorithm down for the sake of animation.**
> The worker runs **at full speed**. Besides its events (the *trace*), the digger keeps a compact **dig log** of the dig that became the puzzle (`PuzzleResult.digLog`, §13.9). The UI shows the finished puzzle at once and builds the **replay** from that log afterwards; nothing plays by itself, the user steps through it by hand ([§7.3](#73-replay-engine-in-the-ui-layer)). It replaced a player that played the trace back at a chosen speed (§18).
>
> - Benefit: the actual generation time is unaffected; users can go to any step, forwards or backwards, at their own pace.
> - The replay does not depend on the trace: the dig log is recorded whatever the verbosity, it is the same in a worker and on the main thread and on every board size, and it holds decisions only (a few hundred small entries even on Samurai, about 15 kB as JSON).
> - Mode `trace: 'off' | 'summary' | 'full'` still selects the events. The page sends no `trace` (the "Replay detail" option is gone), so the pipeline's default `summary` applies; its step events go to the trace buffer and to the `generate:progress` event of `SG.app` (the page does not show them while a run goes on). `full` (every `micro` event) is for direct callers and the tests. `SG.pipeline` downgrades `full` to `summary` for boards with more than 300 cells (`SG.pipeline.FULL_TRACE_MAX_CELLS`; warning `trace.downgraded`, event `buildModel.traceDowngraded`), which among the 15 variants is the case for Samurai (369 cells) only (Sohei, 288, keeps `full`). Full recording costs less than 35% of the generation time (asserted by `pipeline.test.js`).
> - Memory limit: the trace is down-sampled when it exceeds `maxTraceEvents` (default 20 000, `SG.events.capTrace` / `createTraceBuffer`); every non-`micro` event is kept, the `micro` events are thinned evenly, and what the dropped ones changed is carried by synthesised `trace.coalesced` events, so applying a capped trace still ends on the same board. The replay of the page does not read the trace, so the limit no longer shapes what it shows.

---

## 4. Unified Puzzle Model

> **This is the heart of the design.** Every variant — from Mini 4×4 to 5-grid Samurai, from Killer to Greater-Than — is reduced to **a single data structure**. That is what lets us get by with **one** solver and **one** generator.

### 4.1 Core idea

Any Sudoku puzzle = **a constraint satisfaction problem (CSP)** consisting of:

1. A set of **cells** numbered `0 … N-1`.
2. Each cell has a **domain** — a subset of `{1 … D}`.
3. A set of **units (all-different groups)** — each unit is a list of cell indices that must hold pairwise distinct values.
4. A set of **extra constraints** — sum cages, inequalities, …
5. **Display (layout)** information — the drawing coordinates of each cell, region borders, background colours.

**Important consequences:**

- *Rows, columns, 3×3 boxes, Jigsaw regions, diagonals (Sudoku X), the 4 windows (Hyper)* → are all just **units**. No special-case code is needed.
- *Samurai / Butterfly / Flower / Sohei* → overlapping grids that **share cell indices**. A cell in an overlap region belongs to the units of both grids. There is no need for a separate "multi-grid solver" — it is simply a larger CSP.
- *Wordoku / Color / Alphabet Sudoku* → differ only in the **displayed symbol set**. The core always works with the integers `1…D`.

### 4.2 Structure definitions

```js
/**
 * @typedef {Object} PuzzleModel  — immutable once built
 * @property {string} variantId        'classic9' | 'jigsaw9' | 'samurai' | ...
 * @property {number} cellCount        N — total number of unique cells
 * @property {number} digits           D — number of values (4, 6, 9, 12, 16)
 * @property {Int32Array[]} units      units[u] = array of the cell indices of unit u
 * @property {Int32Array[]} cellUnits  cellUnits[c] = array of the indices of the units containing cell c
 * @property {Int32Array[]} peers      peers[c] = array of "neighbour" cells (sharing ≥1 unit)
 * @property {UnitMeta[]} unitMeta     { kind:'row'|'col'|'box'|'region'|'diag'|'window'|'cage', gridIndex, label, partial? }
 * @property {Cage[]} cages            Killer — [] if unused
 * @property {Ineq[]} inequalities     Greater-Than — [] if unused
 * @property {Layout} layout           Drawing information
 * @property {SymbolSet} symbols       { mode, labels[] } — labels[v-1] is the text drawn for value v
 * @property {Int32Array} fixedCells   One entry per cell: 0 = free, v > 0 = forced to v (e.g. the Wordoku line); used by the full-grid generator only
 */

/** @typedef {Object} Cage   @property {Int32Array} cells @property {number} sum @property {boolean} distinct */
/** @typedef {Object} Ineq   @property {number} a @property {number} b  // constraint value[a] < value[b] */

/**
 * @typedef {Object} Layout
 * @property {number} rows, cols            Size of the drawing canvas (e.g. 21×21 for Samurai)
 * @property {Int32Array} cellRow, cellCol  Canvas coordinates of each cell
 * @property {Int32Array} cellRegion        The cell's main region (box/region) → used for drawing borders & colouring
 * @property {Array<{cells:Int32Array,kind:string}>} overlays  Hyper windows, X diagonals…
 * @property {Array<{gridIndex:number,originRow:number,originCol:number}>} subGrids  Multi-grid
 */
```

### 4.3 Representing the solve state

Separate the **model (immutable)** from the **state (mutable)** so that copying/restoring is cheap:

```js
/**
 * @typedef {Object} SolveState
 * @property {Int32Array} candidates  candidates[c] = bitmask of the values still possible
 *                                     bit (v-1) = 1 ⇒ value v is still possible
 * @property {Int32Array} value       value[c] = the value already fixed, 0 if not yet
 * @property {number} unsolvedCount
 */
```

> **Why `Int32Array` bitmasks:** `D ≤ 16`, so every value domain fits in the low 16 bits of an `int32`. Intersection/union/count (`popcount`) run as bit operations — roughly 20–50× faster than `Set`/`Array` — and an `Int32Array` is copied by a single memcpy. Note the allocation rule in §9.2 R5: `.slice()` is fine for one-off copies, but inside hot loops copy with `.set()` onto a pre-allocated scratch buffer so the copy allocates nothing.

### 4.4 Why `peers` is precomputed

`peers[c]` = the set of cells from which a value must be eliminated when cell `c` is fixed. Computing it once when the model is built turns constraint propagation into a linear loop over a flat array — there is no need to walk the units again.

### 4.5 Model validation

Every variant builder **must** pass `SG.model.validate(model)`:

| Check | Description |
|-------|-------------|
| V1 | Every unit has exactly `D` cells (except special units marked `partial`) |
| V2 | Every cell index in the units lies within `[0, cellCount)` |
| V3 | Every cell belongs to ≥ 1 unit |
| V4 | `peers` is symmetric: `b ∈ peers[a] ⟺ a ∈ peers[b]` |
| V5 | `cellRow`/`cellCol` are pairwise unique (no two cells are drawn on top of each other) |
| V6 | Cages: no cell shared between two cages; feasible sum (`minSum ≤ sum ≤ maxSum`) |
| V7 | Inequalities: `a ≠ b`, no contradictory cycle (`a<b` and `b<a`) |
| V8 | At least one complete solution exists (trial-run `dfs.solve` with a small budget: 50 000 nodes / 500 ms; it only runs when V1–V7 pass, and running out of budget is a warning, not an error) |

`validate` returns `{ ok, errors, warnings }`; `validate(model, { solve: false })` skips V8. A Killer cage with at least two cells is also registered as a `partial` all-different unit (`kind: 'cage'`, label `K<n>`), which is how the engine makes the cells of a cage peers of each other.

---

## 5. Variant Catalogue & Mapping

### 5.1 Summary table

| ID | Name (VI) | Name (EN) | D | Cells | Extra units | Extra constraints | Complexity |
|----|-----------|-----------|---|-------|-------------|-------------------|------------|
| `classic4` | Sudoku Mini 4×4 | Mini Sudoku 4×4 | 4 | 16 | — | — | ⭐ |
| `classic6` | Sudoku Mini 6×6 | Mini Sudoku 6×6 | 6 | 36 | 2×3 boxes | — | ⭐ |
| `classic9` | Sudoku Cổ điển | Classic Sudoku | 9 | 81 | 3×3 boxes | — | ⭐ |
| `jigsaw9` | Sudoku Ghép hình | Jigsaw / Nonomino | 9 | 81 | 9 irregular regions | — | ⭐⭐⭐ |
| `mega12` | Sudoku Khổng lồ 12×12 | Mega Sudoku 12×12 | 12 | 144 | 3×4 boxes | — | ⭐⭐ |
| `mega16` | Sudoku Quái vật 16×16 | Monster Sudoku 16×16 | 16 | 256 | 4×4 boxes | — | ⭐⭐⭐ |
| `diagonalX` | Sudoku Đường chéo (X) | Diagonal Sudoku (X) | 9 | 81 | 2 diagonals | — | ⭐⭐ |
| `hyper` | Sudoku Siêu vùng | Hyper / Windoku | 9 | 81 | 4 windows (3×3) | — | ⭐⭐ |
| `killer` | Sudoku Sát thủ | Killer Sudoku | 9 | 81 | — | Cage (sum + all-different) | ⭐⭐⭐⭐ |
| `greaterThan` | Sudoku So sánh | Greater-Than Sudoku | 9 | 81 | — | Inequalities between adjacent cells | ⭐⭐⭐⭐ |
| `samurai` | Sudoku Samurai | Samurai Sudoku | 9 | 369 | 5 overlapping grids | — | ⭐⭐⭐⭐⭐ |
| `butterfly` | Sudoku Cánh bướm | Butterfly Sudoku | 9 | 144 | 4 overlapping grids | — | ⭐⭐⭐⭐ |
| `flower` | Sudoku Bông hoa | Flower Sudoku | 9 | 189 | 5 overlapping grids | — | ⭐⭐⭐⭐⭐ |
| `sohei` | Sudoku Sohei | Sohei Sudoku | 9 | 288 | 4 grids in a cross layout | — | ⭐⭐⭐⭐⭐ |
| `wordoku` | Sudoku Chữ | Wordoku | 9 | 81 | (optional diagonal) | Cells fixed by a word | ⭐⭐⭐ |

**Presentation-only layer, applied on top of any variant** (`js/ui/symbols.js`; switching it never regenerates the puzzle):

| Symbol mode | VI | EN | Notes |
|-------------|----|----|-------|
| `digits` | Chữ số | Digits | Default. The variant's own labels: Mega 16×16 draws `0`–`F` |
| `letters` | Chữ cái | Letters | A, B, C, … |
| `colors` | Màu sắc | Colors | A 16-entry palette (`--sg-board-sym-1..16`) **plus** a small geometric symbol so that colour is never the only carrier of the value; the symbol can be switched off in Settings (`colorAuxSymbol`) |
| `shapes` | Hình học | Shapes | 16 distinct geometric shapes (circle, square, triangle, diamond, star, plus, hexagon, heart, …) |
| `word` | Theo từ | Word-based | Wordoku only (its default); the letters of the key word |

Which modes a variant offers is its `symbolModes`: `digits`, `letters`, `colors`, `shapes` for every variant except Mega (`digits` only — its symbol set is the variant option `symbolSet`, see [§8.6](#86-mega-1212--1616)) and Wordoku (`word`, `digits`).

**Levels offered** (`difficultySupport`; the UI only lists these, and `SG.pipeline` refuses the others with `difficulty.unsupportedLevel`):

| Variant | Levels |
|---------|--------|
| `classic4`, `classic6` | veryEasy, easy (`classic6` has **no** `medium`: 0–3% of its puzzles landed there, so it is not offered) |
| `classic9`, `diagonalX`, `hyper`, `jigsaw9` | veryEasy … evil |
| `killer`, `greaterThan`, `wordoku` | veryEasy … expert |
| `mega12`, `mega16`, `samurai`, `sohei`, `butterfly` | veryEasy … hard |
| `flower` | veryEasy … hard (`medium` is offered since the clue-floor calibration of T-7.7; it was missing before) |

### 5.2 Multi-grid geometry

Each sub-grid is a standard 9×9 grid placed at an origin `(originRow, originCol)` on a shared canvas. Cells at coinciding canvas positions are **the same cell** (they share an index).

| Variant | Canvas | Sub-grid origins | Overlap region | Unique cells |
|---------|--------|------------------|----------------|--------------|
| `samurai` | 21×21 | (0,0) (0,12) (12,0) (12,12) (6,6) | 4 boxes (3×3) | 369 |
| `butterfly` | 12×12 | (0,0) (0,3) (3,0) (3,3) | 6×6 central region | 144 |
| `flower` | 15×15 | (3,3)=centre, (0,3) (6,3) (3,0) (3,6) | each petal overlaps the centre in a 6×9 area | 189 |
| `sohei` | 21×21 | (0,6) (6,0) (6,12) (12,6) | 4 boxes (3×3), empty middle | 288 |

> ⚠️ **Validation requirement:** the builder must self-check that every overlap region is **aligned with the 3×3 box boundaries** (origin offset divisible by 3) and that it computes exactly the number of unique cells listed in the table. On a mismatch ⇒ throw an error while building the model; never skip it silently.

### 5.3 Rules for adding a new variant

A new variant only needs to register a definition with `SG.variants.register`:

```js
SG.variants.register({
  id: 'diagonalX',
  i18nKey: 'variant.diagonalX',
  group: 'extraRegions',            // UI grouping; 'group.<id>' must exist in the locale packs
  digits: 9,
  difficultySupport: ['veryEasy','easy','medium','hard','expert','evil'],
  defaultSymbolMode: 'digits',
  symbolModes: ['digits','letters','colors','shapes'],
  options: [ /* schema of variant-specific options, used to auto-generate the UI */ ],
  build: function (opts, rng) { /* → PuzzleModel */ },
  // Optional: hooks into the pipeline
  postGenerate: null,   // e.g. Killer generates cages once the full grid exists (a twin `postGenerate.steps` makes it resumable)
  digStrategy: null,    // e.g. Greater-Than digs "signs" instead of "cells" (a strategy id registered with SG.digger.registerStrategy)
  fastSeed: null,       // e.g. pre-fill the diagonal boxes before the full-grid search
  // Optional: tuning
  restartThreshold: undefined,                       // failed guesses per full-grid attempt (Mega: 300 / 400)
  clueFloor: undefined,                              // own clue floor per level, see §6.7
  clueFloorScale: { medium: 0.83, hard: 0.8, expert: 0.8 }   // calibration of the derived floor, see §6.7
});
```

`register` validates the definition (a typo fails when the file loads, not in the middle of a run) and rejects a duplicate `id`. The UI never reads `options` directly: `SG.variants.optionsOf(id)` returns them in one normalised shape (§13.8). The worked example of a complete new variant is in [`README.md`](./README.md#adding-a-variant).

You **must not** add `if (variant === 'x')` anywhere in `js/core/`. Every difference must go through the registry.

---

## 6. Core Algorithms

### 6.1 Seeded RNG

Mandatory for reproducibility (G8) and for stable tests.

- Algorithm: **mulberry32** (32-bit, a single state word, period 2³², good distribution, ~3 lines of code).
- Initialisation: `seed` is a `uint32`. If the user does not supply one, use `Date.now() ^ (Math.random()*2**32)`.
- API: `next()` → `[0,1)`, `int(n)` → `[0,n)`, `pick(arr)`, `shuffle(arr)` (Fisher–Yates), `fork(tag)` → an independent child RNG (so that a change in a later step does not alter the result of an earlier step).

> **Why `fork` matters:** if one shared RNG is used for both "full grid generation" and "hole digging", modifying the digging algorithm would also change the full grid, rendering regression tests useless. Each phase takes its own child stream. The names are a stability contract (same seed + configuration ⇒ same puzzle, guarded by the hashes of `tests/fixtures/regression.js`): `model` (variant `build`), `grid#A` (full grid of attempt A), `extra#A` (`postGenerate`), `dig#A.T` (dig sample T of attempt A). `fork` derives the child from `(seed, tag)` with a 32-bit FNV-1a string hash. The UI hashes a free-text seed with the same FNV-1a over the NFC-normalised, trimmed text (§14.2).

### 6.2 Step 1 — Full grid generation

**Goal:** produce a complete, valid solution with a uniformly random distribution.

**Algorithm: randomised DFS + constraint propagation + MRV.**

```
function generateFullGrid(model, rng, budget):
    state ← initState(model)              # every cell has all D candidates
    applyFixedCells(state, model)          # Wordoku: the diagonal is predetermined
    if not propagate(state): fail
    return dfsFill(state, rng, budget)

function dfsFill(state, rng, budget):
    if budget.exceeded(): throw TimeoutError
    c ← the unassigned cell with the smallest popcount(candidates[c])   # MRV
    if no unassigned cell remains: return state                         # done
    if popcount(candidates[c]) == 0: return FAIL
    for v in shuffle(candidatesOf(c), rng):
        snapshot ← state.cloneInto(scratch[depth])              # .set() into pooled buffer, no alloc
        assign(state, c, v)
        if propagate(state) and dfsFill(state, rng, budget) ≠ FAIL:
            return state
        state ← snapshot                                        # backtrack
    return FAIL
```

**Optimisation specific to `classic9`:** fill the 3 boxes on the main diagonal first (they are independent of one another ⇒ only 3 random permutations of 1…9 are needed), then run DFS on the rest. This cuts ~40% of the time. It is an **optional** optimisation registered through the registry (`fastSeed`), not a special case inside the core. Mega 12/16 pre-fill the diagonal boxes of their box grid the same way, and the multi-grid boards use `fastSeed` to decide the cells that several grids share (`fastSeedOverlaps`) before the search starts.

**For large / multi-grid boards** (`mega16`, `samurai`, `flower`, `sohei`): plain DFS can wander for a long time. Apply a **budgeted restart**: if the number of failed guesses exceeds `restartThreshold` (default `cellCount × 50`; a variant may declare its own — Mega 12/16 use 300 / 400, which `SG.fullGrid.generate` reads from the variant definition unless its caller passes the option), abandon the attempt and start over with an independent child stream. After 50 restarts the last attempt runs without a limit. This strategy (a Las Vegas restart) is in practice much faster than persisting on a bad branch.

### 6.3 Constraint propagation

Runs to a fixpoint, using a worklist to avoid rescanning everything:

| Rule | Applies to | Description |
|------|------------|-------------|
| P1 — Peer elimination | All variants | Fixing `c=v` ⇒ clear bit `v` from the `candidates` of every `peers[c]` |
| P2 — Naked single | All variants | `popcount(candidates[c]) == 1` ⇒ fix it immediately |
| P3 — Hidden single | All variants | Within a unit, if value `v` is still possible in only one cell ⇒ fix that cell |
| P4 — Cage sum bounds | Killer | For a cage: `sum - maxRemaining ≤ cellValue ≤ sum - minRemaining`; combined with the sum-combination lookup table |
| P5 — Inequality propagation | Greater-Than | `a<b` ⇒ `max(cand[a]) < max(cand[b])`, `min(cand[b]) > min(cand[a])`; two-way pruning |
| P6 — Contradiction detection | All variants | A cell with 0 candidates, or a unit with no room left for some value ⇒ FAIL immediately |

> **P4 — cage sum combination table:** precomputed when `combo-table.js` loads; `SG.comboTable.table[size][sum]` = array of bitmasks of the feasible value sets (512 masks in all, a few KB, built for digits 1–9 only). It makes Killer affordable: a cage is reduced to a handful of digit sets and O(1) lookups. P4 and P5 are not built into `constraints.js`: they are **propagation extensions** registered through `SG.constraints.registerExtension({ id, prepare, propagate })` — P4 by `SG.comboTable.enablePropagation(variantId)`, P5 by `SG.ineq.ensureExtension()` — and they register **lazily** (on the first Killer / Greater-Than build), so a plain page load does not touch the engine. A model that is built by any other route (`SG.pipeline.fromWire`, `SG.cache` deserialisation) must call the same functions before `SG.dfs` is used on it, otherwise the DFS silently ignores cage sums and signs.

### 6.4 DFS solver that counts solutions (`dfs-solver`)

```
solutionCount(model, givens, limit = 2) → 0 | 1 | 2    // 2 means "≥ 2"
```

- Stop early as soon as the `limit`-th solution is found — **never** count them all.
- Shares `propagate` with the grid generator.
- Takes a `budget` (max nodes + a time limit) and a cancellation token.

### 6.5 ⭐ Unique-solution check — the optimised version

This is **performance hotspot #1**: it is called hundreds of times during hole digging.

**Naive approach:** remove the cell → `solutionCount(puzzle) == 1`? → cost = re-solving the whole puzzle from scratch every single time.

**Optimised approach (used in this project):**

> **Applied theorem:** Suppose puzzle `P` currently has a unique solution and we remove the clue at cell `c` (true value `v`), producing `P'`. Then **`P'` still has a unique solution if and only if, for every `w ∈ candidates_{P'}(c), w ≠ v`, the puzzle `P' ∪ {c = w}` has no solution.**
>
> **Why:** every solution of `P'` assigns some value to `c`. The original solution assigns `v`. A second solution exists ⟺ it assigns some `w ≠ v` to `c` (if it assigned `v`, it would also be a solution of `P`, and `P` is unique ⇒ it coincides with the original solution).

```
function stillUnique(model, givens, c, v):
    cands ← candidatesAfterPropagate(model, givens, c)   # usually only 2–4 values remain
    for w in cands where w ≠ v:
        if hasSolution(model, givens ∪ {c = w}):
            return false          # found a second solution → cell c must be put back
    return true
```

**Why it is much faster:**

| | Naive | Optimised |
|---|-------|-----------|
| Number of solves | 1 solve, which must find both solutions | `k-1` solves (k = number of candidates, usually 2–4) |
| Cost of each solve | Find solution 1 (easy), then turn the whole search space upside down looking for solution 2 (very expensive when none exists) | Each solve is a puzzle that has been **forced wrong** ⇒ constraint propagation usually detects the contradiction within a few steps |
| Measured | ~1.0× | **≈ 3.7–4×** on the dig-time calls where the removal keeps the puzzle unique (`solver.test.js` asserts ≥ 3×), but only ≈ 1.8× over a whole dig, because refused removals cost both approaches about the same. The ~5–12× of the first estimate was too optimistic; the narrower reading of the criterion was accepted |

Two additional minor optimisations:
- **Reuse propagation results:** keep the `state` after propagating `P'` once; each `w` only clones from that state.
- **Order `w` heuristically:** try the `w` with the least support first — it usually hits a contradiction earliest.

### 6.6 Logical solver based on human-player techniques (`logical-solver`)

This solver is both the **difficulty yardstick** and the **difficulty filter** during hole digging.

```js
SG.logicalSolver.solve(model, givens, {
  allowedTechniques: ['nakedSingle','hiddenSingleBox', ...],  // null = every registered technique that applies to the variant
  collectSteps: true,
  assumeUniqueness: true,   // false: skip techniques that rely on "one solution" (uniqueRectangle)
  stopOnStuck: true,
  budget
})
// → { solved, status: 'solved'|'stuck'|'contradiction', steps: [...], techniqueCounts: {...},
//     hardestTechnique, score, state, solution? }
```

The loop: repeatedly **try the techniques in order from cheap → expensive** (ascending `order`), apply the first finding of the cheapest technique that has an effect, and start again from the cheapest, until the puzzle is solved or the solver is stuck (stuck is a normal result, never an error). Techniques are plain registry entries (`SG.techniques.register({ id, group, baseCost, order, i18nKey, variantScope, assumesUniqueness, find })`; the contract is the header of `js/core/techniques.js`); the solver never changes when one is added.

> **Singles are techniques.** The solver deliberately never calls `SG.constraints.propagate`: that engine places naked and hidden singles on its own, so they would be consumed silently — neither attributed nor scored — and `allowedTechniques: ['nakedSingle']` would still solve puzzles that need hidden singles. It starts from a peer-consistent grid and applies every finding with `assign` / `eliminate` only. Cage sums and inequalities are likewise left to their techniques (`tech-cage.js`, `tech-ineq.js`) instead of the propagation extensions.

#### Technique ladder

26 techniques are registered: **21 classic** (the 20 rows of the first plan, with Hidden Single split by unit kind and the two Quads split into Naked / Hidden), **3 Killer** (`cage` group) and **2 Greater-Than** (`ineq` group). `order` is the position in the loop (×10 spacing, so a technique can be inserted); the *design score* is the first plan's `baseCost` (what the technique registers), the *calibrated cost* is what `SG.difficulty` actually scores with (`SG.difficulty.COSTS`, see below).

| `order` | `id` | Technique (EN) | Group | Design score | Calibrated cost |
|--------:|------|----------------|-------|-------------:|----------------:|
| 10 | `nakedSingle` | Naked Single | `basic` | 1 | 1 |
| 20 | `hiddenSingleBox` | Hidden Single (box/region) | `basic` | 2 | 1.25 |
| 30 | `hiddenSingleLine` | Hidden Single (row/col) | `basic` | 3 | 1.5 |
| 40 | `pointing` | Pointing Pair/Triple | `locked` | 7 | 7 |
| 50 | `boxLine` | Box/Line Reduction | `locked` | 7 | 8 |
| 55 | `cageCombo` | K1 Cage Sum Combination | `cage` | 10 | 10 |
| 60 | `nakedPair` | Naked Pair | `subset` | 9 | 63 |
| 65 | `ineqChain` | I1 Inequality Chain | `ineq` | 12 | 12 |
| 70 | `hiddenPair` | Hidden Pair | `subset` | 11 | 77 |
| 80 | `nakedTriple` | Naked Triple | `subset` | 15 | 105 |
| 85 | `minMaxForcing` | I2 Min/Max Forcing | `ineq` | 22 | 22 |
| 90 | `hiddenTriple` | Hidden Triple | `subset` | 18 | 126 |
| 95 | `ruleOf45` | K2 Rule of 45 (innie/outie) | `cage` | 28 | 28 |
| 100 | `nakedQuad` | Naked Quad | `subset` | 24 | 168 |
| 105 | `hiddenQuad` | Hidden Quad | `subset` | 24 | 182 |
| 110 | `xWing` | X-Wing | `fish` | 32 | 190 |
| 120 | `simpleColouring` | Simple Colouring | `fish` | 36 | 215 |
| 130 | `swordfish` | Swordfish | `fish` | 42 | 250 |
| 135 | `cageSplit` | K3 Cage Splitting | `cage` | 40 | 40 |
| 140 | `xyWing` | XY-Wing | `wing` | 48 | 480 |
| 150 | `xyzWing` | XYZ-Wing | `wing` | 54 | 540 |
| 160 | `jellyfish` | Jellyfish | `fish` | 56 | 335 |
| 170 | `wWing` | W-Wing | `wing` | 60 | 600 |
| 180 | `uniqueRectangle` | Unique Rectangle (types 1–2; `assumesUniqueness`) | `wing` | 66 | 660 |
| 190 | `forcingChain` | Forcing Chain / X-Cycle (chains of at most `maxChainLength` = 12 links) | `chain` | 90 | 720 |
| 200 | `nishio` | Nishio / Trial & Error (nested depth 2 by default and at most: `maxNishioDepth`) | `chain` | 140 | 1120 |

`cage` techniques have `variantScope: ['killer']` and `ineq` techniques `['greaterThan']`: the solver and the digger only use a technique whose scope contains the model's variant. The Vietnamese names of the techniques live in the locale pack (`technique.<id>`), which is authoritative; the first plan's Vietnamese names were not kept.

> The scores of the first plan were **starting values**; the calibration of task `T-2.10` replaced them with the costs above (design values → calibrated values and the reasons are in the calibration log of `js/core/difficulty.js`). Task `T-6.3` of the first plan referred to pre-generation, not calibration.

#### Difficulty scoring

```
rawScore = Σ_over_applications ( cost(tech) × (isFirstUse(tech) ? firstUseMultiplier : 1) )
         + emptyCellBonus
firstUseMultiplier = 1.5        // a technique's first use is cognitively "more expensive"
emptyCellBonus     = (initial number of empty cells) × 0.6
score              = max(rawScore, floor of the hardest technique's group)     // "technique floor"
```

`cost(tech)` is `SG.difficulty.COSTS[id]`, falling back to the registered `baseCost`. The logical solver is deliberately not told about the table: it reports `techniqueCounts`, and `SG.difficulty.classify(report, model)` re-scores from them, so `report.score` of the solver is the **uncalibrated** design score — always use `rating.score`. A puzzle that needs a technique of group G is at least as hard as the easiest puzzle of the level that introduces G, however few steps it takes: its score is raised to that level's band minimum (the **technique floor**). That keeps the two conditions below from contradicting each other, so invariant I5 holds by construction; the unfloored value stays available as `rating.rawScore` (and `tests/soak.js` prints the share of puzzles whose raw score is inside the band: 93–100% on classic9 for every level).

`rating.hardestTechnique` is the used technique of the highest group (ties: highest cost, then latest in the ladder). A puzzle is assigned to a difficulty level only when **both** conditions hold: `score` lies within the band **and** `hardestTechnique` belongs to an allowed group.

> **An extremely useful corollary:** if `logicalSolver` solves a puzzle **entirely with sound inference techniques**, that puzzle **certainly has a unique solution** — there is no need to call `dfs-solver` again. This is exploited in [§6.8](#68--optimal-hole-digging-strategy).

### 6.7 Difficulty definitions

| Level | VI | EN | Allowed technique groups | Score band (classic9) | Clue floor `minClues` (classic9) | `minCluesPerUnit` |
|-------|----|----|--------------------------|-----------------------|----------------------------------|------------------:|
| `veryEasy` | Rất dễ | Very Easy | `basic` (singles only) | 0 – 72 | 40 | 2 |
| `easy` | Dễ | Easy | `basic` + `locked` | 72 – 180 | 34 | 2 |
| `medium` | Trung bình | Medium | + `subset` | 180 – 400 | 29 | 1 |
| `hard` | Khó | Hard | + `fish` | 400 – 800 | 25 | 1 |
| `expert` | Chuyên gia | Expert | + `wing` | 800 – 1500 | 22 | 0 |
| `evil` | Ác mộng | Evil | + `chain` | ≥ 1500 | 17 | 0 |

Bands are half-open, `[min, next min)`, so every score belongs to exactly one level; the top level has no upper bound. The only change from the first plan's numbers is the veryEasy/easy edge, **80 → 72**: singles-only puzzles of 40 clues score 64.5–69 and those of 34 clues 74–92, so 80 rated nearly every easy puzzle veryEasy. The clue ranges of the first plan (`40–50`, `34–40`, … `17–24`) survive as the floor (`minClues`, the one number the digger and invariant I6 use) and an informative `maxClues`. The `cage` and `ineq` groups are available at every level (their techniques are scoped to Killer / Greater-Than by `variantScope`); `SG.difficulty.BASE_GROUPS[0 … level]` are the classic groups a level allows.

**Variant scaling rule.** `SG.difficulty.spec(level, model)` starts from the classic9 row and multiplies the clue floor and the score band by `cellCount / 81`. A variant whose board does not follow that proportion then adjusts the floor in its definition — this is the calibration knob, and it replaced the first plan's single scaling rule:

1. `clueFloorScale: { level: factor }` multiplies the derived floor of that level (a missing level has factor 1).
2. `clueFloor` — a table `{ level: clues }` (a missing level: no floor) or a function `(level, model, derivedFloor) => clues` — replaces it.

The result, `spec(level, model).minClues`, is the **single number** that the digger, the pipeline, `tests/soak.js` and the variants sweep (invariant **I6**) all use. The calibration of task `T-7.7` measured, per variant, how often ONE dug puzzle lands on the requested level and set:

| Variant | `clueFloorScale` | Effect on the share of one dug puzzle landing on the level (medium / hard / expert) |
|---------|------------------|--------------------------------------------------------------------------------------|
| `diagonalX`, `hyper`, `jigsaw9`, `greaterThan` | medium 0.83 · hard 0.80 · expert 0.80 | medium 1–49 % → 32–76 % (`hyper` 1 → 32, `jigsaw9` 8 → 50) |
| `samurai`, `sohei`, `butterfly` | medium 0.60 · hard 0.60 | medium 2–8 % → 38–49 % |
| `flower` | easy 0.80 · medium 0.60 · hard 0.60 | medium 9 → 49 %; `medium` is now offered |
| `killer` | `clueFloor: { veryEasy: 40 }` | the other levels dig down to a handful of clues: classic Killer shows no digits and the cages carry the information |

(A 9×9 board keeps its floor above the natural stop of the dig on purpose, so that the mean clue count still falls with the level.) Classic, Mega and Wordoku are untouched. Exact-level hit rate over 150 puzzles per level before → after: butterfly medium 95 → 100 %, hyper medium 89 → 100 %, jigsaw9 medium 99 → 100 %; dug puzzles per medium puzzle: hyper 38 → 3.2, butterfly 31 → 2.1. The numbers and the reasoning are in the header of `js/core/difficulty.js`.

**Known minimum clue count:** `classic9` = 17 (proven). Other variants have no tight bound known ⇒ it must not be hard-coded; let the digger stop on its own when no further cell can be dug. `DifficultySpec.extraPasses` is kept for the contract of §13.7 but is not used: the guided stage runs until nothing can be removed, so there is no pass to add.

### 6.8 ⭐ Optimal hole-digging strategy

The user's requirement describes a naive loop: *"remove a cell → check it is still solvable → repeat"*. Below is the **optimal approach** and the reasons for it.

#### Problems with the naive approach

1. Picking random cells with repetition ⇒ the same cell that was already rejected is tried again and again.
2. Checking for a unique solution by counting all the way to 2 solutions ⇒ very expensive (§6.5).
3. It only checks *"solvable"*, not *"exactly as hard as intended"* ⇒ difficulty lands at random, and the whole puzzle often has to be thrown away and redone.
4. It scores difficulty after **every** dig ⇒ the logical solver, the most expensive component, is called the most often.

#### The optimal approach — 5 improvements

**① Pre-shuffled digging sequence**
Shuffle the cell list **once** and walk through it sequentially ⇒ each cell is considered exactly once, with no waste. Several sequence styles are supported, affecting both speed and the "feel" of the puzzle:
`random` (default) · `rowByRow` · `snake` (S-shaped) · `spiral` · `jumpOne`.

**② Symmetry handled in groups**
When symmetry is enabled, mirrored cells are **dug/restored together as one unit**, not cell by cell. Styles (`SG.symmetry.KINDS`): `none`, `rotational180` (default; the most attractive and common), `rotational90`, `mirrorH`, `mirrorV`, `mirrorBoth`, `diagonal`, `antiDiagonal`. Groups are computed on **canvas** coordinates, so a multi-grid board mirrors about the centre of the whole canvas, and a group simply shrinks where the mirrored position holds no cell.
*Trade-off:* the stricter the symmetry, the higher the minimum clue count ⇒ the harder it is to reach `evil`. Symmetries whose groups have more than two cells (`rotational90`, `mirrorBoth`) dig in coarser steps and miss a level more often, so the generator allows 30 dig samples per grid instead of 12 for them, and the controls warn from `expert` upwards (`SG.controls.STRICT_SYMMETRY`).

**③ Cheap pruning before expensive checks (cheap pre-filters)**
Before calling any solver, immediately reject candidates that violate:
- The remaining clue count would drop below the level's `minClues` (the variant's own floor, §6.7).
- That row/column/region would be left with fewer than `minCluesPerUnit` clues (2 / 2 / 1 / 1 / 0 / 0 for the six levels on a 9-digit board, scaled by `digits / 9`; Killer uses 0) — this helps the puzzle "look balanced".
- The cell was already rejected in a previous pass (the `rejected` bitmap).

**④ ⭐ The technique-bounded oracle** — use a logical solver *limited to the allowed techniques* as the oracle
Instead of asking *"does the puzzle still have a unique solution?"* and only afterwards *"how hard is it?"*, we ask **one single question**:

> *"After digging, can the puzzle still be solved **using only the technique set allowed for this difficulty level**?"*

- If **yes** ⇒ accept the dig. (And because all techniques are sound, **a unique solution is guaranteed for free** — no DFS needed. The oracle runs with `assumeUniqueness: false`, so `uniqueRectangle`, the one technique that presupposes uniqueness, is never used to certify it.)
- If **no** ⇒ put the cell back.

Result: the final puzzle is **guaranteed** to lie within the chosen technique band. This is how difficulty is **guaranteed**, rather than "generate and hope".

*Applies to:* `veryEasy` → `expert`.
*Exception `evil`:* this level allows chains/trial-and-error, so use `dfs stillUnique` (§6.5) as the oracle, then score at the end.
*Safety net (risk R3):* whatever oracle dug it, every puzzle is re-verified with `SG.dfs.countSolutions(…, 2) === 1` before it leaves the digger. If a technique bug ever made one ambiguous, it is replaced by a plain DFS-dug puzzle and the result carries the warning `digger.unsoundTechnique`.

**⑤ Deferred & banded rating**
The full rating runs once per dug puzzle (step 6), not after every cell. Inside the guided stage (below) the oracle's own score is the objective, so the expensive rater is still called once per sample.

#### Complete algorithm (as built)

Stage A is `SG.digger.dig`/`digStage` (the engine, usable on its own); stage B is the guided dig; `SG.digger.generate` is the restart loop; `SG.pipeline` wraps all of it in the seven steps and owns the events. The restart loop lives in the digger so that a puzzle is the same whether it is generated through the pipeline or by direct calls.

```
function generate(model, level, rng, maxAttempts = 8, digTries = 12):     # digTries = 30 for coarse symmetries
    spec ← difficultySpec(level, model)                                    # §6.7, incl. the variant's floor
    for attempt in 1..maxAttempts:
        solution ← generateFullGrid(model, rng.fork('grid#'+attempt))      # step 3
        model'   ← variant.postGenerate(...) or "nothing to do"            # step 4
        for sample in 1..digTries:                                         # the same grid, a fresh dig each time
            # ── step 5: dig ─────────────────────────────────────────────
            givens ← copy(solution)
            order  ← symmetryGroups(sequence(allCells, order, rng), symmetry)
            # Stage A: greedy dig along the pre-shuffled sequence
            for group in order:
                if clues − |group| < minClues or violatesUnitMinimum(group): continue
                remove(group)
                ok ← level == 'evil' ? stillUnique(…) : solvableWithin(allowedTechniques)
                if not ok: restore(group)
                (levels ≥ medium hand over to stage B at ≈ 47 % of the cells as clues)
            # Stage B (levels ≥ medium): the guided dig, "dig deeper"
            repeat: rate up to 32 candidate removals with the objective (the bounded solve's score,
                    refusing a removal that is stuck, ambiguous or at/above the band's upper bound);
                    apply the one that makes the puzzle hardest; stop when nothing can be removed
            safety net: countSolutions(givens, 2) == 1, else DFS fallback + 'digger.unsoundTechnique'
            # ── step 6: rate ────────────────────────────────────────────
            rating ← SG.difficulty.rate(model', givens)                    # one full rating
            # ── step 7: tune ────────────────────────────────────────────
            if rating.level == level: return puzzle                        # tune.hit
            remember the closest puzzle                                    # tune.miss → next sample
        emit retry.difficulty (attempt, willRetry)
    return the closest puzzle, with the warning 'difficulty.approximate'
```

Why stage B is *guided* and not "dig further with a relaxed oracle" as the first plan sketched: a puzzle that stage A has finished is minimal (every remaining clue is needed for uniqueness itself), so a relaxed oracle finds nothing more to remove — and random minimal puzzles need nothing beyond singles about three times in four, whatever technique set the oracle allows, so the hard levels would be hit far too rarely. Choosing the hardest removal at each step finds the puzzles that need more. Likewise "give clues back when the puzzle is too hard" (`tune.restore`) never became necessary: the guided stage never goes past the band, and a sample that still misses is simply replaced by a new sample.

> **Pipeline seams.** `digLevel` runs the three steps `dig` ("dig holes with validation": the dig strategy, default `digStage`, then the safety net), `rate` (one rating) and `tune` (the band check: `tune.hit` / `tune.miss`). A missed sample repeats dig → rate → tune **on the same grid**, up to `digTries` times, before the attempt gives up and `retry.difficulty` starts a new grid. A variant selects another dig strategy with `digStrategy` (Killer's wraps `digStage` with cage-aware settings; Greater-Than's digs signs, §8.3), registered with `SG.digger.registerStrategy(id, fn)`.

#### ⑥ Outer loop: budgeted restart

The outer loop of the algorithm above (up to `maxAttempts` grids, default 8, UI range 1–20; up to `digTries` dig samples per grid) is the budgeted restart. When every attempt is used, the closest puzzle is returned together with the warning `difficulty.approximate` — it never throws for that and never loops without bound ("closest" = whole levels apart first, then the distance of the score from the band).

> **UX principle:** **never** hang indefinitely. Always return a valid puzzle (a unique solution is absolutely guaranteed), and if the difficulty is not matched exactly, tell the user clearly, with a "Retry with a different seed" button.

#### ⑦ Additional optimisations (task `T-6.3`)

Built (`js/ui/cache.js`, §14.3):
- **Persistent cache:** every generated puzzle is stored in `localStorage` (`sg.cache.v1`, LRU, 20 puzzles, schema-version checked). The same configuration with the same seed is served from it at once. The cache stores the puzzle only, never the trace nor the dig log; a puzzle served from the cache is shown immediately (the replay waits, with a "preparing the replay" note) and is **regenerated from the seed in the background** (an independent client); its dig log then gives the puzzle its replay through `SG.app.attachTrace(trace, digLog)`, which opens on the finished puzzle. The regenerated puzzle must equal the cached one, otherwise the entry is dropped.
- **Background pre-generation:** once a puzzle is shown and the page has been idle for 1 s, the cache quietly pre-generates one or two puzzles with the same configuration and random seeds in a Web Worker (at most 2 per configuration, 4 in all; never while a generation runs; paused while the tab is hidden; skipped for configurations whose expected time is above 3 s; **absent in main-thread mode**). "Generate" with an empty seed field and "Generate random" hand them out instantly.

Not built: *progressive difficulty (warm start)* — generating a `medium` puzzle first and then digging on to `hard`/`expert`. The guided dig of stage B covers the same need differently.

---

## 7. Generation Pipeline & Step Event System

> This section is where the core requirement is realised: **"the UI must walk the user through the steps of generating the game"**.

### 7.1 The seven canonical steps

`SG.pipeline.run(config, emit, budget)` always goes through the 7 steps. A variant may **add** events inside a step (Killer's cage repairs, Wordoku's word fallback…) but must not skip a step: a variant without a `postGenerate` hook still passes through step 4 and emits `extraStructure.none`.

| # | Step ID | Name (VI) | Name (EN) | What it does | Shown in the replay (§7.3) |
|---|---------|-----------|-----------|--------------|----------------------------|
| 1 | `configure` | Chuẩn bị cấu hình | Configure | Normalise the options, fix the `seed`, look up the variant | Not shown (technical work) |
| 2 | `buildModel` | Dựng mô hình lưới | Build board model | `variant.build`: cells/units/peers; Jigsaw regions; multi-grid sub-grids; then the `difficultySpec` of the board | Position 0: the empty grid with its regions (also on screen while a run goes on) |
| 3 | `fullGrid` | Sinh lưới đầy đủ | Generate full solution | Randomised DFS + propagation (`attempt` n of m) | Step "Full solution": the whole solution at once (no backtracking is shown) |
| 4 | `extraStructure` | Dựng cấu trúc phụ | Build extra structure | `variant.postGenerate`: cages (Killer) / inequality signs (Greater-Than) / key word (Wordoku), or "nothing to do" | Step "Cages" (dashed cages and their sums) or "Signs" (every `<` `>` sign); no step for the other variants |
| 5 | `dig` | Đào lỗ có kiểm chứng | Dig holes with validation | §6.8: stage A (random dig), stage B (guided dig), and the uniqueness safety net | Batches of random removals (removed cells framed, cells put back framed dashed red), guided rounds, the signs of Greater-Than, rarely a restart; then the finished puzzle |
| 6 | `rate` | Chấm độ khó | Rate difficulty | One full rating with the logical solver | Not shown as a step; the Summary tab has the Difficulty Score table of the techniques used |
| 7 | `tune` | Hiệu chỉnh & hoàn tất | Tune & finalize | The band check: `tune.hit`, or `tune.miss` and a new sample; `tune.best` when every attempt is used | Not shown (a sample that missed the level is never replayed); the Summary tab has the cards |

**Steps 5–7 repeat per dig sample.** Rating and tuning are three steps of their own, not one: the digger's guided stage shares its rating objective with the rater, so "dig" is every removal plus the uniqueness check, "rate" the rating of the finished puzzle, "tune" the band check. When a sample misses the level (`tune.miss`), dig → rate → tune repeat **on the same grid** (`dig.start` carries `sample` / `maxSamples`; up to 12 samples per grid, 30 for coarse symmetries) — a grid is expensive and its next dig is cheap. When the samples of a grid are used up, `retry.difficulty` is emitted and steps 3–7 restart with a new grid ("Attempt 2 of 8"; the counter comes from `fullGrid.start` and `retry.difficulty`, the sample counter from `dig.start`; the events reach the trace and the `generate:progress` event of the app, while the page shows the empty board and the Cancel button until the puzzle is ready).

### 7.2 Event schema

```js
/**
 * @typedef {Object} GenerationEvent
 * @property {'step'|'micro'|'metric'|'retry'|'done'|'error'} type
 * @property {string} stepId          one of the 7 step ids, or 'pipeline' for `done` and for errors outside a step
 * @property {'start'|'progress'|'end'} phase
 * @property {number} t               ms since the start (active time: time given away between slices is not counted)
 * @property {number} seq             0, 1, 2, … in emission order (equals the array index of an uncapped trace)
 * @property {string} [i18nKey]       translation key of the description line
 * @property {Object} [i18nArgs]      parameters inserted into the translation, e.g. {cell:'R4C7', value:5}
 * @property {Object} [patch]         incremental change (delta) for redrawing the grid — do NOT send the whole grid
 * @property {Object} [metrics]       { backtracks, nodes, attempts, accepted, rejected, clues }
 */
```

An event is plain data (numbers, strings, booleans, null, arrays, plain objects): it survives `postMessage` and `structuredClone`, and never carries a function or a typed array.

**The event contract is `SG.events.VOCABULARY`**: a list of `{ type, stepId, phase, key, level, args, patch }` entries — every key the core and the variants emit, the lowest verbosity that emits it, the names that may appear in `i18nArgs`, and the patch fields it may carry. `SG.events.lookup(event)` finds the entry of an event and `vocabularyKeys()` lists the keys; the locale packs must translate every key (`i18n.test.js`), and `pipeline.test.js` and the variant suites check every emitted event against it. A variant adds the events of its own by pushing entries (Killer's `extraStructure.repair*`, Wordoku's `extraStructure.wordFallback`, …).

**Mandatory rule — send deltas, not snapshots.** A `patch` contains only the cells that changed, **at most 8 cells** (`MAX_PATCH_CELLS`):
`{ cells: [{ i: 34, value: 7, state: 'placed' }], highlight: [34], unhighlight: [12] }`.
Cell states: `empty`, `placed`, `given`, `backtracked`. A patch is applied in the order cells → unhighlight → highlight. Sending the entire 369-cell grid with every event would clog the `postMessage` channel for Samurai. The helpers `makePatch`, `applyPatch`, `invertPatch`, `mergePatches`, `splitPatch`, `createView` / `cloneView` (the plain state a patch is applied to), `capTrace` and `createTraceBuffer` live in `SG.events`.

**Three verbosity levels:**

| Level | Events emitted | Used when |
|-------|----------------|-----------|
| `off` | only `step` start/end + `done` + `error` | tests, batch generation, a pre-generation that needs no replay |
| `summary` | adds `step` progress events (the narration: config, model, techniques found, verdicts), `retry`, and a `metric` at most every 50 ms | the pipeline's default, so what the page gets (it sends no `trace`), and what a `full` request becomes above 300 cells |
| `full` | adds every `micro` event (each fill, backtrack, dig, rejection) | direct callers and the tests (applying its patches in order rebuilds the board exactly); the page's replay does not need it |

### 7.3 Replay engine in the UI layer

```
result (solution, model, digLog) ──► SG.player.buildSteps (pure) ──► steps ──► player ──► board
                                                                                 │ onPosition
                                                         step description (#step-detail)
controls: ⏮ first · ‹ previous · › next · ⏭ last · slider (#scrubber) · "Step k of N" (#player-time)
(the explanation of the step on show is in the Help dialog, §7.4)
```

- **Finished first, moved by hand.** After a generation the board shows the finished puzzle at once: `player.load(result)` builds the steps and shows the **last** position. Nothing animates or plays by itself. ⏮ goes to position 0 (the empty grid), ‹ / › move one step, ⏭ returns to the finished puzzle, and the slider (with a translated `aria-valuetext` and a notch under it for every step) jumps anywhere. There is no Play/Pause button, no speed and no speed preference.
- **Built from the dig log, not from the trace.** `SG.player.buildSteps(result)` (pure, → `{ steps, signs, cellCount }`) reads `result.solution`, `result.model` and `result.digLog` (§13.9): the decisions of the **final sample only** — the dig that became the puzzle — recorded by `SG.digger` (header "Dig log" of `js/core/digger.js`) and, for Greater-Than, by `digSignsSteps` (`js/variants/greater-than.js`). Entries: `{ op: 'pass', pass, clues }`, `{ op: 'accept', cells }`, `{ op: 'reject', cells, reason }`, `{ op: 'keep', cells, score }` (a guided candidate that could go but was not the hardest one), `{ op: 'restart' }` (the safety net digs again from the full grid); Greater-Than adds `{ op: 'signs', signs: [[a, b], …] }` (`value[a] < value[b]`), `{ op: 'clear' }`, `{ op: 'reveal', cells }` and sign verdicts `{ op: 'accept' | 'reject', sign: index, cells: [a, b] }`. The log is the same whatever the trace verbosity, the thread or the board size. Given a result without a log, `buildSteps` gives just the solution, the structure and the finished puzzle; the app does not load such a result into the player but shows it finished and waits for its log (see **Cache** below).
- **One step = one visible change of the board.** Technical work (the settings, the board model, the rating, the tuning, samples that missed the level) is not shown. Position 0 is the empty grid, position *k* shows step *k*:

| Kind | Title | What the board shows | Card (`phase` / line) |
|------|-------|----------------------|-----------------------|
| `solution` | Full solution | Every value of `result.solution` | `fullGrid` / `place` |
| `cages` | Cages | Killer: the cages and their sums appear | `extraStructure` / `build` |
| `signs` | Signs | Greater-Than: every sign appears | `extraStructure` / `build` |
| `clues` | Starting clues | Greater-Than: the grid is emptied and a few clues are kept (dotted frame) | `dig` / — |
| `random` | Random removals | A batch of random removals: about a ninth of the board is tried per step (`batchCells(n) = max(2, round(n / 9))`); removed cells are framed (`cell--dug`), cells that had to go back framed dashed red (`cell--kept`). Every batch removes something; refusals after the last removal join the last step, so the easy early removals are summarized ("Remove 9 cells at random: the puzzle can still be solved without them", "Try to remove 10 cells at random: 8 cells removed, 2 cells put back because …") | `dig` / `check` |
| `guided` | Hardest removal | One round of the guided dig per step (`roundsPerStep(n) = max(1, round(n / 81))` rounds on large boards): the candidates are rated, the removal that makes the puzzle hardest is taken, refused candidates are framed `cell--kept` | `dig` / `deeper` |
| `signDig` | Removing signs | Greater-Than: a batch of signs tried (`batchSigns(s) = max(4, round(s / 8))`); removed signs are drawn dashed and faded, signs that had to stay red | `dig` / `check` |
| `reveal` | More clues | Greater-Than: the puzzle came out too hard, so more clues are shown (dotted frame, `cell--revealed`) | `dig` / — |
| `restart` | Starting again | The safety net threw a dug puzzle away and digs again from the full grid (rare) | `dig` / `verify` |
| `final` | Finished puzzle | The clues of the result (and its signs), no frame | `dig` / `verify` |

Example: Classic 9×9, *easy*, seed 3 replays in 7 steps — Full solution; Random removals ×5 (9, 10, 10 and 10 cells, then "8 cells removed · 2 cells put back"); Finished puzzle, 34 clues. Larger boards and higher levels take about 10 to 25 steps.

- **Steps are plain data:** `{ index, kind, phase, line, key, args, values, structure, marks, signs, metrics }`. `values` is the board after the step (a full snapshot, cheap at this granularity, so seeking needs no checkpoints or inverse patches), `structure` tells whether cages and signs are drawn, `marks` holds the frames `{ dug, kept, revealed }`, `signs` the sign marks `{ hidden, removed, kept }` by index into `buildSteps().signs`, `metrics` the running dig counters `{ attempts, accepted, rejected, clues }` (null outside the dig). The counters are cumulative and counted in what the board shows — cells, or signs for Greater-Than — so they add up with the step description. `viewAt(built, position)` is the board at a position; `describeStep`, `stepTitle`, `stepMeta` and `positionText` are the texts (`replay.*` keys).
- **One place drives the rest.** The player's `onPosition({ position, length, step, direction })` (`direction` is `'forward'`, `'backward'` or `'seek'`; `step` is null at position 0) is the only thing that moves the step description, and the app re-emits it as its `position` event, so nothing can be out of step with the board. The Help dialog reads the same position when it opens (`SG.app.getExplainContext()`, §7.4). `SG.player.rateStep(p)` gives the techniques the puzzle of a step needs (`{ counts, before, empties, score }`, rated by `SG.difficulty.rate` and cached), which the step description turns into its score table.
- **Board.** The structure layers (`cages`, `ineq`; `SG.player.STRUCTURE_LAYERS`) are hidden until the step that builds them; the frames are highlight classes of `layer-overlay` ([§10.3](#103-animation-language)). Greater-Than draws every sign during the replay (`SG.greaterThan.withSigns(result.model, signs)`), marks them by index (`board.setSignMarks({ hidden, removed, kept })`) and switches to the model of the result at the last position. The other overlays (regions, windows, the Wordoku line) come from the model, not from the log. "Show solution" draws the solution only at the last position.
- **Step description** (`SG.stepView.create(rootEl, { stats })`, `js/ui/step-view.js`), in the **Generation Steps** tab under the replay controls (`#step-detail`): a heading "Step k - Title" with an **Explain** icon (opens the Help), the one-line summary ("9 cells removed · 72 clues left"), the full sentence, the **Difficulty Score table of the puzzle at that step** (Technique section with uses, points and total per technique and a help icon on each name; Other section with the empty cells and the bonus points for difficult techniques; a Total row — at the last step the same total as the Summary tab; `stats` is `player.rateStep`) and the legend of the marks the steps use (removed in this step / tried, but put back / clue shown in this step / sign taken away in this step / sign tried, but kept), at the right. At position 0 it shows a hint to use the replay controls. There is no list of steps: the user moves with the replay controls. The instance offers `setSteps`, `setPosition`, `clear`, `getPosition`, `refresh`, `destroy`; the constant `STEP_IDS` lists the seven pipeline steps, and `SG.stepView.chartModel` (technique order and labels) and `roundToTotal` (whole numbers that add up to a total) are shared with the result panel (§10.5).
- **Cache.** A puzzle served from the cache has no dig log (it is never stored): the replay waits until the background regeneration hands the log over through `SG.app.attachTrace(trace, digLog)` ([§6.8 ⑦](#68--optimal-hole-digging-strategy)).

### 7.4 Explanation content

Each step has a bilingual explanation card with 3 fixed parts — **What / Why / How**. The comments below quote the example Vietnamese UI copy (kept verbatim as product strings), each followed by an English rendering:

```js
SG.explain['dig'] = {                // js/core/explain-data.js — pure data, keys only, no DOM
  stepId: 'dig', index: 5, name: 'step.dig.name',
  what:  'explain.dig.what',   // vi: "Loại bỏ dần các số khỏi lời giải hoàn chỉnh." (en: "Gradually remove numbers from the complete solution.")
  why:   'explain.dig.why',    // vi: "Mỗi ô bị bỏ đi làm bài khó hơn, nhưng phải..." (en: "Every removed cell makes the puzzle harder, but it must...")
  how:   'explain.dig.how',    // vi: "Sau mỗi lần bỏ, ta kiểm tra bài có còn..." (en: "After every removal, we check whether the puzzle still...")
  pseudocode: [ { label, indent, key }, … ],   // one entry per line; `label` is what the UI highlights
  highlight: { 'dig.try': 'try', … },          // event i18nKey → pseudocode line label
  // Content that changes with the real-time context
  live: function (metrics, t) { return { key: 'explain.dig.live', args: { /* numbers read from metrics */ } }; }
};
```

The data module is `SG.explain` (core); the UI card that renders it is **`SG.explainCard`** (`js/ui/explain.js`) — the two names must not be confused. The cards live in the **Help dialog**, tab "How it works" (`js/ui/help.js`), not on the page: one collapsible entry (`<details class="disclosure help-step">`) per pipeline step, each with a compact card (`SG.explainCard.create(el, { compact: true })`, no kicker and no title, the entry's summary names the step): the three parts, the **pseudocode** (turning the site into an algorithm-learning tool) and, in the entry of the step on show, a "Now" line. The entry that the replay step on show belongs to (`fullGrid`, `extraStructure` or `dig`; `SG.app.getExplainContext()`, at position 0 the first of them) is marked "Now: replay step k of N", is open the first time the tab is drawn, and shows the pseudocode line of the replay step highlighted and, during the dig only, the counters ("Tried · accepted · rejected · clues left", cumulative and counted in cells, signs for Greater-Than, so they add up with the step description). The user opens and closes the entries freely (the open ones stay open when the language changes). The **Explain** icon of the step description (`#btn-explain`, `action { id: 'help', tab: 'generation' }`) opens the Help on that tab. The card re-renders on a language change keeping the step, the line and the metrics.

---

## 8. Variant-Specific Algorithms

### 8.1 Jigsaw — generating irregular regions

**Requirement:** partition the `D×D` grid into `D` connected regions (connected polyominoes), each with exactly `D` cells.

**Algorithm: seeded growth with backtracking.**

```
1. Place D seeds spread evenly (one seed per row, in distinct columns, one in each 3×3 box of the classic layout).
2. Repeat until every cell is assigned:
     - Pick the currently smallest region (prefer the region most starved of cells).
     - Take the set of border cells that are adjacent to that region and not yet in any region.
     - Exclude the cells that, if taken, would disconnect the remaining free space
       into pieces whose size is not divisible by D  (flood-fill check, `isFeasible`).
     - Choose randomly with weights: prefer cells with few free neighbours
       (reduces the risk of creating "islands").
     - If no valid cell remains → undo the last move and try its next candidate;
       beyond maxBacktracks (60 undone moves) → discard the attempt and draw new seeds
       (at most 200 attempts, then the error `jigsaw.layoutFailed`).
3. Validation: every region has exactly D cells, is connected, is not a bare row or column, and the layout
   has a solution (run generateFullGrid with a small node budget — 4000 nodes, small restarts —
   and a plain DFS of 5000 nodes). If it has no solution → drop it like a dead end.
```

Everything is driven by the rng and by node counts only, never by the clock, so a seed gives the same layout on every machine (invariant I4). The layout depends on the seed, so a jigsaw puzzle is never "the empty board of the variant": `model.layout.cellRegion` holds the region number (0–8, in reading order of each region's first cell), and a thick border belongs on every edge between two different regions.

**Aesthetic parameter:** `compactness` (0–1) controls the weight that favours cells touching the region on many sides. A high value → rounded regions; a low value → winding regions (prettier, but the puzzle is harder). Default `0.6`.

> ⚠️ Not every Jigsaw layout has a solution. The validation step at (3) is **mandatory**.

### 8.2 Killer — generating cages

```
Input: a grid that already has a complete solution.
1. Partition all the cells into connected cages:
     - The target size is drawn at random from a difficulty-dependent distribution:
         veryEasy/easy : {2:45%, 3:40%, 4:15%}       → small cages, easy to reason about
         medium        : {2:30%, 3:35%, 4:25%, 5:10%}
         hard/expert   : {2:15%, 3:30%, 4:30%, 5:20%, 6:5%}
     - Constraint: the values within a cage must be PAIRWISE DIFFERENT
       (the standard Killer rule) → when growing a cage, exclude any cell whose value is already present.
2. Compute the sum of each cage from the solution.
3. Remove ALL clues (classic Killer gives no digits).
4. Check for a unique solution with a cage-aware solver (`SG.dfs` with the cage propagation extension).
   This layout check runs for hard / expert / evil only; veryEasy, easy and medium skip it, because the digger keeps the
   clues those levels need and its oracle already guarantees uniqueness.
5. If it is NOT unique, repair in this priority order (from least to most invasive):
     a. Split a large cage in the most ambiguous area into two smaller cages.
     b. Merge two small adjacent cages (changes the local structure).
     c. Reveal 1 clue at the cell with the most candidates.
   Split / merge are tried at most 12 times, then up to 24 clues are revealed. Every check is bounded by
   search nodes (30 000 per check, 250 000 per layout), never by the clock, so the result stays reproducible.
6. Rate the difficulty with the logical solver, with the `cage` technique group enabled.
```

The model carries `model.cages[k] = { cells, sum, distinct }` (`cells[0]` is the top-left cell: the sum label goes there) and every cage of two or more cells is also a partial all-different unit (`kind: 'cage'`, label `K<n>`). The dig that follows is the registered strategy `'killer'`: it wraps the standard `digStage` with a clue floor of 40 for `veryEasy` and **none** for the other levels (declared as the variant's `clueFloor`, §6.7), no per-unit minimum, and the guided stage at every level — the score band is what stops the dig. The variant option `cageSize` (−2 … +2, default 0 = "by difficulty") tilts the size distribution towards smaller or larger cages.

**Mandatory optimisation:** the sum-combination lookup table (§6.3 — P4). Without it, Killer would be ~30× slower.

**Aesthetic tip:** colour the cages with a graph-colouring algorithm (4–5 pale colours) so that two adjacent cages never share a colour.

### 8.3 Greater-Than — digging "signs" instead of digging "cells"

This is the only variant in which the thing being removed is **not a cell**.

```
1. Generate the full grid.
2. (postGenerate, step 4) Place inequality signs on ALL pairs of adjacent cells within the same region (box).
   (Option `futoshiki`: on every adjacent pair in the whole grid.) The model is replaced by one that
   carries the signs (models are immutable); `build` itself returns the plain empty board.
3. (digStrategy 'signs', step 5) Remove all the numeric clues, then reveal a few again so the puzzle can be
   solved at all — never fewer than the level's `minClues`, with the symmetry of the configuration.
4. Shuffle the list of signs → remove them one by one:
     remove one sign → can the puzzle still be solved with the techniques of the level? → keep it removed : put the sign back
   (Uses the same technique-bounded oracle mechanism as §6.8 ④.)
5. Every sign that is still redundant for uniqueness is removed too, with a plain uniqueness check, so the
   sign set is minimal: removing any sign that is left would give the puzzle a second solution.
   If the techniques of the level cannot finish the puzzle, or it is rated above the level, reveal one more
   group of numeric clues and run steps 4–5 again on the signs that are left (at most 8 rounds).
```

The numeric clues follow the symmetry of the configuration; the signs do not. A sign is part of the model as `{ a, b }` meaning `value[a] < value[b]`, with `a` and `b` orthogonal neighbours; `SG.greaterThan.signEdges(model)` gives a renderer the edge, the midpoint and the glyph of each sign.

**Inequality propagation (P5) in detail:**
for a constraint `value[a] < value[b]`:
- `cand[a] ← cand[a] ∩ { v : v < max(cand[b]) }`
- `cand[b] ← cand[b] ∩ { v : v > min(cand[a]) }`
Repeat to a fixpoint. With a long inequality chain `a<b<c<d`, bounds propagation is very effective: one sweep of the signs in topological order carries the minima along the chain and one backwards carries the maxima, so the closure is reached in a single call. It is a lazily registered propagation extension (`SG.ineq.ensureExtension()`), and the two `ineq` techniques are its attributable, "by hand" counterpart for the logical solver.

### 8.4 Multi-grid (Samurai / Butterfly / Flower / Sohei)

```
1. Build a virtual rows×cols canvas; create a canvasPos → cellIndex lookup table.
   Cells at coinciding canvas positions ⇒ REUSE the same cellIndex (this is the
   entire "magic" of multi-grid).
2. For each sub-grid g at (r0,c0): add 9 row units, 9 column units,
   9 box units — all referencing the already-mapped cellIndex.
   (Units come grid by grid: 27 per grid; `unitMeta.gridIndex` names the grid.)
3. Generate the full grid: DFS over the whole unified CSP with the generic MRV ordering. The only
   multi-grid hook is `fastSeed` (`fastSeedOverlaps`): it decides the cells that several grids
   share (the most heavily constrained ones) before the search starts → far less backtracking.
4. Hole digging: the default 'cells' strategy, as usual, but each check is much more expensive.
   → Worker + time budget + a step-by-step status (no percentage: the length of a run is unknown).
   The recommended sub-grid-wise digging sequence was not needed and is not implemented.
5. Symmetry: applied about the centre of the WHOLE canvas, not per sub-grid; a group shrinks where the
   mirrored position holds no cell.
```

`model.layout.cellRegion` of a multi-grid board is the canvas box slot, so an overlapped box has ONE id although two grids own it; `layout.overlays` holds one `{ kind: 'overlap', cells }` per box owned by two or more grids, and `layout.subGrids` the 9×9 outlines. The labels are `G{n}-R{r}C{c}`.

> **Performance.** The first plan expected `samurai` (369 cells) and `sohei` (288 cells) to be 15–40× slower than `classic9`, with budgets of 8 s (`medium`) and 20 s (`hard`). Measured in Node by `tests/soak.js --full` (`trace: summary`, 25 puzzles per combination), the p95 is 0.29 s / 0.47 s for Samurai medium / hard, 0.16 / 0.37 s for Sohei, 0.12 / 0.20 s for Flower and 0.07 / 0.13 s for Butterfly — one to two orders of magnitude inside the budgets, because the technique-bounded oracle and the calibrated clue floors keep the digs short. The UI still runs generation in a worker, shows the empty board and a Cancel button while it runs, and Samurai downgrades a `full` trace to `summary` (the page gets `summary` anyway).
>
> **Cell-count derivation (verified):** `sohei` = 4×81 − 4 shared 3×3 boxes = 324 − 36 = **288**. `flower` = 15×15 canvas − 4 empty 3×3 corners = 225 − 36 = **189**. Earlier drafts listed 324 and 225; those were the pre-merge and full-canvas figures respectively and are wrong. The builder checks the canvas, the origins (multiples of 3) and the unique cell count and throws `multigrid.invalidGeometry` on any mismatch.

### 8.5 Wordoku

```
1. Pick a 9-letter isogram from the list for the current language
   (assets/wordlists/isograms.en.js | isograms.vi.js), or take the user's own word (option `word`).
   Isogram = a word whose 9 letters are pairwise distinct.
2. Build the value↔letter mapping: letters = the letters of the word in ALPHABETICAL order
   (value 1 = the smallest letter). The order is a function of the word alone, so the keypad of a renderer
   comes out sorted and the digits view does not read 1, 2, …, 9 down the word line.
3. Force the main diagonal (or a row/column: options `placement` and `line`) to carry exactly the
   word's sequence of letters → convert it into fixedCells with the corresponding numeric values.
4. Generate the full grid with those fixedCells, then dig as for classic9. Solvers work from `givens`
   alone and never see `fixedCells`, so the word is not a clue: the line is dug like any other cells,
   the puzzle is unique without knowing the word, and the word shows up by solving.
5. Display: the symbols are letters (`symbolMode 'word'`, the default; `'digits'` is the alternative);
   `layout.overlays[0]` is `{ kind: 'wordLine', cells }`; `SG.wordoku.describe(model)` returns the word and
   the line, `readWord` / `isWordSolved` spell what the player has filled in. The word stays hidden until
   the puzzle is solved (true to the spirit of Wordoku).
```

**On Vietnamese:** 9-letter isograms are very rare in Vietnamese once diacritics are counted. Solution: the VI list uses **compound words and proper nouns with diacritics stripped**, each of which must have exactly 9 distinct characters — e.g. `HOANGKIEM`, `BACHTUYEN`, `TRUNGBACH` (the Vietnamese glosses of the first draft were wrong and were dropped). Valid entries are hard to find, so the VI list **is allowed to be empty or short** (`SG.wordoku.MIN_WORDS` = 5); when it is, the generator falls back to the EN list automatically and says so (event `extraStructure.wordFallback`; the UI can pre-check `SG.wordoku.resolveWordList('vi').fellBack`). Every entry in both lists is verified automatically (`wordoku.test.js`, from task `T-5.4`) to have exactly 9 distinct characters — an entry that fails this check is a build-breaking error, not a warning.

### 8.6 Mega 12×12 / 16×16

- `mega12`: boxes of **3 rows × 4 columns**; symbols `1–9, A, B, C` (default) or `1–12`.
- `mega16`: **4×4** boxes; symbols `0–9, A–F` (hex style, the default) or `1–9, A–G`. Mind the hex set: its first label `0` belongs to value 1; the value 0 of a solve state still means "empty".
- The symbol set is the variant option `symbolSet` (a `select`), because the symbol *modes* of Mega are `digits` only; the core only ever sees the integers `1…D`, and `model.symbols.labels[v-1]` is the text drawn.
- Performance: a 16-bit bitmask still fits in an `int32` ⇒ the core needs no changes. But the search space is much larger ⇒ the variant declares a lower `restartThreshold` (300 / 400) and a `fastSeed` that fills the diagonal boxes of the box grid (cuts about 30 % of the full-grid time), and generation always runs in a Worker when there is one. A 256-cell board still keeps a `full` trace.
- UI: the font size shrinks with the cell size (the SVG scales as a whole). The first plan's mobile horizontal scrolling with a minimap was **not built**: the board scales to the screen width instead (see §18).

### 8.7 Diagonal X & Hyper — sharing one builder

Both are just `classic9` **plus additional units**:

```js
// diagonalX: 2 units
units.push(cellsWhere(r === c));          // main diagonal
units.push(cellsWhere(r + c === D - 1));  // anti-diagonal
// hyper: 4 units (3×3 windows at the corner positions of the 9×9 grid)
for (const [r0, c0] of [[1,1],[1,5],[5,1],[5,5]]) units.push(box3x3At(r0, c0));
```

So they are bundled together in `js/variants/extra-regions.js`, and can **be enabled at the same time** (`diagonalX` with the boolean option `withHyper`, or `hyper` with `withDiagonals`; both give the same 33-unit hybrid board). `diagonalX` has 29 units and `hyper` 31. The unit order is rows, columns, boxes, then the diagonals, then the windows; `layout.overlays[i]` (`kind: 'diag'` or `'window'`) describes `units[27 + i]`, and overlays overlap each other, so a renderer blends their translucent fills.

### 8.8 Mini 4×4 / 6×6

- `classic4`: 2×2 boxes, supports only `veryEasy`/`easy`. Very fast — used as the "smoke test" for the whole pipeline.
- `classic6`: boxes of **2 rows × 3 columns**. Supports `veryEasy`/`easy` only: `medium` was dropped because only 0–3 % of its puzzles landed there (decision D3; see §18).
- UI: the default symbol mode stays `digits`; `shapes` and `colors` are one selection away. The first plan's "kid mode" switch was not built.

---

## 9. Performance & Concurrency

### 9.1 Performance targets (budgets)

Measured on a mid-range desktop (~10th-generation Intel i5), Chrome, `trace: summary` mode. p95 over 50 runs.

| Variant | veryEasy | medium | hard | expert | evil |
|---------|---------|--------|------|--------|------|
| `classic4` / `classic6` | < 10 ms | < 20 ms | — | — | — |
| `classic9` | < 60 ms | < 150 ms | < 400 ms | < 900 ms | < 2.5 s |
| `diagonalX` / `hyper` | < 80 ms | < 200 ms | < 500 ms | < 1.2 s | < 3 s |
| `jigsaw9` | < 150 ms | < 350 ms | < 900 ms | < 2 s | < 5 s |
| `wordoku` | < 100 ms | < 250 ms | < 600 ms | < 1.5 s | — |
| `killer` | < 300 ms | < 700 ms | < 1.8 s | < 4 s | — |
| `greaterThan` | < 300 ms | < 700 ms | < 1.8 s | < 4 s | — |
| `mega12` | < 400 ms | < 1 s | < 3 s | — | — |
| `mega16` | < 1.5 s | < 4 s | < 10 s | — | — |
| `butterfly` | < 1 s | < 3 s | < 8 s | — | — |
| `samurai` / `flower` / `sohei` | < 3 s | < 8 s | < 20 s | — | — |

A `—` entry = the variant does not declare support for that level (`difficultySupport`); for `classic4` / `classic6` the second column is their `easy` target, since they offer no `medium`.

**Status.** `node tests/perf.js` measures every cell of this table, and `tests/soak.js` prints the same budgets next to its own timings. Measured in Node on the development machine (not in Chrome on the reference i5), every cell meets its target, most of them by an order of magnitude or more; the slowest relative to its budget is Killer expert (p95 ≈ 1.3 s of 4 s). The cheap `perf` suite of the normal test run only warns; the *regression hashes* of `tests/fixtures/regression.js` are what keeps an optimisation honest (§15.2).

### 9.2 Mandatory optimisation rules

| # | Rule |
|---|------|
| R1 | Every hot data structure uses `Int32Array`/`Uint8Array`; **no** `Array` of objects in the core loops |
| R2 | No memory allocation in hot loops; use reusable buffers (a scratch buffer pool) |
| R3 | `popcount` uses the branch-free Hamming weight algorithm, not `toString(2).split()` |
| R4 | No `try/catch` inside hot loops (it hinders JIT optimisation) |
| R5 | Clone state with `TypedArray.prototype.set()` onto pre-allocated buffers, not repeated `.slice()` calls |
| R6 | Every function that can run for > 50 ms must accept a `budget` parameter and call `budget.check()` periodically |
| R7 | No `console.log` in hot loops, even for debugging (use the `SG.DEBUG` flag) |

### 9.3 Web Worker & fallback mechanism

```js
SG.workerClient = {
  generate(config, onEvent) → Promise<PuzzleResult>,   // events arrive in batches; rejects with a GenerationError
  cancel() → boolean,
  get mode() { return 'worker' | 'main'; },            // final once ready() has settled
  ready() → Promise<'worker'|'main'>,                  // detects Worker support (ping/pong handshake, 5 s timeout)
  create(options) → client,                            // an independent client (+ dispose()): used by the cache
};
// options of create(): forceMode 'auto'|'worker'|'main', workerUrl, workerFactory, chunkMs (12), batchMs (30),
// maxBatch (400), budgetMs (120 000, ACTIVE ms), readyTimeoutMs (5000), killAfterMs (150), now, yieldFn, paintFn
```

**Both modes run the same resumable algorithm.** `SG.pipeline.run` is synchronous, so a worker that called it could not read a `cancel` message until it finished. Both modes therefore run `SG.pipeline.runSteps`, a generator that yields at the natural boundaries of the work (between the pipeline steps and, inside the dig, after each oracle call or rated candidate; `SG.digger.*Steps` are its twins, `SG.budget.drive` runs any of them to the end, which is how `run` is `runSteps` driven to completion — so the events, the puzzle and the budget accounting cannot differ). The scheduler gives the thread away between slices of `chunkMs` (default **12 ms**): the page to its event loop, the worker to its message queue — in both cases through a `MessageChannel` round trip, which is neither clamped to 4 ms nor throttled in a background tab. The time given away is not charged to the run (`SG.budget.createClock`): the time limit, the event times and the step timings count active time only.

**`worker` mode:** the client creates `js/worker/gen.worker.js`, which loads the core, the variants and the word lists with `importScripts` (in the order of `SOURCE_FILES`, never the UI or the client). Every message after the handshake carries the `session` number of its run, so nothing of a cancelled or replaced run can reach the new one. Events are batched (about every 30 ms, or 400 at once) before `postMessage`; the result crosses as plain data (`SG.pipeline.toWire` / `fromWire`: the model is reduced to what `SG.model.create` needs, rebuilt on the page, and the lazy Killer / Greater-Than propagation extensions are switched on there).

**`main` mode (fallback, `file://`, CSP, no Worker):** the client drives the same generator itself. The page stays responsive between slices, but a slice is never shorter than the longest piece of work that cannot be split — one DFS slice in Killer takes 70–86 ms, a Greater-Than sign dig 50–70 ms per sample, the cage layout of a hard Killer up to ~300 ms — so the page may stall for that long; the total time is somewhat longer too. The UI shows a badge indicating which mode is active (`Main thread` / `Background thread`).

**Cancellation is cooperative first.** `cancel()` rejects the promise at once (code `budget.cancelled`, no further events delivered) and takes effect at the next slice boundary in both modes. In worker mode it is a `cancel` message first (the worker stays warm and is reused); only if the worker has not answered after **150 ms** (it is inside a piece of work that cannot be interrupted) is it terminated, and a new one is created the next time. A `SharedArrayBuffer` flag was **not** used: it needs cross-origin-isolation headers that a plain static server does not send. `dispose()` cancels the run, terminates the worker and releases every timer and listener.

### 9.4 Leak prevention & memory pressure

- The trace log is bounded by `maxTraceEvents` (20 000; `SG.events.createTraceBuffer`); beyond that threshold, the `micro` events are down-sampled. The replay does not read the trace (it is built from the dig log, a few hundred entries at most, §7.3), so the limit no longer affects what it shows.
- Clear the previous generation's trace before starting a new one.
- When a caller asks for a `full` trace of `samurai`, the pipeline automatically downgrades it to `summary` (warning `trace.downgraded`, shown in the result panel), because `full` can produce hundreds of thousands of events. The page itself never asks for `full`: it sends no `trace` and gets `summary`.
- The cache never stores the trace (it can be megabytes) nor the dig log; a cached puzzle's trace and dig log are regenerated from its seed ([§6.8 ⑦](#68--optimal-hole-digging-strategy)).

---

## 10. UI/UX Design

### 10.1 Overall layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER   [Sudoku Generator]         [EN|VI]  [☀/☾]  [⚙ Settings]  [? Help]  │
├──────────────────────┬────────────────────────────────┬─────────────────────┤
│  GENERATED PUZZLES   │          MAIN PANEL            │  PUZZLE OPTIONS     │
│  (left, ≥ 1360px)    │        (middle, fluid)         │  (right, ≤ 340px)   │
│                      │ Heading    [Play][Print][Export]│                     │
│  Classic 9×9    [×]  │ Subheading                     │ [✦ GENERATE]        │
│  Hard: score 673,    │     ┌───────────────────┐      │ [⟲ Generate random] │
│  seed 12345          │     │                   │      │ ───────────────     │
│  Jigsaw Sudoku  [×]  │     │    GRID (SVG)     │      │ Variant         [▾] │
│  Expert: score …     │     │                   │      │ Difficulty      [▾] │
│  ⋮                   │     └───────────────────┘      │ Symbols         [▾] │
│            [Clear]   │ ┌─ Summary │ Generation Steps ┐│ Seed [_______][⧉]   │
│                      │ │ cards · Difficulty Score    ││ (+ variant options) │
│                      │ │ table (or: ⏮ ‹ › ⏭ slider,  ││ ▸ Advanced options  │
│                      │ │ step description + table)   ││                     │
│                      │ └─────────────────────────────┘│                     │
├──────────────────────┴────────────────────────────────┴─────────────────────┤
│ FOOTER   © 2026 Dat Le. Released under the MIT licence. · Source code        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Main panel.** At its top left, a heading `<variant> - <difficulty> (Seed: <seed>)` (`#puzzle-heading`; the level reached and the seed used once a puzzle is on screen, the choices of the form before) and the description of the variant (`#puzzle-subheading`); at its top right **Play** (`#btn-play-online`, opens the puzzles of the list in sudoku-player in a new tab, the one on screen first, [§10.9](#109-hand-off-to-the-player-exchange)) **Print** (`#btn-export`, [§10.6](#106-export)) and **Export** (`#btn-export-code`, the chosen puzzles as readable text, [§10.6](#106-export)), enabled once a puzzle is shown. While no puzzle is on screen the board shows the empty layout of the chosen variant, and choosing another variant shows its layout at once (a puzzle of the old variant is discarded). Under the board, one box with two tabs (`.player__tabs`; arrow keys, Home and End move between them): **Summary** (`#result-panel` with `#result-root`, [§10.5](#105-result-panel); selected after every generation) and **Generation Steps** (`#steps-root`: at its top the replay controls (`#btn-first #btn-prev #btn-next #btn-last`, the slider `#scrubber` with a mark for every step, "Step k of N" in `#player-time`, [§7.3](#73-replay-engine-in-the-ui-layer)), then the step description in `#step-detail` — number, title, summary and sentence of the step on show, the Difficulty Score table of the puzzle at that step, the legend of the board frames — and the **Explain** icon). While a run goes on the board shows the empty layout and **Cancel** is the only live control; there is no status line. The puzzle options (`#controls-root`: at the top **Generate** and **Generate random** — `#btn-generate`, `#btn-regenerate`: a new random seed, then a generation, `SG.app.regenerate()`; enabled after the first run — and **Cancel** while a run goes on, so that they never move when a variant has many options; below them the form) are the right column. **Footer** (`footer.app-footer`, under the whole layout, centred, not printed): "© 2026 Dat Le. Released under the MIT licence." and a link to the repository (`https://github.com/tdat00/sudoku-generator`, opens in a new tab with `rel="noopener noreferrer"`); the texts are `shell.footer.*`, the dot between them is drawn by CSS.

**Puzzle history** (`SG.history`, `js/ui/history.js`, left panel `#history-root` with `#history-list`, `#history-clear`): every generated puzzle is added to a list in `localStorage` (`sg.history.v1`, newest first, 100 at most, memory fallback). An entry holds the variant, the level asked for and reached, the seed, clues, score, time and the configuration that rebuilds the puzzle. A puzzle generated again moves to the top; picking an entry writes its configuration to the form and calls `SG.app.generate` (same seed, same puzzle; the result cache serves it at once) without moving the entry; imported puzzles are not listed. Each item shows the variant name with, below it, `<level>: score <score>, seed <seed>` (the level in bold), a seed longer than 6 characters being cut to its last 6.

**Responsive** (`css/layout.css`):
- `≥ 1360px`: 3 columns — the list of puzzles (wide enough for `<variant> - <level>` on one line; a longer title is cut with an ellipsis) | the board and the replay box (replay controls and the Summary / Generation Steps tabs) | the puzzle options (the two side columns are sticky and scroll by themselves).
- `768–1359px`: 2 columns — the board, the replay box and the list of puzzles on the left; the puzzle options on the right.
- `< 768px`: 1 stacked column (board, replay box, result, list of puzzles); the header keeps only the title, Settings and Help (language and theme move into the Settings dialog); Play, Print and Export (icon-only for the last two) sit above the puzzle heading; a fixed bottom row always shows Generate and Generate random (50% each) plus an icon-only Options button, which slides the other options up as a drawer.

The page mount points are fixed ids that every module renders into (`#history-root`, `#controls-root`, `#board-root` with `#board-svg`, `#player-root`, `#steps-root` with `#step-detail` and `#btn-explain`, `#result-root`, `#modal-root`, `#toast-root`, `#a11y-live`); later modules only add elements inside their own mount point.

### 10.2 Board renderer — why SVG

| Criterion | SVG | Canvas | HTML/CSS Grid |
|-----------|-----|--------|---------------|
| Irregular region borders (Jigsaw) | ✅ easy (path) | ⚠️ manual | ❌ very hard |
| Dashed cages (Killer) | ✅ `stroke-dasharray` | ⚠️ | ❌ |
| `<`/`>` signs on the edges | ✅ | ⚠️ | ⚠️ |
| Overlapping regions (Samurai) | ✅ | ✅ | ❌ |
| Sharp printing | ✅ vector | ❌ pixel | ✅ |
| Accessibility (a11y) | ✅ real DOM | ❌ | ✅ |
| Smooth animation | ✅ CSS transition | ✅ | ✅ |
| Performance with 369 cells | ✅ sufficient | ✅ | ⚠️ |

**→ Choose SVG.** Update through delta patches (touch only the `<text>`/`class` of the changed cells); never redraw the whole tree.

**SVG tree structure:**
```
<svg viewBox="0 0 W H" aria-labelledby="board-title board-desc">   <!-- role="img"; js/ui/a11y.js makes it role="grid" -->
  <g class="layer-regions">   <!-- paper, Jigsaw tints, diagonal/window/overlap/word-line overlays, Killer cage colours -->
  <g class="layer-cells">     <!-- one <rect class="cell" data-cell="i"> per cell: state and colour-mode background -->
  <g class="layer-cages">     <!-- Killer: dashed inset outline + sum <text> -->
  <g class="layer-ineq">      <!-- Greater-Than: signs on the edges (data-sign = index; the replay hides or marks them) -->
  <g class="layer-values">    <!-- per cell one <text> (digit, letter, word) and one <use> (geometric symbol) -->
  <g class="layer-grid">      <!-- thin lines within a region, thick between regions, sub-grid outlines, optional coordinates -->
  <g class="layer-overlay">   <!-- effects: probed, technique and selected cells; the replay frames (removed, put back, revealed) -->
</svg>
```

One cell is 40 board units; the `viewBox` scales the whole board, so there is no resize code. The geometry is a **pure** function (`SG.boardView.geometry(model, opts)`, `renderMarkup`, `exportSvg`) that runs in Node — export, print and the help illustrations draw boards from it without a DOM — and `SG.boardView.create(svgEl, model, opts)` builds the tree once from that markup and then only patches nodes (`setLayerVisible(name, flag)` shows or hides a layer by its `data-layer` name: `regions overlays word cages ineq cells values grid coords overlay`).

### 10.3 Animation language

The replay of the page ([§7.3](#73-replay-engine-in-the-ui-layer)) moves between **static** pictures: no animation, one set of marks per step (`css/board.css`; the dash or the dots tell the marks apart without colour). The legend in the step description explains the ones the steps use.

| Mark | Look | CSS class |
|------|------|-----------|
| Removed in this step | Solid amber frame, pale amber fill | `.hl.cell--dug` |
| Tried, but put back | Dashed red frame | `.hl.cell--kept` |
| Clue shown in this step (Greater-Than) | Dotted violet frame | `.hl.cell--revealed` |
| Sign taken away in this step | The sign is drawn dashed and faded | `.sign--removed` |
| Sign tried, but kept | The sign is drawn red | `.sign--kept` |
| Sign taken away in an earlier step | Not drawn | `.sign--hidden` |

The animations below remain in `SG.boardView` for a caller that plays events back (`applyPatch(patch, { animate })`, `pulseDone()`); the page's replay no longer uses them.

| Event | Effect | CSS class | Duration |
|-------|--------|-----------|----------|
| Filling a number (step 3) | The number appears + a slight zoom | `.cell--placing` | 120 ms |
| Backtrack (step 3) | Flashes red, then disappears | `.cell--backtrack` | 180 ms |
| Being probed for digging (step 5) | Yellow border blinks | `.cell--probing` | 200 ms |
| Dig accepted | The number fades out and disappears | `.cell--removed` | 200 ms |
| Dig rejected | Flashes red, the number reappears | `.cell--restored` | 300 ms |
| Technique applied (step 6) | Highlights the involved cells + connecting lines | `.cell--technique` | 400 ms |
| Finished | The whole grid gives a gentle "bounce" | `.board--done` | 500 ms |

> **Mandatory:** all animations must be disabled under `@media (prefers-reduced-motion: reduce)` or when the user turns them off in Settings (`:root[data-motion="off"]`). The durations are the `--sg-board-dur-*` tokens of `css/tokens-board.css`. Headless Chromium reports reduced motion by default, so animations do not play in a headless screenshot.

### 10.4 Control panel — the options

| Group | Option | Type | Default |
|-------|--------|------|---------|
| Basic | Variant | select (grouped) | `classic9` |
| Basic | Difficulty | select (filtered by `difficultySupport`) | `medium` |
| Basic | Symbol set | select (filtered by variant) | `digits` |
| Basic | Seed | text + 📋 copy button; any text is accepted (a whole number 0–4294967295 as it is, anything else FNV-1a hashed, §14.2) | random (empty) |
| Advanced | Symmetry | select + miniature preview | `rotational180` |
| Advanced | Dig sequence style | select | `random` |
| Advanced | Max attempts | number 1–20 | 8 |
| Advanced | Show solution | toggle (the solution is drawn on the finished puzzle, at the last position of the replay) | off |
| Variant | Cage size (Killer, `cageSize`) | slider −2…+2 | 0 = "by difficulty" |
| Variant | Region compactness (Jigsaw, `compactness`) | slider 0–1 | 0.6 |
| Variant | Symbol set (Mega, `symbolSet`) | select | `letters` (12×12) / `hex` (16×16) |
| Variant | Signs on the whole grid (Greater-Than, `futoshiki`) | toggle | off |
| Variant | Word placement / line / language / own word (Wordoku) | select · slider 0–9 (0 = random; row and column only) · select · text (≤ 24 characters) | diagonal · random · `en` · empty |
| Variant | Add hyper windows / add diagonals (`withHyper`, `withDiagonals`) | toggle (advanced) | off |

**Principle:** variant-specific options are **generated automatically** from the `variant.options` schema in the registry — no hand-written HTML for each variant.

**No replay options:** the replay has no setting in the form. The former "Replay detail" field (the trace verbosity) and the replay speed are gone, together with their `trace` / `speed` URL parameters and stored values (§14.2, §14.3); the replay is stepped by hand ([§7.3](#73-replay-engine-in-the-ui-layer)).

**Descriptions:** the description of an option (`hintKey`) is not printed under the control. Each label has a small help icon (`.help-tip`) whose tooltip shows it — on hover, keyboard focus and click/tap; Esc closes it. The tooltip is styled rich text (`richText` in `controls.js`: a blank line starts a paragraph, `**text**` is bold; built from DOM nodes, never `innerHTML`) and is the `aria-describedby` of the control.

### 10.5 Results panel (after generation finishes)

Shows (`SG.resultView`, in `#result-root`): two small cards — the difficulty (the level reached, with its score underneath) and the clue count — and a "Difficulty Score" table in two sections — **Technique**: one row per technique the puzzle needed (the registry order, simplest first): name (with a small help icon that shows the summary of the technique), number of uses, score per use and the subtotal it adds (`SG.difficulty.techniqueScore`: cost × (uses − 1 + first-use multiplier)); **Other** (only when it has a row): an **Empty cells** row (the number of empty cells × the bonus of one, 0.6) and, when the hardest technique belongs to a higher level than the points give, a **Bonus points for difficult techniques** row (the technique floor of §6.6), each with a help icon. The **Total** row at the end is the difficulty score shown in the card. The subtotals are whole numbers that add up to the total as written (`SG.stepView.roundToTotal`: the largest remainders get the extra points). The table of the step description ([§7.3](#73-replay-engine-in-the-ui-layer)) has the same columns and rows for the puzzle at that step (`player.rateStep` gives `counts`, `empties`, `score`), so at the last step its total is the score of the summary. A puzzle that needs no technique says so instead of the table. The panel has no preview image, seed, share link, "Play online" button, solution switch or timings; the form still has the "Show the solution" option, and the seed is in the main heading.

If the difficulty **does not exactly match** the requested level (`difficulty.approximate`) ⇒ a clear yellow warning with a "Retry with a different seed" button. The other warnings (`trace.downgraded`, `digger.unsoundTechnique`) are listed, translated; no warning, no warning UI.

### 10.6 Export

The Print button (`#btn-export`, a printer icon) opens one dialog titled **Print** (`SG.exportUi`, a `<dialog>` of `SG.app.openModal`): the list of the saved puzzles (`SG.history`, newest first; the puzzle on screen is ticked, **Select all** / **Select none**, "n of N selected"), **Puzzles per page** (buttons for 1, 2 or 4; 4 at first), the **Add the solutions on separate pages** switch, the hint about "Save as PDF", and a footer with **Cancel** and **Print…**. There is no preview. A puzzle that is not on screen is generated again from its saved settings (same seed, same puzzle; "Preparing puzzle k of n…" is shown meanwhile, Cancel stops it); then the pages are built (`buildPrintLayout`) and the dialog closes once the print dialog of the browser was opened. The **Export** button (`#btn-export-code`, `action { id: 'exportCode' }`) opens a second dialog, `SG.exportUi.openText()`: the same list of saved puzzles (same picker, same "Preparing puzzle k of n…" generation of the ones not on screen), a read-only monospace box with the text of the ticked puzzles (`buildExportText(items)`) and a **Copy** button (`SG.controls.copyText`). The text is plain and readable: for each puzzle a header line `#<n>,<variant>,<level>,<seed>` (names in the language of the page, no comma or × in them) and then the grid, one row per line — a digit for a clue (`A`, `B`… for the values 10, 11…), `.` for an empty cell, `_` where the canvas of the board has no cell — with a blank line between puzzles. The clues are exported, and for the variants whose board the grid does not fix a few `key: value` lines follow the grid (no blank line): `regions:` (Jigsaw: the region 1-9 of every cell, nine groups of nine), `cages:` (Killer: `sum=r1c1,r1c2` per cage, cells named by row and column from 1), `signs:` (Greater-Than: `r1c1<r1c2`, the first cell is less than the second) and `letters:` + `word-line:` (Wordoku: the letter of each value and where the key word sits, never the word). Every other variant is fixed by its name and the grid (Samurai and the like by the `_` of its canvas), so sudoku-player rebuilds its board from the text. The **Play** button is not part of either dialog: it hands the puzzles of the list to the player ([§10.9](#109-hand-off-to-the-player-exchange)) as this very text, packed into one link.

| Format | Contents | Notes |
|--------|----------|-------|
| Print / PDF | The puzzles chosen from the saved list, 1, 2 or 4 to a page (+ optionally the solutions on separate pages) | `print.css`, sharp vector output (`SG.exportUi.boardSvg` as an image in `#print-root`), hides every control element; the browser's print dialog does the PDF |

The image (PNG, SVG), file (JSON, text), link and batch-printing exports, and the import of a puzzle, were removed; the puzzle JSON of §14.1 survives only as the document of the player link ([§10.9](#109-hand-off-to-the-player-exchange)).

### 10.7 Accessibility

- Everything is operable by keyboard; a sensible tab order; a "Skip to main content" link (it moves focus to `#main`).
- Grid (`js/ui/a11y.js`): the board `<svg>` gets `role="grid"`, its cells are grouped into `role="row"` and get `role="gridcell"` + a translated `aria-label` ("Hàng 4, cột 7, giá trị 5" / "Row 4, column 7, value 5"; cage sums and signs are part of the label); one cell is in the tab order (roving `tabindex`); arrow keys, Home, End, Ctrl+Home, Ctrl+End, Page Up and Page Down move between real cells (holes of a multi-grid canvas are skipped); a focus ring is drawn on top of the board.
- An `aria-live="polite"` region (`#a11y-live`, written by `SG.app.announce`) says the start of a generation and a language change (`SG.a11y`, de-duplicated and rate-limited), the finished puzzle with its level and clue count, a cancel, and the cache's "the step-by-step replay is ready"; no event of a run and no replay step is announced there (that would be noise). The page has no status line: errors and cancels are toasts and announcements.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for lines, borders and focus rings, in all three themes, and 7:1 for text in the high-contrast theme (computed from the token files by `theme.test.js`). A colour palette that is safe for colour-blind users; `colors` mode is **always** accompanied by geometric symbols unless the user switches that off in Settings.
- A high-contrast theme and text-size adjustment (small / normal / large = 87.5 % / 100 % / 125 % of the base font size).
- Respect `prefers-reduced-motion` and `prefers-color-scheme`. A **Settings dialog** (`SG.a11y.openSettings`) holds the theme, the text size, reduced motion, the colour-blind symbol, the switch of background pre-generation (shown only when it exists, i.e. in worker mode; the choice is not persisted) and the board coordinates.
- No real screen-reader run has been done (§18).

### 10.8 Theming

Use CSS Custom Properties: `css/tokens.css` (general tokens: colours, spacing `--sg-space-1..6`, radii, shadows, fonts, motion) and `css/tokens-board.css` (`--sg-board-*`: board colours, the 16-entry symbol palette, animation durations). Three themes, selected by `data-theme` on `<html>` (`:root, :root[data-theme="light"]`, `:root[data-theme="dark"]`, `:root[data-theme="high-contrast"]`); the preference `auto` removes the attribute so `prefers-color-scheme` rules. All colours/spacing/corner radii/shadows are declared as tokens — **hard-coding colour values is forbidden** outside the two token files (checked by `ui-contract.test.js` and `theme.test.js`).

A tiny inline script in `index.html` reads the stored preferences before the stylesheets paint and sets `data-theme`, `data-motion` and the font size, so the first paint has the right look (no flash). `SG.theme` adds the `<meta name="theme-color">`, a smooth colour transition on a theme change (never under reduced motion), the tracking of the operating-system scheme while the preference is `auto`, and the run state `data-run` (`idle` / `busy` / `ready` / `error` / `cancelled`) on `#app-layout` with the empty / busy / error hints of the panels. The favicon is `assets/favicon.svg`.

### 10.9 Hand-off to the player (exchange)

The generator does not play puzzles; the separate **sudoku-player** web app does (repository [tdat00/sudoku-player](https://github.com/tdat00/sudoku-player), published at `https://tdat00.github.io/sudoku-player/`). Task `T-7.8` hands a puzzle over without a server: the whole puzzle travels in the **fragment** of a link, which a browser never sends anywhere. The only code shared by the two repositories is `js/ui/exchange.js` (`SG.exchange`, copied byte for byte into both, with its suite `tests/suites/exchange.test.js`; no DOM).

**The document** is the puzzle JSON of [§14.1](#141-json-schema-of-a-puzzle) (`format: 'sudoku-generator/v1'`) exactly as `SG.exportUi.toJson(result, ctx)` writes it, plus one additive block, **`model`** = `SG.exchange.plain(SG.pipeline.toWire(result).model)`: the plain-data *ModelSpec* that `SG.model.create(spec)` accepts (`variantId, digits, cellCount, units, unitMeta, cages, inequalities, layout {rows, cols, cellRow, cellCol, cellRegion, overlays, subGrids}, symbols {mode, labels}, fixedCells`; typed arrays become plain arrays). With it the player rebuilds the board with **no variant code**, then switches on the lazy propagation extensions when the model needs them (`SG.comboTable.enablePropagation(variantId)` for cages, `SG.ineq.ensureExtension()` for inequalities). Everything else the player shows is in the document already: `variantId`, `givens`, `solution`, `seed`, `symbolMode`, `digits`, `cellCount`, `difficulty {requested, achieved, score, hardestTechnique, techniqueCounts}`, `symmetry`, `generatedAt`, `stats`, `labels`, `locale`, `wordoku`. The generator itself no longer imports puzzles; the JSON stays backward compatible (`format` stays `sudoku-generator/v1`). `format.test.js` checks, for every variant, that `SG.model.create(doc.model)` rebuilds an equal model (also after the token round trip).

**The token** of a single document is `z.` + base64url(deflate-raw(UTF-8 JSON)), or `j.` + base64url(JSON) where compression is unavailable or does not pay. `SG.exchange.encode(doc, { compress? })` and `decode(token)` are asynchronous (`CompressionStream`), limited to 8 MiB of JSON / 4 Mi characters of token (a decompression bomb is refused while streaming). **A bundle of puzzles** — what the **Play** button sends — is not a list of documents (a `model` block per puzzle would make a long link) but the readable text of the Export box (`buildExportText`, [§10.6](#106-export)), which the player already imports: its **text token** is `t.` + base64url(deflate-raw(UTF-8 text)) or `s.` + base64url(text) (`SG.exchange.encodeText(text, { compress? })`, `decodeText(token)`, `isTextToken(token)`, the same limits). Failures are `SG.errors.GenerationError`s with the codes `exchange.invalidToken`, `exchange.tooLarge`, `exchange.unsupportedEncoding`, `exchange.invalidJson`, `exchange.invalidUrl`, translated through `SG.i18n.tError` (`error.exchange.*` in both packs). `SG.exchange.playerUrl(base, token, { active? })` makes `<base>#puzzle=<token>` — for a bundle `<base>#puzzle=<text token>&active=<n>`, `n` being the 1-based number of the puzzle to show first (it replaces an existing fragment and refuses any base that is not `http(s)` or a relative path); `tokenFromHash(hash)` and `activeFromHash(hash)` are what the player calls on load and on `hashchange`.

**Play online** (the **Play** button next to **Print**: the app emits `action { id: 'play' }`, `SG.exportUi.init` answers with `playOnline()`; building blocks `SG.exportUi.buildPlayBundle / buildPlayLink / openPlayLink / playerBase`): `playOnline()` sends **every puzzle of the saved list** (`SG.history`, newest first, the order of the list) plus the puzzle on screen when it is not in the list (the same `pickChoices()` as the Print and Export dialogs), and the puzzle on screen is the **active** one (`&active=<its position>`). The puzzle on screen is at hand; the others are generated again from their saved settings (`startFetch`, the same job as the Print and Export dialogs, with the `resultCache` of the last 40). When something has to be generated, a dialog (`SG.app.openModal`, title "Play in Sudoku Player") tells "Preparing puzzle k of n…", ends with **Open the player** (a tab opened after a long wait would look like a pop-up, so the final click opens it; **Cancel** and closing stop the generation) and nothing opens by itself; when everything is at hand there is no dialog. `buildPlayBundle(results, { base?, active?, compress? })` writes the text of the results, encodes it and builds the link; the link is opened with `window.open(url, '_blank', 'noopener')`, and a toast says so. The player's address is read from `<meta name="sg-player-url" content="…">` in `index.html` (hard-coded fallback `https://tdat00.github.io/sudoku-player/`); an invalid address, like any other failure, is a translated error toast. Above 100 000 characters a second toast warns that apps and servers may cut the link (a list of 100 puzzles is a few tens of thousands). `buildPlayLink(result)` (the document of one puzzle) is kept for code that wants it; the player reads both kinds. No storage key was added.

**Not in this repository:** the player's importer, its game engine, hints and UI. The player also accepts a bare 81-character line (16 and 36 for the smaller boards) and builds a classic model for it itself.

### 10.10 Help

`SG.help` (task `T-7.6`): the Help button opens a dialog with five tabs — the rules of every variant (with a small picture drawn from the real geometry), the difficulty levels and the technique ladder, how generation works, controls and keyboard shortcuts, about. What the registries already know (variant names, options, levels, technique names and descriptions, step names) is **read from them, never copied**, so the help cannot drift from the code; `help.test.js` fails when a variant has no help entry. The generation tab explains the replay (`help.generation.replay`), the controls glossary ends with the replay under the board (`help.controls.replay`), and the keys tab has a Replay group for the slider. There is no first-visit tour or other popup.

---

## 11. Bilingual Support (i18n)

### 11.1 Architecture

```js
SG.i18n.t('dig.accept', { cell: 'R4C7', count: 42 });
SG.i18n.setLocale('vi');                 // → returns 'vi'; fires the 'localechange' DOM event and the onChange listeners
SG.i18n.current;                         // 'vi' | 'en'
```

- The language packs are **plain JS files** that assign to `SG.locales.en` / `SG.locales.vi` — **do not `fetch` JSON**, to avoid CORS blocking on `file://`. The shared strings live in `js/ui/locale.en.js` / `locale.vi.js` (steps, explanations, techniques, difficulty, symmetry, variants, events, errors, generic words).
- **`SG.localeFragments`** is how every other file adds keys without editing the hot locale files: it is an array of `{ en: {...}, vi: {...} }` objects pushed at the bottom of the file that owns the strings (variants, `tech-cage.js`, `tech-ineq.js` and every UI module do this; 22 fragments at the time of writing). `SG.i18n.mergeFragments()` merges the ones that appeared since its last call into the packs (on first use and again whenever the array grew). The base packs win: a fragment that redefines an existing key is reported in `SG.i18n.conflicts` and does not override it, and `i18n.test.js` fails on a conflict. Keys must be globally unique and prefixed by their module (`controls.*`, `board.*`, `symbols.*`, `steps.*`, `explainCard.*`, `player.*`, `replay.*`, `result.*`, `app.*`, `shell.*`, `cache.*`, `export.*`, `a11y.*`, `theme.*`, `help.*`, `worker.*`, `variant.*`, `technique.*`).
- Translation keys use hierarchical dot notation: `controls.variant.label`, `explain.dig.what`, `technique.xWing` (the name), `technique.xWing.desc`, `technique.xWing.step` (the sentence of one step; variants such as `.step.endpoints` exist), `error.<code>` for every `GenerationError` code.
- Parameters are inserted using the `{name}` syntax. Plural forms are keys with the suffix `_one` / `_other`; the category comes from `Intl.PluralRules` and `args.count`, and a language without that form falls back to `_other`, then to the plain key (Vietnamese has no plural forms). A text may also depend on `args.rule`: the key `<key>.<rule>` wins when it exists.
- Applying to the DOM: the attributes `data-i18n="key"`, `data-i18n-attr="title:key2,aria-label:key3"` and `data-i18n-args='{"n":3}'`. When the language changes, `applyTo(root)` rescans and updates — no page reload.
- Number/duration formatting goes through `Intl.NumberFormat` with the corresponding locale (`formatNumber`, `formatDuration`).
- Beyond the contract of §13.11 the module offers `detect(sources)` (rule L4, pure), `normalize(code)`, `tError(errOrCode, args)` (the text of `error.<code>`), `eventText(event, options)` (the text of a `GenerationEvent`, cells turned into labels), `setCellLabeler(fn)` / `cellLabel` (how a cell index becomes `R4C7` for the current puzzle) and `has(key)` / `keys(locale)`.

### 11.2 Mandatory rules

| # | Rule |
|---|------|
| L1 | **No displayed string may be hard-coded** in JS or HTML |
| L2 | The two language packs must have an **identical key set**, the same `{placeholders}` and no empty value (`i18n.test.js` checks this automatically, for the packs and for every fragment) |
| L3 | A missing key ⇒ return the key itself (after trying the English pack) and `console.warn` in DEBUG mode (never show an empty string) |
| L4 | The default language is taken from the URL `?lang=` → `localStorage` → `navigator.language(s)` → `en` (`SG.i18n.detect`) |
| L5 | `<html lang>` must be updated when the language changes (this affects screen readers) |
| L6 | Variant names, technique names, and difficulty names must all be translated — including in exported files (the JSON export carries `locale` and `labels`, §14.1) |

### 11.3 Example language pack

```js
SG.locales.vi = {
  'app.title': 'Trình Sinh Đề Sudoku',
  'controls.variant.label': 'Biến thể',
  'variant.jigsaw9': 'Sudoku Ghép hình (Jigsaw)',
  'difficulty.hard': 'Khó',
  'step.fullGrid.name': 'Sinh lưới đầy đủ',
  'explain.fullGrid.what': 'Điền toàn bộ lưới bằng một lời giải hợp lệ.',
  'explain.fullGrid.why': 'Mọi bài Sudoku hay đều bắt đầu từ một lời giải hoàn chỉnh — nhờ vậy ta luôn biết chắc đáp án tồn tại.',
  'explain.fullGrid.how': 'Thuật toán quay lui (backtracking) điền số theo thứ tự ngẫu nhiên, ưu tiên ô có ít lựa chọn nhất; khi bế tắc thì lùi lại và thử giá trị khác.',
  'explain.dig.live': 'Đã thử {attempts} ô · chấp nhận {accepted} · từ chối {rejected} · còn {clues} manh mối',
  'technique.xWing': 'X-Wing',
  'technique.xWing.desc': 'Khi một giá trị chỉ xuất hiện ở đúng hai cột trên hai hàng, có thể loại giá trị đó khỏi phần còn lại của hai cột ấy.'
};
```

---

## 12. Directory Structure & Code Conventions

### 12.1 Directory tree

```
sudoku-generator/
├── index.html                 Main page (every <script> tag, in dependency order; <meta name="sg-player-url">)
├── tests.html                 In-browser test runner
├── design.md                  (this document)
├── task.md                    Task list + completion summary
├── README.md                  Run instructions & introduction (bilingual)
├── LICENSE                    MIT
├── docs/                      Screenshots used by the README · final-report.md (final QA report)
├── assets/
│   ├── favicon.svg            Inline-SVG favicon
│   └── wordlists/  isograms.en.js · isograms.vi.js
├── css/
│   ├── tokens.css             General CSS variables, 3 themes (with tokens-board.css the only place for colour literals)
│   ├── tokens-board.css       Board tokens (--sg-board-*), 3 themes
│   ├── base.css               Reset, typography
│   ├── layout.css             Page frame (history | main | options), tabs, footer, responsive
│   ├── components.css         Buttons, selects, cards, badges, modals, tooltips, result tables, history list, print dialog
│   ├── board.css              SVG grid styling + animations
│   ├── steps.css              Step description, legend & explanation cards
│   ├── help.css               Help dialog
│   └── print.css              Print styles (linked with media="print")
├── js/
│   ├── core/
│   │   ├── ns.js              Initialises the SG namespace + constants + DEBUG flag
│   │   ├── errors.js          SG.errors.GenerationError (code + i18nArgs)
│   │   ├── rng.js             mulberry32, shuffle, fork
│   │   ├── bits.js            popcount, lowestBit, iterBits, maskOf
│   │   ├── budget.js          Time/node budget + cancellation token + active clock + stepper `drive`
│   │   ├── model.js           Builds & validates PuzzleModel, peers
│   │   ├── constraints.js     Propagation (P1–P3, P6) + the extension hook for cage sums / inequalities
│   │   ├── combo-table.js     Sum-combination lookup table + the cage propagation extension (Killer)
│   │   ├── dfs-solver.js      solve / countSolutions / stillUnique / searchFrom
│   │   ├── techniques.js      Technique registry (register / list / get / appliesTo)
│   │   ├── logical-solver.js  Technique loop + step collection
│   │   ├── tech-basic.js      singles, locked candidates
│   │   ├── tech-subset.js     naked/hidden pair·triple·quad
│   │   ├── tech-fish.js       x-wing, swordfish, jellyfish, colouring
│   │   ├── tech-wing.js       xy-wing, xyz-wing, w-wing, unique rectangle
│   │   ├── tech-chain.js      forcing chain, nishio
│   │   ├── tech-cage.js       Killer-specific techniques
│   │   ├── tech-ineq.js       Greater-Than-specific techniques + the inequality propagation extension
│   │   ├── difficulty.js      COSTS / TABLE (calibrated), spec, classify, rate, clue floors
│   │   ├── full-grid.js       Full grid generation (+ restarts)
│   │   ├── symmetry.js        Symmetric cell groups
│   │   ├── digger.js          Hole-digging stages A/B, the restart loop, dig strategies, `*Steps` steppers
│   │   ├── events.js          Event factory/emitter, patches, trace buffer, VOCABULARY
│   │   ├── explain-data.js    Per-step explanation data (SG.explain; keys only)
│   │   └── pipeline.js        Orchestrates the 7 steps + emits events; run / runSteps / toWire / fromWire
│   ├── variants/
│   │   ├── registry.js        register / get / list / validate schema
│   │   ├── classic.js         classic4 · classic6 · classic9
│   │   ├── mega.js            mega12 · mega16
│   │   ├── extra-regions.js   diagonalX · hyper (+ combination)
│   │   ├── jigsaw.js          jigsaw9 (+ region generation)
│   │   ├── killer.js          killer (+ cage generation)
│   │   ├── greater-than.js    greaterThan (+ sign digging)
│   │   ├── multigrid.js       samurai · butterfly · flower · sohei
│   │   └── wordoku.js         wordoku
│   ├── worker/
│   │   ├── gen.worker.js      importScripts (core + variants + word lists) + message protocol
│   │   └── worker-client.js   Main-page side + main-thread fallback (create / ready / dispose)
│   └── ui/
│       ├── exchange.js        SG.exchange: puzzle link token + document helpers (shared byte for byte with sudoku-player)
│       ├── i18n.js            SG.i18n (+ fragments merge)
│       ├── locale.en.js · locale.vi.js   Shared strings of both languages
│       ├── locale.shell.js    Strings of the page shell (index.html)
│       ├── symbols.js         Value → symbol (digits / letters / colours / shapes / word), legend
│       ├── board-view.js      Builds & patches the SVG (geometry is pure)
│       ├── store.js           State + URL sync + localStorage
│       ├── controls.js        Builds the form from the schema + cross-option constraints
│       ├── step-view.js       Step description (score table, legend); technique chart model + `roundToTotal` (shared with the result panel)
│       ├── explain.js         Explanation cards + pseudocode (exports SG.explainCard)
│       ├── player.js          Replay of the generation from the dig log (first / previous / next / last, slider); `rateStep`
│       ├── result-view.js     Summary tab: cards, Difficulty Score table, warnings
│       ├── cache.js           Puzzle cache + background pre-generation + regeneration of a served puzzle's replay
│       ├── history.js         SG.history: the list of generated puzzles (left panel, `sg.history.v1`)
│       ├── export.js          Print dialog + text export of the puzzles chosen from the list + the Play button's hand-off to sudoku-player (`playOnline`)
│       ├── a11y.js            ARIA grid, keyboard navigation, aria-live, Settings dialog
│       ├── theme.js           Themes, run-state hints, prefers-color-scheme tracking
│       ├── help.js            Help dialog
│       └── app.js             Bootstrap & wiring of the modules (SG.app)
└── tests/
    ├── harness.js             Minimal describe/it/expect/bench
    ├── node-runner.js         Headless runner via Node (vm.runInThisContext); owns SOURCE_FILES
    ├── soak.js                Calibration & invariant soak (Node script)
    ├── perf.js                §9.1 measurement + regression hashes (Node script)
    ├── fixtures/              Sample puzzles with known answers, technique fixtures, perf helper, regression hashes
    └── suites/                *.test.js (43 suites, see §15.2)
```

### 12.2 Code conventions

| Topic | Convention |
|-------|------------|
| Namespace | Every file is wrapped in an IIFE and attached to `SG.*`. No other global variable may leak. |
| Strict mode | `'use strict';` at the top of every IIFE. |
| Syntax | ES2020 **without modules**. Use `const`/`let`, arrow functions, template literals, optional chaining. |
| Naming | `camelCase` for variables/functions, `PascalCase` for "classes"/typedefs, `UPPER_SNAKE` for constants. |
| Files | `kebab-case.js`. |
| Comments | **English** in `js/` (for tooling compatibility); JSDoc for every public API. Comment only the parts that are hard to understand. |
| `<script>` order | ns → core → variants → word lists → worker-client → ui → app. **`SOURCE_FILES` in `tests/node-runner.js` is the single source of truth**; the same order is repeated in `index.html` (`<script>` tags), `tests.html` (`SOURCE_FILES`) and — for the core, the variants and the word lists only, never the UI or the client — `js/worker/gen.worker.js` (`SCRIPTS`). `ui-contract.test.js` fails when they drift apart. Adding a JavaScript file means adding it to all four. |
| Error handling | Core errors throw `SG.errors.GenerationError` with a `code`, so that i18n can translate them (`error.<code>`). |
| No DOM dependency | `js/core/` and `js/variants/` are **forbidden** from touching the DOM; DOM, `window` and `localStorage` live only in `js/ui/` and `js/worker/worker-client.js`. `purity.test.js` checks this automatically by grepping. Every UI file must also **load in Node without a DOM** (top-level code only defines functions and pushes locale fragments), and exposes its logic as pure helpers so that UI tests need no browser. |
| No colour literals | No colour literal (`#fff`, `rgb(`, `hsl(`, a colour name other than `transparent`/`currentColor`/`none`/`inherit`) outside `css/tokens.css` and `css/tokens-board.css`; everything else uses `var(--sg-…)` tokens. A test checks it. |
| Formatting | 2-space indentation, single quotes, semicolons, lines ≤ 110 characters. |

---

## 13. Internal API Contracts

> This section is the **contract between the agents working in parallel**. Changing any signature here must be recorded as a breaking change, and every caller must be updated.

### 13.1 `SG.rng`

```js
SG.rng.create(seed?: number) → Rng          // no seed: SG.rng.randomSeed(); the seed is normalised to a uint32
Rng = { seed, next():number, int(n):number, pick(arr):*, shuffle(arr):Array, fork(tag:string):Rng }
```

### 13.2 `SG.bits`

```js
SG.bits.popcount(mask: number): number
SG.bits.lowestBitIndex(mask: number): number     // 0-based, -1 if mask == 0
SG.bits.forEach(mask: number, fn: (value:number) => void)   // value is 1-based
SG.bits.toArray(mask: number): number[]
SG.bits.full(digits: number): number             // (1<<digits) - 1
SG.bits.maskOf(values: number[]): number
```

### 13.3 `SG.model`

```js
SG.model.create(spec: ModelSpec): PuzzleModel
SG.model.validate(model, options?): { ok: boolean, errors: string[], warnings: string[] }
SG.model.initState(model): SolveState
SG.model.cloneState(state, into?): SolveState
SG.model.cellLabel(model, cellIndex): string     // 'R4C7' or 'G2-R4C7' for multi-grid
SG.model.isSolution(model, values): boolean
```

### 13.4 `SG.constraints`

```js
SG.constraints.propagate(model, state, budget): boolean    // false = contradiction
SG.constraints.assign(model, state, cell, value): boolean  // peer elimination only
SG.constraints.eliminate(model, state, cell, value): boolean
SG.constraints.place(model, state, cell, value, budget): boolean   // assign + propagate
SG.constraints.registerExtension({ id, prepare?(model), propagate(model, state, data, ctx) }) // cages, inequalities…
```

### 13.5 `SG.dfs`

```js
SG.dfs.solve(model, givens: Int32Array, rng?, budget?): Int32Array | null
SG.dfs.countSolutions(model, givens, limit = 2, budget?): number
SG.dfs.stillUnique(model, givens, cell, trueValue, budget?): boolean
SG.dfs.searchFrom(model, state, { rng, budget, limit, maxBacktracks }): { found, solution, backtracks, aborted }
                                                  // randomised completion of a propagated state; what the full-grid generator restarts (not part of the original contract)
```

### 13.6 `SG.logicalSolver` and `SG.techniques`

```js
SG.logicalSolver.solve(model, givens, options): SolveReport
options = { allowedTechniques: string[]|null, collectSteps: boolean, budget, stopOnStuck: boolean,
            assumeUniqueness: boolean }          // false: skip techniques with assumesUniqueness (uniqueRectangle)
SolveReport = {
  solved: boolean, status: 'solved'|'stuck'|'contradiction', state: SolveState,
  steps: Array<{ technique, i18nKey, i18nArgs, cells:number[], eliminations:Array<[cell,value]>, placements:Array<[cell,value]> }>,
  techniqueCounts: Object<string, number>, hardestTechnique: string, score: number /* uncalibrated, see §6.6 */,
  solution?: Int32Array                          // a DFS solution when stopOnStuck is false and the loop got stuck
}
SG.techniques.register({ id, group, baseCost, order, i18nKey, variantScope, assumesUniqueness, find(model, state, ctx) → Finding|null })
SG.techniques.list() / get(id) / has(id) / appliesTo(tech, variantId) / GROUPS
Finding = { technique, cells, placements:[[cell,value]], eliminations:[[cell,value]], i18nKey, i18nArgs }
```

### 13.7 `SG.difficulty`

```js
SG.difficulty.LEVELS: string[]                                  // ['veryEasy',...,'evil']
SG.difficulty.BASE_GROUPS: string[]                             // ['basic','locked','subset','fish','wing','chain']
SG.difficulty.COSTS, TABLE, SCORING                             // the calibration, §6.6 / §6.7
SG.difficulty.spec(level, model): DifficultySpec
DifficultySpec = { level, min, max, minClues, maxClues, minCluesPerUnit, allowedTechniques:string[],
                   allowedGroups:string[], symmetryDefault, extraPasses /* unused */, oracle: 'techniques'|'unique', scale }
SG.difficulty.classify(report, model): Rating
Rating = { level, score, rawScore, hardestTechnique, hardestGroup, confidence, solved, empties, techniqueCounts }
SG.difficulty.rate(model, givens, options?): Rating            // solve with every technique, then classify
SG.difficulty.isSupported(level, model): boolean                // pre-check before generating
SG.difficulty.costOf(techniqueId): number
```

### 13.8 `SG.variants`

```js
SG.variants.register(def: VariantDef): void       // validates the definition; throws variant.invalidDef
SG.variants.get(id): VariantDef                   // throws variant.unknown
SG.variants.has(id): boolean
SG.variants.list(): VariantDef[]
SG.variants.optionsOf(idOrDef): NormalizedOption[]
SG.variants.defaultOptions(idOrDef): { [optionId]: default }
SG.variants.sanitizeOptions(idOrDef, raw): { [optionId]: value }   // clamp, snap to step, coerce, drop unknown keys; never throws
VariantDef = { id, i18nKey, group, digits, difficultySupport, defaultSymbolMode,
               symbolModes, options: OptionSchema[], build(opts, rng): PuzzleModel,
               postGenerate?(ctx): PuzzleModel|void   /* + optional twin postGenerate.steps(ctx) generator */,
               digStrategy?: string, fastSeed?(model, state, rng): boolean,
               restartThreshold?: number, clueFloor?: table|function, clueFloorScale?: { level: factor } }
NormalizedOption = { id, type: 'slider'|'select'|'boolean'|'text', labelKey, hintKey, default, min, max, step,
                     minLabelKey, maxLabelKey, defaultLabelKey, choices:[{value,labelKey}], advanced,
                     visibleWhen, maxLength, placeholderKey }
```

The option schemas that the variants declare differ in small ways (`i18nKey` or `labelKey`, `hintKey` or `hintI18nKey`, `choices[].i18nKey` or `.labelKey`); the registry **normalises** them into the one shape above, and the UI (`controls.js`, `store.js`, the cache key) only ever reads `optionsOf` / `defaultOptions` / `sanitizeOptions`, never `def.options`.

### 13.9 `SG.pipeline`

```js
SG.pipeline.run(config: GenerateConfig, emit: (e: GenerationEvent) => void | Emitter | null, budget?): PuzzleResult
SG.pipeline.runSteps(config, emit, budget?, { now, cooperative = true, metricIntervalMs }): Generator<undefined, PuzzleResult>
SG.pipeline.normalizeConfig(config): GenerateConfig        // defaults filled in, seed fixed, everything validated
SG.pipeline.toWire(result): Object                         // PuzzleResult as plain data that survives postMessage
SG.pipeline.fromWire(wire): PuzzleResult                   // rebuilds the model, switches the lazy extensions on
SG.pipeline.STEPS, DEFAULT_MAX_ATTEMPTS (8), FULL_TRACE_MAX_CELLS (300)
GenerateConfig = { variantId, difficulty = 'medium', seed?, symbolMode, symmetry = 'rotational180', digOrder = 'random',
                   maxAttempts = 8, trace: 'off'|'summary'|'full' (default 'summary'; the page sends none), variantOptions: Object }
PuzzleResult  = { model, givens, solution, rating, seed, config, timings, attempts, warnings, digLog }
```

`run` is `runSteps` driven to its end without ever yielding (`SG.budget.drive`): same events, same puzzle. The `config` of the result is the normalised one (its `trace` is the one that was applied). `digLog` is how the puzzle was dug: the dig log of `SG.digger.generate` for the sample that became the puzzle — plain data whose entries are listed in [§7.3](#73-replay-engine-in-the-ui-layer) and in the header of `js/core/digger.js` (Greater-Than: `digSignsSteps` in `js/variants/greater-than.js`). It does not depend on `config.trace`; `toWire` / `fromWire` carry it (`fromWire` gives `undefined` when the wire has none), `SG.cache` strips it when it stores a puzzle, and the UI builds its replay from it. Errors are `SG.errors.GenerationError`s with codes such as `variant.unknown`, `difficulty.unsupportedLevel`, `rng.invalidSeed`, `symmetry.unknownKind`, `digger.invalidOption`, `pipeline.invalidOption`, `budget.exceeded`, `budget.cancelled`; each has an `error.<code>` text. A level that cannot be reached is **not** an error: the closest puzzle is returned with the warning `difficulty.approximate`.

### 13.10 `SG.workerClient`

```js
SG.workerClient.generate(config, onEvent, hints?): Promise<PuzzleResult>   // hints: { random } lets the cache serve a pre-generated puzzle
SG.workerClient.cancel(): boolean
SG.workerClient.mode: 'worker' | 'main'
SG.workerClient.ready(): Promise<'worker'|'main'>
SG.workerClient.create(options?): client            // independent instance, same interface + dispose()
```

Details — sessions, batching, the cooperative cancel protocol with the 150 ms terminate fallback, and the main-thread slices with their granularity limit — are in [§9.3](#93-web-worker--fallback-mechanism); the message protocol is the header of `js/worker/gen.worker.js`.

### 13.11 `SG.i18n`

```js
SG.i18n.setLocale(code): string           // returns the current language after the call
SG.i18n.t(key, args?): string
SG.i18n.current: string                   // 'en' | 'vi'
SG.i18n.applyTo(rootEl): number           // how many elements were updated
SG.i18n.onChange(fn): () => void          // returns an unsubscribe function
// Implemented in addition (see §11.1):
SG.i18n.tError(errOrCode, args?), eventText(event, options?), setCellLabeler(fn), cellLabel(cell, labeler?),
SG.i18n.detect(sources), normalize(code), has(key), keys(locale), formatNumber(n, options?), formatDuration(ms),
SG.i18n.mergeFragments(), conflicts, available
```

### 13.12 `SG.boardView`

```js
SG.boardView.create(svgEl, model, opts): BoardView
BoardView = { applyPatch(patch, { animate?, highlightClass? }), setValues(values, labels?), setGivens(givens), showSolution(solution),
              highlight(cells, cls?), unhighlight(cells), clearHighlights(),
              setSignMarks({ hidden, removed, kept } | null) /* Greater-Than signs by index; survives a rebuild */, setSymbolMode(mode),
              setLayerVisible(name, flag), isLayerVisible(name), setColorAuxSymbol(flag), setAnimate(flag),
              setInteractive(flag), setOnCellClick(fn), setShowCoords(flag), setModel(model) /* rebuilds, keeps values */,
              refreshText(), pulseDone(), getCellElement(i), getGeometry(), getState(), toSvgString(), toPngBlob(scale?), destroy() }
// Pure helpers (run in Node, no DOM): SG.boardView.geometry(model, opts), renderMarkup(model, state, opts), exportSvg(...), cellView(...)
```

### 13.13 `SG.digger`, `SG.budget` and `SG.events` (the stepper API)

```js
SG.digger.generate(model, level, rng, options): GeneratedPuzzle     // the restart loop: grids × dig samples
SG.digger.generateSteps(...)  digLevelSteps(...)  digStageSteps(...)  digSteps(...)   // generator twins that yield at the
                                                                     // natural boundaries when options.cooperative is set
SG.digger.dig / digStage / digLevel                                   // stage A / A+B / one attempt (dig → rate → tune)
SG.digger.registerStrategy(id, fn)  getStrategy(id)  unregisterStrategy(id)   // 'cells' (default), 'killer', 'signs'
SG.digger.createStageSteps(emitter, options)                          // the stage runner the pipeline hands to generate
SG.digger.ORDERS                                                      // ['random','rowByRow','snake','spiral','jumpOne']
SG.budget.create({ ms, nodes, onCancel, shouldCancel, now })          // check() · tick() · cancel() · elapsedMs()
SG.budget.createClock(rawNow)                                         // active clock: pause()/resume() around each slice
SG.budget.drive(steps) / isSteps(x)                                   // run a stepper to its end
SG.events.createEmitter(verbosity, sink, options) / toEmitter(x)      // + the patch, view and trace helpers of §7.2
```

### 13.14 `SG.app` — the extension API of the UI

`js/ui/app.js` owns the page and is the only file that new UI modules talk to; the full list is the header of the file. In short: `getStore() getBoard() getPlayer() getStepView() getResult()` (→ `{ result, trace }` or null), `generate(overrides?) regenerate() cancel() showResult(result, { trace })`, `setClient(client)` and `attachTrace(trace, digLog?)` (what the cache uses), `toast(kind, key, args)`, `announce(text)`, `openModal({ titleKey, body, footer, wide, onClose })`, and an event bus `on(name, fn) → off` / `emit(name, payload)` with the events `generate:start generate:progress generate:end generate:error generate:cancel result trace position locale theme settings action`. `position` carries `{ position, length, step, direction }` after every move of the replay (`step` is a step of `SG.player.buildSteps`, null at position 0; `direction` is `'forward'`, `'backward'` or `'seek'`); `trace` carries `{ result, trace }` once `attachTrace` gave a puzzle served from the cache its replay. The buttons emit `action { id: 'export' | 'exportCode' | 'play' | 'settings' | 'help' }` (Print, Export and Play at the top right of the main panel, Settings and Help in the header). At the end of start-up `app.js` calls `init(SG.app)` — idempotent, in its own `try/catch` — on each of `SG.exportUi`, `SG.a11y`, `SG.theme`, `SG.help`, `SG.cache`, `SG.history` that exists, in this order; so a new module plugs in **without editing `app.js`**. `SG.cache.init` replaces the generation client through `SG.app.setClient` with a wrapper of the same interface.

### 13.15 `SG.exchange` and the Play-online API of `SG.exportUi`

`js/ui/exchange.js` (no DOM; loaded before `js/ui/i18n.js`; the one file shared byte for byte with sudoku-player). The format, the token and the errors are described in [§10.9](#109-hand-off-to-the-player-exchange).

```
SG.exchange.FORMAT / PARAM / ACTIVE_PARAM / MAX_JSON_BYTES / MAX_TOKEN_CHARS
                                                                   // 'sudoku-generator/v1', 'puzzle', 'active', 8 MiB, 4 Mi characters
SG.exchange.encode(doc, { compress? }) -> Promise<string>          // token: 'z.' + deflate-raw, or 'j.' plain
SG.exchange.decode(token) -> Promise<Object>                       // the document (not validated)
SG.exchange.encodeText(text, { compress? }) -> Promise<string>     // text token of a bundle: 't.' + deflate-raw, or 's.' plain
SG.exchange.decodeText(token) -> Promise<string>                   // the text
SG.exchange.isTextToken(token)                                     // 't.' / 's.' (a bundle) as against 'z.' / 'j.' (one document)
SG.exchange.plain(value)                                           // typed arrays -> arrays, undefined/functions dropped
SG.exchange.playerUrl(base, token, { active? }) / isAllowedBase(base)
                                                                   // '<base>#puzzle=<token>[&active=<n>]'; http(s) or relative only
SG.exchange.tokenFromHash(hash) / activeFromHash(hash) / isDocument(data) / canCompress()
SG.exportUi.toJson(result, ctx?)                                   // the §14.1 document, now with `model`
SG.exportUi.buildPlayLink(result, { base?, generatedAt?, locale?, compress? })
                                                                   // -> Promise<{ url, token, base, length, long }>
SG.exportUi.buildPlayBundle(results, { base?, active?, compress? })
                                                                   // -> Promise<{ url, token, base, count, active, length, long }>
SG.exportUi.playerBase(content?) / pagePlayerBase()                // <meta name="sg-player-url"> or the default
SG.exportUi.openPlayLink(url)                                      // window.open(url, '_blank', 'noopener')
SG.exportUi.playOnline() -> Promise                                // every puzzle of the saved list, the one on screen active, opened in a new tab, toasts (the Play button)
SG.exportUi.PLAYER_URL_DEFAULT / LONG_LINK_CHARS                   // 'https://tdat00.github.io/sudoku-player/', 100000
```

---

## 14. Data Formats

### 14.1 JSON schema of a puzzle

```json
{
  "format": "sudoku-generator/v1",
  "generatedAt": "2026-10-15T11:00:00.000Z",
  "variantId": "jigsaw9",
  "variantOptions": { "compactness": 0.6 },
  "difficulty": { "requested": "hard", "achieved": "hard", "score": 612,
                  "hardestTechnique": "xWing",
                  "techniqueCounts": { "nakedSingle": 21, "hiddenSingleBox": 14, "nakedPair": 3, "xWing": 1 },
                  "rawScore": 612, "hardestGroup": "fish", "confidence": 0.7, "solved": true, "empties": 54 },
  "seed": 1734567890,
  "symmetry": "rotational180",
  "symbolMode": "digits",
  "digits": 9,
  "cellCount": 81,
  "layout": { "rows": 9, "cols": 9,
              "cellRegion": [0,0,0,1,1,1,2,2,2, "..."],
              "subGrids": [{ "gridIndex": 0, "originRow": 0, "originCol": 0 }] },
  "givens":   [0,0,3,0,0,0,0,8,0, "... 81 values, 0 = empty cell"],
  "solution": [5,1,3,7,2,9,4,8,6, "... 81 values"],
  "cages": [],
  "inequalities": [],
  "stats": { "clues": 27, "elapsedMs": 412, "attempts": 1,
             "timings": { "configure": 0.1, "buildModel": 9.3, "fullGrid": 3.2, "extraStructure": 0.1,
                          "dig": 380, "rate": 11, "tune": 0.2 } },
  "symbols": { "mode": "digits", "labels": ["1","2","3","4","5","6","7","8","9"] },
  "digOrder": "random",
  "maxAttempts": 8,
  "warnings": [],
  "locale": "en",
  "labels": { "variant": "Jigsaw Sudoku", "requested": "Hard", "achieved": "Hard", "hardestTechnique": "X-Wing" },
  "model": { "variantId": "jigsaw9", "digits": 9, "cellCount": 81, "units": [[0,1,2,3,4,5,6,7,8], "..."],
             "unitMeta": [{ "kind": "row", "gridIndex": 0, "label": "R1" }, "..."], "cages": [], "inequalities": [],
             "layout": { "rows": 9, "cols": 9, "cellRow": ["..."], "cellCol": ["..."], "cellRegion": ["..."],
                         "overlays": [], "subGrids": [{ "gridIndex": 0, "originRow": 0, "originCol": 0 }] },
             "symbols": { "mode": "digits", "labels": ["1","2","3","4","5","6","7","8","9"] },
             "fixedCells": [0,0,0, "... one value per cell"] }
}
```

Everything from `symbols` down is **additive**: the first plan's fields are unchanged. The export (`SG.exportUi.toJson`, the document of the player link) writes the following beyond the plan: `rawScore`, `hardestGroup`, `confidence`, `solved` and `empties` inside `difficulty`; `stats.timings` (milliseconds per step); `symbols` (the symbol mode and the label of every value, so Mega 16×16 and Wordoku are described exactly); `digOrder`, `maxAttempts` and `warnings` (the configuration and the warnings of the run); `locale` and `labels` (rule L6: the names of the variant, the level and the hardest technique **in the language of the export**); `model` (the plain-data model spec for sudoku-player, see [§10.9](#109-hand-off-to-the-player-exchange)); and, only where applicable, `layout.cellRow` / `layout.cellCol` (the canvas position of every cell, written for boards that are not a full row-major rectangle — the multi-grid boards, whose canvas has holes) and `wordoku` (`{ word, placement, line }`, Wordoku only). `cages` carry `{ cells, sum, distinct }`; `inequalities` carry `{ a, b }` (`value[a] < value[b]`).

**No import:** the generator no longer reads puzzle files, pasted text or dropped files (the former `SG.importUi` was removed together with the JSON, text, PNG and SVG exports). The document only travels to the player through the link of [§10.9](#109-hand-off-to-the-player-exchange).

**Compatibility rule:** the player checks `format` (`sudoku-generator/vN`) and rejects another version. New fields may only be added in a backward-compatible way.

### 14.2 URL parameters

| Parameter | Example | Meaning |
|-----------|---------|---------|
| `v` | `v=jigsaw9` | Variant ID |
| `d` | `d=hard` | Difficulty |
| `seed` | `seed=1734567890` | Seed (missing ⇒ random). A link (or a reload) with a seed generates that puzzle as soon as the page loads |
| `sym` | `sym=rotational180` | Symmetry type |
| `mode` | `mode=letters` | Symbol set |
| `order` | `order=snake` | Dig sequence: `random` (default), `rowByRow`, `snake`, `spiral`, `jumpOne` |
| `attempts` | `attempts=12` | Maximum full grids to try, 1–20 (default 8) |
| `sol` | `sol=1` | Show the solution next to the puzzle |
| `o.<id>` | `o.cageSize=2` | A variant option, e.g. `o.compactness=0.8`, `o.futoshiki=1`, `o.placement=row` (sanitised against the variant by `SG.variants.sanitizeOptions`) |
| `lang` | `lang=vi` | Language |
| `auto` | `auto=1` | Generate automatically as soon as the page loads (a link with a `seed` does so anyway) |

`?v=classic9&d=expert&seed=42&lang=vi&auto=1` must always reproduce the **exact** same puzzle.

- Only values that differ from the defaults are written to the address bar. The page has no share-link button any more (the Result panel lost it); `SG.store.shareUrl` / `toSearchString(state, { full: true })` still build a link that always carries `v d sym mode` as well, and the address bar of the page itself is such a link once a seed is in it. Any other parameter is ignored and left out of the canonical URL — the `trace` and `speed` of older links included (the "Replay detail" option and the replay speed are gone, §10.4). The page never starts a generation because the URL changed; it generates **on load** when the URL has a `seed` (a shared link, or a reload after "Generate random", which writes its new seed to the URL) or `auto=1`.
- **Seed hashing.** The state keeps the seed as the text the user typed. A decimal integer in 0…4294967295 is used as it is; anything else (letters, a negative number, a number beyond uint32) is hashed to a uint32 with FNV-1a 32 bit over the UTF-16 code units of the NFC-normalised, trimmed text — the same hash `SG.rng` uses to derive child streams. A blank seed means "random" and the `seed` of the configuration is left out.
- **Priority at start-up:** URL > stored values > defaults; when the URL carries any puzzle parameter (`v d seed sym mode order attempts sol o.*`), the URL is the whole puzzle configuration and the stored configuration is ignored — a shared link must not be bent by the receiver's last settings.

### 14.3 `localStorage` keys

| Key | Contents |
|-----|----------|
| `sg.prefs.v1` | Language, theme, font size, reduced motion, colour-blind aux symbol (a `speed` stored by an older version is ignored) |
| `sg.lastConfig.v1` | The most recent generation configuration (a `trace` stored by an older version is ignored) |
| `sg.cache.v1` | `{ version: 1, entries: [{ key, cfg, at, pool, data }] }`: up to 20 generated puzzles (LRU, `pool: true` marks a pre-generated one; at most 2 per configuration, 4 in all), with version checking. `data` is `SG.cache.serialize(result)`: the `toWire` form with typed arrays encoded as `{ $t, d }` plus a checksum of `givens` + `solution`. **No trace and no dig log are stored.** |
| `sg.history.v1` | `{ version: 1, entries: [...] }`: the list of generated puzzles shown in the left panel (newest first, at most 100). An entry is `{ id, at, variantId, requested, level, seed, clues, cells, score, symbolMode?, symmetry, digOrder, maxAttempts, variantOptions }` — what the list shows and what rebuilds the puzzle (same seed, same puzzle); no grid is stored |
Every read/write is wrapped in `try/catch` (Safari's private mode can throw): blocked or missing storage means the values live in memory for the session (an in-memory LRU for the cache), a `QuotaExceededError` evicts the least recently used entries and retries, and a corrupt item or another schema version is purged. Nothing throws into the application.

---

## 15. Testing Strategy

### 15.1 Infrastructure

Two ways to run **the same test suites**:

1. **`tests.html`** — open it in a browser (it works from `file://`); it shows green/red results, has a suite filter and a text filter. Query parameters: `?suite=killer&filter=text&bail=1&autorun=0`.
2. **`node tests/node-runner.js`** — runs headless, with exit code ≠ 0 on failure. **This is how the AI agents verify their work.** Supports `--suite=a,b`, `--filter=text`, `--bail` and `--verbose`. It loads `SOURCE_FILES` (a missing file is skipped), then `tests/fixtures/*.js`, then discovers `tests/suites/*.test.js` by itself; there is no registration step for a new suite (`tests.html` keeps a hand-written `SUITE_FILES` list for browser runs).

`tests/harness.js` provides: `describe` / `it` (and `.skip`), `expect(v).toBe/toEqual/toBeTruthy/toBeFalsy/toBeNull/toBeUndefined/toBeDefined/toBeGreaterThan[OrEqual]/toBeLessThan[OrEqual]/toBeCloseTo/toBeInstanceOf/toMatch/toContain/toHaveLength/toThrow`, `beforeEach` / `afterEach`, `bench(name, fn)` for performance measurement, and `SG.test.skip(reason)` for environment limits. Tests may be async. Suites that need the file system read `SG.test.node` (`{ fs, path, vm, root }`, Node only). `SG_DEEP=1` (Node) or `SG.test.deep = true` (browser) switches the mega, multigrid and variants suites to their full statistical volumes.

### 15.2 Test suites

All 43 files of `tests/suites/` (the current test count is in `README.md`; the one of the combined project is in `docs/final-report.md`). Fixtures live in `tests/fixtures/`: `classic.js` (puzzles with known answers), `techniques.js` + `techniques-helper.js` (positive / negative / soundness fixtures), `rated.js` (puzzles labelled with their level), `perf-helper.js` and `regression.js` (see below).

| Suite | What it checks |
|-------|----------------|
| `bits.test.js` | The foundation primitives: namespace, `errors`, `popcount` / `lowestBitIndex` / `forEach` over every mask for `digits ≤ 16`, `budget` |
| `rng.test.js` | Determinism per seed; `fork` independence; unbiased `shuffle` (χ² test) |
| `purity.test.js` | `js/core/` + `js/variants/` contain no `document`/`window`/`localStorage`; there is no `import`/`export` anywhere in `js/`; it also self-tests the harness |
| `model.test.js` | Correct construction; V1–V8; symmetric `peers`; no coordinate collisions; the variant registry and the classic variants |
| `constraints.test.js` | P1–P3, P6; contradiction detection; soundness against known solutions; the extension hook |
| `solver.test.js` | Solves the sample puzzles correctly; `countSolutions` stops correctly at 2; `stillUnique` **gives results identical to** `countSolutions == 1` on 200 random cases; its speed against the naive check |
| `full-grid.test.js` | Generated grids are valid; same seed ⇒ same grid; uniformity; fixed cells; restarts; `fastSeed` |
| `digger.test.js` | Symmetry groups and stage A: the result always has a unique solution, `givens ⊆ solution`, respects symmetry, `minClues` and `minCluesPerUnit` |
| `logical-solver.test.js` | The technique registry, the solve loop, `variantScope`, `collectSteps` |
| `tech-basic.test.js`, `tech-subset.test.js`, `tech-fish.test.js`, `tech-wing.test.js`, `tech-chain.test.js` | One suite per technique group: published positive fixtures, negative fixtures, and **soundness** (never eliminates a value of the true solution) |
| `techniques.test.js` | Properties that must hold for **every** registered technique, by looping over `SG.techniques.list()` — a technique added later is tested without editing it |
| `difficulty.test.js` | Scoring, bands, clue floors, classification against labelled puzzles (within 1 level), monotonicity, the difficulty-bounded digger, invariants I1–I6 |
| `events.test.js` | The event emitter, verbosity filtering, patches (`invertPatch` round trip), the per-step explanation data, `capTrace` |
| `pipeline.test.js` | The seven steps in order with `start`/`end` pairs; events against `VOCABULARY`; patches reconstruct the final grid; cost of instrumentation (`off` < 2 %, `full` < 35 %); the `PuzzleResult` fields and its dig log (applied to the solution, it ends exactly on the puzzle; it is the same for every verbosity and crosses the wire); determinism; hooks; retries; cancellation |
| `mega.test.js`, `extra-regions.test.js`, `jigsaw.test.js`, `killer.test.js`, `greater-than.test.js`, `multigrid.test.js`, `wordoku.test.js` | One suite per variant file: geometry (unit and cell counts), the variant's own algorithm (layouts, cages, signs, word lists, shared cells), common criteria CV1–CV9, events, i18n |
| `variants.test.js` | **One sweep over `SG.variants.list()`**: CV0 definition and spec, CV1 models validate, CV2 full grids, CV3 puzzles at every declared level (other levels refused), CV4 invariants I1–I7 (I6 with the variant's own floor), CV5 determinism, CV6 no hang, CV7 names / options / levels in both languages. A variant added later is covered without editing it |
| `worker.test.js` | `SG.pipeline.runSteps` ≡ `run` (same events, same puzzle); the worker protocol; the client in both modes; cancellation; sessions; `toWire` / `fromWire`; the script lists agree |
| `perf.test.js` | A few cells of §9.1 with few runs each — **warn only** (a slow cell is reported as a skipped test) — and the **regression hashes**: for 20 fixed seeds and the combinations of `SG.fixtures.perfTools.COMBOS`, the puzzle the pipeline gives must hash to the value recorded in `tests/fixtures/regression.js` (this one fails the build) |
| `i18n.test.js` | Both language packs and every fragment have the same keys, the same `{placeholders}`, no empty value and no conflict; every `data-i18n` in the HTML exists; every `VOCABULARY` key, technique and error code is translated; the API (plural rules, `eventText`, `detect`) |
| `ui-contract.test.js` | The function surface of each UI module; every UI file loads without a DOM; no colour literal outside the two token files; the four script lists agree; the mount points of `index.html` |
| `store.test.js`, `controls.test.js` | State, URL parse / serialise, storage failure modes; the form model built from the variant options |
| `steps.test.js`, `player.test.js`, `result-view.test.js` | The step description (with a small fake DOM: heading, numbers, titles, the current step, the score table with its help icons and total, the legend, the language) and the chart model; the explanation card; the replay steps built from real results (they start from the solution and end on the puzzle, frames, counters that add up, batch sizes, Killer cages, Greater-Than signs, results without a dig log, `rateStep`), the board at a position, the step texts in both languages, the manual navigation and its controls; and the result panel (cards, the Difficulty Score table adding up to the score) |
| `history.test.js` | The entry of a result and its key, the persisted list (newest first, limit, failure modes), the panel (items, open, remove, clear) |
| `cache.test.js` | Configuration keys, serialisation, the LRU store and its failure modes, the controller (served from cache, trace regeneration, pre-generation scheduling) |
| `export.test.js`, `format.test.js`, `exchange.test.js` | Print layout and the picker of puzzles, `buildExportText` (header line, grid rows, multi-grid holes, several puzzles), JSON (with its `model` block), the Play link (player address, token, length warning, `noopener`, the `play` action), the bundle of the Play button (text token, `active`, the whole list, puzzles generated again), the print SVG and its paper look, the `export.*` strings; `SG.model.create(doc.model)` rebuilds the model of every variant (also through a link token); `exchange.test.js` is the suite shared with sudoku-player (token round trip, text tokens and `active`, limits, player URL, `plain`) |
| `a11y.test.js`, `theme.test.js`, `help.test.js` | Cell labels and keyboard navigation; every theme defines the same tokens and contrast; the help registry (every variant has an entry, shortcuts) and the **README is checked mechanically** (variants table, URL parameters, script paths, links, `node tests/…` commands and flags, `SG.x.y` names, its two worked examples) |

Two further Node scripts are not part of the normal run:
- **`tests/soak.js`** — see §15.4.
- **`tests/perf.js`** — measures every cell of §9.1 (p50 / p95 / max against the p95 target) and maintains the regression-hash fixture: `--update-hashes` records the hashes of the current code on purpose (after a change meant to alter puzzles: a calibration, a new dig rule), `--check-hashes` compares, `--alloc` probes the hot loops for allocation (rule R2), `--gate` fails when fewer than 90 % of the cells meet their target.

### 15.3 Invariants that must always hold

These are assertions that **must never be false**, checked in every generation test:

| # | Invariant |
|---|-----------|
| I1 | `countSolutions(model, givens, 2) === 1` — every generated puzzle has exactly 1 solution |
| I2 | `givens` is a subset of `solution` (it never contradicts the solution) |
| I3 | `solution` satisfies every unit, cage, and inequality |
| I4 | The same `(variantId, difficulty, seed, options)` ⇒ identical `givens` |
| I5 | If `rating.level === requested` then `score` lies within `spec[min,max)` **and** `hardestTechnique ∈ allowedGroups` (holds by construction, thanks to the technique floor) |
| I6 | Clue count ≥ `SG.difficulty.spec(level, model).minClues` — **the variant's own floor** (§6.7), not the classic9 number |
| I7 | Every logical technique eliminates only values that do **not** belong to the true solution (soundness) |

### 15.4 Fuzz / soak testing

`tests/soak.js` — generates puzzles for every (variant × level) combination, checks I1–I7 on each one, and prints a confusion matrix per variant (requested level in the rows, achieved level in the columns), the time per puzzle against the §9.1 budget, the share of puzzles whose raw score is inside the band without the technique floor, and a score histogram. Presets: `--quick` (≈ 160 puzzles, the P2 checkpoint), `--count=N` (default 500), `--per-combo=N` and `--full` (25 per combination, 100 per classic9 level, ≈ 2 000 puzzles, the final QA preset); `--variant`, `--level`, `--seed`, and `--costs` / `--bands` to try a calibration change without editing the file. Exit code 0 requires no invariant violation, ≥ 90 % exact hits on every classic9 level and ≥ 80 % on every other combination (`--no-gate` always exits 0). It is not part of the normal test run (too slow); it was the tool of the calibrations of tasks `T-2.10` and `T-7.7`. The last `--full` run: 2 125 puzzles, no invariant violation, 100 % exact hits everywhere except classic9 medium (99 %).

### 15.5 Mandatory manual testing (checklist)

The first plan's checklist: 3 browsers × (desktop + mobile) × (light + dark) × (VI + EN) × (opened via a server + opened via `file://`) · a trial print to PDF · a keyboard-only walkthrough · a screen reader · animations turned off.

**What was actually done:** the page was loaded and screenshotted in headless **Edge** (the only browser installed on the development machine; `docs/` holds three of those screenshots), and the DOM-free parts of every UI module are covered by the Node suites above. **Not done:** Firefox, Safari, a real mobile device, a real screen reader (NVDA / VoiceOver) and a print to a physical printer. The remaining items are recorded in `docs/final-report.md` and as known limitations in `README.md` and §18.

---

## 16. Risks & Mitigations

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Generating `samurai`/`mega16` is too slow and the browser hangs | High | Worker + budget + Cancel button + the empty board while it runs + automatic `trace` downgrade (no percentage bar: the length of a run is unknown). Outcome: p95 is well inside the budgets (§8.4, §9.1) |
| R2 | Hitting the exact difficulty is harder than expected | High | Technique-bounded oracle (§6.8 ④) + a calibration soak test + always keep an "approximate" fallback with a warning |
| R3 | A logical technique is implemented incorrectly ⇒ wrongly eliminates a candidate ⇒ the puzzle has **no solution** | Very high | Invariant I7 checks soundness on every fixture; `digger` always re-verifies with `dfs` before returning the final result |
| R4 | Opening via `file://` does not work | Medium | No ES modules / `fetch`; cooperative main-thread fallback (§9.3); the README explains how to run a server |
| R5 | A generated Jigsaw layout has no solution | Medium | Validation in the build step + reseeding |
| R6 | Killer cages admit multiple solutions | Medium | The 3-step repair strategy (§8.2 step 5), bounded by search nodes |
| R7 | The two language packs drift apart in their keys | Medium | `i18n.test.js` blocks it immediately |
| R8 | The trace log overflows memory | Medium | `maxTraceEvents` + down-sampling + clearing the old trace; the replay reads the small dig log, not the trace |
| R9 | Animations make the app feel slow | Low | ADR-002: the generator runs at full speed, the finished puzzle is shown at once and the replay is stepped by hand (no playback, no speeds) |
| R10 | Scope creep into building a player | Low | Resolved by the split: the player is its own repository (sudoku-player); this one only hands a puzzle over (task `T-7.8`, §10.9) |
| R11 | The score formula does not match players' perception | Medium | `T-2.10` / `T-7.7` calibrate it with labelled sample puzzles and soak runs; the costs are plain data in `SG.difficulty.COSTS` |
| R12 | Several agents editing the same file ⇒ conflicts | Medium | Every task in `task.md` states the **files it owns**; the API contract in §13 is invariant |

---

## 17. Implementation Roadmap

The roadmap below is the first plan; **all eight phases are done** (statuses per task: `task.md` Appendix A; completion summary: Appendix E). The one task that left this repository is `T-7.5`, the trial-play mode, which is now the sudoku-player project; `T-7.8` (the hand-off to it) was added in its place.

| Phase | Name | Goal | Deliverable | Status |
|-------|------|------|-------------|--------|
| **P0** | Foundations | Namespace, RNG, bits, budget, test harness | `node tests/node-runner.js` runs green | ✅ |
| **P1** | Classic core | Model, propagation, DFS, full grid generation, basic hole digging | Can generate `classic9` with a unique solution via Node | ✅ |
| **P2** | Logical solver | Technique ladder, scoring, difficulty oracle | The 6 difficulty levels work, hitting ≥ 90% | ✅ (99–100 % on classic9, §15.4) |
| **P3** | Pipeline & events | 7 steps, event schema, delta patches | Can generate through the pipeline with a full trace | ✅ |
| **P4** | UI shell | index.html, i18n, SVG renderer, step description, replay engine | A usable website for `classic9`, bilingual | ✅ — executed **after** P5 |
| **P5** | Variants (in parallel) | The 12 remaining variants (the 3 `classic*` variants were finished in P1) | Each variant passes `variants.test.js` | ✅ — `T-5.1…5.8` executed **before** P4; `T-5.9` (symbol sets) and `T-5.10` (variants sweep) after P4 had started |
| **P6** | Worker & performance | Worker, fallback, cancellation, hitting the performance targets | Meets the §9.1 table | ✅ |
| **P7** | Polish | Export/print, accessibility, themes, cache, documentation | Passes the §15.5 checklist | ✅ (checklist partly: §15.5) |

**Critical path (as planned):** P0 → P1 → P2 → P3 → P4. P5 could run as multiple parallel agents right after P3. P6 and P7 could start partially after P4.

**As executed:** P0 → P1 → P2 → P3 → **P5 (variants)** → P4 (UI) → P6 → P7 → final QA (`T-7.7`). The variants were built before the UI to avoid merge conflicts on the "hot files" (`locale.*.js`, `index.html`, `node-runner.js`): they declared their strings in `SG.localeFragments`, which became the project-wide convention (§11.1). Work was done by parallel agents, each owning an explicit file list, in waves: 5 technique agents (`T-2.2…2.6`), then 4 + 3 variant agents, then the UI agents, then the worker / cache / polish agents, then final QA and documentation. Every agent read a shared **contract** (rules, API, file ownership) first and reported with the template of `task.md` Appendix C.

For the detailed breakdown of each task, see [`task.md`](./task.md).

---

## 18. Implementation notes & deviations

Everything above has been brought in line with the implementation. This table collects, in one place, where the implementation differs from the first plan or decides something the plan left open, and why. (Decisions D1–D6 are the open points the implementing agents raised; their resolution is in the rows marked D*n*.)

| Topic | What was built | Why |
|-------|----------------|-----|
| Pipeline steps 5–7 (§7.1) | `dig`, `rate` and `tune` are three steps. A missed dig sample repeats dig → rate → tune **on the same grid**, up to 12 samples per grid (30 for symmetries with groups of more than 2 cells); then `retry.difficulty` and a new grid. Events: `dig.start` (args `sample`, `maxSamples`), `tune.hit` / `tune.miss`, `retry.difficulty` | The guided dig shares its rating objective with the rater, and a full grid is much more expensive than another dig of it. The attempt counters ("Attempt n of m") are read from these events; the page no longer shows them while a run goes on (it shows the empty board), but `SG.app`'s `generate:progress` event still carries them |
| Stage B of the dig (§6.8) | A **guided** dig: it rates up to 32 candidate removals per step and applies the one that makes the puzzle hardest, never past the band; levels from `medium` up, starting at ≈ 47 % of the cells as clues. `tune.restore` / "dig deeper with a relaxed oracle" were not built | A finished stage-A puzzle is minimal, so a relaxed oracle finds nothing to remove; random minimal puzzles need only singles 3 times in 4, so the hard levels would be hit too rarely |
| Costs and bands (§6.6, §6.7) | `SG.difficulty.COSTS` (calibrated: subset ×7, fish ×6, wing ×10, chain ×8, singles 1 / 1.25 / 1.5) and `TABLE` (bands 0 / **72** / 180 / 400 / 800 / 1500); a **technique floor** raises the score to the band minimum of the hardest technique's group; `rating.rawScore` keeps the unfloored value; `report.score` of the solver stays the uncalibrated design score | The design costs overlapped the groups (the ~40 singles of any puzzle drown a few technique steps); the floor makes invariant I5 true by construction; calibration log in `js/core/difficulty.js` (task `T-2.10`) |
| Clue floors (§6.7; **D1**) | `spec(level, model).minClues` is the one floor; a variant declares `clueFloorScale` and / or `clueFloor`; Killer: `{ veryEasy: 40 }` only; invariant I6, the digger, the pipeline, `soak.js` and the variants sweep all use it | The classic9 floor scaled by `cellCount / 81` made hard/expert unreachable for Killer and left medium/hard hit by 1–20 % of the digs on the hybrid and multi-grid boards (task `T-7.7`) |
| Levels offered (**D2**, **D3**) | `flower` offers `medium` (it had none); `classic6` does not (it had it) | With the per-variant floor `flower medium` is hit by 49 % of the digs (was 9 %); `classic6 medium` stayed at 0–3 % |
| `restartThreshold` (**D4**) | `SG.fullGrid.generate` reads the variant's `restartThreshold` unless the caller passes one (Mega: 300 / 400) | It was declared but never wired |
| Option schema (**D5**) | Variants keep their own shapes; the registry **normalises** them (`optionsOf`, `defaultOptions`, `sanitizeOptions`); the UI, the store and the cache key read only those | Parallel agents wrote slightly different schemas; normalising in one place was cheaper than renaming |
| Calibration breadth (**D6**) | Costs are tuned on classic9; the other variants calibrate through `clueFloorScale`. `jellyfish` is untestable on real data (never on the solving path of 3 000 natural classic9 puzzles), so its cost only follows the fish factor. `extraPasses` is unused | Classic9 has the highest hit rate; the other boards were already at 95–100 % exact hits and needed speed, not new costs |
| Technique list (§6.6) | 26 registered: 21 classic + 3 `cage` + 2 `ineq`; Hidden Single split by unit kind, Quad split Naked / Hidden; `order` values in §6.6; **singles are techniques** — the logical solver never calls `propagate` | So that singles are attributed and scored, and `allowedTechniques` means what it says |
| Event contract (§7.2) | `SG.events.VOCABULARY` (`type`, `stepId`, `phase`, `key`, `level`, `args`, `patch`) is the contract; variants append their own entries; `lookup`, `vocabularyKeys`, `eventProblems` check events | One list that the core, the UI, the locale packs and the tests share |
| Stepper API (§9.3, §13.9, §13.13) | `SG.pipeline.runSteps` and the `SG.digger.*Steps` generators yield at natural boundaries; `run` is `runSteps` driven by `SG.budget.drive`; `SG.budget.createClock` is an *active* clock | One algorithm for both modes, so events, puzzle and budget accounting cannot differ, and `cancel` works in a worker (which otherwise cannot read its queue) |
| Worker client (§9.3, §13.10) | `generate / cancel / mode / ready / create / dispose`; session ids; ≈ 30 ms event batches; cooperative cancel, `terminate()` after 150 ms; `MessageChannel` yields; a main-thread mode that runs the same slices; **no `SharedArrayBuffer`** | A shared flag needs cross-origin-isolation headers that a plain static server does not send; `requestIdleCallback`/`setTimeout` are clamped or throttled in background tabs |
| Lazy extensions (§6.3) | Cage and inequality propagation register on first use (`SG.comboTable.enablePropagation`, `SG.ineq.ensureExtension`); `fromWire` and `SG.cache` switch them on for models they rebuild | The engine's own tests assume an empty extension registry, and a plain page load should not touch the engine |
| Default trace (§3.3, §14.2) | Pipeline default `summary`, which is also what the page gets: it sends no `trace` since the "Replay detail" option was removed; `full` (direct callers, tests) is downgraded to `summary` above 300 cells (Samurai, 369 cells, only) | The replay no longer needs a `full` trace (it reads the dig log); `summary` still feeds the `generate:progress` event of the app |
| Replay (§3.3, §7.3, §10.3) | Built by `SG.player.buildSteps` from `PuzzleResult.digLog` (the final sample only): one step per visible change of the board, the easy early removals summed up in batches, technical work hidden. The finished puzzle is shown at once and the replay is moved by hand (first / previous / next / last, slider), with static frames instead of animations. The first version — a player of the trace with Play/Pause, four speeds (`instant` / `fast` / `step` / `manual`), the `speed` preference and URL parameter, the "Replay detail" option (`trace` URL parameter) and a steps panel of the seven pipeline steps with a technique-frequency bar chart (`#steps-chart`) — was removed | Replaying every event was long and mostly technical (settings, rating, tuning, samples that missed the level), and a trace is capped at 20 000 events and thinned on large boards, so it could not always show the final dig faithfully; the dig log is small, exact and the same for every verbosity, thread and board size |
| Cell counts (§5.1) | `sohei` 288, `flower` 189 (the first plan said 324 and 225) | Arithmetic of the geometry of §5.2, checked by the builder |
| Names | UI card = `SG.explainCard` (`js/ui/explain.js`); core data = `SG.explain` (`js/core/explain-data.js`) | They were two modules with the same natural name |
| Locale strings (§11) | `SG.localeFragments`: every file pushes `{ en, vi }` fragments; `SG.i18n.mergeFragments()` merges them; the base packs win; the strings of the static page frame are one more fragment, `js/ui/locale.shell.js` | Parallel agents never edit the hot locale files |
| i18n API (§13.11) | `setLocale` returns the code; extras `detect`, `tError`, `eventText`, `setCellLabeler`, `has`, `keys`, `formatNumber`, `formatDuration`; plural rules via `Intl.PluralRules` | Needed by the controls, the step description, the exports and the tests |
| Board view (§13.12) | Ten layers (`regions overlays word cages ineq cells values grid coords overlay`); `setLayerVisible`, `getGeometry`, pure `geometry` / `renderMarkup` / `exportSvg`; one cell = 40 board units | Export, print and the help pictures reuse the pure part without a DOM |
| JSON document (§14.1) | Additive fields: `layout.cellRow/cellCol` (non-row-major boards), `symbols`, `wordoku`, `digOrder`, `maxAttempts`, `warnings`, `stats.timings`, `locale`, `labels`, extra `difficulty` fields, and (task `T-7.8`) `model`, the plain-data model spec for the player | The document must describe the puzzle completely; rule L6 (names in the export language); the player rebuilds the board without any variant code |
| URL and storage (§14.2, §14.3) | Extra params `order attempts sol o.<id>` (the `trace` and `speed` of older versions are ignored); a URL with a `seed` generates on load; seed hashing (FNV-1a); share links carry `v d sym mode`; `sg.cache.v1` format | State that is not a puzzle parameter must not bend a shared link |
| Cache (§6.8 ⑦) | Result cache + background pool; the trace and the dig log (the replay) are **regenerated from the seed**; *progressive difficulty (warm start)* not built | A trace can be megabytes; the guided dig already covers the warm-start need |
| Multi-grid (§8.4) | Generic MRV + `fastSeedOverlaps`; no sub-grid-wise digging sequence; p95 ≈ 0.07–0.5 s in Node instead of the planned 8–20 s budgets | The oracle and the clue floors keep the digs short |
| Mega (§8.6) | Symbol set is the option `symbolSet`; **no** mobile minimap / horizontal scroll (the SVG scales to the width) | Scaling the viewBox was enough for the board sizes tested; the minimap is an idea (below) |
| Killer, Greater-Than, Wordoku (§8.2, §8.3, §8.5) | Killer's layout uniqueness check / repair runs for hard and above only (veryEasy–medium rely on the clues); GT: `build` returns the empty board, signs come from `postGenerate`, the dig removes signs (revealing clue groups where the level needs them); Wordoku letters are in alphabetical order and the VI list is short, so the EN list takes over with an event | Models are immutable; uniqueness at the easy levels is guaranteed by the oracle |
| Unique-solution check (§6.5) | `stillUnique` is ≈ 3.7–4× faster than counting on remove-stays-unique calls, ≈ 1.8× over a whole dig | The first estimate (5–12×) was optimistic; the "≥ 3×" criterion was accepted in its narrower reading |
| Order of work (§17) | P5 `T-5.1…5.8` before P4; `T-5.9`, `T-5.10` after P4 had started; the pre-generation task `T-6.3` is *not* the calibration (that is `T-2.10`) | Avoided merge conflicts on the hot files |
| Split into two repositories (`T-7.5`, `T-7.8`) | The trial-play mode (`js/ui/play.js`, `css/play.css`, `tests/suites/play.test.js`, the `sg.play.v1` key and the play shortcuts of the help) moved to the **sudoku-player** repository. This one keeps the generator and gains `js/ui/exchange.js` (shared byte for byte), the `model` block of the JSON and the "Play" button (§10.9) that opens the puzzle in the player | A player and a generator have different users and release rhythm; the only coupling left is a documented document format, carried in a URL fragment so that no server is involved |
| Tests (§15) | 43 suites (`play.test.js` left, `exchange.test.js` and `history.test.js` came); the harness has more matchers; the README is checked mechanically by `help.test.js`; `tests/perf.js` + regression hashes; `tests/soak.js --full` | See §15 |
| Page layout and result panel (§10.1, §10.5; later change) | The Status box (and the mode badge) and the list of generation steps are gone. The result and the step description are two tabs (Summary / Generation Steps) of one box under the board; the replay controls are in the second tab; the puzzle options (with Generate at the top) are the right column; a footer carries the copyright and the repository link. The Summary has two small cards and a "Difficulty Score" table (Technique / Other sections, Total row = the score, help icons), and the step description shows the same table for the puzzle at that step (`player.rateStep`). The thumbnail, seed, share link, Play-online and solution controls, timings and the hardest-technique / time / attempts cards were removed from the panel | The page showed the same information three times (status, steps, result); the score is now explained where it is read, and the options no longer move when a variant has many of them |
| Saved list of puzzles and exports (§10.1, §10.6, §14.3; later change) | `SG.history` keeps every generated puzzle in `sg.history.v1` and shows it in the left panel (variant; level, score and the last 6 characters of the seed). Print and Export choose their puzzles from that list; the Print dialog has no preview and offers 1, 2 or 4 puzzles per page; Export writes readable text (`#n,variant,level,seed` + the grid rows) instead of the encoded token (`buildExportCode` / `openCode` were removed) | Several puzzles can be made, kept and printed or exported together; a readable text can be consumed by other tools, and the seed plus the clues are all a reader needs |
| Document history | This specification was translated from Vietnamese to English at the user's request; the original Vietnamese `design.md` / `task.md` no longer exist on disk | — |

### Known limitations and ideas

- **Main-thread mode** (`file://`, no Worker): slices of ≈ 12 ms, but one unsplittable piece of work can stall the page — a single DFS slice in Killer takes 70–86 ms, a Greater-Than sign dig 50–70 ms per sample, the cage layout of a hard Killer up to ~300 ms — and background pre-generation does not exist there.
- **Browsers:** only Chromium-based Edge was run. Firefox 100+ and Safari 15.4+ are targets but untested; no real mobile device and **no real screen reader** were used.
- **The pre-generation switch** in Settings (`SG.cache.setEnabled`) is not persisted.
- **Calibration** is exact only for classic9; other variants rely on their clue floors, and a strict symmetry with a very high level returns the closest puzzle with a notice.
- **Wordoku in Vietnamese** has a short word list (the English list takes over).
- **Ideas not built:** a minimap for 16×16 on phones; progressive difficulty (warm start); persisting the pre-generation preference; a "kid mode"; sub-grid-wise digging; a percentage progress bar.
