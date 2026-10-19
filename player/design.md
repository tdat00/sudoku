# Sudoku Player — Design Document

> The player is the second half of a split project. **sudoku-generator** makes Sudoku puzzles (15 variants, a
> logical difficulty rating, a step-by-step replay of how each puzzle was made). **sudoku-player** — this
> repository — opens such a puzzle in a browser and lets people **play** it. The only coupling between the two
> is a file format and a link token (§5). This document says what the player is, how it is built and why;
> `task.md` is the work breakdown and its status, `README.md` the user's entry point.

## 1. Goals and non-goals

### 1.1 What it is
A **static web app** (HTML, CSS, JavaScript; no build step, no npm, no framework) that receives a puzzle made by
sudoku-generator and plays it:

- Opens puzzles from the **link** the generator's **Play** button builds (`…/#puzzle=<token>&active=<n>`: every
  puzzle of the generator's list, the one on screen first; the button sits next to the **Export** buttons at the
  top right of the generator's main panel), from **pasted text** or a dropped text file (the generator's Export text, or one
  line of 16 / 36 / 81 characters for a classic board), and from the list of **imported puzzles**.
- Plays **all 15 variants** — classic 4×4 / 6×6 / 9×9, Mega 12×12, Monster 16×16, Diagonal X, Hyper, Jigsaw, Killer,
  Greater-Than, Samurai, Sohei, Butterfly, Flower, Wordoku — **without any variant or generation code**: the
  document carries the board as plain data (`model`) and the player rebuilds it with `SG.model.create`.
- Play features: select by mouse, touch or keyboard; enter values (digits, letters or hex per the board's
  symbols; two-character numbers for Mega 12×12); an on-screen symbol pad; candidate notes; erase; exact
  undo / redo; error checking (off / conflicts / live); progressive hints (3 levels) that name the logical
  technique; a timer that pauses when the page loses focus; completion detection; Play / Pause / Reset per
  puzzle; reveal a cell; five symbol
  sets (digits, letters, colours, shapes, the Wordoku word).
- **Progress is saved automatically per puzzle** (local storage, last 100 puzzles) and the imported puzzles are
  kept (last 100), so a reload — or coming back tomorrow — continues where the player stopped.
- Bilingual **EN / VI**, three themes + `prefers-color-scheme`, font-size setting, reduced motion, WCAG AA
  contrast, keyboard operable, `role="grid"` board, `aria-live` announcements, responsive (three columns on a wide
  desktop, two on a desktop, one on a phone with the keys fixed to the bottom).
- A **guide** (`help.html`, a page of its own that the Help button opens in a new tab): the basics, how the hints
  work, the 26 techniques each with a ready-made example, the keyboard.
- Everything runs **locally**: no server, no account, no network request after the page is loaded.

### 1.2 Non-goals (and a test that proves it)
Generation (`full-grid`, digger, pipeline, symmetry, seeded RNG), the variant registry and builders, difficulty
calibration and classification, the worker, the puzzle cache and pre-generation, the steps panel, the replay
player, explanations, the result panel, **export and print** — none of it is in this repository.
`tests/suites/ui-contract.test.js` loads every player source and asserts that `SG.pipeline`, `SG.digger`,
`SG.fullGrid`, `SG.variants`, `SG.workerClient`, `SG.symmetry`, `SG.difficulty`, `SG.rng` and `SG.exportUi` do
not exist and that no file under `js/` mentions them.

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
css/       tokens (3 themes) · base · layout · components · board · play · help
tests/     harness.js · node-runner.js · tests.html · suites/ · fixtures/ (puzzle documents) · browser/ (CDP scripts) ·
           tools/ (make-technique-examples.js, which writes js/ui/help-examples.js)
docs/      fixtures.md (how the documents were made) · qa.md (the manual browser run)
```

### 2.1 Layers
`ns / errors / bits / budget` → `model` → `constraints`, `combo-table`, `dfs-solver` → `techniques`,
`logical-solver`, `tech-*` → `classic-model`, `model-aids` (all `js/core/`) → `exchange`, `importer`, `i18n`,
locale packs, `store`, `theme`, `symbols`, `board-view`, `a11y`, `progress`, `play`, `help`, `app` (`js/ui/`).
A lower layer never knows a higher one.

### 2.2 Modules
| File | `SG.` name | Role | Origin |
|------|------------|------|--------|
| `core/ns.js`, `errors.js`, `bits.js`, `budget.js` | `SG`, `errors`, `bits`, `budget` | namespace, `GenerationError`, bit masks, work budget | copied; the stepper part of `budget` removed |
| `core/model.js` | `model` | `PuzzleModel` (units, peers, cages, signs, layout, symbols), `validate` V1–V8 | copied |
| `core/constraints.js`, `combo-table.js`, `dfs-solver.js` | `constraints`, `comboTable`, `dfs` | propagation, cage sums, solution counting | copied |
| `core/techniques.js`, `logical-solver.js`, `tech-basic / subset / fish / wing / chain / cage / ineq.js` | `techniques`, `logicalSolver`, `ineq` | the 26 named techniques; the solver that powers hints | copied (scoring left as the plain design score; no classification) |
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
| `ui/play.js` | `play` | game engine (pure) + the play UI | the generator's play mode, reworked into the main screen |
| `ui/help.js`, `help-examples.js` | `help`, `helpExamples` | the guide page (`help.html`): sections, a tab per technique, the contents; `help-examples.js` is the generated snapshot of one example per technique (§8.3) | rewritten; the examples are generated by `tests/tools/make-technique-examples.js` |
| `ui/app.js` | `app` | start-up, open flows, dialogs, toasts, info card, recent list, auto-save, wiring; the `SG.app` extension surface | **new** |

### 2.3 The `SG.app` surface
`play.js`, `a11y.js` and `theme.js` were written against the generator's `SG.app`; the player keeps
the part of that contract they use, so they needed small edits only: `getStore() getBoard() getResult()
toast(kind, key, args) openModal({titleKey, body, footer, wide, onClose}) announce(text) on(name, fn) emit(name,
payload) showResult(puzzle, options)`, plus `getPuzzle() open(input, options) openPuzzle(puzzle, options)
openOpenDialog() clearSavedData() saveNow()`.
`getResult()` returns `{ result: puzzle, trace: [] }`: the "result" is the opened puzzle (`model`, `givens`,
`solution`, …). Events: `result` (a puzzle is on the board), `settings` (a preference changed), `locale`,
`theme`, `action` (`open`, `share`, `settings`; Help is a plain link to `help.html`), `play:game` (a game was attached), `play:change` (a game changed;
the app saves 400 ms later), `data:cleared`. `play.js` is driven by `attach(puzzle, {state, symbolMode, focus})` /
`detach()`; it reads `check` and `autoNotes` from the store and follows the `settings` event.

### 2.4 Script order
`tests/node-runner.js` `SOURCE_FILES` is the single source of truth; `index.html` and `tests.html` repeat it and
`ui-contract.test.js` fails when they drift. `help.html` loads the same list minus the files the guide does not
need (`exchange`, `importer`, `progress`, `a11y`, `app`), with `help-examples.js` and `help.js` added; the test
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

A puzzle that cannot be rebuilt (a missing or damaged structure line, a grid of the wrong shape, a variant the
player does not have) gets an issue (`import.error.exportStructure` / `exportShape` / `exportVariant` ...) and is
listed as skipped; the others are imported. The header's level and numeric seed fill the puzzle card. The good
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
   other than the classic ones needs the block (`import.error.noModel` otherwise).
4. **Build**: `SG.model.create(model)`, `SG.model.validate(model, {solve: false})`, cross-check of the stored
   `layout`, `symbols`, `cages`, `inequalities` against the model, enable the extensions.
5. **Check**: the stored solution against units / cages / signs / word line and the givens; the number of
   solutions with `SG.dfs.countSolutions(model, givens, 2)` under a 6 s budget. No solution → refused
   (`import.error.noSolution`); several → playable with a warning; budget exceeded → playable, "unverified". A
   missing solution is computed with the DFS solver (a text line always is).
6. **Result**: a `puzzle` `{ id, variantId, model, givens, solution, uniqueness, solutionSource, symbolMode,
   info, document }`. `id` hashes the variant, structure and givens, so the same puzzle has the same id however
   it arrived (a text line of a classic board equals its document). `document` is the small plain document that
   is stored for the recent list; `info` feeds the info card (no Wordoku key word in it).

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

Difficulty IDs, easiest first, are `veryEasy`, `easy`, `medium`, `hard`, `veryHard`, `expert`, `evil`,
`nightmare1`, `nightmare2`. Both language packs supply their names and descriptions; text import resolves
the names in either language independently of the player's current language. The generator's rating v2
keeps the v1 document container and adds `difficulty.ratingVersion: 2`. A positive safe integer rating version
is preserved in the compact stored/shared document; missing or unreadable optional metadata is non-fatal.
The player does not re-score imported puzzles, infer a version from a text header, or change legacy scores.
Difficulty and rating version are not part of puzzle identity, so they cannot reset saved progress.

At start-up and on `hashchange` the page looks for `#puzzle=<token>` (and `active`); after the puzzles are on
the board the fragment is removed with `history.replaceState`. The generator's link base is
`<meta name="sg-player-url">` there; the player's link back is `<meta name="sg-generator-url"
content="https://tdat00.github.io/sudoku-generator/">` here.

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
wide screen and one row on a phone; a toggle right under the pad that expands the frame to show the **puzzle
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
(two-character symbols of Mega 12×12 wait for the second character); `N` notes, `H` hint, `Backspace` / `Delete`
erase, `Ctrl+Z` / `Ctrl+Y` undo / redo, `Esc` closes the hint. The timer pauses on blur / hidden tab and resumes.
Revealing the whole solution (`game.revealSolution`, an API without a button) marks the game "given up": it is not counted as solved. A solved Wordoku shows its
key word (the word line stays hidden until then); a solved game is announced with the time, hints used and cells
revealed, plus a toast.

### 6.3 Symbol modes
`digits` (labels of the model: hex for Mega 16, numbers up to 12 for Mega 12), `letters`, `colors` (palette fill
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
| `sg.player.progress.v1` | `{ version: 1, entries: [{ id, at, symbolMode, percent, solved, state }] }`, LRU 100; `state` = `game.serialize()` with the history cut to the last 300 undo / 100 redo steps |
| `sg.player.puzzles.v1` | `{ version: 1, entries: [{ id, at, doc }] }`, LRU 100, each document ≤ 160 kB, total ≤ 900 kB; newest **added** first (`at` is the time a puzzle was first added; saving or playing it again keeps its place, so the list does not jump while you play) |
| `sg.player.last.v1` | id of the puzzle on the board (restored on a reload without a fragment) |

The keys are prefixed `sg.player.` because GitHub Pages serves the generator and the player from one origin
(`tdat00.github.io`), which shares `localStorage`. Progress is saved 400 ms after a change, when the tab hides
and before unload. **Same-puzzle flow**: opening a puzzle whose id has saved progress with at least one entry
asks "Continue" or "Start over"; the recent list and a reload continue without asking.

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
  the puzzle on the board), Continue / Start over, Settings. Esc closes, focus returns to the opener.

### 8.2 Opening
The Import dialog and the page-wide drop share one path: read text (files up to 8 MB, `FileReader`) →
`SG.importer.openMany(text, {source})` → on success `app.openPuzzle` (one puzzle) or `app.importBatch` (several).
Errors are shown in the dialog (or as a toast
when there is none) with the translated issue texts; a failed open never replaces the puzzle on the board. A
dropped file shows a full-page "Drop the puzzle here" overlay. A paste outside a text field opens the pasted
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
each of the 26 techniques; the header floats with the scroll as well. In the techniques section every group is a
card with a **tab for each technique** (`role=tablist`, arrow keys, Home / End); the panel of a tab says what the
technique means and shows **one hardcoded example**: a board drawn like the hint card draws it (the area, the
cells that make it work, the cells that change, the note to remove or the digit to place) with the words of
`SG.play.describeHint` in the current language. `help.html#tech-<id>` opens a technique.

**The examples are data, not computed when the page opens.** `js/ui/help-examples.js` (`SG.helpExamples[id]`) is
generated by `node tests/tools/make-technique-examples.js <path-to-generator>`: it generates classic, Killer,
Greater-Than, Hyper and other puzzles with the generator, plays each with the player's own hints (`fillNotes`,
then hint + apply) and keeps, per technique, the example that is easiest to read (fewest cells, removals and
candidates). The snapshot holds the board (`variant`, `givens`, `values`, the cages or signs), the notes of the
cells shown and the hint (`technique`, cells, targets, placements, eliminations, region), plus `source` (the
puzzle and the step it came from, for the tests only). `SG.help.buildExample` rebuilds a model from it and
`SG.play.renderSnapshot` draws it. `help.test.js` checks that every technique has one, that each rebuilds, that
replaying `source` with the hint code of the player gives the same hint (so a change of the solver shows up as a
test failure to regenerate the file), and that the texts exist in both languages. **Decision:** there is no
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
difficulty names, technique names / descriptions / step texts, unit kinds, symbol modes, a11y / theme / help
strings; added: `player.*` (shell, open flow, info card, recent list, welcome), `import.*`,
`error.exchange.*`, `play.*`.

## 10. Testing
`node tests/node-runner.js` (about 15 s; no install). `tests.html` runs the same suites in a browser (the suites
that read `tests/fixtures/puzzles/*.json` need `http://`, they skip themselves on `file://`).

| Suite | What it checks |
|-------|----------------|
| `bits`, `model`, `constraints`, `solver` | foundation, the model (V1–V8, classic builder), propagation, DFS (ported) |
| `techniques`, `tech-*`, `logical-solver` | the 26 techniques: positive / negative fixtures, soundness against known solutions, the solver loop (ported; a small test kit stands in for generation) |
| `exchange` | token round trips (documents and text bundles), the active puzzle of a link, errors (shared, byte-identical) |
| `importer` | all 18 fixtures rebuild valid models with exactly one solution; tokens, links, bundles (`t.` / `s.`, `active`); text lines (4 / 6 / 9); wrong version, damaged and hostile input, fuzzed damage |
| `model-aids` | sign edges, word line, symbol modes |
| `i18n` | key parity, placeholders, no empty values, coverage computed from the code |
| `store`, `progress` | prefs, safe storage, LRU, version purge, quota, blocked storage, same-puzzle id, recent list |
| `play` | the engine on all 15 fixtures: values, notes, exact undo / redo, conflicts, completion, hint soundness, timer, serialisation; the key reader, pad and note layouts |
| `symbols`, `board-view` | glyphs per mode, the legend, the 16 shapes; geometry and markup of all 15 fixtures (cells, layers, cages, signs, no colour literal) |
| `a11y`, `theme` | cell labels, keyboard moves, the Settings data; token parity and contrast |
| `app` | the surface and events of `SG.app`, the elements it needs from `index.html`, no HTML built from data, storage only through `store` / `progress` |
| `help` | the sections, texts in both languages, an example for each of the 26 techniques (rebuilt from the snapshot, replayed with the hint code, readable in EN and VI), shortcuts against the keys `play.js` handles, README claims |
| `ui-contract` | module surface, no colour literals outside the token files, script order of `index.html` = runner = `tests.html` (and `help.html` = runner minus its exceptions), no hard-coded text in either page, forbidden globals absent, no DOM in `js/core` |
| browser run | `tests/browser/*.js`: headless Edge over CDP (fragment, paste, file, drop, play with real key events, hints, reload, keyboard-only walk, Settings, the guide page with its tabs and floating contents, themes, 1440 / 900 / 375 px with touch, blocked storage); recorded in `docs/qa.md` |

The fixtures were made by the generator (`docs/fixtures.md`); the test kit (`tests/fixtures/testkit.js`) holds a
seeded RNG, a random solved grid (the DFS solver with a random value order) and a minimal clue remover so the
ported solver suites can still build puzzles with a known unique solution. It is test-only and never loaded by
the app.

## 11. Risks and limits
- **Document drift**: the generator may change its document; the player ignores unknown fields and refuses
  another `format` version with a clear message. The fixtures come from a generator revision (`docs/fixtures.md`).
- **Hostile input**: everything that arrives is data; sizes are bounded before any loop, errors are issues, and
  `tests/suites/importer.test.js` fuzzes damaged documents. There is no `eval`, no HTML injection (text is set
  with `textContent`), the token never leaves the browser.
- **Storage**: blocked, full or corrupt storage degrades to memory-only play; saved history is trimmed.
- **Large boards on phones**: Samurai / Mega 16 cells are small on a 375 px screen (the board scales, the pad is
  full width); a zoomable board is an idea, not built.
- **Hints** can only explain the 26 known techniques; a position that needs more says "stuck" and offers to
  reveal a cell.
- **Not done**: a real screen-reader run, Firefox / Safari, a real phone, a long-session performance profile.
