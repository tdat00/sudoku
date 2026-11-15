# Sudoku: main, difficulty-v3 and plan-v4 speed

2026-11-15. Astra; existing records and projections only. No generation, test or timing run.

## Summary by cell

Times are seconds, **median / p95** unless labelled otherwise. **M2** is the published qualification retained
in `main` (`6a0e4bd`), not a new timing of that commit. **Q** is the difficulty-v3 checkpoint.
**P** is the credited plan-v4 scenario: selective S5a; phase 2 adds no priced multiplier.

`O` = offered on main; `Q+` / `Q-` = checkpoint pass / fail, **not a live offer change**;
`U` = unqualified pilot; `W` = Killer Hard/Expert withheld by S-OD7.
Hit counts in M2 are v2 score-band hits; Q counts are requiredness-qualified exact hits.
`=Q` in P means the same **recorded, completed requests' exact flags** under equal-result pooling,
not a prediction of the final catalogue's hit rate or qualification.

**Factors are before / after:** above 1 is faster. They use p95 unless marked `m` (median), `mean`,
`miss` or `pilot`. All v4 factors are **Projection**. The final column is a **historical-reference comparison
across different machines and rating contracts**, not a controlled algorithm speed-up.
`B` is only an upper envelope using main's observed maximum; it is not a percentile or a population bound.

### Headline cells and controls

| Cell | main: M2 | difficulty-v3: Q | v3 + v4: P | Factor vs Q | Factor vs main reference |
|---|---|---|---|---|---|
| classic9 Normal | 0.038 / 0.172; 40/40 O | 0.340 / 0.704; 36/40 Q+ | approximately Q; =Q | about 1 | 0.24 |
| classic9 Hard | 0.010 / 0.048; 40/40 O | 0.021 / 0.180; 40/40 Q+ | approximately Q; =Q | about 1 | 0.27 |
| classic9 Expert | 0.008 / 0.170; 40/40 O | 0.022 / 0.246; 40/40 Q+ | approximately Q; =Q | about 1 | 0.69 |
| classic9 Master | 0.040 / 0.121; 40/40 O | 0.071 / 0.253; 40/40 Q+ | approximately Q; =Q | about 1 | 0.48 |
| classic9 Nightmare | 0.049 / 0.226; 40/40 O | 0.140 / 0.260; 40/40 Q+ | approximately Q; =Q | about 1 | 0.87 |
| wordoku Nightmare | 0.051 / 0.263; 40/40 O | 0.106 / 0.444; 40/40 Q+ | approximately Q; =Q | about 1 | 0.59 |
| mega12 Nightmare | 0.031 / 0.268; 40/40 O | 0.186 / 1.049; 40/40 Q+ | approximately Q; =Q | about 1 | 0.26 |
| mega16 Expert | 0.139 / 0.349; 40/40 O | 0.327 / 9.691; 36/40 Q+ | approximately Q; =Q | about 1 | 0.036 |
| mega16 Nightmare | 0.290 / 0.944; 40/40 O | pilot mean 11.8, range 4.8-26.5; 4/4 U | mean about 6-12 if work spans both attempts; U | about 1-2, mean | unpriced mean; B <=0.26 |
| diagonalX Nightmare | 0.021 / 0.051; 40/40 O | 0.345 / 1.218; 40/40 Q+ | approximately Q; =Q | about 1 | 0.042 |
| hyper Nightmare | 0.014 / 0.102; 40/40 O | 0.222 / 0.705; 40/40 Q+ | approximately Q; =Q | about 1 | 0.14 |
| jigsaw9 Nightmare | 0.023 / 0.057; 40/40 O | 0.210 / 0.429; 40/40 Q+ | approximately Q; =Q | about 1 | 0.13 |
| Greater-Than Normal | 0.024 / 0.073; 40/40 O | 1.922 / 9.627; 40/40 Q+ | median about 1.922; tail unpriced; =Q | about 1 m | 0.012 m |
| Greater-Than Expert | 1.680 / 9.500; 38/40 O | pilot samples about 3 and 15; 1/2 U | unpriced; U | unpriced | unpriced |
| Greater-Than Master | 0.597 / 3.630; 40/40 O | 0.744 / 14.478; 40/40 Q- on time | p95 about 5.5-14.5; 40/40 unchanged in this cohort; time-only candidate | 1-2.62 | 0.25-0.66 |
| Greater-Than Nightmare | 0.257 / 0.999; 40/40 O | 1.326 / 5.181; 40/40 Q+ | median about 1.326; tail unpriced; =Q | about 1 m | 0.19 m |
| Killer Hard | 0.246 / 0.518; 40/40 O | 5.355 / 6.578; 0/14 W | p95 about 2.5-3.2; still 0/14, W | 2.07-2.65 | 0.16-0.21 |
| Killer Expert | 1.780 / 8.650; 40/40 O | 10.243 / 17.773; 1/14 W | selected slow misses 3.8-8.6, not cell quantiles; =Q, W | 2.07-2.65, miss | unpriced quantiles; B <=2.6 |
| Killer Master | 0.581 / 5.040; 40/40 O | 11.792 / 22.781; 5/13 Q- | selected slow misses 4.2-11.0, not cell quantiles; =Q | 2.07-2.65, miss | unpriced quantiles; B <=1.9 |
| Killer Nightmare | 0.673 / 8.160; 40/40 O | 4.108 / 24.903; 19/24 Q- | median near 4.1; conditional p95 9.4-24.9; =Q | 1-2.65 | 0.33-0.87 |
| Jigsaw Expert | 0.031 / 0.310; 40/40 O | 0.542 / 2.294; 38/40 Q+ | no routine gain: approximately Q; exceptional S7 tail unpriced | about 1 | 0.14 |
| samurai Nightmare | 0.108 / 0.891; 40/40 O | 1.830 / 7.558; 40/40 Q+ | median about 1.830; tail unpriced; =Q | about 1 m | 0.059 m |
| sohei Nightmare | 0.139 / 0.704; 40/40 O | 1.516 / 7.587; 40/40 Q+ | median about 1.516; tail unpriced; =Q | about 1 m | 0.092 m |
| flower Nightmare | 0.201 / 0.384; 40/40 O | 1.899 / 5.917; 40/40 Q+ | median about 1.899; tail unpriced; =Q | about 1 m | 0.11 m |
| butterfly Nightmare | 0.090 / 0.443; 40/40 O | 0.537 / 1.970; 40/40 Q+ | median about 0.537; tail unpriced; =Q | about 1 m | 0.17 m |

### Hell 1: faster recorded misses, not a forecast of exact-puzzle supply

| Cell | main: M2 | difficulty-v3: Q or its pilot | v3 + v4: P | Factor vs Q | Factor vs main reference |
|---|---|---|---|---|---|
| classic9 Hell 1 | 0.272 / 0.758; 40/40 O | 6.254 / 8.069; 0/14 Q- | p95 2.4-3.9; still 0/14 | 2.07-3.43 | 0.19-0.32 |
| wordoku Hell 1 | 0.280 / 0.715; 40/40 O | 5.546 / 8.061; 0/14 Q- | p95 2.4-3.9; still 0/14 | 2.07-3.43 | 0.18-0.30 |
| hyper Hell 1 | 0.011 / 0.170; 40/40 O | 10.524 / 13.111; 0/12 Q- | p95 3.8-6.3; still 0/12 | 2.07-3.43 | 0.027-0.044 |
| jigsaw9 Hell 1 | 0.020 / 0.145; 40/40 O | 11.083 / 15.498; 0/12 Q- | p95 4.5-7.5; still 0/12 | 2.07-3.43 | 0.019-0.032 |
| diagonalX Hell 1 | 0.015 / 0.139; 40/40 O | 23.783 / 25.909; 0/9 Q- | p95 7.6-12.5; still 0/9 | 2.07-3.43 | 0.011-0.018 |
| Killer Hell 1 | 0.588 / 1.130; 40/40 O | 26.066 / 50.222; 0/9 Q- | p95 19.0-24.3; still 0/9 | 2.07-2.65 | 0.047-0.060 |
| samurai Hell 1 | 0.598 / 2.840; 40/40 O | 28.895 / 37.925; 0/14 Q- | p95 19.3-22.8; still 0/14 | 1.66-1.96 | 0.12-0.15 |
| sohei Hell 1 | 0.263 / 1.730; 40/40 O | 23.382 / 33.126; 0/14 Q- | p95 16.9-20.0; still 0/14 | 1.66-1.96 | 0.087-0.10 |
| flower Hell 1 | 0.189 / 1.050; 40/40 O | 24.208 / 27.429; 0/14 Q- | p95 14.0-16.5; still 0/14 | 1.66-1.96 | 0.064-0.075 |
| mega12 Hell 1 | 0.046 / 1.080; 40/40 O | one 36.5 s pilot, 0/1 U | pilot scenario 10.6-17.6; still no observed exact hit, U | 2.07-3.43, pilot | unpriced quantiles; B <=0.13 |
| Greater-Than Hell 1 | 0.144 / 0.473; 40/40 O | three pilots 37.6-40.1; 0/3 U | pilot scenarios 11.0-19.4; still no observed exact hit, U | 2.07-3.43, pilot | unpriced quantiles; B <=0.06 |
| butterfly Hell 1 | 0.112 / 1.780; 40/40 O | three pilots 38.3-39.5; 0/3 U | pilot scenarios 11.2-19.1; still no observed exact hit, U | 2.07-3.43, pilot | unpriced quantiles; B <=0.21 |
| mega16 Hell 1 | 0.246 / 0.744; 40/40 O | one pilot exceeded the 120 s guard; U | unpriced; a divided timeout is not a completion forecast | unpriced | unpriced |

## Basis and interpretation

### Records, not new benchmarks

| ID / kind | Record and its limits |
|---|---|
| **M2 — Measured** | `6a0e4bd:docs/difficulty-rating/qualification.md`, last run 2026-10-19. Ryzen 7 9800X3D, Node 26.8.2, four processes. It records the post-renaming v2 pipeline qualification and main's offers: 118 offered cells. Its stated measured engine is `562eb5d` plus the level renaming, hash `0799884fbadd42bc`, not a fresh run of `6a0e4bd` |
| **Main continuity** | The later Generation Steps release is observational: `6a0e4bd:tasks/generation-steps/GS08-final-verification.md`, GS08-B03/T03 and the execution record, reports identical normal-generation/storage/export digests and 14/14 golden outputs. This supports using the published v2 record as main's historical baseline, **not asserting identical later timing** |
| **Q — Measured** | `75b99e6:docs/difficulty-v3/qualification-checkpoint-2026-11-15.json` and `.md`; per-cell `summary.p50/p95` divided by 1000. MS07e on runtime `8b70875`, hash `029720df77c6c12a`; EPYC 7763, Node 26.13.0, outer jobs four. 129/135 cells, 4,311 requests, early stops and one expansion; 89 observed passes, 40 fails, six unlaunched. No live offers were changed |
| **Q pilots — Measured** | Checkpoint Markdown section 4 and `docs/difficulty-v3/evidence/MS07e/plan.md` at `75b99e6`. They are the six unlaunched cells' pilots, not qualification percentiles. Censoring is retained, not turned into a successful duration |
| **R3 — Measured input to projections** | `docs/improve-generating/evidence/phase0/provisional-r1/report-r3.md`, retained at `6dae463`. Three old-source paired seeds per cell, MS05e-era runtime `f7be90f`. This supplies the pool-factor sensitivities, **not a main baseline** and not measured v4 performance |
| **V4 — Projection** | `6dae463:docs/improve-generating/plan.md`, sections 2-5, with `plan-v3-joint-report.md`. Only selective S5a has a priced whole-request effect. S6/S7 improve failure handling/robustness; S4/S5b/K2 remain conditional. No stacked phase-2 or kernel gain is credited |

**There is no matched main-versus-v4 timing record on the same machine and protocol.**
The table therefore does not manufacture an EPYC retiming of main. M2 and Q both use level-qualified seeds
from base 20260601 and four independent processes, but the CPUs, Node versions, search policies and acceptance
contracts differ. The future pool protocol is inner width four at outer jobs one, with a matched serial
control, not Q's outer-jobs-four measurements.
Q has development-v3 semantics before the rating/cache-version bump; its source identity, not the numerical
`ratingVersion` field alone, identifies the measured algorithm.

If main would take `H` times its historical M2 time on the comparison machine, a same-statistic
main/v4 factor would be `H * (M2 time / projected v4 time)`. **H is unmeasured and workload-dependent**;
no conversion factor is assumed to be a hardware measurement. The last column is the `H=1` reference
calculation only. A number below one is not evidence that plan v4 itself causes that regression.

### Same names and bands, different puzzles and acceptance

The numeric bands are unchanged between main and the checked v3 source: Normal `[180,400)`, Hard
`[400,700)`, Expert `[700,1000)`, Master `[1000,1500)`, Nightmare `[1500,2400)`, Hell 1 `[2400,3600)`.
This compares the same board and requested score band, but **not equal human difficulty or equal work**.
Main accepts a solved, unique puzzle in the band; v3 additionally requires its tier. It changes targets,
chain kernels and weights, and uses 8/4/2 size-default attempts instead of main's uniform default eight.
Main's qualification does not record a comparable v3-requiredness rate.

The saved **MS02 old-algorithm bridge** illustrates the difference on EPYC without pretending to retime main:

| Cell | MS02 v2 generation median / sample p95, s (Derived) | Score-band hits / old-floor-qualified, n=12 (Measured) |
|---|---:|---|
| classic9 Nightmare | 0.111 / 0.467 | 12 / 0 |
| jigsaw9 Nightmare | 0.028 / 0.099 | 12 / 0 |
| Killer Hard | 0.362 / 1.420 | 12 / 0 |
| Killer Expert | 0.919 / 14.452 | 12 / 0 |
| Greater-Than Normal | 0.063 / 0.112 | 12 / 1 |
| Greater-Than Expert | 4.174 / 15.620 | 10 / 8 |

Source: `398c832:docs/difficulty-v3/baseline.md` and `evidence/MS02/<variant>-<level>.json`.
These are twelve **direct-generation** calls, seed base 20260101, sequential, runtime `50eeec5`.
`generationMs` excludes the checks/reference work; the median here averages the middle two values and p95
is nearest-rank (the maximum at n=12). The main-to-MS01 engine diff adds floor/tier diagnostics in
`difficulty.js`, not v3 acceptance. This is a useful near-main algorithm reference on the same CPU family
as Q, **not the same pipeline, seeds or concurrency**, and is not used to rescale M2.
Its old-floor certificate is also not a rerating under the final v3 catalogue.

### Projection arithmetic

- For a common exhausted-request factor `F`, `new p95 = Q p95 / F`. The old transfer scenarios are
  **2.07-3.43** for four/eight attempts, **1.66-1.96** for two attempts, and **2.07-2.65** for Killer.
  Example: classic9 Hell 1 `8.069/3.43` to `8.069/2.07` gives 2.4-3.9 s. These assume comparable,
  distributed attempt work; they are not bounds. Dominant attempts, head-start/startup cost, contention or
  weak devices can leave no gain or a regression.
- Passing controls get **no incremental gain credited**. Where v4 leaves the tail unpriced, the comparison
  uses its unchanged-median scenario instead. After the whole final catalogue, even those baselines need
  reconciliation; future finders and generator-version changes are not assumed harmless.
- Greater-Than Master's conditional tail is `14.478/2.62` to `14.478`, not a measured improvement.
  Killer Nightmare's p95 is an exact request of unknown attempt count: `24.903/2.65` to `24.903` is conditional
  on late independent work at the fast end. Speeding its misses alone does not establish that tail gain.
- Killer Expert/Master's **selected slow-miss** ranges are not cell medians or p95s. Their complete-request
  main cohorts contain no comparable miss population. The full-cell main/v4 factors therefore stay unpriced.
- A same-statistic historical-reference factor is `M2 statistic / P statistic`. For example, Greater-Than
  Master's p95 factor is `3.630/14.478` to `3.630/(14.478/2.62)`, or 0.25-0.66.
  Quantile-factor calculations use the recorded unrounded Q values; selected-miss and pilot ranges retain
  v4's stated rounded scenarios.
- **B envelopes (Projection, not comparable percentile factors):** main's observed maximum divided by the
  shortest projected mean, pilot or selected miss. The numerators are mega16 Nightmare 1.54, Killer Expert
  9.69, Killer Master 7.85, mega12 Hell 1 1.30, Greater-Than Hell 1 0.644 and butterfly Hell 1 2.26 s.
  Divide respectively by 6, 3.8, 4.2, 10.6, 11.0 and 11.2 s and round the envelopes upward. These only bound
  comparisons with the recorded main cohort **inside the assumed scenario**; they bound neither a population
  tail nor another device.
- Greater-Than Expert and mega16 Hell 1 have **no priced v4 duration**. Neither an unqualified two-request
  pilot nor a censored timeout licenses a new median/p95. The 120 s app guard is not a promise of completion.

### What MS08a/MS08b and the offers do, and do not, establish

At source `398c832`, MS08a added Skyscraper (weight 330): its E record changed 66/520 hashes and four reference
ratings, without a level change. MS08b added Two-String Kite (weight 340): 18/520 hashes and four reference
ratings changed, again without a reference level change. See the accepted execution records in
`tasks/difficulty-v3/MS08a-skyscraper.md` and `MS08b-two-string-kite.md` at that commit.
**Neither is a new cell qualification/timing matrix.** Do not turn quick-suite wall-time changes into a
generator speed factor. Q remains the measured timing baseline; the final F1 reconciliation may change it.

The same-result pool does not turn the **112 recorded Hell 1 misses** into exact hits. Nor does it fix
Killer Hard/Expert's withheld calibration or the other Easy/mid-level shallow shortfalls. Greater-Than
Master is a plausible time-only candidate: its observed p95 needs a factor above about **1.45**
(`14.478/10`) to cross its 10 s budget, while retaining a qualifying exact rate. The four mega16 Nightmare
pilots do not establish its p95 or 90% hit rate. Killer Master/Nightmare need both timing and a newly completed
qualifying hit-rate cohort; their early-stopped samples are not a proof of future impossibility.
S7 targets the separately recorded exceptional Jigsaw full-grid tail, not a measured reduction of the ordinary
2.294 s p95. Phase-2 changed-output work is requalified. **No newly offerable cell is demonstrated here.**

## Plain-language conclusion

Plan v4 is not a blanket several-fold speed-up for ordinary Sudoku: most passing Nightmare/control requests
get no additional median gain credited beyond difficulty-v3. Its plausible gains are roughly **2.1-3.4x**
on distributed four/eight-attempt failures or late work, **1.7-2.0x** on two-attempt work, and **2.1-2.65x**
on the measured Killer-style transfer; Greater-Than Master's tail might fall from 14.5 s to 5.5-14.5 s.
There is **no defensible single speed-up over main**: the published main timings are often smaller, but were
measured on different hardware and accepted weaker v2 level claims. The tables expose those reference
ratios rather than call them a controlled regression or improvement. Faster shallow Hell 1 results are
still misses; offers need the final qualification and applicable browser evidence, not this forecast.
