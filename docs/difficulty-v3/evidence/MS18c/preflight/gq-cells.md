# MS18c Stage 1 preflight: the 135 GQ cells

Method `MS18c-GQ-structural-v1`, policy `MS18c-GQ-host-active`, binding **awaiting Stage 2**. none: this planner emits no approval; Stage 2 is a joint SA1/SA2 decision, Stage 3 also needs the recorded Q3 answer and the explicit release.

Produced by `generator/tests/artifacts/difficulty-v3/MS18c/plan-gq.cjs` (file-only, no solver). The machine-readable twin is `gq-cells.json`; this file carries the same numbers. Seconds throughout.

## Identities of every row

| Identity | Value |
|---|---|
| source (`engine.sources`) | `0ca29eaeebc295b6` |
| tool (`qualifierHash`) | `c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77` |
| attempt policy (digest) | `b9a2c2e0ada24933e6b54bc5588839d84d6cbd5c4b2aab05f89090c0c0daf8c8` |
| Node | `v26.13.0` |
| machine (digest) | `67d100ebc61bd4ebef3f46ea13a25198e24dd1df47bd3fb7b23a10e83d1b569c` |

## Classes

| Board budget b | Cells | F=b+11 | P | A | T | O=T+2700 |
|---:|---:|---:|---:|---:|---:|---:|
| 2 s | 18 | 13 | 1751 | 1770 | 2220 | 4920 |
| 10 s | 63 | 21 | 2271 | 2280 | 2850 | 5550 |
| 30 s | 54 | 41 | 3571 | 3600 | 4500 | 7200 |

Sums of the structural envelopes over 135 cells (conditional planning envelopes, never runtime forecasts; no waits, gaps or admission re-asks): P 367425 s, A 369900 s (102.8 h), T 462510 s (128.5 h), O 827010 s (229.7 h).

## Rows

| # | Key | Board cells | Attempts | b | Jobs | P | A | T | O | Binding |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | classic4/veryEasy | 16 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 2 | classic4/easy | 16 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 3 | classic4/normal | 16 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 4 | classic4/hard | 16 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 5 | classic4/expert | 16 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 6 | classic4/master | 16 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 7 | classic4/nightmare | 16 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 8 | classic4/hell1 | 16 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 9 | classic4/hell2 | 16 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 10 | classic6/veryEasy | 36 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 11 | classic6/easy | 36 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 12 | classic6/normal | 36 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 13 | classic6/hard | 36 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 14 | classic6/expert | 36 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 15 | classic6/master | 36 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 16 | classic6/nightmare | 36 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 17 | classic6/hell1 | 36 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 18 | classic6/hell2 | 36 | 8 | 2 | 4 | 1751 | 1770 | 2220 | 4920 | awaiting Stage 2 |
| 19 | classic9/veryEasy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 20 | classic9/easy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 21 | classic9/normal | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 22 | classic9/hard | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 23 | classic9/expert | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 24 | classic9/master | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 25 | classic9/nightmare | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 26 | classic9/hell1 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 27 | classic9/hell2 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 28 | mega12/veryEasy | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 29 | mega12/easy | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 30 | mega12/normal | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 31 | mega12/hard | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 32 | mega12/expert | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 33 | mega12/master | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 34 | mega12/nightmare | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 35 | mega12/hell1 | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 36 | mega12/hell2 | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 37 | mega16/veryEasy | 256 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 38 | mega16/easy | 256 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 39 | mega16/normal | 256 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 40 | mega16/hard | 256 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 41 | mega16/expert | 256 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 42 | mega16/master | 256 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 43 | mega16/nightmare | 256 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 44 | mega16/hell1 | 256 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 45 | mega16/hell2 | 256 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 46 | diagonalX/veryEasy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 47 | diagonalX/easy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 48 | diagonalX/normal | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 49 | diagonalX/hard | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 50 | diagonalX/expert | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 51 | diagonalX/master | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 52 | diagonalX/nightmare | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 53 | diagonalX/hell1 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 54 | diagonalX/hell2 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 55 | hyper/veryEasy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 56 | hyper/easy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 57 | hyper/normal | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 58 | hyper/hard | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 59 | hyper/expert | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 60 | hyper/master | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 61 | hyper/nightmare | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 62 | hyper/hell1 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 63 | hyper/hell2 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 64 | jigsaw9/veryEasy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 65 | jigsaw9/easy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 66 | jigsaw9/normal | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 67 | jigsaw9/hard | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 68 | jigsaw9/expert | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 69 | jigsaw9/master | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 70 | jigsaw9/nightmare | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 71 | jigsaw9/hell1 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 72 | jigsaw9/hell2 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 73 | killer/veryEasy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 74 | killer/easy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 75 | killer/normal | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 76 | killer/hard | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 77 | killer/expert | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 78 | killer/master | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 79 | killer/nightmare | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 80 | killer/hell1 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 81 | killer/hell2 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 82 | greaterThan/veryEasy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 83 | greaterThan/easy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 84 | greaterThan/normal | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 85 | greaterThan/hard | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 86 | greaterThan/expert | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 87 | greaterThan/master | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 88 | greaterThan/nightmare | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 89 | greaterThan/hell1 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 90 | greaterThan/hell2 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 91 | samurai/veryEasy | 369 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 92 | samurai/easy | 369 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 93 | samurai/normal | 369 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 94 | samurai/hard | 369 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 95 | samurai/expert | 369 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 96 | samurai/master | 369 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 97 | samurai/nightmare | 369 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 98 | samurai/hell1 | 369 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 99 | samurai/hell2 | 369 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 100 | sohei/veryEasy | 288 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 101 | sohei/easy | 288 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 102 | sohei/normal | 288 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 103 | sohei/hard | 288 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 104 | sohei/expert | 288 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 105 | sohei/master | 288 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 106 | sohei/nightmare | 288 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 107 | sohei/hell1 | 288 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 108 | sohei/hell2 | 288 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 109 | butterfly/veryEasy | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 110 | butterfly/easy | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 111 | butterfly/normal | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 112 | butterfly/hard | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 113 | butterfly/expert | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 114 | butterfly/master | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 115 | butterfly/nightmare | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 116 | butterfly/hell1 | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 117 | butterfly/hell2 | 144 | 4 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 118 | flower/veryEasy | 189 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 119 | flower/easy | 189 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 120 | flower/normal | 189 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 121 | flower/hard | 189 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 122 | flower/expert | 189 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 123 | flower/master | 189 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 124 | flower/nightmare | 189 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 125 | flower/hell1 | 189 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 126 | flower/hell2 | 189 | 2 | 30 | 4 | 3571 | 3600 | 4500 | 7200 | awaiting Stage 2 |
| 127 | wordoku/veryEasy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 128 | wordoku/easy | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 129 | wordoku/normal | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 130 | wordoku/hard | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 131 | wordoku/expert | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 132 | wordoku/master | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 133 | wordoku/nightmare | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 134 | wordoku/hell1 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
| 135 | wordoku/hell2 | 81 | 8 | 10 | 4 | 2271 | 2280 | 2850 | 5550 | awaiting Stage 2 |
