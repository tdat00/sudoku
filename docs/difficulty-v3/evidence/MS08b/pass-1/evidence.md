# MS08b evidence: Two-string kite

Developer agent claude-sonnet-5.5, branch `rating-v3`, working tree not staged or committed. Base commit `75b99e6` ("difficulty-v3 MS07f: move the
four slow quick tests to the manual tier (S-OD8)"), clean and green at the start (Generator quick 3,560, Player 1,807); no commit landed during the
task. Start 2026-11-15T17:19:18+07:00, end 2026-11-15T19:08+07:00.
Lock: every command over about 10 s ran through `Invoke-Dv3Node` (the verbatim helper is `invoke-dv3node.ps1` in this folder), one command per lock,
16 s apart, the E, mutation and quick groups as IR12 compounds (admission 450 s, ceiling 540 s). pentomino (MP14a) shared the machine with
`dv3-timing.lock`; the waits that were observed are in section 3. Nothing under 10 s was locked (the measured short commands: scans 0.4 s,
merge-checks 0.4 to 0.7 s, `--list-tests` inventories, `node --check`, the CI check 4 s, the format and fingerprint checks 0.3 to 0.5 s).

## 1. The technique

`twoStringKite` (group `fish`, order 114, base cost 34, weight 340, unscoped, `assumesUniqueness: false`) in `core/js/engine/tech-fish.js`, weight
`twoStringKite: 340` in `generator/js/engine/difficulty.js`.

- **Proof.** Digit *d*; a row and a column, both complete units of kind `row` and `col` and disjoint (no cell of either lies in another line of its
  kind, the MS08a whole-line rule, never weaker than `findFish`'s candidate ownership), each with *d* in exactly two open cells and no *d* placed, the
  four cells distinct. One cell of the row and one of the column lie in the same box (a complete unit of kind `box` that is the only box owning both
  cells, from the `boxOf` owner table): these two, the bridge, see each other and cannot both be *d*, so one of the other two cells, the ends, is *d*,
  and *d* leaves every open cell that is a real peer of both ends (`model.peers`: extra regions and Jigsaw regions count as peers); a bridge cell or
  an end is never a target.
- **Interpretation (recorded, not asked):** "box" = `unitMeta.kind === 'box'`. A Jigsaw region is no box, so Jigsaw has no kite and costs no work; an
  overlapped box of a multi-grid board (two owners) bridges nothing. A board without any box (the Latin square of the tests) has work 0.
- **Enumeration.** Digit ascending; rows in line order; columns in line order; the bridge's row cell, then its column cell, in ascending cell order;
  the first pattern with an elimination is returned.
- **Finding.** `{ technique: 'twoStringKite', cells (the four cells, ascending), placements: [], eliminations (ascending), i18nKey:
  'technique.twoStringKite.step', i18nArgs: { digit, lines (the row and the column, in unit order), bridge (the two bridge cells, ascending), ends (the
  two ends, ascending) } }`; the arrays are the call's own, the state is only read.
- **Work (R10/R11).** One unit is one tested pair of a row and a column that both hold *d* twice. Limit 50,000 per call
  (`SG.fishSearch.KITE_WORK_LIMIT`), a local counter; the parent budget is checked at entry and before the pair that would carry the work over 256
  units since the last check (checks at 0, 256, ... 1,792 for 2,048 units, pinned by a test with the exact positions); a spent limit is `null` with
  `capHit: 'work'` (a lost deduction); a spent budget is "nothing found" with `capHit: null`; cancellation and every other error propagate; the observer
  `ctx.options.onPatternWork` gets `{ id, work, limit, capHit, retained: null }` per call. The unregistered seam `SG.fishSearch.twoStringKite(model,
  state, ctx, { workLimit })` floors a fractional limit and rejects an invalid one with `solver.invalidOption`.
- **Structural maximum** (`structural-max.txt`): units per call, against 50,000: 729 on every 9×9 board (Classic, Diagonal, Hyper, Killer, Greater-Than,
  Wordoku), 216 on 6×6, 64 on 4×4, 1,728 on the 12-digit board, 4,096 on the 16-digit board, **6,561 on the Samurai** (the largest, 13 %; 27 disjoint
  rows and columns), 2,916 on the Sohei (18), 324 on the Flower (6), 0 on the Butterfly (no disjoint line) and on Jigsaw (no box). The limit binds on no board.
- **Pattern cost** (`pattern-cost.json`, `pattern-cost.txt`, 20 runs, 100 finds, 0.66 s): work 11 and 22 on the two positives and 98, 7 and 41 on
  the three negatives, nothing capped, complete. The limit was not adjusted (no before/after).
- **Shared helpers.** The skyscraper now uses the shared `endEliminations`, `findBounded` and `seamOf`. `skyscraper-differential.txt`: the skyscraper of the
  base commit (`git show 75b99e6:core/js/engine/tech-fish.js`) and the one of the tree give the same Finding JSON and the same observer record on
  2,336 states (classic9 seeds 777, 99 and 20260101, classic6, classic4, 12 and 16 digits, diagonalX, hyper, jigsaw9, killer, greaterThan, wordoku,
  samurai, sohei, butterfly, flower), each also under the explicit limits 0, 1 and 3: 9,344 lines, one SHA-256 for both (`43f7164b...`), IDENTICAL.
  So the diff of the generation source is the kite, its weight and a behaviour-neutral refactor of the skyscraper.

## 2. Tests, soundness and mutations

- `core/tests/fixtures/techniques.js`: `CURRENT.twoStringKite` = two real positives (`HARD_B`, digit 5, row R6 and column C8 bridged in box 6,
  elimination [[73,5]]; `KITE_SEEDED`, seed 99 state #232, digit 5, row R9 and column C2 bridged in box 7, elimination [[34,5]]) and three negatives
  (`COLOURING` after `THROUGH_KITE`: nothing left; `ESCARGOT` after `THROUGH_KITE`: a row pair and a column pair that share a cell, R6C8 holds the 3;
  `SKY_ONLY`: a genuine skyscraper that is left to `skyscraper`); `SUPPLEMENTS.twoStringKite` (three real positions, `KITE_SPARE` is the third);
  `REGISTRY_ORDER` (25 classic); `BELOW_CHAINS` includes the kite; `BELOW_KITE` and `THROUGH_KITE`; the v2 labels, `LADDER` and `historyV2` untouched.
- `core/tests/suites/techniques.test.js` (195 to 204): 25 classic techniques, the added and replaced lists. The generic seeded sweep and
  `minFirings` are untouched; the sweep fires the kite 114 times (123 eliminations) in 300 classic9 states of seed 20260101 (`sweep-firings.txt`).
- `core/tests/suites/tech-fish.test.js` (+64, 155 to 219): `referenceKites`, an independent enumeration from `model.units`, `cellUnits`, `unitMeta` and
  `peers`; the geometry vector and its transpose, the four bridges, four cells in one box, ten near misses each as listed and transposed (a third
  candidate in the row or the column, a shared endpoint, no box link, a target that sees one end, a bridge cell that sees both ends, a skyscraper, an
  X-Wing, a single candidate), incomplete row, column and box, a placed digit, overlapping rows, an overlapped box (two owners), the unit order, the
  enumeration order, determinism after another call, owned Findings, the two real fixtures with an independent depth-first completion (and
  transposed), the shared-cell negative, the work limit, the budget cadence (2,048 units), cancellation, observer records, a board without boxes
  (work 0), and agreement field by field with the first removing pattern: classic9 seeds 777 and 99 (400 states each, 131 and 129 kites), classic6
  (122), classic4 (18), 12 digits (28 of 60), 16 digits (18 of 32), diagonalX, hyper, jigsaw9 (none), and the multi-grid boards (samurai 2, sohei 4,
  butterfly and flower none), each with a minimum number of firings (`agreement-counts-1.txt`).
- `generator/tests/suites/technique-weights.test.js` (+1, 7 to 8): the placement (between skyscraper 330 and simpleColouring 360) and the Hard tier.
- `generator/tests/manual/difficulty.test.js` (current reference contracts only): the weight table and the first techniques of Hard. **Not run** (a manual
  suite); `node --check` passes and `manual-difficulty-pure.txt` evaluates its edited assertions against the registry (all true).
- **Mutations** (`mutations.txt`, final source, 131.9 s of tests in one locked compound, in memory only): **17 of 17 detected** by the tech-fish suite
  (each with its failing tests): a bridge cell as a target (10 failing), a shared endpoint (30), no common box (22), an overlapped box counted (1),
  non-disjoint lines (2), one-end targets (38), the budget checked one unit early (2), cancellation swallowed (2), the limit one unit more (4),
  unsorted bridge (21), lines row-first (1), an incomplete unit accepted (4), the wrong anchor (35), a placed digit ignored (1), a third candidate
  ignored (53), only the lower cell of the row bridges (14), only the lower cell of the column bridges (14). The first run (`mutations-source-1.txt`, 17 of 17,
  on an earlier engine source) is kept.

## 3. Commands (final tree)

| Command | Exit | Counts | Seconds (lock wait) |
|---|---|---|---|
| Registration-only inventories, Generator and Player (`inventory-*.json`) | 0 | 3,634 tests in 53 suites; 1,880 in 30 | < 10 |
| `node tests\node-runner.js --suite=tech-fish,techniques,technique-weights,difficulty-floor` | 0 | 479 of 479 | 36.9 |
| `--suite=replay,steps,player,pipeline` (after the pins) | 0 | 431 of 431 | 82.2 |
| Player `--suite=help,play,i18n,help-example-tools` (`logs/player-focused-final.txt`) | 0 | 212 of 212 | 6.8 (none) |
| `structural-max.js` | 0 | 15 variants | 0.2 |
| `rated-effect.js` (`rated-effect.txt`) | 0 | 26 puzzles, 4 ratings changed | 0.76 (181) |
| `pattern-cost.js --ids=twoStringKite --runs=20 --json=...` | 0 | 5 cases, 100 finds, complete | 0.66 (about 71) |
| `run-mutations.cjs` (final source) | 0 | 17 of 17 detected | 133.3 (about 15) |
| `skyscraper-differential.js` | 0 | 2,336 states, 9,344 lines identical | 10.2 (none) |
| E wires: 5 shards `replay-fixtures.js --ids=G09..G13 --record` (one compound) | 0 | 5 of 5 | 42.4 (about 20) |
| E analyses: 14 shards `replay-goldens.js --ids=G01..G14 --record` (one compound) | 0 | 14 of 14 | 61.5 (about 95) |
| E hashes: 104 shards `perf.js --hash-key ... --hash-record` (one compound, 450 s admission) | 0 | 104 of 104 (520 keys) | 301.9 (none) |
| `replay-fixtures.js --merge --check`, `replay-goldens.js --merge --check`, `perf.js --hash-merge --check-hashes` (`e-final-checks.txt`) | 0 each | up to date; 520 of 520 unchanged, recorded from the current sources | 0.4 to 0.5 each |
| `make-technique-examples.js ..\generator --max-puzzles=64 --max-hints=400 --check` (`gh-check-all.txt`) | 0 | 30 of 30 | 1.4 |
| Generator quick, group `shared-small` (`quick-final-2/`) | 0 | 1,659 (core-shared 1,340, steps 57, replay 154, mega 108) | 73.5 (none) |
| group `own-suites` | 0 | 1,755 (own-fast 1,680, digger-target 75) | 171.8 (none) |
| group `pipeline` | 0 | 151 | 31.7 (none) |
| group `replay-player` | 0 | 69 | 24.4 (about 130) |
| Player quick `node tests\node-runner.js` (`quick-final/`) | 0 | 1,880 of 1,880 | 37.1 (none) |
| `bash .github/scripts/generator-suites.sh check` (`quick-final-2/ci-check.txt`) | 0 | 3,634 Generator and 1,880 Player tests, every test in one shard, every job in its limit | 3.8 |

**Quick cost (S-AV08 re-measured):** Generator **301.4 s** (73.535 + 171.775 + 31.694 + 24.393, the sum of the four group commands; 296.670 s at MS07f,
+1.6 % for +2.1 % tests) and Player **37.1 s** (37.135; 35.012 s at MS07f, +6.1 % for +4.0 % tests, a spread of about 2 s). Projections of
`generator-quick.json` are unchanged (every job inside its limit). The first green Generator run (`quick-final/`, 303.4 s: 72.805, 173.962, 32.326 and
24.338) ran before one more edit of `generator/design.md` (the explicit naming of the multi-grid boards, IR72 A1), which is part of the Generator
fingerprint; the Player fingerprint does not contain that file and its run stands (`fingerprint-now.js`).

**Conventions.** Group walls are the `Invoke-Dv3Node` command seconds (without the lock wait); the manifest's shard values are the group runner's
per-shard process seconds; the Player's 37.1 s is its `Invoke-Dv3Node` command time, and the manifest's runner body time is 36.5 s. Compound
projections: 2 x the MS08a measurement of the same item + 5 s, 60 s at least (`shard-runs.jsonl`: 123 shards, all within their projection).
Lock waits are the time between the queue and the start of the command; "none" means it started at once.

**Final fingerprints** (`fingerprint-now.js`, the inputs of the two runners): Generator `9b945f41b82131d8...` (`quick-final-2/`, all eight shards,
`complete`, `sourceStable`; the first run's was `3e4f3d52d9250a5c...`), Player `7606fb41e4b53518...` (`quick-final/player-quick.json`), both equal to the tree at the
end. After the Generator run only files outside both fingerprints changed (`.github/scripts/generator-quick.json`, `docs/difficulty-v3/notes.md`, this folder).

## 4. E (complete: 520 hashes in 104 shards, five wires, fourteen analyses)

The engine source is final since `tech-fish.js` 17:55:32 (SHA-256 `B2499EA2...5C68`) and `difficulty.js` (`AB0DE464...`); E was recorded after it (wires
18:03, analyses 18:07, hashes 18:08 to 18:13), in the order wires, analyses, hashes, as IR12 compounds; no byte of an engine file changed afterwards, so
there is one pass. The merge-checks ran before writing (`*-check-before-write.txt`, exit 1 with the differences), then the writes (`wire-write.txt`,
`analysis-write.txt`, `hash-update.txt`: `--update-hashes` exactly as specified), then the checks again (`wire-check.txt`, `analysis-check.txt`,
`hash-check.txt`: exit 0, "recorded from the current sources"), and once more on the final tree (`e-final-checks.txt`).

- **Source diff and mechanism.** The generation source differs by the kite finder, one weight line (`twoStringKite: 340`) and the behaviour-neutral
  skyscraper refactor (section 1). The kite is unscoped and registered at order 114 between `skyscraper` and `simpleColouring`, so a rating whose
  level admits the Hard tier can take a kite step where Simple Colouring, a chain or nothing at Hard took the deduction, and the result of every
  later step then follows.
- **Hashes (GG): 14 of 520 changed, all in the cells whose level admits the technique:** `classic9/hard` seed 89; `classic9/expert` seeds 8, 377, 10,946;
  `classic9/master` 5, 377; `classic9/nightmare` 377; `diagonalX/nightmare` 1, 5, 21, 55, 144, 610; `hyper/hard` 5. No key below Hard changed (the
  16 cells below Hard are unchanged). The cells that admit the kite and did not change: `classic6/hard` (20 of 20 unchanged), `jigsaw9/master` (no
  box: structural), `killer/hard` and `greaterThan/hard`; the changed cells also keep their other seeds (`classic9/hard` 19 of 20, `expert` 17, `master` 18,
  `nightmare` 19, `diagonalX/nightmare` 14, `hyper/hard` 19). The mechanism of a changed key: the kite takes a deduction earlier than the step that took it
  before, so a rating on the digging path (and with it an accept or a reject) differs.
- **Wires (GR, 5 of 5):** G10 (Killer Nightmare 42) changed only in its work counters: ratings 718 to 600, proposals 1,836 to 32,768, the first local search 256 to
  138 ratings and its stop `shallow` to `proposals` (a different route through ratings that the kite changed; the exact flags are unchanged and the
  generation time is unchanged, 15.0 s against 14.5 s at MS08a); G11 (Greater-Than Expert 42) rating score 957 to 994, rawScore 957 to 994,
  confidence 0.287 to 0.04, `techniqueCounts.twoStringKite` 1 (new). G09, G12 and G13 admit the technique and are unchanged.
- **Analyses (GR, 14 of 14):** G01 (Classic 9 Expert 3275974478: its first jump is now the Two-String Kite step 47 to 593 at R2C4, first use 26 of
  61, digit 3 with the lines R8 and C2, the bridge R8C3 and R9C2, the ends R1C2 and R8C9, one removal 3@R1C9 where Simple Colouring removed 3@R1C9 and 3@R2C8;
  the final score 925 is unchanged), G05 (2,497 to 2,461), G11 (957 to 994, first use 24 of 60 to 25 of 61) and G14 (details[71] 2,607 to 2,606). G02,
  G03, G04, G06 to G10 and G12, G13 unchanged (G06 and G07 are Jigsaw: no box; G03, G04, G09, G12 and G13 admit the technique and are unchanged).
- **References (26 labelled puzzles, `rated-effect.txt`, with and without the technique):** 4 ratings change, no level, no requiredness and no
  `v3Expected` change (so `rated.js` needs no edit): escargot 5,280 to 5,279, worlds-hardest-2012 5,605 to 5,592, constructed-nightmare-2
  2,662 to 2,661 and -3 2,653 to 2,652; golden-nugget and constructed-nightmare-1 use a kite once with no change of score.

## 5. Pins that followed the new outputs (each from a recorded output, like for like; no test removed, skipped or loosened)

The registration-only runs and the first pins run (`generator/tests/artifacts/difficulty-v3/MS08b/pins-1.txt`: 12 failures, all explained by the pins below) preceded the edits; `pins-2.txt` (same folder) is green (431 of 431).

- `generator/tests/suites/pipeline.test.js`, `REAL` specimen (`MS05b1`): `{ level: 'master', seed: 5 }` to `seed: 128`, the lowest seed that qualifies in the
  recorded scan of the seeds 1 to 128 (`real-specimen-scan.txt`; the first 40 are `real-specimen-scan-seeds-1-40.txt`): free search first shallow state at
  its 42nd rating, 216 shallow ratings after it, 258 in all, ended on the proposal cap; with the allowance 64 it ends 106 ratings in with `capHit: 'shallow'`.
  Seed 5 is shallow from its first rating now and ends at 48 ratings. The premise assertions are unchanged. The Nightmare shallow-fallback specimen (seed 21 of
  cache, worker and pipeline) still holds, no change.
- `generator/tests/suites/replay.test.js` (G01, G11): `hardest` and `counts` simpleColouring to twoStringKite; compact scores `[0,23,44,47,621,925,925]` to
  `[...593...]`; ratio, change `13.2, 574` to `12.6, 546`; G11 `[119,957],[962,957]` to `[119,994],[998,994]` and the change -5 to -4; `before.W` 1538.75 to 1518.75;
  the culprit score 620 to 593; `chosen` 621 to 593; the first use `simpleColouring` to `twoStringKite` with its key; the i18n arguments
  `colour1/colour2` (rule trap) replaced by `lines, bridge, ends` (the new truth, the assertion is kept); `after.total` 621 to 593 and the new-peak pair
  `621, 925` to `593, 925`.
- `generator/tests/suites/steps.test.js`: the G01 steps in English and Vietnamese (badge ×13.2 to ×12.6, heading 47 to 593 (+546), the technique name,
  P 360 to 340, W 1,538.75 to 1,518.75, R 215.91 to 208.31, the clue scores 620 to 593, the removal text, the bridge sentence), `925 (+304)` to
  `925 (+332)`, G05 `2,497` to `2,461`.
- `generator/tests/suites/player.test.js`: the G01 table scores and changes `[..621..574, 304..]` to `[..593..546, 332..]`, the scored step 621/574 to 593/546.
- `player/tests/suites/help.test.js`: 29 to 30 examples and techniques (three places, English and Vietnamese).
- Not pinned to generated output and therefore unchanged: `rated.js`, `help-example-tools`, the shallow-fallback specimen, `cache`, `worker`.

## 6. GH (the Player catalogue, `player/js/ui/help-examples.js`, 30 examples)

`gh-check-existing-29.txt`: of the 29 existing IDs 3 differ before any write: `hiddenTriple` (step 33 to 34), `xWing` (55 to 56) and `simpleColouring` (no
example from its own source any more). The sources of the kite were taken from the real sources of the catalogue (all 21 classic9 sources checked for a kite hint
and for a colouring hint: `gh-check-kite-existing-sources.txt`, `gh-check-colouring-existing-sources.txt`; 9 reach a kite hint and 3 a colouring hint; `sources.json`
holds 4 kite and 3 colouring candidates, 6 distinct puzzles, written with `--max-puzzles=8 --max-hints=400`, no discovery needed). The first write failed (`gh-write-refresh-first-attempt.txt`: the catalogue is incomplete without the kite
example) and is kept; `gh-write.txt` (twoStringKite, simpleColouring from the sources file) and `gh-write-refresh.txt` (hiddenTriple, xWing from their own
sources) wrote them. Chosen: **`twoStringKite`** Classic 9 Hell 1 seed 214, step 36 (digit 6, row R6 and column C2, bridge R5C2 and R6C3; the same puzzle as the
`skyscraper` example at step 33, 65 hints, solved); **`simpleColouring`** Classic 9 Nightmare seed 648, step 24 (candidates: Hell 1 644, Nightmare 828, Nightmare 648);
`hiddenTriple` (Nightmare 692, step 34) and `xWing` (Hell 1 644, step 56) from their own sources. `gh-check-all.txt`: exit 0, 30 of 30 reproduced, after the last write
and after the last engine byte; the sources and scripts are in `player/tests/artifacts/difficulty-v3/MS08b/`.

## 7. Documents and other files changed

Guides: `USERGUIDE.md` and `USERGUIDE.vn.md` (25 classic techniques, 30 techniques and examples), `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` (weights 30, the bounded
finder paragraph, the supplements and pattern-cost lists, the totals 3,634 and 1,880, the G01 numbers). Designs: `generator/design.md` (section 6.6 kite paragraph with the
proof, the multi-grid boards, the structural maximum and the effects; the ladder 30/25, the table row 114, the tier, the tree, the tests rows, the G01 numbers, the totals),
`player/design.md` (counts 30, the MS08b catalogue note, the totals). Notes: `docs/difficulty-v3/notes.md` (MS08b section). Locales (both apps, EN and VI):
`technique.twoStringKite`, `.desc`, `.step` (arguments `{digit, lines, bridge, ends}`, the same placeholders in both languages; the VI name
"Two-String Kite (diều hai dây)"). `.github/scripts/generator-quick.json`: information only (counts 1,267 to 1,340, 1,679 to 1,680, 1,807 to 1,880,
seconds and the MS08b provenance paragraph; no suite, shard or projection changed).

Changed files: `core/js/engine/tech-fish.js`, `generator/js/engine/difficulty.js`, `core/tests/fixtures/techniques.js`, `core/tests/suites/tech-fish.test.js`,
`core/tests/suites/techniques.test.js`, `generator/tests/suites/{technique-weights,pipeline,replay,steps,player}.test.js`, `generator/tests/manual/difficulty.test.js`,
`player/tests/suites/help.test.js`, `generator/tests/fixtures/{regression,replay-goldens,replay-wire}.js`, `player/js/ui/help-examples.js`, the four locale files,
the documents above, and the new folders `docs/difficulty-v3/evidence/MS08b/`, `generator/tests/artifacts/difficulty-v3/MS08b/` and
`player/tests/artifacts/difficulty-v3/MS08b/`. Nothing was staged, committed, stashed or reset; no ref was touched.

## 8. Named items

No new item. S-AV08 re-measured (301.4 s Generator, 37.1 s Player). Observation, not an item: the G10 wire's local-search counters (stop on the proposal cap
instead of the shallow cap) changed with unchanged generation time (15.0 s against 14.5 s). The inherited S-AV01 to S-AV30 are open as MS08a left them (E, the quick
sets and the GH catalogue say nothing about offers, qualification, the Greater-Than CV6 margin, mega times or Hell 1 availability, and nothing here changes a band,
an order or an offer other than the new technique).

## 9. IR72 A to J

| | Item | Where |
|---|---|---|
| A1 | Design 6.6 states the proof, every precondition, scope and uniqueness, what is never a target, the enumeration order, every Finding field; ownership = whole-line disjointness (never weaker than `findFish`); the multi-grid boards named (Samurai, Sohei, Flower can fire; Butterfly and Jigsaw cannot); overlapped-box negative (IR69) | `generator/design.md` 6.6, tests `needs a box that is the only box...`, `needs disjoint lines` |
| A2 | The vector and its transpose, ten near misses in both orientations, the skyscraper and X-Wing boundaries, determinism, immutability; all against `referenceKites` built from `units`, `cellUnits`, `unitMeta`, `peers` | tech-fish.test.js (+64) |
| A3 | Agreement field by field with the first removing pattern: classic9 two seeds (131, 129), classic6, classic4, 12 and 16 digits, diagonalX, hyper, Jigsaw 9, the multi-grid boards, each with a minimum | `agreement-counts-1.txt` |
| B1 | Order 114, base cost 34, weight 340, unscoped, no uniqueness; the placement and Hard-tier test; 1.25 x 340 against the band maxima through the manual script | technique-weights.test.js, `manual-difficulty-pure.txt` |
| B2 | Recorded with and without the technique; 4 ratings change, no level or `v3Expected` change | `rated-effect.txt` |
| C1, C2 | Unit stated; 50,000; local counter; parent budget at entry and at most 256 units between checks (exact positions 0 to 1,792); spent limit `null` and `capHit: 'work'`; spent budget nothing found; cancellation propagates; record `{id, work, limit, capHit, retained}` | tests in `twoStringKite (R11): work limit, budget and cancellation` |
| C3, C4 | The seam floors and rejects with `solver.invalidOption`, no unbounded mode; structural maximum (6,561 Samurai) in 6.6; pattern cost 11, 22, 98, 7, 41; no wall-time assertion; limit not adjusted | `structural-max.txt`, `pattern-cost.txt` |
| D1 to D3 | Two real positives and three negatives with explicit `after` lists; generic sweep and `minFirings` untouched (114 firings), three supplements; `REGISTRY_ORDER`, `BELOW_*` and the lists updated; `historyV2` untouched | `core/tests/fixtures/techniques.js`, `sweep-firings.txt` |
| E1 to E3 | Locales EN and VI in both apps (same placeholders); guides EN and VI, design 6.6, tables, tree, tiers, Player note, user-guide counts, `notes.md`; every total (3,634, 1,880, 30 and 25) greped for the old numbers | section 7 |
| F1 | 17 kinds covering MS08a's ten: a pattern cell as a target (0), the neighbour boundary (1, 2), a one-end target (5), disjointness and ownership (4, 3), the budget one unit early (6), cancellation swallowed (7), the limit off by one (8), unsorted output (9, 10), an incomplete unit (11), the wrong anchor (12); plus a placed digit, a third candidate and the two lower-cell bridges (13 to 16); 17 of 17 detected with the failing tests, the superseded run kept | `mutations.txt`, `mutations-source-1.txt` |
| G1 to G3 | Complete E, wires then analyses then hashes, IR12 compounds with projections and bases; merge-check before writing with the `CHANGED` lists; every changed key explained and the unchanged admitting keys listed; `--update-hashes` as specified; one pass (engine bytes final before E) | section 4 |
| H1 | `--check` of the 29 first (3 differ); new ID's source from the catalogue within the bound (6 puzzles in the sources file, 400 hints, no discovery); affected IDs refreshed from their own sources, `simpleColouring` from a recorded candidate; final `--check` 30 of 30 | section 6 |
| I1, I2 | Pins refreshed from recorded outputs, like for like, nothing loosened, the specimen = lowest qualifying seed of a recorded scan, every refresh listed with before and after | section 5 |
| J1 to J4 | Focused suites, both complete quick sets on the final tree and the CI check; one locked command per payload within 540 s, compounds per IR12, 16 s gaps; only files outside both fingerprints changed after the final runs (fingerprints compared); base commit, no landed commit and the timing conventions stated; no stop (no correctness failure); S-AV08 re-measured | sections 3 and 8 |
