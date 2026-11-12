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
