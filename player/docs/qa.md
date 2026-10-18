# Browser run (QA)

What was checked in a real browser, how to repeat it, what the run found, and what it could not check.

## How to repeat
```
node tests/browser/run-all.js          # all scripts, one line each; ~3 minutes
node tests/browser/play.js             # one script (fragment.js [file|http], open.js, play.js, ui.js, visual.js)
```
The scripts drive **headless Microsoft Edge 155** over the DevTools protocol (Node 24's global `WebSocket`; no
packages). They launch their own browser with a throw-away profile in `.scratch-profile/`, serve the repository
from `http://127.0.0.1` on a free port (and also open it from `file://`), write screenshots to
`.scratch-shots/` (both ignored by git) and exit non-zero when a check fails. Set `EDGE_PATH` for another
Chromium-based browser. The key events are real (`Input.dispatchKeyEvent`), so the page sees what a keyboard
sends; the mouse and touch events are real too (`Input.dispatchMouseEvent` / `dispatchTouchEvent`). Drag and drop
uses synthetic `DragEvent`s with a `DataTransfer` that holds a real `File`; the file picker uses
`DOM.setFileInputFiles`.

## Result of the last run
| Script | What | Result |
|--------|------|--------|
| `fragment.js file`, `fragment.js http` | the 18 fixtures (15 variants + 3 Vietnamese) through `#puzzle=<token>`, over `file://` and over `http://`: board built, one grid cell per model cell, play overlay, ARIA grid, info card, symbol modes, fragment removed, no console error | 18 / 18 both |
| `open.js` | each fixture by **paste** (JSON, bare token, full link), **drop** and the **file picker** (126 openings); 81 / 36 / 16-character lines, an impossible line, garbage, a wrong version (translated errors, board unchanged), an empty line (several solutions: opens with a warning), `hashchange`, `Ctrl+Enter`, errors inside the Open dialog | 140 / 140 |
| `play.js` | classic 9×9: mouse selection, typed values, a rule conflict flagged, notes (`N`), undo / redo, hints level 1 → 3 (technique named) and "Fill it in", auto-save, completing the puzzle by typing the whole solution, success message and toast, reload restores the solved game, "already open", another puzzle replaces it, Continue / Start over, recent list | 24 / 24 |
| `ui.js` | a keyboard-only walk (tab order, skip link, arrows, Home / End, Ctrl+Home, Page Down, cell labels), Settings (every control, stored values, Reset), Help (5 tabs, 15 variants, 26 techniques, shortcuts, storage keys, delete with confirmation), themes, `?lang=` | 36 / 36 |
| `visual.js` | 900 px and 375 px (touch emulation, 2× scale): no horizontal overflow, 44 px pad keys, taps on cells and pad, notes and undo by touch, dialogs on a phone, Mega 16 / Samurai / Wordoku on a phone; light / dark / high-contrast with a hint open; Vietnamese hint; symbol modes and legend; the symbol mode surviving a reload; a solved Wordoku showing its key word; `prefers-reduced-motion`; `prefers-color-scheme`; **blocked `localStorage`** (warning, status line, play continues) | 33 / 33 |

No console error or exception was logged in any run. The screenshots (about 60) were opened with the image viewer
and looked at: welcome, every variant family on desktop (Classic, Killer with cages, Greater-Than with signs,
Samurai / Sohei / Butterfly / Flower overlaps, Jigsaw regions, Mega 16, Wordoku), the pad in notes mode, a
conflict, hints (light, dark, high contrast), colours and shapes modes with the legend, the Continue dialog, the
Open dialog with an error, Settings, every Help tab in Vietnamese, 900 px and 375 px layouts. (The first-visit tour covered by the original run was
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
- The Help tab bar was clipped under the dialog header; the welcome steps had no numbers and the welcome card was
  not centred; an empty status line took a row.

## What was not checked
- **No real screen reader** (NVDA, VoiceOver, TalkBack): only keyboard walks and the roles / labels / live regions
  in the DOM. The Help text says so.
- Only **Edge / Chromium**; Firefox and Safari are expected to work and untested. No real phone (touch is
  emulated).
- `forced-colors: active` was reviewed in the CSS, not emulated; `prefers-contrast: more` is covered by the
  token tests only.
- No long-session or memory profile; no test of a full `localStorage` in the browser (the quota path is covered
  by `progress.test.js` with a fake storage).
