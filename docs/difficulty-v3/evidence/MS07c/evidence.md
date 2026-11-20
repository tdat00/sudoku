# MS07c evidence: the cutoff override, the 72-request selection (C = 4), the new default, E, the pilot, the cost record and the quick sets

Branch `rating-v3`, HEAD `1ee14fc` (MS07b), nothing staged or committed and no git command of mine (the soak's own ledger
reads the commit and the dirty state through its `gitState`, as it always did). Start 2026-11-15T06:25:58+07:00, end
2026-11-15T07:59+07:00. Node v26.13.0, Windows x64, AMD EPYC 7763 (16 cores), time factor 2. Every command that could
take more than 10 s went through the sudoku lock wrapper (`Invoke-Dv3Node`, 540 s ceiling, compounds planned at 450 s or less,
16 s between commands); the improve-generating job ("IG") was waited for, never touched. Pre-announcing to the orchestrator
cannot be done in this non-interactive run: the lock files were the slot, as in MS07b. There is no diagnosis gate in this task;
its selection rule is reported as a table in section 4.

## 1. Verdicts

| Item | Result |
|---|---|
| Override | `--chain-window=4\|6` in `generator/tests/soak.js`: set once after the sources load and before the ordered-prefix check, the references and every request; restored in `finally`; every other value is a usage error (exit 2) before any request, `--no-gate` included; the ledger says `meta.chainWindow` (asked, `null` when not) and `meta.chainShortMax` (in force); `mergeShards` refuses shards of different cutoffs |
| Tests | `difficulty-diagnostics` 85 to **94** (+9: 7 soak cases with scripted requests, 2 pure helper cases); `techniques` 186 to 187 (the new `forcingChain` boundary negative); no other count changes; four mutations detected (section 2) |
| The 72-request experiment | C = 4: **36 of 36** exact; C = 6: **24 of 36** (classic9 12 / 2, diagonalX 12 / 10, Jigsaw 9 12 / 12); no error, no invariant violation; one identity for all six ledgers |
| Selection (R9, tie = 6) | **C = 4**, the default of `SG.chainSearch.SHORT_MAX` since this task (one literal of `core/js/engine/tech-chain.js`) |
| E (GG / GR / GH) | complete, on the final source `d591e6f6...`: **37 of 520 hashes changed** (classic9 and diagonalX Nightmare only); wires G10 and G13 changed (both now exact); analyses G03, G04, G05, G06, G07, G10, G13 and G14 changed; GH: only the `forcingChainLong` example |
| Hell 1 pilot (default changed) | 2 requests, 5,559.6 and 5,571.3 ms generation, both in band and shallow (0 of 2 exact); GD 20 x mean 111.3 s, GQ 40 x mean 222.6 s |
| Split-ID cost record | `pattern-cost.js --ids=forcingChainLong,nishioDeep --runs=20`: 7 of 7 cases complete, none capped, largest 10,039 of 50,000 units |
| IR59 | the guard of the dig refused nothing in 221,824 solves of the six cells and 18,306 of the pilot (an observer outside the soak) |
| IR60 | the setter (the soak) accepts 4 and 6 only; the engine's reader is unchanged (section 2) |
| Quick sets | final run of the fix round (`quick-fix/`): Generator **3,459 of 3,459** (684.3 s over the four CI groups, fingerprint `d32f1d9e...41827`), Player **1,750 of 1,750** (34.2 s, `dfb21962...9c323`), every file `complete` and `sourceStable`; `generator-suites.sh check` exit 0 (3,459 of 3,459 in exactly one shard). The run before the fix round (`quick/`, fingerprint `1fa64d9d...e38f9` and `ac24d3ed...9dcac`) is kept; section 13 |

## 2. The override, its tests and the checks of the checks (steps 1 and 2)

**`generator/tests/soak.js`** (header, usage, `parseArgs`, `main`/`execute`, `applyChainWindow`, `metaOf`, the printed header line): `main` parses,
loads the sources, calls `applyChainWindow(SG, opts.chainWindow)` and runs the rest (`execute`, the former body) in a `try`
whose `finally` puts the previous value back, so an error, a refusal of the weights or a normal end all restore it. The
flag text must be exactly `4` or `6` (`4.0`, `04`, `+4`, ` 4`, the empty text, `Infinity`, `NaN`, `0`, `1`, `3`, `5`, `11`, `12` are refused); a source without
`SG.chainSearch.SHORT_MAX` refuses the flag too (exit 2, before any generation). With the flag the text says
`Short-chain cutoff C: 4 (--chain-window; forcingChain 1 to 4 links, forcingChainLong 5 to 12)`; without it nothing is printed and nothing is
written to the setting.
**`generator/tests/fixtures/difficulty-diagnostics.js`:** `shardIdentityOf` adds `chainWindow` and `chainShortMax` (so C = 4 and C = 6
shards, and an explicit window against none, are refused); `chainsOf` counts the proofs of the long and the deep windows
(`forcingChainLong` lengths, `nishioDeep` depths) with the short ones, the diagnostics MS07b handed over (without it a C = 4 ledger would hide every
chain of 5 to 12 links).

**IR60.** SA1 asked for a range check "where MS07c owns the setter". The only setter is the soak, and R9 compares 4 and 6 only, so the
check is there and stricter than the range 1 to 11 (the flag and `applyChainWindow` both accept 4 and 6 only). The engine's reader
(`shortMax()` of `tech-chain.js`: a number, floored) is **unchanged**: T03 allows a default-only production change, and no production path sets C.

**Tests** (`generator/tests/suites/difficulty-diagnostics.test.js`, new `describe` "MS07c: the short-chain cutoff of a run (--chain-window)" and two pure cases):
the engine's value before a run is the selected default (one premise constant, `SELECTED_C`, which is the only line that follows the
default; the override tests do not depend on it); without the flag nothing is written to the setting and the ledger says `null` and the value in force;
for 4 and for 6 the setting is written exactly twice, `[C, previous]`, and the value read at the ordered-prefix check, at every sampled reference and at
every generation is C; it is put back after an error of the generation and after the refusal of the weights; every other value (19 texts, with and
without `--no-gate`) is a usage error with the usage text, no event and no file; a source without a cutoff refuses the flag; real shards of C = 4 merge, of C = 4 and C = 6 or of
C = 4 and none do not (`ledger 1 differs from ledger 0 in chainWindow` and `chainShortMax`); the chain lengths and depths of the long windows are counted. The suite
runs in 12.4 s (94 tests).

**Checks of the checks** (four mutations, labelled M1, M2, M3 and M5; no M4 was run; each applied by hand to the source, the nine MS07c cases run, the source restored and its hash verified): M1 the
`finally` without the restore: 3 tests fail; M2 the shard identity without the two fields: 2 fail; M3 `chainsOf` of the short ids only: 1 fails; M5 the accepted
values `4`, `5`, `6`: 1 fails. All four mutations together: 7 of the 9 cases fail (the console output of that one run was read and not saved as a transcript, so the counts are what it printed); on the final
files the suite passes 94 of 94 (`focused-2.txt`).

**The guard observer (IR59).** `generator/tests/artifacts/difficulty-v3/MS07c/guard-probe.js` is loaded with `node --require` (so the soak command and its `argv`
are unchanged): it wraps `SG.logicalSolver.solve` to count the calls and the throws of the dig's guard code `digger.objectiveGuard`, and the entry
points of a request for the count per request; stand-in test `guard-probe-selftest.js` (3 solves, 1 refusal, 2 requests, results unchanged). Result in the
`*.guard.json` records beside every ledger: see section 3.

## 3. The 72-request experiment (step 1, T01)

Identity of the six ledgers: engine source `ddf2fa5ad4498e7534b22e8ca3492e9bc7961526f1775db451a580399fded000` (the accepted MS07b source), tool
`efff9dcd558e04dc17df7ba0a5778da35006b116d8ebca2bcda248ff3012b3c7` (the soak and its two helpers, after this task's edits), Node v26.13.0, commit `1ee14fcf...`, dirty, seed base
20260101, allowance 256, `--no-gate`. One locked command per cell, C = 4 then C = 6 of one board back to back, 16 s apart; a sequencer
(`run-cells.ps1`) with the cell projections 200, 300 and 60 s (MS06d's times of the same cells on the earlier source, tripled) stopped at the first anomaly
(an exit other than 0, an incomplete ledger, another cutoff, another identity) and found none. Started 06:35:58, ended 06:39:34 (`run-log.jsonl`).

```powershell
node tests\soak.js --variant=classic9 --level=nightmare --count=12 --seed=20260101 --no-gate --chain-window=4 --json=..\docs\difficulty-v3\evidence\MS07c\4\classic9-nightmare.json
node tests\soak.js --variant=classic9 --level=nightmare --count=12 --seed=20260101 --no-gate --chain-window=6 --json=..\docs\difficulty-v3\evidence\MS07c\6\classic9-nightmare.json
```

(and `diagonalX`, `jigsaw9`; the commands actually run are `node tee-run.cjs <transcript> --require guard-probe.js tests\soak.js ...`, the first line of each transcript).

| Cell | C | Exact | Shallow (in band) | Errors | Invariants | Command s | Projection s | Generation s (p50 / p95 / max ms) | Attempts | Full ratings | Guard: refusals / solves |
|---|---:|---:|---:|---:|---|---:|---:|---|---:|---:|---|
| classic9 | 4 | 12 | 0 | 0 | I1 to I7 ok | 2.889 | 200 | 2.112 (146 / 512 / 512) | 14 | 785 | 0 / 6,390 |
| classic9 | 6 | 2 | 10 | 0 | ok | 38.412 | 200 | 31.761 (3,050 / 3,369 / 3,369) | 83 | 14,848 | 0 / 80,006 |
| diagonalX | 4 | 12 | 0 | 0 | ok | 6.498 | 300 | 4.745 (264 / 1,481 / 1,481) | 13 | 696 | 0 / 9,680 |
| diagonalX | 6 | 10 | 2 | 0 | ok | 73.360 | 300 | 62.807 (5,027 / 10,658 / 10,658) | 56 | 14,314 | 0 / 93,846 |
| Jigsaw 9 | 4 | 12 | 0 | 0 | ok | 2.893 | 60 | 1.918 (142 / 481 / 481) | 13 | 701 | 0 / 7,382 |
| Jigsaw 9 | 6 | 12 | 0 | 0 | ok | 10.008 | 60 | 8.733 (424 / 2,705 / 2,705) | 22 | 3,138 | 0 / 24,520 |

Totals: C = 4 **36 / 36** exact, 12.3 s; C = 6 **24 / 36** exact, 12 shallow, 121.8 s. Every diagnostics line is `PASS` (request errors 0, check errors 0, reference
and final-path errors 0, work unavailable 0, exact flag against the derived certificate: 0 disagreements); `qualified` equals `exact` in all six cells (12, 2, 12, 10,
12, 12). The soak's own p95 flag against design 9.1 reads `ok` for all three C = 4 cells and `SLOW` for classic9 (3,369 against 2,500 ms) and diagonalX (10,658 against
3,000 ms) at C = 6. Computed by `summarize-experiment.cjs` into `experiment-summary.json` (per cell: exact and miss indexes, work, step counts, chain-length histograms, guard counts,
identities). The old fixed-board observation (C = 6: 0 of 12, C = 4: 2 of 12) is not this experiment's denominator and is not used.

## 4. The selection rule (R9, owner SA1-Q-S1(c)), applied

| Predicate | Value |
|---|---|
| total exact hits at C = 4 (36 requests) | 36 |
| total exact hits at C = 6 (36 requests) | 24 |
| every timeout or error counted as a miss | yes (there was none: 72 of 72 puzzles returned) |
| C = 4 total > C = 6 total | true |
| tie (then C = 6) | false |
| **selected** | **4** |

Nothing here is ambiguous and no datum contradicts the task: the rule needs the two totals, and they differ by 12. The change is the literal `INITIAL_SHORT_MAX` (6 to 4) and its two comments in
`core/js/engine/tech-chain.js`; the long ceiling 12, the depths, the weights, the work limits, the orders and the offers are unchanged. Engine source hash `ddf2fa5a...` to
`d591e6f636896597ce009ac206456c4074f9a12f21527cf3fd8c30dbf7687885`.

## 5. What the default changes: tests, fixtures and pins (steps 3, T02)

All of these follow the selected default; none is fitted to a label or weakened (the assertions keep their point and are re-derived).

| File | Change | Reason |
|---|---|---|
| `core/tests/suites/tech-chain.test.js` (107 to 107) | the premise "C is 4 to begin with"; the fixture test follows the window (a chain of up to C links is `forcingChain`'s, a longer one `forcingChainLong`'s, the other id finds nothing); the "exact" test uses the owner of each fixture; the longest short chain equals C; "reads C at every call", "refuses a SHORT_MAX that is not a number" and "narrows its window" no longer assume the default (explicit cutoffs; the empty-window maxima follow C); the solver-option test allows both windows; the positions of the 12 long-chain puzzles (7 or 8 links) are built with C = 6 (`longStuckItem`) | at C = 4 the stuck position of `forcingChain` still holds chains of 5 and 6 links, so "stuck below the long chains" means C = 6 for those puzzles |
| `core/tests/fixtures/techniques.js` (`techniques` 186 to 187) | the two `forcingChainLong` positives are the first proofs of two dug puzzles under C = 4 (5 links `[14,3]`, 6 links `[10,2]`) where they were 7 and 8 links; a new `forcingChain` negative at the boundary (a 5-link chain is not its window's); supplements renamed | the long window now starts at 5 links; the boundary fixture is the T02 "boundary" case |
| `generator/tests/fixtures/rated.js`, `suites/difficulty-floor.test.js`, `manual/difficulty.test.js` | `constructed-nightmare-1` and `-3` are Hell 1 (like `-2` since MS07b), `required` at the Nightmare label for all three; the manual suite's "keeps the level of its label" contract and its `moved` list name the three | their chains of 5 and 6 links are `forcingChainLong`'s (1,400): scores 2,704 (`-1`, 2,178 at C = 6) and 2,642 (`-3`, 2,148 at C = 6), Nightmare to Hell 1, `required` false before and after (R20; `rated-scores.txt`); `-2` (Hell 1 since MS07b) scores 2,662 instead of 2,632; the manual suite is **not run** (the contract was already false for `-2` since MS07b and is repaired here) |
| `generator/tests/suites/pattern-cost-tools.test.js` (32 to 32) | 8 cases for `forcingChain` and `nishio`, not 7 | the new negative fixture |
| `generator/tests/fixtures/replay-wire.js`, `replay-goldens.js`, `regression.js`, `player/js/ui/help-examples.js` | regenerated by E (section 6) | the default |
| `generator/tests/fixtures/replay-recording.js` | a jump's `firstUse` and `key` go on two lines when one line would pass 120 characters | the key `technique.forcingChainLong.step.contradiction` made four lines 122 to 124 long; `replay-recorders` asserts at most 120 |
| `generator/tests/suites/replay.test.js` (154), `steps.test.js` (57), `player.test.js` (69) | the exchange specimen is G04 (G07 has none now): one exchange removing 2 and restoring 2, the compact exchange step `[1, 2, 2]`, 29 details steps; only G14 has an avoided jump; the stuck board of G01 counts `forcingChain` 3 and `forcingChainLong` 1; "unverified" is shown on G06; 14 compact, 17 details and 21 distinct jumps (31 in all) in the 14 goldens; two choices are "combined" (G07 step 5, G10 step 7); G06's details jump is R5C9 (48 to 530); the sentences of G05 (position 29, together) and G13 (1,858) and the first deductions of G10 (a placement) and G13 (candidate 1) | the goldens changed; G07 and G10 now end in an exact puzzle after a multi-move step |
| `generator/tests/suites/cache.test.js`, `worker.test.js`, `pipeline.test.js` | the shallow-fallback specimen is `classic9` Nightmare seed 5 with one attempt (exact false, level Nightmare, both warnings) where it was seed 42 | seed 42 is exact at attempt 1 under C = 4 (the scan of seeds 1 to 40: shallow fallbacks 5, 10, 14, 21, 24, 26, 29; `q-shallow-seeds.cjs`) |
| `generator/design.md`, `DEVELOPERGUIDE.md`, `.vn.md`, `player/design.md` | the selected cutoff and its rule, the override, the ledger fields, the shard identity, the chain statistics of both windows | the same change |
| `.github/scripts/generator-quick.json` | counts and seconds (information only) | 3,459 and 1,750 tests |

## 6. E (GG / GR / GH) on the final source (step 3, T02)

Plans: `generator/tests/artifacts/difficulty-v3/MS07c/plan-{wire,analysis,hashes}.json` (MS07b's shards, each with its own projection, 2 x MS07b's measurement + 5 s; `make-plans.cjs`), driver `run-shards.cjs`
(one child per shard, exit codes kept), hashes by `run-hashes.ps1` (four compounds). Every shard exit 0 and within its projection (`shard-runs.jsonl`, `logs/`).

- **Hashes (GG):** 104 shards 314.6 s node time (slowest `g-hash-killer-hard-05` 27.8 s), 520 of 520 keys once, "recorded from the current sources" (`9d18d5c0...`).
  `hash-check-before-write.txt`: **37 of 520 changed**: classic9 Nightmare seeds 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 377, 610, 987, 1597, 2584, 6765, 10946 (18) and diagonalX Nightmare
  seeds 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 4181, 6765, 10946 (19); none elsewhere. Written (`hash-update.txt`), re-checked: all 520 unchanged
  (`hash-check.txt`).
- **Wires (GR):** 5 shards, G09, G11, G12 match; **G10** (Killer Nightmare seed 42: shallow after 8 attempts, score 2,151, to exact at attempt 4, score 2,051, `forcingChainLong` x1) and **G13**
  (Samurai Nightmare seed 42: shallow after 2 attempts, score 1,637, to exact at attempt 1, score 2,021, `forcingChainLong` x1) changed
  (`superseded-before-recorder-layout/wire-check-before-write.txt`); written and re-checked (`wire-check.txt`).
- **Analyses (GR):** 14 shards; G01, G02, G08, G09, G11, G12 match; **G03, G04, G05, G06, G07, G10, G13, G14** differ (9 to 75 fields each: `forcingChain` steps of 5 or 6 links are
  `forcingChainLong` with a higher score, and in G04 to G07, G10 and G13 the dig itself ended elsewhere) (`superseded-before-recorder-layout/analysis-check-before-write.txt`); written (`analysis-write.txt`:
  483 lines) and re-checked (`analysis-check.txt`).
- **The layout change and the second recording.** The first recording (`superseded-before-recorder-layout/`: wire and analysis ledgers, their checks, logs and
  `shard-runs.jsonl` lines 1 to 19) was on the source before the `replay-recording.js` edit that the `replay-recorders` suite required (a layout rule: the four long lines of
  the new keys). That file is one of the four recorder files of the ledger identity (MS07b `9fe78e3a...`, the first recording `e0a59bb8...`, the final `461933ba...`), so the five wires (42.2 s) and the 14 analyses (62.1 s)
  were recorded again; the data are identical (every shard "matches") and only the text of `replay-goldens.js` changed (479 to 483 lines).
- **GH:** `make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong,nishio,nishioDeep --sources=tests\artifacts\difficulty-v3\MS07b\sources.json --max-puzzles=16 --max-hints=400`
  `--check`: only `forcingChainLong` differs (56 fields: the same discovered puzzle, Nightmare seed 3, now gives a 6-link contradiction where it gave a 7-link forced chain); `--write`, `--check`
  clean (`gh-check-before-write.txt`, `gh-write.txt`, `gh-check.txt`); the complete catalogue check (28 IDs, `--max-puzzles=64`) passes (`gh-check-all.txt`).

Focused runs on the way (`focused-1.txt` first, after E: 25 failures in `difficulty-diagnostics`, `difficulty-floor`, `pattern-cost-tools`, `replay`, `replay-recorders`, `steps`; the
rest in the sections above; `focused-2` to `focused-5`; `quick-try1/`: the first complete quick run, 4 failing tests of `player`, 2 of `cache` and `worker` and 1 of `pipeline`, all
re-derived above) are kept as records of what failed and why.

## 7. The Hell 1 pilot (step 4: the default changed, so it is repeated once)

`node tests\soak.js --variant=classic9 --level=hell1 --from=0 --count=2 --total-count=2 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\MS07c\hell1-pilot.json` (under the
guard observer), exit 0, 17.2 s command, final source `d591e6f6...`, C = 4 by default (`meta.chainWindow` null, `meta.chainShortMax` 4). 07:01:07 to 07:01:44.

| Request | generation ms | score | in band | exact | shallow | full ratings | steps (`forcingChain`, `forcingChainLong`, `nishio`) | guard |
|---|---:|---:|---|---|---|---:|---|---|
| `classic9:hell1:0` | 5,559.6 | 2,518 | yes | no | yes | 1,152 | 2, 5, 0 | 0 of the solves |
| `classic9:hell1:1` | 5,571.3 | 3,266 | yes | no | yes | 1,086 | 3, 7, 2 | 0 of the solves |

Mean 5,565.4 ms (MS07b at C = 6: 5,142.5 ms, +8.2 %). The unchanged 20-request GD batch projects to **111.3 s** (20 x mean; 102.8 s before) and the first 40 GQ requests to **222.6 s** (40 x
mean, serial; 205.7 s before); with the soak's own checks (8.6 s per request) 172 s and 345 s; all under 450 s. Neither request is exact: the chains stay within 6 links and Nishio at depth 1, so no
`nishioDeep` step (S-AV25 now: none in 30 Hell 1 generations on the two cutoffs). The pilot is not selection evidence. Guard refusals 0 of 18,306 solves.

## 8. The split-ID cost record (step 4, GP-cost)

`node tests\pattern-cost.js --ids=forcingChainLong,nishioDeep --runs=20 --json=..\docs\difficulty-v3\evidence\MS07c\pattern-cost.json` at the selected default (source `d591e6f6...`, fixtures `8cf28004...`, tool
`36b2a777...`), 0.9 s command, exit 0: 7 of 7 cases x 20 runs (140 finds), complete, 4 found and 3 none as the fixtures say, none capped, wall 0.27 s.

| Case | Outcome | Work (of 50,000) | ms p50 / p95 / max |
|---|---|---:|---|
| `forcingChainLong:positive:1` (5 links) | found | 5,930 | 0.289 / 0.749 / 1.527 |
| `forcingChainLong:positive:2` (6 links) | found | 10,039 (20.1 %) | 0.332 / 0.420 / 0.753 |
| `forcingChainLong:negative:1` (hard-platinum, no chain) | none | 4,562 | 0.105 / 0.142 / 0.190 |
| `forcingChainLong:negative:2` (a 4-link chain is `forcingChain`'s) | none | 1,641 | 0.040 / 0.062 / 0.075 |
| `nishioDeep:positive:1` | found | 5,184 | 9.032 / 10.510 / 12.614 |
| `nishioDeep:positive:2` | found | 775 | 1.551 / 1.671 / 1.691 |
| `nishioDeep:negative:1` | none | 177 | 0.325 / 0.363 / 0.402 |

The record is cost evidence for the owners of the finders (MS07e, MS18d), not a timing assertion. The 20-run default and the 480 s budget are the tool's own.

## 9. Quick sets and the CI check (final tree, after the review fix round)

One CI group per locked command (`run-quick.ps1 -Results quick-fix`: `generator-quick.js run <group> --results-dir=quick-fix`, then the Player `node tests\node-runner.js --results=...`), 08:20 to 08:33. All nine result
files are `complete: true` and `sourceStable: true`. **Generator fingerprint `d32f1d9e0048c4ee04a4a51a0095fd6da4e9b4b82434d2c84cf2fd93e2441827`** (all eight shards), **Player fingerprint
`dfb21962bc901fdf4a288667bf818b8301fe5e24f3f7dfcf2de6b2e105b9c323`**. Both fingerprints changed against the first run of this task (`quick/`: `1fa64d9dd5c223600bb97f41f216a510bf14b9f3c23642bbc634921d0b3e38f9`
and `ac24d3edeefedc81e6a6e79dbe43ab3f081254f852f17e6d2f358de179c9dcac`) because the fix round edited the design table (Generator only) and a comment of `tech-chain.js` (both).

| Group (one locked command) | Shards (tests, runner seconds) | Command seconds |
|---|---|---:|
| `shared-small` | core-shared 1,210 (26.3), steps 57 (15.9), replay 154 (15.1), mega 108 (10.3) = 1,529 | 69.86 |
| `own-suites` | own-fast 1,632 (164.6), digger-target 75 (1.6) = 1,707 | 167.74 |
| `pipeline` | pipeline 154 (310.6) | 311.37 |
| `replay-player` | player 69 (134.6) | 135.31 |
| **Generator** | **3,459 of 3,459 passed, 0 failed, 0 skipped** | **684.27** |
| Player (`node tests\node-runner.js`) | **1,750 of 1,750 passed** (33.8) | 34.23 |

Before and after: Generator 3,449 to 3,459 (+10), Player 1,749 to 1,750 (+1); standing cost 744.9 s to **684.3 s** (-60.6 s, -8.1 %: `pipeline` 328.4 to 311.4 s, `replay-player` 165.9 to 135.3 s, steps and replay
by 2.7 s each; the changed goldens and requests end earlier; the first run of this task gave 683.7 s). `bash .github/scripts/generator-suites.sh check`: **exit 0**: "Every quick test is in exactly one shard (3459 of 3459), no manual or unknown
suite, no empty shard, every job inside its limit" (`quick-fix/ci-check.txt`). The first complete run, with seven failing tests that this task then re-derived, is `quick-try1/`. The focused runs of the fix round
(`tech-chain`, `help`, `i18n`, `techniques`, `difficulty-floor` of the Generator, 455 of 455; `tech-chain`, `help`, `i18n` of the Player, 200 of 200) are `focused-fix-generator.txt` and `focused-fix-player.txt`.

## 10. Named items (S-OD4: numbers, not stops)

Inherited list unchanged: S-AV01 to S-AV15, S-AV18 to S-AV26 (S-AV16 and S-AV17 withdrawn), MS05r6a-COV01. Numbers are proposed, for the orchestrator to confirm. None is a stop; every correctness, evidence
and soundness check passed.

| Item | Numbers | Route |
|---|---|---|
| **S-AV08** (standing quick cost), re-measured | the four Generator groups **684.3 s** against 744.9 s at MS07b (-60.6 s, -8.1 %); Player 34.2 s. `pipeline` 310.6 of 360 s, `player` 134.6 of 180 s | MS07e |
| **S-AV04** (samurai Nightmare / G13) | on the new source the golden request is exact at attempt 1 (score 2,021) and the wire shard took 0.67 s; MS07b's source: shallow after 2 attempts. A single request, not a qualification | MS07e re-measures; MS18c/MS18d |
| **S-AV07** (classic9 Nightmare exactness) | the 12 requests of the window cell: **12 of 12** exact at C = 4 (2 of 12 at C = 6) | MS07e, MS18c |
| **S-AV20** (diagonalX Nightmare shallow) | window cell: 0 of 12 shallow at C = 4 (2 of 12 at C = 6) | MS07e |
| **S-AV19** (design 9.1 p95 flags) | window cells: `ok` at C = 4 for classic9 (512 ms against 2,500), diagonalX (1,481 against 3,000) and Jigsaw 9; `SLOW` at C = 6 for classic9 and diagonalX; Hell 1 stays `SLOW` (5.6 s against 2,500 ms) | MS18d |
| **S-AV26** (classic9 Hell 1 cost) | pilot at C = 4: mean 5,565 ms (+8.2 % against MS07b's pilot); GD 111.3 s, GQ 222.6 s | MS07e, MS18d |
| **S-AV25** (Hell 1 exactness) | 0 of 2 exact at C = 4; no `nishioDeep` step in 30 Hell 1 generations on the two cutoffs; the classic9 Hell 1 GD batch (at least 90 % of 20) is still expected to fail | MS07e, MS18c |
| **S-AV02, S-AV03, S-AV24** (mega Nightmare and Hell 1), **history on their own sources** | the 28 deep records are two sets of 14. The 14 Hell 1 records (MS07b, `ddf2fa5a...`) describe C = 6. The 14 Nightmare records (MS05r5m, `fee8b8d6...`) predate the split: chains of up to 12 links were Master's `forcingChain` and the Nightmare tier was the old `nishio` (depth up to 2), so they describe neither cutoff. The default is in the generation path, so neither set describes the current source (`d591e6f6...`). Nothing was rerun here: the numbers (mega12 Nightmare 23.5 to 25.2 s, mega16 80.4 to 117.0 s, Hell 1 29.3 to 123.3 s, 0 of 28 exact) are **historical**, not comparable with a C = 4 measurement; at C = 4 they are unmeasured (the quick one-attempt mega12 Nightmare and Hell 1 smokes pass) | MS18e reruns the complete population on the final source; MS07d and MS07e treat these records as history and do not compare them as current |
| **S-AV22** (request-level exact losses), window-cell numbers | MS06d's Nightmare losses are classic9 request 1 and diagonalX request 6 (the same tags and seeds as this experiment's cells, base seed 20260101). C = 4: both exact (classic9 12 of 12, diagonalX 12 of 12). C = 6: both are misses (classic9 misses 1 and 3 to 11, diagonalX 5 and 6) | MS07e, MS18c |
| **S-AV23** (jigsaw9 cost under the target), window-cell numbers | Jigsaw 9 Nightmare, 12 requests: C = 4 12 of 12 exact, generation 1.918 s, median 142.2 ms, p95 481.3 ms, 701 full ratings (median 35); C = 6 12 of 12 exact, 8.733 s, median 423.5 ms, p95 2,705.3 ms, 3,138 full ratings (median 107). MS06d's ratio against the pre-target generation is not re-measured here | MS07e, MS18c/MS18d |
| **New: the manual `difficulty` suite** | MS07b's edit left its "a constructed puzzle keeps the level of its label" contract false for `constructed-nightmare-2` (Hell 1 since MS07b); this task names all three. The suite was not run (heavy tier); its first run is MS07e's GD | MS07e |
| **IR59** | no item: 0 guard refusals in 240,130 solves | |

## 11. Deviations from the task file, handoffs

1. **Chain statistics of the long windows** (`difficulty-diagnostics.js` `chainsOf`): MS07b handed it to MS07c (and SA1's IR61 repeats it); the task file does not name it. Without it a C = 4 ledger shows none of the 5- to 12-link chains.
2. **The guard observer** (`guard-probe.js`) is outside the task's tools, a read-only `--require` module: IR59 asks to "check its effect", and the statistics cannot tell a guard refusal from a stuck solve. It changes no argument, result or error and adds one wrapper call per solve.
3. **IR60 at the setter only** (section 2); the engine's reader is unchanged because T03 allows a default-only production change.
4. **A change of the recorder tool** (`replay-recording.js`, the layout of one line) and the second recording of the GR ledgers, because the keys of the long ID made a generated line 122 to 124 characters long and `replay-recorders` asserts at most 120. The alternative, raising that assertion, would have weakened a test.
5. **The manual `difficulty` suite** edited (the B bundle lists it for current reference contracts) and **not run**.
6. **A new `forcingChain` negative** at the window boundary (+1 test, +1 pattern-cost case) and the 7- and 8-link positions built with C = 6.
7. **No announcement** before the heavy gates in a non-interactive run (the lock was the slot).
8. **No git command**; `generator/tests/artifacts/difficulty-v3/MS07c/check-format.cjs` replaces MS07b's `git status`-based check with explicit paths.
9. **No qualification and no GQ-first** (not this task's gate); the Hell 1 pilot is repeated once, as the task says for a changed default.
10. `generator/tests/artifacts/difficulty-v3/MS07c/` holds the tools and probes of this task (`run-cells.ps1`, `run-shards.cjs`, `make-plans.cjs`, `run-hashes.ps1`, `run-quick.ps1`, `tee-run.cjs`, `guard-probe*.js`, `explore.cjs` and its `q-*.cjs` questions, `summarize-experiment.cjs`, `check-format.cjs`, the plans).

Handoffs: **MS07d/MS07e:** the selected default (4), the pilot (111.3 s GD, 222.6 s GQ projections), the cost record, S-AV25 (the classic9 Hell 1 GD batch expected to fail) and the manual-suite note; the
Nightmare cells are now quick and exact (12 of 12 in all three), so the first checkpoint's Nightmare numbers are not comparable with MS06. **MS18b:** repeats the R9 rule on the final source. **MS18e:** the final-source
rerun and reconciliation of the complete Nightmare and Hell 1 deep population (every record of MS05r5m and MS07b is on an earlier source).

**Unmeasured side effects of C = 4, for MS07e (IR66).** The Nightmare-only experiment did not measure these three; GQ and GD are their first evidence on the current source, and a failure is a new named item attributed to this source:

- **Master availability.** Master loses the 5- and 6-link chains from its oracle and its tier. The 40 Master regression hashes did not move, but Master's availability at C = 4 is first measured by GQ.
- **Greater-Than Nightmare's CV6 margin** (19,192 of 20,000 ms at the restored source) was not measured at C = 4; MS07e's GD is its first measurement on this source.
- **Large boards.** Nightmare and Hell 1 on the large boards (mega, samurai beyond the one G13 request) are unmeasured at C = 4; GQ is their first current-source evidence. The guard observer (IR59) covered 9x9 Nightmare at both cutoffs and classic9 Hell 1 only: a longer scan on a large board is a possible cause if its availability moves.

**Expectation for MS07e (SA1).** The classic9 Hell 1 GD batch (at least 90 % exact of 20) is expected to fail (S-AV25: 0 of 2 exact in the pilot, no `nishioDeep` step in 30 generations); it is an availability result, not a regression, and it is a handoff, not an S-AV number. The manual `difficulty` suite is expected to pass its certificate and "v3 reference" contracts at its first run.

**Stale mega records.** The 28 deep mega records (MS05r5m Nightmare, MS07b Hell 1) are **history on their own sources**: MS07d does not read them and MS07e must not compare them with a current measurement; MS18e reruns the population once, after the final engine change.

## 12. Where things are

- Evidence: `4/` and `6/` (the six ledgers, transcripts and guard records), `run-log.jsonl`, `experiment-summary.json`; `wire/`, `analysis/`, `hashes/`, `logs/`, `shard-runs.jsonl`, the merge outputs; `superseded-before-recorder-layout/`;
  `gh-*.txt`, `hell1-pilot.{json,txt,guard.json}`, `pattern-cost.{json,txt}`; `rated-scores.txt`; `focused-*.txt`; `quick-fix/` (final), `quick/` (before the fix round) and `quick-try1/`.
- Selection note: [docs/difficulty-v3/chain-window-2026-11-15.md](../../chain-window-2026-11-15.md); v3 notes: [docs/difficulty-v3/notes.md](../../notes.md) (MS07c).
- Scratch and tools: `generator/tests/artifacts/difficulty-v3/MS07c/`.

## 13. Review fix round (SA1 review 17: IR62 to IR66)

Text only; no code change, no E rerun. The fingerprinted files edited are `generator/design.md` and one comment of `core/js/engine/tech-chain.js`, so the focused suites and the final quick sets of section 9 were run again on the final tree.

| Item | Change |
|---|---|
| **IR62** | `generator/design.md` section 6.7, the levels table: Master "forcing chain (up to 6 links)" is now **up to 4 links**; Nightmare "long forcing chain (7 to 12 links)" is now **5 to 12 links**. A search of the designs, both guides, the Player and Generator locales and help texts, and the engine and library sources for other chain-length statements tied to `SHORT_MAX` (6 links, 7 to 12, up to 6, 7+) found no other stale text: the locale descriptions say only "up to 12 links", sections 6.6, 15.3 and 15.4 and the guides were updated in the first run, and the remaining 6 and 7-link mentions are test comments about positions built with C = 6, or history. |
| **IR63** | `docs/difficulty-v3/notes.md`, MS07c section: the R20 paragraph for `constructed-nightmare-1` (Nightmare, not required, 2,178 at C = 6, to Hell 1, not required, **2,704**) and `constructed-nightmare-3` (2,148 to **2,642**), cause `forcingChainLong`, and the new score of `-2` (2,662, was 2,632). The scores were rated again read-only under the lock (`rated-scores.txt`); no other rated entry moves. |
| **IR65** | Four mutations (M1, M2, M3, M5; there was no M4), not five: sections 1 and 2 and the notes say so. The S-AV02/03/24 row separates the 14 Hell 1 records of MS07b (C = 6) from the 14 Nightmare records of MS05r5m, which predate the split. The comment of `tech-chain.js` now reads "36 of 36 Nightmare requests exact against 24 of 36 for 6" (it said "36 exact hits in 72 Nightmare requests"). |
| **IR66** | S-AV22 and S-AV23 got the window-cell numbers; the three side effects not measured at C = 4 (Master availability, the Greater-Than Nightmare CV6 margin, large boards), the expected failure of the classic9 Hell 1 GD batch at MS07e, and the stale mega records as history for MS07d and MS07e are in section 11 and in the notes. |

Focused runs of the fixed files (`focused-fix-generator.txt` 455 of 455: `tech-chain`, `help`, `i18n`, `techniques`, `difficulty-floor`; `focused-fix-player.txt` 200 of 200: `tech-chain`, `help`, `i18n`). Final quick sets and CI check: section 9 (`quick-fix/`).
