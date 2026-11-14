| Sudoku speed summary: seconds/request, median/p95 | Basis and reading rule |
|---|---|
| Current = Derived from Measured records; after = Projection, likely | `1-analysis.md` section 4 gives every formula and low/high parameter. Same default work, not guaranteed exact success; four useful lanes, warm coordination, Node-equivalent work |
| Budgets | 30 s is for large boards; 81-cell boards actually require 10 s. App guard 120 s; browser/qualification-pool evidence remains required |

| Board, Nightmare | Current D | S1+S2 P | S1-S4 P | S1-S6 P, pool | Final median low/likely/high benefit P | Likely gain; availability |
|---|---:|---:|---:|---:|---:|---|
| classic9 | 4.91/5.72 | 2.36/2.75 | 1.50/1.74 | 0.58/0.97 | 3.36 / 0.58 / 0.26 | 8.4x; current GD 21/100, new hit rate unknown |
| killer | 17.82/29.98 | 17.82/29.98 | 12.73/21.41 | 5.14/10.81 | 17.87 / 5.14 / 2.83 | 3.5x; still misses 10 s, current I5 1/8 |
| jigsaw9 | 0.95/2.33 | 0.46/1.12 | 0.29/0.71 | 0.24/0.65 | 0.69 / 0.24 / 0.12 | 3.9x; preserve >=90% I5 |
| greaterThan | 9.30/19.19 | 9.30/19.19 | 6.20/12.79 | 2.53/6.50 | 9.35 / 2.53 / 1.21 | 3.7x; pool fits10, serial does not |
| mega12 | 23.72/25.24 | 7.93/8.44 | 4.44/4.73 | 1.64/2.46 | 13.90 / 1.64 / 0.62 | 14.5x; current deep 0/7, new hits unknown |
| mega16 | 104.11/116.95 | 21.76/24.44 | 11.51/12.93 | 4.16/6.57 | 41.41 / 4.16 / 1.46 | 25x; likely fits30, low case does not; deep 0/7 |
| samurai | 26.74/26.74 | 11.38/11.38 | 6.38/6.38 | 2.33/3.29 | 17.19 / 2.33 / 0.96 | 11.5x; current CV3 0/2 |
| sohei | 27.49/27.49 | 11.70/11.70 | 6.55/6.55 | 2.39/3.38 | 17.67 / 2.39 / 0.99 | 11.5x; current CV3 0/2 |
| flower | 23.07/23.07 | 9.82/9.82 | 5.50/5.50 | 2.01/2.85 | 14.84 / 2.01 / 0.84 | 11.5x; current CV3 0/2 |
| butterfly | 32.82/32.82 | 13.97/13.97 | 7.83/7.83 | 2.85/4.01 | 21.09 / 2.85 / 1.17 | 11.5x; time becomes plausible, current CV3 0/2 |

| Hard-Master, ranges of cell medians / p95s, not pooled quantiles | Current D | S1+S2 P | S1-S4 P | S1-S6 P |
|---|---:|---:|---:|---:|
| classic9, jigsaw9, mega12/16 and four multigrids | 0.019-3.05 / 0.068-3.05 | unchanged | 0.015-2.44 / 0.054-2.44 | same as S1-S4; Jigsaw Expert maximum325.313 s still unresolved |
| killer | 4.75-12.45 / 6.47-23.36 | unchanged | 3.39-8.90 / 4.62-16.69 | 1.41-3.61 / 2.41-8.44; hits still blocked |
| greaterThan | 0.182-4.07 / 4.83-14.20 | unchanged | 0.121-2.71 / 3.22-9.47 | 0.099-1.14 / 1.71-4.83 |

| Hell 1 before/after | Current D | S1+S2 / S1-S4 / S1-S6 P |
|---|---|---|
| All ten boards | Current tier is vacuous; not a final-Hell baseline | No defensible final-tier median or hit rate yet. The analysis gives every board an explicit sensitivity: 1/2/4 times Nightmare work, then the same factors |
| mega16, illustrative likely H sensitivity only | 0.616/0.616, vacuous | 43.52/48.89 -> 23.02/25.87 -> 8.27/13.03; not a speed-up over the vacuous result |
