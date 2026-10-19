# SudokuGenerator — final review and soak run (T-7.7)

> **Note (written before the split).** This report was written for the combined project `SudokuGenerator`, which also
> contained a trial-play mode, and it is kept as it was: its soak, performance, test and browser figures are those of the
> combined tree. The play mode has since **moved to the sudoku-player repository**
> ([github.com/tdat00/sudoku-player](https://github.com/tdat00/sudoku-player)); the rows and defects that concern it are
> marked "➡️ moved to sudoku-player" below and describe code that is **no longer in this repository** (the generator's own
> test count after the split is in `task.md` Appendix E and `README.md`; since then the UI was reworked (tabs, a list of
> generated puzzles, a new print / text export, see `design.md` §10 and §18), so the screenshots, the UI defect list and
> the export / share-link checks below describe the page as it was then). The generator's behaviour (generation, replay,
> export, import, accessibility, themes, help, cache) was unchanged by the split, which only adds the "Play online"
> hand-off (`T-7.8`, `design.md` §10.9), checked separately in headless Edge.

Date: 2026-10-16 · Machine: AMD EPYC 7763 (8 vCPU), Windows, Node v24.21.0, Microsoft Edge 155 (Chromium) headless,
driven over CDP. Everything below was measured on the tree that ships (no build step).

## 1. Summary

| Area | Result |
|---|---|
| Soak (T-7.7 acceptance) | **3 145 puzzles** over 15 variants × every supported level, 3 seeds: **I1–I7 100 % clean**; exact-level hit rate **99.95 %** (2 124 / 2 125 in the big run; classic9 100 %/100 %/99 %/100 %/100 %/100 %); lowest (variant, level) cell ≥ 99 % (required 90 % classic9, 80 % others) |
| Unit/integration tests | `node tests/node-runner.js` **3 525 / 3 525 green** (42 suites, 0 skipped; baseline of the first contract: 2 348) · deep statistical run `SG_DEEP=1 … --suite=variants,multigrid,mega`: **522 / 522 green** |
| Performance (§9.1) | `node tests/perf.js` (50 runs/cell): **54 / 54 cells meet p95**; worst margin = 41 % of the budget (classic9 medium 61.6 ms / 150 ms) |
| Browser checklist (§15.5) | 768 generations (15 variants + hard classic9, 2 serving modes × 2 viewports × 3 themes × 2 languages × 2 motion settings) with 12 automatic checks each: **0 problems**; ~290 scripted feature checks; 270 layout states: **0 overflow** after the fixes below |
| Defects | 5 real defects fixed (A–E: 2 integration, 1 performance, 2 layout), 5 smaller items done (F–J), 1 known limitation recorded, 0 open defects |
| Not possible here | Chrome / Firefox / Safari, real screen reader, real devices, the OS print dialog (see §5) |

## 2. Soak

Command: `node tests/soak.js --full --seed=20261016` (new preset: 25 puzzles per (variant, level), 100 per classic9 level;
`--per-combo=N` is the general form; the default `--count=500` is unchanged). 2 125 puzzles in 81 s. Two more runs with
`--count=500 --seed=777` and `--seed=424242` (510 puzzles each, 20–24 s) were also 100 % clean (all hit rates 100 %).

Invariants over 2 125 puzzles: **I1 ok · I2 ok · I3 ok · I4 ok · I5 ok · I6 ok · I7 ok** (0 violations in all three runs).

Exact-level hit rate, `% (puzzles)` per variant × requested level (`–` = the variant does not declare the level):

| variant | cells | veryEasy | easy | medium | hard | expert | evil |
|---|---:|---:|---:|---:|---:|---:|---:|
| classic4 | 16 | 100 % (25) | 100 % (25) | – | – | – | – |
| classic6 | 36 | 100 % (25) | 100 % (25) | – | – | – | – |
| classic9 | 81 | 100 % (100) | 100 % (100) | 99 % (100) | 100 % (100) | 100 % (100) | 100 % (100) |
| mega12 | 144 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | – | – |
| mega16 | 256 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | – | – |
| diagonalX | 81 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) |
| hyper | 81 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) |
| jigsaw9 | 81 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) |
| killer | 81 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | – |
| greaterThan | 81 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | – |
| samurai | 369 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | – | – |
| sohei | 288 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | – | – |
| butterfly | 144 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | – | – |
| flower | 189 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | – | – |
| wordoku | 81 | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | 100 % (25) | – |

The only miss (classic9 medium, 1 of 100) landed on `easy`. The "raw band"
column of the soak (score in the band even without the technique floor) is lower for the big boards (samurai medium 28 %,
hard 16 %) — expected, and the technique floor keeps I5 true by construction; it is a calibration statistic, not a failure.

## 3. Performance (design.md §9.1)

`node tests/perf.js` — core pipeline, `trace: summary`, 50 runs per cell, p95 / target:

| variant | veryEasy | medium | hard | expert | evil |
|---|---|---|---|---|---|
| classic4 / classic6 | 1.3 / 0.8 ms (10 ms) | – | – | – | – |
| classic9 | 1.2 ms (60 ms) | 61.6 ms (150 ms) | 32.3 ms (400 ms) | 46.5 ms (900 ms) | 19.2 ms (2.5 s) |
| diagonalX | 0.8 ms (80 ms) | 14.4 ms (200 ms) | 15.4 ms (500 ms) | 18.8 ms (1.2 s) | 42.8 ms (3 s) |
| hyper | 0.9 ms (80 ms) | 24.5 ms (200 ms) | 27.9 ms (500 ms) | 42.3 ms (1.2 s) | 29.2 ms (3 s) |
| jigsaw9 | 28.1 ms (150 ms) | 31.5 ms (350 ms) | 40.3 ms (900 ms) | 40.3 ms (2 s) | 48.1 ms (5 s) |
| wordoku | 0.9 ms (100 ms) | 62.7 ms (250 ms) | 47.8 ms (600 ms) | 38.2 ms (1.5 s) | – |
| killer | 5.6 ms (300 ms) | 21.1 ms (700 ms) | 569 ms (1.8 s) | 1.05 s (4 s) | – |
| greaterThan | 28.8 ms (300 ms) | 84.8 ms (700 ms) | 267 ms (1.8 s) | 1.03 s (4 s) | – |
| mega12 | 1.6 ms (400 ms) | 23.8 ms (1 s) | 56.4 ms (3 s) | – | – |
| mega16 | 4.5 ms (1.5 s) | 46.3 ms (4 s) | 275 ms (10 s) | – | – |
| butterfly | 3.0 ms (1 s) | 91.1 ms (3 s) | 117 ms (8 s) | – | – |
| samurai | 9.0 ms (3 s) | 329 ms (8 s) | 359 ms (20 s) | – | – |
| flower | 3.3 ms (3 s) | 112 ms (8 s) | 280 ms (20 s) | – | – |
| sohei | 5.8 ms (3 s) | 154 ms (8 s) | 346 ms (20 s) | – | – |

The reference machine of §9.1 is a mid-range i5 in Chrome; this VM is faster, so the margins (59–99 % under budget) are
an upper bound of the headroom, not a promise. In the browser the generation of a veryEasy puzzle takes 30–200 ms end to end
(worker + replay set-up); a cache hit shows the board in **13 ms (classic9/Killer), 36 ms (mega16), 38 ms (sohei), 43–44 ms
(samurai, worst of 9 runs 49 ms)** in both Worker and `file://` mode.

## 4. Tests

| Run | Result |
|---|---|
| `node tests/node-runner.js` | 42 suites, **3 525 tests, 3 525 passed, 0 failed, 0 skipped** (177 s) |
| `SG_DEEP=1 node tests/node-runner.js --suite=variants,multigrid,mega` | **522 passed** (mega 116, multigrid 201, variants 205; 110 s) |
| `node tests/perf.js` | 54 / 54 cells within p95 target |
| `node tests/soak.js --full` / `--count=500` ×2 | PASS (exit 0) |
| New test | `result-view.test.js`: no share link for an imported puzzle (with or without a seed), link kept for a generated one |

## 5. §15.5 manual checklist (headless Edge 155 over CDP; real key / mouse / touch events)

Legend: ✅ done and passed · ⚠️ done with a caveat · ❌ failed · "not possible" = cannot be done in this environment.

| Item | Status | Evidence / note |
|---|---|---|
| Edge (Chromium) | ✅ | Edge 155.0.4283.60 |
| Chrome, Firefox, Safari | not possible here | only Edge is installed. Risk areas for other engines: `<dialog>` focus restoration, SVG focus behaviour (see defect B), `:focus-visible` |
| Desktop 1440×900 | ✅ | matrix + all feature scripts |
| Mobile 375×812 @2x, touch | ⚠️ | emulation (metrics, touch events), not a real device or soft keyboard; also 320 px (WCAG reflow width) |
| Light / dark / high-contrast | ✅ | 768-generation matrix, screenshots of all 15 variants in light + dark-VI + HC samples; `auto` follows `prefers-color-scheme` |
| EN / VI | ✅ | matrix, locale audit (1 072 keys each, no VI = EN except technique names and "Seed"), 1 415+ VI texts scanned in every view (tour, steps details, help, settings, export, import errors, play, hint) → no raw key, no English sentence |
| Served over http (Worker) | ✅ | badge "Background thread" in every run |
| Opened via `file://` (main thread) | ✅ | badge "Main thread"; cancel, generate, export, play all work; no pre-generation there (by design) |
| Reduced motion on / off | ✅ | OS emulation and in-app switch; no transition longer than 1 ms runs when on |
| All 15 variants (+ hard classic9) generate | ✅ | replay ends equal to `result.givens`, 7 steps done/skipped, result panel 6 stats, status text, mode badge, board shows every clue, level = requested; 0 console errors / exceptions / 404s |
| Export dialog, all formats | ✅ | JSON, SVG, PNG produced for 15 variants; text for the 8 variants that fit one line (the 7 structured ones are disabled with a reason); download buttons give `.png/.svg/.json` (blob capture; the OS save dialog was not exercised) |
| Help, tour, settings | ✅ | open, focus enters the dialog, Esc closes, focus returns to the opener; tour shows on a clean `localStorage`, "Skip tour" is remembered and returns focus to Generate; no raw keys |
| Play mode + hint | ➡️ moved to sudoku-player | (combined project) entered by keyboard, one tab stop, arrows move, digit enters, hint shows technique name + description, Ctrl+Z undoes; touch select + number pad (keys ≥ 40 px) on mobile. This code is no longer in this repository; the player has its own checks |
| Language switch mid-replay | ✅ | replay keeps running (9 → 13 of 1 123 events), steps / status / cell labels / title translated, `<html lang>` follows |
| Theme switch | ✅ | header buttons, `aria-pressed`, persisted; `auto` → no button pressed (documented in Settings) |
| Mobile drawer / stepper | ✅ | Options bar, drawer not focusable while closed, Esc / backdrop / Generate close it, focus returns to the bar; steps toggle `aria-expanded` |
| Keyboard-only walkthrough | ✅ | 50 tab stops, skip link first, exactly one stop in the board, Esc everywhere, arrows / Ctrl+End on the grid (list in §8) |
| Cache hit on identical seed | ✅ | second generation is `fromCache`, trace attached afterwards; pool serves "Regenerate" in 21 ms (worker mode) |
| Share link restores the puzzle | ✅ | fresh page load of the link gives identical givens |
| `?v=classic9&d=hard&seed=42&lang=vi&auto=1` = Node `SG.pipeline.run` | ✅ | identical in 4 environments; 20 further (variant, level, seed) combinations identical in Worker and main-thread mode |
| Print to PDF | ⚠️ | CDP `Page.printToPDF` is unavailable in this Edge ("Printing is not available"); used `msedge --print-to-pdf` on a scratch page that builds the print root with `SG.exportUi.printItems`: 1 puzzle → 1 page (+ solution → 2); 4 puzzles at 4/page → 1; 6 puzzles at 4/page → 2 (+ solutions → 4); 6/page → 1. Layout checked on print-media screenshots (headers, Killer cages, Jigsaw regions, Samurai). The browser's print dialog and Letter paper were not exercised |
| Blocked `localStorage` | ✅ | getter that throws `SecurityError`: boots, generates, theme / language / settings / export work in memory, cache degrades quietly, 0 console errors |
| 200 % zoom | ✅ | also 300 % / 400 %: no horizontal overflow, puzzle generated, drawer layout |
| Worker unavailable | ✅ | `Worker` constructor throwing → automatic main-thread fallback, badge "Main thread" |
| Memory / listeners | ✅ | 48 generations: heap 3.8 → 4.4 MB, listeners 82 → 83, DOM nodes flat; 10 dialog + play cycles: 0 growth |
| Contrast of the rendered page | ✅ | 27 audits (3 themes × 2 languages × main page and 3 dialogs, play + hint): 0 text below 4.5:1 (3:1 large); token pairs also tested by `theme.test.js` |
| Text size 87.5 % / 125 % | ✅ after fix | 270 states (7 widths 320–1440 px × 3 sizes × 2 languages × idle/result/dialogs/play/drawer): 0 overflow |
| Screen reader | not possible here | no NVDA / JAWS / VoiceOver / TalkBack. Only the ARIA structure was checked programmatically (grid / row / gridcell with labels, live regions, `aria-pressed`, `aria-expanded`, focus order). **A manual screen-reader pass is still recommended before a public release** |

## 6. Defects found and fixed

| # | Defect | Fix |
|---|---|---|
| A | Share link of an imported puzzle carried the form's seed (and "Copy seed" copied nothing) | `js/ui/result-view.js`: `isImported`, `shareLink` returns `''` for `source: 'import'` or `ctx.imported`, `viewModel.imported`; the panel shows a "No share link…" note (EN/VI) and hides the empty seed row; `js/ui/app.js` passes `imported` in the result context; test in `tests/suites/result-view.test.js`. A JSON import with a stored seed also gets no link (consistent with the Export dialog; a seed does not prove the file was not edited) |
| B | ➡️ moved to sudoku-player. Play mode put a `focusin` listener on the `<svg>`: Blink then makes the whole board a tab stop (verified: Shift+Tab from the roving cell landed on `#board-svg`) | `js/ui/play.js` (now in sudoku-player): the listener is on `document` and filters on `svg.contains(target)`; verified one stop in play mode, Tab / Shift+Tab leave and re-enter the same cell. The generator's own board keeps its single roving tab stop |
| C | Cache hits built the empty preview board and then the real one (samurai 60 ms) | `js/ui/app.js`: the preview is drawn in a microtask queued after the client call, so a synchronous answer skips it; a normal run still shows the preview before the first paint (verified: preview + Cancel visible 40 ms into a samurai run). Samurai hit 60 → 43–44 ms (worst 49 ms), sohei 44 → 38, mega16 41 → 36 |
| D | At 768–1199 px with text size "Larger" the result panel overflowed the page by 154 px (fixed 15 rem preview column) | `css/components.css`: `.result__body` is a wrapping flex row; `min(100%, …)` in the `auto-fit` minimums of `.result__sections` / `.stat-grid` |
| E | At 320 px with text size "Larger" the replay-speed buttons and the result sections overflowed (WCAG 1.4.10 reflow) | `css/layout.css` (`.player__speeds .segmented__btn` may wrap, smaller padding) + the `components.css` change above |
| F | Stale comments (Killer layout "~300 ms", Greater-Than sign dig "50–70 ms single piece") | `js/worker/worker-client.js`, `js/worker/gen.worker.js`: longest Killer slice ≈ 70–90 ms (one DFS), Greater-Than ≈ 10 ms |
| G | `SG.cache.setEnabled` had no UI | `js/ui/a11y.js`: "Pre-generate puzzles in the background" switch in Settings (EN/VI, says "not remembered after a reload"; only shown when `SG.cache` is loaded; in-memory flag, no new storage key) |
| H | `aria-pressed` semantics of the header theme buttons with theme = auto were undocumented | `js/ui/a11y.js`: the theme hint now says no header button is shown as pressed under "Automatic" (all four states verified consistent) |
| I | `tests/soak.js` had no way to run more than 500 puzzles meaningfully (5–6 per combination) | `--full` / `--per-combo=N` |
| J | `.gitignore` listed six agent scratch folders | replaced by `.scratch-*/` and `.browser-profile/` |

Checked and found fine: console warnings (none), 404s (none), raw i18n keys (none), English text in VI (none), missing VI
diacritics (none), rendered contrast (none), focus restoration (generate, regenerate, dialogs, drawer), leaks (none), URL
robustness (`?v=nope`, `?seed=abc`, `-5`, 20-digit seed, `?lang=fr`, level the variant lacks, out-of-range option → sane
defaults, no exception), 8 rapid Generate clicks (only the last delivers), Cancel (both modes).

## 7. Open items and known limitations

* **DOM order vs visual order at ≥ 1200 px** (defect list item e): the DOM order is controls, board + player + status, steps,
  result; at ≥ 1200 px the result sits under the board and the steps panel is the right column, so Tab goes board → player →
  steps → result while the eye goes board → result → steps. There is no cheap fix: all areas are placed with `grid-area`, so
  moving `#result-root` before `#steps-root` only moves the mismatch to the < 1200 px layouts, where today DOM order equals
  visual order (and to the single-column phone layout, which is the most used). The order is logical (replay controls, then
  what they explain, then the summary) and every region is a landmark with a label. Recorded as a known limitation.
* Pre-generation and the "Background pre-generation" switch are not remembered across reloads (the store has no generic
  preference facility; documented in the dialog).
* `file://`: main-thread mode (Workers are blocked from `file://`); no pre-generation; the page stalls for one slice, at most
  one DFS of the Killer layout ≈ 70–90 ms (hard Killer) or a full-grid search, between frames.
* Samurai / Sohei on a 375 px phone are drawn complete but small (glyphs ≈ 6 px): pinch-zoom is needed.
* Only Edge/Chromium was tested; mobile is emulation; no real screen reader; the OS print dialog and other paper sizes were
  not exercised; the headless Edge of this machine appears to report `prefers-reduced-motion: reduce` by default (the Settings
  dialog showed the "your device already asks for reduced motion" note without any emulation), so runs that did not set the
  media feature explicitly ran with reduced motion (the matrix set both values explicitly).
* Calibration statistic: for the big boards (samurai / sohei / flower hard) only 16–84 % of the puzzles reach their level
  without the technique floor (all reach it with it); this does not affect any invariant.

## 8. Tab order of the page (desktop, after a generation)

skip link → EN, VI → light, dark, high-contrast → Settings → Help → variant, difficulty, symbol set, symmetry, seed, new seed,
copy seed, "Advanced options" → Generate, Regenerate, Export → **one board cell (roving)** → ("Play this puzzle" — the play-mode
toggle of the combined project, now in sudoku-player) → first, previous,
play, next, last → scrubber → Instant, Fast, Step, Manual → 7 steps (row button + "Details" toggle each) → result: seed input,
copy seed, link input, copy link, "show solution" switch → (skip link). Arrow keys, Home / End / Ctrl+Home / Ctrl+End move between cells.

## 9. How this was run (for repeatability)

`node tests/soak.js --full` · `node tests/perf.js` · `node tests/node-runner.js` · `SG_DEEP=1 node tests/node-runner.js
--suite=variants,multigrid,mega`. The browser work used throw-away Node scripts (CDP over `WebSocket`, a 40-line static
server, Edge `--remote-debugging-port`) in a scratch folder that was deleted afterwards; nothing of it ships.

## 10. After the split: the "Play online" hand-off (T-7.8)

Checked in headless Edge over CDP, served over `http://127.0.0.1` (Worker mode) and opened from `file://` (main thread): a
Classic 9×9 and a Killer puzzle were generated; the Export dialog's **Play online** section showed a link
`https://tdat00.github.io/sudoku-player/#puzzle=z.…` (1.9–2.5 kB) whose token decoded in the page to a document whose `model`
rebuilds the puzzle (`SG.model.create`: 81 cells / 27 units; Killer: 29 cages, one solution with the cage sums); the button
and the result panel's "Play online" called `window.open(url, '_blank', 'noopener')` exactly once; a forced 150 kB token showed
the length warning with the JSON alternative; English / Vietnamese, light / dark screenshots looked right; 0 console errors or
exceptions in both modes. Opening the puzzle inside the player is verified from the player's side.
