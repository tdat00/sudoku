# MS03d selected hash records: preparation evidence

Scope: the bounded hash modes of `generator/tests/perf.js` (selection, ledger, complete checked merge, alternate
output). No generator, solver, order or rating behaviour changed, and the canonical fixture
`generator/tests/fixtures/regression.js` is unchanged (SHA-256
`8213ef9ae172e331eb89778fca7a4fab95e941c58f34357da09942c3a4c7d9aa` before and after every command below). Paths are
relative to the repository root.

## Recording identity

| Field | Value |
|---|---|
| Recorded at commit | `db716f7` with a dirty working tree (the uncommitted MS03d files) |
| Node | v26.13.0 |
| Manifest | 520 keys (26 `COMBOS` x 20 `SEEDS`), kind `regression-hashes`, `manifestHash` b022818aa3fb6736595d5280e80e9e3320e0fca83c1658e18ea8fcacef094304 |
| Source hash | 3003486d40801b0285cc2d23a4d8d0364f95610698e253480755dffd6bbd03bf |
| Ledger | `generator/tests/artifacts/difficulty-v3/MS03d/classic4-00.json` (5 records) |

The source hash is SHA-256 over `<path>\0<text with LF line ends>` of the engine files that `perf.js` loads (the
`SOURCE_FILES` of `node-runner.js` without `js/ui/` and `js/worker/`), then `tests/fixtures/perf-helper.js`,
`tests/fixtures/tool-records.js` and `tests/perf.js`. A later edit of any of them makes every ledger stale and
`--hash-merge` refuses it; an edit of a UI file, a test suite, a document or `regression.js` does not. The manifest hash
covers the keys and requests (`variant/level#seed`, variant, level, seed) in table order, never the expected hashes.

## Bounded GG preparation (announced; hash mode, one process at a time, no `--jobs`)

Run from `generator/`. "wall" is the process wall time measured around the command, on a machine that was also
running the four-worker Pentomino measurement.

| Command | Exit | Wall | Result |
|---|---|---|---|
| `node tests\perf.js --check-hashes --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5` | 0 | 0.19 s | `5 of 520 puzzles checked (classic4/veryEasy, seed indexes 0-4 (seeds 1, 2, 3, 5, 8)), all unchanged; the other 515 were not checked, so this is not a pass of the complete corpus` |
| `node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=tests\artifacts\difficulty-v3\MS03d\classic4-00.json` | 0 | 0.56 s | `recorded 5 of 520 keys`; the five hashes equal the first five of `classic4/veryEasy` in the fixture (`cfdf9052c826174e`, `9c3830fae77b7fd6`, `2d49259e3a97eb32`, `546c1e997d9013fd`, `728d910ad8a2c5c6`); generation 0.0 s |
| `node tests\perf.js --hash-merge=tests\artifacts\difficulty-v3\MS03d --check-hashes` | 1 | 0.48 s | refused: `515 problems (515 of the 520 keys missing); nothing was written` (first `classic4/veryEasy#13: missing`) |
| `node tests\perf.js --hash-merge=tests\artifacts\difficulty-v3\MS03d --update-hashes` | 1 | 0.50 s | the same refusal; `regression.js` byte for byte unchanged (SHA-256 as above), no other file written |

No command came near the ten-minute ceiling. No `--update-hashes` against the canonical file, no timing mode, no
full 520-record check, `--gate`, `--alloc`, `--all`, qualify or soak was run. The shard did not disagree with the
fixture, so the pre-MS04 call-history-counter caveat did not show here.

## Unit tests and quick sets

| Command | Exit | Result | Time |
|---|---|---|---|
| `node tests\node-runner.js --suite=perf-tooling,smoke,help,ui-contract` (generator) | 0 | 4 suites, 172 tests passed | 13.9 s |
| `node tests\node-runner.js` (generator) | 0 | 47 suites, 2,964 tests passed | 118 s |
| `node tests\node-runner.js` (player) | 0 | 30 suites, 1,666 tests passed | 31 s |

`perf-tooling` has 31 tests. The ledger rows it merges are taken from the table of the fixture as **unit-test data**
and are not recorded evidence; the Node tests run `perf.js` on a sandbox folder and check that the canonical fixture
stays byte for byte as it was. They generate two `classic4` puzzles (check and record) and nothing else.

## Renderer equality (unit test, not gate evidence)

From synthetic complete ledgers (26 per-combination files in reverse name order, the real identity from `--hash-list`)
`--hash-merge=<sandbox> --update-hashes --hash-out=<sandbox>/regression-out.js` writes a file that is CRLF, has no BOM
and a final line end, and equals the canonical `regression.js` after normalising line ends (`render(table)` of the
merged table equals `render(SG.fixtures.regression.hashes)`). A changed hash is reported as a `CHANGED` line and reaches
only the alternate file; a stale source hash, a duplicate record, a missing ledger and an unreadable file each leave no
output file, and the canonical file stays unchanged throughout.

## Handoff for MS04 and later output-changing tasks

From `generator/`. The selectors are hash-mode only; `--variant`, `--level` and the other timing options still select
timing cells and are refused together with a `--hash-*` option.

```powershell
node tests\perf.js --hash-list --hash-key=classic9/hard
node tests\perf.js --hash-key=classic9/hard --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\<task>\hashes\classic9-hard-00.json
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\<task>\hashes --check-hashes
# Only after reviewing the CHANGED lines:
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\<task>\hashes --update-hashes
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\<task>\hashes --check-hashes
```

- A full refresh is 26 combinations x four shards (`--hash-from=0|5|10|15 --hash-count=5`), each in a fresh process,
  one command at a time; the shard name `<variant>-<level>-<from>.json` is only a convention. The merge needs every one
  of the 520 keys exactly once, from the current sources; the ledgers are used in manifest order, never file order.
- `--hash-merge` alone is `--check-hashes`. With `--update-hashes` it first lists the `CHANGED` combinations and the
  number of hashes that differ from the current fixture, then writes `regression.js` in CRLF through a temporary file;
  `--hash-out=<file.js>` writes another file instead. Any refusal (unknown key, range outside 0-19, conflicting
  modes, a partial canonical update, a missing, duplicate, malformed, other-kind, other-source or other-manifest
  record) writes nothing.
- A failed generation writes no ledger and prints the failing key; no record ever stands in for a missing hash.
- Ledger schema 1: `{ schema, kind: 'regression-hashes', sourceHash, manifestHash, node, commit, dirty, generatedAt,
  argv, records: [{ key: 'variant/level#seed', variant, level, seed, hash, ms, overrides }] }`; `generatedAt`, `argv`,
  `ms` and `overrides` never take part in a comparison. `overrides` lists `variant:level` when the level had to be
  offered for that record because the qualification has hidden it (`SG.fixtures.toolRecords.withRequestedLevel`, the
  original support array restored in `finally`); today no corpus level is hidden, so it is always empty.
- If a bounded check of another combination disagrees with the fixture while nothing intentional changed, suspect the
  pre-MS04 check-spacing counter of the subset finder (a puzzle may depend on the generations before it in the same
  process) before suspecting a regression, record the disagreement, and do not rewrite hashes to hide it; MS04 owns
  that fix.
- The manual `perf` suite still writes the fixture through `SG_UPDATE_HASHES=1` in LF; that route is not part of the
  bounded procedure.
