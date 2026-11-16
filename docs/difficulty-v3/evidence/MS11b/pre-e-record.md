# MS11b pre-E record (preliminary, before the ruling and before E)

Developer agent claude-sonnet-5.5 (role `dev`), branch `rating-v3`, base commit `ef95fc5` (MS11a accepted), tree clean at
the start, nothing staged or committed. Start 2026-11-16 14:31 (+07:00); this record 15:25. Machine: Windows x64, Node
v26.13.0, time factor 2. Every command over about 10 s ran through `Invoke-Dv3Node` (verbatim helper `invoke-dv3node.ps1`,
byte-equal to the check-list block, SHA-256 `FC7298D3...951D`), one command per lock, at least 15 s apart, logged in
`lock-log.jsonl`. **The engine bytes are not frozen**: everything below is on the pre-ruling source and is repeated on the
final source after the ruling (`mutations-1.txt` to `mutations-17.txt`, `rated-effect-pre.txt` and the `logs/` below are
preliminary history, not final-source validation).

## What is implemented (core/js/engine/tech-wing.js)

- `uniqueRectangle` keeps ID, order 180, base cost 66, weight 900, `assumesUniqueness: true`. Pass 1 (types 1 and 2) and
  pass 2 (types 3 and 4, uncapped Type 3 search under 50,000) are unchanged; the dispatcher is now
  `boundedPass(limit, scan)` run twice, then **a third bounded pass, the hidden form, only when pass 1 and pass 2 found
  nothing and pass 2 did not end with a spent budget** (a pass 2 that spent its work limit does not stop it).
- Hidden form: four open corners whose masks have exactly the pair {X, Y} in common and are not all the bare pair; a floor
  corner F that holds exactly {X, Y}; the target O opposite to F; the row unit of O and its row neighbour and the column
  unit of O and its column neighbour (kind row / col only, both complete) each hold X in exactly two cells; Y leaves O.
  Targets in rectangle order, the lower digit of the pair first; one unit = one tested (target, digit), 50,000 per call
  (`SG.wingSearch.UNIQUE_RECTANGLE_HIDDEN_WORK_LIMIT`), own counter, entry check and at most 256 units between checks,
  own `onPatternWork` record after the second pass's. Finding `technique.uniqueRectangle.hidden.step`, args
  `{ digit: X, digits: [X, Y] ascending, cells: four corner labels in rectangle order }`.
- The seam `SG.wingSearch.uniqueRectangle(model, state, ctx, { workLimit, hiddenWorkLimit })`.

## Files changed so far

`core/js/engine/tech-wing.js`, `core/tests/suites/tech-wing.test.js` (389 to 435 tests), `core/tests/fixtures/techniques.js`
(one real positive, two supplements), the four locale files (`technique.uniqueRectangle.hidden.step`), both
`i18n.test.js` (the expected subtype keys), the scratch folders of this task. Designs, guides, `notes.md`, the help
example, the quick manifest and the E fixtures are **not yet** edited (after the ruling).

## Measurements on the pre-ruling source

| Item | Result |
|---|---|
| Generator focused gate (`logs/gate-generator-1.txt`) | `tech-wing,techniques,technique-weights,difficulty-floor,tech-chain,i18n` 936 of 936, 50.6 s |
| Player focused gate (`logs/gate-player-1.txt`) | 1,003 of 1,004; the one failure is the `help` replay of `emptyRectangle` (the hint at its step is now `forcingChainLong`); GH not yet run |
| Mutants of the hidden pass (`mutations-1.txt`, `-2.txt`, `-17.txt`) | 55 in `mutations.cjs`: 54 detected, 1 equivalent by argument (`holders <= 2` after both corners hold the digit); #17 (the open test) survived the first run and was detected after one test was added |
| Old mutants (MS11a list, 97) | fragments adapted by name to the new dispatcher (`mutations-ms11a.cjs`, 97 of 97 match); not yet re-run |
| Reach, seed 4242, 30,000 dug puzzles (`logs/explore-dug-4242-30000-final.txt`) | 5,118 positions stay open below the rectangle; first Findings: type 1 452, type 2 95, **type 3 158, type 4 322, hidden 992 (19.4 %)**; no capped call, every elimination sound against the unique solution; of the 992 hidden Findings 864 have one corner that holds exactly the pair and 128 have two (the floor and the target itself) |
| R20, 26 references (`rated-effect-pre.txt`) | 3 scores change (escargot 5,143 to 5,506, platinum-blonde 5,675 to 5,688, constructed-nightmare-3 2,565 to 2,586); **0 levels, 0 requiredness, 0 `v3Expected` entries** |
| Structural bound (`structural-max.txt`) | at most 8 tested pairs per rectangle: 36,864 on the 16-digit board, 13,392 on Samurai, 3,888 on classic9, below 50,000 on every registered and test board |
| Random-walk firings of the hidden form (`logs/ur-firings.txt`) | classic9 33, 26 and 29, classic6 19, classic4 7, 12 digits 15 (minima in the suite: 25, 20, 22, 14, 5, 10) |
