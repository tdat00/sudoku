# MS03c Region-aware Jigsaw help snapshots: preparation evidence

Scope: `cellRegion` in the snapshot of a Jigsaw example (`player/tests/fixtures/help-example-tools.js`), the Jigsaw
branch of `SG.help.buildExample` (`player/js/ui/help.js`), one real Jigsaw source
(`player/tests/fixtures/jigsaw-help-source.js`) and their tests. No solver, hint, generator or locale code changed; the
canonical `player/js/ui/help-examples.js` is unchanged (SHA-256
`80ab36e57363bcda51aa441d22a44ae776f136f99518c3b3ab2c088c2ed246cf`, 27,035 bytes, before and after). Paths are relative
to the repository root.

## Identity

| Field | Value |
|---|---|
| Recorded at commit | `8252433` (MS03b accepted), working tree dirty with the uncommitted MS03c files |
| Node | v26.13.0 |
| Command folder | `player/` (the GH commands below are shown as typed there), `generator/` for its quick set |
| Intermediates | the tool wrote only `tests/artifacts/difficulty-v3/MS03c/help-examples.js`; the default work folder `tests/artifacts/difficulty-v3/help` does not exist after the runs |

## Announced bounded GH preparation (the only discovery), one process, jobs 1

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=nakedSingle --discover --variants=jigsaw9 --levels=hard --max-puzzles=1 --max-hints=400 --write --out=tests\artifacts\difficulty-v3\MS03c\help-examples.js
```

| Exit | Wall | Result |
|---|---|---|
| 0 | 0.39 s | request 1/1 `jigsaw9 hard 1` made, 0 failed; replay of 1 puzzle: 70 hints, solved; `nakedSingle` found; `wrote ... (26 examples; 1 selected: nakedSingle; the others kept)` |

Selected source: variant `jigsaw9`, level `hard`, seed `1` (the first request of the Jigsaw plan), the generator's
Export text copied unchanged into `tests/fixtures/jigsaw-help-source.js` (212 characters, SHA-256
`c7881da9282c471aae27f88a9643b0a9df89a444b46f8ebea92a5a335796336e`). The same text, in the source-file schema, is
`tests/artifacts/difficulty-v3/MS03c/sources-jigsaw.json`.

Region map of the snapshot (`nakedSingle` in the alternate catalogue, `source.step` 0): `cellRegion` is a plain array of
81 integers, regions 0 to 8 with 9 cells each, and 49 of the 81 cells lie in a different region than the regular 3x3
box of the cell (the regions are irregular). The alternate catalogue differs from the canonical one in the `nakedSingle`
entry (`variant` `jigsaw9`, `cellRegion` added; key order `variant, givens, values, notes, cellRegion, hint, source`) and
in the generated header, which documents `jigsaw9` and `cellRegion` only because this catalogue holds a Jigsaw example
(27,462 bytes, CRLF, no BOM, SHA-256 `98b0c92f5d6cb734b641fdf07777ab9c1df96237ae1fd860ae5d1393c3a4d97c`). The other
25 entries are identical to the canonical ones.

## Read-only checks of the tool (no generation, nothing written)

| Command | Exit | Wall | Result |
|---|---|---|---|
| `node tests\tools\make-technique-examples.js ..\generator --ids=nakedSingle --sources=tests\artifacts\difficulty-v3\MS03c\sources-jigsaw.json --max-puzzles=1 --max-hints=400 --check --out=tests\artifacts\difficulty-v3\MS03c\help-examples.js` | 0 | 0.17 s | the Player replays the Jigsaw source (70 hints, solved) and `nakedSingle: matches help-examples.js` |
| `node tests\tools\make-technique-examples.js ..\generator --check` (the 26 saved sources) | 0 | 1.11 s | all 26 examples match the canonical catalogue |

## Quick checks

| Command | Exit | Result | Time |
|---|---|---|---|
| `node tests\node-runner.js --suite=help-example-tools,help,text-boards,ui-contract` (player) | 0 | 4 suites, 154 passed | about 6.7 s |
| `node tests\node-runner.js` (player) | 0 | 30 suites, 1,666 passed (1,653 before and 13 new tests) | 29.8 s wall |
| `node tests\node-runner.js` (generator) | 0 | 46 suites, 2,933 passed (unchanged) | 103.8 s wall |

A mutation check confirmed that the malformed-map test fails when `help.js` skips the model validation (a map with a
region number 9 then gave a board); the file was restored before the final runs.

## Test plan coverage

| Case of the plan | Test |
|---|---|
| genuine non-rectangular Jigsaw | `help`: the board, notes and move of the first hint and of the first hint that looks into a Jigsaw region, from `jigsaw-help-source.js`, replayed by the current hint code (no pinned step); `help-example-tools`: the source is a real Jigsaw block and its map differs from the 3x3 boxes |
| model, units, unit metadata, layout.cellRegion, givens, values, hint effects | `help`: field-for-field comparison of the rebuilt model with the model of the source game, the values, the notes of the shown cells only (every other cell 0, while the game still has notes there), the hint fields, and the placements and eliminations after `applyHint` |
| copied map ownership | `help-example-tools`: owned plain 81-entry array, a later change of the model map or of the snapshot map changes neither; `help`: a built board does not change when the example changes afterwards, nor the example when the board changes |
| missing / wrong-length / invalid membership | `help`: no map, null, empty, 80 and 82 entries, a string, a typed array, region numbers 9, -1, 0.5 and "0", regions of 8 and 10 cells all give no board (`null`, the page says unavailable); `text-boards`: `jigsawSpec` itself checks only the length, the model validation refuses uneven or out-of-range regions (the builder and validation `help.js` reuses); `help-example-tools`: `validateSnapshot` refuses a Jigsaw example without a valid map and a map in any other variant |
| unchanged classic / Killer / sign examples | `help-example-tools`: no saved example has `cellRegion`; `nakedSingle` (classic), `cageCombo` (Killer) and `ineqChain` (Greater-Than) are replayed to the same data as the committed ones; the existing `help` replay tests are unchanged; `--check` of all 26 matches |
| tool path | `help-example-tools` (Node): a real run of the tool writes the Jigsaw source into a sandbox catalogue with its map and header, equal to the saved data for the other 25 IDs, checks it again and leaves the canonical file untouched |

## Handoff for MS14 and later Jigsaw examples

A Jigsaw example needs no new format: record the source with `--discover --variants=jigsaw9 --levels=hard` (the Jigsaw
plan has hard, expert and master) or give a Jigsaw block in a `--sources` file, then `--write`; the snapshot then holds
`cellRegion` and the guide rebuilds the board with `SG.textBoards.jigsawSpec` and the model validation. The first
canonical write that selects a Jigsaw example also changes the generated header of `help-examples.js` (the `variant`
line and one added `cellRegion` line).
