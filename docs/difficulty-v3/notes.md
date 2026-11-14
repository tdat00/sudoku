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
