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
