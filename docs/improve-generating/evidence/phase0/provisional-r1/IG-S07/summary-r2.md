# IG-S07 task summary (provisional-r1): SM1 stage and finder profiles

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Revision `summary-r2`: Revision r2 (the pack author's review of r1): the S3 figures are relabelled conditional zero-cost scenarios (r1 called some of them ceilings of a full S3); the bias-adjusted column is dropped; the r1 budget-check totals are marked inexact (loop-check boundaries; the propagation checks of nishio and forcingChain that ctx.check does not see); the loop-check comparison ran on the real engine (shard lc); the fingerprints of the run, the r1 report, the fixed harness and this report are kept apart; the $env:TEMP slip is disclosed. The r1 documents and every record are kept, and the nine profile commands were not rerun.

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**. The profile is wall-clock time of one instrumented native request: an attribution run, not a timing run. Finder and apply times include the cost of their own timers (estimated in overhead.json).

## Coverage

| planned requests | started | complete | censored | errors | unstarted | profiled complete |
|---|---|---|---|---|---|---|
| 12 | 12 | 12 | 0 | 0 | 0 | 9 |

| shard | status | attempts |
|---|---|---|
| c9 | recorded | a1 |
| m16 | recorded | a1 |
| m12 | recorded | a1 |
| sam | recorded | a1 |
| killer-n | recorded | a1 |
| gt-n | recorded | a1 |
| killer-h | recorded | a1 |
| killer-e | recorded | a1 |
| gt-normal | recorded | a1 |
| lc | recorded | a1 |

Identity of every profiled output against its unprofiled comparator (every digest section, exactness): 9 ok, 0 failed, 0 not comparable.

## Where the time goes: sample, local continuation, other

Wall shares of the profiled request (sample = ordinary + proposal; local = the local-continuation sample; other = setup, full grids, extra structure, restart loop). The report anchor for mega16 is samples ~90 %, local ~10 %.

| request | profiled root s | sample | local | other | ordinary | proposal | report anchor | assumed bottleneck |
|---|---|---|---|---|---|---|---|---|
| classic9 nightmare 3 | 5.79 | 60.3 % | 39.6 % | 0.1 % | 56.9 % | 3.3 % | none | no anchor |
| mega16 nightmare 3 | 106.68 | 90.5 % | 9.5 % | 0.0 % | 85.3 % | 5.2 % | 90 / 10 | holds (samples 90.5 % of sample + local) |
| mega12 nightmare 3 | 24.38 | 83.5 % | 16.4 % | 0.0 % | 79.2 % | 4.3 % | none | no anchor |
| samurai nightmare 42 | 22.42 | 72.8 % | 27.2 % | 0.1 % | 58.3 % | 14.4 % | none | no anchor |
| killer nightmare 3 | 22.24 | 57.9 % | 19.3 % | 22.8 % | 8.9 % | 49.1 % | none | no anchor |
| greaterThan nightmare 3 | 12.42 | 57.0 % | 42.9 % | 0.1 % | 28.2 % | 28.8 % | none | no anchor |
| killer hard 1 | 6.19 | 50.5 % | 19.2 % | 30.3 % | 50.5 % | 0.0 % | none | no anchor |
| killer expert 1 | 11.75 | 34.4 % | 10.3 % | 55.3 % | 34.4 % | 0.0 % | none | no anchor |
| greaterThan normal 300 | 2.18 | 27.5 % | 72.1 % | 0.4 % | 27.5 % | 0.0 % | none | no anchor |

## Where the solver time goes (partition of the request, share of the profiled root)

| request | finders S3-covered | finders remaining | apply Findings | solver state/setup | solver loop | DFS | rating (classify) | grid generation | stage code + residual |
|---|---|---|---|---|---|---|---|---|---|
| classic9 nightmare 3 | 5.2 % | 64.3 % | 0.8 % | 0.9 % | 1.5 % | 3.3 % | 0.1 % | 0.0 % | 23.8 % |
| mega16 nightmare 3 | 3.9 % | 93.9 % | 0.1 % | 0.1 % | 0.2 % | 1.8 % | 0.0 % | 0.0 % | 0.1 % |
| mega12 nightmare 3 | 5.4 % | 90.1 % | 0.3 % | 0.3 % | 0.6 % | 1.7 % | 0.0 % | 0.0 % | 1.5 % |
| samurai nightmare 42 | 12.7 % | 76.7 % | 1.1 % | 0.6 % | 1.7 % | 6.4 % | 0.0 % | 0.0 % | 0.8 % |
| killer nightmare 3 | 8.5 % | 34.5 % | 1.1 % | 0.7 % | 2.6 % | 45.4 % | 0.1 % | 0.0 % | 7.0 % |
| greaterThan nightmare 3 | 7.3 % | 38.4 % | 0.5 % | 0.4 % | 1.5 % | 22.4 % | 0.0 % | 0.0 % | 29.5 % |
| killer hard 1 | 15.4 % | 19.0 % | 3.8 % | 2.0 % | 7.5 % | 33.9 % | 0.1 % | 0.0 % | 18.2 % |
| killer expert 1 | 15.3 % | 41.4 % | 2.1 % | 1.2 % | 4.9 % | 25.7 % | 0.2 % | 0.0 % | 9.3 % |
| greaterThan normal 300 | 6.6 % | 4.3 % | 1.0 % | 1.0 % | 2.2 % | 31.6 % | 0.1 % | 0.1 % | 53.2 % |

Inside the logical solver only (share of solver time):

| request | solver s | finders S3-covered | finders remaining | apply | state/setup | loop |
|---|---|---|---|---|---|---|
| classic9 nightmare 3 | 4.21 | 7.1 % | 88.5 % | 1.1 % | 1.2 % | 2.1 % |
| mega16 nightmare 3 | 104.64 | 3.9 % | 95.7 % | 0.1 % | 0.1 % | 0.2 % |
| mega12 nightmare 3 | 23.58 | 5.5 % | 93.2 % | 0.3 % | 0.3 % | 0.6 % |
| samurai nightmare 42 | 20.80 | 13.7 % | 82.6 % | 1.2 % | 0.7 % | 1.8 % |
| killer nightmare 3 | 10.55 | 17.9 % | 72.7 % | 2.4 % | 1.4 % | 5.5 % |
| greaterThan nightmare 3 | 5.97 | 15.2 % | 79.8 % | 1.1 % | 0.8 % | 3.1 % |
| killer hard 1 | 2.96 | 32.1 % | 39.8 % | 8.0 % | 4.3 % | 15.7 % |
| killer expert 1 | 7.63 | 23.6 % | 63.9 % | 3.2 % | 1.8 % | 7.5 % |
| greaterThan normal 300 | 0.33 | 43.6 % | 28.7 % | 6.7 % | 6.7 % | 14.2 % |

## Proposal against ordinary samples, and the local continuation

| request | kind | samples | total ms | mean ms | max ms | oracle calls (mean) | solves (mean) | finder ms (mean) | exact | shallow |
|---|---|---|---|---|---|---|---|---|---|---|
| classic9 nightmare 3 | ordinary | 48 | 3297 | 69 | 261 | 73 | 74 | 66 | 0 | 14 |
| classic9 nightmare 3 | proposal | 48 | 192 | 4 | 20 | 136 | 37 | 2 | 0 | 9 |
| classic9 nightmare 3 | local | 8 | 2293 | 287 | 505 | 754 | 131 | 96 | 0 | 8 |
| mega16 nightmare 3 | ordinary | 12 | 90973 | 7581 | 10837 | 152 | 153 | 7561 | 0 | 10 |
| mega16 nightmare 3 | proposal | 12 | 5542 | 462 | 951 | 270 | 39 | 335 | 0 | 12 |
| mega16 nightmare 3 | local | 2 | 10150 | 5075 | 5932 | 650 | 256 | 4776 | 0 | 2 |
| mega12 nightmare 3 | ordinary | 24 | 19307 | 804 | 1303 | 126 | 127 | 796 | 0 | 20 |
| mega12 nightmare 3 | proposal | 24 | 1055 | 44 | 96 | 234 | 62 | 36 | 0 | 23 |
| mega12 nightmare 3 | local | 4 | 4008 | 1002 | 1153 | 1037 | 222 | 827 | 0 | 4 |
| samurai nightmare 42 | ordinary | 12 | 13069 | 1089 | 2694 | 330 | 331 | 1050 | 0 | 9 |
| samurai nightmare 42 | proposal | 12 | 3240 | 270 | 614 | 633 | 185 | 199 | 0 | 9 |
| samurai nightmare 42 | local | 2 | 6092 | 3046 | 3417 | 1482 | 256 | 2525 | 0 | 2 |
| killer nightmare 3 | ordinary | 48 | 1970 | 41 | 116 | 197 | 198 | 31 | 0 | 8 |
| killer nightmare 3 | proposal | 48 | 10912 | 227 | 1540 | 390 | 190 | 63 | 0 | 16 |
| killer nightmare 3 | local | 8 | 4293 | 537 | 928 | 242 | 174 | 183 | 0 | 7 |
| greaterThan nightmare 3 | ordinary | 18 | 3507 | 195 | 584 | 159 | 106 | 155 | 0 | 3 |
| greaterThan nightmare 3 | proposal | 19 | 3575 | 188 | 636 | 161 | 107 | 151 | 1 | 7 |
| greaterThan nightmare 3 | local | 3 | 5328 | 1776 | 1850 | 9833 | 0 | 1 | 0 | 3 |
| killer hard 1 | ordinary | 96 | 3128 | 33 | 50 | 207 | 208 | 21 | 0 | 63 |
| killer hard 1 | local | 8 | 1188 | 148 | 194 | 52 | 52 | 19 | 0 | 6 |
| killer expert 1 | ordinary | 96 | 4047 | 42 | 114 | 200 | 201 | 22 | 0 | 24 |
| killer expert 1 | local | 8 | 1210 | 151 | 260 | 67 | 67 | 39 | 0 | 2 |
| greaterThan normal 300 | ordinary | 17 | 600 | 35 | 57 | 121 | 108 | 14 | 1 | 2 |
| greaterThan normal 300 | local | 1 | 1572 | 1572 | 1572 | 9892 | 2 | 0 | 0 | 1 |

A local-continuation row is one sample (the local search of an attempt), so its mean is its value; samples are only the observed ones (a request that ended by an error has no row for the interrupted sample). No sample probability is inferred from these totals.

## Stage detail (purpose, share of root, by primitive), each request's five largest stages

**classic9 nightmare 3**

| stage (purpose) | ms | share of root | oracle solves | canonical ratings | finders covered ms | finders remaining ms | apply ms | DFS ms | self ms |
|---|---|---|---|---|---|---|---|---|---|
| stageB.objective | 3337 | 57.6 % | 4107 | 0 | 156 | 3018 | 32 | 28 | 12 |
| local.search | 1326 | 22.9 % | 0 | 0 | 0 | 0 | 0 | 0 | 1326 |
| local.rating | 811 | 14.0 % | 0 | 1047 | 124 | 640 | 10 | 0 | 1 |
| local.unique | 155 | 2.7 % | 0 | 0 | 0 | 0 | 0 | 153 | 2 |
| stageA.oracle | 49 | 0.9 % | 1114 | 0 | 7 | 15 | 4 | 5 | 3 |

**mega16 nightmare 3**

| stage (purpose) | ms | share of root | oracle solves | canonical ratings | finders covered ms | finders remaining ms | apply ms | DFS ms | self ms |
|---|---|---|---|---|---|---|---|---|---|
| stageB.objective | 92105 | 86.3 % | 1340 | 0 | 2831 | 87756 | 37 | 1312 | 12 |
| local.rating | 9634 | 9.0 % | 0 | 512 | 971 | 8581 | 18 | 0 | 1 |
| refine | 2241 | 2.1 % | 0 | 71 | 183 | 2042 | 3 | 0 | 3 |
| proposal.rating | 1508 | 1.4 % | 0 | 12 | 86 | 1417 | 1 | 0 | 0 |
| local.unique | 478 | 0.4 % | 0 | 0 | 0 | 0 | 0 | 477 | 1 |

**mega12 nightmare 3**

| stage (purpose) | ms | share of root | oracle solves | canonical ratings | finders covered ms | finders remaining ms | apply ms | DFS ms | self ms |
|---|---|---|---|---|---|---|---|---|---|
| stageB.objective | 19537 | 80.1 % | 3477 | 0 | 816 | 18420 | 50 | 78 | 18 |
| local.rating | 3382 | 13.9 % | 0 | 887 | 398 | 2910 | 16 | 0 | 1 |
| local.unique | 317 | 1.3 % | 0 | 0 | 0 | 0 | 0 | 316 | 2 |
| proposal.rating | 316 | 1.3 % | 0 | 24 | 33 | 280 | 1 | 0 | 0 |
| local.search | 308 | 1.3 % | 0 | 0 | 0 | 0 | 0 | 0 | 308 |

**samurai nightmare 42**

| stage (purpose) | ms | share of root | oracle solves | canonical ratings | finders covered ms | finders remaining ms | apply ms | DFS ms | self ms |
|---|---|---|---|---|---|---|---|---|---|
| stageB.objective | 14436 | 64.4 % | 4894 | 0 | 1699 | 11633 | 198 | 494 | 25 |
| local.rating | 5152 | 23.0 % | 0 | 512 | 906 | 4144 | 29 | 0 | 1 |
| local.unique | 872 | 3.9 % | 0 | 0 | 0 | 0 | 0 | 871 | 1 |
| refine | 787 | 3.5 % | 0 | 29 | 94 | 684 | 2 | 0 | 2 |
| proposal.rating | 712 | 3.2 % | 0 | 12 | 69 | 640 | 1 | 0 | 0 |

**killer nightmare 3**

| stage (purpose) | ms | share of root | oracle solves | canonical ratings | finders covered ms | finders remaining ms | apply ms | DFS ms | self ms |
|---|---|---|---|---|---|---|---|---|---|
| stageB.objective | 9489 | 42.7 % | 16643 | 0 | 865 | 1506 | 181 | 6376 | 60 |
| step:extraStructure | 5036 | 22.7 % | 0 | 1303 | 441 | 3174 | 26 | 1064 | 239 |
| local.rating | 1585 | 7.1 % | 0 | 1392 | 353 | 1114 | 26 | 0 | 1 |
| local.unique | 1514 | 6.8 % | 0 | 0 | 0 | 0 | 0 | 1512 | 1 |
| proposal.rating | 1427 | 6.4 % | 0 | 48 | 52 | 1366 | 1 | 0 | 0 |

**greaterThan nightmare 3**

| stage (purpose) | ms | share of root | oracle solves | canonical ratings | finders covered ms | finders remaining ms | apply ms | DFS ms | self ms |
|---|---|---|---|---|---|---|---|---|---|
| step:dig | 7060 | 56.8 % | 3831 | 97 | 902 | 4747 | 67 | 563 | 544 |
| local.search | 3093 | 24.9 % | 0 | 0 | 0 | 0 | 0 | 0 | 3093 |
| local.unique | 2230 | 17.9 % | 0 | 0 | 0 | 0 | 0 | 2217 | 12 |
| proposal.rating | 18 | 0.1 % | 0 | 19 | 3 | 14 | 0 | 0 | 0 |
| request | 5 | 0.0 % | 0 | 0 | 0 | 0 | 0 | 0 | 5 |

**killer hard 1**

| stage (purpose) | ms | share of root | oracle solves | canonical ratings | finders covered ms | finders remaining ms | apply ms | DFS ms | self ms |
|---|---|---|---|---|---|---|---|---|---|
| stageB.objective | 2701 | 43.6 % | 17727 | 0 | 857 | 1040 | 218 | 0 | 54 |
| step:extraStructure | 1865 | 30.1 % | 0 | 0 | 0 | 0 | 0 | 1841 | 24 |
| local.search | 991 | 16.0 % | 0 | 0 | 0 | 0 | 0 | 0 | 991 |
| safety.count | 256 | 4.1 % | 0 | 0 | 0 | 0 | 0 | 256 | 0 |
| local.rating | 188 | 3.0 % | 0 | 419 | 58 | 97 | 10 | 0 | 0 |

**killer expert 1**

| stage (purpose) | ms | share of root | oracle solves | canonical ratings | finders covered ms | finders remaining ms | apply ms | DFS ms | self ms |
|---|---|---|---|---|---|---|---|---|---|
| step:extraStructure | 6481 | 55.1 % | 0 | 1251 | 713 | 3490 | 33 | 1863 | 251 |
| stageB.objective | 2806 | 23.9 % | 17082 | 0 | 908 | 1126 | 190 | 0 | 55 |
| safety.count | 1102 | 9.4 % | 0 | 0 | 0 | 0 | 0 | 1102 | 0 |
| local.search | 723 | 6.2 % | 0 | 0 | 0 | 0 | 0 | 0 | 723 |
| local.rating | 357 | 3.0 % | 0 | 534 | 120 | 191 | 11 | 0 | 0 |

**greaterThan normal 300**

| stage (purpose) | ms | share of root | oracle solves | canonical ratings | finders covered ms | finders remaining ms | apply ms | DFS ms | self ms |
|---|---|---|---|---|---|---|---|---|---|
| local.search | 971 | 44.5 % | 0 | 0 | 0 | 0 | 0 | 0 | 971 |
| local.unique | 600 | 27.5 % | 0 | 0 | 0 | 0 | 0 | 595 | 5 |
| step:dig | 599 | 27.5 % | 1816 | 17 | 144 | 95 | 22 | 90 | 177 |
| step:fullGrid | 3 | 0.1 % | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| request | 3 | 0.1 % | 0 | 0 | 0 | 0 | 0 | 0 | 3 |

## Finders: S3-covered against the remaining registered finders

Covered = IG-S03's implemented scopes (`nakedSingle, hiddenSingleBox, hiddenSingleLine, nakedPair, hiddenPair, nakedTriple, hiddenTriple, nakedQuad, hiddenQuad`); remaining = the other 17 registered finders (`pointing, cageCombo, ineqChain, boxLine, minMaxForcing, ruleOf45, xWing, simpleColouring, swordfish, cageSplit, jellyfish, xyWing, xyzWing, wWing, uniqueRectangle, forcingChain, nishio`). A finder's inclusive and exclusive times are one number (see below).

| request | finder time share of root | covered share of root | remaining share of root | covered share of finders | remaining negative-call share of root | covered negative-call share of root | chain group (nishio, forcingChain, ...) share of root |
|---|---|---|---|---|---|---|---|
| classic9 nightmare 3 | 69.5 % | 5.2 % | 64.3 % | 7.4 % | 46.4 % | 3.9 % | 55.3 % |
| mega16 nightmare 3 | 97.8 % | 3.9 % | 93.9 % | 4.0 % | 40.4 % | 3.6 % | 81.4 % |
| mega12 nightmare 3 | 95.5 % | 5.4 % | 90.1 % | 5.6 % | 57.6 % | 4.7 % | 76.6 % |
| samurai nightmare 42 | 89.4 % | 12.7 % | 76.7 % | 14.2 % | 45.7 % | 9.1 % | 52.6 % |
| killer nightmare 3 | 43.0 % | 8.5 % | 34.5 % | 19.8 % | 14.3 % | 7.0 % | 17.1 % |
| greaterThan nightmare 3 | 45.6 % | 7.3 % | 38.4 % | 16.0 % | 20.1 % | 6.1 % | 24.2 % |
| killer hard 1 | 34.4 % | 15.4 % | 19.0 % | 44.7 % | 8.1 % | 11.3 % | 0.0 % |
| killer expert 1 | 56.8 % | 15.3 % | 41.4 % | 27.0 % | 14.2 % | 12.8 % | 6.9 % |
| greaterThan normal 300 | 11.0 % | 6.6 % | 4.3 % | 60.3 % | 1.9 % | 2.5 % | 0.0 % |

A negative call is a finder call that returned no Finding (its whole wall time, the scan of every scope it looked at); a call that returned a Finding is a positive call, and it too may have looked at scopes that held nothing.

**classic9 nightmare 3** top finders (all rows: finder-profile.json)

| finder | S3 | calls | hit rate | ms | share of root | negative-call ms | us/call | checks/call |
|---|---|---|---|---|---|---|---|---|
| nishio | remaining | 1075 | 37.9 % | 2347 | 40.5 % | 1972 | 2183.32 | 844.38 |
| forcingChain | remaining | 3804 | 71.7 % | 854 | 14.8 % | 229 | 224.62 | 69.83 |
| simpleColouring | remaining | 5752 | 12.9 % | 176 | 3.0 % | 160 | 30.66 | 3.85 |
| xWing | remaining | 6080 | 5.4 % | 79 | 1.4 % | 74 | 13.02 | 7.95 |
| swordfish | remaining | 5011 | 0.6 % | 69 | 1.2 % | 69 | 13.81 | 8.09 |
| nakedSingle | covered | 279933 | 86.4 % | 68 | 1.2 % | 10 | 0.24 | 0.00 |

**mega16 nightmare 3** top finders (all rows: finder-profile.json)

| finder | S3 | calls | hit rate | ms | share of root | negative-call ms | us/call | checks/call |
|---|---|---|---|---|---|---|---|---|
| nishio | remaining | 10078 | 95.4 % | 59413 | 55.7 % | 18292 | 5895.31 | 813.86 |
| forcingChain | remaining | 28837 | 65.0 % | 27382 | 25.7 % | 11685 | 949.54 | 315.74 |
| simpleColouring | remaining | 32287 | 3.8 % | 4393 | 4.1 % | 4292 | 136.05 | 10.62 |
| jellyfish | remaining | 30991 | 0.1 % | 2123 | 2.0 % | 2122 | 68.51 | 21.84 |
| swordfish | remaining | 31069 | 0.2 % | 1962 | 1.8 % | 1958 | 63.15 | 21.82 |
| xWing | remaining | 32645 | 1.1 % | 1848 | 1.7 % | 1836 | 56.60 | 21.31 |

**mega12 nightmare 3** top finders (all rows: finder-profile.json)

| finder | S3 | calls | hit rate | ms | share of root | negative-call ms | us/call | checks/call |
|---|---|---|---|---|---|---|---|---|
| nishio | remaining | 2392 | 74.8 % | 12867 | 52.8 % | 9484 | 5379.03 | 1210.93 |
| forcingChain | remaining | 13786 | 82.7 % | 5819 | 23.9 % | 1384 | 422.11 | 143.15 |
| simpleColouring | remaining | 17495 | 5.7 % | 1088 | 4.5 % | 1050 | 62.17 | 6.61 |
| swordfish | remaining | 16504 | 0.8 % | 474 | 1.9 % | 471 | 28.71 | 13.57 |
| xWing | remaining | 18011 | 2.9 % | 465 | 1.9 % | 456 | 25.81 | 13.37 |
| jellyfish | remaining | 16371 | 0.0 % | 453 | 1.9 % | 453 | 27.67 | 13.65 |

**samurai nightmare 42** top finders (all rows: finder-profile.json)

| finder | S3 | calls | hit rate | ms | share of root | negative-call ms | us/call | checks/call |
|---|---|---|---|---|---|---|---|---|
| nishio | remaining | 1197 | 48.4 % | 5993 | 26.7 % | 3999 | 5007.09 | 1316.38 |
| forcingChain | remaining | 9178 | 87.0 % | 5794 | 25.8 % | 1096 | 631.28 | 156.34 |
| simpleColouring | remaining | 14932 | 7.4 % | 1581 | 7.0 % | 1508 | 105.87 | 4.08 |
| jellyfish | remaining | 13763 | 0.4 % | 1034 | 4.6 % | 1032 | 75.15 | 8.35 |
| swordfish | remaining | 13828 | 0.5 % | 803 | 3.6 % | 798 | 58.06 | 8.36 |
| xWing | remaining | 15205 | 1.8 % | 762 | 3.4 % | 751 | 50.10 | 8.39 |

**killer nightmare 3** top finders (all rows: finder-profile.json)

| finder | S3 | calls | hit rate | ms | share of root | negative-call ms | us/call | checks/call |
|---|---|---|---|---|---|---|---|---|
| nishio | remaining | 3748 | 90.3 % | 2761 | 12.4 % | 658 | 736.75 | 80.52 |
| ruleOf45 | remaining | 32654 | 80.2 % | 1449 | 6.5 % | 287 | 44.36 | 0.74 |
| cageCombo | remaining | 328602 | 85.8 % | 1076 | 4.8 % | 283 | 3.27 | 0.55 |
| forcingChain | remaining | 4763 | 21.3 % | 1036 | 4.7 % | 809 | 217.62 | 137.65 |
| pointing | remaining | 459144 | 28.4 % | 741 | 3.3 % | 594 | 1.61 | 0.00 |
| hiddenSingleBox | covered | 679344 | 27.0 % | 396 | 1.8 % | 287 | 0.58 | 0.00 |

**greaterThan nightmare 3** top finders (all rows: finder-profile.json)

| finder | S3 | calls | hit rate | ms | share of root | negative-call ms | us/call | checks/call |
|---|---|---|---|---|---|---|---|---|
| forcingChain | remaining | 11072 | 61.2 % | 2605 | 21.0 % | 1069 | 235.29 | 0.00 |
| simpleColouring | remaining | 13379 | 8.2 % | 418 | 3.4 % | 390 | 31.21 | 0.00 |
| nishio | remaining | 4301 | 99.4 % | 398 | 3.2 % | 9 | 92.62 | 0.00 |
| pointing | remaining | 154274 | 18.4 % | 250 | 2.0 % | 217 | 1.62 | 0.00 |
| ineqChain | remaining | 125810 | 84.4 % | 234 | 1.9 % | 23 | 1.86 | 0.00 |
| hiddenSingleBox | covered | 223619 | 25.3 % | 224 | 1.8 % | 139 | 1.00 | 0.00 |

**killer hard 1** top finders (all rows: finder-profile.json)

| finder | S3 | calls | hit rate | ms | share of root | negative-call ms | us/call | checks/call |
|---|---|---|---|---|---|---|---|---|
| pointing | remaining | 366012 | 30.9 % | 543 | 8.8 % | 426 | 1.48 | 0.00 |
| cageCombo | remaining | 252835 | 97.0 % | 526 | 8.5 % | 40 | 2.08 | 1.11 |
| nakedSingle | covered | 1303665 | 58.0 % | 297 | 4.8 % | 130 | 0.23 | 0.00 |
| hiddenSingleLine | covered | 395940 | 7.6 % | 289 | 4.7 % | 272 | 0.73 | 0.00 |
| hiddenSingleBox | covered | 548037 | 27.8 % | 266 | 4.3 % | 199 | 0.48 | 0.00 |
| ruleOf45 | remaining | 4647 | 98.0 % | 79 | 1.3 % | 12 | 16.96 | 0.82 |

**killer expert 1** top finders (all rows: finder-profile.json)

| finder | S3 | calls | hit rate | ms | share of root | negative-call ms | us/call | checks/call |
|---|---|---|---|---|---|---|---|---|
| ruleOf45 | remaining | 30762 | 94.7 % | 2092 | 17.8 % | 76 | 68.01 | 1.32 |
| cageCombo | remaining | 323465 | 86.6 % | 996 | 8.5 % | 245 | 3.08 | 1.15 |
| pointing | remaining | 451331 | 28.3 % | 724 | 6.2 % | 581 | 1.60 | 0.00 |
| nishio | remaining | 1109 | 74.6 % | 563 | 4.8 % | 312 | 507.79 | 119.43 |
| hiddenSingleBox | covered | 660527 | 26.2 % | 394 | 3.4 % | 313 | 0.60 | 0.00 |
| hiddenSingleLine | covered | 487625 | 7.4 % | 370 | 3.1 % | 345 | 0.76 | 0.00 |

**greaterThan normal 300** top finders (all rows: finder-profile.json)

| finder | S3 | calls | hit rate | ms | share of root | negative-call ms | us/call | checks/call |
|---|---|---|---|---|---|---|---|---|
| hiddenSingleBox | covered | 52779 | 39.4 % | 86 | 3.9 % | 19 | 1.63 | 0.00 |
| ineqChain | remaining | 21033 | 99.4 % | 44 | 2.0 % | 0 | 2.09 | 0.00 |
| pointing | remaining | 28780 | 26.9 % | 40 | 1.9 % | 32 | 1.41 | 0.00 |
| nakedSingle | covered | 128592 | 59.0 % | 33 | 1.5 % | 12 | 0.25 | 0.00 |
| hiddenSingleLine | covered | 31989 | 10.0 % | 22 | 1.0 % | 20 | 0.69 | 0.00 |
| minMaxForcing | remaining | 45 | 13.3 % | 10 | 0.4 % | 9 | 217.44 | 0.00 |

## Conditional zero-cost scenarios (not a bound on a full S3)

Each factor is this profiled run with the named wall time set to zero and everything else as measured (root / (root - removed)). They are arithmetic of one instrumented run, not forecasts and not ceilings of a full S3: a call that returns a Finding can also skip cached negative scopes, so a full S3 could save more than the negative calls, and the cache costs lookups and invalidation, so it saves less. Only the two family-time columns limit a change confined to the calls of those finders (it cannot save more than their whole wall time, timers included).

| request | scenario: all finder time removed | scenario: covered finders' time removed | scenario: remaining finders' time removed | scenario: negative calls of the covered finders removed | scenario: negative calls of the remaining finders removed | scenario: negative calls of the remaining non-chain finders removed | measured partial S3 (IG-S03 serial, n = 1) |
|---|---|---|---|---|---|---|---|
| classic9 nightmare 3 | 3.278 | 1.054 | 2.803 | 1.040 | 1.865 | 1.092 | 0.970 |
| mega16 nightmare 3 | 44.976 | 1.040 | 16.427 | 1.038 | 1.678 | 1.140 | 1.029 |
| mega12 nightmare 3 | 22.065 | 1.057 | 10.108 | 1.049 | 2.360 | 1.150 | 1.007 |
| samurai nightmare 42 | 9.411 | 1.145 | 4.288 | 1.101 | 1.841 | 1.298 | 1.014 |
| killer nightmare 3 | 1.755 | 1.093 | 1.527 | 1.075 | 1.167 | 1.084 | 0.943 |
| greaterThan nightmare 3 | 1.840 | 1.079 | 1.622 | 1.065 | 1.252 | 1.129 | 1.010 |
| killer hard 1 | 1.524 | 1.181 | 1.235 | 1.127 | 1.088 | 1.088 | n/a |
| killer expert 1 | 2.312 | 1.181 | 1.708 | 1.146 | 1.165 | 1.107 | n/a |
| greaterThan normal 300 | 1.123 | 1.071 | 1.046 | 1.026 | 1.020 | 1.020 | n/a |

- classic9 nightmare 3: the covered finders take 5.2 % of the profiled request (3.9 % in negative calls) and the remaining finders 64.3 % (46.4 % in negative calls; the chain group alone 55.3 %). Scenarios: no covered-finder time 1.054x, no negative calls of the covered finders 1.040x (the measured partial S3 of this request: 0.970x); no negative calls of the remaining finders 1.865x (without the chain group 1.092x).
- mega16 nightmare 3: the covered finders take 3.9 % of the profiled request (3.6 % in negative calls) and the remaining finders 93.9 % (40.4 % in negative calls; the chain group alone 81.4 %). Scenarios: no covered-finder time 1.040x, no negative calls of the covered finders 1.038x (the measured partial S3 of this request: 1.029x); no negative calls of the remaining finders 1.678x (without the chain group 1.140x).
- mega12 nightmare 3: the covered finders take 5.4 % of the profiled request (4.7 % in negative calls) and the remaining finders 90.1 % (57.6 % in negative calls; the chain group alone 76.6 %). Scenarios: no covered-finder time 1.057x, no negative calls of the covered finders 1.049x (the measured partial S3 of this request: 1.007x); no negative calls of the remaining finders 2.360x (without the chain group 1.150x).
- samurai nightmare 42: the covered finders take 12.7 % of the profiled request (9.1 % in negative calls) and the remaining finders 76.7 % (45.7 % in negative calls; the chain group alone 52.6 %). Scenarios: no covered-finder time 1.145x, no negative calls of the covered finders 1.101x (the measured partial S3 of this request: 1.014x); no negative calls of the remaining finders 1.841x (without the chain group 1.298x).
- killer nightmare 3: the covered finders take 8.5 % of the profiled request (7.0 % in negative calls) and the remaining finders 34.5 % (14.3 % in negative calls; the chain group alone 17.1 %). Scenarios: no covered-finder time 1.093x, no negative calls of the covered finders 1.075x (the measured partial S3 of this request: 0.943x); no negative calls of the remaining finders 1.167x (without the chain group 1.084x).
- greaterThan nightmare 3: the covered finders take 7.3 % of the profiled request (6.1 % in negative calls) and the remaining finders 38.4 % (20.1 % in negative calls; the chain group alone 24.2 %). Scenarios: no covered-finder time 1.079x, no negative calls of the covered finders 1.065x (the measured partial S3 of this request: 1.010x); no negative calls of the remaining finders 1.252x (without the chain group 1.129x).
- killer hard 1: the covered finders take 15.4 % of the profiled request (11.3 % in negative calls) and the remaining finders 19.0 % (8.1 % in negative calls; the chain group alone 0.0 %). Scenarios: no covered-finder time 1.181x, no negative calls of the covered finders 1.127x (the measured partial S3 of this request: no row); no negative calls of the remaining finders 1.088x (without the chain group 1.088x).
- killer expert 1: the covered finders take 15.3 % of the profiled request (12.8 % in negative calls) and the remaining finders 41.4 % (14.2 % in negative calls; the chain group alone 6.9 %). Scenarios: no covered-finder time 1.181x, no negative calls of the covered finders 1.146x (the measured partial S3 of this request: no row); no negative calls of the remaining finders 1.165x (without the chain group 1.107x).
- greaterThan normal 300: the covered finders take 6.6 % of the profiled request (2.5 % in negative calls) and the remaining finders 4.3 % (1.9 % in negative calls; the chain group alone 0.0 %). Scenarios: no covered-finder time 1.071x, no negative calls of the covered finders 1.026x (the measured partial S3 of this request: no row); no negative calls of the remaining finders 1.020x (without the chain group 1.020x).
- These are conditional zero-cost scenarios of one profiled run, not ceilings of a full S3: a call that returns a Finding can also skip cached negative scopes, and a cache costs lookups and invalidation; neither is measured here. What the profile does support is attribution: where the finder time sits (covered against remaining, and the chain group), and that a change confined to the covered finders cannot save more than their time. How much of the remaining finders' time a full S3 could skip needs per-scope data (what a call scanned, what invalidated it); nothing is extrapolated from the partial S3 to the other finders, to chains or to the cap behaviour.

## Profiling overhead (an instrumented run is not a timing run)

| request | profiled ready s | comparator | comparator ready s | ready ratio | cpu ratio | estimated instrumentation | estimated share of ready wall |
|---|---|---|---|---|---|---|---|
| c9/classic9:nightmare:3/profiled | 5.80 | IG-S02 native-w1 | 5.64 | 1.027 | 1.074 | 118.1 ms | 2.0 % |
| m16/mega16:nightmare:3/profiled | 106.69 | IG-S02 native-w1 | 107.53 | 0.992 | 0.992 | 249.0 ms | 0.2 % |
| m12/mega12:nightmare:3/profiled | 24.39 | IG-S02 native-w1 | 23.50 | 1.038 | 1.044 | 211.8 ms | 0.9 % |
| sam/samurai:nightmare:42/profiled | 22.43 | IG-S02 native-w1 | 21.70 | 1.034 | 1.036 | 540.7 ms | 2.4 % |
| killer-n/killer:nightmare:3/profiled | 22.24 | IG-S02 native-w1 | 21.11 | 1.053 | 1.054 | 855.1 ms | 3.8 % |
| gt-n/greaterThan:nightmare:3/profiled | 12.43 | IG-S02 native-w1 | 11.57 | 1.075 | 1.065 | 280.6 ms | 2.3 % |
| killer-h/killer:hard:1/profiled | 6.20 | same command | 5.42 | 1.143 | 1.105 | 690.9 ms | 11.2 % |
| killer-e/killer:expert:1/profiled | 11.76 | same command | 10.73 | 1.096 | 1.090 | 823.9 ms | 7.0 % |
| gt-normal/greaterThan:normal:300/profiled | 2.19 | same command | 2.14 | 1.022 | 1.061 | 66.7 ms | 3.0 % |

A ratio above 1 is the cost of the instrumentation plus whatever else differs between the two runs. The same-command arms differ only by the instrumentation and the run order; the time-separated comparators also differ by machine state, so a ratio within a few percent of 1 is not resolved against that noise. The instrumented wall time is never a before/after figure.

Reference compatibility (IG-S02 comparators): The accounting and loading path (host.cjs, loader.cjs, common.cjs, records.cjs, manifest.cjs) is byte-identical to the harness of IG-S02's generation evidence; the comparators are therefore compatible, with the changed files listed per row.

| request | compatible | accounting-path files changed | files changed since the baseline harness |
|---|---|---|---|
| c9/classic9:nightmare:3/profiled | true | none | aggregate.cjs, ig02-run.cjs, run.cjs, worker.cjs |
| m16/mega16:nightmare:3/profiled | true | none | aggregate.cjs, ig02-run.cjs, run.cjs, worker.cjs |
| m12/mega12:nightmare:3/profiled | true | none | aggregate.cjs, ig02-run.cjs, run.cjs, worker.cjs |
| sam/samurai:nightmare:42/profiled | true | none | aggregate.cjs, ig02-run.cjs, run.cjs, worker.cjs |
| killer-n/killer:nightmare:3/profiled | true | none | aggregate.cjs, ig02-run.cjs, run.cjs, worker.cjs |
| gt-n/greaterThan:nightmare:3/profiled | true | none | aggregate.cjs, ig02-run.cjs, run.cjs, worker.cjs |

## Frontier phase A (existing IG-S05 ledgers, no new run)

IG-S05 screen (8 clusters per cell, up to two samples per trial; phase B and deepen shares are of the phase wall, which holds init + phase A + phase B with its nested deepen; "outside the phases" is the rest of the sample wall):

| cell | mode | samples | phase A / sample wall | phase A / phase wall | phase B (no deepen) | deepen | floor tests | accepted full / S2 | refused unique / unknown / ambiguous | phase A DFS entries | allowed + canonical solves | deepen proposals | empty frontiers | budget-ended | candidate classes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| classic9 | F1 | 16 | 81.8 % | 92.3 % | 0.0 % | 0.0 % | 656 | 65 / 362 | 0 / 0 / 229 | 1300 | 0 + 16 | 0 | 16 | 0 | {"fallback":16} |
| classic9 | FC | 16 | 82.5 % | 92.5 % | 0.0 % | 0.0 % | 656 | 65 / 362 | 0 / 0 / 229 | 1300 | 0 + 16 | 0 | 16 | 0 | {"fallback":16} |
| classic9 | FM | 16 | 87.2 % | 94.8 % | 0.0 % | 0.0 % | 656 | 65 / 362 | 0 / 0 / 229 | 1300 | 0 + 16 | 0 | 16 | 0 | {"fallback":16} |
| mega12 | F1 | 16 | 56.4 % | 58.1 % | 40.3 % | 0.0 % | 1196 | 74 / 662 | 51 / 0 / 409 | 5321 | 7 + 23 | 0 | 12 | 0 | {"fallback":12,"above":4} |
| mega12 | FC | 16 | 5.0 % | 5.0 % | 9.7 % | 85.1 % | 1152 | 74 / 657 | 30 / 0 / 391 | 4689 | 16 + 32 | 16 | 4 | 0 | {"fallback":7,"above":6,"shallow":3} |
| mega12 | FM | 16 | 47.7 % | 48.9 % | 49.6 % | 0.0 % | 1152 | 74 / 658 | 23 / 0 / 397 | 5033 | 13 + 29 | 0 | 5 | 0 | {"fallback":9,"shallow":3,"above":4} |
| mega16 | F1 | 16 | 51.8 % | 52.0 % | 47.9 % | 0.0 % | 2222 | 71 / 1170 | 217 / 0 / 762 | 166736 | 24 + 40 | 0 | 2 | 2 | {"above":11,"fallback":5} |
| mega16 | FC | 16 | 18.8 % | 18.9 % | 49.9 % | 31.1 % | 2045 | 71 / 1160 | 129 / 0 / 684 | 111840 | 55 + 71 | 9 | 0 | 2 | {"shallow":7,"above":7,"fallback":2} |
| mega16 | FM | 16 | 34.8 % | 34.9 % | 64.9 % | 0.0 % | 2035 | 71 / 1162 | 125 / 0 / 675 | 126214 | 48 + 64 | 0 | 0 | 2 | {"shallow":7,"above":6,"fallback":3} |
| samurai | F1 | 16 | 86.2 % | 87.7 % | 11.4 % | 0.0 % | 2996 | 87 / 2041 | 37 / 0 / 831 | 9566 | 1 + 17 | 0 | 15 | 0 | {"fallback":15,"above":1} |
| samurai | FC | 16 | 33.2 % | 33.5 % | 22.8 % | 43.3 % | 2960 | 87 / 2031 | 26 / 0 / 816 | 8506 | 11 + 27 | 16 | 2 | 0 | {"above":3,"below":1,"shallow":6,"fallback":6} |
| samurai | FM | 16 | 60.7 % | 61.3 % | 38.1 % | 0.0 % | 2949 | 87 / 2024 | 21 / 0 / 816 | 11170 | 15 + 31 | 0 | 3 | 1 | {"fallback":6,"shallow":5,"above":5} |

IG-S04 pilot (grid seeds 11 and 12, one sample per trial):

| cell | mode | samples | phase A / sample wall | phase A / phase wall | phase B (no deepen) | deepen | floor tests | accepted full / S2 | refused unique / unknown / ambiguous | phase A DFS entries | allowed + canonical solves | deepen proposals | empty frontiers | budget-ended | candidate classes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| classic9 | F1 | 2 | 63.5 % | 91.3 % | 0.0 % | 0.0 % | 82 | 9 / 47 | 0 / 0 / 26 | 133 | 0 + 2 | 0 | 2 | 0 | {"not recorded":2} |
| classic9 | FC | 2 | 62.2 % | 90.7 % | 0.0 % | 0.0 % | 82 | 9 / 47 | 0 / 0 / 26 | 133 | 0 + 2 | 0 | 2 | 0 | {"not recorded":2} |
| classic9 | FM | 2 | 67.0 % | 92.5 % | 0.0 % | 0.0 % | 82 | 9 / 47 | 0 / 0 / 26 | 133 | 0 + 2 | 0 | 2 | 0 | {"not recorded":2} |
| mega12 | F1 | 2 | 2.1 % | 2.1 % | 0.8 % | 97.0 % | 155 | 6 / 82 | 14 / 0 / 53 | 411 | 2 + 4 | 16 | 0 | 0 | {"not recorded":2} |
| mega12 | FC | 2 | 0.9 % | 0.9 % | 2.1 % | 96.9 % | 144 | 6 / 81 | 7 / 0 / 50 | 338 | 4 + 6 | 16 | 0 | 0 | {"not recorded":2} |
| mega12 | FM | 2 | 1.3 % | 1.3 % | 1.9 % | 96.7 % | 144 | 6 / 81 | 7 / 0 / 50 | 338 | 4 + 6 | 16 | 0 | 0 | {"not recorded":2} |
| mega16 | F1 | 2 | 92.3 % | 99.2 % | 0.0 % | 0.0 % | 266 | 5 / 151 | 10 / 0 / 100 | 12104 | 0 + 2 | 0 | 2 | 0 | {"not recorded":2} |
| mega16 | FC | 2 | 28.4 % | 29.4 % | 70.2 % | 0.0 % | 256 | 5 / 150 | 7 / 0 / 94 | 9915 | 3 + 5 | 0 | 0 | 0 | {"not recorded":2} |
| mega16 | FM | 2 | 33.8 % | 34.8 % | 64.8 % | 0.0 % | 256 | 5 / 150 | 7 / 0 / 94 | 9915 | 3 + 5 | 0 | 0 | 0 | {"not recorded":2} |
| samurai | F1 | 2 | 89.2 % | 98.7 % | 0.0 % | 0.0 % | 376 | 14 / 252 | 6 / 0 / 104 | 1393 | 0 + 2 | 0 | 2 | 0 | {"not recorded":2} |
| samurai | FC | 2 | 5.0 % | 5.1 % | 4.6 % | 90.2 % | 370 | 14 / 250 | 4 / 0 / 102 | 1288 | 2 + 4 | 16 | 0 | 0 | {"not recorded":2} |
| samurai | FM | 2 | 7.4 % | 7.5 % | 4.1 % | 88.3 % | 370 | 14 / 250 | 4 / 0 / 102 | 1288 | 2 + 4 | 16 | 0 | 0 | {"not recorded":2} |

- The phase A wall of a frontier sample contains every floor test AND the DFS uniqueness checks that follow a stuck test; the per-purpose counts (floor, dfs, allowed/canonical, deepen) are counts of logical checks and DFS entries, not per-purpose or per-finder wall measurements.
- Native-request finder shares (finder-profile.json) cannot be transplanted into frontier phase A, and they say nothing about the cost of a scoped cache. A per-finder profile of frontier phase A would be separately authorised work.
- Classic9's empty frontier (every refused group proves ambiguous), the larger boards' above-band or shallow candidates and the budget-ended searches are different outcomes of different mechanisms, never interchangeable failures.
- No frontier run was made for IG-S07: these are the IG-S05 screen trials as recorded (two samples of two grids per cell and mode at most, eight clusters per cell; zero verified hits in every mode) and, as a second dataset, the IG-S04 pilot trials (grid seeds 11 and 12, one sample each).

## Loop-check comparison on the real engine (revision r2)

Command `lc` (attempt a1, complete; harness 062742c330eb…, adapter profile version 2 4d409f0ef2e0…): the real `SG.logicalSolver.solve` of classic9 under budgets of 0, 1, 2, ... nodes on an unpatched instance, on the patched sources without the runtime and on the patched sources with it. Verdict: **13/13 passed**.

| check | passed | what | detail |
|---|---|---|---|
| loop.transforms-loaded | true | the patched instance ran all transforms of the adapter profile | {"transforms":27} |
| loop.parity.empty-ladder | true | an unpatched instance, the patched sources without the runtime and with it return the same report or error and the same number of budget checks at every limit | {"limits":4,"problems":[]} |
| loop.observed.empty-ladder | true | the observed loop checks (both sites, counted before the call) plus the finder checks equal the budget's own count at every limit, a check that throws included, and the hooks are restored | {"limits":4,"problems":[]} |
| loop.parity.singles-solved | true | an unpatched instance, the patched sources without the runtime and with it return the same report or error and the same number of budget checks at every limit | {"limits":30,"problems":[]} |
| loop.observed.singles-solved | true | the observed loop checks (both sites, counted before the call) plus the finder checks equal the budget's own count at every limit, a check that throws included, and the hooks are restored | {"limits":30,"problems":[]} |
| loop.parity.singles-stuck | true | an unpatched instance, the patched sources without the runtime and with it return the same report or error and the same number of budget checks at every limit | {"limits":5,"problems":[]} |
| loop.observed.singles-stuck | true | the observed loop checks (both sites, counted before the call) plus the finder checks equal the budget's own count at every limit, a check that throws included, and the hooks are restored | {"limits":5,"problems":[]} |
| loop.parity.subsets-stuck | true | an unpatched instance, the patched sources without the runtime and with it return the same report or error and the same number of budget checks at every limit | {"limits":30,"problems":[]} |
| loop.observed.subsets-stuck | true | the observed loop checks (both sites, counted before the call) plus the finder checks equal the budget's own count at every limit, a check that throws included, and the hooks are restored | {"limits":30,"problems":[]} |
| loop.boundary-first-check | true | a check that throws before the first finder is observed (one check, no finder call, the budget's own node count of 1) | {"problems":[]} |
| loop.boundary-stuck-check | true | a check that throws before a stuck result is observed (the last check of every case that ends stuck) | {"stuckCases":3,"problems":[]} |
| loop.boundary-empty-ladder | true | an empty ladder is two loop checks (the top of the pass and the one before the stuck result) and no finder call | {"loopChecks":2,"derived":1,"nodes":2} |
| loop.r1-derivation-misses | true | the r1 derivation (loop checks from the finder passes) differs from the budget's own count at the boundary rows | {"rowsWhereItDiffers":39,"profiledRows":73,"rowsThatThrewInsideAFinder":25} |

Boundary rows (limit = budget nodes; each cell is status or error code, then the budget's own count; observed = loop checks counted before the call, derived = the r1 estimate):

| case | ladder | unlimited run | limit | unpatched | patched, no runtime | profiled | observed loop | finder checks | derived loop | derived = budget count |
|---|---|---|---|---|---|---|---|---|---|---|
| empty-ladder | none | stuck / 2 | 0 | budget.exceeded / 1 | budget.exceeded / 1 | budget.exceeded / 1 | 1 | 0 | 0 | false |
| empty-ladder | none | stuck / 2 | 1 | budget.exceeded / 2 | budget.exceeded / 2 | budget.exceeded / 2 | 2 | 0 | 0 | false |
| empty-ladder | none | stuck / 2 | 2 | stuck / 2 | stuck / 2 | stuck / 2 | 2 | 0 | 1 | false |
| singles-solved | nakedSingle, hiddenSingleBox, hiddenSingleLine | solved / 49 | 0 | budget.exceeded / 1 | budget.exceeded / 1 | budget.exceeded / 1 | 1 | 0 | 0 | false |
| singles-solved | nakedSingle, hiddenSingleBox, hiddenSingleLine | solved / 49 | 48 | budget.exceeded / 49 | budget.exceeded / 49 | budget.exceeded / 49 | 49 | 0 | 48 | false |
| singles-solved | nakedSingle, hiddenSingleBox, hiddenSingleLine | solved / 49 | 49 | solved / 49 | solved / 49 | solved / 49 | 49 | 0 | 49 | true |
| singles-stuck | nakedSingle, hiddenSingleBox, hiddenSingleLine | stuck / 3 | 0 | budget.exceeded / 1 | budget.exceeded / 1 | budget.exceeded / 1 | 1 | 0 | 0 | false |
| singles-stuck | nakedSingle, hiddenSingleBox, hiddenSingleLine | stuck / 3 | 2 | budget.exceeded / 3 | budget.exceeded / 3 | budget.exceeded / 3 | 3 | 0 | 2 | false |
| singles-stuck | nakedSingle, hiddenSingleBox, hiddenSingleLine | stuck / 3 | 3 | stuck / 3 | stuck / 3 | stuck / 3 | 3 | 0 | 3 | true |
| subsets-stuck | nakedSingle, hiddenSingleBox, hiddenSingleLine, nakedPair, hiddenPair, nakedTriple | stuck / 84 | 0 | budget.exceeded / 1 | budget.exceeded / 1 | budget.exceeded / 1 | 1 | 0 | 0 | false |
| subsets-stuck | nakedSingle, hiddenSingleBox, hiddenSingleLine, nakedPair, hiddenPair, nakedTriple | stuck / 84 | 83 | budget.exceeded / 84 | budget.exceeded / 84 | budget.exceeded / 84 | 3 | 81 | 2 | false |
| subsets-stuck | nakedSingle, hiddenSingleBox, hiddenSingleLine, nakedPair, hiddenPair, nakedTriple | stuck / 84 | 84 | stuck / 84 | stuck / 84 | stuck / 84 | 3 | 81 | 3 | true |

| case | limits tried | limits where the r1 derivation differs from the budget's own count |
|---|---|---|
| empty-ladder | 4 | 0, 1, 2, 3 |
| singles-solved | 30 | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 46, 47, 48 |
| singles-stuck | 5 | 0, 1, 2 |
| subsets-stuck | 30 | 0, 1, 83 |

Worker wall time of the two comparison workers: 308 ms (engine part: plain 8.5 ms, patched 65.3 ms); the command occupied the wrapper for 1.3 s.

## Machine time and priority waits

Charged 710.6 s of the 720 s allocation over 10 commands (remaining 9.4 s); priority waits behind difficulty-v3 1185.4 s, not charged. charged = occupied wrapper time + the 45 s quiet-admission grace per command; the priority wait is not charged

Approvals in the ledger: IG-S07 +12.0 s by orchestrator (claude-opus-5.5) 2026-11-15 07:50 +07:00: one request-free loop-check shard lc only, per the pack author fix round; worst case about 725 s total. They lift the admission gate of the dispatcher; the charge of a command is still its occupied time plus the grace.

| shard | attempt | status | occupied s | charged s | priority wait s |
|---|---|---|---|---|---|
| c9 | a1 | complete | 12.6 | 57.6 | 406.3 |
| m16 | a1 | complete | 109.1 | 154.1 | 45.1 |
| m12 | a1 | complete | 26.5 | 71.5 | 63.2 |
| sam | a1 | complete | 24.7 | 69.7 | 63.2 |
| killer-n | a1 | complete | 24.5 | 69.5 | 153.4 |
| gt-n | a1 | complete | 14.6 | 59.6 | 63.2 |
| killer-h | a1 | complete | 14.2 | 59.2 | 168.4 |
| killer-e | a1 | complete | 24.9 | 69.9 | 57.1 |
| gt-normal | a1 | complete | 6.6 | 51.6 | 45.1 |
| lc | a1 | complete | 2.9 | 47.9 | 120.4 |

## Acceptance

| id | status | evidence |
|---|---|---|
| B01 | met | every number is a measured wall time or a counted operation of the twelve fixed requests; no loose-count solve model is used |
| B02 | met | local-continuation time (context local) is its own row and share; a cohort's request-group time is not substituted for it; per-attempt cap reasons are listed from the engine's own work |
| B03 | met | the headline timings stay IG-S02's: profiled wall times appear only in the overhead and attribution tables, labelled instrumented |
| T01 | met | 9 profiles reconcile (booked cells = root, residual in the rows); finder time is one number per finder and the stage cells hold the rest of the solver, never summed twice; profile consistency problems: 0 |
| T02 | met | canonical ratings (difficulty.rate calls, equal to the engine's work counter), oracle solves (solves outside a rating), DFS entries/checks/backtracks and finder/loop budget checks are separate counters; the r1 budget-check totals are marked inexact (counters.checkTotals in stage-profile-r2.json) |
| T03 | met | 9 of 9 profiled outputs equal their comparator in every digest section; hook restoration is checked in every request and in the engine checks |
| T04 | met | the hooks call no solve, draw no number and charge no budget; the r1 engine checks compare the number of budget checks of an unpatched, a patched-without-runtime and a profiled run (13/13); the loop-check comparison of the revision r2 on the real engine: 13/13 passed |
| T05 | met | every record carries source/case/trace metadata (trace off), the transform hashes, the calibration and its comparator; overhead.json holds the ratios |

## Deviations and disclosures

- The classic9 shard ran first (the plumbing check of the first command); the other eight shards follow the table order of the task file.
- In the three control shards the unprofiled arm ran before the profiled one (an order effect on the same-command ratios is possible); the six headline cells have no same-command arm, their comparator is IG-S02's native-w1 record (time-separated, machine state may differ).
- The IG-S04 pilot trials were read as a second frontier dataset next to the IG-S05 screen; no frontier run was made.
- During development one scratch analysis script was written to the shell temp folder ($env:TEMP) against the rule that scratch files stay in the project; it was removed at once, held no evidence and no result was read back from it. One created file was misnamed and renamed inside the harness folder with Move-Item.
- Before the wrapped loop-check command, with the orchestrator's permission, the new worker function (`ig07-loopcheck`) was run once unwrapped on the real engine as a correctness pre-check: two node processes (unpatched, patched), about 0.4 s of CPU in all, no generation, no timing, nothing written to the evidence. Its first run showed that the puzzle chosen for the stuck cases was solved by singles (one stuck case only, no throw inside a finder), so the case puzzle was replaced by Escargot before the command was run; the second run passed 13/13 with three stuck cases and 25 rows that throw inside a finder.
- The r1 documents were written by harness f91e6e527f67…, after ig07-aggregate.cjs was edited following the nine runs (reporting code only); the nine commands ran under 0feb1ea57bd4….
- Revision r2 (the author's review): the S3 figures were relabelled conditional zero-cost scenarios (r1 called some of them ceilings of a full S3, which they are not) and the bias-adjusted column was dropped (it subtracted all-call timer costs from negative-call time); the budget-check totals of the r1 cohort are marked inexact and the original records are untouched; the profile cohort was not rerun, so its loop-check totals stay derived.
- Revision r2 added the request-free shard lc (the loop-check comparison on the real engine, no cell, no seed, no cohort). Its command ran under the fixed harness and is in the ledger. The dispatcher admits a command only with a window of at least 23 s after the 45 s grace; the remaining 57.3 s were short of that, so an approval entry of the orchestrator in the ledger (12000 ms by orchestrator (claude-opus-5.5) 2026-11-15 07:50 +07:00: one request-free loop-check shard lc only, per the pack author fix round; worst case about 725 s total) lifted the admission gate only.

## Limitations and open points

- n = 1 profiled request per cell: shares are observations of one seed, not distributions; the per-kind rows are the samples of that request.
- Wall-clock attribution inside one worker: process CPU is read once at the host (cpuTotal in overhead.json); no per-call CPU is taken. Process CPU also counts background threads (the Greater-Than cells show CPU/ready ratios above 1, as IG-S02's native Greater-Than runs did), so it is a side figure and never an attribution base.
- DFS checks are the budget checks of the search loop; checks issued inside constraint propagation are not counted separately (UNIQUE_NODES units are larger).
- The budget-check totals of the r1 profiles are INEXACT: the loop-check part was derived from the finder passes (it misses a check that throws before the first finder or before returning stuck, and every pass of an empty ladder), and the finder-check part counts ctx.check() calls only (the budget checks that nishio and forcingChain issue through the propagation engine on variants with propagation extensions are not observed: read from tech-chain.js and constraints.js, not measured). The original r1 records are preserved; the shares and times of this profile do not depend on them.
- The revised instrument (adapter profile version 2) observes both check sites of the ladder loop before the call; it was checked on the real engine only by the one comparison of the shard lc (and on a fake of the engine pieces with the real patched sources), never on a full request, and the propagation checks of the chain finders are still not observed.
- No frontier run was made: phase A is read from the IG-S05 ledgers; per-finder profiles of the frontier are not measured.
- Killer and Greater-Than strategies (structure search, sign dig) run inside the dig and extra-structure steps through the same primitives; their own stages are not labelled separately.

## Sources

| item | value |
|---|---|
| runtime fingerprint | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| harness of the profile cohort (the run) | 0feb1ea57bd4… (9 commands; manifest 7d4d096c96bb…; adapter 1e6f4df1909e…, adapter profile version 1 (26 transforms: derived loop-check totals)) |
| harness of the r1 report | f91e6e527f67… (ig07-aggregate.cjs had been edited after the nine runs (reporting code only); recorded by the developer when r1 was written, 12 characters, not recomputable from the later harness) |
| fixed harness (the loop-check command) | 062742c330eb… (1 command; manifest a02b3f0ae47e…; adapter 4d409f0ef2e0…) |
| harness of this r2 report | 5027a528f03a… (the writer of the r2 documents; it differs from the fixed harness of the loop-check command only by edits of ig07-aggregate.cjs (reporting code) made after that command: a shadowed-variable fix in the loop-check section and the wording of this note) |
| sources stable | true |
| firewall clean | true |
| S3 coverage source | docs/improve-generating/evidence/phase0/provisional-r1/IG-S03/coverage-r3.json (56976b4ea681) |
