# IG-S02 task summary (provisional-r1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**. Arms: native-w1 = the full unmodified pipeline in one worker; attempts-w4 = S5a, one absolute attempt per worker, min(4, A) workers, consumed in native order.

## Coverage

| planned requests | pairs | complete | censored | errors | audit rejected | validation unknown | unstarted |
|---|---|---|---|---|---|---|---|
| 36 | 18 | 36 | 0 | 0 | 0 | 0 | 0 |

| shard | status | attempts | unstarted keys | rows reconciled by audit |
|---|---|---|---|---|
| m16-1 | recorded | a1 | 0 | 0 |
| m16-2 | recorded | a1 | 0 | 0 |
| m16-3 | recorded | a1 | 0 | 0 |
| m12 | recorded | a1 | 0 | 0 |
| sam | recorded | a1 | 0 | 0 |
| c9 | recorded | a3 | 0 | 0 |
| killer | failed | a1 | 0 | 6 |
| gt | recorded | a1 | 0 | 0 |

Identity of the pairs (every digest section of the normalised result, exact flags, pool invariants): 18 ok, 0 failed, 0 with equal digests but both puzzles rejected by the independent audit, 0 not comparable (censored), 0 deferred.

## Per cell, next to the report (seconds; p50 / p95 nearest rank, p95 = the observed maximum for n < 20)

| cell | A | pairs | verified pairs | native ready | pooled ready | ready speed-up (n/med/min-max) | cold speed-up med | CPU pooled / native med | report today med / p95 | report S5a factor | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| mega16 | 2 | 3 | 3 | 107.53 / 116.04 | 55.89 / 69.96 | 3 / 1.92 / 1.66-1.96 | 1.92 | 0.98 | 104.1 / 117.0 | 1.7-1.8 | estimate-supported (median ready-wall speed-up >= 1.7) |
| mega12 | 4 | 3 | 3 | 23.35 / 23.50 | 7.06 / 7.69 | 3 / 3.22 / 3.04-3.43 | 3.18 | 1.12 | 23.7 / 25.2 | 2.8-3 | estimate-supported (median ready-wall speed-up >= 2.8) |
| samurai | 2 | 3 | 3 | 24.93 / 26.53 | 13.64 / 14.83 | 3 / 1.79 / 1.70-1.83 | 1.78 | 1.04 | 26.7 / n/a | 1.7-1.8 | estimate-supported (median ready-wall speed-up >= 1.7) |
| classic9 | 8 | 3 | 3 | 4.98 / 5.64 | 1.55 / 1.74 | 3 / 3.22 / 0.91-3.25 | 3.04 | 1.45 | 4.9 / 5.7 | 2.8-3 | estimate-supported (median ready-wall speed-up >= 2.8) |
| killer | 8 | 3 | 3 | 21.11 / 30.44 | 7.97 / 14.73 | 3 / 2.55 / 2.07-2.65 | 2.52 | 1.14 | 17.8 / 30.0 | 2.8-3 | estimate-refuted (no pair reaches 2.8) |
| greaterThan | 8 | 3 | 3 | 11.57 / 19.32 | 4.41 / 6.31 | 3 / 2.62 / 0.89-3.06 | 2.58 | 1.58 | 9.3 / 19.2 | 2.8-3 | inconclusive (median below 2.8 but a pair reaches it) |

Cold wall, CPU and exact counts per arm:

| cell | native cold p50 / p95 | pooled cold p50 / p95 | native CPU p50 / p95 | pooled CPU p50 / p95 | native verified exact | pooled verified exact | censored (native / pooled) | errors (native / pooled) | audit rejected (native / pooled) | above 120 s (native / pooled) |
|---|---|---|---|---|---|---|---|---|---|---|
| mega16 | 107.61 / 116.13 | 56 / 70.07 | 107.55 / 116.19 | 105.75 / 115.22 | 0/3 | 0/3 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| mega12 | 23.46 / 23.60 | 7.18 / 7.82 | 23.83 / 23.92 | 26.31 / 26.70 | 0/3 | 0/3 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| samurai | 25.02 / 26.62 | 13.74 / 14.93 | 25.56 / 27.14 | 26.84 / 28.23 | 0/3 | 0/3 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| classic9 | 5.07 / 5.73 | 1.67 / 1.86 | 5.64 / 6.09 | 8.19 / 8.53 | 1/3 | 1/3 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| killer | 21.20 / 30.53 | 8.08 / 14.84 | 22.16 / 31.45 | 25.23 / 35.30 | 0/3 | 0/3 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| greaterThan | 11.65 / 19.42 | 4.52 / 6.42 | 15.50 / 25.59 | 24.45 / 31.38 | 3/3 | 3/3 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

## Pool occupancy and origin (the two-attempt ceiling: min(4, A) lanes, never four busy on A = 2)

| cell | A | lanes | peak active | mean busy lanes (med) | attempts consumed | attempts started | speculative completed | first exact origin | first exact attempt | duplicated model build ms |
|---|---|---|---|---|---|---|---|---|---|---|
| mega16 | 2 | 2 | 2 | 1.88 | 2,2,2 | 2,2,2 | 0 | -,-,- | -,-,- | 2.6,2.6,2.6 |
| mega12 | 4 | 4 | 4 | 3.43 | 4,4,4 | 4,4,4 | 0 | -,-,- | -,-,- | 7.8,6.2,6.5 |
| samurai | 2 | 2 | 2 | 1.82 | 2,2,2 | 2,2,2 | 0 | -,-,- | -,-,- | 3.0,3.1,3.0 |
| classic9 | 8 | 4 | 4 | 3.42 | 8,1,8 | 8,5,8 | 1 | -,keeper,- | -,1,- | 7.4,1.5,8.8 |
| killer | 8 | 4 | 4 | 2.73 | 8,8,8 | 8,8,8 | 0 | -,-,- | -,-,- | 5.8,6.9,5.8 |
| greaterThan | 8 | 4 | 4 | 3.62 | 1,6,4 | 5,8,8 | 3 | sample,sample,sample | 1,6,4 | 1.7,6.8,6.2 |

## Paired rows (before = native-w1, after = attempts-w4; seconds)

| pair | first arm | native ready | native cold | native CPU | pooled ready | pooled cold | pooled CPU | ready x | cold x | CPU ratio | exact (native / pooled) | identity | outcomes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mega16:nightmare:1 | native-w1 | 116.04 | 116.13 | 116.19 | 69.96 | 70.07 | 115.22 | 1.66 | 1.66 | 0.99 | no / no | identity-ok | complete / complete |
| mega16:nightmare:2 | attempts-w4 | 102.69 | 102.77 | 103.03 | 52.41 | 52.51 | 101.31 | 1.96 | 1.96 | 0.98 | no / no | identity-ok | complete / complete |
| mega16:nightmare:3 | native-w1 | 107.53 | 107.61 | 107.55 | 55.89 | 56.00 | 105.75 | 1.92 | 1.92 | 0.98 | no / no | identity-ok | complete / complete |
| mega12:nightmare:1 | native-w1 | 23.35 | 23.46 | 23.83 | 7.69 | 7.82 | 26.70 | 3.04 | 3.00 | 1.12 | no / no | identity-ok | complete / complete |
| mega12:nightmare:2 | attempts-w4 | 22.71 | 22.79 | 23.30 | 7.06 | 7.18 | 26.31 | 3.22 | 3.18 | 1.13 | no / no | identity-ok | complete / complete |
| mega12:nightmare:3 | native-w1 | 23.50 | 23.60 | 23.92 | 6.86 | 6.98 | 26.09 | 3.43 | 3.38 | 1.09 | no / no | identity-ok | complete / complete |
| samurai:nightmare:1 | native-w1 | 26.53 | 26.62 | 27.14 | 14.83 | 14.93 | 28.23 | 1.79 | 1.78 | 1.04 | no / no | identity-ok | complete / complete |
| samurai:nightmare:2 | attempts-w4 | 24.93 | 25.02 | 25.56 | 13.64 | 13.74 | 26.84 | 1.83 | 1.82 | 1.05 | no / no | identity-ok | complete / complete |
| samurai:nightmare:42 | native-w1 | 21.70 | 21.78 | 22.39 | 12.79 | 12.90 | 22.53 | 1.70 | 1.69 | 1.01 | no / no | identity-ok | complete / complete |
| classic9:nightmare:1 | native-w1 | 4.98 | 5.07 | 5.64 | 1.55 | 1.67 | 8.19 | 3.22 | 3.04 | 1.45 | no / no | identity-ok | complete / complete |
| classic9:nightmare:2 | attempts-w4 | 0.65 | 0.74 | 1.05 | 0.72 | 0.84 | 4.59 | 0.91 | 0.88 | 4.39 | yes / yes | identity-ok | complete / complete |
| classic9:nightmare:3 | native-w1 | 5.64 | 5.73 | 6.09 | 1.74 | 1.86 | 8.53 | 3.25 | 3.08 | 1.40 | no / no | identity-ok | complete / complete |
| killer:nightmare:1 | native-w1 | 18.00 | 18.09 | 19.30 | 7.06 | 7.18 | 23.45 | 2.55 | 2.52 | 1.22 | no / no | identity-ok | complete / complete |
| killer:nightmare:2 | attempts-w4 | 30.44 | 30.53 | 31.45 | 14.73 | 14.84 | 35.30 | 2.07 | 2.06 | 1.12 | no / no | identity-ok | complete / complete |
| killer:nightmare:3 | native-w1 | 21.11 | 21.20 | 22.16 | 7.97 | 8.08 | 25.23 | 2.65 | 2.62 | 1.14 | no / no | identity-ok | complete / complete |
| greaterThan:nightmare:1 | native-w1 | 0.93 | 1.01 | 1.53 | 1.04 | 1.16 | 6.33 | 0.89 | 0.88 | 4.13 | yes / yes | identity-ok | complete / complete |
| greaterThan:nightmare:2 | attempts-w4 | 19.32 | 19.42 | 25.59 | 6.31 | 6.42 | 31.38 | 3.06 | 3.02 | 1.23 | yes / yes | identity-ok | complete / complete |
| greaterThan:nightmare:3 | native-w1 | 11.57 | 11.65 | 15.50 | 4.41 | 4.52 | 24.45 | 2.62 | 2.58 | 1.58 | yes / yes | identity-ok | complete / complete |

## Machine time and priority waits

Charged 1399.9 s of the 1500 s allocation over 11 commands (remaining 100.1 s); priority waits behind difficulty-v3 3000.0 s, not charged. charged = occupied wrapper time + the 45 s quiet-admission grace per command; the priority wait is not charged.

| shard | attempt | status | occupied s | charged s | priority wait s |
|---|---|---|---|---|---|
| c9 | a1 | error | 3.8 | 48.8 | 791.0 |
| c9 | a2 | error | 3.6 | 48.6 | 90.4 |
| c9 | a3 | complete | 20.3 | 65.3 | 105.3 |
| m16-1 | a1 | complete | 189.0 | 234.0 | 252.9 |
| m16-2 | a1 | complete | 157.3 | 202.3 | 135.4 |
| m16-3 | a1 | complete | 165.5 | 210.5 | 252.8 |
| m12 | a1 | complete | 94.2 | 139.2 | 243.7 |
| sam | a1 | complete | 117.7 | 162.7 | 270.9 |
| killer | a1 | validation-failed | 102.3 | 147.3 | 135.4 |
| gt | a1 | complete | 48.1 | 93.1 | 550.4 |
| killer/audit-a1 | audit-a1 | complete | 2.9 | 47.9 | 171.6 |

## Sources

| item | value |
|---|---|
| runtime fingerprints | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| harness fingerprints | dd759a22bf13b732face5b950b3e3054cf12e79115f0f5eed536e74f306406fd |
| adapter hashes | 3813bdb06e947a014f06c6601a017c52870527f0b15fcfa4a455f648acc7bf06 |
| sources stable | true |
| firewall clean | true |
| commands | m16-1:a1:complete; m16-2:a1:complete; m16-3:a1:complete; m12:a1:complete; sam:a1:complete; c9:a3:complete; killer:a1:validation-failed; gt:a1:complete |

## Reconciliation by audit sidecar

the stored records are never modified: a reconciled row is a copy that carries the original outcome and error, the original generation timings and fingerprints, and the hash-linked audit that verified its saved puzzle.

Audit `provisional-r1/IG-S02/killer/audit-a1/audit.json` (file sha256 `28b1f1fa36bf7e69029f7e5bb99b0f09b7206be69e7e5212c1e2ed36ca4a3738`): status complete, verifier tests passed, 6 verified, 0 failed, 0 unknown of 6. Verifier: worker.cjs `e2d6800bc162151cfb7c39ba483062e98ec755a4230604f35cded01d5391b29d`, killer-audit.cjs `2cc7d4c093c77026d29e986812e715b1d48127f73e0fefa45ef89663273e0911`. Harness since the evidence (dd759a22 to c4f3a6e0): changed aggregate.cjs, ig02-run.cjs, worker.cjs; added ig02-killer-audit.cjs, killer-audit-test.cjs, killer-audit.cjs. ig02-run.cjs and aggregate.cjs changed after the evidence only in reporting (pair rows, cell summary, task summary); the generation hooks (prepare, execute, augmentRecord), attempt-pool.cjs, attempt-worker.cjs, the adapter, the plan, host.cjs, loader.cjs and run.cjs are those of the evidence. worker.cjs changed only in validate() (the Killer branch of the structure check) and killer-audit.cjs is new: verification only, no generation path.

| key | original outcome | audit status | new outcome | verified exact | link hash |
|---|---|---|---|---|---|
| IG-S02/killer/killer:nightmare:1/native-w1 | error | verified | complete | false | fb57cb61b5da8d22 |
| IG-S02/killer/killer:nightmare:1/attempts-w4 | error | verified | complete | false | f1250ccf64f073f8 |
| IG-S02/killer/killer:nightmare:2/attempts-w4 | error | verified | complete | false | 3555ec29bcdc1462 |
| IG-S02/killer/killer:nightmare:2/native-w1 | error | verified | complete | false | fb056581b0e4c465 |
| IG-S02/killer/killer:nightmare:3/native-w1 | error | verified | complete | false | 2a8d42cb4c2cd31d |
| IG-S02/killer/killer:nightmare:3/attempts-w4 | error | verified | complete | false | 8ad87991c4368114 |
