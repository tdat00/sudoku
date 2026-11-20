# MS18d Phase B — bounded deep-registration audit (63 suites)

Scope (SA2 `3ee989db`, one file-only pass): the 37 suites of `generator\tests\suites`, the 8 of
`generator\tests\manual` and the 18 of `core\tests\suites`. No Node was run for the search (the grep tool only);
the registration proof is the `--list-tests` pair in this folder (`comparison.json`).

The defect class: a per-level test that is registered for a level the board does not publish and that asserts
a hit rate or a p95 time against it, so that a hidden level can only fail it. It was found in the `SG_DEEP=1`
branch of `mega.test.js` and `multigrid.test.js` and repaired there (a branch-local `PUBLISHED[id]` guard).

## Method

1. Mode switches: `SG_DEEP`, `DEEP`, `process.env`, `SG.test.deep`, `isDeep`, `deep` over the 63 files.
2. Per-level registrations: `it(... + level ...)` forms, and every `.forEach` over a level list in the eight
   manual suites (their `BUDGET_MS`, `PUBLISHED`, `OFFERED`, `difficultySupport` uses).
3. `difficultySupport` itself: `difficulty.test.js` ("offers in every variant exactly the levels the qualification
   published") compares it with `docs/difficulty-rating/qualification.md`, so a loop over
   `def.difficultySupport` or an `OFFERED` constant is a loop over the published levels only.

## Mode switches found (the whole list)

| File | Switch | Effect | Verdict |
|---|---|---|---|
| `suites\mega.test.js` | `SG_DEEP=1` | volume 4 → 20 samples; a deep describe, one `it` per id × `LEVELS` | **repaired** (3 removed) |
| `suites\multigrid.test.js` | `SG_DEEP=1` | volume 2 → 20 samples; a deep describe, one `it` per id × board levels | **repaired** (4 removed) |
| `manual\variants.test.js` | `SG_DEEP=1` | volume only (50 seeds, 20 puzzles); one extra hit-rate ≥ 0.5 check | negative |
| `manual\perf.test.js` | `SG_UPDATE_HASHES=1` | the canonical-update flag, never set in MS18d | not a mode of this class |

`manual\variants.test.js` registers CV3 once per `def.difficultySupport` level (`checkSupportedLevel`), so the
extra hit-rate check applies only to published levels; the other levels are refused up front
(`checkUnsupportedLevels`). Negative.

## Other textual hits (classified, none a switch)

- `suites\help.test.js` 644–646: asserts that the guides mention `SG_DEEP`. Text only.
- `suites\mega-contract.test.js`: "mega deep tier" is the Nightmare/Hell 1 population module (synthetic records,
  never a deep request). Naming only.
- `suites\difficulty-diagnostics.test.js` 739–741: a constant named `DEEP` for a counts object (Nishio depth).
- `core\tests\suites\tech-chain`, `tech-wing`, `bits`, `harness`; `manual\difficulty.test.js`: the word "deep" in
  technique, test-name or path text (Nishio depth, witness depth, `evidence/deep/`). No switch.

## Per-level registrations over a level list

- `suites\mega.test.js`: the quick `QUICK_LEVELS` (veryEasy, easy, normal, hard) are published on mega12 and
  mega16; the deep tier was the defect (fixed). The Hell 1 and Nightmare requests of the module are fixed
  diagnostic requests behind `withRequestedLevel`, not registrations.
- `suites\multigrid.test.js`: the quick per-level tests of every board (`spec.levels`, including Easy on samurai,
  sohei, butterfly and flower) run through `asRequested` = `withRequestedLevel`, assert the invariants and the
  `difficulty.approximate` warning for a miss, and assert **no hit rate**; the time check is the SAMPLES = 2
  quick budget. This is the accepted MS18c shape (the quick inventory is a stated invariant of this task) and is
  not edited; recorded as an observation only. Only the deep body asserted a hit rate with a plain
  `SG.pipeline.run`, which a hidden level refuses.
- Manual `killer`, `jigsaw`, `extra-regions`, `wordoku`, `greater-than`: per-level timing (CV6) loops run over
  `OFFERED` / `offeredOf(id)` = `difficultySupport` (published only). Loops over the corpus (`LEVELS.forEach`
  with `puzzleRun()[level]`, `['hard','master','nightmare']` of `jigsaw`, `['normal','hard','master']` of
  `greater-than`) read the fixed diagnostic corpus, which keeps its hidden levels on purpose (`killer.test.js`
  25–31); they are aggregate data checks, not registrations with a hit rate or a p95 of a hidden level.
- Manual `difficulty.test.js`: classic9 loops run over `difficultySupport` (`OFFERED`); the fixed-level lists of
  `digger.generate` guarantees (`normal`, `hard`, `nightmare`, `hell1`) are single requests on classic9 with no
  hit-rate or p95 claim.
- Manual `variants.test.js`: see above. Manual `perf.test.js`: the 19 `PERF_CELLS` are the declared public smoke
  selection (its header comment), measured warn-only.
- The other 32 quick generator suites and the 18 shared suites have no mode switch and no registration over a
  level list that asserts a hit rate or a p95.

## Result

Exactly two positive findings (the two named in the assignment), both repaired with the same branch-local guard.
No other positive and no ambiguous finding that needs an edit. One observation (the multigrid quick per-level
tests of hidden Easy, accepted in MS18c, no hit rate) is reported and left untouched.
