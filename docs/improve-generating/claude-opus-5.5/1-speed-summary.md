# Improve generating (Sudoku): speed before and after, summary (SA1, claude-opus-5.5)

Estimates only, from committed evidence at `f7be90f`; no run was made. Details, formulas and sources:
[1-analysis.md](1-analysis.md) §2 and §5. Current = Measured (Node, EPYC 7763). Projections = likely [best - worst].
Times are seconds for a failing request (the ceiling a no-hit request pays), median / p95.

## 1. Board x level

| Board (cells, attempts) | Level | Current (source) | Exact now | After S1+S2 | After S1-S4 | After S1-S6 (4 workers) | Qualification: time; hits | App 120 s |
|---|---|---|---|---|---|---|---|---|
| classic9 (81, 8) | Hard - Master | 0.03 - 0.12 / 0.07 - 0.16 (CV3, R5) | at least 90 % (GD) | puzzles change | x 2 - 2.5 | x 2.5 - 4 on p95 | fits; fits (unmeasured under S1) | fits |
| classic9 | Nightmare | 4.9 / 5.7 (R5 n = 12) | 21 / 100 | 5.6 / 6.5 [4.0 - 7.7] | 3.9 / 4.6 [2.1 - 6.7] | 1.2 / 1.4 [0.57 - 2.8] | fits; needs gain 1.2 (or OD-S4 alone: about 88 %) | fits |
| wordoku (81, 8) | Nightmare | 5.0 / 5.5 (I5 n = 20) | 4 / 20 | 5.6 / 6.2 | 4.0 / 4.4 | 1.2 / 1.4 | fits; needs gain 1.3 | fits |
| killer (81, 8) | Hard | 4.8 / 6.5 (I5 n = 20) | 0 / 20 | not modelled | 3.0 / 4.1 | 0.93 / 1.3 | fits; fails (calibration) | fits |
| killer | Expert | 10.8 / 14.7 (I5 n = 8) | 1 / 8 | not modelled | 6.9 / 9.3 | 2.1 / 2.9 | fits after S5; fails | fits |
| killer | Master | 12.5 / 23.4 (I5 n = 8) | 2 / 8 | not modelled | 9.9 / 19 | 3.1 / 5.8 | fits after S5; fails | fits |
| killer | Nightmare | 17.8 / 30.0 (I5 n = 8) | 1 / 8 | not modelled | 14 / 24 | 4.4 / 7.5 | fits after S5; fails | fits |
| jigsaw9 (81, 8) | Expert | 0.92 / 2.44, max 325 (I5 n = 20) | at least 90 % | puzzles change | x 1.5 - 2 | p95 0.6 - 0.8; S7 bounds the tail | fits | tail fails today |
| jigsaw9 | Nightmare | 0.95 / 2.33 (I5 n = 20) | at least 90 % | puzzles change | x 1.4 | p95 0.5 - 0.8 | fits | fits |
| greaterThan (81, 8) | Expert | 2.4 / 14.2 (I5 n = 10) | at least 90 % | n/a | 1.5 / 9.0 | 0.48 / 2.8 | p95 fails today, fits after S5 | fits |
| greaterThan | Nightmare | 9.3 / 19.2 (I5 n = 10) | at least 90 % | n/a | 7.4 / 15 | 2.3 / 4.8 [1.6 - 7.2] | p95 fails today, fits after S5 | fits |
| mega12 (144, 4) | Nightmare | 23.7 / 25.2 (deep n = 7) | 0 / 7 | 24 / 25 [16 - 34] | 16 / 17 [7.4 - 29] | 5.1 / 5.4 [2.1 - 12] | fits; needs gain 5.0 | fits |
| mega16 (256, 2) | Nightmare | 104 / 117 (deep n = 7) | 0 / 7 | 48 / 54 [34 - 99] | 33 / 37 [16 - 86] | 12 / 14 [6.2 - 37] | fits likely; needs gain 6.6 | fails today; fits after |
| samurai (369, 2) | Nightmare | 26.7 (CV3 max of 2) | 0 / 2 | 22 | 16 | 6.5 [3.5 - 14] | fits; needs gain 8.4 | marginal on phones today |
| sohei (288, 2) | Nightmare | 27.5 (CV3) | 0 / 2 | 23 | 16 | 6.6 | fits; needs gain 8.4 | as samurai |
| flower (189, 2) | Nightmare | 23.1 (CV3) | 0 / 2 | 19 | 13 | 5.6 | fits; needs gain 7.6 | as samurai |
| butterfly (144, 4) | Nightmare | 32.8 (CV3) | 0 / 2 | 27 | 19 | 6.0 | fits; needs gain 3.8 | as samurai |
| mega12, mega16, multigrids | Hard - Master | 0.07 - 3.05 (CV3) | at least 1 / n | puzzles change | x 2 | x 2 - 3 | fits; hit rates unknown (n = 2 - 3) | fits |
| every board | Hell 1 | vacuous today (0.04 - 5.2) | vacuous | post-MS07b no data; Projection: Nightmare row x 1 - 3 | | | unknown | |

"Needs gain" = factor by which S1 must raise the per-sample exact probability for 90 % hits inside the budget, with
attempts raised to what the budget allows (OD-S4). Likely S1 gain assumed: 4 (range 1 - 20; SM2 decides).

## 2. Plan phases, cumulative (failing request, likely)

| Cell | Now | Phase 1: S3, S4 | Phase 2: + S5a | Phase 3: + S1, S2, S5b |
|---|---|---|---|---|
| classic9 Nightmare | 4.9 / 5.7 | 3.5 / 4.1 | 1.1 / 1.3 | 1.2 / 1.4 |
| mega12 Nightmare | 24 / 25 | 16 / 17 | 5.1 / 5.4 | 5.1 / 5.4 |
| mega16 Nightmare | 104 / 117 | 70 / 79 | 41 / 46 | 12 / 14 |
| samurai Nightmare | 27 | 19 | 11 | 6.5 |
| Killer Expert | 10.8 / 14.7 | 6.9 / 9.3 | 2.1 / 2.9 | 2.1 / 2.9 |
| Greater-Than Nightmare | 9.3 / 19.2 | 7.4 / 15 | 2.3 / 4.8 | 2.3 / 4.8 |

## 3. Availability (exact hits per request)

| Cell | Now | Likely after S1-S6, default attempts (gain 4) | With attempts raised inside the budget | Offerable? |
|---|---|---|---|---|
| classic9, wordoku Nightmare | 20 - 21 % | 59 - 61 % | 100 % (65 attempts in 10 s); phases 1-2 + OD-S4 alone about 88 % | yes, with OD-S4 |
| butterfly Nightmare | 0 / 2 (p assumed 3 % per attempt) | 39 % | 91 % (20 attempts) | yes, with OD-S4 (likely) |
| mega12 Nightmare | 0 / 7 | 28 % | 84 % (23 attempts) | borderline (needs gain 5) |
| mega16 Nightmare | 0 / 7 | 50 % | 75 % (4 attempts) | no at gain 4; yes at gain 7 or more |
| samurai, sohei, flower Nightmare | 0 / 2 each | 22 % | 67 - 70 % | no at gain 4; yes at 8 or more |
| Killer Hard to Nightmare | 0 - 25 % | unchanged (S1 not applied) | 8 - 47 % | no: calibration (MS07e) |
| Greater-Than Expert, Nightmare | at least 90 %, p95 over 10 s | unchanged hits | | yes (time only) |

Main assumptions: S3 1.5x on Nightmare-level solves (1.2 - 2.5), 2.5x below (1.5 - 4); S4 1.1x; pool 3.2 on 4 workers
(2.4 - 3.6); S1 per-sample time 0.8x on 81 cells, 1.0x on 144, 2.5x on mega16, 1.3x on multigrids. The baseline moves
before the feature starts (MS07 widens the Nightmare window, MS08-MS16 add finders): factors transfer, seconds do not.
