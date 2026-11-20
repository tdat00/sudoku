# MS05r2 evidence: consumers of required exactness

Step evidence of the S-OD2 recovery (CV6-02 (a)); no acceptance and no commit. Authority: S-OD2, absorbed MS05b2,
R2-R5/R23, FS04/FS06. Working tree: MS05b1 requiredness activation plus MS05r1 tooling, `HEAD` `f788e02`, dirty.
Node v26.13.0, Windows. Every sudoku node run that generates puzzles went through `Invoke-Dv3Node` (the verbatim helper,
dot-sourced from a scratch file that was deleted afterwards). Neither timing lock was held by anyone at any call: no wait
longer than 0.2 s (total wall minus the helper's own seconds). I never held two runs at once and left at least 15 s between
consecutive heavier runs.

## Source identity

| Item | Value |
|---|---|
| Engine source hash | `70036fafe7e2e9ad3d5d5a80e8930d2e251fbfa79a5a17610d5b99a1dc9591f7` (SHA-256 over the 63 `SOURCE_FILES`, `<path>\0<text with LF>`, the construction of `soak.js`): **identical to MS05r1's**, so no engine, solver, fixture, locale or generation source changed in this task |
| `tests/soak.js` | LF-normalised SHA-256, first 16: `679641fd3fd0fdf8` |
| `tests/qualify.js` | `215f1eee73528e9f` |
| `tests/fixtures/difficulty-diagnostics.js` | `7c1fd736052ed802` |
| `tests/suites/difficulty-diagnostics.test.js` | `aed42119de52cbdb` |

## Commands

| Command (from `generator/`) | Exit | Result | Wall | Lock wait |
|---|---:|---|---:|---:|
| `node --check` on the seven manual files and on `soak.js`, `qualify.js`, the diagnostics fixture and suite | 0 each | syntax valid (run twice, before and after the last edits) | under 1 s each | none (nothing generated) |
| `Invoke-Dv3Node ... --suite=difficulty-diagnostics,difficulty-floor,help` (final) | 0 | 131 of 131: `difficulty-diagnostics` 53 (9.99 s), `difficulty-floor` 48 (24.57 s), `help` 30 (3.71 s) | 38.5 s | 0 |
| `Invoke-Dv3Node ... --suite=difficulty --filter=qualification:` (final) | 0 | 6 of 6, the existing fake-worker contract, no real qualification | 3.6 s | 0 |
| The same two selectors, earlier run (before the last comment edits) | 0 | 131 of 131; 6 of 6 | 38.4 s; 3.6 s | 0 |
| `--suite=difficulty-diagnostics` (development, twice) | 1, then 0 | the first run failed one of my new tests (my assertion matched the usage text); fixed in the test, then 53 of 53 | 10.1 s each | 0 |
| Real CLI, one argv item: `--weights={"nishio":1} --variant=classic9 --level=normal --count=1 --no-gate` | 2 | prints `variant classic4, level veryEasy, floor with tier`, `expected: nakedSingle, hiddenSingleBox, hiddenSingleLine, nishio`, `actual:   nakedSingle, hiddenSingleBox, hiddenSingleLine, pointing`; nothing generated | 0.78 s | 0 |
| Real CLI, `--weights={"nishio":` (malformed JSON) | 2 | `Unexpected end of JSON input` and the usage text, no prefix report | 0.09 s | 0 |
| Three mutation checks (below) | 1 each | the new tests failed against the old code; the code was restored | 0.2 to 9.5 s | 0 |

No full quick set, GG/GR/GH, soak measurement, qualification, perf, manual corpus or `--all`/`--manual` run, and no
`SG_UPDATE_HASHES`. The outstanding gates (G13/mega/pin/quick failures, I5/CV3 cells, classic9 GD) are not marked green.

## The predicates

**Soak.** `generateOne` returns `exact: p.exact === true` on the direct route (it already read the flag, now strictly)
and `exact: r.exact === true` on the pipeline route. The pipeline route read `r.rating.level === combo.level`
(`soak.js:281`), so a shallow result in the requested level counted as a hit for Killer, Jigsaw, Greater-Than, Wordoku
and the other pipeline variants. Every consumer of the row reads that field (the `exact:` totals, the per-level hit
rates and the 80 % / 90 % gate, the ledger's `generationExact`). I5 now also checks `requiredOf` of every exact puzzle,
on the independently re-rated puzzle and its own model. Tags, seeds, routing and the number of engine calls are
unchanged (the existing test "keeps the old text, the puzzles and the engine calls of a run without --json" still passes).

**Qualifier.** The worker sets `out.exact = result.exact === true` after the existing independent checks and then
`out.hit = hitOf(out, task.level)` with the exported

```js
function hitOf(out, requested) {
  return out.valid === true && out.solved === true && out.approximate === false &&
    out.exact === true && out.achieved === requested;
}
```

Tests (in `difficulty-diagnostics.test.js`, Node only, `tests/qualify.js` loaded in a vm of its own): the true baseline;
each of `valid`, `solved`, `approximate` and `exact` made false or absent, an `exact` that is not `true`, and a wrong
achieved level each miss; and the worker run end to end with a fake pipeline: an exact result is a hit, while a shallow
one (same level name, `exact: false`, both warnings), one with the flag false and no warning, one with the flag absent
or `'true'`, a count of 2 solutions, givens that contradict the solution, an unsolved rating and a wrong level are misses.

**Soak routes.** Two soak runs on very easy (every puzzle there is in its level, 5 requests each, `exact` forced to
`false` or deleted at the engine call): classic9 (direct) and killer (pipeline) both report `exact: 0 of 5`, against a
control run of the same cell with hits. Under the old pipeline comparison the killer run reported `5 of 5`.

## The ordered prefix

`SG.fixtures.difficultyDiagnostics.prefixViolationOf({ difficulty, techniques, variantIds })` returns `null` or
`{ variantId, level, kind: 'floor' | 'allowed', expected, actual }`. For every registered variant (15, then the no-model
case) and every level it builds the ladder (`SG.techniques.list()` filtered by `D.WEIGHTS` and `appliesTo`, registry
order, never sorted by weight), `floor = D.floorTechniques(level, { variantId })` and
`allowed = floor.concat(D.tierTechniques(level, { variantId }))`, and compares `ladder.slice(0, floor.length)` with the
floor and `ladder.slice(0, allowed.length)` with `allowed` as ordered arrays, floor first.

| Check | Result |
|---|---|
| Default tables, 15 variants, 9 levels, no model | `null` |
| An ordered band override (`0,60,200,420,720,1050,1600,2500,3700`, in force while checked: `bandOf('veryEasy').max` is 60) | `null`; restored in `finally`, the table equals the saved one |
| `nishio` weight 1 | `{ variantId: 'classic4', level: 'veryEasy', kind: 'allowed', expected: [nakedSingle, hiddenSingleBox, hiddenSingleLine, nishio], actual: [..., pointing] }`; the weight is restored |
| A fake two-technique registry | `kind: 'floor'` (a floor out of ladder order), `kind: 'allowed'`, the no-model case reported with `variantId: null`, an out-of-order list rejected, the ordered one accepted |
| Soak with `--weights={"nishio":1}` (with `--json` and `--no-gate`) in the suite's own vm | code 2, the message above without the usage text, **no engine call logged, no `SG.rng.create` call, no output, no ledger written** |
| Soak with malformed JSON | code 2, the usage text, no `nothing was generated` |

The check runs after `--weights` and `--bands` are applied and before the combinations, so before any model build or RNG
request. A band override cannot break the prefix while the weights keep the registry order, as they do (a reversed band
table was probed and still leaves every allowed set a prefix); the real violating vector is a weight. The `floor` kind
cannot be the first violation on the real registry (a broken floor of level i shows first as a broken allowed set of
level i-1), so it is tested on a fake registry; the check is kept as the task specified.

## Mutation checks (the new tests are not vacuous)

Each change was applied, the named tests were run, and the code was restored (a grep confirmed the final text).

| Mutation | New tests that failed |
|---|---|
| `soak.js` pipeline route back to `r.rating.level === combo.level` | the killer route test (`exact: 5 of 5` instead of 0 of 5) |
| `hitOf` without `out.exact === true` | both qualifier tests (`{ exact: false }` is a hit; the shallow result is a hit) |
| the prefix check disabled (`if (false && prefix !== null)`) | the rejection test (`expected 0 to be 2`: the soak ran) |

## The seven manual contract sites (hand-off to MS05b3, MS05r4 and MS05r6b)

Test names are unchanged, so every filter of the pack still matches. Counts, thresholds, budgets and seeds are unchanged.
All were checked for syntax only here; none was run (they generate puzzles).

| File: suite > test | Contract change | Unchanged |
|---|---|---|
| `difficulty.test.js`: `digger.generate: classic9 puzzles per level (hit rate, invariants I1-I7, time)` > `<level>` > `hits the requested level in at least 90 % of the puzzles` | hits are `p.exact === true` (were `p.achieved === level`) | 0.9 x 100 (20 for hell1, hell2), seeds 7000+i |
| same > `I5: every puzzle has a complete proof; an exact one has its score in the band` | exact implies `achieved === level`, no `difficulty.approximate`, the score in the band on a fresh `D.rate`, and `D.requiredOf(rating, level, model9).required === true`; a miss has `difficulty.approximate`, and `difficulty.shallow` iff `achieved === level`. Replaces `exact === (achieved === level)` | the score and band assertions |
| `difficulty.test.js`: `digger.generate: guarantees` > `digLevel makes one attempt from a given solution and says whether it hit the level` | `exact` is a boolean; exact implies easy and required, an in-level non-exact result is not required. Replaces `exact === (achieved === 'easy')` | every other assertion of the test |
| `difficulty.test.js`: `digger.generate: guarantees` > `works on the smaller boards for the levels they support` | text untouched: it already counted `p.exact`, which now has the new meaning | 18 of 20 |
| `killer.test.js`: `killer: generated puzzles (20 per level, 8 from expert on), CV3 - CV6 and invariants I1 - I7` > `I5: every puzzle has a complete proof; one rated as requested has its score in the band` | hits and the band test use `p.result.exact === true`, plus level, `requiredOf` on `p.result.model` and the warnings | `hits > 0.8 x countOf(level)` |
| `variants.test.js`: `checkLevels` (the CV3 sweep, line 202) and `checkInvariants` (I5, line 260) | `hit = r.exact === true`; the approximate warning iff a miss, `difficulty.shallow` iff a miss in the level; I5 for `r.exact === true`: level, band, hardest group, `requiredOf` | `exact === 0` throws, `DEEP` 0.5, `perLevel` |
| `jigsaw.test.js`: `jigsaw9: puzzles at every level (CV3, CV4: invariants I1-I7)` > `<level>: <count> puzzles` > `I5: every puzzle has a complete proof, and one that reached the level has its score in the band; I6: at least minClues givens` | `p.exact === true`: level, band, `requiredOf` of the re-rated puzzle, `warnings` `[]`; a miss has the approximate warning (and shallow iff in the level) | 0.9 hit rate, `countOf(level)` |
| `greater-than.test.js`: `greaterThan: puzzles at every level (CV3, CV4: invariants I1-I7)` > `<level>: <count> puzzles` > the same I5 test, and `the futoshiki option works at every level: signs may link boxes, and all the invariants hold` | as Jigsaw; the futoshiki count is `p.exact === true` | 0.9 and 0.85 |
| `extra-regions.test.js`: `extraRegions: puzzles at every level (CV3, CV4, CV6)` > `<id> <level>: <n> puzzles` > the I5 test, and `<id>: most puzzles reach the level that was asked for (the rest carry the approximate warning)` | exact: level, band, `requiredOf`; a miss has approximate (and shallow iff in the level); the count is `p.exact === true` | `> 0.85`, `PER_LEVEL` |
| `wordoku.test.js`: `wordoku: puzzles at every level (CV3, CV4: invariants I1-I7)` > `<level>: 20 puzzles` > the same I5 test | as Jigsaw | 0.9 of `PUZZLES_PER_LEVEL` (20) |

Not changed, deliberately: the membership preconditions `rating.level === level` of the Killer "hardest technique
belongs to the groups" test, the Greater-Than "reaches the solution with the techniques of its level" test and the
extra-regions "logical solver reaches the solution of every puzzle that hit its level" test. They ask about puzzles in
the band (shallow ones included), which stays true.

## Spec gaps and discrepancies

1. The pipeline site `soak.js:281` was `r.rating.level === combo.level`, as the task suspected; it is fixed here.
2. The prefix helper takes an `env` (`difficulty`, `techniques`, `variantIds`) so that a test can use a fake registry; the
   soak passes the registry of its own vm. The task left the signature open.
3. The `floor` kind is unreachable as a first violation on the real registry (see above); it is kept and tested on a
   fake registry.
4. `soak.js`'s usage text now mentions the prefix rejection, so "no usage text" is asserted through the
   `nothing was generated` marker of the rejection message, not through the words "ordered prefix".
5. The ledger field `generationExact` already read `puzzle.exact === true`; only its comments and the design text changed.
   The text label `old hits` of the diagnostics summary and the baseline report keep their historical wording.

## Handoff

MS05r3: no consumer work is left; `soak.js` and the diagnostics helper stay yours to extend, and the flags it reads
(`p.exact` on the direct route, `r.exact` on the pipeline route) are the ones the new work counters must agree with.
MS05r4: the soak's hit and every manual hit counter now count only the required exact flag, so R5, the qualifier and
the manual contracts agree. MS05b3: the seven sites above keep their test names, `> `-prefixed filters and counts.
MS05r6b: the sites were syntax-checked only; every changed assertion is first exercised by b3's per-level runs and
by r6b's classic9 group.
