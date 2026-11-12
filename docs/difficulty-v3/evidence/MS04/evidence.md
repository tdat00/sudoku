# MS04 evidence: orders, requiredOf and the E recipe

Scope: the three order changes (`cageCombo` 44, `ineqChain` 46, `jellyfish` 137), the subset counter reset and
`SG.difficulty.requiredOf`. The explanation of every output difference is in [notes.md](../../notes.md). Paths are
relative to the repository root; commands run from `generator/` unless a command says `player`.

## Recording identity

| Field | Value |
|---|---|
| Recorded at commit | `6685d8f` with a dirty working tree (the uncommitted MS04 files) |
| Node | v26.13.0; one process at a time, no `--jobs`; the Pentomino repository ran light work meanwhile |
| Hash ledgers | kind `regression-hashes`, manifest `b022818aa3fb6736595d5280e80e9e3320e0fca83c1658e18ea8fcacef094304`, source hash `181e1932ed6017eea3cf01fe4d8ca3db3671cfcc923af838fff68f9090b7ee0d` |
| Wire and analysis ledgers | kinds `replay-wire` and `replay-goldens`, source hash `9ccd27a41e46fde07205f27c92e81ed6e0d6fce638a8713f2d705428635ced24` |
| Files | `hashes/` 104 ledgers (26 combinations x 4 shards of 5 seeds), `wire/` 4 (G09 to G12), `analysis/` 14 (G01 to G14) |

## E recipe, in the order run

| Step | Command (shape) | Exit | Wall | Result |
|---|---|---|---|---|
| GG shards | `node tests\perf.js --hash-key=<variant>/<level> --hash-from=<0,5,10,15> --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS04\hashes\<variant>-<level>-<NN>.json`, 104 commands | all 0 | `greaterThan/hard` 10.5 to 28 s per shard (65.5 s for its four), `killer/hard` 1.9 to 2.9 s, every other shard 0.5 to 1.3 s | 520 keys recorded exactly once |
| GG merge, check | `node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS04\hashes --check-hashes` | reported | under 1 s | 27 of 520 differ: `killer/easy` 11, `killer/hard` 4, `greaterThan/normal` 12; nothing written |
| GG merge, write | the same with `--update-hashes` | 0 | under 1 s | `regression.js` rewritten, 13 lines inserted and 13 deleted |
| GG merge, re-check | `--check-hashes` again | 0 | under 1 s | all 520 puzzles unchanged, ledgers recorded from the current sources |
| GR wire shards | `node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS04\wire\G09.json` (G09 to G12) | all 0 | 8.8, 1.1, 8.5, 4.2 s (22.6 s) | G09, G10, G11 differ from the fixture, G12 matches |
| GR analysis shards | `node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS04\analysis\G01.json` (G01 to G14) | all 0 | 0.5 to 8.7 s per shard (32.1 s) | G09, G10, G11, G12 differ (53, 82, 129, 111 fields); the other ten match |
| GR write | `replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS04\wire --write`, `replay-goldens.js --merge=..\docs\difficulty-v3\evidence\MS04\analysis --write` | 0, 0 | under 1 s each | `replay-wire.js` 20 lines, `replay-goldens.js` 467 lines rewritten |
| GR re-check | the two merges with `--check` | 0, 0 | 1.4 s with the hash re-check | both fixtures up to date |
| GH | `node tests\tools\make-technique-examples.js ..\generator --write`, then `--check` (from `player`) | 0, 0 | 1.1 s | three lines of `help-examples.js` moved, no data change; all 26 IDs match |

## Attribution of the differences

Each differing class was regenerated under {old orders, new orders} x {old counter, new counter} and with each
technique's order changed alone (a scratch script, deleted; the old orders reproduce the saved fixtures exactly).
The 27 hashes, the three wires and the four analyses all follow the orders; the counter has no effect on any of
them. `cageCombo` accounts for the 15 Killer hashes and for G09, G10; `ineqChain` for the 12 Greater-Than hashes,
for G11 and for G12's analysis; `jellyfish` for none.

## Tests

| Command | Exit | Result | Time |
|---|---|---|---|
| `node tests\node-runner.js --suite=difficulty-floor,technique-weights,techniques,tech-fish,tech-subset,replay,steps,player,replay-recorders` | 0 | 9 suites, 740 tests passed | 32.6 s |
| `node tests\node-runner.js` (generator) | 0 | 47 suites, 2,986 tests passed | 116 s |
| `node tests\node-runner.js` (player) | 0 | 30 suites, 1,670 tests passed | 29 s |
| `node tests\node-runner.js --suite=difficulty,killer,greater-than` | 1 | 3 suites, 378 tests, 377 passed, 1 failed | 338 s |

The manual run: `difficulty` 154 passed (60.3 s), `killer` 92 passed (126.0 s), `greater-than` 131 passed and one
failed (151.7 s). The failure is `normal: CV6: p95 of the generation time is within the design.md 9.1 budget of 700
ms` (2,035 ms against the limit of 1,400 ms). It is the `ineqChain` order, reproducible, and is explained and
measured in [notes.md](../../notes.md); no assertion was lowered.
