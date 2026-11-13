# Shallow-search allowance: the R5 selection (MS05r4)

This is step evidence of the S-OD2 recovery, not an acceptance and not a performance gate. It measures the four
settings of the allowance of [generator/design.md](../../generator/design.md) 6.8 on the preserved, uncommitted
requiredness-active tree with the rule of the owner (R5, unchanged), selects the default, and reports the three
closure requests (G13, mega12 Nightmare, mega16 Nightmare) at all four settings as diagnostics that select nothing. The
evidence (every ledger, record, transcript, hash and command) is in [evidence/MS05r4/](evidence/MS05r4/evidence.md).

**Result: 256.** The smallest finite setting that loses no exact hit in any of the six cells against no extra cap and
lowers the median of full ratings in at least one cell is 256 (the median of classic9 Nightmare, 1,417 to 1,345). It
is now the default of `SG.digger.SHALLOW_SEARCH_RATINGS` (the literal `SHALLOW_SEARCH_DEFAULT` of
`generator/js/engine/digger.js`, the only production edit). The result is modest, and what it does and does not do is
below: it shortens the local search of the cells that reach it, it keeps every exact hit that no extra cap had, and it
does **not** bring the mega Nightmare quick tests inside their original limits (see "Original limits").

## The rule and what was measured

> Choose the smallest finite cap with no exact-hit loss in any cell against no extra cap and a strict reduction in
> median full ratings in at least one cell. Otherwise choose no extra cap.

Six cells, 12 requests each, seed base 20260101 (derived tags `variant:level:index`, the direct or the pipeline route of
`tests/soak.js`, not literal puzzle seeds), at 64, 128, 256 and none (`Infinity`): 24 cells, 288 requests. A hit is
`row.generationExact === true`, the generator's own flag, with every error a miss (there was none: all 288 requests
returned a puzzle); the median is the upper median (sorted index 6 of the 12) of `row.fullRatings`, computed from the
merged raw rows. One frozen source (engine hash `19afa6ee…`, tool hash `da295e75…`, Node v26.13.0), the default of the
source still `Infinity` and each setting applied by `--shallow-cap`. `selection.json` (computed by
`generator/tests/artifacts/difficulty-v3/MS05r4/select-cap.cjs`, tested on fake rows) holds the 24 counts and medians,
the comparisons, the 28 ledgers with their hashes and the identities.

| Cell | none: hits / median | 256 | 128 | 64 |
|---|---|---|---|---|
| classic9 Normal | 10 / 75 | 10 / 75 | 10 / 75 | 10 / 75 |
| classic9 Master | 12 / 4 | 12 / 4 | 12 / 4 | 12 / 4 |
| classic9 Nightmare | 2 / 1,417 | 2 / **1,345** | **1** / 1,000 | **0** / 616 |
| Killer Hard | 0 / 512 | 0 / 512 | 0 / 512 | 0 / 497 |
| Killer Expert | 0 / 2,250 | 0 / 2,250 | 0 / 2,250 | 0 / 2,238 |
| Jigsaw 9 Expert | 11 / 318 | 11 / 318 | 11 / 260 | 11 / 170 |

Hits are of 12 requests; the median is of the full ratings of one request (all attempts). Bold: a hit lost against none
(64 and 128) and the one strict reduction of 256.

| Setting | Hit loss against none | Strict median reduction | Eligible |
|---|---|---|---|
| 64 | classic9 Nightmare (0 against 2) | classic9 Nightmare, Killer Hard, Killer Expert, Jigsaw 9 Expert | no |
| 128 | classic9 Nightmare (1 against 2) | classic9 Nightmare, Jigsaw 9 Expert | no |
| 256 | none | classic9 Nightmare | **yes, the smallest eligible: chosen** |

All 28 ledgers are complete and `PASS` (request errors 0, invariant violations 0, check errors 0, reference errors 0,
final-path errors and mismatches 0, work unavailable 0; the work of every request is conserved against the independent
count of ratings).

### What 256 changes in the six cells

Totals of the 12 requests, none against 256:

| Cell | Full ratings | Generation time | Local searches ended by the allowance |
|---|---|---|---|
| classic9 Normal | 1,657 / 1,657 | 2.8 / 2.7 s | 0 |
| classic9 Master | 53 / 53 | 0.8 / 0.8 s | 0 |
| classic9 Nightmare | 17,706 / 15,010 (-15 %) | 61.1 / 54.6 s (-11 %) | 17 (none: 0) |
| Killer Hard | 6,160 / 6,160 | 58.6 / 58.4 s | 0 (all 96 local searches end at the proposal cap of 32,768) |
| Killer Expert | 25,990 / 25,990 | 119.6 / 120.9 s | 0 (the same) |
| Jigsaw 9 Expert | 6,420 / 5,615 (-13 %) | 9.3 / 8.1 s | 6 |

Killer Hard and Killer Expert have no exact hit at any setting; with no allowance, and at 256, every one of their
attempts ends at the existing proposal cap, so 256 reaches none of their local searches (64 and 128 reach a few:
15 and 8 at 64). The choice rests on one cell, and 12 requests per cell are what the owner's protocol fixes.

## The closure requests at the four settings (diagnostics, not selecting)

`tests/difficulty-recovery.js --mode=diagnostic`, normal attempts (8), one request per process, the 500 s ceiling of the
driver, one command at a time under the shared lock. They are not selection cells and could not change the result.
Times are of the generation (`samples` = the ordinary dig samples, `local` = the local continuation).

| Request | Setting | Outcome | Time (samples + local) | Full ratings (local) | Proposals | Local searches ended by |
|---|---|---|---|---|---|---|
| G13 (`samurai` Nightmare, seed 42) | none | not exact (shallow fallback, 8 attempts) | 220.5 s (73.7 + 146.7) | 8,192 (8,009) | 61,516 | rating cap 8 |
| | 256 | the same puzzle, not exact | 104.6 s (73.9 + 30.6) | 2,231 (2,048) | 12,752 | allowance 8 |
| | 128 | the same | 86.7 s (73.9 + 12.8) | 1,207 (1,024) | 6,469 | allowance 8 |
| | 64 | the same | 80.0 s (73.9 + 6.1) | 695 (512) | 3,357 | allowance 8 |
| mega12 Nightmare, seed 3 | none | not exact (8 attempts) | 65.1 s (38.0 + 27.1) | 5,461 (5,260) | 224,132 | rating cap 2, proposal cap 6 |
| | 256 | the same puzzle, not exact | 47.1 s (37.7 + 9.4) | 2,112 (1,911) | 52,572 | allowance 7, proposal cap 1 |
| | 128 | the same | 43.8 s (39.1 + 4.7) | 1,216 (1,015) | 38,467 | allowance 7, proposal cap 1 |
| | 64 | the same | 39.4 s (37.5 + 1.9) | 713 (512) | 2,490 | allowance 8 |
| mega16 Nightmare, seed 3 | none | **exact and required** at attempt 6 | 388.7 s (264.2 + 124.5) | 5,163 (4,915) | 33,179 | rating cap 5 |
| | 256 | the same puzzle, exact at attempt 6 | 310.2 s (278.1 + 32.1) | 1,535 (1,287) | 4,776 | allowance 5 |
| | 128 | the same | 296.3 s (281.3 + 15.0) | 895 (647) | 2,354 | allowance 5 |
| | 64 | the same | 270.4 s (263.2 + 7.2) | 575 (327) | 1,241 | allowance 5 |

All twelve records have outcome `ok`, `complete: true` and no instrumentation problem, and each request returns the same
puzzle (the same `puzzleHash`) at all four settings. G13 and mega12 return the same
shallow fallback at every setting (score 1,637 and 2,046, Nightmare band, `forcingChain`, warnings
`difficulty.approximate` and `difficulty.shallow`); mega16 is exact at every setting (score 2,386, no warning): its
first five attempts end at the rating cap (none) or the allowance, and the sixth finds an exact puzzle after a short
local search (7 ratings with no extra cap). **The ordinary samples are 74 s, 38 s and 264 to 281 s
of these times at every setting:** no ratings allowance acts on them, so it can shorten the local continuation (G13
220 s to 80-105 s) and nothing else.

## Original limits (preflights with the selected default)

| Check | Limit | Result at 256 |
|---|---|---|
| G13, the actual golden request, normal attempts | 120,000 ms generation guard | **passes**: 104.7 s, 8 attempts, score 1,637, not exact, not required, warnings `difficulty.approximate` and `difficulty.shallow` (87 % of the guard) |
| mega12 Nightmare group, seeds 1 to 4, CV5 | 60,000 ms guard and `timeLimit(3000)` = 6,000 ms (factor 2) | **fails**: seed 1 takes 48.2 s against 6,000 ms (the CV5 test passes, 137.7 s) |
| mega16 Nightmare group | 60,000 ms guard and `timeLimit(10000)` = 20,000 ms | **fails**: both tests end in `budget.exceeded` at 60 s |

R5 selects by its fixed rule and not by these limits, and no value of the allowance could bring the mega groups inside
them: mega12's ordinary samples alone take 37.5 s for the eight attempts and mega16's 263 s for six, before any local
search. This is the S-OD2 owner stop (a remaining mega guard/latency failure); the mega assertions, the guards and the
factor were not touched, and G13 was not persisted.

## Source change and reproduction

One literal, `generator/js/engine/digger.js` line 653: `const SHALLOW_SEARCH_DEFAULT = Infinity;` became
`const SHALLOW_SEARCH_DEFAULT = 256;`. The engine source hash goes from `19afa6ee…` (every ledger and diagnostic here)
to `9a833d93…`; reverting the literal in memory reproduces the first, so the ledgers were generated from the same source
as the final one except for that literal. The commands, shards, exit codes, times and lock waits are in
[evidence/MS05r4/evidence.md](evidence/MS05r4/evidence.md) and `runs.jsonl`.
