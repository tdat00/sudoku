# Test fixtures: the puzzle documents

`tests/fixtures/puzzles/` holds 18 legacy puzzle documents: the 15 variants at an easy level with fixed seeds, and
three Vietnamese ones (`classic9.vi`, `killer.vi`, `wordoku.vi`, with `locale: 'vi'` and Vietnamese `labels`).
Each records **what the generator's "Play online" feature sent when the fixtures were captured**:

```
SG.exportUi.toJson(result, { generatedAt, locale })   // the puzzle JSON of the generator (sudoku-generator/v1)
  + model: SG.exchange.plain(SG.pipeline.toWire(result).model)   // the plain ModelSpec the player rebuilds
```

They are committed (the biggest, Samurai, is about 21 kB; all together under 150 kB), so nothing has to be
generated to run the tests.

## How they were made
`tests/tools/make-fixtures.js` takes the path of a checkout of **sudoku-generator**, loads its sources the way
its own test runner does (`vm.runInThisContext`, read only), runs `SG.pipeline.run` for each entry of its
`FIXTURES` table with a fixed seed, and writes `tests/fixtures/puzzles/<name>.json`:

```
node tests/tools/make-fixtures.js <path-to-sudoku-generator> [--only=classic9,killer] [--out=<dir>]
```

`SG.exchange` is the player's own copy of `js/ui/exchange.js` (the file the two repositories share byte for
byte), so the `model` block is made by the same `plain` function the generator uses.

| File | Variant | Level | Seed | Notes |
|------|---------|-------|-----:|-------|
| `classic4`, `classic6`, `classic9` | classic 4 / 6 / 9 | easy | 4 / 6 / 9 | |
| `mega12`, `mega16` | Mega 12×12 (numbers 1–12) / 16×16 (hex) | easy | 12 / 16 | |
| `diagonalX`, `hyper`, `jigsaw9` | Diagonal X, Hyper, Jigsaw | easy | 21 / 22 / 23 | |
| `killer` | Killer (28 cages) | easy | 24 | |
| `greaterThan` | Greater-Than, signs on the whole grid (10 signs) | normal | 26 | signs only appear from `normal` |
| `samurai`, `sohei`, `butterfly`, `flower` | multi-grid boards | easy | 26 / 27 / 28 / 29 | canvas with holes |
| `wordoku` | Wordoku (word `DRAGONFLY`, diagonal) | easy | 30 | |
| `classic9.vi`, `killer.vi` | classic 9 / Killer, Vietnamese labels | normal | 91 / 92 | |
| `wordoku.vi` | Wordoku with the Vietnamese word list | easy | 93 | |

The documents were produced from the generator working tree at the time the player was built (before its
"Play online" feature existed, hence the script adds the `model` block itself). The `stats.timings` of a
regeneration differ from run to run; puzzle reproduction also depends on the generator and rating version.
The table describes the committed legacy files, not a promise that the current generator reproduces them.
For new captures, `make-fixtures.js` and `make-exports.js` request `veryEasy` for classic4/classic6 because
the score-defined ladder need not offer their former `easy` level.

## Rating-v2 compatibility
The old puzzle documents and text exports are deliberately retained as import regressions. Their difficulty
metadata is not re-labelled. `importer.test.js` additionally varies only the metadata of a fixed puzzle to
cover `expert`, `hell1`, `hell2`, `ratingVersion: 2`, future optional fields, storage/share
round-trips and identity preservation. It also imports all six new EN/VI names through the text reader.
These metadata-only cases test compatibility, not a claim that the fixture puzzle has a new measured grade.
`i18n.test.js` pins the canonical names/descriptions and checks language parity; `progress.test.js` verifies
that an updated rating still finds the same saved game.

The frozen `rated.js` puzzles keep their historical labels and technique certificates for solver tests.
The Help examples likewise remain unchanged: they demonstrate hints, not a difficulty ladder.
The example-finding tool searches supported v2 levels, including the highest offered hell tier, and
skips levels the selected generator does not offer.

## How the tests use them
`SG.testkit.document(name)` reads and parses a file (Node: `fs`; browser: a synchronous request, so a browser
run needs `http://`, on `file://` the suites that need them skip themselves), `SG.testkit.model(id)` builds
the model of a variant (the classic boards from the classic builder, the others from the `model` block).
`fixtures.test.js` checks the files themselves, `importer.test.js` opens each through `SG.importer`,
`play.test.js` plays each one, `techniques.test.js` uses the Killer and Greater-Than models for the soundness
sweeps of their techniques.

## When the generator's document changes
Regenerate (`make-fixtures.js` against the new generator), run the suites, and look at what breaks: the
importer must keep opening the documents of the generator it is shipped with: before a release, open a
document written by the generator's current `SG.exportUi.toJson` (+ `model`) with
`SG.importer.openDocument(doc)`.
