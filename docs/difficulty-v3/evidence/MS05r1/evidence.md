# MS05r1 evidence: three one-attempt profiles of the preserved requiredness-active candidate

Step evidence of the S-OD2 recovery, **not an acceptance**: no engine, fixture, assertion, cap, budget or seed was
changed, nothing was staged or committed, and MS05b1 stays open. The report that reads these records is
[recovery-profile.md](../../recovery-profile.md); the explanation of the driver is in
[generator/design.md](../../../../generator/design.md) 15.4. Paths are relative to the repository root; commands run
from `generator/`.

## Source identity (the uncommitted MS05b1 tree, taken as it was)

| Item | Value |
|---|---|
| Commit, tree | `f788e02616e7968143030700205d9a8ab843904c` (MS05a); dirty: the uncommitted MS05b1 files below, plus this task's own |
| Source hash | `70036fafe7e2e9ad3d5d5a80e8930d2e251fbfa79a5a17610d5b99a1dc9591f7` (`nodeEnv().identity([])` of `tests/replay-fixtures.js`: SHA-256 over the 63 `SOURCE_FILES`, each as `<path>\0<text with LF line ends>`); the same in the three records and again after the last profile |
| Tool hash | `eb2194c9a1fe0820f2ba82c5af322a6326634049fb44f75b2852c3fe72ab08b0`: the same construction over `tests/difficulty-recovery.js`, `tests/fixtures/recovery-profile.js`, `tests/replay-fixtures.js` and `tests/fixtures/replay-goldens.js`; the same in the three records |
| Node, machine | v26.13.0; Windows x64; AMD EPYC 7763 (16 logical CPUs), 64 GiB; one process at a time, no `--jobs` |
| Backups seen (read only) | `refs/dv3-wip/MS05b1-20261113-0650` (`fc37b14`) and `refs/dv3-wip/MS05r1-start-20261113-0929` (`53c9533`), the orchestrator's; nothing was restored from them and no ref was touched. The second was used by `git diff --numstat` to count this task's own edits of tracked files |

SHA-256 (first 16 hex digits, LF-normalised) of the files that decide the profiles, before the first profile and
unchanged after the last one: `js/engine/digger.js` `4b03280b1f3b0934` (1,849 lines), `js/variants/killer.js`
`bd0db55a5e853b6e`, `js/engine/explain-data.js` `3007aa6651f77f70`, `js/engine/pipeline.js` `8206a21eca6b211a`,
`js/engine/difficulty.js` `c09f31587685bf75`, `js/engine/events.js` `a660df708552e6e3`, `js/ui/locale.en.js`
`7c18b86d3a7f23b5`, `js/ui/locale.vi.js` `2a5c8e85e9afb8cf`, `tests/fixtures/regression.js` `f283fd07aab91199`,
`tests/fixtures/replay-wire.js` `79d91ffc7eda3cc9`.

## Inventory of the preserved MS05b1 work (not changed by this task)

At the start `git status` showed 22 modified tracked files outside the task pack and a set of untracked paths:

| Group | Files |
|---|---|
| Engine and locale | `generator/js/engine/digger.js` (185 changed lines), `explain-data.js` (5), `generator/js/variants/killer.js` (2), `generator/js/ui/locale.en.js` and `locale.vi.js` (14 each) |
| Fixtures | `generator/tests/fixtures/regression.js` (136, the 149 improved keys), `replay-wire.js` (4) |
| Suites | `cache`, `difficulty-floor`, `events`, `i18n`, `pipeline` (756), `result-view`, `worker` |
| Documents | both user guides and both developer guides, `generator/design.md`, `docs/difficulty-v3/notes.md` (MS05b1 section, 69 lines), `clarifications.md`, the SA1 and RF01 reports |
| Untracked | `docs/difficulty-v3/evidence/MS05b1/` (104 hash ledgers, 4 wire, 13 analysis, `evidence.md`), the RF01 response, and the task files of MS05b1 to MS05r6 |
| Total (generator, core, player, guides, notes) | 20 files, 1,174 insertions and 189 deletions against `f788e02` |

`git status` after this task lists the same 22 tracked files plus `generator/tests.html`, and the new untracked files
below; of the 22, the two developer guides, `design.md` and `notes.md` also carry this task's edits (counted in the
next table). No file of `generator/js`, `core/js` or `player/` was touched by this task.

## Files of this task

| File | Change |
|---|---|
| `generator/tests/difficulty-recovery.js` | new, 163 lines: the CLI (arguments, project-relative path, no overwrite, git and hashes, exclusive write, exit codes) |
| `generator/tests/fixtures/recovery-profile.js` | new, 885 lines: the pure helpers (command line, fixed requests, observation, classification, validation, record and its text) |
| `generator/tests/suites/recovery-profile.test.js` | new, 752 lines, 26 tests |
| `generator/tests.html` | +4 / -3: the fixture and the suite in the browser lists (Node finds them by itself) |
| `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | +35 / -8 and +31 / -6: the command, the tree and the suite counts (32 own suites, 48 quick, 56 in all) |
| `generator/design.md` | +16 / -6: 15.4 (the command), the tree, the suite table, the script list and the suite counts |
| `docs/difficulty-v3/notes.md` | +37: the MS05r1 section |
| `docs/difficulty-v3/recovery-profile.md` | new, 91 lines: the report |
| `docs/difficulty-v3/evidence/MS05r1/` | this file and `profile/G13.json`, `mega12-nightmare.json`, `mega16-nightmare.json` (89 lines each) |

## Commands, in the order run (from `generator/`)

| Step | Command | Exit | Time | Result |
|---|---|---|---|---|
| Driver tests | `node tests\node-runner.js --suite=recovery-profile` (during development, under 10 s, no lock) | 0 | 0.8 s | 26 passed; five temporary one-line mutations of the helpers (restore of `rate`, the aliased `timings`, local time added to the samples, the copy of `work`, `current` reading through) each failed 1 to 6 tests; the file was put back and its tests passed again |
| CLI refusals | the driver with no `--json`; diagnostic mode; profile with `--shallow-cap=64`; an existing `.json`; an absolute path; a path outside the repository; a `.txt` path; `--help` (under 1 s each) | 2 each (`--help` 0) | under 1 s | each refused before anything was generated: "diagnostic mode needs SG.digger.SHALLOW_SEARCH_RATINGS, the runtime allowance API of MS05r3, which this source does not have"; no file was written |
| Focused checks (first) | `Invoke-Dv3Node -Task MS05r1 -NodeArgs @('tests\node-runner.js','--suite=recovery-profile,ui-contract,help')` | 0 | 4.9 s; lock wait about 20 s | 123 passed |
| G13, first call | `Invoke-Dv3Node ... '--mode=profile','--case=G13','--json=..\docs\difficulty-v3\evidence\MS05r1\profile\G13.json'` | helper threw | about 10 minutes (about 09:49 to 09:59) | **no timing slot**: `dv3-timing.lock` of Pentomino (MP10b2 puzzle-code-acceptance browser pages `ki1-10` to `ki1-16`) was held almost without a break; sampled at 50 ms it is absent for about 1.1 s every 40 to 80 s, and the helper polls every 5 s. No command started, nothing was written |
| G13, retry | the same command | 0 | 24.8 s; lock wait about 81 s (10:00:11 to 10:01:32) | record written, outcome `ok` |
| mega12 | `... '--mode=profile','--case=mega12-nightmare','--json=..\...\profile\mega12-nightmare.json'` | 0 | 7.5 s; no lock wait | record written, outcome `ok` |
| mega16 | `... '--mode=profile','--case=mega16-nightmare','--json=..\...\profile\mega16-nightmare.json'` | 0 | 82.5 s; no lock wait | record written, outcome `ok` |
| Focused checks (last) | the same three suites, after the documents | 0 | 4.9 s; no lock wait | 123 passed: `help` 30, `recovery-profile` 26, `ui-contract` 67 |

The three profiles were announced to the orchestrator only by the dispatch itself (a sub-agent has no channel
earlier than its reply). Each ran under the helper of the check-list, one at a time, 540 seconds being the limit of
each; the longest took 82.5 s, so no invocation came near the 500,000 ms budget of the engine and the validation.

## The three records (`profile/`)

Each is a schema 1 ledger of one request: `complete: true`, `outcome: ok`, `error: null`, 42 segments, no
instrumentation problem, `jobs: 1`, the source and tool hashes above, `commit` `f788e02`, `dirty: true`.

| Record | `effectiveMaxAttempts` | Attempts / samples | `exact` / `required` | Score, level, hardest technique, clues | Generation / validation | `puzzleHash` (first 16) |
|---|---:|---|---|---|---|---|
| `G13.json` | 1 | 1 / 12 | false / false | 1637, nightmare, `forcingChain`, 106 | 24.362 s / 1.3 ms | `b9bb07e1ce464674` |
| `mega12-nightmare.json` | 1 | 1 / 12 | false / false | 2046, nightmare, `forcingChain`, 56 | 6.974 s / 5.3 ms | `8cc70327e732a278` |
| `mega16-nightmare.json` | 1 | 1 / 12 | false / false | 1925, nightmare, `forcingChain`, 114 | 79.675 s / 4.3 ms | `b9b7c78ca5e3bf5e` |

All three passed every check of the validation (givens belong to the solution, `isSolution`, an independent
uniqueness count of 1, the complete canonical rating of the returned model agrees with the returned one), and carry
the warnings `difficulty.approximate` and `difficulty.shallow`. The reconciliations held in each: the work of the
attempt (1,024 / 635 / 1,024 ratings) equals the sum of the full ratings counted by the independent rate wrapper,
equals the snapshot of the attempt's counters, and the 12 sample triplets and the one attempt equal what the puzzle
reports; no rate call happened outside a stage; the observed stage times differ from the pipeline's own timings by
at most 0.2 ms per step. The timing, work and split figures are in [recovery-profile.md](../../recovery-profile.md).
The G13 puzzle has the same score (1637) as the one the old engine accepted in attempt 1 and the interim eight
attempts returned (MS05b1 evidence); its hash was not compared, because the earlier hash was computed with another
function.

## Specification gaps, discrepancies and incidents

1. **The registry cannot replace `cells`.** The task asks to wrap the registered `cells` strategy with get, unregister
   and register before the pipeline's configure step. `SG.digger.unregisterStrategy('cells')` returns false and
   `registerStrategy('cells', ...)` throws for a duplicate (`digger.js`, the built-in stays). The wrapper is handed
   out by a restored wrapper of the exported `SG.digger.getStrategy`, which the pipeline calls in its configure step;
   it does what the task wants (the original result or iterator returned unchanged, the attempt's `caps` copied at
   boundaries) with no production edit. The three wrappers (`generateSteps`, `getStrategy`, `rate`) are restored in a
   `finally` and never over a replacement by someone else.
2. **An unlocked diagnostic run, a protocol slip.** While checking that the validation was as cheap as the records
   say (1 to 5 ms), I ran one inline `node -e` script outside `Invoke-Dv3Node` that generated one `samurai` Easy, one
   `samurai` Hard and the **full eight-attempt** `mega12` Nightmare seed 3 request (69.6 s of generation, about 70 s
   in all), without checking the locks. It is not part of the evidence and no number of it is used, except that the
   full request is about ten times the one-attempt profile (69.6 s against 7.0 s). It may have overlapped a Pentomino
   timing slot; I did not look. The orchestrator should know.
3. **Timing-slot starvation.** The helper waits up to ten minutes and polls every five seconds. Pentomino's page runs
   leave the lock free for about 1.1 s in 40 to 80 s, so the first G13 call timed out without starting; the retry
   got the slot after about 81 s. MS05r4 (20 to 75 minutes of machine time) will need slots too: it needs the orchestrator
   to coordinate with the Pentomino sequence, not a changed helper.
4. **`sourceHash` and `toolHash` were not defined by the task.** The first is the engine hash of the recorders
   (`identity([])`), the second a hash of the four files named above. The record also has `argv`, `startedAt`,
   `underlying` (the outcome that an instrumentation problem would have hidden), `checks`, `achieved`,
   `hardestTechnique`, `clues`, `attemptSummaries` (the time per attempt, kept out of the deterministic `work`),
   `summary.pipelineTimingsMs` and `stageTimingResidualMs`.
5. **Counts in the documents.** A new suite changes the counts that the guides and `design.md` state (31 to 32 own
   suites, 47 to 48 quick, 55 to 56 in all); they were updated with the command, as `AGENTS.md` asks, although the
   task lists only the command and 15.4.
6. **No earlier partial file.** The driver writes its record once, at the end, with an exclusive create, so a process
   killed at the limit leaves no file; "an earlier partial file" of the task can only be one from a previous run, and
   such a file is refused as an overwrite.
7. **G13 trace.** `SG.store.toConfig` gives no `trace`, so the G13 profile runs at the pipeline's default `summary`
   (the replay recorders do the same); the two mega requests are `off`.

## Handoff

- **MS05r2:** nothing of the driver is a consumer of the measurement or manual suites. The new suite and fixture are
  in `tests.html` and the guides' counts; `soak.js` and its diagnostics were not touched.
- **MS05r3:** diagnostic mode is written and waits for `SG.digger.SHALLOW_SEARCH_RATINGS`: it checks
  `'SHALLOW_SEARCH_RATINGS' in SG.digger`, assigns `Infinity` for `none` or the number for 64, 128 and 256 for the
  length of the run, and puts the previous value back (tested with a stand-in property). The records copy
  `puzzle.work` with a JSON deep copy, so the richer `localSearches` shape arrives unchanged; the reconciliation
  compares only `ratings`, `proposals`, `maxRatings` and `maxProposals` with the attempt's `caps` snapshot and the
  independent count of `SG.difficulty.rate`. If MS05r3 moves a full rating out of `SG.difficulty.rate`, the
  independent count must follow. Extend `finish()` of the recorder and `recordOf` only for the copy of the local
  collector; the profile protocol and requests stay.
- **MS05r4:** read `outcome` and `complete`, never only the exit code; one new path per cell, an existing file is
  refused. The diagnostic keeps 8 attempts: `mega16` costs 79.7 s for one attempt here, so a full `none` request can
  reach the 500,000 ms engine budget (eight such attempts would be about 640 s, and the ordinary samples alone about
  440 s); that would be a `generation-error` row with code `budget.exceeded` and partial work, a valid record, not a
  tool failure, and the helper's 540 s limit still holds. G13 needs about 220 s for eight attempts.
