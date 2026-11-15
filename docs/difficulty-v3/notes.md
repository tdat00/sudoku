# Difficulty v3 notes

Decisions and explained output differences of the difficulty-v3 task pack that belong in no dated report. One
section per task, newest last. The evidence of each section is the folder it names under
`docs/difficulty-v3/evidence/`.

## MS04: monotone orders and the derived certificate

### What changed

- Orders only, weights, base costs and bands unchanged: `cageCombo` 55 to 44, `ineqChain` 65 to 46, `jellyfish`
  160 to 137. The registry (sorted by order, then base cost, then id) now has adjacent non-decreasing weights
  everywhere; the three calibrated ties (ineqChain over pointing, nakedQuad over ruleOf45, jellyfish over
  cageSplit) are kept by the orders themselves.
- The subset finder starts every call with `nodes = 0`, so its cancel check is spaced per call and not by what
  the calls before it left in the counter. It changes no output: only when a deadline or a cancel is noticed.
- `SG.difficulty.requiredOf(rating, level, model)` derives the requiredness verdict from the technique counts of
  one complete canonical rating, with no second solve.
- `core/tests/fixtures/techniques.js` keeps the v2 data as `historyV2` and exposes the current `registryOrder`
  and `byId` (v2 history plus `CURRENT`, empty for now); `rated.js` entries carry `v3Expected`.

### Output differences and what caused each

Each class was attributed by regenerating it under the four combinations of {old, new} orders and {old, new}
subset counter, and per technique (only that technique's order new).

| Output | Changed | Cause |
|---|---|---|
| Regression hashes (520 keys) | 27: `killer/easy` 11 (seeds 1, 2, 3, 8, 13, 55, 144, 233, 610, 1597, 4181), `killer/hard` 4 (55, 377, 987, 4181), `greaterThan/normal` 12 (2, 3, 13, 21, 55, 89, 233, 1597, 2584, 4181, 6765, 10946) | Order. Old orders with the new counter give the old hash for all 27; new orders with the old counter give the new hash for all 27. `cageCombo` alone explains the 15 Killer keys, `ineqChain` alone the 12 Greater-Than keys, `jellyfish` none |
| Replay wire (G09 to G12) | G09 and G10 (Killer, a different puzzle), G11 (Greater-Than, rating counts and score 973 to 957); G12 unchanged | Order: `cageCombo` for G09 and G10, `ineqChain` for G11. Old orders reproduce the saved fixtures exactly, the counter has no effect, `jellyfish` none |
| Replay analysis goldens (G01 to G14) | G09, G10, G11 and G12 (53, 82, 129 and 111 fields); the other ten unchanged. The file also takes the wrapping and header of the current recorder | Order: `cageCombo` for G09 and G10, `ineqChain` for G11 and G12 |
| Help examples (`player/js/ui/help-examples.js`) | Three lines moved, no data change | The entries are rendered in registry order, and the registry order changed |
| Pinned replay, steps and player assertions | Counts and cases of jumps that moved with the goldens | Order, through the goldens above; each pin was re-derived from the refreshed data |

No difference is unexplained. Every rated entry of `rated.js` (26 puzzles) rates identically under the old and the
new orders, and the derived `requiredOf` equals the reference `certifyFloor` on all of them at all nine levels.

### Reclassification of a published reference

The published `classic-medium` puzzle is labelled `normal` (outside knowledge: a label is data, not a
weight-fitting target). Its canonical rating is Easy, with 40 naked and 11 box-hidden singles, score 48, both
before and after this task. The v2 test only required it within one level of the label. The current reference
(`v3Expected`) records `easy`, not required at Easy; the label stays. The other 25 entries have the level of
their label (published Easy and hell2 puzzles, constructed puzzles by construction).

Constructed puzzles, current reference verdicts at their own level: Normal 1 / 2 / 3 are not required / required
/ not required; the three Nightmare puzzles are not required (shallow); Hard and Expert are required; Easy
puzzles are not required; Very Easy and the four hell2 puzzles are vacuous (true). The classic9 Normal seed-1
puzzle (`2.8.6.1.99.4..8.5..5..2......6..24.....6.7.....74..9......4..9..8.3..2.43.2.8.6.5`) is shallow: not
required at Normal, floor level Easy, rated Normal 209.

### Generation cost of the Greater-Than Normal order (finding, not repaired here)

The manual suite `greater-than` fails its one timing assertion, `normal: CV6 p95 within the 700 ms budget`
(2,035 ms against the limit of 1,400 ms). The cause is the `ineqChain` order alone (46 instead of 65), not noise:
with `ineqChain` back at 65 and the other two orders new, the same 20 puzzles (seeds 300 to 319) have a p95 of
97 ms. Measured one process at a time, new against old orders:

| Sample (Greater-Than, Normal) | p95 | total |
|---|---|---|
| Seeds 300 to 319, twice each | 2,088 and 2,216 ms against 92 and 94 ms | 12.9 and 13.4 s against 1.0 s |
| Seeds 7000 to 7039 | 5,043 ms against 125 ms | 62.9 s against 2.2 s |

Easy is unchanged (p95 43 ms). The mechanism is visible on seed 308: 4 attempts and 604 steps instead of 1 attempt
and 27 steps; three attempts dig to the minimal 24 clues and still rate Easy (score 145) against the requested
Normal, so the pipeline retries. With the monotone order a sign-heavy puzzle is credited to `ineqChain` before the
subset techniques, so it rates lower, and the digger needs more attempts to reach the Normal band. This is a
consequence of the contracted order, not of a defect in the change; band, weights, digger and acceptance are not
this task's to change. It is recorded for the digger and target tasks (MS05 onward) and for the performance gate
(MS18d). The `killer` manual suite, where `cageCombo` moved, passes all its timing assertions.

## MS05a: exactness transport and prepared shallow messages

### What changed

- `PuzzleResult.exact` is the digger's verdict for the returned puzzle (`puzzle.exact === true`: today a complete
  proof whose level is the requested one) and is the `exact` of the `done` event. `toWire` always writes it as a
  strict boolean (a result without the field is written as `false`), `fromWire` reads `wire.exact === true`, and the
  wire version stays 1. An entry cached before this change decodes as not exact, and the result panel shows it so
  until the puzzle is generated again. No level-name inference remains: the result view's `exact` is the flag.
- The vocabulary entries `tune.hit`, `tune.miss` and the new `tune.shallow` may carry `required` (true, false or
  null) and `target` (a finite number or null; left out when there is none); the old lists are unchanged.
  `eventProblems` refuses any other value of those two names for the three keys. Nothing emits `tune.shallow`,
  `required` or `target` yet, and the explain card has no line for `tune.shallow` yet (the highlight map of
  `explain-data.js` is not in this task's files).
- `difficulty.shallow` is a warning of kind `approximate`; the result view translates it with the requested level
  already localized (`{level}`), and the one Retry button (with the Requested / Reached line) goes to the first
  warning of that kind, so a result with both warnings has one button. The announcement of a ready puzzle uses the
  "closest puzzle" text for either warning.
- English and Vietnamese texts of `difficulty.shallow` and `tune.shallow` with matching placeholders.

### Output differences and what caused each

| Output | Changed | Cause |
|---|---|---|
| Replay wire (G09 to G12) | the four records, one field each: `exact`, saved absent, now `true`, written after `rating` | The new wire field. Removing the four insertions gives the old file byte for byte, so the four puzzles, ratings, configs, warnings and dig logs are unchanged |
| Replay analysis goldens (G01 to G14) | none | The analysis does not read the flag; all 14 records match |
| Regression hashes | not re-recorded (no GG in this task) | No generation code changed: the digger, rating and acceptance are untouched, and the 18 recorded requests above show no generation change |

### Wording kept from the task

The English warning is the contract text with a final period; the level names are capitalised ("a Hard technique"),
so for "Easy" or "Expert" the article reads "a Easy technique". The sentence is the specified one, the Vietnamese
text has no article, and the owner of the shallow activation may reword both together.

## MS05b1: required exactness in the engine

### What changed

- One private rule in `digger.js`: a puzzle is exact only when its complete canonical rating is in the requested
  level **and** `SG.difficulty.requiredOf(rating, level, model)` says a technique of the tier was needed (Very Easy
  and a level with an empty tier are vacuous: true). `qualityOf(rating, spec, level, model)` ranks candidates: 0 for
  exact, 0.5 for a complete rating in the level that does not need the tier (shallow), else the old distance of the
  level and the score; infinite for no model, no rating or an unsolved one. The model is always the one the rating
  was made for: Killer's layout, Greater-Than's thinned signs, the safety-net replacement.
- Keeper: `closer(rating, model)` and `offer` use that quality (strictly better replaces, an equal quality keeps the
  first, a count of 2 or an unprovable count never stores); `keptPuzzle.exact` is the same rule. The one Killer call
  site passes the layout model. Greater-Than needed no change: it already offers the thinned model and its rating.
- Stops: sampling ends at the first exact sample (sample 1 always runs) and a shallow sample does not block it; an
  exact keeper ends the attempt; the local search loop ends when its state or the keeper is exact, so after a
  required neighbour is found no further proposal or rating is made. The keeper is offered every unique, completely
  rated candidate before the path decides, so a required neighbour with a lower score than the path's is kept although
  the path refuses it. A refinement of a proposal above the band that ends exact, still above the band, unrated or
  below is returned as it is; one that ends in the band without needing the tier goes on with the search from the
  refined clues. No new cap: the old 1,024 ratings and 32,768 proposals still bound every attempt.
- Final choice of an attempt: samples, then the keeper, then the state the local search ended in, each only when
  strictly better. A first recording had the search's last state before the keeper, so the fallback of
  `wordoku/normal#10946` was a later neighbour (score 231) and not the first puzzle in the band (230, the puzzle
  the old engine returned). Asking the keeper first fixed it; the second recording of all 520 hashes differs from the
  first in that key alone, and nothing else moved.
- Events: `tune.hit` carries `required: true`; a complete result in the band that does not need the tier is
  `tune.shallow` with `required: false` and the sample counts; every other sample, a solved one outside the band
  included, is `tune.miss` with `required: null`. No `target` is drawn. A fallback that is not exact keeps
  `difficulty.approximate`; one that is complete and in the band also gets `difficulty.shallow`.
- Text: `tune.shallow` selects the `retry` line of the explanation; the compare line and the how-text of the tune card
  state the new rule (complete proof, the requested band, a technique of the requested tier) in both languages; the
  English `difficulty.shallow` is "The puzzle is in the requested score band but does not need a technique from the
  {level} tier.", which removes the "a Easy technique" of the wording note under MS05a. The Vietnamese text says the
  same with the localized level.

### Output differences and what caused each

Each differing hash was regenerated with the digger and the Killer file of the previous commit and with the new ones
(one process at a time) and the two results were compared; the requiredness of the old puzzle is `requiredOf` on its
own rating and model.

| Output | Changed | Cause |
|---|---|---|
| Regression hashes (520 keys) | 149: `classic9/easy` 19, `classic9/normal` 13, `classic9/master` 7, `classic9/nightmare` 6, `mega12/normal` 5, `mega16/easy` 1, `diagonalX/easy` 14, `diagonalX/nightmare` 11, `jigsaw9/normal` 10, `jigsaw9/master` 8, `greaterThan/normal` 10, `greaterThan/hard` 2, `samurai/easy` 19, `butterfly/normal` 10, `flower/normal` 8, `wordoku/normal` 6 | The old engine accepted a puzzle by its level alone. In all 149 the old puzzle is in the level and not required (shallow); the new engine goes on and returns a different puzzle that is exact and required (149 of 149, no warning). 75 are found in attempt 1, 2 in attempt 8; the mean number of attempts goes from 1.13 to 2.38 and the time of the 149 regenerations from 15 s to 161 s |
| Regression hashes, the other 371 keys | none (same puzzle in both engines); 313 are exact before and after (including every Very Easy key); 56 were exact by level only and are now the same puzzle as a shallow fallback (`difficulty.approximate` and `difficulty.shallow`, 8 attempts): `killer/hard` 20 of 20, `classic9/nightmare` 14, `diagonalX/nightmare` 9, `diagonalX/easy` 6, `classic9/normal` 3, `wordoku/normal` 3, `classic9/easy` 1; 2 (`classic6/hard`) were approximate before and still are | The first puzzle in the band stays when no required puzzle is found within the caps (a tie keeps the first, and the keeper is asked before the state the search ended in). Regenerated under both engines: the 371 puzzles are identical; only `exact`, the attempts and the warnings differ. All 520 keys: 462 exact, 56 shallow fallbacks, 2 plain approximate |
| Replay wire (G09 to G12) | G09 and G10: `exact` true to false, `attempts` 5 to 8 and 1 to 8, two warnings instead of none; G11 and G12 unchanged | The puzzles, ratings and dig logs of all four are unchanged. G09 and G10 (Killer Expert and Nightmare) are in their level but need no technique of the tier, no required puzzle is found within the caps, and the first one stays as the fallback with `difficulty.approximate` and `difficulty.shallow` |
| Replay analysis goldens (G01 to G14) | G06 (51 fields) and G07 (92 fields) differ; G01 to G05, G08 to G12 and G14 match; G13 could not be recorded | G06 and G07 are `jigsaw9` Nightmare: the old puzzle was shallow and the new one is a different, required puzzle (score 1678 to 2348 and 1938 to 2340). G13 is `samurai` Nightmare seed 42: the old and the new engine give the same puzzle (hash `93f9be5f208b`, score 1637), but the new one needs 220 s (8 attempts) against the 120 s `BUDGET_MS` of the recorder, which stops with `budget.exceeded` and writes nothing. `replay-goldens.js --merge` therefore refuses the 13 recorded shards (G13 missing) and `replay-goldens.js` is not rewritten |

### Generation cost (finding, decided by the following tasks)

A shallow result in the band is no longer an early exit, so an attempt that never meets a required puzzle spends its
whole caps, and so do all eight attempts. Measured with trace off, one process at a time:

| Request | Old engine | New engine |
|---|---|---|
| `classic9` Easy, 24 seeds | 3.6 ms each | about 250 ms each |
| `classic9` Nightmare seed 42 (G03) | exact, 0.27 s | not exact, `difficulty.shallow`, 8 attempts, 6 s |
| `killer` Hard seed 5, Master seed 2 | exact, 0.4 s and 0.2 s | not exact, `difficulty.shallow`, 8 attempts, 5 s and 24 s |
| G09, G10 (`killer` Expert, Nightmare) | exact, attempt 5 and 1 | not exact, 8 attempts, 14 s and 26 s |
| `samurai` Nightmare seed 42 (G13) | exact, 0.16 s | not exact, 8 attempts, 220 s |
| `diagonalX` Nightmare, the 11 changed seeds | 0.5 s together | 71 s together (up to 20 s each) |

The 520 hash records take about 10 minutes in all (549 s of generation, 104 shards, the longest 72 s:
`diagonalX/nightmare`). The consequences are in
the tests and not in the answers: the generator suites that regenerate goldens live (`steps`, `replay`, `player`) cannot
regenerate G13 inside their 120 s budget, the Nightmare timing assertions of `mega` exceed their budgets, and the
generator quick set no longer fits one 540-second command. The behaviour is what the task specifies: no cap, budget or
assertion was changed to hide it, and the shallow allowance of MS05c and MS05d is where the cost is to be bounded.

## MS05r1: profile of the preserved requiredness-active candidate

Step evidence of the S-OD2 recovery (CV6-02 (a)), not an acceptance: no engine, fixture, assertion, cap, budget or
seed changed. The report is [recovery-profile.md](recovery-profile.md), the records and the commands are in
`docs/difficulty-v3/evidence/MS05r1/`.

### What changed

- A diagnostic driver, `generator/tests/difficulty-recovery.js` (pure helpers in
  `generator/tests/fixtures/recovery-profile.js`, suite `recovery-profile`): `--mode=profile|diagnostic`,
  `--case=G13|mega12-nightmare|mega16-nightmare`, `--shallow-cap=64|128|256|none`, `--json=<file>`. One process runs
  one case once; the profile changes only `maxAttempts` (to 1); the diagnostic mode keeps the 8 attempts and is
  refused before any generation until the runtime allowance API of MS05r3 exists. The engine and the validation of the
  returned puzzle share one 500,000 ms budget.
- The observation wraps, for one run, the exported `SG.digger.generateSteps` (a stage delegate that times every stage
  call and classifies it by its arguments: ordinary sample, the repeated last sample as the local continuation, the
  rest; and a copy of the `work` the pipeline drops), `SG.digger.getStrategy` (a wrapper of the built-in `cells`
  strategy that keeps the attempt's `caps`) and `SG.difficulty.rate` (an independent count), and restores all three
  in a `finally`. The task asked for `unregisterStrategy` and `registerStrategy` of `cells`; the registry refuses both
  (the built-in stays), so the `getStrategy` seam, which the pipeline calls once in its configure step, carries the
  wrapper.

### The profiles (one attempt, trace as the request has it)

| Request | Generation | Ordinary samples | Local continuation | Ratings ordinary / local | Ended by |
|---|---:|---:|---:|---:|---|
| G13 (`samurai` Nightmare, seed 42) | 24.4 s | 10.2 s (42 %) | 14.1 s (58 %) | 19 / 1,005 | the 1,024-rating cap |
| `mega12` Nightmare, seed 3 | 7.0 s | 4.2 s (61 %) | 2.7 s (39 %) | 20 / 615 | the 32,768-proposal cap |
| `mega16` Nightmare, seed 3 | 79.7 s | 54.9 s (69 %) | 24.7 s (31 %) | 39 / 985 | the 1,024-rating cap |

All three are one-attempt misses that return a shallow fallback (`difficulty.approximate`, `difficulty.shallow`,
`required: false`, unique, rated again with the same score). What a shallow-search allowance can and cannot reduce is
read from these numbers in [recovery-profile.md](recovery-profile.md): the local continuation is the part it can
shorten (58 % of the G13 attempt); the ordinary samples (85 to 93 % of them in the six score-targeted ones) it cannot
touch, and for `mega16` they alone take 54.9 s per attempt, 92 % of the 60 s guard of the mega quick tests. No
allowance was chosen here: the three requests select nothing.

## MS05r2: the consumers of required exactness (measurement, qualification, manual contracts)

Step evidence of the S-OD2 recovery (CV6-02 (a)), not an acceptance. It absorbs the consumer scope of MS05b2. No engine,
solver, fixture, locale, cap, budget or seed changed, so no generated puzzle, rating or hash can differ; the evidence is
in `docs/difficulty-v3/evidence/MS05r2/`.

### What changed

- `tests/soak.js`: a hit is the generator's strict `exact` flag on both routes, `p.exact === true` where it calls
  `SG.digger.generate` and `r.exact === true` where it runs `SG.pipeline.run`. The pipeline route (Killer, Jigsaw,
  Greater-Than, Wordoku and every other variant with a strategy, a `postGenerate` step or a seed-drawn board) used to
  compare `r.rating.level === combo.level`, which counted an in-band shallow result as a hit. Invariant I5 also asks
  `requiredOf` of every exact puzzle on its own model. Tags, seeds and the generation routes are untouched.
- The ordered-prefix check: `prefixViolationOf` in `tests/fixtures/difficulty-diagnostics.js` (pure; null or
  `{ variantId, level, kind, expected, actual }`) runs in the soak after `--weights` and `--bands` have patched the
  tables and before any model is built, any random number is drawn or anything is generated. A violation prints the
  variant, the level, floor or floor with tier, and both lists, and exits 2, also with `--no-gate`; malformed JSON stays
  the usage error it was. The ladder is the registry order of the weighted techniques that apply to the variant, as the
  task wrote it; the helper is loaded with or without `--json`.
- `tests/qualify.js`: the worker records `out.exact = result.exact === true` and decides the hit with the exported
  `hitOf(out, requested)`: valid, solved, no approximate warning, `exact === true` and the achieved level. The protocol,
  seeds, budgets and scheduling are untouched.
- The seven manual files at their contract sites (the inventory is in the evidence file). An exact puzzle is solved, in
  the requested level and band, and needs the tier on its own model; a miss carries `difficulty.approximate`, and one
  in the requested level also `difficulty.shallow`. Every sample count, threshold, budget, seed and test name is kept.
  Three more `rating.level === level` conditions (the technique-set membership tests of `killer`, `greater-than` and
  `extra-regions`) ask about puzzles in the band, shallow ones included, which is still true, and were not changed.

### What the legacy assumptions were

| Assumption | Where | Now |
|---|---|---|
| A puzzle in the level is exact | soak pipeline route, qualifier hit, `variants`/`jigsaw`/`greater-than`/`extra-regions`/`wordoku` hit counters, `difficulty` hit counter and digLevel | exact is the flag; the level is only a consistency check |
| An in-level puzzle has no warning | `jigsaw`, `greater-than`, `wordoku` I5 | only an exact one has none; a shallow one has both warnings |
| `exact === (achieved === level)` | `difficulty` I5 and `digLevel` | exact implies the level and the required tier; the reverse no longer holds |

### Verified here, and what is not

Syntax of the seven manual files, the suites `difficulty-diagnostics`, `difficulty-floor` and `help`, and the fake-worker
`difficulty --filter=qualification:` selector; the soak and the qualifier predicates were also run against their old forms
(the old pipeline comparison and the old `hitOf` fail the new tests). No manual corpus, I5/CV3 cell, soak measurement,
qualification run, full quick set or fixture run happened (the suite's own five-puzzle soak cells aside): the early
I5/CV3 cells belong to MS05b3 after the selection, the known G13/pin/budget failures to MS05r4 and MS05r6a/r6b, and
the manual classic9 group to MS05r6b.

## MS05r3: the shallow-search allowance and the work it is selected from

Step evidence of the S-OD2 recovery (CV6-02 (a)), not an acceptance. It absorbs MS05c. The default is `Infinity`, so
no puzzle, rating, score or hash differs from the preserved candidate; the value is selected by MS05r4 (R5) and nothing
here chooses one. The evidence is in `docs/difficulty-v3/evidence/MS05r3/`.

### What changed

- `SG.digger.SHALLOW_SEARCH_RATINGS` (`Infinity` or an integer of at least 0; anything else throws
  `digger.invalidOption`), read when each local search starts. In a local search from a requested-band state, the
  allowance counts the ratings that follow the first shallow state: once `firstShallowAt` is set, `allowance` more
  ratings are made and then the next rating is refused (`capHit: 'shallow'`, the rater is not called). The rating that
  identifies the first shallow state is not charged; a state shallow at entry has `firstShallowAt: 0`. The count starts
  once per search and never restarts when the path leaves and re-enters the band. Memo visits are proposals, not
  ratings, and cost nothing; the old ratings and proposals caps keep their own reason. An exact keeper still ends the
  attempt, also on the last permitted rating.
- The work of each attempt lists its searches: `work[i].localSearches[j] = { ratings, proposals, firstShallowAt,
  shallowRatings, shallowLimit, capHit }` (`shallowLimit` null is `Infinity`; `capHit` is null, `'shallow'`, `'ratings'`
  or `'proposals'`). The four base fields are unchanged. The collector is per attempt (`caps.localSearches`), so two
  interleaved `generateSteps` runs never share one.
- `PuzzleResult.work` (design.md 13.9) is the deep copy of that list. An error thrown by `generateSteps` carries the
  same copy as a non-enumerable `work` on the same error object, a parent cancellation (`budget.cancelled`) too. It
  crosses the worker wire and the cache; a malformed or absent value reads `undefined` (unavailable), never zero.
- `tests/soak.js`: `--shallow-cap=64|128|256|none` (applied after the sources load, before generation; the ledger's
  `meta.shallowCap` and `meta.shallowSearchRatings` say which), `--from`, `--count` and `--total-count` for the
  shards of one variant and one level (tags stay `variant:level:absoluteIndex`, references at the first and the last
  absolute index), the work and its conservation in every row (`workCheck`), the producer/derived agreement of the
  exact flag (an I5 violation), and `meta.toolHash`. `mergeShards` of the diagnostics helper checks the ledgers of one
  plan and returns their rows by index: gaps, duplicates and a different source, tool, setting or seed are rejected.
- `tests/fixtures/recovery-profile.js` carries the richer `localSearches` in its failure snapshots; the CLI refuses no
  more, `--mode=diagnostic --shallow-cap=...` sets and restores the setting and keeps the 8 attempts.
- Tests: the allowance, its edge cases and Infinity parity in `pipeline.test.js` (16 tests, one on a real Master seed),
  the work wire and the cache in `worker.test.js` and `cache.test.js`, the ledger, the shards and the merge in
  `difficulty-diagnostics.test.js`, the driver in `recovery-profile.test.js`. The one quick-suite test whose premise is
  "no extra allowance" (MS05b1-T02, the sign memo) scopes `Infinity` itself; `quick-contracts.json` lists it and the
  seven schema changes.
- Docs: `generator/design.md` 6.8, 13.9, 15.3, 15.4 and the suite table, both developer guides.

### Output differences

None at the default. The Nightmare `mega12` profile (seed 3, one attempt) reproduces MS05r1's `puzzleHash`, score
(2046), 635 ratings and 32,768 proposals, with the new entry `{ ratings: 615, proposals: 32768, firstShallowAt: 0,
shallowRatings: 615, shallowLimit: null, capHit: 'proposals' }`. A finite value changes a search that reaches a shallow
state by design; the five-puzzle shard smoke (very easy, no local search) at 64 differs from the default run only in
the timings and the ledger's setting fields.

### Verified here, and what is not

The suites `digger`, `difficulty-diagnostics`, `difficulty-floor`, `worker`, `cache` and `recovery-profile` (463 of 463),
the `pipeline` selections `recovery: shallow allowance`, the PuzzleResult contract test and `MS05b1-`, the five-puzzle
shard smoke (whole, two shards, and the same two at 64) and the `mega12` parity run. The premise audit (the quick suites
with the setting preloaded at 64, and the sign-memo test also forced to 0, 4, 8, 16, 32 and 64) found one test that
needs the old caps alone, the sign memo, and it fails only at 0; the three worker failures of that run are an artifact of
a preload that reaches the main realm only. Not run: the G13 and `mega16` profiles, the recovery CLI in diagnostic
mode, a GS, GG, GR or soak measurement, the manual corpus and the full quick set. The stale-pin and budget failures of
G13 and `mega` stay for MS05r6a and MS05r6b.

## MS05r4: the selected shallow-search allowance (256) and the closure diagnostics

Step evidence of the S-OD2 recovery (CV6-02 (a)), not an acceptance. It absorbs MS05d. The report with the numbers is
[shallow-cap-2026-11-13.md](shallow-cap-2026-11-13.md); the evidence (24 selecting cells, 12 diagnostic records, the
selection, the focused-check transcripts, the original-limit preflights and the run log) is in
`docs/difficulty-v3/evidence/MS05r4/`.

### What changed

- The one production edit: `SHALLOW_SEARCH_DEFAULT` of `generator/js/engine/digger.js` (line 653) is `256`, not
  `Infinity`. The engine source hash goes from `19afa6ee…` (the source of every measurement here) to `9a833d93…`.
- R5, unchanged: 64, 128, 256 and none on classic9 Normal, Master and Nightmare, Killer Hard and Expert, Jigsaw 9
  Expert, 12 requests each from seed 20260101, 288 requests, generation exactness with every error a miss, the upper
  median of the full ratings. 64 (0 of 12 against 2) and 128 (1 against 2) lose hits in classic9 Nightmare; 256 loses
  none and lowers that median (1,345 against 1,417), so 256 is chosen. Killer Hard and Expert have no hit at any
  setting, Normal, Master and Jigsaw 9 Expert keep theirs (10, 12 and 11).
- The three closure requests at the four settings (not selecting): G13 220.5 s with no extra cap and 104.6, 86.7 and
  80.0 s at 256, 128 and 64 (the same shallow fallback, 8 attempts); mega12 65.1 s and 47.1, 43.8 and 39.4 s (the same
  fallback); mega16 388.7 s and 310.2, 296.3 and 270.4 s (exact at attempt 6 at every setting). The ordinary samples
  (74 s, 38 s, 263 to 281 s) are not touched by any setting.
- Tools: `generator/tests/artifacts/difficulty-v3/MS05r4/select-cap.cjs` (declares the manifest, merges the shards
  with `mergeShards`, applies the rule; `select-cap.selftest.cjs` tests it on fake rows, 18 cases, and all 11 mutants of
  a mutation check were caught), `g13-closure.cjs` (the actual G13 request under the 120 s guard), `Run-Dv3Logged.ps1`
  (the lock helper with a transcript and a run log).
- Docs: `generator/design.md` 6.8 and 15.4, both developer guides, the report.

### Original limits with the default of 256 (preflights)

G13 passes its 120 s generation guard (104.7 s, 8 attempts, a shallow fallback). The unchanged mega Nightmare groups
do not: mega12 seed 1 takes 48.2 s against the `timeLimit(3000)` of 6 s (its CV5 test passes), and both mega16 tests end
in `budget.exceeded` at the 60 s guard. No allowance can bring those inside, since the ordinary samples alone take
longer; this is the S-OD2 stop for the owner, and nothing was changed to avoid it.

### Verified here, and what is not

`digger`, `difficulty-diagnostics`, `difficulty-floor`, `worker`, `cache` and `recovery-profile` (463 of 463),
`pipeline` `MS05b1-` (30 of 30) and `recovery: shallow allowance` (16 of 16) all pass at the new default with no
override, so there is no returned premise and no pin for MS05r6a. Not run: the full `pipeline`, `mega`, `steps`,
`replay` and `player` suites, GG, GR and the manual corpora, which are MS05r5, MS05b3, MS05r6a and MS05r6b's.

## MS05r5p: size-dependent default attempts (8, 4 or 2)

Step evidence of the S-OD2 recovery (S-OD4 (c2), CV6-03), not an acceptance; no commit of its own. The evidence (run
records, transcripts, the three diagnostics and the numbered items) is in `docs/difficulty-v3/evidence/MS05r5p/`,
with `evidence.md` as its index.

### What changed

- One function, `SG.digger.defaultMaxAttempts(cellCount)`: 8 up to 81 cells, 4 from 82 to 144, 2 above (it throws
  `digger.invalidOption` for anything that is not a whole number from 1). `SG.digger.generate` takes it from
  `model.cellCount`, `SG.pipeline.normalizeConfig` from the new `SG.variants.cellCountOf(def)` (digits squared, unless
  the definition declares `cellCount`; the four multi-grids declare 144, 189, 288 and 369), and the store from
  `SG.store.defaultAttempts(variantId)`. No model is built and no random number is drawn to learn a size. An explicit
  `maxAttempts` is used as given with the old validation; `SG.pipeline.DEFAULT_MAX_ATTEMPTS` stays at 8 as the
  reference of the 81-cell boards. `SHALLOW_SEARCH_DEFAULT` is still 256.
- Boards: mega12 and butterfly 4; flower, mega16, sohei and samurai 2; every other registered board 8 (checked against
  the model each variant builds).
- Store: the state carries `attemptsExplicit` (false: the number is the board's and follows a change of variant, URL
  or reload; true: it was typed, came in an `attempts` parameter, or was recorded by a replayed puzzle that is not at
  its board's default). It is a `CONFIG_KEYS` member, so `sg.lastConfig.v1` saves it; `toConfig`, the URL, the history,
  the cache and the exports never carry it. A record **without** it is read once: an 8 on any board becomes the
  default (CV6-04 (b), the legacy-8 fix round; it cannot be told from a chosen 8, and entering 8 again makes it a
  chosen number), any other number stays chosen. `?attempts=N` is
  always chosen, also when N equals the default; a
  link without it takes its own variant's number. Emptying the field in the control sends `attemptsExplicit: false`
  (addendum A1); a typed number, also one equal to the default, stays chosen; `reset()` gives default mode.
- Replays (`store.set(..., { source: 'app' })`, what the real `SG.app.generate(overrides)` does for a history entry and
  for a stale cache entry (the tests run it on a private copy of `app.js` and a minimal fake document); the export merges
  `defaults()` with the entry): the recorded number is used, so an older mega16
  entry made with 8 runs 8. A number equal to the replayed variant's default keeps the intent as it was; any other
  number becomes chosen; a replay never makes a chosen number a default. A state that says default but holds a number
  other than its board's (a marker inherited from `defaults()`) is read as chosen: the number wins.
- Files: `digger.js`, `pipeline.js`, `registry.js`, `multigrid.js`, `store.js`, `controls.js` (with the hint in both
  languages), the headers of `tests/soak.js` and `tests/qualify.js`, tests in the `store`, `controls`,
  `variants-registry`, `pipeline`, `history`, `export`, `cache`, `difficulty-diagnostics` and `recovery-profile`
  suites (tagged `MS05r5p-`), `generator/design.md` 6.8, 10.4, 13.9, 14.2, 14.3 and the test table, both developer
  guides, both user guides. `app.js`, `history.js`, `cache.js` and `export.js` are unchanged: the rule lives in the store.

### The three closure diagnostics (source `fee8b8d6…`, allowance 256, once each)

| Request | Attempts | Generation | Outcome | Before (8 attempts, r4 at 256) |
|---|---:|---:|---|---|
| G13, samurai Nightmare seed 42 | 2 | 21.6 s | shallow fallback, score 1,637, same puzzle hash `b9bb07e1…` | 104.6 s, 8 attempts, the same puzzle |
| mega12 Nightmare seed 3 | 4 | 23.8 s | shallow fallback, score 2,046, same puzzle hash `8cc70327…` | 47.1 s, 8 attempts, the same puzzle |
| mega16 Nightmare seed 3 | 2 | 107.2 s | shallow fallback, score 1,925, hash `b9b7c78c…` | 310.2 s, exact at attempt 6 (score 2,386): given up by design |

All three records are `ok` and complete (givens match the solution, unique, the rating agrees), `exact` false, `required`
false, with `difficulty.approximate` and `difficulty.shallow`. The estimates of the plan author (27 s, 24 s, 110 s) hold.
mega16 still uses 89 % of the application's 120 s guard and is far over a 30 s qualification budget; the same
fallback puzzles for G13 and mega12 show that the extra attempts added nothing there. The 500 s diagnostic guard is not
the application's.

### Verified here, and what is not

The task's focused selections all pass: `store`, `controls`, `variants-registry` and `recovery-profile` (164), the
`MS05r5p-` cases of `pipeline` (7), `history` (4), `export` (1) and `cache` (4), `difficulty-diagnostics` (82), the
`qualification:` cases of `difficulty` (6), `help` and `ui-contract` (97). Also run: `digger` (64), `pipeline`
`MS05b1-` (30), and `smoke` and `multigrid` (228) as an impact probe of the large boards. Not run: the full quick
sets, `mega`, `steps`, `replay`, `player` and `worker`, GG, GR, GH, soak, qualification and R5 (MS05r5, MS05r5m,
MS05r6a and MS05r6b). The recorded G13 and G14 requests name no attempts, so they now regenerate at 2 attempts: the
`steps`, `replay`, `player` pins and the large-board regression hashes may change (not measured here) and are
MS05r6a's to re-record.

## MS05r5: the test inventory, exact selection and results, and the bounded full-quick plan

Step evidence of the S-OD2 recovery (S-OD3, S-OD4), not an acceptance; no commit of its own and no claim that a quick
set passed (none ran). The evidence (run records, transcripts, both inventories, the preflights, the draft manifest)
is in `docs/difficulty-v3/evidence/MS05r5/`, with `evidence.md` as its index.

### What changed

- `SG.test.list(options)` in `core/tests/harness.js`: what `SG.test.run(options)` would select, in the same order (one
  shared walk), without calling a test, a hook or a benchmark and without touching `SG.testResults`. Rows are
  `{suite, ordinal, fullName, kind, skipped, timeoutMs}`; `ordinal` is the zero-based index of the test in its file
  before any filter, so equal names stay apart and the number does not depend on the selection; an inherited
  `describe.skip` shows as skipped, a runtime skip cannot be known. A describe that threw and a file that failed to
  load are returned in `registrationErrors` (whatever the filter) and stay failing tests of the registry. `run` takes
  `exact` (the full name, case-sensitive, every test of that name, not with `filter`) and writes `ordinal` in each
  result row. Nothing else in `run` changed (the existing harness cases and the quick suites behave as before).
- `--list-tests=<file.json>`, `--exact=<full name>` and `--results=<file.json>` in both Node runners, over
  `core/tests/node-evidence.js` (Node only, no application knows it, in no source list). The two file options take a
  new project-relative `.json` path inside the repository, never overwritten and outside the fingerprinted sources;
  the file is written whole and put in place atomically, as CRLF text with one line per row. The inventory has the app,
  Node, time factor, registration time, `complete` (false after a registration error), the rows, the registration errors
  and a `sourceHash` over a fixed set of files (listed in the file) that does not depend on the selection; the result
  has the same identity, `complete` (every selected test ran, no bail, no registration error, sources unchanged during
  the run), the run's own rows with `ordinal`, and keeps exit 1 for a failure. A zero selection writes nothing and
  exits 1. Without the options the runners print and exit as before.
- Registration on this tree takes 0.49 s for the whole Generator quick set (3,170 tests, 48 suites) and 0.25 s for the
  Player (1,683 tests, 30 suites): the set-ups named in the task still happen, they are cheap.
- Draft plan: the Generator quick set in 7 disjoint whole-suite shards (the 16 shared suites, the other 27 own suites,
  and `pipeline`, `mega`, `steps`, `replay` and the Generator's `player` isolated), the Player in one. Every selector
  was preflighted with `--list-tests`; `manifest.js --check` finds no missing, duplicate or unexpected test key. Only
  the projections are estimates: four of the seven Generator shards are unmeasured ceilings (the shared suites,
  `steps`, `replay` and `player`), two are stale measurements of MS05b1 (`pipeline`, `mega`), one is partly measured;
  the sum is 1,740 s (not a result). The manifest stays `planned`
  and is refreshed after MS05r5m, MS05b3, MS05r6a and MS05r6b's guide corrections.
- Files: `core/tests/harness.js`, `core/tests/node-evidence.js`, the harness suite (13 new cases, 25 now), both
  runners, both developer guides, `generator/design.md` (15.1), `player/design.md` (section 10).

### Verified here, and what is not

The harness suite passes in both apps (25 of 25), `help` and `ui-contract` too (the guides name the new flags, which
exist in the runner). The two real runners wrote the inventory and the result of one bounded test (a quick case of the
harness suite) and refused the bad paths and a zero selection. Not run: any other quick suite, the full quick sets,
`--all`, `--manual`, GG, GR, GH, soak and qualification (MS05r5m, MS05b3, MS05r6a and MS05r6b's). The standing cost
(S-AV08) is a projection until MS05r6b measures every shard.

## MS05r5m: the mega Nightmare quick/deep contract

Step evidence of the S-OD2 recovery (S-OD3 (a), S-OD4, CV6-03), not an acceptance; no commit of its own. The evidence
(the fourteen records, their reconciliation, run records, transcripts, the refreshed draft manifest and the numbered
items) is in `docs/difficulty-v3/evidence/MS05r5m/`, with `evidence.md` as its index.

### What changed

- Quick: the four full-attempt Nightmare tests of `mega.test.js` (`mega#76`, `#77`, `#92`, `#93`: seeds 1 to 4 and the
  CV5 calls 3, 3 and 4 of mega12 and mega16, with the 6 s and 20 s time assertions) are replaced by a real one-attempt
  mega12 request (seed 3, `generate(…, { maxAttempts: 1 })`, every old invariant plus the requiredness and warning
  contract, a smoke limit of 15 s times the time factor, measured 5.2 s) and three scripted mega16 controls on the real
  pipeline and digger (the size default stops after two attempts with exactly the two shallow warnings, an explicit
  number wins, a cancelled or exhausted budget propagates its error and returns no puzzle). Hell 1 and every other
  test are unchanged. The old 6 s and 20 s promises are replaced quick contracts, not changed design targets.
- Deep: `tests/mega-contract.js`, a tool and not a discovered suite (`--list`; `--request=<id> --record=<new.json>`, one
  of the 14 fixed requests once, in its own process, with 15 independent checks inside one 500,000 ms budget;
  `--reconcile=<directory> --json=<new.json>`, no generation). Its pure helpers are `SG.fixtures.megaContract`
  (`tests/fixtures/mega-contract.js`), tested by the new quick suite `mega-contract` (37 tests, on synthetic records
  from a small real board and scripted producers; no deep request), and listed in `tests.html`. The checks derive
  `exact`, `difficulty.approximate` and `difficulty.shallow` from an independent complete canonical rating, and a
  fallback never waives a check. A record keeps a budget or cancellation error with its code, a check that cannot
  finish as `null`, and every relation that needs a missing puzzle is `unevaluated`. `--reconcile` requires each
  occurrence exactly once with one identity, digests and a decodable wire that agree, the flags derived again, and
  evaluates the CV5 relations; it reports per board a guard from the completed population only.
- `SG.fixtures.megaContract.reuse` (and `reuse(directory, query)` of the tool) is the read-only consumer for MS05b3's
  CV3: the invariant occurrences only (mega16 seeds 1 and 2, mega12 seeds 1 to 3), with the identities, configuration,
  defaults and digests matched first, a decoded copy returned and CV3's own checks left to the caller.
- Documents: `generator/design.md` (the tree, 15.2, 15.4), both developer guides (the layout, the counts 49 quick and 57
  in all, the deep tier paragraph and its commands); the user guides state no such promise and are unchanged.

### The fourteen deep records (engine source `fee8b8d6…` as in MS05r5p, allowance 256, one locked process each)

| Board | Attempts | Generation | Exact | Outcome |
|---|---:|---|---|---|
| mega12, seeds 1, 2, 3, 4 and CV5 3, 3, 4 | 4 | 23.520 to 25.243 s (median 23.723 s) | 0 of 7 | seven truthful shallow fallbacks, every check passed |
| mega16, seeds 1, 2, 3, 4 and CV5 3, 3, 4 | 2 | 80.394 to 116.951 s (median 104.106 s) | 0 of 7 | seven truthful shallow fallbacks, every check passed |

The reconciliation is complete and sound: 14 of 14 records and 6 of 6 relations (the three CV5 relations per board, one
of them extra), correctness `pass`. The seed-3 puzzles are those of MS05r5p's diagnostics (three independent
generations per board, equal). The reported guards are 40 s for mega12 (margin 14.7 s) and 180 s for mega16 (margin
63.0 s). mega16 seed 1 used 116.951 s of the application's 120 s guard, measured in Node with trace off (the
application's guard applies to a worker run with trace on, so that request is in practice at or over it); all seven are
over the 30 s qualification budget and none of the fourteen is an exact hit: availability items S-AV02 and S-AV03 for
MS07e and MS18c/MS18d.

### Verified here, and what is not

`mega-contract`, `ui-contract` and `help` pass (134 of 134); the mega12 smoke passed three times and the three scripted
controls by exact name; three engine mutations (default attempts 8, the shallow warning dropped, a budget error
swallowed) each failed the controls. The refreshed draft manifest claims 3,207 of 3,207 Generator tests (49 suites) and
1,683 of 1,683 Player tests once; against MS05r5's inventory exactly the four Nightmare tests were removed, 41 were
added and the other 3,146 kept their names. Not run: the full quick sets and the `mega` shard (a projection until
MS05r6b), the manual and heavy suites, GG, GR, GH, soak, qualification and `SG_DEEP`.

## MS05b3: lazy per-level manual corpora and the early I5 / CV3 / refusal gate

Step evidence of the S-OD2 recovery (S-OD3, S-OD4, CV6-03 and Addendum B1), not an acceptance; no commit of its own.
The evidence (parity, the manifest written before the run, the 186 selectors and results, the transcripts with the
per-request times, the run records, the outcomes and the numbered items) is in `docs/difficulty-v3/evidence/MS05b3/`,
with `evidence.md` as its index. Test-only: no application, fixture, hash, help example or performance contract changed.

### What changed

- `SG.test.lazyCorpus(keys, build)` (new fixture `generator/tests/fixtures/manual-corpus.js`, listed in `tests.html`):
  one enumerable getter per key, built once with its original index on the first read, the same array afterwards,
  nothing built by listing the keys, an error propagating without publishing anything. The six adapters use it:
  `corpusOf(level)` / `corpus()` of Killer, `puzzleRun()[level]` of Jigsaw, Greater-Than and Wordoku,
  `puzzleRun()[id][level]` of extra-regions and `ctx.corpusOf(level)` of the variants sweep, whose `ctx.corpus()` still
  generates every missing level before it returns (the `sweepMoving` test depends on it). Seeds, counts, options and the
  240,000 ms request budget are those of the old whole builds.
- Killer's I5 is registered per level; CV3 is registered once per supported level
  (`> variants: <id> > CV3 <level>:`) and once per variant for the refusals (`> variants: <id> > CV3 unsupported:`), from
  the extracted `checkSupportedLevel` and `checkUnsupportedLevels`; `checkLevels` and the single `CV3` entry of `CHECKS`
  stay as the aggregate. Every per-puzzle assertion still runs before the aggregate "none of N puzzles hit it" one.
- New quick suite `manual-corpus` (46 tests): the helper, and the real adapter code of each manual suite read in memory
  in a registry of its own with a scripted pipeline (seeded plans, one key alone, both orders of the reads, the eager
  aggregate, the CV3 cases, the `sweepMoving` teeth) and the full names of every selector (each picks one test; the
  unprefixed `easy: 20 puzzles > I5:` picks two). `SG_CORPUS_TIMES=1` makes a built level print the time of each request.
- Documents: `generator/design.md` (tree, 15.1, 15.2, 15.4), both developer guides (layout, the counts 50 quick and 58 in
  all, "Heavy suites, one level at a time", the CV3 corpora no longer read the deep records).

### Parity with the old helpers

The six old suites are read-only snapshots of the `HEAD` blobs. Scripted old and new plans are identical for all 1,213
requests (killer 120, jigsaw 168, greater-than 120, extra-regions 336 with the variant index, wordoku 160 with the
placement cycle, the variants sweep 309 over all 15 variants), in the natural and the reverse order of the reads, with one
key alone and a second read making none. Eight real prefixes (the first level of each suite, both extra-regions
variants, classic4 and classic6 of the sweep) are identical in request, givens, solution, flag, warnings, rating and the
digests of the model, dig log and work.

### The gate (all 186 cells run; every per-puzzle assertion passed; 19 failed availability assertions)

`mega-contract.js --reconcile` first: both `currentMatches` true, so the deep records' checks apply to the same requests
(`mega16-invariant-1`, `-2`; `mega12-invariant-1`, `-2`, `-3`); again after the last cell. The two mega Nightmare cells
ran live, one locked command each: mega16 0 of 2 exact (116.787 s and 103.904 s, cell 220.69 s), mega12 0 of 3 (23.509 s,
23.067 s, 22.790 s, cell 69.37 s), within 0.3 % of the deep records' times. The other cells: Killer I5 Hard 0 of 20,
Expert 1 of 8, Master 2 of 8, Nightmare 1 of 8; Wordoku I5 Normal 15 of 20 and Nightmare 4 of 20; CV3 none of N at Killer
Hard to Nightmare, samurai, sohei, butterfly and flower Nightmare, butterfly and flower Easy, wordoku Nightmare; all
Jigsaw (one request of 325.3 s at Expert), Greater-Than and extra-regions I5 cells, 105 of 118 CV3 levels and all 15
refusals passed. Items S-AV02 to S-AV07 updated and S-AV09 to S-AV13 opened (`evidence.md`), routed to MS07e and then
MS18c or MS18d; S-AV01 carries this task's Greater-Than Normal corpus numbers (p95 5.28 s) for MS05e.

### Verified here, and what is not

`manual-corpus`, `ui-contract` and `help` pass (143 of 143, 6.7 s, also in the Player: `help` and `ui-contract`). The
focused checks are the ones the task orders; a mutation that makes `corpus()` lazy-only is caught (the case that fills the
corpus before the floor changes). Not run: the whole quick sets (MS05r6b adds the 46 new tests to its inventory), `--all`,
`--manual`, `SG_DEEP`, CV6, the classic9 difficulty cells, GG, GR, GH, soak and qualification.

## MS05r6a: G13 saved, the final-source E and the coupled pins

Step evidence of the S-OD2 recovery (S-OD3 (d), S-OD4), not an acceptance; no commit of its own. The evidence (the wire,
analysis and hash ledgers, the preflights, the pins, the run records, the transcripts and the scripts) is in
`docs/difficulty-v3/evidence/MS05r6a/`, with `evidence.md` as its index. Source: the retained tree on `1ae831c`, Node
v26.13.0, allowance 256, default attempts 8, 4 and 2 by board size; no engine, default or guard change.

### What changed

- **G13 is a saved wire.** `WIRE_IDS` of `tests/fixtures/replay-recording.js` is G09 to G13 (five wires); the headers of
  `tests/replay-fixtures.js`, `tests/replay-goldens.js` and the two recorded fixtures say so. The request of G13 (Samurai
  Nightmare seed 42) and the 120,000 ms budget of the recorder are unchanged, and the recorder still generates it. The
  `replay-recorders` suite pins five wires and `REQUESTS.slice(8, 13)`, lists five records, rebuilds the wire file from
  five, and keeps its refusal test with an ID that is no wire (G14). The three consumers (`replay`, `steps`, `player`)
  already read `WIRE[id]`; each gets one test (`reads G13 from the saved wire and never regenerates it`) that forbids
  `SG.pipeline.run` with a spy and compares the result with the saved data.
- **Complete E on the final source** (recorder identity `c8601561…`, hash identity `a675f650…`): five wires, fourteen
  analyses, 520 hashes; each published only after its complete strict merge was read.
- **Coupled pins** of `steps`, `replay` and `player` (13 entries, `pins/resolved.json`), and the guides' example
  (`DEVELOPERGUIDE.md`, `.vn.md`, `generator/design.md` 7.5): the new G06 and G07 are required puzzles.
- No other production, test or default file changed. `tests/mega-contract.js` and its fixture are untouched.

### Output differences and what caused each

| Output | Changed | Cause |
|---|---|---|
| Replay wire G09 to G12 | one field each: `work` (MS05r3's per-attempt work counts), saved absent | the puzzles, ratings and dig logs of the four are unchanged |
| Replay wire G13 | new record (the same puzzle as the old golden: score 1,637, 106 clues, 2 attempts, 22.2 s) | the approved persistence (S-OD3 (d)); at 2 attempts instead of 8 the puzzle is the same shallow fallback |
| Replay analysis goldens | G06 (54 leaf fields) and G07 (92) differ; G01 to G05, G08 to G14 match, G13 and G14 included | G06 and G07 are `jigsaw9` Nightmare: the old puzzle was shallow and the new one is a required puzzle (1,678 to 2,348 and 1,938 to 2,340), as MS05b1 found at no allowance; the allowance 256 gives the same two puzzles |
| Regression hashes (520 keys) | 9 differ from the fixture at HEAD (which is MS05b1's interim record): `classic9/nightmare` 1, `diagonalX/nightmare` 2, `samurai/easy` 4, `butterfly/normal` 2 | see below |

Of the 149 keys that MS05b1 changed against MS04's fixture, 140 are found again at the final source (same hash), 5 are
not (the old puzzle comes back as a shallow fallback: `classic9/nightmare` 1, `diagonalX/nightmare` 1, `samurai/easy` 3)
and 4 give a third puzzle (`diagonalX/nightmare` 1, `samurai/easy` 1, `butterfly/normal` 2); the 371 keys that b1 left
alone are unchanged (MS05b1's 56 shallow fallbacks among them), and no key changes that b1 did not. Each of the 9 changed
keys was attributed by measurement outside E (the fix round, vidence/MS05r6a/diagnostic/: 15 diagnostic requests with
the hash route of perf.js, (i) no allowance at the size default for the 9 keys and (ii) allowance 256 with 8 attempts for
the 6 large ones): the allowance alone explains 6 keys (classic9/nightmare#8, diagonalX/nightmare#5 and #1597,
samurai/easy#610, utterfly/normal#610 and #10946), the size default alone 1 (samurai/easy#2584: the interim puzzle
is found at attempt 3, the size default stops at 2), and in 2 (samurai/easy#8 and #987) the allowance is necessary and
the size default's cut decides the result (with 8 attempts the capped search finds a different exact puzzle at attempt 3
and 5). Nothing else on the 81-cell keys: with the size default 8 the configuration (i) is MS05b1's and reproduces its
hashes exactly. The first round's inference that the size default had a larger share on the large boards was not borne out.
The R5 guarantee is the hits of its six cells, not these identities. The old mega16 attempt-6 diagnostic hit (r4, seed 3,
310.2 s) is unavailable at the new default by design (MS05r5p).
### The G13 guard and the deep records

A fresh G13 preflight (r4's `g13-closure.cjs`, unchanged) takes 21.872 s of the 120 s guard (18.2 %): 2 attempts, score
1,637, `exact` false, both warnings; r4's 104.7 s at 8 attempts is historical. `mega-contract.js --reconcile` on
MS05r5m's 14 records: complete, evidence sound, correctness pass, 6 relations pass; `currentMatches` is
`{ sourceHash: false, toolHash: true }`. The records are retained by an **exact-diff compatibility proof** against the
producer snapshot `refs/dv3-wip/MS05r5m-done-20261114-0230` (`ad77fdf`, whose files hash to `fee8b8d6…`): the only changed
file of `SOURCE_FILES` is `js/ui/store.js` (the legacy-8 migration: the same lines as
`evidence/MS05r5p/legacy-8-fix/store-diff.patch`), which neither `normalizeConfig` nor `run` executes and the deep tool
never calls; the tool files and the level guard are unchanged and `loadFixtures` and `nodeEnv` are identical function for
function (`replay-fixtures.js` differs only in comments and the header text of the wire fixture). No digest or tool was
touched and no MEGA-REFRESH was needed. Reported as "retained by exact-diff compatibility", not as a current match.

### Verified here, and what is not

The 15 changed or new tests pass by `--exact`, one selected test each; `steps` 57, `replay` 153 and `player` 69 pass in
complete runs after the pins (before them: 3, 6 and 3 failed); the four quick mega replacements and the 37 tests of
`mega-contract`, `replay-recorders` 39, `perf-tooling` 31, `help` and `ui-contract` 97 (Generator) and 89 (Player), and
`store`, `controls`, `history` and `cache` 251 pass. Not run: the full quick sets, GD, GH, soak, qualification, the
manual tier and `SG_DEEP` (MS05r6b). The pins lost specimens that no longer exist (multi-move jumps, reveal folds and a
falling new-hardest step went with the old G06 and G07): the assertions stay on the goldens that have them (G11, G12,
G13), and `pins/resolved.json` states each reduction. The `steps` and `replay` suites have no fixed results besides the
goldens; the `player` suite's 11 other fixed real results were searched and none carries a `replay.folded.reveal` step, so
G11 is the single specimen of that branch (named coverage item MS05r6a-COV01 for MS18e).

## MS05r6b: the final quick sets, classic9 GD, the deep reconciliation, the standing cost and the combined audit

Evidence of the S-OD2 recovery's audit boundary, not an acceptance (it needs MS05r6c's CI closure and the one combined
commit). Everything is in `docs/difficulty-v3/evidence/MS05r6b/`, with `evidence.md` as the index and `audit.md` as the
combined audit; the cost report is `docs/difficulty-v3/recovery-quick-cost.md`. Source: the retained tree on `1ae831c`,
Node v26.13.0, allowance 256, default attempts 8, 4 and 2 by board size; no engine, default, guard, request, fixture or
test assertion changed.

### What changed

- **Standing instructions (FS30), before the quick inventory froze.** `AGENTS.md`, both developer guides (the Tests
  paragraphs, the "Running the tests" part and the Player tests), `generator/design.md` 15.1 and `player/design.md` 10 no
  longer promise "about one minute" or "about fifteen seconds"; they state that a complete quick set is covered by disjoint
  shards when one command cannot hold it, that the total is the sum of the shards and the 540-second limit is per command,
  and they link the cost report. The quick-set counts are the final inventory's (50 suites and 3,262 tests, 30 and 1,683).
  Heavy-test restrictions and the quick-only policy are unchanged.
- **Scripts** in `generator/tests/artifacts/difficulty-v3/MS05r6b/`: the coverage reconciler (tested on synthetic complete,
  gap, duplicate, unexpected, mixed-source, bail, zero-test, skip and rename data), the inventory migration, the IR12
  compound driver (a task-owned copy; tested with scripted items), the GD pilot, and the read-only proofs and reports.

### The final quick sets (per app, per shard)

Generator, 50 suites, 3,262 tests in 7 disjoint shards (2 locked compounds): 3,262 passed, 0 failed, 0 skipped, on
fingerprint `7d3102d3…`. Player, 30 suites, 1,683 tests in 1 shard: all passed (`1d0724c3…`). The migration from MS05r5m's
draft is exact: 3,207 tests are 3,197 unchanged names and 10 renames (the 7 of IR13 and 3 more in `replay-recorders`) with 55
additions (46 `manual-corpus`, 6 legacy-8 store cases, 3 G13 spies). The first full Generator run had one failure,
`generator/i18n/9`, a test-order defect of the MS05r5p `history` and `cache` tests (their private copy of `app.js` pushed a second
locale fragment into the shared array; R6B-F01). SA2 decided that MS05r5p repairs it; that fix round isolated the private copies,
and every Generator shard was then run again, which is the final result above. The first run stays as history.

### Deep records, live CV3 and the manual results

`mega-contract.js --reconcile`: 14 of 14, complete, sound, correctness pass, 6 of 6 relations; `currentMatches` is
`{ sourceHash: false, toolHash: true }`, retained by an exact-diff proof against the producer snapshot (`store.js` only;
see MS05r6a above), so no MEGA-REFRESH. The five live CV3 requests of b3 (mega16 seeds 1 and 2, mega12 seeds 1 to 3) are
counted apart from the fourteen deep executions. b3's 186 manual results (167 pass, 19 failed availability assertions)
are retained under the same store-only proof (18 of the 167 fingerprint files differ, none executed by those selectors; rechecked after the R6B-F01 fix with 20 differing files, 7 of them quick suites, and the 22 GD results with exactly the 2 fixed quick suites).

### Classic9 GD (the difficulty manual suite, 154 tests)

153 tests ran in bounded shards (151 passed, 2 failed, one outstanding). Failed, as aggregate hit-rate assertions:
Nightmare 21 of 100 exact (needs 90; the batch took 430.5 s) and Normal 86 of 100. Every per-puzzle assertion (I1 to I7,
the pattern, the band) passed in all eight levels, and the 14 non-batch groups passed. Outstanding: the confusion matrix,
which reads all eight levels in one process (projected 505 s from the measured batches, above 450 s).

### Cost

Generator 646.681 s (10 min 47 s) for the complete quick set on the final fingerprint (the first run's 661.725 s is
historical) and Player 31.828 s, measured as the sum of the process seconds of the shard commands. The Generator total is above
five minutes, so S-AV08 carries its breakdown to MS07e: the `pipeline` suite is 286.0 s, of which three verbosity-cost benchmarks
are 225.3 s, and the `player` suite is 139.0 s.

### Verified here, and what is not

Verified: the final quick sets, classic9 GD, the deep and manual proofs, the three E merge checks (5 wires, 14 analyses,
520 keys, all current, twice). Not run: GQ, GH, GP, the browser scripts, `--all`, `--manual`, `SG_DEEP`, any engine change. The
audit is ready for the combined commit; the commit waits for MS05r6c's CI closure.

## MS05r6c: CI for the quick tier

CI closure of the recovery's audit boundary, inside the one combined acceptance (no separate commit). Everything is in
`docs/difficulty-v3/evidence/MS05r6c/`, with `evidence.md` as the index. Run locally only: no GitHub Actions run, dispatch,
push or deployment, so no remote pass is claimed. Source: the retained tree on `92a7693`, Node v26.13.0; no engine, default,
guard, request, fixture, suite or assertion changed.

### What changed

- **The Generator quick tier is a checked manifest, not a discovery.** `.github/scripts/generator-quick.json` holds 4 groups of
  MS05r6b's 7 disjoint whole-suite shards (50 suites, 3,262 tests), each with a finite bound, the job rule and `outOfCi` (the 8
  manual suites and the 4 tools). `generator-quick.js`, behind `generator-suites.sh` (`check`, `matrix`, `list`, `run`,
  `selftest`), registers the quick sets with `--list-tests` and fails unless every quick suite and test is in exactly one shard,
  no shard names a manual or an unknown suite or selects nothing, every manual suite is declared out of CI, the Player's quick set
  holds the shared suites and every job projection fits 30 minutes. A suite added later fails the check until it has a shard; the
  old `rest` group, which ran every manual suite and picked up any new one, is gone.
- **Both workflows** plan the matrix from that manifest (`plan-generator`: self-test, check, matrix) and run each group as
  `generator-suites.sh run <group>` (each shard its own `node tests/node-runner.js --suite=...`, argument array, every shard run, exit
  1 if any failed). Time limits, the time factor, triggers, permissions, the browser job and the deployment conditions are unchanged;
  Pages gained test limits of 15, 30 and 15 minutes. The header of each workflow names what replaces the deep and manual evidence.
- **Documents:** both developer guides ("Continuous integration", the tree line, the deployment paragraph), `generator/design.md`
  15.1 and its table of differences, and the one `AGENTS.md` item that said CI runs `--all`; the stale heavy-tier durations are removed.

### Verified here, and what is not

Verified: the final complete quick sets on the final documents, through the CI entry itself (Generator 3,262 of 3,262 in 7 shards,
Player 1,683 of 1,683, reconciled, `6b40d218…` and `547e4a4e…`), the check against the real tree (3,262 of 3,262 keys once), 50
synthetic negative checks, `actionlint`, a YAML parse, `bash -n`. Projected jobs 630 to 1,260 s of 1,800 s are local measurements
times a stated margin, not CI measurements. Not run: any remote job, the deep tier, the manual tier, GD, E, GQ, GP, the browser
scripts. Named items R6C-I01 to R6C-I06 in `evidence.md` (renamed job names for any branch protection, remote durations to record,
`docs/architecture.md` and `player/design.md` statements outside this task's files, new-suite ownership, superseded quick rows).

## MS05e: the guided sign dig (a sign pool) for Greater-Than, measured and set aside

The one bounded repair that CV6-01 / S-OD1 authorised, with its diagnosis first and every permitted value measured once.
**Outcome: measured, set aside** (CV6-05, the plan author's Q1(b) under S-OD6; Q2(a) keeps the contracts and final
qualification decides whether Normal is offered). MS05e closes as "set aside", not as an accepted repair. The 12 tracked files
were restored byte for byte from `f7be90f`, the new suite deleted, and the reviewed candidate saved as
`docs/difficulty-v3/evidence/MS05e/candidate-pool-4.patch` (13 files; rebuild and identity proof in `evidence.md`, section I).
`greater-than.js`, `generator/design.md` and both developer guides are at baseline: the experiment is described here and in the
report, not in the guides. Everything below that describes the pool is the candidate and is history only.
Report: [cv6-guided-sign-dig-2026-11-14.md](cv6-guided-sign-dig-2026-11-14.md); evidence: `docs/difficulty-v3/evidence/MS05e/`
(`evidence.md` is the index). Source measured: `rating-v3` at `f7be90f` (pack notes on the runtime baseline `00647f9`, no source difference) plus the candidate, Node v26.13.0, allowance 256, default attempts 8
for the 81 cells of Greater-Than; the floors, caps, orders, weights, bands, exactness rule and the CV6 assertion were unchanged.

### What the candidate changed (set aside)

- **The technique pass of the sign dig took a pool.** `SIGN_POOL` (4) live signs of the shuffled order that the pass had not
  refused were rated per step, each against the same current set (uniqueness count, then the bounded solve with the level's
  techniques, classified without another solve); the winner was removed: a solve that needed a technique of the level's tier
  first (`tierUsed`, a proxy from the technique counts), then the nearest to `options.target` (absent), else the
  highest score; ties kept the shuffled order. Ambiguous, stuck and top-of-band removals were refused for the rest of the pass
  (a fresh mask each tune round). One `tried` and one `oracleCalls` per rating, one inherited `budget.check()`, no cap, clock or
  random draw; the temporary clear was undone in a `finally`. The log got `keep` (cells, sign, score) for every allowed
  member, the winner included. `signs.minimal`, reveals, `MAX_TUNE_ROUNDS` and the keeper were as before.
- **Tests and CI.** A new quick suite `greater-than-guided` (15 tests) and two replay cases; its own CI shard (30 s); the bounds of
  `own-fast` and `pipeline` went up to 300 s and 400 s because Greater-Than generation inside the quick tier was slower (the
  quick set was 726 s, against 648 s).
- **Documents:** `generator/design.md` 7.5, 8.3 and 15, both developer guides (the dig log of Greater-Than and the suite counts:
  51 suites, 3,279 tests). All restored to baseline text by the set-aside.

### The diagnosis and the comparison

Seeds 300-319, Normal, unchanged source: 394 dug samples, 18 exact, 376 misses (21 shallow, none above the band, 21 local searches
ended on the proposal cap and the requests that had one took 95 % of the time). The trap that S-OD1 step 1 names is a sample below
the band **at the clue floor** with a minimal sign set: 83 of the 376 misses (22.1 %), 94 of 484 (19.4 %) after the change. Every
sample is minimal by construction, so the 355 misses (94 %) below the band are not the trap. The largest class is a setup that ended
two or more clues above the floor (187, 49.7 %; 217, 44.8 % after), then 85 below the band after a tune reveal (22.6 %; 142, 29.3 %
after). **Step 1's stop-and-report condition was met before the production edit and was not taken**; what holds the extra clues
is not recorded, and the split went into the decision (report section 7). Each of 4, 8 and 16 was run once on 240 requests
(Normal 300-319 and 7000-7039, Easy, Hard and Expert 300-319, two repeats each). On the diagnosed cohort the pool does not raise the
exact share of dug samples (4.0 % at pool 4 against 4.6 %); on the other cohorts it lowers the dug samples per exact request on most
values (Normal 7000-7039 35.9 before, 23.6, 20.8, 16.9 at pools 4, 8, 16; Hard 9.3, 8.3, 7.5, 5.3; Expert 29.6, 22.8, 36.7, 21.8;
Normal 300-319 19.7, 25.2, 17.1, 14.3), but each sample costs about `SIGN_POOL` times the ratings and it multiplies the oracle calls
(x4.5, x5.8, x9.4 on Normal 300-319), so every value is slower than the unguided pass (Normal 300-319 p95 5.3 s to 17.0 s at
pool 4, 23.0 s at 8, 15.9 s at 16); only Normal 7000-7039 at pool 4 breaks even. Pool 4 has the lowest total time on four of the five
cohorts and in their sum (pool 8 is lower on Normal 300-319: 88.1 / 87.7 s against 89.7 / 93.0 s) and was the candidate carried to
the review. With it CV6 of Normal still failed (17,014 ms against 1,400 ms; 5,209 ms before) and CV6 of Nightmare failed too
(40,396 ms against 20,000 ms).

### The decision (CV6-05) and the two errors the plan author acknowledges

Q1(b), withdraw the pool, and Q2(a), keep the contracts (`BUDGET_MS.normal` stays 700 ms, GP's rules stay, final qualification
decides whether Normal is offered). Reasons, in short: no tried value closes CV6 and no further value or strategy may be tried;
Nightmare CV6 went from a pass to 40,396 ms, a second failing contract that no recorded decision covers; Easy, Hard and Expert
paid 3.3, 2.9 and 1.3 times and the quick set 12 %; Normal 7000-7039 sits at the 10 s qualification budget with or without the
pool (p95 10.6 against 10.7 s); a target cannot pay back a dig that costs 3.6 times more per sample. The plan author states two
errors of his own: (1) the CV6-01 premise ("below the band at the clue floor ... with nothing left to remove") came from one
seed (308) and covers only a fifth of the misses (83 of 376; 187 are setups with two or more clues above the floor); (2) step 2
and PR-S2 underestimated the cost: the evaluation reuses the oracle's solve, but the losers are rated again, so a removal costs
about `SIGN_POOL` ratings instead of 1.15, over about 103 removals per sample. IR23 is acknowledged as written: the gate's
stop-and-report condition was met and not taken. Every measurement stands. No second strategy (IR29's lever included) is
authorised; the observations stay as evidence for the later improve-generating feature.

Sign target (replaces S-OD1's MS06 sentence): on Greater-Than the target is transported, not consumed, by the sign dig; MS06
makes no edit to `greater-than.js`; the pack edits belong to SA2.

### The candidate's output differences and what caused each (history only; none applies to the restored source)

| Output | Changed | Cause |
|---|---|---|
| Regression hashes (520 keys) | 30: `greaterThan/normal` 15 seeds, `greaterThan/hard` 15 seeds; the other 490 unchanged (ten Greater-Than keys among them keep their hash; why is not measured) | The pool removes other signs, so the same seed is another puzzle |
| Replay wire G09-G13 | G11 (1,418 fields) and G12 (552); G09, G10, G13 unchanged | Same cause (the two Greater-Than requests) |
| Replay analysis G01-G14 | G11 (167 fields) and G12 (131); the other twelve unchanged | The two new puzzles |
| Help examples | none | Both Greater-Than examples match |
| Pinned assertions of `replay`, `steps` and `player` | 12 tests re-derived from the refreshed goldens (details jumps 16 to 14, distinct 18 to 16, 29 to 27 jumps, G11's positions, signs and totals) | G11 and G12 changed |

### Verified for the candidate (history only), what applies by identity, and the items

Verified for the candidate: the Generator quick set in four locked CI groups (3,279 of 3,279), the Player quick set (1,683 of
1,683), the CI check and self-test, the 18 per-level CV6 and I5 cells (16 pass; Normal and Nightmare CV6 fail on time; they
applied to the candidate's final tree, see `evidence/MS05e/evidence.md` section E, "GD applicability"), the three E merges (5
wires, 14 analyses, 520 keys, written and checked), GH. Not run: GQ, GP, `--all`, the other manual cells, the browser scripts,
`SG_DEEP`. None of it applies to what is committed.

Applies to the restored source by identity (proof, no run: `git diff --quiet HEAD -- generator core player DEVELOPERGUIDE.md
DEVELOPERGUIDE.vn.md AGENTS.md .github` exits 0, no untracked file in a fingerprinted folder, `greater-than.js` blob `cbab64b8`
equal to `f7be90f`'s): MS05r6c's final quick sets (Generator 3,262 of 3,262 in 50 suites and 7 shards, 648.0 s; Player 1,683 of
1,683), MS05r6b's E and GD records, and this task's records of the unchanged source (`before/`, `gd/before/`).

Items (CV6-05; SA2 updates the check-list): S-AV01 carried open under Q2(a), Normal CV6 5,209 ms against 1,400 ms and 10.6 s p95
on seeds 7000-7039; S-AV16 (Nightmare CV6 40,396 ms) and S-AV17 (the cost on the other levels and in the quick tier) withdrawn as
current-source items, their observations kept as history; S-AV08 back to 648.0 s; Nightmare CV6 passes at 19,192 ms of 20,000
(a 4 % margin, MS05b3's same-seed I5 record), noted for MS07e because MS07's chain work will move it; F01 and F02 (and IR29,
IR30) moot. How S-AV01 ends (report section 7): hidden by the existing rule if Normal fails qualification at MS18c; if it
qualifies but CV6 still exceeds its assertion, MS18c returns to the plan author before MS18d's final timing runs and the first
branch of S-OD1's fallback (b) is decided once, on the final-source data (one base value in milliseconds for
`BUDGET_MS.normal`, never above 10,000 ms, with the test and both guides changed in that step); until then 700 ms stands.

## MS06c1: nullable target transport, no policy activation

Preparation for MS06c2, which draws the one target per sample and activates every candidate-comparing stage at once. **No target is
drawn, no policy is called, the first-allowed sign pass is untouched (`greater-than.js` is not edited), and no puzzle changes:** the
520 regression hashes are the same before and after. What it adds, all internal and all `null` for a normal request:

- **Typed objectives.** `SG.digger.removalObjective` returns `{ kind: 'refused', reason }`, `{ kind: 'bounded', score, tierUsed }`
  (`tierUsed` from the same restricted solve, vacuous for Very Easy and an empty tier, never `requiredOf`) or `{ kind: 'proposal',
  priority }`. The guided pass ranks by the old number (`score` or `priority`), first of an equal value wins, refusals keep their
  reason, `trace.keep` shows the number. 29 recorded passes (bounded and proposal, `characterize.cjs`, captured on HEAD `1d657b1`
  before the edit) have the same givens, statistics, oracle calls, dig log and events (`digger-target`).
- **Keeper views.** `SG.digger.keeperView(keeper, target)`: the shared keeper through its prototype (live `best`, `distance`,
  `unsound`, model-aware `closer`), with an `offer` that gives every candidate the scalar target captured for its own sample or search.
  `createKeeper` stores it, `keptPuzzle` hands it on, `LevelPuzzle.target`, `GeneratedPuzzle.target`, `PuzzleResult.target`,
  `toWire` / `fromWire` (an old wire or cache entry gives `null`, nothing is inferred from the score), the `tune` events (finite target
  only) and the soak row carry it. The local search takes `attemptBest.target`. Tests exercise two suspended contexts with targets 812.5 and
  915 on one keeper, an earlier structure-only winner (`null`), zero and `null`, the wire, worker, cache and soak routes.
- **Preparation-phase assertions** (replaced by MS06c2's active-policy tests, transport tests kept): plain generation draws no `target`
  stream and the registered `signs` strategy gets no `target` option.
- **SA1's binding items from MS06b.** IR31: the floor case of `acceptReveal` (target 705: 730 to 699 refused, 730 to 701 allowed),
  confirmed by mutation (removing `next.score >= spec.min` fails it alone). IR32: `design.md` 6.8 names the real guard, no clue added to a
  model with signs. IR33: the case is named for what it asserts. IR36: the Vietnamese guide links `design.md` 6.8. IR35: the hell2 band is
  `SG.difficulty.bandOf('hell2')`.

Evidence (`docs/difficulty-v3/evidence/MS06c1/`): GG check-only, 104 shards, all 520 puzzles unchanged (`hash-check.txt`); GR: the five
wires differ from HEAD by one field each, `target` (saved undefined, fresh `null`), published (`wire-check-before-write.txt`,
`wire-write-and-check.txt`), the 14 analyses match unchanged (`analysis-check.txt`); the compound driver is MS05r6a's with per-item
projections (`generator/tests/artifacts/difficulty-v3/MS06c1/`). Final quick sets on the final tree, one CI group per locked command:
Generator 3,323 of 3,323 (3,290 + 33 new) in four groups (shard process-seconds sum 650.7 s; S-AV08 was 652.9 s), fingerprint `d9e03806...`; Player 1,683 of 1,683, `3873abea...`;
`generator-suites.sh check` passes (3,323 of 3,323 in exactly one shard); no suite or shard was added. No S-OD4 item is new; the
inherited list is unchanged (S-AV01-S-AV15, S-AV18-S-AV20, MS05r6a-COV01; S-AV16 and S-AV17 withdrawn).

## MS06c2: one originating target in every search stage

The policy of MS06b is active. Every sample that `generate` enters draws its own target from its own child stream
(`rng.fork('dig#<attempt>.<t>')`) and passes it, over any caller value; a lower-level `digLevel` call keeps an explicit value and
initialises an absent one once. The same target steers, in one change, the guided pass of the cells strategy (nearest the target inside
the best tier; the apply table can end the pass with one end record and no further work; the pass evaluates its own board once),
the downward refinement (from an exact state in the band it goes on while above the target, keeping only exact reveals strictly
nearer it; same 64-rating allowance) and the local search (an exact tie is not followed; the keeper still sees every candidate
first). Greater-Than transports the target and does not consume it
(CV6-05); `greater-than.js` is not edited, and no weight, band, cap, floor or offer changes. A local search continues with the
target of the candidate it started from, a structure-search winner keeps `null`, and every context gets the original keeper.
`explain.dig.how`, `explain.dig.code.deeper` and `dig.keep` (English and Vietnamese), `design.md` 6.8, 7.2, 13.9, 13.13, 15.2 and
15.3, both developer guides and the CI manifest state the active behaviour.

**A seed gives another puzzle, by design.** Complete E (`docs/difficulty-v3/evidence/MS06c2/`, `evidence.md`): 194 of the 520
regression hashes changed (20 of the 26 keys; the Very Easy keys and Greater-Than Normal and Hard are unchanged), published and
re-checked; the five wires differ by `target` (null to a finite number) and, in G09, G10 and G13, by search work counters, with the
puzzles unchanged, and G11 and G12 by `target` only; G01, G04, G05 and G06 changed among the 14 analyses (all four are new
puzzles of the same seeds; G06 differs in its last guided removal), the other ten match. The GR ledgers carry the identity of
the 63 engine and UI sources, so they were recorded again after the fix round's locale and help edits (fixtures unchanged).
Pins of `replay`, `replay-recorders`, `steps` and `player` were re-derived from the refreshed goldens (exchanges now come from
G07; a 4-part jump and the wrapped-singles layout use synthetic specimens, the restored culprit G07's exchange step with a
made-up jump). `digger-target` has 75 tests; the real `signs` route (Greater-Than Expert, seed 319) takes 0.27 s inside a
1.4 s shard.

Final quick sets on the final tree of the fix round, one CI group per locked command: Generator 3,346 of 3,346 (`shared-small`
1,465, 66.5 s; `own-suites` 1,658, 167.9 s; `pipeline` 154, 322.9 s; `replay-player` 69, 133.4 s; 690.7 s in all), fingerprint
`6867bdb2...`; Player 1,683 of 1,683, `e764236e...`; `generator-suites.sh check` passes (3,346 of 3,346 in exactly one shard).

Named item, S-AV08, for MS06d and MS07e: the four groups rise by 36.9 s (653.8 s at MS06c1 by the same sum). MS06c1's per-test
times are recorded, so it is attributed: `pipeline` +35.8 s (286.6 to 322.4 s, 10 % below its 360 s projection), all of it in four
puzzle-generating tests (the three instrumentation-cost tests 75 to 87 s each, +15 %, and "classic9, every level, several
seeds" 18.2 to 22.0 s, +21 %; the other 144 tests -2.2 s); `mega` 11.0 to 15.4 s (+40 %); the 520 regression-hash requests got
faster, 567 to 522 s. The first final run (SA1's review) had +40.2 s, +16 % to +21 % and +43 %. A mixed generation cost of the
active policy, not a stop. No other S-OD4 item is new; the inherited list is unchanged.

## MS06d: the isolated target comparison (17 cells, 204 requests)

MS06a's 17 commands repeated on the source of MS06c2 (HEAD `091a44b`, source hash `e435640c...`, the policy active; the before-record is
MS06a at `ef8a9cc`, `a073f9bd...`), one locked command per cell, 12 requests per cell, seed base 20260101, the same routes, allowance
256 and eight attempts; nothing sharded, 570.5 s of helper time, no lock wait, every command exit 0. **Evidence only**: the before-record
is untouched, the after and the comparison are appended to `docs/difficulty-v3/target-scope-2026-11-14.md` and the ledgers, transcripts,
the comparison script and its generated tables are in `docs/difficulty-v3/evidence/MS06d/` (917 recomputation checks, 0 disagreements).
All 204 request identities equal MS06a's; 128 of the 204 requests generate the identical puzzle, 76 another one.

- **Hits.** 164 exact / 38 shallow / 2 miss against 163 / 39 / 2 (in band 202 both times); classic9 Normal 10 to 11, classic9
  Nightmare 2 to 3, **jigsaw9 Expert 11 to 10**, 14 cells unchanged. Seven requests changed outcome, four gains and three losses (R7
  loss report: jigsaw9 Expert request 0 exact in 0.57 s to shallow in 2.62 s with all eight attempts; classic9 Nightmare 1; diagonalX
  Nightmare 6, 2.39 to 11.75 s), every one among the 76 changed puzzles. The soak's old gate line: 4 FAIL to 3 FAIL (classic9 Normal now 92%).
- **Positions (AC01).** The adjusted exact median fell in 8 of 14 cells (jigsaw9 Hard 0.806 to 0.528, classic9 Master 0.511 to 0.426,
  Expert 0.636 to 0.561), rose in diagonalX Nightmare (0.623 to 0.711), and is unchanged in classic9 Normal, killer Normal and the three
  Greater-Than cells; pooled, 0.623 to 0.560 and the top quarter 35 of 151 to 31 of 152. The Hell 1 adjusted positions stay `empty-tier`,
  the two off-band Greater-Than Expert rows `off-band`; the same 14 undefined rows before and after. The target deviation (after only)
  shows a weak pull on aggregate (paired 0.297 against 0.316 shuffled), clear in classic9 Normal, Hard and Hell 1.
- **Time and work.** Generation 454.62 to 454.42 s (1.00x); jigsaw9 Nightmare 5.94 to 9.08 s (1.53x) and Expert 7.98 to 10.30 s (1.29x)
  slower, classic9 and diagonalX Nightmare 0.92x; 9 `SLOW` flags before and after. Full ratings 73,393 to 79,170 (+7.9%); jigsaw9
  Nightmare 2.6x. The plateau effect SA1 asked about (G10 is killer Nightmare, not in the 17): killer Hard +22% full ratings and killer
  Expert +0.8% at unchanged time, 95 of 96 Hard searches still end on the proposal cap.
- **Greater-Than (CV6-05).** All 36 requests give the identical puzzle: a null effect, not a defect; exact 12/12, 12/12, 10/12, requests 2
  and 5 of Expert still off-band in Master.
- **Errors.** None: 0 request errors, 0 invariant violations, 0 check, reference, final-path or work errors in 204 rows.

Named items (S-OD4, none a stop): new **S-AV21** jigsaw9 Expert exact loss (11 to 10), **S-AV22** request-level exact churn (three
losses, four gains), **S-AV23** jigsaw9 Nightmare and Expert cost; S-AV01, S-AV05-S-AV08, S-AV14, S-AV18-S-AV20 re-measured (S-AV08's
690.7 s is a quick-suite figure, not measured by the 204 requests, which show no rise); the rest unchanged. Routes: MS07e, then MS18c
(availability) and MS18d (cost).

## MS07b: the four chain windows, the strict check gate, the mega Hell 1 contract

`forcingChain`, `forcingChainLong`, `nishio` and `nishioDeep` are registered (28 techniques, 23 classic), each a wrapper of the MS07a seam that
hands it its ID, both bounds and its work limit explicitly: `forcingChain` 1 to C links and `nishio` depth 1, both unbounded (their
accepted policy; the parent budget and cancellation still apply, and the private spec says `Infinity`, never `null`), `forcingChainLong`
C + 1 to 12 links and `nishioDeep` depth 2 (3 only when the caller asks), both at 50,000. C is `SG.chainSearch.SHORT_MAX`, 6 provisionally and
read at every call; the cutoff is MS07c's to select. The weights are 1400 and 2600 (orders 198 and 202, baseCosts 118 and 210); Hell 1 has a
tier for the first time (`nishioDeep`, in its help), so it is no longer a vacuous exactness case. A caller's `maxChainLength` and
`maxNishioDepth` only narrow a window. Bounded scans now keep **at most 256 work units between two parent-budget checks** (IR52: the
checkpoint is the work at the last check, an oversized expansion is split into pieces of at most 256 edges, every edge visited and
counted once); the unbounded legacy cadence is unchanged. A budget swallowed by a finder is still found by the caller's own check.
Two real positives and at least one negative per ID (long chains of 7 and 8 links, short ones of 3 and 4, depth-2 deep proofs and depth-1
shallow ones), locales and help in both apps, and `forcingChainLong` and `nishioDeep` examples from real puzzles (28 examples).

**Output differences and what caused each.** E (`docs/difficulty-v3/evidence/MS07b/`): **6 of the 520 regression hashes changed**, all
Nightmare (classic9 seeds 2, 3 and 6765, diagonalX seeds 89, 377 and 610). MS07b's source causes all six (the accepted MS07a source reproduces the
old hashes exactly), but it changes a dig in four ways, not one: (1) labels and weights (a 7- to 12-link proof is a Nightmare-tier
`forcingChainLong` where it was a Master `forcingChain`; a depth-2 proof is a Hell 1-tier `nishioDeep` where it was `nishio`); (2) the allowed sets of
the oracles (Nightmare's lost depth-2 Nishio, Master's lost 7- to 12-link chains); (3) the number of budget checks (IR59 below); (4) the
50,000 limit of the two new IDs, which hardly binds on 9x9 (a complete negative scan of the long window costs about 4,600 to 4,900 units on the
stuck positions of three famous puzzles). Attribution only as far as the records support it: classic9 seeds 2, 3 and 6765 and diagonalX 89 and 610
have a `forcingChainLong` step in the new result, so the probable cause is (1) with (2): an earlier candidate of the same seed is now exact (3, 5, 5
and 3 attempts against 8, 8, 8 and 5), or, where both runs use eight attempts (610), the fallback ranks another candidate first. **diagonalX 377
does not fit that**: its new result (exact at attempt 4, one depth-1 `nishio`) has no `forcingChainLong` or `nishioDeep` step and would be exact under
the old registry too, so its dig itself changed, most likely through (2); it is not attributed to one mechanism. "Nothing else in the 520
changed" is a count (24 of 26 keys), not evidence of a single cause. The five wires G09 to G13 and 13 of the 14 analyses are unchanged;
**G14** (mega16 Hell 2,
seed 12) has two more compact steps: its former last `nishio` step is `nishio` at 3,603 and `nishioDeep` at 6,408 and 6,453, and the compact audit
bridges the jump by position 72. Pins: `replay` (G14's avoided jump), `pipeline` (the capped-trace request is Nightmare seed 26: a
classic9 Hell 1 request now spends all eight attempts, 2,225 events minimum against a cap of 2000), `purity`, Player `help` (28).

**Reclassification of a published reference.** `constructed-nightmare-2` (two 7-link steps) scores 2,632 and is a **Hell 1**, `required` still
false, where it was a Nightmare; `V3_EXPECTED` and the labelled floor row were re-derived from the registry, not fitted. The famous
puzzles stay Hell 2 and their requiredness stays vacuous (Hell 2's tier is empty, as before); their hardest technique is now `nishioDeep`.

**Hell 1 pilot** (classic9, seed 20260101, two requests, C = 6): 5,354.2 and 4,930.8 ms generation, both in band and shallow (no step
beyond a 6-link chain or depth 1); projected GD (20 requests) 102.8 s and GQ (first 40, serial) 205.7 s as `20 x` and `40 x` the mean
(155 s and 310 s with the soak's own reference checks). Named item: both requests are over the section 9.1 budget of 2,500 ms.

**Mega Hell 1** is now deep like mega Nightmare (S-OD4, CV6-03 (1)): the same fourteen occurrences per level in `tests/mega-contract.js`
(`--level=hell1`, ids `<board>-hell1-<role>`, its own manifest hash and record kind; the Nightmare ids and hash are unchanged), recorded once
on the final source: 14 of 14 correct, 6 of 6 relations pass, 0 of 14 exact (every request a truthful shallow fallback), mega12 29.3 to 34.4 s,
mega16 99.9 to 123.3 s (one request over the 120 s application guard, none over 240 s). The quick `mega` suite has a real one-attempt mega12 Hell 1 request (7.74 s measured, limit 18 s before the
time factor) and the existing scripted mega16 control.

**Evidence provenance and the cost tool (IR55).** The original of MS07a's differential is `9dfc9a3:core/js/engine/tech-chain.js` (blob
`efa8a1fe...`, SHA-256 `40bda8ed...`), the accepted MS07a source is `959aae0` (blob `1bfa557a...`, `f8985bd2...`); the candidate of the first
MS07a differential was not recorded (`evidence/MS07b/evidence.md` section 2). A fixture mismatch now fails a cost record and the CLI (exit 1)
and the test sandbox is a per-run folder under the ignored `.scratch-pattern-cost-tools/`. **Wrapper cost, historical:** MS07a's final
wrapper measured 428.7 against 417.8 ms find-only (+2.6 %) on its mostly-short-find corpus, with the standing quick set unchanged (690.2 against
690.7 s): `docs/difficulty-v3/evidence/MS07a/evidence.md` section 4 and `transcripts.txt`; a microbenchmark of that source, not a
generator-wide slowdown and not an S-AV item (MS18d can find it there).

**Verified here, and what is not.** The final quick sets on the final tree (after the fix round's user-guide edits): Generator 3,449 of 3,449 (744.9 s over the four CI groups, fingerprint
`f752e35b...5e0e44`), Player 1,749 of 1,749 (`f0749637...6fe2b6`), `generator-suites.sh check` exit 0; complete E on the final source (5 wires, 14
analyses, 520 hashes), the fourteen Hell 1 deep records reconciled (14 of 14 correct, 6 relations), the pilot and the real help examples.
Not verified: any selection of C (MS07c), the pilot's 20- and 40-request projections
(estimates), the manual `difficulty` suite (its contracts were checked on a scratch script, not run), and a real human reading of the new help
texts. Handoffs: the soak `--chain-window` override, the cost records and the diagnostics of the new IDs (`difficulty-diagnostics.js` counts
chain lengths and depths of `forcingChain` and `nishio` only) to MS07c; the scoped `lawOfLeftovers` supplements and the scoped cost-tool adapter to
MS14b; the final-source rerun of the complete Nightmare and Hell 1 deep population to MS18e. **IR59 (MS07c, MS07e):** the dig's objective guard
(`OBJECTIVE_STEPS` = 100,000 budget checks, then the removal is refused) counts every finder check, and from Nightmare up MS07b adds the entry and
gate checks of the new IDs and a second scan of the roots or depth-1 trials by each window (about twice the chain-scan work on the stuck positions of
famous puzzles, plus about 19 gate checks); the guard's margin was measured on the old cadence and larger boards are the likelier place to meet it;
count it among the possible causes of any availability or cost movement (an S-OD4 item if it shows, not a stop). **IR60 (MS07c owns the
setter):** `SHORT_MAX` is only checked to be a number: C of 0 or less, 12 or more or `Infinity` is accepted, though R9 allows 4 or 6 only; no production
path sets C. Named items (S-OD4, none a stop; numbers proposed): S-AV08
re-measured, the standing quick cost 744.9 s against 690.2 s (+54.7 s, +7.9 %; 739.2 s in the run before the guide fix; the G14 golden now rating `nishioDeep` positions); new **S-AV24** mega Hell 1
request time (against the 120 s application guard: mega16 median 116.7 s, max 123.3 s, one request of 7 over it; against the 30 s qualification
figure: mega12 median 34.2 s, 6 of 7 over it, mega16 7 of 7), **S-AV25** no exact Hell 1 puzzle in the
deep population or the pilot (0 of 14, 0 of 2) and no depth-2 step in 12 more Hell 1 puzzles of the discovery (none in 28 Hell 1 generations on this
source): **the classic9 Hell 1 GD batch at MS07e (at least 90 % exact of 20) is expected to fail**, an availability result, not a regression,
**S-AV26** classic9 Hell 1 requests 4.9 to 5.4 s against the 2.5 s budget (an indication: two requests, not section 9.1's p95; related to S-AV19);
routes MS07e, then MS18c and MS18d.

## MS07c: the short-chain cutoff C = 4 and its override

**The selection (R9, owner SA1-Q-S1(c)).** `SG.chainSearch.SHORT_MAX`, the cutoff between `forcingChain` (1 to C links) and `forcingChainLong` (C + 1 to 12), is now **4**
(it was 6 provisionally). The rule was fixed beforehand: measure C = 4 and C = 6 on fresh generation requests and take the cutoff with more exact hits in total, C = 6 on a tie. The
experiment is 12 fresh Nightmare requests per cutoff of classic9, diagonalX and Jigsaw 9 (soak base seed 20260101, the allowance, the attempts and the weights fixed, every
error a miss): **C = 4 36 of 36 exact, C = 6 24 of 36** (classic9 12 / 2, diagonalX 12 / 10, Jigsaw 9 12 / 12), no error and no invariant violation, 12.3 s against 121.8 s of command
time. With C = 6 a Nightmare proof needs a 7-link chain or a Nishio, so most requests end as a shallow fallback after all attempts; with C = 4 every proof of 5 or more
links is `forcingChainLong` (a Nightmare-tier technique), so the first attempts are exact. The only production edit is the literal `INITIAL_SHORT_MAX`; the long ceiling 12, the depths, the
weights, the work limits, the orders and the offers are unchanged. Full record: [chain-window-2026-11-15.md](chain-window-2026-11-15.md), evidence [evidence/MS07c/](evidence/MS07c/evidence.md).

**The override.** `node tests\soak.js ... --chain-window=4|6` (diagnostic, never a production or user setting) sets C once before the ordered-prefix check, the references and the requests and puts it
back when the run ends; any other value is a usage error (exit 2) before a request, `--no-gate` included. The ledger says `meta.chainWindow` (asked, `null` when not) and `meta.chainShortMax`
(in force), and `mergeShards` refuses shards of different cutoffs (and an explicit window against none), so C = 4 and C = 6 never join. IR60 (no range check on `SHORT_MAX`) is closed at the setter: the soak
accepts 4 and 6 only; the engine's reader is unchanged (the task allows a default-only production change). The chain statistics of a ledger now count the proofs of both windows (`forcingChainLong`
lengths and `nishioDeep` depths with the short ones, the diagnostics handed over by MS07b). 94 tests in `difficulty-diagnostics` (85 before), four checks of the checks (mutations M1, M2, M3 and M5).

**Reclassifications of reference puzzles (R20).** `constructed-nightmare-1` goes from Nightmare, not required (score 2,178 at C = 6), to **Hell 1, not required (2,704)**, and
`constructed-nightmare-3` from Nightmare, not required (2,148) to **Hell 1, not required (2,642)**. The cause is `forcingChainLong` (weight 1,400): their shortest chains of 5 and 6 links, which were
`forcingChain` (1,100) at C = 6, are its steps at C = 4 (`-1`: 2 `forcingChain` and 6 `forcingChainLong` steps; `-3`: 5 and 3).
`V3_EXPECTED` in `generator/tests/fixtures/rated.js` says `['hell1', false]` for both (like `constructed-nightmare-2` since MS07b, which now scores 2,662 instead of 2,632); the quick `difficulty-floor` suite
checks every `v3Expected` against the rater, and the manual `difficulty` suite names the three (not run). `rated-scores.txt` in the evidence is the read-only rating of every rated entry at both cutoffs.
No other rated entry changes its level or requiredness.

**Output differences and what caused each.** E on the final source (`d591e6f6...`): **37 of the 520 regression hashes changed**, all Nightmare (classic9 18 of 20, diagonalX 19 of 20); the wires G10 (Killer Nightmare) and G13
(Samurai Nightmare) changed and are now exact at attempts 4 and 1 where both were shallow fallbacks; G03 to G07, G10, G13 and G14 differ in the analyses (a 5- or 6-link chain is `forcingChainLong` with a higher score,
and the digs of G04 to G07, G10 and G13 ended elsewhere); only the `forcingChainLong` help example changed (the same discovered puzzle gives a 6-link contradiction). The cause is the default in every case: nothing was fitted.
The pins that follow (the registry fixtures of `forcingChainLong`, a `forcingChain` boundary negative, the three constructed Nightmare puzzles which are Hell 1, the exchange of G04 as the only exchange, the 14 compact and 17
details jumps of the goldens, the shallow-fallback specimen of the cache, worker and pipeline suites moving from seed 42 to seed 5) are in the evidence. The generated golden fixture wraps a long jump key onto its own line
(`replay-recording.js`), which meant recording the GR ledgers a second time.

**Cost and the pilot.** The Hell 1 pilot is repeated because the default changed: 5,559.6 and 5,571.3 ms for the two requests (mean 5,565.4 ms, MS07b 5,142.5 ms), both in band and shallow (0 of 2 exact, no `nishioDeep` step), the unchanged 20-request GD
batch projecting to 111.3 s and the first 40 GQ requests to 222.6 s. The split IDs cost, on their real fixtures, at most 10,039 of the 50,000 units of `forcingChainLong` (20.1 %) and 12.6 ms for `nishioDeep`, nothing capped. The objective guard of
the dig (IR59) refused nothing in 240,130 solves observed outside the soak. The standing quick cost is **684.3 s** (744.9 s at MS07b: the changed goldens and requests end earlier); Generator 3,459 and Player 1,750 tests.

**Handoffs to MS07d and MS07e (SA1 review 17, IR62 to IR66).**

- **Stale records are history.** The 28 deep mega records are two sets of 14: the Hell 1 records (MS07b, source `ddf2fa5a...`) describe C = 6; the Nightmare records (MS05r5m, `fee8b8d6...`) predate the split, when chains of up to 12 links were Master's `forcingChain` and Nightmare's tier was the old `nishio`. Neither set describes the current source. MS07d does not read them and MS07e must not compare them as current; MS18e reruns the population once, after the final engine change.
- **S-AV22 and S-AV23 (window-cell numbers).** S-AV22's two Nightmare losses (classic9 request 1, diagonalX request 6) are exact at C = 4 (both cells 12 of 12) and misses at C = 6. S-AV23's Jigsaw 9 Nightmare cell is 12 of 12 exact at both cutoffs: C = 4 median 142.2 ms, p95 481.3 ms, 701 full ratings; C = 6 median 423.5 ms, p95 2,705.3 ms, 3,138 full ratings.
- **Three side effects not measured at C = 4:** Master availability (it lost the 5- and 6-link chains; its 40 regression hashes did not move), the Greater-Than Nightmare CV6 margin (19,192 of 20,000 ms at the restored source), and Nightmare and Hell 1 on large boards. GQ and GD are the first measurements on this source; a failure is a new named item attributed to it.
- **Expected at MS07e:** the classic9 Hell 1 GD batch (at least 90 % exact of 20) fails (S-AV25), an availability result and not a regression; the manual `difficulty` suite passes its certificate and "v3 reference" contracts at its first run.

**Verified here, and what is not.** The final quick sets on the final tree (after the review fix round: the design table of section 6.7 and a comment of `tech-chain.js`): Generator 3,459 of 3,459 (fingerprint `d32f1d9e...41827`), Player 1,750 of 1,750 (`dfb21962...9c323`), `generator-suites.sh check` exit 0; complete E, the complete GH
catalogue, the pilot and the cost record. Not verified: the manual `difficulty` suite (edited for the three constructed Nightmare puzzles, **not run**: MS07b's edit had left its "constructed puzzle keeps its label" contract false for
`constructed-nightmare-2`), the mega Nightmare and Hell 1 deep records (history on earlier sources, see above; MS18e reruns them), and any qualification or GQ-first (not this task's gate). Named items: S-AV08 re-measured at 684.3 s;
S-AV04, S-AV07, S-AV19, S-AV20, S-AV22 and S-AV23 changed numbers on the window cells and on G13 (listed in the evidence, routes MS07e then MS18c and MS18d); S-AV25 (no `nishioDeep` step in 30 Hell 1 generations) and S-AV26 (5.6 s per Hell 1 request) with the pilot's numbers; S-AV02, S-AV03 and S-AV24 as history.

## MS07e: the first qualification checkpoint (incomplete by cost), GG and GD on the C = 4 source

**What ran.** The 135 cells of checklist Q at jobs 4 on HEAD `8b70875` (engine sources `029720df77c6c12a`, qualifier `c0ef0d25…`, C = 4, attempts 8 / 4 / 2): **129 cells complete and protocol-valid**
(4,311 requests, 3,794 exact hits, 0 errors, 0 invalid or non-unique puzzles), **6 not launched** because the S-AV27 projection (the first round on four workers plus 60 serial second-round request times, no early stop)
exceeds 450 s: mega12 hell1, mega16 nightmare and hell1, greaterThan expert and hell1, butterfly hell1. The merger accepts the 129 shards and rejects the folder only for `missing 6 of 135 cells`, so the checkpoint
is **not** a complete merged record; `docs/difficulty-v3/qualification-checkpoint-2026-11-15.json` (`complete: false`) and `.md` carry the table, the six named items and every number. Nothing is offered, hidden or pruned by it.

**Results.** 89 of the 129 cells offered, 40 hidden. Against the current lists, 23 cells are observed hidden (classic9 hell1; diagonalX and hyper easy and hell1; jigsaw9 hell1; killer hard to hell1; greaterThan master on time;
samurai, sohei and flower easy and hell1; butterfly easy; flower expert and master; wordoku normal and hell1) and none is observed offered that is hidden today. Nightmare is now 40 of 40 on every board with tiers except Killer
(the pre-split records of mega12 0 of 7, samurai and classic9 21 of 100 are history); **every executed Hell 1 cell has 0 exact hits** (112 requests, all in band and shallow); Killer Hard 0 of 14 and Expert 1 of 14 are
hidden (the owner question Q-MS07e-1: Killer weights inside v3, or hidden until a later calibration); Easy fails on diagonalX, hyper, samurai, sohei, butterfly and flower. New items S-AV28 (Easy), S-AV29 (Greater-Than Master p95
14.5 s over 10 s), S-AV30 (mid-level shortfalls); S-AV15 (the confusion matrix) is executed and passed.

**GG and GD.** All 520 regression hashes unchanged (104 shards, one merge check). The classic9 `difficulty` manual suite ran as 154 tests once each: 152 passed, 2 failed on the unchanged aggregate hit-rate assertion
(Hell 1 0 of 20 exact, S-AV25; Normal 83 of 100, S-AV14), no per-puzzle failure; the Nightmare batch took 17.3 s (430.5 s at the recovery source: the IR17 margin question disappears at C = 4). Greater-Than Nightmare CV6
passes; Normal CV6 fails at p95 5,361.5 ms against 1,400 ms (S-AV01, unchanged 700 ms base and offers).

**Cost of the evidence and of the tier.** The 129 launched cells took 1,523 s against 11,645 s projected (13 %); one cell expanded to a second round. The standing quick cost is **692.1 s** Generator (3,505 of 3,505) and 33.5 s Player
(1,750 of 1,750), the fingerprints of MS07d; four generation-heavy tests are 392.1 s of it and are the proposal for a move to the manual tier (checkpoint note, section 9; nothing moved). Lock waits 4,054 s (longest 561 s), 20 IR12 compounds.
Verified here: both quick sets, the CI check. Not verified: any offer, the six cells, a GP run (MS18d).

## MS08a: Skyscraper (the first S3 technique and the template of the following ones)

**What changed.** `skyscraper` (group `fish`, order 112, base cost 33, weight 330, unscoped, no uniqueness assumption) is registered in `core/js/engine/tech-fish.js` and weighted in `difficulty.js`
(`WEIGHTS.skyscraper = 330`; it sits between `xWing` 320 and `simpleColouring` 360, so the registry order stays nondecreasing and the technique joins the Hard tier and the Expert-and-above floor with no rule change).
The proof, the `{ digit, lines, ends }` arguments, the work counter (R10: one unit is one tested pair of base lines, limit 50,000 per call, the parent budget checked at entry and before the pair that would carry the work over
256 units, a spent limit a lost deduction and never an invented one) and the unregistered seam `SG.fishSearch.skyscraper` are in `generator/design.md` section 6.6 and the developer guides. Base lines are complete,
disjoint units with the digit in exactly two cells and no placement; exactly one shared cover line makes a skyscraper (two is an X-Wing, which `xWing` owns); a target is any open cell of the digit that sees both ends.

**Evidence of soundness.** The fixtures are two real positions that fire it (rows `constructed-hard-1` with three eliminations, columns of seeded puzzle 26 with one) and two negatives (the chain after everything through it is exhausted, and
an X-Wing left to `xWing`), run through the shared soundness-against-completions and immutability checks of `techniques.test.js`. `tech-fish.test.js` adds geometry (transpose, ownership, partial lines, near misses, ends in one box,
non-disjoint sub-grids), the work, budget and cancellation contract and an agreement test with an independent enumeration on classic9 (400 states each of seeds 777 and 99, 103 and 111 firings), classic6, classic4, a 12- and a 16-digit board, diagonalX, hyper and
jigsaw9. Ten in-memory engine mutations (a root as a target, an X-Wing counted, one-end targets, overlapping base lines, the budget checked early, cancellation swallowed, the limit off by one, unsorted ends, an ownerless cover, the
wrong root) are all detected by the suite (10 of 10). The pattern cost on the four fixtures is 3, 21, 74 and 37 of the 50,000 units, nothing capped; the limit was not adjusted.

**Output differences and what caused each.** Skyscraper takes deductions that Simple Colouring, a chain or nothing at Hard had, so the rating of positions that use one changes. The 26 labelled references keep every level and every
`v3Expected` entry (so `rated.js` is unchanged); four ratings change: `constructed-hard-1`, `-2` and `-3` are rated by a skyscraper now (560, 563, 554 become 475, 521, 515: the hardest technique is `skyscraper`, 330, not `simpleColouring`, 360) and
`constructed-nightmare-3` goes from 2,642 to 2,653 (one use). E on the final source: **66 of the 520 regression hashes changed**, all in the cells whose level admits it (`classic6/hard` 2, `classic9/hard` 8, `expert` 8, `master` 10,
`nightmare` 5, `diagonalX/nightmare` 9, `hyper/hard` 7, `jigsaw9/master` 8, `greaterThan/hard` 9); the wires G09, G11 and G12 and the analyses G01, G04, G06, G11, G12 and G14 changed. The example of the Generation Steps guides (G01, Classic 9 expert, seed
3275974478) is another puzzle now: score 925 (it was 969), 72 dig-log entries and a jump 47 to 621 caused by Simple Colouring at R2C4 (first use 26 of 61) instead of 235 caused by R6C1; its exchange and its 28 positions are kept, G04 has 29 positions, 13 compact and
16 details jumps are in the goldens (20 distinct), and the G11 inner peak is 1,964. The pins that follow (replay, steps, player, the seed of the shallow-fallback specimen of the cache, worker and pipeline suites: seed 5 became exact, seed 21 is the new specimen) are in the evidence.

**Help catalogue.** 29 examples: `skyscraper` is new (the source of the saved `simpleColouring` example, Classic 9 Hell 1 seed 214: its replay reaches a skyscraper hint first); `pointing`, `swordfish`, `xyWing` and `simpleColouring` are made again from
their own sources (a different number of hints applied, or a later hint of the same puzzle); `xyzWing` needed a new real source (its old puzzle no longer needs one): Classic 9 Nightmare seed 11, which also holds the `wWing` example. `--check` of all 29 passes.

**Cost.** The standing quick cost is **699.8 s** Generator on the final tree (692.1 s at MS07e; 691.6 s on the run before the comment re-wrap of the engine, the same four groups: 72.5, 171.2, 308.8 and 139.1 s then, 71.6, 170.4, 318.0 and 139.9 s last; the
pipeline group moves by 9 s between two runs of the same behaviour; MS07d and MS07e were 679.4 s and 692.1 s on unchanged generation code, so +1.1 % is no signal) and 35.3 s Player; Generator 3,563 and Player 1,807 tests (tech-fish 106 to 155, techniques 187 to 195, technique-weights 6 to 7).

**Verified here, and what is not.** Both quick sets on the final tree, `generator-suites.sh check` (3,563 and 1,807, exit 0), the focused suites of the task, complete E (the wires, the analyses, the merged hashes and the pattern cost, all re-checked on the
final tree), the complete GH catalogue, the mutations. Not verified: the manual `difficulty` suite (edited for the weight table and the first technique of Hard; the two pure assertions are evaluated by a scratch script, the suite itself is **not run**), any
qualification or soak, and any offer (unchanged; MS18c's). No new S-AV item: S-AV08 is re-measured at 699.8 s and the other inherited items are as MS07e left them.

## MS08b: Two-string kite

**What changed.** `twoStringKite` (group `fish`, order 114, base cost 34, weight 340, unscoped, no uniqueness assumption) is registered in `core/js/engine/tech-fish.js` and weighted in `difficulty.js`
(`WEIGHTS.twoStringKite = 340`; between `skyscraper` 330 and `simpleColouring` 360, so the registry order stays nondecreasing and the technique joins the Hard tier and the Expert-and-above floor with no rule change).
A kite is a row and a column that each hold a digit in exactly two cells (complete, disjoint units, no placement, four distinct cells) with one cell of each in the same box (or Jigsaw region): those two cells cannot both hold the digit,
so one of the other two cells (the ends) does, and the digit leaves every real peer of both ends. The proof, the `{ digit, lines, bridge, ends }` arguments, the work counter (one unit is one tested pair of a
row and a column that both hold the digit twice; 50,000 per call; the parent budget at entry and before the pair that would carry the work over 256 units; a spent limit is a lost deduction, never an invented one) and the seam
`SG.fishSearch.twoStringKite` are in `generator/design.md` section 6.6 and the developer guides. The skyscraper and the kite share the helpers `endEliminations`, `findBounded` and `seamOf`; the skyscraper's result is unchanged (the skyscraper of the base commit and this one agree on every line of 2,336 states, also under the limits 0, 1 and 3: `skyscraper-differential.txt`; 65 firings in
the 300 sweep states, its 155 tests unchanged). **Ruling (b) of the pack author, after a first pass that had decided otherwise:** the box of a bridge is a complete box-like unit, kind `box` or `region` (a Jigsaw region is the box of its board); each bridge cell has exactly one such owner, counted over both kinds, and the two owners match, so the kite fires on Jigsaw boards and costs work there, and
an overlapped box of a multi-grid board bridges nothing (a conservative restriction, not a mathematical need; a diagonal or a window is no box, and whole-line disjointness stays). **Structural maximum** of one call: 729 on a 9×9 board, 216 on 6×6, 64 on 4×4, 1,728 on the 12-digit and 4,096 on the 16-digit board, 6,561 on the Samurai (the largest,
13 % of the limit), 2,916 on the Sohei, 324 on the Flower, 0 on the Butterfly; the Jigsaw board is 729 like a classic one (it was 0 under the first, box-only rule, the only bound that moved).

**Evidence of soundness.** The fixtures are two real positions that fire it (`HARD_B`, digit 5, row R6 and column C8 bridged in box 6, one elimination; a seeded position of seed 99, digit 5, row R9 and column C2 bridged in box 7, one elimination) and
three negatives (nothing left once the techniques through the kite are exhausted, a row pair and a column pair that share a cell (R6C8 holds the 3), and a genuine skyscraper left to `skyscraper`),
run through the shared soundness-against-completions and immutability checks of `techniques.test.js` (the random sweep fires it 114 times in 300 states, three supplemental positions add deterministic states). `tech-fish.test.js` adds 81 tests (155 to 236): the
geometry vector and its transpose, the four bridges, ten near misses each in both orientations, incomplete units, a placed digit, overlapping lines, an overlapped box, the unit order, the enumeration order, the work, budget and
cancellation contract (a 2,048-unit 16-digit board built so that no pair is a kite, the checks at 0, 256, ... 1,792), and an agreement test with an independent enumeration (`referenceKites`) on classic9 (400 states each of seeds 777 and 99, 131 and 129 firings),
classic6, classic4, 12- and 16-digit boards, diagonalX, hyper, the Generator's irregular jigsaw layout (written out in the suite) and its transpose (28 and 31 of 120 states hold a kite, 35 and 38 firings under the soundness check, a largest work of 15 and 20 of 50,000), a vector and its transpose through the region J4, near misses, a box and a region over the same cells, the Samurai (a kite in the middle band of the center grid, nothing through an overlapped box) and the multi-grid boards. Twenty in-memory engine mutations (more than the ten of MS08a: a bridge cell as a target, a shared endpoint,
no common box, an overlapped box, overlapping lines, one-end targets, the budget checked early, cancellation swallowed, the limit off by one, unsorted bridge, row-first lines, incomplete units, the wrong anchor, a placed digit, a third candidate ignored, a
row bridge of only the lower cell, a column bridge of only the lower cell, and three that go back to the box-only rule: a region is no box-like unit, the owners counted per kind, the scan gate looking only for boxes) are all detected (20 of 20 on the final tests). The pattern cost on the five fixtures is 11 and 22 (positives) and 98, 7 and 41 (negatives) of the 50,000 units, nothing capped; the limit was not adjusted.

**Output differences and what caused each.** The 26 labelled references keep every level and every `v3Expected` entry (`rated.js` is unchanged); four ratings change: `escargot` 5,280 to 5,279, `worlds-hardest-2012` 5,605 to 5,592, `constructed-nightmare-2` 2,662 to 2,661 and `-3` 2,653 to 2,652
(a kite step takes a deduction that another step had; the level and the hardest technique are unchanged). E on the final source: **18 of the 520 regression hashes changed** (14 in the first pass, box-only; the four more are `jigsaw9/master` seeds 5, 13, 144 and 233), all in the cells whose level admits it (`classic9/hard` seed 89,
`classic9/expert` seeds 8, 377 and 10,946, `classic9/master` 5 and 377, `classic9/nightmare` 377, `diagonalX/nightmare` 1, 5, 21, 55, 144 and 610, `hyper/hard` 5, `jigsaw9/master` 5, 13, 144 and 233; `classic6/hard`, `killer/hard` and `greaterThan/hard` admit it and stay unchanged, as do the other 16 seeds of `jigsaw9/master`;
the 16 keys below Hard are unchanged); the wires G10 and G11 and the analyses G01, G05, G06, G07, G11 and G14 changed (G06 and G07 are Jigsaw requests: G06 ends at 2,327 instead of 2,329, and G07 digs another puzzle, 2,391 instead of 1,797, with its jump one step later; the five wires are those of the first pass). The example of the Generation Steps guides (G01, Classic 9 expert, seed 3275974478) keeps its puzzle and its score 925 and its first jump is now the Two-String Kite step 47 to 593
(Simple Colouring 621 before) at R2C4, which removes 3@R1C9 only (the colouring step also removed 3@R2C8); G05 ends at 2,461 (2,497), G14 has one detail 2,606 (2,607), G11 (Greater-Than Expert 42) scores 994 (957; one kite step, confidence 0.287 to 0.04) and its first
use moves to step 25 of 61; the Killer Nightmare 42 wire G10 differs only in the counters of its local search (718 to 600 ratings, a stop on the proposals cap instead of the shallow-rating cap), its generation time is unchanged (15.0 s against 14.5 s at MS08a). The pins that follow (replay, steps, player, the G06 score 2,329 to 2,327 and the G07 jump 5 to 6 of the replay suite, and the real specimen of
the pipeline suite, seed 5 to seed 128, the lowest qualifying seed of a recorded scan of the seeds 1 to 128) are in the evidence.

**Help catalogue.** 30 examples: `twoStringKite` is new (Classic 9 Hell 1 seed 214, step 36: digit 6, row R6 and column C2 bridged by R5C2 and R6C3; the source of the `skyscraper` example is another step of that replay); `hiddenTriple` and `xWing` are made again from their own sources (a different number of
hints applied: steps 34 and 56) and `simpleColouring` from another real source of the catalogue (Classic 9 Nightmare seed 648, step 24) because its old puzzle now needs a kite. `--check` of all 30 passes.

**Cost.** The standing quick cost is **303.4 s** Generator on the final tree (the four group walls 73.2, 173.0, 32.4 and 24.8 s; 296.7 s at MS07f, +2.3 % for +2.6 % tests) and 38.1 s Player (35.0 s), for 3,651 and 1,897 tests (+91 and +90: tech-fish 155 to 236, techniques 195 to 204, technique-weights 7 to 8); the seconds are within the spread
of the same behaviour between two runs. S-AV08 is re-measured with those numbers. A first quick run of the fix round failed three tests in the Player and took 385.6 s there: its own `jigsaw9` has another layout than the Generator's, so the written positions found no kite and the transposed layout needed 258 s to generate states for; the tests now write the Generator's layout out (and its transpose) and check the environment's own `jigsaw9` for agreement only, and tech-fish runs in 8.9 s in both apps (the run is kept as `quick-run-1`).

**Verified here, and what is not.** Both quick sets on the final tree, `generator-suites.sh check` (3,651 and 1,897, exit 0), the focused suites of the task, complete E (the wires, the analyses, the merged hashes and the pattern cost, all re-checked on the
final tree), the complete GH catalogue, the mutations. Not verified: the manual `difficulty` suite (edited for the weight table and the first technique of Hard; the two pure assertions are evaluated by a scratch script, the suite itself is **not run**), any
qualification or soak, and any offer (unchanged; MS18c's). No new S-AV item; the inherited S-AV01 to S-AV30 are as MS08a left them.
