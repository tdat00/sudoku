# Sudoku Player — Task Breakdown

> **Note (one repository).** This document describes the app as built when it was a repository of its own, and it is kept as written. The generator and the player now live in one repository: paths such as `js/core/…`, `docs/…` or `tests/harness.js` are in `core/`, `generator/…`, `player/…` or `docs/` — see [where the old paths went](../docs/architecture.md#where-the-old-paths-went).

> Source of truth for the design: [`design.md`](./design.md).
> The tasks are numbered in **development order**; each phase ends with a green `node tests/node-runner.js` and
> is one commit of the history (the commit subject names the phase). Status values: `planned` · `done` ·
> `partial` (with the reason).

## 0. Rules (from the generator's conventions, restated)
- IIFE + `SG` namespace, `'use strict'`, 2-space indent, single quotes, semicolons, English comments, JSDoc on
  public APIs, no `import` / `export`, no npm, no build step, no `fetch` of local files.
- DOM only in `js/ui/*`; every file under `js/` also loads in Node without a DOM; every displayed string goes
  through `SG.i18n` (EN + natural VI); no colour literal outside `css/tokens.css` / `css/tokens-board.css`.
- A new JS file is added to three lists in the same commit: `tests/node-runner.js` (`SOURCE_FILES`, the
  single source of truth), `index.html`, `tests.html` — `ui-contract.test.js` checks they agree.
- Never weaken a test to make it pass. The sources of the generator are read-only for this project.

## 1. Phases

### P-0 — Design and plan
Owned: `design.md`, `task.md`, `README.md` (skeleton), `.gitignore`.
- P-0.1 Product definition, architecture, formats, storage keys, test strategy (`design.md`). — done
- P-0.2 Task breakdown and commit plan (this file). — done
- P-0.3 Repository hygiene: `.gitignore` (`node_modules/`, `*.log`, `.DS_Store`, `Thumbs.db`, `.scratch-*/`),
  README skeleton. — done

### P-1 — Foundation
Owned: `js/core/ns.js`, `errors.js`, `bits.js`, `budget.js`, `tests/harness.js`, `tests/node-runner.js`,
`tests.html`, `tests/suites/bits.test.js`.
- P-1.1 Namespace, `GenerationError`, bit tools, work budget (copied; the generation stepper of `budget`
  removed). — done
- P-1.2 Test harness, Node runner (`SOURCE_FILES`, auto-discovered suites), browser runner `tests.html`. — done

### P-2 — Puzzle model, solver core and the exchange
Owned: `js/core/model.js`, `constraints.js`, `combo-table.js`, `dfs-solver.js`, `classic-model.js`,
`model-aids.js`, `js/ui/exchange.js`, `tests/fixtures/testkit.js`, `classic.js`, suites `model`, `constraints`,
`solver`, `model-aids`, `exchange`.
- P-2.1 `PuzzleModel` and validation V1–V8; propagation with the extension hook; cage sums; DFS solver and
  solution counting (copied). — done
- P-2.2 `SG.classicModel` (4 / 6 / 9 builder) and `SG.modelAids` (sign edges, Wordoku word line, symbol modes),
  replacing the pieces of variant code the screens need. — done
- P-2.3 `exchange.js` + `exchange.test.js` (byte-identical copies of the shared files). — done
- P-2.4 Test kit (seeded RNG, random solution, clue remover) so the ported suites can still build puzzles. — done

### P-3 — Logical solver and techniques (the hint engine)
Owned: `js/core/techniques.js`, `logical-solver.js`, `tech-basic.js`, `tech-subset.js`, `tech-fish.js`,
`tech-wing.js`, `tech-chain.js`, `tech-cage.js`, `tech-ineq.js`, fixtures `techniques*.js`, `rated.js`, suites
`techniques`, `tech-basic`, `tech-subset`, `tech-fish`, `tech-wing`, `tech-chain`, `logical-solver`.
- P-3.1 Technique registry and solver loop (copied; classification dropped). — done
- P-3.2 The 26 techniques (21 classic, 3 Killer, 2 Greater-Than) with their suites, ported to the test kit. — done

### P-4 — Opening puzzles: importer and fixtures
Owned: `js/ui/importer.js`, `tests/fixtures/puzzles/*.json`, `tests/tools/make-fixtures.js`, `docs/fixtures.md`,
suite `importer`.
- P-4.1 `SG.importer`: detect, decode, validate, build, check, puzzle id; text lines of 16 / 36 / 81 characters;
  translated issues. — done
- P-4.2 18 real documents (15 variants + 3 Vietnamese) made by the generator; the script that regenerates
  them from a generator checkout. — done
- P-4.3 Importer suite: all fixtures, tokens / links / JSON, text, damaged and fuzzed input. — done

### P-5 — Language, themes and the page shell
Owned: `js/ui/i18n.js`, `locale.en.js`, `locale.vi.js`, `locale.shell.js`, `store.js`, `theme.js`,
`index.html`, `assets/favicon.svg`, `css/tokens.css`, `base.css`, `layout.css`, `components.css`, suites `i18n`,
`store`, `theme`, `ui-contract`.
- P-5.1 `SG.i18n` and the trimmed locale packs (EN = VI keys; `player.*`, `error.exchange.*`). — done
- P-5.2 `SG.store` (preferences, safe storage, `?lang=`), `SG.theme` (system scheme, theme-color). — done
- P-5.3 `index.html` (welcome state, header, board / side panel mount points, icon sprite, skip link), tokens
  of three themes, base / layout / components CSS, favicon. — done
- P-5.4 `ui-contract` suite (module surface, script lists, colour literals, forbidden globals). — done

### P-6 — Board rendering and the accessible grid
Owned: `js/ui/symbols.js`, `board-view.js`, `a11y.js`, `css/tokens-board.css`, `css/board.css`, suites
`symbols`, `board-view`, `a11y`.
- P-6.1 Symbol modes and glyphs; SVG board for every geometry (jigsaw, cages, signs, overlaps, word line). — done
- P-6.2 ARIA grid, roving tabindex, keyboard moves, translated cell labels, live-region announcer. — done

### P-7 — Play engine and play UI
Owned: `js/ui/play.js`, `progress.js`, `css/play.css`, suites `play`, `progress`.
- P-7.1 The pure game engine: values, notes, exact undo / redo, conflicts, completion, timer, serialisation. — done
- P-7.2 Hints: technique name + description, three levels, always sound. — done
- P-7.3 Play UI: status box (Play / Pause / Resume, Reset while paused or solved), tools, symbol pad, key reader
  (two-character symbols), hint card, the Options frame, the "More actions" (fill in all notes, reveal a cell with
  a confirming second press), notes display. — done
- P-7.4 `SG.progress`: per-puzzle progress (LRU 100), imported puzzles (LRU 100, a stable order), recent list,
  safe storage behaviour (quota, blocked, version purge). — done

### P-8 — The player app
Owned: `js/ui/app.js`, `css/components.css` (dialogs, cards), `css/layout.css` (final), suites `app`.
- P-8.1 Start-up: `#puzzle=` fragment (also on `hashchange`, removed with `history.replaceState`), restore of
  the last puzzle, preferences. — done
- P-8.2 Open dialog: file picker, page-wide drag & drop, paste (JSON / token / link / text), recent list;
  translated errors. — done
- P-8.3 Continue / Start over flow, auto-save, info card, welcome state, settings dialog (theme, text size,
  language, motion, colour symbol, check mode, notes). — done
- P-8.4 The `SG.app` surface for the reused modules; toasts, modals, announcements. — done

### P-9 — The guide, final QA and documentation
Owned: `help.html`, `js/ui/help.js`, `help-examples.js`, `css/help.css`, `tests/tools/make-technique-examples.js`,
`README.md`, `docs/`, suite `help`.
- P-9.1 The guide: a page opened by the Help button in a new tab (first built as a dialog with tabs): the basics,
  how the hints work, the 26 techniques in groups with a tab and a hardcoded example each, the keyboard, a
  floating contents. — done
- P-9.2 (First-visit tour: built, then removed at the owner's request; there is no tour.) — dropped
- P-9.3 Browser verification in headless Edge (15 fixtures via fragment, paste, file input and drop; play,
  hints, save / restore, languages, themes, widths, keyboard-only, reduced motion), screenshots reviewed,
  findings fixed; the scripts are kept in `tests/browser/` and the results in `docs/qa.md`. — done
- P-9.4 README (EN + VI, with a table of contents and the link to the live app), design / task finalisation, final test run. — done
- P-10 Later work (after the first release): the generator's layout (list on the left, summary above the board,
  status box and Options on the right), Share, bundles from the generator's Play button, the guide page. — done

## 2. Commit plan
1. `docs:` P-0 · 2. `foundation:` P-1 · 3. `core:` P-2 · 4. `solver:` P-3 · 5. `import:` P-4 · 6. `shell:` P-5 ·
7. `board:` P-6 · 8. `play:` P-7 · 9. `app:` P-8 and P-9. Every commit passes `node tests/node-runner.js`.

## 3. Report template (per phase)
```
## P-x — <name> — done / partial / blocked
### Files   ### Validation   ### Decisions   ### Deviations   ### Open issues
```
