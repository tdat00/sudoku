# MS07f evidence: the approved slow cases move to the manual tier (S-OD8, S-AV08)

Developer agent claude-sonnet-5.5, branch `rating-v3`, HEAD `89350b8` (MS08a), working tree not staged or committed.
Start 2026-11-15T16:48:10+07:00, end 2026-11-15T17:16+07:00. Node v26.13.0, Windows x64, AMD EPYC 7763 (16 cores, 64 GiB),
time factor 2 (`CI` and `SG_TIME_FACTOR` unset). Every command over about 10 s ran through `Invoke-Dv3Node` (the verbatim helper,
`invoke-dv3node.ps1`, through `run-step.ps1` and `steps.json`), one command per lock, at least 16 s apart; `commands.jsonl` has
one line per command. Lock wait: none (0.082 to 0.091 s of helper overhead per command; the slot was free each time).
Registration-only listings (`--list-tests`, about 0.5 s) and the CI check (3.9 s) ran without the lock, as IR07 allows.

## 1. What moved, and the proof that nothing else did

| Original (HEAD, tier) | New (tier) | Preserved |
|---|---|---|
| `pipeline > instrumented generators: what the events cost > generating puzzles: verbosity 'off' costs less than 2%` (quick) | `perf > instrumented generators: what the events cost > generating puzzles: verbosity 'off' costs less than 2%` (manual) | `expect(costRatio(generateWork, 'off', 1.02, 5)).toBeLessThan(1.02);`, timeout 120000 |
| `... verbosity 'summary' costs less than 10%` | same describe in `perf` | `costRatio(generateWork, 'summary', 1.10, 4)` against 1.10, 120000 |
| `... verbosity 'full' costs less than 35%` | same describe in `perf` | `costRatio(generateWork, 'full', 1.35, 4)` against 1.35, 120000 |
| `player > player: the replay steps of a result > real top-level results with clues shown again replay faithfully (mega16, classic9)` (quick) | quick: `... (classic9)` with `[['classic9', 'hell1', 3]]`; manual: `variants > player: the replay steps of a result > ... (mega16)` with `[['mega16', 'nightmare', 478576959], ['mega16', 'hell1', 2422420669]]` | the loop body and both timeouts (60000) byte for byte; only the input array is partitioned |

- **Files changed** (the four tests): `generator/tests/suites/pipeline.test.js` (the three tests and `generateWork` out, a two-line comment and a header
  line in; `emitFor`, `bestTimes`, `costRatio`, `now` and `model9` stay: the digging and full-grid cost tests use them), `generator/tests/suites/player.test.js`
  (the case renamed and its array cut to the classic9 request, a two-line comment), `generator/tests/manual/perf.test.js` (an independent describe at the end
  with its own `E`, `model9`, `now`, `emitFor`, `bestTimes`, `costRatio`, `generateWork`; header comment), `generator/tests/manual/variants.test.js` (an
  independent describe at the end, `player: the replay steps of a result`, with private copies of `realResult`, `analysisOf`, `viewsOf`, `stepsOf`, `clues`,
  `sameValues`, `expectFaithful`, `P`, `R` and the two caches; header comment). The new describes read nothing of the sweep's lazy corpus (no `contextOf`,
  no `corpus()`), and neither is conditioned on `SG.fixtures.perfTools`.
- **Byte-identity proof** (`relocation-check.cjs`, output `relocation-check.txt`, 33 checks, 0 failures): the helper block `emitFor` to `generateWork` (46 lines) and the three
  tests (11 lines) of HEAD appear **identically** in `perf.test.js`; `now`, `model9` and `E` equal HEAD's apart from a 2-space indent; the new `pipeline.test.js` is HEAD
  minus exactly that block plus the comment and header lines; the quick case and the manual case are HEAD's case text with only the title suffix and the input array
  replaced (exact text, including both `}, 60000);`); `expectFaithful` is identical, the five other helpers equal HEAD's apart from a 2-space indent; the new `perf.test.js` and
  `variants.test.js` equal HEAD plus the header comment and the new describe at the end (nothing else differs). No `SG.test.skip`, `try`, `catch` or wrapper in the new
  perf describe; the manual replay describe has exactly one test and no skip.
- **Selectors** (`selectors/`, registration only, nothing generated): the ratios `--suite=perf --filter="> instrumented generators: what the events cost > generating puzzles:"`
  select **3** (ordinals 48 to 50, timeout 120000 each); `--suite=variants --filter="> player: the replay steps of a result > real top-level results with clues shown again replay faithfully (mega16)"`
  selects **1** (ordinal 323, timeout 60000); the quick `--suite=player --filter="... (classic9)"` selects **1** (ordinal 25, the ordinal of the original case, timeout 60000).

## 2. Inventories (registration-only, `inventory-before/`, `inventory-after/`)

| | Before (MS08a tree) | After |
|---|---:|---:|
| Generator quick | 3,563 tests, 53 suites (28 benchmarks), `519cd6653180d243…` | **3,560**, 53 suites (28 benchmarks), `b8ba10267ffe8650a6e0d48f5251f1d495e3c33ff01bb144549ffee6ee35ca40` |
| `pipeline` | 154 | **151** |
| Generator `player` | 69 | 69 (one case renamed) |
| Player quick | 1,807, `222e69cffbc2ea1c…` | 1,807, `d1581ee06644a982cc5673df12e49822fad8c978df5f3b0ef4276a7aa75a0058` |
| Generator manual | 1,144 (derived: the four new cases are the only registrations added, shown by the byte-identity proof) | **1,148** in 8 suites |
| Registered tests in all, quick plus manual | 4,707 | 4,708 (+1: the old case is now two) |

The before inventories were taken at HEAD with the working tree clean and their fingerprints equal MS08a's `quick-final-2` (Generator `519cd6653180d243…`, Player
`222e69cffbc2ea1c…`), so MS08a's complete results are the valid before set (IR71) and were not rerun. The two final fingerprints changed only because of MS07f's edits
to fingerprinted files (the four suites and the guides and designs); the inventories after the last edit, `final-*-quick.json`, carry the same hashes as the runs.

## 3. Commands (final tree)

All exit 0, no timeout, no test skipped. Seconds are the helper's node-process seconds; the lock wait of each is 0.08 to 0.09 s.

| Step (`steps.json`) | What | Counts | Seconds |
|---|---|---|---:|
| `ratios` | `node tests\node-runner.js --suite=perf --filter="> instrumented generators: what the events cost > generating puzzles:" --verbose --results=manual\ratios.json` (projected 289 s from MS08a's 95.30 + 95.39 + 96.15 s) | 3 of 3 passed: 'off' 95.84 s, 'summary' 95.16 s, 'full' 96.89 s | 288.311 |
| `mega-replay` | `--suite=variants --filter="> player: the replay steps of a result > ... (mega16)" --verbose --results=manual\mega-replay.json` (projected 120 s from the 116.03 s of the whole case) | 1 of 1 passed, 118.04 s | 119.088 |
| `shared-small` | `generator-quick.js run shared-small --results-dir=quick` | 1,586 of 1,586 (core-shared 1,267, steps 57, replay 154, mega 108) | 71.326 |
| `own-suites` | same, group `own-suites` | 1,754 of 1,754 (own-fast 1,679, digger-target 75) | 170.900 |
| `pipeline` | same, group `pipeline` | 151 of 151 | 30.622 |
| `replay-player` | same, group `replay-player` | 69 of 69 | 23.822 |
| `player-quick` | Player `node tests\node-runner.js --results=quick\player-quick.json` | 1,807 of 1,807 | 35.012 (body 34.54 s) |
| `reconcile.cjs` | `reconcile.txt`: 35 checks, 0 failures | every inventory key once in the results (3,560 and 1,807): 0 missing, 0 duplicate, 0 unexpected; one fingerprint per app equal to the inventory's; the manual map and the delta | 0.1 |
| `bash .github/scripts/generator-suites.sh check` | `ci-check.txt` | exit 0: 3,560 Generator and 1,807 Player tests, every test in one shard, no manual or unknown suite, every job inside 30 min | 3.9 |
| Generator `--suite=help,ui-contract,purity`, Player `--suite=help,ui-contract` (before the final runs, after the guide edits) | | 138 of 138 and 89 of 89 | 5 and 1.6 |

Every shard result is `complete` and `sourceStable`, with no registration error. The complete Generator quick time is the sum of the four group commands:
**71.326 + 170.900 + 30.622 + 23.822 = 296.670 s**.

## 4. Before and after (like with like)

Conventions (IR68): the Generator figure is the sum of the four `Invoke-Dv3Node` group-command seconds (the shard seconds of the manifest are the group runner's per-shard
process seconds, a second row); the Player figure is the `Invoke-Dv3Node` wall (the runner's body time is a second row, and the manifest's 34.7 s is a body time). Before = MS08a
`quick-final-2` (same machine, Node and factor; its two complete runs were 691.6 s and 699.8 s, so the run-to-run spread is about 8 s).

| | Before | After | Change |
|---|---:|---:|---:|
| Generator, sum of group commands | 699.833 s | **296.670 s** | -403.163 s (-57.6 %) |
| Generator, sum of per-shard process seconds | 696.1 s | 293.5 s | -402.6 s (-57.8 %) |
| Longest group (wall) / longest shard (process) | `pipeline` 317.976 s / 317.3 s | `own-suites` 170.900 s / `own-fast` 168.2 s | -147.1 s / -149.1 s |
| Shards, tests | 8, 3,563 | 8, 3,560 | -3 tests |
| `pipeline` shard | 154 tests, 317.3 s | 151 tests, 30.2 s | -287.1 s |
| Generator `player` shard | 69 tests, 139.4 s | 69 tests, 23.4 s | -116.0 s |
| Player, wall / body | 35.295 s / 34.66 s | 35.012 s / 34.54 s | -0.283 s / -0.12 s (unchanged app) |

The moved cases, selected alone from a fresh process and run once: ratios 95.84, 95.16 and 96.89 s (MS08a quick shard: 95.30, 95.39, 96.15 s; MS07e: 94.0, 93.2, 93.5 s);
`(mega16)` 118.04 s (the whole case ran 116.03 s in the quick `player` shard: its classic9 request is generated earlier, by the test "has the 13 kinds of title", and the case
reuses the memoised result, so the classic9 case that stays quick now costs 0.5 ms and the request itself is still generated, and its views checked, in the quick set).
Re-projection on the post-MS08a source (pipeline 309.1 to 317.3 s): the three ratios 286.84 s and the two requests about 116 s, both inside 450 s as one command each; the actuals agree within 2 s.
Runner body time, process time and lock wait are kept apart above (for example the ratios: suite 287.89 s, runner total 288.09 s, process 288.311 s, wait 0.085 s).

## 5. CI manifest, CI loss and documents

- `.github/scripts/generator-quick.json`: `pipeline` 154 to 151 tests, 317.3 to 30.2 s measured, projection 360 to 60 s; `player` 69 tests, 139.4 to 23.4 s, projection 180 to 50 s (a margin of
  about 2 over the measurement, as the other 15 to 28 s shards have, 1.9 to 2.1: not the proposal's historical subtraction). MS08a's counts and provenance paragraph are kept and an MS07f
  sentence is appended; group and job IDs, factor 3, overhead 180 s and the 30-minute limit are unchanged (job projections: `pipeline` 360 s, `replay-player` 330 s, of 1,800 s); the other
  shards are not remeasured in the manifest. No workflow or script is edited, and the two workflows' header comments (manual suites outside CI) stay true.
- **Accepted CI loss (S-OD8).** The three generation-cost ratios and the two real mega16 replays no longer gate a pull request. Manual validation now: the four relocated cases passed
  (section 3). Final owner: MS18e reruns the four cases on the final source. Still quick: the structural event tests (`'off'` builds no event in the loops, `'summary'` builds metric events only, the
  contract tests of every mode), the digging and full-grid cost tests, the classic9 Hell 1 case, and the replay goldens G01-G14 (which include samurai Nightmare G13 and mega16 Hell 2 G14, not the two
  mega16 requests).
- **IR67, the ten places** (old to new): `DEVELOPERGUIDE.md` 910, 922, 979 (was 972; 3,505 to **3,560**) and 1386 (was 1379; 1,749 to **1,807**); `DEVELOPERGUIDE.vn.md` 665, 676, 732 (was 725; 3.505 to **3.560**) and 1131
  (was 1124; 1.749 to **1.807**); `generator/design.md` 1936 (3,505 to **3,560**); `player/design.md` 442 (1,749 to **1,807**). The three Player lines are counted as directly affected references. No old total (3,505, 1,749,
  3,563, 1,750) remains in the guides, designs, `AGENTS.md`, `README.md` or `docs/architecture.md`.
- Other document edits: both developer guides ("Continuous integration" paragraph: the four moved cases, the accepted loss, how to run them by name); `generator/design.md` 15.1 (the manual suites now 1,148 tests,
  the same statement), 15.2 (rows `pipeline.test.js`, `variants.test.js`, `perf.test.js`, `steps/player/result-view`) and the sentence about the 35 % cost of full recording (line 188: asserted by `perf.test.js` for whole generations and
  `pipeline.test.js` for digging); `docs/difficulty-v3/recovery-quick-cost.md` (new MS07f section, status pointer). No duration is quoted in a guide or a design.
- No production, engine, solver, generator, qualification, weight, seed, expected-fixture, workflow, runner, `tests.html` or `AGENTS.md` change.

## 6. Acceptance

| ID | Result | Evidence |
|---|---|---|
| MS07f-B01 | met | section 1: only membership and scaffolding changed; every request, seed, limit, helper and assertion is identical (33 checks) |
| MS07f-B02 | met | section 5: the CI loss is written in both guides, the design, the manifest provenance and the cost report; the four cases passed manually; MS18e is the final owner |
| MS07f-T01 | met | three ratio tests in manual `perf`, own describe, hard failures (no skip or wrapper), 120000 ms, 5/4/4 measurement attempts, Easy 1-24 and Normal 1-2; 3 of 3 passed |
| MS07f-T02 | met | classic9 Hell 1 seed 3 quick (1 test, ordinal 25, 60000); the two mega16 tuples in one manual `variants` case in the original order (1 test, ordinal 323, 60000); 1 of 1 passed; helpers unchanged |
| MS07f-T03 | met | section 2 and `reconcile.txt`: -3 quick, `player` 69, manual +4, registered +1; both complete quick sets and the four manual cases have actual results, 0 failed, 0 skipped |
| MS07f-T04 | met | manifest updated from the actual inventories and times, MS08a additions kept, check exit 0, manual cases outside CI |
| MS07f-T05 | met | section 5; before/after costs in the cost report and section 4; nothing else changed |

## 7. Named items

- **S-AV08 (standing quick cost): implemented, new value 296.670 s for the Generator (sum of the four group commands; 293.5 s as per-shard process seconds), 35.012 s for the Player.** It is 3.3 s under
  five minutes, an observed margin smaller than the 8 s run-to-run spread of two MS08a runs; the proposal's "about 300 s" is a projection, not a promise, and nothing here approves a further move (the next
  candidate named in the checkpoint, the `difficulty-floor` small-samples case, 16.5 s, is not moved). MS18e keeps the final cost/tier audit.
- No new item. S-AV01 to S-AV30 other than S-AV08 are untouched (this task changes no generation, rating, offer or qualification).
- Observation, not an item: the replay case's classic9 request is generated by an earlier quick test, so the proposal's "about 6 s that stays quick" is already paid by that test; the move therefore removed the
  whole 116 s of the case, not 110 s.
