# MS18e E2: live rows on the committed tree 547168b4

Source identity with-manual `d8d48983237d8aa09ecdb9038c5049a615682c76613f02e7a7e7e46d91c6c8b3`
(`transcripts/e2-identities.txt` matches `audit/final-identities-v2.txt`). Every row is one locked,
teed invocation through `generator/tests/artifacts/difficulty-v3/MS18e/run-locked-e.ps1`, strictly
serial, `SG_TIME_FACTOR=2`, `CI` unset, gap of at least 15 s, 540 s whole-process ceiling. The
authoritative record of every command (start and end clock, tee seconds, helper seconds, caller
seconds, exit, outcome) is `lock-log.jsonl`.

## Result

75 admitted rows ran (21 deep, 32 I5, 22 GD); the total tee time is 1542.1 s. No row exceeded its P
and no row was killed at 540 s. 74 rows exited 0 and passed. One row exited 1: `GD-normal`, the
pre-recorded S-AV14 finding.

| Family | Rows | Sum of tee seconds | Largest row | Outcome |
| --- | ---: | ---: | --- | --- |
| deep mega12 Nightmare (P30) | 7 | 20.2 | 3.285 s | 7/7 ok, exact true |
| deep mega16 Nightmare (P150) | 7 | 90.6 | 23.555 s | 7/7 ok, exact true |
| deep mega12 Hell 1 (P230) | 7 | 702.2 | 104.660 s | 7/7 ok, exact false (shallow fallback) |
| I5 (P = max(30, proposed)) | 32 | 276.3 | 73.35 s (ER-nightmare-hyper, P428) | 32/32 passed |
| GD (P = max(30, proposed)) | 22 | 452.7 | 181.763 s (GD-confusion, P376) | 21 passed; GD-normal 7 of 8 |

## S-AV14 (GD-normal)

Exit 1, 7 of 8 passed, tee 37.1 s against P75. The single failure is
`hits the requested level in at least 90 % of the puzzles`: `expected 83 to be >= 90`
(`generator/tests/manual/difficulty.test.js:1272`). The new evidence reports 83, matching MS17b and
MS07e. It is a numerical finding, not a pass and not a correctness stop (`manual/difficulty/normal.json`,
`transcripts/GD-normal.txt`).

## Hell 1 and Nightmare reconciliation (file-only, new outputs)

- Nightmare (`preflight/deep-reconcile-nightmare.json`): exit 0, 14 requests, 14 same-source
  records, complete true, evidence sound true, correctness pass, relations 6 pass / 0 fail / 0
  unevaluated.
- Hell 1 (`preflight/deep-reconcile-hell1-partial.json`): optional partial reconcile, expected
  incomplete. The tool returned exit 1 because the evidence is unsound solely from the 7 held
  `DEEP-mega16-hell1-*` occurrences (tool semantics `exitCodeOfReconciliation`,
  `generator/tests/fixtures/mega-contract.js:1180-1183`), not the anticipated exit 3. No
  correctness failure. Hell 1 is not complete. No MS07b record was used or copied. The lock log
  labels the row `failed-stop` only because the caller was given `-ExpectedExit 3`; that label is a
  raw record, not a failure classification.

## Findings

- mega12 Hell 1: exact 0/7. Every record is a shallow fallback (`difficulty.approximate` and
  `difficulty.shallow`, 4 of 4 attempts), the same as MS07b.
- mega12 Hell 1 cost: 92 to 105 s per run against 29 to 34 s at MS07b, consistent with the
  current-engine GQ data.
- mega12 Nightmare takes 2 to 3 s (MS05r5m 24 s); mega16 Nightmare 6 to 24 s (MS05r5m 80 to 117 s).
- `DEEP-mega16-cv5-a`: caller 12.1 s against helper 7.1 s, about 5 s of shared-slot wait.
- GD-confusion: 181.8 s for the whole invocation (700 requests), against the 187.7 s sum of seven
  batch-build times used to derive P376.
- GD-rest-08 (labelled puzzles) and GD-rest-11 (guarantees) contain the two newly guarded Hell 1
  tests that had never run: both passed (7/7 and 10/10).
- I5 measurements use different seeds and a different trace configuration from the GP ones; the GP
  maxima were only the basis of P, not I5 durations.

## Not run

- Held for the owner's answers to `MS18e-Q-GD-DEEP` and `MS18e-Q-SAV11`: `RATIO-off`,
  `RATIO-summary`, `RATIO-full`, the 7 `DEEP-mega16-hell1-*` occurrences, and `SAV11`.
- Reuse, no run: `CV3-replacement`, `REPLAY-mega16`.
- Hell 1 is therefore not declared complete.
