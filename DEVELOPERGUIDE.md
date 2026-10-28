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
[difficulty rating](docs/difficulty-rating/report-brief.md) reports, the [puzzle exchange](docs/puzzle-exchange/fixtures.md)
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
│                             gen.worker.js (runs the pipeline off the main thread)             │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ GENERATION    js/engine/    pipeline · full-grid · digger · symmetry · difficulty · events    │
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
(`model, givens, solution, rating, seed, config, timings, attempts, warnings, digLog`) and reports
everything through `emit` as `GenerationEvent`s:
`{ type, stepId, phase, t, seq, i18nKey?, i18nArgs?, patch?, metrics? }`. A `patch` is a *delta* of at most
eight cells (`{ cells: [{ i, value, state }], highlight, unhighlight }`), never a snapshot.
`SG.events.VOCABULARY` is the contract for every event key.

`dig`, `rate` and `tune` are three steps that repeat per *dig sample*: when the puzzle that was just dug misses
the requested level (`tune.miss`), the next sample is dug from the same grid (up to 12 per grid); when none of
them hits, a local search starts from the closest one (it adds, removes or swaps symmetric groups of clues), and
only then does `retry.difficulty` start a new grid (up to `attempts`, default 8). The top levels (nightmare, hell 1 and
hell 2) also dig fast, uniqueness-only proposals and put clues back while a proposal is too hard. Every grid
has fixed work caps (full ratings and proposed moves, counted, never timed), so a seed gives the same puzzle on
every machine. If every attempt is used, the closest puzzle is returned with a notice instead of an error (only
a puzzle with a complete logical proof is ever returned). `SG.pipeline.runSteps` is the same algorithm as a
generator that yields at natural boundaries (what the worker and the main-thread mode run), and
`SG.pipeline.toWire` / `fromWire` carry a result across `postMessage`. The difficulty of a puzzle is
`SG.difficulty.rate(...)`, from the technique weights `SG.difficulty.WEIGHTS`; use `rating.score`, never the
solver's raw score.

The UI never slows the algorithm down to animate it, and its replay does not read the events. Next to them
the digger keeps a compact **dig log** of the sample that became the puzzle (`result.digLog`: entries `pass`,
`accept`, `reject`, `keep` and `restart`, plus `signs`, `clear`, `reveal` and sign verdicts for Greater-Than;
the header of `js/engine/digger.js` describes them). It is the same whatever the trace verbosity, the thread or
the board size, and `toWire` / `fromWire` carry it. After a run the board shows the finished puzzle at once;
nothing plays by itself. `SG.player.buildSteps(result)` (pure) turns the log into the steps of the replay,
each one a change the board shows: the full solution; the cages (Killer) or the signs (Greater-Than); batches
of random removals, about a ninth of the board tried per step, with the removed cells framed and the cells
that had to go back framed dashed red; rounds of the guided dig, each taking the removal that makes the
puzzle hardest; for Greater-Than the batches of signs taken away and the clues shown when the puzzle came out
too hard; and the finished puzzle. The technical work (settings, board model, rating, tuning, samples that
missed the level) is not shown. A Classic 9×9 *easy* puzzle with seed 3, for example, replays in 9 steps: the
full solution, five batches of random removals (9, 10, 10, 10 and 4 cells), two rounds of the guided dig (2
cells each) and the finished puzzle with 34 clues. `SG.player.create()` is the manual player (first, previous,
next, last, seek; position 0 is the empty grid), `SG.stepView.create()` the description of the step on show
(with a legend of the board frames and the techniques the puzzle needs at that step). The explanation
of the seven steps lives in the Help dialog (tab "How it works"): one collapsible entry per step with its
what / why / how and pseudocode, `SG.explainCard.create(el, { compact: true })`; the entry of the replay step on
show is marked, open, and its running line and dig counters are shown (`SG.app.getExplainContext()`). The
**Explain** (help) icon of the step description opens the Help on that tab. Overlays (cages, signs, windows) are drawn from
the model of the result, not from the log.
`SG.replay.moves(result)` (`js/engine/replay.js`, pure) turns the dig log into complete moves (a symmetric group,
an exchange or a sign; never half of one), and `SG.replay.analyse(result)` rates the board after every move once
(`SG.logicalSolver.solve` with every technique, a guard of 1,000,000 checks, a uniqueness count when the proof
assumes uniqueness), keeping an honest status when a board cannot be rated; neither changes the result.
Random choices use forked streams of one seeded generator (`SG.rng`), which is why a seed reproduces a
puzzle.

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

### Cache and pre-generation

`SG.cache` (`js/ui/cache.js`) stores every generated puzzle in `localStorage` (`sg.cache.v1`, 20 puzzles,
least recently used out first, schema version checked), so the same configuration with the same seed is served
at once. It stores the puzzle only, never the trace nor the dig log: a cached puzzle is shown immediately (the
replay waits, with a "preparing the replay" note) and is **generated again from its seed in the background**;
its dig log then gives it its replay (`SG.app.attachTrace(trace, digLog)`), which opens on the finished
puzzle — the regenerated puzzle must equal the cached one, otherwise the entry is dropped. When the page has
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
`setClient()` and `attachTrace()` (what the cache uses), and an event bus `on()` / `emit()` with the events
`generate:start`, `generate:progress`, `generate:end`, `generate:error`, `generate:cancel`, `result`, `trace`
(`{ result, trace }`, once `attachTrace()` gave a cached puzzle its replay), `position` (`{ position, length,
step, direction }` after every move of the replay; `step` is a step of `SG.player.buildSteps`, null at
position 0), `locale`, `theme`, `settings` and `action`. The header of `app.js` is the full contract.

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
├── .github/workflows/      pages.yml: tests, then publishes generator/, player/ and core/
├── LICENSE · .gitignore    the MIT licence · files ignored by git
├── docs/                   documents of both apps, by feature (the screenshots of the user guide are in
│                           docs/screenshots/)
├── core/                   what the generator and the player share (see ../docs/architecture.md)
│   ├── js/engine/          ns · errors · bits · budget · model · constraints · combo-table · dfs-solver
│   │                       · techniques · logical-solver · tech-*.js · classic-model · model-aids
│   ├── js/ui/              exchange · wordbook · symbols · board-view
│   ├── css/                tokens.css · tokens-board.css · base.css · board.css
│   ├── assets/wordbook/    words.en.js · words.vi.js   spelling, part of speech and meaning of each key word
│   └── tests/              harness.js · fixtures/ · suites/   the suites of the shared code (16 suites)
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
    │   │   └── replay.js       the analysis of the Generation Steps replay: moves, ratings (SG.replay)
    │   ├── variants/       registry.js · classic.js · mega.js · extra-regions.js · jigsaw.js · killer.js
    │   │                   · greater-than.js · multigrid.js · wordoku.js
    │   ├── worker/         gen.worker.js · worker-client.js
    │   └── ui/             i18n.js · locale.en.js · locale.vi.js · locale.shell.js · store.js · controls.js
    │                       · step-view.js · explain.js · player.js (replay of the generation)
    │                       · result-view.js · cache.js · history.js · export.js · a11y.js · theme.js
    │                       · help.js · app.js
    └── tests/
        ├── node-runner.js · soak.js · perf.js · qualify.js · replay-fixtures.js
        ├── fixtures/       the fixtures of the generator (rated puzzles, the performance helper, the
        │                   regression hashes in regression.js, generated, the testkit provider, and the
        │                   data of the replay suite: replay-goldens.js, replay-wire.js, generated)
        ├── suites/         the quick set, run by default together with ../core/tests/suites: one *.test.js per
        │                   area, 27 of the generator's own (found automatically), smoke.test.js among them
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
   only names its family (`cage` and `ineq` belong to Killer and Greater-Than). Then re-run the qualification,
   `node tests/qualify.js`, and check the hit rates with `node tests/soak.js --quick`.
5. **Tests**: add an entry for the technique to `../core/tests/fixtures/techniques.js` (two positions where it
   fires, one where it finds nothing; `../core/tests/suites/techniques.test.js` fails until it has them) and more
   positive and negative fixtures to the matching `../core/tests/suites/tech-<group>.test.js` (helpers in
   `../core/tests/fixtures/techniques-helper.js`). The soundness check — a technique must never eliminate a value
   that belongs to the true solution — needs no code of yours: `techniques.test.js` runs it for every registered
   technique.

## Running the tests

Everything runs in Node 18+ with no installation (no npm packages are used):

```bash
node tests/node-runner.js                          # the quick set (43 suites, about 2,590 tests), about a minute
node tests/node-runner.js --manual                 # only the heavy suites of tests/manual (8, about eight minutes)
node tests/node-runner.js --all                    # quick + manual (51 suites, about 3,610 tests), about nine minutes
node tests/node-runner.js --suite=killer,variants  # only these suites, quick or manual (file name without .test.js)
node tests/node-runner.js --filter=xWing --verbose # only tests whose name contains the text
node tests/node-runner.js --bail                   # stop at the first failure
```

**Two sets of suites, so that development stays fast.** The **quick set** is what runs by default: 43 suites, about
2,590 tests, about one minute — the 27 suites of `tests/suites/` and the 16 of `../core/tests/suites/` that the
player runs too (the engine, the technique ladder, the exchange format, the board view, the harness itself). It includes `smoke.test.js`, which generates one puzzle
per variant and checks its uniqueness, level and determinism and a sample of the regression hashes.
`tests/manual/` holds the 8 **heavy** suites — `variants`, `killer`, `greater-than`, `perf`, `difficulty`,
`extra-regions`, `wordoku` and `jigsaw`, about eight minutes together — which are not part of the default run:
run them with `--manual` (only these) or `--all` (quick and manual, about nine minutes), or by name with
`--suite=killer`, which works for any suite. While developing, run the quick set, and a heavy suite by name when you
touch its area; run `--all` before a release and whenever you touch generation, scoring or a variant. The CI
workflow runs `node tests/node-runner.js --all` before every deploy.

The runner loads `SOURCE_FILES` with `vm.runInThisContext`, discovers `../core/tests/fixtures/*.js`,
`tests/fixtures/*.js`, `../core/tests/suites/*.test.js` and `tests/suites/*.test.js` (and `tests/manual/*.test.js` with
`--manual` or `--all`) by itself, and exits with a code other than 0 on any failure. The shared suites build the
boards of every variant through `SG.testkit` (`../core/tests/fixtures/testkit.js`), and `tests/fixtures/testkit-provider.js`
tells it to take them from the variant registry. The suites cover the
engine, every variant, the solving techniques, the pipeline and its events, the worker and its client, and the
pure parts of every UI module (they run without a DOM). `tests/suites/help.test.js` also checks the guides
against the code: the variants table and the URL parameters of the user guide; the script names, commands and
flags, the `SG.…` names and the two worked examples of this guide; and the links of all four guides. At the tip
of this repository the runner counts about 3,610 tests in 51 suites
(about 2,590 in the 43 quick ones), all green; the counts of the combined project at its final review (before the split) are in
[docs/qa/final-review-v1.md](docs/qa/final-review-v1.md).

```text
node tests/replay-fixtures.js            # regenerates tests/fixtures/replay-wire.js (four slow goldens, ~25 s)
node tests/replay-fixtures.js --check    # regenerates in memory and compares; exit 1 on a difference
```

The `replay` suite reads those saved results (`tests/fixtures/replay-wire.js`) because generating them takes about 23
seconds; regenerate them only when the generator's output changes on purpose (the regression hashes change
then too).

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
  editing the code.
- **Qualification of the levels** — `node tests/qualify.js` runs the protocol that decides which levels each
  variant offers (40 fixed seeds per variant and level through the real pipeline, 60 more for a borderline level,
  a time budget on the 95th percentile) and prints the table and the support lists; `--variant`, `--level`,
  `--jobs`, `--json` and `--markdown` narrow it down or save it; `--probe=N` takes a quick look (N seeds per level, no verdict). The last run is in
  [docs/difficulty-rating/qualification.md](docs/difficulty-rating/qualification.md).
- **Performance** against the budgets of [design.md](generator/design.md) §9.1: `node tests/perf.js --quick`,
  `node tests/perf.js --variant=classic9 --runs=20`. The *regression hashes* in `tests/fixtures/regression.js`
  guard against an optimisation changing a puzzle (the quick `smoke` suite checks a sample of them, the manual
  `perf` suite all of them): `--check-hashes` compares, and `--update-hashes` records new
  ones after a change that is meant to alter puzzles (a calibration, a new digging rule). `--alloc` probes the
  hot loops for allocation.
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
  too. Serve the repository to get the Web Worker.
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
node tests/node-runner.js          # every suite (29, about 15 seconds); no packages (run on Node 24)
node tests/node-runner.js --suite=play,importer
```

These Node tests are quick and are the default set: developers and coding agents run `node tests/node-runner.js`
(or a few suites with `--suite=`) while developing, and the deployment workflow runs all of them. They are the 13
suites of `tests/suites/` and the 16 of `../core/tests/suites/` that the generator runs too (the engine, the technique
ladder, the exchange format, the board view). `tests.html` runs the same suites in a browser (the ones that read the
fixtures need `http://`). The fixtures in `tests/fixtures/puzzles/` are real documents made by Sudoku Generator
([fixtures](docs/puzzle-exchange/fixtures.md)).

The slow checks are the **browser scripts** in `tests/browser/` (`node tests/browser/run-all.js`: headless Edge
over the DevTools protocol, several minutes). They are **manual**, not part of the workflow, and are run only
when a change touches the UI; the run is recorded in [browser run](docs/qa/browser-run.md).

[Back to top](#top)

## Deploy on GitHub Pages

Choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. The
[deployment workflow](.github/workflows/pages.yml) of the repository runs the Node 24 tests of both apps (`node tests/node-runner.js`,
not the browser scripts) and publishes the player, the generator and the code they share after every
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
