# MS05b1 evidence: required exactness in the engine and the E recipe

Scope: the one exactness and quality rule of `generator/js/engine/digger.js` (`isExact`, `qualityOf`), the keeper
and the Killer call site, the first-exact stops, the refinement branches, the `tune.hit` / `tune.shallow` /
`tune.miss` verdicts, the `difficulty.shallow` warning, and the explanation and locale text. The explanation of
every output difference is in [notes.md](../../notes.md). Paths are relative to the repository root; commands run
from `generator/` unless a command says `player`.

## Status of the recipe

| Part | State |
|---|---|
| Wire G09 to G12 | recorded, merged, checked, written (`replay-wire.js`), checked again: complete |
| GG, 104 shards | recorded, merged, checked, `regression.js` updated, checked again: complete |
| Analysis G01 to G14 | **blocked**: 13 shards recorded, G13 refused by the recorder (`budget.exceeded` at its 120 s budget, 120.2 s, nothing written), so the merge refuses and `replay-goldens.js` is not rewritten |

## Recording identity

| Field | Value |
|---|---|
| Recorded at commit | `f788e02` with a dirty working tree (the uncommitted MS05b1 files) |
| Node | v26.13.0; one process at a time, no `--jobs`; every command over 10 s through the shared lock helper |
| Hash ledgers | kind `regression-hashes`, manifest `b022818aa3fb6736595d5280e80e9e3320e0fca83c1658e18ea8fcacef094304`, source hash `211a1cb1858bb41f947d01176c5f5c86722fd9e898d7043a5cb14d5b8beffb09` |
| Wire and analysis ledgers | kinds `replay-wire` and `replay-goldens`, source hash `f7d569e64c9a6272f386acb17f144dd345f49e94573cf75df70c69635c895729` |
| Files | `hashes/` 104 ledgers (26 combinations x 4 shards of 5 seeds), `wire/` 4 (G09 to G12), `analysis/` 13 (G01 to G12 and G14; G13 has no ledger) |

Three complete recordings were made. The first showed one difference that the first attribution could not explain
(`wordoku/normal#10946`: the final choice asked the search's last state before the keeper); the fix changed the
engine, so everything was recorded again (the second recording differs from the first in that key alone). A
comment of `digger.js` was then re-wrapped to the 110 characters of the style rule, which changes the source hash,
and everything was recorded a third time. This folder holds the third; the first two were replaced, not merged.

## E recipe, in the order run (third recording)

| Step | Command (shape) | Exit | Wall | Result |
|---|---|---|---|---|
| GR wire shards | `node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS05b1\wire\G09.json` (G09 to G12) | all 0 | 13.9, 26.4, 8.4 and 3.7 s | the four records |
| GR wire, merge and check | `node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS05b1\wire --check` | 0 | under 1 s | all four match the fixture written from the first recording (the sources of the second and third differ in comments and the tie-break of one key only; the four wires are identical) |
| GR wire, first recording | the same merge with `--check`, then `--write`, then `--check` | 1, 0, 0 | under 1 s each | G09 and G10 differ in `exact`, `attempts` and `warnings.length`; `replay-wire.js` rewritten (2 lines), then up to date |
| GG shards | `node tests\perf.js --hash-key=<variant>/<level> --hash-from=<0,5,10,15> --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS05b1\hashes\<variant>-<level>-<NN>.json`, 104 commands | all 0 | 0.5 to 3.8 s for the 85 run directly (under 10 s each), 9.2 to 72.3 s for the 19 run through the lock (`diagonalX/nightmare` 44.4, 60.7, 72.3 and 35.1 s; `classic9/nightmare` 21 to 30 s; `killer/hard` 26 to 28 s; `greaterThan/hard` 9 to 19 s; `greaterThan/normal` 12, 11 and 13 s); about 10 minutes in all, 548.9 s of generation | 520 keys recorded exactly once |
| GG merge, check | `node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS05b1\hashes --check-hashes` | 1 | under 1 s | 149 of 520 differ (second recording, before the update): `classic9/easy` 19, `classic9/normal` 13, `classic9/master` 7, `classic9/nightmare` 6, `mega12/normal` 5, `mega16/easy` 1, `diagonalX/easy` 14, `diagonalX/nightmare` 11, `jigsaw9/normal` 10, `jigsaw9/master` 8, `greaterThan/normal` 10, `greaterThan/hard` 2, `samurai/easy` 19, `butterfly/normal` 10, `flower/normal` 8, `wordoku/normal` 6; nothing written |
| GG merge, write | the same with `--update-hashes` | 0 | under 1 s | `regression.js` rewritten, 68 lines inserted and 68 deleted |
| GG merge, re-check | `--check-hashes` again on the third recording | 0 | under 1 s | all 520 puzzles unchanged, ledgers recorded from the current sources |
| GR analysis shards | `node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS05b1\analysis\G01.json` (G01 to G14) | 0 for 13, 1 for G13 | 0.5 to 26.5 s per shard (G09 13.9, G10 26.5, G11 8.6); G13 120.2 s | 13 ledgers; G13: `generation failed: budget.exceeded; nothing was written` |
| GR analysis, merge | `node tests\replay-goldens.js --merge=..\docs\difficulty-v3\evidence\MS05b1\analysis --check` | 1 | under 1 s | `G13: missing (no ledger records it)`; merge refused, nothing written |
| GR analysis, field check | `node tests\replay-goldens.js --ids=G01,...,G12,G14 --check` (second recording) | 1 | 80.1 s | G06 (51 fields) and G07 (92 fields) differ; the other eleven match |

The GH route of MS04 (help examples) is not part of this task: no technique, order or help example changed.

## Why G13 cannot be recorded

`samurai` Nightmare seed 42 gives the same puzzle with the old and the new engine (hash `93f9be5f208b`, score 1637).
The old engine accepted it by its level in attempt 1 (0.16 s). It is in the Nightmare band and needs no technique of
the tier (`requiredOf` false), so the new engine keeps it as the fallback and uses the caps of all eight attempts:
219.7 s with a 500 s budget (8 attempts, `difficulty.approximate` and `difficulty.shallow`), 120.2 s and
`budget.exceeded` under the 120,000 ms budget of the recorder (`BUDGET_MS` of `tests/replay-fixtures.js`, not
changed). The tests that regenerate it live (`steps`, `replay`, `player`: 120 s budgets of their own) fail the same
way. Its existing analysis record would still be correct as data (same puzzle); the recorder has no way to take it.

## Attribution of the differences

Each of the 150 keys that differed in the first recording was regenerated with the digger and the Killer file of
`HEAD` (loaded in memory from `git show`) and with the tree, one process at a time (a scratch script, deleted), and
the puzzle, `exact`, `requiredOf(rating, level, model)`, the attempts and the warnings were compared.

| Class | Keys | Result |
|---|---|---|
| Old puzzle exact by level, `requiredOf` false; new puzzle different, exact, `requiredOf` true, no warning | 149 | all hash differences of the final recording; attempts 1: 75, 2: 23, 3: 18, 4: 10, 5: 9, 6: 5, 7: 7, 8: 2 (old mean 1.13, new 2.38); 15 s with the old engine against 161 s with the new one |
| Different shallow fallback instead of the first puzzle in the band | 1 (`wordoku/normal#10946`) | the keeper was asked after the search's last state: fixed (a probe with the fix gives the old puzzle); the keys then differ from `HEAD` in 149 only |

For the other 371 keys, whose hash did not change, both engines were run as well: 313 give the same puzzle exact
in both, 56 give the same puzzle that the old engine called exact and the new one returns as a shallow fallback
(`killer/hard` 20 of 20, `classic9/nightmare` 14, `diagonalX/nightmare` 9, `diagonalX/easy` 6, `classic9/normal` 3,
`wordoku/normal` 3, `classic9/easy` 1; 8 attempts each), and 2 (`classic6/hard`) were approximate before and after.
The 371 regenerations took 63 s with the old engine and 399 s with the new one.

## Cost of the interim engine

| Request (trace off) | Old engine | New engine |
|---|---|---|
| `classic9` Easy, 24 seeds | 3.6 ms each | about 250 ms each |
| `classic9` Nightmare seed 42 (G03) | exact, 0.27 s | `difficulty.shallow`, 8 attempts, 6 s |
| `killer` Hard seed 5, Master seed 2 | exact, 0.4 s, 0.2 s | `difficulty.shallow`, 8 attempts, 5 s, 24 s |
| G09, G10 | exact, attempt 5, attempt 1 | `difficulty.shallow`, 8 attempts, 14 s, 26 s |
| G13 | exact, 0.16 s | `difficulty.shallow`, 8 attempts, 220 s |

## Tests

Final source (after the last comment re-wrap), one command at a time through the lock:

| Command | Exit | Result | Time |
|---|---|---|---|
| `node tests\node-runner.js --suite=<every quick suite except pipeline, mega, steps, replay and player>` (generator, 26 suites: a11y, cache, controls, difficulty-diagnostics, difficulty-floor, digger, events, export, format, full-grid, help, history, i18n, multigrid, perf-tooling, purity, replay-recorders, result-view, rng, smoke, store, technique-weights, theme, ui-contract, variants-registry, worker) | 0 | 1,390 passed | 172.7 s |
| `node tests\node-runner.js --suite=pipeline` | 0 | 127 passed (31 new MS05b1 tests) | 294.8 s |
| `node tests\node-runner.js --suite=mega` | 1 | 111 tests, 107 passed, 4 failed: `mega12 nightmare` and `mega16 nightmare`, "4 puzzles are unique, valid and inside the 9.1 time budget" and "the same seed gives the same puzzle (CV5)", all `budget.exceeded` at the 120 s budget of the test | 246.3 s |
| `node tests\node-runner.js` (player) | 0 | 30 suites, 1,670 passed | 29.3 s |

Not passing, and why (the filtered runs below were made on the second recording's source, before the last comment
re-wrap, with the final fixtures; the full-suite attempts to reach the 540 s limit were made earlier, before the
fixtures were updated):

| Suite | Result | Cause |
|---|---|---|
| `steps` | 1 failure for G06 (`a jump over several moves says in which complete change the new technique first appears`: the fresh G06 has no step 31) and 3 for G13 (`names the cause of a move per class`, `also tells a new hardest technique when the score is flat or falls`, `the goldens whose chosen removal the limited check could not finish say so`: `budget.exceeded` after 120 s each) | G06 is a different puzzle (its golden is not refreshed: see the analysis step above); G13 does not regenerate in 120 s. Three G13 tests of 120 s each, with the rest, do not fit one 540 s command |
| `replay` | `--filter=G06`: 8 failed, 1 passed; `--filter=G07`: 6 failed (5 pins of the old G07 puzzle, 1 `budget.exceeded` of a G13 test), 1 passed; `--filter=G13` reached the 540 s limit | G06 and G07 are different puzzles whose goldens are not refreshed; G13 as above. The full suite reached the 540 s limit |
| `player` (generator suite) | `--filter="tells what a compact step folds"`: 1 failed (`replay.guided` instead of `replay.folded.reveal`, G06) | G06 as above. The full suite reached the 540 s limit |

The generator quick set as one command was not run: the groups above already sum to more than 540 s, and
`replay` and `player` each reached the 540 s limit when run whole (earlier attempts), and `steps` has three G13 tests
of 120 s each. Pin updates of `steps`, `replay` and `player` need the refreshed goldens, which need G13.
