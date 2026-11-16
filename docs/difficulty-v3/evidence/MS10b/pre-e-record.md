# MS10b pre-E record (WXYZ-Wing)

Developer agent claude-sonnet-5.5, branch `rating-v3`, base commit `c928472` (MS10a accepted), working tree not staged or committed.
Start 2026-11-16T08:13:25+07:00. This file records the state at the stop before E (QUESTION to SA2); the final `evidence.md` replaces it.

**Lock.** Every command that could take over about 10 s ran through `Invoke-Dv3Node` (`invoke-dv3node.ps1`, byte-equal to the check-list block,
SHA-256 `FC7298D3...951D`), one command per lock, through `run-locked.ps1` (15 s fairness gap, `lock-log.jsonl`). Short commands of a measured
duration under 10 s ran without the lock: the vector smoke (0.8 s), `rated-effect.js` (1.0 s), the manual-difficulty pure check, the plan writers, the
format and mutation-fragment checks, the source-file writers of the Player scratch, and two GH `--check` replays of a pristine `git archive` of HEAD
(0.6 s each, scratch folder `.scratch-head/`, deleted).

## What exists

- Engine: `wxyzWing` in `core/js/engine/tech-wing.js` (group `wing`, order 155, base cost 57, weight 800 in `generator/js/engine/difficulty.js`, unscoped,
  `assumesUniqueness: false`; Master tier because 1.25 x 800 = 1000 is not below Expert's maximum 1000). Four distinct open cells of one to four
  candidates, the union exactly four digits, exactly one non-restricted digit z (a digit is restricted when every pair of its occurrences in the four cells sees
  each other, `model.peers`), a target is an open cell with z that sees every quartet cell holding z. Quartets in ascending cell order; the first quartet with a target
  is returned with all its targets. Finding: `cells` (four, ascending), eliminations (cell ascending, z), `i18nArgs { digits (four, ascending), digit (z), cells (labels) }`.
  Work: one unit is one open cell of at most four candidates tested as the next member of a partial quartet; limit 50,000 per call
  (`SG.wingSearch.WXYZ_WORK_LIMIT`), seam `SG.wingSearch.wxyzWing`, local counter, entry check and at most 256 units between parent-budget checks,
  `capHit: 'work'`, per-call observer `{ id: 'wxyzWing', work, limit, capHit, retained: null }`.
- Tests: `core/tests/suites/tech-wing.test.js` 249 to 319 tests (independent digit-set-first enumeration `wxyzOf`, exhaustive capacity check `fillings`, independent
  unit recount `wxyzUnits`); fixtures `CURRENT.wxyzWing` (two real positives at the position where the registry reaches it, two negatives), `SUPPLEMENTS.wxyzWing` (three),
  `REGISTRY_ORDER` 30, `BELOW_CHAINS`, `BELOW_WXYZ`, `THROUGH_WXYZ`; `techniques.test.js` 247; `technique-weights.test.js` 13 (placement test); manual `difficulty` pins.
- Locales EN and VI in both apps (name, description, step with `{digits}`, `{digit}`, `{cells}`), help example from a real normal-hint source, Player pins 35.

## Gates so far

- Generator `tech-wing,techniques,technique-weights,difficulty-floor`: 627 of 627 (`logs/gate-2-generator.txt`); Player `help,play,i18n` 161 of 161 (`logs/gate-player-1.txt`);
  Player shared `tech-wing,techniques,logical-solver` 666 of 666.
- Mutations: 56 of 56 detected (`mutations-1.txt`, `mutations-2.txt`).
- Reachability (seed 4242): 3,522 of 30,000 dug positions after the 23 techniques below it hold a WXYZ-Wing (11.74 %), 3,323 of 20,000 complete solves use it (16.615 %),
  hardest technique in 1,057 solves (`logs/explore-dug-4242-30000.txt`, `logs/explore-solves-4242-20000.txt`).
- R20 (`rated-effect`): 4 of 26 references change score (golden-nugget 5,689 to 5,681; constructed-nightmare-1 2,743 to 2,739; -2 2,633 to 2,661; -3 2,652 to 2,565), no level
  and no `v3Expected` entry changes.
- Pins preview before E (`logs/pins-preview.txt`): replay 35, steps 4 and player 2 tests fail until the goldens are recorded (cache, pipeline, worker pass).
- GH: wxyzWing from the existing wing/chain sources (6 of 8 replay to it; the example is Nightmare 13, step 37); of the 34 old examples 12 differed, 7 refreshed from
  their own source, 5 moved to another real source of the catalogue; `--check` of all 35: up to date (`logs/gh-check-all-2.txt`).
