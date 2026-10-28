# Generation Steps — task index and overall acceptance

**Scope:** production implementation of the signed-off redesign of the generator's **Generation Steps** replay: a
score table on every step, scores that rise steadily, and an explanation of every jump that the recorded moves
cannot remove — with the generation algorithm and every puzzle unchanged.
**Status:** task documents prepared; implementation has not started.
**Traceability:** [`docs/generation-steps/report-detailed.md`](../../docs/generation-steps/report-detailed.md),
Part I (resolutions R1–R19, signed by claude-opus-5.5 and gpt-6-astra on 2026-10-28), the golden data
[`docs/generation-steps/gpt-6-astra/4-acceptance-data.md`](../../docs/generation-steps/gpt-6-astra/4-acceptance-data.md)
and its cross-check
[`docs/generation-steps/claude-opus-5.5/4-check-of-acceptance-data.md`](../../docs/generation-steps/claude-opus-5.5/4-check-of-acceptance-data.md).
**Execution:** one `claude-sonnet-5.5` general-purpose developer sub-agent per task, strictly one task at a time,
on the branch `generation-steps`; nothing is pushed.
**Code base:** HEAD `8d9510a`. Line anchors in the tasks refer to that commit; a later task sees the changes of
the earlier ones and finds an anchor by the quoted text when the line has moved.

Each task contains the contracts, data shapes, constants, strings and golden numbers it needs. The design
references (R-numbers, report sections) are traceability, not instructions to research the design again.
Checkboxes below mean "implementation accepted and committed", not "task document exists".

## 1. Task index

| Done | ID | File | Title | Depends on | Size | Owner role | Milestone | Wave |
|---|---|---|---|---|---|---|---|---:|
| [x] | GS01 | [GS01](GS01-replay-moves-and-ratings.md) | Replay analysis core: moves, ratings, statuses, test data | none | Large | Engine | M1 every position rated | 1 |
| [x] | GS02 | [GS02](GS02-views-selection-and-tiers.md) | Two views, compact selection, audit, transitions and tiers | GS01 | Medium–Large | Engine | M2 steady compact steps | 2 |
| [x] | GS03 | [GS03](GS03-jump-explanations.md) | Jump explanations: cause, culprit, choice, first use, restricted check | GS02 | Large | Engine | M3 jumps explained (data) | 3 |
| [x] | GS04 | [GS04](GS04-worker-job-and-clients.md) | Worker job, client `replay` in both modes, cache forwarding | GS03 (and its prerequisites) | Medium | Worker/browser integration | M4 preparation off the page | 4 |
| [x] | GS05 | [GS05](GS05-replay-views-texts-and-preparation.md) | Replay views, step texts, preparation flow and main-mode gate | GS02, GS03, GS04 | Large | Generator UI | M5 a table on every step | 5 |
| [x] | GS06 | [GS06](GS06-steps-panel-callout-and-frames.md) | Steps panel: table states, tiers, jump callout, "Why?", culprit frames | GS05 | Large | Generator UI + core board | M6 jumps explained (UI) | 6 |
| [x] | GS07 | [GS07](GS07-documentation-consistency.md) | Documentation consistency in both languages | GS06 | Small | Documentation | M7 documents in step | 7 |
| [ ] | GS08 | [GS08](GS08-final-verification.md) | Final verification (Q9 c) and release evidence | GS07 | Medium | QA/release | M8 verified | 8 |

Sizes: Small about 100–300 changed lines; Medium about 300–800; Large about 800–1,600 (tests included, generated
test data excluded).

## 2. Ready waves

| Wave | Task | Why it cannot share the wave |
|---:|---|---|
| 1 | GS01 | creates `generator/js/engine/replay.js`, its suite and test data, and changes the four script lists |
| 2 | GS02 | edits `replay.js`, `replay.test.js`, `generator/design.md` and both developer guides, like GS01 and GS03 |
| 3 | GS03 | same files as GS02 |
| 4 | GS04 | its worker tests load `replay.js` through the worker's script list; it edits `design.md`, the developer guides, `app.js` and `cache.js`, which GS05 edits next |
| 5 | GS05 | consumes the analysis (GS01–GS03) and the client (GS04); edits `player.js`, `app.js`, `cache.js`, `index.html` and every guide |
| 6 | GS06 | consumes GS05's step objects and table models; edits `step-view.js`, `player.js`, `steps.test.js` and the guides |
| 7 | GS07 | reads and corrects every document the earlier tasks touched |
| 8 | GS08 | verifies the integrated tree; reports defects back, does not fix product code itself |

No two tasks run at the same time: every pair shares a file or a test that loads the other's files, and the
living documents (`generator/design.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `USERGUIDE.md`,
`USERGUIDE.vn.md`, the help text in `generator/js/ui/help.js`) have one writer at a time. GS04 consumes the complete
GS03 iterator and compares its two-view/explanation output, so GS03 is an actual prerequisite, not just scheduling.

A dependency means an accepted and committed task, not a file that appeared in the tree.

### Exclusive ownership

| Task | Owns (creates or edits) | Must not edit |
|---|---|---|
| GS01 | `generator/js/engine/replay.js` (new), `generator/tests/suites/replay.test.js` (new), `generator/tests/fixtures/replay-goldens.js` (new), `generator/tests/fixtures/replay-wire.js` (new, generated), `generator/tests/replay-fixtures.js` (new); the script lists of `generator/index.html`, `generator/tests.html` (`SOURCE_FILES`, `FIXTURE_FILES`, `SUITE_FILES`), `generator/tests/node-runner.js` (`SOURCE_FILES`) and `generator/js/worker/gen.worker.js` (`SCRIPTS` only); docs: `generator/design.md` §7.5 (new), §12.1, §15.2; `DEVELOPERGUIDE.md` / `DEVELOPERGUIDE.vn.md` (directory tree, running the tests, a `SG.replay` paragraph) | the engine (`digger.js`, `pipeline.js`, `difficulty.js`, the variants, `core/`), every UI file |
| GS02 | `replay.js`, `replay.test.js`; docs: `design.md` §7.5, the `SG.replay` paragraph of both developer guides | the test data of GS01 (read-only), UI files |
| GS03 | `replay.js`, `replay.test.js`; docs: `design.md` §7.5, the `SG.replay` paragraph of both developer guides | test data, UI files |
| GS04 | `generator/js/worker/gen.worker.js`, `generator/js/worker/worker-client.js`, `generator/js/ui/app.js` (`directClient` only), `generator/js/ui/cache.js` (wrapper client only), `generator/tests/suites/worker.test.js`, `cache.test.js`, `ui-contract.test.js` (`CLIENT_SURFACE` only); docs: `design.md` §9.3, §13.10, the "Worker and fallback" part of both developer guides | `replay.js` (read-only; report defects), `player.js`, `step-view.js` |
| GS05 | `generator/js/ui/player.js`, `generator/js/ui/app.js`, `generator/js/ui/cache.js`, `generator/index.html` (replay markup only), `generator/css/steps.css` (status and toggle rules), `generator/js/ui/help.js` (`help.generation.replay`, `help.controls.replay`), `generator/tests/suites/player.test.js`, `steps.test.js` (migration only), `cache.test.js`, `ui-contract.test.js` (`SURFACE.player`, `PLAYER_INSTANCE`, `MOUNT_IDS`); docs: both user guides, both developer guides (replay, cache, UI modules), `design.md` §7.3, §13.10 | `replay.js` (read-only), `step-view.js`, `core/` |
| GS06 | `generator/js/ui/step-view.js`, `generator/js/ui/player.js` (board frames and five `replay.*` keys), `generator/js/ui/app.js` (the `table` option of the steps panel), `generator/css/steps.css`, `core/css/board.css`, `core/js/ui/board-view.js` (`setSignMarks` only), `generator/tests/suites/steps.test.js`, `player.test.js` (frame tests), `generator/js/ui/help.js` (`help.generation.replay`); docs: both user guides, `design.md` §10.5, both developer guides (steps panel sentence) | `replay.js`, worker files, `cache.js` |
| GS07 | the guides, README, design/task documents and the two Help locale strings listed in GS07 | product logic and tests (Help prose is the explicit documentation-only exception) |
| GS08 | `docs/qa/browser-run.md` (a new dated section); scripts, snapshots, browser profiles and evidence in its external experiment folder E | product code, tests, fixtures, regression hashes, qualification lists; no scratch files in the working tree |

The detailed file lists in each task refine this table. A file that is not listed needs the orchestrator's
approval before a developer edits it.

### Per-task protocol and commits

1. Step 0 (orchestrator, once): verify/use the already-created branch `generation-steps` at `8d9510a`
   (create it only if absent), and commit the design
   documents `docs/generation-steps/` and this pack `tasks/generation-steps/` as its first commit.
2. The orchestrator launches the developer of the next task with the task file and this check-list.
3. The developer implements, runs the commands of the task, and replies with the evidence of §8. It never
   commits, stages, stashes, resets, pushes or switches branches, and never edits this pack or an execution log.
4. The orchestrator re-runs the task's quick commands on the tree, reviews the diff against the task's acceptance
   tables, fills the task's **Execution log** and the summary table below, and commits **once per accepted task**
   on `generation-steps`, with only that task's files and its log update. Suggested message: `Generation steps
   GSnn: <task title>`. Nothing is pushed.
   **GS08 exception:** inspect its captured exit codes, candidate SHA and complete evidence; do not automatically
   repeat `--all` or the browser gates. A new final candidate after a defect fix needs an explicitly recorded
   replacement gate run, not two routine runs by developer and orchestrator.
5. A rejected task goes back to its developer (or to a new one with the review notes); a defect found by a later
   task goes back to the owner of the file as a fix round recorded in both logs.

## 3. Shared working conventions

These are the repository's own rules (`AGENTS.md`, `DEVELOPERGUIDE.md` "Conventions", `generator/design.md` §12.2).

- **Classic scripts.** Every file in `js/` is an IIFE attached to the `SG` global (`(function (root) { 'use
  strict'; const SG = root.SG = root.SG || {}; … })(typeof self !== 'undefined' ? self : globalThis);`). No
  `import`, `export` or `require` in `js/` (the `purity` suite checks it). Engine files (`js/engine/`) never touch
  `document`, `window` or `localStorage`.
- **Style.** 2-space indent, single quotes, semicolons, lines of at most 110 characters in the engines
  (`generator/js/engine/`, `core/js/engine/`), English comments only where the code is hard to follow.
- **Colours** only through the tokens of `core/css/tokens*.css` (`var(--sg-…)`); no colour literal in CSS, in
  `index.html` or in JavaScript strings (the `ui-contract` suite checks it). Use the existing tokens named in the
  tasks; do not add tokens.
- **Strings.** Every string a user sees goes through `SG.i18n.t()` and exists in English and Vietnamese, in the
  locale fragment of the module that shows it (`SG.localeFragments.push({ en: {…}, vi: {…} })`). Both languages
  have the same keys and the same `{placeholders}` per key; plural keys come as `_one` / `_other` pairs in both
  languages (Vietnamese always uses `_other`, so its `_one` text is never shown, but it must exist, in natural
  Vietnamese, with the placeholders of the English `_one`). `SG.i18n.t()` does not format numbers: pass numbers
  already formatted with `SG.i18n.formatNumber(n, options)`, except `count`, which must stay a number because it
  chooses the plural form.
- **Script lists.** A new file in `generator/js/**` is added to every list, in the same place:
  `generator/index.html`, `generator/tests.html` (`SOURCE_FILES`), `generator/tests/node-runner.js`
  (`SOURCE_FILES`, the reference order) and, for engine files, `generator/js/worker/gen.worker.js` (`SCRIPTS`). A
  new suite goes into `SUITE_FILES` of `generator/tests.html`, a new fixture into its `FIXTURE_FILES`. The
  `ui-contract` suite fails when they drift apart.
- **Documents in the same change.** When behaviour changes, the guide it belongs to (user guide for players,
  developer guide for developers), in **both languages**, and `generator/design.md` are updated in the same task.
  `generator/tests/suites/help.test.js` checks that the English developer guide's Generator part names every
  script of `index.html`, only commands that exist with options their script knows, and only `SG.x.y` names that
  resolve; keep those true in both languages. No absolute path in any document (decision Q6 b): repository paths
  from the root or relative links.
- **Tests.** Run the quick suites only: `cd generator && node tests/node-runner.js --suite=<name>[,<name>]` while
  working, then `cd generator && node tests/node-runner.js`; when a task changes `core/`, also
  `cd player && node tests/node-runner.js`; when it edits a guide, at least
  `cd player && node tests/node-runner.js --suite=help` (the player's suite checks every `#anchor` of both guides
  in both languages). Never run `--all`, `--manual`, `soak.js`, `perf.js`, `qualify.js`,
  `--update-hashes`, `SG_UPDATE_HASHES`, `SG_DEEP=1`, the browser scripts or `tests.html` — GS08 alone runs the
  final gates. Never weaken, skip, delete or rewrite a test to make a run pass; never change the heavy suites,
  the regression hashes (`generator/tests/fixtures/regression.js`), the qualification lists, the existing
  fixtures or `help-examples.js`. An edit to an existing test that a task lists as an intended contract change
  (decision D13) is allowed; any other failing test is reported, not edited.
- **New tests run in a browser too.** `generator/tests.html` runs the same quick suites in a browser (GS08 compares
  its failures with those of `8d9510a`). A new test that needs Node (`SG.test.node`, the file system) or a fake DOM
  that a real page would contradict calls `SG.test.skip(reason)` there, as the existing suites do
  (`generator/tests/suites/help.test.js:21`, `generator/tests/suites/i18n.test.js:432`); test data are classic
  scripts (D9), never read with `require` or `fs`.
- **Files on disk.** UTF-8 without BOM, **CRLF line endings** (git has `core.autocrlf=true` and
  `core.safecrlf=true`: a file with mixed endings cannot be staged), a final newline, no trailing whitespace.
  Check a file with
  `node -e "const t=require('fs').readFileSync(process.argv[1],'utf8');console.log(/[^\r]\n/.test(t)?'LF found':'CRLF only')" <file>`.
- **Processes.** Stop only processes the task started, by PID. Install nothing (there is no npm package; tests run
  on Node 24).
- **Native command failures.** In PowerShell, a failed `node` does not stop the next `cd`. After every Node/git/
  archive gate, check `$LASTEXITCODE` and throw on nonzero; run dependent commands only after that check.
  The orchestrator supplies the GS08 developer with a fresh writable **E — the experiment folder, outside the
  repository** — via `SG_REPLAY_EVIDENCE`. Set that variable in each fresh shell that uses it. Do not put its
  absolute value in a document. Existing browser scripts run from a candidate snapshot in E, so their own
  relative profile/screenshot folders also remain outside the working tree.

## 4. Implementation decisions taken for this pack

The user delegated the remaining implementation details at 18:39 ("continue with recommendations"). These
choices refine the report's sketches; the tasks inline them where they are needed.

| # | Decision |
|---|---|
| D1 | **`SG.replay`** (`generator/js/engine/replay.js`, pure, DOM-free, owned by the generator): `VERSION = 1`; `CONSTANTS = { RATE_NODES: 1000000, COUNT_NODES: 200000, MIN_GAIN: 10, R_MIN: 1.3, R_MAX: 3, R_EXP: 1 / 6, JUMP_RATIO: 3, JUMP_GAIN: 100, CULPRIT_SHARE: 0.9, TOGETHER_SHARE: 0.1, PROBE_MAX_CELLS: 4 }`; functions `moves`, `rateBoard`, `prepare` (an iterator), `analyse`, `fallback`, `toPlainWire`, `fromPlainWire` (GS01), `buildViews`, `select`, `audit`, `isJump`, `badgeRatio`, `phaseCode` (GS02), `classifyShares`, `firstUse`, `restrictedCheck` (GS03). |
| D2 | **Analysis data model** (`Move`, `Span`, `Rating`, `View`, `ViewStep`, `Transition`, `Terms`, `Folded`, `Proof`, `Cause`, `Choice`), inlined in GS01–GS03. It refines R15: view steps are objects (role, first and last move, end position, phases), a transition knows its view step, proofs belong to end positions. Structured-clone safe and language-neutral (ids, numbers, cell indexes; no text). |
| D3 | **Progress** counts positions: zero/memo positions count once; explanation yields repeat `done: total` internally. Schedulers retain the latest yield, suppress duplicate counts and flush final progress before completion, including one-slice/fallback jobs. |
| D4 | **Boards travel with the analysis**: each move carries `values` (an `Int32Array`) and `alive` (indexes of the signs still on the board, or null); the page never parses the log nor runs a solver to show a step. |
| D5 | **Tiers**: `first` once per view (the first transition from a score of 0 to a positive score); in the details view the first rated board after a restart gets no tier; `newPeak` needs a positive score before. |
| D6 | **Worker protocol**: one active job; `generate`, `replay`, `cancel` pre-empt it at the next slice. Plain-wire `replay` requests answer progress/done/error with the same session. Client API `replay(result, { onProgress, allowMain: false }) → Promise<Analysis>` and `cancelReplay()`. Only an explicit Prepare press passes `allowMain: true`; worker startup/respawn failure must not silently run analysis on the page. A missing grant rejects with `budget.cancelled`, reason `replayConsentRequired`; a concurrent generation rejects `unexpected` / `busy`. |
| D7 | **Page flow**: a pure controller `SG.player.createPreparation(...)` decides after `ready()` of the page's client: worker mode prepares at once; main mode shows the notice and the button (Q19 a). Pressing it when the log is missing emits the app event `'replay:consent'` `{ result }`; the cache starts the log generation only then. `SG.app.markTraceUnavailable()` shows the fallback when the log cannot be had. New string `replay.preparing.trace`. |
| D8 | **Step objects** keep `phase` (`fullGrid` / `extraStructure` / `dig`), `line` and `metrics` for the Help's explanation context; `kind` becomes the title kind (`solution`, `cages`, `signs`, `clues`, `random`, `dig`, `guided`, `search`, `signDig`, `reveal`, `mixed`, `restart`, `final`). The uses column keeps "(+n)" against the step shown before; there is no per-row score change; the Total reads "551 (+507)". |
| D9 | **Test data are classic scripts**, because `generator/tests.html` works from `file://`: `SG.fixtures.replayGoldens` (the golden numbers, given in GS01) and `SG.fixtures.replayWire` (the `toPlainWire` data of the four slow goldens G09–G12, with `timings: {}`, generated by `node tests/replay-fixtures.js` and checked with `node tests/replay-fixtures.js --check`). |
| D10 | **Browser runs (GS08)** use immutable candidate/baseline snapshots under external E. Load the player's DevTools helpers from the candidate snapshot: their relative profiles/screenshots then stay in E. Ports 8790 / 9390 (candidate tests), 8791 / 9391 (baseline tests), 8792 / 9392 (smoke), checked free. Worker suppression is injected before loading the real page; no repository scratch directory or production-code modification. |
| D11 | A one-move jump that changes **more than 4 cells** is not probed: cause class `unavailable` (no frame). |
| D12 | **Plural placeholders**: the English `_one` texts of `replay.folded.unscored` and `steps.jump.choice.nulls` contain `{count}`, and the Vietnamese `_one` of `steps.jump.choice.guided` has no `{count}`, so that both languages have the same placeholders per key (the `i18n` suite). |
| D13 | **Contract tests updated on purpose** (not weakened): `ui-contract` — `SURFACE.player` (`buildSteps` becomes `buildViews`; `createPreparation` added), `PLAYER_INSTANCE` (+ `setPreparation`, `setAnalysis`, `setView`, `getView`, `tableAt`), `CLIENT_SURFACE` (+ `replay`, `cancelReplay`), `MOUNT_IDS` (+ the four new ids), `SURFACE.app` (+ `markTraceUnavailable`, which the header comment of `app.js` must name); the trace tests of `cache.test.js` await `flush()` where the trace now starts after `ready()`; the batch-bound tests of `player.test.js` (lines 223, 240, 311, 336, 354 at `8d9510a`) and the `rateStep` / `stats` tests of `steps.test.js` are rewritten around the new invariants (report §9.3). |
| D14 | There is **no autoplay** control at `8d9510a` (no `autoplay` in `generator/js` or `generator/index.html`); the report's mentions of autoplay are satisfied by keeping it that way. |
| D15 | `contradiction` is an unscored `stuck` status with its own reason/text; a count of 0 is never treated as rated. A stuck board can additionally report `ambiguous`. Missing supplied final ratings use conservative `unverified` / `missingRating`, no solve and no invented total. |
| D16 | **New markup** in `generator/index.html`: `#replay-view-details` (the "Show every move" checkbox), `#replay-status` with `#replay-status-text` and `#btn-prepare-replay`; their styles in `generator/css/steps.css`. |
| D17 | Cause sentences of a move that restores any clue (an exchange or a restore-only move) use the `…Exchange` / `…Restore` variants (gpt-6-astra's sign-off note). |
| D18 | The steps-panel option `stats` (today `player.rateStep`) becomes `table` (`player.tableAt`) in GS06; GS05 keeps `stats` working through an adapter that returns null for status tables. |
| D19 | **Vietnamese of `steps.jump.v`**: "V (điểm của ô trống) = 80 × E ÷ (E + 40): {from} → {to} ({change})". The `i18n` suite rejects a Vietnamese text identical to the English one when more than one word remains without the placeholders, which the formula alone would be. |
| D20 | **Step metrics and meta lines come from the moves**, not from the raw log: removed / restored cells, signs and sizes are counted from `Move.removed`, `Move.restored`, `Move.sign` of the moves a step covers (GS05). |
| D21 | **Main mode waits for the press in every case** (Q19 a): also when an imported or cached result has no log, nothing (not even the log regeneration) starts before "Prepare score tables". Before the first progress report, the status shows `total` = `SG.replay.moves(result).moves.length`. |
| D22 | **Slow goldens from saved data** (phase 5 decision): G09–G12 are analysed from `SG.fixtures.replayWire` (D9) in the quick suite; the fast goldens are generated live; `node tests/replay-fixtures.js --check` proves the saved data still match a fresh generation (GS01, again in GS08). |
| D23 | **View builder**: `SG.replay.buildViews(analysis) → { chapter, views, transitions }` is exported in GS02, pure and shared by production and synthetic tests. Conservative fallback steps bypass selection; final positions are not duplicated there. |
| D24 | **Preparation races**: capture the client and a per-run token; latch early trace consent/unavailability; disable browsing throughout preparation. Automatic traces use worker-only background clients (including respawns); an authorized main trace uses the uncached inner client directly. |
| D25 | **Rendering context and sign frames**: each UI Step has shared read-only `context: { moves, signs }`. A sign culprit remains in `removed`; a separate rectangle around its gap carries `sign--cause`, never an active-looking replacement glyph. |
| D26 | **Honesty at boundaries**: details restarts show their numeric drop to 0; a zero technique count is not a use; unscored earlier positions qualify first-occurrence wording, and work-only multi-move jumps use neutral cause text. |

## 5. Business traceability

The user's request (2026-10-28, in Vietnamese; translated in the report §1.1): **N1** keep the generation
algorithm and the final puzzle; **N2** every generation step has a score table, even when the score did not
change; **N3** scores rise steadily, not by jumps. Decision of 13:54: **N4** a jump that no grouping or splitting
of steps removes stays, and the page explains why the score jumped.

| Requirement or decision (time) | Implemented by | Accepted by |
|---|---|---|
| N1 algorithm and puzzles unchanged | every task (no engine change); the analysis only reads `result` | GS01-T01, GS01-T08, GS04-T07, GS08-B03, GS08-T01–T03, GS08-T07 |
| N2 a table on every step | GS02 (cuts only at scored positions), GS05 (tables wired), GS06 (every table state) | GS02-B01, GS05-B01, GS06-B01–B03, GS08-B01 |
| N3 steady scores | GS02 (selection, audit) | GS02-B02–B04, GS08-B01 |
| N4 explained jumps (13:54) | GS03 (data), GS06 (badge, callout, "Why?", frame) | GS03-B01–B04, GS06-B04–B07, GS08-B01, GS08-B04 |
| Q1 a (15:30) compact by default + "Show every move" | GS02 (two views), GS05 (toggle) | GS02-B05, GS05-B03 |
| Q2 a (15:30) never split a symmetric group | GS01 (whole groups and signs), GS03 (partial boards only as probes) | GS01-B02, GS03-B02 |
| Q3 a (15:30) compact never decreases; folds told in text | GS02 (eligibility, folds), GS05 (fold sentences) | GS02-B02, GS05-B04 |
| Q4 b (15:30) badge at ≥ ×3 and ≥ +100, score before > 0; "First rated puzzle" | GS02 (rule, ratio), GS06 (badge, labels) | GS02-B06, GS06-B04 |
| Q5 a (15:30) 2–3 visible sentences + "Why?" | GS03 (data), GS06 (callout) | GS06-B05 |
| Q6 b (15:58) no absolute paths in documents | every task (conventions) | GS07-T03, GS08-T08 |
| Q7 a (15:58) task pack, sonnet developers, one commit per task, no push | this pack, §2 | the summary below |
| Q8 b (15:58) branch `generation-steps` | §2 | GS08-T09 |
| Q9 c (15:58) quick suites per task; `--all` once and the browser runs at the end | every test plan; GS08 | GS08-T01, T02, T04, T05, T06 |
| Q10 b (16:20) frame the single culprit clue or sign, with a legend | GS03 (frame data), GS06 (drawing, legend) | GS03-B03, GS06-B06, GS08-B01, GS08-B04 |
| Q11 i+ii+iii (16:20) level before → after, the generator's choice, the first use | GS03 (data), GS06 ("Why?") | GS03-B04, GS06-B05 |
| Q12 a (16:20) every phase end ends a step | GS02 | GS02-B03 |
| Q13 a (16:20) a restart folded into "Starting again" | GS02 (chapter), GS05 (texts) | GS02-B07, GS05-B04 |
| Q14 a (16:20) an unscorable details move is its own step with a status table | GS01 (statuses), GS06 (status tables) | GS01-B04, GS06-B03 |
| Q15 a (16:20) Killer's rebuilt log recognised from its shape | GS01 (detection), GS05 (texts) | GS01-B05, GS05-B05 |
| Q16 a (16:20) no slider marks, no proof drawn on the board | GS05, GS06 (must not add them) | GS05-T09, GS06-T10 |
| Q17 b (16:20) no Worker: "Prepare score tables", nothing automatic | GS04 (client runs only when asked), GS05 (button) | GS04-B03, GS05-B02, GS08-B02 |
| Q18 b (16:20) guard exhausted: honest status, no retry | GS01 (`capped`), GS06 (status table) | GS01-B04, GS06-B03 |
| Q19 a (18:40) main mode waits for the press; browsing disabled | GS05 | GS05-B02, GS08-B02 |
| Phase 5 decision: slow goldens G09–G12 from saved results | GS01 (test data and their script) | GS01-T06 |

## 6. Technical acceptance (every task)

- The task's own commands pass, then the generator quick set (`cd generator && node tests/node-runner.js`); with a
  `core/` change also `cd player && node tests/node-runner.js`.
- `ui-contract`, `i18n`, `help` and `purity` stay green; the four script lists stay identical.
- The generation result does not change: the regression hashes and the `smoke` suite pass untouched; GS01 tests
  that the analysis leaves a result untouched and that the example still gives its known givens, rating and log;
  GS08 checks that the example's deterministic payload digest is still
  `d350758d7af16c41f4910469df513f56a7516966407285e1f39d9d983df68f2d` (the suites cannot hash: no `crypto`).
- Nothing new is stored: the cache (schema 2, key format), the history (version 1), the export and the URL are
  unchanged; the `history` and `export` suites pass untouched.
- No colour literal, no absolute path in a document, CRLF everywhere, lines of at most 110 characters in engines.
- No heavy test, existing fixture, regression hash, qualification list or generated file is changed (GS01's test
  data are new files).

## 7. Final gates (Q9 c) — run once, in GS08

1. `cd generator && node tests/node-runner.js --all` (about nine minutes; the quick and the manual suites), alone.
2. `cd player && node tests/node-runner.js` and `cd generator && node tests/node-runner.js` (the quick sets again),
   and `cd generator && node tests/replay-fixtures.js --check`.
3. Identity (N1): the example's payload digest, cache key and entry, history entry and export are the same on the
   branch and on a copy of `8d9510a`; no engine, variant, regression or qualification file changed.
4. From **`E\candidate\player`**, `node tests\browser\run-all.js` (headless Microsoft Edge, `EDGE_PATH` for another
   Chromium-based browser; Node 24 for this task; about four minutes). Do not run it from the working tree:
   the existing helper creates profiles and screenshots beside its source.
5. `generator/tests.html` in headless Edge over http, on both snapshots; no new failure, missing file or runtime
   exception, and the new replay suite must actually run. Existing browser failures are recorded limitations,
   not "failures by design"; baseline equivalence must not be reported as an all-tests-pass result.
6. A scripted smoke check of the real page: the example in worker mode over http (English and Vietnamese), in main
   mode from `file://` without a Worker (the notice, the button, browsing disabled, then both views), and the
   Greater-Than sign frame.
7. The golden sweep with the cost of each golden, the list of new strings for the EN / VI review, and a dated
   section in `docs/qa/browser-run.md`.

Exact commands, ports and clean-up are in [GS08](GS08-final-verification.md).

## 8. Evidence and sign-off

Each developer's final reply gives:

1. The changed files (created / edited), and the statement that nothing else changed.
2. The public API and contracts it delivered for the next task (signatures, data shapes, keys).
3. Every command it ran and its outcome (suite names, pass / fail counts, duration).
4. The acceptance IDs it believes are met, and any it could not meet, with the reason.
5. Issues met and the solution chosen; any deviation from the task, with its reason.
6. Remaining risks or follow-ups for later tasks.

The orchestrator independently re-runs each task's quick checks, but reviews GS08's recorded final-gate evidence
without routinely repeating `--all` or the browser gates. It fills the task's empty Execution log: Status, Start, End,
Duration, Model, Token usage, AI credits, Verification, Acceptance, Issues & resolutions, Handoff. A golden number
is never changed to match an implementation: a mismatch is a defect of the implementation, or an evidenced
finding for the orchestrator to resolve under the delegated decision authority.

## 9. Release decision record

| Gate | Status | Evidence / remaining action |
|---|---|---|
| GS01–GS07 accepted and committed | | |
| Generator `--all` (once) | | |
| Quick sets of both apps | | |
| Player browser scripts (`run-all.js`) | | |
| Generator `tests.html` headless, failures ⊆ baseline | | |
| Real-page smoke: worker mode and `file://` main mode | | |
| Golden sweep (G01–G14) | | |
| Identity: payload digest, cache key and entry, history entry, export; regression hashes | | |
| EN / VI review of the new strings | | |
| Documents in step (both languages) | | |
| Release verdict (merging `generation-steps` is the user's decision; nothing is pushed) | | |

The orchestrator owns this record.

## Orchestrated execution summary

| Task | Status | Duration | AI credits | Commit |
|---|---|---|---|---|
| GS01 | done (T02 `checks` diagnostic-only deviation accepted) | 21m36s | 377.56 | 924181d |
| GS02 | done | 16m37s | 285.99 | 2aff62c |
| GS03 | done | 16m02s | 253.72 | 128ed08 |
| GS04 | done | 14m53s | 268.31 | d07c97c |
| GS05 | done (+ orchestrator fix of one heavy `killer` test to the new API) | 33m57s | 833.94 | 6b8d4ff |
| GS06 | done | 25m18s | 665.64 | 482b6f8 |
| GS07 | done (+ orchestrator wording fix of `cache.ready` and a `step-view.js` comment) | 20m30s | 534.78 | (this commit) |
| GS08 | | | | |
| **Totals** | | | | |
