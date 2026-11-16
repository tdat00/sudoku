# MS11b evidence: Unique Rectangle hidden form

Developer agent claude-sonnet-5.5 (role `dev`), branch `rating-v3`. **Base commit `ef95fc5`** (MS11a accepted; the tree was clean). Commits that landed during the task: `695f02e` (S-AV34 in the check-list), `c7aa064` (the MS11b brief after SA2's pre-E rulings) and `f4604da` (the post-E ruling on the stuck-proposal fixture); I read each amended brief before continuing and edited no pack file. Start 2026-11-16 14:31 (+07:00), end 17:18. Machine: Windows x64, AMD EPYC 7763 (16 cores, 64 GiB), Node v26.13.0, time factor 2. Nothing is staged or committed.

Lock: every command that could take over about 10 s ran through `Invoke-Dv3Node` (verbatim helper `invoke-dv3node.ps1`, byte-equal to the check-list block, SHA-256 `FC7298D3...951D`), one command per lock, at least 15 s apart, 540 s cap; E, mutations and the quick groups as IR12 compounds (admission 450 s). The wrapper `run-locked.ps1` writes `lock-log.jsonl`: **61 locked commands, none with a lock wait above 0.1 s (the helper's own overhead; nobody else held the lock), node seconds 4,488.8 in all**. Fourteen entries have a non-zero exit, all expected: three `tech-wing` runs that failed while I fixed tests, the Player focused gate that failed only on the `help` replay of `emptyRectangle` before GH, five mutation compounds with survivors (section 2), the read-only GH check that found the one difference, three groups of the first quick pair (the pins of section 7) and the pin-suite run that showed the `digger-target` pin. Short commands under 10 s ran without the lock (merge-checks, CI check 4.3 s, format and fingerprint checks, the totals script, the source-file writers of the scratch folders). **The E announcement** (check-list section 7) is `e-announcement.txt`: a sub-agent has no channel to the orchestrator before its reply, so the announcement is in this record and in the report.

**Disclosed process deviations (kept, not hidden):** the new dispatcher block of `tech-wing.js` was first written through PowerShell instead of the edit tool; the scratch scripts of this task were copied from MS11a's folder through PowerShell; and one stray CR that the edit tool introduced in `tech-wing.test.js` was removed with a one-byte PowerShell repair. After the ruling every file change used the edit and create tools.

## 1. What is implemented

`core/js/engine/tech-wing.js`: `uniqueRectangle` keeps ID, order 180, base cost 66, weight 900, `assumesUniqueness: true`. Passes 1 and 2 are unchanged. The dispatcher runs a **third bounded pass, the hidden form,** only when pass 1 and pass 2 found nothing and pass 2 did not end with a spent parent budget (a pass 2 that spent its own work limit does not stop it and proves no absence of types 3 and 4). Hidden form: four open corners, exactly two common digits {X, Y}, not all four corners the bare pair; a floor corner that holds exactly {X, Y} and the target opposite to it (the target may hold exactly the pair too, SA2's ruling 1); the actual complete row unit and column unit that join the target to its two neighbours (kind row and column only) each hold X in exactly two cells (a solved holder counts); Y leaves the target. Order: rectangles as before, targets in rectangle order, the lower digit of the pair first. Finding: cells = the four rectangle cells in rectangle order, `eliminations [[target, Y]]`, `i18nKey technique.uniqueRectangle.hidden.step`, `i18nArgs { digit: X (the link digit, the one subtype whose digit is not the removed one; the header of the file says so), digits: [X, Y] ascending, cells: four labels in rectangle order }`. One work unit is one tested (target, digit); limit **50,000 per call, independent** (`SG.wingSearch.UNIQUE_RECTANGLE_HIDDEN_WORK_LIMIT`; seam `uniqueRectangle(model, state, ctx, { workLimit, hiddenWorkLimit })`), own counter, entry check and at most 256 units between parent-budget checks; a spent limit is `null` with `capHit: 'work'`, a spent budget `null` with `capHit: null` (the caller's budget stays spent). Observer: one record per bounded pass that ran, the second pass first, **buffered and published only when the finder returns normally**, so cancellation or an unexpected error in any pass leaves none (SA2's correction); 0 records when pass 1 finds or the context rejects, 1 when pass 2 finds or spends the budget, 2 when the hidden pass ran.

Files changed (git status): `core/js/engine/tech-wing.js`, `core/tests/suites/tech-wing.test.js`, `core/tests/fixtures/techniques.js` (one real positive `UR_HIDDEN`, two supplements `UR_HIDDEN_BOX`, `UR_HIDDEN_ROW`), the four locale files (`technique.uniqueRectangle.hidden.step`, SA2's wording), both `i18n.test.js` (expected subtype keys), `generator/tests/fixtures/regression.js` (5 hashes) and `replay-goldens.js` (G14), `generator/tests/suites/{replay,cache,worker,pipeline,digger-target}.test.js` (pins, section 7), `player/js/ui/help-examples.js` (`emptyRectangle`, `source.step` 23 to 24), `generator/design.md`, `player/design.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `.github/scripts/generator-quick.json` (tests, seconds, provenance), `docs/difficulty-v3/notes.md`, and the three scratch/evidence folders of this task (`docs/difficulty-v3/evidence/MS11b/`, `generator/tests/artifacts/difficulty-v3/MS11b/`, `player/tests/artifacts/difficulty-v3/MS11b/`).

## 2. Focused gates and mutations

| Gate | Result |
|---|---|
| Generator `--suite=tech-wing,techniques,technique-weights,difficulty-floor,tech-chain,i18n,pattern-cost-tools` (`logs/gate-generator-2.txt`, after the corrections) | **970 of 970**, 54.6 s (`tech-wing` 435, `techniques` 251, `technique-weights` 13, `difficulty-floor` 48, `tech-chain` 107, `i18n` 84, `pattern-cost-tools` 32) |
| Player `--suite=play,i18n,help,help-example-tools,tech-chain,tech-wing,techniques` (`logs/gate-player-2.txt`, after GH) | **1,006 of 1,006**, 29.7 s (the first run, `logs/gate-player-1.txt`, 1,003 of 1,004: the `help` replay of `emptyRectangle`, before GH; kept) |
| Mutations on the pre-ruling source (`mutations-1.txt`, `-2.txt`, `-17.txt`, kept as history) | 55 of the hidden pass: 54 detected, 1 equivalent; #17 (a solved corner accepted, the open test dropped) survived the first run and was killed by a test with a value set and the mask unchanged |
| **Mutations on the final source, new list** (`mutations-final-1.txt`, `-2.txt`) | 61 (hidden pass, dispatcher, publication): **60 detected**; the survivor is `holders <= 2`, **equivalent**: both distinct corners of the pattern hold the digit in each selected unit, so the count is never below two, the equality is kept and the argument is in `generator/design.md` and the source |
| **Mutations on the final source, MS11a list adapted** (`mutations-ms11a-final-0.txt`, `-28`, `-56`, `-84`) | 97 (fragments adapted by name to the new dispatcher, 97 of 97 matched): **94 detected**; the three survivors are MS11a's equivalents #17 (`widest = eligible`), #18 (the early return when no size fits) and #43 (`>= k + 1` after the `> k + 1` rejection) |

Mutations cover per precondition and per limit rule: the hidden pass before pass 2, never, after a spent budget, after a Finding, stopped by a capped pass 2, sharing or off-by-one limits, the seam, cancellation swallowed, the entry check dropped, budget checked early, the common-digit rules, the bare pattern, the opposite-corner rule, the unit kinds and completeness, holder counts, target order, digit order, the Finding fields and the record publication (a pass-2 record escaping on pass-3 failure).

## 3. Commands, timing and CI projections

Timing conventions (J3): **group walls** are the `Invoke-Dv3Node` command seconds from `lock-log.jsonl` (without the lock wait); **per-shard process seconds** are the group runner's, the figures of the manifest's `measuredSeconds`; runner body time is the runner's own "Time: ... running tests".

| Run | Result |
|---|---|
| First complete pair (`quick-1/`, **kept as superseded**) | Player 2,459 of 2,459 (66.4 s). Generator 3 of 4 groups failed on pins that follow the recorded outputs (`replay` 2, `cache` 1, `worker` 1, `digger-target` 1, `pipeline` 1: section 7), walls 130.7, 191.9, 38.0 and 35.5 s |
| Final pair (`quick-final/`) | **4,218 of 4,218 Generator** (53 suites; walls 131.0, 191.3, 37.6 and 35.1 s = **394.96 s**), **2,459 of 2,459 Player** (30 suites; 65.8 s); every results file complete and source-stable |
| Shards (process seconds, final run; tests) | core-shared 57.1 s (1,918), steps 24.9 (57), replay 23.8 (154), mega 23.9 (108), own-fast 188.1 (1,686), digger-target 2.3 (75), pipeline 37.1 (151), Generator player 34.6 (69) |

**Projections** (check-list section 2, `c160bb4`): `new = max(old, 10 x ceil(1.5 x m / 10))`, m the largest process seconds of the shard in the complete successful runs (a shard that failed in `quick-1` contributes only its final run); the Player uses its whole process wall.

| Shard | old | m (s) | 1.5 x m | new | Job total / limit |
|---|---:|---:|---:|---:|---|
| core-shared | 90 | 57.1 (56.9 in quick-1) | 85.7 | 90 | shared-small 180 + 3 x 210 = 810 of 1,800 |
| steps | 40 | 24.9 | 37.4 | 40 | |
| replay | 40 | 23.8 | 35.7 | 40 | |
| mega | 40 | 23.9 | 35.9 | 40 | |
| own-fast | 290 | 188.1 | 282.2 | 290 | own-suites 180 + 3 x 320 = 1,140 of 1,800 |
| digger-target | 30 | 2.3 | 3.5 | 30 | |
| pipeline | 60 | 37.1 | 55.7 | 60 | pipeline 360 of 1,800 |
| player (Generator shard) | 60 | 35.1 (34.6 in the final run) | 52.7 | 60 | replay-player 360 of 1,800 |
| Player job | 100 | 66.4 (65.8 in the final run) | 99.6 | 100 | **180 + 3 x 100 = 480 of the actual 900** |

**No projection rises**; no shard was moved, regrouped or clamped, and no factor, overhead or timeout changed. `.github/scripts/generator-suites.sh check` (`ci-check-1.txt`, after the manifest edit): 4,218 of 4,218 and 2,459, every test in exactly one shard, groups 810, 1,140, 360 and 360 of 1,800, Player 480: **check passed**. Only `tests`, `measuredSeconds` and the provenance text of the manifest changed (the manifest is outside both fingerprints). **S-AV08:** Generator 395.0 s against 397.0 s at MS11a (-0.5 % for +1.1 % tests), Player 65.8 s against 65.4 s (+0.6 % for +1.9 % tests).

**Final fingerprints** (`fingerprint-now.js`): Generator `1d8af4dddaee9f65828f232c5770e58b33309403da23faf57e5bd34dc470d3d7` (equal to the `sourceHash` of the eight final Generator results) and Player `9059453f1141dd624de27fb73a5b833faa5826eede89a7df9039cdce9f6c358c` (equal to the final `player-quick.json`, and to that of the first pair, whose Player source was the same). After the last quick runs only `.github/`, `docs/difficulty-v3/notes.md` and this folder were edited.

## 4. E (GR wires, GR analyses, GG hashes)

The engine bytes were frozen first (`engine-frozen.txt`, 16:16:24: `tech-wing.js` `F4C8796D...F378`, `difficulty.js` `7BF45E1B...66F5` (unchanged), the four locale files, and the tree hashes of `core/js` (23 files) `6EFFC4A1...F2F7` and `generator/js` (37 files) `EED6CDB1...1357`) after the corrections, the final-source mutations and the E announcement. E was recorded **once, 16:16 to 16:30, on the final source**; nothing byte-relevant changed afterwards (`engine-after-e.txt` and `engine-final.txt`: the six hashes and the two tree hashes are identical). The three merge-checks were run before writing and their lists inspected, and again on the final source (`wire-check-final.txt`, `analysis-check-final.txt`, `hash-check-final.txt`). **Every shard stayed within its own projection** (wires 78.2 of 185 s, analyses 106.9 of 297 s, hashes 340.5 of 1,277 s in one compound of 341.0 s; the slowest shard 29.2 s; `shard-runs.jsonl`: 123 shards, all exit 0, none above its projection; projection basis: MS11a's final measurement of the same shard, 2 x + 5 s) and no process came near 540 s.

- **Wires (GR)**, `wire-check-before-write.txt`: all five G09 to G13 match `replay-wire.js`; nothing to write.
- **Analyses (GR)**, `analysis-check-before-write.txt`: **one of fourteen changes, G14** (Mega 16, level `hell2`, seed 12; 34 fields: the compact rows 8 to 7, the detail rows 79 to 81, the scores of the rows 3 to 6). `g-cause.txt` and `g-cause-saved.txt` (regenerating each golden exactly as the recorder does, with and without the hidden form): the puzzle itself differs (80 rating positions with the form against 78 without), the rating positions 69 to 77 differ in score and technique counts, **the golden regenerated without the hidden form equals the saved one in all fields**, and the other eleven goldens equal the saved ones both ways. The cause is the technique alone: the digger rates its candidate puzzles with the registered ladder, and a hidden step takes the place of a heavier step in some of them. Written with `replay-goldens.js --merge --write` (`analysis-write.txt`); `analysis-check-after-write.txt` and the wire check after it match.
- **Hashes (GG)**, `hash-check-before-write.txt`: **5 of 520 changed: `classic9/nightmare` seeds 8, 13, 21 and 610 and `diagonalX/nightmare` seed 21**, two of the four cells whose level admits the technique (`classic9/master`, `classic9/nightmare`, `diagonalX/nightmare`, `jigsaw9/master`); the other 16 keys of `classic9/nightmare`, the 19 of `diagonalX/nightmare`, the 40 of `classic9/master` and `jigsaw9/master` and the 440 keys of the 22 cells below Master are unchanged (**no key below Master changed**). `hash-cause.txt` regenerates the 80 admitting keys with and without the hidden form in one process: the same 5 differ and none is inconsistent, and without the form every hash equals the previous record (70.7 s). Written with `perf.js --hash-merge ... --update-hashes` only for these five explained keys (`hash-write.txt`); `hash-check-after-write.txt`: all 520 match.

## 5. R20: the 26 references on the final source

`rated-effect.txt` (each reference rated with the registered ladder and with a finder that returns nothing where it would return a hidden form): **0 levels, 0 requiredness, 0 hardest-technique and 0 `v3Expected` entries change; 3 scores change** (`escargot` 5,143 to 5,506, with one hidden use where the first task recorded one type 2 use; `platinum-blonde` 5,675 to 5,688 and `constructed-nightmare-3` 2,565 to 2,586, one hidden use each where there was none). Cause: the hidden step takes the place of a heavier step or of nothing at one position of those ratings; no weight, placement or label was fitted. Historical v2 and external labels are untouched. The pre-ruling preview (`rated-effect-pre.txt`) gave the same three.

## 6. Help examples (GH, H1)

`--check` of **all 35** first (`logs/gh-check-all-1.txt`, 26 distinct puzzles): **one differs**, `emptyRectangle` (own source Hell 1 seed 214: the same snapshot and hint, `source.step` 23 saved, 24 fresh). Own source first: `--ids=emptyRectangle --max-puzzles=16 --max-hints=400 --write` (`logs/gh-write-er-own.txt`, one field changed in `help-examples.js`). The task's `uniqueRectangle` commands with `sources.json` (the same Nightmare 70 source; `logs/gh-write-ur.txt`, `logs/gh-check-ur.txt`) keep the example: the hint at step 29 is still a type 1 deduction that keeps priority. The final `--check` of all 35 (`logs/gh-check-all-2.txt`): **35 of 35 match**. No other real source, discovery batch or synthetic snapshot was needed, so the bounded discovery allowance was not used.

## 7. Pin refreshes (I2: read from recorded outputs, like for like, nothing removed or loosened)

| Suite and test | Before | After | Source of the new value |
|---|---|---|---|
| `replay` "rates a stuck board honestly" (counts) | nakedSingle 2, hiddenSingleBox 15, uniqueRectangle 1 | nakedSingle 3, hiddenSingleBox 16, uniqueRectangle 2 (other counts equal) | `pins-replay.txt` |
| `replay` "keeps the witness of the unfinished checks" | move 76 of G14, at 167, rated 16, refused 13, unscored 2 | move 70, at 95, rated 10, refused 5, others 0, unscored 4 (the lowest of the eight moves 70-75, 77, 78 that qualify; move 76 has none now) | `pins-replay.txt` |
| `cache` / `worker` / `pipeline` shallow-fallback specimen (`MS05b1-T04/T05`) | classic9 Nightmare seed 21 | seed **6**, the lowest shallow seed of the scan (6, 13, 14); seed 21 is exact now | `shallow-seeds.txt`; premise assertions unchanged |
| `digger-target` real-pass `CASES` | `['classic9', 'hell1', 11, true, null]` (0 stuck at the tree, 3 at the base) | seed **14** (SA2's post-E ruling; 5 genuine stuck keeps of priority STUCK + 43 and STUCK + 46, the first of the seeds 1-30 without 13 and 30 with at least three) | `stuck-seed-scan.txt`; aggregate with the updated list in `stuck-count-final.txt`: 651 scored, **34 stuck** (> 30), three refusal reasons, 104 guided accepts (> 100); original comparison kept in `stuck-count.txt` (652 / 29) and `stuck-count-base.txt` (649 / 32); `digger-target-1.txt` 75 of 75 |
| Regression hashes, goldens | 5 hashes, G14 | section 4 | the merged ledgers |

`steps`, `player`, `help-example-tools`, `tech-chain` and the other suites needed nothing (the first Player quick run passed). The manual `difficulty` suite was not run; its pure assertions are evaluated by `manual-difficulty-pure.js` (`manual-difficulty-pure.txt`: weight table equal, allowed techniques per level, firsts per level hold).

## 8. Work, cost and reach

`structural-max.txt` (8 units per rectangle, never above 50,000), `work-census.txt`, `census-totals.txt`, `work-census-base.txt` (base `ef95fc5`), `pattern-cost.txt`, `logs/explore-dug-4242-30000-final.txt`, `logs/ur-firings.txt`: see `generator/design.md` section 6.6 and `docs/difficulty-v3/notes.md` for the figures. Summary: hidden pass bound 36,864 at most; 7,168 sampled calls, 6,842 second-pass runs, 6,446 hidden-pass runs, 438 hidden first Findings, none capped, largest hidden work 86; reach 992 of 5,118 open positions (19.4 %, measured on the pre-ruling source: the buffering of the observer records changes no Finding).

## 9. IR72 A to J

| Item | Result | Evidence |
|---|---|---|
| A1 | The proof, every precondition, what is never a target, the order and each Finding field are in `generator/design.md` section 6.6 ("Unique Rectangle, the hidden form"); the boards that can fire are named; ownership is by the actual complete row and column units (box, extra units and partial lines are never links) | design |
| A2 | The brief's vector, its swapped roles and transpose, every corner as target, the near misses in both orientations, each against an independent enumeration built only from the layout and `model.units`; the boundary with the old types, determinism after another call, purity of Finding and state | `tech-wing.test.js` |
| A3 | Field-by-field agreement with the enumeration's first removing pattern on classic9 (three seeds), classic6, classic4 and 12 digits, minima 25, 20, 22, 14, 5 and 10 (firings 33, 26, 29, 19, 7, 15); 16 digits, Jigsaw, Sudoku X, extra units and the Samurai in the shape tests | `logs/ur-firings.txt`, tests |
| B1 | ID, group, order, base cost, weight, scope and `assumesUniqueness` unchanged; `technique-weights` passes | gate 970 of 970 |
| B2 | No relabelling; references with and without the technique | `rated-effect.txt`, section 5 |
| C1 | Unit = one tested (target, digit), 50,000, local counter, entry check, at most 256 units between checks, pinned by a cadence test with exact positions | tests |
| C2 | Spent limit `null` with `capHit: 'work'`; spent budget `null` with `capHit: null` and the caller's budget stays spent; cancellation and errors propagate **with no observer record at all** (buffered publication, entry and mid-pass failures); record `{ id, work, limit, capHit, retained }` | tests, mutations |
| C3 | Seam: absent limit is the default, a finite value of at least 0 is floored, anything else is `solver.invalidOption`; no unbounded mode | tests |
| C4 | Structural maximum against the limit; `pattern-cost.js --ids=uniqueRectangle --runs=20` recorded; no wall-time assertion; the limit was not adjusted | section 8 |
| D1 | `CURRENT.uniqueRectangle`: five real positives with exact Findings, independent uniqueness and completion evidence (the new one is puzzle 138 of the seed 4242 corpus, eliminating digit 4 in R5C1), negatives, explicit `after` copies; `historyV2`, `LADDER` and the v2 positions untouched | fixtures |
| D2 | The seeded sweep and `minFirings` unchanged; five supplements on top | fixtures |
| D3 | `REGISTRY_ORDER` and the `BELOW_*` lists are unchanged (no new ID); `techniques.test.js` 250 to 251 | tests |
| E1 | Both apps, EN and VI, the subtype key with the same placeholders, SA2's wording | locales, `i18n` suites |
| E2 | Guides in EN and VI in step; design section 6.6 (table row, file tree, proof, order, work, reach, effect); the Player design note; `notes.md` with every difference and its cause; the user guides name no subtype and the counts stay 35 | docs |
| E3 | Quick totals 4,171 to 4,218 and 2,412 to 2,459 in `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `generator/design.md` section 15 and `player/design.md`; the old numbers were grepped before the final runs (the historical MS11a notes keep theirs) | docs |
| F1 | 158 in-memory mutations, 154 detected, 4 equivalent (section 2); superseded runs kept | `mutations-*.txt` |
| G1 | Complete E in the order wires, analyses, hashes, IR12 compounds with projections and bases | section 4, `shard-runs.jsonl` |
| G2 | Merge-checks before writing, `CHANGED` lists kept, every changed key explained by regeneration with and without the technique, no key below Master changed, the unchanged admitting keys listed | section 4 |
| G3 | No byte change of a fingerprinted engine file after the freeze; the three merge-checks pass on the final source | `engine-final.txt`, `*-check-final.txt` |
| H1 | `--check` on all 35 first; the one affected ID refreshed from its own source; the UR example kept; final `--check` of all 35 | section 6 |
| I1, I2 | The task's files only (plus the single `digger-target` seed authorized by SA2's post-E ruling); every pin refresh listed with before and after, no test or matcher removed, skipped or loosened | section 7 |
| J1 | Focused suites, both complete quick sets on the final tree and the CI check; one locked command per payload at most 540 s; compounds per IR12; at least 15 s between locks | section 3 |
| J2 | After the final quick sets only `.github/`, `notes.md` and this folder were edited; the final fingerprints equal the tree's | section 3 |
| J3 | Base commit and the commits that landed, and the timing conventions, are stated | header, section 3 |
| J4 | The quick-cost growth is a re-measurement of S-AV08, not a stop | section 3 |

## 10. Acceptance criteria

| ID | Evidence |
|---|---|
| MS11b-B01 | The proof is explicit and conditional on genuine uniqueness (`generator/design.md` 6.6, the header of `tech-wing.js`, the `assumeUniqueness: false` negative, the four-bare-corners rejection) |
| MS11b-B02 | No new technique ID; the first and second passes run first and keep their order and priority (order and priority tests, mutations 0 to 4) |
| MS11b-T01 | Both true conjugates, the opposite-corner geometry and the false-context guards pass (`tech-wing` 435 of 435, 154 of 158 mutants detected, the four equivalents argued) |
| MS11b-T02 | ID and key, state purity, deterministic bounds and the historical/current separation hold (tests, `CURRENT` and historical records untouched, section 5) |
| MS11b-T03 | E, GH, cost and both quick sets pass (sections 3, 4, 6 and 8) |

## 11. Questions and rulings

`QUESTION:` 1 to 8 before E (rectangles, observer records, Finding arguments and text, pass order, link units, work unit and limit, fixtures and pins, E and GH scope): SA2 ruled in `c7aa064`; the corrections were the buffered observer publication, the four wording replacements and the census baseline wording. After E, `QUESTION:` 1 (the `digger-target` stuck pin): SA2 ruled (a) in `f4604da`. Details are in `docs/difficulty-v3/notes.md`.

## 12. Honest gaps

- The census and the reach are measurements of seeded populations in one locked but not protected process on this machine, not of real puzzles or of CI; the Killer and Greater-Than populations are **uncaged** models of the test helper; the 16-digit and multi-grid populations are 12 states each, so their mean latencies are rough.
- The reach campaign (30,000 dug puzzles) was measured on the source before SA2's record-publication correction and is not repeated (the correction changes no Finding; no extra campaign was required).
- The hidden-pass limit is shown not to bind by the structural bounds on the listed geometries only; this says nothing about the whole-call cost or the parent budget. The second pass keeps S-AV34's open coverage question.
- Not run: the manual `difficulty` suite (pure assertions evaluated by a script), any qualification or soak.
- The shallow-fallback specimen, the G14 witness and the Hell 1 seed of `digger-target` are fixtures chosen by the rules above; they are as likely as any to change with the next technique that moves a dig path.
- The mutation sets are in-memory and hand-written; four survivors are equivalent by argument, not by proof for every possible state.
- Process deviations: the three editing-method deviations listed in the header.

## 13. Named items (for the pack author)

No new S-AV row. **S-AV34** (UR second-pass coverage): carried; the hidden pass adds the 6,446 runs, none capped, to the same census and no new item. **S-AV08** re-measured: 395.0 s Generator, 65.8 s Player. The inherited S-AV01 to S-AV34 are as MS11a left them.
