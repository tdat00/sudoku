# MS09a evidence: Finned X-Wing, sashimi included

Developer agent claude-sonnet-5.5, branch `rating-v3`, working tree not staged or committed. Base commit `eecc372` ("difficulty-v3 MS08c: Empty Rectangle"). **One commit landed during the task**: `5acff75` ("difficulty-v3: MS09b pack note (n=3 finned fish work limit)", 2026-11-15 23:34:29 +0700), which changes only
`tasks/difficulty-v3/MS09b-finned-swordfish.md` (the orchestrator's pack note, outside both fingerprints); HEAD is `5acff75` at the end, no stash. None of my files were committed.
Start 2026-11-15T22:36:31+07:00, end 2026-11-16T00:50:52+07:00.

**One question, asked before E.** The task leaves eight points open (Q1 base/cover units and the fin box, Q2 the sashimi definition, Q3 the target rule, Q4 the Finding and the order, Q5 the work unit and limit, Q6 the weight's placement, Q7 the EN/VI wording, Q8 the n = 3 seam). I stopped with a `QUESTION:` (about 23:10) with the defaults I had implemented.
The pack author (Astra, SA2) answered through the orchestrator (23:22): **Q1 to Q6 and Q8 accepted as implemented, Q7 with two wording changes ("one box or region" / "một khối hoặc vùng", and the final step sentence), Q2 with one comment correction**; the finder's behaviour did not change. The ruling is recorded in `generator/design.md` section 6.6, `notes.md` and section 1 below.
Conventions followed where the task is silent: box-like units are `kind 'box'` or `'region'` with the owners counted over both kinds (MS08b's ruling (b)); candidate ownership is `findFish`'s for every base candidate, fins included (IR72 A1); the engine's own R10 work policy (strict 256-unit cadence as the skyscraper).

Lock: every command that could take over about 10 s ran through `Invoke-Dv3Node` (verbatim helper `invoke-dv3node.ps1`, byte-equal to the check-list block plus a final CRLF), one command per lock, at least 15 s apart, never held across commands, 540 s cap; E, mutation and quick groups as IR12 compounds (admission 450 s).
Every locked command, with its asked and finished time, node seconds and lock wait, is in `lock-log.jsonl` (81 commands; the wrapper `run-locked.ps1` writes it, wait = total minus node seconds). Probes under about 10 s also ran under the helper. Pentomino shared the machine; the waits are in section 3.

## 1. The technique (as it stands)

`finnedXWing` (group `fish`, order 126, base cost 40, weight 400, unscoped, `assumesUniqueness: false`) in `core/js/engine/tech-fish.js` (SHA-256 `3480EAC3...28FDAF`, frozen before E and unchanged at the end; `difficulty.js` `D33598A5...3904`), weighted in
`generator/js/engine/difficulty.js` (`WEIGHTS.finnedXWing = 400`, between `emptyRectangle` 380 and `swordfish` 420; the Hard tier, the Expert-and-above floor and every other rule unchanged). Longest engine line 110.

- **Proof.** Digit *d*; two base lines (complete rows, or columns, without a placed *d*, at least two candidates) and two covers (complete lines of the other kind). A base candidate on a cover is a *body cell*, one on neither a *fin*. Every base candidate keeps `findFish`'s ownership (its base line is the only line of its kind that holds it, it has exactly one cover line), every base line has a body cell (a
  line of fins only is a box/line reduction, `boxLine`), there is at least one fin (no fin is an ordinary X-Wing, `xWing`), and all fins lie in one single-owner box-like unit (`box` or `region`; an overlapped box of a multi-grid board gives nothing; a board without a complete box-like unit has no pattern and costs no work). Targets: open cover cells that can still be *d*, outside both base lines,
  that see **every fin** by real peers; body cells and fins are never targets. If a fin is *d*, every target sees it; if no fin is *d*, the *d* of each base line is a body cell, the two lie on different covers, so both covers hold their *d* in the base lines and no target is *d*. **Sashimi** is not a flag, id or key: at n = 2 one body cell in a base line is the missing-corner form (SA2's wording of the comment).
- **Finding.** `{ technique: 'finnedXWing', cells (every base candidate, ascending), placements: [], eliminations (ascending), i18nKey: 'technique.finnedXWing.step', i18nArgs: { digit, bases (unit order), covers (unit order), fins (cell order) } }`; the arrays are the call's own. Order: digit, rows then columns, base pairs in line order, cover pairs in unit order, the first removing pattern wins (documented, not changed to put a
  witness first: the bare six-cell vector holds a second, columns reading and the row reading comes first; the decoy R9C2 and the transpose pin the intended witness).
- **Work (R10).** One unit is one tested combination of two base lines, counted before the rejection checks; at most one trial per pair of covers inside it (6, 15, 36, 66, 120, 153), not a count of cover tests or of targets. 50,000 per call (`SG.fishSearch.FINNED_X_WING_WORK_LIMIT`), local counter, the parent budget at entry and with at most 256 units between checks, a spent limit is `null` with `capHit: 'work'`, a spent budget is nothing found,
  cancellation and other errors propagate, observer `{ id, work, limit, capHit, retained: null }`; seams `SG.fishSearch.finnedXWing` and `SG.fishSearch.finnedFish(model, state, ctx, { size: 2 | 3, workLimit })` (n = 3, id `finnedSwordfish`, is **not registered**).
- **Structural maximum** (`structural-max.txt`), units per call: 48 (4×4), 180 (6×6), 648 (every 9×9 board), 1,584 (12 digits), 3,840 (16 digits), 11,340 (Sohei, Butterfly), 17,820 (Samurai, Flower: the largest, 36 % of the limit). **Pattern cost** (`pattern-cost.txt`/`.json`, 20 runs): 66 and 131 units (positives), 92, 196 and 216 (negatives), none capped. **Work census** (`work-census.txt`): the largest work of any call on the sampled
  states is 1,901 (Samurai), 310 to 334 on classic9. The limit was not adjusted.

## 2. Tests, soundness and mutations

- `core/tests/suites/tech-fish.test.js` (317 to **395**, +78; 17 s in the Generator and in the Player, about 10 s at MS08c). `referenceFinned`, `removingFinned` and `finnedTablesOf` enumerate independently from `model.units`, `cellUnits`, `unitMeta` and `peers` (every pair of base lines and of covers, also every complete line as a cover); `buildGridModel` got the option `extraCols`.
  Describes: **geometry** (the vector and its transpose, the bare vector with its two readings, the sashimi as listed and transposed, two fins of one line, fins of two lines, seven near misses each in both orientations, the line of fins left to `boxLine` and the ordinary X-Wing to `xWing`, incomplete base lines/covers/fin boxes and an extra column, an overlapped box, a Latin square without boxes, determinism, immutability);
  **real positions** (two positives, three negatives, the transposed positions); **work, budget and cancellation** (blank boards of 648, 48 and 3,840 units, the exact check positions 0, 256, ... 3,584, stale marks, the seam, the observer, a Latin square costs no work); **a region as the fin box, and the ownership on multi-grid boards** (the vector through region J4 of the Generator's jigsaw layout and its transpose, the Samurai: a fin in the unshared box G1-B6, nothing in a shared box);
  **agreement with the independent enumeration, field by field** (classic9 seeds 777 and 99, classic6, classic4, 12 and 16 digits, diagonalX, hyper, the jigsaw layout and its transpose, the environment's own `jigsaw9`, the four multi-grid boards; minima 3, 3, 0 and 2 for the Samurai, Sohei, Butterfly and Flower: **the Butterfly held no finned X-Wing in 300 sampled states**, `agreement-counts-butterfly.txt`); and the **shared enumeration at n = 3** (the same pattern at size 2 as the registered finder, a finned Swordfish vector, agreement on classic9/6/4, and the explicit assertion that `finnedSwordfish` is not registered).
- Fixtures (`core/tests/fixtures/techniques.js`): `REGISTRY_ORDER` has 27 entries, `BELOW_FIN` and `THROUGH_FIN` are new, `finnedXWing` is in `BELOW_CHAINS`; `CURRENT.finnedXWing` has two real positives (`FIN_RATED`, a constructed puzzle: digit 2, rows R5 and R8, covers C1 and C5, the fin R8C6, 2@R7C5; `FIN_SASHIMI`, a seeded dug puzzle: digit 5, columns C1 and C7, covers R1 and R9, the fins R2C1 and R3C1, 5@R1C3)
  and three negatives (nothing left once the techniques through it are exhausted; `FIN_ORDINARY`, a genuine ordinary X-Wing; `KITE_ONLY`, a genuine kite); `SUPPLEMENTS.finnedXWing` has three positions (`FIN_SPARE` is one). The generic sweep and `minFirings` are unchanged (it fires 259 times in 300 states of seed 20260101: `sweep-firings.txt`).
  `techniques.test.js` (213 to 222) counts 27 classic and 32 registered; `technique-weights.test.js` (9 to 10) places order 126 and weight 400 between `emptyRectangle` and `swordfish`, Hard-tier; `generator/tests/manual/difficulty.test.js` has the weight and the first technique of Hard (evaluated by `manual-difficulty-pure.txt`, all three assertions true; the suite is not run, IR70).
- **Ordinary fish unchanged** (`fish-differential.txt`, 10.7 s): the X-Wing, the Swordfish, the Jellyfish, the skyscraper, the kite and the empty rectangle of `eecc372` (`git show eecc372:core/js/engine/tech-fish.js`) and of the tree give the same Finding and the same observer record on every one of **35,040 lines** of the agreement states of every setup, also under the limits 0, 1 and 3 of the seams.
- **Mutations** (`mutations-1.txt` mutations 0 to 24, 390.7 s, mutation 24 not started by the admission rule; `mutations-2.txt` 24 to 49, 357.0 s; no lock wait; each on all 395 tests): **49 of 50 detected**, failing counts: a base cell or a body cell as a target 52, a selection without a fin 18, a fin-only line 11, a target that sees only the first fin 2, one that sees no fin 48, the box rule instead of real peers 2,
  a target that is no candidate 46, the wrong anchor 43, the base-line ownership dropped 1, the cover ownership dropped 1, an overlapped box as a box 4, fins in two boxes 2, a fin without a box owner 2, **box-only eligibility** 21, a board without box scanned 1, an incomplete unit 6, a placed digit in the base line 1, a line of one candidate 31, the last digit skipped 14, the budget checked one unit early 4 and one late 4, the check position not updated 4,
  no check at entry 4, cancellation swallowed 4, a spent budget propagated 8, a spent limit propagated 15, the cap hidden from the observer 5, one unit too many in the observer 24, the limit off by one 10 and 50,001 2, no unit counted 8, unsorted cells 14, eliminations 4 and fins 7, covers and bases in reverse order 30 and 30, the id fixed 4 and the key fixed 1, only the first cover combination 22, only the first base combination 25,
  columns only 36, rows only 26, stale marks of the bases 41, covers 66, targets 51 and cover pool 43, the pool unsorted 15, the size not validated 1 and the sizes swapped 6. **The one undetected mutation** (#7, a target that is a placed cell: `val[c] !== 0` dropped) is **equivalent on every consistent state**: a placed *d* on a cover would see the body candidate of that cover, which propagation has removed; no test can reach it without an inconsistent state, so none was added.
- Focused gate before E (`logs/tech-fish-*.txt`, lock-log #17): `tech-fish` 395, `techniques` 222, `technique-weights` 10, `difficulty-floor` 48 = **675 of 675**. Player (`player-focused-2.txt`): `help`, `play`, `i18n`, `help-example-tools`, `tech-fish`, `techniques` = **829 of 829** (`player-focused-1.txt`, kept, had three failures: the `help-example-tools` source step of `hiddenSingleBox` and two `help` pins, fixed in sections 5 and 6).

## 3. Commands

Each row is one or more locked commands (`lock-log.jsonl`, the number is the row of the log); seconds are the helper's node seconds, the wait is the lock wait recorded by the wrapper.

| Command | Exit | Counts | Seconds (lock wait) |
|---|---|---|---|
| #1 `--suite=tech-fish` with the engine added | 0 | 317 | 11.1 (0.1) |
| #2 to #11 probes: explore, classify, neighbours, ordinary X-Wing, bench, structural maximum, fixture data, geometry, agreement counts | 0 | positions and counts for the fixtures | 0.3 to 5.4 each (0.1 each) |
| #12 to #16 `--suite=tech-fish` focused runs (the first with two failing geometry tests, fixed) | 1, then 0 | 34 / 50 / 72 / 395 / n = 3 tests | 5.6 / 1.7 / 9.3 / 14.9 / 3.5 (0.1 each) |
| #17 gate `tech-fish,techniques,technique-weights,difficulty-floor` | 0 | 675 of 675 | 45.8 (0.1) |
| #18 to #20 structural maximum (final), `pattern-cost.js --ids=finnedXWing --runs=20`, `rated-effect.js` | 0 | 15 variants; 5 cases, none capped; 26 references | 0.3 / 0.65 / 0.81 (0.1) |
| #21 to #24 format checks (two found over-long engine lines, rewrapped; the third passes) and `tech-fish` after the rewrap | 1, 1, 0; 0 | 395 | 0.4 / 0.4 / 0.4; 17.7 (0.1, 0.1, 0.1; 0) |
| #25, #26 locales final: Generator `i18n,help,ui-contract,purity`; Player `i18n,help,ui-contract` (the Player run had the expected `help` catalogue failures before GH) | 0; 1 | | 5.7; 3.7 (0.1; 0) |
| **E** #27 wires: one IR12 compound of 5 shards | 0 | 5 keys | 51.9 (0.1) |
| #28 to #30 wire merge-check before write, write, check after | 1, 0, 0 | G09, G10, G11 differ | 0.5 each (0.1, 0.1, 0) |
| **E** #31 analyses: one compound of 14 shards | 0 | 14 keys | 72.6 (0.1) |
| #32 to #35 analysis merge-check before write, write, check after, wire check after analysis | 1, 0, 0, 0 | G04, G05, G06, G09, G11, G12, G14 differ | 0.5 each (0.1, 0.1, 0, 0) |
| **E** #36 hashes: one compound of 104 shards (`shard-runs.jsonl`, all 123 shards within their projections) | 0 | 520 keys | 309.1 (0.1) |
| #37 to #39 hash merge-check before write, `--update-hashes`, check after | 1, 0, 0 | 23 of 520 changed; then all 520 unchanged | 0.6 each (0.1, 0.1, 0) |
| #40 `--suite=replay,steps,player,pipeline,cache,worker` after the E fixtures (`pins-1.txt`) | 1 | 21 pins failed (replay 12, steps 6, player 3) | 142.6 (**115.3**) |
| #41, #42 `facts-all.js`, `facts-texts.js` (`pin-facts.txt`, `pin-texts.txt`) | 0 | the new golden facts and texts | 16.7 (0.1); 16.8 (**10.1**) |
| #43 `--suite=replay,steps,player` (`pins-2.txt`) | 0 | 280 of 280 | 59.6 (**15.1**) |
| #44 to #50 GH: check, check of the 31 existing IDs, refresh of six, check of the existing sources, write, refresh again, final check (`gh-*.txt`) | 1 ... 0 | 32 of 32 match at the end | 0.2 to 3.1 each (0.1, **30.1**, **10.1**, **25.0**, **10.1**, **5.0**, **45.2**) |
| #51 Player focused, before the Player pins (`player-focused-1.txt`) | 1 | 826 of 829 | 24.4 (**5.1**) |
| #52, #53 `run-mutations.cjs` 0 to 24 and 24 to 49 | 1; 0 | 23 of 24 tried detected (#7 not, #24 not started by the admission rule); 26 of 26 | 390.7; 357.0 (0.1 each) |
| #54 `fish-differential.js` (`fish-differential.txt`) | 0 | 35,040 lines identical | 10.7 (0.1) |
| #55 `work-census.js` | 0 | 17 populations, largest 1,901 | 5.2 (0.1) |
| #56 `manual-difficulty-pure.js` | 0 | three assertions true | 0.26 (0.1) |
| #57, #58 sweep firings probes (`sweep-firings.txt`) | 0 | 259 of 300 | 0.4, 0.5 (0.1 each) |
| #59 Player focused, final (`player-focused-2.txt`) | 0 | 829 of 829 | 24.8 (0.1) |
| #60 to #62 `--list-tests` (Generator, again with the file argument; Player) | 1, 0, 0 | 3,830 in 53 suites; 2,074 in 30 | 0.2, 0.75, 0.5 (0.1 each) |
| **First final pass** #63 to #67, Generator groups `shared-small` / `own-suites` / `pipeline` / `replay-player` and Player (`quick-final/`, superseded: only the design and the guides changed after it) | 0 | 1,853 / 1,757 / 151 / 69 = 3,830; 2,074 | 88.3 / 178.5 / 33.3 / 26.8; 46.3 (0.1 / **20.1** / **25.2** / 0.1; 0.1) |
| #68 `fingerprint-now.js` (`fingerprints-final.txt`, first pass) | 0 | both fingerprints | 0.37 (**20.1**) |
| #69 `generator-suites.sh check` through `ci-check.cjs` (`ci-check.txt`) | 0 | 3,830 and 2,074 | 4.3 (0.1) |
| #70 to #72 the three E merge-checks again on the tree (`wire-check-final.txt`, `analysis-check-final.txt`, `hash-check-final.txt`) | 0 | all match; all 520 unchanged | 0.5, 0.5, 0.6 (0.1, 0, 0) |
| #73 Butterfly firing probe (`agreement-counts-butterfly.txt`) | 0 | 0 of 300 states | 5.6 (0.1) |
| **Final** Generator quick, groups `shared-small` / `own-suites` / `pipeline` / `replay-player` (`quick-final-2/`) #74 to #77 | 0 | 1,853 / 1,757 / 151 / 69 = **3,830** (core-shared 1,534, steps 57, replay 154, mega 108, own-fast 1,682, digger-target 75, pipeline 151, player 69) | 87.6 / 176.4 / 33.4 / 26.6 (0.1 each) |
| **Final** Player quick #78 (`quick-final-2/player-quick.json`) | 0 | **2,074 of 2,074** (30 suites) | 45.3 (0.1) |
| #79 `fingerprint-now.js` (`fingerprints-final-2.txt`) | 0 | both fingerprints | 0.34 (0.1) |
| #80 `generator-suites.sh check` (`ci-check-final-2.txt`, after the manifest edit) | 0 | 3,830 and 2,074 tests, every test in one shard, every job in its limit | 4.0 (0.1) |
| #81 fingerprints rechecked after the last edits of `.github/`, `notes.md` and this folder (`fingerprints-last.txt`) | 0 | both unchanged, equal to the results | 0.34 (0.1) |

**All lock waits of 1 s or more** (the others are 0 to 0.1 s: the helper's own overhead): #40 115.3, #42 10.1, #43 15.1, #45 30.1, #46 10.1, #47 25.0, #48 10.1, #49 5.0, #50 45.2, #51 5.1, #64 20.1, #65 25.2, #68 20.1 (pentomino held the lock); 342.5 s in all over 81 commands. Unlocked: the sub-second `smoke.js` before the wrapper existed (announced to the orchestrator), `check-frag.cjs` (fragment uniqueness of the mutations, 0.2 s), `check-format.cjs` after the document edits
(0.4 s each), the JSON parse of the manifest, `git status`/`diff`/`log` and file hashes.

**Quick cost (S-AV08 re-measured):** Generator **324.0 s** (the sum of the four group commands, 324.012; 308.4 s at MS08c, +5.1 % for +2.4 % tests; the first pass 326.9 s), Player **45.3 s** (45.320; 39.9 s at MS08c, +13.6 % for +4.4 % tests; the runner total is 45.0 s; the first pass 46.3 s). Almost all of the added seconds are the tech-fish suite itself, 17 s in each app (about 10 s at MS08c): the 72 tests that name the finned X-Wing take about 9 s (`logs/tech-fish-3.txt`).
The shard seconds of the manifest are the group runner's per-shard process seconds (37.9, 17.9, 16.9, 13.5, 173.4, 2.0, 32.9 and 26.1 s) and the Player's runner total (45.0 s); the projections are unchanged (no suite or shard was added; `generator-suites.sh check` passes).
**Conventions:** group walls are the `Invoke-Dv3Node` command seconds (without the lock wait); the manifest's shard values are the group runner's per-shard process seconds; the Player's figure is its command time, the manifest's its runner total; compound projections are 2 x the measurement of the same shard in MS08c's final `shard-runs.jsonl` + 5 s, at least the 60 s floor (123 shards, **all within their projection**).
**Final fingerprints** (`fingerprint-now.js`): Generator `4e34a7458e9c5b0e...`, Player `416f4e7ce728abbe...`, equal to the `sourceHash` of the eight Generator results and of the Player result in `quick-final-2/` (all `complete` and `sourceStable`), and unchanged after the last edits of `.github/`, `notes.md` and this folder. The first pass (`0176c9015e196b70...`, `cbae5ebeb3faca8d...`)
is kept as superseded: I corrected the design (the Butterfly sentence and three wordings) and one VI guide sentence after it, which are fingerprinted files, so both quick sets were run again.

## 4. E (complete: five wires, fourteen analyses, 520 hashes; order wires, analyses, hashes; IR12 compounds)

The engine bytes were frozen first (`engine-frozen.txt`: `tech-fish.js` `3480EAC3...`, `difficulty.js` `D33598A5...` and the four locale files, which the wire and analysis recorders also hash; the comment and wording rulings of SA2 were applied before). E was recorded **once** on the final source: wires 23:31, analyses 23:33 and hashes 23:36 to 23:41; nothing byte-relevant changed afterwards
(the three merge-checks of #70 to #72 on the final tree pass "recorded from the current sources" with no diff, and the engine and locale hashes are unchanged), so G3 holds without a second recording. The `CHANGED` lists were inspected before anything was written.

- **Wires (GR)**, `wire-check-before-write.txt`: G12 and G13 unchanged; **G10** (Killer Nightmare 42) differs in 4 fields, the counters of its local search (`work[1].ratings` 199 to 257, `localSearches[0].ratings` and `shallowRatings` 82 to 41, `proposals` 32,458 to 32,115); **G09** (Killer Expert 3,514,204,290, 572 fields) and **G11** (Greater-Than Expert 42, 687 fields) are **other puzzles** (the rating on the digging path takes a finned X-Wing, so the dig differs;
  G09 now has score 809 instead of 968 and its hardest technique is `finnedXWing`). Written with `replay-fixtures.js --merge ... --write` (`wire-write.txt`); `wire-check-after-write.txt` and `wire-check-after-analysis.txt`: all five match.
- **Analyses (GR)**, `analysis-check-before-write.txt`: **G04** (5 fields: Classic Hell 1 2,400,651,925, rows 2,427 to 2,403), **G05** (11 fields: Classic Hell 1 2,299,986,211, the jump 2,461 to 2,501), **G06** (70 fields: Jigsaw Nightmare 42, a new path: 33 details instead of 32, the jump to R4C6 138 to 2,072), **G09** (80 fields: 9 compact and 39 details instead of 10 and 41), **G11** (170 fields: 7 compact and 103 details instead of 8 and 110),
  **G12** (4 fields: the peak 3,171 to 3,173) and **G14** (9 fields: the jump 3,663 to 3,669 and later rows). G01 to G03, G07, G08, G10 and G13 match, so the example of the Generation Steps guides (G01) is unchanged. Written with `replay-goldens.js --merge ... --write` (`analysis-write.txt`); `analysis-check-after-write.txt`: all 14 match.
- **Hashes (GG)**, `hash-check-before-write.txt`: **23 of 520 changed**; `node tests\perf.js --hash-merge=... --update-hashes` (`hash-update.txt`) wrote them, `hash-check.txt` is "all 520 puzzles unchanged, recorded from the current sources".

| Cell | Seeds changed |
|---|---|
| classic9/expert | 13, 55, 233, 377 |
| classic9/master | 2, 13, 1,597, 4,181 |
| diagonalX/nightmare | 8, 21, 89, 144, 987 |
| jigsaw9/master | 1, 3, 5, 144, 233, 610, 987, 4,181, 10,946 |
| greaterThan/hard | 10,946 |

  - Mechanism (G2): the generation-source diff is the technique, its registration and its weight (and the locale text, which the recorders hash; the helpers shared with the other bounded patterns behave as before, identical on 35,040 lines); every changed key's level admits the technique (Hard and above) and **no key below Hard changed** (the cells below Hard are identical).
  - Admitting but unchanged: the other seeds of the changed cells and every seed of the other cells of Hard and above (20 seeds per cell; `classic6/hard`, `killer/hard`, `hyper/hard`, `classic9/hard`, `classic9/nightmare` and 19 of the 20 `greaterThan/hard` seeds admit it and stay unchanged).
- **References** (`rated-effect.txt`): the 26 labelled puzzles keep every level and every `v3Expected` entry; four ratings change (`worlds-hardest-2012` 5,592 to 5,544, `platinum-blonde` 5,665 to 5,675, `constructed-nightmare-1` 2,704 to 2,727, `constructed-nightmare-2` 2,637 to 2,652; the finned X-Wing is used once, once, twice and twice there); `rated.js` is unchanged and no historical label or fitting parameter is touched (SA2 Q6).

## 5. Pins that followed (each from a recorded output, like for like; nothing removed, skipped or loosened)

Values are read from the new goldens (`pin-facts.txt`, `pin-texts.txt`, `facts-all.js`, `facts-texts.js`); the 21 failures of `pins-1.txt` are the list below; `pins-2.txt` is green (280 of 280), the pipeline (151), cache (106) and worker (144) of `pins-1.txt` passed unchanged.

| File | Pin | Before | After |
|---|---|---|---|
| `generator/tests/suites/replay.test.js` | G09 final score (two places) | 968 | 809 |
| | G09 digging log; rebuilt-log length and moves; shorter slice | 190; 39; 38 | 204; 37; 36 |
| | stuck-board attempted counts | `forcingChainLong: 1` | `finnedXWing: 1` instead |
| | G06 rated score | 2,327 | 2,331 |
| | jump counts of the 14 goldens (compact / details / distinct transitions) | 13 / 14 / 18 | 12 / 12 / 15 |
| | same-end-position specimen | G11 position 100 | G07 position 31 (141 to 2,310 compact, 3,183 to 2,310 details, change -873), G12 kept |
| | flat or lower new peak | G11 104: 2,876 to 1,081, `xyWing` from `nishio` | G12 103: 3,042 to 2,686, `forcingChainLong` from `nishio` |
| | unrecorded G11 position 5 | 'combined' | 'checked' |
| | details frames | G06 R5C9 (48 to 492, position 27); G11 signs 67 and 5 | G06 R4C6 (138 to 2,072, position 29); G11 sign 98 and G12 sign 34 |
| | multi-move specimens | G11 4, G12 4 | G07 5, G10 6, G12 4 |
| `generator/tests/suites/steps.test.js` | jump counts | 13 / 14 | 12 / 12 |
| | flat or falls specimen | G11 104 | G12 103 ('2,686 (-356)', Long Forcing Chain weight 1,400) |
| | G05 position 29 sentence | 2,461 | 2,501 |
| | 'mixed' jump sentence | G09 37 | G09 35, a single-culprit sentence ("Removing the clue at R8C5 alone gives 510; removing the clue at R2C5 alone gives 139."); the 'mixed' wording stays pinned by its synthetic test |
| | sign specimen | G11 103 | G11 70 ("sign between R8C7 and R9C7") |
| | multi-move specimens; "Why?" text; legend test | G11, G12 | G07 31, G10 48, G12 107; G09 35 "candidate 7 is removed from R9C1"; G12 |
| `generator/tests/suites/player.test.js` | compact fold specimen | G11 6 (2,876) | G12 4 (3,173) |
| | details sign-jump test | G11 step 104, signs 5 and 67 | G11 step 71, sign 98 (`seek(72)`, `seek(71)`) |
| | total jumps | 27 | 24 |
| `player/tests/suites/help.test.js` | catalogue size; the user-guide claim ("one of 32 techniques", "một trong 32 kỹ thuật") | 31 | 32 (three places) |
| `player/tests/suites/help-example-tools.test.js` | `hiddenSingleBox` source step | 50 | 52 |

`rated.js` is unchanged (no level or `v3Expected` changed); the real specimen of `pipeline` still holds.

## 6. GH (32 examples)

- `gh-check-all-before-refresh.txt`: all 32 IDs checked first: `finnedXWing` has no saved example (exit 1, as expected); `gh-check-31-before-refresh.txt` (the 31 existing IDs): six differ only in `source.step` (`hiddenSingleBox` 50 to 52, `xyzWing` 32 to 33, `wWing` 43 to 44, `uniqueRectangle` 45 to 47, `forcingChain` 48 to 49, `nishio` 17 to 18); the other 25 match.
- **New `finnedXWing`**: the existing Classic 9 sources that reach a finned X-Wing hint are Nightmare 1156, 648, 828, 11 and 1427 and Hell 1 8 (`player/tests/artifacts/difficulty-v3/MS09a/sources-fin-existing.json`, `gh-check-fin-existing-sources.txt`); `sources.json` lists them in the order 648, 828, 1156, 11, 1427, Hell 1 8 (at most 8 puzzles and 400 hints, `gh-write-fin.txt`): the tool's pick (the easiest to read) is Nightmare 1156, step 32: digit 5, base lines R5 and R9, covers C5 and C7, the fin R9C6, R8C5 loses the 5.
- The six IDs above were made again from their own sources (`gh-write-own-sources.txt` failed once with "catalogue not complete" until `finnedXWing` existed; `gh-write-own-sources-2.txt` wrote them).
- Final `--check` of all 32 (`gh-check-all.txt`): **32 of 32 match**, exit 0. No snapshot was fabricated; the locales of the example text are not stored in the examples.

## 7. Documents and other files changed

- Engine: `core/js/engine/tech-fish.js`, `generator/js/engine/difficulty.js` (the weight). Tests and fixtures: `core/tests/suites/tech-fish.test.js`, `core/tests/suites/techniques.test.js`, `core/tests/fixtures/techniques.js`, `generator/tests/suites/technique-weights.test.js`, `generator/tests/manual/difficulty.test.js`,
  `generator/tests/suites/replay.test.js`, `steps.test.js`, `player.test.js`, `player/tests/suites/help.test.js`, `help-example-tools.test.js`.
- Locales (EN and VI, both apps): `technique.finnedXWing` name, desc and step (the VI name "Finned X-Wing (cánh X có vây)", placeholders `digit`, `bases`, `covers`, `fins`, `{bases}` and `{covers}` twice in the step; "one box or region" and the SA2 final sentence).
- Generated fixtures: `generator/tests/fixtures/regression.js` (23 hashes), `replay-wire.js` (G09, G10, G11), `replay-goldens.js` (G04, G05, G06, G09, G11, G12, G14), `player/js/ui/help-examples.js` (32 examples).
- Guides and designs: `generator/design.md` (section 6.6 with the SA2 clarifications, the work-unit and cover-trial definition and the n = 3 seam, the technique table and the Hard tier, the tree line, the tests rows, 32 techniques / 27 classic, total 3,830), `player/design.md` (the MS09a catalogue paragraph, 32 and 2,074), `DEVELOPERGUIDE.md` and `.vn.md`
  (the work-unit and ownership paragraph, the SUPPLEMENTS and pattern-cost lists, the totals 3,830 and 2,074), `USERGUIDE.md` and `.vn.md` (32 techniques).
- `docs/difficulty-v3/notes.md` (MS09a section), `.github/scripts/generator-quick.json` (information only: counts, seconds, provenance; no group, suite or projection changed).
- Grep for the old numbers before the final quick run: `3[,.]742|1[,.]987|31 techniques|31 kỹ thuật|26 classic|31 examples|each of the 31|31 ví dụ|one of 31` over the designs, the guides, `README.md`, `AGENTS.md` and `docs/architecture.md` finds only MS08c's own historical paragraph in `player/design.md`.
- Evidence and scratch: this folder and `generator/tests/artifacts/difficulty-v3/MS09a/`, `player/tests/artifacts/difficulty-v3/MS09a/` (the drivers `run-locked.ps1`, `run-e.ps1`, `run-shards.cjs`, `make-plans.cjs`, `run-quick.ps1`, `tee-run.cjs`, `ci-check.cjs`, `mutations.cjs`, `run-mutations.cjs`, `mutant-run.cjs`, the probes and the GH sources). Intermediates kept as superseded runs: `quick-final/`, `fingerprints-final.txt`, `pins-1.txt`, `player-focused-1.txt`,
  `generator-list-tests.txt` (the first `--list-tests` call lacked its file argument), `logs/tech-fish-0.txt` to `tech-fish-6.txt`, `logs/format-1.txt` and `format-2.txt`.

## 8. Named items and the handoff to MS09b

No new item. S-AV08 re-measured (324.0 s Generator, 45.3 s Player). The inherited S-AV01 to S-AV30 are open as before. Not run: the manual `difficulty` suite (its pure assertions are evaluated by `manual-difficulty-pure.js`, IR70), qualification and soak.
**Handoff to MS09b.** The shared enumeration is `collectFinnedLines`, `finnedFindingOf`, `extendCovers`, `finnedOf`, `extendFinnedBases` and `scanFinned(size, id)` in `tech-fish.js`, reached at n = 3 by `SG.fishSearch.finnedFish(..., { size: 3 })` (id `finnedSwordfish`, the same Finding shape, the same order, the same work unit: one tested combination of base lines). At n = 3 the structural maxima are
1,512 units (every 9×9 board), 5,280 (12 digits), 17,920 (16 digits), 128,520 (Sohei, Butterfly) and 255,420 (Samurai, Flower), **above 50,000 on four boards**, with at most 84, 220, 560 and 2,925 cover trials per unit (`structural-max.txt`); nothing here claims a work policy for n = 3. The test "finnedSwordfish is not registered" is the one MS09b replaces with registration and independent-limit checks; the n = 3 kernel tests stay.

## 9. IR72 A to J

| | Item | Where |
|---|---|---|
| A1 | Design 6.6 states the proof and every precondition (complete lines and box-like unit, **candidate ownership as `findFish` for every base candidate, fins included, counted over both box kinds**, a body cell in every base line, at least one fin, the sashimi definition with SA2's wording, scope unscoped, no uniqueness), what is never a target (bodies and fins), the order, each Finding field with its order, the multi-grid boards (Samurai, Sohei, Flower; the Butterfly held none in 300 sampled states), the work unit and the cover-trial bounds; multi-grid ownership negative on the real Samurai (a fin in the unshared G1-B6, nothing in a shared box), on an overlapped box and on an extra column | `generator/design.md` 6.6; `tech-fish.test.js` (region and multi-grid describe, ownership and complete-unit tests) |
| A2 | The brief's vector and its transpose (and the bare vector with its two readings, the decoy and its transpose), the sashimi as listed and transposed, the R4C7 second fin, fins of two base lines, seven near misses in both orientations (split-box fins, an off-cover target, a cover cell that does not see the fin, no target candidate, a base line of fins only, no fin), the boundaries with `boxLine` and `xWing`, partial and overlapping lines, determinism after another call, immutability, all against `referenceFinned` (built only from `model.units`, `cellUnits`, `unitMeta`, `peers`) | `tech-fish.test.js` geometry describe |
| A3 | Field-by-field agreement (digit, cells, eliminations, bases, covers, fins) on classic9 (seeds 777 and 99), classic6, classic4, 12 and 16 digits, diagonalX, hyper, the jigsaw layout and its transpose, the environment's jigsaw9 and the four multi-grid boards, each with a minimum of firings (the Butterfly's is 0: no firing in 300 states) | `tech-fish.test.js` agreement describe |
| B1 | Registered at order 126, group `fish`, base cost 40, weight 400, unscoped, `assumesUniqueness: false`; the technique-weights test covers the placement between `emptyRectangle` and `swordfish`, the hardest-technique choice, the allowed, tier and floor sets | `technique-weights.test.js`; `manual-difficulty-pure.txt` |
| B2 | No relabelling: 26 references with and without the technique, 4 ratings change, 0 levels, all match `v3Expected`; the three ordinary fish and the three earlier bounded patterns of `eecc372` agree with the tree on 35,040 lines | `rated-effect.txt`; `fish-differential.txt` |
| C1 | Unit stated (a combination of two base lines, counted before the rejection checks, at most one trial per pair of covers); 50,000 per call; local counter; parent budget at entry and at most 256 units between checks, exact check positions 0 to 3,584 pinned | `tech-fish.test.js` work describe; design 6.6 |
| C2, C3 | A spent limit is `null` with `capHit: 'work'`; a spent budget is nothing found with `capHit: null`; cancellation and other errors propagate with no record; record `{ id, work, limit, capHit, retained }`; the seam floors, defaults and rejects invalid limits and sizes with `solver.invalidOption`; no unbounded mode | same describe |
| C4 | Structural maximum for every variant (largest Samurai and Flower 17,820, 36 %); `pattern-cost.js --ids=finnedXWing --runs=20`; no wall-time assertion; the limit was not adjusted | `structural-max.txt`, `pattern-cost.txt`/`.json`, `work-census.txt` |
| D1 | Two real positives with exact Findings (checked against the solution, the reduced state completes, explicit `after` copies) and three negatives; `historyV2`, `LADDER` and the v2 positions untouched | `core/tests/fixtures/techniques.js` |
| D2 | The generic seeded sweep and `minFirings` unchanged; `SUPPLEMENTS.finnedXWing` adds three real positions | same |
| D3 | `REGISTRY_ORDER` (27 entries), `BELOW_FIN`, `THROUGH_FIN`, `BELOW_CHAINS`, and the lists of `techniques.test.js` | `techniques.js`, `techniques.test.js` |
| E1 | Locales EN and VI in both apps: name, description and step with the same placeholders (the technique has no subtype key); the VI name follows its group's style; SA2's Q7 wording | four locale files |
| E2 | Guides EN and VI, design 6.6 with the tables, tiers and file tree, the Player design's catalogue note, the user guides' counts, the `notes.md` MS09a section with every output difference and its cause | section 7; `notes.md` |
| E3 | Totals 3,830 and 2,074, 32 techniques and 32 examples greped for the old numbers before the final quick run (only MS08c's historical paragraph remains) | section 7 |
| F1 | Fifty in-memory mutations, one per precondition and limit rule, including MS08a's ten kinds adapted (a pattern cell as a target, the neighbouring pattern accepted, partial visibility, the ownership rule dropped, the budget early, cancellation swallowed, the limit off by one, unsorted output, an incomplete unit, the wrong anchor); **49 of 50 detected**, the one equivalent mutation explained; failing tests recorded, superseded runs kept | `mutations-1.txt`, `mutations-2.txt`; section 2 |
| G1 | Complete E in the order wires, analyses, hashes: 5 wires, 14 analyses, 520 hashes in 104 shards of 5, IR12 compounds with projections and bases (all 123 shards within) | section 4; `shard-runs.jsonl` |
| G2 | Merge-checks before writing, `CHANGED` lists kept and inspected; the mechanism for every changed key; no key below Hard changed; the admitting-unchanged keys named; written from the merged ledgers with `--update-hashes` | section 4 |
| G3 | The engine bytes were frozen before E and are unchanged at the end; the three merge-checks pass "recorded from the current sources" with no diff after writing and again on the final tree; no second recording was needed | section 4 |
| H1 | `--check` on all existing IDs first (differences recorded), the new ID's source from the brief's order (at most 8 puzzles, 400 hints), every affected ID refreshed from its own source, final `--check` of all 32 | section 6 |
| I1, I2 | The task's files only (and one mid-task commit that is not mine, `5acff75`); pins from recorded outputs, like for like, with before and after values, no test or matcher removed, skipped or loosened (the 'mixed' sentence and the plural "why" wording stay pinned by their synthetic tests) | section 5 |
| J1 | Focused suites in both apps, both complete quick sets on the final tree (twice: the first pass is kept as superseded), the CI check, one locked command per payload within 540 s, at least 15 s between locks | sections 2 and 3 |
| J2 | After the final quick sets only `.github/`, `notes.md` and this folder were edited; the final results' fingerprints equal the tree's (the doc corrections that came after the first pass triggered the second) | section 3 |
| J3 | Base commit `eecc372`, the one commit that landed (`5acff75`) named; timing conventions stated | header, section 3 |
| J4 | Performance and availability numbers are S-AV08's re-measurement, not stops; no correctness failure, no change of a recorded decision (the one question was answered with a wording change only) | section 8 |

## 10. Honest gaps

- Mutation 7 (a placed cell as a target) is not detected because it is equivalent on every consistent state; no inconsistent-state test was added.
- The Butterfly held no finned X-Wing in 300 sampled states, so its agreement test (minimum 0) compares two empty answers; the design says so and does not claim a firing there.
- No golden specimen of the 'mixed' jump sentence remains, and the plural-candidate "why" specimen of the steps suite is replaced; both wordings are still pinned by synthetic tests. G11 lost its two old sign-jump specimens (the pins moved to G11 sign 98 and G12 sign 34).
- The manual `difficulty` suite is not run (its pure assertions are evaluated by a scratch script).
- The tech-fish suite costs about 7 s more in each app (the S-AV08 re-measurement); no projection was changed.
- Two document-editing slips (lines joined by the editor) were found by reading the diffs and fixed before the final runs; nothing else was touched.
