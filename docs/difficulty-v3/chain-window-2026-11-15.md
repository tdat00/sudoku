# The short-chain cutoff C: the R9 selection (MS07c)

This is the evidence of the one selection that R9 leaves to a measurement. It compares the two cutoffs of
[generator/design.md](../../generator/design.md) 6.6, C = 4 and C = 6, on fresh generation requests, applies the rule of the
owner as it was fixed beforehand, and records what the new default changes. The commands, ledgers, transcripts and hashes
are in [evidence/MS07c/](evidence/MS07c/evidence.md).

**Result: C = 4 (36 exact hits against 24).** The default of `SG.chainSearch.SHORT_MAX` is now 4, the only production edit
(the literal `INITIAL_SHORT_MAX` of `core/js/engine/tech-chain.js`). The long ceiling 12, the depths, the weights, the work
limits, the orders and the offers are unchanged.

## The rule and what was measured

> Select the cutoff with **more exact hits in total; C=6 on a tie**. Report each variant, timings and
> shallow outcomes separately. Run GQ-first only after the selected default is in force without an override.

For each C, 12 fresh Nightmare requests of classic9, diagonalX and Jigsaw 9 (`node tests\soak.js --variant=<v>
--level=nightmare --count=12 --seed=20260101 --no-gate --chain-window=<C> --json=...`): 36 requests per cutoff, 72 in all. The
requests are the derived tags `variant:level:index` of the soak, not literal puzzle seeds; a hit is the generator's own `exact`
flag (`generationExact === true`), and every error or timeout would be a miss (there was none: all 72 requests returned a
puzzle, and in all 72 rows the flag agrees with the certificate derived from the canonical rating). Everything else is fixed:
the shallow allowance (256), the attempts of the board (8 for the three 81-cell boards), the weights, the bands and the orders;
only `SG.chainSearch.SHORT_MAX` differs, and the six ledgers share one source hash (`ddf2fa5a…`, the accepted MS07b source),
one tool hash (`efff9dcd…`) and Node v26.13.0. The two cutoffs of a board ran back to back (C = 4, then C = 6), one locked
command per cell, 16 s apart.

| Cell | C | Exact | In band, shallow | Errors | Command time | Generation: p50 / p95 / max | Attempts | Full ratings | Steps `forcingChain` / `forcingChainLong` / `nishio` / `nishioDeep` |
|---|---:|---:|---:|---:|---:|---|---:|---:|---|
| classic9 | **4** | **12 / 12** | 0 | 0 | 2.9 s | 146 / 512 / 512 ms | 14 | 785 | 23 / 18 / 0 / 0 |
| classic9 | 6 | 2 / 12 | 10 | 0 | 38.4 s | 3,050 / 3,369 / 3,369 ms | 83 | 14,848 | 54 / 1 / 1 / 0 |
| diagonalX | **4** | **12 / 12** | 0 | 0 | 6.5 s | 264 / 1,481 / 1,481 ms | 13 | 696 | 21 / 13 / 0 / 0 |
| diagonalX | 6 | 10 / 12 | 2 | 0 | 73.4 s | 5,027 / 10,658 / 10,658 ms | 56 | 14,314 | 1 / 0 / 10 / 0 |
| Jigsaw 9 | **4** | **12 / 12** | 0 | 0 | 2.9 s | 142 / 481 / 481 ms | 13 | 701 | 12 / 17 / 2 / 0 |
| Jigsaw 9 | 6 | 12 / 12 | 0 | 0 | 10.0 s | 424 / 2,705 / 2,705 ms | 22 | 3,138 | 0 / 0 / 12 / 0 |
| **Total** | **4** | **36 / 36** | 0 | 0 | 12.3 s | | 40 | 2,182 | |
| **Total** | 6 | 24 / 36 | 12 | 0 | 121.8 s | | 161 | 32,300 | |

The table reports each variant separately, with its timings and its shallow outcomes. "In band, shallow" is a solved puzzle in
the band of its level that needs no technique of the tier (no exact hit); the "attempts" are the sum of the attempts the 12
requests used. The misses of C = 6 are the requests 1, 3 to 11 of classic9 (10, all shallow in band) and 5 and 6 of diagonalX (2,
shallow); no request at either cutoff left its band or failed an invariant (I1 to I7: 0 violations in all six cells, every
diagnostics line `PASS`).

| Predicate (R9, owner SA1-Q-S1(c)) | Value |
|---|---|
| exact hits in total at C = 4 | 36 (12 + 12 + 12) |
| exact hits in total at C = 6 | 24 (2 + 10 + 12) |
| C = 4 has more exact hits than C = 6 | **true** |
| tie (then C = 6) | false |
| selected | **4** |

The result does not depend on an analyst's preference: the rule picks the larger total, and the two totals differ by 12.
The earlier observation on fixed boards (C = 6: 0 of 12 exact, C = 4: 2 of 12) is not this experiment's denominator and
is not used.

## Why the totals differ

With C = 6 the Nightmare tier is reached by `forcingChainLong` (7 to 12 links, 1,400) or `nishio` (depth 1, 1,700) only, and
chains of 5 and 6 links are the Master technique `forcingChain` (1,100): few proofs of a dug puzzle need a 7-link chain, so
most requests end as shallow fallbacks after all attempts (classic9 83 attempts for 12 requests, 10 shallow). With C = 4 a
proof of 5 or more links is `forcingChainLong`, so a puzzle whose proof needs one is exact at Nightmare, usually at the first
attempt (13 to 14 attempts for 12 requests per cell) and with about a fifteenth of the work (full ratings 2,182 against 32,300). The
chain steps of the final paths are the same kind of proof in both runs (lengths 3 to 7); the cutoff only decides the id and
with it the tier.

## The guard of the dig (IR59)

SA1 asked MS07c to watch the `OBJECTIVE_STEPS` guard (100,000 budget checks, then a removal is refused), which MS07b made
count more checks. The engine does not say how often it refuses, so each of the six commands (and the Hell 1 pilot) ran under an
observer loaded with `node --require` (`generator/tests/artifacts/difficulty-v3/MS07c/guard-probe.js`, tested on stand-in
objects): it wraps `SG.logicalSolver.solve`, counts its calls and the throws of the guard's error code
`digger.objectiveGuard`, and rethrows everything unchanged. Result: **0 refusals in 221,824 solves** over the six cells
(6,390 / 9,680 / 7,382 at C = 4; 80,006 / 93,846 / 24,520 at C = 6) **and 0 in 18,306** over the two pilot requests, so the guard did not
act in any of the 74 requests measured here; it is not a cause of any of the numbers above. The observer is outside the soak, so the ledgers are
those of the soak of record (its `argv` and tool hash are unchanged); its cost is one wrapper call per solve.

## What the new default changes (E, GH and the pins)

All of it is the intended effect of the rule, nothing was fitted. The complete E ran on the final source (`d591e6f6…`):

| Gate | Result |
|---|---|
| GG, 104 shards, 520 keys | **37 of 520 hashes changed**: classic9 Nightmare 18 of 20 seeds and diagonalX Nightmare 19 of 20; no other combination changed (Master, every lower level and every other board keep all their hashes) |
| GR wires G09 to G13 | G10 (Killer Nightmare seed 42) and G13 (Samurai Nightmare seed 42) changed: both are now **exact** (G10 at attempt 4, score 2,051; G13 at attempt 1, score 2,021, recorded in 0.67 s) where both were shallow fallbacks after all their attempts (G13: 2); G09, G11 and G12 match |
| GR analyses G01 to G14 | G03, G04, G05, G06, G07, G10, G13 and G14 changed (their puzzles or the ids and scores of their chain steps); G01, G02, G08, G09, G11 and G12 match |
| GH | the complete catalogue (28 examples) checks; only the `forcingChainLong` example changed: the same discovered puzzle (Nightmare seed 3) now gives a 6-link contradiction where it gave a 7-link forced chain |
| Hell 1 pilot (2 requests) | 5,559.6 and 5,571.3 ms generation, both in band and shallow (0 of 2 exact; 5 and 7 `forcingChainLong` steps, depth-1 `nishio` only: no `nishioDeep` step); GD projection 20 x mean = 111.3 s, GQ projection 40 x mean = 222.6 s (172 s and 345 s with the soak's own checks, 8.6 s per request) |
| Cost of the split IDs (`pattern-cost.js`, 20 runs, real fixtures) | `forcingChainLong` 5,930 and 10,039 units of 50,000 on its two positives (20.1 % at most), 4,562 and 1,641 on its negatives; `nishioDeep` 5,184 and 775 on its positives, 177 on its negative (p95 10.5 ms at most); no case capped |

The pins that follow the cutoff are listed in the evidence: the registry fixtures of `forcingChainLong` (the positions of two dug puzzles
now give a 5- and a 6-link contradiction), a new negative of `forcingChain` at the window boundary, the labelled Nightmare puzzles of the rated
fixtures (all three constructed Nightmare puzzles are Hell 1, `required` at the Nightmare label), the 14 goldens' jump and exchange counts (14
compact and 17 details jumps, one exchange, in G04) and the layout of the generated golden fixture.

## Reproduction

```powershell
node tests\soak.js --variant=classic9 --level=nightmare --count=12 --seed=20260101 --no-gate --chain-window=4 --json=..\docs\difficulty-v3\evidence\MS07c\4\classic9-nightmare.json
node tests\soak.js --variant=classic9 --level=nightmare --count=12 --seed=20260101 --no-gate --chain-window=6 --json=..\docs\difficulty-v3\evidence\MS07c\6\classic9-nightmare.json
```

(the same for `diagonalX` and `jigsaw9`). `--chain-window` is a diagnostic of the soak (generator design 15.4), absent by
default; `tests/artifacts/difficulty-v3/MS07c/summarize-experiment.cjs` computes the table above from the six ledgers. Run
through the shared lock, one cell per command. MS18b repeats the rule at the end.

## Final recheck (MS18b, 2026-11-18): the same rule on the complete catalogue

The task text above is history and stays as measured. MS18b repeated the R9 experiment on the final candidate (the accepted MS17b source `57c1b10`; rating version
3; soak `sourceHash` `85537bbd...`, `toolHash` `efff9dcd...`, Node v26.13.0; the production defaults are still **R5 256 and C 4**): fresh requests (no MS18a or MS07c row was reused),
the same three Nightmare cells (classic9, diagonalX, Jigsaw 9), twelve requests per cell and cutoff (tags `variant:level:index`, base seed 20260101), `--chain-window=4` and
`--chain-window=6`, **6 logical cells, 72 requests**, with no `--shallow-cap` and the shallow allowance at its default, as 16 locked commands (jobs 1) under the named policy
`MS18b-host-active` ("shared-slot, CLI-host-active; not strict-quiet-machine timing"). The evidence is in [evidence/MS18b/](evidence/MS18b/evidence.md) (`decision-packet.md`,
`selection.json`). The rule is the one of this record: more exact hits in total wins, C = 6 on any tie.

| Cell | C | Exact | In band, shallow | Errors | Attempts | Full ratings | Generation s (sum of 12) |
|---|---:|---:|---:|---:|---:|---:|---:|
| classic9 | **4** | **12 / 12** | 0 | 0 | 21 | 2,078 | 15.2 |
| classic9 | 6 | 2 / 12 | 10 | 0 | 89 | 15,932 | 77.2 |
| diagonalX | **4** | **12 / 12** | 0 | 0 | 12 | 637 | 20.2 |
| diagonalX | 6 | 12 / 12 | 0 | 0 | 18 | 2,327 | 70.1 |
| Jigsaw 9 | **4** | **12 / 12** | 0 | 0 | 28 | 3,689 | 103.9 |
| Jigsaw 9 | 6 | 6 / 12 | 6 | 0 | 83 | 18,604 | 378.8 |
| **Total** | **4** | **36 / 36** | 0 | 0 | 61 | 6,404 | 139.3 |
| **Total** | 6 | 20 / 36 | 16 | 0 | 190 | 36,863 | 526.1 |

**Result: C = 4 is reconfirmed (36 exact hits against 20, no tie).** The rule winner equals the value in force, nothing is proposed to the owner and no default, source or
fixture was edited. Per cell, C 6 is lower or equal in every variant (classic9 2 of 12, diagonalX 12 of 12, Jigsaw 9 6 of 12), all 72 requests returned a puzzle and no check
failed. C 6 costs 3.8 times the generation of C 4 on these cells (shared machine, descriptive). The C 4 rows reproduce MS18a's puzzles in all 36 requests. One factor at a time:
it says nothing about the joint behaviour of two changed defaults.
