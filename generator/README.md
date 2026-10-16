# Sudoku Generator

<a id="top"></a>

**[English](#english) · [Tiếng Việt](#tieng-viet)**

A static web app, written in plain HTML, CSS and JavaScript, that generates Sudoku puzzles in **15 variants**,
**guarantees the difficulty you ask for**, and **shows you how every puzzle is made** — step by step, in
English or Vietnamese. No framework, no build step, no server, no external library. To *solve* a puzzle it has
made, use its sibling app **[sudoku-player](https://github.com/tdat00/sudoku-player)**: the "Play online" button
opens the puzzle there ([details](#play-online-with-sudoku-player)).

Một ứng dụng web tĩnh viết bằng HTML, CSS và JavaScript thuần, tạo đề Sudoku cho **15 biến thể**, **đảm bảo
đúng độ khó bạn chọn** và **cho bạn xem từng bước đề được tạo ra** — bằng tiếng Anh hoặc tiếng Việt. Không
framework, không bước biên dịch, không máy chủ, không thư viện ngoài. Muốn *giải* một đề vừa tạo, hãy dùng ứng
dụng anh em **[sudoku-player](https://github.com/tdat00/sudoku-player)**: nút "Chơi trực tuyến" mở đề đó ở bên
ấy ([chi tiết](#chơi-trực-tuyến-với-sudoku-player)). (Phần tiếng Việt nằm ở [phía dưới](#tieng-viet).)

![The generator in the light theme: a classic 9×9 puzzle halfway through the replay of its generation](docs/screenshot-classic9-light.png)

---

<a id="english"></a>

# English

**Contents:**
[What it is](#what-it-is) ·
[Features](#features) ·
[Screenshots](#screenshots) ·
[Running it](#running-it) ·
[URL parameters](#url-parameters) ·
[Play online](#play-online-with-sudoku-player) ·
[How it works](#how-it-works) ·
[Adding a variant](#adding-a-variant) ·
[Adding a technique](#adding-a-technique) ·
[Running the tests](#running-the-tests) ·
[Conventions](#conventions) ·
[Known limitations](#known-limitations) ·
[Licence and credits](#licence-and-credits)

## What it is

Most Sudoku generators hand you a puzzle and nothing else. This one is also a way to *learn how puzzles are made*:

1. You pick a variant, a difficulty, optionally a seed, and press **Generate**.
2. The generator runs at full speed and **records every move** it makes (building the board, filling the
   solution, digging holes, rating the result).
3. The page **replays that record** at the speed you choose, next to a panel that explains the seven steps
   (what, why, how, and the pseudocode that runs).

The difficulty is not a guess. Each level is defined by the solving techniques a person needs, and the digger
only removes a clue while the puzzle can still be solved with the techniques of the requested level (the
*technique-bounded oracle*, [design.md](design.md) §6.8). The same seed with the same options always gives the
same puzzle.

## Features

- **15 variants** — classic 4×4, 6×6 and 9×9; Mega 12×12 and Monster 16×16; Diagonal (X); Hyper (Windoku);
  Jigsaw; Killer; Greater-Than; Samurai, Sohei, Butterfly and Flower (overlapping grids); Wordoku.
- **Six difficulty levels** — very easy, easy, medium, hard, expert, evil — from 21 human solving techniques
  (singles, locked candidates, subsets, fish, wings, chains) plus 3 cage and 2 inequality techniques.
- **Step-by-step replay** of the generation: play, pause, step, scrub, four speeds; an explanation card with
  pseudocode for each of the seven steps.
- **Bilingual interface** (English / Vietnamese), switched without a reload; every string, including the
  solving techniques and the variant rules, exists in both languages.
- **Guaranteed result** — exactly one solution (checked by a separate solver), the requested level or, when it
  cannot be reached, the closest puzzle with a clear notice.
- **Export, import and print** — PNG, SVG, JSON, text, a share link, print / PDF, batch printing for teachers
  (several puzzles per page, optional solution pages), and import of a saved puzzle.
- **Play online** — one click hands the puzzle on screen to the separate [sudoku-player](https://github.com/tdat00/sudoku-player)
  web app, where you solve it with notes, undo/redo, checking, hints that name the technique and a timer. The
  puzzle travels inside the link (after the `#`), so nothing is uploaded; see
  [Play online with sudoku-player](#play-online-with-sudoku-player).
- **Accessible** — keyboard navigation, ARIA grid, live announcements, light, dark and high-contrast themes,
  adjustable text size, reduced motion.
- **In-app help** — the rules of all 15 variants, the technique ladder, keyboard shortcuts, and a first-visit
  tour.
- **Static and offline** — open `index.html`, or serve the folder with any static server; the generator itself
  never sends anything anywhere. Recently generated puzzles are cached in the browser, and the next one is
  quietly pre-generated in the background, so *Generate* is often instant.

The variants (`id` is what the URL parameter `v` and the code use):

| `id` | Variant | Digits | Cells | Levels offered |
|------|---------|-------:|------:|----------------|
| `classic4` | Mini Sudoku 4×4 | 4 | 16 | veryEasy–easy |
| `classic6` | Mini Sudoku 6×6 | 6 | 36 | veryEasy–easy |
| `classic9` | Classic Sudoku 9×9 | 9 | 81 | veryEasy–evil |
| `mega12` | Mega Sudoku 12×12 | 12 | 144 | veryEasy–hard |
| `mega16` | Monster Sudoku 16×16 | 16 | 256 | veryEasy–hard |
| `diagonalX` | Diagonal Sudoku (X) | 9 | 81 | veryEasy–evil |
| `hyper` | Hyper Sudoku (Windoku) | 9 | 81 | veryEasy–evil |
| `jigsaw9` | Jigsaw Sudoku | 9 | 81 | veryEasy–evil |
| `killer` | Killer Sudoku | 9 | 81 | veryEasy–expert |
| `greaterThan` | Greater-Than Sudoku | 9 | 81 | veryEasy–expert |
| `samurai` | Samurai Sudoku | 9 | 369 | veryEasy–hard |
| `sohei` | Sohei Sudoku | 9 | 288 | veryEasy–hard |
| `butterfly` | Butterfly Sudoku | 9 | 144 | veryEasy–hard |
| `flower` | Flower Sudoku | 9 | 189 | veryEasy–hard |
| `wordoku` | Wordoku | 9 | 81 | veryEasy–expert |

## Screenshots

Replaying the generation of a Classic 9×9 puzzle (light theme, English):

![Classic 9×9 in the light theme, halfway through the replay](docs/screenshot-classic9-light.png)

The same page in the dark theme and in Vietnamese:

![Classic 9×9 in the dark theme, Vietnamese interface](docs/screenshot-classic9-dark-vi.png)

A Killer puzzle with its cages:

![A Killer Sudoku with dashed cages and their sums](docs/screenshot-killer.png)

## Running it

You need only a web browser (Chrome or Edge 100+, Firefox 100+, Safari 15.4+).

**The quickest way** — open `index.html` in the browser (double-click it, or drag it onto a window). It works
from `file://`, but browsers do not allow Web Workers there, so the generator runs on the main thread in small
slices: the badge under the board says *Main thread*, the page stays responsive between slices but may pause
for a moment on a large board (one unsplittable piece of work can take up to a few hundred milliseconds),
**Cancel** takes effect at the next slice, and the background pre-generation of the next puzzle is off.

**Recommended** — serve the folder with any static server. Then the generator runs in a Web Worker (the badge
says *Background thread*), the page stays smooth, **Cancel** works at once and the next puzzle is quietly
pre-generated while you look at this one:

```bash
cd sudoku-generator
python -m http.server 8000      # then open http://localhost:8000/
# or:  npx serve .
```

**GitHub Pages** — the app uses only relative paths, so it works from any sub-path with no configuration.
Choose *Settings → Pages → Build and deployment → Source → GitHub Actions*. The
[deployment workflow](.github/workflows/pages.yml) runs the Node 24 tests and publishes the app after every
push to `main`; you can also run it manually from the **Actions** tab. Only the app files and licence are
published, not the tests or working notes. The live app is at
**[tdat00.github.io/sudoku-generator](https://tdat00.github.io/sudoku-generator/)**.

Open the **Help** button for the rules of every variant, the technique ladder and the keyboard shortcuts. The
first time you visit, a short tour shows where everything is (it is skipped when the address contains
`auto=1`).

## URL parameters

The address bar always holds the state of the page, so a link reproduces a puzzle exactly. Only values that
differ from the defaults are written; a share link (from the result panel or the **Export** dialog) writes
`v d sym mode` as well.

| Parameter | Example | Meaning |
|-----------|---------|---------|
| `v` | `v=jigsaw9` | Variant id (the table above). Default `classic9`. |
| `d` | `d=hard` | Difficulty: `veryEasy`, `easy`, `medium`, `hard`, `expert`, `evil`. Default `medium`. |
| `seed` | `seed=1734567890` | Seed. A whole number 0–4294967295 is used as it is; any other text is hashed to one. Missing = random. |
| `sym` | `sym=mirrorH` | Symmetry of the given cells: `none`, `rotational180` (default), `rotational90`, `mirrorH`, `mirrorV`, `mirrorBoth`, `diagonal`, `antiDiagonal`. |
| `mode` | `mode=letters` | Symbol set: `digits`, `letters`, `colors`, `shapes`, `word` (Wordoku only). Default: the variant's own. |
| `order` | `order=snake` | Order in which clues are tried: `random` (default), `rowByRow`, `snake`, `spiral`, `jumpOne`. |
| `attempts` | `attempts=12` | Full grids to try before settling for the closest puzzle, 1–20. Default 8. |
| `trace` | `trace=summary` | How much of the generation is recorded for the replay: `off`, `summary`, `full` (default). |
| `sol` | `sol=1` | Show the solution next to the puzzle. |
| `o.<id>` | `o.cageSize=2` | An option of the chosen variant, for example `o.compactness=0.8` (jigsaw9), `o.futoshiki=1` (greaterThan), `o.placement=row` (wordoku). |
| `lang` | `lang=vi` | Language: `en` or `vi`. Default: the stored choice, then the browser language. |
| `speed` | `speed=instant` | Replay speed: `instant`, `fast` (default), `step`, `manual`. |
| `auto` | `auto=1` | Generate as soon as the page loads (and do not show the first-visit tour). |

`?v=classic9&d=expert&seed=42&lang=vi&auto=1` always gives the same puzzle. Settings are also kept in the
browser's `localStorage`: `sg.prefs.v1` (language, theme, text size, speed, reduced motion, the colour-blind
symbol), `sg.lastConfig.v1` (the last options), `sg.cache.v1` (up to 20 recently generated puzzles, see
[Cache and pre-generation](#cache-and-pre-generation)), and `sg.tour.v1` (the tour was seen). A link that names
a puzzle parameter wins over the stored options. If storage is blocked, the
page keeps everything in memory for the session.

## Play online with sudoku-player

This repository only **generates** puzzles. Solving them is the job of its sibling,
**[sudoku-player](https://github.com/tdat00/sudoku-player)** (published at
`https://tdat00.github.io/sudoku-player/`): a separate static app with a grid you can fill in, candidate notes,
undo/redo, error checking, hints that name the logical technique, a timer, progress saved per puzzle, all 15
variants, English / Vietnamese, themes and accessibility.

**How a puzzle gets there.** Press **Export** and use the **Play online** section (or the **Play online** button
of the result panel). The page turns the puzzle on screen into a *puzzle document*, packs it into a token and
opens `https://tdat00.github.io/sudoku-player/#puzzle=<token>` in a new tab (`window.open(url, '_blank',
'noopener')`). The token is in the URL **fragment**, which a browser never sends to a server, so nothing is
uploaded. The dialog also shows the link in a read-only field with a **Copy link** button, and when the link is
longer than about 100 kB it warns that some apps and servers cut long links and offers the JSON file instead (the
player opens a file, a drop or pasted text as well). The player's address comes from
`<meta name="sg-player-url" content="https://tdat00.github.io/sudoku-player/">` in `index.html`: change it to
point at your own copy.

**The exchange format** — the only coupling between the two repositories, implemented by `js/ui/exchange.js`
(`SG.exchange`, the same file byte for byte in both, with the suite `tests/suites/exchange.test.js`):

- The **document** is the puzzle JSON of [design.md](design.md) §14.1 (`format: 'sudoku-generator/v1'`), exactly
  what **Download JSON** writes, plus one additive block, **`model`**: the plain-data model specification
  (`variantId`, `digits`, `units`, `unitMeta`, `cages`, `inequalities`, `layout`, `symbols`, `fixedCells`) that
  `SG.model.create(spec)` accepts. With it the player rebuilds the board **without any variant code**. The
  generator's own import ignores `model` and works as before.
- The **token** is `z.` + base64url(deflate-raw(JSON)) — or `j.` + base64url(JSON) when compression is not
  available or does not pay. `SG.exchange.encode(doc)` and `SG.exchange.decode(token)` are asynchronous;
  `SG.exchange.playerUrl(base, token)` builds the link and refuses a base that is not `http(s)` or a relative
  path. Failures carry the codes `exchange.invalidToken`, `exchange.tooLarge`, `exchange.unsupportedEncoding`,
  `exchange.invalidJson` and `exchange.invalidUrl`, translated in both languages (`error.exchange.*`).
- In code: `SG.exportUi.toJson(result)` is the document, `SG.exportUi.buildPlayLink(result)` the link
  (`{ url, token, base, length, long }`), `SG.exportUi.openPlayLink(url)` opens it. Details:
  [design.md](design.md) §10.9 and §13.15.

## How it works

### Layers

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ UI            js/ui/        app · controls · board-view (SVG) · step-view · explain · player  │
│                             · result-view · i18n · store · export · import · play · a11y …     │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ ORCHESTRATION js/worker/    worker-client (Web Worker, or the main-thread fallback)           │
│                             gen.worker.js (runs the pipeline off the main thread)             │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ GENERATION    js/core/      pipeline · full-grid · digger · symmetry · difficulty · events    │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ SOLVER        js/core/      dfs-solver · logical-solver · techniques + tech-*.js              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ MODEL         js/core/ and js/variants/    model · constraints · bits · rng · 15 variants     │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

A lower layer never knows about a higher one. `js/core/` and `js/variants/` never touch the DOM, which is what
lets the whole engine run in Node for the tests.

**One model for every variant.** A puzzle is a set of cells, a list of *units* (groups of cells that must hold
different values: rows, columns, boxes, jigsaw regions, diagonals, windows, cages) and optional extras (cage
sums, inequalities). Samurai and friends are just a bigger model whose grids share cell indices. So one
solver and one generator serve all 15 variants, and `js/core/` has no `if (variant === …)` anywhere:
differences go through the registry (`SG.variants`).

### The generation pipeline and its event stream

`SG.pipeline.run(config, emit, budget)` is synchronous and always goes through seven steps:
`configure → buildModel → fullGrid → extraStructure → dig → rate → tune`. It returns a `PuzzleResult`
(`model, givens, solution, rating, seed, config, timings, attempts, warnings`) and reports everything through
`emit` as `GenerationEvent`s: `{ type, stepId, phase, t, seq, i18nKey?, i18nArgs?, patch?, metrics? }`. A
`patch` is a *delta* of at most eight cells (`{ cells: [{ i, value, state }], highlight, unhighlight }`), never
a snapshot. `SG.events.VOCABULARY` is the contract for every event key.

`dig`, `rate` and `tune` are three steps that repeat per *dig sample*: when the puzzle that was just dug misses
the requested level (`tune.miss`), the next sample is dug from the same grid (up to 12 per grid), and only
then does `retry.difficulty` start a new grid (up to `attempts`, default 8). If every attempt is used, the
closest puzzle is returned with a notice instead of an error. `SG.pipeline.runSteps` is the same algorithm as a
generator that yields at natural boundaries (what the worker and the main-thread mode run), and
`SG.pipeline.toWire` / `fromWire` carry a result across `postMessage`. The difficulty of a puzzle is
`SG.difficulty.rate(...)`, from calibrated technique costs; use `rating.score`, never the solver's raw score.

The UI never slows the algorithm down to animate it. It stores the events as a *trace* and `SG.player`
replays the trace (`SG.events.createView / applyPatch / invertPatch / mergePatches`), so it can pause, step
backwards and scrub. Overlays (cages, signs, windows) are drawn from the final `result.model`, not from
patches. Random choices use forked streams of one seeded generator (`SG.rng`), which is why a seed
reproduces a puzzle.

### Worker and fallback

`SG.workerClient.generate(config, onEvent)` returns a promise of the `PuzzleResult`; `.cancel()` stops a run,
`.mode` tells `'worker'` or `'main'`, `.ready()` settles once the mode is known, and `SG.workerClient.create()`
makes an independent client (with `dispose()`) for the cache and for batch printing. Over `http(s)` the client
starts `js/worker/gen.worker.js`, which loads the core, the variants and the word lists with `importScripts`
and runs `SG.pipeline.runSteps` in slices of about 12 ms, so a `cancel` message is read between slices: the
promise is rejected at once, the work stops at the next boundary, and a worker that does not answer within
150 ms is terminated (and created again when it is needed). Where a Worker cannot start (`file://`, a restrictive policy) the client
falls back to the main thread, runs the same slices there and the page shows the badge. The puzzle for a given
seed is identical in both modes.

### Cache and pre-generation

`SG.cache` (`js/ui/cache.js`) stores every generated puzzle in `localStorage` (`sg.cache.v1`, 20 puzzles,
least recently used out first, schema version checked), so the same configuration with the same seed is served
at once. It stores the puzzle only, never the trace: a cached puzzle is shown immediately and its trace is
**regenerated from the seed in the background**, then loaded into the replay (paused at the end) — the
regenerated puzzle must equal the cached one, otherwise the entry is dropped. When the page has been idle for a
second, the cache also pre-generates one or two puzzles with the same options in a worker, which "Generate"
(with an empty seed) and "Regenerate" then hand out instantly. It never runs while a generation is in
progress, pauses in a hidden tab, skips configurations that are slow, and does not exist in main-thread mode.
A switch in Settings turns the pre-generation off (the choice is not remembered).

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
*X-Wing*, *Jigsaw* or *seed* stays as it is). Never build a sentence from several keys: word order differs.

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
tags), in the `SOURCE_FILES` array of `tests.html`, and — for the core, the variants and the word lists only,
never the UI — in `js/worker/gen.worker.js`. `tests/suites/ui-contract.test.js` fails when they drift apart.
**Adding a JavaScript file means adding it to all four places.** Files that do not exist yet are skipped by
the runner and `tests.html`.

### The UI modules

`js/ui/app.js` owns the page and exposes `SG.app`: `getStore()`, `getBoard()`, `getPlayer()`, `getStepView()`,
`getResult()` (the last `{ result, trace }`), `generate()`, `regenerate()`, `cancel()`, `showResult()` (show a
puzzle that was not generated on this page, as the import does), `toast()`, `announce()`, `openModal()`,
`setClient()` and `attachTrace()` (what the cache uses), and an event bus `on()` / `emit()` with the events
`generate:start`, `generate:progress`, `generate:end`, `generate:error`, `generate:cancel`, `result`, `trace`,
`position`, `locale`, `theme`, `settings` and `action`. The header of `app.js` is the full contract.

**Adding a UI module without editing `app.js`.** At the end of start-up `app.js` calls `init(SG.app)` — which
must be idempotent — on each of these optional modules that exists, in this order, every call in its own
`try/catch`:

| Module | What it does |
|--------|--------------|
| `SG.exportUi` | The Export dialog: print / PDF, PNG, SVG, JSON, text, share link, **Play online** (the link to sudoku-player) and batch printing (1 / 2 / 4 / 6 per page, optional solution pages); it hosts the import section |
| `SG.importUi` | Import of a saved JSON or a line of digits, validation (a bad file gives a translated message), "Analyse difficulty"; a file can be dropped anywhere on the page |
| `SG.a11y` | The board as an ARIA grid with keyboard navigation, live announcements of step changes, the Settings dialog |
| `SG.theme` | Light, dark and high-contrast themes (and "auto"), the hints of the empty / busy / error states |
| `SG.help` | The Help dialog (rules, technique ladder, shortcuts) and the first-visit tour |
| `SG.cache` | The cache and pre-generation described above; it replaces the generation client with a wrapper |

Such a module listens with `SG.app.on('action', …)` (the header buttons emit `action { id: 'export' | 'settings' |
'help' }`), draws dialogs with `SG.app.openModal()` and reads the puzzle with `SG.app.getResult()`; a name that
is not in the list needs one more entry in the `OPTIONAL_MODULES` list of `app.js`. Every UI file must **load
in Node without a DOM** (top-level code only defines functions and pushes locale fragments; the DOM is touched
inside functions called at run time), and keeps its logic in pure, testable functions next to the DOM code.
`js/ui/exchange.js` (`SG.exchange`) is not one of these modules: it is a DOM-free helper that `exportUi` uses
and that sudoku-player shares byte for byte.

### Directory tree

```
sudoku-generator/
├── index.html              the page: every <script> tag, in dependency order; the sg-player-url meta tag
├── tests.html              the same test suites, run in the browser
├── design.md · task.md     the design specification (as built) and the task list with its completion summary
├── README.md · LICENSE     this file · the MIT licence
├── docs/                   screenshots used by this README · final-report.md (the final QA report)
├── assets/
│   ├── favicon.svg         the inline favicon
│   └── wordlists/          isograms.en.js · isograms.vi.js   key words of Wordoku
├── css/
│   ├── tokens.css          colours (3 themes), spacing, motion: the only place for colour literals
│   ├── tokens-board.css    colours of the board (3 themes)
│   ├── base.css · layout.css · components.css · board.css · steps.css
│   ├── help.css · print.css
├── js/
│   ├── core/               engine, no DOM
│   │   ├── ns.js · errors.js · bits.js · budget.js · rng.js
│   │   ├── model.js · constraints.js · combo-table.js         model and propagation
│   │   ├── dfs-solver.js · logical-solver.js · techniques.js  solvers and the technique registry
│   │   ├── tech-basic.js · tech-subset.js · tech-fish.js · tech-wing.js · tech-chain.js
│   │   ├── tech-cage.js · tech-ineq.js                        Killer and Greater-Than techniques
│   │   ├── difficulty.js · full-grid.js · symmetry.js · digger.js
│   │   └── events.js · explain-data.js · pipeline.js          the seven steps and their events
│   ├── variants/           registry.js · classic.js · mega.js · extra-regions.js · jigsaw.js · killer.js
│   │                       · greater-than.js · multigrid.js · wordoku.js
│   ├── worker/             gen.worker.js · worker-client.js
│   └── ui/                 exchange.js (link to sudoku-player) · i18n.js · locale.en.js · locale.vi.js
│                           · locale.shell.js · symbols.js · board-view.js · store.js · controls.js
│                           · step-view.js · explain.js · player.js (replay of the generation)
│                           · result-view.js · cache.js · export.js · import.js · a11y.js · theme.js
│                           · help.js · app.js
└── tests/
    ├── harness.js · node-runner.js · soak.js · perf.js
    ├── fixtures/           puzzles and fixtures with known answers, the performance helper and the
    │                       regression hashes (regression.js, generated)
    └── suites/             one *.test.js per area, 42 in all (found automatically)
```

## Adding a variant

A variant is **data plus a `build` function** that registers itself; no other file needs to know about it. The
rules are in [design.md](design.md) §5.3. Here is a complete, working example — *Disjoint Groups Sudoku*: the
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
    difficultySupport: ['veryEasy', 'easy', 'medium', 'hard'],
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
| `difficultySupport` | Levels the variant can really generate, a subset of `veryEasy … evil`. Offer only what `node tests/soak.js --variant=<id>` can hit reliably. |
| `defaultSymbolMode`, `symbolModes` | Symbol sets the UI may offer (`digits`, `letters`, `colors`, `shapes`, `word`). |
| `options` | Variant options for the UI (`slider`, `select`, `boolean`, `text`). Declare labels with `i18nKey` and help with `hintKey`; `SG.variants.optionsOf(id)` gives them in one normalised shape, and the controls are built from it. |
| `build(opts, rng)` | Returns the `PuzzleModel`; only for geometry and units. |
| `clueFloor`, `clueFloorScale` | Optional own minimum number of clues per level, in place of the classic9 numbers scaled by `cellCount / 81` (see "Clue floor per variant" in `js/core/difficulty.js`). Use them when the generic floor makes a level unreachable. |
| `postGenerate(ctx)`, `digStrategy`, `fastSeed`, `restartThreshold` | Optional pipeline hooks: structure made from the finished solution (Killer cages, Greater-Than signs; models are immutable, so it returns a new model), an alternative digging strategy (registered with `SG.digger.registerStrategy` and named here), a pre-fill and a restart threshold of the full-grid search. |

**2. Load the file — add its path to all four script lists**, anywhere after `js/variants/registry.js` (next to
the other variants is natural): `index.html` (a `<script>` tag), `tests.html` (`SOURCE_FILES`),
`tests/node-runner.js` (`SOURCE_FILES`) and `js/worker/gen.worker.js` (`SCRIPTS`, with a path relative to
`js/worker/`). `ui-contract.test.js` checks that the four agree.

**3. Tests you get for free.** `tests/suites/variants.test.js` loops over `SG.variants.list()`, so the new
variant is covered without editing any test: CV0 the definition, CV1 every model passes
`SG.model.validate`, CV2 full grids, CV3 a puzzle at every declared level (and the other levels are
refused), CV4 the invariants I1–I7 of [design.md](design.md) §15.3 (one solution, givens ⊂ solution, …; I6 uses the
variant's own clue floor), CV5 the same seed gives the same puzzle, CV6 no generation hangs, CV7 the names,
option labels and level names exist in both languages. Write an
extra suite (`tests/suites/disjoint.test.js`, and add its name to `SUITE_FILES` in `tests.html`) only for
logic of your own.

**4. Add its help entry.** The in-app Help must explain every variant. In `js/ui/help.js` add the id to
`VARIANT_HELP` (`{ figure: 'board' }` draws the empty board automatically) and add the three texts
`help.variant.disjoint9.rules`, `.special` and `.figure` to the fragment at the bottom of the file, in both
languages. `tests/suites/help.test.js` fails until you do, and also fails when README.md does not mention the
new id: add a row to the table above.

**5. Calibrate.** `node tests/soak.js --variant=disjoint9` prints how often each requested level is hit, the
invariant violations and the time per puzzle. A level that is hit rarely needs a `clueFloorScale`, or must be
dropped from `difficultySupport`.

## Adding a technique

A solving technique is one function that finds *one deduction* in the current candidates. It lives in its
own `tech-*.js` file and registers itself, so the solver and the digger never change. The full contract is the
header of `js/core/techniques.js`. A complete example — *Full House*, a unit with a single open cell:

```js
// js/core/tech-fullhouse.js
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
    group: 'basic',               // one of SG.techniques.GROUPS: it decides the level that allows it
    baseCost: 1,                  // score of one application
    order: 5,                     // loop position, cheapest first (nakedSingle is 10)
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
   [How it works](#how-it-works).
3. **Strings**: `technique.<id>` (name), `technique.<id>.desc` and `technique.<id>.step` in both languages;
   `tests/suites/i18n.test.js` checks that every registered technique and every step text has them. The Help
   dialog's technique ladder lists the new technique by itself.
4. **Level**: a level allows the groups `SG.difficulty.BASE_GROUPS[0 … level]`, so the `group` you choose
   decides where the technique becomes available (`basic` → very easy, `locked` → easy, `subset` → medium,
   `fish` → hard, `wing` → expert, `chain` → evil; `cage` and `ineq` belong to Killer and Greater-Than).
   Calibrate its cost in `SG.difficulty.COSTS` and the score bands in `SG.difficulty.TABLE`
   (`js/core/difficulty.js`), then check the hit rates with `node tests/soak.js --quick`.
5. **Tests**: add positive and negative fixtures and the soundness check to the matching
   `tests/suites/tech-<group>.test.js` (helpers in `tests/fixtures/techniques-helper.js`): a technique must
   never eliminate a value that belongs to the true solution.

## Running the tests

Everything runs in Node 18+ with no installation (no npm packages are used):

```bash
node tests/node-runner.js                          # every suite (42, about 3,500 tests), about three minutes
node tests/node-runner.js --suite=killer,variants  # only these suites (file name without .test.js)
node tests/node-runner.js --filter=xWing --verbose # only tests whose name contains the text
node tests/node-runner.js --bail                   # stop at the first failure
```

The runner loads `SOURCE_FILES` with `vm.runInThisContext`, discovers `tests/fixtures/*.js` and
`tests/suites/*.test.js` by itself, and exits with a code other than 0 on any failure. The suites cover the
engine, every variant, the solving techniques, the pipeline and its events, the worker and its client, and the
pure parts of every UI module (they run without a DOM). `tests/suites/help.test.js` also checks this README
against the code: its variants table, URL parameters, script names, links, commands and flags, the `SG.…`
names and the two worked examples. At the tip of this repository the runner counts 3,498 tests in 42 suites,
all green; the counts of the combined project at its final review (before the split) are in
`docs/final-report.md`.

- **In the browser:** open `tests.html` (it works from `file://`). Query parameters:
  `?suite=killer&filter=text&bail=1&autorun=0`.
- **Soak and calibration** — generates hundreds of puzzles across variants and levels, checks the invariants
  I1–I7 and prints a confusion matrix of requested against achieved level, the time per puzzle against its
  budget and a score histogram: `node tests/soak.js --quick`, `node tests/soak.js --full` (the final QA preset,
  about 2,000 puzzles), `node tests/soak.js --variant=jigsaw9 --count=180`, `node tests/soak.js --level=hard`
  (`--help` lists the rest).
- **Performance** against the budgets of [design.md](design.md) §9.1: `node tests/perf.js --quick`,
  `node tests/perf.js --variant=classic9 --runs=20`. The *regression hashes* in `tests/fixtures/regression.js`
  guard against an optimisation changing a puzzle: `--check-hashes` compares, and `--update-hashes` records new
  ones after a change that is meant to alter puzzles (a calibration, a new digging rule). `--alloc` probes the
  hot loops for allocation.
- **Deep statistical runs** in the mega, multigrid and variants suites are off by default; enable them with the
  environment variable `SG_DEEP=1` (`SG_DEEP=1 node tests/node-runner.js --suite=mega,multigrid`; in
  PowerShell `$env:SG_DEEP = 1`).
- **Final QA report:** `docs/final-report.md`.

## Conventions

The full list is in [design.md](design.md) §12.2:

- One IIFE per file, attached to the `SG` namespace; `'use strict'`; no `import`, `export` or `require` in
  `js/`.
- ES2020 without modules, 2-space indent, single quotes, semicolons, lines of at most 110 characters, English
  comments only where the code is hard to follow, JSDoc on every public API.
- `camelCase` for variables and functions, `PascalCase` for types, `UPPER_SNAKE` for constants, `kebab-case.js`
  for files.
- `js/core/` and `js/variants/` never touch the DOM; DOM, `window` and `localStorage` are used only in
  `js/ui/` and `js/worker/worker-client.js`. A test checks it.
- Every displayed string goes through `SG.i18n.t()` and exists in English and Vietnamese; `<html lang>`
  follows the language.
- No colour literal outside `css/tokens.css` and `css/tokens-board.css`; everything else uses
  `var(--sg-…)` tokens. A test checks it.
- Core errors are `SG.errors.GenerationError` with a `code` that has a translation.
- Every function that can run for more than 50 ms takes a `budget` and calls `budget.check()`.
- No new file without adding it to the four script lists; no weakened test to make a build pass.

## Known limitations

- **`file://` mode** is less smooth: the generator runs on the main thread in slices of about 12 ms, so the
  page stays responsive and **Cancel** works at the next slice, but one piece of work cannot be split — in
  Killer a single search slice takes 70–86 ms, a Greater-Than sign dig 50–70 ms, the cage layout of a hard
  Killer up to about 300 ms — and the page may pause for that long. Background pre-generation is off there
  too. Serve the folder to get the Web Worker.
- **No real screen-reader run.** Keyboard operation, ARIA roles and live announcements are implemented and
  checked in a headless browser, but no one has listened to them with a screen reader yet.
- **Difficulty calibration** (technique costs and score bands) was tuned on Classic 9×9, which has the highest
  hit rate. The other variants use their own clue floors (`clueFloor`, `clueFloorScale`) and their hit rates are
  measured by `tests/soak.js`; a combination that is hard to reach (a strict symmetry with a very high level)
  returns the closest puzzle with a notice instead of the exact level.
- **Not every level is offered everywhere**: Mini 4×4 and 6×6 stop at easy; Mega, Monster and the overlapping
  grids stop at hard; Killer, Greater-Than and Wordoku stop at expert.
- **Large boards are the slowest**: Samurai, Sohei, Flower and Monster 16×16. Measured in Node, a hard Samurai
  puzzle takes about half a second at the 95th percentile (far inside the budgets of
  [design.md](design.md) §9.1); `node tests/perf.js` measures every combination on your machine.
- **Wordoku in Vietnamese**: nine-letter words with nine different letters are rare in Vietnamese, so the
  list is short; when it is too short the English list is used and a notice says so.
- **Settings**: the switch that turns background pre-generation off is not remembered between visits.
- **Not built**: a minimap or horizontal scrolling for Monster 16×16 on phones (the board scales to the
  screen width instead), and a "warm start" that digs a harder puzzle from an easier one.
- **Browsers**: developed and checked in Chromium-based Edge only; Firefox 100+ and Safari 15.4+ are the
  supported targets but have not been tried, and neither has a real phone.
- **Play online** needs the player to be published at the address of the `sg-player-url` meta tag, and a
  browser that does not block pop-ups for the page (the link is also shown, so you can copy it). A puzzle link
  longer than about 100 kB may be cut by chat apps and servers; use the JSON file for such boards.

## Licence and credits

Released under the [MIT licence](LICENSE) © 2026 Dat Le. The algorithms follow the well-known literature on
Sudoku generation and solving; the design decisions are recorded in [design.md](design.md). The sibling
project that plays the puzzles is [sudoku-player](https://github.com/tdat00/sudoku-player).

[Back to top](#top)

---

<a id="tieng-viet"></a>

# Tiếng Việt

**Mục lục:**
[Giới thiệu](#giới-thiệu) ·
[Tính năng](#tính-năng) ·
[Ảnh chụp màn hình](#ảnh-chụp-màn-hình) ·
[Cách chạy](#cách-chạy) ·
[Tham số URL](#tham-số-url) ·
[Chơi trực tuyến](#chơi-trực-tuyến-với-sudoku-player) ·
[Cách hoạt động](#cách-hoạt-động) ·
[Thêm một biến thể](#thêm-một-biến-thể) ·
[Thêm một kỹ thuật](#thêm-một-kỹ-thuật) ·
[Chạy kiểm thử](#chạy-kiểm-thử) ·
[Quy ước](#quy-ước) ·
[Hạn chế đã biết](#hạn-chế-đã-biết) ·
[Giấy phép và ghi công](#giấy-phép-và-ghi-công)

## Giới thiệu

Phần lớn trình tạo Sudoku chỉ đưa cho bạn một đề rồi thôi. Trình này còn là cách để *hiểu một đề Sudoku được
tạo ra như thế nào*:

1. Bạn chọn biến thể, độ khó, có thể thêm seed, rồi bấm **Tạo đề**.
2. Bộ sinh chạy hết tốc độ và **ghi lại mọi nước đi** của nó (dựng bảng, điền lời giải, đào lỗ, chấm điểm).
3. Trang **phát lại bản ghi đó** với tốc độ bạn chọn, bên cạnh một khung giải thích bảy bước (làm gì, vì sao,
   làm thế nào, và đoạn mã giả đang chạy).

Độ khó không phải là phỏng đoán. Mỗi mức được định nghĩa bằng các kỹ thuật giải mà người chơi cần dùng, và bộ
đào chỉ bỏ một số cho sẵn khi đề vẫn giải được bằng các kỹ thuật của mức đã chọn (*oracle bị giới hạn theo kỹ
thuật*, [design.md](design.md) §6.8). Cùng seed và cùng tùy chọn luôn cho ra cùng một đề.

## Tính năng

- **15 biến thể** — Sudoku cổ điển 4×4, 6×6 và 9×9; Khổng lồ 12×12 và Quái vật 16×16; Đường chéo (X); Siêu
  vùng (Windoku); Ghép hình (Jigsaw); Sát thủ (Killer); So sánh (Greater-Than); Samurai, Sohei, Cánh bướm và
  Bông hoa (các lưới chồng nhau); Sudoku chữ (Wordoku).
- **Sáu mức độ khó** — rất dễ, dễ, trung bình, khó, chuyên gia, địa ngục — dựa trên 21 kỹ thuật giải của con
  người (số đơn, ứng viên bị khóa, tập con, cá, cánh, chuỗi) cùng 3 kỹ thuật về lồng và 2 kỹ thuật về dấu so
  sánh.
- **Phát lại từng bước** quá trình tạo đề: phát, tạm dừng, từng bước, kéo thanh trượt, bốn tốc độ; thẻ giải
  thích kèm mã giả cho từng bước trong bảy bước.
- **Giao diện song ngữ** (Anh / Việt), đổi ngay không cần tải lại trang; mọi chuỗi chữ, kể cả tên kỹ thuật giải
  và luật của từng biến thể, đều có cả hai ngôn ngữ.
- **Kết quả được đảm bảo** — đúng một lời giải (do một bộ giải riêng kiểm tra), đúng mức độ yêu cầu hoặc, khi
  không đạt được, đề gần nhất kèm thông báo rõ ràng.
- **Xuất, nhập và in** — PNG, SVG, JSON, văn bản, liên kết chia sẻ, in / PDF, in hàng loạt cho giáo viên (nhiều
  đề trên mỗi trang, có thể kèm trang lời giải) và nhập lại một đề đã lưu.
- **Chơi trực tuyến** — một cú bấm chuyển đề đang hiển thị sang ứng dụng riêng
  [sudoku-player](https://github.com/tdat00/sudoku-player), nơi bạn giải đề với ghi chú, hoàn tác / làm lại, kiểm
  tra, gợi ý nêu tên kỹ thuật và đồng hồ. Đề nằm ngay trong liên kết (sau dấu `#`) nên không có gì bị tải lên;
  xem [Chơi trực tuyến với sudoku-player](#chơi-trực-tuyến-với-sudoku-player).
- **Dễ tiếp cận** — điều hướng bằng bàn phím, lưới ARIA, thông báo trực tiếp, giao diện sáng, tối và tương
  phản cao, chỉnh cỡ chữ, giảm chuyển động.
- **Trợ giúp ngay trong ứng dụng** — luật của cả 15 biến thể, bậc thang kỹ thuật, phím tắt, và hướng dẫn nhanh
  cho lần truy cập đầu tiên.
- **Tĩnh và chạy ngoại tuyến** — mở `index.html`, hoặc phục vụ thư mục bằng một máy chủ tĩnh bất kỳ; bản thân
  trình tạo không gửi gì đi đâu cả. Các đề vừa tạo được lưu đệm trong trình duyệt và đề kế tiếp được âm thầm tạo
  sẵn ở nền, nên nút *Tạo đề* thường cho kết quả ngay.

Danh sách biến thể nằm ở [bảng phía trên](#features) (cột `id` là giá trị của tham số URL `v` và dùng trong mã).

## Ảnh chụp màn hình

Phát lại quá trình tạo đề Sudoku cổ điển 9×9 (giao diện sáng, tiếng Anh):

![Sudoku cổ điển 9×9 ở giao diện sáng, đang phát lại giữa chừng](docs/screenshot-classic9-light.png)

Cùng trang đó ở giao diện tối và bằng tiếng Việt:

![Sudoku cổ điển 9×9 ở giao diện tối, giao diện tiếng Việt](docs/screenshot-classic9-dark-vi.png)

Một đề Sát thủ (Killer) với các lồng:

![Đề Killer Sudoku với các lồng nét đứt và tổng của chúng](docs/screenshot-killer.png)

## Cách chạy

Bạn chỉ cần một trình duyệt web (Chrome hoặc Edge 100+, Firefox 100+, Safari 15.4+).

**Cách nhanh nhất** — mở `index.html` bằng trình duyệt (bấm đúp, hoặc kéo thả vào cửa sổ). Cách này chạy được
từ `file://`, nhưng trình duyệt không cho dùng Web Worker ở đó nên bộ sinh chạy trên luồng chính theo từng lát
nhỏ: huy hiệu dưới bảng ghi *Luồng chính*, trang vẫn phản hồi giữa các lát nhưng với bảng lớn có thể khựng một
lúc (có những đoạn việc không chia nhỏ được, lâu nhất vài trăm mili giây), nút **Hủy** có tác dụng ở lát kế
tiếp, và việc tạo sẵn đề kế tiếp ở nền bị tắt.

**Khuyến nghị** — phục vụ thư mục bằng một máy chủ tĩnh bất kỳ. Khi đó bộ sinh chạy trong Web Worker (huy hiệu
ghi *Luồng nền*), trang luôn mượt, nút **Hủy** có tác dụng ngay và đề kế tiếp được âm thầm tạo sẵn trong lúc
bạn xem đề này:

```bash
cd sudoku-generator
python -m http.server 8000      # rồi mở http://localhost:8000/
# hoặc:  npx serve .
```

**GitHub Pages** — ứng dụng chỉ dùng đường dẫn tương đối nên chạy được ở mọi đường dẫn con mà không cần cấu
hình. Chọn *Settings → Pages → Build and deployment → Source → GitHub Actions*.
[Workflow triển khai](.github/workflows/pages.yml) chạy các kiểm thử trên Node 24 và xuất bản ứng dụng sau mỗi
lần đẩy lên `main`; bạn cũng có thể chạy thủ công từ thẻ **Actions**. Chỉ các tệp ứng dụng và giấy phép được
xuất bản, không gồm kiểm thử hay ghi chú làm việc. Ứng dụng trực tuyến tại
**[tdat00.github.io/sudoku-generator](https://tdat00.github.io/sudoku-generator/)**.

Bấm nút **Trợ giúp** để xem luật của từng biến thể, bậc thang kỹ thuật và các phím tắt. Lần đầu bạn truy cập,
một hướng dẫn nhanh sẽ chỉ ra mọi thứ nằm ở đâu (hướng dẫn này bị bỏ qua khi địa chỉ có `auto=1`).

## Tham số URL

Thanh địa chỉ luôn giữ trạng thái của trang, nên một liên kết tạo lại đúng một đề. Chỉ những giá trị khác mặc
định mới được ghi; liên kết chia sẻ (ở khung kết quả hoặc hộp thoại **Xuất đề**) còn ghi thêm `v d sym mode`.

| Tham số | Ví dụ | Ý nghĩa |
|---------|-------|---------|
| `v` | `v=jigsaw9` | Mã biến thể (bảng ở trên). Mặc định `classic9`. |
| `d` | `d=hard` | Độ khó: `veryEasy`, `easy`, `medium`, `hard`, `expert`, `evil`. Mặc định `medium`. |
| `seed` | `seed=1734567890` | Seed. Số nguyên 0–4294967295 được dùng nguyên văn; văn bản khác được băm thành một số. Không có = ngẫu nhiên. |
| `sym` | `sym=mirrorH` | Kiểu đối xứng của các ô cho sẵn: `none`, `rotational180` (mặc định), `rotational90`, `mirrorH`, `mirrorV`, `mirrorBoth`, `diagonal`, `antiDiagonal`. |
| `mode` | `mode=letters` | Bộ ký hiệu: `digits`, `letters`, `colors`, `shapes`, `word` (chỉ Wordoku). Mặc định: của biến thể. |
| `order` | `order=snake` | Thứ tự thử bỏ số: `random` (mặc định), `rowByRow`, `snake`, `spiral`, `jumpOne`. |
| `attempts` | `attempts=12` | Số lưới đầy đủ được thử trước khi chấp nhận đề gần nhất, 1–20. Mặc định 8. |
| `trace` | `trace=summary` | Mức ghi lại để phát lại: `off`, `summary`, `full` (mặc định). |
| `sol` | `sol=1` | Hiện lời giải cạnh đề. |
| `o.<id>` | `o.cageSize=2` | Một tùy chọn của biến thể đang chọn, ví dụ `o.compactness=0.8` (jigsaw9), `o.futoshiki=1` (greaterThan), `o.placement=row` (wordoku). |
| `lang` | `lang=vi` | Ngôn ngữ: `en` hoặc `vi`. Mặc định: lựa chọn đã lưu, rồi ngôn ngữ của trình duyệt. |
| `speed` | `speed=instant` | Tốc độ phát lại: `instant`, `fast` (mặc định), `step`, `manual`. |
| `auto` | `auto=1` | Tạo đề ngay khi trang tải xong (và không hiện hướng dẫn lần đầu). |

`?v=classic9&d=expert&seed=42&lang=vi&auto=1` luôn cho ra cùng một đề. Các thiết lập còn được lưu trong
`localStorage` của trình duyệt: `sg.prefs.v1` (ngôn ngữ, giao diện, cỡ chữ, tốc độ, giảm chuyển động, ký hiệu
hỗ trợ người mù màu), `sg.lastConfig.v1` (các tùy chọn gần nhất), `sg.cache.v1` (tối đa 20 đề vừa tạo, xem
[Bộ nhớ đệm và tạo sẵn đề](#bộ-nhớ-đệm-và-tạo-sẵn-đề)) và `sg.tour.v1` (đã xem hướng dẫn). Liên kết có nêu tham
số của đề thì được ưu tiên hơn các tùy chọn đã lưu. Nếu bị chặn lưu trữ, trang giữ mọi thứ trong bộ nhớ trong
suốt phiên.

## Chơi trực tuyến với sudoku-player

Kho mã này chỉ **tạo** đề. Việc giải đề do dự án anh em đảm nhận:
**[sudoku-player](https://github.com/tdat00/sudoku-player)** (đăng tại `https://tdat00.github.io/sudoku-player/`) —
một ứng dụng tĩnh riêng với lưới để bạn điền số, ghi chú ứng viên, hoàn tác / làm lại, kiểm tra lỗi, gợi ý nêu
tên kỹ thuật logic, đồng hồ, tiến độ được lưu theo từng đề, đủ 15 biến thể, tiếng Anh / Việt, giao diện và trợ
năng.

**Đề sang đó bằng cách nào.** Bấm **Xuất đề** rồi dùng phần **Chơi trực tuyến** (hoặc nút **Chơi trực tuyến**
ở khung kết quả). Trang biến đề đang hiển thị thành một *tài liệu đề*, nén thành một mã (token) rồi mở
`https://tdat00.github.io/sudoku-player/#puzzle=<token>` trong thẻ mới (`window.open(url, '_blank',
'noopener')`). Mã nằm ở **phần fragment** của URL — trình duyệt không bao giờ gửi phần này lên máy chủ — nên
không có gì bị tải lên. Hộp thoại còn hiện liên kết trong một ô chỉ đọc kèm nút **Sao chép liên kết**; khi liên
kết dài hơn khoảng 100 kB, nó cảnh báo rằng một số ứng dụng và máy chủ cắt bớt liên kết dài và gợi ý dùng tệp
JSON (trình chơi cũng mở được tệp, thao tác thả hoặc văn bản dán vào). Địa chỉ của trình chơi lấy từ
`<meta name="sg-player-url" content="https://tdat00.github.io/sudoku-player/">` trong `index.html`: hãy đổi nó
nếu bạn có bản riêng.

**Định dạng trao đổi** — mối liên kết duy nhất giữa hai kho mã, do `js/ui/exchange.js` (`SG.exchange`, cùng
một tệp, giống từng byte ở cả hai bên, kèm bộ kiểm thử `tests/suites/exchange.test.js`) cài đặt:

- **Tài liệu** là JSON của đề theo [design.md](design.md) §14.1 (`format: 'sudoku-generator/v1'`), đúng như
  **Tải tệp JSON** ghi ra, cộng thêm một khối bổ sung **`model`**: đặc tả mô hình dạng dữ liệu thuần
  (`variantId`, `digits`, `units`, `unitMeta`, `cages`, `inequalities`, `layout`, `symbols`, `fixedCells`) mà
  `SG.model.create(spec)` nhận được. Nhờ nó, trình chơi dựng lại bảng **mà không cần mã của biến thể nào**.
  Chức năng nhập của chính trình tạo này bỏ qua `model` và hoạt động như trước.
- **Mã (token)** là `z.` + base64url(deflate-raw(JSON)) — hoặc `j.` + base64url(JSON) khi không nén được hoặc nén
  không có lợi. `SG.exchange.encode(doc)` và `SG.exchange.decode(token)` là hàm bất đồng bộ;
  `SG.exchange.playerUrl(base, token)` dựng liên kết và từ chối địa chỉ gốc không phải `http(s)` hay đường dẫn
  tương đối. Lỗi mang các mã `exchange.invalidToken`, `exchange.tooLarge`, `exchange.unsupportedEncoding`,
  `exchange.invalidJson` và `exchange.invalidUrl`, đã dịch ở cả hai ngôn ngữ (`error.exchange.*`).
- Trong mã: `SG.exportUi.toJson(result)` là tài liệu, `SG.exportUi.buildPlayLink(result)` là liên kết
  (`{ url, token, base, length, long }`), `SG.exportUi.openPlayLink(url)` mở nó. Chi tiết:
  [design.md](design.md) §10.9 và §13.15.

## Cách hoạt động

### Các tầng

Sơ đồ các tầng ở [phần tiếng Anh](#layers). Tóm tắt: **giao diện** (`js/ui/`) → **điều phối** (`js/worker/`:
Web Worker hoặc phương án dự phòng trên luồng chính) → **sinh đề** (`js/core/`: pipeline, full-grid, digger,
difficulty, events) → **bộ giải** (`dfs-solver`, `logical-solver`, `techniques` và các `tech-*.js`) → **mô
hình** (`model`, `constraints`, `bits`, `rng` và 15 biến thể trong `js/variants/`). Tầng dưới không bao giờ biết
tầng trên. `js/core/` và `js/variants/` không chạm vào DOM, nhờ đó toàn bộ bộ máy chạy được trong Node để kiểm
thử.

**Một mô hình cho mọi biến thể.** Một đề là một tập ô, một danh sách *nhóm* (các ô phải chứa giá trị khác
nhau: hàng, cột, khối, vùng jigsaw, đường chéo, cửa sổ, lồng) và các phần bổ sung tùy chọn (tổng của lồng, dấu
so sánh). Samurai và các biến thể cùng loại chỉ là một mô hình lớn hơn mà các lưới dùng chung chỉ số ô. Vì vậy
một bộ giải và một bộ sinh phục vụ cả 15 biến thể, và trong `js/core/` không có chỗ nào viết
`if (variant === …)`: mọi khác biệt đi qua bộ đăng ký (`SG.variants`).

### Pipeline sinh đề và luồng sự kiện

`SG.pipeline.run(config, emit, budget)` chạy đồng bộ và luôn đi qua bảy bước:
`configure → buildModel → fullGrid → extraStructure → dig → rate → tune`. Nó trả về một `PuzzleResult`
(`model, givens, solution, rating, seed, config, timings, attempts, warnings`) và báo mọi việc qua `emit` dưới
dạng `GenerationEvent`: `{ type, stepId, phase, t, seq, i18nKey?, i18nArgs?, patch?, metrics? }`. Một `patch`
là *phần thay đổi* của tối đa tám ô, không bao giờ là ảnh chụp cả bảng. `SG.events.VOCABULARY` là hợp đồng cho
mọi khóa sự kiện.

Ba bước `dig`, `rate` và `tune` lặp lại theo từng *lần đào thử* (dig sample): khi đề vừa đào chưa đúng mức yêu
cầu (`tune.miss`), lần đào kế tiếp được thực hiện trên cùng lưới (tối đa 12 lần mỗi lưới), và chỉ khi đó
`retry.difficulty` mới bắt đầu một lưới mới (tối đa `attempts` lần, mặc định 8). Nếu dùng hết mọi lần thử, đề
gần nhất được trả về kèm thông báo thay vì báo lỗi. `SG.pipeline.runSteps` là cùng thuật toán đó dưới dạng
generator, nhường quyền ở những ranh giới tự nhiên (là cái worker và chế độ luồng chính chạy), còn
`SG.pipeline.toWire` / `fromWire` chuyển kết quả qua `postMessage`. Độ khó của một đề là
`SG.difficulty.rate(...)`, tính từ chi phí kỹ thuật đã hiệu chỉnh; hãy dùng `rating.score`, không dùng điểm thô
của bộ giải.

Giao diện không bao giờ làm thuật toán chậm đi để tạo hoạt ảnh. Nó lưu các sự kiện thành một *trace* và
`SG.player` phát lại trace đó (`SG.events.createView / applyPatch / invertPatch / mergePatches`), nên có thể
tạm dừng, lùi từng bước và kéo thanh trượt. Các lớp phủ (lồng, dấu, cửa sổ) được vẽ từ `result.model` cuối
cùng, không từ các patch. Mọi lựa chọn ngẫu nhiên dùng các luồng được tách ra từ một bộ sinh số có seed
(`SG.rng`), vì thế seed tạo lại được đề.

### Worker và phương án dự phòng

`SG.workerClient.generate(config, onEvent)` trả về một promise của `PuzzleResult`; `.cancel()` dừng một lần
chạy, `.mode` cho biết `'worker'` hay `'main'`, `.ready()` xong khi đã biết chế độ, và `SG.workerClient.create()`
tạo một client độc lập (có `dispose()`) cho bộ nhớ đệm và việc in hàng loạt. Qua `http(s)`, client khởi động
`js/worker/gen.worker.js`, nạp phần lõi, các biến thể và danh sách từ bằng `importScripts` rồi chạy
`SG.pipeline.runSteps` theo từng lát khoảng 12 ms, nên thông điệp `cancel` được đọc giữa các lát: promise bị từ
chối ngay, việc đang làm dừng ở ranh giới kế tiếp, và worker nào không phản hồi trong 150 ms thì bị tắt (và được
tạo lại khi cần). Ở nơi Worker không khởi động được (`file://`, chính sách hạn chế) client chuyển sang chạy trên luồng chính,
chạy cùng các lát đó ở đó và trang hiện huy hiệu. Với cùng một seed, đề ở hai chế độ là như nhau.

### Bộ nhớ đệm và tạo sẵn đề

`SG.cache` (`js/ui/cache.js`) lưu mọi đề đã tạo vào `localStorage` (`sg.cache.v1`, 20 đề, đề lâu chưa dùng nhất
bị bỏ trước, có kiểm tra phiên bản lược đồ), nên cùng cấu hình và cùng seed được trả về ngay lập tức. Nó chỉ lưu
đề, không bao giờ lưu trace: đề lấy từ bộ nhớ đệm hiện ra ngay và trace của nó được **tạo lại từ seed ở nền**,
rồi nạp vào phần phát lại (dừng ở cuối) — đề tạo lại phải trùng với đề đã lưu, nếu không mục đó bị bỏ. Khi trang
đã rảnh một giây, bộ nhớ đệm còn tạo sẵn một hai đề với cùng tùy chọn trong một worker, để nút "Tạo đề" (khi ô
seed trống) và "Tạo lại" đưa ra ngay. Nó không bao giờ chạy khi đang có một lần tạo, tạm dừng khi tab bị ẩn, bỏ
qua các cấu hình chậm, và không tồn tại ở chế độ luồng chính. Một công tắc trong Cài đặt tắt việc tạo sẵn (lựa
chọn này không được nhớ).

### Quốc tế hóa

`SG.i18n.t(key, args)` dịch các `{placeholder}`; các thuộc tính `data-i18n` và `data-i18n-attr` dịch phần HTML.
Hai gói ngôn ngữ gốc là tệp script thuần (`js/ui/locale.en.js`, `locale.vi.js`), không bao giờ là JSON tải về,
nên `file://` vẫn chạy. Mỗi module khác — kể cả `js/ui/locale.shell.js`, chuỗi chữ của khung trang tĩnh — giữ
chuỗi riêng của mình trong một **mảnh** (fragment) được đẩy vào cuối tệp, và `SG.i18n` gộp chúng vào các gói
(khóa nào gói gốc đã có thì gói gốc thắng, và xung đột được báo lại; ví dụ ở phần tiếng Anh).

Quy tắc, do `tests/suites/i18n.test.js` kiểm tra: hai ngôn ngữ có cùng tập khóa, không giá trị nào rỗng, các
`{placeholder}` khớp nhau, khóa không trùng, và tiếng Việt phải là tiếng Việt thật (thuật ngữ đã quen như
*X-Wing*, *Jigsaw*, *seed* thì giữ nguyên). Không bao giờ ghép một câu từ nhiều khóa vì trật tự từ mỗi ngôn
ngữ khác nhau.

### Một không gian tên, không module, một thứ tự script

Mỗi tệp là một IIFE gắn vào một biến toàn cục duy nhất, `SG`; trong `js/` không có `import`, `export` hay
`require`, nên cùng một tệp chạy được như `<script>` thường, trong Worker qua `importScripts` và trong Node
qua `vm.runInThisContext` (mẫu mã ở phần tiếng Anh).

Vì không có import nên **thứ tự nạp chính là đồ thị phụ thuộc**. `SOURCE_FILES` trong `tests/node-runner.js`
là nguồn sự thật duy nhất; cùng thứ tự đó được lặp lại trong `index.html` (các thẻ `<script>`), trong mảng
`SOURCE_FILES` của `tests.html` và — chỉ cho phần lõi, các biến thể và danh sách từ, không bao giờ cho giao
diện — trong `js/worker/gen.worker.js`. `tests/suites/ui-contract.test.js` báo lỗi khi chúng lệch nhau.
**Thêm một tệp JavaScript nghĩa là thêm nó vào cả bốn nơi.** Các tệp chưa tồn tại bị bộ chạy và `tests.html`
bỏ qua.

### Các module giao diện

`js/ui/app.js` sở hữu trang và cung cấp `SG.app`: `getStore()`, `getBoard()`, `getPlayer()`, `getStepView()`,
`getResult()` (kết quả gần nhất `{ result, trace }`), `generate()`, `regenerate()`, `cancel()`, `showResult()`
(hiện một đề không do trang này tạo, như khi nhập), `toast()`, `announce()`, `openModal()`, `setClient()` và
`attachTrace()` (bộ nhớ đệm dùng hai hàm này), cùng một kênh sự kiện `on()` / `emit()` với các sự kiện
`generate:start`, `generate:progress`, `generate:end`, `generate:error`, `generate:cancel`, `result`, `trace`,
`position`, `locale`, `theme`, `settings` và `action`. Phần đầu của `app.js` là hợp đồng đầy đủ.

**Thêm một module giao diện mà không sửa `app.js`.** Cuối quá trình khởi động, `app.js` gọi `init(SG.app)` — hàm
này phải idempotent — trên từng module tùy chọn dưới đây nếu nó tồn tại, theo đúng thứ tự này, mỗi lần gọi trong
một `try/catch` riêng:

| Module | Làm gì |
|--------|--------|
| `SG.exportUi` | Hộp thoại Xuất đề: in / PDF, PNG, SVG, JSON, văn bản, liên kết chia sẻ, **Chơi trực tuyến** (liên kết sang sudoku-player) và in hàng loạt (1 / 2 / 4 / 6 đề mỗi trang, có thể kèm trang lời giải); nó chứa phần nhập đề |
| `SG.importUi` | Nhập một JSON đã lưu hoặc một dòng chữ số, kiểm tra hợp lệ (tệp hỏng cho thông báo đã dịch), "Phân tích độ khó"; có thể thả tệp vào bất kỳ đâu trên trang |
| `SG.a11y` | Bảng dưới dạng lưới ARIA với điều hướng bằng bàn phím, thông báo trực tiếp khi đổi bước, hộp thoại Cài đặt |
| `SG.theme` | Giao diện sáng, tối, tương phản cao (và "tự động"), gợi ý cho các trạng thái trống / bận / lỗi |
| `SG.help` | Hộp thoại Trợ giúp (luật, bậc thang kỹ thuật, phím tắt) và hướng dẫn nhanh lần đầu |
| `SG.cache` | Bộ nhớ đệm và việc tạo sẵn đề mô tả ở trên; nó thay client sinh đề bằng một lớp bọc |

Module như vậy lắng nghe bằng `SG.app.on('action', …)` (các nút ở đầu trang phát `action { id: 'export' |
'settings' | 'help' }`), vẽ hộp thoại bằng `SG.app.openModal()` và đọc đề bằng `SG.app.getResult()`; tên không có
trong danh sách cần thêm một mục vào danh sách `OPTIONAL_MODULES` của `app.js`. Mọi tệp giao diện phải **nạp được
trong Node không cần DOM** (mã ở mức trên cùng chỉ định nghĩa hàm và đẩy các mảnh ngôn ngữ; DOM chỉ được chạm trong
các hàm gọi lúc chạy), và giữ phần logic trong các hàm thuần, kiểm thử được, nằm cạnh mã DOM. `js/ui/exchange.js`
(`SG.exchange`) không thuộc nhóm này: đó là phần phụ trợ không DOM mà `exportUi` dùng và sudoku-player chia sẻ
nguyên từng byte.

### Cây thư mục

Xem [cây thư mục ở phần tiếng Anh](#directory-tree): `index.html`, `tests.html`, `css/`, `js/core/` (bộ máy,
không DOM), `js/variants/`, `js/worker/`, `js/ui/` (gồm `exchange.js`), `assets/wordlists/`, `docs/` và `tests/`.

## Thêm một biến thể

Một biến thể là **dữ liệu cộng với một hàm `build`** tự đăng ký; không tệp nào khác cần biết đến nó. Quy tắc
nằm ở [design.md](design.md) §5.3. Ví dụ đầy đủ, chạy được ở [phần tiếng Anh](#adding-a-variant) là *Sudoku Nhóm
rời* (Disjoint Groups): luật cổ điển cộng thêm chín nhóm, mỗi nhóm gồm các ô ở cùng vị trí trong khối của
chúng. Không cần thêm mã giải nào, vì một nhóm chỉ là thêm một unit.

1. **Viết `js/variants/disjoint.js`** theo mẫu ở phần tiếng Anh: hàm `build()` dựng `SG.model.create({ … })`
   từ các `units`, rồi gọi `SG.variants.register({ id, i18nKey, group, digits, difficultySupport,
   defaultSymbolMode, symbolModes, options, build })`. Bộ đăng ký (`js/variants/registry.js`) kiểm tra định
   nghĩa nên lỗi gõ sai hiện ra ngay khi tải tệp. Các trường tùy chọn: `clueFloor` / `clueFloorScale` (số gợi
   ý tối thiểu riêng cho từng mức, thay cho số của classic9 co giãn theo `cellCount / 81`), `postGenerate` (tạo
   cấu trúc từ lời giải đã xong; mô hình là bất biến nên nó trả về một mô hình mới), `digStrategy` (đăng ký bằng
   `SG.digger.registerStrategy` rồi gọi tên ở đây), `fastSeed`, `restartThreshold`.
2. **Nạp tệp — thêm đường dẫn vào cả bốn danh sách script**, ở đâu đó sau `js/variants/registry.js`:
   `index.html` (thẻ `<script>`), `tests.html` (`SOURCE_FILES`), `tests/node-runner.js` (`SOURCE_FILES`) và
   `js/worker/gen.worker.js` (`SCRIPTS`, đường dẫn tính từ `js/worker/`). `ui-contract.test.js` kiểm tra bốn nơi
   khớp nhau.
3. **Các bài kiểm tra có sẵn.** `tests/suites/variants.test.js` duyệt `SG.variants.list()`, nên biến thể mới
   được kiểm tra mà không phải sửa bài nào: CV0 định nghĩa, CV1 mọi mô hình qua `SG.model.validate`, CV2 lưới
   đầy đủ, CV3 một đề ở mọi mức đã khai báo (các mức khác bị từ chối), CV4 các bất biến I1–I7 của
   [design.md](design.md) §15.3 (I6 dùng ngưỡng gợi ý riêng của biến thể), CV5 cùng seed cho cùng đề, CV6 không lần
   tạo nào bị treo, CV7 tên, nhãn tùy chọn và tên mức có trong cả hai
   ngôn ngữ. Chỉ viết thêm một suite riêng (`tests/suites/disjoint.test.js`, và thêm tên của nó vào
   `SUITE_FILES` trong `tests.html`) cho logic riêng của bạn.
4. **Thêm mục trợ giúp.** Phần Trợ giúp trong ứng dụng phải giải thích mọi biến thể. Trong `js/ui/help.js`,
   thêm mã vào `VARIANT_HELP` (`{ figure: 'board' }` tự vẽ bảng trống) và thêm ba đoạn chữ
   `help.variant.disjoint9.rules`, `.special` và `.figure` vào mảnh ngôn ngữ ở cuối tệp, bằng cả hai ngôn ngữ.
   `tests/suites/help.test.js` báo lỗi cho đến khi bạn làm xong, và cũng báo lỗi nếu README.md không nhắc đến mã
   mới: hãy thêm một dòng vào bảng ở trên.
5. **Hiệu chỉnh.** `node tests/soak.js --variant=disjoint9` in ra tần suất đạt từng mức yêu cầu, các vi phạm
   bất biến và thời gian mỗi đề. Mức nào hiếm khi đạt thì cần `clueFloorScale`, hoặc phải bỏ khỏi
   `difficultySupport`.

## Thêm một kỹ thuật

Một kỹ thuật giải là một hàm tìm *một phép suy luận* trong các ứng viên hiện tại. Nó nằm trong một tệp
`tech-*.js` riêng và tự đăng ký, nên bộ giải và bộ đào không bao giờ phải đổi. Hợp đồng đầy đủ nằm ở phần đầu
của `js/core/techniques.js`; ví dụ hoàn chỉnh *Full House* (một nhóm chỉ còn một ô trống) nằm ở
[phần tiếng Anh](#adding-a-technique).

1. **Quy tắc của `find`**: chỉ đọc `state`, không bao giờ ghi vào (bộ giải tự áp dụng kết quả, nhờ đó điểm số
   luôn trung thực); trả về `null` khi không áp dụng được, nếu không thì trả về đúng một phép suy luận thật sự
   làm đổi trạng thái; không dùng ngẫu nhiên; làm việc với mọi hình dạng nhóm qua `model.units` (không giả định
   hàng và khối); gọi `ctx.check()` trong các vòng lặp dài.
2. **Nạp tệp** bằng cách thêm nó cạnh các tệp `tech-*.js` khác trong bốn danh sách script ở
   [Cách hoạt động](#cách-hoạt-động).
3. **Chuỗi chữ**: `technique.<id>` (tên), `technique.<id>.desc` và `technique.<id>.step` bằng cả hai ngôn ngữ;
   `tests/suites/i18n.test.js` kiểm tra mọi kỹ thuật và mọi câu giải thích từng bước đều có đủ. Bậc thang kỹ
   thuật trong hộp thoại Trợ giúp tự liệt kê kỹ thuật mới.
4. **Mức độ**: một mức cho phép các nhóm `SG.difficulty.BASE_GROUPS[0 … mức]`, nên `group` bạn chọn quyết định
   kỹ thuật bắt đầu có ở đâu (`basic` → rất dễ, `locked` → dễ, `subset` → trung bình, `fish` → khó, `wing` →
   chuyên gia, `chain` → địa ngục; `cage` và `ineq` thuộc về Killer và Greater-Than). Hiệu chỉnh chi phí của nó
   trong `SG.difficulty.COSTS` và các dải điểm trong `SG.difficulty.TABLE` (`js/core/difficulty.js`), rồi kiểm
   tra tỷ lệ đạt mức bằng `node tests/soak.js --quick`.
5. **Kiểm thử**: thêm các mẫu đúng, mẫu sai và phép kiểm tra tính chắc chắn vào
   `tests/suites/tech-<nhóm>.test.js` tương ứng (công cụ trong `tests/fixtures/techniques-helper.js`): một kỹ
   thuật không bao giờ được loại một giá trị thuộc về lời giải thật.

## Chạy kiểm thử

Mọi thứ chạy trong Node 18+ mà không cần cài đặt gì (không dùng gói npm nào):

```bash
node tests/node-runner.js                          # mọi suite (42, khoảng 3.500 bài), khoảng ba phút
node tests/node-runner.js --suite=killer,variants  # chỉ các suite này (tên tệp bỏ .test.js)
node tests/node-runner.js --filter=xWing --verbose # chỉ các bài có tên chứa đoạn chữ này
node tests/node-runner.js --bail                   # dừng ở lỗi đầu tiên
```

Bộ chạy nạp `SOURCE_FILES` bằng `vm.runInThisContext`, tự tìm `tests/fixtures/*.js` và
`tests/suites/*.test.js`, và thoát với mã khác 0 khi có lỗi. Các suite bao phủ bộ máy, mọi biến thể, các kỹ thuật
giải, pipeline cùng các sự kiện của nó, worker và client của nó, và phần logic thuần của mọi module giao diện
(chạy không cần DOM). `tests/suites/help.test.js` còn đối chiếu README này với mã nguồn: bảng biến thể, tham số
URL, tên các script, liên kết, lệnh và cờ, các tên `SG.…` và hai ví dụ chạy được. Ở đầu nhánh hiện tại của kho
mã này, bộ chạy đếm 3.498 bài trong 42 suite, tất cả đều xanh; số liệu của dự án gộp ở lần rà soát cuối (trước
khi tách) nằm trong `docs/final-report.md`.

- **Trong trình duyệt:** mở `tests.html` (chạy được từ `file://`). Tham số truy vấn:
  `?suite=killer&filter=text&bail=1&autorun=0`.
- **Soak và hiệu chỉnh** — tạo hàng trăm đề trên các biến thể và mức, kiểm tra các bất biến I1–I7 và in ma trận
  so sánh mức yêu cầu với mức đạt được, thời gian mỗi đề so với ngân sách và biểu đồ điểm:
  `node tests/soak.js --quick`, `node tests/soak.js --full` (mức chạy cuối cùng để kiểm định, khoảng 2.000 đề),
  `node tests/soak.js --variant=jigsaw9 --count=180`, `node tests/soak.js --level=hard` (`--help` liệt kê phần
  còn lại).
- **Hiệu năng** so với ngân sách ở [design.md](design.md) §9.1: `node tests/perf.js --quick`,
  `node tests/perf.js --variant=classic9 --runs=20`. *Mã băm hồi quy* trong `tests/fixtures/regression.js` bảo
  đảm một lần tối ưu không làm đổi đề: `--check-hashes` so sánh, còn `--update-hashes` ghi mã băm mới sau một thay
  đổi chủ ý làm đổi đề (hiệu chỉnh, quy tắc đào mới). `--alloc` dò các vòng lặp nóng xem có cấp phát bộ nhớ
  không.
- **Các lần chạy thống kê sâu** trong các suite mega, multigrid và variants mặc định tắt; bật bằng biến môi
  trường `SG_DEEP=1` (`SG_DEEP=1 node tests/node-runner.js --suite=mega,multigrid`; trong PowerShell dùng
  `$env:SG_DEEP = 1`).
- **Báo cáo kiểm định cuối cùng:** `docs/final-report.md`.

## Quy ước

Danh sách đầy đủ ở [design.md](design.md) §12.2:

- Một IIFE cho mỗi tệp, gắn vào không gian tên `SG`; `'use strict'`; không `import`, `export` hay `require`
  trong `js/`.
- ES2020 không module, thụt lề 2 dấu cách, nháy đơn, dấu chấm phẩy, dòng tối đa 110 ký tự, chú thích bằng tiếng
  Anh và chỉ ở chỗ khó hiểu, JSDoc cho mọi API công khai.
- `camelCase` cho biến và hàm, `PascalCase` cho kiểu, `UPPER_SNAKE` cho hằng, `kebab-case.js` cho tên tệp.
- `js/core/` và `js/variants/` không bao giờ chạm vào DOM; DOM, `window` và `localStorage` chỉ dùng trong
  `js/ui/` và `js/worker/worker-client.js`. Có bài kiểm tra cho điều này.
- Mọi chuỗi hiển thị đều qua `SG.i18n.t()` và có cả tiếng Anh lẫn tiếng Việt; `<html lang>` theo ngôn ngữ.
- Không có màu viết thẳng ngoài `css/tokens.css` và `css/tokens-board.css`; mọi nơi khác dùng token
  `var(--sg-…)`. Có bài kiểm tra cho điều này.
- Lỗi của phần lõi là `SG.errors.GenerationError` với một `code` có bản dịch.
- Hàm nào có thể chạy quá 50 ms đều nhận `budget` và gọi `budget.check()`.
- Không thêm tệp mới mà quên bốn danh sách script; không nới lỏng bài kiểm tra để vượt qua bản dựng.

## Hạn chế đã biết

- **Chế độ `file://`** kém mượt hơn: bộ sinh chạy trên luồng chính theo từng lát khoảng 12 ms, nên trang vẫn
  phản hồi và nút **Hủy** có tác dụng ở lát kế tiếp, nhưng có những đoạn việc không chia nhỏ được — ở Killer một
  lát tìm kiếm mất 70–86 ms, một lần đào dấu ở So sánh 50–70 ms, bố cục lồng của một đề Killer khó đến khoảng
  300 ms — và trang có thể khựng chừng đó thời gian. Việc tạo sẵn đề ở nền cũng bị tắt. Hãy phục vụ thư mục bằng
  máy chủ để có Web Worker.
- **Chưa chạy thử với trình đọc màn hình thật.** Thao tác bằng bàn phím, vai trò ARIA và thông báo trực tiếp đã
  được cài đặt và kiểm tra trong trình duyệt không giao diện, nhưng chưa ai nghe thử bằng trình đọc màn hình.
- **Hiệu chỉnh độ khó** (chi phí kỹ thuật và dải điểm) được chỉnh trên Sudoku cổ điển 9×9, nơi có tỷ lệ đạt
  cao nhất. Các biến thể khác dùng ngưỡng gợi ý riêng (`clueFloor`, `clueFloorScale`) và tỷ lệ đạt của chúng do
  `tests/soak.js` đo; tổ hợp khó đạt (đối xứng chặt kèm mức rất cao) sẽ trả về đề gần nhất kèm thông báo thay vì
  đúng mức.
- **Không phải mức nào cũng có ở mọi nơi**: Mini 4×4 và 6×6 dừng ở mức dễ; Khổng lồ, Quái vật và các lưới
  chồng nhau dừng ở mức khó; Killer, So sánh và Sudoku chữ dừng ở mức chuyên gia.
- **Bảng lớn chậm nhất**: Samurai, Sohei, Bông hoa và Quái vật 16×16. Đo trong Node, một đề Samurai mức khó mất
  khoảng nửa giây ở phân vị 95 (còn xa mới chạm ngân sách ở [design.md](design.md) §9.1); `node tests/perf.js`
  đo mọi tổ hợp trên máy của bạn.
- **Wordoku tiếng Việt**: từ chín chữ cái khác nhau rất hiếm trong tiếng Việt nên danh sách ngắn; khi quá ngắn
  thì dùng danh sách tiếng Anh và có thông báo.
- **Cài đặt**: công tắc tắt việc tạo sẵn đề ở nền không được nhớ giữa các lần truy cập.
- **Chưa làm**: bản đồ thu nhỏ hay cuộn ngang cho Quái vật 16×16 trên điện thoại (bảng được co theo chiều rộng
  màn hình), và "khởi động ấm" để đào một đề khó hơn từ một đề dễ hơn.
- **Trình duyệt**: được phát triển và kiểm tra chỉ trên Edge nền Chromium; Firefox 100+ và Safari 15.4+ là mục
  tiêu hỗ trợ nhưng chưa được thử, điện thoại thật cũng vậy.
- **Chơi trực tuyến** cần trình chơi đã được đăng tại địa chỉ của thẻ meta `sg-player-url`, và một trình duyệt
  không chặn cửa sổ bật lên của trang (liên kết cũng được hiện ra để bạn sao chép). Liên kết đề dài hơn khoảng
  100 kB có thể bị ứng dụng chat hay máy chủ cắt bớt; với các bảng như vậy hãy dùng tệp JSON.

## Giấy phép và ghi công

Phát hành theo [giấy phép MIT](LICENSE) © 2026 Dat Le. Các thuật toán theo tài liệu phổ biến về sinh và giải
Sudoku; các quyết định thiết kế được ghi trong [design.md](design.md). Dự án anh em dùng để chơi các đề này là
[sudoku-player](https://github.com/tdat00/sudoku-player).

[Lên đầu trang](#top)
