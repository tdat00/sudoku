# Architecture of the repository

One repository, two static web apps and the code they share:

```
sudoku/
├── core/          what both apps load: the solver engine, a few UI modules, base styles, the word book,
│                  and the tests of all of that
├── generator/     Sudoku Generator — makes puzzles of 15 variants and shows how they are made
├── player/        Sudoku Player — opens a puzzle (from the generator or pasted) and lets you play it
├── docs/          the documents of both apps, by feature (this folder)
├── .github/       the workflow that tests and publishes the site
├── LICENSE · .gitignore · .gitattributes
└── AGENTS.md      how AI agents should work here
```

`generator/` and `player/` keep what belongs to one app only: its page (`index.html`), `design.md` and `task.md`
(the design and the plan of that app, written against its own source), `README.md`, its own `js/`, `css/` and
`tests/`. Everything the two apps share lives in `core/` and exists once.

## What is in `core/`

| Folder | Content | Used by |
|--------|---------|---------|
| `core/js/engine/` | `ns` (the `SG` namespace), `errors`, `bits`, `budget`, `model`, `constraints`, `combo-table`, `dfs-solver`, `techniques`, `logical-solver`, the technique files `tech-*.js`, `classic-model` (the classic and overlapping boards), `model-aids` (readers of a model: sign layout, key-word line, symbol sets) | both: the generator rates and digs with it, the player solves and gives hints with it |
| `core/js/ui/` | `exchange` (the puzzle link and token format between the two apps), `wordbook`, `symbols`, `board-view` (the SVG board) | both |
| `core/css/` | `tokens.css` and `tokens-board.css` (the design tokens, three themes), `base.css`, `board.css` | both |
| `core/assets/wordbook/` | `words.en.js`, `words.vi.js`: spelling and meaning of each Wordoku key word | both |
| `core/tests/` | `harness.js` (the test harness), `fixtures/` (puzzles with known answers, the technique helper, `testkit.js`), `suites/` (16 suites: the engine, the technique ladder, the exchange format, the board view, the harness itself) | run by both apps' test runners |

`core` knows nothing about either app. It has no DOM access in `core/js/engine/` (it runs in a page, a Web Worker and
Node), no variant names, and no URL or storage access outside functions called at run time.

## How an app uses `core`

Both apps are plain classic scripts with no build step, so *load order is the dependency graph* (see the generator's
README, "One namespace, no modules, one script order"). An app lists the files it needs, in order, by their path from
its own folder:

```html
<!-- generator/index.html, player/index.html -->
<script src="../core/js/engine/ns.js"></script>
<script src="../core/js/engine/errors.js"></script>
…
```

The same list is repeated in each app's `tests/node-runner.js` (`SOURCE_FILES`), `tests.html`, and — for the generator —
`js/worker/gen.worker.js` (paths relative to the worker file, `../../../core/js/engine/…`) and — for the player —
`help.html`. A contract test of each app (`ui-contract.test.js`) fails when the lists drift apart. **A file added to
`core` that both apps need goes into the lists of both.**

Where the two apps differ, the app plugs its part into `core` instead of `core` knowing it:

- the shared test suites build every board through `SG.testkit` (`core/tests/fixtures/testkit.js`), which gets the
  non-classic boards from a *provider* the app registers: the generator's variant registry
  (`generator/tests/fixtures/testkit-provider.js`), the player's puzzle documents (`player/tests/fixtures/puzzle-documents.js`);
- `SG.symbols.modesFor` takes the list of modes a board offers (the generator passes a variant definition, the player
  `SG.modelAids.symbolModes(model)`);
- the generator's classic variants are built by `SG.classicModel`, the same builder the player uses.

## Links between the apps

The generator's **Play** button opens `../player/index.html#puzzle=<token>` and the player links back to
`../generator/index.html`. They are relative paths, so the pair works wherever the repository is served: from a disk
(`file://`), from a local static server started at the **repository root**, and from GitHub Pages. The links name the
page, not its folder: opened from a disk, a folder shows a file listing instead of the page.

The player's own share link is built from its page address, so a copied link works anywhere.

## Running and testing

- Open `generator/index.html` or `player/index.html` directly, or serve the repository root
  (`python -m http.server 8000`, then `http://localhost:8000/generator/` and `http://localhost:8000/player/`).
  Serving a single app folder does not work: the pages load `../core`.
- `node tests/node-runner.js` in `generator/` or in `player/` runs the app's quick suites **and** the suites of
  `core/tests/suites`. The generator also has heavy "manual" suites (`--manual`, `--all`) and a browser run for the
  player lives in `player/tests/browser/` (see [the browser run](qa/browser-run.md)). Agents: see [AGENTS.md](../AGENTS.md).

## Publishing

`.github/workflows/pages.yml` runs the tests (core first, then the player and the generator in parallel, the generator
in five jobs of about 2 to 4 minutes, grouped by `.github/scripts/generator-suites.sh`) and
publishes one site:

```
https://tdat00.github.io/sudoku/            the landing page (index.html at the root of the repository)
https://tdat00.github.io/sudoku/generator/  Sudoku Generator
https://tdat00.github.io/sudoku/player/     Sudoku Player
https://tdat00.github.io/sudoku/core/       the shared code, loaded by both (js/, css/, assets/ only: no tests)
```

## Where the old paths went

Until the merge the apps lived in two repositories, `sudoku-generator` and `sudoku-player`. The documents written then
(the reports in [difficulty-rating](difficulty-rating/report-brief.md), [the final review](qa/final-review-v1.md)) and the
`design.md` / `task.md` files use the old paths:

| Old path (in `sudoku-generator` / `sudoku-player`) | Now |
|---|---|
| `js/core/` `ns errors bits budget model constraints combo-table dfs-solver techniques logical-solver tech-*` (both) | `core/js/engine/` |
| `js/core/classic-model.js`, `js/core/model-aids.js` (player) | `core/js/engine/` |
| `js/core/` `rng difficulty full-grid symmetry digger events explain-data pipeline` (generator) | `generator/js/engine/` |
| `js/core/text-boards.js` (player) | `player/js/engine/` |
| `js/ui/exchange.js` `wordbook.js` `symbols.js` `board-view.js` (both) | `core/js/ui/` |
| the other `js/ui/*.js`, `js/variants/`, `js/worker/` | `generator/js/…` or `player/js/…` |
| `css/tokens.css` `tokens-board.css` `base.css` `board.css` | `core/css/` |
| the other `css/*.css`, `assets/favicon.svg`, `assets/wordlists/` | `generator/…` or `player/…` |
| `assets/wordbook/` | `core/assets/wordbook/` |
| `tests/harness.js`, `tests/fixtures/classic.js` `techniques.js` `techniques-helper.js`, and the suites `bits constraints solver logical-solver model techniques tech-* exchange symbols board-view wordbook` | `core/tests/` |
| the other `tests/…` | `generator/tests/…` or `player/tests/…` |
| `docs/` of either repository | [`docs/`](README.md), by feature |
| `LICENSE`, `.gitignore` | the root of the repository |
| `.github/workflows/pages.yml` | the same path at the root, one workflow for both apps |
| `https://tdat00.github.io/sudoku-generator/`, `…/sudoku-player/` | `https://tdat00.github.io/sudoku/generator/`, `…/sudoku/player/` |
