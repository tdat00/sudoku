# MS08b evidence: Two-string kite (fix round after ruling (b))

Developer agent claude-sonnet-5.5, branch `rating-v3`, working tree not staged or committed. Base commit `75b99e6`; no commit landed during the task.
First pass (kite with boxes only): start 2026-11-15T17:19:18+07:00, its evidence is kept whole in `pass-1/` (its `evidence.md`, E ledgers, quick runs).
**Fix round** (this document): start 2026-11-15T19:19:12+07:00, end 2026-11-15T20:34+07:00.

**Ruling (b)** of the pack author (orchestrator message of 19:20): "real box" means a complete box-like unit, `kind === 'box' || kind === 'region'`; excluding
Jigsaw was not the pack's intent. The overlapped-box decision stands as a conservative restriction: each bridge cell has exactly one complete box-like
owner, counted over both kinds, and the owners match; whole-line disjointness stays; no wholesale ban of multi-grids and no bridges through other extra
units (a diagonal or a window is no box). My first pass had taken the other reading without asking; the next such case is a `QUESTION:`.

Lock: every command over about 10 s ran through `Invoke-Dv3Node` (verbatim helper `invoke-dv3node.ps1`), one command per lock, 16 s apart, E, mutation and
quick groups as IR12 compounds (admission 450 s, ceiling 540 s). pentomino shared the machine; the one wait of the round was the final wire compound (about 130 s).

## 0. What changed in this round

| | First pass | Fix round |
|---|---|---|
| Bridge unit | kind `box` only | kind `box` or `region`, counted over both kinds |
| Jigsaw | no kite, work 0 | fires: 28 of 120 states (its transpose 31), structural bound 729 |
| `tech-fish` tests | 219 | **236** (+17) |
| Mutations | 17 of 17 | **20 of 20** (three regress to the box-only rule) |
| Regression hashes changed (vs base) | 14 of 520 | **18 of 520** (+ `jigsaw9/master` seeds 5, 13, 144, 233) |
| Analyses changed (vs base) | G01, G05, G11, G14 | G01, G05, **G06, G07**, G11, G14 |
| Wires changed (vs base) | G10, G11 | G10, G11 (the five wires are the same as in pass 1) |
| Help examples | 30 (4 written) | 30, all 30 match, none written |
| Generator quick | 3,634 tests, 303.4 s (first), 301.4 s (final) | **3,651 tests, 303.4 s** |
| Player quick | 1,880 tests, 37.1 s | **1,897 tests, 38.1 s** |
| Locales (EN/VI, both apps) | "in the same box" | "in the same box (or region)" / "(hoặc vùng)" |

## 1. The technique (as it stands)

`twoStringKite` (group `fish`, order 114, base cost 34, weight 340, unscoped, `assumesUniqueness: false`), registration, weight, Finding schema, scan order and
work and budget rules unchanged. The only engine change is the eligibility of the bridge (`core/js/engine/tech-fish.js`): `infoFor` collects the complete
units of kind `box` **or** `region` into one owner table (`boxOf`, `ownerTable` over the combined list: a cell in none or in several is -1) and `hasBox`
is true when there is one; `kiteOf` bridges two cells that have the same owner. Comments (the header, `infoFor`, `kiteOf`, `scanKite`) say so; the longest
engine line is 110.

- **Proof.** Digit *d*; a row and a column (complete units, whole-line disjoint, the digit in exactly two open cells each and not placed, four distinct cells);
  one cell of each in the same single box-like unit; those two cells see each other, so one of the other two (the ends) is *d*, and *d* leaves every real peer
  of both ends; a bridge cell or an end is never a target.
- **Where it can fire.** Every board with complete box-like units and disjoint lines: all 9×9 boards (**Jigsaw included**), the 4, 6, 12 and 16 digit
  boards, and the Samurai, Sohei and Flower on their unambiguous boxes; never the Butterfly (no disjoint line); an overlapped multi-grid box has two owners
  and bridges nothing (on the registered boards a cell of an overlapped box lies in a row and a column of each of its two grids, so its lines are not disjoint anyway); a diagonal or a window is no box.
- **Structural maximum** (`structural-max.txt`, recomputed for every variant, units per call against 50,000): 729 on every 9×9 board (Classic, Diagonal,
  Hyper, **Jigsaw (was 0)**, Killer, Greater-Than, Wordoku), 216 on 6×6, 64 on 4×4, 1,728 (12 digits), 4,096 (16), 6,561 on the Samurai (the largest, 13 %),
  2,916 on the Sohei, 324 on the Flower, 0 on the Butterfly. Only the Jigsaw bound moved.
- **Pattern cost** (`pattern-cost.txt`/`.json`, 20 runs, 100 finds): 11 and 22 on the positives, 98, 7 and 41 on the negatives, nothing capped (identical to
  pass 1: the five fixtures are classic9 positions). Jigsaw populations (`jigsaw-counts.txt`): the largest work of any call on 120 states is 15 (the Generator's
  layout) and 20 (its transpose) of 50,000, nothing capped.
- **Skyscraper** unchanged (`skyscraper-differential.txt`): the skyscraper of the base commit and the one of the tree give the same Finding and observer
  record on 2,336 states (the Jigsaw states included), also under the limits 0, 1 and 3: 9,344 lines, `43f7164b...`, IDENTICAL (rerun in this round).

## 2. Tests, soundness and mutations

- `core/tests/suites/tech-fish.test.js` (155 to **236**; in the Generator and in the Player, `tech-fish` 8.8 s and 8.9 s):
  - `referenceKites` (independent, from `model.units`, `cellUnits`, `unitMeta`, `peers`) now takes the bridge's box as the single complete unit of kind `box`
    or `region` holding the cell (`boxLike`, counted over both kinds); its doc comment says so. `buildGridModel` got `extraRegions` (a second unit of kind
    `region` over a box's cells).
  - The Jigsaw "always none" test is gone. New: `JIGSAW_LAYOUT` (the registry's irregular layout, written out so that positions and counts do not depend on an
    environment's own `jigsaw9`), `regionBoard` and `jigsawBoard(turned)` (the layout and its transpose); a vector through region J4 (digit 5, R3C5 and R4C7,
    row R3 and column C7, ends R3C9 and R8C7, R8C9 loses it) and its transpose on the turned board (both checked against the enumeration first), four near
    misses each as listed and transposed (bridge cells in different regions, in one 3 × 3 block but different regions, a third candidate, a target that sees one
    end), the layout without boxes (`has no box...`), a box and a region over the same cells (two owners, counted over both kinds), the 4 × 4 position with
    its boxes written as regions; agreement field by field on the layout and its transpose (**at least 20 kites in 120 states** each; observed 28 and 31),
    agreement on the environment's own `jigsaw9` (no minimum: its layout differs in the Player), and soundness against the solution (`H.assertSound`, at least 20
    firings on each; observed 35 and 38) plus the environment's own board.
  - The requested multi-grid ownership negative, on the real Samurai: a kite in the middle band of the center grid (G5 row 5 and column 5, bridge in the box
    G5-B5) is found, and the same shape moved onto the overlapped box G1-B9 = G5-B1 gives nothing (both bridge cells have two boxes; asserted from the model).
    The isolated duplicate-box negative (`extraBoxes`) and every other population are kept.
- `jigsaw-counts.txt`: jigsaw9 28 of 120 states with a kite, 35 firings, 44 eliminations; transposed 31, 38, 42.
- **Mutations** (`mutations.txt`, final tests, 164.8 s in one locked compound): **20 of 20 detected**, each with its failing tests (12, 33, 29, 2, 2, 42, 2, 2, 4, 25, 1,
  4, 43, 1, 68, 17 and 16 for the first seventeen, whose counts in pass 1 are in `pass-1/mutations.txt`), and three that return to the first rule: **box-only eligibility** (a region is
  no box-like unit: 7 failing), the owners counted per kind (a box and a region over the same cells: 1 failing) and the scan gate that looks only for boxes
  (6 failing). Superseded: `mutations-1.txt` (20 of 20 on the first version of this round's tests) and `pass-1/mutations.txt` and `pass-1/mutations-source-1.txt`.
- Focused gate (`gate-suites.txt`): `tech-fish`, `techniques`, `technique-weights`, `difficulty-floor` **496 of 496** (`gate-suites-1.txt`: 495 of 495 before the
  last test change).

## 3. Commands (this round)

| Command | Exit | Counts | Seconds (lock wait) |
|---|---|---|---|
| `--suite=tech-fish` after the engine change (scratch `fix-focused-1.txt`) | 0 | 235 of 235 | 8.8 (none) |
| `structural-max.js`, recomputed | 0 | 15 variants | 0.2 |
| `skyscraper-differential.js` | 0 | 2,336 states, 9,344 lines identical | 10.2 (none) |
| `pattern-cost.js --ids=twoStringKite --runs=20` | 0 | 5 cases, 100 finds | 0.68 (none) |
| `rated-effect.js` (26 references) | 0 | 4 ratings change, 0 levels | 0.73 (none) |
| E pass 2a (recorded before the locale text changed): wires / analyses / hashes (104 shards, one compound) | 0 | 5 / 14 / 520 keys | 43.0 / 62.2 / 302.0 (none) |
| `--suite=replay,steps,player,pipeline` after the E fixtures (`pins-1.txt`) | 1 | 429 of 431: two pins (below) | 84.7 (none) |
| E final: wires / analyses / hashes (one compound each, in that order) | 0 | 5 / 14 / 520 keys | 43.6 (about 130) / 61.7 (none) / 300.1 (none) |
| merge-checks, final (`e-final-checks.txt`) | 0 each | up to date; 520 of 520 unchanged | 0.4 to 0.5 each |
| `make-technique-examples.js ... --check` (`gh-check-all-before-refresh.txt`, `gh-check-all.txt`) | 0 | 30 of 30 match, none written | 1.6 |
| Player `--suite=tech-fish --filter=jigsaw --verbose` (the first quick run's failure, `fix-player-jigsaw-1.txt`) | 1 | 12 of 15 | 264.0 (none) |
| `--suite=tech-fish`, Generator and Player (after hard-coding the layout) | 0 | 236 of 236 each | 9.1 / 9.2 (none) |
| gate suites (final tests) | 0 | 496 of 496 | 39.3 (none) |
| `run-mutations.cjs` (final tests) | 0 | 20 of 20 | 166.2 (none) |
| Quick run 1 (`quick-run-1/`): Generator groups 75.0 + 175.8 + 32.8 + 24.6 = 308.2 s | 0 | 3,650 of 3,650 | green |
| Quick run 1, Player | **1** | 1,893 of 1,896; 3 `tech-fish` failures | 385.6 |
| **Final** Generator quick, groups `shared-small` / `own-suites` / `pipeline` / `replay-player` (`quick-final/`) | 0 | 1,696 / 1,755 / 151 / 69 = **3,651** (core-shared 1,357, steps 57, replay 154, mega 108, own-fast 1,680, digger-target 75) | 73.2 / 173.0 / 32.4 / 24.8 (none) |
| **Final** Player quick | 0 | **1,897 of 1,897** | 38.1 (none) |
| `generator-suites.sh check` (`quick-final/ci-check.txt`, again after the manifest edit) | 0 | 3,651 and 1,897 tests, every test in one shard, every job in its limit | 4.0 |

**Quick cost (S-AV08 re-measured):** Generator **303.4 s** (the sum of the four group commands, 303.425; 296.670 s at MS07f, +2.3 % for +2.6 % tests), Player
**38.1 s** (38.12; 35.012 s at MS07f, +8.9 % for +5.0 % tests; the runner body is 37.5 s). Pass 1 was 301.4 s and 37.1 s with 3,634 and 1,880 tests.
**Conventions:** group walls are the `Invoke-Dv3Node` command seconds (without the lock wait); the manifest's shard values are the group runner's per-shard process
seconds; the Player's figure is its command time, the manifest's its runner body time; compound projections are 2 x the measurement of the same shard in the
previous pass + 5 s, at least the 60 s floor (`shard-runs.jsonl`: 123 shards, all within their projection).
**Final fingerprints** (`fingerprint-now.js`): Generator `37eeb368f1933776...`, Player `6935886aa679e6c5...`, equal to the `sourceHash` of the eight Generator
results and of the Player result in `quick-final/` (all `complete` and `sourceStable`), and unchanged after the last edits of `.github/`, `notes.md` and this folder.

**Finding of the round (a test cost, fixed, not an item).** The first quick run failed three tests in the Player and took 385.6 s there. The Player's own `jigsaw9`
model has another region layout than the Generator's: the positions written for the Generator's layout found no kite, and the transposed layout of the Player's board
needed 258 s to generate states for (a hard layout for the testkit's digger). The suites now write the Generator's layout out (and its transpose), which both
apps run in 0.4 s, and check the environment's own `jigsaw9` for agreement only. (Core suites run in both apps: a population built on a variant's own model has to be
checked in the Player as well.)

## 4. E (complete: five wires, fourteen analyses, 520 hashes; order wires, analyses, hashes; IR12 compounds)

The engine source is frozen since `tech-fish.js` 19:27:33 (SHA-256 `7899F2D5...0451`; `difficulty.js` `AB0DE464...` unchanged). The recorders of the wires and
analyses hash the files of `SOURCE_FILES` **including the UI files** (the locales), so the locale text of the kite ("or region") had to be final first: E was
recorded once on the engine alone (**pass 2a**, 19:32 to 19:41, kept whole in `pass-2a/` with its checks) and again, in order, after the four locale files were
edited (**final**, wires 19:44, analyses 19:45, hashes 19:47 to 19:52). The two recordings agree (the final merge-checks against the fixtures written from pass 2a
say "up to date"), and the hash recorder's source excludes the UI files. The first pass (box-only) is `pass-1/`.

- **Wires (GR):** unchanged against the first pass's fixture (`wire-check-before-write.txt`: all five match): G09, G12 and G13 admit the kite and are unchanged;
  G10 and G11 differ from the base as in pass 1 (G10 only in its local-search counters, generation time 15.0 s; G11 score 957 to 994). No Jigsaw wire exists.
- **Analyses (GR)**, differences against the first pass's fixture before writing (`pass-2a/analysis-check-before-write.txt`): **G06** (15 fields: a jump after the
  first one ends at 2,327 instead of 2,329, a W of 3,339.25, a choice `max` 735, two single scores 710 and 2,327, details[28] 655) and **G07** (58 fields: another
  puzzle, 7 compact steps instead of 6 and 34 details instead of 42, the final score 2,391 instead of 1,797, 55 clues, the jump one step later). Both are Jigsaw
  Nightmare requests (G06 seed 42, G07 seed 3962167687): a region bridges now, so a rating on the digging path takes a kite and the dig differs.
  All other analyses are identical to pass 1 (G01, G05, G11 and G14 differ from the base as in pass 1). Written with `replay-goldens.js --merge ... --write`
  (`pass-2a/analysis-write.txt`), re-checked up to date on the final recording.
- **Hashes (GG)**, before writing (`hash-check-before-write.txt`): **4 of 520 differ from the first pass's fixture, all `jigsaw9/master`: seeds 5, 13, 144 and 233**;
  `node tests\perf.js --hash-merge=... --update-hashes` (`hash-update.txt`) wrote them, `hash-check.txt` is "all 520 unchanged, recorded from the current sources".
  Against the **base** commit **18 of 520 changed**: `classic9/hard` 89; `expert` 8, 377, 10,946; `master` 5, 377; `nightmare` 377; `diagonalX/nightmare` 1, 5, 21, 55,
  144, 610; `hyper/hard` 5; `jigsaw9/master` 5, 13, 144, 233 (the old-to-new count is 14 to 18).
  - Mechanism: every changed key's level admits the kite (Hard and above), no key below Hard changed (16 cells), the source diff is the kite, its weight and the
    behaviour-neutral skyscraper helpers (identical on 2,336 states).
  - Unchanged although they admit the technique: `classic6/hard` (20 of 20), `killer/hard` (20), `greaterThan/hard` (20) and the other **16 seeds of
    `jigsaw9/master`**; `jigsaw9/normal` (below Hard) is unchanged. **No Jigsaw key is "structurally excluded" any more**: `jigsaw9/master` admits the technique,
    four of its twenty puzzles change.
- **References** (`rated-effect.txt`): the 26 labelled puzzles are classic9; identical to pass 1: four ratings change (escargot 5,280 to 5,279, worlds-hardest-2012
  5,605 to 5,592, constructed-nightmare-2 2,662 to 2,661 and -3 2,653 to 2,652), no level, requiredness or `v3Expected` change.

## 5. Pins that followed (each from a recorded output, like for like; nothing removed, skipped or loosened)

- `generator/tests/suites/replay.test.js`: `rated.score` of G06 with the default count, **2329 to 2327** (the G06 golden's final score, `golden-jumps-g06-g07.txt`); the table
  `UNRECORDED` of goldens whose jump has no recorded candidates: **`'G07:5'` to `'G07:6'`** (the G07 jump is step 6 now, `multi-move`, choice kind `combined`, as the failing
  assertion said).
- `generator/tests/suites/steps.test.js`: the two `toContain` of the first-use paragraph name the new words, "the cells R8C3, R9C2 (the bridge) lie in the same box or region" and
  "các ô R8C3, R9C2 (cầu nối) nằm trong cùng một khối (hoặc vùng)".
- Unchanged and green: `pipeline` (the real specimen seed 128 and the shallow-fallback specimen still hold), `player`, `cache`, `worker`, `help`, `help-example-tools`; first-pass pins (G01,
  G05, G11, help counts) are those of `pass-1/evidence.md` section 5.

## 6. GH (30 examples)

`gh-check-all-before-refresh.txt`: the check of all 30 IDs on the final source, before any write, matches every example (30 of 30; the classic9 sources do not hold a
Jigsaw puzzle and the locale text is not stored in the examples). Nothing was regenerated; `gh-check-all.txt` is the final check (exit 0). The catalogue of the first pass is
unchanged (`twoStringKite` Hell 1 214 step 36, `simpleColouring` Nightmare 648 step 24, `hiddenTriple` step 34, `xWing` step 56).

## 7. Documents and other files changed (this round)

- Engine: `core/js/engine/tech-fish.js`. Tests: `core/tests/suites/tech-fish.test.js`, `generator/tests/suites/replay.test.js`, `generator/tests/suites/steps.test.js`.
- Locales (EN and VI, both apps): `technique.twoStringKite.desc` and `.step` ("in the same box (or region)", "trong cùng một khối (hoặc vùng)", the same placeholders).
- Generated fixtures: `generator/tests/fixtures/regression.js` (4 hashes), `generator/tests/fixtures/replay-goldens.js` (G06, G07).
- Guides and designs: `DEVELOPERGUIDE.md` and `.vn.md` (the bridge sentence, totals 3,651 and 1,897), `generator/design.md` (section 6.6: box-like unit, Jigsaw fires, structural
  maximum 729, E 18 of 520, G06 and G07, the tests row, totals), `player/design.md` (total 1,897). `USERGUIDE` unchanged (counts only).
- `docs/difficulty-v3/notes.md` (MS08b section: ruling (b), maxima, E, cost, the Player finding), `.github/scripts/generator-quick.json` (information only: 1,357, 1,897, seconds, provenance).
- Evidence and scratch: this folder (first pass in `pass-1/`, E pass 2a in `pass-2a/`, the first quick run of the round in `quick-run-1/`) and the scratch folders
  `generator/tests/artifacts/difficulty-v3/MS08b/` (new: `skyscraper-differential.js`, `fingerprint-now.js`, `check-format.cjs`, `jigsaw-counts.js`, `golden-jumps.js`,
  `explore-*.js`, `compare-g.js`, the mutation script with three new mutants, `structural-max.js` with box-like counting).

## 8. Named items

No new item. S-AV08 re-measured (303.4 s Generator, 38.1 s Player). Not an item: the Player test cost above (found and fixed within the round). The inherited S-AV01 to S-AV30 are open as
before.

## 9. IR72 A to J (changes of this round marked)

| | Item | Where |
|---|---|---|
| A1 | Design 6.6 states the proof, preconditions (**box-like owner counted over both kinds**), never-a-target, order, Finding fields; whole-line disjointness; the multi-grid boards named; **Jigsaw fires**; overlapped-box negatives (isolated, **box + region**, **real Samurai**) | `generator/design.md` 6.6 |
| A2, A3 | Vector, transpose and near misses against `referenceKites` (now box-like); **Jigsaw vector, transpose and four near misses, both orientations**; agreement field by field on classic9 (two seeds), 6, 4, 12, 16 digits, diagonalX, hyper, **the Jigsaw layout and its transpose (minimum 20 of 120, observed 28 and 31)**, the environment's own jigsaw9, the multi-grid boards | tech-fish.test.js (236) |
| B1, B2 | Registration, weight and tier unchanged; references with and without the kite identical to pass 1 (4 ratings, no level change) | `rated-effect.txt` |
| C1 to C4 | Limit, cadence, `null`, seam unchanged; structural maximum **recomputed for every variant (Jigsaw 0 to 729)**; pattern cost re-run; Jigsaw largest work 15 and 20 | `structural-max.txt`, `pattern-cost.txt`, `jigsaw-counts.txt` |
| D1 to D3 | Fixtures and lists unchanged; sweep fires 114 times | `core/tests/fixtures/techniques.js` |
| E1 to E3 | Locales EN and VI in both apps changed ("or region"); guides EN and VI, design, notes; totals 3,651 and 1,897 greped | section 7 |
| F1 | **20 kinds, 20 of 20 detected**, including box-only eligibility; superseded runs kept | `mutations.txt`, `mutations-1.txt`, `pass-1/` |
| G1 to G3 | **Complete E redone**: wires, analyses, hashes in order (twice: before and after the locale text, as the recorders' source includes the UI files); `CHANGED` lists inspected before writing; 14 to 18 hashes; admitting-unchanged keys listed (no Jigsaw key called excluded); `--update-hashes` as specified; first pass kept | section 4 |
| H1 | All 30 examples checked on the final source, none affected | section 6 |
| I1, I2 | Pins from recorded outputs, like for like | section 5 |
| J1 to J4 | Focused suites, **both complete quick sets on the final tree**, CI check; fingerprints compared; base commit and conventions stated; the first quick run (failed in the Player) kept; S-AV08 re-measured | section 3 |
