# MS07a evidence: windowed search kernels and bounded pattern measurements

Developer: claude-sonnet-5.5. Start 2026-11-15 00:28 (+07:00); end 2026-11-15 01:48 (+07:00).
Branch `rating-v3`, HEAD `9dfc9a3` (MS06d), nothing staged or committed. Final tree: the Generator quick fingerprint
`ae9c1dfedf71ff83913245a021f5277936aca9e33f036608a3407e62c3ea86fa`, the Player's
`1b7275453fa216a553bd4b206073c1c2dcdebd71b58be6a731a4eef3ce0c4ad0` (both recomputed after the last run in
`fingerprint-generator.json` and `fingerprint-player.json`: unchanged). There is no diagnosis gate in this task.

## 1. What changed

| File | Change |
|---|---|
| `core/js/engine/tech-chain.js` | `SG.chainSearch.forcing` and `.nishio` (unregistered); the registered `forcingChain` and `nishio` are their wrappers with the old defaults |
| `core/tests/suites/tech-chain.test.js` | +27 tests (seam windows, depth windows, work limit and the pattern-work record) |
| `core/tests/suites/techniques.test.js`, `core/tests/fixtures/techniques.js` | +4 tests; the optional `supplements` map (empty) and the sweep construction that appends it after the full random population |
| `generator/tests/pattern-cost.js` (new) | the measurement CLI |
| `generator/tests/fixtures/pattern-cost.js` (new) | its pure helpers, `SG.fixtures.patternCost` |
| `generator/tests/suites/pattern-cost-tools.test.js` (new) | 28 tests; `generator/tests.html` lists the fixture and the suite |
| `.github/scripts/generator-quick.json` | `pattern-cost-tools` in the `own-fast` shard (R6C-I05), the tool in `outOfCi.tools`, counts and seconds |
| `generator/design.md` (6.6, 13.6, 15.1, 15.2, 15.4, file tree), `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `player/design.md` | the seam, the observer, the tool, the supplements; suite and test counts (3,405 Generator, 1,714 Player) |

No registration, id, window, default, help example or generated output changed. `SG.chainSearch.SHORT_MAX` is not
added (MS07b).

## 2. Kernel semantics, as implemented

* `forcing(model, state, ctx, { id, minLength, maxLength, workLimit })` and
  `nishio(model, state, ctx, { id, minDepth, maxDepth, workLimit })`. `id` becomes `Finding.technique` and the prefix of
  `i18nKey` (`technique.<id>.step[.kind]`). Defaults: min 1, max 12 edges or depth 2. Nothing is clamped (a ring of 201
  pair units gives a 101-edge proof); the Nishio maximum is only bounded by the number of cells, which no nesting exceeds.
* The search always starts at length (depth) 1 and runs up to the maximum; the minimum is then compared with the
  requested minimum and a proof below it gives `null`. A proof below the minimum ends the scan at once (the minimum can
  only fall). Tie order (first root in scan order) and the iterative deepening are those of the registered finders.
* Work: a forcing unit is one edge expansion, a Nishio unit one trial. `workLimit` absent is 50,000, `null` (or
  `Infinity`) is unbounded, a whole number otherwise; the counter is reset per call. A bounded call checks the parent
  budget at entry and before an expansion that would carry its count over a multiple of 256 (a Nishio trial always
  checks). A spent limit ends the call with `null` and `capHit: 'work'`, never with the best proof so far.
  `budget.exceeded` is "nothing found"; cancellation and every other error propagate.
* `ctx.options.onPatternWork(record)` gets a fresh `{ id, work, limit (null: unbounded), capHit, retained: null }` per call
  (also after a swallowed budget; not after a propagated error) and never selects.
* **Legacy cadence kept.** The registered finders pass no work limit: they have no entry check and no extra periodic check,
  so `budget.nodes` after a find is the same as before (existing tests assert tick counts).
* **Option errors** use the existing code `solver.invalidOption` (no new locale key).

**Note on "two paths 4/6".** The test plan's illustration cannot occur: every edge changes the polarity of the literal
and the two chains of a proof end in both polarities of one node, so their lengths always differ by an odd number
(proved in the header of `tech-chain.js`, tested over random positions by "the two chains of a proof differ by an odd
number of edges"; 1,218 real two-chain findings of 2,000 random states had 3/2, 4/3, 5/4 and 6/5). The maximum rule is
tested with 7/6 on the odd ring of 13 pair units (length 7, not 13; a maximum of 6 gives `null`) and 3/2 on a real
fixture (`scratch explore-two-path-2.js`).

## 3. Tests added

| Suite | Before | After | New |
|---|---:|---:|---:|
| `tech-chain` | 62 | 89 | 27 (11 + 4 + 12 in three new describe blocks) |
| `techniques` | 165 | 169 | 4 (supplements) |
| `pattern-cost-tools` (new) | 0 | 28 | 28 |

Generator quick 3,346 -> 3,405; Player 1,683 -> 1,714 (the shared suites). Coverage of the plan: 3-edge minimum with
min 5 -> `null`; minimum 7 with [5,12] -> Finding, max 6 -> `null`; two-path length is the maximum; Nishio depth 1 with
[2,2] -> `null`; a shorter proof on a later root (rings of 13 then 5); ties; a capped scan (every limit below the work W
gives `null`, W gives the Finding, the proof in hand at the end of the first ring is not published); chains of more than 12
edges; the registered finders equal the seam at their old defaults; state immutability; cancellation; cadence of the
checks; the exact random prefix plus supplements and the total count; the tool on fake observations, fake clocks, the real
`forcingChain` and `nishio` fixtures and as a real process.

**Mutation checks** (temporary, reverted; the file was then compared with `&& false` absent): removing the
below-minimum rejection of the forcing scan fails 6 tests, removing the Nishio one fails 3, ignoring the cap result of
the forcing scan fails 2.

## 4. Existing behaviour is unchanged

1. **Differential against the original source.** `Q:\git\sudoku.improve-generating\core\js\engine\tech-chain.js` (read
   only, never modified; 537 lines, SHA-256 `02733D67C0C41D98423A702C2DE8BC690D9FE406F8284BCDBE6787CEBB785C8D`) is the
   original text: a line comparison with the current file lists only the 34 intended removed lines (the `withBudget`
   wrapper, the hard-coded id and key, the old finder bodies). It was loaded in place of the file, in a process of its own
   (`SG_CHAIN_FILE`), next to the current one. The corpus is 2,000 random states (kinds initial, propagated, pruned) plus
   12 classic puzzles and 48 4x4 and 6x6 states, 35,020 finds of `forcingChain` and `nishio` with seven chain limits,
   five depth settings and node budgets (3, 40 and 400 for `forcingChain`, 3 and 200 for `nishio`); for each find the
   Finding, the error code and the budget ticks. Both give digest `e872019b7ce2…` in every one of the 66 runs
   (`generator/tests/artifacts/difficulty-v3/MS07a/differential.js`,
   `overhead.js`; transcript in `transcripts.txt`).
2. The existing quick suites pass unchanged, among them the tick-count assertions of `tech-chain` and the suites that pin
   generated output (`replay` 154, `steps` 57, `pipeline` 154, `player` 69, `smoke` 44 with a sample of the regression
   hashes, `mega`). No fixture, hash, golden or help example was touched; no GG/GR/GH is owned by this task.
3. **Cost of the wrappers** (S-OD4: a number, not a stop). Find-only time of that corpus, median of 8 alternating runs of
   one process each: the first form (a call per edge) 436.5 against 417.7 ms (+4.5 %); batch accounting per expansion
   433.5 against 421.3 (+2.9 %); the final form (no option validation on the registered path, batch accounting, no
   closure per call) **428.7 against 417.8 ms (+2.6 %)**, the noise of the baseline being about 1.5 %. The corpus is mostly
   short finds, so this is the per-call share; a long search pays one extra branch per literal expansion. The registered
   path allocates one `{ id, min, max, limit }` object per call. Quick cost is below.

## 5. Quick runs on the final tree (locked, one CI group per command)

| Command | Tests | Seconds (command) |
|---|---:|---:|
| `generator-quick.js run shared-small` (core-shared 1,174, steps 57, replay 154, mega 111) | 1,496 | 62.8 |
| `generator-quick.js run own-suites` (own-fast 1,611, digger-target 75) | 1,686 | 170.0 |
| `generator-quick.js run pipeline` | 154 | 323.6 |
| `generator-quick.js run replay-player` | 69 | 133.9 |
| Generator total | **3,405 of 3,405**, 0 failed, 0 skipped | **690.2** |
| Player `node tests\node-runner.js` | **1,714 of 1,714** | 31.8 |

Results of every shard with the fingerprint (`complete: true`, `sourceStable: true`): `quick/generator-*.json`,
`quick/player-quick.json`. The first pass (before the cost reduction of section 4.3, fingerprint `b7bf8666…377598`, 696.2 s)
is kept as `quick-superseded-first-pass/`: its source differs from the final one only in `tech-chain.js`.
**CI check:** `bash .github/scripts/generator-suites.sh check`, exit 0 (3.9 s): "Every quick test is in exactly one shard
(3405 of 3405) ... check passed"; `pattern-cost-tools` is in `own-fast` (projection 220 s unchanged, the job 930 s of 1,800 s).
Standing cost (S-AV08): 690.2 s against 690.7 s at MS06c2; no change.

## 6. The measurement CLI

`node tests\pattern-cost.js --ids=forcingChain,nishio --runs=20 --json=..\docs\difficulty-v3\evidence\MS07a\pattern-cost-forcingChain-nishio.json`
(one locked command, 0.63 s, exit 0; record `pattern-cost-forcingChain-nishio.json`; source `0fa564f3…70be`, fixtures
`635a036d…efb4`, tool `7dc2e09d…009d`, Node v26.13.0, AMD EPYC 7763 16 cores; complete, 6 of 6 cases, 120 finds):

| Case | Outcome | Work (edge expansions / trials) | p50 ms | p95 ms | max ms |
|---|---|---:|---:|---:|---:|
| `forcingChain:positive:1` | found | 12,232 | 0.377 | 1.133 | 3.660 |
| `forcingChain:positive:2` | found | 6,530 | 0.196 | 0.284 | 0.300 |
| `forcingChain:negative:1` | none | 22,221 | 0.459 | 0.598 | 0.602 |
| `nishio:positive:1` | found | 2 | 0.095 | 0.175 | 0.852 |
| `nishio:positive:2` | found | 1 | 0.007 | 0.014 | 0.029 |
| `nishio:negative:1` | none | 1,458 | 2.079 | 3.387 | 4.492 |

All limits are `null` (the registered finders are unbounded) and no cap was hit; for the later tasks the largest forcing
case uses 22,221 of the default 50,000 units. A second recording is equal to the first apart from the clock and the command
line. `--list`, `--help` and the refusals (unknown id, scoped `cageCombo`, empty `--case`, a bad command line, an existing
file, a path inside the fingerprinted sources) are tested; the Node-only test runs the tool as a process.

## 7. Items (S-OD4)

New: none. This task found no performance or availability shortfall. The wrapper cost of section 4.3 (+2.6 % on a
find-only microbenchmark of short finds) is a measurement, not an item; the generated puzzles are identical. The 4 % margin
note of Greater-Than Nightmare (19,192 of 20,000 ms) is not re-measured here: MS07e measures it on the source it uses.
Inherited and carried unchanged to MS07e then MS18c/MS18d: S-AV01 (Greater-Than Normal CV6, 5,209 ms p95 against 1,400 ms
on seeds 300-319; 4 % margin note on Nightmare), S-AV02 (mega12 Nightmare), S-AV03 (mega16 Nightmare), S-AV04
(samurai/G13), S-AV05 (Killer Hard), S-AV06 (Killer Expert), S-AV07 (classic9 Nightmare 2/12), S-AV08 (standing quick cost,
now 690.2 s, see section 5), S-AV09-S-AV13 (MS05b3: Killer Master/Nightmare, Wordoku, jigsaw9 Expert 325.3 s, the
sohei/butterfly/flower cells), S-AV14 (classic9 Normal I5 86/100), S-AV15 (the unrun confusion matrix), S-AV18
(Greater-Than Expert off-band misses), S-AV19 (design 9.1 p95 flags), S-AV20 (jigsaw9 Expert and diagonalX Nightmare
shallow), S-AV21 (jigsaw9 Expert exact loss), S-AV22 (request-level exact losses), S-AV23 (jigsaw9 cost 1.53x/1.29x);
S-AV16 and S-AV17 stay withdrawn; MS05r6a-COV01 (MS18e) and the MS06c2 IR51 coverage items (no test reaches the 64-rating
refinement cap; the manual suites not yet run under the target policy) stay open.

## 8. Notes and deviations

* The legacy path keeps its old check cadence (no entry check, no periodic check); only a bounded call checks at entry and
  every 256 units. This keeps `budget.nodes` after a registered find unchanged, which existing tests assert.
* `workLimit` absent means the R10 default 50,000 (a new finder bounded by default); the registered wrappers pass `null`.
  The task text does not name the seam default; MS07b may pass its own limit.
* The seam does not read `ctx.options.maxChainLength` / `maxNishioDepth`: intersecting the window with the caller's
  explicit maximum is the wrapper's work in MS07b (no helper was added to the production file for it).
* `supplements` is empty: no ladder technique needs one, so the mechanism is tested on two real `forcingChain` positions
  as a stand-in; MS08a and later add real entries.
* Scratch under `generator/tests/artifacts/difficulty-v3/MS07a/` (loaders, differential, overhead, probes); nothing
  there is read by a suite or the CI.
