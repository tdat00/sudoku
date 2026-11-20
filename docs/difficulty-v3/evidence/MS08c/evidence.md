# MS08c evidence: Empty rectangle (restricted form)

Developer agent claude-sonnet-5.5, branch `rating-v3`, working tree not staged or committed. Base commit `398c832` ("difficulty-v3 MS08b: Two-String Kite"); no commit landed during the task (`git log` at the end: HEAD is still `398c832`, no stash).
Start 2026-11-15T20:40:50+07:00, end 2026-11-15T22:33+07:00.

**One question, asked before E.** The task leaves five points open (which units may carry the external pair, the Finding's arrays, the work unit, the first-pattern order, the wording). I stopped with a `QUESTION:` before recording E, with the defaults I had implemented.
The pack author (Astra, SA2) answered through the orchestrator (21:42): all five points and all four named conventions accepted, **no implemented behaviour changes**. The ruling is recorded in `generator/design.md` section 6.6, `notes.md` and section 1 below.
Convention followed where the task is silent: `tech-wing.js` and MS08b treat the kinds `box` and `region` alike, with the owners counted over both kinds (MS08b's ruling (b)).

Lock: every command that could take over about 10 s ran through `Invoke-Dv3Node` (verbatim helper `invoke-dv3node.ps1`, byte-equal to the check-list block), one command per lock, 16 s apart, E, mutation and quick groups as IR12 compounds
(admission 450 s, ceiling 540 s). Short probes (under about 10 s, named in section 3) were allowed to run unlocked, as the orchestrator permitted for the 0.8 s firing-rate sweep; pentomino shared the machine, and lock waits are in section 3 where they were recorded.

## 1. The technique (as it stands)

`emptyRectangle` (group `fish`, order 124, base cost 38, weight 380, unscoped, `assumesUniqueness: false`) in `core/js/engine/tech-fish.js` (SHA-256 `CCB4FAB7...5C1C`, frozen before E and unchanged at the end; `difficulty.js` `82A5C43C...1837`), weighted in
`generator/js/engine/difficulty.js` (`WEIGHTS.emptyRectangle = 380`, between `simpleColouring` 360 and `swordfish` 420; the Hard tier, the Expert-and-above floor and every other rule unchanged). Longest engine line 110.

- **Proof.** Digit *d*; a box-like unit *U* (complete, kind `box` or `region`, *d* not placed); its candidates split into a row arm (one row *r*) and a column arm (one column *c*), both nonempty, with no candidate at the intersection of *r* and *c*; every candidate has *U* as its
  only box-like owner (counted over both kinds), one complete row and one complete column (`findFish`'s candidate ownership; an overlapped box of a multi-grid board gives nothing); an external conjugate pair *p*, *q*: **any complete unit** with no placed *d* and exactly two
  candidates (found with `findStrongLinks`), both outside *U*. If *p* sees every cell of the arm *A*, then *p* is *d* (so *d* leaves *A* and the other arm *B* holds it) or *q* is *d*: *d* leaves every cell that sees every cell of *B* and sees *q* (real peers). A candidate of *U*, *p* and *q* are never targets.
- **Finding.** `{ technique: 'emptyRectangle', cells (the candidates of the box and the two ends, ascending), placements: [], eliminations (ascending), i18nKey: 'technique.emptyRectangle.step', i18nArgs: { digit, box (label), lines (row and column of the arms, in unit order), ends (the pair, in cell order) } }`.
  The arrays are **not positional encodings** of *A*/*B* or *p*/*q* (SA2 point 2); the roles are explicit only in the independent enumeration `referenceRectangles` of the tests. No field or placeholder was added.
- **Order (documented, not reordered to force a witness, SA2 point 4).** Digits, then boxes in unit order, then pair units in unit order, then the one or two rectangles of the box in (row, column) unit order, then the row arm and the column arm as *A*, then the lower and the higher end as *p*.
  The bare vector (seven cells: digit 5, box 1, arms {R2C1, R2C3} and {R1C2, R3C2}, the pair of column C5) holds two rectangles; its first removal is R2C5 (the pair of R7), pinned as such; the vector with a decoy 5 at R7C9, and its transpose, prove the intended R7C2 witness.
- **Work (R10, SA2 point 3).** One unit is one tested `(digit, box with at least one rectangle, conjugate unit)` combination, counted before the rejection checks (the ends inside the box, the arms, the visibility). It holds at most **eight trials** (two rectangles of the box x two choices of *A* x two choices of *p*);
  it is not a count of individual targets or visibility tests. Limit 50,000 per call (`SG.fishSearch.EMPTY_RECTANGLE_WORK_LIMIT`), local counter, the parent budget at entry and before the unit that would carry the work over 256 units; a spent limit is `null` with `capHit: 'work'`, a spent budget is "nothing found",
  cancellation and every other error propagate; the observer record is `{ id, work, limit, capHit, retained: null }`; the unregistered seam is `SG.fishSearch.emptyRectangle(model, state, ctx, { workLimit })`.
- **Structural maximum** (`structural-max.txt`, `structural-max-er.js`, units per call against 50,000): classic4 192; classic6 648; classic9, jigsaw9, killer, greaterThan and wordoku 2,187; diagonalX 2,349; hyper 2,511; 12 digits 5,184; 16 digits 12,288; flower 14,580 (12 of 45 boxes eligible);
  sohei 27,216 (28 of 36); butterfly 3,888 (4 of 36); **samurai 44,955 (the largest, 90 % of the limit; 37 of 45 boxes)**. At eight units per combination the Samurai would be 359,640, which is why the unit is the combination. The limit binds on no board; it was not adjusted.
- **Pattern cost** (`pattern-cost.txt`/`.json`, `--ids=emptyRectangle --runs=20`, 5 cases, 100 finds, none capped): positives 22 and 63, negatives 102, 46 and 20 of 50,000 units. The census over the agreement populations (`work-census.txt`): the largest work of any call is 313 (the Samurai), 82 to 96 on classic9.
- **Skyscraper and kite unchanged** (`fish-differential.txt`, and `fish-differential-final.txt` on the final tree under the lock): the two of the base commit and of the tree give the same Finding and observer record on 2,336 states, also under the limits 0, 1 and 3: 18,688 lines, `cddcba22...9d22`, IDENTICAL.

## 2. Tests, soundness and mutations

- `core/tests/suites/tech-fish.test.js` (236 to **317**, +81; in the Generator and in the Player, 10.2 s and 10.0 s). `referenceRectangles` and `removingRectangles` enumerate independently from `model.units`, `cellUnits`, `unitMeta` and `peers`, with explicit A/B and p/q roles; `buildGridModel` got the option `reverseRows`.
  Describes: **geometry** (the vector and its transpose, the bare vector with its two rectangles, four geometries around box 5, single-cell arms, ten near misses each as listed and transposed, the pointing neighbour, complete units, a placed digit, single owners, an overlapped box, the unit order, determinism after another call, immutability);
  **real positions** (two positives, three negatives, the transposed positions, the general-rectangle negative); **work, budget and cancellation** (the flood of a 16-digit board of 2,304 units, the exact check positions 0 to 2,048, stale marks, the seam, the observer, a Latin square costs no work);
  **a region as the box, and the ownership on multi-grid boards** (the vector through region J5 of the Generator's jigsaw layout and its transpose, the 4 x 4 regions board, the Samurai: a rectangle in the unshared box G1-B1, nothing in the shared G1-B9);
  **agreement with the independent enumeration, field by field**, on classic9 (400 states each of seeds 777 and 99, at least 100 firings each), classic6 (400, at least 100), classic4 (300, at least 10), 12 and 16 digits (at least 20 and 10), diagonalX and hyper (120 states, at least 30), the Generator's jigsaw layout and its transpose (120 states, at least 40, and soundness against the solution),
  the environment's own `jigsaw9` (agreement only: the Player's layout differs) and the four multi-grid boards (minima 3, 4, 1 and 3).
- Fixtures (`core/tests/fixtures/techniques.js`): `REGISTRY_ORDER` has 26 entries, `BELOW_ER` and `THROUGH_ER` are new, `emptyRectangle` is in `BELOW_CHAINS`; `CURRENT.emptyRectangle` has two real positives (`ER_RATED` = `constructed-nightmare-2`: digit 5, box 7, 5@R9C4; `ER_SEEDED`, seed 99 state 512: digit 6, box 1, 6@R7C1)
  and three negatives (nothing left once the techniques through it are exhausted; `ER_GENERAL`, a candidate at the intersection; `KITE_ONLY`, a genuine kite); `SUPPLEMENTS.emptyRectangle` has three positions (the third is `ER_SPARE`, digit 1, box 8). The generic seeded sweep and `minFirings` are unchanged (it fires in 144 of 300 states of seed 20260101).
  `techniques.test.js` counts 26 classic and 31 registered; `technique-weights.test.js` (8 to 9) places order 124 and weight 380 between `simpleColouring` and `swordfish`, Hard-tier; `generator/tests/manual/difficulty.test.js` has the weight and the first technique of Hard (evaluated by `manual-difficulty-pure.txt`, all three assertions true; the suite is not run, IR70).
- **Mutations** (`mutations.txt`, final tests, 268.4 s in one locked compound, no lock wait): **27 of 27 detected**, each on all 317 tests: a box candidate as a target (10 failing), the end *p* as a target (3), the general rectangle accepted (18), a third-line candidate accepted (13), a target seeing only the first cell of *B* (18), *p* seeing only the first cell of *A* (15),
  a target seeing *p* instead of *q* (47), the ownership rule dropped (3), an overlapped box as a box (3), the budget checked one unit early (3), cancellation swallowed (3), the limit off by one (7), the lines listed row first (1), the ends listed *p* first (13), unsorted cells (12), the cells without the pair (24), an incomplete unit accepted (5),
  the wrong anchor (11), an end inside the box accepted (4), only the first rectangle (27), only the row arm as *A* (21), only the lower end as *p* (14), a box that already holds the digit (1), stale marks (16), no work counted (8), **box-only eligibility** (14) and the second rectangle named first (1).
  Superseded and kept: `mutations-a.txt` (mutations 0 to 13 on the 316 tests, 13 of 14 detected) and `mutations-b.txt` (14 to 26, 12 of 13): the two misses, the lines order and the rectangle order, led to the unit-order test (316 to 317); both are detected in the final run.
- Focused gate (`generator-focused-final.txt`): `tech-fish` 317, `techniques` 213, `technique-weights` 9, `difficulty-floor` 48 = **587 of 587**. Player (`player-focused-final.txt`): `help`, `play`, `i18n`, `help-example-tools`, `tech-fish`, `techniques` = **742 of 742**
  (`player-focused-1.txt`, kept, had one failure: the `help-example-tools` source step of `hiddenSingleBox`, 58 to 50, fixed in section 5).

## 3. Commands

| Command | Exit | Counts | Seconds (lock wait) |
|---|---|---|---|
| `--suite=tech-fish` and the gate before E, Generator and Player | 0 | 317 (+ techniques 213, weights 9, floor 48) | about 10 / 40 (not recorded) |
| `structural-max-er.js` (`structural-max.txt`) | 0 | 15 variants | 0.2 (under 10 s) |
| `sweep-firings-er.js` (firing rate of random states) | 0 | 144 of 300 | 0.8 (unlocked, sub-second, announced) |
| `pattern-cost.js --ids=emptyRectangle --runs=20` | 0 | 5 cases, 100 finds, none capped | 0.54 (under 10 s) |
| `rated-effect.js` (26 references) | 0 | 2 ratings change, 0 levels | 0.68 (under 10 s) |
| `work-census.js` | 0 | 17 populations, largest 313 | 5.1 (under 10 s) |
| `fish-differential.js` (first run, `fish-differential.txt`) | 0 | 18,688 lines identical | 10.4 (not recorded) |
| **E** wires: one IR12 compound of 5 shards (`shard-runs.jsonl`) | 0 | 5 keys | 41.6 node seconds (not recorded) |
| **E** analyses: one compound of 14 shards | 0 | 14 keys | 62.0 node seconds (not recorded) |
| **E** hashes: one compound of 104 shards (`hashes-runner-console.txt`) | 0 | 520 keys | 303.3 (none: 303.4 wall) |
| merge-checks before and after each write (`*-check-*.txt`, `*-write.txt`, `hash-update.txt`, `hash-check.txt`) | 0 | up to date; all 520 unchanged | 0.4 to 0.5 each (under 10 s) |
| `--suite=replay,steps,player,pipeline,cache,worker` after the E fixtures (`pins-1.txt`) | 1 | 669 of 681: 12 pins | 138.7 (not recorded) |
| `--suite=replay,steps,player` (`pins-2.txt`) | 1 | 279 of 280: 1 pin | 55.3 (not recorded) |
| `--suite=steps` (`pins-3.txt`) | 0 | 57 of 57 | 16.4 (not recorded) |
| `pin-facts.js` (`pin-facts.txt`) | 0 | the new golden facts | 15.3 (not recorded) |
| GH: `make-technique-examples.js` checks and writes (`gh-*.txt`) | 0 or 1 as listed | 31 of 31 match at the end | 0.1 to 1.6 each (under 10 s, run under the lock) |
| `run-mutations.cjs`, all 27 (`mutations.txt`) | 0 | 27 of 27 | 268.5 (none) |
| `manual-difficulty-pure.js` | 0 | three assertions true | 0.18 (unlocked, sub-second) |
| gate suites, final (`generator-focused-final.txt`) | 0 | 587 of 587 | 40.3 (none) |
| Player focused suites, final (`player-focused-final.txt`) | 0 | 742 of 742 | 20.0 (none) |
| **Final** Generator quick, groups `shared-small` / `own-suites` / `pipeline` / `replay-player` (`quick-final/`) | 0 | 1,766 / 1,756 / 151 / 69 = **3,742** (core-shared 1,447, steps 57, replay 154, mega 108, own-fast 1,681, digger-target 75, pipeline 151, player 69) | 76.5 / 174.3 / 32.6 / 24.9 (none) |
| **Final** Player quick (`quick-final/player-quick.json`) | 0 | **1,987 of 1,987** (30 suites) | 39.9 (none) |
| `generator-suites.sh check` (`quick-final/ci-check.txt`, after the manifest edit) | 0 | 3,742 and 1,987 tests, every test in one shard, every job in its limit | 4.1 (unlocked) |
| `fish-differential.js` on the final tree (`fish-differential-final.txt`) | 0 | 18,688 lines identical | 10.2 (none) |
| `fingerprint-now.js` (`fingerprints-final.txt`) | 0 | both fingerprints | 0.4 (unlocked) |

**Quick cost (S-AV08 re-measured):** Generator **308.4 s** (the sum of the four group commands, 308.363; 303.4 s at MS08b, +1.6 % for +2.5 % tests), Player **39.9 s** (39.903; 38.1 s at MS08b, +4.7 % for +4.7 % tests; the runner body is 39.2 s). The shard seconds of the manifest are the group runner's per-shard process
seconds (32.1, 16.4, 15.9, 10.7, 171.2, 1.9, 32.0 and 24.3 s) and the Player's runner time (39.5 s); the projections are unchanged (no suite or shard was added).
**Conventions:** group walls are the `Invoke-Dv3Node` command seconds (without the lock wait); the manifest's shard values are the group runner's per-shard process seconds; the Player's figure is its command time, the manifest's its runner total; compound projections are 2 x the measurement of the same shard in
MS08b's final `shard-runs.jsonl` + 5 s, at least the 60 s floor (123 shards, **all within their projection**).
**Final fingerprints** (`fingerprint-now.js`): Generator `df8dd52e335cb290...`, Player `d62ec0298edee642...`, equal to the `sourceHash` of the eight Generator results and of the Player result in `quick-final/` (all `complete` and `sourceStable`), and unchanged after the last edits of `.github/`, `notes.md` and this folder (rechecked at the end).

## 4. E (complete: five wires, fourteen analyses, 520 hashes; order wires, analyses, hashes; IR12 compounds)

The engine bytes were frozen first (`tech-fish.js` `CCB4FAB7...`, `difficulty.js` `82A5C43C...`; the locales were final, because the wire and analysis recorders also hash the UI files). E was recorded **once** on the final source: wires 21:45, analyses 21:47 and hashes 21:48 to 21:54; nothing byte-relevant changed afterwards
(the fingerprints of section 3 equal the quick results), so G3 holds without a second recording. The `CHANGED` lists were inspected before anything was written.

- **Wires (GR)**, `wire-check-before-write.txt`: G10 and G13 unchanged; **G09** differs in 3 fields, the counters of its local search (`work[4].ratings` 318 to 346, `localSearches[0].ratings` and `shallowRatings` 50 to 78); **G11** (795 fields) and **G12** (631 fields) are **other puzzles** (Greater-Than Expert 42 and Hard 3,115,968,914: the rating on the digging path takes a rectangle, so the dig differs).
  Written with `replay-wire.js --merge ... --write` (`wire-write.txt`); `wire-check-after-write.txt` and `wire-check-after-analysis.txt`: all five match.
- **Analyses (GR)**, `analysis-check-before-write.txt`: **G07** (21 fields: Jigsaw Nightmare 3,962,167,687, 33 details instead of 34, the final score 2,310 instead of 2,391, the jump at deduction 33 of 74, its removal 4@R5C6 instead of 2@R5C6), **G11** (161 fields: 8 compact and 110 details, final 963 instead of 994, the jump to 549 now a Skyscraper step at position 100),
  **G12** (156 fields: 7 compact and 111 details, final 647 instead of 594, the jump 513, and the hardest technique is now `emptyRectangle` at 134) and **G14** (15 fields: the jump 1,646 to 1,685 at deduction 85 of 147 and two later rows, 3,674 to 3,663 and a step gain of 2,746 to 2,757; the final score 6,470 is unchanged). G01 to G06, G08 to G10 and G13 match, so the example of the Generation Steps guides (G01) is unchanged.
  Written with `replay-goldens.js --merge ... --write` (`analysis-write.txt`); `analysis-check-after-write.txt`: all 14 match.
- **Hashes (GG)**, `hash-check-before-write.txt`: **29 of 520 changed**; `node tests\perf.js --hash-merge=... --update-hashes` (`hash-update.txt`) wrote them, `hash-check.txt` is "all 520 puzzles unchanged, recorded from the current sources".

| Cell | Seeds changed |
|---|---|
| classic9/hard | 4,181 |
| classic9/expert | 8, 610, 1,597, 10,946 |
| classic9/master | 13 |
| classic9/nightmare | 13, 55 |
| diagonalX/nightmare | 3, 5, 21, 34, 55, 89, 144, 987, 10,946 |
| hyper/hard | 2 |
| jigsaw9/master | 1, 3, 5, 34, 55, 144, 233, 610, 987, 10,946 |
| greaterThan/hard | 34 |

  - Mechanism (G2): the generation-source diff is the technique, its registration and its weight (and the locale text, which the recorders hash; the helpers shared with the skyscraper and the kite are unchanged, identical on 2,336 states); every changed key's level admits the technique (Hard and above) and **no key below Hard changed** (the 16 cells below Hard are identical).
  - Admitting but unchanged: `classic6/hard` (20 of 20), `killer/hard` (20 of 20), 19 of the 20 `greaterThan/hard` seeds, and the other seeds of the changed cells (20 seeds per cell; the ten cells of Hard and above hold 200 keys, 29 of them changed).
- **References** (`rated-effect.txt`): the 26 labelled puzzles keep every level and every `v3Expected` entry; two ratings change (`platinum-blonde` 5,676 to 5,665, `constructed-nightmare-2` 2,661 to 2,637, one rectangle step each), `golden-nugget` uses it once at the same score 5,689.

## 5. Pins that followed (each from a recorded output, like for like; nothing removed, skipped or loosened)

Values are read from the new goldens (`pin-facts.txt`, `golden-facts.js`); the 12 failures of `pins-1.txt` and the one of `pins-2.txt` are the list below; `pins-3.txt` is green.

| File | Pin | Before | After |
|---|---|---|---|
| `generator/tests/suites/replay.test.js` | jump counts of the 14 goldens (compact / details / distinct transitions) | 13 / 16 / 20 | 13 / 14 / 18 |
| | G11 jump end position | 111 (change -4) | 100 (133 to 549; details 553 to 549, change -4) |
| | G12 jump end position | 103 (change -4) | 107 (133 to 513; details 2488 to 513, change -1975) |
| | flat or lower new peak, G11 position | 104: 1964 to 1264, `wWing` from `forcingChain` | 104: 2876 to 1081, `xyWing` from `nishio` |
| | G11 details sign jumps | signs 7, 43, 75 and 6 | signs 67 and 5 |
| `generator/tests/suites/steps.test.js` | jump counts | 13 / 16 | 13 / 14 |
| | position 104 values | 1964 to 1264 | 2876 to 1081, total '1,081 (-1,795)', XY-Wing weight 650 |
| | multi-move positions | G11 111, G12 103 | G11 100, G12 107 |
| | sign callout `third('G11', 103, 'details')` | the old sign | "After the sign between R1C5 and R1C4 is removed, " |
| `generator/tests/suites/player.test.js` | compact fold specimen | G11 old step | G11 step 6 (reveal, peak 2,876, 'the score reached 2,876'); plain specimen G12 step 2 peak 133 (was 130) |
| | details sign-jump specimen | step 111, sign 6, `seek(112)` | step 104, sign 5, `SIGN_JUMPS` {67:67, 104:5}, `seek(105)` |
| | total jumps | 29 | 27 |
| `player/tests/suites/help-example-tools.test.js` | `hiddenSingleBox` source step | 58 | 50 |
| `player/tests/suites/help.test.js` | catalogue size | 30 | 31 |

Unchanged and green: `pipeline` (151; its real specimen of a shallow fallback still holds), `cache`, `worker`, `help`, `i18n`, `play`, the manual contracts. `rated.js` is unchanged (no level or `v3Expected` changed).

## 6. GH (31 examples)

- `gh-check-all-before-refresh.txt`: all 31 IDs checked first: `emptyRectangle` has no saved example (exit 1, as expected); `gh-check-30-before-refresh.txt` (the 30 existing IDs): `skyscraper` no longer yields an example in its old source (Hell 1 214 now needs a rectangle first), and `hiddenSingleBox`, `hiddenTriple` and `twoStringKite` differ (only the number of hints applied before their hint).
- **New `emptyRectangle`**: the sources of the brief's order (`player/tests/artifacts/difficulty-v3/MS08c/sources.json`; existing sources that reach an ER hint are Nightmare 1156, 692, 828 and Hell 1 214; `gh-check-er-existing-sources.txt`, `gh-write-er.txt`, at most 8 puzzles and 400 hints): the tool's pick (the easiest to read) is Classic 9 Hell 1 seed 214, step 23: digit 8, box B5, lines R6 and C4, the pair R6C7 and R7C7.
- **`skyscraper`** is made again from another real source of the catalogue (`sources-skyscraper.json`, 8 replayed candidates: Nightmare 648, 3, 1156, 75, 44, 13, 561 and Hard 18; `gh-check-skyscraper-existing-sources.txt`, `gh-write-skyscraper.txt`): the tool's pick is Hard seed 18, step 26.
- `hiddenSingleBox` (Nightmare 1156, step 58 to 50), `hiddenTriple` (Nightmare 692, 34 to 31) and `twoStringKite` (Hell 1 214, 36 to 37) were regenerated from their own sources (`gh-write-own-sources.txt`).
- Final `--check` of all 31 (`gh-check-all.txt`): **31 of 31 match**, exit 0. No snapshot was fabricated; the locales of the example text are not stored in the examples.

## 7. Documents and other files changed

- Engine: `core/js/engine/tech-fish.js`, `generator/js/engine/difficulty.js` (the weight). Tests and fixtures: `core/tests/suites/tech-fish.test.js`, `core/tests/suites/techniques.test.js`, `core/tests/fixtures/techniques.js`, `generator/tests/suites/technique-weights.test.js`, `generator/tests/manual/difficulty.test.js`,
  `generator/tests/suites/replay.test.js`, `steps.test.js`, `player.test.js`, `player/tests/suites/help.test.js`, `help-example-tools.test.js`.
- Locales (EN and VI, both apps): `technique.emptyRectangle` name, desc and step (the VI name "Empty Rectangle (hình chữ nhật rỗng)", the same placeholders `digit`, `box`, `lines`, `ends`).
- Generated fixtures: `generator/tests/fixtures/regression.js` (29 hashes), `replay-wire.js` (G09, G11, G12), `replay-goldens.js` (G07, G11, G12, G14), `player/js/ui/help-examples.js` (31 examples).
- Guides and designs: `generator/design.md` (section 6.6 with the SA2 clarifications and the work-unit definition, the technique table and the Hard tier, the tree line, the tests rows, 31 techniques / 26 classic, total 3,742), `player/design.md` (the MS08c catalogue paragraph, 31 and 1,987), `DEVELOPERGUIDE.md` and `.vn.md`
  (the work-unit and ownership paragraph, the SUPPLEMENTS and pattern-cost lists, the totals 3,742 and 1,987), `USERGUIDE.md` and `.vn.md` (31 techniques, 26 human).
- `docs/difficulty-v3/notes.md` (MS08c section), `.github/scripts/generator-quick.json` (information only: counts, seconds, provenance).
- Grep for the old numbers before the final quick run: `3,651|1,897|30 techniques|25 classic|30 examples|each of the 30` over the designs, the guides, `README.md`, `AGENTS.md` and `docs/architecture.md` finds only MS08b's own historical paragraph in `player/design.md`.
- Evidence and scratch: this folder and `generator/tests/artifacts/difficulty-v3/MS08c/`, `player/tests/artifacts/difficulty-v3/MS08c/` (the drivers `run-shards.cjs`, `make-plans.cjs`, `run-hashes.ps1`, `run-quick.ps1`, `tee-run.cjs`, `ci-check.cjs`, `mutations.cjs`, `run-mutations.cjs`, `mutant-run.cjs`, the probes and the GH sources). Intermediates kept as superseded runs: `mutations-a.txt`, `mutations-b.txt`, `player-focused-1.txt`, `pins-1.txt`, `pins-2.txt`.

## 8. Named items

No new item. S-AV08 re-measured (308.4 s Generator, 39.9 s Player). The inherited S-AV01 to S-AV30 are open as before. Not run: the manual `difficulty` suite (its two pure assertions are evaluated by `manual-difficulty-pure.js`, IR70), qualification and soak.

## 9. IR72 A to J

| | Item | Where |
|---|---|---|
| A1 | Design 6.6 states the proof and every precondition (complete box-like unit, **candidate ownership as `findFish`, counted over both kinds**, empty intersection, any complete unit as the pair, scope unscoped, no uniqueness), what is never a target, the order, each Finding field with its order and that the arrays are not positional encodings, the multi-grid boards (Samurai 37 of 45 boxes, Sohei 28 of 36, Flower 12 of 45, Butterfly 4 of 36), the work unit (eight trials); multi-grid ownership negative on the real Samurai (G1-B1 positive, shared G1-B9 nothing) and on an overlapped box | `generator/design.md` 6.6; `tech-fish.test.js` (region and multi-grid describe, ownership tests) |
| A2 | The brief's vector and its transpose (and the bare vector with its two rectangles, the decoy variant and its transpose), ten near misses in both orientations, the pointing and kite neighbours, determinism after another call, immutability, all against `referenceRectangles` (built only from `model.units`, `cellUnits`, `unitMeta`, `peers`) | `tech-fish.test.js` geometry describe |
| A3 | Field-by-field agreement (digit, cells, eliminations, box, lines, ends) on classic9 (seeds 777 and 99), classic6, classic4, 12 and 16 digits, diagonalX, hyper, the jigsaw layout and its transpose, the environment's jigsaw9 and the four multi-grid boards, each with a minimum of firings | `tech-fish.test.js` agreement describe |
| B1 | Registered at order 124, group `fish`, base cost 38, weight 380, unscoped, `assumesUniqueness: false`; the technique-weights test covers the placement between `simpleColouring` and `swordfish`, the hardest-technique choice, the allowed, tier and floor sets | `technique-weights.test.js`; `manual-difficulty-pure.txt` |
| B2 | No relabelling: 26 references with and without the technique, 2 ratings change, 0 levels, all match `v3Expected` | `rated-effect.txt` |
| C1 | Unit stated (a `(digit, box, conjugate unit)` combination, up to eight trials, SA2 point 3); 50,000 per call; local counter; parent budget at entry and at most 256 units between checks, exact check positions 0 to 2,048 pinned | `tech-fish.test.js` work describe; design 6.6 |
| C2, C3 | A spent limit is `null` with `capHit: 'work'`; a spent budget is nothing found with `capHit: null`; cancellation and other errors propagate with no record; record `{ id, work, limit, capHit, retained }`; the seam floors, defaults and rejects invalid limits with `solver.invalidOption`; no unbounded mode | same describe |
| C4 | Structural maximum for every variant (largest Samurai 44,955, 90 %); `pattern-cost.js --ids=emptyRectangle --runs=20`; no wall-time assertion; the limit was not adjusted | `structural-max.txt`, `pattern-cost.txt`/`.json`, `work-census.txt` |
| D1 | Two real positives with exact Findings (checked against the solution, the reduced state completes, explicit `after` copies) and three negatives; `historyV2`, `LADDER` and the v2 positions untouched | `core/tests/fixtures/techniques.js` |
| D2 | The generic seeded sweep and `minFirings` unchanged; `SUPPLEMENTS.emptyRectangle` adds three real positions | same |
| D3 | `REGISTRY_ORDER` (26 entries), `BELOW_ER`, `THROUGH_ER`, `BELOW_CHAINS`, and the lists of `techniques.test.js` | `techniques.js`, `techniques.test.js` |
| E1 | Locales EN and VI in both apps: name, description and step with the same placeholders (the technique has no subtype key); the VI name follows its group's style (SA2 point 5) | four locale files |
| E2 | Guides EN and VI, design 6.6 with the tables, tiers and file tree, the Player design's catalogue note, the user guides' counts, the `notes.md` MS08c section with every output difference and its cause | section 7; `notes.md` |
| E3 | Totals 3,742 and 1,987, 31 techniques and 31 examples greped for the old numbers before the final quick run (only MS08b's historical paragraph remains) | section 7 |
| F1 | Twenty-seven in-memory mutations, one per precondition and limit rule, including MS08a's ten kinds adapted (a pattern cell as a target, the neighbouring pattern accepted, partial visibility, the ownership rule dropped, the budget early, cancellation swallowed, the limit off by one, unsorted output, an incomplete unit, the wrong anchor); **27 of 27 detected**, failing tests recorded, superseded runs kept | `mutations.txt`, `mutations-a.txt`, `mutations-b.txt` |
| G1 | Complete E in the order wires, analyses, hashes: 5 wires, 14 analyses, 520 hashes in 104 shards of 5, IR12 compounds with projections and bases (all within) | section 4; `shard-runs.jsonl` |
| G2 | Merge-checks before writing, `CHANGED` lists kept and inspected; the mechanism for every changed key; no key below Hard changed; the admitting-unchanged keys listed; written from the merged ledgers with `--update-hashes` | section 4 |
| G3 | The engine bytes were frozen before E and are unchanged at the end; the three merge-checks pass "recorded from the current sources" with no diff after writing; no second recording was needed | section 4 |
| H1 | `--check` on all existing IDs first (differences recorded), the new ID's source from the brief's order (at most 8 puzzles, 400 hints), every affected ID refreshed from its own source or another real source with candidates and choice recorded, final `--check` of all 31 | section 6 |
| I1, I2 | The task's files only; pins from recorded outputs, like for like, with before and after values, no test or matcher removed, skipped or loosened | section 5 |
| J1 | Focused suites in both apps, both complete quick sets on the final tree, the CI check, one locked command per payload within 540 s, at least 15 s between locks | sections 2 and 3 |
| J2 | After the final quick sets only `.github/`, `notes.md` and this folder were edited; the final results' fingerprints equal the tree's | section 3 |
| J3 | Base commit `398c832`, no commit landed; timing conventions stated | header, section 3 |
| J4 | Performance and availability numbers are S-AV08's re-measurement, not stops; no correctness failure, no change of a recorded decision (the only question was answered with no change) | section 8 |
