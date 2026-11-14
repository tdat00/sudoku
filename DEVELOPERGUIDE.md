# Sudoku Developer Guide

<a id="top"></a>

**English** · [Tiếng Việt](DEVELOPERGUIDE.vn.md) · [User guide](USERGUIDE.md) · [README](README.md)

**Live apps:**
[Sudoku Generator](https://tdat00.github.io/sudoku/generator/) ·
[Sudoku Player](https://tdat00.github.io/sudoku/player/) ·
[GitHub](https://github.com/tdat00/sudoku)

How the two apps are built, run, tested and published, and how to change them. What they do and how to use them
is in the [user guide](USERGUIDE.md).

- [Overview](#overview)
  - [Layout](#layout)
  - [Run it locally](#run-it-locally)
  - [Tests](#tests)
  - [Publishing](#publishing)
  - [Documents](#documents)
  - [How to contribute](#how-to-contribute)
- [Sudoku Generator](#sudoku-generator)
  - [Running the generator locally](#running-the-generator-locally)
  - [How it works](#how-it-works)
  - [The exchange format](#the-exchange-format)
  - [Adding a variant](#adding-a-variant)
  - [Adding a technique](#adding-a-technique)
  - [Running the tests](#running-the-tests)
  - [Conventions](#conventions)
  - [Known technical limitations](#known-technical-limitations)
  - [Licence and credits](#licence-and-credits)
- [Sudoku Player](#sudoku-player)
  - [How the player reads a puzzle](#how-the-player-reads-a-puzzle)
  - [Run the player locally](#run-the-player-locally)
  - [Player tests](#player-tests)
  - [Deploy on GitHub Pages](#deploy-on-github-pages)
  - [More about the player](#more-about-the-player)

---

# Overview

## Layout

```
core/        what both apps load: the solver engine, the SVG board, the exchange format, the base styles, the
             word book, and the tests of all of that
generator/   Sudoku Generator
player/      Sudoku Player
assets/      the images of the link previews (og-generator.png, og-player.png, 1200×630) and apple-touch-icon.png
docs/        the documents of both apps, by feature
.github/     the workflow that tests and publishes the site
index.html   the site root: forwards to the generator · sitemap.xml: the pages for the search engines
AGENTS.md    how AI agents should work here
```

Each app keeps its own page, `design.md`, `task.md`, `js/`, `css/` and `tests/`. What the two share lives in
`core/` and exists once; the apps load it with relative paths (`../core/…`), and the generator's **Play** button and the
player's link to the generator are relative paths too (`../player/index.html`, `../generator/index.html`). Details:
[docs/architecture.md](docs/architecture.md).

[Back to top](#top)

## Run it locally

You need only a web browser (Chrome or Edge 100+, Firefox 100+, Safari 15.4+).

- **The quickest way** — open `generator/index.html` or `player/index.html` in the browser. It works from `file://`
  (the generator then runs on the main thread, because browsers do not allow Web Workers there).
- **Recommended** — serve **this folder** (the root of the repository, not `generator/` or `player/`: the pages load
  `core/`) with any static server. Then the generator runs in a Web Worker:

  ```bash
  python -m http.server 8000      # then open http://localhost:8000/generator/ or http://localhost:8000/player/
  # or:  npx serve .
  ```

[Back to top](#top)

## Tests

Node 18+ (CI uses 24), no packages to install:

```bash
cd generator && node tests/node-runner.js     # the quick suites of the generator + the shared ones of core/tests
cd player    && node tests/node-runner.js     # the quick suites of the player + the shared ones of core/tests
```

The heavy suites of the generator (`--all`, `--manual`, `soak`, `perf`, `qualify`) and the browser scripts of the player
(`player/tests/browser/`) are slow; they are run on purpose, not by default. See the tests of [the generator](#running-the-tests) and of [the player](#player-tests), and
[AGENTS.md](AGENTS.md) for what AI agents may run.

[Back to top](#top)

## Publishing

`.github/workflows/pages.yml` runs the tests and publishes one site on GitHub Pages after every push to `main`
(**Settings → Pages → Build and deployment → Source → GitHub Actions**):

| Address | Content |
|---|---|
| [tdat00.github.io/sudoku/](https://tdat00.github.io/sudoku/) | redirects to the generator (`generator/`) |
| [tdat00.github.io/sudoku/generator/](https://tdat00.github.io/sudoku/generator/) | Sudoku Generator |
| [tdat00.github.io/sudoku/player/](https://tdat00.github.io/sudoku/player/) | Sudoku Player |
| `…/sudoku/core/` | the shared code both apps load (no tests) |

[Back to top](#top)

## Documents

[docs/README.md](docs/README.md) indexes them by feature: [the architecture](docs/architecture.md), the
[difficulty rating](docs/difficulty-rating/report-brief.md) reports, the
[Generation Steps](docs/generation-steps/report-brief.md) reports (the design of the replay), the
[puzzle exchange](docs/puzzle-exchange/fixtures.md)
fixtures and the [QA records](docs/qa/browser-run.md). The design and the plan of each app are next to its source:
`generator/design.md`, `generator/task.md`, `player/design.md`, `player/task.md`. At the root, the user guide
([English](USERGUIDE.md), [Vietnamese](USERGUIDE.vn.md)) is for the people who use the apps, and this developer
guide ([English](DEVELOPERGUIDE.md), [Vietnamese](DEVELOPERGUIDE.vn.md)) for the people who work on them.

[Back to top](#top)

## How to contribute

1. Read [AGENTS.md](AGENTS.md): where code goes, the conventions (in full under [Conventions](#conventions) and in
   `generator/design.md` §12.2) and which tests to run.
2. Run the quick suites of the app you changed (`node tests/node-runner.js` in `generator/` or `player/`, see
   [Tests](#tests)); a change in `core/` is run in both.
3. When behaviour, a path, a command or a number changes, update in the same change the user guide
   ([USERGUIDE.md](USERGUIDE.md), [USERGUIDE.vn.md](USERGUIDE.vn.md)) and this developer guide
   ([DEVELOPERGUIDE.md](DEVELOPERGUIDE.md), [DEVELOPERGUIDE.vn.md](DEVELOPERGUIDE.vn.md)), both languages of each,
   and the `design.md` of the app. The `help.test.js` suites of both apps check the guides against the code.
4. Make one meaningful change per commit (not one per file), and never commit secrets.

[Back to top](#top)

---

# Sudoku Generator

Sudoku Generator is a static web app written in plain HTML, CSS and JavaScript: no framework, no build step, no
server, no external library. What it does and how to use it is in the
[user guide](USERGUIDE.md#sudoku-generator); this part is about its code.

> Paths in this part are relative to `generator/`, and its commands run from that folder.

## Running the generator locally

**The quickest way** — open `generator/index.html` in the browser (double-click it, or drag it onto a window). It works
from `file://`, but browsers do not allow Web Workers there, so the generator runs on the main thread in small
slices: the page stays responsive between slices but may pause
for a moment on a large board (one unsplittable piece of work can take up to a few hundred milliseconds),
**Cancel** takes effect at the next slice, and the background pre-generation of the next puzzle is off.

**Recommended** — serve the repository with any static server (the root, not `generator/`: the page loads the code it
shares with the player from `../core`). Then the generator runs in a Web Worker, the page stays smooth, **Cancel** works at once and the next puzzle is quietly
pre-generated while you look at this one:

```bash
cd sudoku                       # the root of the repository
python -m http.server 8000      # then open http://localhost:8000/generator/
# or:  npx serve .
```

**GitHub Pages** — the apps use only relative paths, so they work from any sub-path with no configuration.
Choose *Settings → Pages → Build and deployment → Source → GitHub Actions*. The
[deployment workflow](.github/workflows/pages.yml) of the repository runs the Node 24 tests and publishes the
generator, the player and the code they share after every push to `main`; you can also run it manually from the
**Actions** tab. Only the app files and licence are published, not the tests or working notes. The live app is at
**[tdat00.github.io/sudoku/generator](https://tdat00.github.io/sudoku/generator/)**.

**Search engines and link previews** — the `<head>` of `generator/index.html`, `player/index.html`, `player/help.html`
and the root `index.html` carries a description, a canonical address, Open Graph and Twitter Card tags (what Facebook,
Zalo, X and Slack show when a link is shared) and, for the two apps, JSON-LD. Crawlers run no script, so these tags are
static English text, and their addresses are absolute (`https://tdat00.github.io/sudoku/…`, the one exception to the
rule of relative links): change them when the site moves. Facebook cannot show an SVG, so the preview image is a PNG of
1200×630 pixels in `assets/` (`og-generator.png`, `og-player.png`); the workflow publishes `assets/` and
`sitemap.xml` with the site. After a change of the tags or the images, refresh the cache of Facebook with its
[Sharing Debugger](https://developers.facebook.com/tools/debug/); to be listed in Google, submit
`https://tdat00.github.io/sudoku/sitemap.xml` in Search Console (a project site cannot serve its own `robots.txt`).

## How it works

### Layers

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ UI            js/ui/        app · controls · step-view · explain · player · result-view       │
│                             · i18n · store · export · a11y …                                  │
│               ../core/js/ui/   board-view (SVG) · symbols · exchange · wordbook  (shared)      │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ ORCHESTRATION js/worker/    worker-client (Web Worker, or the main-thread fallback)           │
│                             gen.worker.js (runs the pipeline and replay off the main thread)  │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ GENERATION    js/engine/    pipeline · full-grid · digger · symmetry · difficulty · events    │
│                             replay (the analysis of the Generation steps tab)                 │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ SOLVER        ../core/js/engine/   dfs-solver · logical-solver · techniques + tech-*.js       │
│                                    (shared with the player)                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ MODEL         ../core/js/engine/ · js/engine/ · js/variants/                                  │
│                             model · constraints · bits · classic-model · rng · 15 variants    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

A lower layer never knows about a higher one. The engines (`../core/js/engine/`, `js/engine/`) and `js/variants/`
never touch the DOM, which is what lets the whole engine run in Node for the tests. `../core` is the code the
generator shares with the player (see [the overview](#overview)); it knows nothing about the generator.

**One model for every variant.** A puzzle is a set of cells, a list of *units* (groups of cells that must hold
different values: rows, columns, boxes, jigsaw regions, diagonals, windows, cages) and optional extras (cage
sums, inequalities). Samurai and friends are just a bigger model whose grids share cell indices. So one
solver and one generator serve all 15 variants, and the engines have no `if (variant === …)` anywhere:
differences go through the registry (`SG.variants`).

### The generation pipeline and its event stream

`SG.pipeline.run(config, emit, budget)` is synchronous and always goes through seven steps:
`configure → buildModel → fullGrid → extraStructure → dig → rate → tune`. It returns a `PuzzleResult`
(`model, givens, solution, rating, exact, seed, config, timings, attempts, warnings, digLog`) and reports
everything through `emit` as `GenerationEvent`s:
`{ type, stepId, phase, t, seq, i18nKey?, i18nArgs?, patch?, metrics? }`. A `patch` is a *delta* of at most
eight cells (`{ cells: [{ i, value, state }], highlight, unhighlight }`), never a snapshot.
`SG.events.VOCABULARY` is the contract for every event key.

`dig`, `rate` and `tune` are three steps that repeat per *dig sample*: when the puzzle that was just dug does not
count as reached (`tune.miss`, or `tune.shallow` when its score is in the requested band but it needs no technique
of the level's tier), the next sample is dug from the same grid (up to 12 per grid); when none of
them hits, a local search starts from the closest one (it adds, removes or swaps symmetric groups of clues), and
only then does `retry.difficulty` start a new grid (up to `attempts`, by default the number for the size of the
board: see below). The top levels (nightmare, hell 1 and
hell 2) also dig fast, uniqueness-only proposals and put clues back while a proposal is too hard. Every grid
has fixed work caps (full ratings and proposed moves, counted, never timed), so a seed gives the same puzzle on
every machine. If every attempt is used, the best puzzle is returned with a notice instead of an error (only
a puzzle with a complete logical proof is ever returned). `SG.pipeline.runSteps` is the same algorithm as a
generator that yields at natural boundaries (what the worker and the main-thread mode run), and
`SG.pipeline.toWire` / `fromWire` carry a result across `postMessage`. `result.exact` is a boolean, the digger's
verdict for the returned puzzle and the `exact` of the `done` event: a complete proof whose level is the requested
one **and** that needs a technique of that level's tier (`SG.difficulty.requiredOf`; nothing is required of Very
Easy). It crosses the wire as a strict flag (the wire version stays 1; a wire without it, such as an older cache
entry, reads as `false`) and is never rebuilt from matching level names, so the result panel shows exactly what it
says. The three band verdicts of the `tune` step (`tune.hit`, `tune.miss` and `tune.shallow`) carry `required`
(`true` for a hit, `false` for a shallow result, `null` for every other miss, a solved one outside the band
included) and may carry `target` (a finite number or `null`; nothing draws one yet). A complete result in the
band that needs no technique of the tier is *shallow*: it is kept as a fallback, never exact, and the search goes
on; when it ends as the answer it carries `difficulty.shallow` next to `difficulty.approximate`, a warning of the
kind that offers "Retry". The soak, the qualification and the manual suites count a hit by this flag alone, never by
comparing level names (an absent flag is a miss). The difficulty of a puzzle is
`SG.difficulty.rate(...)`, from the technique weights `SG.difficulty.WEIGHTS`; use `rating.score`, never the
solver's raw score.

**The default number of attempts follows the board.** `SG.digger.defaultMaxAttempts(cellCount)` is the one rule: 8
for 81 cells or fewer, 4 for 82 to 144 (mega12, butterfly) and 2 above (flower, mega16, sohei, samurai). It is a
count and never a time, applies only when no `maxAttempts` is given (an explicit whole number from 1 always wins),
and leaves the shallow allowance, the caps of an attempt and every board of up to 81 cells alone. `SG.digger.generate`
reads `model.cellCount`; `SG.pipeline.normalizeConfig` reads `SG.variants.cellCountOf(def)`, the size taken from the
definition with no model built and no random draw (digits squared, unless the definition declares `cellCount`, as
the four multi-grids do); the store uses the same function (`SG.store.defaultAttempts`). `SG.pipeline.DEFAULT_MAX_ATTEMPTS`
(8) is only the reference of the small boards, never the default of another one. The soak and the qualifier pass no
`maxAttempts`, so they measure these defaults; a fallback after them is a miss, and only the final qualification
decides what is offered. In the store the state holds the number and `attemptsExplicit`: `false` while the number
is the board's (it follows a change of variant), `true` once it was typed or came in a link's `attempts` (it then
stays across variants and reloads, also when it equals the default); an emptied field returns to `false`.
`sg.lastConfig.v1` saves both. A last configuration saved before size-dependent defaults that holds 8 without an
intent marker is read as the default because it cannot be distinguished from a deliberately chosen 8; entering 8
again makes it an explicit choice (any other stored number stays chosen). A recipe generated again — a history
entry, a stale cache entry (`app.generate(overrides)` sets the store with `{ source: 'app' }`), the export
(`toConfig` over `defaults()` plus the entry) — runs with the number it recorded; a replay never turns a chosen
number into a default, and a recorded number that is not its board's default becomes a chosen one
([design.md](generator/design.md) §6.8, §14.2,
§14.3). The marker never reaches `GenerateConfig`, the history, the cache or an exported puzzle.

The UI never slows the algorithm down to animate it, and its replay does not read the events. Next to them
the digger keeps a compact **dig log** of the sample that became the puzzle (`result.digLog`: entries `pass`,
`accept`, `reject`, `keep` and `restart`, plus `signs`, `clear`, `reveal` and sign verdicts for Greater-Than;
the header of `js/engine/digger.js` describes them). It is the same whatever the trace verbosity, the thread or
the board size, and `toWire` / `fromWire` carry it. After a run the board shows the finished puzzle at once;
nothing plays by itself (the replay is described in the next section).
Random choices use forked streams of one seeded generator (`SG.rng`), which is why a seed reproduces a
puzzle.

### The replay of the generation

The **Generation steps** tab shows how a puzzle was dug out of its solution, with a score table on every step.
Four pieces build it, in this order (the first three are pure); none of them changes the puzzle, the cache, the
history, the export or the URL. The technical work (settings, board model, samples that missed the level) is
never shown.

1. **The analysis, `SG.replay`** (`js/engine/replay.js`; no DOM, no clock, no random numbers).
   `SG.replay.moves(result)` turns the dig log into complete moves (a symmetric group, an exchange of clues, one
   sign, a restart; never half of one), each with the board after it. `SG.replay.analyse(result)` rates the board
   after every move once and returns the **analysis**, plain data that survives a structured clone
   (`SG.replay.toPlainWire` / `fromPlainWire` carry it as JSON-safe data); `SG.replay.prepare(result)` is the same
   work as an iterator that yields `{ done, total }`, which is what the worker and the main-thread mode drive in
   slices, and `SG.replay.fallback(result, reason)` is the analysis of a result without a usable log (the full
   solution, the structure and the finished puzzle). A rating (`SG.replay.rateBoard`) is one
   `SG.logicalSolver.solve` with every technique under a guard of 1,000,000 checks, plus a count of the solutions
   under a guard of 200,000 nodes when the proof assumes uniqueness; the finished puzzle keeps `result.rating`.
   A board that cannot be rated gets an honest status, never a guess or a retry: `capped`, `stuck`, `ambiguous`
   or `unverified` (the other statuses are `rated`, `zero` and `final`). The work count `checks` is diagnostic
   only and can differ by a few between two runs, so comparisons ignore it.
2. **The views, `SG.replay.buildViews(analysis)`.** The **compact** view is a few steps chosen by score so that
   it never goes down (`SG.replay.select`, a step at the end of every phase, checked by `SG.replay.audit`); the
   **details** view has one step per move. `analysis.transitions` holds, for every step, the change of the
   Total, the terms P, W, E, V and R before and after, and the tier (`SG.replay.isJump`,
   `SG.replay.badgeRatio`): a **jump** is a rise of at least ×3 **and** at least +100 from a positive score, and
   its badge shows the ratio rounded down to one decimal. For every jump the analysis also holds its cause (the
   parts of the move rated on partial boards, which are probes and never steps, `SG.replay.classifyShares`), the
   generator's recorded choice and, in `analysis.proofs`, the first use of the new hardest technique
   (`SG.replay.firstUse`) and a restricted check (`SG.replay.restrictedCheck`). This is optional work: a
   failure leaves a piece `unavailable` and never changes a rating. The thresholds and guards are in
   `SG.replay.CONSTANTS`.
3. **The steps, `SG.player.buildViews(result, analysis)`** (`js/ui/player.js`) → `{ compact, details, signs,
   cellCount }`. A step is plain data: its `role`, the moves it covers, the board it shows, a title and a
   sentence per run of moves (as `SG.i18n.t()` keys), the frames of the **net** change (cells cleared, cells put
   back, clues shown again, and the one clue or sign that causes a jump), the signs, the cumulative metrics and a
   `table` model of its score table, whose `state` is `start` (position 0), `zero` (nothing to solve yet),
   `scored`, `final` or `status` (a board that could not be rated). `SG.player.create()` is the manual player
   (first, previous, next, last, seek, `setAnalysis`, the view toggle `setView('compact' | 'details')`;
   position 0 is the empty grid), and its `tableAt(position)` method hands the table of the step on show to the
   step description.
4. **The step description, `SG.stepView.create(rootEl, { table })`** (`js/ui/step-view.js`) draws that table by
   state, with the change of the Total, the legend of the board frames and the tier of the step: the **first
   rated puzzle**, a **score jump** (a badge in the heading, a callout with a closed "Why?") or a **new hardest
   technique**. `SG.stepView.explain(table, step)` is the pure text model that the tests read. A jump that
   exactly one clue or sign causes gets a frame on the board (`marks.cause`, `marks.causeRestore`,
   `signs.cause`; `board.setSignMarks` takes a `cause` list).

The numbers of the examples are the ones of the tests. Classic 9×9 *expert* with seed 3275974478 has 32 positions
and 33 steps with every move shown; its compact view has 7 steps with the scores 0, 23, 44, 551, 568, 992 and
992, and the step 44 → 551 (×12.5) is a jump caused by the clue at R1C2 (alone it gives 550; the other removal
of the move, R9C8, alone gives 44), which is framed. A Classic 9×9 *easy* puzzle with seed 3 replays in 7 steps
(26 with every move shown): the full solution, three steps of random removals (scores 15, 26 and 44), two
steps of the guided dig (46 and 100) and the finished puzzle with 34 clues.

**Preparation.** The page asks for the analysis after the puzzle is on screen, through
`SG.player.createPreparation()` (a controller without DOM: `start(result)`, `press()`, `unavailable(result)`,
`cancel()`, `state()`; its states are `idle`, `waiting`, `consent`, `trace`, `preparing`, `ready`, `unavailable`
and `error`). In worker mode it starts by itself and the status block of the replay (`#replay-status`) shows the
progress, in positions rated. In main-thread mode (`file://`) it shows a notice and the **Prepare score tables**
button (`#btn-prepare-replay`); nothing runs before the press, not even the regeneration of the record of a cached
puzzle, the replay controls stay off until the tables are ready, and the analysis then runs on the page
(`replay(result, { allowMain: true })`). Until the analysis is there the board keeps the finished puzzle; when it
cannot be had (a failure, or a cached puzzle whose record cannot be rebuilt), the replay falls back to the full
solution and the finished puzzle (`SG.replay.fallback`).

The explanation of the seven steps lives in the Help dialog (tab "How it works"): one collapsible entry per step
with its what / why / how and pseudocode, `SG.explainCard.create(el, { compact: true })`; the entry of the replay
step on show is marked, open, and its running line and dig counters are shown (`SG.app.getExplainContext()`). The
**Explain** (help) icon of the step description opens the Help on that tab. Overlays (cages, signs, windows) are
drawn from the model of the result, not from the log.

### Worker and fallback

`SG.workerClient.generate(config, onEvent)` returns a promise of the `PuzzleResult`; `.cancel()` stops a run,
`.mode` tells `'worker'` or `'main'`, `.ready()` settles once the mode is known, and `SG.workerClient.create()`
makes an independent client (with `dispose()`) for the cache. Over `http(s)` the client
starts `js/worker/gen.worker.js`, which loads the core, the variants and the word lists with `importScripts`
and runs `SG.pipeline.runSteps` in slices of about 12 ms, so a `cancel` message is read between slices: the
promise is rejected at once, the work stops at the next boundary, and a worker that does not answer within
150 ms is terminated (and created again when it is needed). Where a Worker cannot start (`file://`, a restrictive policy) the client
falls back to the main thread and runs the same slices there. The puzzle for a given
seed is identical in both modes.

The same client runs the replay analysis: `SG.workerClient.replay(result, { onProgress({ done, total }),
allowMain: false })` returns a promise of the analysis and `.cancelReplay()` stops it (every client has both: the
`create()` clients, the cache's wrapper and the page's own direct client). In worker mode the job is a `replay`
message that carries `SG.replay.toPlainWire(result)`; the worker runs `SG.replay.prepare` in slices and answers
`replayProgress` (the positions rated, when the count changed), then `replayDone` (the analysis) or
`replayError`. The worker has one job at a time: `generate`, `replay` and `cancel` pre-empt it at the next slice,
so a new generation cancels a replay, and `replay()` during a generation is refused (`unexpected`, message
`busy`). In main mode the analysis runs on the page in slices, only inside `replay()` and only with
`allowMain: true`, the user's consent (the **Prepare score tables** button); without it the promise rejects with
`budget.cancelled` and `i18nArgs.reason === 'replayConsentRequired'`, and so it does when a worker that was
running cannot be replaced. The messages are the header of `js/worker/gen.worker.js`, the design is
[design.md](generator/design.md) §9.3.

### Cache and pre-generation

`SG.cache` (`js/ui/cache.js`) stores every generated puzzle in `localStorage` (`sg.cache.v1`, 20 puzzles,
least recently used out first, schema version checked), so the same configuration with the same seed is served
at once. It stores the puzzle only, never the trace nor the dig log: a cached puzzle is shown immediately (the
replay waits, with the note "Preparing the score tables: rebuilding the generation record…") and is **generated
again from its seed in the background**; its dig log then gives it its replay (`SG.app.attachTrace(trace,
digLog)`), which opens on the finished puzzle — the regenerated puzzle must equal the cached one, otherwise the
entry is dropped. In main-thread mode the regeneration waits for the **Prepare score tables** press (the
`replay:consent` event of the app), and `SG.app.markTraceUnavailable()` shows the fallback replay when the
record cannot be had (no worker for the background run, a failure, a different puzzle). When the page has
been idle for a second, the cache also pre-generates one or two puzzles with the same options in a worker,
which "Generate" (with an empty seed) and "Generate random" then hand out instantly. It never runs while a
generation is in progress, pauses in a hidden tab, skips configurations that are slow, and does not exist in
main-thread mode. A switch in Settings turns the pre-generation off (the choice is not remembered).

Rating v2 changed the scoring and the generation: the cache drops the puzzles an older version stored, once; the
scores already stored in the history are not re-rated; and an exported document keeps the
`sudoku-generator/v1` format and gains `difficulty.ratingVersion: 2`.

### Puzzle history

`SG.history` (`js/ui/history.js`) adds every puzzle the page generates to a list kept in `localStorage`
(`sg.history.v1`, newest first, 100 entries at most; with no storage the list lives in memory). An entry is small:
variant, level asked for and reached, seed, clues, score and the configuration that rebuilds the puzzle
(`SG.history.entryOf(result)`; its key, `SG.history.keyOf`, is derived from them when the list is read, not
stored); an imported puzzle is not listed because no seed rebuilds it. The list is the
left panel of the page (`#history-root`; under the result on narrower screens). A puzzle that is generated again
moves to the top; picking an entry writes its configuration to the form and generates it (the same seed gives
the same puzzle within one generator version, and the cache serves it at once when it still has it) without
moving it; an entry made before rating v2 may regenerate a different puzzle, and its stored level and score are
not re-rated. Each entry can be removed, and **Remove all** empties the list.

### The address bar and settings

`SG.store` (`js/ui/store.js`) turns the state of the page into the parameters of the address and back
(`SG.store.parseUrl`, and `SG.store.toUrlParams`, which writes only the values that differ from the defaults), and
keeps the preferences (`sg.prefs.v1`) and the last options (`sg.lastConfig.v1`) in `localStorage`, every access
guarded (memory only when storage is blocked). The page has no share-link button; `SG.store.shareUrl` builds a
link that also carries `v d sym mode`. The parameters are listed in the user guide
([URL parameters](USERGUIDE.md#url-parameters)); the formats are in [design.md](generator/design.md) §14.2 and §14.3.

### Internationalisation

`SG.i18n.t(key, args)` translates `{placeholders}`; `data-i18n` and `data-i18n-attr` attributes translate the
HTML. The two base packs are plain scripts (`js/ui/locale.en.js`, `locale.vi.js`), never fetched JSON, so
`file://` works. Every other module — including `js/ui/locale.shell.js`, the strings of the static page frame —
keeps its own strings in a **fragment** pushed at the bottom of its file, which `SG.i18n` merges into the packs
(a key that a base pack already defines wins, and the clash is reported):

```js
SG.localeFragments = SG.localeFragments || [];
SG.localeFragments.push({
  en: { 'variant.disjoint9': 'Disjoint Groups Sudoku' },
  vi: { 'variant.disjoint9': 'Sudoku Nhóm rời' }
});
```

Rules, enforced by `tests/suites/i18n.test.js`: both languages have the same keys, no value is empty, the
`{placeholders}` match, keys are unique, and the Vietnamese is real Vietnamese (an established term such as
*X-Wing*, *Swordfish* or *seed* stays as it is). Never build a sentence from several keys: word order differs.

### One namespace, no modules, one script order

Every file is an IIFE that attaches to a single global, `SG`; there is no `import`, `export` or `require` in
`js/`, so the same file runs as a classic `<script>`, inside a Worker through `importScripts`, and in Node
through `vm.runInThisContext`:

```js
(function (root) {
  'use strict';
  const SG = root.SG = root.SG || {};
  // ... definitions ...
  SG.something = { /* ... */ };
})(typeof self !== 'undefined' ? self : globalThis);
```

Because there are no imports, **load order is the dependency graph**. `SOURCE_FILES` in
`tests/node-runner.js` is the single source of truth; the same order is repeated in `index.html` (`<script>`
tags), in the `SOURCE_FILES` array of `tests.html` and — for the engines, the variants and the word lists only,
never the UI — in `js/worker/gen.worker.js`. `tests/suites/ui-contract.test.js` fails when they drift apart.
**Adding a JavaScript file means adding it to all four places.** Files that do not exist yet are skipped by
the runner and `tests.html`. The files of `core` are listed by their path from this folder
(`../core/js/engine/model.js`); a file added to `core` that the player needs too goes into the player's lists as well.

### The UI modules

`js/ui/app.js` owns the page and exposes `SG.app`: `getStore()`, `getBoard()`, `getPlayer()`, `getStepView()`,
`getResult()` (the last `{ result, trace }`), `generate()`, `regenerate()`, `cancel()`, `showResult()` (show a
puzzle that was not generated on this page), `toast()`, `announce()`, `openModal()`,
`setClient()`, `attachTrace()` and `markTraceUnavailable()` (what the cache uses), and an event bus `on()` /
`emit()` with the events `generate:start`, `generate:progress`, `generate:end`, `generate:error`,
`generate:cancel`, `result`, `trace` (`{ result, trace }`, once `attachTrace()` gave a cached puzzle its replay),
`replay:consent` (the user pressed **Prepare score tables**), `position` (`{ position, length, step, direction }`
after every move of the replay; `step` is a step of `SG.player.buildViews`, null at position 0), `locale`,
`theme`, `settings` and `action`. The header of `app.js` is the full contract.

**Adding a UI module without editing `app.js`.** At the end of start-up `app.js` calls `init(SG.app)` — which
must be idempotent — on each of these optional modules that exists, in this order, every call in its own
`try/catch`:

| Module | What it does |
|--------|--------------|
| `SG.exportUi` | The Print dialog (print / PDF of the puzzles chosen from the saved list, 1, 2 or 4 per page, optionally with the solutions on their own pages), the **Export** button (`action { id: 'exportCode' }`: the chosen puzzles as readable text, `buildExportText(items)`) and the **Play** button (`action { id: 'play' }`: opens the puzzles in Sudoku Player, see [The exchange format](#the-exchange-format)) |
| `SG.a11y` | The board as an ARIA grid with keyboard navigation, live announcements (a generation starts, the language changes), the Settings dialog |
| `SG.theme` | Light, dark and high-contrast themes (and "auto"), the hints of the empty / busy / error states |
| `SG.help` | The Help dialog (rules, technique ladder, shortcuts) |
| `SG.cache` | The cache and pre-generation described above; it replaces the generation client with a wrapper |
| `SG.history` | The list of generated puzzles (`localStorage` key `sg.history.v1`, newest first, 100 at most) shown in the left panel; picking one writes its configuration to the form and generates it again |

Such a module listens with `SG.app.on('action', …)` (the Print and Play buttons of the main panel and the
Settings and Help buttons of the header emit `action { id: 'export' | 'exportCode' | 'play' | 'settings' | 'help' }`), draws
dialogs with `SG.app.openModal()` and reads the puzzle with `SG.app.getResult()`; a name that
is not in the list needs one more entry in the `OPTIONAL_MODULES` list of `app.js`. Every UI file must **load
in Node without a DOM** (top-level code only defines functions and pushes locale fragments; the DOM is touched
inside functions called at run time), and keeps its logic in pure, testable functions next to the DOM code.
`core/js/ui/exchange.js` (`SG.exchange`) is not one of these modules: it is a DOM-free helper that `exportUi` uses
and that the player loads too.

### Directory tree

```
sudoku/                     the repository (see "Layout" in the overview for the whole layout)
├── .github/                workflows/pages.yml: the quick tier, then publishes generator/, player/ and core/ · workflows/pull-request.yml: the quick tier and the browser scripts of a pull request to main · scripts/: the CI groups of the generator quick set
├── LICENSE · .gitignore    the MIT licence · files ignored by git
├── docs/                   documents of both apps, by feature (the screenshots of the user guide are in
│                           docs/screenshots/)
├── core/                   what the generator and the player share (see ../docs/architecture.md)
│   ├── js/engine/          ns · errors · bits · budget · model · constraints · combo-table · dfs-solver
│   │                       · techniques · logical-solver · tech-*.js · classic-model · model-aids
│   ├── js/ui/              exchange · wordbook · symbols · board-view
│   ├── css/                tokens.css · tokens-board.css · base.css · board.css
│   ├── assets/wordbook/    words.en.js · words.vi.js   spelling, part of speech and meaning of each key word
│   └── tests/              harness.js · node-evidence.js · fixtures/ · suites/   the suites of the shared code (16 suites)
├── player/                 the player
└── generator/              this app
    ├── index.html          the page: every <script> tag, in dependency order; the sg-player-url meta tag
    ├── tests.html          the same test suites, run in the browser
    ├── design.md · task.md the design specification (as built) and the task list with its completion summary
    ├── assets/
    │   ├── favicon.svg     the inline favicon
    │   └── wordlists/      isograms.en.js · isograms.vi.js   key words of Wordoku
    ├── css/
    │   ├── layout.css · components.css · steps.css · help.css · print.css
    │   └── (tokens, base and board styles come from ../core/css)
    ├── js/
    │   ├── engine/         the generation engine, no DOM
    │   │   ├── rng.js · difficulty.js · full-grid.js · symmetry.js · digger.js
    │   │   ├── events.js · explain-data.js · pipeline.js      the seven steps and their events
    │   │   └── replay.js       the analysis of the Generation Steps replay: moves, ratings, views (SG.replay)
    │   ├── variants/       registry.js · classic.js · mega.js · extra-regions.js · jigsaw.js · killer.js
    │   │                   · greater-than.js · multigrid.js · wordoku.js
    │   ├── worker/         gen.worker.js · worker-client.js
    │   └── ui/             i18n.js · locale.en.js · locale.vi.js · locale.shell.js · store.js · controls.js
    │                       · step-view.js · explain.js · player.js (replay of the generation)
    │                       · result-view.js · cache.js · history.js · export.js · a11y.js · theme.js
    │                       · help.js · app.js
    └── tests/
        ├── node-runner.js · soak.js · perf.js · qualify.js · replay-fixtures.js · replay-goldens.js
        │   · difficulty-recovery.js · mega-contract.js
        ├── fixtures/       the fixtures of the generator (rated puzzles, the performance helper with the hash
        │                   corpus and its merge, the regression hashes in regression.js, generated, the
        │                   testkit provider, the pure
        │                   helpers of the soak diagnostics, and the data of the replay suite:
        │                   replay-goldens.js, replay-wire.js, generated, with the helpers of their
        │                   recorders, tool-records.js and replay-recording.js, and the pure helpers of the
        │                   recovery profile driver, recovery-profile.js, of the mega Nightmare deep
        │                   tier, mega-contract.js, and the lazy per-level corpora of the heavy suites,
        │                   manual-corpus.js)
        ├── suites/         the quick set, run by default together with ../core/tests/suites: one *.test.js per
        │                   area, 34 of the generator's own (found automatically), smoke.test.js among them
        └── manual/         the 8 heavy suites (variants, killer, greater-than, perf, difficulty,
                            extra-regions, wordoku, jigsaw), run with --manual or --all
```

## The exchange format

What the **Play** button does for the user is described in
[Play in Sudoku Player](USERGUIDE.md#play-in-sudoku-player). In code, it opens
`../player/index.html#puzzle=<token>&active=<n>` (the player, next to the generator on the same site) in a new tab
(`window.open(url, '_blank', 'noopener')`). The player's address comes from
`<meta name="sg-player-url" content="../player/index.html">` in `index.html`, a path relative to the generator's
page: it names the page, not its folder, because a folder shows a file listing when the pages are opened from a disk.
Change it to point at another copy of the player.

The exchange format is the only coupling between the two apps, implemented by `core/js/ui/exchange.js`
(`SG.exchange`, the one file both load, with the suite `core/tests/suites/exchange.test.js`):

- A **bundle** (the Play button) is the text of `SG.exportUi.buildExportText`: per puzzle a header line
  `#<n>,<variant>,<level>,<seed>`, the grid and, for Jigsaw, Killer, Greater-Than and Wordoku, a few structure
  lines. The player rebuilds the boards from it, exactly as it does for text pasted into its Import box.
- Its **text token** is `t.` + base64url(deflate-raw(UTF-8 text)) — or `s.` + base64url(text) when compression is
  not available or does not pay. `SG.exchange.encodeText(text)` and `SG.exchange.decodeText(token)` are
  asynchronous; `SG.exchange.playerUrl(base, token, { active })` builds the link (`&active=<n>`, 1-based) and
  `SG.exchange.activeFromHash(hash)` reads it back.
- The **document** of a single puzzle (still understood by the player, and what its Share button writes) is the
  puzzle JSON of [design.md](generator/design.md) §14.1 (`format: 'sudoku-generator/v1'`), as
  `SG.exportUi.toJson` writes it, plus one additive block, **`model`**: the plain-data model specification
  (`variantId`, `digits`, `units`, `unitMeta`, `cages`, `inequalities`, `layout`, `symbols`, `fixedCells`) that
  `SG.model.create(spec)` accepts. With it the player rebuilds the board **without any variant code**. Its token
  is `z.` + base64url(deflate-raw(JSON)) — or `j.` + base64url(JSON); `SG.exchange.encode(doc)` and
  `SG.exchange.decode(token)` are asynchronous.
- `SG.exchange.playerUrl(base, token)` refuses a base that is not `http(s)` or a relative
  path. Failures carry the codes `exchange.invalidToken`, `exchange.tooLarge`, `exchange.unsupportedEncoding`,
  `exchange.invalidJson` and `exchange.invalidUrl`, translated in both languages (`error.exchange.*`).
- In code: `SG.exportUi.buildPlayBundle(results, { active })` is the link of several puzzles
  (`{ url, token, base, count, active, length, long }`), `SG.exportUi.toJson(result)` the document and
  `SG.exportUi.buildPlayLink(result)` the link of one puzzle, `SG.exportUi.openPlayLink(url)` opens it. Details:
  [design.md](generator/design.md) §10.9 and §13.15.

## Adding a variant

A variant is **data plus a `build` function** that registers itself; no other file needs to know about it. The
rules are in [design.md](generator/design.md) §5.3. Here is a complete, working example — *Disjoint Groups Sudoku*: the
classic rules plus nine extra groups, each made of the cells that sit at the same place in their box. It needs
no new solver code, because a group is just one more unit.

**1. Write `js/variants/disjoint.js`:**

```js
// js/variants/disjoint.js
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  const SIZE = 9;
  const BOX = 3;

  /** Row-major indices of the cells whose row and column pass `test`. */
  function cellsWhere(test) {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) if (test(r, c)) cells.push(r * SIZE + c);
    }
    return cells;
  }

  /** Classic units, then the nine "disjoint groups": same row and column inside the box. */
  function build() {
    const units = [];
    const unitMeta = [];
    function addUnit(kind, label, cells) {
      units.push(cells);
      unitMeta.push({ kind: kind, gridIndex: 0, label: label });
    }
    for (let k = 0; k < SIZE; k++) {
      addUnit('row', 'R' + (k + 1), cellsWhere(function (r) { return r === k; }));
    }
    for (let k = 0; k < SIZE; k++) {
      addUnit('col', 'C' + (k + 1), cellsWhere(function (r, c) { return c === k; }));
    }
    for (let k = 0; k < SIZE; k++) {
      addUnit('box', 'B' + (k + 1), cellsWhere(function (r, c) {
        return Math.floor(r / BOX) * BOX + Math.floor(c / BOX) === k;
      }));
    }
    for (let k = 0; k < SIZE; k++) {
      addUnit('region', 'G' + (k + 1), cellsWhere(function (r, c) {
        return (r % BOX) * BOX + (c % BOX) === k;
      }));
    }
    const n = SIZE * SIZE;
    const cellRow = new Int32Array(n);
    const cellCol = new Int32Array(n);
    const cellRegion = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      cellRow[i] = Math.floor(i / SIZE);
      cellCol[i] = i % SIZE;
      cellRegion[i] = Math.floor(cellRow[i] / BOX) * BOX + Math.floor(cellCol[i] / BOX);
    }
    return SG.model.create({
      variantId: 'disjoint9',
      digits: SIZE,
      units: units,
      unitMeta: unitMeta,
      layout: {
        rows: SIZE, cols: SIZE, cellRow: cellRow, cellCol: cellCol, cellRegion: cellRegion,
        subGrids: [{ gridIndex: 0, originRow: 0, originCol: 0 }]
      }
    });
  }

  SG.variants.register({
    id: 'disjoint9',
    i18nKey: 'variant.disjoint9',
    group: 'extraRegions',                  // 'group.<id>' must exist in the locale packs
    digits: SIZE,
    difficultySupport: ['veryEasy', 'easy', 'normal', 'hard'],
    defaultSymbolMode: 'digits',
    symbolModes: ['digits', 'letters', 'colors', 'shapes'],
    options: [],
    build: build
  });

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'variant.disjoint9': 'Disjoint Groups Sudoku',
      'variant.disjoint9.desc': 'Classic rules, and the cells at the same place in each box must also differ.'
    },
    vi: {
      'variant.disjoint9': 'Sudoku Nhóm rời',
      'variant.disjoint9.desc': 'Luật cổ điển, và các ô ở cùng vị trí trong mỗi khối cũng phải khác nhau.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
```

What the definition passed to `SG.variants.register(def)` can hold (`js/variants/registry.js` validates it, so
a typo fails when the file loads, not in the middle of a run):

| Field | Meaning |
|-------|---------|
| `id`, `i18nKey`, `group`, `digits` | Unique id; translation key of the name; family used to group variants in the UI (`group.<group>` key); number of values D (up to 16). |
| `difficultySupport` | Levels the variant offers, a subset of `veryEasy … hell2` (gaps are allowed): exactly the levels that pass the qualification of `node tests/qualify.js --variant=<id>` ([docs/difficulty-rating/qualification.md](docs/difficulty-rating/qualification.md)). |
| `defaultSymbolMode`, `symbolModes` | Symbol sets the UI may offer (`digits`, `letters`, `colors`, `shapes`, `word`). |
| `options` | Variant options for the UI (`slider`, `select`, `boolean`, `text`). Declare labels with `i18nKey` and help with `hintKey`; `SG.variants.optionsOf(id)` gives them in one normalised shape, and the controls are built from it. |
| `build(opts, rng)` | Returns the `PuzzleModel`; only for geometry and units. |
| `clueFloor`, `clueFloorScale` | Optional own minimum number of clues per level, in place of the classic9 numbers scaled by `cellCount / 81` (see "Clue floor per variant" in `js/engine/difficulty.js`). Use them when the generic floor makes a level unreachable. |
| `postGenerate(ctx)`, `digStrategy`, `fastSeed`, `restartThreshold` | Optional pipeline hooks: structure made from the finished solution (Killer cages, Greater-Than signs; models are immutable, so it returns a new model), an alternative digging strategy (registered with `SG.digger.registerStrategy` and named here), a pre-fill and a restart threshold of the full-grid search. |

**2. Load the file — add its path to all four script lists**, anywhere after `js/variants/registry.js` (next to
the other variants is natural): `index.html` (a `<script>` tag), `tests.html` (`SOURCE_FILES`),
`tests/node-runner.js` (`SOURCE_FILES`) and `js/worker/gen.worker.js` (`SCRIPTS`, with a path relative to
`js/worker/`). `ui-contract.test.js` checks that the four agree.

**3. Tests you get for free.** `tests/manual/variants.test.js` (a heavy suite: `node tests/node-runner.js
--suite=variants`) loops over `SG.variants.list()`, so the new variant is covered without editing any test: CV0 the definition, CV1 every model passes
`SG.model.validate`, CV2 full grids, CV3 a puzzle at every declared level (and the other levels are
refused), CV4 the invariants I1–I7 of [design.md](generator/design.md) §15.3 (one solution, givens ⊂ solution, …; I6 uses the
variant's own clue floor), CV5 the same seed gives the same puzzle, CV6 no generation hangs, CV7 the names,
option labels and level names exist in both languages. The quick set counts the variants too: add the id to
`EXPECTED_IDS` in `tests/suites/smoke.test.js`, which then generates a puzzle of the new variant at its easiest
level. Write an extra suite (`tests/suites/disjoint.test.js`, or `tests/manual/disjoint.test.js` when it is heavy,
and add its name to `SUITE_FILES`, or to `MANUAL_SUITE_FILES` for a heavy one, in `tests.html`;
`tests/suites/ui-contract.test.js` enforces it) only for logic of your own.

**4. Add its help entry.** The in-app Help must explain every variant. In `js/ui/help.js` add the id to
`VARIANT_HELP` (`{ figure: 'board' }` draws the empty board automatically) and add the three texts
`help.variant.disjoint9.rules`, `.special` and `.figure` to the fragment at the bottom of the file, in both
languages. `tests/suites/help.test.js` fails until you do, and also fails when the user guide does not list the
new id: add a row to the variant tables of [USERGUIDE.md](USERGUIDE.md#generator-features) and
[USERGUIDE.vn.md](USERGUIDE.vn.md#tính-năng-của-trình-sinh-đề).

**5. Qualify its levels.** `node tests/qualify.js --variant=disjoint9` generates 40 puzzles per level with fixed
seeds and offers a level when at least 36 hit it exactly within the time budget (30–35 hits: 60 more seeds, at
least 90 of the 100); put the levels it prints into `difficultySupport` and its table into
[docs/difficulty-rating/qualification.md](docs/difficulty-rating/qualification.md). `node tests/soak.js --variant=disjoint9` then shows
how often each requested level is hit, the invariant violations and the time per puzzle. A level that misses
can be helped by a `clueFloorScale`; otherwise it stays hidden. The manual suite `difficulty` (`node tests/node-runner.js
--suite=difficulty`) checks that the lists in the definitions and in that file agree.

## Adding a technique

A solving technique is one function that finds *one deduction* in the current candidates. It lives in its
own `tech-*.js` file and registers itself, so the solver and the digger never change. The full contract is the
header of `../core/js/engine/techniques.js`. A complete example — *Full House*, a unit with a single open cell:

```js
// ../core/js/engine/tech-fullhouse.js
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};

  /** Full House: in a complete unit with exactly one open cell, that cell takes the missing digit. */
  function findFullHouse(model, state, ctx) {
    for (let u = 0; u < model.units.length; u++) {
      if (ctx.completeUnits[u] !== 1) continue;           // a digit must appear exactly once in it
      const cells = model.units[u];
      let open = -1;
      let openCount = 0;
      let used = 0;
      for (let i = 0; i < cells.length; i++) {
        const value = state.value[cells[i]];
        if (value === 0) {
          open = cells[i];
          openCount++;
        } else {
          used |= 1 << (value - 1);
        }
      }
      if (openCount !== 1) continue;
      const missing = ctx.fullMask & ~used;               // one bit: the digit the unit still lacks
      if ((missing & (missing - 1)) !== 0 || (state.candidates[open] & missing) === 0) continue;
      const digit = 32 - Math.clz32(missing);
      return {
        technique: 'fullHouse',                           // must equal the registered id
        cells: [open],
        placements: [[open, digit]],
        eliminations: [],
        i18nKey: 'technique.fullHouse.step',
        i18nArgs: { cell: SG.model.cellLabel(model, open), unit: model.unitMeta[u].label, digit: digit }
      };
    }
    return null;                                          // does not apply
  }

  SG.techniques.register({
    id: 'fullHouse',
    group: 'basic',               // one of SG.techniques.GROUPS: the family the Help lists it under
    baseCost: 1,                  // the solver's own raw score; the rating uses SG.difficulty.WEIGHTS
    order: 5,                     // loop position in the fixed priority order, lower first (nakedSingle is 10)
    i18nKey: 'technique.fullHouse',
    variantScope: null,           // null = every variant; ['killer'] = only models of that variant
    assumesUniqueness: false,     // true ONLY when the deduction needs "the puzzle has one solution"
    find: findFullHouse
  });

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push({
    en: {
      'technique.fullHouse': 'Full House',
      'technique.fullHouse.desc': 'When a row, column or box has one empty cell left, it holds the missing digit.',
      'technique.fullHouse.step': '{unit} has only one empty cell left, {cell}. It must hold {digit}.'
    },
    vi: {
      'technique.fullHouse': 'Full House',
      'technique.fullHouse.desc': 'Khi một hàng, cột hoặc khối chỉ còn một ô trống, ô đó chứa chữ số còn thiếu.',
      'technique.fullHouse.step': '{unit} chỉ còn một ô trống là {cell}. Ô này phải là {digit}.'
    }
  });
})(typeof self !== 'undefined' ? self : globalThis);
```

1. **Rules of `find`**: read `state`, never write to it (the solver applies the finding, which keeps the
   scoring honest); return `null` when nothing applies, otherwise exactly one deduction that really changes
   the state; no randomness; work on any unit shape through `model.units` (never assume rows and boxes); call
   `ctx.check()` in long loops.
2. **Load it** by adding the file next to the other `tech-*.js` files in the four script lists of
   [How it works](#how-it-works) — and in the script lists of the player (`index.html`, `help.html`, `tests.html`,
   `tests/node-runner.js`), because a technique lives in the shared engine (`core/js/engine/`) and the player's hints use it too.
3. **Strings**: `technique.<id>` (name), `technique.<id>.desc` and `technique.<id>.step` in both languages;
   `tests/suites/i18n.test.js` checks that every registered technique and every step text has them. The Help
   dialog's technique ladder lists the new technique by itself.
4. **Weight and level**: add the technique's weight to `WEIGHTS` in `js/engine/difficulty.js`
   (`SG.difficulty.WEIGHTS`; a rating that meets a technique without a weight fails with
   `difficulty.unknownTechnique` — a weight is never guessed from `baseCost`). The score of a puzzle is
   `round(80·E/(E+40) + P + 0.25·P·log₂(1 + W/P))`, where `E` is the number of empty cells, `P` the largest weight
   used and `W` the sum of weight × uses, and the weight alone decides where the technique is allowed: the oracle
   of a level allows every technique whose 1.25 × weight is below the level's band maximum, so a weight of 400
   makes it available from *hard* on (500 is below hard's maximum, 700, not below normal's, 400). The `group`
   only names its family (`cage` and `ineq` belong to Killer and Greater-Than). The same rule gives each level a
   **floor** (the techniques of the previous global level, even when a variant does not offer that level) and a
   **tier** (what the level allows beyond its floor): `SG.difficulty.floorTechniques(level, model)`,
   `SG.difficulty.tierTechniques(level, model)` and the same two fields of `spec`. A new technique joins the tier
   of the level its weight puts it in, and `tests/suites/difficulty-floor.test.js` derives these sets from the
   registry and the weights. To check that a puzzle really needs the tier of its level,
   `SG.difficulty.certifyFloor(model, givens, level, budget)` solves with the floor techniques alone: it trusts the
   caller that the givens have exactly one solution for this model (it counts none), has no limit but the `budget`
   passed in, answers `{ required, vacuous, floorLevel, unsolvedCount }` (vacuous, without a solve, for `veryEasy`
   and for a level with an empty tier) and throws on a contradiction, on invalid input and on a failed budget
   instead of answering. `SG.difficulty.requiredOf(rating, level, model)` gives the same verdict from the technique
   counts of a complete canonical rating (`SG.difficulty.rate`), without a second solve; the caller guarantees the
   uniqueness and that the rating was made for the same model and givens, and the answer is only right while the
   `order` of the registry follows the weights, so give the new technique an `order` that keeps the weights
   nondecreasing along the registry (`tests/suites/technique-weights.test.js` fails otherwise). Then re-run the
   qualification, `node tests/qualify.js`, and check the hit rates with `node tests/soak.js --quick`.
5. **Tests**: add an entry for the technique to `../core/tests/fixtures/techniques.js` (two positions where it
   fires, one where it finds nothing; `../core/tests/suites/techniques.test.js` fails until it has them; put the
   entry into `CURRENT`, since `historyV2` keeps the positions of rating v2 as they were, and list a new classic
   technique in `registryOrder`, the current order that the registry test compares with the real registry) and more
   positive and negative fixtures to the matching `../core/tests/suites/tech-<group>.test.js` (helpers in
   `../core/tests/fixtures/techniques-helper.js`). The soundness check — a technique must never eliminate a value
   that belongs to the true solution — needs no code of yours: `techniques.test.js` runs it for every registered
   technique.
6. **A real help example**: the guide of the player (`player/help.html`) shows one real example for every
   technique, and `player/tests/suites/help.test.js` fails until the catalogue has exactly the registered techniques.
   Record real puzzle sources for the new technique and write the catalogue with the bounded help-example tool of the
   player, never by hand and never with a synthetic example: see [the help examples](#help-examples).

## Running the tests

Everything runs in Node 18+ with no installation (no npm packages are used):

```bash
node tests/node-runner.js                          # the quick set (50 suites, 3,262 tests), whole or in disjoint shards
node tests/node-runner.js --manual                 # only the heavy suites of tests/manual (8 suites)
node tests/node-runner.js --all                    # quick + manual (58 suites)
node tests/node-runner.js --suite=killer,variants  # only these suites, quick or manual (file name without .test.js)
node tests/node-runner.js --filter=xWing --verbose # only tests whose name contains the text
node tests/node-runner.js --suite=help --exact="<full name>"   # only the tests of exactly this full name
node tests/node-runner.js --suite=help --list-tests=<file.json> # the inventory of the selection; no test runs
node tests/node-runner.js --suite=help --results=<file.json>    # run, and write the result of every test
node tests/node-runner.js --bail                   # stop at the first failure
```

**Two sets of suites, so that development stays fast.** The **quick set** is what runs by default: 50 suites,
3,262 tests — the 34 suites of `tests/suites/` and the 16 of `../core/tests/suites/` that the
player runs too (the engine, the technique ladder, the exchange format, the board view, the harness itself). It includes `smoke.test.js`, which generates one puzzle
per variant and checks its uniqueness, level and determinism and a sample of the regression hashes.
`tests/manual/` holds the 8 **heavy** suites — `variants`, `killer`, `greater-than`, `perf`, `difficulty`,
`extra-regions`, `wordoku` and `jigsaw` — which are not part of the default run:
run them with `--manual` (only these) or `--all` (quick and manual), or by name with
`--suite=killer`, which works for any suite. While developing, run the quick set, and a heavy suite by name when you
touch its area; run `--all` before a release and whenever you touch generation, scoring or a variant. CI does not run
`--all`: it runs the quick tier only (see "Continuous integration" below).

**Bounded coverage of the quick set.** A complete quick set can take longer than one bounded command may: an evidence
command is stopped at 540 seconds. Where a whole command cannot fit, cover the set by **disjoint shards**:
`node tests/node-runner.js --suite=<names> --results=<file.json>`, and for one long suite a describe or full-name
selector (`--filter` or `--exact`), checking each selection with `--list-tests` first, so that every test of the
registration-only inventory runs exactly once. No shard uses `--bail`, omits a slow test or adds a skip, and a shard
made stale by a changed source is run again. The cost of a complete quick set is the sum of its shards; the
540-second limit applies to each command and is not that cost. What each app's complete quick set measured, on a named
source and machine (a report, not a promise), is in
[docs/difficulty-v3/recovery-quick-cost.md](docs/difficulty-v3/recovery-quick-cost.md).

**Continuous integration.** The pull-request workflow (`.github/workflows/pull-request.yml`) and the deployment
workflow (`.github/workflows/pages.yml`) run the complete quick tier of each app, nothing heavier: the player's quick
set in one job (`node tests/node-runner.js`, shared suites included) and the generator's in parallel jobs, one per
group of `.github/scripts/generator-quick.json`. A group is a list of whole-suite shards (the disjoint shards of the
bounded coverage above), the workflows take their job matrix from that file, and every job runs a group through
`.github/scripts/generator-suites.sh run <group>`, shard by shard, failing if any shard fails. A first job runs
`generator-suites.sh check`, which registers the quick sets with `--list-tests` (no test runs) and fails unless every
quick suite and every test is in exactly one shard, no shard names a manual or an unknown suite or selects nothing,
every suite of `tests/manual/` is declared as out of CI, and every job's projected time (the bounds of its shards
times the CI factor of the file, plus the job overhead) fits its 30-minute limit. A suite added later therefore fails
the check until its author gives it a shard with a measured bound; it is never picked up silently, and never from
`tests/manual/`. `selftest` runs the check on synthetic plans (a gap, a duplicate, an unknown or a manual suite, an
empty shard, a registration error) and `run <group> --dry-run` prints the commands without running a test. The time
factor (3 on CI, from the variable `CI`) and the job limits are not raised: split a group instead. CI does not run the
manual suites, `--all`, the deep tier (`tests/mega-contract.js`), `soak.js`, `perf.js` or `qualify.js`; what replaces
them is offline evidence, kept in `docs/difficulty-v3/evidence/` by the tasks that own it (the 14 deep mega Nightmare
requests and their relations by the records of MS05r5m reconciled by MS05r6b, the live CV3 outcomes by MS05b3, the
manual corpora, GD, E, qualification and performance by MS05r6a, MS05r6b and the later gate tasks), and listed in
[docs/difficulty-v3/evidence/MS05r6c/evidence.md](docs/difficulty-v3/evidence/MS05r6c/evidence.md). The browser scripts of
the player stay in the pull-request workflow.

The runner loads `SOURCE_FILES` with `vm.runInThisContext`, discovers `../core/tests/fixtures/*.js`,
`tests/fixtures/*.js`, `../core/tests/suites/*.test.js` and `tests/suites/*.test.js` (and `tests/manual/*.test.js` with
`--manual` or `--all`) by itself, and exits with a code other than 0 on any failure. The shared suites build the
boards of every variant through `SG.testkit` (`../core/tests/fixtures/testkit.js`), and `tests/fixtures/testkit-provider.js`
tells it to take them from the variant registry. The suites cover the
engine, every variant, the solving techniques, the pipeline and its events, the worker and its client, and the
pure parts of every UI module (they run without a DOM). `tests/suites/help.test.js` also checks the guides
against the code: the variants table and the URL parameters of the user guide; the script names, commands and
flags, the `SG.…` names and the two worked examples of this guide; and the links of all four guides. At the tip
of this repository the runner counts 58 suites, 50 of them quick (3,262 tests), all green; the counts of the combined project at its final review (before the split) are in
[docs/qa/final-review-v1.md](docs/qa/final-review-v1.md).

**Exact selection, inventory and results.** `--filter` keeps its meaning (a case-insensitive part of the full name,
"suite > describe > test"). `--exact="<full name>"` selects the tests whose full name is exactly that, case-sensitive
and every test of that name, and excludes `--filter`. `--list-tests=<file.json>` registers the selected suites as
a run does (so their set-up at load time still happens) and writes the **inventory** instead of running anything: for
every selected test its suite, its zero-based `ordinal` within its file counted before any filter (it tells equal
names apart and does not move when the selection changes), the full name, whether it is a test or a benchmark, whether
it is skipped (a `describe.skip` included; a skip decided while running cannot be known) and its time limit, plus a
`sourceHash` over every file the quick tests load, read or spawn (listed in the file), the selection, the registration
time and any describe block that threw or file that failed to load (`complete` is then false). `--results=<file.json>`
runs as usual, keeps the exit code, and also writes the result of every selected test with the same `ordinal`; its
`complete` is true only when every selected test ran, without `--bail` and with unchanged sources. A listed or
written test is not a passed one: read the rows. Both options take a new project-relative `.json` path inside the
repository (never overwritten, never inside the fingerprinted sources, for example the evidence folder of a task),
and exclude each other. The code is `core/tests/node-evidence.js` (Node only, no application knows it) and
`SG.test.list(options)` of the harness, which walks the registry exactly as `SG.test.run` does and executes nothing.

**Heavy suites, one level at a time.** The corpus of `killer`, `jigsaw`, `greater-than`, `extra-regions` and `wordoku`
and the corpus of the `variants` sweep are built level by level, on the first read of a level
(`SG.test.lazyCorpus`, `tests/fixtures/manual-corpus.js`): a test that reads one level generates only that level, with
the seeds, counts and options of the whole corpus, while the tests that need every level (`corpus()`, `allPuzzles()`,
the aggregate checks of the sweep) still build all of them. The filter is a plain substring of the lower-cased full
name, so a selector starts at a describe boundary with `> `, and goes in quotes: `easy: 20 puzzles > I5:` also matches
Very Easy, `> easy: 20 puzzles > I5:` does not. The selectors:
`> <level>: <count> puzzles > I5:` (and `… > CV6:`) for `killer`, `jigsaw`, `greater-than` and `wordoku` (`killer` has
only the I5 one per level), `> <variant> <level>: <count> puzzles > I5:` for `extra-regions`, and
`> variants: <id> > CV3 <level>:` and `> variants: <id> > CV3 unsupported:` for the sweep. Each selects one test, which
the `manual-corpus` suite checks against the real registrations; read the selected total of the summary, and list the
selection first (`--list-tests`) when the generation is long. A whole-variant filter such as `--filter=I5:` is not a
bounded command. With the environment variable `SG_CORPUS_TIMES=1` a level that has just been built prints the
milliseconds of each of its requests before the result of the test.

```text
node tests/node-runner.js --suite=killer --filter="> normal: 20 puzzles > I5:" --list-tests=<file.json>
node tests/node-runner.js --suite=killer --filter="> normal: 20 puzzles > I5:" --verbose --results=<file.json>
node tests/node-runner.js --suite=extra-regions --filter="> diagonalX normal: 20 puzzles > I5:" --verbose
node tests/node-runner.js --suite=variants --filter="> variants: classic9 > CV3 normal:" --verbose
node tests/node-runner.js --suite=variants --filter="> variants: classic9 > CV3 unsupported:" --verbose
```

The two Node scripts that keep the data of the `replay` suite:

```text
node tests/replay-fixtures.js            # regenerates tests/fixtures/replay-wire.js (five slow goldens, 20 s or more each)
node tests/replay-fixtures.js --check    # regenerates in memory and compares; exit 1 on a difference
node tests/replay-goldens.js             # checks the golden data of the 14 requests (the same as --check; it never writes unasked)
node tests/replay-goldens.js --write     # regenerates tests/fixtures/replay-goldens.js from fresh analyses (all 14 requests)
node tests/replay-goldens.js --ids=G01 --record=<file.json>   # one bounded shard into a ledger, no fixture touched
node tests/replay-goldens.js --merge=<directory> --check      # the complete set of ledgers, nothing is generated
```

The `replay` suite tests the analysis (the moves, the ratings and their statuses, the views, the explained jumps)
against the golden numbers of 14 requests (`tests/fixtures/replay-goldens.js`). It generates the fast ones live
and reads the five slow ones (G09 to G13) from the saved results (`tests/fixtures/replay-wire.js`), because
generating each takes 20 seconds or more (G13, the Samurai Nightmare of seed 42, is saved too so that three suites
do not generate it again; its request and the 120,000 ms budget of the recorder are unchanged, and it uses the default
attempts of its board, 2); regenerate them only when the generator's output changes on purpose (the regression
hashes change then too). Both recorders have the same bounded modes, so that a change of output can refresh all of
this evidence safely: `--check` compares without writing and names the request and the fields that differ (it
checks the selected requests only, and says so); `--write` writes the complete fixture and refuses a partial
`--ids` selection; `--ids=G01,G02` selects part of the manifest (an unknown or duplicate ID is an error);
`--record=<file.json>` generates the selected requests into a **ledger** and never touches a fixture;
`--merge=<directory>` reads the ledgers of a directory, requires every request of the manifest exactly once, from
the current sources, and then checks (the default) or writes without generating; `--out=<file.js>` writes an
alternate file instead of the fixture; `--list` shows the manifest and the identity of the sources; options that
conflict are refused before anything is generated. Neither takes `--jobs`: a request takes from about a second to
about two minutes, and a command that reaches ten minutes is a problem to investigate, so record the requests one
command at a time. A ledger is `{ schema: 1, kind, sourceHash, manifestHash, node, commit, dirty, records: [{ key,
request, value }] }`, with the run information (`generatedAt`, `argv`, `ms`, `overrides`) beside the values, never
in them; its `sourceHash` covers the engine sources and the code of the recorders, its `manifestHash` the list of
requests, and a merge refuses a missing, duplicate, unknown, malformed or differently sourced record, so a partial or
stale set never replaces a fixture. The helpers are `SG.fixtures.toolRecords` (ledgers, merge, differences, the level
guard) and `SG.fixtures.replayRecording` (the projection of an analysis to a golden record and the canonical text
of `replay-goldens.js`; the `replay-recorders` suite tests them). Every field of the golden data is projected from
the analysis of a freshly generated result except `today`, a historical annotation of the researchers that is
kept as it is, and the timings and the work counts `checks` are not part of it. A request whose level the
variant no longer offers is generated with that level offered for the request only (recorded in the ledger); no
offer ever changes. `tests/suites/steps.test.js` pins a few step scores by hand: review them with the goldens.

The suites check the generation time of every variant against the budgets of [design.md](generator/design.md) §9.1 with
a tolerance, so that a busy or slower machine does not fail them: twice the budget by default, three times when
the environment variable `CI` is set (as on GitHub Actions), or the factor in `SG_TIME_FACTOR`
(`SG_TIME_FACTOR=1` checks the budgets themselves). The budgets as such are enforced by `node tests/qualify.js`
on the reference machine and measured by `node tests/perf.js`.

- **In the browser:** open `tests.html` (it works from `file://`). It loads the quick suites; `?all=1` also
  loads the manual ones, `?manual=1` runs only the manual ones and `?suite=<name>` works for both. Other query
  parameters: `filter`, `bail=1` and `autorun=0`, e.g. `?suite=killer&filter=text&bail=1&autorun=0`.
- **Soak and calibration** — generates hundreds of puzzles across variants and levels, checks the invariants
  I1–I7 and prints a confusion matrix of requested against achieved level, the time per puzzle against its
  budget and a score histogram: `node tests/soak.js --quick` (about 700 puzzles), `node tests/soak.js --full`
  (the final QA preset: 25 puzzles per offered combination and 100 per classic9 level, about 3,550 puzzles),
  `node tests/soak.js --variant=jigsaw9 --count=180`, `node tests/soak.js --level=hard`
  (`--help` lists the rest); `--weights` and `--bands` try other technique weights or score bands without
  editing the code. A hit is the generator's own `exact` flag, strictly true (`p.exact` where the soak calls the
  digger, `r.exact` where it runs the pipeline), so an in-band puzzle that does not need the tier of its level is
  not a hit. Before it generates anything, and also with `--no-gate`, the soak checks that the patched tables keep,
  for every variant and level, the floor and the floor with the tier as ordered prefixes of the technique ladder
  (the requiredness of a rating depends on it); otherwise it prints the variant, the level and both technique
  lists and exits with code 2. `--weights={"nishio":1}` is such a case (pass the argument as one string, so that
  the shell keeps the quotes); malformed JSON is a separate usage error. `--json=<file>` (a path inside the
  repository) adds the baseline diagnostics of difficulty v3 without changing which puzzles are generated: a ledger
  of every request (schema 1: the puzzle or its error, the hits, the raw and the attainable position of the score,
  the generation counters) and a diagnostic summary after
  the text. Its new solves — the reference floor `SG.difficulty.certifyFloor` of the requested level, run only
  after I1 proved uniqueness, and the final path rated again with steps (forcing-chain lengths, Nishio depths) —
  run only after every generation and every I1–I7 check of the invocation has finished, because the subset finder
  keeps a check-spacing counter across solves. A failed request stays in the denominators as an error row, and
  errors and invariant violations fail the diagnostics even with `--no-gate`. The helpers are
  `SG.fixtures.difficultyDiagnostics` (`tests/fixtures/difficulty-diagnostics.js`); the baseline taken with
  them is recorded in [docs/difficulty-v3/baseline.md](docs/difficulty-v3/baseline.md). Since the recovery task
  MS05r3 the rows take `required`, `qualifiedHit` and `shallow` from the certificate derived from the returned
  rating (`generationExact` is the strict producer flag and the two must agree: a disagreement is an I5 violation),
  the independent reference runs only for the first and the last request of a cell (the other rows say
  `not-selected`, which changes no verdict), and every row carries the work of its generation (`fullRatings`,
  `proposals`, `shallowRatings`, `capHits`, `work`, `workCheck`): a rating made outside the counted entry point fails
  the run, and missing work is `unavailable`, never zero. `--shallow-cap=64|128|256|none` runs the soak with that
  shallow-search allowance (`SG.digger.SHALLOW_SEARCH_RATINGS`; `none` is `Infinity`; the default of the source is 256,
  selected by the R5 comparison of task MS05r4, see
  [docs/difficulty-v3/shallow-cap-2026-11-13.md](docs/difficulty-v3/shallow-cap-2026-11-13.md)), and
  `--from=<k> --count=<n> --total-count=<N>` runs the requests k to k+n−1 of one logical cell of N
  requests (one variant and level; not with `--quick`, `--full` or `--per-combo`) with the tags and seeds of the whole
  cell, so a long cell can be split into bounded commands; `mergeShards` of the helper refuses ledgers with a gap, a
  duplicate or a different source, tool, seed or setting.
- **Recovery profile (difficulty v3)** — a diagnostic of one fixed request, not a production setting and not a passing
  performance gate: `node tests/difficulty-recovery.js` generates it once and records where the time went, in the
  ordinary dig samples or in the local continuation that follows them (the part a shallow-search allowance can
  limit). The three cases are the actual G13 golden request (`SG.fixtures.replayGoldens`, through
  `SG.store.toConfig`) and the seed 3 Nightmare requests of mega12 and mega16; the profile changes only
  `maxAttempts` (to 1) and keeps every cap, floor and guard. Run one command at a time, through the shared timing
  lock when others use the machine, since one profile can take minutes:

  ```text
  node tests/difficulty-recovery.js --mode=profile --case=G13 --json=<file.json>
  node tests/difficulty-recovery.js --mode=profile --case=mega12-nightmare --json=<file.json>
  node tests/difficulty-recovery.js --mode=profile --case=mega16-nightmare --json=<file.json>
  ```

  `--json` is a new `.json` path inside the repository (an existing file is never overwritten).
  `--mode=diagnostic --shallow-cap=64|128|256|none` keeps the default attempts of the board (2, 4 and 2 for the three
  cases) and applies an allowance: the command
  sets `SG.digger.SHALLOW_SEARCH_RATINGS` for the run (`none` is `Infinity`) and puts the previous value back; a source
  without the setting is refused before anything is generated.
  One process runs one case, and the engine and the checks of the returned puzzle (givens against the solution, an
  independent uniqueness count, the complete canonical rating and its requiredness) share one 500,000 ms budget.
  The record says which of `ok`, `generation-error`, `validation-error` and `instrumentation-error` happened, the
  work of every attempt, and the time and the full ratings of every stage, split into ordinary samples, local
  continuation and the rest. Exit code 0 means a record was written (read its `outcome`: a failed generation is a
  record too), 1 that no trustworthy complete record could be made, 2 an invalid use. The helpers are
  `SG.fixtures.recoveryProfile` (`tests/fixtures/recovery-profile.js`), tested by the `recovery-profile` suite; the
  first profiles are reported in [docs/difficulty-v3/recovery-profile.md](docs/difficulty-v3/recovery-profile.md).
- **Mega Nightmare deep tier (difficulty v3)** — a full-attempt Nightmare request of mega12 (4 attempts by default) or
  mega16 (2) costs from seconds to minutes and ends in a truthful shallow fallback more often than not, so it is not a
  quick test, and the quick `mega` suite does not ask for one. It keeps a real one-attempt mega12 request (seed 3, all
  the invariants and the requiredness and warning checks below, inside a bounded smoke limit of 15 s before the time
  factor, measured at 5.2 s, against the unchanged 60,000 ms request budget) and a scripted mega16 control of the
  size-default stop, the two-warning shallow fallback, an explicit number of attempts and a propagated cancellation or
  budget error. The fourteen requests of the old tests (per board the seeds 1 to 4 and the three independent CV5 calls
  with the seeds 3, 3 and 4) belong to a tool, never to a discovered suite, to CI or to `SG_DEEP`. Run one command at
  a time, through the shared timing lock when others use the machine, since one request can take minutes:

  ```text
  node tests/mega-contract.js --list                                              # the 14 requests and their relations
  node tests/mega-contract.js --request=mega12-invariant-1 --record=<id.json>     # one request, once, and its checks
  node tests/mega-contract.js --reconcile=<records directory> --json=<file.json>  # no generation
  ```

  The ids are `<board>-invariant-<seed>`, `<board>-cv5-a`, `<board>-cv5-b` and `<board>-cv5-other`; the two seed-3
  CV5 calls are two generations, not two reads of one record. A request is Nightmare with trace off and no
  `maxAttempts`, and it and its checks share one 500,000 ms budget, below the 540-second limit of a bounded command.
  `--record` is a new project-relative `<id>.json` (an existing file, an absolute or outside path, an option given
  twice or a conflicting one are refused). The record holds the request, the normalised configuration, the effective
  attempts, the allowance, the source and tool identities, the generation and the check time apart, the outcome (an
  error such as `budget.exceeded` keeps its code and no puzzle is invented), each check as `true`, `false` or `null`
  (not evaluated), and the digest and the plain wire of the puzzle. The checks are the invariants of the old test (a
  valid solution, one solution, the givens inside the solution, the clue floor, the band and group of the rating,
  every logical placement and elimination against the solution) and the requiredness contract: `exact` is true
  exactly when an independent complete canonical rating lies in the requested level and needs a technique of its
  tier, `difficulty.approximate` is present exactly when the puzzle is not exact and `difficulty.shallow` exactly when
  it is not exact and the rating lies in the requested level. A fallback can be valid, but it is never exact and never
  waives a check. A level that qualification has hidden is offered for the run only, and recorded.
  `--reconcile` generates nothing: each of the 14 occurrences must be there exactly once, with one source,
  tool, Node and configuration identity, a wire and digests that agree with the record, and flags derived again from
  its rating; the relations of the old test (the two seed-3 calls: same givens, solution and score; seed 4 against
  seed 3: a different solution) are evaluated, or left `unevaluated` when a request ended in an error. The document
  keeps the generation, correctness and timing verdicts apart and reports, for each board, a guard computed from the
  completed fixed population only (1.5 times the largest generation and check time, in steps of 5 s, never above the
  budget) with its margin. Exit code of `--request`: 0 every check passed, 3 an error or checks that could not finish
  (an availability outcome), 1 a failed check, 2 an invalid use; of `--reconcile`: 0 all fourteen reconcile and pass, 3
  sound but incomplete, 1 an evidence problem or a failed check or relation. The helpers are
  `SG.fixtures.megaContract` (`tests/fixtures/mega-contract.js`), tested on synthetic records by the `mega-contract`
  suite. The CV3 corpora of the manual suites do not read these records (a suite loaded by the runner cannot compute the
  hashes that `SG.fixtures.megaContract.reuse(records, { variantId, level, seed }, { sourceHash, toolHash }, { sha256 })`
  compares): the two mega Nightmare cells of CV3 run live, one level per command (see "Heavy suites, one level at a
  time"). The interface stays, as a read-only consumer of an invariant request (or `reuse(directory, query)` of the
  tool): the record must match the engine sources, the tool, the normalised configuration, the default attempts and the
  allowance now and its digests must hold; the caller applies its own checks to the decoded copy.
- **Qualification of the levels** — `node tests/qualify.js` runs the protocol that decides which levels each
  variant offers (40 fixed seeds per variant and level through the real pipeline, 60 more for a borderline level,
  a time budget on the 95th percentile) and prints the table and the support lists; `--variant`, `--level`,
  `--jobs`, `--json` and `--markdown` narrow it down or save it; `--probe=N` takes a quick look (N seeds per level,
  no verdict). A request is a hit only with a valid, unique puzzle, a complete proof in the requested level, no
  approximate warning **and** a strictly true `exact` flag of the result, so an in-band shallow result is a miss.
  A request never names `maxAttempts`: each board takes the default of its size (8, 4 or 2), so a large board that
  meets no exact puzzle in those attempts ends in the fallback, which is a miss.
  The last run is in
  [docs/difficulty-rating/qualification.md](docs/difficulty-rating/qualification.md).
- **Performance** against the budgets of [design.md](generator/design.md) §9.1: `node tests/perf.js --quick`,
  `node tests/perf.js --variant=classic9 --runs=20`. The *regression hashes* in `tests/fixtures/regression.js`
  guard against an optimisation changing a puzzle (the quick `smoke` suite checks a sample of them, the manual
  `perf` suite all of them): `--check-hashes` compares, and `--update-hashes` records new
  ones after a change that is meant to alter puzzles (a calibration, a new digging rule). `--alloc` probes the
  hot loops for allocation. Both hash modes process all 520 records (26 combinations × 20 seeds), and `--variant`
  and `--level` do not shard them; for a bounded refresh the hash modes have their own selectors. Record one
  combination and at most five seed indexes per command, one command at a time:

  ```text
  node tests/perf.js --hash-list --hash-key=classic9/hard                       # the keys and seeds, nothing is generated
  node tests/perf.js --check-hashes --hash-key=classic9/hard --hash-from=0 --hash-count=5   # a partial check
  node tests/perf.js --hash-key=classic9/hard --hash-from=0 --hash-count=5 --hash-record=<file.json>   # one shard
  node tests/perf.js --hash-merge=<directory> --check-hashes     # all 520 records of the ledgers, nothing generated
  node tests/perf.js --hash-merge=<directory> --update-hashes    # write the complete fixture from them
  ```

  `--hash-key` is one exact key of `SG.fixtures.perfTools.COMBOS`, `--hash-from` a zero-based index in the 20 seeds
  (0–19, default 0) and `--hash-count` the number of consecutive seed indexes. A check with a selector says how many
  of the 520 it checked and is no pass of the complete corpus; `--hash-record` writes only a **ledger**, never a
  fixture; `--hash-merge` requires every one of the 520 records exactly once, from the current sources, and then
  checks (the default) or, with `--update-hashes`, writes `regression.js` in CRLF (`--hash-out=<file.js>` writes
  another file instead). A canonical update needs the complete corpus (all records generated or a complete merge):
  a partial selection, conflicting options and a range outside 0–19 are refused before anything is generated, and
  a missing, duplicate, malformed or differently sourced record refuses the merge; in every case nothing is written
  and the fixture stays as it was. A ledger is
  `{ schema: 1, kind: 'regression-hashes', sourceHash, manifestHash, node, commit, dirty, records: [{ key:
  'variant/level#seed', variant, level, seed, hash, ms, overrides }] }`; its `sourceHash` covers the engine files
  the script loads plus `perf-helper.js`, `tool-records.js` and `perf.js` (so any edit of them makes the ledgers
  stale), its `manifestHash` the combinations and the seeds, never the expected hashes. A combination whose level
  the qualification has hidden stays in the corpus: the helper offers that level to that one generation (recorded
  in `overrides`) and puts the exact original support array back; it never changes what a player is offered. The
  pure helpers are in `SG.fixtures.perfTools` and `SG.fixtures.toolRecords`, and the `perf-tooling` suite tests
  them.
- **Deep statistical runs** in the mega, multigrid and variants suites are off by default; enable them with the
  environment variable `SG_DEEP=1` (`SG_DEEP=1 node tests/node-runner.js --suite=mega,multigrid,variants`; in
  PowerShell `$env:SG_DEEP = 1`).
- **Final QA report:** [docs/qa/final-review-v1.md](docs/qa/final-review-v1.md).

## Conventions

The full list is in [design.md](generator/design.md) §12.2:

- One IIFE per file, attached to the `SG` namespace; `'use strict'`; no `import`, `export` or `require` in
  `js/`.
- ES2020 without modules, 2-space indent, single quotes, semicolons, lines of at most 110 characters, English
  comments only where the code is hard to follow: logic that is not obvious and the contracts of a module (its
  header), not a JSDoc block on every function.
- `camelCase` for variables and functions, `PascalCase` for types, `UPPER_SNAKE` for constants, `kebab-case.js`
  for files.
- The engines (`../core/js/engine/`, `js/engine/`) and `js/variants/` never touch the DOM; DOM, `window` and `localStorage`
  are used only in `js/ui/`, `../core/js/ui/` and `js/worker/worker-client.js`. A test checks it.
- Every displayed string goes through `SG.i18n.t()` and exists in English and Vietnamese; `<html lang>`
  follows the language.
- No colour literal outside `../core/css/tokens.css` and `../core/css/tokens-board.css`; everything else uses
  `var(--sg-…)` tokens. A test checks it.
- Core errors are `SG.errors.GenerationError` with a `code` that has a translation.
- Every function that can run for more than 50 ms takes a `budget` and calls `budget.check()`.
- No new file without adding it to the four script lists; no weakened test to make a build pass.

## Known technical limitations

The limitations a user notices are listed in the user guide ([Known limitations](USERGUIDE.md#known-limitations));
these are the technical details behind some of them.

- **`file://` mode** is less smooth: the generator runs on the main thread in slices of about 12 ms, so the
  page stays responsive and **Cancel** works at the next slice, but one piece of work cannot be split — in
  Killer a single search slice takes 70–86 ms, a Greater-Than sign dig 50–70 ms, the cage layout of a hard
  Killer up to about 300 ms — and the page may pause for that long. Background pre-generation is off there
  too. The score tables of the replay are computed on the page there as well, and only after the user presses
  **Prepare score tables**: the analysis yields after every position, but the rating of one board (up to the guard
  of 1,000,000 checks) cannot be split. Serve the repository to get the Web Worker.
- **The ratings of the replay** are one canonical solve per board under a guard of 1,000,000 checks (and 200,000
  nodes for the count of the solutions): a board that exceeds it shows a status instead of a score, with no retry.
  The explanation of a jump describes the generator's own solution and its limited check, never what every solver
  needs, and the work count `checks` of a rating is diagnostic only: it can differ by a few between two runs (the
  subset techniques space their budget checks with a counter that lives across solves), so the tests ignore it.
- **Difficulty weights are engineering priors**, not measurements of human solvers: the weights of the 26
  techniques and the nine score bands were chosen from measurements of generated puzzles
  ([docs/difficulty-rating/report-detailed.md](docs/difficulty-rating/report-detailed.md)); the Killer weights of `ruleOf45` and
  `cageSplit` are the first candidates for a calibration with people.
- **Generation times**: the times in the user guide were measured in Node (`node tests/qualify.js`);
  `node tests/perf.js` measures every combination against the budgets of [design.md](generator/design.md) §9.1 on your
  machine.
- **The Play button** needs the player to be at the address of the `sg-player-url` meta tag (by default
  `../player/index.html`, so serve or publish the whole repository).

## Licence and credits

Released under the [MIT licence](LICENSE) © 2026 Dat Le. The algorithms follow the well-known literature on
Sudoku generation and solving; the design decisions are recorded in [design.md](generator/design.md). The sibling
project that plays the puzzles is [Sudoku Player](#sudoku-player); the code they share is in `core/`.

[Back to top](#top)

---

# Sudoku Player

Sudoku Player is a small static web app (no server, no account, no build step) that opens a puzzle made by Sudoku
Generator and lets you play it. What it does and how to use it is in the [user guide](USERGUIDE.md#sudoku-player);
this part is about its code.

> Paths in this part are relative to `player/`, and its commands run from that folder.

## How the player reads a puzzle

- The puzzle document carries the rebuilt model, so the player has no variant or generation code at all (see
  [The exchange format](#the-exchange-format)).
- Generator rating-v2 documents still use `sudoku-generator/v1`; the player preserves `difficulty.ratingVersion`
  without recalculating scores. Older documents and texts still open, but the previous level ids are not mapped
  to the new ones. Changing rating metadata does not change a puzzle's saved-progress identity.
- The token of a puzzle link is compressed and URL-safe: the text of the puzzles of the generator's Play button
  (`t.…`), or the document of one puzzle (`z.…`).

[Back to top](#top)

## Run the player locally

There is nothing to install or build. Open `player/index.html` in a browser (it works from `file://`), or serve the
repository (its root, not `player/`: the page loads the code it shares with the generator from `../core`) with any
static server, for example `python -m http.server` or `npx serve`, and open `http://localhost:8000/player/`.

[Back to top](#top)

## Player tests

```
node tests/node-runner.js          # every suite (30, 1,683 tests); no packages (run on Node 24)
node tests/node-runner.js --suite=play,importer
```

The runner has the same `--exact`, `--list-tests` and `--results` options as the generator's (see "Exact selection,
inventory and results" in the Sudoku Generator tests above). A whole Player quick command is covered like the
generator's quick set when it does not fit one bounded command (see "Bounded coverage of the quick set" above); the
measured cost of each app is in [docs/difficulty-v3/recovery-quick-cost.md](docs/difficulty-v3/recovery-quick-cost.md).

These Node tests are quick and are the default set: developers and coding agents run `node tests/node-runner.js`
(or a few suites with `--suite=`) while developing, and the deployment workflow runs all of them. They are the 14
suites of `tests/suites/` and the 16 of `../core/tests/suites/` that the generator runs too (the engine, the technique
ladder, the exchange format, the board view). `tests.html` runs the same suites in a browser (the ones that read the
fixtures need `http://`). The fixtures in `tests/fixtures/puzzles/` are real documents made by Sudoku Generator
([fixtures](docs/puzzle-exchange/fixtures.md)).

<a id="help-examples"></a>
**The help examples.** `player/js/ui/help-examples.js` holds one real example for every technique of the guide
(`help.html`): a snapshot of a puzzle partway through, made by the player's own hints, so the page draws it at once
and plays nothing. It is generated by `tests/tools/make-technique-examples.js` (run it from `player/`; never edit the
file by hand) and checked by `tests/suites/help.test.js`; the pure part of the tool is the fixture
`tests/fixtures/help-example-tools.js` (`SG.fixtures.helpExampleTools`), tested by the `help-example-tools` suite. The
tool is bounded and never generates a puzzle unless you ask: with no mode it only **checks** (it writes nothing) the
selected IDs against the saved catalogue, replaying the saved puzzle of each one with the player's own hints.

```
node tests/tools/make-technique-examples.js ../generator --ids=nakedSingle,cageCombo --max-puzzles=2 --max-hints=400 --check
```

`--ids` takes exact technique IDs (default: all of them), `--max-puzzles` is the most puzzles replayed (64 by default;
`--puzzles` is the same cap), `--max-hints` the most hints played in one puzzle (400) and `--out=<file.js>` the
catalogue to compare with or write (default `js/ui/help-examples.js`); every path is relative to the current folder and
stays inside the repository. A technique that is new has no saved puzzle: give it real puzzles in a source file,
`{"schema":1,"sources":{"<id>":[{"variantId":"classic9","level":null,"seed":null,"text":"<the puzzle block as the
generator shows it>"}]}}`, with `--sources=<file.json>`, or find them with an explicit, bounded discovery: `--discover`
with `--variants`, `--levels` and a small `--max-puzzles` (at most that many requests are made, one after the other,
failures included, and the run stops at an eight-minute deadline). A discovery must end in `--record-sources=<file.json>`
(save the real source of each selected ID; no catalogue) or `--write` (merge the selected examples into the complete
catalogue: every selected ID needs an example and the whole catalogue must be valid, otherwise the old file stays
untouched). For each ID the clearest example wins, the earliest on a tie, and a technique that cannot get a real example
within the bound stops the work: nothing synthetic replaces it. The intermediate files go to `--work-dir` (default
`tests/artifacts/difficulty-v3/help`), never to the system temporary folder. The exit code is 0 when done or up to date,
1 for a difference, a missing example or a wrong command, and 2 when the run was incomplete. A task that adds two
techniques records the source of each one separately, combines the two source files (no puzzle text changes; an ID that
is in both is refused) and writes them together:

```
node tests/tools/make-technique-examples.js ../generator --ids=<id> --discover --variants=classic9 --levels=hard --max-puzzles=12 --max-hints=400 --record-sources=tests/artifacts/<task>/<id>.json
node tests/tools/make-technique-examples.js ../generator --ids=<id>,<other> --sources=tests/artifacts/<task>/sources.json --max-puzzles=16 --write
node tests/tools/make-technique-examples.js ../generator --ids=<id>,<other> --sources=tests/artifacts/<task>/sources.json --max-puzzles=16 --check
```

A snapshot names its board by the variant, and the variant does not fix the regions of a **Jigsaw** puzzle. So a Jigsaw
snapshot (`variant: "jigsaw9"`) also holds `cellRegion`, an owned plain array of exactly 81 region numbers copied from
the `model.layout.cellRegion` of the replayed puzzle (no other variant has the field, and a region is never guessed
from the givens). `SG.help.buildExample` rebuilds the board from that map with the Jigsaw builder of the importer
(`SG.textBoards.jigsawSpec`) and validates it like an imported board; a missing or malformed map (a wrong length, a region
that does not hold nine cells) gives no board, so the guide says the example is unavailable, and never the regular 3×3
boxes. The quick tests replay one real Jigsaw puzzle, kept unchanged in `tests/fixtures/jigsaw-help-source.js`, with the
current hint code, so they pin no hint step. A Jigsaw example for a technique is found like any other, with
`--discover --variants=jigsaw9 --levels=hard` (the plan has hard, expert and master for Jigsaw).

The slow checks are the **browser scripts** in `tests/browser/` (`node tests/browser/run-all.js`: headless Edge
over the DevTools protocol, several minutes). They are **manual** while developing and run only
when a change touches the UI; the pull-request workflow runs them (Edge or Chrome of the runner image) for every pull request to `main`; the run is recorded in [browser run](docs/qa/browser-run.md).

[Back to top](#top)

## Deploy on GitHub Pages

Choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. The
[deployment workflow](.github/workflows/pages.yml) of the repository runs the Node 24 quick tests of both apps (the
generator's in the checked groups of `.github/scripts/generator-quick.json`; not the heavy suites and not the browser
scripts) and publishes the player, the generator and the code they share after every
push to `main`; you can also run it manually from the **Actions** tab. Only the app files and licence are
published, not the tests or working notes. The live app is at
**[tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/)**. Sudoku Generator's “Play”
button opens the player next to it (`../player/index.html`); the page finds the generator the same way, from
`<meta name="sg-generator-url">` in `index.html` (`../generator/index.html`, a path relative to the page: a page, not
a folder, because a folder shows a file listing when the pages are opened from a disk).

[Back to top](#top)

## More about the player

[`design.md`](player/design.md) (architecture, formats, accessibility, testing, risks) ·
[`task.md`](player/task.md) (the plan and its status) ·
[the overview of the repository](#overview) and [the documents](docs/README.md) ·
License: MIT ([LICENSE](LICENSE)).

[Back to top](#top)
