# Sudoku Player — Design Document

> **Note (one repository).** This document describes the app as built when it was a repository of its own, and it is kept as written. The generator and the player now live in one repository: paths such as `js/core/…`, `docs/…` or `tests/harness.js` are in `core/`, `generator/…`, `player/…` or `docs/` — see [where the old paths went](../docs/architecture.md#where-the-old-paths-went).

> The player is the second half of a split project. **sudoku-generator** makes Sudoku puzzles (15 variants, a
> logical difficulty rating, a step-by-step replay of how each puzzle was made). **sudoku-player** — this
> repository — opens such a puzzle in a browser and lets people **play** it. The only coupling between the two
> is a file format and a link token (§5). This document says what the player is, how it is built and why;
> `task.md` is the work breakdown and its status, the user guide (`../USERGUIDE.md`, `../USERGUIDE.vn.md`) the user's entry point, and the developer guide (`../DEVELOPERGUIDE.md`, `../DEVELOPERGUIDE.vn.md`) the developer's.

## 1. Goals and non-goals

### 1.1 What it is
A **static web app** (HTML, CSS, JavaScript; no build step, no npm, no framework) that receives a puzzle made by
sudoku-generator and plays it:

- Opens puzzles from the **link** the generator's **Play** button builds (`…/#puzzle=<token>&active=<n>`: every
  puzzle of the generator's list, the one on screen first; the button sits next to the **Print** and **Export** buttons at the
  top right of the generator's main panel), from **pasted text** or a dropped text file (the generator's Export text, or one
  line of 16 / 36 / 81 characters for a classic board), and from the list of **imported puzzles**.
- Plays **all 15 variants** — classic 4×4 / 6×6 / 9×9, Mega 12×12, Monster 16×16, Diagonal X, Hyper, Jigsaw, Killer,
  Greater-Than, Samurai, Sohei, Butterfly, Flower, Wordoku — **without any variant or generation code**: the
  document carries the board as plain data (`model`) and the player rebuilds it with `SG.model.create`.
- Play features: select by mouse, touch or keyboard; enter values (the board's own symbols: 1–9, plus A–C on
  Mega 12×12 and 0–9 / A–F on Monster 16×16); an on-screen symbol pad; candidate notes; erase; exact
  undo / redo; error checking (off / conflicts / live); progressive hints (3 levels) that name the logical
  technique; a timer that pauses when the page loses focus; completion detection; Play / Pause / Reset per
  puzzle; reveal a cell; five symbol
  sets (digits, letters, colours, shapes, the Wordoku word); a solved Wordoku shows its key word and, from the
  word book (`assets/wordbook/`), what the word means.
- **Progress is saved automatically per puzzle** (local storage, last 100 puzzles) and the imported puzzles are
  kept (last 100), so a reload — or coming back tomorrow — continues where the player stopped.
- Bilingual **EN / VI**, three themes + `prefers-color-scheme`, font-size setting, reduced motion, WCAG AA
  contrast, keyboard operable, `role="grid"` board, `aria-live` announcements, responsive (three columns on a wide
  desktop, two on a desktop, one on a phone with the keys fixed to the bottom).
- A **guide** (`help.html`, a page of its own that the Help button opens in a new tab): the basics, how the hints
  work, the 40 techniques each with a ready-made example, the keyboard.
- Everything runs **locally**: no server, no account, no network request after the page is loaded.

### 1.2 Non-goals (and a test that proves it)
Generation (`full-grid`, digger, pipeline, symmetry, seeded RNG), the variant registry and builders, difficulty
calibration and classification, the worker, the puzzle cache and pre-generation, the steps panel, the replay
player, explanations, the result panel, **export and print** — none of it is in this repository.
`tests/suites/ui-contract.test.js` loads every player source and asserts that `SG.pipeline`, `SG.digger`,
`SG.fullGrid`, `SG.variants`, `SG.workerClient`, `SG.symmetry`, `SG.difficulty`, `SG.rng`, `SG.exportUi` and the
other generator modules it lists (`events`, `importUi`, `explainCard`, `resultView`, `stepView`, `cache`,
`controls`) do not exist and that no file under `js/` mentions them.

### 1.3 Constraints
IIFE + `SG` namespace, `'use strict'`, 2-space indent, single quotes, English comments, no `import` / `export`,
DOM only in `js/ui/*`, every UI file loads in Node without a DOM, every displayed string through `SG.i18n`, no
colour literal outside the two token files. Works from `file://` (no `fetch` of local files) and over `http://`.
Target browser: a current Chromium (tested in Edge); Firefox and Safari are expected to work and untested.

## 2. Architecture

```
index.html ── <script> tags in the order of tests/node-runner.js SOURCE_FILES
help.html  ── the guide: the same sources minus the ones it does not need, plus help-examples.js and help.js
js/core/   pure logic, no DOM (copied from the generator, trimmed — §2.2)
js/ui/     modules that talk to the page; every file also loads in Node (pure helpers + DOM functions)
css/       tokens + tokens-board (3 themes) · base · layout · components · board · play · help
assets/    favicon.svg · wordbook/ (words.en.js, words.vi.js: the meanings of the Wordoku key words)
tests/     harness.js · node-runner.js · suites/ (30) · fixtures/ (puzzle documents, text exports, test kit,
           the help-example helper, one real Jigsaw source) · browser/ (CDP scripts, run by hand) ·
           tools/ (make-fixtures.js, make-exports.js, make-technique-examples.js, which checks or writes
           js/ui/help-examples.js)
tests.html the same suites in a browser
docs/      fixtures.md (how the documents were made) · qa.md (the manual browser run)
.github/   workflows/pages.yml (the Node tests, then the deployment to GitHub Pages)
```

### 2.1 Layers
`ns / errors / bits / budget` → `model` → `constraints`, `combo-table`, `dfs-solver` → `techniques`,
`logical-solver`, `tech-*` → `classic-model`, `model-aids` (all `js/core/`) → `exchange`, `importer`, `i18n`,
locale packs, `store`, `theme`, `symbols`, `board-view`, `a11y`, `progress`, `wordbook`, `play`, `help`, `app` (`js/ui/`).
A lower layer never knows a higher one.

### 2.2 Modules
| File | `SG.` name | Role | Origin |
|------|------------|------|--------|
| `core/ns.js`, `errors.js`, `bits.js`, `budget.js` | `SG`, `errors`, `bits`, `budget` | namespace, `GenerationError`, bit masks, work budget | copied; the stepper part of `budget` removed |
| `core/model.js` | `model` | `PuzzleModel` (units, peers, cages, signs, layout, symbols), `validate` V1–V8 | copied |
| `core/constraints.js`, `combo-table.js`, `dfs-solver.js` | `constraints`, `comboTable`, `dfs` | propagation, cage sums, solution counting | copied |
| `core/techniques.js`, `logical-solver.js`, `tech-basic / subset / fish / wing / chain / cage / ineq.js` | `techniques`, `logicalSolver`, `ineq` | the 31 named techniques (the skyscraper and the two-string kite, since difficulty v3 MS08a and MS08b, sit between X-Wing and Simple Colouring and the empty rectangle, MS08c, between Simple Colouring and Swordfish; the two chain techniques come in a short and a long window: `forcingChainLong` and `nishioDeep` are the long and the deep ones, each with its own hint texts and example); the solver that powers hints | copied (scoring left as the plain design score; no classification) |
| `core/classic-model.js` | `classicModel` | classic 4 / 6 / 9 and overlapping (Samurai, Sohei, Butterfly, Flower) board builders | **new** (replaces `variants/classic.js`) |
| `core/text-boards.js` | `textBoards` | boards rebuilt from the generator's text export: Diagonal, Hyper, Mega, and (from structure lines) Jigsaw, Killer, Greater-Than, Wordoku | **new** |
| `core/model-aids.js` | `modelAids` | Greater-Than sign edges, Wordoku word line, symbol sets of a model | **new** (replaces pieces of `greater-than.js`, `wordoku.js`) |
| `ui/exchange.js` | `exchange` | link token encode / decode, error codes | shared byte for byte with the generator |
| `ui/importer.js` | `importer` | recognise, decode, validate and open a puzzle; puzzle id | **new** (player side of the generator's import) |
| `ui/i18n.js`, `locale.en.js`, `locale.vi.js`, `locale.shell.js` | `i18n`, `locales` | translation, plurals, fragments | copied; generator groups removed; `player.*`, `error.exchange.*` added |
| `ui/store.js` | `store` | preferences, safe storage backend, URL parsing | **new**, light |
| `ui/progress.js` | `progress` | per-puzzle progress (LRU 100), imported puzzles (LRU 100), recent list | **new** |
| `ui/theme.js`, `a11y.js` | `theme`, `a11y` | themes + system schemes; ARIA grid, keyboard, live region, Settings dialog | copied, adapted |
| `ui/symbols.js`, `board-view.js` | `symbols`, `boardView` | value → glyph; the SVG board of every geometry | copied, adapted |
| `ui/wordbook.js`, `assets/wordbook/words.en.js`, `words.vi.js` | `wordbook`, `wordbookData` | the meaning of a Wordoku key word, looked up lazily when the word is shown (English words have an English and a Vietnamese explanation, Vietnamese words a Vietnamese one) | **new** |
| `ui/play.js` | `play` | game engine (pure) + the play UI | the generator's play mode, reworked into the main screen |
| `ui/help.js`, `help-examples.js` | `help`, `helpExamples` | the guide page (`help.html`): sections, a tab per technique, the contents; `help-examples.js` is the generated snapshot of one example per technique (§8.3) | rewritten; the examples are generated by `tests/tools/make-technique-examples.js` (§8.3) |
| `ui/app.js` | `app` | start-up, open flows, dialogs (Import, Share, Continue), toasts, the heading, the list of imported puzzles, auto-save, wiring; the `SG.app` extension surface | **new** |

### 2.3 The `SG.app` surface
`play.js`, `a11y.js` and `theme.js` were written against the generator's `SG.app`; the player keeps
the part of that contract they use, so they needed small edits only: `getStore() getBoard() getResult()
toast(kind, key, args) openModal({titleKey, body, footer, wide, onClose}) announce(text) on(name, fn) emit(name,
payload) showResult(puzzle, options)`, plus `start() getPuzzle() open(input, options) openPuzzle(puzzle, options)
openOpenDialog() openShareDialog() saveNow()`.
`getResult()` returns `{ result: puzzle, trace: [] }`: the "result" is the opened puzzle (`model`, `givens`,
`solution`, …). Events: `result` (a puzzle is on the board), `settings` (a preference changed), `locale`,
`action` (`open`, `share`, `settings`; Help is a plain link to `help.html`), `play:game` (a game was attached), `play:change` (a game changed;
the app saves 400 ms later). `play.js` is driven by `attach(puzzle, {state, symbolMode, focus})` /
`detach()`; it reads `check` and `autoNotes` from the store and follows the `settings` event.

### 2.4 Script order
`tests/node-runner.js` `SOURCE_FILES` is the single source of truth; `index.html` and `tests.html` repeat it and
`ui-contract.test.js` fails when they drift. `help.html` loads the same list minus the files the guide does not
need (`exchange`, `importer`, `progress`, `a11y`, `app`, `wordbook` and its data files), with `help-examples.js` and `help.js` added; the test
checks that too. `exchange.js` comes before `i18n.js`.

## 3. The puzzle model
Unchanged from the generator (every variant is one constraint problem): cells `0…N-1`, domains `1…D`,
all-different **units**, optional **cages** (sum) and **inequalities** (`value[a] < value[b]`), a **layout**
(canvas rows / columns, cell coordinates, regions, overlays, sub-grids), **symbols** (`mode`, `labels[v-1]`) and
`fixedCells` (the Wordoku word line). `SG.model.create(spec)` builds the immutable model (`peers`, `cellUnits`),
`SG.model.validate` checks V1–V8. The model never depends on how the puzzle was made, which is what lets the
player play a puzzle from a document alone.

Killer and Greater-Than use **lazy propagation extensions**: after building a model that has cages the player
calls `SG.comboTable.enablePropagation(variantId)`, one with signs `SG.ineq.ensureExtension()` — otherwise the
solver would ignore the rules. The importer does it for every model it builds.

## 4. Importing puzzles (`SG.importer`)
The **Import** dialog (and a dropped / pasted text file) takes the text of Sudoku Generator's "Export" box:
`SG.importer.openMany(text)` splits it into puzzles (`exportBlocks`: a header line `#number,variant,level,seed`,
the grid, one row per line, optional `key: value` structure lines, a blank line between puzzles), reads each one
(`parseExportBlock`) and returns `{ items: [{ index, label, outcome }] }`. The text carries the clues and, where
the grid does not fix the board, a few lines, so the player rebuilds the board itself (`SG.classicModel`,
`SG.textBoards`; their specs equal the generator's models, which `tests/suites/text-boards.test.js` checks against
the fixture documents):

| Variant | Rebuilt from |
|---|---|
| Classic 4×4 / 6×6 / 9×9, Mega 12×12, Monster 16×16, Diagonal (X), Hyper (Windoku) | the variant (its name in the header, English or Vietnamese, or the size of the grid) |
| Samurai, Sohei, Butterfly, Flower | the variant and the `_` of the canvas (they must be where no sub-grid is) |
| Jigsaw | `regions:` (nine groups of nine region numbers) |
| Killer | `cages:` (`sum=r1c1,r1c2; ...`, in the order of the model: the colouring depends on it) |
| Greater-Than | `signs:` (`r1c1<r1c2; ...`, the first cell is less than the second) |
| Wordoku | `letters:` (the letter of each value) and `word-line:` (`diagonal`, `row 3`, `column 5`); the key word is not in the text, it is what the unique solution spells along that line |

When the name in the header is not a variant name, the grid decides: the `_` of the canvas selects Samurai, Sohei,
Butterfly or Flower; otherwise a `regions:`, `cages:`, `signs:` or `letters:` line selects Jigsaw, Killer,
Greater-Than or Wordoku; otherwise the number of rows (4, 6, 9, 12 or 16).

A puzzle that cannot be rebuilt (a missing or damaged structure line, a grid of the wrong shape, a variant the
player does not have) gets an issue (`import.error.exportStructure` / `exportShape` / `exportVariant` ...) and is
listed as skipped; the others are imported. The header's level (a name in English or Vietnamese, §5; an export header gives the achieved level only) and its
numeric seed fill the heading of the puzzle. A text with more than 200 puzzles is refused (`import.error.tooLarge`). The good
puzzles go into the list of puzzles (up to 100, in the order of the text: the first puzzle is the first of the
list), the first one opens — or the one that a **bundle link** names with `active` (below). A structured board
is kept in the stored document as its `model` block, so the list reopens it without the text. The same function
hands any other input to `open` (below).

**Bundles (the Play button of the generator).** The generator writes the Export text of its whole list and packs
it into one **text token** (`t.` + base64url(deflate-raw(UTF-8 text)), or `s.` + base64url(text)), so a hundred
puzzles are a few tens of kB of link, not megabytes of documents. `detect` recognises a text token (kind
`'bundle'`, also inside a link, with the `active` number of `SG.exchange.activeFromHash`); `openMany` decodes it
with `SG.exchange.decodeText` and reads the text like pasted text, returning `{ items, active }`
(`openBundle`; a token inside a token is refused, a damaged one is an `error.exchange.*` issue). `app.importBatch`
saves the good puzzles last to first (the list keeps the order of the text) and puts on the board the puzzle
whose `index` is `active`, else the first.

`SG.importer.open(input)` returns a promise of an **outcome** `{ ok, kind, errors, warnings, puzzle }`; it never
rejects and nothing in it throws.

1. **Recognise** (`detect`): a token (`z.` / `j.` + base64url: one document; `t.` / `s.`: a bundle), a link or
   bare fragment (`…#puzzle=<token>[&active=<n>]`, via `SG.exchange.tokenFromHash` / `activeFromHash`), a line of
   classic clues, or nothing known.
2. **Decode** a document token with `SG.exchange.decode` (deflate-raw, bounded to 8 MB); its error codes become
   the issues `error.exchange.*`.
3. **Validate** the document (`validate`): `format` (`sudoku-generator/v1`; another version gets its own
   message), `variantId` in the static list of 15 (digit and cell counts known per variant), `givens` /
   `solution` shape and ranges, and the **`model` block**: every list bounded, every index in range, labels
   short and distinct, cages feasible and covering (Killer), signs between neighbours and acyclic. A variant
   whose board the id does not fix (Jigsaw, Killer, Greater-Than, Wordoku) needs the block
   (`import.error.noModel` otherwise); classic, Mega, Monster, Diagonal, Hyper and the four overlapping boards are
   rebuilt without it.
4. **Build**: `SG.model.create(model)`, `SG.model.validate(model, {solve: false})`, cross-check of the stored
   `layout`, `symbols`, `cages`, `inequalities` against the model, enable the extensions.
5. **Check**: the stored solution against units / cages / signs / word line and the givens; the number of
   solutions with `SG.dfs.countSolutions(model, givens, 2)` under a 6 s budget. No solution → refused
   (`import.error.noSolution`); several → playable with a warning; budget exceeded → playable, "unverified". A
   missing solution is computed with the DFS solver (a text line always is).
6. **Result**: a `puzzle` `{ id, variantId, model, givens, solution, uniqueness, solutionSource, symbolMode,
   info, document }`. `id` hashes the variant, structure and givens, so the same puzzle has the same id however
   it arrived (a text line of a classic board equals its document). `document` is the small plain document that
   is stored for the recent list; `info` feeds the heading and the list (no Wordoku key word in it).

A **text line** (`parseText`) is 16, 36 or 81 characters; `.`, `0`, `-`, `_` are empty; spaces and line breaks
are ignored; it builds `SG.classicModel.build(4 | 6 | 9)`.

## 5. The exchange with sudoku-generator
`js/ui/exchange.js` (and its test `exchange.test.js`) are **byte-identical** in both repositories. A token travels
in the URL **fragment** — it never reaches a server — and is one of:

| Token | Contents | Made by |
|---|---|---|
| `t.` + base64url(deflate-raw(UTF-8 text)), or `s.` + base64url(text) | the readable text of several puzzles (the generator's Export text), `&active=<n>` after it names the puzzle to show first (1-based) | the generator's **Play** button (`SG.exportUi.buildPlayBundle`) |
| `z.` + base64url(deflate-raw(JSON)), or `j.` + base64url(JSON) | the document of one puzzle | the player's **Share** button, and old generator links |

`SG.exchange.encodeText` / `decodeText` / `isTextToken` / `activeFromHash` are the bundle half of the module.
The document is the generator's puzzle JSON (`format: 'sudoku-generator/v1'`, design.md §14.1 of the
generator) plus the additive block `model = SG.exchange.plain(SG.pipeline.toWire(result).model)`: `variantId`,
`digits`, `units`, `unitMeta`, `cages`, `inequalities`, `layout`, `symbols`, `fixedCells`. What the player reads:
`variantId`, `givens`, `solution`, `model`, `seed`, `symbolMode`, `difficulty {requested, achieved, score,
hardestTechnique, ratingVersion?}`, `generatedAt`, `locale`, `stats.clues`, `wordoku {placement, line}`.
Everything else is ignored, so the generator may add fields.

Difficulty IDs, easiest first, are `veryEasy`, `easy`, `normal`, `hard`, `expert`, `master`, `nightmare`,
`hell1`, `hell2`. Both language packs supply their names and descriptions; text import resolves
the names in either language independently of the player's current language. The generator's rating v2
keeps the v1 document container and adds `difficulty.ratingVersion: 2`. A positive safe integer rating version
is preserved in the compact stored/shared document; missing or unreadable optional metadata is non-fatal.
The player does not re-score imported puzzles, infer a version from a text header, or change legacy scores.
Difficulty and rating version are not part of puzzle identity, so they cannot reset saved progress.
Ids from before rating v2 (`medium`, `veryHard`, `evil`, `nightmare1`, `nightmare2`) are not translated: in a
document an unknown id is dropped, and a puzzle whose requested and achieved levels are both unknown has no
difficulty (its heading shows no level). In an export header the level is matched by name, in either language, so
the old names Medium, Very hard, Evil, Nightmare 1 / 2 (Vietnamese: Rất khó, Địa ngục, Ác mộng 1 / 2) give an
unknown level, while a name that both ladders have (Very easy, Easy, Hard, Expert; Vietnamese Rất dễ, Dễ,
Trung bình, Khó, Chuyên gia) is read as the new level of that name. The page shows only the level name; the
level descriptions exist in both language packs (`difficulty.<id>.desc`) but are not displayed.

At start-up and on `hashchange` the page looks for `#puzzle=<token>` (and `active`); after the puzzles are on
the board the fragment is removed with `history.replaceState`. The generator's link base is
`<meta name="sg-player-url">` there; the player's link back is `<meta name="sg-generator-url"
content="../generator/index.html">` here (a page, not a folder: opened from a disk a folder shows a file listing).
The Share button builds its link from the player's own `<meta name="sg-player-url" content="./index.html">`,
resolved against the address of the page so that the link works anywhere, with `SG.exchange.playerUrl`.

## 6. Play
### 6.1 The game engine (`SG.play.createGame`, pure)
`createGame(model, givens, solution, options)` keeps values and notes as typed arrays and a history of change
records `[cell, oldValue, newValue, oldNotes, newNotes]`, so **undo / redo are exact** (a value and the notes it
cleared come back together). It offers editing (`setValue`, `clearValue`, `erase`, `toggleNote`, `fillNotes`),
checking (`conflicts` — repeated values, cages that cannot reach their sum, unsatisfied signs; `wrongCells`
against the solution; `check`; `progress`), completion (`isSolved`: equals the solution **or** any valid grid),
hints, a timer on an injected clock (`pauseTimer('auto' | 'user')`), and `serialize()` / `restoreGame()`.

**Hints** run `SG.logicalSolver.solve` on the givens plus the player's *correct* entries (wrong entries are
ignored and counted), keep the steps up to the first one that disagrees with the solution, and walk the plan in
three levels: (1) the technique name, its description and the region to look at; (2) the cells involved; (3)
the placement or the eliminations, with the step's explanation. "Fill it in" applies a placement; an
elimination is applied to the notes and remembered. When the solver is stuck the hint says so and offers to
reveal one cell. A hint never suggests a wrong value (tested on all fixtures).

### 6.2 The play UI
Mounted by `play.js` itself into `#play-status` (the status box at the top of the side panel), `#play-root`
(tools: notes, erase, undo, redo, hint, check; the **symbol pad**, touch-sized buttons, up to 6 per row on a
wide screen and one row on a phone (two for more than 9 symbols); a toggle right under the pad that expands the frame to show the **puzzle
actions** — fill in all notes and reveal a cell (a second press confirms), hidden at first so that none is
pressed by mistake; on a small screen the toggle is part of the bar fixed to the bottom —; the hint card; there is no message line, what the game says is announced to screen readers) and
`#options-root`: the **Options** frame, a `<details>` closed at first, with one radio per line for the symbols
(the legend under the board names colours and shapes) and for the check mode, and the notes switch, the same
preferences as in the Settings dialog. Starting a game over is the Reset button of the status box.

**The status box** has the buttons on the left (**Play** while nobody played the game, which starts the clock — a
first move does the same —, **Pause** while it runs, **Resume** after a pause; all three the same bold, filled
button; and the **Reset** button, only while the game is paused (so that it is not pressed by mistake) or solved (to play it again): a first press only asks "Press again", a second
resets and the game is "Play" again), the time on the right, and under them the filled cells and the status line.
Everything follows the game on the board: the timer state is part of the saved game (`pausedBy`), and a running
game that is left for another puzzle is paused first (`SG.play.pauseGame()`, called by `app.placePuzzle` before
the progress is saved), so it comes back paused.

**Small screens (< 768 px)**: the Play / Pause / Reset buttons move (`placeStatus`, at the breakpoint) into the
row of Share and Import, on the left, all of them icons only; the status box (time, filled cells, status line,
small and without a frame) follows on the next line; the tools and the pad are fixed to the bottom of the screen
(`.play__keys`; the page keeps `--play-keys-height` of room under its content), smaller buttons, the pad on one
row; there is no popup. On a wide screen, clicking or tapping a cell opens a **popup** next to it with the keys of
the pad, Notes, Erase and Close, for entering values without leaving the board (the pad of the side panel
stays). Keyboard: arrows and the a11y grid keys move; typing a symbol enters it
(a symbol of two characters, which a model may carry, waits for the second one); `N` or `` ` `` notes, `H` hint,
`Backspace` / `Delete` / `Space` erase, `Ctrl+Z` / `Ctrl+Y` (or `Ctrl+Shift+Z`) undo / redo, `Esc` closes the hint
or the popup. The timer pauses on blur / hidden tab and resumes.
Revealing the whole solution (`game.revealSolution`, an API without a button) marks the game "given up": it is not counted as solved. A solved Wordoku shows its
key word (the word line stays hidden until then) and a card with its meaning when the word book knows the word; a solved game is announced with the time, hints used and cells
revealed, plus a toast.

### 6.3 Symbol modes
`digits` (the labels of the model: 0–9 and A–F for Mega 16, 1–9 and A–C for Mega 12), `letters`, `colors` (palette fill
plus a geometric symbol unless switched off — colour is never the only carrier), `shapes`, `word`
(Wordoku). `SG.modelAids.symbolModes(model)` lists the modes of a board; the importer keeps the document's mode
when the board offers it.

## 7. Saved progress (`SG.progress`)
All storage goes through one safe backend (`SG.store.storage()`): every call in `try/catch`, blocked or missing
storage ⇒ an in-memory map for the session, `QuotaExceededError` ⇒ evict the least recently used entries and
retry, a corrupt value or another schema version ⇒ purged. Nothing throws into the app.

| Key | Contents |
|-----|----------|
| `sg.player.prefs.v1` | `{ v, lang, theme, fontSize, reducedMotion, colorAuxSymbol, check, autoNotes, showCoords }` |
| `sg.player.progress.v1` | `{ version: 1, entries: [{ id, at, symbolMode, percent, solved, state }] }`, LRU 100; `state` = `game.serialize()` (`v: 1`; no variant id, the entry's `id` names the puzzle) with the history cut to the last 300 undo / 100 redo steps |
| `sg.player.puzzles.v1` | `{ version: 1, entries: [{ id, at, doc }] }` (`savePuzzle(id, doc)`), LRU 100, each document ≤ 160 kB, total ≤ 900 kB; newest **added** first (`at` is the time a puzzle was first added; saving or playing it again keeps its place, so the list does not jump while you play). What the list shows is derived when it is read: the variant from the prefix of the `id`, the level from `doc.difficulty.achieved`, the clues from `doc.stats.clues`; a `meta` block stored by an older version is ignored and disappears at the next write |
| `sg.player.last.v1` | id of the puzzle on the board (restored on a reload without a fragment) |

The keys are prefixed `sg.player.` because GitHub Pages serves the generator and the player from one origin
(`tdat00.github.io`), which shares `localStorage`. Progress is saved 400 ms after a change, when the tab hides
and before unload. **Same-puzzle flow**: opening a puzzle whose id has saved progress with at least one entry
asks "Continue" or "Start over"; the recent list and a reload continue without asking. The **Remove all** button of the list (`SG.progress.clear()`)
deletes every `sg.player.` key except the preferences.

## 8. UI / UX
### 8.1 Layout (`css/layout.css`)
- **Welcome state** (no puzzle): what the player is, how to get a puzzle (generator link), an "Import"
  button, the list of imported puzzles.
- **Wide desktop (≥ 1360 px)**: three columns, sized like Sudoku Generator — the list of imported puzzles (left
  panel, with a **Remove all** button; each puzzle has a faded icon, a check for a solved one and a clock for
  one in progress, and keeps its place in the list while it is played) | the summary (title "variant - level
  (Seed: …)", description of the variant, and the **Share** and **Import** buttons) with the board | the side
  panel (status box, tools, pad, hint card, the Options frame).
- **Desktop (≥ 768 px)**: two columns — summary and board with the list under it | the side panel.
- **Mobile (< 768 px)**: one column — the row of buttons (Play / Pause / Reset on the left, Share and Import on
  the right, icons only), the status box, the summary, the board, the Options frame and the list of puzzles; the
  tools and the pad are fixed to the bottom of the screen.
- Header: title, language EN | VI, theme (light · dark · high contrast), Settings, Help (a link that opens
  `help.html` in a new tab).
- Dialogs (`<dialog>` through `openModal`): Import (the paste box, a link to the generator), Share (the link of
  the puzzle on the board), Continue / Start over, the list of skipped puzzles after an import, Settings (language, theme with Automatic, text
  size, reduced motion, symbol on colours, check mode, notes behaviour, coordinates, Reset to defaults). Esc closes, focus returns to the opener.

### 8.2 Opening
The Import dialog and the page-wide drop share one path: read text (files up to 8 MB, the first file of a drop) →
`SG.importer.openMany(text, {source})` → on success `app.openPuzzle` (one puzzle) or `app.importBatch` (several).
Errors are shown in the dialog (or as a toast
when there is none) with the translated issue texts; a failed open never replaces the puzzle on the board. A
dropped file shows a full-page "Drop the puzzle files here" overlay. A paste outside a text field opens the pasted
text (the Import dialog has its own box, `Ctrl+Enter` opens it); dropped *text* opens only when it looks like a
puzzle, so dragging a sentence around the page does nothing. A link from the address bar or the generator opens
without moving the focus (the first `Tab` still reaches the skip link); a puzzle the person opens (dialog,
drop, paste, list) puts the focus on the board.

### 8.3 Help: the guide page
The Help button is a link to **`help.html`**, opened in a new tab: a page of its own (no dialog), with the header
of the player (language and theme switches that change the same stored preferences, so the guide and the player
agree) and a back link. It has four sections — the basics of playing, how the hints work (the hints are part of
the guide), the techniques that solve harder puzzles, the keyboard — and a **table of contents** (a floating
card on a wide screen, folded on a phone) that lists the sections, the eight technique groups and the name of
each of the 40 techniques; the header floats with the scroll as well. In the techniques section every group is a
card with a **tab for each technique** (`role=tablist`, arrow keys, Home / End); the panel of a tab says what the
technique means and shows **one hardcoded example**: a board drawn like the hint card draws it (the area, the
cells that make it work, the cells that change, the note to remove or the digit to place) with the words of
`SG.play.describeHint` in the current language. `help.html#tech-<id>` opens a technique.

**The examples are data, not computed when the page opens.** `js/ui/help-examples.js` (`SG.helpExamples[id]`) is
generated by `node tests/tools/make-technique-examples.js [path-to-generator] [options]` (from `player/`; `--help` lists
the options). An example is a real, reproducible hint replay: the tool plays a **source**, a real puzzle in the text of
the generator's Export box, with the player's own hints (`fillNotes`, then hint + apply, at most `--max-hints` = 400
hints) and keeps, per technique, the example that is easiest to read (fewest cells, removals and candidates; a plain 9x9
board preferred; the earliest on a tie; a Killer cage example needs a cage of at least two cells). Nothing is generated
by default. With no mode (`--check`) it compares the selected IDs (`--ids`, default all) with the saved catalogue
(`--out`, default the committed file), replaying the saved `source.puzzle` of each one, and writes nothing. `--write`
merges the selected snapshots into the complete catalogue: every other ID is kept, every selected ID must have been
found, the whole result is validated against the registry and written once, in registry order, CRLF, without a BOM,
through a partial file of the work directory, so an error leaves the old file. `--sources=<file.json>` names the real
puzzles of each ID (`{schema: 1, sources: {id: [{variantId, level, seed, text}]}}`; only the sources assigned to an ID
are looked at, in their order, so an unrelated puzzle never replaces an unchanged example); `--record-sources=<file.json>`
saves the real source of each selected ID and no catalogue, so that a task that adds two techniques collects each source
alone and writes both together. Only `--discover` (with `--write` or `--record-sources`; never with `--sources` or
`--check`) makes puzzles, through a child process that loads the generator: at most `--max-puzzles` requests of the plan
(narrowed by `--variants` and `--levels` before any request; a failed request counts and is not retried), with its
intermediate file in `--work-dir` (default `tests/artifacts/difficulty-v3/help`, never the system temporary folder),
under an eight-minute deadline (exit code 2 and nothing written). `--max-puzzles` (alias `--puzzles`, default 64) caps the
puzzles generated and replayed. A technique that cannot get a real example within the bound stops the work: its
assertion is never removed and no synthetic example takes its place. The pure part of the tool is
`tests/fixtures/help-example-tools.js` (`SG.fixtures.helpExampleTools`: options, source schema, replay, snapshot, merge,
renderer, bounded discovery), tested by the `help-example-tools` suite with fake generators, clocks and child processes.
The snapshot holds the board (`variant`, `givens`, `values`, the cages or signs), the notes of the
cells shown and the hint (`technique`, cells, targets, placements, eliminations, region), plus `source` (the
puzzle and the step it came from, for the tests only). A Jigsaw example (`variant: 'jigsaw9'`) also holds
`cellRegion`, an owned plain array of exactly 81 region numbers copied from the `model.layout.cellRegion` of the
replayed puzzle, because the variant does not fix the regions; no other variant has the field, and the generated
header documents it only when the catalogue holds a Jigsaw example. `SG.help.buildExample` rebuilds a model from the
snapshot (a Jigsaw one with `SG.textBoards.create(SG.textBoards.jigsawSpec(cellRegion))`, checked with
`SG.model.validate` like an imported board; a missing or malformed map, such as a wrong length or a region that does
not hold nine cells, gives no board, so the page says the example is unavailable, and never the regular 3×3 boxes) and
`SG.play.renderSnapshot` draws it. `help.test.js` checks that every technique has one, that each rebuilds, that
replaying `source` with the hint code of the player gives the same hint (so a change of the solver shows up as a
test failure to regenerate the file), and that the texts exist in both languages. The committed snapshot was made
from puzzles of the previous generator version; only the level labels in their `source.puzzle` were re-labelled by
hand to the rating v2 levels (the puzzles and hints are unchanged). Those puzzles stay the default sources, so
`--check` still reproduces the committed examples; a discovery with the current generator (`--discover`) may give
other examples. **Difficulty v3, MS07b:** the catalogue holds 28 examples. The existing `forcingChain` and `nishio`
examples keep their old real sources (the long and deep windows do not change them: they are the short and the
shallow proofs); `forcingChainLong` comes from a discovery on 12 Nightmare Classic 9×9 puzzles (a 7-link forced chain
at C = 6; the same puzzle gives a 6-link contradiction since MS07c selected C = 4, and the example was written again)
and `nishioDeep` from the
published puzzle Escargot, replayed with the hint code of the player, because a second discovery of 12 Hell 1 puzzles
met no depth-2 proof (the helper never synthesises an example). The combined source map of the four chain ids is
`player/tests/artifacts/difficulty-v3/MS07b/sources.json`; `--check` with it reproduces the committed file.
**Difficulty v3, MS08a:** the catalogue holds 29 examples. `skyscraper` is new: its source is the one of the saved
`simpleColouring` example (Classic 9×9 Hell 1, seed 214), whose replay with the current hint code reaches a
skyscraper hint (the first attempt of the bounded acquisition, so no discovery was needed); the catalogue example of
the same puzzle for `simpleColouring` is a later hint of it. The skyscraper takes some deductions that
Simple Colouring or a chain had, so the replays of five saved sources change: `pointing`, `swordfish` and `xyWing`
only in the number of hints applied before their hint, `simpleColouring` in its snapshot (the same source, a later
hint), and `xyzWing`, whose old puzzle no longer needs one, from another real source of the catalogue (Classic 9×9
Nightmare, seed 11, which also holds the `wWing` example; the four existing sources whose replay reaches an
`xyzWing` hint are in `player/tests/artifacts/difficulty-v3/MS08a/sources.json`, the easiest to read wins). `--check`
without options reproduces the whole committed file.
**Difficulty v3, MS08b:** the catalogue holds 30 examples. `twoStringKite` is new: its source is again the one of the
saved `simpleColouring` and `skyscraper` examples (Classic 9×9 Hell 1, seed 214), whose replay with the current hint
code reaches a kite hint at its step 36 (digit 6, R6 and C2 bridged in box 4); the check of the 21 existing Classic 9×9
sources shows nine that reach one, four of them the sources of the saved colour and chain examples (Hell 1 214,
Nightmare 648, Nightmare 3 and Hell 2 Escargot), so no discovery was needed and the tool took the easiest to read. The
kite takes some deductions that Simple Colouring or a chain had, so the replays of three saved sources change:
`hiddenTriple` and `xWing` only in the number of hints applied before their hint (33 to 34 and 55 to 56), and
`simpleColouring`, whose old source (Hell 1, seed 214) reaches no colouring hint any more (the skyscraper and the kite
come first), from another real source of the catalogue (Classic 9×9 Nightmare, seed 648, the source of the
`forcingChain` example; the three existing sources that reach a colouring hint are in
`player/tests/artifacts/difficulty-v3/MS08b/sources.json`, the easiest to read wins). `--check` without options
reproduces the whole committed file.
**Difficulty v3, MS08c:** the catalogue holds 31 examples. `emptyRectangle` is new: its source is again one of the saved
Classic 9×9 sources, Hell 1, seed 214 (the source of the saved `twoStringKite` example), whose replay with the current hint
code reaches an empty rectangle hint at its step 23 (digit 8, box 5, arms in R6 and C4, the pair of the column C7 with the
ends R6C7 and R7C7); the check of the 21 existing Classic 9×9 sources shows four that reach one (Nightmare 1156, 692 and
828 and Hell 1 214), the source of the saved example first, so no discovery was needed and the tool took the easiest to
read. The empty rectangle takes some deductions that a chain or a kite had, so the replays of four saved sources change:
`hiddenSingleBox` and `hiddenTriple` only in the hint taken or in the number of hints applied before it (steps 58 to 50 and
34 to 31, the same sources), `twoStringKite` (Hell 1, seed 214, step 36 to 37) and `skyscraper`, whose old source (Hell 1,
seed 214) reaches no skyscraper hint any more, from another real source of the catalogue (Classic 9×9 Hard, seed 18, step
26; the nine existing sources that reach a skyscraper hint, led by the sources of the saved colour and chain examples, are
in `player/tests/artifacts/difficulty-v3/MS08c/sources-skyscraper.json`, the easiest to read wins). `--check` without
options reproduces the whole committed file.
**Difficulty v3, MS09a:** the catalogue holds 32 examples. `finnedXWing` is new: its source is one of the saved Classic
9×9 sources, Nightmare, seed 1156, whose replay with the current hint code reaches a finned X-Wing hint at its step 32
(digit 5, base lines R5 and R9, covers C5 and C7, the fin R9C6; R8C5 loses the 5); the check of the saved Classic 9×9
sources shows six that reach one (Nightmare 1156, 648, 828, 11 and 1427 and Hell 1 8), and the tool took the one with
the easiest example to read (`player/tests/artifacts/difficulty-v3/MS09a/sources.json` lists the six). The finned
X-Wing takes some deductions that other techniques had, so the replays of six saved sources change only in the step
number of their hint (`hiddenSingleBox` 50 to 52, `xyzWing` 32 to 33, `wWing` 43 to 44, `uniqueRectangle` 45 to 47,
`forcingChain` 48 to 49 and `nishio` 17 to 18, the same sources). `--check` without options reproduces the whole
committed file.
**Difficulty v3, MS09b:** the catalogue holds 33 examples. `finnedSwordfish` is new: the check of the saved Classic 9×9
sources shows four whose replay with the current hint code reaches a finned Swordfish hint (Nightmare 648, 1156 and 3,
and Hell 2 escargot; `player/tests/artifacts/difficulty-v3/MS09b/sources.json` lists them), and the tool took the one
with the easiest example to read: Nightmare, seed 3, step 18 (digit 8, base lines R5, R7 and R8, covers C1, C5 and C7,
the fins R5C8 and R5C9; R6C7 loses the 8). Two saved examples keep their board and hint and are made again from their
own sources, which only moves their step numbers (`simpleColouring` 24 to 25 and `nishioDeep` 5 to 2). The tests
pin 33 (the catalogue, the user guide's "one of 33 techniques", the translated technique names) and the Player's quick
set is 2,171 tests. `--check` without options reproduces the whole committed file.
**Difficulty v3, MS10a:** the catalogue holds 34 examples. `remotePairs` is new (registered at order 116, between the
two-string kite and Simple Colouring, so that a normal hint reaches it: after the naked pairs are done, every Remote
Pairs deduction on a standard board is also a Simple Colouring deduction, and the ladder names the simpler pattern
first). Its example is a normal hint of the corpus puzzle `testkit-4242-254` (a seeded Classic 9×9 puzzle of the
Generator's test kit, original givens, no level in its header), step 30: digits 2 and 9, ends R6C9 and R9C2, a chain of
three links, R9C9 loses the 9; `player/tests/artifacts/difficulty-v3/MS10a/sources.json` lists the eight lowest
qualifying corpus puzzles and the tool took the first that reaches the hint through `game.hint()`. A Remote Pairs
deduction takes the place of a later deduction on some trajectories, so one earlier example is made again from its own
source: `xWing` (Hell 1 seed 644: step 56 to 53, one more elimination, R9C1 and R9C8 lose the 8); every other example
is reproduced as it was. The tests pin 34 (the catalogue, the user guide's "one of 34 techniques", the translated
technique names) and the Player's quick set is 2,338 tests. `--check` without options reproduces the whole committed
file.
**Difficulty v3, MS10b:** the catalogue holds 35 examples. `wxyzWing` is new (registered at order 155, between XYZ-Wing
and W-Wing). Its example is a normal hint of the catalogue's existing source Nightmare 13 (a seeded Classic 9×9 puzzle of
the Generator's export), step 37: digits 1, 4, 7 and 9, the 9 is the digit that is not restricted, cells R2C7, R3C8,
R4C7 and R6C7, R6C8 loses the 9; `player/tests/artifacts/difficulty-v3/MS10b/sources.json` lists the eight wing and
chain sources that were replayed (six of them reach the technique; the tool keeps the first hint that is the easiest to
read). A WXYZ-Wing deduction takes the place of a later deduction on some trajectories, so the 34 earlier examples were
checked first and twelve differed: seven are made again from their own sources (`hiddenSingleBox`, `hiddenSingleLine`,
`twoStringKite`, `remotePairs` (step 30 to 31), `jellyfish` (33 to 30), `wWing` and `forcingChain` (49 to 54)) and five
no longer have a hint of their own technique on their own source, so each moved to another real source of the
catalogue (the guide's own rule: the own source is a preference, not a lock): `nakedPair` (Nightmare 176, step 38),
`finnedXWing` (Nightmare 648, step 26), `xyzWing` (Nightmare 70, step 21), `uniqueRectangle` (Nightmare 70, step 29)
and `forcingChainLong` (Nightmare 75, step 27); the failed own-source checks, the candidate puzzles of every trial and
the final check of all 35 are kept in `docs/difficulty-v3/evidence/MS10b/logs/`. The tests pin 35 (the catalogue, the
user guide's "one of 35 techniques", the translated technique names) and the Player's quick set is 2,338 tests.
`--check` without options reproduces the whole committed file.
**Difficulty v3, MS11a:** the catalogue still holds 35 examples. The Unique Rectangle now has types 3 and 4 (the
`technique.uniqueRectangle.type3.step` and `.type4.step` texts, which the real unique positions of the shared tests
and the render tests of both apps cover); its own example is the normal hint of the catalogue source Nightmare 70, step
29, a type 1 deduction that keeps priority over the new subtypes, and it is reproduced as it was (one example per
ID, not per subtype; `sources.json` of `player/tests/artifacts/difficulty-v3/MS11a/` names that one source and the
tool's `--write` then `--check` leave the file unchanged). The new deductions take the place of later ones on some
trajectories, so all 35 examples were checked first and two differed: `forcingChainLong` is made again from its own
source (Nightmare 75: step 27 to 29, the notes of two cells differ), and `remotePairs` no longer has a hint of its own
technique on its own source (`testkit-4242-254`), so it moved to another real source of the catalogue after the three
slices of the 21 distinct classic9 sources had been tried (the first and the last have no Remote Pairs hint; the
second, the sources of Nightmare 989, Hell 1 644 and 214, `testkit-4242-254`, Nightmare 648, 561, 3 and 828, has one,
Hell 1 644): its example is a normal hint of Hell 1 seed 644, step 52. No synthetic snapshot, disabled earlier
technique or weakened assertion was used; the failed own-source attempts, the three trials and the final check of
all 35 are kept in `docs/difficulty-v3/evidence/MS11a/logs/`. The Player's quick set is 2,412 tests. `--check`
without options reproduces the whole committed file.
**Difficulty v3, MS11b:** the catalogue still holds 35 examples. The Unique Rectangle now has a hidden form (the
`technique.uniqueRectangle.hidden.step` text in both languages, which the real unique positions of the shared tests and
the render tests of both apps cover); its own example is unchanged, the normal hint of the catalogue source Nightmare
70, step 29, a type 1 deduction that keeps priority over the later subtypes (one example per ID, not per subtype;
`sources.json` of `player/tests/artifacts/difficulty-v3/MS11b/` names that one source, and the task's `--write` then
`--check` leave the file as it was). The new deductions take the place of later ones on some trajectories, so all 35
examples were checked first and one differed: `emptyRectangle` on its own source (Hell 1 seed 214) has the same
snapshot and the same hint but is now step 24 instead of 23, so it was made again from its own source (`--ids=emptyRectangle
--write`, one field, `source.step`); no catalogue discovery or other source was needed, and no synthetic snapshot,
disabled earlier technique or weakened assertion was used. The first check, the own-source write, the task's command and
the final check of all 35 are kept in `docs/difficulty-v3/evidence/MS11b/logs/`. The Player's quick set is 2,459 tests.
`--check` without options reproduces the whole committed file.
**Difficulty v3, MS11c:** the catalogue holds 36 examples. `bugPlusOne` (BUG+1) is new (registered at order 182, between the
Unique Rectangle and the Forcing Chain; it places the one cell that a bivalue universal grave leaves with three candidates,
and it needs a unique solution). Its example is a normal hint of the Generator's own test-kit puzzle `testkit-4242-14`
(puzzle 14 of the seeded corpus of seed 4242, a Classic 9×9 board without a level; the `sources.json` of
`player/tests/artifacts/difficulty-v3/MS11c/` names it with the provenance header `#1,Classic Sudoku 9x9,,testkit-4242-14`),
step 40 of 57: R9C8, whose candidates are 2, 7 and 8, is the 2 (a single highlighted cell: the proof is global and
concerns every unit, not a region). The new technique takes the place of heavier ones on some trajectories, so all 35
earlier examples were checked first and **none differed** (the sources and hints are unchanged); no discovery batch,
synthetic snapshot, disabled earlier technique or weakened assertion was used. The first check, the write and the check
of the new ID, and the final check of all 36 are kept in `docs/difficulty-v3/evidence/MS11c/logs/`. The tests pin 36 (the
catalogue, the user guide's "one of 36 techniques", the translated technique names) and the Player's quick set is 2,529
tests. `--check` without options reproduces the whole committed file.
**Difficulty v3, MS12:** the catalogue holds 37 examples. `xyChain` (the restricted XY-chain, registered at order 186, between
BUG+1 and the Forcing Chain) is new, and the XY-chain takes the place of a heavier forcing-chain step on many trajectories,
so all 36 earlier examples were checked first (`docs/difficulty-v3/evidence/MS12/logs/gh-check-36-1.txt`): 33 matched,
`forcingChain` differed (22 fields on its own source) and `nakedTriple` and `jellyfish` no longer had a hint of their own
technique on their own source. The order of the work was fixed beforehand: `xyChain` from the existing forcing-chain
sources (`player/tests/artifacts/difficulty-v3/MS12/sources-xy-existing.json`, four sources; the tool takes the easiest
example: Hell 1 seed 8, step 28, digit 1, cells R3C1, R6C1, R6C6, R8C1 and R8C6, R4C1 loses the 1), `forcingChain` made
again from its own source (Nightmare 648, step 54 to 30: R8C5 loses the 9), `nakedTriple` from the recorded candidate sources
of the catalogue (`sources-refresh.json`, 27 puzzles; Hell 2 escargot, step 30: R1C4, R1C5 and R3C6, R3C5 loses the 3).
**`jellyfish` could not be made again from any of the catalogue's puzzles**: its hint is reached on no solving path of the
27 catalogue sources, the 2 Jellyfish positives and the 123 other unique puzzles of the test fixtures (13 of them give no hint at all), the 17 other puzzles that
earlier tasks used as sources, or 48 Generator puzzles of four discovery batches of twelve (classic9 Nightmare, Master,
Hell 1 and Hard, seeds 1 to 12), and the `help` test that replays every example with the hint code of the player failed on
it. The owner's decision S-OD10 (JF-01) allowed one bounded corpus scan through the same tool: the original givens of the
test-kit corpus of seed 4242 (the same corpus as `testkit-4242-14`), indices 0 to 19,999 in ascending order, materialized
once (`logs/jf-corpus-materialize.txt`, 80,000 constructed states, 14.9 s, checked against the nine earlier
`testkit-4242-*` sources: identical), replayed in chunks of 64 with 400 hints at most. **The first chunk with a Jellyfish
hint was 5312-5375 (84 chunks, 0 to 5,375 replayed, 5,376 puzzles): `testkit-4242-5335`**, the export header
`#1,Classic Sudoku 9x9,,testkit-4242-5335` (level empty, as the corpus has none; 26 givens, one solution), after 52 of its 83 hints:
the base rows R3, R6, R7 and R9 and the columns C1, C2, C7 and C8, R5C8 loses the 8. The scan stopped there (no further puzzle
was acquired); the chunk ledger is `docs/difficulty-v3/evidence/MS12/jellyfish-scan-chunks.jsonl`. The final check of all
**37** passes. The tests pin 37 (the catalogue, the user guide's "one of 37 techniques", the translated technique names) and
the Player's quick set is 2,607 tests. No synthetic snapshot, disabled earlier technique or weakened assertion was used.
`--check` without options reproduces the whole committed file.
**Difficulty v3, MS13a (inactive proof graph):** the catalogue still holds the same 37 examples and none changed. The grouped
chain graph of MS13a (`SG.chainGraph`, `core/js/engine/tech-chain.js`) is **inactive**: no hint, help example or rating
reads it, so the check of all 37 examples on the final source (`--check --max-puzzles=64 --max-hints=400`, no discovery,
nothing written) matches the committed file, and the Player's quick set is 2,647 tests (the 40 `grouped graph` tests of the
shared `tech-chain` suite and the `chain-proofs` fixture are the only addition).
**Difficulty v3, MS13b (group proofs in the hint text):** the hint card reads the chain proofs of **version 2**, still emitted by no
finder. `SG.play.localizeArgs` (used by `describeHint`) returns a copy of a step's arguments, never written, in which the cells of
every chain node `{ cells, digit, truth }` are labels and its digit the symbol that the board draws (a hexadecimal 1 is 0, a
Wordoku value its letter), in a node and in an old triple `[cell, digit, truth]` alike. The text (`formatChains` of
`js/ui/i18n.js`) writes a one-cell node like its triple, a **true group** as the disjunction of its members, `(R1C1=5 ∨ R1C2=5)`,
and a **false group** as every member false, `(R1C1≠5 ∧ R1C2≠5)`. The cells line and the marks of the board stay the hint's
`cells`, the Finding's own list (MS13c emits the full union of the proof's cells; nothing is derived from `chains`); the
DOM and SVG marking was inspected in the code, not run. The texts of the Forcing Chain and the Long Forcing Chain changed in both
languages: the descriptions explain a group conditionally ("If a proof step represents a group ..."), the endpoint rule
(a candidate must conflict with every candidate represented by each end) and that a hint does not promise every chain, and the
three step explanations speak of ends and of a statement about a candidate or group (32 texts across both apps,
`docs/difficulty-v3/evidence/MS13b/locale-delta.md`). The check of all 37 help examples on the final source is unchanged (no
discovery, nothing written), and the Player's quick set was 2,658 tests at that task (the 11 new tests of `play` and `i18n`). GC-01 was still
open at that task, which added no cap or fallback (the owner decided it afterwards, option A, S-OD11; MS13c implements it).

**Difficulty v3, MS14a (the Law of Leftovers kernel, inactive when it was written; MS14b registers it, below):** the shared engine gained `SG.leftoverPatterns` (`core/js/engine/tech-subset.js`), which no Player code, hint, technique list, locale text or help example reaches: it is unregistered, so the Player's hint ladder, the help dialog and the 37 examples are exactly as before (the check of all 37 on the final source is unchanged, no discovery, nothing written). The Player only runs the new tests of `tech-subset` (40, with the shared fixture `core/tests/fixtures/jigsaw-models.js` that its `tests.html` loads), so its quick set is 2,698 tests. GC-01, still open in the paragraph above, was resolved by the owner after MS13b (S-OD11) and implemented by MS13c, below. The kernel, its rulings and its evidence are in `generator/design.md` §6.6 and `docs/difficulty-v3/evidence/MS14a/evidence.md`.

**Difficulty v3, MS13c (the grouped forcing is active):** `forcingChain` and `forcingChainLong` now search the shared grouped graph, so a hint of either can be a version-2 proof (`stepArgs = { proofVersion: 2, kind, length, chains }` with nodes `{ cells, digit, truth }`), written by `formatChains` and `SG.play.localizeArgs` as the MS13b paragraph above describes and marked with the Finding's own full `cells` (the sorted union of the nodes). Only the short ID falls back, to the complete singleton search, after a local cap of its bounded attempt (4,096 additional nodes and one work allowance of 50,000 units shared by the construction and the search); that fallback has **no local work limit** (the parent budget, cancellation and the windows stay in force, so nothing else changes for the Player) and **certifies only the singleton-graph minimum** (a shorter proof with groups may exist); there is no fallback after a spent parent budget, cancellation, an error, a completed negative or an empty window, and the long ID has none (a cap is its null); a pure singleton proof keeps its legacy triples. A real grouped hint (puzzle #1375 of the long-chain list: its tenth hint is a Long Forcing Chain contradiction of 6 links with a group) is played through `SG.play.createGame`, described in both languages and checked in the new `play` test; the hint code of the Player is otherwise unchanged. The help catalogue keeps its 37 examples on the final source: `nakedTriple` (hint 30 to 31), `xWing` (53 to 60), `remotePairs` (52 to 59) and `forcingChain` (another proof from its own puzzle, Nightmare 648) are made again from their own sources, and `xyChain` (Nightmare 176), `nishio` (Hell 2 escargot) and `jellyfish` (the test-kit puzzle `testkit-4242-8657`, found by scanning the first 8,704 puzzles of the seed 4242 corpus) come from other real sources because their own no longer reaches them (the jellyfish scan used the corpus route of S-OD10, which was approved for MS12 only; it lacked authorization when it was performed and was **approved retroactively by the owner for MS13c only**, S-OD12, JF-02 option A, 2026-11-17 13:46; case-by-case permission, S0, remains the standing rule and no later task inherits the route); the other 30 are unchanged. The Player's quick set is 2,722 tests (the 23 new tests of the shared `tech-chain` suite and the new `play` test). The engine, the cost and cap measurements and the evidence are in `generator/design.md` §6.6 and `docs/difficulty-v3/evidence/MS13c/evidence.md`.

**Difficulty v3, MS14b (the Law of Leftovers is registered):** `lawOfLeftovers` (Jigsaw 9 only, weight 200, `generator/design.md` §6.6) is now a technique of the shared engine, so the Player's hint ladder can give it on a Jigsaw board, and no other board lists it. Its hint names the lines and the regions (`stepArgs = { lines, regions, cells, digits }`, written `R8` and `J8`, the regions of a Jigsaw being labelled `J1` to `J9`), highlights the left-over cells and removes candidates; no single unit holds all of its cells, so `regionOf` is null and the hint takes the text of a hint with no single region. The name, description and step text exist in English (*Law of Leftovers*) and Vietnamese (*Luật phần dư (Law of Leftovers)*) in both apps, with the same placeholders. The help catalogue holds **38 examples**: the 37 earlier ones are unchanged (the check of all 37 on the final source, `--check --max-puzzles=64 --max-hints=400`, no discovery, matches the committed file) and the new one comes from a real Jigsaw puzzle found by one bounded discovery batch (`jigsaw9`, Hard, 12 requests, seeds 1 to 12, 400 hints; hints appear in seeds 1, 5 and 9 and seed 5 is the easiest to read; the source is `player/tests/artifacts/difficulty-v3/MS14b/sources.json`): after 22 applied hints the lines R8 and R9 and the regions J8 and J9 leave R7C6, R7C7, R7C9, R8C1, R8C2 and R9C1, and the 4 is removed from R8C2; the snapshot carries the puzzle's own `cellRegion` and the check of all 38 matches the committed file. The tests: `help` 27 to 28 (the example is on real irregular regions, its two lines and two regions leave sides of equal size whose cells are exactly the hint's, readable in both languages; and the replay of every example now also compares a Jigsaw example's `cellRegion` with the regions of its own source, cell by cell), `help-example-tools` (51, two pins that said that no example had a `cellRegion` now say that only the Jigsaw example has one), `i18n` 74 to 75 (the step is rendered in both languages from the real fixtures), `ui-contract` 62 to 63 (every fixture file of the core and of the Player is listed in `tests.html`) and the 28 new shared tests, so the Player's quick set is 2,753 tests; the guides say 38 techniques and `help.test.js` pins 38. The evidence is in `docs/difficulty-v3/evidence/MS14b/evidence.md`.

**Difficulty v3, MS14c (the two Killer cage interactions, tests only):** the Player's hint ladder gives a Killer hint of `cageCombo` as before; no Player code, technique, locale text, hint wording or help example changed, and the help catalogue stays at **38 examples** (the check of all 38 on the final source, `--check --max-puzzles=64 --max-hints=400`, no discovery, nothing written, matches the committed file). The ordinary required digit locked to a unit and the two-cell Killer pair are the pointing step of `cageCombo` (`generator/design.md` §6.6), so no `cageLocked` technique exists. The Player runs the new shared suite `core/tests/suites/tech-cage.test.js` (33 tests; its `tests.html` lists it), which builds its own boards with `SG.model.create` and switches the cage propagation on for a variant id of its own, so its quick set was 2,786 tests in 31 suites at that task. The evidence is in `docs/difficulty-v3/evidence/MS14c/evidence.md`.

**Difficulty v3, MS15a (the bounded almost-locked-set enumerator, inactive):** the shared engine gained `SG.alsPatterns` (`core/js/engine/tech-als.js`, listed in the Player's `index.html`, `help.html`, `tests.html` and `tests/node-runner.js` after `tech-chain.js`), which lists the almost-locked sets (*k* open cells of one unit with exactly *k* + 1 candidate digits, at most 4 cells, at most 4,096 records, with a shared per-call work guard of 50,000 units; `generator/design.md` §6.6 has the contract). **It is inactive:** no technique id, hint, help example, locale text or rating reads it, so the Player's hint ladder, its 38 help examples (the check of all 38 on the final source, `--check --max-puzzles=64 --max-hints=400`, no discovery, nothing written, matches the committed file) and every canonical output are unchanged. The Player runs the new shared suite `core/tests/suites/tech-als.test.js` (58 tests; its `tests.html` lists it), so its quick set is 2,844 tests in 32 suites. The evidence is in `docs/difficulty-v3/evidence/MS15a/evidence.md`.

**Difficulty v3, MS15b (ALS-XZ is registered):** `alsXz` (group `chain`, order 194 between the Forcing Chain and the Long Forcing Chain, weight 1,250, every variant, no uniqueness assumption; `generator/design.md` §6.6 has the contract) is a new technique of the shared engine, so **the Player's hint ladder reaches it**: a hint names "ALS-XZ", shows the cells of the two almost locked sets and removes the second digit from the cells that see all the cells of both sets that hold it, in both languages (`technique.alsXz`, `.desc`, `.step` in the Player's locale packs; the step text takes the two digits and the cells). The help catalogue is **39 examples**: the new example is a real Classic 9 x 9 puzzle (Hell 1, seed 644, hint 18 of the normal ladder: ALS-XZ on 5 and 1, cells R1C2, R4C3, R7C2 and R9C3, the 1 removed from R3C3), and four earlier examples were refreshed from the normal ladder because the new technique changed their puzzles' hint sequences (`forcingChainLong` from another saved source, Hell 1 seed 214, hint 23; `xWing`, `remotePairs` and `xyChain` each one hint later); the complete check of all 39 on the final source (`--check --max-puzzles=64 --max-hints=400`) matches. The Player runs the shared `tech-als` suite (111 tests), and the pins of the help suite and of the user guide ("one of 39 techniques") moved from 38 to 39, so its quick set is 2,906 tests in 32 suites. The evidence is in `docs/difficulty-v3/evidence/MS15b/evidence.md`.

**Difficulty v3, MS16 (Sue de Coq is registered):** `sueDeCoq` (group `chain`, order 196 right after ALS-XZ, weight 1,300, every variant, no uniqueness assumption; `generator/design.md` §6.6 has the contract) is a new technique of the shared engine, so **the Player's hint ladder reaches it**: a hint names "Sue de Coq", shows the cells of the crossing of a row or column with a box or region, of the two almost locked sets and the removals, in both languages (`technique.sueDeCoq`, `.desc`, `.step` and `.step.extra` in the Player's locale packs; the step text takes the line, the box and the digit lists, and the longer form the left-over digit). The help catalogue is **40 examples**: the new example is a real Classic 9 x 9 puzzle (Nightmare, seed 377, hint 19 of the normal ladder: a Sue de Coq on R1C1, R1C2, R2C2, R3C1, R3C2 and R4C2 that removes the 4 from R1C3 and the 4 and 6 from R2C3), the one puzzle whose generation changed in the E recording; none of the 39 earlier examples moved (the complete check of all 40 on the final source, `--check --max-puzzles=64 --max-hints=400`, matches). Sue de Coq is rare: none of the 27 saved example sources reaches it. The Player runs the shared `tech-als` suite (174 tests), and the pins of the help suite and of the user guide ("one of 40 techniques") moved from 39 to 40. The evidence is in `docs/difficulty-v3/evidence/MS16/evidence.md`.

**Decision:** there is no
first-visit tour or other popup that stands in front of the welcome screen or the puzzle: a visitor who arrives
from the generator's link wants to play.

### 8.4 Accessibility
Skip link to `#main`; the board `<svg>` is `role="grid"` with `role="row"` / `gridcell`, roving tabindex and a
translated label per cell ("Row 4, column 7, value 5, given", cage sums and signs included); arrow keys, Home,
End, Ctrl+Home / End, Page Up / Down move between real cells. `#a11y-live` announces entries, errors, hints and
completion (no timer ticks). Dialogs trap focus and restore it; toasts and the live region stay audible inside a
modal: while a dialog is open the toasts are placed under its panel, never over its buttons, and a message that
is already on screen is not stacked twice. The entries of the player live in their own SVG layer, so the cell
carries a `data-user` attribute that the grid labels read ("value 5" instead of "empty"). Contrast ≥ 4.5 : 1 text, ≥ 3 : 1 lines / focus ring, 7 : 1 text in the high-contrast theme (computed from
the tokens by `theme.test.js`). `prefers-reduced-motion` and the Settings switch turn every animation off.
No real screen-reader run has been done (§11).

### 8.5 Theming
`css/tokens.css` + `css/tokens-board.css` define three themes on `<html data-theme>` (`light`, `dark`,
`high-contrast`); `auto` removes the attribute so `prefers-color-scheme` rules. A small inline script in
`index.html` applies the stored theme, motion and text size before the stylesheets paint.

## 9. Internationalisation
`SG.i18n.t(key, args)`, `{placeholders}`, plural keys `_one` / `_other`, `data-i18n` / `data-i18n-attr` in the
HTML, `<html lang>` follows the language. Language: `?lang=` → stored preference → `navigator.languages` → `en`.
Locale packs are plain JS (`SG.locales.en / vi`) plus **fragments** (`SG.localeFragments.push({en, vi})`) that
every module appends to its own file. Both languages have identical key sets and placeholders and no empty
value; `i18n.test.js` computes the keys the code uses from the source text (every `t('…')`, `data-i18n`, error
code, technique id and variant id) and checks they exist. Groups kept from the generator: variant names,
difficulty names and descriptions (the nine levels; the page shows only the names), technique names / descriptions / step texts, unit kinds, symbol modes, a11y / theme / help
strings; added: `player.*` (shell, open flow, info card, recent list, welcome), `import.*`,
`error.exchange.*`, `play.*`.

## 10. Testing
`node tests/node-runner.js` (32 suites: the 14 of `tests/suites/` and the 18 shared ones of `core/tests/suites/`;
2,978 tests; no install) is the default quick set: developers and coding
agents run it (or a few suites with `--suite=`) while developing, and `.github/workflows/pages.yml` runs all of it
before every deployment. When one command cannot hold the whole set, it is covered by disjoint shards as the
generator's quick set is (`generator/design.md` section 15.1); the cost measured for each app, on a named source and
machine (a report, not a promise), is in `docs/difficulty-v3/recovery-quick-cost.md`. The runner also takes `--filter=text` (a case-insensitive part of the full name
"suite > describe > test"), `--exact="<full name>"` (every test of exactly that name; not with `--filter`),
`--list-tests=<file.json>` (register the selected suites as a run does, write the inventory, run no test, hook or
benchmark) and `--results=<file.json>` (run, and also write the result of every selected test); the two file
options take a new project-relative `.json` path inside the repository, never overwritten, and are implemented by
`../core/tests/node-evidence.js`, shared with the generator (rows `{ suite, ordinal, fullName, kind, skipped,
timeoutMs }` with a source fingerprint; see `generator/design.md` section 15.1). `tests.html` runs the same suites in a browser (the suites that read
`tests/fixtures/puzzles/*.json` need `http://`, they skip themselves on `file://`). The slow checks are the
**browser scripts** of `tests/browser/` (last row of the table; `node tests/browser/run-all.js`, several minutes):
they are **manual**, not part of CI, and are run only when a change touches the UI.

| Suite | What it checks |
|-------|----------------|
| `bits`, `model`, `constraints`, `solver` | foundation, the model (V1–V8, classic builder), propagation, DFS (ported) |
| `harness` | the test harness itself (`expect`, deep equality, the runner and its isolation) |
| `techniques`, `tech-*`, `logical-solver` | the 40 techniques: positive / negative fixtures, soundness against known solutions (the sweep of `techniques` runs it for every registered technique, with real supplemental positions for the skyscraper, the two-string kite, the remote pairs, the empty rectangle, the finned X-Wing, the finned Swordfish, the WXYZ-Wing, BUG+1, the restricted XY-chain, the ALS-XZ, Sue de Coq, the long and the deep chain techniques and, on real Jigsaw boards, the Law of Leftovers), the solver loop (ported; a small test kit stands in for generation); the shared `tech-chain` suite also tests the **inactive** grouped chain graph `SG.chainGraph` against its independent checker `SG.chainProofs` (MS13a, 40 tests: no hint, no help example and no rating reads the graph, so the player's hints are unchanged); the shared `tech-als` suite (174 tests: MS15a's 58, MS15b's 53 and MS16's 63) tests the almost-locked-set enumerator `SG.alsPatterns.enumerate` (its records against an independent enumeration of all subsets, its work counts against a recount that re-implements the engine's walk), the **active** ALS-XZ `alsXz` and the **active** Sue de Coq `sueDeCoq` (the proof by hand, the first witness and every elimination against an independent oracle and the exact solver, the shared work guard of ALS-XZ and the private guard of Sue de Coq, the caps, the parent budget and the observer record) |
| `exchange` | token round trips (documents and text bundles), the active puzzle of a link, errors (shared, byte-identical) |
| `importer` | all 18 fixtures rebuild valid models with exactly one solution; tokens, links, bundles (`t.` / `s.`, `active`); text lines (4 / 6 / 9); the nine level names in both languages and rating metadata; wrong version, damaged and hostile input, fuzzed damage |
| `model-aids` | sign edges, word line, symbol modes |
| `fixtures` | the committed documents themselves: all 15 variants and the three Vietnamese ones, each with a model that builds and has one solution |
| `text-boards` | the boards rebuilt from the text export equal the generator's models; the Jigsaw builder checks the length of a region map and the model validation the regions |
| `wordbook` | the data of both languages and the lookup (meaning in the language of the page) |
| `i18n` | key parity, placeholders, no empty values, coverage computed from the code; the text of the chains of proof version 2 and the group-correct wording of the two forcing chains (MS13b) |
| `store`, `progress` | prefs, safe storage, LRU, version purge, quota, blocked storage, same-puzzle id, recent list |
| `play` | the engine on all 15 fixtures: values, notes, exact undo / redo, conflicts, completion, hint soundness, timer, serialisation; the key reader, pad and note layouts; `localizeArgs` and `describeHint` on the independent checker's group proofs (hexadecimal and Wordoku symbols, written labels, ownership, the cells line and the eliminations; MS13b) |
| `symbols`, `board-view` | glyphs per mode, the legend, the 16 shapes; geometry and markup of all 15 fixtures (cells, layers, cages, signs, no colour literal) |
| `a11y`, `theme` | cell labels, keyboard moves, the Settings data; token parity and contrast |
| `app` | the surface and events of `SG.app`, the elements it needs from `index.html`, no HTML built from data, storage only through `store` / `progress` |
| `help` | the sections, texts in both languages, an example for each of the 40 techniques (rebuilt from the snapshot, replayed with the hint code, readable in EN and VI; a Jigsaw example's `cellRegion` equals the regions of its own source), a real Jigsaw puzzle whose hint is snapshotted by the helper, rebuilt with its own regions, notes and move, and refused when its `cellRegion` is missing or malformed, the Law of Leftovers example on real irregular regions, shortcuts against the keys `play.js` handles, the claims of the Player part of the user and developer guides |
| `help-example-tools` | the help-example tool (§8.3): options and their conflicts, the source schema, the cap on puzzles and hints, replaying a saved source with the hint code of the player, the choice and tie rule, the owned `cellRegion` copy of a Jigsaw snapshot (and none in any other), the merge and the CRLF text of the catalogue, bounded discovery and the child process with fakes; in Node real runs of the tool on saved sources and sandbox catalogues (never generating, never writing the committed file) |
| `ui-contract` | module surface, no colour literals outside the token files, script order of `index.html` = runner = `tests.html` (and `help.html` = runner minus its exceptions), every fixture file of the core and of the Player listed in `tests.html` and only those, no hard-coded text in either page, forbidden globals absent, no DOM in `js/core` |
| browser run (manual) | `tests/browser/*.js`: headless Edge over CDP (fragment, paste, file, drop, play with real key events, hints, reload, keyboard-only walk, Settings, the guide page with its tabs and floating contents, themes, 1440 / 900 / 375 px with touch, blocked storage); recorded in `docs/qa/browser-run.md` |

The fixtures were made by the generator (`docs/puzzle-exchange/fixtures.md`); the test kit (`tests/fixtures/testkit.js`) holds a
seeded RNG, a random solved grid (the DFS solver with a random value order) and a minimal clue remover so the
ported solver suites can still build puzzles with a known unique solution. It is test-only and never loaded by
the app.

## 11. Risks and limits
- **Document drift**: the generator may change its document; the player ignores unknown fields and refuses
  another `format` version with a clear message. The fixtures come from a generator revision (`docs/puzzle-exchange/fixtures.md`).
- **Hostile input**: everything that arrives is data; sizes are bounded before any loop, errors are issues, and
  `tests/suites/importer.test.js` fuzzes damaged documents. There is no `eval`, no HTML injection (text is set
  with `textContent`), the token never leaves the browser.
- **Storage**: blocked, full or corrupt storage degrades to memory-only play; saved history is trimmed.
- **Large boards on phones**: Samurai / Mega 16 cells are small on a 375 px screen (the board scales, the pad is
  full width); a zoomable board is an idea, not built.
- **Hints** can only explain the 30 known techniques; a position that needs more says "stuck" and offers to
  reveal a cell.
- **Not done**: a real screen-reader run, Firefox / Safari, a real phone, a long-session performance profile.
