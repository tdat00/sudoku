# MS05r5p evidence: size-dependent default attempts

Step evidence of the S-OD2 recovery, not an acceptance (S-OD4 (c2); CV6-03). Tree: `rating-v3` at `1ae831c` plus the
uncommitted retained recovery tree and this task's changes (`dirty` in the records). Engine source hash of the three
diagnostics: `fee8b8d6d7a2c47f6f2c8628a0e940da72a8c3789448a7700ad787bc044025d0` (r4 at 256: `9a833d93…`); tool hash
`60087ccda4afe35ec0df7d98d51a61a3ef68c94d99cb931e27eeed4d0e1df5ed`. Node v26.13.0, Windows. Every command below went
through `Invoke-Dv3Node` (`Invoke-Dv3Node.ps1`, the check-list helper, 20-minute wait) by way of `Run-Dv3Logged.ps1`,
which appends one record to `runs.jsonl` (the lock wait is the wall time minus the node seconds). The drivers are
`run-focused.ps1` and `run-diagnostics.ps1`; transcripts are in `logs/`.

## Representation of the default/explicit intent

The store state has `maxAttempts` (the effective number, always a whole number 1 to 20) and the boolean
`attemptsExplicit`. `false` (the default of `defaults()`): the number is `SG.store.defaultAttempts(variantId)` and
follows the variant. `true`: a chosen number. It is in `CONFIG_KEYS`, so `sg.lastConfig.v1` stores it. A record without
the key is read through `storedAttempts`: an 8 is the default on every board (CV6-04 (b), legacy-8 fix round below),
any other valid number stays chosen, and the next save writes the key.
It never reaches `toConfig`/`GenerateConfig`, the URL (`attempts` is written only when it is true), the history, the
cache or an exported puzzle. `store.set` decides the intent (`nextAttempts`): a number from a control, a link or a direct
call is chosen; with `{ source: 'app' }` (history restore, stale-cache rebuild) a number equal to the replayed variant's
default keeps the intent, any other becomes chosen, and a chosen number is never made a default; a patch that names
`attemptsExplicit` (`reset`, a cleared field) is taken as given. `normalize` lets a present number win (the export's
`toConfig` over `defaults()` plus the entry), and reads a "default" state whose number is not its board's as chosen.

## Commands (exit code, node seconds, wall seconds, lock wait)

| Label | Command (from `generator/`) | Result | Exit | Node s | Wall s | Lock wait s |
|---|---|---|---:|---:|---:|---:|
| f01 | `tests\node-runner.js --suite=store,controls,variants-registry,recovery-profile` | 164 of 164 | 0 | 1.180 | 36.370 | 35.190 |
| f02 | `--suite=pipeline --filter=MS05r5p-` | 7 of 7 | 0 | 0.291 | 35.461 | 35.170 |
| f03 | `--suite=history --filter=MS05r5p-` (superseded by g01: the fix round replaced the source-text check by a real run) | 5 of 5 | 0 | 0.191 | 60.387 | 60.196 |
| f04 | `--suite=export --filter=MS05r5p-` | 1 of 1 | 0 | 0.205 | 150.525 | 150.320 |
| f05 | `--suite=cache --filter=MS05r5p-` (superseded by g02) | 4 of 4 | 0 | 0.223 | 160.441 | 160.218 |
| f06 | `--suite=difficulty-diagnostics` | 82 of 82 | 0 | 11.332 | 201.552 | 190.220 |
| f07 | `--suite=difficulty --filter=qualification:` (manual suite, fake workers) | 6 of 6 | 0 | 3.563 | 268.971 | 265.408 |
| f08 | `--suite=help,ui-contract` | 97 of 97 | 0 | 4.332 | 164.534 | 160.202 |
| x01 | `--suite=digger` (extra, engine changed) | 64 of 64 | 0 | 1.343 | 281.697 | 280.354 |
| x02 | `--suite=pipeline --filter=MS05b1-` (extra) | 30 of 30 | 0 | 1.513 | 236.802 | 235.289 |
| probe | `--suite=smoke,multigrid` (extra, large boards) | 228 of 228 | 0 | 18.411 | 18.498 | 0.087 |
| d01 | `tests\difficulty-recovery.js --mode=diagnostic --case=G13 --shallow-cap=256 --json=..\docs\difficulty-v3\evidence\MS05r5p\G13.json` | record `ok` | 0 | 22.022 | 87.237 | 65.215 |
| d02 | the same, `--case=mega12-nightmare` | record `ok` | 0 | 24.874 | 230.144 | 205.270 |
| d03 | the same, `--case=mega16-nightmare` | record `ok` | 0 | 107.700 | 413.004 | 305.304 |
| g01 | fix round: `--suite=history --filter=MS05r5p-` (real `SG.app.generate`) | 4 of 4 | 0 | 0.216 | 0.311 | 0.095 |
| g02 | fix round: `--suite=cache --filter=MS05r5p-` (real `SG.app.generate`) | 4 of 4 | 0 | 0.260 | 35.447 | 35.187 |
| g03 | fix round: `--suite=help,ui-contract` (design.md changed) | 97 of 97 | 0 | 4.428 | 49.611 | 45.183 |
| mut | fix round: replay-label mutation check, `logs/fix-mutation-check.txt` (scratch script, deleted) | see below | 0 | 0.182 | 85.392 | 85.210 |
| h01 | legacy-8 fix round: `--suite=store --verbose --results=…\legacy-8-fix\store.json` | 85 of 85 | 0 | 0.446 | 220.835 | 220.389 |
| h02 | legacy-8 fix round: `--suite=help,ui-contract --verbose --results=…\legacy-8-fix\help-ui-contract.json` | 97 of 97 | 0 | 4.519 | 179.797 | 175.278 |
| h03 | legacy-8 fix round: `--suite=store --filter=MS05r5p-` with the old literal condition put back for the run | 15 of 20, 5 fail as expected | 1 | 0.213 | 215.672 | 215.459 |
| h04 | legacy-8 fix round: `--suite=store --verbose --results=…\legacy-8-fix\store-final.json` after the condition was restored | 85 of 85 | 0 | 0.441 | 105.675 | 105.234 |

The development runs (`dev-*`, `scratch-fullgrid`, `impact-*` in `runs.jsonl`) are kept: two of them failed on the way
(`dev-pipeline-MS05r5p`, a wrong test fixture level; `dev-help-ui-contract`, the help suite's URL example, which led to the
rule that a "default" state with another number than its board's is chosen) and were repeated after the fix; the f-runs
are on the final source (the g-runs follow the fix round, which changed only the history and cache tests and two
rows of the test table). No run was stopped at 540 s; the longest lock wait was 305 s (Pentomino's MP12b1 held the other
lock). Not run (not changed or not ordered): `digger` and `worker` with `MS05r5p-` (no case of those suites changed; a
zero-test selection is not a pass), the full quick sets, GG, GR, GH, soak, qualification, R5 and the heavy suites.

## The three closure diagnostics (attempts as normalised, allowance 256)

| Request | Normalised attempts | Outcome | Exact | Required | Warnings | Score | Generation ms | Validation ms | Puzzle hash |
|---|---:|---|---|---|---|---:|---:|---:|---|
| G13, samurai Nightmare seed 42 | 2 | ok | false | false | approximate, shallow | 1,637 | 21,555.5 | 1.3 | `b9bb07e1ce46…` (as r4 at 8 attempts) |
| mega12 Nightmare seed 3 | 4 | ok | false | false | approximate, shallow | 2,046 | 23,775.0 | 5.2 | `8cc70327e732…` (as r4 at 8) |
| mega16 Nightmare seed 3 | 2 | ok | false | false | approximate, shallow | 1,925 | 107,225.1 | 4.4 | `b9b7c78ca5e3…` (r4 at 8: exact at attempt 6, `c8d26f3c0366…`) |

Checks of every record: givens match the solution, a solution, unique, the rating agrees. Work: G13 sample 15.5 s and
local 6.1 s, 565 ratings; mega12 sample 19.8 s and local 4.0 s, 976 ratings; mega16 sample 97.0 s and local 10.3 s, 607
ratings. The previous times (104.6, 47.1 and 310.2 s) stay in `evidence/MS05r4/` and are historical, not replaced.

## Items (S-OD4)

Open items after this step. Route before MS07e: MS07e; final: MS18c (availability), MS18d (cost); MS18e audits all.

| Item | Origin, request, source | Numbers and outcome now | Evidence | Next owner |
|---|---|---|---|---|
| S-AV01 Greater-Than Normal CV6 | inherited; unchanged by this step | 2,035 ms p95 against 1,400 ms; not run here | none new | MS05e, MS07e, MS18d |
| S-AV02 mega12 Nightmare | seed 3, source `fee8b8d6…`, 4 attempts, 256 | 23.8 s (was 47.1 s at 8): shallow fallback, not exact; still over the old 6 s quick assertion, far over the 30 s qualification p95; no hit | `mega12-nightmare.json` | MS05r5m (quick/deep contract), MS07e, MS18c/MS18d |
| S-AV03 mega16 Nightmare | seed 3, 2 attempts, 256 | 107.2 s (was 310.2 s, exact at attempt 6): shallow fallback, the earlier exact hit is given up by design (S-OD4 (c2)); 89 % of the 120 s application guard; far over 30 s p95 | `mega16-nightmare.json` | MS05r5m, MS07e, MS18c/MS18d |
| S-AV04 samurai Nightmare (G13) | seed 42, 2 attempts, 256 | 21.6 s (was 104.7 s at 8): shallow fallback, same puzzle as before; 18 % of the 120 s recorder guard | `G13.json` | MS05r6a, MS07e, MS18c/MS18d |
| S-AV05 Killer Hard | inherited | 0 of 12 exact at every R5 setting; not touched here (9x9 board, default 8) | none new | MS07e, MS18c |
| S-AV06 Killer Expert | inherited | 0 of 12; as above | none new | MS07e, MS18c |
| S-AV07 classic9 Nightmare | inherited | 2 of 12; unchanged (default 8) | none new | MS07e, MS18c |
| S-AV08 standing quick cost | inherited | partial Generator chunks 713.8 s at b1; this step adds 39 tagged cases, well under a second together (store 79 cases 131 ms, controls 46 cases 135 ms, the 7 pipeline cases 83 ms); not a complete measurement | `logs/` | MS05r6b |

No new S-AV id was needed. Noted for r6a (not performance items): the recorded G13 and G14 requests name no attempts, so
they regenerate at 2 attempts and their wires/analyses, the `steps`/`replay`/`player` pins and the large-board
regression hashes may differ when re-recorded; no GG/GR run was made here.

## Decisions

1. **Legacy 8 on small boards: closed by CV6-04 (b), Fable, 2026-11-14.** SA2 had ruled to keep the literal rule while
   the question (CV6-04) went to the plan author. The plan author answered (b): an unmarked legacy 8 is read as the
   default on every board (`docs/difficulty-v3/clarifications-resolved.md`, CV6-04, "Plan-author answer"). The
   decision and its results are in "Legacy-8 fix round (CV6-04 (b))" below. The SA2 ruling it replaces (keep: only a
   stored 8 on a board of more than 81 cells was read as the default) is superseded and no longer describes the code.
2. Addendum A1 (clearing the field means default mode) is implemented with a `defaultIntentKey` on the field model and
   a patch `{ attemptsExplicit: false }`; the other number fields (none today) keep their old behaviour.

## T04 route evidence (fix round: the real `SG.app.generate`)

The first version of the history test matched the text of `app.js`; it is gone. The history and cache tests now run
the real `SG.app.generate`. Each test builds a **private copy of `js/ui/app.js`** (`new Function('self', 'document',
source)`) on a minimal fake document (the thirteen mount points `findElements` needs, no-op elements), with:

- the real store (`SG.store.create`, memory only) handed to the app through a private copy of `SG` whose
  `store.instance()` returns it;
- stand-ins for the five views `start()` builds (`boardView`, `stepView`, `resultView`, `player`, `controls`) and no
  optional modules, so `start()` and `generate()` run unchanged;
- a scripted client (`app.setClient`) that records every configuration it is asked for and never answers.

`history.test.js` (4 cases) calls `app.generate(SG.history.overridesOf(entry))`, which is what the history panel does for
an entry it opens: (a) default mode, a classic9 entry at 8: the client gets 8, the state is `['classic9', 8, false]`, and
after a switch to mega16 the state is `['mega16', 2, false]` and the next request asks for 2; (b) an older mega16 entry
at 8: the client gets 8 and the state is an explicit 8 (the control model shows 8 beside the default 2); a mega16 entry
at the new default 2 keeps default mode; (c) explicit 5, then a mega16 entry at 2 (the replayed board's default): it
stays explicit with 2, a classic9 entry at 8 keeps it explicit, and the requests are 2, 8, 8; a mega12 entry at 3
becomes explicit 3 and the client configuration has exactly the GenerateConfig keys. `cache.test.js` (4 cases) wires the
real cache controller to a fake app whose `generate` is the private app's: a served puzzle whose regenerated record
differs is rebuilt through `app.generate(overrides(config))`; the client receives 8 (the size default, intent kept), 3
(chosen), and 8 while a chosen 5 was set (stays chosen), and overrides and client configuration carry no marker.

Mutation check (`logs/fix-mutation-check.txt`, a scratch script that is deleted): the same private app on the real
`app.js` gives, for case (a), `client got 8`, state `classic9 8 false`, after the switch to mega16 `2 false`; on a copy
whose `{ source: 'app' }` was changed to `{ source: 'form' }` it gives `classic9 8 true` and, after the switch, `8 true`,
which the tests reject. `app.js` itself is unchanged (no testability change was needed). The export route was already
real: `E.playOnline` with a scripted `SG.workerClient` runs the real `defaults()`-plus-overrides merge.

## Legacy-8 fix round (CV6-04 (b))

Authority: the plan author's CV6-04 answer, option (b), 2026-11-14 (`docs/difficulty-v3/clarifications-resolved.md`);
instructions `tasks/difficulty-v3/MS05r5p-legacy-8-fix-round.md`. An unmarked legacy `maxAttempts: 8` in
`sg.lastConfig.v1` is read as the default on **every** board. Addendum A1, RS01 (recorded recipes), the 1 to 20 range,
the engine, the size policy, the allowance, the budgets, R5 and the storage key and version are unchanged. Nothing was
generated or measured in this round.

**Source change** (`generator/js/ui/store.js`, exact hunks in `legacy-8-fix/store-diff.patch`, which `git apply -R
--check --unidiff-zero --ignore-whitespace` accepts against the tree with exit 0; the pre-round file was not copied, so
the patch was assembled from the three hunks):

```js
// before
else if (number === LEGACY_MAX_ATTEMPTS && defaultAttempts(id) !== LEGACY_MAX_ATTEMPTS) explicit = false;
// after
else if (number === LEGACY_MAX_ATTEMPTS) explicit = false;
```

The doc comment of `storedAttempts` and the comment at the `LEGACY_MAX_ATTEMPTS` constant were rewritten in the same
edit: an unmarked legacy 8 means default on every board, other valid numbers stay chosen, the next save writes the
marker; nothing counts loads. `normalize`, `toConfig`, `nextAttempts`, recipe replay, the boolean-marker branch, the
numeric validation and the effective-number and fallback calculation are untouched. `store.js` SHA-256 after the round
(identical in the h04 run and when this file was written):
`818d5db957414436efc822e7684a5e2cdd2980cec8c9f4d273ffcd19f4382917`.

| Item | Result |
|---|---|
| 1 Condition and comments | Done as above. |
| 2 Classic9 assertion and switching case | `MS05r5p-T04: … a stored 8 of a larger board to the default, once` now expects `['classic9', 8, false]`; the new case switches legacy classic9 8 to mega12 (4), mega16 (2) and back to classic9 (8), all in default mode, with `toConfig` agreeing; every one of the registered boards loads a legacy 8 in default mode and then follows a switch to samurai (2). |
| 2 addition: missing or unknown variant | Records without `variantId`, with `'nope'`, `42`, `null` and `''` load as the fallback variant (`S.defaults().variantId`) with `S.defaultAttempts(fallback)` in default mode, then follow a switch to mega16 (2); no new variant-to-attempts map. |
| 3 Persist and reload | A save while the number is still 8 writes `{ maxAttempts: 8, attemptsExplicit: false }`; the reload then follows a switch to mega12 (4); after the switch the saved marker keeps mega16 (2) and the way back to classic9 (8) in default mode. |
| 3 addition: loaded twice | Three unmarked legacy records (classic9 8, mega16 8, and mega12 5 as the chosen control) are loaded twice and a third time with no save in between: equal states, and the record text in storage is byte for byte unchanged; the next ordinary save writes a boolean marker and the reload equals the first load. |
| 4 Marked explicit 8 and entering 8 | A marked explicit classic9 8 stays chosen across a switch to mega16 and mega12, a save and a reload; typing 8 after the migration (from classic9 and from mega16 where the migrated number was 2) is chosen, saved as `attemptsExplicit: true` and survives a reload and a switch. The existing other-number, storage-failure, explicit URL/control and recorded-recipe cases are unchanged and pass. |
| 5 Comments, documents, evidence | `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` (the `sg.lastConfig.v1` sentence, the document sentence in both languages), `generator/design.md` §14.3 (the `sg.lastConfig.v1` row, the old "up to 81 cells" parenthetical removed, and the test-table row), `USERGUIDE.md` and `USERGUIDE.vn.md` (they already described the migration), this file. |

**New tests for r6b** (all in `generator/tests/suites/store.test.js`, describe "store: the default attempts by board size
and the intent of the number (MS05r5p)", tag `MS05r5p-CV6-04`; the store suite has 85 cases, 79 before):

1. `MS05r5p-CV6-04: an unmarked legacy 8 on a small board is the default and follows every later switch`
2. `MS05r5p-CV6-04: the migrated state is saved with the default marker, before and after a large-board switch`
3. `MS05r5p-CV6-04: a marked explicit 8 on a small board stays chosen across a switch and a reload`
4. `MS05r5p-CV6-04: entering 8 after the migration is a chosen number that survives a reload`
5. `MS05r5p-CV6-04: a legacy 8 with a missing or unknown variant loads as the default of the fallback variant`
6. `MS05r5p-CV6-04: loading the same unmarked legacy record twice, with no save between, gives the same state`

The existing `MS05r5p-T04: a record from before the size defaults moves a stored 8 of a larger board to the default,
once` keeps its name and now also carries the classic9 default-mode assertion.

**Do the tests discriminate?** h03 put the old literal condition back for one run (`--suite=store --filter=MS05r5p-`,
exit 1, 15 of 20 passed): the updated T04 migration case and CV6-04 cases 1, 2, 4 and 5 failed. Cases 3 (marked
explicit) and 6 (idempotent) pass under either rule by design: they guard the explicit value and the absence of a
counter. The condition was restored with the edit tool and h04 (store, 85 of 85) ran on the restored file.

**Compatibility handoff (store-only change).** No engine source changed, so the 14 deep records (MS05r5m) and the three
closure diagnostics above stay valid with their original hashes, records and timings; none was rerun or relabelled.
`store.js` is in `SOURCE_FILES`, so the broad `sourceHash` of the loader differs from the diagnostics' `fee8b8d6…`; a
false `currentMatches.sourceHash` is the honest result and no digest or `SOURCE_FILES` was patched. `SG.pipeline.normalizeConfig`
and `SG.pipeline.run` do not call `storedAttempts`. MS05r6a (A item 4) and MS05r6b (B1) own the identity audit by the
exact diff `legacy-8-fix/store-diff.patch` (the hash-bound producer snapshot is the orchestrator's, `ad77fdf`).

**Not edited here (outside this round's file list):** `docs/difficulty-v3/notes.md`, the MS05r5p section (around lines
374 to 376), still says that an 8 on a board of up to 81 cells stays chosen and that the question goes to the plan
author. It is stale since CV6-04 (b) and needs a one-line correction by its owner. The Execution log, the check-list
summary rows, the pack and `clarifications*.md` were not touched.

S-OD4 items: unchanged from the table above (S-AV01 to S-AV08 carry their numbers; no new id). S-AV08 gains six cheap
cases (the store suite: 85 cases, 74 to 82 ms of test time).

## R6B-F01 fix (private app copies and `SG.localeFragments`)

MS05r6b's finding R6B-F01 (a correctness defect in the tests, classified by SA2): `i18n > has no key defined twice` failed
when `history` or `cache` ran before `i18n` in one process (`--suite=history,i18n` 97 of 98, `--suite=cache,i18n` 187
of 188). The private `startApp()` of the fix round cloned `SG` with `Object.assign({}, SG)`, which shares the
`SG.localeFragments` array; `app.js` registers its fragment with `SG.localeFragments.push(…)` at load, so each private
copy added a second `app` fragment to the host's list (162 conflicts). `export.test.js` already isolated its list.

Fix, in both `startApp()` helpers (`history.test.js` and `cache.test.js`), right after the clone:

```js
sg.localeFragments = [];
const hostFragments = (SG.localeFragments || []).slice();
```

and, right after the private `app.js` has run:

```js
expect(sg.localeFragments.length).toBe(1);   // the private app registered in its own list
const host = SG.localeFragments || [];
expect(host.length).toBe(hostFragments.length);
expect(host.every(function (f, i) { return f === hostFragments[i]; })).toBe(true);   // the host list is untouched
```

The `i18n` suite and its test are unchanged, and nothing was sharded or reordered. The `stepView` stand-in line in both
helpers was wrapped (it was 121 characters); nothing else changed. The assertion runs in every test that starts a private
app (history 4 cases, cache 4 cases). `app.js` and every source are unchanged.

| Label | Command (from `generator/`, no filter) | Result | Exit | Node s | Wall s | Lock wait s |
|---|---|---|---:|---:|---:|---:|
| r6b-f01-01 | `tests\node-runner.js --suite=history,cache,i18n --results=…\r6b-f01-fix\history-cache-i18n.json` | 203 of 203 (cache 105, history 15, i18n 83; `i18n` ran last and `has no key defined twice` is `pass`) | 0 | 10.944 | 11.055 | 0.111 |
| r6b-f01-02 | `--suite=store,controls,help,ui-contract --results=…\r6b-f01-fix\store-controls-help-ui-contract.json` | 228 of 228 (controls 46, help 30, store 85, ui-contract 67) | 0 | 4.703 | 4.804 | 0.101 |

Transcripts and result files are in `r6b-f01-fix/`; the two records are in `runs.jsonl`. The first run covers both
reported orders (`history` and `cache` before `i18n` in the same process). Not run: anything else.

## Files

Changed: `generator/js/engine/digger.js`, `pipeline.js`; `generator/js/variants/registry.js`, `multigrid.js`;
`generator/js/ui/store.js`, `controls.js`; `generator/tests/soak.js`, `qualify.js` (headers); the suites `store`,
`controls`, `variants-registry`, `pipeline`, `history`, `export`, `cache`, `difficulty-diagnostics`, `recovery-profile`;
`generator/design.md`; `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `USERGUIDE.md`, `USERGUIDE.vn.md`;
`docs/difficulty-v3/notes.md`; this folder. Fix round: `history.test.js`, `cache.test.js`, `generator/design.md` (two
test-table rows) and this file only. Legacy-8 fix round: `generator/js/ui/store.js` (one condition, two comments),
`generator/tests/suites/store.test.js`, `generator/design.md` §14.3 (the `sg.lastConfig.v1` row and the test-table
row), `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `USERGUIDE.md`, `USERGUIDE.vn.md`, this file and the new folder
`legacy-8-fix/` (`store.json`, `store-final.json`, `help-ui-contract.json`, the four transcripts and
`store-diff.patch`). R6B-F01 fix: `history.test.js` and `cache.test.js` (the private `startApp()` only), this file and the new
folder `r6b-f01-fix/` (two result files, two transcripts). Unchanged on purpose: `app.js`, `history.js`, `cache.js`, `export.js`, the driver
`tests/difficulty-recovery.js` and its helper, every fixture and heavy suite.
