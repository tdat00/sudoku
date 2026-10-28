# GS07 — Documentation consistency in both languages

| Header | Value |
|---|---|
| ID | GS07 |
| Depends on | GS06 (accepted and committed) |
| Estimated size | Small: about 100–300 changed lines of documentation |
| Owner role | Documentation |
| Milestone | M7 — every document says what the code does, in English and Vietnamese |
| Design refs | `docs/generation-steps/report-detailed.md` R17, R18, §9.2 (traceability only) |
| Implementation status | Not started |

## Goal & business context

GS01–GS06 each updated the documents of their own behaviour. This task reads them together, against the code, and
removes what is stale or inconsistent: the repository's rule is that the user guide, the developer guide (each in
English and Vietnamese, with the same facts), `generator/design.md`, the Help and `generator/task.md` describe the
code as it is, and the user decided (Q6 b, 15:58) that no document contains an absolute path. No product code or
test changes here: a document that cannot be made true without a code change is reported to the orchestrator.

## Scope

### In scope

- `USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` (the Sudoku Generator parts).
- `generator/design.md`: every section touched (§7.3, §7.5, §9.3, §10.5, §12.1, §13.10, §13.12, §13.14, §15.2) and
  the places no task owned: the decisions table of the deviations section (lines 1845–1864 at `8d9510a`: the rows
  "Worker client (§9.3, §13.10)" 1845, "Replay (§3.3, §7.3, §10.3)" 1848, "Board view (§13.12)" 1853,
  "Cache (§6.8 ⑦)" 1856, "Tests (§15)" 1863, "Page layout and result panel" 1864) and "Known limitations and ideas"
  (the "Main-thread mode" bullet, line 1870: the replay's score tables wait for the button there).
- `generator/js/ui/help.js` (`help.generation.replay`, `help.controls.replay`): strings only, after GS05 and GS06
  wrote them.
- `generator/task.md`: "Changes after the task cards" (line 1004) and "Test counts" (line 1000).
- `README.md` (English only, a short overview): line 19 may say that every replay step has its score table.

### Out of scope

- Product code, tests, fixtures, the task pack, the research reports under `docs/generation-steps/` (records of the
  design; they keep their wording) and `docs/difficulty-rating/`.

## Repository rules

- Both languages carry the same facts and numbers; the Vietnamese texts are natural Vietnamese with diacritics.
- `generator/tests/suites/help.test.js` stays green: the English developer guide's Generator part names every script
  of `index.html`, shows only commands that exist with options their script knows, and names only `SG.x.y` APIs that
  resolve; links resolve.
- No absolute path; repository paths from the root or relative links. UTF-8 without BOM, CRLF, final newline.
- Quick suites only; no commit / stage / stash / push / branch switch; do not edit `tasks/generation-steps/`.

## Inputs & context

The behavior to describe is the accepted GS01–GS06 contract below. Check it against the code; a mismatch is
reported to the orchestrator for correction, **not** legalized by changing a golden number or hiding a feature.

- `SG.replay` (`generator/js/engine/replay.js`): complete moves from the dig log; one canonical rating per board
  (guard 1,000,000 checks; a 200,000-node uniqueness count when the proof assumes uniqueness; the finished puzzle
  reused); statuses `rated`, `zero`, `final`, `capped`, `stuck`, `ambiguous`, `unverified`; the compact selection
  and its audit; the details view; transitions and tiers (jump: ≥ ×3 **and** ≥ +100 with a positive score before;
  badge ratio rounded down to one decimal); the jump explanations (cause, frame, choice, first use, restricted
  check).
- The worker's `replay` job and the client's `replay` / `cancelReplay` in both modes; in main mode nothing runs
  before "Prepare score tables" (Q17 b, Q19 a).
- `SG.player.buildViews`, `createPreparation`, the toggle "Show every move", the status block;
  `SG.app.markTraceUnavailable()` and the `replay:consent` event; the cache's trace gate.
- `SG.stepView` with `table`: the table states, the badge, the callout, "Why?", the row label, the culprit frames.
- Example numbers: Classic 9×9 Expert seed 3275974478 — compact `0, 23, 44, 551, 568, 992, 992`, 33 details steps,
  the jump 44 → 551 (×12.5) caused by R1C2; Classic 9×9 easy seed 3 — 7 compact / 26 details steps; Killer hell 2 seed
  11 — 9 compact / 38 details steps (the expected GS05 checks). Investigate a mismatch; do not replace these
  expectations with whatever a defective implementation happened to produce.
- Test counts: the generator's quick set is 43 suites after GS01 (16 of `core/tests/suites`, 27 of
  `generator/tests/suites`), the manual set 8, 51 in all; read the real numbers from
  `cd generator && node tests/node-runner.js` ("Quick suites only (N)") and its totals.

## Files to create/modify

### Exclusive ownership

`USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `generator/design.md`,
`generator/task.md`, `README.md`, and the two help strings of `generator/js/ui/help.js`.

### Documentation slot

This whole task.

## Implementation steps

1. Search the documents (not `docs/`) for stale terms. Classify hits as current contracts, explicitly historical
   records or unrelated wording before editing; do not bulk-rewrite the old task cards or unrelated uses of
   "steps". Correct current claims, and keep clearly identified historical facts:
   `buildSteps`, `rateStep`, `batchCells`, `roundsPerStep`, `batchSigns`, `RATE_BUDGET`, "Hardest removal",
   "about a ninth", "replays in 9 steps", "21 steps", "a batch of removals", "batches of random removals",
   "400 ms" (when it speaks of the replay), "Generation steps list", "rounds of the guided dig, each taking the
   removal that makes the puzzle hardest" — and their Vietnamese counterparts ("9 bước", "đợt xóa", "cách làm đề
   khó nhất", "danh sách Các bước tạo đề").

   ```powershell
   $docs = 'USERGUIDE.md', 'USERGUIDE.vn.md', 'DEVELOPERGUIDE.md', 'DEVELOPERGUIDE.vn.md', 'README.md',
     'generator\design.md', 'generator\task.md', 'generator\js\ui\help.js'
   $stale = 'buildSteps|rateStep|batchCells|roundsPerStep|batchSigns|RATE_BUDGET|Hardest removal|' +
     'about a ninth|9 steps|9 bước|21 steps|Generation steps list|đợt xóa'
   Select-String -Path $docs -Pattern $stale
   ```

2. Read the replay, worker, cache, UI-modules and tests parts of both developer guides side by side; make the
   Vietnamese say the same facts with the same numbers; check every `SG.x.y` against the code.
3. Read the replay parts of both user guides side by side (features, "What it is", Known limitations): the two views,
   a table on every step, the badge, "Why?", the frame, "First rated puzzle", the button and the wait in main mode;
   no code, no test, no internal names.
4. `generator/design.md`: the deviations rows and the known limitations above; §15.2's counts and rows; the
   cross-references between §7.3, §7.5, §9.3, §10.5, §13.10, §13.12, §13.14.
5. `generator/task.md`: a paragraph under "Changes after the task cards": the Generation Steps redesign (the
   analysis `SG.replay`, the two views, a table on every step, the explained score jumps, the main-mode button; the
   design in `docs/generation-steps/report-detailed.md`, the tasks in `tasks/generation-steps/`); update "Test counts"
   with the numbers of the quick set run in this task.
6. The Help: `help.generation.replay` and `help.controls.replay` (EN and VI) agree with the user guide (the
   "Show every move" toggle is a replay control).
7. Run the commands below; record the counts.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| GS07-B01 | A player reading the user guide (either language) learns: the compact and the detailed view, a score table on every step, what "First rated puzzle", "New hardest technique" and "Score jump ×…" mean, what "Why?" shows, the framed clue, and what happens when the page is opened from a file | review |
| GS07-B02 | A developer reading the developer guide (either language) finds the module `SG.replay`, the worker job, the preparation, the views, the table states and the commands for the test data, with numbers that match the code | review; `help` suite |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| GS07-T01 | The stale-term search of step 1 returns nothing (apart from historical wording that is clearly marked as such) | command output |
| GS07-T02 | EN and VI guides state the same numbers (step counts of the examples, suite counts, guards, thresholds) | review (a table of the numbers checked in the handoff) |
| GS07-T03 | Q6 b: no absolute path in any document of the repository changed on the branch: `git diff --name-only 8d9510a -- '*.md' ':(exclude)tasks/generation-steps'` lists the files (the task pack quotes these patterns itself); the search of the commands below (a drive-letter path, `/Users/`, `/home/`, the agents' session folders) finds nothing (`Env:\` in a PowerShell snippet is not a path) | command output |
| GS07-T04 | `help`, `i18n` and `ui-contract` pass; the quick set passes; CRLF in every changed file | command output |

## Test plan

### Exact commands

```powershell
$ErrorActionPreference = 'Stop'
Push-Location generator
try {
  node tests\node-runner.js --suite=help,i18n,ui-contract
  if ($LASTEXITCODE -ne 0) { throw 'Documentation contract suites failed' }
  node tests\node-runner.js
  if ($LASTEXITCODE -ne 0) { throw 'Generator quick set failed' }
} finally { Pop-Location }
Push-Location player
try {
  node tests\node-runner.js
  if ($LASTEXITCODE -ne 0) { throw 'Player quick set failed' }
} finally { Pop-Location }
$changed = git --no-pager diff --name-only 8d9510a -- '*.md' ':(exclude)tasks/generation-steps'
if ($LASTEXITCODE -ne 0) { throw 'Document diff failed' }
$changed
if ($changed) {
  $hits = Select-String -Path $changed -Pattern ('(?<![A-Za-z])[A-Za-z]:\\|/Users/|/home/|' + 'session' + '-state')
  if ($hits) { $hits; throw 'Document path check found a match; classify it before proceeding' }
}
```

(`git diff` only reads; it does not change the branch.)

## Definition of done & handoff

- The criteria have their evidence; the quick set passes; the list of numbers checked in both languages is in the
  reply.
- Handoff to GS08: the documents' final state; anything that GS08 must check in a browser (for example the
  screenshots of `docs/screenshots/` are not retaken in this change).

## Execution log

| Field | Value |
|---|---|
| Status | Done (screenshots of `docs/screenshots/` not retaken; real-browser checks left to GS08) |
| Start | 2026-10-29 01:13:37 (+07:00) |
| End | 2026-10-29 01:34:07 (+07:00) |
| Duration | 20 min 30 s |
| Model | claude-sonnet-5.5 (sub-agent `GS07-docs-consistency`, general-purpose); wave 7, alone |
| Token usage | 154 model calls; 34,870,316 input (34,541,420 cache read), 107,155 output |
| AI credits | 534.78 AIU (local usage store, keyed by sub-agent id) |
| Verification | Developer: generator `--suite=help,i18n,ui-contract` 178/178; generator quick set 43 suites 2,818/2,818 (88 s); player quick set 29 suites 1,609/1,609 (23 s); player `--suite=help` 22/22; the T03 path search over the changed files: 0 hits; the three examples of the guides re-derived with a throw-away script (deleted): Classic easy seed 3 → 7 compact / 26 details steps; Expert seed 3275974478 → 7 compact (0, 23, 44, 551, 568, 992, 992) / 33 details, jump 44 → 551 ×12.5 from R1C2; Killer hell seed 11 → 9 / 38. Orchestrator re-run: generator quick set 43 suites, 2,818 passed / 0 failed (88.8 s); player quick set 29 suites, 1,609 passed / 0 failed (23.4 s); after the orchestrator's wording fix `--suite=cache,i18n,help,ui-contract,steps,player` 400/400; every changed file CRLF, no BOM, no absolute path. |
| Acceptance | GS07-B01, B02 and GS07-T01–T04 met. EN and VI state the same numbers (guards 1,000,000 / 200,000; ×3 and +100; ×12.5 / ×12,5; 43 / 51 / 27 suites; about 2,820 and 3,840 tests; 14 goldens). |
| Issues & resolutions | (1) `--all` was not run (not allowed in GS07): its total "about 3,840 tests" is derived (quick 2,818 + the unchanged heavy suites ≈ 1,020); GS08 measures it. (2) The player's "about 15 seconds" stays in the guides (23 s measured here, a slower machine). (3) Two code defects reported by the developer, fixed by the orchestrator in this commit (wording only, no logic): `cache.ready`, announced once the cached puzzle's record is rebuilt, said "The step-by-step replay is ready." while the score tables were still being prepared — now "The generation record is rebuilt." / "Đã dựng lại bản ghi quá trình tạo đề." (and `design.md` §10.7 says so); the header comment of `generator/js/ui/step-view.js` still spoke of a "hardest removal" round — now the groups and swaps of the two views. `generator/js/ui/help.js` needed no change. |
| Handoff | Documents in step with the code: both user guides, both developer guides (new subsection "The replay of the generation" / "Phát lại quá trình tạo đề", worker messages, layers, counts, `replay` suite and fixture commands, link to the reports), `generator/design.md` (G5, §3.2, §3.3, §7.1, §9.3, §9.4, §10.1, §10.4, §10.7, §15, deviations, known limitations), `generator/task.md`, `README.md`. For GS08: measure the `--all` total and correct "about 3,840" if it differs; confirm in a real browser the frames, the callout, the badge and legend (also forced-colors), the file:// button flow and the live announcements (`#a11y-live`, `#replay-status`, `#step-detail`). |
