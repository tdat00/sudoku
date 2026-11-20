# MS08a evidence: Skyscraper

Developer agent claude-sonnet-5.5, branch `rating-v3`, working tree not staged or committed. Base `7fe14fb` at the start; the
orchestrator's pack-only commit `7ab77b1` (S-OD7, S-OD8, MS07f) landed at 15:03 and touched no fingerprinted file; the second E
pass, the final checks and the final quick sets ran over `7ab77b1`.
Start 2026-11-15T14:18:29+07:00, end 2026-11-15T16:20+07:00. Lock waits: none observed (every
`Invoke-Dv3Node` call started at once; for the final runs the wall time of each group equals its command time within 0.2 s; the verbatim helper is
`invoke-dv3node.ps1` in this folder). Every command below that may take more than 10 s ran through it, one command per lock,
16 s apart; the E, mutation and quick groups follow the IR12 compound rule (one lock per compound, planned at most 450 s).

## 1. The technique

`skyscraper` (group `fish`, order 112, base cost 33, weight 330, unscoped, `assumesUniqueness: false`) in `core/js/engine/tech-fish.js`,
weight `skyscraper: 330` in `generator/js/engine/difficulty.js`.

- **Proof.** Digit *d*; two base lines of one orientation (complete units of kind `row` or `col`, disjoint: no cell of either lies in another line
  of its kind, no *d* placed, exactly two open *d* cells each). Each line holds *d* once. Each of the four cells has one cover line (the owner
  line of the other orientation, from the fish module's ownership tables). Exactly one cover line is shared by the two base lines: the two roots
  on it see each other and cannot both be *d*, so one of the two ends is *d*; *d* leaves every other open cell that sees both ends through
  `model.peers` (a root or an end is never a target). Two shared cover lines are an X-Wing (`xWing` owns it, no finding); none is no pattern.
- **Enumeration.** Digit ascending, rows before columns, line pairs in line order; the first pattern with an elimination is returned.
- **Finding.** `{ technique: 'skyscraper', cells (the four cells, ascending), placements: [], eliminations (ascending), i18nKey:
  'technique.skyscraper.step', i18nArgs: { digit, lines (the two base lines, ascending unit order), ends (the two ends, ascending cell index) } }`.
  The arrays are the call's own; the state is only read.
- **Work (R10/R11).** One unit is one tested pair of base lines; limit 50,000 per call (`SG.fishSearch.SKYSCRAPER_WORK_LIMIT`), a local counter,
  the parent budget checked at entry and before the pair that would carry the work over 256 units since the last check (8 checks for 1,920 units);
  `budget.exceeded` is "nothing found", `budget.cancelled` and every other error propagate; a spent limit is `null` (a lost deduction); the observer
  `ctx.options.onPatternWork` gets `{ id, work, limit, capHit (null | 'work'), retained: null }` per call. The unregistered seam
  `SG.fishSearch.skyscraper(model, state, ctx, { workLimit })` rejects a non-finite or negative limit with `solver.invalidOption`.
- **Pattern cost** (`pattern-cost.json`, `pattern-cost.txt`, 20 runs, under the lock, 0.62 s): work 3, 21, 74 and 37 of 50,000 on the two positives and
  two negatives, nothing capped, complete. The limit was not adjusted (no before/after).

## 2. Tests and soundness

- `core/tests/fixtures/techniques.js`: `CURRENT.skyscraper` = two real positives (`SKY_ROWS`: constructed-hard-1, digit 1, rows R1 and R8 sharing C2,
  eliminations [[17,1],[61,1],[79,1]]; `SKY_COLS`: seeded puzzle 26, digit 5, columns C5 and C7 sharing R8, elimination [[7,5]]) and two negatives
  (`COLOURING` after `THROUGH_SKYSCRAPER`; `X_WING` after `BEFORE_XWING`, an X-Wing left to `xWing`); `SUPPLEMENTS.skyscraper` (three real positions);
  `REGISTRY_ORDER` (24 classic); `BELOW_CHAINS` includes skyscraper; the v2 labels, LADDER and after arrays are untouched (`historyV2`).
- `core/tests/suites/techniques.test.js`: 24 classic techniques, replaced and added lists. The generic seeded soundness-against-completions sweep
  and `minFirings` are untouched and run for the new technique (the sweep fires it 65 times in 300 states).
- `core/tests/suites/tech-fish.test.js` (+49 tests, 106 to 155): geometry (the R11 vector, its transpose, a third candidate, partial bases, overlapping
  endpoints, a target missing one end, ends in one box, non-disjoint sub-grids, jigsaw regions), real positions, the work limit, the budget cadence,
  cancellation, observer records, immutability, and an agreement test with an independent enumeration (`referenceSkyscrapers`: classic9 400 states each
  of seeds 777 and 99, 103 and 111 firings; classic6 96; classic4 7; 12-digit 22; 16-digit 11; diagonalX 28; hyper 23; jigsaw9 22).
- `generator/tests/suites/technique-weights.test.js` (+1): the placement (between xWing 320 and simpleColouring 360) and Hard tier.
- `generator/tests/manual/difficulty.test.js` (current reference contracts only): the weight table and the first technique of Hard. **Not run**
  (a manual suite); `node --check` passes and `final-checks/manual-difficulty-pure.txt` evaluates its two edited assertions against the registry (true).
- **Mutations** (`mutations.txt`, 63.8 s, one locked IR12 compound, in memory only): 10 of 10 detected by the tech-fish suite (a root as a target, an
  X-Wing counted, a one-end target, overlapping base lines, the budget checked early, cancellation swallowed, the limit off by one, unsorted ends, an
  ownerless cover line, the wrong root). The first set, on the first comment layout of the engine, is `e-source-1/mutations-source-1.txt`.

## 3. Commands (final tree; the engine source is `tech-fish.js` modified 15:52:40, E recorded after it)

| Command | Exit | Counts | Seconds |
|---|---|---|---|
| `node tests\node-runner.js --suite=tech-fish,techniques,technique-weights,difficulty-floor` (`final-checks/gen-focused-4.txt`) | 0 | 405 of 405 | 35.9 |
| Player `node tests\node-runner.js --suite=help,play,i18n` (`final-checks/player-focused-3.txt`) | 0 | 161 of 161 | 1.7 |
| Generator quick, group `shared-small` (`quick-final-2/`) | 0 | 1,586 (core-shared 1,267, steps 57, replay 154, mega 108) | 71.6 |
| group `own-suites` | 0 | 1,754 (own-fast 1,679, digger-target 75) | 170.4 |
| group `pipeline` | 0 | 154 | 318.0 |
| group `replay-player` | 0 | 69 | 139.9 |
| Player quick `node tests\node-runner.js` | 0 | 1,807 of 1,807 | 35.3 |
| `bash .github/scripts/generator-suites.sh check` (`ci-check.txt`) | 0 | 3,563 Generator and 1,807 Player tests, every test in one shard, every job in its limit | 4 |
| E wires: `run-shards.cjs --plan=plan-wire.json` (5 shards `replay-fixtures.js --ids=G09..G13 --record`) | 0 | 5 of 5 | 41.9 |
| E analyses: 14 shards `replay-goldens.js --ids=G01..G14 --record` | 0 | 14 of 14 | 61.7 |
| E hashes: 104 shards `perf.js --hash-key ... --hash-record` (`hashes-runner-console.txt`) | 0 | 104 of 104 (520 keys) | 304.8 |
| `replay-fixtures.js --merge --check`, `replay-goldens.js --merge --check`, `perf.js --hash-merge --check-hashes` (`final-checks/`) | 0 each | wires and analyses up to date; 520 of 520 hashes unchanged, recorded from the current sources | 0.4 to 0.5 each |
| `pattern-cost.js --ids=skyscraper --runs=20 --json=...` | 0 | 4 cases, 80 finds, complete | 0.62 |
| `make-technique-examples.js ..\generator --max-puzzles=64 --max-hints=400 --check` (`final-checks/gh-check-all.txt`) | 0 | 29 of 29 examples reproduced | 1.5 |
| `run-mutations.cjs` | 0 | 10 of 10 detected | 63.8 |

The standing quick cost is **699.8 s** Generator (sum of the four group commands; 692.1 s at MS07e) and 35.3 s Player. An earlier green run of the
same behaviour before an engine comment was re-wrapped to the 110-character rule of AGENTS.md (`quick-final/`) took 691.6 s (72.5, 171.2, 308.8 and
139.1 s) and 35.1 s: pipeline varies by 9 s between the two runs.

Conventions: 699.8 s is the sum of the four `Invoke-Dv3Node` group walls (71.582, 170.353, 317.976 and 139.922 s); the manifest's shard
values are the group runner's per-shard process seconds; the Player's 35.3 s is its `Invoke-Dv3Node` wall, and the manifest's 34.7 s its body time.
Final quick fingerprints: Generator `519cd6653180d243…`, Player `222e69cffbc2ea1c…` (`quick-final-2/`).

## 4. Two E passes (why `e-source-1/` exists)

E was first recorded on the engine with eight comment and wrap lines of 111 to 113 characters (AGENTS.md: at most 110 in the engines). Re-wrapping
them changes the engine source hash (it covers the file bytes), so E was recorded again on the final source; the first set is kept whole in
`e-source-1/` (wire, analysis, hashes, logs, `shard-runs.jsonl`, the check/write/update transcripts, the first pattern cost, the first mutation run and the first final
checks). The second pass reproduces the committed fixtures exactly (no diff, no update), so the first pass's effects are the final ones.

### 4.1 Effects (first pass, `e-source-1/*-check-before-write.txt`, `*-write.txt`, `hash-update.txt`)

- **Wires** (GR, 5 of 5, wire before analysis): G09, G11 and G12 changed (`wire-check-before-write.txt`), written (`wire-write.txt`), G10 and G13 unchanged.
- **Analyses** (14 of 14): G01, G04, G06, G11, G12 and G14 changed, written; the other eight unchanged.
- **Regression hashes** (GG, 104 shards): **66 of 520 changed**: classic6/hard 2 (seeds 34, 610), classic9/hard 8, classic9/expert 8, classic9/master 10,
  classic9/nightmare 5, diagonalX/nightmare 9, hyper/hard 7, jigsaw9/master 8, greaterThan/hard 9; only cells whose level admits the skyscraper. The
  task orders `--update-hashes` as part of owned E; the before/after is `hash-check-before-write.txt` and `hash-update.txt`.
- **References (26 labelled puzzles, `rated-effect.txt`):** 4 ratings change, no level, no requiredness and no `v3Expected` changes (so `rated.js` needs no
  edit): constructed-hard-1 560 to 475, constructed-hard-2 563 to 521, constructed-hard-3 554 to 515 (hardest technique `skyscraper` 330 instead of
  `simpleColouring` 360; 1, 2 and 1 uses) and constructed-nightmare-3 2,642 to 2,653 (one use).
- **G01** (the example of the Generation Steps guides, Classic 9 expert, seed 3275974478) is another puzzle: score 925 (969), 72 dig-log entries, 28 positions,
  compact scores 0, 23, 44, 47, 621, 925, 925, jump 47 to 621 caused by Simple Colouring at R2C4 (first use 26 of 61) and a following exchange (621 to 925,
  a new peak, not a jump). G04 has 29 positions, the goldens 13 compact and 16 details jumps (29; 20 distinct), the G11 inner peak is 1,964 (it was 1,967).

## 5. Pins that followed the new outputs (all refreshed from recorded data; none a correctness failure)

The first quick run (`quick/`) failed 11 tests, all pins on generated or recorded output; every fix is the new recorded number, never a loosened assertion:

- `cache.test.js`, `worker.test.js`, `pipeline.test.js` (`MS05b1-T04/T05`, the shallow-fallback specimen): classic9 Nightmare seed 5 with one attempt became
  exact (score 1,887). `q-shallow-seeds.cjs` (`shallow-seeds.txt`): seeds 21, 24 and 29 are shallow fallbacks; the three suites use **seed 21**.
- `generator/tests/suites/player.test.js` (7 tests): the G01 numbers (rated 6 and refused 4, 33 and 8, the seven step texts in both languages, the meta lines, the scores
  and changes, the frame of the one culprit R2C4 with R8C6 as removed and no later cause, the table scores 621 and 925), G04 30 steps, G11 peak 1,964, 29 jumps.
  `player-facts.js` and `player-facts.txt` print them from the code.
- `replay.test.js`, `steps.test.js`: the G01 pins (fixed before the quick run, from `golden-facts.txt`, `g01-compact.txt` and `g01-steps-texts.txt`).
- `player/tests/suites/help-example-tools.test.js`: the saved `pointing` example has `source.step` 26 (it was 27) in the comparison test.
- `player/tests/suites/help.test.js`: 28 to 29.

## 6. GH (the Player catalogue, `player/js/ui/help-examples.js`)

29 examples (`gh-check-all.txt`, exit 0). `skyscraper` is new: the source is the one of the saved `simpleColouring` example (Classic 9 Hell 1, seed 214), 65 hints, solved,
the skyscraper hint is the one at replay step 33 (`gh-check-skyscraper-colouring-source.txt`, then `gh-write.txt`); no discovery was run (the existing source
was preferred, as the task says). `pointing`, `simpleColouring`, `swordfish` and `xyWing` are made again from their own sources (`gh-write-refresh.txt`;
`gh-check-existing-28.txt` shows 5 of the 28 old examples differ before the writes: these four and `xyzWing`). `xyzWing`'s old puzzle no longer needs one (the
skyscraper or the colouring takes its deduction): the four existing sources whose replay reaches an `xyzWing` hint were tried (`sources-xyz-existing.json`, then
`sources.json` of the Player artifacts) and the easiest to read, Classic 9 Nightmare seed 11 (the source of the `wWing` example, 72 hints), was taken (`gh-write.txt`).
Sources and the scripts that made them are in `player/tests/artifacts/difficulty-v3/MS08a/`.

## 7. Documents and other files changed

Guides: `USERGUIDE.md` and `USERGUIDE.vn.md` (24 classic techniques, 29 examples), `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` (weights 29, the bounded finder paragraph,
the supplements and pattern-cost lists). Designs: `generator/design.md` (section 6.6 skyscraper paragraph, the table, tiers, tests rows, the example numbers of the guides
and the steps), `player/design.md` (counts, the MS08a catalogue note). Notes: `docs/difficulty-v3/notes.md` (MS08a section). Locales (both apps, EN and VI):
`technique.skyscraper`, `.desc` and `.step` (arguments `{digit, lines, ends}`). `.github/scripts/generator-quick.json`: information only (counts, seconds and the MS08a
provenance paragraph; no suite, shard or projection changed).

## 8. Named items

No new item. S-AV08 re-measured (699.8 s Generator, 35.3 s Player). Inherited S-AV01 to S-AV30 are open as MS07e left them (the quick sets, E and the GH catalogue say nothing
about offers, qualification, the Greater-Than CV6 margin, mega times or Hell 1 availability, and nothing here changes a weight, a band, an order or an offer other than the new
technique).
