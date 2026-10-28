# Browser run (QA)

What was checked in a real browser, how to repeat it, what the run found, and what it could not check.

## How to repeat
In `player/`:
```
node tests/browser/run-all.js          # all scripts, one line each; ~4 minutes
node tests/browser/play.js             # one script (fragment.js [file|http], open.js, play.js, ui.js, visual.js, help.js, links.js)
```
The scripts drive **headless Microsoft Edge 155** over the DevTools protocol (Node 24's global `WebSocket`; no
packages). They launch their own browser with a throw-away profile in `player/.scratch-profile/`, serve the whole
repository (the player loads `../core`) from `http://127.0.0.1` on a free port (and also open it from `file://`),
write screenshots to `player/.scratch-shots/` (both ignored by git) and exit non-zero when a check fails. Set `EDGE_PATH` for another
Chromium-based browser. The key events are real (`Input.dispatchKeyEvent`), so the page sees what a keyboard
sends; the mouse and touch events are real too (`Input.dispatchMouseEvent` / `dispatchTouchEvent`). Drag and drop
uses synthetic `DragEvent`s with a `DataTransfer` that holds a real `File`; the file picker uses
`DOM.setFileInputFiles`.

## Generation Steps (2026-10-29)
The branch `generation-steps` (GS01–GS07 of `tasks/generation-steps/`), checked once against a copy of `8d9510a`.
Microsoft Edge 156.0.4314.50, Node v24.22.1. The scripts, the two tracked-tree copies and the raw logs are in an
experiment folder E outside the repository; the browser scripts ran from the copy of the branch in E, so their
profiles and screenshots stayed there too.

```
cd generator && node tests/node-runner.js --all   # 51 suites, 3,835 tests, 0 failed, 3 skipped, 999 s
cd generator && node tests/node-runner.js         # 43 suites, 2,818 tests
cd generator && node tests/replay-fixtures.js --check   # up to date
cd player && node tests/node-runner.js            # 29 suites, 1,609 tests
node tests/browser/run-all.js                     # from the copy of the branch in E, in player/
```

`run-all.js`: `fragment.js` file and http without a failure, `open.js` 86/86, `play.js` 51/51, `ui.js` 45/45,
`visual.js` 42/42, `help.js` 23/23, `links.js` 11/11.

`generator/tests.html` over http, headless: the branch 2,724 tests, 2,616 passed, 4 failed, 104 skipped; the copy of
`8d9510a` 2,464 tests, 2,356 passed, 4 failed, 104 skipped. The same four tests fail on both, carried baseline
limitations that this change neither adds nor fixes: the "without a DOM" tests of `board-view`, `a11y` and `theme`
(a browser has a DOM) and "dig is where the time goes on classic9, and every step was timed" of `pipeline`
(`expected 0 to be > 0`). No new failure, no missing file and no console error on either copy; the
`replay` suite ran in full (152 tests, none skipped), the 14 golden details checks among them.

The real page (scripted, headless Edge, 40 checks, all passed): with a worker, Classic 9×9 Expert seed 3275974478
prepares its score tables by itself and shows 7 steps (Totals 0, 23, 44, 551, 568, 992, 992), the "Score jump ×12.5"
badge, the callout, a closed "Why?" and R1C2 framed on step 4, and 33 steps with "Show every move" (compact step 4
is every-move step 24, every-move step 26 is compact step 5); in Vietnamese "Điểm tăng vọt ×12,5" and
"Hiện từng thay đổi". Opened from a file without a worker, the puzzle and its Summary work at once, the replay
waits for "Prepare score tables" with browsing disabled and no table, nothing is prepared before the press, then
both views are there. Greater-Than Expert seed 42 has 9 steps and frames one sign on its jump (×4.0). No console
error. The screenshots were also looked at: the callout, badge and legend, the clue frame and the sign frame
draw as designed; with `forced-colors: active` emulated the frames, badge and callout stay visible (the legend
swatches turn black, like the other legend swatches); the live regions announce "Preparing the score tables… 0 of
32" and "32 of 32" and then hide the status, and the "Why?" disclosure closes again when the language changes.

The puzzle is unchanged: the payload digest of the example is still `d350758d…` and its cache entry, history
entry and export are byte-identical to those of `8d9510a`. No engine, variant, regression or qualification file
changed (the only new engine file is `replay.js`; one heavy `killer` test line was migrated to the new player
API). The 14 golden requests give their golden sequences (13 compact and 16 every-move jumps, 19 distinct
transitions); preparing their score tables took a median of 29 ms per puzzle in Node (maximum 592 ms, Mega 16×16
Hell 2 seed 12; all 14 together 948 ms), of which the explanations of both views took 79 ms in all.

## One repository (2026-10-20)
After the generator and the player were merged into this repository (the shared code now loads from `core/`):

```
node tests/browser/run-all.js      # in player/: fragment.js file / http, open.js, play.js, ui.js, visual.js, help.js, links.js
```

`fragment.js` passed in both modes, `open.js` 86/86, `play.js` 48/48, `ui.js` 43/43, `visual.js` 42/42, `help.js`
23/23. The new `links.js` (11/11) opens the generator over `file://` and `http://`, presses **Play online**, and
checks that the tab is the player with the puzzle open; it follows the player's link to the generator the same way,
and it asks the generation worker for a puzzle (the worker loads the engine from `../core` with `importScripts`,
and a failure there would otherwise only show as the slower main-thread fallback). The links name the page
(`../player/index.html`), not its folder: opened from a disk, a folder shows a file listing. The pages and
`tests.html` of both projects load without a console error; the "without a DOM" suites fail in a browser by
design (they need Node), as before.

The Node suites: `node tests/node-runner.js` runs the shared suites of `core/tests/suites` and the project's own
(in `player/` 1,641 tests, in `generator/` 2,598). Four `importer` tests used to fail on Windows: its checkout
turned the committed text exports into CRLF, and the tests split them on blank lines; `.gitattributes` now keeps
them LF.

## Rating-v2 verification (2026-10-19)
The nine imported difficulty IDs and canonical EN/VI texts were checked with Node **v26.8.2**:

```
node tests/node-runner.js --suite=importer,i18n,progress   # 178 / 178
node tests/node-runner.js                                # 1,628 / 1,628; 28 suites
node tests/browser/run-all.js                            # all seven runs passed
```

The importer tests cover v2 metadata, optional future/malformed metadata, legacy fractional scores, all six
new localised names, storage/share round-trips and unchanged puzzle identity. The progress test keeps a
saved game when the same puzzle arrives with a different rating/version. The committed legacy fixtures and
Help examples were not regenerated.

Edge and Node's `WebSocket`/`fetch` were available, and all test HTTP/DevTools ports were checked as unused
before the browser run. Both fragment modes passed; `open.js` passed 86/86, `play.js` 48/48, `ui.js` 43/43,
`visual.js` 42/42 and `help.js` 23/23. This was an automated rerun, not another manual screenshot review.
No layout, gameplay or hint code changed. Node emitted its experimental `localStorage` warning without a
test failure.

## Earlier browser baseline
| Script | What | Result |
|--------|------|--------|
| `fragment.js file`, `fragment.js http` | the 18 fixtures (15 variants + 3 Vietnamese) through `#puzzle=<token>`, over `file://` and over `http://`: board built, one grid cell per model cell, play overlay, ARIA grid, info card, symbol modes, fragment removed, no console error | 18 / 18 both |
| `open.js` | each fixture by **paste** (JSON, bare token, full link), **drop** and the **file picker** (126 openings); 81 / 36 / 16-character lines, an impossible line, garbage, a wrong version (translated errors, board unchanged), an empty line (several solutions: opens with a warning), `hashchange`, `Ctrl+Enter`, errors inside the Open dialog | 86 / 86 |
| `play.js` | classic 9×9: mouse selection, typed values, a rule conflict flagged, notes (`N`), undo / redo, hints level 1 → 3 (technique named) and "Fill it in", auto-save, completing the puzzle by typing the whole solution, success message and toast, reload restores the solved game, "already open", another puzzle replaces it, Continue / Start over, recent list | 48 / 48 |
| `ui.js` | a keyboard-only walk (tab order, skip link, arrows, Home / End, Ctrl+Home, Page Down, cell labels), Settings (every control, stored values, Reset), the Help button (a link that opens `help.html` in a new tab, no dialog), themes, `?lang=` | 43 / 43 |
| `visual.js` | 900 px and 375 px (touch emulation, 2× scale): no horizontal overflow, 44 px pad keys, taps on cells and pad, notes and undo by touch, dialogs on a phone, Mega 16 / Samurai / Wordoku on a phone; light / dark / high-contrast with a hint open; Vietnamese hint; symbol modes and legend; the symbol mode surviving a reload; a solved Wordoku showing its key word; `prefers-reduced-motion`; `prefers-color-scheme`; **blocked `localStorage`** (warning, status line, play continues) | 41 / 41 |
| `help.js` | the guide page `help.html`: the four sections, 26 tabs in 8 groups (the first of each shown, only those drawn), the contents with every group and technique, a tab drawing its board (area, cells, target, removed note) with the words of the hint, arrow keys between tabs, the contents opening a tab, a Killer and a Greater-Than example, all 26 examples drawing, EN / VI and theme switches stored for the player, `#tech-<id>` deep link, the header and the contents floating with the scroll, 375 px without overflow | 23 / 23 |

No console error or exception was logged in any run. The screenshots (about 60) were opened with the image viewer
and looked at: welcome, every variant family on desktop (Classic, Killer with cages, Greater-Than with signs,
Samurai / Sohei / Butterfly / Flower overlaps, Jigsaw regions, Mega 16, Wordoku), the pad in notes mode, a
conflict, hints (light, dark, high contrast), colours and shapes modes with the legend, the Continue dialog, the
Open dialog with an error, Settings, the guide page (light, dark, Vietnamese, 375 px), 900 px and 375 px layouts. (The first-visit tour covered by the original run was
removed later; its checks are gone from the scripts and the counts above are from the run after that removal.)

## What the run found (and was fixed)
- The nine-key pad overflowed the 25 rem side panel (keys overlapped): the pad is now 6 columns wide (5 on a
  phone), two rows for nine symbols.
- On a 900 px-high window the board was taller than the viewport: its height is capped to the window.
- The board `<svg>` itself became a tab stop in front of its first cell (play added `tabindex`): removed; the
  grid semantics are re-applied right after a new puzzle, and a link no longer moves the focus on load, so the
  first `Tab` reaches the skip link.
- A value the player typed was announced as "empty" by the cell label: the cell now carries `data-user` and the
  label reads "value 5".
- Toasts covered the buttons of an open dialog and the same warning stacked twice: toasts sit under the dialog
  panel while one is open and identical messages are shown once.
- The welcome steps had no numbers and the welcome card was
  not centred; an empty status line took a row.

## What was not checked
- **No real screen reader** (NVDA, VoiceOver, TalkBack): only keyboard walks and the roles / labels / live regions
  in the DOM. The guide does not claim otherwise.
- Only **Edge / Chromium**; Firefox and Safari are expected to work and untested. No real phone (touch is
  emulated).
- `forced-colors: active` was reviewed in the CSS, not emulated; `prefers-contrast: more` is covered by the
  token tests only.
- No long-session or memory profile; no test of a full `localStorage` in the browser (the quota path is covered
  by `progress.test.js` with a fake storage).
- Generation Steps: **screen readers** on the new callout and "Why?" (only the live-region texts were read from the
  DOM); **touch devices**; Firefox and Safari; the main-mode press on a slow device (the page may pause while it
  prepares the score tables); the screenshots of `docs/screenshots/` were not retaken.
