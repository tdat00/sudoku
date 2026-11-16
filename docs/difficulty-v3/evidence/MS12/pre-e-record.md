# MS12 pre-E record (before the QUESTION stop)

Developer agent claude-sonnet-5.5 (role `dev`), branch `rating-v3`, base commit `5d49130` (tree clean at the start). Start
2026-11-16 19:25 (+07:00); this record is written at about 20:35. Nothing is staged or committed. No fingerprinted byte is
frozen and no E, `--update-hashes`, GH write or quick set has run yet.

## What exists

- `core/js/engine/tech-chain.js`: the explicit edge filters of the shared builder (`EDGE_FILTERS`: `general` unchanged,
  `restricted`: no unit strong link, no same-cell weak link, only the `endpoints` proof with the same digit in two distinct cells,
  no polarity proof), the seam option `edges: 'general' | 'restricted'` (anything else is `solver.invalidOption`), the finder
  `findXyChain` (window 1..12 edges narrowed by `maxChainLength`, 50,000 edge expansions, the entry/256 cadence of the seam) and
  the registration `xyChain` (chain, order 186, base cost 82, unscoped, no uniqueness). Finding `technique.xyChain.step`,
  `i18nArgs { digit, kind: 'endpoints', length, chains }`, `cells` ascending, eliminations ascending.
- Weight 1000 (`generator/js/engine/difficulty.js`), EN and VI name, description and step in both apps, the fixtures
  (`REGISTRY_ORDER`, `BELOW_CHAINS`, `BELOW_XY`/`THROUGH_XY`, two real positives, two negatives, three supplements), the
  registry and weight tests, the manual `difficulty` pins (weights and the Master firsts), the two i18n tests and the new tests
  of the chain suite (107 -> 175).
- Evidence and scratch under `docs/difficulty-v3/evidence/MS12/` and `generator/tests/artifacts/difficulty-v3/MS12/`,
  `player/tests/artifacts/difficulty-v3/MS12/`.

## Numbers so far (all on the working tree, not frozen)

| Item | Value |
|---|---|
| Focused Generator gate (`tech-chain,techniques,technique-weights,difficulty-floor,i18n,digger-target,tech-wing,pattern-cost-tools`) | 1,194 of 1,194 (59.6 s) |
| Chain suite | 107 -> 175 tests (11.9 s); `techniques` 259 -> 267; `technique-weights` 14 -> 15 |
| Mutants (43, in memory) | first compound 38 detected, 5 not; four killed by new tests (work enumeration, arbitrary positions, a solved target cell); **42 detected + 1 equivalent** (lower-end rule, by the symmetry argument) |
| Legacy compatibility | the general seam and the registered `forcingChain` / `forcingChainLong` / `nishio` give the same results and records on 3,682 calls (1,305 Findings) with the tree and with `5d49130`: equal SHA-256 (`legacy-diff-*.txt`) |
| Reach (seed 4242) | 30,000 dug puzzles: 1,413 positions with an xyChain (7 edges 77, 9 edges 952, 11 edges 384), most work 4,861, none capped; 20,000 complete solves: 1,646 (8.23 %) use one, 2,931 steps, 653 have it as the hardest technique |
| R20 | 3 of 26 references change score (escargot 5,506 -> 5,499, constructed-nightmare-1 2,739 -> 2,572, constructed-nightmare-3 2,586 -> 2,653); no level, requiredness, hardest technique or `v3Expected` changes |
| Work | crude bound 4 n^2 (P + 1) is above 50,000 on every board but 4 x 4; constructed positions at most 20,481 units (16 digits, every cell one pair), twins of a grid at most 13,750 (Sohei); no cap hit in any sampled call so far |
| Pin preview (`pipeline,cache,worker,steps,replay,mega,player,digger-target`) | 850 of 864; falls: `replay` 13 (G03, G04, G14) and `steps` 1; `digger-target` holds (75) |
| GH check of the 36 saved examples first | 33 match; `forcingChain` differs (22 fields), `nakedTriple` and `jellyfish` no longer found on their own sources |

## Process notes

Every file change used the edit and create tools. The edit tool replaced "the closest lines" when `old_str` did not match
exactly (CRLF files) and reported it; each such edit was re-read. Twice an anchor line was lost from a replaced block (the
`describe` header of the nightmare group) and restored at once. One edit with trailing whitespace in `old_str` corrupted a
superseded exploratory output (`mutations-0.txt`); the three exploratory outputs were deleted (their outcomes stay in
`logs/mutations-run-0/1/2.txt`).
