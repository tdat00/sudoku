# MS18d Phase B handoff (dev, claude-sonnet-5.5) — target pin update and functional hash evidence

Released 11:08:38 +07:00, resumed after the rulings (SA2 `4fc6947e`, `9ab6cd4b`, `4b9e5a1f`, `3ee989db`), the
GG compounds ran 12:41–12:48, the Phase B records were frozen afterwards. Phase C (timed GP, S-AV11 profile) is NOT
started: MS18d-Q1 is unanswered. No Git write was made.

## Targets (17, rule applied to MS18c qualification data; not a GP measurement)

Rule: q = raw GQ p95; keep t when q <= t, else new = min(budget, max(predecessor, ceil(3q))), no cascade.

| Cell | Old ms | New ms | Rule (q) |
|---|---:|---:|---|
| classic4/veryEasy | 10 | 31 | ceil3q (10.1122) |
| classic6/veryEasy | 10 | 39 | ceil3q (12.9032) |
| classic9/easy | 150 | 2342 | ceil3q (780.3884) |
| classic9/normal | 150 | 2627 | ceil3q (875.5958) |
| classic9/expert | 400 | 1323 | ceil3q (440.7861) |
| classic9/nightmare | 2500 | 8377 | ceil3q (2792.0346) |
| mega12/nightmare | 3000 | 18842 | ceil3q (6280.4697) |
| mega16/hell2 | 10000 | 30000 | budget cap (25239.0671) |
| diagonalX/nightmare | 3000 | 10000 | budget cap (5368.3201) |
| hyper/normal | 200 | 1573 | ceil3q (524.3035) |
| hyper/nightmare | 3000 | 10000 | budget cap (8503.0273) |
| jigsaw9/easy | 350 | 1905 | ceil3q (634.7225) |
| jigsaw9/hell2 | 5000 | 10000 | budget cap (6102.238) |
| killer/normal | 700 | 5425 | ceil3q (1808.2659) |
| sohei/hell2 | 20000 | 30000 | budget cap (27155.5581) |
| butterfly/nightmare | 8000 | 30000 | budget cap (16120.4641) |
| wordoku/easy | 250 | 2921 | ceil3q (973.633) |

135 positions frozen (79 offered, 56 absent), 62 retained and 17 updated, table SHA-256
`3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a`: `targets-frozen-final.json` (before GG) and
`targets-frozen-post-gg.json` (after GG) are byte-identical.

## Identities

- Producer sources `75b0955e3e356bd1` and qualifier hash `c0ef0d25...fd77`: unchanged.
- E hash identity `1032ab2f...58a0` -> `344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1`
  (only `perf-helper.js` is in its recipe); it did NOT change with the two suite filters.
- E replay identity `1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc`: recomputed, unchanged.
- Generator quick fingerprint (listing `sourceHash`, final value belongs to Phase D): MS18c `fc31c9db` ->
  `29888ecb...0cd0` (targets, documents, quick test) -> `49089814...b1f8` (after the two filters).

## Retained-budget contrasts (design 15.1/15.2, both guides; no `BUDGET_MS`, title or threshold edit)

Ten manual rows and one SG_DEEP-only row, retained base ms -> 9.1 target: killer Normal 700 -> 5425; jigsaw9 Easy
350 -> 1905, Hell 2 5000 -> 10000; wordoku Easy 250 -> 2921; extra-regions (larger of diagonalX and hyper) Normal
200 -> 1573, Nightmare 3000 -> 10000; `difficulty.test.js` classic9 medians Easy 150 -> 2342, Normal 150 -> 2627,
Expert 600 -> 1323, Nightmare 2500 -> 8377; SG_DEEP-only `mega.test.js` mega12 Nightmare 3000 -> 18842.
A timing-only failure on any of them is an honest failed S-OD4 result.

## The one test changed

`manual-corpus.test.js`: old title "... has one positive, unchanged target for each of the 79 offered cells ...";
new title ends "... 62 unchanged and 17 recalibrated (MS18d), and none for the 56 others (39 removed, 17 never
offered)". `OLD` kept, `RECALIBRATED` is the literal 17-entry map (not read from `PERF_TARGETS`).

## Deep registrations removed (SG_DEEP=1 listing only; quick inventory unchanged at 4807)

Guard `PUBLISHED[id].indexOf(level) === -1` in the deep branch of `mega.test.js` (12 -> 9) and
`multigrid.test.js` (16 -> 12); bodies, budgets, seeds 1..20, the 120000 ms request budget, hit rates and titles
untouched. Each removed registration requested seeds 1..20 (count 20). Listings and proof: `deep-registration/`
(`comparison.json` pass: 7 removed, 0 added, quick identical). GQ: `MS18c/merge/qualification-v3.json`.

| Registration | Local level index | GQ n / hits | GQ verdict / stop | GQ p95 ms |
|---|---:|---|---|---:|
| mega12 hell1 | 5 | 9 / 0 | hidden / time | 105764.751 |
| mega16 nightmare | 4 | 25 / 25 | hidden / time | 60754.8719 |
| mega16 hell1 | 5 | 9 / 0 | hidden / time | 120015.1966 |
| samurai easy | 1 | 22 / 10 | hidden / misses | 1129.1194 |
| sohei easy | 1 | 18 / 4 | hidden / misses | 899.3724 |
| butterfly easy | 1 | 15 / 1 | hidden / misses | 1115.6109 |
| flower easy | 1 | 14 / 0 | hidden / misses | 901.8375 |

Audit (63 suites, file-only): `deep-registration/audit-63-files.md`; the two named positives only. Observation
left untouched: the quick multigrid per-level tests of the hidden Easy of each board run through
`withRequestedLevel`, assert no hit rate, and are the accepted MS18c shape.

## GG (functional and hash evidence, not GP)

104 shards x 5 = 520 keys, ordinary 450/540 lock, `perf.js --hash-record` per shard, no update flag. Compound 1:
#0-#102 PASS in 401.2 s (stopped before #103 by its own admission, 400.9 s + 20 s projected > 420 s); compound 2:
#103 PASS in 3.4 s. Every shard exit 0 with its complete five-key ledger (identity `344afdec`), all within their
projection (sum of node time 403.661 s, max 30.115 s killer-hard-05). Check-only merge
`perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS18d\hashes --check-hashes`: "merged 104 ledgers: all 520
keys exactly once, recorded from the current sources; all 520 puzzles unchanged". No expected hash changed.

## Disclosures

1. A first final run of `test-run-locked.js` failed 1 of 9 (kept: `final-test-run-locked-1-failed-race.txt`): reading
   a killed tee's transcript while the dying tee still held it raised a sharing violation before the record was
   logged. `run-locked.ps1` now reads the transcript shared and never fails before the record; the rerun passed 9/9.
2. The first `compare-listings.js` run failed two of its own count checks (it counted the unchanged "puzzles"
   tests that a deep run swaps for 20-puzzle ones as deep registrations); the script was fixed, and the failed
   `comparison.json` is kept as `comparison-1-superseded.json`. The first `test-run-gg.js` run failed one assertion
   of mine (a wrong message regex). Dev transcripts of superseded runs are kept (`dev-*`, `*-1-*`).
3. Every Node command of Phase B went through `run-locked.ps1` (every real gap >= 15.308 s; the six `error`
   records in `lock-log.jsonl` are failed development runs, the first three of the helper tests and a usage error of
   the freeze among them, besides items 1 and 2). `SG_DEEP` was set only for the two
   `--list-tests` children and restored. No GP, no S-AV11, no pilot, no timed measurement, no deep execution, no
   canonical-update flag, no edit under `tasks\`.
4. The 63-file audit is a grep-and-read pass (the grep tool), not a script.
