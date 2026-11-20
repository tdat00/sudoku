# MS18b decision packet: the final R5 cap and R9 chain-window rechecks

**Every timing here is "shared-slot, CLI-host-active; not strict-quiet-machine timing"** (MS18b-host-active): descriptive, never a GQ or GP verdict, never a bound. The raw strict screen is recorded unchanged for every command and is not turned into a pass.

**Status: reconfirmed (256 / C4).** Coverage 360 of the intended 360 outcomes (R5 288 of 288, R9 72 of 72). R5: in force **256**, rule winner **256**, same. C: in force **C4**, rule winner **C4**, same. Reporter checks: 145 of 145 pass.


## 1. Coverage, identity and evidence

Intended: R5 = 6 cells x 4 settings x 12 = 288; R9 = 3 cells x 2 settings x 12 = 72; 30 logical cells, 360 fresh outcomes. Production defaults in force: shallow allowance **256**, C **4**, attempts **8** (board default, no override); the fixed other default is the source default (no flag).

| Experiment | Setting | Cell | Merge status | Outcomes | Missing indexes | Error rows (misses) | Entries (ledgers) |
|---|---|---:|---:|---:|---:|---:|---:|
| R5 | 64 | classic9 normal | valid | 12 | - | - | cap-64-classic9-normal |
| R5 | 128 | classic9 normal | valid | 12 | - | - | cap-128-classic9-normal |
| R5 | 256 | classic9 normal | valid | 12 | - | - | cap-256-classic9-normal |
| R5 | none | classic9 normal | valid | 12 | - | - | cap-none-classic9-normal |
| R5 | 64 | classic9 master | valid | 12 | - | - | cap-64-classic9-master |
| R5 | 128 | classic9 master | valid | 12 | - | - | cap-128-classic9-master |
| R5 | 256 | classic9 master | valid | 12 | - | - | cap-256-classic9-master |
| R5 | none | classic9 master | valid | 12 | - | - | cap-none-classic9-master |
| R5 | 64 | classic9 nightmare | valid | 12 | - | - | cap-64-classic9-nightmare |
| R5 | 128 | classic9 nightmare | valid | 12 | - | - | cap-128-classic9-nightmare |
| R5 | 256 | classic9 nightmare | valid | 12 | - | - | cap-256-classic9-nightmare |
| R5 | none | classic9 nightmare | valid | 12 | - | - | cap-none-classic9-nightmare |
| R5 | 64 | killer hard | valid | 12 | - | - | cap-64-killer-hard |
| R5 | 128 | killer hard | valid | 12 | - | - | cap-128-killer-hard |
| R5 | 256 | killer hard | valid | 12 | - | - | cap-256-killer-hard |
| R5 | none | killer hard | valid | 12 | - | - | cap-none-killer-hard |
| R5 | 64 | killer expert | valid | 12 | - | - | cap-64-killer-expert-0-6, cap-64-killer-expert-6-6 |
| R5 | 128 | killer expert | valid | 12 | - | - | cap-128-killer-expert-0-6, cap-128-killer-expert-6-6 |
| R5 | 256 | killer expert | valid | 12 | - | - | cap-256-killer-expert-0-6, cap-256-killer-expert-6-6 |
| R5 | none | killer expert | valid | 12 | - | - | cap-none-killer-expert-0-6, cap-none-killer-expert-6-6 |
| R5 | 64 | jigsaw9 expert | valid | 12 | - | - | cap-64-jigsaw9-expert |
| R5 | 128 | jigsaw9 expert | valid | 12 | - | - | cap-128-jigsaw9-expert |
| R5 | 256 | jigsaw9 expert | valid | 12 | - | - | cap-256-jigsaw9-expert |
| R5 | none | jigsaw9 expert | valid | 12 | - | - | cap-none-jigsaw9-expert |
| R9 | C4 | classic9 nightmare | valid | 12 | - | - | window-4-classic9-nightmare |
| R9 | C6 | classic9 nightmare | valid | 12 | - | - | window-6-classic9-nightmare-0-6, window-6-classic9-nightmare-6-6 |
| R9 | C4 | diagonalX nightmare | valid | 12 | - | - | window-4-diagonalX-nightmare |
| R9 | C6 | diagonalX nightmare | valid | 12 | - | - | window-6-diagonalX-nightmare-0-4, window-6-diagonalX-nightmare-4-4, window-6-diagonalX-nightmare-8-4 |
| R9 | C4 | jigsaw9 nightmare | valid | 12 | - | - | window-4-jigsaw9-nightmare |
| R9 | C6 | jigsaw9 nightmare | valid | 12 | - | - | window-6-jigsaw9-nightmare-0-1, window-6-jigsaw9-nightmare-1-2, window-6-jigsaw9-nightmare-3-2, window-6-jigsaw9-nightmare-5-1, window-6-jigsaw9-nightmare-6-2, window-6-jigsaw9-nightmare-8-2, window-6-jigsaw9-nightmare-10-1, window-6-jigsaw9-nightmare-11-1 |

Identity (every ledger): source `85537bbd28702233722e448d36d87f5faf445ca25668b1926e8ffb22f4b93c3a`, tool `efff9dcd558e04dc17df7ba0a5778da35006b116d8ebca2bcda248ff3012b3c7`, Node v26.13.0, rating version 3; expected `85537bbd2870` / `efff9dcd558e`; machine AMD EPYC 7763 64-Core Processor x16.

Commits of the ledgers: `393775a1` (44 ledgers); dirty flags: true (pack-only commits and this task's evidence and helper files; nothing in a fingerprint changed).

| Entry | Status | Requests | summary.checks | Payload | Transcript (the started attempt) | Ledger |
|---|---|---:|---:|---:|---:|---:|
| cap-256-classic9-normal | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-256-classic9-normal.txt` | `cap-256\classic9-normal.json` |
| cap-256-classic9-master | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-256-classic9-master.txt` | `cap-256\classic9-master.json` |
| cap-256-classic9-nightmare | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-256-classic9-nightmare.txt` | `cap-256\classic9-nightmare.json` |
| cap-256-killer-hard | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-256-killer-hard.txt` | `cap-256\killer-hard.json` |
| cap-256-killer-expert-0-6 | valid | 0-5 | PASS | exit 0, PASS | `logs\cap-256-killer-expert-0-6.txt` | `cap-256\shards\killer-expert-0-6.json` |
| cap-256-killer-expert-6-6 | valid | 6-11 | PASS | exit 0, PASS | `logs\cap-256-killer-expert-6-6.txt` | `cap-256\shards\killer-expert-6-6.json` |
| cap-256-jigsaw9-expert | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-256-jigsaw9-expert.txt` | `cap-256\jigsaw9-expert.json` |
| cap-64-classic9-normal | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-64-classic9-normal.txt` | `cap-64\classic9-normal.json` |
| cap-64-classic9-master | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-64-classic9-master.txt` | `cap-64\classic9-master.json` |
| cap-64-classic9-nightmare | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-64-classic9-nightmare.txt` | `cap-64\classic9-nightmare.json` |
| cap-64-killer-hard | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-64-killer-hard.txt` | `cap-64\killer-hard.json` |
| cap-64-killer-expert-0-6 | valid | 0-5 | PASS | exit 0, PASS | `logs\cap-64-killer-expert-0-6.txt` | `cap-64\shards\killer-expert-0-6.json` |
| cap-64-killer-expert-6-6 | valid | 6-11 | PASS | exit 0, PASS | `logs\cap-64-killer-expert-6-6.txt` | `cap-64\shards\killer-expert-6-6.json` |
| cap-64-jigsaw9-expert | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-64-jigsaw9-expert.txt` | `cap-64\jigsaw9-expert.json` |
| cap-128-classic9-normal | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-128-classic9-normal.txt` | `cap-128\classic9-normal.json` |
| cap-128-classic9-master | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-128-classic9-master.txt` | `cap-128\classic9-master.json` |
| cap-128-classic9-nightmare | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-128-classic9-nightmare.txt` | `cap-128\classic9-nightmare.json` |
| cap-128-killer-hard | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-128-killer-hard.txt` | `cap-128\killer-hard.json` |
| cap-128-killer-expert-0-6 | valid | 0-5 | PASS | exit 0, PASS | `logs\cap-128-killer-expert-0-6.txt` | `cap-128\shards\killer-expert-0-6.json` |
| cap-128-killer-expert-6-6 | valid | 6-11 | PASS | exit 0, PASS | `logs\cap-128-killer-expert-6-6.txt` | `cap-128\shards\killer-expert-6-6.json` |
| cap-128-jigsaw9-expert | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-128-jigsaw9-expert.txt` | `cap-128\jigsaw9-expert.json` |
| cap-none-classic9-normal | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-none-classic9-normal.txt` | `cap-none\classic9-normal.json` |
| cap-none-classic9-master | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-none-classic9-master.txt` | `cap-none\classic9-master.json` |
| cap-none-classic9-nightmare | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-none-classic9-nightmare.txt` | `cap-none\classic9-nightmare.json` |
| cap-none-killer-hard | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-none-killer-hard.txt` | `cap-none\killer-hard.json` |
| cap-none-killer-expert-0-6 | valid | 0-5 | PASS | exit 0, PASS | `logs\cap-none-killer-expert-0-6.txt` | `cap-none\shards\killer-expert-0-6.json` |
| cap-none-killer-expert-6-6 | valid | 6-11 | PASS | exit 0, PASS | `logs\cap-none-killer-expert-6-6.txt` | `cap-none\shards\killer-expert-6-6.json` |
| cap-none-jigsaw9-expert | valid | 0-11 | PASS | exit 0, PASS | `logs\cap-none-jigsaw9-expert.txt` | `cap-none\jigsaw9-expert.json` |
| window-4-classic9-nightmare | valid | 0-11 | PASS | exit 0, PASS | `logs\window-4-classic9-nightmare.txt` | `window-4\classic9-nightmare.json` |
| window-4-diagonalX-nightmare | valid | 0-11 | PASS | exit 0, PASS | `logs\window-4-diagonalX-nightmare.txt` | `window-4\diagonalX-nightmare.json` |
| window-4-jigsaw9-nightmare | valid | 0-11 | PASS | exit 0, PASS | `logs\window-4-jigsaw9-nightmare.txt` | `window-4\jigsaw9-nightmare.json` |
| window-6-classic9-nightmare-0-6 | valid | 0-5 | PASS | exit 0, PASS | `logs\window-6-classic9-nightmare-0-6.txt` | `window-6\shards\classic9-nightmare-0-6.json` |
| window-6-classic9-nightmare-6-6 | valid | 6-11 | PASS | exit 0, PASS | `logs\window-6-classic9-nightmare-6-6.txt` | `window-6\shards\classic9-nightmare-6-6.json` |
| window-6-diagonalX-nightmare-0-4 | valid | 0-3 | PASS | exit 0, PASS | `logs\window-6-diagonalX-nightmare-0-4.txt` | `window-6\shards\diagonalX-nightmare-0-4.json` |
| window-6-diagonalX-nightmare-4-4 | valid | 4-7 | PASS | exit 0, PASS | `logs\window-6-diagonalX-nightmare-4-4.txt` | `window-6\shards\diagonalX-nightmare-4-4.json` |
| window-6-diagonalX-nightmare-8-4 | valid | 8-11 | PASS | exit 0, PASS | `logs\window-6-diagonalX-nightmare-8-4.txt` | `window-6\shards\diagonalX-nightmare-8-4.json` |
| window-6-jigsaw9-nightmare-0-1 | valid | 0-0 | PASS | exit 0, PASS | `logs\window-6-jigsaw9-nightmare-0-1.txt` | `window-6\shards\jigsaw9-nightmare-0-1.json` |
| window-6-jigsaw9-nightmare-1-2 | valid | 1-2 | PASS | exit 0, PASS | `logs\window-6-jigsaw9-nightmare-1-2.txt` | `window-6\shards\jigsaw9-nightmare-1-2.json` |
| window-6-jigsaw9-nightmare-3-2 | valid | 3-4 | PASS | exit 0, PASS | `logs\window-6-jigsaw9-nightmare-3-2.txt` | `window-6\shards\jigsaw9-nightmare-3-2.json` |
| window-6-jigsaw9-nightmare-5-1 | valid | 5-5 | PASS | exit 0, PASS | `logs\window-6-jigsaw9-nightmare-5-1.txt` | `window-6\shards\jigsaw9-nightmare-5-1.json` |
| window-6-jigsaw9-nightmare-6-2 | valid | 6-7 | PASS | exit 0, PASS | `logs\window-6-jigsaw9-nightmare-6-2.txt` | `window-6\shards\jigsaw9-nightmare-6-2.json` |
| window-6-jigsaw9-nightmare-8-2 | valid | 8-9 | PASS | exit 0, PASS | `logs\window-6-jigsaw9-nightmare-8-2.txt` | `window-6\shards\jigsaw9-nightmare-8-2.json` |
| window-6-jigsaw9-nightmare-10-1 | valid | 10-10 | PASS | exit 0, PASS | `logs\window-6-jigsaw9-nightmare-10-1.txt` | `window-6\shards\jigsaw9-nightmare-10-1.json` |
| window-6-jigsaw9-nightmare-11-1 | valid | 11-11 | PASS | exit 0, PASS | `logs\window-6-jigsaw9-nightmare-11-1.txt` | `window-6\shards\jigsaw9-nightmare-11-1.json` |


## 2. R5: the 24-row table (12 requests per row)

| Setting | Cell | Exact | In band / shallow / errors | Upper median full ratings (index 6) | Full ratings (sum) | Attempts | Local searches: ended by allowance / proposal cap / rating cap / natural | Generation s (sum; descriptive) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 64 | classic9 normal | 10/12 | 12 / 2 / 0 | 66 | 1336 | 37 (max 8) | 27: 3 / 24 / 0 / 0 | 3.19 |
| 64 | classic9 master | 12/12 | 12 / 0 / 0 | 4 | 47 | 12 (max 1) | 0: 0 / 0 / 0 / 0 | 1.20 |
| 64 | classic9 nightmare | 11/12 | 12 / 1 / 0 | 49 | 1939 | 29 (max 8) | 21: 13 / 5 / 0 / 3 | 17.71 |
| 64 | killer hard | 0/12 | 12 / 12 / 0 | 503 | 6095 | 96 (max 8) | 96: 29 / 67 / 0 / 0 | 58.48 |
| 64 | killer expert | 0/12 | 12 / 12 / 0 | 2255 | 25168 | 96 (max 8) | 96: 16 / 80 / 0 / 0 | 239.22 |
| 64 | jigsaw9 expert | 11/12 | 12 / 1 / 0 | 434 | 4150 | 62 (max 8) | 57: 46 / 5 / 0 / 6 | 51.56 |
| 128 | classic9 normal | 10/12 | 12 / 2 / 0 | 66 | 1528 | 37 (max 8) | 27: 3 / 24 / 0 / 0 | 3.22 |
| 128 | classic9 master | 12/12 | 12 / 0 / 0 | 4 | 47 | 12 (max 1) | 0: 0 / 0 / 0 / 0 | 1.19 |
| 128 | classic9 nightmare | 12/12 | 12 / 0 / 0 | 49 | 1706 | 21 (max 5) | 14: 4 / 5 / 0 / 5 | 13.38 |
| 128 | killer hard | 0/12 | 12 / 12 / 0 | 570 | 7059 | 96 (max 8) | 96: 9 / 87 / 0 / 0 | 63.74 |
| 128 | killer expert | 0/12 | 12 / 12 / 0 | 2314 | 25742 | 96 (max 8) | 96: 4 / 92 / 0 / 0 | 243.61 |
| 128 | jigsaw9 expert | 11/12 | 12 / 1 / 0 | 754 | 6683 | 61 (max 8) | 57: 36 / 14 / 0 / 7 | 63.50 |
| 256 | classic9 normal | 11/12 | 12 / 1 / 0 | 66 | 1752 | 36 (max 8) | 26: 2 / 23 / 0 / 1 | 3.22 |
| 256 | classic9 master | 12/12 | 12 / 0 / 0 | 4 | 47 | 12 (max 1) | 0: 0 / 0 / 0 / 0 | 1.19 |
| 256 | classic9 nightmare | 12/12 | 12 / 0 / 0 | 49 | 2078 | 21 (max 5) | 14: 1 / 8 / 0 / 5 | 14.65 |
| 256 | killer hard | 0/12 | 12 / 12 / 0 | 581 | 7525 | 96 (max 8) | 96: 1 / 95 / 0 / 0 | 64.75 |
| 256 | killer expert | 0/12 | 12 / 12 / 0 | 2314 | 26003 | 96 (max 8) | 96: 1 / 95 / 0 / 0 | 243.60 |
| 256 | jigsaw9 expert | 11/12 | 12 / 1 / 0 | 1104 | 9882 | 61 (max 8) | 57: 13 / 37 / 0 / 7 | 83.51 |
| none | classic9 normal | 11/12 | 12 / 1 / 0 | 66 | 2326 | 36 (max 8) | 26: 0 / 25 / 0 / 1 | 3.63 |
| none | classic9 master | 12/12 | 12 / 0 / 0 | 4 | 47 | 12 (max 1) | 0: 0 / 0 / 0 / 0 | 1.16 |
| none | classic9 nightmare | 12/12 | 12 / 0 / 0 | 49 | 2239 | 21 (max 5) | 14: 0 / 9 / 0 / 5 | 14.89 |
| none | killer hard | 0/12 | 12 / 12 / 0 | 581 | 7545 | 96 (max 8) | 96: 0 / 96 / 0 / 0 | 65.47 |
| none | killer expert | 0/12 | 12 / 12 / 0 | 2314 | 26049 | 96 (max 8) | 96: 0 / 96 / 0 / 0 | 244.56 |
| none | jigsaw9 expert | 11/12 | 12 / 1 / 0 | 1215 | 11449 | 61 (max 8) | 57: 0 / 50 / 0 / 7 | 93.40 |

Upper median: sorted index 6 of the twelve `row.fullRatings` (all requests, all attempts, error rows with their work; not the exact-only cohort). "Allowance" is the shallow allowance of the setting (none: it cannot end a search). Generation seconds are of "shared-slot, CLI-host-active; not strict-quiet-machine timing".

### Cap 64 against none

| Cell | none exact | cap 64 exact | Difference | Hit loss | none median | cap median | Strict reduction | Exact at none, not at the cap (indexes) | Exact at the cap, not at none |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| classic9 normal | 11 | 10 | -1 | **yes** | 66 | 66 | no | 11 | - |
| classic9 master | 12 | 12 | 0 | no | 4 | 4 | no | - | - |
| classic9 nightmare | 12 | 11 | -1 | **yes** | 49 | 49 | no | 2 | - |
| killer hard | 0 | 0 | 0 | no | 581 | 503 | **yes** (581 -> 503) | - | - |
| killer expert | 0 | 0 | 0 | no | 2314 | 2255 | **yes** (2314 -> 2255) | - | - |
| jigsaw9 expert | 11 | 11 | 0 | no | 1215 | 434 | **yes** (1215 -> 434) | - | - |

Eligibility of cap 64: **not eligible**; hit-loss cells: classic9 normal, classic9 nightmare; reduction witness(es): killer hard 581 -> 503; killer expert 2314 -> 2255; jigsaw9 expert 1215 -> 434; matched losses 2, matched gains 0 (request level, against none).

### Cap 128 against none

| Cell | none exact | cap 128 exact | Difference | Hit loss | none median | cap median | Strict reduction | Exact at none, not at the cap (indexes) | Exact at the cap, not at none |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| classic9 normal | 11 | 10 | -1 | **yes** | 66 | 66 | no | 11 | - |
| classic9 master | 12 | 12 | 0 | no | 4 | 4 | no | - | - |
| classic9 nightmare | 12 | 12 | 0 | no | 49 | 49 | no | - | - |
| killer hard | 0 | 0 | 0 | no | 581 | 570 | **yes** (581 -> 570) | - | - |
| killer expert | 0 | 0 | 0 | no | 2314 | 2314 | no | - | - |
| jigsaw9 expert | 11 | 11 | 0 | no | 1215 | 754 | **yes** (1215 -> 754) | - | - |

Eligibility of cap 128: **not eligible**; hit-loss cells: classic9 normal; reduction witness(es): killer hard 581 -> 570; jigsaw9 expert 1215 -> 754; matched losses 1, matched gains 0 (request level, against none).

### Cap 256 against none

| Cell | none exact | cap 256 exact | Difference | Hit loss | none median | cap median | Strict reduction | Exact at none, not at the cap (indexes) | Exact at the cap, not at none |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| classic9 normal | 11 | 11 | 0 | no | 66 | 66 | no | - | - |
| classic9 master | 12 | 12 | 0 | no | 4 | 4 | no | - | - |
| classic9 nightmare | 12 | 12 | 0 | no | 49 | 49 | no | - | - |
| killer hard | 0 | 0 | 0 | no | 581 | 581 | no | - | - |
| killer expert | 0 | 0 | 0 | no | 2314 | 2314 | no | - | - |
| jigsaw9 expert | 11 | 11 | 0 | no | 1215 | 1104 | **yes** (1215 -> 1104) | - | - |

Eligibility of cap 256: **eligible**; hit-loss cells: none; reduction witness(es): jigsaw9 expert 1215 -> 1104; matched losses 0, matched gains 0 (request level, against none).

**R5 result:** eligible finite caps: 256; the rule winner (smallest eligible, else none) is **256**; in force **256**; disposition **same**.


## 3. C: the 6-row table (12 requests per row)

| Cutoff | Cell | Exact | In band / shallow / errors | Upper median full ratings | Full ratings (sum) | Attempts | Local searches: ended by allowance / proposal cap / rating cap / natural | Generation s (sum; descriptive) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| C4 | classic9 nightmare | 12/12 | 12 / 0 / 0 | 49 | 2078 | 21 (max 5) | 14: 1 / 8 / 0 / 5 | 15.23 |
| C4 | diagonalX nightmare | 12/12 | 12 / 0 / 0 | 34 | 637 | 12 (max 1) | 1: 0 / 0 / 0 / 1 | 20.20 |
| C4 | jigsaw9 nightmare | 12/12 | 12 / 0 / 0 | 297 | 3689 | 28 (max 5) | 20: 4 / 12 / 0 / 4 | 103.86 |
| C6 | classic9 nightmare | 2/12 | 12 / 10 / 0 | 1343 | 15932 | 89 (max 8) | 87: 25 / 62 / 0 / 0 | 77.22 |
| C6 | diagonalX nightmare | 12/12 | 12 / 0 / 0 | 55 | 2327 | 18 (max 3) | 12: 3 / 3 / 0 / 6 | 70.11 |
| C6 | jigsaw9 nightmare | 6/12 | 12 / 6 / 0 | 1859 | 18604 | 83 (max 8) | 78: 45 / 32 / 0 / 1 | 378.78 |

Totals over the three cells: C4 **36/36**, C6 **20/36**. Rule (more exact hits wins; C6 on any tie): C4 has more exact hits. Rule winner **C4**, in force C4, disposition **same**.


## 4. Disposition of each choice

| Choice | In force | Rule winner | Disposition |
|---|---|---:|---:|
| R5 shallow allowance | 256 | 256 | same |
| C short-chain cutoff | C4 | C4 | same |

**Milestone status: reconfirmed (256 / C4).** The one-factor results prove nothing about the joint behavior of two changed defaults. Both experiments ran under the unchanged production defaults 256 / C4: the winner of one was never installed for the other, and no combined pair was tested.


## 5. Admission and attempts (MS18b-host-active; the strict screen is kept unchanged)

Entries of the plan: **44**; commands executed (payload started): **44**; admission attempt records: **44**; holds (admitted false): **0**; entries re-asked: **0**; unexecuted gaps after two holds: **0**; held once and not yet re-asked: 0; not run: 0. Raw strict screen of the executed commands: **40 failed, 4 passed** (mean <= 0.5 and max <= 1.0 busy cores of the logical CPUs). Admission was decided separately by the named policy (the confirmed host PID 1968 only, no other process at 0.5 CPU-s per second or more over the snapshot window, locks, valid counters); no CPU was subtracted and no failed screen was turned into a pass. Timing label for every command: **shared-slot, CLI-host-active; not strict-quiet-machine timing**.

| Attempt record | Strict screen | Mean / max busy cores | Admission | Host PID 1968 CPU-s | Busiest other process | Payload start-end | Payload s | Exit | Lock wait s | Foreign lock |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cap-256-classic9-normal | passed | 0.435 / 0.531 | admitted | 0.89 (0.155/s) | MsMpEng.exe 0.046/s | 19:46:23-19:46:27 | 4.3 | 0 | 0.1 | none seen |
| cap-256-classic9-master | FAILED | 0.594 / 0.888 | admitted | 1.00 (0.174/s) | MsMpEng.exe 0.128/s | 19:46:49-19:46:52 | 2.1 | 0 | 0.1 | none seen |
| cap-256-classic9-nightmare | FAILED | 0.637 / 1.067 | admitted | 0.92 (0.161/s) | MsMpEng.exe 0.126/s | 19:47:14-19:47:33 | 19.3 | 0 | 0.1 | none seen |
| cap-256-killer-hard | FAILED | 1.669 / 2.164 | admitted | 0.86 (0.150/s) | WmiPrvSE.exe 0.308/s | 19:47:56-19:49:17 | 81.2 | 0 | 0.1 | none seen |
| cap-256-killer-expert-0-6 | FAILED | 0.903 / 2.091 | admitted | 0.98 (0.171/s) | MsMpEng.exe 0.272/s | 19:49:39-19:52:19 | 159.5 | 0 | 0.1 | none seen |
| cap-256-killer-expert-6-6 | FAILED | 0.960 / 1.518 | admitted | 1.75 (0.306/s) | MsMpEng.exe 0.232/s | 19:52:41-19:55:04 | 142.8 | 0 | 0.1 | none seen |
| cap-256-jigsaw9-expert | FAILED | 0.599 / 0.991 | admitted | 0.86 (0.150/s) | MsMpEng.exe 0.158/s | 19:55:27-19:57:05 | 97.8 | 0 | 0.1 | none seen |
| cap-64-classic9-normal | FAILED | 0.667 / 1.371 | admitted | 0.84 (0.147/s) | MsMpEng.exe 0.054/s | 20:01:24-20:01:29 | 4.3 | 0 | 0.1 | none seen |
| cap-64-classic9-master | FAILED | 0.602 / 0.960 | admitted | 0.84 (0.146/s) | MsMpEng.exe 0.149/s | 20:01:51-20:01:53 | 2.2 | 0 | 0.1 | none seen |
| cap-64-classic9-nightmare | FAILED | 0.710 / 1.120 | admitted | 1.08 (0.188/s) | MsMpEng.exe 0.210/s | 20:02:16-20:02:37 | 21.9 | 0 | 0.1 | none seen |
| cap-64-killer-hard | FAILED | 0.716 / 1.424 | admitted | 0.81 (0.142/s) | MsMpEng.exe 0.227/s | 20:03:00-20:04:13 | 73.0 | 0 | 0.1 | none seen |
| cap-64-killer-expert-0-6 | FAILED | 0.723 / 1.390 | admitted | 0.86 (0.149/s) | MsMpEng.exe 0.201/s | 20:04:35-20:07:13 | 157.8 | 0 | 0.1 | none seen |
| cap-64-killer-expert-6-6 | FAILED | 0.634 / 1.139 | admitted | 0.89 (0.155/s) | MsMpEng.exe 0.191/s | 20:07:35-20:09:55 | 139.3 | 0 | 0.1 | none seen |
| cap-64-jigsaw9-expert | FAILED | 0.608 / 0.966 | admitted | 0.92 (0.161/s) | MsMpEng.exe 0.142/s | 20:10:18-20:11:19 | 61.2 | 0 | 0.1 | none seen |
| cap-128-classic9-normal | FAILED | 0.622 / 1.071 | admitted | 0.94 (0.163/s) | MsMpEng.exe 0.166/s | 20:11:41-20:11:46 | 4.3 | 0 | 0.1 | none seen |
| cap-128-classic9-master | FAILED | 0.755 / 1.401 | admitted | 0.84 (0.146/s) | MsMpEng.exe 0.211/s | 20:12:08-20:12:10 | 2.2 | 0 | 0.1 | none seen |
| cap-128-classic9-nightmare | FAILED | 0.825 / 1.321 | admitted | 0.94 (0.163/s) | MsMpEng.exe 0.191/s | 20:12:33-20:12:50 | 17.5 | 0 | 0.1 | none seen |
| cap-128-killer-hard | passed | 0.477 / 0.999 | admitted | 0.83 (0.145/s) | MsMpEng.exe 0.148/s | 20:13:13-20:14:32 | 79.7 | 0 | 0.1 | none seen |
| cap-128-killer-expert-0-6 | FAILED | 1.039 / 1.762 | admitted | 2.06 (0.360/s) | MsMpEng.exe 0.210/s | 20:14:55-20:17:34 | 159.4 | 0 | 0.1 | none seen |
| cap-128-killer-expert-6-6 | FAILED | 0.592 / 0.848 | admitted | 0.98 (0.171/s) | MsMpEng.exe 0.130/s | 20:17:56-20:20:20 | 143.2 | 0 | 0.1 | none seen |
| cap-128-jigsaw9-expert | FAILED | 0.957 / 1.525 | admitted | 1.95 (0.340/s) | MsMpEng.exe 0.150/s | 20:20:42-20:21:57 | 74.5 | 0 | 0.1 | none seen |
| cap-none-classic9-normal | FAILED | 0.548 / 0.748 | admitted | 0.81 (0.142/s) | MsMpEng.exe 0.049/s | 20:22:19-20:22:24 | 4.9 | 0 | 0.1 | none seen |
| cap-none-classic9-master | FAILED | 0.714 / 1.271 | admitted | 0.84 (0.147/s) | MsMpEng.exe 0.171/s | 20:22:46-20:22:48 | 2.1 | 0 | 0.1 | none seen |
| cap-none-classic9-nightmare | FAILED | 0.580 / 1.016 | admitted | 0.75 (0.131/s) | MsMpEng.exe 0.150/s | 20:23:11-20:23:30 | 19.5 | 0 | 0.1 | none seen |
| cap-none-killer-hard | FAILED | 0.640 / 1.301 | admitted | 0.77 (0.133/s) | MsMpEng.exe 0.196/s | 20:23:53-20:25:15 | 82.2 | 0 | 0.1 | none seen |
| cap-none-killer-expert-0-6 | FAILED | 0.718 / 1.085 | admitted | 0.97 (0.169/s) | MsMpEng.exe 0.166/s | 20:25:37-20:28:18 | 160.5 | 0 | 0.1 | none seen |
| cap-none-killer-expert-6-6 | FAILED | 0.814 / 1.278 | admitted | 1.80 (0.313/s) | MsMpEng.exe 0.174/s | 20:28:40-20:31:03 | 142.8 | 0 | 0.1 | none seen |
| cap-none-jigsaw9-expert | FAILED | 1.021 / 1.139 | admitted | 0.86 (0.149/s) | SenseTracer.exe 0.231/s | 20:31:25-20:33:14 | 108.8 | 0 | 0.1 | none seen |
| window-4-classic9-nightmare | FAILED | 0.743 / 2.087 | admitted | 2.05 (0.356/s) | MsMpEng.exe 0.152/s | 19:57:27-19:57:47 | 20.0 | 0 | 0.1 | none seen |
| window-4-diagonalX-nightmare | FAILED | 0.790 / 1.398 | admitted | 1.81 (0.317/s) | MsMpEng.exe 0.164/s | 19:58:10-19:58:37 | 27.1 | 0 | 0.1 | none seen |
| window-4-jigsaw9-nightmare | FAILED | 0.598 / 0.925 | admitted | 0.86 (0.151/s) | MsMpEng.exe 0.156/s | 19:58:59-20:01:02 | 122.8 | 0 | 0.1 | none seen |
| window-6-classic9-nightmare-0-6 | FAILED | 0.626 / 0.948 | admitted | 1.27 (0.220/s) | MsMpEng.exe 0.112/s | 20:33:39-20:34:35 | 55.6 | 0 | 0.1 | none seen |
| window-6-classic9-nightmare-6-6 | FAILED | 1.044 / 1.765 | admitted | 1.97 (0.342/s) | MsMpEng.exe 0.179/s | 20:34:57-20:35:38 | 41.0 | 0 | 0.1 | none seen |
| window-6-diagonalX-nightmare-0-4 | FAILED | 0.738 / 1.027 | admitted | 0.81 (0.142/s) | MsMpEng.exe 0.170/s | 20:36:00-20:36:28 | 27.3 | 0 | 0.1 | none seen |
| window-6-diagonalX-nightmare-4-4 | FAILED | 0.537 / 1.114 | admitted | 0.98 (0.171/s) | MsMpEng.exe 0.139/s | 20:36:50-20:37:13 | 22.8 | 0 | 0.1 | none seen |
| window-6-diagonalX-nightmare-8-4 | FAILED | 0.626 / 1.040 | admitted | 0.86 (0.150/s) | MsMpEng.exe 0.158/s | 20:37:35-20:38:16 | 40.3 | 0 | 0.1 | none seen |
| window-6-jigsaw9-nightmare-0-1 | FAILED | 0.674 / 1.318 | admitted | 0.91 (0.158/s) | MsMpEng.exe 0.191/s | 20:38:38-20:39:44 | 65.7 | 0 | 0.1 | none seen |
| window-6-jigsaw9-nightmare-1-2 | FAILED | 0.807 / 2.272 | admitted | 1.69 (0.295/s) | MsMpEng.exe 0.164/s | 20:40:07-20:41:26 | 79.7 | 0 | 0.1 | none seen |
| window-6-jigsaw9-nightmare-3-2 | passed | 0.497 / 0.829 | admitted | 0.69 (0.121/s) | MsMpEng.exe 0.154/s | 20:41:49-20:42:56 | 67.8 | 0 | 0.1 | none seen |
| window-6-jigsaw9-nightmare-5-1 | FAILED | 0.666 / 1.150 | admitted | 0.91 (0.158/s) | MsMpEng.exe 0.169/s | 20:43:19-20:44:46 | 87.4 | 0 | 0.1 | none seen |
| window-6-jigsaw9-nightmare-6-2 | FAILED | 2.272 / 3.420 | admitted | 1.92 (0.334/s) | TiWorker.exe 0.348/s | 20:45:09-20:45:48 | 39.0 | 0 | 0.1 | none seen |
| window-6-jigsaw9-nightmare-8-2 | FAILED | 3.258 / 4.091 | admitted | 5.42 (0.942/s) | MsMpEng.exe 0.470/s | 20:46:10-20:47:24 | 74.2 | 0 | 0.1 | none seen |
| window-6-jigsaw9-nightmare-10-1 | FAILED | 0.588 / 1.338 | admitted | 1.00 (0.174/s) | MsMpEng.exe 0.166/s | 20:47:47-20:48:10 | 23.0 | 0 | 0.1 | none seen |
| window-6-jigsaw9-nightmare-11-1 | passed | 0.444 / 0.937 | admitted | 0.67 (0.117/s) | MsMpEng.exe 0.134/s | 20:48:32-20:49:06 | 34.0 | 0 | 0.1 | none seen |

Payload seconds of the executed commands: **2795.7 s** in 44 commands (readiness 316.4 s, kept separately). Descriptive, "shared-slot, CLI-host-active; not strict-quiet-machine timing".

Informational reproduction check against MS18a (same source, same requests, the default settings): the shallow-allowance 256 rows give the same puzzle hash as MS18a in 72 of 72 requests (same exact flag in 72); the C4 rows in 36 of 36 (same exact flag in 36). It is a disclosure, not a check.


## 6. Reporter checks

145 checks, 0 failed.

