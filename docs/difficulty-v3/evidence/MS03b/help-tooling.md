# MS03b help-example tooling: preparation evidence

Scope: the bounded, curated help-example tool `player/tests/tools/make-technique-examples.js` with its pure helper
`player/tests/fixtures/help-example-tools.js` (`SG.fixtures.helpExampleTools`) and the suite
`player/tests/suites/help-example-tools.test.js`. No solver, hint, generator or help UI code changed and the canonical
`player/js/ui/help-examples.js` is unchanged (SHA-256 `80ab36e57363bcda51aa441d22a44ae776f136f99518c3b3ab2c088c2ed246cf`
before and after). Paths are relative to the repository root.

## Identity

| Field | Value |
|---|---|
| Recorded at commit | `7c2b524` (the task pack over `d790dd6`), working tree dirty with the uncommitted MS03b files |
| Node | v26.13.0 |
| Command folder | `player/` (the commands below are shown as typed there) |
| Intermediates | the tool wrote only under `tests/artifacts/difficulty-v3/MS03b/`; the default work folder `tests/artifacts/difficulty-v3/help` does not exist after the runs |

## Quick checks

| Command | Exit | Result | Time |
|---|---|---|---|
| `node tests\node-runner.js --suite=help-example-tools,help,ui-contract` (player) | 0 | 3 suites, 128 passed | about 5.5 s |
| `node tests\node-runner.js` (player) | 0 | 30 suites, 1,653 passed (1,609 before and the 44 of the new suite) | 32.6 s wall |
| `node tests\node-runner.js` (generator) | 0 | 46 suites, 2,933 passed | 115.2 s wall |

## Bounded GH preparation, from `player/`, one invocation at a time

| Command | Exit | Wall | Result |
|---|---|---|---|
| `node tests\tools\make-technique-examples.js ..\generator --ids=nakedSingle --max-puzzles=1 --max-hints=400 --check` | 0 | 0.18 s | 1 puzzle, 47 hints, solved; `nakedSingle: matches help-examples.js` |
| `node tests\tools\make-technique-examples.js ..\generator --ids=cageCombo --max-puzzles=1 --max-hints=400 --check` | 0 | 0.17 s | 1 puzzle, 51 hints, solved; `cageCombo: matches help-examples.js` |
| `node tests\tools\make-technique-examples.js ..\generator --check` (every ID, the saved sources) | 0 | 1.28 s | 26 puzzles; all 26 examples match, `help-examples.js is up to date for the 26 selected ID(s)` |
| `... --ids=nakedSingle,cageCombo --max-puzzles=2 --max-hints=400 --record-sources=tests\artifacts\difficulty-v3\MS03b\sources-nakedSingle-cageCombo.json` | 0 | 0.22 s | `recorded 2 source(s) into ...` (the saved puzzles of the two IDs) |
| `... --ids=nakedSingle,cageCombo --sources=<that file> --max-puzzles=2 --max-hints=400 --write --out=tests\artifacts\difficulty-v3\MS03b\help-examples.js` | 0 | 0.22 s | `wrote ... (26 examples; 2 selected: nakedSingle, cageCombo; the others kept)` |
| `... --ids=nakedSingle,cageCombo --sources=<that file> --max-puzzles=2 --max-hints=400 --check --out=tests\artifacts\difficulty-v3\MS03b\help-examples.js` | 0 | 0.23 s | both match the alternate catalogue |
| `... --ids=nakedSingle --discover --variants=classic9 --levels=easy --max-puzzles=1 --max-hints=400 --record-sources=tests\artifacts\difficulty-v3\MS03b\discover-classic9-easy-1.json` | 0 | 0.41 s | one request (classic9 easy seed 1) made, 0 failed; the intermediate of the child removed |

The alternate catalogue `tests/artifacts/difficulty-v3/MS03b/help-examples.js` is byte for byte the canonical file
(same SHA-256, 27,035 bytes, CRLF, no BOM), so the renderer, the registry order and the merge of unselected IDs are
exact. The last row is a one-request exercise of the discovery path (the child process, the work folder and its
cleanup), not a search: the recorded classic9 easy seed 1 puzzle differs from the saved nakedSingle source, which was
made by an earlier generator version and re-labelled by hand, as `player/design.md` 8.3 says. No full discovery plan
was run, the canonical file was never written, and no command came near the eight-minute deadline.

## Test plan coverage (suite `help-example-tools`, 44 tests)

| Case of the plan | Test |
|---|---|
| one assigned source per ID; stable tie; only assigned sources | replaying a source: rebuilds the saved snapshot field for field, finds the saved example at step 58, chooses the clearest example (the earliest on a tie) from the assigned sources only |
| unknown ID; missing source; malformed source | options (selects exact registered IDs); sources (default source from the saved example, names the ID and the entry of a malformed source); tool (invalid sources file, a text that is not one puzzle) |
| cap at one before a second generation | bounded discovery: the plan loop stops before request N+1 (attempts count, failures included) |
| legacy `--puzzles` cap; conflicting values | options (`--puzzles` is the same cap); tool (`--puzzles=1` check, `--puzzles=2 --max-puzzles=3` is a usage error, a cap of 1 for two IDs names the ID without a source) |
| no generation in check/default mode | tool: a check with a non-existent generator folder succeeds; a discovery with one is refused before any work |
| child timeout | fake child: timeout, kill and a stop at the deadline are incomplete; a passed deadline never starts the child; cleanup always |
| per-puzzle hint limit | replay: stops at the hint limit of the puzzle; tool: `1 stopped at the hint limit` in the report |
| missing requested ID leaves output untouched | tool: a source file with no source, no readable source or no example keeps the old file byte for byte; catalogue: nothing is written while an ID has no example |
| selected update preserves another ID | catalogue: merge keeps every other ID; tool: a write into an alternate catalogue equals the saved one |
| invalid discovery/check/source/filter combinations | options table (37 refusals) |
| CRLF/no BOM; cleanup of owned intermediates only | catalogue and sources text; fake child (only its own intermediate is removed); tool (a write leaves only the alternate catalogue in the sandbox) |
| two new IDs: one source records, the catalogue write fails until both are supplied | tool: a sandbox catalogue without `pointing` and `boxLine` |

## Handoff commands for MS03c and later technique tasks

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=<id> --discover --variants=<variant> --levels=<level> --max-puzzles=12 --max-hints=400 --record-sources=tests\artifacts\difficulty-v3\<task>\<id>.json
node tests\tools\make-technique-examples.js ..\generator --ids=<id>[,<id>] --sources=tests\artifacts\difficulty-v3\<task>\sources.json --max-puzzles=16 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=<id>[,<id>] --sources=tests\artifacts\difficulty-v3\<task>\sources.json --max-puzzles=16 --max-hints=400 --check
node tests\tools\make-technique-examples.js ..\generator --ids=<id> --max-puzzles=1 --check
```

Source file: `{schema:1, sources:{id:[{variantId, level:null|string, seed:null|string, text}]}}`. Several per-ID files are
combined with `SG.fixtures.helpExampleTools.combineSources([{ name, data }])` (an ID in two files is refused, no puzzle
text changes) and written with `sourcesText`. A write needs every selected ID found and a complete valid catalogue,
or the target stays untouched; check and record never write a catalogue.
