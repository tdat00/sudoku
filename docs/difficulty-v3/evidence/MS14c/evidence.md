# MS14c evidence: quick regressions for the two existing Killer interactions

Developer: Dev-Sonnet (claude-sonnet-5.5), branch `rating-v3`, Windows x64, Node v26.13.0. **Start 2026-11-17T18:17:42+07:00.** Base HEAD `abf87d0` (pack-only); accepted implementation base `0e3a0c4` (MS14b), no runtime file differs between them. Nothing is staged or committed by me. Status and end time: section 13.

## 0. Planned bounded gates, with projections (written before running the E and quick gates)

The dispatch message is the announcement ("announce to the orchestrator" is satisfied by it; a sub-agent has no channel before its reply). Every payload that can pass 10 s, and every unknown generation projection, runs through `Invoke-Dv3Node` (the verbatim helper, saved as `generator/tests/artifacts/difficulty-v3/MS14c/invoke-dv3node.ps1`, byte-identical to MS14b's) through the wrapper `run-locked.ps1`, which waits at least 15 s since this task's previous release and appends `lock-log.jsonl`. One locked command per payload, at most 540 s per process, admission at most 450 s by a stated projection (the basis is stated; a target is never a projection). Pentomino is finished; if `%TEMP%\dv3-timing.lock` or `dv3-sudoku.lock` looked stale I would report it with `QUESTION:` and remove no lock that I did not create. **No `QUESTION:` was needed.** No corpus scan, discovery, acquisition or canonical write is planned or made (S-OD12/S0).

| # | Gate (all locked, jobs 1, nothing generated) | Basis of the projection | Projection (s) | Admitted when |
|---|---|---|---|---|
| G1 | the new core suite `tech-cage` alone, both apps (development, final) | measured: 33 tests 50 ms body, 0.3 s process | <= 5 | always |
| G2 | in-memory mutants of `core/js/engine/tech-cage.js` (`run-mutations.cjs`, 36 mutants, `--suite=tech-cage --bail` each) | measured first run: 36 mutants 11.0 s | <= 60 (per-mutant bound 10 s, generic floor 60 s) | elapsed + max(projection, 60) <= 450 |
| G3 | E merge-checks, check-only, nothing generated: `replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS14b\wire --check`, `replay-goldens.js --merge=...\analysis --check`, `perf.js --hash-merge=...\hashes --check-hashes` | MS14b: 0.48 s, about 1 s, about 1 s on the same sources | <= 10 each | always |
| G4 | GH: `make-technique-examples.js ..\generator --max-puzzles=64 --max-hints=400 --check` (all 38, no `--discover`, no `--write`) | MS14b final check 3.0 s | <= 15 | always |
| G5 | Focused Generator `tech-cage,techniques,tech-subset,ui-contract,purity`; focused Player `tech-cage`, then `help,help-example-tools` | MS14a: `tech-subset` + `techniques` + `ui-contract` + `purity` 515 tests 9.9 s | <= 60 each | always |
| G6 | corpus-free Killer selector `--suite=killer --filter="killer: combination table (P4)"` | the brief: seconds, no corpus | <= 30 | always |
| G7 | Both complete quick sets: the four group commands of `generator-quick.js` and the Player `node tests\node-runner.js` | MS14b final: groups 200.0 / 198.5 / 47.7 / 55.7 s, Player 96.4 s | groups <= 250 each, Player <= 120 | <= 450 |
| G8 | the CI check through Git's bash | MS14b: about 1 s | <= 30 | always |

Short scratch commands that generate nothing and were measured at well under 10 s (the exploration scripts, the suite runs of `tech-cage` of 0.3 s, `--list-tests`, the format check, the freeze hashes, `check-mutations.cjs`) ran **unlocked**, as the IR07 clarification allows (section 12 lists them). The one scratch search that generates random positions (`search-fits.js`, a bounded 3,000-trial search) ran locked.

## 1. What this task found and did

**No production file is changed.** The two interactions are `pointOutOfCage` (`core/js/engine/tech-cage.js:118-139`, called from `:173-191` of `comboFinding`): a required digit locked to a unit and the two-cell Killer pair are one rule, so `cageCombo` stays the only ID and no `cageLocked` exists. The brief's baseline cites were verified on the base file: the pointing step, the surviving-combination filter (`survivingCombos`, a set of the table of the size and sum left after the placed cells, without a placed digit, inside the union of the candidates of the open cells, every open cell holding a digit of the set) and the `places > 1` branch. No stronger assignment pruning is added or demanded.

## 2. Tests added (live counts of the final run)

| Suite | Before | After | New |
|---|---|---|---|
| `tech-cage` (shared, new file `core/tests/suites/tech-cage.test.js`) | 0 | **33** in each app | 1 registration test + 12 positions (8 locked-digit, 4 pair) x 2 orientations + 4 near misses x 2 orientations |
| Generator quick set | 4,526 tests / 53 suites | **4,559 / 54** | +33 (`core-shared` 2,195 to 2,228) |
| Player quick set | 2,753 / 30 | **2,786 / 31** | +33 |

Boards are built in the suite with `SG.model.create` from the 27 row, column and box units and **one explicit cage** (variant id `tech-cage-core`, so the cage propagation, switched on with `SG.comboTable.enablePropagation('tech-cage-core')`, touches no other board); no Generator variant, no corpus, no generation. Each position is checked four ways: (1) the exact Finding through `SG.techHelper.expectFinding` (exact `placements: []`, exact `eliminations` and `cells` as sets, the arguments `sum`, `size`, `cells`, `digits`, `forced`, the `technique` id and the key `technique.cageCombo.step`, no `rule`; the helper also runs `find` twice and checks that the state is unchanged and the answer equal, and checks soundness against the designated solution); (2) an **independent brute-force oracle** written in the suite from `model.units`, `unitMeta` labels and the 512 digit subsets only (never `SG.comboTable`, `cellUnits`, `peers` or the finder's tables): surviving sets, needed digits, places, common units, targets; its eliminations equal the finder's and the hand list; (3) the **exact solver** (`SG.dfs.countSolutions`, with the cage extension): no solution has any eliminated digit in its cell (the typed-in cells range over their typed digits); (4) the designated solution (a completion of the cage, valid by `SG.model.isSolution`) keeps every digit after the eliminations are applied, and the listed `keeps` cells still hold their digit (the cells outside the common units).

**What each position pins** (row orientation; every one also in the transposed orientation, with its labels, cells and eliminations transposed):

| Position | Pins |
|---|---|
| L1 cage R1C2-R1C4 sum 8 ({1,2,5} {1,3,4}), R5C4 = 1 | locked digit 1 (places R1C2 and R1C3): leaves **row 1 and box 1** (12 exact eliminations); the box and row units are both used, a cell in both is listed once |
| L2 the same cage, no given | the third cell can hold the 1: the places share **row 1 only**, so row 1 loses it (6) and **box 1 keeps it** (six `keeps`): the target-not-in-the-common-unit near miss |
| L3 sum 9 ({1,2,6} {1,3,5} {2,3,4}), R1C8 = 4 and R5C4 = 1 | the survivors filter: the 4 is gone from the whole cage, so {2,3,4} no longer survives and the 1 is locked again (11 exact eliminations) |
| L4 L-shaped cage R1C3, R1C4, R2C4 sum 8, R2C7 = 1 | the places R1C3 and R1C4 are in two boxes: **row 1 only** (4 exact) |
| L5 L-shaped cage inside box 5 sum 8 | all places in one box: **box only** (6) |
| L6 cage R1C2-R1C4 sum 7 with R1C2 = 1 placed | a placed cell: the sum left is 6, {1,5} is out and {2,4} is the pair, locked to row 1 (the Finding still lists all three cage cells, `size` 3) |
| L7 typed-in pencil marks, cage R7C2-R7C4 sum 19 | a set that no open cell can complete does not count ({4,7,8}: R7C4 holds neither 4, 7 nor 8): the 9 is locked to row 7 |
| L8 singles-only state (`propagate: false`), cage R1C3 (placed 1), R1C4, R2C4 sum 7 | a digit already placed in the cage is not a digit of the sets of its open cells ({1,5} is out although R2C4 still lists the 1): the pair {2,4} is locked to column 4 and box 2, together with the in-cage eliminations (39 exact eliminations) |
| P1 pair cage 17 in R5C3 and R5C4 | the two-cell Killer pair across two boxes: **row 5 only** (14) |
| P2 pair cage 3 on the diagonal R7C7, R8C8 | **box only** (14) |
| P3 pair cage 3 in R1C1 and R1C2 | **row and box** (26) |
| P4 pair cage 10 in R5C3 and R5C4 with R5C4 typed '46' | a pair settled by the candidates, not by the sum: 4 and 6 leave row 5 (14) |
| N1 sum 9, R5C4 = 1 | **a digit missing from one surviving set** ({2,3,4} has no 1) locks nothing (oracle: no needed digit; Finding null) |
| N2 L-shaped cage sum 8, no given | **a cage position outside the unit** can hold the 1: needed digit 1 has places in three cells and no common unit (oracle: `common[1] = []`); Finding null |
| N3 pair cage 10 in R5C3 and R5C4 | four pairs fit: no needed digit; null |
| N4 pair cage 3 in R3C3 and R4C4 | the pair shares no unit: needed digits 1 and 2, no common unit; null |

The near misses are isolated positions (one cage, propagated, so nothing else is left): the oracle independently says that nothing is locked (no needed digit, or a needed digit with no common unit), and the Finding is null, which is the exact present behaviour for an isolated position. No position demands a null Finding where another legitimate elimination remains; if `cageCombo` ever gained a stronger deduction, the null assertions of these four isolated positions would be the lines to revisit, while the oracle assertion (the pointing step does not fire) would stay true. The registration test pins that the `cage` group is exactly `cageCombo`, `cageSplit`, `ruleOf45`, that `cageLocked` is not registered and that `cageCombo` has `variantScope` `['killer']` (the deliberate no-new-ID outcome, MS14c-B01).

## 3. Focused gates (final tree, all locked; rows 23 to 26 of `lock-log.jsonl`)

| Gate | Result | Wall |
|---|---|---|
| Generator `tech-cage,techniques,tech-subset,ui-contract,purity` (`logs/focused-generator-final.txt`) | **577 of 577**, 5 suites (purity 41, tech-cage 33, tech-subset 167, techniques 268, ui-contract 68) | 14.1 s |
| Generator `help` (the guides changed, `logs/focused-generator-help-final.txt`) | **30 of 30** | 5.6 s |
| Player `tech-cage,techniques,ui-contract,help,help-example-tools` (`logs/focused-player-final.txt`; contains the Player `tech-cage` and the `help,help-example-tools` of the dispatch) | **443 of 443**, 5 suites (tech-cage 33, techniques 268, help-example-tools 51, help 28, ui-contract 63) | 16.4 s |
| Corpus-free Killer selector `--suite=killer --filter="killer: combination table (P4)"` (`logs/killer-combination-table-final.txt`) | **10 of 10 selected**, jobs 1, no `--jobs`, no `corpus()` or pipeline generation (body 27 ms) | 1.7 s |

The first pass of the same four commands, before the comment correction of section 7 (rows 8 to 11, `logs/focused-generator.txt`, `-help.txt`, `focused-player.txt`, `killer-combination-table.txt`), gave the same counts (577, 30, 443, 10) and is kept.

## 4. Mutants (IR72 F1, adapted to a test-only task)

**36 in-memory mutants** of `core/js/engine/tech-cage.js` (`mutations.cjs`; the hook wraps `fs.readFileSync` for that one path, the file on disk is never touched; every fragment occurs exactly once, `check-mutations.cjs`; the Generator runner with `--suite=tech-cage --bail`): the pointing step P01-P14 (never fires; needs three places; exactly two places; only the first common unit; the last or the first unit of the first place skipped; the last place ignored; one place too few passed on; every unit of the first place counts; the cage cells not spared; a cell without the digit listed; a solved cell not spared; an elimination listed twice; the wrong digit), the needed digits N01-N04 (some set instead of every set; the first or the last set only; none ever), the surviving-combination filter and its inputs S01-S08 (candidates do not limit the sets; a placed digit not excluded; a set need not give every open cell a digit; placed digits not subtracted from the sum; placed digits allowed in the sets; the digits of the cage are the last set only; an empty Finding returned; the last cage not scanned), the Finding F01-F05 (cells, size, digits, sum, technique id) and the registration R01-R05 (a `cageLocked` technique shares the finder; `cageCombo` registered as `cageLocked`; the group renamed; the scope every variant or another variant).

* **First run** (`mutations-1.txt`, `logs/mutations-run-1.txt`, kept): **32 detected, 4 survived**: S03 (a set need not give every open cell a digit), S02 and S05 (the placed digit may be in the sets: the two ways of dropping `forbidden`), and P12 (the solved-cell guard). The draft of `mutations.cjs` that ran labelled **S02** "equivalent" with an argument I had not checked; that label is **withdrawn**: S02 is killed by position L8 below (the first-run file shows the withdrawn label, kept as run).
* **Killed by new positions:** S03 by L7 (typed-in pencil marks: a set within the candidates that one open cell cannot complete would otherwise remove the needed 9), found by a bounded 3,000-trial random search (`search-fits.js`, locked, 4 hits) and then written out by hand; S02 and S05 by L8 (the placed digit offered by an open cell that is not its peer, so only the singles-only state shows it).
* **Second run** (`mutations-2.txt`, `logs/mutations-run-2.txt`, row 3, 18:35:53, on the suite with the S02, S03 and S05 killers): 35 detected, 1 equivalent (P12); kept (it ran before the header-comment correction of section 7).
* **Final run on the final bytes** (`mutations-3.txt`, `logs/mutations-run-3.txt`, row 18, started 19:01:55; the suite was last written at 19:01:39 and `mutations.cjs` at 18:35:29, and neither changed afterwards): **35 detected, 1 equivalent (P12), 0 undetected non-equivalent**. The first failing test of each detected mutant is in the file.
* **P12 equivalent, argued from `constraints.js`, not from the tests:** `assign()` (lines 365-387) and `place()` (392-406) set the candidates of a placed cell to its own digit alone, and every state is peer-consistent (the digit is removed from every peer; the comment of the fast propagate at line 304 states the invariant). Take a solved cell *x* in a unit *u* that holds all the places of the digit *d* (open cells of the cage that can hold *d*). If *x* holds *d*, those places share *u* with *x*, so they have lost *d* and are not places: contradiction. If *x* holds another digit, `cand[x]` has no *d*, so the next guard `(cand[x] & bit) !== 0` keeps it out. Every state of the engine, the solver and the test helper is built that way, so no reachable state reaches the elimination branch with a solved cell; a hand-edited inconsistent state is the only way and is not a state of any API.
* Not mutated, stated: the in-cage elimination loop (`cand & ~valid`), the placement branch (`places === 1`), the cadence check `ctx.check()` and the budget, `ruleOf45`, `cageSplit`: they are not the two interactions of this task, whose tests are other suites'; no mutant of them is claimed.

## 5. E: reuse and check-only closure (IR72, SA2 at MS13a), nothing recorded, nothing written

**Which E source identities this task touches: none.** The recorders hash the production `SOURCE_FILES` of `generator/tests/node-runner.js` (LF-normalised) plus their own helper files (`replay-fixtures.js`: `tool-records.js`, `replay-recording.js`, `replay-fixtures.js`, `replay-goldens.js`; `perf.js`: `perf-helper.js`, `tool-records.js`, `perf.js`). This task changes a new shared suite, both `tests.html`, two designs, both guides in both languages and the CI manifest: none of them is an input. Shown, not assumed:

* `check-format.cjs` (run before every freeze and again at the end) lists the changed files against the 69 recorder inputs: **none**; `git status` shows no engine, UI, locale, fixture-tool or recorder file changed.
* `freeze-hashes.cjs` (`engine-frozen.txt`, 18:40:52): the SHA-256 of the 16 E-input files and the two tree hashes (`core\js` 23 files, `generator\js` 37 files) are **identical, line for line, to MS14b's final `engine-final-2.txt`** (the record of E-2's source), so the three required identities equal those of E-2's ledgers. The same comparison was repeated on the final tree, after the last edit of a fingerprinted file (the suite header comment, 19:01:39) and after both quick sets, at 19:18 (`engine-final.txt`): still identical (`True`); a comment of a test file is no E input.

**Families:** none re-recorded (no identity changed), so no fresh wires, analyses or hashes were generated, and no compound was needed. The retained MS14b **E-2** ledgers (the top-level `wire`, `analysis` and `hashes` folders; not `e-1/`) were merge-checked on the current source, check-only (`logs/merge-check-wire.txt`, `-analysis.txt`, `-hash.txt`; `lock-log.jsonl` rows 4 to 6, each locked, at least 15 s apart, 0.56, 0.54 and 0.66 s), and **again on the final tree** after the comment correction of section 7 (`logs/merge-check-wire-final.txt`, `-analysis-final.txt`, `-hash-final.txt`; rows 19 to 21, 0.63, 0.55 and 0.69 s) with identical results:

| Check | Command (from `generator/`) | Result |
|---|---|---|
| Wires | `node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS14b\wire --check` | "merged **5** ledgers: all 5 keys exactly once, **recorded from the current sources**"; G09 to G13 match `replay-wire.js`; "replay-wire.js is up to date"; exit 0 |
| Analyses | `node tests\replay-goldens.js --merge=..\docs\difficulty-v3\evidence\MS14b\analysis --check` | "merged **14** ledgers: all 14 keys exactly once, recorded from the current sources"; G01 to G14 match `replay-goldens.js`; up to date; exit 0 |
| Hashes | `node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS14b\hashes --check-hashes` | "merged **104** ledgers: all **520** keys exactly once, recorded from the current sources"; "regression hashes: all 520 puzzles unchanged (merged ledgers, nothing generated)"; exit 0 |

Coverage 5 / 14 / 520, current-source identity, canonical fixtures unchanged (`git status` shows no change of `replay-wire.js`, `replay-goldens.js` or `regression.js`): nothing was generated, written, copied or retagged; MS14b's ledgers were not re-labelled as new observations. The original records are `docs/difficulty-v3/evidence/MS14b/{wire,analysis,hashes}/` (sections 8 and 11 of its evidence).

## 6. GH (help examples): complete `--check`, no acquisition, no write

`node tests\tools\make-technique-examples.js ..\generator --max-puzzles=64 --max-hints=400 --check` from `player/` (`logs/gh-check-all-38.txt`, `lock-log.jsonl` row 7, 3.07 s; and again on the final tree after the comment correction, `logs/gh-check-all-38-final.txt`, row 22, 4.50 s, identical): "selected **38** technique ID(s); mode check", 27 puzzles replayed, **38 of 38 "matches help-examples.js"**, "help-examples.js is up to date for the 38 selected ID(s)", exit 0. `lawOfLeftovers` (the 12th puzzle, `jigsaw9`) is replayed from its own source with the Jigsaw example's actual region map, as in MS14b. No `--discover`, `--sources` acquisition, corpus scan or `--write`; `player/js/ui/help-examples.js` is unchanged. The catalogue stays **38**.

## 7. Both complete quick sets, projections, CI, fingerprints

**Why two passes.** After the first complete pair (`quick-final/`, rows 12 to 17, kept), reading the finished suite once more I found that its header comment said "two hand-made" positions while **three** exist (two with typed-in pencil marks, one singles-only). The suite is a fingerprint input of both apps, so, with MS14b's lesson, I corrected the comment with the edit tool (19:01:39) and ran **everything affected again on the final bytes**: the mutation run (`mutations-3.txt`), the three E merge-checks, GH, the four focused gates, both complete quick sets (`quick-final-2/`), the CI check and the inventories (`inventory-*-2.json`). Nothing else changed. The first pass is superseded but kept whole (`quick-final/`, `inventory-generator.json`, `inventory-player.json`, `mutations-2.txt`, the logs without `-final`); the final record is the second pass.

**Generator, final** (the four existing bounded group commands of `generator-quick.js`, all locked, `quick-final-2/`, `lock-log.jsonl` rows 27 to 30): **4,559 of 4,559** tests, 54 suites, exit 0 in every group, every result complete and source-stable: shared-small 198.8 s command (core-shared **2,228** tests, 85.4 s process; steps 57, 43.4; replay 158, 43.0; mega 108, 25.4), own-suites 199.7 s (own-fast 1,713 tests, 196.0 s; digger-target 75, 2.6 s), pipeline 151 tests 46.7 s (46.2 s process), replay-player 55.6 s (player 69 tests, 55.0 s): **500.9 s** of lock node seconds in all, against 501.9 s at MS14b (the first pass: 499.6 s). **Player, final** (`node tests\node-runner.js`, locked, row 31): **2,786 of 2,786**, 31 suites, exit 0, 97.166 s lock node seconds, **97.063 s process** (the tee's `seconds=`), body 96.47 s, against 96.4 s at MS14b (the first pass: 96.207 s process). Timing conventions: "command seconds" are the node seconds of one locked command; "process seconds" are the `shard X: exit 0, N s` lines of `generator-quick.js` and the tee's `seconds=` for the Player; "body" is the runner's `Time:` line. S-AV08 re-measured (named item): Generator -0.2 % for +0.7 % tests, Player +0.7 % for +1.2 % tests (machine noise; no claim).

**Projections** (SA2's rule, `new = max(old, 10 x ceil(1.5 x m / 10))`, m = the largest process seconds of the shard in the two complete successful runs on the final-source family, as MS14b did): **no projection rises, none is lowered**; the preserved list is core-shared 130, steps 70, replay 70, mega 40, own-fast 320, digger-target 30, pipeline 80, the Generator player shard 90 and the Player job 150.

| Shard | old | m (first pass, final pass) | 1.5 m rounded up to 10 | new |
|---|---|---|---|---|
| core-shared | 130 | 85.8 (85.8, 85.4) | 130 | 130 |
| steps | 70 | 43.9 (43.9, 43.4) | 70 | 70 |
| replay | 70 | 43.6 (43.6, 43.0) | 70 | 70 |
| mega | 40 | 25.4 (25.2, 25.4) | 40 | 40 |
| own-fast | 320 | 196.0 (193.4, 196.0) | 300 | 320 (the old stays) |
| digger-target | 30 | 2.6 (2.6, 2.6) | 10 | 30 (the old stays) |
| pipeline | 80 | 46.2 (46.1, 46.2) | 70 | 80 (the old stays) |
| player (Generator shard) | 90 | 55.0 (54.8, 55.0) | 90 | 90 |
| Player job | 150 | 97.063 (96.207, 97.063) | 150 | 150 |

The groups come to **1,110, 1,230, 420 and 450 s** (`180 + 3 x sum` of 310, 350, 80 and 90, each at most 1,800); every shard is at most 450 s (largest 320); the Player job is `180 + 3 x 150 = 630 s` of its actual 900. **CI check** (`& 'C:\Program Files\Git\bin\bash.exe' .github/scripts/generator-suites.sh check`, through `ci-check.cjs`, locked; the first pass `logs/ci-check-final.txt`, row 17, and the final `logs/ci-check-final-2.txt`, row 32, identical): "Generator quick set: 4559 tests in 54 suites; Player quick set: 2786 tests in 31 suites ... Every quick test is in exactly one shard (4559 of 4559), no manual or unknown suite, no empty shard, every job inside its limit: check passed." `tech-cage` is owned by the existing `core-shared` shard (suite list edited; no group, job, shard id, command, tier or timeout changed). The manifest's `tests`, `measuredSeconds` (the final pass's) and provenance text are the only other edits; the manifest is outside both fingerprints.

**Fingerprints (J2, final).** Generator `e587fe7e9b0d1051e21338e4b6ff1ee04a935b17427230900f4b476078e769ff` (all eight Generator results of `quick-final-2/` and `inventory-generator-2.json`), Player `cb4f326ea9dc87c8ada980b2b38f073fd2215f617c3424cc925421d975832285` (`player-quick.json` of `quick-final-2/` and `inventory-player-2.json`), computed by `fingerprint-now.js` after the last edit of a fingerprinted file, after the manifest edit and after the CI check: they equal the results' `sourceHash` (all complete and source-stable). After the runs only `.github/scripts/generator-quick.json`, `docs/difficulty-v3/` and the scratch folders changed, all outside both fingerprints. The superseded first pass had Generator `5f5d3fa1bd110c007ad3bb7413a96eb70369a21e4599cd369189e29da6bf806f` and Player `049c663cf4214738f420718768eda3884c15a916df044be9a9d51917d5763ab9` (before the comment correction). MS14b's were Generator `c44d7bd6...690e`, Player `63329fbe...772f`; the new ones differ because the suite, its list, both `tests.html`, the guides and the two designs changed.

## 8. S-AV37: a measured handoff only (S-AV36 and S-AV38 carried unchanged)

Carried unchanged from the accepted `0e3a0c4` and `docs/difficulty-v3/evidence/MS14b/evidence.md` section 6 and `s-av37.json`; limits remain **2 units/side, 4 difference cells/side, 50,000 work units/call**; MS14b did not use the once-only R10 adjustment and this task inherits **no permission to tune**; none was used. Nothing was measured or run for it here (no generation, discovery, Jigsaw census or limit change).

| Population (MS14b's accepted observation; kept separate) | Observation |
|---|---|
| Five constructed blank layouts, including the boxes control | `staggered` and `wavy` cap at 50,000 (2/5); the other three do not; MS14a's full work counts for the two capped layouts were 98,530 and 81,664 |
| 60 seeded positions (five layouts x two orientations x seeds 1-6) | 0/60 caps; maximum **5,842** work units/call |
| 14 real puzzles (twelve Jigsaw Hard requests, two existing help sources); 38 calls | 0/38 caps; maximum **3,845** work units/call |

**Not measured, still open:** generated-layout cap rates, real positions beyond these fourteen puzzles, whole-generation cost; these samples are not a universal cap/availability claim or a GP verdict. S-AV37 stays open: MS18c receives the availability consequences, MS18d the cost, MS18e the audit. A green Killer regression does not close the Jigsaw item.

## 9. IR72 A to J (a test-only task: A, C, D and F apply, and "nothing registered, no output changed": the three merge-checks and GH `--check`)

| Item | Status |
|---|---|
| A proof and geometry | **Done for what a test-only task adds; three honest gaps.** A1: `generator/design.md` §6.6 states the rule, the surviving-combination filter, what is never a target, the Finding and that no assignment matching exists; the **enumeration order** of the finder is not restated there (the header of `tech-cage.js` documents "cages by index"; the tests compare the eliminations as sets, so the order is not pinned here); the multigrid-ownership negative (IR69) has no meaning on a single-grid, Killer-scoped technique. A2: every position and near miss in both orientations (rows and the transpose), each checked first against the independent oracle built from `model.units`; determinism after another call and an unchanged state are checked by the helper; **no neighbouring-technique boundary test** (the only neighbours are the classic `pointing`, which does not read cages, and `ruleOf45`/`cageSplit`, whose rules are other suites'). A3: agreement field by field with the oracle is on 9 x 9 Killer boards only (the technique's own scope): the classic, 4/6/12/16-digit and shape-class populations of the template have no Killer counterpart here. |
| B | **Done, unchanged:** no ID, group, order, cost, weight, scope or uniqueness edit (the weight and floor suites pass in both quick sets); the references are unchanged because no output changed. |
| C | **Not applicable:** no new finder, limit or cost; `cageCombo`'s budget cadence and the R10 rules are untouched and **not mutated** (stated in section 4). |
| D | **Done with honest differences:** no `CURRENT` entry (no new technique). The positions are constructed cages on an empty board (not real puzzles) with a designated valid solution, so soundness is shown **both against that solution and by the exact solver refuting every elimination over all completions**, not by a unique-solution puzzle; `historyV2`, `LADDER` and the existing fixtures are untouched; the generic seeded sweep is untouched. |
| E | **Done:** E1 N/A (no text); E2 both guides in both languages, `generator/design.md` §6.6 and §15, `player/design.md`, `docs/difficulty-v3/notes.md`; E3 the totals (54 and 4,559, 31 and 2,786, the 17 shared suites, 62 with the manual ones) were grepped and updated in both developer guides, `generator/design.md` (§15.1, §15.2, the file tree) and `player/design.md` before the final quick runs; historical per-task paragraphs keep their own task's totals. |
| F | **Done** (section 4): 36 mutants over the pointing, the needed digits, the survivors filter, the Finding and the registration; 4 survived the first run and three were killed by new positions, one (P12) is argued equivalent from `constraints.js`. |
| G | **Check-only closure** (section 5): no identity changed, so no fresh family; the three merge-checks pass on the current source with 5 / 14 / 520. G3 does not arise (no later byte change of an E input). |
| H | **Done** (section 6): all 38 checked, no acquisition. |
| I | **Done:** no pin changed; the lists, counts and the manifest information fields are edited (I1); nothing loosened. |
| J | **Done:** focused gates, both complete quick sets, CI (sections 3 and 7). J2: after the final quick sets only the manifest and `docs/` changed. J3: the base commit is `abf87d0` (pack-only) on the accepted `0e3a0c4`; no commit landed during the task (the working tree changed only by my edits). J4: S-AV37 and S-AV08 are the named items; nothing stopped the task. |

## 10. Acceptance

| ID | Result |
|---|---|
| MS14c-B01 | **Met.** Both interactions are evidenced (a required digit locked to a unit; the two-cell Killer pair) through `cageCombo`, and the registration test pins that there is no `cageLocked` and that the cage group is `cageCombo`, `cageSplit`, `ruleOf45`. |
| MS14c-B02 | **Met.** No production file changed; no stronger assignment matching is added, demanded or tested (the oracle uses the same surviving-combination definition). |
| MS14c-T01 | **Met.** Exact positive and near-miss positions (section 2), core-only construction (`SG.model.create`, no Generator variant), both runners pass (33 of 33 in each). |
| MS14c-T02 | **Met.** The suite is in both `tests.html` lists and in the `core-shared` shard; docs and counts updated; the catalogue stays 38. |
| MS14c-T03 | **Met.** Both complete quick sets (4,559 and 2,786, all green), the corpus-free combination-table selector (10 selected), the three current-source E merge-checks (5 / 14 / 520), complete GH (38 of 38) and the CI check pass; no whole-corpus GD, no generation, no acquisition. |

## 11. Named items (S-AV01 to S-AV38)

**Measured or re-measured here:** **S-AV08** (quick cost: Generator 500.9 s / 4,559 tests, Player 97.1 s / 2,786; section 7). **S-AV37** is a measured handoff only (section 8). **Carried unchanged, not re-measured:** S-AV01 to S-AV07, S-AV09 to S-AV35 and the other inherited items of the check-list table; **S-AV36** (the grouped-graph cost) and **S-AV38** (the activation's generation cost and incomplete GP) are context only, not permission to retune chains or widen measurement or acquisition. No new item is proposed.

## 12. Honest gaps, disclosures, unlocked and aborted runs

* **A test-only task has the gaps of its kind** (IR72 table, section 9): the finder's enumeration order is not pinned by these tests; no neighbouring-technique boundary test; A3's populations exist only on 9 x 9 Killer boards; positions are constructed cages with a designated solution (the exact solver is the all-solutions argument), not real puzzles; the in-cage elimination loop, the placement branch, the budget cadence, `ruleOf45` and `cageSplit` are not mutated here.
* **The withdrawn draft label** of S02 as "equivalent" in the first mutation run (section 4): a draft assertion written before I had checked it; the mutant is killed, the first-run file is kept as run.
* **Unlocked runs** (all short, generate nothing, each far under 10 s; the IR07 clarification allows them, and none was a stopped trial): two runs of `explore.js` (0.2 s each: the exploration of candidate positions through the finder), five runs of the focused `--suite=tech-cage` while writing the suite (four Generator, one Player, 0.3 s each, one of them with two failures that led to the typed-candidate refutation), `--list-tests` six times (two previews, deleted, and the two inventories of each pass, 0.3 to 0.7 s), `check-mutations.cjs` three times (fragments checked before each mutation run), `check-format.cjs` five times, `freeze-hashes.cjs` four times (the freeze record, three comparisons with MS14b's final record, one of them writing `engine-final.txt`), and read-only `git`, `Get-Content`, `Get-Item` and JSON inspection. The locked runs are every other payload (`lock-log.jsonl`, **32 rows, all exit 0**): the three mutation runs, the bounded random search (`search-fits.js`), the E merge-checks and GH of both passes, the focused gates of both passes, the corpus-free selector of both passes, the ten quick commands (five per pass) and the two CI checks.
* **A correction found late, and its cost** (section 7): the suite header comment said two hand-made positions where three exist. It was found after the first complete pair, which cost a second complete pair, mutation run, merge-checks, GH, focused gates and CI check (15 minutes, 19:01:55 to 19:16:54). The MS14b lesson (finish all fingerprinted bytes, including comments, before the freeze) was applied to the E identities (checked and unchanged) but I had not re-read the suite's own header against its content before the first quick pair.
* **Lock contention:** the wait column of the CI check's row shows 45.2 s: the slot was occupied by a holder other than my own previous run (I did not identify it, presumably another project's run); nothing looked stale after the wait and I removed no lock. **No run was aborted, no process was stopped, no lock was removed, no `QUESTION:` was needed.**
* **Process:** every tracked file was written with the edit and create tools (CRLF, UTF-8, no BOM, final newline: `check-format.cjs` clean on all changed files). PowerShell was used only to run programs, to read, to create the artifact and evidence folders, and to delete my own two preview inventories. The edit tool reported "old_str did not match exactly, closest lines replaced" several times on multi-line replacements of CRLF files; I checked each result in its echo and by the final format and test runs. Not run: the manual `killer` suite beyond the corpus-free selector, any whole-variant GD, qualification, soak, GP, perf, browser run.

## 13. Files changed, status, end

* **New:** `core/tests/suites/tech-cage.test.js`; `docs/difficulty-v3/evidence/MS14c/` (this file, `lock-log.jsonl`, `engine-frozen.txt`, `engine-final.txt`, `inventory-generator.json` and `inventory-player.json` (first pass, superseded), `inventory-generator-2.json` and `inventory-player-2.json` (final), `mutations-1.txt`, `mutations-2.txt`, `mutations-3.txt` (final), `logs/`, `quick-final/` (first pass, superseded), `quick-final-2/` (final)); `generator/tests/artifacts/difficulty-v3/MS14c/` (scratch: the verbatim `invoke-dv3node.ps1`, `run-locked.ps1`, `run-quick.ps1`, `tee-run.cjs`, `load.js`, `explore*.js`, `search-fits.js`, the mutation tooling, `check-format.cjs`, `freeze-hashes.cjs`, `fingerprint-now.js`, `ci-check.cjs`).
* **Modified:** `generator/tests.html`, `player/tests.html` (the suite in `CORE_SUITE_FILES`), `.github/scripts/generator-quick.json` (`core-shared` membership, counts, measured seconds, provenance; no projection), `generator/design.md` (§6.6, §15.1, §15.2, the file tree), `player/design.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `docs/difficulty-v3/notes.md` (an MS14c section).
* **Not touched:** every production file, every fixture, every pin, `tasks/`, the Execution log, Git.
* **Status:** an uncommitted candidate; acceptance and the commit are the orchestrator's. End time and the final checks are in the final report.


