# MS13c census (activation source)

Every row is one population of one model; "calls" is its denominator (positions). Per id: **ok** = the grouped attempt
completed (graph and minimum), of which **found** a Finding; caps are **construction-work / construction-nodes / search-work**;
**pb** = parent-budget stops (no budget is used here, so always 0); **fb** = the short id entered its fallback, of which **found**.
Work is every stage (construction + search + fallback); latency is the warm median of 3 calls, in ms.

## butterfly / base-ladder (15 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 15 / 15 | 0 / 0 / 0 | 0 | 0 / 0 | 29743 / 35433 / 35433 | 1.685 / 1.776 / 1.776 | - | 0 / 0, 0, 1.645 / 1.952 |
| forcingChainLong | 15 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | 28598 / 37795 / 37795 | 1.626 / 1.827 / 1.827 | - | 0 / 0, 0, 1.610 / 1.868 |

Full-build work (the lifted builder, S-AV36): median 26658, maximum 31008, over 50000: 0 of 15; most additional nodes 274 (quota 4096).

## butterfly / activation-ladder (26 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 18 / 18 | 0 / 0 / 8 | 0 | 8 / 4 | 33221 / 69054 / 69228 | 1.765 / 2.440 / 2.503 | 0.439 | 0 / 0, 0, 1.792 / 2.233 |
| forcingChainLong | 24 / 0 | 0 / 0 / 2 | 0 | 0 / 0 | 32988 / 50000 / 50000 | 1.656 / 1.894 / 1.899 | - | 0 / 0, 0, 1.653 / 2.077 |

Full-build work (the lifted builder, S-AV36): median 23961, maximum 31008, over 50000: 0 of 26; most additional nodes 274 (quota 4096).

## classic4 / base-ladder (0 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |
| forcingChainLong | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |

Full-build work (the lifted builder, S-AV36): median -, maximum -, over 50000: 0 of 0; most additional nodes -Infinity (quota 4096).

## classic4 / activation-ladder (0 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |
| forcingChainLong | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |

Full-build work (the lifted builder, S-AV36): median -, maximum -, over 50000: 0 of 0; most additional nodes -Infinity (quota 4096).

## classic6 / base-ladder (0 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |
| forcingChainLong | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |

Full-build work (the lifted builder, S-AV36): median -, maximum -, over 50000: 0 of 0; most additional nodes -Infinity (quota 4096).

## classic6 / activation-ladder (0 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |
| forcingChainLong | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |

Full-build work (the lifted builder, S-AV36): median -, maximum -, over 50000: 0 of 0; most additional nodes -Infinity (quota 4096).

## classic9 / base-ladder (5 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 5 / 4 | 0 / 0 / 0 | 0 | 0 / 0 | 17149 / 21471 / 21471 | 1.184 / 2.843 / 2.843 | - | 0 / 0, 0, 0.997 / 1.382 |
| forcingChainLong | 5 / 1 | 0 / 0 / 0 | 0 | 0 / 0 | 9028 / 25972 / 25972 | 0.829 / 1.598 / 1.598 | - | 0 / 0, 0, 0.841 / 1.576 |

Full-build work (the lifted builder, S-AV36): median 4942, maximum 6117, over 50000: 0 of 5; most additional nodes 126 (quota 4096).

## classic9 / activation-ladder (11 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 11 / 6 | 0 / 0 / 0 | 0 | 0 / 0 | 18381 / 21886 / 21886 | 0.605 / 0.921 / 0.921 | - | 0 / 0, 0, 0.629 / 0.732 |
| forcingChainLong | 11 / 4 | 0 / 0 / 0 | 0 | 0 / 0 | 25972 / 42925 / 42925 | 0.716 / 0.986 / 0.986 | - | 0 / 0, 0, 0.698 / 1.024 |

Full-build work (the lifted builder, S-AV36): median 4718, maximum 6117, over 50000: 0 of 11; most additional nodes 126 (quota 4096).

## classic9 / fixtures (8 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 8 / 7 | 0 / 0 / 0 | 0 | 0 / 0 | 8642 / 14243 / 14243 | 0.361 / 0.476 / 0.476 | - | 0 / 0, 0, 0.324 / 0.462 |
| forcingChainLong | 8 / 1 | 0 / 0 / 0 | 0 | 0 / 0 | 4996 / 19174 / 19174 | 0.285 / 0.515 / 0.515 | - | 0 / 0, 0, 0.264 / 0.532 |

Full-build work (the lifted builder, S-AV36): median 3210, maximum 4288, over 50000: 0 of 8; most additional nodes 91 (quota 4096).

## diagonalX / base-ladder (84 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 84 / 69 | 0 / 0 / 0 | 0 | 0 / 0 | 19468 / 30055 / 30850 | 0.742 / 1.111 / 1.201 | - | 0 / 0, 0, 0.733 / 1.240 |
| forcingChainLong | 84 / 5 | 0 / 0 / 0 | 0 | 0 / 0 | 16084 / 33276 / 38166 | 0.667 / 1.149 / 1.268 | - | 0 / 0, 0, 0.663 / 1.278 |

Full-build work (the lifted builder, S-AV36): median 9002, maximum 16419, over 50000: 0 of 84; most additional nodes 209 (quota 4096).

## diagonalX / activation-ladder (90 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 90 / 32 | 0 / 0 / 0 | 0 | 0 / 0 | 24432 / 30730 / 30850 | 0.832 / 1.128 / 1.147 | - | 0 / 0, 0, 0.828 / 1.179 |
| forcingChainLong | 87 / 22 | 0 / 0 / 3 | 0 | 0 / 0 | 30320 / 46468 / 50000 | 0.884 / 1.207 / 1.395 | - | 0 / 0, 0, 0.901 / 1.371 |

Full-build work (the lifted builder, S-AV36): median 8723, maximum 16419, over 50000: 0 of 90; most additional nodes 209 (quota 4096).

## flower / base-ladder (44 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 22 / 22 | 17 / 0 / 5 | 0 | 22 / 2 | 72388 / 78498 / 78666 | 2.273 / 2.945 / 3.493 | 0.629 | 0 / 0, 0, 2.321 / 3.132 |
| forcingChainLong | 21 / 0 | 17 / 0 / 6 | 0 | 0 / 0 | 50000 / 50000 / 50000 | 1.703 / 2.186 / 2.229 | - | 0 / 0, 0, 2.311 / 3.165 |

Full-build work (the lifted builder, S-AV36): median 44057, maximum 70583, over 50000: 17 of 44; most additional nodes 414 (quota 4096).

## flower / activation-ladder (39 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 18 / 17 | 12 / 0 / 9 | 0 | 21 / 5 | 72514 / 80278 / 82439 | 2.336 / 2.944 / 3.028 | 0.634 | 0 / 0, 0, 2.087 / 3.112 |
| forcingChainLong | 20 / 0 | 12 / 0 / 7 | 0 | 0 / 0 | 47967 / 50000 / 50000 | 1.689 / 2.192 / 2.265 | - | 0 / 0, 0, 2.071 / 3.171 |

Full-build work (the lifted builder, S-AV36): median 35968, maximum 70583, over 50000: 12 of 39; most additional nodes 414 (quota 4096).

## greaterThan / base-ladder (5 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 5 / 4 | 0 / 0 / 0 | 0 | 0 / 0 | 17149 / 21471 / 21471 | 0.606 / 0.709 / 0.709 | - | 0 / 0, 0, 0.568 / 0.668 |
| forcingChainLong | 5 / 1 | 0 / 0 / 0 | 0 | 0 / 0 | 9028 / 25972 / 25972 | 0.455 / 0.794 / 0.794 | - | 0 / 0, 0, 0.401 / 0.739 |

Full-build work (the lifted builder, S-AV36): median 4942, maximum 6117, over 50000: 0 of 5; most additional nodes 126 (quota 4096).

## greaterThan / activation-ladder (11 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 11 / 6 | 0 / 0 / 0 | 0 | 0 / 0 | 18381 / 21886 / 21886 | 0.580 / 0.717 / 0.717 | - | 0 / 0, 0, 0.567 / 0.712 |
| forcingChainLong | 11 / 4 | 0 / 0 / 0 | 0 | 0 / 0 | 25972 / 42925 / 42925 | 0.728 / 1.017 / 1.017 | - | 0 / 0, 0, 0.693 / 1.006 |

Full-build work (the lifted builder, S-AV36): median 4718, maximum 6117, over 50000: 0 of 11; most additional nodes 126 (quota 4096).

## hyper / base-ladder (67 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 67 / 61 | 0 / 0 / 0 | 0 | 0 / 0 | 19745 / 31590 / 32509 | 0.856 / 1.298 / 1.323 | - | 0 / 0, 0, 0.839 / 1.329 |
| forcingChainLong | 67 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | 20217 / 40331 / 45853 | 0.895 / 1.423 / 1.567 | - | 0 / 0, 0, 0.895 / 1.527 |

Full-build work (the lifted builder, S-AV36): median 10566, maximum 15387, over 50000: 0 of 67; most additional nodes 190 (quota 4096).

## hyper / activation-ladder (49 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 49 / 22 | 0 / 0 / 0 | 0 | 0 / 0 | 24150 / 32561 / 33549 | 0.874 / 1.137 / 1.155 | - | 0 / 0, 0, 0.885 / 1.206 |
| forcingChainLong | 49 / 9 | 0 / 0 / 0 | 0 | 0 / 0 | 28329 / 45853 / 45989 | 0.927 / 1.262 / 1.281 | - | 0 / 0, 0, 0.914 / 1.279 |

Full-build work (the lifted builder, S-AV36): median 11636, maximum 15387, over 50000: 0 of 49; most additional nodes 190 (quota 4096).

## jigsaw9 / base-ladder (26 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 26 / 21 | 0 / 0 / 0 | 0 | 0 / 0 | 12442 / 21568 / 21905 | 0.468 / 0.714 / 0.716 | - | 0 / 0, 0, 0.482 / 0.707 |
| forcingChainLong | 26 / 1 | 0 / 0 / 0 | 0 | 0 / 0 | 9119 / 31593 / 32449 | 0.387 / 0.882 / 0.895 | - | 0 / 0, 0, 0.382 / 0.876 |

Full-build work (the lifted builder, S-AV36): median 5798, maximum 8693, over 50000: 0 of 26; most additional nodes 140 (quota 4096).

## jigsaw9 / activation-ladder (18 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 18 / 11 | 0 / 0 / 0 | 0 | 0 / 0 | 18941 / 21905 / 21905 | 0.633 / 0.711 / 0.711 | - | 0 / 0, 0, 0.660 / 0.706 |
| forcingChainLong | 18 / 2 | 0 / 0 / 0 | 0 | 0 / 0 | 18147 / 36319 / 36319 | 0.597 / 0.901 / 0.901 | - | 0 / 0, 0, 0.618 / 0.902 |

Full-build work (the lifted builder, S-AV36): median 7028, maximum 8693, over 50000: 0 of 18; most additional nodes 140 (quota 4096).

## killer / base-ladder (5 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 5 / 4 | 0 / 0 / 0 | 0 | 0 / 0 | 17149 / 21471 / 21471 | 0.587 / 0.701 / 0.701 | - | 0 / 0, 0, 0.598 / 0.672 |
| forcingChainLong | 5 / 1 | 0 / 0 / 0 | 0 | 0 / 0 | 9028 / 25972 / 25972 | 0.413 / 0.753 / 0.753 | - | 0 / 0, 0, 0.415 / 0.759 |

Full-build work (the lifted builder, S-AV36): median 4942, maximum 6117, over 50000: 0 of 5; most additional nodes 126 (quota 4096).

## killer / activation-ladder (11 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 11 / 6 | 0 / 0 / 0 | 0 | 0 / 0 | 18381 / 21886 / 21886 | 0.566 / 0.707 / 0.707 | - | 0 / 0, 0, 0.549 / 0.692 |
| forcingChainLong | 11 / 4 | 0 / 0 / 0 | 0 | 0 / 0 | 25972 / 42925 / 42925 | 0.706 / 0.987 / 0.987 | - | 0 / 0, 0, 0.707 / 1.004 |

Full-build work (the lifted builder, S-AV36): median 4718, maximum 6117, over 50000: 0 of 11; most additional nodes 126 (quota 4096).

## killer / wire (1 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 1 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | 7622 / 7622 / 7622 | 0.190 / 0.190 / 0.190 | - | 0 / 0, 0, 0.174 / 0.174 |
| forcingChainLong | 1 / 1 | 0 / 0 / 0 | 0 | 0 / 0 | 8163 / 8163 / 8163 | 0.188 / 0.188 / 0.188 | - | 0 / 0, 0, 0.184 / 0.184 |

Full-build work (the lifted builder, S-AV36): median 660, maximum 660, over 50000: 0 of 1; most additional nodes 29 (quota 4096).

## mega12 / base-ladder (32 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 32 / 23 | 0 / 0 / 0 | 0 | 0 / 0 | 22931 / 37857 / 37903 | 0.754 / 1.322 / 1.929 | - | 0 / 0, 0, 0.754 / 1.267 |
| forcingChainLong | 32 / 9 | 0 / 0 / 0 | 0 | 0 / 0 | 18271 / 40645 / 41664 | 0.586 / 1.322 / 1.323 | - | 0 / 0, 0, 0.556 / 1.369 |

Full-build work (the lifted builder, S-AV36): median 6971, maximum 13644, over 50000: 0 of 32; most additional nodes 201 (quota 4096).

## mega12 / activation-ladder (61 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 61 / 27 | 0 / 0 / 0 | 0 | 0 / 0 | 29195 / 35706 / 37335 | 0.921 / 1.184 / 1.209 | - | 0 / 0, 0, 0.937 / 1.194 |
| forcingChainLong | 59 / 32 | 0 / 0 / 2 | 0 | 0 / 0 | 30117 / 46295 / 50000 | 0.959 / 1.294 / 1.312 | - | 0 / 0, 0, 0.974 / 1.337 |

Full-build work (the lifted builder, S-AV36): median 7990, maximum 13644, over 50000: 0 of 61; most additional nodes 201 (quota 4096).

## mega16 / base-ladder (321 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 135 / 63 | 20 / 0 / 166 | 0 | 186 / 6 | 67397 / 72564 / 74099 | 2.229 / 3.095 / 7.259 | 0.710 | 0 / 0, 0, 1.712 / 6.154 |
| forcingChainLong | 117 / 24 | 20 / 0 / 184 | 0 | 0 / 0 | 50000 / 50000 / 50000 | 1.466 / 2.218 / 3.560 | - | 0 / 0, 0, 1.735 / 3.906 |

Full-build work (the lifted builder, S-AV36): median 23349, maximum 57089, over 50000: 20 of 321; most additional nodes 515 (quota 4096).

## mega16 / activation-ladder (299 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 101 / 22 | 20 / 0 / 178 | 0 | 198 / 8 | 67717 / 72576 / 74099 | 2.248 / 2.948 / 3.034 | 0.672 | 0 / 0, 0, 1.722 / 3.157 |
| forcingChainLong | 96 / 38 | 20 / 0 / 183 | 0 | 0 / 0 | 50000 / 50000 / 50000 | 1.480 / 2.127 / 2.337 | - | 0 / 0, 0, 1.748 / 3.472 |

Full-build work (the lifted builder, S-AV36): median 23604, maximum 57089, over 50000: 20 of 299; most additional nodes 515 (quota 4096).

## samurai / base-ladder (48 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 3 / 3 | 38 / 0 / 7 | 0 | 45 / 17 | 81601 / 90481 / 91811 | 2.281 / 2.627 / 4.131 | 1.090 | 0 / 3, 3, 3.629 / 9.023 |
| forcingChainLong | 5 / 0 | 38 / 0 / 5 | 0 | 0 / 0 | 50000 / 50000 / 50000 | 1.120 / 1.435 / 1.783 | - | 0 / 3, 0, 2.880 / 6.271 |

Full-build work (the lifted builder, S-AV36): median 85352, maximum 138529, over 50000: 38 of 48; most additional nodes 621 (quota 4096).

## samurai / activation-ladder (55 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 9 / 6 | 31 / 0 / 15 | 0 | 46 / 18 | 78295 / 88839 / 89843 | 2.095 / 2.437 / 3.545 | 0.934 | 0 / 2, 2, 2.936 / 6.410 |
| forcingChainLong | 9 / 0 | 31 / 0 / 15 | 0 | 0 / 0 | 50000 / 50000 / 50000 | 1.149 / 1.374 / 1.388 | - | 0 / 1, 0, 2.195 / 5.205 |

Full-build work (the lifted builder, S-AV36): median 71608, maximum 138529, over 50000: 31 of 55; most additional nodes 621 (quota 4096).

## samurai / wire (3 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 3 / 3 | 0 / 0 / 0 | 0 | 0 / 0 | 9848 / 21195 / 21195 | 0.321 / 0.788 / 0.788 | - | 0 / 0, 0, 0.312 / 0.713 |
| forcingChainLong | 3 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | 7822 / 9413 / 9413 | 0.261 / 0.411 / 0.411 | - | 0 / 0, 0, 0.251 / 0.460 |

Full-build work (the lifted builder, S-AV36): median 1708, maximum 6764, over 50000: 0 of 3; most additional nodes 111 (quota 4096).

## sohei / base-ladder (51 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 3 / 1 | 43 / 0 / 5 | 0 | 48 / 5 | 78559 / 83022 / 83507 | 2.003 / 2.575 / 2.691 | 0.807 | 0 / 0, 0, 3.706 / 4.116 |
| forcingChainLong | 2 / 0 | 43 / 0 / 6 | 0 | 0 / 0 | 50000 / 50000 / 50000 | 1.174 / 1.587 / 1.629 | - | 0 / 0, 0, 3.530 / 3.941 |

Full-build work (the lifted builder, S-AV36): median 109951, maximum 124066, over 50000: 43 of 51; most additional nodes 602 (quota 4096).

## sohei / activation-ladder (40 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 3 / 1 | 36 / 0 / 1 | 0 | 37 / 4 | 78489 / 82011 / 82458 | 2.009 / 2.155 / 2.206 | 0.799 | 0 / 0, 0, 3.849 / 4.106 |
| forcingChainLong | 2 / 0 | 36 / 0 / 2 | 0 | 0 / 0 | 50000 / 50000 / 50000 | 1.177 / 1.226 / 1.277 | - | 0 / 0, 0, 3.657 / 3.812 |

Full-build work (the lifted builder, S-AV36): median 113607, maximum 124066, over 50000: 36 of 40; most additional nodes 602 (quota 4096).

## wordoku / base-ladder (0 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |
| forcingChainLong | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |

Full-build work (the lifted builder, S-AV36): median -, maximum -, over 50000: 0 of 0; most additional nodes -Infinity (quota 4096).

## wordoku / activation-ladder (0 calls)

| id | ok / found | cw / cn / sw | pb | fb / found | work median / p95 / max | ms median / p95 / max | fallback kernel ms median | candidate: caps cw+cn / sw, fb, ms median / max |
|---|---|---|---|---|---|---|---|---|
| forcingChain | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |
| forcingChainLong | 0 / 0 | 0 / 0 / 0 | 0 | 0 / 0 | - / - / - | - / - / - | - | 0 / 0, 0, - / - |

Full-build work (the lifted builder, S-AV36): median -, maximum -, over 50000: 0 of 0; most additional nodes -Infinity (quota 4096).

## Totals by id and population (all models)

| id / population | calls | ok / found | cw / cn / sw | fb / found | total work | total ms | candidate caps (construction / search) | candidate total ms |
|---|---|---|---|---|---|---|---|---|
| forcingChain activation-ladder | 710 | 400 / 174 | 99 / 0 / 211 | 310 / 39 | 33653967 | 1115.4 | 0 / 2 | 1139.8 |
| forcingChain base-ladder | 703 | 402 / 290 | 118 / 0 / 183 | 301 / 30 | 32731504 | 1134.7 | 0 / 3 | 1203.3 |
| forcingChain fixtures | 8 | 8 / 7 | 0 / 0 / 0 | 0 / 0 | 73065 | 2.6 | 0 / 0 | 2.5 |
| forcingChain wire | 4 | 4 / 3 | 0 / 0 / 0 | 0 / 0 | 47137 | 1.6 | 0 / 0 | 1.5 |
| forcingChainLong activation-ladder | 710 | 397 / 115 | 99 / 0 / 214 | 0 / 0 | 27622979 | 874.9 | 0 / 1 | 1164.9 |
| forcingChainLong base-ladder | 703 | 384 / 42 | 118 / 0 / 201 | 0 / 0 | 25431786 | 855.5 | 0 / 3 | 1197.3 |
| forcingChainLong fixtures | 8 | 8 / 1 | 0 / 0 / 0 | 0 / 0 | 58423 | 2.2 | 0 / 0 | 2.0 |
| forcingChainLong wire | 4 | 4 / 1 | 0 / 0 / 0 | 0 / 0 | 28137 | 1.0 | 0 / 0 | 1.1 |
